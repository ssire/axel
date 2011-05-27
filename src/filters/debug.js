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
 * behavior is to produce some output on some output channel (a console, a
 * dedicated part of the DOM, alert box or whatever) as calls are made on the
 * model.
 * </p>
 * 
 * <p>
 * As this object is used in a delegation pattern, model's instances that are
 * filtered still appear as "usual" instances. That is, their external aspect is
 * kept unchanged.
 * </p>
 */
var _DebugFilter  = (function _DebugFilter () {    

    function _printDebugTrace (aModel, aFunction, aValue, aComment) {
      var _buf = '';
      _buf += '[' + aModel.getUniqueKey() + ']';
      _buf += ' : ' + aFunction;
      _buf += '(';
      if (aValue)
        _buf += aValue;
      _buf += ')'
      if (aComment)
        _buf += ' : ' + aComment;
      xtiger.cross.log('debug', _buf);
    };
    
    function _arrayPP (aArray) {
      var _buf = '['
      for (var _i = 0; _i < aArray.length; _i++) {
        _buf += aArray[_i] + ', ';
      }
      return _buf;
    }

  return {      

    /**
     * Remap property
     */
    '->': {
      'create': '__debugSuperCreate',
      'init': '__debugSuperInit',
      'load': '__debugSuperLoad',
      'save': '__debugSuperSave',
      'update': '__debugSuperUpdate',
      'clear': '__debugSuperClear',
      'getData': '__debugSuperGetData',
      'focus': '__debugSuperFocus',
      'unfocus': '__debugSuperUnfocus',
      'set': '__debugSuperSet',
      'unset': '__debugSuperUnset',
      'awake': '__debugSuperAwake',
      'startEditing': '__debugSuperStartEditing',
      'stopEditing': '__debugSuperStopEditing'
    },
    
    create : function create () {
      _printDebugTrace(this, 'create');
      this.__debugSuperCreate();
    },
    
    init : function init (aDefaultData, aParams, aOption, aUniqueKey) {
      var _params = '' + aDefaultData
      if (typeof aParams == 'string')
        _params += aParams;
      else
        _params += ', ' + _arrayPP(aParams);
      _params += ', ' + aOption
      _params += ', ' + aUniqueKey;
      _printDebugTrace(this, 'init', _params);
      this.__debugSuperInit(aDefaultData, aParams, aOption, aUniqueKey);
    },
    
    load : function load (aPoint, aDataSrc) {
      _printDebugTrace(this, 'load');
      this.__debugSuperLoad(aPoint, aDataSrc);
    },
    
    save : function save (aLogger) {
      _printDebugTrace(this, 'save');
      this.__debugSuperSave(aLogger);
    },
    
    update : function update (aData) {
      _printDebugTrace(this, 'update', aData, 'Old data = ' + this.__debugSuperGetData());
      this.__debugSuperUpdate(aData);
    },
    
    clear : function clear () {
      _printDebugTrace(this, 'clear', null, 'Old data = ' + this.__debugSuperGetData());
      this.__debugSuperClear();
    },
    
    getData : function getData () {
      _printDebugTrace(this, 'getData');
      return this.__debugSuperGetData();
    },
    
    focus : function focus () {
      _printDebugTrace(this, 'focus');
      this.__debugSuperFocus();
    },
    
    unfocus : function unfocus () {
      _printDebugTrace(this, 'unfocus');
      this.__debugSuperUnocus();
    },
    
    set : function set () {
      if (this.isOptional())
        _printDebugTrace(this, 'set');
      else
        _printDebugTrace(this, 'set', null, 'Warning, thring to set a non-optional editor');
      this.__debugSuperSet();
    },
    
    unset : function unset () {
      if (this.isOptional())
        _printDebugTrace(this, 'unset');
      else
        _printDebugTrace(this, 'unset', null, 'Warning, thring to unset a non-optional editor');
      this.__debugSuperUnet();
    },
    
    awake : function awake () {
      _printDebugTrace(this, 'awake');
      this.__debugSuperAwake();
    },
    
    startEditing : function startEditing (aEvent) {
      _printDebugTrace(this, 'startEditing');
      this.__debugSuperStartEditing(aEvent);
    },
    
    stopEditing : function stopEditing () {
      _printDebugTrace(this, 'stopEditing');
      this.__debugSuperStopEditing();
    }
  } 
  
})();

xtiger.editor.Plugin.prototype.pluginEditors['video'].registerFilter('debug', _DebugFilter);
xtiger.editor.Plugin.prototype.pluginEditors['text'].registerFilter('debug', _DebugFilter);
xtiger.editor.Plugin.prototype.pluginEditors['richtext'].registerFilter('debug', _DebugFilter);
xtiger.editor.Plugin.prototype.pluginEditors['link'].registerFilter('debug', _DebugFilter);