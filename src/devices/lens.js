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
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */              
    
/**
* <p>
* A LayoutManager encapsulates different algorithms for dynamically replacing
* a Model Handle with an editor. Once the layout manager is invoked with a layout
* method such as insertAbove or insertInline, it retains a state which is restored
* with a call to restoreHandle. So basically a possible use is to encapsulate 
* one layout manager per device. 
* </p>
* 
* @class LayoutManager
*/
xtiger.editor.LayoutManager = (function LayoutManager() {
  
  /* trick to reserve the lens size into the document */    
  var _fakeDiv; // iff display="inline"
  
  /* Outer container for positioning above a model's handle */
  var _posContainer; 
  
  var _document;
  
  /*
   *  Lazy creation of _fakeDiv
   */
  var _initFakeDiv = function _initFakeDiv() {
    _fakeDiv = xtdom.createElement(_document, 'img');
    _fakeDiv.setAttribute('src', xtiger.bundles.lens.whiteIconURL); // FIXME: use a "lens" bundles ?
    // _fakeDiv.style.verticalAlign = "top"; // FIXME: style could be "copied" from the editor handle
  }
  
  return function(aDocument) {   
                     
    _document = aDocument;
    _posContainer = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(_posContainer, 'axel-layout-container');
    
    this.getFakeDiv = function() {
      if (! _fakeDiv) {
        _initFakeDiv();
      }
      return _fakeDiv;
    };

    this.getLayoutHandle = function() {                         
      return _posContainer;
    };
    
  }

})();   

