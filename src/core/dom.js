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

/*****************************************************************************\
|                                                                             |
|  xtdom module                                                               |
|                                                                             |
|  Low level functions to plug into the DOM                                   |
|  Not browser dependent                                                      |
|                                                                             |
|*****************************************************************************|
|  See defaultbrowser.js or iebrowser.js for browser depedent functions       |
|                                                                             |
\*****************************************************************************/

xtdom.counterId = 0;
  
xtdom.genId = function () {
  return xtdom.counterId++;
}

xtdom.createTextNode = function (doc, text) {
  return doc.createTextNode(text);
}

xtdom.hasAttribute = function (node, name) {
  return node.hasAttribute(name);
}

/**
 * Removes the elemet passed as parameter
 */
xtdom.removeElement = function (element) {
  var _parent = element.parentNode;
  if (! _parent)
    return; // Sanity check, don't remove elements that are not in DOM
  _parent.removeChild(element);
}

// Returns true if node is an XTiger element or if it contains at least one
xtdom.containsXT = function (node) {
  if (node.nodeType == xtdom.ELEMENT_NODE) {
    if (xtdom.isXT(node)) {
      return true; 
    } else {
      if (node.childNodes && node.childNodes.length > 0) {
        for (var i = 0; i < node.childNodes.length; i++) 
          if (xtdom.containsXT(node.childNodes[i])) {
            return true;
          }
      }
    }
  } 
  return false;
}

// Return the first 'xt:menu-marker' element within node or false otherwise
// Look for a marker with a target="targetValue" attribute if targetValue is defined
xtdom.getMenuMarkerXT = function (node, targetValue) {
  var cur, i, res = false;
  var results = xtdom.getElementsByTagNameXT(node, 'menu-marker');
  if (results.length > 0) {     
    for (i = 0; i < results.length; i++) {
      cur = results.item(i);
      if (((targetValue === undefined) && (!xtdom.hasAttribute(cur, 'target')))
        || (cur.getAttribute('target') === targetValue)) {
        res = cur;
        break;
      }
    }
    // res = results[0];
  }
  return res; 
}

// Returns a string representing the tag name associated with a XTiger Node
xtdom.getTagNameXT = function (node) {    
  var key = (xtiger.ATTRIBUTE == xtdom.getNodeTypeXT(node)) ? 'name' : 'label';
  return node.getAttribute(key);
}

// Returns a string representing the content of an XTiger node or null if content is empty or it contains only spaces
// Pre-condition: the node is supposed to contain only plain text or to contain only HTML elements
// in which case the innerHTML of the children will be concatenated (first level tag names are removed)
// This is the case for instance of a xt:use of a "string" primitive type
// FIXME: that method should be able to dump any content (including XML) but innerHTML does not work on node
// which is not an HTML node (it's an xt:use)
xtdom.extractDefaultContentXT = function (node) {
  var dump;   
  if (xtiger.ATTRIBUTE == xtdom.getNodeTypeXT(node)) {
    dump = node.getAttribute('default');
  } else if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var str;
      var cur = node.childNodes[i];
      if (cur.nodeType == xtdom.ELEMENT_NODE) {
        str = cur.innerHTML;
      } else { // assumes TEXT_NODE
        str = cur.nodeValue;
      }       
      if (dump) {
        dump += str;
      } else {
        dump = str;
      }
    }
  }
  if (dump && (-1 === dump.search(/\S/))) { // empty string
    dump = null;
  }
  return dump;
}

// Returns the first DOM Element node which is a child of node or undefined otherwise
xtdom.getFirstElementChildOf = function (node) {
  var res;
  for (var i=0; i < node.childNodes.length; i++) {   
    if (node.childNodes[i].nodeType == xtdom.ELEMENT_NODE) {
      res = node.childNodes[i];
      break;
    }     
  }
  return res; 
}

