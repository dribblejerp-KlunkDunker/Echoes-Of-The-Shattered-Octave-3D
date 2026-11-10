// r11harbour — ROADMAP R11 phase 4, team HARBOUR: Port Cantabile's Long Mole, the Lantern Yard and the cliff town, dressed
// to the owner's picture 3 (docs/graphics/bench3-harbour.jpg) in the realistic style (R11; docs/graphics/art-bible.md).
//
// Contract: pushes { id: 'harbour', maps(map) -> bool, dress(map, ctx) -> { group, hiddenCells, replaced } } onto
// window.R11DRESSERS (r11core calls it after R11KIT.dressMap, with the same ctx, and tears the group down with KIT's on map
// change). Exports window.R11HARBOUR = { dress, last, MAPID, lit(tod) } and R11.benchCams.harbour (picture 3's camera).
//
// WHAT IT DRAWS (map 'cantabile_harbour', js/cantabile17.js buildHarbour; every piece answers "who uses this?"):
//   the Long Mole as Book Two, Part One ch. 7 has it (owner's ruling 9 Nov 2026; the map follows, js/cantabile17.js): twenty
//     feet of big dressed flags (real joints, each flag its own tone, tide-worn toward the water); on the left walking out
//     the harbour, a kerb of big blocks over a face dark and weeded with the tide, "an iron ring every few paces to make fast
//     to" (game text), iron ladder-rungs let into the harbour face, the Mole steps' landing and its steps; on the right the
//     sea "behind a parapet wall of granite blocks the height of a man's chest" (the map's wall cells, drawn in courses with
//     a coping, the rough apron going down to the sea); iron bollards, "mushroom-topped, waist-high", down the middle;
//   the Mole-head, "a round stone platform thirty yards across, with the mast-tower standing up out of the middle of it":
//     courses of flags in rings, a kerb ring, a round face; the mast-tower (sixty feet of iron rungs, a cradle at the top),
//     the Mole-light (the tower-lantern), the derrick with the board of the Free Captains' Articles ("painted white on black
//     board, in numbered lines") and "and above" chalked under them, the rope from the cradle to the derrick (Library: Going
//     Up), the Mole-bell on its iron bracket on the side of the tower at head height, the lifebuoy on its bracket by it;
//   the moored boats (the map's own, now hulls with a stubby mast, a furled sail and the carillon bar of bronze tubes at the
//     shroud-head; they bob with the game's own swing), made fast fore and aft with thick laid rope (a tube on a catenary)
//     to kerb bollards with rope turns, or to posts and rings; rope coils, crates and casks in odd groups where people work
//     (the Harbour office, against the parapet, the derrick's salvage, the Mole steps' ferry);
//   the houses: Hesper's four houses and the Harbour office in the Yard, and the terrace houses up the cliff, lime-washed
//     with slate roofs, chimneys, shutters, windows lit at night, replacing core's plain blocks (hiddenCells; never doors);
//     the counting-house at the top against the sky (square stone, slate roof, iron shutters); the Stair's parapets get
//     their dressed coping and the east rail its iron stanchions and two strung cables (game text).
//   [PROPOSED] (army/R11-P4/HARBOUR/TEXT.md): the kerb bollards; the number of numbered lines on the Articles board; the
//     hull colours; the bracket lanterns' places. The timber jetty off the Mole steps' landing is APPROVED (owner).
// Scale (art bible): R11.M units per metre; built in metres inside a group scaled by M; three.x = map x, three.z = map y,
// three.y = game height x ZK. Draws: one mesh per material (merged), boats bob in the vertex shader (one draw per boat
// material for all boats), lanterns and crates instanced.
'use strict';
(function () {
  const ID = 'harbour', MAPID = 'cantabile_harbour';
  const PI = Math.PI;
  const S = { last: null, mats: null, matsT: null, hooked: false };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11harbour: ' + k + ' failed', e); } catch (x) { /* none */ } } };
  const tr = (s) => { try { return (typeof STORY_I18N !== 'undefined' && STORY_I18N.translate && STORY_I18N.translate(s)) || s; } catch (e) { return s; } };
  const ZK = 0.61875;
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const T3 = (ctx) => (ctx && ctx.THREE) || (window.R11 && window.R11.THREE) || (window.R11THREE && window.R11THREE.THREE) || null;
  // the harbour's lamp rule (js/cantabile17.js LAMP): out by day, lit from dusk (0.715) to dawn (0.26)
  const lit = (tod) => tod < 0.26 || tod >= 0.715;
  const SAND = 'large_sandstone_blocks_01';
  const MAXBOATS = 15;   // boat ids 1..MAXBOATS index uLift (0: not a boat)

  // ======================================================================== materials (cached, shared across builds)
  function canvasTex(THREE, w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function weedTex(THREE) {   // a ragged band of weed and wrack: dark olive, brown, a few lighter fronds; alpha at the top edge
    const r = mulberry(77);
    return canvasTex(THREE, 512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        const x = r() * w, len = 18 + r() * 70 * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.03))), y0 = h;
        const c = r() < 0.6 ? [48 + r() * 20, 56 + r() * 18, 30 + r() * 10] : [70 + r() * 25, 58 + r() * 14, 30 + r() * 10];
        g.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${0.75 + r() * 0.25})`; g.lineWidth = 1 + r() * 3;
        g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + (r() - 0.5) * 14, y0 - len * 0.5, x + (r() - 0.5) * 20, y0 - len); g.stroke();
      }
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(20,26,16,0)'); gr.addColorStop(0.55, 'rgba(26,32,20,0.55)'); gr.addColorStop(1, 'rgba(22,26,18,0.95)');
      g.fillStyle = gr; g.globalCompositeOperation = 'source-over'; g.fillRect(0, h * 0.45, w, h * 0.55);
    });
  }
  function turfTex(THREE) {   // thin salt turf over rock: grey-green, bare patches
    const r = mulberry(5);
    return canvasTex(THREE, 256, 256, (g, w, h) => {
      g.fillStyle = '#58604a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { const c = r() < 0.7 ? [70 + r() * 30, 78 + r() * 26, 56 + r() * 18] : [92 + r() * 30, 88 + r() * 24, 76 + r() * 20]; g.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.6)`; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4); }
    });
  }
  function articlesTex(THREE) {   // the Articles of the Free Captains: white on black board, in numbered lines; "and above" in chalk under them
    const r = mulberry(16);
    return canvasTex(THREE, 256, 384, (g, w, h) => {
      g.fillStyle = '#121212'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '90,80,70'},${0.15 * r()})`; g.fillRect(r() * w, r() * h, 2, 2); }
      g.fillStyle = '#d8d4c8'; g.font = 'bold 16px serif'; g.textAlign = 'center'; g.fillText(tr('ARTICLES'), w / 2, 24);
      const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI'];
      g.textAlign = 'left'; g.font = '11px serif';
      ROM.forEach((n, i) => {
        const y = 44 + i * 17.5; g.fillStyle = 'rgba(225,220,205,0.92)'; g.fillText(n + '.', 10, y);
        // the words are too small to read from the Mole: strokes of white paint, worn
        let x = 38; const end = w - 12 - r() * 40;
        while (x < end) { const ww = 8 + r() * 22; g.fillRect(x, y - 6, Math.min(ww, end - x), 2.4); x += ww + 4; }
      });
      g.save(); g.translate(w / 2, h - 30); g.rotate(-0.05); g.font = 'italic 21px serif'; g.textAlign = 'center';
      g.fillStyle = 'rgba(232,230,222,0.78)'; g.fillText(tr('and above'), 0, 0); g.restore();
      g.strokeStyle = '#3a2a1c'; g.lineWidth = 8; g.strokeRect(0, 0, w, h);
    });
  }
  // the far coast keeps a share of its shape in the air (as KIT's far ring): fog reaches it at FAR_FOG of its density
  const FAR_FOG = 0.36;
  function farFog(m) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * ${FAR_FOG * FAR_FOG} * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar * 2.5, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, 0.92 ) );
#endif`);
    };
    m.customProgramCacheKey = () => 'r11harbour-far';
    return m;
  }
  function mats(THREE, ctx) {
    if (S.mats && S.matsT === THREE) return S.mats;
    const M = {};
    const scan = (name, color, o) => {
      let base = null;
      try { base = ctx && typeof ctx.mat === 'function' ? ctx.mat(name, o || {}) : (window.R11 && R11.mat ? R11.mat(name, o || {}) : null); } catch (e) { warnOnce('mat ' + name, e); }
      const m = base ? base.clone() : new THREE.MeshStandardMaterial({ roughness: 0.9 });
      m.vertexColors = true; if (Array.isArray(color)) m.color.setRGB(color[0], color[1], color[2], THREE.LinearSRGBColorSpace); else m.color.setHex(color); return m;
    };
    // tints given as [r, g, b] are linear multipliers on the scan (may exceed 1): the dark scans (weathered_planks is about
    // 0.08 linear, cliff_side warm brown) are lifted and turned to picture 3's mid browns and wet greys instead of going black
    M.flag = scan(SAND, [1.1, 1.09, 1.07]);           // the Mole's dressed flags (granite-grey)
    M.quay = scan(SAND, [0.95, 0.94, 0.9]);            // the Mole's faces: granite blocks, green at the water (fix round: as light as the flags; the faces read black in shade)
    M.grout = new THREE.MeshStandardMaterial({ color: 0x4e5043, roughness: 0.92, vertexColors: true });   // the joints: mossy, a shade under the stone, not black
    M.weed = new THREE.MeshStandardMaterial({ map: weedTex(THREE), alphaTest: 0.35, roughness: 0.55, side: THREE.DoubleSide, vertexColors: true });
    M.stone = scan('rustic_stone_wall', 0xb4aca0);     // plinths, chimneys, foundations
    M.ashlar = scan(SAND, 0xb8b2a6);
    M.rock = scan('harbour_cliff_side', [0.62, 1.2, 2.6]);   // Poly Haven cliff_side (CC0), its warm brown turned to wet grey
    M.turf = new THREE.MeshStandardMaterial({ map: turfTex(THREE), roughness: 0.97, vertexColors: true });    // the sea's edge: wet rock, boulders and stacks
    M.far = farFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));   // the coast across the bight, in the haze
    M.plaster = scan('grey_plaster_02', 0xffffff);          // lime-wash (white_plaster_rough_02 is a mossy green scan)
    M.slate = scan('roof_slates_02', 0x8a9096, { ns: 1.2 });
    M.timber = scan('medieval_wood', [1.05, 0.84, 0.6]);
    M.planks = scan('weathered_planks', [1.9, 1.6, 1.3]);
    M.iron = new THREE.MeshStandardMaterial({ color: 0x4a4641, roughness: 0.68, metalness: 0.4, vertexColors: true });
    M.rope = new THREE.MeshStandardMaterial({ color: 0x74644a, roughness: 0.95, vertexColors: true });
    M.bronze = new THREE.MeshStandardMaterial({ color: 0x9a7440, roughness: 0.38, metalness: 1, vertexColors: true });
    M.cloth = new THREE.MeshStandardMaterial({ color: 0xb2a68c, roughness: 0.96, vertexColors: true, side: THREE.DoubleSide });
    M.board = new THREE.MeshStandardMaterial({ map: articlesTex(THREE), roughness: 0.8 });
    M.winDark = new THREE.MeshStandardMaterial({ color: 0x2a3438, roughness: 0.08, metalness: 0, envMapIntensity: 1.2, vertexColors: true });
    M.winLit = new THREE.MeshStandardMaterial({ color: 0x2a3034, roughness: 0.25, emissive: 0xffa040, emissiveIntensity: 0, vertexColors: true });
    M.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.62, 0.25).multiplyScalar(6) });
    // the boats ride the water: their materials lift each boat by the game's own swing (uLift[boatId], metres)
    M.U = { lift: { value: new Array(MAXBOATS + 1).fill(0) } };
    const bob = (m, tag) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uLift = M.U.lift;
        sh.vertexShader = 'attribute float boatId;\nuniform float uLift[' + (MAXBOATS + 1) + '];\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n{ int bi = clamp(int(boatId + 0.5), 0, ' + MAXBOATS + '); transformed.y += uLift[bi]; }');
      };
      m.customProgramCacheKey = () => 'r11harbour-bob-' + tag;
      return m;
    };
    M.hull = bob(scan('weathered_planks', [2.0, 1.75, 1.5]), 'hull');
    M.bWood = bob(scan('medieval_wood', [1.1, 0.86, 0.6]), 'wood');
    M.bRope = bob(new THREE.MeshStandardMaterial({ color: 0x74644a, roughness: 0.95, vertexColors: true }), 'rope');
    M.bBronze = bob(new THREE.MeshStandardMaterial({ color: 0xa47c44, roughness: 0.35, metalness: 1, vertexColors: true }), 'bronze');
    M.bCloth = bob(new THREE.MeshStandardMaterial({ color: 0xb2a68c, roughness: 0.96, vertexColors: true, side: THREE.DoubleSide }), 'cloth');
    for (const k of Object.keys(M)) if (M[k] && M[k].isMaterial) M[k].userData.r11shared = true;
    for (const k of ['board', 'weed']) if (M[k].map) M[k].map.userData = { r11shared: true };
    S.mats = M; S.matsT = THREE;
    return M;
  }
  const BOATKEYS = new Set(['hull', 'bWood', 'bRope', 'bBronze', 'bCloth']);
  const NOSHADOW = new Set(['far', 'grout', 'weed', 'winDark', 'winLit', 'board', 'bRope', 'bBronze']), SMALL = new Set(['iron', 'rope', 'bRope', 'bBronze', 'bCloth', 'cloth']);

  // ======================================================================== geometry accumulator: one mesh per material
  function Acc(THREE) {
    const B = new Map(), REP = { turf: 3.0, rock: 4.5, flag: 3.6, quay: 3.2, stone: 2.4, ashlar: 3.4, plaster: 2.0, slate: 2.0, timber: 1.2, planks: 1.4, hull: 1.4, bWood: 1.2, grout: 2, weed: 1.5 };
    const get = (k) => { let o = B.get(k); if (!o) { o = { p: [], n: [], uv: [], c: [], a: [] }; B.set(k, o); } return o; };
    const _m3 = new THREE.Matrix3(), _p = new THREE.Vector3(), _n = new THREE.Vector3();
    const geoCache = new Map();
    const wuv = (k, x, y, z, nx, ny, nz) => {
      const rep = REP[k] || 2, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ay >= ax && ay >= az) return [x / rep, z / rep];
      if (ax >= az) return [z / rep, y / rep];
      return [x / rep, y / rep];
    };
    const A = {
      THREE, aux: 0,
      // a quad of four points (metres), wound so its normal agrees with the hint; col [r,g,b] or four of them; uvs optional
      quad(k, a, b, c, d, col, uvs, hint) {
        let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let P = [a, b, c, d], U = uvs, Cc = Array.isArray(col && col[0]) ? col : [col, col, col, col];
        if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { P = [a, d, c, b]; nx = -nx; ny = -ny; nz = -nz; if (U) U = [U[0], U[1], U[6], U[7], U[4], U[5], U[2], U[3]]; Cc = [Cc[0], Cc[3], Cc[2], Cc[1]]; }
        const o = get(k);
        for (const j of [0, 1, 2, 0, 2, 3]) {
          const p = P[j]; o.p.push(p[0], p[1], p[2]); o.n.push(nx, ny, nz);
          if (U) o.uv.push(U[j * 2], U[j * 2 + 1]); else { const w = wuv(k, p[0], p[1], p[2], nx, ny, nz); o.uv.push(w[0], w[1]); }
          const cc = Cc[j] || [1, 1, 1]; o.c.push(cc[0], cc[1], cc[2]); o.a.push(A.aux);
        }
      },
      tri(k, a, b, c, col, hint) {
        let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let P = [a, b, c]; if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { P = [a, c, b]; nx = -nx; ny = -ny; nz = -nz; }
        const o = get(k);
        for (const p of P) { o.p.push(p[0], p[1], p[2]); o.n.push(nx, ny, nz); const w = wuv(k, p[0], p[1], p[2], nx, ny, nz); o.uv.push(w[0], w[1]); o.c.push(col[0], col[1], col[2]); o.a.push(A.aux); }
      },
      // a Three geometry through a matrix; uv: 'world' (by the material's repeat) or the geometry's own (times uvS)
      geo(k, g, m4, col, uv, uvS) {
        let G = geoCache.get(g); if (!G) { G = g.index ? g.toNonIndexed() : g; geoCache.set(g, G); }
        const P = G.attributes.position.array, N = G.attributes.normal.array, UV = G.attributes.uv ? G.attributes.uv.array : null, e = m4.elements;
        _m3.getNormalMatrix(m4); const ne = _m3.elements;
        const o = get(k), n = P.length / 3, s = uvS || 1, fn = typeof col === 'function';
        for (let i = 0; i < n; i++) {
          const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
          const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14];
          const a = N[i * 3], b = N[i * 3 + 1], c = N[i * 3 + 2];
          let nx = ne[0] * a + ne[3] * b + ne[6] * c, ny = ne[1] * a + ne[4] * b + ne[7] * c, nz = ne[2] * a + ne[5] * b + ne[8] * c; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
          o.p.push(X, Y, Z); o.n.push(nx, ny, nz);
          if (uv === 'world' || !UV) { const w = wuv(k, X, Y, Z, nx, ny, nz); o.uv.push(w[0], w[1]); } else o.uv.push(UV[i * 2] * s, UV[i * 2 + 1] * s);
          const cc = fn ? col(x, y, z) : (col || [1, 1, 1]); o.c.push(cc[0], cc[1], cc[2]); o.a.push(A.aux);
        }
      },
      // a box w x h x d centred at (x, y, z), turned ry (then rx, rz), world UVs
      box(k, w, h, d, x, y, z, ry, col, rx, rz) {
        const m = new THREE.Matrix4().compose(_p.set(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')), new THREE.Vector3(w, h, d));
        A.geo(k, UNIT(THREE), m, col, 'world');
      },
      // a beam of section t from a to b (metres)
      beam(k, t, a, b, col, t2) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-3;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), _n.set(dx / L, dy / L, dz / L));
        const m = new THREE.Matrix4().compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(t, L, t2 || t));
        A.geo(k, UNIT(THREE), m, col, 'world');
      },
      // a round rod (cylinder) from a to b
      rod(k, r, a, b, col, seg) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-3;
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), _n.set(dx / L, dy / L, dz / L));
        const m = new THREE.Matrix4().compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(r, L, r));
        A.geo(k, CYL(THREE, seg || 6), m, col, null, 1);
      },
      // a sagging rope from a to b (a catenary dropping `sag` metres at the middle), radius r: one smooth tube
      rope(k, a, b, sag, r, col, n) { A.tube(k, catenary(a, b, sag, n || 10), r, col, 5, 0); },
      // a thick laid rope (three strands: the lay shows as a helix of light and dark), a real tube along a catenary
      cable(k, a, b, sag, r, col, n) { A.tube(k, catenary(a, b, sag, n || 18), r, col, 8, 3); },
      // a tube through points (smooth normals, frames carried along by parallel transport); lay > 0 stripes the strands
      tube(k, pts, r, col, seg, lay) {
        seg = seg || 8; const o = get(k), n = pts.length, rings = []; let N = null, s = 0;
        for (let i = 0; i < n; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
          let tx = b[0] - a[0], ty = b[1] - a[1], tz = b[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
          let nx, ny, nz;
          if (!N) { nx = 0; ny = 1; nz = 0; if (Math.abs(ty) > 0.9) { nx = 1; ny = 0; } } else { nx = N[0]; ny = N[1]; nz = N[2]; }
          const d0 = nx * tx + ny * ty + nz * tz; nx -= tx * d0; ny -= ty * d0; nz -= tz * d0; const nl = Math.hypot(nx, ny, nz) || 1; N = [nx / nl, ny / nl, nz / nl];
          const B2 = [ty * N[2] - tz * N[1], tz * N[0] - tx * N[2], tx * N[1] - ty * N[0]];
          if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
          const ring = [];
          for (let j = 0; j <= seg; j++) {
            const th = j / seg * PI * 2, c = Math.cos(th), sn = Math.sin(th);
            const dx = N[0] * c + B2[0] * sn, dy = N[1] * c + B2[1] * sn, dz = N[2] * c + B2[2] * sn;
            const st = lay ? 0.7 + 0.42 * Math.pow(0.5 + 0.5 * Math.sin(lay * (th + s * 0.85 / r)), 1.6) : 1;
            ring.push([pts[i][0] + dx * r, pts[i][1] + dy * r, pts[i][2] + dz * r, dx, dy, dz, j / seg, s / (r * 6.3), col[0] * st, col[1] * st, col[2] * st]);
          }
          rings.push(ring);
        }
        for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
          const a = rings[i][j], b = rings[i + 1][j], c = rings[i + 1][j + 1], d = rings[i][j + 1];
          for (const v of [a, c, b, a, d, c]) { o.p.push(v[0], v[1], v[2]); o.n.push(v[3], v[4], v[5]); o.uv.push(v[6], v[7]); o.c.push(v[8], v[9], v[10]); o.a.push(A.aux); }
        }
      },
      finish(group, M, opts) {
        let meshes = 0;
        for (const [k, o] of B) {
          const mat = M[k]; if (!mat || !o.p.length) continue;
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(o.c, 3));
          if (BOATKEYS.has(k)) g.setAttribute('boatId', new THREE.Float32BufferAttribute(o.a, 1));
          g.computeBoundingSphere();
          const mesh = new THREE.Mesh(g, mat); mesh.name = 'harbour:' + k; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
          mesh.castShadow = !opts.noShadow.has(k) && !(opts.phone && opts.small.has(k)); mesh.receiveShadow = true;
          if (k === 'weed' || k === 'grout') mesh.renderOrder = 1;
          if (BOATKEYS.has(k)) mesh.frustumCulled = false;
          group.add(mesh); meshes++;
        }
        return meshes;
      },
    };
    return A;
  }
  // a catenary from a to b dropping `sag` at the middle (n segments)
  function catenary(a, b, sag, n) {
    const k = 1.6, ck = Math.cosh(k), P = [];
    for (let i = 0; i <= n; i++) { const t = i / n, f = (Math.cosh(k * (2 * t - 1)) - ck) / (ck - 1); P.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * f, a[2] + (b[2] - a[2]) * t]); }
    return P;
  }
  let _unit = null, _cyl = {}, _unitT = null;
  function UNIT(THREE) { if (!_unit || _unitT !== THREE) { _unit = new THREE.BoxGeometry(1, 1, 1).toNonIndexed(); _cyl = {}; _unitT = THREE; } return _unit; }
  function CYL(THREE, seg) { UNIT(THREE); if (!_cyl[seg]) _cyl[seg] = new THREE.CylinderGeometry(1, 1, 1, seg, 1, false).toNonIndexed(); return _cyl[seg]; }

  // ======================================================================== the map, read
  function reader(map, M) {
    const W = map.w, H = map.h, C = 1 / M;
    const cell = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? null : map.cells[y * W + x];
    const blk = (c) => !!(c && !c.door);
    const ftex = (x, y) => (map.floorCells && map.floorTextures) ? map.floorTextures[map.floorCells[y * W + x]] : null;
    const lvl = (x, y) => (map.lvls ? map.lvls[y * W + x] : 0) || 0;
    const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const R = {
      W, H, C, cell, blk, ftex, lvl,
      water: (x, y) => inMap(x, y) && !blk(cell(x, y)) && /^t_(water|shallows)$/.test(ftex(x, y) || ''),
      // the Mole's flat cells (the ramp up from the Yard is sloped: core draws it, with its side walls)
      mole: (x, y) => inMap(x, y) && !blk(cell(x, y)) && ftex(x, y) === 'p17c_mole' && !(map.smooth && map.smooth[y * W + x]),
      walk: (x, y) => inMap(x, y) && !blk(cell(x, y)) && !/^t_(water|shallows)$/.test(ftex(x, y) || ''),
      top: (x, y) => { const c = cell(x, y); return blk(c) ? (c.top != null ? c.top : lvl(x, y) + 1) : lvl(x, y); },
      tex: (x, y) => { const c = cell(x, y); return c ? c.tex : null; },
      X: (x) => x * C, Z: (y) => y * C, Y: (gz) => gz * ZK * C,
      idx: (x, y) => y * W + x,
    };
    return R;
  }

  // ======================================================================== builders
  const GREY = [1, 1, 1];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  // ---- the Long Mole and the Mole steps' landing: big flags with real joints, faces, weed. The Mole-head (round, Book Two) is
  // drawn by roundHead; the parapet on the sea side by parapet. Book Two, Part One ch. 7: "four hundred and twelve yards of
  // dressed stone, twenty feet wide"; on the harbour side "a sheer drop ... to black water slopping against the stones".
  // The water's edge is a kerb of big dressed blocks, darker and weeded at the waterline (picture 3).
  function mole(A, R, hidden, r, out, H) {
    const C = R.C, cells = [];
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) if (R.mole(x, y)) { cells.push([x, y]); hidden.add(R.idx(x, y)); }
    out.moleCells = cells.length;
    const inHead = (x, y) => H.has(x, y);
    const WY = R.Y(-0.05);
    const ROWS = 3, band = C / ROWS, g = 0.007, ch = 0.012;   // flags about a metre across, tight joints (picture 3)
    const nearWater = (x, y) => R.water(x, y);
    const isM = (x, y) => R.mole(x, y) && !inHead(x, y);
    for (let y = 0; y < R.H; y++) {
      for (let b = 0; b < ROWS; b++) {
        const z0 = y * C + b * band, z1 = z0 + band;
        const edgeN = b === 0, edgeS = b === ROWS - 1;
        let x = 0;
        while (x < R.W) {
          if (!isM(x, y)) { x++; continue; }
          const xs = x; while (x < R.W && isM(x, y)) x++;
          const xe = x, X0 = xs * C;
          // a run that ends at the Mole-head stops at the head's rim (the round paving takes over)
          let X1 = xe * C; if (inHead(xe, y)) X1 = Math.max(X0 + 0.5, H.rimX((z0 + z1) / 2));
          let px = X0, first = true;
          while (px < X1 - 0.02) {
            let L = 0.85 + r() * 1.05; if (first) { L *= 0.3 + r() * 0.7; first = false; }
            let qx = Math.min(X1, px + L); if (X1 - qx < 0.4) qx = X1;
            const cx = clamp(Math.floor((px + qx) / 2 / C), xs, xe - 1);
            const top = R.Y(R.lvl(cx, y));
            // tide-wear: the flags by the water's edge are darker and greener
            const wet = (edgeN && nearWater(cx, y - 1)) || (edgeS && nearWater(cx, y + 1)) || (px <= X0 + 0.01 && nearWater(xs - 1, y)) || (qx >= X1 - 0.01 && nearWater(xe, y));
            const k = 0.86 + r() * 0.3, warm = r() < 0.25 ? 1.06 : 1;
            let col = [k * warm, k, k / warm];
            if (wet) col = [col[0] * 0.84, col[1] * 0.88, col[2] * 0.8];
            if (r() < 0.08) col = shade(col, 0.82);
            slab(A, px + g, z0 + g, qx - g, z1 - g, top + (r() - 0.5) * 0.01, ch, col, r);
            px = qx;
          }
        }
      }
    }
    // the joints: a dark, mossy bed under the flags
    for (const [x, y] of cells) {
      if (inHead(x, y)) continue;
      const t = R.Y(R.lvl(x, y)) - 0.025, X0 = x * C, X1 = X0 + C, Z0 = y * C, Z1 = Z0 + C;
      A.quad('grout', [X0, t, Z0], [X0, t, Z1], [X1, t, Z1], [X1, t, Z0], [1, 1.05, 0.95], null, [0, 1, 0]);
    }
    // the faces: granite down into the water, dark and green with the tide; weed at the waterline; a kerb of big blocks
    const faces = [];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [x, y] of cells) {
      if (inHead(x, y)) continue;
      const top = R.Y(R.lvl(x, y));
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (inHead(nx, ny) || !R.water(nx, ny)) continue;
        let a, b; const N = [dx, 0, dy];
        if (dx === 1) { a = [(x + 1) * C, y * C]; b = [(x + 1) * C, (y + 1) * C]; }
        else if (dx === -1) { a = [x * C, y * C]; b = [x * C, (y + 1) * C]; }
        else if (dy === 1) { a = [x * C, (y + 1) * C]; b = [(x + 1) * C, (y + 1) * C]; }
        else { a = [x * C, y * C]; b = [(x + 1) * C, y * C]; }
        quayFace(A, a, b, N, top, WY, r);
        faces.push({ a, b, dx, dy, top, x, y });
      }
    }
    // the kerb: big dressed blocks laid end to end along each straight run of face, proud of the flags
    const runs = new Map();
    for (const f of faces) {
      const key = f.dx + ',' + f.dy + ',' + (f.dx ? f.a[0] : f.a[1]).toFixed(3);
      if (!runs.has(key)) runs.set(key, []); runs.get(key).push(f);
    }
    const kerbs = [];
    for (const list of runs.values()) {
      list.sort((p, q) => (p.dx ? p.a[1] - q.a[1] : p.a[0] - q.a[0]));
      let cur = null;
      for (const f of list) {
        const s0 = f.dx ? f.a[1] : f.a[0], s1 = f.dx ? f.b[1] : f.b[0];
        if (cur && Math.abs(cur.s1 - s0) < 0.01) cur.s1 = s1; else { cur = { f, s0, s1 }; kerbs.push(cur); }
      }
    }
    for (const k of kerbs) {
      const f = k.f, th = f.dx ? PI / 2 : 0, line = f.dx ? f.a[0] : f.a[1], inward = -(f.dx || f.dy), W2 = 0.62;
      let s0 = k.s0; const s1 = k.s1;
      k.a = f.dx ? [line, s0] : [s0, line]; k.b = f.dx ? [line, s1] : [s1, line]; k.n = [f.dx, f.dy]; k.top = f.top;
      while (s0 < s1 - 0.05) {
        let L = 1.15 + r() * 0.85; if (s1 - (s0 + L) < 0.6) L = s1 - s0;
        const mid = s0 + L / 2, cOff = line + inward * (W2 / 2 - 0.03);
        const cx = f.dx ? cOff : mid, cz = f.dx ? mid : cOff, kk = 0.78 + r() * 0.22, warm = r() < 0.2 ? 1.05 : 1;
        dblock(A, 'quay', cx, cz, th, L - 0.018, W2, f.top - 0.36, f.top + 0.05 + (r() - 0.5) * 0.015, [0.98 * kk * warm, 0.97 * kk, 0.93 * kk / warm], 0.035, [0.5 * kk, 0.54 * kk, 0.44 * kk]);
        s0 += L;
      }
    }
    out.kerbs = kerbs.length;
    return { faces, kerbs };
  }
  // one stretch of the Mole's face from the deep to the kerb: dark green-black at the water, tide-worn brown-grey to a metre
  // over it, the granite above; weed and wrack at the waterline
  function quayFace(A, a, b, N, top, WY, r) {
    const yb = -1.8, y1 = WY + 0.18, y2 = WY + 0.62, yt = top - 0.3;
    const deep = [0.3, 0.36, 0.28], tide = [0.48, 0.52, 0.4], dry = [0.95, 0.94, 0.9];
    A.quad('quay', [a[0], yb, a[1]], [b[0], yb, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [deep, deep, tide, tide], null, N);
    A.quad('quay', [a[0], y1, a[1]], [b[0], y1, b[1]], [b[0], y2, b[1]], [a[0], y2, a[1]], [tide, tide, shade(tide, 1.25), shade(tide, 1.25)], null, N);
    if (yt > y2) A.quad('quay', [a[0], y2, a[1]], [b[0], y2, b[1]], [b[0], yt, b[1]], [a[0], yt, a[1]], [shade(tide, 1.25), shade(tide, 1.25), dry, dry], null, N);
    const e = 0.03, L = Math.hypot(b[0] - a[0], b[1] - a[1]), u0 = (a[0] + a[1]) / 1.5, u1 = u0 + L / 1.5;
    A.quad('weed', [a[0] + N[0] * e, WY - 0.45, a[1] + N[2] * e], [b[0] + N[0] * e, WY - 0.45, b[1] + N[2] * e], [b[0] + N[0] * e, WY + 0.34 + r() * 0.12, b[1] + N[2] * e], [a[0] + N[0] * e, WY + 0.34 + r() * 0.12, a[1] + N[2] * e], [1, 1, 1], [u0, 0, u1, 0, u1, 1, u0, 1], N);
  }
  // a dressed block: centre (cx, cz), its long axis at angle th in the x-z plane, len x wid, y0 to y1, the top edges chamfered
  function dblock(A, k, cx, cz, th, len, wid, y0, y1, col, ch, colBot) {
    const ux = Math.cos(th), uz = Math.sin(th), vx = -uz, vz = ux, hl = len / 2, hw = wid / 2;
    const P = (u, v, y) => [cx + ux * u + vx * v, y, cz + uz * u + vz * v];
    ch = ch || 0; const cb = colBot || shade(col, 0.8), cm = shade(col, 0.93);
    const T = [P(-hl + ch, -hw + ch, y1), P(hl - ch, -hw + ch, y1), P(hl - ch, hw - ch, y1), P(-hl + ch, hw - ch, y1)];
    const M = [P(-hl, -hw, y1 - ch), P(hl, -hw, y1 - ch), P(hl, hw, y1 - ch), P(-hl, hw, y1 - ch)];
    const B = [P(-hl, -hw, y0), P(hl, -hw, y0), P(hl, hw, y0), P(-hl, hw, y0)];
    A.quad(k, T[0], T[1], T[2], T[3], col, null, [0, 1, 0]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, mx = (M[i][0] + M[j][0]) / 2 - cx, mz = (M[i][2] + M[j][2]) / 2 - cz, ml = Math.hypot(mx, mz) || 1, n = [mx / ml, 0, mz / ml];
      if (ch) A.quad(k, M[i], M[j], T[j], T[i], cm, null, [n[0], 1, n[2]]);
      A.quad(k, B[i], B[j], M[j], M[i], [cb, cb, cm, cm], null, n);
    }
  }
  // the Mole-head (Book Two): "a round stone platform thirty yards across, with the mast-tower standing up out of the middle
  // of it". Concentric courses of flags, a kerb ring of big blocks, a round face down into the water with the tide on it.
  function roundHead(A, THREE, R, H, r, WY, out) {
    const C = R.C, cx = H.cx, cz = H.cz, RV = H.rv, top = R.Y(R.lvl(Math.floor(H.x), Math.floor(H.y))), g = 0.008;
    const joinMole = (a) => { const z = cz + Math.sin(a) * RV, x = cx + Math.cos(a) * RV; return x < cx && z > H.zMole0 - 0.05 && z < H.zMole1 + 0.05; };
    // the bed under the flags, a disc of dark joint
    const NS = 96;
    for (let i = 0; i < NS; i++) { const a0 = i / NS * PI * 2, a1 = (i + 1) / NS * PI * 2; A.tri('grout', [cx, top - 0.025, cz], [cx + Math.cos(a1) * RV, top - 0.025, cz + Math.sin(a1) * RV], [cx + Math.cos(a0) * RV, top - 0.025, cz + Math.sin(a0) * RV], [1, 1.05, 0.95], [0, 1, 0]); }
    // the courses: rings of flags from the tower's foot to the kerb
    const KW = 0.66; let rr = 1.25, courses = 0;
    while (rr < RV - KW - 0.3) {
      const w = Math.min(0.85 + r() * 0.3, RV - KW - rr), r1 = rr + w, rm = rr + w / 2, n = Math.max(6, Math.round(PI * 2 * rm / (1.05 + r() * 0.35))), ph = r() * PI * 2;
      for (let i = 0; i < n; i++) {
        const a0 = ph + (i + (r() - 0.5) * 0.25) / n * PI * 2, a1 = ph + (i + 1 + (r() - 0.5) * 0.25) / n * PI * 2;
        const ga = g / rm, k = 0.84 + r() * 0.3, warm = r() < 0.25 ? 1.06 : 1, col = r() < 0.08 ? [0.7 * k, 0.7 * k, 0.68 * k] : [k * warm, k, k / warm];
        arcSlab(A, 'flag', cx, cz, rr + g, r1 - g, a0 + ga, a1 - ga, top + (r() - 0.5) * 0.01, 0.07, col);
      }
      rr = r1; courses++;
    }
    // the kerb ring and the face; on the sea side (the parapet's arc) the kerb is the wall's footing and the face stands
    // out under the wall's outer face
    const onArc = (a) => H.para && H.onPara(a);
    const NK = Math.round(PI * 2 * RV / 1.35);
    for (let i = 0; i < NK; i++) {
      const a0 = i / NK * PI * 2, a1 = (i + 1) / NK * PI * 2, am = (a0 + a1) / 2; if (joinMole(am)) continue;
      const kk = 0.78 + r() * 0.22, arc = onArc(am);
      arcSlab(A, 'quay', cx, cz, RV - KW, arc ? H.rin + 0.06 : RV + 0.02, a0 + 0.009 / RV, a1 - 0.009 / RV, top + (arc ? 0.0 : 0.05 + (r() - 0.5) * 0.015), 0.41, [0.98 * kk, 0.97 * kk, 0.93 * kk], [0.5 * kk, 0.54 * kk, 0.44 * kk]);
    }
    for (let i = 0; i < NS; i++) {
      const a0 = i / NS * PI * 2, a1 = (i + 1) / NS * PI * 2, am = (a0 + a1) / 2; if (joinMole(am)) continue;
      const rad = onArc(am) ? H.rout : RV;
      const P0 = [cx + Math.cos(a0) * rad, cz + Math.sin(a0) * rad], P1 = [cx + Math.cos(a1) * rad, cz + Math.sin(a1) * rad];
      quayFace(A, P0, P1, [Math.cos(am), 0, Math.sin(am)], onArc(am) ? top + 0.28 : top, WY, r);
    }
    if (H.para) {
      // the step in the face where the arc ends on the harbour side (east-north-east), and the wall itself
      const a = H.pa0, n = [Math.sin(a), 0, -Math.cos(a)], P = (rad, y) => [cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad];
      A.quad('quay', P(RV, -1.8), P(H.rout, -1.8), P(H.rout, top - 0.02), P(RV, top - 0.02), [[0.3, 0.36, 0.28], [0.3, 0.36, 0.28], [0.78, 0.78, 0.74], [0.78, 0.78, 0.74]], null, n);
      headWall(A, H, cx, cz, top, r, out);
    }
    out.headCourses = courses; out.headRound = true;
  }
  // the parapet round the Mole-head on the sea side (Book Two: "a parapet wall of granite blocks the height of a man's chest";
  // the map's ring of wall cells, headParapet): three courses of granite blocks on the arc and a coping, as the straight wall
  function headWall(A, H, cx, cz, walk, r, out) {
    const top = H.paraTop, ch = 0.17, cH = (top - ch - (walk - 0.02)) / 3, a0 = H.pa0, a1 = H.pa1, rm = (H.rin + H.rout) / 2;
    let blocks = 0;
    for (let c = 0; c < 3; c++) {
      const y0 = walk - 0.02 + c * cH, y1 = y0 + cH - 0.012;
      let a = a0 - (c % 2 ? 0.4 / rm : 0);
      while (a < a1 - 0.01) {
        const L = (0.9 + r() * 0.75) / rm, b0 = Math.max(a, a0), b1 = Math.min(a1, a + L);
        if ((b1 - b0) * rm > 0.08) {
          const kk = (0.78 + r() * 0.24) * 1.45, warm = r() < 0.2 ? 1.05 : 1, col = [0.92 * kk * warm, 0.9 * kk, 0.86 * kk / warm];
          arcSlab(A, 'flag', cx, cz, H.rin, H.rout, b0 + 0.007 / rm, b1 - 0.007 / rm, y1, y1 - y0, col, c === 0 ? [0.5 * kk, 0.5 * kk, 0.45 * kk] : shade(col, 0.88));
          blocks++;
        }
        a += L;
      }
    }
    // the mortar behind the joints, and the coping of long slabs a little proud on both faces
    for (let i = 0, n = Math.ceil((a1 - a0) * rm / 1.2); i < n; i++) {
      const b0 = a0 + (a1 - a0) * i / n, b1 = a0 + (a1 - a0) * (i + 1) / n;
      arcSlab(A, 'grout', cx, cz, H.rin + 0.04, H.rout - 0.04, b0, b1, top - ch, top - ch - walk, [0.9, 0.92, 0.85]);
    }
    let a = a0;
    while (a < a1 - 0.01) {
      const L = (1.4 + r() * 0.8) / rm, b1 = Math.min(a1, a + L), kk = (0.86 + r() * 0.16) * 1.3, col = [1.02 * kk, 1.0 * kk, 0.96 * kk];
      arcSlab(A, 'flag', cx, cz, H.rin - 0.06, H.rout + 0.06, a + 0.006 / rm, b1 - 0.006 / rm, top, ch, col, shade(col, 0.8));
      a = b1; blocks++;
    }
    out.headParapet = { blocks, a0, a1, rin: H.rin, rout: H.rout };
  }
  // a flag on a ring between radii r0, r1 and angles a0, a1 (three facets along the arc), standing from top-depth to top
  function arcSlab(A, k, cx, cz, r0, r1, a0, a1, top, depth, col, colBot) {
    const P = (rad, a, y) => [cx + Math.cos(a) * rad, y, cz + Math.sin(a) * rad], NA = 3, ch = 0.02, bot = top - depth;
    const cb = colBot || shade(col, 0.8), cm = shade(col, 0.92);
    for (let i = 0; i < NA; i++) {
      const b0 = a0 + (a1 - a0) * i / NA, b1 = a0 + (a1 - a0) * (i + 1) / NA, am = (b0 + b1) / 2;
      A.quad(k, P(r0 + ch, b0, top), P(r1 - ch, b0, top), P(r1 - ch, b1, top), P(r0 + ch, b1, top), col, null, [0, 1, 0]);
      A.quad(k, P(r1, b0, bot), P(r1, b1, bot), P(r1, b1, top - ch), P(r1, b0, top - ch), [cb, cb, cm, cm], null, [Math.cos(am), 0, Math.sin(am)]);
      A.quad(k, P(r1, b0, top - ch), P(r1, b1, top - ch), P(r1 - ch, b1, top), P(r1 - ch, b0, top), cm, null, [Math.cos(am), 1, Math.sin(am)]);
      A.quad(k, P(r0, b0, bot), P(r0, b1, bot), P(r0, b1, top - ch), P(r0, b0, top - ch), [cb, cb, cm, cm], null, [-Math.cos(am), 0, -Math.sin(am)]);
    }
    const n0 = [Math.sin(a0), 0, -Math.cos(a0)], n1 = [-Math.sin(a1), 0, Math.cos(a1)];
    A.quad(k, P(r0, a0, bot), P(r1, a0, bot), P(r1, a0, top), P(r0, a0, top), [cb, cb, cm, cm], null, n0);
    A.quad(k, P(r0, a1, bot), P(r1, a1, bot), P(r1, a1, top), P(r0, a1, top), [cb, cb, cm, cm], null, n1);
  }
  // the parapet on the sea side of the Long Mole (Book Two: "a parapet wall of granite blocks the height of a man's chest"):
  // the map's wall cells (moleParapet) drawn as three courses of big granite through-stones and a coping, the wall in the
  // cell's harbour-side metre; the rest of the cell is the Mole's outer apron, rough blocks and boulders going down to the sea
  function parapet(A, THREE, R, H, hidden, r, WY, out) {
    const C = R.C; let n = 0;
    const isP = (x, y) => { const c = R.cell(x, y); return !!c && R.blk(c) && !!c.moleParapet; };
    for (let y = 0; y < R.H; y++) {
      let x = 0;
      while (x < R.W) {
        if (!isP(x, y)) { x++; continue; }
        const xs = x; while (x < R.W && isP(x, y)) x++;
        const xe = x;
        for (let xx = xs; xx < xe; xx++) hidden.add(R.idx(xx, y));
        const walk = R.Y(R.lvl(xs, y - 1)), top = R.Y(R.cell(xs, y).top), Z0 = y * C + 0.01, T2 = 0.82;
        const X0 = xs * C, X1 = Math.min(xe * C, H.para ? H.joinX + 0.2 : H.rimX(Z0 + T2 / 2) + 0.3);   // meets the head's arc (or tucks into the rim)
        // three courses of through-stones, staggered; a coping of long slabs a little proud on both faces
        const ch = 0.17, cH = (top - ch - (walk - 0.02)) / 3;
        for (let c = 0; c < 3; c++) {
          let px = X0 - (c % 2 ? 0.4 : 0);
          const y0 = walk - 0.02 + c * cH, y1 = y0 + cH - 0.012;
          while (px < X1 - 0.05) {
            let L = 0.9 + r() * 0.75; const a = Math.max(px, X0), b = Math.min(X1, px + L);
            if (b - a > 0.08) {
              const kk = (0.78 + r() * 0.24) * 1.45, warm = r() < 0.2 ? 1.05 : 1, out2 = (r() - 0.5) * 0.02;
              dblock(A, 'flag', (a + b) / 2, Z0 + T2 / 2 + out2, 0, b - a - 0.014, T2, y0, y1, [0.92 * kk * warm, 0.9 * kk, 0.86 * kk / warm], 0.025, c === 0 ? [0.5 * kk, 0.5 * kk, 0.45 * kk] : shade([0.92 * kk, 0.9 * kk, 0.86 * kk], 0.88));
            }
            px += L;
          }
        }
        // the mortar behind the joints
        A.box('grout', X1 - X0, top - ch - walk, T2 - 0.08, (X0 + X1) / 2, (top - ch + walk) / 2, Z0 + T2 / 2, 0, [0.9, 0.92, 0.85]);
        let px = X0;
        while (px < X1 - 0.05) {
          const L = Math.min(X1 - px, 1.4 + r() * 0.8), kk = (0.86 + r() * 0.16) * 1.3;
          dblock(A, 'flag', px + L / 2, Z0 + T2 / 2, 0, L - 0.012, T2 + 0.12, top - ch, top, [1.02 * kk, 1.0 * kk, 0.96 * kk], 0.03, shade([1.02 * kk, kk, 0.96 * kk], 0.8));
          px += L;
        }
        // the foot of the wall on the Mole side: damp and dark, where the sluicing runs off
        A.quad('grout', [X0, walk + 0.003, Z0 - 0.16], [X1, walk + 0.003, Z0 - 0.16], [X1, walk + 0.003, Z0], [X0, walk + 0.003, Z0], [0.7, 0.75, 0.68], null, [0, 1, 0]);
        // the seaward apron: the wall's outer face runs down to rough blocks and wet boulders, the sea over them at the tide
        const Zo = Z0 + T2, Zs = (y + 1) * C + 1.2;
        for (let xx = X0; xx < X1 - 0.1; xx += 1.5) {
          const b = Math.min(X1, xx + 1.5);
          A.quad('quay', [xx, WY - 1.8, Zs], [b, WY - 1.8, Zs], [b, walk - 0.05, Zo], [xx, walk - 0.05, Zo], [[0.36, 0.42, 0.33], [0.36, 0.42, 0.33], [0.85, 0.85, 0.8], [0.85, 0.85, 0.8]], null, [0, 0.8, 1]);
          A.quad('weed', [xx, WY - 0.45, Zo + (WY - 0.45 - walk) / (WY - 1.8 - walk) * (Zs - Zo) + 0.03], [b, WY - 0.45, Zo + (WY - 0.45 - walk) / (WY - 1.8 - walk) * (Zs - Zo) + 0.03], [b, WY + 0.4, Zo + (WY + 0.4 - walk) / (WY - 1.8 - walk) * (Zs - Zo) + 0.03], [xx, WY + 0.4, Zo + (WY + 0.4 - walk) / (WY - 1.8 - walk) * (Zs - Zo) + 0.03], [1, 1, 1], [xx / 1.5, 0, b / 1.5, 0, b / 1.5, 1, xx / 1.5, 1], [0, 0.6, 1]);
        }
        for (let xx = X0 + 0.6; xx < X1; xx += 1.7 + r() * 1.2) boulder(A, THREE, xx, Zo + 1.0 + r() * 1.6, WY + 0.15 + r() * 0.45, 0.7 + r() * 0.5, r, WY);
        n += xe - xs;
        out.parapetRuns = (out.parapetRuns || []).concat([{ x0: X0, x1: X1, z0: Z0, z1: Z0 + T2, top, walk }]);
      }
    }
    out.parapetCells = n;
  }
  // one flag: a slab with a chamfered top (a little proud of the joints)
  function slab(A, x0, z0, x1, z1, top, ch, col, r) {
    const bot = top - 0.07, tl = top + (r() - 0.5) * 0.008, tr2 = top + (r() - 0.5) * 0.008;
    const T = [[x0 + ch, tl, z0 + ch], [x0 + ch, tr2, z1 - ch], [x1 - ch, top, z1 - ch], [x1 - ch, top, z0 + ch]];
    const Bt = [[x0, bot, z0], [x0, bot, z1], [x1, bot, z1], [x1, bot, z0]];
    // the scan sampled inside one of its blocks, a different place for every flag
    const s = 1 / 4.2, u0 = r(), v0 = r(), du = (x1 - x0) * s, dv = (z1 - z0) * s;
    A.quad('flag', T[0], T[1], T[2], T[3], col, [u0, v0, u0, v0 + dv, u0 + du, v0 + dv, u0 + du, v0], [0, 1, 0]);
    const dk = shade(col, 0.84);
    A.quad('flag', Bt[0], Bt[3], T[3], T[0], dk, null, [0, 0.3, -1]);
    A.quad('flag', Bt[1], Bt[2], T[2], T[1], dk, null, [0, 0.3, 1]);
    A.quad('flag', Bt[0], Bt[1], T[1], T[0], dk, null, [-1, 0.3, 0]);
    A.quad('flag', Bt[3], Bt[2], T[2], T[3], dk, null, [1, 0.3, 0]);
  }

  // ---- iron: a mooring ring on a plate on a face (a: point on the face top edge, n: outward)
  function ring(A, THREE, p, n, y) {
    const ry = Math.atan2(n[0], n[2]);
    A.box('iron', 0.2, 0.2, 0.04, p[0] + n[0] * 0.02, y, p[2] + n[2] * 0.02, ry, [0.9, 0.75, 0.62]);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p[0] + n[0] * 0.06, y - 0.1, p[2] + n[2] * 0.06), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, ry, 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    A.geo('iron', TORUS(THREE), m, [0.85, 0.62, 0.48], null);
  }
  let _tor = null, _torT = null, _turn = null;
  function ROPETURN(THREE) { TORUS(THREE); if (!_turn) _turn = new THREE.TorusGeometry(0.165, 0.036, 6, 16); return _turn; }
  function TORUS(THREE) { if (!_tor || _torT !== THREE) { _tor = new THREE.TorusGeometry(0.11, 0.02, 5, 12); _torT = THREE; _turn = null; } return _tor; }
  // an iron bollard, mushroom-topped, waist-high (Book Two)
  let _boll = null, _bollT = null;
  function bollard(A, THREE, x, y, z, sc) {
    if (!_boll || _bollT !== THREE) {
      const P = [[0, 0], [0.27, 0], [0.27, 0.05], [0.18, 0.08], [0.16, 0.5], [0.145, 0.74], [0.13, 0.8], [0.22, 0.84], [0.235, 0.88], [0.2, 0.93], [0.1, 0.96], [0, 0.965]].map(([a, b]) => new THREE.Vector2(a, b));
      _boll = new THREE.LatheGeometry(P, 14); _bollT = THREE;
    }
    A.geo('iron', _boll, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sc || 1, sc || 1, sc || 1)), (px, py) => py > 0.82 ? [1.55, 1.45, 1.35] : py < 0.12 ? [1.1, 0.85, 0.66] : [1.4, 1.26, 1.12], null);   // weathered iron, rust at the foot
  }
  // a timber mooring post (a pile where it stands in the water), iron-capped, with rope round it
  function post(A, THREE, x, z, yb, yt) {
    A.rod('timber', 0.16, [x, yb, z], [x, yt, z], [0.85, 0.78, 0.7], 8);
    A.rod('iron', 0.17, [x, yt - 0.02, z], [x, yt + 0.04, z], [0.9, 0.8, 0.7], 8);
    for (let i = 0; i < 3; i++) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, yt - 0.32 - i * 0.07, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2 + (i - 1) * 0.08, 0, 0)), new THREE.Vector3(1.55, 1.55, 1.55)); A.geo('rope', TORUS(THREE), m, [1, 1, 1], null); }
  }
  // a coil of tarred rope, laid down left hand over right
  function coil(A, THREE, x, y, z, s) {
    s = s || 1;
    for (let i = 0; i < 4; i++) { const k = (1 - i * 0.16) * 2.6 * s; const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.025 + i * 0.04 * s, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, 0)), new THREE.Vector3(k, k, 1.6 * s)); A.geo('rope', TORUS(THREE), m, i % 2 ? [0.62, 0.55, 0.45] : [0.72, 0.64, 0.52], null); }
  }
  // a cooper's cask (0.9 m tall, 0.6 across): staves on a bulge, three iron hoops; 'side': lying
  let _cask = null, _caskT = null;
  function cask(A, THREE, x, y, z, ry, side, s) {
    if (!_cask || _caskT !== THREE) {
      const P = []; for (let i = 0; i <= 8; i++) { const t = i / 8, rr = 0.25 + 0.055 * Math.sin(t * PI); P.push(new THREE.Vector2(rr, t * 0.9)); }
      _cask = new THREE.LatheGeometry(P, 14); _caskT = THREE;
    }
    s = s || 1;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(side ? PI / 2 : 0, ry, 0, 'YXZ'));
    const base = new THREE.Vector3(x, y + (side ? 0.3 * s : 0), z);
    const m = new THREE.Matrix4().compose(base, q, new THREE.Vector3(s, s, s));
    if (side) m.multiply(new THREE.Matrix4().makeTranslation(0, -0.45, 0));
    A.geo('planks', _cask, m, [1.35, 1.15, 0.95], null, 1);
    for (const h of [0.1, 0.45, 0.8]) {
      const mh = m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, h, 0), new THREE.Quaternion(), new THREE.Vector3(0.25 + 0.055 * Math.sin(h / 0.9 * PI) + 0.008, 0.035, 0.25 + 0.055 * Math.sin(h / 0.9 * PI) + 0.008)));
      A.geo('iron', CYL(THREE, 14), mh, [0.75, 0.6, 0.5], null);
    }
    // the head
    const mt = m.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.885, 0), new THREE.Quaternion(), new THREE.Vector3(0.24, 0.02, 0.24)));
    A.geo('planks', CYL(THREE, 14), mt, [1.1, 0.95, 0.8], 'world');
  }

  // ---- boulders: an icosahedron pushed about by a hash of its corners (watertight), a few shapes reused
  let _rocks = null, _rocksT = null;
  function rocks(THREE) {
    if (_rocks && _rocksT === THREE) return _rocks;
    _rocks = []; _rocksT = THREE;
    for (let v = 0; v < 6; v++) {
      const g = new THREE.IcosahedronGeometry(1, 1), P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), k = 0.72 + 0.5 * hash2(Math.round(x * 97), Math.round(y * 89) + v * 13, Math.round(z * 83));
        P.setXYZ(i, x * k * (1 + 0.25 * (v % 3)), y * k * (0.8 + 0.1 * v), z * k);
      }
      const ng = g.toNonIndexed(); ng.computeVertexNormals(); _rocks.push(ng);
    }
    return _rocks;
  }
  // one boulder at (x, z), its top at yt, its foot well under the water; darker and greener below the tide line
  function boulder(A, THREE, x, z, yt, w, r, WY) {
    const R = rocks(THREE)[Math.floor(r() * 6)], h = Math.max(0.6, yt - (WY - 1.5)) / 2, cy = yt - h;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, cy, z), new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 0.5, r() * 6.3, (r() - 0.5) * 0.5)), new THREE.Vector3(w * (0.8 + r() * 0.4), h, w * (0.8 + r() * 0.4)));
    const k = 0.8 + r() * 0.3;
    A.geo('rock', R, m, (px, py) => { const wy = cy + py * h; return wy < WY + 0.5 ? [0.42 * k, 0.48 * k, 0.38 * k] : wy < WY + 1.2 ? [0.62 * k, 0.65 * k, 0.56 * k] : [0.9 * k, 0.88 * k, 0.84 * k]; }, 'world');
  }

  // ---- the cliff the town is built on: core's stepped rock boxes become one rock surface. Each corner takes the highest
  // rock cell around it, so the terraces run up as slopes between the house rows; faces drop at the edges to the Yard, the
  // Stair and the water; flat ground carries thin turf, the rest is wet grey rock (game text: "Wet, grey, furred with weed
  // at the foot"). Cells already hidden (houses, shore rocks) are left alone.
  function cliffRock(A, R, hidden, WY) {
    const W = R.W, H = R.H, C = R.C;
    const isC = (x, y) => x >= 0 && y >= 0 && x < W && y < H && R.blk(R.cell(x, y)) && R.tex(x, y) === 'p17c_cliff' && !hidden.has(R.idx(x, y));
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isC(x, y)) cells.push([x, y]);
    const V = new Float32Array((W + 1) * (H + 1)).fill(-1e9);
    for (const [x, y] of cells) { const t = R.cell(x, y).top; for (const [vx, vy] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) { const i = vy * (W + 1) + vx; if (t > V[i]) V[i] = t; } }
    const allC = (fx, fy) => { const xs = fx & 1 ? [fx >> 1] : [(fx >> 1) - 1, fx >> 1], ys = fy & 1 ? [fy >> 1] : [(fy >> 1) - 1, fy >> 1]; for (const x of xs) for (const y of ys) if (!isC(x, y)) return false; return true; };
    const cache = new Map();
    const hF = (fx, fy) => {   // height (metres) at a half-cell vertex
      const k = fy * (2 * W + 2) + fx; let v = cache.get(k); if (v !== undefined) return v;
      const x0 = fx >> 1, y0 = fy >> 1, tx = (fx & 1) * 0.5, ty = (fy & 1) * 0.5;
      const g = (x, y) => { const q = V[Math.min(H, y) * (W + 1) + Math.min(W, x)]; return q > -1e8 ? q : null; };
      const a = g(x0, y0), b = tx ? g(x0 + 1, y0) : a, c = ty ? g(x0, y0 + 1) : a, d = tx && ty ? g(x0 + 1, y0 + 1) : (tx ? b : c);
      const vals = [a, b, c, d].filter((q) => q != null), mean = vals.reduce((s, q) => s + q, 0) / Math.max(1, vals.length);
      const f = (q) => (q == null ? mean : q);
      let h = (f(a) * (1 - tx) + f(b) * tx) * (1 - ty) + (f(c) * (1 - tx) + f(d) * tx) * ty;
      v = R.Y(h);
      if (allC(fx, fy)) v += (hash2(fx, fy, 41) - 0.5) * 0.9 + (hash2(fx >> 2, fy >> 2, 42) - 0.5) * 0.8;
      cache.set(k, v); return v;
    };
    const P = (fx, fy) => [fx * C / 2, hF(fx, fy), fy * C / 2];
    let quads = 0;
    for (const [x, y] of cells) {
      hidden.add(R.idx(x, y));
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const fx = x * 2 + i, fy = y * 2 + j, a = P(fx, fy), b = P(fx, fy + 1), c = P(fx + 1, fy + 1), d = P(fx + 1, fy);
        const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; ny = Math.abs(ny / l);
        const k = 0.85 + 0.25 * hash2(fx, fy, 43);
        if (ny > 0.8) A.quad('turf', a, b, c, d, [k, k, k], null, [0, 1, 0]);
        else A.quad('rock', a, b, c, d, [0.95 * k, 0.94 * k, 0.9 * k], null, [0, 1, 0]);
        quads++;
      }
      // the faces where the rock meets the Yard, the Stair, a landing or the water
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || isC(nx, ny) || hidden.has(R.idx(nx, ny))) continue;
        const nc = R.cell(nx, ny), wat = R.water(nx, ny), base = R.Y(R.blk(nc) ? R.lvl(nx, ny) : R.lvl(nx, ny)) - (wat ? 1.6 : 0.15);
        for (let s = 0; s < 2; s++) {
          let p, q;
          if (dx === 1) { p = [x * 2 + 2, y * 2 + s]; q = [x * 2 + 2, y * 2 + s + 1]; }
          else if (dx === -1) { p = [x * 2, y * 2 + s]; q = [x * 2, y * 2 + s + 1]; }
          else if (dy === 1) { p = [x * 2 + s, y * 2 + 2]; q = [x * 2 + s + 1, y * 2 + 2]; }
          else { p = [x * 2 + s, y * 2]; q = [x * 2 + s + 1, y * 2]; }
          const tp = P(p[0], p[1]), tq = P(q[0], q[1]);
          if (tp[1] <= base + 0.02 && tq[1] <= base + 0.02) continue;
          const lo = wat ? [0.45, 0.5, 0.38] : [0.75, 0.74, 0.7], hi = [0.95, 0.94, 0.9];
          A.quad('rock', [tp[0], base, tp[2]], [tq[0], base, tq[2]], tq, tp, [lo, lo, hi, hi], null, [dx, 0, dy]);
        }
      }
    }
    return cells.length;
  }

  // ---- a lime-washed house: footprint [x0, z0]-[x1, z1] (metres), front facing +z (or as `front`), standing on g
  function house(A, THREE, o, r, lamps) {
    const { x0, z0, x1, z1, g } = o, wallH = o.wallH, eaves = g + wallH, found = o.found == null ? 0.8 : o.found;
    const tint = o.tint || [0.94, 0.92, 0.86], dark = shade(tint, 0.74), pl = 0.55;
    const corners = [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];   // front-left, front-right, back-right, back-left
    const sides = [[0, 1, [0, 0, 1], 'front'], [1, 2, [1, 0, 0], 'east'], [2, 3, [0, 0, -1], 'back'], [3, 0, [-1, 0, 0], 'west']];
    for (const [i, j, N, name] of sides) {
      if (o.skip && o.skip[name]) continue;
      const a = corners[i], b = corners[j];
      A.quad('stone', [a[0], g - found, a[1]], [b[0], g - found, b[1]], [b[0], g + pl, b[1]], [a[0], g + pl, a[1]], [0.8, 0.78, 0.74], null, N);
      A.quad('plaster', [a[0], g + pl, a[1]], [b[0], g + pl, b[1]], [b[0], eaves, b[1]], [a[0], eaves, a[1]], [dark, dark, tint, tint], null, N);
    }
    // the roof: a gable along x (ridge parallel to the front), or a hip
    const e = 0.38, rise = o.rise || 2.6, zc = (z0 + z1) / 2, ridge = eaves + rise, dz = (z1 - z0) / 2 + e, ey = eaves - e * rise / ((z1 - z0) / 2);
    const SL = Math.hypot(dz, rise + (eaves - ey)), rs = [0.92 + r() * 0.12, 0.92 + r() * 0.12, 0.95 + r() * 0.1];
    if (o.roof === 'hip') {
      const hx = Math.min((z1 - z0) / 2, (x1 - x0) / 2), rx0 = x0 + hx, rx1 = x1 - hx;
      const ex0 = x0 - e, ex1 = x1 + e;
      A.quad('slate', [ex0, ey, z1 + e], [ex1, ey, z1 + e], [rx1, ridge, zc], [rx0, ridge, zc], rs, [0, 0, (ex1 - ex0) / 2, 0, (ex1 - ex0) / 2 - (hx + e) / 2, SL / 2, (hx + e) / 2, SL / 2], [0, 1, 1]);
      A.quad('slate', [ex1, ey, z0 - e], [ex0, ey, z0 - e], [rx0, ridge, zc], [rx1, ridge, zc], rs, [0, 0, (ex1 - ex0) / 2, 0, (ex1 - ex0) / 2 - (hx + e) / 2, SL / 2, (hx + e) / 2, SL / 2], [0, 1, -1]);
      A.tri('slate', [ex0, ey, z0 - e], [ex0, ey, z1 + e], [rx0, ridge, zc], rs, [-1, 1, 0]);
      A.tri('slate', [ex1, ey, z1 + e], [ex1, ey, z0 - e], [rx1, ridge, zc], rs, [1, 1, 0]);
      if (rx1 > rx0) A.box('slate', rx1 - rx0 + 0.3, 0.16, 0.3, (rx0 + rx1) / 2, ridge + 0.03, zc, 0, [0.7, 0.72, 0.74]);
    } else {
      const ex0 = x0 - (o.skip && o.skip.west ? 0 : e), ex1 = x1 + (o.skip && o.skip.east ? 0 : e), len = (ex1 - ex0) / 2;
      A.quad('slate', [ex0, ey, z1 + e], [ex1, ey, z1 + e], [ex1, ridge, zc], [ex0, ridge, zc], rs, [0, 0, len, 0, len, SL / 2, 0, SL / 2], [0, 1, 1]);
      A.quad('slate', [ex1, ey, z0 - e], [ex0, ey, z0 - e], [ex0, ridge, zc], [ex1, ridge, zc], rs, [0, 0, len, 0, len, SL / 2, 0, SL / 2], [0, 1, -1]);
      if (!(o.skip && o.skip.west)) A.tri('plaster', [x0, eaves, z0], [x0, eaves, z1], [x0, ridge, zc], tint, [-1, 0, 0]);
      if (!(o.skip && o.skip.east)) A.tri('plaster', [x1, eaves, z1], [x1, eaves, z0], [x1, ridge, zc], tint, [1, 0, 0]);
      A.box('slate', ex1 - ex0, 0.16, 0.3, (ex0 + ex1) / 2, ridge + 0.03, zc, 0, [0.7, 0.72, 0.74]);
      // the bargeboards under the verge
      for (const xe of [ex0, ex1]) { if ((xe === ex0 && o.skip && o.skip.west) || (xe === ex1 && o.skip && o.skip.east)) continue; A.beam('timber', 0.06, [xe, ey - 0.08, z1 + e], [xe, ridge - 0.08, zc], [0.6, 0.55, 0.5], 0.18); A.beam('timber', 0.06, [xe, ey - 0.08, z0 - e], [xe, ridge - 0.08, zc], [0.6, 0.55, 0.5], 0.18); }
    }
    // chimneys: rubble stone stacks with a pot, on the ridge
    const nCh = o.chimneys == null ? 1 : o.chimneys;
    for (let i = 0; i < nCh; i++) {
      const cx = nCh === 1 ? (r() < 0.5 ? x0 + 0.9 : x1 - 0.9) : x0 + (x1 - x0) * (i + 0.5) / nCh, cz = zc + (r() - 0.5) * 0.6, h = ridge + 1.0 + r() * 0.5;
      A.box('stone', 0.75, h - (ridge - 1.4), 0.6, cx, (h + ridge - 1.4) / 2, cz, 0, [0.82, 0.8, 0.76]);
      A.box('stone', 0.85, 0.1, 0.7, cx, h + 0.04, cz, 0, [0.7, 0.68, 0.64]);
      A.rod('planks', 0.09, [cx, h + 0.09, cz], [cx, h + 0.32, cz], [0.62, 0.42, 0.3], 7);
      if (o.chimneyTops) o.chimneyTops.push([cx, h + 0.32, cz]);
    }
    // the front: a door and windows (half lit at night), shutters on some, a stone sill under each
    const fw = x1 - x0, FZ = z1, out = 1;
    const doorX = o.doorX != null ? o.doorX : (o.door === false ? null : x0 + fw * (0.3 + r() * 0.4));
    if (doorX != null) {
      A.quad('planks', [doorX - 0.55, g, FZ + 0.02], [doorX + 0.55, g, FZ + 0.02], [doorX + 0.55, g + 2.1, FZ + 0.02], [doorX - 0.55, g + 2.1, FZ + 0.02], [1.1, 0.95, 0.8], [0, 0, 0.8, 0, 0.8, 1.5, 0, 1.5], [0, 0, 1]);
      A.box('timber', 0.14, 2.2, 0.12, doorX - 0.62, g + 1.1, FZ + 0.04, 0, [0.6, 0.55, 0.5]); A.box('timber', 0.14, 2.2, 0.12, doorX + 0.62, g + 1.1, FZ + 0.04, 0, [0.6, 0.55, 0.5]);
      A.box('stone', 1.5, 0.22, 0.2, doorX, g + 2.25, FZ + 0.06, 0, [0.85, 0.83, 0.8]);
      A.box('stone', 1.5, 0.16, 0.45, doorX, g + 0.08, FZ + 0.22, 0, [0.75, 0.74, 0.72]);
      A.box('iron', 0.04, 0.04, 0.05, doorX + 0.38, g + 1.05, FZ + 0.05, 0, [0.8, 0.7, 0.6]);
      if (o.lantern && lamps) wallLantern(A, doorX + 0.95, g + 2.45, FZ, lamps, o.lantern);
      if (o.boots) for (let i = 0; i < 7; i++) {   // Hesper's houses: a row of small boots by the door (game text)
        const bx = doorX + 0.75 + i * 0.17 + (r() - 0.5) * 0.03, br = (r() - 0.5) * 0.4, bc = [0.42 + r() * 0.1, 0.3 + r() * 0.06, 0.22];
        A.box('rope', 0.08, 0.1, 0.17, bx, g + 0.05, FZ + 0.18, br, bc); A.box('rope', 0.075, 0.12, 0.08, bx, g + 0.14, FZ + 0.14, br, bc);
      }
    }
    const storeys = wallH > 4.4 ? 2 : 1, sill = [g + 1.0, g + 1.0 + (wallH - 0.4) / 2];
    const n = Math.max(1, Math.floor((fw - 0.8) / 2.3));
    for (let s = 0; s < storeys; s++) for (let i = 0; i < n; i++) {
      const wx = x0 + fw * (i + 0.5) / n;
      if (doorX != null && s === 0 && Math.abs(wx - doorX) < 1.2) continue;
      window_(A, wx, sill[s], FZ, 0.8, s ? 1.0 : 1.1, r, o.litShare == null ? 0.5 : o.litShare, o.shutters !== false, [0, 0, 1]);
    }
    if (o.sideWindows) for (const [xs, N] of [[x0, [-1, 0, 0]], [x1, [1, 0, 0]]]) {
      if (o.skip && ((N[0] < 0 && o.skip.west) || (N[0] > 0 && o.skip.east))) continue;
      for (let s = 0; s < storeys; s++) window_(A, xs, sill[s], (z0 + z1) / 2 + (r() - 0.5) * 1.5, 0.75, 1.0, r, o.litShare == null ? 0.5 : o.litShare, false, N);
    }
  }
  // a window on a wall (x along the wall for a front facing +z; N the wall's outward normal)
  function window_(A, wx, sy, fz, w, h, r, litShare, shutters, N) {
    const along = N[2] !== 0 ? [1, 0, 0] : [0, 0, 1], s = N[0] + N[2];
    const P = (u, y, d) => N[2] !== 0 ? [wx + u, y, fz + N[2] * d] : [fz + N[0] * d, y, wx + u];   // for side walls fz is the wall's x, wx the z
    const key = r() < litShare ? 'winLit' : 'winDark';
    A.quad(key, P(-w / 2, sy, 0.025), P(w / 2, sy, 0.025), P(w / 2, sy + h, 0.025), P(-w / 2, sy + h, 0.025), [1, 1, 1], null, N);
    const ry = Math.atan2(N[0], N[2]);
    const box = (k, bw, bh, bd, u, y, d, col) => { const p = P(u, y, d); A.box(k, bw, bh, bd, p[0], p[1], p[2], ry, col); };
    box('timber', 0.08, h, 0.08, -w / 2 - 0.04, sy + h / 2, 0.06, [0.62, 0.58, 0.52]); box('timber', 0.08, h, 0.08, w / 2 + 0.04, sy + h / 2, 0.06, [0.62, 0.58, 0.52]);
    box('timber', w + 0.16, 0.08, 0.08, 0, sy + h + 0.04, 0.06, [0.62, 0.58, 0.52]); box('timber', 0.05, h, 0.05, 0, sy + h / 2, 0.05, [0.55, 0.5, 0.45]);
    box('timber', w, 0.05, 0.05, 0, sy + h * 0.55, 0.05, [0.55, 0.5, 0.45]);
    box('stone', w + 0.3, 0.09, 0.2, 0, sy - 0.05, 0.1, [0.86, 0.85, 0.82]);
    if (shutters && r() < 0.55) { const sc = r() < 0.5 ? [1.0, 1.15, 1.2] : [1.25, 1.1, 0.9]; box('planks', w / 2, h, 0.04, -w / 2 - w / 4 - 0.09, sy + h / 2, 0.05, sc); box('planks', w / 2, h, 0.04, w / 2 + w / 4 + 0.09, sy + h / 2, 0.05, sc); }
    void along; void s;
  }
  // a lantern on a wall arm by a door (its flame lit at night)
  function wallLantern(A, x, y, fz, lamps, how) {
    A.box('iron', 0.12, 0.3, 0.04, x, y - 0.1, fz + 0.02, 0, [0.85, 0.75, 0.65]);
    A.box('iron', 0.04, 0.04, 0.5, x, y, fz + 0.25, 0, [0.85, 0.75, 0.65]);
    A.beam('iron', 0.03, [x, y - 0.25, fz + 0.03], [x, y - 0.02, fz + 0.4], [0.85, 0.75, 0.65]);
    lamps.push({ p: [x, y - 0.28, fz + 0.48], s: 0.85, rule: true, light: how === 'light' });
  }

  // ---- the boats: a lapstrake double-ender, a stubby mast, a furled sail on its boom, shrouds, the carillon bar
  function hullGeo(THREE, L, Bm, D) {
    const NS = 18, NJ = 10, pos = [], uv = [], col = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const t = i / NS, xx = (t - 0.5) * L, w = Bm / 2 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 2.1)), 0.55);
      const gz = D + 0.28 * Math.pow(2 * t - 1, 2), keel = 0.16 * Math.pow(Math.abs(2 * t - 1), 3);
      let arc = 0;
      for (let j = 0; j <= NJ; j++) {
        const sgn = j / NJ * 2 - 1, th = sgn * PI / 2;
        const z = w * Math.sin(th), y = keel + (gz - keel) * Math.pow(1 - Math.cos(th), 0.75);
        if (j) { const p = pos.length - 3; arc += Math.hypot(z - pos[p + 2], y - pos[p + 1]); }
        pos.push(xx, y, z); uv.push(xx / 1.4, arc / 1.1);
        col.push(Math.abs(sgn), y, 0);   // (temporary: side and height, coloured below)
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NJ; j++) { const a = i * (NJ + 1) + j, b = a + NJ + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function boat(A, THREE, b, idx, r, M) {
    A.aux = idx;
    const L = b.L, Bm = b.Bm, D = 0.82, key = b.v === 2;
    const paint = key ? [1.15, 0.88, 0.66] : [0.95, 1.06, 1.15], strake = key ? [1.55, 1.2, 0.72] : [1.45, 1.45, 1.38], below = [0.42, 0.48, 0.36];
    const g = hullGeo(THREE, L, Bm, D);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.ry, 0)), new THREE.Vector3(1, 1, 1));
    const wl = 0.34;
    A.geo('hull', g, m, (px, py, pz) => { const top = D + 0.28 * Math.pow(2 * (px / L), 2) * 4 / 4; return py < wl ? below : py > top - 0.17 ? strake : paint; }, null, 1);
    // the inside: the same shell a little smaller, facing in (tarred, dark)
    const gi = g.clone(); gi.scale(0.93, 0.95, 0.9); gi.translate(0, 0.05, 0); const ix = gi.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } gi.computeVertexNormals();
    A.geo('hull', gi, m, [0.62, 0.52, 0.42], null, 1);
    const P = (lx, ly, lz) => { const v = new THREE.Vector3(lx, ly, lz).applyMatrix4(m); return [v.x, v.y, v.z]; };
    // thwarts, the gunwale rail, the mast, the boom and the furled sail, shrouds, the carillon bar at the shroud-head
    for (const tx of [-0.22, 0.12]) A.beam('bWood', 0.07, P(tx * L, D - 0.12, -Bm * 0.42), P(tx * L, D - 0.12, Bm * 0.42), [0.8, 0.72, 0.62], 0.24);
    const mx = -0.16 * L, mh = 4.6 + (b.v === 2 ? 0.6 : 0);
    A.rod('bWood', 0.075, P(mx, 0.2, 0), P(mx, mh, 0), [0.85, 0.75, 0.62], 8);
    A.rod('bWood', 0.05, P(mx, 1.45, 0), P(mx + 0.55 * L, 1.25, 0), [0.8, 0.72, 0.6], 6);
    A.rod('bCloth', 0.14, P(mx + 0.05 * L, 1.58, 0.0), P(mx + 0.5 * L, 1.4, 0.0), [0.92, 0.88, 0.8], 7);
    A.rod('bCloth', 0.1, P(mx + 0.05 * L, 1.78, 0.02), P(mx + 0.35 * L, 1.6, 0.0), [0.86, 0.82, 0.74], 6);
    const head = P(mx, mh - 0.25, 0);
    for (const sz of [-1, 1]) A.rod('bRope', 0.012, head, P(mx + 0.06 * L, D + 0.1, sz * Bm * 0.47), [0.8, 0.8, 0.8], 4);
    A.rod('bRope', 0.012, head, P(0.49 * L, D + 0.25, 0), [0.8, 0.8, 0.8], 4);
    A.rod('bRope', 0.012, P(mx, mh - 0.1, 0), P(-0.49 * L, D + 0.25, 0), [0.8, 0.8, 0.8], 4);
    // the carillon: a bar of little bronze tubes at the shroud-head, which the wind plays (Book Two)
    const cy = mh - 0.42;
    A.beam('bWood', 0.035, P(mx, cy, -0.32), P(mx, cy, 0.32), [0.7, 0.62, 0.52]);
    for (let i = 0; i < 6; i++) { const tz = -0.27 + i * 0.108, len = 0.14 + ((i * 5) % 9) * 0.025; A.rod('bBronze', 0.014, P(mx + 0.02, cy - 0.03, tz), P(mx + 0.02, cy - 0.03 - len, tz), [1, 1, 1], 6); }
    A.aux = 0;
    return { bow: P(0.5 * L - 0.05, D + 0.2, 0), stern: P(-0.5 * L + 0.05, D + 0.2, 0) };
  }

  // ======================================================================== the dress
  function dress(map, ctx) {
    ctx = ctx || {};
    const THREE = T3(ctx);
    const out = { group: THREE ? new THREE.Group() : null, hiddenCells: new Set(), replaced: new Set(), stats: {} };
    if (!THREE || !map || map.id !== MAPID) return out;
    try { build(THREE, map, ctx, out); } catch (e) { warnOnce('dress', e); }
    S.last = out;
    return out;
  }
  function build(THREE, map, ctx, out) {
    const UPM = +(ctx.M || (window.R11 && R11.M)) || 0.33, tier = ctx.tier || (window.R11 && R11.tier && R11.tier()) || 'high', phone = tier === 'phone';
    const R = reader(map, UPM), C = R.C, MT = mats(THREE, ctx), A = Acc(THREE), r = mulberry(1417);
    const hidden = out.hiddenCells, replaced = out.replaced, st = out.stats;
    const group = out.group; group.name = 'R11HARBOUR';
    const metres = new THREE.Group(); metres.name = 'R11HARBOUR:metres'; metres.scale.setScalar(UPM); group.add(metres);
    const lamps = [], WY = R.Y(-0.05), YL = R.Y(R.lvl(60, 51) || 0.4);
    const ents = map.entities || [];
    const at = (e) => [e.x * C, R.Y(R.lvl(Math.floor(e.x), Math.floor(e.y))), e.y * C];
    const near = (x, y, rad) => ents.filter((e) => Math.hypot(e.x - x, e.y - y) < rad);

    // ---- the Mole (Book Two: harbour on the left walking out, the sea on the right behind the parapet), the round Mole-head
    const MH = (window.CANTABILE17 && CANTABILE17.MOLE_HEAD) || { x: 77, y: 51, r: 4.6 };
    const H = { x: MH.x, y: MH.y, cx: MH.x * C, cz: MH.y * C, rv: (MH.r + 0.45) * C, zMole0: 0, zMole1: 0,
      has: (x, y) => R.mole(x, y) && Math.hypot(x + 0.5 - MH.x, y + 0.5 - MH.y) <= MH.r + 0.01,
      rimX: (z) => H.cx - Math.sqrt(Math.max(0, H.rv * H.rv - (z - H.cz) * (z - H.cz))) };
    {
      const cx0 = Math.floor(MH.x - MH.r) - 1; let y0 = 99, y1 = -1;
      for (let y = 0; y < R.H; y++) { const c = R.cell(cx0, y); if (R.mole(cx0, y) || (c && c.moleParapet)) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      H.zMole0 = (y1 >= 0 ? y0 : MH.y - 1) * C; H.zMole1 = (y1 >= 0 ? y1 + 1 : MH.y + 2) * C;
    }
    // the parapet's arc round the head on the sea side (the map's headParapet cells): its wall stands just inside the head's
    // rim (no further than a walker can reach), and meets the straight wall where their centrelines cross
    {
      const HP = (window.CANTABILE17 && CANTABILE17.HEAD_PARA) || [-0.35, PI];
      let n = 0, ptop = null;
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) { const c = R.cell(x, y); if (c && R.blk(c) && c.headParapet) { hidden.add(R.idx(x, y)); n++; if (ptop == null) ptop = R.Y(c.top); } }
      if (n) {
        H.para = true; H.rin = H.rv - 0.08 * C; H.rout = H.rin + 0.82; H.paraTop = ptop; H.pa0 = HP[0];
        const rm = (H.rin + H.rout) / 2, zc = 52 * C + 0.01 + 0.41 - H.cz;
        H.joinX = H.cx - Math.sqrt(Math.max(0, rm * rm - zc * zc)); H.pa1 = Math.atan2(zc, H.joinX - H.cx);
        H.onPara = (a) => { while (a > PI) a -= 2 * PI; while (a <= -PI) a += 2 * PI; return a >= H.pa0 && a <= H.pa1; };
        st.headParapetCells = n;
      }
    }
    st.head = { x: MH.x, y: MH.y, rv: H.rv / C };
    const { faces, kerbs } = mole(A, R, hidden, r, st, H);
    roundHead(A, THREE, R, H, r, WY, st);
    parapet(A, THREE, R, H, hidden, r, WY, st);
    // rings every few paces along the faces (game text: "an iron ring every few paces to make fast to"), and round the head
    const rings = [];
    faces.forEach((f, i) => {
      if ((i * 7 + f.x * 3) % 3 !== 0) return;
      const t = 0.3 + r() * 0.4, p = [f.a[0] + (f.b[0] - f.a[0]) * t, 0, f.a[1] + (f.b[1] - f.a[1]) * t];
      ring(A, THREE, p, [f.dx, 0, f.dy], f.top - 0.5); rings.push([p[0] + f.dx * 0.08, f.top - 0.6, p[2] + f.dy * 0.08]);
    });
    for (let i = 0; i < 9; i++) {
      const a = -PI / 2 + (i - 4) * 0.62; if (Math.cos(a) < -0.85 || (H.para && H.onPara(a))) continue;
      const n = [Math.cos(a), 0, Math.sin(a)], p = [H.cx + n[0] * H.rv, 0, H.cz + n[2] * H.rv], top = R.Y(R.lvl(Math.floor(MH.x), Math.floor(MH.y)));
      ring(A, THREE, p, n, top - 0.5); rings.push([p[0] + n[0] * 0.08, top - 0.6, p[2] + n[2] * 0.08]);
    }
    st.rings = rings.length;
    // iron ladder-rungs let into the harbour face (Book Two: "every forty yards"): one on the Mole, one on the head's harbour side
    const ladder = (cx, cz, n, top) => {
      const ry = Math.atan2(n[0], n[2]), ux = Math.cos(ry), uz = -Math.sin(ry), P = (u, y, d) => [cx + ux * u + n[0] * d, y, cz + uz * u + n[2] * d];
      for (const s2 of [-0.24, 0.24]) A.rod('iron', 0.022, P(s2, WY - 1.3, 0.09), P(s2, top + 0.05, 0.09), [0.85, 0.65, 0.5], 6);
      for (let y = WY - 1.1; y < top - 0.1; y += 0.3) A.rod('iron', 0.016, P(-0.24, y, 0.09), P(0.24, y, 0.09), [0.85, 0.65, 0.5], 5);
      for (const s2 of [-0.24, 0.24]) A.rod('iron', 0.022, P(s2, top + 0.05, 0.09), P(s2, top + 0.05, -0.25), [0.85, 0.65, 0.5], 6);
    };
    let ladders = 0;
    { const f = faces.find((q) => q.x === 65 && q.dy === -1); if (f) { ladder((f.a[0] + f.b[0]) / 2, f.a[1], [0, 0, -1], f.top); ladders++; } }
    { const a = -PI / 2 - 0.35, n = [Math.cos(a), 0, Math.sin(a)]; ladder(H.cx + n[0] * H.rv, H.cz + n[2] * H.rv, n, R.Y(R.lvl(Math.floor(MH.x), Math.floor(MH.y)))); ladders++; }
    st.ladders = ladders;
    // bollards: iron, mushroom-topped, waist-high, every twenty paces down the middle (Book Two); one at the tower's foot
    // (the map's own bollard entities, solid in both styles: js/cantabile17.js BOLLARDS and the one under the bell)
    let bollards = 0;
    for (const e of ents) {
      if (!e._bollard && e.sprite !== 'p17c_bollard') continue;
      replaced.add(e); bollard(A, THREE, e.x * C, R.Y(R.lvl(Math.floor(e.x), Math.floor(e.y))), e.y * C); bollards++;
      if (e._towerBollard) st.towerBollard = [e.x, e.y];
    }
    st.bollards = bollards;
    // the Mole steps: a flight of stone steps against the harbour face of the landing, going down westward from the Mole's
    // flags to a stone stage a little over the water at the tide, where the ferry comes alongside (Quain) and the jetty
    // runs out; the twelve-foot drop (Book Two) taken in steps of a hand and a half
    const STAGE = WY + 0.75;
    {
      const fl = faces.filter((q) => q.dy === -1 && q.x >= 54 && q.x <= 58 && Math.abs(q.a[1] - 49 * C) < 0.01);
      if (fl.length) {
        const z = fl[0].a[1], top = fl[0].top, W2 = 1.25, tread = 0.3, n = Math.max(4, Math.round((top - STAGE) / 0.2)), rise = (top - STAGE) / n;
        const xs = 58.92 * C, zc = z - W2 / 2;
        for (let i = 0; i < n; i++) {
          const yt = top - (i + 1) * rise, xa = xs - (i + 1) * tread, xb = xs - i * tread, wet = yt < WY + 1.3;
          A.box('quay', xb - xa, yt - (WY - 1.4), W2, (xa + xb) / 2, (yt + WY - 1.4) / 2, zc, 0, wet ? [0.45, 0.5, 0.4] : [0.82, 0.82, 0.78]);
        }
        const xe = xs - n * tread, x0 = 54.05 * C;   // the stage at the foot, along the face to the jetty
        if (xe > x0) A.box('quay', xe - x0, STAGE - (WY - 1.4), W2, (x0 + xe) / 2, (STAGE + WY - 1.4) / 2, zc, 0, [0.42, 0.48, 0.38]);
        A.quad('weed', [x0, WY - 0.45, z - W2 - 0.02], [xs, WY - 0.45, z - W2 - 0.02], [xs, WY + 0.4, z - W2 - 0.02], [x0, WY + 0.4, z - W2 - 0.02], [1, 1, 1], [x0 / 1.5, 0, xs / 1.5, 0, xs / 1.5, 1, x0 / 1.5, 1], [0, 0, -1]);
        // the iron hand-rail on the open side of the flight
        A.rod('iron', 0.025, [xs - 0.1, top + 0.95, z - W2 + 0.06], [xe, STAGE + 0.95, z - W2 + 0.06], [0.85, 0.65, 0.5], 6);
        for (let i = 0; i <= n; i += 4) { const xx = xs - 0.1 - i * tread, yy = top - i * rise; A.rod('iron', 0.02, [xx, yy - 0.02, z - W2 + 0.06], [xx, yy + 0.95 - 0.02, z - W2 + 0.06], [0.85, 0.65, 0.5], 5); }
        st.moleSteps = n; st.stepsDrop = top - STAGE;
      }
    }
    // kerb bollards [PROPOSED] where boats are made fast: iron, a little lower, rope turns round the neck (picture 3)
    const kerbBoll = [];
    const kerbPoint = (p) => {   // the nearest point on the kerb (straight runs and the head's rim), set 0.4 m in from the edge
      let best = null, bd = 1e9;
      for (const k of kerbs) {
        if (!k.a) continue;
        const ax = k.a[0], az = k.a[1], bx = k.b[0], bz = k.b[1], L2 = (bx - ax) ** 2 + (bz - az) ** 2, t = clamp(((p[0] - ax) * (bx - ax) + (p[2] - az) * (bz - az)) / (L2 || 1), 0.08, 0.92);
        const qx = ax + (bx - ax) * t - k.n[0] * 0.4, qz = az + (bz - az) * t - k.n[1] * 0.4, d = Math.hypot(qx - p[0], qz - p[2]);
        if (d < bd) { bd = d; best = [qx, k.top, qz]; }
      }
      const a = Math.atan2(p[2] - H.cz, p[0] - H.cx), qx = H.cx + Math.cos(a) * (H.rv - 0.42), qz = H.cz + Math.sin(a) * (H.rv - 0.42), d = Math.hypot(qx - p[0], qz - p[2]);
      if (d < bd && !(Math.cos(a) < 0 && qz > H.zMole0 - 0.3 && qz < H.zMole1 + 0.3) && !(H.para && H.onPara(a))) { bd = d; best = [qx, R.Y(R.lvl(Math.floor(MH.x), Math.floor(MH.y))), qz]; }
      return best ? { p: best, d: bd } : null;
    };
    const kerbBollard = (q) => {
      for (const b of kerbBoll) if (Math.hypot(b[0] - q[0], b[2] - q[2]) < 1.3) return b;
      const b = [q[0], q[1], q[2]]; kerbBoll.push(b);
      bollard(A, THREE, b[0], b[1], b[2], 0.82);
      for (let i = 0; i < 3; i++) { const m = new THREE.Matrix4().compose(new THREE.Vector3(b[0], b[1] + 0.42 + i * 0.075, b[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2 + (i - 1) * 0.12, 0, (i - 1) * 0.1)), new THREE.Vector3(1, 1, 1)); A.geo('rope', ROPETURN(THREE), m, [1.25, 1.08, 0.82], null); }
      return b;
    };

    // ---- the sea's edge: the map's rock ring and sea stacks (core's tall boxes read as battlements from the Mole: no
    // castle) become boulders and stacks of wet rock, and the rock runs on a cell beyond the map's edge
    {
      let n = 0;
      const shore = (x, y) => R.blk(R.cell(x, y)) && R.tex(x, y) === 'p17c_cliff' && (y >= 44 || (x === R.W - 1 && y >= 30));
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
        if (!shore(x, y)) continue;
        hidden.add(R.idx(x, y));
        const yt = Math.min(3.6, R.Y(R.cell(x, y).top) * 0.6), edge = x === 0 || y === R.H - 1 || x === R.W - 1;
        const k = edge ? 2 : 3;
        for (let i = 0; i < k; i++) boulder(A, THREE, (x + 0.2 + r() * 0.6) * C, (y + 0.2 + r() * 0.6) * C, yt * (0.6 + r() * 0.5) + (i === 0 ? 0.4 : 0), C * (0.7 + r() * 0.45), r, WY);
        if (edge) for (let j = 1; j <= 3; j++) {   // the rock runs on outward and down into the sea
          const ox = x === 0 ? -j : x === R.W - 1 ? j : 0, oy = y === R.H - 1 ? j : 0;
          boulder(A, THREE, (x + ox + 0.5 + (r() - 0.5) * 0.6) * C, (y + oy + 0.5 + (r() - 0.5) * 0.6) * C, yt * (0.9 - j * 0.2) + r() * 1.2, C * (0.6 + r() * 0.3), r, WY);
        }
        n++;
      }
      st.shoreRocks = n;
      // the coast across the bight: low cliffs and downs west and east, open sea to the south (the Cay's way), in the haze
      const cx0 = R.W / 2 * C, cz0 = R.H / 2 * C, segs = [[0.6 * PI, 1.3 * PI, 0], [-0.24 * PI, 0.26 * PI, 1]];
      for (const [a0, a1, side] of segs) {
        const NA = 120, NR = 10, R0 = 115 * C, R1 = 190 * C, V = [];
        for (let i = 0; i <= NA; i++) {
          const a = a0 + (a1 - a0) * i / NA, fade = Math.min(1, Math.min(i, NA - i) / 14), sm = (k, sc) => { const u = i / sc, i0 = Math.floor(u), f = u - i0, w = f * f * (3 - 2 * f); return hash2(i0, side, k) * (1 - w) + hash2(i0 + 1, side, k) * w; }, H = (16 + 60 * sm(31, 14) + 22 * sm(32, 5) + 7 * sm(33, 2)) * (0.3 + 0.7 * fade);
          const row = [];
          for (let j = 0; j <= NR; j++) {
            const t = j / NR, rr = R0 + (R1 - R0) * t, h = j === 0 ? WY - 2 : H * Math.pow(Math.sin(Math.min(1, t * 1.4) * PI / 2), 0.5) * (1 - 0.25 * t) + 3.5 * hash2(i, j, 7 + side) + (j === 1 ? 4 : 0);
            row.push([cx0 + Math.cos(a) * rr * (side ? 1.0 : 1.15), h, cz0 + Math.sin(a) * rr]);
          }
          V.push(row);
        }
        for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) {
          // dark wet rock at the sea, scrub and turf (grey-green, patchy) on the slopes, paler bare stone on the high ridges
          const cc = (ii, jj) => { const h = V[ii][jj][1], n = hash2(ii >> 1, jj, 3 + side), m = hash2(ii >> 3, jj >> 1, 11 + side), hi = clamp((h - 34) / 40, 0, 1);
            if (jj <= 1) return [0.075, 0.085, 0.08];
            const g = [0.085 + 0.05 * n, 0.105 + 0.05 * n + 0.03 * m, 0.075 + 0.03 * n], st2 = [0.17 + 0.04 * n, 0.175 + 0.04 * n, 0.17 + 0.035 * n];
            return [g[0] + (st2[0] - g[0]) * hi, g[1] + (st2[1] - g[1]) * hi, g[2] + (st2[2] - g[2]) * hi]; };
          A.quad('far', V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1], [cc(i, j), cc(i + 1, j), cc(i + 1, j + 1), cc(i, j + 1)], [0, 0, 1, 0, 1, 1, 0, 1], [0, 1, 0]);
        }
      }
    }

    // ---- the Mole-head: the mast-tower, the Mole-light, the derrick and the Articles, the Mole-bell
    const mastE = ents.find((e) => e.sprite === 'p17c_mast');
    let cradle = null;
    if (mastE) {
      replaced.add(mastE); for (const e of ents) if (e.sprite === 'ladder' && Math.hypot(e.x - mastE.x, e.y - mastE.y) < 1.5) replaced.add(e);
      const [mx, my, mz] = at(mastE), H = 18.3, b0 = 0.85, b1 = 0.45;
      A.box('quay', 2.3, 0.45, 2.3, mx, my + 0.22, mz, 0, [0.82, 0.82, 0.78]);
      const leg = (sx, sz, t) => { const w = b0 + (b1 - b0) * t; return [mx + sx * w, my + 0.45 + t * (H - 0.45), mz + sz * w]; };
      const LEGS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sz] of LEGS) A.beam('iron', 0.12, leg(sx, sz, 0), leg(sx, sz, 1), [0.82, 0.62, 0.5]);
      const bays = 8;
      for (let i = 0; i < bays; i++) {
        const t0 = i / bays, t1 = (i + 1) / bays;
        for (let k = 0; k < 4; k++) {
          const [ax, az] = LEGS[k], [bx, bz] = LEGS[(k + 1) % 4];
          A.beam('iron', 0.06, leg(ax, az, t1), leg(bx, bz, t1), [0.82, 0.62, 0.5]);
          A.beam('iron', 0.04, leg(ax, az, t0), leg(bx, bz, t1), [0.75, 0.58, 0.48]); A.beam('iron', 0.04, leg(bx, bz, t0), leg(ax, az, t1), [0.75, 0.58, 0.48]);
        }
      }
      // sixty feet of iron rungs, on the face toward the Mole (west)
      for (let y = 0.8; y < H - 0.5; y += 0.34) { const t = (y - 0.45) / (H - 0.45), w = b0 + (b1 - b0) * t; A.box('iron', 0.03, 0.03, w * 1.4, mx - w - 0.1, my + y, mz, 0, [0.9, 0.78, 0.66]); }
      // the cradle at the top: a ring of iron with a plank floor, a rail, the mooring arm
      const ty = my + H;
      A.rod('planks', 1.5, [mx, ty - 0.08, mz], [mx, ty + 0.06, mz], [0.6, 0.55, 0.5], 14);
      const m1 = new THREE.Matrix4().compose(new THREE.Vector3(mx, ty + 0.95, mz), new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, 0)), new THREE.Vector3(13.6, 13.6, 2)); A.geo('iron', TORUS(THREE), m1, [0.85, 0.7, 0.6], null);
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; A.rod('iron', 0.025, [mx + Math.cos(a) * 1.48, ty, mz + Math.sin(a) * 1.48], [mx + Math.cos(a) * 1.48, ty + 0.95, mz + Math.sin(a) * 1.48], [0.85, 0.7, 0.6], 5); }
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; A.beam('iron', 0.05, [mx + Math.cos(a) * 0.5, ty - 1.4, mz + Math.sin(a) * 0.5], [mx + Math.cos(a) * 1.45, ty - 0.05, mz + Math.sin(a) * 1.45], [0.8, 0.62, 0.5]); }
      A.beam('iron', 0.1, [mx, ty + 0.3, mz], [mx - 1.2, ty + 0.5, mz + 1.6], [0.8, 0.62, 0.5]);
      cradle = [mx, ty + 0.3, mz];
      // the Mole-light: the tower's lantern, on a bracket toward the Mole, throwing its fan down the stones (Book Two)
      const ly = my + 6.2;
      A.beam('iron', 0.06, [mx - 0.7, ly + 0.4, mz], [mx - 1.55, ly + 0.45, mz], [0.85, 0.7, 0.6]);
      A.beam('iron', 0.04, [mx - 0.72, ly - 0.35, mz], [mx - 1.45, ly + 0.43, mz], [0.85, 0.7, 0.6]);
      lamps.push({ p: [mx - 1.5, ly, mz], s: 1.9, rule: true, light: 'mole', prio: 6 });
      st.mastTower = true;
    }
    const derE = ents.find((e) => e.sprite === 'p17c_derrick');
    let derTop = null;
    if (derE) {
      replaced.add(derE);
      const [dx, dy, dz] = at(derE), H = 7.6;
      A.box('quay', 1.5, 0.4, 1.5, dx, dy + 0.2, dz, 0.2, [0.78, 0.78, 0.74]);
      A.box('timber', 0.34, H, 0.34, dx, dy + 0.4 + H / 2, dz, 0.2, [0.8, 0.72, 0.62]);
      A.box('timber', 0.5, 0.2, 0.5, dx, dy + 0.4 + H, dz, 0.2, [0.7, 0.62, 0.55]);
      const dir = [-0.62, -0.78], bl = 7.2, el = 0.95;   // the boom swings out over the harbour, north-west
      const b0 = [dx + dir[0] * 0.25, dy + 1.5, dz + dir[1] * 0.25], b1 = [dx + dir[0] * (0.25 + bl * Math.cos(el)), dy + 1.5 + bl * Math.sin(el), dz + dir[1] * (0.25 + bl * Math.cos(el))];
      A.beam('timber', 0.24, b0, b1, [0.78, 0.7, 0.6]);
      const top = [dx, dy + 0.4 + H, dz]; derTop = top;
      A.rod('rope', 0.02, top, b1, [0.9, 0.9, 0.9], 5);
      // the fall: a block at the boom's head, the rope and its hook
      A.box('timber', 0.22, 0.32, 0.16, b1[0], b1[1] - 0.25, b1[2], 0, [0.6, 0.5, 0.42]);
      A.rod('rope', 0.018, [b1[0], b1[1] - 0.4, b1[2]], [b1[0], dy + 1.9, b1[2]], [0.9, 0.9, 0.9], 5);
      A.rod('iron', 0.03, [b1[0], dy + 1.9, b1[2]], [b1[0], dy + 1.65, b1[2]], [0.8, 0.6, 0.5], 5);
      A.rope('rope', [b1[0], dy + 2.3, b1[2]], [dx + 0.3, dy + 1.0, dz + 0.3], 0.5, 0.017, [0.9, 0.9, 0.9], 8);
      // the winch at the mast's foot and the backstays to rings in the stones
      A.rod('timber', 0.17, [dx + 0.35, dy + 0.75, dz - 0.5], [dx + 0.35, dy + 0.75, dz + 0.5], [0.7, 0.62, 0.52], 10);
      for (const s of [-0.5, 0.5]) { A.box('timber', 0.1, 0.8, 0.1, dx + 0.35, dy + 0.4, dz + s * 1.15, 0, [0.7, 0.62, 0.55]); }
      for (const [sx, sz] of [[2.6, 1.3], [1.0, 2.8]]) { A.rod('rope', 0.016, [top[0], top[1] - 0.2, top[2]], [dx + sx, dy + 0.06, dz + sz], [0.9, 0.9, 0.9], 5); ring(A, THREE, [dx + sx, 0, dz + sz], [0, 1, 0], dy + 0.03); }
      // the board of the Articles, nailed to the derrick's mast facing the Mole
      const ry = -PI / 2 + 0.2, bx = dx - 0.2 * Math.cos(0.2) - 0.02, bz = dz + 0.04;
      const g = new THREE.PlaneGeometry(1.0, 1.5), m = new THREE.Matrix4().compose(new THREE.Vector3(bx - 0.03, dy + 2.15, bz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
      A.geo('board', g, m, [1, 1, 1], null, 1);
      A.box('timber', 0.06, 1.62, 1.12, bx + 0.01, dy + 2.15, bz, ry + PI / 2, [0.45, 0.38, 0.32]);
      st.derrick = true; st.articles = true;
    }
    // the rope from the cradle to the derrick (Library: Going Up: "There is a rope from my cradle to the Mole-head derrick now")
    if (cradle && derTop) { A.rope('rope', cradle, derTop, 1.6, 0.025, [0.85, 0.85, 0.85], 16); st.cradleRope = true; }
    // the Mole-bell (Book Two): "on an iron bracket on the side of the tower at head height", a rope hanging down; the lifebuoy
    // "on its bracket by the bell". The map puts the bell's entity on the tower's south side (js/cantabile17.js).
    const bellE = ents.find((e) => e.sprite === 'p17c_molebell');
    if (bellE && mastE) {
      replaced.add(bellE);
      // (fix round: the bracket at head height, the bell's body about 1.45-1.9 m over the flags, hanging over the bollard
      // at the tower's foot: "sitting on the bollard at the foot of the mast-tower, under the bell, with her back to the stone")
      const [mx, my, mz] = at(mastE), [, , bz0] = at(bellE), sz = Math.sign(bz0 - mz) || 1, legZ = mz + sz * 0.86;
      const tb = st.towerBollard, armZ = tb ? tb[1] * C : legZ + sz * 0.82, top = my + 2.0, BS = 0.58;
      // the bracket: a plate on the tower's legs, the arm out from it, the brace under it
      A.box('iron', 1.9, 0.4, 0.05, mx, top - 0.05, legZ + sz * 0.03, 0, [0.8, 0.64, 0.52]);
      A.beam('iron', 0.08, [mx, top + 0.05, legZ], [mx, top + 0.05, armZ + sz * 0.08], [0.85, 0.68, 0.55], 0.1);
      A.beam('iron', 0.05, [mx, top - 0.75, legZ + sz * 0.03], [mx, top, armZ - sz * 0.12], [0.8, 0.64, 0.52]);
      const P = [[0.06, 0.82], [0.2, 0.8], [0.25, 0.7], [0.27, 0.45], [0.31, 0.2], [0.38, 0.06], [0.4, 0.0], [0.36, -0.01]].map(([a2, b2]) => new THREE.Vector2(a2, b2));
      const bell = new THREE.LatheGeometry(P, 18), by0 = top - 0.08;
      A.geo('bronze', bell, new THREE.Matrix4().compose(new THREE.Vector3(mx, by0 - 0.82 * BS, armZ), new THREE.Quaternion(), new THREE.Vector3(BS, BS, BS)), [1, 1, 1], null);
      A.box('iron', 0.12, 0.1, 0.26, mx, by0 + 0.03, armZ, 0, [0.8, 0.65, 0.55]);
      A.rod('iron', 0.02, [mx, by0 - 0.06, armZ], [mx, by0 - 0.44, armZ], [0.8, 0.65, 0.55], 6);
      A.rod('iron', 0.045, [mx, by0 - 0.47, armZ], [mx, by0 - 0.41, armZ], [0.8, 0.65, 0.55], 8);
      A.tube('rope', [[mx, by0 - 0.44, armZ], [mx + 0.03, by0 - 0.75, armZ + sz * 0.02], [mx + 0.08, my + 1.02, armZ + sz * 0.05]], 0.017, [0.95, 0.92, 0.85], 6, 3);
      st.bellBody = [Math.round((by0 - 0.82 * BS - my) * 100) / 100, Math.round((by0 - my) * 100) / 100];
      // the lifebuoy on its bracket by the bell: a cork ring in tarred canvas, its line coiled on the stones under it
      const lx = mx + 0.78;
      A.box('iron', 0.04, 0.04, 0.24, lx, my + 1.86, legZ + sz * 0.12, 0, [0.8, 0.65, 0.55]);
      const lb = new THREE.Matrix4().compose(new THREE.Vector3(lx, my + 1.56, legZ + sz * 0.22), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)), new THREE.Vector3(3.0, 3.0, 4.2));
      A.geo('cloth', TORUS(THREE), lb, [0.95, 0.92, 0.84], null);
      coil(A, THREE, lx + 0.35, my, legZ + sz * 0.45, 0.6);
      st.moleBell = true; st.lifebuoy = true; st.bellOnTower = Math.hypot(bellE.x - mastE.x, bellE.y - mastE.y);
    }

    // ---- mooring posts (the map's posts), coils, the ring on the stones, crates and casks, lamps
    for (const e of ents) {
      if (e.sprite === 'p12r_post') {
        replaced.add(e);
        const cx = Math.floor(e.x), cy = Math.floor(e.y), onWater = R.water(cx, cy);
        const g = onWater ? WY - 1.2 : R.Y(R.lvl(cx, cy)), topY = onWater ? WY + 2.0 : g + 1.0;
        post(A, THREE, e.x * C, e.y * C, g, topY); st.posts = (st.posts || 0) + 1;
      } else if (e.sprite === 'p17c_coil') {
        replaced.add(e); const p = at(e); coil(A, THREE, p[0], p[1], p[2], 0.9 + r() * 0.2); st.coils = (st.coils || 0) + 1;
      } else if (e.sprite === 'p17c_ring') {
        replaced.add(e); const p = at(e); A.box('iron', 0.24, 0.05, 0.24, p[0], p[1] + 0.02, p[2], 0.3, [0.85, 0.7, 0.6]);
        A.geo('iron', TORUS(THREE), new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1] + 0.05, p[2] + 0.06), new THREE.Quaternion().setFromEuler(new THREE.Euler(-PI / 2 + 0.12, 0, 0)), new THREE.Vector3(1.1, 1.1, 1.1)), [0.85, 0.62, 0.48], null);
      }
    }
    // odd groups, where the work is: casks and crates by the Harbour office door and on the Yard's quay; salvage by the
    // derrick (the Sixteenth Article); the ferry's gear at the Mole steps; the map's own crates and barrels become these
    const crates = [];
    const crateAt = (x, y, z, ry, s) => crates.push([x, y, z, ry, s || (0.95 + r() * 0.12)]);
    const groupAt = (gx, gy, what, n, ry0) => {
      const y = R.Y(R.lvl(Math.floor(gx), Math.floor(gy))), X = gx * C, Z = gy * C, q = ry0 || 0, cq = Math.cos(q), sq = Math.sin(q);
      const P = (u, v) => [X + u * cq + v * sq, Z - u * sq + v * cq];
      if (what === 'cask') {
        const spots = n === 1 ? [[0, 0]] : n === 3 ? [[-0.34, 0], [0.34, 0.05], [0.02, 0.6, 'side']] : [[-0.68, 0], [0, 0.04], [0.68, -0.02], [-0.34, 0.58], [0.5, 0.66, 'side']];
        for (const [u, v, side] of spots) { const p = P(u, v); cask(A, THREE, p[0], y, p[1], q + (side ? PI / 2 + (r() - 0.5) * 0.3 : r() * 6), !!side, 1); }
      } else {
        const spots = n === 3 ? [[-0.38, 0, 0], [0.36, 0.05, 0], [0, 0.03, 0.62]] : n === 1 ? [[0, 0, 0]] : [[-0.76, 0, 0], [0, 0, 0], [0.76, 0.06, 0], [-0.38, 0, 0.62], [0.42, 0.03, 0.62]];
        for (const [u, v, h] of spots) { const p = P(u, v); crateAt(p[0], y + h, p[1], q + (r() - 0.5) * 0.35); }
      }
      st.props = (st.props || 0) + n;
    };
    for (const e of ents) {
      if (e.sprite === 'p_barrel' || e.sprite === 'p_crate') {
        replaced.add(e);
        const hc = hash2(e.x * 10, e.y * 10, 3), n = hc < 0.5 ? 3 : 1;
        groupAt(e.x, e.y, e.sprite === 'p_barrel' ? 'cask' : 'crate', n, hc * 6);
      }
    }
    groupAt(37.4, 51.45, 'cask', 3, 0.05);        // by the Harbour office door: the dues come in casks as often as coin
    groupAt(42.0, 51.5, 'crate', 5, -0.04);
    groupAt(54.9, 50.6, 'cask', 3, 0.1);          // the ferry's stores by the Mole steps
    groupAt(54.35, 49.5, 'cask', 1, 0);           // the ferry's water cask at the Mole steps
    // against the parapet's foot, out of the way of the moorings: fish boxes waiting for the barrows, salt casks, salvage
    // waiting on the Harbour's fifth
    groupAt(57.6, 51.88, 'crate', 5, PI + 0.03);
    groupAt(62.1, 51.88, 'cask', 3, PI + 0.1);
    groupAt(63.55, 51.89, 'crate', 3, PI - 0.12);
    groupAt(70.6, 51.88, 'cask', 1, PI);
    groupAt(73.0, 48.55, 'crate', 3, 0.5);        // salvage under the derrick (Article the Sixteenth)
    groupAt(73.7, 49.6, 'cask', 1, 0);
    coil(A, THREE, 56.9 * C, YL, 49.72 * C, 0.8);
    coil(A, THREE, 59.0 * C, YL, 51.7 * C, 0.9);
    coil(A, THREE, 73.6 * C, YL, 49.25 * C, 1.0);

    // ---- the map's harbour lamps (on the ground: an iron post, a stone foot, a lantern on an arm)
    for (const e of ents) {
      if (e.sprite !== 'p17c_lamppost' && e._lamp !== 'p17c_lamppost') continue;
      if (e._lampZ != null || e.yOff) continue;   // the Stair's wall-top lamps keep their sprites
      replaced.add(e);
      const [x, y, z] = at(e), sz = R.blk(R.cell(Math.floor(e.x), Math.floor(e.y) + 1)) ? -1 : 1;   // the arm turns away from a wall behind it
      A.box('stone', 0.36, 0.3, 0.36, x, y + 0.15, z, 0, [0.8, 0.8, 0.76]);
      A.rod('iron', 0.06, [x, y + 0.3, z], [x, y + 2.75, z], [0.85, 0.72, 0.62], 8);
      A.box('iron', 0.04, 0.04, 0.42, x, y + 2.7, z + sz * 0.19, 0, [0.85, 0.72, 0.62]);
      A.beam('iron', 0.03, [x, y + 2.4, z + sz * 0.01], [x, y + 2.68, z + sz * 0.3], [0.85, 0.72, 0.62]);
      lamps.push({ p: [x, y + 2.42, z + sz * 0.38], s: 0.95, e });
      st.lampPosts = (st.lampPosts || 0) + 1;
    }

    // ---- the boats: the map's own, a hull each, bobbing with the game's swing; ropes that sag to a ring or a post
    const boats = [];
    const ringsAndPosts = rings.concat(ents.filter((e) => e.sprite === 'p12r_post').map((e) => [e.x * C, R.water(Math.floor(e.x), Math.floor(e.y)) ? WY + 1.7 : R.Y(R.lvl(Math.floor(e.x), Math.floor(e.y))) + 0.7, e.y * C]));
    for (const e of (map.p17cBoats || ents.filter((q) => q.p17cBoat))) {
      if (boats.length >= MAXBOATS) break;
      replaced.add(e);
      const s = e.scale || 2, v = /2$/.test(e.sprite || '') ? 2 : 1;
      // lie along the nearest edge: a quay or mole to the north/south lies them east-west
      let ry = 0, best = 9;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= 3; k++) { const cx = Math.floor(e.x) + ddx * k, cy = Math.floor(e.y) + ddy * k; if (!R.water(cx, cy)) { if (k < best) { best = k; ry = ddx ? PI / 2 : 0; } break; } }
      ry += (hash2(e.x * 7, e.y * 7, 5) - 0.5) * 0.35 + (hash2(e.x, e.y, 9) < 0.5 ? PI : 0);
      const L = 3.4 * s, Bm = 1.05 * s, x = e.x * C, z = e.y * C;
      const id = boats.length + 1;
      const ends = boat(A, THREE, { x, y: WY - 0.34, z, ry, L, Bm, v }, id, r, MT);
      boats.push({ e, id, ph: e._ph || 0 });
      // the painters: a thick laid rope from the bow (and the stern, when the kerb is near) to a kerb bollard, sagging;
      // boats lying off make fast to a post or a ring
      for (const end of [ends.bow, ends.stern]) {
        // a bow line leads forward and a stern line aft (as boats are made fast), so the bollard is looked for a little beyond
        const ox = end[0] - x, oz = end[2] - z, ol = Math.hypot(ox, oz) || 1, kp = kerbPoint([end[0] + ox / ol * 2.6, end[1], end[2] + oz / ol * 2.6]);
        if (kp) kp.d = Math.hypot(kp.p[0] - end[0], kp.p[2] - end[2]);
        if (kp && kp.d < 8) {
          const b = kerbBollard(kp.p), tgt = [b[0], b[1] + 0.5, b[2]], d = Math.hypot(tgt[0] - end[0], tgt[2] - end[2]);
          A.cable('rope', end, tgt, 0.22 + d * 0.07, 0.042, [1.25, 1.08, 0.82], 18); st.cables = (st.cables || 0) + 1;
          continue;
        }
        let tgt = null, bd = 12;
        for (const q of ringsAndPosts) { const d = Math.hypot(q[0] - end[0], q[2] - end[2]); if (d < bd) { bd = d; tgt = q; } }
        if (tgt && bd > 0.5) A.cable('rope', end, tgt, Math.min(0.9, 0.12 + bd * 0.08), 0.03, [1.2, 1.05, 0.8], 14);
        if (end === ends.bow && bd > 6) break;
      }
    }
    st.boats = boats.length; st.kerbBollards = kerbBoll.length;

    // ---- the jetty (owner: APPROVED): a timber landing stage off the Mole steps' landing into the harbour, where the boats
    // come alongside (Book Two puts the moorings on the harbour side)
    {
      const f = faces.find((q) => q.x === 54 && q.dy === -1);
      if (f) {
        const x0 = 54.12 * C, x1 = 54.72 * C + 0.4, z1 = f.a[1] - 0.05, z0 = z1 - 6.4, dy = STAGE - 0.03;   // level with the steps' stage
        for (let z = z0; z < z1; z += 0.24) A.box('planks', x1 - x0 + 0.1, 0.06, 0.21, (x0 + x1) / 2, dy, z + 0.11, 0, [0.78 + r() * 0.15, 0.72 + r() * 0.12, 0.62]);
        for (const xx of [x0, x1]) { A.box('timber', 0.12, 0.18, z1 - z0, xx, dy - 0.12, (z0 + z1) / 2, 0, [0.6, 0.55, 0.5]); for (let z = z1 - 0.3; z >= z0; z -= 2.0) A.rod('timber', 0.13, [xx, WY - 1.0, z], [xx, dy + (z < z0 + 1 ? 0.95 : 0.1), z], [0.65, 0.58, 0.5], 7); }
        A.rod('timber', 0.13, [x1, WY - 1.0, z0], [x1, dy + 0.95, z0], [0.65, 0.58, 0.5], 7);
        ringsAndPosts.push([x1, dy + 0.7, z0]);
        st.jetty = true;
      }
    }

    // ---- the houses: Hesper's four in the Yard, the Harbour office, the terraces on the cliff (lime-washed, slate)
    const chimneyTops = [];
    const hideRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = R.cell(x, y); if (c && !c.door && R.blk(c)) hidden.add(R.idx(x, y)); } };
    const TINTS = [[1.42, 1.4, 1.34], [1.34, 1.31, 1.24], [1.4, 1.36, 1.28], [1.3, 1.29, 1.24], [1.45, 1.43, 1.38]];
    const HX = (window.CANTABILE17 && CANTABILE17.HOUSE_X) || [5, 12, 19, 26];
    let houses = 0;
    for (const hx of HX) {
      if (!R.cell(hx, 45) || R.cell(hx, 45).door) continue;
      hideRect(hx, 45, hx + 4, 49);
      const g = R.Y(R.lvl(hx + 2, 50));
      house(A, THREE, { x0: hx * C, z0: 45 * C, x1: (hx + 5) * C, z1: 50 * C, g, wallH: 6.0, rise: 4.0, roof: 'hip', tint: TINTS[houses % 5], doorX: (hx + 2.5) * C, chimneys: 2, boots: true, lantern: 'rule', litShare: 0.6, sideWindows: true, chimneyTops }, r, lamps);
      houses++;
    }
    if (R.cell(36, 45) && R.blk(R.cell(36, 45))) {   // the Harbour office, at the foot of the Long Mole
      hideRect(36, 45, 43, 50);
      const g = R.Y(R.lvl(39, 51));
      house(A, THREE, { x0: 36 * C, z0: 45 * C, x1: 44 * C, z1: 51 * C, g, wallH: 6.4, rise: 4.2, roof: 'hip', tint: [1.3, 1.27, 1.2], doorX: 39.5 * C, chimneys: 2, lantern: 'light', litShare: 0.7, sideWindows: true, chimneyTops }, r, lamps);
      // the office's board over the door, on an iron bracket
      A.box('timber', 1.9, 0.5, 0.08, 39.5 * C, g + 2.85, 51 * C + 0.06, 0, [0.35, 0.3, 0.26]);
      houses++;
    }
    // the cliff terraces: a lime-washed front cell (p17c_front*) with a slate cell behind it, in runs along a row
    const isFront = (x, y) => { const t = R.tex(x, y); return !!t && /^p17c_front/.test(t) && R.blk(R.cell(x, y)); };
    for (let y = 2; y < R.H - 2; y++) {
      let x = 0;
      while (x < R.W) {
        if (!isFront(x, y)) { x++; continue; }
        const xs = x; while (x < R.W && isFront(x, y)) x++;
        const xe = x - 1, n = xe - xs + 1;
        hideRect(xs, y, xe, y);
        for (let xx = xs; xx <= xe; xx++) { const t = R.tex(xx, y - 1); if (t === 'p17c_slate' && R.blk(R.cell(xx, y - 1))) hidden.add(R.idx(xx, y - 1)); }
        // the terrace's level: the front block stands 1.7 over its terrace; the house stands on the ledge in front
        let T = 99; for (let xx = xs; xx <= xe; xx++) T = Math.min(T, (R.cell(xx, y).top || 0) - 1.7);
        const g = R.Y(T), units = n <= 2 ? 1 : n === 3 ? 2 : 3, uw = n * C / units;
        for (let u = 0; u < units; u++) {
          const ux0 = xs * C + u * uw, ux1 = ux0 + uw, wh = 4.9 + r() * 1.2;
          house(A, THREE, { x0: ux0 + 0.02, z0: (y - 1) * C, x1: ux1 - 0.02, z1: (y + 1) * C - 0.35, g, found: 4, wallH: wh, rise: 2.1 + r() * 0.6, tint: TINTS[(xs + u + y) % 5], chimneys: 1, litShare: 0.45,
            skip: { west: u > 0, east: u < units - 1, back: true }, chimneyTops, lantern: r() < 0.25 ? 'rule' : null }, r, lamps);
          houses++;
        }
      }
    }
    // the counting-house at the top of the Stair, against the sky: square ashlar, dark with age, a pale band of coping, a
    // slate roof, iron shutters (game text); its door cell stays the map's (closed, a door like any other)
    {
      let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) { const t = R.tex(x, y); if ((t === 'p17c_ashlar' || t === 'p17c_shutter') && R.blk(R.cell(x, y)) && y < 25) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
      if (x1 >= 0) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = R.cell(x, y); if (c && !c.door && R.blk(c)) hidden.add(R.idx(x, y)); }
        const g = R.Y(R.lvl(39, y1 + 1)), X0 = x0 * C, X1 = (x1 + 1) * C, Z0 = y0 * C, Z1 = (y1 + 1) * C, wh = 9.0, ey = g + wh;
        const N4 = [[[X0, Z1], [X1, Z1], [0, 0, 1]], [[X1, Z1], [X1, Z0], [1, 0, 0]], [[X1, Z0], [X0, Z0], [0, 0, -1]], [[X0, Z0], [X0, Z1], [-1, 0, 0]]];
        for (const [a, b, N] of N4) {
          A.quad('ashlar', [a[0], g - 1.5, a[1]], [b[0], g - 1.5, b[1]], [b[0], ey, b[1]], [a[0], ey, a[1]], [[0.72, 0.7, 0.66], [0.72, 0.7, 0.66], [0.9, 0.88, 0.84], [0.9, 0.88, 0.84]], null, N);
          // the pale band of coping and a string course
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]), cx = (a[0] + b[0]) / 2 + N[0] * 0.1, cz = (a[1] + b[1]) / 2 + N[2] * 0.1;
          A.box('stone', N[2] ? L + 0.3 : 0.3, 0.4, N[0] ? L + 0.3 : 0.3, cx, ey - 0.15, cz, 0, [1.2, 1.18, 1.12]);
          A.box('stone', N[2] ? L + 0.2 : 0.2, 0.2, N[0] ? L + 0.2 : 0.2, cx, g + 4.4, cz, 0, [1.1, 1.08, 1.02]);
        }
        house(A, THREE, { x0: X0, z0: Z0, x1: X1, z1: Z1, g: ey - 0.01, wallH: 0.01, rise: 5.5, roof: 'hip', door: false, chimneys: 2, litShare: 0, skip: { front: true, back: true, east: true, west: true }, shutters: false, chimneyTops }, r, null);
        // iron shutters, down, in two rows on the front; the door's stone surround
        const FZ = Z1 + 0.03;
        for (const row of [g + 1.4, g + 5.4]) for (let i = 0; i < 6; i++) {
          const wx = X0 + (X1 - X0) * (i + 0.5) / 6; if (row < g + 3 && Math.abs(wx - 39.5 * C) < 2.6) continue;
          A.box('iron', 1.0, 1.6, 0.06, wx, row + 0.8, FZ, 0, [0.62, 0.5, 0.42]); A.box('stone', 1.4, 0.14, 0.24, wx, row - 0.05, FZ + 0.06, 0, [1.05, 1.03, 1]);
          A.box('stone', 1.4, 0.18, 0.2, wx, row + 1.7, FZ + 0.05, 0, [1.05, 1.03, 1]);
        }
        A.box('stone', 2.2, 0.35, 0.3, 39.5 * C, g + 2.55, FZ + 0.1, 0, [1.1, 1.08, 1.02]);
        for (const s of [-1, 1]) A.box('stone', 0.32, 2.4, 0.3, 39.5 * C + s * 0.95, g + 1.2, FZ + 0.1, 0, [1.1, 1.08, 1.02]);
        A.quad('planks', [39.5 * C - 0.78, g, FZ + 0.01], [39.5 * C + 0.78, g, FZ + 0.01], [39.5 * C + 0.78, g + 2.38, FZ + 0.01], [39.5 * C - 0.78, g + 2.38, FZ + 0.01], [0.42, 0.36, 0.3], [0, 0, 1, 0, 1, 1.6, 0, 1.6], [0, 0, 1]);
        st.countingHouse = { x0, y0, x1, y1, top: ey + 5.5 };
      }
    }
    st.houses = houses;
    st.cliffCells = cliffRock(A, R, hidden, WY);
    // the Stair: the parapets' dressed coping; the east rail's iron stanchions in lead pockets and two strung cables
    let cop = 0, stan = 0;
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
      const t = R.tex(x, y), c = R.cell(x, y); if (!R.blk(c)) continue;
      if (t === 'p17c_parapet') { const top = R.Y(c.top); A.box('stone', C + 0.04, 0.14, 0.5, (x + 0.5) * C, top + 0.07, (y + 0.5) * C, 0, [1.05, 1.03, 1]); cop++; }
      else if (t === 'p17c_rail') {
        const top = R.Y(c.top);
        A.rod('iron', 0.03, [(x + 0.5) * C, top - 0.1, y * C + 0.5], [(x + 0.5) * C, top + 1.0, y * C + 0.5], [0.85, 0.7, 0.6], 6);
        const nb = R.cell(x, y + 1);
        if (nb && R.blk(nb) && R.tex(x, y + 1) === 'p17c_rail') { const t2 = R.Y(nb.top); for (const hh of [0.45, 0.92]) A.rope('iron', [(x + 0.5) * C, top + hh, y * C + 0.5], [(x + 0.5) * C, t2 + hh, (y + 1) * C + 0.5], 0.06, 0.012, [0.8, 0.7, 0.6], 4); }
        stan++;
      }
    }
    st.coping = cop; st.stanchions = stan;

    // ---- into meshes
    st.meshes = A.finish(metres, MT, { noShadow: NOSHADOW, small: SMALL, phone });
    out.tier = tier;
    // the flames (lit at night) and the lanterns (Poly Haven's Lantern_01, CC0, instanced) and the crates (instanced)
    const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), MT.flame, Math.max(1, lamps.length));
    flames.name = 'harbour:flames'; flames.count = lamps.length; flames.frustumCulled = false; metres.add(flames);
    out.flames = flames; out.lamps = lamps; out.boats = boats; out.metres = metres; out.chimneyTops = chimneyTops.map((p) => [p[0] * UPM, p[1] * UPM, p[2] * UPM]);
    out.lights = [];
    for (const L of lamps) {
      if (!L.light) continue;
      const pl = new THREE.PointLight(0xffa24a, L.light === 'mole' ? 1.4 : 0.5, L.light === 'mole' ? 5 : 2.2, 2);
      pl.position.set(L.p[0] * UPM, L.p[1] * UPM, L.p[2] * UPM); pl.castShadow = false; pl.name = 'harbour:light'; L.pl = pl; L.I = pl.intensity; out.lights.push(pl);
      if (ctx.addLight) { try { ctx.addLight(pl, L.prio || 2); } catch (e) { warnOnce('addLight', e); } }
    }
    st.lamps = lamps.length; st.crates = crates.length;
    out.lampState = new Uint8Array(lamps.length); out.lampOn = -1;
    syncLamps(out, (typeof G !== 'undefined' && G.tod) || 0.5, true);
    const token = out;
    const kit = window.R11KIT && typeof R11KIT.ready === 'function' ? R11KIT.ready() : Promise.resolve(null);
    out.gltfDone = Promise.resolve(kit).then((P) => {
      // the player may have left the harbour (or the dress been rebuilt) while the models loaded: then nothing to add
      if (!P || S.last !== token || !group.parent || !(typeof G !== 'undefined' && G && G.mapId === MAPID)) return;
      const ob = new THREE.Object3D();
      if (P.lantern && lamps.length) for (const part of P.lantern) {
        const im = new THREE.InstancedMesh(part.geo, part.mat, lamps.length);
        lamps.forEach((L, i) => { ob.position.set(L.p[0], L.p[1] - 0.2 * L.s, L.p[2]); ob.rotation.set(0, 0, 0); ob.scale.setScalar(L.s); ob.updateMatrix(); im.setMatrixAt(i, ob.matrix.clone().multiply(part.m)); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = true; im.name = 'harbour:lantern'; metres.add(im);
      }
      for (const [ci, cr] of [P.crateA, P.crateB].entries()) {
        const pick = crates.filter((c, j) => j % 2 === ci); if (!cr || !pick.length) continue;
        for (const part of cr) {
          const im = new THREE.InstancedMesh(part.geo, part.mat, pick.length);
          pick.forEach((c, i) => { ob.position.set(c[0], c[1], c[2]); ob.rotation.set(0, c[3], 0); ob.scale.setScalar(c[4] * 0.68); ob.updateMatrix(); im.setMatrixAt(i, ob.matrix.clone().multiply(part.m)); });
          im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = (out.tier || tier) !== 'phone'; im.receiveShadow = true; im.name = 'harbour:crate'; metres.add(im);
        }
      }
      out.stats.draws = countDraws(group);
    }).catch((e) => warnOnce('props', e));
    st.draws = countDraws(group);
    hook();
  }
  function countDraws(group) { let n = 0; group.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !(o.isInstancedMesh && o.count === 0)) n++; }); return n; }

  // ======================================================================== per frame: the lamps, the windows, the boats
  // runs every frame: it compares the lamps' state against the last it drew (no strings, no allocation) and only rewrites
  // the flames when something changed. By day every PointLight sits at intensity 0 (core skips intensity-0 kit lights).
  function syncLamps(L, tod, force) {
    const on = lit(tod) ? 1 : 0, lamps = L.lamps, st = L.lampState;
    let changed = !!force || L.lampOn !== on;
    if (!changed) for (let i = 0; i < lamps.length; i++) { const e = lamps[i].e; if (e && st[i] !== (e._lampOn == null ? 0 : e._lampOn ? 1 : 2)) { changed = true; break; } }
    if (!changed) return;
    L.lampOn = on;
    const THREE = S.matsT, o3 = S.o3 && S.o3T === THREE ? S.o3 : (S.o3 = new THREE.Object3D(), S.o3T = THREE, S.o3);
    for (let i = 0; i < lamps.length; i++) {
      const q = lamps[i], e = q.e;
      if (e) st[i] = e._lampOn == null ? 0 : e._lampOn ? 1 : 2;
      const isOn = e ? (e._lampOn != null ? !!e._lampOn : !!on) : !!on;
      o3.position.set(q.p[0], q.p[1] - 0.03 * q.s, q.p[2]); o3.scale.set(isOn ? q.s : 0, isOn ? q.s * 1.4 : 0, isOn ? q.s : 0); o3.updateMatrix(); L.flames.setMatrixAt(i, o3.matrix);
      if (q.pl) q.pl.intensity = isOn ? q.I : 0;
    }
    L.flames.instanceMatrix.needsUpdate = true;
    const M = S.mats; if (M) { M.winLit.emissiveIntensity = on ? (M.winLit.userData.litI || 2.2) : 0; }
  }
  function frame(F) {
    const L = S.last; if (!L || !L.group || !L.group.parent) return;
    if (typeof G === 'undefined' || G.mapId !== MAPID) return;
    try {
      syncLamps(L, G.tod || 0, false);
      const M = S.mats; if (!M) return;
      const wet = window.R11 && typeof R11.wet === 'function' ? +R11.wet() || 0 : 0;   // the owner's rule: wet only in rain
      M.flag.roughness = 1 - 0.55 * wet; M.quay.roughness = 1 - 0.4 * wet;
      const k = ZK / (+(window.R11 && R11.M) || 0.33);
      const still = typeof GFX !== 'undefined' && GFX.reduceMotion;
      for (const b of L.boats) if (b.id > 0 && b.id <= MAXBOATS) M.U.lift.value[b.id] = b.e ? (+b.e.animLift || 0) * k : (still ? 0 : 0.02 * Math.sin((F && F.t || 0) * 1.4 + b.ph));
    } catch (e) { warnOnce('frame', e); }
  }
  function hook() {
    if (S.hooked || !(window.R11 && typeof R11.on === 'function')) return;
    S.hooked = true; R11.on('frame', frame); R11.on('mapbuilt', outerSea); R11.on('tier', onTier);
  }
  // a tier change keeps the map (core does not rebuild it): what the dress does differently by tier is its shadows (Phone
  // casts none from small things and crates), so those are set again in place
  function onTier(t) {
    const L = S.last; if (!L || !L.metres || !L.group || !L.group.parent || L.tier === t) return;
    try {
      L.tier = t; const phone = t === 'phone';
      L.metres.traverse((o) => {
        if (!o.isMesh) return;
        const k = /^harbour:/.test(o.name) ? o.name.slice(8) : '';
        if (k === 'crate') o.castShadow = !phone;
        else if (o.material && S.mats && S.mats[k] === o.material) o.castShadow = !NOSHADOW.has(k) && !(phone && SMALL.has(k));
      });
    } catch (e) { warnOnce('tier', e); }
  }
  // the sea beyond the map's edge, in core's (or WATER's) own water material, so the harbour mouth has a horizon
  function outerSea(map) {
    const L = S.last; if (!L || !L.group || !map || map.id !== MAPID || L.sea) return;
    try {
      let wm = null; R11.scene.traverse((o) => { if (!wm && o.isMesh && o.name === 'r11-water') wm = o.material; });
      if (!wm) return;
      const THREE = R11.THREE, W = map.w, H = map.h, y = -0.05 * ZK, F = 420, P = [], I = [];
      const quads = [[-F, -F, W + F, 0], [-F, H, W + F, H + F], [-F, 0, 0, H], [W, 0, W + F, H]];
      // the parapet's cells (straight and round the head) are wall cells over the sea: core lays no water there, so it is laid
      // here, under the wall's apron and round its foot
      for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) { const c = map.cells[cy * W + cx]; if (c && !c.door && (c.moleParapet || c.headParapet)) quads.push([cx, cy, cx + 1, cy + 1]); }
      for (const [x0, z0, x1, z1] of quads) { const b = P.length / 3; P.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1); I.push(b, b + 2, b + 1, b, b + 3, b + 2); }
      const g = new THREE.BufferGeometry(), n = P.length / 3, uvs = [], cols = [];
      for (let i = 0; i < n; i++) { uvs.push(P[i * 3] / 0.66, P[i * 3 + 2] / 0.66); cols.push(1, 1, 1); }
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(n * 3).fill(0).map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(I); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, wm); mesh.name = 'harbour:sea'; mesh.renderOrder = 1; mesh.receiveShadow = true;
      L.group.add(mesh); L.sea = mesh; L.stats.outerSea = true;
    } catch (e) { warnOnce('outer sea', e); }
  }

  // ======================================================================== the bench camera for picture 3
  // On the Long Mole near its root, walking out (Book Two's left and right): the harbour on the left with a boat lying close
  // alongside, made fast with a thick rope sagging to a kerb bollard; the Mole's flags running out past the middle bollards
  // and the townsfolk to the round Mole-head, the mast-tower standing out of the middle of it with the Mole-light, the
  // derrick and its Articles board, the bell on the tower; on the right the parapet with casks and crates at its foot and
  // the sea beyond. No castle anywhere (owner's rule): turned toward the town, the cliff and the counting-house are the skyline.
  const benchCam = { map: MAPID, x: 58.6, y: 50.6, dir: 0.0, pitch: -14, tod: 0.62, day: 3, weather: 'overcast' };

  const api = { id: ID, MAPID, maps: (m) => !!m && m.id === MAPID, dress, lit, benchCam, get last() { return S.last; }, _internal: { mats, Acc, reader } };
  window.R11HARBOUR = api;
  window.R11DRESSERS = window.R11DRESSERS || [];
  if (!window.R11DRESSERS.some((d) => d && d.id === ID)) window.R11DRESSERS.push({ id: ID, maps: api.maps, dress });
  const pub = () => { try { if (window.R11) { R11.benchCams = R11.benchCams || {}; R11.benchCams.harbour = benchCam; hook(); return true; } } catch (e) { /* none */ } return false; };
  if (!pub()) { const t = setInterval(() => { if (pub()) clearInterval(t); }, 250); }
})();
