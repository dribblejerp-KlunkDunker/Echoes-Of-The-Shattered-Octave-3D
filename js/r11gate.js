// ============================================================
//  r11gate — ROADMAP R11 phase 4, team GATE: the Hedge and Oakhaven's North Gate in the realistic look (picture 2,
//  docs/graphics/bench2-gate.jpg).
//
//  CONTRACT. Pushes { id: 'gate', maps(map) -> bool, dress(map, ctx) -> { group, hiddenCells, replaced } } onto
//  window.R11DRESSERS; r11core calls it after R11KIT.dressMap on 'oakhaven' (either build) and 'clearing', and tears the
//  group down with the kit group. Exports R11.benchCams.gate (picture 2's camera) and window.R11GATE (stats, live state).
//
//  CANON (Book One ch. 1, 2, 7, 11, 12; "The Wool Wall"; Lesson Seven; the Digest of the Standing Law):
//    THE HEDGE: blackthorn, bramble and hawthorn in a trench, a man's height of packed wool either side rammed down with
//    posts, thorn again, wool again, felt and old sacking hung from its branches, straw stuffed in its roots, three men
//    deep, a great uneven ring round the town. Grey now; bare thorn, a little dark leaf. Built here: the inner ring of the
//    map's two hedge rings (one cell, 3.03 m: three men deep) is the Hedge; the outer ring is the land outside it. Packed
//    wool (a lumpy grey-white wall to about a man's height) with posts showing where it was rammed, thorn growing up
//    through and over it to 3-3.9 m (thick grey stems, instanced-style merged sprays, a little dark leaf), wool caught in
//    the thorn, felt and sacking hung over the top, straw at the roots. Behind the old cooperage (lyra51's stone) the
//    thorn is thinner and the wadding rotted (ch. 1).
//    THE NORTH GATE: "a gap in the thorn with a gate across it, a real gate, oak and iron, always locked" (ch. 1); the
//    gatepost where the town leaves the coin for Kaelen's charcoal (ch. 2); the mounting-block by the gatepost (ch. 11,
//    12); Old Harrow the gate-warden and his keys (the game's NPC); writs posted on the thorn at the gate, which the thorn
//    has kept (the Digest). The Last Sheaf hangs on the Hedge-gate only while festivals12 has hung it (its own
//    'p12_sheaf' / 'p12_sheaf_fig' entities at the gate: R11 draws the sheaf in 3D and skips their billboards).
//    [PROPOSED] (army/R11-P4/GATE/TEXT.md): the leaves' form (plank leaves with ledges and a brace, iron strap hinges with
//    arrow ends, a bar in staples, a lock plate), the lintel and knee braces over the gateway, the gate standing at the
//    town end of the gap and opening outward into it, the coin ledge on the gatepost, the stone of the mounting-block,
//    Harrow's stool. The leaves stand open once the game's flag gate_open is set (Harrow opened it on Lyra's word),
//    barred and shut before.
//  SCALE. Built in metres inside a group scaled by R11.M (0.33 units per metre; a cell is 3.03 m; a game height unit is
//  ZK / M = 1.875 m), three.x = map x, three.z = map y.
//  DRAWS. One merged mesh per material: thorn body and stems (bark scan), packed wool, sprays/straw/writs (one alpha
//  atlas), felt and sacking, timber (posts, gate, stool), iron (straps, staples, lock, coins), stone (the mounting-
//  block) = 7, and the Last Sheaf (the atlas again) while it hangs = 8. Densities per tier (Phone thins everything).
// ============================================================
'use strict';

