
var worker = null;

function handleMessage(e)
{
  var parser = new DOMParser();
  var svg = parser.parseFromString(e.data.result, "image/svg+xml");
  var svgEl = svg.documentElement;
  var resultEl = document.getElementById('result');
  resultEl.innerHTML = '';
  resultEl.appendChild(svgEl);
  svgPanZoom(svgEl, {
    zoomEnabled: true,
    controlIconsEnabled: true,
    fit: true,
    center: true,
  });
}

function readInputFile(file)
{
  var reader = new FileReader();
  reader.onload = function()
  {
    var digraph = reader.result;
    var params = {
      'src': digraph,
      'id': 0,
      'options': {
        'files': [],
        'format': 'svg',
        'engine' : 'dot'
      },
    };
    worker.postMessage(params);
  }

  reader.readAsText(file);
}

function handleFileSelect(e)
{
  var files = e.target.files;
  readInputFile(files[0]);
}

function handleDrop(e)
{
  e.preventDefault();
  var dt = e.dataTransfer;
  readInputFile(dt.items[0].getAsFile());
}

function handleDragOver(e)
{
  e.preventDefault();
}

function initApp()
{
  worker = new Worker("full.render.js");
  //worker = new Worker(URL.createObjectURL(new Blob(["(" + local_worker_function.toString() + ")()"], { type: 'text/javascript' })));
  worker.addEventListener("message", handleMessage, false);
  document.getElementById('selectedFiles').addEventListener('change', handleFileSelect, false);
  document.getElementById('dropZone').addEventListener('drop', handleDrop, false);
  document.getElementById('dropZone').addEventListener('dragover', handleDragOver, false);
}
