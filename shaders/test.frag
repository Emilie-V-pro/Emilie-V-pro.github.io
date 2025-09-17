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

struct Ray {
  vec3 ro;
  vec3 rd;
};

const float M_PI = 3.1415926538;

Ray createRay(in vec2 uv, in ivec2 res) {
  // convert pixel to NDS
  vec2 pxNDS = uv * 2. - 1.;
  pxNDS = vec2(pxNDS.x * (float(res.x) / float(res.y)), pxNDS.y);

  // choose an arbitrary HitPoint in the viewing volume
  // z = -1 equals a HitPoint on the near plane, i.e. the screen
  vec3 HitPointNDS = vec3(pxNDS, 0.1);

  // as this is in homogenous space, add the last homogenous coordinate
  vec4 HitPointNDSH = vec4(HitPointNDS, 1.0);
  // transform by inverse projection to get the HitPoint in view space
  vec4 dirEye = inverse(uProjectionMatrix) * HitPointNDSH;

  // since the camera is at the origin in view space by definition,
  // the current HitPoint is already the correct direction
  // (dir(0,P) = P - 0 = P as a direction, an infinite HitPoint,
  // the homogenous component becomes 0 the scaling done by the
  // w-division is not of interest, as the direction in xyz will
  // stay the same and we can just normalize it later
  dirEye.w = 0.;
  vec3 ro = inverse(uViewMatrix)[3].xyz;
  // compute world ray direction by multiplying the inverse view matrix
  vec3 rd = normalize((inverse(uViewMatrix) * dirEye).xyz);
  return Ray(ro, rd);
}

// plane degined by p (p.xyz must be normalized)
highp float plaIntersect(in highp vec3 ro, in highp vec3 rd, in highp vec3 p,
                         in highp vec3 normal) {
  return dot(normal, (ro - p)) / dot(normal, rd);
}

vec3 reconstructWorldPos(vec2 fragCoord, float depth, mat4 projection,
                         mat4 view) {
  // 0..1 → -1..1
  vec2 ndc;
  ndc.x = fragCoord.x * 2.0 - 1.0;
  ndc.y = fragCoord.y * 2.0 - 1.0;
  ndc.y *= -1.0; // Invert Y for Vulkan

  float z_ndc = depth;

  // Position en clip space
  vec4 clip = vec4(ndc, z_ndc, 1.0);

  // Inverse VP
  mat4 invVP = inverse(projection * view);

  // Homogeneous → World
  vec4 world = invVP * clip;
  world /= world.w;

  return world.xyz;
}

vec2 getCroppedUV(vec2 uv, float screenRatio, float minCenterStart,
                  float minCenterEnd) {
  uv = (uv - 0.5) * 2.;
  uv *= (minCenterEnd - minCenterStart);
  if (screenRatio > 1.)
    uv.x *= screenRatio;
  else
    uv.y /= screenRatio;
  return uv * 0.5 + 0.5;
}

float dotClamp(vec3 v1, vec3 v2) { return clamp(dot(v1, v2), 0.0, 1.0); }

//////////////////////////////////////////////////////////////////////////
// BRDF from LearnOpenGL
//////////////////////////////////////////////////////////////////////////

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

float DistributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;

  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = M_PI * denom * denom;

  return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;

  float num = NdotV;
  float denom = NdotV * (1.0 - k) + k;

  return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = GeometrySchlickGGX(NdotV, roughness);
  float ggx1 = GeometrySchlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

vec3 LearnOpenGLBRDF(vec3 albedo, vec2 metal_roughnss, vec3 N, vec3 V, vec3 L,
                     vec3 lightColor) {
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metal_roughnss.r);
  vec3 H = normalize(V + L);

  float NDF = DistributionGGX(N, H, metal_roughnss.g);
  float G = GeometrySmith(N, V, L, metal_roughnss.g);
  vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);

  vec3 kS = F;
  vec3 kD = vec3(1.0) - kS;
  kD *= 1.0 - metal_roughnss.r;

  vec3 numerator = NDF * G * F;
  float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.0001;
  vec3 specular = numerator / denominator;

  // add to outgoing radiance Lo
  float NdotL = max(dot(N, L), 0.0);

  return (kD * albedo / M_PI + specular) * lightColor * NdotL;
}

vec4 fromLinear(vec4 linearRGB) {
  bvec3 cutoff = lessThan(linearRGB.rgb, vec3(0.0031308));
  vec3 higher = vec3(1.055) * pow(linearRGB.rgb, vec3(1.0 / 2.4)) - vec3(0.055);
  vec3 lower = linearRGB.rgb * vec3(12.92);

  return vec4(mix(higher, lower, cutoff), linearRGB.a);
}

const vec2 uv_offsets[5] =
    vec2[5](vec2(0.625, 0.125), vec2(0.125, 0.375), vec2(0.5, 0.5),
            vec2(0.375, 0.875), vec2(0.875, 0.625));

void main(void) {
  float ratio = float(uResolution.x) / float(uResolution.y);
  vec2 mouseUV = (vec2(uMouse) + 0.5) / vec2(uResolution);
  mouseUV = vec2(mouseUV.x, 1.0 - mouseUV.y);
  mouseUV = getCroppedUV(mouseUV, ratio, 0.25, 0.75);
  float depthMouse = float(texture(uDepth, mouseUV).r) / 65535.0;

  vec3 wposMouse =
      reconstructWorldPos(mouseUV, depthMouse, uProjectionMatrix, uViewMatrix);
  vec3 normalMouse = texture(uNormalRoughness, mouseUV).rgb;

  Ray r;
  r.ro = inverse(uViewMatrix)[3].xyz;
  r.rd = normalize(wposMouse - r.ro);

  float d = plaIntersect(r.ro, r.rd, vec3(-6.5, 2, 0), normalize(vec3(1, 0, 0)));
  vec3 lightPOS = r.ro + r.rd* d;
  vec3 outColor = vec3(0);

  for (int i = 0; i < 5; i++) {

    vec2 uv = ((gl_FragCoord.xy ) / vec2(uResolution));
    uv = vec2(uv.x, 1.0 - uv.y);
    uv = getCroppedUV(uv, ratio, 0.25, 0.75);

    vec4 albedo_metalic = texture(uAlbedoMetal, uv);
    vec4 normal_roughness = texture(uNormalRoughness, uv);
    float depth = float(texture(uDepth, uv).r) / 65535.0;

    vec3 wpos = reconstructWorldPos(uv, depth, uProjectionMatrix, uViewMatrix);

    vec3 albedo = albedo_metalic.rgb;
    vec3 normal = normalize((normal_roughness.rgb - 0.5) * 2.);
    vec2 metalRoughness = vec2(albedo_metalic.a, normal_roughness.a);

    

    outColor += LearnOpenGLBRDF(
        albedo, vec2(metalRoughness), normal, -r.rd, normalize(lightPOS - wpos),
        (vec3(1, 1, 1) * 10.) * (1. / distance(lightPOS, wpos)));
  }
  outColor /= 5.;

  // mouseUV = vec2(mouseUV.x, 1.0 - mouseUV.y);

  // mouseUV = getCroppedUV(mouseUV, float(uResolution.x) /
  // float(uResolution.y),
  //                        0.25, 0.75);

  // float dist_to_w = distance(wpos, r.ro);

  fragColor = vec4(outColor, 1);
}
