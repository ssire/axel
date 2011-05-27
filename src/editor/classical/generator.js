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
 * Manages atomic editor plugins.
 * Note that at least an Atomic String Editor must be added at some point
 */
xtiger.editor.Plugin = function () {  
}

xtiger.editor.Plugin.prototype = {  
  pluginEditors : {},
      
  // Returns a factory for the xtigerSrcNode if it corresponds to a primitive editor
  // typesArray is an Array containing the list of types for the node
  getEditorFor : function (xtigerSrcNode, typesArray){
    var factory;
    if (typesArray.length == 1) { // currently only 'singleton' use/bag may be primitive editors...
      var wrapper = xtigerSrcNode.getAttribute('wrapper');   
      var editor = (wrapper) ? 'string' : typesArray[0]; // FIXME: wrapper only supported with types='string'
      factory = this.pluginEditors[editor];
    }
    return factory;
  },
    
  // Returns true if the xtigerSrcNode corresponds to a primitive editor
  // typesStr is a String representing the list of types for the node
  hasEditorFor : function (xtigerSrcNode, typesStr) {
    var res;
    if (this.pluginEditors[typesStr]) {
      res = true;
    } else {
      var wrapper = xtigerSrcNode.getAttribute('wrapper');
      var editor = (wrapper) ? 'string' : typesStr; // FIXME: wrapper only supported with types='string'
      res = (this.pluginEditors[editor] != undefined);
    }
    return res;
  }
}

/**
 * Generates an editable XHTML tree while iterating with a xtiger.parser.Iterator on an XTiger XML template
 * FIXME: currently the template is fully developped into the DOM, future implementations should manage 
 * a cache for components, hence the Generator could become en Editor class that maintains the cache
 */
xtiger.editor.Generator = function (baseUrl) {
  if (baseUrl) {  xtiger.resources.setBase(baseUrl);  }
  this.plugins = new xtiger.editor.Plugin();
}

xtiger.editor.LABEL_MARK = 0; // unused (see verifyBoundary)
xtiger.editor.REPEAT_MARK = 1; 
xtiger.editor.CHOICE_MARK = 2;

