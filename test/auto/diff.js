// Returns a canonical version of a string containing XML data
function canonical (sxml) {	
	var res = [];
	var buffer = sxml; // tmp string for manipulation	
	if (sxml.indexOf('<?') != -1) { // there is an xml prolog and/or PI
		var r = /<[^\?]/mg;
		if (r.exec(sxml)) { // move regexp after first tag opening which is not a xml prolog or PI
			buffer = sxml.slice(r.lastIndex - 2);
		}
	}
	var re = new RegExp ('</?.*?/?>', 'mg');
	var lastIndex = 0;
	while (re.exec(buffer)) {
		var substr = buffer.slice(lastIndex, re.lastIndex);
		if (substr.search(/\S/) != -1) {
			var clean = substr.replace(/\s/g, '');
			if (clean.charAt(0) != '<') {
				var m = clean.match(/(.*)(<\/?.*?\/?>)$/m);
				if (m[1] && m[2]) {
					res.push(m[1]);
					res.push(m[2]);				
				} else {
					res.push('Parser Error: "' + clean + '"');
				}
			} else {
				res.push(clean);
			}
		}
		lastIndex = re.lastIndex;
	}
	return res;
}

// Silly array term by term comparison
function compare (a1, a2) {
	if (a1.length != a2.length) {
		return false;
	}
	for (var i = 0; i < a1.length; i++) {
		if (a1[i] != a2[i]) {
			return false;
		}
	}
	return true;	
}

function genLine(nb, txt, container, bug) {
	n = xtdom.createElement(document, 'p');
	s = xtdom.createElement(document, 'span');
	t = xtdom.createTextNode(document, nb + ' : ');
	s.appendChild(t);		
	n.appendChild(s);
	t = xtdom.createTextNode(document, txt);
	n.appendChild(t);
	if (bug) {
		xtdom.addClassName(n, 'bug');
	}	
	container.appendChild(n);
}

// Looks for a1[i], a1[i+1], a1[i+sliding-1] inside a2 (sliding is the slice width)
// Returns the delta or -1 if there are no match
function lookupOverlay (a1, i, a2, j, sliding) {
	// FIXME: does not take sliding into account (defaults to 1) at that moment
	for (var delta = 0; (j + delta) < a2.length; delta++ ) {
		if (a1[i] == a2[j + delta]) {
			return delta;
		}
	}
	return -1;
}

// Avanced algorithm: tries to align source and dest in case of mismatch
// Very naive approach
function printDiff (a1, a2, srcview, destview) {
	xtdom.removeChildrenOf(srcview);
	xtdom.removeChildrenOf(destview);
	var delta1 = delta2 = 0;
	if (a1 || a2) {
		var n, s, t;
		for (var i = 0; i < Math.max(a1.length, a2.length) ; i++) {
			if ((i + delta1) < a1.length) {
				if ((i + delta2) < a2.length) { // can compare a1 with a2 term by term
					if (a1[i + delta1] != a2[i + delta2]) { // mismatch, try to find a delta
						var delta = lookupOverlay( a1, i + delta1, a2, i + delta2, 1) // tries out first hypothesis
						if (delta != -1) {
							// generates extra a2 content (the one skipped by delta)
							for (var k = 0; k < delta; k++) {
								genLine(i, a2[i + delta2 + k], destview, true);
							}							
							// moves a2 index
							delta2 += delta;
						} else { // tries out second hypothesis
							delta = lookupOverlay( a2, i + delta2, a1, i + delta1, 1) // tries out first hypothesis
							if (delta != -1) {
								// generates extra a1 content (the one skipped by delta)
								for (var l = 0; l < delta; l++) {
									genLine(i, a1[i + delta1 + l], srcview, true);
								}							
								// moves a1 index
								delta1 += delta;							
							}
						}
					}
				}
				genLine(i, a1[i + delta1], srcview, a1[i + delta1] != a2[i + delta2]);
			}
			if ((i + delta2) < a2.length) {
				genLine(i, a2[i + delta2], destview, a1[i + delta1] != a2[i + delta2]);
			}
		}
	}
}

// Basic Algorithm : does not try to align src and dest documents
function printDiff2 (a1, a2, srcview, destview) {
        xtdom.removeChildrenOf(srcview);
        xtdom.removeChildrenOf(destview);
        if (a1 || a2) {
                var n, s, t;
                for (var i = 0; i < Math.max(a1.length, a2.length) ; i++) {
                        if (i < a1.length) {
                                genLine(i, a1[i], srcview, a1[i] != a2[i]);
                        }
                        if (i < a2.length) {
                                genLine(i, a2[i], destview, a1[i] != a2[i]);
                        }
                }
        }
}

// Compares two string representation of an XML data fragment
// Returns true if they are identical
// Returns false otherwise
function diff (src, dest) {
	var csrc = canonical (src);
	var cdest = canonical (dest);
	var same = compare (csrc, cdest);
	return !same;
}

