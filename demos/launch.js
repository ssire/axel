// Pre-conditions: iframe with id #container and some element with id #feedback
function Editor (base) {
	var _this = this;
	this.callback = function ()  { _this.frameLoaded() };	
	this.libPath = base;
	this.initialize ();
}

Editor.prototype = {
	
	initialize : function () {
		// Extracts mandatory template name and optional XML data file name from URL
		var m = document.location.href.match(/t=(.*?\.(xtd|xhtml|html))([&\+]d=(.*?\.(xml|xhtml)))?([&\+]p=(.*?))?$/);
		if (m) {
			this.template = m[1]; // template file name
			this.dataUrl = m[4]; // optional data file name
			if (m[7]) {
				this.libPath = m[7];
			}
		} 
		if (this.template) {
			this.submitPage();
		}
	},

	submitPage : function () {
		this.log('Loading document template "' + this.template + '"');
		var iframe = document.getElementById('container');
		if (iframe) {
			xtdom.addEventListener(iframe, 'load', this.callback , false);
			iframe.setAttribute('src', this.template);
		} else {
			this.log('Missing iframe !');
		}
	},

	// Creates the XTiger form UI on top of the document just loaded into the frame
	frameLoaded : function () {
		var iframeDoc;
		var result = new xtiger.util.Logger();
		var iframe = document.getElementById('container');
		xtdom.removeEventListener(iframe, 'load', this.callback, false);
		if (iframe.contentDocument) {
			iframeDoc = iframe.contentDocument;
		} else if (iframe.contentWindow) {
			iframeDoc = iframe.contentWindow.document;			
		}		
		this.form = new xtiger.util.Form(this.libPath + '/bundles');
		this.form.setTemplateSource(iframeDoc);
	  	this.form.enableTabGroupNavigation();
		if (this.form.transform(result)) { 
			this.form.injectStyleSheet(this.libPath + '/axel.css', result);
			if (this.dataUrl) {
				this.log('Loading data "' + this.dataUrl + '"');
				xmlDoc = xtiger.debug.loadDocument(this.dataUrl);
				if (xmlDoc) {
					var source = new xtiger.util.DOMDataSource(xmlDoc);
					if (! this.form.loadData(source)) {
						this.log('Error loading "' + this.dataUrl + '" : ' + this.form.msg);
					}
				}				
			}			
		}
		if (result.inError()) { // Optional feedback about errors
			this.log(result.printErrors()); 
		} else { // hides log area
			var n = document.getElementById('feedback');
			n.style.display = 'none';
		}
		if (xtiger.util.MenuBar) { // Displays the menu bar
			var body = iframeDoc.getElementsByTagName('body')[0];
			this.menubar = new xtiger.util.MenuBar(this.form);
			this.menubar.display(document.getElementById('menu'), body);
			xtiger.session(document).save('menubar', this.menubar);
		} else {
			alert('WebDAV menu bar component missing !')
		}
	},
	
	log : function (msg) {
		var n = document.getElementById('feedback');
		if (n) {
			n.firstChild.data = msg;			
		}
	}
	
}	
