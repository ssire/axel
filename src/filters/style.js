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

  function _getTarget ( me, dontComplain ) {
    var rootcn = me.getParam('style_root_class'),
        targetcn = me.getParam('style_target_class'),
        root = rootcn ? $(me.getHandle(true)).closest('.' + rootcn) : null,
        res = (root && targetcn) ? root.find('.' + targetcn).first() : root;
    if ((! res) && (! dontComplain)) {
      xtiger.cross.log('warning', "'style' filter could not find target node");
    }
    return res;
  }

  var _Filter = {

    // the default value MUST match the default CSS settings
    // FIXME: enforce it ?
     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       this.__style__onInit(aDefaultData, anOptionAttr, aRepeater);
       this._CurStyleValue = aDefaultData;
       // works with 'select' iff aDefaultData is the target XML value (not the i18n one)
     },

     methods : {

       // TBD
       // update : function () {
       //   if (this.getParam('style_unit')) {
       //      vérifier que c'est un nombre et afficher erreur sinon (utiliser style_error_target ou data_validation_error pour afficher ?)
       //   }
       // },

       set : function ( doPropagate ) {
         var value, prop, values, target, sel, doc, rule, unit = this.getParam('style_unit');
         this.__style__set(doPropagate);
         // CSS rule mode
         sel = this.getParam('style_rule_selector');
         if (sel) {
           rule = sel + ' {' + this.getParam('style_property') + ':' + this.getData() + (unit ? unit + '}' : '}');
         }
         sel = this.getParam('style_rule');
         if (sel) {
           rule = sel.replace(/\$_/g, this.getData());
         }
         if (rule) {
           doc = this.getDocument();
           if (! this._StyleRuleHandle) {
             this._StyleRuleHandle = $("<style type='text/css'> </style>", doc).appendTo($("head", doc));
           }
           this._StyleRuleHandle.text(rule);
         }
         // direct target mode
         target = _getTarget(this,  rule !== undefined);
         if (target) {
           prop = this.getParam('style_property') || 'class';
           values = this.getParam('values');
           if (values) { // this is a 'select' plugin (FIXME: api this.getPluginType())
            value = this.getData();
            if (this._CurStyleValue) {
              if (prop === 'class') {
                target.removeClass(this._CurStyleValue);
              }
            }
            this._CurStyleValue = value;
           } else { // not a 'select' plugin
             value = this.getParam('style_value') || this.getData();
           }
           if (prop === 'class') {
              target.addClass(value)
           } else {
              target.css(prop, unit ? value + unit : value);
           }
         }
       },

       unset : function ( doPropagate ) {
         var value, prop, target, sel, doc;
         this.__style__unset(doPropagate);
         prop = this.getParam('style_property') || 'class';
         // CSS rule mode
         sel = this.getParam('style_rule_selector') || this.getParam('style_rule');
         if (sel && this._StyleRuleHandle) {
           this._StyleRuleHandle.text('');
         }
         // direct target mode
         target = _getTarget(this, sel);
         // xtiger.cross.log('debug', 'unset');
         if (target) {
           prop = this.getParam('style_property') || 'class';
           if (this.getParam('values')) { // this is a 'select' plugin
             value = this._CurStyleValue;
           } else {
             value = this.getParam('style_value') || this.getData();
             // xtiger.cross.log('debug', 'unset with value ' + value)
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
