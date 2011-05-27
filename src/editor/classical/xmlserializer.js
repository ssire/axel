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
xtiger.editor.BasicSerializer = function (baseUrl) {
}

xtiger.editor.BasicSerializer.prototype = {

	// Walks through the tree starting at n and renders model data as it encounters it
	// Accepts an optional rootTagName for the document, uses 'document' by default
	serializeData : function (n, logger, rootTagName) {
		logger.openTag(rootTagName || 'document');
		this.serializeDataIter (n, logger);
		logger.closeTag(rootTagName || 'document');	
	},
	
	// Manage the Choice current slice
	// origin is optional, it is the Choice editor from where a recursive call has been initiated
	serializeDataSlice : function (begin, end, logger, origin) {
		var repeats = []; // stack to track repeats		
		var cur = begin;
		var go = true;
		while (cur && go) {
			// manage repeats
			if (cur.startRepeatedItem) {
				if ((repeats.length == 0) || ((repeats[repeats.length - 1][0]) != cur.startRepeatedItem)) {
					// repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA
					if (cur.startRepeatedItem.getSize() == 0) { // nothing to serialize in repeater (min=0)   
						// jumps to end of the repeater
						cur = cur.startRepeatedItem.getLastNodeForSlice(0);						
						// in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
						cur = cur.nextSibling;
						continue;							
					} else if (cur.startRepeatedItem.hasLabel()) {
							logger.openTag (cur.startRepeatedItem.dump());
					}  
					repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA					
				} 				
			}			
			if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
				var c = cur.beginChoiceItem;
				logger.openTag(c.getSelectedChoiceName()); // [OPEN -A- ]
				if (c.items[c.curItem][0] != c.items[c.curItem][1]) {
					this.serializeDataSlice(c.items[c.curItem][0], c.items[c.curItem][1], logger, c);				
				} else {
					// a choice slice starts and end on the same node
					this.serializeDataIter(c.items[c.curItem][0], logger);				
					// closes the choice
					logger.closeTag(c.getSelectedChoiceName()); // [CLOSE -A- ]									
				}
				cur = c.items[c.items.length - 1][1]; // sets cur to the last choice				
				// the last node of the Choice (if it was not active) may coincide with an xttCloseLabel
				// closes it as serializeDataIter will not be called on that node
				if (cur.xttCloseLabel && (c.curItem != (c.items.length - 1))) {
					logger.closeTag(cur.xttCloseLabel);
				}	                           		
			} else {
				// FIXME: we have an ambiguity <xt:use types="a b"><xt:use label="within_a"...
				// and <xt:use label="within_a"><xt:use types ="a b"....
				/// The current implementation will privilege First interpretation
				this.serializeDataIter (cur, logger);				// FIXME:  first interpretation
				if (origin) {  // we are iterating on the current slice of a choice 
					if (cur == origin.items[origin.curItem][1]) {
						// closes tag for the current choice (we must do it before serializeDataIter in case it closes a outer use)
						logger.closeTag(origin.getSelectedChoiceName()); // [CLOSE -A- ]									
					}					
				}
				// this.serializeDataIter (cur, logger);   // FIXME: second interpretation
			}			
			if (cur.endRepeatedItem) {
				if (true || (cur.endRepeatedItem == repeats[repeats.length - 1][0])) {
					--(repeats[repeats.length - 1][1]);
					if (repeats[repeats.length - 1][1] <= 0) { 
						if ((cur.endRepeatedItem.getSize() != 0) && (cur.endRepeatedItem.hasLabel())) {						
							logger.closeTag(cur.endRepeatedItem.dump());
						}
						repeats.pop();
					}
				}
			}			
			if (cur == end) {
				go = false;
			}
			cur = cur.nextSibling;
		}		
	},
	
	serializeDataIter : function (n, logger) { 
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
				logger.openAttribute(curLabel.substr(1, curLabel.length - 1));				
			} else {
				logger.openTag(curLabel);
			}
		}
		if (n.xttPrimitiveEditor) {			
			// logger.write(n.xttPrimitiveEditor.dump());         
			n.xttPrimitiveEditor.save(logger);
		}		 
		// FIXME: do not need to call next line if xttPrimitiveEditor ?
		if (n.firstChild) {
			this.serializeDataSlice(n.firstChild, n.lastChild, logger);		
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
				logger.closeAttribute(curLabel.substr(1, curLabel.length - 1));				
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

// Registers as default XML serializer (file must be included after generator.js)
xtiger.editor.Generator.prototype.defaultSerializer = new xtiger.editor.BasicSerializer ();

