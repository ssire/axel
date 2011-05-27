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
 * Author(s) : Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * 
 * NOTE : This editor is written using my own naming conventions and terminology. Please note the following points :
 * - SomeModel becomes SomeFactory
 * - SomeEditor becomes SomeModel (and is a shadow class)
 * - SomeDevice may become SomeEditor (finally not. A device stays a device. An editor is the combinaision of the
 * mentionned items.)
 */

/**
 * RichTextFactory object (static)
 * 
 * This object acts as a factory for the link editor. It is responsible to
 * create both the DOM model, the model class and the editing device(s).
 * 
 * This editor is used to edit rich text, that is, editable HTML content.
 * 
 * @class RichTextFactory
 * @version beta
 */
xtiger.editor.RichTextFactory = (function RichTextFactory() {

  /**
   * _RichTextModel class (shadow class)
   * 
   * This class implements a model for handling and displaying the data of a
   * rich text editor. It is only instanciable trough its factory method holds
   * in the RichTextFactory object.
   * 
   * @class _RichTextModel
   * @name _RichTextModel
   * @constructor
   * @param {HTMLElement}
   *            aHandleNode The editor's handle (usually an &lt;div&gt;
   *            element)
   * @param {DOM
   *            Document} aDocument The document that contains
   *            <code>this</code> editor
   */
  var _RichTextModel = function(aHandleNode, aDocument) {

    /*
     * Default parameters for the link editor. Parameters meaning and
     * possible values are documented below.
     */
    var _DEFAULT_PARAMS = {
        defaultDevice: 'lens',
        trigger: "click",
        padding: '10'
    };

    /**
     * The HTML node used as handle by the editor. Usually it is a <span>
     * element. The handle is created by the editor's factory prior to the
     * instancation of *this* object
     */
    this._handle = aHandleNode;

    /**
     * The data handled by *this* model
     */
    this._data = {}
    
    /**
     * Filter used at update() call time
     */
    this._updateFilter = ['br', 'p', 'span', 'i', 'u', 'b', 'strong', 'em', 'a', 'font'];

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
  /** @memberOf _RichTextModel */
  _RichTextModel.prototype = {
    
      /**
       * Updates the model with the given data
       * 
       * @param {string} aData A inner HTML string to apply to the handle
       * 
       * @throw Exception if the argument does not contains vaild HTML
       */
      _setData: function (aData) {
        this._handle.innerHTML = aData;
        this._treeFilter(this._handle, this._updateFilter); // Filters unwanted stuff
        this._removeTrailingBRNodes(this._handle, true);
      },
        
      /**
       * <p>
       * Sanitize an attribute content to ensure a valid XML
       * </p>
       * 
       * @param {string} aString
       * @return {string}
       * @private
       */
      _sanitizeAttribute: function (aString) {
        var _san = aString.replace(/"/g, '\'');
        _san = _san.replace(/&(?!\w{3,6};)/g, '&amp;'); // replaces & if not an entity
        return _san;
      },
      
      /**
       * <p>
       * Filters a node content, given a filter on to form of an array of
       * authorized elements. If a node's child doesn't match an authorized
       * element, it's content is inlined (i.e: inserted as sibling of the
       * filtered node)
       * </p>
       * 
       * @param {HTMLElement}
       *            aNode an HTML node to filter. Note that only its content
       *            is filtered, not the node itself
       * @param {string[]}
       *            aFilter a list of authorized tag name
       * @param {boolean}
       *            doRecursion Optional parameter (default=true)
       */
      _treeFilter: function (aNode, aFilter, doRecursion) {
        if (!aNode || !aFilter)
          return aNode;
        if (doRecursion !== false)
          doRecursion = true;
        try {
          var _cur = aNode.firstChild;
          while (_cur) {
            var _next = _cur.nextSibling; // saves "next" reference as _cur may be deleted
            if (_cur.nodeType == xtdom.ELEMENT_NODE) {
              // first, recurse (if necessary) on the current node children
              if (doRecursion)
                this._treeFilter(_cur, aFilter, doRecursion);
              // then take care of the current node itself
              var _isFound = false;
              for (var _f in aFilter)
                if ((aFilter[_f]).toLowerCase() == (_cur.nodeName).toLowerCase()) {
                  _isFound = true;
                  break;
                }
              if (!_isFound) {
                var _curChild = _cur.firstChild;
                var _lastChild = _curChild;
                while (_curChild) { // move current node's children and current node siblings
                  var _nextChild = _curChild.nextSibling;
                  aNode.insertBefore(_curChild, _cur);
                  _curChild = _nextChild;
                }
                xtdom.removeElement(_cur); // now get rid of old element
              }
            }
            _cur = _next;
          }
        } catch (err) {
          console.warn('(richtext.js: ' + err.lineNumber + ') Problem in tree conversion: ' + err.message);
          return aNode;
        }
      },
      
      /**
       * Remove all trailing "br" nodes in the children of a given node.
       * 
       * @param {DOMElement} aNode The node to modify
       * @param {boolean} isRecursive If true, the algorithm also recurse on the last non-br node of the given node. 
       * @return {boolean} Tre if th node was modified, false otherwise.
       */
      _removeTrailingBRNodes: function (aNode, isRecursive) {
        if (!aNode || !aNode.lastChild)
          return false;
        var _modified = false;
        for (var _i = aNode.childNodes.length - 1; _i >= 0 ; _i--) {
          if (aNode.childNodes[_i].nodeName.toLowerCase() == 'br') {
            xtdom.removeElement(aNode.childNodes[_i]);
            _modified = true;
          }
          else {
            if (isRecursive === true)
              return this._removeTrailingBRNodes(aNode.childNodes[_i], true);
            return _modified;
          }
        }
      },
  
      /**
       * Recursive function to save data into a logger. The function takes as
       * argument the parent node of the nodes to serialize. It iterates on
       * the children and recursively call itself on them.
       * 
       * @param {HTMLElement}
       *            aNode An HTML element node whose children will be
       *            serialized. Note that the node itself <em>wont</em> be
       *            serialized
       * @param {Logger}
       *            aLogger A logger object where to write the serialization
       *            result
       * 
       * @private
       */
      _saveData : function(aNode, aLogger) {
        var _cur = aNode.childNodes[0];
        var _hasElement = false;
        var _doNext = true;
        while (_cur) {
          _doNext = true;
          switch (_cur.nodeType) {
          case xtdom.ELEMENT_NODE:
            _hasElement = true;
            var _sName = _cur.nodeName;
            var _styleAttr = null;
            switch(_sName) {
            case 'b':
            case 'B':
            case 'STRONG':
              _sName = 'span';
              _styleAttr = 'font-weight: bold';
              break;
            case 'i':
            case 'I':
            case 'EM':
              _sName = 'span';
              _styleAttr = 'font-style: italic';
              break;
            case 'u':
            case 'U':
              _sName = 'span';
              _styleAttr = 'text-decoration: underline';
              break;
            }
            aLogger.openTag(_sName.toLowerCase());
            if (_cur.attributes.length) {
              // WARNING the attribute array is AWFULLY supported on IE, but I still not have found another way to lists all declared attributes of a node
              for ( var _i = 0; _i < _cur.attributes.length; _i++) {
                if (_cur.attributes[_i].nodeName == '_moz_dirty' ||
                    _cur.attributes[_i].nodeName == 'xmlns' ||
                    (!_cur.attributes[_i].specified && xtiger.cross.UA.IE))
                  continue;
                aLogger.openAttribute(_cur.attributes[_i].nodeName);
                if(_cur.attributes[_i].nodeName == 'style' && xtiger.cross.UA.IE)
                  aLogger.write(this._sanitizeAttribute(_cur.style.cssText.toLowerCase()));
                else
                  aLogger.write(this._sanitizeAttribute(_cur.getAttribute(_cur.attributes[_i].nodeName)));
                aLogger.closeAttribute(_cur.attributes[_i].nodeName);
              }
            }
            if (_styleAttr) { // TODO merge with global attr mgmt
              aLogger.openAttribute('style');
              aLogger.write(_styleAttr);
              aLogger.closeAttribute('style');
            }           
            this._saveData(_cur, aLogger); /* recursion */
            aLogger.closeTag(_sName.toLowerCase());
            break;
          case xtdom.TEXT_NODE:
            if (!_cur.nodeValue.match(/\S/) && _cur.nodeValue != ' ') /* avoid useless lumps of void text, but keep single spaces */
              break;
            var _text_buffer = '';
            /* consume all siblings text nodes */
            while (_cur && _cur.nodeType == xtdom.TEXT_NODE) {
              _text_buffer += _cur.nodeValue;
              _cur = _cur.nextSibling;
              _doNext = false; // avoid next node skipping
            }
            if (_hasElement || _cur) // avoid mixed content
              aLogger.openTag('span');
            _text_buffer = _text_buffer.replace(/&(?!\w{3,5};)/g, '&amp;'); // Sanizize orphan &
            aLogger.write(_text_buffer);
            if (_hasElement || _cur)
              aLogger.closeTag('span');
            break;
          default:
          }
          if (_cur && _doNext)
            _cur = _cur.nextSibling;
        }
      },
  
      /**
       * <p>
       * Load recursively the data given as parameter into the given insertion
       * point.
       * </p>
       * 
       * @param {array}
       *            aPoint A point in the data source to load into the
       *            insertion point
       * @param {DataSource}
       *            aDataSrc The datasource where to fetch the XML data
       * @param {HTMLElement}
       *            aInsertPoint The point where to insert the parsed data
       * 
       * @private
       */
      _loadData: function (aPoint, aDataSrc, aInsertPoint) {
        if (aDataSrc.isEmpty(aPoint))
          return;
        if (aPoint instanceof Array && aPoint.length == 2 && aPoint[1].nodeType == xtdom.TEXT_NODE) {
          aInsertPoint.appendChild(xtdom.createTextNode(this._document, xtdom.getTextContent(aPoint[1]))); //FIXME IE looses spaces
        } else if (aPoint instanceof Array && aPoint.length == 2 && typeof(aPoint[1]) == 'string') {
          aInsertPoint.appendChild(xtdom.createTextNode(this._document, aPoint[1])); // FIXME IE looses sapces
        } else if (aPoint instanceof Array && aPoint.length >= 2) {
          for (var _i = 1; _i < aPoint.length; _i++) {
            if (aPoint[_i].nodeType == xtdom.TEXT_NODE)
              continue; /* sanity check for trailing "empty" nodes */
            var _nodeName = xtdom.getLocalName(aPoint[_i]);
            switch (_nodeName) {
            case 'span' :
              if (aPoint[_i].attributes.length == 0) { /* this was a span created to avoid mixed content */
                aInsertPoint.appendChild(xtdom.createTextNode(this._document, xtdom.getTextContent(aPoint[_i])));
                break;
              }
              /* prevent default node generation for IE and Opera */
              if (xtiger.cross.UA.IE || xtiger.cross.UA.opera) {
                var _style = xtdom.getStyleAttribute(aPoint[_i]);
                if (_style && _style != '') {
                  var _tokens = _style.split(';');
                  var _newNode;
                  var _insertPoint;
                  var _otherStyles = '';
                  for (var _j = 0; _j < _tokens.length; _j++) {
                    switch (_tokens[_j]) {
                    case 'font-weight: bold' :
                      _newNode = xtdom.createElement(this._document, 'strong');
                      if (_insertPoint)
                        _insertPoint.appendChild(_newNode);
                      _insertPoint = _newNode;
                      break;
                    case 'font-style: italic' :
                      _newNode = xtdom.createElement(this._document, 'em');
                      if (_insertPoint)
                        _insertPoint.appendChild(_newNode);
                      _insertPoint = _newNode;
                      break;
                    case 'text-decoration: underline' :
                      _newNode = xtdom.createElement(this._document, 'u');
                      if (_insertPoint)
                        _insertPoint.appendChild(_newNode);
                      _insertPoint = _newNode;
                      break;
                    default :
                      if (/\S/.test(_tokens[_j]))
                        _otherStyles += _tokens[_j] + ';';
                    }
                  }
                  if (_otherStyles != '') {
                    _newNode = xtdom.createElement(this._document, 'span');
                    if (xtiger.cross.UA.IE)
                      _newNode.style.setAttribute('cssText', _otherStyles);
                    else
                      _newNode.setAttribute('style', _otherStyles)
                    if (_insertPoint)
                      _insertPoint.appendChild(_newNode);
                    _insertPoint = _newNode;
                  }
                  for (var _k = 0; _k < aPoint[_i].attributes.length; _k++) { // FIXME IE (still todo)
                    if (aPoint[_i].attributes[_k].nodeName != 'style')
                      _newNode.setAttribute(aPoint[_i].attributes[_k].nodeName, aPoint[_i].attributes[_k].nodeValue);
                  }
                  var _newVector = [null]; 
                  for (var _l = 0; _l < aPoint[_i].childNodes.length; _l++) {
                    _newVector.push(aPoint[_i].childNodes[_l]);
                  }
                  this._loadData(_newVector, aDataSrc, _newNode); /* recursion */
                  aInsertPoint.appendChild(_newNode);
                  break;
                }
              }
            default :
              var _newNode = xtdom.createElement(this._document, _nodeName);
              for (var _k = 0; _k < aPoint[_i].attributes.length; _k++) { // FIXME IE (still todo)
                _newNode.setAttribute(aPoint[_i].attributes[_k].nodeName, aPoint[_i].attributes[_k].nodeValue);
              }
              var _newVector = [null]; 
              for (var _j = 0; _j < aPoint[_i].childNodes.length; _j++) {
                _newVector.push(aPoint[_i].childNodes[_j]);
              }
              this._loadData(_newVector, aDataSrc, _newNode); /* recursion */
              aInsertPoint.appendChild(_newNode);
            }
          }
        }
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
       *            aDefaultData The innerHTML to insert in the handle. Unhappy?
       *            So what?
       * @param {string|object}
       *            aParams Either the parameter string from the <xt:use> node
       *            or the parsed parameters object from the seed
       * @param {string}
       *            aOption If the parameter is not null, the editor is
       *            optional. If its value equals "set", the editor is set by
       *            default
       * @public
       */
      init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
        if (aParams) { /* parse parameters */
          if (typeof (aParams) == 'string')
            xtiger.util.decodeParameters(aParams, this._params);
          else if (typeof (aParams) == 'object')
            this._params = aParams;
        }
        if (aDefaultData) { /* sets up initial content */
          try {
            this._setData(aDefaultData);
            this._defaultData = aDefaultData;
          }
          catch (_err) {
            xtiger.cross.log('warning', 'Unable to init the rich text editor with the following content :\n' + aData);
          }
        }
        if (aOption) { /* the editor is optional */
          this._isOptional = true;
          this._optCheckBox = this._handle.previousSibling;
          (aOption == 'set') ? this.set() : this.unset();
        }
        this._uniqueKey = aUniqueKey;
        var _deviceFactory = this._params['device'] ? 
            xtiger.factory(this._params['device']) :
            xtiger.factory(this._params['defaultDevice']);
        if (_deviceFactory)
          this._device = _deviceFactory.getInstance(this._document);
        else
          xtiger.cross.log('warning', 'no device for this editor ' + this);
        /* register buttons */
        //var _bf = xtiger.factory('button').getInstance();
        //this._device.registerButtonFactory('rte-bold', _bf.createButtonFactory( {
        //    click : function(that) {
        //      that.getDocument()
        //          .execCommand('bold', false, false);
        //    }
        //  }, 66 /* b */, '../editor/images/rte-bold.png', 'bold'));
        //this._device.registerButtonFactory('rte-italic', _bf.createButtonFactory( {
        //    click : function(that) {
        //      that.getDocument().execCommand('italic', false, false);
        //    }
        //  }, 73 /* i */, '../editor/images/rte-italic.png', 'italic'));
        //this._device.registerButtonFactory('rte-underline', _bf.createButtonFactory( {
        //    click : function(that) {
        //      that.getDocument().execCommand('underline', false, false);
        //    }
        //  }, null, '../editor/images/rte-underline.png', 'underline'));
        //this._device.registerButtonFactory('rte-undo', _bf.createButtonFactory( {
        //    click : function(that) {
        //      that.getDocument().execCommand('undo', false, false);
        //    }
        //  }, 90 /* z */, '../editor/images/rte-undo.png', 'undo'));
        /* make handle editable */
        //this._handle.setAttribute('contentEditable', "true");
        //this._handle.setAttribute('contenteditable', "true");
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
          this._seed = [ xtiger.editor.RichTextFactory, this._defaultData,
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
       * <p>
       * Loading function for setting the data stored in this model from an
       * XML data source.
       * </p>
       * 
       * @param {Point}
       *            aPoint A point in the data source
       * @param {DOMDataSource}
       *            aDataSrc The data source to load into the editors
       * @see #save()
       */
      load : function(aPoint, aDataSrc) {
        var _buffer = xtdom.createElement(this._document, 'div');
        var _prevState = _buffer.innerHTML;
        try{
          this._loadData(aPoint, aDataSrc, _buffer);
          this._setData(_buffer.innerHTML);
        } catch (_err) {
          xtiger.cross.log('error', 'Richtext.js : failed to load data : ' + _err.message);
        }
        if (_buffer.innerHTML == _prevState && this.isOptional())
          this.unset();
        if (_buffer.innerHTML != _prevState && this.isOptional())
          this.set();
      },
  
      /**
       * <p>
       * Serialization function for saving the edited data to a logger. It is
       * assumed that the XML node representing the label is produced by the
       * caller function.
       * </p>
       * <p>
       * By default, the serializing of the function dumps the nodes that are
       * children of the handle. However, such behavior is likely to produce
       * mixed content (text nodes that are siblings to element nodes). To
       * avoid such a content, which is not supported by the underlying data
       * model, text nodes are encompassed by a <code>:lt;span&gt;</code>
       * tag.
       * </p>
       * 
       * @param {Logger}
       *            aLogger A logger object supporting the write() method
       * @see #load()
       */
      save : function(aLogger) {
        aLogger.openAttribute('xml:space');
        aLogger.write('preserve');
        aLogger.closeAttribute('xml:space');
        if (this.isOptional() && !this._isOptionSet) {
          aLogger.discardNodeIfEmpty();
          return;
        }
        this._saveData(this._handle, aLogger)
      },
  
      /* Editing facilities */
  
      /**
       * Updates the model with the given data. The data is first sanitized, then inserted as innerHTML.
       * 
       * @param {string}
       *            aData An <code>innerHTML</code> string. I know, it's
       *            dirty, non-standard and proprietary. Still it's better
       *            supported than a lot of W3C DOM method and if you are
       *            unhappy I'd be glad to see you work on it.
       */
      update : function (aData) {
        if (this._data == aData)
          return; // Guard if no modification
        
        if (!aData || aData.search(/\S/) == -1 || (aData == this._defaultData)) {
          this.clear(true);
          return;
        }
        
        var _newData = aData;
        _newData = _newData.replace(/<br>/ig, '<br/>'); // FIXME display bug if copy-paste from html
        _newData = _newData.replace(/<br\/>/gi, '<br></br>');
        try {
          this._setData(_newData);
          
          // If no thext content, resets the editor
          if (xtdom.getTextContent(this._handle).search(/\S/) == -1) {
            this.clear(true);
            return;
          }
          
          this._isModified = true;
          this.set(true);
        } catch (_err) {
          xtiger.cross.log('warning', 'Unable to update the rich text editor with the following content :\n' + aData);
        }
      },
  
      /**
       * Empties the handle container from any HTML node (element and/or text
       * nodes).
       */
      clear : function(doPropagate) {
        for ( var i = this._handle.childNodes.length; i > 0; i--) {
          this._handle.removeChild(this._handle.childNodes[i - 1]);
        }
        this._setData(this._defaultData);
        this._isModified = false;
        if (this.isOptional() && this.isSet())
          this.unset(doPropagate);
      },
  
      /**
       * <p>
       * Returns the data currently stored by the model. To avoid painfull and
       * useless text node creation the data is cleared from leading and trailing
       * non-word characters (\s).
       * 
       * </p>
       * 
       * @returns {String} The handle's inner HTML
       */
      getData : function() {
        return this._handle.innerHTML.replace(/^\s+|\s+$/g, '');
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
       * <p>
       * Returns the model's handle
       * </p>
       * 
       * @returns {HTMLElement}
       */
      getHandle : function() {
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
       * <p>
       * Returns the parameters associated with the given key.
       * </p>
       * 
       * @param {string}
       *            aKey The name of the parameter
       * @returns {any} The parameter's value
       */
      getParam : function(aKey) {
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
       * <p>
       * Returns true if the editor is optional, that is, if the attribute
       * <code>option=""</code> was set on the <code>&lt;xt:use&gt;</code>
       * node.
       * </p>
       * 
       * @returns {boolean} True if the editor is optional, false otherwise
       */
      isOptional : function() {
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
        // propagates state change in case some repeat ancestors are unset
        // at that moment
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
       * 
       */
      isFocusable : function() {
        return true;
      },
    
      /**
       * <p>
       * This method is called by the tab group manager when it gives the focus
       * to <code>this</code> editor.
       * </p>
       * 
       * @param {boolean} aSet If true and the editor is optional and unset, the focusing sets the editor
       */
      focus: function (aSet) {
        if (this._isOptional && aSet && !this._isOptionSet)
          this.set();
        this._handle.focus();
        this.startEditing();
      },
    
      /**
       * 
       * @return
       */
      unfocus: function () {
        this._handle.blur();
        this.stopEditing();
      },
    
      /* Events management */
      /**
       * <p>
       * The awake method cares to registers event handlers for the handle node.
       * As those handler invoke the device that is associated with this model,
       * the method cares also to get the device from the factory.
       * </p>
       */
      awake : function() {
        var _devName = this.getParam('device');
        var _this = this;
        xtdom.addEventListener(this._handle, this._params['trigger'], function(ev) {
          if (_this._isOptional && !_this._isOptionSet)
            _this.set();
          _this.startEditing(ev);
          xtdom.stopPropagation(ev);
        }, true); // Capture click
        if (this.isOptional()) {
          xtdom.addEventListener (this._optCheckBox, 'click', function (ev) {_this.onToggleOpt(ev);}, true);
        }
      },
      
      /**
       * Starts an edition process on *this* instance's device.
       */
      startEditing : function (aEvent) {
        var _doSelect = aEvent ? (!this._isModified || aEvent.shiftKey) : false;
        this._device.startEditing(this, 'richtextwrapper', _doSelect);
      },
    
      /**
       * Stops the edition process on the device
       */
      stopEditing : function () {
        this._device.stopEditing();
      },
    
      /**
       * <p>
       * Handler for the option checkbox, toggles the selection state.
       * </p>
       * 
       * @ignore
       */
      onToggleOpt : function(ev) {
        this._isOptionSet ? this.unset() : this.set();
      }
  }; /* ### End of _RichTextModel class ### */

  /* Base string for key */
  var _BASE_KEY = 'richtext';

  /* a counter used to generate unique keys */
  var _keyCounter = 0;

  return { /* Public members for the RichTextModelFactory object */

    /**
     * <p>
     * Creates the HTML element for handling the data model (that is, the
     * HTML content used as "rich text"). This element is a &lt;div&gt; that
     * carries the attribute <code>contentEditable="true"</code>.
     * </p>
     * 
     * @param {HTMLElement}
     *            aContainer the HTML node where to implant the editor
     * @param {XTNode}
     *            aXTUse the XTiger use node that caused this editor to be
     *            implanted here
     * @param {DOM
     *            Document} aDocument the current HTML document (in the DOM
     *            understanding of a "document") being processed
     * @returns {HTMLElement} The created HTML element
     */
    createModel : function createModel(aContainer, aXTUse, aDocument) {
      var _params = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _params);
      switch (_params['display']) {
      case 'inline':
        var _content = xtdom.createElement(aDocument, 'span');
        break;
      case 'single':
        var _content = xtdom.createElement(aDocument, 'p');
        break;
      default:
        var _content = xtdom.createElement(aDocument, 'div');
      }
      xtdom.addClassName(_content, 'axel-core-on');
      xtdom.addClassName(_content, 'axel-core-editable');
      var _optional = aXTUse.getAttribute('option');
      if (_optional) {
        var _checkbox = xtdom.createElement (aDocument, 'input');
        xtdom.setAttribute(_checkbox, 'type', 'checkbox');             
        xtdom.addClassName(_checkbox, 'axel-option-checkbox');             
        aContainer.appendChild(_checkbox);
      }
      aContainer.appendChild(_content);
      return _content;
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
     * @returns {_RichTextModel} A new instance of the RichTextModel class
     */
    createEditorFromTree : function createEditorFromTree(aHandleNode,
        aXTUse, aDocument) {
      var _model = new _RichTextModel(aHandleNode, aDocument);
      var _buffer = xtdom.createElement(aDocument, 'div');
      var _cur = aXTUse.firstChild;
      while (_cur) {
        var _next = _cur.nextSibling;
        _buffer.appendChild(_cur);
        _cur = _next;
      }
      var _params = {};
      xtiger.util.decodeParameters(aXTUse.getAttribute('param'), _params);
      if (_params['filter'])
        _model = this.applyFilters(_model, _params['filter']);
      _model.init(_buffer.innerHTML, aXTUse.getAttribute('param'), aXTUse.getAttribute('option'), this.createUniqueKey());
      return _model;
    },

    /**
     * <p>
     * Creates an editor from a seed. The seed must carry the default data
     * content as well as the parameters information. Those infos are used
     * to init the new editor.
     * </p>
     * 
     * @param {Seed}
     *            aSeed The seed from which the new editor is built
     * @param {HTMLElement}
     *            aClone The cloned handle where to implant the editor
     * @param {DOM
     *            Document} aDocument the document containing the editor
     * @returns {_RichTextModel} The new instance of the _RichTextModel
     *          class
     * 
     * @see _linkModel#makeSeed()
     */
    createEditorFromSeed : function createEditorFromSeed(aSeed, aClone, aDocument, aRepeater) {
      var _model = new _RichTextModel(aClone, aDocument);
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
  };
})();

xtiger.editor.Plugin.prototype.pluginEditors['richtext'] 
  = xtiger.util.filterable('richtext', xtiger.editor.RichTextFactory);

xtiger.resources.addBundle('richtext', 
    { 'plusIconURL' : 'plus.png',
      'minusIconURL'  : 'minus.png',  
      'uncheckedIconURL' : 'unchecked.png',
      'checkedIconURL' : 'checked.png'  } );



/**
 * Wrapper for the rich text editor.
 * 
 * TODO use padding param (now 10px)
 * 
 * @param aDocument
 * @return
 * 
 * @class _RichTextWrapper
 */
var _RichTextWrapper = function (aDocument) {
  /* keep a ref on the doc */
  this._document = aDocument;
  
  /**
   * This regexp match all markup tags
   */
  this._markupRE = new RegExp('(<\/?[^<>]+\/?>)', 'g');
  
  /**
   * Listeners for keyboard event
   */
  var _this = this;
  this._listener = {
      onkeyup: function (ev) {_this.onKeyUp(ev)},
      onkeydown: function (ev) {_this.onKeyDown(ev)}
  }
  
  /**
   * Builds the HTML
   * TODO put that stuff in an appropriate bundle
   */
  this._handle = xtdom.createElement(aDocument, 'div');
  with (this._handle.style) {
    display = 'none';
    top = '-30px';
  }
  xtdom.addClassName(this._handle, 'axel-lens-container');
  xtdom.addClassName(this._handle, 'axel-lens-containerstyle');
  xtdom.addClassName(this._handle, 'axel-core-editing');
  
  var _buttonbar = xtdom.createElement(aDocument, 'div');
  with (_buttonbar) {
    style.height = '20px';
    style.padding = '0';
    style.marginBottom = '10px';
    style.width = '100%';
  }
  this._handle.appendChild(_buttonbar);
  
  var _this = this;
  var _buttonBL = xtdom.createElement(aDocument, 'input');
  with (_buttonBL) {
    type = 'button';
    value = 'bold';
    style.display = 'inline';
    style.marginRight = '2px';
    style.height = '20px';
  }
  xtdom.addEventListener(_buttonBL, 'click', function (ev) {
    _this._document.execCommand('bold', false, false);
    _this._editablediv.focus();
  }, true);
  _buttonbar.appendChild(_buttonBL);
  var _buttonUL = xtdom.createElement(aDocument, 'input');
  with (_buttonUL) {
    type = 'button';
    value = 'underline';
    style.display = 'inline';
    style.marginRight = '2px';
    style.height = '20px';
  }
  xtdom.addEventListener(_buttonUL, 'click', function (ev) {
    _this._document.execCommand('underline', false, false);
    _this._editablediv.focus();
  }, true);
  _buttonbar.appendChild(_buttonUL);
  var _buttonIT = xtdom.createElement(aDocument, 'input');
  with (_buttonIT) {
    type = 'button';
    value = 'italic';
    style.display = 'inline';
    style.marginRight = '2px';
    style.height = '20px';
  }
  xtdom.addEventListener(_buttonIT, 'click', function (ev) {
    _this._document.execCommand('italic', false, false);
    _this._editablediv.focus();
  }, true);
  _buttonbar.appendChild(_buttonIT);
  
  var _buttonOK = xtdom.createElement(aDocument, 'input');
  with (_buttonOK) {
    type = 'button';
    value = 'OK';
    style.marginRight = '2px';
    style.marginLeft = '40px';
    style.height = '20px';
    style.width = '50px';
    style.cssFloat = 'right';
    style.styleFloat = 'right';
  }
  xtdom.addEventListener(_buttonOK, 'click', function (ev) {
    _this._currentDevice.keepAlive(false);
    _this._currentDevice.stopEditing();
  }, true);
  _buttonbar.appendChild(_buttonOK);
  
  this._editablediv = xtdom.createElement(aDocument, 'div');
  with (this._editablediv) {
    style.backgroundColor = 'white';
    style.color = 'black';
    style.margin = '0';
    style.overflowX = 'auto';
    style.width = 'auto';
  }
  this._editablediv.setAttribute('contentEditable', "true");
  this._editablediv.setAttribute('contenteditable', "true");
  this._handle.appendChild(this._editablediv);
  
  xtdom.addEventListener(this._editablediv, 'focus', function (ev) {_this.onInputFocus(ev)}, false);
  xtdom.addEventListener(this._editablediv, 'blur', function (ev) {_this.onInputBlur(ev)}, true);
};

_RichTextWrapper.prototype = {
    
  /**
   * Awakes and displays the wrapper. Puts the editable div in shape to match the
   * model's handle's shape.
   * 
   * @param aDevice
   * @param aDoSelect
   */
  grab: function (aDevice, aDoSelect) {
    if (this._currentDevice)
      this.release();
    
    this._currentDevice = aDevice;
    var _modelHandle = this._currentDevice.getCurrentModel().getHandle();
    with (this._handle) {
      style.display = 'block';
    }
    
    var _display = this._currentDevice.getCurrentModel().getParam('display');
    
    var _pad = this._currentDevice.getCurrentModel().getParam('padding')
    var _newwidth = (_display == 'inline') ? null : (_modelHandle.offsetWidth);
    if (xtiger.cross.UA.IE) {
      _newwidth += 2*_pad;
    }
    with (this._handle.style) {
      minHeight = (_modelHandle.offsetHeight + 40) + 'px';
      minWidth = (_display == 'inline') ? (_modelHandle.offsetWidth) + 'px' : null;
      maxWidth = (_display == 'inline') ? (_modelHandle.parentNode.offsetWidth) + 'px' : null;
      width = _newwidth + 'px';
      padding = _pad + 'px';
    }
    with (this._editablediv.style) { // FIXME buggy (IE ok)
      paddingLeft = xtdom.getComputedStyle(_modelHandle, 'padding-left');
      paddingRight = xtdom.getComputedStyle(_modelHandle, 'padding-right');
      paddingTop = xtdom.getComputedStyle(_modelHandle, 'padding-top');
      paddingBottom = xtdom.getComputedStyle(_modelHandle, 'padding-bottom');
    }
    
    // updates the ediable div
    this.setData(this._currentDevice.getCurrentModel().getData());
  },    
  
  /**
   * Terminates the wrapper installation after the lens has been made visible
   */
  activate: function(aDevice, doSelectAll) {
    // if asked, select the text buffer
    if (doSelectAll)
      this.selectData();
    
    // start to listen to the keyboard
    var _this = this;
    xtdom.addEventListener(this._document, 'keyup', this._listener['onkeyup'], true);
    xtdom.addEventListener(this._document, 'keydown', this._listener['onkeydown'], true);
    this._lastKey = null; // reset last key to handle double enters
    
    // focus the caret inside the content ediatble div, only if the buffer is not selected
    if (!doSelectAll) {
      this._editablediv.focus();
      this.setCaretToEnd();
    }
  },  
  
  /**
   * Releases the wrapper.
   */
  release: function () {
    if (!this._currentDevice)
      return;
    var _this = this;
    xtdom.removeEventListener(this._document, 'keyup', this._listener['onKeyUp'], true);
    xtdom.removeEventListener(this._document, 'keydown', this._listener['onKeyDown'], true);
    this.setData('');
    xtdom.removeElement(this._handle);
    this._currentDevice = null;
  },
  
  /**
   * Returns true if the wrapper should be included in the tab focus chain
   * 
   * @return {boolean}
   */
  isFocusable: function () {
    return false;
  },
  
  /**
   * Returns the edited data, as an HTML fragment
   * 
   * @return {string} The inner HTML of the editor
   */
  getData: function () {
    return this._editablediv.innerHTML;
  },
  
  /**
   * Sets the wrapper's data, that is, the data to edit.
   * 
   * @param {string}
   *            aData The HTML fragment to edit
   */
  setData: function (aData) {
    if (!typeof(aData) == 'string')
      return;
    this._editablediv.innerHTML = aData;
  },
  
  /**
   * Handler for field toggles. Useless here as the is only one field here.
   */
  toggleField: function () {
    // nope
  },
  
  /**
   * Select (highlight) the text inside the editable device
   * 
   * FIXME doesn't work yet
   */
  selectData: function () {
    try {
      this._editablediv.focus(); // The buffer *MUST* have the focus prior to the selection
      this._document.execCommand('selectAll', false, false);
    }
    catch (_err) {
      xtiger.cross.log('warning', 'Unable to move the caret at the end of the contentEditable field' + "\n\t" + 'Cause: ' + _err.message);
    }
    
  },
  
  /**
   * Returns the wrapper's handle.
   * 
   * @return {HTMLElement} The wrapper's handle
   */
  getHandle: function () {
    return this._handle;
  },
  
  /**
   * Returns true if the buffer is empty
   */
  isEmpty: function (aBuffer) {
    var _nomarkup = aBuffer.innerHTML.replace(this._markupRE, '');
    return _nomarkup.search(/\S/) == -1
  },
  
  /**
   * Moves the caret at the end of the buffer
   */
  setCaretToEnd: function () {
      var _sel, _range;
      this._editablediv.focus();
      var _lastElement = this._editablediv.lastChild;
      try {
        if (window.getSelection && this._document.createRange) {
            _sel = xtdom.getWindow(this._document).getSelection();
            _sel.removeAllRanges();
            _range = this._document.createRange();
            _range.selectNodeContents(_lastElement);
            _range.collapse(false);
            _sel.addRange(_range);
        } else if (this._document.body.createTextRange) {
            _range = this._document.body.createTextRange();
            _range.moveToElementText(this._editablediv);
            _range.collapse(false);
            _range.select();
        }
      }
      catch (_err) {
        console.log(_err)
      }
      console.log('caret on end');
  },
  
  /**
   * Handler for key down events. Filter events to drop, such as double enters
   * 
   * @param {DOMEvent}
   *            ev The keybaord event to filter
   */
  onKeyDown: function (ev) {
        if ((ev.keyCode == 13) && (this._lastKey == 13)) { // "double" enter
            xtdom.preventDefault(ev);
            xtdom.stopPropagation(ev);                                                
        }
        this._lastKey = ev.keyCode;
  },
  
  /**
   * Handler for key up events.
   * Restore the text buffer into a correct state (insert paragraph if needed, for instance)
   * 
   * @param {DOMEvent}
   *            ev The keybaord event to filter
   */
  onKeyUp: function (ev) {
    try {
      if (this.isEmpty(this._editablediv)) {
        this._editablediv.innerHTML = '';
              this._document.execCommand('insertParagraph', false, false);
      }
      else if (this._editablediv.firstChild.nodeName.toLowerCase() != 'p' ||
          this._editablediv.firstChild.nodeType != xtdom.ELEMENT_NODE) {
        var _buf = '';
        var _cur = this._editablediv.firstChild;
        while (_cur && (_cur.nodeType != xtdom.ELEMENT_NODE || _cur.nodeName.toLowerCase() != 'p')) {
          _buf += xtdom.getTextContent(_cur); // get the text content
          _prev = _cur;
          _cur = _cur.nextSibling;
          xtdom.removeElement(_prev); // remove element when readed
        }
              var _p = xtdom.createElement(this._document, 'p');
              _p.innerHTML = _buf;
              if (this._editablediv.firstChild)
                this._editablediv.insertBefore(_p, this._editablediv.firstChild);
              else 
                this._editablediv.appendChild(_p);
              this.setCaretToEnd();
      }
    } 
    catch (_err) {
      xtiger.cross.log('error', _err.message);
    }
  },
  
  /**
   * Listener in the editable content div to keep the lens visible while the
   * buffer has the focus.
   * 
   * @param ev
   */
  onInputFocus: function (ev) {
    this._currentDevice.keepAlive(true);
  },
  
  /**
   * Listener in the editable content div to let the lens disappear when the
   * buffer lost the focus.
   * 
   * @param ev
   */
  onInputBlur: function (ev) {
    this._currentDevice.keepAlive(false);
  }
}

xtiger.factory('lens').registerWrapper('richtextwrapper', function (aDocument) {return new _RichTextWrapper(aDocument)});