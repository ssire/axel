function runLoadSaveTest ( specs ) {
 	printIEMode ();
	var inspectView = new TestInspector();
	
	// XML loading algorithm selection
	var cb = document.getElementById('robustChekbox');
	var n = document.getElementById('results');
	var answer = document.createElement('p');
	answer.innerHTML =  "Using " + ((cb.checked) ? "robust"  : "basic") + " XML loading algorithm";
	n.appendChild(answer);		
	                         
	// Test creation and execution for each test line in configuration
	for (var t in specs) {
		var test = new TestEntry ( t, specs[t], inspectView, (cb.checked) ? robustLoader : basicLoader );
		test.runTest( createLog() );
	} 
}

/////////////////////////////////////
// TestEntry Class
/////////////////////////////////////

function TestEntry (template, data, inspector, xmlLoader) {
	this.templateFile = template;
	this.xmlFile = data;
	this.inspector = inspector;
	this.template = null;
	this.xml = null;
	this.logEntry = null;
	this.xmlSrc = null;
	this.xmlDump = null;
	this.statusMsg = 'not tested';
	this.xmlLoader = xmlLoader;      
	if (! xmlLoader)
		alert('TestEntry loading algorithm is null, fallback to default one !');
}

TestEntry.prototype = {
	
	// Runs the test on a log entry line
	runTest : function (logEntry) {
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

					/* 3. load xml data */ 
					logAction(this.logEntry, 'loading data', this.xmlFile)
					var xmlDoc = loadDocument(this.xmlFile, result);
					if (xmlDoc) {
						var dataSrc = new xtiger.util.DOMDataSource(xmlDoc[1]);
						form.setLoader(this.xmlLoader);
						if (form.loadData(dataSrc, result)) {

							/* 4. serialize xml data */ 
							logAction(this.logEntry, 'serializing data', this.xmlFile)
							var dump = new xtiger.util.DOMLogger ();
							form.serializeData (dump);
							var xmlString = dump.dump('*');
							this.xmlSrc = canonical(xmlDoc[0]);
							this.xmlDump = canonical(xmlString);
							if (! compare(this.xmlSrc, this.xmlDump)) { 
								result.logError('XML comparison failed');
							} else {
								this.statusMsg = 'success';
								logStatus(this.logEntry, 'passed', 'PASSED', this);
							}
						}
					}
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
function TestInspector () {
	this.showBtn = null;
	this.curEntry = null;
}

TestInspector.prototype = {
	
	inspect : function (test) {
		this.showBtn || this.install();
		if ((! this.curEntry) || (this.curEntry != test)) {
			this.setStatus( test.statusMsg );
			this.setTemplateFile( test.templateFile );
			this.setDataFile( test.xmlFile, test.xmlSrc, test.xmlDump );
			var n = document.getElementById('templateContainer'); // reset
			xtdom.removeChildrenOf(n);
			this.curEntry = test;
		}
	},
	
	install : function () {
		var n = document.getElementById('load-template');
		if (n) {
			n.style.display = 'inline';
			var _this = this; // closure
			xtdom.addEventListener( n, 'click', function (ev) { _this.showTemplate() } );
		}
	},

	setStatus : function (msg) {
		var n = document.getElementById('status');
		n.firstChild.data = msg;
	},
	
	setTemplateFile : function (file) {
		var n = document.getElementById('template-file');
		n.setAttribute('href', file)
		n.firstChild.data = file;
	},

	setDataFile : function (file, srcContent, dumpContent) {
		var n = document.getElementById('xml-data-file');
		var src = document.getElementById('src');
	    var dump = document.getElementById('dest');
		n.setAttribute('href', file);
		n.firstChild.data = file;
		printDiff(srcContent, dumpContent, src, dump);
	},
	
	showTemplate : function () {
		var ok = false;
		// 1. Transforms template into target div
		var form = new xtiger.util.Form('../../axel/bundles');
		form.setTemplateSource (this.curEntry.template); 
		form.setTargetDocument (document, 'templateContainer', true);
		form.enableTabGroupNavigation ();
		if (ok = form.transform ()) {
			
			// 2. Loads test data into template
			var xmlDoc = xtiger.debug.loadDocument (this.curEntry.xmlFile); // prints its own alert
			// we cannot reuse xmlDoc from this.curEntry because DOMDataSource "consumes" attributes
			if (xmlDoc) {
				var dataSrc = new xtiger.util.DOMDataSource(xmlDoc);
				ok =  form.loadData(dataSrc);
			}
		}
		ok || alert(form.msg);
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

/* NOT USED BELOW THIS POINT */

		        /* XML sample */
			    var s = "\
		<greetings>\
		  <persons>\
		    <name>A</name>\
		    <name>B</name>\
		  </persons>\
		</greetings>";

			    var ss = "\
		<greetings>\
		  <persons>\
		    <name>D</name>\
		    <name>B</name>\
		    <name>E</name>\
		  </persons>\
		</greetings>";