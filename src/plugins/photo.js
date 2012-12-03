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
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
(function ($axel) {

 var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var viewNode = xtdom.createElement (aDocument, 'img');
   xtdom.setAttribute (viewNode, 'src', xtiger.bundles.photo.photoIconURL);
   xtdom.addClassName (viewNode , 'axel-drop-target');
   xtdom.addClassName (viewNode , 'axel-photo-model');
   aContainer.appendChild(viewNode);
   return viewNode;   
 };

 // you may add a closure to define private properties / methods
 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     var base = this.getParam('photo_base');
     if (base && (base.charAt(base.length - 1) !== '/')) { // sanitize base URL
       base = base + "/";
       this._param.photo_base = base;
       // this.configure('photo_base', base);
     } 
     this.state = new xtiger.editor.PhotoState(this);
     if (base) {
       this.state.base = base;
     }
   },

   // Awakes the editor to DOM's events, registering the callbacks for them
   onAwake : function () {
     this.device = xtiger.factory('lens').getInstance(this.getDocument());
     var _this = this;
     xtdom.addEventListener (this._handle, "error", function (ev) { _this.state.onError('Broken Image', true); }, false);
     xtdom.addEventListener (this._handle, this.getParam('trigger'), 
        function (ev) {
          _this.device.startEditing(_this, 'photo');
          xtdom.preventDefault(ev); xtdom.stopPropagation(ev); 
        }, false);
     // HTML 5 DnD - FIXME: to be implemented as a filter
     // if (xtiger.cross.UA.gecko) { // FIXME: check version too !
     //  xtdom.addEventListener (this._handle, "dragenter", function (ev) { _this.onDragEnter(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "dragleave", function (ev) { _this.onDragLeave(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "dragover", function (ev) { _this.onDragOver(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "drop", function (ev) { _this.onDrop(ev) }, false);
     // }
     this._constructStateFromUrl(this.getDefaultData());
     this.redraw (false);
   },

   onLoad : function (aPoint, aDataSrc) {
     var p, value = (aPoint !== -1) ? aDataSrc.getDataFor(aPoint) : this.getDefaultData();
     this._constructStateFromUrl (value);
     if (aDataSrc.hasAttributeFor('resource_id', aPoint)) { // optional 'resource_id'
       p = aDataSrc.getAttributeFor('resource_id', aPoint);
       this.state.resourceId = aDataSrc.getDataFor(p);
     }
     this.redraw(false);
   },

   onSave : function (aLogger) {
     aLogger.write(this._dump()); 
     if (this.state.resourceId) { // savec optional 'resource_id' attribute
       aLogger.writeAttribute("resource_id", this.state.resourceId);
     }   
   },

   ////////////////////////////////
   // Overwritten plugin methods //
   ////////////////////////////////
   api : {
     // no variations
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     
     // Returns the actual data model, lens wrapper may ask this to build their view
     getData : function () {
       return this.state;
     },

     // HTML 5 API for DnD and FileReader (FF >= 3.6)
     getFile : function () {
       return this.file;
     },
     
     _constructStateFromUrl : function (value) {
       this.state.resourceId = null;
       if (value && (value.search(/\S/) !== -1)) { // there is a photo URL
         this.state.status = xtiger.editor.PhotoState.prototype.COMPLETE;
         this.state.photoUrl = value;
       } else {
         this.state.status = xtiger.editor.PhotoState.prototype.READY;
         this.state.photoUrl = null;
       }
     },

     _dump : function () {
       return (this.state.photoUrl) ? this.state.photoUrl : '';
     },  

     // Updates display state to the current state, leaves state unchanged 
     // FIXME: rename to _setData
     redraw : function (doPropagate) {
       var cname, src, base, force = false;
       switch (this.state.status) {
         case xtiger.editor.PhotoState.prototype.READY: 
           src = xtiger.bundles.photo.photoIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.ERROR: 
           src = xtiger.bundles.photo.photoBrokenIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.UPLOADING: 
           src = xtiger.bundles.photo.spiningWheelIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.COMPLETE:
           if (doPropagate) {        
             var cur = this._handle.getAttribute('src');
             if (cur !== this.state.photoUrl) { // Photo URL has changed and successfully uploaded
               xtiger.editor.Repeat.autoSelectRepeatIter(this._handle);
             }
           }
           force = true; // photo upload service may keep same URL for new photo (?)
           src = this.state.genPhotoUrl();
           break;
         default: src = xtiger.bundles.photo.photoBrokenIconURL;
       }
       if ((this._handle.getAttribute('src') !== src) || force) {
         xtdom.setAttribute (this._handle, 'src', base ? base + src : src);
         if (xtiger.cross.UA.IE) {
           this._handle.removeAttribute('width');
           this._handle.removeAttribute('height');
         }
         cname = this.getParam('photo_class'); // Issue #16
         if (cname) {
           if (xtiger.editor.PhotoState.prototype.COMPLETE === this.state.status) {
             xtdom.addClassName(this._handle, cname);
           } else {
             xtdom.removeClassName(this._handle, cname);
           }
         }
       }
     },

     // Just redraws as the state is shared with the lens it is already synchronized
     // Does nothing because side effects will happens when wrapper will be released just after
     update : function (data) {
       // tests if update is called outside of the lens wrapper (i.e. a service)
       // in which case expected data is not a PhotoState object but a simple hash
       if (data.isPhotoStateObject === undefined) { 
         if (data.photoUrl) { // assumes a { photoUrl: , resource_id: } hash
           this._constructStateFromUrl(data.photoUrl);
           if (data.resource_id) {
             this.state.resourceId = data.resource_id;  
           }
          } else { // assumes a string with a simple photoUrl
           this._constructStateFromUrl(data);        
         }
         // FIXME: in case the lens was visible at that time, it should cancel 
         // any ongoing upload first
         this.redraw(true);      
       }
       // otherwise redraw will be called from consecutive PhotoWrapper release call
     }
     
     // onDragEnter : function (ev) {  
     //   xtdom.addClassName (this._handle, 'axel-dnd-over');
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },
     // 
     // onDragOver : function (ev) {       
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },
     // 
     // onDragLeave : function (ev) {  
     //   xtdom.removeClassName (this._handle, 'axel-dnd-over');
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },  
     // 
     // onDrop : function (ev) {       
     //   var dt = ev.dataTransfer;  
     //   var files = dt.files; 
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // 
     //   // find the first image file
     //   for (var i = 0; i < files.length; i++) {  
     //     var file = files[i];  
     //     var imageType = /image.*/;  
     //     if (!file.type.match(imageType)) {  
     //       continue;  
     //     }  
     //     this.state.startTransmission(this.getDocument(), 'dnd', file, this.getParam('photo_URL'));
     //   } 
     // } 
   }
 };

 $axel.plugin.register(
   'photo', 
   { filterable: true, optional: true },
   { 
     trigger : 'click' // 'click' or 'mouseover' DOM events (see awake)      
   },
   _Generator,
   _Editor
 );
 
 xtiger.resources.addBundle('photo', 
   { 'photoIconURL' : 'icons/photo.png',
     'photoBrokenIconURL' : 'icons/photobroken.png',
     'spiningWheelIconURL' : 'icons/spiningwheel.gif',
     'lensBoxURL' : 'photo.xhtml' } );
     
  //////////////////
  // Utility class  
  //////////////////
  xtiger.editor.PhotoState = function (client) {
   this.status = this.READY;
   this.photoUrl = null; // photo URL
   this.resourceId = null; // optional id as returned by server
   this.errMsg = null; // eventual error message 
   this.transmission = null;
   this.delegate = client; 
  };

  xtiger.editor.PhotoState.prototype = {

   // State encoding
   READY : 0, // no photo uploaded, ready to upload
   ERROR : 1, // last upload was an error
   UPLOADING : 2, // uploading in progress
   COMPLETE : 3, // photo stored on server and visible

   isPhotoStateObject : true,

   genPhotoUrl : function () {
     return (this.base ? this.base + this.photoUrl : this.photoUrl);
   },

   setDelegate : function (client) {
     this.delegate = client;
   },

   getPayload : function () {
     return this.payload;
   },

   // Called after a transmission has started to retrieve the document id
   getDocumentId : function () {
     return xtiger.session(this.myDoc).load('documentId');
   },

   startTransmission : function (doc, kind, payload, url) {
     this.cached = [this.status, this.photoUrl, this.resourceId, this.errMsg]; // in case of cancellation
     var manager = xtiger.factory('upload').getInstance(doc);
     this.myDoc = doc;
     this.transmission = manager.getUploader();
     this.transmission.setDataType(kind);
     if (url) {
       this.transmission.setAction(url);   
     }
     this.payload = payload;
     this.status = this.UPLOADING;
     manager.startTransmission(this.transmission, this);
     this.delegate.redraw ();
   },  

   cancelTransmission : function () {
     if (this.transmission) {
       var manager = xtiger.factory('upload').getInstance(this.myDoc);
       manager.cancelTransmission(this.transmission);
     }
   },

   onComplete : function (response) {
     this.status = this.COMPLETE;
     if (typeof(response) === "string") {
       this.photoUrl =  response;
       this.resourceId = null;
     } else {
       this.photoUrl =  response.url;
       this.resourceId = response.resource_id;
     }
     this.errMsg = null;
     this.transmission = null;
     this.delegate.redraw ();
   },

   onError : function (error, dontResetPhotoUrl) {
     this.status = this.ERROR;
     if (! dontResetPhotoUrl) { this.photoUrl = null; }        
     this.errMsg = error;
     this.transmission = null;
     this.delegate.redraw ();
   },

   onCancel : function () {
     this.status = this.cached[0];
     this.photoUrl = this.cached[1]; 
     this.resourceId = this.cached[2]; 
     this.errMsg = this.cached[3];
     this.transmission = null;
     this.delegate.redraw ();
   }
  };

  // Helper class to control the dialog box for the lens device photo wrapper 
  // Downloads and installs the dialog box with an Ajax call
  //  This allows to change the dialog box look and feel independently of the library
  xtiger.editor.PhotoViewer = function (url, doc, target, wrapper) {
    var tname, iframe, _this = this;
    // creates photo lens container from external resource file at URL
    var lensDiv = this.view = xtdom.createElement(doc, 'div');
    xtdom.setAttribute(lensDiv, 'id', 'xt-photo');
    xtdom.addClassName(lensDiv, 'axel-lens-container');
    xtdom.addClassName(lensDiv, 'axel-lens-containerstyle');
    target.appendChild(this.view);
    try {                   
      // We could have used xtiger.cross.loadDocument 
      // But for IE you need to serve .xhtml resources with text/xml MIME-Type
      // So that it gets really parsed into responseXML and then the Document DOM 
      // objet (IXMLDOMDocument) does not implement getElementById
      // Hence we use the more classical responseText / innerHTML approach !
      var xhr = xtiger.cross.getXHRObject ();
      xhr.open("GET", url, false); // false:synchronous
      xhr.send(null);
      if ((xhr.status === 200) || (xhr.status === 0)) { // 0 is for loading from local file system
        if (xhr.responseText) { 
          lensDiv.innerHTML = xhr.responseText;       
        } else {
          throw {name : 'Error', message : 'Photo plugin initialization failed : empty lens bundle content'};
        }
      } else { 
        throw {name : 'Error', message : 'Photo plugin initialization failed : HTTP error (' + xhr.status + ')'};
      }
      this.formular   = doc.getElementById('xt-photo-form');
      this.icon     = doc.getElementById('xt-photo-icon');
      this.infobox  = doc.getElementById('xt-photo-info');
      this.errorbox   = doc.getElementById('xt-photo-error');
      this.filemenu   = doc.getElementById('xt-photo-form-body');
      this.btnselfile = doc.getElementById('xt-photo-file');
      this.btnupload  = doc.getElementById('xt-photo-save');    
      this.btncancel  = doc.getElementById('xt-photo-cancel');    
      // creates target iframe to collect server's response (Issue #19)
      tname = this.formular.getAttribute('target') || 'xt-photo-target';
      iframe = xtdom.createElement(doc, 'iframe');
      xtdom.setAttribute(iframe, 'id', tname);
      xtdom.setAttribute(iframe, 'name', tname);
      xtdom.setAttribute(iframe, 'src', 'javascript:false;');
      iframe.style.display = 'none';
      target.appendChild(iframe);
      xtdom.addEventListener(this.btnselfile, 'click', function () { _this.startSelectCb(); }, false);
      xtdom.addEventListener(this.btnupload , 'click', function () { _this.saveCb(); }, false);
      xtdom.addEventListener(this.btncancel , 'click', function () { _this.cancelCb(); }, false);
      this.btncancel.style.display = 'none';
      this.failed = false;
      this.hide();
    } catch (e) {
      this.view.innerHTML = "<p>File Upload is not available...<br/><br/>Failed to make lens with '" + url 
        + "'.<br/><br/>"+ e.name + ' : ' + e.message 
        + "</p>";                   
      this.failed = true;
    }   
    this.ready();   
    this.wrapper = wrapper;
  };

  xtiger.editor.PhotoViewer.prototype = {

    // Internal methods to control appearance
    showPhoto : function (src) {
      if (! this.failed) { 
        if (this.btnselfile.value.length > 0) { // reset the form when changing state
          this.formular.reset();
        }
        this.icon.setAttribute('src', src);
        this.icon.style.visibility = 'visible';     
        if (src === xtiger.bundles.photo.spiningWheelIconURL) {
          this.btncancel.style.display = 'block';
        } else {
          this.btncancel.style.display = 'none';
        }
      }
    },
    hideError : function () {
      if (!this.failed) { 
        this.errorbox.style.display = 'none';
      }
    },
    hideMessage : function () {
      if (!this.failed) { 
        this.infobox.style.display = 'none';      
      }
    },    
    showError : function (msg) {
      if (!this.failed) {
        this.errorbox.style.display = 'block';      
        this.errorbox.firstChild.data = msg;
      }
    },
    showUplButtons : function () {
      if (!this.failed) { 
        this.filemenu.style.display = '';
      }
    },    
    hideUplButtons : function () {
      if (!this.failed) {
        this.filemenu.style.display = 'none';
      }
    },

    // Public methods
    hide : function () {
      this.view.style.display = 'none';
    },
    
    show : function () {
      this.view.style.display = '';
    },
    
    showMessage : function (msg) {
      if (!this.failed) { 
        this.infobox.style.display = 'block';   
        this.infobox.firstChild.data = msg;
      }
    },
    
    getTopDiv : function () {
      return this.view;
    },  

    // State methods
    ready : function () {
      this.showPhoto(xtiger.bundles.photo.photoIconURL);
      this.showMessage("You can select a file and upload it");
      this.hideError();
      this.showUplButtons();
    },
    
    complete : function (photoUrl) {
      this.showPhoto(photoUrl);
      this.hideMessage();
      this.hideError();
      this.showUplButtons();      
    },
    
    loading : function () {
      this.showPhoto(xtiger.bundles.photo.spiningWheelIconURL);
      this.showMessage("Wait while loading");
      this.hideError();
      this.hideUplButtons();    
    },
    
    error : function (msg) {
      this.showPhoto(xtiger.bundles.photo.photoBrokenIconURL);
      this.showError(msg);
      this.hideMessage();
      this.showUplButtons();
    },
    
    busy : function () {
      this.btncancel.style.display = 'none'; // hidden in showPhoto in the other cases
      this.icon.style.visibility = 'hidden';      
      this.hideError();
      this.showMessage('Another upload is in progress, please wait until it finishes.');
      this.hideUplButtons();
    },
    
    activateUpload : function () {
      this.btnupload.removeAttribute('disabled');
    },
    
    deactivateUpload : function () {
      xtdom.setAttribute(this.btnupload, 'disabled', 'true');
    },

    // Controller functions
    startSelectCb : function () {
      this.wrapper.onStartSelect();
    },
    
    saveCb : function () {
      // FIXME: check filename is an image file
      if (this.btnselfile.value.length > 0) {
        this.wrapper.onStartUpload(this.formular); // gives form as parameter for calling submit()
      }
    },
    
    cancelCb : function () {
      this.wrapper.onCancelUpload();
    } 
  };

  // Lens Wrapper for photo upload device
  // If a photo has already been uploaded shows it in full size
  // Also shows a browser / submit dialog to upload / replace the photo
  xtiger.editor.PhotoWrapper = function (aDoc) {  
    this.myDoc = aDoc;
    var form = xtiger.session(aDoc).load('form');
    var root = (form && form.getRoot()) || aDoc.getElementsByTagName('body')[0]; // NOTE that body is undefined in XML document (.xtd)
    this.view = new xtiger.editor.PhotoViewer(xtiger.bundles.photo.lensBoxURL, aDoc, root, this); // temporary
    this.state = null;
  };

  xtiger.editor.PhotoWrapper.prototype = {

      // This wrapper does not manage keyboard entry, hence it is not focusable
      isFocusable: function () {
        return false; 
      },

      // Returns the top <div> lens container
      getHandle: function () {
        return this.view.getTopDiv();
      },

      // Returns the data currently hold by the wrapper.
      getData: function () {
        return this.state;      
      },

      // Grabs the wrapper with the given device usually on device behalf
      // Entry point to display the lens wrapper on screen
      grab: function (aDevice, aDoSelect, aPadding) {
        this.device = aDevice;      
        this.editor = aDevice.getCurrentModel();
        this.state = this.editor.getData();
        this.state.setDelegate(this);
        this.redraw();
        this.view.show();                                
        if (aPadding[0] > 0) { // FIXME: only one padding dimension
          this.view.getTopDiv().style.padding = aPadding[0] + 'px';
        }
      },         

      // Terminates the wrapper installation after the lens has been made visible
      activate: function(aDevice, doSelectAll) {
        // nope
      },    

      // Releases the wrapper, restores the handle usually on device behalf
      // Entry point to hide the lens wrapper
      release: function () {
        this.view.hide();     
        this.device = null;
        this.state.setDelegate(this.editor); // restore delegate
        // FIXME: shall we call it here since it seems more appropriate in editor.update
        // which has just been called before from the lens device !
        this.editor.redraw(true);
      },

      // Trick to avoid hiding the lens while interacting with modal file selection dialog
      onStartSelect : function () {
        this.device.mouseMayLeave();
      },

      // Starts uploading on behalf of the view
      onStartUpload : function (form) {
        this.state.startTransmission(this.myDoc, 'form', form, this.editor.getParam('photo_URL'));
      },

      onCancelUpload : function (form) {
        this.state.cancelTransmission();
      },

      // Displays current state
      redraw: function () {
        var mgr = xtiger.factory('upload').getInstance(this.myDoc);
        if (mgr.isReady() || mgr.isTransmitting(this.state.transmission)) {
          switch (this.state.status) {
            case xtiger.editor.PhotoState.prototype.READY: 
              this.view.ready(); break;
            case xtiger.editor.PhotoState.prototype.ERROR: 
              this.view.error(this.state.errMsg); break;
            case xtiger.editor.PhotoState.prototype.UPLOADING: 
              this.view.loading(); break;
            case xtiger.editor.PhotoState.prototype.COMPLETE:             
              this.view.complete(this.state.genPhotoUrl()); break;
            default: 
              this.view.error('Unkown Photo status ' + this.state.status); break;
          }
        } else {
          // Allow monitoring only 1 photo upload at a time
          this.view.busy();
        }
      }
  };

  xtiger.factory('lens').registerWrapper('photo',  function (doc) { return new xtiger.editor.PhotoWrapper(doc); });

}($axel));