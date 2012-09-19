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
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'debug' filter                                                        |
|                                                                             |
|  Catches calls made on the filtered methods and print some traces           |
|                                                                             |
|*****************************************************************************|
|  Prerequisites : none                                                       |
|                                                                             |
\*****************************************************************************/
var _DebugFilter = (function _DebugFilter () {

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

  return {

    '->': {
      'onAwake': '__dbg__onAwake',
      'onInit': '__dbg__onInit',
      'onLoad': '__dbg__onLoad',
      'onSave': '__dbg__onSave',
      'update': '__dbg__update',
      'clear': '__dbg__clear',
      'getData': '__dbg__getData',
      'focus': '__dbg__focus',
      'unfocus': '__dbg__unfocus',
      'set': '__dbg__set',
      'unset': '__dbg__unset',
      'startEditing': '__dbg__startEditing',
      'stopEditing': '__dbg__stopEditing'
    },
    
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      var txt = '' + aDefaultData;
      txt += ', ' + anOptionAttr;
      txt += ', ' + this.getUniqueKey();
      _printDebugTrace(this, 'init', txt);
      this.__dbg__onInit(aDefaultData, anOptionAttr, aRepeater);
    },
    
    onAwake : function () {
      _printDebugTrace(this, 'awake');
      this.__dbg__onAwake();
    },
    
    onLoad : function (aPoint, aDataSrc) {
      _printDebugTrace(this, 'load');
      this.__dbg__onLoad(aPoint, aDataSrc);
    },
    
    onSave : function (aLogger) {
      _printDebugTrace(this, 'save');
      this.__dbg__onSave(aLogger);
    },
    
    update : function (aData) {
      _printDebugTrace(this, 'update', aData, 'Old data = ' + this.__dbg__getData());
      this.__dbg__update(aData);
    },
    
    clear : function () {
      _printDebugTrace(this, 'clear', null, 'Old data = ' + this.__dbg__getData());
      this.__dbg__clear();
    },
    
    getData : function () {
      _printDebugTrace(this, 'getData');
      return this.__dbg__getData();
    },
    
    focus : function () {
      _printDebugTrace(this, 'focus');
      this.__dbg__focus();
    },
    
    unfocus : function () {
      _printDebugTrace(this, 'unfocus');
      this.__dbg__unfocus();
    },
    
    set : function () {
      if (this.isOptional())
        _printDebugTrace(this, 'set');
      else
        _printDebugTrace(this, 'set', null, 'Warning, thring to set a non-optional editor');
      this.__dbg__set();
    },
    
    unset : function () {
      if (this.isOptional())
        _printDebugTrace(this, 'unset');
      else
        _printDebugTrace(this, 'unset', null, 'Warning, thring to unset a non-optional editor');
      this.__dbg__unset();
    },
    
    startEditing : function (aEvent) {
      _printDebugTrace(this, 'startEditing');
      this.__dbg__StartEditing(aEvent);
    },
    
    stopEditing : function () {
      _printDebugTrace(this, 'stopEditing');
      this.__dbg__StopEditing();
    }
  }
  
  $axel.filter.register('debug', _DebugFilter);
  // do not forget to apply it before use $axel.filter.applyTo({'debug' : ['text', 'content', 'link', 'video']});
}($axel));

