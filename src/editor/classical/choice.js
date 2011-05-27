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
 * Manages  the different types in an iterated component (a xt:use with multiple types)
 */
xtiger.editor.Choice = function () {
  this.items = [];
  // each of the type identified as { 'typeName' : [beginNode, endNode], ...  }
  this.curItem = -1; // special value (see selectChoiceItem)
  // this.items must be garnished by calling addItem (name, begin, end)
  this.curDoc = null; // will be in initFromTree or initFromSeed  
  xtiger.editor.Choice.prototype.UID++;   
}            

xtiger.editor.Choice.prototype = {  
  
  UID : 0,
  
  initFromTree : function (menu, types, doc) { 
    this.curDoc = doc;
    this.menu = menu; // select menu
    menu.markChoiceEditor = this; // for future cloning   
    this.types = types; // pre-condition: it must be an array ... coming from xtigercore.js
  },
  
  getTypes : function () {
    return this.types;
  },    

  getSelectedChoiceName : function () {
    return this.types[this.curItem];
  },
    
  // The seed is a data structure that should allow to "reconstruct" a cloned editor
  makeSeed : function () {
    if (! this.seed) {
      this.seed = [this.items.length, this.types, xtiger.editor.Choice.prototype.UID];
    }
    return this.seed;
  },
      
  // Clone this editor from another one
  // setChoiceMenu, setBeginChoiceItem and setEndChoiceItem should be called shortly after
  initFromSeed : function (editorSeed, doc) { 
    this.curDoc = doc;
    this.expectedLength = editorSeed[0];
    this.types = editorSeed[1];                   
  },
    
  setChoiceMenu : function (clone) { 
    this.menu = clone;
    var _this = this;
    xtdom.addEventListener (clone, 'change', function (ev) { _this.handleSelect(ev); }, false);
  },
  
  setBeginChoiceItem : function (clone) { 
    this.items.push ([clone, null]);
  },
  
  setEndChoiceItem : function (clone) { 
    this.items [this.items.length - 1][1] = clone;
    if (this.items.length == this.expectedLength) {
      xtiger.cross.log('stack-trace', 'Choice initialization terminated after cloning, size=' + this.expectedLength);
      this.initializeSelectedItem (0);  // FIXME : check that it's not too early
    }
  },  
  
  addChoiceItem : function (name, begin, end) {
    // console.log('addChoiceItem name=' + name + ' start=' + begin.nodeName + ' end=' + end.nodeName);
    this.items.push([begin, end]);
    if (begin.beginChoiceItem) {
      xtiger.cross.log('warning', 'Choice <', name, '> ends with an already existing choice');
    }
    if (end.endChoiceItem) {
      xtiger.cross.log('warning', 'Choice <', name, '> ends with an already existing choice end');
    }
    begin.beginChoiceItem = this; // for future cloning   
    // begin.beginChoiceLabel = 'beginChoice ' + name; // DEBUG
    end.endChoiceItem = this; // for future cloning
    // end.endChoiceLabel = 'endChoice ' + name; // DEBUG
  },
      
  initializeSelectedItem : function (rank) {     
    // memorizes the state of the previous display style properties of everyone to be able to restore it
    for (var i = 0; i < this.items.length; i++) {
      var memo = [];
      var item = this.items[i];
      var begin = item[0];
      var end = item[1];
      var cur = begin;      
      memo.push(xtdom.getInlineDisplay(cur));
      if (i != rank) { // hides it
        if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
      } 
      while (cur != end) {        
        cur = cur.nextSibling;
        memo.push(xtdom.getInlineDisplay(cur));       
        if (i != rank) { // hides it
          if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
        }       
      }
      item.push (memo); // saves current state
    }
    this.curItem = rank;
  },
  
  // Changes class attribute of the node span corresponding to the type item 'name' so that it becomes visible
  // Changes class attribute of the previously visible type item 'name' so that it becomes invisible 
  selectChoiceItem : function (rank) {
    xtiger.cross.log('plant', 'Choice.selectChoiceItem ' + rank);
    // window.console.log('Choice.selectChoiceItem ' + rank + ' for ' + this.getTypes().join(' '));
    if (this.curItem == rank) return;
    if (this.curItem != -1) {
      // hides last selection
      var item = this.items[this.curItem];
      var begin = item[0];
      var end = item[1];
      var memo = [];
      var cur = begin;
      memo.push(xtdom.getInlineDisplay(cur));     
      if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';      
      while (cur != end) {        
        cur = cur.nextSibling;
        memo.push(xtdom.getInlineDisplay(cur));       
        if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
      }   
      item[2] = memo; // replaces with current state
    }
    // shows current selection (i.e. restores the display style to what it was before)    
    var item = this.items[rank];
    var begin = item[0];
    var end = item[1];
    var memo = item[2];
    var i = 0;
    var cur = begin;
    if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = memo[i];
    while (cur != end) {        
      i++;
      cur = cur.nextSibling;
      if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = memo[i];
    }   
    this.curItem = rank;    
  },  
  
  selectChoiceForName : function (name) {   
    // xtiger.cross.log('plant', 'Choice.selectChoiceForName ' + name);   
    var i;
    for (i = 0; i < this.types.length; i++) {
      if (this.types[i] == name) {
        break
      }
    }
    if (i != this.types.length) {
      this.selectChoiceItem (i);
      xtdom.setSelectedOpt (this.menu, i);      
      return i;     
    } else {
      return this.curItem;
    }
  },
  
  // Menu event handler
  handleSelect : function (ev) {
    var option = xtdom.getSelectedOpt (this.menu);
    this.selectChoiceItem(option);
    
  }
}