
const canvasInputs = ['format', 'width', 'height', 'stride', 'zoom'];

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

function read_u16(buffer, offset) {
  return buffer[offset] << 8 | buffer[offset+1];
}

function write_pixel(buffer, offset, rgb) {
  buffer[offset+0] = rgb[0];
  buffer[offset+1] = rgb[1];
  buffer[offset+2] = rgb[2];
  buffer[offset+3] = 255;
}

function write_pixel_10to8(buffer, offset, rgb) {
  buffer[offset+0] = rgb[0] >> 2;
  buffer[offset+1] = rgb[1] >> 2;
  buffer[offset+2] = rgb[2] >> 2;
  buffer[offset+3] = 255;
}

function read_bayer_b(raw, y, x) {
  return [
    (raw[y-1][x-1] + raw[y-1][x+1] + raw[y+1][x-1] + raw[y+1][x+1]) >> 2,
    (raw[y-1][x] + raw[y][x-1] + raw[y+1][x] + raw[y][x+1]) >> 2,
    raw[y][x]
  ];
}

function read_bayer_r(raw, y, x) {
  return [
    raw[y][x],
    (raw[y-1][x] + raw[y][x-1] + raw[y+1][x] + raw[y][x+1]) >> 2,
    (raw[y-1][x-1] + raw[y-1][x+1] + raw[y+1][x-1] + raw[y+1][x+1]) >> 2
  ];
}

function read_bayer_g1(raw, y, x) {
  return [
    (raw[y-1][x] + raw[y+1][x]) >> 1,
    raw[y][x],
    (raw[y][x-1] + raw[y][x+1]) >> 1
  ];
}

function read_bayer_g2(raw, y, x) {
  return [
    (raw[y][x-1] + raw[y][x+1]) >> 1,
    raw[y][x],
    (raw[y-1][x] + raw[y+1][x]) >> 1
  ]
}

function read_raw8_4x6(buffer, h, w, stride) {
  let o11 = w + h * stride;
  let o01 = o11 - stride;
  let o21 = o11 + stride;
  let o31 = o21 + stride;
  return [
    [buffer[o01 - 1], buffer[o01 + 0], buffer[o01 + 1], buffer[o01 + 2], buffer[o01 + 3], buffer[o01 + 4]],
    [buffer[o11 - 1], buffer[o11 + 0], buffer[o11 + 1], buffer[o11 + 2], buffer[o11 + 3], buffer[o11 + 4]],
    [buffer[o21 - 1], buffer[o21 + 0], buffer[o21 + 1], buffer[o21 + 2], buffer[o21 + 3], buffer[o21 + 4]],
    [buffer[o31 - 1], buffer[o31 + 0], buffer[o31 + 1], buffer[o31 + 2], buffer[o31 + 3], buffer[o31 + 4]]
  ];
}

function read_raw10_4x6(buffer, h, w, stride) {
  let o11 = w * 5 / 4 + h * stride;
  let o01 = o11 - stride;
  let o21 = o11 + stride;
  let o31 = o21 + stride;
  return [
    [
      (buffer[o01 - 2] << 8 | buffer[o01 - 1]) & 0x3ff,
      (buffer[o01 + 0] << 8 | buffer[o01 + 1]) >> 6,
      ((buffer[o01 + 1] << 8 | buffer[o01 + 2]) & 0x3ff0) >> 4,
      ((buffer[o01 + 2] << 8 | buffer[o01 + 3]) & 0x0ffc) >> 2,
      (buffer[o01 + 3] << 8 | buffer[o01 + 4]) & 0x3ff,
      (buffer[o01 + 5] << 8 | buffer[o01 + 6]) >> 6
    ],
    [
      (buffer[o11 - 2] << 8 | buffer[o11 - 1]) & 0x3ff,
      (buffer[o11 + 0] << 8 | buffer[o11 + 1]) >> 6,
      ((buffer[o11 + 1] << 8 | buffer[o11 + 2]) & 0x3ff0) >> 4,
      ((buffer[o11 + 2] << 8 | buffer[o11 + 3]) & 0x0ffc) >> 2,
      (buffer[o11 + 3] << 8 | buffer[o11 + 4]) & 0x3ff,
      (buffer[o11 + 5] << 8 | buffer[o11 + 6]) >> 6
    ],
    [
      (buffer[o21 - 2] << 8 | buffer[o21 - 1]) & 0x3ff,
      (buffer[o21 + 0] << 8 | buffer[o21 + 1]) >> 6,
      ((buffer[o21 + 1] << 8 | buffer[o21 + 2]) & 0x3ff0) >> 4,
      ((buffer[o21 + 2] << 8 | buffer[o21 + 3]) & 0x0ffc) >> 2,
      (buffer[o21 + 3] << 8 | buffer[o21 + 4]) & 0x3ff,
      (buffer[o21 + 5] << 8 | buffer[o21 + 6]) >> 6
    ],
    [
      (buffer[o31 - 2] << 8 | buffer[o31 - 1]) & 0x3ff,
      (buffer[o31 + 0] << 8 | buffer[o31 + 1]) >> 6,
      ((buffer[o31 + 1] << 8 | buffer[o31 + 2]) & 0x3ff0) >> 4,
      ((buffer[o31 + 2] << 8 | buffer[o31 + 3]) & 0x0ffc) >> 2,
      (buffer[o31 + 3] << 8 | buffer[o31 + 4]) & 0x3ff,
      (buffer[o31 + 5] << 8 | buffer[o31 + 6]) >> 6
    ]
  ];
}

