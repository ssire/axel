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
 * Author(s) : Stéphane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

(function () {

  var DEF_PARAMS = {
    noedit : 'false'
  };
  
  var _timestamp = -1;
  
  var _focusAndSelect = function (editor) {
    // pre-condition: the editor's handle must already have focus
    try {
      editor.getDocument().execCommand('selectAll', false, ''); // FIXME: fails on iPad
    }
    catch (e) { }
  };
  
  var _trim = function (str) {
    var tmp = str.replace(/\s+/gi,' ');
    if (/\s/.test(tmp.charAt(0))) {
      tmp = tmp.substr(1);
    }
    if (/\s$/.test(tmp)) {
      tmp = tmp.substr(0, tmp.length-1);
    }
    return tmp;
  }

  // Checks node contains only a text node, otherwise recreate it
  // (this can be used to prevent cut and paste side effects)
  var _sanitize = function (node, doc) {
    var tmp = '';
    if ((node.children.length > 1) || (node.firstChild && (node.firstChild.nodeType != xtdom.TEXT_NODE))) {
      // Detect whether the browser supports textContent or innerText
      if (typeof node.textContent == 'string') {
        tmp = node.textContent;
      } else if (typeof node.innerText == 'string') {
        tmp = node.innerText;
      }
      node.innerHTML = '';
      t = xtdom.createTextNode(doc, tmp ? _trim(tmp) : tmp);
      node.appendChild(t);
    }
  };

  // Inner editor class
  var TextModel = function TextModel (aHandleNode, aDocument) {
    this.handle = aHandleNode;
    this.defaultData = this.model;
    this.doc = aDocument;
    this.keyboard = xtiger.session(aDocument).load('keyboard');
    this.editInProgress = false;
  };

  TextModel.prototype = {

    // Gets *this* instance's parameter whose name is given in arg
    getParam : function (aKey) {
      return this.params ? (this.params[aKey] || DEF_PARAMS[aKey]) : DEF_PARAMS[aKey];
    },

    // Returns the unique key associated with *this* instance. The returned
    getUniqueKey : function () {
      return this.uid;
    },

    getDocument : function () {
      return this.doc;
    },

    // Returns the editor's current handle, that is, the HTML element where the editor is "planted"
    getHandle : function () {
      return this.handle;
    },

    // Returns the editor's current data
    getData : function () {
      return this.model;
    },

    // Returns the default data for *this* model.
    getDefaultData: function () {
      return this.defaultData;
    },

    // Sets editor model value. Takes the handle and updates its DOM content.
    _setData : function (aData) {
      var t;
      if (this.handle.firstChild) {
        this.handle.firstChild.data = aData;
      } else { // in case user has deleted all the field
        t = xtdom.createTextNode(this.getDocument(), aData);
        this.handle.appendChild(t);
      }
      this.model = aData;
    },

    /**
     * AXEL plugin API
     * Creates (lazy creation) an array to "seed" *this* model. Seeding occurs in a repeat context. 
     */
    makeSeed : function () {
      if (!this.seed)
        this.seed = [ factory, this.defaultData, this.params, this.hasOptionAttr ];
      return this.seed;
    },

    /**
     * AXEL plugin API
     * Init function, called by the model's factory after object's instanciation
     */
    init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      if (aParams) { /* parse parameters */
        if (typeof (aParams) === 'string') {
          this.params = {};
          xtiger.util.decodeParameters(aParams, this.params);
        } else if (typeof (aParams) === 'object') {
          this.params = aParams;
        }
      }
      /* sets up initial content */
      if (aDefaultData && typeof aDefaultData === 'string') { 
        this.defaultData = aDefaultData;
      } else {
        this.defaultData = 'click to edit';
      }                              
      this.model = this.defaultData; // quirck in case _setData is overloaded and checks getDefaultData()
      this._setData(this.defaultData);
      this.setModified(false);
      this.hasOptionAttr = aOption ? true : false;
      if (aOption) { /* the editor is optional */
        this.optCheckBox = this.handle.previousSibling;
        if (aOption === 'unset')
          this.isOptionSet = true; // auirk to prevent unset to return immediately
        (aOption === 'set') ? this.set(false) : this.unset(false);
      }
      this.uid = aUniqueKey;
      if (this.getParam('hasClass')) {
        xtdom.addClassName(this.handle, this.getParam('hasClass'));
      }
      this.awake();
    },

    /**
     * AXEL plugin API
     * Awakes the editor to DOM's events, registering the callbacks for them.
     * TODO stores the callback to be able to remove them at will
     */
    awake : function () {
      var _this = this;
      if (this.getParam('noedit') !== 'true') {
        xtdom.setAttribute(this.handle, 'contenteditable', 'true');
        xtdom.addClassName(this.handle, 'axel-core-editable');
        // 'mousedown' always preceeds 'focus', saves shiftKey timestamp to detect it in forthcoming 'focus' event
        xtdom.addEventListener(this.handle, 'mousedown', function(ev) { if (ev.shiftKey) { _timestamp = new Date().getTime() }; }, true);
        // tracks 'focus' event in case focus is gained with tab navigation  (no shiftKey)
        xtdom.addEventListener(this.handle, 'focus', function(ev) {  _this.startEditing(); }, true);
        if (xtiger.cross.UA.gecko) {  // gecko: prevent browser from selecting contentEditable parent in triple clicks ! 
          xtdom.addEventListener(this.handle, 'mousedown', function(ev) { if (ev.detail >= 3) {xtdom.preventDefault(ev);xtdom.stopPropagation(ev);_this.handle.focus();_focusAndSelect(_this)} }, true);
        }
        if (xtiger.cross.UA.webKit) {
          this.doSelectAllCb = function () { _focusAndSelect(_this); }; // cache function
        }
        // TODO: instant paste cleanup by tracking 'DOMNodeInserted' and merging each node inserted ?
      }
      if (this.isOptional()) {
        xtdom.addEventListener(this.optCheckBox, 'click', function(ev) { _this.onToggleOpt(ev); }, true);
      }
      this.blurHandler = function (ev) { _this.handleBlur(ev); }; 
    },

    /**
     * AXEL plugin API
     * Loads the editor with data in the point in the data source passed as parameters.
     * Unsets the editor and shows the default content if the point is -1 
     * (i.e. it doesn't exists in the source tree). Shows the default content and considers
     * the editor as set if the point is not -1 but is empty. This can happen for instance 
     * with empty tags in the source tree (e.g. <data/>).
     */
    load : function (aPoint, aDataSrc) {
      var _value;
      if (aPoint !== -1) { 
        _value = aDataSrc.getDataFor(aPoint);
        this._setData(_value || this.defaultData);
        this.setModified(_value !==  this.defaultData);
        this.set(false);
      } else {
        this.clear(false);
      }
    },

    /**
     * AXEL plugin API
     * Writes the editor's current data into the given logger.
     */
    save : function (aLogger) {
      if (this.isOptional() && !this.isSet()) {
        aLogger.discardNodeIfEmpty();
        return;
      }
      if (!this.model) {
        return;
      }
      aLogger.write(this.model);
    },

    /**
     * AXEL tab group manager API
     * Returns true if the model's editor is able to be put into a chain of focus. 
     */
    isFocusable : function () {
      return this.getParam('noedit') !== 'true';
    },

    /**
     * AXEL tab group manager API
     * Gives the focus to *this* instance. Called by the tab navigation manager.
     */
    focus : function () {
      this.handle.focus(); // should trigger focus event
    },

    /**
     * AXEL tab group manager API
     * Takes the focus away from *this* instance. Called by the tab navigation manager.
     */
    unfocus : function () {
      this.stopEditing(false);
    },

    /**
     * AXEL option API
     * Returns true if the editor is optional, false otherwise
     */
    isOptional : function () {
      return this.hasOptionAttr;
    },

    /**
     * AXEL option API
     * Returns true if the editor is optional and is set, false otherwise. 
     * This is only relevant if the editor is optional.
     */
    isSet : function () {
      return this.hasOptionAttr && (this.isOptionSet ? true : false);
    },

    /**
     * AXEL option API
     * Sets the editor option status to "set" (i.e. true) if it is optional.
     * Propagates the change to the repeater chain if asked too, either optional or not.
     */
    set : function(doPropagate) {
      // propagates state change in case some repeat ancestors are unset at that moment
      if (doPropagate) {
        if (this.getParam('noedit') !== 'true') {
          xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle(true));
        }
        xtdom.removeClassName(this.handle, 'axel-repeat-unset');
      }
      if (this.isOptionSet) // safety guard (defensive)
        return;
      this.isOptionSet = true;
      if (this.isOptional()) {
        xtdom.removeClassName(this.handle, 'axel-option-unset');
        xtdom.addClassName(this.handle, 'axel-option-set');
        this.optCheckBox.checked = true;                          
      }
    },

    /**
     * AXEL option API
     * Sets the editor option status to "unset" (i.e. false) if it is optional.
     */
    unset : function (doPropagate) {
      if (!this.isOptionSet) // safety guard (defensive)
        return;
      this.isOptionSet = false;
      if (this.isOptional()) {
        xtdom.removeClassName(this.handle, 'axel-option-set');
        xtdom.addClassName(this.handle, 'axel-option-unset');
        this.optCheckBox.checked = false;                    
      }
    },

    /**
     * AXEL keyboard API (called from Keyboard manager instance)
     */
    isEditing : function () {
      return this.editInProgress !== false;
    },

    /**
     * AXEL keyboard API (called from Keyboard manager instance)
     */
    cancelEditing : function () {
      this.stopEditing(true);
    },

    /**
     * AXEL keyboard API (called from Keyboard manager instance)
     */
    doKeyDown : function (ev) { 
    },

    /**
     * AXEL keyboard API (called from Keyboard manager instance)
     */
    doKeyUp : function (ev) { 
    },

    // Returns true if the model contains data which is no longer the defaut data, 
    // either because a load() call modified it or because an user's interaction has occured
    isModified : function () {
      return this.hasBeenEdited;
    },

    // Sets the isModified flag. Useless unless the update or load methods
    // are filtered by a filter which need to control the isModified behavior.
    setModified : function (flag) {
      this.hasBeenEdited = flag;
    },

    // Starts editing the field (to be called once detected)
    startEditing : function () {
      // avoid reentrant calls (e.g. user's click in the field while editing)
      if (this.editInProgress === false) {
        this.editInProgress = true;
        // registers to keyboard events
        this.kbdHandlers = this.keyboard.register(this);
        this.keyboard.grab(this, this);
//        xtdom.removeClassName(this.handle, 'axel-core-editable');
        if ((!this.isModified()) || ((_timestamp != -1) && ((_timestamp - new Date().getTime()) < 100))) {
          if (xtiger.cross.UA.webKit) {
            // it seems on webkit the contenteditable will really be focused after callbacks return
            setTimeout(this.doSelectAllCb, 100);
          } else {
            _focusAndSelect(this); 
          }
        }
        // must be called at the end as on FF 'blur' is triggered when grabbing
        xtdom.addEventListener(this.handle, 'blur', this.blurHandler, false);
      }
    },

    // Stops the edition process on the device
    stopEditing : function (isCancel) {
      if ((! this.stopInProgress) && (this.editInProgress !== false)) {
        this.stopInProgress = true;
        _timestamp = -1;
        this.keyboard.unregister(this, this.kbdHandlers);
        this.keyboard.release(this, this);
        xtdom.removeEventListener(this.handle, 'blur', this.blurHandler, false);
        _sanitize(this.handle, this.doc);
        if (!isCancel) {
          // user may have deleted all
          // FIXME: we should also normalize in case of a paste that created garbage (like some <br/>)
          this.update(this.handle.firstChild ? this.handle.firstChild.data : null);
        } else {
          // restores previous data model - do not call _setData because its like if there was no input validated
          if (this.handle.firstChild) {
            this.handle.firstChild.data = this.model;
          }
        }
        this.handle.blur();
//        xtdom.addClassName(this.handle, 'axel-core-editable');
        this.stopInProgress = false;
        this.editInProgress = false;
      }
    },

    // Updates the editor data model with the given data
    // This gives a chance to normalize the input
    update : function (aData) { 
      if (aData === this.model) { // no change
        return;
      }
      // normalizes text (empty text is set to _defaultData)
      if ((!aData) || (aData.search(/\S/) === -1) || (aData === this.defaultData)) {
        this.clear(true);
        return;
      }
      this._setData(aData);
      this.setModified(true);
      this.set(true);
    },

    // Clears the model and sets its data to the default data.
    // Unsets it if it is optional and propagates the new state if asked to.     
    clear : function (doPropagate) {
      this._setData(this.defaultData);
      this.setModified(false);
      if (this.isOptional() && this.isSet())
        this.unset(doPropagate);
    },

    handleBlur : function (ev) {
      this.stopEditing(false);
    },

    /**
     * Handler for the option checkbox, toggles the selection state.
     */
    onToggleOpt : function (ev) {
      this.isSet() ? this.unset(true) : this.set(true);
    }
  };

  var factory = {

    createModel : function createModel (aContainer, aXTUse, aDocument) {
      var _handletag = aXTUse.getAttribute('handle');
      _handletag = _handletag ? _handletag : 'span';
      var _handle = xtdom.createElement(aDocument, _handletag);
      var _content = xtdom.createTextNode(aDocument, '');
      _handle.appendChild(_content);
      var option = aXTUse.getAttribute('option');
      if (option) {
        var check = xtdom.createElement(aDocument, 'input');
        xtdom.setAttribute(check, 'type', 'checkbox');
        xtdom.addClassName(check, 'axel-option-checkbox');
        aContainer.appendChild(check);
      }
      aContainer.appendChild(_handle);
      return _handle;
    },

    createEditorFromTree : function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
      var _data = xtdom.extractDefaultContentXT(aXTUse);
      var _model = new TextModel(aHandleNode, aDocument);
      var _param = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _param);
      // if (_param['filter']) {
      //   _model = this.applyFilters(_model, _param['filter']);
      // }
      _model.init(_data, aXTUse.getAttribute('param'), aXTUse.getAttribute('option'), this.createUniqueKey());
      return _model;
    },

    createEditorFromSeed : function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _model = new TextModel(aClone, aDocument);
      var _defaultData = aSeed[1];
      var _params = aSeed[2];
      var _option = aSeed[3];
      // if (_params && _params['filter']) {
      //   _model = this.applyFilters(_model, _params['filter']);
      // }
      _model.init(_defaultData, _params, _option, this.createUniqueKey(), aRepeater);
      return _model;
    }
  };

  $axel.plugin.register('content', factory, TextModel, false); // false: not filterable
}());