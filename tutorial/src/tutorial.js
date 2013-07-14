// AXEL Tutorial
// Tutorial Show / Hide behaviours

function toggle(button, target, action) {
	var cur = button.firstChild.data;
	if ((! action) || (action && (cur == action))) {
		target.style.display = guiTrans[cur][0];
		button.firstChild.data = guiTrans[cur][1];
	}
}

function installButton (name) {
	var n = document.getElementById(name + 'Toggle');
	var m = document.getElementById(name);
	if (n && m) {
		xtdom.addEventListener(n, 'click', function (ev) { toggle(n, m) }, false);
	} else {
		alert('Failed to install ' + name + ' button !');
	}
}

function initTutorial () {
	for (var i = 0; i < targets.length; i++) {
		installButton(targets[i]);
	}
}

function showAll() {
	for (var i = 0; i < targets.length; i++) {
		var n = document.getElementById(targets[i] + 'Toggle');
		var m = document.getElementById(targets[i]);
		toggle(n,m, 'show');
	}
}
