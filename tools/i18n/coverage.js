#!/usr/bin/env node
'use strict';
// How much of the English story text has a French entry?
//   node tools/i18n/extract.js        (refresh strings.en.json first)
//   node tools/i18n/coverage.js [--list]   prints the numbers; --list also prints strings left in English on purpose
// A string counts as covered when the catalogue has a translation for it (exact entry or pattern) or when
// it is on the "kept" list (names, debug lines, CSS: text a French player is meant to see unchanged).
// Exits 1 when coverage is under 98%, so a build script can use it.
const fs = require('fs');
const path = require('path');
const { hash, norm } = require('./lib');

function coverage(root) {
  root = root || path.resolve(__dirname, '..', '..');
  const EN = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'i18n', 'strings.en.json'), 'utf8'));
  const cat = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'story', 'fr.json'), 'utf8'));
  const have = new Set(Object.keys(cat.s || {}));
  for (const pr of cat.p || []) have.add(hash(norm(pr[0])));
  const kept = new Set(cat.k || []);
  const ids = Object.keys(EN);
  const translated = [], keptList = [], missing = [];
  for (const id of ids) {
    if (have.has(id)) translated.push(id);
    else if (kept.has(id)) keptList.push(id);
    else missing.push(id);
  }
  const covered = translated.length + keptList.length;
  return {
    total: ids.length, translated: translated.length, kept: keptList.length, missing: missing.length,
    percent: ids.length ? (100 * covered / ids.length) : 100,
    translatedPercent: ids.length ? (100 * translated.length / ids.length) : 100,
    keptStrings: keptList.map(id => ({ id, en: EN[id].en, where: EN[id].where[0] })),
    missingStrings: missing.map(id => ({ id, en: EN[id].en, where: EN[id].where[0] })),
  };
}

if (require.main === module) {
  const c = coverage();
  console.log(`strings ${c.total}  translated ${c.translated} (${c.translatedPercent.toFixed(2)}%)  kept in English ${c.kept}  missing ${c.missing}  coverage ${c.percent.toFixed(2)}%`);
  if (process.argv.includes('--list')) {
    console.log('\nKept in English on purpose:');
    for (const k of c.keptStrings) console.log('  ' + k.where + '\t' + k.en.slice(0, 110));
  }
  if (c.missing) {
    console.log('\nMissing:');
    for (const k of c.missingStrings.slice(0, 40)) console.log('  ' + k.id + '\t' + k.where + '\t' + k.en.slice(0, 110));
  }
  process.exit(c.percent >= 98 ? 0 : 1);
}
module.exports = { coverage };
