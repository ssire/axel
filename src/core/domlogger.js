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
  this.curFlow = null; 
  this.root = null; // main data flow, lazy creation in OpenTag     
  this.flow = {}; // extra XML data flow, lazy creation in openFlow
  this.flowStack = []; // navigation between flow
}

xtiger.util.DOMLogger.prototype = {
  // Declares the current node as optional if it is empty
  discardNodeIfEmpty : function () {       
    if (this.curTop) { this.curTop.discardNodeIfEmpty() }
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
  },   
  // each flow state is stored is an array [pseudo_root, current_top]
  openFlow : function (name, label) {
    if (! this.flow[name]) {  // creates it
      this.flow[name] = [null, null]; // flow root and curTop not yet defined
    }                                 
    // memorizes the current flow for restoring it in closeFlow
    this.flowStack.push([name, this.curTop, this.curFlow]);
    this.curTop = this.flow[name][1];
    this.curFlow = name;
    return true;
  },
  closeFlow : function (name) { 
    var saved = (this.flowStack.length > 0) ? this.flowStack[this.flowStack.length - 1] : false;
    if (saved && (name == saved[0])) { // sanity check
      this.flowStack.pop();  
      this.flow[name][1] = this.curTop || this.flow[name][0]; // memorizes it for future use
        //  FIXME: in my understanding this.curTop could be removed as it should be null in that case 
        // because no tag can spread on two slices of a flow
      this.curTop = saved[1];
      this.curFlow = saved[2];      
      return true;
    } 
    return false;   
  },
  closeAttribute : function (name) {
    if (this.curAttr != name) {
      alert('Attempt to close an attribute ' + name + ' while in attribute ' + this.curAttr + '!');
    }
    this.curAttr = null;    
  },  
  openTag : function (name) {
    var n = new xtiger.util.PseudoNode (xtiger.util.PseudoNode.ELEMENT_NODE, name);
    if (! this.root) { // stores root for later reuse (e.g. dump)
      this.root = n;      
    } else if (this.curFlow && (! this.flow[this.curFlow][0])) {   
      if (this.curFlow == name) { // checks if flow name and root name are the same
        this.flow[this.curFlow][0] = n; // same: no need to create a tag for the flow
      } else { // different: creates a specific node for the flow root
        var r = new xtiger.util.PseudoNode (xtiger.util.PseudoNode.ELEMENT_NODE, this.curFlow);       
        this.flow[this.curFlow][0] = r;
        r.addChild (n);
      }
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
    } else {            
      var n = new xtiger.util.PseudoNode(xtiger.util.PseudoNode.TEXT_NODE, text);    
      this.curTop.addChild (n);
   }
  },
  // Adds an attribute to the current node at the top 
  writeAttribute : function (name, value) {
    this.curTop.addAttribute(name, value);
  }, 
  // target is the name of the flow to dump, 'document' means main document
  // level should be 0 or 1  (see xtiger.util.PseudoNode.indent[level])
  _dump : function (target, level) {
    if (target == 'document') {
      if (this.root) {
        return this.root.dump(level);
      } else {
        return xtiger.util.PseudoNode.prototype.indent[level] + '<document/>\n'; // FIXME: use xt:head label
      }
    } else {
      if (this.flow[target]) {
        return this.flow[target][0].dump(level); 
      } else {
        return xtiger.util.PseudoNode.prototype.indent[level] + '<' +  target + '/>\n';
      }     
    }
  },
  // Pretty prints XML content to a string
  // The optional selector argument tells what and how to dump:
  // undefined, '' or 'document' : dumps only the main document standalone
  // '*' : dumps as a standalone document if no flows, otherwise dumps the tide
  // ['*'] : dumps whole document and flows as a tide (even if document is no tide)
  // ['document'] : dumps main document within a tide
  // 'name' : dumps only flow named "name" standalone
  // ['document', 'name1', 'name2', ...] : dumps requested flows within a tide 
  dump : function (selector) {
    var todo;   
    var target = selector || 'document';
    if ((target instanceof Array) || (target == '*')) { // most probably a tide
      if (((target instanceof Array) && (target[0] == '*'))
        || ((target == '*') && (xtiger.util.countProperties(this.flow) > 0))) {
        todo = ['document'];
        for (var k in this.flow) {
          todo.push(k);
        }       
      } else {
        todo = (target == '*') ? 'document' : target;
      }
    } else {
      todo = target;
    }
    if (todo instanceof Array) { // tide
      var output = [];      
      output.push('<xt:tide xmlns:xt="' + xtiger.parser.nsXTiger + '">\n');
      for (var i = 0; i < todo.length; i++) {
        output.push(this._dump(todo[i], 1));
      }
      output.push('</xt:tide>\n');
      return output.join('');     
    } else {
      return this._dump(todo, 0); 
    }
  },
  // DEPRECATED ?
  close : function () { } 
}