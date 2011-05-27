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

/*
 * DocumentId stores its value into xtiger.session(doc) as "documentId"
 * When used in an invisible part of the template, this allows to generate a document identifier 
 * which can be used by some primitive plugin editors to communicate with a server (e.g. Photo upload)
 */
var _DocumentIdFilter = (function _DocumentIdFilter() {

  /////////////////////////////////////////////////
  /////    Static DocumentId Mixin Part     ///////
  ///////////////////////////////////////////////// 

  // none

  return {

    ///////////////////////////////////////////////////
    /////     Instance DocumentId Mixin Part    ////////
    ///////////////////////////////////////////////////

    // Property remapping for chaining
    '->' : {
      '_setData' : '__DocumentIdSuperSetData'
    },

    /** Creates the entry for the identifier into the TOC using it's default text  
     *  DOES forward call.
     */
    _setData : function(aData) {
      this.__DocumentIdSuperSetData(aData);
      xtiger.session(this.getDocument()).save('documentId', aData);
    }
  
    /** add any other method from the filtered object that you want to override */
  
    /** add any other method you want to add to the filtered object to be called with can() / execute() */

  };

})();

//Register this filter as a filter of the 'text' plugin (i.e. text.js must have been loaded)
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter(
    'documentId', _DocumentIdFilter);