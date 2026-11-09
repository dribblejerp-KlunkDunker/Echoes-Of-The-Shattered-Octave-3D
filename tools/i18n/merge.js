#!/usr/bin/env node
'use strict';
// Merge translations into locales/story/fr.json.
//   node tools/i18n/merge.js file.tsv [more.tsv ...]
// Each tsv line:  <id><TAB><french>      ("=" keeps the English on purpose: names, signs, sounds)
// Existing entries stay; a line replaces the entry with the same id. Also derives
//   * "p": the pattern list [[english, french]] from strings.en.json (anything with {n} placeholders)
//   * name heads: "Old Harrow, gate-warden" gives "Old Harrow" an entry of its own (dialogue headings)
// and validates that French keeps the English placeholders.
const fs = require('fs');
const path = require('path');
const { hash, norm, frTypo } = require('./lib');

const OUT = path.resolve(__dirname, '..', '..', 'locales', 'story', 'fr.json');
const EN = JSON.parse(fs.readFileSync(path.join(__dirname, 'strings.en.json'), 'utf8'));

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(OUT, 'utf8')), s = { ...(d.s || {}) };
    for (const id of Object.keys(d.heads || {})) delete s[id];             // derived again below
    for (const [en, fr] of (d.p || [])) s[hash(norm(en))] = fr;            // patterns live in p, not s
    return { s, k: new Set(d.k || []) };
  } catch (e) { return { s: {}, k: new Set() }; }
}
const ph = (x) => (x.match(/\{\d+/g) || []).map(m => m.slice(1)).sort().join(',');

function mergeFiles(files) {
  const cur = load();
  const problems = [];
  for (const f of files) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim() || line[0] === '#') continue;
      const tab = line.indexOf('\t'); if (tab < 0) continue;
      const id = line.slice(0, tab).trim(), raw = line.slice(tab + 1).replace(/\r$/, '');
      const e = EN[id];
      if (!e) { problems.push('unknown id ' + id); continue; }
      if (raw.trim() === '=') { cur.k.add(id); delete cur.s[id]; continue; }
      if (!raw.trim()) continue;
      const fr = frTypo(raw.trim());
      // French may drop a placeholder (plural endings do not carry over) but never invent one
      const have = new Set(ph(e.en).split(',')), used = ph(fr.replace(/\|[a-z*^]+$/, '')).split(',').filter(Boolean);
      if (used.some(x => !have.has(x))) problems.push('placeholder not in English: ' + e.en + '  =>  ' + fr);
      cur.s[id] = fr; cur.k.delete(id);
    }
  }
  return { cur, problems };
}

function build(cur) {
  const s = { ...cur.s };
  // name heads (dialogue panel headings use the part before the comma)
  const heads = {};
  for (const [id, e] of Object.entries(EN)) {
    const fr = cur.s[id]; if (!fr) continue;
    const en = e.en;
    if (!/^[A-Z]/.test(en) || /[.!?"\u201c\d{]/.test(en) || en.split(' ').length > 9) continue;
    const c = en.indexOf(', '); if (c < 3) continue;
    const head = en.slice(0, c); if (head.split(' ').length > 4) continue;
    const frNoCode = fr.replace(/\|[a-z*^]+$/, ''), fc = frNoCode.indexOf(',');
    if (fc < 2) continue;
    const hid = hash(norm(head));
    if (!(hid in s) && !cur.k.has(hid)) { s[hid] = frNoCode.slice(0, fc); heads[hid] = 1; }
  }
  const p = [];
  for (const [id, e] of Object.entries(EN)) if (e.pattern && cur.s[id]) p.push([e.en, cur.s[id].replace(/\|[a-z*^]+$/, '')]);
  p.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  // exact table without the patterns (they are in p)
  for (const [id, e] of Object.entries(EN)) if (e.pattern) delete s[id];
  const sorted = {}; for (const k of Object.keys(s).sort()) sorted[k] = s[k];
  return { v: 1, locale: 'fr', s: sorted, p, k: [...cur.k].sort(), heads };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  const { cur, problems } = mergeFiles(files);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const out = build(cur);
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');   // "heads" is bookkeeping for the merge; the runtime ignores it
  console.log('translated:', Object.keys(cur.s).length, 'kept:', cur.k.size, 'patterns:', out.p.length, 'heads:', Object.keys(out.heads).length);
  if (problems.length) { console.log(problems.length + ' problem(s):'); problems.slice(0, 40).forEach(x => console.log('  ' + x)); process.exitCode = 1; }
}
module.exports = { mergeFiles, build };
