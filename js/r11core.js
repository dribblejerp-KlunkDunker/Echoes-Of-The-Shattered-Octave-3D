// ============================================================
//  r11core — ROADMAP R11 phase 1, team CORE: R11, the REALISTIC renderer. A third renderer beside R3D (js/r3d21.js)
//  and the CPU raycaster (js/engine.js): the same maps, drawn with Three.js (window.R11THREE, js/r11three.mjs) in the
//  realistic style of proof/oakhaven-square (CC0 scanned materials, an overcast HDR sky, AgX, GTAO, bloom on what glows).
//
//  THE R11 CONTRACT (window.R11; KIT, HUD and BENCH code against it; guard every call):
//    R11.ready (bool: Three.js, the context, the sky and the scanned materials are loaded), R11.active() (the last frame
//    was drawn by R11), R11.owns() (R11 will draw the next frame: R3D steps aside), R11.style() 'realistic'|'pixel',
//    R11.setStyle(s), R11.tier() 'ultra'|'high'|'phone', R11.setTier(t).
//    R11.THREE, R11.renderer, R11.scene (the world; its map content is rebuilt per map), R11.camera, R11.vm = { scene,
//    camera } (first person: drawn after the world with the depth cleared, inside the tone-mapped output).
//    R11.mat(name, opts) -> a cached MeshStandardMaterial from assets/r11/tex/<name>_{diff,nor,arm}.jpg, opts
//    { color, rough, ns, metal }. R11.M = units per metre; R11.toWorld(mapX, mapY, gameZ) -> THREE.Vector3.
//    R11.on(ev, fn) / R11.off: 'mapbuilt' (map, ctx) once the world of a map is built, ctx = { scene, THREE, mat, tier,
//    M, toWorld, map, addLight(light, priority), hideCells(set) }; 'frame' (F) each frame (F.dt, F.t, F.walk, F.cam,
//    F.env, F.map, F.tod, F.P (the hour's light)); 'tier' (name); 'style' (name); 'ready' (once Three.js, the sky and the
//    scanned materials are in: R11.mat works from then on).
//    R11.paused / R11.renderOnce() for screenshots. R11.stats (draws, world draws, billboards, ...).
//    KIT's dressMap result may carry replaced: Set<entity> (entities KIT draws as 3D models): R11 draws no billboard for
//    those (R11.replaced()); picking and gameplay still see them as always.
//
//  SPACE. Three.js y-up: three.x = map x (cells), three.z = map y (cells), three.y = game height x R3D.ZK (0.61875). The
//  camera is Engine.cam mapped exactly as R3D maps it (look angle atan(pitch / FX), the head bob as a lens shift), with
//  the frustum extended below R3D's 150 logical rows to the whole canvas (the top 150 rows are R3D's picture).
//  SCALE (CORE's correction to the brief's 0.1875): the standing eye is cam.z = 0.88 game units (engine.js: "people are one
//  tile tall"), 0.88 x ZK = 0.545 units; at 1.65 m that is R11.M = 0.330 units per metre: a cell is 3.03 m, a full wall
//  (1 game unit) 1.88 m, Oakhaven's 1.7 roofs 3.2 m. Changed in one place: M below.
//
//  GAMEPLAY never reads R11: Engine.pick under R11 is R3D.pick on R3D's virtual CPU frame of the same camera (exactly the
//  raycaster's rule), ent._screen is the rect the CPU frame would give, Engine.depthAt/materialAt answer from that frame.
//  Activation: style 'realistic' (the default) and hardware WebGL 2 (R3D's test); Pixel = R3D or the raycaster as before.
//  Automation (navigator.webdriver) keeps R11 off unless window.__r11 = { automation: true } (add force: true to accept a
//  software rasteriser). Storage: localStorage 'octave.r11.v1' (merged object, shared with BENCH): { style, tier }.
//  A throw in a frame or a lost context hands the frame back to R3D / the raycaster for the session (logged once).
// ============================================================
'use strict';

