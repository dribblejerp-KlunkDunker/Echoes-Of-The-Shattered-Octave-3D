// story-i18n — Phase 8 (finish and paint): the story in French.
//
// js/access.js translates menus and buttons (locales/*.json, keys). This module translates the STORY:
// dialogue, messages, logbook entries, item/enemy/NPC names and descriptions, books, letters, dreams,
// endings. It never touches game data or saves. It works only at the display sinks:
//   * every text node (and title/aria-label/alt/placeholder) that the game renders into the page is
//     looked up by the hash of its English text, once, when it is added (a MutationObserver; never per
//     frame). Only the node's text is replaced, so markup in a save can never be parsed as HTML.
//   * canvas text (the HUD bar, the maps) goes through a wrapper on fillText/strokeText/measureText,
//     cached in a Map.
// The catalogue is locales/story/fr.json: { s: { id: french }, p: [[english pattern, french pattern]] }.
// ids are the hash of the whitespace-normalised English text (tools/i18n/lib.js; the test checks both agree).
// Pattern placeholders {0},{1} capture the dynamic part, translate it on its own (so an item name inside a
// message is French too) and may carry an article directive: {0:le} {0:un} {0:du} {0:au} {0:de}.
// Names that go into sentences carry a gender code in the catalogue ("Épée courte|f").
// Anything with no entry stays English. Recorded voice lines stay English.
'use strict';

