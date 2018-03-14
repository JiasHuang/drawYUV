
const shaderScript_vsh = `#version 300 es

in vec2 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

void main() {
  // flip the clip space y coordinate to convert from left-bottom corner to left-top corner
  gl_Position = vec4(aPosition * vec2(1, -1), 0, 1);
  vTexCoord = aTexCoord;
}
`;

const shaderScript_fsh_Y = `#version 300 es

precision mediump float;

uniform sampler2D uBufferY;

in vec2 vTexCoord;
out vec4 outColor;

void main() {
  float Y = texture(uBufferY, vTexCoord).x;
  outColor = vec4(Y, Y, Y, 1);
}
`;

const shaderScript_fsh_I420 = `#version 300 es

precision mediump float;

uniform sampler2D uBufferY;
uniform sampler2D uBufferU;
uniform sampler2D uBufferV;

in vec2 vTexCoord;
out vec4 outColor;

void main() {
  float Y = texture(uBufferY, vTexCoord).x;
  float U = texture(uBufferU, vTexCoord).x;
  float V = texture(uBufferV, vTexCoord).x;
  float R = Y * 1.1643828125 + 1.59602734375 * V - 0.87078515625;
  float G = Y * 1.1643828125 - 0.39176171875 * U - 0.81296875 * V + 0.52959375;
  float B = Y * 1.1643828125 + 2.017234375   * U - 1.081390625;
  outColor = vec4(R, G, B, 1);
}
`;

function createRectangleArray(left, right, bottom, top) {
  return new Float32Array([
    left, bottom, right, top, left, top,
    left, bottom, right, top, right, bottom,
  ]);
}

function unpackUV(buffer, width, height) {
  var buffer0 = new Uint8Array(width * height);
  var buffer1 = new Uint8Array(width * height);
  var pos = 0;

  for (let h=0; h<height; h++) {
    for (let w=0; w<width; w++) {
      buffer0[pos] = buffer[pos * 2 + 0];
      buffer1[pos] = buffer[pos * 2 + 1];
      pos++;
    }
  }

  return [buffer0, buffer1];
}

function createProgram(gl, vertexShaderScript, fragmentShaderScript) {

  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderScript);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.log('Vertex shader failed to compile: ' + gl.getShaderInfoLog(vertexShader));
  }

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderScript);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.log('Fragment shader failed to compile: ' + gl.getShaderInfoLog(fragmentShader));
  }

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  return program;
}

function exitProgram(gl, program) {
  gl.deleteProgram(program);
}

function createTexture(gl, width, height, data, index) {

  // create a texture
  var texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + index);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the parameters so we can render any size image.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data);

  return texture;
}

function uploadAttributeBufferData(gl, program, bufferData, attributeName) {
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
  var location = gl.getAttribLocation(program, attributeName);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
}

function drawYUV_webgl2(canvas, buffer, format, width, height, pitchY, pitchC) {

  var sizeY = pitchY * height;
  var sizeC = pitchC * (height>>1);
  var bufferY = buffer.slice(0, sizeY);
  var bufferU = null;
  var bufferV = null;

  if (format == 'I420' || format == 'YV12') {
    var buffers = [
      buffer.slice(sizeY, sizeY + sizeC),
      buffer.slice(sizeY + sizeC, sizeY + sizeC * 2)
    ];
    if (format == 'I420') {
      bufferU = buffers[0];
      bufferV = buffers[1];
    } else {
      bufferU = buffers[1];
      bufferV = buffers[0];
    }
  }

  if (format == 'NV12' || format == 'NV21') {
    var buffers = unpackUV(buffer.slice(sizeY, sizeY + sizeC), pitchC>>1, height>>1);
    pitchC = pitchC >> 1;
    if (format == 'NV12') {
      bufferU = buffers[0];
      bufferV = buffers[1];
    } else {
      bufferU = buffers[1];
      bufferV = buffers[0];
    }
  }

  var gl = document.getElementById(canvas.attr('id')).getContext('webgl2');

  var shaderScript_fsh = {
    Y : shaderScript_fsh_Y,
    I420 : shaderScript_fsh_I420,
    YV12 : shaderScript_fsh_I420,
    NV12 : shaderScript_fsh_I420,
    NV21 : shaderScript_fsh_I420,
  };

  // setup GLSL program
  var program = createProgram(gl, shaderScript_vsh, shaderScript_fsh[format]);

  // Create a Rectangle
  uploadAttributeBufferData(gl, program, createRectangleArray(-1, 1, -1, 1), "aPosition");

  // provide texture coordinates for the rectangle.
  uploadAttributeBufferData(gl, program, createRectangleArray(0, width/pitchY, 0, 1), "aTexCoord");

  // Create a textures
  createTexture(gl, pitchY, height, bufferY, 0);

  if (format == 'I420' || format == 'YV12' || format == 'NV12' || format == 'NV21') {
    createTexture(gl, pitchC, height>>1, bufferU, 1);
    createTexture(gl, pitchC, height>>1, bufferV, 2);
  }

  // set canvas drawing size
  gl.canvas.width = width;
  gl.canvas.height = height;

  // clip space (-1, 1) => pixels (screen space)
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);

  gl.uniform1i(gl.getUniformLocation(program, 'uBufferY'), 0);

  if (format == 'I420' || format == 'YV12' || format == 'NV12' || format == 'NV21') {
    gl.uniform1i(gl.getUniformLocation(program, 'uBufferU'), 1);
    gl.uniform1i(gl.getUniformLocation(program, 'uBufferV'), 2);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  exitProgram(gl, program);

}
