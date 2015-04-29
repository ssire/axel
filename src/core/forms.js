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
 
/*****************************************************************************\
|                                                                             |
|  xtiger.util.Logger module                                                  |
|                                                                             |
|  A logger for keeping error messages while performing error-prone actions   |
|  xtiger.util.Form uses it as an optional parameter to report errors         |
|                                                                             |
|*****************************************************************************|
|  NOTE: we most probably will deprecate this and use exceptions instead)     |
|                                                                             |
\*****************************************************************************/

xtiger.util.Logger = function () {
 this.errors = [];
}

xtiger.util.Logger.prototype = {

 // Returns true if the logger has recorded some error message
 inError : function () {
   return (this.errors.length > 0);
 },

 // Deprecated API
 logError : function (msg, data) {
   if (msg.indexOf('$$$') != -1) { 
     this.errors.push (msg.replace('$$$', '"' + data + '"'));
   } else {
     this.errors.push(msg);
   }
 },

 logLocaleError : function (key, values) {
   this.errors.push(xtiger.util.getLocaleString(key, values));
 },

 // Returns a concatenation of error messages
 printErrors : function () {
   return this.errors.join(';');
 }
}

 /*****************************************************************************\
 |                                                                             |
 |  xtiger.util.Form module                                                    |
 |                                                                             |
 |  WILL BE DEPRECATED - use $axel wrapper object instead                      |
 |                                                                             |
 |  Class for calling AXEL parser and generator to transform a template into   |
 |  an editor, then to load and/or save XML data from/to the editor.           |
 |                                                                             |
 |*****************************************************************************|
 |  This class can be used as en entry point to AXEL                           |
 |  You may prefer to use higher-level command objects defined in AXEL-FORMS   |
 |                                                                             |
 |  Note that we will probably migrate some or all of its functionalities      |
 |  into the $axel wrapper set object                                          |
 |                                                                             |
 |                                                                             |
 \*****************************************************************************/
 
// baseIconsUrl is the path to the icons used by the generated editor
xtiger.util.Form = function (baseIconsUrl) {
  this.baseUrl = baseIconsUrl;  
  this.doTab = false;  
  this.loader = this.serializer = null;
} 

xtiger.util.Form.prototype = {

  // Internal log mechanism that keeps track of a status
  _report : function (status, keyormsg, logger, values) {
    this.status = status;
    if (0 === this.status) {
      this.msg = xtiger.util.getLocaleString(keyormsg, values);
      if (logger) { 
        logger.logError(this.msg);
      } else {
        xtiger.cross.log('error', this.msg);
      }
    } else {
      this.msg = keyormsg; 
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
  setTemplateSource : function (xtDoc, logger) {
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
        this._report (0, 'errTemplateNoBody', logger);
      }
      this.curDoc = xtDoc;
      this.targetContainerId = false;
    } else {
      this._report (0, 'errTemplateUndef', logger);
    }
    this._report (1, 'template source set', logger);
    return (this.status === 1);
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

  setTarget : function (node, doReplace) {
    this.curDoc = node.ownerDocument;
    this.targetContainer = node;
    this.doEmptyTarget = doReplace || true;
  },
                              
  // Transforms template into editor
  // log is an optional logger to report errors
  transform : function (logger) {
    var parser;
    // FIXME: check this.srcDoc is set...
    if (! this.srcForm) {
      this._report (0, 'errNoTemplate', logger);
      return false;
    }
    this.editor = new xtiger.editor.Generator (this.baseUrl);
    parser = new xtiger.parser.Iterator (this.srcDoc, this.editor);
    if (this.targetContainer || this.targetContainerId) { // checks if the transformation require a cross-document copy
      var n = this.targetContainer || this.curDoc.getElementById(this.targetContainerId);
      if (n) {
        if (this.doEmptyTarget) {
          xtdom.removeChildrenOf (n);
        }
        xtdom.importChildOfInto (this.curDoc, this.srcForm, n);
        this.root = n;
      } else {
        this._report (0, 'errTransformNoTarget', logger, { 'id' : this.targetContainerId });
        return false;
      }
      parser.importComponentStructs (this.curDoc); // to import component definitions
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
    parser.transform (this.root, this.curDoc);
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
      var link = this.curDoc.createElement('link');
      link.setAttribute('rel','stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', url); 
      head.appendChild(link);
      this._report (1, 'stylesheet injected', logger);
    } else {
      this._report (0, 'errTargetNoHead', logger);
    }
    return (this.status == 1);
  },   
  
  // Loads XML data into a template which has been previously loaded into a DOMDataSource
  loadData : function (dataSrc, logger) {                
    if (dataSrc.hasData()) {
      this.editor.loadData (this.root, dataSrc, this.loader);
      this._report (1, 'data loaded', logger);
    } else {
      this._report (0, 'errNoData', logger);
    }
    return (this.status == 1);
  },
  
  // Loads XML data into a template from a string
  // DEPRECATED: use loadData instead plus initFromString to load the string into the data source
  loadDataFromString : function (str, logger) {
    var dataSource = new xtiger.util.DOMDataSource(str);
    this.loadData(dataSource, logger);
    return (this.status == 1);
  },
  
  // Dumps editor's content into a DOMLogger accumulator
  serializeData : function (accumulator) {
    this.editor.serializeData (this.root, accumulator, this.serializer);
  }
};