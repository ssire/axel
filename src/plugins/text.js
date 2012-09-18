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

 (function ($axel) {

   var _Generator = function ( aContainer, aXTUse, aDocument ) {
     var htag = aXTUse.getAttribute('handle') || 'span',
         h = xtdom.createElement(aDocument, htag),
         t = xtdom.createTextNode(aDocument, '');
     h.appendChild(t);
     xtdom.addClassName(h, 'axel-core-on');
     aContainer.appendChild(h);
     return h;
   };

   var _Editor = {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       var devfactory, 
           devname = this.getParam('device');
       if ((! aDefaultData) || (typeof aDefaultData !== 'string')) { 
         this._content = 'click to edit'; // FIXME: setDefaultData() ? finalize API...
       }
       this._data = this.getDefaultData(); // Quirck in case _setData is overloaded and checks getDefaultData()
       this._setData(this._data);
       if (this.getParam('hasClass')) {
         xtdom.addClassName(this._handle, this.getParam('hasClass'));
       }
       devfactory = devname ? xtiger.factory(devname) : xtiger.factory(this.getParam('defaultDevice'));
       this._device = devfactory.getInstance(this.getDocument(), this.getParam('type'), this.getParam('layout'));
        // HTML element to represents an editor containing no data 
       this._noData = this._handle.firstChild; // ?
     },

     // Awakes the editor to DOM's events, registering the callbacks for them
     onAwake : function () {
       var _this = this;
       if (!this.getParam('noedit')) {
         xtdom.addClassName(this._handle, 'axel-core-editable');
         xtdom.addEventListener(this._handle, 'click', 
           function(ev) { _this.startEditing(ev); }, true);
       }
     },

     onLoad : function (aPoint, aDataSrc) {
       var _value, _default;
       if (aPoint !== -1) { 
         _value = aDataSrc.getDataFor(aPoint);
         _default = this.getDefaultData();
         this._setData(_value || _default);
         this.setModified(_value !==  _default);
         this.set(false);
       } else {
         this.clear(false);
       }
     },

     onSave : function (aLogger) {
       if (this.isOptional() && (!this.isSet())) {
         aLogger.discardNodeIfEmpty();
         return;
       }
       if (this._data) {
         aLogger.write(this._data);
       }
     },

     ////////////////////////////////
     // Overwritten plugin methods //
     ////////////////////////////////

     api : {

       isFocusable : function () {
         return !this.getParam('noedit');
       },

       // Request to take focus (from tab navigation manager)
       focus : function () {
         this.startEditing({shiftKey: !this.isModified()});
       },

       // Request to leave focus (fro tab navigation manager)
       unfocus : function () {
         this.stopEditing();
       },

       // Overwritten to support an inDOMOnly parameter
       getHandle : function (inDOMOnly) {
         if (inDOMOnly) {
           // test if *this* instance is being edited and has a "placed" layout
           if (this.getParam('layout') === 'placed' && this._device && this._device.getCurrentModel() === this)
             return this._device.getHandle();
         }
         return this._handle;
       }
     },

     /////////////////////////////
     // Specific plugin methods //
     /////////////////////////////

     methods : {

       // Sets current data model and updates DOM view accordingly
       _setData : function (aData) {
         if (this._handle.firstChild)
           this._handle.firstChild.data = aData;
         this._data = aData;
       },

       // Returns current data model
       getData : function () {
         return this._data;
       },

       // Returns the DOM node which can be used to set the device's handle size
       getGhost : function () {
         var s = this.getParam('shape'); // checks first char is p like 'parent'
         return (s && s.charAt(0) === 'p') ? this._handle.parentNode : this._handle;
       },

        // Starts editing the field's model
       startEditing : function (aEvent) {
         var _doSelect = aEvent ? (!this.isModified() || aEvent.shiftKey) : false;
         this._device.startEditing(this, aEvent, _doSelect);
       },

       // Stops the edition process on the device
       stopEditing : function () {
         this._device.stopEditing(false, false);
       },

       // Updates data model
       update : function (aData) { 
         if (aData === this._data) { // no change
           return; 
           // FIXME: should we use isModified instead ? 
           // filters would just need to call setModified and not this._data ?
         }
         // normalizes text (empty text is set to _defaultData)
         if (aData.search(/\S/) === -1 || (aData === this.getDefaultData())) {
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
         this._setData(this.getDefaultData());
         this.setModified(false);
         if (this.isOptional() && this.isSet())
           this.unset(doPropagate);
       }
     }
   };

   $axel.plugin.register(
     'text', 
     { filterable: true, optional: true },
     { 
       device : 'text-device',
       type : 'input',
       layout : 'placed',
       shape : 'self',
       expansion : 'grow',
       clickthrough : 'true', // FIXME: use a real boolean ?
       enablelinebreak : 'false'
     },
     _Generator,
     _Editor
   );
 }($axel));