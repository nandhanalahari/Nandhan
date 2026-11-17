/**
 * GLSL for the universe. Everything is a ShaderMaterial: surfaces are lit by one
 * point light at the world origin (the pulsar), shaded in linear light and
 * tone-mapped in `display()`. Additive layers write alpha 0 so the canvas
 * composites over the CSS nebula.
 */

const NOISE = /* glsl */ `
#define HEX(r, g, b) pow(vec3(r, g, b) / 255.0, vec3(2.2))
float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1, 0, 0)), f.x),
                 mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), f.x),
                 mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
const mat3 OCT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = OCT * p * 2.03; a *= 0.5; }
  return s / 0.96875;
}
float fbm3(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = OCT * p * 2.03; a *= 0.5; }
  return s / 0.875;
}
vec3 display(vec3 c) {
  c = 1.0 - exp(-max(c, 0.0) * 1.45);
  return pow(c, vec3(0.4545));
}
`

/* ------------------------------------------------------------------ bodies */

export const bodyVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

/**
 * Shared lighting for every solid body. One light: the pulsar at the origin.
 * Diffuse is Lambert, optionally flattened toward Lommel-Seeliger for dusty
 * regolith, or limb-darkened (Minnaert) for gas giants; atmospheres scatter
 * at the limb, strongly forward when the body is back-lit. Output is
 * premultiplied: the limb gets analytic coverage (no stair-stepping) and the
 * whole body can fade when it would sit behind page text. Dithered after
 * tone mapping so dark gradients never band.
 */
const SHADE = /* glsl */ `
const vec3 SUN = vec3(1.0, 0.965, 0.92);
float ign(vec2 fc) { return fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))); }
float diffuse(float ndl, float ndv, float flatten) {
  float lam = max(ndl, 0.0);
  float ls = 2.0 * lam / (lam + max(ndv, 0.0) + 1e-3);
  return mix(lam, ls * 0.62, flatten);
}
float minnaert(float ndl, float ndv, float k) {
  return pow(max(ndl, 0.0), k) * pow(max(ndv, 0.02), k - 1.0);
}
float spec(vec3 N, vec3 L, vec3 V, float rough, float f0) {
  vec3 H = normalize(L + V);
  float nl = max(dot(N, L), 0.0);
  float nv = max(dot(N, V), 1e-3);
  float nh = max(dot(N, H), 0.0);
  float a2 = rough * rough * rough * rough;
  float dd = nh * nh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dd * dd);
  float F = f0 + (1.0 - f0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
  float k = rough * 0.5;
  float G = nl / (nl * (1.0 - k) + k) * nv / (nv * (1.0 - k) + k);
  return D * F * G / (4.0 * nv);
}
/** Thin atmosphere seen against the surface: a rim on the lit side, a forward-scattered glow along a back-lit terminator. */
vec3 atmo(vec3 V, vec3 L, vec3 tint, float ndv, float ndl, float thick) {
  float edge = pow(1.0 - ndv, 5.0 - 2.0 * thick);
  float lit = smoothstep(-0.25, 0.55, ndl);
  float fwd = pow(max(dot(-L, V), 0.0), 5.0);
  float twi = smoothstep(-0.45, -0.02, ndl) * (1.0 - smoothstep(-0.02, 0.45, ndl));
  return tint * edge * (lit + fwd * twi * 4.0);
}
/** Day-side haze: the surface fades into the sky colour toward the limb. */
vec3 haze(vec3 col, vec3 tint, float ndv, float ndl, float amount) {
  float k = pow(1.0 - ndv, 2.2) * amount;
  return mix(col, tint * smoothstep(-0.15, 0.6, ndl), k);
}
vec4 bodyOut(vec3 col, float ndv) {
  float cover = clamp(ndv / max(fwidth(ndv), 1e-5) * 0.6, 0.0, 1.0);
  float a = cover * uFade;
  vec3 c = display(col) + (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  return vec4(max(c, 0.0) * a, a);
}
vec3 rotY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
`

const BODY_HEAD = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uFade;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vPosW;
${NOISE}
${SHADE}
`

const BODY_SETUP = /* glsl */ `
  vec3 p = normalize(vObj);
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(-vPosW);
  vec3 V = normalize(cameraPosition - vPosW);
  float ndl = dot(N, L);
  float ndv = max(dot(N, V), 0.0);
