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
////////////////////////////////////////////

xtiger.editor.FileFactory = (function FileFactory() {
  
  var EMPTY = 0;
  var SELECTED = 1;
  var LOADING = 2;
  var ERROR = 3;
  var COMPLETE = 4;
  var READY = 5;
  var FEEDBACK = { // permanent message visible next to the icon
      'fr' : [null, null, 'enregistrement en cours', "échec de l'enregistrement", 'enregistrement réussi', null]
      };
  var HINTS = { // tooltip message
      'fr' : ['cliquez pour choisir un fichier',
              'cliquez sur “Enregistrer” pour sauvegarder “%” (%)',
              'enregistrement de “%” (%) en cours',
              "échec de l'enregistrement de “%”<br/>%",
              '“%” a été enregistré en tant que <a target="_blank" href="%">%</a>',
              'cliquez pour remplacer <a target="_blank" href="%">%</a>' ]
      };
      
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
      var file = (ev.target.files.length > 0) ? ev.target.files[0] : null;
      var mtypes = this.delegate.getParam('file_type');
      if (file) {
        if (mtypes.indexOf(file.type) !== -1) {
          if (this.delegate) { this.delegate.doSelectFile(file); }
        } else {
          alert('Vous devez sélectionner un fichier PDF');
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
   }
   
   fileModel.prototype = {
     
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
      return (base ? base + this.url : base);
    },

    getPayload : function () {
      return this.file;
    },
    
    rollback : function () {
      if (this.legacy) {
        this.state = this.legacy[0];
        this.url = this.legacy[1];
        this.name = this.legacy[2];
        this.legacy = null;
        this.delegate.redraw();
      }
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
    
    gotoLoading : function () {
      if (this.startTransmission()) {
        this.state = LOADING;
        this.delegate.redraw();
      } else {
        // FIXME: create a new state "upload will start when at least one other upload in progress will have been completed or aborted"
        alert("D'autre(s) téléchargement(s) sont en cours, attendez qu'ils se terminent ou bien annulez en un pour pouvoir démarrer un nouveau téléchargement");
      }
    },
    
    gotoComplete : function(value) {
      this.legacy = null; // accepts current state
      this.url = value;
      this.state = COMPLETE;
      this.delegate.redraw(true); // true to autoselect
    },

    // only exist from ERROR is rollback()
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
      return xtiger.session(this.delegate.curDoc).load('documentId');
    },

    startTransmission : function () {
      var manager = xtiger.factory('upload').getInstance(this.delegate.curDoc);
      var ready = manager.isReady();
      if (ready) {
        this.transmission = manager.getUploader();
        this.transmission.setDataType('dataform');
        this.transmission.setAction(this.delegate.getParam('file_URL'));
        manager.startTransmission(this.transmission, this);
      }
      return ready;
    },  

    cancelTransmission : function () {
      if (this.transmission) {
        var manager = xtiger.factory('upload').getInstance(this.delegate.curDoc);
        manager.cancelTransmission(this.transmission);
      }
    },

    onComplete : function (response) {
      // FIXME: handle more complex response protocol (e.g. with resourceId)
      this.gotoComplete(response);
      this.transmission = null;
    },

    onError : function (error) {
      this.err = error;
      this.gotoError();
      this.transmission = null;
    },

    onCancel : function () {
      if (this.legacy) {
        this.rollback();
      } else {
        this.reset();
        this.delegate.redraw();
      }
    }
  };

  /*****************************************************************************\
  |                                                                             |
  | File input editor                                                           |
  |                                                                             |
  \*****************************************************************************/
  function _FileEditor (aHandleNode, aDocument) {
    this.curDoc = aDocument;
    this.handle = aHandleNode;
    this.defaultContent = null;   
    this.model = new fileModel (this);  
  }

  _FileEditor.prototype = {

    defaultParams : {
      file_URL : "/fileUpload",
      file_type : 'application/pdf'
      // file_size_limit : 1024
    },

    getParam : function (name)  {
      return (this.param && this.param[name]) || this.defaultParams[name];
    },                

    can : function (aFunction) {      
      return typeof this[aFunction] === 'function';
    },

    execute : function (aFunction, aParam) {
      return this[aFunction](aParam);
    },  

    /////////////////////////////////
    // Creation
    /////////////////////////////////

    init : function (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      this.defaultContent = aDefaultData;
      if (typeof (aParams) === 'object') { // FIXME: factorize params handling in AXEL
        this.param = aParams;
      }
      this.awake ();
    },

    awake : function () {
      this.vIcon1 = $('.xt-file-icon1', this.handle);
      this.vTrans = $('.xt-file-trans', this.handle);
      this.vPerm = $('.xt-file-perm', this.handle);
      this.vIcon2 = $('.xt-file-icon2', this.handle);
      this.vSave = $('.xt-file-save', this.handle).hide();
      this.vIcon1.bind({
        'click' : $.proxy(_FileEditor.prototype.onActivate, this),
        'mouseenter' : $.proxy(_FileEditor.prototype.onEnterIcon, this),
        'mouseleave' : $.proxy(_FileEditor.prototype.onLeaveIcon, this)
      });
      this.vIcon2.click( $.proxy(_FileEditor.prototype.onDismiss, this) );
      this.vSave.click( $.proxy(_FileEditor.prototype.onSave, this) );
      // manages transient area display (works with plugin css rules)
      $(this.handle).bind({
       mouseleave : function (ev) { $(ev.currentTarget).removeClass('over'); }
       // 'over' is set inside onEnterIcon
      });
      // HTML 5 DnD : FF >= 3.6 ONLY
      // FIXME: TO BE DONE !
      // if (xtiger.cross.UA.gecko) { // FIXME: check version too !
      //  xtdom.addEventListener (this.handle, "dragenter", function (ev) { _this.onDragEnter(ev) }, false);  
      //  xtdom.addEventListener (this.handle, "dragleave", function (ev) { _this.onDragLeave(ev) }, false);  
      //  xtdom.addEventListener (this.handle, "dragover", function (ev) { _this.onDragOver(ev) }, false);  
      //  xtdom.addEventListener (this.handle, "drop", function (ev) { _this.onDrop(ev) }, false);
      // }
      this.model.reset(this.defaultContent);
      this.redraw(false);
    },

    // The seed is a data structure that should allow to "reconstruct" a cloned editor
    makeSeed : function () {
      if (! this.seed) { // lazy creation
        var factory = xtiger.editor.Plugin.prototype.pluginEditors['file']; // see last line of file
        this.seed = [factory, this.defaultContent, this.param];
      }
      return this.seed;
    },  

    /////////////////////////////////
    // Content management
    /////////////////////////////////

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
        // [ icon, true to display file name inside transient area, dismiss icon ]
        [ xtiger.bundles.file.noFileIconURL, true, null],
        [ xtiger.bundles.file.saveIconURL, false, xtiger.bundles.file.cancelIconURL],
        [ xtiger.bundles.file.spiningWheelIconURL, false, xtiger.bundles.file.cancelIconURL ],
        [ xtiger.bundles.file.errorIconURL, false, xtiger.bundles.file.cancelIconURL ],
        [ xtiger.bundles.file.pdfIconURL, false, xtiger.bundles.file.dismissIconURL ],
        [ xtiger.bundles.file.pdfIconURL, true, null ]
      ];
      var tmp;
      var config = UI[this.model.state];
      var msg = FEEDBACK.fr[this.model.state];
      // Updates widget view
      this.vIcon1.attr('src', config[0]);
      if ((this.model.state === EMPTY) || (this.model.state === READY)) {
        this.vIcon1.addClass('xt-file-editable');
      } else {
        this.vIcon1.removeClass('xt-file-editable');
      }
      if (config[1]) { // transient feedback (file name on mouse over)
        tmp = "“"+ (this.model.name || "pas de fichier") + "”";
        this.vTrans.text(tmp);
      } else {
        this.vTrans.text('');
      }
      if (this.model.state === SELECTED) { // save button
        this.vSave.show();
      } else {
        this.vSave.hide();
      }
      this.vPerm.text(msg || ''); // permanent feedback
      this.configureHints();
      if (config[2]) { // cancel / close icon
        this.vIcon2.attr('src', config[2]);
        this.vIcon2.removeClass('axel-core-off');
      } else {
        this.vIcon2.addClass('axel-core-off');
      }
      // auto-selection
      if ((this.model.state === COMPLETE) && (doPropagate)) {
        xtiger.editor.Repeat.autoSelectRepeatIter(this.handle);
      }
    },
    
    configureHints : function () {
      var a, i, tmp, tokens, vars, mb, kb, spec = HINTS.fr[this.model.state];
      if (spec.indexOf('%') !== -1) {
        a = [];
        if ((this.model.state === SELECTED) || (this.model.state === LOADING)) {
          if (this.model.size > 1024) {
            kb = this.model.size >> 10;
            if (kb > 1024) {
              mb = this.model.size >> 20;
              kb = (this.model.size - (mb << 20)) >> 10;
            } else {
              mb = 0;
            }
            tmp = mb >= 1 ? mb + '.' + kb + ' MB' : kb + ' KB';
          } else {
            tmp = this.model.size; 
          }
          vars = [this.model.name, tmp];
        } else if (this.model.state === ERROR) {
          vars = [this.model.name, this.model.err];
        } else if (this.model.state === COMPLETE) {
          vars = [this.model.name, this.model.genFileURL(), this.model.url];
        } else { // READY
          vars = [this.model.genFileURL(), this.model.url];
        }
        tokens = spec.split('%');
        for (i = 0; i < tokens.length; i++) { a.push(tokens[i]); i<vars.length ? a.push(vars[i]) : null }
        this.model.hints = a.join('');
      } else {
        this.model.hints = spec;
      }
    },

    load : function (point, dataSrc) {
      var p, name, url = (point !== -1) ? dataSrc.getDataFor(point) : this.defaultContent;
      if (dataSrc.hasAttributeFor('data-input', point)) { // optional original file name
        p = dataSrc.getAttributeFor('data-input', point);
        name = dataSrc.getDataFor(p);
      }
      this.model.reset(url, name);
      this.redraw(false);
    },

    save : function (logger) {
      var tmp;
      logger.write(this._dump());
      if ((this.model.legacy && this.model.legacy[2]) || (!this.model.legacy && this.model.name)) { // records original file name 
        tmp = this.model.legacy ? this.model.legacy[2] : this.model.name;
        logger.writeAttribute("data-input", tmp);
      }
    },

    // FIXME: SHOULD NOT BE CALLED currently the plugin is not filterable and thus should not be updated 
    update : function (data) {
      this.model.reset(data);
      this.redraw(true);
    },

    getData : function () {
      return this.model;
    },

    /////////////////////////////////
    // User Interaction Management
    /////////////////////////////////

    isFocusable : function () { return false; },

    // Returns the <img> tag which is used to present the photo in the document view
    getHandle : function () { return this.handle; },
    
    onEnterIcon : function (ev) {
      $(ev.target.parentNode).addClass('over');
      if (this.model.hints) {
        tooltip = xtiger.factory('tooltipdev').getInstance(this.curDoc);
        if (tooltip) {
          // sticky tooltip iff the hints contains some link to click
          tooltip.show(this.vIcon1, this.model.hints, (this.model.hints.indexOf('<a') !== -1));
        }
      }
    },
    
    onLeaveIcon : function () {
      tooltip = xtiger.factory('tooltipdev').getInstance(this.curDoc);
      if (tooltip) {
        tooltip.hide();
      }
    },
    
    // Handles click on the action icon vIcon1
    // Shows file selection dialog and transitions to LOADING state unless cancelled
    onActivate : function (ev) {
      var fileDlg;
      if ((this.model.state === EMPTY) || (this.model.state === READY)) {
        fileDlg = xtiger.factory('fileinputsel').getInstance(this.curDoc);
        if (fileDlg) { 
          this.onLeaveIcon(); // forces tooltip dismiss because otherwise if may stay on screen
          fileDlg.showFileSelectionDialog( this );
        }
      } else if (this.model.state === ERROR) {
        alert(this.model.err);
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
        this.model.rollback();
      } else if (this.model.state === COMPLETE) {
        this.model.gotoReady();
      }
    },
    
    onSave : function (ev) {
      this.model.gotoLoading();
    },
    
    onDragEnter : function (ev) {  
      xtdom.addClassName (this.handle, 'axel-dnd-over');
      xtdom.stopPropagation(ev);
      xtdom.preventDefault(ev);
    },

    onDragOver : function (ev) {       
      xtdom.stopPropagation(ev);
      xtdom.preventDefault(ev);
    },

    onDragLeave : function (ev) {  
      xtdom.removeClassName (this.handle, 'axel-dnd-over');
      xtdom.stopPropagation(ev);
      xtdom.preventDefault(ev);
    },  

    onDrop : function (ev) {   
      var file, imageType;
      var dt = ev.dataTransfer;
      var files = dt.files; 
      xtdom.stopPropagation(ev);
      xtdom.preventDefault(ev);

      // find the first image file
      for (var i = 0; i < files.length; i++) {
        file = files[i];  
        imageType = /image.*/;  
        if (!file.type.match(imageType)) {  
          continue;  
        }
        this.model.startTransmission(this.curDoc, 'dnd', file, this.getParam('file_URL'));
      } 
    } 
  }

  return {  

    // Returns the DOM node where the editor will be planted
    // This node must be the last one required to recreate the object from its seed
    // because seeding will occur as soon as this node is found
    createModel : function (container, useNode, curDoc) {
      var viewNode; 
      viewNode = xtdom.createElement (curDoc, 'span');
      xtdom.addClassName (viewNode , 'xt-file');
      $(viewNode).html(
        '<img class="xt-file-icon1"/><span class="xt-file-trans"/><input class="xt-file-save" type="button" value="Enregistrer"/><span class="xt-file-perm"/><img class="xt-file-icon2"/>'
        );
      // xtdom.addClassName (viewNode , 'axel-drop-target');
      container.appendChild(viewNode);
      return viewNode;
    },

    createEditorFromTree : function (handleNode, xtSrcNode, curDoc) {
      var _model = new _FileEditor(handleNode, curDoc);
      var _data = xtdom.extractDefaultContentXT(xtSrcNode);
      var _param = {}, base;
      xtiger.util.decodeParameters(xtSrcNode.getAttribute('param'), _param);
      // if (_param['filter'])
      //   _model = this.applyFilters(_model, _param['filter']);    
      if (base = _param['file_base']) { // sanitize base URL
        if (base.charAt(base.length - 1) != '/') {
          _param['file_base'] = base + "/";
        }
      } 
      _model.init(_data, _param, false);      
      // option always false, no unique key, no repeater
      return _model;
    },

    createEditorFromSeed : function (seed, clone, curDoc, aRepeater) {
      var _model = new _FileEditor(clone, curDoc);
      var _defaultData = seed[1];
      var _param = seed[2];                  
      // if (_param['filter'])
      //   _model = this.applyFilters(_model, _param['filter']);
      _model.init(_defaultData, _param, false, undefined, aRepeater);
      // option always false, no unique key
      return _model;
    }
  }
})();

/////////////////////////////////
// Device Registrations
/////////////////////////////////

xtiger.editor.Plugin.prototype.pluginEditors['file'] = xtiger.editor.FileFactory;

// Resource registration
xtiger.resources.addBundle('file', 
  { 'noFileIconURL' : 'nofile32.png', 
    'saveIconURL' : 'save32.png', 
    'spiningWheelIconURL' : 'spiningwheel.gif',
    'errorIconURL' : 'bug48.png',
    'dismissIconURL' : 'ok16.png',
    'cancelIconURL' : 'cancel32.png',
    'pdfIconURL' : 'pdf32.png'
  } );

