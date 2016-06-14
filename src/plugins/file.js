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

////////////////////////////////////////////
// NOTE : this editor requires JQuery !!!
// TODO: manage data-mime-type extra attribute to display mime-type dependant icons (?) 
////////////////////////////////////////////

(function ($axel) {
  
  var EMPTY = 0;
  var SELECTED = 1;
  var LOADING = 2;
  var ERROR = 3;
  var COMPLETE = 4;
  var READY = 5;
  var DELETING = 6;
  var DELERROR = 7;
  var DELETED = 8;
  var FEEDBACK = { // permanent message visible next to the icon as per locale_XX.js
      'fr' : [null, null, 'infoFileSendInProgress', 'infoFileSendFailure', 'infoFileSendSuccess', null, 'infoFileDeleteInProgress', 'infoFileDeleteFailure', 'infoFileDeleted']
      };
  var HINTS = { // tooltip messages as per locale_XX.js
      'fr' : [ 'hintFileSelect',
               ['hintFileSend', 'hintFileSendAs'],
               'hintFileSendInProgress',
               'hintFileSendFailure',
               'hintFileSendSuccess',
               'hintFileReplace',
               'hintFileDeleteInProgress',
               'hintFileDeleteFailure',
               'hintFileDeleteSuccess'
             ]
      };

  function PURIFY_NAME (name) {
    var str = $.trim(name).toLowerCase(),
        res = (str.lastIndexOf('.') !== -1) ? str.substring(0, str.lastIndexOf('.')) : str;
    /* Replace multi spaces with a single space */
    res = res.replace(/(\s{2,}|_)/g,' ');
    /* Replace space with a '-' symbol */
    res = res.replace(/\s/g, "-");
    res = res.replace(/[éè]/g,'e'); // FIXME: improve
    res = res.replace(/[^a-z0-9-_]/g,'');
    return res;
  }

  function DISPLAY_FILE_SIZE (size) {
    var tmp = '';
    if (size) {
      if (size >= 1024) {
        kb = size >> 10;
        if (kb >= 1024) {
          mb = size >> 20;
          kb = (size - (mb << 20)) >> 10;
        } else {
          mb = 0;
        }
        tmp = mb >= 1 ? mb + '.' + kb + ' MB' : kb + ' KB';
      } else {
        tmp = size + ' bytes'; 
      }
    }
    return tmp;
  }

  // you may add a closure to define private properties / methods
  var _Editor = {

    ////////////////////////
    // Life cycle methods //
    ////////////////////////
    
    onGenerate : function ( aContainer, aXTUse, aDocument ) {
      var viewNode, delstr = '', btnstr = '',
          klass = this.getParam('file_button_class');
      if (klass) {
        btnstr = '<button class="xt-file-upload ' + klass + '">' + xtiger.util.getLocaleString('cmdSelectFile') + '</button>';
      }
      if (typeof this.getParam('file_delete')  === 'string') {
        delstr = '<button class="xt-file-del">x</button>'; // optional UI part
      }
      viewNode = xtdom.createElement (aDocument, 'span');
      xtdom.addClassName (viewNode , 'xt-file');
      $(viewNode).html(
        btnstr + '<img class="xt-file-icon1"/>' + delstr + '<span class="xt-file-trans"/><input class="xt-file-id" type="text" value="nom"/><input class="xt-file-save' + (klass ? ' ' + klass : '') + '" type="button" value="' + xtiger.util.getLocaleString('cmdUpload') + '"/><span class="xt-file-perm"/><img class="xt-file-icon2"/>'
        );
      // xtdom.addClassName (viewNode , 'axel-drop-target');
      aContainer.appendChild(viewNode);
      return viewNode;
    },

    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      var base = this.getParam('file_base');
      if (base && (base.charAt(base.length - 1) !== '/')) { // sanitize base URL
        this._param.file_base = base + "/";
        // this.configure('file_base', base + "/")
      }
      this.model = new fileModel(this);
    },

    // Awakes the editor to DOM's events, registering the callbacks for them
    onAwake : function () {
      this.vBtn = $('.xt-file-upload', this._handle);
      this.vIcon1 = $('.xt-file-icon1', this._handle);
      this.vTrans = $('.xt-file-trans', this._handle);
      this.vPerm = $('.xt-file-perm', this._handle);
      this.vIcon2 = $('.xt-file-icon2', this._handle);
      this.vSave = $('.xt-file-save', this._handle).hide();
      this.vId = $('.xt-file-id', this._handle).hide();
      this.vDel = $('.xt-file-del', this._handle).hide();
      this.vBtn.click($.proxy(_Editor.methods.onActivate, this));
      // FIXME: we could remove this.vId in case file_gen_name param is 'auto'
      this.vIcon1.bind({
        'click' : $.proxy(_Editor.methods.onActivate, this),
        'mouseenter' : $.proxy(_Editor.methods.onEnterIcon, this),
        'mouseleave' : $.proxy(_Editor.methods.onLeaveIcon, this)
      });
      this.vIcon2.click( $.proxy(_Editor.methods.onDismiss, this) );
      this.vSave.click( $.proxy(_Editor.methods.onSave, this) );
      this.vId.change( $.proxy(_Editor.methods.onChangeId, this) );
      this.vDel.click( $.proxy(_Editor.methods.onDelete, this) );
      // manages transient area display (works with plugin css rules)
      $(this._handle).bind({
       mouseleave : function (ev) { $(ev.currentTarget).removeClass('over'); }
       // 'over' is set inside onEnterIcon
      });
      this.model.reset(this.getDefaultData());
      this.redraw(false);
      
    },

    onLoad : function (aPoint, aDataSrc) {
      var p, name, url = (aPoint !== -1) ? aDataSrc.getDataFor(aPoint) : this.getDefaultData();
      if (aDataSrc.hasAttributeFor('data-input', aPoint)) { // optional original file name
        p = aDataSrc.getAttributeFor('data-input', aPoint);
        name = aDataSrc.getDataFor(p);
      }
      this.model.reset(url, name);
      this.redraw(false);
      
    },

    onSave : function (aLogger) {
      var tmp;
      aLogger.write(this._dump());
      if ((this.model.legacy && this.model.legacy[2]) || (!this.model.legacy && this.model.name)) { // records original file name 
        tmp = this.model.legacy ? this.model.legacy[2] : this.model.name;
        aLogger.writeAttribute("data-input", tmp);
      }
    },

    ////////////////////////////////
    // Overwritten plugin methods //
    ////////////////////////////////
    api : {
      // no variation
    },

    /////////////////////////////
    // Specific plugin methods //
    /////////////////////////////
    methods : {

      getData : function () {
        return this.model;
      },

      _dump : function () {
        if (this.model.legacy) {
          return (this.model.legacy[1]) ? this.model.legacy[1] : '';
        } else {
          return (this.model.url) ? this.model.url : '';
        }
      },  

      // Updates display state to the current state, leaves state unchanged 
      // FIXME: rename to _setData ?
      redraw : function (doPropagate) {
        var UI = [
          // [ icon, true to display file name inside transient area, dismiss icon, delete button ]
          [ xtiger.bundles.file.noFileIconURL, true], // EMPTY
          [ xtiger.bundles.file.saveIconURL, false, xtiger.bundles.file.cancelIconURL], // SELECTED
          [ xtiger.bundles.file.spiningWheelIconURL, false, xtiger.bundles.file.cancelIconURL ], // LOADING
          [ xtiger.bundles.file.errorIconURL, false, xtiger.bundles.file.cancelIconURL ], // ERROR
          [ xtiger.bundles.file.fileIconURL, false, xtiger.bundles.file.dismissIconURL ], // COMPLETE
          [ xtiger.bundles.file.fileIconURL, true, null, true ], //READY
          [ xtiger.bundles.file.fileIconURL, false, null], //DELETING
          [ xtiger.bundles.file.errorIconURL, false, xtiger.bundles.file.cancelIconURL ], // DELERROR
          [ xtiger.bundles.file.noFileIconURL, false, xtiger.bundles.file.dismissIconURL ] // DELETED
        ];
        var tmp;
        var config = UI[this.model.state];
        var key = FEEDBACK.fr[this.model.state];
        var msg = key ? xtiger.util.getLocaleString(key) : '';
        
        // Manages special PDF icons
        if (SELECTED === this.model.state) { 
          if ('application/pdf' === this.model.file.type) { 
            config[0] = xtiger.bundles.file.saveIconURLpdf;
          }
        } else if (this.model.state >= COMPLETE)  {
          if (/\.pdf$/i.test(this.model.url) || (this.model.name && /\.pdf$/i.test(this.model.name))) {
            config[0] = xtiger.bundles.file.fileIconURLpdf;
          }
        }
        // Updates widget view
        if ((this.model.state === 0) && (this.vBtn.size() === 1)) {
          this.vBtn.show();
          this.vIcon1.hide();
        } else {
          this.vBtn.hide();          
          this.vIcon1.show();
          this.vIcon1.attr('src', config[0]);  
        }
        if ((this.model.state === EMPTY) || (this.model.state === READY)) {
          this.vIcon1.addClass('xt-file-editable');
        } else {
          this.vIcon1.removeClass('xt-file-editable');
        }
        if (config[1]) { // transient feedback (file name on mouse over)
          tmp = '"'+ (this.model.name || xtiger.util.getLocaleString('infoFileNoFile')) + '"';
          this.vTrans.text(tmp);
        } else {
          this.vTrans.text('');
        }
        if (this.model.state === SELECTED) { // save button
          if (this.getParam('file_gen_name') !== 'auto') {
            this.vId.val(this.model.name);
            this.onChangeId();
            this.vId.show();
          }
          this.vSave.show();
        } else {
          this.vSave.hide();
          this.vId.hide();
        }
        this.vPerm.text(msg); // permanent feedback
        this.configureHints();
        if (config[2]) { // cancel / close icon
          this.vIcon2.attr('src', config[2]);
          this.vIcon2.removeClass('axel-core-off');
        } else {
          this.vIcon2.addClass('axel-core-off');
        }
        if (config[3]) { // delete button
          this.vDel.show();
        } else {
          this.vDel.hide();
        }
        // auto-selection
        if ((this.model.state === COMPLETE) && (doPropagate)) {
          xtiger.editor.Repeat.autoSelectRepeatIter(this._handle);
        }
      },

      configureHints : function () {
        var tmp, args, key = HINTS.fr[this.model.state];
        if (this.model.state === SELECTED) { // double indirection
          key = key[ (this.getParam('file_gen_name') === 'auto') ? 0 : 1 ];
        }
        // prepares args
        if ((this.model.state === SELECTED) || (this.model.state === LOADING) || (this.model.state === DELETING)) {
          tmp = DISPLAY_FILE_SIZE(this.model.size);
          args = { 'filename': this.model.name, 'size': tmp, 'name': this.vId.val() };
        } else if (this.model.state === ERROR || this.model.state === DELERROR) {
          args = { 'filename': this.model.name, 'error' : this.model.err || 'no error message' };
        } else if (this.model.state === COMPLETE) {
          args = { 'filename': this.model.name, 'href' : this.model.genFileURL(), 'anchor' : this.model.url };
        } else { // READY
          args = { 'href' : this.model.genFileURL(), 'anchor' : this.model.url };
          args.delInfo = this.getParam('file_delete') ? xtiger.util.getLocaleString('hintFileDelete') : '';
        }
        this.model.hints = xtiger.util.getLocaleString(key, args);
      },

      // Proxy method to use 'event' filter
      update : function (data) {
      },

      /////////////////////////////////
      // User Interaction Management
      /////////////////////////////////
      onEnterIcon : function (ev) {
        $(ev.target.parentNode).addClass('over');
        if (this.model.hints) {
          tooltip = xtiger.factory('tooltipdev').getInstance(this.getDocument());
          if (tooltip) {
            // sticky tooltip iff the hints contains some link to click
            tooltip.show(this.vIcon1, this.model.hints, (this.model.hints.indexOf('<a') !== -1));
          }
        }
      },

      onLeaveIcon : function () {
        tooltip = xtiger.factory('tooltipdev').getInstance(this.getDocument());
        if (tooltip) {
          tooltip.hide();
        }
      },

      // Handles click on the action icon vIcon1
      // Shows file selection dialog and transitions to LOADING state unless cancelled
      onActivate : function (ev) {
        var fileDlg;
        if ((this.model.state === EMPTY) || (this.model.state === READY)) {
          fileDlg = xtiger.factory('fileinputsel').getInstance(this.getDocument());
          if (fileDlg) { 
            this.onLeaveIcon(); // forces tooltip dismiss because otherwise if may stay on screen
            fileDlg.showFileSelectionDialog( this );
          }
        }
      },

      doSelectFile : function ( file ) {
        this.model.gotoSelected(file);
      },

      // Handles click on the dismiss icon vIcon2
      onDismiss : function (ev) {
        if (this.model.state === LOADING) {
          this.model.cancelTransmission();
        } else if ((this.model.state === SELECTED) || (this.model.state === ERROR)) { 
          this.model.rollback((this.model.state === ERROR));
        } else if (this.model.state === COMPLETE) {
          if (this.getParam('file_reset') === 'empty') {
            this.model.reset(this.getDefaultData());
            this.redraw(false);
          } else {
            this.model.gotoReady();
          }
        } else if (this.model.state === DELETED) {
          this.model.reset(this.getDefaultData());
          this.redraw(false);
        } else if (this.model.state === DELERROR) {
          this.model.rollback(true);
        }
      },

      onChangeId : function () {
        this.vId.val(PURIFY_NAME(this.vId.val()));
        this.vId.attr('size', this.vId.val().length + 2);
        this.configureHints();
        this.vId.blur();
      },

      onDelete : function () {
        var msg = xtiger.util.getLocaleString('askFileDelete', { 'filename' : this.model.url });
        if (confirm(msg)) {
          this.model.gotoDeleting();
          this.configureHints();
        }
      },

      onSave : function (ev) {
        this.model.gotoLoading();
      }
    }
  };

  $axel.plugin.register(
    'file', 
    { filterable: true, optional: true },
    { 
      file_URL : "/fileUpload",
      file_type : 'application/pdf',
      file_type_message : undefined,
      file_gen_name : 'auto',
      file_size_limit : undefined
    },
    _Editor
  );

  xtiger.resources.addBundle('file', 
    { 'noFileIconURL' : 'nofile32.png', 
      'saveIconURL' : 'blank32.png', 
      'saveIconURLpdf' : 'save32.png', 
      'spiningWheelIconURL' : 'spiningwheel.gif',
      'errorIconURL' : 'bug48.png',
      'dismissIconURL' : 'ok16.png',
      'cancelIconURL' : 'cancel32.png',
      'fileIconURL' : 'file32.png',
      'fileIconURLpdf' : 'pdf32.png'
    } );
  
  /*****************************************************************************\
  |                                                                             |
  | Hidden file input button  - one per document                                |
  | Please configure CSS to hide it                                             |
  |                                                                             |
  \*****************************************************************************/
  var fileInputSelector = function ( doc ) {
    this.selector = xtdom.createElement(doc, 'input');
    $(this.selector).attr( { 'id' :  'xt-file-input', 'type' : 'file' } ).change( $.proxy(fileInputSelector.prototype.onChange, this) );
    $('body', doc).append(this.selector);
  };
  
  fileInputSelector.prototype = {
    showFileSelectionDialog : function ( editor ) {
      this.delegate = editor;
      this.selector.click();
    },
    onChange : function (ev) {
      var file = (ev.target.files.length > 0) ? ev.target.files[0] : null,
          mtypes = this.delegate.getParam('file_type'),
          limit = parseInt(this.delegate.getParam('file_size_limit'));
      if (file) {
        if (isNaN(limit) || (file.size && file.size <= (limit * 1024))) {
          if (file.type && mtypes.indexOf(file.type) !== -1) {
            if (this.delegate) { this.delegate.doSelectFile(file); }
          } else {
            alert(this.delegate.getParam('file_type_message')|| xtiger.util.getLocaleString('warnFileTypeDefault'));
          }
        } else {
          alert(xtiger.util.getLocaleString('warnFileSizeLimit', 
            { 'filename' : file.name, 'size' : DISPLAY_FILE_SIZE(file.size), 'limit' : DISPLAY_FILE_SIZE(limit * 1024) }));
        }
      }
    }
  };

  xtiger.registry.registerFactory('fileinputsel', 
    {
      getInstance : function (doc) {
        var cache = xtiger.session(doc).load('fileinputsel');
        if (! cache) {
          cache = new fileInputSelector(doc);
          xtiger.session(doc).save('fileinputsel', cache);
        }
        return cache;
      }
    }
  );
  
  /*****************************************************************************\
  |                                                                             |
  | Tooltip device                                                              |
  |                                                                             |
  | FIXME:  - move to separate file                                             |
  \*****************************************************************************/
  var tooltipDevice = function ( doc ) {
    var tip = xtdom.createElement(doc, 'p');
    $(tip).attr('id', 'xt-tooltip');
    $('body', doc).append(tip);
    this.tooltip = $(tip);
    this.tooltip.mouseleave($.proxy(tooltipDevice.prototype.onLeaveTooltip, this));
    this.tooltip.mouseenter($.proxy(tooltipDevice.prototype.onEnterTooltip, this));
    this.doHideCb = $.proxy(tooltipDevice.prototype.doHide, this);
  };
  
  tooltipDevice.prototype = {
    show : function ( anchor, msg, sticky ) {
      var pos, delta;
      this.tooltip.html(msg);
      pos = $(anchor).offset();
      delta = this.tooltip.height() + $(anchor).height();
      this.tooltip.css({'left' : pos.left, 'top' : (pos.top - delta) }).show();
      this.isInside = true;
      this.isSticky = true; // FIXME: to be done
    },
    hide : function () {
      this.isInside = false;
      setTimeout(this.doHideCb, 500);
    },
    doHide : function () {
      if (!this.isInside || !this.isSticky) {
        this.tooltip.hide();
        this.inhibated = true;
      }
    },
    onLeaveTooltip : function (ev) {
      if (this.isInside && this.isSticky) {
        this.isInside = false;
        this.tooltip.hide();
      }
    },
    onEnterTooltip : function (ev) {
      this.isInside = true;
    }
  };
  
  xtiger.registry.registerFactory('tooltipdev', 
    {
      getInstance : function (doc) {
        var cache = xtiger.session(doc).load('tooltipdev');
        if (! cache) {
          cache = new tooltipDevice(doc);
          xtiger.session(doc).save('tooltipdev', cache);
        }
        return cache;
      }
    }
  );

   /*****************************************************************************\
   |                                                                             |
   | File input editor utility class to manage editor's state and model data     |
   |                                                                             |
   \*****************************************************************************/
   function fileModel (client) {
     this.state = READY;
     this.url = null;
     this.name = null;
     this.file = null; // File object when uploading
     this.delegate = client; 
     this.legacy = null; // real state while new content is beeing uploaded / confirmed
     this.preflighting = false;
   }
   
   fileModel.prototype = {
     
    // FIXME: load while a transmission is in progress ?
    reset : function (url, name) {
      if (url && (url.search(/\S/) !== -1)) {
        this.state = READY;
        this.url = url;
        this.name = name;
      } else {
        this.state = EMPTY;
        this.url = this.name = null;
      }
    },
    
    // generates URL taking into account file_base parameter
    genFileURL : function () {
      var base = this.delegate.getParam('file_base');
      return (base ? base + this.url : this.url);
    },

    getPayload : function () {
      var id, 
          payload = { 
            'xt-file' : this.file,
            'xt-mime-type' : this.file.type
          };
      if (this.preflighting) { // protocol with preflight implies to send file name with submission
        payload['xt-file-id'] = this.delegate.vId.val();
        this.preflighting = false;
      }
      return payload;
    },
    
    getPreflightOptions : function () {
      return { 
        'xt-file-preflight' : this.delegate.vId.val(),
        'xt-mime-type' : this.file.type
        };
    },
    
    rollback : function (fromErrorState) {
      if (fromErrorState && (this.preflighting)) {
        // just returns to selected state and cancel preflighting (sets it to false)
        this.state = SELECTED;
      } else if (this.legacy) {
        this.state = this.legacy[0];
        this.url = this.legacy[1];
        this.name = this.legacy[2];
        this.legacy = null;
      }
      this.preflighting = false;
      this.delegate.redraw();
    },
    
    gotoSelected : function (fileObj) {
      this.legacy = [this.state, this.url, this.name];
      this.state = SELECTED;
      this.url = null;
      this.name = fileObj.name;
      this.size = fileObj.size;
      this.file = fileObj;
      this.delegate.redraw();
    },

    // One shot function to delete a file
    // Makes an synchronous POST <Delete>fileid</Delete> request to delegate's endpoint 
    // Continue by calling either client.gotoDelError() or client.gotoDeleted()
    // Pre-requisite: jQuery, AXEL-FORMS opidum module
    // TODO: move somewhere else (dependency injection ?)
    gotoDeleting : function () {
      var _this = this,
          endpoint = this.delegate.getParam('file_delete');
      this.legacy = [this.state, this.url, this.name];
      this.state = DELETING;
      this.url = null;
      $.ajax({
        url : endpoint,
        type : 'post',
        data : '<Delete>' + this.name + '</Delete>',
        dataType : 'xml',
        cache : false,
        timeout : 20000,
        asynch : false,
        contentType : "application/xml; charset=UTF-8",
        success : function () { _this.gotoDeleted(); },
        error : function (xhr, status, e) { _this.gotoDelError($axel.oppidum ? $axel.oppidum.parseError(xhr, status, e) : xhr.responseText); }
        });
      this.delegate.redraw();
    },

    // Directly called from gotoDeleting
    gotoDeleted : function() {
      this.legacy = null; // accepts current state
      this.state = DELETED;
      this.delegate.redraw();
    },

    // Directly called from gotoDeleting
    gotoDelError : function(error) {
      this.err = error;
      this.state = DELERROR;
      this.delegate.redraw(true); // true to autoselect
    },
    
    gotoLoading : function () {
      // pre-check if state transition is possible
      var manager = xtiger.factory('upload').getInstance(this.delegate.getDocument());
      if (manager && manager.isReady()) {
        this.state = LOADING;
        // in case of immediate failure gotoError may be called in between
        // hence we have set the new state to LOADING before starting the transmission
        if (this.preflighting || (this.delegate.getParam('file_gen_name') === 'auto')) {
          this.startTransmission(manager, manager.getUploader());
          // getPayload will set preflighting to false
        } else {
          this.preflighting = true;
          this.startPreflight(manager, manager.getUploader());
        }
        this.delegate.redraw();
      } else {
        // FIXME: create a new state "upload will start when at least one other upload in progress will have been completed or aborted"
        alert(xtiger.util.getLocaleString('warnFileTooManyOperations'));
      }
    },
    
    gotoComplete : function(value) {
      this.legacy = null; // accepts current state
      this.url = value;
      this.state = COMPLETE;
      this.delegate.redraw(true); // true to autoselect
      this.delegate.update(value); // limited filtering support
    },

    // only exit from ERROR is rollback()
    gotoError : function() {
      this.state = ERROR;
      this.delegate.redraw();
    },
    
    gotoReady : function () {
      this.state = READY;
      this.delegate.redraw();
    },

    // Called after a transmission has started to retrieve the document id
    getDocumentId : function () {
      return xtiger.session(this.delegate.getDocument()).load('documentId');
    },

    startTransmission : function (manager, uploader) {
      this.transmission = uploader;
      this.transmission.setDataType('formdata');
      this.transmission.setAction(this.delegate.getParam('file_URL'));
      manager.startTransmission(this.transmission, this);
    },  

    startPreflight : function (manager, uploader) {
      this.transmission = uploader;
      this.transmission.setDataType('formdata');
      this.transmission.setAction(this.delegate.getParam('file_URL'));
      manager.startPreflight(this.transmission, this);
    },  

    cancelTransmission : function () {
      if (this.transmission) {
        var manager = xtiger.factory('upload').getInstance(this.delegate.getDocument());
        manager.cancelTransmission(this.transmission);
      }
    },

    // FIXME: handle more complex response protocol (e.g. with resourceId)
    onComplete : function (response) {
      if (this.preflighting) {
        // do not change state - proceed with upload (which may also fail on conflict !)
        this.gotoLoading();
      } else {
        this.gotoComplete($.trim(response));
        this.transmission = null;
      }
    },

    onError : function (error, code) {
      this.err = error;
      this.gotoError();
      this.transmission = null;
    },

    onCancel : function () {
      this.preflighting = false;
      this.transmission = null;
      if (this.legacy) {
        this.rollback();
      } else {
        this.reset();
        this.delegate.redraw();
      }
    }
  };  

}($axel));