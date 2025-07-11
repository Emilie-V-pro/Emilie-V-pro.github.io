#version 300 es
uniform sampler2D uSampler;
uniform ivec2 uResolution;
uniform ivec2 uMouse;

out highp vec4  fragColor;

void main(void) {
  highp vec3 color = vec3(0.0);

  // get distance from the mouse
  highp vec2 mouse = vec2(uMouse) / vec2(uResolution);
  highp vec2 pos = gl_FragCoord.xy  / vec2(uResolution);
  pos.x *= float(uResolution.x) / float(uResolution.y);
  mouse.x *= float(uResolution.x) / float(uResolution.y);

  highp float dist = length(pos - mouse);
    // if the distance is less than 0.1 then color it red
    if (dist < 0.01) {
      color = vec3(1.0, 0.0, 0.0); // red
    } else {
      // otherwise use the texture
      color = vec3(0.0f);
    }

  fragColor = vec4(color, 1); // red
}