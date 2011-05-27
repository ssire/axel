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

/**
  * Class NoXMLFilter (filter mixin)
  * 
  * @class _NoXMLFilter
  */
var _NoXMLFilter = (function _NoXMLFilter() {
  return {  

    // No mapping
    '->': {
    },   

    load : function (point, dataSrc) {
      // do not load
    },    

    save : function (text) {
      // do not save
    }
   }      
 })();

// Do not forget to register your filter on any compatible primitive editor plugin
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('noxml', _NoXMLFilter);   
xtiger.editor.Plugin.prototype.pluginEditors['select'].registerFilter('noxml', _NoXMLFilter);   

// TBD : 'hidden' filter (forces handle's style to display:'none') 



 