xtiger.editor.LayoutManager.prototype = { 
                                                         
  // Computes the style distance for aNode set in aDirection
  // Returns a number or 0 if aDirection  is 'auto' it will return 0
  // e.g.: _getDistanceFor(handle, 'top')
  _getDistanceFor : function(aNode, aDirection) {
    var style = xtdom.getComputedStyle(aNode, aDirection),        
        tmp = style.match(/\d*/),
        value = (tmp && tmp[0] && (tmp[0] != '')) ? parseInt(tmp) : 0; 
    return (! isNaN(value)) ? value : 0;
  },
  
  /*
   * For a given model, computes the left and top offsets for the positionable div
   * 
   * @return {int[]} the left and top offset, in an array
   */
   _getOffset : function (aTarget) {
    var _topOffset = 0,
        _leftOffset = 0,
        _hmt, 
        _hml;     
    switch (xtdom.getComputedStyle(aTarget, 'position')) {
      case 'absolute': // unsupported
      case 'fixed': // unsupported
        break;
      case 'relative':
        _topOffset = this._getDistanceFor(aTarget, 'top');
        _leftOffset = this._getDistanceFor(aTarget, 'left');   
        // fall through !
      case 'static':
      default:                    
        _hmt = this._getDistanceFor(aTarget, 'margin-top');
        _hml = this._getDistanceFor(aTarget, 'margin-left');
        _topOffset += (_hmt > 0) ? _hmt : 0;
        _leftOffset += (_hml > 0) ? _hml : 0;
    }                          
    return [_leftOffset, _topOffset];
  },     
        
  _confirmInsertion : function(aModelHandle) {
    var doIt = (! this.curHandle) || (this.curHandle != aModelHandle);
    if (this.curHandle && (this.curHandle != aModelHandle)) { 
      // already in use with another handle, restores it first 
      this.restoreHandle();
    }
    return doIt;
  },
    
  // Gets the display property from a handle and applies it to the top container
  _setDisplay : function (top, aSrcHandle) {
    var _disp = xtdom.getComputedStyle(aSrcHandle, 'display');
    _disp = (/^block$|^inline$/.test(_disp)) ? _disp : 'block';
    top.style.display = _disp;      
  },    
  
  // That methods requires specific axel-layout-container CSS rules in axel.css 
  _setOrigin : function (top, offset, padding) {
    // applies left margin because even 'auto' left margins are not applied
    top.style.left = '' + (offset[0] - padding[0]) + 'px';
    // does not apply top margin because we need to filter getComputedStyle
    // results to detect those who are due to 'auto' margins
    // actually only IE returns 'auto' when no margins have been set
    top.style.top = '' + (offset[1] - padding[1]) + 'px';
  },       
  
  _insert : function(aStyle, aModelHandle, aLensContent, aPadding, aGrabCallback) {
    var top, offset, img,
        padding = aPadding,
        doit = this._confirmInsertion(aModelHandle);
    if (doit) {
      top =  this.getLayoutHandle();
      offset = this._getOffset(aModelHandle);
      this._setDisplay(top, aModelHandle); // FIXME: useless ?
      top.style.visibility = 'hidden';
      if (aStyle == 'above') {
        // inserts the lens inside the document
        aModelHandle.parentNode.insertBefore(top, aModelHandle);
      } else {
        img = this.getFakeDiv();
        // replaces handle with empty image that will "reserve" space
        aModelHandle.parentNode.replaceChild(img, aModelHandle);
        img.parentNode.insertBefore(top, img);        
      }
      // inserts wrapper top level element inside lens 
      top.appendChild(aLensContent);
      if (aGrabCallback)
        padding = aGrabCallback();
      this._setOrigin(top, offset, padding);  
      top.style.visibility = 'visible';
      this.curDisplay = aStyle;
      this.curHandle = aModelHandle;      
      this.curLensContent = aLensContent;
    }
    return doit;
  },
   
  insertAbove : function(aModelHandle, aLensContent, aPadding, aGrabCallback) {
    this._insert('above', aModelHandle, aLensContent, aPadding, aGrabCallback);
  }, 
  
  // Replaces the model handle by the lens container filled 
  // with the lens content, followed by an empty image
  // This works only if the model handle is an inline element 
  insertInline : function(aModelHandle, aLensContent, aPadding, aGrabCallback) { 
    var bbox, w, h, img;
    if (this._insert('inline', aModelHandle, aLensContent, aPadding, aGrabCallback)) {
      // adjusts space filler
      bbox = aLensContent.getBoundingClientRect(); 
      w = bbox ? (bbox.right - bbox.left) : 1;
      h = bbox ? (bbox.bottom - bbox.top) : 1;
      img = this.getFakeDiv();      
      img.style.width = w  + 'px';
      img.style.height = h  + 'px';  
    }
  },
  
  // Restores editor handle view
  restoreHandle : function () { 
    var img;
    if (this.curHandle) {
      if (this.curDisplay == 'inline') {                        
        img = this.getFakeDiv();        
        img.parentNode.replaceChild(this.curHandle, img);
      } else {
        this.curHandle.style.visibility = 'visible';
      }
      xtdom.removeElement(this.curLensContent);
      xtdom.removeElement(this.getLayoutHandle()); // FIXME opera inserts a <br> tag !
      this.curHandle = this.curDisplay = this.curLensContent = undefined;
    }
  }
  
}

/**
 * <p>
 * LensDevice
 * </p>
 * 
 * @class LensDevice
 */
