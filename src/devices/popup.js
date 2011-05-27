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

/**    
 * PopupDevice displays a popup menu.     
 * You should create only one device per-document which can be shared between multiple editor's
 */
xtiger.editor.PopupDevice = function (aDocument) {
  
  /**
   * The document containing *this* device
   */
  this._document = aDocument;
  
  /**
   * The device's edition handle
   */
  this._menu = xtiger.session(aDocument).load('popupmenu'); // shared on a per-document basis
  if (!this._menu) {
    this._menu = new xtiger.editor.PopupMenu(aDocument);
    xtiger.session(aDocument).save('popupmenu', this._menu);
  }
  
  /**
   * A reference to the keyboard device
   */
  this._keyboard = xtiger.session(aDocument).load('keyboard');
  
  /**
   * The currently edited model
   */
  this._currentModel = null;
  
  /**
   * The handlers for keyboard events
   */
  this._keyboardHandlers = null;
  
  /**
   * The current selection
   */
  this._currentSelection = null;
  
  // event callback to subscribe / unscribe later
  var _this = this; 
  this.clickHandler = function(ev) {
    _this.handleClick(ev);
  };
}

xtiger.editor.PopupDevice.prototype = {   
  
  MAX_HEIGHT : 150, // FIXME: should become a popup_max_heigth parameter
  
  /**
   * Displays the popup menu below the editor's handle
   * Available choices are listed in choices with the current one in curSel
   * 
   * @param aModel
   * @param aChoices
   * @param aSelection
   * @param aHandle
   */
  startEditing : function(aModel, aChoices, aSelection, aHandle) {
    var coldStart = true;
    var popupDiv = this._menu.getHandle();
    
    if (this._currentModel != null) {
      // another editing was in progress with the same device
      this.stopEditing(true);
      coldStart = false;
    }     
    
    // Resets Width/Height constraints that will be adjusted after display                                
    popupDiv.style.width = '';
        popupDiv.style.maxHeight = this.MAX_HEIGHT + 'px'; // will be adjusted later
        
    this._menu.setOptions(aChoices, aSelection);
    this._menu.setPosition(aHandle);
    if (coldStart) {
      this._menu.show();
      xtdom.addEventListener(this._document, 'mousedown',
          this.clickHandler, true); // to detect click or lost of focus
      
      // registers to keyboard events
      this._keyboardHandlers = this._keyboard.register(this, this._document);
    }
    this._currentModel = aModel;
    this._currentSelection = null; 
    
    // Width/Height adjustments
    try {
          this._menu.adjustHeight(popupDiv, this.MAX_HEIGHT);          
          if (this._menu.isScrollbarInside()) {
            this._menu.adjustWidthToScrollbar(popupDiv);
          }                
      } catch (e) { /* nop */ }
  },

  /**
   * Stops the edition process. Updates the model if this is not a cancel.
   * 
   * @param {boolean}
   *            willEditAgain If true, the device is kept visible and awakened
   *            to events.
   * @param {boolean}
   *            isCancel If true, the model is not updated nor set.
   */
  stopEditing : function (willEditAgain, isCancel) {
    // Safety guard in case of consecutive stops (may arise in case of chaned device, such as with the autocomplete)
    if (!this._currentModel) 
      return;
    
    // Updates the model
    if (!isCancel) {
      if (this.getSelection()) {
        if (this._currentModel.onMenuSelection)
          this._currentModel.onMenuSelection(this.getSelection()); // FIXME: deprecated (update select.js)
        else
          this._currentModel.update(this.getSelection());
      }
    }
    
    // Uninstalls text device
    if (!willEditAgain) { 
      xtdom.removeEventListener(this._document, 'mousedown', this.clickHandler, true);
      this._menu.hide();
      
      // Unregisters to keyboard events
      this._keyboard.unregister(this, this._keyboardHandlers, this._document);
    }
    
    // Sets the editor FIXME deprecated ! (an update should )
    if ((!isCancel) && (this._currentModel.isOptional)
        && (!this._currentModel.isSelected)) {
      if (this._currentModel.setSelectionState)
        this._currentModel.setSelectionState(true);
      else
        this._currentModel.set(); 
    }
    
    // Releases the device
    this._currentModel = null;
  },
  
  /**
   * Cancels the edition process, that is, releases the device without
   * updating the model.
   */ 
  cancelEditing : function() {
    this.stopEditing(false, true);
  },
  
  /**
   * Returns true if the device is in an edition process.
   * 
   * @return {boolean}
   */
  isEditing : function () {
    return this._currentModel ? true : false;
  },
  
  /////////////
  // Getters //
  /////////////

  /**
   * Returns the currently selected item
   * 
   * @return
   */
  getSelection : function() {
    return this._currentSelection;
  },
  
  /**
   * Sets the currently selected item
   * 
   * @param {any}
   */
  setSelection : function(aSelection) {
    this._currentSelection = aSelection;
  },
  
  /**
   * Retruns the 
   * 
   * @return
   */
  getHandle : function () {
    return this._menu.getHandle();
  },
  
  /////////////////////
  // Event listeners //
  /////////////////////

  /**
   * Hnadler for the click event on the document while the popup menu is
   * active (displayed). Catches the event and delegates its actual handling
   * to the popup menu (the object who wraps the HTML structure).
   */
  handleClick : function (ev) {
    this._menu.handleClick(ev, this);
  },
  
  /**
   * Handler for keyboard events. Mainly listen for up and down arrows, escape
   * or return keystrockes.
   * 
   * @param aEvent
   */
  doKeyDown : function (aEvent) {
    switch (aEvent.keyCode) {
    case 38 : // arrow up
      this._menu.selectPrev();
      xtdom.preventDefault(aEvent);
      xtdom.stopPropagation(aEvent);
      break;
    case 40 : // arrow down
      this._menu.selectNext();
      xtdom.preventDefault(aEvent);
      xtdom.stopPropagation(aEvent);
      break;
    default :
      // nope
    }
    this._currentSelection = this._menu.getSelected();
  },
  
  /**
   * Handler for keyboard events. Mainly listen for up and down arrows, escape
   * or return keystrockes.
   * 
   * @param aEvent
   */
  doKeyUp : function (aEvent) {
    // nope
  }
}


