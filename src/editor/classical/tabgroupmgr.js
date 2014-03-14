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
 * Manages tab navigation between basic string editors.
 */
xtiger.editor.TabGroupManager = function (rootNode) {
  this.root = rootNode;
  this.direction = 0;
}

xtiger.editor.TabGroupManager.prototype = {

  startEditingSession : function (editor) {
    this.curEditor = editor;
    this.direction = 0;
  },

  stopEditingSession : function () {
    this.curEditor = undefined;
    this.direction = 0;
  },

  // Intercepts Tab KeyDown events
  // Returns true if it has intercepted it
  filterKeyDown : function (ev) {
    this.direction = 0; // For firefox
    if (ev.keyCode == 9) { // it's a Tab
        if (xtiger.cross.UA.gecko)  { // we must wait for KeyPress event because canceling will not work
          this.direction = ev.shiftKey ? -1 : 1;
        } else { // we can act immediatly
          if (!this._focusNextInput(ev.shiftKey ? -1 : 1)) {
            return false;
          }
        }
        try {
          xtdom.preventDefault(ev);
          xtdom.stopPropagation(ev);
        } catch (e) {
          // on IE !
        }
        return true
    } else {
      return false;
    }
  },

  // For some certain kinds of browsers filterKeyDown does not cancel the Tab event
  // in that case we get a chance to modify its effect in KeyPress event handling
  // This is the case with Firefox (v2 on OS X at least)
  filterKeyPress : function (ev) {
    if (xtiger.cross.UA.gecko && (this.direction != 0)) {
      if (ev.keyCode === 9) {
        var res = this._focusNextInput(this.direction);
        return res;
      }
    }
    return false;
  },

  _focusNextInput : function (direction) {
    var start = this.curEditor.getHandle(true);
    if (start) {
      if (direction > 0) {
        return this._focusNextInputIter(start);
      } else if (direction < 0) {
        return this._focusPrevInputIter(start);
      }
    }
    return false;
  },

  _focusNextInputIter : function (node) {
    var p = node.parentNode,
        last = p.lastChild,
        res;
    if (!p || (p.tagName === 'html') || p.xttHeadLabel) { // reached top
      return false;
    } else {
      if (node.nextSibling) {
        if (node.nextSibling === last) {
          res = this._nodeIter(last);
        } else {
          res = this._fwdSliceIter(node.nextSibling);
        }
        return res || this._focusNextInputIter(p);
      } else {
        return this._focusNextInputIter(p);
      }
    }
  },

  _focusPrevInputIter : function (node) {
    var p = node.parentNode,
        first = p.firstChild,
        res;
    if (!p || (p.tagName === 'html') || p.xttHeadLabel) { // reached top
      return false;
    } else {
      if (node.previousSibling) {
        if (node.previousSibling === first) {
          res = this._antiNodeIter(first);
        } else {
          res = this._antiSliceIter(node.previousSibling);
        }
        return res || this._focusPrevInputIter(p);
      } else {
        return this._focusPrevInputIter(p);
      }
    }
  },

  _nodeIter : function (n) {
    if (n.xttHeadLabel) { // avoids nested editors
      return false;
    }
    if (n.xttPrimitiveEditor && n.xttPrimitiveEditor.isFocusable()) {
      this.curEditor.unfocus();
      n.xttPrimitiveEditor.focus ();
      this.curEditor = n.xttPrimitiveEditor;
      return true;
    }
    if (n.firstChild) {
      return this._fwdSliceIter(n.firstChild);
    }
    return false;
  },

  // origin is optional, it is the Choice editor from where a recursive call has been initiated
  _fwdSliceIter : function (begin, origin) {
    var cur = begin,
        found = false,
        c;
    while (cur && (!found)) {
      if (cur.startRepeatedItem) {
        if (cur.startRepeatedItem.getSize() === 0) { // jumps other unselected repeater (min=0)
          cur = cur.startRepeatedItem.getLastNodeForSlice(0);
          cur = cur.nextSibling;
          continue;
        }
      }
      if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        c = cur.beginChoiceItem; // checks current choice slice
        if (c.items[c.curItem][0] !== c.items[c.curItem][1]) {
          found = this._fwdSliceIter(c.items[c.curItem][0], c);
        } else {
          // a choice slice starts and end on the same node
          found = this._nodeIter(c.items[c.curItem][0]);
        }
        cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
      } else if (cur.endChoiceItem && (cur.endChoiceItem != origin)) {
        c = cur.endChoiceItem; // no need to check other choice item since we started in the middle
        cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
      } else {
        found = this._nodeIter(cur);
      }
      if (! found) {
        cur = cur.nextSibling;
      }
    }
    return found;
  },

  _antiNodeIter : function (n) {
    if (n.xttHeadLabel) { // avoids nested editors
      return false;
    }
    if (n.xttPrimitiveEditor && n.xttPrimitiveEditor.isFocusable()) {
      this.curEditor.unfocus();
      n.xttPrimitiveEditor.focus ();
      this.curEditor = n.xttPrimitiveEditor;
      return true;
    }
    if (n.firstChild) {
      return this._antiSliceIter(n.lastChild);
    }
    return false;
  },

	// origin is optional, it is the Choice editor from where a recursive call has been initiated
  _antiSliceIter : function (end, origin) {
    var cur = end,
        found = false,
        c;
    while (cur && (!found)) {
      if (cur.endRepeatedItem) {
        if (cur.endRepeatedItem.getSize() === 0) {  // jumps other unselected repeater (min=0)
          cur = cur.endRepeatedItem.getFirstNodeForSlice(0);
          cur = cur.previousSibling;
          continue;
        }
      }
      if (cur.endChoiceItem && (cur.endChoiceItem != origin)) {
        c = cur.endChoiceItem;
        if (c.items[c.curItem][0] !== c.items[c.curItem][1]) {
          found = this._antiSliceIter(c.items[c.curItem][1], c);
        } else {
          // a choice slice starts and end on the same node
          found = this._antiNodeIter(c.items[c.curItem][0]);
        }
        cur = c.items[0][0]; // sets cur to the last choice
      } else if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        c = cur.beginChoiceItem; // no need to check other choice item since we started in the middle
        cur = c.items[0][0]; // sets cur to the first choice
      } else {
        found = this._antiNodeIter(cur); // FIXME:  first interpretation
      }
      if (! found) {
        cur = cur.previousSibling;
      }
    }
    return found;
  }
}
