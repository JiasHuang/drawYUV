
function str_fmt()
{
  var s = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    s = s.replace('{}', arguments[i]);
  }
  return s;
}

function str_tr()
{
  var s = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    s = s.replace('{}', arguments[i]);
  }
  return '<tr><td>' + s.split('|').join('</td><td>') + '</td></tr>' + '\n';
}

function str_tr_h()
{
  var s = arguments[0];
  for (let i = 1; i < arguments.length; i++) {
    s = s.replace('{}', arguments[i]);
  }
  return '\n' + '<tr><th>' + s.split('|').join('</th><th>') + '</th></tr>' + '\n';
}

class JsonViewer
{
  constructor()
  {
    this.depth = 0;
    this.html = '';
  }

  parse(obj)
  {
    if (this.depth == 0)
    {
      this.html += '<table>';
    }

    for (const k in obj)
    {
      let v = obj[k];
      if (Array.isArray(v) && v.length > 1 && (typeof v[0] === 'object'))
      {
        this.depth++;
        for (let i = 0; i < v.length; i++)
        {
          let title = '';
          if ('id' in v[i])
            title = v[i]['id'];
          this.html += str_fmt('<tr><td>{}[{}] : {}</td><td><table>', k, i, title);
          this.parse(v[i]);
          this.html += '</table></td></tr>';
        }
        this.depth--;
      }
      else
      {
        this.html += str_tr('{} | {}', k, JSON.stringify(v).replaceAll('"', ''));
      }
    }

    if (this.depth == 0)
    {
      this.html += '</table>';
    }
  }

}

function readInputFile(file)
{
  var reader = new FileReader();
  reader.onload = function()
  {
    let obj = JSON.parse(reader.result);
    let jp = new JsonViewer();
    jp.parse(obj);
    document.getElementById('result').innerHTML = jp.html;
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
  document.getElementById('selectedFiles').addEventListener('change', handleFileSelect, false);
  document.getElementById('dropZone').addEventListener('drop', handleDrop, false);
  document.getElementById('dropZone').addEventListener('dragover', handleDragOver, false);
}
