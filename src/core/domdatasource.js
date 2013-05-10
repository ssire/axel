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
 * An DOMDataSource contains some XML data that can be loaded into an editor built from an XTiger template
 * This implementation encapsulates an XML Document object containing the data, which is either
 * passed directly (initFromDocument) or which can be passed from a string (initFromString)
 */
xtiger.util.DOMDataSource = function (source) {
  var d; // XML document
  this.xml = null; // main XML data
  this.stack = [];  
  if (typeof source === "string") {
    this.initFromString(source);
  } else {
    this.initFromDocument(source);
  }
}

xtiger.util.DOMDataSource.prototype = {

  // Return true of the data source has been correctly initialized, false otherwise
  hasData : function () {
    return (null != this.xml);
  },   
  
  // Internal method to set root document from a DOM element node
  _setRootNode : function (n) {
    this.xml = n;
  },

  // Initializes data source from a DOM Document 
  // Note that document may be false or undefined to simplify error management
  // Returns true on sucess, false otherwise
  initFromDocument : function (doc) {
    var root;
    this.xml = null;                      
    if (doc && doc.documentElement) {
      root = doc.documentElement;
      this._setRootNode(root);
    }
    return (this.xml != null);
  },

  // Initializes data source with a string
  initFromString : function (str) {
    var res = true;
    this.xml = null;                      
    try {
      var parser = xtiger.cross.makeDOMParser ();
      var doc = parser.parseFromString(str, "text/xml");
      this.initFromDocument(doc);
    } catch (e) {
      alert('Exception : ' + e.message);
      res = false;
    }
    return res;
  },   

  // FIXME: currently for an attribute point it returns the name of the parent node
  // and not the name of the attribute (see getAttributeFor)
  nameFor : function (point) {       
    if (point instanceof Array) {
      return xtdom.getLocalName(point[0]);      
    } else {                          
      return null; // point must be -1
    }
  },
  
  lengthFor : function (point) {
    if (point instanceof Array) {
      return point.length - 1;
    } else {
      return 0;
    }   
  }, 
  
  makeRootVector : function (rootNode) {
    var res = [rootNode];
    if (rootNode) {
      var c = rootNode.childNodes;
      for (var i = 0; i < c.length; i++) {      
        var cur = c.item(i);
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          res.push(cur);
        }
      } 
    }
    return res; 
  },
  
  // Returns children of the root in an array
  // In our content model, the root node can not have text content
  getRootVector : function () {
    return this.makeRootVector(this.xml);
  },  
    
  // Returns true if the point contains some content (element nodes, not just text content)
  // for a node called name in FIRST position, or returns false otherwise
  hasDataFor : function (name, point) {
    var res = false;          
    if ('@' == name.charAt(0)) { // assumes point[0] DOM node
      if (point !== -1) {
        res = xtdom.hasAttribute(point[0], name.substr(1));         
      }
    } else if ((point instanceof Array) && (point.length > 1))  {  
      if (point[1] && (point[1].nodeType == xtdom.ELEMENT_NODE)) { // otherwise point has no descendants
        var nodeName = xtdom.getLocalName(point[1]);
        var found = name.search(nodeName);                                                          
        // res =  (found != -1) && ((found + nodeName.length) == name.length) || (name.charAt(found + nodeName.length) == ' ');
        res =  (found != -1) && (((found + nodeName.length) == name.length) || (name.charAt(found + nodeName.length) == ' '));
      }
    }
    return res;
  },     
           
  // Only terminal data node have a string content (no mixed content in our model)
  // Returns null if there is no data for the point
  getDataFor : function (point) {
    if ((point instanceof Array) && (point.length > 1)) {     
      // FIXME: should we check it's not empty (only spaces/line breaks) ?
      return point[1];
    } else {
      return null;
    }
  },      
    
  // Returns true if the point is empty, i.e. it contains no XML data nor string (or only the empty string)
  // FIXME: currently a node with only attributes is considered as empty and mixed content maybe be handled 
  // incorrectly
  isEmpty : function (point) {
    var res = false;           
    if ((point instanceof Array) && (point.length > 1)) { 
      // terminal string node or non terminal with children (including mixed content)
      if (point.length == 2) { // then it must be a text string (terminal data node)
        if (typeof(point[1]) == 'string') { 
          res = (point[1].search(/\S/) == -1); // empty string
        }
      }
    } else { // no data for sure (must be -1)
      res = true;
    }
    return res;
  },
  
  // Pre-condition: point must be an Array [n, e1, e2, ...] of DOM nodes
  // Returns the n-th child of node n
  getPointAtIndex : function  (name, index, point) {  
    var res;
    var n = point.splice(index, 1)[0]; // splice returns an array, hence we take result[0]
    var c = n.childNodes;
    if ((c.length == 1) && (c.item(0).nodeType == xtdom.TEXT_NODE)) {
      var content = c.item(0).data; // FIXME: maybe we should concatenate all the string content (?)
      res = [n, content];     
    } else {
      res = [n];            
      for (var i = 0; i < c.length; i++) {
        var cur = c.item(i);
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          res.push(cur);
        }
      }                         
      if (res.length == 1) { // empty node (treated as null text content)
        res.push(null);
      } 
    }
    return res;   
  },    
  
  hasVectorFor : function (name, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {
        if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && (xtdom.getLocalName(point[i]) == name)) { // since there is no mixed content, this is an Element
          return true;
        }       
      }
    }
    return false;
  },  
  
  // Makes a new point for node labelled name in the current point
  // The returned point is removed from the current point
  // In our content model, the new point is either a text node singleton
  // or it is a vector of element nodes (no mixed content) 
  getVectorFor : function (name, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {
        if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && (xtdom.getLocalName(point[i]) == name)) { // since there is no mixed content, this is an Element
          return this.getPointAtIndex(name, i, point);
        }       
      }
    }
    return -1;
  },   
  
  hasAttributeFor : function (name, point) {  
    return (point instanceof Array) && (point[0].getAttribute(name) != null);
  },  
          
  // Makes a new point for the attribute named 'name' in the current point
  // Quite simple: a point for an attribute is just a [node, value] array
  // that means you cannot use such points for navigation !    
  // FIXME: sanity check against attribute point in getVectorFor...
  getAttributeFor : function (name, point) {  
    var res = -1
    if (point instanceof Array) {
      var n = point[0]; // FIXME: sanity check even if can't be null per-construction ?
      var attr = n.getAttribute(name);
      if (attr) {
        n.removeAttribute(name);
        res = [n, attr]; // simulates text node
      }
    }
    return res;
  },  
  
  // FORTIFICATION
  hasVectorForAnyOf : function (names, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {        
        for (var j = 0; j < names.length; j++) {
          if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && xtdom.getLocalName(point[i]) == names[j]) {
            return true;
          }       
        }
      }
    }
    return false;
  },

  getVectorForAnyOf : function (names, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {        
        for (var j = 0; j < names.length; j++) {
          if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && xtdom.getLocalName(point[i]) == names[j]) {
            return this.getPointAtIndex(names[j], i, point);
          }       
        }
      }
    }
    return -1;
  }   
        
} 
