function minmax(node) {
	var div = node.parentNode.parentNode;
	if (div.isminified) {
		node.src = "img/arrow-minimize.png";
		doHeightChangeMem(div, div.currentHeight, div.maxHeight, 10, 10, 0.5);
		div.style.borderBottom = 'none';
		div.isminified = false;
	} else {
		div.maxHeight = parseInt(xtdom.getComputedStyle(div, 'height'));
		div.currentHeight = div.maxHeight;
		node.src = "img/arrow-maximize.png";
		doHeightChangeMem(div, div.currentHeight, (div.currentHeight - 320),
				10, 10, 0.5);
		div.style.borderBottom = '2px solid #F0F0F0';
		div.isminified = true;
	}
}
function doHeightChangeMem(elem, startHeight, endHeight, steps, intervals, powr) {
	//Height changer with Memory by www.hesido.com
	if (elem.heightChangeMemInt)
		window.clearInterval(elem.heightChangeMemInt);
	var curStep = 0;
	elem.heightChangeMemInt = window.setInterval(function() {
		elem.currentHeight = easeInOut(startHeight, endHeight, steps, curStep,
				powr);
		elem.style.height = elem.currentHeight + "px";
		curStep++;
		if (curStep > steps)
			window.clearInterval(elem.heightChangeMemInt);
	}, intervals)
}

function easeInOut(minValue, maxValue, totalSteps, actualStep, powr) {
	//Generic Animation Step Value Generator By www.hesido.com 
	var delta = maxValue - minValue;
	var stepp = minValue
			+ (Math.pow(((1 / totalSteps) * actualStep), powr) * delta);
	return Math.ceil(stepp)
}