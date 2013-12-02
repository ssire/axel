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

(function ($axel) {
  
  var registry = {}; // remember filter mixins to apply them to plugin factory klasses later
  
  // Extends a plugin factory klass "that" called "name" to make the plugin accepts filters
  function makePluginFilterable ( name, that ) {

    if (! that) { // safe guard
      xtiger.cross.log('error', 'filter "' + name + '" is undefined');
      return that;
    }

    var _filtersRegistry = {}, // registry to store filters for "that" plugin
        _pluginName = name; // plugin name for log messages

    // Registers a filter under the given key
    that.registerFilter = function registerFilter (aKey, aFilter) {
      if (typeof(aFilter) === "object") { // NOTE: may test harder?
        if (_filtersRegistry[aKey]) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: filter "' + aKey + '" is already registered. Overwriting it.');
        }
        _filtersRegistry[aKey] = aFilter;
      }
    };

    // Extends static klass defaults parameters with static filter defaults ones
    that.applyFiltersDefaults = function applyFilters (aDefaults, aFiltersParam) {
      var _filtersnames = aFiltersParam.split(' '); // filters are given as a space-separated name list
      for (_i = 0; _i < _filtersnames.length; _i++) {
        var _filter = _filtersRegistry[_filtersnames[_i]]; // fetch the filter
        if (!_filter) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: missing filter "' + _filtersnames[_i] + '"');
          continue;
        }
        $axel.extend(aDefaults, _filter.defaults, false, true);
      }
    };

    // Apply all filters to a prototype object
    // FIXME: 
    // - apply to bultin methods
    // - apply to api method
    that.applyFilters = function applyFilters (aPrototype, aFiltersParam) {

      var _filtersnames = aFiltersParam.split(' '), // filters are given as a space-separated name list
          _remaps, _i, _p, token;

      // Apply filters
      // Chain methods by creating intermediate methods with different names
      for (_i = 0; _i < _filtersnames.length; _i++) {
        var _filter = _filtersRegistry[_filtersnames[_i]]; // fetch the filter
        if (!_filter) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: missing filter "' + _filtersnames[_i] + '"');
          continue;    
        }
        if (_filter) {
             // remaps chained methods
             _remaps = _filter.spec.chain;
             if (_remaps) {
                 if (typeof _remaps === "string") {
                   _remaps = [ _remaps ];
                 }
                 for (_p = 0; _p < _remaps.length; _p++) {
                   // alias the current version away 
                   // alias to no-op function if it doesn't exist
                   token = '__' + _filtersnames[_i] + '__' + _remaps[_p];
                   aPrototype[token] = aPrototype[_remaps[_p]] || function () { };
                 }
             }

             // copy life cycle methods
             if (_filter.mixin.onGenerate) {
               aPrototype.onGenerate = _filter.mixin.onGenerate;
             }             
             if (_filter.mixin.onInit) {
               aPrototype.onInit = _filter.mixin.onInit;
             }
             if (_filter.mixin.onAwake) {
               aPrototype.onAwake = _filter.mixin.onAwake;
             }
             if (_filter.mixin.onLoad) {
               aPrototype.onLoad = _filter.mixin.onLoad;
             }
             if (_filter.mixin.onSave) {
               aPrototype.onSave = _filter.mixin.onSave;
             }

             // overwrite basic plugin methods
             // FIXME: check method exists before overwriting to print warnings
             $axel.extend(aPrototype, _filter.mixin.api, false, true);
             
             // add specific methods
             // FIXME: check method does not exist to print warnings
             $axel.extend(aPrototype, _filter.mixin.methods, false, true);
         }
      }
    };

    return that;
  }

  // Registers a filter mixin so that it can be applied later on to a plugin klass
  function registerFilter ( name, spec, defaults, mixin ) {
    if (registry[name]) {
      xtiger.cross.log('error', 'attempt to register filter "' + name + '" more than once');
    } else {
      registry[name] = {
        spec : spec,
        defaults : defaults,
        mixin : mixin
      }
    }
  }
  
  // Introspection function (for debug) 
  // FIXME: find a way to list which filters have been applied to which plugins
  function listFilters () {
    var key, accu = [];
    for (key in registry) { accu.push(key); }
    return accu;
  }
  
  // Applies one or more registered filter(s) to one or more plugin klass(es)
  // FIXME: make this asynchronous to break dependency between plugin / filter declaration order ?
  function applyFilterToPlugin ( spec ) {
    var key, filterMixin, plugins, target;
    for (key in spec) { 
      filterMixin = registry[key];
      plugins = spec[key];
      plugins = (typeof plugins === 'string') ? [ plugins ] : plugins;
      if (filterMixin) {
        while (plugins.length > 0) {
          target = plugins.shift();
          if (xtiger.editor.Plugin.prototype.pluginEditors[target]) { // FIXME: $axel.plugin.get(target)
            xtiger.editor.Plugin.prototype.pluginEditors[target].registerFilter(key, filterMixin);
          } else {
            xtiger.cross.log('error', 'attempt to register filter "' + key + '" on unkown plugin "' + target + '"' );
          }
        }
      } else {
        xtiger.cross.log('error', 'attempt to register unkown filter "' + key + '" on plugin(s) "' + plugins.join(',')  + '"' );
      }
    }
  }
  
  // Exportation 
  xtiger.util.filterable = makePluginFilterable;
  $axel.filter = $axel.filter || {};
  $axel.filter.register = registerFilter;
  $axel.filter.applyTo = applyFilterToPlugin;
  $axel.filter.list = listFilters;  
}($axel));
