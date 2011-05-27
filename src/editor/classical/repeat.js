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

/**
 * @class Repeat
 * Manages an "atomic" repeater
 */
xtiger.editor.Repeat = function () {
  this.items = [];   
  this.curDoc = null; // will be in initFromTree or initFromSeed
  this.originPosition = -1;
  // this.model will be set in one of the init functions
}         
                                                      
// Static class function
// Traverses all the englobing repeat editors of a given DOM node
// Sets them if they were optional (minOccurs = 0) and unset
xtiger.editor.Repeat.autoSelectRepeatIter = function (startFrom) {  
  var r;
  var cur = startFrom;
  var startCount = 0;
  var endCount = 0;
  while (cur) {   
    if (cur.startRepeatedItem) {  startCount++; }
    if ((cur != startFrom) && cur.endRepeatedItem) {
      endCount++;  // does not count if repeat starts and ends on the node it landed on
    }
    // FIXME: is there a case where startRepeatedItem and endRepeated item can be on the same node ?
    if (startCount > endCount) {  
      r = cur.startRepeatedItem;
      if ((0 == r.min) && (0 == r.total)) {  // was optional and unset
        r.unsetOption (); // sets it
      }     
     // jumps at the begining of this repeater
     cur = r.getFirstNodeForSlice(0);
     startCount = endCount = 0; // reset counting  
    } 
    cur = cur.previousSibling;
  }
  if (startFrom.parentNode) {         
    // FIXME: we could define a .xtt-template-root in the DOM since the template may not start at document root ?
    xtiger.editor.Repeat.autoSelectRepeatIter (startFrom.parentNode);
  }
}   