function read_raw10_x4(buffer, h, w, stride) {
  let o = w * 5 / 4 + h * stride;
  return [
    (buffer[o + 0] << 8 | buffer[o + 1]) >> 6,
    ((buffer[o + 1] << 8 | buffer[o + 2]) & 0x3ff0) >> 4,
    ((buffer[o + 2] << 8 | buffer[o + 3]) & 0x0ffc) >> 2,
    (buffer[o + 3] << 8 | buffer[o + 4]) & 0x3ff,
  ];
}

function drawRAW_sw(canvas, buffer, format, width, height, stride) {

  var context = document.getElementById(canvas.attr('id')).getContext("2d");
  var output = context.createImageData(width, height);

  if (format == 'DUMP10') {
    for (let h=0; h<height; h++) {
      for (let w=0; w<width; w+=4) {
        let raw = read_raw10_x4(buffer, h, w, stride);
	console.log(raw);
      }
    }
  }

  else if (format.endsWith('8')) {
    for (let h=0; h<height; h+=2) {
      for (let w=0; w<width; w+=4) {

	let raw = read_raw8_4x6(buffer, h, w, stride);
	let dst = w * 4 + h * width * 4;

	if (format == 'BAYER-BGGR8') {
	  write_pixel(output.data, dst, read_bayer_b(raw, 1, 1));
	  write_pixel(output.data, dst+4, read_bayer_g1(raw, 1, 2));
	  write_pixel(output.data, dst+8, read_bayer_b(raw, 1, 3));
	  write_pixel(output.data, dst+12, read_bayer_g1(raw, 1, 4));
	  dst += width * 4;
	  write_pixel(output.data, dst, read_bayer_g2(raw, 2, 1));
	  write_pixel(output.data, dst+4, read_bayer_r(raw, 2, 2));
	  write_pixel(output.data, dst+8, read_bayer_g2(raw, 2, 3));
	  write_pixel(output.data, dst+12, read_bayer_r(raw, 2, 4));
	}
	else if (format == 'BAYER-RGGB8') {
	  write_pixel(output.data, dst, read_bayer_r(raw, 1, 1));
	  write_pixel(output.data, dst+4, read_bayer_g2(raw, 1, 2));
	  write_pixel(output.data, dst+8, read_bayer_r(raw, 1, 3));
	  write_pixel(output.data, dst+12, read_bayer_g2(raw, 1, 4));
	  dst += width * 4;
	  write_pixel(output.data, dst, read_bayer_g1(raw, 2, 1));
	  write_pixel(output.data, dst+4, read_bayer_b(raw, 2, 2));
	  write_pixel(output.data, dst+8, read_bayer_g1(raw, 2, 3));
	  write_pixel(output.data, dst+12, read_bayer_b(raw, 2, 4));
	}
	else if (format == 'BAYER-GBRG8') {
	  write_pixel(output.data, dst, read_bayer_g1(raw, 1, 1));
	  write_pixel(output.data, dst+4, read_bayer_b(raw, 1, 2));
	  write_pixel(output.data, dst+8, read_bayer_g1(raw, 1, 3));
	  write_pixel(output.data, dst+12, read_bayer_b(raw, 1, 4));
	  dst += width * 4;
	  write_pixel(output.data, dst, read_bayer_r(raw, 2, 1));
	  write_pixel(output.data, dst+4, read_bayer_g2(raw, 2, 2));
	  write_pixel(output.data, dst+8, read_bayer_r(raw, 2, 3));
	  write_pixel(output.data, dst+12, read_bayer_g2(raw, 2, 4));
	}
	else if (format == 'BAYER-GRBG8') {
	  write_pixel(output.data, dst, read_bayer_g2(raw, 1, 1));
	  write_pixel(output.data, dst+4, read_bayer_r(raw, 1, 2));
	  write_pixel(output.data, dst+8, read_bayer_g2(raw, 1, 3));
	  write_pixel(output.data, dst+12, read_bayer_r(raw, 1, 4));
	  dst += width * 4;
	  write_pixel(output.data, dst, read_bayer_b(raw, 2, 1));
	  write_pixel(output.data, dst+4, read_bayer_g1(raw, 2, 2));
	  write_pixel(output.data, dst+8, read_bayer_b(raw, 2, 3));
	  write_pixel(output.data, dst+12, read_bayer_g1(raw, 2, 4));
	}
      }
    }
  }

  else if (format.endsWith('10')) {
    for (let h=0; h<height; h+=2) {
      for (let w=0; w<width; w+=4) {

	let raw = read_raw10_4x6(buffer, h, w, stride);
	let dst = w * 4 + h * width * 4;

	if (format == 'BAYER-BGGR10') {
	  write_pixel_10to8(output.data, dst, read_bayer_b(raw, 1, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_g1(raw, 1, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_b(raw, 1, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_g1(raw, 1, 4));
	  dst += width * 4;
	  write_pixel_10to8(output.data, dst, read_bayer_g2(raw, 2, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_r(raw, 2, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_g2(raw, 2, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_r(raw, 2, 4));
	}
	else if (format == 'BAYER-RGGB10') {
	  write_pixel_10to8(output.data, dst, read_bayer_r(raw, 1, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_g2(raw, 1, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_r(raw, 1, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_g2(raw, 1, 4));
	  dst += width * 4;
	  write_pixel_10to8(output.data, dst, read_bayer_g1(raw, 2, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_b(raw, 2, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_g1(raw, 2, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_b(raw, 2, 4));
	}
	else if (format == 'BAYER-GBRG10') {
	  write_pixel_10to8(output.data, dst, read_bayer_g1(raw, 1, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_b(raw, 1, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_g1(raw, 1, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_b(raw, 1, 4));
	  dst += width * 4;
	  write_pixel_10to8(output.data, dst, read_bayer_r(raw, 2, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_g2(raw, 2, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_r(raw, 2, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_g2(raw, 2, 4));
	}
	else if (format == 'BAYER-GRBG10') {
	  write_pixel_10to8(output.data, dst, read_bayer_g2(raw, 1, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_r(raw, 1, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_g2(raw, 1, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_r(raw, 1, 4));
	  dst += width * 4;
	  write_pixel_10to8(output.data, dst, read_bayer_b(raw, 2, 1));
	  write_pixel_10to8(output.data, dst+4, read_bayer_g1(raw, 2, 2));
	  write_pixel_10to8(output.data, dst+8, read_bayer_b(raw, 2, 3));
	  write_pixel_10to8(output.data, dst+12, read_bayer_g1(raw, 2, 4));
	}
      }
    }
  }

  context.canvas.width = width;
  context.canvas.height = height;
  context.putImageData(output, 0, 0);
}

function drawRAW(canvas, buffer) {

  var format = canvas.data('format').val();
  var width = parseInt(canvas.data('width').val(), 10);
  var height = parseInt(canvas.data('height').val(), 10);
  var stride = parseInt(canvas.data('stride').val(), 10);

  if (!buffer) {
    console.log('no buffer');
    return;
  }

  if (width <= 0 || height <= 0) {
    console.log('no resolution');
    return;
  }

  if (stride <= 0) {
    if (format.endsWith('10'))
	stride = width * 5 / 4;
    else
    	stride = width;
  }

  console.log('%s %dx%d stride %d', format, width, height, stride);

  var t0 = performance.now();
  drawRAW_sw(canvas, buffer, format, width, height, stride);
  var t1 = performance.now();

  console.log('drawRAW took %f ms', t1 - t0);

  zoomImage(canvas);

  // save current settings and buffer
  saveCanvasSettings(canvas);
  canvas.data('buffer', buffer);
}

function refreshImage(canvas) {
  return drawRAW(canvas, canvas.data('buffer'));
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
      drawRAW(canvas, buffer);
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
      drawRAW(canvas, buffer);
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
