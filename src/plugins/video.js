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
 * Author(s) : Antoine Yersin, Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Class VideoFactory (static)
 * 
 * @class VideoFactory
 * @version beta
 */
xtiger.editor.VideoFactory = (function VideoFactory () {
  
  /**
   * @name _VideoModel
   * @class _VideoModel
   */
  var _VideoModel = function (aHandleNode, aDocument) {
    
    /*
     * Default parameters for the video editor. Parameters meaning and possible values are documented below.
     */
    var _DEFAULT_PARAMS = {
        defaultDevice: 'lens', /* {string} name of the device to use */
        trigger: "mouseover", /* {string} */
        lang: 'fr_FR', /* {string} lang's code for player's GUI (must respect the video's provider's standards) */
        inputFieldMessage: 'Paste the video\'s link here', /* {string} the text appearing in the input field if no valid data is hold by the model */
        width: 425, /* {integer} width of the flash video player */
        height: 344 /* {integer} height of the flash video player */
      
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
     * The device object used to edit this model. It is sets in init() function
     */
    this._device = null;
    
    /**
     * A stored seed for this model
     */
    this._seed = null;
    
    /**
     * if true, the model must contains valid data
     */
    this._isModified = false;
    
    /**
     * A unique string that identifies *this* instance
     */
    this._uniqueKey;

    /* Call the create method for delegation purposes */
    this.create();
    
  };
  /** @memberOf _VideoModel */
  _VideoModel.prototype = {
  
    /*
     * <p>
     * Tests if the input is a valid URL (no trailing nor leading spaces allowed)
     * </p>
     * 
     * @param {String|HTMLElement}
     *            aInput The input to validate
     * @return {boolean}
     * @private
     */
    _isValidUrl: function (aInput) {
      var _URL_R = /^(http\:\/\/|~\/|\/)?(\w+:\w+@)?(([-\w\d{1-3}]+\.)+(com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2})?)(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,=]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:[\?&](?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)?(?:&)?$/;
      return _URL_R.test(aInput);
    },
    
    /*
     * Removes leading and trailing spaces
     */
    _removeLTSpaces: function (aInput) {
      if (!aInput || aInput == '')
        return '';
      return aInput.replace(/^\s+|\s+$/g, '');
    },
    
    /*
     * Builds a valid YouTube's snippet (as HTML element) from a video ID
     */
    _buildYoutubeSnippet: function (aVideoID, aSize, aParams) {
      var _params = aParams ? aParams : {};
      _params['movie'] = aVideoID;
      if (!_params['allowFullScreen'])
        _params['allowFullScreen'] = 'true';
      if (!_params['alloscriptaccess'])
        _params['alloscriptaccess'] = 'always';
      var _obj = xtdom.createElement(this._document, 'object');
      if (aSize) {
        _obj.height = aSize[0];
        _obj.width = aSize[1];
      } else {
        _obj.height = this.getParam('height');
        _obj.width = this.getParam('width');
      }
      _obj.style.zIndex = 1000;
      for (var _param in _params) {
        var _p = xtdom.createElement(this._document, 'param');
        _p.name = _param;
        _p.value = _params[_param];
        _obj.appendChild(_p);
      }
      var _embed = xtdom.createElement(this._document, 'embed');
      xtdom.setAttribute(_embed, 'src', aVideoID);
      xtdom.setAttribute(_embed, 'type', 'application/x-shockwave-flash');
      xtdom.setAttribute(_embed, 'allowfullscreen', 'true');
      xtdom.setAttribute(_embed, 'allowscriptaccess', 'always');
      xtdom.setAttribute(_embed, 'width', this.getParam('width'));
      xtdom.setAttribute(_embed, 'height', this.getParam('height'));
      _embed.style.zIndex = 1000;
      if (xtiger.cross.UA.IE) {
        _obj = _embed;  
      } else {
        _obj.appendChild(_embed);
      }
      return _obj;
    },
    
    /*
     * Extracts the youtube's video id from a valid link to the video (either
     * the "permalink" or the page's link)
     */
    _extractVideoId: function (aValidUrl) {
      var _tmp = aValidUrl.match(/^[^&]*/)[0];
      return _tmp.match(/[^\=\/]*$/)[0];
    },
    
    /*
     * Returns true of the given input is a code snippet
     */
    _isCodeSnippet: function (aInput) {
      var _SNIPPET_O_R = /(<object>).*(<param[^>]*(name\="movie"))/;
      var _SNIPPET_E_R = /(<embed\s)([^>]+)(\ssrc\=")([^"]+)"/;
      return _SNIPPET_O_R.test(aInput) || _SNIPPET_E_R.test(aInput);
    },
    
    /**     
     * Changes the handler content to show a video player if aData 
     * is a valid YouTube URL and as a side effects calls this.setModified(true).
     * Returns true if it succeeded, false otherwise (in that case it didn't change
     * the handler content).
     * 
     * @param aData
     */
    _setData: function (aData) {
      var _tdata = this._removeLTSpaces(aData);
      
      if (!this._isValidUrl(_tdata)) {
        if (this._isCodeSnippet(_tdata))
          _tdata = this._extractUrlFromSnippet(_tdata);
        else
          return false;
      }
      
      var _type = 'youtube'; //_extractType(aData);
      switch (_type) {
      case 'youtube':
        var _videoID = this._extractVideoId(_tdata);
        var _newdata = 'http://www.youtube.com/v/' + _videoID;
        if (this._data == _newdata)
          return false; // No update
        
        this._data = _newdata; // Updates the model
        
        _newdata += '&hl=' + this._params['lang'] + '&fs=1&';
        var _newContent = this._buildYoutubeSnippet(this._data, null, null);
        try {
          // Sets the correct handle's width and height by using a temp container
          var _tmp = xtdom.createElement(this._document, 'div');
          _tmp.style.visibility = 'hidden';
          this._document.getElementsByTagName('body')[0].appendChild(_tmp);
          _tmp.appendChild(_newContent);
              with (this._handle.style) {
                width = this.getParam('width') + 'px'; //_newContent.offsetWidth + 'px'; // Defeat bug with the size of an <object>
                height = this.getParam('height') + 'px'; //_newContent.offsetHeight + 'px'; // TODO fix once a dynamic computation of size
              }
              
              // Appends the new content in the handle
              this._handle.replaceChild(_newContent, this._handle.firstChild);
              this.setModified(true);
              
              // Remove the temp container
              xtdom.removeElement(_tmp);
            }
        catch (err) {
          xtiger.cross.log('warning', err);
          return false;
        }
        break;
      default :
        xtiger.cross.log('warning', 'Video type ' + type + ' is currently unsupported');
        return false;
      }
      return true; // success
    },

    /**
     * This method is called at the instance's creation time. It may serves
     * as a "hook" to add a custom behavior by the means of the delegation
     * pattern.
     */
    create : function () {
      // nop
    },
    
    /**
     * <p>
     * Initialization function, called by the model's factory after object's
     * instanciation. Cares to sets the default content, to parse and sets
     * the various parameters and to call the awake() method.
     * </p>
     * 
     * @param {string}
     *            aDefaultData The default data as specified in the
     *            template. May be either the "permalink" or the HTML code
     *            (as string) of the YouTube's code snippet. That would lead
     *            to a "pre-loaded" editor. If the given string is not one
     *            of those reference to a video, the text is used as a
     *            message displayed in the lens' input field.
     * @param {string|object}
     *            aParams Either the parameter string from the <xt:use> node
     *            or the parsed parameters object from the seed
     * @param {string}
     *            aOption If the parameter is not null, the editor is
     *            optional. If its value equals "set", the editor is set by
     *            default
     * @param {string}
     *            aUniqueKey A unique string (no two editor have the same) to 
     *            provide an unambiguous identifier even among repeated editor 
     */
    init: function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      if (aParams) { /* parse parameters */
        if (typeof(aParams) == 'string')
          xtiger.util.decodeParameters(aParams, this._params);
        else if (typeof(aParams) == 'object')
          this._params = aParams;
      }
      if (aDefaultData) { /* sets up initial content */
        if (this._isValidUrl(aDefaultData) || this._isCodeSnippet(aDefaultData)) {
          this._setData(aDefaultData);
          this._defaultData = this._data;
        }
        else // short-hand for setting that parameter
          this._params['inputFieldMessage'] = aDefaultData;
      }
      if (aOption) { /* the editor is optional */
        this._isOptional = true;
        this._optCheckBox = this._handle.previousSibling;
        (aOption == 'set') ? this.set(false) : this.unset(false);
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
        this._seed = [ xtiger.editor.VideoFactory, this._defaultData,
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
    
    /**
     * <p>
     * Loads the editor with the data passed in parameters.
     * </p>
     * 
     * @param {Array} aPoint
     * @param aDataSrc
     */
    load: function (aPoint, aDataSrc) {
      if (aPoint !== -1) {
        var _value = aDataSrc.getDataFor(aPoint); 
        this._setData(_value) || this.clear();
        this.set(false);        
      } else {
        this.clear()
        this.unset(false);
      }
    },
    
    /**
     * Writes the editor's current data into the given logger.
     * 
     * @param aLogger
     */
    save: function (aLogger) {
      if (this.isOptional() && !this._isOptionSet) { // Unset node => discard
        aLogger.discardNodeIfEmpty();
        return;
      }
      if (!this._data) // Empty node => no content (will be an empty XML tag)
        return;
      aLogger.write(this._data);
    },
    
    /**
     * Updates this editor with the given data. The data must provide the url
     * to the video, either by giving it directly, or by giving the whole snippet.
     * 
     * @param {string}
     *            aData May be either the "permalink" or the code's snippet
     *            from YouTube (as string) (UNSUPPORTED YET)
     */
    update: function (aData) { 
      var _success = false;     
      if (aData && (typeof(aData) == 'string') && (aData.search(/\S/) != -1)) {
        _success = (aData == this._data) || this._setData(aData);
        // the first term in case user had unselected optional video
        // and tries to select it again by validating it's URL again
      }
      if (_success) { // auto-selection of editor if necessary
        this.set(true);
      }
    },
    
    /**
     * Clears the editor, reseting it to a state where it does not contains any video. 
     * Does not change the selection state.
     */
    clear: function () {
      this._data = ''; // FIXME: this will serialize an empty string as XML content ?
      this.setModified(false);      
      this._handle.replaceChild(this._noData, this._handle.firstChild);
      var _width = this._noData.offsetWidth;
      var _height = this._noData.offsetHeight;
      with (this._handle.style) {
        width = (_width > 2 ? _width: 80) + 'px'; // defeat bug if called in a display:none context
        height = (_height > 2 ? _height: 80) + 'px';
      }
    },
    
    /**
     * <p>
     * Returns the editor's current data
     * </p>
     * 
     * @return {String} The editor's current data
     */
    getData: function () {
      if (this._data && this._data != '')
        return this._data;
      return null;
    },
    
    /**
     * 
     * @return
     */
    getDefaultData: function () {
      return this._defaultData;
    },
    
    /**
     * <p>
     * Returns the editor's current handle, that is, the HTML element where
     * the editor is "planted".
     * </p>
     * 
     * @return {HTMLElement} The editor's handle
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
     * 
     */
    getParam: function (aKey) {
      return this._params[aKey];
    },
    
    /**
     * 
     * @return
     */
    getUniqueKey: function () {
      return this._uniqueKey;
    },
    
    /**
     * Returns true if the model contains valid data
     */
    isModified: function () {
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
     * 
     */
    isFocusable: function () {
      return true;
    },
    
    /**
     * 
     */
    focus: function () {
      this.startEditing(null);
    },
    
    /**
     * 
     */
    unfocus: function () {
      this._device.stopEditing();
    },
    
    /**
     * 
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
     *      
     * @param {doPropagate} True if the method should propagate the change 
     *            of state to enclosing repeater(s)
     */
    set: function (doPropagate) {
      if (doPropagate) { // side effect
        xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle());
      }             
      if (this._isOptional && ! this._isOptionSet) {      
        this._isOptionSet = true;
        xtdom.removeClassName(this._handle, 'axel-option-unset');
        xtdom.addClassName(this._handle, 'axel-option-set');
        this._optCheckBox.checked = true;
      }
    },
    
    /**
     * 
     * @param {doPropagate} True if the method should propagate the change 
     *            of state to any enclosing repeater (NOT USED AT THAT TIME)
     */
    unset: function (doPropagate) {
      if (this._isOptional && this._isOptionSet) {
        this._isOptionSet = false;
        xtdom.removeClassName(this._handle, 'axel-option-set');
        xtdom.addClassName(this._handle, 'axel-option-unset');
        this._optCheckBox.checked = false;
      }
    },
    
    /**
     * <p>
     * Awakes the editor to DOM's events
     * </p>
     */
    awake: function () {
      var _this = this; // closure
      if (this.isOptional()) {
        xtdom.addEventListener (this._optCheckBox, 'click', function (ev) {_this.onToggleOpt(ev);}, true);
      }
      xtdom.addEventListener (this._handle, 'mouseover', function (ev) {_this.startEditing(ev);}, true);
    },
    
    /**
     * Event handler to manage a user's click on the edit button. Starts an edit action. If
     *the editor is optional and unset, do nothing.
     * 
     * @param {Event} aEvent A DOM event.
     */
    startEditing: function (aEvent) {
      var _doSelect = aEvent ? (!this._isModified || aEvent.shiftKey) : false;
      this._device.startEditing(this, 'videoLensWrapper', _doSelect);
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
      this._isOptionSet ? this.unset(true) : this.set(true);
    }
    
  }; /* END of _VideoModel class */
  
  /* Base string for key */
  var _BASE_KEY = 'video';
  
  /* a counter used to generate unique keys */
  var _keyCounter = 0;
  
  return {
    
    /**
     * <p>
     * Creates a DOM model for the video editor. This DOM model represents
     * the default content for the video editor. If a default content is
     * specified in the template, the content is updated later, in the init()
     * function.
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
    createModel: function createModel (aContainer, aXTUse, aDocument) {
      var _h = xtdom.createElement(aDocument, 'div'); /* Creates the handle */
      xtdom.addClassName (_h , 'axel-core-on');
      xtdom.addClassName (_h, 'axel-core-editable');
      var _img = xtdom.createElement(aDocument, 'img');
      _img.src = xtiger.bundles.video.tvIconURL;
      
      var _optional = aXTUse.getAttribute('option');
      if (_optional) {
        var _checkbox = xtdom.createElement (aDocument, 'input');
        xtdom.setAttribute(_checkbox, 'type', 'checkbox');             
        xtdom.addClassName(_checkbox, 'axel-option-checkbox');             
        aContainer.appendChild(_checkbox);          
      }
      _h.appendChild(_img);
      
      // Sets handle width and height;
      var _tmp = xtdom.createElement(aDocument, 'div');
      _tmp.style.visibility = 'hidden';
      aDocument.getElementsByTagName('body')[0].appendChild(_tmp);
      _tmp.appendChild(_h);
      var _width, _height;
      _width = _img.offsetWidth;
      _height = _img.offsetHeight;
      _h.style.width = (_width > 2 ? _width : 80) + 'px'; // defeat bug when the template is transformed in a displayed: none context
      _h.style.height = (_height > 2 ? _height : 80) + 'px';
      
      // Appends the handle at the right place
      aContainer.appendChild(_h);
      xtdom.removeElement(_tmp);
      return _h;
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
     * @return {_VideoModel} A new instance of the _VideoModel class
     */
    createEditorFromTree: function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
      var _model = new _VideoModel(aHandleNode, aDocument);
      var _data, _cur;
      _cur = aXTUse.firstChild;
      while (_cur && !_data)
      {
        switch (_cur.nodeType) {
        case aDocument.TEXT_NODE :
          if ((/\w+/).test(_cur.nodeValue))
          {
            var _data = _cur.nodeValue;
          }
          break;
        case aDocument.ELEMENT_NODE :
          if (_cur.localName = 'object')
            var _data = _cur;
        }
        _cur = _cur.nextSibling;
      }
      var _param = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _param);
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
      _model.init(_data, aXTUse.getAttribute('param'), aXTUse.getAttribute('option'), this.createUniqueKey());
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
     * @return {_VideoModel} The new instance of the _VideoModel class
     * 
     * @see _VideoModel#makeSeed()
     */
    createEditorFromSeed: function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _model = new _VideoModel(aClone, aDocument);
      var _defaultData = aSeed[1];
      var _param = aSeed[2];
      var _option = aSeed[3];
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
      _model.init(_defaultData, _param, _option, this.createUniqueKey(), aRepeater);
      return _model;
    },
    
    createUniqueKey: function createUniqueKey () {
      return _BASE_KEY + (_keyCounter++);
    }
  }
})();

