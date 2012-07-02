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
 * Author(s) : Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */


// Float the parent of the editor element left or right
// Inserts two icons with "reflow left" and "reflow right" class
xtiger.editor.LayoutFactory = (function LayoutFactory() {

  var _DEFAULT_PARAMS = {
    marker : 'reflow'
  };

  var _LayoutModel = function(aHandleNode, aDocument) {
    this._params = _DEFAULT_PARAMS;
    this._defaultData = undefined;
    this._handle = aHandleNode;
    this._document = aDocument;
    this._data = undefined;
    this._seed = undefined;
  };    

  _LayoutModel.prototype = {

    init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      this._defaultData = aDefaultData; // default value
      if (aParams) { // parameter(s)
        if (typeof(aParams) === 'string')
          xtiger.util.decodeParameters(aParams, this._params);
        else if (typeof(aParams) === 'object')
          this._params = aParams;
      }
      this._data = this._defaultData; 
      this.awake();
    },

    makeSeed : function () {
      if (!this._seed)
        this._seed = [ xtiger.editor.LayoutFactory, this._defaultData, this._params ];
      return this._seed;
    },
    
    remove : function () {
    },

    can : function (aFunction) {
      return typeof this[aFunction] == 'function';
    },

    execute : function (aFunction, aParam) {
      return this[aFunction](aParam);
    },

    load : function (aPoint, aDataSrc) {
      var _value;
      if (aPoint !== -1) { 
        _value = aDataSrc.getDataFor(aPoint);
      }
    },

    save : function (aLogger) {
      if (!this._data)
        return;
      aLogger.write(this._data);
    },

    getParam : function (aKey) {
      return this._params[aKey];
    },

    isFocusable : function () { return false },
    
    focus : function () {},

    unfocus : function () {},

    awake : function () {
      var _this = this, cur;
      if (cur = this._handle.childNodes[0]) { // first img per construction
        xtdom.addEventListener(cur, 'click', function(ev) { _this.doReflow(ev); }, true);
        xtiger.cross.log('debug', 'layout editor subscribe to first image');
      }
      if (cur = this._handle.childNodes[1]) { // second img per construction
        xtdom.addEventListener(cur, 'click', function(ev) { _this.doReflow(ev); }, true);
        xtiger.cross.log('debug', 'layout editor subscribe to second image');
      }
    },

    doReflow : function ( ev ) {
      var target = ev.target;
      var b2f; // box to float - FIXME: use marker ?
      b2f = this._handle.parentNode;
      if (target.className.search('left') !== -1) { // left 
        xtdom.addClassName(b2f, 'left');
      } else { // assumes rigth 
        xtdom.removeClassName(b2f, 'left');
      }
    }
  }; 

  return {

    // The handle is an empty span not displayed
    createModel : function createModel (aContainer, aXTUse, aDocument) {
      var _handle = xtdom.createElement(aDocument, 'span');
      // flow left icon
      var _img = xtdom.createElement(aDocument, 'img');
      xtdom.setAttribute(_img, 'src', xtiger.bundles.layout.leftIconURL);
      xtdom.addClassName(_img, 'reflow left'); // FIXME: use marker
      _handle.appendChild(_img);
      // flow right icon
      _img = xtdom.createElement(aDocument, 'img');
      xtdom.setAttribute (_img, 'src', xtiger.bundles.layout.rightIconURL);
      xtdom.addClassName(_img, 'reflow right'); // FIXME: use marker
      _handle.appendChild(_img);
      aContainer.appendChild(_handle);
      return _handle;
    },

    createEditorFromTree : function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
      var _data = xtdom.extractDefaultContentXT(aXTUse);
      var _model = new _LayoutModel(aHandleNode, aDocument);
      _model.init(_data, aXTUse.getAttribute('param'));
      return _model;
    },

    createEditorFromSeed : function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _model = new _LayoutModel(aClone, aDocument);
      var _defaultData = aSeed[1];
      var _params = aSeed[2];
      _model.init(_defaultData, _params, aRepeater);
      return _model;
    },
  }
})();

// Resource registration
xtiger.resources.addBundle('layout',
  { 'leftIconURL' : 'left.png', 'rightIconURL' : 'right.png' } );

xtiger.editor.Plugin.prototype.pluginEditors['reflow'] = xtiger.editor.LayoutFactory;
