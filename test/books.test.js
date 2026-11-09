'use strict';
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
vm.runInContext(fs.readFileSync(path.join(root, 'js/books.js'), 'utf8'), sandbox, { filename: 'books.js' });
vm.runInContext(`globalThis.T = { G, CLASSES, ITEMS, NPCS, READING, MOOR_BOOKS, buildAllMaps, loadMap, pickUp, useDeco, useItem, renderInventory, renderDialogue, DLG, snapshotGame, restoreGame, LOOT, CACHE };
showEvent = (title, body, choices) => { G.state = 'event'; globalThis.lastEvent = { title, body, choices }; };`, sandbox);
const T = sandbox.T;
const B = T.MOOR_BOOKS;
assert.equal(B.volumes.length, 2);
assert.equal(B.volumes[0].title, 'The Things Taken Home');
assert(B.volumes[0].text.startsWith('Hessa read the back of the portrait twice.'));
assert(B.volumes[0].text.endsWith('For the first time since the collapse, there was somewhere to go.'));
assert(B.volumes[0].text.includes('“I heard you, Hess.”'));
assert(B.volumes[1].text.includes('EQUIPMENT RETURNED FOR ASSESSMENT.'));
assert(B.volumes[1].text.includes('“But no name.”'));
for (const v of B.volumes) {
  assert.equal(T.READING.SOURCES[v.title].style, 'paper');
  assert.equal(T.ITEMS[v.id].use, 'moor_book');
  assert(!JSON.stringify(T.LOOT).includes(v.id));
  assert(!JSON.stringify(T.CACHE).includes(v.id));
}
// Canon review (story/Game Layer/Review - The Moor serial.md): no colliding names, no silver coin, no parish frame.
const allText = B.volumes.map(v => v.text + ' ' + (v.preface || '')).join(' ') + JSON.stringify(T.NPCS.moor_bookseller.greet.polite + T.NPCS.moor_bookseller.greet.normal + T.NPCS.moor_bookseller.greet.blunt + T.NPCS.moor_bookseller.name);
for (const banned of ['Moor', 'Jory', 'Varek', 'Aldren', 'Pell', 'silver', 'dispatch number', 'eastern works', 'adjudicator', 'parish'])
  assert(!allText.includes(banned), 'serial still says ' + banned);
assert(B.volumes[0].text.includes('nineteen sovereigns'));
assert(B.volumes.every(v => v.price === 1 && T.ITEMS[v.id].sprite === 'broadsheet'));
console.log('PASS chapter, continuation, reader registration, no random loot, canon names and coin');

const G = T.G;
G.player = { name: 'Reader', cls: T.CLASSES[0], hp: 30, hpMax: 30, voice: 10, voiceMax: 10,
  fat: 100, fatMax: 100, inv: [], weapons: ['sword'], weapon: 0, armor: {}, attrs: { Personality: 50, Strength: 50 },
  skills: {}, songs: ['murmur'], gold: 20, level: 1, xp: 0, kills: 0, pellets: 0, bolts: 0 };
G.flags = {}; G.journal = []; G.ledger = []; G.maps = T.buildAllMaps();
const base = Object.fromEntries(Object.entries(G.maps).map(([id, m]) => [id, m.baseCount]));
for (const [id, map] of Object.entries(G.maps)) { B.place(map, id); B.place(map, id); }
const locations = Object.entries(G.maps).filter(([, m]) => m.entities.some(e => e.moorPlacement)).map(([id]) => id).sort();
assert.equal(JSON.stringify(locations), JSON.stringify(['lyra_house', 'tavern']));
const tavern = G.maps.tavern, library = G.maps.lyra_house;
assert.equal(tavern.entities.filter(e => e.moorPlacement).length, 2);
assert.equal(library.entities.filter(e => e.moorPlacement).length, 1);
for (const [id, map] of Object.entries(G.maps)) {
  assert.equal(map.baseCount, base[id]);
  for (const e of map.entities.filter(e => e.moorPlacement)) {
    assert.equal(e.transient, true);
    assert.equal(map.isSolidCell(Math.floor(e.x), Math.floor(e.y)), false);
    assert(!map.entities.some(o => o !== e && o.solid && Math.hypot(e.x - o.x, e.y - o.y) < (e.radius || 0) + (o.radius || 0)));
  }
}
console.log('PASS plausible placement allowlist, no blocking overlaps, idempotence, preserved base indexes');

