/* AXEL 'optional' filter
 *
 * author      : Stéphane Sire
 * contact     : s.sire@oppidoc.fr
 * license     : proprietary (this is part of the Oppidum framework)
 *
 * August 2012 - (c) Copyright 2012 Oppidoc SARL. All Rights Reserved.
 */

(function () {
  
  var _OptionalFilter =  {

    ///////////////////////////////////////////////////
    /////     Instance Clear Mixin Part    ////////
    ///////////////////////////////////////////////////

    // Property remapping for chaining
    '->': {
     'save' : '__OptionalSuperSave'
    },   

    save : function (aLogger) {
      if (this.isModified()) {
        this.__OptionalSuperSave(aLogger);
      } else {
        aLogger.discardNodeIfEmpty();
      }
    }

  };

  // Do not forget to register your filter on any compatible primitive editor plugin
  xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('optional', _OptionalFilter);
  // FIXME: asynchronous mechanism to register filter to other plugins (e.g. 'input')
  if (! window.axeltmptrick) {
    window.axeltmptrick = {};
  }
  window.axeltmptrick['_OptionalFilter'] = _OptionalFilter;
}());
