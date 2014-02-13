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

   var _Editor = {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onGenerate : function ( aContainer, aXTUse, aDocument ) {
       var htag = aXTUse.getAttribute('handle') || 'span',
           h = xtdom.createElement(aDocument, htag),
           t = xtdom.createTextNode(aDocument, '');
       h.appendChild(t);
       xtdom.addClassName(h, 'axel-core-on');
       aContainer.appendChild(h);
       return h;
     },

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       var devfactory,
           devname = this.getParam('device'),
           donthold = this.getParam('placeholder') === 'empty';
       if ((! aDefaultData) || (typeof aDefaultData !== 'string')) {
         this._content = donthold ? '' : 'click to edit'; // FIXME: i18n
       }
       this._data = this.getDefaultData(); // Quirck in case _setData is overloaded and checks getDefaultData()
       this._setData(donthold ? '' : this._data);
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
         this._setData(_value || (this.getParam('placeholder') === 'empty' ? '' : _default));
         this.setModified(_value && (_value !==  _default));
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
         if (this.isModified() || (this.getParam('placeholder') !== 'clear')) {
           aLogger.write(this._data);
         }
       } else if (this.getParam('placeholder') === 'empty') {
         aLogger.write(this.getDefaultData());
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
         this.startEditing();
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
         if (this._handle.firstChild) {
           this._handle.firstChild.data = aData;
         }
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

       // Starts editing the field's model. Selects all text if the field's content is
       // still the default value or if triggered from a user event with SHIFT key pressed
       startEditing : function (aEvent) {
         var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
         this._device.startEditing(this, aEvent, _doSelect);
       },

       // Stops the edition process on the device
       stopEditing : function () {
         this._device.stopEditing(false, false);
       },

       // Updates data model
       update : function (aData) {
         var tmp, isadef;
         if (aData === this._data) { // no change
           return;
         }
         // normalizes text (empty text is set to _defaultData)
         tmp = aData.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
         isadef = tmp === this.getDefaultData();
         if ((tmp.length === 0) || (isadef && (this.getParam('placeholder') !== 'preserve'))) {
           this.clear(true);
           return;
         }
         this._setData(tmp);
         this.setModified(!isadef);
         this.set(true);
       },

       // Clears the model and sets its data to the default data.
       // Unsets it if it is optional and propagates the new state if asked to.
       clear : function (doPropagate) {
         this._setData(this.getParam('placeholder') === 'empty' ? '' : this.getDefaultData());
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
       placeholder : 'preserve',
       device : 'text-device',
       type : 'input',
       layout : 'placed',
       shape : 'self',
       expansion : 'grow',
       clickthrough : 'true', // FIXME: use a real boolean ?
       enablelinebreak : 'false'
     },
     _Editor
   );
 }($axel));
