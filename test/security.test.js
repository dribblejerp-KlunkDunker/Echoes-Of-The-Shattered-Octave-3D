// Regression test: imported save codes/files are untrusted input.
// A crafted save must not be able to inject markup through custom songs,
// house storage, or the boss-autosave row (Superagent PR Security finding).
//
// Run with: node test/security.test.js
'use strict';
const fs = require('fs');
const path = require('path');

let fails = 0;
function assert(cond, label) {
  console.log((cond ? 'PASS ' : 'FAIL ') + label);
  if (!cond) fails++;
}

// ---- minimal browser stubs for the surface the game touches at load ----
function makeEl() {
  return {
    style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    dataset: {}, innerHTML: '', textContent: '', value: '', files: [], id: '',
    onclick: null, onchange: null, parentNode: { children: [], insertBefore(e) { this.children.push(e); return e; } },
    children: [], get firstChild() { return this.children[0]; }, appendChild(e) { this.children.push(e); return e; },
    removeChild(e) { const i = this.children.indexOf(e); if (i >= 0) this.children.splice(i, 1); return e; },
    insertBefore(e) { this.children.push(e); return e; },
    remove() {}, addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null, focus() {}, blur() {},
    querySelector: () => makeEl(), querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 320, height: 200 }),
    getContext: () => ctxStub, width: 320, height: 200,
  };
}
const ctxStub = new Proxy({ canvas: { width: 320, height: 200 } }, {
  get(t, k) {
    if (k === 'createImageData') return (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'getImageData') return (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
    if (k === 'measureText') return () => ({ width: 10 });
    if (k in t) return t[k];
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});
const els = {};
globalThis.document = {
  getElementById: (id) => (els[id.replace(/^#/, '')] = els[id.replace(/^#/, '')] || makeEl()),
  querySelector: (s) => (els[s.replace(/^#/, '')] = els[s.replace(/^#/, '')] || makeEl()),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  addEventListener() {}, removeEventListener() {},
  body: makeEl(), documentElement: makeEl(),
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => [], userAgent: 'test', maxTouchPoints: 0 }, configurable: true });
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.Image = class {
  constructor() { this.width = 64; this.height = 64; }
  set src(v) { this._src = v; const cb = this.onload; if (cb) setImmediate(cb); }
  get src() { return this._src; }
};

// ---- load the game exactly as index.html does, then expose handles ----
const root = path.join(__dirname, '..');
const order = ['assets', 'data', 'maps', 'engine', 'audio', 'grove', 'coda', 'wilds', 'game', 'party', 'anim', 'travel', 'upgrades'];
const expose = `\nglobalThis.__T = { G, UPG, SONGS, SONG_NOTES, SONG_CADENCES, SONG_DYNAMICS, ITEMS, restoreGame, snapshotGame, buildAllMaps, renderSongs, renderHouseChest, renderLoad, renderCodexModal, ensurePlayerUpgrades, cleanText, cleanName, openDisguise, disguiseStatus, disguiseExposed, crimeState, normalizeCrime, renderWantedPoster, renderPrison, returnEvidence };`;
const code = order.map(f => fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8')).join('\n') + expose;
try {
  new Function(code)();
} catch (e) {
  console.log('FAIL load crash: ' + ((e && e.stack) || e));
  process.exit(1);
}
const T = globalThis.__T;

// ---- build a legitimate save, then tamper it like an attacker would ----
T.G.flags = {};
T.G.maps = T.buildAllMaps();
T.G.map = T.G.maps.oakhaven; T.G.mapId = 'oakhaven';
T.G.day = 1; T.G.tod = 0.5; T.G.noise = 2;
T.G.ledger = []; T.G.journal = [];
T.G.player = {
  name: 'Saver', hp: 10, hpMax: 20, voice: 5, voiceMax: 10, fat: 5, fatMax: 10,
  gold: 0, pellets: 0, bolts: 0, glass: 0, kills: 0, xp: 0, level: 1,
  weapons: ['sword'], weapon: 0, inv: [{ id: 'tonic', n: 1 }], attrs: { Strength: 10 },
  skills: { Blade: 20 }, songs: ['tending'], cls: 'blade',
};
const save = JSON.parse(JSON.stringify(T.snapshotGame()));
save.day = 'DAY<img src=x onerror=alert(3)>';
save.player.customSongs = {
  '"><img src=x onerror=alert(1)>': { name: 'x', desc: 'x', cost: 1, noise: 1 },
  evil: {
    name: '<img src=x onerror=alert(2)>', desc: '<script>alert(2)</script>',
    cost: '"><b>c</b>', noise: 'x', hz: '<svg onload=1>',
    effects: ['<svg onload=1>'], cadence: '"><i>', dyn: 5, freq: 'x',
  },
  good_song: {
    name: 'My Canticle', hz: '174→285', desc: 'A fine song.', cost: 3, power: 2, noise: 1,
    effects: [T.SONG_NOTES[0].effect], cadence: T.SONG_CADENCES[0].id, dyn: T.SONG_DYNAMICS[1].id,
    freq: 174, freq2: null, stun: 0, bleed: 0, mendFat: 0, custom: true,
  },
};
save.player.songs = ['good_song', 'tending', '"><img src=x>', 'missing_song'];
save.player.houseStorage = [{ id: '<img onerror=1>', n: '</td><script>' }, { id: 'tonic', n: '5' }, { id: 'tonic', n: 2.7 }, { id: 'tonic', n: 'x' }];
save.player.titles = ['"><img src=x onerror=alert(4)>', 'Keeper of Names'];
save.player.activeTitle = '"><img src=x onerror=alert(4)>';
save.player.injuries = ['<script>alert(5)</script>'];
// Body handling is runtime-only: imports cannot create interactive corpses or callbacks.
save.dragBody = { corpse: true, stashedIn: { label: '<img onerror=1>' } };
save.maps.oakhaven.extra.push({ kind: 'deco', corpse: true, bodyCover: true, use: 'body_cover', sprite: 'proctor', x: 23.5, y: 22.5 });
save.maps.oakhaven.extra.push({ kind: 'enemy', type: 'proctor', x: 24.5, y: 22.5, corpse: true, bodyCover: true, stashedIn: '<img onerror=1>', bodyFound: true, dragReported: true });

T.restoreGame(JSON.parse(JSON.stringify(save)));
const p = T.G.player;
assert(!T.G.dragBody && !T.G.ents.some(e => e.corpse || e.stashedIn || e.bodyFound || e.dragReported), 'imported body references and concealment metadata ignored');
assert(T.G.ents.filter(e => e.bodyCover).length === 1, 'import cannot create fake body recesses or corpse decorations');

// Disguise status only renders static labels/numbers, never imported flag text.
T.G.flags['disguise:exposed:oakhaven'] = '<img src=x onerror=alert(9)>';
T.G.player.inv.push({ id: 'a_synodrobe', n: 1 }); T.G.player.armor.body = 'a_synodrobe';
T.G.coverSuspicion = 0; T.G.state = 'play'; T.openDisguise();
assert(!T.disguiseExposed() && !/<img|<script|<svg/i.test(document.querySelector('#modal-panel').innerHTML), 'hostile exposure flag is not rendered as markup or accepted as a boolean');
T.G.flags['disguise:exposed:oakhaven'] = true;
assert(T.disguiseExposed() && T.disguiseStatus().includes('EXPOSED'), 'legitimate boolean exposure is retained');

// ---- 1. custom songs are strictly schema-validated ----
assert(Object.keys(p.customSongs).every(id => /^[A-Za-z0-9_ -]{1,32}$/.test(id)), 'unsafe custom song ids rejected');
const evil = p.customSongs.evil;
assert(!!evil && !/[<>"'&]/.test(evil.name) && !/[<>]/.test(evil.desc) && !/[<>"'&]/.test(String(evil.hz)), 'song text stripped of markup');
assert(typeof evil.cost === 'number' && typeof evil.noise === 'number' && typeof evil.freq === 'number', 'song stats coerced to numbers');
assert(Array.isArray(evil.effects) && evil.effects.every(e => T.SONG_NOTES.some(n => n.effect === e)), 'song effects enum-validated');
assert(T.SONG_CADENCES.some(c => c.id === evil.cadence) && T.SONG_DYNAMICS.some(d => d.id === evil.dyn), 'cadence/dynamic enum-validated');
const good = T.SONGS.good_song;
assert(!!good && good.name === 'My Canticle' && good.hz === '174→285' && good.desc === 'A fine song.', 'legitimate custom song preserved');

// ---- 2. the song list drops unknown and unsafe ids ----
assert(p.songs.every(s => typeof s === 'string' && T.SONGS[s]) && !p.songs.includes('missing_song'), 'song list keeps only known ids');
assert(!p.songs.some(s => /["<>]/.test(s)), 'song list keeps only attribute-safe ids');

// ---- 3. house storage is validated against ITEMS with numeric counts ----
assert(p.houseStorage.every(s => T.ITEMS[s.id] && typeof s.n === 'number' && s.n >= 1), 'house storage ids and counts validated');
assert(p.houseStorage.length === 2, 'hostile storage entries dropped');

// ---- 4. no render sink emits the crafted markup as live HTML ----
// (defanged payload text is fine: it renders inert; injected tags are not)
const INJECTION = /<img|<script|<svg|<b>c|<i>/i;
T.renderSongs();
let html = document.querySelector('#modal-panel').innerHTML;
assert(!INJECTION.test(html), 'Song-book HTML has no injected tags');
assert(html.indexOf('My Canticle') >= 0, 'Song-book still shows legitimate songs');
T.renderHouseChest();
html = document.querySelector('#modal-panel').innerHTML;
assert(!INJECTION.test(html), 'strongbox HTML has no injected tags');
T.UPG.autosaveSlot = { marker: true };
T.UPG.autosaveWhen = 'The Reach (day ' + save.day + ')'; // hostile raw value in autosaveWhen
T.renderLoad(true);
html = document.querySelector('#modal-panel').innerHTML;
assert(!INJECTION.test(html) && html.indexOf('DAY<') === -1 && typeof T.G.day === 'number', 'Load panel autosave row has no injected tags and G.day is coerced to number');
T.renderCodexModal('factions');
html = document.querySelector('#modal-panel').innerHTML;
assert(!/<img|<script|<svg/i.test(html) && !/<b>c<\/b>/.test(html) && !p.titles.some(t => /[<>"'\\]/.test(t)), 'Codex factions/titles HTML has no injected tags');

// ---- 5. custody/evidence are a schema, never arbitrary renderable save text ----
const hostileLaw = JSON.parse(JSON.stringify(save));
hostileLaw.player.name = '<img src=x onerror=1>';
hostileLaw.player.crime = { bounty: '<svg>', thefts: -1, assaults: Infinity, escapes: {}, jailHours: 'six', custody: { remaining: '<img>' }, evidence: {
  inv: [{ id: '<img>', n: 1 }, { id: 'coil', n: 1 }, { id: 'tonic', n: '<svg>' }, { id: 'tonic', n: 2 }, { id: '__proto__', n: 1 }],
  weapons: ['<svg>', '__proto__', 'glass', 'sword', 'sword'], armor: { body: '<img>' }, selected: '<script>', pellets: -7, bolts: Infinity, tknives: '99',
} };
T.restoreGame(hostileLaw);
let law = T.crimeState();
assert(law.bounty === 0 && law.thefts === 0 && law.assaults === 0 && law.escapes === 0 && law.jailHours === 0 && !law.custody, 'hostile law stats and malformed custody rejected');
assert(law.evidence.inv.length === 1 && law.evidence.inv[0].id === 'tonic' && law.evidence.inv[0].n === 2 && law.evidence.weapons.join() === 'sword', 'evidence rejects unknown/prototype IDs, quest gear, invalid counts and duplicate weapons');
assert(!Object.keys(law.evidence.armor).length && law.evidence.pellets === 0 && law.evidence.bolts === 0 && law.evidence.tknives === 0, 'evidence armor and ammunition validated');
T.renderWantedPoster();
assert(!/<img|<script|<svg/i.test(document.querySelector('#modal-panel').innerHTML), 'warrant renders no hostile name/stat markup');
const before = T.G.count('tonic'); T.returnEvidence(); T.returnEvidence();
assert(T.G.count('tonic') === before + 2 && !T.crimeState().evidence, 'evidence consumed before return; repeated recovery cannot duplicate');
const custodySave = JSON.parse(JSON.stringify(save)); custodySave.mapId = 'watchhouse'; custodySave.cam = { x: 3.5, y: 4.5, dir: 0 };
custodySave.player.crime = { bounty: 40, custody: { remaining: 4 }, evidence: { inv: [{ id: 'tonic', n: 3 }], weapons: ['sword'], armor: {}, pellets: 2 } };
const wrongMap = JSON.parse(JSON.stringify(custodySave)); wrongMap.mapId = 'oakhaven';
const playerBefore = T.G.player;
let rejected = false; try { T.restoreGame(wrongMap); } catch (e) { rejected = /custody save/.test(e.message); }
assert(rejected && T.G.player === playerBefore, 'custody pointing outside prison is rejected before changing the live player');
T.restoreGame(custodySave); T.renderPrison();
assert(T.G.mapId === 'watchhouse' && T.crimeState().custody.remaining === 4 && T.crimeState().evidence.inv[0].n === 3 && !/<img|<script|<svg/i.test(document.querySelector('#modal-panel').innerHTML), 'legitimate custody/evidence survive untrusted restore and render');

console.log(fails ? 'FAIL: ' + fails + ' assertion(s)' : 'OK: imported saves cannot inject script');
process.exit(fails ? 1 : 0);
