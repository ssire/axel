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

/*
 * Represents a node in a tree-like memory structure that mimics a DOM for XTiger Forms.
 */         
xtiger.util.SchemaPseudoNode = function (type, value) {
	this.type = type;
	this.discard = false;
	if (type == xtiger.util.SchemaPseudoNode.ELEMENT_NODE) {
		this.name = value;
		this.attributes = null;
		this.content = null;
	} else {
		this.content = value;
	}
}           
            
xtiger.util.SchemaPseudoNode.TEXT_NODE = 0;
xtiger.util.SchemaPseudoNode.ELEMENT_NODE = 1;
xtiger.util.SchemaPseudoNode.NEWLINE = '\n';

xtiger.util.SchemaPseudoNode.prototype = {     

	indent : ['', '   '], // cached space strings for indentation when dumping

	discardNodeIfEmpty : function () {       
		this.discard = true;
	},
	
	addChild : function (c) {
		if (xtiger.util.SchemaPseudoNode.TEXT_NODE == c.type) {
			// small optimization: in XTiger Forms models, text nodes are terminal and unique
			this.content = c;
		} else {
			if (! this.content) {
				this.content = [];
			}
			if (this.content instanceof Array) {
				this.content.push(c);
			} else {
				alert('Attempt to save mixed content in template !');
			}
		}
	},
	
	addAttribute : function (name, value) {	
		if (! this.attributes) {
			this.attributes = {};
		}
		this.attributes[name] = value;
	},    

	getIndentForLevel : function (level) {
		if (typeof this.indent[level] != 'string') {  
			var spacer = this.indent[level - 1];
			spacer += this.indent[1];
			this.indent[level] = spacer;
		}
		return this.indent[level];
	},    
	           
	// Returns a string representing the attributes
	// the returned string starts with a space      
	// Pre-condition: this.attributes must exist
	dumpAttributes : function () {
		var text = '';
		for (var k in this.attributes) {
			text += ' ';
			text += k;
			text += '="';
			text += xtiger.util.encodeEntities(this.attributes[k]);
			text += '"';												
		}
		return text;
	},                           

	// Indented (and recursive) dump method
	dump : function (level) {   
		if (xtiger.util.SchemaPseudoNode.TEXT_NODE == this.type) {
			return xtiger.util.encodeEntities(this.content);
		} else {    
			var text = this.getIndentForLevel(level); // copy indentation string
			if (this.content) {
				// opening tag
	      		text += this.name;
				if (this.discard) {   
					text += '?';
				}
        		if (this.attributes) {
					text += this.dumpAttributes ();
				}
				if (this.content instanceof Array) {   
					text += xtiger.util.SchemaPseudoNode.NEWLINE;	 
					for (var i = 0; i < this.content.length; i++) {
						text += this.content[i].dump(level + 1); 
					}			                           
					// text += this.getIndentForLevel(level); // FINISH
				} else {                      
				 	// only one children, this is a text per construction, do not insert NEWLINE					
					text += xtiger.util.encodeEntities(this.content.content); // short circuit recursive call					
					text += xtiger.util.SchemaPseudoNode.NEWLINE; // FINISH 
				} 
				// closing tag;  
	      		// text += this.name;
			} else { // empty tag   
	      		text += this.name;  
				if (this.discard) {   
					text += '?';
				}	  
        		if (this.attributes) {
					text += this.dumpAttributes ();
				} // else if (this.discard) {
				 // 					return ''; // optional node which is empty
				 // 				}
				text += xtiger.util.SchemaPseudoNode.NEWLINE;	// FINISH
			}                                        
			return text;
		}
	}
}

/**
 * Logs data strings into a tree-like memory structure.
 * This helper object allows to dump an XTiger template content before submitting it to a server.
 */         
xtiger.util.SchemaLogger = function () {
	this.stack = [];
	this.curTop = null; // current anchoring point                          
	this.curAttr = null; // can manage one attribute at a time
	this.root = null; // lazy creation in OpenTag     
}

xtiger.util.SchemaLogger.prototype = {
	// Declares the current node as optional if it is empty
	discardNodeIfEmpty : function () {       
		if (this.curTop) { this.curTop.discardNodeIfEmpty() }
	},   
	openAttribute : function (name) {
		this.curAttr = name;		
	},   
	closeAttribute : function (name) {
		if (this.curAttr != name) {
			alert('Attempt to close an attribute ' + name + ' while in attribute ' + this.curAttr + '!');
		}
		this.curAttr = null;		
	},	
	openTag : function (name) {	
		var n = new xtiger.util.SchemaPseudoNode (xtiger.util.SchemaPseudoNode.ELEMENT_NODE, name);
		if (! this.root) { // stores root for later reuse (e.g. dump)
			this.root = n;      
		}                            
		if (this.curTop) {
			this.curTop.addChild (n);      
		}
		this.stack.push(this.curTop);
		this.curTop = n;
	},
	closeTag : function (name) {			
		// if (this.stack.length > 0) {
		// 	window.console.log('<==' + name + ' = ' + this.stack[this.stack.length - 1].name) ;		
		// } else {
		// 	window.console.log('<==');	
		// }
		
		this.curTop = this.stack.pop(); // FIXME: sanity check this.stack ?
	},  
	emptyTag : function (name) {
		this.openTag(name);
		this.closeTag(name);
	},
	write : function (text) {                                                      
	 // FIXME: sanity check this.curTop ?
		if (this.curAttr) {
			this.curTop.addAttribute(this.curAttr, text);
		} else {       			
			var n = new xtiger.util.SchemaPseudoNode(xtiger.util.SchemaPseudoNode.TEXT_NODE, text);		 
			this.curTop.addChild (n);
	 }
	},
	// Adds an attribute to the current node at the top 
	writeAttribute : function (name, value) {
		this.curTop.addAttribute(name, value);
	}, 
	// Pretty prints XML content to a string
	dump : function (selector) {
		if (this.root) {
			return this.root.dump(0);
		} else {
			return xtiger.util.SchemaPseudoNode.prototype.indent[level] + '<document/>\n'; // FIXME: use xt:head label
		}
	},
	// DEPRECATED ?
	close : function () {	} 
}