
const canvasInputs = ['format', 'width', 'height', 'pitchY', 'pitchC', 'zoom'];

function saveCanvasSettings(canvas) {
  for (let i=0; i<canvasInputs.length; i++) {
    localStorage.setItem(canvas.attr('id')+'_'+canvasInputs[i], canvas.data(canvasInputs[i]).val());
  }
}

function loadCanvasSettings(canvas) {
  for (let i=0; i<canvasInputs.length; i++) {
    let value = localStorage.getItem(canvas.attr('id')+'_'+canvasInputs[i]);
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

function read_u16(buffer, offset, bLE = false) {
  if (bLE)
    return buffer[offset+1] << 8 | buffer[offset];
  return buffer[offset] << 8 | buffer[offset+1];
}

function write_grey(buffer, offset, y) {
  buffer[offset+0] = y;
  buffer[offset+1] = y;
  buffer[offset+2] = y;
  buffer[offset+3] = 255;
}

function write_pixel(buffer, offset, y, u, v) {
  buffer[offset+0] = y + 1.370 * (v - 128);
  buffer[offset+1] = y - 0.698 * (v - 128) - 0.337 * (u - 128);
  buffer[offset+2] = y + 1.732 * (u - 128);
  buffer[offset+3] = 255;
}

function drawYUV_sw(canvas, buffer, format, width, height, pitchY, pitchC) {

  var context = document.getElementById(canvas.attr('id')).getContext("2d");
  var output = context.createImageData(width, height);

  var offsetY = 0;
  var offsetC = pitchY * height;
  var offsetU = offsetC;
  var offsetV = offsetU + pitchC * (height>>1);

  if (format == 'YV12') {
    offsetU = offsetV;
    offsetV = offsetC;
  }

  if (format == 'NV21') {
    offsetC += 1;
  }

  if (format == 'Y') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w++) {
        let o = w + h * pitchY + offsetY;
        let y = buffer[o];
        let pos = w*4 + width*h*4;
        write_grey(output.data, pos, y);
      }
    }
  }

  else if (format == 'Y-10B') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w+=4) {
        let o = (w * 5 / 4) + h * pitchY + offsetY;
        let y0 = ((read_u16(buffer, o) >> 6) & 0x3ff) >> 2;
        let y1 = ((read_u16(buffer, o+1) >> 4) & 0x3ff) >> 2;
        let y2 = ((read_u16(buffer, o+2) >> 2) & 0x3ff) >> 2;
        let y3 = ((read_u16(buffer, o+3)) & 0x3ff) >> 2;
        let pos = w*4 + width*h*4;
        write_grey(output.data, pos+0, y0);
        write_grey(output.data, pos+4, y1);
        write_grey(output.data, pos+8, y2);
        write_grey(output.data, pos+12, y3);
      }
    }
  }

  else if (format == 'I420' || format == 'YV12') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w++) {
        let y = buffer[w + h * pitchY + offsetY];
        let u = buffer[(w>>1) + (h>>1) * pitchC + offsetU];
        let v = buffer[(w>>1) + (h>>1) * pitchC + offsetV];
        let pos = w*4 + width*h*4;
        write_pixel(output.data, pos, y, u, v);
      }
    }
  }

  else if (format == 'YUV420P10BE' || format == 'YUV420P10LE') {
    let bLE = (format == 'YUV420P10LE') ? true:false;
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w++) {
        let y = (read_u16(buffer, (w << 1) + h * pitchY + offsetY, bLE) & 0x3ff) >> 2;
        let u = (read_u16(buffer, ((w >> 1) << 1) + (h>>1) * pitchC + offsetU, bLE) & 0x3ff) >> 2;
        let v = (read_u16(buffer, ((w >> 1) << 1) + (h>>1) * pitchC + offsetV, bLE) & 0x3ff) >> 2;
        let pos = w*4 + width*h*4;
        write_pixel(output.data, pos, y, u, v);
      }
    }
  }

  else if (format == 'NV12' || format == 'NV21') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w++) {
        let y = buffer[w + h * pitchY + offsetY];
        let u = buffer[(w>>1)*2 + (h>>1) * pitchC + offsetC];
        let v = buffer[(w>>1)*2 + (h>>1) * pitchC + (offsetC ^ 1)];
        let pos = w*4 + width*h*4;
        write_pixel(output.data, pos, y, u, v);
      }
    }
  }

  else if (format == 'NV12-10B') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w+=4) {
        let o0 = (w * 5 / 4) + h * pitchY + offsetY;
        let y0 = ((read_u16(buffer, o0) >> 6) & 0x3ff) >> 2;
        let y1 = ((read_u16(buffer, o0+1) >> 4) & 0x3ff) >> 2;
        let y2 = ((read_u16(buffer, o0+2) >> 2) & 0x3ff) >> 2;
        let y3 = ((read_u16(buffer, o0+3)) & 0x3ff) >> 2;
        let o1 = (w * 5 / 4) + (h>>1) * pitchY + offsetC;
        let u0 = ((read_u16(buffer, o1) >> 6) & 0x3ff) >> 2;
        let v0 = ((read_u16(buffer, o1+1) >> 4) & 0x3ff) >> 2;
        let u1 = ((read_u16(buffer, o1+2) >> 2) & 0x3ff) >> 2;
        let v1 = ((read_u16(buffer, o1+3)) & 0x3ff) >> 2;
        let pos = w*4 + width*h*4;
        write_pixel(output.data, pos+0, y0, u0, v0);
        write_pixel(output.data, pos+4, y1, u0, v0);
        write_pixel(output.data, pos+8, y2, u1, v1);
        write_pixel(output.data, pos+12, y3, u1, v1);
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

  if (files.length == 2 && (format == 'NV12' || format == 'NV21' || format == 'NV12-10B')) {

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
  for (let key in options) {
    canvas.data(key, $('#'+options[key]));
  }
  document.getElementById(options['selectedFiles']).addEventListener('change', handleFileSelect.bind(canvas), false);
  document.getElementById(options['dropZone']).addEventListener('drop', handleDrop.bind(canvas), false);
  document.getElementById(options['dropZone']).addEventListener('dragover', handleDragOver, false);
  loadCanvasSettings(canvas);
}
