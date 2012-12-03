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
|  AXEL 'documentid' filter                                                   |
|                                                                             |
|  Stores its value into xtiger.session(doc) as "documentId"                  |
|  When used in an invisible part of the template, it allows to generate      |
|  a document identifier that some other plugin can send to the server        |
|  when sending binary data to be associated with the document (e.g. photo)   |
|                                                                             |
|*****************************************************************************|
|  Compatiblity: developed for 'photo' plugin                                 |
|                                                                             |
\*****************************************************************************/

// NOTE: DEPRECATED
// another approach is to configure the plugin to encode the documentid into
// the URL used to POST the data
(function ($axel) {

  _Filter = {
    methods : {
      // Creates the entry for the identifier into the TOC using it's default text
      _setData : function(aData) {
        this.__documentId___setData(aData);
        xtiger.session(this.getDocument()).save('documentId', aData);
      }
    }
  };

  $axel.filter.register(
    'documentId',
    { chain : ['_setData'] },
    null,
    _Filter);
  $axel.filter.applyTo({'documentId' : 'text'});
}($axel));
