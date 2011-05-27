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

var _CopyService  = (function () {    

  return {      

    /**
     * Remap property
     */
    '->': {'onBroadcast': '__copySuperBroadcast'},

    onBroadcast : function (aModel, aResource, aData) {
      aModel.update(aData, true); // true to avoid reemitting update event
      this.__copySuperBroadcast(aModel, aResource, aData); // chains service
    }
  }

})(); 

xtiger.factory('service').registerDelegate('copy', _CopyService);

var _CopyCondService  = (function () {      
      
  // Only copies aData to consumers subscribed to service with a resource key 
  // similar to "aResourceKey(floor)" or "aResourceKey(ceiling)" and if they meet the condition
  var _testAndCopy = function(aDelegate, aProducer, aResource, aDataAsNumber, aModel) {
    var cur;
    if (aModel == aProducer) {
      return; // no need to test the producer itself
    }
    if (aModel.checkServiceKey(aDelegate.getKey(), aResource + '(floor)')) {
      cur = parseInt(aModel.getData()); 
      if (isNaN(cur) || (aDataAsNumber < cur)) {
        aModel.update(aDataAsNumber.toString(), true); // true to avoid reemitting update event
      }
    } else if (aModel.checkServiceKey(aDelegate.getKey(), aResource + '(ceiling)')) { 
      cur = parseInt(aModel.getData()); 
      if(isNaN(cur) || (aDataAsNumber > cur)) {
        aModel.update(aDataAsNumber.toString(), true); // true to avoid reemitting update event
      }
    } // ignores other keys
  }

  return {      

    /**
     * Remap property
     */
    '->': {},
    
    notifyUpdate : function (aProducer, aResource, aData) {         
      var newVal = parseInt(aData);
      if (! isNaN(newVal)) {
        this._apply(aProducer, aResource, newVal, this.getHandle(), _testAndCopy);
      }
    }
  }

})(); 

xtiger.factory('service').registerDelegate('copycond', _CopyCondService);