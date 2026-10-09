// Custom GLSL for the holographic cosplay card, the falling sakura petals and the twilight sky.

export const cardVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const cardFragment = /* glsl */ `
uniform sampler2D uMap;
uniform float uTime;
uniform vec2 uTilt;      // -1..1 pointer tilt
uniform vec2 uPointer;   // pointer in card uv
uniform float uActive;   // 1 for the featured card
uniform float uHover;
uniform float uAspect;   // width / height
uniform vec3 uAccent;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;

float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// five-petal sakura flower distance-ish mask
float sakura(vec2 p, float size) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float petals = 0.62 + 0.38 * abs(cos(a * 2.5));
  float notch = 1.0 - 0.18 * smoothstep(0.92, 1.0, abs(cos(a * 2.5)));
  return smoothstep(size * petals * notch, size * petals * notch - 0.02, r);
}

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float d = sdRoundBox(p, vec2(0.5 * uAspect, 0.5), 0.045);
  if (d > 0.0) discard;

  vec3 photo = texture2D(uMap, vUv).rgb;
  vec3 col = photo;

  // view-angle driven iridescence
  float fres = 1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0);
  float hue = dot(vUv, vec2(0.55, 0.85)) * 1.4 + uTilt.x * 0.9 + uTilt.y * 0.6 + fres * 1.6 + uTime * 0.025;
  vec3 rainbow = spectrum(hue);

  // tiled sakura foil pattern
  vec2 grid = vUv * vec2(6.0 * uAspect, 6.0);
  vec2 cell = floor(grid);
  vec2 f = fract(grid) - 0.5;
  float rot = hash(cell) * 6.28;
  f = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * f;
  float flower = sakura(f, 0.34) * step(0.35, hash(cell + 7.0));
  float lum = dot(photo, vec3(0.299, 0.587, 0.114));
  float foilMask = mix(0.18, 1.0, flower) * mix(0.55, 1.0, smoothstep(0.2, 0.85, lum));
  float foilStrength = (0.22 + 0.33 * uActive + 0.15 * uHover) * (0.55 + 0.45 * length(uTilt) + fres);
  col += rainbow * foilMask * foilStrength * 0.55;
  col = mix(col, col * (0.85 + 0.3 * rainbow), 0.25 * foilStrength);

  // glitter
  vec2 gcell = floor(vUv * vec2(170.0 * uAspect, 170.0));
  float g = hash(gcell);
  float twinkle = sin(uTime * 3.0 + g * 40.0 + uTilt.x * 12.0 + uTilt.y * 9.0);
  col += vec3(1.0, 0.92, 0.96) * step(0.985, g) * smoothstep(0.6, 1.0, twinkle) * (0.6 + uActive);

  // glare that follows the pointer
  float glare = exp(-6.0 * length((vUv - uPointer) * vec2(uAspect, 1.0)));
  col += vec3(1.0, 0.9, 0.95) * glare * (0.12 + 0.28 * uActive + 0.2 * uHover);

  // gold + vermilion frame
  float frame = smoothstep(-0.034, -0.030, d);
  float inner = smoothstep(-0.046, -0.042, d) - frame;
  vec3 gold = mix(vec3(0.72, 0.5, 0.2), vec3(1.0, 0.88, 0.55), 0.5 + 0.5 * sin(hue * 6.28 + p.y * 10.0));
  gold += rainbow * 0.25;
  col = mix(col, vec3(0.78, 0.12, 0.18), clamp(inner, 0.0, 1.0));
  col = mix(col, gold, frame);

  // soft accent rim when hovered
  col += uAccent * smoothstep(-0.06, 0.0, d) * uHover * 0.6;

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export const cardBackFragment = /* glsl */ `
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float d = sdRoundBox(p, vec2(0.5 * uAspect, 0.5), 0.045);
  if (d > 0.0) discard;
  vec3 col = mix(vec3(0.42, 0.04, 0.09), vec3(0.62, 0.08, 0.12), 0.5 + 0.5 * p.y);
  // seigaiha waves
  vec2 g = p * 14.0;
  g.x += mod(floor(g.y), 2.0) * 0.5;
  vec2 c = fract(g) - vec2(0.5, 0.0);
  float r = length(c);
  float wave = smoothstep(0.04, 0.0, abs(fract(r * 3.0) - 0.5) - 0.18);
  col += vec3(0.25, 0.05, 0.06) * wave * step(r, 1.0);
  // golden sakura crest
  vec2 q = p / 0.22;
  float a = atan(q.y, q.x);
  float rr = length(q);
  float petals = 0.62 + 0.38 * abs(cos(a * 2.5));
  float crest = smoothstep(petals + 0.02, petals, rr) - smoothstep(0.2, 0.17, rr) * 0.6;
  float ring = smoothstep(0.03, 0.0, abs(rr - 1.18) - 0.03);
  vec3 gold = mix(vec3(0.8, 0.56, 0.22), vec3(1.0, 0.9, 0.6), 0.5 + 0.5 * sin(uTime + p.x * 8.0));
  col = mix(col, gold, clamp(crest + ring, 0.0, 1.0));
  float frame = smoothstep(-0.034, -0.030, d);
  col = mix(col, gold, frame);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export const petalVertex = /* glsl */ `
attribute vec3 aOffset;
attribute vec4 aParams; // speed, phase, spin, scale
uniform float uTime;
uniform float uWind;
uniform vec3 uBox;
varying vec2 vUv;
varying float vShade;
mat3 rotXYZ(vec3 a) {
  float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
  return mat3(cy*cz, cy*sz, -sy,
              sx*sy*cz - cx*sz, sx*sy*sz + cx*cz, sx*cy,
              cx*sy*cz + sx*sz, cx*sy*sz - sx*cz, cx*cy);
}
void main() {
  vUv = uv;
  float t = uTime * aParams.x;
  vec3 pos = aOffset;
  pos.y = mod(aOffset.y - t, uBox.y) - 0.2;
  pos.x = mod(aOffset.x + t * uWind + uBox.x * 0.5, uBox.x) - uBox.x * 0.5 + sin(uTime * 0.7 + aParams.y) * 0.6;
  pos.z += cos(uTime * 0.5 + aParams.y * 1.3) * 0.5;
  vec3 ang = vec3(uTime * aParams.z + aParams.y, uTime * aParams.z * 0.7, aParams.y * 2.0 + uTime * 0.4);
  mat3 R = rotXYZ(ang);
  vec3 local = R * (position * aParams.w);
  vShade = 0.65 + 0.35 * abs((R * vec3(0.0, 0.0, 1.0)).z);
  vec4 mv = modelViewMatrix * vec4(pos + local, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

export const petalFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uGlow;
varying vec2 vUv;
varying float vShade;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // petal: rounded teardrop with a notch at the tip
  float body = length(vec2(p.x * 1.6 / (1.0 - 0.35 * p.y), p.y));
  float notch = smoothstep(0.18, 0.0, length(vec2(p.x * 1.4, p.y - 1.0)));
  float a = smoothstep(1.0, 0.86, body) * (1.0 - notch);
  if (a < 0.05) discard;
  vec3 col = mix(uColorA, uColorB, smoothstep(-1.0, 1.0, p.y)) * vShade;
  col += uGlow * vec3(1.0, 0.75, 0.85) * 0.25;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uMoonColor;
uniform vec3 uMoonDir;
uniform float uStars;
uniform float uTime;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
  float m = dot(d, normalize(uMoonDir));
  col += uMoonColor * smoothstep(0.9985, 0.9992, m);
  col += uMoonColor * pow(max(m, 0.0), 180.0) * 0.6;
  vec3 sp = floor(d * 380.0);
  float s = step(0.9975, hash(sp)) * smoothstep(0.08, 0.4, h);
  col += vec3(1.0, 0.95, 1.0) * s * uStars * (0.6 + 0.4 * sin(uTime * 2.0 + hash(sp + 1.0) * 30.0));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;
