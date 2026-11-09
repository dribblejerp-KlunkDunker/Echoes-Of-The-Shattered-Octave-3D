// ============================================================
//  bestiary20b — hand-built five-angle views, second half of the bestiary (Phase 20, team BEASTB)
//
//  Species (directions.js species list, sorted by sprite name, Proctor excluded, second half):
//    legionnaire, ln17_hollow, marine, miredrone, mites, outrider, pressman, quiet, requiem, tongueless,
//    warden, wearer, weaver, weaverling.   (mites is a swarm: symmetric by design, it keeps its one drawing.)
//
//  How the views are made. Each species has a hand-built RIG (the SPECIES table below): its body and
//  head modelled as stacks of elliptical sections (the width of each row is the painted silhouette,
//  the depth and forward lean are authored per band), with the parts that must not be wrapped onto
//  the body (arms, held tools, weapons, boots, hats) cut out of the painting by hand-drawn masks and
//  re-hung in 3D at a shoulder, hip or hand. Turning the rig and projecting it (a z-buffer, so a far
//  arm really goes behind the body) gives the front-side, side, back-side and back drawings. The front
//  half of every body is the original painting, re-lit for the new angle; the back half is painted
//  from the creature's own cloth, hide and metal (tiled patches of the same painting) plus hand-placed
//  back details (seams, hood points, straps, the press on Mallow's back). Walk frames swing the legs
//  and arms in the rig; attack frames are authored per species (wind-up and strike) and use the pose
//  frame's height and scale (hs), so the creature's size on screen never changes between views.
//
//  Everything is deterministic (no random numbers), built once per species/view/pose on demand,
//  cached and byte-budgeted. GFX.p20_beastb = false (or GFX.directions = false, or the Original preset)
//  falls back to the stand-ins exactly as before. No gameplay is touched.
// ============================================================
'use strict';

if (GFX.p20_beastb === undefined) GFX.p20_beastb = true;
if (GFX.FX && !GFX.FX.includes('p20_beastb')) GFX.FX.push('p20_beastb');

