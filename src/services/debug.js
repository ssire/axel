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

var _DebugService  = (function () {    

  return {      

    /**
     * Remap property
     */
    '->': {                             
          // configuration method
        'configure': '__debugSuperConfigure', 
        // Producer notification methods  
        'notifyLoad': '__debugSuperNotifyLoad', 
        'notifyUpdate': '__debugSuperNotifyUpdate', 
        'askUpdate': '__debugSuperAskUpdate',
        'notifyRemove': '__debugSuperNotifyRemove',
        // Consumer callback method       
        'onBroadcast': '__debugSuperOnBroadcast'
        },

    configure : function (aConfigurator, aResource, aData) {
      xtiger.cross.log('debug', 'configure[' + aResource + '] => ' + aData);
      this.__debugSuperConfigure(aConfigurator, aResource, aData);
    },      
    
    notifyLoad : function (aProducer, aResource, aData) {
      xtiger.cross.log('debug', 'notifyLoad[' + aResource + '] => ' + aData);
      this.__debugSuperNotifyLoad(aProducer, aResource, aData);
    },    

    notifyUpdate : function (aProducer, aResource, aData) {
      // var k = aProducer.getKey();
      xtiger.cross.log('debug', 'notifyUpdate[' + aResource + '] => ' + aData);
      this.__debugSuperNotifyUpdate(aProducer, aResource, aData);
    },

    askUpdate : function (aConsumer, aResource) {
      // var k = aProducer.getKey();
      xtiger.cross.log('debug', 'askUpdate[' + aResource + ']');
      this.__debugSuperAskUpdate(aConsumer, aResource);
    },

    notifyRemove : function (aProducer, aResource, aData) {   
      // var k = aProducer.getKey();
      xtiger.cross.log('debug', 'notifyRemove[' + aResource + '] => ' + aData);
      this.__debugSuperNotifyRemove(aProducer, aResource, aData);
    },
    
    onBroadcast : function (aConsumer, aResource, aData) {
      // var k = aProducer.getKey();
      xtiger.cross.log('debug', 'onBroadcast[' + aResource + '] => ' + aData);
      this.__debugSuperOnBroadcast(aConsumer, aResource, aData);
    }     
  }

})(); 

xtiger.factory('service').registerDelegate('debug', _DebugService);
