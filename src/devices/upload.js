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


// Creates and manages several potentially parallel data uploading processes
// Manages a pool of Upload objects, queues request to upload and serve them one at a time
// Possibility to serve in parallel (asynchronous)
xtiger.editor.UploadManager = function (doc) {
  // this.inProgress = []; // uploading
  // this.queued = []; // waiting for uploading
  this.inProgress = null;
  this.available = []; // available
  this.curDoc = doc;
}

xtiger.editor.UploadManager.prototype = {
  
  _reset : function (uploader) {
    if (this.inProgress !== uploader) { alert('Warning: attempt to close an unkown transmission !')}
    uploader.reset();
    this.available.push(uploader);
    this.inProgress = null;
  },
  
  // Returns an available uploader to an editor which can use it to upload a file
  getUploader : function () {
    return (this.available.length > 0) ? this.available.pop() : new xtiger.editor.FileUpload(this);
  },
  
  // Returns true if the manager is ready to transmit (no other transmission in progress)
  isReady : function () {
    return (null === this.inProgress);
  },
  
  // Returns false if uploader is null or if it is currently not transmitting
  // Returns true if it is actually transmitting
  isTransmitting : function (uploader) {
    return (uploader && (uploader === this.inProgress));
  },
  
  // Asks the manager to start uploading data with the given uploader
  // The manager may decide to queue the transmnission
  startTransmission : function (uploader, client) {
    // var key = this._genTransmissionKey();
    this.inProgress = uploader; // only one at a time
    // as there may be an error while starting we save inProgress before
    uploader.start(client);   
  },

  startPreflight : function (uploader, client) {
    this.inProgress = uploader; 
    uploader.preflight(client);   
  },

  // Must be called by the target iframe at the end of a transmission
  // status 1 means success and in that case result must contain either 
  // a string with the URL of the photo (for displaying in handle)
  // or a hash with 'url' and 'resource_id' keys
  // status 0 means error and in that case result is an explanation
  // FIXM: currently only one transmission at a time (this.inProgress)
  reportEoT : function (status, result) {
    if (this.inProgress === null) { // sanity check
      // maybe the transmission was simply cancelled hence we cannot say...
      // alert('Warning: attempt to report an unkown file upload termination !');
    } else {
      if (status == 1) {
        this.notifyComplete(this.inProgress, result);
      } else {
        this.notifyError(this.inProgress, 0, result); // code not used (0)
      }
    }
  },
    
  notifyComplete : function (uploader, result) {
    var tmp = uploader.client;
    this._reset (uploader);
    tmp.onComplete (result); // informs client of new state   
  },  

  // FIXME: code not used
  notifyError : function (uploader, code, message) {    
    var tmp = uploader.client;
    this._reset (uploader);
    tmp.onError (message, code); // informs client of new state
  },
  
  // Asks the manager to cancel an ongoing transmission
  cancelTransmission : function (uploader) {
    var tmp = uploader.client;
    uploader.cancel();   
    this._reset(uploader);
    tmp.onCancel(); // informs client of new state 
  }     
}

// Simple XHR based file upload
// See https://developer.mozilla.org/en/Using_files_from_web_applications
xtiger.editor.FileUpload = function (mgr) {
  this.manager = mgr; 
  this.xhr = null;   
  this.defaultUrl = "/upload"; // FIXME: default action URL
}

