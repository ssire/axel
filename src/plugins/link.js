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
 * Author(s) : Antoine Yersin, Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */        
 
 ///////////////////////////////////////////////
 // First Part: Link Editor Factory and Model //
 ///////////////////////////////////////////////

/**
 * The LinkFactory object (singleton) acts as a factory for the link editor. 
 * It is responsible to create both the DOM model, the model class 
 * and the editing device(s). The link editor is used to edit in-line links.
 * 
 * @class LinkFactory
 */
xtiger.editor.LinkFactory = (function LinkFactory () {
  /*
   * Devices' factories
   */
  // var _deviceFactories = {};

  /**
   * <p>LinkModel class (shadow class)</p>
   * 
   * <p>This class implements the data model for the link editor. It supports operation for data loading
   *and serializing, event handling to switch to the actual editing process (handled in the LinkEditor
   *object).</p>
   *
   * <p>This class is only instanciable through the dedicated factory.</p>
   * 
   * @class _LinkModel
   * @name _LinkModel
   * @constructor
   * 
   * @param {HTMLElement} aHandleNode The editor's handle (usually an &lt;a&gt; element)
   * @param {DOM Document} aDocument The document that contains <code>this</code> editor
   */
  var _LinkModel = function (aHandleNode, aDocument) {

    /*
     * Default parameters for the link editor. Parameters meaning and possible values are documented below.
     */
    var _DEFAULT_PARAMS = {
        defaultText: 'enter link\'s text here', /* {string} default text */
        defaultUrl: 'http://',
        defaultDevice: 'lens', /* {string} name of the device to use */
        wrapper: 'togglewrapper', /* {string} name of the field wrapper to use */
        linkRefTagName: "linkRef", /* {string} The label used by the load/save method for the url info */
        linkTextTagName: "linkText", /* {string} The label used by the load/save method for the text info */
        trigger: "click",
        padding: '10'
    };

    /**
     * The HTML node used as handle by the editor. Usually it is
     *a <span> element. The handle is created by the editor's factory
     *prior to the instancation of *this* object
     */
    this._handle = aHandleNode;
    
    /**
     * The data handled by *this* model
     */
    this._data = {
        text: _DEFAULT_PARAMS['defautText'],
        url: _DEFAULT_PARAMS['defautUrl']
    }
    
    /**
     * The default data as specified in the xt:use node
     */
    this._defaultData = this._data;
    
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
     * The device object used to edit this model. It is sets in init() function
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
  
  /** @memberOf _LinkModel */
  _LinkModel.prototype = {

      /**
       * 
       */
      _setData : function (aText, aUrl) {
        this._data = {text: aText, url: aUrl};
        this._handle.firstChild.data = aText; /* sets the handle's text */
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
       * Initialization function, called by the model's factory after object's instanciation.
       *Cares to sets the default content, to parse and sets the various parameters and to call the
       *awake() method.
       *
       * @param {object} aDefaultData The default data (url and text) given in the form of an hash
       * @param {string | object} aParams Either the parameter string from the <xt:use> node or the parsed
       *parameters object from the seed
       * @param {string} aOption If the parameter is not null, the editor is optional. If its value equals "set", the
       *editor is set by default
       */
      init: function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
        if (aParams) { /* parse parameters */
          if (typeof(aParams) == 'string')
            xtiger.util.decodeParameters(aParams, this._params);
          else if (typeof(aParams) == 'object')
            this._params = aParams;
        }
        if (aDefaultData && aDefaultData.text && aDefaultData.url) { /* sets up initial content */
          this._setData(aDefaultData.text, aDefaultData.url);
          this._defaultData = aDefaultData;
        }
        if (aOption) { /* the editor is optional */
          this._isOptional = true;
          this._optCheckBox = this._handle.nextSibling;
          (aOption == 'set') ? this.set() : this.unset();
        }
        this._uniqueKey = aUniqueKey;
        var _deviceFactory = this._params['device'] ? 
            xtiger.factory(this._params['device']) :
            xtiger.factory(this._params['defaultDevice']);
        this._device = _deviceFactory.getInstance(this._document);
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
          this._seed = [ xtiger.editor.LinkFactory, this._defaultData,
            this._params, this._isOptional ];
        return this._seed;
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

      /* XML data "getter/setters" */
      
      /**
       * Loading function for setting the data stored in this model from an XML
       *data source.
       *
       * @param {Point} aPoint A point in the data source
       * @param {DOMDataSource} aDataSrc The data source to load into the editors
       */
      load: function (aPoint, aDataSrc) {
        var _url, _text;
        try {
          _url = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkRef', aPoint));
          _text = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkText', aPoint));
        }
        catch (_err) {
          tiger.cross.log('warning', 'Unable to load the link editor with the following content :\n text=' + _text + ', url=' + _url);
        }
        if (this.isOptional()) {
          if (_url || _text)
            this.set();
          else
            this.unset();
        }
        // If the point didn't hold url or text values, use the default ones
        if (!_url)
          _url = this._defaultData.url;
        if (!_text)
          _text = this._defaultData.text;
        this._setData(_text, _url);
      },

      /**
       * <p>Serialization function for saving the edited data to a logger. It is assumed that
       *the XML node representing the label is produced by the caller function.</p>
       *
       * <p>The default behavior is to produced expanded nodes to represent the link. If the
       *default parameters are kept untouched, the produced XML looks like :</p>
       *  
       *  &lt;linkRef&gt;"the url of the link"&lt;/linkRef&gt; <br/>
       *  &lt;linkText&gt;"the text of the link"&lt;/linkText&gt;
       * 
       * <p>A different behavior can be obtained by superseding this method by the means of a filter. Note that
       *would most probably mean the redefinition of the load() method as well.</p>
       * 
       * @param {Logger} aLogger A logger object supporting the write() method
       * @see #load()
       */
      save: function (aLogger) {
        if (this.isOptional() && !this._isOptionSet) {
          aLogger.discardNodeIfEmpty();
          return;
        }
        var _data = this.getData();
        aLogger.openTag(this._params['linkRefTagName']);
        aLogger.write(_data.url);
        aLogger.closeTag(this._params['linkRefTagName']);
        aLogger.openTag(this._params['linkTextTagName']);
        aLogger.write(_data.text);
        aLogger.closeTag(this._params['linkTextTagName']);
      },

      /* Editing facilities */
      
      /**
       * Updates the model with the given data.
       * 
       * @param {Object} aData The new data to set
       */
      update: function (aData) {
        if (aData.text == this._data.text && aData.url == this._data.url)
          return; // Do nothing if nothing was changed
        
        if (!aData || (aData.text == null && aData.url == null)) {
          this.clear(true);
          return;
        }
        
        this._setData(aData.text, aData.url);
        this._isModified = true;

        // Autoset
        this.set(true); 
      },
      
      /**
       * Resets the editor into its default state.
       */
      clear: function (doPropagate) {
        this._setData(this._defaultData.text, this._defaultData.url);
        this._isModified = false;
        if (this.isOptional() && this.isSet())
          this.unset(doPropagate);
      },
      
      /**
       * Gets the data from the handle, that is, from the HTML element(s) that stores it.
       * 
       * @return {Object} A Hash containing two fields, "url" and "data".
       */
      getData: function () {
        return this._data;
      },
      
      /**
       * 
       * @return
       */
      getDefaultData: function () {
        return this._defaultData;
      },
      
      /*
       * Other function
       */
      
      /**
       * Returns the model's handle. Usually this is a span element
       * 
       * @return {HTMLElement} The model's handle
       */
      getHandle: function () {
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
       * Returns the parameters associated with the given key
       * 
       * @param {string} aKey The name of the parameter
       * @return {any} The parameter's value 
       */
      getParam: function (aKey) {
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
        this._idModified = isModified;
      },
      
      /*
       * OPTIONAL EDITOR MANAGEMENT
       */
      
      /**
       * Returns true if the editor is optional.
       * 
       * @return {boolean}
       */
      isOptional: function () {
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
       * Sets the optional state to "set".
       * 
       * @param {boolean}
       *            doPropagate If true, iters on parent repeat to set
       *            them.
       */
      set: function (doPropagate) {
        if (doPropagate) {
          xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle(true));
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
       * Sets the optional state to "unset".
       */
      unset: function () {
        if (!this._isOptional) // Safety guard (defensive)
          return;
        xtdom.removeClassName(this._handle, 'axel-option-set');
        xtdom.addClassName(this._handle, 'axel-option-unset');
        this._isOptionSet = false;
        this._optCheckBox.checked = false;
      },
      
      /*
       * FOCUS MANAGEMENT (for tab navigation)
       */
      
      /**
       * Returns true if the model's editor is able to be put into a chain of
       * focus. Chains of focus are a list of editor that can be accessed by
       * iterating with the "tab" key (this feature is better known as the
       * "tab-navigation" feature).
       * 
       * @return {boolean} True if the model should be put into a chain of
       *         focus, false otherwise.
       */
      isFocusable: function () {
        return true;
      },
      
      /**
       * Gives the focus to *this* instance. Called by the tab navigation
       * manager.
       */
      focus: function () {
        this.startEditing(null);
      },
      
      /**
       * Takes the focus away from *this* instance. Called by the tab
       * navigation manager.
       */
      unfocus: function () {
        this.stopEditing();
      },

      /* Events management */
      /**
       * Registers event handlers for the handle node
       */
      awake: function () {
        var _this = this; // closure
        if (this.isOptional()) {
          xtdom.addEventListener (this._optCheckBox, 'click', function (ev) {_this.onToggleOpt(ev);}, true);
        }
        xtdom.addEventListener (this._handle, this._params['trigger'], function (ev) {_this.startEditing(ev);}, true);
      },
      
      /**
       * Event handler to manage a user's click on the edit button. Starts an edit action. If
       * the editor is optional and unset, do nothing.
       * 
       * @param {Event} aEvent A DOM event.
       */
      startEditing: function (aEvent) {
        var _doSelect = aEvent ? (!this._isModified || aEvent.shiftKey) : false;
        this._device.startEditing(this, 'linkLensWrapper', _doSelect);
        if (aEvent) {
          xtdom.stopPropagation(aEvent);// otherwise stopEditing gets called on IE
        }
      },
      
      /**
       * Stops the edition process on the device
       */
      stopEditing : function () {
        this._device.stopEditing();
      },
      
      /**
       * Handler for the option checkbox, toggles the selection state.
       */
      onToggleOpt: function (ev) {
        this._isOptionSet ? this.unset() : this.set();
      }
  }; /* end of _LinkModel class */

  /* Base string for key */
  var _BASE_KEY = 'link';

  /* a counter used to generate unique keys */
  var _keyCounter = 0;
  
  return { /* Public members for the LinkModelFactory object */
    
    /**
     * Creates a model instance for the link editor. By default the model is a &lt;span&gt;
     *HTML element displaying the link's anchor.
     * 
     * @param {HTMLElement} aContainer the HTML node where to implant the editor
     * @param {XTNode} aXTUse the XTiger use node that caused this editor to be implanted here
     * @param {HTMLDocument} aDocument the current HTML document (in the DOM understanding of a "document") being processed
     * @return {HTMLElement}  The created HTML element
     */
    createModel: function createModel (aContainer, aXTUse, aDocument)
    {
      var _h = xtdom.createElement(aDocument, 'span'); /* Creates the handle */
      xtdom.addClassName (_h , 'axel-core-on');
      xtdom.addClassName (_h, 'axel-core-editable');
      xtdom.addClassName (_h, 'axel-link-handle');
      _h.appendChild(xtdom.createTextNode(aDocument, ''));
      aContainer.appendChild(_h);
      var _optional = aXTUse.getAttribute('option');
      if (_optional) {
        var _checkbox = xtdom.createElement (aDocument, 'input');
        xtdom.setAttribute(_checkbox, 'type', 'checkbox');             
        xtdom.addClassName(_checkbox, 'axel-option-checkbox');             
        aContainer.appendChild(_checkbox);          
      }
      return _h;
    },
    
    /**
     * <p>Creates the editor's from an XTiger &lt;xt:use&gt; element. This method
     *is responsible to extract the default content as well as the optional parameters
     *from the &lt;xt:use&gt; element. See the method implementation for the supported
     *default content formats.</p>
     *
     *@param {HTMLElement} aHandleNode The HTML node used as handle by the created editor
     *@param {XMLElement} aXTUse element The &lt;xt:use&gt; element that yields the new editor
     *@param {DOM document} aDocument A reference to the containing DOM document
     *@return {_LinkModel} A new instance of the LinkModel class
     */
    createEditorFromTree: function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
      var _model = new _LinkModel(aHandleNode, aDocument);
      var _defaultData;
      var _aXTContent = aXTUse.childNodes; // FIXME awful parsing function. does not care about irrelevant text nodes.
      switch(_aXTContent.length) {
      case 2: /* <linkText>blah blah</linkText><linkRef>http://...</linkRef> */
        if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE
            && _aXTContent[1].nodeType == xtdom.ELEMENT_NODE
            && _aXTContent[0].nodeName == 'linkText'
            && _aXTContent[1].nodeName == 'linkRef')
          _defaultData = {
            text: _aXTContent.childNodes[0].nodeValue,
            url: _aXTContent.childNodes[1].nodeValue 
          };
        break;
      case 1:
        if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE && (/^a$/i).test(_aXTContent[0].nodeName)) {
          _defaultData = {
              text: _aXTContent[0].firstChild.nodeValue,
              url: _aXTContent[0].getAttribute('href')
          };
        } else if (_aXTContent[0].nodeType == xtdom.TEXT_NODE) {
          _defaultData = {
              text: _aXTContent[0].nodeValue,
              url: 'http://'
          };
        }
        break;
      default:
        _defaultData = {
          text: 'link',
          url: 'http://'
        }
      }
      var _params = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _params);
      if (_params['filter'])
        _model = this.applyFilters(_model, _params['filter']);
      _model.init(_defaultData, aXTUse.getAttribute('param'), aXTUse.getAttribute('option'), this.createUniqueKey());
      return _model;
    },
    
    /**
     * <p>Creates an editor from a seed. The seed must carry the default data content as well
     *as the parameters (as a string) information. Those infos are used to init the new editor.</p>
     * 
     * @param {Seed} aSeed The seed from which the new editor is built
     * @param {HTMLElement} aClone The cloned handle where to implant the editor
     * @param {DOM Document} aDocument the document containing the editor
     * @return {_LinkModel} The new instance of the _linkModel class
     * 
     * @see _linkModel#makeSeed()
     */
    createEditorFromSeed: function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _model = new _LinkModel(aClone, aDocument);
      var _defaultData = aSeed[1];
      var _param = aSeed[2];
      var _option = aSeed[3];
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
      _model.init(_defaultData, _param, _option, this.createUniqueKey(), aRepeater);
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
  };
})();

xtiger.editor.Plugin.prototype.pluginEditors['link'] 
  = xtiger.util.filterable('link', xtiger.editor.LinkFactory);

//////////////////////////////////////////////////
// Second Part: Len Wrapper for the Link Editor //
//////////////////////////////////////////////////

/**
 * Lens wrapper for the edition of links. Contains two editable fields and a "go" button that
 *follows the link.
 *
 * @class _LinkLensWrapper
 */
var _LinkLensWrapper = function (aDocument) {
  /* The wrapped HTML device */
  this._handle;
  
  /* The handle to restore when releasing */
  this._handleToRestore;
  
  /* the document containing the wrapper */
  this._document = aDocument;
  
  /* true if the focus is in one of the fields */
  this._isFocused = false;
  
  this._build();
};    

_LinkLensWrapper.prototype = {
    
    /**
     * Initializes the wrapper. Creates the HTML elements and sets their style.
     */
    _build: function () {
      this._topDiv = xtdom.createElement(this._document, 'div');
      xtdom.addClassName(this._topDiv, 'axel-lens-container');
      xtdom.addClassName(this._topDiv, 'axel-lens-containerstyle');
      this._topDiv.style.display = 'block';
      this._upperP = xtdom.createElement(this._document, 'p');
      with (this._upperP) {
        style['margin'] = '0 0 15px 0';
        style['padding'] = '0px';
        style['width'] = '100%';
      }
      this._anchorInput = xtdom.createElement(this._document, 'input');
      with (this._anchorInput) {
        type = 'text';
      }
      xtdom.addClassName(this._anchorInput, 'axel-link-handle'); // use same class than the model's handle
      this._upperP.appendChild(this._anchorInput);
      this._topDiv.appendChild(this._upperP);
      this._lowerP = xtdom.createElement(this._document, 'p');
      with (this._lowerP) {
        style['margin'] = '0px';
        style['padding'] = '0px';
        style['width'] = '100%';
      }
      this._urlInput = xtdom.createElement(this._document, 'input');
      with (this._urlInput) {
        style['width'] = '75%';
      }
      this._goButtonLink = xtdom.createElement(this._document, 'a');
      with (this._goButtonLink) {
        href = ''; // is set when grabing
        target = '_blank';
        style['margin'] = '0 10px';
        style['width'] = '25%';
      }
      this._goButton = xtdom.createElement(this._document, 'img');
      with (this._goButton) {
        src = xtiger.bundles.link.gotoURL;
        style.height = '20px';
        style.width = '30px';
        style.display = 'inline';
        style['verticalAlign'] = 'bottom';
      }
      this._goButtonLink.appendChild(this._goButton);
      this._lowerP.appendChild(this._urlInput);
      this._lowerP.appendChild(this._goButtonLink);
      this._topDiv.appendChild(this._lowerP);   
    }, 
    
    /**
     * Sets the input fields value. If the given argument is null, the field
     *is kept in its current state. Use reset() to clear the fields.
     *
     * @param {string} aText The text used by the anchor
     * @param {string} aUrl The url of the link
     * 
     * @see #reset
     */
    _setData: function (aText, aUrl) {
      if (aText && typeof(aText) == 'string')
        this._anchorInput.value = aText;
      if (aUrl && typeof(aUrl) == 'string') {
        this._urlInput.value = aUrl;
        this._goButtonLink.href = aUrl;
      }
    },     
    
    /**
     * Returns the wrapped device.
     * 
     * @return {HTMLElement} The wrapped device
     */
    getHandle: function () {
      return this._topDiv;
    },        
    
    /**
     * Grabs the wrapper with the given device.
     * 
     * @param {Device} aDevice The device grabbing the wrapper
     * @param {boolean} aDoSelect Selects the first input field
     */
    grab: function (aDevice, aDoSelect, aPadding) {
      this._currentDevice = aDevice;
      var _data = this._currentDevice.getCurrentModel().getData();
      this._setData(_data.text, _data.url);
      var _handle = this._currentDevice.getCurrentModel().getHandle();      
      this._topDiv.style.padding = aPadding[0] + 'px ' + aPadding[1] + 'px';
      var _this = this;
      xtdom.addEventListener(this._anchorInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
      xtdom.addEventListener(this._urlInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
      xtdom.addEventListener(this._anchorInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
      xtdom.addEventListener(this._urlInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
      // adds principal input field margins and border to the padding     
      // FIXME: does not work - instead we use 4 which is empirical
      // var mtop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'margin-top');
      // var btop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'border-width-top');
      return [aPadding[0], aPadding[1] + 4];   
    },      
              
    // Terminates the wrapper installation after the lens has been made visible
    activate: function(aDevice, doSelectAll) {
      if (doSelectAll) {
        xtdom.focusAndSelect(this._anchorInput);
      } else { // simply focus
        this._anchorInput.focus();
      }
    },
    
    /**
     * Releases the wrapper, restores the handle
     */
    release: function () {
      this._isFocused = false;
      xtdom.removeElement(this._topDiv);
      this._currentDevice = null;
    },
    
    /**
     * Toggle the focus between the fields
     */
    toggleField: function () {                 
      if (this._isFocused) {
        if (this._focusedField == this._anchorInput) {
          this._anchorInput.blur();
          xtdom.focusAndMoveCaretTo(this._urlInput, this._urlInput.value.length);
        } else {
          this._urlInput.blur();
          xtdom.focusAndMoveCaretTo(this._anchorInput, this._anchorInput.value.length);
        }
      }
    },
    
    /**
     * Returns the data currently hold by the wrapper.
     * 
     * @return {Object} The data fields as an hash object
     */
    getData: function () {
      return {
        url: this._urlInput.value,
        text: this._anchorInput.value
      }
    },
    
    isFocusable: function () {
      return true;
    },
    
    /**
     * Handler for the bluring of input fields. Saves their state and updates
     *the link button's url accordingly.
     *
     * @param {Event} ev The event that triggers this handler
     */
    onBlur: function (ev) {
      var _target = xtdom.getEventTarget(ev);
      if (_target == this._urlInput)
        this._goButtonLink.href = this._urlInput.value;
      this._isFocused = false;
      this._focusedField = null;
      this._currentDevice.keepAlive(false);  
    },
    
    /**
     * Handler for the focusing in an input field. Toggles the wrapper's state such as it
     *does not disappear when the mouse leave it.
     *
     * @param {Event} ev The event that triggers this handler
     */
    onFocus: function (ev) {
      this._isFocused = true;
      this._currentDevice.keepAlive(true);
      this._focusedField = xtdom.getEventTarget(ev);
    }
}; // End of wrapper class

xtiger.resources.addBundle('link', 
    { 'gotoURL' : 'goto.png' } );

xtiger.factory('lens').registerWrapper('linkLensWrapper', function (aDocument) {return new _LinkLensWrapper(aDocument)});
