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

// open issue: should we create one keyboard instance per document or not ?

/**
 * Centralizes keyboard input among several input devices (e.g. each <input> or <textarea>)
 * This is useful in particular to factorize the tab management code
 */
xtiger.editor.Keyboard = function () {
  this.tabGroupManager = false;
  this.currentDevice = false;
  this.allowRC = false;
}

// FIXME: dans register memoriser tous les abonnements pour les desabonner sur une method (reset)
// à appeler quand on change de document // frame (?)
xtiger.editor.Keyboard.prototype = {

  setTabGroupManager : function (t) {
    this.tabGroupManager = t;
  },

  // Allows device aDevice to register to keyboard events on its handle
  // The optional aAltHandle will be used to listen to DOM keyboard events
  // otherwise it will be the device's default handle (device.getHandle())
  // Returns an handlers object to be recalled for unregister
  register : function (aDevice, aAltHandle) {
    var _handle = aAltHandle ? aAltHandle : aDevice.getHandle();

    // closure variables
    var _this = this;
    var _device = aDevice;

    var _handlers = {
        keydown: function (ev) { _this.handleKeyDown(ev, _device) },
        keyup: function (ev) { _this.handleKeyUp(ev, _device) }
    }
    xtdom.addEventListener(_handle, 'keydown', _handlers.keydown, false);
    xtdom.addEventListener(_handle, 'keyup', _handlers.keyup, false);
    return _handlers;
  },

  unregister : function (aDevice, handlers, aAltHandle) {
    var _handle = aAltHandle ? aAltHandle : aDevice.getHandle();
    xtdom.removeEventListener(_handle, 'keydown', handlers.keydown, false);
    xtdom.removeEventListener(_handle, 'keyup', handlers.keyup, false);
  },

  // Esc does not trigger keyPress on Safari, hence we need to intercept it with keyDown
  handleKeyDown : function (ev, device) {
    var validate;
    if (device.isEditing()) {
      if (this.tabGroupManager && this.tabGroupManager.filterKeyDown(ev)) {
        return false;
      }
      // On FF ctrlKey+ RC sends an event but the line break is not added to the textarea hence I have selected shiftKey
      if (ev.keyCode === 13) {
        if ((!this.allowRC) || (this.allowRC && (! this.noBlurOnRC) && (! ev.shiftKey))) {
          validate = true;
        }
      }
      if (validate) {
        device.stopEditing(false);
        xtdom.preventDefault(ev); /* avoid triggering buttons in IE (e.g. Save button) */
      } else if (ev.keyCode == 27) {
        device.cancelEditing ();
      }
      device.doKeyDown (ev);
    }
    return true;
  },

  handleKeyUp : function (ev, device) {
    if (device.isEditing()) {
      if (this.tabGroupManager && this.tabGroupManager.filterKeyPress(ev)) {
        xtdom.preventDefault(ev);
        xtdom.stopPropagation(ev);
        return false;
      } else {
        device.doKeyUp (ev);
      }
    }
    return true;
  },

  grab : function (device, editor) {
    if (this.tabGroupManager) {
      this.tabGroupManager.startEditingSession (editor);
    }
  },

  release : function (device, editor) {
    if (this.tabGroupManager) {
      this.tabGroupManager.stopEditingSession ();
    }
  },

  enableRC : function (noBlurOnRC) {
    this.allowRC = true;
    this.noBlurOnRC = noBlurOnRC || false;
  },

  disableRC : function () {
    this.allowRC = false;
    this.noBlurOnRC = false;
  }
}
