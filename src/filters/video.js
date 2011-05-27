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
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */    

/**
  * Class _VideoFilter (mixin filter)
  *
  * This is an experimental filter that has been developped as a replacement for the video.js lens device plugin
  * It's design is simpler as the video URL is always visible on the screen and edited through a text editor
  * The plugin adds a <br /><object>...</object><span class="axel-core-boundary"/> forrest right after the text handle
  * _extractVideoId and _buildYoutubeSnippet are copied from video.js.
  *
  * FIXME: currently you must include video.js first as it shares its bundle with it (for the TV icon URL)
  * 
  * @class _VideoFilter
  */
 var _VideoFilter  = (function _VideoFilter () {    

   /////////////////////////////////////////////////
   /////    Static Clear Mixin Part     ////////
   /////////////////////////////////////////////////

    /*
     * Extracts You Tube video id from a valid link to the video (either
     * the "permalink" or the page's link)
     */
    var _extractVideoId = function _extractVideoId (aValidUrl) {
      var _tmp = aValidUrl.match(/^[^&]*/)[0];
      return _tmp.match(/[^\=\/]*$/)[0];
    }
    
    var _buildYoutubeSnippet = function _buildYoutubeSnippet (aVideoID, aSize, aParams, targetDoc) {
      var _params = aParams || {};
      _params['movie'] = aVideoID;
      if (!_params['allowFullScreen'])
        _params['allowFullScreen'] = 'true';
      if (!_params['alloscriptaccess'])
        _params['alloscriptaccess'] = 'always';
      var _obj = xtdom.createElement(targetDoc, 'object');
      if (aSize) {
        _obj.height = aSize[0];
        _obj.width = aSize[1];
      } else {
        _obj.height = 344;
        _obj.width = 425;
      }
      _obj.style.zIndex = 1000;
      for (var _param in _params) {
        var _p = xtdom.createElement(targetDoc, 'param');
        _p.name = _param;
        _p.value = _params[_param];
        _obj.appendChild(_p);
      }
      var _embed = xtdom.createElement(targetDoc, 'embed');
      xtdom.setAttribute(_embed, 'src', aVideoID);
      xtdom.setAttribute(_embed, 'type', 'application/x-shockwave-flash');
      xtdom.setAttribute(_embed, 'allowfullscreen', 'true');
      xtdom.setAttribute(_embed, 'allowscriptaccess', 'always');
      xtdom.setAttribute(_embed, 'width', '425');
      xtdom.setAttribute(_embed, 'height', '344');
      _embed.style.zIndex = 1000;
      if (xtiger.cross.UA.IE) {
        _obj = _embed;  
      } else {
        _obj.appendChild(_embed);
      }
      return _obj;
    }          
       
    // Returns an [node, boolean] array where node is the <img> node or the <object>/<embed> node 
    // that was added by the video filter to the DOM inside extension if it finds it, or undefined,
    // and boolean is true if it is a video player node (i.e. object/embed)
    // FIXME: we could also save this information directly inside the filtered editor model !
    var _getHandleExtension = function _getHandleExtension (that) {
      var h = that.getHandle(true);                             
      var hook = h.nextSibling ? h.nextSibling.nextSibling : undefined;
      var isVideo = false;
      if (hook) { // node exists
        var name = xtdom.getLocalName(hook); // checks that it belongs to video filter
        if ((name.toLowerCase() == 'object') || (name.toLowerCase() == 'embed')) {
          isVideo = true;
        } else if (name.toLowerCase() != 'img') {
          hook = undefined;
        }
      }
      return [hook, isVideo];
    }   

  return {  

     /////////////////////////////////////////
     /////     Instance Mixin Part    ////////
     /////////////////////////////////////////

    // Property remapping for chaining
    '->': {
      'init': '__videoSuperInit', 
      'set': '__videoSuperSet', 
      'unset': '__videoSuperUnset', 
      '_setData': '__videoSuperSetData'
    },   
                               
    _setData : function (text) {
      var extension = _getHandleExtension(this); 
      // pas d'effet de bord sur Boolean
      var filtered = text; 
      if (extension[0]) {
        if (text != this.getDefaultData()) {
          // var cur = this.getHandle().firstChild.data;    
          var cur = this.getData();    
          // FIXME: we could check that it's a valid URL or object first ?
          var _videoID = _extractVideoId(text);
          var data = 'http://www.youtube.com/v/' + _videoID;
          if (cur != data) {
            var _newContent = _buildYoutubeSnippet(data, null, null, this.getDocument());
            extension[0].parentNode.replaceChild(_newContent, extension[0]);
            filtered = data;
          }
        } else if (extension[1]) { // resets video icon if it wasn't  
          var img = xtdom.createElement(this.getDocument(), 'img');
          img.src = xtiger.bundles.video.tvIconURL;                 
          extension[0].parentNode.replaceChild(img, extension[0]);
        }
      }
      this.__videoSuperSetData(filtered);     
    },

    // FIXME: missing 'repeater' argument to know if init is called from a repeater
    init : function (aDefaultData, aParams, aOption, aUniqueKey, repeater)  {
      if (! repeater) {
        var h = this.getHandle();
        var br = xtdom.createElement(this.getDocument(), 'br');
        var img = xtdom.createElement(this.getDocument(), 'img');
        var guard = xtdom.createElement(this.getDocument(), 'span');      
        xtdom.addClassName(guard, 'axel-core-boundary');
          // fixed boundary for AXEL marker
          // it will not be removed when chaging img to object and vice-versa
        img.src = xtiger.bundles.video.tvIconURL;
        var parent = h.parentNode;      
        if (h.nextSibling) {
          parent.insertBefore (guard, h.nextSibling, true);
          parent.insertBefore (img, guard, true);
          parent.insertBefore (br, img, true);
        } else {
          parent.appendChild(br);
          parent.appendChild(img);        
          parent.appendChild(guard);
        }    
      } // otherwise repeater has cloned everything     
      this.__videoSuperInit(aDefaultData, aParams, aOption, aUniqueKey);
      // call super init at the end because it triggers a call to _setData and eventually to set or unset 
      // all of which require that the handle extension has been initialized first
    },     
    
    set : function (doPropagate) {
      this.__videoSuperSet(doPropagate);
      if (this.isOptional()) {
        var h = this.getHandle(true);
        if (h.nextSibling && h.nextSibling.nextSibling) {
          xtdom.replaceClassNameBy (h.nextSibling.nextSibling, 'axel-option-unset', 'axel-option-set');
        }
      }
    },
    
    unset : function (doPropagate) {
      this.__videoSuperUnset(doPropagate);
      if (this.isOptional()) {
        var h = this.getHandle(true);
        if (h.nextSibling && h.nextSibling.nextSibling) {
          xtdom.replaceClassNameBy (h.nextSibling.nextSibling, 'axel-option-set', 'axel-option-unset');
        }
      }
    }   
  }

 })();            
 
//Register this filter as a filter of the 'text' plugin (i.e. text.js must have been loaded)
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('video', _VideoFilter);