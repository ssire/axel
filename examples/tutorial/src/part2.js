// AXEL tutorial part 2
// Javascript file for using AXEL to load and transform a template with Ajax
// See also common.js

var xtDoc; // XML document template holder

// Loads the template inside an internal XML document object using Ajax
// You could use your own Ajax method call and set xtDoc to xhr.responseXML
// or use an ActiveX object under IE (e.g using the MSXML ActiveX)
function load () {
	var result = new xtiger.util.Logger();
	xtDoc = xtiger.cross.loadDocument('../../templates/Hello-world.xhtml', result);
	if (result.inError()) {	
		alert(result.printErrors()); 
	} else {
		alert('Template loaded');
		level = 1;		
	}
}

// Transforms the template into an editor
// The template is taken from xtDoc and the resulting editor is copied into a div within a target document
function transform () {
	if (! checkLevel(1))	return;
	form = new xtiger.util.Form('../../axel/bundles');
	form.setTemplateSource(xtDoc);
	form.setTargetDocument (document, 'container', true);
	form.enableTabGroupNavigation();
	if (! form.transform()) { 
		alert(form.msg); // feedback about errors
	}
	level = 2;						
}
