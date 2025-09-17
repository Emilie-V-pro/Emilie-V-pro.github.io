function drawScene(
    gl, programInfo, buffers, texture, albedoMetal, normalRoughness, depth,
    mouseInfo) {
  if (!mouseInfo) return;

  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = (45 * Math.PI) / 180;  // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const modelViewMatrix = new Float32Array([
    -0.00270720175, 0.237701744, -0.971334457, 0, 
    0, 0.971338034, 0.237702608, 0, 
    0.999996364, 0.000643508916, -0.00262960792, 0, 
    0.136095524, -0.809797704, -3.99672771, 1
  ]);

  // console.log(projectionMatrix);

  // note: glMatrix always has the first argument
  // as the destination to receive the result.
  // mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const projectionMatrix = new Float32Array([
    1.19175363, 0, 0, 0, 
    0, 1.19175363, 0, 0, 
    0, 0, -1.0080322, -1, 
    0, 0, -0.20080322, 0

  ]);



  // Now move the drawing position a bit to where we want to
  // start drawing the square.
  // mat4.translate(
  //     modelViewMatrix,  // destination matrix
  //     modelViewMatrix,  // matrix to translate
  //     [0, 0, -6.0]);    // amount to translate

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  setPositionAttribute(gl, buffers, programInfo);
  // setTextureAttribute(gl, buffers, programInfo);

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projMatrix, false, projectionMatrix);
  
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.viewMavtrix, false, modelViewMatrix);

    
  gl.uniform2i(
      programInfo.uniformLocations.uMouse, mouseInfo.x,
      gl.canvas.clientHeight - mouseInfo.y);
  gl.uniform2i(
      programInfo.uniformLocations.uResolution, gl.canvas.clientWidth,
      gl.canvas.clientHeight);

  gl.activeTexture(gl.TEXTURE0);

  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, albedoMetal);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, normalRoughness);
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, depth);

  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  gl.uniform1i(programInfo.uniformLocations.uAlbedoMetal, 1);
  gl.uniform1i(programInfo.uniformLocations.uNormalRoughness, 2);
  gl.uniform1i(programInfo.uniformLocations.uDepth, 3);

  {
    const offset = 0;
    const vertexCount = 3;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
  const numComponents = 2;  // pull out 2 values per iteration
  const type = gl.FLOAT;    // the data in the buffer is 32bit floats
  const normalize = false;  // don't normalize
  const stride = 0;  // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0;  // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition, numComponents, type,
      normalize, stride, offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}

function setTextureAttribute(gl, buffers, programInfo) {
  const num = 2;            // every coordinate composed of 2 values
  const type = gl.FLOAT;    // the data in the buffer is 32-bit float
  const normalize = false;  // don't normalize
  const stride = 0;         // how many bytes to get from one set to the next
  const offset = 0;         // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord, num, type, normalize, stride,
      offset);
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
}

export {drawScene};
