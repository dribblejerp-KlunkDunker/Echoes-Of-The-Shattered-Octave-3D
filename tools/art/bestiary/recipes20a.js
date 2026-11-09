// ============================================================
//  tools/art/bestiary/recipes20a.js — how team BEASTA's bestiary views are made (Phase 20)
//
//  DEVELOPMENT FILE: the game never loads it. tools/art/bestiary/bake20a.js
//  runs it inside the game page and writes the results to img/bestiary20a/
//  (one atlas PNG per species) and the cell table into js/bestiary20a.js.
//
//  Every species here gets its own drawn front-side, side, back-side and back
//  views (the engine mirrors them for the other side), with walk and attack
//  poses, in place of js/directions.js's squeezed-and-darkened stand-ins.
//  Each view is composed by hand for that species and angle: pieces of the
//  species' own painted front (cloth, armour plate, fur, brass, so colours,
//  grain and identity stay exactly its own) are cut out, turned on a rig,
//  re-stacked and re-lit into a new silhouette, and the parts a front view
//  cannot supply (profiles, backs of heads, hoods, back-plates, a bell seen
//  from behind, a wolf from behind) are drawn from the maps and shapes below.
//  Deterministic: no random numbers except seeded ones.
//
//  Load it into a running game page (after js/bestiary20a.js) and the game
//  uses these live recipes instead of the baked atlases, which is how the
//  views are iterated on: BEAST20A.view(name, view, pose).
// ============================================================
'use strict';

