#version 300 es
uniform sampler2D uSampler;
uniform sampler2D uAlbedoMetal;
uniform sampler2D uNormalRoughness;
uniform sampler2D uDepth;
uniform ivec2 uResolution;
uniform ivec2 uMouse;

out highp vec4 fragColor;

highp float sphIntersect(highp vec3 ro, highp vec3 rd, highp vec4 sph) {
    highp vec3 oc = ro - sph.xyz;
    highp float b = dot(oc, rd);
    highp float c = dot(oc, oc) - sph.w * sph.w;
    highp float h = b * b - c;
    if (h < 0.0)
        return -1.0;
    h = sqrt(h);
    return -b - h;
}

// plane degined by p (p.xyz must be normalized)
highp float plaIntersect(in highp vec3 ro, in highp vec3 rd, in highp vec3 p, in highp vec3 normal)
{
    return dot(normal, (ro - p)) / dot(normal, rd);
}

void main(void) {
    highp vec3 color = vec3(0.0);

    // get distance from the mouse
    highp vec2 mouse = vec2(uMouse) / vec2(uResolution);
    highp vec2 pos = gl_FragCoord.xy / vec2(uResolution);
    

    mouse = mouse * 2.0 - 1.0; // convert to range [-1, 1]
    pos = pos * 2.0 - 1.0; // convert to range [-1, 1]
    pos.x *= float(uResolution.x) / float(uResolution.y);
    mouse.x *= float(uResolution.x) / float(uResolution.y);

    highp vec3 ro = vec3(0.0, 0.0, 0.0); // ray origin
    highp vec3 rd = normalize(vec3(pos, 1)); // ray

    highp vec4 sph = vec4(0.0, 0.0, 6.0, 1); // sphere at origin with radius 0.1
    highp float t = sphIntersect(ro, rd, sph);
    highp vec3 hit_pos = rd * t; // move to the intersection point
    highp vec3 hit_normal = normalize(hit_pos - sph.xyz);

    highp vec3 plane = vec3(0.0, 1.0, 0.0); // plane at z = 2

    highp float temp = plaIntersect(ro, rd, plane, vec3(0.0, 1.0, 0.0));
    if (temp > 0.0 && (t < 0.0 || temp < t)) {
        t = temp;
        hit_pos = rd * t; // move to the intersection point
        hit_normal = plane.xyz; // plane normal
    }
    // t = temp;

    highp float dist = length(pos - mouse);
    // if the distance is less than 0.1 then color it red
    if (t > 0.0) {
        highp vec3 mouse_plane = vec3(0.0, 0.0, -4.0); // plane at z = 2
        highp vec3 mouse_plane_normal = vec3(0.0, 0.0, -1.0); // plane normal

        highp float mouse_t = plaIntersect(ro, normalize(vec3(mouse, 1)), mouse_plane, mouse_plane_normal);

        highp vec3 mouse_world = ro + normalize(vec3(mouse, 1)) * mouse_t;

        highp float dot = max(dot(hit_normal, normalize(mouse_world - hit_pos)), 0.0);
        color = vec3(dot) * (1.0 / pow(distance(mouse_world, hit_pos), 2.0)); // red
        // color = mouse_world;
    } else {
        // otherwise use the texture
        color = vec3(0.0f);
    }
    // color = vec3(1.0/t);

    highp vec4 test = textureLod(uDepth, gl_FragCoord.xy / vec2(uResolution), 0.0);

    fragColor = vec4(test.rgb, 1); // red
}
