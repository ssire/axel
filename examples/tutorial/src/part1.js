// AXEL tutorial part 1
// Javascript file for using AXEL to load and transform a template within an iframe
// See also common.js

var iframe; // XML document template holder (iframe.contentDocument)

// Loads the template inside an iframe
function load () {
	iframe = document.getElementById('container');
	xtdom.addEventListener(iframe, 'load', frameLoaded, false);
	iframe.setAttribute('src', '../../templates/Hello-world.xhtml');
}

function frameLoaded () {
	level = 1;
	var iframe = document.getElementById('container');
	xtdom.removeEventListener(iframe, 'load', frameLoaded, false);			
}		

// Transforms the template into an editor
function transform () {	
	if (! checkLevel(1))	return;
	var result = new xtiger.util.Logger(); 			
	form = new xtiger.util.Form('../axel/bundles');
	form.setTemplateSource(iframe.contentDocument);
  	form.enableTabGroupNavigation();
	if (form.transform(result)) { 
		form.injectStyleSheet('../../axel/axel.css', result); // relative to template path !
	}
	if (result.inError()) { // Optional feedback about errors
		alert(result.printErrors()); 
	}
	level = 2;						
}

