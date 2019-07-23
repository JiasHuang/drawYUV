
const canvasInputs = ['format', 'width', 'height', 'pitchY', 'pitchC', 'zoom'];

function saveCanvasSettings(canvas) {
	for (var i=0; i<canvasInputs.length; i++)	{
		localStorage.setItem(canvas.attr('id')+'_'+canvasInputs[i], canvas.data(canvasInputs[i]).val());
	}
}

function loadCanvasSettings(canvas) {
	for (var i=0; i<canvasInputs.length; i++)	{
		var value = localStorage.getItem(canvas.attr('id')+'_'+canvasInputs[i]);
		if (value !== null) {
			canvas.data(canvasInputs[i]).val(value);
		}
	}
}

function zoomImage(canvas) {

	var width = canvas.data('width').val();
	var height = canvas.data('height').val();
	var zoom = canvas.data('zoom').val();

	if (width > 0 && height > 0) {
		canvas.css({width:width*zoom, height:height*zoom});
	}
}

function zoomImageAndSaveCanvasSettings(canvas) {
	zoomImage(canvas);
	saveCanvasSettings(canvas);
}

function drawYUV_sw(canvas, buffer, format, width, height, pitchY, pitchC) {

	var context = document.getElementById(canvas.attr('id')).getContext("2d");
	var output = context.createImageData(width, height);

	var offsetY = 0;
	var offsetC = pitchY * height;
	var offsetU = offsetC;
	var offsetV = offsetU + pitchC * (height>>1);
	var w, h, o;

	if (format == 'YV12') {
		offsetU = offsetV;
		offsetV = offsetC;
	}

	if (format == 'NV21') {
		offsetC += 1;
	}

	if (format == 'Y') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w++) {
				posY = w + h * pitchY + offsetY;
				Y = buffer[posY];
				pos = w*4 + width*h*4;
				output.data[pos+0] = Y;
				output.data[pos+1] = Y;
				output.data[pos+2] = Y;
				output.data[pos+3] = 255;
			}
		}
	}

	else if (format == 'Y-10B') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w+=4) {

				o = (w * 5 / 4) + h * pitchY + offsetY;
				var y0 = (((buffer[o] << 8 | buffer[o+1]) >> 6) & 0x3ff) >> 2;
				var y1 = (((buffer[o+1] << 8 | buffer[o+2]) >> 4) & 0x3ff) >> 2;
				var y2 = (((buffer[o+2] << 8 | buffer[o+3]) >> 2) & 0x3ff) >> 2;
				var y3 = (((buffer[o+3] << 8 | buffer[o+4])) & 0x3ff) >> 2;

				pos = w*4 + width*h*4;

				output.data[pos+0] = y0;
				output.data[pos+1] = y0;
				output.data[pos+2] = y0;
				output.data[pos+3] = 255;

				output.data[pos+4] = y1;
				output.data[pos+5] = y1;
				output.data[pos+6] = y1;
				output.data[pos+7] = 255;

				output.data[pos+8] = y2;
				output.data[pos+9] = y2;
				output.data[pos+10] = y2;
				output.data[pos+11] = 255;

				output.data[pos+12] = y3;
				output.data[pos+13] = y3;
				output.data[pos+14] = y3;
				output.data[pos+15] = 255;
			}
		}
	}

	else if (format == 'I420' || format == 'YV12') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w++) {
				posY = w + h * pitchY + offsetY;
				posU = (w>>1) + (h>>1) * pitchC + offsetU;
				posV = (w>>1) + (h>>1) * pitchC + offsetV;
				Y = buffer[posY];
				U = buffer[posU];
				V = buffer[posV];
				pos = w*4 + width*h*4;
				output.data[pos+0] = Y + 1.370 * (V - 128);
				output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
				output.data[pos+2] = Y + 1.732 * (U - 128);
				output.data[pos+3] = 255;
			}
		}
	}

	else if (format == 'YUV420P10BE') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w++) {
				o = (w << 1) + h * pitchY + offsetY;
				Y = ((buffer[o] << 8 | buffer[o+1]) & 0x3ff) >> 2;
				o = ((w >> 1) << 1) + (h>>1) * pitchC + offsetU;
				U = ((buffer[o] << 8 | buffer[o+1]) & 0x3ff) >> 2;
				o = ((w >> 1) << 1) + (h>>1) * pitchC + offsetV;
				V = ((buffer[o] << 8 | buffer[o+1]) & 0x3ff) >> 2;
				pos = w*4 + width*h*4;
				output.data[pos+0] = Y + 1.370 * (V - 128);
				output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
				output.data[pos+2] = Y + 1.732 * (U - 128);
				output.data[pos+3] = 255;
			}
		}
	}

	else if (format == 'YUV420P10LE') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w++) {
				o = (w << 1) + h * pitchY + offsetY;
				Y = ((buffer[o+1] << 8 | buffer[o]) & 0x3ff) >> 2;
				o = ((w >> 1) << 1) + (h>>1) * pitchC + offsetU;
				U = ((buffer[o+1] << 8 | buffer[o]) & 0x3ff) >> 2;
				o = ((w >> 1) << 1) + (h>>1) * pitchC + offsetV;
				V = ((buffer[o+1] << 8 | buffer[o]) & 0x3ff) >> 2;
				pos = w*4 + width*h*4;
				output.data[pos+0] = Y + 1.370 * (V - 128);
				output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
				output.data[pos+2] = Y + 1.732 * (U - 128);
				output.data[pos+3] = 255;
			}
		}
	}


	else if (format == 'NV12' || format == 'NV21') {
		for (var h=0; h<height; h++) {
			for (var w=0; w<width; w++) {
				posY = w + h * pitchY + offsetY;
				posU = (w>>1)*2 + (h>>1) * pitchC + offsetC;
				posV = posU ^ 1;
				Y = buffer[posY];
				U = buffer[posU];
				V = buffer[posV];
				pos = w*4 + width*h*4;
				output.data[pos+0] = Y + 1.370 * (V - 128);
				output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
				output.data[pos+2] = Y + 1.732 * (U - 128);
				output.data[pos+3] = 255;
			}
		}
	}

	else if (format == 'NV12-10B') {
		for (h=0; h<height; h++) {
			for (w=0; w<width; w+=4) {

				o = (w * 5 / 4) + h * pitchY + offsetY;
				var y0 = (((buffer[o] << 8 | buffer[o+1]) >> 6) & 0x3ff) >> 2;
				var y1 = (((buffer[o+1] << 8 | buffer[o+2]) >> 4) & 0x3ff) >> 2;
				var y2 = (((buffer[o+2] << 8 | buffer[o+3]) >> 2) & 0x3ff) >> 2;
				var y3 = (((buffer[o+3] << 8 | buffer[o+4])) & 0x3ff) >> 2;

				o = (w * 5 / 4) + (h>>1) * pitchC + offsetC;
				var u0 = (((buffer[o] << 8 | buffer[o+1]) >> 6) & 0x3ff) >> 2;
				var v0 = (((buffer[o+1] << 8 | buffer[o+2]) >> 4) & 0x3ff) >> 2;
				var u1 = (((buffer[o+2] << 8 | buffer[o+3]) >> 2) & 0x3ff) >> 2;
				var v1 = (((buffer[o+3] << 8 | buffer[o+4])) & 0x3ff) >> 2;
				pos = w*4 + width*h*4;

				output.data[pos+0] = y0 +  1.370 * (v0 - 128);
				output.data[pos+1] = y0 - 0.698 * (v0 - 128) - 0.337 * (u0 - 128);
				output.data[pos+2] = y0 + 1.732 * (u0 - 128);
				output.data[pos+3] = 255;

				output.data[pos+4] = y1 +  1.370 * (v0 - 128);
				output.data[pos+5] = y1 - 0.698 * (v0 - 128) - 0.337 * (u0 - 128);
				output.data[pos+6] = y1 + 1.732 * (u0 - 128);
				output.data[pos+7] = 255;

				output.data[pos+8] = y2 +  1.370 * (v1 - 128);
				output.data[pos+9] = y2 - 0.698 * (v1 - 128) - 0.337 * (u1 - 128);
				output.data[pos+10] = y2 + 1.732 * (u1 - 128);
				output.data[pos+11] = 255;

				output.data[pos+12] = y3 +  1.370 * (v1 - 128);
				output.data[pos+13] = y3 - 0.698 * (v1 - 128) - 0.337 * (u1 - 128);
				output.data[pos+14] = y3 + 1.732 * (u1 - 128);
				output.data[pos+15] = 255;
			}
		}
	}

	context.canvas.width = width;
	context.canvas.height = height;
	context.putImageData(output, 0, 0);
}

