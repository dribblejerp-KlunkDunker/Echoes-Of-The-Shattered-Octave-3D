#!/usr/bin/env node
'use strict';
// Phase 20 BEASTA: bake the bestiary views.
//   PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node tools/art/bestiary/bake20a.js [species...]
// Serves the repository on a private local port, opens the game, loads
// tools/art/bestiary/recipes20a.js into the page, draws every view of every
// pose of every species, and writes
//   img/bestiary20a/<species>.png   one atlas per species (rows = poses, cells = views)
//   js/bestiary20a.js               the cell table between @@ATLAS-BEGIN and @@ATLAS-END
// Deterministic: the same sources give the same bytes (the PNG encoder below
// has no timestamps; the recipes use no unseeded randomness). Only node's own
// modules plus Playwright (a dev tool already used by the test suite).
const fs = require('fs');
const path = require('path');
const http = require('http');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(ROOT, 'img', 'bestiary20a');
const RUNTIME = path.join(ROOT, 'js', 'bestiary20a.js');
const RECIPES = path.join(__dirname, 'recipes20a.js');
const POSES = ['', '_w1', '_w2', '_a1', '_a2'];

// ---------------------------------------------------------------- PNG (RGBA or palette, no ancillary chunks)
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// rows of `bpp`-byte pixels, each row filtered with whichever PNG filter packs smallest
function filtered(raw, w, h, bpp) {
  const stride = w * bpp, out = Buffer.alloc((stride + 1) * h);
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const row = raw.subarray(y * stride, (y + 1) * stride), up = y ? raw.subarray((y - 1) * stride, y * stride) : prev;
    let best = null, bestSum = Infinity, bestF = 0;
    for (let f = 0; f < 5; f++) {
      const line = Buffer.alloc(stride); let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? row[i - bpp] : 0, b = up[i], c = i >= bpp ? up[i - bpp] : 0;
        let p;
        if (f === 0) p = row[i];
        else if (f === 1) p = row[i] - a;
        else if (f === 2) p = row[i] - b;
        else if (f === 3) p = row[i] - ((a + b) >> 1);
        else { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = row[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
        line[i] = p & 255; sum += line[i] < 128 ? line[i] : 256 - line[i];
      }
      if (sum < bestSum) { bestSum = sum; best = line; bestF = f; }
    }
    out[y * (stride + 1)] = bestF; best.copy(out, y * (stride + 1) + 1);
  }
  return out;
}
function png(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // palette if the atlas has at most 256 colours (alpha is all-or-nothing here)
  const colours = new Map(); let pal = true;
  for (let i = 0; i < w * h && pal; i++) {
    const k = rgba[i * 4 + 3] ? (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2] : -1;
    if (!colours.has(k)) { colours.set(k, colours.size); if (colours.size > 256) pal = false; }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  if (pal) {
    const keys = [...colours.keys()].sort((a, b) => a - b); keys.forEach((k, i) => colours.set(k, i));
    ihdr[8] = 8; ihdr[9] = 3;
    const plte = Buffer.alloc(keys.length * 3), trns = Buffer.alloc(keys.length, 255);
    keys.forEach((k, i) => { if (k < 0) { trns[i] = 0; return; } plte[i * 3] = k >> 16; plte[i * 3 + 1] = (k >> 8) & 255; plte[i * 3 + 2] = k & 255; });
    const idx = Buffer.alloc(w * h);
    for (let i = 0; i < w * h; i++) idx[i] = colours.get(rgba[i * 4 + 3] ? (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2] : -1);
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', trns), chunk('IDAT', zlib.deflateSync(filtered(idx, w, h, 1), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  }
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(filtered(Buffer.from(rgba), w, h, 4), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Reduce an atlas to at most 256 colours (median cut over the opaque pixels,
// nearest-colour mapping, no dithering: these are pixel sprites).
function quantise(rgba, n) {
  const px = []; for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3]) px.push(i);
  const boxes = [px]; const out = Buffer.from(rgba);
  while (boxes.length < n) {
    let bi = -1, bRange = -1, bCh = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let ch = 0; ch < 3; ch++) { let lo = 255, hi = 0; for (const p of b) { const v = rgba[p + ch]; if (v < lo) lo = v; if (v > hi) hi = v; } if (hi - lo > bRange) { bRange = hi - lo; bi = i; bCh = ch; } }
    });
    if (bi < 0 || bRange <= 0) break;
    const b = boxes[bi].sort((p, q) => rgba[p + bCh] - rgba[q + bCh]), mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const pal = boxes.map(b => { const s = [0, 0, 0]; for (const p of b) for (let ch = 0; ch < 3; ch++) s[ch] += rgba[p + ch]; return s.map(v => Math.round(v / Math.max(1, b.length))); });
  boxes.forEach((b, i) => { for (const p of b) { out[p] = pal[i][0]; out[p + 1] = pal[i][1]; out[p + 2] = pal[i][2]; } });
  return out;
}

// ---------------------------------------------------------------- a private static server
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + port + '/?nosw=1');
    await page.waitForFunction(() => typeof DIRECTIONS !== 'undefined' && typeof BESTIARY20A !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 120000 });
    await page.addScriptTag({ content: fs.readFileSync(RECIPES, 'utf8') });
    const want = process.argv.slice(2);
    const species = (await page.evaluate(() => BEAST20A.species())).filter(n => !want.length || want.includes(n));
    // keep the cell table of species not rebaked this time
    const src = fs.readFileSync(RUNTIME, 'utf8');
    const m = /\/\/ @@ATLAS-BEGIN[^\n]*\n\s*const ATLAS = ([\s\S]*?);\n\s*\/\/ @@ATLAS-END/.exec(src);
    const table = m ? JSON.parse(m[1]) : {};
    fs.mkdirSync(OUT, { recursive: true });
    let total = 0;
    for (const name of species) {
      const cells = await page.evaluate(({ name, POSES }) => {
        const out = [];
        for (const p of POSES) for (let v = 0; v <= 4; v++) {
          if (!Engine.sprites[name + p]) continue;
          if (v === 0 && !BEAST20A.SPECIES[name].front0) continue;
          BEAST20A.clear();
          const s = BEAST20A.view(name, v, p); if (!s) continue;
          // an existing painting used as it is (the hound's head-on lunge) is referenced, not copied
          const ref = Object.keys(Engine.sprites).find(k => Engine.sprites[k] === s);
          if (ref) { out.push({ v, p, ref }); continue; }
          const u8 = new Uint8Array(s.data.buffer, s.data.byteOffset, s.data.byteLength); let bin = '';
          for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
          out.push({ v, p, w: s.w, h: s.h, hs: s.hs, cx: s.cx, dy: s.dy, px: btoa(bin) });
        }
        return out;
      }, { name, POSES });
      // pack: one row per pose, views left to right, 1px gutters
      for (const cell of cells) if (cell.px) cell.px = Buffer.from(cell.px, 'base64');
      const rows = POSES.map(p => cells.filter(c => c.p === p && !c.ref));
      const W = Math.max(...rows.map(r => r.reduce((a, c) => a + c.w + 1, 0))), H = rows.reduce((a, r) => a + (r.length ? Math.max(...r.map(c => c.h)) + 1 : 0), 0);
      const rgba = Buffer.alloc(W * H * 4); const c = {};
      let y = 0;
      for (const r of rows) {
        if (!r.length) continue;
        let x = 0;
        for (const cell of r) {
          for (let yy = 0; yy < cell.h; yy++) cell.px.copy(rgba, ((y + yy) * W + x) * 4, yy * cell.w * 4, (yy + 1) * cell.w * 4);
          c[cell.v + '|' + cell.p] = [x, y, cell.w, cell.h, +cell.hs.toFixed(5), +cell.cx.toFixed(5), cell.dy];
          x += cell.w + 1;
        }
        y += Math.max(...r.map(q => q.h)) + 1;
      }
      for (const cell of cells) if (cell.ref) c[cell.v + '|' + cell.p] = cell.ref;
      const file = name + '.png', bytes = png(W, H, quantise(rgba, 255));
      fs.writeFileSync(path.join(OUT, file), bytes);
      const ver = require('crypto').createHash('sha256').update(bytes).digest('hex').slice(0, 8);
      table[name] = { f: file, v: ver, c };
      total += bytes.length;
      console.log(name, W + 'x' + H, bytes.length + ' bytes', Object.keys(c).length + ' cells');
    }
    const sorted = {}; for (const k of Object.keys(table).sort()) sorted[k] = table[k];
    const out = src.replace(/(\/\/ @@ATLAS-BEGIN[^\n]*\n\s*)const ATLAS = [\s\S]*?;(\n\s*\/\/ @@ATLAS-END)/, (all, a, b) => a + 'const ATLAS = ' + JSON.stringify(sorted) + ';' + b);
    fs.writeFileSync(RUNTIME, out);
    console.log('total', total, 'bytes;', errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
    if (errors.length) process.exitCode = 1;
  } finally { await browser.close(); srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
