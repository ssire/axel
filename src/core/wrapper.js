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
|  AXEL Wrapper                                                               |
|                                                                             |
|  wrapped set function (access to primitive editors a-la jQuery)             |
|  extended with some global management functions                             |
|  exposed as GLOBAL.$axel                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Wrapped set:                                                               |
|    $axel (node(s) | string, seethrough)                                     |
|             returns a wrapped set of primitive editor(s) within             |
|             the DOM node(s) or a string $ (jQuery) selector                 |
|             also includes unselected choice slices if seethrough is true    |
|             the string argument will be interpreted if and only if a $      |
|             function is defined                                             |
|             note that if the DOM nodes passed as argument are already       |
|             inside an unselected slice, they will be included into the      |
|             set whatever the slice is selected or not                       |
|                                                                             |
|  Global functions:                                                          |
|    extend (target, source, proto)                                           |
|             utility method to merge objects                                 |
|                                                                             |
\*****************************************************************************/

// TODO:
// - $axel().execute() to execute command (integration with $axel.command)

(function (GLOBAL) {

  var settings = {}; // cached $axel settings
  var MAX = 10000;
  var TOTAL;

  function _frameDoc ( n ) {
    return n.contentDocument || (n.contentWindow ? n.contentWindow.document : n);
  }

  // Triggers an event on the specified node iff jQuery available
  // Non bubbling event to simplify multiple editors handling in the same page
  // Also duplicates the event on the document
  function _triggerEvent ( src, event, data ) {
    if ('undefined' !== typeof window.jQuery) {
      $(src).triggerHandler(event, data);
      $(src.ownerDocument).triggerHandler(event, data.first);
    }
  }

  // AXEL proteiform error message function (exported as $axel.error)
  function _raiseError ( msg, opt ) {
    if (typeof opt === "function") {
      opt(msg);
    } else if ((typeof opt === 'object') && opt.error) {
      opt.error(msg);
    } else if (typeof settings.error === "function") {
      settings.error(msg);
    } else {
      alert(msg);
    }
  }

  // Entry point when wrapped set coincide with an editor's root
  // because _nodeIter does not traverse editor's root to skip embedded editors
  function _nodeEditorIter (n, accu, seethrough) {
    if (n.xttPrimitiveEditor) {
      accu.push(n.xttPrimitiveEditor);
    }
    if (n.firstChild) {
      _sliceIter(n.firstChild, n.lastChild, accu, seethrough);
    }
  }

  function _nodeIter (n, accu, seethrough) {
    if (++TOTAL > MAX) {
      xtiger.cross.log('error', 'reached iteration limit (' + MAX + ')');
      return;
    }
    if (n.xttHeadLabel) {
      xtiger.cross.log('debug', 'wrapped set stopped on internal editor boundary of ' + n.xttHeadLabel);
       return;
    }
    if (n.xttPrimitiveEditor) {
      accu.push(n.xttPrimitiveEditor);
    }
    if (n.firstChild) {
      _sliceIter(n.firstChild, n.lastChild, accu, seethrough);
    }
  }

	// origin is optional, it is the Choice editor from where a recursive call has been initiated
  function _sliceIter (begin, end, accu, seethrough, origin) {
    var cur = begin,
        go = true,
        c;
    if (TOTAL++ > MAX) {
      xtiger.cross.log('error', 'reached iteration limit (' + MAX + ')');
      return;
    }
    while (cur && go) {
      // manage repeats
      if (cur.startRepeatedItem && !seethrough) {
        if (cur.startRepeatedItem.getSize() === 0) { // nothing to serialize in repeater (min=0)
          // jumps to end of the repeater
          cur = cur.startRepeatedItem.getLastNodeForSlice(0);
          // in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
          cur = cur.nextSibling;
          continue;
        }
      }
      if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        c = cur.beginChoiceItem;
        if (c.items[c.curItem][0] !== c.items[c.curItem][1]) {
          _sliceIter(c.items[c.curItem][0], c.items[c.curItem][1], accu, seethrough, c);
        } else {
          // a choice slice starts and end on the same node
          _nodeIter(c.items[c.curItem][0], accu, seethrough);
        }
        cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
        // xtiger.cross.log('debug', 'jump to end of last slice ' + cur.tagName ? cur.tagName : '#t');
      } else {
        // FIXME: we have an ambiguity <xt:use types="a b"><xt:use label="within_a"...
        // and <xt:use label="within_a"><xt:use types ="a b"....
        /// The current implementation will privilege First interpretation
        _nodeIter(cur, accu, seethrough); // FIXME:  first interpretation
      }
      if (cur === end) {
        go = false;
      }
      cur = cur.nextSibling;
    }
  }

  // Fake DOMLogger used to collect text content only (PCData)
  function _Logger () {
    this.stack = [];
  }

  _Logger.prototype = {

    discardNodeIfEmpty : function () {
    },

    write : function (text) {
      this.stack.push(text);
    },

    dump : function () {
      return this.stack.join(' ');
    },

    openTag : function (name) {
    },

    closeTag : function (name) {
    },

    reset : function () {
      this.stack = []
    }
  };

  function _WrappedSet (targets, seethrough) {
    this.seethrough = seethrough; // to show optional repetitions content
    this.targets = targets; // FIXME: should we make a copy ?
    this.first = targets[0];
  }

  _WrappedSet.prototype = {

    // lazy evaluation for wrapped set node list
    _list : function () {
      var i, tmp;
      // xtiger.cross.log('debug', 'reset wrapped set iteration counter (' + TOTAL + ')');
      TOTAL = 0;
      if (this.targets) {
        this.list = [];
        if (this.first && this.first.nodeName.toLowerCase() === 'iframe') { // rewrites targets to explore inner frame document
          this.targets = [_frameDoc(this.first)];
        }
        for (i = 0; i < this.targets.length; i++) {
          if ((i === 0) && this.first && this.first.xttHeadLabel) {
            _nodeEditorIter(this.targets[i], this.list, this.seethrough);
          } else {
            _nodeIter(this.targets[i], this.list, this.seethrough);
          }
        }
        delete this.targets;
      }
      return this.list;
    },

    // The function transforms an XTiger XML template and inserts the result inside the first wrapped set element
    // The XTiger XML template may be specified a) as an XML document, b) as an optional url string from where
    // it will be loaded first, or otherwise c) it is assumed to be embedded inside the first wrapped set element
    // with the xt:head section inside the current document.
    // An optional hash configuration object may be passed to overwrite some transformation parameters.
    transform : function ( optTemplate ) {
      var form, status, editor, bp, tabnav, isframe = false, config = {}, done = false;
      // initializations
      if (typeof optTemplate === 'object') { // either configuration object or XML document
        if (optTemplate.doctype) { // FIXME: test for XML / XHTML doctype ?
          editor = optTemplate; // assumes an XML document
        } else {
          config = optTemplate;
        }
      }
      if (arguments.length > 1) {
        config = arguments[1]; // in 2nd position
      }
      bp = config.bundlesPath || settings.bundlesPath;
      tabnav = (config.enableTabGroupNavigation === true) || settings.enableTabGroupNavigation;
      // transformation
      if (bp) {
        if (this.first) {
          this.first.xttHeadLabel = undefined; // reset previous transformed template expando info (see transformed() function)
          status = new xtiger.util.Logger();
          try { // load and transform template
            if (this.first.nodeName.toLowerCase() === 'iframe') {
              editor = _frameDoc(this.first);
              if (!editor) {
                status.logLocaleError('errTransformIframeSecurity');
              }
              isframe = true;
            } else if (editor === undefined) {
              editor = typeof optTemplate === 'string' ? new xtiger.cross.loadDocument(optTemplate, status) : this.first.ownerDocument;
            }
            if (editor && !status.inError()) {
              form = new xtiger.util.Form(bp);
              if (editor !== this.first.ownerDocument) {
                form.setTemplateSource(editor);
                if (!isframe) {
                  form.setTarget(this.first, true);
                }
              } else {
                form.srcDoc = this.first.ownerDocument;
                form.curDoc = this.first.ownerDocument;
                form.srcForm = this.first;
              }
              if (tabnav) {
                form.enableTabGroupNavigation();
              }
              form.transform(status);
              // overwrites latest transformed editor (mainly used in demo editor and 'photo') (TO BE DEPRECATED ?)
              xtiger.session(this.first.ownerDocument).save('form', this);
              if (config.injectStylesheet) {
                form.injectStyleSheet(config.injectStylesheet);
              }
            }
            if (status.inError()) {
              _raiseError(status.printErrors(), config);
            } else {
              if (form) {
                this.first.xttHeadLabel = form.getEditor().headLabel;
                done = true;
              } else {
                _raiseError(xtiger.util.getLocaleString('errTransformUnknown'), config);
              }
            }
          } catch (e) {
            _raiseError(xtiger.util.getLocaleString('errException', { e : e}), config);
          }
        } else {
          _raiseError(xtiger.util.getLocaleString('errEmptySet4Template'), config);
        }
      } else {
        _raiseError(xtiger.util.getLocaleString('errNoBundlesPath'), config);
      }
      if (done) {
        _triggerEvent(this.first,'axel-editor-ready', this);
      } else {
        _triggerEvent(this.first,'axel-transform-error', this);
      }
      return this;
    },

    // Use options to pass options : 'serializer' : algorithm object
    // and/or 'logger' : a DOMLogger instance for explicit logging
    xml : function ( options ) {
      var algo, accu, res = '',
          config = options || {};
      if (this.first) {
        accu = config.logger || new xtiger.util.DOMLogger();
        algo = config.serializer || settings.serializer || xtiger.editor.Generator.prototype.defaultSerializer;
        if (algo) {
          algo.serializeData((this.first.nodeName.toLowerCase() === 'iframe') ? _frameDoc(this.first) : this.first, accu, this.first.xttHeadLabel);
          res = accu.dump();
        } else {
          _raiseError(xtiger.util.getLocaleString('errNoSerializer'), config);
        }
      }
      return res;
    },

    // Load XML data into the 1st node of the wrapped set
    // The source may be an XML string, a URL string, an XML document object
    // It may be followed by an optional configuration hash with a 'loader' algo object key and a 'source' key
    load : function ( source ) {
      var algo, dataSrc, status, input, config = {};
      if (arguments.length > 1) {
        config = arguments[1]; // in 2nd position
      }
      if (this.first) {
        algo = config.loader || settings.loader || xtiger.editor.Generator.prototype.defaultLoader;
        status = new xtiger.util.Logger();
        if (algo) {
          if (typeof source === "string") {
            if (source.replace(/^\s*/,'').charAt(0) !== '<') { // assumes URL
              source = xtiger.cross.loadDocument(source, status);
            }
          } else if (! source) {
            status.logLocaleError('errDataSourceUndef')
          }
          if (source && !status.inError()) {
            dataSrc = new xtiger.util.DOMDataSource(source);
            // FIXME: check dataSrc is not in error (FF returns a <parseerror> element)
            algo.loadData((this.first.nodeName.toLowerCase() === 'iframe') ? _frameDoc(this.first) : this.first, dataSrc);
            _triggerEvent(this.first,'axel-content-ready', this);
          } else {
            _raiseError(status.printErrors(), config);
          }
        } else {
          _raiseError(xtiger.util.getLocaleString('errNoLoader'), config);
        }
      } else {
        _raiseError(xtiger.util.getLocaleString('errEmptySet4XML'), config);
      }
      return this;
    },

    // Return true if the first node in wrapped set has been transformed to an editor
    transformed : function () {
      return this.first && (typeof this.first.xttHeadLabel === 'string');
    },

    length : function () {
      return this._list().length;
    },

    get : function (rank) {
      return this._list()[rank];
    },

    clear : function (propagate) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].clear(propagate);
      }
      return this;
    },

    update : function (data) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].update(data);
      }
      return this;
    },

    text : function () {
      var i, list = this._list(), logger = new _Logger();
      for (i = 0; i < list.length; i++) {
        list[i].save(logger);
      }
      return logger.dump();
    },

    values : function () {
      var i, list = this._list(), logger = new _Logger(), res = [];
      for (i = 0; i < list.length; i++) {
        list[i].save(logger);
        res.push(logger.dump());
        logger.reset();
      }
      return res;
    },

    configure : function (option, value) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].configure(option, value);
      }
      return this;
    },

    apply : function (func, toHandle) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        func(toHandle ? list[i].getHandle() : list[i]);
      }
      return this;
    },

    //////////////////////////////////////////////
    // Experimental vector (calculus) extension //
    //////////////////////////////////////////////

    // Returns 1st value of first element with name tag in wrapped set or undefined if no match
    // Converts result to a float for a number, the optional neutral element (0) for an empty string,
    // or the value itself otherwise (a string)
    // TODO: - extend name to support (partial) XPath
    peek : function (name, optNeutral) {
      var logger = new _Logger(), // FIXME: getData API
          list = this._list(),
          i, res, num;
      for (i = 0; i < list.length; i++) {
        if (list[i].getHandle().xttOpenLabel === name) {
          list[i].save(logger);
          res = logger.dump();
          if ((res != '')  && ! isNaN(res)) {
            res = parseFloat(res);
          } else {
            res = optNeutral ? optNeutral : 0
          }
          return res;
        }
      }
    },

    // Sets value of first element with name tag in wrapped set
    poke : function (name, value) {
      var list = this._list(), i, h;
      for (i = 0; i < list.length; i++) {
        if (list[i].getHandle().xttOpenLabel === name) {
          if (typeof value === 'object') {
            for (var p in value){
              if (value.hasOwnProperty(p)) {
                if ('#val' === p) {
                  list[i].update(value[p]+'');
                } else {
                  h = list[i].getHandle();
                  if (h.style) {
                    h.style[p] = value[p];
                  }
                }
              }
            }
          } else {
            list[i].update(value+'');
          }
          break;
        }
      }
      return this;
    },
    
    // Removes latest computed vector from the stack
    flush : function () {
      this._vector.pop();
      return this;
    },

    // Internally stores the sequence of elements with name tag in wrapped set
    // Note: you can retrieve the vector with identity() function
    // TODO:
    // - extend to support (partial)XPath
    vector : function (name, optNeutral) {
      var neutral, filter, logger = new _Logger(); // FIXME: getData API
      if (optNeutral && $.isFunction(optNeutral)) {
        filter = optNeutral;
      } else {
        neutral = optNeutral ? optNeutral : 0;
        filter = function(x) { var r = parseFloat(x); return isNaN(r) ? neutral : r; }
      }
      if (! this._vector) {
        this._vector = new Array();
      }
      this._vector.push(
        $.map(this._list(), function (e, i) {
          var tmp;
          if (e.getHandle().xttOpenLabel === name) {
            e.save(logger);
            tmp = logger.dump();
            logger.reset();
            return filter(tmp);
          }
        })
      );
      return this;
    },

    product : function ( konst ) {
      var i, total, left, right, res = 0;
      total = this._vector ? this._vector.length : 0;
      if (total > 0) {
        if (konst) {
          left = this._vector[total -1];
          total = left.length;
          for (i = 0; i < total; i++) {
            left[i] *= konst;
          }
          res = this;
        } else if (total > 1) {
          left = this._vector[total - 2];
          right = this._vector.pop();
          total = left.length;
          for (i = 0; i < total; i++) {
            res = right[i];
            if (res) {
              left[i] *=  res;
            }
          }
          res = this;
        } else if (this._vector[0].length > 0) { // FIXME ? not chainable ?
          res = this._vector[0].reduce(function(p,c) { return p*c });
        }
      }
      return res;
    },

    sum : function () {
      var i, total, left, right, res = 0;
      total = this._vector ? this._vector.length : 0;
      if (total > 0) {
        if (total > 1) {
          left = this._vector[total - 2];
          right = this._vector.pop();
          total = left.length;
          for (i = 0; i < total; i++) {
            res = right[i];
            if (res) {
              left[i] +=  res;
            }
          }
          res = this;
        } else if (this._vector[0].length > 0) {
          res = this._vector[0].reduce(function(p,c) { return p+c });
        }
      }
      return res;
    },

    identity : function (rank) {
      var total = this._vector ? this._vector.length : 0,
          i = rank || 0;
      if (total > 0) {
        i = (i > 0) ? i : total - 1 + i;
        return this._vector[i];
      } else {
        return 0;
      }
    }
  }

  // Creates AXEL wrapped set function and global object
  var _axel = function axel_ws (nodes, seethrough, doc) {
    var target;
    if (typeof nodes === 'string') { // jQuery selector
      if (GLOBAL.jQuery) {
        target = $(nodes, doc || document).get();
      } else {
        xtiger.cross.log('warning', 'jQuery missing to interpet wrapped set selector "' + nodes  + '"');
        target = [];
      }
    } else if (Object.prototype.toString.call(nodes) === "[object Array]") { // array of DOM nodes
      target = nodes;
    } else if (GLOBAL.jQuery && (nodes instanceof GLOBAL.jQuery)) { // wrapped set
      target = nodes.get();
    } else if (nodes) {
      target = [ nodes ];
    } else {
      xtiger.cross.log('warning', 'empty wrapped set selector');
      target = [];
    }
    return new _WrappedSet(target, seethrough);
  };

  // Extends a target object's with the own properties and methods
  // of a source object whenever they are not already defined
  // if proto is true extends the target's prototype
  // if force is true extends even if already defined
  _axel.extend = function extend (target, source, proto, force) {
    if (proto) {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target.prototype[x] === "undefined")) {
            target.prototype[x] = source[x];
          }
        }
      }
    } else {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target[x] === "undefined")) {
            target[x] = source[x];
          }
        }
      }
    }
  };

  _axel.setup = function setup ( hash ) {
    _axel.extend(settings, hash);
  };
  _axel.error = _raiseError;
  _axel.defaults = settings;
  // Limits max iteration counter
  _axel.setIterationLimit = function (nb) { MAX = nb; };

  GLOBAL.$axel = _axel;
}(window));
