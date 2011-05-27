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
 * filtered still appear as "usual" instances. That is, their external API is
 * kept unchanged.
 * </p>
 */
xtiger.service.ServiceFilter = (function _ServiceFilter () {    
  
  var _triggerServiceCb = function _triggerServiceCb(ev) {
    var handle = ev.target.previousSibling;
    var that = handle ? handle.xttPrimitiveEditor : undefined;
    if (that) {
      var aData = that.getData();
      var _serviceKey = that._getServiceKey(); 
      // TBD: factorize with update() to manage configurator role
      if (_serviceKey.producer) {
        that._notifyServices(_serviceKey.producer, 'notifyUpdate', that.getHandle(true), aData);
        if (that._serviceHookFlag) { // dismiss button (service_trigger=auto)
          _hideButton(that);
          that._serviceHookFlag = false;
        }
      }  
    } else {
      xtiger.cross.log('error', 'canno\'t find source editor in service trigger callback');
    }
  }     
                       
  // Returns the trigger button (DOM element) associated with editor
  // if it exists or undefined otherwise
  var _getTriggerButton = function _getTriggerButton(editor) {   
    h = editor.getHandle(true);  
    trigger = h ? h.nextSibling : undefined;
    if (trigger &&  trigger.className && (trigger.className.search('axel-service-trigger') != -1)) {
      return trigger;
    }
  }
                                 
  // Displays the trigger button associated with the editor 
  // This button is used to manually trigger service events 
  // (e.g. to manually simulate editing after loading data from file)
  // Creates the button if it does not exist (lazy creation)
  var _showButton = function _showButton(editor) {   
    var guard, parent,
      h = editor.getHandle(true), 
      trigger = _getTriggerButton(editor);
    if (trigger) {
      // makes trigger button visible
      xtdom.removeClassName(trigger, 'axel-core-off');
    } else {
      // creates trigger button
      trigger = xtdom.createElement(editor.getDocument(), 'input');
      trigger.setAttribute('type', 'button');
      trigger.setAttribute('value', editor.getParam('service_label') || 'suggest');
      xtdom.addClassName(trigger, 'axel-service-trigger');
      guard = xtdom.createElement(editor.getDocument(), 'span');      
      // fixed boundary for AXEL marker
      xtdom.addClassName(guard, 'axel-core-boundary');
      parent = h.parentNode;      
      if (h.nextSibling) {
        parent.insertBefore (guard, h.nextSibling, true);
        parent.insertBefore (trigger, guard, true);
      } else {
        parent.appendChild(trigger);        
        parent.appendChild(guard);
      } 
      xtdom.addEventListener(trigger, 'click', _triggerServiceCb, false);
    }
  }   
  
  var _hideButton = function _hideButton(editor) {   
    var trigger = _getTriggerButton(editor);    
    if (trigger) { /// defensive
      xtdom.addClassName(trigger, 'axel-core-off');
    }
  }   

  var _triggerOn = function _triggerOn(editor, condition) {
    var m = editor.getParam('service_trigger');
    return (m && (m.indexOf(condition) != -1)) || 
            ((! m) && (condition == 'update')) || 
            ((m && (m.indexOf('load') != -1)) && (condition == 'update'));
               // 'load' implies 'update'
  }  

  // Calls callback of service iff candidates service key match with candidate          
  // Passes originating model, resource name and optional data to callback
  var _invoke = function _invoke(model, service, callback, candidates, data) {
    var curKey = service.getKey();
    if (curKey) {
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].key == curKey) {      
          service[callback](model, candidates[i].resource, data);
        }
      }
    }
  } 

  return {      

    /**
     * Remap property
     */
    '->': {
      'init': '__serviceSuperInit',
      'update': '__serviceSuperUpdate',
      'remove': '__serviceSuperRemove',
      'load': '__serviceSuperLoad'      
    },  
    
    /**
     * <p>
     * Iterates over the left-siblings and ancestors of node startFrom,
     * skipping extra repeat slices if startFrom starts inside a repeat
     * slice. Find services and call their update method if their key
     * matches on of the producers key given as parameter
     * 
     * FIXME: maybe we should skip unactivated choice slices or give as a
     * guidelines not to put service into it?
     * 
     * @param {Array} someRegistrations 
     *          List of hash(es) representing pairs of a resource name 
     *          registered in a given context {key: context, resource: resource name }
     */
    _notifyServices : function _notifyServices (someRegistrations, aMessage, aStartNode, aData) {  
      var r;
      var cur = aStartNode;
      var startCount = 0;
      var endCount = 0;
      while (cur) {            
        if (cur.xttService && cur.xttService[aMessage]) {
          _invoke(this, cur.xttService, aMessage, someRegistrations, aData);
        }
        if (cur.startRepeatedItem) {  startCount++; }
        if ((cur != aStartNode) && cur.endRepeatedItem) {
          endCount++;  // does not count if repeat starts and ends on the node it landed on
        }
        // NOTE: isBoundarySafe in generator.js should prevent startRepeatedItem and endRepeated being on the same node
        if (startCount > endCount) {
          r = cur.startRepeatedItem;
          // jumps at the begining of this repeater
          cur = r.getFirstNodeForSlice(0);
          startCount = endCount = 0; // reset counting  
        } 
        cur = cur.previousSibling;
      }
      if (aStartNode.parentNode) {         
        // FIXME: we could define a .xtt-template-root in the DOM since the template may not start at document root ?
        this._notifyServices (someRegistrations, aMessage, aStartNode.parentNode, aData);
      }
    },
     
    /**
     * Returns a contruct representing the model's service keys "{context}:{role}[resource]"
     * 
     * @return { {aRole : [ { key : aContextKey, resource: aResourceName }, ... ], ...} }
     */
    _getServiceKey : function _getServiceKey () {                                         
      var keyString = this.getParam('service_key');  // key:role[resource]
      var keys = keyString.split(' ');
      var spec = {}; // Hash of role (e.g. 'producer')  
      for (var i = 0; i < keys.length; i++) {
        var m = keys[i].match(/^([\w-_]+):(\w+)\[(.*)\]$/);
        var role = m[2];
        if (role) { // role is defined
          if (! spec[role])
            spec[role] = [];
          spec[role].push( { key : m[1], resource : m[3] } );
        }                      
      }
      return spec;                    
    },
    
    /**
     * <p>
     * Method called from a service. Returns true if the filter is interested
     * in the key as a *consumer*. The key must match the service key (scope)
     * and the resource key.
     * </p>
     *
     * @return {boolean} True if the model (editor) has a matching (key +
     *         resource) service registration key
     */
    checkServiceKey : function checkServiceKey (aContext, aResource) {
      var spec = this._getServiceKey();
      if (spec.consumer) {      
        for (var i = 0; i < spec.consumer.length; i++) {
          if ((aContext == spec.consumer[i].key) && (aResource == spec.consumer[i].resource)) {  
            return true; // found a Match
          }
        }
      }
      return false;
    },
    
    /**                   
     * Installs the service button if this the first time creation of the editing field 
     * and the field is a producer with service_trigger set to 'button'. 
     *
     * Asks for an update from the service if this is not the first time creation
     * but a duplication from a repeater and the field is a producer.
     *
     * See also init in Plugin API.
     */
    init : function init (aDefaultData, aParams, aOption, aUniqueKey, aRepeater) {
      var _serviceKey, trigger;
      this.__serviceSuperInit(aDefaultData, aParams, aOption, aUniqueKey, aRepeater);
      if (aRepeater) { 
        _serviceKey = this._getServiceKey();
        if (_serviceKey.consumer) {
          // gives a chance to "pull" service data that may be available (e.g. pending suggestion)          
          this._notifyServices(_serviceKey.consumer, 'askUpdate', aRepeater.getFirstNodeForSlice(0));
        }
      } else {                    
        _serviceKey = this._getServiceKey(); 
        if (_serviceKey.producer && _triggerOn(this, 'button')) {
          _showButton(this);    
          // only lazy creation in load for _triggerOn(this, 'auto')
        }   
        }       
    },     
       
    // Subscribes to event after duplication by a repeater (i.e. + or load)
    duplicate : function duplicate(srcRepeater) {
      var trigger,
        _serviceKey = this._getServiceKey();                     
      if (_serviceKey && _serviceKey.producer) {
        trigger = _getTriggerButton(this);
        if (trigger) {
          xtdom.addEventListener(trigger, 'click', _triggerServiceCb, false);
        }
      }
    },
                               
    /**
     * Filters calls on update() method to notify the service, if *this* is
     * a producer.
     * 
     * @param {string}  aData
     *      New value that will be copied into the model
     * @param {string}  dontNotifyEvent                           
     *          Optional boolean set to true to avoid sending an event on update.
     *          This is recommended to avoid "loops" when calling update 
     *      from a service delegate
     */
    update : function update (aData, dontNotifyEvent) {
      var _serviceKey = this._getServiceKey();
      var modified = (aData != this.getData());
      if (modified && (_triggerOn(this, 'update') || _triggerOn(this,'auto'))) {       
        if (_serviceKey.producer || _serviceKey.configurator) { 
          if (dontNotifyEvent) {
            // short circuit to avoid loops when update is called from a service delegate
            // xtiger.cross.log('debug','short circuits propagation');
          } else {
            if (_serviceKey.producer)
            {           
              this._notifyServices(_serviceKey.producer, 'notifyUpdate', this.getHandle(true), aData);
            } else if (_serviceKey.configurator) {
              this._notifyServices(_serviceKey.configurator, 'configure', this.getHandle(true), aData);
            }       
          }
        }
        if (this._serviceHookFlag) { // dismiss button (service_trigger=auto)
          _hideButton(this);
          this._serviceHookFlag = false;
        }
      }
      // Chains call to update at the end so that service delegates 
      // may obtain the legacy value of the producer model with getData
      this.__serviceSuperUpdate(aData);
    },     
    
    load : function load (aPoint, aDataSrc) {
      var _serviceKey;
      this.__serviceSuperLoad(aPoint, aDataSrc);
      if (_triggerOn(this, 'auto')) {
        _showButton(this);
        this._serviceHookFlag = true;
      } else if (_triggerOn(this, 'load')) {
        _serviceKey = this._getServiceKey();
        if (_serviceKey.producer)
        {           
          this._notifyServices(_serviceKey.producer, 'notifyLoad', this.getHandle(true), this.getData());
        } else if (_serviceKey.consumer) {
          this._notifyServices(_serviceKey.consumer, 'askUpdate', this.getHandle(true));
        } // FIXME: add configurator case ?
      }
    },    
    
    /**
     * Hook to notify the service that *this* model was removed from a
     * repeat
     */
    remove: function remove () {
      var _serviceKey = this._getServiceKey();
      if (_serviceKey.producer) {
        this._notifyServices(_serviceKey.producer, 'notifyRemove', this.getHandle(true), this.getData());
      }               
      this.__serviceSuperRemove();
    }
  } 
  
})();

xtiger.editor.Plugin.prototype.pluginEditors['video'].registerFilter('service', xtiger.service.ServiceFilter);
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('service', xtiger.service.ServiceFilter);
xtiger.editor.Plugin.prototype.pluginEditors['richtext'].registerFilter('service', xtiger.service.ServiceFilter);
xtiger.editor.Plugin.prototype.pluginEditors['link'].registerFilter('service', xtiger.service.ServiceFilter);
xtiger.editor.Plugin.prototype.pluginEditors['photo'].registerFilter('service', xtiger.service.ServiceFilter);
xtiger.editor.Plugin.prototype.pluginEditors['select'].registerFilter('service', xtiger.service.ServiceFilter);