const BEAST20A = (() => {
  const CAP = 6 * 1024 * 1024;                 // derived-view budget (bytes of pixel data)
  const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
  const SPECIES = {};                          // sprite name -> recipe(P, view, pose)
  const cache = new Map();                     // 'name|view|pose' -> { sprite, used, bytes }
  let bytes = 0, stamp = 0;

  // ---------------------------------------------------------------- sources
  const srcCanvases = new WeakMap();           // engine sprite -> canvas of its pixels
  function srcCanvas(name) {
    const sp = Engine.sprites[name]; if (!sp) throw new Error('no sprite ' + name);
    let c = srcCanvases.get(sp); if (c) return c;
    c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sp.data.buffer.slice(sp.data.byteOffset, sp.data.byteOffset + sp.data.byteLength)), sp.w, sp.h), 0, 0);
    srcCanvases.set(sp, c); return c;
  }
  // A colour of the painted art, so every hand-drawn pixel matches the species' own palette.
  function at(name, x, y, k) {
    const sp = Engine.sprites[name], p = sp.data[(y | 0) * sp.w + (x | 0)];
    return css([p & 255, (p >>> 8) & 255, (p >>> 16) & 255], k);
  }
  function css(rgb, k) {
    const m = k == null ? 1 : k, f = v => Math.max(0, Math.min(255, Math.round(v * m)));
    return 'rgb(' + f(rgb[0]) + ',' + f(rgb[1]) + ',' + f(rgb[2]) + ')';
  }
  // one pixel of a painted texture tile: t = [frame, sx, sy, sw, sh, mul]
  function texAt(t, x, y) {
    const sp = Engine.sprites[t[0]]; if (!sp) return null;
    const sx = t[1] + (((x % t[3]) + t[3]) % t[3]), sy = t[2] + (((y % t[4]) + t[4]) % t[4]);
    const p = sp.data[sy * sp.w + sx]; if ((p >>> 24) < 100) return null;
    return css([p & 255, (p >>> 8) & 255, (p >>> 16) & 255], t[5]);
  }
  // deterministic grain for hand-filled shapes
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- the painter
  // One per view build. Coordinates are output pixels; source rects are in the
  // named frame's pixels.
  function painter(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
    const P = {
      w, h, c, g, at, css, hash, texAt,
      // Cut a piece of a source frame (optionally masked by a polygon in source
      // coordinates) and put its pivot at (dx, dy), scaled k across, ky down,
      // optionally mirrored and turned by rot radians.
      cut(name, sx, sy, sw, sh, dx, dy, o) {
        o = o || {};
        const src = srcCanvas(name);
        const t = document.createElement('canvas'); t.width = Math.max(1, sw); t.height = Math.max(1, sh);
        const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false;
        if (o.mask) { tg.beginPath(); o.mask.forEach((p, i) => (i ? tg.lineTo(p[0] - sx, p[1] - sy) : tg.moveTo(p[0] - sx, p[1] - sy))); tg.closePath(); tg.clip(); }
        tg.drawImage(src, -sx, -sy);
        if (o.mul != null || o.tint) { tg.globalCompositeOperation = 'source-atop'; if (o.mul != null) { tg.fillStyle = o.mul < 1 ? 'rgba(0,0,0,' + (1 - o.mul) + ')' : 'rgba(255,255,255,' + (o.mul - 1) + ')'; tg.fillRect(0, 0, sw, sh); } if (o.tint) { tg.fillStyle = o.tint; tg.fillRect(0, 0, sw, sh); } }
        const px = o.px == null ? sx : o.px, py = o.py == null ? sy : o.py;
        g.save(); g.translate(dx, dy); if (o.rot) g.rotate(o.rot);
        g.scale((o.k == null ? 1 : o.k) * (o.flip ? -1 : 1), o.ky == null ? 1 : o.ky);
        if (o.alpha != null) g.globalAlpha = o.alpha;
        g.drawImage(t, -(px - sx), -(py - sy));
        g.restore();
      },
      poly(col, pts) { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill(); },
      rect(col, x, y, rw, rh) { g.fillStyle = col; g.fillRect(x, y, rw, rh); },
      px(col, x, y) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); },
      // a 1-pixel line (Bresenham), for straps, blades, hair strands and seams
      line(col, x0, y0, x1, y1, wd) {
        g.fillStyle = col; x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const W = wd || 1;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for (;;) { g.fillRect(x0, y0, W, W); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      },
      // fill a polygon with a tile of the species' own painted texture
      tex(name, sx, sy, sw, sh, pts, o) {
        o = o || {};
        const src = srcCanvas(name), t = document.createElement('canvas'); t.width = sw; t.height = sh;
        const tg = t.getContext('2d'); tg.drawImage(src, -sx, -sy);
        if (o.mul != null) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = o.mul < 1 ? 'rgba(0,0,0,' + (1 - o.mul) + ')' : 'rgba(255,255,255,' + (o.mul - 1) + ')'; tg.fillRect(0, 0, sw, sh); }
        const pat = g.createPattern(t, 'repeat');
        if (o.ox != null || o.oy != null) pat.setTransform(new DOMMatrix().translate(o.ox || 0, o.oy || 0));
        g.fillStyle = pat; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fill();
      },
      // hand-placed pixels: rows of palette keys, '.' or ' ' = leave alone
      map(rows, pal, x, y, o) {
        o = o || {};
        for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r].length; i++) {
          const ch = rows[r][i]; if (ch === '.' || ch === ' ') continue;
          let col = pal[ch]; if (!col) continue;
          const X = o.flip ? x + rows[r].length - 1 - i : x + i, Y = y + r;
          if (col === 'clear') { g.clearRect(X, Y, 1, 1); continue; }
          // a texture key: [frame, sx, sy, sw, sh, mul] samples the painted art at this pixel
          if (typeof col !== 'string') col = texAt(col, X, Y);
          if (!col) continue;
          g.fillStyle = col; g.fillRect(X, Y, 1, 1);
        }
      },
      // fill a polygon with this layer's own pixels from (dx, dy) away: closes the
      // hole a lifted prop leaves with the cloth that was beside it
      heal(pts, dx, dy) {
        const t = document.createElement('canvas'); t.width = w; t.height = h; t.getContext('2d').drawImage(c, 0, 0);
        P.clip(pts, () => { g.clearRect(0, 0, w, h); g.drawImage(t, -dx, -(dy || 0)); });
        // whatever the copy could not cover stays as it was
        g.save(); g.globalCompositeOperation = 'destination-over'; g.drawImage(t, 0, 0); g.restore();
      },
      // strand or fur grain over a polygon: tones picked per pixel, in short vertical runs
      grain(pts, tones, run, seed) {
        P.clip(pts, () => {
          const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
          for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
            const t = hash(x, Math.floor((y + (x * 7 % 3)) / (run || 3)), seed || 1);
            g.fillStyle = tones[Math.min(tones.length - 1, Math.floor(t * tones.length))]; g.fillRect(x, y, 1, 1);
          }
        });
      },
      erase(pts) { g.save(); g.globalCompositeOperation = 'destination-out'; P.poly('#000', pts); g.restore(); },
      under(fn) { g.save(); g.globalCompositeOperation = 'destination-over'; fn(); g.restore(); },
      clip(pts, fn) { g.save(); g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.clip(); fn(); g.restore(); },
      // light: a multiply over opaque pixels, f(x, y) -> brightness factor
      light(f) {
        const im = g.getImageData(0, 0, w, h), d = im.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4; if (d[i + 3] < 20) continue;
          const k = f(x, y); if (k === 1) continue;
          d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
        }
        g.putImageData(im, 0, 0);
      },
      // Draw into a separate layer, give it round volume, then lay it on:
      // per row, light peaks at fraction c of the layer's width there and falls
      // to `back` at the far edge and `front` at the near one.
      layer(fn, back, peak, front, c) {
        const L = painter(w, h); fn(L);
        if (back != null) {
          const im = L.g.getImageData(0, 0, w, h), d = im.data;
          for (let y = 0; y < h; y++) {
            let x0 = -1, x1 = -1;
            for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 100) { if (x0 < 0) x0 = x; x1 = x; }
            if (x0 < 0) continue;
            const span = Math.max(1, x1 - x0);
            for (let x = x0; x <= x1; x++) {
              const i = (y * w + x) * 4; if (d[i + 3] < 20) continue;
              const t = (x - x0) / span;
              const k = t < c ? back + (peak - back) * Math.sin((t / c) * Math.PI / 2) : peak + (front - peak) * (1 - Math.cos(((t - c) / (1 - c)) * Math.PI / 2));
              d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
            }
          }
          L.g.putImageData(im, 0, 0);
        }
        g.drawImage(L.c, 0, 0);
        return L;
      },
      // light only inside a polygon
      lightIn(pts, f) {
        const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
        mg.fillStyle = '#fff'; mg.beginPath(); pts.forEach((p, i) => (i ? mg.lineTo(p[0], p[1]) : mg.moveTo(p[0], p[1]))); mg.closePath(); mg.fill();
        const md = mg.getImageData(0, 0, w, h).data;
        P.light((x, y) => (md[(y * w + x) * 4 + 3] > 127 ? f(x, y) : 1));
      },
      // a dark rim one pixel outside the silhouette, like the painted fronts carry
      rim(col, sides) {
        const im = g.getImageData(0, 0, w, h), d = im.data, solid = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
        const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(col) || [0, 20, 16, 18];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const i = y * w + x; if (!solid[i]) continue;
          const edge = (x === 0 || !solid[i - 1]) || (x === w - 1 || !solid[i + 1]) || (y === 0 || !solid[i - w]) || (!sides && (y === h - 1 || !solid[i + w]));
          if (!edge) continue;
          d[i * 4] = (d[i * 4] + +m[1]) >> 1; d[i * 4 + 1] = (d[i * 4 + 1] + +m[2]) >> 1; d[i * 4 + 2] = (d[i * 4 + 2] + +m[3]) >> 1;
        }
        g.putImageData(im, 0, 0);
      },
    };
    return P;
  }

  // Crisp pixel art: no half-transparent edges from the canvas' anti-aliasing.
  function finish(P, base, hsMul, cx) {
    const im = P.g.getImageData(0, 0, P.w, P.h), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0;
    for (let i = 0; i < d.length; i += 4) if (!d[i + 3]) d[i] = d[i + 1] = d[i + 2] = 0;
    const data = new Uint32Array(d.buffer.slice(0));
    return { w: P.w, h: P.h, data, hs: (base.hs || 1) * (hsMul || 1), cx: cx == null ? 0.5 : cx, dy: base.dy || 0 };
  }

  // ---------------------------------------------------------------- build + cache
  function evict(need) {
    while (bytes + need > CAP && cache.size) {
      let oldK = null, old = null;
      for (const [k, en] of cache) if (!old || en.used < old.used) { old = en; oldK = k; }
      cache.delete(oldK); bytes -= old.bytes;
    }
  }
  function view(name, v, pose) {
    const recipe = SPECIES[name]; if (!recipe || v == null || v < (recipe.front0 ? 0 : 1) || v > 4) return null;
    let p = pose || ''; if (!POSES.includes(p)) p = '';
    if (!Engine.sprites[name] || (p && !Engine.sprites[name + p])) return null;
    const key = name + '|' + v + '|' + p, hit = cache.get(key);
    if (hit) { hit.used = ++stamp; return hit.sprite; }
    const sprite = recipe(v, p);
    if (!sprite) return null;
    const size = sprite.data.byteLength; evict(size);
    cache.set(key, { sprite, used: ++stamp, bytes: size }); bytes += size;
    return sprite;
  }
  function make(name, w, h, draw, opt) {
    // opt: { cx, hsMul, rim, light }
    const P = painter(w, h); draw(P);
    if (opt && opt.light) P.light(opt.light);
    if (opt && opt.rim) P.rim(opt.rim, true);
    return finish(P, Engine.sprites[name], opt && opt.hsMul, opt && opt.cx);
  }

  // ---------------------------------------------------------------- shared shapes
  // walk: which foot is forward (+1 right foot ahead, -1 left foot ahead, 0 standing)
  const stride = p => (p === '_w1' ? 1 : p === '_w2' ? -1 : 0);
  // light across a turned figure: the lit edge leads, the far edge falls away
  function sideLight(w, lo, hi, back) {
    return (x) => { const t = x / Math.max(1, w - 1); return (lo + (hi - lo) * t) * (back || 1); };
  }

  // ---------------------------------------------------------------- the turntable
  // A hand-rigged figure: its body layer (front, as painted, with props lifted
  // off), its hand-built back (as seen from behind), the vertical axis it turns
  // on, how deep it is front-to-back, and the props (a lantern, a sabre, a bell)
  // that ride along at their own place in the round. Every horizontal run of
  // body pixels is a slice of an elliptical column; turning the figure turns
  // each column about the axis, the front art wraps its near half and the back
  // art its far half, and the light is recomputed for the new angle. The views
  // are then finished by hand per species (profile faces, hoods, strides).
  function rowRuns(d, w, y, join) {
    const runs = []; let s = -1, last = -9;
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 100) {
        if (s < 0) s = x; else if (x - last > join + 1) { runs.push([s, last]); s = x; }
        last = x;
      }
    }
    if (s >= 0) runs.push([s, last]);
    return runs;
  }
  function turn(rig, theta, outW, ox) {
    const F = rig.front, Bk = rig.back, w = F.width, h = F.height;
    const fd = F.getContext('2d').getImageData(0, 0, w, h).data, bd = Bk.getContext('2d').getImageData(0, 0, w, h).data;
    const out = new Uint8ClampedArray(outW * h * 4), zb = new Float32Array(outW * h).fill(-1e9);
    const ct = Math.cos(theta), st = Math.sin(theta);
    const lx0 = -0.5, lz0 = 0.86, relight = rig.relight == null ? 0.55 : rig.relight;
    const A = rig.axis, join = rig.join == null ? 2 : rig.join;
    // pass 1: the slices of every row
    const rows = [];
    for (let y = 0; y < h; y++) {
      let runs = rowRuns(fd, w, y, join);
      // hand-drawn torso bounds: what lies inside is the body column, what
      // lies outside (an arm held clear, a hem) turns as its own slice
      if (rig.body) {
        const bb = rig.body(y);
        if (bb) {
          const out2 = []; let bl = 1e9, br = -1;
          for (const [xl, xr] of runs) {
            if (xr < bb[0] || xl > bb[1]) { out2.push([xl, xr]); continue; }
            if (xl < bb[0]) out2.push([xl, bb[0] - 1]);
            if (xr > bb[1]) out2.push([bb[1] + 1, xr]);
            bl = Math.min(bl, Math.max(xl, bb[0])); br = Math.max(br, Math.min(xr, bb[1]));
          }
          if (br >= 0) out2.push([bl, br]);
          runs = out2;
        }
      }
      // the run the axis passes through turns about the axis itself, so the
      // body stays one coherent column whatever an arm or a hem does to its edges
      rows.push(runs.map(([xl, xr]) => {
        const main = xl <= A && xr >= A;
        return { xl, xr, main, a: main ? Math.max(A - xl, xr + 1 - A) : (xr - xl + 1) / 2, c: main ? A : (xl + xr + 1) / 2 };
      }));
    }
    // pass 2: an arm or a leg is a ragged column; steady its centre and girth
    // over a few rows so it turns as one limb instead of a stack of coins
    for (let y = 0; y < h; y++) for (const r of rows[y]) {
      if (r.main) continue;
      let sc = 0, sa = 0, n = 0;
      for (let k = -3; k <= 3; k++) {
        const row = rows[y + k]; if (!row) continue;
        for (const q of row) if (!q.main && q.xr >= r.xl - 1 && q.xl <= r.xr + 1) { const wgt = 4 - Math.abs(k); sc += (q.c0 == null ? q.c : q.c0) * wgt; sa += (q.a0 == null ? q.a : q.a0) * wgt; n += wgt; }
      }
      r.c0 = r.c; r.a0 = r.a; r.cs = sc / n; r.as = sa / n;
    }
    for (let y = 0; y < h; y++) {
      const depth = typeof rig.depth === 'function' ? rig.depth(y) : rig.depth;
      for (const r of rows[y]) {
        const { xl, xr, main } = r;
        // depth: a fraction of the slice's half-width, or (above 2) a half-depth in pixels
        // the body column is two half-ellipses meeting at the axis, one per side,
        // so a figure wider on one side (a cape flung out, a hip) wraps without gaps
        const a = main ? r.a : Math.max(r.as, (xr - xl + 1) / 2), c = main ? r.c : r.cs;
        const aL = main ? Math.max(0.5, A - xl) : a, aR = main ? Math.max(0.5, xr + 1 - A) : a, am = (aL + aR) / 2;
        const dv = typeof depth === 'function' ? depth(y, main) : depth;
        const b = Math.max(1, dv > 2 ? Math.min(dv, main ? am * 1.6 + 1 : Math.min(a * (rig.limbK || 1.3), rig.limbB || 6)) : am * dv);   // a slice is never much deeper than it is wide: no blades off a hood's tip
        let X0 = c - A, Z0 = 0;
        if (rig.zOf) Z0 = rig.zOf(c, y, a, main) || 0;
        const steps = Math.ceil(Math.PI * 2 * Math.max(aL, aR, b) * 2.2);
        for (let i = 0; i < steps; i++) {
          const phi = -Math.PI + (i + 0.5) * (Math.PI * 2 / steps);
          const sp = Math.sin(phi), cp = Math.cos(phi), ah = sp < 0 ? aL : aR;
          const lx = ah * sp, lz = b * cp;
          let nx = sp / ah, nz = cp / b; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
          const rnz = -nx * st + nz * ct; if (rnz < -0.02) continue;
          const rnx = nx * ct + nz * st;
          const px = Math.round(ox + (X0 + lx) * ct + (Z0 + lz) * st - 0.5);
          if (px < 0 || px >= outW) continue;
          const pz = -(X0 + lx) * st + (Z0 + lz) * ct;
          const o = y * outW + px; if (pz <= zb[o]) continue;
          let si, src;
          // only the run's own pixels: beyond its real edge (an off-axis run is
          // shorter on one side) the column is left open rather than smeared
          // texture position: by arc length round the slice (rig.wrap 'arc', the
          // default: every texel keeps its share of the surface, so the edges
          // of the painting are not smeared out as they come round) or by plain projection
          const tx = rig.wrap === 'proj' ? lx : (phi > Math.PI / 2 ? ah * (2 / Math.PI) * (Math.PI - phi) : phi < -Math.PI / 2 ? -ah * (2 / Math.PI) * (Math.PI + phi) : ah * (2 / Math.PI) * phi);
          const fx = Math.floor(main ? c + tx : r.c0 + tx * r.a0 / a); if (fx < xl || fx > xr) continue;
          if (cp >= 0) { si = (y * w + fx) * 4; src = fd; }
          else { si = (y * w + (w - 1 - fx)) * 4; src = bd; }
          if (src[si + 3] < 100) continue;   // the gap beside an off-centre run stays open
          zb[o] = pz;
          // relight: the painted art already carries the light it was drawn
          // under (front art lit as a front, back art as a back): change only the difference
          const ref = cp >= 0 ? nx * lx0 + nz * lz0 : -nx * lx0 - nz * lz0;
          const k = Math.max(0.45, 1 + relight * ((rnx * lx0 + rnz * lz0) - ref));
          out[o * 4] = Math.min(255, src[si] * k); out[o * 4 + 1] = Math.min(255, src[si + 1] * k); out[o * 4 + 2] = Math.min(255, src[si + 2] * k); out[o * 4 + 3] = 255;
        }
      }
    }
    // props: flat cards that keep facing us (narrowing as they turn edge-on),
    // placed at their spot in the round and depth-tested against the body
    for (const pr of rig.props || []) {
      if (pr.show && !pr.show(theta)) continue;
      if (pr.bone) { boneProp(pr); continue; }
      const pc = pr.canvas, pw = pc.width, ph = pc.height, pdat = pc.getContext('2d').getImageData(0, 0, pw, ph).data;
      const X = pr.X, Z = pr.Z || 0;
      const cxp = ox + X * ct + Z * st, cz = -X * st + Z * ct + (pr.dz || 0);
      const k = Math.max(pr.minK == null ? 0.55 : pr.minK, Math.abs(Math.cos(theta + (pr.yaw || 0))));
      const flip = pr.flipBack && Math.cos(theta) < 0;
      const mul = Math.cos(theta) < 0 ? (pr.backMul == null ? 0.8 : pr.backMul) : 1;
      for (let yy = 0; yy < ph; yy++) for (let xx = 0; xx < pw; xx++) {
        const si = (yy * pw + xx) * 4; if (pdat[si + 3] < 100) continue;
        const u = (flip ? pw - 1 - xx : xx) - pr.ax;
        const x0 = Math.round(cxp + u * k), x1 = Math.round(cxp + (u + 1) * k);
        const Y = pr.y + yy; if (Y < 0 || Y >= h) continue;
        for (let px = x0; px < Math.max(x1, x0 + 1); px++) {
          if (px < 0 || px >= outW) continue;
          const o = Y * outW + px; if (cz <= zb[o]) continue;
          zb[o] = cz; out[o * 4] = pdat[si] * mul; out[o * 4 + 1] = pdat[si + 1] * mul; out[o * 4 + 2] = pdat[si + 2] * mul; out[o * 4 + 3] = 255;
        }
      }
    }
    // A limb on a bone: its painted piece is laid along the line from the
    // joint to the hand, both placed in the round (so an arm reaching at you
    // in the front view reaches forward, full length, in the side view).
    function boneProp(pr) {
      const [[sx, sy], [hx, hy]] = pr.bone, [zs, zh] = pr.boneZ || [0, 0];
      const Sx = sx - A, Hx = hx - A;
      const s1 = ox + Sx * ct + zs * st, h1 = ox + Hx * ct + zh * st;
      const a0 = Math.atan2(hy - sy, hx - sx), L = Math.hypot(hx - sx, hy - sy);
      const a1 = Math.atan2(hy - sy, h1 - s1), L1 = Math.hypot(h1 - s1, hy - sy);
      const t = document.createElement('canvas'); t.width = outW; t.height = h;
      const tg = t.getContext('2d'); tg.imageSmoothingEnabled = false;
      tg.translate(s1, sy); tg.rotate(a1); tg.scale(Math.max(0.3, L1 / Math.max(1, L)), 1); tg.rotate(-a0); tg.translate(-sx, -sy);
      tg.drawImage(pr.canvas, pr.rx, pr.y);
      const td = tg.getImageData(0, 0, outW, h).data;
      const cz = (-Sx * st + zs * ct - Hx * st + zh * ct) / 2 + (pr.dz || 0);
      const mul = Math.cos(theta) < 0 ? (pr.backMul == null ? 0.8 : pr.backMul) : 1;
      for (let o = 0; o < outW * h; o++) {
        if (td[o * 4 + 3] < 110 || cz <= zb[o]) continue;
        zb[o] = cz; out[o * 4] = td[o * 4] * mul; out[o * 4 + 1] = td[o * 4 + 1] * mul; out[o * 4 + 2] = td[o * 4 + 2] * mul; out[o * 4 + 3] = 255;
      }
    }
    const c = document.createElement('canvas'); c.width = outW; c.height = h;
    c.getContext('2d').putImageData(new ImageData(out, outW, h), 0, 0);
    return c;
  }
  // a canvas holding one frame with polygons lifted out (props, faces) and
  // optionally patched with the species' own texture
  function layerOf(name, edit) {
    const sp = Engine.sprites[name], P = painter(sp.w, sp.h);
    P.g.drawImage(srcCanvas(name), 0, 0);
    if (edit) edit(P);
    return P;
  }
  // the frame seen from behind: mirrored, then painted over by hand
  function backOf(name, edit) {
    const src = typeof name === 'string' ? srcCanvas(name) : name, P = painter(src.width, src.height);
    P.g.save(); P.g.scale(-1, 1); P.g.drawImage(src, -src.width, 0); P.g.restore();
    if (edit) edit(P);
    return P;
  }
  // a piece of a frame as its own canvas (a prop), optionally masked
  function piece(name, sx, sy, sw, sh, mask) {
    const P = painter(sw, sh);
    P.cut(name, sx, sy, sw, sh, 0, 0, { mask });
    return P.c;
  }
  const VIEW_ANGLE = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI];
  // crop a turned canvas to its pixels; returns { P (painter over it), x0 } for hand finishing
  function cropTo(c, pad) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, x1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    if (x1 < 0) { x0 = 0; x1 = w - 1; }
    x0 = Math.max(0, x0 - (pad || 0)); x1 = Math.min(w - 1, x1 + (pad || 0));
    return { x0, w: x1 - x0 + 1 };
  }

  // Turn a rig to view v, crop it, let the species finish it by hand
  // (finish(P, axisX, theta)), and return the sprite anchored on its axis.
  function turned(name, rig, v, fin, opt) {
    opt = opt || {};
    const F = rig.front, w = F.width, h = F.height, outW = w * 2 + 20, ox = w + 10;
    const theta = (opt.angles || VIEW_ANGLE)[v];
    const tc = turn(rig, theta, outW, ox);
    const P0 = painter(outW, h); P0.g.drawImage(tc, 0, 0);
    if (fin) fin(P0, ox, theta);
    const cr = cropTo(P0.c, 1), P = painter(cr.w, h);
    P.g.drawImage(P0.c, -cr.x0, 0);
    if (opt.light) P.light(opt.light);
    return finish(P, Engine.sprites[name], opt.hsMul, (ox - cr.x0) / cr.w);
  }

  // A piecewise table [[yMax, value], ...] read at row y (the last entry covers the rest).
  function band(tab, y) { for (const r of tab) if (y < r[0]) return r[1]; return tab[tab.length - 1][1]; }
  // A figure rigged from a table, one entry per pose frame:
  //   A axis x; depth [[yMax, d]]; body [[yMax, xl, xr]] (xl null = no bound);
  //   erase [poly] lifted off the frame; patch [[frame, sx, sy, sw, sh, poly, mul]];
  //   props [{ r: [sx, sy, sw, sh], mask, X (anchor x in the frame), Z, ax, minK, flipBack, backMul }];
  //   stride: how far the screen-left leg steps forward (below legY).
  // cfg.back(P, spec, pose) paints the back by hand; cfg.fin(P, ox, theta, v, pose, spec) finishes a view.
  function rigged(N, cfg) {
    // a pose inherits only the idle frame's proportions; geometry (axis, bounds,
    // masks, props) is always the pose's own, because every frame is drawn anew
    const INHERIT = ['depth', 'legY', 'join'];
    const specOf = p => { const o = {}; for (const k of INHERIT) if (cfg.poses[''][k] !== undefined) o[k] = cfg.poses[''][k]; return Object.assign(o, p ? cfg.poses[p] || {} : cfg.poses['']); };
    function rig(p) {
      const name = N + p, S = specOf(p);
      const front = layerOf(name, P => {
        for (const e of S.erase || []) P.erase(e);
        for (const t of S.patch || []) P.tex(t[0], t[1], t[2], t[3], t[4], t[5], { mul: t[6] });
        for (const t of S.heal || []) P.heal(t[0], t[1], t[2]);
        if (cfg.front) cfg.front(P, S, p);
      });
      const back = backOf(front.c, P => { if (cfg.back) cfg.back(P, S, p); });
      const props = (S.props || []).concat(cfg.props ? cfg.props(S) : []).map(q => {
        if (q.canvas) return Object.assign({}, q, { X: q.X });
        const r = q.r, c = piece(name, r[0], r[1], r[2], r[3], q.mask);
        return Object.assign({}, q, { canvas: c, rx: r[0], y: r[1], ax: q.ax == null ? q.X - r[0] : q.ax, X: q.X - S.A });
      });
      // a stepping leg sits forward or back; reaching arms (limbs above reachY) sit forward
      const zOf = (S.stride || S.reach) ? (c, y, a, main) => (S.stride && y >= S.legY ? (c < S.A ? S.stride : -S.stride) : S.reach && !main && y < S.reachY ? S.reach : 0) : null;
      return {
        front: front.c, back: back.c, axis: S.A, props, zOf, relight: S.relight, join: S.join == null ? cfg.join : S.join, limbK: cfg.limbK, limbB: cfg.limbB, wrap: cfg.wrap,
        depth: y => { const d = band(S.depth, y); return typeof d === 'function' ? d(y) : d; },
        body: S.body ? y => { const b = band(S.body, y); return b && b[0] != null ? b : null; } : null,
      };
    }
    const recipe = (v, p) => {
      const S = specOf(p);
      // the pose frame's own hs / dy: each painted frame carries its own scale
      return turned(N + p, rig(p), v, (P, ox, th) => { if (cfg.fin) cfg.fin(P, ox, th, v, p, S); }, { hsMul: S.hsMul, angles: cfg.angles });
    };
    recipe.rig = rig;
    return recipe;
  }

  // front-frame coordinates -> the mirrored back layer's coordinates
  const mir = (w, pts) => pts.map(q => [w - 1 - q[0], q[1]]);
  // Cover a face (or a visor) with the hood's own cloth when seen from behind:
  // a tile of the hood, light from the crown, a seam down the middle.
  function hoodBack(P, name, facePts, tile, opt) {
    opt = opt || {};
    const pts = mir(P.w, facePts), ys = pts.map(q => q[1]), xs = pts.map(q => q[0]);
    const y0 = Math.min(...ys), y1 = Math.max(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    P.tex(name, tile[0], tile[1], tile[2], tile[3], pts, { mul: opt.mul == null ? 0.95 : opt.mul });
    P.lightIn(pts, (x, y) => 1.1 - 0.35 * (y - y0) / Math.max(1, y1 - y0));
    if (opt.seam) P.line(at(name, opt.seam[0], opt.seam[1], 0.55), cx, opt.seamTop == null ? y0 : opt.seamTop, cx, y1);
  }

  // the opaque colours among the given points of a frame (palette for grain)
  function tones(name, pts, k) {
    const sp = Engine.sprites[name], out = [];
    for (const q of pts) { const p = sp.data[q[1] * sp.w + q[0]]; if ((p >>> 24) > 100) out.push(css([p & 255, (p >>> 8) & 255, (p >>> 16) & 255], q[2] == null ? k : q[2])); }
    return out.length ? out : ['rgb(60,56,52)'];
  }
  // A hood seen from behind over a face polygon (front coordinates): woven
  // grain in the hood's own tones, light from the crown, a seam from the tip.
  function hoodOver(P, name, face, tns, seamCol, tip) {
    const f = mir(P.w, face), ys = f.map(q => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    P.grain(f, tns, 4, 3);
    P.lightIn(f, (x, y) => 1.08 - 0.35 * (y - y0) / Math.max(1, y1 - y0));
    const cx = Math.round((f[0][0] + f[1][0]) / 2); if (seamCol) P.line(seamCol, cx, y0 - (tip || 10), cx, y1);
  }

  // ---------------------------------------------------------------- the lathe
  // For creatures painted in profile (a hound, a crawler, a sprite): every
  // column of the profile is a cross-section of the body, an ellipse as tall as
  // the column and rig.thick(x, y-run) wide. Turning the creature by psi (0 =
  // profile facing right, +pi/2 = head on, -pi/2 = from behind) lays those
  // solid sections out in depth; the nearest wins. Legs (runs below legY) are
  // doubled, a near pair and a far pair, rig.legZ apart.
  function lathe(rig, psi, outW, ox) {
    const F = rig.front, w = F.width, h = F.height, fd = F.getContext('2d').getImageData(0, 0, w, h).data;
    const out = new Uint8ClampedArray(outW * h * 4), zb = new Float32Array(outW * h).fill(-1e9);
    const cp = Math.cos(psi), sp = Math.sin(psi), A = rig.axis;
    const lx0 = -0.5, lz0 = 0.86, rel = rig.relight == null ? 0.5 : rig.relight;
    const put = (px, y, d, si, k) => {
      if (px < 0 || px >= outW || y < 0 || y >= h) return;
      const o = y * outW + px; if (d <= zb[o]) return;
      zb[o] = d; out[o * 4] = Math.min(255, fd[si] * k); out[o * 4 + 1] = Math.min(255, fd[si + 1] * k); out[o * 4 + 2] = Math.min(255, fd[si + 2] * k); out[o * 4 + 3] = 255;
    };
    for (let x = 0; x < w; x++) {
      // vertical runs in this column
      const runs = []; let s = -1;
      for (let y = 0; y <= h; y++) {
        const on = y < h && fd[(y * w + x) * 4 + 3] > 100;
        if (on && s < 0) s = y; else if (!on && s >= 0) { runs.push([s, y - 1]); s = -1; }
      }
      const X = x - A;
      // a run that reaches below the belly line splits there: body above, legs below
      if (rig.legY != null) for (let i = runs.length - 1; i >= 0; i--) { const [a0, b0] = runs[i]; if (a0 < rig.legY && b0 >= rig.legY) runs.splice(i, 1, [a0, rig.legY - 1], [rig.legY, b0]); }
      for (const [yt, yb] of runs) {
        const leg = rig.legY != null && yt >= rig.legY;
        const ry = (yb - yt + 1) / 2, yc = (yt + yb + 1) / 2;
        const rz = Math.max(1, leg ? (rig.legR || 2.5) : rig.thick(x, yt, yb));
        const zs = leg ? [rig.legZ || 8, -(rig.legZ || 8)] : [0];
        for (const zLeg of zs) {
          for (let y = yt; y <= yb; y++) {
            // legs part from the body gradually, so the flank runs into them unbroken
            const z0 = leg ? zLeg * Math.min(1, (y - yt + 1) / 14) : zLeg;
            const v = (y + 0.5 - yc) / ry, half = rz * Math.sqrt(Math.max(0, 1 - v * v));
            const si = (y * w + x) * 4;
            for (let z = -half; z <= half; z += 0.5) {
              const Z = z0 + z;
              const px = Math.round(ox + X * cp - Z * sp - 0.5), d = X * sp + Z * cp;
              // surface normal of the section at this point, turned with the creature
              const nyz = Math.abs(half) > 0.01 ? z / Math.max(half, 0.5) : 0, nz = nyz * Math.sqrt(1 - Math.min(1, v * v));
              const nx = -nz * sp, nd = nz * cp;
              const k = Math.max(0.5, 1 + rel * ((nx * lx0 + nd * lz0) - (Math.abs(nz) * lz0)));
              put(px, y, d, si, zLeg < 0 ? k * 0.85 : k);
            }
          }
        }
      }
    }
    const c = document.createElement('canvas'); c.width = outW; c.height = h;
    c.getContext('2d').putImageData(new ImageData(out, outW, h), 0, 0);
    return c;
  }
  const PSI = [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2];
  // a profile creature's view v (0 head-on ... 4 from behind), finished by hand
  function lathed(name, rig, v, fin) {
    const F = rig.front, w = F.width, h = F.height, outW = w * 2 + 20, ox = w + 10;
    const psi = (rig.psi || PSI)[v];
    const P0 = painter(outW, h);
    if (v === 2 && rig.sideIsArt) P0.g.drawImage(F, ox - rig.axis, 0);       // the side view is the painting itself
    else P0.g.drawImage(lathe(rig, psi, outW, ox), 0, 0);
    if (fin) fin(P0, ox, psi);
    const cr = cropTo(P0.c, 1), P = painter(cr.w, h);
    P.g.drawImage(P0.c, -cr.x0, 0);
    return finish(P, Engine.sprites[name], 1, (ox - cr.x0) / cr.w);
  }

  return {
    lathe, lathed, PSI,
    mir, hoodBack, tones, hoodOver,
    turned, rigged, band,
    turn, layerOf, backOf, piece, cropTo, VIEW_ANGLE, finish,
    view, make, painter, at, css, hash, stride, sideLight, srcCanvas, SPECIES, POSES,
    has: name => !!SPECIES[name], species: () => Object.keys(SPECIES).sort(),
    // species painted in profile also get a head-on drawing for view 0
    front0: name => !!(SPECIES[name] && SPECIES[name].front0),
    clear() { cache.clear(); bytes = 0; }, budgetBytes: () => bytes, cap: CAP,
  };
})();