const BEASTB = (() => {
  const CAP = 6 * 1024 * 1024;
  const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
  const VIEW_DARK = [1, 0.96, 0.9, 0.8, 0.7];      // the back of a creature is the side away from the light
  const DEG = Math.PI / 180;

  // ---------------------------------------------------------------- pixels (ABGR, like the engine)
  const cl8 = v => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  const pack = (r, g, b, a) => (((a == null ? 255 : a) << 24) | (cl8(b) << 16) | (cl8(g) << 8) | cl8(r)) >>> 0;
  const R = p => p & 255, Gn = p => (p >>> 8) & 255, Bn = p => (p >>> 16) & 255, A = p => p >>> 24;
  const mul = (p, f) => pack(R(p) * f, Gn(p) * f, Bn(p) * f, 255);
  const lum = p => 0.3 * R(p) + 0.59 * Gn(p) + 0.11 * Bn(p);
  function hex(s) { const n = parseInt(s.replace('#', ''), 16); return pack(n >> 16, (n >> 8) & 255, n & 255); }
  function mix(p, q, k) { return pack(R(p) + (R(q) - R(p)) * k, Gn(p) + (Gn(q) - Gn(p)) * k, Bn(p) + (Bn(q) - Bn(p)) * k, 255); }
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const sp = name => (typeof Engine !== 'undefined' && Engine.sprites ? Engine.sprites[name] : null);
  const px = (s, x, y) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.data[(y | 0) * s.w + (x | 0)]);
  const solidPx = p => (p >>> 24) > 100;

  // ---------------------------------------------------------------- masks
  // Hand-drawn polygons in the coordinates of a source painting, rasterised to a byte mask.
  function polyMask(w, h, polys) {
    const m = new Uint8Array(w * h);
    for (const pts of polys) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(h - 1, Math.ceil(y1)); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(w - 1, Math.floor(xs[k + 1] - 0.5)); x++) m[y * w + x] = 1;
      }
    }
    return m;
  }
  const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

  // A cut-out: the pixels of a painting inside a mask, as a little sprite with a pivot.
  function cutout(src, polys, pivot) {
    const m = polyMask(src.w, src.h, polys);
    let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1;
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (m[y * src.w + x] && solidPx(src.data[y * src.w + x])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, data = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y + y0) * src.w + x + x0; if (m[i] && solidPx(src.data[i])) data[y * w + x] = src.data[i]; }
    return { w, h, data, px: pivot[0] - x0, py: pivot[1] - y0 };
  }

  // A tileable patch of a painting (mirror-wrapped so it never shows a seam); holes take the patch's mean.
  function patch(src, x, y, w, h, tone) {
    const data = new Uint32Array(w * h); let r = 0, g = 0, b = 0, n = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = px(src, x + i, y + j); if (solidPx(p)) { r += R(p); g += Gn(p); b += Bn(p); n++; } }
    const mean = n ? pack(r / n, g / n, b / n) : pack(60, 56, 60);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = px(src, x + i, y + j); data[j * w + i] = solidPx(p) ? (p | 0xff000000) >>> 0 : mean; }
    if (tone) for (let i = 0; i < data.length; i++) data[i] = mix(data[i], tone[0], tone[1]);
    return { w, h, data, mean };
  }
  const wrap = (u, n) => { let m = ((u % (2 * n)) + 2 * n) % (2 * n); return m >= n ? 2 * n - 1 - m : m; };
  const tap = (pt, u, v) => pt.data[wrap(Math.floor(v), pt.h) * pt.w + wrap(Math.floor(u), pt.w)];

  // Back paintings are the front painting with its front-only features painted out by hand.
  function editable(src) { return { w: src.w, h: src.h, data: new Uint32Array(src.data), cx: src.cx }; }
  // clone stamp: copy a rectangle of the image onto another place of itself (opaque pixels only)
  function clone(img, sx, sy, w, h, dx, dy, mirror) {
    const buf = new Uint32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) buf[j * w + i] = px(img, sx + i, sy + j);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = buf[j * w + (mirror ? w - 1 - i : i)], x = dx + i, y = dy + j;
      if (!solidPx(p) || x < 0 || y < 0 || x >= img.w || y >= img.h || !solidPx(img.data[y * img.w + x])) continue;
      img.data[y * img.w + x] = p;
    }
  }
  // paint the opaque pixels inside polygons with a cloth patch (keeps the silhouette)
  function paintIn(img, polys, pt, du, dv, f) {
    const m = polyMask(img.w, img.h, polys);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x; if (!m[i] || !solidPx(img.data[i])) continue;
      img.data[i] = mul(tap(pt, x + (du || 0), y + (dv || 0)), f || 1);
    }
  }

  // Inpainting: fill the pixels of a mask from their surroundings (an onion peel, then smoothing),
  // then lay the cloth's own grain back on (the high-frequency part of a patch). This is how arms and
  // tools are lifted off a body, and how faces, straps and buckles are taken off its back.
  function inpaint(img, fill, known, pt, opt) {
    const { w, h, data } = img, n = w * h;
    const r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n), ok = new Uint8Array(n);
    // only pixels that look like the cloth being continued may feed the fill (no straps, no buckles)
    const like = opt && opt.like, tol = (opt && opt.tol) || 40;
    const near = p => !like || Math.abs(R(p) - R(like)) + Math.abs(Gn(p) - Gn(like)) + Math.abs(Bn(p) - Bn(like)) < tol * 1.6 && Math.abs((R(p) - Bn(p)) - (R(like) - Bn(like))) < tol * 0.5;
    for (let i = 0; i < n; i++) if (known[i] && !fill[i] && solidPx(data[i]) && near(data[i])) { ok[i] = 1; r[i] = R(data[i]); g[i] = Gn(data[i]); b[i] = Bn(data[i]); }
    // Mirror mode (opt.axis): the cloth beside the hole, reflected across an authored vertical axis, so
    // folds, hems and belts carry on as painted. Vertical mode (opt.vertical): each column is bridged
    // from the cloth just above to the cloth just below (thin straps, buckles, pouches).
    const fillFrom = (i, j, k, j2) => { if (j2 == null) { r[i] = r[j]; g[i] = g[j]; b[i] = b[j]; } else { r[i] = r[j] + (r[j2] - r[j]) * k; g[i] = g[j] + (g[j2] - g[j]) * k; b[i] = b[j] + (b[j2] - b[j]) * k; } };
    if (opt && (opt.axis != null || opt.vertical)) {
      const got = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!fill[i]) continue;
        if (opt.axis != null) {
          let xs = Math.round(2 * opt.axis - x);
          const dir = xs > x ? 1 : -1;
          while (xs >= 0 && xs < w && !ok[y * w + xs] && Math.abs(xs - x) < w) xs += dir;
          if (xs >= 0 && xs < w && ok[y * w + xs]) { fillFrom(i, y * w + xs); got.push(i); }
        } else {
          let ya = y, yb = y; while (ya >= 0 && !ok[ya * w + x]) ya--; while (yb < h && !ok[yb * w + x]) yb++;
          if (ya >= 0 && yb < h) { fillFrom(i, ya * w + x, (y - ya) / (yb - ya), yb * w + x); got.push(i); }
          else if (ya >= 0) { fillFrom(i, ya * w + x); got.push(i); } else if (yb < h) { fillFrom(i, yb * w + x); got.push(i); }
        }
      }
      for (const i of got) { const x = i % w, y = (i / w) | 0; let a = r[i], c = g[i], d = b[i];
        if (pt && opt.grain) { const q = tap(pt, x + (opt.du || 0), y + (opt.dv || 0)); a += (R(q) - R(pt.mean)) * opt.grain; c += (Gn(q) - Gn(pt.mean)) * opt.grain; d += (Bn(q) - Bn(pt.mean)) * opt.grain; }
        data[i] = pack(a, c, d, 255); fill[i] = 0; }
      for (const i of got) ok[i] = 1;
    }
    let todo = []; for (let i = 0; i < n; i++) if (fill[i]) todo.push(i);
    const want = todo.slice();
    const vert = (opt && opt.vert) || 1;      // cloth falls vertically: weight vertical neighbours more
    for (let pass = 0; pass < 400 && todo.length; pass++) {
      const next = [], set = [];
      for (const i of todo) {
        const x = i % w, y = (i / w) | 0; let sr = 0, sg = 0, sb = 0, sw = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx; if (!ok[j]) continue; const wt = (dx ? 1 : vert) * (dx && dy ? 0.7 : 1);
          sr += r[j] * wt; sg += g[j] * wt; sb += b[j] * wt; sw += wt;
        }
        if (sw) set.push([i, sr / sw, sg / sw, sb / sw]); else next.push(i);
      }
      if (!set.length) break;
      for (const [i, a, c, d] of set) { r[i] = a; g[i] = c; b[i] = d; ok[i] = 1; }
      todo = next;
    }
    for (let it = 0; it < ((opt && opt.smooth) || 60); it++) for (const i of want) {
      const x = i % w, y = (i / w) | 0; let sr = 0, sg = 0, sb = 0, sw = 0;
      for (const [dx, dy, wt] of [[-1, 0, 1], [1, 0, 1], [0, -1, vert], [0, 1, vert]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx; if (!ok[j]) continue; sr += r[j] * wt; sg += g[j] * wt; sb += b[j] * wt; sw += wt;
      }
      if (sw) { r[i] = sr / sw; g[i] = sg / sw; b[i] = sb / sw; }
    }
    const k = opt && opt.grain != null ? opt.grain : 1, du = (opt && opt.du) || 0, dv = (opt && opt.dv) || 0;
    const mr = pt ? R(pt.mean) : 0, mg = pt ? Gn(pt.mean) : 0, mb = pt ? Bn(pt.mean) : 0;
    for (const i of want) {
      if (!ok[i]) { if (!pt) continue; r[i] = R(pt.mean); g[i] = Gn(pt.mean); b[i] = Bn(pt.mean); }
      const x = i % w, y = (i / w) | 0;
      let a = r[i], c = g[i], d = b[i];
      if (pt) { const q = tap(pt, x + du, y + dv); a += (R(q) - mr) * k; c += (Gn(q) - mg) * k; d += (Bn(q) - mb) * k; }
      data[i] = pack(a, c, d, 255);
    }
  }
  // A clean painting for a rig: the parts (arms, tools) lifted off, the body behind them painted in.
  //   body: polygons of the body's true silhouette; remove: polygons of what is lifted off.
  function cleanPainting(src, body, remove, pt, opt) {
    const img = editable(src), n = src.w * src.h;
    const inBody = polyMask(src.w, src.h, body), rm = polyMask(src.w, src.h, remove);
    const fill = new Uint8Array(n), known = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (rm[i]) { if (inBody[i]) fill[i] = 1; else img.data[i] = 0; }
      else if (inBody[i] && solidPx(src.data[i])) known[i] = 1;
    }
    inpaint(img, fill, known, pt, opt);
    return img;
  }
  // Paint features out of an image (for a back): inside the polygons, from the rest of the image.
  function paintOut(img, polys, pt, opt) {
    const n = img.w * img.h, fill = polyMask(img.w, img.h, polys), known = new Uint8Array(n);
    for (let i = 0; i < n; i++) { if (fill[i] && !solidPx(img.data[i])) fill[i] = 0; if (!fill[i] && solidPx(img.data[i])) known[i] = 1; }
    if (opt && opt.from) { const f = polyMask(img.w, img.h, opt.from); for (let i = 0; i < n; i++) known[i] = known[i] && f[i]; }
    inpaint(img, fill, known, pt, opt);
  }

  // ---------------------------------------------------------------- the canvas
  function canvas(w, h) { return { w, h, col: new Uint32Array(w * h), z: new Float32Array(w * h).fill(-1e9), id: new Uint8Array(w * h), n: 0 }; }
  function put(C, x, y, z, c, id) {
    if (x < 0 || y < 0 || x >= C.w || y >= C.h) return;
    const i = y * C.w + x;
    if (z < C.z[i]) return;
    C.z[i] = z; C.col[i] = c; C.id[i] = id;
  }

  // The light: from the viewer's upper left, a little toward the camera (screen space).
  const LX = -0.3, LZ = 0.95;

  // ---------------------------------------------------------------- stacks (bodies and heads)
  // A stack is a column of elliptical sections, one per painted row: half-width and centre from the
  // painting's silhouette (inside the stack's mask), depth and forward offset authored per row.
  function buildStack(src, ax, def) {
    const m = polyMask(src.w, src.h, def.mask);
    const rows = [];
    for (let y = 0; y < src.h; y++) {
      let xl = -1, xr = -1;
      const okp = def.solid || solidPx;
      for (let x = 0; x < src.w; x++) if (m[y * src.w + x] && okp(src.data[y * src.w + x])) { if (xl < 0) xl = x; xr = x; }
      if (xl < 0) { rows.push(null); continue; }
      rows.push({ xl, xr });
    }
    // a ragged outline can be eased over a few rows (smoke, tatters), so the turned shape is not jagged
    const sm = def.smooth || 0, raw = rows.map(r => r && { xl: r.xl, xr: r.xr });
    for (let y = 0; y < src.h; y++) {
      const r = rows[y]; if (!r) continue;
      if (sm) { let a = 0, b = 0, n = 0; for (let k = -sm; k <= sm; k++) { const q = raw[y + k]; if (q) { a += q.xl; b += q.xr; n++; } } r.xl = Math.round(a / n); r.xr = Math.round(b / n); }
      const al = Math.max(1, (r.xr - r.xl + 1) / 2), cl = (r.xl + r.xr + 1) / 2 - ax;
      r.al = al; r.cl = cl; r.af = Math.max(1, def.depth(y, al)); r.cf = def.fwd ? def.fwd(y) : 0;
    }
    return { m, rows, def, img: src };
  }

  // Paint a stack at view angle th. ymap(yt) -> source row (or -1), shear(yt) -> extra screen x.
  // The front half samples the painting, the back half samples the stack's back painting (the same
  // painting with its front-only features painted out by hand: S.backSrc), mirrored. Columns are
  // picked by a blend of projection (exact when facing us) and arc length (no smearing on the flanks).
  function drawStack(C, S, st, th, ax, axT, ymap, shear, id, opt) {
    const sn = Math.sin(th), cs = Math.cos(th), src = st.img, bsrc = (opt && opt.backSrc) || S.backSrc || src;
    const wArc = Math.min(0.85, Math.abs(sn) * 0.9), edgeIn = (opt && opt.edgeIn) || 2;
    const backTone = opt && opt.backTone;
    const colOf = (row, ang) => {   // ang in [-pi/2, pi/2] from the facing centre
      const m = (1 - wArc) * Math.sin(ang) + wArc * ang / (Math.PI / 2);
      return Math.round(ax + row.cl + (row.al - edgeIn) * m - 0.5);
    };
    for (let yt = 0; yt < C.h; yt++) {
      const ys = ymap(yt); if (ys < 0 || ys >= src.h) continue;
      const yi = ys | 0, row = st.rows[yi]; if (!row) continue;
      const dx = shear ? shear(yt, ys) : 0;
      const A_ = row.af * sn, B_ = row.al * cs, Rr = Math.hypot(A_, B_);
      const s0 = row.cf * sn + row.cl * cs, del = Math.atan2(B_, A_);
      const zc = row.cf * cs + row.cl * sn;
      const xa = Math.floor(axT + dx + s0 - Rr - 1), xb = Math.ceil(axT + dx + s0 + Rr + 1);
      for (let x = xa; x <= xb; x++) {
        const s = x + 0.5 - axT - dx - s0;
        if (Math.abs(s) > Rr) continue;
        const ac = Math.acos(Math.max(-1, Math.min(1, s / Rr)));
        let phi = del + ac, phi2 = del - ac;
        const z1 = row.af * Math.cos(phi) * cs + row.al * Math.sin(phi) * sn, z2 = row.af * Math.cos(phi2) * cs + row.al * Math.sin(phi2) * sn;
        let z = z1; if (z2 > z1) { phi = phi2; z = z2; }
        phi = Math.atan2(Math.sin(phi), Math.cos(phi));
        const cphi = Math.cos(phi), sphi = Math.sin(phi);
        let nf = cphi / row.af, nl = sphi / row.al; const nn = Math.hypot(nf, nl) || 1; nf /= nn; nl /= nn;
        const nx = nf * sn + nl * cs, nz = nf * cs + nl * sn;
        const litNow = 0.55 + 0.55 * Math.max(0, LX * nx + LZ * nz);
        let c = 0;
        if (opt && opt.paint) { c = opt.paint(row, yi, sphi, cphi, x, yt, litNow); if (c) put(C, x, yt, zc + z, c, id); continue; }
        const clampX = xs => Math.max(row.xl + 1, Math.min(row.xr - 1, xs));
        const take = (img, xs) => { const xx = clampX(xs), p = px(img, xx, yi); return solidPx(p) && st.m[yi * src.w + xx] ? p : 0; };
        if (cphi >= 0) {
          const p = take(src, colOf(row, phi));
          const n0 = Math.max(0, LX * sphi + LZ * cphi);
          if (p) c = mul(p, Math.sqrt(Math.max(0.5, Math.min(1.4, litNow / (0.55 + 0.55 * n0)))));
        }
        if (cphi < 0.18) {
          // the back: mirrored, so the creature's own right stays on its right
          const pb = phi > 0 ? Math.PI - phi : -Math.PI - phi;
          let p = take(bsrc, colOf(row, -pb));
          if (p) {
            if (backTone) p = mix(p, backTone[0], backTone[1]);
            const pc = mul(p, Math.max(0.55, Math.min(1.2, litNow / 0.95)));
            c = c && cphi >= 0 ? mix(pc, c, cphi / 0.18) : pc;
          }
        }
        if (!c) continue;
        put(C, x, yt, zc + z, c, id);
      }
    }
  }

  // An arm or a haft: a tapered limb between two body-frame points (f, l, canvas y), textured from a
  // patch and shaded round, with depth interpolated along it.
  function drawLimb(C, th, axT, a, b, w0, w1, pt, id, shade) {
    const sn = Math.sin(th), cs = Math.cos(th);
    const P0 = { x: axT + a.f * sn + a.l * cs, y: a.y, z: a.f * cs + a.l * sn + (a.dz || 0) };
    const P1 = { x: axT + b.f * sn + b.l * cs, y: b.y, z: b.f * cs + b.l * sn + (b.dz || 0) };
    const dx = P1.x - P0.x, dy = P1.y - P0.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const x0 = Math.floor(Math.min(P0.x, P1.x) - Math.max(w0, w1)), x1 = Math.ceil(Math.max(P0.x, P1.x) + Math.max(w0, w1));
    const y0 = Math.floor(Math.min(P0.y, P1.y) - Math.max(w0, w1)), y1 = Math.ceil(Math.max(P0.y, P1.y) + Math.max(w0, w1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const qx = x + 0.5 - P0.x, qy = y + 0.5 - P0.y;
      let t = (qx * ux + qy * uy) / len; const d = -qx * uy + qy * ux;
      if (t < -0.08 || t > 1.08) continue;
      const tc = Math.max(0, Math.min(1, t)), hw = (w0 + (w1 - w0) * tc) / 2;
      if (Math.abs(d) > hw) continue;
      const across = d / hw;                               // -1..1 across the limb
      const f = (0.58 + 0.55 * Math.sqrt(Math.max(0, 1 - across * across)) - 0.12 * across * Math.sign(ux || 1)) * (shade || 1);
      const c = mul(tap(pt, (across + 1) * pt.w / 2, t * len), f);
      put(C, x, y, P0.z + (P1.z - P0.z) * tc + 1, c, id || 40);
    }
  }

  // A cut-out turned so that the direction (dx, dy) in its own pixels becomes its x axis.
  function alignCut(cut, dx, dy) {
    const a = -Math.atan2(dy, dx), ca = Math.cos(a), sa = Math.sin(a);
    const pts = [[0, 0], [cut.w, 0], [0, cut.h], [cut.w, cut.h]].map(([u, v]) => [(u - cut.px) * ca - (v - cut.py) * sa, (u - cut.px) * sa + (v - cut.py) * ca]);
    const x0 = Math.floor(Math.min(...pts.map(p => p[0]))), x1 = Math.ceil(Math.max(...pts.map(p => p[0])));
    const y0 = Math.floor(Math.min(...pts.map(p => p[1]))), y1 = Math.ceil(Math.max(...pts.map(p => p[1])));
    const w = x1 - x0, h = y1 - y0, data = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x + 0.5 + x0, Y = y + 0.5 + y0;
      const u = X * ca + Y * sa + cut.px, v = -X * sa + Y * ca + cut.py;
      if (u < 0 || v < 0 || u >= cut.w || v >= cut.h) continue;
      data[y * w + x] = cut.data[(v | 0) * cut.w + (u | 0)];
    }
    return { w, h, data, px: -x0, py: -y0 };
  }
  // Draw an aligned cut (its x axis = its length) pointing along a body-frame direction (f, l, up).
  function drawAlong(C, cut, th, axT, at, dir, opt) {
    const sn = Math.sin(th), cs = Math.cos(th);
    const sx = dir.f * sn + dir.l * cs, sy = -dir.up, n3 = Math.hypot(dir.f, dir.l, dir.up) || 1;
    const k = Math.max(0.3, Math.hypot(sx, sy) / n3);
    const rot = Math.atan2(sy, sx) / DEG;
    // keep the cut's top edge up: a blade pointing left is mirrored rather than upside down
    const left = sx < 0;
    drawCut(C, cut, th, axT, at.f, at.l, at.y, left ? rot - 180 : rot, Object.assign({ kx: k, mirror: left, dz: (opt && opt.dz) || 0 }, opt, { rotMirror: left }));
  }

  // Draw a cut-out at a 3D point (f, l, y in source rows), rotated (deg), scaled; z constant.
  function drawCut(C, cut, th, axT, f, l, ysT, rot, opt) {
    if (!cut) return;
    opt = opt || {};
    const sn = Math.sin(th), cs = Math.cos(th);
    const sx = axT + f * sn + l * cs, z = f * cs + l * sn + (opt.dz || 0);
    const kx = (opt.kx == null ? 1 : opt.kx) * (opt.mirror ? -1 : 1), ky = opt.ky == null ? 1 : opt.ky;
    const a = (rot || 0) * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const shade = opt.shade == null ? 1 : opt.shade;
    // bounding box of the transformed cut
    const corners = [[-cut.px, -cut.py], [cut.w - cut.px, -cut.py], [-cut.px, cut.h - cut.py], [cut.w - cut.px, cut.h - cut.py]];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [u, v] of corners) { const X = u * kx * ca - v * ky * sa, Y = u * kx * sa + v * ky * ca; x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); }
    for (let y = Math.floor(ysT + y0) - 1; y <= Math.ceil(ysT + y1) + 1; y++) for (let x = Math.floor(sx + x0) - 1; x <= Math.ceil(sx + x1) + 1; x++) {
      const X = x + 0.5 - sx, Y = y + 0.5 - ysT;
      const u = (X * ca + Y * sa) / kx + cut.px, v = (-X * sa + Y * ca) / ky + cut.py;
      if (u < 0 || v < 0 || u >= cut.w || v >= cut.h) continue;
      const p = cut.data[(v | 0) * cut.w + (u | 0)]; if (!solidPx(p)) continue;
      let c = shade === 1 ? p : mul(p, shade);
      if (opt.tint) c = mix(c, opt.tint[0], opt.tint[1]);
      put(C, x, y, z, c | 0xff000000, opt.id || 200);
    }
  }

  // Filled polygon in screen space at depth z, painted by a brush (x, y) -> colour.
  function fillPoly(C, pts, z, brush, id) {
    const m = { w: C.w, h: C.h };
    const mk = polyMask(m.w, m.h, [pts]);
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) if (mk[y * C.w + x]) { const c = brush(x, y); if (c) put(C, x, y, typeof z === 'function' ? z(x, y) : z, c, id || 150); }
  }
  // Project a body-frame point to screen x and depth.
  const proj = (th, axT, f, l) => ({ x: axT + f * Math.sin(th) + l * Math.cos(th), z: f * Math.cos(th) + l * Math.sin(th) });

  // Smoke on the edge of a void: curls of a pale colour in the first pixels outside the silhouette,
  // laid out by a fixed hash so every view keeps the same kind of edge.
  function halo(C, cols, seed) {
    const { w, h, col } = C, near = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (col[y * w + x]) continue;
      let d = 0;
      for (let r = 1; r <= 3 && !d; r++) for (let dy = -r; dy <= r && !d; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (col[yy * w + xx] && C.id[yy * w + xx] < 90) { d = r; break; }
      }
      if (!d) continue;
      // curls: a wavy band, thinner further out
      const wave = Math.sin(y * 0.55 + x * 0.3 + seed) + Math.sin(y * 0.21 - x * 0.47 + seed * 2);
      if ((d === 1 && wave > -1.5) || (d === 2 && wave > -0.5) || (d === 3 && wave > 0.6)) near[y * w + x] = d;
    }
    for (let i = 0; i < w * h; i++) if (near[i]) { col[i] = cols[Math.min(cols.length - 1, near[i] - 1)]; C.z[i] = -1e6; C.id[i] = 95; }
  }

  // ---------------------------------------------------------------- finishing
  function finish(C, v, ink, line) {
    const { w, h, col, id } = C, out = new Uint32Array(w * h), dark = VIEW_DARK[v];
    const k = line == null ? 0.45 : line;
    // the outside: transparent pixels reachable from the border (holes in rags are not outlined)
    const outside = new Uint8Array(w * h), stack = [];
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(); if (outside[i] || col[i]) continue; outside[i] = 1;
      const x = i % w;
      if (x > 0) stack.push(i - 1); if (x < w - 1) stack.push(i + 1); if (i >= w) stack.push(i - w); if (i < w * (h - 1)) stack.push(i + w);
    }
    const out_ = j => j < 0 || j >= w * h || outside[j];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = col[i]; if (!c) continue;
      let f = dark;
      const edge = (x === 0 || out_(i - 1)) || (x === w - 1 || out_(i + 1)) || out_(i - w) || out_(i + w);
      if (edge) { out[i] = ink ? mix(c, ink, 0.6) : mul(c, k * dark); continue; }
      // a softer seam where a nearer part overlaps a farther one
      const zi = C.z[i];
      if (id[i] !== id[i - 1] && C.z[i - 1] < zi - 2.5 || id[i] !== id[i + 1] && C.z[i + 1] < zi - 2.5 || id[i] !== id[i - w] && C.z[i - w] < zi - 2.5 || id[i] !== id[i + w] && C.z[i + w] < zi - 2.5) f *= 0.72 + (k - 0.45) * 0.5;
      out[i] = mul(c, f);
    }
    return out;
  }

  // ---------------------------------------------------------------- poses
  // Pose canvases match the painted pose frame: same height, same hs, the feet on the bottom row.
  function poseFrame(name, pose) { return sp(name + pose) || sp(name); }

  // ---------------------------------------------------------------- the species
  const SPECIES = {};
  const built = new Map();     // name -> prepared rig (cut-outs, stacks, patches)

  function prep(name) {
    if (built.has(name)) return built.get(name);
    const def = SPECIES[name], src = sp(name);
    if (!def || !src) return null;
    const S = { name, src, ax: (src.cx == null ? 0.5 : src.cx) * src.w, def };
    def.prep(S, src);
    built.set(name, S);
    return S;
  }

  const cache = new Map(); let bytes = 0, stamp = 0;
  function evict(need) {
    while (bytes + need > CAP && cache.size) {
      let ok = null, ov = null;
      for (const [k, en] of cache) if (!ov || en.used < ov.used) { ok = k; ov = en; }
      bytes -= ov.sprite.data.byteLength; cache.delete(ok);
    }
  }

  function render(name, v, pose) {
    const S = prep(name); if (!S) return null;
    const fr = poseFrame(name, pose), idle = S.src;
    const hs = fr === idle ? (idle.hs || 1) : (fr.hs || fr.h / idle.h);
    // canvas height keeps the pose frame's scale: hs * idle height
    const H = Math.round(hs * idle.h);
    const W = S.def.W || Math.round(idle.w * 1.5);
    const C = canvas(W, H);
    const axT = S.def.axT != null ? S.def.axT : W / 2;
    const th = v * 45 * DEG;
    const P = S.def.pose(pose || '', v);
    P.lift = P.lift || 0;
    P.H = H; P.drop = Math.max(0, idle.h - H);
    S.def.draw(C, S, th, axT, P, v);
    const data = finish(C, v, S.def.ink, S.def.line);
    // never two identical drawings for different poses (a pixel of the outline moves)
    return { w: W, h: H, data, hs, cx: axT / W, dy: 0 };
  }

  function view(name, v, pose) {
    if (!SPECIES[name] || !(v >= 1 && v <= 4)) return null;
    const key = name + ':' + v + ':' + (pose || '');
    const hit = cache.get(key);
    if (hit) { hit.used = ++stamp; return hit.sprite; }
    const sprite = render(name, v, pose || '');
    if (!sprite) return null;
    evict(sprite.data.byteLength);
    cache.set(key, { sprite, used: ++stamp }); bytes += sprite.data.byteLength;
    return sprite;
  }

  // ---------------------------------------------------------------- shared rig helpers
  // Vertical mapping for a pose: the figure stands on the bottom row; a crouch (canvas shorter than
  // the idle painting) bends at the knee row, compressing the legs and the skirt below it.
  function ymapper(S, P) {
    const idleH = S.src.h, H = P.H, knee = S.def.knee || Math.round(idleH * 0.62);
    const up = Math.round(P.lift || 0);
    if (H >= idleH) { const off = H - idleH; return yt => { const y = yt - off + up; return y >= idleH ? -1 : y; }; }
    // crouch: the body above the knee keeps its rows; the legs below it fold into what is left
    const k2 = Math.min(knee, H - 8), sc = (idleH - k2) / Math.max(1, H - k2);
    return yt => {
      const y = yt + up;
      if (y < k2) return y;
      const ys = k2 + (y - k2) * sc;
      return ys >= idleH ? -1 : ys | 0;
    };
  }
  // where a source row lands on the canvas (inverse of ymapper, for hanging parts)
  function rowT(S, P, ys) {
    const idleH = S.src.h, H = P.H, knee = S.def.knee || Math.round(idleH * 0.62);
    const up = Math.round(P.lift || 0);
    if (H >= idleH) return ys + (H - idleH) - up;
    const k2 = Math.min(knee, H - 8);
    if (ys < k2) return ys - up;
    return k2 + (ys - k2) * (H - k2) / (idleH - k2) - up;
  }
  // forward lean: rows above the hip move along the heading
  function shearer(S, P, th) {
    const lean = P.lean || 0, hip = S.def.hip || S.src.h * 0.5, sn = Math.sin(th);
    if (!lean) return null;
    return (yt, ys) => (ys < hip ? lean * (hip - ys) / hip * sn : 0);
  }
  // a cloth band painter for the back half of a stack: tiled patch by row band
  function bandBack(bands, extra) {
    return (row, ys, sphi, cphi, x, yt) => {
      for (const b of bands) if (ys >= b.y0 && ys < b.y1) {
        // u runs around the section: arc position, so folds wrap continuously
        const u = Math.atan2(sphi, cphi) * row.al * 0.9 + (b.du || 0);
        let c = tap(b.pt, u, ys - b.y0 + (b.dv || 0));
        if (extra) c = extra(c, row, ys, sphi, cphi, b) || c;
        return c;
      }
      return 0;
    };
  }

  return { SPECIES, view, render, prep, cache, budgetBytes: () => bytes, cap: CAP, clear() { cache.clear(); bytes = 0; },
    poses: POSES,
    lib: { halo, inpaint, cleanPainting, paintOut, editable, clone, paintIn, drawLimb, alignCut, drawAlong, polyMask, rectPoly, cutout, patch, tap, wrap, buildStack, drawStack, drawCut, fillPoly, proj, ymapper, rowT, shearer, bandBack, hex, mix, mul, pack, lum, hash, px, solidPx, R, Gn, Bn, A, put } };
})();

