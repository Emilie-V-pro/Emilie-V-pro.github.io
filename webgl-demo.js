import { initBuffers } from "./init-buffer.js";
import { drawScene } from "./draw-scene.js";
import { loadTexture } from "./texture-loading.js";
let pos = { x: 0, y: 0 };
main();

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram
      )}`
    );
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

//
// start here
//

async function getShaderSource(id) {
  const test = await fetch("shaders/" + id).then((res) => res.text());
  return test;
}

function getMousePos(e) {
  const canvas = document.querySelector("#gl-canvas");
  var rect = canvas.getBoundingClientRect();
  //this gets your canvas size.
  return {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top),
  };
}
function mousePos(e) {
  pos = getMousePos(e);
}

    function resizeCanvasToDisplaySize(canvas) {
      // Lookup the size the browser is displaying the canvas in CSS pixels.
      const displayWidth  = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
     
      // Check if the canvas is not the same size.
      const needResize = canvas.width  !== displayWidth ||
                         canvas.height !== displayHeight;
     
      if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
      }
     
      return needResize;
    }


async function main() {
  const canvas = document.querySelector("#gl-canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;


  canvas.addEventListener("mousemove", mousePos);
  canvas.addEventListener
  // Initialize the GL context
  const gl = canvas.getContext("webgl2");

  // Only continue if WebGL is available and working
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }

  const vert = await getShaderSource("test.vert");
  const frag = await getShaderSource("test.frag");

  const shaderProgram = initShaderProgram(gl, vert, frag);

  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aVertexColor and also
  // look up uniform locations.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      uSampler: gl.getUniformLocation(shaderProgram, "uSampler"),
      uAlbedoMetal: gl.getUniformLocation(shaderProgram, "uAlbedoMetal"),
      uNormalRoughness: gl.getUniformLocation(
        shaderProgram,
        "uNormalRoughness"
      ),
      uDepth: gl.getUniformLocation(shaderProgram, "uDepth"),
      uResolution: gl.getUniformLocation(shaderProgram, "uResolution"),
      uMouse: gl.getUniformLocation(shaderProgram, "uMouse"),
    },
  };

  const buffers = initBuffers(gl);

  // Load texture
  const texture = loadTexture(gl, "texture/dt.jpg");
  const albedoMetal = loadTexture(gl, "texture/DR_0_c_att_0.png", gl.RGBA8_UNORM);
  const normalRoughness = loadTexture(gl, "texture/DR_0_c_att_1.png", gl.RGBA8_UNORM);
  const depth = loadTexture(gl, "texture/DR_0_d_att.png", gl.R16UI);

  



  // Flip image pixels into the bottom-to-top order that WebGL expects.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  // Draw the scene
  drawScene(gl, programInfo, buffers, texture, albedoMetal, normalRoughness, depth, pos);

  function render() {
     resizeCanvasToDisplaySize(gl.canvas);
     gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    drawScene(gl, programInfo, buffers, texture , albedoMetal, normalRoughness, depth, pos);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