// Inserts all the nodes in nodes in the target DOM just after target
// As a side effect all the nodes are removed from nodes
xtdom.moveNodesAfter = function (nodes, target) {
  var n;   
  // sets next to the next sibling after target if it exists or to null otherwise
  if (target.nextSibling) {
    var next = target.nextSibling;
    while (n = nodes.shift()) {
      next.parentNode.insertBefore(n, next);
    }
  } else { // it was the last sibling...
    while (n = nodes.shift()) {
      target.parentNode.appendChild(n);
    }   
  }
}

xtdom.moveChildrenOfAfter = function (parentSrc, target) {
  var n;   
  // sets next to the next sibling after target if it exists or to null otherwise
  if (target.nextSibling) {
    var next = target.nextSibling;
    while (n = parentSrc.firstChild) {
      parentSrc.removeChild (n);
      next.parentNode.insertBefore(n, next);
    }
  } else { // it was the last sibling...
    while (n = parentSrc.firstChild) {
      parentSrc.removeChild (n);
      target.parentNode.appendChild(n);
    }   
  }
}

// Imports a copy of all the child nodes of a source node into a target node.
// targetDoc is the target document
// destNode is the target node and it must be owned by targetDoc
xtdom.importChildOfInto = function (targetDoc, srcNode, destNode) {
  for(var i = 0; i<srcNode.childNodes.length; i++) {
    var src = srcNode.childNodes[i];
    var copy = xtdom.importNode (targetDoc, srcNode.childNodes[i], true);
    destNode.appendChild(copy);   
  }
}
  
// Replaces the node "former" by all the children of the node "newer"
// Prec-condition: former and newer must be owned by the same document
// The "former" node must have a parent node, it must not be a dangling node
// At the end, "newer" is an empty node
// accu is a list of the nodes which have been moved
xtdom.replaceNodeByChildOf = function (former, newer, accu) {
  var parent = former.parentNode;
  var n;
  while (n = newer.firstChild) {
    newer.removeChild (n);
    parent.insertBefore (n, former, true);  
    if (accu) {
      accu.push (n);
    }
  }
  parent.removeChild(former); 
}

// FIXME: shouldn't we purge event handlers before 
// see http://www.crockford.com/javascript/memory/leak.html
xtdom.removeChildrenOf = function (aNode) {
  aNode.innerHTML = "";
  // var n;
  // while (n = aNode.firstChild) {
  //  aNode.removeChild(n);
  // }    
}
  
/// Pre-requisite: former and newer must belong to the same document  
xtdom.moveChildOfInto = function (former, newer, accu) {
  var n;
  // inserts the child of former into newer
  while (n = former.firstChild) {
    former.removeChild (n); // FIXME: maybe useless (DOM API removes nodes when moving them) ?
    newer.appendChild (n); // FIXME: maybe no cross-browser !!! 
    if (accu) {
      accu.push (n);
    }
  }   
}

// Returns the value of the display property of the DOM aNode if it has been defined inline
// (i.e. directly in the markup). Returns an empty string otherwise
xtdom.getInlineDisplay = function  (aNode) {
  var res = '';
  if ((aNode.style) && (aNode.style.display)) {
    res = aNode.style.display;
  }
  return res;
}

xtdom.getSelectedOpt = function (sel) {
  for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].selected) {
      break;
      }
  }
  return i;
}

xtdom.setSelectedOpt = function (sel, index) {
  sel.selectedIndex = index; // FIXME: is it cross-browser ?
} 

xtdom.addClassName = function (node, name) {
  // FIXME: currently the test is fooled by an already set class name that contains name 
  if (node.className) {
    if (node.className.search(name) == -1) {
      if (node.className.length == 0) {
        node.className = name;
      } else {
        node.className += " " + name;
      }
    } // else it already has the class name (or a sub-set)
  } else {
    node.className = name;
  }
}

xtdom.removeClassName = function (node, name) {
  // FIXME: see addClassName
  if (node.className) {
    var index = node.className.search(name);
    if (index != -1) {
      node.className = node.className.substr(0, index) + node.className.substr(index + name.length);
    }
  }
}

