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
 
(function ($axel) {

 var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var _width, _height, _img, _tmp,
       _h = xtdom.createElement(aDocument, 'div');
   xtdom.addClassName (_h , 'axel-core-on');
   xtdom.addClassName (_h, 'axel-core-editable');
   _img = xtdom.createElement(aDocument, 'img');
   _img.src = xtiger.bundles.video.tvIconURL;
   _h.appendChild(_img);
   // Sets handle width and height;
   _tmp = xtdom.createElement(aDocument, 'div');
   _tmp.style.visibility = 'hidden';
   aDocument.getElementsByTagName('body')[0].appendChild(_tmp);
   _tmp.appendChild(_h);
   _width = _img.offsetWidth;
   _height = _img.offsetHeight;
   _h.style.width = (_width > 2 ? _width : 80) + 'px'; // defeat bug when transformed in a displayed: none context
   _h.style.height = (_height > 2 ? _height : 80) + 'px';
   aContainer.appendChild(_h);
   xtdom.removeElement(_tmp);
   return _h;   
 };

 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     if (aDefaultData) { /* sets up initial content */
       if (this._isValidUrl(aDefaultData) || this._isCodeSnippet(aDefaultData)) {
         this._setData(aDefaultData);
       } else { // short-hand for setting that parameter
         this._data = '';         
         this._param.inputFieldMessage = aDefaultData;
         // this.configure('inputFieldMessage', aDefaultData);
       }
     }
     var devname = this.getParam('device') || this.getParam('defaultDevice');
     this._device = xtiger.factory(devname).getInstance(this.getDocument());
     // HTML element to represents an editor containing no data 
     this._noData = this._handle.firstChild; // saves <img> icon
   },

   // Awakes the editor to DOM's events, registering the callbacks for them
   onAwake : function () {
     var _this = this; // closure
     xtdom.addEventListener (this._handle, 'mouseover', function (ev) {_this.startEditing(ev);}, true);
   },

   onLoad : function (aPoint, aDataSrc) {
     if (aPoint !== -1) {
       var _value = aDataSrc.getDataFor(aPoint); 
       this._setData(_value) || this.clear();
       this.set(false);        
     } else {
       this.clear()
       this.unset(false);
     }
   },

   onSave : function (aLogger) {
     if (this.isOptional() && !this.isSet()) {
       aLogger.discardNodeIfEmpty();
     } if (this._data) { 
        aLogger.write(this._data);
     } // otherwise empty node => no content (will be an empty XML tag)
   },

   ////////////////////////////////
   // Overwritten plugin methods //
   ////////////////////////////////
   api : {
     
     // FIXME: first part is copied from Plugin original method, 
     // an alternative is to use derivation and to call parent's method
     _parseFromTemplate : function (aXTNode) {
       var tmp, _cur, _data;
       this._param = {};
       xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
       tmp = aXTNode.getAttribute('option');
       this._option = tmp ? tmp.toLowerCase() : null;
       // sets default content, this diverges from basic plugin
       _cur = aXTNode.firstChild;
       while (_cur && !_data) {
         switch (_cur.nodeType) {
           case xtdom.TEXT_NODE :
             if ((/\w+/).test(_cur.nodeValue)) {
               _data = _cur.nodeValue;
             }
             break;
           case xtdom.ELEMENT_NODE :
             if (_cur.localName = 'object') {
               _data = _cur;
             }
         }
         _cur = _cur.nextSibling;
       }
       this._content = _data;
    },

    isFocusable: function () {
      return true;
    },
    
    focus: function () {
      this.startEditing(null);
    },
    
    unfocus: function () {
      this._device.stopEditing();
    }
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     // Tests if the input is a valid URL (no trailing nor leading spaces allowed)
     _isValidUrl : function (aInput) {
       var _URL_R = /^(http\:\/\/|~\/|\/)?(\w+:\w+@)?(([-\w\d{1-3}]+\.)+(com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2})?)(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,=]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:[\?&](?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)?(?:&)?$/;
       return _URL_R.test(aInput);
     },

     // Removes leading and trailing spaces
     _removeLTSpaces : function (aInput) {
       if (!aInput || aInput == '')
         return '';
       return aInput.replace(/^\s+|\s+$/g, '');
     },

     // Builds a valid YouTube's snippet (as HTML element) from a video ID
     _buildYoutubeSnippet : function (aVideoID, aSize, aParams) {
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

     // Extracts the youtube's video id from a valid link to the video (either the "permalink" or the page's link)
     _extractVideoId : function (aValidUrl) {
       var _tmp = aValidUrl.match(/^[^&]*/)[0];
       return _tmp.match(/[^\=\/]*$/)[0];
     },

     // Returns true of the given input is a code snippet
     _isCodeSnippet: function (aInput) {
       var _SNIPPET_O_R = /(<object>).*(<param[^>]*(name\="movie"))/;
       var _SNIPPET_E_R = /(<embed\s)([^>]+)(\ssrc\=")([^"]+)"/;
       return _SNIPPET_O_R.test(aInput) || _SNIPPET_E_R.test(aInput);
     },

     // Changes the handler content to show a video player if aData 
     // is a valid YouTube URL and as a side effects calls this.setModified(true).
     // Returns true if it succeeds or false otherwise (in which case the handler's content is preserved)
     _setData: function (aData) {
       var _newContent, _tmp,
           _type = 'youtube', //_extractType(aData);
           _tdata = this._removeLTSpaces(aData);
       if (!this._isValidUrl(_tdata)) {
         if (this._isCodeSnippet(_tdata))
           _tdata = this._extractUrlFromSnippet(_tdata);
         else
           return false;
       }
       switch (_type) {
         case 'youtube':
           var _videoID = this._extractVideoId(_tdata);
           var _newdata = 'http://www.youtube.com/v/' + _videoID;
           if (this._data === _newdata)
             return false; // No update
           this._data = _newdata; // Updates the model
           _newdata += '&hl=' + this.getParam('lang') + '&fs=1&';
           _newContent = this._buildYoutubeSnippet(this._data, null, null);
           try {
             // Sets the correct handle's width and height by using a temp container
             _tmp = xtdom.createElement(this._document, 'div');
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

     // Updates this editor with the given data. The data must provide the url
     // to the video, either by giving it directly, or by giving the whole snippet.
     update: function (aData) { 
       var _success = false;     
       if (aData && (typeof(aData) == 'string') && (aData.search(/\S/) != -1)) {
         _success = (aData === this._data) || this._setData(aData);
         // the first term in case user had unselected optional video
         // and tries to select it again by validating it's URL again
       }
       if (_success) { // auto-selection of editor if necessary
         this.set(true);
       }
     },

     // Clears the editor, reseting it to a state where it does not contains any video. 
     // Does not change the selection state.
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

     // Returns the editor's current data
     getData: function () {
       if (this._data && this._data !== '') {
         return this._data;
       } else {
         return null;
       }
     },

     startEditing: function (aEvent) {
       var _doSelect = aEvent ? (!this.isModified() || aEvent.shiftKey) : false;
       this._device.startEditing(this, 'videoLensWrapper', _doSelect);
     },

     stopEditing : function () {
       this._device.stopEditing();
     }     
   }
 };

 $axel.plugin.register(
   'video', 
   { filterable: true, optional: true },
   { 
     defaultDevice: 'lens', /* name of the device to use */
     trigger: 'mouseover',
     lang: 'fr_FR', /* lang's code for player's GUI (must respect the video's provider's standards) */
     inputFieldMessage: 'Paste the video\'s link here', /* text appearing in the input field if no valid data is hold by the model */
     width: 425, /* width of the flash video player */
     height: 344 /* height of the flash video player */
   },
   _Generator,
   _Editor
 );
 
 xtiger.resources.addBundle('video', { 'tvIconURL' : 'tv.png' } );
 
 ///////////////////////////////////////
 // Lens Wrapper for the Video Editor //
 ///////////////////////////////////////
 var _VideoLensWrapper = function (aDocument) {
   this._handle; // wrapped HTML device
   this._handleToRestore; // handle to restore when releasing
   this._document = aDocument; // document containing the wrapper 
   this._isFocused = false; // true if the focus is in one of the fields
   this._loaded = false; // true the model is loaded with valid data
   this.build();
 }

 _VideoLensWrapper.prototype = {

   build : function() {
     this._topdiv = xtdom.createElement(this._document, 'div');
     xtdom.addClassName(this._topdiv, 'axel-lens-container');
     with (this._topdiv) {
       style.display = 'none';
       style.minWidth = '200px';
     }
     var _innerHTML = '';
     // mask
     _innerHTML += '<div style="background: none; position: relative"> </div>';
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
       clearModel : [ this._deletespan, 'click', function(ev) { _this.clearModel() } ],
       onInputBlur : [ this._input, 'blur', function(ev) { _this._onInputBlur(ev) } ],
       onInputFocus : [ this._input, 'focus', function(ev) { _this._onInputFocus(ev) } ],
       onInputKeyDown : [ this._input, 'keydown', function(ev) { _this._onInputKeyDown(ev) } ],
       onInputKeyUp : [ this._input, 'keyup', function(ev) { _this._onInputKeyUp(ev) } ],
       onCancel : [ this._cancelbutton, 'click', function(ev) { _this._onCancel(ev) } ],
       onSave : [ this._savebutton, 'click', function(ev) { _this._onSave(ev) } ]
     }
   },

   // Grabs the wrapper, awakes its listeners and displays it
   grab : function(aDevice, aDoSelect, aPadding) {
     if (this._currentDevice) {
       this.release();
     }
     this._currentDevice = aDevice;
     var _handle = this._currentDevice.getCurrentModel().getHandle();
     _pad = (aPadding[0] >= 10) ? aPadding[0] : 10;

     // fixes elements' size
     var _width = _handle.offsetWidth;
     var _height = _handle.offsetHeight;
     if (xtiger.cross.UA.IE) { // IE does include padding in elements' width and height
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
       var _message = this._currentDevice.getCurrentModel().getParam('inputFieldMessage');
       this.setData(_message); // defeat IE and opera's "null" bug
       this._loaded = false;
     }

     // subscribes to events
     for ( var k in this._handlers) {
       xtdom.addEventListener(this._handlers[k][0], this._handlers[k][1],
           this._handlers[k][2], true);
     }
   },

   // Terminates the wrapper installation after the lens has been made visible 
   activate : function(aDevice, doSelectAll) {
     // nope
   },

   // Releases the wrapper, unregisters all events handlers  
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

   getHandle : function() {
     return this._topdiv;
   },

   // Returns the input field content.
   getData : function() {
     return this._input.value;
   },

   // Sets the data hold by the wrapper's input field.
   setData : function(aData) {
     // defeat IE and opera's "null" bug
     this._input.value = (aData && typeof (aData) == 'string') ? aData : '';
   },

   isFocusable : function() {
     return true;
   },

   // Asks the model to clear itself
   clearModel : function() {
     if (this._currentDevice) {
       this._input.value = '';
       this._currentDevice.getCurrentModel().clear();
       this._currentDevice.keepAlive(false);
       this._currentDevice.getCurrentModel().unfocus();
     }
   },

  // Toggles between the lens' fields. Useless here as the lens only has one field
   toggleField : function() {
     // nope, only one field
   },

   // Event handler called when the input field losts the focus.
   _onInputBlur : function(ev) {
     this._currentDevice.keepAlive(false);
   },

   // Event handler called when the input field gains the focus
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

   // Saves the current value of the input. This value is used later to enable the buttons.
   _onInputKeyDown : function(ev) {
     this._savedValue = this._input.value;
   },

   // Detects the keyup event on the input field. 
   // If the input's value has changed, buttons are awakened
   _onInputKeyUp : function(ev) {
     if (this._input.value != this._savedValue) {
       this._cancelbutton.disabled = false;
       this._savebutton.disabled = false;
     }
   },

   // Event handler for a click on the "cancel" button
   _onCancel : function(ev) {
     if (!this._currentDevice)
       return;
     this._currentDevice.cancelEditing();
     xtdom.stopPropagation(ev);
   },

   // Event handler for a click on the "save" button 
   _onSave : function(ev) {
     if (!this._currentDevice)
       return;
     this._currentDevice.stopEditing();
     xtdom.stopPropagation(ev);
   }
 }

 xtiger.factory('lens').registerWrapper('videoLensWrapper', function (aDocument) {return new _VideoLensWrapper(aDocument)}); 

}($axel));