const R11 = (() => {
  // ================================================================================================ MATERIAL TABLE
  // Base materials: one draw call each in the world mesh. 'scan' = a CC0 Poly Haven material under assets/r11/tex;
  // rep = metres per texture repeat (world-space UVs at a fixed texel density); 'plain' = a PBR colour (with a small
  // procedural breakup texture) for what no scan covers. Vertex colours carry the per-texture tint below.
  const BASE = {
    cobble:  { scan: 'cobblestone_floor_08', rep: 1.6, rough: 0.62, ns: 1.4 },     // damp cobbles: lower roughness
    stone:   { scan: 'rustic_stone_wall', rep: 2.4 },
    blocks:  { scan: 'medieval_blocks_02', rep: 2.6 },                              // dressed stone, flags, marble
    plaster: { scan: 'white_plaster_rough_02', rep: 2.0 },
    wood:    { scan: 'medieval_wood', rep: 1.2 },
    planks:  { scan: 'weathered_planks', rep: 1.4 },
    slate:   { scan: 'roof_slates_02', rep: 2.0, ns: 1.2 },
    bark:    { scan: 'bark_brown_02', rep: 1.4, ns: 1.6 },
    grass:   { plain: 0xffffff, rough: 0.97, noise: 'grass', rep: 1.4 },
    earth:   { plain: 0xffffff, rough: 0.95, noise: 'earth', rep: 3 },
    hedge:   { plain: 0xffffff, rough: 0.98, noise: 'hedge', rep: 1.2 },          // thorn, with flecks of packed wool (canon)
    thatch:  { plain: 0xffffff, rough: 1, noise: 'thatch', rep: 1.5 },
    snow:    { plain: 0xe6eaee, rough: 0.82, noise: 'grey', rep: 4 },
    glass:   { plain: 0x24505c, rough: 0.08, metal: 0.1, noise: null },             // Light-glass: the resonance hue
    metal:   { plain: 0x3a3b3d, rough: 0.5, metal: 0.85, noise: null },
    brass:   { plain: 0x9c7a3c, rough: 0.4, metal: 1, noise: null },
    dark:    { plain: 0x0e0d0c, rough: 1, noise: null },
    flat:    { plain: 0xffffff, rough: 0.9, noise: 'grey', rep: 3 },              // any unmapped texture: its mean colour
  };
  // game texture -> [base, tint]. Unknown names go through KEYWORDS, then fall back to 'flat' in the texture's mean colour.
  const TEX = {
    t_cobble: ['cobble', 0xb9b4ad], t_flag: ['blocks', 0xa8a39b], t_stone: ['stone', 0xd8d2c8], t_stone_p20b_1: ['stone', 0xc8c2b8], t_stone_p20b_2: ['stone', 0xb8b4ac],
    t_house: ['plaster', 0xe0d6c4], t_house_p20b_1: ['plaster', 0xdccfb8], t_house_p20b_2: ['plaster', 0xcfc4ae], t_house_p20b_3: ['plaster', 0xd4c9b0],
    t_roof: ['slate', 0x9aa0a6], t_wood: ['wood', 0x8a7a68], t_door: ['planks', 0xa08a70], t_hedge: ['hedge', 0xffffff], t_grass: ['grass', 0xffffff],
    t_grass_p20b_a: ['grass', 0xf2f4ea], t_grass_p20b_b: ['grass', 0xe4e8d8], t_grass_p20b_c: ['grass', 0xfaf2e0], t_grass_p20b_d: ['grass', 0xe8eee0],
    t_moss: ['grass', 0xb8c4a8], t_moss_p20b_a: ['grass', 0xb0bca0], t_moss_p20b_b: ['grass', 0xc0c8b0],
    t_water: ['water', 0], t_shallows: ['water', 1], t_marble: ['blocks', 0xe4e0d8], t_greymarble: ['blocks', 0xb4b4b2], t_mausoleum: ['blocks', 0x9a968e],
    t_glassrock: ['glass', 0xffffff], t_brass: ['brass', 0xffffff], t_catacomb: ['stone', 0x8a8478], t_deepwood: ['wood', 0x5a4a3a],
    t_p20_chalk: ['blocks', 0xeae6dc], t_p20_track: ['earth', 0xffffff], t_p20_gate: ['planks', 0x9a8670],
    t_p22_flint: ['stone', 0x7a7670], t_p22_lime: ['plaster', 0xe4dccb], t_p22_thatch: ['thatch', 0xffffff], t_p22_meadow: ['grass', 0xf0f0e0],
    t_p22_litter: ['earth', 0xd8c8b0], t_p22_litter2: ['earth', 0xc8b8a0], t_p22_sarsenwall: ['stone', 0xa8a294],
    t_lib_shelves: ['wood', 0x6a5644], t_lib_shelves_dust: ['wood', 0x7a6a5a], t_p30_bluedoor: ['planks', 0x6a7a98],
    c_beams: ['wood', 0x7a6a58], c_vault: ['blocks', 0xa8a298], c_rock: ['stone', 0x6a645c],
    gates_bars: ['metal', 0xffffff], gates_bars_closed: ['metal', 0xffffff], gates_rubble: ['stone', 0x9a948a],
    p9p_reedstone: ['stone', 0xa09a88], p15r_char_a: ['stone', 0x4a4440], p15r_char_b: ['stone', 0x3e3834], p15r_char_c: ['stone', 0x554e48], p15r_burn: ['wood', 0x3a3028],
    p16f_grown: ['bark', 0x9a8a78], p16f_grown2: ['bark', 0x8a7a68], p16f_grown3: ['bark', 0xa09080], p16f_knot: ['bark', 0x7a6a58], p16f_gate: ['planks', 0x9a8670],
    p16d_airceil: ['plaster', 0xd8d0c0], p16d_drawers: ['wood', 0x7a6a58], p16d_counter: ['wood', 0x8a7a68], p16h_rock: ['stone', 0x7a7268],
    p17p_snowroad: ['snow', 0xd8d8d4], p17p_snow: ['snow', 0xffffff], p17p_leaves: ['earth', 0xb08860], p17p_leaves2: ['earth', 0xa07850], p17p_hedge: ['hedge', 0xf0f4f0],
    p17p_woods: ['bark', 0x8a7a68], p17p_bark: ['bark', 0xa09080], p17p_gate: ['planks', 0x9a8670], p17p_post: ['wood', 0x7a6a58], p17p_rivergate: ['planks', 0x8a7a68],
    p17c_cliff: ['stone', 0x8a8278], p17c_stlo: ['stone', 0xb0aaa0], p17c_sthi: ['stone', 0xc0bab0], p17c_mole: ['blocks', 0x9a958c], p17c_flags: ['blocks', 0xa8a39b],
    p17c_plank: ['planks', 0xa08a70], p17c_quay: ['blocks', 0x9a958c], p17c_retain: ['stone', 0xa8a298], p17c_retain2: ['stone', 0x9a9488], p17c_retain3: ['stone', 0xb0aaa0],
    p17c_plaster: ['plaster', 0xd8ccb4], p17c_plaster2: ['plaster', 0xcfc4ae], p17c_plaster3: ['plaster', 0xe0d4bc], p17c_parapet: ['blocks', 0xb4aea4],
    p17c_front: ['plaster', 0xd4c8b0], p17c_front2: ['plaster', 0xcabea6], p17c_front3: ['plaster', 0xdcd0b8], p17c_turf: ['grass', 0xf0f0e0], p17c_turf2: ['grass', 0xe0e4d0],
    p17c_ashlar: ['blocks', 0xc4beb4], p17c_shutter: ['planks', 0x8a7a68], p17c_slate: ['slate', 0x9aa0a6], p17c_rail: ['wood', 0x6a5a48], p17c_door: ['planks', 0x9a8470],
    ln17_depth: ['dark', 0xffffff], ln17_snow: ['snow', 0xffffff], ln17_wall: ['stone', 0xb0aaa0], ln17_wall2: ['stone', 0xa09a90], ln17_rail: ['wood', 0x6a5a48],
    ln17_coping: ['blocks', 0xb4aea4], ln17_stairhole: ['dark', 0xffffff], d18_down: ['dark', 0xffffff], d18_up: ['dark', 0xffffff],
    p16k_deck: ['planks', 0x9a8670], r3d_dark: ['dark', 0xffffff],
  };
  const KEYWORDS = [
    [/water/, 'water'], [/shallow/, 'water'], [/glass/, 'glass'], [/brass|iron|bars|steel/, 'metal'], [/snow/, 'snow'], [/thatch/, 'thatch'],
    [/hedge|thorn/, 'hedge'], [/grass|turf|meadow|moss|lawn/, 'grass'], [/leaves|litter|track|mud|earth|path/, 'earth'], [/cobble/, 'cobble'],
    [/roof|slate|tile/, 'slate'], [/bark|grown|knot|tree/, 'bark'], [/door|plank|deck|shutter|gate|board/, 'planks'], [/wood|beam|rail|post|shel|counter|drawer/, 'wood'],
    [/plaster|house|front|lime|ceil/, 'plaster'], [/flag|marble|ashlar|quay|mole|block|vault|coping|parapet|chalk|tomb|maus/, 'blocks'],
    [/stone|rock|cliff|wall|retain|flint|sarsen|catacomb|crypt|cave/, 'stone'],
  ];

  // ================================================================================================ constants, state
  const KEY = 'octave.r11.v1';
  const ZK = 0.61875, FX = 160 / 0.66, LOG_W = 320, LOG_H = 150;
  const M = 0.88 * ZK / 1.65;                     // units per metre (see the header)
  const TIERS = {
    ultra: { dpr: 2, shadow: 2048, shadowR: 16, ao: true, bloom: true, smaa: true, lamps: 8, aniso: 8 },
    high:  { dpr: 1.25, shadow: 1024, shadowR: 12, ao: true, bloom: true, smaa: true, lamps: 4, aniso: 4 },
    phone: { dpr: 1, shadow: 1024, shadowR: 8, ao: false, bloom: false, smaa: false, lamps: 1, aniso: 2 },
  };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const opts0 = (typeof window !== 'undefined' && window.__r11 && typeof window.__r11 === 'object') ? window.__r11 : {};
  const automation = (() => { try { return !!(typeof navigator !== 'undefined' && navigator.webdriver); } catch (e) { return false; } })();
  const allowed = !automation || opts0.automation === true;
  const MAT = (typeof Engine !== 'undefined' && Engine.MAT) || { other: 0, sky: 1, water: 2, shallows: 3, wall: 4, ground: 5, sprite: 6, ceiling: 7, glow: 8 };

  const st = {
    style: 'realistic', tier: null, storedTier: false,
    loaded: false, ready: false, loading: false, available: null, software: false, renderer: '', lost: false, failed: false, failWhy: '',
    shown: false, inFrame: false, drew: false, renderOnce: false, warned: {},
  };
  const stats = { frames: 0, draws: 0, worldDraws: 0, worldMeshes: 0, tris: 0, billboards: 0, lights: 0, builds: 0, buildMs: 0, atlasPages: 0, atlasSprites: 0, last: null };
  const warnOnce = (k, e) => { if (st.warned[k]) return; st.warned[k] = true; console.warn('r11core ' + k, e); };

  // ---------------------------------------------------------------------------------------------------- events
  const ev = {};
  function on(name, fn) { (ev[name] || (ev[name] = [])).push(fn); return fn; }
  function off(name, fn) { const l = ev[name]; if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  function emit(name, a, b) { const l = ev[name]; if (!l) return; for (let i = 0; i < l.length; i++) { try { l[i](a, b); } catch (e) { warnOnce('hook ' + name, e); } } }

  // ---------------------------------------------------------------------------------------------------- settings
  function readStore() { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function writeStore(patch) {
    if (!allowed) return;
    try { const o = readStore(); Object.assign(o, patch); localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* no storage */ }
  }
  function load() {
    const o = readStore();
    if (o.style === 'realistic' || o.style === 'pixel') st.style = o.style;
    if (TIERS[o.tier]) { st.tier = o.tier; st.storedTier = true; }
    if (opts0.style === 'realistic' || opts0.style === 'pixel') st.style = opts0.style;
    if (TIERS[opts0.tier]) st.tier = opts0.tier;
    if (!st.tier) {
      let t = null;
      try { if (typeof R11BENCH !== 'undefined' && R11BENCH && typeof R11BENCH.autoTier === 'function') t = R11BENCH.autoTier(); } catch (e) { t = null; }
      if (!TIERS[t]) { let coarse = false; try { coarse = matchMedia('(pointer: coarse)').matches; } catch (e) { /* fine */ } t = automation ? 'phone' : coarse ? 'phone' : 'ultra'; }
      st.tier = t;
    }
  }
  function originalish() {
    if (typeof GFX === 'undefined') return false;
    if (GFX.preset === 'plain' || GFX.preset === 'original') return true;
    try { return typeof PRESETS !== 'undefined' && PRESETS.current() === 'original'; } catch (e) { return false; }
  }

  // ---------------------------------------------------------------------------------------------------- Three.js
  let T3 = null, THREE = null, renderer = null, canvas = null, gl = null;
  const R = { scene: null, camera: null, vmScene: null, vmCam: null, world: null, sky: null, sun: null, hemi: null, pool: [], env: null, hdr: null, composer: null, passes: {} };

  const SOFT = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
  function makeCanvas() {
    if (canvas || typeof document === 'undefined') return canvas;
    const view = document.getElementById('view'); if (!view || !view.parentNode) return null;
    if (!document.getElementById('r11-css')) {
      const s = document.createElement('style'); s.id = 'r11-css';
      s.textContent = '#r11-gl{position:absolute;inset:0;width:100%;height:100%;display:none;pointer-events:none}' +
        '#game.r11-on #r11-gl{display:block}#game.r11-on #r3d21-gl{display:none!important}#r11-gl.unwrite{filter:saturate(0.2) contrast(0.9)}';
      document.head.appendChild(s);
    }
    canvas = document.createElement('canvas'); canvas.id = 'r11-gl'; canvas.setAttribute('aria-hidden', 'true');
    const after = document.getElementById('r3d21-gl') || document.getElementById('gpu18-gl') || view;
    after.insertAdjacentElement('afterend', canvas);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); st.lost = true; fail(new Error('WebGL context lost')); }, false);
    try { new MutationObserver(() => { canvas.classList.toggle('unwrite', view.classList.contains('unwrite')); }).observe(view, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* old browser */ }
    try {
      const game = document.getElementById('game');
      if (typeof ResizeObserver !== 'undefined' && game) new ResizeObserver(() => { sizeDirty = true; }).observe(game);
      window.addEventListener('resize', () => { sizeDirty = true; });
    } catch (e) { /* fine */ }
    return canvas;
  }
  // a hardware context first (R3D's test); a software one only when the page forces it (tests)
  function probe() {
    if (gl) return true;
    if (!makeCanvas()) { st.available = false; return false; }
    const attrs = { alpha: false, antialias: false, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
    let g = null;
    try { g = canvas.getContext('webgl2', Object.assign({ failIfMajorPerformanceCaveat: true }, attrs)); } catch (e) { g = null; }
    if (!g && opts0.force) { try { g = canvas.getContext('webgl2', attrs); } catch (e) { g = null; } if (g) st.software = true; }
    if (!g) { st.available = false; return false; }
    try {
      const ext = g.getExtension('WEBGL_debug_renderer_info');
      st.renderer = String(ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER) || '');
      if (SOFT.test(st.renderer)) st.software = true;
    } catch (e) { /* hidden */ }
    if (st.software && !opts0.force) { st.available = false; return false; }
    gl = g; st.available = true;
    return true;
  }

  // ---- textures and materials
  const texCache = new Map(), matCache = new Map(), shared = new Set();
  let loader = null, pending = 0, maxAniso = 1;
  const base = () => { try { return (document.querySelector('base') ? '' : '') + 'assets/r11/'; } catch (e) { return 'assets/r11/'; } };
  function tex(file, srgb) {
    let t = texCache.get(file);
    if (t) return t;
    pending++;
    t = loader.load(base() + 'tex/' + file, () => { pending--; }, undefined, (e) => { pending--; warnOnce('texture ' + file, e); });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(maxAniso, TIERS[st.tier].aniso);
    texCache.set(file, t); shared.add(t);
    return t;
  }
  // R11.mat: one scanned material (Poly Haven, CC0): colour, normal, and AO/roughness/metal packed
  function mat(name, o) {
    o = o || {};
    const key = name + '|' + (o.color == null ? '' : o.color) + '|' + (o.rough == null ? '' : o.rough) + '|' + (o.ns == null ? '' : o.ns) + '|' + (o.metal == null ? '' : o.metal) + '|' + (o.vc ? 1 : 0);
    let m = matCache.get(key);
    if (m) return m;
    const arm = tex(name + '_arm.jpg', false);
    m = new THREE.MeshStandardMaterial({
      map: tex(name + '_diff.jpg', true), normalMap: tex(name + '_nor.jpg', false),
      aoMap: arm, roughnessMap: arm, metalnessMap: arm, roughness: o.rough == null ? 1 : o.rough, metalness: o.metal == null ? 1 : o.metal,
      color: o.color == null ? 0xffffff : o.color, normalScale: new THREE.Vector2(o.ns == null ? 1 : o.ns, o.ns == null ? 1 : o.ns), aoMapIntensity: 1,
      vertexColors: !!o.vc,
    });
    m.userData.r11shared = true;
    matCache.set(key, m);
    return m;
  }
  // small tileable breakup textures for the plain materials (seeded: the same every run)
  function noiseTex(kind) {
    const k = 'noise:' + kind; let t = texCache.get(k); if (t) return t;
    const N = 128, data = new Uint8Array(N * N * 4);
    let s = 1234 + kind.length * 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const grid = (f) => { const g = new Float32Array(f * f); for (let i = 0; i < g.length; i++) g[i] = rnd(); return g; };
    const octs = [grid(4), grid(8), grid(16), grid(32), grid(64)];
    const val = (g, f, x, y) => { const fx = x * f / N, fy = y * f / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const a = g[(y0 % f) * f + (x0 % f)], b = g[(y0 % f) * f + ((x0 + 1) % f)], c = g[((y0 + 1) % f) * f + (x0 % f)], d = g[((y0 + 1) % f) * f + ((x0 + 1) % f)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty); return mix(mix(a, b, sx), mix(c, d, sx), sy); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = val(octs[0], 4, x, y) * 0.36 + val(octs[1], 8, x, y) * 0.26 + val(octs[2], 16, x, y) * 0.18 + val(octs[3], 32, x, y) * 0.12 + val(octs[4], 64, x, y) * 0.08;
      const fine = rnd();
      let r, g, b;
      // colours in sRGB 0..1: late-autumn turf, earth, the Hedge's thorn (with flecks of packed wool), straw
      const v = 0.8 + 0.4 * n + 0.14 * (fine - 0.5);
      if (kind === 'grass') { const dry = smooth(0.5, 0.78, n), blade = 0.7 + 0.6 * fine; r = mix(0.2, 0.42, dry) * v * blade; g = mix(0.3, 0.35, dry) * v * blade; b = mix(0.09, 0.15, dry) * v * blade; }
      else if (kind === 'earth') { r = 0.34 * v; g = 0.27 * v; b = 0.19 * v; }
      else if (kind === 'hedge') { const k = 0.55 + 0.9 * n * n + 0.35 * (fine - 0.5); r = 0.15 * k; g = 0.2 * k; b = 0.11 * k; if (fine > 0.985 && n > 0.45) { r = 0.82; g = 0.79; b = 0.72; } }
      else if (kind === 'thatch') { const str = 0.5 + 0.5 * Math.sin((x * 0.9 + n * 20)); const k = 0.7 + 0.35 * n + 0.15 * str; r = 0.55 * k; g = 0.46 * k; b = 0.28 * k; }
      else { r = g = b = 0.62 * v; }
      const o = (y * N + x) * 4; data[o] = clamp(r * 255, 0, 255); data[o + 1] = clamp(g * 255, 0, 255); data[o + 2] = clamp(b * 255, 0, 255); data[o + 3] = 255;
    }
    t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    texCache.set(k, t); shared.add(t);
    return t;
  }
  // the water's moving normals: a tileable normal map from a sum of waves
  function waterNormals() {
    let t = texCache.get('water:n'); if (t) return t;
    const N = 128, data = new Uint8Array(N * N * 4), TAU = Math.PI * 2;
    const W = [[1, 2, 0.35], [3, -1, 0.22], [-2, 3, 0.16], [5, 4, 0.08], [-6, 1, 0.07], [2, -7, 0.05]];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0;
      for (const [a, b, k] of W) { const ph = TAU * (a * x + b * y) / N + a * 1.7; dx += Math.cos(ph) * a * k; dy += Math.cos(ph) * b * k; }
      const nx = -dx * 0.18, ny = -dy * 0.18, l = Math.hypot(nx, ny, 1), o = (y * N + x) * 4;
      data[o] = (nx / l * 0.5 + 0.5) * 255; data[o + 1] = (ny / l * 0.5 + 0.5) * 255; data[o + 2] = (1 / l * 0.5 + 0.5) * 255; data[o + 3] = 255;
    }
    t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    texCache.set('water:n', t); shared.add(t);
    return t;
  }
  // a game texture (Uint32 ABGR, 64x64 or so) as a Three texture (decals, gate lattices)
  function gameTex(name, alphaOnly) {
    const k = 'game:' + name + (alphaOnly ? ':a' : ''); let t = texCache.get(k); if (t) return t;
    const d = Engine.textures[name]; if (!d) return null;
    const n = Math.round(Math.sqrt(d.length)), data = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) { const p = d[i]; data[i * 4] = p & 255; data[i * 4 + 1] = (p >>> 8) & 255; data[i * 4 + 2] = (p >>> 16) & 255; data[i * 4 + 3] = (p >>> 24) & 255; }
    t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    texCache.set(k, t); shared.add(t);
    return t;
  }
  const baseMats = {};
  function baseMat(key) {
    if (baseMats[key]) return baseMats[key];
    const b = BASE[key]; let m;
    if (key === 'water') {
      m = new THREE.MeshStandardMaterial({ color: 0x0e1418, roughness: 0.06, metalness: 0, normalMap: waterNormals(), normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.6, vertexColors: true });
    } else if (b.scan) {
      m = mat(b.scan, { rough: b.rough, ns: b.ns, vc: true });
    } else {
      m = new THREE.MeshStandardMaterial({ color: b.plain, roughness: b.rough, metalness: b.metal || 0, map: b.noise ? noiseTex(b.noise) : null, vertexColors: true });
      if (key === 'glass') { m.emissive = new THREE.Color(0x1a6a7a); m.emissiveIntensity = 0.35; }
    }
    m.userData.r11shared = true;
    baseMats[key] = m;
    return m;
  }
  // texture name -> { key, tint: THREE.Color (linear), rep (units per repeat) }
  const texInfo = new Map();
  function meanColour(name) {
    const d = Engine.textures[name]; if (!d) return [0.5, 0.5, 0.5];
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 3) { const p = d[i]; if ((p >>> 24) < 100) continue; r += p & 255; g += (p >>> 8) & 255; b += (p >>> 16) & 255; n++; }
    return n ? [r / n / 255, g / n / 255, b / n / 255] : [0.5, 0.5, 0.5];
  }
  function info(name) {
    let o = texInfo.get(name); if (o) return o;
    let e = TEX[name], key, tint;
    if (!e && name) { const l = name.toLowerCase(); for (const [re, k] of KEYWORDS) if (re.test(l)) { e = [k, 0xffffff]; break; } }
    if (e) { key = e[0]; tint = new THREE.Color(); if (key === 'water') tint.setRGB(e[1] ? 1.25 : 1, e[1] ? 1.2 : 1, e[1] ? 1.1 : 1); else tint.setHex(e[1], THREE.SRGBColorSpace); }
    else { key = 'flat'; const c = meanColour(name); tint = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); }
    const b = BASE[key] || { rep: 2 };
    o = { key, tint, rep: (b.rep || 2) * M, shallow: name === 't_shallows' };
    texInfo.set(name, o);
    return o;
  }

  // ================================================================================================ the world mesh
  // Buckets of triangles per base material, in world space (Three's y-up), merged into one mesh each.
  function Buckets() { this.b = new Map(); this.tris = 0; }
  Buckets.prototype.get = function (key) {
    let o = this.b.get(key);
    if (!o) { o = { p: [], n: [], uv: [], c: [], i: [], nv: 0 }; this.b.set(key, o); }
    return o;
  };
  const _a = [0, 0, 0], _b2 = [0, 0, 0], _c = [0, 0, 0];
  // a quad of four three-space points (any winding) facing along nrm; uvMode: 'w' world (by the dominant axis), or
  // explicit uvs [u0,v0,...]; tint THREE.Color; jitter brightness
  Buckets.prototype.quad = function (key, P, nrm, rep, tint, k, uvs) {
    const o = this.get(key), v0 = o.nv;
    for (let j = 0; j < 4; j++) {
      const p = P[j]; o.p.push(p[0], p[1], p[2]);
      const nn = nrm.length === 4 ? nrm[j] : nrm;
      o.n.push(nn[0], nn[1], nn[2]);
      if (uvs) o.uv.push(uvs[j * 2], uvs[j * 2 + 1]);
      else {
        const ax = Math.abs(nn[0]), ay = Math.abs(nn[1]), az = Math.abs(nn[2]);
        let u, v;
        if (ay >= ax && ay >= az) { u = p[0]; v = p[2]; } else if (ax >= az) { u = p[2]; v = p[1]; } else { u = p[0]; v = p[1]; }
        o.uv.push(u / rep, v / rep);
      }
      o.c.push(tint.r * k, tint.g * k, tint.b * k);
    }
    o.nv += 4;
    // winding: front face along the normal
    const A = P[0], B = P[1], C = P[2], n0 = nrm.length === 4 ? nrm[0] : nrm;
    _a[0] = B[0] - A[0]; _a[1] = B[1] - A[1]; _a[2] = B[2] - A[2]; _b2[0] = C[0] - A[0]; _b2[1] = C[1] - A[1]; _b2[2] = C[2] - A[2];
    _c[0] = _a[1] * _b2[2] - _a[2] * _b2[1]; _c[1] = _a[2] * _b2[0] - _a[0] * _b2[2]; _c[2] = _a[0] * _b2[1] - _a[1] * _b2[0];
    const dot = _c[0] * n0[0] + _c[1] * n0[1] + _c[2] * n0[2];
    if (dot >= 0) o.i.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3); else o.i.push(v0, v0 + 2, v0 + 1, v0, v0 + 3, v0 + 2);
    this.tris += 2;
  };
  const T = (x, y, z) => [x, z * ZK, y];        // map (x, y, game z) -> three

  // ---- map helpers (game units), as R3D's
  function cellGround(m, cx, cy, fx, fy) {
    const i = cy * m.w + cx;
    if (m.smooth && m.smooth[i]) {
      const W1 = m.w + 1, v = cy * W1 + cx, V = m.verts;
      return (V[v] * (1 - fx) + V[v + 1] * fx) * (1 - fy) + (V[v + W1] * (1 - fx) + V[v + W1 + 1] * fx) * fy;
    }
    return m.lvls ? m.lvls[i] : 0;
  }
  function ground(m, x, y) {
    const cx = Math.min(m.w - 1, Math.max(0, Math.floor(x))), cy = Math.min(m.h - 1, Math.max(0, Math.floor(y)));
    return cellGround(m, cx, cy, clamp(x - cx, 0, 1), clamp(y - cy, 0, 1));
  }
  const isBlock = (c) => !!(c && !c.door);
  const wallTop0 = (m) => (m.ceil ? (m.ceilZ || 1) : 0);
  const cellHash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };

  function buildWorld(m, hidden) {
    const t0 = now();
    const B = new Buckets();
    const relief = !!m.relief, W = m.w, H = m.h, grid = m.cells;
    const has = (n) => !!(n && Engine.textures[n]);
    const floorDef = m.floor || 't_flag';
    const texOfFloor = (cx, cy) => { if (m.floorCells && m.floorTextures) { const idx = m.floorCells[cy * W + cx]; if (idx && has(m.floorTextures[idx])) return m.floorTextures[idx]; } return has(floorDef) ? floorDef : 't_flag'; };
    const sideOf = (cx, cy) => { const n = m.sideTex && m.sideTex[cy * W + cx]; return has(n) ? n : texOfFloor(cx, cy); };
    const wTop0 = wallTop0(m);
    const blockTop = (c, cx, cy, fx, fy) => relief ? (c.top != null ? c.top : Math.max(cellGround(m, cx, cy, fx, fy) + 1, wTop0)) : (c.top != null ? c.top : 1);
    const surfAt = (cx, cy, fx, fy) => { const c = grid[cy * W + cx]; if (isBlock(c)) return blockTop(c, cx, cy, fx, fy); return relief ? cellGround(m, cx, cy, fx, fy) : 0; };
    const decals = m.decals || null;
    const decOf = (ci) => { const n = decals && decals[ci]; return has(n) ? n : null; };
    const hid = (ci) => !!(hidden && hidden.has(ci));
    const jit = (cx, cy) => 0.93 + 0.14 * cellHash(cx, cy);
    const surfKey = (name) => { const I = info(name); return I; };
    // ---- ground and caps
    const SM = m.smooth, VV = m.verts, W1 = W + 1, cg = (relief && SM && VV) ? new Float32Array(W1 * (H + 1) * 2) : null;
    if (cg) for (let vy = 0; vy <= H; vy++) for (let vx = 0; vx <= W; vx++) {
      let gx = 0, gy = 0, n = 0;
      for (let k = 0; k < 4; k++) {
        const cx2 = vx - 1 + (k & 1), cy2 = vy - 1 + (k >> 1);
        if (cx2 < 0 || cy2 < 0 || cx2 >= W || cy2 >= H || !SM[cy2 * W + cx2] || isBlock(grid[cy2 * W + cx2])) continue;
        const v0 = cy2 * W1 + cx2, fx = vx - cx2, fy = vy - cy2;
        gx += VV[v0 + fy * W1 + 1] - VV[v0 + fy * W1]; gy += VV[v0 + W1 + fx] - VV[v0 + fx]; n++;
      }
      const o = (vy * W1 + vx) * 2; cg[o] = n ? gx / n : 0; cg[o + 1] = n ? gy / n : 0;
    }
    const UP = [0, 1, 0], DOWN = [0, -1, 0];
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const ci = cy * W + cx, c = grid[ci];
      if (hid(ci)) continue;
      if (isBlock(c)) {
        const top = blockTop(c, cx, cy, 0.5, 0.5);
        const capName = has(c.capTex) ? c.capTex : has(c.tex) ? c.tex : 't_stone';
        const I = surfKey(capName);
        B.quad(I.key, [T(cx, cy, top), T(cx + 1, cy, top), T(cx + 1, cy + 1, top), T(cx, cy + 1, top)], UP, I.rep, I.tint, jit(cx, cy));
        continue;
      }
      const name = texOfFloor(cx, cy), I = surfKey(name);
      const sink = I.key === 'water' ? -0.05 : 0;
      if (relief && SM && SM[ci]) {
        const o00 = (cy * W1 + cx) * 2, o10 = o00 + 2, o01 = o00 + W1 * 2, o11 = o01 + 2;
        const pt = [], nr = [];
        for (let j = 0; j <= 2; j++) for (let i = 0; i <= 2; i++) {
          const fx = i / 2, fy = j / 2, z = cellGround(m, cx, cy, fx, fy) + sink;
          const gx = (cg[o00] * (1 - fx) + cg[o10] * fx) * (1 - fy) + (cg[o01] * (1 - fx) + cg[o11] * fx) * fy;
          const gy = (cg[o00 + 1] * (1 - fx) + cg[o10 + 1] * fx) * (1 - fy) + (cg[o01 + 1] * (1 - fx) + cg[o11 + 1] * fx) * fy;
          const nx = -gx * ZK, ny = -gy * ZK, nl = Math.hypot(nx, ny, 1);
          pt.push(T(cx + fx, cy + fy, z)); nr.push([nx / nl, 1 / nl, ny / nl]);
        }
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const a = j * 3 + i; B.quad(I.key, [pt[a], pt[a + 1], pt[a + 4], pt[a + 3]], [nr[a], nr[a + 1], nr[a + 4], nr[a + 3]], I.rep, I.tint, jit(cx, cy)); }
      } else {
        const z = (relief && m.lvls ? m.lvls[ci] : 0) + sink;
        B.quad(I.key, [T(cx, cy, z), T(cx + 1, cy, z), T(cx + 1, cy + 1, z), T(cx, cy + 1, z)], UP, I.rep, I.tint, jit(cx, cy));
      }
    }
    // ---- outdoors on flat ground: the floor runs on past the map's edge (as the CPU's does), under KIT's far ring
    if (m.outdoor && !m.lvls && !m.verts) {
      const I = surfKey(has(floorDef) ? floorDef : 't_flag'), Rr = 60;
      for (const [x0, y0, x1, y1] of [[-Rr, -Rr, W + Rr, 0], [-Rr, H, W + Rr, H + Rr], [-Rr, 0, 0, H], [W, 0, W + Rr, H]]) B.quad(I.key, [T(x0, y0, 0), T(x1, y0, 0), T(x1, y1, 0), T(x0, y1, 0)], UP, I.rep, I.tint, 1);
    }
    // ---- vertical faces where a cell stands higher than its neighbour (exposed faces only)
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const edge = (ax, ay, d) => d === 0 ? [ax + 1, ay, ax + 1, ay + 1, 1, 0] : d === 1 ? [ax, ay, ax, ay + 1, -1, 0] : d === 2 ? [ax, ay + 1, ax + 1, ay + 1, 0, 1] : [ax, ay, ax + 1, ay, 0, -1];
    const EPS = 0.02;
    const pushSub = (ax, ay, d, t0, t1, z0a, z0b, z1a, z1b, name, dec, vTa, vTb) => {
      const [xa, ya, xb, yb, nx, ny] = edge(ax, ay, d), I = surfKey(name);
      const X0 = xa + (xb - xa) * t0, Y0 = ya + (yb - ya) * t0, X1 = xa + (xb - xa) * t1, Y1 = ya + (yb - ya) * t1;
      const N = [nx, 0, ny], k = jit(ax, ay) * (d >= 2 ? 0.97 : 1);
      B.quad(I.key, [T(X0, Y0, z0a), T(X1, Y1, z0b), T(X1, Y1, z1b), T(X0, Y0, z1a)], N, I.rep, I.tint, k);
      if (dec) {
        // the game's own decal (moss, posters, cracks) on the face, a hair in front; u per cell as the CPU's face rule
        let ua = (d === 0 || d === 3) ? 0 : 1, ub = 1 - ua; const U0 = ua + (ub - ua) * t0, U1 = ua + (ub - ua) * t1, e = 0.004;
        B.quad('decal:' + dec, [T(X0 + nx * e, Y0 + ny * e, z0a), T(X1 + nx * e, Y1 + ny * e, z0b), T(X1 + nx * e, Y1 + ny * e, z1b), T(X0 + nx * e, Y0 + ny * e, z1a)], N, 1, WHITE, 1,
          [U0, vTa - z0a, U1, vTb - z0b, U1, vTb - z1b, U0, vTa - z1a]);
      }
    };
    const piece = (ax, ay, d, na, nb, sa, sb, name, dec, vTa, vTb) => {
      const da = sa - na, db = sb - nb;
      if (da <= EPS && db <= EPS) return;
      if (da > EPS && db > EPS) { pushSub(ax, ay, d, 0, 1, na, nb, sa, sb, name, dec, vTa, vTb); return; }
      const t = da / (da - db), nm = na + (nb - na) * t, vm = vTa + (vTb - vTa) * t;
      if (da > EPS) pushSub(ax, ay, d, 0, t, na, nm, sa, nm, name, dec, vTa, vm); else pushSub(ax, ay, d, t, 1, nm, nb, nm, sb, name, dec, vm, vTb);
    };
    const edgeF = (d) => d === 0 ? [1, 0, 1, 1] : d === 1 ? [0, 0, 0, 1] : d === 2 ? [0, 1, 1, 1] : [0, 0, 1, 0];
    const edgeFN = (d) => d === 0 ? [0, 0, 0, 1] : d === 1 ? [1, 0, 1, 1] : d === 2 ? [0, 0, 1, 0] : [0, 1, 1, 1];
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const ci = cy * W + cx, c = grid[ci], blk = isBlock(c);
      if (hid(ci)) continue;
      if (!blk && !relief) continue;
      for (let k = 0; k < 4; k++) {
        const nxC = cx + DIRS[k][0], nyC = cy + DIRS[k][1];
        if (nxC < 0 || nyC < 0 || nxC >= W || nyC >= H) {
          // the map's outer ring of walls: close it toward the outside too (free look and the realistic far view see it)
          if (blk && m.outdoor) { const ef = edgeF(k), sa = surfAt(cx, cy, ef[0], ef[1]), sb = surfAt(cx, cy, ef[2], ef[3]); piece(cx, cy, k, 0, 0, sa, sb, has(c.tex) ? c.tex : 't_stone', null, sa, sb); }
          continue;
        }
        const nc = grid[nyC * W + nxC];
        const ef = edgeF(k), en = edgeFN(k);
        const sa = surfAt(cx, cy, ef[0], ef[1]), sb = surfAt(cx, cy, ef[2], ef[3]);
        let na, nb;
        if (!relief) { na = nb = isBlock(nc) ? (nc.top != null ? nc.top : 1) : 0; }
        else { na = surfAt(nxC, nyC, en[0], en[1]); nb = surfAt(nxC, nyC, en[2], en[3]); }
        if (blk) {
          const name = has(c.tex) ? c.tex : 't_stone', dec = decOf(ci);
          if (!relief) { piece(cx, cy, k, na, nb, sa, sb, name, dec, sa, sb); continue; }
          const ba = cellGround(m, cx, cy, ef[0], ef[1]), bb = cellGround(m, cx, cy, ef[2], ef[3]);
          piece(cx, cy, k, Math.max(na, ba), Math.max(nb, bb), sa, sb, name, dec, sa, sb);
          piece(cx, cy, k, na, nb, Math.min(ba, sa), Math.min(bb, sb), sideOf(cx, cy), null, ba, bb);
        } else piece(cx, cy, k, na, nb, sa, sb, sideOf(cx, cy), null, sa, sb);
      }
    }
    // ---- door cells: lintels up to a tall room's ceiling (relief maps)
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const ci = cy * W + cx, c = grid[ci];
      if (!c || !c.door || !relief || hid(ci)) continue;
      const bs = cellGround(m, cx, cy, 0.5, 0.5), or = doorOrient(m, cx, cy);
      if (wTop0 > bs + 1) {
        const I = surfKey('t_stone');
        for (const p of doorPlanes(or)) for (const sg of [1, -1]) {
          const x0 = p === 'x' ? cx + 0.5 : cx, y0 = p === 'x' ? cy : cy + 0.5, x1 = p === 'x' ? cx + 0.5 : cx + 1, y1 = p === 'x' ? cy + 1 : cy + 0.5;
          B.quad(I.key, [T(x0, y0, bs + 1), T(x1, y1, bs + 1), T(x1, y1, wTop0), T(x0, y0, wTop0)], [p === 'x' ? sg : 0, 0, p === 'y' ? sg : 0], I.rep, I.tint, 1);
        }
      }
    }
    // ---- ceilings (interiors)
    if (m.ceil && has(m.ceil)) {
      const cz = m.ceilZ || 1, cl = m.ceilCells, ctl = m.ceilTextures;
      for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
        const ci = cy * W + cx, c = grid[ci];
        if (hid(ci)) continue;
        if (isBlock(c) && blockTop(c, cx, cy, 0.5, 0.5) >= cz - 1e-4 && c.top == null) continue;
        let name = m.ceil;
        if (cl && ctl) { const idx = cl[ci]; if (idx && has(ctl[idx])) name = ctl[idx]; }
        const I = surfKey(name);
        B.quad(I.key, [T(cx, cy, cz), T(cx + 1, cy, cz), T(cx + 1, cy + 1, cz), T(cx, cy + 1, cz)], DOWN, I.rep, I.tint, jit(cx, cy));
      }
    }
    // ---- meshes: one per material
    const group = new THREE.Group(); group.name = 'r11-world';
    let draws = 0;
    for (const [key, o] of B.b) {
      if (!o.nv) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
      g.setIndex(o.nv > 65535 ? new THREE.Uint32BufferAttribute(o.i, 1) : new THREE.Uint16BufferAttribute(o.i, 1));
      g.computeBoundingSphere();
      let material;
      if (key.startsWith('decal:')) material = decalMat(key.slice(6));
      else material = baseMat(key);
      if (!material) { g.dispose(); continue; }
      const mesh = new THREE.Mesh(g, material);
      mesh.name = 'r11-' + key;
      mesh.castShadow = !(key === 'water' || key.startsWith('decal:') || key === 'cobble' || key === 'grass' || key === 'earth');
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      if (key === 'water') mesh.renderOrder = 1;
      group.add(mesh); draws++;
    }
    stats.builds++; stats.buildMs = Math.round((now() - t0) * 10) / 10; stats.tris = B.tris; stats.worldMeshes = draws;
    return group;
  }
  const WHITE = { r: 1, g: 1, b: 1 };
  const decalMats = {};
  function decalMat(name) {
    if (decalMats[name]) return decalMats[name];
    const t = gameTex(name); if (!t) return null;
    const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, roughness: 0.92, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, vertexColors: true });
    m.userData.r11shared = true; decalMats[name] = m;
    return m;
  }
  function doorOrient(m, cx, cy) {
    if (typeof Doors !== 'undefined' && Doors.orient) { try { return Doors.orient(null, m.cells, m.w, cy * m.w + cx); } catch (e) { /* fall through */ } }
    const g = m.cells, ci = cy * m.w + cx, n = g[ci - m.w], s = g[ci + m.w], w = g[ci - 1], e = g[ci + 1];
    if (n && s && !(w && e)) return 1; if (w && e && !(n && s)) return 2; return 0;
  }
  const doorPlanes = (or) => (or === 1 ? ['x'] : or === 2 ? ['y'] : ['x', 'y']);

  // ---- doors and gates: a small dynamic mesh rebuilt when map.doors changes (sliding, swung leaves, lifting lattices)
  const dyn = { wood: null, gate: null, sig: '' };
  function doorsSig(m) { let s = ''; for (const k in m.doors) { const d = m.doors[k]; if (d) s += k + ':' + ((d.open || 0) * 1000 | 0) + (d._sw || 0) + ','; } return s; }
  function buildDoors(m, cam) {
    const sig = doorsSig(m) + (typeof GFX !== 'undefined' && GFX.swingDoors ? 's' : '');
    if (sig === dyn.sig && dyn.wood) return;
    dyn.sig = sig;
    const B = new Buckets(), relief = !!m.relief, W = m.w;
    const gates = typeof GATES !== 'undefined' && typeof GFX !== 'undefined' && GFX.gateAnims;
    const leaf = (key, I, xa, ya, xb, yb, z0, z1, nx, ny, uvs) => {
      // a leaf with a little thickness: both faces
      const e = 0.03;
      for (const sg of [1, -1]) B.quad(key, [T(xa + nx * e * sg, ya + ny * e * sg, z0), T(xb + nx * e * sg, yb + ny * e * sg, z0), T(xb + nx * e * sg, yb + ny * e * sg, z1), T(xa + nx * e * sg, ya + ny * e * sg, z1)], [nx * sg, 0, ny * sg], I.rep, I.tint, 1, uvs);
    };
    for (const key in m.doors) {
      const ci = +key, d = m.doors[key], c = m.cells[ci];
      if (!c || !c.door || !d) continue;
      if (hiddenNow && hiddenNow.has(ci)) continue;
      const cx = ci % W, cy = (ci / W) | 0, open = d.open || 0;
      if (open >= 0.98) continue;
      const bs = relief ? cellGround(m, cx, cy, 0.5, 0.5) : 0, top = bs + 1;
      const I = info(Engine.textures[c.tex] ? c.tex : 't_door');
      let g = null;
      if (gates && open > 0) { try { g = GATES.gateInfo(c, m.cells, W, cx, cy); } catch (e) { g = null; } }
      if (g && g.or) {
        if (open > 0.001) {
          const bb = GATES.barBottom(open), p = g.or === 1 ? 'x' : 'y';
          const xa = p === 'x' ? cx + 0.5 : cx, ya = p === 'x' ? cy : cy + 0.5, xb = p === 'x' ? cx + 0.5 : cx + 1, yb = p === 'x' ? cy + 1 : cy + 0.5;
          const z0 = bs + bb, vt = bs + bb + 1;
          for (const sg of [1, -1]) B.quad('gate', [T(xa, ya, z0), T(xb, yb, z0), T(xb, yb, top), T(xa, ya, top)], [p === 'x' ? sg : 0, 0, p === 'y' ? sg : 0], 1, WHITE, 1, [0, vt - z0, 1, vt - z0, 1, vt - top, 0, vt - top]);
        }
        continue;
      }
      let swung = false;
      if (open > 0 && typeof Doors !== 'undefined' && typeof GFX !== 'undefined' && GFX.swingDoors) {
        if (d._or === undefined) { d._or = doorOrient(m, cx, cy); d._hg = ((cx * 3 + cy * 5) & 1); }
        const or = d._or;
        if (or) {
          const s = d._sw || ((or === 1 ? cam.x < cx + 0.5 : cam.y < cy + 0.5) ? 1 : -1);   // never writes d._sw (the CPU sets it on first sight)
          const th = open * Math.PI / 2, sn = Math.sin(th), cs = Math.cos(th), hg = d._hg;
          let Hx, Hy, Lx, Ly;
          if (or === 1) { Hx = cx + 0.5; Hy = cy + hg; Lx = s * sn; Ly = (hg ? -cs : cs); } else { Hx = cx + hg; Hy = cy + 0.5; Lx = (hg ? -cs : cs); Ly = s * sn; }
          let t1 = 1;
          if (Lx > 1e-9) t1 = Math.min(t1, (cx + 1 - Hx) / Lx); else if (Lx < -1e-9) t1 = Math.min(t1, (cx - Hx) / Lx);
          if (Ly > 1e-9) t1 = Math.min(t1, (cy + 1 - Hy) / Ly); else if (Ly < -1e-9) t1 = Math.min(t1, (cy - Hy) / Ly);
          t1 = clamp(t1, 0, 1);
          leaf(I.key, I, Hx, Hy, Hx + Lx * t1, Hy + Ly * t1, bs, top, -Ly, Lx);
          swung = true;
        }
      }
      if (swung) continue;
      for (const p of doorPlanes(doorOrient(m, cx, cy))) {
        const xa = p === 'x' ? cx + 0.5 : cx + open, ya = p === 'x' ? cy + open : cy + 0.5, xb = p === 'x' ? cx + 0.5 : cx + 1, yb = p === 'x' ? cy + 1 : cy + 0.5;
        leaf(I.key, I, xa, ya, xb, yb, bs, top, p === 'x' ? 1 : 0, p === 'y' ? 1 : 0);
      }
    }
    // upload into two fixed meshes (wood leaves share their base materials through groups; gates their own)
    const mk = (keyPred) => {
      const g = new THREE.BufferGeometry(); const P = [], N = [], U = [], C = [], I = []; let nv = 0; const groups = [];
      for (const [k, o] of B.b) {
        if (!keyPred(k)) continue;
        const start = I.length;
        for (let i = 0; i < o.i.length; i++) I.push(o.i[i] + nv);
        P.push(...o.p); N.push(...o.n); U.push(...o.uv); C.push(...o.c); nv += o.nv;
        groups.push({ start, count: o.i.length, k });
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
      g.computeBoundingSphere();
      return { g, groups };
    };
    const w = mk((k) => k !== 'gate'), gt = mk((k) => k === 'gate');
    if (dyn.wood) { dyn.wood.geometry.dispose(); dyn.wood.parent && dyn.wood.parent.remove(dyn.wood); }
    if (dyn.gate) { dyn.gate.geometry.dispose(); dyn.gate.parent && dyn.gate.parent.remove(dyn.gate); }
    const mats = []; w.groups.forEach((gr, i) => { w.g.addGroup(gr.start, gr.count, i); mats.push(baseMat(gr.k)); });
    dyn.wood = new THREE.Mesh(w.g, mats.length ? mats : baseMat('planks')); dyn.wood.castShadow = true; dyn.wood.receiveShadow = true; dyn.wood.name = 'r11-doors';
    dyn.gate = new THREE.Mesh(gt.g, gateMat()); dyn.gate.castShadow = true; dyn.gate.name = 'r11-gates';
    dyn.wood.visible = w.groups.length > 0; dyn.gate.visible = gt.groups.length > 0;
    R.world.add(dyn.wood); R.world.add(dyn.gate);
  }
  let gateM = null;
  function gateMat() {
    if (gateM) return gateM;
    const t = gameTex('gates_bars');
    gateM = new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.5, metalness: 0.8, map: t || null, alphaTest: t ? 0.5 : 0, side: THREE.DoubleSide, vertexColors: true });
    gateM.userData.r11shared = true;
    return gateM;
  }

  // ================================================================================================ sprites (billboards)
  // The engine's own sprite pictures (directional views, anim fields, glow, flash, hurt) packed into an array texture
  // (1024 x 1024 pages, 4 levels made with the engine's sprite-mip rule) and drawn as one instanced batch, lit by the
  // hour's light, the nearest lamps and fogged like the world.
  const atlas = { tex: null, pages: 0, shelves: [], map: new WeakMap(), list: [], PAGE: 1024, LV: 4, AL: 8, uploads: 0, full: false };
  function atlasGrow(n) {
    n = Math.min(n, 32);
    if (n <= atlas.pages && atlas.tex) return false;
    const P = atlas.PAGE;
    const t = new THREE.DataArrayTexture(new Uint8Array(P * P * 4 * n), P, P, n);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.generateMipmaps = false;
    t.mipmaps = [{}, {}, {}, {}];   // allocation of 4 levels (filled per sprite below)
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    renderer.initTexture(t);
    t.image.data = null;   // the CPU copy is not kept
    if (atlas.tex) atlas.tex.dispose();
    atlas.tex = t;
    while (atlas.shelves.length < n) atlas.shelves.push([]);
    const old = atlas.list; atlas.list = []; atlas.pages = n;
    for (const e of old) if (e.sp) { atlasUpload(e); atlas.list.push(e); }
    if (BB.mat) BB.mat.uniforms.uAtlas.value = t;
    stats.atlasPages = n;
    return true;
  }
  const up8 = (v) => (v + atlas.AL - 1) & ~(atlas.AL - 1);
  function atlasPlace(w, h) {
    const W = up8(w) + atlas.AL, H = up8(h) + atlas.AL, P = atlas.PAGE;
    for (let p = 0; p < atlas.pages; p++) {
      const sh = atlas.shelves[p]; let y = 0;
      for (const s of sh) { if (H <= s.h && s.x + W <= P) { const r = { p, x: s.x, y: s.y }; s.x += W; return r; } y = s.y + s.h; }
      if (y + H <= P) { sh.push({ y, h: H, x: W }); return { p, x: 0, y }; }
    }
    return null;
  }
  function level0(sp) {
    const out = new Uint8Array(sp.w * sp.h * 4), d = sp.data, emit = sp.emit;
    for (let i = 0, o = 0; i < d.length; i++, o += 4) { const px = d[i], a = px >>> 24; if (a <= 100) continue; out[o] = px & 255; out[o + 1] = (px >>> 8) & 255; out[o + 2] = (px >>> 16) & 255; out[o + 3] = emit && emit[i] ? 128 : 255; }
    return out;
  }
  function down(src, w, h) {
    const W = Math.max(1, (w + 1) >> 1), H = Math.max(1, (h + 1) >> 1), out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, n = 0, em = 0;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const sx = x * 2 + i, sy = y * 2 + j; if (sx >= w || sy >= h) continue; const o = (sy * w + sx) * 4; if (!src[o + 3]) continue; r += src[o]; g += src[o + 1]; b += src[o + 2]; n++; if (src[o + 3] === 128) em++; }
      if (n >= 2) { const o = (y * W + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = em * 2 > n ? 128 : 255; }
    }
    return { data: out, w: W, h: H };
  }
  const _pos3 = { x: 0, y: 0, z: 0, isVector3: true };
  function atlasUpload(e) {
    let lv = { data: level0(e.sp), w: e.w, h: e.h };
    for (let L = 0; L < atlas.LV; L++) {
      if (L) lv = down(lv.data, lv.w, lv.h);
      const src = new THREE.DataTexture(lv.data, lv.w, lv.h, THREE.RGBAFormat, THREE.UnsignedByteType);
      src.flipY = false; src.unpackAlignment = 1;
      const dst = new THREE.Vector3(e.x >> L, e.y >> L, e.p);
      renderer.copyTextureToTexture(src, atlas.tex, null, dst, 0, L);
      src.dispose();
    }
    e.src = e.sp.data; e.emitSrc = e.sp.emit || null; atlas.uploads++;
  }
  function atlasGet(sp) {
    if (!sp || !sp.data || !(sp.w > 0) || !(sp.h > 0)) return null;
    let e = atlas.map.get(sp);
    if (e) {
      if (e.src !== sp.data || e.emitSrc !== (sp.emit || null)) {
        if (sp.w === e.w && sp.h === e.h) atlasUpload(e); else { atlas.map.delete(sp); e.sp = null; e = null; }
      }
      if (e) return e;
    }
    if (!atlas.tex) atlasGrow(2);
    const P = atlas.PAGE;
    if (sp.w > P - 2 * atlas.AL || sp.h > P - 2 * atlas.AL) return null;
    let r = atlasPlace(sp.w, sp.h);
    if (!r) { if (atlas.pages >= 32) { if (!atlas.full) { atlas.full = true; warnOnce('atlas full', new Error('sprite atlas full')); } return null; } atlasGrow(atlas.pages * 2); r = atlasPlace(sp.w, sp.h); if (!r) return null; }
    e = { sp, p: r.p, x: r.x, y: r.y, w: sp.w, h: sp.h, src: null, emitSrc: null };
    e.u0 = e.x / P; e.v0 = e.y / P; e.u1 = (e.x + e.w) / P; e.v1 = (e.y + e.h) / P;
    atlasUpload(e); atlas.map.set(sp, e); atlas.list.push(e); stats.atlasSprites = atlas.list.length;
    return e;
  }
  const BB = { mesh: null, geo: null, mat: null, cap: 0, a: null, n: 0 };
  const BB_STRIDE = 20;   // floats per instance: pos(x,y,z,skew) size(w,h,cx,mode) uv(4) lay(layer,flip,alpha,flags) col(hurt, glowMin, elite, 0)
  const MAXPT = 8;
  function bbInit() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    BB.geo = g; bbCap(256);
    const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uAtlas: { value: null }, uFwdH: { value: new THREE.Vector3(1, 0, 0) }, uCamR: { value: new THREE.Vector3(0, 0, 1) }, uCamU: { value: new THREE.Vector3(0, 1, 0) },
      uAmb: { value: new THREE.Color(0.4, 0.4, 0.4) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0, 0, 0) },
      uPtPos: { value: Array.from({ length: MAXPT }, () => new THREE.Vector4()) }, uPtCol: { value: Array.from({ length: MAXPT }, () => new THREE.Vector4()) }, uNPt: { value: 0 },
      uEmit: { value: 2.2 },
    }]);
    BB.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, uniforms: U, fog: true, lights: false, side: THREE.DoubleSide,
      vertexShader: `
in vec4 iPos; in vec4 iSize; in vec4 iUV; in vec4 iLay; in vec4 iCol;
uniform vec3 uFwdH; uniform vec3 uCamR; uniform vec3 uCamU;
out vec2 vUV; flat out vec4 vLay; flat out vec4 vCol; out vec3 vPos;
#include <fog_pars_vertex>
void main() {
  vec2 c = position.xy;
  vec3 Rv = vec3(-uFwdH.z, 0.0, uFwdH.x), Uv = vec3(0.0, 1.0, 0.0);
  if (iSize.w == 1.0) { Rv = uCamR; Uv = uCamU; } else if (iSize.w == 2.0) { Uv = uFwdH; }
  vec3 p = iPos.xyz + Rv * ((c.x - iSize.z) * iSize.x + iPos.w * c.y * iSize.y) + Uv * (c.y * iSize.y);
  vPos = p;
  float u = iLay.y > 0.5 ? 1.0 - c.x : c.x;
  vUV = vec2(mix(iUV.x, iUV.z, u), mix(iUV.w, iUV.y, c.y));
  vLay = iLay; vCol = iCol;
  vec4 mvPosition = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
      fragmentShader: 'layout(location = 0) out highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n' + `