const STORY_I18N = (function () {
  const URLS = { fr: 'locales/story/fr.json' };
  const ATTR_LIST = ['title', 'aria-label', 'alt', 'placeholder'];
  const SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CANVAS: 1 };

  // ---------------------------------------------------------------- hash (same as tools/i18n/lib.js)
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
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

  // ---------------------------------------------------------------- state
  let loc = 'en';
  const cats = Object.create(null);          // code -> { s: Map, pats: [], byPrefix: Map, generic: [] }
  const cache = new Map();                   // english text -> french | null (this locale)
  const CACHE_MAX = 6000;
  const stat = { exact: 0, pattern: 0, segmented: 0, miss: 0 };
  let observer = null;
  const textRec = new WeakMap();             // text node -> { en, shown }
  const attrRec = new WeakMap();             // element -> { attr: { en, shown } }

  // ---------------------------------------------------------------- catalogue
  function compile(data) {
    const s = new Map();
    for (const id of Object.keys(data.s || {})) if (typeof data.s[id] === 'string') s.set(id, data.s[id]);
    const pats = [];
    for (const pr of (data.p || [])) {
      if (!Array.isArray(pr) || typeof pr[0] !== 'string' || typeof pr[1] !== 'string') continue;
      const en = pr[0], parts = en.split(/\{\d+\}/);
      const re = new RegExp('^' + parts.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('([\\s\\S]*?)') + '$');
      const lit = parts.join('').length;
      pats.push({ re, en, fr: pr[1], lit, n: parts.length - 1, head: parts[0] });
    }
    // most specific first: more literal text, then fewer captures
    pats.sort((a, b) => b.lit - a.lit || a.n - b.n);
    pats.forEach((p, i) => { p.rank = i; });
    const byPrefix = new Map(), generic = [];
    for (const p of pats) {
      if (p.head.length >= 4) { const k = p.head.slice(0, 4); if (!byPrefix.has(k)) byPrefix.set(k, []); byPrefix.get(k).push(p); }
      else generic.push(p);
    }
    return { s, pats, byPrefix, generic, k: new Set(data.k || []) };
  }

  // ---------------------------------------------------------------- articles for names inside sentences
  function parseName(raw) {
    const i = raw.lastIndexOf('|');
    if (i < 0) return { t: raw, g: null };
    const code = raw.slice(i + 1), m = /^(m|f)(p?)(\*?)(\^?)$/.exec(code);
    return m ? { t: raw.slice(0, i), g: { f: m[1] === 'f', pl: !!m[2], hard: !!m[3], keep: !!m[4] } } : { t: raw.slice(0, i), g: null };
  }
  function withArticle(kind, name) {
    // names that already start with their article ("La Haie", "L'Étroit"): fold "de" / lowercase them
    if (kind === 'lc') return name.t ? name.t[0].toLowerCase() + name.t.slice(1) : name.t;
    if (kind === 'de') {
      const m = /^(Le|La|Les|L['\u2019])\s*/i.exec(name.t);
      if (m) {
        const rest = name.t.slice(m[0].length), a = m[1].toLowerCase();
        return a === 'le' ? 'du ' + rest : a === 'les' ? 'des ' + rest : a === 'la' ? 'de la ' + rest : 'de l\u2019' + rest;
      }
      return (/^[aeiouyàâäéèêëîïôöûùüœæh]/i.test(name.t) ? 'd\u2019' : 'de ') + name.t;
    }
    const g = name.g; if (!g) return name.t;
    let t = name.t;
    if (!g.keep && t) t = t[0].toLowerCase() + t.slice(1);
    const vowel = !g.hard && /^[aeiouyàâäéèêëîïôöûùüœæh]/i.test(t);
    switch (kind) {
      case 'le': return g.pl ? 'les ' + t : vowel ? 'l’' + t : (g.f ? 'la ' : 'le ') + t;
      case 'un': return g.pl ? 'des ' + t : (g.f ? 'une ' : 'un ') + t;
      case 'du': return g.pl ? 'des ' + t : vowel ? 'de l’' + t : g.f ? 'de la ' + t : 'du ' + t;
      case 'au': return g.pl ? 'aux ' + t : vowel ? 'à l’' + t : g.f ? 'à la ' + t : 'au ' + t;
      default: return t;
    }
  }

  // ---------------------------------------------------------------- lookup
  const NUMERIC = /^[\d\s.,:+\-–×x%/()]*$/;
  function exactRaw(cat, key) { return cat.s.get(hash(key)); }

  // translate one English fragment -> { t, g } or null. Never throws.
  function lookup(cat, text, depth) {
    const key = norm(text);
    if (!key) return null;
    const raw = exactRaw(cat, key);
    if (raw != null) { stat.exact++; return parseName(raw); }
    if (depth > 3) return null;
    // patterns
    let best = null;
    const k4 = key.slice(0, 4);
    const lists = [cat.byPrefix.get(k4), cat.generic];
    for (const list of lists) {
      if (!list) continue;
      for (const p of list) {
        if (best && p.rank > best.p.rank) break;
        const m = p.re.exec(key);
        if (m) { if (!best || p.rank < best.p.rank) best = { p, m }; break; }
      }
    }
    if (best) { stat.pattern++; return { t: fillPattern(cat, best.p.fr, best.m, depth + 1), g: null }; }
    return null;
  }
  function fillPattern(cat, fr, m, depth) {
    return fr.replace(/\{(\d+)(?::([a-z]+))?\}/g, (all, i, kind) => {
      const cap = m[+i + 1]; if (cap == null) return '';
      const trimmed = cap.trim();
      if (!trimmed) return cap;
      const lead = /^\s*/.exec(cap)[0], trail = /\s*$/.exec(cap)[0];
      let v;
      if (NUMERIC.test(trimmed)) v = { t: trimmed, g: null };
      else v = lookup(cat, trimmed, depth) || segment(cat, trimmed, depth) || { t: trimmed, g: null };
      return lead + (kind ? withArticle(kind, v) : v.t) + trail;
    });
  }

  // Text the game joined at run time from separately translated pieces ("answer" + " " + "Mind how you go."):
  // take the longest prefix that has an entry, then carry on. Only used when at least half the text is covered.
  // a piece the catalogue keeps in English on purpose (a name) counts as covered
  const keptPiece = (cat, t) => (cat.k && cat.k.has(hash(norm(t)))) ? { t, g: null } : null;
  function segment(cat, text, depth) {
    const key = text.replace(/\s+/g, ' ').trim();
    if (key.length < 8) return null;
    // the game joins stat lines with " · " at run time: translate each piece on its own
    if (key.indexOf(' \u00b7 ') > 0 && depth < 6) {
      const parts = key.split(' \u00b7 '); let covered = 0;
      const out = parts.map(p => {
        const r = lookup(cat, p, depth + 1) || keptPiece(cat, p) || (p.length >= 8 && p.indexOf(' ') > 0 ? segment(cat, p, depth + 2) : null);
        if (r) { covered += p.length; return r.t; }
        return p;
      });
      if (covered * 2 >= key.length - 3 * (parts.length - 1)) { stat.segmented++; return { t: out.join(' \u00b7 '), g: null }; }
    }
    // cut points: just after a space that follows sentence punctuation (every space when the text is short)
    const words = key.split(' ').length, stops = [];
    for (let i = 1; i < key.length; i++) if (key.charCodeAt(i - 1) === 32 && (words <= 14 || /[.!?\u2026"\u201d\u2019)\u00bb:;,]/.test(key[i - 2] || ''))) stops.push(i);
    stops.push(key.length);
    let i = 0, out = '', covered = 0, guard = 0;
    while (i < key.length && guard++ < 400) {
      let hit = null;
      for (let s = stops.length - 1; s >= 0; s--) {
        const j = stops[s]; if (j <= i) break;
        // try longest first, but not past 60 words from i
        const chunk = key.slice(i, j).trim(); if (chunk.length < 3) continue;
        const r = lookup(cat, chunk, depth + 2) || keptPiece(cat, chunk);
        if (r) { hit = { r, j, len: chunk.length }; break; }
      }
      if (hit) { out += (out && !/\s$/.test(out) ? ' ' : '') + hit.r.t; covered += hit.len; i = hit.j; }
      else {
        const nextStop = stops.find(j => j > i) || key.length;
        out += (out && !/\s$/.test(out) ? ' ' : '') + key.slice(i, nextStop).trim(); i = nextStop;
      }
    }
    if (covered * 2 < key.length) return null;
    stat.segmented++;
    return { t: out, g: null };
  }

  // the public workhorse: English text (any whitespace) -> French text or null
  function translate(text) {
    if (loc === 'en' || typeof text !== 'string') return null;
    const cat = cats[loc]; if (!cat) return null;
    if (!/[A-Za-z]{2}/.test(text)) return null;
    let hit = cache.get(text);
    if (hit !== undefined) return hit;
    let res = null;
    try {
      const lead = /^\s*/.exec(text)[0], trail = /\s*$/.exec(text)[0], core = text.slice(lead.length, text.length - trail.length);
      let out = null;
      if (core.indexOf('\n') >= 0) {
        // pre-formatted blocks (the help text): one line at a time, blank and untranslated lines kept
        let any = false;
        out = core.split('\n').map(line => { const r = translateLine(cat, line); if (r != null) any = true; return r == null ? line : r; }).join('\n');
        if (!any) out = null;
      } else out = translateLine(cat, core);
      if (out != null) res = lead + out + trail;
    } catch (e) { res = null; }
    if (res == null) stat.miss++;
    if (cache.size > CACHE_MAX) cache.clear();
    cache.set(text, res);
    return res;
  }
  function translateLine(cat, line) {
    const lead = /^\s*/.exec(line)[0], core = line.trim();
    if (!core) return null;
    const r = lookup(cat, core, 0) || segment(cat, core, 0);
    return r ? lead + r.t : null;
  }

  // ---------------------------------------------------------------- DOM
  function skip(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.tagName] || n.getAttribute && n.getAttribute('data-i18n') === 'off') return true;
    }
    return false;
  }
  const isPlayerName = (x) => { try { return typeof G !== 'undefined' && G.player && typeof G.player.name === 'string' && x.trim() === G.player.name; } catch (e) { return false; } };

  function xlateText(node) {
    const cur = node.nodeValue, rec = textRec.get(node);
    if (rec && cur === rec.shown) { if (loc === 'en') { node.nodeValue = rec.en; textRec.delete(node); } return; }
    if (loc === 'en') return;
    const p = node.parentNode; if (!p || skip(p)) return;
    if (!/[A-Za-z]{2}/.test(cur)) return;
    if (isPlayerName(cur)) return;
    // the dialogue tone buttons ("Blunt") share their English word with the Blunt weapon skill: key them by data-t
    const tone = p.tagName === 'BUTTON' && p.dataset && p.dataset.t && p.parentNode && p.parentNode.classList && p.parentNode.classList.contains('tone') &&
      cur === p.dataset.t[0].toUpperCase() + p.dataset.t.slice(1);   // only the game's own label, never text another script wrote
    const out = translate(tone ? 'dialogue tone: ' + p.dataset.t : cur);
    if (out == null || out === cur) return;
    // another script that keeps rewriting this node would start a tug of war: give up after a few rounds
    const n = rec ? (rec.n || 0) + 1 : 0; if (n > 4) return;
    node.nodeValue = out;                   // text only: catalogue values are never parsed as markup
    textRec.set(node, { en: cur, shown: out, n });
  }
  // attributes are display sinks on every element: form controls and canvases have no translatable
  // text, and their title/aria-label/alt/placeholder is the only user-visible copy they carry
  function skipAttr(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (n.getAttribute && n.getAttribute('data-i18n') === 'off') return true;
    }
    return false;
  }
  function xlateAttr(el, a) {
    if (!el.getAttribute || skipAttr(el)) return;
    const cur = el.getAttribute(a); if (cur == null) return;
    const recs = attrRec.get(el) || {}, rec = recs[a];
    if (rec && cur === rec.shown) { if (loc === 'en') { el.setAttribute(a, rec.en); delete recs[a]; } return; }
    if (loc === 'en') return;
    const out = translate(cur); if (out == null || out === cur) return;
    const n = rec ? (rec.n || 0) + 1 : 0; if (n > 4) return;            // same tug-of-war guard as for text
    el.setAttribute(a, out);
    recs[a] = { en: cur, shown: out, n }; attrRec.set(el, recs);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { xlateText(root); return; }
    if (root.nodeType !== 1) return;
    for (const a of ATTR_LIST) { if (root.hasAttribute && root.hasAttribute(a)) xlateAttr(root, a); }
    if (skip(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) xlateText(n);
    for (const a of ATTR_LIST) { if (root.hasAttribute && root.hasAttribute(a)) xlateAttr(root, a); }
    root.querySelectorAll('[title],[aria-label],[alt],[placeholder]').forEach(el => { for (const a of ATTR_LIST) if (el.hasAttribute(a)) xlateAttr(el, a); });
  }
  function onMutations(list) {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(walk);
      else if (m.type === 'characterData') xlateText(m.target);
      else if (m.type === 'attributes') xlateAttr(m.target, m.attributeName);
    }
  }
  function startObserver() {
    if (observer || typeof MutationObserver === 'undefined' || !document.documentElement) return;
    observer = new MutationObserver(onMutations);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR_LIST });
  }
  function stopObserver() { if (observer) { observer.disconnect(); observer = null; } }

  // ---------------------------------------------------------------- canvas text (HUD bar, maps)
  let canvasInstalled = false;
  function installCanvas() {
    if (canvasInstalled || typeof CanvasRenderingContext2D === 'undefined') return;
    canvasInstalled = true;
    const P = CanvasRenderingContext2D.prototype;
    const ft = P.fillText, st = P.strokeText, mt = P.measureText;
    // compass letters live only on the canvas: translating "W" everywhere would also relabel the key W in the controls
    const COMPASS = { fr: { W: 'O', SW: 'SO', NW: 'NO' } };
    const tr = (t) => {
      if (loc === 'en' || typeof t !== 'string') return t;
      const c = COMPASS[loc]; if (c && Object.prototype.hasOwnProperty.call(c, t)) return c[t];
      const o = translate(t); return o == null ? t : o;
    };
    P.fillText = function (t) { arguments[0] = tr(t); return ft.apply(this, arguments); };
    P.strokeText = function (t) { arguments[0] = tr(t); return st.apply(this, arguments); };
    P.measureText = function (t) { return mt.call(this, tr(t)); };
  }

  // ---------------------------------------------------------------- locale switching
  async function load(code) {
    if (cats[code]) return true;
    const url = URLS[code]; if (!url) return false;
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cats[code] = compile(await r.json());
      return true;
    } catch (e) { try { console.info('[story-i18n] could not load ' + code + ': ' + (e && e.message)); } catch (e2) { /* console optional */ } return false; }
  }
  // restore every node we translated (English renders again; saves and game data were never touched)
  function restoreAll() {
    const w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) { const rec = textRec.get(n); if (rec && n.nodeValue === rec.shown) { n.nodeValue = rec.en; textRec.delete(n); } }
    document.documentElement.querySelectorAll('[title],[aria-label],[alt],[placeholder]').forEach(el => {
      const recs = attrRec.get(el); if (!recs) return;
      for (const a of Object.keys(recs)) if (el.getAttribute(a) === recs[a].shown) el.setAttribute(a, recs[a].en);
      attrRec.delete(el);
    });
  }
  async function setLocale(code) {
    code = String(code || 'en').split('-')[0];
    if (code !== 'en' && !(await load(code))) code = 'en';
    const was = loc;
    loc = code; cache.clear();
    if (code === 'en') { stopObserver(); if (was !== 'en') restoreAll(); return 'en'; }
    installCanvas();
    if (was !== 'en' && was !== code) restoreAll();
    startObserver();
    walk(document.body);
    return code;
  }

  // English-looking text nodes that have no translation (the test uses this to crawl panels)
  function untranslated(root) {
    const out = [], cat = cats[loc]; if (!cat) return out;
    const w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) {
      const p = n.parentNode; if (!p || skip(p)) continue;
      const rec = textRec.get(n); if (rec && n.nodeValue === rec.shown) continue;
      const t = n.nodeValue.trim();
      if (/[A-Za-z]{3}/.test(t) && /\b(the|and|you|your|with|from|that|this|his|her|their|into|has|have|not|are|was|for)\b/i.test(t) && !isPlayerName(t)) out.push(t);
    }
    return out;
  }

  return {
    hash, norm, translate, setLocale, load, withArticle, parseName, untranslated, walk,
    get locale() { return loc; }, stat, cats,
  };
})();
if (typeof window !== 'undefined') window.STORY_I18N = STORY_I18N;
