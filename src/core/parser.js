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
 * Author(s) : Stephane Sire, Jonathan Wafellman
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * Global Constants for the XTiger Template parser
 */

xtiger.parser.NATIVE = 0;
xtiger.parser.CONSTRUCTED = 1;

// RegExps
xtiger.parser.nsXTiger = "http://ns.inria.org/xtiger";
xtiger.parser.nsXTiger_deprecated = "http://wam.inrialpes.fr/xtiger"; // deprecated ns
xtiger.parser.nsXHTML = "http://www.w3.org/1999/xhtml"
xtiger.parser.isXTiger = /<[^>]*[(component)(use)(repeat)(service)]/i; // XTiger node opening tag
xtiger.parser.isXTigerName = /[(component)(use)(repeat)(service)]/i; // XTiger node name

/**
 * Represents the tree of each component inside the XTiger file to visualize
 * NATIVE components correspond to the XTiger builtin types 'string', 'number' and 'boolean'
 * or to the target language elements filtered (declared with "xtt:targetElements")
 */
xtiger.parser.Component = function (nature, tree) {
  this.nature = nature;
  this.tree = tree;
  this.str =  null;
}

xtiger.parser.Component.prototype = {
  
  isNative : function () {
    return (xtiger.parser.NATIVE == this.nature);
  },

  hasBeenExpanded : function () {
    return (xtiger.parser.NATIVE == this.nature) || (this.str != null);
  },
  
  getSource : function () {
    if (! this.str) {
      this.str = this.tree.innerHTML;
    }
    return this.str;
  },
  
  getTree : function () {
    return this.tree;
  },
  
  getClone : function (doc) {
    var res = xtdom.cloneNode (doc, this.tree, true);
    return res;
  },
  
  importStructTo : function (targetDoc) {
    var copy = xtdom.importNode (targetDoc, this.tree, true);
    this.tree = copy;
  }
  
}

/**
 * Creates an iterator to transform the XTiger template document passed as parameter 
 * with the transformer instance
 */
xtiger.parser.Iterator = function (doc, transformer) {  
  this.transformer = transformer;
  this.unionList = new Object(); // type list of the union. any, anyElement, anyComponent, anySimple
  this.componentLib = new Object(); // parsed XTiger components
  this.transformer.coupleWithIterator (this);
  this.acquireComponentStructs (doc); // parses XTiger components
  this.acquireUnion (doc); // resolves the union types
  this.acquireHeadLabel (doc); // xt:head label
} 

