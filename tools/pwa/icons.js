#!/usr/bin/env node
'use strict';
// Phase 18 PWA: draws the app icons into assets/icons/ with no image library and no network.
//   node tools/pwa/icons.js
// The mark is the game's own sigil (the favicon in index.html and the title-screen logo): a ring, a triangle, a dashed
// chevron and two bars in brass on the near-black of the parchment UI. Procedural stand-in art: every pixel is computed
// from distances to the shapes (anti-aliased), then written as a PNG with node's zlib. The output is deterministic, so
// running it twice gives identical files.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', '..', 'assets', 'icons');
const BG = [0x1a, 0x14, 0x10], BG2 = [0x2b, 0x1f, 0x14], GOLD = [0xd9, 0xa4, 0x41];

// the sigil in a 64 x 64 box, as the logo draws it: [type, ...numbers, strokeWidth]
const SHAPES = [
  ['circle', 32, 32, 26, 2],
  ['poly', [[32, 8], [50, 46], [14, 46]], true, 2],
  ['poly', [[14, 46], [32, 60], [50, 46]], false, 1.5, 3],        // the dashed chevron (3 on, 3 off)
  ['poly', [[18, 30], [46, 30]], false, 1.5],
  ['poly', [[24, 22], [40, 22]], false, 1],
];

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return { d: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), along: t * Math.sqrt(l2) };
}
// stroke coverage (0..1) of one shape at a point in the 64-unit box; px = size of one output pixel in those units
function coverage(sh, x, y, px) {
  const cov = (d, w) => Math.max(0, Math.min(1, 0.5 + (w / 2 - d) / px));
  if (sh[0] === 'circle') return cov(Math.abs(Math.hypot(x - sh[1], y - sh[2]) - sh[3]), sh[4]);
  const pts = sh[1], closed = sh[2], w = sh[3], dash = sh[4];
  let best = 0, run = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const { d, along } = segDist(x, y, a[0], a[1], b[0], b[1]);
    let c = cov(d, w);
    if (dash) { const s = (run + along) % (dash * 2); c = cov(d, w) * (s < dash ? 1 : 0); }
    if (c > best) best = c;
    run += len;
  }
  return best;
}

// size px square; scale = how much of the square the 64-unit sigil box fills (maskable icons keep to the safe circle)
function draw(size, scale) {
  const buf = Buffer.alloc(size * size * 4);
  const unit = 64 / (size * scale), off = (size - size * scale) / 2;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    // a warm glow behind the mark
    const gx = (i + 0.5) / size - 0.5, gy = (j + 0.5) / size - 0.5, g = Math.max(0, 1 - Math.hypot(gx, gy) * 1.7);
    let r = BG[0] + (BG2[0] - BG[0]) * g * g, gr = BG[1] + (BG2[1] - BG[1]) * g * g, b = BG[2] + (BG2[2] - BG[2]) * g * g;
    const x = (i + 0.5 - off) * unit, y = (j + 0.5 - off) * unit;
    let c = 0;
    for (const sh of SHAPES) c = Math.max(c, coverage(sh, x, y, unit));
    r += (GOLD[0] - r) * c; gr += (GOLD[1] - gr) * c; b += (GOLD[2] - b) * c;
    const o = (j * size + i) * 4;
    buf[o] = Math.round(r); buf[o + 1] = Math.round(gr); buf[o + 2] = Math.round(b); buf[o + 3] = 255;
  }
  return buf;
}

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) { raw[j * (size * 4 + 1)] = 0; rgba.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const ICONS = [
  ['icon-192.png', 192, 0.94], ['icon-512.png', 512, 0.94],
  ['icon-maskable-512.png', 512, 0.66],            // inside the 80% safe circle, so any launcher mask keeps the whole mark
  ['apple-touch-icon.png', 180, 0.86],
];
module.exports = { ICONS, draw, png };
if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, size, scale] of ICONS) { fs.writeFileSync(path.join(OUT, name), png(size, draw(size, scale))); console.log('wrote assets/icons/' + name); }
}
