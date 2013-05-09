var inspectView = null;
var serializer = null;

// Name is the URL of the template to schematize
function schematize ( name ) {
    // printIEMode ();
  var n = document.getElementById('templateFile');
  if (n && (n.value.search(/\S/) != -1)) {
    if (! inspectView) {
      inspectView = new SchemaInspector();
    }
    if (! serializer) {
      serializer = new xtiger.editor.SchemaSerializer ();
    }
    var test = new SchemaEntry (n.value, inspectView, serializer);
    test.schematize( createLog() );
  } else {
    alert('Enter a template path first !');
  }
}

// FIXME: LogEntry class to hold on results (diff results)

function createLog () {
  var n = document.getElementById('results');
  var entry = document.createElement('p');
  entry.setAttribute('class', 'result');
  n.appendChild(entry);
  return entry;
}

function logAction (node, action, file) {
  node.innerHTML = "<span class='action'>" + action + "</span> <span class='file'>" + file.replace('&', '&amp;', 'g') + "</span>";
}

// Adds a <span> with status info and <a> link to test data
function logStatus (node, type, value, test) {
  var span = xtdom.createElement(document, 'span');
  xtdom.addClassName(span, type);
  span.appendChild( xtdom.createTextNode(document, ' ' + value + ' ') );
  node.appendChild(span);
  var a = xtdom.createElement(document, 'span');
  a.appendChild( xtdom.createTextNode(document, '[inspect]') );
  xtdom.addClassName(a, 'button-link');
  node.appendChild(a);
  xtdom.addEventListener( a, 'click', function (ev) { test.inspect() } ) // closure
}

function logSuccess (message) {
  var n = document.getElementById('results');
  var answer = document.createElement('p');
  answer.setAttribute('class', 'result');
  var buffer = message + "<span class='passed'>PASSED</span>";
  answer.innerHTML = buffer;
  n.appendChild(answer);
}

function logFailure (message) {
  var n = document.getElementById('results');
  var answer = document.createElement('p');
  answer.setAttribute('class', 'result');
  var buffer = message + "<span class='passed'>FAILED</span>";
  answer.innerHTML = buffer;
  n.appendChild(answer);
}


/////////////////////////////////////
// SchemaEntry Class
/////////////////////////////////////

function SchemaEntry (template, inspector, serializer) {
  this.templateFile = template;
  this.inspector = inspector;
  this.template = null;
  this.logEntry = null;
  this.xmlString = null;
  this.serializer = serializer;
  this.statusMsg = 'not serialized';
}

SchemaEntry.prototype = {

  //
  schematize : function (logEntry) {
    this.logEntry = logEntry;
    var result = new xtiger.util.Logger();

    /* 1. load template */
      try {
      logAction(this.logEntry, 'loading template', this.templateFile);
      this.template = xtiger.cross.loadDocument(this.templateFile, result);
      if (this.template) {
        form = new xtiger.util.Form('../../axel/bundles');
        form.setTemplateSource (this.template);

        /* 2. transform template */
        logAction(this.logEntry, 'transforming template', this.templateFile)
        form.setTargetDocument (document, 'resultContainer', true)
        if (form.transform (result)) {

          /* 3. genetate schema */
          logAction(this.logEntry, 'generating schema', this.templateFile)
          var dump = new xtiger.util.SchemaLogger();
          form.setSerializer(this.serializer);
          form.serializeData(dump);
          this.xmlString = dump.dump('*');
          this.statusMsg = 'success';
          logStatus(this.logEntry, 'passed', 'PASSED', this);
        }
      }
    } catch (e) {
      result.logError('Exception ' + e.name + e.message);
      }
    if (result.inError()) {
      this.statusMsg = result.printErrors();
      logStatus(this.logEntry, 'failed', 'FAILED', this);
    }
  },

  // Shows this test entry inside the inspector
  inspect : function () {
    this.inspector.inspect(this);
  }
}


// Inspector view controller
function SchemaInspector () {
  this.curEntry = null;
}

SchemaInspector.prototype = {

  inspect : function (test) {
    if ((! this.curEntry) || (this.curEntry != test)) {
      this.setStatus(test.statusMsg);
      this.setDataFile(test.xmlString);
      this.curEntry = test;
    }
  },

  setStatus : function (msg) {
    var n = document.getElementById('status');
    n.firstChild.data = msg;
  },

  setDataFile : function (dumpContent) {
    // var n = document.getElementById('xml-data-file');
    var src = document.getElementById('src');
    xtdom.removeChildrenOf(src);
    var output = xtdom.createElement(document, 'pre');
    var c = xtdom.createTextNode(document, dumpContent);
    output.appendChild(c);
    src.appendChild(output);
    //      var dump = document.getElementById('dest');
    // n.setAttribute('href', file);
    // n.firstChild.data = file;
  }
}
