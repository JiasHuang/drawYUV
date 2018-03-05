
var inputs = ['format', 'width', 'height', 'pitchY', 'pitchC', 'zoom'];

function saveCanvasSettings(canvas) {
  for (var i=0; i<inputs.length; i++)  {
    localStorage.setItem(canvas.attr('id')+'_'+inputs[i], canvas.data(inputs[i]).val());
  }
}

function loadCanvasSettings(canvas) {
  for (var i=0; i<inputs.length; i++)  {
    var value = localStorage.getItem(canvas.attr('id')+'_'+inputs[i]);
    if (value !== null) {
      canvas.data(inputs[i]).val(value);
    }
  }
}

function zoomImage(canvas) {

  var width   = canvas.data('width').val();
  var height  = canvas.data('height').val();
  var zoom    = canvas.data('zoom').val();

  if (width > 0 && height > 0) {
    canvas.css({width:width*zoom, height:height*zoom});
    saveCanvasSettings(canvas);
  }
}

function drawYUV(canvas, bufferYUV) {

  var format  = canvas.data('format').val();
  var width   = canvas.data('width').val();
  var height  = canvas.data('height').val();
  var pitchY  = canvas.data('pitchY').val();
  var pitchC  = canvas.data('pitchC').val();

  if (!bufferYUV || width <= 0 || height <= 0) {
    console.log('Invalid parameters %s %s %s', bufferYUV, width, height);
    return;
  }

  if (pitchY <= 0) {
    pitchY = width;
  }

  if (pitchC <= 0) {
    if (format == 'NV12' || format == 'NV21') {
      pitchC = pitchY;
    }
    if (format == 'I420' || format == 'YV12') {
      pitchC = pitchY >> 1;
    }
  }

  var context = document.getElementById(canvas.attr('id')).getContext("2d");
  var output  = context.createImageData(width, height);

  var offsetY = 0;
  var offsetC = pitchY * height;
  var offsetU = offsetC;
  var offsetV = offsetU + pitchC * (height>>1);
  var w, h;

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
        Y = bufferYUV[posY];
        pos = w*4 + width*h*4;
        output.data[pos+0] = Y;
        output.data[pos+1] = Y;
        output.data[pos+2] = Y;
        output.data[pos+3] = 255;
      }
    }
  }

  if (format == 'I420' || format == 'YV12') {
    for (h=0; h<height; h++) {
      for (w=0; w<width; w++) {
        posY = w + h * pitchY + offsetY;
        posU = (w>>1) + (h>>1) * pitchC + offsetU;
        posV = (w>>1) + (h>>1) * pitchC + offsetV;
        Y = bufferYUV[posY];
        U = bufferYUV[posU];
        V = bufferYUV[posV];
        pos = w*4 + width*h*4;
        output.data[pos+0] = Y + 1.370 * (V - 128);
        output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
        output.data[pos+2] = Y + 1.732 * (U - 128);
        output.data[pos+3] = 255;
      }
    }
  }

  if (format == 'NV12' || format == 'NV21') {
    for (var h=0; h<height; h++) {
      for (var w=0; w<width; w++) {
        posY = w + h * pitchY + offsetY;
        posU = (w>>1)*2 + (h>>1) * pitchC + offsetC;
        posV = posU ^ 1;
        Y = bufferYUV[posY];
        U = bufferYUV[posU];
        V = bufferYUV[posV];
        pos = w*4 + width*h*4;
        output.data[pos+0] = Y + 1.370 * (V - 128);
        output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
        output.data[pos+2] = Y + 1.732 * (U - 128);
        output.data[pos+3] = 255;
      }
    }
  }

  context.canvas.width = width;
  context.canvas.height = height;
  context.putImageData(output, 0, 0);

  zoomImage(canvas);
  canvas.data('bufferYUV', bufferYUV);
}

function refreshImage(canvas) {
  return drawYUV(canvas, canvas.data('bufferYUV'));
}

function readInputFiles(files, canvas)
{
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

    bufferYUV = new Uint8Array(fileY.size + fileC.size);

    var readerC = new FileReader();
    readerC.onload = function() {
      bufferYUV.set(new Uint8Array(this.result), fileY.size);
      drawYUV(canvas, bufferYUV);
    };

    var readerY = new FileReader();
    readerY.onload = function() {
      bufferYUV.set(new Uint8Array(this.result), 0);
      readerC.readAsArrayBuffer(fileC);
    };

    canvas.data('dropZoneDesc').text(fileY.name + ' + ' + fileC.name);
    readerY.readAsArrayBuffer(fileY);
  }

  else {
    var reader = new FileReader();
    reader.onload = function() {
      bufferYUV = new Uint8Array(reader.result);
      drawYUV(canvas, bufferYUV);
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
  document.getElementById(canvas.data('selectedFiles').attr('id')).addEventListener('change', handleFileSelect.bind(canvas), false);
  document.getElementById(canvas.data('dropZone').attr('id')).addEventListener('drop', handleDrop.bind(canvas), false);
  document.getElementById(canvas.data('dropZone').attr('id')).addEventListener('dragover', handleDragOver, false);
  loadCanvasSettings(canvas);
}
