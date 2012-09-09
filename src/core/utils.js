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

/*
 * A logger for keeping error messages while performing error-prone actions
 * xtiger.util.Form uses it as an optional parameter to report errors
 * (note: we most probably will deprecate this and use exceptions instead)
 */
xtiger.util.Logger = function () {
  this.errors = [];
} 

xtiger.util.Logger.prototype = {    

  // Returns true if the logger has recorded some error message
  inError : function () {
    return (this.errors.length > 0);
  },
    
  // If msg contains '$$$', it will be substituted with the file name contained in optional url  
  logError : function (msg, url) {
    if (msg.indexOf('$$$') != -1) {
      var m = url.match(/([^\/]*)$/); // should extract trailing file name
      var name = m ? m[1] : url;
      this.errors.push (msg.replace('$$$', '"' + name + '"'));
    } else {
      this.errors.push (msg);     
    }
  },

  // Returns a concatenation of error messages
  printErrors : function () {
    return this.errors.join(';');
  }
}

// FireFox only method
// Opens a dialog for opening a local file or folder depending on the mode
// Uses a filter if not null and specifies the msg to display in the dialog box
// See https://developer.mozilla.org/en/nsIFilePicker
// Returns a FireFox file object or false if the selection was cancelled
xtiger.util.fileDialog = function (mode, filter, msg) {
  var fp;
  try {  
     netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
  } catch (e) {  
     alert("Permission to get enough privilege was denied.");  
     return false;
  }  
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  if (filter) {
    fp.appendFilter("My filter", filter);       
  }                  
  var m;
  if (mode == 'open') {
    m = nsIFilePicker.modeOpen;
  } else if (mode == 'save') {
    m = nsIFilePicker.modeSave;     
  } else { // assumes 'folder'
    m = nsIFilePicker.modeGetFolder;
  }
  fp.init(window, msg, m);    
  var res = fp.show();
  if ((res == nsIFilePicker.returnOK) || (res == nsIFilePicker.returnReplace)){
    return fp.file.path;
  } else {
    return false;
  }
}

// This is en embryo of debug tools that was never completed (DEPRECATED)
// FIXME: xtiger.debug.loadDocument to be merged with xtiger.cross.loadDocument (?)
xtiger.debug = {};

/**
 * Loads the XHTML document at URL
 * Experimental version that uses XMLHTTPRequest object on all browser except IE
 * On IE (IE8, IE7 ?, untested on IE6) it uses the MSXML2.DOMDocument ActiveX for parsing XML documents into an IXMLDOMElement
 * as a benefit it can open templates / XML documents from the local file system on IE
 *
 * Accepts an optional logger (xtiger.util.Logger) object to report errors
 * Returns the document (should be a DOM Document object) or false in case of error
 */
xtiger.debug.loadDocument = function (url, logger) {
  if (window.navigator.appName == "Microsoft Internet Explorer") { // will try with MSXML2.DOMDocument
    var errMsg;   
    try {
      var xtDoc = new ActiveXObject("MSXML2.DOMDocument.6.0");  
      xtDoc.async = false;
      xtDoc.resolveExternals = false;
      xtDoc.validateOnParse = false; 
      xtDoc.setProperty("ProhibitDTD", false); // true seems to reject files with a DOCTYPE declaration
      xtDoc.load(url);
      if (xtDoc.parseError.errorCode != 0) {
          errMsg = xtDoc.parseError + ' ' + xtDoc.parseError.reason;
      } else {
        return xtDoc; // OK, returns the IXMLDOMElement DOM element 
      }
    } catch (e) {
      errMsg = e.name;
    }
    if (errMsg) {
      if (logger) {
        logger.logError('Error while loading $$$ : ' + errMsg, url);
      } else {
        alert("ERROR:" + errMsg);         
      }
        xtDoc = null;
    }   
  } else {
    return xtiger.cross.loadDocument(url, logger);
  }
  return false; 
}