xtiger.editor.FileUpload.prototype = {
  
  reset : function() {
    delete this.url;
  },
  
  setDataType : function (kind) {
    this.dataType = kind; // 'dnd' or 'formular' or 'dataform'
  },        
    
  // Sets the url of the server-side upload script, should be on the same domain
  setAction : function(aUrl) {
    this.url = aUrl;
  },
    
  getClient : function () {
    return this.client;   
  },
  
  setClient : function (c) {
    this.client = c;    
  },  
  
  start : function (client) {
    this.client = client;
    try {
      if (this.dataType == 'dataform') { 
        this.startXHRForm();
      } else if (this.dataType == 'dnd') { // HTML 5 version with DnD 
        this.startXHR();
      } else {
        var form = this.client.getPayload();
        if (this.url) {
          xtdom.setAttribute(form, 'action', this.url);
        } else if (! form.getAttribute('action')) {
          xtdom.setAttribute(form, 'action', this.defaultUrl);
        }
        form['documentId'].value = this.client.getDocumentId() || 'noid';
        form.submit(); // Form based upload
      }   
    } catch (e) {
      this.manager.notifyError(this, e.name, e.message); // e.toString()
    }
  },
  
  // Use this protocol to check a resource name does not already exists client side before submitting
  // FIXME: - couldn't we use a HEAD request ?
  //        - factorize with startXHRForm ?
  preflight : function (client) {
    this.client = client;
    var formData, id, key, options;
    this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
    this.isCancelled = false;
    var _this = this;
    window.console.log('Start preflight request to the server...');
    this.xhr.onreadystatechange = function () {
      if (_this.isCancelled) return;
        if (4 === _this.xhr.readyState) {
          if (200 === _this.xhr.status) { // OK
            _this.manager.notifyComplete(_this, _this.xhr.responseText);
          } else { // Most probably 409 for Conflict
            _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.responseText);
          }
        }
    }
    try {
      this.xhr.open("POST", this.url || this.defaultUrl, true); // asynchronous
      formData = new FormData();
      var options = client.getPreflightOptions();
      for (k in options) {
        formData.append(k, options[k]);  
      }
      this.xhr.send(formData);
    } catch (e) {
      this.manager.notifyError(this, e.name, e.message); // e.toString()
    }
  },
  
  // Sends file with Ajax FormData API
  startXHRForm : function () {
    var formData, id;
    this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
    this.isCancelled = false;
    var _this = this;
    window.console.log('Start file upload to the server...');
    this.xhr.onreadystatechange = function () {
      if (_this.isCancelled) return;
        if (4 === _this.xhr.readyState) {
          if (201 === _this.xhr.status) { // Resource Created
            // variant: use Location header ?
            _this.manager.notifyComplete(_this, _this.xhr.responseText);
          } else {
            _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.responseText);
          }
        }
    }
    try {
      this.xhr.open("POST", this.url || this.defaultUrl, true); // asynchronous
      formData = new FormData();
      var options = this.client.getPayload();
      for (k in options) {
        formData.append(k, options[k]);
      }
      this.xhr.send(formData);
    } catch (e) {
      this.manager.notifyError(this, e.name, e.message); // e.toString()
    }
  },
    
  // DEPRECATED : binary transfer
  startXHR : function () {    
    this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
    var _this = this;  
    this.xhr.onreadystatechange = function () {
      try {
        if (4 == _this.xhr.readyState) {
          if (_this.xhr.status  == 201) { // Resource Created
            _this.manager.notifyComplete(_this, _this.xhr.responseText);
          } else {
            _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.statusText);             
          }
          _this.xhr = null; // GC ?
        } 
      } catch (e) {
        _this.manager.notifyError(_this, e.name, e.message); // e.toString()
      }
    } 
    this.xhr.open("POST", this.url || this.defaultUrl); // FIXME: store URL in base parameter of editor 
    this.xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');  
    // Document id should have been set through a 'documentId' filter 
    // Document id is sent then "$$$" then photo data 
    // If I knew how to send a multipart message with XMLHTTPRequest that would be cleaner !
    var id = this.client.getDocumentId() || 'noid';
    this.xhr.sendAsBinary(id + "$$$" + this.client.getPayload().getAsBinary());
    // FIXME: encode parameters in URL ?
  },
    
  cancel : function () {
    if (this.xhr) {
      this.isCancelled = true; // because onreadystatechange may be fired on some browsers !
      this.xhr.abort();
    } else {
      // FIXME: how to cancel a form submission ? 
      // window.stop stops everything including animated gif...     
      var form = this.client.getPayload();
      form.reset(); // naive trial to cancel transmission
    }
  } 
} 

// UploadManager Device creation - one per document
var _UploadFactory = {
  getInstance : function (doc) {
    var cache = xtiger.session(doc).load('upload');
    if (! cache) {
      cache = new xtiger.editor.UploadManager(doc);
      xtiger.session(doc).save('upload', cache);
    }   
    return cache;
  }
}

xtiger.registry.registerFactory('upload', _UploadFactory); 