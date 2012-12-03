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
    
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      var txt = '' + aDefaultData;
      txt += ', ' + anOptionAttr;
      txt += ', ' + this.getUniqueKey();
      _printDebugTrace(this, 'init', txt);
      this.__debug__onInit(aDefaultData, anOptionAttr, aRepeater);
    },
    
    onAwake : function () {
      _printDebugTrace(this, 'awake');
      this.__debug__onAwake();
    },
    
    onLoad : function (aPoint, aDataSrc) {
      _printDebugTrace(this, 'load');
      this.__debug__onLoad(aPoint, aDataSrc);
    },
    
    onSave : function (aLogger) {
      _printDebugTrace(this, 'save');
      this.__debug__onSave(aLogger);
    },
    
    update : function (aData) {
      _printDebugTrace(this, 'update', aData, 'Old data = ' + this.__debug__getData());
      this.__debug__update(aData);
    },
    
    clear : function () {
      _printDebugTrace(this, 'clear', null, 'Old data = ' + this.__debug__getData());
      this.__debug__clear();
    },
    
    getData : function () {
      _printDebugTrace(this, 'getData');
      return this.__debug__getData();
    },
    
    focus : function () {
      _printDebugTrace(this, 'focus');
      this.__debug__focus();
    },
    
    unfocus : function () {
      _printDebugTrace(this, 'unfocus');
      this.__debug__unfocus();
    },
    
    set : function () {
      if (this.isOptional())
        _printDebugTrace(this, 'set');
      else
        _printDebugTrace(this, 'set', null, 'Warning, thring to set a non-optional editor');
      this.__debug__set();
    },
    
    unset : function () {
      if (this.isOptional())
        _printDebugTrace(this, 'unset');
      else
        _printDebugTrace(this, 'unset', null, 'Warning, thring to unset a non-optional editor');
      this.__debug__unset();
    },
    
    startEditing : function (aEvent) {
      _printDebugTrace(this, 'startEditing');
      this.__debug__StartEditing(aEvent);
    },
    
    stopEditing : function () {
      _printDebugTrace(this, 'stopEditing');
      this.__debug__StopEditing();
    }
  }
  
  $axel.filter.register(
    'debug', 
    { chain : ['onAwake', 'onInit', 'onLoad', 'onSave', 'update', 'clear', 'getData', 'focus', 'unfocus', 'set', 'unset', 'startEditing', 'stopEditing'] },
    null,
    _DebugFilter);
    // do not forget to apply it before use $axel.filter.applyTo({'debug' : ['text', 'content', 'link', 'video']});
}($axel));

