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
 
/*****************************************************************************\
|                                                                             |
|  AXEL Plugin                                                                |
|                                                                             |
|  manages plugins life cycle (registration)                                  |
|  exposed as $axel.plugin                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Global functions:                                                          |
|    $axel.plugin.register                                                    |
|        registers a plugin object                                            |
|                                                                             |
\*****************************************************************************/

////////////////////////////////////////////////////////////////////////
// TODO: 
//  1. factorize services to
// - manage a uniqueKey 
// - manage parameters
// - manage modification state
// - manage optionality
//  2. factorize the factory methods (createModel, createEditorFromTree, createEditorFromSeed)
////////////////////////////////////////////////////////////////////////
 
xtiger.editor.Plugin = function () {  
}

xtiger.editor.Plugin.prototype = {  
 pluginEditors : {},

 // Returns a factory for the xtigerSrcNode if it corresponds to a primitive editor
 // typesArray is an Array containing the list of types for the node
 getEditorFor : function (xtigerSrcNode, typesArray){
   var factory;
   if (typesArray.length == 1) { // currently only 'singleton' use/bag may be primitive editors...
     var wrapper = xtigerSrcNode.getAttribute('wrapper');   
     var editor = (wrapper) ? 'string' : typesArray[0]; // FIXME: wrapper only supported with types='string'
     factory = this.pluginEditors[editor];
   }
   return factory;
 },

 // Returns true if the xtigerSrcNode corresponds to a primitive editor
 // typesStr is a String representing the list of types for the node
 hasEditorFor : function (xtigerSrcNode, typesStr) {
   var res;
   if (this.pluginEditors[typesStr]) {
     res = true;
   } else {
     var wrapper = xtigerSrcNode.getAttribute('wrapper');
     var editor = (wrapper) ? 'string' : typesStr; // FIXME: wrapper only supported with types='string'
     res = (this.pluginEditors[editor] != undefined);
   }
   return res;
 }
};

(function ($axel) {
 
 var _BASE_KEY = 'xt'; // base string for key generation
 var _keyCounter = 0; // counter for key generation
 
 // Methods to be merged with a factory object to complete it's API
 var _factoryK = {

   // Creates a unique string. Each call to this method returns a different one.
   createUniqueKey : function createUniqueKey () {
     return _BASE_KEY + (_keyCounter++);
   }
 };

 // Methods to be merged with an editor prototype to complete it's API
 var _editorK = {

   can : function (aFunction) {
     return typeof this[aFunction] == 'function';
   },

   execute : function (aFunction, aParam) {
     return this[aFunction](aParam);
   }
 };
 
 $axel.plugin = $axel.plugin || {};
    
 // adds global management function 
 $axel.plugin.register = function ( name, factory, editor, doFilter ) {
   if (xtiger.editor.Plugin.prototype.pluginEditors[name]) {
     xtiger.cross.log('error', 'plugin "' + name + '" has already been registered, registration aborted');
   } else {
     xtiger.cross.log('info', 'registering plugin "' + name + '"');
     // extends factory with default factory methods
     $axel.extend(factory, _factoryK);
     // extends editor with default editor methods
     $axel.extend(editor, _editorK, true);
     if (doFilter) {
       xtiger.editor.Plugin.prototype.pluginEditors[name] = xtiger.util.filterable(name, factory);
     } else {
       xtiger.editor.Plugin.prototype.pluginEditors[name] = factory;
     }
   }
 }
}($axel));
   
   