'use strict';
// Procedural stand-in icon: the game's favicon glyph (gold triangle, notch and dashed line on dark brown),
// rasterised with 3x3 supersampling and written as PNG + ICO using only Node's zlib. Run: npm run icons
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x1a, 0x14, 0x10], GOLD = [0xd9, 0xa4, 0x41];
// Glyph in the favicon's 32x32 space.
const TRI = [[16, 3], [26, 24], [6, 24], [16, 3]];
const NOTCH = [[12, 24], [16, 29], [20, 24]];
const LINE = [[8, 14], [24, 14]];

function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
function polyDist(px, py, pts) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i], pts[i + 1]));
  return d;
}
function inGlyph(x, y) {
  if (polyDist(x, y, TRI) <= 1) return true;
  if (polyDist(x, y, NOTCH) <= 1) return true;
  // dashed line: 3 on, 2 off, 0.75 half-width
  if (Math.abs(y - 14) <= 0.75 && x >= 8 && x <= 24 && ((x - 8) % 5) < 3) return true;
  return false;
}
function render(size) {
  // Padding keeps the glyph clear of platform icon masks; rounded-square plate.
  const px = Buffer.alloc(size * size * 4), S = 3, scale = 32 / size, r = 0.18 * 32;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let cov = 0, plate = 0;
    for (let sj = 0; sj < S; sj++) for (let si = 0; si < S; si++) {
      const x = (i + (si + 0.5) / S) * scale, y = (j + (sj + 0.5) / S) * scale;
      const cx = Math.max(r, Math.min(32 - r, x)), cy = Math.max(r, Math.min(32 - r, y));
      if (Math.hypot(x - cx, y - cy) <= r) { plate++; if (inGlyph(x, y)) cov++; }
    }
    const n = S * S, o = (j * size + i) * 4, g = cov / n;
    px[o] = Math.round(BG[0] * (1 - g) + GOLD[0] * g);
    px[o + 1] = Math.round(BG[1] * (1 - g) + GOLD[1] * g);
    px[o + 2] = Math.round(BG[2] * (1 - g) + GOLD[2] * g);
    px[o + 3] = Math.round(255 * plate / n);
  }
  return px;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size) {
  const raw = render(size), rows = [];
  for (let j = 0; j < size; j++) rows.push(Buffer.from([0]), raw.subarray(j * size * 4, (j + 1) * size * 4));
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function ico(sizes) {
  const imgs = sizes.map(png), head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, i) => {
    const o = 6 + i * 16;
    head[o] = s >= 256 ? 0 : s; head[o + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(imgs[i].length, o + 8); head.writeUInt32LE(off, o + 12); off += imgs[i].length;
  });
  return Buffer.concat([head, ...imgs]);
}
const out = path.join(__dirname, '..', 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png(1024));
fs.writeFileSync(path.join(out, 'icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]));
console.log('wrote build/icon.png (1024) and build/icon.ico (7 sizes)');