// ================================================================ species
// Each recipe(view, pose) returns a sprite. Views: 1 front-side, 2 side,
// 3 back-side, 4 back; unflipped, the creature faces screen-right, so its own
// right side is the one turned to us in views 1 to 3.

// ---------------------------------------------------------------- the Outrider-Captain
// Hal Brennick: long grey field coat with a shoulder cape, cross-straps and
// belt pouches, shoulder-length brown hair, a sabre in the right hand and a
// lantern held up in the left. Source: captain (79x165).
BEAST20A.SPECIES.captain = (() => {
  const B = BEAST20A, N = 'captain';
  // texture keys: hair, skin, boot leather, coat cloth from the painted front
  const pal = () => ({
    H: [N, 28, 4, 4, 16, 1], h: [N, 33, 1, 8, 4, 1.1], S: [N, 37, 9, 5, 5, 1], s: [N, 37, 9, 5, 5, 0.78], d: [N, 37, 9, 5, 5, 0.55],
    o: B.at(N, 30, 18, 0.5), e: B.at(N, 41, 15, 0.5),
    B: [N, 17, 152, 9, 10, 1], b: [N, 17, 152, 9, 10, 1.35], K: B.at(N, 18, 162, 0.55),
  });
  // profile head, facing right (15 x 25)
  const HEAD2 = [
    '....oohhhoo....',
    '..ohhhhhhhho...',
    '.oHhhhhhhhhho..',
    '.HHHHhhhhhhHo..',
    'oHHHHHHHhhHHHo.',
    'oHHHHHHHHHSSSo.',
    'HHHHHHHHHSSSSo.',
    'HHHHHHHHsSSSSo.',
    'HHHHHHHHsSSeSo.',
    'HHHHHHHHsSSeSSo',
    'HHHHHHHHsSSSSSS',
    'HHHHHHHHssSSSSo',
    'HHHHHHHHHsSSSo.',
    'HHHHHHHHHsSSSo.',
    'HHHHHHHHHssSdo.',
    'HHHHHHHHHHsSSo.',
    'oHHHHHHHHHssso.',
    '.HHHHHHHHHdso..',
    '.HHHHHHHHHdo...',
    '.HHHHHHHHdd....',
    '.oHHHHHHHdd....',
    '..HHHHHHHdd....',
    '..oHHHHHHdd....',
    '...HHHHHddd....',
    '...oHHHdddd....',
  ];
  // back of the head: hair to the shoulders (15 x 24)
  const HEAD4 = [
    '....oHHHHHo....',
    '..oHHhhhhhHHo..',
    '.oHHhhhHhhhHHo.',
    '.HHhhHHHHhhhHH.',
    'oHHhHHHHHHhhHHo',
    'oHHHHHHHHHHhHHo',
    'HHHHHHhHHHHHHHH',
    'HHHHHHhHHHHHHHH',
    'HHHHHhHHHHHHHHH',
    'HHHHHhHHHHHhHHH',
    'HHHHHhHHHHHhHHH',
    'HHHHhHHHHHHhHHH',
    'HHHHhHHHHHHHhHH',
    'HHHHhHHHHHHHhHH',
    'oHHHhHHHHHHHhHo',
    'oHHHhHHHHHHHhHo',
    '.HHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHH.',
    '.oHHHHHHHHHHHo.',
    '..HHHHHHHHHHH..',
    '..oHHHHHHHHHo..',
    '...oHHddddHo...',
    '....oddssdo....',
    '.....dssssd....',
  ];
  // a boot seen from the side, toe to the right (17 x 15)
  const BOOT = [
    '....oBBBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBo......',
    '....oBbBBBBo.....',
    '....oBbBBBBo.....',
    '....oBbBBBBo.....',
    '....oBbBBBBBo....',
    '....oBbBBBBBo....',
    '....oBBbBBBBBo...',
    '...oBBBbBBBBBBo..',
    '...oBBBBbbBBBBBo.',
    '...oBBBBBBbbBBBBo',
    '...oBBBBBBBBBBBBo',
    '...oKKKKKKKKKKKKo',
    '....ooooooooooo..',
  ];
  // Hair seen from behind, painted strand by strand over the head's box (front coordinates).
  function hairBack(P, hb, w) {
    const x0 = w - 1 - hb[2], x1 = w - 1 - hb[0], y0 = hb[1], y1 = hb[3], cx = (x0 + x1) / 2;
    const shape = [[x0 + 5, y0], [x1 - 5, y0], [x1 - 1, y0 + 4], [x1 + 1, y0 + 11], [x1, y1 - 5], [x1 - 2, y1 - 1], [cx + 3, y1], [cx - 3, y1 - 1], [x0 + 2, y1], [x0, y1 - 5], [x0 - 1, y0 + 11], [x0 + 1, y0 + 4]];
    // the hair's own painted grain, lit from the crown and falling into shadow at the nape
    P.grain(shape, [B.at(N, 29, 14, 0.85), B.at(N, 33, 4, 0.85), B.at(N, 30, 9, 0.95), B.at(N, 35, 2, 1.0)], 4, 7);
    P.lightIn(shape, (x, y) => 1.18 - 0.45 * (y - y0) / (y1 - y0) - 0.12 * Math.abs(x - cx) / (x1 - x0));
    const dk = B.at(N, 29, 14, 0.7);
    for (const [ax, bx] of [[cx - 4, x0 + 2], [cx - 1, cx - 3], [cx + 2, cx + 3], [cx + 5, x1 - 2]]) P.line(dk, ax, y0 + 6, bx, y1 - 2);
  }
  const CAPE = [N, 10, 28, 20, 22], COAT = [N, 50, 100, 10, 40];
  const recipe = B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    poses: {
      '': {
        A: 40, head: [28, 0, 47, 27],
        depth: [[26, 9], [46, 15], [100, 13], [143, y => 13 + (y - 100) * 0.14], [999, 8]],
        body: [[24, [27, 48]], [46, [8, 70]], [80, [19, 60]], [100, [15, 66]], [999, null]],
        erase: [[[57, 17], [79, 17], [79, 70], [57, 70]], [[9, 93], [16, 93], [37, 153], [30, 155]]],
        patch: [], heal: [[[[9, 96], [17, 96], [37, 150], [29, 150]], 9]],
        props: [{ r: [57, 17, 22, 53], X: 68, Z: 18, minK: 0.8 },
          { r: [8, 90, 32, 66], mask: [[9, 93], [16, 93], [37, 153], [30, 155]], X: 16, Z: 9, minK: 0.7 }],
      },
      _w1: {
        A: 41, head: [32, 0, 50, 26], legY: 130, stride: 6,
        body: [[25, [31, 51]], [52, [8, 80]], [95, [16, 68]], [999, null]],
        erase: [[[69, 50], [89, 50], [89, 104], [69, 104]], [[7, 90], [14, 90], [29, 150], [22, 152]]],
        patch: [], heal: [[[[8, 96], [15, 96], [28, 146], [21, 146]], 8]],
        props: [{ r: [69, 50, 20, 54], X: 79, Z: 10, minK: 0.8 },
          { r: [6, 88, 26, 66], mask: [[7, 90], [14, 90], [29, 150], [22, 152]], X: 13, Z: 9, minK: 0.7 }],
      },
      _w2: {
        A: 37, head: [28, 0, 46, 25], legY: 130, stride: -6,
        body: [[25, [27, 47]], [55, [6, 76]], [90, [15, 66]], [999, null]],
        erase: [[[66, 58], [85, 58], [85, 106], [66, 106]], [[7, 90], [14, 90], [29, 150], [22, 152]]],
        patch: [], heal: [[[[8, 96], [15, 96], [28, 146], [21, 146]], 8]],
        props: [{ r: [66, 58, 19, 48], X: 76, Z: 10, minK: 0.8 },
          { r: [6, 88, 26, 66], mask: [[7, 90], [14, 90], [29, 150], [22, 152]], X: 11, Z: 9, minK: 0.7 }],
      },
      _a1: {
        A: 47, head: [37, 17, 56, 45],
        depth: [[46, 9], [64, 15], [110, 13], [150, y => 13 + (y - 110) * 0.15], [999, 8]],
        body: [[46, [35, 58]], [62, [10, 85]], [100, [18, 75]], [999, null]],
        erase: [[[72, 34], [91, 34], [91, 84], [72, 84]], [[2, 30], [14, 16], [70, 0], [76, 2], [32, 24], [33, 60], [8, 62], [2, 45]]],
        patch: [],
        props: [{ r: [72, 34, 19, 50], X: 82, Z: 14, minK: 0.8 },
          { r: [0, 0, 78, 64], mask: [[2, 30], [14, 16], [70, 0], [76, 2], [32, 24], [33, 60], [8, 62], [2, 45]], X: 22, Z: 0, minK: 0.6 }],
      },
      _a2: {
        A: 43, head: [33, 0, 52, 28],
        depth: [[28, 9], [50, 15], [90, 13], [122, y => 13 + (y - 90) * 0.18], [999, 8]],
        body: [[28, [32, 54]], [62, [8, 72]], [999, null]],
        erase: [[[69, 8], [90, 8], [90, 58], [69, 58]], [[28, 46], [40, 40], [52, 46], [92, 70], [92, 76], [50, 62], [30, 62]]],
        patch: [],
        props: [{ r: [69, 8, 21, 50], X: 79, Z: 12, minK: 0.8 },
          { r: [28, 40, 64, 36], mask: [[28, 46], [40, 40], [52, 46], [92, 70], [92, 76], [50, 62], [30, 62]], X: 40, Z: 16, minK: 0.6 }],
      },
    },
    back(P, S) {
      const w = P.w, hb = S.head, cx = w - 1 - (hb[0] + hb[2]) / 2;
      // the collar of the cape closes over the neck, and the chest badge is on the other side
      P.tex(...CAPE, [[cx - 9, hb[3] - 2], [cx + 9, hb[3] - 2], [cx + 11, hb[3] + 8], [cx - 11, hb[3] + 8]]);
      P.tex(...CAPE, [[cx - 4, hb[3] + 8], [cx + 4, hb[3] + 8], [cx + 4, hb[3] + 32], [cx - 4, hb[3] + 32]]);
      hairBack(P, hb, w);
      P.light(() => 0.82);
    },
    fin(P, ox, th, v, p, S) {
      if (v !== 2) return;
      // the side view gets a drawn profile head in place of the turned one
      const hy = S.head[1];
      P.g.clearRect(ox - 12, hy, 26, S.head[3] - hy - 2);
      P.map(HEAD2, pal(), ox - 8, hy);
    },
  });
  return recipe;
})();

