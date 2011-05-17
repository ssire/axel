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

/*****************************************************************************\
|                                                                             |
|  Filter mixin to insert Image by URL or Path inside a document              |
|    exposed through the 'text' editor factory                                |
|                                                                             |
\*****************************************************************************/
(function(){    

  // Tracker menu device getter / setter
  // There should be only one such device per-document
  var _getDevice = function _getDevice (aDoc, aFilterTarget, dontCreate) {
    var devKey = 'trackerdevice';
    var device = xtiger.session(aDoc).load(devKey);
    if ((! device) && (! dontCreate)) {  // lazy creation
      device = new xtiger.editor.TrackerMenu(aDoc, [{
          'zoomout' : ['---', aFilterTarget.zoomOut], 
          'zoomin' : ['+++', aFilterTarget.zoomIn]
        }]);
      xtiger.session(aDoc).save(devKey, device);
    }
    return device;
  };                             

  // Replaces handle text content by <img> tag
  // If optional w and h are given sets image size once loaded
  function _genImageInside (editor, src, w, h) {
    var handle = editor.getHandle(),
        base = editor.getParam('base'),
        cur = xtdom.createElement(editor.getDocument(), 'img');
    if (editor.image_resizable) { // FIXME: not sure this is really needed (GC...)
      $('img', handle).unbind('mouseenter');
    }                 
    xtdom.removeChildrenOf(handle);           
    if ((w !== undefined) || (h !== undefined)) {
      // pre-defined size (loading from XML data file)
      $(cur).one('load', [handle, w, h], _onLoad);
    }
    xtdom.setAttribute(cur, 'src', base ? base + src : src);
    xtdom.setAttribute(cur, 'alt', 'image ' + src);
    handle.appendChild(cur);       
    // imposes optional size constraints through CSS max-width / max-height
    // this way no need to wait image upload to adjust it
    if (editor.image_maxWidth !== undefined) {
      $(cur).css('max-width', editor.image_maxWidth);
    }
    if (editor.image_maxHeight !== undefined) {
      $(cur).css('max-height', editor.image_maxHeight);
    }   
    // optional resizing behavior
    if (editor.image_resizable) {
      $(cur).bind('mouseenter', editor, _onMouseEnter);
    }   
  }
   
  // Adjusts image width and height to pre-defined once
  // also adjusts handle width to the same
  function _onLoad (ev) { 
    var handle = ev.data[0],
        wrapper = $('img', handle),
        w = ev.data[1],
        h = ev.data[2];                
    if (w && (! isNaN(w)) && (w > 0)) {
      wrapper.width(w);
    }
    if (h && (! isNaN(h)) && (h > 0)) {
      wrapper.height(h);
    }
    $(handle).width(wrapper.width());
  }

  // Retrieves image source from model data inside editor
  function _getImageSrcFromHandle (editor) {
    var url;
    var h = editor.getHandle();
    var base = editor.getParam('base');
    var cur = h.firstChild;
    if (cur.nodeType !== xtdom.TEXT_NODE) { // it's a filter generated <img>
      url = cur.getAttribute('src');
    } else {
      url = cur.data;
    } 
    return (base && (url.indexOf(base) !== -1)) ? url.substr(base.length, url.length) : url;
  }       
                          
  // Converts a dimension such as "200" or "200px" into integer value
  // Returns undefined in case of failure or the argument is not a string (e.g. undefined)
  // FIXME: see how to handle other units than "px" (e.g. % or cm)
  function _dim2int (value) { 
    var m, res = undefined;
    if ((typeof value) === "string") {
      m = value.match(/\d+/);
      if (m) {
        res = parseInt(m[0]);
      }
    }
    return res;
  }       

  ////////////////////////////////////////////////////////////
  // Drag and drop callbacks
  ////////////////////////////////////////////////////////////

  // This is required to signifiy that we accept drop
  function _onDragEnter (ev) {  
    var isLink;
    if (ev.dataTransfer.types.contains) { // FF
      isLink = ev.dataTransfer.types.contains("text/uri-list"); // "text/x-moz-url"
    } else { // Safari does not support contains
      isLink = ($.inArray("text/uri-list", ev.dataTransfer.types) !== -1);
    }
    if (isLink) {               
      ev.dataTransfer.dropEffect = xtiger.cross.UA.webKit ? "copy" : "link";    
      // drag from Safari to Safari sets effectAllowed to copyMove hence sets a compatible dropEffect
      // see Apple's "Using Drag and Drop From JavaScript" doc
      xtdom.preventDefault(ev);
      xtdom.stopPropagation(ev);
    }
  }       

  function _onDragOver (ev) {                  
    ev.dataTransfer.dropEffect = xtiger.cross.UA.webKit ? "copy" : "link";    
    xtdom.preventDefault(ev);  
    xtdom.stopPropagation(ev);  
  }       

  // FIXME: we should subscribe to the image too when there is an image
  // because it masks the div drop dataTransfer content  
  // https://developer.mozilla.org/En/DragDrop/Drag_Operations#drop
  function _onDrop (ev) {     
    var found = false;
    var model = ev.target.xttPrimitiveEditor || ev.target.parentNode.xttPrimitiveEditor;
    if (model) {                      
      var link =  ev.dataTransfer.getData("URL");
      if (! link) { // fall back, as far as I have seen "text/uri-list" implies test/plain in most cases
        link = ev.dataTransfer.getData("text/plain");
      }      
      // FIXME: manage a file reference from the file system drop on FF
      if (link && (link.search(/(png|jpg|jpeg|gif)$/i) !== -1)) {
        model.update(link); // same as user input
      } else {
        xtiger.cross.log('warning', 'Not a supported image link (must end with png, jpg, jpeg or gif) !\n');
      }
    }
    xtdom.stopPropagation(ev);
    xtdom.preventDefault(ev);
  }   

  ////////////////////////////////////////////////////////////
  // Mouse enter callback
  ////////////////////////////////////////////////////////////

  function _onMouseEnter (ev) {                    
    // this is the <img> event target set by jQuery
    var w, h, cdeState = {}, tmp;
    var self = ev.data, 
        _tracker = _getDevice(self.getDocument(), self);
    if (! _tracker.isTracking()) { // avoid reentrant calls (e.g. when moving out from the button)
      // computes commands state
      w = $(this).width();
      h = $(this).height();  
      if (self.image_minWidth && self.image_minHeight) {
        cdeState['zoomout'] = (w > self.image_minWidth) && (h > self.image_minHeight);
      } else if (self.image_minWidth) {
        cdeState['zoomout'] = (w > self.image_minWidth);
      } else if (self.image_minHeight) {
        cdeState['zoomout'] = (h > self.image_minHeight);
      } else {
        cdeState['zoomout'] =  false;
      }
      if (self.image_maxWidth && self.image_maxHeight) {
        cdeState['zoomin'] = (w < self.image_maxWidth) && (h < self.image_maxHeight);
      } else if (self.image_maxWidth) {
        cdeState['zoomin'] = (w < self.image_maxWidth);
      } else if (self.image_maxHeight) {
        cdeState['zoomin'] = (h < self.image_maxHeight);
      } else {
        cdeState['zoomin'] =  false;
      }
      _tracker.startEditing(self, this, cdeState);  
    } else {
      xtiger.cross.log('debug', '[Image filter] avoiding reentrant MouseEnter call');
    }   
  }       
    
  var imageFilterMixin = {  
    
    // Property remapping for chaining
    '->': {
      'awake' : '__ImageSuperAwake',
      'update' : '__ImageSuperUpdate',
      '_setData' : '__ImageSuperSetData',
      'load' : '__ImageSuperLoad',
      'startEditing' : '__ImageSuperStartEditing'
    },  
      
    // Manages two cases: 
    // 1. if aData is an image file name then generates an <img> tag 
    // 2. if aData is a string then forwards call to default _setData
    _setData : function (aData) {    
      if (aData.search && (aData.search(/(png|jpg|jpeg|gif)$/i) !== -1)) { 
        _genImageInside(this, aData);
        this._data = aData;
      } else {
        var h = this.getHandle(); 
        if (h.firstChild.nodeType !== xtdom.TEXT_NODE) {
          xtdom.removeChildrenOf(h);
          var t = xtdom.createTextNode(this.getDocument(), '');
          h.appendChild(t);
        }
        this.__ImageSuperSetData(aData);
      }
    },
  
    // Tests if the input is not empty, nor the defaultContent (no editing)
    // nor a correct file name in which case it replaces the input with 
    // an error message. Forwards call to the default update.
    update : function (aData) {   
      if ((aData.search(/\S/) !== -1) // not empty
        && (aData !== this.getDefaultData())  // edited content (no default)
        && (aData.search(/(png|jpg|jpeg|gif)$/i) === -1)) { // incorrect file extension
          this.__ImageSuperUpdate('Not a supported image file (must end with png, jpg, jpeg or gif)');
          // be careful not to finish the error message with a correct image file extension
      } else {
        this.__ImageSuperUpdate(aData);
      }
    },    

    awake : function () { 
      var curP;
      this.__ImageSuperAwake();
      // FIXME: experimental feature for FF - could be factorized inside text editor ?
      // FIXME: there should be an uninit to remove event listeners
      var h = this.getHandle();
      xtdom.addEventListener (h, "dragenter", _onDragEnter, false);  
      xtdom.addEventListener (h, "dragover", _onDragOver, false);       
      xtdom.addEventListener (h, 'drop', _onDrop, true);
      // converts image_ size contraint to integer (could be handle at the getParam level ?)
      this.image_maxWidth = _dim2int(this.getParam("image_maxwidth")); 
      this.image_maxHeight = _dim2int(this.getParam("image_maxheight"));
      this.image_minWidth = _dim2int(this.getParam("image_minwidth")); 
      this.image_minHeight = _dim2int(this.getParam("image_minheight"));
      this.image_resizable = this.image_maxWidth || this.image_maxHeight || this.image_minWidth || this.image_minHeight;
      xtiger.cross.log('debug', '[Image filter] awake maxW=' + this.image_maxWidth + ' minW=' + this.image_minWidth +
                        'maxH=' + this.image_maxHeight + ' minH=' + this.image_minHeight);
    },

    // Loads XML data from the point into the editor
    // Converts it to an XHTML representation           
    load : function (point, dataSrc) {       
      var src, tagname = this.getParam('image-tag') || 'Source', w, h;
      // if (! dataSrc.isEmpty(point)) {  // FIXME: a node with only an attribute is treated as empty
      var n = point[0];
      if (this.getParam('image_lang') === 'html') {
        //FIXME: point[1] : this depends on DOMDataSource API !       
        n = point[1]; // supposes 'img' tag
        tagname = 'src';
      }         
      if (n && n.hasAttribute(tagname)) {
        src = n.getAttribute(tagname);
      }
      // }    
      if ((! src) || (src.search(/(png|jpg|jpeg|gif)$/i) === -1)) { // no image
        this.__ImageSuperLoad(point, dataSrc);          
        // FIXME: should we replace content with an error message instead ?
      } else {
        if (this.image_resizable) { // parses and applies width and height
          // FIXME: should wait load event ?
          w = parseInt(n.getAttribute('width'));
          h = parseInt(n.getAttribute('height'));
          _genImageInside(this, src, w, h);
        } else {
          _genImageInside(this, src);
        }
        this._data = src; // FIXME: should we rely only on isModified instead of this._data ?
        this.setModified(true);
        this.set(false);
      }  
    },             

    // Parses model content and serializes it as XML directly into the logger
    save : function (logger) {
      var src = _getImageSrcFromHandle(this),
          html = (this.getParam('image_lang') === 'html'),
          tagname = this.getParam('image-tag') || 'Source', h, img;
      if (html) {
        logger.openTag('img');
        tagname = 'src';
      }                   
      // FIXME: ne pas serializer si valeur par défaut (pas image)
      logger.openAttribute(tagname);
      logger.write(src);
      logger.closeAttribute(tagname); 
      if (this.image_resizable) {         
        h = this.getHandle();
        img = $('img', h);
        if (img) {
          logger.openAttribute('width');
          logger.write($(img).width());
          logger.closeAttribute('width'); 
          logger.openAttribute('height');
          logger.write($(img).height());
          logger.closeAttribute('height');
        }
      }
      if (html) {
        logger.closeTag('img');
      }
    },  
    
    startEditing : function (aEvent) {
      var tracker;
      if (this.image_resizable) {
         tracker = _getDevice(this.getDocument(), this, true);
         if (tracker) {
           tracker.stopEditing(); // just in case 
         }
      }                        
      this.__ImageSuperStartEditing(aEvent);
    },        
               
    getData : function () {
      return _getImageSrcFromHandle (this);
    },    
    
    // Zoom in the image and it's handler by one unit
    zoomIn : function () {                
      var handle = this.getHandle(), 
          wrapper = $('img', handle), 
          w, h, rw, rh, z;                
      if (wrapper.size() > 0) { // sanity check
        w = wrapper.width();
        h = wrapper.height();
        rw = this.image_maxWidth ? this.image_maxWidth / w : undefined;
        rh = this.image_maxHeight ? this.image_maxHeight / h : undefined;
        z = rw ? ( rh ? ( rh > rw ? rw : rh ) : rw ) : rh;
        if (z) {               
          if (z > 1) {
            if (z > 1.1) {
              z = 1.1;
            } else {
              _getDevice(this.getDocument(), this, true).disable('zoomin');
            }
            wrapper.width(w * z).height(h * z);
            $(handle).width(w * z).height(h * z);
            _getDevice(this.getDocument(), this, true).enable('zoomout');
          } else {
            _getDevice(this.getDocument(), this, true).disable('zoomin');
          }
        }
      }
    },
               
    // Zoom out the image and it's handler by one unit
    zoomOut : function () {
      var handle = this.getHandle(), 
          wrapper = $('img', handle), 
          w, h, rw, rh, z;                
      if (wrapper.size() > 0) { // sanity check
        w = wrapper.width();
        h = wrapper.height();
        rw = this.image_minWidth ? this.image_minWidth / w : undefined;
        rh = this.image_minHeight ? this.image_minHeight / h : undefined;
        z = rw ? ( rh ? ( rh > rw ? rh : rw ) : rw ) : rh;
        if (z) {               
          if (z < 1) {
            if (z < 0.9) {
              z = 0.9;
            } else {
              _getDevice(this.getDocument(), this, true).disable('zoomout');
            }
            wrapper.width(w * z).height(h * z);
            $(handle).width(w * z).height(h * z); 
            _getDevice(this.getDocument(), this, true).enable('zoomin');            
          } else {
            _getDevice(this.getDocument(), this, true).disable('zoomout');
          }
        }
      }
    }
  }; 
   
  // Expose the filter to the 'text' plugin (i.e. text.js must have been loaded)
  xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('image', imageFilterMixin);   
   
})();

