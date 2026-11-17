/**
 * GLSL for the galaxy, the sky and every star that is not a planet.
 *
 * The galaxy is a thin, dusty slab evaluated per pixel: each view ray is cut
 * into a handful of segments across the slab, the vertical (exponential)
 * profiles of stars, young stars and dust are integrated EXACTLY per segment,
 * and only the in-plane structure (arms, dust lanes, clumps) is sampled. So the
 * same shader draws the galaxy from 12,000 units away, the arm filling the
 * screen during the dive, and the Milky-Way band from inside the disc, with
 * real absorption and parallax and no slicing. It renders into a half-float
 * target (0.85x CSS pixels, 0.6x once inside the disc, skipped entirely while the
 * camera is still: the volume is static); `galaxyCompFrag` tone-maps it.
 *
 * Galaxy-local units: the disc is the XZ plane, radius 1 = R_G.
 * Constants must match layout.ts (WIND, arm 0 through the system) and
 * particles.ts (BAR_ANGLE, the noise atlas layout).
 */

const COMMON = /* glsl */ `
#define PI 3.14159265
const float WIND = 2.3;
const float BAR = 0.7739; // ln(1.4) * WIND: the bar ends where the arms start
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec3 display(vec3 c) {
  c = 1.0 - exp(-max(c, 0.0) * 1.45);
  return pow(c, vec3(0.4545));
}
`

/** Arm wobble shared by the volume and the particles, so stars sit in the arms the volume draws. */
const ARM = /* glsl */ `
uniform float uArm0; // wobble at the system, subtracted so arm 0 runs right through it
float armPsi(vec2 p, vec4 lo) {
  float r = max(length(p), 1e-3);
  return atan(p.y, p.x) - log(r / 0.1) * WIND + (lo.r - 0.5) * 0.55 + (lo.g - 0.5) * 0.25 - uArm0;
}
vec2 loUv(vec2 p) { return p * 0.55 + 0.37; }
`

