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
 * Filter class to insert Image by URL inside a document
 *
 * There is only one filter per device (shared instance)
 */             
 
 var _ImageFilter  = (function _ImageFilter () {    

  /////////////////////////////////////////////////
  /////    Static Image Mixin Part     ////////
  /////////////////////////////////////////////////
 
  // Replaces handle text content by <img> tag
  function _genImageInside (editor, src) {
  	var h = editor.getHandle();
  	var base = editor.getParam('base');
  	xtdom.removeChildrenOf(h);			
  	var cur = xtdom.createElement(editor.getDocument(), 'img');
  	xtdom.setAttribute(cur, 'src', base ? base + src : src);
  	xtdom.setAttribute(cur, 'alt', 'image ' + src);
  	h.appendChild(cur);
  }

  // Retrieves image source from model data inside editor
  function _getImageSrcFromHandle (editor) {
  	var url;
  	var h = editor.getHandle();
  	var base = editor.getParam('base');
  	var cur = h.firstChild;
  	if (cur.nodeType != xtdom.TEXT_NODE) { // it's a filter generated <img>
  		url = cur.getAttribute('src');
  	} else {
  		url = cur.data;
  	} 
  	return (base && (url.indexOf(base) != -1)) ? url.substr(base.length, url.length) : url;
  }
	
  ////////////////////////////////////////////////////////////
  // Drag and drop callbacks
  ////////////////////////////////////////////////////////////

  // This is required to signifiy that we accept drop
  function _onDragEnter (ev) {  
  	var isLink = ev.dataTransfer.types.contains("text/uri-list");
  	if (isLink) {
  		xtdom.preventDefault(ev);
  		xtdom.stopPropagation(ev);
  	}
  }				

  function _onDragOver (ev) {  
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
      if (link.search(/(png|jpg|jpeg|gif)$/i) != -1)  {
    	  model.update(link); // same as user input
    	} else {
  	    xtiger.cross.log('warning', 'Not a supported image link (must end with png, jpg, jpeg or gif) !\n');
  	  }
  	}
  	xtdom.stopPropagation(ev);
    xtdom.preventDefault(ev);
  }     
 		
 	return {  

     ///////////////////////////////////////////////
     /////     Instance Image Mixin Part    ////////
     ///////////////////////////////////////////////

 		// Property remapping for chaining
 		'->': {
 		  'awake' : '__ImageSuperAwake',
 		  'update' : '__ImageSuperUpdate',
 		  '_setData' : '__ImageSuperSetData',
 		  'load' : '__ImageSuperLoad'
 		},  
 		      
 		// Manages two cases: 
 		// 1. if aData is an image file name then generates an <img> tag 
 		// 2. if aData is a string then forwards call to default _setData
 		_setData : function (aData) {    
			if (aData.search(/(png|jpg|jpeg|gif)$/i) != -1) { 
				_genImageInside(this, aData);
			} else {
			  var h = this.getHandle(); 
      	if (h.firstChild.nodeType != xtdom.TEXT_NODE) {
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
		  if ((aData.search(/\S/) != -1) // not empty
		    && (aData !== this.getDefaultData())  // edited content (no default)
		    && (aData.search(/(png|jpg|jpeg|gif)$/i) == -1)) { // incorrect file extension
		      this.__ImageSuperUpdate('Not a supported image file (must end with png, jpg, jpeg or gif)');
		      // be careful not to finish the error message with a correct image file extension
		  } else {
		    this.__ImageSuperUpdate(aData);
		  }
		}, 		
		
		awake : function () { 
		  this.__ImageSuperAwake()
			// FIXME: experimental feature for FF - could be factorized inside text editor ?
			// FIXME: there should be an uninit to remove event listeners
			var h = this.getHandle();
			xtdom.addEventListener (h, "dragenter", _onDragEnter, false);  
			xtdom.addEventListener (h, "dragover", _onDragOver, false);  			
			xtdom.addEventListener (h, 'drop', _onDrop, true);
		},
		
		// Loads XML data from the point into the editor
		// Converts it to an XHTML representation        		
		load : function (point, dataSrc) {       
			var src;
			// if (! dataSrc.isEmpty(point)) {  // FIXME: a node with only an attribute is treated as empty
			var n = point[0]; // DOM node carrying the image
			src = point[0].getAttribute(this.getParam('image-tag') || 'Source');
			// }			
			if ((! src) || (src.search(/(png|jpg|jpeg|gif)$/i) == -1)) { // no image
        this.__ImageSuperLoad(point, dataSrc);          
        // FIXME: should we replace content with an error message instead ?
			} else {
			  _genImageInside(this, src);
				this.setModified(true);
			  this.set(false);			  
			}
		},             
		
		// Parses model content and serializes it as XML directly into the logger
		save : function (logger) {  
			var src = _getImageSrcFromHandle (this);
			logger.openAttribute(this.getParam('image-tag') || 'Source');
			logger.write(src);
			logger.closeAttribute(this.getParam('image-tag') || 'Source');
		},      
		                 
		getData : function () {
			return _getImageSrcFromHandle (this);
		}
   };

 })();

//Register this filter as a filter of the 'text' plugin (i.e. text.js must have been loaded)
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('image', _ImageFilter);