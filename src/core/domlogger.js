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
xtiger.util.PseudoNode = function (type, value) {
  this.type = type;
  this.discard = false;
  if (type === xtiger.util.PseudoNode.ELEMENT_NODE) {
    this.name = value;
    this.attributes = null;
    this.content = null;
  } else {
    this.content = value;
  }
};
            
xtiger.util.PseudoNode.TEXT_NODE = 0;
xtiger.util.PseudoNode.ELEMENT_NODE = 1;
xtiger.util.PseudoNode.MIXED_NODE = 2;
xtiger.util.PseudoNode.NEWLINE = '\n';

xtiger.util.PseudoNode.prototype = {     

  indent : ['', '  '], // cached space strings for indentation when dumping

  discardNodeIfEmpty : function () {       
    this.discard = true;
  },     
  
  mix : function () {
    var tmp;
    if (this.type !== xtiger.util.PseudoNode.MIXED_NODE) {
      if (this.content && !(this.content instanceof Array)) {
        tmp = this.content;
        this.content = [tmp];
      }
      this.type = xtiger.util.PseudoNode.MIXED_NODE;
    }   
  },
  
  addChild : function (c) {
    if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && (xtiger.util.PseudoNode.TEXT_NODE === c.type)) {
      // small optimization: in XTiger Forms models, text nodes are terminal and unique
      this.content = c;
    } else {
      if (! this.content) {
        this.content = [];
      }
      if (this.content instanceof Array) {
        this.content.push(c);
      } else {
        // alert('Attempt to save mixed content in template !');
        xtiger.cross.log('error', 'Mixed content [' + this.content + '] in ' + this.name);
      }
    }
  },
  
  addAttribute : function (name, value) { 
    if (! this.attributes) {
      this.attributes = {};
    }
    this.attributes[name] = value;
  },    

  getIndentForLevel : function (level, isMixed) {   
    var l = isMixed ? 0 : level;
    if (typeof this.indent[l] !== 'string') {  
      var spacer = this.indent[l - 1];
      spacer += this.indent[1];
      this.indent[l] = spacer;
    }
    return this.indent[l];
  },    
             
  // Returns a string representing the attributes
  // the returned string starts with a space      
  // Pre-condition: this.attributes must exist
  dumpAttributes : function () {
    var k, text = '';
    for (k in this.attributes) {
      text += ' ';
      text += k;
      text += '="';
      text += xtiger.util.encodeEntities(this.attributes[k]);
      text += '"';                        
    }
    return text;
  },                           

  // Indented (and recursive) dump method
  dump : function (level, isMixed) {   
    if (xtiger.util.PseudoNode.TEXT_NODE == this.type) {
      return xtiger.util.encodeEntities(this.content);
    } else {    
      var text = this.getIndentForLevel(level, isMixed); // copy indentation string
      if (this.content) {
        // opening tag
        text += '<';
            text += this.name;   
            if (this.attributes) {
          text += this.dumpAttributes ();
        }
        text += '>'; 
        if (this.content instanceof Array) {   
          if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && !isMixed) {
            text += xtiger.util.PseudoNode.NEWLINE;  
          }
          for (var i = 0; i < this.content.length; i++) {
            text += this.content[i].dump(level + 1, this.type === xtiger.util.PseudoNode.MIXED_NODE); 
          }                                
          if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && !isMixed) {
            text += this.getIndentForLevel(level, isMixed);
          }
        } else {                      
          // only one children, this is a text per construction, do not insert NEWLINE          
          text += xtiger.util.encodeEntities(this.content.content); // short circuit recursive call         
        } 
        // closing tag;  
        text += '</';
        text += this.name;
        text += '>';        
      } else { // empty tag   
        text += '<';
        text += this.name;    
        if (this.attributes) {
          text += this.dumpAttributes ();
        } else if (this.discard) {
          return ''; // optional node which is empty
        }
        text += '/>';                  
      }                                        
      if (!isMixed) {
        text += xtiger.util.PseudoNode.NEWLINE;  
      }
      return text;
    }
  }
}

/**
 * Logs data strings into a tree-like memory structure.
 * This helper object allows to dump an XTiger template content before submitting it to a server.
 */         
xtiger.util.DOMLogger = function () {
  this.stack = [];
  this.curTop = null; // current anchoring point                          
  this.curAttr = null; // can manage one attribute at a time
  this.curAttrFlushed = false;
  this.root = null; // lazy creation in OpenTag     
}

xtiger.util.DOMLogger.prototype = {
  // Declares the current node as optional if it is empty
  discardNodeIfEmpty : function () {       
    if (this.curAttr) { 
      this.curAttrFlushed = true; 
    } else if (this.curTop) { 
      this.curTop.discardNodeIfEmpty();
    }
  },              
  // Sets current node as a mixed content node
  // Pre-condition: there must be at least one node (openTag called)
  allowMixedContent : function () {
    if (this.curTop) {
      this.curTop.mix();
    }
  },    
  openAttribute : function (name) {
    this.curAttr = name;
    this.curAttrFlushed = false;
  },   
  closeAttribute : function (name) {
    if (this.curAttr != name) {
      alert('Attempt to close an attribute ' + name + ' while in attribute ' + this.curAttr + '!');
    } else if (! this.curAttrFlushed) {
      this.curTop.addAttribute(this.curAttr, "");
    }
    this.curAttr = null;    
  },  
  openTag : function (name) {
    var n = new xtiger.util.PseudoNode (xtiger.util.PseudoNode.ELEMENT_NODE, name);
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
      this.curAttrFlushed = true;
    } else {            
      var n = new xtiger.util.PseudoNode(xtiger.util.PseudoNode.TEXT_NODE, text);    
      this.curTop.addChild (n);
   }
  },
  // Adds an attribute to the current node at the top 
  writeAttribute : function (name, value) {
    this.curTop.addAttribute(name, value);
  }, 
  // Pretty prints XML content to a string
  dump : function () {
    if (this.root) {
      return this.root.dump(0);
    } else {
      return xtiger.util.PseudoNode.prototype.indent[level] + '<document/>\n'; // FIXME: use xt:head label
    }
  },
  // DEPRECATED ?
  close : function () { } 
}