// ---------------------------------------------------------------- the Office Hushwarden
// A grey field-robe with a shoulder cape, a deep pointed hood over a barred
// visor, cross-straps and belt, and the warden's staff crowned with a muffled
// bell, carried in the left hand. Source: hushwarden (74x165).
BEAST20A.SPECIES.hushwarden = (() => {
  const B = BEAST20A, N = 'hushwarden';
  const HOOD = [19, 24, 5, 10];
  const staff = (dx, top) => [[50 + dx, 0 + top], [75 + dx, 0 + top], [75 + dx, 33 + top], [67 + dx, 35 + top], [68 + dx, 58], [68 + dx, 78], [66 + dx, 80], [66 + dx, 168], [55 + dx, 168], [55 + dx, 80], [52 + dx, 78], [52 + dx, 58], [55 + dx, 35 + top], [50 + dx, 33 + top]];
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    poses: {
      '': {
        A: 33, face: [[25, 15], [42, 15], [46, 30], [44, 42], [23, 42], [21, 30]],
        depth: [[45, 11], [62, 15], [100, 13], [150, y => 13 + (y - 100) * 0.1], [999, 8]],
        body: [[45, [19, 47]], [62, [0, 60]], [95, [15, 53]], [999, null]],
        erase: [staff(0, 0)], heal: [[[[50, 60], [58, 60], [58, 150], [50, 150]], -6]],
        props: [{ r: [50, 0, 25, 166], mask: staff(0, 0), X: 61, Z: 7, minK: 0.85 }],
      },
      _w1: {
        A: 33, face: [[25, 21], [42, 21], [46, 36], [44, 48], [23, 48], [21, 36]], legY: 140, stride: 5,
        erase: [staff(-4, 0)], heal: [[[[46, 60], [54, 60], [54, 150], [46, 150]], -6]],
        props: [{ r: [46, 0, 25, 167], mask: staff(-4, 0), X: 57, Z: 7, minK: 0.85 }],
        body: [[50, [19, 47]], [66, [0, 60]], [100, [14, 50]], [999, null]],
      },
      _w2: {
        A: 33, face: [[25, 21], [42, 21], [46, 36], [44, 48], [23, 48], [21, 36]], legY: 140, stride: -5,
        erase: [staff(-3, 0)], heal: [[[[47, 60], [55, 60], [55, 150], [47, 150]], -6]],
        props: [{ r: [47, 0, 24, 167], mask: staff(-3, 0), X: 58, Z: 7, minK: 0.85 }],
        body: [[50, [19, 47]], [66, [0, 60]], [100, [14, 50]], [999, null]],
      },
      _a1: {
        A: 39, face: [[32, 60], [47, 60], [50, 72], [48, 84], [31, 84], [29, 72]],
        depth: [[56, 9], [90, 12], [140, 13], [185, y => 13 + (y - 140) * 0.1], [999, 8]],
        body: [[90, [10, 70]], [999, null]],
        erase: [[[38, 0], [64, 0], [64, 32], [53, 36], [51, 62], [38, 84], [30, 80], [33, 60], [45, 34], [38, 32]]],
        heal: [[[[34, 60], [48, 60], [48, 86], [34, 86]], 10]],
        props: [{ r: [28, 0, 38, 86], mask: [[38, 0], [64, 0], [64, 32], [53, 36], [51, 62], [38, 84], [30, 80], [33, 60], [45, 34], [38, 32]], X: 45, Z: 6, minK: 0.85 }],
      },
      _a2: {
        A: 41, face: [[33, 15], [48, 15], [51, 28], [49, 38], [32, 38], [30, 28]],
        depth: [[42, 11], [60, 15], [100, 14], [135, y => 14 + (y - 100) * 0.12], [999, 8]],
        body: [[42, [27, 55]], [999, null]],
        erase: [[[26, 52], [52, 52], [49, 86], [62, 96], [62, 133], [20, 133], [23, 96], [34, 86]]],
        patch: [[N, 6, 96, 14, 30, [[24, 52], [54, 52], [62, 96], [64, 134], [18, 134], [21, 96]], 0.95]],
        props: [{ r: [18, 50, 46, 85], mask: [[26, 52], [52, 52], [49, 86], [62, 96], [62, 133], [20, 133], [23, 96], [34, 86]], X: 41, Z: 16, minK: 0.85 }],
      },
    },
    back(P, S) {
      P.grain(B.mir(P.w, S.face), [B.at(N, 27, 12), B.at(N, 30, 10), B.at(N, 26, 16), B.at(N, 24, 25), B.at(N, 42, 15), B.at(N, 44, 25, 0.9)], 4, 3);
      const f = B.mir(P.w, S.face), ys = f.map(q => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      P.lightIn(f, (x, y) => 1.08 - 0.35 * (y - y0) / (y1 - y0));
      const cx = Math.round((f[0][0] + f[1][0]) / 2); P.line(B.at(N, 23, 28), cx, y0 - 10, cx, y1);
      P.light(() => 0.8);
    },
  });
})();

