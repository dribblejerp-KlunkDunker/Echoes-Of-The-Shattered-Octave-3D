#!/usr/bin/env node
'use strict';
// Merge "english<TAB>french" pair files (one per team, e.g. tools/i18n/p9-talk.tsv) straight into locales/story/fr.json.
// Lines whose English holds {0}-style placeholders become patterns; the rest are exact entries keyed by hash(norm(english)).
// Unlike merge.js this needs no entry in strings.en.json, so runtime-built variants (quoted, capitalised) can be listed.
//   node tools/i18n/merge-pairs.js tools/i18n/p9-*.tsv
const fs = require('fs');
const path = require('path');
const { hash, norm } = require('./lib');
const OUT = path.resolve(__dirname, '..', '..', 'locales', 'story', 'fr.json');
const d = JSON.parse(fs.readFileSync(OUT, 'utf8'));
d.s = d.s || {}; d.p = d.p || [];
const pIndex = new Map(d.p.map((pair, i) => [pair[0], i]));
const ph = (x) => (x.match(/\{\d+/g) || []).map(m => m.slice(1)).sort().join(',');
let exact = 0, pats = 0, bad = 0, pieces = 0, mismatched = 0;
const ONLY = process.env.I18N_PIECES_ONLY === '1';
for (const file of process.argv.slice(2)) {
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim() || raw.startsWith('#')) continue;
    const tab = raw.indexOf('\t'); if (tab < 0) { bad++; continue; }
    const en = norm(raw.slice(0, tab)), fr = raw.slice(tab + 1).trim();
    if (!en || !fr) { bad++; continue; }
    // I18N_PIECES_ONLY=1: an older pair file, already merged: add only the pieces between tags that are not filed yet,
    // and never touch an existing entry (a later file or a hand fix may have replaced it since)
    if (ONLY) {
      if (/<[a-z\/][^>]*>/i.test(en)) {
        const cut = (x) => x.split(/<[^>]+>/).map((t) => norm(t)).filter((t) => t && /[A-Za-z\u00c0-\u017f]{2}/.test(t));
        const a = cut(en), b = cut(raw.slice(tab + 1));
        if (a.length === b.length && a.length > 1) for (let i = 0; i < a.length; i++) { if (/\{\d+/.test(a[i]) || d.s[hash(a[i])] != null) continue; d.s[hash(a[i])] = b[i]; pieces++; }
        else if (a.length !== b.length) mismatched++;
      }
      continue;
    }
    if (/\{\d+/.test(en)) {
      if (ph(en) !== ph(fr)) { console.warn('placeholder mismatch, skipped:', en); bad++; continue; }
      if (pIndex.has(en)) d.p[pIndex.get(en)][1] = fr; else { pIndex.set(en, d.p.length); d.p.push([en, fr]); }
      pats++;
    } else { d.s[hash(en)] = fr; exact++; }
    // The game renders cards with markup (<br>, <i>, <b>), and js/story-i18n.js translates one text node at a time: the
    // whole string never reaches it. Also file each piece between the tags, when both sides have the same number of them.
    if (/<[a-z\/][^>]*>/i.test(en)) {
      const cut = (x) => x.split(/<[^>]+>/).map((t) => norm(t)).filter((t) => t && /[A-Za-z\u00c0-\u017f]{2}/.test(t));
      const a = cut(en), b = cut(raw.slice(tab + 1));
      if (a.length === b.length && a.length > 1) {
        for (let i = 0; i < a.length; i++) {
          if (/\{\d+/.test(a[i])) { if (ph(a[i]) !== ph(b[i])) continue; if (pIndex.has(a[i])) d.p[pIndex.get(a[i])][1] = b[i]; else { pIndex.set(a[i], d.p.length); d.p.push([a[i], b[i]]); } }
          else d.s[hash(a[i])] = b[i];
          pieces++;
        }
      } else if (a.length !== b.length) { mismatched++; if (process.env.I18N_VERBOSE) console.warn('pieces differ (' + a.length + ' vs ' + b.length + '):', en.slice(0, 70)); }
    }
  }
}
fs.writeFileSync(OUT, JSON.stringify(d));
console.log('merged exact ' + exact + ', patterns ' + pats + ', skipped ' + bad + ', pieces ' + pieces + (mismatched ? ', pieces not matched ' + mismatched : ''));
