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
			this.template = xtiger.debug.loadDocument(this.templateFile, result);
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
		// 	    var dump = document.getElementById('dest');
		// n.setAttribute('href', file);
		// n.firstChild.data = file;
	}

}

// Load an XML document from a URL
// Returns null if it cannot get either text content or XML document content
// Returns an Array of both otherwise
function loadDocument (url, logger) {
	var res = null;
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
				res = [xtDoc.xml, xtDoc]; // xtDoc.xml is the source text
			}
		} catch (e) {
			errMsg = e.name;
			xtDoc = null;			
		}
		if (errMsg) {
			logger.logError('Error while loading $$$ : ' + errMsg, url);	    	
		}		
	} else {	
		var xhr = xtiger.cross.getXHRObject ();
		try {  
			xhr.open("GET", url, false); // false:synchronous
			xhr.send(null);
			if ((xhr.status  == 200) || (xhr.status  == 0)) { // 0 is for loading from local file system
				if (xhr.responseText) {
					res = [xhr.responseText];
					if (xhr.responseXML) {
						res.push(xhr.responseXML);
					} else if (logger) {
						res = null;
						logger.logError('document "$$$" xml data null', url);
					}
				} else if (logger) {
					res.push('');     
					logger.logError('document "$$$" text data empty', url);
				}
			} else if (logger) { 
				var explain = xhr.statusText ? '(' + xhr.statusText + ')' : ''; 
				logger.logError('HTTP error while loading "$$$", status code : ' + xhr.status + explain, url);
			}
	 	} catch (e) {        
			if (logger) {	
				logger.logError('Exception while loading "$$$" : ' + (e.message ? e.message : e.name), url); 
			}
	 	} 
	}
	return res;
}