// ---------------------------------------------------------------- the Deacon of the Unrung Bell
// A skull-faced deacon in a long, rotted brown robe and hood, barefoot, a
// hand-bell held up in the right hand (both hands, overhead, to strike; low
// before the body for the toll). Source: deacon (62x170).
BEAST20A.SPECIES.deacon = (() => {
  const B = BEAST20A, N = 'deacon';
  // the raised right arm: bell, hand, and the sleeve falling from the forearm
  const arm = dx => [[5 + dx, 0], [20 + dx, 0], [20 + dx, 18], [18 + dx, 32], [19 + dx, 40], [18 + dx, 62], [16 + dx, 80], [0, 80], [0, 40], [6 + dx, 30], [6 + dx, 18]];
  const face = (dx, dy) => [[22 + dx, 19 + dy], [42 + dx, 19 + dy], [44 + dx, 32 + dy], [41 + dx, 45 + dy], [23 + dx, 45 + dy], [20 + dx, 32 + dy]];
  // the stole and its bead-weights hang at the front; from behind it is all robe
  const stole = (dx, dy) => [[18 + dx, 44 + dy], [47 + dx, 44 + dy], [44 + dx, 80 + dy], [21 + dx, 80 + dy]];
  const ROBE = [N, 30, 92, 10, 26];
  // the robe's shoulder and flank that the raised sleeve hid, in the robe's own cloth
  const under = dx => [N, 6, 88, 12, 30, [[17 + dx, 36], [21 + dx, 36], [21 + dx, 84], [6 + dx * 0.5, 86], [8 + dx * 0.5, 60], [12 + dx, 44]], 0.92];
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 0.9,
    poses: {
      '': {
        A: 32, face: face(0, 0), stole: stole(0, 0),
        depth: [[45, 11], [62, 14], [110, 13], [158, y => 13 + (y - 110) * 0.07], [999, 6]],
        body: [[45, [19, 46]], [82, null], [118, [0, 50]], [999, null]],
        erase: [arm(0)], patch: [under(0)], props: [{ r: [0, 0, 22, 81], mask: arm(0), X: 11, Z: 3, minK: 0.85 }],
      },
      _w1: { A: 33, face: face(2, 0), stole: stole(2, 0), legY: 150, stride: 4, erase: [arm(2)], patch: [under(2)], props: [{ r: [0, 0, 24, 81], mask: arm(2), X: 13, Z: 3, minK: 0.85 }],
        body: [[45, [21, 48]], [82, null], [118, [0, 52]], [999, null]] },
      _w2: { A: 34, face: face(3, 0), stole: stole(3, 0), legY: 150, stride: -4, erase: [arm(5)], patch: [under(5)], props: [{ r: [0, 0, 27, 81], mask: arm(5), X: 16, Z: 3, minK: 0.85 }],
        body: [[45, [22, 49]], [82, null], [118, [0, 54]], [999, null]] },
      _a1: {
        A: 29, face: [[21, 42], [36, 42], [38, 52], [35, 63], [22, 63], [19, 52]], stole: stole(-3, 20),
        depth: [[64, 11], [92, 14], [140, 13], [178, y => 13 + (y - 140) * 0.08], [999, 6]],
        body: null,
        erase: [[[24, 0], [41, 0], [41, 22], [39, 38], [24, 38], [24, 22]]],
        props: [{ r: [23, 0, 19, 40], mask: [[24, 0], [41, 0], [41, 22], [39, 38], [24, 38], [24, 22]], X: 32, Z: 4, minK: 0.85 }],
      },
      _a2: {
        A: 30, face: [[20, 9], [40, 9], [42, 22], [39, 35], [21, 35], [18, 22]], stole: [[17, 36], [43, 36], [41, 52], [19, 52]],
        depth: [[36, 11], [55, 14], [110, 14], [142, y => 14 + (y - 110) * 0.1], [999, 6]],
        body: null,
        erase: [[[18, 52], [40, 52], [42, 85], [42, 112], [20, 112], [20, 85]]],
        heal: [[[[18, 52], [40, 52], [42, 85], [42, 112], [20, 112], [20, 85]], -15]],
        props: [{ r: [17, 50, 27, 64], mask: [[18, 52], [40, 52], [42, 85], [42, 112], [20, 112], [20, 85]], X: 30, Z: 15, minK: 0.85 }],
      },
    },
    back(P, S) {
      P.tex(...ROBE, B.mir(P.w, S.stole), { mul: 0.95 });
      B.hoodOver(P, N, S.face, B.tones(N, [[25, 18], [30, 14], [40, 25], [33, 12], [43, 34], [28, 16], [36, 15]]), B.tones(N, [[22, 30]], 0.6)[0]);
      P.light(() => 0.76);
    },
  });
})();

// ---------------------------------------------------------------- the Drowned Hollow
// A gaunt, grey, water-swollen hollow in a rotted shift, hair in wet strings,
// mouth open on a cry nobody hears, both hands reaching for you. No props:
// the reaching arms ride forward of the body as it turns. Source: drowned (86x160).
BEAST20A.SPECIES.drowned = (() => {
  const B = BEAST20A, N = 'drowned';
  const HAIR = () => B.tones(N, [[31, 10], [29, 16], [47, 12], [36, 3], [40, 2], [30, 22], [48, 20]]);
  const RAGS = () => B.tones(N, [[28, 60], [50, 70], [30, 80], [45, 85], [40, 75]]);
  // the reaching arms, each laid on its own bone (shoulder to hand)
  const ARM_L = [[24, 36], [26, 50], [20, 58], [12, 65], [0, 63], [0, 44], [8, 39], [16, 35]];
  const ARM_R = [[54, 37], [64, 43], [73, 55], [86, 65], [86, 84], [64, 85], [57, 72], [51, 56]];
  const A1_L = [[0, 0], [29, 0], [29, 52], [30, 72], [14, 72], [2, 40]];
  const A1_R = [[48, 0], [80, 0], [80, 40], [64, 72], [51, 72], [49, 50]];
  const A2_L = [[12, 44], [36, 44], [40, 60], [38, 84], [12, 84]];
  const A2_R = [[53, 40], [70, 52], [84, 68], [84, 92], [62, 92], [54, 70]];
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 1.0, limbB: 4, join: 4,
    poses: {
      '': {
        A: 39, face: [[32, 4], [46, 4], [48, 14], [46, 27], [33, 27], [30, 14]], chest: [[33, 28], [47, 28], [46, 62], [34, 62]],
        depth: [[28, 10], [60, 13], [110, 12], [999, 7]],
        body: [[30, [28, 50]], [92, [21, 58]], [999, null]],
        erase: [ARM_L, ARM_R],
        props: [{ r: [0, 32, 26, 34], mask: ARM_L, bone: [[22, 42], [4, 52]], boneZ: [0, 24] },
          { r: [50, 36, 36, 50], mask: ARM_R, bone: [[56, 46], [78, 72]], boneZ: [0, 24] }],
      },
      _w1: { A: 37, face: [[30, 4], [44, 4], [46, 14], [44, 28], [31, 28], [28, 14]], chest: [[31, 29], [45, 29], [44, 62], [32, 62]], legY: 110, stride: 5,
        body: [[30, [28, 47]], [95, [20, 53]], [999, null]] },
      _w2: { A: 38, face: [[31, 4], [45, 4], [47, 14], [45, 28], [32, 28], [29, 14]], chest: [[32, 29], [46, 29], [45, 62], [33, 62]], legY: 110, stride: -5,
        body: [[30, [29, 48]], [95, [21, 54]], [999, null]] },
      _a1: { A: 38, face: [[32, 24], [46, 24], [48, 34], [46, 50], [33, 50], [30, 34]], chest: [[33, 51], [47, 51], [46, 82], [34, 82]],
        erase: [A1_L, A1_R],
        props: [{ r: [0, 0, 30, 73], mask: A1_L, bone: [[26, 64], [15, 8]], boneZ: [0, 8] },
          { r: [48, 0, 32, 73], mask: A1_R, bone: [[52, 62], [65, 10]], boneZ: [0, 8] }],
        depth: [[52, 9], [85, 11], [130, 10], [999, 6]],
        body: [[52, [29, 49]], [100, [22, 58]], [999, null]] },
      _a2: { A: 40, face: [[34, 6], [49, 6], [51, 17], [49, 33], [35, 33], [32, 17]], chest: [[35, 34], [49, 34], [48, 60], [36, 60]],
        erase: [A2_L, A2_R],
        props: [{ r: [10, 40, 30, 46], mask: A2_L, bone: [[30, 44], [22, 76]], boneZ: [0, 28] },
          { r: [52, 40, 32, 54], mask: A2_R, bone: [[55, 44], [76, 82]], boneZ: [0, 28] }],
        depth: [[35, 9], [65, 12], [110, 11], [999, 6]],
        body: [[35, [30, 52]], [100, [26, 58]], [999, null]] },
    },
    back(P, S) {
      P.grain(B.mir(P.w, S.chest), RAGS(), 3, 5);
      P.grain(B.mir(P.w, S.face), HAIR(), 5, 9);
      const f = B.mir(P.w, S.face), ys = f.map(q => q[1]);
      P.lightIn(f, (x, y) => 1.05 - 0.3 * (y - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys)));
      P.light(() => 0.8);
    },
  });
})();

