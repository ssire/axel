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

(function ($axel) {

  // Plugin static view: span showing current selected option
  var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var viewNode = xtdom.createElement (aDocument, 'span');
   var t = xtdom.createTextNode(aDocument, '');
   viewNode.appendChild(t);
   xtdom.addClassName (viewNode, 'axel-core-editable');
   aContainer.appendChild(viewNode);
   return viewNode;
  };

  var _Editor = (function () {
 
   function _getDevice ( doc ) {
     var devKey = 'popupdevice';
     var device = xtiger.session(doc).load(devKey);
     if (! device) {  // lazy creation
       device = new xtiger.editor.PopupDevice(doc); // hard-coded device for this model
       xtiger.session(doc).save(devKey, device);
     }
     return device;
   }

   // Splits string s on every space not preceeded with a backslash "\ "
   // Returns an array
   function _split ( s ) {
     var res;
     if (s.indexOf("\\ ") === -1) {
       return s.split(' ');
     } else {
       res = s.replace(/\\ /g, "&nbsp;");
       return xtiger.util.array_map(res.split(' '), 
          function (e) { return e.replace(/&nbsp;/g, " "); }
        );
     }
   }
 
   return {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       this.defaultScreenData = aDefaultData; // directly in screen (localized) form
       this.device = _getDevice(this.getDocument());
       if (this.getParam('hasClass')) {
         xtdom.addClassName(this._handle, this.getParam('hasClass'));
       }   
       this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
     },

     // Awakes the editor to DOM's events, registering the callbacks for them
     onAwake : function () {
       var _this = this;       
       xtdom.addEventListener(this._handle, 'click', function (ev) { _this.startEditing(ev); }, true);
     },

     onLoad : function (aPoint, aDataSrc) {
       var value;
       if (aPoint !== -1) {
         value = aDataSrc.getDataFor(aPoint);
         if (value) {
           this._setData(value);
         }
         this.set(false);
       } else {
         this.clear(false);
       }
     },

     onSave : function (aLogger) {
       if ((!this.isOptional()) || this.isSet()) {
         aLogger.write(this._data);
       } else {   
         aLogger.discardNodeIfEmpty();
       }
     },

     ////////////////////////////////
     // Overwritten plugin methods //
     ////////////////////////////////

     api : {
     
       // FIXME: first part is copied from Plugin original method, 
       // an alternative is to use derivation and to call parent's method
       _parseFromTemplate : function (aXTNode) {
         var tmp;
         this._param = {};
         xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
         this._content = xtdom.extractDefaultContentXT(aXTNode);
         tmp = aXTNode.getAttribute('option');
         this._option = tmp ? tmp.toLowerCase() : null;
         // completes the parameter set
         var values = aXTNode.getAttribute('values');
         var i18n = aXTNode.getAttribute('i18n');        
         var _values = values ? _split(values) : 'null';
         var _i18n = i18n ? _split(i18n) : false;
         this._param.values = _i18n ? [_i18n,  _values] : _values;
       }
     },

     /////////////////////////////
     // Specific plugin methods //
     /////////////////////////////

     methods : {
     
       _setData : function (value, display) {
         var d = display || this.i18nFilter(value, true);
         if (this._handle.firstChild) {
           this._handle.firstChild.data = d;
         }
         this._data =  value;
       },
     
       // Returns model data (not the i18n version)
       getData : function() {  
         var val = (this.getParam('select_dispatch') === 'value') ? this._data : this.i18nFilter(this._data, true);
         return val;
       },
     
       startEditing : function(aEvent) {     
         var _options, options = this.getParam('values');
         if (options) {
           _options = ('string' !== typeof(options[0])) ? options[0] : options; // checks if values contains [i18n, values]
           this.device.startEditing(this, _options, this.i18nFilter(this._data, true), this.getHandle());
            // uses this._data as the mode is the i18n version of the label
         }
       },

       // NOT CALLED FOR THIS EDITOR
       stopEditing : function() {
       },

       // aData is the universal value and not the localized one
       update : function(aData) {                            
         var val = (this.getParam('select_dispatch') === 'value') ? aData : this.i18nFilter(aData, false);
         if (val === this._data) { // no change
           return;
         }
         this._setData(val);
         this.set(true);
       },

       clear : function(doPropagate) { 
         this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
         if (this.isOptional()) {
           this.unset(doPropagate);
         }
       },
     
       // Handles popup menu selection
       onMenuSelection : function (value) {  
         if (this.getParam('select_dispatch') === 'value') {
           this.update(this.i18nFilter(value, false));
         } else {
           this.update(value);
         }
       },  

       // Converts i18n choices to non-i18n values
       // If xmlToLabel is true conversion occurs from XML value to displayed label
       // the other way around otherwise
       i18nFilter : function (value, xmlToLabel) {
         var i, selected = value,
             options = this.getParam('values');
         if (! options) {
           xtiger.cross.log('error', 'missing "values" attribute in "select" plugin declaration');
         } else if ('string' !== typeof(options[0])) { // values contains [i18n, values]
           var src = options[xmlToLabel ? 1 : 0];
           var target = options[xmlToLabel ? 0 : 1];
           for (i = 0; i < src.length; i++) { // translate i18n value to XML value
             if (value === src[i]) {
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
   };
  }());

  $axel.plugin.register(
    'select', 
    { filterable: true, optional: true },
    { 
     select_dispatch : 'value'  // alternative is 'display'
    },
    _Generator,
    _Editor
  );
}($axel));
