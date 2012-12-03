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
|  AXEL 'event' filter                                                        |
|                                                                             |
|  Sends event on some plugin method calls                                    |
|  To be used to create user interactions not supported natively with AXEL    |
|  for instance in conjunction with the $axel wrapped set                     |
|                                                                             |
|*****************************************************************************|
|  Prerequisite: jQuery                                                       |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Filter = {

    methods : {
      update : function (aData) {
        this.__event__update(aData);
        // triggers 'axel-update' event
        $(this.getHandle()).trigger('axel-update', this);
      }
    }
  };

  $axel.filter.register(
    'event',
    { chain : [ 'update'] },
    null,
    _Filter);
  $axel.filter.applyTo({'event' : 'text'});
}($axel));
