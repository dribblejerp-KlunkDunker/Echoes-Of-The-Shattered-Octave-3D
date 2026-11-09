'use strict';
// Shared helpers for the story-translation tools: the key hash and the text normalisation
// MUST match js/story-i18n.js (the runtime copies them; test/story-i18n.test.js checks they agree).

// cyrb53: a small, stable 53-bit string hash. Base36 keeps ids short.
function hash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// Whitespace is collapsed for the key only; the runtime keeps a text node's own leading/trailing space.
function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', hellip: '…', times: '×', rarr: '→', larr: '←', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n ? String.fromCodePoint(n) : m; }
    return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
  });
}

// French typography, applied to every translation when merging so the sources can use plain " and '.
// Placeholders ({0}, {0:le}) are protected. Spaces before : ; ! ? and inside guillemets are no-break.
const NB = '\u00a0';
function frTypo(str) {
  const holds = [];
  let s = str.replace(/\{\d+(?::[a-z]+)?\}/g, (m) => { holds.push(m); return '\uE001' + (holds.length - 1) + '\uE002'; });
  s = s.replace(/\.\.\./g, '\u2026');
  // straight / curly double quotes -> guillemets, alternating open / close
  let open = true;
  s = s.replace(/["\u201c\u201d]/g, () => { const r = open ? '\u00ab' + NB : NB + '\u00bb'; open = !open; return r; });
  s = s.replace(/\u00ab\s+/g, '\u00ab' + NB).replace(/\s+\u00bb/g, NB + '\u00bb');
  s = s.replace(/(\p{L})'(?=\p{L})/gu, '$1\u2019');
  s = s.replace(/(^|[\s(])'(?=\p{L})/gu, '$1\u2018').replace(/(\p{L}|[.!?\u2026])'(?=[\s.,;:!?)]|$)/gu, '$1\u2019');
  // no-break space before : ; ! ? (not inside times like 2:31 or between placeholders)
  s = s.replace(/[ \u00a0]*([;!?]+)/g, (m, p, off) => (off === 0 ? p : NB + p));
  s = s.replace(/(\S)[ \u00a0]*:(?=[ \u00a0]|$)/g, '$1' + NB + ':');
  s = s.replace(/\uE001(\d+)\uE002/g, (m, i) => holds[+i]);
  return s;
}

module.exports = { hash, norm, decode, frTypo };