export const fullVert = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const galaxyVolFrag = /* glsl */ `
precision highp float;
uniform sampler2D uNoise;
uniform mat4 uInvVP;
uniform mat4 uGalInv;
uniform vec3 uCam;
uniform float uPix;
uniform float uHalo;
uniform float uNear; // where diffuse light hands over to resolved stars (grows once we are inside the disc)
varying vec2 vNdc;
${COMMON}
${ARM}
uniform int uSteps; // march segments (fewer once inside the disc, where the image is soft)
const float HS = 0.014;  // old stars: scale height
const float HY = 0.005;  // young stars and HII gas
const float HD = 0.0075; // dust: thicker than the young layer, so arms sit inside their lanes
const float YCUT = 0.075;
const float RMAX = 1.3;
const vec3 C_OLD = vec3(1.0, 0.69, 0.42);
const vec3 C_YOUNG = vec3(0.42, 0.6, 1.0);
const vec3 C_HII = vec3(1.0, 0.2, 0.42);
const vec3 EXT = vec3(0.78, 1.0, 1.28);

/** Mean of exp(-|y|/H) over the segment ya..yb (exact). */
float slab(float ya, float yb, float H) {
  float dy = yb - ya;
  if (abs(dy) < 1e-3 * H) return exp(-abs(0.5 * (ya + yb)) / H);
  float fa = sign(ya) * (1.0 - exp(-abs(ya) / H));
  float fb = sign(yb) * (1.0 - exp(-abs(yb) / H));
  return H * (fb - fa) / dy;
}

float lodFor(float footUv) { return log2(max(footUv * 256.0, 1.0)); }

/**
 * In-plane structure at p: old stars (smooth on purpose), young stars, HII and dust.
 * foot = local units per pixel (or per segment, for shallow rays) there: picks the noise LOD.
 */
void field(vec2 p, float foot, out float old, out float young, out float hii, out float dust) {
  float r = length(p);
  vec4 lo = textureLod(uNoise, loUv(p), lodFor(foot * 0.55));
  float psi = armPsi(p, lo);
  float lr = log(max(r, 0.02) / 0.1);
  // arm-aligned log-polar coordinates: a similarity of (phi, ln r), so features stay isotropic and
  // shrink toward the centre like the spiral does; one turn shifts them by whole tiles (10, 23)
  float phi = atan(p.y, p.x);
  vec2 lp = vec2(phi - lr * WIND, phi * WIND + lr) * (10.0 / (2.0 * PI));
  float lpFoot = foot * 10.0 * 2.508 / (2.0 * PI * max(r, 0.03));
  vec4 L = textureLod(uNoise, lp, lodFor(lpFoot));
  vec4 Lf = textureLod(uNoise, lp * 2.0 + 0.31, lodFor(lpFoot * 2.0));
  vec4 C = textureLod(uNoise, p * 2.3 + 0.61, lodFor(foot * 2.3));
  vec4 Cf = textureLod(uNoise, p * 9.0 + 0.17, lodFor(foot * 9.0));

  // arms have a physical half-width (not a phase width), so they stay slender out to the rim
  float w = (0.05 + 0.04 * r) / max(r, 0.05);
  float k = 0.693 / (w * w);
  float a = max(0.5 + 0.5 * cos(2.0 * psi), 0.0);
  float core = pow(a, k);
  float wide = pow(a, k * 0.3);
  // spurs: feathers leaving the outer edge of the arms at a steeper pitch
  float spurSide = smoothstep(0.15, -0.35, sin(2.0 * psi)) * pow(a, k * 0.05);
  float spur = pow(max(0.0, 0.5 + 0.5 * cos(2.0 * (psi + 0.45) + lr * 7.0 + (L.r - 0.5) * 6.0)), 3.0) * spurSide * 0.5;
  // the dust lane hugs the inner (concave) edge, broken into filaments, and spirals on into the bulge
  float lane = pow(max(0.0, 0.5 + 0.5 * cos(2.0 * (psi - 0.02 - 1.1 * w))), k * 2.0) * (0.25 + 1.5 * L.b * Lf.b);

  float taper = 1.0 - smoothstep(0.7, 1.12, r);
  float inner = smoothstep(0.1, 0.2, r);
  float g = (L.g * 0.5 + C.g * 0.5) * (0.6 + 0.8 * Lf.a);
  // strings of bright star clusters along the arm, over a softer clumpy glow
  float bead = smoothstep(0.45, 0.9, Lf.g * 0.5 + Cf.g * 0.5) * (0.4 + Cf.a);
  float clump = 0.05 + 1.3 * g * g + 3.2 * bead * bead * bead;

  // whole arm segments brighten and fade along the arm
  // averaged with the point-mirrored position so both arms carry the same weight (grand-design symmetry)
  float segN = 0.5 * (lo.a + textureLod(uNoise, loUv(-p), lodFor(foot * 0.55)).a);
  float seg = 0.6 + 0.8 * smoothstep(0.3, 0.7, segN);
  young = exp(-r / 0.55) * inner * taper * (core * 1.25 + spur * 0.6 + 0.03 * wide) * clump * seg * 0.4;
  // HII regions: peaked glows, not flat patches
  float knot = pow(smoothstep(0.52, 0.92, Cf.a * 0.6 + Lf.g * 0.4), 2.5) * smoothstep(0.25, 0.7, Cf.g);
  hii = exp(-r / 0.5) * inner * taper * (core + spur * 0.4) * knot * seg * 3.2;
  float fil = 0.3 + 1.4 * L.b * (0.4 + Lf.b) * (0.5 + Cf.b);
  dust = exp(-r / 0.42) * taper * (
    lane * 5.0 * smoothstep(0.012, 0.06, r) +
    fil * smoothstep(0.08, 0.18, r) * (core * 0.15 + 0.2 * wide + 0.35 * pow(C.b * Cf.b, 2.0) * (1.0 - wide)));
  float oa = a * a * a;
  old = (exp(-r / 0.14) * 2.8 + 0.03 * exp(-r / 0.3)) * (0.08 + oa) * (0.65 + 0.7 * lo.b) *
    (1.0 - smoothstep(0.68, 1.1, r)) * (1.0 - 0.75 * clamp(lane, 0.0, 1.0));
}

/** Projected profile of an ellipsoid (bar frame axes ax) seen along the ray; tc = closest approach. */
float blob(vec3 q, vec3 d, vec3 ax, float a, out float tc) {
  q /= ax;
  d /= ax;
  float dd = dot(d, d);
  tc = -dot(q, d) / dd;
  vec3 c = q + d * tc;
  float a2 = a * a;
  return pow(a2 / (a2 + dot(c, c)), 1.5) / (sqrt(dd) * ax.y);
}

void main() {
  vec4 far = uInvVP * vec4(vNdc, 1.0, 1.0);
  vec3 dirW = far.xyz / far.w - uCam;
  vec3 ro = (uGalInv * vec4(uCam, 1.0)).xyz;
  vec3 rd = normalize(mat3(uGalInv) * dirW);

  // bulge, bar and halo: analytic projections
  float cb = cos(BAR), sb = sin(BAR);
  vec3 qb = vec3(cb * ro.x + sb * ro.z, ro.y, -sb * ro.x + cb * ro.z);
  vec3 db = vec3(cb * rd.x + sb * rd.z, rd.y, -sb * rd.x + cb * rd.z);
  float tc;
  vec3 bulge = vec3(1.0, 0.9, 0.76) * blob(qb, db, vec3(1.0, 0.85, 1.0), 0.0045, tc) * 3.2;
  bulge += vec3(1.0, 0.8, 0.55) * blob(qb, db, vec3(1.3, 0.72, 0.9), 0.03, tc) * 1.5;
  float tBulge = tc;
  bulge += vec3(1.0, 0.76, 0.5) * blob(qb, db, vec3(1.0, 0.2, 0.32), 0.1, tc) * 0.32;
  bulge += vec3(0.85, 0.75, 0.68) * blob(qb, db, vec3(1.0, 0.55, 1.0), 0.22, tc) * 0.05 * uHalo;
  bulge *= smoothstep(-0.05, 0.05, tBulge);

  // the slab: |y| < YCUT inside the cylinder r < RMAX, ahead of the camera
  float t0 = 0.0, t1 = -1.0;
  if (abs(rd.y) > 1e-6) {
    float ta = (-YCUT - ro.y) / rd.y, tb = (YCUT - ro.y) / rd.y;
    t0 = min(ta, tb);
    t1 = max(ta, tb);
  } else if (abs(ro.y) < YCUT) {
    t1 = 1e3;
  }
  float A = dot(rd.xz, rd.xz), B = dot(ro.xz, rd.xz), Cq = dot(ro.xz, ro.xz) - RMAX * RMAX;
  float disk = B * B - A * Cq;
  if (disk > 0.0 && A > 1e-9) {
    float s = sqrt(disk);
    t0 = max(t0, (-B - s) / A);
    t1 = min(t1, (-B + s) / A);
  } else if (Cq > 0.0) {
    t1 = -1.0;
  }
  // nothing to integrate where the resolved stars take over, nor beyond the far rim
  t0 = max(t0, 0.006);
  t1 = min(t1, t0 + 2.4);

  vec3 I = vec3(0.0);
  vec3 T = vec3(1.0);
  vec3 Tb = vec3(1.0);
  if (t1 > t0) {
    // inside the slab: crowd samples near the camera (nearby structure is large on screen)
    float span = t1 - t0;
    float pw = 1.0 + 0.9 * (1.0 - smoothstep(0.0, 0.4, t0 / span));
    float tPrev = t0;
    float tPlane = abs(rd.y) > 1e-5 ? -ro.y / rd.y : 1e9;
    float steep = smoothstep(0.02, 0.1, abs(rd.y));
    // seen from above, the disc is effectively a sheet: evaluate its structure once, where the ray
    // crosses the plane (sampling a 2D field all through the slab would extrude it into streaks)
    bool once = steep > 0.999 && tPlane > t0 && tPlane < t1;
    float old, young, hii, dust;
    // a grazing view stretches the pixel footprint on the plane by 1/sin(elevation): blur to match (no sparkle)
    if (once) field(ro.xz + rd.xz * tPlane, uPix * tPlane / pow(max(abs(rd.y), 0.08), 0.8), old, young, hii, dust);
    // the vertical profiles are integrated exactly per segment, so a steep crossing needs only a few
    int n = once ? 5 : uSteps;
    if (once) pw = 1.0;
    for (int i = 0; i < 16; i++) {
      if (i >= n) break;
      float u = float(i + 1) / float(n);
      float tNext = t0 + span * pow(u, pw);
      float dt = tNext - tPrev;
      // segment midpoint: the vertical profiles are integrated exactly, and sample positions slide
      // continuously with the ray, so no jitter (and no grain) is needed
      float tJit = 0.5 * (tPrev + tNext);
      float ya = ro.y + rd.y * tPrev, yb = ro.y + rd.y * tNext;
      if (!once) {
        // shallow rays: sample along the ray, pulled toward the plane as they steepen;
        // a long segment averages the field over its length, so look it up that blurred
        float yA = abs(ya), yB = abs(yb);
        float tNear = (tPlane > tPrev && tPlane < tNext) ? tPlane : (yA < yB ? tPrev : tNext);
        float tSheet = (tPlane > 0.0 && tPlane < t1) ? tPlane : tNear;
        float tThin = mix(tJit, tSheet, steep);
        float foot = max(uPix * max(tThin, 1e-4), dt * (1.0 - steep) * 0.35);
        field(ro.xz + rd.xz * tThin, foot, old, young, hii, dust);
      }
      float ms = slab(ya, yb, HS) * dt / (2.0 * HS);
      float my = slab(ya, yb, HY) * dt / (2.0 * HY);
      float md = slab(ya, yb, HD) * dt / (2.0 * HD);
      // diffuse light close to the camera is carried by resolved stars instead
      float nearOld = smoothstep(0.02, max(0.2, uNear * 1.4), tJit);
      float near = smoothstep(uNear * 0.08, uNear, tJit);
      vec3 tau = EXT * dust * md * 1.15;
      vec3 att = exp(-tau);
      // old stars are mixed through the dust; young stars sit in the midplane, behind half of it
      I += T * (nearOld * C_OLD * old * ms * 0.5 * (1.0 - att) / max(tau, vec3(1e-4)) + near * (C_YOUNG * young + C_HII * hii) * my * 0.85 * sqrt(att));
      // light from the bulge centre passes the dust in front of it
      float f = clamp((tBulge - tPrev) / max(dt, 1e-6), 0.0, 1.0);
      if (tBulge > tPrev) Tb = T * exp(-tau * f);
      T *= att;
      tPrev = tNext;
    }
  }
  gl_FragColor = vec4(I + bulge * Tb, 1.0);
}
`

