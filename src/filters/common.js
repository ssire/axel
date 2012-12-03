/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

(function ($axel) {

  /*****************************************************************************\
  |                                                                             |
  |  AXEL 'noxml' filter                                                        |
  |                                                                             |
  |  Prevents a plugin from generating XML output                               |
  |                                                                             |
  |*****************************************************************************|
  |  Prerequisites: none                                                        |
  |                                                                             |
  \*****************************************************************************/
  var _NoXMLFilter = {

    onLoad : function (point, dataSrc) {
      // do not load
    },

    onSave : function (text) {
      // do not save
    }
  }

  $axel.filter.register('noxml', null, null, _NoXMLFilter);
  $axel.filter.applyTo({ 'noxml' : ['text', 'select'] });

  // TBD : 'hidden' filter (forces handle's style to display:'none')    
}($axel));