xtiger.editor.LensDevice = function (aDocument) {

  /* the document containing the device */
  var _document = aDocument;

  /* reference to the keyboard device */
  var _keyboard = xtiger.session(aDocument).load('keyboard');

  /* This is a reference to the current edited model (editor in Stephane's terminology) */
  var _currentModel;
  
  /* Currently used lens content wrapper */
  var _currentLCW;

  /* Current lens wrapper top container */
  var _lensView;
  
  /* Layout manager that caches the editor model when it is removed from the DOM */
  var _layoutManager;
  
  /* default values for lens parameters (in case they are not defined in the editor/model) */
  var _defaultParams = {
    trigger : 'click', // 'click' or 'mouseover' DOM events (see awake)     
    display : 'above',
    padding : "10px"
  };
  
  /* To desactivate lens mouse out detection when homing back from a modal dialog */
  var _checkMouseReturn = false;
  
  /* If true, the wrapper is never released. The value is set with the keepAlive() method */
  var _keepAlive = false;
  
  /* closure variable */
  var _this = this;
  
  /* named event handlers */
  var _dismissHandlers = {
    'click' : ['click', function (ev) { _this._onClick(ev) }],
    'mouseover' : ['mousemove', function (ev) { _this._onMouseMove(ev) }]
  };
  
  /*
   * Returns the parameter holds by the given model
   */
  var _getParam = function(name, aModel) {
    return (aModel.getParam && aModel.getParam(name)) || _defaultParams[name];
  };
  
  var _getLayoutManager = function() {
    if (! _layoutManager) {
      _layoutManager = new xtiger.editor.LayoutManager(_document);
    }
    return _layoutManager; 
  };
  
  var _getWrapperFor = function(aName) {   
    var w = xtiger.factory('lens').getWrapper(_document, aName);    
    if (!w) {
      xtiger.cross.log('warning', 'Missing wrapper "' + aWrapperName + '" in lens device, startEditing aborted')
    }
    return w;
  };
  
  var _grabWrapper = function(aDeviceLens, aWrapperName, doSelect, aPadding) {    
    var res;
    try {
      res = _currentLCW.grab(aDeviceLens, doSelect, aPadding);      
    } catch (e) {
      xtiger.cross.log('error ( ' + e.message + ' ) "', aWrapperName + '" failed to grab the lens device, startEditing compromised' );
    }                                                         
    return res || aPadding;
  };
  
  var _terminate = function(that, doUpdateModel) {
    if (! that.isEditing())
        return; // was not in an edition process

    if (_currentLCW.isFocusable()) {
      _keyboard.unregister(that, that._handlers);
    }     
    _getLayoutManager().restoreHandle();

    // end of event management to control when to dismiss the lens
    var mode = _getParam('trigger', _currentModel);
    if (_dismissHandlers[mode]) { 
      xtdom.removeEventListener(_document, _dismissHandlers[mode][0], _dismissHandlers[mode][1], true);
      _checkMouseReturn = false;
    }
          
    if (doUpdateModel) {
      // transfers data from the lens to the editor model
      _currentModel.update(_currentLCW.getData());
    }

    // release MUST make the lens invisible
    // not that this is not symmetrical with grab as it was done in the layout manager
    _currentLCW.release();

    // resets lens sate
    _currentModel = null;     
    _currentLCW = null;
    _lensView = null;    
  }; 
      
  /* ##################################
   * ###### EDITION PROCESS MGMT ######
   */
  
  /**
   * Starts an edition process on the given model, using the lens content
   * specified in parameter.
   * 
   * @param {Model}
   *            aModel A model containing the data to edit
   * @param {string}
   *            aWrapperName The name of the lens content to use
   * @param {boolean}
   *            aDoSelect Select the field at grabbing time
   */
  this.startEditing = function startEditing (aModel, aWrapperName, aDoSelect) {   
    // xtiger.cross.log('debug', 'startEditing');
    var display, tmp, padding, mode;   
    var doSelect = aDoSelect ? true : false; // sanitization
    
    if (this.isEditing())
      this.stopEditing();     
    _currentLCW = _getWrapperFor(aWrapperName);   
    if (_currentLCW) {
      _currentModel = aModel;
      
      // keyboard focus management
      if (_currentLCW.isFocusable()) {
        this._handlers = _keyboard.register(this);
        _keyboard.grab(this, aModel);
      }               
                              
      // extracts desired padding for the model parameters
      tmp = _getParam('padding', aModel).match(/\d*/)[0];
      tmp = (padding && padding != '') ? parseInt(padding) : 10; 
      padding = [tmp, tmp];
      
      // replaces handle with lens and asks wrapper to grab the device
      _lensView = _currentLCW.getHandle();
      display = _getParam('display', _currentModel)
      if (display == 'above') {
        _getLayoutManager().insertAbove(_currentModel.getHandle(), _lensView, padding,
          function() { return _grabWrapper(_this, aWrapperName, doSelect, padding) }); 
      } else if (display == 'inline') {
        _getLayoutManager().insertInline(_currentModel.getHandle(), _lensView, padding, 
          function() { return _grabWrapper(_this, aWrapperName, doSelect, padding) });
      } else {
         xtiger.cross.log('error', 'unkown display "' + display + '" in lens device, startEditing compromised');
      }                                   
      
      // activates wrapper
      _currentLCW.activate(this, aDoSelect);
      
      mode = _getParam('trigger', aModel);
      if (_dismissHandlers[mode]) { 
        // currently we do our own event peeking at the document level !
        xtdom.addEventListener(_document, _dismissHandlers[mode][0], _dismissHandlers[mode][1], true);
        _checkMouseReturn = false;
      } else {
        xtiger.cross.log('error', 'unkown trigger mode "' + mode + '" in lens device, startEditing compromised');
      } 
    }
  };

  /**
   * <p>
   * Stops the edition process on the current model. Fetches the data from
   * the device and update the model.
   * </p>
   */
  this.stopEditing = function stopEditing () {
    // xtiger.cross.log('debug', 'stopEditing');
    _terminate(this, true); 
  };
  
  /**
   * <p>
   * Stops the current editing process without making any changes to the
   * model. A further version may even want to restore the "original"
   * state of the model, that is, the state the model had at device's
   * grabbing time.
   * </p>
   */
  this.cancelEditing = function cancelEditing () {
    _terminate(this, false); 
  };

  /**
   * <p>
   * Returns true if the device is in an edition process, false otherwise.
   * </p>
   * 
   * @return {boolean} True if the device is editing
   */
  this.isEditing = function isEditing () {
    return _currentModel ? true : false;
  };
  
  /**
   * <p>
   * Returns the handle of the device if the later is in an edition
   * process. Returns null otherwise. The handle is the one belonging to
   * the editing facility, not the one belonging to the model.
   * </p>
   * 
   * @return {HTMLElement} The handle of the wrapped field
   */
  this.getHandle = function getHandle () {
    if (_currentLCW)
      return _currentLCW.getHandle();
    return null;
  };
  
  /**
   * <p>
   * Returns the current model using this device, null if the device is
   * unused.
   * </p>
   * 
   * @return {Model} The model using this device
   */
  this.getCurrentModel = function getCurrentModel () {
    if (_currentModel)
      return _currentModel;
    return null;
  };
  
  /**
   * <p>
   * The method is used to tell the device to stay alive whatever event
   * may occurs, at the exception of the grabbing of the device by another
   * model.
   * </p>
   * 
   * @param {boolean}
   *            aAlive If true, the device stays alive even if the events
   *            tells it to disappear
   */
  this.keepAlive = function keepAlive (aAlive) {
    _keepAlive = aAlive;
  };

  /* ##############################
   * ###### EVENTS LISTENERS ######
   */
  
  this._onClick = function (ev) {
    if(_keepAlive)
      return;
    // any click outside of the _lensView will stop editing
    var outside = true;
    var target = xtdom.getEventTarget(ev);
    while (target.parentNode) {
      if (target == _lensView) {
        outside = false;
        break;
      }       
      target = target.parentNode;
    } 
    if (outside) { // FIXME: not sure what happens if the user clicked on another lens
      this.stopEditing();
    }
  };

  /**
   *  Handler to detect when the mouse is leaving the lens
   */   
  this._onMouseMove = function (ev) {
    if(_keepAlive || (! _lensView))
      return;
    var _mouseX = ev.clientX;
    var _mouseY = ev.clientY;
    var _bb = _lensView.getBoundingClientRect();
    if (_checkMouseReturn) {
      if (! (_bb.left > _mouseX || _bb.top > _mouseY || _bb.right <= _mouseX || _bb.bottom <= _mouseY)) {
        _checkMouseReturn = false; // ok mouse is back
      }
    } else if (_bb.left > _mouseX || _bb.top > _mouseY || _bb.right <= _mouseX || _bb.bottom <= _mouseY) {
      this.stopEditing();
      xtdom.stopPropagation(ev);        
    }
  }

  this.doKeyUp = function doKeyUp (ev) {
    // nope
  };
  
  /**
   * Handler for intercepting arrow keys' actions. Asks the lens content wrapper to toggle between
   *the fields.
   *
   * @param {KeyboardEvent} ev The event where to fetch the key code
   */
  this.doKeyDown = function doKeyDown (ev) {
    if (!this.isEditing())
      return; // Safety guard
    if (ev.keyCode == "38" || ev.keyCode == "40")
      _currentLCW.toggleField();
    if (ev.keyCode == "27") // ESC
      this.cancelEditing();
    xtdom.stopPropagation(ev);
  };
  
  // A wrapper should call this method in case it opens a modal dialog box that may cause 
  // the mouse to move outside the lens (e.g. an input form file input dialog)
  // In that case the device should be careful not to close the lens when the mouse is moving out
  this.mouseMayLeave = function mouseMayLeave () {
    _checkMouseReturn = true; // Flag set to not dismiss lens on mouse move
  };
  
}

