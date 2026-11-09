// r11harbour — ROADMAP R11 phase 4, team HARBOUR: Port Cantabile's Long Mole, the Lantern Yard and the cliff town, dressed
// to the owner's picture 3 (docs/graphics/bench3-harbour.jpg) in the realistic style (R11; docs/graphics/art-bible.md).
//
// Contract: pushes { id: 'harbour', maps(map) -> bool, dress(map, ctx) -> { group, hiddenCells, replaced } } onto
// window.R11DRESSERS (r11core calls it after R11KIT.dressMap, with the same ctx, and tears the group down with KIT's on map
// change). Exports window.R11HARBOUR = { dress, last, MAPID, lit(tod) } and R11.benchCams.harbour (picture 3's camera).
//
// WHAT IT DRAWS (map 'cantabile_harbour', js/cantabile17.js buildHarbour; every piece answers "who uses this?"):
//   the Long Mole and the Mole-head: big dressed flags (geometry: real joints, each flag its own tone, tide-worn and greener
//     toward the water), granite faces "green at the water" with weed at the waterline, "an iron ring every few paces to
//     make fast to" (game text), iron ladder-rungs let into the harbour face (Book Two, Part One ch. 7), iron bollards,
//     "mushroom-topped, waist-high", down the middle (ibid.), the Mole steps going down to the water;
//   the Mole-head: the mast-tower (sixty feet of iron rungs, a cradle at the top), the Mole-light (the tower-lantern, ibid.),
//     the derrick with the board of the Free Captains' Articles ("painted white on black board, in numbered lines") and
//     "and above" chalked under them, the rope from the cradle to the derrick (Library: Going Up), the Mole-bell in its iron
//     frame with its rope to the stones, the lifebuoy on its bracket by the bell (Book Two);
//   the moored boats (the map's own, now hulls with a stubby mast, a furled sail and the carillon bar of bronze tubes at the
//     shroud-head; they bob with the game's own swing), ropes that sag to rings and posts, the mooring posts, rope coils,
//     crates and casks in odd groups where people work (the Harbour office, the derrick's salvage, the Mole steps' ferry);
//   the houses: Hesper's four houses and the Harbour office in the Yard, and the terrace houses up the cliff, lime-washed
//     with slate roofs, chimneys, shutters, windows lit at night, replacing core's plain blocks (hiddenCells; never doors);
//     the counting-house at the top against the sky (square stone, slate roof, iron shutters); the Stair's parapets get
//     their dressed coping and the east rail its iron stanchions and two strung cables (game text).
//   [PROPOSED] (army/R11-P4/HARBOUR/TEXT.md): the timber jetty off the Mole's south face; the number of numbered lines on
//     the Articles board; the hull colours; the bracket lanterns' places.
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
  function articlesTex(THREE) {   // the Articles of the Free Captains: white on black board, in numbered lines; "and above" in chalk under them
    const r = mulberry(16);
    return canvasTex(THREE, 256, 384, (g, w, h) => {
      g.fillStyle = '#121212'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '90,80,70'},${0.15 * r()})`; g.fillRect(r() * w, r() * h, 2, 2); }
      g.fillStyle = '#d8d4c8'; g.font = 'bold 16px serif'; g.textAlign = 'center'; g.fillText('ARTICLES', w / 2, 24);
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
      m.vertexColors = true; m.color.setHex(color); return m;
    };
    M.flag = scan(SAND, 0xd2d0c8);                     // the Mole's dressed flags (granite-grey)
    M.quay = scan(SAND, 0x8f8e88);                     // the Mole's faces: granite blocks, green at the water
    M.grout = new THREE.MeshStandardMaterial({ color: 0x1e211a, roughness: 0.92, vertexColors: true });
    M.weed = new THREE.MeshStandardMaterial({ map: weedTex(THREE), alphaTest: 0.35, roughness: 0.55, side: THREE.DoubleSide, vertexColors: true });
    M.stone = scan('rustic_stone_wall', 0xb4aca0);     // plinths, chimneys, foundations
    M.ashlar = scan(SAND, 0xb8b2a6);
    M.rock = scan('rustic_stone_wall', 0x8c8a84);    // the sea's edge: wet rock, boulders and stacks
    M.far = farFog(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));   // the coast across the bight, in the haze
    M.plaster = scan('grey_plaster_02', 0xffffff);          // lime-wash (white_plaster_rough_02 is a mossy green scan)
    M.slate = scan('roof_slates_02', 0x8a9096, { ns: 1.2 });
    M.timber = scan('medieval_wood', 0x7a6650);
    M.planks = scan('weathered_planks', 0xb4a48c);
    M.iron = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.62, metalness: 0.7, vertexColors: true });
    M.rope = new THREE.MeshStandardMaterial({ color: 0x74644a, roughness: 0.95, vertexColors: true });
    M.bronze = new THREE.MeshStandardMaterial({ color: 0x9a7440, roughness: 0.38, metalness: 1, vertexColors: true });
    M.cloth = new THREE.MeshStandardMaterial({ color: 0xb2a68c, roughness: 0.96, vertexColors: true, side: THREE.DoubleSide });
    M.board = new THREE.MeshStandardMaterial({ map: articlesTex(THREE), roughness: 0.8 });
    M.winDark = new THREE.MeshStandardMaterial({ color: 0x2a3438, roughness: 0.08, metalness: 0, envMapIntensity: 1.2, vertexColors: true });
    M.winLit = new THREE.MeshStandardMaterial({ color: 0x2a3034, roughness: 0.25, emissive: 0xffa040, emissiveIntensity: 0, vertexColors: true });
    M.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.62, 0.25).multiplyScalar(6) });
    // the boats ride the water: their materials lift each boat by the game's own swing (uLift[boatId], metres)
    M.U = { lift: { value: new Array(16).fill(0) }, roll: { value: new Array(16).fill(0) } };
    const bob = (m, tag) => {
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uLift = M.U.lift; sh.uniforms.uRoll = M.U.roll;
        sh.vertexShader = 'attribute float boatId;\nuniform float uLift[16];\nuniform float uRoll[16];\n' + sh.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n{ int bi = int(boatId + 0.5); transformed.y += uLift[bi] + uRoll[bi] * position.z * 0.0; }');
      };
      m.customProgramCacheKey = () => 'r11harbour-bob-' + tag;
      return m;
    };
    M.hull = bob(scan('weathered_planks', 0xffffff), 'hull');
    M.bWood = bob(scan('medieval_wood', 0x8a7660), 'wood');
    M.bRope = bob(new THREE.MeshStandardMaterial({ color: 0x74644a, roughness: 0.95, vertexColors: true }), 'rope');
    M.bBronze = bob(new THREE.MeshStandardMaterial({ color: 0xa47c44, roughness: 0.35, metalness: 1, vertexColors: true }), 'bronze');
    M.bCloth = bob(new THREE.MeshStandardMaterial({ color: 0xb2a68c, roughness: 0.96, vertexColors: true, side: THREE.DoubleSide }), 'cloth');
    for (const k of Object.keys(M)) if (M[k] && M[k].isMaterial) M[k].userData.r11shared = true;
    for (const k of ['board', 'weed']) if (M[k].map) M[k].map.userData = { r11shared: true };
    S.mats = M; S.matsT = THREE;
    return M;
  }
  const BOATKEYS = new Set(['hull', 'bWood', 'bRope', 'bBronze', 'bCloth']);

  // ======================================================================== geometry accumulator: one mesh per material
  function Acc(THREE) {
    const B = new Map(), REP = { rock: 3.0, flag: 3.6, quay: 3.2, stone: 2.4, ashlar: 3.4, plaster: 2.0, slate: 2.0, timber: 1.2, planks: 1.4, hull: 1.4, bWood: 1.2, grout: 2, weed: 1.5 };
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
      // a sagging rope from a to b (a parabola dropping `sag` metres at the middle), radius r
      rope(k, a, b, sag, r, col, n) {
        n = n || 10; let prev = a;
        for (let i = 1; i <= n; i++) { const t = i / n, p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; A.rod(k, r, prev, p, col, 5); prev = p; }
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
      mole: (x, y) => inMap(x, y) && !blk(cell(x, y)) && ftex(x, y) === 'p17c_mole',
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

  // ---- the Long Mole, the Mole-head and the Mole steps: big flags with real joints, faces, weed, rings, ladders
  function mole(A, R, hidden, r, out) {
    const C = R.C, cells = [];
    for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) if (R.mole(x, y)) { cells.push([x, y]); hidden.add(R.idx(x, y)); }
    out.moleCells = cells.length;
    const WY = R.Y(-0.05);
    const ROWS = 4, band = C / ROWS, g = 0.016, ch = 0.018;
    const nearWater = (x, y) => R.water(x, y);
    for (let y = 0; y < R.H; y++) {
      for (let b = 0; b < ROWS; b++) {
        const z0 = y * C + b * band, z1 = z0 + band;
        const edgeN = b === 0, edgeS = b === ROWS - 1;
        let x = 0;
        while (x < R.W) {
          if (!R.mole(x, y)) { x++; continue; }
          const xs = x; while (x < R.W && R.mole(x, y)) x++;
          const xe = x, X0 = xs * C, X1 = xe * C;
          let px = X0, first = true;
          while (px < X1 - 0.02) {
            let L = 0.75 + r() * 0.85; if (first) { L *= 0.3 + r() * 0.7; first = false; }
            let qx = Math.min(X1, px + L); if (X1 - qx < 0.4) qx = X1;
            const cx = clamp(Math.floor((px + qx) / 2 / C), xs, xe - 1);
            const top = R.Y(R.lvl(cx, y));
            // tide-wear: the flags at the water's edge are lower, darker and greener
            const wet = (edgeN && nearWater(cx, y - 1)) || (edgeS && nearWater(cx, y + 1)) || (px <= X0 + 0.01 && nearWater(xs - 1, y)) || (qx >= X1 - 0.01 && nearWater(xe, y));
            const k = 0.86 + r() * 0.3, warm = r() < 0.25 ? 1.06 : 1;
            let col = [k * warm, k, k / warm];
            if (wet) col = [col[0] * 0.8, col[1] * 0.86, col[2] * 0.76];
            if (r() < 0.08) col = shade(col, 0.82);
            slab(A, px + g, z0 + g, qx - g, z1 - g, top - (wet ? 0.012 : 0) + (r() - 0.5) * 0.01, ch, col, r);
            px = qx;
          }
        }
      }
    }
    // the joints: a dark, mossy bed under the flags
    for (const [x, y] of cells) {
      const t = R.Y(R.lvl(x, y)) - 0.025, X0 = x * C, X1 = X0 + C, Z0 = y * C, Z1 = Z0 + C;
      A.quad('grout', [X0, t, Z0], [X0, t, Z1], [X1, t, Z1], [X1, t, Z0], [1, 1.05, 0.95], null, [0, 1, 0]);
    }
    // the faces: granite blocks down into the water, green at the water; weed at the waterline
    const faces = [];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [x, y] of cells) {
      const top = R.Y(R.lvl(x, y));
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!R.water(nx, ny) && (R.walk(nx, ny) || R.blk(R.cell(nx, ny)))) continue;
        // the edge's two ends, outward normal
        let a, b; const N = [dx, 0, dy];
        if (dx === 1) { a = [(x + 1) * C, y * C]; b = [(x + 1) * C, (y + 1) * C]; }
        else if (dx === -1) { a = [x * C, y * C]; b = [x * C, (y + 1) * C]; }
        else if (dy === 1) { a = [x * C, (y + 1) * C]; b = [(x + 1) * C, (y + 1) * C]; }
        else { a = [x * C, y * C]; b = [(x + 1) * C, y * C]; }
        const yb = -1.8, ym = WY + 0.42;
        A.quad('quay', [a[0], yb, a[1]], [b[0], yb, b[1]], [b[0], ym, b[1]], [a[0], ym, a[1]], [[0.46, 0.52, 0.4], [0.46, 0.52, 0.4], [0.6, 0.64, 0.54], [0.6, 0.64, 0.54]], null, N);
        A.quad('quay', [a[0], ym, a[1]], [b[0], ym, b[1]], [b[0], top, b[1]], [a[0], top, a[1]], [[0.6, 0.64, 0.54], [0.6, 0.64, 0.54], [0.86, 0.86, 0.83], [0.86, 0.86, 0.83]], null, N);
        // the coping: a dressed lip along the top of the face
        const o = 0.05, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        A.box('quay', dx ? 0.34 : L, 0.2, dy ? 0.34 : L, (a[0] + b[0]) / 2 + dx * (o + 0.17 - 0.3), top - 0.09, (a[1] + b[1]) / 2 + dy * (o + 0.17 - 0.3), 0, [0.8, 0.8, 0.77]);
        const e = 0.03, u0 = (a[0] + a[1]) / 1.5, u1 = u0 + L / 1.5;
        A.quad('weed', [a[0] + dx * e, WY - 0.45, a[1] + dy * e], [b[0] + dx * e, WY - 0.45, b[1] + dy * e], [b[0] + dx * e, WY + 0.38 + r() * 0.12, b[1] + dy * e], [a[0] + dx * e, WY + 0.38 + r() * 0.12, a[1] + dy * e], [1, 1, 1], [u0, 0, u1, 0, u1, 1, u0, 1], N);
        faces.push({ a, b, dx, dy, top, x, y });
      }
    }
    return faces;
  }
  // one flag: a slab with a chamfered top (a little proud of the joints)
  function slab(A, x0, z0, x1, z1, top, ch, col, r) {
    const bot = top - 0.07, tl = top + (r() - 0.5) * 0.008, tr2 = top + (r() - 0.5) * 0.008;
    const T = [[x0 + ch, tl, z0 + ch], [x0 + ch, tr2, z1 - ch], [x1 - ch, top, z1 - ch], [x1 - ch, top, z0 + ch]];
    const Bt = [[x0, bot, z0], [x0, bot, z1], [x1, bot, z1], [x1, bot, z0]];
    // the scan sampled inside one of its blocks, a different place for every flag
    const s = 1 / 4.2, u0 = r(), v0 = r(), du = (x1 - x0) * s, dv = (z1 - z0) * s;
    A.quad('flag', T[0], T[1], T[2], T[3], col, [u0, v0, u0, v0 + dv, u0 + du, v0 + dv, u0 + du, v0], [0, 1, 0]);
    const dk = shade(col, 0.7);
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
  let _tor = null, _torT = null;
  function TORUS(THREE) { if (!_tor || _torT !== THREE) { _tor = new THREE.TorusGeometry(0.11, 0.02, 5, 12); _torT = THREE; } return _tor; }
  // an iron bollard, mushroom-topped, waist-high (Book Two)
  let _boll = null, _bollT = null;
  function bollard(A, THREE, x, y, z) {
    if (!_boll || _bollT !== THREE) {
      const P = [[0, 0], [0.27, 0], [0.27, 0.05], [0.18, 0.08], [0.16, 0.5], [0.145, 0.74], [0.13, 0.8], [0.22, 0.84], [0.235, 0.88], [0.2, 0.93], [0.1, 0.96], [0, 0.965]].map(([a, b]) => new THREE.Vector2(a, b));
      _boll = new THREE.LatheGeometry(P, 14); _bollT = THREE;
    }
    A.geo('iron', _boll, new THREE.Matrix4().makeTranslation(x, y, z), (px, py) => py > 0.82 ? [1.05, 1.0, 0.95] : py < 0.12 ? [0.8, 0.62, 0.5] : [0.95, 0.88, 0.8], null);
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
    const paint = key ? [0.5, 0.36, 0.27] : [0.55, 0.62, 0.68], strake = key ? [0.86, 0.66, 0.36] : [0.82, 0.84, 0.8], below = [0.26, 0.3, 0.22];
    const g = hullGeo(THREE, L, Bm, D);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(b.x, b.y, b.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, b.ry, 0)), new THREE.Vector3(1, 1, 1));
    const wl = 0.34;
    A.geo('hull', g, m, (px, py, pz) => { const top = D + 0.28 * Math.pow(2 * (px / L), 2) * 4 / 4; return py < wl ? below : py > top - 0.17 ? strake : paint; }, null, 1);
    // the inside: the same shell a little smaller, facing in (tarred, dark)
    const gi = g.clone(); gi.scale(0.93, 0.95, 0.9); gi.translate(0, 0.05, 0); const ix = gi.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } gi.computeVertexNormals();
    A.geo('hull', gi, m, [0.3, 0.26, 0.22], null, 1);
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

    // ---- the Mole
    const faces = mole(A, R, hidden, r, st);
    // rings every few paces along the faces, iron ladder-rungs on the harbour (north) face
    const rings = [];
    faces.forEach((f, i) => {
      if ((i * 7 + f.x * 3) % 3 !== 0) return;
      const t = 0.3 + r() * 0.4, p = [f.a[0] + (f.b[0] - f.a[0]) * t, 0, f.a[1] + (f.b[1] - f.a[1]) * t];
      ring(A, THREE, p, [f.dx, 0, f.dy], f.top - 0.32); rings.push([p[0] + f.dx * 0.08, f.top - 0.42, p[2] + f.dy * 0.08]);
    });
    st.rings = rings.length;
    let ladders = 0;
    for (const lx of [58, 67]) {
      const f = faces.find((q) => q.x === lx && q.dy === -1); if (!f) continue;
      const cx = (f.a[0] + f.b[0]) / 2, z = f.a[1] - 0.09;
      for (const s of [-0.24, 0.24]) A.rod('iron', 0.022, [cx + s, WY - 1.3, z], [cx + s, f.top + 0.05, z], [0.85, 0.65, 0.5], 6);
      for (let y = WY - 1.1; y < f.top; y += 0.3) A.rod('iron', 0.016, [cx - 0.24, y, z], [cx + 0.24, y, z], [0.85, 0.65, 0.5], 5);
      for (const s of [-0.24, 0.24]) A.rod('iron', 0.022, [cx + s, f.top + 0.05, z], [cx + s, f.top + 0.05, z + 0.3], [0.85, 0.65, 0.5], 6);
      ladders++;
    }
    st.ladders = ladders;
    // bollards: iron, mushroom-topped, waist-high, every twenty paces down the middle (Book Two); one at the tower's foot
    const bollards = [];
    for (const bx of [56.0, 61.0, 66.0, 71.0]) bollards.push([bx, 51.5]);
    bollards.push([79.2, 47.75]);
    for (const [bx, by] of bollards) bollard(A, THREE, bx * C, R.Y(R.lvl(Math.floor(bx), Math.floor(by))), by * C);
    st.bollards = bollards.length;
    // the Mole steps: a flight of stone steps down the south face into the water, where the ferry lies (Quain)
    {
      const f = faces.find((q) => q.x === 58 && q.dy === 1);
      if (f) {
        const z = f.a[1], n = 6, x0 = f.a[0] - 0.4, x1 = f.a[0] + 1.6;
        for (let i = 0; i < n; i++) { const yt = f.top - (i + 1) * (f.top - WY + 0.25) / n; A.box('quay', x1 - x0, 0.2, 0.4, (x0 + x1) / 2, yt - 0.1, z + 0.2 + i * 0.36, 0, i > 3 ? [0.5, 0.55, 0.44] : [0.82, 0.82, 0.78]); A.box('quay', x1 - x0, yt - (WY - 1), 0.36, (x0 + x1) / 2, (yt + WY - 1) / 2 - 0.1, z + 0.2 + i * 0.36, 0, [0.55, 0.58, 0.5]); }
        A.rod('iron', 0.025, [x1 + 0.05, f.top + 0.9, z + 0.02], [x1 + 0.05, WY + 0.55, z + 0.02 + n * 0.36], [0.85, 0.65, 0.5], 6);
        st.moleSteps = n;
      }
    }

    // ---- the sea's edge: the map's rock ring and sea stacks (core's tall boxes read as battlements from the Mole: no
    // castle) become boulders and stacks of wet rock, and the rock runs on a cell beyond the map's edge
    {
      let n = 0;
      const shore = (x, y) => R.blk(R.cell(x, y)) && R.tex(x, y) === 'p17c_cliff' && (y >= 44 || (x === R.W - 1 && y >= 30));
      for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
        if (!shore(x, y)) continue;
        hidden.add(R.idx(x, y));
        const yt = R.Y(R.cell(x, y).top), edge = x === 0 || y === R.H - 1 || x === R.W - 1;
        const k = edge ? 2 : 3;
        for (let i = 0; i < k; i++) boulder(A, THREE, (x + 0.2 + r() * 0.6) * C, (y + 0.2 + r() * 0.6) * C, yt * (0.6 + r() * 0.5) + (i === 0 ? 0.4 : 0), C * (0.45 + r() * 0.35), r, WY);
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
        const NA = 48, NR = 6, R0 = 115 * C, R1 = 185 * C, V = [];
        for (let i = 0; i <= NA; i++) {
          const a = a0 + (a1 - a0) * i / NA, fade = Math.min(1, Math.min(i, NA - i) / 6), H = (14 + 46 * hash2(i >> 1, side, 31) + 18 * Math.sin(i * 0.7 + side)) * (0.35 + 0.65 * fade);
          const row = [];
          for (let j = 0; j <= NR; j++) {
            const t = j / NR, rr = R0 + (R1 - R0) * t, h = j === 0 ? WY - 2 : H * Math.pow(Math.sin(Math.min(1, t * 1.25) * PI / 2), 0.6) * (1 - 0.3 * t) + 4 * hash2(i, j, 7 + side);
            row.push([cx0 + Math.cos(a) * rr * (side ? 1.0 : 1.15), h, cz0 + Math.sin(a) * rr]);
          }
          V.push(row);
        }
        for (let i = 0; i < NA; i++) for (let j = 0; j < NR; j++) {
          const c0 = (j === 0) ? [0.3, 0.32, 0.3] : [0.34 + 0.06 * hash2(i, j, 3), 0.36 + 0.05 * hash2(i, j, 4), 0.33], c1 = [0.4, 0.42, 0.37];
          A.quad('far', V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1], [c0, c0, c1, c1], [0, 0, 1, 0, 1, 1, 0, 1], [0, 1, 0]);
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
    const bellE = ents.find((e) => e.sprite === 'p17c_molebell');
    if (bellE) {
      replaced.add(bellE);
      const [bx, by, bz] = at(bellE), hz = 0.85, H = 2.8;
      for (const s of [-1, 1]) {
        A.box('quay', 0.5, 0.25, 0.5, bx, by + 0.12, bz + s * hz, 0, [0.8, 0.8, 0.76]);
        A.box('iron', 0.12, H, 0.12, bx, by + 0.25 + H / 2, bz + s * hz, 0, [0.82, 0.66, 0.55]);
        A.beam('iron', 0.06, [bx, by + 0.3, bz + s * (hz + 0.55)], [bx, by + 1.6, bz + s * hz], [0.8, 0.64, 0.52]);
        A.beam('iron', 0.06, [bx, by + H - 0.1, bz + s * hz * 0.4], [bx, by + H - 0.6, bz + s * hz], [0.8, 0.64, 0.52]);
      }
      A.box('iron', 0.16, 0.16, hz * 2 + 0.3, bx, by + 0.25 + H, bz, 0, [0.82, 0.66, 0.55]);
      const P = [[0.06, 0.82], [0.2, 0.8], [0.25, 0.7], [0.27, 0.45], [0.31, 0.2], [0.38, 0.06], [0.4, 0.0], [0.36, -0.01]].map(([a, b2]) => new THREE.Vector2(a, b2));
      const bell = new THREE.LatheGeometry(P, 18), top = by + 0.25 + H - 0.08;
      A.geo('bronze', bell, new THREE.Matrix4().makeTranslation(bx, top - 0.82, bz), [1, 1, 1], null);
      A.box('iron', 0.12, 0.14, 0.32, bx, top - 0.02, bz, 0, [0.8, 0.65, 0.55]);
      A.rod('iron', 0.025, [bx, top - 0.1, bz], [bx, top - 0.72, bz], [0.8, 0.65, 0.55], 6);
      A.rod('iron', 0.06, [bx, top - 0.75, bz], [bx, top - 0.68, bz], [0.8, 0.65, 0.55], 8);
      A.rod('rope', 0.018, [bx, top - 0.72, bz], [bx + 0.05, by + 0.04, bz + 0.2], [0.95, 0.92, 0.85], 5);
      // the lifebuoy on its bracket by the bell (Book Two): a cork ring in tarred canvas, its line coiled under it
      const lz = bz + hz + 0.1;
      A.box('iron', 0.2, 0.04, 0.04, bx - 0.1, by + 1.55, lz, 0, [0.8, 0.65, 0.55]);
      const lb = new THREE.Matrix4().compose(new THREE.Vector3(bx - 0.17, by + 1.25, lz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, PI / 2, 0)), new THREE.Vector3(3.0, 3.0, 4.2));
      A.geo('cloth', TORUS(THREE), lb, [0.95, 0.92, 0.84], null);
      coil(A, THREE, bx - 0.2, by, lz + 0.45, 0.6);
      st.moleBell = true; st.lifebuoy = true;
    }

    // ---- mooring posts (the map's posts), coils, the ring on the stones, crates and casks, lamps
    for (const e of ents) {
      if (e.sprite === 'p12r_post') {
        replaced.add(e);
        const cx = Math.floor(e.x), cy = Math.floor(e.y), onWater = R.water(cx, cy);
        const g = onWater ? WY - 1.2 : R.Y(R.lvl(cx, cy)), topY = onWater ? YL + 0.95 : g + 1.0;
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
    groupAt(55.2, 50.45, 'cask', 3, 0.1);         // at the Mole's root, north edge: the Mole's own salt fish
    groupAt(73.0, 48.55, 'crate', 3, 0.5);        // salvage under the derrick (Article the Sixteenth)
    groupAt(72.7, 49.5, 'cask', 1, 0);
    groupAt(60.7, 53.45, 'cask', 1, 0);           // the ferry's water cask at the Mole steps
    coil(A, THREE, 61.4 * C, YL, 53.8 * C, 0.8);
    coil(A, THREE, 73.6 * C, YL, 49.25 * C, 1.0);

    // ---- the map's harbour lamps (on the ground: an iron post, a stone foot, a lantern on an arm)
    for (const e of ents) {
      if (e.sprite !== 'p17c_lamppost' && e._lamp !== 'p17c_lamppost') continue;
      if (e._lampZ != null || e.yOff) continue;   // the Stair's wall-top lamps keep their sprites
      replaced.add(e);
      const [x, y, z] = at(e);
      A.box('stone', 0.36, 0.3, 0.36, x, y + 0.15, z, 0, [0.8, 0.8, 0.76]);
      A.rod('iron', 0.06, [x, y + 0.3, z], [x, y + 2.75, z], [0.85, 0.72, 0.62], 8);
      A.box('iron', 0.04, 0.04, 0.42, x, y + 2.7, z + 0.19, 0, [0.85, 0.72, 0.62]);
      A.beam('iron', 0.03, [x, y + 2.4, z + 0.01], [x, y + 2.68, z + 0.3], [0.85, 0.72, 0.62]);
      lamps.push({ p: [x, y + 2.42, z + 0.38], s: 0.95, e });
      st.lampPosts = (st.lampPosts || 0) + 1;
    }

    // ---- the boats: the map's own, a hull each, bobbing with the game's swing; ropes that sag to a ring or a post
    const boats = [];
    const ringsAndPosts = rings.concat(ents.filter((e) => e.sprite === 'p12r_post').map((e) => [e.x * C, YL + 0.6, e.y * C]));
    for (const e of (map.p17cBoats || ents.filter((q) => q.p17cBoat))) {
      if (boats.length >= 15) break;
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
      // the painter: from the bow to the nearest ring or post, sagging
      for (const end of [ends.bow, ends.stern]) {
        let tgt = null, bd = 12;
        for (const q of ringsAndPosts) { const d = Math.hypot(q[0] - end[0], q[2] - end[2]); if (d < bd) { bd = d; tgt = q; } }
        if (tgt && bd > 0.5) A.rope('rope', end, tgt, Math.min(0.9, 0.12 + bd * 0.08), 0.022, [0.85, 0.82, 0.78], 10);
        if (end === ends.bow && bd > 6) break;
      }
    }
    st.boats = boats.length;

    // ---- the jetty [PROPOSED]: a timber landing stage off the Mole's south face, where the boats come alongside
    {
      const f = faces.find((q) => q.x === 55 && q.dy === 1);
      if (f) {
        const x0 = 55.15 * C, x1 = 55.75 * C + 0.4, z0 = f.a[1] + 0.05, z1 = z0 + 6.4, dy = f.top - 0.32;
        for (let z = z0; z < z1; z += 0.24) A.box('planks', x1 - x0 + 0.1, 0.06, 0.21, (x0 + x1) / 2, dy, z + 0.11, 0, [0.78 + r() * 0.15, 0.72 + r() * 0.12, 0.62]);
        for (const xx of [x0, x1]) { A.box('timber', 0.12, 0.18, z1 - z0, xx, dy - 0.12, (z0 + z1) / 2, 0, [0.6, 0.55, 0.5]); for (let z = z0 + 0.3; z <= z1; z += 2.0) A.rod('timber', 0.13, [xx, WY - 1.0, z], [xx, dy + (z > z1 - 1 ? 0.95 : 0.1), z], [0.65, 0.58, 0.5], 7); }
        A.rod('timber', 0.13, [x1, WY - 1.0, z1], [x1, dy + 0.95, z1], [0.65, 0.58, 0.5], 7);
        ringsAndPosts.push([x1, dy + 0.7, z1]);
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
    const noShadow = new Set(['far', 'grout', 'weed', 'winDark', 'winLit', 'board', 'bRope', 'bBronze']), small = new Set(['iron', 'rope', 'bRope', 'bBronze', 'bCloth', 'cloth']);
    st.meshes = A.finish(metres, MT, { noShadow, small, phone });
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
    out.lampSig = '';
    syncLamps(out, (typeof G !== 'undefined' && G.tod) || 0.5, true);
    const token = out;
    const kit = window.R11KIT && typeof R11KIT.ready === 'function' ? R11KIT.ready() : Promise.resolve(null);
    out.gltfDone = Promise.resolve(kit).then((P) => {
      if (!P || S.last !== token) return;
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
          im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = !phone; im.receiveShadow = true; im.name = 'harbour:crate'; metres.add(im);
        }
      }
      out.stats.draws = countDraws(group);
    }).catch((e) => warnOnce('props', e));
    st.draws = countDraws(group);
    hook();
  }
  function countDraws(group) { let n = 0; group.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && o.visible && !(o.isInstancedMesh && o.count === 0)) n++; }); return n; }

  // ======================================================================== per frame: the lamps, the windows, the boats
  function syncLamps(L, tod, force) {
    const on = lit(tod);
    let sig = on ? '1' : '0';
    for (const q of L.lamps) sig += q.e ? (q.e._lampOn ? 'a' : 'b') : '';
    if (sig === L.lampSig && !force) return;
    L.lampSig = sig;
    const THREE = S.matsT, o3 = new THREE.Object3D();
    L.lamps.forEach((q, i) => {
      const isOn = q.e ? (q.e._lampOn != null ? !!q.e._lampOn : on) : on;
      o3.position.set(q.p[0], q.p[1] - 0.03 * q.s, q.p[2]); o3.scale.set(isOn ? q.s : 0, isOn ? q.s * 1.4 : 0, isOn ? q.s : 0); o3.updateMatrix(); L.flames.setMatrixAt(i, o3.matrix);
      if (q.pl) q.pl.intensity = isOn ? q.I : 0;
    });
    L.flames.instanceMatrix.needsUpdate = true;
    const M = S.mats; if (M) { M.winLit.emissiveIntensity = on ? (M.winLit.userData.litI || 2.2) : 0; }
  }
  function frame(F) {
    const L = S.last; if (!L || !L.group || !L.group.parent) return;
    if (typeof G === 'undefined' || G.mapId !== MAPID) return;
    try {
      syncLamps(L, G.tod || 0, false);
      const M = S.mats; if (!M) return;
      const k = ZK / (+(window.R11 && R11.M) || 0.33);
      for (const b of L.boats) M.U.lift.value[b.id] = (+b.e.animLift || 0) * k;
    } catch (e) { warnOnce('frame', e); }
  }
  function hook() {
    if (S.hooked || !(window.R11 && typeof R11.on === 'function')) return;
    S.hooked = true; R11.on('frame', frame); R11.on('mapbuilt', outerSea);
  }
  // the sea beyond the map's edge, in core's (or WATER's) own water material, so the harbour mouth has a horizon
  function outerSea(map) {
    const L = S.last; if (!L || !L.group || !map || map.id !== MAPID || L.sea) return;
    try {
      let wm = null; R11.scene.traverse((o) => { if (!wm && o.isMesh && o.name === 'r11-water') wm = o.material; });
      if (!wm) return;
      const THREE = R11.THREE, W = map.w, H = map.h, y = -0.05 * ZK, F = 420, P = [], I = [];
      const quads = [[-F, -F, W + F, 0], [-F, H, W + F, H + F], [-F, 0, 0, H], [W, 0, W + F, H]];
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
  // On the Long Mole a little out from the Yard, looking back toward the town: the Mole's flags and bollards running in,
  // boats moored on the left, the Harbour office and Hesper's houses at the Mole's root, the terraces stacked up the cliff
  // with the Stair cut up the middle, and the counting-house at the top against the sky (no castle: the owner's rule).
  const benchCam = { map: MAPID, x: 65.0, y: 52.65, dir: Math.PI + 0.08, pitch: 4, tod: 0.62, day: 3, weather: 'overcast' };

  const api = { id: ID, MAPID, maps: (m) => !!m && m.id === MAPID, dress, lit, benchCam, get last() { return S.last; }, _internal: { mats, Acc, reader } };
  window.R11HARBOUR = api;
  (window.R11DRESSERS = window.R11DRESSERS || []).push({ id: ID, maps: api.maps, dress });
  const pub = () => { try { if (window.R11) { R11.benchCams = R11.benchCams || {}; R11.benchCams.harbour = benchCam; hook(); return true; } } catch (e) { /* none */ } return false; };
  if (!pub()) { const t = setInterval(() => { if (pub()) clearInterval(t); }, 250); }
})();