// ---------------------------------------------------------------- the Steam Golem
// A riveted brass engine-man: barrel chest round a furnace grate, a helm with
// a barred visor, twin smokestacks venting, arms like boilers. From behind:
// plate, rivets and the stacks; the fire is on the other side. Source: golem (84x160).
BEAST20A.SPECIES.golem = (() => {
  const B = BEAST20A, N = 'golem';
  const BRASS = [N, 36, 82, 12, 12];
  const PLATE = () => B.tones(N, [[30, 45], [55, 45], [26, 80], [58, 80], [42, 40], [35, 88], [50, 88]]);
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 1.0, limbB: 11,
    poses: {
      '': {
        A: 42, grate: [[31, 46], [53, 46], [54, 72], [30, 72]], visor: [[35, 20], [49, 20], [49, 35], [35, 35]],
        depth: [[38, 10], [100, 18], [115, 14], [999, 10]],
        body: [[40, [30, 55]], [100, [22, 62]], [999, null]],
      },
      _w1: { A: 43, grate: [[32, 46], [54, 46], [55, 72], [31, 72]], visor: [[36, 22], [50, 22], [50, 37], [36, 37]], legY: 110, stride: 6,
        body: [[42, [31, 56]], [100, [22, 64]], [999, null]] },
      _w2: { A: 42, grate: [[31, 46], [53, 46], [54, 72], [30, 72]], visor: [[35, 22], [49, 22], [49, 37], [35, 37]], legY: 110, stride: -6,
        body: [[42, [30, 55]], [100, [22, 62]], [999, null]] },
      _a1: {
        A: 46, grate: [[33, 60], [61, 60], [62, 96], [32, 96]], visor: [[38, 36], [52, 36], [52, 52], [38, 52]],
        depth: [[56, 10], [118, 18], [130, 14], [999, 10]],
        body: [[56, [34, 58]], [118, [26, 66]], [999, null]],
        erase: [[[0, 0], [33, 0], [36, 30], [34, 75], [12, 78], [0, 50]]],
        props: [{ r: [0, 0, 37, 79], mask: [[0, 0], [33, 0], [36, 30], [34, 75], [12, 78], [0, 50]], bone: [[30, 68], [24, 8]], boneZ: [0, 6] }],
      },
      _a2: {
        A: 52, grate: [[42, 56], [62, 56], [63, 78], [41, 78]], visor: [[44, 28], [58, 28], [58, 44], [44, 44]],
        depth: [[48, 10], [105, 18], [999, 11]],
        body: [[48, [40, 64]], [105, [30, 75]], [999, null]],
        erase: [[[0, 58], [34, 56], [50, 92], [52, 146], [0, 146]]],
        props: [{ r: [0, 54, 53, 92], mask: [[0, 58], [34, 56], [50, 92], [52, 146], [0, 146]], bone: [[30, 62], [22, 130]], boneZ: [0, 24] }],
      },
    },
    back(P, S) {
      // the grate and the visor are on the other side: riveted plate here
      // the furnace and the visor are on the other side: the back is riveted plate,
      // cut from the golem's own belly-plates and helm-crown and fitted over them
      const fit = (poly, sx, sy, sw, sh, mul) => {
        const m = B.mir(P.w, poly), xs = m.map(q => q[0]), ys = m.map(q => q[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        P.clip(m, () => P.cut(N, sx, sy, sw, sh, x0, y0, { k: (x1 - x0 + 1) / sw, ky: (y1 - y0 + 1) / sh, mul }));
        return { x0, x1, y0, y1 };
      };
      const g = fit(S.grate, 30, 74, 26, 18, 0.9);
      P.line(B.at(N, 42, 40, 0.55), (g.x0 + g.x1) / 2, g.y0 + 1, (g.x0 + g.x1) / 2, g.y1 - 1);
      for (const y of [g.y0 + 4, g.y1 - 4]) { P.px(B.at(N, 42, 40, 1.3), g.x0 + 3, y); P.px(B.at(N, 42, 40, 1.3), g.x1 - 3, y); }
      fit(S.visor, 37, 6, 12, 10, 0.95);
      P.light(() => 0.82);
    },
  });
})();

// ---------------------------------------------------------------- the Aegis Sentinel
// Bronze-and-iron plate built round a violet light-core in the chest, an
// eye-slit helm, a red rag of cloth hanging from its right hand. From
// behind: the core's back-plate, the helm's crest, the rag swinging at its
// side. Source: aegis (83x160).
BEAST20A.SPECIES.aegis = (() => {
  const B = BEAST20A, N = 'aegis';
  const PLATE = [N, 36, 62, 12, 16];
  const rag = (x0, y0, x1, y1) => [[x0, y0], [x1, y0 + 2], [x1 - 3, y1], [x0 + 4, y1 + 2], [x0 - 2, y1 - 15]];
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 1.0, limbB: 9,
    poses: {
      '': {
        A: 42, core: [[35, 28], [58, 28], [58, 58], [35, 58]], visor: [[35, 4], [50, 4], [50, 24], [35, 24]],
        depth: [[26, 11], [62, 20], [100, 17], [999, 10]],
        body: [[26, [32, 52]], [96, [24, 62]], [999, null]],
        erase: [rag(2, 88, 26, 136)], props: [{ r: [0, 86, 27, 54], mask: rag(2, 88, 26, 136), X: 14, Z: 4, minK: 0.8, flipBack: true }],
      },
      _w1: { A: 42, core: [[35, 28], [58, 28], [58, 58], [35, 58]], visor: [[35, 4], [50, 4], [50, 24], [35, 24]], legY: 115, stride: 6,
        body: [[26, [32, 52]], [96, [24, 62]], [999, null]],
        erase: [rag(4, 88, 28, 128)], props: [{ r: [0, 86, 29, 46], mask: rag(4, 88, 28, 128), X: 16, Z: 4, minK: 0.8, flipBack: true }] },
      _w2: { A: 41, core: [[34, 28], [57, 28], [57, 58], [34, 58]], visor: [[34, 4], [49, 4], [49, 24], [34, 24]], legY: 115, stride: -6,
        body: [[26, [31, 51]], [96, [23, 61]], [999, null]],
        erase: [rag(3, 84, 26, 128)], props: [{ r: [0, 82, 27, 50], mask: rag(3, 84, 26, 128), X: 14, Z: 4, minK: 0.8, flipBack: true }] },
      _a1: { A: 45, core: [[36, 26], [62, 26], [62, 58], [36, 58]], visor: [[38, 2], [53, 2], [53, 22], [38, 22]],
        body: [[24, [35, 55]], [70, [24, 70]], [999, null]],
        erase: [rag(3, 72, 24, 118)], props: [{ r: [0, 70, 25, 52], mask: rag(3, 72, 24, 118), X: 13, Z: 6, minK: 0.8, flipBack: true }] },
      _a2: { A: 42, core: [[32, 28], [56, 28], [56, 58], [32, 58]], visor: [[35, 2], [50, 2], [50, 22], [35, 22]],
        body: [[24, [33, 52]], [999, null]],
        erase: [rag(2, 70, 22, 112), [[2, 18], [30, 14], [36, 36], [30, 62], [4, 62]]],
        props: [{ r: [0, 68, 24, 48], mask: rag(2, 70, 22, 112), X: 12, Z: 6, minK: 0.8, flipBack: true },
          { r: [0, 12, 37, 52], mask: [[2, 18], [30, 14], [36, 36], [30, 62], [4, 62]], bone: [[30, 40], [14, 36]], boneZ: [0, 26] }] },
    },
    back(P, S) {
      // the core is set in the breast: from behind there is only its back-plate, riveted
      // the core is set in the breast: from behind only its back-plate shows,
      // fitted from the sentinel's own abdomen plates, with a riveted spine
      const fit = (poly, sx, sy, sw, sh, mul) => {
        const m = B.mir(P.w, poly), xs = m.map(q => q[0]), ys = m.map(q => q[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        P.clip(m, () => P.cut(N, sx, sy, sw, sh, x0, y0, { k: (x1 - x0 + 1) / sw, ky: (y1 - y0 + 1) / sh, mul }));
        return { x0, x1, y0, y1 };
      };
      const c = fit(S.core, 32, 60, 22, 26, 0.85), cx = Math.round((c.x0 + c.x1) / 2);
      P.line(B.at(N, 30, 70, 0.5), cx, c.y0 + 1, cx, c.y1 - 1);
      for (let y = c.y0 + 4; y < c.y1 - 2; y += 7) { P.px(B.at(N, 38, 64, 1.45), cx - 2, y); P.px(B.at(N, 38, 64, 1.45), cx + 2, y); }
      fit(S.visor, 36, 62, 12, 12, 0.9);
      P.light(() => 0.8);
    },
  });
})();

// ---------------------------------------------------------------- the Dirge
// A hanging shape of grey tatters round a dark, root-veined core, its head a
// ring of soft petals round a hole, trailing threads that drift and reach.
// From behind: the petals close over, the tatters hang unbroken, no core,
// no hole. It floats; nothing touches the ground. Source: dirge (65x150).
BEAST20A.SPECIES.dirge = (() => {
  const B = BEAST20A, N = 'dirge';
  const ring = (cx, hy) => [[cx - 12, hy], [cx + 12, hy], [cx + 14, hy + 13], [cx + 10, hy + 26], [cx - 10, hy + 26], [cx - 14, hy + 13]];
  const core = (cx, hy, len) => [[cx - 7, hy + 24], [cx + 8, hy + 24], [cx + 7, hy + len], [cx - 6, hy + len]];
  const pose = (A, hy, len, o) => Object.assign({ A, ring: ring(A, hy), core: core(A, hy, len) }, o || {});
  const TATTER = () => B.tones(N, [[14, 50], [18, 70], [48, 50], [44, 70], [20, 90], [45, 95], [12, 66], [52, 66]]);
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 0.8, limbB: 3, join: 3,
    poses: {
      '': pose(32, 0, 128, { depth: [[26, 11], [100, 12], [999, 9]] }),
      _w1: pose(40, 2, 124),
      _w2: pose(29, 2, 124),
      _a1: pose(34, 20, 130),
      _a2: pose(42, 2, 128),
    },
    back(P, S) {
      // no core and no hole from behind: the tatters beside the core are carried
      // across it, and the head is a hood of the same rags, darker towards the nape
      const c = B.mir(P.w, S.core); P.heal(c, -13, 0); P.heal(c, 13, 0);
      const r = B.mir(P.w, S.ring); P.heal(r, 0, 30);
      P.lightIn(r, (x, y) => 1.0 - 0.35 * (y - r[0][1]) / 26);
      P.light(() => 0.76);
    },
  });
})();

