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

    // Registers a filter under the given key. The filter must implement the
    // delegation pattern documented in Alex Russell's blog at
    // http://alex.dojotoolkit.org/2008/10/delegate-delegate-delegate/.
    that.registerFilter = function registerFilter (aKey, aFilter) {
      if (typeof(aFilter) === "object") { // NOTE: may test harder?
        if (_filtersRegistry[aKey]) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: filter "' + aKey + '" is already registred. Overwriting it.');
        }
        _filtersRegistry[aKey] = aFilter;
      }
    };

    // Apply all filters for the given model. The filtering implements a
    // DOJO-like delegation pattern, thanks to Alex Russell's explanation 
    // Returns a filtered instance
    that.applyFilters = function applyFilters (aModel, aFiltersParam) {

      // the "_baseobject" condition avoid copying properties in "props"
      // inherited from Object.prototype.  For example, if obj has a custom
      // toString() method, don't overwrite it with the toString() method
      // that props inherited from Object.protoype
      var _baseobject = {},
          _filtersnames = aFiltersParam.split(' '), // filters are given as a space-separated name list
          _filtered = aModel,
          _Filtered, _remaps, _i, _p;

      // Apply filters
      for (_i = 0; _i < _filtersnames.length; _i++) {
        var _unfiltered = _filtered;
        var _filter = _filtersRegistry[_filtersnames[_i]]; // fetch the filter
        if (!_filter) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: missing filter "' + _filtersnames[_i] + '"');
          continue;    
        }
        _Filtered = function () {}; // New anon class
        _Filtered.prototype = _unfiltered; // Chain the prototype
        _filtered = new _Filtered();
        if (_filter) {
               _remaps = _filter["->"];
               if (_remaps) {
                   //delete _filter["->"]; // TODO avoid for further uses?
                   for (_p in _remaps) {
                       if (_baseobject[_p] === undefined || _baseobject[_p] !== _remaps[_p]) {
                           if (_remaps[_p] === null) {
                               // support hiding via null assignment
                               _filtered[_p] = null;
                           }
                           else {
                               // alias the local version away 
                               // alias to no-op function if it doesn't exist
                               _filtered[_remaps[_p]] = _unfiltered[_p] || function () { };
                           }
                       }
                   }
               }
               xtiger.util.mixin(_filtered, _filter);
           }
      }
      return _filtered;
    };

    return that;
  }

  // Registers a filter mixin so that it can be applied later on to a plugin klass
  function registerFilter ( name, mixin ) {
    if (registry[name]) {
      xtiger.cross.log('error', 'attempt to register filter "' + name + '" more than once');
    } else {
      registry[name] = mixin;
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