xtiger.editor.Generator.prototype = {
  
  markerNames : ['xttOpenLabel', 'xttCloseLabel', 'startRepeatedItem', 'endRepeatedItem', 
    'beginChoiceItem', 'endChoiceItem'], // 'xttStringEditor'
    
  // Returns true if we can safely add a marker on the node given as parameter
  // Returns false if the node cannot hold markers or if it has already been marked
  isBoundarySafe : function (node) {
    if (! node) { // sanity check (this happens in IE if <repeat> instead of <xt:repeat> and template in iframe, or if <span/>)
      alert('Empty node in transformation, the template may contain XHTML errors, please correct it !');
      return false;
    }
        
    // special treatment for IE as TEXT nodes do not support custom attributes
    if (xtiger.cross.UA.IE && (node.nodeType != xtdom.ELEMENT_NODE)) {
      return false;
    }
    // checks if node has already been marked for a given category
    for (var i =0; i < this.markerNames.length; i++) {
      if ( node[ this.markerNames[i] ] ) {
        // xtiger.cross.log("debug", "plants bounds for node "+node.nodeName+" because "+this.markerNames[i]);
        return false;
      }
    }
    if ((node.nodeType == xtdom.ELEMENT_NODE) && (node.nodeName.search('menu-marker') != -1)) {
      return false; // FIXME: maybe we can optimize the second test (is search costly ?)
    }
    return true;
  },
  
  // category is currently not used (because for serialization we cannot share marks on nodes)
  verifyBoundaries : function (container, category) {
    var begin;
    if (! this.isBoundarySafe(container.firstChild)) {
      begin = xtdom.createElement(this.curDoc, 'span');
      xtdom.addClassName(begin, 'axel-core-boundary');
    }
    if (! this.isBoundarySafe(container.lastChild)) {
      var end = xtdom.createElement(this.curDoc, 'span');
      xtdom.addClassName(end, 'axel-core-boundary');
      container.appendChild (end);        
    }
    if (begin) { // inserted after end in case there is only one child
      container.insertBefore(begin, container.firstChild);
    }   
  },      
               
  // Returns the DOM node that need to be managed which is saved in the 'item' element
  // SHOULD not be called with the current algorithm
  getNodeFromOpaqueContext : function (item) {
      xtiger.cross.log('warning', 'unexpected call to "getNodeFromOpaqueContext" in "generator.js"');
      return item;
  },
    
  // Saves a reference to the XTiger source node into the context when a xt:use or xt:bag node is traversed. 
  // Currently the refNode content is only used by primitive editors (such as String) to create their initial state
  // The context on the top may be modified to instantiate special purpose editors (such as a Choice editor), 
  // in that case it is transformed from refNode to [refNode, editor]
  saveContext : function (xtSrcNode, isOpaque) {
    if (xtdom.isUseXT(xtSrcNode) || xtdom.isBagXT(xtSrcNode)) {
      this.context.push(xtSrcNode);
    }
  },

  restoreContext : function (xtSrcNode) {
    if (xtdom.isUseXT(xtSrcNode) || xtdom.isBagXT(xtSrcNode)) {         
      this.context.pop();     
    }
  },

  // Forces a context save of a given value
  pushContext : function (value) {
    this.context.push (value);
  },
  
  // Forces a context restoration
  popContext : function () {
    return this.context.pop ();
  },
    
  // Memorizes a pending editor in the current context
  // The editor may be reused before restoring the context
  savePendingEditor : function (ed, menu) {
    var top = this.popContext();
    this.pushContext ([top, [ed, menu]]); // replaces top of stack with an array
  },
  
  // Returns the pending editor that could have been added to the context
  // or false if there is none.
  getPendingEditor : function () {
    if (this.context.length > 0) {  // checks it has traversed at least a xt:use or xt:bag
      var top = this.context[this.context.length - 1];
      if (top instanceof Array) { // checks if the top of the context contains a pending editor
        return top[1];
      }
    }
    return false;
  },
  
  peekTopContext : function () {
    var top = this.context[this.context.length - 1];
    return (top instanceof Array ? top[0] : top);
  },
           
  coupleWithIterator : function (iterator) { 
    this.iterator = iterator;             
    // defines type anySimple for simple types 
    var anySimple = new Array("string", "number", "boolean");
    iterator.defineUnion("anySimple", anySimple);
  },
  
  // Prepares the generator to generate with a given iterator inside a given doc 
  // Label is the xt:head label attribute or undefined if it does not exist
  prepareForIteration : function (iterator, doc, label) { 
    this.context = []; // stack
    this.curDoc = doc;
    this.headLabel = label;
    if (! doc) { alert('You must specify a document to prepareForIteration !'); }
  },
    
  genComponentBody : function (componentNode, container) { },
   
  // Copies all the children of the component into the container 
  // Accumulates them in the accumulator to continue the transformation
  genComponentContent : function (componentNode, container, accu) {     
    xtdom.moveChildOfInto (componentNode, container, accu);
  },
  
  finishComponentGeneration : function (xtigerSrcNode, container) {     
    var context = this.getPendingEditor ();
    if (context) {
      var editor = context[0];
      // currently we have only Choice Editors as pending editors
      this.verifyBoundaries(container, xtiger.editor.CHOICE_MARK);
      var name = xtigerSrcNode.getAttribute('name'); // current type beeing expanded
      editor.addChoiceItem (name, container.firstChild, container.lastChild);     
      var i18n = xtigerSrcNode.getAttribute('i18n');
      if (i18n) {          
        var menu = context[1];
        // change the label of the <option> in the <select> menu created for the <xt:use>
        var options = menu.getElementsByTagName('option');
        for (var i = 0; i < options.length; i++) {
          var text = options.item(i).firstChild;
          if (text.data == name) {
            text.data = i18n;
            break;
          }
        }
      }         
    }
    // begin experimental menu-marker feature
    if (container.querySelector) {
      var select = container.querySelector('select[class]');
      if (select) {                                               
        var cname = select.getAttribute('class');
        menuMarker = xtdom.getMenuMarkerXT(container, cname);
        if (menuMarker) {                                    
          // replaces menuMarker with select                 
          menuMarker.parentNode.replaceChild(select, menuMarker);  
        }
      }
    }
    // end experimental menu-marker feature   
    //FIXME: we could handle a xttOpenLabel and xttCloseLabel here too for inline components
  },
  
  genRepeatBody : function (repeatNode, container) { },
  
  genRepeatContent  : function (repeatNode, container, accu) { 
    xtdom.moveChildOfInto (repeatNode, container, accu);  
  },
  
  finishRepeatGeneration : function (repeatNode, container) { 
    this.verifyBoundaries(container, xtiger.editor.REPEAT_MARK);  
    var rc = new xtiger.editor.Repeat ();
    rc.initFromTree (container, repeatNode, this.curDoc);   
  },
    
  genIteratedTypeBody : function (kind, xtigerSrcNode, container, types) { 
    var menu, key, value;
    // generates type menu
    if (types.length > 1) {
      var s = menu = xtdom.createElement(this.curDoc, 'select');      
      for (var i = 0; i < types.length; i++) {
        var o = xtdom.createElement(this.curDoc, 'option');
        var t = xtdom.createTextNode(this.curDoc, types[i]); // FIXME : use i18n here !!!! or fix it after generation
        o.appendChild(t);
        s.appendChild(o);
      }
      // Experimental feature : param="marker=value" | "name=value"
      var pstr = xtigerSrcNode.getAttribute('param');
      if (pstr) {
        var i = pstr.indexOf('=');
        if (i != -1) {
          key = pstr.substr(0, i);
          value = pstr.substr(i + 1);
        }
      }
      if ((key == 'name') && value) {
        xtdom.addClassName(menu, value);
      } else if ((key = 'marker') && value) { // generates a <span class="value"><xt:menu-marker/><br/><select>...</span> group
        var span = xtdom.createElement(this.curDoc, 'span');
        xtdom.addClassName(span, value);
        var mm = xtdom.createElementNS(this.curDoc, 'menu-marker', xtiger.parser.nsXTiger);
        span.appendChild(mm);
        var br = xtdom.createElement(this.curDoc, 'br');
        span.appendChild(br);
        span.appendChild(menu);
        menu = span;
      }             
      // End experimental feature     
      container.appendChild(menu);
      var c = new xtiger.editor.Choice ();  
      /// Begin PATCH 
      var label = xtdom.getTagNameXT(xtigerSrcNode);    
      if (label && (label.indexOf(' ') != -1)) {
        c.initFromTree(s, label.split(' '), this.curDoc);     
      } else {
        c.initFromTree(s, types, this.curDoc);      
      }
      /// End PATCH 
      // c.initFromTree(s, types, this.curDoc);
      this.savePendingEditor (c, s); // will be used in finishComponentGeneration
      xtdom.addEventListener (s, 'change', function (ev) { c.handleSelect(ev); }, false);
      xtiger.cross.log('plant', 'Created a Choice editor for types ' + '/' + types + '/' );
    }
  },
    
  // Limitations: xt:option, xt:bag are treated as xt:use
  // any string type is converted to a XttStringEditor (even if it was part of a mixed content model) 
  //
  // FIXME: END OF RECURSION should also address the possible Choice editor under way to call addChoiceItem....
  genIteratedTypeContent  : function (kind, xtigerSrcNode, container, accu, types) { 
    var factory;
    if (factory = this.plugins.getEditorFor(xtigerSrcNode, types)) { 
        // END OF RECURSION for primitive editors and xt:attribute elements
        // assumes default content was pushed on the stack
        var editorHandle = factory.createModel (container, xtigerSrcNode, this.curDoc);
        var srcUseOrBag = (kind == 'attribute') ? xtigerSrcNode : this.peekTopContext (); // attribute node not saved onto the context
        // currently srcUseOrBag and xtigerSrcNode are the same because terminal editors can only be on single choice xt:use        
        editorHandle.xttPrimitiveEditor = factory.createEditorFromTree (editorHandle, srcUseOrBag, this.curDoc);        
    } else {
        for (var i = 0; i < types.length; i++) {
          var curComponentForType = this.iterator.getComponentForType(types[i]);
          if (curComponentForType) { // constructed type
            var generated = curComponentForType.getClone (this.curDoc);
            container.appendChild(generated);
            accu.push (generated); // follow up transformation
          } else {  // END OF RECURSION for non constructed types editors
            var span = xtdom.createElement(this.curDoc, 'span');
            xtdom.addClassName (span, 'axel-generator-error');            
            var txt = xtdom.createTextNode (this.curDoc, 'ERROR: "' + types[i] + '" is undeclared or is terminal and part of a choice');
            span.appendChild (txt);
            container.appendChild (span);
          }
        }
    }
  },

  // adds xttOpenLabel and xttCloseLabel on the container boundaries which may be ELEMENT_NODE or TEXT_NODE
  finishIteratedTypeGeneration : function (kind, xtigerSrcNode, container, types) {    
    var label = xtdom.getTagNameXT(xtigerSrcNode);    
    if (! label)  return;                             
    /// Begin PATCH
    if (label.indexOf(' ') != -1) return;   
    /// End PATCH   
    if (kind == 'attribute') {
      label = '@' + label; // code for a label for an attribute
    }
    if (! container.firstChild) { // sanity check
      xtiger.cross.log('warning', 'XTiger component (label="' + label + '") definition is empty');
      return;
    }
    this.verifyBoundaries(container, xtiger.editor.USE_MARK);     
    xtiger.cross.log('plant', 'Planting use Start & End labels for '  + label); 
    if (container.firstChild.xttOpenLabel) {
      xtiger.cross.log('warning', 'use "' + label + '" and use "' + container.firstChild.xttOpenLabel + '" with same START !' );
    }   
    var flow = xtigerSrcNode.getAttribute('flow');
    if (flow) {
      label = '!' + flow + '!' + label; 
    }
    container.firstChild.xttOpenLabel = label;    
    if (container.lastChild.xttCloseLabel) {
      xtiger.cross.log('warning', 'use "' + label + '" and use "' + container.lastChild.xttCloseLabel + '" with same END !' );
    } 
    container.lastChild.xttCloseLabel = label;
  },
  
  // last callback
  finishTransformation : function (n) {
    // now activate all the Choice editor (except the one duplicated as models inside repeat)
    var treeWalker = xtiger.cross.makeTreeWalker (n, xtdom.NodeFilter.SHOW_ELEMENT,
          function(node) { return (node.markChoiceEditor) ? xtdom.NodeFilter.FILTER_ACCEPT : xtdom.NodeFilter.FILTER_SKIP; });
    while(treeWalker.nextNode()) {
      if (treeWalker.currentNode.markChoiceEditor) {  // Test for Safari
        treeWalker.currentNode.markChoiceEditor.initializeSelectedItem (0);
      }
    }                            
  },
  
  // Loads data from a DOMDataSource into the generated editor starting at node root
  loadData: function (root, dataSrc, loader) {
    var l = loader || this.defaultLoader;
    if (l) { l.loadData(root, dataSrc) } else { alert("Default XML loader missing !" ) }
  },

  // Serializes data from the generated editor starting at node root into a logger
  serializeData: function (root, logger, serializer) {
    var s = serializer ? serializer : this.defaultSerializer;
    if (s) { 
      s.serializeData(root, logger, this.headLabel);
    } else { 
      alert("Default XML serializer missing !") 
    }
  }
}