function drawYUV(canvas, buffer) {

	var format = canvas.data('format').val();
	var width = canvas.data('width').val();
	var height = canvas.data('height').val();
	var pitchY = canvas.data('pitchY').val();
	var pitchC = canvas.data('pitchC').val();

	if (!buffer) {
		console.log('no buffer');
		return;
	}

	if (width <= 0 || height <= 0) {
		console.log('no resolution');
		return;
	}

	if (pitchY <= 0) {
		if (format == 'YUV420P10BE' || format == 'YUV420P10LE')
			pitchY = width * 2;
		else if (format == 'Y-10B' || format == 'NV12-10B')
			pitchY = width * 5 / 4;
		else
			pitchY = width;
	}

	if (pitchC <= 0) {
		if (format == 'NV12' || format == 'NV21' || format == 'NV12-10B')
			pitchC = pitchY;
		else
			pitchC = pitchY >> 1;
	}

	var dispatch = null;

	if (window.location.href.endsWith('?webgl2')) {
		dispatch = drawYUV_webgl2;
	} else {
		dispatch = drawYUV_sw;
	}

	console.log('%s %sx%s pitchY %s pitchC %s', format, width, height, pitchY, pitchC);

	var t0 = performance.now();
	dispatch(canvas, buffer, format, width, height, pitchY, pitchC);
	var t1 = performance.now();

	console.log('%s took %f ms', dispatch.name, t1 - t0);

	zoomImage(canvas);

	// save current settings and buffer
	saveCanvasSettings(canvas);
	canvas.data('buffer', buffer);
}

