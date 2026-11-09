#!/usr/bin/env node
'use strict';
// Build js/library26-books.js (LIBRARY_BOOKS) from tools/library/books/*.json, the Library of the Reach's sources.
//   node tools/library/build.js           build, after validating every book
//   node tools/library/build.js --check   validate only (exit 1 on errors)
// Each source file is an array of books: { id, title, author, genre, year, origin, where, style, summary, text[], notes }.
// `notes` (canon sources and [PROPOSED] inventions) stays in the sources and is not shipped.
// tools/library/placement.json says where each book lives: { "<id>": { how, at, shelf?, price?, quest?, flyleaf? } }
//   how: shelf (at = library map, shelf = shelf key) | pile (at = map) | shop (at = NPC id, price) | found (at = map)
//        | quest (at = map, quest = keeper's quest id) | gift (quest = the quest that gives it). Books with no entry: pile at `where`.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(__dirname, 'books');
const OUT = path.join(ROOT, 'js', 'library26-books.js');
const GENRES = ['history', 'chronicle', 'almanac', 'biography', 'autobiography', 'memoir', 'letters', 'journal', 'folk tale', 'fable',
  'ghost story', 'romance', 'adventure', "children's", 'poetry', 'song', 'play', 'natural history', 'herbal', 'field guide', 'manual',
  'cookery', 'sermon', 'catechism', 'philosophy', 'law', 'politics', 'pamphlet', 'travel'];
const MAPS = ['tavern', 'lyra_house', 'greenhall', 'surgery', 'mill', 'chapel', 'tannery', 'orla_house', 'watchhouse',
  'p13h_tarrow', 'p16h_vestry', 'clearing', 'quarry', 'p16h_depot3', 'flume_landing', 'greenroot_chapel', 'p22_bellwether',
  'p16k_kestrel_below', 'whispergrove', 'cloister', 'malting', 'catacombs', 'wickhouse', 'deepwoods', 'mausoleum', 'belfry'];
const STYLES = ['parch', 'paper', 'office', 'slate'];
const LIBS = ['lib_conservatory', 'lib_bonded', 'lib_moot', 'lib_scriptorium'];
const SHELF_KEYS = ['history', 'lives', 'tales', 'craft', 'faith', 'world'];
const VENDORS = ['moor_bookseller', 'lib_odile', 'vane'];
const QUESTS = ['ilse', 'odile', 'shelver'];
const FOUND_MAPS = MAPS.concat(['underhedge', 'rootvault', 'flume_road', 'flume_lowrings', 'greenroot', 'greenroot_crypt', 'p20_downs', 'p22_combe', 'p22_hanger', 'p22_barrow', 'p16d_lower', 'lib_scriptorium']);
const PLACEMENT = path.join(__dirname, 'placement.json');
const words = b => b.text.join(' ').split(/\s+/).filter(Boolean).length;

