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
 * Model class for a String editor
 * Can be styled with a 'class' parameter in param XTiger attribute
 * Does not support filters use 'text' primitive editor instead
 */
xtiger.editor.StringModel = function () {
}

xtiger.editor.StringModel.prototype = { 
  
  // Returns the DOM node where the editor will be planted
  // This node must be the last one required to recreate the object from its seed
  // because seeding will occur as soon as this node is found
  createModel : function (container, useNode, curDoc) {
    var wrapper = useNode.getAttribute('wrapper');
    var viewNode = xtdom.createElement (curDoc, 'span');
    var content = xtdom.createTextNode(curDoc, ''); // will be set in editor constructor
    var inputNode = xtdom.createElement(curDoc, 'input');
    viewNode.appendChild (content);
    xtdom.addClassName (viewNode , 'axel-core-on');
    xtdom.addClassName (viewNode, 'axel-core-editable');
    xtdom.addClassName (inputNode, 'axel-core-off');
    var wrap = wrapper && ("embedded" != wrapper);
    if (wrap)  { // TO BE DEPRECATED !
      var tag = wrapper
      if ("auto" == wrapper) { // uses the types of the use as holder (must be a unique)
        tag = useNode.getAttribute('types');    
      }   
      var holder = xtdom.createElement (curDoc, tag);
      if ("auto" == wrapper) {
        xtdom.addClassName (holder, 'xtt-auto-wrapped'); // TODO replace with axel-auto-wrapped
      }
      holder.appendChild(viewNode);
      holder.appendChild(inputNode);
      container.appendChild(holder);
    } else {
      container.appendChild(viewNode);
      container.appendChild(inputNode);
    } 
    // manages optional editor
    var option = useNode.getAttribute('option');
    if (option) {
      var check = xtdom.createElement (curDoc, 'input');
      xtdom.setAttribute(check, 'type', 'checkbox');             
      xtdom.addClassName(check, 'axel-option-checkbox');             
      viewNode.parentNode.insertBefore(check, viewNode); 
    }
    return inputNode;
  },
  
  createEditorFromTree : function (handleNode, xtSrcNode, curDoc) {
    var data = xtdom.extractDefaultContentXT(xtSrcNode);              
    if (data) {
      if (data.search(/\S/) == -1) { // empty string
        data = null;
      } else {
        // removes potential tags surrounding initial value (for wrapper="auto" mode) 
        var m = data.match(/^\s*\<.*\>(.*?)\<\/\w*\>\s*$/);
        if (m) {
          data = m[1];
        }
      }
    } 
    var param = xtSrcNode.getAttribute('param');
    var s = new xtiger.editor.String ();
    s.initFromTree (handleNode, curDoc, data, param, xtSrcNode.getAttribute('option') || false);
    return s;
  },
  
  createEditorFromSeed : function (seed, clone, curDoc) {
    var s = new xtiger.editor.String ();
    s.initFromSeed (seed, clone, curDoc);
    return s;   
  }   
}

/**
 * Manages primitive String editor.
 * It can receive default content from the <xt:use> node that created it
 * It can have parameters declared in an xt:param attribute 
 * These both data are transmitted through the seed to any clone of the String editor 
 */
xtiger.editor.String = function () {
  this.defaultContent = null;
  this.param = null;  
  this.isOptional = null; // 'set' or 'unset' if the editor is optional
  this.isSelected = false; // used iff this.isOptional is not null 
  this.doEdit = false;
  // this event handler is frequently subscribed/unsubscribed
  var _this = this;
  this.lostFocusHandler = function (ev) { _this.unfocus() };    
}

