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

/**
 * <p>
 * This object acts as a filter on model's instances (formerly named editors).
 * It catches calls made on the filtered method to add some behavior. Here the
 * behavior is to notify the relevant service with updates.
 * </p>
 * 
 * <p>
 * As this object is used in a delegation pattern, model's instances that are
 * filtered still appear as "usual" instances. That is, their external aspect is
 * kept unchanged
 */
var _CapitalizeService  = (function () {    

  return {      

    /**
     * Remap property
     */
    '->': {'onBroadcast': '__capitalizeSuperBroadcast'},
                               
    onBroadcast : function (aModel, aResource, aData) {
      this.__capitalizeSuperBroadcast(aModel, aResource, aData.toUpperCase());
    }
  }
  
})();

xtiger.factory('service').registerDelegate('capitalize', _CapitalizeService);
