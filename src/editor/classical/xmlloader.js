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
 * Basic XML loading algorithm exposed as a loadData function
 * Starts iterating on any XTiger XML DOM tree which must have been transformed first 
 * Feed the tree with XML data stored in a DOMDataSource
 * You can share this class as it doesn't maintain state information between loadData calls
 */
xtiger.editor.BasicLoader = function () {
}

xtiger.editor.BasicLoader.prototype = {

  // walks through the tree and renders model data as it encounters it
  loadData : function (n, dataSrc) {
    var curSrc = dataSrc.getRootVector ();
    var stack = [ curSrc ];
    this.loadDataIter (n, dataSrc, stack);
  },

  // checks that all the repeated items have been consumed on the stack at the point
  hasDataFor : function (repeater, point, dataSrc) {
    var doMore = false;
    if (repeater.hasLabel()) { // in that case repeater Tag was popped out
      doMore = (0 != dataSrc.lengthFor(point));
    } else {
      doMore = dataSrc.hasDataFor(repeater.getRepeatableLabel(), point);
      // window.console.log('Checked (%s) anonymous repeat with pseudo label %s', doMore, repeater.getRepeatableLabel());
    }
    return doMore;
  },
        
  makeRepeatState : function (repeater, size, useStack, useReminder) {
    return [repeater, size, useStack, useReminder];   
  },
    
  loadDataSlice : function (begin, end, dataSrc, stack, point, origin, repeatedRepeater) {
    var repeats = []; // stack to track repeats
    var cur = begin;
    var go = true;
    var next; // anticipation (in case repeatExtraData is called while iterating as it insert siblings)
    while (cur && go) {     
      if (cur.startRepeatedItem && (cur.startRepeatedItem != repeatedRepeater)) {
        if ((repeats.length == 0) || ((repeats[repeats.length - 1][0]) != cur.startRepeatedItem)) { // new repeat         
          var state;
          // cur.startRepeatedItem.reset(); // resets repeat (no data) => cannot alter it while iterating !
          if (cur.startRepeatedItem.hasLabel()) {
            var nextPoint = dataSrc.getVectorFor (cur.startRepeatedItem.dump(), point);
            if ((nextPoint instanceof Array) && (dataSrc.lengthFor(nextPoint) > 0)) { // XML data available
              stack.push(nextPoint); // one level deeper
              point = nextPoint;
              state = this.makeRepeatState(cur.startRepeatedItem, cur.startRepeatedItem.getSize(), true, true);
            } else { // No XML data available
              cur = cur.startRepeatedItem.getLastNodeForSlice(cur.startRepeatedItem.getSize()); // skips repeat
              cur = cur.nextSibling; // in case cur has children, no need to traverse them as no slice is selected
              continue
            }
          } else { 
            if (this.hasDataFor(cur.startRepeatedItem, point, dataSrc)) { //  XML data available
              state = this.makeRepeatState(cur.startRepeatedItem, cur.startRepeatedItem.getSize(), false, true);
            } else {                                         
              cur = cur.startRepeatedItem.getLastNodeForSlice(cur.startRepeatedItem.getSize()); // skips repeat
              cur = cur.nextSibling;  // in case cur has children, no need to traverse them as no slice is selected
              continue
            }  
          }
          repeats.push(state);
        }
      }
      
      // restricts iterations on the current chosen item (if it is in the point)
      if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        var c = cur.beginChoiceItem;
        point = dataSrc.getVectorForAnyOf (c.getTypes(), point);  
        if (point instanceof Array) { // implies (point != -1)
          stack.push(point); // one level deeper
          var curItem = c.selectChoiceForName (dataSrc.nameFor(point));
          if (c.items[curItem][0] != c.items[curItem][1]) {
            this.loadDataSlice(c.items[curItem][0], c.items[curItem][1], dataSrc, stack, point, c); // [SLICE ENTRY]
            cur = c.items[c.items.length - 1][1]; // jumps to the last Choice item end boundary
            // in case it closes a label containing the choice, closes it 
            if ((cur.xttCloseLabel && (! cur.xttOpenLabel)) && (curItem != (c.items.length - 1))) {
              // this.loadDataIter (cur, dataSrc, stack); // the last Choice element may close a label
              stack.pop ();
              point = stack[stack.length -1]; 
            }                                         
          } else {          
            // a choice slice starts and end on the same node
            this.loadDataIter(c.items[curItem][0], dataSrc, stack);  // [SLICE ENTRY]
            stack.pop(); // restores the stack and the point  [SLICE EXIT]
            point = stack[stack.length -1];         
            cur = c.items[c.items.length - 1][1]; // jumps to the last Choice item end boundary           
          }
        } // otherwise do not change Choice content (no data)
      } else {
        // FIXME: see serializeDataIter
        this.loadDataIter (cur, dataSrc, stack); // FIXME: first interpretation
        point = stack[stack.length -1];
        if (origin) {  // checks if iterating on the current slice of a choice
          if (cur == origin.items[origin.curItem][1]) { // checks that the end of the slice/choice has been reached           
            stack.pop(); // restores the stack and the point
            point = stack[stack.length -1];         
            return;  // [SLICE EXIT] ~ internal repeats are closed by callee (because repeat is handled 1st)
                     // there may also be a label associated with the last Choice element that will be closed by callee
          }         
        }
        // FIXME: second interpretation
        // this.loadDataIter (cur, dataSrc, stack);
        // point = stack[stack.length -1]; // recovers the point as loadDataIter may change the position in the stack
      }       
      if (cur == end) {
        go = false;
      }               
      next = cur.nextSibling;
      
      // checks repeat section closing i.e. the last item has been traversed
      if (cur.endRepeatedItem && (cur.endRepeatedItem != repeatedRepeater)) { 
        var state = repeats[repeats.length - 1]; // current repeat state
        if (true || (cur.endRepeatedItem == state[0])) {   // true: at the moment always 1 repeat end by node         
          --(state[1]);  
          if (state[1] < 0) { // optional repeater (total = 0) was set during this iteration 
            if (cur.endRepeatedItem.getSize() == 0) {
              cur.endRepeatedItem.sliceLoaded();
            }
            // otherwise it has been configured/activated through autoSelectRepeatIter call
            // from a service filter set to askUpdate on load
          }
          if (state[1] <= 0) { // all the items have been repeated (worth if min > 1)
            if (state[3] && this.hasDataFor(cur.endRepeatedItem, point, dataSrc)) { // did we exhaust the data source ?
              var repeater = cur.endRepeatedItem;
              while (this.hasDataFor(repeater, point, dataSrc)) {
                xtiger.cross.log('stack-trace', '>>[ extra ]>> start repetition for', repeater.dump());   
                var tmpStack = [point]; // simulates stack for handling the repeated repeat
                var pos = repeater.appendSlice();
                var begin = repeater.getFirstNodeForSlice(pos);
                var end = repeater.getLastNodeForSlice(pos);
                this.loadDataSlice (begin, end, dataSrc, tmpStack, point, undefined, repeater);   
                repeater.sliceLoaded(); // 1 slice of extra data added to repeater during this iteration   
              }
            }
            if (state[2]) {
              stack.pop(); // restores the stack and the point
              point = stack[stack.length -1];
            }
            repeats.pop();    
          }
        }
      }
      cur = next;
    }   
  },
    
  // Manages xttOpenLabel, xttCloseLabel and atomic primitive editors
  // Recursively call loadDataSlice on the children of the node n 
  loadDataIter : function (n, dataSrc, stack) {
    var curFlow, curLabel;
    var point = stack[ stack.length - 1 ];
    if (n.xttOpenLabel) {     
      curLabel = n.xttOpenLabel;
      if (curLabel.charAt(0) == '!') { // double coding "!flow!label" to open a separate flow
        var m = curLabel.match(/^!(.*?)!(.*)$/); // FIXME: use substr...
        curFlow = m[1];
        curLabel = m[2];
        // window.console.log('Open Flow ' + curFlow + ' at point ' +  dataSrc.nameFor(point));
        point = dataSrc.openFlow(curFlow, point, curLabel) || point; // changes the point to the separate flow
        // FIXME: what to do if no flow, theoritically it is possible to ignore it 
        // then we should also ignore it in closeFlow (that means data aggregation was done server side)
      }
      var attr = false;
      // moves inside data source tree
      if (curLabel.charAt(0) == '@') {          
        point = dataSrc.getAttributeFor(curLabel.substr(1, curLabel.length - 1), point);
        attr = true;
      } else {
        point = dataSrc.getVectorFor(curLabel, point);
      }
      if (attr || ((point instanceof Array) && (dataSrc.lengthFor(point) > 0))) {
        stack.push(point); // one level deeper
      } else {
        // FIXME: handle optional element it (make them turned off)
        point = -1; // -1 for "End of Source Data" (xttCloseLabel should be on a sibling)
        stack.push(point);        
      }
    }
    if (n.xttPrimitiveEditor) {
      n.xttPrimitiveEditor.load (point, dataSrc);
      point = -1; // to prevent iteration on children of n below as n should be atomic
    }
    if (n.firstChild) {
        // FIXME: iterates on child even if point -1 to be robust to incomplete XML (not sure this is exactly required)
        this.loadDataSlice (n.firstChild, n.lastChild, dataSrc, stack, point);
    }
    if (n.xttCloseLabel) { 
      curLabel = n.xttCloseLabel;
      if (curLabel.charAt(0) == '!') { // double coding "!flow!label" to open a separate flow
        var m = curLabel.match(/^!(.*?)!(.*)$/); // FIXME: use substr...
        curFlow = m[1];
        curLabel = m[2];
        dataSrc.closeFlow(curFlow, point); // restores point to the previous flow (or top)
      }
      stack.pop ();
    }
  }   
}

// Registers as default XML loader (file must be included after generator.js)
xtiger.editor.Generator.prototype.defaultLoader = new xtiger.editor.BasicLoader ();
