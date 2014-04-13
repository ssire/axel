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
 * Author(s) : Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
////////////////////////////////////////////
// FIXME
// - Firefox only (see innerHTML note)
// TODO : 
// - support update( aLogger ) for optimization (pseudoNode tree)
//   (with a new PseudoNode constant in domlogger.js)
////////////////////////////////////////////
 
(function ($axel) {

var _Hook = {

  ////////////////////////
  // Life cycle methods //
  ////////////////////////
  onGenerate : function ( aContainer, aXTUse, aDocument ) {
    var htag = aXTUse.getAttribute('handle') || 'span',
        h = xtdom.createElement(aDocument, htag);
    $(h).html(aXTUse.innerHTML);
    // FIXME: Firefox's innerHTML is okay but not on Safari (aXTUse is an Element and not a HTMLElement)
    // FIXME: copy all aXTuse children element into handle (?)
    aContainer.appendChild(h);
    return h;
  },
  
  onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
    if (this.getParam('hasClass')) {
      xtdom.addClassName(this._handle, this.getParam('hasClass'));
    }
  },

  // Awakes the editor to DOM's events, registering the callbacks for them
  onAwake : function () {
  },

  onLoad : function (aPoint, aDataSrc) {
    var _value;
    if (aPoint !== -1) {
      _value = aDataSrc.getDataFor(aPoint);
      if (typeof _value === 'string') { // terminal string data model
        this.model = _value;
      } else { // XML content model
        this.model = "";
        var s =  new XMLSerializer();
        for (var i = 1; i < aPoint.length; i++) {
          this.model += s.serializeToString(aPoint[i]);
        }
      }
    } else {
      delete this.model;
    }
  },

  onSave : function (aLogger) {
    if (this.model) {
      aLogger.writeUnencoded(this.model);
    } else {
      aLogger.discardNodeIfEmpty();
    }
  },

  ////////////////////////////////
  // Overwritten plugin methods //
  ////////////////////////////////
  api : {

   isFocusable : function () {
     return false;
   },

  },

  /////////////////////////////
  // Specific plugin methods //
  /////////////////////////////
  methods : {
    
    // Returns current data model
    getData : function () {
      return this.model;
    },

    update : function (aData) { 
      this.model = aData;
    }
  }
};

$axel.plugin.register(
  'hook', 
  { filterable: true, optional: false },
  { 
   category : 'none'
  },
  _Hook
);

}($axel));