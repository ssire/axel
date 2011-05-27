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
 * Class TranslateService
 * 
 * @class TranslateService
 * @version beta
 */
xtiger.service.TranslateService = (function _TranslateService () {   
  
    /*
   * Default parameters for the suggest
   */
  var _DEFAULT_PARAMS = {              
    translate_from : 'en',
    translate_to: 'fr'
  };    
  
  var _tmpDiv = document.createElement('div'); // trick to convert character entities
  
  var _encodeParameters = function _encodeParameters(p) {
    var k, buffer;                
    for (var k in p) {  
      if (buffer) {
        buffer = buffer + '&';
      } else {
        buffer = '';
      }
      buffer = buffer + k + '=' + encodeURI(p[k]);
    }
    return buffer;
  };
      
  return {
    '->': {
    },
    
    ///////////////////////
    // Delegated method 
    // ---
    // Initialization
    ///////////////////////
    
    //////////////////////////////////////////////
    // Delegated methods 
    // ---
    // Service Producer Methods (notification)                  
    //////////////////////////////////////////////
    
    /**
     * Changes the default service notification mechanism to an asynchronous one
     * querying Google Translate for translation.
     *
     * See also GenericService in xtiger.service.ServiceFactory 
     */
    notifyUpdate: function notifyUpdate (aModel, aResourceKey, aData) {
      var _url = 'https://www.googleapis.com/language/translate/v2',
        _from = this.getParam('translate_from') || _DEFAULT_PARAMS['translate_from'],
        _to = this.getParam('translate_to') || _DEFAULT_PARAMS['translate_to'],
        _params = _encodeParameters({   
          key : 'AIzaSyAxqZRlgoIS7mIncwX8ykz5YAkKHPStoSs',
          v : '2.0',
          q : aData,
          source : _from,
          target : _to,
          callback : 'translateText'
        }),
        _getUrl = _url + '?' + _params,    
        _this = this,
        _resource = aResourceKey,
          _xhr = xtiger.cross.getXHRObject(),
        _warning;                                                                                  
        
            // From http://code.google.com/intl/fr-FR/apis/language/translate/v2/getting_started.html#JSONP
      window.translateText = function (response) {           
        _tmpDiv.innerHTML = response.data.translations[0].translatedText;
        _this._broadcast(_resource, _tmpDiv.innerHTML, _this.getHandle());
      }
      var newScript = document.createElement('script');
      newScript.type = 'text/javascript';
      newScript.src = _getUrl;
      // When we add this script to the head, the request is sent off.
      document.getElementsByTagName('head')[0].appendChild(newScript);        
    }        
    
    /**
     * Performs a single broadcast to the given model (consumer). Usually called by the
     * model itself when added by a repeat.
     * 
     */
     // askUpdate : function askUpdate (aConsumer, aResourceKey) {    
     // },
    
    /**
     * See also GenericService in xtiger.service.ServiceFactory 
     *
     */
    // notifyRemove: function notifyRemove (aProducer, aResourceKey, aData) {
    // },
    
    //////////////////////////////////////////////
    // Delegated methods 
    // ---
    // Service Consumer Method
    //////////////////////////////////////////////
    
    /**
     * Translate service must be used in conjunction with a servive 
     * implementing an onBroadcast method to actually do something 
     * with the translation, hence onBroadcast is undefined.
     */
    // onBroadcast: function onBroadcast (aConsumer, aResourceKey, aData) {
    //      }
  }
})();

xtiger.factory('service').registerDelegate('translate', xtiger.service.TranslateService);    


// notifyUpdate: function notifyUpdate (aModel, aResourceKey, aData) {
//  var _url = 'http://ajax.googleapis.com/ajax/services/language/translate',
//    _from = this.getParam('translate_from') || _DEFAULT_PARAMS['translate_from'],
//    _to = this.getParam('translate_to') || _DEFAULT_PARAMS['translate_to'],
//    _params = _encodeParameters({
//      v : '1.0',
//      q : aData,
//      langpair : _from + '|' + _to
//    }),
//    _getUrl = _url + '?' + _params,    
//    _this = this,
//    _resource = aResourceKey,
//      _xhr = xtiger.cross.getXHRObject(),
//    _warning;
//  
//  // _xhr.open('GET', _getUrl, true); // requests are always async
//  _xhr.open('GET', "http://localhost:8080/ajax/services/language/translate?v=1.0&q=You%20are%20an%20extraordinary%20man&langpair=en|fr", true); // requests are always async
//  _xhr.setRequestHeader('Origin', 'http://www.my-ajax-site.com');
//  _xhr.onreadystatechange = function () {
//    var _res;
//    if (_xhr.readyState == 4) {
//      if (_xhr.status == 200) {
//        _res = JSON.parse(_xhr.responseText);
//        if (_res.responseStatus == '200') {
//          _this._broadcast(_resource, _res.responseData.translatedText, _this.getHandle());   
//          // Sample response :
//          // {"responseData": {"translatedText":"Bonjour tout le monde"}, "responseDetails": null, "responseStatus": 200}
//          // API Key stsire@gmail.com
//          // AIzaSyAxqZRlgoIS7mIncwX8ykz5YAkKHPStoSs
//        } else {
//          _warning = 'wrong translation status ' + _res.responseStatus + ' in response';
//        }
//      }
//      else {
//        _warning = 'wrong translation status ' + _xhr.status + ' in XHR callaback';
//      }
//    }
//  }
//  try {
//    _xhr.send(null);
//  } catch (e) {                                                                                                   
//    _warning = e.name + '(' + e.message + ')';
//  }                                                                   
//  if (_warning) {
//    xtiger.cross.log('warning', 'Translation service says ' + _warning);
//     }
// }