function load() {
  const books = [], errors = [];
  for (const f of fs.readdirSync(SRC).filter(n => n.endsWith('.json')).sort()) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); continue; }
    if (!Array.isArray(arr)) { errors.push(f + ': not an array'); continue; }
    for (const b of arr) books.push(Object.assign({ _file: f }, b));
  }
  const seen = new Set(), titles = new Set();
  for (const b of books) {
    const at = b._file + ' ' + (b.id || '?') + ': ';
    for (const k of ['id', 'title', 'author', 'genre', 'year', 'origin', 'where', 'style', 'summary']) if (typeof b[k] !== 'string' || !b[k].trim()) errors.push(at + 'missing ' + k);
    if (!/^lib_[a-z0-9_]+$/.test(b.id || '')) errors.push(at + 'id must be lib_<snake>');
    if (seen.has(b.id)) errors.push(at + 'duplicate id'); seen.add(b.id);
    if (titles.has(b.title)) errors.push(at + 'duplicate title'); titles.add(b.title);
    if (b.genre && !GENRES.includes(String(b.genre).toLowerCase())) errors.push(at + 'unknown genre ' + b.genre);
    if (b.style && !STYLES.includes(b.style)) errors.push(at + 'unknown style ' + b.style);
    if (!Array.isArray(b.text) || !b.text.length || b.text.some(p => typeof p !== 'string' || !p.trim())) { errors.push(at + 'text must be non-empty paragraphs'); continue; }
    if (b.text.some(p => /<\/?[a-z][^>]*>/i.test(p))) errors.push(at + 'HTML in text');
    const n = words(b); if (n < 250 || n > 2000) errors.push(at + n + ' words (250-2000)');
    if (/\bsilver (piece|coin|penny|pennies|pieces|coins)\b/i.test(b.text.join(' '))) errors.push(at + 'silver coinage is not canon');
  }
  let place = {};
  if (fs.existsSync(PLACEMENT)) { try { place = JSON.parse(fs.readFileSync(PLACEMENT, 'utf8')); } catch (e) { errors.push('placement.json: ' + e.message); } }
  for (const id of Object.keys(place)) if (!seen.has(id)) errors.push('placement.json: no book ' + id);
  for (const b of books) {
    const p = place[b.id] || { how: 'pile', at: b.where };
    const at = 'placement ' + b.id + ': ';
    Object.assign(b, { how: p.how, at: p.at, shelf: p.shelf, price: p.price, quest: p.quest, flyleaf: p.flyleaf || b.flyleaf });
    if (p.how === 'gift') b.at = { ilse: 'lib_conservatory', odile: 'lib_bonded', shelver: 'lib_moot' }[p.quest];
    if (p.how === 'shelf') { if (!LIBS.includes(p.at)) errors.push(at + 'unknown library ' + p.at); if (!SHELF_KEYS.includes(p.shelf)) errors.push(at + 'unknown shelf ' + p.shelf); }
    else if (p.how === 'pile') { if (!MAPS.includes(p.at)) errors.push(at + 'unknown map ' + p.at); }
    else if (p.how === 'shop') { if (!VENDORS.includes(p.at)) errors.push(at + 'unknown vendor ' + p.at); if (!(p.price > 0)) errors.push(at + 'shop books need a price'); }
    else if (p.how === 'found') { if (!FOUND_MAPS.includes(p.at)) errors.push(at + 'unknown map ' + p.at); }
    else if (p.how === 'quest') { if (!FOUND_MAPS.includes(p.at)) errors.push(at + 'unknown map ' + p.at); if (!QUESTS.includes(p.quest)) errors.push(at + 'unknown quest ' + p.quest); }
    else if (p.how === 'gift') { if (!QUESTS.includes(p.quest)) errors.push(at + 'unknown quest ' + p.quest); }
    else errors.push(at + 'unknown how ' + p.how);
    if (b.flyleaf && (!Array.isArray(b.flyleaf) || b.flyleaf.some(n => typeof n !== 'string' || !n.trim()))) errors.push(at + 'flyleaf must be names');
  }
  return { books, errors };
}

const { books, errors } = load();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const total = books.reduce((n, b) => n + words(b), 0);
if (process.argv.includes('--check')) { console.log('ok: ' + books.length + ' books, ' + total + ' words'); process.exit(0); }
const ship = books.map(b => ({ id: b.id, title: b.title, author: b.author, genre: String(b.genre).toLowerCase(), year: b.year, origin: b.origin,
  where: b.where, how: b.how, at: b.at, shelf: b.shelf, price: b.price, quest: b.quest, flyleaf: b.flyleaf,
  style: b.style, summary: b.summary, text: b.text.map(p => p.replace(/\r/g, '')) }));
const head = '// GENERATED by tools/library/build.js from tools/library/books/*.json. Do not edit by hand.\n' +
  '// The Library of the Reach: ' + ship.length + ' books, ' + total + ' words. Read by js/library26.js.\n\'use strict\';\n';
fs.writeFileSync(OUT, head + 'const LIBRARY_BOOKS = ' + JSON.stringify(ship, null, 0).replace(/\},\{"id"/g, '},\n{"id"') + ';\n');
console.log('wrote ' + path.relative(ROOT, OUT) + ': ' + ship.length + ' books, ' + total + ' words');