// ---------------------------------------------------------------- the Office Listening-Horn
// A brass gramophone horn on a jointed iron tripod, a pressure gauge on the
// column, a small ear-trumpet on a hose. Its own frames already swing the horn
// (scanning left and right, and full-face when it hears you), so as the stand
// turns the bell is redrawn from whichever of those paintings matches the way
// it now points: mouth-on, three-quarter, profile, or (pointing away) the
// bell's brass back with the throat at its centre. Source: horn (71x120).
BEAST20A.SPECIES.horn = (() => {
  const B = BEAST20A, N = 'horn';
  const BELL = {
    '': { poly: [[0, 0], [21, 0], [37, 13], [55, 21], [57, 35], [41, 39], [23, 45], [0, 45]], A: 32.5, yaw: 55 },
    _w1: { poly: [[0, 0], [15, 0], [31, 13], [45, 18], [47, 35], [29, 37], [13, 45], [0, 45]], A: 26.5, yaw: 85 },
    _w2: { poly: [[60, 0], [44, 0], [30, 13], [11, 18], [9, 35], [29, 37], [46, 45], [60, 45]], A: 26.5, yaw: -85 },
    _a1: { poly: [[3, 0], [44, 0], [46, 22], [44, 43], [3, 43], [1, 22]], A: 27, yaw: 0 },
    _a2: { poly: [[5, 0], [47, 0], [49, 22], [47, 43], [5, 43], [3, 22]], A: 27, yaw: 0 },
  };
  const gauge = A => [[A - 10, 38], [A + 9, 38], [A + 11, 47], [A + 9, 58], [A - 10, 58], [A - 12, 47]];
  const pieces = {};
  function bellPiece(key) {
    if (pieces[key]) return pieces[key];
    const fr = key === 'back' ? '_a2' : key, b = BELL[fr], sp = Engine.sprites[N + fr];
    const P = B.painter(sp.w, 48);
    P.cut(N + fr, 0, 0, sp.w, 48, 0, 0, { mask: b.poly });
    if (key === 'back') {
      // the outside of the bell: brass, lit at the top, the throat pipe at its heart
      const cx = 27, cy = 21, ring = [];
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ring.push([cx + Math.cos(a) * 18, cy + Math.sin(a) * 18]); }
      P.clip(ring, () => P.grain(ring, B.tones(N + '_w1', [[22, 20], [26, 16], [30, 24], [18, 26], [34, 20]]), 3, 21));
      P.lightIn(ring, (x, y) => 1.15 - 0.012 * Math.hypot(x - cx, y - cy) * 3 - 0.2 * (y - cy) / 18);
      for (let r = 4; r <= 14; r += 5) { const q = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; q.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } P.g.strokeStyle = B.at(N, 30, 30, 0.6); P.g.beginPath(); q.forEach((p, i) => (i ? P.g.lineTo(p[0], p[1]) : P.g.moveTo(p[0], p[1]))); P.g.closePath(); P.g.stroke(); }
      P.rect(B.at(N, 30, 70, 0.5), cx - 3, cy - 3, 6, 6); P.rect(B.at(N, 40, 30, 1.1), cx - 2, cy - 2, 2, 2);
    }
    pieces[key] = P.c; return P.c;
  }
  const deg = Math.PI / 180;
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    limbK: 1.0, limbB: 5,
    poses: {
      '': { A: 32.5, depth: [[60, 9], [80, 8], [999, 4]], body: [[60, [20, 46]], [999, null]], erase: [BELL[''].poly], gauge: gauge(32.5) },
      _w1: { A: 26.5, body: [[60, [14, 40]], [999, null]], erase: [BELL._w1.poly], gauge: gauge(26.5) },
      _w2: { A: 26.5, body: [[60, [14, 40]], [999, null]], erase: [BELL._w2.poly], gauge: gauge(26.5) },
      _a1: { A: 27, body: [[60, [15, 40]], [999, null]], erase: [BELL._a1.poly], gauge: gauge(27) },
      _a2: { A: 27, body: [[60, [15, 40]], [999, null]], erase: [BELL._a2.poly], gauge: gauge(27) },
    },
    back(P, S) {
      // the gauge reads to the front; behind it, its brass case and a rivet
      const g = B.mir(P.w, S.gauge); P.grain(g, B.tones(N, [[30, 70], [36, 66], [26, 64], [33, 74]]), 2, 5);
      P.lightIn(g, (x, y) => 1.1 - 0.4 * (y - 38) / 20);
      P.light(() => 0.85);
    },
    fin(P, ox, th, v, p) {
      const b = BELL[p || ''], gamma = b.yaw - th / deg;
      let key, flip = false;
      const ag = ((gamma % 360) + 540) % 360 - 180;
      if (Math.abs(ag) < 35) key = '_a2';
      else if (Math.abs(ag) >= 125) key = 'back';
      else if (ag > 0) key = ag < 70 ? '' : '_w1';
      else if (ag > -70) { key = ''; flip = true; } else key = '_w2';
      const src = key === 'back' ? '_a2' : key, pc = bellPiece(key), ax = BELL[src].A;
      const behind = Math.cos(ag * deg) < -0.25;
      const draw = () => {
        P.g.save(); P.g.translate(ox, 0); if (flip) P.g.scale(-1, 1); P.g.drawImage(pc, -ax, 0); P.g.restore();
      };
      if (behind) P.under(() => { P.g.globalAlpha = 1; draw(); }); else draw();
      if (behind) P.light((x, y) => (y < 46 && Math.abs(x - ox) > 2 ? 1 : 1));
    },
  });
})();

// ---------------------------------------------------------------- the Brood-Mother
// A great lilac egg-sac netted with pale veins, the brood's red mouths
// crowding its lower front, a hooked stalk on top, eight jointed legs in a
// ring. The sac turns (the mouths go round to the side, the back is bare
// veined skin); the ring of legs reads the same from every side, so it stays
// a ring, a little narrower edge-on. Source: broodmother (115x170).
BEAST20A.SPECIES.broodmother = (() => {
  const B = BEAST20A, N = 'broodmother';
  const sac = (cx, y0, s) => [[cx, y0], [cx + 9, y0 + 8], [cx + 23, y0 + 30], [cx + 31, y0 + 55], [cx + 29, y0 + 90], [cx + 21, y0 + 110], [cx + 11, y0 + 125 * s], [cx - 11, y0 + 125 * s], [cx - 21, y0 + 110], [cx - 29, y0 + 90], [cx - 31, y0 + 55], [cx - 23, y0 + 30], [cx - 9, y0 + 8]];
  const pods = (cx, y0) => [[cx - 24, y0 + 55], [cx + 24, y0 + 55], [cx + 26, y0 + 92], [cx + 14, y0 + 124], [cx - 14, y0 + 124], [cx - 26, y0 + 92]];
  function pose(A, y0, o) {
    const body = sac(A, y0, 1);
    return Object.assign({ A, pods: pods(A, y0), keep: body, depth: [[999, 1.0]], body: null }, o || {});
  }
  return B.rigged(N, {
    angles: [0, Math.PI / 4, Math.PI * 0.42, Math.PI * 0.75, Math.PI],
    poses: { '': pose(57, 0), _w1: pose(56, 0), _w2: pose(56, 0), _a1: pose(57, 4), _a2: pose(59, 0) },
    front(P, S, p) {
      // the legs come off as one ring-shaped card; only the sac turns
      const legs = B.painter(P.w, P.h); legs.g.drawImage(P.c, 0, 0); legs.erase(S.keep);
      P.g.save(); P.g.globalCompositeOperation = 'destination-in'; P.poly('#000', S.keep); P.g.restore();
      S._legs = legs.c;
    },
    back(P, S) {
      // no mouths behind: bare veined sac, carried down from the shoulders of it
      const m = B.mir(P.w, S.pods); P.heal(m, 0, -36);
      P.heal([[m[0][0] + 2, m[0][1] + 34], [m[1][0] - 2, m[0][1] + 34], [m[2][0], m[2][1]], [m[3][0], m[3][1] + 2], [m[4][0], m[4][1] + 2], [m[5][0], m[5][1]]], 0, -34);
      P.light(() => 0.78);
    },
    props(S) { return [{ canvas: S._legs, rx: 0, y: 0, ax: S.A, X: 0, Z: -2, minK: 0.86 }]; },
  });
})();

// ---------------------------------------------------------------- the Cacophony Hound
// A wolf-shape of grey static and bristling smoke, ears back, mouth all
// teeth, pale eyes, a tail like torn cloud. It is painted in profile, so the
// side view is the painting, and the other angles come off the lathe: the
// body is round in section, the legs a near pair and a far pair; head-on and
// from behind the eyes and the teeth are put back by hand. Source: hound (208x160).
BEAST20A.SPECIES.hound = (() => {
  const B = BEAST20A, N = 'hound';
  const RIG = {
    '': { A: 112, legY: 108, eye: [182, 70], jaw: [196, 100], tail: 45, neck: 160 },
    _w1: { A: 112, legY: 100, eye: [176, 62], jaw: [188, 88], tail: 45, neck: 155 },
    _w2: { A: 95, legY: 100, eye: [150, 62], jaw: [166, 90], tail: 35, neck: 135 },
    _a1: { A: 100, legY: 105, eye: [150, 72], jaw: [160, 108], tail: 30, neck: 128 },
    _a2: { A: 95, legY: 120, eye: [100, 90], jaw: [110, 125], tail: 30, neck: 75 },
  };
  function rig(p) {
    const R = RIG[p] || RIG[''], fr = Engine.sprites[N + p];
    const F = B.painter(fr.w, fr.h); F.g.drawImage(B.srcCanvas(N + p), 0, 0);
    // the tail is a flat plume, the neck and head narrower than the barrel of the chest
    return { front: F.c, axis: R.A, legY: R.legY, legZ: 10, legR: 4, sideIsArt: true,
      thick: (x, yt, yb) => (x < R.tail ? 4 : Math.min(x > R.neck ? 11 : 19, (yb - yt + 1) / 2 * 0.6)), R };
  }
  // From behind, drawn by hand from the painting's own parts: the ears over
  // the crown, the barrel of the rump, both hind legs, the tail hanging down.
  function rear(p) {
    // drawn at the idle painting's scale, set into the pose frame's own canvas and scale
    const fr = Engine.sprites[N + p], k = fr.h / (160 * (fr.hs || 1));
    const st = B.stride(p), W = Math.ceil(104 * k), H = fr.h, A = 52;
    return B.make(N + p, W, H, P => {
      P.g.translate(0, H - 160 * k); P.g.scale(k, k);
      const ear = B.piece(N, 148, 18, 24, 32);
      P.g.drawImage(ear, A - 30, 6); P.g.save(); P.g.translate(A + 30, 6); P.g.scale(-1, 1); P.g.drawImage(ear, 0, 0); P.g.restore();
      P.grain([[A - 18, 28], [A + 18, 28], [A + 22, 46], [A - 22, 46]], B.tones(N, [[120, 40], [130, 60], [100, 50], [140, 45]]), 2, 31);
      const rump = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; rump.push([A + Math.cos(a) * 31 + (Math.sin(a * 5) * 2), 72 + Math.sin(a) * 44]); }
      P.layer(Q => Q.tex(N, 62, 36, 40, 48, rump), 0.62, 1.12, 0.7, 0.42);
      const leg = B.piece(N, 22, 106, 40, 42, [[31, 106], [53, 106], [60, 148], [24, 148], [26, 126]]);
      P.g.drawImage(leg, A - 44 - st * 2, 116 + Math.max(0, st) * 2);
      P.g.save(); P.g.translate(A + 44 + st * 2, 116 + Math.max(0, -st) * 2); P.g.scale(-1, 1); P.g.drawImage(leg, 0, 0); P.g.restore();
      // the ridge of bristles along the spine, seen end-on
      P.cut(N, 92, 14, 40, 22, A - 20, 22, { mul: 1.0 });
      P.cut(N, 0, 40, 56, 92, A, 40, { rot: -0.47, px: 52, py: 50 });
    }, { cx: A * k / W, light: () => 0.8 });
  }
  const recipe = (v, p) => {
    if (v === 0) return Engine.sprites[N + '_a2'];          // head-on it is the painting of the lunge
    if (v === 4) return rear(p);
    // the strike is painted head-on; turned away from you it is the crouching snap of the wind-up
    const q = p === '_a2' ? '_a1' : p, r = rig(q);
    return B.lathed(N + q, r, v, (P, ox, psi) => {
      // head-on and three-quarter: the pale eyes and the white of the teeth
      if (psi > 0.3) {
        const e = B.at(N, 182, 70, 1.25), tooth = B.at(N, 190, 95, 1.2), dk = B.at(N, 190, 90, 0.4);
        const hx = ox + (r.R.eye[0] - r.axis) * Math.cos(psi), sep = psi > 1.2 ? 9 : 6;
        for (const sx of psi > 1.2 ? [-1, 1] : [1]) { P.rect(dk, hx + sx * sep - 2, r.R.eye[1] - 1, 4, 3); P.rect(e, hx + sx * sep - 1, r.R.eye[1], 2, 1); }
        if (psi > 1.2) { const jx = ox + (r.R.jaw[0] - r.axis) * Math.cos(psi); P.rect(dk, jx - 7, r.R.jaw[1] - 4, 14, 6); for (let i = -6; i <= 6; i += 2) P.line(tooth, jx + i, r.R.jaw[1] - 4, jx + i, r.R.jaw[1] - 1 - (i & 2 ? 1 : 0)); }
      }
    });
  };
  recipe.rig = rig;
  recipe.front0 = true;
  return recipe;
})();