function refreshImage(canvas) {
	return drawYUV(canvas, canvas.data('buffer'));
}

function readInputFiles(files, canvas) {

	var format = canvas.data('format').val();

	if (files.length == 0) {
		console.log('No input files');
		return;
	}

	if (files.length == 2 && (format == 'NV12' || format == 'NV21')) {

		var fileY = files[0];
		var fileC = files[1];

		if (files[0].size < files[1].size) {
			fileY = files[1];
			fileC = files[0];
		}

		buffer = new Uint8Array(fileY.size + fileC.size);

		var readerC = new FileReader();
		readerC.onload = function() {
			buffer.set(new Uint8Array(this.result), fileY.size);
			drawYUV(canvas, buffer);
		};

		var readerY = new FileReader();
		readerY.onload = function() {
			buffer.set(new Uint8Array(this.result), 0);
			readerC.readAsArrayBuffer(fileC);
		};

		canvas.data('dropZoneDesc').text(fileY.name + ' + ' + fileC.name);
		readerY.readAsArrayBuffer(fileY);
	}

	else {
		var reader = new FileReader();
		reader.onload = function() {
			buffer = new Uint8Array(reader.result);
			drawYUV(canvas, buffer);
		};
		canvas.data('dropZoneDesc').text(files[0].name);
		reader.readAsArrayBuffer(files[0]);
	}
}

function handleFileSelect(e) {
	var files = e.target.files;
	var canvas = $(this);
	readInputFiles(files, canvas);
}

function handleDrop(e) {
	e.preventDefault();
	var canvas = $(this);
	var files = [];
	var dt = e.dataTransfer;
	if (dt.items) {
		for (var i=0; i < dt.items.length; i++) {
			if (dt.items[i].kind == "file") {
				files.push(dt.items[i].getAsFile());
			}
		}
		canvas.data('selectedFiles').val('');
		readInputFiles(files, canvas);
	}
}

function handleDragOver(e) {
	e.preventDefault();
}

function initCanvasSettings(canvas, options) {
	for (var key in options) {
		canvas.data(key, $('#'+options[key]));
	}
	document.getElementById(options['selectedFiles']).addEventListener('change', handleFileSelect.bind(canvas), false);
	document.getElementById(options['dropZone']).addEventListener('drop', handleDrop.bind(canvas), false);
	document.getElementById(options['dropZone']).addEventListener('dragover', handleDragOver, false);
	loadCanvasSettings(canvas);
}