/** Tone-map the HDR galaxy, dithered so the long gradients never band. */
export const galaxyCompFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTex;
uniform float uExposure;
uniform float uSoft;
uniform vec2 uTexel;
varying vec2 vNdc;
${COMMON}
void main() {
  vec2 uv = vNdc * 0.5 + 0.5;
  vec3 h = texture2D(uTex, uv).rgb;
  if (uSoft > 0.001) {
    // from inside the disc the march is jittered: a small tent filter turns its grain into glow
    vec2 o = uTexel * 1.2 * uSoft;
    vec3 b = texture2D(uTex, uv + vec2(o.x, o.y)).rgb + texture2D(uTex, uv + vec2(-o.x, o.y)).rgb +
             texture2D(uTex, uv + vec2(o.x, -o.y)).rgb + texture2D(uTex, uv - o).rgb;
    h = mix(h, (h * 2.0 + b) / 6.0, min(uSoft * 2.0, 1.0));
  }
  vec3 c = display(h * uExposure);
  float n = ign(gl_FragCoord.xy) + ign(gl_FragCoord.xy + 17.3) - 1.0;
  c += n / 255.0 * smoothstep(0.0, 3.0 / 255.0, max(c.r, max(c.g, c.b)));
  gl_FragColor = vec4(c, 0.0);
}
`

/* ------------------------------------------------------------------ stars */

const STREAK_VARYINGS = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying vec2 vDir;
varying float vW;
varying float vBase;
`