// ---------------------------------------------------------------- the small painted ones
// The Briar-sprite (js/flume16.js) and the Fret-crawler (js/parish.js) are
// drawn in code, side-on. Here each is drawn again for every angle, by the
// same hand and with the same strokes, colours and proportions as the
// originals, but laid out in the round: head, legs and body placed for the
// angle and painted back to front. View 0 is a true head-on drawing.
BEAST20A.SPECIES.briarsprite = (() => {
  const B = BEAST20A, N = 'briarsprite';
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  function paint(x, pose, psi) {
    const bob = pose === '_w1' ? -2 : pose === '_w2' ? 2 : 0;
    const lunge = pose === '_a2' ? 10 : pose === '_a1' ? -4 : 0, rear = pose === '_a1' ? -7 : pose === '_a2' ? 4 : 0;
    const leg = pose === '_w1' ? 4 : pose === '_w2' ? -4 : 0;
    const c = Math.cos(psi), sn = Math.sin(psi), ac = Math.abs(c), as = Math.abs(sn);
    const r = rng(41);
    const bx = 36, by = 42 + bob + rear * 0.3;
    E(x, 36, 62, 26 * ac + 15 * as, 3.6, 'rgba(0,0,0,0.35)');
    // the head sits forward of the knot: where it lands depends on the angle
    const fwd = 16 + lunge * 0.6, hx = bx + fwd * c, hy = 36 + bob + rear, hd = fwd * sn;
    const legs = [[-12, 1], [-4, -1], [6, 1], [14, -1]].flatMap(([lx, sg]) => [[lx, sg, 7], [lx, sg, -7]].slice(0, 1).concat([[lx, -sg, sg > 0 ? -7 : 7]])).slice(0, 4);
    const LEGS = [[-12, 7, 1], [-12, -7, -1], [10, 7, -1], [10, -7, 1]];
    const legAt = ([lx, lz, sg]) => ({ x: bx + lx * c - lz * sn, d: lx * sn + lz * c, sg });
    const drawLeg = q => { const ox = leg * q.sg; L(x, q.x, 50 + bob, q.x + ox * ac - 3 * c, 62, '#3a2e18', 2.4); L(x, q.x + ox * ac - 3 * c, 62, q.x + ox * ac + 2 * c, 63, '#2a2010', 2.4); };
    const ls = LEGS.map(legAt).sort((a, b) => a.d - b.d);
    for (const q of ls) if (q.d < 0) drawLeg(q);
    const head = () => {
      E(x, hx, hy, 10 * (0.75 + 0.25 * ac), 8, VG(x, hy - 8, hy + 8, '#5a6a30', '#2a3218'));
      for (let i = 0; i < 6; i++) L(x, hx - 6 + i * 2.4, hy - 6, hx - 7 + i * 3, hy - 12 - (i % 2) * 3, '#cfc8a0', 1.2);
      if (sn > -0.35) {
        const ex0 = 3 * c, sep = 3.4 + 0.8 * as;
        for (const ex of [-sep, sep]) { E(x, hx + ex0 + ex, hy - 1, 3.2, 3.2, 'rgba(170,255,190,0.5)'); E(x, hx + ex0 + ex, hy - 1, 1.8, 1.8, '#e8fff0'); }
        const gape = pose === '_a2' ? 5 : pose === '_a1' ? 3 : 1, mx = hx + 7 * c;
        E(x, mx, hy + 4, 4, gape, '#120c08');
        for (let i = 0; i < 4; i++) L(x, mx - 3 + i * 1.6, hy + 3, mx - 2.6 + i * 1.6, hy + 4 + gape, '#e8e0c0', 0.9);
      }
    };
    if (hd < 0) head();
    // body: the knot of bramble, as long as it is seen
    const brx = Math.hypot(20 * c, 15 * sn), bcx = bx + lunge * 0.4 * c;
    E(x, bcx, by, brx, 14, VG(x, 28, 56, '#4a5a28', '#222a14'));
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 14, px = bcx + Math.cos(a) * d * brx / 20, py = by + Math.sin(a) * d * 0.7;
      const l1 = 5 + r() * 6, l2 = 5 + r() * 6;
      L(x, px, py, px + Math.cos(a) * l1 * brx / 20, py + Math.sin(a) * l2, i % 3 ? '#cfc8a0' : '#6a8a38', 1.2);
    }
    for (let i = 0; i < 14; i++) E(x, bcx - brx * 0.7 + r() * brx * 1.5, by - 8 + r() * 18, 3 + r() * 2.6, 2 + r() * 2, `rgb(${50 + (r() * 24 | 0)},${100 + (r() * 60 | 0)},${44 + (r() * 20 | 0)})`, r());
    for (const q of ls) if (q.d >= 0) drawLeg(q);
    if (hd >= 0) head();
  }
  const ANG = [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2];
  const recipe = (v, p) => {
    const sp = Engine.sprites[N + p] || Engine.sprites[N];
    const P = B.painter(sp.w, sp.h); P.g.imageSmoothingEnabled = false;
    if (v === 2) P.g.drawImage(B.srcCanvas(N + p), 0, 0); else paint(P.g, p, ANG[v]);
    if (v >= 3) P.light(() => (v === 4 ? 0.78 : 0.86));
    return B.finish(P, sp, 1, 0.5);
  };
  recipe.front0 = true;
  return recipe;
})();

BEAST20A.SPECIES.fretcrawler = (() => {
  const B = BEAST20A, N = 'fretcrawler';
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  function paint(x, pose, psi) {
    const step = pose === '_w1' ? 4 : pose === '_w2' ? -4 : 0, up = pose === '_a1' ? -8 : pose === '_a2' ? 2 : 0, stretch = pose === '_a2' ? 10 : 0, claw = pose === '_a2' ? 13 : pose === '_a1' ? 9 : 5;
    const c = Math.cos(psi), sn = Math.sin(psi), ac = Math.abs(c), as = Math.abs(sn);
    const len = 52 + stretch * 0.4, wid = 22, cx = 72 - stretch * 0.2 * c, cy = 46 + up * 0.4;
    E(x, 72, 62, 58 * ac + 26 * as, 5, 'rgba(0,0,0,0.35)');
    // six legs, three a side, splayed out from under the shell
    const LEGS = []; for (let i = 0; i < 3; i++) for (const s of [-1, 1]) LEGS.push({ L: -18 + i * 18, s, i });
    const legLine = q => {
      const k = (q.i % 2 ? -1 : 1) * step * q.s, bxl = q.L, bz = q.s * 9, fxl = q.L + k, fz = q.s * 26;
      const px = (l, z) => cx + l * c - z * sn;
      x.strokeStyle = '#4a463e'; x.lineWidth = 2.6;
      x.beginPath(); x.moveTo(px(bxl, bz), cy + (depthOf(q) > 0 ? 8 : 0)); x.lineTo(px(bxl + k * 0.6, q.s * 18), cy + 4 - (pose === '_a1' && q.i === 2 ? 10 : 0)); x.lineTo(px(fxl, fz), cy + 16); x.stroke();
    };
    const depthOf = q => q.L * sn + q.s * 18 * c;
    const legs = LEGS.slice().sort((a, b) => depthOf(a) - depthOf(b));
    for (const q of legs) if (depthOf(q) < 0) legLine(q);
    const hd = (len - 6 + stretch * 0.6) * sn, hx = cx + (46 + stretch * 0.6) * c, hy = 46 + up;
    const head = () => {
      E(x, hx, hy, 9 * (0.8 + 0.2 * ac), 7, '#bdb7a4');
      if (sn > -0.4) {
        // the pincers, opening towards whatever it faces
        x.strokeStyle = '#d8d2bc'; x.lineWidth = 2.2;
        const spread = 4 + 6 * as;
        if (as > 0.6) {
          // coming at you: the two hooks open to either side under the head
          for (const sg of [1, -1]) { x.beginPath(); x.moveTo(hx + sg * 3, hy + 3); x.quadraticCurveTo(hx + sg * (8 + claw * 0.5), hy + 4, hx + sg * (4 + claw * 0.3), hy + 8 + claw * 0.4); x.stroke(); }
        } else for (const sg of [1, -1]) {
          const ex = hx + 4 * c + sg * (as > 0.5 ? spread * 0.5 : 0), ey = hy + (sg > 0 ? 2 : -3);
          x.beginPath(); x.moveTo(ex, ey);
          x.quadraticCurveTo(ex + (10 + claw * 0.4) * c + sg * spread * sn * 0.6, ey + sg * (6 + claw * 0.4), ex + (6 + claw) * c + sg * spread * as, ey + sg * (6 + claw * 0.4));
          x.stroke();
        }
        if (as > 0.6) { E(x, hx - 3, hy - 1, 1.6, 1.6, '#201c14'); E(x, hx + 3, hy - 1, 1.6, 1.6, '#201c14'); } else E(x, hx + 2 * c, hy - 1, 1.6, 1.6, '#201c14');
      }
    };
    if (hd < 0) head();
    // the shell: long in profile, a low dome end-on; the frets run across it
    const rx = Math.hypot(len * c, wid * sn);
    x.beginPath(); x.ellipse(cx, cy, rx, 17, 0, 0, Math.PI * 2); x.fillStyle = VG(x, 30, 62, '#7a7468', '#403c34'); x.fill();
    x.beginPath(); x.ellipse(cx, cy - 2, rx - 4, 12, 0, 0, Math.PI * 2); x.fillStyle = 'rgba(160,154,140,0.35)'; x.fill();
    if (ac > 0.3) {
      for (let i = -8; i <= 8; i++) {
        const fx = cx + i * 5.4 * c * (len / 52), hh = 12 * Math.sqrt(Math.max(0, 1 - (i / 9.6) * (i / 9.6)));
        L(x, fx, cy - 2 - hh, fx + 3 * sn, cy - 2 + hh + 3, i % 2 ? 'rgba(210,204,186,0.5)' : 'rgba(50,46,38,0.55)', 1.2);
      }
    } else {
      // end-on, the nearest ridges are arches over the dome
      for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(cx, cy + 2, rx - 3 - i * 4, 13 - i * 2.6, 0, Math.PI, Math.PI * 2); x.strokeStyle = i % 2 ? 'rgba(210,204,186,0.5)' : 'rgba(50,46,38,0.55)'; x.lineWidth = 1.2; x.stroke(); }
    }
    L(x, cx - rx + 4, cy - 2, cx + rx - 4, cy - 2, 'rgba(40,36,30,0.5)', 1);
    for (const q of legs) if (depthOf(q) >= 0) legLine(q);
    if (hd >= 0) head();
  }
  const ANG = [Math.PI / 2, Math.PI / 4, 0, -Math.PI / 4, -Math.PI / 2];
  const recipe = (v, p) => {
    const sp = Engine.sprites[N + p] || Engine.sprites[N];
    const P = B.painter(sp.w, sp.h);
    if (v === 2) P.g.drawImage(B.srcCanvas(N + p), 0, 0); else paint(P.g, p, ANG[v]);
    if (v >= 3) P.light(() => 0.86);
    return B.finish(P, sp, 1, 0.5);
  };
  recipe.front0 = true;
  return recipe;
})();
