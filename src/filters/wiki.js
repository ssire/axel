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
 
 // FIXME: filter init function to create a wiki_lang property in the host model
 // which is set to 'html' or 'default' but no other value !
 
/**
 * Wiki Filter Mixin Class to manage rich text. The filter can produce and load 
 * three types of XML markup depending on the value of the "wiki_lang" parameter 
 * of the plugin:
 * - 'html' serializes to a forrest of mixed content with text(), <strong>, <em> and <a>
 * - 'span' serializes to a forrest of <span>, <span class="verbatim|important"> and <a>  
 * - 'default' serializes to a forrest of <Fragment>, <Fragment FragmentKind="verbatim|important">
 *   and <Link> 
 * An unspecified value is equivalent to 'default'
 * The handle content is the same as the serialized content in 'html' and 'span' mode;
 * in default mode the handle content is the same as the 'html' mode
 * This mixin can be applied to plugin model instances.
 * See the list of registered plugins at the end of the file.
 */
var _WikiFilter = (function _WikiFilter() {    
  
  ////////////////////////////////////////////
  /////    Static Wiki Mixin Part     ////////
  ////////////////////////////////////////////

  var _markers_re = "\\*|'|_";

  // FIXME: the URL scanner could be improved, at the moment it accepts '&' and ';' because
  // characters entities are replaced before scanning and http://url&param=stg[link] 
  // will be parsed as http://url&amp;param=stg[link] 
  var _scanner = new RegExp(
     "(http:\/\/[\\.\\w\/\\-\\?\\=_&;#]*)\\[([^\\]]*)\\]" 
     + "|(" + _markers_re + "){2}(.*?)\\3{2}"
     + "|(#[\\.\\w\/\\-_]*)\\[([^\\]]*)\\]"
     + "|==(.*?)==\\((.*?)\\)", "g");

  var _schemeonly = new RegExp("^(mailto|http|https):?(//)?", "i");

  var _server = new RegExp("^(\\w+\\.)+[a-z]+(.*?)$", "i");

  // drives conversion from Fragment with FragmentKind attribute to handle ('default' mode)
  var _kind2tag = {
    'important' : 'strong',
    'emphasize' : 'em',
    'verbatim' : 'tt'   
  };
           
  // drives conversion from handle to XML ('default' mode)
  // UPPERCASE version for IE
  var _tag2kind = {
    "strong" : 'important',
    'em' : 'emphasize',
    "tt" : 'verbatim',
    "STRONG" : 'important', // IE version
    "EM" : 'verbatim',    
    "TT" : 'verbatim'
  };

  // drives conversion from Wiki ASCII text to handle ('html' and 'default' mode)
  var _wiki2tag = {
    "*" : 'strong', 
    "_" : 'em',
    "'" : 'tt'
  };
                
  // drives conversion from Wiki ASCII text to handle ('span' mode)
  var _wiki2class = {
    "*" : 'important', 
    "_" : 'emphasize',
    "'" : 'verbatim'
  };
                    
  // drives conversion from handle to WIKI ASCII text ('html' and 'default' mode)
  // UPPERCASE version for IE
  var _tag2wiki = {
    "strong" : '**',
    "em" : '__',
    "tt" : "''",
    "STRONG" : '**',
    "EM" : "__",
    "TT" : "''"   
  };
  
  // drives conversion from handle to WIKI ASCII text ('span' mode)
  var _class2wiki = {
    "important" : '**',
    "emphasize" : '__',
    "verbatim" : "''"
  };
  
  // rewrites a local URL 
  var _rewriteURL = function _rewriteURL (href) {
    // TBD using wiki_rel_baseurl / wiki_rel_baseurl
    return href;
  };

  var _genLink = function _genLink (href, anchor) {
    var fullhref, hinput, hrewritten, tmp1, tmp2;
    var m = _schemeonly.exec(href);
    if (m) {
     if (m[0].length == href.length) { // scheme only (mailto, http, etc.)
       if (m[1].toLowerCase() == 'mailto') {
         fullhref = href + ((href.indexOf(':') != -1) ? '' : ':') + anchor;
       } else {
         fullhref = href + ((href.indexOf(':') != -1) ? '//' : '://') + anchor;
       }
       hinput = m[1]; // simplification
     } else { // complete URL (mailto:..., http://...)
       fullhref = href;
     }
    } else if (href.charAt(0) == '/') { // absolute URL (/static/docs/rapport.pdf)
     fullhref = _rewriteURL(href);
     hrewritten = true;
     hinput = href;
    } else if (href.indexOf('@') != -1) { // email with no scheme (sire@oppidoc.fr)
     fullhref = 'mailto:' + href;
     hinput = href;
    } else if (_server.test(href)) { // external URL with no scheme
     fullhref = 'http://' + href;
     hinput = href;
    } else { // relative URL (accueil)
     fullhref = _rewriteURL(href);
     hrewritten = true;
     hinput = href;
    }
    tmp1 = hinput ? "data-input ='" + hinput + "' " : '';
    tmp2 = hrewritten ? "data-rewritten ='1' " : '';
    return "<a href='" + fullhref + "' " + tmp1 + tmp2 + "target='_blank'>" + anchor + "</a>";
  };

  /**
   * Scanner function to convert wiki-formatted text to html. Design to
   * be used as a callback in the String.replace() function.
   */
  var _text2html = function _text2html (str, href, anchor, marker, marked, mref, manchor, vanchor, vref, variant) {
    var tag, cl, ref, text;
    if (href) {
     return _genLink(href, anchor)
    } else if (mref) {
     return _genLink(mref, manchor)
    } else if (vref) {
     return _genLink(vref, vanchor)
    } else if (marker) {
     if (variant !== 'span') {
       tag = _wiki2tag[marker];
       return "<" + tag + ">" + marked + "</" + tag + ">";
     } else {
       cl = _wiki2class[marker];
       return '<span class="' + cl + '">' + marked + '</span>';
     }
    }
  };
 
  var _text2html_gen = function (variant) {           
    return function (str, href, anchor, marker, marked, mref, manchor, vanchor, vref) {
        return _text2html(str, href, anchor, marker, marked, mref, manchor, vanchor, vref, variant);      
    }
  };
  
  // Returns in an array only the element node children of n
  var _getElementChildren = function _getElementChildren (aNode) {
    var res = [];
    var c = aNode.childNodes;
    var i, cur;
    for ( i = 0; i < c.length; i++) {
      cur = c.item(i);
      if (cur.nodeType == xtdom.ELEMENT_NODE) {
        res.push(cur);
      }
    }
    return res;
  };         
  
  var _dumpText = function _dumpText (aContainer, aTextStr, aDocument) {   
    if (aTextStr && (aTextStr.search(/\S/) != -1)) {
      if (aContainer.lastChild && (aContainer.lastChild.nodeType === xtdom.TEXT_NODE)) {
        aContainer.lastChild.appendData(aTextStr); // completes the existing text
      } else {
        aContainer.appendChild(xtdom.createTextNode(aDocument, aTextStr));
      }
    }
  };

  /**
   * Dumps a "Fragment" to the handle
   * The "Fragment" depends of the filter's wiki language (html, span or default)
   */
  var _dumpFragment = function _dumpFragment (aBuffer, aFragment, aDocument, lang) {  
    var cur, key, tag, content,
        parent = aBuffer;
    if (lang === 'default') {
      key = aFragment.getAttribute('FragmentKind'),
      tag = key ? _kind2tag[key] : undefined;
    } else {
      tag = xtdom.getLocalName(aFragment);
    }
    content = aFragment.firstChild ? aFragment.firstChild.nodeValue : undefined;
    if (tag) {
      cur = xtdom.createElement(aDocument, tag);
      parent.appendChild(cur);
      parent = cur;
      if ((lang === 'span') && aFragment.hasAttribute('class')) {
        xtdom.addClassName(cur, aFragment.getAttribute('class'));
      }
    }
    _dumpText(parent, content, aDocument); 
  };
  
  /** 
   * Dumps a <Link> or a <a> element as a <a> element
   * 
   */
  var _dumpLink = function _dumpLink (aBuffer, aLink, aDocument, lang) {
    var linktextnode, url, datainput;
    if (lang !== 'default') {
      linktextnode = aLink;
      url = aLink.getAttribute('href');
      datainput = aLink.hasAttribute('data-input') ? aLink.getAttribute('data-input') : null;
    } else {
      var c = _getElementChildren(aLink); // LinkText & LinkRef
      var name = xtdom.getLocalName(c[0]);
      var itext = 0, iref = 0;
      if (name === 'LinkText') { 
        iref = 1; // LinkRef is in second position
      } else {
        itext = 1; // LinkText is in second position
      } 
      linktextnode = c[itext];
      url = c[iref].firstChild ? c[iref].firstChild.nodeValue : '...';
      datainput = c[iref].hasAttribute('data-input') ? c[iref].getAttribute('data-input') : null;
    }
    var a = xtdom.createElement(aDocument, 'a');
    var content = linktextnode.firstChild ? linktextnode.firstChild.nodeValue : '...'; 
    var anchor = xtdom.createTextNode(aDocument, content);
    a.appendChild(anchor);
    a.setAttribute('href', url);
    if (datainput) {
      a.setAttribute('data-input', datainput);
    }
    // FIXME: detect local relative or absolute URLs and call _rewriteURL
    aBuffer.appendChild(a);
  };
              
  /**
   * Dumps XML data to the handle for display
   */
  var _dumpContent = function _dumpContent (aBuffer, aContent, aDocument, lang) {
    var key, content,
        cur = aContent.firstChild;
    while (cur) {
      if (cur.nodeType === xtdom.ELEMENT_NODE) {
        key = xtdom.getLocalName(cur);
        if ((key === 'Link') || (key === 'a') || (key === 'A')) {
          _dumpLink(aBuffer, cur, aDocument, lang);
        } else {       
          _dumpFragment(aBuffer, cur, aDocument, lang);
        }
      } else if (lang === 'html') { // accepts mixed content
        if (cur ===  aContent.firstChild) { // trims left 
          content = cur.nodeValue.replace(/^\s+/g,'');
        } else if (cur.nextSibling) { // does not trim
          content = cur.nodeValue;          
        } else { // trims right 
          content = cur.nodeValue.replace(/\s+$/g,'');
        }
        _dumpText(aBuffer, content, aDocument);
      }
      cur = cur.nextSibling;
    }
  };
    
  var _getPopupDevice = function _getPopupDevice (aDocument) {
    var devKey = 'popupdevice';
    var device = xtiger.session(aDocument).load(devKey);
    if (! device) {  // lazy creation
      device = new xtiger.editor.PopupDevice (aDocument); // hard-coded device for this model
      xtiger.session(aDocument).save(devKey, device);
    }
    return device;
  };     
  
  var _enspanHandle = function _enspanHandle(aNode, aDocument) {
    var _tmp, _next;
    var _cur = aNode.firstChild; 
    while (_cur) {
      _next = _cur.nextSibling;
      if (_cur.nodeType == xtdom.TEXT_NODE) {   
        _tmp = xtdom.createElement(aDocument, 'span');
        aNode.replaceChild(_tmp, _cur);
        _tmp.appendChild(_cur);
      }
      _cur = _next;
    }
  };

  return {     
    
    //////////////////////////////////////////////
    /////     Instance Wiki Mixin Part    ////////
    //////////////////////////////////////////////

    '->': {
      'load': '_wikiSuperLoad',
      'startEditing': '_wikiSuperStartEditing'
    },             
    
    /**
     * Replaces the default _setData by a similar function that interprets data as wiki language.
     */
    _setData: function _setData (aData) {
      var variant = this.getParam('wiki_lang') || 'default';
      try {
        // FIXME: sanitize to avoid Javascript injection ! 
        // text2html will encode entities (so it can match & in URLs) 
        this.getHandle().innerHTML = xtiger.util.encodeEntities(aData).replace(_scanner, _text2html_gen(variant));
        if (variant == 'span') {
          _enspanHandle(this.getHandle(), this.getDocument());
        }
      } catch (e) {         
        xtiger.cross.log('error', "Exception " + e.name + "\n" + e.message);
        try {
          this.getHandle().innerHTML = xtiger.util.encodeEntities(aData) + " (Exception : " + e.name + " - " + e.message + ")";
        } catch (e) {
          // nop          
        }
      }
    },    
     
    /**
     * Loads XML data from the point into the editor. Converts it to an XHTML representation.
     * DOES forward the call only if data source is empty.
     */
    load: function load (aPoint, aDataSrc) {
      // FIXME: manage spaces in source
      if (aDataSrc.isEmpty(aPoint)) {
        this._wikiSuperLoad(aPoint, aDataSrc); // no content : default behavior
      } else {
        var h = this.getHandle();
        xtdom.removeChildrenOf(h);      
        // var cur = xtdom.createTextNode(this.getDocument(), '');
        // h.appendChild(cur);
        _dumpContent (h, aPoint[0], this.getDocument(), this.getParam('wiki_lang') || 'default');
        this.setModified(true);
        this.set(false);
      }
    },      
         
    // Saves the handle content
    _saveHandleAsIs : function (aLogger) {
      var name, anchor, href, tag, _class;
      var cur = this.getHandle().firstChild;
      while (cur) {
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          if (cur.firstChild) { // sanity check  
            name = xtdom.getLocalName(cur);
            aLogger.openTag(name);
            if ((name == 'a') || (name == 'A')) {
              if (cur.getAttribute('data-rewritten')) {
                href = cur.getAttribute('data-input') || '...';
              } else {
                href = cur.getAttribute('href') || '...';
              }
              aLogger.openAttribute('href');
              aLogger.write(href);
              aLogger.closeAttribute('href');
            }
            if (cur.hasAttribute('data-input') && !(cur.hasAttribute('data-rewritten'))) {
              aLogger.openAttribute('data-input');
              aLogger.write(cur.getAttribute('data-input'));
              aLogger.closeAttribute('data-input');
            }
            if (cur.hasAttribute('class')) {
              aLogger.openAttribute('class');
              aLogger.write(cur.getAttribute('class'));
              aLogger.closeAttribute('class');
            }
            aLogger.write(cur.firstChild.data);
            aLogger.closeTag(name);
          }
        } else { // it's a text node per construction
          if (cur.data && (cur.data.search(/\S/) != -1)) { 
            aLogger.write(cur.data);
          }
        }
        cur = cur.nextSibling;
      }      
    }, 
        
    // Saves the handle content, converting it to Fragment syntax ('default' mode)
    _saveHandleAsFragment : function (aLogger, lang) {
      var name, anchor, href, tag;
      var cur = this.getHandle().firstChild;
      while (cur) {
        // FIXME: maybe we shouldn't save if cur.data / cur.firstChild.data is null ?
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          name = xtdom.getLocalName(cur);
          tag = _tag2kind[name];
          if (tag) {
            if (cur.firstChild) { // sanity check  
              aLogger.openTag('Fragment');
              aLogger.openAttribute('FragmentKind');
              aLogger.write(tag);
              aLogger.closeAttribute('FragmentKind');
              aLogger.write(cur.firstChild.data);
              aLogger.closeTag('Fragment');
            }
          } else if ((name == 'a') || (name == 'A')) {
            anchor = (cur.firstChild) ? cur.firstChild.data : '...';
            if (cur.hasAttribute('data-rewritten')) {
              href = cur.getAttribute('data-input') || '...';
            } else {
              href = cur.getAttribute('href') || '...';
            }
            aLogger.openTag('Link');
            if (lang == 'html') {
              aLogger.write(anchor);
              aLogger.openAttribute('href');
              aLogger.write(href);
              aLogger.closeAttribute('href');
            } else {
              aLogger.openTag('LinkText');
              aLogger.write(anchor);
              aLogger.closeTag('LinkText');
              aLogger.openTag('LinkRef');
              if (cur.hasAttribute('data-input') && !(cur.hasAttribute('data-rewritten'))) {
                aLogger.openAttribute('data-input');
                aLogger.write(cur.getAttribute('data-input'));
                aLogger.closeAttribute('data-input');
              }
              aLogger.write(href);
              aLogger.closeTag('LinkRef');
            }
            aLogger.closeTag('Link');
          } else {  
            aLogger.openTag(name);
            aLogger.write(cur.firstChild.data);
            aLogger.closeTag(name);
          }
        } else { // it's a text node per construction
          if (cur.data && (cur.data.search(/\S/) != -1)) { 
            aLogger.openTag('Fragment');
            aLogger.write(cur.data);
            aLogger.closeTag('Fragment');
          }
        }
        cur = cur.nextSibling;
      }      
    },    

    /**
     * Parses current editor content and serializes it as XML directly into the logger.
     * DOES NOT forward the call.
     * 
     * @param aLogger
     * 
     * NOTE: does not call super function. Unnecesasry as save() should
     * never have side-effects
     */
    save: function save (aLogger) {
      var lang; 
      if (this.isOptional() && !this._isOptionSet) {
        aLogger.discardNodeIfEmpty();
        return;
      }         
      lang = this.getParam('wiki_lang') || 'default';
      if (lang === 'html') {
        aLogger.allowMixedContent();        
      }
      return (lang === 'default') ? this._saveHandleAsFragment(aLogger) : this._saveHandleAsIs(aLogger);
    },
    
    /**
     * Converts the content of the handle (e.g. #text, <span>, <a>, ...)
     * into ASCII text. DOES NOT forward the call.
     * 
     * @return {string} Wiki-formatted text to edit
     * 
     * NOTE: does not call super function. Unnecessary as getData() should
     * never have side-effects
     */
    getData : function getData () {
      //FIXME: could be optimized by directly generating message into edit field
      var _key, _wikiSym, _tmp;
      var _txtBuffer = '';
      var _cur = this.getHandle().firstChild;
      while (_cur) {
        if (_cur.nodeType == xtdom.ELEMENT_NODE) {    
          if (this.getParam('wiki_lang') === 'span') {
            _key = _cur.getAttribute('class');
            _wikiSym = _key ? _class2wiki[_key] : undefined;
            _key = xtdom.getLocalName(_cur);            
          } else {            
            _key = xtdom.getLocalName(_cur);
            _wikiSym = _tag2wiki[_key]; 
          }      
          if ((_key === 'a') || (_key === 'A')) { 
            // _txtBuffer += (_cur.getAttribute('href') || '') + '[' + (_cur.firstChild ? _cur.firstChild.data : 'null') + ']';
            _tmp = _cur.getAttribute('data-input') || _cur.getAttribute('href') || '...';
            _txtBuffer += '==' + (_cur.firstChild ? _cur.firstChild.data : '...') + '==(' + _tmp + ')';
          } else if (_cur.firstChild) { // sanity check
            if (_wikiSym === undefined) {
              _txtBuffer += _cur.firstChild.data;
            } else {
              _txtBuffer += _wikiSym + _cur.firstChild.data + _wikiSym;
            }
          }          
        } else { // it's a text node per construction
          _txtBuffer += _cur.data;
        }
        _cur = _cur.nextSibling;
      }
      return _txtBuffer; // accepts delegation
    },

   /**                                                           
    *<p>
    * Starts an edition process. Delays the start of the edition process in case 
    * the user clicked on a link inside the content, in which case it displays 
    * a popup menu to select between editing or opening the link in a new window.
    *</p>
    *<p>
    * DOES NOT forward the call if it is called from a mouse event and the user 
    * clicked on a link. DOES forward it otherwise.
    *</p>
    */    
    startEditing : function startEditing (optMouseEvent, optSelectAll) {
      if (optMouseEvent) {
        var _target = xtdom.getEventTarget(optMouseEvent);
        var _tname = xtdom.getLocalName(_target);
        if (/^a$/i.test(_tname)) { // clicked on a link
          xtdom.preventDefault(optMouseEvent);
          xtdom.stopPropagation(optMouseEvent); // prevents link opening
          var _popupdevice = _getPopupDevice(this.getDocument());
          this._url = _target.getAttribute('href'); // stores the url to follow
          if ((!this._url) || (this._url == '')) {
            this._url = _target.getAttribute('HREF');
          }
          _popupdevice.startEditing(this, ['edit', 'open'], 'edit', _target);
          return;
        }
      }
      this._wikiSuperStartEditing(optMouseEvent, optSelectAll);
    },
    
    /**
     * Callback for the popup device used to manage link edition.
     */
    onMenuSelection: function onMenuSelection (aSelection) {
      if (aSelection == 'edit') {
        this._wikiSuperStartEditing();
      } else if (aSelection == 'open') {
        // opens this.cachedURL in an external window
        window.open(this._url);
      }
    },
    
    /**
     * Accessor to change the selection state
     * 
     * @param {boolean} aState
     * 
     * NOTE : kept for compatibility with popupdevice
     */
    setSelectionState: function setSelectionState (aState) {
      return aState ? this.set(): this.unset();
    }
  };
})();

//Register this filter as a filter of the 'text' plugin (i.e. text.js must have been loaded)
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('wiki', _WikiFilter);