xtiger.resources.addBundle('video', 
    { 'tvIconURL' : 'tv.png' } );

xtiger.editor.Plugin.prototype.pluginEditors['video'] = xtiger.util.filterable('video', xtiger.editor.VideoFactory);

/**
 * This wrapper allows the editrion of video's data
 */
var _VideoLensWrapper = function (aDocument) {
  /* The wrapped HTML device */
  this._handle;
  
  /* The handle to restore when releasing */
  this._handleToRestore;
  
  /* the document containing the wrapper */
  this._document = aDocument;
  
  /* true if the focus is in one of the fields */
  this._isFocused = false;
  
  /* if true the model is loaded with valid data */
  this._loaded = false;

  this.build();
}

_VideoLensWrapper.prototype = {

  /**
   * Builds the wrapper HTML structure
   */
  build : function() {
    this._topdiv = xtdom.createElement(this._document, 'div');
    xtdom.addClassName(this._topdiv, 'axel-lens-container');
    with (this._topdiv) {
      style.display = 'none';
      style.minWidth = '200px';
    }
    var _innerHTML = '';
    _innerHTML += '<div style="background: none; position: relative"> </div>'; // mask
                                          // div
    _innerHTML += '<div class="axel-lens-containerstyle" style="width: 410px; padding: 5px; position: relative">';
    _innerHTML += '<p style="';
    _innerHTML += 'display: none; font-size: 7pt; cursor: pointer; ';
    _innerHTML += 'text-decoration:underline; text-align: right; margin: 0;';
    _innerHTML += '">delete</p>';
    _innerHTML += '<div>';
    _innerHTML += '<label for="videolensinput" style="display: block">Paste url here</label>';
    _innerHTML += '<input type="text" name="videolensinput" value="" style="width: 90%"></input>';
    _innerHTML += '</div>';
    _innerHTML += '<div style="text-align: center">';
    _innerHTML += '<button>Cancel</button>';
    _innerHTML += '<button>Save</button>';
    _innerHTML += '</div></div>';
    this._topdiv.innerHTML = _innerHTML;
    this._maskdiv = this._topdiv.firstChild;
    this._contentdiv = this._maskdiv.nextSibling;
    this._deletespan = this._contentdiv.firstChild;
    this._inputdiv = this._deletespan.nextSibling;
    this._input = this._inputdiv.firstChild.nextSibling;
    this._buttondiv = this._inputdiv.nextSibling;
    this._cancelbutton = this._buttondiv.firstChild;
    this._savebutton = this._buttondiv.firstChild.nextSibling;
    // event handlers
    var _this = this;
    this._handlers = {
      clearModel : [ this._deletespan, 'click', function(ev) {
        _this.clearModel()
      } ],
      onInputBlur : [ this._input, 'blur', function(ev) {
        _this._onInputBlur(ev)
      } ],
      onInputFocus : [ this._input, 'focus', function(ev) {
        _this._onInputFocus(ev)
      } ],
      onInputKeyDown : [ this._input, 'keydown', function(ev) {
        _this._onInputKeyDown(ev)
      } ],
      onInputKeyUp : [ this._input, 'keyup', function(ev) {
        _this._onInputKeyUp(ev)
      } ],
      onCancel : [ this._cancelbutton, 'click', function(ev) {
        _this._onCancel(ev)
      } ],
      onSave : [ this._savebutton, 'click', function(ev) {
        _this._onSave(ev)
      } ]
    }
  },

  /**
   * Grabs the wrapper, awakes its listeners and displays it
   */
  grab : function(aDevice, aDoSelect, aPadding) {
    if (this._currentDevice)
      this.release();
    this._currentDevice = aDevice;

    var _handle = this._currentDevice.getCurrentModel().getHandle();
    _pad = (aPadding[0] >= 10) ? aPadding[0] : 10;

    // fixes elements' size
    var _width = _handle.offsetWidth;
    var _height = _handle.offsetHeight;
    if (xtiger.cross.UA.IE) { // IE does include padding in elements' width
                  // and height
      _width += 2 * _pad;
      _height += 2 * _pad;
    }
    with (this._topdiv.style) {
      display = 'block';
      width = _width + 'px';
      padding = _pad + 'px';
    }
    with (this._maskdiv.style) {
      border = '' + _pad + 'px solid rgb(115, 166, 42)';
      width = _width + 'px';
      height = _height + 'px';
      if (!xtiger.cross.UA.IE) { // all browser but IE
        left = '-' + _pad + 'px';
        top = '-' + _pad + 'px';
      }
    }
    with (this._contentdiv.style) {
      if (!xtiger.cross.UA.IE) {
        left = '-' + _pad + 'px';
        top = '-' + _pad + 'px';
      }
    }
  
    this._cancelbutton.disabled = false; // always enabled
    this._savebutton.disabled = true; // enabled only once data has been input
  
    // Updates input's value
    if (this._currentDevice.getCurrentModel().isModified()) {
      this.setData(this._currentDevice.getCurrentModel().getData());
      this._deletespan.style.display = 'block';
      this._loaded = true;
    } else {
      var _message = this._currentDevice.getCurrentModel().getParam(
          'inputFieldMessage');
      this.setData(_message); // defeat IE and opera's "null" bug
      this._loaded = false;
    }
  
    // subscribes to events
    for ( var k in this._handlers) {
      xtdom.addEventListener(this._handlers[k][0], this._handlers[k][1],
          this._handlers[k][2], true);
    }
  },
  
  /**
   * Terminates the wrapper installation after the lens has been made visible
   */ 
  activate : function(aDevice, doSelectAll) {
    // nope
  },

  /**
   * Releases the wrapper, unregisters all events handlers
   */
  release : function() {
    if (!this._currentDevice)
      return;
    // unsubscribes from events
    for ( var k in this._handlers) {
      xtdom.removeEventListener(this._handlers[k][0], this._handlers[k][1],
          this._handlers[k][2], true);
    }
    this._deletespan.style.display = 'none';
    this._currentDevice = null;
    xtdom.removeElement(this._topdiv);
  },
  
  /**
   * Returns the wrapper's handle
   * 
   * @return {HTMLElement}
   */
  getHandle : function() {
    return this._topdiv;
  },
  
  /**
   * <p>
   * Returns the input field content.
   * </p>
   * 
   * @return {string}
   */
  getData : function() {
    return this._input.value;
  },
  
  /**
   * Sets the data hold by the wrapper's input field.
   * 
   * @param {string}
   *            aData The data to set
   */
  setData : function(aData) {
    // defeat IE and opera's "null" bug
    this._input.value = (aData && typeof (aData) == 'string') ? aData : '';
  },

  /**
   * 
   * @return
   */
  isFocusable : function() {
    return true;
  },
  
  /**
   * Asks the model to clear itself.
   */
  clearModel : function() {
    if (!this._currentDevice)
      return;
    this._input.value = '';
    this._currentDevice.getCurrentModel().clear();
    this._currentDevice.keepAlive(false);
    this._currentDevice.getCurrentModel().unfocus();
  },
  
  /**
   * Toggles between the lens' fields. Useless here as the lens only has one
   * field.
   */
  toggleField : function() {
    // nope, only one field
  },
  
  /**
   * Event handler called when the input field losts the focus.
   * 
   * @param {Event}
   *            ev
   */
  _onInputBlur : function(ev) {
    this._currentDevice.keepAlive(false);
  },
  
  /**
   * Event handler called when the input field gains the focus.
   * 
   * @param {Event}
   *            ev
   */
  _onInputFocus : function(ev) {
    if (this._loaded) {
      var _aStartPos = 0;
      var _aEndPos = this._input.value.length;
  
      if (this._input.setSelectionRange) {
        this._input.setSelectionRange(_aStartPos, _aEndPos);
      } else if (this._input.createTextRange) { // IE
        var oRange = this._input.createTextRange();
        oRange.moveStart("character", _aStartPos);
        oRange.moveEnd("character", _aEndPos);
        oRange.select();
      }
    } else {
      this._input.value = '';
    }
    this._currentDevice.keepAlive(true);
  },
  
  /**
   * Saves the current value of the input. This value is used later to enable the
   * buttons.
   */
  _onInputKeyDown : function(ev) {
    this._savedValue = this._input.value;
  },
  
  /**
   * Detects the keyup event on the input field. If the input's value has changed,
   * buttons are awakened.
   * 
   * @param ev
   *            {The event}
   * @return
   */
  _onInputKeyUp : function(ev) {
    if (this._input.value != this._savedValue) {
      this._cancelbutton.disabled = false;
      this._savebutton.disabled = false;
    }
  },
  
  /**
   * Event handler for a click on the "cancel" button
   * 
   * @param {Event}
   *            ev The "click" event
   */
  _onCancel : function(ev) {
    if (!this._currentDevice)
      return;
    this._currentDevice.cancelEditing();
    xtdom.stopPropagation(ev);
  },
  
  /**
   * Event handler for a click on the "save" button
   * 
   * @param {Event}
   *            ev The "click" event
   */
  _onSave : function(ev) {
    if (!this._currentDevice)
      return;
    this._currentDevice.stopEditing();
    xtdom.stopPropagation(ev);
  }
}

xtiger.factory('lens').registerWrapper('videoLensWrapper', function (aDocument) {return new _VideoLensWrapper(aDocument)});