xtiger.editor.String.prototype = {  
  
  /////////////////////////////////
  // Input Device API part
  /////////////////////////////////
  
  isEditing : function () {
    return this.doEdit;
  },
              
  // isMouseAction is true if the editing session starts from a mouse click
  // doSelectAll is true if the session should start with a pre-selection of all the text
  startEditing : function (isMouseAction, doSelectAll) {
    var l = this.editor.value.length;
    this.doEdit = true;
    this.keyboard.grab (this, this);    
    xtdom.setAttribute(this.editor, 'size', l + Number(this.param['lookahead']));
    xtdom.replaceClassNameBy (this.handle, 'axel-core-on', 'axel-core-off');
    xtdom.replaceClassNameBy (this.editor, 'axel-core-off', 'axel-core-on');
    if (doSelectAll || (this.editor.value == this.defaultContent)) {
      xtdom.focusAndSelect(this.editor);
    } else {
      xtdom.focusAndMoveCaretTo(this.editor, l);
    }
    xtdom.addEventListener (this.editor, 'blur', this.lostFocusHandler, true);    
  },  
  
  stopEditing : function (willEditAgain, value, isCancel) {
    this.doEdit = false;    
    var content = value || this.editor.value;   
    if (content.search(/\S/) == -1) { // empty
      content = this.defaultContent;
    }
    var isEdited = (content != this.defaultContent);
    this.setData (content);
    xtdom.replaceClassNameBy (this.handle, 'axel-core-off', 'axel-core-on');
    xtdom.replaceClassNameBy (this.editor, 'axel-core-on', 'axel-core-off');
    this.keyboard.release(this, this);              
    xtdom.removeEventListener(this.editor, 'blur', this.lostFocusHandler, true);
    if ((! isCancel) && isEdited) // do not auto-select if content set to default or cancel
    {
      if ((this.isOptional) && (! this.isSelected)) {
        this.setSelectionState (true); // FIXME: could be factorized with autoSelectRepeatIter below ?
      }
      xtiger.editor.Repeat.autoSelectRepeatIter (this.getHandle());
    }
    if (! isEdited) { // back to default content: unselects it if optional !
      this.setSelectionState (false);
    }            
    if (xtiger.cross.UA.IE) {
      this.editor.blur(); // IE
    }
  },
  
  cancelEditing : function () {
    this.stopEditing(false, this.dump(), true);   
  },
  
  doKeyDown : function (ev) {     
    // nop
  },    
  
  doKeyUp : function (ev) { 
    // nop
  },    
  
  getHandle : function (ev) {
    return this.editor; // in this context the handler is the input device
  },

  /////////////////////////////////
  // Pure Editor API part
  /////////////////////////////////
  
  // Returns a hash of attribute/value pairs from a string of the form "a=1;b=2..." 
  decodeParameters : function (res, params) {
    var tokens = params.split(';');
    for (var i=0; i<tokens.length; i++ ) {
      var p = tokens[i].split('=');
      if (p.length == 2) {
        res[p[0]] = p[1];
      }
    }
  },
  
 // handleNode is the node that represents the String
 // It is followed by the input field by construction
  initFromTree : function (handleNode, doc, userdata, parameters, option) {   
    this.param = {
      'lookahead' : 2
    }
    this.curDoc = doc;
    this.handle = handleNode.previousSibling;        
    this.editor = handleNode;
    this.defaultContent = userdata || 'click to edit';
    if (parameters) { this.decodeParameters(this.param, parameters) }
    if (option) { // editor is optional
      this.isOptional = option.toLowerCase();
    }
    this.awake ();  
  },
  
  awake : function () {
    this.keyboard = xtiger.session(this.curDoc).load('keyboard');   
    var _this = this;   
    xtdom.addEventListener (this.handle, 'click', function (ev) { _this.handleClick(ev) }, true); 
    this.setData (this.defaultContent);
    this.editor.defaultValue = this.defaultContent;
    this.keyboard.register (this);
    if (this.isOptional) {       
      var check = this.handle.previousSibling;
      xtdom.addEventListener (check, 'click', function (ev) { _this.handleSelect(ev) }, true);  
      this.setSelectionState ('set' == this.isOptional);      
    }   
    // FIXME: we must call unregister too when destroying the editor
  },

  // The seed is a data structure that should allow to "reconstruct" a cloned editor
  makeSeed : function () {
    if (! this.seed) { // lazy creation
      var factory = xtiger.editor.Plugin.prototype.pluginEditors['string']; // see last line of file
      this.seed = [factory, this.defaultContent, this.param, this.isOptional];
    }
    return this.seed;
  },
      
  // clone is the clone of DOM node where the editor has been planted
  initFromSeed : function (seed, clone, doc) {    
    this.curDoc = doc;
    this.handle = clone.previousSibling;
    this.editor = clone;
    this.defaultContent = seed[1];
    this.param = seed[2];                  
    this.isOptional = seed[3];
    this.awake ();
  },  
  
  setSelectionState : function (isSel) {
    if (this.isOptional) {    
      var check = this.handle.previousSibling;
      this.isSelected = isSel;
      check.checked = isSel;  
      if (isSel) {
        xtdom.replaceClassNameBy (this.handle, 'axel-option-unset', 'axel-option-set');
      } else {
        xtdom.replaceClassNameBy (this.handle, 'axel-option-set', 'axel-option-unset');
      }
    }
  },
  
  load : function (point, dataSrc) {    
    if (point !== -1) {
      var value = dataSrc.getDataFor(point);
      this.setData(value);
      this.setSelectionState (true);
    } else {                 
      this.setData(this.defaultContent);      
      this.setSelectionState (false);
    }
  },   
  
  save : function (logger) {
    if ((! this.isOptional) || (this.isSelected)) {
      logger.write(this.dump());
    } else {   
      logger.discardNodeIfEmpty();
    }
  },
          
  dump : function () {
    return this.handle.firstChild.data;
  },  
  
  setData : function (value) {
    // FIXME: could parameterize whether or not to normalize
    var norm = value ? value.replace(/\s+/g,' ') : 'click to edit';
    this.handle.firstChild.data = norm;
    this.editor.value = norm;   
    this.editor.size = norm.length;
  },    
    
  // Checks if an editor can do a given action
  can : function (action) {
    return false;
  },

  // User clicked on the handle
  handleClick : function (ev) {       
    this.startEditing (true, ev.shiftKey);
  },

  // Optional editor and user clicked on the checkbox
  handleSelect : function (ev) {    
    this.isSelected = this.handle.previousSibling.checked; // saves new state
    if (this.isSelected) {
      xtdom.replaceClassNameBy (this.handle, 'axel-option-unset', 'axel-option-set');
      xtiger.editor.Repeat.autoSelectRepeatIter (this.getHandle()); // propagation
    } else {
      xtdom.replaceClassNameBy (this.handle, 'axel-option-set', 'axel-option-unset');
    }
  },
  
  isFocusable : function () {
    return true;
  },
            
  // User (or program) gave focus (e.g. tab group manager)
  focus : function () {
    this.startEditing(false, false);
  },
  
  // Removes focus from the editor
  unfocus : function () {
    this.stopEditing(false);    
  }
}

// Registers the atomic string editor
xtiger.editor.Plugin.prototype.pluginEditors['string'] = new xtiger.editor.StringModel();