T.loadMap('lyra_house');
const inventoryBefore = JSON.stringify(G.player.inv);
T.useDeco(library.entities.find(e => e.use === 'moor_library'));
assert.equal(sandbox.lastEvent.choices.length, 3, 'library offers reads and leave, not taking');
sandbox.lastEvent.choices[1].f();
assert.equal(sandbox.lastEvent.title, 'The Gate Book');
assert.equal(JSON.stringify(G.player.inv), inventoryBefore);
assert.equal(G.flags['moor_read:book_gate_book'], true);
assert.equal(B.collect('book_gate_book'), false, 'cannot take library copies');

T.loadMap('tavern');
T.useDeco(tavern.entities.find(e => e.use === 'moor_donations'));
assert.equal(sandbox.lastEvent.choices.length, 5);
for (const v of B.volumes) {
  assert.equal(B.collect(v.id), true);
  assert.equal(B.collect(v.id), false);
  assert.equal(G.count(v.id), 1);
  T.useItem(G.player.inv.find(s => s.id === v.id));
  assert.equal(sandbox.lastEvent.title, v.title);
  assert.equal(G.count(v.id), 1);
}
T.useDeco(tavern.entities.find(e => e.use === 'moor_donations'));
assert.equal(sandbox.lastEvent.choices.length, 3, 'already-taken donations no longer offered');
T.renderInventory();
assert(select('#modal-panel').innerHTML.includes('>Read</button>'));
console.log('PASS free library reading, nonconsuming inventory reading, one-time donated copies');

// Click the real game trade handlers, including an unaffordable purchase.
T.DLG.npc = T.NPCS.moor_bookseller; T.DLG.log = []; T.DLG.choices = null;
buyButtons = B.volumes.map((v, i) => ({ dataset: { buy: String(i) } }));
T.renderDialogue('buy');
buyButtons[0].onclick(); buyButtons[1].onclick();
assert.equal(G.player.gold, 18);
assert.equal(G.count('book_things_taken_home'), 2);
assert.equal(G.count('book_gate_book'), 2);
G.player.gold = 0; buyButtons[0].onclick();
assert.equal(G.player.gold, 0); assert.equal(G.count('book_things_taken_home'), 2);
console.log('PASS actual shop handlers charge correctly and reject insufficient gold');

const saved = JSON.parse(JSON.stringify(T.snapshotGame()));
assert(!Object.values(saved.maps).some(m => m.extra.some(e => e.id === 'moor_bookseller' || e.moorPlacement)));
T.restoreGame(saved);
for (const v of B.volumes) {
  assert.equal(G.count(v.id), 2);
  assert.equal(G.flags['moor_read:' + v.id], true);
  assert.equal(B.collect(v.id), false);
}
assert.equal(G.maps.tavern.entities.filter(e => e.moorPlacement).length, 2);
assert.equal(B.read('__proto__'), false);
assert.equal(B.collect('constructor'), false);
const legacy = JSON.parse(JSON.stringify(saved));
for (const v of B.volumes) { delete legacy.flags['moor_read:' + v.id]; delete legacy.flags['moor_taken:' + v.id]; }
legacy.player.inv = [];
T.restoreGame(legacy);
assert.equal(B.collect(B.volumes[0].id), true, 'old saves without book flags remain playable');
console.log('PASS save/restore, no duplicated donations after load, legacy saves, unknown IDs');

// The Rite seals Lyra's house (game.js): the Cantor's shelf goes with it, and the pedlar stops sending people there.
G.flags.rite_started = true;
B.place(G.maps.lyra_house, 'lyra_house');
assert.equal(G.maps.lyra_house.entities.filter(e => e.moorPlacement).length, 0, 'shelf gone once the house is sealed');
assert(!T.NPCS.moor_bookseller.greet.polite.includes('Cantor'));
assert(T.NPCS.moor_bookseller.topics.Oakhaven.includes('went with her house'));
console.log('PASS the Cantor’s shelf closes with her house');
