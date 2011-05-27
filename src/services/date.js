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

var _DateService  = (function () {   
  
  var _broadcastDate = function(what, that, date, h) {
    var token = '(' + what + ')';
    that._broadcast('Day' + token, date.Day, h);            
    that._broadcast('Month' + token, date.Month, h);            
    that._broadcast('Year' + token, date.Year, h);            
  }   
  
  var _fullDate = function(date) {
    return (date.Day && date.Month && date.Year);
  }                                                
  
  var _copyDate = function(from, to) {
    to.Day = from.Day;
    to.Month = from.Month;
    to.Year = from.Year;
  }
  
  var _dumpDate = function (date) {
    xtiger.cross.log('debug', date.Day + '/' + date.Month + '/' + date.Year);
  }
  
  var _before = function(begin, end) {                                           
    return _fullDate(begin) && _fullDate(end) &&
        ((begin.Year < end.Year) ||
          ((begin.Year == end.Year) &&
              ((begin.Month < end.Month) ||
              ((begin.Month == end.Month) && 
                (begin.Day < end.Day)))));
  }      
  
  var _parseResourceKey = function(aKey, accu) {
    var m = aKey.match(/^(Day|Month|Year)\(?(floor|ceiling|referent)?\)?/);
    if (m)  {
      accu.key = m[1];
      accu.condition = m[2];
      return true;
    }   
    return false;   
  }     
  
  var _parseInt = function(s, def) {
    var res = parseInt(s);
    return isNaN(res) ? def : res;
  } 
  
  return {      

    /**
     * Remap property
     */
    '->': {
        'init' : '__dateSuperInit'
          },
    
    init: function (aType, aDefaultData, aKey, aParams) {      
      var defDate, day, month, year, tmp;
      this.__dateSuperInit.apply(this, arguments);
      defDate = this.getParam('date_default') || "1 1 2010";  // Day Month Year
      tmp = defDate.split(' ');
      day = _parseInt(tmp[0], 1);
      month = _parseInt(tmp[1], 1);
      year = _parseInt(tmp[2], 2010);
      this._floor = {'Day' : day, 'Month': month, 'Year': year};
      this._ceiling = {'Day' : day, 'Month': month, 'Year': year};
      this.__key = aKey;    
    },  
     
    notifyUpdate : function (aProducer, aResource, aData) {  
      var accu = {}; 
      if (_parseResourceKey(aResource, accu)) {
          if (accu.condition == 'floor') {
          // stores floor value, triggers ceiling update if necessary
          this._floor[accu.key] = parseInt(aData);
          if (_before(this._ceiling, this._floor)) {
            _copyDate(this._floor, this._ceiling);
              // updates ceiling as it will not be updated through broadcast (short circuit)
            _broadcastDate('ceiling', this , this._floor, this.getHandle());
          }
        } else if (accu.condition == 'ceiling') {
          // stores ceiling value, triggers floor update if necessary
          this._ceiling[accu.key] = parseInt(aData);
          if (_before(this._ceiling, this._floor)) { 
            _copyDate(this._ceiling, this._floor);
              // updates floor as it will not be updated through broadcast (short circuit)
            _broadcastDate('floor', this, this._ceiling, this.getHandle());
          }
        }
      }
    }, //  -notifyUpdate
         
    notifyLoad : function (aProducer, aResource, aData) {  
      var accu = {}; 
      if (_parseResourceKey(aResource, accu) && (accu.condition == 'floor')) {  
        this._floor[accu.key] = parseInt(aData);          
      } else if (accu.condition == 'ceiling') {
        this._ceiling[accu.key] = parseInt(aData);          
      }
    }
    
  }

})(); 

xtiger.factory('service').registerDelegate('date', _DateService);

