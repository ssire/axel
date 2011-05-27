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
 * Author(s) : Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * <p>
 * The SuggestDevice class implements the well known auto-complete feature. It
 * is used through the SuggestFilter, which is called by giving the filter=suggest
 * parameter to an xt:use element.
 * </p>
 * 
 * @class SuggestDevice
 */
xtiger.editor.AutocompleteDevice = (function AutocompleteDevice () {
  
  /* private instance */
  var _instance;
  
  /**
   * <p>
   * The actual implementation class holding the autocompletion code. It's
   * kept separated from the AutocompleteDevice class in order to allow a
   * possible evolution where several managers can be used at once.
   * </p>
   * 
   * @class AutocompleteDeviceInstance
   * @name AutocompleteDeviceInstance
   */
  var _AutocompleteDeviceInstance = function (aDocument) {
    
    /* default parameters */
    var _DEFAULT_PARAMS = {
        'limit': 200,
        'delay': 200,
        'display_max': 10,
        'suggestclass': 'ac_suggest',
        'matchclass': 'ac_match',
        'baselayout': '<span class="ac_suggest">%suggest%</span>'
    }
    
    /* A reference document */
    this._document = aDocument;
    
    /* The device currently holding the manager. If null, the manager is unused */
    this._currentDevice;
    
    /* The current input field where the autocomplete is performed */
    this._currentField;
    
    /* timer for the state machine */
    this._timer;
    
    /* the current matching string */
    this._currentMatch;
    
    /* 
     * The suggestion cache 
     * 
     * The cache has the following structure (to be updated) :
     * 
     * {
     *  a: {suggests: [result set], hasMore: true},
     *  bc : {suggests: [result set], hasMore: false}
     * }
     */
    this._cache;
    
    /* URL of a service answering to auto-completion requests */
    this._serviceURL;
    
    /* A non-ambiguous identifier for the resource to query */
    this._resourceURI;
    
    /* the view device. Here a popup menu */
    this._viewer;
    
    /* a Hash containing all pending requests, sorted by their matching string */
    this._pendingRequests;
    
    /* The active parameters between a grab and a release of the device */
    this._sessionParams = _DEFAULT_PARAMS;
  }
  
  /** @memberOf AutocompleteDeviceInstance */
  _AutocompleteDeviceInstance.prototype = {
      
      /**
       * <p>
       * Create a viewer instance to handle the display and the selection
       * of suggests.
       * </p>
       */
      _createViewer: function () {
        var _devKey = 'popupdevice';
        this._popupdevice = xtiger.session(this._document).load(_devKey);
        if (! this._popupdevice) {
          this._popupdevice = new xtiger.editor.PopupDevice(this._document);
          xtiger.session(this._document).save(_devKey, this._popupdevice);
        }
      },
      
      /**
       * <p>
       * Format a suggest string into an HTML snippet. The snippet is
       * supposed to be inserted into a
       * &lt;li&gt; as innerHTML.
       * </p>
       * 
       * <p>
       * This function is intent to provide a default layout in the 
       * absence of a "display" field in the suggest revieved by the 
       * server. This default layout is either fetched in the device's
       * parameters list or is given as function's parameter.
       * </p>
       * 
       * @param {String}
       *            aSuggest. The suggestion string to format
       * @param {String}
       *            aMatch
       * @param {String}
       *            aBaseLayout
       */
      _formatSuggest: function (aSuggest, aMatch, aBaseLayout) {
        var _suggest = aSuggest;
        if (aMatch && typeof(aMatch) == 'String' && aMatch != '') {
          try {
            var _matcher = new RegExp(aMatch, 'i');
            _suggest = _suggest.replace(_matcher, function (m) {
              return '<span class="' + this._sessionParams['matchclass'] + '">' + m + '</span>';
            });
          } catch (_err) {
            xtiger.cross.log('warning', 'AutocompleteDevice: wrong syntax in matcher ' + aMatch);
          }
        }
        return _suggest;
      },
      
      /**
       * <p>
       * Display the results given as parameter. If the results list is
       * empty, the functions hides the viewer.
       * </p>
       * 
       * @param {[String]}
       *            aResultsList a list of suggests to display
       */
      _showResults: function (aResultsList) { 
        if (aResultsList && aResultsList.length > 0) 
          this._popupdevice.startEditing(this._currentModel, aResultsList, this._currentMatch, this._currentField);
      },
      
      /**
       * <p>
       * This function defines the communication protocol for the sending
       * of request to the server.
       * </p>
       * 
       * @param {String}
       *            aMatch The matching string
       * @param {Integer|String}
       *            aLimit The limit of results to be received by the
       *            server
       * @return {XHRHTTPObject} A XHR object ready to be sent, but
       *         without any callback yet
       * 
       * @private
       */
      _prepareRequest: function (aMatch, aLimit) {
        var _xhr = xtiger.cross.getXHRObject();
        var _url = this._serviceURL + '/' + this._resourceURI;
        _url += '?query=' + aMatch;
        if (this._sessionParams['lang'])
            _url += '&lang=' + this._sessionParams['lang']
        if (aLimit && aLimit > 0)
          _url += '&limit=' + aLimit;
        _xhr.open('GET', _url, true); // request are always async
        return _xhr;
      },
      
      /**
       * <p>
       * Launches a fetching process of suggests on the server. Prepares a
       * request and sends it. Registers the callback for the reception of
       * the answer. The callback is given the "match" patameter with a
       * closure for the suggests' cache management.
       * </p>
       * 
       * @param {String}
       *            aMatch The matching string.
       */
      _fetchSuggests: function (aMatch) {
        
        // TODO implement policy for getting results from server or for pruning of the cache
        
        var _xhr = this._prepareRequest(aMatch, this._sessionParams['limit']);
        var _this = this;
        _xhr.onreadystatechange = function () {
          if (_xhr.readyState == 4) {
            if (_xhr.status == 200) {
              _this._onRequestReceived(aMatch, _xhr);
            }
            else {
              xtiger.cross.log('warning', 'Suggest device: request failed for query ' + aMatch + ' with status ' + _xhr.status);
            }
          }
        }
        try {
          _xhr.send(null);
        } catch (e) {
          xtiger.cross.log('warning', 'Exception while contacting autocomplete service : ' + e.name);
        }
      },
      
      /**
       * <p>
       * Updates the session's cache. The cache is organized by matching
       * keys. That means that some redundancies are possible between
       * subset of results. Some results stored in "a" for instance, if
       * "a" is an incomplete set of result, may be found again in "ab"
       * for instance.
       * </p>
       * 
       * @param {String}
       *            aMatch The matching string that yield this results
       *            list from the server
       * @param {[Result]}
       *            aResultsList The list of results that were obtained
       *            from the serveur for the given matching string.
       * @param {Boolean}
       *            hasMore If true, that means that the results list is
       *            incomplete for the given key
       * 
       * @todo Optimization : avoid cache redundancy between subset of
       *       results
       */
      _updateCache: function (aMatch, aResultsList, hasMore) {
        if (this._cache[aMatch]) { // an entry of this key already exist
          if (this._cache[aMatch].hasMore && !hasMore) // only overwrite if the result set is more complete
            this._cache[aMatch] = {'suggests': aResultsList, 'hasMore': false};
        }
        else {
          this._cache[aMatch] = {'suggests': aResultsList, 'hasMore': hasMore};
        }
      },
      
      /**
       * <p>
       * This function extracts suggests from the cache, given a match
       * string. If no entry exists for the given match, it searches for a
       * superset ("ab" instead of "abc") and prunes the results.
       * </p>
       * 
       * @param {String}
       *            aMatch The matching string used to extract results
       * @param {Integer}
       *            aMax A maximum number of results to extract. No real
       *            sorting policy is implemented yet
       * @return {[String]} A list of suggests, in their string form.
       */
      _extractFromCache: function (aMatch, aMax) {
        var _res;
        var _match = aMatch;
        
        while (!_res && _match.length > 0) {
          if (this._cache[_match])
            _res = xtiger.util.array_map(this._cache[_match]['suggests'], function (e) {return e.value} );
          if (!_res)
            _match = _match.slice(0, -1);
        }
        
        if (!_res) // No results
          return null;
        
        if (_match != aMatch) {
          var _r = new RegExp('^' + aMatch, 'i');
          _res = xtiger.util.array_filter(_res, function (s) {return _r.test(s)});
        }
        // limit the returned suggests
        if (aMax && typeof(aMax) == 'number' && aMax > 0 && aMax < _res.length)
          _res = _res.slice(0, aMax - 1);
        
        return _res;
      },
      
      /**
       * <p>
       * This function scans the cache to determine if it contains a
       * complete set of suggests for the given match. It works in the
       * following fashion:
       * </p>
       * 
       * <p>
       * First, it looks if the cache contains an entry for the given
       * match. If it has one, it returns true if the hasMore property is
       * false, false otherwise.
       * </p>
       * 
       * <p>
       * If the cache has no entry for the given match, it reduces the match
       * by pruning its last character, then it retries the previous step. It
       * iterates until the matching string is found in the cache's entries or
       * equals to "".
       * </p>
       * 
       * <p>
       * This function test the full matching string for the following reason:
       * If the cache has an entry for the match, but the entry is marked with
       * the hasMore tag, there is no guarantee that asking again the server 
       * with this match will return the same list of suggests. It actually
       * depends of the limit policy sets up on the server.
       * </p>
       * 
       * @param {string}
       *            aMatch The matching string
       * @return {boolean} True if the cache contains a fill set of
       *         suggests for the given match. False otherwise.
       */
      _hasFullMatch: function (aMatch) {
        var _testMatch = aMatch;
        while (_testMatch.length > 0) {
          if (this._cache[_testMatch])
            return !this._cache[_testMatch].hasMore;
          _testMatch = _testMatch.slice(0, -1); // prune the last char
        }
        return false;
      },
      
      /**
       * <p>
       * This function manage the state machine of the device. the
       * device's state is mainly defined with the current string the
       * suggests should match.
       * </p>
       */
      _updateState: function () {
        this._currentMatch = this._currentField.value;
        
        // Kill pending timeout, if any
        if (this._timer)
          clearTimeout(this._timer);
        
        if (this._hasFullMatch(this._currentMatch)) {
          this._showResults(this._extractFromCache(this._currentMatch, this._sessionParams['display_max']));
        }
        else {
          if (this._currentMatch != '' && this._currentMatch.length >= this._sessionParams['kick_limit'])
            this._timer = setTimeout('xtiger.editor.AutocompleteDevice.getInstance().onTimeout()', this._sessionParams['delay']); // FIXME this shameful quirk
        }
      },
      
      /**
       * <p>
       * Handler for the reception of request's answer. The role is to
       * parse the answer's body and to update the suggests list
       * accordingly.
       * </p>
       * 
       * @param aMatch
       * @param {XHRHTTPObject} aRequest
       * @return
       */
      _onRequestReceived: function (aMatch, aRequest) {
        xtiger.cross.log('debug', 'Suggest for ' + aMatch + ': ' + aRequest.responseText);
        try{
          var _parsedResults = eval('('+ aRequest.responseText + ')');
          this._updateCache(aMatch, _parsedResults.results, _parsedResults.hasMore);
          this._showResults(this._extractFromCache(aMatch, this._sessionParams['display_max']));
        }
        catch (err) {
          xtiger.cross.log('warning', 'AutocompleteDevice: ' + err.message);
        }
      },
      
      /**
       * <p>
       * Event handler for timeout events. As those event are called in
       * the window's scope, they are called from outside this class. This
       * is an issue and must be avoided in cases where several suggest
       * devices are working at the same time.
       * </p>
       * 
       * @todo change the timeout event management
       */
      onTimeout: function () {
        this._fetchSuggests(this._currentMatch);
      },     

      /**
       * <p>
       * Checks that a model declares the mandatory parameters for the autocomplete
       * device to autocomplete it (i.e. it must declare an 'autocomplete_URL' and 
       * and an 'autocomplete_resource' parameters). Prints a warning in case
       * of failure.
       * </p>
       *
       * @param {aModel}
       *            The model to be checked
         * @return {AutocompleteDeviceInstance | false}
         *            Returns itself in case of sucess so that this call can be cascaded, 
         *            false otherwise. 
       */
      validateParameters: function (aModel) {
        var _url = aModel.getParam('autocomplete_URL');
        var _rsrc = aModel.getParam('autocomplete_resource');
        _url || xtiger.cross.log('warning',
          'missing "autocomplete_URL" parameter on autocomplete filter');
        _rsrc || xtiger.cross.log('warning',
          'missing "autocomplete_resource" parameter on autocomplete filter');
        return (_url && _rsrc) ? this : false;
      },
      
      /**
       * <p>
       * Grabs the manager with a device and a field where to perform the
       * auto-complete.
       * </p>
       * 
       * <p>
       * If this manager is already grabbed by another device, it is
       * released. That means that the cache is emptied beforehand and all
       * the current auto-completion suggests lost.
       * </p>
       * 
       * <p>
       * The current device's model is accessed in order to find the suggest's
       * filter parameters.
       * </p> 
       * 
       * @param {Model}
       *            aDevice The device currently grabbing the auto-
       *            complete manager. It must support the following
       *            filtering features (delegation's hooks) : grab(),
       *            release() and onKeyUp(). Moreover, it must be grabbed
       *            by a editor's model with the can()/execute()
       *            delegation functions implemented.
       * @param {DOMInputField}
       *            An HTML field with a read-write "value" accessor
       */
      grab: function (aDevice, aInputField) {
        
        if (this._currentDevice) /* guard against concurrent usage of the device */
          this.release();
        
        this._currentDevice = aDevice;
        this._currentField = aInputField;
        
        if (!this._popupdevice)
          this._createViewer();
        
        /* fetching parameters for this session */
        this._currentModel = aDevice.getCurrentModel();
        this._serviceURL = this._currentModel.getParam('autocomplete_URL');
        this._resourceURI = this._currentModel.getParam('autocomplete_resource');
        this._sessionParams['limit'] = this._currentModel.getParam('autocomplete_limit');
        this._sessionParams['kick_limit'] = this._currentModel.getParam('autocomplete_kick') || 2;
        this._sessionParams['lang'] = this._currentModel.getParam('autocomplete_lang');
        
        this._currentMatch = this._currentField.value;
        
        this._cache = {}; // Initialize the cache
      },
      
      /**
       * <p>
       * Releases the manager. Releasing means the clearing of the cache
       * and the reset of all state's variable. If there are pending requests,
       * they are discarded.
       * </p>
       */
      release: function () {
        
        this._currentDevice = null;
        this._currentField = null;
        this._currentModel = null;
        
        /* abort all pending requests */
        for (var _m in this._pendingRequests) {
          this._pendingRequests[_m].abort();
        }
        this._pendingRequests = {};

        this._cache = null;
      },
      
      /**
       * <p>
       * This function acts as a handler for keyboard events on the input field.
       * As it may receive other keyboard events, it filters them by only 
       * considering events that modifies the field's content.
       * </p>
       */
      onKeyUp: function (ev) {
        if (!this._currentDevice)
          return;
        
        if (this._currentField.value != this._currentMatch)
          this._updateState();
      }
  }
  
  return {
    /**
     * <p>
     * Gets the manager's instance.
     * </p>
     * 
     * <p>
     * The current implementation only allows a single device to be used at
     * once. However, this architecture is intent to allow the management of
     * a pool of devices, acting independantly.
     * </p>
     * 
     * @return {AutocompleteDeviceInstance}
     */
    getInstance: function getInstance (aDocument) {
      if (!_instance)
        _instance = new _AutocompleteDeviceInstance(aDocument);
      return _instance;
    }
  }
})();