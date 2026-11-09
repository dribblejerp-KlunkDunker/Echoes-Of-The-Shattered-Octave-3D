#!/usr/bin/env node
// Writes the in-game Library of the Reach and the Cantabile broadsheet serial into story/Library of the Reach/ as
// Markdown, so the written work lives with the novels and the bibles (and goes into the bundle) as well as in the game.
//   node story/tools/export_library.js
// Sources: tools/library/books/*.json (the 65 books; js/library26-books.js is built from them),
// tools/library/placement.json (where each is found), js/books.js (the serial). Run it again after any of them change.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'story', 'Library of the Reach');
const SHELVES = {
  a_history: 'Histories and chronicles', b_lives: 'Lives and letters', c_tales: 'Tales, verse and plays',
  d_craft: 'Herbals, handbooks and field guides', e_faith: 'Sermons, catechisms and law', f_world: 'The wider world',
  g_grove: 'Whisper-Grove, the Moot-house shelves', h_house: 'The Veil\'s scriptorium',
};
const slug = (s) => s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);
const para = (t) => (Array.isArray(t) ? t : String(t).split(/\n\n+/)).map((p) => String(p).trim()).filter(Boolean);
// a paragraph that opens like Markdown syntax ("413. Sent down…", "- ", "# ") is prose, not a list or heading: escape it
const lit = (t) => t.replace(/^(\d+)\. /, '$1\\. ').replace(/^([-+*#>]) /, '\\$1 ');
const html = (s) => String(s).replace(/<\/?i>/g, '*').replace(/<\/?b>/g, '**').replace(/<br\s*\/?>/g, '  \n').replace(/<[^>]+>/g, '');

const placement = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'library', 'placement.json'), 'utf8'));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const index = [];
let words = 0;
for (const file of fs.readdirSync(path.join(ROOT, 'tools', 'library', 'books')).filter((f) => f.endsWith('.json')).sort()) {
  const key = file.replace(/\.json$/, '');
  const shelf = SHELVES[key] || key;
  const dir = path.join(OUT, slug(shelf));
  fs.mkdirSync(dir, { recursive: true });
  for (const b of JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'library', 'books', file), 'utf8'))) {
    const p = placement[b.id] || {};
    const body = para(b.text).map(html).map(lit);
    words += body.join(' ').split(/\s+/).filter(Boolean).length;
    const found = [p.how, p.at, p.shelf && 'shelf: ' + p.shelf, p.price != null && 'price: ' + p.price, p.quest && 'quest: ' + p.quest].filter(Boolean).join(' · ');
    const lines = ['# ' + b.title, '', '*' + [b.author, b.year, b.origin, b.genre].filter(Boolean).join(' · ') + '*', '',
      '> ' + html(b.summary || ''), ''];
    if (b.flyleaf) lines.push('**Flyleaf:** ' + html(b.flyleaf), '');
    lines.push(...body.flatMap((t) => [t, '']));
    lines.push('---', '', '- **Id:** `' + b.id + '`', '- **Found:** ' + (found || b.where || '—'));
    if (b.notes) lines.push('- **Canon notes:** ' + html(b.notes));
    const name = slug(b.title) + '.md';
    fs.writeFileSync(path.join(dir, name), lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
    index.push({ shelf, title: b.title, author: b.author, year: b.year || '', file: slug(shelf) + '/' + name });
  }
}

// the serial: evaluate js/books.js in a sandbox and read its volumes
const src = fs.readFileSync(path.join(ROOT, 'js', 'books.js'), 'utf8') + '\n;this.__MOOR = MOOR_BOOKS;';
// the file also registers items and handlers with the game at load time: stub whatever it reaches for, then retry
const stub = () => new Proxy(function () { return stub(); }, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : stub()), set: () => true, apply: () => stub() });
const box = { window: {}, document: { addEventListener() {} }, G: { flags: {} }, console, ITEMS: {} };
let serial = null;
for (let tries = 0; tries < 40 && !serial; tries++) {
  try { const ctx = vm.createContext(Object.assign({}, box)); vm.runInContext(src, ctx); serial = ctx.__MOOR; }
  catch (e) { const m = /^(\w+) is not defined/.exec(e.message); if (!m) throw e; box[m[1]] = stub(); }
}
if (!serial) throw new Error('could not load js/books.js');
const vols = Array.isArray(serial) ? serial : (serial.volumes || serial.BOOKS || Object.values(serial).filter((v) => v && v.title));
const sl = ['# The Cantabile broadsheet serial', '', '*A tale of the Caldera, printed on Broadsheet Row and carried up the river through Stillwater Landing. Published fiction in the world, not quest evidence. Canon review: `story/Game Layer/Review - The Moor serial.md`.*', ''];
for (const v of vols) {
  sl.push('## ' + (v.part ? 'Part ' + v.part + ': ' : '') + v.title, '');
  if (v.preface) sl.push('*' + html(v.preface) + '*', '');
  for (const t of para(v.text || '')) { sl.push(lit(html(t)), ''); words += t.split(/\s+/).length; }
}
fs.writeFileSync(path.join(OUT, 'The Cantabile broadsheet serial.md'), sl.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');

const rd = ['# The Library of the Reach', '',
  'The books a traveller can find, buy and read in the Book One game: ' + index.length + ' books in four libraries and in houses, camps and dungeons, and the Cantabile broadsheet serial. About ' + Math.round(words / 1000) + ',000 words in all.', '',
  'Generated from the game\'s sources by `story/tools/export_library.js`; edit the sources (`tools/library/books/*.json`, `js/books.js`), not these files. The keepers, quests and the owner\'s rulings are in `story/Game Layer/Library of the Reach - Notes for the Owner.md`; what the books add to canon is in `story/World Bibles/Vol VIII - The Game Layer.md`.', ''];
let cur = '';
for (const e of index) {
  if (e.shelf !== cur) { cur = e.shelf; rd.push('## ' + cur, '', '| Title | Author | Year |', '|---|---|---|'); }
  rd.push('| [' + e.title.replace(/\|/g, '\\|') + '](' + encodeURI(e.file) + ') | ' + (e.author || '').replace(/\|/g, '\\|') + ' | ' + e.year + ' |');
}
rd.push('', '## The serial', '', '- [The Cantabile broadsheet serial](' + encodeURI('The Cantabile broadsheet serial.md') + ') (' + vols.length + ' parts)', '');
fs.writeFileSync(path.join(OUT, 'README.md'), rd.join('\n').replace(/\n{3,}/g, '\n\n'));
console.log('wrote', index.length, 'books and', vols.length, 'serial parts,', words, 'words, to', path.relative(ROOT, OUT));
