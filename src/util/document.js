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

(function() {  
  
  var _isLocalSession = function () {
    return (0 == document.location.href.indexOf('file://'));
  }            
  
  // Returns fn if the application hasn't been launched from a file:// URL
  // Returns a URL obtained by appending the path component of the file:// URL to fn otherwise
  var _getAbsoluteFilePath = function (fn) {
    if (fn.charAt(0) != '/') { // not an absolute path (except on Windows...)
      var localPath = document.location.href.match(/file:\/\/(\/.*)\/[^\/]*/); 
      if (localPath) {
        return (localPath[1] + '/' + fn);
      }
    }
    return fn;
  }
  
  var _succeed = function(spec, state, goal, fup) { 
    state.inError = false;
    state.msg = '';  
    if (state.level < 4) { 
      state.level += 1;
    } 
    if (fup && (state.level < goal)) { // climbs up one level
      fup(spec, state, goal);
    } else if (state.callback) {
      state.callback(state.owner);
      state.callback = null;
    }
  }

  var _fail = function(spec, state, msg) {    
    // FIXME: launch exception
    state.inError = true;
    state.message = msg;
    throw {
      name : 'AXEL_Error',
      message : msg + ' in xtiger.util.Document'
    } 
  }
  
  var _loadTemplate = function(spec, state, goal) {
    var result;                                  
    state.xtDoc = state.xtForm = null; // reset 
    spec.template = spec.template || document; // default
    if (typeof(spec.template) == 'string') { // assumes its a URL
      if (spec.inframe) { // loads it inside an iframe
        state.iframe = document.getElementById(spec.inframe);
        if (state.iframe) {                         
          var _spec = spec, // closure
            _state = state,
            _goal = goal;                                                    
          if (state.iframeCb) { // reentrant call, remove previous callback
            xtdom.removeEventListener(state.iframe, 'load', state.iframeCb, false);
          } 
          state.iframeCb = function(ev) { _frameLoaded(_spec, _state, _goal) };
          xtdom.addEventListener(state.iframe, 'load', state.iframeCb, false);
          state.iframe.setAttribute('src', spec.template);
          // FIXME: set timeout to detect failure (?)
        } else {
          _fail(spec, state, 'cannot find " + spec.inframe + " iframe');
        }
      } else { // loads it inside an XML Document
        result = new xtiger.util.Logger();
        state.xtDoc = xtiger.cross.loadDocument(spec.template, result);
        if (result.inError()) { 
          _fail(spec, state, result.printErrors());
        } else {
          _succeed(spec, state, goal, _transformTemplate);          
        }
      }
    } else if (typeof(spec.template) == 'object') {
      if (spec.template.transform) {
        // assumes it's an xtiger.util.Form object
        // no need for state.xtDoc
        state.xtForm = spec.template;
      } else {
        // assumes it's an XML Document, defaults to document
        state.xtDoc = spec.template;
      }                                                        
      _succeed(spec, state, goal, _transformTemplate);
    } else {
      _fail(spec, state, "wrong 'template' parameter type (" + typeof(spec.template) + ')');
    }   
  }          
  
  var _frameLoaded = function (spec, state, goal) {
    xtdom.removeEventListener(state.iframe, 'load', state.iframeCb, false);
    state.iframeCb = null;
    if (state.iframe.contentDocument) {
      state.xtDoc = state.iframe.contentDocument;
    } else if (iframe.contentWindow) { // IE7
      state.xtDoc = state.iframe.contentWindow.document;
    }   
    _succeed(spec, state, goal, _transformTemplate);
    // injects AXEL stylesheet (not sure if it's the right place)
    if ((spec.inframeCss) && (! state.inError) && (state.xtForm)) {
      if (! state.xtForm.injectStyleSheet(spec.inframeCss)) {
        _fail(spec, state, state.xtForm.msg);
        }
    }
  }
     
  var _transformTemplate = function(spec, state, goal) { 
    if (! state.xtForm) { 
      if (state.xtDoc) {
          if (spec.axel) {
            state.xtForm = new xtiger.util.Form(spec.axel);
          state.xtForm.setTemplateSource(state.xtDoc);
                state.xtForm.enableTabGroupNavigation();    
          if ((! spec.inframe) && spec.targetDocument) {
          state.xtForm.setTargetDocument.apply(state.xtForm, spec.targetDocument);
          }
          if (! state.xtForm.transform()) {   
          _fail(spec, state, state.xtForm.msg);
          } else {
          _succeed(spec, state, goal, _loadData);       
          }     
        } else {
          _fail(spec, state, "missing 'axel' library path parameter");   
        }
      } else  { 
        _fail(spec, state, "no template document object to transform");
      }              
    } 
  }          
                       
  // TODO : extract processing instructions if present !           
  var _loadData = function(spec, state, goal) {
    var result;
    state.xmlSrc = null; // reset
    if (spec.filename) {
      // loads filename     
      result = new xtiger.util.Logger();
      state.xmlSrc = xtiger.debug.loadDocument(spec.filename, result);
      if (result.inError()) { 
        _fail(spec, state, result.printErrors());
      } else {
        _succeed(spec, state, goal, _injectData);         
      }
    } else { // no data to load
      _succeed(spec, state, goal, _injectData);
    }
  }

  var _injectData = function(spec, state, goal) {
    state.xmlData = null; // reset
    if (state.xtForm && state.xmlSrc) {
      state.xmlData = new xtiger.util.DOMDataSource(state.xmlSrc);
      //state.xtForm.setLoader(...);
      if (state.xtForm.loadData(state.xmlData)) {
        _succeed(spec, state, goal);
      } else {
        _fail(spec, state, state.xtForm.msg);
      }     
    } else { // no data to load (FIXME: no xtForm should be an error)
      _succeed(spec, state, goal);
    }
  } 

  // Level meaning :
  // 0 - initialized, not operational
  // 1 - template loaded into memory
  // 2 - template transformed
  // 3 - xml source data loaded into memory or no source data
  // 4 - xml source data injected inside editor or no source data
  var _gotoLevel = function(level, spec, state) {
    if (state.level == 0) {
      _loadTemplate(spec, state, level);
    } else if (state.level == 1) {
      _transformTemplate(spec, state, level);
    } else if (state.level == 2) {    
      _loadData(spec, state, level);
    } else if (state.level == 3) {          
      _injectData(spec, state, level);
    }             
  }
              
  xtiger.util.Document = function(spec) {
    this.state = {      
      owner : this,
      level : 0,
      inError : false,
      message : '',
      callback : null
    }
    if (typeof(spec) == 'string') { // assumes AXEL library path as a string
      this.configure({ axel : spec });  
    } else { // assumes a hash of parameters
      this.configure(spec); 
    }
  } 

  xtiger.util.Document.prototype = {
    
    configure : function(spec) {
      this.spec = spec; // FIXME: copy & reset level
      return this;
    },    
                
    // asynchronous method
    edit : function(callback) {                 
      this.state.callback = callback;
      _gotoLevel(2, this.spec, this.state);
      return this;
    },

    // asynchronous method
    load : function(callback) {                 
      this.state.callback = callback;
      _gotoLevel(4, this.spec, this.state);            
      return this;
    },
               
    // TODO : save back processing instructions if present !
    save : function(callback) {
      this.state.url = null; // reset
      if (this.state.level < 2) {
        _fail(this.spec, this.state, 'save must be called after edit or load');
        return this;
      }     
      if (! this.spec.filename) {
        _fail(this.spec, this.state, "missing 'filename' parameter");
        return this;
      }
      this.state.url = _getAbsoluteFilePath(this.spec.filename);
      if (confirm('Are your sure you want to save data to "' + this.spec.filename + '" ?')) {
        if (xtiger.cross.UA.gecko && _isLocalSession()) { // Uses FF local save
          if (this.state.xtForm.saveDataToFile (this.state.url)) { 
            _succeed(this.spec, this.state, this.state.level, callback);
          } else {
            _fail(this.spec, this.state, this.state.xtForm.msg);
          }
        } else {
          if (this.state.xtForm.postDataToUrl(this.state.url, xtiger.cross.getXHRObject())) { 
            _succeed(this.spec, this.state, this.state.level, callback);
          } else {
            if (_isLocalSession()) {                                
              _fail(this.spec, this.state, 
                "most probably POST is not support by your browser when writing to the local file system");
            } else {
              _fail(this.spec, this.state, this.state.xtForm.msg);
            }
          }
        }                                  
      }
      return this;
    },
    
    dump : function() {         
      if (this.state.level >= 2) {
        return '<dump>';
      } else {
        _fail(this.spec, this.state, 'dump must be called after edit or load');
      }           
      return this;
    }
  }
})();                           

// var d = new xtiger.util.Document({template => document, filename => 'hello.xml', create => true});
// d.edit();
// d.save();                                    
// 
// var d = new xtiger.util.Document({
//  template => 'templates/howto.xhtml', 
//  inframe => 'editor',
//  indiv => 'editor'
//  filename => 'docs/howto-popup.xml', 
//  });
//  
// d.edit(function(d) { alert('Ready to Go !'); });    
// d.dump(function(content) { alert(content)});






