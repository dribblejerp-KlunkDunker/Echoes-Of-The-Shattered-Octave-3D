// ============================================================
//  r11water — ROADMAP R11 phase 4, team WATER: the realistic look's water (the harbour, the river, the pools).
//
//  CONTRACT: window.R11WATER.material({ THREE, tier, normals, renderer, scene, env }) -> a THREE.Material that r11core
//  uses for every water cell (the geometry is core's: water cells, vertex colours lighter on t_shallows, the surface sunk
//  0.05). r11core caches that material for the session, so the material follows the quality tier itself (R11.on('tier')).
//  Per-frame work rides on R11.on('frame'); the shore map on R11.on('mapbuilt').
//
//  THE LOOK (the owner's picture 3, docs/graphics/bench3-harbour.jpg; docs/graphics/art-bible.md): deep green-grey water,
//  darker where it is deep, lighter in the shallows and along the shore; small, slow wind ripples (three layers of core's
//  wave normals, drifting at different scales and headings; stronger in wind); fresnel (dark straight down, the sky and the
//  town at a glance); the sky (the same overcast HDR, hour gradient and tint the sky dome draws) and the lamps reflected,
//  broken by the ripples; a soft dark contact line where water meets stone; rain dimples when the weather is rain or storm.
//  Nothing busy: no foam, no spray, no particles.
//
//  TIERS. Ultra: a planar reflection of the scene (a mirrored camera, an oblique near plane at the water, half resolution,
//  HDR), distorted by the ripples, rendered once per frame when the water is drawn (Material.onBeforeRender, so its draw
//  calls count in R11.stats.draws). High: no extra pass; the sky from the environment (PMREM of the overcast HDR) with
//  ripple distortion, the town's horizon darkened into the air, the lamps' images. Phone: the same with two ripple layers,
//  no rain rings and no extra render pass of any kind.
//
//  R11WATER.stats (passes: reflection renders so far, mode, plane, shore), R11WATER.get() / set(p) (the look numbers,
//  live), R11WATER.mode() 'planar' | 'env'.
// ============================================================
'use strict';

