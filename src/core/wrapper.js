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
|  AXEL Wrapper                                                               |
|                                                                             |
|  wrapped set function (access to primitive editors a-la jQuery)             |
|  extended with some global management functions                             |
|  exposed as GLOBAL.$axel                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Wrapped set:                                                               |
|    $axel (node(s) | string, seethrough)                                     |
|             returns a wrapped set of primitive editor(s) within             | 
|             the DOM node(s) or a string $ (jQuery) selector                 |
|             also includes unselected choice slices if seethrough is true    | 
|             the string argument will be interpreted if and only if a $      |
|             function is defined                                             |
|                                                                             |
|  Global functions:                                                          |
|    extend (target, source, proto)                                           |
|             utility method to merge objects                                 |
|                                                                             |
\*****************************************************************************/
(function (GLOBAL) {
  
  function _nodeIter (n, accu, seethrough) { 
    if (n.xttPrimitiveEditor) {
      accu.push(n.xttPrimitiveEditor);
    }
    if (n.firstChild) {
      _sliceIter(n.firstChild, n.lastChild, accu, seethrough);
    }
  }

  function _sliceIter (begin, end, accu, seethrough) {
    var cur = begin, 
        go = true,
        c;
    while (cur && go) {
      // manage repeats
      if (cur.startRepeatedItem && !seethrough) {
        if (cur.startRepeatedItem.getSize() === 0) { // nothing to serialize in repeater (min=0)   
          // jumps to end of the repeater
          cur = cur.startRepeatedItem.getLastNodeForSlice(0);           
          // in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
          cur = cur.nextSibling;
          continue;
        }  
      }
      if (cur.beginChoiceItem) {
        c = cur.beginChoiceItem;
        if (c.items[c.curItem][0] !== c.items[c.curItem][1]) {
          _sliceIter(c.items[c.curItem][0], c.items[c.curItem][1], accu, seethrough);
        } else {
          // a choice slice starts and end on the same node
          _nodeIter(c.items[c.curItem][0], accu, seethrough); 
        }
        cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
      } else {
        // FIXME: we have an ambiguity <xt:use types="a b"><xt:use label="within_a"...
        // and <xt:use label="within_a"><xt:use types ="a b"....
        /// The current implementation will privilege First interpretation
        _nodeIter(cur, accu, seethrough); // FIXME:  first interpretation
      }
      if (cur === end) {
        go = false;
      }
      cur = cur.nextSibling;
    }
  }
  
  function _Logger () {
    this.stack = [];
  }

  _Logger.prototype = {
    
    discardNodeIfEmpty : function () {
    },
    
    write : function (text) {
      this.stack.push(text);
    },
    
    dump : function () {
      return this.stack.join(' ');
    }
    
  };

  function _WrappedSet (targets, seethrough) {
    var i;
    this.seethrough = seethrough; // to show optional repetitions content
    this.list = [];
    for (i = 0; i < targets.length; i++) {
      _nodeIter(targets[i], this.list, seethrough);
    }
  }

  _WrappedSet.prototype = {
    
    length : function () { 
      return this.list.length;
    },
    
    get : function (rank) { 
      return this.list[rank];
    },
    
    clear : function (propagate) { 
      var i;
      for (i = 0; i < this.list.length; i++) {
        this.list[i].clear(propagate);
      }
      return this; 
    },

    update : function (data) { 
      var i;
      for (i = 0; i < this.list.length; i++) {
        this.list[i].update(data);
      }
      return this; 
    },
    
    text : function () {
      var i, logger = new _Logger();
      for (i = 0; i < this.list.length; i++) {
        this.list[i].save(logger);
      }
      return logger.dump(); 
    },

    configure : function (option, value) {
      var i;
      for (i = 0; i < this.list.length; i++) {
        this.list[i].configure(option, value);
      }
      return this; 
    },

    apply : function (func, toHandle) {
      var i;
      for (i = 0; i < this.list.length; i++) {
        func(toHandle ? this.list[i].getHandle() : this.list[i]);
      }
      return this;
    }
  };

  // Creates AXEL wrapped set function and global object
  var _axel = function axel_ws (nodes, seethrough, doc) {
    var target;
    if (typeof nodes === 'string') { // jQuery selector 
      if (GLOBAL.jQuery) {
        target = $(nodes, doc || document).get();
      } else {
        xtiger.cross.log('warning', 'jQuery missing to interpet wrapped set selector "' + nodes  + '"');
        target = [];
      }
    } else if (Object.prototype.toString.call(nodes) === "[object Array]") { // isArray
      target = nodes;
    } else if (nodes) { // would be nice to detect a jQuery wrapped set ([object Object] ?) to call get()
      target = [ nodes ];
    } else {
      xtiger.cross.log('warning', 'empty wrapped set selector');
      target = [];
    }
    return new _WrappedSet(target, seethrough);
  };

  // Extends a target object's with the own properties and methods 
  // of a source object whenever they are not already defined
  // if proto is true extends the target's prototype
  // if force is true extends even if already defined
  _axel.extend = function extend (target, source, proto, force) {
    if (proto) {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target.prototype[x] === "undefined")) {
            target.prototype[x] = source[x];
          }
        }
      }
    } else {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target[x] === "undefined")) {
            target[x] = source[x];            
          }
        }
      }
    }
  }

  GLOBAL.$axel = _axel;
}(window));