/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Basic XML serialization algorithm exposed as a serializeData function
 * Starts iterating on any XTiger XML DOM tree which must have been transformed first 
 * Serializes data while iterating to a DOMLogger instance
 * You can share this class as it doesn't maintain state information between serializeData calls
 */
xtiger.editor.SchemaSerializer = function (baseUrl) {
}

xtiger.editor.SchemaSerializer.prototype = {

	// Walks through the tree starting at n and renders model data as it encounters it
	// Accepts an optional rootTagName for the document, uses 'document' by default
	serializeData : function (n, logger, rootTagName) {
		logger.openTag(rootTagName || 'document');
		this.serializeDataIter (n, logger);
		logger.closeTag(rootTagName || 'document');	
	},
	
	// Manage the Choice current slice
	// origin is optional, it is the Choice editor from where a recursive call has been initiated
	serializeDataSlice : function (begin, end, logger, origin, originIndex) {
		var repeats = []; // stack to track repeats		
		var cur = begin;
		var go = true;
		while (cur && go) {
			// manage repeats
			if (cur.startRepeatedItem) {
				if ((repeats.length == 0) || ((repeats[repeats.length - 1][0]) != cur.startRepeatedItem)) {
					
					// repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA
					// if (cur.startRepeatedItem.getSize() == 0) { // nothing to serialize in repeater (min=0)   
						// jumps to end of the repeater
						// cur = cur.startRepeatedItem.getLastNodeForSlice(0);						
						// in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
						// cur = cur.nextSibling;
						// continue;							
					// } else if (cur.startRepeatedItem.hasLabel()) {
					if (cur.startRepeatedItem.hasLabel()) {
						var name = cur.startRepeatedItem.dump();
						if ((cur.startRepeatedItem.min == 0) && (cur.startRepeatedItem.max == 1)) {
							logger.openTag(name + '?'); // META
						} else {
							logger.openTag(name + '*'); // META
						}
					} else {
						if ((cur.startRepeatedItem.min == 0) && (cur.startRepeatedItem.max == 1)) {
							logger.openTag('anonymous?'); // META
						} else {
							logger.openTag('anonymous*'); // META
						}
					}
					repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA					
				} 				
			}			
			
			if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
				
				logger.openTag('choice#'); // META
				// window.console.log('>>>choice#');
				// develops each choice option...
				var c = cur.beginChoiceItem;				
				var slices = c.items;
				for (var index = 0; index < slices.length; index++) {
					logger.openTag('|' + c.types[index]); // [OPEN -A- ]
					// window.console.log('>>>' + '|' + c.types[index]);
					if (c.items[index][0] != c.items[index][1]) { // choice item is a slice
						this.serializeDataSlice(c.items[index][0], c.items[index][1], logger, c, index);
					} else { // choice item is a singleton
						this.serializeDataIter(c.items[index][0], logger, c, index);
						// closes the choice
						logger.closeTag('|' + c.types[index]); // [CLOSE -A- ]
						// window.console.log('<<<' + '|' + c.types[index]);
					}
				}
				cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
				logger.closeTag('choice#'); // META
				// window.console.log('<<<choice#');
								
				// FIXME: no more sure about the following statement ???
				// the last node of the Choice (if it was not active) may coincide with an xttCloseLabel
				// closes it as serializeDataIter will not be called on that node
				if (cur.xttCloseLabel && (c.curItem != (c.items.length - 1))) {
					logger.closeTag(cur.xttCloseLabel);
					alert('BAD');
				}	                           		
			} else {
				// In case a node would have an xttCloseLabel and a endChoiceItem (which should be prevented with verifyBoundaries)
				// the algorithm will consider the label is internal to the current choice (and not external)
				this.serializeDataIter (cur, logger);
				if (origin) {  // we are iterating on the current slice of a choice 
					if (cur == origin.items[originIndex][1]) {
						// closes tag for the current choice (we must do it before serializeDataIter in case it closes a outer use)
						logger.closeTag('|' + origin.types[originIndex]); // [CLOSE -A- ]									
						// window.console.log('<<<' + '|' + origin.types[originIndex] + '(o)');
					}					
				}
			}			
			
			if (cur.endRepeatedItem) {
				--(repeats[repeats.length - 1][1]);
				if (repeats[repeats.length - 1][1] <= 0) { 
					// if ((cur.endRepeatedItem.getSize() != 0) && (cur.endRepeatedItem.hasLabel())) {						
					// if (cur.endRepeatedItem.hasLabel()) {						
					// 	logger.closeTag(cur.endRepeatedItem.dump());
					// }
					repeats.pop();
					
					if (cur.endRepeatedItem.hasLabel()) {
						var name = cur.endRepeatedItem.dump();
						if ((cur.endRepeatedItem.min == 0) && (cur.endRepeatedItem.max == 1)) {
							logger.closeTag(name + '?'); // META
						} else {
							logger.closeTag(name + '*'); // META
						}
					} else {
						if ((cur.endRepeatedItem.min == 0) && (cur.endRepeatedItem.max == 1)) {
							logger.closeTag('anonymous?'); // META
						} else {
							logger.closeTag('anonymous*'); // META
						}
					}
				}
			}			
			if (cur == end) {
				go = false;
			}
			cur = cur.nextSibling;
		}		
	},
	
	serializeDataIter : function (n, logger, origin, originIndex) { 
		var curFlow, curLabel;		   
		if (n.xttOpenLabel) {            
			curLabel = n.xttOpenLabel;
			if (curLabel.charAt(0) == '!') { // double coding "!flow!label" to open a separate flow
				var m = curLabel.match(/^!(.*?)!(.*)$/); // FIXME: use substr...
				curFlow = m[1];
				curLabel = m[2];
				logger.openFlow(curFlow, curLabel);
			}
			if (curLabel.charAt(0) == '@') {
				// logger.openTag('ATTRIBUT');
				// logger.openAttribute(curLabel.substr(1, curLabel.length - 1));				
				// logger.write(curLabel.substr(1, curLabel.length - 1));
				logger.openTag(curLabel.substr(0, curLabel.length));
				logger.closeTag(curLabel.substr(0, curLabel.length));
				// logger.closeTag('ATTRIBUT');
			} else {
				logger.openTag(curLabel);
			}
		}
		if (n.xttPrimitiveEditor) {			
			// nop - we are just interested in the tag hierarchy

			if (n.xttPrimitiveEditor.isOptional) {
				if ((typeof(n.xttPrimitiveEditor.isOptional == "boolean") && n.xttPrimitiveEditor.isOptional) || 
					((typeof(n.xttPrimitiveEditor.isOptional) == "function") && n.xttPrimitiveEditor.isOptional()))
				{
					logger.discardNodeIfEmpty();
				}
			}
		} else {
			if (n.firstChild) {
				this.serializeDataSlice(n.firstChild, n.lastChild, logger, origin, originIndex);		
			}
		}
		if (n.xttCloseLabel) {         
			curFlow = false;
			curLabel = n.xttCloseLabel;
			if (curLabel.charAt(0) == '!') { // double coding "!flow!label" to open a separate flow
				var m = curLabel.match(/^!(.*?)!(.*)$/); // FIXME: use substr...
				curFlow = m[1];
				curLabel = m[2];
		  }
			if (curLabel.charAt(0) == '@') {
				// logger.closeAttribute(curLabel.substr(1, curLabel.length - 1));				
			} else {
				logger.closeTag(curLabel);
			}
			// now closes separate flow if necessary
			if (curFlow) {
				logger.closeFlow(curFlow);
			}
		}			                           		
	}
}

// Overrides default XML serializer (file must be included after generator.js)
// xtiger.editor.Generator.prototype.defaultSerializer = new xtiger.editor.SchemaSerializer ();

