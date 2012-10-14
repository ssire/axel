/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 *
 * Author(s) : Stephane Sire
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'width' filter                                                        |
|                                                                             |
|  Turns a field into a "live" width field (in pixels) applying it's current  |
|  value onto a DOM target                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Prerequisite: jQuery                                                       |
|  Compatibility: 'text' plugin                                               |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  function _getTarget (me) {
    var rootcn = me.getParam('width_root_class'),
        targetcn = me.getParam('width_target_class'),
        root = $(me.getHandle(true)).closest('.' + rootcn),
        res = targetcn ? root.find('.' + targetcn).first() : root;
    if (! res) {
     xtiger.cross.log('warning', "'width' filter could not find target node");
    }
    return res;
  }

  var _Filter = {

    methods : {

      set : function(doPropagate) {
        var val, target = _getTarget(this);
        if (target) {
          val = this.getData();
          if (/^\d+$/.test(val)) {
            val = val + 'px';
          } else {
            val="auto";
          }
          target.css('width', val);
        }
        this.__width__set(doPropagate);
      },

      clear : function (doPropagate) {
        var target = _getTarget(this);
        if (target) {
          target.css('width', '');
        }
        this.____width__clear(doPropagate);
      }

      // unset : function (doPropagate) {
      // }
      // FIXME: there is one case where unset is called and not clear (unchek through checkbox)
    }
  };

  $axel.filter.register(
    'width', 
    { chain : [ 'set', 'clear'] },
    null,
    _Filter);
  $axel.filter.applyTo({'width' : 'text'});
}($axel));

/*****************************************************************************\
|                                                                             |
|  AXEL 'style' filter                                                        |
|                                                                             |
|  Filter that works ONLY for an optional text editor (option="...") :        |
|  adds the 'optclass_name' class name to the parent of the handle            |
|  when the handle is selected                                                |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Prerequisite: jQuery                                                       |
|  Compatibility: 'text', 'select' plugins                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {
  
  function _getTarget ( me ) {
    var rootcn = me.getParam('style_root_class'),
        targetcn = me.getParam('style_target_class'),
        root = $(me.getHandle(true)).closest('.' + rootcn),
        res = targetcn ? root.find('.' + targetcn).first() : root;
    if (! res) {
      xtiger.cross.log('warning', "'style' filter could not find target node");
    }
    return res;
  }

  var _Filter = {

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       this.__style__onInit(aDefaultData, anOptionAttr, aRepeater);
       this._CurStyleValue = aDefaultData; 
       // works with 'select' iff aDefaultData is the target XML value (not the i18n one)
     },
     
     methods : {

       set : function ( doPropagate ) {
         var value, prop, values, target;
         this.__style__set(doPropagate);
         values = this.getParam('values');
         target = _getTarget(this);
         if (target) {
           prop = this.getParam('style_property') || 'class';
           if (values) { // this is a 'select' plugin
            value = this.getData();
            if (this._CurStyleValue) {
              if (prop === 'class') {
                target.removeClass(this._CurStyleValue);
              }
            }
            this._CurStyleValue = value;
           } else {
            value = this.getParam('style_value') || this.getData();
           }
          (prop === 'class') ? target.addClass(value) : target.css(prop, value);
         }
       },

       unset : function ( doPropagate ) {
         var value, prop, target;
         this.__style__unset(doPropagate);
         prop = this.getParam('style_property') || 'class';
         target = _getTarget(this);
         if (target) {
           prop = this.getParam('style_property') || 'class';
           if (this.getParam('values')) { // this is a 'select' plugin
             value = this._CurStyleValue;
           } else {
             value = this.getParam('style_value') || this.getData();
           }
           if (value) {
             (prop === 'class') ? target.removeClass(value) : target.css(prop, '');
             // FIXME: remember original css value in set and restore it ?
           }
         }
       }
    }
  };
  
  $axel.filter.register(
    'style', 
    { chain : ['onInit', 'set', 'unset'] },
    null,
    _Filter);
  $axel.filter.applyTo({'style' : ['text', 'select']});
}($axel));