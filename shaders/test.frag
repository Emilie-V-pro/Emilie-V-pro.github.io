#version 300 es

precision highp float;
precision highp usampler2D;
uniform sampler2D uSampler;
uniform sampler2D uAlbedoMetal;
uniform sampler2D uNormalRoughness;
uniform usampler2D uDepth;
uniform ivec2 uResolution;
uniform ivec2 uMouse;


uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

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

vec3 reconstructWorldPos(vec2 fragCoord, float depth, mat4 projection, mat4 view) {
    // 0..1 → -1..1
    vec2 ndc;
    ndc.x = fragCoord.x * 2.0 - 1.0;
    ndc.y = fragCoord.y * 2.0 - 1.0;
    ndc.y *= -1.0; // Invert Y for Vulkan

    float z_ndc = depth;

    // Position en clip space
    vec4 clip = vec4(ndc, z_ndc, 1.0);

    // Inverse VP
    mat4 invVP = inverse(projection * view );

    // Homogeneous → World
    vec4 world = invVP * clip;
    world /= world.w;

    return world.xyz;
}


vec2 getCroppedUV(vec2 uv, float screenRatio, float minCenterStart, float minCenterEnd)
{
    vec2 newUV = uv;

    // Taille du centre minimal
    float minCenterSizeX = minCenterEnd - minCenterStart;
    float minCenterSizeY = minCenterEnd - minCenterStart;

    // Échelle minimale pour garantir que ce rectangle est visible
    float minScaleX = 1.0 / minCenterSizeX; // ex: 1 / 0.5 = 2.0
    float minScaleY = 1.0 / minCenterSizeY;

    if (screenRatio > 1.0) {
        // crop en X
        float scale = max(screenRatio / 1.0, minScaleX);
        newUV.x = (uv.x - 0.5) * scale + 0.5;
    } else {
        // crop en Y
        float scale = max(1.0 / screenRatio, minScaleY);
        newUV.y = (uv.y - 0.5) * scale + 0.5;
    }

    return newUV;
}

void main(void) {
   highp vec2 mouse = vec2(uMouse) / vec2(uResolution);
    highp vec2 pos = gl_FragCoord.xy / vec2(uResolution);
  {
    highp vec3 color = vec3(0.0);

    // get distance from the mouse
   
    

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
}

    // color = vec3(1.0/t);
    vec2 uv = ((gl_FragCoord.xy + 0.5) / vec2(uResolution) );
    uv = vec2(uv.x, 1.0 - uv.y);

    uv = getCroppedUV(uv, float(uResolution.x)/float(uResolution.y), 0.25, 0.75);

    // uv = getCroppedUV(uv, float(uResolution.x) / float(uResolution.y));
    vec4 albedo_metalic = texture(uAlbedoMetal, uv);
    vec4 normal_roughness = texture(uNormalRoughness, uv);
     float depth = float(texture(uDepth, uv).r) / 65535.0;
    
    vec2 ndc;
    ndc.x = uv.x * 2.0 - 1.0;
    ndc.y = uv.y * 2.0 - 1.0;
    ndc.y *= -1.0; // Invert Y for Vulkan
    vec4 clip = vec4(ndc, depth, 1.0);


    vec3 wpos = reconstructWorldPos(uv, depth, uProjectionMatrix, uViewMatrix);
    
    vec3 lightPOS = vec3(-13,3, mix(-25., 25., mouse.x));
    
    vec3 albedo = albedo_metalic.rgb;
    vec3 normal = normal_roughness.rgb ; //- 0.5) * 2.;
    vec3 test = normalize((normalize(normal) - 0.5f) * 2.f);
    vec3 outColor = clamp(dot(test, normalize(lightPOS - wpos)), 0., 1.) * albedo * (1./(distance(lightPOS, wpos) * distance(lightPOS, wpos))) * 1000.;
   if(depth != 1.f)
        fragColor = vec4(albedo_metalic.rgb,1);
    else 
         fragColor = vec4(albedo,1);
}