precision highp sampler2DArray;
uniform sampler2DArray uAtlas; uniform vec3 uFwdH; uniform vec3 uAmb; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform vec4 uPtPos[${MAXPT}]; uniform vec4 uPtCol[${MAXPT}]; uniform int uNPt; uniform float uEmit;
in vec2 vUV; flat in vec4 vLay; flat in vec4 vCol; in vec3 vPos;
#include <fog_pars_fragment>
int bayer(ivec2 p) { int i = ((p.y & 3) << 2) | (p.x & 3); const int B[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5); return B[i]; }
void main() {
  vec4 t = texture(uAtlas, vec3(vUV, vLay.x));
  if (t.a < 0.25) discard;
  float alpha = vLay.z;
  if (alpha < 0.999 && float(bayer(ivec2(gl_FragCoord.xy))) >= alpha * 16.0) discard;
  int flags = int(vLay.w + 0.5);
  vec3 px = pow(t.rgb, vec3(2.2));
  float hurt = vCol.x;
  if (hurt > 0.0) { float k = hurt * 0.45; px = vec3(px.r + (1.0 - px.r) * k, px.g * (1.0 - k), px.b * (1.0 - k)); }
  vec3 col;
  if ((flags & 1) != 0) col = vec3(1.0, 0.8, 0.6) * 2.0;
  else if (t.a < 0.75) col = px * uEmit;
  else {
    vec3 n = -uFwdH;
    float sd = dot(n, uSunDir);
    vec3 L = uAmb + uSunCol * (0.45 + 0.55 * max(sd, 0.0)) * (0.6 + 0.4 * max(uSunDir.y, 0.0));
    for (int i = 0; i < ${MAXPT}; i++) {
      if (i >= uNPt) break;
      vec3 d = uPtPos[i].xyz - vPos; float d2 = dot(d, d), r = uPtPos[i].w;
      float w = clamp(1.0 - d2 / (r * r), 0.0, 1.0);
      L += uPtCol[i].rgb * (w * w / max(d2, 0.02)) * (0.6 + 0.4 * max(dot(normalize(d), n), 0.0));
    }
    L += vec3(vCol.z * 0.11, vCol.z * 0.08, 0.0);
    col = px * L;
    if (vCol.y > 0.0) col = max(col, px * vCol.y * 1.6);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    });
    BB.mesh = new THREE.Mesh(g, BB.mat);
    BB.mesh.frustumCulled = false; BB.mesh.name = 'r11-billboards'; BB.mesh.renderOrder = 2;
    R.scene.add(BB.mesh);
  }
  function bbCap(n) {
    if (n <= BB.cap) return;
    const cap = Math.max(n, BB.cap * 2, 256);
    BB.a = new Float32Array(cap * BB_STRIDE);
    const ib = new THREE.InstancedInterleavedBuffer(BB.a, BB_STRIDE, 1); ib.setUsage(THREE.DynamicDrawUsage);
    for (const [name, off] of [['iPos', 0], ['iSize', 4], ['iUV', 8], ['iLay', 12], ['iCol', 16]]) {
      if (BB.geo.getAttribute(name)) BB.geo.deleteAttribute(name);
      BB.geo.setAttribute(name, new THREE.InterleavedBufferAttribute(ib, 4, off));
    }
    BB.ib = ib; BB.cap = cap;
  }
  // every entity the engine would draw (R3D's defaultProvider rule), as instances
  function bbFrame(env, ents, m) {
    const fd2 = env.fogDist * env.fogDist * 1.3, camx = Engine.cam.x, camy = Engine.cam.y, relief = !!(m.lvls || m.smooth);
    let n = 0;
    bbCap(ents.length + 1);
    const a = BB.a;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!e || !e.sprite || e.hidden) continue;
      if (replacedNow.size && replacedNow.has(e)) continue;   // KIT draws this one as a 3D model
      const dx = e.x - camx, dy = e.y - camy, d2 = dx * dx + dy * dy;
      if (d2 > fd2) continue;
      let dirl;
      try { dirl = typeof animDirectionalSprite === 'function' ? animDirectionalSprite(e) : { sprite: (e.animSprite && Engine.sprites[e.animSprite]) || Engine.sprites[e.sprite], flip: !!e.animFlip }; } catch (err) { dirl = null; }
      const sp = dirl && dirl.sprite; if (!sp) continue;
      const alpha = e.animAlpha == null ? 1 : e.animAlpha;
      if (alpha <= 0.02) continue;
      const at = atlasGet(sp); if (!at) continue;
      const scale = e.scale || 1, hs = sp.hs || 1;
      const hGame = scale * hs * (e.animSY || 1), wGL = ZK * scale * hs * (sp.w / sp.h) * (e.animSX || 1);
      const floorZ = relief ? ground(m, e.x, e.y) : 0;
      const bottom = floorZ - ((e.yOff || 0) - (e.animLift || 0)) - (sp.dy || 0) * scale;
      const glowEnt = e.glow > 0.3 || e.animGlow > 0.3 || !!e.glassLamp || e.item === 'shard' || e.item === 'core';
      let gmin = 0; if (e.glow) gmin = Math.max(gmin, e.glow); if (e.animGlow) gmin = Math.max(gmin, e.animGlow); if (e.item === 'shard' || e.item === 'core' || e.glassLamp) gmin = Math.max(gmin, 0.9);
      const cx0 = sp.cx == null ? 0.5 : sp.cx, flip = !!dirl.flip, cx = flip ? 1 - cx0 : cx0;
      const k = n * BB_STRIDE;
      a[k] = e.x; a[k + 1] = bottom * ZK; a[k + 2] = e.y; a[k + 3] = e.animSkew || 0;
      a[k + 4] = wGL; a[k + 5] = hGame * ZK; a[k + 6] = cx; a[k + 7] = 0;
      a[k + 8] = at.u0; a[k + 9] = at.v0; a[k + 10] = at.u1; a[k + 11] = at.v1;
      a[k + 12] = at.p; a[k + 13] = flip ? 1 : 0; a[k + 14] = alpha; a[k + 15] = (e.flash ? 1 : 0) | (glowEnt ? 2 : 0);
      a[k + 16] = e.animHurt || 0; a[k + 17] = gmin; a[k + 18] = e.elite ? 1 : 0; a[k + 19] = 0;
      n++;
    }
    BB.n = n; BB.geo.instanceCount = n; BB.ib.needsUpdate = true;
    BB.mesh.visible = n > 0;
    stats.billboards = n;
  }

  // ================================================================================================ sky, light, fog
  const SKY_VS = `
out vec3 vDir;
void main() { vDir = position; vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }`;
  const FRAG_OUT = 'layout(location = 0) out highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n';
  const SKY_FS = FRAG_OUT + `
uniform sampler2D uHdr; uniform float uDay; uniform vec3 uTint; uniform vec3 uZen; uniform vec3 uHor; uniform vec3 uGlow; uniform vec3 uSunD;
uniform vec3 uMoonD; uniform float uMoon; uniform float uStars; uniform vec3 uFog; uniform float uFlash; uniform float uTime;
in vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir);
  vec2 uv = vec2(atan(d.z, d.x) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5);
  vec3 hdr = texture(uHdr, uv).rgb;
  float el = d.y;
  // night and dusk: the hour's gradient (light21's keys), stars and the moon
  vec3 grad = mix(uHor, uZen, smoothstep(0.0, 0.55, el));
  float sg = max(dot(d, uSunD), 0.0); grad += uGlow * pow(sg, 6.0) * 0.6;
  vec3 c = mix(grad, hdr * uTint, uDay);
  if (uStars > 0.0 && el > 0.0) { vec3 q = floor(d * 420.0); float h = hash(q); if (h > 0.9975) c += vec3(0.8, 0.85, 1.0) * uStars * (h - 0.9975) * 400.0 * smoothstep(0.0, 0.2, el) * (0.7 + 0.3 * sin(uTime * 2.0 + h * 90.0)); }
  if (uMoon > 0.0) { float md = dot(d, uMoonD); c += vec3(0.75, 0.8, 0.9) * uMoon * (smoothstep(0.99975, 0.99985, md) * 3.0 + pow(max(md, 0.0), 200.0) * 0.15); }
  // below the horizon the air of the place (the fog colour), so the far ground meets it
  c = mix(c, uFog, smoothstep(0.02, -0.08, el));
  c += vec3(uFlash * 0.6);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
  function skyInit() {
    const g = new THREE.SphereGeometry(10, 32, 16);
    const m = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
      uniforms: { uHdr: { value: R.hdr }, uDay: { value: 1 }, uTint: { value: new THREE.Color(1, 1, 1) }, uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
        uSunD: { value: new THREE.Vector3(0, 1, 0) }, uMoonD: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: 0 }, uStars: { value: 0 }, uFog: { value: new THREE.Color() }, uFlash: { value: 0 }, uTime: { value: 0 } },
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
    });
    R.sky = new THREE.Mesh(g, m); R.sky.frustumCulled = false; R.sky.renderOrder = -1000; R.sky.name = 'r11-sky';
    R.scene.add(R.sky);
  }
  // fog: plain exponential (aerial perspective) instead of Three's exp2: distant things fade into the air, never a wall
  function patchFog() {
    const C = THREE.ShaderChunk;
    if (C.fog_fragment.indexOf('R11') >= 0) return;
    C.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = min(1.0 - exp( - fogDensity * vFogDepth ), 0.985); // R11: aerial perspective
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
  }
  const srgbToLin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const LP = { day: 1, night: 0, exposure: 1 };
  const LF = { env: null, tod: 0.5, outdoor: true, time: 0, now: 0, pxK: 1, map: null, cam: null };
  const _v3 = { x: 0, y: 0, z: 0 };
  function lightFrame(env, m, tod) {
    const P0 = (typeof LIGHT21 !== 'undefined' && LIGHT21 && LIGHT21.frameParams && LIGHT21.P) ? LIGHT21 : null;
    LF.env = env; LF.tod = tod; LF.outdoor = !!env.outdoor; LF.time = env.animT; LF.now = now() / 1000; LF.map = m; LF.cam = Engine.cam;
    let P = null;
    if (P0) { try { P0.frameParams(LF); P = P0.P; } catch (e) { warnOnce('light21 params', e); P = null; } }
    if (!P) P = fallbackP(tod, env);
    const outdoor = !!env.outdoor, wx = env.wx || {};
    const elev = Math.cos((tod - 0.5) * Math.PI * 2);
    const day = smooth(-0.08, 0.25, elev), night = 1 - smooth(-0.2, 0.05, elev);
    const cloud = clamp(wx.cloud || 0, 0, 1), dark = clamp(wx.dark || 0, 0, 1);
    LP.day = day; LP.night = night;
    // fog: the place's air (the engine's displayed fog colour) by distance; outdoors by day leaning to the sky's horizon
    const fp = env.fogPx >>> 0;
    const fc = [srgbToLin((fp & 255) / 255), srgbToLin(((fp >>> 8) & 255) / 255), srgbToLin(((fp >>> 16) & 255) / 255)];
    const hor = P.hor;
    let fr = fc[0], fg = fc[1], fb = fc[2];
    if (outdoor) { const k = 0.35 * day; fr = mix(fr, srgbToLin(clamp(hor[0], 0, 1)), k); fg = mix(fg, srgbToLin(clamp(hor[1], 0, 1)), k); fb = mix(fb, srgbToLin(clamp(hor[2], 0, 1)), k); }
    const fogK = outdoor ? 0.8 : 1.0;
    R.scene.fog.color.setRGB(fr * fogK, fg * fogK, fb * fogK);
    R.scene.fog.density = (outdoor ? 0.4 : 1.1) / Math.max(2, env.fogDist);
    // sun or moon
    const sun = R.sun;
    const sd = P.sun;                     // light21: z-up GL
    sun.position.set(sd[0], sd[2], sd[1]).multiplyScalar(40);
    const sc = P.sunC, sm = Math.max(sc[0], sc[1], sc[2], 1e-4);
    if (outdoor) { sun.color.setRGB(sc[0] / sm, sc[1] / sm, sc[2] / sm); sun.intensity = sm * (day > 0.05 ? 1.6 : 0.9); }
    else sun.intensity = 0;
    sun.castShadow = outdoor && sun.intensity > 0.02;
    // the sky's light: hemisphere (tinted by the hour) + the HDR environment (scaled by the hour)
    const aS = P.ambS, aG = P.ambG;
    const indoorAmb = outdoor ? 0 : 0.18 + 0.9 * (env.ambient || 0);
    if (outdoor) { R.hemi.color.setRGB(aS[0], aS[1], aS[2]); R.hemi.groundColor.setRGB(aG[0], aG[1], aG[2]); R.hemi.intensity = 0.55 + 0.6 * night; }
    else { R.hemi.color.setRGB(0.62, 0.55, 0.47); R.hemi.groundColor.setRGB(0.3, 0.26, 0.22); R.hemi.intensity = indoorAmb * (env.flick || 1); }
    R.scene.environmentIntensity = outdoor ? (0.03 + 0.8 * day) * (1 - dark * 0.6) : 0.12 + 0.25 * (env.ambient || 0);
    // the sky dome
    const U = R.sky.material.uniforms;
    R.sky.visible = outdoor;
    if (outdoor) {
      U.uDay.value = day;
      // the overcast HDR tinted by the hour: warm at dusk and dawn, dimmed by storm dark
      const warm = 1 - smooth(0.15, 0.55, Math.abs(elev));
      const tk = (0.25 + 0.75 * day) * (1 - dark * 0.55);
      U.uTint.value.setRGB(tk * (1 + warm * 0.25), tk * (1 - warm * 0.05), tk * (1 - warm * 0.28));
      U.uZen.value.setRGB(srgbToLin(clamp(P.zen[0], 0, 1)), srgbToLin(clamp(P.zen[1], 0, 1)), srgbToLin(clamp(P.zen[2], 0, 1)));
      U.uHor.value.setRGB(srgbToLin(clamp(hor[0], 0, 1)), srgbToLin(clamp(hor[1], 0, 1)), srgbToLin(clamp(hor[2], 0, 1)));
      U.uGlow.value.setRGB(srgbToLin(clamp(P.glow[0], 0, 1)), srgbToLin(clamp(P.glow[1], 0, 1)), srgbToLin(clamp(P.glow[2], 0, 1)));
      U.uSunD.value.set(P.sunD[0], P.sunD[2], P.sunD[1]).normalize();
      U.uMoonD.value.set(P.moonD[0], P.moonD[2], P.moonD[1]).normalize();
      U.uMoon.value = (P.moonVis || 0) * (0.3 + 0.7 * (P.moonIll == null ? 1 : P.moonIll));
      U.uStars.value = P.sky2 ? P.sky2[0] : night * (1 - cloud);
      U.uFog.value.copy(R.scene.fog.color);
      U.uFlash.value = clamp(wx.flash || 0, 0, 1);
      U.uTime.value = LF.now;
    }
    renderer.setClearColor(R.scene.fog.color, 1);
    // exposure: night is dark but readable
    LP.exposure = outdoor ? mix(1.6, 1.0, day) : 1.15;
    renderer.toneMappingExposure = LP.exposure;
    // billboards' light
    const BU = BB.mat && BB.mat.uniforms;
    if (BU) {
      const ek = R.scene.environmentIntensity * 0.55;
      BU.uAmb.value.setRGB((R.hemi.color.r * 0.55 + R.hemi.groundColor.r * 0.45) * R.hemi.intensity + ek * 0.9, (R.hemi.color.g * 0.55 + R.hemi.groundColor.g * 0.45) * R.hemi.intensity + ek * 0.92, (R.hemi.color.b * 0.55 + R.hemi.groundColor.b * 0.45) * R.hemi.intensity + ek);
      BU.uSunDir.value.copy(sun.position).normalize();
      BU.uSunCol.value.copy(sun.color).multiplyScalar(sun.intensity * 0.75);
    }
    return P;
  }
  // without light21: a simple day/night gradient
  function fallbackP(tod, env) {
    const elev = Math.cos((tod - 0.5) * Math.PI * 2), a = (tod - 0.25) * Math.PI * 2, day = smooth(-0.06, 0.2, elev);
    const sunEl = Math.asin(clamp(elev, -1, 1)) * 0.74, d3 = (az, el) => [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)];
    const dk = [0.06, 0.07, 0.14], dy = [0.55, 0.6, 0.66];
    const z = [mix(dk[0], dy[0], day), mix(dk[1], dy[1], day), mix(dk[2], dy[2], day)];
    return { sun: day > 0.02 ? d3(a, Math.max(0.035, sunEl)) : d3(a + Math.PI, 0.5), sunC: day > 0.02 ? [day, day * 0.95, day * 0.85] : [0.08, 0.09, 0.13], sunD: d3(a, sunEl), moonD: d3(a + Math.PI, 0.5),
      zen: z, hor: [z[0] * 1.3, z[1] * 1.25, z[2] * 1.1], glow: [0, 0, 0], ambS: [z[0] * 0.8, z[1] * 0.8, z[2] * 0.85], ambG: [z[0] * 0.4, z[1] * 0.36, z[2] * 0.3], moonVis: 1 - day, moonIll: 1, sky2: [1 - day, 0, 0, 1], night: 1 - day };
  }
  // ---- point lights: the engine's lamps (and KIT's) share one pool; the nearest N by tier are real lights
  const kitLights = [];
  const candidates = [];
  function lightsFrame(env) {
    const pool = R.pool, N = pool.length, cx = Engine.cam.x, cy = Engine.cam.y;
    candidates.length = 0;
    const Ls = env.ptLights || [];
    for (let i = 0; i < Ls.length; i++) {
      const L = Ls[i], br = Math.max(L.cr || 0, L.cg || 0, L.cb || 0);
      if (br <= 1 || !(L.r > 0)) continue;
      const dx = L.x - cx, dy = L.y - cy;
      candidates.push({ d: Math.sqrt(dx * dx + dy * dy) - L.r * 0.3, x: L.x, y: (L.z != null ? L.z : (ground(env.map, L.x, L.y) + 0.55)) * ZK, z: L.y, r: (L.cr || 0) / br, g: (L.cg || 0) / br, b: (L.cb || 0) / br, I: 0.9 * Math.min(2, br / 70), dist: L.r * 1.25 });
    }
    if (!_wp) _wp = new THREE.Vector3();
    for (const k of kitLights) {
      const l = k.light; if (!l) continue;
      l.getWorldPosition(_wp);
      const dx = _wp.x - cx, dy = _wp.z - cy;
      candidates.push({ d: Math.sqrt(dx * dx + dy * dy) - (k.priority || 0), x: _wp.x, y: _wp.y, z: _wp.z, r: l.color.r, g: l.color.g, b: l.color.b, I: l.intensity, dist: l.distance || 3, decay: l.decay });
    }
    candidates.sort((a, b) => a.d - b.d);
    const BU = BB.mat && BB.mat.uniforms;
    let used = 0;
    for (let i = 0; i < N; i++) {
      const p = pool[i], c = candidates[i];
      if (!c) { p.intensity = 0; continue; }
      p.position.set(c.x, c.y, c.z); p.color.setRGB(c.r, c.g, c.b); p.intensity = c.I; p.distance = c.dist; p.decay = c.decay == null ? 2 : c.decay; used++;
    }
    if (BU) {
      const n = Math.min(MAXPT, candidates.length);
      for (let i = 0; i < n; i++) { const c = candidates[i]; BU.uPtPos.value[i].set(c.x, c.y, c.z, c.dist); BU.uPtCol.value[i].set(c.r * c.I, c.g * c.I, c.b * c.I, 0); }
      BU.uNPt.value = n;
    }
    stats.lights = used;
  }
  let _wp = null;
  function poolSize() {
    const want = TIERS[st.tier].lamps;
    while (R.pool.length > want) { const p = R.pool.pop(); R.scene.remove(p); p.dispose && p.dispose(); }
    while (R.pool.length < want) { const p = new THREE.PointLight(0xffa24a, 0, 3, 2); p.castShadow = false; R.pool.push(p); R.scene.add(p); }
  }
  function shadowSetup() {
    const t = TIERS[st.tier], s = R.sun.shadow;
    s.mapSize.set(t.shadow, t.shadow);
    if (s.map) { s.map.dispose(); s.map = null; }
    const r = t.shadowR; Object.assign(s.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 90 }); s.camera.updateProjectionMatrix();
    s.bias = -0.0005; s.normalBias = 0.02; s.radius = 3;
  }
  // the shadow box follows the player, snapped to its texels so edges do not crawl
  function sunFollow(eye) {
    const sun = R.sun, t = TIERS[st.tier], texel = (2 * t.shadowR) / t.shadow;
    const dir = _d.set(sun.position.x, sun.position.y, sun.position.z).normalize();
    const cx = Math.round((eye.x + Math.cos(Engine.cam.dir) * t.shadowR * 0.4) / texel) * texel, cz = Math.round((eye.z + Math.sin(Engine.cam.dir) * t.shadowR * 0.4) / texel) * texel;
    sun.target.position.set(cx, 0, cz); sun.target.updateMatrixWorld();
    sun.position.set(cx + dir.x * 40, dir.y * 40, cz + dir.z * 40);
  }
  const _d = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; } };

  // ================================================================================================ camera
  let viewRows = 200;      // logical rows the canvas shows (200: the whole #game; R3D's 3D view is the top 150)
  function cameraFrame(cam, env, m) {
    const C = R.camera, d = cam.dir, pitch = cam.pitch || 0, bob = cam.bob || 0;
    const th = Math.atan(pitch / FX), cd = Math.cos(d), sd = Math.sin(d), ct = Math.cos(th), stt = Math.sin(th);
    const ex = cam.x, ey = (cam.z == null ? 0.88 : cam.z) * ZK, ez = cam.y;
    // basis in three space: right (-sd, 0, cd), up (-stt cd, ct, -stt sd), forward (ct cd, stt, ct sd); camera looks down -Z
    const e = C.matrixWorld.elements;
    e[0] = -sd; e[1] = 0; e[2] = cd; e[3] = 0;
    e[4] = -stt * cd; e[5] = ct; e[6] = -stt * sd; e[7] = 0;
    e[8] = -ct * cd; e[9] = -stt; e[10] = -ct * sd; e[11] = 0;
    e[12] = ex; e[13] = ey; e[14] = ez; e[15] = 1;
    C.matrixWorld.decompose(C.position, C.quaternion, C.scale);
    C.matrixWorldInverse.copy(C.matrixWorld).invert();
    const near = 0.02, far = Math.max(140, (m ? Math.hypot(m.w, m.h) : 64) * 1.5 + 80, env.fogDist * 4);
    C.near = near; C.far = far;
    const rows = viewRows, P = C.projectionMatrix.elements;
    P.fill(0);
    P[0] = FX / 160; P[5] = 2 * FX / rows; P[9] = -(1 - 2 * (75 + bob) / rows);
    P[10] = -(far + near) / (far - near); P[11] = -1; P[14] = -2 * far * near / (far - near);
    C.projectionMatrixInverse.copy(C.projectionMatrix).invert();
    C.fov = 2 * Math.atan(rows / 2 / FX) * 180 / Math.PI; C.aspect = 320 / rows;
    R.sky.position.copy(C.position); R.sky.updateMatrixWorld();
    // the viewmodel camera
    // framed on the view rows only (the HUD band covers the rest), so the hands sit in the picture, not under the panel;
    // 40 degrees over the 150 view rows gives KIT's hands the size they have in its 52-degree full-frame harness
    const vc = R.vmCam, vw = canvas.width, vh = canvas.height * LOG_H / Math.max(LOG_H, viewRows);
    vc.fov = 40; vc.aspect = vw / Math.max(1, vh); vc.setViewOffset(vw, vh, 0, 0, vw, canvas.height); vc.updateProjectionMatrix();
    if (BB.mat) {
      const U = BB.mat.uniforms; U.uFwdH.value.set(cd, 0, sd); U.uCamR.value.set(-sd, 0, cd); U.uCamU.value.set(-stt * cd, ct, -stt * sd);
    }
    return { x: ex, y: ey, z: ez };
  }

  // ================================================================================================ the map's world
  const replacedNow = new Set();
  let curMap = null, hiddenNow = null, kitGroup = null, worldSig = 0, arrSigV = 0, arrT = 0, worldDirty = false;
  const strHash = new Map();
  function hs(s) { if (!s) return 0; let h = strHash.get(s); if (h === undefined) { h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; strHash.set(s, h); } return h; }
  function cellSig(m) { let h = 0x9e3779b9 | 0; const g = m.cells; for (let i = 0; i < g.length; i++) { const c = g[i]; let v = 0; if (c) v = (hs(c.tex) ^ (c.top != null ? ((c.top * 4096) | 0) * 31 : 7) ^ (c.door ? 0x55 : 0) ^ hs(c.capTex) * 3) | 0; h = Math.imul(h ^ v, 0x01000193) + i | 0; } return h; }
  function arrSig(a) { if (!a) return 0; let h = 0x811c9dc5 | 0; for (let i = 0; i < a.length; i++) { const v = a[i]; h = Math.imul(h ^ (typeof v === 'number' ? (v * 4096) | 0 : hs(v)), 16777619) | 0; } return h; }
  function objSig(o) { if (!o) return 0; let h = 7; for (const k in o) h = Math.imul(h ^ ((+k) | 0) ^ hs(o[k]), 16777619) | 0; return h; }
  const allArr = (m) => arrSig(m.lvls) ^ arrSig(m.verts) * 3 ^ arrSig(m.floorCells) * 5 ^ arrSig(m.ceilCells) * 7 ^ (Array.isArray(m.decals) ? arrSig(m.decals) : objSig(m.decals)) * 11 ^ arrSig(m.sideTex) * 13;
  function disposeTree(o) {
    o.traverse((x) => {
      if (x.geometry && x.geometry.dispose) x.geometry.dispose();
      const ms = x.material ? [].concat(x.material) : [];
      for (const mm of ms) {
        if (!mm || (mm.userData && mm.userData.r11shared)) continue;
        for (const k of ['map', 'normalMap', 'aoMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'bumpMap']) { const t = mm[k]; if (t && !shared.has(t) && t.dispose) t.dispose(); }
        mm.dispose();
      }
    });
  }
  function teardown() {
    if (R.world) { R.scene.remove(R.world); disposeTree(R.world); R.world = null; }
    if (kitGroup) { R.scene.remove(kitGroup); disposeTree(kitGroup); kitGroup = null; }
    dyn.wood = dyn.gate = null; dyn.sig = '';
    kitLights.length = 0; replacedNow.clear();
  }
  function ensureWorld(m) {
    let rebuild = m !== curMap || !R.world || worldDirty;
    if (!rebuild) {
      const cs = cellSig(m);
      if (cs !== worldSig) rebuild = true;
      else if (LF.now - arrT > 0.5) { arrT = LF.now; const a = allArr(m); if (a !== arrSigV) rebuild = true; }
    }
    if (!rebuild) return false;
    const first = m !== curMap;
    if (typeof Engine.scanRelief === 'function') { try { Engine.scanRelief(m); } catch (e) { /* keep */ } }
    if (first) {
      teardown();
      hiddenNow = new Set();
      const ctx = mapCtx(m);
      if (typeof R11KIT !== 'undefined' && R11KIT && typeof R11KIT.dressMap === 'function') {
        try {
          const r = R11KIT.dressMap(m, ctx);
          if (r && r.hiddenCells) for (const c of r.hiddenCells) hiddenNow.add(c);
          if (r && r.replaced) for (const e of r.replaced) replacedNow.add(e);
          if (r && r.group) { kitGroup = r.group; R.scene.add(kitGroup); }
        } catch (e) { warnOnce('kit dressMap', e); }
      }
      curMap = m;
      R.world = buildWorld(m, hiddenNow); R.scene.add(R.world);
      worldSig = cellSig(m); arrSigV = allArr(m); arrT = LF.now; worldDirty = false;
      emit('mapbuilt', m, ctx);
    } else {
      if (R.world) { R.scene.remove(R.world); disposeTree(R.world); }
      dyn.wood = dyn.gate = null; dyn.sig = '';
      R.world = buildWorld(m, hiddenNow); R.scene.add(R.world);
      worldSig = cellSig(m); arrSigV = allArr(m); arrT = LF.now; worldDirty = false;
    }
    return true;
  }
  function mapCtx(m) {
    return {
      scene: R.scene, THREE, mat, tier: st.tier, M, toWorld, map: m, R11: api,
      addLight(light, priority) { if (!light) return null; light.visible = false; kitLights.push({ light, priority: priority || 0 }); return light; },
      hideCells(set) { if (!set) return; for (const c of set) hiddenNow.add(c); if (R.world) worldDirty = true; },
    };
  }
  function toWorld(x, y, z) { return new THREE.Vector3(x, (z || 0) * ZK, y); }

  // ================================================================================================ post, size, tiers
  let sizeDirty = true;
  function benchScale() { try { if (typeof R11BENCH !== 'undefined' && R11BENCH && typeof R11BENCH.renderScale === 'function') { const s = +R11BENCH.renderScale(); if (s > 0) return clamp(s, 0.5, 1); } } catch (e) { /* none */ } return 1; }
  let lastScale = 1;
  function fit() {
    const game = document.getElementById('game'); if (!game || !canvas) return;
    const r = game.getBoundingClientRect(), dpr = (typeof devicePixelRatio === 'number' && devicePixelRatio > 0) ? devicePixelRatio : 1;
    const k = Math.min(dpr, TIERS[st.tier].dpr) * benchScale();
    lastScale = benchScale();
    const W = Math.max(160, Math.round(r.width * k)), H = Math.max(100, Math.round(r.height * k));
    if (W !== canvas.width || H !== canvas.height || sizeDirty) {
      renderer.setPixelRatio(1); renderer.setSize(W, H, false);
      if (R.composer) R.composer.setSize(W, H);
    }
    sizeDirty = false;
  }
  function rebuildComposer() {
    const t = TIERS[st.tier];
    if (R.composer) { try { R.composer.dispose(); } catch (e) { /* fine */ } for (const k in R.passes) { const p = R.passes[k]; if (p && p.dispose) try { p.dispose(); } catch (e) { /* fine */ } } R.composer = null; }
    R.passes = {};
    if (!(t.ao || t.bloom || t.smaa)) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const C = new T3.EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType }));
    C.addPass(new T3.RenderPass(R.scene, R.camera));
    if (t.ao) {
      const g = new T3.GTAOPass(R.scene, R.camera, size.x, size.y);
      g.blendIntensity = 0.85; g.updateGtaoMaterial({ radius: 0.6 * M * 1.6, distanceExponent: 1.4, thickness: 1.2 * M * 1.6, scale: 1 });
      // its G-buffer passes must not see the billboards (instanced, own shader) or the sky
      const r0 = g.render.bind(g);
      g.render = function () { const a = BB.mesh && BB.mesh.visible, s = R.sky && R.sky.visible; if (BB.mesh) BB.mesh.visible = false; if (R.sky) R.sky.visible = false; try { return r0.apply(null, arguments); } finally { if (BB.mesh) BB.mesh.visible = a; if (R.sky) R.sky.visible = s; } };
      C.addPass(g); R.passes.ao = g;
    }
    const vp = new T3.RenderPass(R.vmScene, R.vmCam); vp.clear = false; vp.clearDepth = true; C.addPass(vp); R.passes.vm = vp;
    if (t.bloom) { const b = new T3.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.35, 2.4); C.addPass(b); R.passes.bloom = b; }
    C.addPass(new T3.OutputPass());
    if (t.smaa) { C.addPass(new T3.SMAAPass()); }
    R.composer = C;
  }
  function applyTier() {
    if (!renderer) return;
    poolSize(); shadowSetup();
    const a = Math.min(renderer.capabilities.getMaxAnisotropy(), TIERS[st.tier].aniso);
    for (const t of texCache.values()) if (t.anisotropy !== a) { t.anisotropy = a; t.needsUpdate = true; }
    sizeDirty = true; fit();
    rebuildComposer();
  }

  // ================================================================================================ the viewmodel
  const VM = { kind: null, arm: null, weapon: null, light: null };
  function weaponKind() {
    try {
      const p = G.player, id = String(p.weapons ? p.weapons[p.weapon] : 'hands').toLowerCase();
      if (id === 'hands' || id === 'fists') return 'fists';
      if (typeof R11VM !== 'undefined' && R11VM && typeof R11VM.kindFor === 'function') { const k = R11VM.kindFor(id); if (k) return k; }
      if (typeof R11KIT !== 'undefined' && R11KIT && typeof R11KIT.kindFor === 'function') { const k = R11KIT.kindFor(id); if (k) return k; }
      const rules = [[/sword|blade|sabre|saber|falchion|brand/, 'sword'], [/dagger|knife|dirk|stiletto/, 'dagger'], [/axe/, 'axe'], [/mace|club|hammer|cudgel|flail|maul/, 'mace'], [/spear|pike|halberd|glaive|lance/, 'spear'], [/crossbow|bow/, 'bow'], [/staff|rod|wand|cane/, 'staff']];
      for (const [re, k] of rules) if (re.test(id)) return k;
      return id;
    } catch (e) { return 'sword'; }
  }
  function vmFrame(t, walk) {
    // phase 2: HANDS' js/r11vm.js (window.R11VM) when it is there, else KIT's phase-1 viewmodels
    const K = (typeof R11VM !== 'undefined' && R11VM && typeof R11VM.viewmodel === 'function') ? R11VM
      : typeof R11KIT !== 'undefined' && R11KIT && typeof R11KIT.viewmodel === 'function' ? R11KIT : null;
    if (!K) return;
    const kind = weaponKind();
    if (!VM.arm) { try { VM.arm = K.viewmodel('glass-arm'); if (VM.arm && VM.arm.group) R.vmScene.add(VM.arm.group); } catch (e) { warnOnce('kit viewmodel arm', e); VM.arm = { group: null }; } }
    if (kind !== VM.kind) {
      if (VM.weapon && VM.weapon.group) { R.vmScene.remove(VM.weapon.group); disposeTree(VM.weapon.group); }
      VM.weapon = null; VM.kind = kind;
      if (kind !== 'hands') { try { VM.weapon = K.viewmodel(kind); if (VM.weapon && VM.weapon.group) R.vmScene.add(VM.weapon.group); } catch (e) { warnOnce('kit viewmodel', e); } }
    }
    for (const v of [VM.arm, VM.weapon]) if (v && typeof v.update === 'function') { try { v.update(t, walk); } catch (e) { warnOnce('kit vm update', e); } }
    // the hands take the world's light (the same sky and ground colours, the same environment strength), so at night and
    // indoors they are as dim as the street they are held in, not lit like noon
    if (R.vmHemi && R.hemi) {
      R.vmHemi.color.copy(R.hemi.color); R.vmHemi.groundColor.copy(R.hemi.groundColor); R.vmHemi.intensity = R.hemi.intensity;
      R.vmScene.environmentIntensity = R.scene.environmentIntensity;
      if (R.vmKey) R.vmKey.intensity = 0.15 + 0.75 * Math.min(1, R.scene.environmentIntensity / 0.83);
    }
    // the swing and the draw/holster drop the pixel hands had (the same game state: G.attack, FPHANDS.st.lower)
    const W = VM.weapon && VM.weapon.group;
    if (W) {
      let a = 0, low = 0, thrust = false;
      try { if (G.attack && G.attack.t > 0 && G.attack.dur > 0) a = Math.sin(Math.min(1, Math.max(0, 1 - G.attack.t / G.attack.dur)) * Math.PI); } catch (e) { a = 0; }
      try { if (typeof FPHANDS === 'object' && FPHANDS.st) low = Math.min(1, Math.max(0, +FPHANDS.st.lower || 0)); } catch (e) { low = 0; }
      thrust = kind === 'spear' || kind === 'knife' || kind === 'dagger' || kind === 'pistol' || kind === 'crossbow' || kind === 'bow';
      if (thrust) W.position.set(-0.03 * a, 0.02 * a - 0.35 * low, -0.12 * a);
      else W.position.set(-0.16 * a, 0.05 * a - 0.35 * low, -0.04 * a);
      W.rotation.set(thrust ? 0 : -0.55 * a, 0, thrust ? 0 : 0.95 * a);
    }
  }

  // ================================================================================================ picking parity
  let vcam = null;
  function pickFrame(env, ents) {
    if (typeof R3D === 'undefined' || !R3D.pickFrame) return;
    try { vcam = R3D.pickFrame(Engine.cam, env, ents); } catch (e) { warnOnce('pickFrame', e); vcam = null; return; }
    // ent._screen exactly when the CPU frame would set it (gameplay reads it), its rect the CPU's
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i]; if (!e) continue;
      const p = e._pickScr && vcam && e._pickScr.gen === vcam.gen ? e._pickScr : null;
      e._screen = p ? { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, dist: p.dist, z: p.z } : null;
    }
  }
  function depthAt(x, y) {
    if (!vcam || typeof R3D === 'undefined' || !R3D.vdepth) return 1e9;
    const S = vcam.S || 1, px = (x * S) | 0, ry = (y * S) | 0;
    if (px < 0 || ry < 0 || px >= vcam.w || ry >= vcam.h) return 1e9;
    try { return R3D.vdepth(px, ry); } catch (e) { return 1e9; }
  }
  function materialAt(x, y) {
    const d = depthAt(x, y); if (!vcam) return 0;
    const S = vcam.S || 1, ry = y * S, m = vcam.map;
    if (d >= 1e8) return (m && m.outdoor && ry < vcam.horizon) ? MAT.sky : MAT.other;
    const camX = 2 * x / 320 - 1, rdx = vcam.dirX + vcam.planeX * camX, rdy = vcam.dirY + vcam.planeY * camX;
    // the walk's surfaces carry its depth bias (Engine.SURF_BIAS); a riser's depth does not
    const SB = (typeof Engine !== 'undefined' && Engine.SURF_BIAS) || 0.45, t = Math.max(0.03, d - SB);
    const wx = vcam.x + rdx * t, wy = vcam.y + rdy * t, wz = vcam.z - (ry - vcam.horizon) * t / vcam.h;
    if (m.ceil && wz >= (m.ceilZ || 1) - 0.05) return MAT.ceiling;
    const g = m ? ground(m, wx, wy) : 0;
    if (Math.abs(wz - g) < 0.08 + 0.02 * t) {
      const cx = clamp(wx | 0, 0, m.w - 1), cy = clamp(wy | 0, 0, m.h - 1);
      const idx = m.floorCells && m.floorTextures ? m.floorCells[cy * m.w + cx] : 0, n = (idx && m.floorTextures[idx]) || m.floor;
      return n === 't_water' ? MAT.water : n === 't_shallows' ? MAT.shallows : MAT.ground;
    }
    for (const s of vcam.list || []) if (Math.abs(s.trY - d) < 1e-6) return MAT.sprite;
    return MAT.wall;
  }

  // ================================================================================================ the frame
  const F = { dt: 0.016, t: 0, walk: 0, cam: null, env: null, map: null, tod: 0.5, P: null, ents: null, R11: null };
  let lastNow = 0, lastX = null, lastY = null;
  function drawFrame(ents, tod, opts, env) {
    const t0 = now();
    const m = env.map;
    if (sizeDirty || benchScale() !== lastScale) fit();
    const nowS = t0 / 1000; F.dt = lastNow ? clamp(nowS - lastNow, 0, 0.1) : 0.016; lastNow = nowS; F.t += F.dt;
    const c = Engine.cam;
    if (lastX != null) { const mv = Math.hypot(c.x - lastX, c.y - lastY); if (mv < 0.5) F.walk += mv * 6.5; }
    lastX = c.x; lastY = c.y;
    LF.now = nowS;
    ensureWorld(m);
    const P = lightFrame(env, m, tod);
    const eye = cameraFrame(c, env, m);
    if (R.sun.castShadow) sunFollow(eye);
    lightsFrame(env);
    buildDoors(m, c);
    bbFrame(env, ents, m);
    pickFrame(env, ents);
    // the water's normals drift
    const wm = baseMats.water; if (wm && wm.normalMap) { wm.normalMap.offset.set((F.t * 0.012) % 1, (F.t * 0.007) % 1); }
    F.cam = c; F.env = env; F.map = m; F.tod = tod; F.P = P; F.ents = ents;
    emit('frame', F);
    vmFrame(F.t, F.walk);
    if (!api.paused || st.renderOnce) {
      st.renderOnce = false;
      renderer.info.reset();
      if (R.composer) R.composer.render(F.dt);
      else {
        renderer.autoClear = false; renderer.setRenderTarget(null); renderer.clear();
        renderer.render(R.scene, R.camera);
        renderer.clearDepth(); renderer.render(R.vmScene, R.vmCam);
        renderer.autoClear = true;
      }
      stats.draws = renderer.info.render.calls;
    }
    try { if (typeof R11BENCH !== 'undefined' && R11BENCH && typeof R11BENCH.sample === 'function') R11BENCH.sample(F.dt * 1000); } catch (e) { warnOnce('bench sample', e); }
    stats.frames++; stats.last = Math.round((now() - t0) * 10) / 10;
    st.drew = true;
    return true;
  }
  // the world's own draw calls (no billboards, sky, viewmodel, KIT): the meshes R11 built for the map
  function worldDraws() { let n = 0; if (R.world) R.world.traverse((o) => { if (o.isMesh && o.visible) n += Array.isArray(o.material) ? o.geometry.groups.length || 1 : 1; }); return n; }

  // ================================================================================================ on / off
  function owns() {
    return !!(st.style === 'realistic' && allowed && st.ready && !st.failed && !st.lost && renderer && !originalish() &&
      typeof GPU18 !== 'undefined' && GPU18.claimHud && typeof Engine !== 'undefined');
  }
  function sync() {
    if (st.style === 'realistic' && allowed && !st.loading && !st.loaded && !st.failed) init();
    const want = owns();
    const game = typeof document !== 'undefined' ? document.getElementById('game') : null;
    if (want && !st.shown) {
      st.shown = true; sizeDirty = true;
      try { GPU18.claimHud(api); } catch (e) { warnOnce('claim', e); }
      if (game) game.classList.add('r11-on');
      if (typeof GFX !== 'undefined') GFX.r11 = true;
    } else if (!want && st.shown) {
      st.shown = false; st.drew = false;
      try { if (GPU18.hudClaim && GPU18.hudClaim() === api) GPU18.claimHud(null); } catch (e) { warnOnce('release', e); }
      if (game) game.classList.remove('r11-on');
      if (typeof GFX !== 'undefined') GFX.r11 = false;
    }
    syncRow();
    return st.shown;
  }
  function fail(e) {
    if (!st.failed) console.warn('r11core: the realistic renderer stopped for this session; R3D or the raycaster draws instead.', e);
    st.failed = true; st.failWhy = String(e && e.message || e);
    try { sync(); } catch (err) { /* fine */ }
  }
  function setStyle(s) {
    if (s !== 'realistic' && s !== 'pixel') return st.style;
    if (s === st.style) return s;
    st.style = s; writeStore({ style: s });
    sync(); emit('style', s);
    return s;
  }
  function setTier(t) {
    if (!TIERS[t]) return st.tier;
    st.tier = t; writeStore({ tier: t });
    if (renderer) applyTier();
    emit('tier', t);
    return t;
  }

  // ================================================================================================ init (async)
  function init() {
    if (st.loading || st.loaded) return;
    T3 = (typeof window !== 'undefined' && window.R11THREE) || null;
    if (!T3) return;   // the module has not arrived yet: the 'r11three' event calls back
    if (st.available === false || !probe()) return;
    st.loading = true;
    try {
      THREE = T3.THREE;
      patchFog();
      renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false, premultipliedAlpha: false });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.info.autoReset = false;
      maxAniso = renderer.capabilities.getMaxAnisotropy();
      const mgr = new THREE.LoadingManager();
      loader = new THREE.TextureLoader(mgr);
      R.scene = new THREE.Scene(); R.scene.name = 'r11';
      R.scene.fog = new THREE.FogExp2(0x8c9599, 0.05);
      R.camera = new THREE.PerspectiveCamera(60, 320 / 200, 0.02, 400); R.camera.matrixAutoUpdate = false; R.camera.matrixWorldAutoUpdate = false;
      R.vmScene = new THREE.Scene(); R.vmScene.name = 'r11-vm';
      R.vmCam = new THREE.PerspectiveCamera(52, 1.6, 0.01, 10);
      R.vmHemi = new THREE.HemisphereLight(0xd9e2e6, 0x4a4036, 0.7); R.vmScene.add(R.vmHemi);
      const key = new THREE.DirectionalLight(0xfff0dc, 0.9); key.position.set(-1, 2, 1); R.vmScene.add(key); R.vmKey = key;
      R.hemi = new THREE.HemisphereLight(0xcdd6db, 0x51463b, 0.55); R.scene.add(R.hemi);
      R.sun = new THREE.DirectionalLight(0xffeeda, 1.35); R.sun.castShadow = true; R.scene.add(R.sun); R.scene.add(R.sun.target);
      Object.assign(api, { THREE, renderer, scene: R.scene, camera: R.camera, vm: { scene: R.vmScene, camera: R.vmCam } });
      api.R = R;
      // the scanned materials (shared with KIT through R11.mat) and the sky
      for (const k in BASE) if (BASE[k].scan) baseMat(k);
      const hdrUrl = base() + 'sky/sky_2k.hdr.wasm';
      new T3.HDRLoader().load(hdrUrl, (hdr) => {
        try {
          hdr.mapping = THREE.EquirectangularReflectionMapping;
          R.hdr = hdr; shared.add(hdr);
          const pm = new THREE.PMREMGenerator(renderer);
          R.env = pm.fromEquirectangular(hdr).texture; pm.dispose(); shared.add(R.env);
          R.scene.environment = R.env; R.vmScene.environment = R.env;
          skyInit(); bbInit(); applyTier();
          const done = () => { if (pending > 0) { setTimeout(done, 50); return; } st.loaded = true; st.loading = false; st.ready = true; api.ready = true; try { sync(); } catch (e) { warnOnce('sync', e); } emit('ready'); };
          done();
        } catch (e) { st.loading = false; fail(e); }
      }, undefined, (e) => { st.loading = false; fail(e); });
    } catch (e) { st.loading = false; fail(e); }
  }

  // ================================================================================================ integration
  let r3dOverride = null;
  function wire() {
    if (typeof Engine === 'undefined' || !Engine.setRenderOverride) return;
    r3dOverride = (typeof R3D !== 'undefined' && R3D && R3D.renderOverride) || null;
    Engine.setRenderOverride((ents, tod, opts, env) => {
      if (st.inFrame && st.shown) {
        try { return drawFrame(ents, tod, opts, env); } catch (e) { fail(e); return false; }
      }
      return r3dOverride ? r3dOverride(ents, tod, opts, env) : false;
    });
    if (typeof render === 'function') {
      const _render = render;
      render = function () {
        if (st.shown !== owns() || (!st.loaded && st.style === 'realistic' && allowed && !st.loading && !st.failed)) sync();
        if (!st.shown) { st.drew = false; return _render.apply(this, arguments); }
        st.inFrame = true; st.drew = false;
        try { return _render.apply(this, arguments); } finally { st.inFrame = false; }
      };
    }
    const _pick = Engine.pick, _depth = Engine.depthAt, _mat = Engine.materialAt;
    const mine = () => st.shown && st.drew && vcam && vcam.map === (typeof G !== 'undefined' ? G.map : null);
    Engine.pick = function (ents, maxDist) { if (mine() && typeof R3D !== 'undefined' && R3D.pick) return R3D.pick(ents, maxDist); return _pick.apply(this, arguments); };
    Engine.depthAt = function (x, y) { if (mine()) return depthAt(x, y); return _depth.apply(this, arguments); };
    Engine.materialAt = function (x, y) { if (mine()) return materialAt(x, y); return _mat.apply(this, arguments); };
    // the pixel hands stand down while KIT's 3D hands are drawn (integration): every first-person picture is an
    // Engine.images 'fp_*' entry (body21 swaps its tinted copies into those same keys), so the HUD layer skips those
    // pictures for this frame; body21 (legs, head, the resting glass hand) sits the frame out; the base draw sees no weapon.
    // Crosshair, names, messages and the panel draw as before. Pixel style never enters here.
    if (typeof drawHUD === 'function') {
      const _hud = drawHUD, NONE = { img: '__r11_none__', name: '', type: 'iron', speed: 0.4 };
      const fpSet = () => { const s = new Set(); try { for (const k in Engine.images) if (k.slice(0, 3) === 'fp_') s.add(Engine.images[k]); } catch (e) { /* none */ } return s; };
      drawHUD = function () {
        if (!(st.inFrame && st.drew && VM.arm && VM.arm.group) || typeof Engine === 'undefined' || !Engine.ctx) return _hud.apply(this, arguments);
        const ctx = Engine.ctx, own = Object.prototype.hasOwnProperty.call(ctx, 'drawImage'), prev = ctx.drawImage;
        const g0 = typeof GFX !== 'undefined' ? GFX.body21 : undefined, cw = typeof currentWeapon === 'function' ? currentWeapon : null;
        ctx.drawImage = function (img) { if (fpSet().has(img)) return; return prev.apply(this, arguments); };
        if (typeof GFX !== 'undefined') GFX.body21 = false;
        if (cw) currentWeapon = () => NONE;
        try { return _hud.apply(this, arguments); } finally {
          if (cw) currentWeapon = cw;
          if (typeof GFX !== 'undefined') GFX.body21 = g0;
          if (own) ctx.drawImage = prev; else delete ctx.drawImage;
        }
      };
    }
    wireMenu();
    if (typeof GFX !== 'undefined' && GFX.onChange) GFX.onChange(() => { try { sync(); } catch (e) { warnOnce('sync', e); } });
  }

  // ---- Options: "Art style" (Realistic / Pixel) in Graphics & access
  const ROW = ['r11-artstyle', 'Art style', 'Realistic: the new 3D look; Pixel: the pixel-art look'];
  function syncRow() {
    if (typeof document === 'undefined') return;
    const b = document.getElementById(ROW[0]); if (!b) return;
    b.textContent = st.style === 'realistic' ? 'Realistic' : 'Pixel';
    b.setAttribute('aria-pressed', st.style === 'realistic' ? 'true' : 'false'); b.classList.toggle('sel', st.style === 'realistic');
    const h = document.getElementById(ROW[0] + '-hint');
    if (h) h.textContent = st.style === 'realistic' && (st.available === false || st.failed) ? 'needs hardware WebGL 2: this device shows the pixel look' : st.style === 'realistic' && originalish() ? 'the Original preset always shows the pixel look' : ROW[2];
  }
  function appendRow() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById(ROW[0]) || !document.getElementById('gfx-state')) return;
    const anchor = document.getElementById('gfx-state');
    const lab = document.createElement('span'); lab.className = 'gfx-label'; lab.id = ROW[0] + '-label'; lab.textContent = ROW[1] + ' ';
    const small = document.createElement('small'); small.className = 'muted'; small.id = ROW[0] + '-hint'; small.textContent = ROW[2]; lab.appendChild(small);
    const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = ROW[0]; b.type = 'button'; b.setAttribute('aria-label', ROW[1]);
    b.onclick = () => { setStyle(st.style === 'realistic' ? 'pixel' : 'realistic'); };
    if (anchor && anchor.parentNode === grid) { anchor.insertAdjacentElement('afterend', b); anchor.insertAdjacentElement('afterend', lab); }
    else { grid.insertBefore(b, grid.firstChild); grid.insertBefore(lab, b); }
    syncRow();
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendRow(); } catch (e) { warnOnce('row', e); } return r; };
  }

  // ================================================================================================ API
  const api = {
    KEY, ZK, FX, M, TIERS, BASE, TEX, st, stats, ready: false, paused: false,
    THREE: null, renderer: null, scene: null, camera: null, vm: { scene: null, camera: null },
    active: () => st.shown && st.drew, owns, shown: () => st.shown, style: () => st.style, setStyle, tier: () => st.tier, setTier,
    mat: (n, o) => (THREE ? mat(n, o) : null), toWorld, on, off, sync,
    renderOnce() { st.renderOnce = true; if (typeof render === 'function') render(); return st.drew; },
    viewRows(n) { if (n >= 150 && n <= 200) viewRows = n | 0; return viewRows; },
    worldDraws, textureInfo: (n) => (THREE ? info(n) : null), invalidate: () => { worldDirty = true; },
    canvas: () => canvas, failed: () => st.failed,
    memory: () => (renderer ? Object.assign({}, renderer.info.memory) : null),
    pickFrameCam: () => vcam, replaced: () => replacedNow,
  };
  function boot() {
    load();
    wire();
    if (typeof window !== 'undefined') window.addEventListener('r11three', () => { try { sync(); } catch (e) { warnOnce('sync', e); } });
    try { sync(); } catch (e) { warnOnce('boot sync', e); }
  }
  try { boot(); } catch (e) { warnOnce('boot', e); }
  return api;
})();
if (typeof window !== 'undefined') window.R11 = R11;
