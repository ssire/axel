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
 * Author(s) : Stephane Sire, Jonathan Wafellman
 * 
 * ***** END LICENSE BLOCK ***** */

// Additional file to include for running on IE browser

if (xtiger.cross.UA.IE) {
	
	xtdom.hasAttribute = function (node, name) {
		return node.getAttribute(name) != null;
	}
	
	xtdom.isXT = function (node) {
		return xtiger.parser.isXTigerName.test(node.nodeName);
	}	
	
	// Returns true if the DOM is a xt:use node, false otherwise.
	xtdom.isUseXT = function (aNode) {	
		// FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
		return (aNode.nodeName == 'use' || aNode.nodeName == 'xt:use');
	}

	// Returns true if the DOM is a xt:bag node, false otherwise.
	xtdom.isBagXT = function (aNode) {	
		// FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
		return (aNode.nodeName == 'bag' || aNode.nodeName == 'xt:bag');
	}

	xtdom.getElementsByTagNameXT = function (container, name) {	
		var res = container.getElementsByTagName(name);
		if (0 == res.length) {
			res = container.getElementsByTagName('xt:' + name);
		}	
		return res;
	}	
				
	xtdom.getLocalName = function (node) {
		return node.nodeName;  // FIXME: check that IE do not keep "prefix:"
	}
	
	xtdom.getTextContent = function (aNode) {
		if (aNode.innerText)
			return aNode.innerText;
		else if (aNode.text)
			return aNode.text;
		else
			return '';
	}
	
	xtdom.createElement = function (doc, tagName) {
		// there may be some issues with massive default attribute creation on IE ?
		return doc.createElement(tagName);
	}
	
	xtdom.createElementNS = function (doc, tagName, ns) {
		if (ns == xtiger.parser.nsXTiger) {
			return doc.createElement('xt:' + tagName);
		} else {
			return doc.createElement(ns + ':' + tagName);
		}		
	}
	
	// see http://www.alistapart.com/articles/crossbrowserscripting
	xtdom.importNode = function(doc, node, deep) {  
	  var copy;
		switch (node.nodeType) {
			case xtdom.ELEMENT_NODE:                                  
				// remove prefix from node name as in my last attempt with IE8 appendChild 
				// threw an exception with the node created with a prefixed name
				var nspos = node.nodeName.indexOf(':');
				var nodeName = (nspos == -1) ? node.nodeName : node.nodeName.substr(nspos + 1);
				var newNode = xtdom.createElement(doc, nodeName);
				// copy attributes								
				if (node.attributes && node.attributes.length > 0) 
					for (var i = 0; i < node.attributes.length; i++)
						xtdom.setAttribute(newNode, node.attributes[i].name, node.attributes[i].value);
				if (deep && node.childNodes && node.childNodes.length > 0) // copy children (recursion)
					for (var i = 0; i < node.childNodes.length; i++) {
					  copy = xtdom.importNode(doc, node.childNodes[i], deep);
					  if (copy) newNode.appendChild(copy);
					}
				return newNode;
				break;
			case xtdom.TEXT_NODE:
			case xtdom.CDATA_SECTION_NODE:
				return xtdom.createTextNode(doc, node.nodeValue);
			  break;                                           
  		case xtdom.COMMENT_NODE: // skip comment nodes
				break;                                           
		}
	}		
	
	xtdom.cloneNode = function (doc, node, deep) {
		// FIXME: shall we check if(node.ownerDocument == this.doc)
		var clone = node.cloneNode (deep);
		xtdom.removeAllEvents(clone); // IE do also clone event handlers
		return clone;
	}	

	// this is called at least from importNode
	xtdom.setAttribute = function(node, name ,value) {
		if (name == 'class') {
			node.className = value;
		} else {
			node.setAttribute(name, value);
		}
	}
	
	// Fixes the mess around the style attribute in IE
	xtdom.getStyleAttribute = function (aNode) {
		if (aNode.style)
			return aNode.style.cssText;
		else if (aNode.attributes[0] && aNode.attributes[0].nodeName == 'style') {
			return aNode.attributes[0].nodeValue;
		}
	}

	// ev.srcElement replaces window.event.srcElement since IE8
	xtdom.getEventTarget = function (ev) {
		return (ev && ev.srcElement) ? ev.srcElement : window.event.srcElement;
	}
	
	/**
	* Attach an event to the given node
	*, WARNING : cannot capture events on IE, events only bubble
	*/
	xtdom.addEventListener = function (node, type, listener, useCapture) {
		node.attachEvent('on' + type, listener);
		// node.addEventListener(type, listener, useCapture);		
		if (! node.events) {
			node.events = new Array();
		}
		node.events.push ([type,listener]);
	}	

	xtdom.removeEventListener = function (node, type, listener, useCapture) {
		node.detachEvent('on' + type, listener);
		// node.removeEventListener(type, listener, useCapture);		
		// FIXME: remove [type,listener] from node.events (?)
	}			

	xtdom.removeAllEvents = function (node) {
		if (node.events) {
			for(var i = 0; i < node.events.length; i++){
				xtdom.removeEventListener (node, node.events[i][0], node.events[i][1], true);				
			}
			node.events = new Array();
		}
	}

	xtdom.preventDefault = function (aEvent) {
		aEvent.returnValue = false;
	}
	
	xtdom.stopPropagation = function (aEvent) {
		aEvent.cancelBubble = true;
	}     
	
	xtdom.focusAndSelect = function (aField) {
		try { // focusing a hidden input causes an error (IE)
			aField.focus();
			var oRange = aField.createTextRange(); 
			oRange.moveStart("character", 0); 
			oRange.moveEnd("character", aField.value.length); 
			oRange.select();		
	  }        
	  catch (e) {}
	}	          
	                      
	// FIXME: currently moves caret to the end of aField
	xtdom.focusAndMoveCaretTo = function (aField, aPos) {
	 	try {
			aField.focus();
			var oRange = aField.createTextRange(); 
			oRange.collapse(false); // move caret to end
			oRange.select();
	  }   
	  catch (e) {}
	}	

}
