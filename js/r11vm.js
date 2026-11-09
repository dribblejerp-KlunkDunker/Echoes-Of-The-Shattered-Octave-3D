// r11vm — ROADMAP R11 phase 2, team HANDS: the first-person hands and weapons of the realistic look.
//
// window.R11VM = {
//   viewmodel(kind, opts) -> { group, kind, update(t, walk, F), stats() }
//       kinds(): 'glass-arm' (Kaelen's left arm), 'sword', 'longsword', 'knife', 'axe', 'mace', 'maul', 'spear', 'staff',
//       'pistol', 'crossbow', 'fists', 'blade' (fallback). CORE's names and raw WEAPONS ids are welcome too ('dagger',
//       'bow', 'hands', 'p12_dirk', ...). Built in the first-person scene's units (metres, camera at the origin looking
//       down -z); CORE frames it with a 40-degree camera on the view rows and lights it with the world's light.
//       The weapon group's swing pivot is the grip: CORE writes group.position/rotation from game state (vmFrame) and the
//       group turns about the fist, not about the eye. opts.lights: carry a small light rig (default: only when
//       R11.vm.scene is absent).
//   kindFor(weaponId) -> the viewmodel kind for an entry of WEAPONS.
//   kinds()           -> the 13 kinds.
// }
// Everything is procedural: real steel (MeshStandardMaterial, metalness 1, the HDR environment does the reflections) with
// a fuller and bevelled edges in the geometry, a shaped guard and pommel, a leather-wrapped grip, and a gloved fist with
// segmented fingers closed round the grip and a stitched cuff. The glass arm is faceted light-glass, cyan at the rim, with
// light moving inside and one sea-green vein "like a river under ice" up the forearm (canon), self-lit.
'use strict';
const R11VM = (function () {
  const PI = Math.PI, TAU = PI * 2;
  const KINDS = ['glass-arm', 'sword', 'longsword', 'knife', 'axe', 'mace', 'maul', 'spear', 'staff', 'pistol', 'crossbow', 'fists', 'blade'];
  const ALIAS = { dagger: 'knife', dirk: 'knife', bow: 'crossbow', glass: 'fists', hands: 'fists', fist: 'fists', hammer: 'mace', glaive: 'spear', arm: 'glass-arm' };
  const KIND_BY_IMG = { fp_sword: 'sword', fp_longsword: 'longsword', fp_knife: 'knife', fp_axe: 'axe', fp_mace: 'mace', fp_maul: 'maul', fp_spear: 'spear', fp_pistol: 'pistol', fp_crossbow: 'crossbow', fp_hands: 'fists', fp_glass: 'fists', fp_staff: 'staff' };
  const RULES = [[/staff|stave|crook|rod|cane|wand/, 'staff'], [/longsword|greatsword|tuning-blade|glass-edged/, 'longsword'], [/sword|blade|sabre|saber|falchion|brand/, 'sword'],
    [/dagger|knife|dirk|stiletto|shears|nib/, 'knife'], [/axe/, 'axe'], [/maul|sledge/, 'maul'], [/mace|club|hammer|cudgel|flail/, 'mace'],
    [/spear|pike|halberd|glaive|lance|fork/, 'spear'], [/crossbow|bow/, 'crossbow'], [/pistol|gun|shot/, 'pistol']];
  const warned = {};
  function warnOnce(k, e) { if (warned[k]) return; warned[k] = 1; try { console.warn('r11vm: ' + k, e); } catch (x) { /* none */ } }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function T3() {
    try {
      if (typeof window === 'undefined') return null;
      if (window.R11 && window.R11.THREE) return window.R11.THREE;
      if (window.R11THREE && window.R11THREE.THREE) return window.R11THREE.THREE;
    } catch (e) { /* none */ }
    return null;
  }
  const mergeFn = () => (typeof window !== 'undefined' && window.R11THREE && window.R11THREE.mergeGeometries) || null;

  function kindFor(id) {
    const s = String(id == null ? '' : id).toLowerCase();
    if (!s || s === 'hands' || s === 'fists' || s === 'fist') return 'fists';
    if (KINDS.includes(s)) return s;
    if (ALIAS[s]) return ALIAS[s];
    let W = null;
    try { if (typeof WEAPONS === 'object' && WEAPONS) W = WEAPONS[id] || WEAPONS[s] || null; } catch (e) { W = null; }
    const name = W && W.name ? String(W.name).toLowerCase() : '';
    if (/staff|stave|crook/.test(s + ' ' + name)) return 'staff';
    if (W && KIND_BY_IMG[W.img]) return KIND_BY_IMG[W.img];
    for (const [re, k] of RULES) if (re.test(s + ' ' + name)) return k;
    return 'blade';
  }

  // ======================================================================== geometry
  let THREE = null, V3 = null;
  const V = (x, y, z) => new V3(x, y, z);
  // a grid of rows (each a ring of [x, y, z]); closed rings wrap; a crease is a point repeated in a row (its quads have no
  // area, so the faces either side keep their own normals). centers (one per row) orient the winding outward.
  function gridGeo(rows, o) {
    o = o || {};
    const nr = rows.length, nc = rows[0].length, closed = o.closed !== false, cols = closed ? nc + 1 : nc;
    const pos = new Float32Array(nr * cols * 3), uv = new Float32Array(nr * cols * 2);
    for (let i = 0; i < nr; i++) for (let j = 0; j < cols; j++) {
      const p = rows[i][j % nc], k = i * cols + j;
      pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
      uv[k * 2] = (o.u ? o.u[j % nc] + (j === nc ? (o.uWrap || 0) : 0) : j / (cols - 1)) * (o.us || 1);
      uv[k * 2 + 1] = (o.v ? o.v[i] : i / Math.max(1, nr - 1)) * (o.vs || 1);
    }
    const build = (flip) => {
      const idx = [];
      for (let i = 0; i < nr - 1; i++) for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
        if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    };
    let g = build(false);
    if (o.centers) {
      const n = g.attributes.normal; let s = 0;
      for (let i = 0; i < nr; i++) { const c = o.centers[i]; for (let j = 0; j < cols; j++) { const k = i * cols + j; s += n.getX(k) * (pos[k * 3] - c[0]) + n.getY(k) * (pos[k * 3 + 1] - c[1]) + n.getZ(k) * (pos[k * 3 + 2] - c[2]); } }
      if (s < 0) g = build(true);
    }
    if (closed && !o.flat) {
      const n = g.attributes.normal;
      for (let i = 0; i < nr; i++) {
        const a = i * cols, b = a + cols - 1, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1;
        n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l);
      }
    }
    if (o.flat) { g = g.toNonIndexed(); g.computeVertexNormals(); }
    return g;
  }
  // round a polyline's corners (a knuckle bends, it does not kink)
  function fillet(J, f) {
    const out = [J[0].clone()];
    for (let i = 1; i < J.length - 1; i++) {
      const a = new V3().subVectors(J[i], J[i - 1]), b = new V3().subVectors(J[i + 1], J[i]);
      const ff = Math.min(f, 0.45 * a.length(), 0.45 * b.length());
      const A = J[i].clone().addScaledVector(a.normalize(), -ff), B = J[i].clone().addScaledVector(b.normalize(), ff);
      out.push(A);
      for (let k = 1; k < 4; k++) { const t = k / 4, u = 1 - t; out.push(new V3(u * u * A.x + 2 * u * t * J[i].x + t * t * B.x, u * u * A.y + 2 * u * t * J[i].y + t * t * B.y, u * u * A.z + 2 * u * t * J[i].z + t * t * B.z)); }
      out.push(B);
    }
    out.push(J[J.length - 1].clone());
    return out;
  }
  // a tube along a polyline: rad(s, a, d) -> r or [rx, ry] (s: 0..1 along, a: ring angle, d: metres along); caps round the
  // ends (cap0/cap1: true or a depth factor); up: the first frame's normal; sides; step (metres per ring)
  function tubeGeo(pts, rad, o) {
    o = o || {};
    const sides = o.sides || 10, L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const len = L[L.length - 1] || 1e-6, n = o.n || Math.max(2, Math.ceil(len / (o.step || 0.004)));
    const P = [], S = [];
    let sg = 0;
    for (let k = 0; k <= n; k++) {
      const d = k / n * len; while (sg < pts.length - 2 && L[sg + 1] < d) sg++;
      const f = clamp((d - L[sg]) / Math.max(1e-9, L[sg + 1] - L[sg]), 0, 1);
      P.push(new V3().lerpVectors(pts[sg], pts[sg + 1], f)); S.push(d / len);
    }
    const T = P.map((p, k) => new V3().subVectors(P[Math.min(n, k + 1)], P[Math.max(0, k - 1)]).normalize());
    const N = [];
    const n0 = o.up ? o.up.clone() : (Math.abs(T[0].y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0));
    n0.addScaledVector(T[0], -n0.dot(T[0])).normalize(); N.push(n0);
    const q = new THREE.Quaternion();
    for (let k = 1; k <= n; k++) { q.setFromUnitVectors(T[k - 1], T[k]); const nk = N[k - 1].clone().applyQuaternion(q); nk.addScaledVector(T[k], -nk.dot(T[k])).normalize(); N.push(nk); }
    const B = N.map((nn, k) => new V3().crossVectors(T[k], nn));
    const rows = [], centers = [], vv = [];
    const R = (s, a, d) => { const r = rad(s, a, d); return typeof r === 'number' ? [r, r] : r; };
    const ring = (c, k, s, d, sc) => {
      const row = [];
      for (let j = 0; j < sides; j++) {
        const a = j / sides * TAU + (o.twist || 0), r = R(s, a, d), ca = Math.cos(a), sa = Math.sin(a);
        row.push([c.x + (N[k].x * ca * r[0] + B[k].x * sa * r[1]) * sc, c.y + (N[k].y * ca * r[0] + B[k].y * sa * r[1]) * sc, c.z + (N[k].z * ca * r[0] + B[k].z * sa * r[1]) * sc]);
      }
      rows.push(row); centers.push([c.x, c.y, c.z]);
    };
    const capN = o.capN || 4;
    if (o.cap0) {
      const r0 = R(0, 0, 0), rr = (r0[0] + r0[1]) / 2, k0 = o.cap0 === true ? 1 : o.cap0;
      for (let j = capN; j >= 1; j--) { const al = j / capN * PI / 2; ring(P[0].clone().addScaledVector(T[0], -rr * Math.sin(al) * k0), 0, 0, 0, Math.cos(al)); vv.push(-0.01 * j); }
    }
    for (let k = 0; k <= n; k++) { ring(P[k], k, S[k], S[k] * len, 1); vv.push(S[k]); }
    if (o.cap1) {
      const r1 = R(1, 0, len), rr = (r1[0] + r1[1]) / 2, k1 = o.cap1 === true ? 1 : o.cap1;
      for (let j = 1; j <= capN; j++) { const al = j / capN * PI / 2; ring(P[n].clone().addScaledVector(T[n], rr * Math.sin(al) * k1), n, 1, len, Math.cos(al)); vv.push(1 + 0.01 * j); }
    }
    return gridGeo(rows, { centers, v: o.v ? vv.map((x) => x * o.v) : vv, flat: o.flat, us: o.us || 1 });
  }
  // a solid of revolution about an axis: prof = [[r, h, crease?], ...] (r may be [rx, ry]); h in metres along the axis
  function revolve(prof, o) {
    o = o || {};
    const sides = o.sides || 16, org = o.o || V(0, 0, 0), ax = (o.axis || V(0, 1, 0)).clone().normalize();
    const nrm = (o.up ? o.up.clone() : (Math.abs(ax.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0))); nrm.addScaledVector(ax, -nrm.dot(ax)).normalize();
    const bn = new V3().crossVectors(ax, nrm), rows = [], centers = [], vv = [];
    let acc = 0;
    for (let i = 0; i < prof.length; i++) {
      const [r0, h, cr] = prof[i], r = typeof r0 === 'number' ? [r0, r0] : r0;
      if (i) acc += Math.hypot(r[0] - (typeof prof[i - 1][0] === 'number' ? prof[i - 1][0] : prof[i - 1][0][0]), h - prof[i - 1][1]);
      const c = org.clone().addScaledVector(ax, h), row = [];
      for (let j = 0; j < sides; j++) {
        const a = j / sides * TAU + (o.twist || 0), ca = Math.cos(a), sa = Math.sin(a);
        row.push([c.x + nrm.x * ca * r[0] + bn.x * sa * r[1], c.y + nrm.y * ca * r[0] + bn.y * sa * r[1], c.z + nrm.z * ca * r[0] + bn.z * sa * r[1]]);
      }
      const times = cr ? 2 : 1;
      for (let t = 0; t < times; t++) { rows.push(row); centers.push([c.x, c.y, c.z]); vv.push(acc * (o.vs || 20)); }
    }
    return gridGeo(rows, { centers, v: vv, flat: o.flat });
  }
  // a superellipsoid on three axes (vectors carry the half sizes); pw < 1 squares it off
  function blob(c, ax, ay, az, o) {
    o = o || {};
    const nu = o.nu || 16, nv = o.nv || 10, pw = o.pw || 1, f = (x) => Math.sign(x) * Math.pow(Math.abs(x), pw), rows = [], centers = [];
    for (let i = 0; i <= nv; i++) {
      const th = i / nv * PI, st = Math.sin(th), ct = Math.cos(th), row = [];
      for (let j = 0; j < nu; j++) {
        const ph = j / nu * TAU, a = f(st) * f(Math.cos(ph)), b = f(st) * f(Math.sin(ph)), z = f(ct);
        row.push([c.x + ax.x * a + ay.x * b + az.x * z, c.y + ax.y * a + ay.y * b + az.y * z, c.z + ax.z * a + ay.z * b + az.z * z]);
      }
      rows.push(row); centers.push([c.x, c.y, c.z]);
    }
    return gridGeo(rows, { centers, flat: o.flat });
  }
  function boxAt(sx, sy, sz, p, quat) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4().compose(p, quat || new THREE.Quaternion(), V(1, 1, 1)); g.applyMatrix4(m); return g;
  }
  // merge geometries into one mesh (one draw per material)
  function mergeAll(list) {
    list = list.filter(Boolean);
    if (!list.length) return null;
    const keep = ['position', 'normal', 'uv'];
    const anyNon = list.some((g) => !g.index);
    list = list.map((g) => { if (anyNon && g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (!keep.includes(k)) g.deleteAttribute(k); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; });
    const mg = mergeFn();
    if (list.length === 1) return list[0];
    const out = mg ? mg(list, false) : null;
    if (out) { for (const g of list) g.dispose(); return out; }
    return list[0];
  }

  // ======================================================================== surfaces (small canvas maps, made per build)
  function noise2(seed, size) {
    const r = mulberry(seed), g = new Float32Array(size * size);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const at = (x, y) => g[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
    return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  }
  function canvasTex(w, h, fn, srgb, rep) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const p = fn(xx, yy), k = (yy * w + xx) * 4; d[k] = clamp(p[0], 0, 255); d[k + 1] = clamp(p[1], 0, 255); d[k + 2] = clamp(p[2], 0, 255); d[k + 3] = 255; }
    x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4; t.needsUpdate = true;
    return t;
  }
  // leather: a fine pebbled grain with creases; R carries the grain (bump), G the roughness
  function leatherTex(seed) {
    const n1 = noise2(seed, 16), n2 = noise2(seed + 7, 32), n3 = noise2(seed + 13, 64);
    return canvasTex(128, 128, (x, y) => {
      const g = 0.5 * n1(x / 8, y / 8) + 0.3 * n2(x / 4, y / 4) + 0.2 * n3(x / 2, y / 2), cr = Math.abs(n1(x / 16 + 3, y / 5) - 0.5) < 0.03 ? -0.25 : 0;
      const v = clamp(g + cr, 0, 1);
      return [70 + 150 * v, 120 + 90 * (1 - v), 0];
    }, false, [3, 3]);
  }
  function leatherMap(seed, base) {
    const n1 = noise2(seed + 3, 16), n2 = noise2(seed + 9, 64), c = new THREE.Color(base); const R = c.r * 255, G = c.g * 255, B = c.b * 255;
    return canvasTex(128, 128, (x, y) => { const v = 0.78 + 0.32 * n1(x / 8, y / 8) + 0.12 * (n2(x / 2, y / 2) - 0.5); return [R * v, G * v, B * v]; }, true, [3, 3]);
  }
  // blade steel: u = the region across the blade (0..0.25 the edge bevels, 0.25..0.5 the flats, 0.5..1 the fuller),
  // v = along it; G = roughness: the bevels polished, the flats and the fuller drawn along the blade, a little pitting
  function bladeTex(seed) {
    const s1 = noise2(seed, 64), s2 = noise2(seed + 5, 32), p = noise2(seed + 11, 64);
    const at = (x, y) => {
      const u = x / 128, base = u < 0.25 ? 0.1 : u < 0.5 ? 0.19 : 0.3;
      const streak = (s1(x * 0.9, y / 48) - 0.5) * 0.12 + (s2(x * 0.5, y / 20) - 0.5) * 0.06;
      const pit = p(x / 2.5, y / 2.5) > 0.86 ? 1 : 0;
      return [clamp(base + streak + pit * 0.14, 0.08, 0.7), streak, pit, u];
    };
    return {
      rough: canvasTex(128, 512, (x, y) => { const a = at(x, y); return [0, a[0] * 255, 255]; }, false),
      col: canvasTex(128, 512, (x, y) => { const a = at(x, y), v = 236 - a[2] * 46 - (a[3] >= 0.5 ? 14 : 0) + a[1] * 70; return [v, v, v]; }, true),
    };
  }
  function woodTex(seed, base) {
    const n1 = noise2(seed, 32), n2 = noise2(seed + 4, 64), c = new THREE.Color(base); const R = c.r * 255, G = c.g * 255, B = c.b * 255;
    return canvasTex(64, 256, (x, y) => { const g = n1(x / 3, y / 40) * 0.7 + n2(x / 1.5, y / 10) * 0.3, v = 0.72 + 0.45 * g + 0.1 * Math.sin(x * 0.8 + 6 * n1(x / 8, y / 30)); return [R * v, G * v, B * v]; }, true);
  }
  function makeMats(seed) {
    const lt = leatherTex(seed), bt = typeof document !== 'undefined' ? bladeTex(seed + 1) : null;
    const M = {
      blade: new THREE.MeshStandardMaterial({ name: 'r11vm:steel', color: 0x8f969d, metalness: 1, roughness: 1, roughnessMap: bt && bt.rough, map: bt && bt.col, envMapIntensity: 1.0 }),
      steel: new THREE.MeshStandardMaterial({ name: 'r11vm:guard', color: 0x8a8f95, metalness: 1, roughness: 0.34, envMapIntensity: 1.0 }),
      iron: new THREE.MeshStandardMaterial({ name: 'r11vm:iron', color: 0x5d5f62, metalness: 1, roughness: 0.48 }),
      bronze: new THREE.MeshStandardMaterial({ name: 'r11vm:bronze', color: 0xb08250, metalness: 1, roughness: 0.34 }),
      brass: new THREE.MeshStandardMaterial({ name: 'r11vm:brass', color: 0xb8964f, metalness: 1, roughness: 0.3 }),
      glove: new THREE.MeshStandardMaterial({ name: 'r11vm:glove', color: 0xffffff, map: leatherMap(seed, 0x6a4530), roughness: 0.78, roughnessMap: lt, bumpMap: lt, bumpScale: 1.2, metalness: 0, vertexColors: true }),
      wrap: new THREE.MeshStandardMaterial({ name: 'r11vm:grip', color: 0xffffff, map: leatherMap(seed + 2, 0x4a2c1c), roughness: 0.85, roughnessMap: lt, bumpMap: lt, bumpScale: 0.8 }),
      stitch: new THREE.MeshStandardMaterial({ name: 'r11vm:stitch', color: 0x9b8461, roughness: 0.85 }),
      sleeve: new THREE.MeshStandardMaterial({ name: 'r11vm:sleeve', color: 0xffffff, map: leatherMap(seed + 5, 0x564a3c), roughness: 1, bumpMap: lt, bumpScale: 2 }),
      wood: new THREE.MeshStandardMaterial({ name: 'r11vm:wood', color: 0xffffff, map: woodTex(seed + 3, 0x6a4a30), roughness: 0.62 }),
      string: new THREE.MeshStandardMaterial({ name: 'r11vm:string', color: 0x6b604c, roughness: 0.9 }),
    };
    return M;
  }

  // ======================================================================== the gloved fist
  // The right fist closed round a grip on local y through the origin (grip radius ~0.017 m): the palm against the grip's
  // +x side, the back of the hand outward (+x), the knuckles to the front (-z) where a blade's edge points, the fingers
  // round the front and the left to tuck their tips at the back-left, the thumb over them from the back; the wrist runs
  // back toward the eye (+z), down and out (+x) into a stitched gauntlet cuff and the sleeve.
  const FOREARM = () => V(0.72, -0.34, 0.66).normalize();
  function fistParts(o) {
    o = o || {};
    const gr = o.gripR || 0.0172, glove = [], stitch = [], sleeve = [];
    const fingers = [
      // y of the MCP, MCP angle (deg), MCP radius, phalanx lengths, finger radius
      [0.034, -24, 0.040, [0.045, 0.026, 0.021], 0.0112],
      [0.0125, -28, 0.041, [0.048, 0.029, 0.022], 0.0115],
      [-0.0095, -33, 0.039, [0.045, 0.027, 0.021], 0.0109],
      [-0.0305, -40, 0.035, [0.036, 0.021, 0.018], 0.0099],
    ];
    const D = V(0.24, -0.2, 0.95).normalize();
    const mcps = [];
    for (const [y, deg, mr, lens, fr] of fingers) {
      const t0 = deg * PI / 180, m = V(Math.cos(t0) * mr, y, Math.sin(t0) * mr); mcps.push(m);
      const J = [m.clone().addScaledVector(D, 0.022), m.clone()];
      let prev = m.clone(), th = t0;
      for (let k = 0; k < 3; k++) {
        const r = gr + fr + 0.0012 + (k === 0 ? 0.0012 : 0), yy = y - 0.0012 * (k + 1);
        let p = null;
        for (let it = 0; it < 800; it++) { th -= 0.005; p = V(Math.cos(th) * r, yy, Math.sin(th) * r); if (p.distanceTo(prev) >= lens[k]) break; }
        J.push(p); prev = p;
      }
      const path = fillet(J, fr * 0.9);
      let tot = 0; const sj = [0]; for (let k = 1; k < J.length; k++) { tot += J[k].distanceTo(J[k - 1]); sj.push(tot); }
      const jo = sj.map((x) => x / tot);
      glove.push(tubeGeo(path, (s) => {
        let r = fr * (1 - 0.14 * s);
        r *= 1 + 0.2 * Math.exp(-Math.pow((s - jo[1]) / 0.05, 2)) + 0.09 * Math.exp(-Math.pow((s - jo[2]) / 0.035, 2)) + 0.07 * Math.exp(-Math.pow((s - jo[3]) / 0.03, 2));
        // the glove's creases either side of the middle joints: what makes the fingers read as segments
        for (const k of [2, 3]) { r *= 1 - 0.07 * Math.exp(-Math.pow((s - jo[k] - 0.05) / 0.012, 2)) - 0.07 * Math.exp(-Math.pow((s - jo[k] + 0.05) / 0.012, 2)); }
        return [r, r * 0.94];
      }, { sides: 14, step: 0.0028, cap0: 0.6, cap1: 0.85, up: V(0, 1, 0) }));
    }
    // the back of the hand and the palm: a squared-off ellipsoid from the knuckle row back to the wrist
    const Kc = new V3().addVectors(mcps[0], mcps[3]).multiplyScalar(0.5);
    const W = Kc.clone().addScaledVector(D, 0.072);
    const a1 = D.clone().multiplyScalar(0.05);
    const up = V(0, 1, 0).addScaledVector(D, -D.y).normalize();
    const a2 = up.clone().multiplyScalar(0.044);
    const a3 = new V3().crossVectors(up, D).normalize();
    if (a3.x < 0) a3.negate();
    const C = new V3().addVectors(Kc, W).multiplyScalar(0.5).addScaledVector(a3, 0.004);
    glove.push(blob(C, a1, a2, a3.clone().multiplyScalar(0.0175), { pw: 0.72, nu: 22, nv: 14 }));
    // the knuckles: the row of bumps the glove stretches over
    for (let i = 0; i < 4; i++) glove.push(blob(mcps[i].clone().addScaledVector(a3, 0.004), V(0.009, 0, 0).applyAxisAngle(V(0, 1, 0), 0), V(0, 0.0095, 0), V(0, 0, 0.009), { nu: 10, nv: 6 }));
    // the palm closed round the grip: a crescent of glove from the knuckles' side round the back of the grip to where the
    // fingertips tuck in (so no grip shows between the fingers and the heel of the hand)
    {
      const rows = [], centers = [], y0 = -0.042, y1 = 0.046, nY = 14, nA = 14;
      for (let i = 0; i <= nY; i++) {
        const t = i / nY, y = y0 + (y1 - y0) * t, e = Math.pow(Math.sin(PI * t), 0.45), row = [];
        const a0 = -0.55, a1 = 2.6 - 0.2 * t;
        const ro = (a) => gr + 0.0035 + (0.012 + 0.012 * Math.sin(clamp((a - a0) / (a1 - a0), 0, 1) * PI)) * e;
        for (let j = 0; j <= nA; j++) { const a = a0 + (a1 - a0) * j / nA; row.push([Math.cos(a) * ro(a), y, Math.sin(a) * ro(a)]); }
        for (let j = nA - 1; j >= 1; j--) { const a = a0 + (a1 - a0) * j / nA, ri = gr + 0.0012; row.push([Math.cos(a) * ri, y, Math.sin(a) * ri]); }
        rows.push(row); const m = (a0 + a1) / 2; centers.push([Math.cos(m) * (gr + 0.008), y, Math.sin(m) * (gr + 0.008)]);
      }
      glove.push(gridGeo(rows, { centers }));
    }
    // the heel of the thumb and the thumb, over the fingertips at the back-left of the grip
    const tj = [V(0.042, 0.004, 0.045), V(0.02, 0.022, 0.046), V(-0.004, 0.029, 0.0455), V(-0.024, 0.027, 0.034)];
    glove.push(blob(V(0.033, 0.012, 0.036), V(0.02, 0.01, 0.002), V(-0.004, 0.012, 0.0), V(0.0, 0.0, 0.014), { nu: 12, nv: 8 }));
    let tt = 0; const tsj = [0]; for (let k = 1; k < tj.length; k++) { tt += tj[k].distanceTo(tj[k - 1]); tsj.push(tt / 1); }
    const tjo = tsj.map((x) => x / tt);
    glove.push(tubeGeo(fillet(tj, 0.01), (s) => { let r = 0.0128 * (1 - 0.15 * s); r *= 1 + 0.08 * Math.exp(-Math.pow((s - tjo[1]) / 0.05, 2)); r *= 1 - 0.06 * Math.exp(-Math.pow((s - tjo[2] - 0.06) / 0.015, 2)); return [r, r * 0.88]; }, { sides: 14, step: 0.003, cap0: 0.6, cap1: 0.9, up: V(0, 0, 1) }));
    // the wrist into the cuff
    const F = FOREARM();
    const w0 = W.clone().addScaledVector(D, -0.016), w1 = W.clone().addScaledVector(F, 0.03);
    glove.push(tubeGeo([w0, W, w1], () => [0.026, 0.031], { sides: 16, step: 0.006, up: a3 }));
    // the gauntlet cuff: flares from the wrist, a rolled rim, a stitched band round it and a seam down its outside
    const cO = W.clone().addScaledVector(F, 0.012), cuffLen = 0.085;
    const cuffR = (h) => { const t = h / cuffLen; return [0.031 + 0.022 * Math.pow(t, 1.3), 0.035 + 0.02 * Math.pow(t, 1.3)]; };
    const cuffProf = [];
    for (let i = 0; i <= 10; i++) { const h = i / 10 * cuffLen; cuffProf.push([cuffR(h), h]); }
    cuffProf.push([[cuffR(cuffLen)[0] + 0.003, cuffR(cuffLen)[1] + 0.003], cuffLen + 0.003]);
    cuffProf.push([[cuffR(cuffLen)[0] + 0.002, cuffR(cuffLen)[1] + 0.002], cuffLen + 0.007]);
    cuffProf.push([[cuffR(cuffLen)[0] - 0.003, cuffR(cuffLen)[1] - 0.003], cuffLen + 0.006]);
    glove.push(revolve(cuffProf, { o: cO, axis: F, sides: 22, up: a3 }));
    // stitches: one band near the rim and one near the wrist, and a seam down the outside of the cuff
    const nrm = a3.clone().addScaledVector(F, -a3.dot(F)).normalize(), bn = new V3().crossVectors(F, nrm), q = new THREE.Quaternion(), m4 = new THREE.Matrix4();
    const stitchAt = (p, dir, out, len) => {
      const g = new THREE.BoxGeometry(len || 0.0042, 0.0013, 0.0014);
      const X = dir.clone().normalize(), Y = out.clone().addScaledVector(X, -out.dot(X)).normalize(), Z = new V3().crossVectors(X, Y);
      m4.makeBasis(X, Y, Z); q.setFromRotationMatrix(m4); g.applyMatrix4(new THREE.Matrix4().compose(p, q, V(1, 1, 1))); stitch.push(g);
    };
    for (const [h, n] of [[cuffLen - 0.008, 40], [0.016, 30]]) {
      const r = cuffR(h);
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const out = nrm.clone().multiplyScalar(ca * r[0]).addScaledVector(bn, sa * r[1]);
        const p = cO.clone().addScaledVector(F, h).add(out.clone().multiplyScalar(1.03));
        const tan = nrm.clone().multiplyScalar(-sa * r[0]).addScaledVector(bn, ca * r[1]);
        stitchAt(p, tan, out);
      }
    }
    for (let i = 0; i < 11; i++) { const h = 0.024 + i * 0.0047, r = cuffR(h), out = nrm.clone().multiplyScalar(r[0]); stitchAt(cO.clone().addScaledVector(F, h).add(out.clone().multiplyScalar(1.03)).addScaledVector(bn, 0.003 * (i % 2 ? 1 : -1)), F.clone().addScaledVector(bn, i % 2 ? -0.5 : 0.5), out, 0.0048); }
    // three stitched "points" down the back of the glove, wrist to knuckles
    for (const off of [-0.45, 0, 0.45]) {
      for (let i = 0; i < 9; i++) {
        const t = -0.55 + i * 0.12, cyl = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(off), 1 / 0.72 * 2)));
        const p = C.clone().addScaledVector(a1, t * 0.9).addScaledVector(a2, off).addScaledVector(a3, 0.0175 * Math.pow(cyl, 0.72) + 0.0007);
        stitchAt(p, a1, a3, 0.0036);
      }
    }
    // the sleeve: worn wool and leather, out of the cuff toward the shoulder
    const s0 = cO.clone().addScaledVector(F, cuffLen - 0.012), s1 = cO.clone().addScaledVector(F, cuffLen + 0.36);
    sleeve.push(tubeGeo([s0, s1], (s) => { const k = 0.05 + 0.016 * s + 0.002 * Math.sin(s * 40); return [k, k * 1.08]; }, { sides: 20, step: 0.02, up: a3 }));
    sleeve.push(revolve([[0.047, 0], [0.056, 0.006, 1], [0.058, 0.014], [0.052, 0.02]], { o: s0.clone().addScaledVector(F, -0.004), axis: F, sides: 20, up: a3 }));
    return { glove, stitch, sleeve, W, F, D, C, a3 };
  }
  // ambient occlusion by hand: the fingers' insides, the gaps toward the grip and the inside of the cuff go dark
  function bakeAO(geo, fn) {
    const p = geo.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  function fistMeshes(M, o) {
    const P = fistParts(o), out = [];
    const gl = mergeAll(P.glove);
    bakeAO(gl, (x, y, z) => { const d = Math.hypot(x, z); return 0.38 + 0.62 * smooth(0.019, 0.036, d); });
    out.push(mesh(gl, M.glove, 'glove'));
    out.push(mesh(mergeAll(P.stitch), M.stitch, 'stitch'));
    out.push(mesh(mergeAll(P.sleeve), M.sleeve, 'sleeve'));
    return out;
  }
  function mesh(geo, mat, name) { const m = new THREE.Mesh(geo, mat); m.name = 'r11vm:' + name; m.frustumCulled = false; return m; }

  // ======================================================================== blades
  // A blade lofted along +y in x (width) and z (thickness): edge bevels, flats, a rounded fuller that runs out before
  // the point, a tapering profile into the point. Creases are real (the edge, the bevel shoulders, the fuller's lips).
  function bladeGeo(o) {
    const N = o.n || 44, rows = [], centers = [], vv = [], slotsU = [];
    let uOK = false;
    const fullerK = 6;
    for (let i = 0; i <= N; i++) {
      const s = Math.pow(i / N, 0.92), y = s * o.len, yt = o.len - o.tip;
      let w = o.w0 + (o.w1 - o.w0) * Math.min(1, y / yt);
      if (y > yt) { const qq = (y - yt) / o.tip; w *= Math.pow(Math.max(0, 1 - Math.pow(qq, o.tipPow || 1.8)), 0.6); }
      w = Math.max(w, 0.00025);
      let t = o.t0 + (o.t1 - o.t0) * (y / o.len); if (y > yt) t *= 0.35 + 0.65 * (w / Math.max(1e-6, o.w1)); t = clamp(t, 0.00015, w * 0.8);
      const ff = o.fw ? clamp((o.fEnd * o.len - y) / (0.07 * o.len), 0, 1) : 0, fs = o.fw ? clamp((y - 0.004) / 0.02, 0, 1) : 0;
      const fw = Math.min(o.fw * Math.sqrt(ff), w * 0.42), fd = Math.min(o.fd * ff * fs, t * 0.55);
      const xb = Math.max(w - w * o.bev, fw + 0.0004, 0);
      const xbL = o.single ? w : xb;    // a single-edged blade has a flat spine on its -x side
      const front = [], back = [];
      // slots: [x, z, crease, u]
      front.push([w, 0, 1, [0.02, 0.02]]);
      front.push([xb, t, 1, [0.22, 0.28]]);
      front.push([fw, t, 1, [0.48, 0.52]]);
      for (let k = 1; k < fullerK; k++) { const a = k / fullerK * PI; front.push([fw * Math.cos(a), t - fd * Math.sin(a), 0, [0.52 + 0.46 * k / fullerK]]); }
      front.push([-fw, t, 1, [0.98, 0.48]]);
      front.push([-xbL, t, 1, [0.28, 0.22]]);
      front.push([-w, 0, 1, [0.02, 0.02]]);
      // the back face mirrors the front, from the -x edge round to the +x edge
      for (let k = 1; k < front.length - 1; k++) { const f = front[front.length - 1 - k]; back.push([f[0], -f[1], f[2], f[3].slice().reverse()]); }
      const loop = front.concat(back), row = [], us = [];
      for (const [x, z, cr, u] of loop) { if (cr) { row.push([x, y, z], [x, y, z]); us.push(u[0], u[1] != null ? u[1] : u[0]); } else { row.push([x, y, z]); us.push(u[0]); } }
      rows.push(row); centers.push([0, y, 0]); vv.push(y / o.len);
      if (!uOK) { slotsU.push(...us); uOK = true; }
    }
    // the closing quad runs from the last slot back to the first (the +x edge): drop the doubled first slot's twin there
    return gridGeo(rows, { centers, v: vv, u: slotsU });
  }
  // a crossguard: a squared block at the centre, quillons that taper and then flare into rounded terminals turned
  // toward the blade (style 'swept'), or straight with ball ends ('straight')
  function guardParts(o) {
    const out = [], gw = o.guardW / 2, gy = o.gy, style = o.style || 'swept';
    out.push(blob(V(0, gy, 0), V(0.016, 0, 0), V(0, 0.0085, 0), V(0, 0, 0.0115), { pw: 0.42, nu: 16, nv: 10 }));
    // the escutcheon: a small langet up each flat of the blade
    out.push(blob(V(0, gy + 0.0105, 0), V(0.0095, 0, 0), V(0, 0.0115, 0), V(0, 0, 0.0082), { pw: 0.65, nu: 12, nv: 8 }));
    for (const sd of [-1, 1]) {
      const pts = style === 'swept'
        ? [V(sd * 0.008, gy, 0), V(sd * gw * 0.45, gy - 0.001, 0), V(sd * gw * 0.8, gy + 0.003, 0), V(sd * gw * 0.97, gy + 0.013, 0), V(sd * gw, gy + 0.022, 0)]
        : [V(sd * 0.008, gy, 0), V(sd * gw * 0.6, gy, 0), V(sd * gw * 0.92, gy, 0)];
      out.push(tubeGeo(fillet(pts, 0.01), (s) => {
        const k = style === 'swept' ? 1 - 0.38 * Math.sin(Math.min(1, s / 0.8) * PI * 0.62) + 0.5 * smooth(0.78, 1, s) : 1 - 0.25 * s;
        return [0.0078 * k, 0.0066 * k];
      }, { sides: 10, step: 0.004, cap1: 1, up: V(0, 0, 1) }));
      if (style !== 'swept') out.push(blob(V(sd * gw * 0.95, gy, 0), V(0.008, 0, 0), V(0, 0.008, 0), V(0, 0, 0.008), { nu: 12, nv: 8 }));
    }
    return out;
  }
  function pommelGeo(y0, big, style) {
    const s = big ? 1.2 : 1;
    if (style === 'disc') {
      // a wheel pommel: a disc across the blade's plane, chamfered, with a button
      return [revolve([[0.0, -0.011 * s], [0.017 * s, -0.011 * s, 1], [0.023 * s, -0.006 * s, 1], [0.023 * s, 0.006 * s, 1], [0.017 * s, 0.011 * s, 1], [0.0, 0.011 * s]], { o: V(0, y0 - 0.024 * s, 0), axis: V(0, 0, 1), sides: 20, up: V(1, 0, 0) }),
        revolve([[0.008, 0], [0.011, -0.004, 1], [0.009, -0.009]], { o: V(0, y0, 0), sides: 12 })];
    }
    // a scent-stopper: a waisted neck, a faceted body, a button
    return [revolve([[0.0085 * s, 0], [0.011 * s, -0.004 * s], [0.017 * s, -0.012 * s], [0.0195 * s, -0.022 * s, 1], [0.016 * s, -0.031 * s], [0.008 * s, -0.037 * s, 1], [0.0055 * s, -0.04 * s], [0.0, -0.0415 * s]], { o: V(0, y0, 0), sides: 8 })];
  }
  // the leather wrap: a strap wound up the grip, its turns proud of the core, a ferrule at each end
  function gripGeo(yTop, yBot, r0) {
    const len = yTop - yBot, pitch = 0.0105;
    return tubeGeo([V(0, yBot, 0), V(0, yTop, 0)], (s, a, d) => { const f = ((a / TAU) + d / pitch) % 1, b = Math.pow(Math.sin(PI * f), 0.35); return r0 + 0.0021 * b - 0.0008 * (1 - b); }, { sides: 26, step: 0.0016, up: V(1, 0, 0), us: 3, v: len * 30 });
  }
  function bladed(M, o) {
    const g = new THREE.Group(), steel = [], wrap = [];
    const gy = 0.056, gripTop = gy - 0.006, gripBot = gripTop - o.grip;
    const bg = bladeGeo(o); bg.translate(0, gy + 0.004, 0);
    g.add(mesh(bg, M.blade, 'blade'));
    steel.push(...guardParts({ guardW: o.guardW, gy, style: o.guard }));
    if (o.handle === 'wood') {
      const hg = tubeGeo([V(0, gripBot, 0), V(0, gripTop, 0)], (s) => { const k = 0.0165 + 0.0025 * Math.sin(s * PI); return [k * 1.12, k * 0.86]; }, { sides: 18, step: 0.004, up: V(1, 0, 0) });
      g.add(mesh(hg, M.wood, 'handle'));
      for (const yy of [gripTop - 0.022, gripBot + 0.022]) steel.push(revolve([[0.0, -0.0168], [0.0034, -0.0158, 1], [0.0034, 0.0158, 1], [0.0, 0.0168]], { o: V(0, yy, 0.0), axis: V(0, 0, 1), sides: 10 }));
    } else {
      wrap.push(gripGeo(gripTop, gripBot, 0.0158));
      g.add(mesh(mergeAll(wrap), M.wrap, 'grip'));
    }
    steel.push(revolve([[0.019, 0], [0.019, -0.006, 1], [0.0175, -0.0075]], { o: V(0, gripTop + 0.0005, 0), sides: 16 }));
    steel.push(revolve([[0.0175, 0.0015], [0.019, 0, 1], [0.019, -0.005, 1], [0.01, -0.006]], { o: V(0, gripBot, 0), sides: 16 }));
    steel.push(...pommelGeo(gripBot - 0.005, o.bigPommel, o.pommel));
    g.add(mesh(mergeAll(steel), M.steel, 'guard'));
    // the edge goes where the knuckles point (-z)
    g.rotation.y = PI / 2;
    return g;
  }

  // ======================================================================== other arms
  function hafted(M, kind) {
    const g = new THREE.Group(), steel = [], iron = [], wood = [], bronze = [], wrapL = [];
    const shaft = (y0, y1, r0, r1, knots) => tubeGeo([V(0, y0, 0), V(0.002, (y0 + y1) / 2, 0), V(0, y1, 0)], (s, a, d) => { let r = r0 + (r1 - r0) * s; if (knots) r *= 1 + 0.06 * Math.exp(-Math.pow(((d * 7) % 1) - 0.5, 2) / 0.004) * (0.5 + 0.5 * Math.cos(a * 2 + d * 13)); return [r * 1.08, r * 0.92]; }, { sides: 14, step: 0.02, cap0: 0.4, cap1: 0.4, up: V(0, 0, 1), v: 4 });
    if (kind === 'axe') {
      wood.push(shaft(-0.16, 0.44, 0.0165, 0.0145));
      // the bearded head: the edge to the front (-z after the turn), thinning from the eye to the edge
      const sh = new THREE.Shape();
      sh.moveTo(-0.02, 0.03); sh.lineTo(0.03, 0.026); sh.quadraticCurveTo(0.075, 0.04, 0.118, 0.064); sh.quadraticCurveTo(0.142, 0.0, 0.112, -0.105);
      sh.quadraticCurveTo(0.08, -0.07, 0.05, -0.03); sh.lineTo(-0.02, -0.03); sh.closePath();
      const hg = new THREE.ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0035, bevelSegments: 3, curveSegments: 14 });
      hg.translate(0, 0, -0.008);
      const p = hg.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), k = 1 - 0.85 * smooth(0.02, 0.12, x); p.setZ(i, p.getZ(i) * k); }
      hg.computeVertexNormals(); hg.scale(1.3, 1.3, 1.2); hg.translate(0, 0.4, 0);
      steel.push(hg);
      iron.push(blob(V(0, 0.4, 0), V(0.024, 0, 0), V(0, 0.034, 0), V(0, 0, 0.019), { pw: 0.5, nu: 14, nv: 10 }));
      iron.push(revolve([[0.0, 0], [0.012, 0.0, 1], [0.009, 0.026], [0.0, 0.03]], { o: V(-0.02, 0.4, 0), axis: V(-1, 0, 0), sides: 6, flat: true }));
      iron.push(revolve([[0.019, 0], [0.0185, -0.006, 1], [0.017, -0.008]], { o: V(0, -0.155, 0), sides: 12 }));
    } else if (kind === 'mace') {
      wrapL.push(gripGeo(0.06, -0.08, 0.0155));
      bronze.push(revolve([[0.018, 0.0], [0.02, -0.01, 1], [0.012, -0.022], [0.0, -0.024]], { o: V(0, -0.08, 0), sides: 14 }));
      bronze.push(revolve([[0.019, 0], [0.019, 0.008, 1], [0.0135, 0.012], [0.0125, 0.2], [0.0155, 0.21, 1], [0.0155, 0.22, 1], [0.012, 0.225]], { o: V(0, 0.058, 0), sides: 14 }));
      // the flanged head: seven bronze flanges round a core, a domed cap
      const fl = new THREE.Shape(); fl.moveTo(0, -0.05); fl.quadraticCurveTo(0.042, -0.036, 0.046, 0.0); fl.quadraticCurveTo(0.042, 0.038, 0.0, 0.05); fl.closePath();
      for (let i = 0; i < 7; i++) {
        const f = new THREE.ExtrudeGeometry(fl, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0025, bevelSize: 0.002, bevelSegments: 2, curveSegments: 10 });
        f.translate(0.008, 0, -0.003); f.rotateY(i / 7 * TAU); f.translate(0, 0.33, 0); bronze.push(f);
      }
      bronze.push(revolve([[0.0, -0.06], [0.016, -0.05], [0.019, 0.0], [0.016, 0.05], [0.009, 0.062], [0.0, 0.066]], { o: V(0, 0.33, 0), sides: 14 }));
    } else if (kind === 'maul') {
      wood.push(shaft(-0.22, 0.6, 0.019, 0.017));
      // the steam-maul's head: an iron block with chamfered edges, brass-capped faces, a riveted band
      const hd = new THREE.Shape(); const hw = 0.045, hh = 0.045;
      hd.moveTo(-hw + 0.01, -hh); hd.lineTo(hw - 0.01, -hh); hd.lineTo(hw, -hh + 0.01); hd.lineTo(hw, hh - 0.01); hd.lineTo(hw - 0.01, hh); hd.lineTo(-hw + 0.01, hh); hd.lineTo(-hw, hh - 0.01); hd.lineTo(-hw, -hh + 0.01); hd.closePath();
      const hg = new THREE.ExtrudeGeometry(hd, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 });
      hg.translate(0, 0, -0.1); hg.rotateY(PI / 2); hg.translate(0, 0.62, 0); iron.push(hg);
      for (const sd of [-1, 1]) bronze.push(revolve([[0.0, 0], [0.04, 0, 1], [0.042, 0.004, 1], [0.042, 0.018, 1], [0.036, 0.022], [0.0, 0.024]], { o: V(sd * 0.104, 0.62, 0), axis: V(sd, 0, 0), sides: 18 }));
      bronze.push(revolve([[0.024, -0.018], [0.026, -0.016, 1], [0.026, 0.016, 1], [0.024, 0.018]], { o: V(0, 0.62, 0), axis: V(1, 0, 0), sides: 4, twist: PI / 4, flat: true }));
      iron.push(revolve([[0.021, 0], [0.021, -0.012, 1], [0.019, -0.014]], { o: V(0, 0.565, 0), sides: 12 }));
      wrapL.push(gripGeo(0.06, -0.06, 0.02));
    } else if (kind === 'spear') {
      wood.push(shaft(-0.5, 1.12, 0.0165, 0.0148));
      // the Tuning-Fork Spear: a bronze socket, a yoke, two long tines with points
      bronze.push(revolve([[0.0165, 0], [0.019, 0.004, 1], [0.019, 0.012, 1], [0.0165, 0.016], [0.014, 0.08], [0.017, 0.088, 1], [0.017, 0.094, 1], [0.012, 0.1]], { o: V(0, 1.06, 0), sides: 14 }));
      const yk = []; for (let i = 0; i <= 12; i++) { const a = PI + i / 12 * PI; yk.push(V(Math.cos(a) * 0.026, 1.18 + Math.sin(a) * 0.026 * 0.9 + 0.026, 0)); }
      bronze.push(tubeGeo(yk, () => [0.0075, 0.0105], { sides: 10, step: 0.004, up: V(0, 0, 1) }));
      bronze.push(tubeGeo([V(0, 1.15, 0), V(0, 1.159, 0)], () => 0.011, { sides: 10, n: 2 }));
      for (const sd of [-1, 1]) bronze.push(tubeGeo([V(sd * 0.026, 1.205, 0), V(sd * 0.0262, 1.33, 0), V(sd * 0.024, 1.41, 0)], (s) => { const k = s < 0.82 ? 1 : Math.max(0.05, 1 - (s - 0.82) / 0.18); return [0.0072 * k, 0.0098 * k]; }, { sides: 8, step: 0.006, cap1: 0.4, up: V(1, 0, 0) }));
      iron.push(revolve([[0.0, -0.05], [0.0152, -0.012], [0.017, 0.0]], { o: V(0, -0.5, 0), sides: 10 }));
    } else if (kind === 'staff') {
      wood.push(shaft(-0.55, 1.08, 0.019, 0.017, true));
      iron.push(revolve([[0.0, -0.035], [0.017, -0.01], [0.0195, 0.0, 1], [0.0195, 0.04, 1], [0.018, 0.045]], { o: V(0, -0.55, 0), sides: 12 }));
      for (let i = 0; i < 3; i++) bronze.push(revolve([[0.0182, -0.004], [0.0198, -0.003, 1], [0.0198, 0.003, 1], [0.0182, 0.004]], { o: V(0, 0.86 + i * 0.026, 0), sides: 14 }));
      wood.push(blob(V(0, 1.12, 0), V(0.026, 0, 0), V(0, 0.04, 0), V(0, 0, 0.024), { nu: 12, nv: 10, pw: 0.85 }));
      wrapL.push(gripGeo(0.05, -0.05, 0.0192));
    }
    if (steel.length) g.add(mesh(mergeAll(steel), M.blade, 'head'));
    if (wood.length) g.add(mesh(mergeAll(wood), M.wood, 'haft'));
    if (iron.length) g.add(mesh(mergeAll(iron), M.iron, 'iron'));
    if (bronze.length) g.add(mesh(mergeAll(bronze), M.bronze, 'bronze'));
    if (wrapL.length) g.add(mesh(mergeAll(wrapL), M.wrap, 'grip'));
    g.rotation.y = PI / 2;
    return g;
  }
  function pistolGeo(M) {
    // built in the hand's frame: the grip down through the fist (raked back), the barrel forward (-z) above the hand
    const g = new THREE.Group(), wood = [], steel = [], brass = [], glassM = [];
    const by = 0.07;
    wood.push(tubeGeo(fillet([V(0, -0.06, 0.03), V(0, -0.0, 0.004), V(0, 0.05, -0.006), V(0, by, -0.03), V(0, by + 0.004, -0.15)], 0.03), (s) => { const k = s < 0.55 ? 0.0175 + 0.004 * Math.sin(s / 0.55 * PI) : 0.013; return [k * 0.8, k * 1.15]; }, { sides: 14, step: 0.004, cap0: 0.5, cap1: 0.5, up: V(1, 0, 0) }));
    brass.push(blob(V(0, -0.064, 0.032), V(0.016, 0, 0), V(0, 0.012, 0), V(0, 0, 0.022), { pw: 0.8, nu: 12, nv: 8 }));
    // the barrel: octagonal steel, a brass band and a muzzle ring
    steel.push(revolve([[0.0, 0], [0.0125, 0, 1], [0.0125, 0.03, 1], [0.0105, 0.034], [0.0102, 0.2, 1], [0.0122, 0.2, 1], [0.0122, 0.212, 1], [0.0065, 0.212, 1], [0.0065, 0.2]], { o: V(0, by + 0.012, -0.04), axis: V(0, 0, -1), sides: 8, twist: PI / 8, flat: true }));
    brass.push(revolve([[0.0125, -0.004], [0.0135, -0.003, 1], [0.0135, 0.003, 1], [0.0125, 0.004]], { o: V(0, by + 0.012, -0.14), axis: V(0, 0, -1), sides: 14 }));
    // the lock: a plate on the right, the hammer, the frizzen; the glass chamber ahead of it
    steel.push(boxAt(0.004, 0.024, 0.07, V(0.014, by + 0.002, -0.02)));
    steel.push(tubeGeo(fillet([V(0.017, by + 0.004, 0.006), V(0.017, by + 0.024, 0.012), V(0.017, by + 0.032, 0.002)], 0.006), () => [0.0035, 0.0028], { sides: 6, step: 0.003, cap1: 1 }));
    glassM.push(revolve([[0.0, 0], [0.011, 0.002], [0.012, 0.012, 1], [0.012, 0.03, 1], [0.011, 0.04], [0.0, 0.042]], { o: V(0, by + 0.012, -0.002), axis: V(0, 0, -1), sides: 12 }));
    // the trigger and its brass guard
    steel.push(tubeGeo(fillet([V(0, by - 0.012, -0.012), V(0, by - 0.028, -0.016), V(0, by - 0.036, -0.01)], 0.006), () => [0.0022, 0.004], { sides: 6, step: 0.003, cap1: 1 }));
    const tg = []; for (let i = 0; i <= 14; i++) { const a = PI * 0.05 + i / 14 * PI * 1.1; tg.push(V(0, by - 0.012 - Math.sin(a) * 0.028, -0.02 + Math.cos(a) * 0.03)); }
    brass.push(tubeGeo(tg, () => [0.0028, 0.0022], { sides: 8, step: 0.004, up: V(1, 0, 0) }));
    g.add(mesh(mergeAll(wood), M.wood, 'stock'), mesh(mergeAll(steel), M.iron, 'barrel'), mesh(mergeAll(brass), M.brass, 'furniture'));
    // glass is the one place the resonance colour belongs: the Glass-Shot chamber
    const gm = new THREE.MeshStandardMaterial({ name: 'r11vm:shot-glass', color: 0x2fa8c0, emissive: 0x1a7f99, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 });
    g.add(mesh(mergeAll(glassM), gm, 'chamber'));
    return g;
  }
  function crossbowGeo(M) {
    const g = new THREE.Group(), wood = [], steel = [], iron = [], str = [];
    const sy = 0.075;
    // the stock: from the butt behind the hand forward over it; the grip drops into the fist
    wood.push(tubeGeo([V(0, sy, 0.16), V(0, sy + 0.004, 0.0), V(0, sy, -0.42)], (s) => { const k = s < 0.3 ? 1.3 - s : 1; return [0.018 * k, 0.024 * k]; }, { sides: 10, step: 0.02, cap0: 0.4, cap1: 0.3, up: V(1, 0, 0) }));
    wood.push(tubeGeo(fillet([V(0, -0.055, 0.02), V(0, 0.0, 0.005), V(0, sy - 0.01, -0.01)], 0.02), (s) => [0.0165 * 0.85, 0.019], { sides: 12, step: 0.006, cap0: 0.6, up: V(1, 0, 0) }));
    // the prod: a steel bow across the front, curved forward, with nocks
    const prod = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * 2 - 1; prod.push(V(t * 0.27, sy + 0.012, -0.4 - 0.05 * (1 - t * t))); }
    steel.push(tubeGeo(prod, (s) => { const k = 1 - 0.45 * Math.abs(s * 2 - 1); return [0.007 * k, 0.012 * k]; }, { sides: 8, step: 0.012, cap0: 1, cap1: 1, up: V(0, 1, 0) }));
    // the string drawn back to the nut, a bolt in the groove
    for (const sd of [-1, 1]) str.push(tubeGeo([V(sd * 0.27, sy + 0.012, -0.4), V(0, sy + 0.022, -0.08)], () => 0.0013, { sides: 5, n: 2 }));
    wood.push(tubeGeo([V(0, sy + 0.028, -0.08), V(0, sy + 0.028, -0.36)], () => 0.0042, { sides: 7, n: 2 }));
    steel.push(revolve([[0.0, 0], [0.0062, 0.004], [0.0062, 0.01, 1], [0.0, 0.032]], { o: V(0, sy + 0.028, -0.36), axis: V(0, 0, -1), sides: 4, flat: true }));
    iron.push(boxAt(0.03, 0.02, 0.03, V(0, sy + 0.022, -0.08)));
    // the stirrup at the front, the trigger lever under the stock
    const st = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * PI; st.push(V(Math.cos(a) * 0.04, sy - 0.005, -0.44 - Math.sin(a) * 0.07)); }
    iron.push(tubeGeo(st, () => 0.004, { sides: 6, step: 0.01 }));
    iron.push(tubeGeo([V(0, sy - 0.02, -0.03), V(0, sy - 0.06, 0.05)], () => [0.003, 0.005], { sides: 6, n: 2, cap1: 1 }));
    g.add(mesh(mergeAll(wood), M.wood, 'stock'), mesh(mergeAll(steel), M.blade, 'prod'), mesh(mergeAll(iron), M.iron, 'iron'), mesh(mergeAll(str), M.string, 'string'));
    return g;
  }

  // ======================================================================== the glass arm
  const glassVert = `attribute vec3 bary; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vB;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; vB = bary; gl_Position = projectionMatrix * mv; }`;
  // premultiplied: rgb is light added, alpha how much of what is behind it the glass hides
  const glassFrag = `uniform float uTime; uniform float uK; uniform float uBack; uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uGlint;
    varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vB;
    void main() {
      vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
      vec3 v = normalize(vV);
      float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
      float fr = pow(1.0 - ndv, 2.4);
      // light moving inside: slow bands running from the forearm into the fingers, broken up by the facets
      float s = -vP.z * 34.0;
      float w1 = 0.5 + 0.5 * sin(s - uTime * 1.6 + 7.0 * vP.x + 2.0 * n.y);
      float w2 = 0.5 + 0.5 * sin(s * 2.6 - uTime * 2.7 + 13.0 * vP.y + 3.0 * n.x);
      float inner = w1 * w1 * (0.45 + 0.55 * w2);
      vec3 L = normalize(vec3(-0.35, 0.85, 0.4));
      float sp = pow(max(0.0, dot(reflect(-v, n), L)), 28.0);
      float sky = smoothstep(0.1, 0.9, n.y) * 0.25;
      float edge = smoothstep(0.5, 0.92, fr);
      // the facets' edges: fine bright seams in the glass, brighter where the light runs through
      float e = min(vB.x, min(vB.y, vB.z)), seam = 1.0 - smoothstep(0.0, 0.018, e);
      vec3 c = uDeep * (0.1 + 0.32 * inner + 0.6 * sky) + uRim * (fr * 1.0 + edge * 0.45) + uGlint * (sp * 0.4 + seam * (0.05 + 0.14 * inner));
      float a = clamp(0.5 + 0.35 * fr + 0.08 * inner + 0.2 * sp + 0.1 * seam, 0.0, 0.9);
      gl_FragColor = vec4(c * uBack * uK, a * uBack);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const coreFrag = `uniform float uTime; uniform float uK; uniform vec3 uDeep; varying vec3 vN; varying vec3 vV; varying vec3 vP;
    void main() {
      float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
      float s = -vP.z * 22.0;
      float w = 0.5 + 0.5 * sin(s - uTime * 2.2 + 9.0 * vP.x);
      gl_FragColor = vec4(uDeep * (0.05 + 0.32 * w * w) * pow(ndv, 1.5) * uK, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const veinVert = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vUv = uv; vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
  // the vein: sea-green and moving (canon: "the green vein was moving"); the glow round it is the river seen through ice
  const veinFrag = `uniform float uTime; uniform float uK; uniform vec3 uCol; uniform float uGlow; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main() {
      float ndv = clamp(abs(dot(normalize(vN), normalize(vV))), 0.0, 1.0);
      float x = vUv.x;
      float flow = 0.55 + 0.45 * sin(x * 46.0 - uTime * 3.1) * (0.6 + 0.4 * sin(x * 11.0 - uTime * 1.3));
      vec3 c;
      if (uGlow > 0.5) c = uCol * 0.16 * pow(ndv, 2.0) * (0.7 + 0.5 * flow);
      else c = uCol * (0.6 + 0.5 * flow) * (0.7 + 0.3 * ndv);
      gl_FragColor = vec4(c * uK, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  function facet(geo, j, r) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    const p = geo.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(4) + ',' + p.getY(i).toFixed(4) + ',' + p.getZ(i).toFixed(4);
      if (!seen.has(key)) seen.set(key, [(r() - 0.5) * j, (r() - 0.5) * j, (r() - 0.5) * j]);
      const d = seen.get(key); p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    for (const k of Object.keys(geo.attributes)) if (k !== 'position') geo.deleteAttribute(k);
    geo.computeVertexNormals();
    const b = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) b[i * 3 + (i % 3)] = 1;
    geo.setAttribute('bary', new THREE.BufferAttribute(b, 3));
    return geo;
  }
  // Kaelen's left hand, open and reaching. Canonical frame: wrist at the origin, the forearm back along +z, fingers out
  // along -z, palm down (-y), thumb to +x. k scales the radii (the inner core is the same hand, thinner).
  function glassHandParts(k) {
    const parts = [], sides = 6;
    const tb = (pts, rf, o) => tubeGeo(pts, (s) => { const r = rf(s); return [r[0] * k, r[1] * k]; }, Object.assign({ sides, cap0: 0.7, cap1: 0.8 }, o));
    // the forearm, past the elbow out of the picture; wider than it is deep toward the wrist
    parts.push(tb([V(0.004, -0.012, 0.42), V(0.0, -0.004, 0.2), V(0, 0, 0.0)], (s) => [0.046 - 0.016 * s, 0.038 - 0.016 * s], { step: 0.035, cap0: false, twist: 0.3 }));
    // the palm, a little cupped
    const palm = blob(V(0.0, -0.002, -0.046), V(0.042, 0, 0), V(0, 0.014, 0), V(0, 0, 0.05), { pw: 0.82, nu: 8, nv: 6 });
    { const p = palm.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setY(i, p.getY(i) * k + 0.006 * (x / 0.042) * (x / 0.042) - 0.002); p.setX(i, x * (0.6 + 0.4 * k)); p.setZ(i, -0.046 + (p.getZ(i) + 0.046) * (0.7 + 0.3 * k)); } }
    parts.push(palm);
    // the fingers: index..little; spread wide, reaching, the outer ones curled a little more
    const F = [
      [V(0.028, 0.0, -0.088), 0.21, [0.16, 0.26, 0.2], [0.043, 0.025, 0.02], 0.0116],
      [V(0.009, 0.001, -0.094), 0.05, [0.2, 0.32, 0.22], [0.046, 0.028, 0.021], 0.012],
      [V(-0.011, 0.0, -0.09), -0.13, [0.26, 0.4, 0.26], [0.043, 0.026, 0.02], 0.0113],
      [V(-0.029, -0.002, -0.081), -0.33, [0.32, 0.46, 0.3], [0.034, 0.02, 0.017], 0.0104],
    ];
    for (const [m, spread, curl, lens, fr] of F) {
      let dir = V(Math.sin(spread), 0, -Math.cos(spread)).normalize();
      const lat = V(Math.cos(spread), 0, Math.sin(spread));
      const J = [m.clone().addScaledVector(dir, -0.014), m.clone()];
      let p = m.clone();
      for (let i = 0; i < 3; i++) { dir = dir.clone().applyAxisAngle(lat, -curl[i]); p = p.clone().addScaledVector(dir, lens[i]); J.push(p); }
      parts.push(tb(fillet(J, 0.006), (s) => { const r = fr * (1 - 0.3 * s); return [r, r * 0.88]; }, { step: 0.011, up: V(0, 1, 0) }));
    }
    // the thumb, out from the heel of the hand and reaching with the fingers
    const tj = [V(0.024, -0.006, -0.01), V(0.05, -0.012, -0.042), V(0.066, -0.012, -0.07), V(0.076, -0.009, -0.093)];
    parts.push(tb(fillet(tj, 0.008), (s) => { const r = 0.0135 * (1 - 0.25 * s); return [r, r * 0.86]; }, { step: 0.012, up: V(0, 1, 0) }));
    parts.push(blob(V(0.025, -0.008, -0.03), V(0.016, 0, -0.008), V(0, 0.011 * k, 0), V(0.006, 0, 0.022), { nu: 6, nv: 5 }));
    return parts;
  }
  function glassArm(o) {
    const r = mulberry(1907), group = new THREE.Group(); group.name = 'R11VM:glass-arm';
    const hand = new THREE.Group(); group.add(hand);
    const plain = (list) => list.map((g) => { g = g.index ? g.toNonIndexed() : g; for (const kk of Object.keys(g.attributes)) if (kk !== 'position') g.deleteAttribute(kk); return g; });
    const mg = mergeFn();
    const shellGeo = facet(mg(plain(glassHandParts(1)), false), 0.0045, r);
    const coreGeo = facet(mg(plain(glassHandParts(0.42)), false), 0.003, r);
    const U = { uTime: { value: 0 }, uK: { value: 1 }, uBack: { value: 1 }, uDeep: { value: new THREE.Color(0x12c2d2) }, uRim: { value: new THREE.Color(0x5ff2ec) }, uGlint: { value: new THREE.Color(0xa6f2ff) } };
    const mk = (side, back) => new THREE.ShaderMaterial({ name: 'r11vm:glass', uniforms: Object.assign({}, U, { uBack: { value: back } }), vertexShader: glassVert, fragmentShader: glassFrag,
      transparent: true, depthWrite: false, side, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation });
    const backM = mk(THREE.BackSide, 0.5), frontM = mk(THREE.FrontSide, 1);
    backM.uniforms.uTime = frontM.uniforms.uTime = U.uTime; backM.uniforms.uK = frontM.uniforms.uK = U.uK;
    const coreM = new THREE.ShaderMaterial({ name: 'r11vm:glass-core', uniforms: { uTime: U.uTime, uK: U.uK, uDeep: { value: new THREE.Color(0x6ff0f0) } }, vertexShader: glassVert, fragmentShader: coreFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    // the one vein: up the forearm under the back of it, through the wrist, into the palm toward the middle finger
    const vp = [V(0.012, 0.016, 0.42), V(0.006, 0.019, 0.3), V(0.013, 0.017, 0.2), V(0.003, 0.016, 0.11), V(-0.004, 0.012, 0.03), V(0.002, 0.007, -0.03), V(0.008, 0.005, -0.068), V(0.009, 0.004, -0.088)];
    const curve = new THREE.CatmullRomCurve3(vp, false, 'centripetal');
    const sea = new THREE.Color(0x1fe08a);
    const veinM = new THREE.ShaderMaterial({ name: 'r11vm:vein', uniforms: { uTime: U.uTime, uK: U.uK, uCol: { value: sea }, uGlow: { value: 0 } }, vertexShader: veinVert, fragmentShader: veinFrag });
    veinM.userData.vein = true; veinM.userData.canon = 'the green vein, like a river under ice';
    const glowM = new THREE.ShaderMaterial({ name: 'r11vm:vein-glow', uniforms: { uTime: U.uTime, uK: U.uK, uCol: { value: sea }, uGlow: { value: 1 } }, vertexShader: veinVert, fragmentShader: veinFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const veinGeo = new THREE.TubeGeometry(curve, 64, 0.0028, 8, false);
    { const p = veinGeo.attributes.position, u = veinGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const t = u.getX(i), pt = curve.getPointAt(Math.min(1, t)), kk = 1 - 0.45 * t; p.setXYZ(i, pt.x + (p.getX(i) - pt.x) * kk, pt.y + (p.getY(i) - pt.y) * kk, pt.z + (p.getZ(i) - pt.z) * kk); } veinGeo.computeVertexNormals(); }
    const glowGeo = new THREE.TubeGeometry(curve, 48, 0.0078, 8, false);
    const vein = mesh(veinGeo, veinM, 'vein'); vein.renderOrder = 1;
    const back = mesh(shellGeo, backM, 'glass-back'); back.renderOrder = 2;
    const core = mesh(coreGeo, coreM, 'glass-core'); core.renderOrder = 3;
    const glow = mesh(glowGeo, glowM, 'vein-glow'); glow.renderOrder = 4;
    const front = mesh(shellGeo, frontM, 'glass'); front.renderOrder = 5;
    hand.add(vein, back, core, glow, front);
    if (vmLights(o)) { const cy = new THREE.PointLight(0x5fe8ff, 0.6, 1.4, 2); cy.position.set(0.0, 0.03, -0.06); hand.add(cy); }
    return { group, hand, mats: { glass: frontM, vein: veinM }, U };
  }

  // ======================================================================== placing it in the view
  // the hand's frame (local y up its grip / the hand's back, local z back toward the wrist) turned onto two directions in
  // the eye's space
  function basisQuat(yW, zW) {
    const Y = yW.clone().normalize(), Z = zW.clone().addScaledVector(Y, -zW.dot(Y)).normalize(), X = new V3().crossVectors(Y, Z);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
  }
  // framed like picture 1: the fist low in the right of the view, the blade going up out of the top, its flat toward us
  // and its edge toward the middle; the glass hand low left, reaching in and up
  const POSE = {
    blade: { p: [0.268, -0.134, -0.54], y: [0.1, 1, -0.28], z: [0.3, 0, 1], s: 1 },
    knife: { p: [0.26, -0.11, -0.48], y: [-0.12, 1, -0.6], z: [0.3, 0, 1], s: 1 },
    axe: { p: [0.27, -0.13, -0.52], y: [-0.1, 1, -0.45], z: [0.3, 0, 1], s: 1 },
    maul: { p: [0.27, -0.14, -0.52], y: [-0.45, 0.8, -0.5], z: [0.3, 0.3, 1], s: 1 },
    pole: { p: [0.27, -0.14, -0.5], y: [-0.3, 0.75, -1], z: [0.3, 0.45, 1], s: 1 },
    pistol: { p: [0.19, -0.15, -0.38], y: [0.05, 1, 0.1], z: [0.12, 0, 1], s: 1 },
    crossbow: { p: [0.16, -0.17, -0.4], y: [0.0, 1, 0.1], z: [0.1, 0, 1], s: 1 },
    fists: { p: [0.24, -0.13, -0.48], y: [-0.2, 1, -0.25], z: [0.3, 0, 1], s: 1 },
    arm: { p: [-0.17, -0.125, -0.3], fwd: [0.58, 0.62, -0.53], back: [-0.42, 0.2, 0.88], s: 1 },
  };
  const poseOf = (kind) => kind === 'knife' ? POSE.knife : kind === 'axe' || kind === 'mace' ? POSE.axe : kind === 'maul' ? POSE.maul
    : kind === 'spear' || kind === 'staff' ? POSE.pole : kind === 'pistol' ? POSE.pistol : kind === 'crossbow' ? POSE.crossbow : kind === 'fists' ? POSE.fists : POSE.blade;
  const vmLights = (opts) => (opts && opts.lights != null) ? !!opts.lights : !(typeof window !== 'undefined' && window.R11 && window.R11.vm && window.R11.vm.scene);
  function armQuat(fwd, back) {
    // canonical: fingers -z, the back of the hand +y (so the thumb, +x, falls where it must for a left hand)
    const Zc = V(...fwd).normalize().negate(), Yc = V(...back).normalize();
    Yc.addScaledVector(Zc, -Yc.dot(Zc)).normalize();
    const X = new V3().crossVectors(Yc, Zc);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Yc, Zc));
  }

  function build(kind, opts) {
    const M = makeMats(kind.length * 131 + 17), group = new THREE.Group(); group.name = 'R11VM:' + kind;
    const hand = new THREE.Group(); group.add(hand);
    let w = null;
    switch (kind) {
      case 'sword': w = bladed(M, { len: 0.6, w0: 0.0235, w1: 0.0185, tip: 0.1, t0: 0.0034, t1: 0.0021, bev: 0.42, fw: 0.0058, fd: 0.0014, fEnd: 0.72, guardW: 0.19, guard: 'swept', grip: 0.106, pommel: 'stopper' }); break;
      case 'longsword': w = bladed(M, { len: 0.86, w0: 0.026, w1: 0.017, tip: 0.13, t0: 0.0038, t1: 0.0022, bev: 0.4, fw: 0.0062, fd: 0.0015, fEnd: 0.6, guardW: 0.25, guard: 'straight', grip: 0.2, pommel: 'disc', bigPommel: true }); break;
      case 'knife': w = bladed(M, { len: 0.2, w0: 0.0145, w1: 0.012, tip: 0.07, tipPow: 1.3, t0: 0.003, t1: 0.0016, bev: 0.55, fw: 0, fd: 0, fEnd: 0, guardW: 0.06, guard: 'straight', grip: 0.1, pommel: 'stopper', single: true, handle: 'wood' }); break;
      case 'axe': case 'mace': case 'maul': case 'spear': case 'staff': w = hafted(M, kind); break;
      case 'pistol': w = pistolGeo(M); break;
      case 'crossbow': w = crossbowGeo(M); break;
      case 'fists': w = null; break;
      default: w = bladed(M, { len: 0.56, w0: 0.0225, w1: 0.016, tip: 0.09, t0: 0.0033, t1: 0.002, bev: 0.45, fw: 0.005, fd: 0.0012, fEnd: 0.65, guardW: 0.16, guard: 'straight', grip: 0.1, pommel: 'disc' });
    }
    if (w) hand.add(w);
    for (const m of fistMeshes(M, { gripR: kind === 'maul' ? 0.0205 : kind === 'staff' ? 0.0195 : 0.0172 })) hand.add(m);
    const P = poseOf(kind), base = { p: V(...P.p), q: basisQuat(V(...P.y), V(...P.z)) };
    hand.position.copy(base.p); hand.quaternion.copy(base.q); hand.scale.setScalar(P.s);
    if (vmLights(opts)) {
      const hemi = new THREE.HemisphereLight(0xd9e2e6, 0x4a4036, 0.8); group.add(hemi);
      const key = new THREE.DirectionalLight(0xfff0dc, 1.1); key.position.set(-1, 2, 1); group.add(key);
    }
    // the swing turns the weapon about the fist: CORE writes position/rotation; the group composes them about the grip
    const piv = base.p.clone(), tm = new THREE.Matrix4();
    group.userData.pivot = piv;
    group.updateMatrix = function () {
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.matrix.multiply(tm.makeTranslation(-piv.x, -piv.y, -piv.z));
      this.matrix.premultiply(tm.makeTranslation(piv.x, piv.y, piv.z));
      this.matrixWorldNeedsUpdate = true;
    };
    return { group, hand, base, M };
  }

  function viewmodel(kind, opts) {
    const T = T3(); if (!T) return null;
    THREE = T; V3 = T.Vector3;
    if (!mergeFn()) { warnOnce('no mergeGeometries'); return null; }
    let k = String(kind == null ? 'blade' : kind);
    if (!KINDS.includes(k)) k = ALIAS[k] || kindFor(k);
    let built;
    try {
      if (k === 'glass-arm') {
        built = glassArm(opts);
        const P = POSE.arm; built.base = { p: V(...P.p), q: armQuat(P.fwd, P.back) };
        built.hand.position.copy(built.base.p); built.hand.quaternion.copy(built.base.q);
      } else built = build(k, opts);
    } catch (e) { warnOnce('build ' + k, e); return null; }
    const { group, hand, base } = built;
    const side = k === 'glass-arm' ? -1 : 1, eul = new THREE.Euler(), qq = new THREE.Quaternion();
    let lastWalk = null, amp = 0;
    const api = {
      group, kind: k,
      update(t, walk, F) {
        t = +t || 0; const wv = +walk || 0;
        const moving = lastWalk != null && Math.abs(wv - lastWalk) > 1e-4; lastWalk = wv;
        amp += ((moving ? 1 : 0) - amp) * 0.12;
        // breathing, and the walk's bob (each hand a little out of step with the other)
        const sx = Math.sin(t * 0.9 + (side > 0 ? 1.3 : 0)) * 0.0035, sy = Math.sin(t * 1.3 + (side > 0 ? 0 : 0.7)) * 0.0045;
        const bx = Math.sin(wv) * 0.011 * amp * side, by = -Math.abs(Math.cos(wv)) * 0.015 * amp;
        hand.position.set(base.p.x + sx + bx, base.p.y + sy + by, base.p.z);
        eul.set(Math.sin(t * 0.7) * 0.012 + by * 0.6, sx * 1.5, Math.sin(t * 0.8) * 0.01 * side);
        hand.quaternion.copy(base.q).premultiply(qq.setFromEuler(eul));
        if (built.U) {
          built.U.uTime.value = t;
          // self-lit: the glass keeps its own brightness whatever exposure CORE gives the street (night is exposed up)
          let ex = 1; try { const r = typeof window !== 'undefined' && window.R11 && window.R11.renderer; if (r && r.toneMappingExposure > 0) ex = r.toneMappingExposure; } catch (e) { ex = 1; }
          built.U.uK.value = 1 / ex;
        }
      },
      stats() {
        let draws = 0, tris = 0;
        group.traverse((o) => { if (o.isMesh && o.visible) { draws++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } });
        return { draws, tris: Math.round(tris) };
      },
    };
    return api;
  }

  return { viewmodel, kindFor, kinds: () => KINDS.slice(), version: 1, POSE };
})();
if (typeof window !== 'undefined') window.R11VM = R11VM;
