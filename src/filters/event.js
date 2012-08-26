/* AXEL 'event' filter
 *
 * author      : Stéphane Sire
 * contact     : s.sire@oppidoc.fr
 * license     : proprietary (this is part of the Oppidum framework)
 *
 * August 2012 - (c) Copyright 2012 Oppidoc SARL. All Rights Reserved.
 */

/**
 * Class _EventFilter (mixin filter)
 *
 */
var _EventFilter  = (function _EventFilter () {

  var _EventFilter =  {

    ///////////////////////////////////////////////////
    /////     Instance Clear Mixin Part    ////////
    ///////////////////////////////////////////////////

    // Property remapping for chaining
    '->': {
     'update' : '__EventSuperUpdate'
    },   

    update : function (aData) {
      this.__EventSuperUpdate(aData);
      // 4. triggers completion event
      $(this.getHandle()).trigger('axel-update', this);
    }

  };
  
  // Do not forget to register your filter on any compatible primitive editor plugin
  xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('event', _EventFilter);
  // FIXME: asynchronous mechanism to register filter to other plugins (e.g. 'input')
  if (! window.axeltmptrick) {
    window.axeltmptrick = {};
  }
  window.axeltmptrick['_EventFilter'] = _EventFilter;
  
}());
