(function() {

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

  function _WrappedSet (nodes, seethrough) {
    var i, targets = (typeof nodes === 'string') ? $(nodes).get() : nodes;
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

    apply : function (func, toHandle) {
      var i;
      for (i = 0; i < this.list.length; i++) {
        func(toHandle ? this.list[i].getHandle() : this.list[i]);
      }
      return this;
    }

  };
  
  var axel_func = function (nodes, seethrough) {
    return new _WrappedSet(nodes, seethrough);
  };
  
  window.xray = axel_func;
}());
