'use strict';
// Phase 26: the Library of the Reach (js/library26.js, js/library26-books.js). node test/library26.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
let buyButtons = [];
const ctx = new Proxy({}, {
  get: (t, k) => k === 'createImageData' || k === 'getImageData'
    ? (...args) => { const w = args.length === 2 ? args[0] : args[2], h = args.length === 2 ? args[1] : args[3]; return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }
    : k === 'measureText' ? () => ({ width: 10 }) : k in t ? t[k] : () => {},
  set: (t, k, v) => { t[k] = v; return true; }
});
function el() {
  return { style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, innerHTML: '', textContent: '', value: '', children: [], width: 320, height: 200,
    parentNode: { children: [], insertBefore() {} },
    appendChild(e) { this.children.push(e); return e; },
    get firstChild() { return this.children[0]; },
    removeChild(e) { const i = this.children.indexOf(e); if (i >= 0) this.children.splice(i, 1); },
    remove() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null, focus() {}, querySelector: () => el(), querySelectorAll: () => [],
    getContext: () => ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 200 }) };
}
const select = s => { if (!elements.has(s)) elements.set(s, el()); return elements.get(s); };
const sandbox = {
  console, performance, Uint8Array, Uint8ClampedArray, Uint32Array, Float32Array, TextEncoder, TextDecoder,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  requestAnimationFrame: () => 0, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {},
  navigator: { getGamepads: () => [], userAgent: 'test', maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  Image: class { constructor() { this.width = this.height = 64; } },
  document: { querySelector: select, getElementById: id => select('#' + id),
    querySelectorAll: s => s === '[data-buy]' ? buyButtons : [], createElement: el,
    addEventListener() {}, removeEventListener() {}, body: el(), head: el(), documentElement: el() },
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary')
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const order = ['assets', 'data', 'maps', 'engine', 'audio', 'grove', 'coda', 'wilds', 'game', 'party', 'anim', 'travel', 'upgrades'];
for (const file of order) vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), sandbox, { filename: file });
// Test the registered document routing without emulating browser column layout.
vm.runInContext('const READING = { SOURCES: {} };', sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/library26-books.js'), 'utf8') + '\nglobalThis.LIBRARY_BOOKS = LIBRARY_BOOKS;', sandbox, { filename: 'library26-books.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js/library26.js'), 'utf8'), sandbox, { filename: 'library26.js' });
vm.runInContext(`globalThis.T = { G, READING, LIBRARY, buildAllMaps, loadMap, useDeco, renderLog, snapshotGame, restoreGame, LOOT, CACHE, ITEMS };
showEvent = (title, body, choices) => { G.state = 'event'; globalThis.lastEvent = { title, body, choices }; };
openModal = (html, name) => { globalThis.lastModal = html; G.openPanel = name; };`, sandbox);
const T = sandbox.T, L = T.LIBRARY, B = L.BOOKS;

// ---- the catalogue: built from the sources, valid, varied, and free of the review's known pitfalls
const { execFileSync } = require('node:child_process');
execFileSync(process.execPath, [path.join(root, 'tools/library/build.js'), '--check'], { stdio: 'pipe' });
assert(B.length >= 40, 'a library, not a shelf: ' + B.length);
assert.equal(new Set(B.map(b => b.id)).size, B.length);
assert.equal(new Set(B.map(b => b.title)).size, B.length);
assert(new Set(B.map(b => L.shelfOf(b.genre).key)).size >= 6, 'every shelf has books');
assert(new Set(B.map(b => b.genre)).size >= 15, 'many genres');
for (const b of B) {
  assert(T.READING.SOURCES[b.title], 'held-document routing for ' + b.title);
  const all = b.text.join(' ');
  assert(!/\bsilver (piece|coin)s?\b/i.test(all), b.id + ' uses silver coin');
  assert(!/<[a-z]/i.test(all), b.id + ' has markup');
}
const html = L.bodyHtml({ author: '<b>x</b>', genre: 'history', year: '1', origin: 'o', text: ['a <script>', 'b\nc'] });
assert(!html.includes('<b>x') && !html.includes('<script>') && html.includes('&lt;script&gt;') && html.includes('b<br>c'), 'escaped');
console.log('PASS catalogue: ' + B.length + ' books, ' + new Set(B.map(b => b.genre)).size + ' genres, valid, escaped, routed');

// ---- placement: one non-solid pile per shelved map, on open floor against a wall, clear of doors; idempotent
const G = T.G;
G.player = { name: 'Reader', cls: { name: 'x' }, hp: 30, hpMax: 30, voice: 10, voiceMax: 10, fat: 100, fatMax: 100, inv: [], weapons: ['sword'], weapon: 0,
  armor: {}, attrs: { Personality: 50, Strength: 50 }, skills: {}, songs: ['murmur'], gold: 20, level: 1, xp: 0, kills: 0, pellets: 0, bolts: 0 };
G.flags = {}; G.journal = []; G.ledger = []; G.maps = T.buildAllMaps();
const shelved = [...new Set(B.filter(b => b.how === 'pile').map(b => b.at))];
for (const id of shelved) {
  const m = G.maps[id];
  if (!m) continue;   // built by later modules (flume, greenroot, sheepwalk, kestrel, heist): the browser test checks those
  L.place(m, id); L.place(m, id);
  const piles = m.entities.filter(e => e.libPile);
  assert.equal(piles.length, 1, 'one pile on ' + id);
  const p = piles[0];
  assert.equal(p.solid, false); assert.equal(p.transient, true);
  assert(!m.isSolidCell(Math.floor(p.x), Math.floor(p.y)), 'pile in a wall on ' + id);
  for (const k of Object.keys(m.doors)) { const dx = (k % m.w) + 0.5 - p.x, dy = Math.floor(k / m.w) + 0.5 - p.y; assert(dx * dx + dy * dy >= 2.25 * 2.25 - 1e-6, 'pile by a door on ' + id); }
  assert(!m.entities.some(o => o !== p && (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < 0.8 ** 2), 'pile on top of something on ' + id);
}
for (const [id, m] of Object.entries(G.maps)) if (!shelved.includes(id)) { L.place(m, id); assert(!m.entities.some(e => e.libPile), 'no pile on ' + id); }
console.log('PASS placement: one non-solid pile on each of ' + shelved.filter(id => G.maps[id]).length + ' pile maps built here, off doors and furniture, idempotent');

// ---- reading: from the pile, marks it read once, consumes nothing; the logbook library lists it; saves keep it
const pileMap = shelved.find(id => G.maps[id]);
T.loadMap(pileMap);
const pile = G.map.entities.find(e => e.libPile);
if (pile) {
  const inv = JSON.stringify(G.player.inv), here = L.booksAt(pileMap);
  T.useDeco(pile);
  assert.equal(sandbox.lastEvent.title, 'Books');
  assert.equal(sandbox.lastEvent.choices.length, here.length + 1);
  sandbox.lastEvent.choices[0].f();
  assert.equal(sandbox.lastEvent.title, here[0].title);
  assert.equal(G.flags['lib:' + here[0].id], true);
  assert.equal(L.count(), 1);
  assert.equal(JSON.stringify(G.player.inv), inv);
  L.read(here[0].id); assert.equal(L.count(), 1, 'rereading does not double count');
}
assert.equal(L.read('__proto__'), false); assert.equal(L.read('constructor'), false);
L.renderLibrary();
assert(sandbox.lastModal.includes('Your Library') && sandbox.lastModal.includes('1 of ' + B.length));
const saved = JSON.parse(JSON.stringify(T.snapshotGame()));
assert(!Object.values(saved.maps).some(m => (m.extra || []).some(e => e.libPile)), 'piles are never saved');
T.restoreGame(saved);
assert.equal(L.count(), 1, 'read books survive a save');
console.log('PASS reading: from the pile, once, nothing consumed; the library lists it; saves keep it and never the piles');
