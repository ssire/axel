// AXEL tutorial - Javascript file for using AXEL
// Functions commons to the 3 different parts of the tutorial
// for loading and serializing XML content from a template

var level = 0;
var form; // for interacting with the template-generated-editor

// Retrieves an XML data file and loads it inside a template object
function feed (dontcheck) {
	if ((! dontcheck) && (! checkLevel(2)))	return;
	var result = new xtiger.util.Logger();
	var data = xtiger.cross.loadDocument('sample.xml', result);
	if (data) {
		var dataSrc = new xtiger.util.DOMDataSource(data);
		if (form.loadData(dataSrc, result)) {
			alert('Data loaded');
		}
	}
	if (result.inError()) {	alert(result.printErrors()); }
}

// Dumps the current XML content of a template into a string and print it inside the window
function dump (dontcheck) {
	if ((! dontcheck) && (! checkLevel(2)))	return;
	var dump = new xtiger.util.DOMLogger ();
	form.serializeData (dump);
	var xmlString = dump.dump();
	var n = document.getElementById('content');
	n.firstChild.data = xmlString;
}		

// Utility method only useful in the tutorial context to monitor the progression
function checkLevel (num) {
	var res = true;
	if (level < num) {
		alert(['Load a template first', 'Transform the template first'][level]);
		res = false;
	}
	return res;
}