/** Shared tail: turn a point into a capsule stretched along its screen-space motion (and the warp). */
const STREAK_TAIL = /* glsl */ `
  vec2 a = gl_Position.xy / gl_Position.w;
  vec2 b = prev.xy / max(prev.w, 1e-4);
  b -= a * uWarp;
  vec2 dpx = (b - a) * uHalfRes;
  float len = (prev.w > 0.0 && gl_Position.w > 0.0) ? length(dpx) : 0.0;
  vec2 dir = len > 0.5 ? dpx / len : vec2(1.0, 0.0);
  len = min(len, uMaxStreak);
  gl_Position.xy += dir * len * 0.5 / uHalfRes * gl_Position.w;
  vDir = vec2(dir.x, -dir.y);
  float total = size + len;
  vW = size / total;
  vBase = size;
  vAlpha = alpha / (1.0 + len / (size * 2.5));
  gl_PointSize = total;
`

/** mode 0: galaxy stars (galaxy frame, orbiting). mode 1: sky dome (infinitely far). mode 2: near field (wraps around the camera). */
export const starsVert = (mode: 0 | 1 | 2) => /* glsl */ `
attribute vec3 aColor;
attribute vec4 aMeta; // size, alpha, random, flag/population
uniform float uTime;
uniform float uDpr;
uniform float uRef;
uniform vec3 uVel;
uniform vec3 uOdo;
uniform vec2 uHalfRes;
uniform float uMaxStreak;
uniform float uInside;
uniform float uGain;
uniform float uWarp;
${mode === 0 ? 'uniform sampler2D uNoise;\nuniform float uR;\nuniform float uClock;\nuniform float uOmega;' : ''}
${STREAK_VARYINGS}
${COMMON}
${mode === 0 ? ARM : ''}
void main() {
  float alpha = aMeta.y * uGain;
  float size = aMeta.x * uDpr;
  ${
    mode === 0
      ? /* glsl */ `
  vec3 lp = position / uR;
  float pop = aMeta.w;
  float rr = length(lp.xz);
  // differential rotation through the (fixed) arm pattern; corotation at the system's radius
  float ang = pop > 2.5 ? 0.0 : -uOmega * (0.5 / max(rr, 0.05) - 1.0) * uClock;
  float ca = cos(ang), sa = sin(ang);
  lp.xz = vec2(ca * lp.x - sa * lp.z, sa * lp.x + ca * lp.z);
  if (pop > 0.5 && pop < 1.5) {
    // young stars only shine while inside an arm
    vec4 lo = textureLod(uNoise, loUv(lp.xz), 0.0);
    alpha *= pow(0.5 + 0.5 * cos(2.0 * (armPsi(lp.xz, lo) + 0.06)), 3.0);
  }
  vec3 wp = (modelMatrix * vec4(lp * uR, 1.0)).xyz;
  vec3 wprev = wp + uVel;
  float dist = distance(wp, cameraPosition);
  size *= mix(0.75, 1.25, smoothstep(uRef, uRef * 0.04, dist));
  // resolved stars are a level of detail: from far away the volume carries their light
  alpha *= clamp(pow(uRef / dist, 1.2), 0.0, 1.0) * smoothstep(2.0, 30.0, dist);
  if (pop > 2.5) alpha *= 1.0 - smoothstep(0.1 * uR, 0.42 * uR, dist);
  else if (pop > 1.5) alpha *= 0.3;
  else if (pop < 0.5) alpha *= 0.45;`
      : mode === 1
        ? /* glsl */ `
  vec3 wp = cameraPosition + position * 100000.0;
  vec3 wprev = wp;
  alpha *= mix(1.0, uInside, aMeta.w);`
        : /* glsl */ `
  vec3 rel = fract(position - uOdo) - 0.5;
  float rl = length(rel);
  vec3 wp = cameraPosition + rel * 2400.0;
  vec3 wprev = cameraPosition + (rel + uVel) * 2400.0;
  alpha *= smoothstep(0.5, 0.36, rl) * smoothstep(0.03, 0.1, rl);
  size *= mix(1.0, 1.7, smoothstep(0.3, 0.05, rl));`
  }
  // twinkle: only the bright ones, and only a little
  float tw = smoothstep(0.55, 1.0, aMeta.y);
  alpha *= 1.0 - 0.22 * tw * (0.5 + 0.5 * sin(uTime * (1.3 + aMeta.z * 2.1) + aMeta.z * 50.0));
  float minSize = 1.5 * uDpr;
  if (size < minSize) { alpha *= size / minSize; size = minSize; }
  vColor = aColor;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vec4 prev = projectionMatrix * viewMatrix * vec4(wprev, 1.0);
${STREAK_TAIL}
}
`
export const starsFrag = /* glsl */ `
precision highp float;
${STREAK_VARYINGS}
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float along = dot(c, vDir);
  float perp = dot(c, vec2(-vDir.y, vDir.x));
  vec2 q = vec2(perp, max(abs(along) - (1.0 - vW), 0.0)) / vW;
  float d2 = dot(q, q);
  if (d2 > 1.0) discard;
  float px = sqrt(d2) * vBase * 0.5;
  // photographic PSF: a tight core plus a faint, wide skirt
  float a = (exp(-px * px * 0.7) + exp(-px * 0.9) * 0.12) * (1.0 - d2) * vAlpha;
  gl_FragColor = vec4(vColor * a, 0.0);
}
`

