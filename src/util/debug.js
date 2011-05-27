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
 * This file contains some utility functions to debug AXEL applications
 * These functions are located within the xtiger.debug namespace
 * This file should not be built with the other files when deploying AXEL applications, it's for debug only
 */
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

