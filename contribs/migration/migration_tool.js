/**
 * <p>
 * Takes the url in the input field, creates if necessary the inspector and
 * instanciates the serializer, then create a schema entry with the url, the 
 * inspector and the serializer.
 * </p>
 * 
 * @return
 */
function schematize ( aFrameNbr ) {
    // printIEMode ();
	var n = document.getElementById('templateFile' + aFrameNbr);
	if (n && (n.value.search(/\S/) != -1)) {
		var _schemaEntry = new SchemaEntry (n.value, aFrameNbr);
		_schemaEntry.schematize( createLog() );
	} else {
		alert('Enter a template path first !');
	}
}

/**
 * Load an xml file into the lower div
 * @return
 */
function xmlFileLoad () {
	var input = document.getElementById('xmlFile');
	if (input && (input.value.search(/\S/) != -1)) {
		if(_XMLViewer.loadFromUrl(input.value))
			_XMLViewer.show();
	}
}

/**
 * Loads the XML data stored in the viewer in the selected template
 * 
 * @param frameNbr The number of the template
 */
function xmlLoad (frameNbr) {
	if (!_XMLViewer.hasData())
		return;
	var cb = document.getElementById('loader');
	curTemplates[frameNbr].setLoader( cb.checked ? robustLoader : basicLoader );
	curTemplates[frameNbr].loadDataFromString(_XMLViewer.getAsString());
}
function xmlSave (frameNbr) {
	if (!curTemplates[frameNbr])
		return;
	var log = new xtiger.util.DOMLogger();
	curTemplates[frameNbr].setSerializer(basicSerializer);
	curTemplates[frameNbr].serializeData(log);
	_XMLViewer.loadAsString(log.dump());
	_XMLViewer.show();
}

// FIXME: LogEntry class to hold on results (diff results)

function createLog () {
	var n = document.getElementById('log');
	var entry = document.createElement('p');
	entry.setAttribute('class', 'result');
	n.appendChild(entry);
	return entry;
}

function logAction (node, action, file) {
	node.innerHTML = "<span class='action'>" + action + "</span> <span class='file'>" + file.replace('&', '&amp;', 'g') + "</span>";
}

// Adds a <span> with status info and <a> link to test data
/**
 * Updates a log entry with a message
 */
function logStatus (aLogNode, type, value, aSchemaEntry) {
	var span = xtdom.createElement(document, 'span');
	xtdom.addClassName(span, type);
	span.appendChild( xtdom.createTextNode(document, ' ' + value + ' ') );
	aLogNode.appendChild(span);
}

function logSuccess (aLogNode, aMessage) {
	var span = xtdom.createElement(document, 'span');
	xtdom.addClassName(span, 'result');
	var buffer = "<span class='passed'> PASSED </span>" + aMessage;
	span.innerHTML = buffer;
	aLogNode.appendChild(span);
}

function logFailure (aLogNode, aMessage) {
	var span = xtdom.createElement(document, 'span');
	xtdom.addClassName(span, 'result');
	var buffer = "<span class='failed'> FAILED </span>" + aMessage;
	span.innerHTML = buffer;
	aLogNode.appendChild(span);
}


/////////////////////////////////////
// SchemaEntry Class
/////////////////////////////////////

function SchemaEntry (aTemplateUrl, aFrameNbr) {
	this.templateUrl = aTemplateUrl;
	this.frameNbr = aFrameNbr;
	this.inspector = inspectorViews[aFrameNbr];
	this.template = null;
	this.logEntry = null;
	this.xmlString = null;
	this.statusMsg = 'not serialized';
}

