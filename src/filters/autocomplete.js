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
 * Author(s) : Antoine Yersin, Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * 
 * 
 * This static object is a shared front-end for the AutocompleteDevice. It acts as a
 * Filter, that is, it allows the implementation of additional behaviors for the
 * functions it declares.
 */
var _AutocompleteFilter = (function _AutocompleteFilter () {
  
  return {
    
    '->': {
      'init' : '__autocompleteSuperInit',
      'update': '__autocompleteSuperUpdate',
      'startEditing': '__autocompleteSuperStartEditing'
    },
    
    /**
     * <p>
     * Inits as usual and gets the instance of an autocomplete device
     * </p>
     * 
     * @param aDefaultData
     * @param aParams
     * @param aOption
     * @param aUniqueKey
     */
    init: function init (aDefaultData, aParams, aOption, aUniqueKey) {
      this.__autocompleteSuperInit(aDefaultData, aParams, aOption, aUniqueKey);
      this._autocompleteDevice = xtiger.editor.AutocompleteDevice.getInstance(this.getDocument()).
                                    validateParameters(this);
    },
    
    /**
     * If the device is initialized with an autocomplete device, releases it
     * on update action
     * 
     * @param {string} aData
     */
    update : function update (aData) {
      this.__autocompleteSuperUpdate(aData);
      // Prevents the usual device to update against a completion. Otherwise it may overwrites the completion.
      this._device.cancelEditing();
      if (this._autocompleteDevice)
        this._autocompleteDevice.release();
    },
    
    /**
     * On the start of an editing process, after grabbing the edition
     * device, grabs the autocomplete device.
     * 
     * @param {DOMEvent}
     *            aEvent
     */
    startEditing: function startEditing (aEvent) {
      this.__autocompleteSuperStartEditing(aEvent);
      if (this._autocompleteDevice)
        this._autocompleteDevice.grab(this._device, this._device.getHandle());
    },
    
    /**
     * <p>
     * Hook to be called as the device recieves a keyup keyboard event.
     * </p>
     * 
     * @see TextDevice#doKeyUp()
     */
    onkeyup: function () {
      if (this._autocompleteDevice)
        this._autocompleteDevice.onKeyUp();
    }
  } 
})();

xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('autocomplete', _AutocompleteFilter);
