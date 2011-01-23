// Source : http://msdn.microsoft.com/en-us/library/cc288325(VS.85).aspx
function printIEMode () {
	var engine = null;
	if (window.navigator.appName == "Microsoft Internet Explorer")
	{
	   // This is an IE browser. What mode is the engine in?
	   if (document.documentMode) // IE8
	      engine = document.documentMode;
	   else // IE 5-7
	   {
	      engine = 5; // Assume quirks mode unless proven otherwise
	      if (document.compatMode)
	      {
	         if (document.compatMode == "CSS1Compat")
	            engine = 7; // standards mode
	      }
	   }
	   // the engine variable now contains the document compatibility mode.
	
		// print it
		var n = document.getElementById('results');
		var answer = document.createElement('p');
		var buffer = "Internet Explorer mode = ";
		if (engine == 5) {
			buffer +=  'quircks (5)';
		} else if (engine  == 7) {
			buffer +=  'standards (7)';
		} else {
			buffer +=  engine;
		}
		answer.innerHTML = buffer;
		n.appendChild(answer);		
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
