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

/**
 * Class TextFactory (static)
 * 
 * @class TextFactory
 * @version beta
 */
xtiger.editor.TextFactory = (function TextFactory() {

  /**
   * @name _TextModel
   * @class _TextModel
   */
  var _TextModel = function(aHandleNode, aDocument) {

    /*
     * Default parameters for the video editor. Parameters meaning and
     * possible values are documented below.
     */
    var _DEFAULT_PARAMS = {
      device : 'text-device',
      type : 'input',
      layout : 'placed',
      shape : 'self',
      expansion : 'grow',
      clickthrough : 'true', // FIXME: use a real boolean ?
      enablelinebreak : 'false'
    };

    /**
     * The HTML node used as handle by the editor.
     */
    this._handle = aHandleNode;

    /**
     * The data handled by *this* model
     */
    this._data = null;

    /**
     * The default data as specified in the xt:use node
     */
    this._defaultData = this._data;

    /**
     * HTML element to represents an editor containing no data
     */
    this._noData = this._handle.firstChild;

    /**
     * A reference to the DOM document containing the editor
     */
    this._document = aDocument;

    /**
     * The actual parameters used by *this* instance
     */
    this._params = _DEFAULT_PARAMS;

    /**
     * If true, the editor is optional
     */
    this._isOptional = false;

    /**
     * If true, the optional editor is set. Irrelevant if not optional
     */
    this._isOptionSet = false;

    /**
     * The HTML checkbox for optional editors. Sets in init() method
     */
    this._optCheckBox;

    /**
     * The device object used to edit this model. It is sets in init()
     * function
     */
    this._device = null;
    
    /**
     * A stored seed for this model
     */
    this._seed = null;

    /**
     * if true, the model's data was modified and is no longer equals to the
     * default data.
     */
    this._isModified = false;

    /**
     * A unique string that identifies *this* instance
     */
    this._uniqueKey;

    /* Call the create method for delegation purposes */
    this.create();

  };    
  
  /** @memberOf _TextModel */
  _TextModel.prototype = {

    /*
     * Sets *this* instance data. Takes the handle and updates its DOM content.
     */
    _setData : function (aData) {
      if (this._handle.firstChild)
        this._handle.firstChild.data = aData;
      this._data = aData;
    },

    /**
     * This method is called at the instance's creation time. It may serves
     * as a "hook" to add a custom behavior by the means of the delegation
     * pattern.
     */
    create : function () {
      // nope
    },

    /**
     * <p>
     * Initialization function, called by the model's factory after object's
     * instanciation. Cares to sets the default content, to parse and sets
     * the various parameters and to call the awake() method.
     * </p>
     * 
     * @param {string}
     *            aDefaultData
     * @param {string|object}
     *            aParams Either the parameter string from the <xt:use> node
     *            or the parsed parameters object from the seed
     * @param {string}
     *            aOption If the parameter is not null, the editor is
     *            optional. If its value equals "set", the editor is set by
     *            default
     * @param {string}
     *            aUniqueKey A unique string (no two editor have the same)
     *            to provide an unambiguous identifier even among repeated
     *            editor
     */
    init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      if (aParams) { /* parse parameters */
        if (typeof (aParams) == 'string')
          xtiger.util.decodeParameters(aParams, this._params);
        else if (typeof (aParams) == 'object')
          this._params = aParams;
      }
      /* sets up initial content */
      if (aDefaultData && typeof aDefaultData == 'string') { 
        this._defaultData = aDefaultData;
      } else {
        this._defaultData = 'click to edit';
      }                              
      this._data = this._defaultData; // Quirck in case _setData is overloaded and checks getDefaultData()
      this._setData(this._defaultData);
      this._isOptional = aOption ? true : false;
      if (aOption) { /* the editor is optional */
        this._optCheckBox = this._handle.previousSibling;
        if (aOption == 'unset')
          this._isOptionSet = true; // Quirk to prevent unset to return immediately
        (aOption == 'set') ? this.set(false) : this.unset(false);
      }
      this._uniqueKey = aUniqueKey;
      if (this.getParam('hasClass')) {
        xtdom.addClassName(this._handle, this.getParam('hasClass'));
      }
      var _deviceFactory = this._params['device'] ? 
          xtiger.factory(this._params['device']) : 
          xtiger.factory(this._params['defaultDevice']);
      this._device = _deviceFactory.getInstance(this._document,
          this._params['type'], this._params['layout']);
      this.awake();
    },

    /**
     * Creates (lazy creation) an array to "seed" *this* model. Seeding
     * occurs in a repeat context. 
     * 
     * @return
     */
    makeSeed : function () {
      if (!this._seed)
        this._seed = [ xtiger.editor.TextFactory, this._defaultData,
          this._params, this._isOptional ];
      return this._seed;
    },
    
    /**
     * Called when the editor is removed by a repeater. Does nothing by default,
     * it is declared so that it can be filtered.
     * 
     * @return
     */
    remove : function () {
    },

    /**
     * <p>
     * Returns true if *this* object is able to perform the function whose
     * name is given as parameter.
     * </p>
     * 
     * <p>
     * This function implements the can/execute delegation pattern, this
     * pattern allows a filter to easily extend the instance API with
     * specific methods. Those methods are called from various devices such
     * as the text device.
     * </p>
     * 
     * @param {string}
     *            aFunction The name of the function
     * @return {boolean} True if *this* object as a function property with
     *         the given name, false otherwise.
     */
    can : function (aFunction) {
      return typeof this[aFunction] == 'function';
    },

    /**
     * <p>
     * Calls on *this* instance the function whose name is given as
     * paramter, giving it the provided parameter (may be null). Returns the
     * result.
     * </p>
     * 
     * <p>
     * This function implements the can/execute delegation pattern, this
     * pattern allows a filter to easily extend the instance API with
     * specific methods. Those methods are called from various devices such
     * as the text device.
     * </p>
     * 
     * @param {string}
     *            aFunction The name of the function
     * @param {any}
     *            aParam A parameter whose type is not constrained
     * @return {any} The return value of the called function.
     */
    execute : function (aFunction, aParam) {
      return this[aFunction](aParam);
    },

    /**              
     * <p>Loads the editor with data in the point in the data source passed as parameters.
     * Unsets the editor and shows the default content if the point is -1 
     * (i.e. it doesn't exists in the source tree). Shows the default content and considers
     * the editor as set if the point is not -1 but is empty. This can happen for instance 
     * with empty tags in the source tree (e.g. <data/>).</p>
     *
     *<p>Initializes the option status of the editor (set or unset),
     * and the modification status (setModified)</p>
     * 
     * @param {Array}
     *            aPoint
     * @param aDataSrc
     */
    load : function (aPoint, aDataSrc) {
      var _value;
      if (aPoint !== -1) { 
        _value = aDataSrc.getDataFor(aPoint);
        this._setData(_value || this._defaultData);
        this._isModified = (_value !=  this._defaultData);
        this.set(false);
      } else {
          this.clear(false);
        }
    },    

    /**
     * Writes the editor's current data into the given logger.
     * 
     * @param aLogger
     */
    save : function (aLogger) {
      if (this.isOptional() && !this._isOptionSet) {
        aLogger.discardNodeIfEmpty();
        return;
      }
      if (!this._data)
        return;
      aLogger.write(this._data);
    },

    /**
     * <p>
     * Updates this model with the given data.
     * </p>
     * 
     * <p>
     * If *this* instance is optional and "unset", autocheck it.
     * </p>
     * 
     * @param {string}
     *            aData The new value to be stored by *this* model's
     *            instance
     */
    update : function (aData) { 
      if (aData == this._data) { // no change
        return; 
        // FIXME: should we use isModified instead ? 
        // filters would just need to call setModified and not this._data ?
      }
      // normalizes text (empty text is set to _defaultData)
      if (aData.search(/\S/) == -1 || (aData == this._defaultData)) {
        this.clear(true);
        return;
      }
      this._setData(aData);
      this._isModified = true;
      this.set(true);
    },

    /**
     * Clears the model and sets its data to the default data.
     * Unsets it if it is optional and propagates the new state if asked to.     
     *
     * @param {doPropagate}
     *            a boolean indicating wether to propagate state change
     *            in the repeater chain, UNSUPPORTED at that time    
     */
    clear : function (doPropagate) {
      this._setData(this._defaultData);
      this._isModified = false;
      if (this.isOptional() && this.isSet())
        this.unset(doPropagate);
    },
    
    /* aliases the clear method */
    setDefaultData: this.clear,

    /**
     * Returns the editor's current data
     * 
     * @return {String} The editor's current data
     */
    getData : function () {
      return this._data;
    },
    
    /**
     * Returns the default data for *this* model.
     * 
     * @return {String} The default data
     */
    getDefaultData: function () {
      return this._defaultData;
    },

    /**
     * Returns the editor's current handle, that is, the HTML element where
     * the editor is "planted".
     * 
     * @return {HTMLElement} The editor's handle
     */
    getHandle : function (inDOMOnly) {
      if(inDOMOnly) {
        // test if *this* instance is being edited and has a "placed" layout
        if (this._params['layout'] == 'placed' && this._device && this._device.getCurrentModel() == this)
          return this._device.getHandle();
      }
      return this._handle;
    },
    
    /**
     * Getter for *this* instance owner document.
     * 
     * @return {DOMDocument} The DOM document holding *this* model
     */
    getDocument : function () {
      return this._document;
    },

    /**
     * Returns a DOM node used to set the device's handle size.
     */
    getGhost : function () {
      var _s = this._params['shape']; // we only check first char is p
                      // like 'parent'
      return (_s && _s.charAt(0) == 'p') ? this._handle.parentNode
          : this._handle;
    },

    /**
     * Gets *this* instance's parameter whose name is given in arg
     * 
     * @return {any} The parameter stored under the given key
     */
    getParam : function (aKey) {
      return this._params[aKey];
    },

    /**
     * Returns the unique key associated with *this* instance. The returned
     * key is unique within the whole document.
     * 
     * @return {string} The unique key
     */
    getUniqueKey : function () {
      return this._uniqueKey;
    },

    /**
     * Returns true if the model contains data which is no longer the defaut
     * data, either because a load() call modified it or because an user's
     * interaction has occured.
     * 
     * @return {boolean} True if the data was changed, false otherwise.
     */
    isModified : function () {
      return this._isModified;
    },
    
    /**
     * Sets the isModified flag. Useless unless the update or load methods
     * are filtered by a filter which need to control the isModified
     * behavior.
     * 
     * @param {boolean}
     *            isModified The new value for the isModified flag
     */
    setModified : function (isModified) {
      this._isModified = isModified;
    },

    /**
     * Returns true if the model's editor is able to be put into a chain of
     * focus. Chains of focus are a list of editor that can be accessed by
     * iterating with the "tab" key (this feature is better known as the
     * "tab-navigation" feature).
     * 
     * @return {boolean} True if the model should be put into a chain of
     *         focus, false otherwise.
     */
    isFocusable : function () {
      return !this._params['noedit'];
    },

    /**
     * Gives the focus to *this* instance. Called by the tab navigation
     * manager.
     */
    focus : function () {
      this.startEditing({shiftKey: true}); // Hack to autoselect content
    },

    /**
     * Takes the focus away from *this* instance. Called by the tab
     * navigation manager.
     */
    unfocus : function () {
      this.stopEditing();
    },

    /**
     * Returns the optionality status of *this* instance. True if the model
     * is optional, false otherwise.
     */
    isOptional : function () {
      return this._isOptional;
    },

    /**
     * Returns the optionality status of *this* model, that is, if it
     * is set or unset. Only relevant if the model IS optional
     * 
     * @return {boolean} True if the model is optional and set, false
     *         otherwise
     *   
     * @see #isOptional()
     */
    isSet : function () {
      return this._isOptional && (this._isOptionSet ? true : false);
    },

    /**
     * Sets the editor option status to "set" (i.e. true) if it is optional.
     * Also propagates the change to the repeater chain if asked too and
     * this either it is optional or not.
     * 
     * @param {doPropagate}
     *            a boolean indicating wether to propagate state change in
     *            the repeater chain
     */
    set : function(doPropagate) {
      // propagates state change in case some repeat ancestors are unset
      // at that moment
      if (doPropagate) {
        if (!this._params['noedit']) {
          xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle(true));
        }
        xtdom.removeClassName(this._handle, 'axel-repeat-unset'); // fix if *this* model is "placed" and the handle is outside the DOM at the moment
      }
      if (this._isOptionSet) // Safety guard (defensive)
        return;
      this._isOptionSet = true;
      if (this._isOptional) {
        xtdom.removeClassName(this._handle, 'axel-option-unset');
        xtdom.addClassName(this._handle, 'axel-option-set');
        this._optCheckBox.checked = true;                          
      }            
    },
  
    /**
     * Sets the editor option status to "unset" (i.e. false) if it is
     * optional.
     * 
     * @param {doPropagate}
     *            a boolean indicating wether to propagate state change in
     *            the repeater chain, UNSUPPORTED at that time
     */
    unset : function (doPropagate) {
      if (!this._isOptionSet) // Safety guard (defensive)
        return;
      this._isOptionSet = false;
      if (this._isOptional) {
        xtdom.removeClassName(this._handle, 'axel-option-set');
        xtdom.addClassName(this._handle, 'axel-option-unset');
        this._optCheckBox.checked = false;                    
      }
    },
  
    /**
     * Awakes the editor to DOM's events, registering the callbacks for them.
     * 
     * TODO stores the callback to be able to remove them at will
     */
    awake : function () {
      var _this = this;
      if (!this._params['noedit']) {
        xtdom.addClassName(this._handle, 'axel-core-editable');
        xtdom.addEventListener(this._handle, 'click', function(ev) {
          _this.startEditing(ev);
        }, true);
      } 
      if (this.isOptional()) {
        xtdom.addEventListener(this._optCheckBox, 'click', function(ev) {
          _this.onToggleOpt(ev);
        }, true);
      }
    },
  
    /**
     * Starts an edition process on *this* instance's device.
     * 
     * @param {DOMEvent}
     *            aEvent The event triggering the start of an edition
     *            process
     */
    startEditing : function (aEvent) {
      var _doSelect = aEvent ? (!this._isModified || aEvent.shiftKey) : false;
      this._device.startEditing(this, aEvent, _doSelect);
    },
  
    /**
     * Stops the edition process on the device
     */
    stopEditing : function () {
      this._device.stopEditing(false, false);
    },

    /**
     * Handler for the option checkbox, toggles the selection state.
     */
    onToggleOpt : function (ev) {
      this._isOptionSet ? this.unset(true) : this.set(true);
    }
  }; /* END of _TextModel class */

  /* Base string for key */
  var _BASE_KEY = 'text';

  /* a counter used to generate unique keys */
  var _keyCounter = 0;

  return {

    /**
     * <p>
     * Creates a DOM model for the text editor. This DOM model represents
     * the default content for the text editor. If a default content is
     * specified in the template, the content is updated later, in the
     * init() function.
     * </p>
     * 
     * @param {HTMLElement}
     *            aContainer the HTML node where to implant the editor
     * @param {XTNode}
     *            aXTUse the XTiger use node that caused this editor to be
     *            implanted here
     * @param {HTMLDocument}
     *            aDocument the current HTML document (in the DOM
     *            understanding of a "document") being processed
     * @return {HTMLElement} The created HTML element
     */
    createModel : function createModel (aContainer, aXTUse, aDocument) {
      var _handletag = aXTUse.getAttribute('handle');
      _handletag = _handletag ? _handletag : 'span';
      var _handle = xtdom.createElement(aDocument, _handletag);
      var _content = xtdom.createTextNode(aDocument, '');
      _handle.appendChild(_content);
      xtdom.addClassName(_handle, 'axel-core-on');
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

    /**
     * <p>
     * Creates the editor's from an XTiger &lt;xt:use&gt; element. This
     * method is responsible to extract the default content as well as the
     * optional parameters from the &lt;xt:use&gt; element. See the method
     * implementation for the supported default content formats.
     * </p>
     * 
     * @param {HTMLElement}
     *            aHandleNode The HTML node used as handle by the created
     *            editor
     * @param {XMLElement}
     *            aXTUse element The &lt;xt:use&gt; element that yields the
     *            new editor
     * @param {DOM
     *            document} aDocument A reference to the containing DOM
     *            document
     * @return {_TetModel} A new instance of the _TextModel class
     */
    createEditorFromTree : function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
      var _data = xtdom.extractDefaultContentXT(aXTUse);
      if (_data && (_data.search(/\S/) == -1)) { // empty string
        _data = null;
      }
      var _model = new _TextModel(aHandleNode, aDocument);
      var _param = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _param);
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
      _model.init(_data, aXTUse.getAttribute('param'), 
        aXTUse.getAttribute('option'), this.createUniqueKey());
      return _model;
    },

    /**
     * <p>
     * Creates an editor from a seed. The seed must carry the default data
     * content as well as the parameters (as a string) information. Those
     * infos are used to init the new editor.
     * </p>
     * 
     * @param {Seed}
     *            aSeed The seed from which the new editor is built
     * @param {HTMLElement}
     *            aClone The cloned handle where to implant the editor
     * @param {DOM
     *            Document} aDocument the document containing the editor
     * @return {_TextModel} The new instance of the _VideoModel class
     * 
     * @see _TextModel#makeSeed()
     */
    createEditorFromSeed : function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _model = new _TextModel(aClone, aDocument);
      var _defaultData = aSeed[1];
      var _params = aSeed[2];
      var _option = aSeed[3];
      if (_params['filter'])
        _model = this.applyFilters(_model, _params['filter']);
      _model.init(_defaultData, _params, _option, this.createUniqueKey(), aRepeater);
      return _model;
    },
  
    /**
     * Create a unique string. Each call to this method returns a different
     * one.
     * 
     * @return {string} A unique key
     */
    createUniqueKey : function createUniqueKey () {
      return _BASE_KEY + (_keyCounter++);
    }
  }
})();

xtiger.editor.Plugin.prototype.pluginEditors['text']
  = xtiger.util.filterable('text', xtiger.editor.TextFactory);