/**
 * Utility class to wrap the DOM construction
 *
 * @param {DOMDocument}
 *            aDocument
 */
xtiger.editor.PopupMenu = function(aDocument) {
  
  this._document = aDocument;
  
  
  this._handle = this._createMenuForDoc(aDocument);
  
  
  this._handle.style.visibility = 'hidden';
  
  /*
   * The position (from 0 to length-1) of the selected choice.
   * 
   * If -1, no element is selected
   */
  this._currentSelection = -1;
  
  /**
   * the current options *values* displayed by the menu
   */
  this._options = null;
}

xtiger.editor.PopupMenu.prototype = {

  /**
   * Creates the DOM elements (the handle) to display the choices.
   * 
   * @param {DOMDocument}
   *            aDocument
   * @return {DOMElement}
   */
  _createMenuForDoc : function(aDocument) {
    var body = aDocument.getElementsByTagName('body')[0]; // FIXME: body or BODY ? (use a hook for insertion ?)
    var device = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(device, 'axel-popup-container'); // Must be positioned as absolute in CSS !!!
    body.appendChild(device);
    return device;
  },
  
  /**
   * Creates a &gt;li&lt; element to insert into the popup menu.
   * 
   * @param {any|{value:any,display:InnerHTML}|{section:[...], header: InnerHTML}}
   *            aOption The option value from which build a HTML element. This
   *            value may be of three different kind:
   *            - a single value: the displayed value is returned to the model
   *            when selected.
   *            - a pair display/value: the popup element shows the display
   *            field but returns the value to the model.
   *            - a section (hash): defines a section. The hash contains one mandatory
   *            field, section, which contains an array of option, one optional, header,
   *            which contains a valid html string to use as a section's header.
   * @param {[HTMLElement]}
   *            aOptionsList The list of options for this menu. Passed as
   *            parameter such as option element (li element that are a choice
   *            in the list) can add themselves in that list.
   * @return {HTMLElement} a &lt;li&gt; element to insert in the list
   */
  _createMenuElement: function (aOption, aOptionsList) {
    var _li = xtdom.createElement(this._document, 'li');
    _li.isNestedList = false; // Only true for sub list (as in a segmented list)
    switch (typeof aOption) {
    case 'object' : 
      if (aOption.value && aOption.display) {
        _li.selectionvalue = aOption.value;
        xtdom.addClassName(_li, 'axel-popup-selectable');
        aOptionsList.push(_li);
        try {
          _li.innerHTML = aOption.display;
        }
        catch (_err) {
          xtiger.cross.log('warning', 'The following text is not proper HTML code ' +
              "\n\t" + '"' + aOption.display + '"' + "\n\t" +
              'Cause : ' + _err.message);
          var _text = xtdom.createTextNode(this._document, aOption.display);
          _li.appendChild(_text);
        }
        break;
      }
      else if (aOption.section) { // Nested list (header is optional)
        _li.selectionvalue = null; // No value for a section
        _li.isNestedList = true;
        try {
          _li.innerHTML = '<table class="axel-popup-sublist"><tbody><tr>' +
            '<td class="axel-popup-sublistheader"></td>' + 
            '<td class="axel-popup-sublistbody"><ul style="margin-left:0"></ul></td>' + 
            '</tr></tbody></table>'; // margin-left: for IE8            
          _header = _li.firstChild.firstChild.firstChild.firstChild;
          _body = _header.nextSibling.firstChild;
          if (aOption.header) {
            _header.innerHTML = aOption.header;
          }
          for (var _i = 0; _i < aOption.section.length; _i++) {
            var _subelement = this._createMenuElement(aOption.section[_i], aOptionsList); // Recurse
            _body.appendChild(_subelement);
          }
        }
        catch (_err) {
          xtiger.cross.log('warning', 'The following text is not proper HTML code ' +
              "\n\t" + '"' + aOption.header + '"' + "\n\t" +
              'Cause : ' + _err.message);
          var _text = xtdom.createTextNode(this._document, aOption.display);
          _li.appendChild(_text);
        }
        break;
      }
    case 'string' :
    default:
      _text = xtdom.createTextNode(this._document, aOption);
      _li.selectionvalue = aOption;
      _li.appendChild(_text);
      xtdom.addClassName(_li, 'axel-popup-selectable');
      aOptionsList.push(_li);
    }
    return _li;
  },

  _setPositionXY : function(x, y) {
    with (this._handle.style) {
      left = x + 'px';
      top = y + 'px';
    }
  },

  /**
   * Returns the menu's handle.
   * 
   * @return {HTMLElement} The HTML top container of the popup menu
   */
  getHandle : function() {
    return this._handle;
  },

  ////////////////////////////////////////////////////////////////
  // Methods controlling the appearance of the popup menu device
  ////////////////////////////////////////////////////////////////
  
    // Returns true if the browser displays scroll bars inside their container 
    // false if it adds them outside
    isScrollbarInside : function() {    
      return xtiger.cross.UA.gecko || xtiger.cross.UA.webKit || xtiger.cross.UA.IE;
    },
                                     
  // Detects if there is a scrollbar, adjusts the handle width in case it's inside
  // also adjusts width in case the scrollbar would be out of the window
    adjustWidthToScrollbar : function(n) { 
      var tmp, 
      sbWidth = 20, // scrollbar width (FIXME)
      rightMargin = 10 + sbWidth; // includes potential window scroll bar
      // space we would like to leave to the right of the popup in case it touches the border
      // note that depending on the browser it may include the window scrollbar itself
  
      if (n.scrollHeight > n.clientHeight) { // tests if there is a scrollbar
          // adjusts width so that scrollbar is inside the window
      // also adjusts it so that there is a little space left on the right
          var pos = xtdom.findPos(n);
          var size = xtdom.getWindowLimitFrom(n);             
          var freeV = size[0] - pos[0] - rightMargin;
          tmp = ((n.scrollWidth + sbWidth) < freeV) ? n.scrollWidth + sbWidth : freeV;
          n.style.width = tmp + 'px';
      } 
    // FIXME: we should also adjusts width to apply rightMargin in case there is no scrollbar
    },  
                           
  // Adjusts the height of the handle taking as much space is available till the bottom 
  // of the window or max otherwise
    adjustHeight : function(n, max) { 
      var curMaxH,                     
      bottomMargin = 20,
      newMaxH = max;
      var pos = xtdom.findPos(n);
      var size = xtdom.getWindowLimitFrom(n);             
      var freeH = size[1] - pos[1] - bottomMargin;
    if ((freeH < n.clientHeight) || (n.scrollHeight > n.clientHeight)) { // not engouh space to show all popup
    newMaxH = (freeH > max) ? freeH : max;  // don't go below max height
    newMaxH = newMaxH + 'px';
      curMaxH = n.style.maxHeight || '';
      if (curMaxH != newMaxH) {      
      n.style.maxHeight = newMaxH;
      }    
    }
    },    

  /**
   * Initialize popup menu content with options and creates as many
   * &gt;li&lt; as necessary
   */
  setOptions : function(aOptions, aSelection) {
    this._currentSelection = -1;
    this._options = [];
    this._handle.innerHTML = '<ul style="margin-left:0"></ul>'; // margin-left: for IE8
    for (var _i = 0; _i < aOptions.length; _i++) {
      var _opt = this._createMenuElement(aOptions[_i], this._options);
      if (aSelection && _opt.selectionvalue == aSelection) {
        xtdom.addClassName(_opt, 'selected');
      } else {
        xtdom.removeClassName(_opt, 'selected');
      }
      this._handle.firstChild.appendChild(_opt);
    }
  },

  /** 
   * Position the menu just below the provided handle (an HTML DOM node)
   * 
   * @param aHandle
   */
  setPosition : function(aHandle) {
    var pos = xtdom.findPos(aHandle); // FIXME use another positionment algo
    this._setPositionXY(pos[0], aHandle.offsetHeight + pos[1])
  },

  /**
   * Select the next element in the list
   * 
   * @TODO manage sub lists
   */
  selectNext : function () {
    if (this._currentSelection != -1)
      xtdom.removeClassName(this._options[this._currentSelection], 'selected');
    this._currentSelection++;
    this._currentSelection %= (this._options.length);
    xtdom.addClassName(this._options[this._currentSelection], 'selected');
  },

  /**
   * Select the previous element in the list
   * 
   * @TODO manage sub lists
   */
  selectPrev : function () {
    if (this._currentSelection != -1)
      xtdom.removeClassName(this._options[this._currentSelection], 'selected');
    else
      this._currentSelection = 1;
    this._currentSelection--;
    if (this._currentSelection < 0)
      this._currentSelection = this._options.length - 1;
    xtdom.addClassName(this._options[this._currentSelection], 'selected');
  },
  
  /**
   * Returns the value of the currently selected element, if any. If none,
   * returns false.
   * 
   * @return {string|boolean} The value of the selected element or false if no
   *         element is selected.
   */
  getSelected : function () {
    if (this._currentSelection == -1)
      return false;
    var _sel = this._options[this._currentSelection];
    if (_sel.value)
      return _sel.selectionvalue;
    return _sel.firstChild.data;
  },
  
  /**
   * Shows the popup menu
   */
  show : function() {
    this._handle.style.visibility = 'visible';
  },

  /**
   * Hides the popup menu
   */
  hide : function() {
    this._handle.style.visibility = 'hidden';
  },
   
  /**
   * Analyses the event provided as parameter and returns the selected option
   * as a string if the event is targeted at one of the menu options. Returns
   * false otherwise.
   * 
   * @param {DOMMouseEvent}
   *            aEvent A mouse event to analyse.
   */
  handleClick : function (aEvent, aDevice) {
    // find the first <li> target in event target ancestors chain
    var target = xtdom.getEventTarget(aEvent);
    // xtiger.cross.log('debug', 'peekEvent(' + xtdom.getLocalName(target) + ')');
    while (target.parentNode) {
      if (xtdom.getLocalName(target).toLowerCase() == 'li' && target.selectionvalue) {
        aDevice.setSelection(target.selectionvalue);
        xtdom.preventDefault(aEvent);
        xtdom.stopPropagation(aEvent);
        aDevice.stopEditing(false, false);
        return;
      }
      if (target == this._handle) {
        return; // Do nothing
      }
      target = target.parentNode;
    }
    // Out of the device, stops the event and the edition process
    xtdom.preventDefault(aEvent);
    xtdom.stopPropagation(aEvent);
    aDevice.stopEditing(false, true);
  }
}
