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
|  Menu device that appears on above a DOM node (img, div, etc.)              |
|    the menu is populated with commands / callbacks presented as <button>    |
|    one shared menu instance per-document should be sufficient in most cases |
|    style with div.axel-tracker-menu                                         |
|    depends on jQuery                                                        |
|                                                                             |
\*****************************************************************************/
(function(){    
  
  function trackerMenu (aDocument, aSpec) {
    var self = this, 
        i, key, label, cur, wrapper;

    function execCommandCb (ev) {
      if (self.targetModel !== undefined) {
        self.commands[ev.data][0].call(self.targetModel);
      }   
    }
  
    function moveCb (ev) {        
      var wrapped, pos, right, bottom;
      if (self.targetNode) {
        wrapped = $(self.targetNode);
        pos = wrapped.offset(); 
        if (pos) {
          right = pos.left +  wrapped.width();
          bottom = pos.top +  wrapped.height();
          if ((ev.pageX > right) || (ev.pageX < pos.left)
            || (ev.pageY < pos.top) || (ev.pageY > bottom))
          {
            self.stopEditing();
          }
        } else {
          xtiger.cross.log('debug', '[Tracker menu] moveCb cannot find position for element');
        }
      } else {
        xtiger.cross.log('debug', '[Tracker menu] calling move with no target');
      }
    }       
    
    this.targetModel = undefined; // the current editor beeing tracked
    this.targetNode = undefined; // the current DOM node beeing overlaid
    
    // menu view construction
    this.commands = {}; // { command name : [callback, button] } associations
    this.menuDiv = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(this.menuDiv, 'axel-tracker-menu');
    wrapper = $(this.menuDiv);
    for (i = 0; i < aSpec.length; i++) {
      // FIXME: create row for buttons
      for (key in aSpec[i]) { 
        label = aSpec[i][key][0];
        cur = xtdom.createElement(aDocument, 'button');
        this.menuDiv.appendChild(cur);
        $(cur).text(label).bind('click', key, execCommandCb);
        this.commands[key] = [aSpec[i][key][1], cur, true]; // do not memorizes label  
        // ['command name' ,<button> , enable/disable (true or false)]
      }     
    }           
    wrapper.appendTo($('body', aDocument));
    this.menuWidth = wrapper.width();
    this.menuHeight = wrapper.height();
    wrapper.hide();
    
    this.startEditing = function (aModel, aDomNode, aState) {     
      var key;
      var wrapped = $(aDomNode);
      var pos = wrapped.offset();      
      this.targetModel = aModel;  
      this.targetNode = aDomNode;
      $('body', aModel.getDocument()).bind('mousemove', moveCb);
      // centers and show this.menuDiv above aDomNode
      $(this.menuDiv).css({ 
        'top' : pos.top + (wrapped.height() / 2) - (this.menuHeight / 2), 
        'left' : pos.left + (wrapped.width() / 2) - (this.menuWidth / 2)
        }).show();
      // sets initial button state: aState MUST have one entry per-command/button !
      for (key in aState) {
       aState[key] ? this.enable(key) : this.disable(key);
      }
    };

    this.stopEditing = function () {
      if (this.targetModel) { // sanity check (e.g. if called as a consequence of tab key navigation)
        $('body', this.targetModel.getDocument()).unbind('mousemove', moveCb);
        this.targetModel = undefined;
        this.targetNode = undefined;
        $(this.menuDiv).hide();
      }                        
    };
  }
  
  trackerMenu.prototype = {  
    isTracking : function () {
      return (this.targetModel !== undefined);
    },
    // disable button corresponding to command name
    disable : function (command) { 
      if (this.commands[command][2]) {
        this.commands[command][1].disabled = true;
        $(this.commands[command][1]).addClass('off');
        this.commands[command][2] = false;
      }
    },
    // enable button corresponding to command name
    enable : function (command) {               
      if (this.commands[command][2] === false) {
        this.commands[command][1].disabled = false;  
        $(this.commands[command][1]).removeClass('off');
        this.commands[command][2] = true;
      }
    }
  };

  // expose as xtiger.editor.TrackerMenu
  xtiger.editor.TrackerMenu = trackerMenu;  
  
})();