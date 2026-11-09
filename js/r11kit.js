// r11kit — ROADMAP R11 phase 1, team KIT: the art of the realistic view.
//
// window.R11KIT = {
//   dressMap(map, ctx) -> { group, hiddenCells: Set<cellIndex>, replaced: Set<entity>, lights: [PointLight], stats,
//       chimneyTops: [[x, y, z] world units] (where smoke should leave the kit's chimneys) }
//       CORE calls it on 'mapbuilt' (ctx = { scene, THREE, mat, tier, addLight(light, priority), hideCells }).
//       Oakhaven ('oakhaven', either build): every building's wall cells are replaced by a kit building sized to its
//       footprint (hiddenCells: wall cells only, never doors or open cells), with props, trees, hush-lamps, puddles,
//       fallen leaves and the far ring of the Reach. `replaced` lists the map's own deco entities that now have a 3D body
//       (oaks, hush-lamps, market tables, crates): CORE should not also draw their billboards. Doors: the map's door cells
//       stay as they are (never hidden); KIT draws each door leaf at the door cell's outer edge (a house door), or at the
//       back of a porch inside the door cell (the Chapel, the Greenhall), so CORE's own mid-cell leaf sits inside the kit
//       masonry and is never seen. Every other map: an empty group (CORE's plain realistic boxes).
//   viewmodel(kind, opts) -> { group, kind, update(t, walk) }   kinds: 'glass-arm' (Kaelen's left arm), 'sword',
//       'longsword', 'knife', 'axe', 'mace', 'maul', 'spear', 'staff', 'pistol', 'crossbow', 'fists', 'blade' (fallback).
//       Built in the first-person scene's own units (metres, camera at the origin looking down -z). Each group carries a
//       small light rig only when R11.vm.scene is absent (CORE's scene has its own); opts.lights forces it on or off.
//   kindFor(weaponId) -> the viewmodel kind for an entry of WEAPONS.
//   setTier(name)    -> thins leaves, props and shadows of the last dressed map live ('ultra'|'high'|'phone').
//   ready()          -> Promise: the glTF props (Poly Haven, CC0) are in.
// }
// Scale and axes (brief): three.x = map x, three.z = map y, three.y = game height x ZK; KIT builds in metres inside a
// group scaled by R11.M (units per metre; CORE's rule 0.88 x ZK / 1.65 = 0.33 when CORE is absent): a cell is 1/M = 3.03 m,
// a map wall (1 game unit) 1.88 m. Storeys are real storeys (3 m and 2.7 m): the kit's houses stand above the map's walls.
'use strict';
const R11KIT = (function () {
  const PI = Math.PI;
  const TEXTS = ['THE BOAR & DULCIMER'];
  const BASE = 'assets/r11/';
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11kit: ' + k + ' failed', e); } catch (x) { /* none */ } } };
  const tr = (s) => { try { return (typeof STORY_I18N !== 'undefined' && STORY_I18N.translate && STORY_I18N.translate(s)) || s; } catch (e) { return s; } };
  const ZKf = () => { try { if (typeof R3D !== 'undefined' && +R3D.ZK > 0) return +R3D.ZK; } catch (e) { /* none */ } return 0.61875; };
  // units per metre: R11.M when CORE is there, else CORE's own rule (the standing eye, 0.88 game units x ZK, is 1.65 m)
  const UPM = () => { try { const m = typeof window !== 'undefined' && window.R11 && +window.R11.M; if (m > 0) return m; } catch (e) { /* none */ } return 0.88 * ZKf() / 1.65; };
  const T3 = (ctx) => (ctx && ctx.THREE) || (window.R11 && window.R11.THREE) || (window.R11THREE && window.R11THREE.THREE) || null;
  const addons = () => window.R11THREE || {};
  const TIERS = {
    ultra: { leaves: 1800, ground: 9000, drift: 7000, ivy: 1, forest: 1600, props: 1, shadowSmall: true, puddle: 1, seg: 150, smoke: true },
    high: { leaves: 1200, ground: 6000, drift: 5000, ivy: 1, forest: 1100, props: 1, shadowSmall: true, puddle: 1, seg: 120, smoke: true },
    phone: { leaves: 420, ground: 2400, drift: 2000, ivy: 0.55, forest: 500, props: 0.5, shadowSmall: false, puddle: 0.6, seg: 80, smoke: false },
  };
  const tierOf = (n) => TIERS[n] ? n : 'high';
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sstep = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash2 = (x, y) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };

  const S = { last: null, debug: false, gltf: null, gltfP: null };

  // ======================================================================== materials
  const matCache = new Map();
  let texLoader = null;
  function scanned(THREE, ctx, name, opts) {
    opts = opts || {};
    if (ctx && typeof ctx.mat === 'function') { try { const m = ctx.mat(name, opts); if (m) return m; } catch (e) { warnOnce('ctx.mat', e); } }
    const key = name + '|' + JSON.stringify(opts);
    if (matCache.has(key)) return matCache.get(key);
    texLoader = texLoader || new THREE.TextureLoader();
    const t = (s, srgb) => { const x = texLoader.load(BASE + 'tex/' + name + '_' + s + '.jpg'); x.wrapS = x.wrapT = THREE.RepeatWrapping; if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.anisotropy = 4; return x; };
    const arm = t('arm'), ns = opts.ns == null ? 1 : opts.ns;
    const m = new THREE.MeshStandardMaterial({ map: t('diff', true), normalMap: t('nor'), aoMap: arm, roughnessMap: arm, metalnessMap: arm,
      roughness: opts.rough == null ? 1 : opts.rough, metalness: 1, color: opts.color == null ? 0xffffff : opts.color, normalScale: new THREE.Vector2(ns, ns) });
    matCache.set(key, m);
    return m;
  }
  // the far ring keeps a share of its shape in the air: the scene's fog reaches it at FAR_FOG of its density (capped), so
  // the Grey Teeth and the downs show through as aerial perspective instead of vanishing where the town's fog is thick
  const FAR_FOG = 0.4;
  function farFog(m) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * ${FAR_FOG * FAR_FOG} * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar * 2.5, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, 0.94 ) );
