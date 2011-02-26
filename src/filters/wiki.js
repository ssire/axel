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
 * two types of XML markup depending on the value of the "wiki_lang" parameter 
 * of the plugin. If it's value is 'html' it produces a <span> and <a> forrest,
 * if it has no value or is set to 'default' it produces a <Fragment> and <Link>
 * forrest. This mixin can be applied to plugin model instances.
 * See the list of registered plugins at the end of the file.
 */
var _WikiFilter = (function _WikiFilter() {    
  
  ////////////////////////////////////////////
  /////    Static Wiki Mixin Part     ////////
  ////////////////////////////////////////////

	var _markers_re = "\\*|'";
                                      
  // FIXME: the URL scanner could be improved, at the moment it accepts '&' and ';' because
  // characters entities are replaced before scanning and http://url&param=stg[link] 
  // will be parsed as http://url&amp;param=stg[link] 
	var _scanner = new RegExp(
			"(http:\/\/[\\.\\w\/\\-\\?\\=_&;#]*)\\[([^\\]]*)\\]|(" + _markers_re
					+ "){2}(.*?)\\3{2}", "g");
					
  var _tagname = { 
    'html' :  { 'Fragment' : 'span', 
                'FragmentKind' : 'class', 
                'Link' : 'a' },
    'default' : { 'Fragment' : 'Fragment', 
                'FragmentKind' : 'FragmentKind', 
                'Link' : 'Link' }
  }

	var _markers = {
		"em" : 'important', // XHTML to XML conversion
		"tt" : 'verbatim',
		"EM" : 'important', // IE version
		"TT" : 'verbatim',		
		'important' : 'em', // XML to XHTML conversion
		'verbatim' : 'tt',
		"*" : 'em', // ASCII to XHTML conversion
		"'" : 'tt'
	}

	var _markers2ascii = {
		"em" : '**', // XHTML to ASCII conversion
		"tt" : "''",
		"EM" : '**', // IE version
		"TT" : "''"
	}

	/**
	 * Scanner function to convert wiki-formatted text to html. Design to
	 * be used as a callback in the String.replace() function.
	 */
	var _text2html = function _text2html (str, href, anchor, marker, marked) {
		if (href) {
			return "<a href='" + xtiger.util.encodeEntities(href)
					+ "' target='_blank'>" + xtiger.util.encodeEntities(anchor)
					+ "</a>";
		} else if (marker) {
			var tag = _markers[marker];
			var cl = _markers[tag];
			return "<" + tag + ' class="' + cl + '"' + ">"
					+ xtiger.util.encodeEntities(marked) + "</" + tag + ">";
		}
	}
	
	// Returns in an array only the element node children of n
	var _getElementChildren = function _getElementChildren (aNode) {
		var res = [];
		var c = aNode.childNodes;
		for ( var i = 0; i < c.length; i++) {
			var cur = c.item(i);
			if (cur.nodeType == xtdom.ELEMENT_NODE) {
				res.push(cur);
			}
		}
		return res;
	}
	
	/**
	 * Dumps a <Fragment>
	 */
	var _dumpFragment = function _dumpFragment (aBuffer, aFragment, aDocument, lang) {  
		var _cur;
		var _parent = aBuffer;
		var _content = aFragment.firstChild ? aFragment.firstChild.nodeValue
				: '';
		var _type = aFragment.getAttribute(_tagname[lang]['FragmentKind']);
		var tag = _type ? _markers[_type] : null; // Supported FragmentKind
												// (otherwise will be
												// dismissed)
		if (tag) {
			_cur = xtdom.createElement(aDocument, tag);
			xtdom.setAttribute(_cur, 'class', _type);
			_parent.appendChild(_cur);
			_parent = _cur;
		}
		if (_parent.lastChild && (_parent.lastChild.nodeType == xtdom.TEXT_NODE)) {
			_parent.lastChild.appendData(_content); // completes the existing text
		} else {
			_cur = xtdom.createTextNode(aDocument, _content);
			_parent.appendChild(_cur);
		}
	}
	
	/** 
	 * Dumps a <Link>
	 * 
	 */
	var _dumpLink = function _dumpLink (aBuffer, aLink, aDocument, lang) {
		var linktextnode, url;
		if (lang == 'html') {                                                            
		  linktextnode = aLink;
      url = aLink.getAttribute('href');
		} else {
  		var c = _getElementChildren(aLink); // LinkText & LinkRef
  		var name = xtdom.getLocalName(c[0]);
  		var itext = iref = 0;
  		if (name == 'LinkText') { 
  			iref = 1; // LinkRef is in second position
  		} else {
  		  itext = 1; // LinkText is in second position
  		} 
  		linktextnode = c[itext];
  		url = c[iref].firstChild ? c[iref].firstChild.nodeValue : '';
    }
		var a = xtdom.createElement(aDocument, 'a');
		var content = linktextnode.firstChild ? linktextnode.firstChild.nodeValue : 'url'; 
		var anchor = xtdom.createTextNode(aDocument, content);
		a.appendChild(anchor);
		a.setAttribute('href', url);
		aBuffer.appendChild(a);
	}
	
	_dumpContent = function _dumpContent (aBuffer, aContent, aDocument, lang) {    
		var name;
		var c = _getElementChildren(aContent);
		for ( var i = 0; i < c.length; i++) {
			name = xtdom.getLocalName(c[i]);
			if (name == _tagname[lang]['Fragment']) {
				_dumpFragment(aBuffer, c[i], aDocument, lang);
			} else if (name == _tagname[lang]['Link']) {
				_dumpLink(aBuffer, c[i], aDocument, lang);
			}
			// FIXME: otherwise maybe we could consider n textual content as a <Fragment> ?
		}
	}          
		
	_getPopupDevice = function _getPopupDevice (aDocument) {
		var devKey = 'popupdevice';
		var device = xtiger.session(aDocument).load(devKey);
		if (! device) {  // lazy creation
			device = new xtiger.editor.PopupDevice (aDocument); // hard-coded device for this model
			xtiger.session(aDocument).save(devKey, device);
		}
		return device;
	}

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
  		try {
  			// FIXME: sanitize to avoid Javascript injection ! 
  			// text2html will encode entities (so it can match & in URLs) 
  			this.getHandle().innerHTML = xtiger.util.encodeEntities(aData).replace(_scanner, _text2html);
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
		  if (this.isOptional() && !this._isOptionSet) {
				aLogger.discardNodeIfEmpty();
				return;
			}			
			var name, anchor, href, tag;
			var lang = this.getParam('wiki_lang') || 'default';
			var cur = this.getHandle().firstChild;
			while (cur) {
				// FIXME: maybe we shouldn't save if cur.data / cur.firstChild.data is null ?
				if (cur.nodeType == xtdom.ELEMENT_NODE) {
					name = xtdom.getLocalName(cur);
					tag = _markers[name];
					if (tag) {
						if (cur.firstChild) { // sanity check  
							aLogger.openTag(_tagname[lang]['Fragment']);
							aLogger.openAttribute(_tagname[lang]['FragmentKind']);
							aLogger.write(tag);
							aLogger.closeAttribute(_tagname[lang]['FragmentKind']);
							aLogger.write(cur.firstChild.data);
							aLogger.closeTag(_tagname[lang]['Fragment']);
						}
					} else if ((name == 'a') || (name == 'A')) {
						anchor = (cur.firstChild) ? cur.firstChild.data
								: 'null';
						href = cur.getAttribute('href') || 'null';
						aLogger.openTag(_tagname[lang]['Link']);
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
  						aLogger.write(href);
  						aLogger.closeTag('LinkRef');
						}
						aLogger.closeTag(_tagname[lang]['Link']);
					}
				} else { // it's a text node per construction
          if (cur.data && (cur.data.search(/\S/) != -1)) { 
  					aLogger.openTag(_tagname[lang]['Fragment']);
  					aLogger.write(cur.data);
  					aLogger.closeTag(_tagname[lang]['Fragment']);
          }
				}
				cur = cur.nextSibling;
			}
		},
		
		/**
		 * Converts the content of the handle (i.e. text, <span> and <a href>)
		 * into ASCII text. DOES NOT forward the call.
		 * 
		 * @return {string} Wiki-formatted text to edit
		 * 
		 * NOTE: does not call super function. Unnecesasry as getData() should
		 * never have side-effects
		 */
		getData : function getData () {
		 	//FIXME: could be optimized by directly generating message into edit field
			var _name, _tag;
			var _txtBuffer = '';
			var _cur = this.getHandle().firstChild;
			while (_cur) {
				if (_cur.nodeType == xtdom.ELEMENT_NODE) {
					_name = xtdom.getLocalName(_cur);
					_tag = _markers2ascii[_name];
					if (_tag) {
						if (_cur.firstChild) { // sanity check
							_txtBuffer += _tag + _cur.firstChild.data + _tag;
						}
					} else if ((_name == 'a') || (_name == 'A')) { // "wiki" anchor generation
						_txtBuffer += (_cur.getAttribute('href') || '') + '[' + (_cur.firstChild ? _cur.firstChild.data : 'null') + ']';
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
          if ((!this._url) || (this._url == '')) 
            this._url = _target.getAttribute('HREF');
          _popupdevice.startEditing(this, ['edit', 'open'], 'edit', _target)
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
			aState ? this.set(): this.unset();
		}
	};
})();

//Register this filter as a filter of the 'text' plugin (i.e. text.js must have been loaded)
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('wiki', _WikiFilter);