// ================================================================ species rigs
(() => {
  const L = BEASTB.lib, SP = BEASTB.SPECIES;
  const { cleanPainting, paintOut, cutout, patch, buildStack, drawStack, drawCut, drawLimb, alignCut, drawAlong, ymapper, rowT, shearer, editable, clone, paintIn, hex, mix, mul, tap, proj } = L;

  // Walk and attack parameters shared by the bipeds: step (-1..1), arm swing, lift, lean.
  function bipedPose(pose) {
    if (pose === '_w1') return { step: 1, swing: 1, lift: 1 };
    if (pose === '_w2') return { step: -1, swing: -1, lift: 1 };
    if (pose === '_a1') return { atk: 1, lean: -2 };
    if (pose === '_a2') return { atk: 2, lean: 8 };
    return { step: 0, swing: 0 };
  }
  // Boots: two cut-outs that stride along the heading; seen from the side they lengthen (the toe).
  function boots(C, S, th, axT, P, v, bR, bL, lR, lL, yRow) {
    const sn = Math.sin(th), step = P.step || 0, back = v >= 3, yb = rowT(S, P, yRow);
    const kx = 0.8 + 0.5 * Math.abs(sn), stride = 6 * step;
    drawCut(C, bR, th, axT, -stride + 1, lR, yb - (step < 0 ? 2 : 0), 0, { kx, mirror: back, shade: 0.92, id: 11 });
    drawCut(C, bL, th, axT, stride + 1, lL, yb - (step > 0 ? 2 : 0), 0, { kx, mirror: back, shade: 0.92, id: 12 });
  }
  // A held arm cut-out, hung from its shoulder and swung by the walk.
  function hangArm(C, cut, th, axT, P, v, l, yS, sw, id) {
    const cs = Math.cos(th);
    drawCut(C, cut, th, axT, 0, l, yS, sw, { kx: 0.78 + 0.22 * Math.abs(cs), shade: v >= 3 ? 0.82 : 1, dz: 2, id });
  }
  // The head row map: the head follows the body's row map, lowered into a strike.
  const headMap = (ym, drop) => yt => { const y = ym(yt); return y < 0 ? -1 : y - drop < 0 ? -1 : y - drop; };

  // ---------------------------------------------------------------- the humanoid rig
  // A species is a table: the body's true silhouette and its depth, the head, what is lifted off the
  // painting (and how the hole is painted in: mirrored about an axis, or bridged top to bottom), the
  // cut-outs and patches it uses, how its back is painted, and a dress() that hangs arms, tools, hats.
  function humanoid(cfg) {
    return {
      W: cfg.W, axT: cfg.axT, knee: cfg.knee, hip: cfg.hip, ink: cfg.ink, line: cfg.line,
      prep(S, src) {
        S.pt = {};
        for (const k in cfg.patches || {}) { const q = cfg.patches[k]; S.pt[k] = patch(sp0(q[4]) || src, q[0], q[1], q[2], q[3]); }
        let F = src;
        for (const f of cfg.lift || []) {
          const pt = S.pt[f.pt || 'cloth'];
          F = cleanPainting(F, cfg.sil, f.poly, pt, f.axis != null ? { axis: f.axis } : { vertical: f.mode !== 'onion', smooth: f.smooth || 300, vert: 1, like: f.like === false ? null : pt && pt.mean, tol: f.tol || 55, grain: f.grain == null ? 0.6 : f.grain });
        }
        S.front = F;
        S.body = buildStack(F, S.ax, cfg.body);
        if (cfg.head) S.head = buildStack(F, S.ax, cfg.head);
        S.cut = {};
        for (const k in cfg.cuts || {}) { const q = cfg.cuts[k]; let c = cutout(sp0(q[2]) || src, q[0], q[1]); if (c && q[3]) c = alignCut(c, q[3][0], q[3][1]); S.cut[k] = c; }
        const B = editable(F);
        if (cfg.back) cfg.back(B, S, L);
        S.backSrc = B;
        if (cfg.prep) cfg.prep(S, src);
      },
      pose: cfg.pose || bipedPose,
      draw(C, S, th, axT, P, v) {
        const x = { C, S, th, axT, P, v, sn: Math.sin(th), cs: Math.cos(th), back: v >= 3, atk: P.atk || 0 };
        x.ym = ymapper(S, P); x.sh = shearer(S, P, th); x.row = ys => rowT(S, P, ys);
        x.lean = (P.lean || 0) * x.sn;
        x.front = 7 * Math.max(0, x.cs);   // hands and arms sit proud of the cloth when they face us
        if (cfg.legs) cfg.legs(x); else if (S.cut.bootR) boots(C, S, th, axT, P, v, S.cut.bootR, S.cut.bootL, cfg.bootL[0], cfg.bootL[1], cfg.bootRow);
        drawStack(C, S, S.body, th, S.ax, axT, x.ym, x.sh, 1, cfg.bodyOpt);
        if (S.head) drawStack(C, S, S.head, th, S.ax, axT + (cfg.headLean == null ? 1 : cfg.headLean) * x.lean, headMap(x.ym, x.atk === 2 ? (cfg.headDrop == null ? 4 : cfg.headDrop) : 0), null, 2, cfg.headOpt);
        if (cfg.dress) cfg.dress(x);
      },
    };
  }
  const sp0 = n => (n ? Engine.sprites[n] : null);

  // An arm: shoulder -> elbow -> hand in the body frame (f, l, canvas y), a sleeve patch, a hand cut-out.
  function arm(x, sh, hand, o) {
    o = o || {};
    const fz = o.dz == null ? x.front : o.dz;
    const el = o.elbow || { f: (sh.f + hand.f) / 2 - (o.bend == null ? 3 : o.bend), l: (sh.l + hand.l) / 2 + (sh.l > 0 ? 2 : -2), y: (sh.y + hand.y) / 2 + 2 };
    const w0 = o.w0 || 10, w1 = o.w1 || 8, w2 = o.w2 || 7, pt = x.S.pt[o.pt || 'sleeve'], sh2 = o.shade || (sh.l * x.cs < 0 && !x.back ? 0.86 : 1);
    drawLimb(x.C, x.th, x.axT, Object.assign({ dz: fz }, sh), Object.assign({ dz: fz + 1 }, el), w0, w1, pt, o.id || 30, sh2);
    drawLimb(x.C, x.th, x.axT, Object.assign({ dz: fz + 1 }, el), Object.assign({ dz: fz + 2 }, hand), w1, w2, pt, (o.id || 30) + 1, sh2);
    if (o.hand) drawCut(x.C, o.hand, x.th, x.axT, hand.f, hand.l, hand.y, o.handRot || 0, { dz: fz + 3, mirror: x.back, shade: x.back ? 0.8 : 1, id: (o.id || 30) + 2 });
  }

  // ---------------------------------------------------------------- Cutter-Man (marine)
  // Office boarding crew: grey oilcloth hooded coat with a shoulder mantle, a blank face-plate in the
  // hood, crossed leather straps and a belt with pouches, a coiled grapnel line in the right hand and
  // a cudgel in the left. Attack: the grapnel swung up two-handed (a1) and driven down (a2).
  SP.marine = humanoid({
    W: 112, axT: 52, knee: 112, hip: 92,
    patches: { cloth: [28, 100, 16, 40], hood: [13, 14, 6, 24], mantle: [44, 44, 12, 10], sleeve: [50, 58, 8, 16] },
    sil: [[[22, 2], [42, 2], [50, 40], [58, 46], [58, 62], [55, 80], [57, 120], [61, 150], [6, 150], [8, 110], [9, 70], [6, 52], [14, 40]]],
    lift: [
      { poly: [[[0, 50], [12, 50], [19, 58], [21, 70], [22, 150], [0, 150]]], axis: 22.5 },
      { poly: [[[51, 48], [75, 14], [75, 100], [53, 100], [53, 70]]], axis: 51.5 },
    ],
    body: { mask: [[[0, 40], [75, 40], [75, 150], [0, 150]]], depth: (y, al) => (y < 56 ? al * 0.6 : y < 72 ? al * 0.66 : al * 0.74), fwd: y => (y < 56 ? -1 : y > 120 ? 1 : 0) },
    head: { mask: [[[17, 0], [47, 0], [50, 40], [14, 40]]], depth: (y, al) => al * (y < 10 ? 1.1 : 0.98), fwd: y => (y < 12 ? -6 + y * 0.45 : y > 34 ? -1 : 0) },
    cuts: {
      armR: [[[[0, 50], [12, 50], [19, 58], [21, 70], [22, 150], [0, 150]]], [12, 54]],
      armL: [[[[51, 48], [75, 14], [75, 100], [53, 100], [53, 70]]], [54, 54]],
      bootR: [[[[6, 146], [30, 146], [30, 160], [6, 160]]], [18, 147]],
      bootL: [[[[36, 146], [60, 146], [60, 160], [36, 160]]], [48, 147]],
      coil: [[[[0, 60], [24, 60], [24, 120], [0, 120]]], [12, 64]],
      grap: [[[[0, 26], [44, 4], [50, 0], [68, 0], [68, 24], [50, 24], [22, 42], [0, 46]]], [12, 35], 'marine_a1', [44, -25]],
    },
    bootL: [-10, 12], bootRow: 147,
    back(B, S) {
      paintOut(B, [[[20, 9], [44, 9], [45, 44], [19, 44]]], S.pt.hood, { grain: 0, smooth: 80 });
      paintOut(B, [[[18, 42], [50, 42], [52, 62], [16, 62]]], S.pt.mantle, { grain: 0.9, smooth: 40, vert: 0.4, from: [[[0, 43], [75, 43], [75, 62], [0, 62]]] });
      clone(B, 18, 96, 38, 26, 18, 70);
      clone(B, 21, 63, 9, 7, 30, 63); clone(B, 21, 63, 9, 7, 39, 63);
      const ax = Math.round(S.ax);
      for (let y = 6; y < 150; y++) { const i = y * B.w + ax; if (L.solidPx(B.data[i]) && (y < 41 || y > 70)) B.data[i] = mul(B.data[i], 0.75); }
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(54);
      if (!x.atk) {
        const sw = (P.swing || 0) * 9;
        hangArm(C, S.cut.armR, th, axT, P, v, -19, shY, sw, 21);
        hangArm(C, S.cut.armL, th, axT, P, v, 21, shY, -sw, 22);
        return;
      }
      drawCut(C, S.cut.coil, th, axT, -2, -18, x.row(66), 0, { kx: 0.8, shade: 0.9, dz: 1, id: 21 });
      const up = x.atk === 1;
      const hand = up ? { f: 2, l: -15, y: x.row(30) } : { f: 21, l: 0, y: x.row(100) };
      for (const l of [-22, 22]) arm(x, { f: 8, l, y: shY + 1 }, hand, { w0: 11, w1: 9, w2: 8, id: l > 0 ? 30 : 34 });
      drawAlong(C, S.cut.grap, th, axT, hand, up ? { f: -0.55, l: 0.5, up: 0.5 } : { f: 0.7, l: 0.1, up: -0.7 }, { dz: 6, id: 40 });
    },
  });

  // A crossbow in the body frame: stock from rear to front, the prod (bow) across its front end.
  function crossbow(x, rear, front, o) {
    o = o || {};
    const pt = x.S.pt.wood, dz = x.front + 4;
    drawLimb(x.C, x.th, x.axT, Object.assign({ dz }, rear), Object.assign({ dz }, front), 5, 4, pt, 50, 1);
    const half = 13, back = 4, f = front.f - 1;
    for (const s of [-1, 1]) drawLimb(x.C, x.th, x.axT, { f, l: front.l, y: front.y, dz }, { f: f - back, l: front.l + s * half, y: front.y + 1, dz }, 3, 2, x.S.pt.steel || pt, 52, 0.95);
  }

  // ---------------------------------------------------------------- Office Outrider
  // A crossbowman of the Arbiter's column in a grey oilskin greatcoat and a tricorn, his face behind
  // a dark leather mask, the crossbow carried across the chest; belt, powder flask, high boots.
  // Attack: the crossbow brought up to the eye (a1) and its kick as it looses (a2).
  SP.outrider = humanoid({
    W: 116, axT: 54, knee: 112, hip: 64,
    pose(pose) {
      if (pose === '_a1') return { atk: 1 };
      if (pose === '_a2') return { atk: 2, lean: -3 };
      return bipedPose(pose);
    },
    headDrop: 0,
    patches: { cloth: [8, 98, 20, 28], collar: [16, 26, 8, 8], sleeve: [4, 32, 10, 18], wood: [40, 46, 16, 4], hat: [20, 2, 24, 8] },
    sil: [[[14, 0], [52, 0], [52, 22], [58, 28], [61, 36], [58, 58], [64, 96], [70, 132], [4, 132], [10, 96], [14, 58], [10, 36], [13, 28], [16, 22]]],
    lift: [
      { poly: [[[0, 28], [77, 28], [77, 57], [0, 57]]], pt: 'cloth', mode: 'onion', tol: 60, grain: 0.9 },
    ],
    body: { mask: [[[0, 24], [77, 24], [77, 133], [0, 133]]], depth: (y, al) => (y < 60 ? al * 0.6 : al * 0.62), fwd: y => (y < 40 ? 0 : y > 100 ? 1 : 0) },
    head: { mask: [[[12, 0], [54, 0], [54, 24], [12, 24]]], depth: (y, al) => (y < 13 ? al * 0.95 : al * 0.82), fwd: y => (y < 13 ? -1 : 1) },
    cuts: {
      bootR: [[[[6, 128], [30, 128], [30, 160], [6, 160]]], [18, 129]],
      bootL: [[[[40, 128], [66, 128], [66, 160], [40, 160]]], [52, 129]],
      hand: [[[[17, 43], [28, 43], [28, 54], [17, 54]]], [22, 48]],
    },
    legs(x) {
      const { C, S, th, axT, P, v } = x, step = P.step || 0, back = v >= 3;
      const kx = 0.8 + 0.4 * Math.abs(x.sn), y0 = x.row(129);
      drawCut(C, S.cut.bootR, th, axT, -6 * step, -13, y0 + (step < 0 ? -2 : 0), -step * 6 * x.sn, { kx, mirror: back, shade: 0.92, id: 11 });
      drawCut(C, S.cut.bootL, th, axT, 6 * step, 13, y0 + (step > 0 ? -2 : 0), step * 6 * x.sn, { kx, mirror: back, shade: 0.92, id: 12 });
    },
    back(B, S) {
      paintOut(B, [[[22, 11], [44, 11], [46, 27], [20, 27]]], S.pt.collar, { grain: 0.8, smooth: 20 });       // the mask: the back of the head and the collar
      paintOut(B, [[[28, 56], [40, 56], [40, 70], [28, 70]]], S.pt.cloth, { grain: 0.5, smooth: 30 });       // the buckle
      paintOut(B, [[[40, 70], [58, 70], [58, 102], [40, 102]], [[29, 70], [37, 70], [37, 130], [29, 130]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.6 });   // flask and buttons
      // a vent seam up the back of the coat
      const ax = Math.round(S.ax);
      for (let y = 96; y < 132; y++) { const i = y * B.w + ax; if (L.solidPx(B.data[i])) B.data[i] = mul(B.data[i], 0.6); }
    },
    dress(x) {
      const { S, P } = x, atk = x.atk, sw = (P.swing || 0) * 2;
      let rear, front;
      if (atk === 1) { rear = { f: 4, l: -7, y: x.row(21) }; front = { f: 36, l: -5, y: x.row(22) }; }
      else if (atk === 2) { rear = { f: 4, l: -7, y: x.row(22) }; front = { f: 33, l: -5, y: x.row(12) }; }
      else { rear = { f: 8, l: -10, y: x.row(50) + sw }; front = { f: 32, l: -2, y: x.row(54) + sw }; }
      const grip = { f: rear.f + 4, l: rear.l, y: rear.y + 3 }, fore = { f: rear.f + (front.f - rear.f) * 0.6, l: -3, y: rear.y + (front.y - rear.y) * 0.6 + 3 };
      crossbow(x, rear, front);
      const shY = x.row(32);
      arm(x, { f: 3, l: -20, y: shY }, grip, { hand: S.cut.hand, w0: 11, w1: 9, w2: 8, bend: atk ? -6 : 4, id: 30 });
      arm(x, { f: 3, l: 20, y: shY }, fore, { hand: S.cut.hand, w0: 11, w1: 9, w2: 8, bend: atk ? -4 : 2, id: 34 });
    },
  });

  // Generic stride: two leg/boot cut-outs swung along the heading.
  function stride(x, R_, L_, lR, lL, yRow, k) {
    const { C, th, axT, P, v } = x, step = P.step || 0, back = v >= 3, kx = 0.8 + 0.4 * Math.abs(x.sn), y0 = x.row(yRow), a = (k || 6);
    drawCut(C, R_, th, axT, -a * step, lR, y0 + (step < 0 ? -2 : 0), -step * a * x.sn, { kx, mirror: back, shade: 0.92, id: 11 });
    drawCut(C, L_, th, axT, a * step, lL, y0 + (step > 0 ? -2 : 0), step * a * x.sn, { kx, mirror: back, shade: 0.92, id: 12 });
  }

  // ---------------------------------------------------------------- Tongueless of the Quiet Faith
  // A brother of the Quiet Faith: a sand-coloured habit and deep hood, a rope girdle, a hand-bell he
  // never rings in his left hand and a reaping hook in his right. Attack: the hook raised (a1) and
  // swept across (a2).
  SP.tongueless = humanoid({
    W: 108, axT: 52, knee: 110, hip: 62,
    patches: { cloth: [20, 104, 26, 30], hood: [44, 8, 6, 22], sleeve: [4, 50, 9, 22], cord: [30, 58, 10, 4] },
    sil: [[[20, 0], [48, 0], [54, 40], [53, 60], [57, 100], [62, 140], [7, 140], [12, 100], [16, 60], [15, 40]]],
    lift: [
      { poly: [[[0, 38], [17, 40], [17, 132], [0, 132]]], axis: 17.5 },
      { poly: [[[52, 40], [69, 40], [69, 106], [52, 106]]], axis: 51.5 },
    ],
    body: { mask: [[[0, 34], [69, 34], [69, 140], [0, 140]]], depth: (y, al) => (y < 60 ? al * 0.62 : al * 0.72), fwd: y => (y > 110 ? 1 : 0) },
    head: { mask: [[[16, 0], [52, 0], [54, 34], [14, 34]]], depth: (y, al) => al * 1.0, fwd: y => (y < 10 ? -3 : 0) },
    cuts: {
      armR: [[[[0, 38], [17, 40], [17, 132], [0, 132]]], [12, 42]],
      armL: [[[[52, 40], [69, 40], [69, 106], [52, 106]]], [56, 42]],
      bootR: [[[[6, 134], [31, 134], [31, 160], [6, 160]]], [19, 135]],
      bootL: [[[[38, 134], [64, 134], [64, 160], [38, 160]]], [51, 135]],
      hook: [[[[0, 0], [56, 0], [56, 10], [32, 10], [20, 34], [0, 36]]], [9, 26], 'tongueless_a1', [38, -24]],
      hand: [[[[3, 80], [13, 80], [13, 94], [3, 94]]], [8, 84]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -12, 14, 135); },
    back(B, S) {
      paintOut(B, [[[23, 5], [45, 5], [46, 34], [22, 34]]], S.pt.hood, { grain: 0.15, smooth: 60 });
      paintOut(B, [[[29, 62], [39, 62], [39, 104], [29, 104]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
      const ax = Math.round(S.ax);
      for (let y = 4; y < 34; y++) { const i = y * B.w + ax; if (L.solidPx(B.data[i])) B.data[i] = mul(B.data[i], 0.8); }   // the hood's back seam
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(42), sw = (P.swing || 0) * 8;
      if (!x.atk) { hangArm(C, S.cut.armR, th, axT, P, v, -20, shY, sw, 21); hangArm(C, S.cut.armL, th, axT, P, v, 20, shY, -sw, 22); return; }
      hangArm(C, S.cut.armL, th, axT, P, v, 20, shY, x.atk === 2 ? 14 : -6, 22);
      const hand = x.atk === 1 ? { f: -2, l: -20, y: x.row(12) } : { f: 22, l: 6, y: x.row(60) };
      arm(x, { f: 3, l: -21, y: shY }, hand, { w0: 13, w1: 11, w2: 9, bend: x.atk === 1 ? 2 : -2, id: 30 });
      drawAlong(C, S.cut.hook, th, axT, hand, x.atk === 1 ? { f: -0.3, l: -0.35, up: 0.9 } : { f: 0.35, l: 0.9, up: 0.1 }, { dz: x.front + 6, id: 40 });
    },
  });

  // ---------------------------------------------------------------- Pressman Mallow
  // Office of the Catalogue, Second Pressings: a grey pressing-coat with a deep pointed hood, a brass
  // hand-press strapped to his back and rising over his head, a long iron rod in his right hand, a
  // chain belt and the round-book on its chain. Attack: the rod raised two-handed while the press
  // over his shoulders heats (a1), then brought down (a2). [PROPOSED: the press's glow in the strike
  // follows the painted attack frames.]
  SP.pressman = humanoid({
    W: 120, axT: 58, knee: 118, hip: 82,
    patches: { cloth: [24, 120, 22, 34], hood: [28, 40, 6, 20], mantle: [56, 56, 8, 14], sleeve: [62, 70, 8, 16], brass: [24, 8, 30, 6] },
    sil: [[[29, 22], [47, 22], [52, 50], [64, 56], [64, 80], [62, 120], [68, 160], [6, 160], [12, 120], [14, 80], [14, 56], [25, 50]]],
    lift: [
      { poly: [[[0, 18], [17, 18], [17, 168], [0, 168]], [[17, 18], [28, 18], [26, 50], [17, 54]], [[48, 18], [64, 18], [64, 54], [50, 50]]], axis: 17.5 },
      { poly: [[[58, 76], [80, 76], [80, 118], [60, 118]]], axis: 57.5 },
    ],
    body: { mask: [[[0, 50], [80, 50], [80, 162], [0, 162]]], depth: (y, al) => (y < 80 ? al * 0.6 : al * 0.7), fwd: y => (y > 130 ? 1 : 0) },
    head: { mask: [[[25, 22], [51, 22], [52, 70], [24, 70]]], depth: (y, al) => al * 0.95, fwd: y => (y < 34 ? -2 : 1) },
    cuts: {
      press: [[[[8, 0], [66, 0], [66, 56], [8, 56]]], [37, 50]],
      rod: [[[[2, 22], [12, 22], [14, 168], [4, 168]]], [8, 80], null, [2, 146]],
      armL: [[[[58, 60], [80, 60], [80, 118], [60, 118]]], [62, 64]],
      hand: [[[[2, 72], [16, 72], [16, 90], [2, 90]]], [9, 80]],
      bootR: [[[[14, 158], [36, 158], [36, 170], [14, 170]]], [25, 159]],
      bootL: [[[[42, 158], [64, 158], [64, 170], [42, 170]]], [53, 159]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -14, 14, 159, 5); },
    prep(S, src) {
      // the press: the hood hid its middle in the painting, so its screw and platen are painted in
      const c = S.cut.press, dx = c.px - 37, dy = c.py - 50, m = L.polyMask(c.w, c.h, [[[25 + dx, 21 + dy], [52 + dx, 21 + dy], [52 + dx, 58 + dy], [25 + dx, 58 + dy]]]);
      const fill = new Uint8Array(c.w * c.h), known = new Uint8Array(c.w * c.h);
      for (let i = 0; i < c.data.length; i++) { if (m[i]) fill[i] = 1; else if (L.solidPx(c.data[i])) known[i] = 1; }
      for (let i = 0; i < c.data.length; i++) if (m[i]) c.data[i] = 0xff000000;
      L.inpaint(c, fill, known, S.pt.brass, { vertical: true, grain: 0.5 });
      // the screw down the middle, darker
      for (let y = 8; y < c.h - 4; y++) for (const xx of [37 + dx, 38 + dx, 39 + dx]) { const i = y * c.w + xx; if (L.solidPx(c.data[i])) c.data[i] = mul(c.data[i], xx === 38 + dx ? 0.65 : 0.85); }
      // hand-placed: the platen and the bed, brass plates across the frame, and the screw between
      const bar = (y0, y1, x0, x1, f) => { for (let y = y0 + dy; y < y1 + dy; y++) for (let xx = x0 + dx; xx < x1 + dx; xx++) { if (y < 0 || y >= c.h || xx < 0 || xx >= c.w) continue; const edge = y === y0 + dy || y === y1 + dy - 1; c.data[y * c.w + xx] = mul(tap(S.pt.brass, xx, y), edge ? f * 0.6 : f) | 0xff000000; } };
      bar(16, 54, 36, 41, 0.9); bar(30, 35, 22, 56, 1.05); bar(50, 56, 20, 58, 0.95);
      S.pressHot = { w: c.w, h: c.h, px: c.px, py: c.py, data: c.data.map(p => { if (!L.solidPx(p)) return 0; const warm = L.R(p) > L.Bn(p) + 18; return warm ? (mix(mul(p, 1.5), hex('#ffe27a'), 0.45) | 0xff000000) >>> 0 : p; }) };
    },
    back(B, S) {
      paintOut(B, [[[28, 34], [48, 34], [48, 68], [28, 68]]], S.pt.hood, { grain: 0.4, smooth: 50 });
      paintOut(B, [[[30, 76], [44, 76], [44, 86], [30, 86]], [[42, 84], [58, 84], [58, 118], [42, 118]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.6 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(58), sw = (P.swing || 0) * 7, cs = x.cs;
      // the press rides on his back: behind him from the front, over him from behind
      const hot = x.atk ? S.pressHot : S.cut.press;
      drawCut(C, hot, th, axT, -14, 0, x.row(50) + (x.atk === 2 ? 6 : 0), 0, { kx: Math.max(0.42, Math.abs(cs)), mirror: x.back, shade: x.back ? 0.95 : 1, id: 60 });
      if (!x.atk) {
        const hand = { f: 4, l: -24, y: x.row(80) };
        arm(x, { f: 0, l: -22, y: shY }, hand, { w0: 12, w1: 10, w2: 9, bend: -2, id: 30, hand: S.cut.hand });
        drawAlong(C, S.cut.rod, th, axT, hand, { f: 0.06 * (P.swing || 0), l: 0, up: -1 }, { dz: x.front + 4, id: 40 });
        hangArm(C, S.cut.armL, th, axT, P, v, 24, shY, -sw, 22);
        return;
      }
      const up = x.atk === 1;
      const hand = up ? { f: 4, l: -16, y: x.row(30) } : { f: 22, l: -2, y: x.row(100) };
      for (const l of [-22, 22]) arm(x, { f: 2, l, y: shY }, hand, { w0: 12, w1: 10, w2: 9, bend: up ? 0 : -3, id: l < 0 ? 30 : 34, hand: l < 0 ? S.cut.hand : null });
      drawAlong(C, S.cut.rod, th, axT, hand, up ? { f: -0.2, l: 0.5, up: 0.85 } : { f: 0.35, l: 0.05, up: -0.95 }, { dz: x.front + 6, id: 40, kx: 0.8 });
    },
  });

  // ---------------------------------------------------------------- Chord-Warden
  // A marble choirmaster in gilt vestments and a tall mitre, the mouth open on a note; a trident
  // crozier in the right hand, the left hand open in a wide sleeve. It moves slowly. Attack: the
  // crozier lifted across the body (a1) and driven down into the ground before it (a2).
  SP.warden = humanoid({
    W: 124, axT: 58, knee: 128, hip: 100,
    patches: { cloth: [24, 150, 20, 30], marble: [56, 140, 10, 30], sleeve: [58, 72, 10, 22], gilt: [22, 52, 30, 6] },
    sil: [[[30, 14], [48, 14], [50, 50], [58, 56], [62, 90], [62, 140], [66, 186], [8, 186], [14, 140], [16, 90], [18, 56], [28, 50]]],
    lift: [
      { poly: [[[0, 0], [15, 0], [17, 92], [16, 188], [0, 188]]], axis: 16.5 },
      { poly: [[[56, 58], [81, 58], [81, 126], [58, 126]]], axis: 56.5 },
    ],
    body: { mask: [[[0, 48], [81, 48], [81, 187], [0, 187]]], depth: (y, al) => (y < 90 ? al * 0.58 : al * 0.74), fwd: y => (y > 150 ? 2 : 0) },
    head: { mask: [[[26, 12], [52, 12], [52, 52], [26, 52]]], depth: (y, al) => (y < 32 ? al * 0.75 : al * 0.95), fwd: y => (y < 32 ? -1 : 1) },
    headDrop: 6,
    cuts: {
      staff: [[[[0, 0], [14, 0], [14, 184], [0, 184]]], [8, 84], null, [-2, -84]],
      hand: [[[[2, 74], [16, 74], [16, 92], [2, 92]]], [9, 82]],
      armL: [[[[56, 58], [81, 58], [81, 126], [58, 126]]], [60, 62]],
      bootR: [[[[16, 176], [40, 176], [40, 190], [16, 190]]], [28, 177]],
      bootL: [[[[40, 176], [64, 176], [64, 190], [40, 190]]], [52, 177]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -10, 12, 177, 4); },
    back(B, S) {
      // a chasuble is worked on the back as well as the front: the orphreys stay, the face goes
      paintOut(B, [[[30, 24], [48, 24], [48, 52], [30, 52]]], S.pt.marble, { grain: 0.3, smooth: 60 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(60), sw = (P.swing || 0) * 5;
      if (!x.atk) {
        const hand = { f: 4, l: -28, y: x.row(84) };
        arm(x, { f: 0, l: -22, y: shY }, hand, { w0: 14, w1: 12, w2: 10, bend: -2, id: 30, hand: S.cut.hand });
        drawAlong(C, S.cut.staff, th, axT, hand, { f: 0.05 * (P.swing || 0), l: 0, up: 1 }, { dz: x.front + 4, id: 40 });
        hangArm(C, S.cut.armL, th, axT, P, v, 26, shY, -sw, 22);
        return;
      }
      const up = x.atk === 1;
      const hand = up ? { f: 10, l: -8, y: x.row(64) } : { f: 22, l: 0, y: x.row(96) };
      for (const l of [-22, 22]) arm(x, { f: 2, l, y: shY }, hand, { w0: 14, w1: 12, w2: 10, bend: -3, id: l < 0 ? 30 : 34, hand: l < 0 ? S.cut.hand : null });
      drawAlong(C, S.cut.staff, th, axT, hand, up ? { f: 0.3, l: 0.6, up: 0.75 } : { f: 0.25, l: 0, up: -1 }, { dz: x.front + 6, id: 40 });
    },
  });

  // ---------------------------------------------------------------- The Wearer
  // It wears Tobin Ashgrove: his long brown coat hanging open on a body of shadow, a pale face with a
  // cantor's mark on the brow, long arms and clawed, pale-lit hands. Attack: the arms flung wide (a1),
  // then the lunge with both claws reaching (a2).
  SP.wearer = humanoid({
    W: 132, axT: 66, knee: 104, hip: 70,
    pose(pose) { if (pose === '_a2') return { atk: 2, lean: 9 }; return bipedPose(pose); },
    patches: { cloth: [8, 50, 14, 60], dark: [26, 60, 12, 40], sleeve: [2, 40, 8, 30], hair: [18, 2, 6, 14] },
    sil: [[[18, 0], [44, 0], [46, 22], [52, 28], [52, 70], [56, 126], [8, 126], [12, 70], [11, 28], [16, 22]]],
    lift: [
      { poly: [[[0, 26], [13, 26], [13, 106], [0, 106]]], axis: 13.5 },
      { poly: [[[50, 26], [63, 26], [63, 106], [50, 106]]], axis: 49.5 },
    ],
    body: { mask: [[[0, 22], [63, 22], [63, 127], [0, 127]]], depth: (y, al) => (y < 60 ? al * 0.6 : al * 0.66), fwd: y => 0 },
    head: { mask: [[[16, 0], [46, 0], [46, 24], [16, 24]]], depth: (y, al) => al * (y < 6 ? 0.55 + y * 0.07 : 0.9), fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 26], [13, 26], [13, 106], [0, 106]]], [8, 30]],
      armL: [[[[50, 26], [63, 26], [63, 106], [50, 106]]], [55, 30]],
      clawR: [[[[0, 78], [12, 78], [12, 104], [0, 104]]], [6, 80]],
      clawL: [[[[51, 80], [63, 80], [63, 104], [51, 104]]], [57, 82]],
      legR: [[[[13, 108], [31, 108], [31, 160], [13, 160]]], [22, 110]],
      legL: [[[[31, 108], [51, 108], [51, 160], [31, 160]]], [41, 110]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 10, 110, 7); },
    back(B, S) {
      // the back of his head: hair, no face, no mark; the coat's back is whole (no open front)
      paintOut(B, [[[22, 4], [42, 4], [42, 24], [22, 24]]], S.pt.hair, { grain: 0.6, smooth: 30 });
      paintOut(B, [[[20, 28], [44, 28], [46, 124], [18, 124]]], S.pt.cloth, { grain: 0.45, smooth: 200, like: S.pt.cloth.mean, tol: 50 });
      const ax = Math.round(S.ax);
      for (let y = 30; y < 124; y++) { const i = y * B.w + ax; if (L.solidPx(B.data[i])) B.data[i] = mul(B.data[i], 0.7); }
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(30), sw = (P.swing || 0) * 10;
      if (!x.atk) { hangArm(C, S.cut.armR, th, axT, P, v, -21, shY, sw, 21); hangArm(C, S.cut.armL, th, axT, P, v, 21, shY, -sw, 22); return; }
      const wide = x.atk === 1;
      for (const s of [-1, 1]) {
        const hand = wide ? { f: 4, l: s * 54, y: x.row(58) } : { f: 34, l: s * 9, y: x.row(48) };
        arm(x, { f: 0, l: s * 20, y: shY }, hand, { w0: 9, w1: 8, w2: 6, bend: wide ? 0 : -4, id: s < 0 ? 30 : 34, hand: s < 0 ? S.cut.clawR : S.cut.clawL, handRot: wide ? -s * 70 : -s * 20 });
      }
    },
  });

  // A painted arm swung as one piece from its shoulder toward a body-frame direction (it foreshortens
  // when it points at the viewer). Used by the long-armed horrors.
  function swingArm(x, cut, sh, dir, o) {
    o = o || {};
    drawAlong(x.C, cut, x.th, x.axT, sh, dir, { dz: (o.dz == null ? x.front : o.dz) + 1, id: o.id || 30, shade: x.back && !o.keep ? 0.82 : 1, ky: o.ky });
  }
  const down = (sw, out) => ({ f: sw || 0, l: out || 0, up: -1 });

  // ---------------------------------------------------------------- A Hollow (the Long Night's foe)
  // The Book One Hollow drawing walked as a foe (js/longnight17.js): a gaunt, pale, barefoot figure in
  // a grey smock, arms hanging. It drags a foot (walk) and leans in (a1) to reach for you (a2).
  SP.ln17_hollow = humanoid({
    line: 0.8, W: 96, axT: 48, knee: 112, hip: 64,
    pose(pose) {
      if (pose === '_w1') return { step: 1, swing: 1, lean: 2 };
      if (pose === '_w2') return { step: -1, swing: -1, lean: -1 };
      if (pose === '_a1') return { atk: 1, lean: 5 };
      if (pose === '_a2') return { atk: 2, lean: 8 };
      return bipedPose(pose);
    },
    headDrop: 0,
    patches: { cloth: [18, 96, 14, 22], hair: [16, 2, 6, 8], skin: [6, 50, 3, 20] },
    sil: [[[14, 0], [37, 0], [38, 26], [42, 32], [41, 70], [42, 122], [9, 122], [10, 70], [9, 32], [13, 26]]],
    lift: [
      { poly: [[[0, 28], [10, 30], [10, 96], [0, 96]]], axis: 10.5 },
      { poly: [[[41, 30], [51, 28], [51, 96], [41, 96]]], axis: 40.5 },
    ],
    body: { mask: [[[0, 26], [51, 26], [51, 122], [0, 122]]], depth: (y, al) => al * 0.62, fwd: y => 0 },
    head: { mask: [[[12, 0], [39, 0], [39, 27], [12, 27]]], depth: (y, al) => al * (y < 5 ? 0.7 : 1.0), fwd: y => (y > 18 ? 1 : 0) },
    cuts: {
      armR: [[[[0, 28], [10, 30], [11, 96], [0, 96]]], [6, 32], null, [0, 60]],
      armL: [[[[41, 30], [51, 28], [51, 96], [40, 96]]], [45, 32], null, [0, 60]],
      legR: [[[[9, 118], [26, 118], [26, 160], [9, 160]]], [18, 120]],
      legL: [[[[26, 118], [43, 118], [43, 160], [26, 160]]], [34, 120]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -8, 8, 120, 5); },
    back(B, S) {
      paintOut(B, [[[17, 6], [34, 6], [34, 26], [17, 26]]], S.pt.hair, { grain: 0.4, smooth: 40 });
      paintOut(B, [[[16, 30], [36, 30], [36, 60], [16, 60]]], S.pt.cloth, { grain: 0.6, smooth: 100, like: S.pt.cloth.mean, tol: 60 });
    },
    dress(x) {
      const { S, P } = x, sw = (P.swing || 0) * 0.25, shY = x.row(31);
      const reach = x.atk === 2 ? { f: 1, l: 0.08, up: 0.12 } : x.atk === 1 ? { f: 0.55, l: 0.05, up: -0.7 } : null;
      swingArm(x, S.cut.armR, { f: 0, l: -17, y: shY }, reach ? Object.assign({}, reach, { l: -reach.l }) : down(sw));
      swingArm(x, S.cut.armL, { f: 0, l: 17, y: shY }, reach || down(-sw), { id: 34 });
    },
  });

  // ---------------------------------------------------------------- A Quiet
  // A hole in the world: a man-shaped absence with smoke curling off its edges. It has no face, no
  // front and no back, but it turns: its shoulders and arms show which way it goes. Attack: the arms
  // thrown up (a1), then reaching wide and low (a2).
  SP.quiet = humanoid({
    line: 1, W: 112, axT: 56, knee: 110, hip: 70,
    pose(pose) {
      if (pose === '_w1') return { swing: 1, lean: 3 };
      if (pose === '_w2') return { swing: -1, lean: -3 };
      if (pose === '_a1') return { atk: 1, lean: -2 };
      if (pose === '_a2') return { atk: 2, lean: 6 };
      return {};
    },
    headDrop: 0,
    sil: [[[22, 4], [44, 4], [46, 30], [50, 40], [48, 100], [50, 160], [16, 160], [18, 100], [16, 40], [20, 30]]],
    lift: [],
    // its silhouette is the black, not the smoke around it; it is painted as an absence
    body: { mask: [[[16, 28], [50, 28], [50, 104], [16, 104]]], depth: (y, al) => al * 0.62, fwd: y => 0, smooth: 4, solid: p => L.solidPx(p) && L.lum(p) < 55 },
    head: { mask: [[[16, 0], [50, 0], [50, 29], [16, 29]]], depth: (y, al) => al * 0.9, fwd: y => 0, smooth: 2, solid: p => L.solidPx(p) && L.lum(p) < 55 },
    bodyOpt: { paint: (row, y, sphi, cphi, x, yt, lit) => L.pack(10 + 6 * lit + 3 * L.hash(x >> 1, yt >> 1, 7), 8 + 5 * lit, 9 + 5 * lit) },
    headOpt: { paint: (row, y, sphi, cphi, x, yt, lit) => L.pack(10 + 6 * lit + 3 * L.hash(x >> 1, yt >> 1, 7), 8 + 5 * lit, 9 + 5 * lit) },
    cuts: {
      armR: [[[[0, 34], [19, 36], [19, 106], [0, 106]]], [14, 38], null, [-6, 62]],
      armL: [[[[47, 36], [66, 34], [66, 106], [47, 106]]], [52, 38], null, [6, 62]],
      legR: [[[[12, 100], [33, 100], [33, 160], [12, 160]]], [24, 102]],
      legL: [[[[33, 100], [54, 100], [54, 160], [33, 160]]], [42, 102]],
    },
    prep(S) {
      // the cut limbs keep only their black: the smoke is grown again round the new outline
      const v = p => (L.solidPx(p) && L.lum(p) < 80 ? L.pack(12, 10, 11) : 0);
      for (const k of ['armR', 'armL', 'legR', 'legL']) { const c = S.cut[k]; if (c) for (let i = 0; i < c.data.length; i++) c.data[i] = v(c.data[i]); }
    },
    legs(x) { const { C, S, th, axT } = x; const k = 0.8 + 0.3 * Math.abs(x.sn), y0 = x.row(102);
      drawCut(C, S.cut.legR, th, axT, 0, -8, y0, 0, { kx: k, mirror: x.back, id: 11 }); drawCut(C, S.cut.legL, th, axT, 0, 9, y0, 0, { kx: k, mirror: x.back, id: 12 }); },
    back() {},
    dress(x) {
      const { S, P } = x, sw = (P.swing || 0) * 0.2, shY = x.row(38);
      let dR, dL;
      if (x.atk === 1) { dR = { f: 0.1, l: -0.75, up: 0.62 }; dL = { f: 0.1, l: 0.75, up: 0.62 }; }
      else if (x.atk === 2) { dR = { f: 0.8, l: -0.6, up: -0.2 }; dL = { f: 0.8, l: 0.6, up: -0.2 }; }
      else { dR = { f: sw, l: -0.12, up: -1 }; dL = { f: -sw, l: 0.12, up: -1 }; }
      swingArm(x, S.cut.armR, { f: 0, l: -15, y: shY }, dR, { keep: true });
      swingArm(x, S.cut.armL, { f: 0, l: 15, y: shY }, dL, { keep: true, id: 34 });
      L.halo(x.C, [hex('#4a4036'), hex('#8c7a5e'), hex('#6a5c48')], x.v * 1.7 + (P.swing || 0) + (x.atk || 0) * 3);
    },
  });

  // ---------------------------------------------------------------- The Requiem
  // A named horror of the Cacophony: an iron bell for a head, slit down the front, a cage of ribs
  // like organ-stops, a shroud of black tatters to the ground and long bone arms. Attack: the arms
  // spread like a choir-master's (a1) and the claws brought together in front (a2).
  SP.requiem = humanoid({
    line: 0.7, W: 200, axT: 100, knee: 150, hip: 100,
    pose(pose) {
      if (pose === '_w1') return { swing: 1, lean: 3 };
      if (pose === '_w2') return { swing: -1, lean: -2 };
      if (pose === '_a1') return { atk: 1, lean: -2 };
      if (pose === '_a2') return { atk: 2, lean: 7 };
      return {};
    },
    headDrop: 4,
    patches: { shroud: [10, 150, 30, 40], iron: [34, 10, 8, 24] },
    sil: [[[34, 0], [60, 0], [64, 40], [76, 50], [76, 120], [82, 205], [10, 205], [16, 120], [16, 50], [30, 40]]],
    lift: [
      { poly: [[[0, 54], [18, 54], [20, 150], [0, 150]]], axis: 18.5 },
      { poly: [[[74, 54], [93, 54], [93, 150], [72, 150]]], axis: 73.5 },
    ],
    body: { mask: [[[0, 42], [93, 42], [93, 210], [0, 210]]], depth: (y, al) => al * (y < 100 ? 0.6 : 0.7), fwd: y => 0, smooth: 3 },
    head: { mask: [[[28, 0], [66, 0], [66, 46], [28, 46]]], depth: (y, al) => al * 0.95, fwd: y => 0 },
    cuts: {
      armR: [[[[0, 54], [18, 54], [20, 150], [0, 150]]], [12, 58], null, [-2, 80]],
      armL: [[[[74, 54], [93, 54], [93, 150], [72, 150]]], [80, 58], null, [2, 80]],
    },
    legs() {},
    back(B, S) {
      // the bell's slit and the ribs are on its front; its back is iron and tatters
      paintOut(B, [[[42, 8], [52, 8], [52, 46], [42, 46]]], S.pt.iron, { grain: 0.5, smooth: 40 });
      clone(B, 20, 118, 54, 58, 20, 48);
    },
    dress(x) {
      const { S, P } = x, sw = (P.swing || 0) * 0.15, shY = x.row(56);
      let dR, dL;
      if (x.atk === 1) { dR = { f: 0.2, l: -0.9, up: 0.35 }; dL = { f: 0.2, l: 0.9, up: 0.35 }; }
      else if (x.atk === 2) { dR = { f: 0.9, l: 0.3, up: -0.25 }; dL = { f: 0.9, l: -0.3, up: -0.25 }; }
      else { dR = { f: sw, l: -0.15, up: -1 }; dL = { f: -sw, l: 0.15, up: -1 }; }
      swingArm(x, S.cut.armR, { f: 0, l: -28, y: shY }, dR);
      swingArm(x, S.cut.armL, { f: 0, l: 28, y: shY }, dL, { id: 34 });
    },
  });

  // ---------------------------------------------------------------- The Phantom Weaver
  // A named horror of the Cacophony: a hooded, eyeless face over a shroud woven of the forgotten
  // voices of Whisper-Grove (the faces are in the weave, front and back), long arms and longer
  // fingers. Attack: the arms thrown wide, threads between them (a1), then the hands drawn in (a2).
  SP.weaver = humanoid({
    line: 0.7, W: 230, axT: 115, knee: 140, hip: 90,
    pose(pose) {
      if (pose === '_w1') return { swing: 1, lean: 3 };
      if (pose === '_w2') return { swing: -1, lean: -2 };
      if (pose === '_a1') return { atk: 1 };
      if (pose === '_a2') return { atk: 2, lean: 6 };
      return {};
    },
    headDrop: 2,
    patches: { hood: [26, 8, 8, 20], weave: [20, 120, 40, 40] },
    sil: [[[30, 0], [54, 0], [58, 28], [70, 40], [70, 120], [80, 195], [8, 195], [16, 120], [16, 40], [28, 28]]],
    lift: [
      { poly: [[[0, 34], [27, 32], [23, 62], [17, 140], [0, 140]]], axis: 20.5 },
      { poly: [[[60, 32], [88, 34], [88, 140], [69, 140], [64, 62]]], axis: 66.5 },
    ],
    body: { mask: [[[0, 28], [88, 28], [88, 200], [0, 200]]], depth: (y, al) => al * 0.6, fwd: y => 0 },
    head: { mask: [[[26, 0], [58, 0], [58, 30], [26, 30]]], depth: (y, al) => al * 0.95, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 34], [27, 32], [23, 62], [17, 140], [0, 140]]], [20, 38], null, [-12, 80]],
      armL: [[[[60, 32], [88, 34], [88, 140], [69, 140], [64, 62]]], [68, 38], null, [12, 80]],
    },
    legs() {},
    back(B, S) { paintOut(B, [[[36, 6], [50, 6], [50, 30], [36, 30]]], S.pt.hood, { grain: 0.4, smooth: 50 }); },
    dress(x) {
      const { C, S, P } = x, sw = (P.swing || 0) * 0.15, shY = x.row(36);
      let dR, dL;
      if (x.atk === 1) { dR = { f: 0.1, l: -1, up: 0.15 }; dL = { f: 0.1, l: 1, up: 0.15 }; }
      else if (x.atk === 2) { dR = { f: 0.85, l: 0.25, up: -0.3 }; dL = { f: 0.85, l: -0.25, up: -0.3 }; }
      else { dR = { f: sw, l: -0.2, up: -1 }; dL = { f: -sw, l: 0.2, up: -1 }; }
      swingArm(x, S.cut.armR, { f: 0, l: -24, y: shY }, dR);
      swingArm(x, S.cut.armL, { f: 0, l: 24, y: shY }, dL, { id: 34 });
      if (x.atk === 1) {
        // lilac threads strung between the spread hands, sagging
        const reach = 70, P0 = proj(x.th, x.axT, dR.f * reach, -24 + dR.l * reach), P1 = proj(x.th, x.axT, dL.f * reach, 24 + dL.l * reach);
        const y0 = shY - dR.up * reach;
        for (let k = 0; k < 3; k++) for (let t = 0; t <= 160; t++) {
          const u = t / 160, sag = Math.sin(Math.PI * u) * (14 + k * 12);
          L.put(C, Math.round(P0.x + (P1.x - P0.x) * u), Math.round(y0 + k * 9 + sag), P0.z + (P1.z - P0.z) * u + 20, hex(k === 1 ? '#c58ee0' : '#9c6ab8'), 70);
        }
      }
    },
  });

  // ---------------------------------------------------------------- Weaverling
  // A spider of static and lilac thread with a cluster of little mouths, reared up on its legs. The
  // body turns as a body; each side's legs are hung twice, a fore pair and a hind pair, so that from
  // the side they splay forward and back. Walk: the pairs scissor. Attack: it rears, forelegs up (a1),
  // then lunges (a2).
  SP.weaverling = humanoid({
    W: 96, axT: 48, knee: 62, hip: 40, line: 0.92,
    pose(pose) {
      if (pose === '_w1') return { swing: 1 };
      if (pose === '_w2') return { swing: -1 };
      if (pose === '_a1') return { atk: 1, lean: -3 };
      if (pose === '_a2') return { atk: 2, lean: 6 };
      return {};
    },
    headDrop: 0,
    patches: { hide: [16, 14, 10, 12] },
    sil: [[[12, 0], [42, 0], [42, 56], [12, 56]]],
    lift: [],
    body: { mask: [[[11, 2], [43, 2], [43, 50], [36, 56], [18, 56], [11, 50]]], depth: (y, al) => al * 0.9, fwd: y => (y < 20 ? -2 : 0), smooth: 2 },
    cuts: {
      legsR: [[[[0, 28], [13, 28], [17, 50], [24, 52], [24, 80], [0, 80]]], [14, 32]],
      legsL: [[[[54, 28], [41, 28], [37, 50], [30, 52], [30, 80], [54, 80]]], [40, 32]],
      crown: [[[[16, 0], [38, 0], [38, 12], [16, 12]]], [27, 11]],
      spikesR: [[[[0, 8], [15, 8], [15, 30], [0, 30]]], [14, 18]],
      spikesL: [[[[39, 8], [54, 8], [54, 30], [39, 30]]], [40, 18]],
    },
    dress(x) {
      const { C, S, th, axT } = x, kx = Math.max(0.55, Math.abs(x.cs)), side = x.sn > 0.4;
      // the crown of static-tendrils, and the bristles down its flanks
      drawCut(C, S.cut.crown, th, axT, -2 + x.lean * 0.5, 0, x.row(11), 0, { kx, id: 15, dz: 6 * Math.abs(x.cs) });
      drawCut(C, S.cut.spikesR, th, axT, 0, -13, x.row(18), 0, { kx, mirror: side && x.v > 2, id: 16, dz: 8 * Math.abs(x.cs) });
      drawCut(C, S.cut.spikesL, th, axT, 0, 13, x.row(18), 0, { kx, mirror: side && x.v > 2, id: 17, dz: 8 * Math.abs(x.cs) });
    },
    legs(x) {
      const { C, S, th, axT, P } = x, cs = Math.abs(x.cs), y0 = x.row(32), sw = (P.swing || 0) * 9;
      const kx = 0.85 + 0.15 * cs;   // legs splay whichever way it faces
      // hind pairs first (they are mostly behind), then the fore pairs
      for (const [f, s] of [[-7, 1], [7, -1]]) {
        const lift = x.atk === 1 && f > 0 ? -38 : x.atk === 2 && f > 0 ? -16 : 0;
        const mirrorSide = x.sn > 0.4 && f < 0;   // seen from the side, the hind pair splays backwards
        drawCut(C, S.cut.legsR, th, axT, f, -9, y0, (sw * s) + lift, { kx, mirror: mirrorSide, id: f > 0 ? 13 : 11, dz: -2 });
        drawCut(C, S.cut.legsL, th, axT, f, 9, y0, (-sw * s) - lift, { kx, mirror: mirrorSide, id: f > 0 ? 14 : 12, dz: -2 });
      }
    },
    back(B, S) {
      // the mouths are on its front; behind, the static-grey hide
      paintOut(B, [[[16, 16], [38, 16], [38, 52], [16, 52]]], S.pt.hide, { grain: 0.8, smooth: 40 });
      for (let i = 0; i < B.data.length; i++) if (L.solidPx(B.data[i])) B.data[i] = mul(B.data[i], 0.78);
    },
  });

  // ---------------------------------------------------------------- Mire-drone
  // The parish's Mire-drone (js/parish.js), redrawn round: a low, bovine-sized wallower the colour of
  // its bank, plated down the spine, the head low and forward with a slit mouth of reed-like plates
  // and small dull eyes. Painted directly in the same manner as its front (canvas shapes, the same
  // colours), but as a body in the round: the length of it shows from the side, the head goes behind
  // it from the back. Walk shifts the legs; a1 rears the head; a2 lunges it forward.
  SP.miredrone = {
    W: 200, axT: 100,
    prep(S) { S.src = Engine.sprites.miredrone; },
    pose: (pose) => ({ bob: pose === '_w1' ? -2 : pose === '_w2' ? 2 : pose === '_a1' ? 3 : pose === '_a2' ? 6 : 0,
      leg: pose === '_w1' ? 5 : pose === '_w2' ? -5 : 0, hy: pose === '_a1' ? -12 : pose === '_a2' ? 8 : 0, hf: pose === '_a2' ? 8 : 0,
      gape: pose === '_a2' ? 8 : pose === '_a1' ? 4 : 1.5 }),
    draw(C, S, th, axT, P, v) {
      const sn = Math.sin(th), cs = Math.cos(th);
      const cv = document.createElement('canvas'); cv.width = C.w; cv.height = C.h;
      const g = cv.getContext('2d');
      const X = (f, l) => axT + f * sn + l * cs, Z = (f, l) => f * cs + l * sn;
      const E = (x, y, rx, ry, fill) => { g.beginPath(); g.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
      const VG = (y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
      const oy = C.h - 96 + 4;           // feet on the bottom row, where the painting's mud puddle reached
      const bob = P.bob, A = 66, Bw = 58;  // body half-length and half-width
      const hw = (a, b) => Math.sqrt((a * sn) * (a * sn) + (b * cs) * (b * cs));
      const parts = [];
      // mud
      // (the painted front's mud puddle is left out of the turned views: the engine's ground shadow stands in)
      // legs: four, at the corners
      for (const [f, l, s] of [[40, -40, 1], [40, 40, -1], [-40, -40, -1], [-40, 40, 1]]) {
        const ff = f + P.leg * s, x = X(ff, l), z = Z(ff, l);
        parts.push({ z: z - 10, d: () => { g.fillStyle = VG(oy + 74, oy + 84, '#3c4034', '#23251c'); g.fillRect(x - 7, oy + 74, 14, 14); E(x, oy + 88, 9, 3.4, '#2a2418'); } });
      }
      // the body and its belly, sheen and spine plates
      parts.push({ z: 0, d: () => {
        const bwid = hw(A, Bw);
        E(axT, oy + 56 + bob, bwid, 32, VG(oy + 24, oy + 88, '#566048', '#2a2f24'));
        E(axT, oy + 66 + bob, bwid * 0.96, 22, 'rgba(48,40,26,0.55)');
        // mottling: fixed, so every view of the same pose matches
        for (let i = 0; i < 30; i++) { const h1 = L.hash(i, 1, 77), h2 = L.hash(i, 2, 77), h3 = L.hash(i, 3, 77);
          E(axT + (h1 * 2 - 1) * bwid * 0.85, oy + 38 + h2 * 40 + bob, 2 + h3 * 4, 1 + h3 * 2, `rgba(${30 + (h2 * 30 | 0)},${34 + (h3 * 24 | 0)},22,0.5)`); }
        g.strokeStyle = 'rgba(190,215,205,0.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(axT - bwid * 0.6, oy + 40 + bob); g.lineTo(axT + bwid * 0.3, oy + 34 + bob); g.stroke();
        // spine plates down the back (f), drawn back to front; nearer ones larger
        const plates = [];
        for (let i = 0; i < 9; i++) { const f = -52 + i * 13, l = 0; plates.push({ f, x: X(f, l), z: Z(f, l), lift: Math.abs(i - 4) * 2.4 }); }
        plates.sort((a, b) => a.z - b.z);
        for (const p of plates) {
          const py = oy + 30 + bob + p.lift;
          g.beginPath(); g.moveTo(p.x - 5, py + 7); g.lineTo(p.x, py - 3); g.lineTo(p.x + 5, py + 7); g.closePath(); g.fillStyle = '#7a8458'; g.fill(); g.strokeStyle = '#2c3220'; g.lineWidth = 1; g.stroke();
        }
      } });
      // the head: low and forward
      const hf = A - 4 + P.hf, hx = X(hf, 0), hz = Z(hf, 0), hyy = oy + 70 + bob + P.hy;
      parts.push({ z: hz, d: () => {
        const hwid = hw(30, 25);
        E(hx, hyy, hwid, 19, VG(oy + 52, oy + 90, '#5c6650', '#2c3126'));
        E(hx, hyy - 10, hwid * 0.88, 7, '#2a2e22');           // the brow
        if (cs > -0.2) {
          // the face: eyes and the reed-plated mouth, on the front of the head
          for (const l of [-10, 10]) { const ex = X(hf + 26, l * 1.0), front = Z(hf + 26, l) - hz; if (front < -4) continue;
            E(ex, hyy - 7, 3 * Math.max(0.4, cs), 2.2, '#b79a4a'); E(ex, hyy - 7, 1.2, 1.2, '#1a1608'); }
          const mx = X(hf + 26, 0), mw = 14 * Math.max(0.25, cs);
          E(mx, hyy + 7 + P.gape * 0.4, mw, 3 + P.gape, '#150f0c');
          g.strokeStyle = '#c9c394'; g.lineWidth = 1;
          for (let i = -6; i <= 6; i++) { const lx = mx + i * 2 * Math.max(0.25, cs); g.beginPath(); g.moveTo(lx, hyy + 6); g.lineTo(lx, hyy + 9 + P.gape); g.stroke(); }
        }
      } });
      parts.sort((a, b) => a.z - b.z);
      for (const p of parts) p.d();
      // hand the painting to the shared finishing pass (outline, view shading)
      const id = g.getImageData(0, 0, C.w, C.h), d32 = new Uint32Array(id.data.buffer);
      for (let i = 0; i < d32.length; i++) if ((d32[i] >>> 24) > 100) { C.col[i] = (d32[i] | 0xff000000) >>> 0; C.z[i] = 0; C.id[i] = 1; }
    },
  };

  // ---------------------------------------------------------------- Carillon Legionnaire
  // Black plate, a brass bell for a helm, a halberd. (BEASTA counted the title-screen species list, so
  // the Legionnaire falls to this half; see the first commit.) Attack: the halberd swung up over the
  // right shoulder (a1) and chopped down before him (a2).
  SP.legionnaire = humanoid({
    W: 120, axT: 56, knee: 112, hip: 96,
    patches: { plate: [20, 74, 12, 20], sleeve: [52, 58, 8, 22], brass: [30, 22, 12, 12] },
    sil: [[[25, 14], [49, 14], [50, 42], [56, 48], [54, 100], [16, 100], [14, 48], [24, 42]]],
    lift: [
      { poly: [[[0, 0], [22, 0], [22, 46], [17, 50], [18, 160], [0, 160]]], axis: 18.5 },
      { poly: [[[50, 46], [66, 46], [66, 104], [52, 104]]], axis: 50.5 },
    ],
    body: { mask: [[[0, 14], [66, 14], [66, 101], [0, 101]]], depth: (y, al) => (y < 44 ? al * 0.95 : al * 0.62), fwd: y => (y < 44 ? 0 : 1) },
    cuts: {
      halberd: [[[[0, 4], [21, 4], [21, 42], [15, 46], [15, 160], [9, 160], [9, 46], [0, 42]]], [12, 72], null, [0, -68]],
      hand: [[[[7, 64], [20, 64], [20, 80], [7, 80]]], [13, 70]],
      armL: [[[[50, 46], [66, 46], [66, 104], [52, 104]]], [54, 50]],
      legR: [[[[16, 98], [33, 98], [33, 160], [16, 160]]], [24, 100]],
      legL: [[[[33, 98], [54, 98], [54, 160], [33, 160]]], [43, 100]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 9, 100, 7); },
    back(B, S) {
      // the breastplate's shine and its gilt edging are on the front: a plain backplate
      paintOut(B, [[[26, 46], [44, 46], [44, 96], [26, 96]]], S.pt.plate, { grain: 0.7, smooth: 80, like: S.pt.plate.mean, tol: 60 });
      const ax = Math.round(S.ax);
      for (let y = 46; y < 98; y++) { const i = y * B.w + ax; if (L.solidPx(B.data[i])) B.data[i] = mul(B.data[i], 0.6); }   // the backplate's ridge
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(50), sw = (P.swing || 0) * 6;
      if (!x.atk) {
        const hand = { f: 4, l: -22, y: x.row(72) };
        arm(x, { f: 0, l: -18, y: shY }, hand, { pt: 'sleeve', w0: 12, w1: 10, w2: 9, bend: -2, id: 30, hand: S.cut.hand });
        drawAlong(C, S.cut.halberd, th, axT, hand, { f: 0.05 * (P.swing || 0), l: 0, up: 1 }, { dz: x.front + 4, id: 40 });
        hangArm(C, S.cut.armL, th, axT, P, v, 20, shY, -sw, 22);
        return;
      }
      const up = x.atk === 1;
      const hand = up ? { f: 2, l: -14, y: x.row(48) } : { f: 22, l: -2, y: x.row(84) };
      for (const l of [-18, 18]) arm(x, { f: 0, l, y: shY }, hand, { pt: 'sleeve', w0: 12, w1: 10, w2: 9, bend: up ? 2 : -3, id: l < 0 ? 30 : 34, hand: l < 0 ? S.cut.hand : null });
      drawAlong(C, S.cut.halberd, th, axT, hand, up ? { f: -0.3, l: 0.55, up: 0.75 } : { f: 0.85, l: 0.05, up: -0.35 }, { dz: x.front + 6, id: 40 });
    },
  });
  // the rig kit, for species rigged elsewhere (js/people25.js: the Proctor, the companions, the townsfolk)
  BEASTB.rig = { humanoid, arm, stride, hangArm, boots, bipedPose, headMap };
})();

// ================================================================ the hook
// DIRECTIONS.view is the one place a five-angle view is chosen (directions.js wraps the engine's
// sprite chooser through it). Our species answer here; everyone else falls through untouched.
(() => {
  if (typeof DIRECTIONS === 'undefined') return;
  const _view = DIRECTIONS.view;
  DIRECTIONS.view = function (name, v, pose) {
    if (GFX.p20_beastb && BEASTB.SPECIES[name] && v >= 1 && v <= 4) {
      try { const s = BEASTB.view(name, v, pose || ''); if (s) return s; } catch (err) { if (!BEASTB._warned) { BEASTB._warned = true; console.warn('bestiary20b', err); } }
    }
    return _view.apply(this, arguments);
  };
})();
