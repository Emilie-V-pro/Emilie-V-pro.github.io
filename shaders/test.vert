#version 300 es

in vec4 aVertexPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main(void) { gl_Position = aVertexPosition; }