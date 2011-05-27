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

var _BoundaryService  = (function () {   
  
  var _storeKey : function(store, k1,k2,v) {
    if (! store[k1])  store[k1] = {};
    store[k1][k2] = value;
  }
  
  return {      

    /**
     * Remap property
     */
    '->': {'init' : '__boundarySuperInit', 
        'onBroadcast': '__boundarySuperBroadcast'},
    
    init: function (aType, aDefaultData, aKey, aParams) {
      this.boundarySuperInit(arguments);
      this._floor = {};
      this._ceiling = {};
      this._referent = {};
    },  
     
    notifyUpdate : function (aProducer, aResourceKey, aData) {  
      var key1, key2, condition,
        m = aResourceKey.match(/^([^\.]+)\.([^\(\.]*)\(floor|ceiling\)?/);
        // matches key1 or key1.key2 or key1(floor|ceiling) or key1.key2(floor|ceiling)
      if (m) {
        key1 = m[1];      
        key2 = (m[2] && (m[2].length > 0)) ? m[2] : '$';
        condition = m[4];
        if (! condition) {
          // stores reference value
          _storeKey(this._referent, key1, key2, aData);
        } else if (condition == 'floor') {
          // stores floor value, triggers referent update if smaller
          _storeKey(this._floor, key1, key2, aData);          
          for (var k in this._floor) {
            
          }
        } else if (condition == 'ceiling') {
          _storeKey(this._ceiling, key1, key2, aData);          
          
        }
      }
      
        

      if (/(floor)/.test(aResourceKey) {
        
        if (_floor after _referent) {                           
          _dispatch(_floor);
          if (_floor[Day])  this._broadcast ('Day', aData, this.getHandle());
          if (_floor[Month])  this._broadcast ('Month', aData, this.getHandle());
          if (_floor[Year])   this._broadcast ('Year', aData, this.getHandle());
        }
      } else if (/(ceil)/.test(aResourceKey) {
        // store _ceil{Day/Year/Month}
        if (_floor before _referent) {
          this._broadcast ('Day', aData, this.getHandle());
          this._broadcast ('Month', aData, this.getHandle());
          this._broadcast ('Year', aData, this.getHandle());
        }
      } else {          
          // store _referent{Day/Year/Month}
      } 
    }
  }

})(); 

xtiger.factory('service').registerDelegate('boundary', _BoundaryService);