`

/**
 * DC Router: a dark, metallic world. By day, graphite highlands between glassy
 * basalt plains, with a real terminator. By night the continents carry the data
 * halls: sparse ion-blue facilities on a fine grid, fibre runs between dense
 * districts, coastlines traced like circuit paths. One district runs hot.
 */
export const dcRouterFrag = /* glsl */ `
${BODY_HEAD}
uniform vec3 uHot;
vec2 cubeUV(vec3 p, out float face) {
  vec3 a = abs(p);
  vec2 uv;
  if (a.x >= a.y && a.x >= a.z) { uv = p.yz / a.x; face = p.x > 0.0 ? 1.0 : 2.0; }
  else if (a.y >= a.z) { uv = p.xz / a.y; face = p.y > 0.0 ? 3.0 : 4.0; }
  else { uv = p.xy / a.z; face = p.z > 0.0 ? 5.0 : 6.0; }
  return atan(uv) * 1.27324;
}
/** Metropolitan clusters: a few scattered centres per cell, each falling off from a bright core. */
float metro(vec3 q) {
  vec3 ib = floor(q - 0.5);
  float m = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 cell = ib + vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1));
    vec3 rnd = hash33(cell + 13.0);
    vec3 c = cell + 0.5 + (rnd - 0.5) * 0.8;
    float r = 0.2 + 0.36 * rnd.x;
    vec3 d = q - c;
    m = max(m, step(0.18, rnd.y) * exp(-dot(d, d) / (r * r)) * (0.45 + 0.55 * rnd.z));
  }
  return m;
}
void main() {
${BODY_SETUP}
  float h = fbm(p * 1.8 + vec3(4.0, 1.3, 7.7));
  float d3 = fbm3(p * 8.0 + 2.0);
  h += 0.12 * (d3 - 0.5);
  float land = smoothstep(0.497, 0.512, h);
  float relief = smoothstep(0.52, 0.8, h);
  vec3 plain = mix(HEX(6, 8, 12), HEX(15, 19, 27), smoothstep(0.3, 0.5, h));
  float grain = fbm(p * 22.0 + 9.0);
  vec3 rock = mix(HEX(38, 41, 48), HEX(88, 88, 92), relief) * (0.55 + 0.5 * d3 + 0.7 * (grain - 0.5));
  rock = mix(rock, HEX(120, 112, 100), 0.25 * smoothstep(0.62, 0.85, grain) * relief);
  vec3 alb = mix(plain, rock, land);
  vec3 col = alb * SUN * diffuse(ndl, ndv, 0.3) * 1.7;
  col += SUN * spec(N, L, V, 0.2, 0.08) * (1.0 - land) * 0.45;
  col += SUN * spec(N, L, V, 0.62, 0.05) * land * 0.12;

  // --- night: data halls
  float face;
  vec2 uv = cubeUV(p, face);
  float coast = exp(-pow((h - 0.505) * 22.0, 2.0));
  float hot = smoothstep(0.93, 0.99, dot(N, uHot));
  // districts: clustered, densest along coasts and in lowland basins, thin in the highlands
  float m = metro(p * 4.6 + vec3(0.0, 3.0, 0.0)) * (0.75 + 0.5 * fbm3(p * 9.0 + 5.0));
  float inland = smoothstep(0.505, 0.535, h);
  float dens = inland * smoothstep(0.04, 0.7, m + 0.1 * coast - 0.12 * relief);
  dens = max(dens, inland * hot * 0.55);
  float core = inland * smoothstep(0.55, 0.95, m);

  // facilities on two grid scales: big halls on a coarse lattice, small ones filling dense districts
  float lights = 0.0;
  float pxw = 0.0;
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 30.0 : 72.0;
    vec2 g = uv * sc;
    vec2 cell = floor(g);
    vec2 f = fract(g) - 0.5;
    vec3 rnd = hash33(vec3(cell, face * 7.0 + float(k) * 50.0));
    pxw = max(fwidth(g.x), fwidth(g.y));
    vec2 jit = (rnd.xy - 0.5) * 0.5;
    float want = k == 0 ? dens * 0.55 : dens * (0.25 + 0.7 * core);
    float on = step(1.0 - want, rnd.z);
    float s = k == 0 ? 0.1 : 0.12;
    float se = max(s, pxw * 0.55);
    vec2 fj = f - jit;
    lights += on * (s * s) / (se * se) * exp(-dot(fj, fj) / (se * se)) * (0.3 + 0.7 * fract(rnd.z * 31.0)) * (k == 0 ? 2.2 : 1.0);
  }

  // fibre: short runs of a lattice, only inside the densest districts
  vec2 g2 = uv * 30.0;
  vec2 fw2 = max(fwidth(g2), vec2(1e-4));
  vec2 near = floor(g2 + 0.5);
  vec2 dl = abs(g2 - near) / fw2;
  float wx = step(0.62, hash31(vec3(near.x, floor(g2.y), face + 20.0)));
  float wy = step(0.62, hash31(vec3(floor(g2.x), near.y, face + 40.0)));
  float fibre = exp(-dl.x * dl.x * 1.6) * wx + exp(-dl.y * dl.y * 1.6) * wy;
  fibre *= smoothstep(0.2, 0.6, dens) * (1.0 - smoothstep(0.08, 0.25, max(fw2.x, fw2.y)));

  // the glow of halls too small to resolve, brightest in the cores
  lights += fibre * 0.16 + dens * 0.012 + core * 0.05;
  float night = smoothstep(0.08, -0.14, ndl);
  float pulse = 0.5 + 0.5 * sin(uTime * 0.75);
  vec3 ion = mix(HEX(92, 160, 255), HEX(200, 226, 255), clamp(lights * 0.35, 0.0, 1.0));
  vec3 warm = mix(HEX(255, 120, 50), HEX(255, 206, 140), clamp(lights * 0.35, 0.0, 1.0));
  col += mix(ion, warm, hot) * lights * night * 2.2 * (1.0 + hot * (0.2 + 0.6 * pulse));
  // the overheating district bleeds a soft thermal glow into the ground around it
  col += HEX(255, 84, 30) * hot * dens * (0.02 + 0.035 * pulse) * night;
  // starlight: the night side keeps a trace of its continents
  col += mix(HEX(4, 6, 10), HEX(12, 16, 24), land) * 0.25 * night;

  col += atmo(V, L, HEX(74, 128, 240) * 0.55, ndv, ndl, 0.6);
  gl_FragColor = bodyOut(col, ndv);
}
`

/** NavRisk: ocean world with continents, ice caps, a drifting cloud deck that shadows the ground, and town lights at night. */
export const navriskFrag = /* glsl */ `
${BODY_HEAD}
uniform mat4 modelMatrix;
float clouds(vec3 p) {
  float ca = uTime * 0.011;
  vec3 q = rotY(p, ca);
  float c = fbm(q * vec3(3.0, 4.2, 3.0) + 0.7 * fbm3(q * 2.0 + 20.0) + vec3(0.0, uTime * 0.003, 0.0));
  return smoothstep(0.5, 0.74, c);
}
void main() {
${BODY_SETUP}
  float h = fbm(p * 1.7 + vec3(7.3, 1.1, 3.7));
  float detail = fbm3(p * 7.0 + 2.0);
  h += 0.16 * (detail - 0.5);
  float land = smoothstep(0.512, 0.53, h);
  float ice = smoothstep(0.8, 0.9, abs(p.y) + (h - 0.5) * 0.4);
  vec3 ocean = mix(HEX(4, 18, 50), HEX(16, 84, 130), smoothstep(0.38, 0.515, h));
  float elev = smoothstep(0.53, 0.72, h);
  vec3 lowland = mix(HEX(48, 88, 58), HEX(146, 126, 86), smoothstep(0.15, 0.6, elev + (detail - 0.5) * 0.6 + (0.5 - abs(p.y)) * 0.3));
  vec3 landc = mix(lowland, HEX(114, 106, 100), smoothstep(0.6, 0.95, elev));
  vec3 surf = mix(mix(ocean, landc, land), HEX(222, 234, 246), ice);

  float cloud = clouds(p);
  vec3 Lo = normalize(transpose(mat3(modelMatrix)) * L);
  float cshadow = clouds(normalize(p + Lo * 0.018));

  float diff = diffuse(ndl, ndv, 0.0);
  vec3 col = surf * SUN * diff * 1.6 * (1.0 - 0.45 * cshadow * (1.0 - cloud));
  col += SUN * spec(N, L, V, 0.22, 0.03) * (1.0 - land) * (1.0 - ice) * (1.0 - cloud) * 1.4;
  col = mix(col, vec3(0.93, 0.95, 1.0) * SUN * (diffuse(ndl, ndv, 0.15) * 1.55 + 0.004), cloud * 0.93);

  float towns = step(0.74, vnoise(p * 70.0)) * smoothstep(0.45, 0.7, fbm3(p * 6.0 + 3.0)) * land * (1.0 - ice);
  col += HEX(255, 186, 116) * towns * smoothstep(0.06, -0.12, ndl) * (1.0 - cloud) * 0.45;

  col = haze(col, HEX(70, 132, 236) * 0.75, ndv, ndl, 0.6);
  col += atmo(V, L, HEX(84, 150, 255) * 0.85, ndv, ndl, 1.0);
  gl_FragColor = bodyOut(col, ndv);
}
`

/** Kolana: banded giant, violet to teal, zonal winds shearing the bands, one long-lived storm; a scan line sweeps pole to pole. */
export const kolanaFrag = /* glsl */ `
${BODY_HEAD}
uniform float uScan;
uniform float uScanDir;
void main() {
${BODY_SETUP}
  float lat = p.y;
  vec3 q = rotY(p, sin(lat * 11.0) * uTime * 0.012);
  float w = fbm(vec3(q.x * 1.8, q.y * 8.0, q.z * 1.8) + 3.0);
  float fine = fbm(vec3(q.x * 5.0, q.y * 36.0, q.z * 5.0) + w * 2.8);
  float b = lat * 8.5 + (w - 0.5) * 1.3 + (fine - 0.5) * 0.5;
  float v = 0.5 + 0.5 * sin(b * 3.14159);
  v = mix(v, 0.5 + 0.5 * sin(lat * 26.0 + (fine - 0.5) * 2.0), 0.28);
  v = mix(v, 0.45, 0.45 * smoothstep(0.4, 0.75, fbm3(q * 2.6 + 40.0)));
  float g = smoothstep(-0.85, 0.85, lat + (w - 0.5) * 0.4);
  vec3 base = mix(HEX(64, 36, 170), HEX(14, 150, 142), g);
  base = mix(base, HEX(132, 64, 186), 0.4 * (1.0 - abs(g * 2.0 - 1.0)));
  // belts are dark and saturated, zones pale; thin bright streaks ride the band edges
  float zone = smoothstep(0.35, 0.85, v);
  vec3 alb = mix(base * 0.66, mix(base, HEX(206, 216, 248), 0.12), zone);
  float streak = fbm3(vec3(q.x * 14.0, q.y * 90.0, q.z * 14.0) + fine * 3.0);
  alb *= 0.82 + 0.36 * streak;
  alb = mix(alb, HEX(226, 232, 255), 0.12 * smoothstep(0.62, 0.8, fine) * zone);
  vec3 sd = q - normalize(vec3(0.62, -0.36, 0.7));
  float storm = exp(-(sd.x * sd.x * 18.0 + sd.y * sd.y * 80.0 + sd.z * sd.z * 18.0));
  float eye = exp(-(sd.x * sd.x * 90.0 + sd.y * sd.y * 400.0 + sd.z * sd.z * 90.0));
  alb = mix(alb, HEX(236, 226, 255), storm * 0.55);
  alb = mix(alb, HEX(120, 70, 200), eye * 0.6);
  alb = mix(alb, alb * 0.55, smoothstep(0.86, 1.0, abs(lat)));

  vec3 col = alb * SUN * minnaert(ndl, ndv, 1.12) * 1.75;

  float d = lat - uScan;
  float pw = max(fwidth(lat), 1e-4);
  float line = exp(-pow(d / max(0.0035, pw * 0.9), 2.0)) * 0.9 + exp(-d * d * 900.0) * 0.08;
  float wake = step(0.0, -d * uScanDir) * exp(d * uScanDir * 9.0) * 0.035;
  col += HEX(170, 255, 236) * (line + wake) * (0.4 + 0.6 * smoothstep(-0.3, 0.3, ndl));

  col = haze(col, mix(HEX(120, 100, 255), HEX(70, 210, 200), g) * 0.7, ndv, ndl, 0.5);
  col += atmo(V, L, mix(HEX(120, 106, 255), HEX(64, 214, 200), g) * 0.6, ndv, ndl, 1.0);
  gl_FragColor = bodyOut(col, ndv);
}
`

/** Ring structure in planet radii: faint inner ring, dense main ring, a division, the outer ring with a narrow gap. Particles follow the same profile. */
const RING_DENSITY = /* glsl */ `
float ringDensity(float r) {
  float c = smoothstep(1.32, 1.38, r) * (1.0 - smoothstep(1.5, 1.53, r)) * 0.22;
  float b = smoothstep(1.53, 1.57, r) * (1.0 - smoothstep(1.92, 1.94, r)) * (0.7 + 0.3 * smoothstep(1.6, 1.85, r));
  float a = smoothstep(2.02, 2.05, r) * (1.0 - smoothstep(2.3, 2.34, r)) * 0.62;
  float gap = 1.0 - 0.9 * exp(-pow((r - 2.22) / 0.008, 2.0));
  return c + b + a * gap;
}
`

/** MemeQA: pale banded world; the ring casts its shadow across it. */
export const memeqaFrag = /* glsl */ `
${BODY_HEAD}
uniform vec3 uCenter;
uniform vec3 uRingN;
uniform float uRadius;
${RING_DENSITY}
void main() {
${BODY_SETUP}
  float w = fbm(vec3(p.x * 1.6, p.y * 6.0, p.z * 1.6) + 5.0);
  float fine = fbm3(vec3(p.x * 5.0, p.y * 26.0, p.z * 5.0) + w);
  float b = p.y * 5.5 + (w - 0.5) * 1.2 + (fine - 0.5) * 0.3;
  float v = 0.5 + 0.5 * sin(b * 3.14159);
  vec3 alb = mix(HEX(214, 166, 148), HEX(244, 228, 206), v);
  alb = mix(alb, HEX(170, 180, 222), smoothstep(0.6, 0.95, abs(p.y)) * 0.6);
  alb *= 0.88 + 0.24 * fine;

  float shadow = 0.0;
  vec3 P = vPosW - uCenter;
  float dn = dot(L, uRingN);
  if (abs(dn) > 1e-4) {
    float tt = -dot(P, uRingN) / dn;
    if (tt > 0.0) shadow = clamp(ringDensity(length(P + L * tt) / uRadius), 0.0, 1.0);
  }
  vec3 col = alb * SUN * minnaert(ndl, ndv, 1.08) * 1.55 * (1.0 - 0.72 * shadow);
  // ringshine: the sunlit ring faintly lights the night side
  col += alb * HEX(60, 54, 48) * 0.06 * smoothstep(0.1, -0.3, ndl) * abs(dot(N, uRingN));

  col = haze(col, HEX(255, 214, 196) * 0.7, ndv, ndl, 0.45);
  col += atmo(V, L, HEX(255, 210, 188) * 0.45, ndv, ndl, 0.8);
  gl_FragColor = bodyOut(col, ndv);
}
`

/** Ring sheet under MemeQA's particles: the continuous optical depth of the ring, lit, shadowed by the planet, glowing when back-lit. */
export const ringSheetVert = /* glsl */ `
varying vec3 vPosW;
varying float vR;
void main() {
  vR = length(position.xz);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
export const ringSheetFrag = /* glsl */ `
precision highp float;
uniform vec3 uCenter;
uniform vec3 uRingN;
uniform float uRadius;
uniform float uFade;
varying vec3 vPosW;
varying float vR;
${NOISE}
${RING_DENSITY}
float ign(vec2 fc) { return fract(52.9829189 * fract(dot(fc, vec2(0.06711056, 0.00583715)))); }
void main() {
  float r = vR;
  float fw = fwidth(r);
  float d = ringDensity(r);
  // fine ringlets, averaged away once they are smaller than a pixel
  float ringlets = 0.68 + 0.32 * sin(r * 210.0 + 3.0 * sin(r * 41.0)) * (0.6 + 0.4 * sin(r * 77.0));
  float bands = 0.75 + 0.25 * sin(r * 38.0 + 1.3) * sin(r * 13.0);
  d *= mix(ringlets, 0.68, smoothstep(0.004, 0.012, fw)) * bands;
  vec3 P = vPosW - uCenter;
  vec3 L = normalize(-vPosW);
  vec3 V = normalize(cameraPosition - vPosW);
  float along = dot(P, L);
  float lit = along < 0.0 ? smoothstep(uRadius * 0.97, uRadius * 1.04, length(P - along * L)) : 1.0;
  float sl = dot(uRingN, L);
  float sv = dot(uRingN, V);
  // the face toward the light is lit directly; the far face only by light leaking through
  float face = sl * sv > 0.0 ? 1.0 : 0.3;
  float fwd = pow(max(dot(-L, V), 0.0), 6.0);
  vec3 alb = mix(HEX(196, 164, 134), HEX(238, 226, 206), smoothstep(1.45, 2.25, r));
  alb = mix(alb, HEX(170, 150, 132), 0.5 * (1.0 - smoothstep(1.5, 1.56, r)));
  vec3 col = alb * (0.55 + 0.45 * sqrt(abs(sl))) * face * (1.0 + fwd * 2.5) * lit * 2.8;
  float a = clamp(d * 0.7, 0.0, 0.82) * uFade;
  vec3 c = display(col) + (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(max(c, 0.0) * a, a);
}
`

/** Now: a young world. Dark cooling crust, a fine network of glowing fractures, a few lava lakes; heat shows best on the night side. */
export const nowFrag = /* glsl */ `
${BODY_HEAD}
void main() {
${BODY_SETUP}
  float flow = uTime * 0.004;
  float n = fbm(p * 2.1 + vec3(1.7, flow, 4.1));
  float plates = fbm(p * 4.4 + n * 1.5 + 7.0);
  float ridge = 1.0 - abs(2.0 * plates - 1.0);
  float rw = max(fwidth(ridge), 1e-4);
  float live = smoothstep(0.35, 0.65, fbm3(p * 3.3 + 21.0));
  float cw = mix(0.988, 0.962, live);
  float crack = smoothstep(cw - rw, min(cw + 0.012 + rw, 0.999), ridge) * (0.25 + 0.75 * live);
  float seam = smoothstep(0.86, 0.985, ridge) * live;
  float lake = smoothstep(0.37, 0.31, n);
  float skin = fbm3(p * 13.0 + vec3(0.0, flow * 3.0, 0.0));
  float lakeHeat = lake * (0.25 + 0.75 * smoothstep(0.58, 0.32, skin));
  float heat = max(crack * (0.55 + 0.45 * smoothstep(0.62, 0.42, n)), lakeHeat);

  float rough = fbm(p * 26.0 + 3.0);
  vec3 crust = mix(HEX(28, 24, 24), HEX(92, 78, 68), smoothstep(0.3, 0.8, n + (plates - 0.5) * 0.4)) * (0.6 + 0.8 * rough);
  crust *= 1.0 - 0.45 * smoothstep(0.7, 0.95, ridge) * (1.0 - crack);
  vec3 col = crust * SUN * diffuse(ndl, ndv, 0.35) * 1.6 * (1.0 - 0.8 * heat);
  float pulse = 0.88 + 0.12 * sin(uTime * 0.5 + n * 14.0);
  // blackbody ramp: deep red at the edges of the heat, orange, then yellow-white at the hottest
  vec3 lava = mix(HEX(150, 26, 8), HEX(255, 104, 30), smoothstep(0.1, 0.6, heat));
  lava = mix(lava, HEX(255, 206, 140), smoothstep(0.7, 1.0, heat));
  float night = 0.55 + 0.45 * smoothstep(0.25, -0.2, ndl);
  col += lava * (heat * 1.1 + seam * 0.05) * pulse * night;

  col = haze(col, HEX(255, 150, 100) * 0.5, ndv, ndl, 0.15);
  col += atmo(V, L, HEX(255, 128, 76) * 0.4, ndv, ndl, 0.6);
  gl_FragColor = bodyOut(col, ndv);
}
`

/** Airless rock: craters, optional ice fractures. Used for Nestor and the three moons of Now. */
export const moonFrag = /* glsl */ `
${BODY_HEAD}
uniform mat4 modelMatrix;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uCrater;
uniform float uCrack;
uniform float uSeed;
uniform float uScale;
float craters(vec3 p, float seed) {
  vec3 ib = floor(p - 0.5);
  float h = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 cell = ib + vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1));
    vec3 rnd = hash33(cell + seed);
    vec3 c = cell + 0.5 + (rnd - 0.5) * 0.4;
    float R = 0.13 + 0.3 * fract(rnd.x * 7.13 + rnd.y * 3.7);
    float x = length(p - c) / R;
    float bowl = -0.55 * (1.0 - smoothstep(0.25, 1.0, x));
    float lip = 0.3 * exp(-(x - 1.0) * (x - 1.0) / 0.03);
    h += (bowl + lip) * R * 2.2;
  }
  return h;
}
float height(vec3 p) {
  float h = (fbm3(p * 3.0 + uSeed) - 0.5) * 0.25;
  h += uCrater * (craters(p * uScale + uSeed, uSeed) + 0.45 * craters(p * uScale * 2.7 + 9.0, uSeed + 3.0));
  return h;
}
void main() {
${BODY_SETUP}
  const float E = 0.004;
  float h0 = height(p);
  vec3 g = vec3(height(p + vec3(E, 0, 0)), height(p + vec3(0, E, 0)), height(p + vec3(0, 0, E))) - h0;
  g = (g - p * dot(g, p)) / E;
  vec3 nb = normalize(N - normalize(mat3(modelMatrix) * g + 1e-6) * min(length(g) * 0.2, 1.1));
  float nl = dot(nb, L);

  float tone = fbm(p * 2.4 + uSeed * 1.7);
  vec3 alb = mix(uColA, uColB, smoothstep(0.3, 0.72, tone + h0 * 0.6));
  float lines = 1.0 - abs(2.0 * fbm3(p * 4.0 + uSeed + tone * 2.0) - 1.0);
  alb = mix(alb, uColA * 0.45, uCrack * smoothstep(0.9, 0.99, lines));

  vec3 col = alb * SUN * diffuse(nl, ndv, 0.55) * smoothstep(-0.08, 0.1, ndl) * 1.6;
  gl_FragColor = bodyOut(col, ndv);
}
`

/** Soft outer atmosphere: back faces of a slightly larger shell; lit side, plus forward scattering when back-lit. */
export const haloVert = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`
export const haloFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uLimb;
uniform float uGain;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  vec3 L = normalize(-vPosW);
  float x = clamp(-dot(N, V) / uLimb, 0.0, 1.0);
  float ndl = dot(N, L);
  float lit = smoothstep(-0.4, 0.4, ndl);
  float fwd = pow(max(dot(-L, V), 0.0), 6.0) * smoothstep(-0.55, -0.05, ndl) * (1.0 - smoothstep(0.1, 0.6, ndl)) * 3.5;
  float prof = pow(x, 3.4) + 0.35 * pow(x, 14.0);
  gl_FragColor = vec4(uColor * prof * (lit + fwd) * uGain, 0.0);
}
`

/* ------------------------------------------------------------------ billboards */

export const spriteVert = /* glsl */ `
uniform float uSize;
varying vec2 vUv;
void main() {
  vUv = position.xy;
  vec4 mv = viewMatrix * modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}
`
export const glowFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
varying vec2 vUv;
void main() {
  float d2 = dot(vUv, vUv);
  float a = max(exp(-d2 * 4.5) - 0.0111, 0.0);
  gl_FragColor = vec4(uColor * a * uGain, 0.0);
}
`
/** A star with a tight core and four fine diffraction spikes (constellation, pulsar core). */
export const starFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
uniform float uSpike;
varying vec2 vUv;
void main() {
  float d = length(vUv);
  float fade = max(1.0 - d, 0.0);
  float core = exp(-d * d * 1400.0) * 2.4 + exp(-d * d * 120.0) * 0.5 + exp(-d * 6.0) * 0.16;
  vec2 a = abs(vUv);
  float spikes = exp(-a.y * 150.0) * exp(-a.x * 5.0) + exp(-a.x * 150.0) * exp(-a.y * 5.0);
  vec3 col = mix(uColor, vec3(1.0), clamp(core * 0.5, 0.0, 1.0)) * (core + spikes * uSpike);
  gl_FragColor = vec4(col * fade * fade * uGain, 0.0);
}
`

/* ------------------------------------------------------------------ pulsar */

/** The neutron star itself: a white-hot point, a tight blue-white corona, faint spikes; flares when a beam sweeps past the camera. */
export const pulsarFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
uniform float uFlash;
varying vec2 vUv;
void main() {
  float d = length(vUv);
  float d2 = d * d;
  float core = exp(-d2 * 900.0) * 5.0;
  float inner = exp(-d2 * 70.0) * 0.9;
  float corona = exp(-d * 8.0) * 0.32 + exp(-d * 2.6) * 0.06;
  vec2 a = abs(vUv);
  float spikes = exp(-a.y * 300.0) * exp(-a.x * 3.5) + exp(-a.x * 300.0) * exp(-a.y * 3.5);
  float lum = core + inner * (1.0 + 0.8 * uFlash) + corona * (1.0 + 0.7 * uFlash) + spikes * (0.18 + 0.4 * uFlash);
  vec3 col = mix(uColor, vec3(1.0), clamp((core + inner) * 0.35, 0.0, 1.0)) * lum;
  float fade = max(1.0 - d, 0.0);
  gl_FragColor = vec4(col * fade * fade * uGain, 0.0);
}
`

export const beamVert = /* glsl */ `
uniform vec3 uAxis;
uniform float uLen;
uniform float uWidth;
varying vec2 vUv;
varying float vFace;
void main() {
  vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 toCam = normalize(cameraPosition - c);
  vec3 side = cross(uAxis, toCam);
  float sl = length(side);
  side = sl > 1e-3 ? side / sl : vec3(1.0, 0.0, 0.0);
  vFace = sl;
  vUv = position.xy;
  vec3 wp = c + uAxis * (position.x * uLen) + side * (position.y * uWidth * (0.12 + 0.88 * position.x));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`
export const beamFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
varying vec2 vUv;
varying float vFace;
void main() {
  float across = vUv.y * vUv.y;
  float along = vUv.x;
  float spine = exp(-across * 110.0);
  float cone = exp(-across * 6.0);
  float fall = pow(1.0 - along, 1.7) * smoothstep(0.0, 0.035, along);
  float body = cone * 0.3 + spine * 0.85 * (1.0 - 0.6 * along);
  vec3 col = mix(uColor, vec3(1.0), spine * (1.0 - along));
  gl_FragColor = vec4(col * body * fall * (1.0 - across) * uGain * smoothstep(0.0, 0.25, vFace), 0.0);
}
`
export const rippleVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xz;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`
export const rippleFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform float uGain;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  // signal fronts leave the star and thin out as they expand
  float ph = fract(r * 3.0 - uTime * 0.16);
  float w = fwidth(r * 3.0);
  float hw = 0.012 + w * 0.75;
  float ring = exp(-pow((ph - 0.5) / hw, 2.0)) * min(1.0, 0.012 / hw * 1.6);
  float fade = pow(1.0 - r, 1.25) * smoothstep(0.05, 0.2, r);
  gl_FragColor = vec4(uColor * (ring * 0.85 + 0.025 * (1.0 - r)) * fade * uGain, 0.0);
}
`

/* ------------------------------------------------------------------ lines */

/** Circle ribbon in the XZ plane, never thinner than ~1.3px. */
export const orbitVert = /* glsl */ `
attribute float aSide;
uniform float uRadius;
uniform float uWidth;
uniform float uPx;
varying float vSide;
void main() {
  vec3 c = (modelMatrix * vec4(position * uRadius, 1.0)).xyz;
  float hw = max(uWidth, 0.75 * distance(cameraPosition, c) / uPx);
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position * (uRadius + aSide * hw), 1.0);
}
`
export const ribbonVert = /* glsl */ `
attribute float aSide;
varying float vSide;
void main() {
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`
export const lineFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
varying float vSide;
void main() {
  float a = 1.0 - vSide * vSide;
  gl_FragColor = vec4(uColor * a * uGain, 0.0);
}
`
export const flatFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
void main() { gl_FragColor = vec4(uColor * uGain, 0.0); }
`
export const flatVert = /* glsl */ `
void main() { gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }
`

/* ------------------------------------------------------------------ points */

/* Galaxy, sky and field stars live in galaxyShaders.ts. */

/** The ring of MemeQA: Keplerian particles, shadowed where the planet blocks the light. */
export const ringVert = /* glsl */ `
attribute vec3 aColor;
attribute vec4 aOrbit; // radius (planet radii), phase, height, size
uniform float uTime;
uniform float uPx;
uniform float uDpr;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uGain;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = aOrbit.x;
  float ang = aOrbit.y + uTime * 0.16 * pow(1.6 / r, 1.5);
  vec4 wp = modelMatrix * vec4(cos(ang) * r, aOrbit.z, sin(ang) * r, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
  vec3 P = wp.xyz - uCenter;
  vec3 L = normalize(-uCenter);
  float along = dot(P, L);
  float lit = along < 0.0 ? smoothstep(uRadius * 0.94, uRadius * 1.05, length(P - along * L)) : 1.0;
  float size = aOrbit.w * uRadius * 0.013 * uPx / max(distance(wp.xyz, cameraPosition), 0.5);
  float minSize = 1.2 * uDpr;
  vec3 V = normalize(cameraPosition - wp.xyz);
  float fwd = pow(max(dot(-L, V), 0.0), 6.0);
  float alpha = mix(0.03, 1.0, lit) * (0.75 + 1.2 * fwd) * uGain;
  if (size < minSize) { alpha *= (size / minSize) * (size / minSize); size = minSize; }
  vAlpha = alpha;
  vColor = aColor;
  gl_PointSize = min(size, 6.0 * uDpr);
}
`
export const dotFrag = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  if (d2 > 1.0) discard;
  gl_FragColor = vec4(vColor * (exp(-d2 * 3.0) - 0.05) * vAlpha, 0.0);
}
`

/** NavRisk's flight arcs: dense point chains with a comet pulse running along each route. */
export const arcVert = /* glsl */ `
attribute vec3 aColor;
attribute vec3 aMeta; // path index + t, size, airport flag
uniform float uTime;
uniform float uPx;
uniform float uDpr;
uniform float uGain;
varying vec3 vColor;
varying float vAlpha;
float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
  float seed = h1(floor(aMeta.x) + 1.0);
  float head = fract(uTime * (0.07 + 0.07 * seed) + seed);
  float d = fract(head - fract(aMeta.x));
  float pulse = exp(-d * 13.0);
  float b = mix(0.2 + 1.9 * pulse, 0.9 + 0.2 * sin(uTime * 1.3 + seed * 40.0), aMeta.z);
  float size = aMeta.y * (1.0 + 1.3 * pulse * (1.0 - aMeta.z)) * 0.012 * uPx / max(distance(wp.xyz, cameraPosition), 0.5);
  float minSize = 1.2 * uDpr;
  if (size < minSize) { b *= (size / minSize) * (size / minSize); size = minSize; }
  vAlpha = b * uGain;
  vColor = mix(aColor, vec3(1.0), pulse * 0.6 * (1.0 - aMeta.z));
  gl_PointSize = min(size, 8.0 * uDpr);
}
`
