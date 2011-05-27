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

// FIXME: this class should be renamed xtiger.util.Template or xtiger.util.Document
// as it wraps a template turned into an editor with it's current data

/*
 * Creates an XTiger Form that can be used to transform a template.
 * baseUrl is the path to the icons used by the generated editor
 *
 * You can use this class as-is, or as an example of how to integrate 
 * XTiger Forms in the client-side of your application
 */
xtiger.util.Form = function (baseIconsUrl) {
  this.baseUrl = baseIconsUrl;  
  this.doTab = false;  
  this.loader = this.serializer = null;
} 

xtiger.util.Form.prototype = {
                                                                   
  // Internal log mechanism that keeps track of a status
  _report : function (status, str, logger) {
    this.status = status;
    this.msg = str;                 
    if (logger && (0 == this.status)) { 
      logger.logError(str);
    }
  },   
  
  // Overrides default class XML loader object
  setLoader : function (l) {
    this.loader = l;
  },
  
  // Overrides default class XML serializer object
  setSerializer : function (s) {
    this.serializer = s;
  },

  /**
   * Enables Tab Key navigation in the generated editor.
   * This method must be called before doing the transformation.
   */
  enableTabGroupNavigation : function () {
    this.doTab = true;
  },
  
  /**
   * Sets the document that contains the Tiger template to transform.
   * xtDoc is the document object (XML DOM) that contains the template, it must 
   * also includes the head section for the declaration of components.
   * By default all the document template body will be transformed.
   * By default, if you do not call setTargetDocument, it is the template
   * that will be transformed. In that case you should also call injectStyleSheet
   * to include the form CSS style sheet into the template if it wasn't included yet
   */
  setTemplateSource : function (xtDoc) { // FIXME: add optional logger ?
    // FIXME: add a parameter to select a sub-part of the template to transform   
    this.srcDoc = xtDoc;
    this.srcForm = null;
    if (xtDoc) { // sanity check
      var bodies = xtDoc.getElementsByTagName('body');
      if (bodies && (bodies.length > 0)) {
        this.srcForm = bodies[0];  // sets what will be transformed
      } else {
        try { // IE Case with IXMLDOMElement document (loaded from MSXML)
          xtDoc.setProperty("SelectionNamespaces","xmlns:xhtml='http://www.w3.org/1999/xhtml'");
          this.srcForm = xtDoc.selectSingleNode('//xhtml:body');
        } catch (e) { /* nop */ }
      }     
      if (! this.srcForm) {
        alert('Could not get <body> element from the template to transform !');
      }
      this.curDoc = xtDoc;
      this.targetContainerId = false;
    } else {
      alert('The document containing the template is null or undefined !');
    }
  },
  
  /**
   * Sets the document where the result of the transformation will be embedded.
   * targetDoc is the target document
   * targetContainerId is the identifier of the element that will embed the result
   * doReplace is a boolean indicating if the result replaces the children of the target
   * This method should be called only if the target document is different than the 
   * template to transform.
   * If you call this method you should have included the CSS style sheet for the editor 
   * in the target document.
   */ 
  setTargetDocument : function (aDoc, anId, doReplace) {
    this.curDoc = aDoc;
    this.targetContainerId = anId;
    this.doEmptyTarget = doReplace;
  },
                              
  // Transforms template into editor
  // log is an optional logger to report errors
  transform : function (logger) {
    // FIXME: check this.srcDoc is set...
    if (! this.srcForm) {
      this._report (0, 'no template to transform', logger);
      return false;
    }
    this.editor = new xtiger.editor.Generator (this.baseUrl);
    this.parser = new xtiger.parser.Iterator (this.srcDoc, this.editor);
    if (this.targetContainerId) { // checks if the transformation require a cross-document copy
      var n = this.curDoc.getElementById(this.targetContainerId);
      if (n) {        
        if (this.doEmptyTarget) {
          xtdom.removeChildrenOf (n);
        }
        xtdom.importChildOfInto (this.curDoc, this.srcForm, n);
        this.root = n;
      } else {
        this._report (0, 'transformation aborted because target container "' + this.targetContainerId + '" not found in target document', logger);
        return false;
      }
      this.parser.importComponentStructs (this.curDoc); // to import component definitions
    } else {
      this.root = this.srcForm;
    }   
    // lazy creation of keyboard manager & optional tab manager within the document session
    var kbd = xtiger.session(this.curDoc).load('keyboard');
    if (! kbd) {
      kbd = new xtiger.editor.Keyboard ();
      xtiger.session(this.curDoc).save('keyboard', kbd);
      // FIXME: someone should call removeDocument ( last document ) if this is no longer needed
      if (this.doTab) {     
        var tab = new xtiger.editor.TabGroupManager (this.root);
        kbd.setTabGroupManager(tab);
        xtiger.session(this.curDoc).save('tabgroupmgr', tab);
      }
    }
    // finally makes form available to other plugins (e.g. lens may need it to know where to insert their wrapper)
    xtiger.session(this.curDoc).save('form', this);
    this.parser.transform (this.root, this.curDoc);
    this._report (1, 'document transformed', logger);    
    return (this.status == 1);    
  },
  
  getEditor : function () {
    return this.editor;
  },

  getRoot : function () {
    return this.root;
  },
  
  // Call this method if you didn't include the style sheet in the document you have transformed to a form
  injectStyleSheet : function (url, logger) {   
    var head = this.curDoc ? this.curDoc.getElementsByTagName('head')[0] : null;
    if (head) {
      var link = document.createElement('link');
      link.setAttribute('rel','stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', url); 
      head.appendChild(link);
      this._report (1, 'stylesheet injected', logger);
    } else {
      this._report (0, "cannot inject editor's style sheet because target document has no head section", logger);
    }
    return (this.status == 1);    
  },   
  
  // Loads XML data into a template which has been previously loaded into a DOMDataSource
  loadData : function (dataSrc, logger) {                
    if (dataSrc.hasData()) {
      this.editor.loadData (this.root, dataSrc, this.loader);
      this._report (1, 'data loaded', logger);
    } else {
      this._report (0, 'data source empty', logger);      
    }
    return (this.status == 1);    
  },
  
  // Loads XML data into a template from a string
  loadDataFromString : function (str, logger) {
    var dataSource = new xtiger.util.DOMDataSource ();
    if (dataSource.initFromString (str)) {
      this.loadData(dataSource, logger);
    } else {
      this._report (0, 'failed to parse string data source', logger);
    }
    return (this.status == 1);
  },
  
  // Loads XML data into a template from a URL
  // FIXME: check url is { document: url1, name : url2, ... } for tide loading
  loadDataFromUrl : function (url, logger) {
    var doc, source;    
    var res = false;
    doc = xtiger.cross.loadDocument(url, logger);
    if (doc) {
      res = this.loadData(new xtiger.util.DOMDataSource(doc), logger);
    }
    return res;
  },
  
  // Dumps current form data into a DOMLogger accumulator
  /**
   * @param {Logger} The logger which 
   */
  serializeData : function (accumulator) {
    this.editor.serializeData (this.root, accumulator, this.serializer);
  },
  
  /////////////////////////////////////////////////////
  // Following functions are deprecated
  // or should be move somewhere else (xtiger.util.* ?)
  /////////////////////////////////////////////////////
  
  // DEPRECATED : use loadDataFromUrl instead
  // Loads data into the form from a file URL and a XMLHttpRequest object
  loadDataFromFile : function (url, xhr, logger) {
    try {
      xhr.open("GET", url, false);
      xhr.send(null);
      if ((xhr.status  == 200) || (xhr.status  == 0)) {
        if (xhr.responseXML) {
          this.loadData (new xtiger.util.DOMDataSource (xhr.responseXML), logger);
        } else {
          var res = xhr.responseText;
          res = res.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, ""); // bug 336551 MDC
          xtiger.cross.log('warning', 'attempt to use string parser on ' + url + ' instead of responseXML');
          if (! dataSource.initFromString(res)) { // second trial
            this._report (0, 'failed to create data source for data from file ' + url + '. Most probably no documentElement', logger);
          }
        }
      } else { 
        this._report(0, 'failed to load XML data from file ' + url + ". XHR status : " + xhr.status, logger);
      }
    } catch (e) {                                                                                          
      this._report(0, 'failed to open XML data file ' + url + ". Exception : " + e.name + '/' + e.message, logger);
    }
    return (this.status == 1);    
  },  
  
  // Saves XML content of the current document to a URL using XMLHTTPRequest
  postDataToUrl : function (url, xhr, logger) {   
    // 1. converts template to a string buffer
    var log = new xtiger.util.DOMLogger ();
    var data = this.editor.serializeData (this.root, log, this.serializer);
    log.close();
    // 2. sends it with a sycnhronous POST request
    try {
        xhr.open( "POST", url,  false);
      xhr.setRequestHeader("Content-Type", "application/xml; charset=UTF-8");
      // FIXME: do we need to set "Content-Length" ?
        xhr.send(log.dump('*')); // FIXME: not sure Javascript is UTF-8 by default ?
        if (xhr.readyState  == 4) {
            if((xhr.status  == 200) || (xhr.status  == 201) || (xhr.status  == 0)) {
          this._report(1, xhr.responseText, logger);
          } else { 
          this._report(0, 'can\'t post data to "' + url + '". Error : ' + xhr.status, logger);
        }
          } else {
        this._report(0, 'can\'t post data to "' + url + '". Error readyState is ' + xhr.readyState, logger);
      }
    } catch (e) {
      xhr.abort();
      this._report(0, 'can\'t post data to "' + url + '". Exception : ' + e.name + '/' + e.message, logger);
    }
    return (this.status == 1);    
  },  
                          
  // Firefox only
  // Saves form data into a file, filename must contain an absolute path (i.e. "/tmp/myFile") 
  saveDataToFile : function (filename, logger) {
    if (xtiger.cross.UA.gecko) { 
      // tries with an XPCOM component (nsILocalFile)   
      try {  
        netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");  
      } catch (e) { 
        this._report(0, 'Permission to save data to file "' + filename + '" was denied. Exception : ' + e.name + '/' + e.message, logger);
        return false;
      }  
      try {  
        // converts template to a string buffer
        var log = new xtiger.util.DOMLogger ();
        var data = this.editor.serializeData (this.root, log, this.serializer);
        log.close();
        // creates and/or saves file    
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);  
        file.initWithPath(filename);
        if (file.exists() == false) {  
          file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );  
        }  
        var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]  
                 .createInstance(Components.interfaces.nsIFileOutputStream);  
        outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );   
        //UTF-8 convert  
        var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]  
          .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);  
        uc.charset = "UTF-8";  
        var data_stream = uc.ConvertFromUnicode(log.dump('*'));
        var result = outputStream.write(data_stream, data_stream.length );  
        outputStream.close();
        this._report(1, 'Data saved to "' + filename + '"', logger);  
      } catch (e) { 
        this._report(0, 'Cannot save data to file "' + filename + '". Exception : ' + e.name + '/' + e.message, logger);
      }  
    } else { 
      // tries with XMLHttpRequest
      this.postDataToUrl (filename, xtiger.cross.getXHRObject());
    } 
    return (this.status == 1);    
  }
  
} 