/** 
 * <p>
 * Manages dynamic creation of LensDevice, one per application.
 * </p>
 * 
 * @class LensDeviceFactory
 */
xtiger.editor.LensDeviceFactory = function () {
  this.devKey = 'LensDeviceCache';
  this.wrappers = {}; // wrapper constructors
} 

xtiger.editor.LensDeviceFactory.prototype = {
  
  /* 
   * Gets or create cache to store devices and wrappers on a per-document basis
   * @private
   */
  _getCache : function (doc) {
    var cache = xtiger.session(doc).load(this.devKey);
    if (! cache) {
      cache = {'device' : null,
               'wrappers' : {} // instantiated wrappers per-document
          };
      xtiger.session(doc).save(this.devKey, cache);
    }
    return cache;
  },
  
  /**
   * <p>
   * Registers a lens wrapper <em>factory</em> for the lens device.
   * </p>
   *  
   * @param {string} aKey
   * @param {function} aWrapperFactory
   * 
   * @see #getWrapper()
   */
  registerWrapper : function (aKey, aWrapperFactory) {
    if (this.wrappers[aKey]) {
      xtiger.cross.log('error', "Error (AXEL) attempt to register an already registered wrapper : '" + aKey + "' with 'lens' device !");
    } else {
      this.wrappers[aKey] = aWrapperFactory;
    }
  },
  
  /**
   * 
   * @param {DOMDocument} aDocument 
   * @param {string} aKey
   * @return {LensWrapper}
   */
  getWrapper : function (aDocument, aKey) {
    var cache = this._getCache(aDocument);
    var wrapper = cache['wrappers'][aKey];
    if (! wrapper) {
      var wConstructor = this.wrappers[aKey]; // Checks that constructor is known
      if (wConstructor) {
        wrapper = cache['wrappers'][aKey] = wConstructor(aDocument);
      }
    }
    if (! wrapper) {
      xtiger.cross.log('error', "Error (AXEL) : unkown wrapper '" + aKey + "' requested in 'lens' device !");
    }
    return wrapper;
  },
  
  /**
   * <p>
   * Gets the device's instance. At first call, the device is instanciated
   * and the created object is stored. This object will be returned for
   * every further calls given <em>the same document</em>. That is to
   * say, one device is (lazily) created per document.
   * </p>
   * 
   * @param {DOMDocument}
   *            aDocument A DOM document to contain the device
   * @return {LensDevice} The device for the given document
   */
  getInstance : function (aDocument) {
    var cache = this._getCache(aDocument);
    var device = cache['device'];
    if (! device) {
      device = cache['device'] = new xtiger.editor.LensDevice(aDocument);       
    }
    return device;
  }
}

// Resource registration
xtiger.resources.addBundle('lens', 
  { 'whiteIconURL' : 'white.png' } );

xtiger.registry.registerFactory('lens', new xtiger.editor.LensDeviceFactory()); 