SchemaEntry.prototype = {
	
	// 
	schematize : function (logEntry) {
		this.logEntry = logEntry;
		var result = new xtiger.util.Logger();	

		/* 1. load template */ 
	    try {	
			logAction(this.logEntry, 'loading template', this.templateUrl);
			this.template = xtiger.debug.loadDocument(this.templateUrl, result);
			if (this.template) {
				form = new xtiger.util.Form('../../axel/bundles');
				form.setTemplateSource (this.template); 

				/* 2. transform template */ 
				logAction(this.logEntry, 'transforming template', this.templateUrl)
				form.setTargetDocument (document, ('template' + this.frameNbr), true);
				if (form.transform (result)) {

					/* 3. generate schema */ 
					logAction(this.logEntry, 'generating schema', this.templateUrl)
					var _schemaLogger = new xtiger.util.SchemaLogger();
					form.setSerializer(serializer);
					form.serializeData(_schemaLogger);
					this.xmlString = _schemaLogger.dump('*');
					this.statusMsg = 'success';
					this.inspect();
					logSuccess(this.logEntry, ' loaded in frame ' + this.frameNbr);
					curTemplates[this.frameNbr] = form;
				}
			} 
		} catch (e) {
			result.logError('Exception ' + e.name + e.message);
	    }     
		if (result.inError()) {	
			this.statusMsg = result.printErrors();
			logFailure(this.logEntry, result.printErrors());
		}
	},
	
	// Shows this test entry inside the inspector
	inspect : function () {
		this.inspector.inspect(this);
	}
}


// Inspector view controller
function SchemaInspector (id) {
	this.id = id;
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
		var src = document.getElementById('src' + this.id);
		xtdom.removeChildrenOf(src);
		var output = xtdom.createElement(document, 'pre');
		var c = xtdom.createTextNode(document, dumpContent);
		output.appendChild(c);
		src.appendChild(output);
	}

}

/**
 * This class manages the XML document view
 */
function XMLViewer () {
	this.currentXML = null;
	this.currentXMLString = null;
	this.logEntry = null;
	this.view = document.getElementById('dataContainer');
}
XMLViewer.prototype = {
	/**
	 * Loads a file into the XML viewer
	 * 
	 * @param fileUrl
	 * 
	 * @return {boolean} true if the load was successful, false otherwise.
	 */
	loadFromUrl: function (fileUrl) {
		this.fileUrl = fileUrl;
		var result = new xtiger.util.Logger();
		this.logEntry = createLog();
		logAction(this.logEntry, 'loading', fileUrl);
		try {
			var doc = loadDocument(fileUrl, result);
			this.currentXML = doc[1];
			this.currentXMLString = doc[0];
			logSuccess(this.logEntry, '');
			return true;
		} catch (err) {
			logFailure(this.logEntry, err.message);
			return false;
		}
	},
	
	/**
	 * Shows the current data in the viewer
	 */
	show: function () {
		if (!this.currentXMLString)
			return;
		this.view = this.view ? this.view : document.getElementById('dataContainer');
		/*var buf = '<pre>';
		var tmp = this.currentXMLString.replace(/\</g, '&lt;');
		var tmp = tmp.replace(/\>/g, '&gt;');
		var tmp = tmp.replace(/\"/g, '&quot;');
		buf += tmp;
		buf += '</pre>';
		this.view.innerHTML = buf;*/
		this.view.value = this.currentXMLString;
	},
	
	/**
	 * returns the current XML string, if any
	 * @return
	 */
	getAsString: function () {
		if (!this.currentXMLString)
			return;
		//return this.currentXMLString;
		return this.view.value;
	},
	
	loadAsString: function (xml) {
		this.currentXMLString = xml;
	},
	
	/**
	 * True if the viewer stores data
	 */
	hasData: function () {
		return this.currentXMLString ? true : false;
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

var inspectorViews = [];
inspectorViews[0] = inspectorViews[0] ? inspectorViews[0] : new SchemaInspector(0);
inspectorViews[1] = inspectorViews[1] ? inspectorViews[1] : new SchemaInspector(1);
var serializer =  new xtiger.editor.SchemaSerializer ();
var basicSerializer = new xtiger.editor.BasicSerializer();
var basicLoader = new xtiger.editor.BasicLoader();
var robustLoader = new xtiger.editor.RobustLoader();
var _XMLViewer = new XMLViewer();
var curTemplates = []