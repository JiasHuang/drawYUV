
const AppType =
{
  Table : 0,
  Tree : 1
};

var json_obj = null;
var app_type = AppType.Table;

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

  to_table(obj)
  {
    if (this.depth == 0)
    {
      this.html = '<table>';
    }

    for (const k in obj)
    {
      let v = obj[k];
      if (Array.isArray(v) && v.length >= 1 && (typeof v[0] === 'object'))
      {
        this.depth++;
        for (let i = 0; i < v.length; i++)
        {
          this.html += str_fmt('<tr><td>{}[{}]</td><td><table width="100%">', k, i);
          this.to_table(v[i]);
          this.html += '</table></td></tr>';
        }
        this.depth--;
      }
      else
      {
        this.html += str_fmt('<tr><td>{}</td><td class="value">{}</td></tr>', k, JSON.stringify(v).replaceAll('"', ''));
      }
    }

    if (this.depth == 0)
    {
      this.html += '</table>';
    }
  }

  to_tree(obj)
  {
    if (this.depth == 0)
    {
      this.html = '<ul>';
    }

    for (const k in obj)
    {
      let v = obj[k];
      if (Array.isArray(v) && v.length >= 1 && (typeof v[0] === 'object'))
      {
        this.depth++;
        for (let i = 0; i < v.length; i++)
        {
          this.html += str_fmt('<li><span class="caret">{}[{}]</span><ul class="nested">', k, i);
          this.to_tree(v[i]);
          this.html += '</ul></li>';
        }
        this.depth--;
      }
      else
      {
        this.html += str_fmt('<li>{} : {}</li>', k, JSON.stringify(v).replaceAll('"', ''));
      }
    }

    if (this.depth == 0)
    {
      this.html += '</ul>';
    }
  }

  enable_toggle ()
  {
    var toggler = document.getElementsByClassName("caret");
    for (let i = 0; i < toggler.length; i++)
    {
      toggler[i].addEventListener("click", function() {
        this.parentElement.querySelector(".nested").classList.toggle("active");
      });
    }
  }

}

function readInputFile(file)
{
  var reader = new FileReader();
  reader.onload = function()
  {
    obj = JSON.parse(reader.result);
    update_result(obj, app_type);
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

function to_table()
{
  update_result(json_obj, AppType.Table);
}

function to_tree()
{
  update_result(json_obj, AppType.Tree);
}

function update_result(new_obj, new_type)
{
  if (!new_obj)
    return;

  if (new_obj == json_obj && new_type == app_type)
    return;

  json_obj = new_obj;
  app_type = new_type;

  if (app_type == AppType.Table)
  {
    let jp = new JsonViewer();
    jp.to_table(json_obj);
    document.getElementById('result').innerHTML = jp.html;
  }

  if (app_type == AppType.Tree)
  {
    let jp = new JsonViewer();
    jp.to_tree(json_obj);
    document.getElementById('result').innerHTML = jp.html;
    jp.enable_toggle();
  }

}

function unfoldTree()
{
  if (json_obj && app_type == AppType.Tree)
  {
    var elems = document.getElementsByClassName("nested");
    for(let i = 0; i < elems.length; i++)
    {
      elems[i].classList.add("active");
    }
  }
}

function foldTree()
{
  if (json_obj && app_type == AppType.Tree)
  {
    var elems = document.getElementsByClassName("nested");
    for(let i = 0; i < elems.length; i++)
    {
      elems[i].classList.remove("active");
    }
  }
}

function initApp()
{
  document.getElementById('selectedFiles').addEventListener('change', handleFileSelect, false);
  document.getElementById('dropZone').addEventListener('drop', handleDrop, false);
  document.getElementById('dropZone').addEventListener('dragover', handleDragOver, false);
}
