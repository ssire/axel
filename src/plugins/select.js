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
 * Class SelectFactory (static)
 * @class TextFactory
 * @version beta
 */
xtiger.editor.SelectFactory = (function SelectFactory() {  
  
  var _DEFAULT_param = {    
    select_dispatch : 'value' // alternative is 'display'
  };
  
  var _getDevice = function _getDevice(doc) {
    var devKey = 'popupdevice';
    var device = xtiger.session(doc).load(devKey);
    if (! device) {  // lazy creation
      device = new xtiger.editor.PopupDevice(doc); // hard-coded device for this model
      xtiger.session(doc).save(devKey, device);
    }
    return device;
  };                             
        
  // Splits string s on every space not preceeded with a backslash "\ "
  // Returns an array
  var _split = function _split(s) {
    var res;
    if (s.indexOf("\\ ") == -1) {
      return s.split(' ');
    } else {     
      res = s.replace(/\\ /g, "&nbsp;");
      return xtiger.util.array_map(res.split(' '), function (e) {
        return e.replace(/&nbsp;/g, " ")
        });
    }
  };
  
  /**
   * Model class for a list selection editor (i.e. select one item in a list)
   * There should be only one model class per application per plugin type
   * @name _SelectModel
   * @class _SelectModel
   */
  var _SelectModel = function(aHandleNode, aDocument) {
    this.handle = aHandleNode;
    this.isOptional = undefined; // otherwise 'set' or 'unset' when it is optional
    this.isOptionSet = false; // iff this.isOptional is not null 
    this._data = null; // contains the model data (not the i18n version)    
  };               
  
  /** @memberOf _SelectModel */
  _SelectModel.prototype = {

    //////////////////////////
    // Plugin API accessors
    //////////////////////////

    getParam : function (name)  {
      return this.param ? (this.param[name] || _DEFAULT_param[name]) : _DEFAULT_param[name];
    },

    isFocusable : function () {
      return false; // no keyboard control
    },

    getHandle : function () {
      return this.handle;
    }, 

    // Checks if an editor can do a given action
    can : function (action) {
      return false;
    },
    
    //////////////////////////
    // Plugin API (filterable)
    //////////////////////////
    
    init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) { 
      this.param = aParams; // i18nFilter needs it
      this.defaultScreenData = aDefaultData; // directly in screen (localized) form
      this.device = _getDevice(this.handle.ownerDocument);
      
      if (this.getParam('hasClass')) {
        xtdom.addClassName(this.handle, this.getParam('hasClass'));
      }   
                                   
      this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
      
      if (aOption) { // editor is optional
        var check = this.handle.previousSibling;
        this.isOptional = aOption.toLowerCase();
        if (this.isOptional == 'unset')
          this.isOptionSet = true; // Quirk to prevent unset to return immediately
        (this.isOptional == 'set') ? this.set(false) : this.unset(false);
      }
      this.awake ();  
    },   

    awake : function () {     
        var _this = this;       
      xtdom.addEventListener(this.handle, 'click', 
        function (ev) { _this.startEditing(ev) }, true);                                   
      if (this.isOptional !== undefined) {
        var check = this.handle.previousSibling;
        xtdom.addEventListener (check, 'click', 
          function (ev) { _this.isOptionSet ? _this.unset(true) : _this.set(true); },
            true);  
      }       
    },
    
    duplicate : function() {
    },
    
    load : function (point, dataSrc) {  
      if (point !== -1) {
        var value = dataSrc.getDataFor(point);
        if (value) {
          this._setData(value);
        }
        this.set(false);      
      } else {           
        this.clear(false);
      }
    },        

    save : function (logger) { 
      if ((this.isOptional === undefined) || (this.isOptionSet)) {
        logger.write(this._data);
      } else {   
        logger.discardNodeIfEmpty();
      }
    },     
    
    // N/A not focusable
    // focus : function() {
    // },

    startEditing : function(aEvent) {     
      var options = this.getParam('values');
      var _options = ('string' != typeof(options[0])) ? options[0] : options; // checks if values contains [i18n, values]
      this.device.startEditing(this, _options, this.i18nFilter(this._data, true), this.getHandle());
        // uses this._data as the mode is the i18n version of the label
    },
                                                     
    // Returns model data (not the i18n version)
    getData : function() {  
      var val = (this.getParam('select_dispatch') == 'value') ? this._data : this.i18nFilter(this._data, true);
      return val;
    },
    
    // N/A not focusable
    // unfocus : function() {
    // },
                       
    // NOT CALLED FOR THIS EDITOR
    stopEditing : function() {
    },
            
                      
    // aData is the universal value and not the localized one
    update : function(aData) {                            
      var val = (this.getParam('select_dispatch') == 'value') ? aData : this.i18nFilter(aData, false);
      if (val == this._data) { // no change
        return;
      }
      this._setData(val);
      this.set(true);
    },
    
    _setData : function (value, display) {  
      var d = display || this.i18nFilter(value, true);
      if (this.handle.firstChild)
        this.handle.firstChild.data = d;
      this._data =  value;
    },
    
    clear : function(doPropagate) { 
      this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
      if (this.isOptional !== undefined)
        this.unset(doPropagate);
    },

    set : function(doPropagate) {
      // propagates state change in case some repeat ancestors are unset
      if (doPropagate) {
        xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle());
      }
      if (this.isOptionSet) // Safety guard (defensive)
        return;
      this.isOptionSet = true;
      if (this.isOptional !== undefined) {                     
        var check = this.handle.previousSibling;
        check.checked = true;
        xtdom.replaceClassNameBy(this.handle, 'axel-option-unset', 'axel-option-set');
      }            
    },

    unset : function(doPropagate) { 
      if (!this.isOptionSet) // Safety guard (defensive)
        return;
      this.isOptionSet = false;
      if (this.isOptional !== undefined) {
        var check = this.handle.previousSibling;
        xtdom.replaceClassNameBy(this.handle, 'axel-option-set', 'axel-option-unset');
        check.checked = false;
      }     
    },

    remove : function() {
    },     
    
    //////////////////////////
    // Internal methods
    //////////////////////////
    
    // The seed is a data structure that should allow to "reconstruct" a cloned editor in a <xt:repeat>
    makeSeed : function () {
      if (! this.seed) { // lazy creation
        this.seed = [xtiger.editor.SelectFactory, this.defaultScreenData, this.param, this.isOptional];
      }
      return this.seed;
    },    
      
    // Handles popup menu selection
    onMenuSelection : function (value) {  
      if (this.getParam('select_dispatch') == 'value') {
        this.update(this.i18nFilter(value, false));   
      } else {                                          
        this.update(value);
      }
    },  

    // Converts i18n choices to non-i18n values
    // If xmlToLabel is true conversion occurs from XML value to displayed label
    // the other way around otherwise
    i18nFilter : function (value, xmlToLabel) {
      var selected = value;
      var options = this.getParam('values');
      if (! options) {
        throw({name: 'TemplateError', 
             message: 'missing "values" attribute in xt:attribute element'});
      }
      if ('string' != typeof(options[0])) { // values contains [i18n, values]
        var src = options[xmlToLabel ? 1 : 0];
        var target = options[xmlToLabel ? 0 : 1];
        for (var i = 0; i < src.length; i++) { // translate i18n value to XML value
          if (value == src[i]) {
            if (i < target.length ) { // sanity check
              selected = target[i];
            } else {
              selected = "**Error**";
            }
            break;
          }
        }
      } 
      return selected;
    }
    
  }   

  return {     

    // creates the list <select> with <option> based on content of values 
    createModel : function (container, useNode, curDoc) {
      var viewNode = xtdom.createElement (curDoc, 'span');
      var t = xtdom.createTextNode(curDoc, '');
      viewNode.appendChild(t);
      xtdom.addClassName (viewNode, 'axel-core-editable');
      // manages optional editor
      var option = useNode.getAttribute('option');
      if (option) {
        var check = xtdom.createElement (curDoc, 'input');
        xtdom.setAttribute(check, 'type', 'checkbox');             
        xtdom.addClassName(check, 'axel-option-checkbox');             
        container.appendChild(check);           
      }
      container.appendChild(viewNode);     
      return viewNode;
    },       

    createEditorFromTree : function (handleNode, xtSrcNode, curDoc) {
      var data = xtdom.extractDefaultContentXT(xtSrcNode); // @default
      var _model = new _SelectModel(handleNode, curDoc);
      
      // creates a parameter set, implements filter(s)
      var _param = {}; 
      xtiger.util.decodeParameters(xtSrcNode.getAttribute('param'), _param);
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
        
      // completes the parameter set
      var values = xtSrcNode.getAttribute('values');
      var i18n = xtSrcNode.getAttribute('i18n');        
      var _values = values ? _split(values) : 'null';
      var _i18n = i18n ? _split(i18n) : false;
      _param['values'] = _i18n ? [_i18n,  _values] : _values;
      
      // init
      _model.init(data, _param, xtSrcNode.getAttribute('option'), 'nokey'); 
        // FIMXE: add unique key
        
      return _model;
    },                          

    createEditorFromSeed : function (aSeed, aClone, aDocument, aRepeater) {
      var _model = new _SelectModel(aClone, aDocument);
      var _defaultScreenData = aSeed[1];
      var _param = aSeed[2];
      var _option = aSeed[3];
      if (_param['filter'])
        _model = this.applyFilters(_model, _param['filter']);
      _model.init(_defaultScreenData, _param, _option, 'nokey', aRepeater);
      return _model;    
    }     
  }
  
})();

xtiger.editor.Plugin.prototype.pluginEditors['select']
  = xtiger.util.filterable('select', xtiger.editor.SelectFactory);
