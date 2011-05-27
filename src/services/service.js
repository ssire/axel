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
 * Class _GenericServiceFactory (static)
 * 
 * @class _GenericServiceFactory
 * @version beta
 */
xtiger.service.ServiceFactory = (function _ServiceFactory () {   
  
  /////////////////////
  // Private Methods
  /////////////////////   
  
  // Experimental    
  // Same as __broadcastIter
  var __applyIter = function(that, aProducer, aResourceKey, aData, aStartNode, callback) {  
    var r, model,
      _cur = aStartNode,
      startCount = 0,
      endCount = 0,
      _key = {key: that.getKey(), resource : aResourceKey};
      
    while (_cur) {
      model = _cur.xttPrimitiveEditor;       
      if (model) {
        callback(that, aProducer, aResourceKey, aData, model);                          
      }
      if (_cur.firstChild) {
        __applyIter(that, aProducer, aResourceKey, aData, _cur.firstChild, callback); // Recurse
      }
      if (_cur.endRepeatedItem) { endCount++; }
      if ((_cur != aStartNode) && _cur.startRepeatedItem) {
        startCount++;  // does not count if repeat starts and ends on the node it landed on
      }
      // FIXME: is there a case where startRepeatedItem and endRepeated item can be on the same node ?
      if (endCount > startCount) {  
        return; // Terminated
      }
      _cur = _cur.nextSibling;
    }
  };   
         
  // Calls the onBroadcast method of that service for all the consumer 
  // fields with a compatible resource key in scope of aStartNode
  var __broadcastIter = function (that, aResourceKey, aData, aStartNode) {  
    var r;
    var _cur = aStartNode;
    var startCount = 0;
    var endCount = 0;
    var _context = that.getKey();
    while (_cur) {
      var editor = _cur.xttPrimitiveEditor;
      if (editor && editor.checkServiceKey) { // asssumes a method
        if (editor.checkServiceKey(_context, aResourceKey)) {
            that.onBroadcast(editor, aResourceKey, aData);
        }
      }
      if (_cur.firstChild) {
        __broadcastIter(that, aResourceKey, aData, _cur.firstChild); // Recurse
      }
      if (_cur.endRepeatedItem) { endCount++; }
      if ((_cur != aStartNode) && _cur.startRepeatedItem) {
        startCount++;  // does not count if repeat starts and ends on the node it landed on
      }
      // FIXME: is there a case where startRepeatedItem and endRepeated item can be on the same node ?
      if (endCount > startCount) {  
        return; // Terminated
      }
      _cur = _cur.nextSibling;
    }
  };  
                         
  // Accumulates all the resource keys that match aServiceKey in scope of aStartNode 
  var __collectRegistrationsIter = function(aServiceKey, aRoleKey, aStartNode, aAccu) {
    var _cur = aStartNode;
    var startCount = 0;
    var endCount = 0;
    while (_cur) {
      var editor = _cur.xttPrimitiveEditor;
      if (editor) {
        var _skparam = editor.getParam('service_key');
        if (_skparam && _skparam != '') {
          var _sks = _skparam.split(' ');
          for (var _i = 0; _i < _sks.length; _i++) {
            var _m = _sks[_i].match(/^([\w-_]+):(\w+)\[(.*)\]$/);
            if (_m[1] == aServiceKey && (!aRoleKey || _m[2] == aRoleKey) && 
               !xtiger.util.array_contains(aAccu, _m[3])
               ) {
              aAccu.push(_m[3]);    
            }
          }             
        }     
      }
      if (_cur.firstChild) {
        __collectRegistrationsIter(aServiceKey, aRoleKey, _cur.firstChild, aAccu); // Recurse
      }
      if (_cur.endRepeatedItem) {
        endCount++;
      }
      if ((_cur != aStartNode) && _cur.startRepeatedItem) {
        startCount++;  // does not count if repeat starts and ends on the node it landed on
      }
      // FIXME: is there a case where startRepeatedItem and endRepeated item can be on the same node ?
      if (endCount > startCount) {  
        return; // Terminated
      }
      _cur = _cur.nextSibling;
    }
  };  

  /**
   * Default service implementation. By default it does nothing except calling 
   * its onBroadcast and onRemove methods in response to notifications
   * from a service filter instance (i.e. in response to notifyUpdate, askUpdate,
   * and notifyRemove). 
   * 
   * The default onBroadcast and onRemove methods do nothing. You should 
   * override them in a service "delegate" class to actually do anything.
   *
   * This class implements a default synchronous communication mechanism. 
   * You should overide the notification methods to implement a different 
   * mechanism if you need it (e.g. an asynchronous one with an in-between 
   * round-trip through a server). 
   * 
   * @name _GenericService
   * @class _GenericService
   */
  var _GenericService = function (aHandleNode, aDocument) {

    var _DEFAULT_PARAMS = {
    };

    /**
     * The HTML node used as handle by the service. 
     */
    this._handle = aHandleNode;

    /**
     * A reference to the DOM document containing the editor
     */
    this._document = aDocument;

    /**
     * The actual parameters used by *this* instance
     */
    this._params = _DEFAULT_PARAMS;

    /**
     * The actual key associated with *this* instance
     */
    this._key;     
    
    this._cache = undefined;
        
    this._types;  // needed for seeding
  };   
  
  /** @memberOf _GenericService */
  _GenericService.prototype = {   
    
    getKey: function () {
      return this._key;
    },    
    
    /**
     * Returns the service's current handle, that is, the HTML element where
     * the editor is "planted".
     * 
     * @return {HTMLElement} The editor's handle
     */
    getHandle: function () {
      return this._handle;
    },

    /**
     * 
     * @param aKey
     * @return
     */
    getParam: function (aKey) {
      return this._params[aKey];
    },  
     
    /**
     * Initialization function, called by the service's factory after
     * object's instanciation. Cares to parse and sets the various
     * parameters.
     * 
     * @param {string} aType 
     *           The type string (that may contain several types)
     * @param {string}
     *            aDefaultData ?
     * @param {string}
     *            aKey
     * @param {string|object}
     *            aParams Either the parameter string from the <xt:use> node
     *            or the parsed parameters object from the seed
     */
    init: function (aType, aDefaultData, aKey, aParams) {
      this._types = aType;
      // _FIXME: an alternative design would be to store parameters 
      // in the default data, either as XML content or as string content 
      // with CSS like syntax
      if (aDefaultData) { /* sets up initial content */
        this._defaultData = aDefaultData;
      }
      this._key = aKey;
      if (aParams) { /* parse parameters */
        if (typeof(aParams) == 'string')
          xtiger.util.decodeParameters(aParams, this._params);
        else if (typeof(aParams) == 'object')
          this._params = aParams;
      }
    },

    /**
     * 
     * @return
     */
    makeSeed: function () {
      return [xtiger.factory('service'), this._types, this._defaultData, this._key, this._params];
    },      
          
    // Experimental
    // aProducer : the editor that triggered the call to _apply
    _apply : function(aProducer, aResourceKey, aData, aStartNode, callback) {    
      __applyIter(this, aProducer, aResourceKey, aData, aStartNode, callback);
    },    
    
    /**
     * <p>
     * Finds all consumers for *this* service, given its resource key. The
     * method is recursive and requires a starting node. when called from
     * outside, it should be the service's handle.
     * </p>
     * 
     * NOTE: this method shouldn't be delegated unless you really know what
     * you're doing. If you want to change the behavior on consumer's
     * notification you should delegate onBroadcast instead.
     * 
     * FIXME: maybe we should skip unactivated choice slices ? Scope limited
     * to one repeat slice to allow intra-slice coupling in repetitions
     */
    _broadcast : function (aResourceKey, aData, aStartNode) {  
      __broadcastIter(this, aResourceKey, aData, aStartNode);
    },
    
    /**
     * Collects all resource keys for registered models for *this* service.
     * 
     * @param {string} aRoleKey (optional) 
     *           A role (e.g. 'consumer'). When specified it only considers 
     *                 models registered with this role.
     *
     * @return {[string]} 
     *           An array of resource keys
     */
    _collectRegistrations: function (aRoleKey) {
      var accu = [];
      __collectRegistrationsIter(this.getKey(), aRoleKey, this.getHandle(), accu);
      return accu;
    },              
    
    //////////////////////////////////////////////////////////////
    // Service Configuration Methods (notification)                  
    // ---
    // These methods are called from a service filter instance  
    //////////////////////////////////////////////////////////////
    
    configure : function (aConfigurator, aResourceKey, aData) {
      this._params[aResourceKey] = aData;
      // FIXME: more defensive ? check first if key is allowed ?
    },      
            
    // FIXME: currently we cannot easily do that since model's init 
    // method is called during tree construction while the model 
    // is detached from the main tree !
    // notifyInit : function (aConsumer, aResourceKey, aData) {        
    // },   
    
    //////////////////////////////////////////////////////////////
    // Service Producer Methods (notification)                  
    // ---
    // These methods are called from a service filter instance  
    //
    // If you filter these methods in delegates to alter the 
    // default behaviour (e.g. to create an asynchronous service)
    // do not forget to chain them in case the template author
    // has combined several service delegates on the same service
    //////////////////////////////////////////////////////////////  
    
    notifyLoad : function (aProducer, aResourceKey, aData) {
      this._cache = { resource: aResourceKey, data: aData };   
      // FIXME: cache by resource key
    },    
    
    /**
     * <p>
     * The default service notifyUpdate behavior calls the onBroadcast method for each consumer 
     * in the scope of the service which has subscribed to its context key and to the resource 
     * key of the update event.
     * </p>
     * <p>
     * You can override or specialize this function by adding one or more delegates 
     * with the types attribute of the service element declaration.
     * </p>
     */
    notifyUpdate : function (aProducer, aResourceKey, aData) {
      this._cache = { resource: aResourceKey, data: aData };
      this._broadcast (aResourceKey, aData, this.getHandle());
    },

    /**
     * Asks the service to simulate a broacast on the consumer given as parameter.
     * Currently this is because the consumer has just been created from a repeat editor
     * (i.e. user pressing the plus icon). This is useful if the service maintains some 
     * state, in that case this will allow the freshly created consumer to catch up 
     * with that state.               
     */
    askUpdate : function (aRequester, aResourceKey) {
        if (this._cache && this._cache.resource == aResourceKey) {
          this.onBroadcast(aRequester, this._cache.resource, this._cache.data);
          }
    },
    
    /**
     * Tells the service that the producer field is going to be removed.
     */
    notifyRemove : function (aProducer, aResourceKey, aData) {
      // nope
    },     
    
    /////////////////////////////////////////////////////////
    // Service Consumer Method
    /////////////////////////////////////////////////////////

    /**
     * <p>
     * This method is called for each consumer of this service interested in the resource key
     * of the current update. It does nothing by default.
     * </p><p>
     * You can override or specialize this function by adding one or more delegates 
     * with the types attribute of the service element declaration.   
     * </p>
     * 
     * @param {Model} aConsumer 
     *            The model of the editing field where to perform the action
     * 
     * @param {string} aResourceKey
     *           The resource key from the model's service key that matched 
     *           the action
     * 
     * @param {object} aData 
     *                 The service generated data
     *           
     */
    onBroadcast : function (aConsumer, aResourceKey, aData) {
      // no op
    }   

  };  /* END of _GenericService class */

  return { // here comes Factory code...  

    /**
     * <p>
     * Creates a DOM model for the service.
     * </p>
     * 
     * @param {HTMLElement}
     *            aContainer the HTML node where to implant the service
     * @param {XTNode}
     *            aXTService 
     * @param {DOMDocument}
     *            aDocument the current HTML document (in the DOM
     *            understanding of a "document") being processed
     * @return {HTMLElement} The created HTML element
     */
    createModel: function createModel (aContainer, aXTService, aDocument) {     
      var hook = xtdom.createElement (aDocument, 'span');
      xtdom.addClassName (hook, 'axel-service-handle');
      aContainer.appendChild(hook);     
      return hook;
    },

    /**
     * <p>
     * Creates the service's from an XTiger &lt;xt:use&gt; element. This
     * method is responsible to extract the default content as well as the
     * optional parameters from the &lt;xte:service&gt; element.
     * FIXME: Currently the default content is unparsed and set to undefined.
     * </p>
     * 
     * @param {HTMLElement}
     *            aHandleNode The HTML node used as handle by the created
     *            editor
     * @param {XMLElement}
     *            aXTUse element The &lt;xt:use&gt; element that yields the
     *            new editor
     * @param {DOMDocument} 
     *            aDocument A reference to the containing DOM
     *            document
     * @return {_GenericService} A new instance of the _GenericService class
     */
    createServiceFromTree: function createEditorFromTree (aHandleNode, aXTService, aDocument) {
      var _instance = new _GenericService(aHandleNode, aDocument);      
      var _types = aXTService.getAttribute('types');
      _instance =  this.applyFilters(_instance, _types);
      _instance.init(_types, undefined, aXTService.getAttribute('key'), aXTService.getAttribute('param'));        
      // undefined: we do not pass data from the aXTService descendants at that moment
      return _instance;
    },

    /**
     * <p>
     * Creates a service from a seed. The seed must carry the default data
     * content as well as the parameters (as a string) information. Those
     * infos are used to init the new editor.
     * </p>
     * 
     * @param {Seed}
     *            aSeed The seed from which the new editor is built
     * @param {HTMLElement}
     *            aClone The cloned handle where to implant the editor
     * @param {DOMDocument} 
     *            aDocument the document containing the editor
     * @return {_GenericService} The new instance of the _GenericService class
     * 
     * @see _GenericService#makeSeed()
     */
    createServiceFromSeed: function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
      var _instance = new _GenericService(aClone, aDocument);
      var _types = aSeed[1];
      var _defaultData = aSeed[2];
      var _key = aSeed[3];
      var _params = aSeed[4];     
      _instance = this.applyFilters(_instance, _types);
      _instance.init(_types, _defaultData, _key, _params);
      return _instance;
    }
  }
})();               

xtiger.registry.registerFactory('service', xtiger.util.filterable('service', xtiger.service.ServiceFactory));
                                                                                                