const R11WATER = (() => {
  // the look (linear colours; picture 3's water: near ~ sRGB (44,60,49), mid ~ (64,81,72), far reflects the sky)
  const P = {
    deep: [0.034, 0.064, 0.044],       // the body of deep water (green-grey), before light
    shal: [0.08, 0.09, 0.06],            // shallows and the shore band (the bottom showing through, brown-green)
    shoreW: 1.6,                         // cells of the shore band (lighter, then deep)
    f0: 0.01,                            // reflectance straight down (picture 3 is darker near than physics: an artist's fresnel)
    fpow: 10,                            // fresnel power (Schlick's 5 lets too much sky into the near water under AgX)
    refl: 1.0,                           // sky / scene reflection strength
    horizon: 0.72,                       // High/Phone: the reflection near the horizon is the town and the air, not the sky
    lamp: 5.0,                           // the lamps' images in the water (all tiers; Ultra adds them on top of its planar image at half)
    spec: 0.5,                           // three's direct specular (the sun through cloud, the lamps' GGX glints)
    ripple: 1.8,                         // ripple slope (scaled by the wind)
    distort: 0.05,                       // the planar reflection's distortion by the ripples
    edge: 0.4,                           // the dark contact line where water meets stone
    rain: 1.0,                           // rain rings
    reflScale: 0.5,                      // Ultra: planar reflection resolution (of the drawing buffer)
    reflTint: [0.78, 0.95, 0.82],         // picture 3's water carries its green into what it reflects
  };
  const stats = { builds: 0, passes: 0, mode: null, plane: null, shore: null, lastPassFrame: -1 };
  let THREE = null, mat = null, tier = 'high', mode = 0;
  const U = {};
  // Ultra's planar reflection
  const RF = { rt: null, cam: null, want: false, busy: false, planeY: 0, geo: null, v: {} };
  let shoreTex = null;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const modeOf = (t) => (t === 'ultra' ? 2 : t === 'phone' ? 0 : 1);

  // ---------------------------------------------------------------------------------------------- shaders
  const VERT_PARS = 'varying vec3 vR11W;\n';
  const VERT_MAIN = '#include <project_vertex>\n  vR11W = (modelMatrix * vec4(transformed, 1.0)).xyz;\n';
  const FRAG_PARS = `
varying vec3 vR11W;
uniform float uTime; uniform float uWind; uniform float uRain; uniform float uOut; uniform sampler2D uNorm;
uniform sampler2D uShore; uniform vec4 uShoreMap; uniform vec3 uDeep; uniform vec3 uShal; uniform float uShoreW;
uniform vec3 uSkyTint; uniform vec3 uZen; uniform vec3 uHor; uniform float uDay; uniform float uCap; uniform vec3 uAir;
uniform float uF0; uniform float uReflK; uniform float uHorizon; uniform float uLampK; uniform float uSpec; uniform float uRipple;
uniform float uEdge; uniform float uRainK; uniform float uDistort; uniform vec3 uReflTint; uniform float uDbg; uniform float uFPow;
#if R11W_MODE == 2
uniform sampler2D uRefl; uniform mat4 uReflMat; uniform float uReflOn; uniform float uPlaneY;
#endif
float r11wHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// one ripple layer: core's tileable wave normals, at a scale (units per tile), turned by an angle, drifting
vec2 r11wLayer(vec2 p, float size, float ang, vec2 drift) {
  float c = cos(ang), s = sin(ang);
  vec2 q = mat2(c, -s, s, c) * p / size + drift;
  vec2 n = texture2D(uNorm, q).xy * 2.0 - 1.0;
  return mat2(c, s, -s, c) * n;
}
// rain: rings from drops, one per cell (centre and age hashed), three layers; slope of a travelling ring
vec2 r11wRainLayer(vec2 p, float t, float seed, float dens) {
  vec2 c = floor(p), f = p - c;
  float h = r11wHash(c + seed);
  if (h > dens) return vec2(0.0);
  vec2 ctr = 0.25 + 0.5 * vec2(r11wHash(c + seed + 1.31), r11wHash(c + seed + 2.77));
  float ph = fract(t * (0.9 + 0.5 * h) + r11wHash(c + seed + 4.1));
  vec2 d = f - ctr; float r = length(d) + 1e-4;
  float x = (r - ph * 0.26) / 0.035;
  float a = exp(-x * x) * (-2.0 * x) * (1.0 - ph) * (1.0 - ph);
  return d / r * a;
}
`;
  // the body colour: deep / shallow from core's vertex colours and the shore map (cells to the nearest land)
  const FRAG_COLOR = `#include <color_fragment>
  vec2 r11wSM = uShoreMap.z > 0.5 ? texture2D(uShore, vR11W.xz * uShoreMap.xy).rg * 8.0 : vec2(8.0);
  float r11wD = r11wSM.x, r11wB = r11wSM.y;
  float r11wSh = 0.0;
  #ifdef USE_COLOR
    r11wSh = smoothstep(1.1, 1.19, dot(vColor.rgb, vec3(0.33333)));
  #endif
  float r11wDeep = smoothstep(0.1, uShoreW, r11wB) * (1.0 - r11wSh);
  diffuseColor.rgb = mix(uShal, uDeep, r11wDeep);
`;
  // the ripples: the normal (world, then view space for three's lights)
  const FRAG_NORMAL = `
  vec3 r11wV = cameraPosition - vR11W; float r11wDist = length(r11wV); r11wV /= r11wDist;
  float r11wT = uTime;
  vec2 r11wS = r11wLayer(vR11W.xz, 1.1, 0.0, vec2(0.016, 0.009) * r11wT) * 0.42
             + r11wLayer(vR11W.xz, 0.41, 0.65, vec2(-0.014, 0.022) * r11wT) * 0.4;
  #if R11W_MODE > 0
    r11wS += r11wLayer(vR11W.xz, 0.16, -1.05, vec2(0.03, -0.019) * r11wT) * 0.32 * (1.0 - smoothstep(3.0, 12.0, r11wDist));
  #endif
  r11wS *= uRipple * uWind * mix(1.0, 0.4, smoothstep(5.0, 40.0, r11wDist));
  #if R11W_MODE > 0
  if (uRain > 0.001) {
    float rk = uRain * uRainK * (1.0 - smoothstep(3.0, 11.0, r11wDist));
    if (rk > 0.001) {
      vec2 rp = vR11W.xz / 0.11;
      r11wS += (r11wRainLayer(rp, uTime, 0.0, 0.55 * uRain) + r11wRainLayer(rp * 1.37 + 7.1, uTime * 1.13, 19.0, 0.5 * uRain) + r11wRainLayer(rp * 0.81 + 3.3, uTime * 0.87, 41.0, 0.45 * uRain)) * 0.55 * rk;
    }
  }
  #endif
  vec3 r11wN = normalize(vec3(-r11wS.x, 1.0, -r11wS.y));
  normal = normalize((viewMatrix * vec4(r11wN, 0.0)).xyz);
`;
  // the reflection: sky (as the dome draws it) or Ultra's planar image, the lamps' images, fresnel; the body takes the rest
  const FRAG_LIGHT = `#include <aomap_fragment>
  {
    vec3 R = reflect(-r11wV, r11wN); R.y = abs(R.y);
    float NdV = clamp(dot(r11wN, r11wV), 0.0, 1.0);
    float Fr = uF0 + (1.0 - uF0) * pow(1.0 - NdV, uFPow);
    // the sky the dome draws: the hour's gradient by night, the overcast HDR (tinted, capped) by day
    vec3 grad = mix(uHor, uZen, smoothstep(0.0, 0.55, R.y));
    vec3 hdr = grad;
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      hdr = textureCubeUV(envMap, envMapRotation * R, 0.04).rgb * uSkyTint;
    #endif
    vec3 sky = mix(grad, hdr, uDay);
    sky *= min(1.0, uCap / max(max(sky.r, max(sky.g, sky.b)), 1e-4));
    sky = mix(uAir, sky, uOut);
    // near the horizon the reflection is the far shore, the town and the air (Ultra's planar image replaces this below)
    vec3 far = min(uAir, mix(uHor, uAir, uDay)) * mix(0.35, 0.72, uDay);
    // Phone has one ripple layer fewer, so more of its grazing reflection lands on the bright sky: a wider band of the far
    // shore there keeps Phone's water as dark as Ultra's, whose planar image shows the real hills
    #if R11W_MODE == 0
      sky = mix(far * 0.7, sky, mix(1.0, smoothstep(0.0, 0.4, R.y), uHorizon));
    #else
      sky = mix(far, sky, mix(1.0, smoothstep(0.0, 0.24, R.y), uHorizon));
    #endif
    vec3 refl = sky;
    float lampW = 1.0;
    #if R11W_MODE == 2
      float on = uReflOn * (1.0 - step(0.08, abs(vR11W.y - uPlaneY)));
      if (on > 0.0) {
        vec4 rc = uReflMat * vec4(vR11W, 1.0);
        vec2 ruv = rc.xy / rc.w + r11wS * uDistort / (1.0 + 0.04 * r11wDist);
        vec3 pr = texture2D(uRefl, clamp(ruv, vec2(0.001), vec2(0.999))).rgb;
        refl = mix(refl, pr, on);
        lampW = mix(1.0, 0.5, on);
      }
    #endif
    // the lamps' images: each point light seen in the rippled mirror (a flame's image does not fade with distance)
    vec3 lamp = vec3(0.0);
    #if NUM_POINT_LIGHTS > 0
      vec3 Rv = normalize((viewMatrix * vec4(R, 0.0)).xyz);
      vec3 upV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
      for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3 L = normalize(pointLights[i].position + vViewPosition);
        vec3 D = Rv - L; float dv = dot(D, upV); vec3 Dh = D - dv * upV;
        lamp += pointLights[i].color * exp(-dot(Dh, Dh) * 1800.0 - dv * dv * 220.0);
      }
    #endif
    // the dark contact line where the water meets stone
    float edgeK = 1.0 - uEdge * (1.0 - smoothstep(0.12, 0.42, r11wD)) * uShoreMap.z;
    reflectedLight.indirectSpecular = (refl * uReflTint * uReflK + lamp * uLampK * lampW) * Fr * edgeK;
    reflectedLight.directDiffuse *= (1.0 - Fr) * edgeK;
    reflectedLight.indirectDiffuse *= (1.0 - Fr) * edgeK;
    reflectedLight.directSpecular *= uSpec;
    if (uDbg > 0.5) { reflectedLight.indirectSpecular = uDbg < 1.5 ? vec3(Fr) : uDbg < 2.5 ? refl : uDbg < 3.5 ? lamp : vec3(r11wD / 8.0); reflectedLight.directDiffuse = vec3(0.0); reflectedLight.indirectDiffuse = vec3(0.0); reflectedLight.directSpecular = vec3(0.0); }
  }
`;

  // ---------------------------------------------------------------------------------------------- the material
  function uniforms(normals) {
    const T = THREE;
    Object.assign(U, {
      uTime: { value: 0 }, uWind: { value: 0.6 }, uRain: { value: 0 }, uOut: { value: 1 }, uNorm: { value: normals },
      uShore: { value: shoreTex }, uShoreMap: { value: new T.Vector4(1, 1, 0, 0) }, uShoreW: { value: P.shoreW },
      uDeep: { value: new T.Color(P.deep[0], P.deep[1], P.deep[2]) }, uShal: { value: new T.Color(P.shal[0], P.shal[1], P.shal[2]) },
      uSkyTint: { value: new T.Color(1, 1, 1) }, uZen: { value: new T.Color(0.3, 0.33, 0.36) }, uHor: { value: new T.Color(0.4, 0.42, 0.44) },
      uDay: { value: 1 }, uCap: { value: 1.15 }, uAir: { value: new T.Color(0.3, 0.32, 0.33) },
      uF0: { value: P.f0 }, uReflK: { value: P.refl }, uHorizon: { value: P.horizon }, uLampK: { value: P.lamp }, uSpec: { value: P.spec },
      uRipple: { value: P.ripple }, uDbg: { value: 0 }, uFPow: { value: P.fpow }, uReflTint: { value: new T.Color(P.reflTint[0], P.reflTint[1], P.reflTint[2]) }, uEdge: { value: P.edge }, uRainK: { value: P.rain }, uDistort: { value: P.distort },
      uRefl: { value: null }, uReflMat: { value: new T.Matrix4() }, uReflOn: { value: 0 }, uPlaneY: { value: 0 },
    });
  }
  function material(o) {
    o = o || {};
    THREE = o.THREE || (typeof R11 !== 'undefined' && R11.THREE) || null;
    if (!THREE) return null;
    if (mat) { setTier(o.tier || tier); return mat; }
    tier = o.tier || (typeof R11 !== 'undefined' ? R11.tier() : 'high') || 'high';
    if (!shoreTex) shoreTex = blankShore();
    uniforms(o.normals || null);
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.07, metalness: 0, vertexColors: true });
    m.name = 'r11-water';
    m.defines = Object.assign({}, m.defines || {}, { R11W_MODE: modeOf(tier) });
    m.onBeforeCompile = (sh) => {
      for (const k in U) sh.uniforms[k] = U[k];
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS).replace('#include <project_vertex>', VERT_MAIN);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + FRAG_PARS)
        .replace('#include <color_fragment>', FRAG_COLOR)
        .replace('#include <normal_fragment_maps>', FRAG_NORMAL)
        .replace('#include <aomap_fragment>', FRAG_LIGHT);
    };
    m.customProgramCacheKey = () => 'r11water1';
    m.onBeforeRender = reflectPass;
    mat = m; stats.builds++;
    setTier(tier);
    return m;
  }
  function setTier(t) {
    tier = t || tier; const md = modeOf(tier);
    stats.mode = md === 2 ? 'planar' : 'env';
    if (!mat) return;
    if (mat.defines.R11W_MODE !== md) { mat.defines = Object.assign({}, mat.defines, { R11W_MODE: md }); mat.needsUpdate = true; }
    mode = md;
    if (md !== 2) freeReflection();
  }

  // ---------------------------------------------------------------------------------------------- the shore map
  function blankShore() {
    const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.needsUpdate = true; return t;
  }
  // cells to the nearest land (wall or non-water floor), chamfer distance, /8 in the red channel, one texel per cell
  function buildShore(m) {
    if (!THREE || !m || !m.cells) return;
    const W = m.w, H = m.h, N = W * H, ft = m.floorTextures || [], fc = m.floorCells;
    const isWaterName = (n) => { if (!n) return false; if (n === 't_water' || n === 't_shallows') return true; try { const I = R11.textureInfo(n); return !!(I && I.key === 'water'); } catch (e) { return false; } };
    const wn = ft.map(isWaterName), defW = isWaterName(m.floor);
    const water = new Uint8Array(N); let any = 0;
    for (let i = 0; i < N; i++) {
      const c = m.cells[i]; if (c && !c.door) continue;
      const idx = fc ? fc[i] : 0; const w = (idx && ft[idx]) ? wn[idx] : (idx === 0 && ft.length ? wn[0] : defW);
      if (w) { water[i] = 1; any++; }
    }
    stats.shore = any ? { w: W, h: H, water: any } : null;
    if (!any) { U.uShoreMap && U.uShoreMap.value.set(1, 1, 0, 0); return; }
    // two fields: to any land (the contact line) and to a natural bank only (the shallows): a quay wall or a floor
    // standing well above the water (the Mole, the Yard) has deep water right up to it
    const lv = m.lvls || null, wl = [];
    if (lv) for (let i = 0; i < N; i++) if (water[i]) wl.push(lv[i]);
    wl.sort((a, b) => a - b);
    const wLvl = wl.length ? wl[wl.length >> 1] : 0;
    const bank = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (water[i]) continue; const c = m.cells[i]; if (c && !c.door) continue; if ((lv ? lv[i] : 0) - wLvl < 0.25) bank[i] = 1; }
    const dist = (src) => {
      const BIG = 1e4, d = new Float32Array(N);
      for (let i = 0; i < N; i++) d[i] = src(i) ? 0 : BIG;
      const D1 = 1, D2 = Math.SQRT2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; let v = d[i]; if (!v) continue;
        if (x > 0) v = Math.min(v, d[i - 1] + D1);
        if (y > 0) { v = Math.min(v, d[i - W] + D1); if (x > 0) v = Math.min(v, d[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D2); }
        d[i] = v;
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; let v = d[i]; if (!v) continue;
        if (x < W - 1) v = Math.min(v, d[i + 1] + D1);
        if (y < H - 1) { v = Math.min(v, d[i + W] + D1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D2); if (x > 0) v = Math.min(v, d[i + W - 1] + D2); }
        d[i] = v;
      }
      return d;
    };
    const dAll = dist((i) => !water[i]), dBank = dist((i) => bank[i]);
    const enc = (v) => clamp(Math.round((v >= 1e4 ? 8 : Math.max(0, v - 0.5)) / 8 * 255), 0, 255);
    const data = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) { data[i * 4] = enc(dAll[i]); data[i * 4 + 1] = water[i] || bank[i] ? enc(dBank[i]) : 0; data[i * 4 + 2] = 0; data[i * 4 + 3] = 255; }
    if (shoreTex && shoreTex.image && shoreTex.image.width === W && shoreTex.image.height === H) { shoreTex.image.data.set(data); }
    else { if (shoreTex) shoreTex.dispose(); shoreTex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType); }
    shoreTex.magFilter = THREE.LinearFilter; shoreTex.minFilter = THREE.LinearFilter; shoreTex.generateMipmaps = false;
    shoreTex.wrapS = shoreTex.wrapT = THREE.ClampToEdgeWrapping; shoreTex.needsUpdate = true;
    if (U.uShore) { U.uShore.value = shoreTex; U.uShoreMap.value.set(1 / W, 1 / H, 1, 0); }
  }

  // ---------------------------------------------------------------------------------------------- Ultra: the planar reflection
  function freeReflection() { if (RF.rt) { RF.rt.dispose(); RF.rt = null; } if (U.uReflOn) U.uReflOn.value = 0; if (U.uRefl) U.uRefl.value = null; }
  // the plane: the most common height of the water mesh's vertices (the harbour, a river, a pool: one level each)
  function planeOf(geometry) {
    if (RF.geo === geometry) return RF.planeY;
    const p = geometry.attributes.position, cnt = new Map();
    for (let i = 0; i < p.count; i += 4) { const y = Math.round(p.getY(i) * 200) / 200; cnt.set(y, (cnt.get(y) || 0) + 1); }
    let best = 0, n = -1; for (const [y, c] of cnt) if (c > n) { n = c; best = y; }
    RF.geo = geometry; RF.planeY = best; stats.plane = best;
    return best;
  }
  function reflectPass(renderer, scene, camera, geometry, object) {
    if (mode !== 2 || !RF.want || RF.busy || typeof R11 === 'undefined' || camera !== R11.camera || !object) return;
    RF.want = false;
    const T = THREE, v = RF.v;
    if (!v.n) { v.n = new T.Vector3(0, 1, 0); v.pw = new T.Vector3(); v.cw = new T.Vector3(); v.rot = new T.Matrix4(); v.look = new T.Vector3(); v.view = new T.Vector3(); v.tgt = new T.Vector3(); v.plane = new T.Plane(); v.clip = new T.Vector4(); v.q = new T.Vector4(); v.size = new T.Vector2(); }
    const y = planeOf(geometry);
    v.cw.setFromMatrixPosition(camera.matrixWorld);
    v.pw.set(v.cw.x, y, v.cw.z);
    if (v.cw.y <= y + 1e-3) { U.uReflOn.value = 0; return; }
    renderer.getDrawingBufferSize(v.size);
    const w = Math.max(64, Math.round(v.size.x * P.reflScale)), h = Math.max(64, Math.round(v.size.y * P.reflScale));
    if (!RF.rt) { RF.rt = new T.WebGLRenderTarget(w, h, { type: T.HalfFloatType, samples: 0 }); RF.rt.texture.name = 'r11-water-reflection'; RF.rt.texture.generateMipmaps = false; }
    else if (RF.rt.width !== w || RF.rt.height !== h) RF.rt.setSize(w, h);
    if (!RF.cam) RF.cam = new T.PerspectiveCamera();
    const vc = RF.cam;
    // the mirrored eye (three's Reflector, for a horizontal plane at y)
    v.view.subVectors(v.pw, v.cw).reflect(v.n).negate().add(v.pw);
    v.rot.extractRotation(camera.matrixWorld);
    v.look.set(0, 0, -1).applyMatrix4(v.rot).add(v.cw);
    v.tgt.subVectors(v.pw, v.look).reflect(v.n).negate().add(v.pw);
    // up: the reflected up turned half a turn about the view axis (a roll, not a mirror: the texture matrix below
    // follows any roll), so camera-facing billboards stand upright in the reflection instead of hanging under the water
    vc.position.copy(v.view); vc.up.set(0, 1, 0).applyMatrix4(v.rot).reflect(v.n).negate(); vc.lookAt(v.tgt);
    vc.far = camera.far; vc.near = camera.near; vc.updateMatrixWorld();
    vc.projectionMatrix.copy(camera.projectionMatrix);
    U.uReflMat.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse);
    // the oblique near plane: nothing under the water is drawn into the reflection
    v.plane.setFromNormalAndCoplanarPoint(v.n, v.pw).applyMatrix4(vc.matrixWorldInverse);
    v.clip.set(v.plane.normal.x, v.plane.normal.y, v.plane.normal.z, v.plane.constant);
    const pm = vc.projectionMatrix.elements;
    v.q.x = (Math.sign(v.clip.x) + pm[8]) / pm[0]; v.q.y = (Math.sign(v.clip.y) + pm[9]) / pm[5]; v.q.z = -1; v.q.w = (1 + pm[10]) / pm[14];
    v.clip.multiplyScalar(2 / v.clip.dot(v.q));
    pm[2] = v.clip.x; pm[6] = v.clip.y; pm[10] = v.clip.z + 1 - 0.003; pm[14] = v.clip.w;
    vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
    // render (the water itself hidden; no shadow-map update; three restores its own state for the outer render)
    const prevRT = renderer.getRenderTarget(), prevShadow = renderer.shadowMap.autoUpdate, vis = object.visible;
    RF.busy = true; object.visible = false; renderer.shadowMap.autoUpdate = false;
    try {
      renderer.setRenderTarget(RF.rt); renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, vc);
      stats.passes++;
      U.uRefl.value = RF.rt.texture; U.uReflOn.value = 1; U.uPlaneY.value = y;
    } catch (e) { U.uReflOn.value = 0; if (!RF.warned) { RF.warned = true; console.warn('r11water reflection', e); } }
    finally { renderer.setRenderTarget(prevRT); renderer.shadowMap.autoUpdate = prevShadow; object.visible = vis; RF.busy = false; }
  }

  // ---------------------------------------------------------------------------------------------- per frame
  let windS = 0.5, rainS = 0, snap = true;
  function frame(F) {
    if (!mat || !THREE) return;
    const dt = clamp(F.dt || 0.016, 0, 0.1);
    U.uTime.value = F.t || 0;
    let wind = 0.3, rain = 0;
    let storm = false;
    try { if (typeof Weather !== 'undefined' && Weather && Weather.STATES) { const s = Weather.STATES[Weather.state]; if (s) wind = s.wind || 0; storm = Weather.state === 'storm'; } } catch (e) { /* none */ }
    // rain dimples: core's own wetness (R11.wet(): 0..1, rain or storm only, outdoors), harder in a storm
    try { rain = typeof R11.wet === 'function' ? clamp(+R11.wet() || 0, 0, 1) * (storm ? 1.4 : 1) : 0; } catch (e) { rain = 0; }
    const out = !!(F.env && F.env.outdoor);
    if (!out) { wind = 0.05; rain = 0; }
    // a weather change eases in (core's cobbles snap; the rings take about a second); a new map, a paused shot or a frame
    // in which no time passed (a held shot: F.dt 0) shows the weather as it is
    const k = (R11.paused || snap || !(F.dt > 0)) ? 1 : Math.min(1, dt * 1.5); snap = false;
    windS += (wind - windS) * k; rainS += (rain - rainS) * k;
    U.uWind.value = 0.3 + 0.55 * windS; U.uRain.value = rainS; U.uOut.value = out ? 1 : 0;
    // the sky as the dome draws it (core's sky uniforms, read each frame)
    const R = R11.R, sky = R && R.sky && R.sky.material && R.sky.material.uniforms;
    if (sky) { U.uSkyTint.value.copy(sky.uTint.value); U.uZen.value.copy(sky.uZen.value); U.uHor.value.copy(sky.uHor.value); U.uDay.value = sky.uDay.value; U.uCap.value = sky.uCap.value; }
    if (R11.scene && R11.scene.fog) U.uAir.value.copy(R11.scene.fog.color);
    if (!out) U.uDay.value = 0;
    // Ultra: one planar reflection this frame, when the water is drawn and the frame is rendered
    RF.want = mode === 2 && !(R11.paused && !(R11.st && R11.st.renderOnce));
    if (mode !== 2 && RF.rt) freeReflection();
  }
  function get() { return JSON.parse(JSON.stringify(P)); }
  function set(p) {
    p = p || {};
    for (const k in p) if (k in P) P[k] = p[k];
    if (!U.uDeep) return get();
    U.uDeep.value.setRGB(P.deep[0], P.deep[1], P.deep[2]); U.uShal.value.setRGB(P.shal[0], P.shal[1], P.shal[2]);
    U.uShoreW.value = P.shoreW; U.uReflTint.value.setRGB(P.reflTint[0], P.reflTint[1], P.reflTint[2]); U.uF0.value = P.f0; U.uFPow.value = P.fpow; U.uReflK.value = P.refl; U.uHorizon.value = P.horizon;
    U.uLampK.value = P.lamp; U.uSpec.value = P.spec; U.uRipple.value = P.ripple; U.uEdge.value = P.edge; U.uRainK.value = P.rain; U.uDistort.value = P.distort;
    return get();
  }
  function wire() {
    if (typeof R11 === 'undefined' || !R11 || typeof R11.on !== 'function') return;
    R11.on('frame', frame);   // r11core catches and logs a hook's throw once
    R11.on('mapbuilt', (m) => { if (THREE) buildShore(m); RF.geo = null; snap = true; if (U.uReflOn) U.uReflOn.value = 0; });
    R11.on('tier', (t) => setTier(t));
  }
  wire();
  return { material, stats, get, set, P, mode: () => (mode === 2 ? 'planar' : 'env'), uniforms: U, _rf: RF };
})();
if (typeof window !== 'undefined') window.R11WATER = R11WATER;