xtiger.parser.Iterator.prototype = {
      
  /**************************************************/
  /*                                                */
  /*         Components acquisition methods         */
  /*                                                */
  /**************************************************/   
  
  hasType : function (name) {
    return this.componentLib[name] ? true : false;
  },

  defineType : function (name, definition) {
    this.componentLib[name] = definition;
  },
  
  defineUnion : function (name, definition) {
    this.unionList[name] = definition;
  },
  
  getComponentForType : function (name) {
    return this.componentLib[name];
  },
  
  acquireHeadLabel : function (aDocument) {
    var l;
    var head = xtdom.getElementsByTagNameXT (aDocument, "head");    
    if (head && (head.length > 0)) {
       l = head[0].getAttributeNode('label');
       if (! l) { // FIXME : most probably xtdom.getElementsByTagNameXT returned the XHTML head
        head = xtdom.getElementsByTagNameXT (head[0], "head");
        if (head && (head.length > 0)) {
          l = head[0].getAttributeNode('label');
        }
      }
    }
    this.headLabel = l ? l.value : undefined;
  },

  // Creates a memory structure for each XTiger component defined in its parameter aDocument
  // aDocument must contain an XTiger document tree
  acquireComponentStructs : function (aDocument) {
    var structs = xtdom.getElementsByTagNameXT (aDocument, "component");
    var mapTypes = new Array();
    for(var inc = 0; inc< structs.length; inc++) {
      var name = structs[inc].getAttribute('name');
      // var name = structs[inc].getAttributeNode('name').value;
      if (name) {
        mapTypes.push(name);
        this.componentLib[name] = new xtiger.parser.Component (xtiger.parser.CONSTRUCTED, structs[inc]);
      }
    } 
    this.unionList['anyComponent'] = mapTypes;
  },

  // Acquires complex types and sets them in the object
  acquireUnion : function (template) {
    var unions = xtdom.getElementsByTagNameXT (template, "union");    
    for (var inc = 0; inc < unions.length; inc++) {
      var tmp;
      var name = unions[inc].getAttributeNode('name').value; // FIXME: exception handling
      // 1. extracts and develop types to include (mandatory)
      tmp = unions[inc].getAttributeNode('include').value.split(" "); // FIXME: exception handling
      var typeIn = this.flattenUnionTypes(tmp);
      var typeString = " " + typeIn.join(" ") + " "; //  protects names with spaces for RegExp matching
      // 2. extracts and develop types to exclude and exclude them (optional)
      tmp = unions[inc].getAttributeNode('exclude');      
      if (tmp) {
        tmp = typeDel.value.split(" ");
        var typeDel = this.flattenUnionTypes(tmp);
        for (var inc2 = 0; inc2< typeDel.length; inc2++) {
          typeString = typeString.replace(new RegExp(" " + typeDel[inc2] + " "), " ");
        }
      }
      typeString = typeString.substring(1,typeString.length-1); // trims spaces
      this.unionList[name] = typeString.split(" ");     
    }
    // completes with the type "any"
    this.unionList["any"] = this.unionList["anySimple"].concat(this.unionList["anyElement"], this.unionList["anyComponent"]);
  },
  
  // Transforms a list of types into a list of simple types where all the union types have been flattened
  // into their corresponding simple types.
  // types is an array of strings that represent the type names
  flattenUnionTypes : function (types) {
    // FIXME: optimize it with lazy creation of a new array (output)
    var output = [];
    for (var inc = 0; inc < types.length; inc ++) {
      if (this.unionList[types[inc]] != null) { // checks if the type is itself a union
        var thisUnion = this.unionList[types[inc]]; // develops it    
        for (var i = 0; i < thisUnion.length; i++) {
          output.push(thisUnion[i]);
        }     
      } else {
        output.push(types[inc]); // keeps it
      }
    }
    return output;
  },  
  
  // Imports all the component definitions into the document targetDoc
  // This is a pre-requisite before transforming targetDoc sub-parts.
  importComponentStructs : function (targetDoc) { 
    xtiger.cross.log('info', 'imports template component structures to target document');
    for (var k in this.componentLib) {
      this.componentLib[k].importStructTo (targetDoc);
    }
  },
    
  /***********************************************************/
  /*                                                         */
  /*  XTiger template tree transformation to XHTML methods   */
  /*                                                         */
  /***********************************************************/

  /** 
   * Transforms an XTiger template source document
   * aNode is the root node from where the transformation starts
   * DOC is document that will be transformed
   */
  transform : function (aNode, doc) {
    this.curDoc = doc;
    this.transformer.prepareForIteration (this, doc, this.headLabel);
    this.transformIter (aNode);
    this.transformer.finishTransformation (aNode);
  },
    
  transformIter : function (aNode) {    
    if (aNode.nodeType == xtdom.ELEMENT_NODE) { // only operates on element nodes, if not, keep it unchanged
      var type = xtdom.getNodeTypeXT(aNode);  
      if (xtiger.COMPONENT == type) {
        this.changeComponent(aNode);        
      } else {
        this.transformer.saveContext (aNode); // FIXME: aNode.tagName for default case ?
        switch (type) {
          case xtiger.USE: 
            this.changeUse(aNode);
            break;
          case xtiger.REPEAT:
            this.changeRepeat(aNode);
            break;
          case xtiger.ATTRIBUTE:
            this.changeAttribute(aNode); 
            break;   
          case xtiger.BAG:
            this.changeBag(aNode); 
            break;
          default:
            this.continueWithChildOf(aNode);
        }      
        this.transformer.restoreContext (aNode);
      }
    }
  },      
    
  /*
  Iterates on the children of the node passed as parameter to transform it for presentation:
  - for children sub-trees that contain some Xtiger nodes, continue transformation by calling transform
  - ignores the other children
  Two passes algorithm because calls to transform may change the structure of the tree while iterating
  */
  continueWithChildOf : function (aNode) {
    var process = new Array();
    for (var i = 0; i < aNode.childNodes.length; i++) { 
      if (xtdom.containsXT(aNode.childNodes[i])) {
          process.push (aNode.childNodes[i]);
      }
    }
    this.transformItems (process);
  },
  
  // The accumulated nodes can be:
  // - either a simple list of nodes (DOM nodes that contain some XTiger at some point) to transform
  // - or a list starting with 'OPAQUE', in that case the following elements represent the current type
  //   which is beeing expanded, each element (cur) is an opaque structure (known only by the transformer) 
  //   and hence each node must be retrieved with getNodeFromOpaqueContext (cur)
  // Note that when iterating on an opaque list of nodes, the top of the context is removed first 
  // and restored at the end. Then, each iteration saves a new element on top of the context,   
  // setting a true flag on the saveContext / restoreContext calls to indicate this is the result of an 
  // opaque iteration
  transformItems : function (nodes) {
    if (nodes.length == 0)  return; // nothing to transform
    var cur;    
    if (nodes[0] == 'OPAQUE') { // special iteration caused by "types" expansion
      nodes.shift();
      var saved = this.transformer.popContext (); // removes the top context (xt:use or xt:bag)
      while (cur = nodes.shift()) { 
        this.transformer.saveContext (cur, true); // set top context to the current expanded type
        this.transformIter(this.transformer.getNodeFromOpaqueContext(cur));
        this.transformer.restoreContext(cur, true);
      }
      this.transformer.pushContext(saved); // continue as before      
    } else {
      while (cur = nodes.shift()) { 
        this.transformIter(cur);
      }
    }
  },

  // Transformation of a component element
  changeComponent : function (componentNode) {
    var accu = [];
    var container = xtdom.createElement(this.curDoc, 'div');
    this.transformer.genComponentBody (componentNode, container);
    this.transformer.genComponentContent (componentNode, container, accu);
    this.transformItems (accu);
    this.transformer.finishComponentGeneration (componentNode, container);
    xtdom.replaceNodeByChildOf (componentNode, container);    
  },

  // Transformation of a repeat element
  changeRepeat : function (repeatNode) {
    var accu = [];
    var container = xtdom.createElement(this.curDoc, 'div');
    this.transformer.genRepeatBody (repeatNode, container, accu);
    this.transformer.genRepeatContent (repeatNode, container, accu);
    this.transformItems (accu);
    this.transformer.finishRepeatGeneration (repeatNode, container);
    xtdom.replaceNodeByChildOf (repeatNode, container);
  },

  // Generation for xt:use and xt:use with option flag
  changeUse : function (xtSrcNode) {  
    var accu = [];        
    var container = xtdom.createElement(this.curDoc,'div');
    var kind = 'use'; 
    // creates an array that contains all the types of the use element      
    var types = xtSrcNode.getAttribute('types').split(" ");
    types = this.flattenUnionTypes(types);  
    this.transformer.genIteratedTypeBody (kind, xtSrcNode, container, types);
    this.transformer.genIteratedTypeContent (kind, xtSrcNode, container, accu, types);
    this.transformItems (accu);   
    this.transformer.finishIteratedTypeGeneration (kind, xtSrcNode, container, types);
    xtdom.replaceNodeByChildOf (xtSrcNode, container);
  }, 
  
  // Generation for xt:attribute
  changeAttribute : function (xtSrcNode) {  
    var accu = null; // not used for attribute that MUST resolve to a single type
    var container = xtdom.createElement(this.curDoc,'div');
    var kind = 'attribute';
    var types = [xtSrcNode.getAttribute('types') || xtSrcNode.getAttribute('type')]; // attributes have a single type, "type" is deprecated 
    this.transformer.genIteratedTypeBody (kind, xtSrcNode, container, types);
    this.transformer.genIteratedTypeContent (kind, xtSrcNode, container, accu, types);
    this.transformer.finishIteratedTypeGeneration (kind, xtSrcNode, container, types);
    xtdom.replaceNodeByChildOf (xtSrcNode, container);
  },   

  // Since the bag element is part of XTiger but not currently supported by AXEL
  // It is replaced with an "unsupported" span element in the DOM
  // Previous versions of AXEL (up to Revision 165) converted the bag to a use with multiple choices
  changeBag : function (bagNode) {       
    var span = xtdom.createElement(this.curDoc, 'span');
    xtdom.addClassName(span, 'axel-generator-error');
    var t = xtdom.createTextNode(this.curDoc, '! unsupported Bag element !');
    span.appendChild(t);      
    bagNode.parentNode.insertBefore(span, bagNode, true);
    bagNode.parentNode.removeChild(bagNode);
  }
}