xtdom.replaceClassNameBy = function (node, formerName, newName) {
  // FIXME: see addClassName  
  var index = node.className.search(formerName);
  if (index != -1) {
    node.className = node.className.substr(0, index) + newName + node.className.substr(index + formerName.length);
  } else {
    xtdom.addClassName (node, newName);
  } 
}

/**
 * @param {string} aStyle A CSS style given as dashed parameter (foo-bar, not fooBar)
 */
xtdom.getComputedStyle = function (aNode, aStyle) {
  if (!aNode || !aNode.ownerDocument) // Safety guard
    return null;
  var _doc = aNode.ownerDocument; 
  if (window.getComputedStyle) {
    return window.getComputedStyle(aNode, null).getPropertyValue(aStyle);
  }
  else if (aNode.currentStyle) {
    aStyle = aStyle.replace(/\-(\w)/g, function (strMatch, p1){
      return p1.toUpperCase();
    });
    return aNode.currentStyle[aStyle];
  }
  return null; // TODO remove, only for debugging purpose
}

//From http://www.quirksmode.org/js/findpos.html
// Finds the absolute position of object obj relatively to the body !
xtdom.findPos = function (obj) {
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    curleft = obj.offsetLeft
    curtop = obj.offsetTop
    if (document.defaultView)
      var position = document.defaultView.getComputedStyle(obj,null).getPropertyValue('position');
    else if (document.uniqueID)
      var position = obj.currentStyle.position;
    if (obj.scrollTop && (position == 'absolute')) {
      curtop -= obj.scrollTop;
    }   
    if (obj.scrollLeft && (position == 'absolute')) {
      curleft -= obj.scrollLeft;
    }       
    while (obj = obj.offsetParent) {
      curleft += obj.offsetLeft
      curtop += obj.offsetTop
      if (document.defaultView)
        var position = document.defaultView.getComputedStyle(obj,null).getPropertyValue('position');
      else if (document.uniqueID)
        var position = obj.currentStyle.position;
      if (obj.scrollTop && (position == 'absolute')) {
        curtop -= obj.scrollTop;
      }     
      if (obj.scrollLeft && (position == 'absolute')) {
        curleft -= obj.scrollLeft;
      }             
    }
  }
  return [curleft,curtop];
};

// Returns an array with the width and height of aHandle's window   
// plus the scroll width and height
// This is useful to calculate how far aHandle (in absolute position)
// is to the window border
// From http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
// FIXME: move to popup device ?
xtdom.getWindowLimitFrom = function (aHandle) {  
  var myWidth = 0, myHeight = 0, scrollLeft = 0, scrollTop = 0;
  var oDoc = aHandle.ownerDocument;                
  var win= oDoc.defaultView || oDoc.parentWindow;  
  // in case template shown inside an iframe

  // 1. Dimension
  if( typeof( win.innerWidth ) == 'number' ) {
    //Non-IE
    myWidth = win.innerWidth;
    myHeight = win.innerHeight;
  } else if( oDoc.documentElement && ( oDoc.documentElement.clientWidth || oDoc.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    myWidth = oDoc.documentElement.clientWidth;
    myHeight = oDoc.documentElement.clientHeight;
  } else if( oDoc.body && ( oDoc.body.clientWidth || oDoc.body.clientHeight ) ) {
    //IE 4 compatible
    myWidth = oDoc.body.clientWidth;
    myHeight = oDoc.body.clientHeight;
  }       
                
  // 2.  Scrolling 
  if( typeof( win.pageYOffset ) == 'number' ) {
    //Netscape compliant
    scrollTop = win.pageYOffset;
    scrollLeft = win.pageXOffset;
  } else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    scrollTop = document.body.scrollTop;
    scrollLeft = document.body.scrollLeft;
  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    scrollTop = document.documentElement.scrollTop;
    scrollLeft = document.documentElement.scrollLeft;
  }

  return [myWidth + scrollLeft, myHeight + scrollTop];      
  // FIXME: add correction with scrollLeft
}