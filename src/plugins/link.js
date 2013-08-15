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
 * Author(s) : Antoine Yersin, Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
(function ($axel) {

 // you may add a closure to define private properties / methods
 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onGenerate : function ( aContainer, aXTUse, aDocument ) {
     var _h = xtdom.createElement(aDocument, 'span'); /* Creates the handle */
     xtdom.addClassName (_h , 'axel-core-on');
     xtdom.addClassName (_h, 'axel-core-editable');
     xtdom.addClassName (_h, 'axel-link-handle');
     _h.appendChild(xtdom.createTextNode(aDocument, ''));
     aContainer.appendChild(_h);
     return _h;
   },

   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     var devname = this.getParam('device') || this.getParam('defaultDevice');
     if (aDefaultData && aDefaultData.text && aDefaultData.url) { /* sets up initial content */
       this._setData(aDefaultData.text, aDefaultData.url);
     } else {
       this._setData('empty', 'http://');
     }
     this._device = xtiger.factory(devname).getInstance(this.getDocument());
   },

   onAwake : function () {
     var _this = this;
     xtdom.addEventListener (this._handle, this.getParam('trigger'), function (ev) {_this.startEditing(ev);}, true);
   },

   onLoad : function (aPoint, aDataSrc) {
     var _default,
         _url = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkRef', aPoint)), 
         _text = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkText', aPoint));
     this._setData(_text, _url);
     if (this.isOptional()) {
       if (_url || _text)
         this.set();
       else
         this.unset();
     }
     _default = this.getDefaultData();
     this.setModified((_text && _text !== _default.text) || (_url && _url !== _default.url));
   },

   // With default parameters generates link as : 
   // <linkRef>"the url of the link"</linkRef>
   // <linkText>"the text of the link"</linkText>
   onSave : function (aLogger) {
     if (this.isOptional() && !this.isSet()) {
       aLogger.discardNodeIfEmpty();
       return;
     }
     var _data = this.getData();
     aLogger.openTag(this.getParam('linkRefTagName'));
     aLogger.write(_data.url);
     aLogger.closeTag(this.getParam('linkRefTagName'));
     aLogger.openTag(this.getParam('linkTextTagName'));
     aLogger.write(_data.text);
     aLogger.closeTag(this.getParam('linkTextTagName'));
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
       tmp = aXTNode.getAttribute('option');
       this._option = tmp ? tmp.toLowerCase() : null;
       // default content extraction differs from plugin original method
       // FIXME: awful parsing function. does not care about irrelevant text nodes
       var _aXTContent = aXTNode.childNodes;
       switch(_aXTContent.length) {
         case 2: /* <linkText>blah blah</linkText><linkRef>http://...</linkRef> */
           if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE
               && _aXTContent[1].nodeType == xtdom.ELEMENT_NODE
               && _aXTContent[0].nodeName == 'linkText'
               && _aXTContent[1].nodeName == 'linkRef')
             this._content = {
               text: _aXTContent[0].nodeValue,
               url: _aXTContent[1].nodeValue 
             };
           break;
         case 1:
           if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE && (/^a$/i).test(_aXTContent[0].nodeName)) {
             this._content = {
                 text: _aXTContent[0].firstChild.nodeValue,
                 url: _aXTContent[0].getAttribute('href')
             };
           } else if (_aXTContent[0].nodeType == xtdom.TEXT_NODE) {
             this._content = {
                 text: _aXTContent[0].nodeValue,
                 url: 'http://'
             };
           }
           break;
         default:
           this._content = { text: this.getParam('defaultText'), url: this.getParam('defaultUrl') }
       }
     },
     
     isFocusable: function () {
       return true;
     },
     
     focus: function () {
       this.startEditing();
     },
     
     unfocus: function () {
       this.stopEditing();
     }
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     
     _setData : function (aText, aUrl) {
       var _default;
       if (!aText || !aUrl) {
         _default = this.getDefaultData();
         this._data = {text: aText || _default.text, url: aUrl || _default.url};
      } else {
        this._data = {text: aText, url: aUrl}; 
      }
       this._handle.firstChild.data = this._data.text; /* sets the handle's text */
     },

     // Return a hash containing two fields, "url" and "data".
     getData: function () {
       return this._data;
     },

     update: function (aData) {
       if (aData && (aData.text !== this._data.text || aData.url !== this._data.url)) {
         if (!(aData.text || aData.url)) {
           this.clear(true);
         } else {
           this._setData(aData.text, aData.url);
           this.setModified(true);
           this.set(true);
         }
       }
     },
     
     clear: function (doPropagate) {
       var tmp = this.getDefaultData();
       this._setData(tmp.text, tmp.url);
       this.setModified(false);
       if (this.isOptional() && this.isSet())
         this.unset(doPropagate);
     },
     
     startEditing: function (aEvent) {
       var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
       this._device.startEditing(this, 'linkLensWrapper', _doSelect);
       if (aEvent) {
         xtdom.stopPropagation(aEvent);// otherwise stopEditing gets called on IE
       }
     },
     
     stopEditing : function () {
       this._device.stopEditing();
     }
   }
 };

 $axel.plugin.register(
   'link', 
   { filterable: true, optional: true },
   { 
     defaultText: 'enter link\'s text here',
     defaultUrl: 'http://',
     defaultDevice: 'lens', /* name of the device to use */
     wrapper: 'togglewrapper', /* name of the field wrapper to use */
     linkRefTagName: "linkRef", /* label used by the load/save method for the url info */
     linkTextTagName: "linkText", /* label used by the load/save method for the text info */
     trigger: "click",
     padding: '10'
   },
   _Editor
 );
 
 xtiger.resources.addBundle('link', { 'gotoURL' : 'goto.png' } ); 
 
 //////////////////////////////////////
 // Lens Wrapper for the Link Editor //
 //////////////////////////////////////

  // Contains two editable fields and a "go" button to try the link
  var _LinkLensWrapper = function (aDocument) {
   this._handle; // wrapped HTML device
   this._handleToRestore; // handle to restore when releasing 
   this._document = aDocument; // document containing the wrapper 
   this._isFocused = false; // true if the focus is in one of the fields
   this._build();
  };

  _LinkLensWrapper.prototype = {

    // Initializes the wrapper. Creates the HTML elements and sets their style. 
    _build: function () {
     this._topDiv = xtdom.createElement(this._document, 'div');
     xtdom.addClassName(this._topDiv, 'axel-lens-container');
     xtdom.addClassName(this._topDiv, 'axel-lens-containerstyle');
     this._topDiv.style.display = 'block';
     this._upperP = xtdom.createElement(this._document, 'p');
     with (this._upperP) {
       style['margin'] = '0 0 15px 0';
       style['padding'] = '0px';
       style['width'] = '100%';
     }
     this._anchorInput = xtdom.createElement(this._document, 'input');
     with (this._anchorInput) {
       type = 'text';
     }
     xtdom.addClassName(this._anchorInput, 'axel-link-handle'); // use same class than the model's handle
     this._upperP.appendChild(this._anchorInput);
     this._topDiv.appendChild(this._upperP);
     this._lowerP = xtdom.createElement(this._document, 'p');
     with (this._lowerP) {
       style['margin'] = '0px';
       style['padding'] = '0px';
       style['width'] = '100%';
     }
     this._urlInput = xtdom.createElement(this._document, 'input');
     with (this._urlInput) {
       style['width'] = '75%';
     }
     this._goButtonLink = xtdom.createElement(this._document, 'a');
     with (this._goButtonLink) {
       href = ''; // is set when grabing
       target = '_blank';
       style['margin'] = '0 10px';
       style['width'] = '25%';
     }
     this._goButton = xtdom.createElement(this._document, 'img');
     with (this._goButton) {
       src = xtiger.bundles.link.gotoURL;
       style.height = '20px';
       style.width = '30px';
       style.display = 'inline';
       style['verticalAlign'] = 'bottom';
     }
     this._goButtonLink.appendChild(this._goButton);
     this._lowerP.appendChild(this._urlInput);
     this._lowerP.appendChild(this._goButtonLink);
     this._topDiv.appendChild(this._lowerP);   
    }, 

    // Sets the input fields value. If the given argument is null, the field
    // is kept in its current state. Use reset() to clear the fields.
    _setData : function (aText, aUrl) {
      if (aText && typeof(aText) === 'string')
       this._anchorInput.value = aText;
      if (aUrl && typeof(aUrl) === 'string') {
       this._urlInput.value = aUrl;
       this._goButtonLink.href = aUrl;
      }
    },

    // Returns the wrapped device.
    getHandle: function () {
     return this._topDiv;
    },        

    // Grabs the wrapper with the given device.
    grab: function (aDevice, aDoSelect, aPadding) {
     this._currentDevice = aDevice;
     var _data = this._currentDevice.getCurrentModel().getData();
     this._setData(_data.text, _data.url);
     var _handle = this._currentDevice.getCurrentModel().getHandle();      
     this._topDiv.style.padding = aPadding[0] + 'px ' + aPadding[1] + 'px';
     var _this = this;
     xtdom.addEventListener(this._anchorInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
     xtdom.addEventListener(this._urlInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
     xtdom.addEventListener(this._anchorInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
     xtdom.addEventListener(this._urlInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
     // adds principal input field margins and border to the padding     
     // FIXME: does not work - instead we use 4 which is empirical
     // var mtop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'margin-top');
     // var btop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'border-width-top');
     return [aPadding[0], aPadding[1] + 4];   
    },      

    // Terminates the wrapper installation after the lens has been made visible
    activate: function(aDevice, doSelectAll) {
     if (doSelectAll) {
       xtdom.focusAndSelect(this._anchorInput);
     } else { // simply focus
       this._anchorInput.focus();
     }
    },

    // Releases the wrapper, restores the handle
    release: function () {
     this._isFocused = false;
     xtdom.removeElement(this._topDiv);
     this._currentDevice = null;
    },

    // Toggle the focus between the fields
    toggleField: function () {                 
     if (this._isFocused) {
       if (this._focusedField == this._anchorInput) {
         this._anchorInput.blur();
         xtdom.focusAndMoveCaretTo(this._urlInput, this._urlInput.value.length);
       } else {
         this._urlInput.blur();
         xtdom.focusAndMoveCaretTo(this._anchorInput, this._anchorInput.value.length);
       }
     }
    },

    // Returns current data
    getData: function () {
     return {
       url: this._urlInput.value,
       text: this._anchorInput.value
     }
    },

    isFocusable: function () {
     return true;
    },

    // Handler for the bluring of input fields. Saves their state and updates
    // the link button's url accordingly.
    onBlur: function (ev) {
     var _target = xtdom.getEventTarget(ev);
     if (_target == this._urlInput)
       this._goButtonLink.href = this._urlInput.value;
     this._isFocused = false;
     this._focusedField = null;
     this._currentDevice.keepAlive(false);  
    },

    // Handler for the focusing in an input field. Toggles the wrapper's state such as it
    // does not disappear when the mouse leave it.
    onFocus: function (ev) {
     this._isFocused = true;
     this._currentDevice.keepAlive(true);
     this._focusedField = xtdom.getEventTarget(ev);
    }
  };

  xtiger.factory('lens').registerWrapper('linkLensWrapper', function (aDocument) {return new _LinkLensWrapper(aDocument)});
}($axel));