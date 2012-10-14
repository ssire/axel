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

/*****************************************************************************\
|                                                                             |
|  AXEL 'optional' filter                                                     |
|                                                                             |
|  Only serializes data to XML if it is different from the default data       |
|                                                                             |
|*****************************************************************************|
|  Prerequisite: none                                                         |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Filter = {
    
    onSave : function (aLogger) {
      if (this.isModified()) {
        this.__optional__onSave(aLogger);
      } else {
        aLogger.discardNodeIfEmpty();
      }
    }
  };

  $axel.filter.register(
    'optional', 
    { chain : [ 'onSave'] },
    null,
    _Filter);
  $axel.filter.applyTo({'optional' : 'text'});
}($axel));
