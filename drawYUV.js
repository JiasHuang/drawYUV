
var yuv = null;
var settings = ['format', 'width', 'height', 'pitchY', 'pitchC', 'zoom'];

function saveCurrentSettings() {
  var lists = settings;
  for (var i=0; i<lists.length; i++)  {
    localStorage.setItem(lists[i], $('#'+lists[i]).val());
  }
}

function loadCurrentSettings() {
  var lists = settings;
  for (var i=0; i<lists.length; i++)  {
    if (localStorage.getItem(lists[i]) === null) {
      return;
    }
    $('#'+lists[i]).val(localStorage.getItem(lists[i]));
  }
}

function zoomImage() {
  var width = $('#width').val();
  var height = $('#height').val();
  var zoom = $('#zoom').val();
  if (width > 0 && height > 0) {
    $("#resultYUV").css({width:width*zoom, height:height*zoom});
    saveCurrentSettings();
  }
}

function yuv2canvas() {

  console.log('yuv2canvas');

  var format = $('#format').val();
  var width = $('#width').val();
  var height = $('#height').val();
  var pitchY = $('#pitchY').val();
  var pitchC = $('#pitchC').val();
  var zoom = $('#zoom').val();

  if (!yuv || width <= 0 || height <= 0) {
    console.log('invalid parameters');
    return;
  }

  if (pitchY <= 0) {
    pitchY = width;
  }

  if (pitchC <= 0) {
    if (format == 'NV12' || format == 'YV12') {
      pitchC = pitchY;
    }
    if (format == 'I420') {
      pitchC = pitchY >> 1;
    }
  }

  var canvas  = document.getElementById("resultYUV");
  var context = canvas.getContext("2d");
  var output  = context.createImageData(width, height);

  var offsetY = 0;
  var offsetC = pitchY * height;
  var offsetU = pitchY * height;
  var offsetV = offsetU + pitchC * (height>>1);
  var w, h;

  if (format == 'YV12') {
    offsetV = pitchY * height;
    offsetU =  offsetU + pitchC * (height>>1);
  }

  if (format == 'Y') {
    for (h=0; h<height; h++) {
      for (w=0; w<width; w++) {
        posY = w + h * pitchY + offsetY;
        Y = yuv[posY];
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
        Y = yuv[posY];
        U = yuv[posU];
        V = yuv[posV];
        pos = w*4 + width*h*4;
        output.data[pos+0] = Y + 1.370 * (V - 128);
        output.data[pos+1] = Y - 0.698 * (V - 128) - 0.337 * (U - 128);
        output.data[pos+2] = Y + 1.732 * (U - 128);
        output.data[pos+3] = 255;
      }
    }
  }

  if (format == 'NV12') {
    for (var h=0; h<height; h++) {
      for (var w=0; w<width; w++) {
        posY = w + h * pitchY + offsetY;
        posU = (w>>1)*2 + (h>>1) * pitchC + offsetC;
        posV = posU + 1;
        Y = yuv[posY];
        U = yuv[posU];
        V = yuv[posV];
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

  zoomImage();
  saveCurrentSettings();
}

function readInputFile(f)
{
  console.log('readInputFile: '+f.name);
  var reader = new FileReader();
  reader.onload = function() {
    var data = reader.result;
    yuv = new Uint8Array(reader.result);
    yuv2canvas();
  };
  $('#dropZoneDesc').text(f.name);
  reader.readAsArrayBuffer(f);
}

function handleFileSelect(e) {
  console.log('handleFileSelect');
  var files = e.target.files;
  for (var i = 0, f; f = files[i]; i++) {
    readInputFile(f);
  }
}

function handleDrop(e) {
  e.preventDefault();
  var dt = e.dataTransfer;
  if (dt.items) {
    for (var i=0; i < dt.items.length; i++) {
      if (dt.items[i].kind == "file") {
        $('#files').val('');
        readInputFile(dt.items[i].getAsFile());
      }
    }
  }
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDragEnd(e) {
  var dt = e.dataTransfer;
  if (dt.items) {
    for (var i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    e.dataTransfer.clearData();
  }
}

function onDocumentReady() {
  // Check for the various File API support.
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    alert('The File APIs are not fully supported in this browser.');
  }
  document.getElementById('files').addEventListener('change', handleFileSelect, false);
  loadCurrentSettings();
}
