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
 * Author(s) : Stephane Sire (Oppidoc)
 * 
 * ***** END LICENSE BLOCK ***** */
 
///////////////////////////////////////////////////////////////////
// NOTES :  
// - this filter requires JQuery and JQuery UI datepicker !!!
// - DO NOT CHAIN this filer
///////////////////////////////////////////////////////////////////

 (function(){
   
   var DEFAULT_REGION = 'fr';
   var DEFAULT_FORMAT = 'ISO_8601';
   
   // FIXME: move to bundles ?
   var REGION = { 
       'fr': {
             closeText: 'Fermer',
             prevText: 'Précédent',
             nextText: 'Suivant',
             currentText: 'Aujourd\'hui',
             monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
             monthNamesShort: ['Janv.','Févr.','Mars','Avril','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
             dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
             dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
             dayNamesMin: ['D','L','M','M','J','V','S'],
             weekHeader: 'Sem.',
             dateFormat: 'dd/mm/yy',
             firstDay: 1,
             isRTL: false,
             showMonthAfterYear: false,
             yearSuffix: ''
           }
   };

   // converts a date string between two different formats
   // leave it unchanged in case of errot
   // FIXME: some formats such as RSS also requires to pass Day and Month name options !!!!
   var _convertDate = function ( editor, dateStr, inSpec, outSpec ) {
     var inFormat = editor.getParam(inSpec) || DEFAULT_REGION;
     var outFormat = editor.getParam(outSpec) || DEFAULT_FORMAT;
     if (inSpec === 'date_region') { // double indirection
       inFormat = REGION[inFormat] ? REGION[inFormat].dateFormat : $.datepicker.regional[''].dateFormat;
       outFormat = $.datepicker[outFormat];
     }
     if (outSpec === 'date_region') { // double indirection
       inFormat = $.datepicker[inFormat];
       outFormat = REGION[outFormat] ? REGION[outFormat].dateFormat : $.datepicker.regional[''].dateFormat;
     }
     var res = null;
     try {
       res = $.datepicker.formatDate(outFormat,$.datepicker.parseDate(inFormat, dateStr));
     }
     catch (e) {
       res = dateStr;
     }
     return res;
   };
   
   /*****************************************************************************\
   |                                                                             |
   | jQuery date picker device                                                   |
   |                                                                             |
   | FIXME:  - move to separate file                                             |
   \*****************************************************************************/
   var datepickerDevice = function ( doc ) {
     var _this = this;
     this.handle = xtdom.createElement(doc, 'input');
     this.jhandle = $(this.handle).attr({'id' : 'xt-date-datepicker', 'size' : 10});
     $('body', doc).append(this.handle);
     this.jhandle.datepicker().datepicker('option', 'onClose', function () { _this.onClose() });
     this.myDoc = doc;
     this.cache = {};
   };

   datepickerDevice.prototype = {
     // Replaces the editor's handle with the date picker input
     // Somehow similar to PlacedField in text device
     // Replaces the handle with a hook that has the same root element as the handle
     // and that contains an input or textarea edit field
     // FIXME: register keyboard manager to track TAB navigation ?
     grab : function ( editor, doSelectAll ) {
       var _htag, region = editor.getParam('date_region') || DEFAULT_REGION;
       $.datepicker.setDefaults((region === 'fr') ? REGION['fr'] : $.datepicker.regional['']);
       this.jhandle.val(editor.getData()); // FIXME: format data to date (?)
       this.editorHandle = editor.getHandle();
       this.model = editor;
       _htag = xtdom.getLocalName(this.editorHandle); 
       if (! this.cache[_htag]) {
         this.hook = xtdom.createElement(this.myDoc, _htag);
         this.cache[_htag] = this.hook;
       } else {
         this.hook = this.cache[_htag];
       }
       var parent = this.editorHandle.parentNode;  
       if (this.hook.firstChild != this.handle) {
         this.hook.appendChild(this.handle);
       }
       parent.insertBefore (this.hook, this.editorHandle, true);
       parent.removeChild(this.editorHandle);
       if (doSelectAll) {
         xtdom.focusAndSelect(this.handle);
       } else {
         this.jhandle.datepicker('show');
       }
       this.closingInProgress = false;
     },
     release : function ( isCancel ) {
       var parent = this.hook.parentNode;
       parent.insertBefore (this.editorHandle, this.hook, true);
       parent.removeChild(this.hook);
       if (! isCancel) {
         this.model.update(this.jhandle.val()); // updates model with new value
       }
       if (! this.closingInProgress) { // external call (e.g. TAB navigation ?)
         this.closingInProgress = true;
         this.jhandle.datepicker('hide');
       }
     },
     onClose : function ( ) {
       if (! this.closingInProgress) {
         this.release();
       }
     }
   };

   xtiger.registry.registerFactory('datepickerdev', 
     {
       getInstance : function (doc) {
         var cache = xtiger.session(doc).load('datepickerdev');
         if (! cache) {
           cache = new datepickerDevice(doc);
           xtiger.session(doc).save('datepickerdev', cache);
         }
         return cache;
       }
     }
   );

   var datepickerFilterMixin = {  

     // Property remapping for chaining
     '->': {
       'load' : '__datepickerSuperLoad',
       'save' : '__datepickerSuperSave'
     },

     startEditing : function ( aEvent ) {
       var _doSelect = aEvent ? (!this._isModified || aEvent.shiftKey) : false;
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.grab(this, _doSelect);
     },

     stopEditing : function ( isCancel ) {
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.release(isCancel);
     },
     
     load : function (aPoint, aDataSrc) {
       this.__datepickerSuperLoad(aPoint, aDataSrc);
       // post-action : converts view data to date_region format
       this._setData(_convertDate(this, this._data, 'date_format', 'date_region'));
     },

     save : function (aLogger) {
       var tmp = this._data;
       // pre-action : converts view data model to date_format
       this._data = _convertDate(this, tmp, 'date_region', 'date_format');
       this.__datepickerSuperSave(aLogger);
       this._data = tmp; // reestablish it for next save
     }
   }

   // Expose the filter to the 'text' plugin (i.e. text.js must have been loaded)
   xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('date', datepickerFilterMixin);

 })();