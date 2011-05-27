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

// Todo
// - there is a bug when the user set clear = both on one of the choices (a header)
//   if the user changes the choice the style.clear is not reset (!)
//   to solve it would require a better filter life cycle: beeing in a choice
//   which is changed should trigger onChoiceUnselet / onChoiceSelect
//   or something like that (filter API to refine...)       
// - test user input values (or replaces with a popup device)
 
/**
  * Class _ClearFilter (mixin filter)
  *
  * Sets the clear style attribute on the nth parent of the handle, 
  * where n is given by the clear parameter, to the string value
  *  entered by the user in the filtered editor.
  * 
  * @class _ClearFilter
  */
 var _ClearFilter  = (function _ClearFilter () {    

   /////////////////////////////////////////////////
   /////    Static Clear Mixin Part     ////////
   /////////////////////////////////////////////////

   var _setStyle = function _setStyle (h, text, levels) {     
    var n = h;
    for (var i = levels; i > 0; i--) {
      n = n.parentNode;
    }
    if ((text == 'both') || (text == 'left') || (text == 'right')) {
      n.style.clear = text;
    } else {
      n.style.clear = '';
    }
  }

  return {  

     ///////////////////////////////////////////////////
     /////     Instance Clear Mixin Part    ////////
     ///////////////////////////////////////////////////

    // Property remapping for chaining
    '->': {
      'load': '__ClearSuperLoad', 
      'update': '__ClearSuperUpdate'
    },   

    load : function (point, dataSrc) {
      var value;
      if (! dataSrc.isEmpty(point)) {
        value = dataSrc.getDataFor(point);  
        var levels = parseInt(this.getParam('clear'));
        _setStyle(this.getHandle(), value, levels);
      }
      this.__ClearSuperLoad(point, dataSrc);
    },    

    update : function (text) {
      var levels = parseInt(this.getParam('clear'));
      _setStyle(this.getHandle(true), text, levels);
      this.__ClearSuperUpdate(text);
    }


   }

 })();

 // Do not forget to register your filter on any compatible primitive editor plugin
 xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('clear', _ClearFilter);  

  /**
   * Class _PositionFilter (mixin filter)
   *
   * Sets the position style attribute on the nth parent of the handle, 
   * where n is given by the clear parameter, to the string value
   * entered by the user in the filtered editor.
   * 
   * <em>FIXME: currently clear parameter is not implemented !</em>
   * 
   * @class _ClearFilter
   */
 var _PositionFilter  = (function _PositionFilter () {    

   /////////////////////////////////////////////////
   /////    Static Clear Mixin Part     ////////
   /////////////////////////////////////////////////

   var _setStyle = function _setStyle (h, text) {     
    var n = h.parentNode.parentNode.parentNode; // div containing photo + caption
    var m = n.parentNode.getElementsByTagName('span')[0]; // span.menu
    if ((text == 'left') || (text == 'right')) {
      n.style.cssFloat = m.style.cssFloat = text; // FIXME: styleFloat sous IE
      if (text == 'right') {
        n.style.marginLeft = '20px'; // FIXME: we should better use a 'class' fiter !!!
        n.style.marginRight = '';
      } else {
        n.style.marginRight = '20px';
        n.style.marginLeft = '';
      }
    } else {
      n.style.cssFloat = m.style.cssFloat =  '';
      n.style.marginRight = '';
      n.style.marginLeft = '';
    }
  }

  return {  

     ///////////////////////////////////////////////////
     /////     Instance Clear Mixin Part    ////////
     ///////////////////////////////////////////////////

    // Property remapping for chaining
    '->': {
      'load': '__PositionSuperLoad', 
      'update': '__PositionSuperUpdate'
    },   

    load : function (point, dataSrc) {
      var value;
      if (! dataSrc.isEmpty(point)) {
        value = dataSrc.getDataFor(point);
        _setStyle(this.getHandle(), value);
      }
      this.__PositionSuperLoad(point, dataSrc);
    },    

    update : function (text) {  
      _setStyle(this.getHandle(true), text);
      this.__PositionSuperUpdate(text);
    }

   };

 })();

 // Do not forget to register your filter on any compatible primitive editor plugin
 xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('position', _PositionFilter);
 