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
 * Class SuggestService
 * 
 * @class SuggestService
 * @version beta
 */
xtiger.service.SuggestService = (function _SuggestService () {   
  
  /*
   * Default parameters for the suggest
   */
  var _DEFAULT_PARAMS = {              
    'suggest_limit' : 8
  } 
  
  /**
   * The Suggester class wraps the DOM construct displaying suggests to the user
   */
  var _Suggester = function _Suggester (aModel) {
    
    /**
     * The model to update when a suggest is selected
     */
    this._targetmodel = aModel;
    
    /**
     * The model's handle
     */
    this._modelhandle = this._targetmodel.getHandle();
    
    /**
     * A reference to the document
     */
    this._document = this._modelhandle.ownerDocument;
    
    /**
     * The suggester's handle
     */
    this._handle;
    
    /**
     * The popup device used to display the list of suggestions
     */
    this._popupdevice;
    
    /**
     * The list of suggestions currently hold
     */
    this._suggests;
  };
  
  _Suggester.prototype = {
      
      /**
       * Inits the suggester instance. Builds the HTML element and awakes
       * it for events.
       * 
       * The suggester's handle is inserted automatically as the next
       * sibling of the associated model's handle.
       */
      init: function () {
    
        // Creates the handle and insert it
        this._handle = xtdom.createElement(this._document, 'img');
        with (this._handle) {
          src = xtiger.bundles.service_suggest.light_on;
          height = 20;
          width = 20;
          style.height = 20;
          style.width = 20;
        }
        this._handle.xttSuggestServiceHandle = this; // Self-reference
        if (this._modelhandle.nextSibling)
          this._modelhandle.parentNode.insertBefore(this._handle, this._modelhandle.nextSibling);
        else
          this._modelhandle.parentNode.appendChild(this._handle);

        // Inits and clears the suggests array
        this._suggests = [];
        
        // Lazilly creates the popup device
        var _devKey = 'popupdevice';
        this._popupdevice = xtiger.session(this._document).load(_devKey);
        if (! this._popupdevice) {
          this._popupdevice = new xtiger.editor.PopupDevice(this._document);
          xtiger.session(this._document).save(_devKey, this._popupdevice);
        }
        
        // Registers the click listener
        var _this = this;
        xtdom.addEventListener(this._handle, 'click', function (_ev) {_this.onClick(_ev)}, true);
      },
      
      /**
       * Updates the suggestions list for *this* suggester
       * 
       * @param {{forkey1:values;forkey2:values;...}}
       *            aSuggests An hash of values sorted by "for keys" (for
       *            segmentation purposes). Values are array of atomic values.
       *            A value may either be a simple value (string, int, ...) or
       *            a tuple display/value.
       */
      update: function (aSuggests) {                                
        this._handle.src = xtiger.bundles.service_suggest.light_on;
        this._suggests = []; // update receives each time the whole authoritative suggestion list
        for (_fk in aSuggests) {
          this._suggests.push({header: _fk.match(/^\w+\:(.*)/)[1], section: aSuggests[_fk]})
        }
      },
      
      /**
       * Shows the light
       */
      display: function () {
        this._handle.style.display = 'inline'; 
      },
      
      /**
       * Hides the light
       */
      hide: function () {
        this._handle.style.display = 'none'; 
      },
      
      /**
       * Handles a click on the "light" (the suggester's handle)
       * 
       * @param aEvent
       */
      onClick: function (aEvent) {
        this._handle.src = xtiger.bundles.service_suggest.light_off;
        if (this._suggests.length > 0) {
          this._popupdevice.startEditing(this._targetmodel, this._suggests, null, this._modelhandle)
        }
      }
  } // END of _Suggester
  
  
  /**
   * Implements the communication protocol
   */
  var _prepareRequest = function _prepareRequest (aServiceURL, aResource, aJsonQuery, aSelector, aLimit, aLang) {
    var _xhr = xtiger.cross.getXHRObject();
    var _url = aServiceURL + '/' + aResource;
    _url += '?query=' + aJsonQuery;
    _url += '&selector=' + aSelector;
    if (aLang && aLang != '')
        _url += '&lang=' + aLang
    if (aLimit && aLimit > 0)
      _url += '&limit=' + aLimit;
    _xhr.open('GET', _url, true); // requests are always async
    return _xhr;
  };
  
  /**
   * Converts the given data structure to a JSON string.
   * Argument: aObject - The data structure that must be converted to JSON
   * Example: var json_string = array2json(['e', {pluribus: 'unum'}]);
   *      var json = array2json({"success":"Sweet","failure":false,"empty_array":[],"numbers":[1,2,3],"info":{"name":"Binny","site":"http:\/\/www.openjs.com\/"}});
   * http://www.openjs.com/scripts/data/json_encode.php
   */
  var _toJSON = function _toJSON (aObject) {
      var _parts = [];
      var is_list = (Object.prototype.toString.apply(aObject) === '[object Array]');

      for(var key in aObject) {
        var value = aObject[key];
        if(typeof value == "function")
          continue;
          if(typeof value == "object") { //Custom handling for arrays
              if(is_list)
                _parts.push(_toJSON(value)); /* :RECURSION: */
              else
                _parts.push( '"' + key +'":' + _toJSON(value)); // :RECURSION:
          } else {
              var str = "";
              if(!is_list)
                str = '"' + key + '":';

              //Custom handling for multiple data types
              if(typeof value == "number")
                str += value; //Numbers
              else if(value === false)
                str += 'false'; //The booleans
              else if(value === true)
                str += 'true';
              else
                str += '"' + value + '"'; //All other things
              // :TODO: Is there any more datatype we should be in the lookout for? (Functions?)

              _parts.push(str);
          }
      }
      var json = _parts.join(",");
      
      if(is_list) return '[' + json + ']';//Return numerical JSON
      return '{' + json + '}';//Return associative JSON
  };
  
  /**
   * Handles the reseption of a request's answer. Parses the result, updates
   * the service's cache and call the broadcast method for the provided
   * service.
   * 
   * @param {Service}
   *            aService The service whose cache must be updated and to
   *            broadcast on.
   * @param {JSONString}
   *            aRequest The JSON-formated string to parse
   */
  var _onRequestReceived = function _onRequestReceived (aService, aRequest) {
    try {
      var _datas = eval('(' + aRequest.responseText + ')');
      var _modrk = []; // Stored MODified Resource Keys = modrk
      for (var _i = 0; _i < _datas.length; _i++) { // iterate over received results
        var _forkey = _buildForKey(_datas[_i]['for']);
        for (_key in _datas[_i]) {
          if (_key == 'for') // Skips the "for" key
            continue;
          // Tests if the suggests array contains at least one non-null value
          var _suggests = _datas[_i][_key];
          var _hasElements = false;
          for (var _k = 0; _k < _suggests.length; _k++) {
            if (_suggests[_k] !== null && _suggests[_k] !== undefined && _suggests[_k] !== '') {
              _hasElements = true;
              break;
            }
          }
          if (_hasElements && aService.updateResultsCache(_forkey, _key, _suggests))
            _modrk.push(_key); // save resource keys whose cache entry is modified
        }
      }
      for (var _j = 0; _j < _modrk.length; _j++)
        aService._broadcast(_modrk[_j], aService.getResultsFromCacheByForKey(_modrk[_j]), aService.getHandle());
    } catch (_err) {
      xtiger.cross.log('warning', 'Suggest service : Server\'s answer is not understandable:' + "\n\t\"" +
          aRequest.responseText + '"' + "\n" +
           'Error message: ' + "\n\t" +
          _err.message + ' (' + _err.fileName + ':' + _err.lineNumber + ')');
    }
  };
  
  /**
   * Builds a string representation of a "for" key. A for key is defined by
   * the communication protocol as the "source" for a result set. That is,
   * given a result set (a set of tuple key:values), it represents the
   * producer's value that yields such a result (see the communication
   * protocol for further details)
   * 
   * @param {{key:string;value:string}}
   *            aForKey Hash representation of a "for key" (uses the same
   *            structure)
   * @return {string} a string representation of the form 'key:value'
   */
  var _buildForKey = function _buildForKey (aForKey) {
    return '' + aForKey['key'] + ':' + aForKey['value'];
  };
    
  return {
     '->': {
      'init': '__suggestSuperInit'
    },
    
    /**
     * <p>
     * Updates *this* service queries cache with the provided value.
     * </p>
     * 
     * <p>
     * The cache is a hash structure. Currently it sorts its values in
     * arrays filled under keys. Those keys are resource keys. For every new
     * value for a given key, the cache is augmented with the new value.
     * That means that value getting overwritten in models are not
     * overwritten here. A improvement in that regard requires that we're
     * able to fetch a unique identifier for every model (even those which
     * are repeated) to sort value by this identifier.
     * </p>
     * 
     * @param {string}
     *            aRKey A resource key
     * @param {Model}
     *            aProducer (unused) The model storing the given value
     * @param {string}
     *            aData A string value to put in the cache
     * @return {boolean} True if the cache was modified, false otherwise.
     */
    updateQueriesCache: function updateQueriesCache (aRKey, aProducer, aData) {
      if (!this._cachedqueries[aRKey]) {
        this._cachedqueries[aRKey] = {};
      }
      var _prodKey = aProducer.getUniqueKey();
      _prodKey = _prodKey ? _prodKey : 'nokey';
      if (aData !== null && this._cachedqueries[aRKey][_prodKey] != aData) {
        this._cachedqueries[aRKey][_prodKey] = aData;
        return true;
      }
      else if (aData == null && this._cachedqueries[aRKey][_prodKey] !==  null) {
        delete this._cachedqueries[aRKey][_prodKey];
        return true;
      }
      return false;
    },  
     
    /** Removes a producer from all the keys where it is present in the query cache
     * Removes the query cache entry for a given key if it becomes empty
     * Does not remove if if it hasn't got a unique key
     */
    removeFromQueriesCache: function removeFromQueriesCache(aProducer) {
      var k, p, empty;
      var _prodKey = aProducer.getUniqueKey();
      _prodKey = _prodKey ? _prodKey : 'nokey';
      for (k in this._cachedqueries) {
        delete this._cachedqueries[k][_prodKey];
        empty = true;
        for (p in this._cachedqueries[k]) { // check if entry is now empty
          if (this._cachedqueries.hasOwnProperty(p)) {
            empty = false;
            break;
          }
        }
        if (! empty) {  delete this._cachedqueries[k];  }
      }          
    },  
     
    /**
     * <p>
     * Updates the result "cache" for the given "for key", the given
     * resource key and the values. If the "cache" is modified, the
     * method returns true. Otherwise the method returns false.
     * </p>
     * 
     * <p>
     * This sturcture is not a true cache, as it doesn't store outdated
     * results for a potential reuse. It instead represents the "state" of
     * suggestions, that is, for the current state of producers (the values
     * hold by all producers for this service at this moment), the "cache"
     * holds the authoritative suggestion values to send to consumers.
     * </p>
     * 
     * <p>
     * The cache is sorted by two keys. The first one is the "for key". It
     * broadly represents the state of one producer and under that key is
     * stored the results yield by its state. Those results are themselves
     * sorted by their resource keys, that is, the key of the consumers that
     * are interested by the values.
     * </p>
     * 
     * @param {string}
     *            aForKey The "for key" in its string representation (use
     *            _buildForKey() to obtain it).
     * @param {string}
     *            aResourceKey The "resource key" of the values, that is,
     *            the "consumer* key for which the values are relevant
     * @param {[any]}
     *            aValues The actual values
     * @return {boolean} Returns true if the cache is modified, false
     *         otherwise
     */
    updateResultsCache: function updateResultsCache (aForKey, aResourceKey, aValues) {
      if (!this._resultscache)
        this._resultscache = {};
      
      if (!this._resultscache[aForKey]) // If not exist, crestes entry for "for" key
        this._resultscache[aForKey] = {};
      
      if (!this._resultscache[aForKey][aResourceKey])
        this._resultscache[aForKey][aResourceKey] = []; // If not exist, creates entry for "resource" key
      var _newentry = false;
      for (var _i = 0; _i < aValues.length; _i++) {
        if (!xtiger.util.array_contains(this._resultscache[aForKey][aResourceKey], aValues[_i])) {
          this._resultscache[aForKey][aResourceKey].push(aValues[_i]);
          _newentry = true;
        }
      }
      return _newentry;
    },
    
    /**
     * Removes results from the cache that are registered under the "for"
     * key given as parameter.
     * 
     * @param {string}
     *            aForKey The "for key" in its string representation (use
     *            _buildForKey() to obtain it).
     * @return {boolean} Returns true if the cache is modified, false
     *         otherwise
     * @see this.updateResultsCache
     */
    pruneResultsCache : function pruneResultsCache (aForKey) {
      if (!this._resultscache)
        return false;
      
      if (!this._resultscache[aForKey])
        return false;
      
      delete this._resultscache[aForKey];
      return true;
    },
    
    /**
     * Totally clears the results cache.
     */
    clearResultsCache: function clearResultsCache () {
      this._resultscache = {};
    },
    
    /**
     * Fetchs results from the cache for a given resource key. If provided,
     * only fetch results for the given "for" key.
     * 
     * @param {string}
     *            aResourceKey
     * @param {string}
     *            aForKey (optional) The "for key" in its string
     *            representation (use _buildForKey() to obtain it).
     * @return {[any]|[{value:any, display:InnerHTML}]}
     */
    getResultsFromCache: function getResultsFromCache (aResourceKey, aForKey) {
      if (aForKey) {
        if (this._resultscache[aForKey]) {
          return this._resultscache[aForKey][aResourceKey];
        }
      }
      else {
        var _results = [];
        for (_fk in this._resultscache) {
          if (this._resultscache[_fk][aResourceKey]) {
            for (var _i = 0; _i < this._resultscache[_fk][aResourceKey].length; _i++) {
              if (!xtiger.util.array_contains(_results, this._resultscache[_fk][aResourceKey][_i]))
                _results.push(this._resultscache[_fk][aResourceKey][_i]);
            }
          }
        }
        return _results;
      }
    },
    
    /**
     * Fetches results for the given resource key. Returns those results
     * sorted by their "for keys" (for segmentation purpose, for instance).
     * 
     * @param {string} aResourceKey
     * @return {string: [results]}
     */
    getResultsFromCacheByForKey: function getResultsFromCacheByForKey (aResourceKey) {
      var _results = {};
      for (_fk in this._resultscache) {
        if (this._resultscache[_fk][aResourceKey]) {
          for (var _i = 0; _i < this._resultscache[_fk][aResourceKey].length; _i++) {
            if (!xtiger.util.array_contains(_results, this._resultscache[_fk][aResourceKey][_i])) {
              if (!_results[_fk])
                _results[_fk] = []; // creates array for this for key
              _results[_fk].push(this._resultscache[_fk][aResourceKey][_i]);
            }
          }
        }
      }
      return _results
    }, 
    
    /**
     * Retruns resource keys stored in the cache. If provided, only returns
     * resource for the given "for" key.
     * 
     * @param aForKey
     * @return {[string]}
     */
    getResourceKeysFromCache: function getResourceKeysFromCache (aForKey) {
      var _results = [];
      if (aForKey) {
        if (this._resultscache[aForKey]) {
          for (_rk in this._resultscache[aForKey])
            _results.push(_rk);
        }
      }
      else {
        for (_fk in this._resultscache) {
          for (_rk in this._resultscache[_fk])
            _results.push(_rk);
        }
      }
      return _results;
    },
    
    /**
     * Builds the JSON string for the query field of the communication
     * protocol (see the corresponding document for more information.
     * 
     * @return {string}
     */
    getJSONQuery: function getJSONQuery () {
      var _buf = {}
      for (_rk in this._cachedqueries) {
        _buf[_rk] = [];
        for (_prodKey in this._cachedqueries[_rk])
          _buf[_rk].push(this._cachedqueries[_rk][_prodKey]);
      }
      return encodeURI(_toJSON(_buf));
//      return escape(_toJSON(this._cachedqueries));
    },
    
    /**
     * Sends the query message to the server
     */
    fetchSuggests: function fetchSuggests () {
      var _jsonQuery = this.getJSONQuery();
      var _selector = escape(_toJSON(this._collectRegistrations('consumer')));
      var _limit = this.getParam('suggest_limit') || _DEFAULT_PARAMS['suggest_limit'];
      var _lang = this.getParam('suggest_lang');
      var _xhr = _prepareRequest(this._params['suggest_URL'], this._params['suggest_resource'], 
                    _jsonQuery, _selector, _limit, _lang);
      var _this = this;
      _xhr.onreadystatechange = function () {
        if (_xhr.readyState == 4) {
          if (_xhr.status == 200) {
            _onRequestReceived(_this, _xhr);
          }
          else {
            xtiger.cross.log('warning', 'Suggest service: request failed for query ' +
              _jsonQuery + ' with status ' + _xhr.status);
          }
        }
      }
      try {
        _xhr.send(null);
      } catch (e) {
        xtiger.cross.log('warning', 'Exception while contacting suggestion service : ' + e.name);
      }
    },
    
    ///////////////////////
    // Delegated method 
    // ---
    // Initialization
    ///////////////////////
        
    /**
     * See also GenericService in xtiger.service.ServiceFactory 
     */
    init: function init (aType, aDefaultData, aKey, aParams) {
      this.__suggestSuperInit(aType, aDefaultData, aKey, aParams);
      // validates parameters                     
      var _url = this.getParam('suggest_URL');
      var _rsrc = this.getParam('suggest_resource');
      _url || xtiger.cross.log('warning', 'missing "sugest_URL" parameter on suggest service');
      _rsrc || xtiger.cross.log('warning', 'missing "suggest_resource" parameter on suggest service');
      this._suggestSavvy = _url && _rsrc;
      // adds suggest vars to the service instance
      this._cachedqueries = {};
      this._pendingrequests = [];
      this._resultscache = {};
      /*
       * This hash stores the values of the producers when they invoke the service
       * It is sorted by producers' unique IDs.
       */
      this._previousProducersValues = {};
    },      
    
    //////////////////////////////////////////////
    // Delegated methods 
    // ---
    // Service Producer Methods (notification)                  
    //////////////////////////////////////////////  
    
    notifyLoad : function (aProducer, aResourceKey, aData) {
      // NA
    },    
    
    /**
     * Changes the default service notification mechanism to an asynchronous one
     * querying the server for suggestions.
     *
     * See also GenericService in xtiger.service.ServiceFactory 
     * 
     * @param {Model}
     *            aModel The producer model currently being updated
     * @param {any}
     *            aData The "new" data for the model
     * @param {string}
     *            aResourceKey The resource key from the model's service
     *            registration
     */
    notifyUpdate: function notifyUpdate (aModel, aResourceKey, aData) {
      if (this._suggestSavvy && this.updateQueriesCache(aResourceKey, aModel, aData)) {
        
        var _oldData = this._previousProducersValues[aModel.getUniqueKey()];
        this._previousProducersValues[aModel.getUniqueKey()] = aData;
        
        // There was a previous value for this model
        if(_oldData) {
          
          // Build the "for key" for the previous state of the producer
          var _fk = _buildForKey({key: aResourceKey, value: _oldData}); 
          
           // Fetch potentially modified resource keys (for consumers) for the given "for key"
          var _modrk = this.getResourceKeysFromCache(_fk);
          
          // Prune the cache from the previous value. If the result cache is modified, broadcast to all impacted consumers.
          if (this.pruneResultsCache(_fk)) { 
            for (var _i = 0; _i < _modrk.length; _i++)
              this._broadcast(_modrk[_i], this.getResultsFromCacheByForKey(_modrk[_i]), this.getHandle());
          }
        }
        
        // Fetch the suggests for the new value
        // TODO uses a true request cache storing the result for every request to minimize the number
        // of actual request sent to the server
        this.fetchSuggests();
      }
    },
    
    /**
     * Performs a single broadcast to the given model (consumer). Usually called by the
     * model itself when added by a repeat.
     * 
     * @param {Model}
     *            aConsumer 
     *
     * @param {string}
     *            aResourceKey The resource key usd to fetch data from the results cache
     */
       askUpdate : function askUpdate (aConsumer, aResourceKey) {
      if (this._suggestSavvy) {      
        var _results = this.getResultsFromCache(aResourceKey);
        if (_results && _results.length > 0)
          this.onBroadcast(aConsumer, aResourceKey, this.getResultsFromCacheByForKey(aResourceKey));
      }
     },
    
    /**
     * See also GenericService in xtiger.service.ServiceFactory 
     *
     */
    notifyRemove: function notifyRemove (aProducer, aResourceKey, aData) {
      if (this._suggestSavvy) {  
        this.removeFromQueriesCache(aProducer);
        var _fk = _buildForKey({key: aResourceKey, value: aData});
        var _rks = this.getResourceKeysFromCache(_fk);
        if (this.pruneResultsCache(_fk)) {          
          for (var _i = 0; _i < _rks.length; _i++)
            this._broadcast(_rks[_i], this.getResultsFromCacheByForKey(_rks[_i]), this.getHandle());
        }
      }
    },
    
    //////////////////////////////////////////////
    // Delegated methods 
    // ---
    // Service Consumer Method
    //////////////////////////////////////////////
    
    /**
     * Broadcasts a suggestion to the given model (consumer). The broadcasting
     * will yield a suggester which will display suggests in a popup device.
     * 
     * @param {Model}
     *            aConsumer
     * @param {{forkey1:values;forkey2:values;...}}
     *            aData An hash of values sorted by "for keys" (for
     *            segmentation purposes). Values are array of atomic values.
     *            A value may either be a simple value (string, int, ...) or
     *            a tuple display/value.
     * @param {string}
     *            aResourceKey (unused here)
     * @return
     */
    onBroadcast: function onBroadcast (aConsumer, aResourceKey, aData) {
      if (this._suggestSavvy) {

        // Count the results
        var _counter = 0;
        var _fk1;
        for (_fk in aData) {
          if (aData[_fk].length) {
            _counter += aData[_fk].length
            _fk1 = _fk;
          }
        }
        
        // Implements the auto-accept feature
        if (aConsumer.getParam('suggest_autoaccept')) {
          
          // Then, if their is only one result (stored under _fk1), use it
          if (_counter == 1) { // Only autoaccept for a single suggest !
            var _data = aData[_fk1];
            var _data = (_data[0].display && _data[0].value) ? _data[0].value : _data[0];
            
            // Only update if there is a difference between the single result and the default data
            if (_data != aConsumer.getDefaultData()) {
              aConsumer.update(_data);
              return;
            }
          }
        }
        
        // lazy creation of the suggester instance
          var _suggester;
          if (aConsumer.getHandle().nextSibling && aConsumer.getHandle().nextSibling.xttSuggestServiceHandle)
            _suggester = aConsumer.getHandle().nextSibling.xttSuggestServiceHandle;
          else {
            _suggester = new _Suggester(aConsumer);
            _suggester.init();
          }
          
          // Updates the suggester with the data (if counter is 0, it empties the suggester) 
          _suggester.update(aData);
          
          // Displays or hides it
          if (_counter > 0)
            _suggester.display();
          else
            _suggester.hide();
          }
    }   
  }
})();

xtiger.factory('service').registerDelegate('suggest', xtiger.service.SuggestService);

xtiger.resources.addBundle('service_suggest', {
  'light_on' : 'light_on.png',
  'light_off' : 'light_off.png'
});