xtiger.editor.Repeat.prototype = {  
  
  // FIXME: make trash template dependant ?=> create a xtiger.Template ?  
  trash : [], // deleted slices stored as [repeater, [slice,*]]   
  
  hasLabel : function () {
    return (this.label != 'repeat');
  },                
  
  getRepeatableLabel : function () {
    return this.pseudoLabel;
  },
  
  dump : function () {
    return this.label;
  },
  
  getSize : function () {
    // return this.items.length;
    return this.total;
  },                       
    
  // Returns the last position after which an item was inserted or pasted after user action
  // Actually when the repeater is expanded as a consequence of loading XML data 
  // the concept of origin position is undefined and it returns -1
  getOriginPosition : function () {
    return this.originPosition;   
  },

  // Returns the last node for the slice at index
  getLastNodeForSlice : function (index) {
    var pos = (index < this.items.length) ? index : this.items.length - 1;
    return this.items[pos][1];
  },

  // Returns the first node for the slice at index 
  // FIXME: createIt is temporary (experiment with TOC)
  getFirstNodeForSlice : function (index, createIt) {
    var pos;
    if (index < this.items.length) {
      pos = index;
      } else {
      if (createIt && (index == this.items.length)) {
        this.appendSlice(); 
      }
        pos = this.items.length - 1;
    }
    return this.items[pos][0];
  },               
  
  getSliceIndexForStartMarker : function (node) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i][0] == node) {
        return i;
      }
    }   
    return -1;
  },  
  
  makeSeed : function (srcRepeater, dict) {
    if (this == srcRepeater) {
      xtiger.cross.log('clone-trace', '*repeater* do not replicate top/master repeater', this.seed[3]);
    } else {
      if (this.seed) {
        if (this.seed[0] == -2) { // -2 means it's a top/master repeater seed
          var m = dict[this.seed[3]]; // remaps it as a (-1) non top/master seed if not already done
          if (! m) {
            var id = xtdom.genId();
            xtiger.cross.log('clone-trace', '*repeater* remaps a non top/master repeater', id);
            m = [-1, this.seed[1], this.seed[2], id, this.min, this.max, this.pseudoLabel];
            dict[this.seed[3]] = m;           
          }
          return m;
        } else {
          xtiger.cross.log('debug', '*repeater* [should not happen] seed ' + this.seed[3] + ' already mapped as ' + this.seed[0]);
        }
      } else {
        var id = xtdom.genId();
        xtiger.cross.log('debug', '*repeater*  [should not happen] making a entirely repeater seed', id);
        this.seed = [-1, srcRepeater.label, srcRepeater.model, id, this.min, this.max, this.pseudoLabel]; // global model sharing
      }
    }
    return this.seed; // normally for the top/master repeater it has already been created by ShallowClone
  },  
  
  initFromSeed : function (repeaterSeed, doc) {                                             
    this.curDoc = doc;
    this.label = repeaterSeed[1];
    this.model = repeaterSeed[2];          
    this.min = repeaterSeed[4];          
    this.max = repeaterSeed[5];
    this.pseudoLabel = repeaterSeed[6];
    this.total = (this.min > 0) ? 1 : 0; // FIXME: generate entries if this.min > 1 !   
    this.items = [[null, null, null, null]]; // will be set through setStartItem, setEndItem and setMarkItem    
  },
  
  setStartItem : function (node) {
    this.items[0][0] = node;
  },

  setEndItem : function (node) {
    this.items[0][1] = node;
  },

  // this method supposes the callee Repeater has not yet been repeated becauses it always initializes 
  // the first repeated slice (this.items[0])
  setMarkItem : function (node) {
    if (this.items[0][2]) { // sets mark1 (left menu)
      this.items[0][3] = node;  
    } else { // sets mark2 (right menu)
      this.items[0][2] = node;
    }
    var _this = this; // closure
    xtdom.addEventListener (node, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    xtiger.cross.log('iter-trace', 'setMarkItem for repeater ' + this.dump() + ' on node ' + node.tagName);
  },       
                                         
  // Update menu depending on repeater state and min/max constraints
  configureMenuForSlice : function (index) {   
    // window.console.log('Configure menu min=%s max=%s total=%s index=%s length=%s', this.min, this.max, this.total, index, this.items.length);
    if (index >= this.items.length) {
      xtiger.cross.log('error', 'Wrong menu configuration in repeater ' + this.dump());
      return;
    }
    var leftImg = this.items[index][2];
    var rightImg = this.items[index][3];    
         
    // configures image for left menu
    var srcLeft = xtiger.bundles.repeat.checkedIconURL;
    if (0 == this.min) {
      if (0 == this.total) {
        srcLeft = xtiger.bundles.repeat.uncheckedIconURL; // no item loaded into the repeat
      } else if (1 == this.total) {
        srcLeft = xtiger.bundles.repeat.checkedIconURL; // just one item loaded into the repeat
      } else {                         
        srcLeft = xtiger.bundles.repeat.minusIconURL; // more than one item and they can be deleted 
      }
    } else if (this.total == this.min) {
      srcLeft = xtiger.bundles.repeat.plusIconURL; // only one item and min is not 0
    } else {
      srcLeft = xtiger.bundles.repeat.minusIconURL;
    }               
    // window.console.log('Set left ' + srcLeft);
    xtdom.setAttribute (leftImg, 'src', srcLeft);  
    
    // configures image for right menu
    xtdom.setAttribute (rightImg, 'src', xtiger.bundles.repeat.plusIconURL); // always +
    var rightVisible = false;
    if (0 == this.min) {
      if (((this.max > 1) || (-1 == this.max)) && (this.total > 0)) {
        rightVisible = true;
      }
    } else if ((this.total > 1) && ((this.max > 1) || (-1 == this.max))) {
      rightVisible = true;      
    }                          
    // window.console.log('Set right visibility ' + rightVisible);
    if (rightVisible) {
      xtdom.removeClassName (rightImg, 'axel-core-off');
    } else {
      xtdom.addClassName (rightImg, 'axel-core-off');
    }
  },
    
  initFromTree : function (container, repeatNode, doc)  {
    this.curDoc = doc;
    this.label = repeatNode.getAttribute('label') || 'repeat'; // FIXME: supposes 'repeat' is forbidden in XML tag names
    this.pseudoLabel = repeatNode.getAttribute('pseudoLabel') || 'repeat';
    var val = repeatNode.getAttribute('minOccurs') || 0;
    this.min = isNaN(val) ? 1 : parseInt(val); // defaults min to 1
    val = repeatNode.getAttribute('maxOccurs') || -1;
    this.max = isNaN(val) ? -1 : parseInt(val); // defaults max to -1 (unbounded)
    this.total = (this.min > 0) ? 1 : 0; // FIXME: generate entries if this.min > 1 !
    xtiger.cross.log('plant', 'Create Repeat Editor ' + this.min + '/' + this.max + '/' + this.label);    
        
    // prepares the Repeat menu (an <img>)
    var rightImg = xtdom.createElement(this.curDoc, 'img');
    var width = '16';
        
    // Insertion Point sniffing: the goal is to guess and to insert the repeater menu
    var insertPoint;
    if (insertPoint = xtdom.getMenuMarkerXT(container)) {   
      // 1st case: there is a <xt:menu-mark> remaining inside the container
      insertPoint.parentNode.replaceChild(rightImg, insertPoint);
      width = insertPoint.getAttribute('size') || width; // fixme: inherit class attribute instead
    } else {
      // 2nd case: checks if the repeater is the repeater of a single auto-wrapped element
      var counter = 0;
      var cur = container.firstChild;
      while (cur) {
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          var curclass = cur.className;
          if (curclass && (-1 != curclass.indexOf('xtt-auto-wrapped'))) { // TODO check if shouldn't be replaced by axel-auto-wrapped
            if (counter == 0) {
              insertPoint = cur;
            } 
            counter++;                    
          }
        }       
        cur = cur.nextSibling;
      }
      if (counter == 1) { // inserts the menu just after the autowrapped element
        insertPoint.appendChild(rightImg);
      } else {
        // 3rd case: inserts the menu at the end of the slice
        container.appendChild(rightImg);        
      }
    } 
    
    // finishes menu configuration
    xtdom.setAttribute (rightImg, 'width', width);
    xtdom.addClassName (rightImg, 'axel-repeat-right');
    
    // inserts the second menu
    var leftImg = xtdom.createElement(this.curDoc, 'img');
    xtdom.setAttribute (leftImg, 'width', width);
    xtdom.addClassName (leftImg, 'axel-repeat-left');
    rightImg.parentNode.insertBefore (leftImg, rightImg, false);    
    
    // sets repeater boundaries to the whole slice    
    start = container.firstChild;
    end = container.lastChild;
    
    // saves special attributes         
    if (start.startRepeatedItem) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and repeat "' + start.startRepeatedItem.label + '" with same START boundaries !');
    }   
    start.startRepeatedItem = this; // NOTE marker here 
    // start.startRepeatLabel = 'startRepeat'; //DEBUG IE
    if (end.endRepeatedItem) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and repeat "' + end.endRepeatedItem.label + '" with same END boundaries !');
    }   
    end.endRepeatedItem = this; // NOTE MARKER HERE
    // end.endRepeatLabel = 'endRepeat'; //DEBUG IE     
    leftImg.markRepeatedEditor = this;  
    rightImg.markRepeatedEditor = this; 
    
    if (start.xttOpenLabel) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and use with same START boundaries !');
    }   
    if (end.xttCloseLabel) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and use with same END boundaries !');
    }   
    var _this = this; // closure
    xtdom.addEventListener (leftImg, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    xtdom.addEventListener (rightImg, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    // creates a clone of the repeated content (linked with its repeated editors)
    // it will resides outside of the tree
    // if (this.max > 1) {
      this.model = this.shallowClone (container); 
    // }
    this.items.push ( [start, end, leftImg, rightImg] ); // first slice  
    this.configureMenuForSlice (0);
    if (0 == this.min) {
      this.unactivateSliceAt (0);
    }
  },      
  
  // The shallow clone used as a model only contains seeds for reinstantiating the editors
  shallowFinishCloning : function (clone, node, dict) {
    // use labels seeds
    if (node.xttOpenLabel)  clone.xttOpenLabel = node.xttOpenLabel;   
    if (node.xttCloseLabel) clone.xttCloseLabel = node.xttCloseLabel;       
    // repeat editors seeds
    if (node.markRepeatedEditor)  clone.markRepeatedEditor = node.markRepeatedEditor.makeSeed(this, dict);
    if (node.startRepeatedItem) clone.startRepeatedItem = node.startRepeatedItem.makeSeed(this, dict);
    if (node.endRepeatedItem) clone.endRepeatedItem = node.endRepeatedItem.makeSeed(this, dict);
    // choice editors seeds
    if (node.markChoiceEditor)  clone.markChoiceEditor = node.markChoiceEditor.makeSeed();    
    if (node.beginChoiceItem) clone.beginChoiceItem = node.beginChoiceItem.makeSeed();        
    if (node.endChoiceItem) clone.endChoiceItem = node.endChoiceItem.makeSeed();    
    // primitive editor seeds
    if (node.xttPrimitiveEditor)  clone.xttPrimitiveEditor = node.xttPrimitiveEditor.makeSeed();
    // service seeds
    if (node.xttService)  clone.xttService = node.xttService.makeSeed();
  },
    
  // FIXME: there is a bug when there are n repeat inside a repeat (n > 1), all the repeaters are merged and the last one wins
  // when the main repeater is cloned....
  shallowClone : function (node) {
    var dict = {}; // used to remap seeds
    var clone = xtdom.cloneNode (this.curDoc, node, false);  // "canonical tree" with "virgin" repeaters (should be unrepeated)
    this.seed = [-2, this.label, clone, xtdom.genId(), this.min, this.max, this.pseudoLabel]; // -2 is a convention (must be != from -1)    
    this.shallowFinishCloning (clone, node, dict);
    for (var i = 0; i < node.childNodes.length; i++) {
      this.shallowCloneIter (clone, node.childNodes[i], dict);
    }                                             
    return clone; // the clone is not saved in a document (dangling)
  },
                              
  // Creates a clone of the container including cloning of special attributes
  // This is a shallow clone because all the models set for the repeaters remain shared
  // set by XTigerTrans editor transformation algorithm
  shallowCloneIter : function (parent, node, dict) {   
    var clone = xtdom.cloneNode (this.curDoc, node, false);
    this.shallowFinishCloning (clone, node, dict);    
    parent.appendChild(clone);
    for (var i = 0; i < node.childNodes.length; i++) {
      this.shallowCloneIter (clone, node.childNodes[i], dict);
    }
  },
  
  // Cloning of the XttChoiceEditor(s) from the model sub-tree
  getChoiceEditorClone : function (dict, editorSeed) {
    var m = dict[editorSeed];  // find it's duplicated version
    if (! m) {
      var m = new xtiger.editor.Choice ();
      m.initFromSeed (editorSeed, this.curDoc); // FIXME : use a better hash key than another object ?
      dict[editorSeed] = m;
    }                     
    return m;
  },

  // Cloning of the Repeat editor(s) from their seed
  // Dict key is taken from the unique Repeat editor id saved into the seed
  getRepeatEditorClone : function (dict, editorSeed) {
    var m = dict[editorSeed[3]];  // find it's duplicated version
    if (! m) {
      var m = new xtiger.editor.Repeat ();
      m.initFromSeed (editorSeed, this.curDoc);
      dict[editorSeed[3]] = m; // FIXME : use a better hash key than another object ?
      xtiger.cross.log('stack-trace', 'cloning repeat editor', m.dump(), '(' + editorSeed[3] + ')');
    }                     
    return m;
  },  
  
  deepFinishCloning : function (clone, node, modelDict, masterRepeater, accu) {
    // xt:use labels cloning
    if (node.xttOpenLabel)  clone.xttOpenLabel = node.xttOpenLabel;   
    if (node.xttCloseLabel) clone.xttCloseLabel = node.xttCloseLabel;   
    
    // repeat editor cloning if it is linked to an editor different than the current master
    if (node.startRepeatedItem) {
      if (node.startRepeatedItem[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.startRepeatedItem);  // find it's duplicated version
        m.setStartItem (clone);
        clone.startRepeatedItem = m; 
      } else {
        clone.startRepeatedItem =  this; // it belongs to the repeater beeing clone
        accu[0] = clone;
      }
    }  
    if (node.endRepeatedItem) {
      if (node.endRepeatedItem[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.endRepeatedItem);  // find it's duplicated version
        m.setEndItem (clone);
        clone.endRepeatedItem = m; 
      } else {
        clone.endRepeatedItem =  this; // it belongs to the repeater beeing clone
        accu[1] = clone;
      }
    }
    if (node.markRepeatedEditor) {
      if (node.markRepeatedEditor[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.markRepeatedEditor);  // find it's duplicated version
        m.setMarkItem (clone); // must do the addEventListener stuff as below (!)
        clone.markRepeatedEditor = m; 
      } else {
        // the following is equivalent to this.setMarkItem(clone) but it does not alter the repeater items list
        // because the accumulated index will be appended to it at the end
        clone.markRepeatedEditor =  this; // it belongs to the repeater beeing clone
        var _this = this; // closure
        xtdom.addEventListener (clone, 'click', function (ev) { _this.handleRepeat(ev)}, true);
        if (accu[2]) { // mark1 was already set, sets mark2
          accu[3] = clone;
        } else {
          accu[2] = clone;
        }
      }
    }   
      
    // choice editor cloning            
    if (node.markChoiceEditor) {
      var m = this.getChoiceEditorClone (modelDict[1], node.markChoiceEditor);
      m.setChoiceMenu (clone);
      clone.markChoiceEditor = m;         
    }
    if (node.beginChoiceItem) {
      var m = this.getChoiceEditorClone (modelDict[1], node.beginChoiceItem);
      m.setBeginChoiceItem (clone);
      clone.beginChoiceItem = m;        
    }
    if (node.endChoiceItem) {
      var m = this.getChoiceEditorClone (modelDict[1], node.endChoiceItem);
      m.setEndChoiceItem (clone);
      clone.endChoiceItem = m;        
    }
    
    // primitive editor cloning
    if (node.xttPrimitiveEditor) {
      var seed = node.xttPrimitiveEditor;
      var factory = seed[0];      
      clone.xttPrimitiveEditor = factory.createEditorFromSeed (seed, clone, this.curDoc, this);
    }

    // service cloning
    if (node.xttService) {
      var seed = node.xttService;
      var factory = seed[0];      
      clone.xttService = factory.createServiceFromSeed (seed, clone, this.curDoc, this);
    }
  },
  
  // Creates a clone of the container including cloning of special attributes
  // This is a deep clone because all the models set for the repeaters are also cloned
  // Returns the clone which dangling
  deepClone : function (node, accu) {
    var clone = xtdom.cloneNode (this.curDoc, node, false);  
    var modelDict = [{}, {}]; // first hash for Repeat editor and second for Choice editor
    this.deepFinishCloning (clone, node, modelDict, this, accu); 
    for (var i = 0; i < node.childNodes.length; i++) {
      this.deepCloneIter (clone, node.childNodes[i], modelDict, this, accu);
    }    
    return clone;
  },
                      
  // modelDict contains translation table to duplicate nested Repeat editors
  // masterRepeater is the repeater which initiated the cloning          
  // accu stores the indexical elements (start, end, mark) for the masterRepeater
  deepCloneIter : function (parent, node, modelDict, masterRepeater, accu) {    
    if (node.xttPrimitiveEditor) { // FIXME: leaf cloning behavior (to be verified)
      var clone = xtdom.cloneNode (this.curDoc, node, true);    
      parent.appendChild (clone); // parent and clone MUST BE in the same document
      this.deepFinishCloning (clone, node, modelDict, masterRepeater, accu); 
      return;
    } 
    var clone = xtdom.cloneNode (this.curDoc, node, false);   
    parent.appendChild (clone); // parent and clone MUST BE in the same document
    this.deepFinishCloning (clone, node, modelDict, masterRepeater, accu); 
    for (var i = 0; i < node.childNodes.length; i++) {
      this.deepCloneIter (clone, node.childNodes[i], modelDict, masterRepeater, accu);
    }
  },
  
  // Returns a new slice copied from the repeater model
  getOneCopy : function (index, position) {
    return this.deepClone(this.model, index);
  },   
      
  // Keeps only one slice and updates this.total
  // not used at that time
  reset : function () {                 
    var start = this.min + 1;
    for (var i = start; i < this.total; i++ ) { // extra slices to delete
      this.removeItemAtIndex (i, false);
    }                  
    this.total = this.min; 
    this.configureMenuForSlice (0);
  },
  
  // Inserts a slice index into the list of slices of the repeater at a given position
  // to be called after the slice nodes have been inserted into the DOM
  plantSlice : function (index, position) {
    if (this.items.length == 1) { 
      // there was only one item, now there will be two so they both can be deleted
      xtdom.removeClassName(this.items[0][2], 'axel-core-off');
    }
    this.items.splice(position + 1, 0, index);      
  },     
    
  // Called by the generator each time a new slice has been loaded
  // Must be done explicitely (and not in appendSlice) because optional repeater (min=0)
  // have a state with 1 slice and 0 data
  sliceLoaded : function () {                
    this.total++;                                                 
    if ((0 == this.min ) && (1 == this.total)) { // transition from 0 to 1
      this.activateSliceAt (0);
    }     
    if (((0 == this.min ) && (2 == this.total)) 
        || ((this.min > 0) && (this.total == (this.min + 1))))
    {                                
      // special transition
      for (var i = 0; i <= this.min; i++) {
        this.configureMenuForSlice (i);
      }
    }
    // updates menu configuration for the 1st item, added item and last item        
    this.configureMenuForSlice (this.total-1); // configuration for last item     
  },
    
  // Adds a new Slice copied from the repeater model at the end of the slices
  // Returns the index of the new slice
  appendSlice : function () {   
    var lastIndex = this.items.length - 1;
    var lastNode = this.getLastNodeForSlice(lastIndex);
    var index = [null, null, null, null];
    this.originPosition = -1; // lastIndex; because currently load follows document order
    var copy = this.getOneCopy (index); // clones the model and creates a new slice
    xtdom.moveChildrenOfAfter (copy, lastNode);
    this.plantSlice (index, lastIndex);       
    this.dispatchEvent(index, 'duplicate');
    return lastIndex + 1;  
  },
  
  // Manages the "menu" of the Repeater (i.e. plus and minus buttons)
  handleRepeat : function (ev) {    
    var appended = false;
    var target = xtdom.getEventTarget(ev);
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i][2] == target) {
        if ((0 == this.min) && (0 == this.total)) {
          this.unsetOption (); // in that case + was on the left (i.e. unchecked option)
          appended = true;
        } else if ((this.min > 0) && (1 == this.total)) { // in that case + was on the left...
          this.addItem(target, i, ev.shiftKey);
          appended = true;          
        } else {      
          if ((0 == this.min) && (1 == this.total)) {
            this.setOption (); // not a real delete
          } else {
            this.deleteItem(target, i, ev.shiftKey);
          }
        }
        break;
      } else if (this.items[i][3] == target) {  
        this.addItem(target, i, ev.shiftKey);
        appended = true;        
        break; // avoid recursion !
      }
    }
    if (appended) { 
      xtiger.editor.Repeat.autoSelectRepeatIter (this.getFirstNodeForSlice(0)); // propagates it      
    }
  },     
    
  // Transition from 0 item to 1 item (was optional, becomes part of the document)   
  // Only for repeated elements with a min of 0  !
  unsetOption : function () {
    this.total++; 
    this.configureMenuForSlice (0);
    this.activateSliceAt(0);
  },           
  
  activateNodeIter : function (node, curInnerRepeat) {
    if ((!curInnerRepeat) || (curInnerRepeat.total >= 1)) { // restores it if current repetition nb >= 1
      xtdom.removeClassName(node, 'axel-repeat-unset'); 
    }
  },
                       
  // Removes the class 'axel-repeat-unset' on all the top elements of the slice at position index
  activateSliceAt : function (index) {
    this.mapFuncToSliceAt(xtiger.editor.Repeat.prototype.activateNodeIter, index, false);
  },

  // Transition from 1 item to 0 item (1st item is removed from the document)
  // Only for repeated elements with a min of 0 ! 
  setOption : function () {    
    this.total--;
    this.configureMenuForSlice (0);   
    this.unactivateSliceAt (0);
  },      
  
  unactivateNodeIter : function (node, curInnerRepat) {
    xtdom.addClassName(node, 'axel-repeat-unset'); 
    // if (curInnerRepat) { window.console.log('unactivate ' + curInnerRepat.label);  }
  },

  // Adds class 'axel-repeat-unset' on all the top elements of the slice at position index
  unactivateSliceAt : function (index) {
    this.mapFuncToSliceAt(xtiger.editor.Repeat.prototype.unactivateNodeIter, index, true);
  },
             
  /** 
   * Calls the method named 'action' on all the primitive editors in the 'top' tree
   * Passes the repeater to the action
   */
  callPrimitiveEditors : function (top, action) {             
    var treeWalker = xtiger.cross.makeTreeWalker (top, xtdom.NodeFilter.SHOW_ELEMENT,
        function (n) { 
            if (n.xttPrimitiveEditor && n.xttPrimitiveEditor.can(action)) {
              return xtdom.NodeFilter.FILTER_ACCEPT
            } else {
              return xtdom.NodeFilter.FILTER_SKIP; 
            }
        } );
    while(treeWalker.nextNode()) {
      treeWalker.currentNode.xttPrimitiveEditor.execute(action, this);
    }   
  }, 
    
  // Dispatches an event (which is converted to a builtin method call) on a slice
  dispatchEvent : function (slice, name) {
        var cur = slice[0];
        do {
      this.callPrimitiveEditors(cur, name);
      cur = cur.nextSibling;                          
        } while (cur && (cur != slice[1]));
    
  },  
  
  addItem : function (mark, position, useTrash) {    
    var saved, slice, end, n, newIndex, i;
    var preceeding = this.items[position];    
    if (useTrash) { // checks for a previously deleted item for this Repeater   
      for (i = 0; i < this.trash.length; i++) {
        if (this.trash[i][0] == this) {
          saved = this.trash[i];
          break;
        }
      }   
    }                                     
    this.originPosition = position; // set up origin for event dispacthing to primitive editors
    if (saved) { // pastes the latest deleted item from this Repeater
      newIndex = saved[2];
      slice = saved[1];     
      xtdom.moveNodesAfter (slice, preceeding[1]);
      this.trash.splice(i, 1);
      // Replaced with 'duplicate' event (see infra)
      // cur = newIndex[0]; // dispatches a kind of 'paste' event to interested primitive editors
      //      this.callPrimitiveEditors(cur, 'paste');
      //      end = newIndex[1];      
      //      while (cur != end) {    
      //        this.callPrimitiveEditors(cur, 'paste');        
      //        cur = cur.nextSibling;
      //      }
    } else { // creates and pastes a default item (from the Repeater's model)
      newIndex = [null, null, null, null];
      n = this.getOneCopy (newIndex, position);
      xtdom.moveChildrenOfAfter (n, preceeding[1]);
    }          
    this.originPosition = -1;   
    this.plantSlice (newIndex, position);   
    this.total++; 
    // updates menu configuration for the 1st item, added item and last item        
    if (0 == position) {
      this.configureMenuForSlice (0); // configuration for 1st item
    }       
    this.configureMenuForSlice (position + 1); // configuration for added item            
    this.configureMenuForSlice (this.total-1); // configuration for last item   
    this.dispatchEvent(newIndex, 'duplicate'); // FIXME: add a 'fromClipboard' arg ?
  },
  
  // FIXME: prevoir d'iterer sur tous les editeurs (choice, repeat, primitive) et d'appeler une methode
  // deleteEditor() pour qu'ils se désabonnent
  deleteItem : function (mark, position, useTrash) {
    this.removeItemAtIndex (position, useTrash);
    if (this.total <= 1) {
      this.configureMenuForSlice (0); // configures menu for 1st item
    } else {
      this.configureMenuForSlice (this.total-1); // configures menu for last item   
    }
  },            
    
  removeItemAtIndex : function (position, useTrash) {   
    var cur, next;
    this.originPosition = position;     
    // must delete node between start and end
    var index = this.items[position];    
    var slice = useTrash ? [] : null;
    if (index[0] == index[1]) { // start == end  (i.e. the repeated use was auto-wrapped)
      if (useTrash) { slice.push (index[0]);  } 
      this.callPrimitiveEditors(index[0], 'remove');
      index[0].parentNode.removeChild(index[0]);      
    } else {
      // deletes the forest between index[0] and index [1], including themselves
      // PRE-CONDITION: works only if index[0] and index [1] are siblings ! (should be the case by construction)       
      this.dispatchEvent(index, 'remove');
      // do the real thing      
      next = index[0].nextSibling;
      if (useTrash) { slice.push (index[0]); }
      // this.callPrimitiveEditors(index[0], 'remove');
      index[0].parentNode.removeChild(index[0]);
      while (next && (next != index[1])) {
        cur = next;
        next = next.nextSibling;
        if (useTrash) { slice.push (cur); }        
        // this.callPrimitiveEditors(cur, 'remove');
        index[1].parentNode.removeChild(cur);
      }
      if (useTrash) { 
        slice.push (index[1]); 
      }
      index[1].parentNode.removeChild(index[1]);
    }  
    this.originPosition = -1;   
    this.items.splice(position, 1);  
    if (useTrash) { this.trash.push([this, slice, index]); }    
    this.total--;   
  },                                    
                              
  // Traverses each top node in the slice, and calls func on it iff it is an ELEMENT node
  // func should not change the slice 
  mapFuncToSliceAt : function (func, index) {    
    var cur, slice, curInnerRepeat, stackInnerRepeat;    
    var opened = 0;       
    slice = this.items[index]; // FIXME: no sanity check on index ?
    cur = slice[0];
    curInnerRepeat = null;
    if (slice[0] == slice[1]) { // manages the case when the slice starts and ends on the same node
      if (xtdom.ELEMENT_NODE == cur.nodeType) {
        func.call(this, cur, curInnerRepeat);     
      }
    } else {
      while (cur && (cur != slice[1])) {
        if (cur.startRepeatedItem && (cur.startRepeatedItem != this)) { // tracks inner repeat
          if (curInnerRepeat) { // there was already some, stacks them
            if (! stackInnerRepeat) {
              stackInnerRepeat = [ curInnerRepeat ];
            } else {
              stackInnerRepeat.push(curInnerRepeat);
            }
          }
          curInnerRepeat = cur.startRepeatedItem;
          if (cur.endRepeatedItem && (cur.endRepeatedItem == cur.startRepeatedItem)) { 
            // special case with an innerRepeat that starts and ends on the same node
            // we push it so that the next test will set curInnerRepeat to it
            if (! stackInnerRepeat) {
              stackInnerRepeat = [ curInnerRepeat ];
            } else {
              stackInnerRepeat.push(curInnerRepeat);
            }
          }
        }      
        if (cur.endRepeatedItem && (cur.endRepeatedItem != this)) {         
          if (stackInnerRepeat && (stackInnerRepeat.length > 0)) {
            curInnerRepeat = stackInnerRepeat.pop();
          } else {
            curInnerRepeat = null;
          }
        }
        if (xtdom.ELEMENT_NODE == cur.nodeType) {
          func.call(this, cur, curInnerRepeat);
        }
        cur = cur.nextSibling;
      } // FIXME: shouldn't we iterate too on the last slice ?
    }   
  }
}

// Resource registration
xtiger.resources.addBundle('repeat', 
  { 'plusIconURL' : 'plus.png',
    'minusIconURL'  : 'minus.png',  
    'uncheckedIconURL' : 'unchecked.png',
    'checkedIconURL' : 'checked.png'  } );