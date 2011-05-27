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

/*      
 * TextDevice is a controller class that manages interactions between an XTiger primitive editor, 
 * an input field wrapper (a class that wraps a DOM <input> or <textarea> used for input) and 
 * the keyboard manager for the application.
 * You need to instantiate only one TextDevice per type of primitive editor per document
 * 
 * @input is the wrapper of the HTML input field, which is either an <input> or a <textarea> element
 * @kbd is the keyboard manager
 * @doc is the document for which the TextDevice is instantiated   
 *                             
 * TODO
 * - find a way to put the cursor at the end of a textarea device (like input)
 */         
             
(function () {    

  /**
   * Private class that wraps a <div> element to be used with an edit field (textarea or input), 
   * in order to compute the text metrics for a given text extract and apply (some) of them 
   * to the edit field.The input field must grab / release the instance before making any computation 
   * so that the <div> element used for computation is inserted into the DOM to inherit the style attributes
   * before computing text metrics. The computation works only if the CSS attributes of the div 
   * (with a axel-text-shadowbuffer class) are set to inherit (cf. axel.css).
   *  
   * @class _TextMetrics
   */
  var _TextMetrics = function _TextMetrics (doc) {     
    // _TextMetrics Constructor code
    this.div = xtdom.createElement (doc, 'div');
    xtdom.addClassName(this.div, 'axel-text-shadowbuffer');
    this.divText = xtdom.createTextNode(doc, '');
    this.div.appendChild (this.divText);       
  }
  
  _TextMetrics.prototype = {
    
    // Sets initial bounding box constraints of the shadow <div> and on the handle
    setBBox : function setBBox (w, h, handle, shape, type) {
      var wpx = w + 'px';
      var hpx = h + 'px'; 
      this.lastWidth = w;
      this.lastHeight = h;

      // 1. initializes shadow div 
      if ((type == 'input') || (shape == 'self')) { // surface will grow horizontaly
        this.div.style.width = ''; 
        this.div.style.height = '';
      } else { // surface will grow vertically
        this.div.style.width = wpx; // blocks width to that value
        this.div.style.height = 'auto'; 
          // text will overflow verticaly once filled
          // 'auto' is required for FF and Opera
      }

      // 2. initializes text entry field
      handle.style.width = wpx;
      handle.style.height = hpx;
    },

    // Sets text content for which to compute metrics
    setText : function setText (text) {    
      this.divText.data = text + 'm';
      // FIXME: try with replaceData and appenData of CharacterData ?
    },

    // sets the width of the handle to the width of the shadow <div>
    adjustWidth : function adjustWidth (handle) {     
      var w = Math.max(this.div.offsetWidth, this.div.clientWidth, this.div.scrollWidth);     
      if (w > this.lastWidth) {
        handle.style.width = w - (w % 20)  + 20 + 'px';  // FIXME: +20 too empirical ?
        this.lastWidth = w;
      }
    },

    // sets the height of the handle to the height of the shadow <div>
    adjustHeight : function adjustHeight (handle, init) {    
      var h = Math.max(this.div.offsetHeight, this.div.clientHeight, this.div.scrollHeight);
      if (h > this.lastHeight) {
        handle.style.height = h + "px";
        this.lastHeight = h;
      }    
    },

    grab : function grab (field) {     
      field.hook.appendChild(this.div);
    },

    release : function (field, willEditAgain) {   
      field.hook.removeChild(this.div);
    }    
  };
  
  
  //////////////////////////////////////////////////////////
  //                   TextDevice                        ///
  //////////////////////////////////////////////////////////
  
  xtiger.editor.TextDevice = function (input, kbd, doc) {
    this.keyboard = kbd;
    this.field = input; // managed input field wrapper  
    // assigns unique object per-document for text metrics computations
    this.metrics = xtiger.session(doc).load('metrics');
    if (! this.metrics) {  
      this.metrics = new _TextMetrics (doc);
      xtiger.session(doc).save('metrics', this.metrics);
    }
    this.currentEditor = null;
    var _this = this; // event callback to subscribe / unscribe later
    this.blurHandler = function (ev) { _this.handleBlur(ev); }; 
  }; 

  xtiger.editor.TextDevice.prototype = {

    // Returns the DOM input field managed by the device (should be a <textarea> or an <input>)
    getHandle : function () {
      return this.field.getHandle();
    },   
  
    // Returns true if the text is actually editing data (hence its DOM input field is visible)
    isEditing : function () {
      return (null != this.currentEditor);
    },     
      
    // Returns the cursor offset inside the entry field or -1 if it fails
    _computeOffset : function (mouseEvent, editor) {  
      var offset = -1;
      var selObj, selRange;
      // the following code used to work at least on Firefox
      // but for now the getRangeAt(0) throws an exception because there are no range defined for a click !
      if (mouseEvent && window.getSelection &&          
            (editor.getParam('clickthrough') == 'true')) {
        selObj = window.getSelection();  
        if (selObj && (selObj.rangeCount > 0)) {     
          selRange = selObj.getRangeAt(0);
          if (selRange) {
            offset = selRange.startOffset;     
          }
        }
      }
      return offset;
    },
  
    ////////////////////////////////
    // Core methods
    ////////////////////////////////    
  
    startEditing : function (editor, mouseEvent, doSelectAll) {  
      var ghost, // node to use for geometry computation when shape="parent"
          offset; // initial cursor position (-1 means at the end)
      var constw, consth;
      var shape;
      var redux = false;
      var handle = this.field.getHandle();
      var coldStart = false;
    
      if (this.currentEditor) { 
        // another editing was in progress with the same device
        // this is unlikely to happen as when directly clicking another field will trigger unfocus first
         this.stopEditing (true);       
      } else {
        // registers to keyboard events
        this._kbdHandlers = this.keyboard.register(this);
        this.keyboard.grab(this, editor);
        // transfers class attribute
        if (editor.getParam('hasClass')) {
          xtdom.addClassName(handle, editor.getParam('hasClass'));
        }
        // saves cursor offset (where the user has clicked)
        if (!doSelectAll) { 
          offset = this._computeOffset(mouseEvent, editor);
        }
        coldStart = true;     
        this.field.show (editor);  
      }   
    
      this.currentEditor = editor;     
      ghost = editor.getGhost();
    
      // computes current geometry of the editor to apply it to the buffer later on
      constw = Math.max(ghost.offsetWidth, ghost.clientWidth, ghost.scrollWidth);
      consth = Math.max(ghost.offsetHeight, ghost.clientHeight, ghost.scrollHeight);
      // installs the input field which may change the DOM and break editor.getGhost()
      this.field.grab (editor);  
      this.metrics.grab(this.field); // to get same CSS properties
    
      if (editor.getParam('enablelinebreak') == 'true') {
        this.keyboard.enableRC();
      }  

      // cursor positioning and initial text selection
      if (doSelectAll) {
        xtdom.focusAndSelect(handle);
      } else if (offset) {        
        xtdom.focusAndMoveCaretTo(handle,
          (offset == -1) ? handle.value.length : offset);
      }

      shape = this.currentEditor.getParam('shape');
      if (shape.charAt(shape.length - 1) == 'x') { // a bit tricky: shape=parent-XXXpx
        var m = shape.match(/\d+/);
        if (m) {
          constw = constw - parseInt(m[0]);
          redux = true;
        }
      }       
                  
      // applies initial geometry to the input field handle                                                              
      this.metrics.setBBox (constw, consth, handle, shape, this.field.deviceType); 
      this.metrics.setText(this.field.getValue());      
      if ((this.field.deviceType == 'input') || (shape == 'self')) { // 'auto' may give a too large field
        this.metrics.adjustWidth(handle);
      }                
      if (redux) { // need to adjust height as width was reduced
        this.metrics.adjustHeight(handle);
      }
      if (coldStart) {
        // must be called at the end as on FF 'blur' is triggered when grabbing
        xtdom.addEventListener(handle, 'blur', this.blurHandler, false);
      }
    },  
  
    /**
     * Stops the edition process on the current model
     * 
     * @param willEditAgain
     * @param isCancel
     */
    stopEditing : function (willEditAgain, isCancel) {
      if (! this.currentEditor)
        return;
      if (! this.stopInProgress) {  
        // FIXME: guarded because in some cases (for instance if printing an alert for debugging)
        // stopEditing maybe called twice as the blurHandler is triggered even if removed in 1st call
        this.stopInProgress = true; 
        var model = this.currentEditor; // simple alias                              
        this.currentEditor = null;        
        this.field.release(model, willEditAgain); // releases the input field wrapper
        this.metrics.release(this.field);
        if (! isCancel) {
          model.update(this.field.getValue()); // updates model with new value
        }
        if (! willEditAgain) {  // uninstalls text device             
          if (model.getParam('enablelinebreak') == 'true') {
            this.keyboard.disableRC();
          }                                                 
          // FIXME: uncomment these lines if the 'release' extension is used from filters ?
              // if (model.can('release')) { // gives a chance to the filter to restore keybord behavior
              //   model.execute('release', [this.keyboard, this]);
              // }
          this.keyboard.unregister(this, this._kbdHandlers);
          this.keyboard.release(this, model);           
          xtdom.removeEventListener(this.getHandle(), 'blur', this.blurHandler, false);
          if (model.getParam('hasClass')) {
            xtdom.removeClassName(this.getHandle(), model.getParam('hasClass'));
          }
        }
        // this.field.release(model, willEditAgain); // releases the input field wrapper
        // this.currentEditor = null;
        this.stopInProgress = false;
      }
    },
  
    getCurrentModel: function () {
      return this.currentEditor;
    },
  
    cancelEditing : function () {
      this.stopEditing(false, true);
    },
  
    handleBlur : function (ev) {    
      this.stopEditing (false);
    },  
  
    doKeyDown : function (ev) { 
      if (this.currentEditor && (this.currentEditor.getParam('expansion') == 'grow')) {
        this.curLength = this.field.getValue().length; // to detect paste in doKeyUp
        this.adjustShape ();                    
      }                
    },    
  
    doKeyUp : function (ev) { 
      if (this.currentEditor && this.currentEditor.can('onkeyup')) {
        this.currentEditor.execute('onkeyup', this.field.getHandle());
      }
      if (this.currentEditor && (this.currentEditor.getParam('expansion') == 'grow')) {     
        if (this.field.getValue().length > (this.curLength + 1)) { // paste detection
          this.adjustShape();
          // => ca ne marche pas, comment déclencher un refresh de l'affichage ?
        }
      }   
    },  
    
    adjustShape : function () {                 
      this.metrics.setText(this.field.getValue());
      var h = this.field.getHandle();
      this.metrics.adjustWidth(h);
      if (this.field.deviceType == 'textarea') {
        this.metrics.adjustHeight(h);
      } 
    }
  };                
                      
  //////////////////////////////////////////////////////////
  //                   Floating Field                    ///
  //////////////////////////////////////////////////////////
         
/**
 * FloatingField is a wrapper for an HTML element used for text input that can be shared 
 * between all the XTiger editors of a given document. This input field will "float"
 * on top of the primitive editor when the user activates editing mode.
 * You need to instantiate only one FloatingField of each kind for each document
 *
 * @kind is the type of HTML element used for input ('textarea' or 'input')          
 */
xtiger.editor.FloatingField = function (kind, doc) {
  this.deviceType = kind;          
  this.handle = this.createHandleForDoc (kind, doc);
  this.hook = xtdom.createElement (doc, 'div');
  xtdom.addClassName(this.hook, 'axel-text-container'); 
  this.hook.appendChild(this.handle);  
  this.hook.style.display = 'none';
};
          
xtiger.editor.FloatingField.prototype = {

  // Creates an HTML input field to be controlled by a device
  createHandleForDoc : function (kind, doc) {   
    var device = xtiger.session(doc).load('ff_' + kind);
    if (! device) {
      // creates the shared <input> or <textare> DOM node for editing
      // var body = doc.getElementsByTagName('body')[0]; // FIXME: body or BODY ? (use a hook for insertion ?)
      device = xtdom.createElement (doc, kind);
      xtdom.addClassName(device, 'axel-text-float');
      // body.appendChild (device);
      xtiger.session(doc).save('ff_' + kind, device);
    }
    return device;
  },  
  
  // Returns the DOM element used for editing (basically a <textarea> or <input>)
  getHandle : function () {
    return this.handle;
  },           

  getValue : function () {
    return this.handle.value;
  },

  show : function () {
    this.hook.style.display = 'inline';     
  },           
            
  // Inserts as first child into the handle a hook which is an inline div container 
  // styled as a relative positioned element that contains an input or textarea 
  // edit field positioned as absolute    
  // FIXME: hides the handle during editing
  grab : function (editor) {     
    this.handle.value = editor.getData();
    this.editorHandle = editor.getHandle();
    this.editorHandle.parentNode.insertBefore (this.hook, this.editorHandle); 
      // FIXME: before and not inside 1st child, not all styling will reach it (e.g. <pre>)
    editor.getHandle().style.visibility = 'hidden';
    // DEPRECATED: var ghost = editor.getGhost(); // moves the handle at the ghost position    
    // this.setPosition (ghost); 
  },

  // Removes the first child that was inserted inside the handle 
  // Restore the visibility of the handle
  release : function (editor, willEditAgain) {   
    this.editorHandle.parentNode.removeChild(this.hook);
    editor.getHandle().style.visibility = 'visible';
    if (! willEditAgain) {
      this.hook.style.display = 'none';
    }                
  },
  
  setPosition : function (ghost) {  
    var pos = xtdom.findPos(ghost);
    with (this.handle.style) {
        left = pos[0] + 'px';
        top = pos[1] + 'px';
    }      
  }
                                
};

//////////////////////////////////////////////////////////
//                Placed Field                         ///
//////////////////////////////////////////////////////////

xtiger.editor.PlacedField = function (kind, doc) {
  this.myDoc = doc;
  this.deviceType = kind;          
  this.handle = this.createHandleForDoc (kind, doc);
  this.handle.style.display = 'none';  
  this.cache = {};
  this.hook;
};

xtiger.editor.PlacedField.prototype = {
  
  // Static method that creates the HTML input field (the handle)
  // FIXME: where to insert the editor into the target documentation + 'body' or 'BODY' ?
  createHandleForDoc : function (kind, doc) {   
    var device = xtiger.session(doc).load('pf_' + kind);
    if (! device) {
      // creates the shared <input> or <textarea> DOM node for editing
      device = xtdom.createElement (doc, kind);
      xtdom.addClassName(device, 'axel-text-placed');
      xtiger.session(doc).save('pf_' + kind, device);
    }          
    return device;
  },
  
  // Returns the DOM element used for editing (basically a <textarea> or <input>)
  getHandle : function () {
    return this.handle;
  },           

  getValue : function () {
    return this.handle.value;
  },

  show : function (editor) {             
    this.handle.style.display = 'inline';    
  },           
        
  // Replaces the handle with a hook that has the same root element as the handle
  // and that contains an input or textarea edit field
  grab : function (editor) {     
    var _htag;
    this.handle.value = editor.getData();
    this.editorHandle = editor.getHandle();
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
  },
          
  // Restores the handle that was replaced in release
  release : function (editor, willEditAgain) {   
    var parent = this.hook.parentNode;      
    parent.insertBefore (this.editorHandle, this.hook, true);
    parent.removeChild(this.hook);
    if (! willEditAgain) {
      this.handle.style.display = 'none';
    }         
  }
};           

/* Manages dynamic creation of TextDevice with different parameters
 * There is one TextDeviceFactory per application
 */
xtiger.editor.TextDeviceFactory = function () {
  this.devKey = 'TextDeviceCache';
  //this.filters = {}; // filter constructors
} 

xtiger.editor.TextDeviceFactory.prototype = {  
  
  // Gets or create cache to store devices on a per-document basis
  _getCache : function (doc) {
    var cache = xtiger.session(doc).load(this.devKey);
    if (! cache) {
      cache = {'input' : { 'float' : null, 'placed' : null},
               'textarea' : { 'float' : null, 'placed' : null},
           'filtered' : {} // instantiated filtered devices per-document
          };
      xtiger.session(doc).save(this.devKey, cache);
    }
    return cache;
  },
  
  // filter is an optional filter name (which must have been registered with registerFilter)
  getInstance : function (doc, type, layout) {
    // Parameters sanitization      
    var t = type || 'input';
    if ((t != 'input') && (t != 'textarea')) {
      xtiger.cross.log('error', "AXEL error : unkown text device type '" + t + "' requested !");
      t = 'input';
    }
    var l = layout || 'placed';
    if ((l != 'float') && (l != 'placed')) {
      xtiger.cross.log('error', "AXEL error : unkown text device layout '" + l + "' requested !");
      l = 'float';
    }     
    // Get or create device corresponding to parameters
    var cache = this._getCache(doc);
    var fConstructor;
    var device = cache[t][l];
    if (! device) {
      var wrapper = (l == 'float') ? new xtiger.editor.FloatingField (t, doc) : new xtiger.editor.PlacedField (t, doc);
      device =  new xtiger.editor.TextDevice (wrapper, xtiger.session(doc).load('keyboard'), doc);  
      if (fConstructor) {
        device.addFilter( fConstructor(doc) ); // create and add filter (1 filter per device type per document)
      }
      cache[t][l] = device; // stores device for reuse in same document
    }
    return device;
  }
} 

xtiger.registry.registerFactory('text-device', new xtiger.editor.TextDeviceFactory());           

})();