/**
 * Star-forming knots along the arms. They orbit with the stars, fade as they
 * leave an arm, grow true-to-perspective as the camera dives past, and show
 * filamentary structure once they are big on screen.
 */
export const cloudVert = /* glsl */ `
attribute vec3 aColor;
attribute vec4 aMeta; // world size, alpha, random, kind (0 HII, 1 cluster)
uniform sampler2D uNoise;
uniform float uPx;
uniform float uDpr;
uniform float uMaxPt;
uniform float uGain;
uniform float uR;
uniform float uClock;
uniform float uOmega;
varying vec3 vColor;
varying float vAlpha;
varying float vStruct;
varying vec2 vSeed;
varying float vKind;
${COMMON}
${ARM}
void main() {
  vec3 lp = position / uR;
  float rr = length(lp.xz);
  float ang = -uOmega * (0.5 / max(rr, 0.05) - 1.0) * uClock;
  float ca = cos(ang), sa = sin(ang);
  lp.xz = vec2(ca * lp.x - sa * lp.z, sa * lp.x + ca * lp.z);
  vec4 lo = textureLod(uNoise, loUv(lp.xz), 0.0);
  float inArm = pow(0.5 + 0.5 * cos(2.0 * (armPsi(lp.xz, lo) + 0.04)), 2.0);
  vec4 wp = modelMatrix * vec4(lp * uR, 1.0);
  float dist = distance(wp.xyz, cameraPosition);
  float size = aMeta.x * uPx / max(dist, 1.0);
  float alpha = aMeta.y * uGain * inArm * smoothstep(aMeta.x * 0.9, aMeta.x * 3.5, dist);
  float minSize = 1.6 * uDpr;
  // tiny knots are unresolved points: keep them bright enough to string pink beads along the arms
  if (size < minSize) { alpha *= mix(1.6, 1.0, size / minSize); size = minSize; }
  // a knot filling a good part of the screen is the volume's job (it draws the same HII as diffuse light)
  alpha *= smoothstep(260.0 * uDpr, 90.0 * uDpr, size);
  float k = min(1.0, uMaxPt / size);
  vAlpha = alpha * k * k;
  vColor = aColor;
  vStruct = smoothstep(10.0, 90.0, size);
  vSeed = vec2(aMeta.z, fract(aMeta.z * 7.31));
  vKind = aMeta.w;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_PointSize = size * k;
}
`
export const cloudFrag = /* glsl */ `
precision highp float;
uniform sampler2D uNoise;
varying vec3 vColor;
varying float vAlpha;
varying float vStruct;
varying vec2 vSeed;
varying float vKind;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(c, c);
  if (d2 > 1.0) discard;
  vec4 n = texture2D(uNoise, c * 0.22 + vSeed);
  vec2 w = c + (n.rg - 0.5) * 0.5 * vStruct;
  float dw = dot(w, w);
  float body = (exp(-dw * 4.5) - 0.011) * mix(1.0, 0.25 + 1.5 * n.b * n.b, vStruct);
  float heart = exp(-d2 * mix(60.0, 26.0, vKind));
  vec3 col = vKind < 0.5
    ? vColor * body * 0.9 + vec3(0.7, 0.82, 1.0) * heart * 0.9
    : vColor * (body * 0.5 + heart * 1.4);
  gl_FragColor = vec4(col * vAlpha * (1.0 - d2), 0.0);
}
`