#endif`);
    };
    m.customProgramCacheKey = () => 'r11kit-farfog';
    return m;
  }
  // the wind: one shared clock for every swaying material (set from the leaves' onBeforeRender, so it runs with or
  // without CORE's frame hook). Slow and small: the crown of a big oak moves about 0.1 m on a ten-second swell, a little
  // gust riding on it; leaves add a faint flutter of their own. The sway grows with the square of the height above 3 m
  // (trunks and the lower limbs stand still), in the kit's metres frame, the same function for bark and leaves so they
  // move together.
  const WIND = { value: 0 };
  function windy(m, kind) {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      sh.uniforms.uWind = WIND;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  vec3 wIn = instanceMatrix[3].xyz;
#else
  vec3 wIn = vec3(0.0);
#endif
{
  float hh = max(mvPosition.y - 3.0, 0.0);
  float ph = dot(mvPosition.xz, vec2(0.041, 0.027));
  float sw = sin(uWind * 0.55 + ph) * 0.7 + sin(uWind * 1.37 + ph * 1.9) * 0.3;
  vec2 dir = normalize(vec2(0.8, 0.45));
  vec2 off = dir * sw * hh * hh * 0.0009;
  ${kind === 'leaf' ? 'float fl = sin(uWind * 2.3 + dot(wIn, vec3(1.7, 2.3, 3.1))) * 0.025 * min(hh, 1.0); off += vec2(fl, -fl * 0.6); mvPosition.y += fl * 0.5;' : ''}
  mvPosition.xz += off;
}
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`);
    };
    const key = (m.customProgramCacheKey && m.customProgramCacheKey()) || '';
    m.customProgramCacheKey = () => key + '|r11kit-wind-' + kind;
    return m;
  }
  // the smoke ribbon: each instance a strip standing on a chimney top, turned to the camera about its own upright, widening
  // and leaning downwind as it rises (the same wind as the oaks), its texture drifting up it and fading out
  let SMOKE = null;
  function smokeMat(THREE, M) {
    if (SMOKE) return SMOKE;
    const r = mulberry(808);
    const tex = canvasTex(THREE, 64, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { const y = r() * h, x = w / 2 + (r() - .5) * w * 0.35, rr = 8 + r() * 16, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(255,255,255,${0.10 + r() * 0.12})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
      // the strip wraps top to bottom: copy a band so the seam does not show
      const band = g.getImageData(0, 0, w, 24); g.putImageData(band, 0, h - 24);
    }, false);
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
    const m = new THREE.MeshBasicMaterial({ map: tex, color: 0xa9a7a2, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = WIND;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <project_vertex>', `
  float st = position.y;
  vec3 sBase = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sH = length(instanceMatrix[1].xyz), sW = length(instanceMatrix[0].xyz);
  vec3 sp = sBase + vec3(0.0, st * sH, 0.0);
  sp.xz += normalize(vec2(0.8, 0.45)) * pow(st, 1.4) * sH * 0.5 + vec2(sin(uWind * 0.31 + st * 4.0 + sBase.x), cos(uWind * 0.23 + st * 3.0 + sBase.z)) * st * 0.7;
  vec4 mvPosition = modelViewMatrix * vec4(sp, 1.0);
  mvPosition.x += position.x * sW * (0.35 + 1.9 * st) * length(modelViewMatrix[0].xyz);
  gl_Position = projectionMatrix * mvPosition;`);
      sh.fragmentShader = 'uniform float uWind;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
  vec4 smk = texture2D(map, vec2(vMapUv.x, vMapUv.y * 0.6 - uWind * 0.03));
  float sFade = smoothstep(0.0, 0.06, vMapUv.y) * pow(1.0 - vMapUv.y, 1.4) * smoothstep(0.0, 0.25, vMapUv.x) * smoothstep(1.0, 0.75, vMapUv.x);
  diffuseColor.a *= clamp(smk.a * 2.2, 0.0, 1.0) * sFade * 0.5;`);
    };
    m.customProgramCacheKey = () => 'r11kit-smoke';
    SMOKE = m; return m;
  }
  // a scanned texture taken toward grey (sat: what is left of its colour), then tinted
  function greyed(m, color, sat) {
    const prev = m.onBeforeCompile;
    m.color.set(color);
    m.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(m, sh, r);
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
  diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, ${sat.toFixed(3)});`);
    };
    m.customProgramCacheKey = () => 'r11kit-grey-' + sat;
    return m;
  }
  function canvasTex(THREE, w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const grain = (g, w, h, n, a, r) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,240,210'},${a * r()})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } };
  let MATS = null, MATS_T = null;
  function mats(THREE, ctx) {
    if (MATS && MATS_T === THREE && MATS._viaCtx === !!(ctx && ctx.mat)) return MATS;
    const r = mulberry(419), M = {};
    M._viaCtx = !!(ctx && ctx.mat);
    const tinted = (m) => { m = m.clone(); m.vertexColors = true; return m; };   // a copy: CORE's cached material stays as it is
    M.stone = tinted(scanned(THREE, ctx, 'rustic_stone_wall', { color: 0xcfc6b8 }));
    M.plaster = tinted(scanned(THREE, ctx, 'grey_plaster_02', { color: 0xf4ead4 }));
    M.timber = scanned(THREE, ctx, 'medieval_wood', { color: 0x5e4a3a });
    M.slate = scanned(THREE, ctx, 'roof_slates_02', { color: 0x8c9298, ns: 1.2 });
    M.chapel = scanned(THREE, ctx, 'castle_wall_slates', { color: 0xd2d2ce });
    M.ashlar = scanned(THREE, ctx, 'large_sandstone_blocks_01', { color: 0xe8decb });
    M.boards = tinted(scanned(THREE, ctx, 'weathered_planks', { color: 0xb8a288 }));
    M.bark = scanned(THREE, ctx, 'bark_brown_02', { color: 0x6e6258, ns: 1.6 });
    // the iron-bark oaks: grey bark ("An iron-bark oak, grey, as thick as a tower"), the brown scan desaturated, and the
    // slow wind in the vertex shader (a copy: CORE's cached bark stays as it is)
    M.ironBark = windy(greyed(M.bark.clone(), 0xb2b0ab, 0.15), 'bark');
    M.iron = new THREE.MeshStandardMaterial({ color: 0x2b2c2e, roughness: 0.55, metalness: 0.85 });
    M.ironwork = new THREE.MeshStandardMaterial({ color: 0x5a5148, roughness: 0.62, metalness: 0.55 });   // riveted iron, weathered
    M.glassDark = new THREE.MeshStandardMaterial({ color: 0x15191c, roughness: 0.08, metalness: 0.0, envMapIntensity: 1.3 });
    M.glassLit = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, emissive: 0xffa040, emissiveIntensity: 2.2, roughness: 0.3 });
    M.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.62, 0.25).multiplyScalar(6) });
    M.reed = new THREE.MeshStandardMaterial({ color: 0x8a7a4a, roughness: 0.7 });
    // a puddle: still water over the cobbles, its edge soaking out into wet stone (alpha falls off toward the rim)
    const pudA = canvasTex(THREE, 128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(0.62, '#e8e8e8'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false);
    M.puddle = new THREE.MeshStandardMaterial({ color: 0x2c3236, roughness: 0.05, metalness: 0.0, envMapIntensity: 1.6, alphaMap: pudA, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const cloth = (base, stripe) => canvasTex(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      if (stripe) for (let x = 0; x < w; x += 64) { g.fillStyle = stripe; g.fillRect(x, 0, 30, h); }
      for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + 0.03 * (y % 4 === 0)})`; g.fillRect(0, y, w, 1); }
      grain(g, w, h, 2500, 0.12, r);
      const s = g.createRadialGradient(w * .7, h * .8, 4, w * .7, h * .8, 120); s.addColorStop(0, 'rgba(60,40,20,.25)'); s.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = s; g.fillRect(0, 0, w, h);
    });
    // awnings "the colour of old wine and old moss" (calendar11's Massday market line)
    // the three cloths in one texture (three bands, top to bottom: wine, moss striped with wine, moss): one draw for every awning
    const cl = [cloth('#6b3a3c', null), cloth('#646a42', '#5c2f33'), cloth('#5f6840', null)];
    const atlas = canvasTex(THREE, 256, 768, (g) => { cl.forEach((t, i) => g.drawImage(t.image, 0, i * 256)); });
    cl.forEach((t) => t.dispose());
    M.awning = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.95, side: THREE.DoubleSide });
    M.sign = new THREE.MeshStandardMaterial({ map: signTex(THREE, r), roughness: 0.75, metalness: 0.05 });
    M.notices = new THREE.MeshStandardMaterial({ map: noticeTex(THREE, r), roughness: 0.92, alphaTest: 0.5, side: THREE.DoubleSide });
    M.seal = new THREE.MeshStandardMaterial({ map: sealTex(THREE), color: 0xffffff, roughness: 0.15, metalness: 0.1, emissive: 0x0d2a14, emissiveIntensity: 0.6 });
    M.leaves = windy(new THREE.MeshStandardMaterial({ map: leafTex(THREE, r), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), 'leaf');
    M.leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.leaves.map, alphaTest: 0.45 });
    // ivy on stone: alpha cards of small dark leaves on runners, tinted per card (instanced, one draw for the town)
    M.ivy = new THREE.MeshStandardMaterial({ map: ivyTex(THREE, mulberry(523)), alphaTest: 0.42, roughness: 0.78, side: THREE.DoubleSide });
    M.ivyDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: M.ivy.map, alphaTest: 0.42 });
    M.hare = new THREE.MeshStandardMaterial({ map: hareTex(THREE), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.fallen = new THREE.MeshStandardMaterial({ map: M.leaves.map, alphaTest: 0.45, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    M.grime = new THREE.MeshStandardMaterial({ map: grimeTex(THREE, r), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    M.hills = farFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    M.forest = farFog(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }));
    // Greenroot on the downs, a kilometre off in the haze: plain colours in one draw (no texture reads at that distance)
    M.farBld = farFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    M.goods = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    M.rope = new THREE.MeshStandardMaterial({ color: 0x6b5a40, roughness: 0.95 });
    MATS = M; MATS_T = THREE;
    return M;
  }
  // the Boar & Dulcimer's board: the inn's name (canon) and its two namesakes (the painting is [PROPOSED])
  function signTex(THREE, r) {
    return canvasTex(THREE, 384, 448, (g, w, h) => {   // upright, as it hangs from its bracket
      const wood = g.createLinearGradient(0, 0, 0, h); wood.addColorStop(0, '#3b2615'); wood.addColorStop(1, '#22150b'); g.fillStyle = wood; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 7) { g.strokeStyle = `rgba(0,0,0,${0.15 + r() * .2})`; g.beginPath(); g.moveTo(0, y + r() * 3); g.bezierCurveTo(w * .3, y + r() * 6, w * .6, y - r() * 6, w, y + r() * 3); g.stroke(); }
      g.strokeStyle = '#a8833a'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
      // the boar, in profile, facing left
      g.fillStyle = '#cdb68c'; g.save(); g.translate(205, 130); g.scale(0.92, 0.92);
      g.beginPath(); g.moveTo(-110, -6); g.quadraticCurveTo(-100, -48, -40, -58); g.quadraticCurveTo(30, -70, 88, -40); g.quadraticCurveTo(120, -12, 104, 30);
      g.quadraticCurveTo(60, 52, -20, 44); g.quadraticCurveTo(-70, 40, -96, 20); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-96, -20); g.lineTo(-150, -2); g.lineTo(-156, 18); g.lineTo(-104, 22); g.closePath(); g.fill();           // snout
      g.beginPath(); g.moveTo(-84, -42); g.lineTo(-74, -78); g.lineTo(-58, -46); g.fill();                                            // ear
      for (const x of [-70, -38, 50, 80]) { g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 6, 82); g.lineTo(x + 20, 82); g.lineTo(x + 18, 30); g.fill(); }   // legs
      g.beginPath(); for (let i = 0; i < 12; i++) { const x = -60 + i * 12; g.moveTo(x, -54 - (i < 6 ? i : 12 - i)); g.lineTo(x + 5, -78 - (i < 6 ? i * 1.5 : (12 - i) * 1.5)); g.lineTo(x + 10, -54); } g.fill(); // bristles
      g.strokeStyle = '#cdb68c'; g.lineWidth = 4; g.beginPath(); g.moveTo(104, -10); g.quadraticCurveTo(124, -24, 118, -38); g.stroke();       // tail
      g.fillStyle = '#f2e6cc'; g.beginPath(); g.moveTo(-138, 6); g.quadraticCurveTo(-148, -16, -132, -30); g.lineTo(-128, 0); g.fill();   // tusk
      g.fillStyle = '#22150b'; g.beginPath(); g.arc(-88, -18, 4, 0, PI * 2); g.fill(); g.restore();
      // the dulcimer: a hammered dulcimer, a trapezoid box strung across, with its two hammers
      g.save(); g.translate(192, 268); g.rotate(-PI / 2 + 0.08); g.scale(0.7, 0.9); g.fillStyle = '#a8833a';
      g.beginPath(); g.moveTo(-58, -56); g.lineTo(58, -36); g.lineTo(58, 36); g.lineTo(-58, 56); g.closePath(); g.fill();
      g.strokeStyle = '#3b2615'; g.lineWidth = 2; for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(-54, i * 8.5); g.lineTo(54, i * 6); g.stroke(); }
      g.fillStyle = '#3b2615'; g.beginPath(); g.arc(-18, 0, 9, 0, PI * 2); g.fill(); g.beginPath(); g.arc(22, 0, 7, 0, PI * 2); g.fill();
      g.strokeStyle = '#cdb68c'; g.lineWidth = 4; for (const k of [-1, 1]) { g.beginPath(); g.moveTo(k * 10, 70); g.lineTo(k * 34 + 10, 102); g.stroke(); }
      g.restore();
      // the name in two lines, broken at its ampersand (whatever the language)
      g.fillStyle = '#e6cf98'; g.textAlign = 'center'; let fs = 44; const txt = tr('THE BOAR & DULCIMER'), k = txt.indexOf(' & ');
      const lines = k > 0 ? [txt.slice(0, k), txt.slice(k + 1)] : [txt];
      do { g.font = `bold ${fs}px Cinzel, Georgia, serif`; fs -= 2; } while (lines.some((l) => g.measureText(l).width > w - 44) && fs > 14);
      lines.forEach((l, i) => g.fillText(l, w / 2, h - 30 - (lines.length - 1 - i) * (fs + 8)));
      grain(g, w, h, 4000, .15, r);
    });
  }
  // layers of notices: paper sheets, ink in unreadable lines, wax seals (the well-house, the Greenhall and Chapel fronts)
  function noticeTex(THREE, r) {
    return canvasTex(THREE, 256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        const pw = 60 + r() * 50, ph = 80 + r() * 50, x = 10 + r() * (w - pw - 20), y = 10 + r() * (h - ph - 20);
        g.save(); g.translate(x + pw / 2, y + ph / 2); g.rotate((r() - .5) * 0.18);
        const tone = 200 + (r() * 40) | 0; g.fillStyle = `rgb(${tone},${tone - 12},${tone - 40})`; g.fillRect(-pw / 2, -ph / 2, pw, ph);
        g.fillStyle = 'rgba(80,60,30,.25)'; g.fillRect(-pw / 2, ph / 2 - 10, pw, 10);
        g.fillStyle = 'rgba(30,22,14,.75)'; g.fillRect(-pw / 2 + 8, -ph / 2 + 8, pw - 16, 5);
        for (let y2 = -ph / 2 + 20; y2 < ph / 2 - 14; y2 += 6) g.fillRect(-pw / 2 + 8, y2, (pw - 16) * (0.55 + r() * .45), 2);
        if (r() < .5) { g.fillStyle = '#7a1d14'; g.beginPath(); g.arc(pw / 2 - 14, ph / 2 - 16, 6, 0, PI * 2); g.fill(); }
        g.restore();
      }
      grain(g, w, h, 1500, .12, r);
    });
  }
  // the dead Queen's glass seal on the well-house: green glass with her face in profile (canon: "her face is on the green glass seal")
  function sealTex(THREE) {
    return canvasTex(THREE, 128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(w * .4, h * .35, 4, w / 2, h / 2, 64); gr.addColorStop(0, '#8fe0a0'); gr.addColorStop(1, '#1d5a2c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(10,40,18,.55)'; g.beginPath();
      g.moveTo(70, 26); g.quadraticCurveTo(46, 26, 44, 50); g.lineTo(36, 62); g.lineTo(44, 66); g.lineTo(42, 76); g.quadraticCurveTo(50, 82, 54, 92); g.lineTo(60, 108); g.lineTo(88, 108); g.quadraticCurveTo(96, 70, 88, 44); g.quadraticCurveTo(84, 28, 70, 26); g.fill();
      g.strokeStyle = 'rgba(220,255,225,.6)'; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h / 2, 58, 0, PI * 2); g.stroke();
    });
  }
  function leafTex(THREE, r) {
    return canvasTex(THREE, 256, 256, (g, w, h) => {
      const cols = ['#f2e2b0', '#e6d29c', '#d8c48c', '#fff0c4', '#cbb47e', '#e0cc98', '#bfa874', '#f6e8bc', '#d2bc88'];
      for (let i = 0; i < 70; i++) {
        const a = r() * PI * 2, rr = Math.sqrt(r()) * 110, x = w / 2 + Math.cos(a) * rr, y = h / 2 + Math.sin(a) * rr;
        g.save(); g.translate(x, y); g.rotate(r() * PI * 2); g.fillStyle = cols[(r() * cols.length) | 0];
        // an oak leaf: lobed
        g.beginPath(); g.moveTo(0, -15);
        for (let k = 0; k < 4; k++) { const yy = -11 + k * 7; g.quadraticCurveTo(10, yy - 2, 5, yy + 3); }
        g.lineTo(0, 15); for (let k = 3; k >= 0; k--) { const yy = -11 + k * 7; g.quadraticCurveTo(-5, yy + 3, -10, yy - 2); }
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(60,30,8,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, 14); g.stroke(); g.restore();
      }
    });
  }
  function ivyTex(THREE, r) {   // runners with five-pointed leaves, denser at the foot of the card
    return canvasTex(THREE, 256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const leaf = (x, y, s, a, tone) => {
        g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.fillStyle = tone;
        g.beginPath(); g.moveTo(0, 6);
        for (let k = 0; k < 5; k++) { const t = -PI / 2 + (k - 2) * 0.62, t2 = t + 0.31; g.lineTo(Math.cos(t) * 10, Math.sin(t) * 10); g.lineTo(Math.cos(t2) * 5, Math.sin(t2) * 5); }
        g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 5); g.lineTo(0, -8); g.stroke(); g.restore();
      };
      const tones = ['#9fb08a', '#b9c7a0', '#8e9f78', '#c9d2ac', '#a7b48c', '#d8c79a'];
      for (let k = 0; k < 7; k++) {   // runners up the card
        let x = 20 + r() * (w - 40), y = h - 2;
        g.strokeStyle = 'rgba(70,60,40,.9)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y);
        const pts = [];
        while (y > 6) { x += (r() - .5) * 18; y -= 8 + r() * 10; g.lineTo(x, y); pts.push([x, y]); }
        g.stroke();
        for (const [px, py] of pts) { const n = py > h * 0.5 ? 3 : 2; for (let i = 0; i < n; i++) leaf(px + (r() - .5) * 22, py + (r() - .5) * 14, 0.9 + r() * 0.9, (r() - .5) * 1.6, tones[(r() * tones.length) | 0]); }
      }
    });
  }
  // the third Chapel step from the top "has a flaw shaped like a running hare" (Stone, Then Glass: Silas Hurlock cut them)
  function hareTex(THREE) {
    return canvasTex(THREE, 128, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(28,26,24,.55)'; g.translate(64, 34);
      g.beginPath(); g.ellipse(0, 0, 22, 9, -0.12, 0, PI * 2); g.fill();                         // body, stretched in the run
      g.beginPath(); g.ellipse(24, -8, 8, 6, -0.3, 0, PI * 2); g.fill();                        // head
      g.beginPath(); g.moveTo(24, -12); g.quadraticCurveTo(30, -28, 40, -26); g.quadraticCurveTo(32, -20, 28, -10); g.fill();   // ears laid back
      g.beginPath(); g.moveTo(-14, 4); g.lineTo(-40, 16); g.lineTo(-36, 10); g.lineTo(-18, -2); g.fill();          // hind legs out behind
      g.beginPath(); g.moveTo(14, 4); g.lineTo(34, 14); g.lineTo(30, 16); g.lineTo(10, 8); g.fill();               // forelegs reaching
      g.strokeStyle = 'rgba(28,26,24,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-56, 2); g.lineTo(-24, 0); g.moveTo(32, 2); g.lineTo(58, -4); g.stroke();   // the vein runs on
    });
  }
  function grimeTex(THREE, r) {
    return canvasTex(THREE, 128, 64, (g, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(34,40,22,.62)'); gr.addColorStop(0.35, 'rgba(40,40,26,.32)'); gr.addColorStop(1, 'rgba(40,36,26,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < .5 ? '50,62,30' : '28,26,20'},${.12 + r() * .2})`; const x = r() * w, hh = h * (.2 + r() * .6); g.fillRect(x, h - hh, 1 + r() * 4, hh); }
    });
  }

  // ======================================================================== geometry
  function gableRoof(THREE, w, d, h, o) {   // ridge along local x, eaves at y0 = 0 (minus the overhang drop), ridge at h
    const x0 = -w / 2 - o, x1 = w / 2 + o, zf = d / 2 + o, zb = -d / 2 - o, yE = -o * (2 * h / d), yR = h, t = 0.14;
    const P = [], quad = (a, b, c, e) => P.push(...a, ...b, ...c, ...a, ...c, ...e);
    quad([x0, yE, zf], [x1, yE, zf], [x1, yR, 0], [x0, yR, 0]);
    quad([x1, yE, zb], [x0, yE, zb], [x0, yR, 0], [x1, yR, 0]);
    quad([x1, yE - t, zf], [x0, yE - t, zf], [x0, yR - t, 0], [x1, yR - t, 0]);
    quad([x0, yE - t, zb], [x1, yE - t, zb], [x1, yR - t, 0], [x0, yR - t, 0]);
    quad([x0, yE - t, zf], [x1, yE - t, zf], [x1, yE, zf], [x0, yE, zf]);
    quad([x1, yE - t, zb], [x0, yE - t, zb], [x0, yE, zb], [x1, yE, zb]);
    // verge boards: the roof's edge at each gable end
    quad([x1, yE - t, zf], [x1, yR - t, 0], [x1, yR, 0], [x1, yE, zf]); quad([x1, yR - t, 0], [x1, yE - t, zb], [x1, yE, zb], [x1, yR, 0]);
    quad([x0, yR - t, 0], [x0, yE - t, zf], [x0, yE, zf], [x0, yR, 0]); quad([x0, yE - t, zb], [x0, yR - t, 0], [x0, yR, 0], [x0, yE, zb]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
  }
  function gableEnds(THREE, w, d, h) {
    const P = [], x = w / 2;
    P.push(x, 0, d / 2, x, 0, -d / 2, x, h, 0, -x, 0, -d / 2, -x, 0, d / 2, -x, h, 0);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
  }
  function hipRoof(THREE, w, d, h, o) {   // ridge along x (w >= d)
    const x0 = -w / 2 - o, x1 = w / 2 + o, z0 = -d / 2 - o, z1 = d / 2 + o, yE = -o * (2 * h / d), rx = Math.max(0, w / 2 - d / 2);
    const P = [], quad = (a, b, c, e) => P.push(...a, ...b, ...c, ...a, ...c, ...e), tri = (a, b, c) => P.push(...a, ...b, ...c);
    quad([x0, yE, z1], [x1, yE, z1], [rx, h, 0], [-rx, h, 0]);
    quad([x1, yE, z0], [x0, yE, z0], [-rx, h, 0], [rx, h, 0]);
    tri([x1, yE, z1], [x1, yE, z0], [rx, h, 0]);
    tri([x0, yE, z0], [x0, yE, z1], [-rx, h, 0]);
    // soffit
    quad([x1, yE - 0.14, z1], [x0, yE - 0.14, z1], [x0, yE - 0.14, z0], [x1, yE - 0.14, z0]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
  }
  function leanRoof(THREE, w, d, h, o) {   // one slope: high (h) at z = -d/2, low (0) at z = +d/2
    const x0 = -w / 2 - o, x1 = w / 2 + o, zf = d / 2 + o, zb = -d / 2, yE = -o * h / d, t = 0.14;
    const P = [], quad = (a, b, c, e) => P.push(...a, ...b, ...c, ...a, ...c, ...e);
    quad([x0, yE, zf], [x1, yE, zf], [x1, h, zb], [x0, h, zb]);
    quad([x1, yE - t, zf], [x0, yE - t, zf], [x0, h - t, zb], [x1, h - t, zb]);
    quad([x0, yE - t, zf], [x1, yE - t, zf], [x1, yE, zf], [x0, yE, zf]);
    // the end triangles
    P.push(x1, 0, d / 2, x1, 0, zb, x1, h, zb, x0, 0, zb, x0, 0, d / 2, x0, h, zb);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
  }
  function archShape(THREE, w, hs, ha) {   // a pointed arch: width w, springing at hs, apex at ha
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hs);
    s.quadraticCurveTo(w / 2, hs + (ha - hs) * 0.75, 0, ha); s.quadraticCurveTo(-w / 2, hs + (ha - hs) * 0.75, -w / 2, hs); s.closePath(); return s;
  }
  // a wall piece with an arched opening notched up from its foot (no holes: W wide, H tall, opening ow wide at cx,
  // springing at hs, apex ha; pointed or round), optionally with a gable of height gh on top
  function notchShape(THREE, W, H, cx, ow, hs, ha, pointed, gh) {
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(cx - ow / 2, 0); s.lineTo(cx - ow / 2, hs);
    if (pointed) { s.quadraticCurveTo(cx - ow / 2, hs + (ha - hs) * 0.75, cx, ha); s.quadraticCurveTo(cx + ow / 2, hs + (ha - hs) * 0.75, cx + ow / 2, hs); }
    else s.absarc(cx, hs, ow / 2, PI, 0, true);
    s.lineTo(cx + ow / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); if (gh) s.lineTo(0, H + gh); s.lineTo(-W / 2, H); s.closePath(); return s;
  }
  function roundArch(THREE, w, hs) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hs); s.absarc(0, hs, w / 2, 0, PI, false); s.lineTo(-w / 2, 0); return s;
  }
  // world-space UVs: the same texel density whatever a piece's size (metres per repeat = s)
  function worldUV(THREE, geo, s, u0, v0) {
    const p = geo.attributes.position; if (!geo.attributes.normal) geo.computeVertexNormals();
    const n = geo.attributes.normal, uv = new Float32Array(p.count * 2); u0 = u0 || 0; v0 = v0 || 0;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax >= az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
      uv[i * 2] = u / s + u0; uv[i * 2 + 1] = v / s + v0;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    return geo;
  }
  function taperedTube(THREE, points, r0, r1, seg) {
    seg = seg || 7;
    const curve = new THREE.CatmullRomCurve3(points), n = Math.max(4, points.length * 3), P = [], U = [], I = [];
    const frames = curve.computeFrenetFrames(n, false), len = curve.getLength();
    for (let i = 0; i <= n; i++) {
      const t = i / n, c = curve.getPointAt(t), r = lerp(r0, r1, t), N = frames.normals[i], B = frames.binormals[i];
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * PI * 2, rr = r * (1 + 0.08 * Math.sin(a * 3 + i));
        P.push(c.x + rr * (Math.cos(a) * N.x + Math.sin(a) * B.x), c.y + rr * (Math.cos(a) * N.y + Math.sin(a) * B.y), c.z + rr * (Math.cos(a) * N.z + Math.sin(a) * B.z));
        U.push(j / seg * Math.max(1, Math.round(r0 * 4)), t * len / 1.4);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); return g;
  }

  // ======================================================================== the builder: merged pieces by material, instanced boxes
  const TINTED = new Set(['plaster', 'stone', 'boards', 'farBld']);   // merged with a per-lot tint in their vertex colours
  function Builder(THREE, M) {
    const merged = new Map(), inst = new Map(), boxes = [];
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
    const B = {
      THREE, M, cat: 'bldg', boxes, shadowOff: new Set(), tint: null,
      rec(x0, y0, z0, x1, y1, z1) { if (S.debug) boxes.push([B.cat, x0, y0, z0, x1, y1, z1]); },
      // a piece of geometry, transformed into the metres frame, merged with everything else of its material
      put(key, geo, x, y, z, ry, rx, rz) {
        _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s.set(1, 1, 1)); geo.applyMatrix4(_m);
        if (geo.index) geo = geo.toNonIndexed();
        if (!geo.attributes.uv) worldUV(THREE, geo, 2);
        for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
        if (TINTED.has(key)) { const t = B.tint || [1, 1, 1], n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = t[0]; a[i * 3 + 1] = t[1]; a[i * 3 + 2] = t[2]; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
        if (!merged.has(key)) merged.set(key, []);
        merged.get(key).push(geo);
        if (S.debug) { geo.computeBoundingBox(); const b = geo.boundingBox; B.rec(b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z); }
        return geo;
      },
      // an instanced unit box of size w,h,d (the material's texture stretches over it: timbers, shutters, panes, iron)
      box(key, w, h, d, x, y, z, ry, rx, rz, color) {
        _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s.set(w, h, d));
        if (!inst.has(key)) inst.set(key, { mats: [], cols: [] });
        const I = inst.get(key); I.mats.push(_m.clone()); I.cols.push(color == null ? null : color);
        if (S.debug) { const e = _m.elements, hx = (Math.abs(e[0]) + Math.abs(e[4]) + Math.abs(e[8])) / 2, hy = (Math.abs(e[1]) + Math.abs(e[5]) + Math.abs(e[9])) / 2, hz = (Math.abs(e[2]) + Math.abs(e[6]) + Math.abs(e[10])) / 2; B.rec(x - hx, y - hy, z - hz, x + hx, y + hy, z + hz); }
      },
      // a beam of section t x t from point a to point b (metres)
      beam(key, t, ax, ay, az, bx, by, bz, color) {
        const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1e-3;
        _q.setFromUnitVectors(_v.set(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)); _m.compose(_v.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), _q, _s.set(t, L, t));
        if (!inst.has(key)) inst.set(key, { mats: [], cols: [] });
        const I = inst.get(key); I.mats.push(_m.clone()); I.cols.push(color == null ? null : color);
        if (S.debug) B.rec(Math.min(ax, bx) - t, Math.min(ay, by) - t, Math.min(az, bz) - t, Math.max(ax, bx) + t, Math.max(ay, by) + t, Math.max(az, bz) + t);
      },
      // a local frame: origin (ox, oz) in metres at height oy, turned ry; local +z is "out" (the front)
      frame(ox, oz, ry, oy) {
        const c = Math.cos(ry), s = Math.sin(ry); oy = oy || 0;
        const f = {
          ox, oz, ry, oy,
          at(lx, lz) { return [ox + lx * c + lz * s, oz - lx * s + lz * c]; },
          part(key, geo, lx, y, lz, rot, rx, rz) { const p = f.at(lx, lz); return B.put(key, geo, p[0], oy + y, p[1], ry + (rot || 0), rx, rz); },
          ibox(key, w, h, d, lx, y, lz, rot, rx, rz, col) { const p = f.at(lx, lz); B.box(key, w, h, d, p[0], oy + y, p[1], ry + (rot || 0), rx, rz, col); },
          beam(key, t, ax, ay, az, bx, by, bz, col) { const a = f.at(ax, az), b = f.at(bx, bz); B.beam(key, t, a[0], oy + ay, a[1], b[0], oy + by, b[1], col); },
          sub(lx, lz, rot, dy) { const p = f.at(lx, lz); return B.frame(p[0], p[1], ry + (rot || 0), oy + (dy || 0)); },
        };
        return f;
      },
      // into meshes: ONE mesh per material. The instanced boxes (timbers, shutters, panes, iron) are baked into the same
      // merged geometry as the pieces of their material (a box keeps its own 0..1 UVs, as it had instanced), so the
      // timber frames and the timber parts, the iron straps and the iron rings, are one draw each (and one shadow draw).
      finish(group, opts) {
        const mg = addons().mergeGeometries; const out = { meshes: 0 };
        const byMat = new Map();   // material -> { keys: Set, geos: [] }
        const slot = (key) => { const m = M[key] || (inst.has(key) && !merged.has(key) ? M.timber : M.stone); if (!byMat.has(m)) byMat.set(m, { keys: new Set(), geos: [] }); const e = byMat.get(m); e.keys.add(key); return e; };
        for (const [key, list] of merged) if (list.length) slot(key).geos.push(...list);
        const unit = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(), UP = unit.attributes.position.array, UN = unit.attributes.normal.array, UU = unit.attributes.uv.array, nv = UP.length / 3;
        const nm = new THREE.Matrix3(), col = new THREE.Color();
        for (const [key, I] of inst) {
          const n = I.mats.length; if (!n) continue;
          const e = slot(key), mat = M[key] || M.timber, vc = !!mat.vertexColors || I.cols.some((c) => c != null);
          if (vc && !mat.vertexColors) mat.vertexColors = true;   // KIT's own plain materials only (goods): CORE's cached ones are never instanced here
          const P = new Float32Array(n * nv * 3), N = new Float32Array(n * nv * 3), U = new Float32Array(n * nv * 2), Cc = vc ? new Float32Array(n * nv * 3) : null;
          for (let i = 0; i < n; i++) {
            const m = I.mats[i], el = m.elements; nm.getNormalMatrix(m); const ne = nm.elements;
            if (Cc) col.set(I.cols[i] == null ? 0xffffff : I.cols[i]);
            for (let v = 0; v < nv; v++) {
              const x = UP[v * 3], y = UP[v * 3 + 1], z = UP[v * 3 + 2], o = (i * nv + v) * 3;
              P[o] = el[0] * x + el[4] * y + el[8] * z + el[12]; P[o + 1] = el[1] * x + el[5] * y + el[9] * z + el[13]; P[o + 2] = el[2] * x + el[6] * y + el[10] * z + el[14];
              const a = UN[v * 3], b = UN[v * 3 + 1], c = UN[v * 3 + 2];
              let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c; const l = Math.hypot(nx, ny, nz) || 1;
              N[o] = nx / l; N[o + 1] = ny / l; N[o + 2] = nz / l;
              U[(i * nv + v) * 2] = UU[v * 2]; U[(i * nv + v) * 2 + 1] = UU[v * 2 + 1];
              if (Cc) { Cc[o] = col.r; Cc[o + 1] = col.g; Cc[o + 2] = col.b; }
            }
          }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
          if (Cc) g.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
          e.geos.push(g);
        }
        for (const [mat, e] of byMat) {
          if (!e.geos.length) continue;
          // the same attribute set on every piece: vertex colours (white where a piece has none) when the material uses them
          if (mat.vertexColors) for (const g of e.geos) if (!g.attributes.color) { const c = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
          for (const g of e.geos) for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv' && !(k === 'color' && mat.vertexColors)) g.deleteAttribute(k);
          let geo = null;
          try { geo = mg ? mg(e.geos, false) : null; } catch (er) { warnOnce('merge ' + [...e.keys].join('+'), er); }
          const keys = [...e.keys], names = keys.join('+');
          for (const g of (geo ? [geo] : e.geos)) {
            const mesh = new THREE.Mesh(g, mat);
            mesh.castShadow = keys.some((k) => !opts.noShadow.has(k)); mesh.receiveShadow = true; mesh.name = 'kit:' + names;
            if (keys.some((k) => k === 'puddle' || k === 'grime' || k === 'fallenFlat')) mesh.renderOrder = 1;
            mesh.userData.small = keys.every((k) => opts.small.has(k));
            group.add(mesh); out.meshes++;
          }
        }
        return out;
      },
    };
    return B;
  }

  // ======================================================================== reading the map
  const isTall = (c) => !!(c && !c.door && c.tex !== 't_hedge' && (c.top == null || c.top >= 0.9));
  function findBuildings(map) {
    const W = map.w, H = map.h, cells = map.cells, seen = new Uint8Array(W * H), out = [];
    for (let i = 0; i < W * H; i++) {
      if (seen[i] || !isTall(cells[i])) continue;
      const list = [], st = [i]; seen[i] = 1;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      while (st.length) {
        const j = st.pop(), x = j % W, y = (j / W) | 0; list.push(j);
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = ny * W + nx; if (!seen[k] && isTall(cells[k])) { seen[k] = 1; st.push(k); }
        }
      }
      // the doors on or beside this cluster
      const doors = [];
      for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const c = cells[y * W + x]; if (!c || !c.door) continue;
        const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
        if (!inside) { const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const k = (y + dy) * W + x + dx; return list.indexOf(k) >= 0; }); if (!adj) continue; }
        doors.push({ x, y, cell: c, inside });
      }
      let rect = true;
      for (let y = y0; y <= y1 && rect; y++) for (let x = x0; x <= x1; x++) { const c = cells[y * W + x]; if (!(isTall(c) || (c && c.door))) { rect = false; break; } }
      out.push({ cells: list, x0, y0, x1, y1, doors, rect, tex: cells[list[0]].tex });
    }
    return out;
  }
  // which way a door on the rect's edge opens: the side whose outer neighbour is open ground
  function doorSide(map, b, d) {
    const open = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !map.cells[y * map.w + x];
    const c = [];
    if (d.y === b.y1 && open(d.x, d.y + 1)) c.push('S'); if (d.y === b.y0 && open(d.x, d.y - 1)) c.push('N');
    if (d.x === b.x1 && open(d.x + 1, d.y)) c.push('E'); if (d.x === b.x0 && open(d.x - 1, d.y)) c.push('W');
    if (!d.inside) { if (d.y > b.y1) return 'S'; if (d.y < b.y0) return 'N'; if (d.x > b.x1) return 'E'; return 'W'; }
    return c[0] || (d.y === b.y1 ? 'S' : d.y === b.y0 ? 'N' : d.x === b.x1 ? 'E' : 'W');
  }
  const RY = { S: 0, E: PI / 2, N: PI, W: -PI / 2 };
  function kindOf(b) {
    const label = (b.doors.map((d) => d.cell.label || '').join(' | '));
    if (/chapel/i.test(label)) return 'chapel';
    if (/greenhall/i.test(label)) return 'greenhall';
    if (/boar/i.test(label)) return 'inn';
    if (b.tex === 't_wood') return 'shed';
    return 'house';
  }
  const openable = (c) => !!(c && c.door && !c.portal && !c.locked && !c.lockDifficulty);

  // ======================================================================== houses: a footprint becomes a row of lots
  const WALLM = () => ZKf() / UPM();      // a map wall (1 game unit) in metres
  const STOREY = 3.0;                       // a ground storey in metres
  // the parts of one timber-framed house on a lot (lot-local: x along its street face, +z out to the street)
  function houseLot(B, f, w, d, o) {
    const THREE = B.THREE, r = o.rnd, G = STOREY, UP = 2.7, jet = o.jet == null ? 0.3 : o.jet, nf = o.nf, shed = o.style === 'shed';
    const E = o.exp, u0 = r() * 7, v0 = r() * 7, vt = shed ? 'shed' : (o.variant || 'timber'), stoneUp = vt === 'stone';
    const sides = [['f', 0, w, d / 2], ['r', PI / 2, d, w / 2], ['b', PI, w, d / 2], ['l', -PI / 2, d, w / 2]];
    const PL = [[1, 0.97, 0.9], [0.99, 0.9, 0.74], [0.94, 0.92, 0.88], [0.97, 0.87, 0.79], [0.9, 0.88, 0.78], [1, 0.95, 0.82]];
    const ST = [[1, 1, 1], [0.9, 0.89, 0.86], [1, 0.95, 0.88], [0.86, 0.84, 0.8]], BD = [[1, 1, 1], [0.84, 0.8, 0.76], [1, 0.93, 0.84]];
    const tPl = PL[(r() * PL.length) | 0], tSt = ST[(r() * ST.length) | 0], tBd = BD[(r() * BD.length) | 0];
    const T = (key) => { B.tint = key === 'plaster' ? tPl : key === 'stone' ? tSt : key === 'boards' ? tBd : null; return key; };
    // ---- ground floor: stone (houses) or a stone plinth with boards over it (sheds, barns)
    if (shed) {
      f.part(T('stone'), worldUV(THREE, new THREE.BoxGeometry(w, 0.6, d), 2.4, u0, v0), 0, 0.3, 0);
      f.part(T('boards'), worldUV(THREE, new THREE.BoxGeometry(w - 0.06, G - 0.6, d - 0.06), 2.2, u0, v0), 0, 0.6 + (G - 0.6) / 2, 0);
    } else f.part(T('stone'), worldUV(THREE, new THREE.BoxGeometry(w, G, d), 2.4, u0, v0), 0, G / 2, 0);
    B.tint = null;
    for (const [s, a, along, out] of sides) {
      if (!E[s]) continue;
      const sf = f.sub(0, 0, a);
      const doorsHere = (o.doors[s] || []);
      if (shed) { for (const x of [-along / 2 + 0.12, along / 2 - 0.12]) sf.ibox('timber', 0.24, G + (nf ? UP : 0), 0.24, x, (G + (nf ? UP : 0)) / 2, out - 0.1); }
      // grime at the wall's foot
      if (o.grime) sf.part('grime', new THREE.PlaneGeometry(along, 0.9), 0, 0.45, out + 0.02);
      // doors
      for (const dx of doorsHere) doorAt(B, sf, dx, out, shed ? 'barn' : o.style === 'inn' ? 'inn' : 'house', r);
      // ivy up a corner of the stone, away from the doors (more of it on the all-stone houses)
      if (!shed && B.ivy && r() < (vt === 'stone' ? 0.6 : 0.3)) {
        const k = r() < 0.5 ? -1 : 1, iw = 1.2 + r() * 1.4, ix = k * (along / 2 - iw / 2 - 0.05);
        if (!doorsHere.some((dx) => Math.abs(dx - ix) < iw / 2 + 1.0)) ivyPatch(B, sf, ix, out, iw, vt === 'stone' ? G + UP * (0.5 + r() * 0.5) : G * (0.6 + r() * 0.35), r);
      }
      // windows in the ground floor, out of the doors' way
      const bay = shed ? 4.2 : 2.5, n = Math.max(1, Math.floor((along - 1.2) / bay));
      for (let i = 0; i < n; i++) {
        const x = -along / 2 + along * (i + 0.5) / n;
        if (doorsHere.some((dx) => Math.abs(dx - x) < (shed ? 2.6 : 1.7))) continue;
        if (shed && r() < 0.5) continue;
        windowAt(B, sf, x, 1.65, out, shed ? 0.7 : 1.0, shed ? 0.7 : 1.05, r, o.lit, shed);
      }
      if (o.extra && o.extra[s]) o.extra[s](sf, along, out);
    }
    // ---- upper floors
    let y = G, Wk = w, Dk = d, ox = 0, oz = 0;
    for (let k = 1; k <= nf; k++) {
      const J = !shed && !stoneUp, jf = E.f && J ? jet * k : 0, jb = E.b && J ? jet * k : 0, jl = E.l && J ? jet * k : 0, jr = E.r && J ? jet * k : 0;
      Wk = w + jl + jr; Dk = d + jf + jb; ox = (jr - jl) / 2; oz = (jf - jb) / 2;
      f.part(T(shed ? 'boards' : stoneUp ? 'stone' : 'plaster'), worldUV(THREE, new THREE.BoxGeometry(Wk, UP, Dk), stoneUp ? 2.4 : 2.2, u0, v0), ox, y + UP / 2, oz);
      B.tint = null;
      for (const [s, a, , ] of sides) {
        if (!E[s]) continue;
        const along = (s === 'f' || s === 'b') ? Wk : Dk, out = (s === 'f' || s === 'b') ? Dk / 2 : Wk / 2, j = s === 'f' ? jf : s === 'b' ? jb : s === 'l' ? jl : jr;
        const sf = f.sub(ox, oz, a);
        if (shed) {   // a loft: boards, a hatch or a small window
          if (r() < 0.6) windowAt(B, sf, (r() - .5) * along * 0.5, y + 1.3, out, 0.8, 0.8, r, o.lit, true);
          continue;
        }
        if (vt !== 'timber') {   // a rendered or a stone upper storey: a string course and plain windows
          if (vt === 'render') { sf.ibox('timber', along + 0.04, 0.2, 0.12, 0, y + 0.1, out + 0.04); if (j > 0) for (let x = -along / 2 + 0.35; x <= along / 2 - 0.2; x += 1.6) sf.ibox('timber', 0.18, 0.22, j + 0.18, x, y + 0.08, out - j / 2 - 0.09); }
          else sf.ibox('ashlarTrim', along + 0.1, 0.18, 0.14, 0, y + 0.05, out + 0.04);
          const nw = Math.max(1, Math.floor(along / 2.6));
          for (let i = 0; i < nw; i++) if (s === 'f' || s === 'b' || r() < 0.4) windowAt(B, sf, -along / 2 + along * (i + 0.5) / nw, y + UP * 0.6, out + 0.02, 0.85, 1.1, r, o.lit, false);
          continue;
        }
        // jetty: corbels under the overhang, sill beam, top plate, rail
        if (j > 0) for (let x = -along / 2 + 0.35; x <= along / 2 - 0.2; x += 1.3) sf.ibox('timber', 0.18, 0.22, j + 0.18, x, y + 0.08, out - j / 2 - 0.09);
        sf.ibox('timber', along + 0.04, 0.22, 0.14, 0, y + 0.11, out + 0.05);
        sf.ibox('timber', along + 0.04, 0.18, 0.14, 0, y + UP - 0.09, out + 0.05);
        sf.ibox('timber', along, 0.12, 0.1, 0, y + UP * 0.38, out + 0.04);
        const nb = Math.max(2, Math.round(along / 1.25)), bw = along / nb;
        const winBays = new Set(); for (let i = 0; i < nb; i++) if ((i % 2 === 1 || nb <= 3) && (s === 'f' || s === 'b' || r() < 0.5)) winBays.add(i);
        for (let i = 0; i <= nb; i++) {
          const x = -along / 2 + bw * i;
          sf.ibox('timber', 0.17, UP, 0.13, x, y + UP / 2, out + 0.05);
          if (i < nb && !winBays.has(i)) {   // braces in the bays without windows, alternating
            const h2 = UP * 0.38, ang = Math.atan2(h2, bw) * (i % 2 ? 1 : -1);
            sf.ibox('timber', Math.hypot(bw, h2) - 0.12, 0.11, 0.09, x + bw / 2, y + h2 / 2 + 0.06, out + 0.04, 0, 0, ang);
            const ang2 = Math.atan2(UP * 0.62 - 0.2, bw) * (i % 2 ? -1 : 1);
            sf.ibox('timber', Math.hypot(bw, UP * 0.62 - 0.2) - 0.12, 0.11, 0.09, x + bw / 2, y + UP * 0.38 + (UP * 0.62 - 0.2) / 2 + 0.03, out + 0.04, 0, 0, ang2);
          }
        }
        for (const i of winBays) windowAt(B, sf, -along / 2 + bw * (i + 0.5), y + UP * 0.66, out + 0.02, Math.min(0.9, bw * 0.62), 0.95, r, o.lit, false);
      }
      y += UP;
    }
    // ---- roof: gable to the street on narrow deep lots, eaves to the street on wide ones
    const ridgeZ = o.gableFront != null ? o.gableFront : (Wk < Dk * 0.95);
    const span = ridgeZ ? Wk : Dk, len = ridgeZ ? Dk : Wk, rh = o.roofH || span * (shed ? 0.5 : 0.62), ov = 0.38;
    const rot = ridgeZ ? PI / 2 : 0;
    f.part('slate', worldUV(THREE, gableRoof(THREE, len + 0.02, span, rh, ov), 2.2, u0, v0), ox, y, oz, rot);
    f.part(T(shed ? 'boards' : stoneUp ? 'stone' : 'plaster'), worldUV(THREE, gableEnds(THREE, len, span, rh), 2.0, u0, v0), ox, y, oz, rot);
    B.tint = null;
    // timbers in an exposed gable: tie beam, king post, collar
    const gableSides = ridgeZ ? [['f', 0, Dk / 2], ['b', PI, Dk / 2]] : [['r', PI / 2, Wk / 2], ['l', -PI / 2, Wk / 2]];
    for (const [s, a, out] of gableSides) {
      if (!E[s] || shed) continue;
      const sf = f.sub(ox, oz, a);
      if (vt !== 'timber') { if (r() < 0.6) windowAt(B, sf, 0, y + rh * 0.3, out + 0.02, 0.6, 0.7, r, o.lit, false, true); continue; }
      sf.ibox('timber', span, 0.18, 0.14, 0, y + 0.09, out + 0.05);
      sf.ibox('timber', 0.16, rh * 0.86, 0.12, 0, y + rh * 0.43, out + 0.04);
      sf.ibox('timber', span * 0.5, 0.13, 0.11, 0, y + rh * 0.5, out + 0.04);
      for (const k of [-1, 1]) sf.ibox('timber', Math.hypot(span / 2, rh) * 0.9, 0.13, 0.11, k * span / 4, y + rh / 2, out + 0.04, 0, 0, -k * Math.atan2(rh, span / 2));
      if (r() < 0.6) windowAt(B, sf, 0, y + rh * 0.28, out + 0.02, 0.6, 0.7, r, o.lit, false, true);
    }
    // chimneys
    if (o.chimney !== false && r() < (o.chimney ? 1 : 0.6)) {
      const cx = (r() - .5) * (ridgeZ ? span * 0.3 : len * 0.6), cz = (r() - .5) * (ridgeZ ? len * 0.6 : span * 0.3) * 0.5;
      const ch = rh + 1.4;
      f.part('stone', worldUV(THREE, new THREE.BoxGeometry(0.8, ch, 0.8), 2.0), ox + cx, y + ch / 2 - 0.3, oz + cz);
      f.part('stone', worldUV(THREE, new THREE.BoxGeometry(1.0, 0.16, 1.0), 2.0), ox + cx, y + ch - 0.22, oz + cz);
      if (o.chimneys) { const p = f.at(ox + cx, oz + cz); o.chimneys.push([p[0], f.oy + y + ch, p[1]]); }
    }
    return { top: y + rh, eaves: y, Wk, Dk, ox, oz };
  }
  // a window: frame, panes (lit or dark), a mullion and transom, shutters open or shut
  function windowAt(B, sf, x, y, out, w, h, r, litShare, rustic, noShutter) {
    const lit = r() < (litShare == null ? 0.3 : litShare);
    sf.ibox('timber', w + 0.18, 0.11, 0.16, x, y - h / 2 - 0.05, out + 0.06);
    sf.ibox('timber', w + 0.18, 0.11, 0.14, x, y + h / 2 + 0.05, out + 0.05);
    for (const k of [-1, 1]) sf.ibox('timber', 0.09, h, 0.12, x + k * (w / 2 + 0.04), y, out + 0.05);
    const shut = !noShutter && r() < (rustic ? 0.55 : 0.32);
    if (!shut) {
      sf.ibox(lit ? 'glassLit' : 'glassDark', w, h, 0.04, x, y, out + 0.01);
      sf.ibox('timber', 0.05, h, 0.05, x, y, out + 0.05);
      if (!rustic) sf.ibox('timber', w, 0.05, 0.05, x, y + h * 0.12, out + 0.05);
      if (!noShutter && r() < 0.55) for (const k of [-1, 1]) sf.ibox('shutter', w / 2, h, 0.05, x + k * (w * 0.75 + 0.06), y, out + 0.07 + w * 0.1, k * 0.3);
      // [PROPOSED] a window-box under an upper window: herbs and the last of the summer's flowers, going over
      if (B.ivy && !rustic && y > 3.5 && r() < 0.16) {
        const by = y - h / 2 - 0.2; sf.ibox('timber', w + 0.12, 0.2, 0.22, x, by, out + 0.17); sf.ibox('iron', 0.03, 0.18, 0.2, x - w / 2 + 0.05, by - 0.12, out + 0.12, 0, -0.6);
        for (let i = 0; i < 4; i++) { const q = sf.at(x - w / 2 + 0.1 + (i + r() * 0.5) * (w - 0.2) / 4, out + 0.18); B.ivy.push([q[0], sf.oy + by + 0.06, q[1], sf.ry + (r() - .5) * 0.6, 0.38 + r() * 0.12, (r() - .5) * 0.5, (r() - .5) * 0.2, r(), r() < 0.5 ? [0.07 + r() * 0.04, 0.3, 0.2 + r() * 0.06] : [0.22 + r() * 0.06, 0.3, 0.2]]); }
      }
    } else {
      // shut against the Hush: two leaves closed over the glass
      for (const k of [-1, 1]) sf.ibox('shutter', w / 2 - 0.01, h, 0.05, x + k * w / 4, y, out + 0.05);
      sf.ibox('iron', w * 0.9, 0.04, 0.03, x, y, out + 0.09);
    }
  }
  // a door at the face (out), centred at x: jambs, lintel, plank leaf, straps and ring, a step
  function doorAt(B, sf, x, out, style, r) {
    const THREE = B.THREE, barn = style === 'barn', w = barn ? 2.6 : 1.25, h = barn ? 2.9 : 2.3;
    DOORS.push(sf.at(x, out + 0.05));
    sf.ibox('timber', 0.2, h + 0.1, 0.24, x - w / 2 - 0.1, (h + 0.1) / 2, out + 0.07);
    sf.ibox('timber', 0.2, h + 0.1, 0.24, x + w / 2 + 0.1, (h + 0.1) / 2, out + 0.07);
    sf.ibox('timber', w + 0.6, 0.24, 0.26, x, h + 0.12, out + 0.08);
    sf.part('boards', worldUV(THREE, new THREE.BoxGeometry(w, h, 0.1), 1.1), x, h / 2, out + 0.03);
    if (barn) {
      for (const yy of [0.4, h - 0.45]) sf.ibox('iron', w * 0.8, 0.06, 0.03, x - w * 0.08, yy, out + 0.1);
      sf.ibox('timber', 0.12, h, 0.06, x, h / 2, out + 0.1); sf.ibox('timber', Math.hypot(w / 2, h) - 0.2, 0.12, 0.05, x - w / 4, h / 2, out + 0.1, 0, 0, Math.atan2(h, w / 2)); sf.ibox('timber', Math.hypot(w / 2, h) - 0.2, 0.12, 0.05, x + w / 4, h / 2, out + 0.1, 0, 0, -Math.atan2(h, w / 2));
    } else doorIron(B, sf, x, out + 0.08, w, h, r && r() < 0.5 ? 1 : -1);
    sf.part('stone', worldUV(THREE, new THREE.BoxGeometry(w + 0.5, 0.14, 0.45), 1.6), x, 0.07, out + 0.2);
    // a lantern on a wall-arm beside most house doors: whoever lives there lights it at dusk and leaves it (the Hush)
    if (!barn && style !== 'inn' && B.doorLamps && r && r() < 0.7) { const k = r() < 0.5 ? -1 : 1; wallArm(B, sf, x + k * (w / 2 + 0.45), 2.45, out, B.doorLamps, k); }
  }
  // a plank door's iron: strap hinges from the hinge side with split, curled ends, the pintles on the jamb, a ring pull on
  // its boss, a key plate, and a row of nail heads along each ledge
  function doorIron(B, sf, x, z, w, h, hs, y0) {
    const THREE = B.THREE, hx = x - hs * w / 2, Y = y0 || 0;
    sf = Y ? sf.sub(0, 0, 0, Y) : sf;
    for (const yy of [0.42, h - 0.45]) {
      const L = w * 0.72, ex = hx + hs * L;
      sf.ibox('iron', L, 0.055, 0.02, hx + hs * L / 2, yy, z);
      for (const k of [-1, 1]) sf.ibox('iron', 0.16, 0.03, 0.02, ex + hs * 0.05, yy + k * 0.04, z, 0, 0, k * hs * 0.6);
      sf.ibox('iron', 0.05, 0.14, 0.05, hx - hs * 0.05, yy, z - 0.02);
      for (let i = 1; i <= 4; i++) sf.ibox('iron', 0.025, 0.025, 0.025, hx + hs * L * i / 5, yy, z + 0.012);
    }
    for (let i = 0; i < 5; i++) sf.ibox('iron', 0.025, 0.025, 0.025, x - w * 0.4 + i * w * 0.2, h * 0.5, z + 0.005);
    const rx = x - hs * w * 0.3;
    sf.ibox('iron', 0.1, 0.1, 0.02, rx, 1.12, z);
    sf.part('iron', new THREE.TorusGeometry(0.065, 0.011, 5, 14), rx, 1.03, z + 0.03, 0, 0.25);
    sf.ibox('iron', 0.06, 0.11, 0.015, rx, 0.92, z);
  }
  // a line where blown leaves gather (the foot of a step's riser), local x from x0 to x1 at local z, in a frame
  function driftLine(B, f, x0, x1, z, w8) {
    if (!B.drifts) return;
    const a = f.at(x0, z), b = f.at(x1, z), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    // the line's angle is taken so that its normal (sin, -cos) points out of the riser, into the open
    B.drifts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(a[1] - b[1], a[0] - b[0]), len, (w8 || 1) * len / 3]);
  }
  // ivy climbing a wall from its foot: a patch of cards (w wide, h high) at along-coordinate x of a side frame, broad at
  // the foot and thinning upward, tilted off the wall a little so it has some depth
  function ivyPatch(B, sf, x, out, w, h, r, dense) {
    const n = Math.round(w * h * (dense || 2.4));
    for (let i = 0; i < n; i++) {
      const t = Math.pow(r(), 1.35), y = 0.15 + t * (h - 0.3), lx = x + (r() - .5) * w * (1 - 0.55 * t), q = sf.at(lx, out + 0.04 + r() * 0.05);
      B.ivy.push([q[0], sf.oy + y, q[1], sf.ry, (0.55 + r() * 0.45) * (1 - 0.3 * t), (r() - .5) * 0.9, 0.12 + r() * 0.38, r()]);
    }
  }
  // a lantern hung from a wrought wall-arm: a back plate, the arm with a brace and a curl, the lantern from its end
  function wallArm(B, sf, x, y, out, lampsAt, hand) {
    const THREE = B.THREE, L = 0.5;
    sf.ibox('iron', 0.12, 0.3, 0.02, x, y + 0.42, out + 0.01);
    sf.ibox('iron', 0.035, 0.035, L, x, y + 0.5, out + L / 2);
    sf.beam('iron', 0.025, x, y + 0.3, out + 0.02, x, y + 0.49, out + L * 0.62);
    sf.part('iron', new THREE.TorusGeometry(0.06, 0.012, 4, 10, PI * 1.4), x, y + 0.56, out + L * 0.45, PI / 2 + (hand || 1) * 0.0);
    sf.ibox('iron', 0.012, 0.1, 0.012, x, y + 0.44, out + L - 0.04);
    const q = sf.at(x, out + L - 0.04);
    lampsAt.push([q[0], sf.oy + y + 0.06, q[1], 2, false, sf.ry, false, 'door']);
  }
  // a footprint (W along the front, D deep) cut into rows and lots
  function terrace(B, f, W, D, o) {
    const r = o.rnd, shed = o.style === 'shed', rows = [];
    const nr = D <= 18 ? 1 : D <= 32 ? 2 : 3;
    const cut = (len, target, min) => { const n = Math.max(1, Math.round(len / target)); const ws = []; let tot = 0; for (let i = 0; i < n; i++) { const v = 0.78 + r() * 0.44; ws.push(v); tot += v; } return ws.map((v) => Math.max(min, v / tot * len)).map((v, i, a) => i === a.length - 1 ? len - a.slice(0, -1).reduce((s, x) => s + x, 0) : v); };
    const depths = nr === 1 ? [D] : nr === 2 ? (() => { const a = D * (0.46 + r() * 0.08); return [a, D - a]; })() : [D * 0.36, D * 0.28, D * 0.36];
    let z = D / 2;
    for (let ri = 0; ri < nr; ri++) { const d = depths[ri]; rows.push({ z0: z - d, z1: z, d, front: ri === 0, back: ri === nr - 1, facing: ri === nr - 1 && nr > 1 ? 'b' : 'f' }); z -= d; }
    const res = [];
    for (const row of rows) {
      const ws = o.lotWidths && row.front ? o.lotWidths : cut(W, shed ? 11 : 7.6, 4.2);
      let x = -W / 2;
      ws.forEach((w, li) => {
        const lx = x + w / 2, lz = (row.z0 + row.z1) / 2; x += w;
        // exposure in building terms, then into the lot's own terms (a back-row lot faces the back street)
        const eb = { f: row.front, b: row.back, l: li === 0, r: li === ws.length - 1 };
        const flip = row.facing === 'b';
        const exp = flip ? { f: eb.b, b: eb.f, l: eb.r, r: eb.l } : eb;
        // doors that fall on this lot
        const doors = { f: [], b: [], l: [], r: [] };
        for (const dd of o.doors) {
          // building side and its along-coordinate (side frames: f +x, b -x, r -z, l +z); the lot's along-coordinate on the
          // same face is the same whichever way the lot faces, only the side's name turns with it
          const s = dd.side, pos = dd.pos, e = 1e-6;
          let hit = false, lp = 0;
          if (s === 'f' && row.front && pos >= lx - w / 2 - e && pos <= lx + w / 2 + e) { hit = true; lp = pos - lx; }
          if (s === 'b' && row.back && -pos >= lx - w / 2 - e && -pos <= lx + w / 2 + e) { hit = true; lp = pos + lx; }
          if (s === 'r' && li === ws.length - 1 && -pos >= row.z0 - e && -pos <= row.z1 + e) { hit = true; lp = pos + lz; }
          if (s === 'l' && li === 0 && pos >= row.z0 - e && pos <= row.z1 + e) { hit = true; lp = pos - lz; }
          if (!hit) continue;
          const ls = flip ? { f: 'b', b: 'f', l: 'r', r: 'l' }[s] : s;
          doors[ls].push(lp);
        }
        const lf = f.sub(lx, lz, flip ? PI : 0);
        const hasDoor = doors.f.length + doors.b.length + doors.l.length + doors.r.length > 0;
        const nf = o.nf != null ? o.nf : (shed ? (r() < 0.6 ? 1 : 0) : (hasDoor && o.style === 'inn' ? 2 : (r() < 0.45 ? 2 : 1)));
        const v = r(), variant = (o.style === 'inn' && hasDoor) ? 'timber' : v < 0.58 ? 'timber' : v < 0.85 ? 'render' : 'stone';
        const info = houseLot(B, lf, w - 0.005, row.d - 0.005, Object.assign({}, o, { exp, doors, nf, variant, rnd: r, grime: o.grime && (exp.f || exp.b || exp.l || exp.r) }));
        res.push({ lf, w, d: row.d, exp, doors, info, lx, lz, flip });
      });
    }
    return res;
  }

  // ======================================================================== special buildings
  function chapel(B, f, W, D, o) {   // the Chapel of the Carillon (Book One: "the Chapel of the Pure Note with its empty belfry")
    const THREE = B.THREE, r = o.rnd, C = 'chapel';
    const door = o.doors.find((d) => d.side === 'f') || { pos: 0 };
    const Cm = 1 / UPM(), NW = clamp(W * 0.58, 8, 14), xn = clamp(door.pos, -W / 2 + NW / 2, W / 2 - NW / 2), NH = clamp(D * 0.55, 8, 12), nx0 = xn - NW / 2, nx1 = xn + NW / 2;
    // the porch: a recess inside the door cell, shallower than half a cell (CORE's own door leaf stands on the cell's
    // mid-plane, inside the masonry behind it), the door at its back
    const zf = D / 2, PD = Math.min(2.6, Cm * 0.45), pw = Math.min(2.8, Cm * 0.82), pz = zf - PD;
    const px = clamp(door.pos, nx0 + 2, nx1 - 2);
    // nave body (behind the porch), its side walls beside the porch, and the front wall with the porch arch through it
    f.part(C, worldUV(THREE, new THREE.BoxGeometry(NW, NH, D - PD), 2.6), xn, NH / 2, (-D / 2 + pz) / 2);
    for (const x of [nx0 + 0.4, nx1 - 0.4]) f.part(C, worldUV(THREE, new THREE.BoxGeometry(0.8, NH, PD + 0.8), 2.6), x, NH / 2, pz + (PD + 0.8) / 2 - 0.8 + 0.0);
    const rh = NW * 0.52, front = notchShape(THREE, NW, NH, px - xn, pw, 2.6, 4.3, true, rh);
    // the great window over the porch: drawn as glass set into the front
    f.part(C, worldUV(THREE, new THREE.ExtrudeGeometry(front, { depth: 0.8, bevelEnabled: false }), 2.6), xn, 0, zf - 0.8);
    // the porch's inside: walls, vault, steps up to the door
    for (const k of [-1, 1]) f.part(C, worldUV(THREE, new THREE.BoxGeometry(0.4, 4.6, PD), 2.6), px + k * (pw / 2 + 0.2), 2.3, pz + PD / 2);
    f.part(C, worldUV(THREE, new THREE.BoxGeometry(pw + 0.8, 0.4, PD), 2.6), px, 4.5, pz + PD / 2);
    // the Chapel steps: eleven of them, quarry stone (Stone, Then Glass: Silas Hurlock cut "the 11 Chapel steps", and "the
    // third from the top has a flaw shaped like a running hare"). The lowest four are broad and low, out on the street
    // (0.4 m in all, the height of a kerb or two); the other seven climb inside the porch to the door.
    const RS = 0.1, OUT = 4, TO = 0.3, IN = 7, TI = PD / (IN + 0.3), SW = pw + 2.6;
    const step = (i, z0, depth, width) => {   // step i (0 = lowest) from z0 back to the porch, its top at (i + 1) x RS
      const h = RS * (i + 1), zc = z0 - depth / 2;
      f.part(C, worldUV(THREE, new THREE.BoxGeometry(width, h, depth), 1.6), px, h / 2, zc);
      return h;
    };
    for (let i = 0; i < OUT; i++) { const z0 = zf + (OUT - i) * TO; B.cat = 'steps'; step(i, z0, z0 - zf + 0.02, SW - i * 0.35); B.cat = 'bldg'; driftLine(B, f, px - (SW - i * 0.35) / 2, px + (SW - i * 0.35) / 2, z0 + 0.01, 1.2); }
    for (let i = 0; i < IN; i++) step(OUT + i, zf - i * TI, TI * (IN - i) - 0.0, pw);
    // the hare: on the tread of the third step from the top (step 9 of 11)
    { const i = 8, top = RS * (i + 1), zc = zf - (i - OUT) * TI - TI / 2; f.part('hare', new THREE.PlaneGeometry(0.42, 0.2).rotateX(-PI / 2), px + 0.35, top + 0.004, zc + 0.02, 0.2); }
    const sill = RS * (OUT + IN);
    const dshape = archShape(THREE, 1.7, 2.0, 3.0); DOORS.push(f.at(px, pz));
    f.part('boards', worldUV(THREE, new THREE.ExtrudeGeometry(dshape, { depth: 0.1, bevelEnabled: false }), 1.1), px, sill, pz);
    doorIron(B, f, px, pz + 0.11, 1.5, 2.6, 1, sill);
    // the warrant on the Chapel door, and the notice board at the Chapel front (canon: the Synod Gazette, Book One ch. 9)
    f.part('notices', new THREE.PlaneGeometry(0.42, 0.56), px - 0.35, sill + 1.75, pz + 0.12);
    noticeBoard(B, f, clamp(px + pw / 2 + 1.6, nx0 + 1, nx1 - 1), zf, 1.0);
    // the west window over the porch
    f.part('glassDark', new THREE.ExtrudeGeometry(archShape(THREE, 2.0, 3.0, 4.6), { depth: 0.05, bevelEnabled: false }), xn, NH - 3.6, zf + 0.01);
    for (const x of [-0.5, 0.5]) f.ibox('chapelTrim', 0.12, 3.8, 0.12, xn + x, NH - 3.6 + 1.9, zf + 0.06);
    // the nave roof
    f.part('slate', worldUV(THREE, gableRoof(THREE, D + 0.02, NW, rh, 0.45), 2.2), xn, NH, 0, PI / 2);
    f.part(C, worldUV(THREE, gableEnds(THREE, D, NW, rh), 2.6), xn, NH, 0, PI / 2);
    // aisles to the footprint's edges, lean-to roofs against the nave
    const AH = Math.min(6.2, NH - 3.5);
    for (const [a0, a1] of [[-W / 2, nx0], [nx1, W / 2]]) {
      const aw = a1 - a0; if (aw < 1) continue;
      const ax = (a0 + a1) / 2, west = ax < xn;
      f.part(C, worldUV(THREE, new THREE.BoxGeometry(aw, AH, D), 2.6), ax, AH / 2, 0);
      f.part('slate', worldUV(THREE, leanRoof(THREE, D, aw, 2.6, 0.4), 2.2), ax, AH, 0, west ? -PI / 2 : PI / 2);
      // lancets along the outer wall, buttresses between
      const sf = f.sub(ax, 0, west ? -PI / 2 : PI / 2), out = aw / 2;
      const nl = Math.max(2, Math.round(D / 5.6));
      for (let i = 0; i < nl; i++) {
        const z = -D / 2 + D * (i + 0.5) / nl;
        sf.part('glassDark', new THREE.ExtrudeGeometry(archShape(THREE, 0.95, 1.9, 2.8), { depth: 0.05, bevelEnabled: false }), z, 1.5, out + 0.01);
        sf.ibox('chapelTrim', 1.25, 0.16, 0.16, z, 1.44, out + 0.06);
        if (i < nl - 1) sf.part(C, worldUV(THREE, new THREE.BoxGeometry(0.9, AH * 0.85, 0.5), 2.6), z + D / nl / 2, AH * 0.425, out + 0.25);
      }
      // the aisle's front (and back) face
      for (const [s2, a2] of [['f', 0], ['b', PI]]) { const ff = f.sub(ax, 0, a2), lx = a2 === 0 ? 0 : 0; ff.part('glassDark', new THREE.ExtrudeGeometry(archShape(THREE, 0.9, 1.9, 2.8), { depth: 0.05, bevelEnabled: false }), lx, 1.8, D / 2 + 0.01); void s2; }
      if (o.grime) { sf.part('grime', new THREE.PlaneGeometry(D, 0.9), 0, 0.45, out + 0.02); }
      // ivy up the old stone between the lancets (the Chapel is the oldest wall in the square)
      if (B.ivy) for (let i = 0; i < nl; i++) if (r() < 0.55) ivyPatch(B, sf, -D / 2 + D * (i + 1) / nl + (r() - .5) * 0.6, out, 1.4 + r() * 1.6, 2.5 + r() * 3.2, r);
    }
    // clerestory lancets in the nave walls above the aisles
    for (const k of [-1, 1]) { const sf = f.sub(xn, 0, k * PI / 2); for (let z = -D / 2 + 3; z <= D / 2 - 3; z += 3.6) sf.part('glassDark', new THREE.ExtrudeGeometry(archShape(THREE, 0.6, 1.2, 1.8), { depth: 0.05, bevelEnabled: false }), z, AH + 2.6, NW / 2 + 0.01); }
    // buttresses on the front corners of the nave, ivy up them and along the front's foot
    for (const x of [nx0, nx1]) f.part(C, worldUV(THREE, new THREE.BoxGeometry(0.9, NH * 0.8, 0.55), 2.6), x, NH * 0.4, zf - 0.27 + 0.27);
    if (B.ivy) { for (const x of [nx0 + 0.9, nx1 - 0.9]) ivyPatch(B, f, x, zf + 0.26, 1.8, 3.5 + r() * 2.5, r, 2.8); for (const x of [-W / 2 + 1.2, W / 2 - 1.2]) if (Math.abs(x - xn) > NW / 2 + 0.8) ivyPatch(B, f, x, zf, 1.6, 2.2 + r() * 1.5, r); }
    // the bell-tower, where the map raises it; its belfry is open to the weather and nothing hangs in it (canon)
    const t = o.tower || { x: xn, z: -D / 4 }, TW = clamp(o.towerW || 7, 5.5, 8), TS = NH + 13, BH = 5.2;
    f.part(C, worldUV(THREE, new THREE.BoxGeometry(TW, TS, TW), 2.6), t.x, TS / 2, t.z);
    f.part(C, worldUV(THREE, new THREE.BoxGeometry(TW + 0.5, 0.45, TW + 0.5), 2.6), t.x, TS, t.z);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.part(C, worldUV(THREE, new THREE.BoxGeometry(1.5, BH, 1.5), 2.6), t.x + a * (TW / 2 - 0.75), TS + BH / 2, t.z + b * (TW / 2 - 0.75));
    for (let s = 0; s < 4; s++) {   // a pointed head over each open side
      const tf = f.sub(t.x, t.z, s * PI / 2), arch = notchShape(THREE, TW, 2.2, 0, TW - 3.0, 0.4, 1.9, true, 0);
      tf.part(C, worldUV(THREE, new THREE.ExtrudeGeometry(arch, { depth: 0.6, bevelEnabled: false }), 2.6), 0, TS + BH - 2.2, TW / 2 - 0.6);
      tf.ibox('chapelTrim', TW - 3, 0.2, 0.7, 0, TS + 0.95, TW / 2 - 0.3);   // the belfry sill
    }
    f.part(C, worldUV(THREE, new THREE.BoxGeometry(TW + 0.6, 0.5, TW + 0.6), 2.6), t.x, TS + BH + 0.25, t.z);
    const cap = new THREE.ConeGeometry(TW * 0.74, 7.0, 4, 1); cap.rotateY(PI / 4);
    f.part('slate', worldUV(THREE, cap, 2.2), t.x, TS + BH + 0.5 + 3.5, t.z);
    f.ibox('iron', 0.08, 1.6, 0.08, t.x, TS + BH + 0.5 + 7.6, t.z);
    if (o.landmarks) o.landmarks.push(['chapel tower', f.at(t.x, t.z), TS + BH + 9]);
    return { porch: f.at(px, zf), door: f.at(px, pz), steps: OUT + IN, hare: true };
  }
  function noticeBoard(B, f, x, z, h) {   // a timber board on the wall, with notices layered on it
    const THREE = B.THREE;
    f.ibox('timber', 1.5, 0.1, 0.16, x, 1.35 + h, z + 0.08);
    f.ibox('timber', 1.4, h, 0.06, x, 1.35 + h / 2, z + 0.03);
    for (const k of [-1, 1]) f.ibox('timber', 0.1, h + 0.25, 0.12, x + k * 0.72, 1.3 + h / 2, z + 0.06);
    f.part('notices', new THREE.PlaneGeometry(1.32, h * 0.92), x, 1.35 + h / 2, z + 0.07);
  }
  function greenhall(B, f, W, D, o) {   // the Greenhall: the grandest house in town, "the Greenhall's long timbered front", its steps, its dome
    const THREE = B.THREE, r = o.rnd;
    const door = o.doors.find((d) => d.side === 'f') || { pos: 0 };
    const Cm = 1 / UPM(), G1 = 4.6, G2 = 4.0, jet = 0.45, zf = D / 2, PD = Math.min(2.6, Cm * 0.45), pw = Math.min(3.6, Cm * 0.85), px = door.pos, pz = zf - PD;
    // ground storey in ashlar, with the entrance as a recess (porch) in the door cell
    f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(W, G1, D - PD), 3.0), 0, G1 / 2, -PD / 2);
    const segL = (px - pw / 2 - 0.4) - (-W / 2), segR = W / 2 - (px + pw / 2 + 0.4);
    f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(segL, G1, PD), 3.0), -W / 2 + segL / 2, G1 / 2, pz + PD / 2);
    f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(segR, G1, PD), 3.0), W / 2 - segR / 2, G1 / 2, pz + PD / 2);
    for (const k of [-1, 1]) f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(0.4, G1, PD), 3.0), px + k * (pw / 2 + 0.2), G1 / 2, pz + PD / 2);
    f.part('ashlar', worldUV(THREE, new THREE.ExtrudeGeometry(notchShape(THREE, pw + 0.8, G1, 0, pw, 2.2, 4.0, false, 0), { depth: 0.6, bevelEnabled: false }), 3.0), px, 0, zf - 0.6);
    f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(pw, 0.6, PD), 3.0), px, G1 - 0.3, pz + PD / 2);
    // the Greenhall steps (Book One: "He stood on the Greenhall steps"; "the line below the Greenhall steps"): three broad
    // low ones out on the square across the whole entrance bay, then the porch's own up to the door
    const GR = 0.12, GO = 3, GT = 0.3, GW = pw + 4.2;
    for (let i = 0; i < GO; i++) { const z0 = zf + (GO - i) * GT, w2 = GW - i * 0.5; B.cat = 'steps'; f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(w2, GR * (i + 1), z0 - zf + 0.02), 1.6), px, GR * (i + 1) / 2, (z0 + zf) / 2 - 0.01); B.cat = 'bldg'; driftLine(B, f, px - w2 / 2, px + w2 / 2, z0 + 0.01, 1.2); }
    const ns = Math.max(1, Math.floor(PD / 0.36)), sd = PD / (ns + 0.4), g0 = GR * GO;
    for (let i = 0; i < ns; i++) f.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(pw, g0 + 0.16 * (i + 1), sd), 1.6), px, (g0 + 0.16 * (i + 1)) / 2, pz + sd / 2 + (ns - 1 - i) * sd);
    f.part('boards', worldUV(THREE, new THREE.ExtrudeGeometry(roundArch(THREE, Math.min(2.0, pw - 0.4), 2.0), { depth: 0.1, bevelEnabled: false }), 1.1), px, g0 + 0.16 * ns, pz); DOORS.push(f.at(px, pz));
    doorIron(B, f, px, pz + 0.11, Math.min(2.0, pw - 0.4) - 0.1, 2.6, -1, g0 + 0.16 * ns);
    // tall round-headed windows along the ground storey, a plinth and a string course
    const sf0 = f;
    for (const [s, a, along, out] of [['f', 0, W, D / 2], ['b', PI, W, D / 2], ['r', PI / 2, D, W / 2], ['l', -PI / 2, D, W / 2]]) {
      const sf = sf0.sub(0, 0, a);
      sf.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(along + 0.3, 0.5, 0.3), 3.0), 0, 0.25, out + 0.0);
      sf.part('ashlar', worldUV(THREE, new THREE.BoxGeometry(along + 0.2, 0.25, 0.25), 3.0), 0, G1 - 0.15, out + 0.0);
      const n = Math.floor(along / 3.6);
      for (let i = 0; i < n; i++) {
        const x = -along / 2 + along * (i + 0.5) / n;
        if (s === 'f' && Math.abs(x - px) < pw / 2 + 2.6) continue;
        sf.part(r() < 0.35 ? 'glassLit' : 'glassDark', new THREE.ExtrudeGeometry(roundArch(THREE, 1.1, 1.6), { depth: 0.04, bevelEnabled: false }), x, 1.3, out + 0.01);
        sf.ibox('ashlarTrim', 1.45, 0.14, 0.14, x, 1.24, out + 0.07);
        sf.ibox('timber', 0.06, 2.15, 0.05, x, 1.3 + 1.07, out + 0.05);
      }
      if (s === 'f') { noticeBoard(B, sf, px - pw / 2 - 2.2, out, 1.0); noticeBoard(B, sf, px + pw / 2 + 2.2, out, 1.0); }
      if (B.ivy && s !== 'f') for (const k of [-1, 1]) if (r() < 0.5) ivyPatch(B, sf, k * (along / 2 - 1.0), out + 0.15, 1.6, 2.4 + r() * 1.8, r);
      if (o.grime) sf.part('grime', new THREE.PlaneGeometry(along + 0.3, 0.9), 0, 0.45, out + 0.16);
    }
    // the timbered upper storey, jettied all round, close-studded with a long band of windows
    const W2 = W + 2 * jet, D2 = D + 2 * jet;
    f.part('plaster', worldUV(THREE, new THREE.BoxGeometry(W2, G2, D2), 2.2), 0, G1 + G2 / 2, 0);
    for (const [s, a, along, out] of [['f', 0, W2, D2 / 2], ['b', PI, W2, D2 / 2], ['r', PI / 2, D2, W2 / 2], ['l', -PI / 2, D2, W2 / 2]]) {
      const sf = f.sub(0, 0, a);
      for (let x = -along / 2 + 0.4; x <= along / 2 - 0.2; x += 1.1) sf.ibox('timber', 0.2, 0.26, jet + 0.2, x, G1 + 0.1, out - jet / 2 - 0.1);
      sf.ibox('timber', along + 0.04, 0.26, 0.16, 0, G1 + 0.13, out + 0.06);
      sf.ibox('timber', along + 0.04, 0.22, 0.16, 0, G1 + G2 - 0.11, out + 0.06);
      sf.ibox('timber', along, 0.14, 0.12, 0, G1 + 1.05, out + 0.05);
      sf.ibox('timber', along, 0.14, 0.12, 0, G1 + 2.75, out + 0.05);
      // close studding, with a three-light window in every fourth panel
      const st = 0.7, n = Math.round(along / st), pw2 = along / n;
      for (let i = 0; i <= n; i++) {
        const x = -along / 2 + pw2 * i, win = (i % 6 === 3) && i + 2 <= n && i > 1;
        if (!(i % 6 === 4 && i > 1 && i + 1 <= n)) sf.ibox('timber', 0.15, G2, 0.13, x, G1 + G2 / 2, out + 0.05);
        if (win) {
          const ww = pw2 * 2 - 0.2, cx = x + pw2;
          sf.ibox(r() < 0.35 ? 'glassLit' : 'glassDark', ww, 1.4, 0.04, cx, G1 + 1.95, out + 0.02);
          for (const k of [-1, 1]) sf.ibox('timber', 0.06, 1.4, 0.06, cx + k * ww / 6, G1 + 1.95, out + 0.06);
          sf.ibox('timber', ww + 0.2, 0.12, 0.16, cx, G1 + 1.2, out + 0.07);
        }
      }
    }
    // a hipped roof, and the dome on its drum where the map raises it
    const RH = 7.0;
    f.part('slate', worldUV(THREE, hipRoof(THREE, W2, D2, RH, 0.5), 2.2), 0, G1 + G2, 0);
    for (const x of [-W / 2 + 5, W / 2 - 5]) { f.part('stone', worldUV(THREE, new THREE.BoxGeometry(0.9, RH * 0.6 + 2, 0.9), 2.0), x, G1 + G2 + (RH * 0.6 + 2) / 2 - 0.4, -D2 / 6); }
    const dm = o.dome || { x: 0, z: 0 }, dy = G1 + G2 + RH - 1.6, R = clamp(D * 0.3, 3.5, 5.6), DH = 4.2;
    f.part('ashlar', worldUV(THREE, new THREE.CylinderGeometry(R, R, DH + 1.6, 16, 1, true), 3.0), dm.x, dy + (DH + 1.6) / 2 - 1.6, dm.z);
    f.part('ashlar', worldUV(THREE, new THREE.CylinderGeometry(R + 0.35, R + 0.35, 0.4, 16, 1), 3.0), dm.x, dy + DH, dm.z);
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2 + PI / 8, df = f.sub(dm.x, dm.z, a); df.part('glassDark', new THREE.ExtrudeGeometry(roundArch(THREE, 0.9, 1.4), { depth: 0.04, bevelEnabled: false }), 0, dy + 1.0, R * Math.cos(PI / 16) + 0.03); }
    const dome = new THREE.SphereGeometry(R + 0.2, 20, 10, 0, PI * 2, 0, PI / 2);
    f.part('slate', worldUV(THREE, dome, 2.0), dm.x, dy + DH + 0.2, dm.z);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2, rib = new THREE.TorusGeometry(R + 0.24, 0.07, 4, 12, PI / 2); rib.rotateY(a); f.part('iron', rib, dm.x, dy + DH + 0.2, dm.z); }
    f.part('ashlar', worldUV(THREE, new THREE.CylinderGeometry(1.1, 1.2, 2.0, 8), 2.0), dm.x, dy + DH + R + 1.0, dm.z);
    f.part('slate', worldUV(THREE, new THREE.ConeGeometry(1.5, 1.8, 8), 2.0), dm.x, dy + DH + R + 2.9, dm.z);
    f.ibox('iron', 0.08, 1.4, 0.08, dm.x, dy + DH + R + 4.4, dm.z);
    if (o.landmarks) o.landmarks.push(['greenhall dome', f.at(dm.x, dm.z), dy + DH + R + 5]);
  }
  // the mooring mast. Book One: "a hundred and twenty feet of riveted iron on four splayed legs in the bedrock of the quarry
  // rim": a riveted iron lattice tower, 36.5 m in all, its four legs splayed to the corners of the map's mast block (so it
  // stands on the cells that block you) and drawn in toward the head; ring girders and cross-bracing in every bay; the
  // mooring head (drum, cone, ring) on top.
  function mast(B, f, w, d, o) {
    const THREE = B.THREE, H = 33.0, base = Math.min(w, d) / 2 - 0.35, top = 0.85, K = 'ironwork';
    const at = (y, sx, sz) => { const r = base + (top - base) * (y / H); return [sx * r, sz * r]; };
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    // footings in the rock, then the four legs
    for (const [sx, sz] of corners) {
      const [ax, az] = at(0, sx, sz);
      f.part('stone', worldUV(THREE, new THREE.BoxGeometry(0.9, 0.5, 0.9), 1.4), ax, 0.25, az);
      f.ibox('iron', 0.7, 0.06, 0.7, ax, 0.53, az);
      const [bx, bz] = at(H, sx, sz);
      f.beam(K, 0.34, ax, 0.5, az, bx, H, bz);
      // rivet plates up the leg
      for (let y = 1.6; y < H - 0.5; y += 1.6) { const [rx, rz] = at(y, sx, sz); f.ibox('iron', 0.42, 0.1, 0.42, rx, y, rz); }
    }
    // bays: a ring girder at each level, an X of bracing on every face between levels
    const levels = []; for (let y = 0.5; y <= H + 0.01; ) { levels.push(y); const step = lerp(4.6, 2.6, y / H); y += step; }
    if (levels[levels.length - 1] < H - 0.5) levels.push(H);
    for (let li = 0; li < levels.length; li++) {
      const y = levels[li];
      for (let i = 0; i < 4; i++) {
        const [sx, sz] = corners[i], [tx, tz] = corners[(i + 1) % 4];
        const [ax, az] = at(y, sx, sz), [bx, bz] = at(y, tx, tz);
        f.beam(K, li === 0 ? 0.26 : 0.2, ax, y, az, bx, y, bz);
        if (li === 0) continue;
        const y0 = levels[li - 1], [cx0, cz0] = at(y0, sx, sz), [dx0, dz0] = at(y0, tx, tz);
        f.beam(K, 0.11, cx0, y0, cz0, bx, y, bz);
        f.beam(K, 0.11, dx0, y0, dz0, ax, y, az);
      }
    }
    // the mooring head: a platform, a drum, a cone, the mooring ring and its arm
    f.ibox(K, 2 * top + 0.9, 0.22, 2 * top + 0.9, 0, H + 0.11, 0);
    f.part(K, new THREE.CylinderGeometry(1.0, 1.15, 1.6, 14), 0, H + 1.02, 0);
    for (const yy of [0.3, 0.8, 1.3]) f.part('iron', new THREE.TorusGeometry(1.08, 0.04, 4, 20).rotateX(PI / 2), 0, H + 0.22 + yy, 0);
    f.part(K, new THREE.ConeGeometry(1.05, 1.5, 14), 0, H + 2.57, 0);
    f.part(K, new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), 0, H + 3.7, 0);
    f.part('iron', new THREE.TorusGeometry(0.42, 0.06, 6, 18), 0, H + 3.3, 0, PI / 4);
    if (o.landmarks) o.landmarks.push(['mooring mast', f.at(0, 0), H + 3.5]);
  }
  function wellHouse(B, f, o) {   // the well-house in the square: stone, layers of decrees, the dead Queen's glass seal (canon)
    const THREE = B.THREE, s = (o && o.s) || 2.6, h = 2.3;
    f.part('stone', worldUV(THREE, new THREE.BoxGeometry(s, 0.9, s), 1.6), 0, 0.45, 0);
    f.part('glassDark', new THREE.BoxGeometry(s - 0.9, 0.02, s - 0.9), 0, 0.91, 0);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) f.part('stone', worldUV(THREE, new THREE.BoxGeometry(0.55, h, 0.55), 1.6), a * (s / 2 - 0.27), h / 2, b * (s / 2 - 0.27));
    f.part('stone', worldUV(THREE, new THREE.BoxGeometry(s + 0.1, 0.3, s + 0.1), 1.6), 0, h + 0.15, 0);
    const cap = new THREE.ConeGeometry(s * 0.92, 1.5, 4, 1); cap.rotateY(PI / 4);
    f.part('slate', worldUV(THREE, cap, 1.6), 0, h + 0.3 + 0.75, 0);
    f.ibox('timber', s - 0.6, 0.16, 0.16, 0, 1.75, 0);
    f.ibox('iron', 0.04, 0.8, 0.04, 0.2, 1.3, 0);
    f.part('boards', worldUV(THREE, new THREE.CylinderGeometry(0.2, 0.16, 0.3, 10), 0.8), 0.2, 1.05, 0);
    // decrees pasted in layers on the piers and the parapet; the seal on the front parapet
    for (let k = 0; k < 4; k++) {
      const sf = f.sub(0, 0, k * PI / 2);
      sf.part('notices', new THREE.PlaneGeometry(s - 1.2, 0.62), 0, 0.48, s / 2 + 0.012);
      for (const x of [-1, 1]) sf.part('notices', new THREE.PlaneGeometry(0.5, 1.1), x * (s / 2 - 0.27), 1.6, s / 2 + 0.012);
    }
    f.part('seal', new THREE.CylinderGeometry(0.19, 0.19, 0.05, 20).rotateX(PI / 2), 0.62, 0.55, s / 2 + 0.03);
    f.ibox('ashlarTrim', 0.46, 0.46, 0.03, 0.62, 0.55, s / 2 + 0.005);
  }
  function stall(B, f, kind, r) {   // a market table under an awning (at the map's market tables)
    const THREE = B.THREE, W = 2.6, D = 1.6;
    for (const [a, b, h] of [[-1, 1, 2.1], [1, 1, 2.1], [-1, -1, 2.55], [1, -1, 2.55]]) f.ibox('timber', 0.11, h, 0.11, a * W / 2, h / 2, b * D / 2);
    f.part('boards', worldUV(THREE, new THREE.BoxGeometry(W, 0.08, D * 0.62), 1.2), 0, 0.9, D * 0.12);
    f.ibox('timber', W - 0.2, 0.84, 0.05, 0, 0.45, D * 0.42);
    const roof = new THREE.PlaneGeometry(W + 0.3, D + 0.4, 8, 4), p = roof.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / (W + 0.3) + 0.5) * PI * 4) * 0.04);
    roof.computeVertexNormals(); roof.rotateX(-PI / 2 + 0.25);
    const band = { canvasCream: 2, canvasStripe: 1, canvasGreen: 0 }[kind] || 0;   // CanvasTexture flipY: band 0 is the bottom third
    const inBand = (g) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, (band + uv.getY(i) * 0.98 + 0.01) / 3); return g; };
    f.part('awning', inBand(roof), 0, 2.33, 0.0);
    f.part('awning', inBand(new THREE.PlaneGeometry(W + 0.3, 0.3)), 0, 1.98, D / 2 + 0.28);
    // the stallholder's stock behind the stall: three crates or three casks
    if (B.stallStock) { const back = f.sub(0, -D / 2 - 0.05, PI); propGroup(B, back, (r() - .5) * 0.3, 0, r() < 0.6 ? 'crate' : 'cask', 3, r); }
    // goods: fleeces and bales (the Carders' Quarter), jars, apples
    for (let i = 0; i < 6; i++) { const x = -W / 2 + 0.35 + i * (W - 0.7) / 5, g = r(); if (g < 0.4) f.ibox('goods', 0.42, 0.22, 0.32, x, 1.05, 0.1 + r() * 0.2, r(), 0, 0, 0xd9cdb0); else if (g < 0.7) for (let j = 0; j < 3; j++) f.ibox('goods', 0.1, 0.13, 0.1, x - 0.12 + j * 0.12, 1.0, 0.25, 0, 0, 0, 0xb87a24); else f.ibox('goods', 0.36, 0.14, 0.26, x, 1.01, 0.2, r(), 0, 0, 0x7a2a1a); }
  }
  function cask(B, x, z, ry, y, how, s) {   // a cooper's cask: staves on a bulge, three iron hoops ('side': lying; 'open': no head)
    const THREE = B.THREE; s = s || 1;
    const open = how === 'open', side = how === 'side';
    const prof = (open ? [[0.24, 0.86], [0.27, 0.89]] : [[0, 0.89], [0.27, 0.89]]).concat([[0.31, 0.7], [0.33, 0.45], [0.31, 0.2], [0.27, 0.01], [0, 0.01]]).reverse().map(([r, yy]) => new THREE.Vector2(r * s, yy * s));
    const g = new THREE.LatheGeometry(prof, 14); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 0.9);
    const f = B.frame(x, z, ry, y || 0), oy = side ? 0.33 * s : 0, oz = side ? -0.445 * s : 0, rx = side ? PI / 2 : 0;
    const P = (key, geo, yy) => { if (side) f.part(key, geo, 0, oy, oz + yy, 0, rx); else f.part(key, geo, 0, yy, 0); };
    P('boards', g, 0);
    for (const [yy, r] of [[0.12, 0.295], [0.45, 0.335], [0.78, 0.295]]) P('iron', new THREE.TorusGeometry(r * s, 0.014, 4, 18).rotateX(PI / 2).translate(0, yy * s, 0), 0);
    if (open) P('puddle', new THREE.CircleGeometry(0.25 * s, 14).rotateX(-PI / 2).translate(0, 0.8 * s, 0), 0);
  }
  function cart(B, x, z, ry, y) {   // a two-wheeled handcart, shafts down
    const THREE = B.THREE, f0 = B.frame(x, z, ry, y || 0), f = f0.sub(0, -0.45, 0);
    f.part('boards', worldUV(THREE, new THREE.BoxGeometry(1.3, 0.08, 2.0), 1.2), 0, 0.82, 0, 0, -0.12);
    for (const k of [-1, 1]) { f.ibox('timber', 0.06, 0.35, 2.0, k * 0.65, 0.98, 0, 0, -0.12); f.ibox('timber', 0.08, 0.08, 1.4, k * 0.45, 0.6, 1.5, 0, 0.32); }
    f.ibox('timber', 1.3, 0.35, 0.06, 0, 0.98, -1.0, 0, -0.12);
    for (const k of [-1, 1]) { f.part('timber', new THREE.TorusGeometry(0.48, 0.05, 6, 16).rotateY(PI / 2), k * 0.78, 0.5, -0.2); f.ibox('timber', 0.05, 0.92, 0.06, k * 0.78, 0.5, -0.2); f.ibox('timber', 0.05, 0.06, 0.92, k * 0.78, 0.5, -0.2); }
    f.ibox('iron', 1.6, 0.05, 0.05, 0, 0.5, -0.2);
  }

  // ======================================================================== the oak: tapered branches, leaf cards (the map's "iron-bark oaks")
  const OAKS = {};
  // an old iron-oak for open ground (the square): a short, massive trunk on root flares, five or six great limbs leaving
  // it low and reaching out nearly level, the crown wider than it is tall. Nothing below 3.4 m beyond the root plate,
  // so the player walks under it; nothing past ~10 m from the trunk.
  function heroTemplate(THREE, seed) {
    const key = 'hero' + seed; if (OAKS[key]) return OAKS[key];
    const r = mulberry(seed * 4271 + 99), geos = [], spots = [];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const grow = (p, dir, len, rad, depth, droop) => {
      if (depth === 0) { spots.push(p.clone().addScaledVector(dir, len * 0.5), p.clone().addScaledVector(dir, len)); return; }   // twigs: leaves only
      const pts = [p.clone()]; let q = p.clone(); const d = dir.clone();
      for (let i = 0; i < 4; i++) {
        d.add(V((r() - .5) * .55, (r() - .5) * .3 - droop, (r() - .5) * .55)).normalize();
        q = q.clone().addScaledVector(d, len / 4);
        if (q.y < 3.6 && Math.hypot(q.x, q.z) > 1.4) { q.y = 3.6; d.y = Math.abs(d.y) + 0.05; d.normalize(); }
        pts.push(q);
      }
      geos.push(taperedTube(THREE, pts, rad, rad * 0.66, depth >= 3 ? 9 : depth === 2 ? 6 : 4));
      if (depth <= 3) for (let i = 2; i < pts.length; i++) spots.push(pts[i].clone());
      // side branches leave along the limb as well as at its end (not a candelabra)
      const kids = depth >= 3 ? 4 : 2 + (r() < .6 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const at = k === kids - 1 ? 4 : 2 + (k % 2), a = Math.atan2(d.z, d.x) + (k % 2 ? 1 : -1) * (0.5 + r() * 0.8);
        const nd = V(Math.cos(a), 0.35 + r() * 0.6, Math.sin(a)).normalize().lerp(d, 0.3).normalize();
        grow(pts[at], nd, len * (at === 4 ? 0.62 + r() * .12 : 0.5 + r() * .12), rad * (at === 4 ? 0.62 : 0.5), depth - 1, droop * 0.7);
      }
    };
    // the bole: leaning a little, swelling at the foot
    const top = V((r() - .5) * 0.5, 3.9, (r() - .5) * 0.5);
    geos.push(taperedTube(THREE, [V(0, -0.4, 0), V(0.05, 1.2, 0.02), V(top.x * 0.6, 2.6, top.z * 0.6), top], 1.05, 0.78, 12));
    // root flares into the cobbles
    for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2 + r() * .4, L = 1.25 + r() * 0.3; geos.push(taperedTube(THREE, [V(0, 1.4, 0), V(Math.cos(a) * 0.75, 0.45, Math.sin(a) * 0.75), V(Math.cos(a) * L, -0.08, Math.sin(a) * L)], 0.42, 0.1, 6)); }
    // the great limbs
    const nl = 5 + (r() < .5 ? 1 : 0), a0 = r() * PI * 2;
    for (let k = 0; k < nl; k++) {
      const a = a0 + k / nl * PI * 2 + (r() - .5) * 0.5, up = k === 0 ? 2.6 : 0.6 + r() * 0.6;
      grow(top.clone().add(V(Math.cos(a) * 0.3, -0.3 + r() * 0.5, Math.sin(a) * 0.3)), V(Math.cos(a), up, Math.sin(a)).normalize(), k === 0 ? 6 : 5.6 + r() * 1.2, k === 0 ? 0.55 : 0.48, 4, 0.05);
    }
    const mg = addons().mergeGeometries; let geo = null;
    try { geo = mg(geos, false); } catch (e) { warnOnce('oak merge', e); geo = geos[0]; }
    geo.computeBoundingBox();
    OAKS[key] = { geo, spots, h: geo.boundingBox.max.y, hero: true };
    return OAKS[key];
  }
  function oakTemplate(THREE, seed) {
    if (OAKS[seed]) return OAKS[seed];
    const r = mulberry(seed * 7919 + 13), geos = [], spots = [];
    const grow = (p, dir, len, rad, depth) => {
      const pts = [p.clone()]; let q = p.clone(); const d = dir.clone();
      for (let i = 0; i < 4; i++) { d.add(new THREE.Vector3((r() - .5) * .35, (r() - .35) * .2, (r() - .5) * .35)).normalize(); q = q.clone().addScaledVector(d, len / 4); pts.push(q); }
      geos.push(taperedTube(THREE, pts, rad, rad * 0.62, depth > 2 ? 8 : 5));
      if (depth <= 2) for (let i = 2; i < pts.length; i++) spots.push(pts[i].clone());
      if (depth === 0 || rad < 0.07) { spots.push(q.clone()); return; }
      const kids = depth > 2 ? 3 : 2 + (r() < .5 ? 1 : 0);
      for (let k = 0; k < kids; k++) {
        const a = (k / kids) * PI * 2 + r(), up = depth > 2 ? 0.45 : 0.2;
        const nd = new THREE.Vector3(Math.cos(a), up + r() * .3, Math.sin(a)).normalize().lerp(d, 0.3).normalize();
        grow(q, nd, len * (0.62 + r() * .15), rad * 0.6, depth - 1);
        if (depth <= 2) spots.push(q.clone());
      }
    };
    grow(new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0.05, 1, 0.02), 5.2, 0.55, 5);
    for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2 + r() * .4; geos.push(taperedTube(THREE, [new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(Math.cos(a) * 0.6, 0.2, Math.sin(a) * 0.6), new THREE.Vector3(Math.cos(a) * 1.05, -0.1, Math.sin(a) * 1.05)], 0.28, 0.08, 6)); }
    const mg = addons().mergeGeometries; let geo = null;
    try { geo = mg(geos, false); } catch (e) { warnOnce('oak merge', e); geo = geos[0]; }
    geo.computeBoundingBox();
    OAKS[seed] = { geo, spots, h: geo.boundingBox.max.y };
    return OAKS[seed];
  }

  // ======================================================================== the far ring: the Reach around the town, and the game's own landmarks
  // the far ranges' height share: 0.4 keeps the Grey Teeth low on the horizon from the square (far mountains,
  // not a wall; 0.85 had them at about 35 degrees, filling the sky)
  const FAR_PEAK = 0.4;
  function farRing(B, group, map, o) {
    const THREE = B.THREE, M = B.M, C = 1 / UPM(), r = mulberry(4190);
    const X1 = map.w * C, Z1 = map.h * C, cx = X1 / 2, cz = Z1 / 2;
    const lms = (typeof LANDMARKS !== 'undefined' && (LANDMARKS[map.id] || null)) || [];
    // how far CORE's camera sees (its rule: max(140, the map's diagonal x 1.5 + 80) units), less the walk across town
    const farU = (o.far > 0 ? o.far : Math.max(140, Math.hypot(map.w, map.h) * 1.5 + 80)), half = Math.hypot(map.w, map.h) / 2 * C;
    const Rmax = Math.max(220, farU / UPM() * 0.92 - half * 0.55);
    const size = Rmax * 2, seg = o.T.seg, g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-PI / 2);
    const p = g.attributes.position, cols = [], c = new THREE.Color();
    const noise = (x, z) => Math.sin(x * .011) * Math.cos(z * .013) + .5 * Math.sin(x * .027 + 1.3) * Math.sin(z * .023 + .7) + .25 * Math.sin(x * .061 + z * .047);
    const ridged = (x, z) => 1 - Math.abs(Math.sin(x * 0.019 + Math.sin(z * 0.011) * 2) * Math.cos(z * 0.017 + x * 0.004));
    const wrap = (a) => { while (a > PI) a -= PI * 2; while (a < -PI) a += PI * 2; return a; };
    // what the LANDMARKS list says, in metres: the Grey Teeth far north with snow, the chalk shoulder, the downs, the quarry head
    const ridges = lms.map((lm) => ({ a: lm.a, aw: lm.aw, peak: Rmax * lm.h * (lm.far > 0.7 ? FAR_PEAK : 0.4), r0: Rmax * (lm.far > 0.7 ? 0.6 : 0.28 + lm.far * 0.4), r1: Rmax * (lm.far > 0.7 ? 0.93 : 0.5 + lm.far * 0.45), p: lm.p || 1.4, ridge: lm.ridge || 0, seed: lm.seed || 0, snow: !!lm.cap, col: lm.c || [40, 42, 50], chalk: lm.far < 0.2 && lm.h > 0.2 }));
    const H = new Float32Array(p.count), kindArr = new Uint8Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx, z = p.getZ(i) + cz;
      const dx = Math.max(-x, 0, x - X1), dz = Math.max(-z, 0, z - Z1), dd = Math.hypot(dx, dz);
      // under CORE's floor (which runs on past the map's edge) near the town, rising into the downs beyond
      let h = dd <= 0 ? -3 : -0.6 + sstep(dd, 14, Rmax * 0.62) * (18 + 14 * noise(x, z));
      const ang = Math.atan2(z - cz, x - cx), rr = Math.hypot(x - cx, z - cz);
      let kind = 0;
      for (const R of ridges) {
        const t = Math.abs(wrap(ang - R.a)) / R.aw; if (t >= 1) continue;
        let prof = Math.pow(1 - t, R.p); if (R.ridge) prof *= 1 + R.ridge * Math.sin(t * 11 + R.seed * 2.7) * 0.5;
        const k = sstep(rr, R.r0, (R.r0 + R.r1) / 2) * (1 - sstep(rr, R.r1, R.r1 + Rmax * 0.15));
        let add = R.peak * prof * k;
        if (R.snow) add *= 0.45 + 0.85 * Math.pow(ridged(x, z), 1.5);
        if (add > h * 0.5) { h = Math.max(h, add + h * 0.4); if (add > 12) kind = R.snow ? 2 : R.chalk ? 3 : 4; }
      }
      H[i] = h; kindArr[i] = kind; p.setY(i, h);
    }
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx, z = p.getZ(i) + cz, h = H[i], k = kindArr[i];
      // fields on the downs: patches of stubble, pasture and plough; darker woods on the crests
      const fx = Math.floor((x * 0.8 + z * 0.6) / 140), fz = Math.floor((-x * 0.6 + z * 0.8) / 110), fh = hash2(fx, fz);
      if (fh < 0.3) c.setRGB(0.20, 0.22, 0.10); else if (fh < 0.55) c.setRGB(0.27, 0.24, 0.13); else if (fh < 0.7) c.setRGB(0.19, 0.15, 0.10); else c.setRGB(0.15, 0.19, 0.09);
      if (h > 22) c.lerp(new THREE.Color(0.10, 0.12, 0.07), sstep(h, 22, 45));
      const snowLine = Rmax * 0.3 * FAR_PEAK * 0.62;   // snow on the upper part of the far peaks only
      if (k === 2) { c.setRGB(0.21, 0.22, 0.25); if (h > snowLine + snowLine * 0.15 * Math.sin(x * 0.02)) c.setRGB(0.70, 0.72, 0.76); }
      else if (k === 3) { c.lerp(new THREE.Color(0.62, 0.60, 0.54), sstep(h, 14, 40)); }
      else if (k === 4) { c.lerp(new THREE.Color(0.26, 0.25, 0.27), sstep(h, 20, 50) * 0.7); }
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
    g.translate(cx, 0, cz);
    const hills = new THREE.Mesh(g, M.hills); hills.name = 'kit:far:hills'; hills.receiveShadow = false; hills.castShadow = false;
    group.add(hills);
    // woods: crowns on the hillsides and crests, autumn and dark
    const crown = new THREE.IcosahedronGeometry(1, 1), N = o.T.forest, forest = new THREE.InstancedMesh(crown, M.forest, N);
    const ob = new THREE.Object3D(), col = new THREE.Color(), hAt = (x, z) => {
      const u = (x - cx + size / 2) / size * seg, v = (z - cz + size / 2) / size * seg, iu = Math.floor(u), iv = Math.floor(v);
      if (iu < 0 || iv < 0 || iu >= seg || iv >= seg) return null;
      const fu = u - iu, fv = v - iv, a = H[iv * (seg + 1) + iu], b = H[iv * (seg + 1) + iu + 1], c2 = H[(iv + 1) * (seg + 1) + iu], d2 = H[(iv + 1) * (seg + 1) + iu + 1];
      return { h: lerp(lerp(a, b, fu), lerp(c2, d2, fu), fv), k: kindArr[iv * (seg + 1) + iu] };
    };
    let n = 0, wx = 0, wz = 0, left = 0;
    for (let i = 0; i < N * 8 && n < N; i++) {
      if (left <= 0) { wx = cx + (r() - .5) * size * 0.9; wz = cz + (r() - .5) * size * 0.9; left = 8 + (r() * 22 | 0); }
      left--;
      const ra2 = Math.sqrt(r()) * 70, aa = r() * PI * 2, x = wx + Math.cos(aa) * ra2, z = wz + Math.sin(aa) * ra2;
      const dx = Math.max(-x, 0, x - X1), dz = Math.max(-z, 0, z - Z1), dd = Math.hypot(dx, dz);
      if (dd < 40 || dd > Rmax * 0.85) continue;
      const q = hAt(x, z); if (!q || q.k === 2 || q.k === 3) continue;
      const fx = Math.floor((x * 0.8 + z * 0.6) / 140), fz = Math.floor((-x * 0.6 + z * 0.8) / 110);
      if (q.h < 22 && hash2(fx + 7, fz - 3) > 0.45 && dd > 60) continue;   // woods on crests and in shaws, fields below
      const s = 2.6 + r() * 3; ob.position.set(x, q.h + s * 0.9, z); ob.scale.set(s, s * 1.25, s); ob.rotation.y = r() * 6; ob.updateMatrix();
      forest.setMatrixAt(n, ob.matrix); col.setHSL(r() < .45 ? 0.07 + r() * .04 : 0.18 + r() * .08, 0.35, 0.07 + r() * .05); forest.setColorAt(n, col); n++;
    }
    forest.count = n; forest.instanceMatrix.needsUpdate = true; if (forest.instanceColor) forest.instanceColor.needsUpdate = true;
    forest.computeBoundingSphere(); forest.name = 'kit:far:forest'; forest.castShadow = false; forest.userData.max = n;
    group.add(forest);
    // Greenroot's spire on the downs (js/sky.js: the Oakhaven panorama stamps its chapel at bearing -0.75)
    if (map.id === 'oakhaven') {
      const a = -0.75, R0 = Rmax * 0.78, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0, q = hAt(x, z), y = q ? q.h : 30;
      const ff = B.frame(x, z, a + PI / 2, y - 1);
      const K = (t) => { B.tint = t; return 'farBld'; }, CH = [0.5, 0.5, 0.49], SL = [0.27, 0.29, 0.31], PLs = [0.66, 0.62, 0.55];
      ff.part(K(CH), worldUV(THREE, new THREE.BoxGeometry(9, 9, 18), 4), 0, 4.5, 0);
      ff.part(K(SL), worldUV(THREE, gableRoof(THREE, 18.5, 9.2, 5, 0.3), 4), 0, 9, 0);
      ff.part(K(CH), worldUV(THREE, new THREE.BoxGeometry(4.5, 16, 4.5), 4), 0, 8, 9);
      ff.part(K(SL), worldUV(THREE, new THREE.ConeGeometry(3.4, 16, 4).rotateY(PI / 4), 4), 0, 24, 9);
      for (let i = 0; i < 3; i++) { const bx = (r() - .5) * 70, bz = (r() - .5) * 50; ff.part(K(PLs), worldUV(THREE, new THREE.BoxGeometry(8, 5, 6), 4), bx, 2.5, bz + 30); ff.part(K(SL), worldUV(THREE, gableRoof(THREE, 8.2, 6.2, 3, 0.3), 4), bx, 5, bz + 30); }
      B.tint = null;
    }
  }

  // ======================================================================== dressMap
  function dressMap(map, ctx) {
    ctx = ctx || {};
    const THREE = T3(ctx);
    if (!THREE || !map) return { group: THREE ? new THREE.Group() : null, hiddenCells: new Set(), replaced: new Set(), lights: [], stats: {} };
    const group = new THREE.Group(); group.name = 'R11KIT:' + map.id;
    const hidden = new Set(), replaced = new Set(), lights = [];
    const stats = { buildings: 0, lots: 0, oaks: 0, lamps: 0, props: 0, draws: 0 };
    const out = { group, hiddenCells: hidden, replaced, lights, stats };
    if (map.id !== 'oakhaven') { S.last = out; return out; }   // other maps: CORE's plain realistic boxes
    try { dressOakhaven(THREE, map, ctx, out); } catch (e) { warnOnce('dressMap', e); }
    S.last = out;
    return out;
  }

  function dressOakhaven(THREE, map, ctx, out) {
    const tierName = tierOf(ctx.tier || (window.R11 && window.R11.tier && window.R11.tier()) || 'high'), T = TIERS[tierName];
    const M = mats(THREE, ctx), B = Builder(THREE, M), C = 1 / UPM(), W = map.w;
    const hidden = out.hiddenCells, replaced = out.replaced;
    M.chapelTrim = M.chapel; M.ashlarTrim = M.ashlar; M.shutter = M.boards;
    const metres = new THREE.Group(); metres.name = 'R11KIT:metres'; metres.scale.setScalar(UPM());
    out.group.add(metres);
    const gAt = (x, y) => { try { return (map.groundAt ? map.groundAt(x, y) : 0) * WALLM(); } catch (e) { return 0; } };
    const landmarks = [], chimneys = [], lampsAt = [], chimneyAt = [], lotsAll = [];
    B.ivy = []; B.doorLamps = lampsAt; B.drifts = []; B.stallStock = true;
    const smokeAt = [];
    const blds = findBuildings(map);
    const solidEnt = (e) => e && e.kind === 'deco' && !e.hidden && !e.dead;
    // ---- buildings
    for (const b of blds) {
      if (!b.rect) continue;
      const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
      let kind = kindOf(b);
      const isMast = !b.doors.length && b.tex === 't_wood' && w <= 3 && h <= 3 && b.cells.some((i) => map.cells[i].top >= 2.5);
      if (!b.doors.length && !isMast) continue;   // walls, piers and the like: CORE's boxes
      if (b.doors.some((d) => openable(d.cell))) continue;   // a door that opens into the block: leave it to CORE
      const X0 = b.x0 * C, X1 = (b.x1 + 1) * C, Z0 = b.y0 * C, Z1 = (b.y1 + 1) * C, cx = (X0 + X1) / 2, cz = (Z0 + Z1) / 2;
      const base = gAt(b.x0 + w / 2, b.y0 + h / 2);
      const rnd = mulberry(b.x0 * 131 + b.y0 * 7 + 3);
      for (const i of b.cells) hidden.add(i);
      out.stats.buildings++;
      if (isMast) { const f = B.frame(cx, cz, 0, base); mast(B, f, X1 - X0, Z1 - Z0, { landmarks }); continue; }
      const main = b.doors.find((d) => d.cell.portal) || b.doors[0];
      const face = doorSide(map, b, main), ry = RY[face];
      const f = B.frame(cx, cz, ry, base);
      const Wf = (face === 'N' || face === 'S') ? X1 - X0 : Z1 - Z0, Df = (face === 'N' || face === 'S') ? Z1 - Z0 : X1 - X0;
      // every door, as (side, along-coordinate) in the building's own frame
      const sideOf = { S: { S: 'f', N: 'b', E: 'r', W: 'l' }, N: { N: 'f', S: 'b', W: 'r', E: 'l' }, E: { E: 'f', W: 'b', N: 'r', S: 'l' }, W: { W: 'f', E: 'b', S: 'r', N: 'l' } }[face];
      const doors = b.doors.map((d) => {
        const s = doorSide(map, b, d), side = sideOf[s];
        const mx = (d.x + 0.5) * C, mz = (d.y + 0.5) * C, lx = (mx - cx) * Math.cos(ry) - (mz - cz) * Math.sin(ry), lz = (mx - cx) * Math.sin(ry) + (mz - cz) * Math.cos(ry);
        const pos = side === 'f' ? lx : side === 'b' ? -lx : side === 'r' ? -lz : lz;
        return { side, pos, cell: d.cell, x: d.x, y: d.y };
      });
      // where the map raises a tower or a dome inside the block
      let tallest = null; for (const i of b.cells) { const c = map.cells[i]; if (c.top != null && c.top >= 2 && (!tallest || c.top >= map.cells[tallest[0]].top)) tallest = [i]; }
      const towerCells = b.cells.filter((i) => map.cells[i].top != null && map.cells[i].top >= 2);
      let feat = null;
      if (towerCells.length) {
        let sx = 0, sz = 0; for (const i of towerCells) { sx += (i % W + 0.5) * C; sz += (((i / W) | 0) + 0.5) * C; }
        sx /= towerCells.length; sz /= towerCells.length;
        feat = { x: (sx - cx) * Math.cos(ry) - (sz - cz) * Math.sin(ry), z: (sx - cx) * Math.sin(ry) + (sz - cz) * Math.cos(ry) };
      }
      const o = { rnd, doors, chimneys, landmarks, grime: true, lit: 0.3, style: kind === 'shed' ? 'shed' : kind === 'inn' ? 'inn' : 'house' };
      B.cat = 'bldg';
      if (kind === 'chapel') { o.tower = feat; o.towerW = Math.sqrt(towerCells.length || 4) * C; const res = chapel(B, f, Wf, Df, o); out.chapel = res; }
      else if (kind === 'greenhall') { o.dome = feat; greenhall(B, f, Wf, Df, o); }
      else {
        if (kind === 'inn') {
          // the Boar & Dulcimer: the door's lot is a wide three-storey front; the board hangs by the door
          const d0 = doors.find((d) => d.side === 'f');
          if (d0) {
            const wide = Math.min(13.5, Wf * 0.45), l0 = clamp(d0.pos - wide / 2 + 1.5, -Wf / 2 + 3, Math.max(-Wf / 2 + 3, Wf / 2 - wide - 3)), left = l0 - (-Wf / 2), right = Wf / 2 - (l0 + wide);
            const split = (len) => { if (len < 0.5) return []; const n = Math.max(1, Math.round(len / 7.5)); return Array(n).fill(len / n); };
            o.lotWidths = [...split(left), wide, ...split(right)];
            o.extra = null;
          }
          o.lit = 0.6;
        }
        const lots = terrace(B, f, Wf, Df, o);
        out.stats.lots += lots.length;
        lotsAll.push({ f, b, lots, cx, cz, ry, base });
        // dressing on the street faces of the lots: the inn's board, lanterns by the door, casks and crates
        for (const L of lots) {
          for (const [s, a] of [['f', 0], ['b', PI], ['r', PI / 2], ['l', -PI / 2]]) {
            if (!L.doors[s].length) continue;
            const sf = L.lf.sub(0, 0, a), outd = (s === 'f' || s === 'b') ? L.d / 2 : L.w / 2, along = (s === 'f' || s === 'b') ? L.w : L.d;
            for (const dx of L.doors[s]) {
              B.cat = 'bldg';
              if (kind === 'inn') {
                innSign(B, sf, dx + 1.9, outd);
                for (const k of [-1, 1]) wallLantern(B, sf, dx + k * 1.05, 2.45, outd, lampsAt, 3);
              }
              B.cat = 'prop';
              const p = T.props, label = (L.doors[s].length && b.doors[0].cell.label) || '';
              // odd groups against the wall, each for someone: the inn's casks of small beer (canon) and its crates of
              // empties, the cooper's casks, a trade's crates, the wool-factor's bales, a rain butt at a house corner
              const fits = (x, half) => Math.abs(x) + half < along / 2 - 0.2 && !L.doors[s].some((d2) => Math.abs(d2 - x) < half + 1.0);
              const grp = (x, what, n) => { const half = n === 5 ? 1.3 : 0.9; if (!fits(x, half)) return false; out.stats.props += propGroup(B, sf, x, outd, what, n, rnd); return true; };
              if (kind === 'inn') { grp(dx - 3.0, 'cask', 5) || grp(dx - 2.6, 'cask', 3); if (rnd() < p + 0.5) grp(dx + 3.3, 'crate', 3); }
              else if (/cooper/i.test(label)) { grp(dx - 2.8, 'cask', 5); if (rnd() < p + 0.3) grp(dx + 2.8, 'cask', 3); }
              else if (/wool/i.test(label)) grp(dx + (rnd() < .5 ? -1 : 1) * 2.6, 'bale', 3);
              else if (/granary|chandler|mill|tannery|dyer|orchard|surgery|baker/i.test(label) && rnd() < 0.85) grp(dx + (rnd() < .5 ? -1 : 1) * 2.7, 'crate', 3);
              else if (rnd() < 0.3 * p + 0.1) { const k = rnd() < 0.5 ? -1 : 1, x = k * (along / 2 - 0.55); if (fits(x, 0.4)) out.stats.props += propGroup(B, sf, x, outd, 'butt', 1, rnd); }
            }
          }
        }
      }
    }
    // ---- the game's own decals on the cells KIT hides (Synod posters and the like): redrawn on the kit's wall at that face,
    // a wall's height (the map's) from the ground, as the raycaster shows them. The bell-plinth (49,11) and the bridge
    // parapets stay CORE's, with their decals.
    out.decals = 0;
    if (map.decals && typeof Engine !== 'undefined' && Engine.textures) {
      for (const i of hidden) {
        const dn = map.decals[i], data = dn && Engine.textures[dn]; if (!data || data.length !== 4096) continue;
        const key = 'decal:' + dn;
        if (!M[key]) {
          const src = new Uint8Array(data.buffer, data.byteOffset, data.byteLength), px = new Uint8Array(64 * 64 * 4);
          for (let yy = 0; yy < 64; yy++) px.set(src.subarray((63 - yy) * 256, (64 - yy) * 256), yy * 256);   // row 0 is the top
          const t = new THREE.DataTexture(px, 64, 64, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
          M[key] = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        }
        const x = i % W, y = (i / W) | 0, hw = WALLM();
        for (const [dx, dy, ry] of [[1, 0, PI / 2], [-1, 0, -PI / 2], [0, 1, 0], [0, -1, PI]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= map.h || map.cells[ny * W + nx]) continue;
          const px2 = (x + 0.5 + dx * 0.5) * C + dx * 0.07, pz2 = (y + 0.5 + dy * 0.5) * C + dy * 0.07;
          B.cat = 'bldg'; B.put(key, new THREE.PlaneGeometry(C, hw), px2, gAt(x + 0.5, y + 0.5) + hw / 2, pz2, ry); out.decals++;
        }
      }
    }
    // ---- the well-house in the square (Book One; church55: Kaelen "at the corner of the well-house", rite43: a woman by it)
    if (map.cells[22 * W + 27] === null && map.cells[22 * W + 28] === null) {
      // its south-west corner a step from where church55 stands Kaelen (27.3, 22.6) "with his right hand flat on the stone"
      const hs = 1.3, kx = 27.3 * C + 0.35, kz = 22.6 * C - 0.35, wx = kx + hs, wz = kz - hs;
      B.cat = 'open';
      wellHouse(B, B.frame(wx, wz, 0, gAt(wx / C, wz / C)), { s: hs * 2 });
      out.wellHouse = [wx / C, wz / C, hs / C];
    }
    // ---- the map's own decos that get a body
    const ents = map.entities || [];
    const oaks = [];
    for (const e of ents) {
      if (!(solidEnt(e) || (e && e.kind === 'deco' && e.sprite === 'chimney'))) continue;
      const x = e.x * C, z = e.y * C, y = gAt(e.x, e.y), rr = mulberry(((e.x * 977) | 0) ^ ((e.y * 541) | 0));
      if (/(^|_)oak(_|$)/.test(e.sprite)) {
        // room to spread: an oak in open ground (the square) grows old and wide; one between houses stays as it was
        let clear = 99; const ex = Math.floor(e.x), ey = Math.floor(e.y);
        for (let yy = ey - 4; yy <= ey + 4; yy++) for (let xx = ex - 4; xx <= ex + 4; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= map.h || !isTall(map.cells[yy * W + xx])) continue; const dx = Math.max(xx - e.x, 0, e.x - xx - 1), dy = Math.max(yy - e.y, 0, e.y - yy - 1); clear = Math.min(clear, Math.hypot(dx, dy) * C); }
        const hero = clear >= 9 && e.sprite === 'oak' && !map._greening;   // the plain iron-oaks in open ground: the square's two
        oaks.push({ e, x, z, y, s: (e.scale || 1.8), green: /green/.test(e.sprite) || !!map._greening, copper: /copper/.test(e.sprite), hero, clear, seed: hero ? 1 + (((e.x * 5 + e.y * 3) | 0) % 2) : 1 + (((e.x * 13 + e.y * 7) | 0) % 3), rot: rr() * PI * 2 });
        replaced.add(e); continue;
      }
      if (/^p_barrel/.test(e.sprite)) { B.cat = 'prop'; cask(B, x, z, rr() * 6, y, e.sprite === 'p_barrel_side' ? 'side' : e.sprite === 'p_barrel_open' ? 'open' : 'up', (e.scale || 0.5) / 0.5); replaced.add(e); out.stats.props++; continue; }
      if (e.sprite === 'p_crate') { B.cat = 'prop'; crateAt(B, x, z, rr() * 6, y); replaced.add(e); out.stats.props++; continue; }
      if (e.sprite === 'p_cart') { B.cat = 'prop'; cart(B, x, z, rr() * 6, y); replaced.add(e); out.stats.props++; continue; }
      if (e.sprite === 'chimney' && hidden.has(Math.floor(e.y) * W + Math.floor(e.x))) { replaced.add(e); chimneyAt.push(e); continue; }
      if (e.sprite === 'lamp') { B.cat = 'prop'; lampPost(B, x, z, y, rr() * PI * 2, lampsAt, ents.length); replaced.add(e); out.stats.lamps++; continue; }
      if (e.sprite === 'table' && map.outdoor) { B.cat = 'prop'; stall(B, B.frame(x, z, PI + (rr() - .5) * 0.3, y), ['canvasCream', 'canvasStripe', 'canvasGreen'][(rr() * 3) | 0], rr); replaced.add(e); out.stats.props++; continue; }
      if (e.sprite === 'crates' && !e.use) { B.cat = 'prop'; crateAt(B, x - 0.4, z - 0.2, rr() * 6, y); crateAt(B, x + 0.45, z + 0.25, rr() * 6, y); crateAt(B, x + 0.05, z, rr() * 6, y + 0.74); cask(B, x - 0.7, z + 0.75, 0, y, 'up'); replaced.add(e); out.stats.props++; continue; }
    }
    // chimney stacks where js/firesmoke.js puts its chimney smoke, up through the kit roof at that spot
    for (const e of chimneyAt) {
      const px = e.x * C, pz = e.y * C, L = lotsAll.find((q) => e.x >= q.b.x0 && e.x <= q.b.x1 + 1 && e.y >= q.b.y0 && e.y <= q.b.y1 + 1);
      let top = 12, low = 3;
      if (L) { const lx = (px - L.cx) * Math.cos(L.ry) - (pz - L.cz) * Math.sin(L.ry), lz = (px - L.cx) * Math.sin(L.ry) + (pz - L.cz) * Math.cos(L.ry); const lot = L.lots.find((q) => Math.abs(lx - q.lx) <= q.w / 2 + 0.01 && Math.abs(lz - q.lz) <= q.d / 2 + 0.01); if (lot) { top = lot.info.top + 1.3; low = lot.info.eaves; } }
      B.cat = 'bldg'; const y0 = gAt(e.x, e.y), h = top - low;
      B.put('stone', worldUV(THREE, new THREE.BoxGeometry(0.85, h, 0.85), 2.0), px, y0 + low + h / 2, pz);
      B.put('stone', worldUV(THREE, new THREE.BoxGeometry(1.05, 0.16, 1.05), 2.0), px, y0 + top - 0.08, pz);
      chimneys.push([px, y0 + top, pz]); smokeAt.push([px, y0 + top, pz]);
    }
    // oaks: three templates, instanced; leaves as instanced cards
    out.stats.oaks = oaks.length;
    if (oaks.length) {
      const byT = new Map(), ob = new THREE.Object3D();
      for (const k of oaks) {
        let tpl, sc, key;
        if (k.hero) {   // spread to fit the open ground round it (the template reaches ~10 m), a little under the nearest eaves
          tpl = heroTemplate(THREE, k.seed); key = 'hero' + k.seed;
          const bb = tpl.geo.boundingBox, reach = Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z);
          sc = clamp((Math.min(k.clear, 11.5) - 1.6) / reach, 0.55, 1.15); k.sy = clamp(15.5 / bb.max.y, 0.8, 1.5);
        } else {
          tpl = oakTemplate(THREE, k.seed); key = k.seed;
          sc = clamp(0.75 + (k.s - 1.5) * 0.5, 0.75, 1.45) * Math.min(1.6, (k.e && k.e.radius ? (k.e.radius + 0.22) * C / 1.9 : 1));
        }
        ob.position.set(k.x, k.y, k.z); ob.rotation.set(0, k.rot, 0); ob.scale.set(sc, k.sy || sc * (0.95 + (k.seed % 2) * 0.1), sc); ob.updateMatrix();
        if (!byT.has(key)) byT.set(key, { tpl, list: [] }); byT.get(key).list.push(ob.matrix.clone());
        k.m = ob.matrix.clone(); k.tpl = tpl; k.sc = sc;
        const fr = k.hero ? 1.45 * sc : 1.6 * sc * 0.5;
        if (S.debug) B.boxes.push(['tree', k.x - fr, k.y, k.z - fr, k.x + fr, k.y + 2.5, k.z + fr]);
      }
      out.oaks = oaks.map((k) => ({ x: k.x / C, y: k.z / C, hero: k.hero, sc: k.sc, h: k.tpl.h * (k.sy || k.sc), clear: k.clear }));
      for (const [key, { tpl, list }] of byT) {
        const mesh = new THREE.InstancedMesh(tpl.geo, M.ironBark, list.length);
        list.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = 'kit:oak' + key; metres.add(mesh);
      }
      const per = T.leaves, rL = mulberry(77), v = new THREE.Vector3(), col = new THREE.Color();
      const card = new THREE.PlaneGeometry(2.3, 2.3);
      const heroes = oaks.filter((k) => k.hero).length, HM = 2.2;   // an old oak in the open carries more crown
      const leaves = new THREE.InstancedMesh(card, M.leaves, Math.ceil(per * (oaks.length + heroes * (HM - 1))));
      let n = 0;
      // round by round over the trees, so a lower tier's shorter count thins every crown instead of dropping the last trees
      const nkMax = Math.round(per * (heroes ? HM : 1));
      for (let i = 0; i < nkMax; i++) for (const k of oaks) {
        const nk = Math.round(per * (k.hero ? HM : 1)), sp = k.tpl.spots;
        if (i >= nk) continue;
        {
          let c, j = 2.4;
          // an old crown grows in clumps on its twigs, with sky between them: seven cards to a clump
          if (k.hero) { if (!k.clump || i % 7 === 0) { const q = sp[(rL() * sp.length) | 0]; k.clump = new THREE.Vector3(q.x + (rL() - .5) * 1.4, q.y + (rL() - .3) * 1.0, q.z + (rL() - .5) * 1.4); } c = k.clump; j = 1.3; }
          else c = sp[(rL() * sp.length) | 0];
          v.set(c.x + (rL() - .5) * j, c.y + (rL() - .35) * (k.hero ? 1.0 : 1.6), c.z + (rL() - .5) * j).applyMatrix4(k.m);
          ob.position.copy(v); ob.rotation.set(rL() * PI, rL() * PI, rL() * PI); const s = (0.75 + rL() * 0.7) * (k.hero ? Math.min(1, k.sc) * 1.05 : k.sc); ob.scale.set(s, s, s); ob.updateMatrix();
          leaves.setMatrixAt(n, ob.matrix);
          // the variants keep their colours; the iron-oak's own autumn is "a kind of rust-pink, like a stain that has been
          // scrubbed" (the books: no longer the red of their childhood), with a dull ochre leaf among them
          if (k.green) col.setHSL(0.17 + rL() * .07, 0.42 + rL() * 0.15, 0.24 + rL() * .1);
          else if (k.copper) col.setHSL(0.055 + rL() * .05, 0.6 + rL() * 0.2, 0.33 + rL() * .14);
          else if (rL() < 0.2) col.setHSL(0.09 + rL() * .03, 0.42 + rL() * 0.12, 0.34 + rL() * .1);
          else col.setHSL(0.015 + rL() * .035, 0.34 + rL() * 0.14, 0.33 + rL() * .11);
          if (k.hero) col.multiplyScalar(0.55 + 0.5 * clamp((c.y - 4) / (k.tpl.h - 4), 0, 1));   // the inside and underside of a big crown is in its own shade
          leaves.setColorAt(n, col); n++;
        }
      }
      leaves.onBeforeRender = () => { WIND.value = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000 % 10000; };
      leaves.count = n; leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true; leaves.computeBoundingSphere();
      leaves.castShadow = true; leaves.receiveShadow = true; leaves.customDepthMaterial = M.leafDepth; leaves.name = 'kit:leaves'; leaves.userData.per = per; leaves.userData.oaks = oaks.length; leaves.userData.max = n;
      metres.add(leaves); out.leaves = leaves;
    }
    // ---- fallen leaves: thick under the oaks, a drift along the walls; puddles in the cobbles
    {
      // two kinds: the fall under the oaks and a scatter through the streets (A), and drifts where the wind leaves them (D):
      // along the feet of walls, against steps, along the kerb where the cobbles meet the verges. Both shuffled together, so a
      // lower tier's shorter count thins both alike.
      const rF = mulberry(9), cF = new THREE.Color(), pts = [];
      const open = (x, z) => { const cx = Math.floor(x / C), cy = Math.floor(z / C); return !(cx < 0 || cy < 0 || cx >= map.w || cy >= map.h || map.cells[cy * W + cx]); };
      const tint = (x, z, wet) => {   // the leaf of the nearest oak: rust-pink under the iron-oaks, copper under the copper ones
        let best = null, bd = 14; for (const k of oaks) { const d = Math.hypot(k.x - x, k.z - z); if (d < bd) { bd = d; best = k; } }
        const kind = best ? (best.copper ? 1 : best.green ? 2 : 0) : (rF() < 0.5 ? 0 : 2);
        if (kind === 1) cF.setHSL(0.05 + rF() * 0.05, 0.55 + rF() * 0.2, 0.22 + rF() * 0.12);
        else if (kind === 2) cF.setHSL(0.07 + rF() * 0.05, 0.38 + rF() * 0.15, 0.2 + rF() * 0.1);
        else cF.setHSL(0.015 + rF() * 0.035, 0.36 + rF() * 0.16, 0.27 + rF() * 0.12);
        if (wet) cF.multiplyScalar(0.62 + rF() * 0.25);
        return [cF.r, cF.g, cF.b];
      };
      for (let i = 0, nA = 0; i < T.ground * 3 && nA < T.ground; i++) {
        let x, z;
        const heroes = oaks.filter((q) => q.hero), u = rF();
        if (heroes.length && u < 0.45) { const k = heroes[(rF() * heroes.length) | 0], a = rF() * PI * 2, rr = Math.pow(rF(), 0.7) * 11; x = k.x + Math.cos(a) * rr; z = k.z + Math.sin(a) * rr; }   // the square's old oaks drop the most
        else if (oaks.length && u < 0.75) { const k = oaks[(rF() * oaks.length) | 0], a = rF() * PI * 2, rr = Math.sqrt(rF()) * 9 * (k.s / 1.8); x = k.x + Math.cos(a) * rr; z = k.z + Math.sin(a) * rr; }
        else { x = (2 + rF() * (map.w - 4)) * C; z = (2 + rF() * (map.h - 4)) * C; }
        if (!open(x, z)) continue;
        pts.push([x, z, rF() * PI * 2, 0, 0.6 + rF() * 0.9, tint(x, z, rF() < 0.4), rF()]); nA++;
      }
      // where drifts lie: wall feet (open cells against the kit's buildings), kerbs, and the steps the builders reported
      const segs = []; let wsum = 0;
      const near = (x, y) => { const d1 = Math.hypot(x - 25, y - 21), d2 = Math.hypot(x - 53, y - 18); return 1 + 3 * Math.exp(-Math.min(d1, d2) / 10); };
      for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (map.cells[i]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (y + dy) * W + x + dx, c = map.cells[j];
          const wall = c && out.hiddenCells.has(j);
          const kerb = !c && map.floorCells && map.floorCells[i] === 1 && map.floorCells[j] === 0;
          if (!wall && !kerb) continue;
          // the edge between the two cells, in metres, and the way back into the open cell
          const ex = (x + 0.5 + dx * 0.5) * C, ez = (y + 0.5 + dy * 0.5) * C, w8 = near(x, y) * (wall ? 1 : 0.55);
          segs.push([ex - dy * C / 2, ez - dx * C / 2, ex + dy * C / 2, ez + dx * C / 2, -dx, -dy, wall ? 0.1 : 0.0, w8]); wsum += w8;
        }
      }
      for (const d of B.drifts) { const w8 = d[4] * near(d[0] / C, d[1] / C); segs.push([d[0] - Math.cos(d[2]) * d[3] / 2, d[1] - Math.sin(d[2]) * d[3] / 2, d[0] + Math.cos(d[2]) * d[3] / 2, d[1] + Math.sin(d[2]) * d[3] / 2, Math.sin(d[2]), -Math.cos(d[2]), 0.02, w8]); wsum += w8; }
      const cum = []; { let a = 0; for (const q of segs) { a += q[7]; cum.push(a); } }
      for (let i = 0, nD = 0; segs.length && i < T.drift * 3 && nD < T.drift; i++) {
        const u = rF() * wsum; let lo = 0, hi = segs.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
        const sg = segs[lo];
        const t = rF(), dd = sg[6] + Math.min(0.9, -Math.log(1 - rF() * 0.98) * 0.2), x = lerp(sg[0], sg[2], t) + sg[4] * dd, z = lerp(sg[1], sg[3], t) + sg[5] * dd;
        if (!open(x, z)) continue;
        // a drift piles: leaves overlap, the ones against a wall tip up onto it
        pts.push([x, z, rF() * PI * 2, dd < 0.2 ? (rF() - 0.5) * 0.7 : 0, 0.55 + rF() * 0.7, tint(x, z, rF() < 0.55), rF(), 0.004 * (1 - dd)]); nD++;
      }
      pts.sort((a, b) => a[6] - b[6]);
      const NG = Math.max(1, pts.length), flat = new THREE.PlaneGeometry(0.55, 0.55).rotateX(-PI / 2), gl = new THREE.InstancedMesh(flat, M.fallen, NG), ob = new THREE.Object3D();
      let n = 0;
      for (const p of pts) {
        ob.position.set(p[0], gAt(p[0] / C, p[1] / C) + 0.012 + rF() * 0.008 + (p[7] || 0) * 10, p[1]); ob.rotation.set(p[3], p[2], 0, 'YXZ'); ob.scale.set(p[4], 1, p[4]); ob.updateMatrix();
        gl.setMatrixAt(n, ob.matrix); gl.setColorAt(n, cF.setRGB(p[5][0], p[5][1], p[5][2])); n++;
      }
      if (gl.instanceColor) gl.instanceColor.needsUpdate = true;
      gl.count = n; gl.instanceMatrix.needsUpdate = true; gl.computeBoundingSphere(); gl.receiveShadow = true; gl.castShadow = false; gl.name = 'kit:fallen'; gl.userData.max = n;
      metres.add(gl); out.fallen = gl;
      // puddles: in the cobbles, away from the door aprons' centre lines, more on the main road and the square
      const rP = mulberry(31);
      if (map.floorCells) for (let y = 2; y < map.h - 2; y++) for (let x = 2; x < map.w - 2; x++) {
        const i = y * W + x; if (map.cells[i] || map.floorCells[i] !== 1) continue;
        if (hash2(x * 3 + 1, y * 5 + 2) > 0.075 * T.puddle) continue;
        const pr = 0.7 + rP() * 1.4, px = (x + 0.2 + rP() * 0.6) * C, pz = (y + 0.2 + rP() * 0.6) * C;
        const pg = new THREE.CircleGeometry(pr, 22), pp = pg.attributes.position;
        for (let k = 1; k < pp.count; k++) { const a = Math.atan2(pp.getY(k), pp.getX(k)), kk = 1 + 0.22 * Math.sin(a * 3 + x) + 0.12 * Math.sin(a * 7 + y); pp.setXY(k, pp.getX(k) * kk, pp.getY(k) * kk * 0.7); }
        B.cat = 'flat'; B.put('puddle', pg.rotateX(-PI / 2), px, gAt(x + 0.5, y + 0.5) + 0.008, pz, rP() * 3);
      }
    }
    // ---- the far ring
    B.cat = 'far';
    try { farRing(B, metres, map, { T, far: ctx.far }); } catch (e) { warnOnce('far ring', e); }
    // ---- chimney smoke: a thin, slow ribbon from each chimney the game itself smokes (js/firesmoke.js's chimney decos), one
    // instanced draw; off at Phone
    if (smokeAt.length) {
      const sm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1, 1, 12).translate(0, 0.5, 0), smokeMat(THREE, M), smokeAt.length), ob = new THREE.Object3D();
      smokeAt.forEach((c, i) => { ob.position.set(c[0], c[1] - 0.1, c[2]); ob.rotation.set(0, 0, 0); ob.scale.set(0.8, 10 + hash2(i, 3) * 4, 1); ob.updateMatrix(); sm.setMatrixAt(i, ob.matrix); });
      sm.instanceMatrix.needsUpdate = true; sm.computeBoundingSphere(); sm.boundingSphere.radius += 20;
      sm.frustumCulled = false; sm.castShadow = false; sm.receiveShadow = false; sm.renderOrder = 2; sm.name = 'kit:smoke'; sm.visible = !!T.smoke;
      metres.add(sm); out.smoke = sm;
    }
    // ---- ivy: every card in one instanced draw, in a shuffled order so a lower tier's count thins it evenly
    if (B.ivy.length) {
      const iv = B.ivy, rI = mulberry(61);
      for (let i = iv.length - 1; i > 0; i--) { const j = (rI() * (i + 1)) | 0; const t = iv[i]; iv[i] = iv[j]; iv[j] = t; }
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.4, 0), M.ivy, iv.length), ob = new THREE.Object3D(), col = new THREE.Color();
      iv.forEach((c, i) => {
        ob.position.set(c[0], c[1], c[2]); ob.rotation.set(c[6], c[3], c[5], 'YXZ'); ob.scale.setScalar(c[4]); ob.updateMatrix(); im.setMatrixAt(i, ob.matrix);
        if (c[8]) col.setHSL(c[8][0], c[8][1], c[8][2]);
        else if (c[7] < 0.1) col.setHSL(0.02 + c[7] * 0.2, 0.4, 0.15);   // a few leaves already turned
        else col.setHSL(0.22 + c[7] * 0.08, 0.26 + c[7] * 0.12, 0.085 + c[7] * 0.07);
        im.setColorAt(i, col);
      });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.computeBoundingSphere();
      im.castShadow = T.shadowSmall; im.receiveShadow = true; im.customDepthMaterial = M.ivyDepth; im.name = 'kit:ivy';
      im.userData.max = iv.length; im.count = Math.min(iv.length, Math.round(iv.length * T.ivy)); im.userData.small = true;
      metres.add(im); out.ivy = im; out.stats.ivy = iv.length;
    }
    // ---- into meshes
    const noShadow = new Set(['glassLit', 'glassDark', 'puddle', 'grime', 'notices', 'seal', 'flame']);
    for (const k of Object.keys(M)) if (k.startsWith('decal:')) noShadow.add(k);
    const small = new Set(['iron', 'goods', 'shutter', 'flame', 'reed', 'rope']);
    if (!T.shadowSmall) for (const k of ['iron', 'goods', 'shutter', 'reed', 'rope', 'awning']) noShadow.add(k);
    B.finish(metres, { noShadow, small });
    // glTF props: hush-lamp lanterns and the crates (Poly Haven, CC0), instanced when they come in
    const lampLights = [];
    for (const L of lampsAt) {
      if (L[6]) continue;
      const pl = L[7] === 'door' ? new THREE.PointLight(0xffa24a, 0.42, 1.8, 2) : new THREE.PointLight(0xffa24a, 0.6, 2.4, 2);   // in CORE's pool terms (the engine's lamps: ~0.75 over ~5.6 cells)
      pl.position.set(L[0] * UPM(), L[1] * UPM(), L[2] * UPM()); pl.name = 'kit:lamp'; pl.castShadow = false;
      lampLights.push(pl); out.lights.push(pl);
      if (ctx.addLight) { try { ctx.addLight(pl, L[3] || 1); } catch (e) { warnOnce('addLight', e); out.group.add(pl); } } else out.group.add(pl);
    }
    out.lampsAt = lampsAt;
    const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), M.flame, Math.max(1, lampsAt.length)), ob = new THREE.Object3D();
    lampsAt.forEach((L, i) => { ob.position.set(L[0], L[1] - 0.03, L[2]); ob.scale.set(1, 1.4, 1); ob.updateMatrix(); flames.setMatrixAt(i, ob.matrix); });
    flames.count = lampsAt.length; flames.instanceMatrix.needsUpdate = true; flames.computeBoundingSphere(); flames.name = 'kit:flames'; metres.add(flames);
    out.gltfDone = loadProps(THREE).then((P) => {
      if (!P) return;
      const lan = P.lantern, list = lampsAt.filter((L) => !L[4]);
      if (lan && list.length) for (const part of lan) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
        list.forEach((L, i) => { ob.position.set(L[0], L[1] - 0.22, L[2]); ob.rotation.set(0, L[5] || 0, 0); ob.scale.setScalar(1); ob.updateMatrix(); im.setMatrixAt(i, ob.matrix.clone().multiply(part.m)); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = T.shadowSmall; im.receiveShadow = true; im.name = 'kit:lantern'; metres.add(im);
      }
      const crates = out._crates || [];
      for (const [ci, cr] of [P.crateA, P.crateB].entries()) {
        const pick = crates.filter((c, j) => j % 2 === ci); if (!cr || !pick.length) continue;
        for (const part of cr) {
          const im = new THREE.InstancedMesh(part.geo, part.mat, pick.length);
          pick.forEach((c, i) => { ob.position.set(c[0], c[3], c[1]); ob.rotation.set(0, c[2], 0); ob.scale.setScalar(c[4] || 1); ob.updateMatrix(); im.setMatrixAt(i, ob.matrix.clone().multiply(part.m)); });
          im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = T.shadowSmall; im.receiveShadow = true; im.name = 'kit:crate'; metres.add(im);
        }
      }
      out.stats.draws = countDraws(out.group);
    }).catch((e) => warnOnce('props', e));
    out._crates = CRATES.splice(0); out.doorsDrawn = DOORS.splice(0);
    out.boxes = B.boxes; out.landmarks = landmarks; out.chimneys = chimneys; out.tier = tierName; out.metres = metres;
    // where smoke should leave the kit's chimneys, in world units (js/firesmoke.js's chimney decos sit on the old roofs)
    out.chimneyTops = chimneys.map((c) => [c[0] * UPM(), c[1] * UPM(), c[2] * UPM()]);
    out.stats.draws = countDraws(out.group);
    if (typeof window !== 'undefined' && window.R11 && typeof window.R11.on === 'function' && !S.tierHooked) { S.tierHooked = true; try { window.R11.on('tier', (n) => setTier(n)); } catch (e) { /* none */ } }
  }
  const CRATES = [], DOORS = [];
  function crateAt(B, x, z, ry, y) { CRATES.push([x, z, ry, y || 0, 0.9 + ((x * 7 + z * 3) % 1 + 1) % 1 * 0.15]); if (S.debug) B.boxes.push([B.cat, x - 0.5, y || 0, z - 0.5, x + 0.5, (y || 0) + 0.85, z + 0.5]); }
  // the Boar & Dulcimer's board on a wrought-iron bracket over the street, its foot well above any head: a wall plate, the
  // bar, a scrolled brace under it, a curl at the tip, the board swinging from two rings
  // an odd-numbered group of casks, crates or bales against a wall, centred at along-coordinate x of a side frame (out:
  // the wall's face); returns how many pieces it set down
  function propGroup(B, sf, x, out, what, n, r) {
    const W2 = (lx, lz) => sf.at(lx, out + lz), jy = () => (r() - .5) * 0.35;
    if (what === 'cask' || what === 'butt') {
      const spots = n === 1 ? [[0, 0.42]] : n === 3 ? [[-0.36, 0.37], [0.36, 0.37], [0.05, 0.9]] : [[-0.72, 0.37], [0, 0.37], [0.72, 0.37], [-0.36, 0.9], [0.62, 0.86, 'side']];
      for (const [lx, lz, how] of spots) { const q = W2(x + lx, lz); cask(B, q[0], q[1], sf.ry + (how ? PI / 2 + jy() : r() * 6), 0, how || (what === 'butt' ? 'open' : 'up'), what === 'butt' ? 1.15 : 1); }
      return spots.length;
    }
    if (what === 'crate') {
      const spots = n === 3 ? [[-0.45, 0.5, 0], [0.42, 0.5, 0], [0, 0.5, 0.74]] : [[-0.9, 0.5, 0], [0, 0.5, 0], [0.9, 0.5, 0], [-0.45, 0.5, 0.74], [0.5, 0.5, 0.74]];
      for (const [lx, lz, y] of spots) { const q = W2(x + lx, lz); crateAt(B, q[0], q[1], sf.ry + jy(), y); }
      return spots.length;
    }
    if (what === 'bale') {   // wool bales, bound in cord, the wool-factor's (cream wool under sacking)
      for (const [lx, lz, y] of [[-0.5, 0.45, 0], [0.5, 0.45, 0], [0, 0.45, 0.62]]) { sf.ibox('goods', 0.95, 0.6, 0.7, x + lx, y + 0.3, lz + out, jy() * 0.3, 0, 0, 0xcfc4a8); sf.ibox('rope', 0.97, 0.03, 0.72, x + lx, y + 0.3, lz + out, 0); }
      return 3;
    }
    return 0;
  }
  function innSign(B, sf, x, out) {
    const THREE = B.THREE, y = 3.42, L = 1.25, bw = 0.96, bh = 1.06, bz = out + 0.27 + bw / 2, by = y - 0.1 - bh / 2;
    sf.ibox('iron', 0.1, 0.9, 0.03, x, y - 0.3, out + 0.015);
    sf.ibox('iron', 0.05, 0.05, L, x, y, out + L / 2);
    sf.beam('iron', 0.035, x, y - 0.72, out + 0.03, x, y - 0.02, out + 0.78);
    // the scrolls: a big C under the bar, a small one inside it, a curl at the bar's tip, a spike finial at the wall
    const arc = (R, t, a0, len, cz, cy) => { const g = new THREE.TorusGeometry(R, t, 4, 14, len); g.rotateZ(a0); g.rotateY(PI / 2); return sf.part('iron', g, x, cy, cz); };
    arc(0.19, 0.014, PI * 0.5, PI * 1.25, out + 0.45, y - 0.21);
    arc(0.085, 0.011, PI * 0.2, PI * 1.6, out + 0.56, y - 0.19);
    arc(0.07, 0.012, -PI * 0.5, PI * 1.5, out + L - 0.02, y + 0.07);
    sf.ibox('iron', 0.03, 0.18, 0.03, x, y + 0.08, out + 0.04);
    for (const s2 of [-bw / 2 + 0.08, bw / 2 - 0.08]) { sf.part('iron', new THREE.TorusGeometry(0.035, 0.008, 4, 10).rotateY(PI / 2), x, y - 0.06, bz + s2); }
    sf.ibox('timber', 0.07, bh + 0.06, bw + 0.06, x, by, bz);
    sf.part('sign', new THREE.PlaneGeometry(bw, bh), x + 0.037, by, bz, PI / 2);
    sf.part('sign', new THREE.PlaneGeometry(bw, bh), x - 0.037, by, bz, -PI / 2);
  }
  function wallLantern(B, sf, x, y, out, lampsAt, prio) {   // a hush-lamp on a wall-arm by the inn's door (the reed in its chimney)
    wallArm(B, sf, x, y, out, lampsAt, 1);
    const L = lampsAt[lampsAt.length - 1]; L[3] = prio || 2; L[7] = null;
    reed(B, L[0], L[1] + 0.2, L[2]);
  }
  function lampPost(B, x, z, y, ry, lampsAt) {   // a street hush-lamp: stone foot, oak post, iron arm, the lantern, its reed whistle
    const THREE = B.THREE, f = B.frame(x, z, ry, y);
    f.part('stone', worldUV(THREE, new THREE.BoxGeometry(0.5, 0.42, 0.5), 1.2), 0, 0.21, 0);
    f.ibox('timber', 0.17, 3.1, 0.17, 0, 0.42 + 1.55, 0);
    f.ibox('iron', 0.05, 0.05, 0.7, 0, 3.32, 0.32);
    f.ibox('iron', 0.04, Math.hypot(0.4, 0.45), 0.04, 0, 3.08, 0.2, 0, Math.atan2(0.4, 0.45), 0);
    f.ibox('iron', 0.025, 0.2, 0.025, 0, 3.2, 0.62);
    f.ibox('timber', 0.22, 0.08, 0.22, 0, 3.52, 0);
    const q = f.at(0, 0.62);
    lampsAt.push([q[0], y + 2.95, q[1], 1, false, ry, true]);   // the engine already lights this deco: no second light
    reed(B, q[0], y + 3.13, q[1]);
  }
  function reed(B, x, y, z) { B.box('reed', 0.022, 0.16, 0.022, x, y + 0.08, z); B.box('reed', 0.035, 0.03, 0.035, x, y + 0.155, z); }

  // the glTF props, loaded once (Poly Haven CC0: Lantern_01, wooden_crate_01, wooden_crate_02; buffers in *.buf.wasm)
  function loadProps(THREE) {
    if (S.gltfP) return S.gltfP;
    const GL = addons().GLTFLoader; if (!GL) return Promise.resolve(null);
    const loader = new GL();
    const one = (n, scale) => loader.loadAsync(BASE + 'models/' + n + '/' + n + '.json').then((g) => {
      const parts = []; g.scene.updateMatrixWorld(true);
      g.scene.traverse((m) => { if (m.isMesh) parts.push({ geo: m.geometry, mat: m.material, m: new THREE.Matrix4().makeScale(scale, scale, scale).multiply(m.matrixWorld) }); });
      return parts;
    }).catch((e) => { warnOnce('gltf ' + n, e); return null; });
    S.gltfP = Promise.all([one('Lantern_01', 1), one('wooden_crate_01', 1), one('wooden_crate_02', 1)]).then(([lantern, crateA, crateB]) => (S.gltf = { lantern, crateA, crateB }));
    return S.gltfP;
  }
  function countDraws(group) {
    let n = 0;
    group.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !(o.isInstancedMesh && o.count === 0)) n++; });
    return n;
  }
  function setTier(name) {
    const L = S.last; if (!L || !L.group) return;
    const T = TIERS[tierOf(name)];
    try {
      if (L.leaves) L.leaves.count = Math.min(L.leaves.userData.max, Math.round(T.leaves / L.leaves.userData.per * L.leaves.userData.max));
      if (L.fallen) L.fallen.count = Math.min(L.fallen.userData.max, T.ground + T.drift);
      if (L.smoke) L.smoke.visible = !!T.smoke;
      if (L.ivy) L.ivy.count = Math.min(L.ivy.userData.max, Math.round(L.ivy.userData.max * T.ivy));
      L.group.traverse((o) => { if (o.isMesh && o.userData && o.userData.small) o.castShadow = T.shadowSmall; if (o.name === 'kit:far:forest') o.count = Math.min(o.userData.max, T.forest); });
      L.tier = tierOf(name); L.stats.draws = countDraws(L.group);
    } catch (e) { warnOnce('setTier', e); }
  }

  // ======================================================================== the first-person body
  const KIND_BY_IMG = { fp_sword: 'sword', fp_longsword: 'longsword', fp_knife: 'knife', fp_axe: 'axe', fp_mace: 'mace', fp_maul: 'maul', fp_spear: 'spear', fp_pistol: 'pistol', fp_crossbow: 'crossbow', fp_hands: 'fists', fp_glass: 'fists', fp_staff: 'staff' };
  function kindFor(id) {
    try {
      const W = (typeof WEAPONS === 'object' && WEAPONS && WEAPONS[id]) || null;
      if (/staff|stave|crook/i.test(String(id) + (W ? ' ' + W.name : ''))) return 'staff';
      if (W && KIND_BY_IMG[W.img]) return KIND_BY_IMG[W.img];
    } catch (e) { /* fall through */ }
    return id === 'hands' ? 'fists' : 'blade';
  }
  const glassFrag = `uniform float uPulse; uniform vec3 uDeep; uniform vec3 uRim; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec3 n = normalize(vN); vec3 v = normalize(vV);
        float f = pow(1.0 - abs(dot(n, v)), 2.0);
        float spark = pow(max(0.0, dot(reflect(-v, n), normalize(vec3(-0.3, 0.8, 0.5)))), 28.0);
        float band = 0.5 + 0.5 * sin(vP.z * 70.0 + vP.y * 45.0 + vP.x * 20.0);
        float edge = smoothstep(0.55, 0.95, f);
        vec3 c = uDeep * (0.75 + 0.35 * band) + uRim * (f * 2.2 * uPulse + edge * 1.2) + vec3(0.85, 1.0, 1.0) * spark * 1.8;
        gl_FragColor = vec4(c, clamp(0.34 + f * 0.75 + spark, 0.0, 1.0));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
  const glassVert = `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }`;
  function facet(THREE, geo, j, r) {
    geo = geo.index ? geo.toNonIndexed() : geo; const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, [(r() - .5) * j, (r() - .5) * j, (r() - .5) * j]);
      const d = seen.get(key); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.deleteAttribute('normal'); geo.computeVertexNormals(); return geo;
  }
  // a segment from a to b (capsule), radius r0..r1
  function seg(THREE, a, b, rad, rs) {
    const d = new THREE.Vector3().subVectors(b, a), L = d.length();
    const g = new THREE.CapsuleGeometry(rad, Math.max(0.001, L), 2, rs || 7);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    g.applyQuaternion(q); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  }
  // Kaelen's left arm: light-glass to past the elbow, cyan, faceted, the green vein "bright as a river under ice" in it
  function glassArm(THREE, opts) {
    const r = mulberry(1907), V = (x, y, z) => new THREE.Vector3(x, y, z), parts = [];
    // forearm and wrist (local: fingers point -z, palm down, thumb toward +x since it is the left hand seen from behind)
    parts.push(seg(THREE, V(0.02, -0.035, 0.36), V(0.0, 0.0, 0.07), 0.042, 9));
    parts.push(seg(THREE, V(0.0, 0.0, 0.07), V(0.0, 0.004, 0.0), 0.033, 9));
    // palm: a flattened rounded block
    const palm = new THREE.BoxGeometry(0.084, 0.03, 0.09, 3, 1, 3); { const p = palm.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) * (1 - 0.35 * Math.abs(x) / 0.042) + 0.004 * Math.cos(z * 20)); } }
    palm.translate(-0.004, 0.004, -0.052); parts.push(palm);
    // fingers: index..little from the thumb side (+x) across; reaching, slightly spread, gently curled
    const F = [[0.031, 0.083, -0.2], [0.011, 0.091, -0.05], [-0.01, 0.086, 0.09], [-0.03, 0.068, 0.24]];
    for (const [x, len, spread] of F) {
      let p = V(x, 0.006, -0.095), dir = V(Math.sin(spread), 0, -Math.cos(spread)).normalize(), rad = 0.0102;
      const L = [len * 0.45, len * 0.31, len * 0.24], curl = [0.22, 0.3, 0.26];
      for (let k = 0; k < 3; k++) {
        dir.applyAxisAngle(V(Math.cos(spread), 0, Math.sin(spread)), -curl[k]);
        const q = p.clone().addScaledVector(dir, L[k]);
        parts.push(seg(THREE, p, q, rad, 7)); p = q; rad *= 0.88;
      }
    }
    // the thumb: off the side of the palm, turned in
    let tp = V(0.04, -0.004, -0.02), td = V(0.62, -0.05, -0.78).normalize(), trad = 0.0125;
    for (const [L, c] of [[0.04, 0.1], [0.032, 0.25], [0.026, 0.3]]) { td.applyAxisAngle(V(0, 1, 0), c * 0.6).applyAxisAngle(V(0, 0, 1), -c * 0.3); const q = tp.clone().addScaledVector(td, L); parts.push(seg(THREE, tp, q, trad, 7)); tp = q; trad *= 0.88; }
    const mg = addons().mergeGeometries;
    let geo = mg(parts.map((g) => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); return g; }), false);
    geo = facet(THREE, geo, 0.006, r);
    const glass = new THREE.ShaderMaterial({ uniforms: { uPulse: { value: 1 }, uDeep: { value: new THREE.Color(0x1a8aa8) }, uRim: { value: new THREE.Color(0x8af4ff) } },
      vertexShader: glassVert, fragmentShader: glassFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const group = new THREE.Group(); group.name = 'R11KIT:glass-arm';
    const arm = new THREE.Mesh(geo, glass); arm.renderOrder = 2; arm.frustumCulled = false;
    // the inner facets: a smaller crystal inside catches the light again
    const inner = new THREE.Mesh(facet(THREE, geo.clone().scale(0.82, 0.8, 0.98), 0.01, r), glass); inner.renderOrder = 1; inner.frustumCulled = false;
    // the green vein: up the forearm, through the wrist, into the palm and branching to the middle fingers
    const vmat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.22, 0.95, 0.42).multiplyScalar(1.25) });
    const vglow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.6, 0.28), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const vein = new THREE.Group();
    const tube = (pts, rr) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, rr, 6, false), vmat); m.renderOrder = 0; m.frustumCulled = false; vein.add(m);
      const g = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, rr * 1.9, 6, false), vglow); g.renderOrder = 3; g.frustumCulled = false; vein.add(g);
    };
    tube([V(0.012, 0.012, 0.36), V(0.008, 0.016, 0.22), V(0.0, 0.016, 0.1), V(-0.002, 0.014, 0.02), V(0.0, 0.014, -0.05)], 0.0048);
    tube([V(0.0, 0.014, -0.05), V(0.008, 0.012, -0.08), V(0.012, 0.01, -0.12)], 0.003);
    tube([V(0.0, 0.014, -0.05), V(-0.012, 0.012, -0.08), V(-0.02, 0.008, -0.11)], 0.0026);
    tube([V(0.006, 0.012, 0.16), V(0.026, 0.01, 0.08), V(0.034, 0.006, 0.0)], 0.0022);
    const hand = new THREE.Group(); hand.add(vein, inner, arm);
    group.add(hand);
    if (vmLights(opts)) { const cy = new THREE.PointLight(0x5fe8ff, 0.9, 1.6, 2); cy.position.set(0.02, 0.05, -0.08); hand.add(cy); }
    // framed like bench1: lower left, reaching in and up toward the middle of the view
    const base = { p: V(-0.2, -0.16, -0.34), r: V(0.9, -0.3, 0.7) };
    hand.position.copy(base.p); hand.rotation.set(base.r.x, base.r.y, base.r.z);
    return { group, hand, base, mats: { glass, vmat } };
  }
  function leatherMats(THREE) {
    return {
      leather: new THREE.MeshStandardMaterial({ color: 0x2e1c11, roughness: 0.58, metalness: 0.06 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.26, metalness: 1, envMapIntensity: 1.0 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x55595e, roughness: 0.4, metalness: 1 }),
      fuller: new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.32, metalness: 1 }),
      brass: new THREE.MeshStandardMaterial({ color: 0x9c7a3c, roughness: 0.35, metalness: 1 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x3a3b3d, roughness: 0.5, metalness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.7 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0x8a6232, roughness: 0.32, metalness: 1 }),
      wrap: new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 }),
    };
  }
  // the gloved right fist closed round a grip on local y (the grip runs up through it at the origin, the guard just above
  // y = 0.077): palm on the grip's right, the back of the hand facing right and back toward the eye, the fingers wrapping
  // round the front and the left, the thumb over the back of the grip under the guard, a cuff and sleeve to the lower right
  function fist(THREE, L, open) {
    const g = new THREE.Group(), V = (x, y, z) => new THREE.Vector3(x, y, z);
    const mesh = (geo, m) => { const o = new THREE.Mesh(geo, m || L.leather); g.add(o); return o; };
    // the back of the hand: a rounded block against the grip's right side
    const back = new THREE.BoxGeometry(0.034, 0.1, 0.082, 2, 3, 3); { const p = back.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setX(i, x + 0.006 * (1 - (z / 0.041) * (z / 0.041))); } back.computeVertexNormals(); }
    mesh(back).position.set(0.036, 0.002, 0.004);
    // four fingers: from the knuckle row (front right) round the front and the left of the grip, ending at the back left
    const R = 0.0265;
    for (let i = 0; i < 4; i++) {
      const y = 0.052 - i * 0.025, th = 0.0118 - i * 0.0006, pts = [];
      for (let k = 0; k <= 8; k++) { const a = -PI * 0.22 - k / 8 * PI * 1.08, rr = R + (k < 2 ? 0.006 * (2 - k) : 0); pts.push(V(Math.cos(a) * rr + 0.004, y - k * 0.0012, Math.sin(a) * rr)); }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, th, 8, false));
      mesh(new THREE.SphereGeometry(th * 1.05, 10, 8)).position.copy(pts[8]);
      mesh(new THREE.SphereGeometry(th * 1.25, 10, 8)).position.copy(pts[0]);   // the knuckle
    }
    // the thumb: from the heel of the hand over the back of the grip, just under the guard
    const tp = [V(0.034, 0.01, 0.03), V(0.022, 0.04, 0.034), V(0.0, 0.058, 0.031), V(-0.02, 0.062, 0.022)];
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tp), 14, 0.0128, 8, false));
    mesh(new THREE.SphereGeometry(0.0128, 10, 8)).position.copy(tp[3]);
    // the cuff and sleeve, down and out to the lower right
    const cuff = mesh(new THREE.CylinderGeometry(0.046, 0.056, 0.12, 14)); cuff.position.set(0.05, -0.085, 0.03); cuff.rotation.set(0.35, 0, 0.55);
    const sleeve = mesh(new THREE.CylinderGeometry(0.064, 0.085, 0.34, 14), new THREE.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.95 })); sleeve.position.set(0.13, -0.24, 0.09); sleeve.rotation.set(0.35, 0, 0.55);
    if (open) g.scale.setScalar(1.0);
    return g;
  }
  function bladeShape(THREE, w0, w1, len, tip) {
    const s = new THREE.Shape(); s.moveTo(-w0 / 2, 0); s.lineTo(w0 / 2, 0); s.lineTo(w1 / 2, len - tip); s.quadraticCurveTo(w1 / 2 * 0.7, len - tip * 0.4, 0, len); s.quadraticCurveTo(-w1 / 2 * 0.7, len - tip * 0.4, -w1 / 2, len - tip); s.closePath(); return s;
  }
  function weapon(THREE, kind, L) {
    const g = new THREE.Group(), add = (geo, mat, x, y, z, rx, ry, rz) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
    const blade = (len, w0, w1, guardW, grip) => {
      const bg = new THREE.ExtrudeGeometry(bladeShape(THREE, w0, w1, len, w1 * 2.2), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0028, bevelSize: 0.0055, bevelSegments: 2 }); bg.translate(0, 0, -0.002);
      add(bg, L.steel, 0, 0.1);
      add(new THREE.BoxGeometry(w0 * 0.18, len * 0.7, 0.0102), L.fuller, 0, 0.1 + len * 0.38);
      // a cross-guard with turned-down quillons
      add(new THREE.BoxGeometry(guardW, 0.022, 0.03), L.iron, 0, 0.088);
      for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.007, 0.009, 0.03, 8), L.iron, s * (guardW / 2 + 0.008), 0.084, 0, 0, 0, s * 1.1); add(new THREE.SphereGeometry(0.0085, 8, 6), L.iron, s * (guardW / 2 + 0.02), 0.078); }
      add(new THREE.CylinderGeometry(0.016, 0.018, grip, 10), L.wrap, 0, 0.077 - grip / 2);
      for (let i = 0; i < 6; i++) add(new THREE.TorusGeometry(0.0175, 0.003, 4, 10), L.wrap, 0, 0.07 - i * grip / 6, 0, PI / 2 + 0.25);
      add(new THREE.SphereGeometry(0.026, 12, 10).scale(1, 0.75, 0.8), L.iron, 0, 0.077 - grip - 0.012);
    };
    switch (kind) {
      case 'longsword': blade(0.9, 0.05, 0.036, 0.24, 0.2); break;
      case 'knife': blade(0.24, 0.032, 0.02, 0.07, 0.11); break;
      case 'axe': {
        add(new THREE.CylinderGeometry(0.016, 0.019, 0.6, 9), L.wood, 0, 0.18);
        // a bearded head: a narrow neck at the haft, the edge sweeping down into the beard
        const head = new THREE.Shape(); head.moveTo(0, 0.035); head.lineTo(0.05, 0.03); head.quadraticCurveTo(0.09, 0.045, 0.13, 0.062);
        head.quadraticCurveTo(0.155, -0.02, 0.118, -0.115); head.quadraticCurveTo(0.08, -0.07, 0.052, -0.032); head.lineTo(0, -0.03); head.closePath();
        const hg = new THREE.ExtrudeGeometry(head, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }); hg.translate(0, 0, -0.006);
        add(hg, L.steel, 0.012, 0.42); add(new THREE.ConeGeometry(0.014, 0.07, 6), L.iron, -0.04, 0.42, 0, 0, 0, PI / 2); add(new THREE.BoxGeometry(0.035, 0.07, 0.035), L.iron, 0, 0.42);
        break;
      }
      case 'mace': case 'maul': {
        const big = kind === 'maul';
        add(new THREE.CylinderGeometry(0.017, 0.02, big ? 0.75 : 0.5, 9), big ? L.wood : L.wrap, 0, big ? 0.23 : 0.15);
        if (big) { add(new THREE.BoxGeometry(0.2, 0.1, 0.1), L.iron, 0, 0.62); add(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 12), L.brass, 0, 0.62, 0.055, PI / 2); }
        else { add(new THREE.SphereGeometry(0.055, 12, 10), L.bronze, 0, 0.42); for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.012, 0.075, 0.03), L.bronze, Math.cos(i) * 0.05, 0.42, Math.sin(i) * 0.05, 0, -i, 0); }
        break;
      }
      case 'spear': case 'staff': {
        add(new THREE.CylinderGeometry(0.017, 0.019, 1.6, 9), L.wood, 0, 0.35);
        if (kind === 'spear') { for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.012, 0.16, 0.01), L.bronze, s * 0.02, 1.2); add(new THREE.BoxGeometry(0.06, 0.02, 0.02), L.bronze, 0, 1.12); }
        else { add(new THREE.SphereGeometry(0.028, 10, 8), L.wood, 0, 1.16); for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.02, 0.004, 4, 10), L.brass, 0, 0.9 + i * 0.03, 0, PI / 2); }
        break;
      }
      case 'pistol': {
        add(new THREE.CylinderGeometry(0.014, 0.016, 0.24, 10), L.dark, 0, 0.08, -0.12, PI / 2);
        add(new THREE.BoxGeometry(0.035, 0.05, 0.1), L.brass, 0, 0.08, -0.01);
        add(new THREE.BoxGeometry(0.03, 0.12, 0.05), L.wood, 0, 0.0, 0.03, -0.35);
        add(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x3fd0e8, emissive: 0x1a8aa0, emissiveIntensity: 0.8, roughness: 0.1 }), 0, 0.11, -0.03, PI / 2);
        g.rotation.x = -0.15; break;
      }
      case 'crossbow': {
        add(new THREE.BoxGeometry(0.04, 0.04, 0.5), L.wood, 0, 0.08, -0.15);
        add(new THREE.BoxGeometry(0.5, 0.02, 0.03), L.iron, 0, 0.09, -0.36);
        add(new THREE.BoxGeometry(0.008, 0.008, 0.4), L.steel, 0, 0.11, -0.2);
        break;
      }
      case 'fists': break;
      case 'sword': blade(0.62, 0.045, 0.032, 0.17, 0.13); break;
      default: blade(0.55, 0.044, 0.03, 0.17, 0.12);
    }
    return g;
  }
  // the light rig a viewmodel group carries: by default only when CORE's first-person scene is not there (it has its own)
  const vmLights = (opts) => (opts && opts.lights != null) ? !!opts.lights : !(typeof window !== 'undefined' && window.R11 && window.R11.vm && window.R11.vm.scene);
  const VM_KINDS = new Set(['glass-arm', 'sword', 'longsword', 'knife', 'axe', 'mace', 'maul', 'spear', 'staff', 'pistol', 'crossbow', 'fists', 'blade']);
  function viewmodel(kind, opts) {
    const THREE = T3(null); if (!THREE) return null;
    // CORE's names and raw weapon ids are welcome too: 'dagger', 'bow', 'glass', 'hands', or any key of WEAPONS
    kind = String(kind || 'blade');
    const ALIAS = { dagger: 'knife', bow: 'crossbow', glass: 'fists', hands: 'fists', fist: 'fists', hammer: 'mace' };
    if (ALIAS[kind]) kind = ALIAS[kind];
    else if (!VM_KINDS.has(kind)) { let k = 'blade'; try { if (typeof WEAPONS === 'object' && WEAPONS[kind]) k = kindFor(kind); } catch (e) { /* blade */ } kind = k; }
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    let built;
    if (kind === 'glass-arm') built = glassArm(THREE, opts);
    else {
      const L = leatherMats(THREE), group = new THREE.Group(); group.name = 'R11KIT:' + kind;
      const hand = new THREE.Group();
      const w = weapon(THREE, kind, L), f = fist(THREE, L, kind === 'fists'); hand.add(w, f);
      group.add(hand);
      // framed like bench1: lower right, the blade rising up and in toward the middle
      const two = kind === 'spear' || kind === 'staff' || kind === 'maul' || kind === 'crossbow', gun = kind === 'pistol' || kind === 'crossbow';
      const base = gun ? { p: V(0.2, -0.2, -0.38), r: V(0.05, 0.08, 0.0) }
        : kind === 'fists' ? { p: V(0.24, -0.25, -0.4), r: V(-0.3, -0.3, 0.6) }
        : { p: V(0.22, -0.175, -0.47), r: V(two ? -0.95 : -0.5, two ? -0.2 : 0.06, two ? 0.5 : 0.24) };
      if (gun) { hand.rotation.order = 'YXZ'; }
      hand.scale.setScalar(kind === 'fists' ? 1.1 : 0.9);
      hand.position.copy(base.p); hand.rotation.set(base.r.x, base.r.y, base.r.z);
      if (vmLights(opts)) {
        const hemi = new THREE.HemisphereLight(0xd9e2e6, 0x4a4036, 0.8); group.add(hemi);
        const key = new THREE.DirectionalLight(0xfff0dc, 1.1); key.position.set(-1, 2, 1); group.add(key);
      }
      built = { group, hand, base };
    }
    const { group, hand, base } = built;
    let lastWalk = null, amp = 0;
    return {
      group, kind,
      update(t, walk) {
        t = +t || 0; const wv = +walk || 0;
        const moving = lastWalk != null && Math.abs(wv - lastWalk) > 1e-4; lastWalk = wv;
        amp += ((moving ? 1 : 0) - amp) * 0.12;
        const side = kind === 'glass-arm' ? -1 : 1;
        const sx = Math.sin(t * 0.9 + (side > 0 ? 1.3 : 0)) * 0.004, sy = Math.sin(t * 1.3) * 0.005;
        const bx = Math.sin(wv) * 0.012 * amp * side, by = -Math.abs(Math.cos(wv)) * 0.016 * amp;
        hand.position.set(base.p.x + sx + bx, base.p.y + sy + by, base.p.z);
        hand.rotation.set(base.r.x + Math.sin(t * 0.7) * 0.012 + by * 0.6, base.r.y + sx * 1.5, base.r.z + Math.sin(t * 0.8) * 0.01);
        if (built.mats && built.mats.glass) built.mats.glass.uniforms.uPulse.value = 0.92 + 0.08 * Math.sin(t * 2.1);
      },
    };
  }

  return {
    TEXTS, dressMap, viewmodel, kindFor, setTier, countDraws, TIERS, units: UPM, kinds: () => [...VM_KINDS],
    ready: () => { const THREE = T3(null); return THREE ? loadProps(THREE) : Promise.resolve(null); },
    get debug() { return S.debug; }, set debug(v) { S.debug = !!v; },
    get last() { return S.last; },
    _internal: { findBuildings, kindOf, doorSide, heroTemplate },
  };
})();
if (typeof window !== 'undefined') window.R11KIT = R11KIT;