const R11GATE = (function () {
  const PI = Math.PI, TAU = PI * 2;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11gate: ' + k + ' failed', e); } catch (x) { /* none */ } } };
  const ZKf = () => { try { if (typeof R3D !== 'undefined' && +R3D.ZK > 0) return +R3D.ZK; } catch (e) { /* none */ } return 0.61875; };
  const UPM = () => { try { const m = typeof window !== 'undefined' && window.R11 && +window.R11.M; if (m > 0) return m; } catch (e) { /* none */ } return 0.88 * ZKf() / 1.65; };
  const T3 = (ctx) => (ctx && ctx.THREE) || (window.R11 && window.R11.THREE) || (window.R11THREE && window.R11THREE.THREE) || null;

  // ---- per tier: spacing of the hedge's grids (m) and density factors
  const TIERS = {
    ultra: { du: 0.3, dv: 0.27, spray: 1, tuft: 1, stem: 1, straw: 1, radial: 5, seg: 8, shadow: true, ico: 2 },
    high: { du: 0.36, dv: 0.32, spray: 0.75, tuft: 0.8, stem: 0.8, straw: 0.8, radial: 5, seg: 7, shadow: true, ico: 1 },
    phone: { du: 0.55, dv: 0.45, spray: 0.4, tuft: 0.45, stem: 0.4, straw: 0.5, radial: 4, seg: 5, shadow: false, ico: 1 },
  };
  const tierOf = (n) => (TIERS[n] ? n : 'high');

  // ---- small maths
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function h3(x, y, z) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177) | 0; h = Math.imul(h ^ h >>> 13, 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vn(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const a = lerp(lerp(h3(xi, yi, zi), h3(xi + 1, yi, zi), u), lerp(h3(xi, yi + 1, zi), h3(xi + 1, yi + 1, zi), u), v);
    const b = lerp(lerp(h3(xi, yi, zi + 1), h3(xi + 1, yi, zi + 1), u), lerp(h3(xi, yi + 1, zi + 1), h3(xi + 1, yi + 1, zi + 1), u), v);
    return lerp(a, b, w);
  }
  const fbm = (x, y, z) => vn(x, y, z) * 0.55 + vn(x * 2.13 + 5.1, y * 2.13, z * 2.13) * 0.3 + vn(x * 4.37, y * 4.37 + 3.3, z * 4.37) * 0.15;

  // ======================================================================== geometry accumulator (one per material)
  function Acc() { return { p: [], n: [], uv: [], c: [], i: [], nv: 0 }; }
  function accVert(A, x, y, z, nx, ny, nz, u, v, r, g, b) { A.p.push(x, y, z); A.n.push(nx, ny, nz); A.uv.push(u, v); A.c.push(r, g, b); return A.nv++; }
  // a grid of rows x cols points P[j][i] = [x, y, z], with colours and uvs; normals from the grid itself, facing `face`
  // (the cross of the column and row directions, flipped when `flip`)
  function accGrid(A, P, C, U, flip) {
    const rows = P.length, cols = P[0].length, base = A.nv;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const p = P[j][i], pl = P[j][Math.max(0, i - 1)], pr = P[j][Math.min(cols - 1, i + 1)], pd = P[Math.max(0, j - 1)][i], pu = P[Math.min(rows - 1, j + 1)][i];
      const ax = pr[0] - pl[0], ay = pr[1] - pl[1], az = pr[2] - pl[2], bx = pu[0] - pd[0], by = pu[1] - pd[1], bz = pu[2] - pd[2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
      if (flip) { nx = -nx; ny = -ny; nz = -nz; }
      const c = C[j][i], uv = U[j][i];
      accVert(A, p[0], p[1], p[2], nx / l, ny / l, nz / l, uv[0], uv[1], c[0], c[1], c[2]);
    }
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = base + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      if (flip) A.i.push(a, c, b, b, c, d); else A.i.push(a, b, c, b, d, c);
    }
  }
  // a template geometry (indexed or not) through a Matrix4, one colour (or a function of the local position)
  const _v = { x: 0, y: 0, z: 0 };
  function accGeo(A, THREE, geo, m4, col, uvScale) {
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, idx = geo.index, base = A.nv;
    const e = m4.elements, nm = new THREE.Matrix3().getNormalMatrix(m4).elements, us = uvScale || [1, 1];
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      let nx = 0, ny = 1, nz = 0;
      if (nor) { const a = nor.getX(k), b = nor.getY(k), c = nor.getZ(k); nx = nm[0] * a + nm[3] * b + nm[6] * c; ny = nm[1] * a + nm[4] * b + nm[7] * c; nz = nm[2] * a + nm[5] * b + nm[8] * c; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; }
      const cc = typeof col === 'function' ? (_v.x = x, _v.y = y, _v.z = z, col(_v)) : col;
      accVert(A, wx, wy, wz, nx, ny, nz, uv ? uv.getX(k) * us[0] : 0, uv ? uv.getY(k) * us[1] : 0, cc[0], cc[1], cc[2]);
    }
    if (idx) for (let k = 0; k < idx.count; k++) A.i.push(base + idx.getX(k));
    else for (let k = 0; k < pos.count; k++) A.i.push(base + k);
  }
  // a box of w x h x d metres, its uvs in metres / rep, the grain along y (posts, planks) or x (beams)
  function accBox(A, THREE, w, h, d, m4, col, rep, grainX) {
    const g = boxGeo(THREE, w, h, d, rep || 1.2, grainX);
    accGeo(A, THREE, g, m4, col);
  }
  const boxCache = new Map();
  function boxGeo(THREE, w, h, d, rep, grainX) {
    const k = [w, h, d, rep, grainX ? 1 : 0].map((v) => +(+v).toFixed(3)).join(',');
    let g = boxCache.get(k); if (g) return g;
    g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
      // face dims: x faces span (d, h), y faces (w, d), z faces (w, h)
      let fu, fv; if (ax > 0.5) { fu = d; fv = h; } else if (ay > 0.5) { fu = w; fv = d; } else { fu = w; fv = h; }
      let u = uv.getX(i) * fu / rep, v = uv.getY(i) * fv / rep;
      if (grainX && ay < 0.5) { const t = u; u = v; v = t; }
      uv.setXY(i, u + (w * 7.3 + h * 3.1) % 1, v + (d * 5.7) % 1);
    }
    if (boxCache.size > 400) boxCache.clear();
    boxCache.set(k, g);
    return g;
  }
  function accTube(A, pts, radii, radial, col, uvRep) {
    // pts: [[x,y,z]...], a ring of `radial` around each, uv u around, v along (metres / uvRep)
    const n = pts.length, base = A.nv; let along = 0;
    for (let k = 0; k < n; k++) {
      const p = pts[k], q = pts[Math.min(n - 1, k + 1)], o = pts[Math.max(0, k - 1)];
      let tx = q[0] - o[0], ty = q[1] - o[1], tz = q[2] - o[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      // a side vector not parallel to the tangent
      let sx = -tz, sy = 0, sz = tx; if (Math.abs(ty) > 0.9) { sx = 1; sy = 0; sz = 0; }
      let sl = Math.hypot(sx, sy, sz) || 1; sx /= sl; sy /= sl; sz /= sl;
      const bx = ty * sz - tz * sy, by = tz * sx - tx * sz, bz = tx * sy - ty * sx;
      if (k > 0) along += Math.hypot(p[0] - o[0], p[1] - o[1], p[2] - o[2]);
      const r = radii[k], cc = typeof col === 'function' ? col(k / (n - 1)) : col;
      for (let j = 0; j <= radial; j++) {
        const a = j / radial * TAU, ca = Math.cos(a), sa = Math.sin(a);
        const nx = sx * ca + bx * sa, ny = sy * ca + by * sa, nz = sz * ca + bz * sa;
        accVert(A, p[0] + nx * r, p[1] + ny * r, p[2] + nz * r, nx, ny, nz, j / radial, along / uvRep, cc[0], cc[1], cc[2]);
      }
    }
    for (let k = 0; k < n - 1; k++) for (let j = 0; j < radial; j++) {
      const a = base + k * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
      A.i.push(a, c, b, b, c, d);
    }
  }
  // a card (quad) centred at c, its right and up half-vectors, atlas rect [u0, v0, u1, v1], normal = right x up
  function accCard(A, c, R, U, rect, col, flipU) {
    const nx = R[1] * U[2] - R[2] * U[1], ny = R[2] * U[0] - R[0] * U[2], nz = R[0] * U[1] - R[1] * U[0], l = Math.hypot(nx, ny, nz) || 1;
    const [u0, v0, u1, v1] = rect, ua = flipU ? u1 : u0, ub = flipU ? u0 : u1, base = A.nv;
    // the lower edge a little darker (in the thorn's shade), the upper edge lit
    const lo = [col[0] * 0.72, col[1] * 0.72, col[2] * 0.72];
    accVert(A, c[0] - R[0] - U[0], c[1] - R[1] - U[1], c[2] - R[2] - U[2], nx / l, ny / l, nz / l, ua, v0, lo[0], lo[1], lo[2]);
    accVert(A, c[0] + R[0] - U[0], c[1] + R[1] - U[1], c[2] + R[2] - U[2], nx / l, ny / l, nz / l, ub, v0, lo[0], lo[1], lo[2]);
    accVert(A, c[0] + R[0] + U[0], c[1] + R[1] + U[1], c[2] + R[2] + U[2], nx / l, ny / l, nz / l, ub, v1, col[0], col[1], col[2]);
    accVert(A, c[0] - R[0] + U[0], c[1] - R[1] + U[1], c[2] - R[2] + U[2], nx / l, ny / l, nz / l, ua, v1, col[0], col[1], col[2]);
    A.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  function accMesh(THREE, A, material, name) {
    if (!A.nv) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(A.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(A.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(A.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(A.c, 3));
    g.setIndex(A.nv > 65535 ? new THREE.Uint32BufferAttribute(A.i, 1) : new THREE.Uint16BufferAttribute(A.i, 1));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material); m.name = name; m.matrixAutoUpdate = false; m.updateMatrix();
    return m;
  }
  function accJoin(a, b) { const o = Acc(); for (const s of [a, b]) { const base = o.nv; o.p.push(...s.p); o.n.push(...s.n); o.uv.push(...s.uv); o.c.push(...s.c); for (const k of s.i) o.i.push(k + base); o.nv += s.nv; } return o; }

  // ======================================================================== textures (canvas, drawn once, seeded)
  const TEX = {};
  // the atlas: [x, y, w, h] in canvas pixels of a 1024 square
  const AT = { thornA: [0, 0, 512, 512], thornB: [512, 0, 512, 512], straw: [0, 512, 512, 256], strawB: [0, 768, 512, 256], sheaf: [512, 512, 256, 512], writ: [768, 512, 256, 256], figure: [768, 768, 256, 256] };
  const rectUV = (r) => [r[0] / 1024, 1 - (r[1] + r[3]) / 1024, (r[0] + r[2]) / 1024, 1 - r[1] / 1024];
  function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
  function drawThorn(g, R, rect, leafy) {
    const [x0, y0, w, h] = rect, rnd = mulberry(R);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    g.lineCap = 'round'; g.lineJoin = 'round';
    const bark = () => { const k = 66 + rnd() * 52; return 'rgb(' + (k + 8 | 0) + ',' + (k + 2 | 0) + ',' + (k - 6 | 0) + ')'; };
    const leafCols = ['#2b3320', '#343d24', '#3d4529', '#454630', '#4a3c26', '#2f3a22'];
    const branch = (x, y, a, len, wd, depth) => {
      const segs = 4, pts = [[x, y]]; let cx = x, cy = y, ca = a;
      for (let i = 0; i < segs; i++) { ca += (rnd() - 0.5) * 0.55; cx += Math.cos(ca) * len / segs; cy += Math.sin(ca) * len / segs; pts.push([cx, cy]); }
      const col = bark();
      for (let i = 0; i < segs; i++) {
        g.strokeStyle = col; g.lineWidth = Math.max(1.4, wd * (1 - i / segs * 0.5));
        g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
        // a lit edge
        if (wd > 3) { g.strokeStyle = 'rgba(150,144,132,0.35)'; g.lineWidth = Math.max(1, wd * 0.25); g.beginPath(); g.moveTo(pts[i][0] - 1, pts[i][1] - 1); g.lineTo(pts[i + 1][0] - 1, pts[i + 1][1] - 1); g.stroke(); }
        // thorns: short spikes either side
        const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], dl = Math.hypot(dx, dy) || 1, nThorn = 1 + (rnd() * 2 | 0);
        for (let t = 0; t < nThorn; t++) {
          const f = rnd(), px = pts[i][0] + dx * f, py = pts[i][1] + dy * f, sd = rnd() < 0.5 ? 1 : -1, ang = Math.atan2(dy, dx) + sd * (0.9 + rnd() * 0.4), L = 4 + wd * 1.3 + rnd() * 4;
          g.strokeStyle = col; g.lineWidth = Math.max(1, wd * 0.35); g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(ang) * L, py + Math.sin(ang) * L); g.stroke();
        }
      }
      // a little dark leaf on the outer twigs; wool caught here and there
      if (depth >= 2) for (let i = 1; i <= segs; i++) {
        if (rnd() < (leafy ? 0.75 : 0.32)) {
          const p = pts[i], n = 1 + (rnd() * (leafy ? 4 : 2) | 0);
          for (let k = 0; k < n; k++) {
            g.fillStyle = leafCols[rnd() * leafCols.length | 0];
            g.save(); g.translate(p[0] + (rnd() - 0.5) * 10, p[1] + (rnd() - 0.5) * 10); g.rotate(rnd() * TAU);
            g.beginPath(); g.ellipse(0, 0, 5 + rnd() * 5, 2.4 + rnd() * 2, 0, 0, TAU); g.fill(); g.restore();
          }
        }
        if (false) { const p = pts[i]; for (let k = 0; k < 9; k++) { g.fillStyle = 'rgba(' + (160 + rnd() * 24 | 0) + ',' + (156 + rnd() * 22 | 0) + ',' + (146 + rnd() * 20 | 0) + ',0.95)'; g.beginPath(); g.arc(p[0] + (rnd() - 0.5) * 18, p[1] + (rnd() - 0.5) * 14, 3 + rnd() * 5, 0, TAU); g.fill(); } }
      }
      if (depth < 4 && len > 18) {
        const nb = 2 + (rnd() * 2 | 0);
        for (let b = 0; b < nb; b++) {
          const k = 1 + (rnd() * segs | 0), p = pts[Math.min(segs, k)], sd = rnd() < 0.5 ? 1 : -1;
          branch(p[0], p[1], a + sd * (0.35 + rnd() * 0.75), len * (0.55 + rnd() * 0.2), wd * 0.6, depth + 1);
        }
      }
    };
    const nb = 4 + (rnd() * 2 | 0);
    for (let b = 0; b < nb; b++) branch(x0 + w * (0.25 + rnd() * 0.5), y0 + h - 6, -PI / 2 + (rnd() - 0.5) * 1.3, h * (0.42 + rnd() * 0.2), 7 + rnd() * 4, 0);
    g.restore();
  }
  function drawStraw(g, R, rect, pale) {
    const [x0, y0, w, h] = rect, rnd = mulberry(R);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const bx = x0 + w * (0.08 + rnd() * 0.84), by = y0 + h - 2, a = -PI / 2 + (rnd() - 0.5) * 2.2, L = h * (0.25 + rnd() * 0.7);
      const k = pale ? 120 + rnd() * 50 : 100 + rnd() * 60;
      g.strokeStyle = 'rgb(' + (k + 22 | 0) + ',' + (k + 8 | 0) + ',' + (k * 0.62 | 0) + ')'; g.lineWidth = 1.6 + rnd() * 1.8;
      const mx = bx + Math.cos(a) * L * 0.5 + (rnd() - 0.5) * 12, my = by + Math.sin(a) * L * 0.5;
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(mx, my, bx + Math.cos(a) * L, by + Math.sin(a) * L * (0.6 + rnd() * 0.4)); g.stroke();
    }
    g.restore();
  }
  function drawSheaf(g, rect) {
    const [x0, y0, w, h] = rect, rnd = mulberry(4417);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.lineCap = 'round';
    const cx = x0 + w / 2, band = y0 + h * 0.56;
    for (let i = 0; i < 170; i++) {
      const sx = cx + (rnd() - 0.5) * w * 0.3, top = y0 + 30 + rnd() * 60, bot = y0 + h - 6 - rnd() * 30;
      const spread = (rnd() - 0.5) * w * 0.75, k = 150 + rnd() * 50;
      g.strokeStyle = 'rgb(' + (k + 20 | 0) + ',' + (k * 0.8 | 0) + ',' + (k * 0.42 | 0) + ')'; g.lineWidth = 1.8 + rnd() * 1.4;
      g.beginPath(); g.moveTo(cx + spread * 0.9, top + 30); g.quadraticCurveTo(sx, band, cx + spread * 0.5, bot); g.stroke();
      if (rnd() < 0.55) { g.fillStyle = 'rgb(' + (k * 0.95 | 0) + ',' + (k * 0.72 | 0) + ',' + (k * 0.36 | 0) + ')'; g.save(); g.translate(cx + spread * 0.92, top + 20); g.rotate(spread * 0.004); g.beginPath(); g.ellipse(0, 0, 3.2, 14 + rnd() * 6, 0, 0, TAU); g.fill(); g.restore(); }
    }
    g.fillStyle = '#6e5228'; g.fillRect(cx - w * 0.17, band - 7, w * 0.34, 14);
    g.strokeStyle = '#4e3a1c'; g.lineWidth = 2; for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(cx + k * 8 - 4, band - 7); g.lineTo(cx + k * 8 + 4, band + 7); g.stroke(); }
    g.restore();
  }
  function drawFigure(g, rect) {
    const [x0, y0, w, h] = rect, rnd = mulberry(9001), cx = x0 + w / 2;
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.lineCap = 'round';
    const col = () => { const k = 150 + rnd() * 45; return 'rgb(' + (k + 18 | 0) + ',' + (k * 0.8 | 0) + ',' + (k * 0.42 | 0) + ')'; };
    for (let i = 0; i < 90; i++) { const t = rnd(); g.strokeStyle = col(); g.lineWidth = 2; g.beginPath(); g.moveTo(cx + (rnd() - 0.5) * 14, y0 + 70); g.lineTo(cx + (t - 0.5) * w * 0.8, y0 + h - 8); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.strokeStyle = col(); g.lineWidth = 2.4; g.beginPath(); g.moveTo(cx - w * 0.36, y0 + 92 + (rnd() - 0.5) * 8); g.lineTo(cx + w * 0.36, y0 + 92 + (rnd() - 0.5) * 8); g.stroke(); }
    for (let i = 0; i < 40; i++) { const a = rnd() * TAU; g.strokeStyle = col(); g.lineWidth = 2.2; g.beginPath(); g.arc(cx, y0 + 42, 18 + rnd() * 6, a, a + 1.4); g.stroke(); }
    g.fillStyle = '#5a4220'; g.fillRect(cx - 18, y0 + 104, 36, 7); g.fillRect(cx - 6, y0 + 64, 12, 6);
    g.restore();
  }
  function drawWrit(g, rect) {
    const [x0, y0, w, h] = rect, rnd = mulberry(1417);
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    // a sheet, weathered, a torn corner
    const px = x0 + 26, py = y0 + 10, pw = w - 52, ph = h - 20;
    g.beginPath(); g.moveTo(px, py); for (let i = 1; i <= 10; i++) g.lineTo(px + pw * i / 10, py + (rnd() - 0.5) * 3);
    g.lineTo(px + pw + (rnd() - 0.5) * 3, py + ph * 0.8); g.lineTo(px + pw - 22, py + ph); for (let i = 9; i >= 0; i--) g.lineTo(px + pw * i / 10 * 0.9, py + ph + (rnd() - 0.5) * 4);
    g.closePath(); g.fillStyle = '#c4baa2'; g.fill();
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(96,84,62,' + (0.04 + rnd() * 0.08) + ')'; g.fillRect(px + rnd() * pw, py + rnd() * ph * 0.4, 2 + rnd() * 4, ph * (0.3 + rnd() * 0.6)); }
    g.fillStyle = 'rgba(40,34,28,0.85)'; g.fillRect(px + pw * 0.2, py + 16, pw * 0.6, 6);
    for (let r = 0; r < 12; r++) { let x = px + 14; const y = py + 36 + r * 13; while (x < px + pw - 18) { const l = 6 + rnd() * 22; if (x + l > px + pw - 14) break; g.fillStyle = 'rgba(52,44,36,' + (0.55 + rnd() * 0.3) + ')'; g.fillRect(x, y, l, 2.4); x += l + 4 + rnd() * 3; } }
    g.fillStyle = '#5e2a2a'; g.beginPath(); g.arc(px + pw * 0.72, py + ph - 26, 13, 0, TAU); g.fill();
    g.fillStyle = '#20201c'; g.fillRect(px + pw * 0.72 - 3, py + ph - 14, 6, 26);
    g.restore();
  }
  function atlasTex(THREE) {
    if (TEX.atlas) return TEX.atlas;
    const c = canvas(1024), g = c.getContext('2d');
    drawThorn(g, 11, AT.thornA, false); drawThorn(g, 23, AT.thornB, true);
    drawStraw(g, 31, AT.straw, true); drawStraw(g, 37, AT.strawB, false);
    drawSheaf(g, AT.sheaf); drawWrit(g, AT.writ); drawFigure(g, AT.figure);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
    TEX.atlas = t; return t;
  }
  function woolTex(THREE) {
    if (TEX.wool) return TEX.wool;
    const N = 512, c = canvas(N), g = c.getContext('2d'), rnd = mulberry(77);
    g.fillStyle = '#b4ada0'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 60; i++) { const x = rnd() * N, y = rnd() * N, r = 20 + rnd() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r); const dk = rnd() < 0.5; gr.addColorStop(0, dk ? 'rgba(110,102,88,0.35)' : 'rgba(214,208,196,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); } }
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {
      const x = rnd() * N, y = rnd() * N, r = 4 + rnd() * 10, a = rnd() * TAU, light = rnd() < 0.55;
      g.strokeStyle = light ? 'rgba(226,221,210,' + (0.25 + rnd() * 0.3) + ')' : 'rgba(96,90,78,' + (0.2 + rnd() * 0.25) + ')'; g.lineWidth = 0.8 + rnd() * 1.4;
      for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { if ((ox && Math.abs(x + ox - N / 2) > N / 2 + 14) || (oy && Math.abs(y + oy - N / 2) > N / 2 + 14)) continue; g.beginPath(); g.arc(x + ox, y + oy, r, a, a + 1.2 + rnd()); g.stroke(); }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    TEX.wool = t; return t;
  }
  function clothTex(THREE) {
    if (TEX.cloth) return TEX.cloth;
    const N = 512, c = canvas(N), g = c.getContext('2d'), rnd = mulberry(91);
    // left half: old sacking (hessian), right half: felt
    g.fillStyle = '#6a5e4c'; g.fillRect(0, 0, N / 2, N);
    for (let y = 0; y < N; y += 5) { g.fillStyle = 'rgba(' + (120 + rnd() * 40 | 0) + ',' + (104 + rnd() * 34 | 0) + ',' + (80 + rnd() * 26 | 0) + ',0.55)'; g.fillRect(0, y, N / 2, 2.4); }
    for (let x = 0; x < N / 2; x += 5) { g.fillStyle = 'rgba(' + (60 + rnd() * 30 | 0) + ',' + (52 + rnd() * 24 | 0) + ',' + (40 + rnd() * 20 | 0) + ',0.45)'; g.fillRect(x, 0, 2, N); }
    for (let i = 0; i < 30; i++) { const x = rnd() * N / 2, y = rnd() * N, r = 10 + rnd() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,34,26,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.fillStyle = '#4a4641'; g.fillRect(N / 2, 0, N / 2, N);
    for (let i = 0; i < 2600; i++) { const x = N / 2 + rnd() * N / 2, y = rnd() * N, k = 52 + rnd() * 36; g.fillStyle = 'rgba(' + (k | 0) + ',' + (k * 0.96 | 0) + ',' + (k * 0.9 | 0) + ',0.5)'; g.fillRect(x, y, 2 + rnd() * 5, 2 + rnd() * 5); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    TEX.cloth = t; return t;
  }

  // ======================================================================== materials (made once, shared across maps)
  let MAT = null;
  function mats(THREE, ctx) {
    if (MAT) return MAT;
    const shared = (m) => { m.userData.r11shared = true; return m; };
    const scan = (name, o) => {
      let base = null;
      try { if (ctx && typeof ctx.mat === 'function') base = ctx.mat(name, o); } catch (e) { warnOnce('ctx.mat', e); }
      if (!base) base = new THREE.MeshStandardMaterial({ color: o.color || 0x888888, roughness: 0.9, metalness: 0 });
      const m = base.clone(); m.vertexColors = true; return shared(m);
    };
    MAT = {
      bark: scan('bark_brown_02', { color: 0xb4ada4, ns: 1.5, vc: true }),
      wood: scan('medieval_wood', { color: 0xc4bcb0, vc: true }),
      stone: scan('medieval_blocks_02', { color: 0xc8c0b4, vc: true }),
      wool: shared(new THREE.MeshStandardMaterial({ map: woolTex(THREE), bumpMap: woolTex(THREE), bumpScale: 2.2, roughness: 1, metalness: 0, vertexColors: true })),
      card: shared(new THREE.MeshStandardMaterial({ map: atlasTex(THREE), alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.92, metalness: 0, vertexColors: true })),
      cloth: shared(new THREE.MeshStandardMaterial({ map: clothTex(THREE), side: THREE.DoubleSide, roughness: 1, metalness: 0, vertexColors: true })),
      iron: shared(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0.78, vertexColors: true })),
    };
    MAT.bark.side = THREE.DoubleSide;
    // the alpha cards cast nothing (their shadow would be a box); the thorn body and the wool do
    return MAT;
  }

  // ======================================================================== the map's hedge
  const isBlockCell = (c) => !!(c && !c.door && (c.top == null || c.top >= 0.9));
  function spec(map) {
    if (!map || !map.cells) return null;
    const W = map.w, H = map.h;
    const ring = (x, y) => Math.min(x, y, W - 1 - x, H - 1 - y);
    const hedge = new Set(), outer = new Set();
    let gate = null;
    if (map.id === 'oakhaven') {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ci = y * W + x, c = map.cells[ci], r = ring(x, y);
        if (r === 0) { if (c) outer.add(ci); continue; }
        if (c && c.tex === 't_hedge' && !c.door) hedge.add(ci);
        if (c && c.door && c.portal && c.portal.map === 'clearing' && r === 0) outer.add(ci);
      }
      // the North Gate: its door in the outer ring, the gap through the Hedge the cell inside it
      for (let x = 0; x < W; x++) { const c = map.cells[x]; if (c && c.door && c.portal && c.portal.map === 'clearing') { gate = { px: x, py: 1, door: x, town: true, canOpen: true }; break; } }
      if (gate && map.cells[gate.py * W + gate.px]) gate = null;   // the Greening's hedge has closed over the gap
    } else if (map.id === 'clearing') {
      const y = H - 1;
      for (let x = 0; x < W; x++) { const ci = y * W + x, c = map.cells[ci]; if (c && c.tex === 't_hedge' && !c.door) hedge.add(ci); if (c && c.door && c.portal && c.portal.map === 'oakhaven') gate = { px: x, py: y, door: ci, town: false, canOpen: false }; }
    } else return null;
    if (!hedge.size) return null;
    const greening = /Greening/i.test(map.name || '');
    // lyra51's stone (Book One ch. 1): behind the old cooperage the thorn is thinner and the wadding rotted
    let thin = null;
    if (map.id === 'oakhaven') { try { const st = (typeof LYRA51 !== 'undefined' && LYRA51.STONE) || { x: 67.25, y: 40.5 }; thin = { x: st.x, y: st.y }; } catch (e) { thin = { x: 67.25, y: 40.5 }; } }
    return { W, H, hedge, outer, gate, greening, thin, ring };
  }
  function maps(map) { return !!spec(map); }

  // the faces of the Hedge that something can see: toward an open cell (in), or, near the gate, toward the land outside
  function faces(map, S, C) {
    const { W, H, hedge, outer, gate } = S, out = [];
    const open = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const ci = y * W + x; if (hedge.has(ci) || outer.has(ci)) return false; const c = map.cells[ci]; return !isBlockCell(c); };
    const outside = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) || outer.has(y * W + x);
    const nearGate = (x, y) => gate && Math.abs(x - gate.px) <= 4 && Math.abs(y - gate.py) <= 2;
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const ci of hedge) {
      const x = ci % W, y = (ci / W) | 0;
      for (const [dx, dy] of D) {
        const nx = x + dx, ny = y + dy;
        let kind = null;
        if (open(nx, ny)) kind = 'in'; else if (outside(nx, ny) && nearGate(x, y)) kind = 'out';
        if (!kind) continue;
        // the edge's midpoint (cell coords), the normal into the open cell
        const mx = x + 0.5 + dx * 0.5, my = y + 0.5 + dy * 0.5;
        out.push({ mx, my, nx: dx, ny: dy, kind, line: dx ? mx : my, at: dx ? my : mx });
      }
    }
    // merge collinear neighbours into runs (continuous noise, posts spaced along a run)
    const key = (f) => f.nx + ',' + f.ny + ',' + f.line + ',' + f.kind, groups = new Map();
    for (const f of out) { const k = key(f); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
    const runs = [];
    for (const list of groups.values()) {
      list.sort((a, b) => a.at - b.at);
      let cur = null;
      for (const f of list) {
        if (cur && Math.abs(f.at - cur.at1) < 1.01 && Math.abs(f.at - cur.at1 - 1) < 0.01) { cur.at1 = f.at; continue; }
        cur = { nx: f.nx, ny: f.ny, line: f.line, kind: f.kind, at0: f.at, at1: f.at }; runs.push(cur);
      }
    }
    // to metres: A (start), T (along, T = (nz, -nx) so that T x up = N), length
    for (const r of runs) {
      const N = [r.nx, r.ny], T = [r.ny, -r.nx];
      const a0 = r.at0 - 0.5, a1 = r.at1 + 0.5;
      const P0 = r.nx ? [r.line, a0] : [a0, r.line], P1 = r.nx ? [r.line, a1] : [a1, r.line];
      // start where T points from
      const dot0 = P0[0] * T[0] + P0[1] * T[1], dot1 = P1[0] * T[0] + P1[1] * T[1];
      const A = dot0 <= dot1 ? P0 : P1;
      r.A = [A[0] * C, A[1] * C]; r.T = T; r.N = N; r.L = (a1 - a0) * C;
    }
    return runs;
  }

  // ======================================================================== the hedge's shape (metres, world)
  function shaper(map, S, C, WALLM) {
    const gate = S.gate, thin = S.thin;
    const gx = gate ? (gate.px + 0.5) * C : 0, gz = gate ? (gate.py + 0.5) * C : 0;
    const gAt = (x, z) => { try { return (map.groundAt ? map.groundAt(x / C, z / C) : 0) * WALLM; } catch (e) { return 0; } };
    const thinW = (x, z) => thin ? 1 - sstep(Math.hypot(x - thin.x * C, z - thin.y * C), 2.5, 6.5) : 0;
    const gateW = (x, z) => gate ? 1 - sstep(Math.hypot(x - gx, (z - gz) * 0.8), 2.2, 4.5) : 0;
    // the top of the thorn above the ground (2.9-3.9 m; up to the lintel by the gate; low where it is thin)
    const top = (x, z) => {
      let t = 3.32 + (fbm(x * 0.21, 1.7, z * 0.21) - 0.5) * 1.1 + (vn(x * 1.1, 4.2, z * 1.1) - 0.5) * 0.32;
      t = lerp(t, Math.max(t, 3.45), gateW(x, z));
      return lerp(t, 2.55 + (vn(x * 0.9, 8.1, z * 0.9) - 0.5) * 0.4, thinW(x, z));
    };
    // the packed wool: a man's height, give or take
    const woolTop = (x, z) => lerp(1.72 + (fbm(x * 0.45, 11.3, z * 0.45) - 0.5) * 0.7 + (vn(x * 2.2, 6.6, z * 2.2) - 0.5) * 0.35, 1.25, thinW(x, z) * 0.7);
    // how far the wool stands proud of the hedge's line at a point (lumps of ~0.5 m, rammed)
    const woolOut = (x, h, z) => { const f0 = fbm(x * 2.3, h * 2.7 + 3.1, z * 2.3), f = sstep(f0, 0.3, 0.72); return { b: 0.05 + 0.3 * f + 0.08 * vn(x * 0.45, h * 0.3, z * 0.45), f }; };
    return { gAt, thinW, gateW, top, woolTop, woolOut, gx, gz };
  }

  // ======================================================================== build the Hedge
  function buildHedge(THREE, map, S, ctx, tierName, out) {
    const T = TIERS[tierName], C = 1 / UPM(), WALLM = ZKf() / UPM();
    const sh = shaper(map, S, C, WALLM), M = mats(THREE, ctx), rnd = mulberry(map.w * 977 + map.h * 13 + 5);
    const bark = Acc(), wool = Acc(), card = Acc(), cloth = Acc(), wood = Acc(), iron = Acc(), stone = Acc();
    const runs = faces(map, S, C);
    const gate = S.gate, gx0 = gate ? gate.px * C : 0, gx1 = gate ? (gate.px + 1) * C : 0, gz = sh.gz;
    const inGateFrame = (x, z) => gate && x > gx0 - 0.5 && x < gx1 + 0.5 && Math.abs(z - gz) < 0.6;
    const R = (a, b) => a + (b - a) * rnd();
    const RT = { thornA: rectUV(AT.thornA), thornB: rectUV(AT.thornB), straw: rectUV(AT.straw), strawB: rectUV(AT.strawB), writ: rectUV(AT.writ) };
    const ico = (d) => { const k = 'ico' + d; if (!TEX[k]) { const add = window.R11THREE && window.R11THREE.mergeVertices; let g = new THREE.IcosahedronGeometry(1, d); g.deleteAttribute('uv'); g.deleteAttribute('normal'); if (add) g = add(g); TEX[k] = g; } return TEX[k]; };
    const greenK = S.greening ? 1 : 0;
    let nTuft = 0, nCard = 0, nStem = 0, nPost = 0;

    for (const r of runs) {
      const L = r.L, ext = 0.18, A = r.A, Tt = r.T, N = r.N, nu = Math.max(2, Math.ceil((L + ext * 2) / T.du));
      const P = (s, h, d) => { const x = A[0] + Tt[0] * s + N[0] * d, z = A[1] + Tt[1] * s + N[1] * d; return [x, sh.gAt(A[0] + Tt[0] * s + N[0] * 0.3, A[1] + Tt[1] * s + N[1] * 0.3) + h, z]; };
      const at = (s) => [A[0] + Tt[0] * s, A[1] + Tt[1] * s];
      // ---- the packed wool: a grid from the roots to the wool's top, rolled back over the top
      {
        const nv = Math.max(4, Math.ceil(2.0 / T.dv)) + 1, Pg = [], Cg = [], Ug = [];
        for (let j = 0; j <= nv; j++) { Pg.push([]); Cg.push([]); Ug.push([]); }
        for (let i = 0; i <= nu; i++) {
          const s = -ext + (L + ext * 2) * i / nu, [bx, bz] = at(s), wt = sh.woolTop(bx, bz), tw = sh.thinW(bx, bz);
          for (let j = 0; j <= nv; j++) {
            let h, d, f;
            if (j < nv) { h = wt * j / (nv - 1); const w = sh.woolOut(bx, h, bz); f = w.f; d = w.b * (h < 0.32 ? 0.45 + h / 0.58 : 1) - tw * 0.06; }
            else { h = wt + 0.1; d = -0.32; f = 0.5; }
            const p = P(s, h, d);
            // grey wool, dirtier toward the roots, darker in the hollows; rotted (darker, browner) where it is thin
            let k = 0.16 + 0.56 * f * f * (3 - 2 * f); const dirt = sstep(0.5 - h, 0, 0.5);
            let c = [k * 0.98, k * 0.95, k * 0.9];
            c = [lerp(c[0], 0.3, dirt), lerp(c[1], 0.26, dirt), lerp(c[2], 0.2, dirt)];
            if (tw > 0) c = [lerp(c[0], 0.4, tw * 0.6), lerp(c[1], 0.36, tw * 0.6), lerp(c[2], 0.3, tw * 0.6)];
            if (j === nv) c = [c[0] * 0.55, c[1] * 0.55, c[2] * 0.55];
            Pg[j].push(p); Cg[j].push(c); Ug[j].push([s / 0.85, h / 0.85]);
          }
        }
        accGrid(wool, Pg, Cg, Ug, false);
      }
      // ---- the thorn above it: a dark recessed tangle (the sprays stand in front of it), up to the top, then over
      {
        const Pg = [], Cg = [], Ug = [], nv = Math.max(3, Math.ceil(2.0 / T.dv));
        for (let j = 0; j <= nv + 1; j++) { Pg.push([]); Cg.push([]); Ug.push([]); }
        for (let i = 0; i <= nu; i++) {
          const s = -ext + (L + ext * 2) * i / nu, [bx, bz] = at(s), wt = sh.woolTop(bx, bz) - 0.3, tp = sh.top(bx, bz);
          for (let j = 0; j <= nv + 1; j++) {
            let h, d; const f = fbm(bx * 1.3 + 7, j * 0.7, bz * 1.3);
            if (j <= nv) { h = lerp(wt, tp, j / nv); d = lerp(0.12, -0.2, Math.min(1, j / 2)) + 0.22 * f - (j === nv ? 0.15 : 0); } else { h = tp + 0.05; d = -0.75; }
            const k = 0.34 + 0.24 * f;
            Pg[j].push(P(s, h, d)); Cg[j].push([k, k * 0.97, k * 0.9]); Ug[j].push([(s + h * 0.8) / 0.8, (h - s * 0.8) / 0.8]);
          }
        }
        accGrid(bark, Pg, Cg, Ug, false);
      }
      // ---- posts where the wool was rammed down
      if (r.kind === 'in') for (let s = R(0.4, 1.4); s < L - 0.3; s += R(1.6, 2.5)) {
        const [bx, bz] = at(s); if (inGateFrame(bx, bz) || sh.gateW(bx, bz) > 0.75) continue;
        const wt = sh.woolTop(bx, bz), hh = wt + R(0.05, 0.55), w = sh.woolOut(bx, hh * 0.6, bz).b;
        const m4 = new THREE.Matrix4().makeRotationY(R(-0.4, 0.4)).premultiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(Tt[0], 0, Tt[1]), R(-0.06, 0.06)));
        const p = P(s, hh / 2 - 0.05, w * 0.3); m4.setPosition(p[0], p[1], p[2]);
        const k = R(0.85, 1.05); accBox(wood, THREE, R(0.11, 0.15), hh, R(0.11, 0.15), m4, [k, k * 0.95, k * 0.88], 1.2);
        nPost++;
      }
      // ---- thick stems: thorn growing up through the wool and over it
      const nS = Math.round(L * 2.1 * T.stem);
      for (let k = 0; k < nS; k++) {
        const s0 = R(0, L), [bx, bz] = at(s0), wt = sh.woolTop(bx, bz), tp = sh.top(bx, bz), gw = sh.gateW(bx, bz);
        const h0 = R(0.05, wt), dir = rnd() < 0.5 ? -1 : 1, s1 = s0 + dir * R(0.5, 1.8), h1 = Math.min(tp + 0.15, h0 + R(0.6, 2.2));
        const bulge = R(0.1, 0.32) + gw * 0.1, seg = T.seg, pts = [], rad = [], r0 = R(0.025, 0.06) * (1 + gw * 0.6);
        for (let q = 0; q <= seg; q++) {
          const t = q / seg, s = lerp(s0, s1, t) + Math.sin(t * PI * 2 + k) * 0.08, h = lerp(h0, h1, t) + Math.sin(t * PI * 3 + k * 1.7) * 0.07;
          const d = Math.sin(t * PI) * bulge * 0.6 + sh.woolOut(bx + Tt[0] * (s - s0), h, bz + Tt[1] * (s - s0)).b + 0.02;
          pts.push(P(s, h, d)); rad.push(r0 * (1 - t * 0.6));
        }
        const kk = R(1.0, 1.45);
        accTube(bark, pts, rad, T.radial, [kk, kk * 0.98, kk * 0.95], 0.9); nStem++;
      }
      // ---- wool caught in the thorn (lumpy tufts)
      const nT = Math.round(L * 1.0 * T.tuft * (r.kind === 'in' ? 1 : 0.6));
      for (let k = 0; k < nT; k++) {
        const s = R(0, L), [bx, bz] = at(s), wt = sh.woolTop(bx, bz), tp = sh.top(bx, bz), tw = sh.thinW(bx, bz);
        if (rnd() < tw * 0.7) continue;
        const h = R(wt - 0.15, tp + 0.05), near = sh.gateW(bx, bz) > 0.2, geo = ico(near ? T.ico : 1);
        const sz = R(0.13, 0.3) * (h > tp - 0.2 ? 0.8 : 1), p = P(s, h, R(-0.12, 0.06));
        tuft(THREE, wool, geo, p, sz, rnd, N, [0.66, 0.64, 0.6]); nTuft++;
      }
      // ---- the top of the packed wool: lumps of it, so it ends in tufts, not a ledge
      for (let s = R(0, 0.3); s < L; s += R(0.28, 0.5) / Math.max(0.5, T.tuft)) {
        const [bx, bz] = at(s), wt = sh.woolTop(bx, bz), tw = sh.thinW(bx, bz);
        const p = P(s, wt - R(0.02, 0.12), sh.woolOut(bx, wt, bz).b * 0.4 - R(0.0, 0.12)), sz = R(0.18, 0.32) * (1 - tw * 0.3);
        tuft(THREE, wool, ico(1), p, sz, rnd, N, tw > 0.3 ? [0.42, 0.38, 0.33] : [0.62, 0.6, 0.56]); nTuft++;
      }
      // ---- sprays of bare thorn (atlas cards): in front of the tangle, along the top, a few over the wool
      const card1 = (s, h, d, w, hh, yaw, tilt, which, col) => {
        const p = P(s, h, d), ca = Math.cos(yaw), sa = Math.sin(yaw);
        // the card's right vector: the run's tangent turned by yaw about up; up: tilted toward N
        const rx = Tt[0] * ca - N[0] * sa, rz = Tt[1] * ca - N[1] * sa;
        const ux = N[0] * Math.sin(tilt), uy = Math.cos(tilt), uz = N[1] * Math.sin(tilt);
        accCard(card, p, [rx * w / 2, 0, rz * w / 2], [ux * hh / 2, uy * hh / 2, uz * hh / 2], which, col, rnd() < 0.5); nCard++;
      };
      const cTh = () => { const k = R(1.15, 1.6); return greenK ? [k * 0.8, k * 1.05, k * 0.7] : [k, k * 0.98, k * 0.94]; };
      const nC = Math.round(L * 8 * T.spray);
      for (let k = 0; k < nC; k++) {
        const s = R(-0.1, L + 0.1), [bx, bz] = at(s), wt = sh.woolTop(bx, bz), tp = sh.top(bx, bz), tw = sh.thinW(bx, bz);
        if (rnd() < tw * 0.6) continue;
        const h = R(wt - 0.1, tp - 0.15), w = R(0.65, 1.15);
        card1(s, h, R(-0.05, 0.28), w, w * R(0.8, 1.05), R(-0.9, 0.9), R(-0.35, 0.25), rnd() < 0.5 ? RT.thornA : RT.thornB, cTh());
      }
      const nTop = Math.round(L / 0.3 * T.spray);
      for (let k = 0; k < nTop; k++) {
        const s = R(-0.1, L + 0.1), [bx, bz] = at(s), tp = sh.top(bx, bz), tw = sh.thinW(bx, bz);
        if (rnd() < tw * 0.5) continue;
        const w = R(0.6, 1.2);
        card1(s, tp + w * R(0.2, 0.42), R(-0.9, 0.15), w, w * R(0.9, 1.15), R(-1.4, 1.4), R(-0.25, 0.35), rnd() < 0.5 ? RT.thornA : RT.thornB, cTh());
      }
      const nW = Math.round(L * 3.5 * T.spray);
      for (let k = 0; k < nW; k++) {
        const s = R(0, L), [bx, bz] = at(s), wt = sh.woolTop(bx, bz), h = R(0.4, wt), w = R(0.45, 0.75);
        card1(s, h, sh.woolOut(bx, h, bz).b + R(0.0, 0.08), w, w, R(-0.7, 0.7), R(-0.3, 0.3), rnd() < 0.7 ? RT.thornA : RT.thornB, cTh());
      }
      // ---- straw stuffed in the roots
      if (r.kind === 'in') {
        const nSt = Math.round(L / 0.32 * T.straw);
        for (let k = 0; k < nSt; k++) {
          const s = R(0, L), w = R(0.45, 0.85), hh = w * R(0.4, 0.6), kk = R(0.7, 0.95);
          card1(s, hh * 0.42, R(0.12, 0.42), w, hh, R(-0.7, 0.7), R(-0.2, 0.35), rnd() < 0.5 ? RT.straw : RT.strawB, [kk, kk * 0.96, kk * 0.88]);
        }
      }
      // ---- felt and old sacking hung over the top (about half its length, tattered)
      for (let s = R(-0.2, 1.5); s < L;) {
        const w = R(0.9, 2.1), [bx, bz] = at(s + w / 2), tw = sh.thinW(bx, bz);
        if (rnd() < 0.45 + tw * 0.3 || sh.gateW(bx, bz) > 0.5) { s += w + R(0.4, 2.2); continue; }
        hanging(cloth, P, sh, at, s, w, R(0.35, 1.1), rnd, rnd() < 0.55);
        s += w + R(0.1, 1.6);
      }
    }
    // ---- the top of the Hedge, cell by cell (lumpy, dark), so a look over it (the clearing's watch-stand) sees thorn
    for (const ci of S.hedge) {
      const cx = ci % S.W, cy = (ci / S.W) | 0, n = 3, Pg = [], Cg = [], Ug = [];
      for (let j = 0; j <= n; j++) { Pg.push([]); Cg.push([]); Ug.push([]); for (let i = 0; i <= n; i++) {
        const x = (cx + i / n) * C, z = (cy + j / n) * C, f = fbm(x * 0.9, 2.2, z * 0.9), g = sh.gAt((cx + 0.5) * C, (cy + 0.5) * C);
        Pg[j].push([x, g + sh.top(x, z) - 0.2 + f * 0.3, z]); const k = 0.22 + f * 0.18; Cg[j].push([k, k * 0.96, k * 0.9]); Ug[j].push([x / 1.4, z / 1.4]);
      } }
      accGrid(bark, Pg, Cg, Ug, true);
      // sprays standing up out of it
      const nTopC = Math.round(4 * T.spray);
      for (let k = 0; k < nTopC; k++) {
        const x = (cx + rnd()) * C, z = (cy + rnd()) * C, g = sh.gAt((cx + 0.5) * C, (cy + 0.5) * C), w = R(0.7, 1.3), yaw = rnd() * PI, kk = R(0.7, 1);
        accCard(card, [x, g + sh.top(x, z) + w * 0.25, z], [Math.cos(yaw) * w / 2, 0, Math.sin(yaw) * w / 2], [0, w * 0.5, 0], rnd() < 0.5 ? RT.thornA : RT.thornB, [kk, kk, kk * 0.95], false); nCard++;
      }
    }
    out.stats = { runs: runs.length, tufts: nTuft, cards: nCard, stems: nStem, posts: nPost };
    return { bark, wool, card, cloth, wood, iron, stone, sh, C, WALLM, M };
  }
  // one tuft of wool: a lumpy, squashed ball, lighter on top, darker under
  function tuft(THREE, A, geo, p, sz, rnd, N, col) {
    const pos = geo.attributes.position, idx = geo.index, base = A.nv, sd = rnd() * 100, ax = 1.25 + rnd() * 0.4, ay = 0.75 + rnd() * 0.25, az = 0.85 + rnd() * 0.25;
    const yaw = Math.atan2(N[1], N[0]), cy = Math.cos(yaw), sy = Math.sin(yaw);
    const P = [], cnt = pos.count;
    for (let k = 0; k < cnt; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const r = 1 + (vn(x * 2.2 + sd, y * 2.2, z * 2.2) - 0.5) * 0.45 + (vn(x * 5 + sd, y * 5, z * 5) - 0.5) * 0.12;
      let lx = x * r * ax, ly = y * r * ay, lz = z * r * az; if (lx < -0.3) lx = -0.3 + (lx + 0.3) * 0.3;   // flattened where it is pushed into the thorn
      P.push([p[0] + (lx * cy - lz * sy) * sz, p[1] + ly * sz, p[2] + (lx * sy + lz * cy) * sz]);
    }
    // normals: area-weighted face normals
    const Nn = new Float32Array(cnt * 3), I = idx ? idx.array : null, tri = I ? I.length : cnt;
    for (let t = 0; t < tri; t += 3) {
      const a = I ? I[t] : t, b = I ? I[t + 1] : t + 1, c = I ? I[t + 2] : t + 2, pa = P[a], pb = P[b], pc = P[c];
      const ux = pb[0] - pa[0], uy = pb[1] - pa[1], uz = pb[2] - pa[2], vx = pc[0] - pa[0], vy = pc[1] - pa[1], vz = pc[2] - pa[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const q of [a, b, c]) { Nn[q * 3] += nx; Nn[q * 3 + 1] += ny; Nn[q * 3 + 2] += nz; }
    }
    for (let k = 0; k < cnt; k++) {
      let nx = Nn[k * 3], ny = Nn[k * 3 + 1], nz = Nn[k * 3 + 2]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const y = pos.getY(k), lit = 0.62 + 0.38 * clamp(y * 0.5 + 0.5, 0, 1), v = 0.92 + (vn(k * 0.37, sd, 1) - 0.5) * 0.2;
      accVert(A, P[k][0], P[k][1], P[k][2], nx, ny, nz, (pos.getX(k) + pos.getZ(k)) * 0.6 * sz / 0.2 + sd, pos.getY(k) * 0.6 * sz / 0.2, col[0] * lit * v, col[1] * lit * v, col[2] * lit * v);
    }
    if (I) for (let t = 0; t < I.length; t++) A.i.push(base + I[t]); else for (let k = 0; k < cnt; k++) A.i.push(base + k);
  }
  // a hanging of felt or sacking: from behind the thorn's top, over the edge, down the face in folds, a ragged hem
  function hanging(A, P, sh, at, s0, w, drop, rnd, sacking) {
    const cols = 7, rows = 6, Pg = [], Cg = [], Ug = [], ph = rnd() * 6, nf = 1.5 + rnd() * 2, kk = 0.65 + rnd() * 0.3;
    for (let j = 0; j <= rows; j++) { Pg.push([]); Cg.push([]); Ug.push([]); }
    for (let i = 0; i <= cols; i++) {
      const s = s0 + w * i / cols, [bx, bz] = at(s), tp = sh.top(bx, bz), rag = (rnd() - 0.5) * 0.22;
      for (let j = 0; j <= rows; j++) {
        const b = j / rows; let h, d;
        if (b < 0.25) { const t = b / 0.25; h = tp + 0.12 + Math.sin(t * PI) * 0.06; d = lerp(-0.7, 0.32, t); }
        else { const t = (b - 0.25) / 0.75; h = tp + 0.12 - t * (drop + (j === rows ? rag : 0)); d = 0.36 + Math.sin(i / cols * nf * TAU + ph) * 0.07 * t + t * 0.05; }
        Pg[j].push(P(s, h, d));
        const k = kk * (0.82 + 0.18 * Math.sin(i / cols * nf * TAU + ph));
        Cg[j].push(sacking ? [k * 0.92, k * 0.88, k * 0.82] : [k * 0.8, k * 0.8, k * 0.8]);
        Ug[j].push([(sacking ? 0 : 0.5) + 0.48 * i / cols, b * 1.6]);
      }
    }
    accGrid(A, Pg, Cg, Ug, false);
  }

  // ======================================================================== the North Gate
  // gate frame on the town edge of the gap; leaves opening outward into the gap. Static parts go into `st`, the leaves
  // and their iron into `dy` (rebuilt when the flag changes).
  function buildGate(THREE, S, H, open, st, dy, map) {
    const gate = S.gate; if (!gate) return null;
    const C = H.C, sh = H.sh, gx0 = gate.px * C, gx1 = (gate.px + 1) * C, gz = (gate.py + 0.5) * C, tz = (gate.py + 1) * C, g0 = sh.gAt((gate.px + 0.5) * C, tz + 0.5);
    const m4 = (x, y, z, ry, rz, rx) => { const m = new THREE.Matrix4(); m.makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'YXZ')); m.setPosition(x, y, z); return m; };
    const OAK = [0.62, 0.57, 0.5], OAKD = [0.5, 0.46, 0.4], IRON = [0.2, 0.19, 0.18], IRONR = [0.26, 0.2, 0.16], COPPER = [0.66, 0.38, 0.22];
    const PW = 0.34, PH = 3.05;
    if (st) {
      // gateposts (oak), half into the thorn
      for (const [x, k] of [[gx0, 0], [gx1, 1]]) {
        accBox(st.wood, THREE, PW, PH, PW, m4(x, g0 + PH / 2, gz, k ? 0.02 : -0.03), OAKD, 1.2);
        // a cap of boards on the post-top
        accBox(st.wood, THREE, PW + 0.06, 0.05, PW + 0.06, m4(x, g0 + PH + 0.025, gz, 0.1), OAK, 1.2);
        // the pintles the leaves hang on
        for (const y of [0.5, 1.95]) accBox(st.iron, THREE, 0.06, 0.06, 0.16, m4(x + (k ? -1 : 1) * 0.19, g0 + y, gz, 0), IRON);
      }
      // the lintel over the gap and its knee braces [PROPOSED]
      accBox(st.wood, THREE, C + 1.15, 0.3, 0.36, m4((gx0 + gx1) / 2, g0 + PH + 0.2, gz, 0.01, 0.006), OAKD, 1.2, true);
      for (const [x, sg] of [[gx0, 1], [gx1, -1]]) accBox(st.wood, THREE, 0.12, 0.82, 0.14, m4(x + sg * 0.42, g0 + PH - 0.3, gz, 0, -sg * 0.79), OAK, 1.2);
      // the coin ledge on the west gatepost, on the gap's side where Kaelen comes for it [PROPOSED form], and the coin
      const lx = gx0, lz = gz - PW / 2 - 0.06, ly = g0 + 1.34;
      accBox(st.wood, THREE, 0.24, 0.05, 0.12, m4(lx, ly, lz, 0), OAK, 1.2);
      const crnd = mulberry(1349);
      for (let k = 0; k < 5; k++) accGeo(st.iron, THREE, coinGeo(THREE), m4(lx + (crnd() - 0.5) * 0.17, ly + 0.027 + k % 2 * 0.0036, lz + (crnd() - 0.5) * 0.07, crnd() * 3, (crnd() - 0.5) * 0.06), COPPER);
      accGeo(st.iron, THREE, coinGeo(THREE), m4(lx + 0.03, ly + 0.025 + 0.012, lz + 0.05, 0.3, 0, PI / 2 - 0.25), COPPER);   // one stood in the crack
      if (gate.town) {
        // the mounting-block by the gatepost (town side) [PROPOSED: of stone, two steps]
        const bx = gx0 - 0.85, bz = tz + 0.42;
        accBox(st.stone, THREE, 1.05, 0.38, 0.62, m4(bx, g0 + 0.19, bz, 0.03), [0.62, 0.6, 0.56], 2.6);
        accBox(st.stone, THREE, 1.0, 0.36, 0.34, m4(bx + 0.02, g0 + 0.38 + 0.18, bz - 0.13, 0.03), [0.66, 0.63, 0.58], 2.6);
        // Harrow's stool by the other post [PROPOSED]
        const sx = gx1 + 0.78, sz = tz + 0.62;
        accGeo(st.wood, THREE, new THREE.CylinderGeometry(0.18, 0.17, 0.05, 12), m4(sx, g0 + 0.45, sz, 0.4), OAK);
        for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.4; accBox(st.wood, THREE, 0.035, 0.46, 0.035, m4(sx + Math.cos(a) * 0.11, g0 + 0.22, sz + Math.sin(a) * 0.11, 0, Math.cos(a) * 0.14, -Math.sin(a) * 0.14), OAKD, 1.2); }
      }
      // writs posted on the thorn at the gate, which the thorn has kept (four; the third deep in, past reaching)
      const wr = rectUV(AT.writ), gp = gate.py * C;
      const writs = [[gx1, -1, gp + 0.45, 1.52, 0.1, 0], [gx1, -1, gp + 1.15, 1.74, -0.12, 0], [gx1, -1, gp + 0.8, 1.22, 0.2, -0.22], [gx0, 1, gp + 0.75, 1.62, -0.06, 0]];   // on the outer half of the gap, where a writ-server stands
      for (const [x, sg, z, y, roll, inset] of writs) {
        const b = sh.woolOut(x, y, z).b, cx = x + sg * (b + 0.035 + inset), w = 0.15, h = 0.19, cr = Math.cos(roll), sr = Math.sin(roll);
        accCard(st.card, [cx, g0 + y, z], [0, sr * w, sg * w * cr], [0, h * cr, -sg * h * sr], wr, inset ? [0.6, 0.58, 0.54] : [0.95, 0.93, 0.88], sg < 0);
      }
      // where the gap meets the land outside: trodden earth over the hidden outer-ring cells by the gate
      if (gate.town) {
        for (const ci of S.outer) {
          const x = ci % S.W, y = (ci / S.W) | 0, near = Math.abs(x - gate.px) <= 4 && y === 0;
          const x0 = x * C, z0 = y * C, n = near ? 3 : 1, Pg = [], Cg = [], Ug = [];
          for (let j = 0; j <= n; j++) { Pg.push([]); Cg.push([]); Ug.push([]); for (let i = 0; i <= n; i++) { const px = x0 + i / n * C, pz = z0 + j / n * C, f = fbm(px * 0.8, 5, pz * 0.8); Pg[j].push([px, 0.004, pz]); const k = 0.42 + f * 0.16; Cg[j].push([k, k * 0.92, k * 0.76]); Ug[j].push([px / 1.6, pz / 1.6]); } }
          accGrid(st.bark, Pg, Cg, Ug, true);
        }
      } else {
        const x0 = gate.px * C, z0 = gate.py * C, n = 2, Pg = [], Cg = [], Ug = [];
        for (let j = 0; j <= n; j++) { Pg.push([]); Cg.push([]); Ug.push([]); for (let i = 0; i <= n; i++) { const px = x0 + i / n * C, pz = z0 + j / n * C; Pg[j].push([px, sh.gAt(px, z0 - 0.3) + 0.004, pz]); Cg[j].push([0.32, 0.29, 0.23]); Ug[j].push([px / 1.6, pz / 1.6]); } }
        accGrid(st.bark, Pg, Cg, Ug, true);
      }
    }
    // ---- the leaves: oak planks, ledges and a brace on the town face, iron strap hinges with arrow ends, nails, a ring,
    // the bar in its staples, a lock plate (Harrow's key)
    const Wl = (C - 2 * (PW / 2 + 0.03)) / 2, Hl = 2.32, ang = open ? 1.22 : 0;
    for (const sg of [1, -1]) {
      const hx = sg > 0 ? gx0 + PW / 2 + 0.03 : gx1 - PW / 2 - 0.03, a = sg > 0 ? -ang : ang;   // inward, toward the town: west leaf turns -, east +
      const L4 = new THREE.Matrix4().makeRotationY(a).setPosition(hx, g0 + 0.07, gz);
      const put = (A, w, h, d, x, y, z, rz, col, grainX) => { const m = m4(x, y, z, 0, rz || 0); m.premultiply(L4); accBox(A, THREE, w, h, d, m, col, 1.2, grainX); };
      const lr = mulberry(sg > 0 ? 71 : 73);
      const np = 5, pw = Wl / np;
      for (let k = 0; k < np; k++) { const hh = Hl - lr() * 0.05; put(dy.wood, pw - 0.012, hh, 0.06, sg * (pw * (k + 0.5)), hh / 2, 0, (lr() - 0.5) * 0.004, k % 2 ? OAK : OAKD); }
      // ledges and the brace on the town face (+z when shut)
      for (const y of [0.42, 1.88]) put(dy.wood, Wl - 0.05, 0.17, 0.05, sg * Wl / 2, y, 0.055, 0, OAK, true);
      const bl = Math.hypot(Wl - 0.2, 1.3), ba = Math.atan2(1.3, Wl - 0.2);
      put(dy.wood, bl, 0.15, 0.045, sg * Wl / 2, 1.15, 0.052, sg * ba, OAKD, true);
      // strap hinges over the ledges, from the hinge side
      for (const y of [0.42, 1.88]) {
        put(dy.iron, Wl * 0.78, 0.07, 0.014, sg * Wl * 0.39, y, -0.038, 0, IRON);
        const tip = m4(sg * Wl * 0.78, y, -0.038, 0, PI / 4); tip.premultiply(L4); accBox(dy.iron, THREE, 0.075, 0.075, 0.014, tip, IRON);
        for (let k = 0; k < 5; k++) put(dy.iron, 0.024, 0.024, 0.012, sg * (0.06 + k * Wl * 0.16), y, -0.05, 0, IRONR);
        put(dy.iron, 0.07, 0.09, 0.07, sg * 0.0, y, 0.0, 0, IRON);   // the knuckle on the pintle
      }
      // a ring to pull by
      { const m = m4(sg * (Wl - 0.2), 1.05, -0.06, 0); m.premultiply(L4); accGeo(dy.iron, THREE, ringGeo(THREE), m, IRON); }
      // staples for the bar
      for (const x of [Wl * 0.3, Wl * 0.85]) { put(dy.iron, 0.05, 0.24, 0.05, sg * x - 0.04, 1.32, 0.13, 0, IRON); put(dy.iron, 0.05, 0.24, 0.05, sg * x + 0.04, 1.32, 0.13, 0, IRON); }
      if (sg > 0) put(dy.iron, 0.17, 0.24, 0.02, sg * (Wl - 0.13), 1.0, 0.087, 0, IRON);   // the lock plate
      if (sg > 0) put(dy.wood, 0.03, 0.06, 0.01, sg * (Wl - 0.13), 0.97, 0.098, 0, [0.05, 0.05, 0.05]);   // its keyhole
      // the bar: across both leaves when shut; when open, left lying in the east leaf's staples
      if (!open && sg > 0) { const m = m4(gx0 + C / 2, g0 + 0.07 + 1.32, gz + 0.13, 0); accBox(dy.wood, THREE, C - 0.55, 0.14, 0.13, m, OAKD, 1.2, true); }
      if (open && sg < 0) {
        // the bar laid in two brackets on the east gatepost's gap side, pointing out along the gap (picture 2)
        accBox(dy.wood, THREE, 0.14, 0.15, 1.15, m4(gx1 - PW / 2 - 0.08, g0 + 1.42, gz - 0.42, 0.04), OAKD, 1.2);
        for (const dz of [-0.05, -0.62]) accBox(dy.iron, THREE, 0.2, 0.05, 0.06, m4(gx1 - PW / 2 - 0.08, g0 + 1.32, gz + dz, 0), IRON);
      }
    }
    return { gx0, gx1, gz, g0, PH };
  }
  function coinGeo(THREE) { if (!TEX.coin) TEX.coin = new THREE.CylinderGeometry(0.0125, 0.0125, 0.0035, 10); return TEX.coin; }
  function ringGeo(THREE) { if (!TEX.ring) TEX.ring = new THREE.TorusGeometry(0.065, 0.011, 6, 16); return TEX.ring; }
  // the Last Sheaf (and, once hung, the plaited figure beside it) on the lintel's town face
  function buildSheaf(THREE, S, G0, fig) {
    const A = Acc(), C = G0.C;
    const x = (G0.gx0 + G0.gx1) / 2 + (fig ? 0.62 : -0.05), z = G0.gz + 0.24, top = G0.g0 + G0.PH + 0.05, rr = fig ? rectUV(AT.figure) : rectUV(AT.sheaf);
    const w = fig ? 0.4 : 0.62, h = fig ? 0.4 : 0.9, rnd = mulberry(fig ? 5 : 3);
    for (let k = 0; k < (fig ? 2 : 3); k++) { const a = k / (fig ? 2 : 3) * PI + 0.2 + rnd() * 0.2; accCard(A, [x, top - 0.22 - h / 2, z], [Math.cos(a) * w / 2, 0, Math.sin(a) * w / 2], [0, h / 2, 0], rr, [1, 1, 1], false); }
    // the cord from a nail in the lintel
    accCard(A, [x, top - 0.11, z], [0.006, 0, 0], [0, 0.11, 0], rectUV([620, 860, 4, 30]), [0.5, 0.42, 0.3], false);
    void C;
    return A;
  }

  // ======================================================================== dress
  const S0 = { last: null, live: null };
  function dress(map, ctx) {
    ctx = ctx || {};
    const THREE = T3(ctx);
    const out = { group: null, hiddenCells: new Set(), replaced: new Set(), stats: {} };
    if (!THREE) return out;
    const S = spec(map); if (!S) return out;
    const group = new THREE.Group(); group.name = 'R11GATE:' + map.id; out.group = group;
    for (const ci of S.hedge) out.hiddenCells.add(ci);
    for (const ci of S.outer) out.hiddenCells.add(ci);
    if (S.gate) out.hiddenCells.add(S.gate.door);
    const tierName = tierOf(ctx.tier || (window.R11 && window.R11.tier && window.R11.tier()) || 'high');
    const live = { map, S, ctx, THREE, group, tier: tierName, open: null, sheaf: null, fig: null, tick: 0, out };
    try { fill(live); } catch (e) { warnOnce('dress', e); }
    S0.last = out; S0.live = live;
    return out;
  }
  function fill(live) {
    const { THREE, map, S, ctx, group, out } = live;
    while (group.children.length) { const c = group.children.pop(); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const metres = new THREE.Group(); metres.name = 'R11GATE:metres'; metres.scale.setScalar(UPM()); group.add(metres);
    live.metres = metres;
    const H = buildHedge(THREE, map, S, ctx, live.tier, out);
    live.H = H;
    const st = { wood: H.wood, iron: H.iron, stone: H.stone, card: H.card, bark: H.bark };
    const open = !!(S.gate && S.gate.canOpen && typeof G !== 'undefined' && G && G.flags && G.flags.gate_open);
    const dy = { wood: Acc(), iron: Acc() };
    live.G0 = S.gate ? buildGate(THREE, S, H, open, st, dy, map) : null;
    if (live.G0) live.G0.C = H.C;
    const sh = TIERS[live.tier].shadow, M = H.M;
    const add = (A, mat, name, cast) => { const m = accMesh(THREE, A, mat, name); if (m) { m.castShadow = !!cast; m.receiveShadow = true; metres.add(m); } return m; };
    add(H.bark, M.bark, 'gate:thorn', sh);
    add(H.wool, M.wool, 'gate:wool', sh);
    add(H.card, M.card, 'gate:sprays', false);
    add(H.cloth, M.cloth, 'gate:cloth', sh);
    add(H.stone, M.stone, 'gate:stone', true);
    live.woodStatic = H.wood; live.ironStatic = H.iron;
    live.wood = add(accJoin(H.wood, dy.wood), M.wood, 'gate:timber', true);
    live.iron = add(accJoin(H.iron, dy.iron), M.iron, 'gate:iron', true);
    live.open = open;
    live.sheafMesh = null; live.sheaf = null; live.fig = null;
    let draws = 0; metres.traverse((o) => { if (o.isMesh) draws++; });
    out.stats.draws = draws; out.stats.tier = live.tier; out.stats.open = open;
    let verts = 0; metres.traverse((o) => { if (o.isMesh) verts += o.geometry.attributes.position.count; }); out.stats.verts = verts;
  }
  function setOpen(live, open) {
    const { THREE, S, H } = live;
    const dy = { wood: Acc(), iron: Acc() };
    buildGate(THREE, S, H, open, null, dy, live.map);
    for (const [k, stat, A] of [['wood', live.woodStatic, dy.wood], ['iron', live.ironStatic, dy.iron]]) {
      const old = live[k]; if (!old) continue;
      const nm = accMesh(THREE, accJoin(stat, A), old.material, old.name);
      nm.castShadow = old.castShadow; nm.receiveShadow = true;
      live.metres.remove(old); old.geometry.dispose(); live.metres.add(nm); live[k] = nm;
    }
    live.open = open; live.out.stats.open = open;
  }
  // the festival's sheaf at the gate: its entities say whether it hangs (festivals12), R11 draws it in 3D
  function syncSheaf(live) {
    if (!live.G0 || !live.S.gate || !live.S.gate.town) return;
    const ents = (live.map && live.map.entities) || [];
    let sheaf = null, fig = null;
    for (const e of ents) {
      if (!e || e.hidden || e.dead || (e.sprite !== 'p12_sheaf' && e.sprite !== 'p12_sheaf_fig')) continue;
      if (Math.abs(e.x - (live.S.gate.px + 0.5)) > 1 || Math.abs(e.y - (live.S.gate.py + 0.55)) > 0.8) continue;   // the gate's, not the lamp-posts'
      if (e.sprite === 'p12_sheaf') sheaf = e; else fig = e;
    }
    try { const rep = window.R11 && R11.replaced && R11.replaced(); if (rep) { if (sheaf) rep.add(sheaf); if (fig) rep.add(fig); } } catch (e) { /* none */ }
    const want = (sheaf ? 1 : 0) + (fig ? 2 : 0);
    if (want === (live.sheafWant || 0) && (live.sheafMesh || !want)) return;
    live.sheafWant = want;
    if (live.sheafMesh) { live.metres.remove(live.sheafMesh); live.sheafMesh.geometry.dispose(); live.sheafMesh = null; }
    if (!want) { live.out.stats.sheaf = 0; return; }
    let A = Acc();
    if (sheaf) A = accJoin(A, buildSheaf(live.THREE, live.S, live.G0, false));
    if (fig) A = accJoin(A, buildSheaf(live.THREE, live.S, live.G0, true));
    live.sheafMesh = accMesh(live.THREE, A, live.H.M.card, 'gate:sheaf');
    if (live.sheafMesh) live.metres.add(live.sheafMesh);
    live.out.stats.sheaf = want;
  }
  function frame() {
    const live = S0.live;
    if (!live || typeof G === 'undefined' || !G || G.map !== live.map) return;
    try {
      const open = !!(live.S.gate && live.S.gate.canOpen && G.flags && G.flags.gate_open);
      if (live.G0 && open !== live.open) setOpen(live, open);
      live.tick++; syncSheaf(live);
    } catch (e) { warnOnce('frame', e); }
  }
  function onTier(t) {
    const live = S0.live; if (!live || tierOf(t) === live.tier) return;
    try { live.tier = tierOf(t); live.sheafWant = 0; fill(live); live.tick = 0; } catch (e) { warnOnce('tier', e); }
  }
  function onMap(m) { if (S0.live && S0.live.map !== m) S0.live = null; }

  // picture 2's camera: in the gap of the North Gate, the gate standing open, looking down the track into town
  const benchCam = { map: 'oakhaven', x: 23.42, y: 1.06, dir: Math.PI / 2 - 0.12, pitch: 10, tod: 0.6, day: 1, weather: 'overcast', flags: { gate_open: true } };

  function wire() {
    if (typeof window === 'undefined') return;
    window.R11DRESSERS = window.R11DRESSERS || [];
    if (!window.R11DRESSERS.some((d) => d && d.id === 'gate')) window.R11DRESSERS.push({ id: 'gate', maps, dress });
    const hook = () => {
      const R = window.R11; if (!R || R.__gateWired) return !!R;
      R.__gateWired = true;
      R.benchCams = R.benchCams || {}; R.benchCams.gate = benchCam;
      try { R.on('frame', frame); R.on('tier', onTier); R.on('mapbuilt', onMap); } catch (e) { warnOnce('hooks', e); }
      return true;
    };
    if (!hook()) window.addEventListener('load', hook);
  }
  wire();
  return { maps, dress, benchCam, TIERS, get last() { return S0.last; }, get live() { return S0.live; }, spec };
})();
if (typeof window !== 'undefined') window.R11GATE = R11GATE;
