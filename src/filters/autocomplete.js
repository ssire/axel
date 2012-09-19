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


/*****************************************************************************\
|                                                                             |
|  AXEL 'autocomplete' filter                                                 |
|                                                                             |
|  Acts as a front-end for the AutocompleteDevice                             |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: uses 'autocomplete' device                                  |
|                                                                             |
\*****************************************************************************/
(function ( $axel ) {

  var _AutocompleteFilter = {
    '->': {
      'onInit' : '__acf__onInit',
      'update': '__acf__update',
      'startEditing': '__acf__startEditing'
    },
    
    // Stores an instance of an autocomplete device
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      this.__acf__onInit(aDefaultData, anOptionAttr, aRepeater);
      this._autocompleteDevice = 
        xtiger.editor.AutocompleteDevice.getInstance(this.getDocument()).validateParameters(this);
    },
    
    update : function update ( aData ) {
      this.__acf__update(aData);
      // prevents the usual device to update against a completion, otherwise it may overwrites the completion
      this._device.cancelEditing();
      if (this._autocompleteDevice) {
        this._autocompleteDevice.release();
      }
    },
    
    startEditing: function startEditing (aEvent) {
      this.__acf__startEditing(aEvent);
      if (this._autocompleteDevice) {
        this._autocompleteDevice.grab(this._device, this._device.getHandle());
      }
    },
    
    // Relays keyup from the text device to the autocomplete device
    onkeyup: function () {
      if (this._autocompleteDevice) {
        this._autocompleteDevice.onKeyUp();
      }
    }
  };
  
  $axel.filter.register('autocomplete', _AutocompleteFilter);
}($axel));
