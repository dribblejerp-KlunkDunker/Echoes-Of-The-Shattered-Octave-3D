#!/usr/bin/env node
'use strict';
// Extract every player-visible English string from the game's source into tools/i18n/strings.en.json.
//
// Why static (AST) and not a vm walk: NPC quest() functions change flags, so they may never be
// called; walking the syntax tree reads their string literals without running them. Template
// literals and "+" chains become patterns with {0},{1} placeholders. HTML is split at tags so that
// each text node of a rendered panel has its own entry (the runtime translates text nodes).
//
// usage: node tools/i18n/extract.js [--review]   (needs acorn: ACORN_MODULE or /opt/npm-tools/node_modules/acorn)
const fs = require('fs');
const path = require('path');
const { hash, norm, decode } = require('./lib');
const ACORN = process.env.ACORN_MODULE || '/opt/npm-tools/node_modules/acorn';
const acorn = require(ACORN);

const ROOT = path.resolve(__dirname, '..', '..');
// Files that hold no story text (or text we deliberately leave: the mod/dev tools, voice manifests).
const SKIP_FILES = new Set(['assets.js', 'voice-lines.js', 'mods.js', 'story-i18n.js', 'access.js', 'painted-manifest.js', 'icons.js', 'frames.js', 'voices.js']);
const MARK = '';

// call names whose string arguments are code, not text
const CODE_CALLS = new Set(['test', 'match', 'matchAll', 'replace', 'replaceAll', 'split', 'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'querySelector', 'querySelectorAll', 'getElementById', 'closest', 'matches', 'add', 'remove', 'toggle', 'contains', 'has', 'setAttribute', 'getAttribute', 'removeAttribute', 'hasAttribute', 'addEventListener', 'removeEventListener', 'createElement', 'getItem', 'setItem', 'removeItem', 'hasOwnProperty', 'padStart', 'padEnd', 'join', 'require', 'fetch', 'parse', 'stringify', 'getContext', 'createElementNS', 'setProperty', 'getPropertyValue', 'sfx', 'play', 'setScene', 'hum', 'cue', 'emit', 'on', 'off', 'once', 'dispatchEvent', 'getOwnPropertyDescriptor', 'defineProperty', 'keys', 'has', 'get', 'set', 'delete', 'bind', 'toFixed', 'localeCompare', 'toLocaleString', 'warn', 'info', 'log', 'error', 'debug', 'assert', 'sprite', 'tex', 'loadMap', 'flag', 'take', 'give', 'gainItem', 'sound', 'tone', 'noise', 'stinger', 'duck', 'stage', 'persist', 'unlock', 'mark']);
const CODE_CALL_IDENTS = new Set(['$', 'require', 'parseInt', 'parseFloat', 'Symbol', 'RegExp', 'fetch', 'setTimeout', 'clamp', 'rnd', 'rndi', 'color', 'rgba', 'hsl', 'rgb']);
const CODE_MEMBER_OBJ = new Set(['console', 'JSON', 'Object', 'Math', 'Array', 'document', 'window', 'localStorage', 'sessionStorage', 'Audio_', 'Engine', 'Number', 'String', 'process', 'fs', 'path', 'Date', 'performance', 'navigator']);
// assignments to these properties are never text
const CODE_PROPS = new Set(['className', 'id', 'cssText', 'src', 'href', 'type', 'font', 'fillStyle', 'strokeStyle', 'textAlign', 'textBaseline', 'display', 'position', 'color', 'background', 'backgroundImage', 'filter', 'transform', 'tex', 'sprite', 'portrait', 'state', 'kind', 'scene', 'mode', 'cat', 'slot', 'target', 'rel', 'role', 'name_id', 'cursor', 'visibility', 'opacity', 'globalCompositeOperation', 'imageSmoothingEnabled', 'lineCap', 'lineJoin', 'who', 'sfx', 'sound', 'flag', 'map', 'mapId', 'cls', 'facing', 'anim', 'mood', 'img', 'ammo', 'use', 'to', 'from', 'key', 'tag', 'item', 'drop', 'weapon', 'face', 'hz_id', 'ctrl', 'action', 'dir', 'side', 'phase', 'stage', 'event', 'trigger', 'branch', 'step', 'wp', 'route', 'style', 'attr', 'prop', 'idle', 'walk', 'pose', 'cue', 'bank', 'bus']);

function parts(node) {
  // -> array of {s} / {x}, or null when the node is not a text-building expression
  if (!node) return null;
  if (node.type === 'Literal') return typeof node.value === 'string' ? [{ s: node.value }] : null;
  if (node.type === 'TemplateLiteral') {
    const out = [];
    node.quasis.forEach((q, i) => { out.push({ s: q.value.cooked == null ? q.value.raw : q.value.cooked }); if (i < node.expressions.length) out.push({ x: node.expressions[i] }); });
    return out;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const l = parts(node.left), r = parts(node.right);
    const lp = l || [{ x: node.left }], rp = r || [{ x: node.right }];
    if (!l && !r) return null;
    return lp.concat(rp);
  }
  return null;
}

// Turn parts into candidate segments: markers per expression, tags stripped (attribute text kept), newline-split.
function segments(ps) {
  let s = ps.map(p => ('s' in p ? p.s : MARK)).join('');
  const out = [];
  // text-bearing attributes inside tags
  s.replace(/<[^>]*?\b(?:title|aria-label|alt|placeholder)="([^"<>]*)"[^>]*>/g, (m, a) => { out.push(a); return m; });
  const chunks = s.split(/<[^>]*>/);
  for (const c of chunks) for (const line of c.split('\n')) out.push(line);
  return out.map(x => decode(x)).map(x => x.replace(/[ \t\r\f\v]+/g, ' ').trim()).filter(Boolean);
}

function renumber(seg) { let n = 0; return seg.replace(new RegExp(MARK, 'g'), () => '{' + (n++) + '}'); }

const KEEP_LOWER = new Set(); // single lowercase words that really are text (see keep-words.json)
try { for (const w of JSON.parse(fs.readFileSync(path.join(__dirname, 'keep-words.json'), 'utf8'))) KEEP_LOWER.add(w); } catch (e) { /* optional */ }

function isText(seg) {
  const bare = seg.split(MARK).join('');
  if (!/[A-Za-zÀ-ſ]{3,}/.test(bare)) return false;
  if (/^(https?:|\/|\.\/|data:|#[0-9a-f]{3,8}$)/i.test(bare)) return false;
  if (/\.(js|png|jpg|jpeg|mp3|ogg|json|css|html|svg|woff2?)\b/i.test(bare) && !/ /.test(bare)) return false;
  if (/[{};]\s*[a-z-]+\s*:/.test(bare) || /^[a-z-]+\s*:\s*[^ ]+;/.test(bare)) return false;
  if (/\\[dwsb]/.test(bare)) return false;
  if (/^\d+(\.\d+)?px\b|^\d+ \d+px|^image\/|^grid-|@\{?[-\d.]|^!\w|^\w+ \{\d\},\{\d\}$|^(npc|item|enemy|use|trigger|door) \{\d\}/.test(bare)) return false;
  if (/^[\w.\-:#\[\]="' >+~*,()]+$/.test(bare) && !/ /.test(bare)) {
    // one token: only capitalised plain words and allow-listed lowercase words are text
    if (KEEP_LOWER.has(bare)) return true;
    return /^[A-Z][a-z]+(['’-][A-Za-z]+)*[.!?:]?$/.test(bare) || /^[A-Z][A-Z' -]+$/.test(bare) && !/_/.test(bare);
  }
  // class lists and css-ish word runs: all lowercase tokens, no punctuation, at most 4, no uppercase
  if (/^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*){1,3}$/.test(bare) && !KEEP_LOWER.has(bare) && bare.split(' ').every(w => w.length <= 10 && /-/.test(bare) || /^(dfbtn|small|close|muted|warn|good|bad|sel|on|off|hidden|wide|pick|shop|dlg|col|btns|list|row|grid|kbd|panel|tone|tab|btn|stat|bar|fill|label|hint)\b/.test(bare))) return false;
  return true;
}

function lineOf(src, pos) { let n = 1; for (let i = 0; i < pos; i++) if (src.charCodeAt(i) === 10) n++; return n; }

function extractFile(file, src, add) {
  const ast = acorn.parse(src, { ecmaVersion: 2022, locations: false });
  const handled = new Set();      // literal nodes folded into a pattern
  function ctxSkip(node, parents) {
    const p = parents[parents.length - 1], gp = parents[parents.length - 2];
    if (!p) return false;
    if (p.type === 'Property' && p.key === node && !p.computed) return !(node.type === 'Literal' && typeof node.value === 'string' && /[A-Z ]/.test(node.value));
    if (p.type === 'MethodDefinition' || p.type === 'PropertyDefinition') return p.key === node;
    if ((p.type === 'BinaryExpression' && /^(===|!==|==|!=|<|>|<=|>=|in|instanceof)$/.test(p.operator))) return true;
    if (p.type === 'SwitchCase') return p.test === node;
    if (p.type === 'MemberExpression' && p.computed && p.property === node) return true;
    if (p.type === 'ExpressionStatement' && p.directive) return true;
    if (p.type === 'ImportDeclaration' || p.type === 'ExportNamedDeclaration') return true;
    if (p.type === 'CallExpression' || p.type === 'NewExpression') {
      const c = p.callee;
      if (p.arguments.includes(node)) {
        if (c.type === 'Identifier' && (CODE_CALL_IDENTS.has(c.name) || c.name === 'RegExp')) return true;
        if (c.type === 'MemberExpression' && !c.computed) {
          const nm = c.property.name;
          if (c.object.type === 'Identifier' && CODE_MEMBER_OBJ.has(c.object.name)) return true;
          if (CODE_CALLS.has(nm)) return true;
          if (c.object.type === 'MemberExpression' && c.object.property && c.object.property.name === 'classList') return true;
        }
      }
    }
    if (p.type === 'AssignmentExpression' && p.right === node && p.left.type === 'MemberExpression') {
      const nm = p.left.computed ? null : p.left.property.name;
      if (nm && CODE_PROPS.has(nm)) return true;
      if (p.left.object && p.left.object.type === 'MemberExpression' && !p.left.object.computed && p.left.object.property.name === 'style') return true;
      if (p.left.object && p.left.object.type === 'MemberExpression' && !p.left.object.computed && p.left.object.property.name === 'dataset') return true;
    }
    if (p.type === 'AssignmentExpression' && p.right === node && p.left.type === 'MemberExpression' && p.left.computed) return true; // G.flags[x] = 'str'
    if (p.type === 'Property' && p.value === node && !p.computed) {
      const k = p.key.name || p.key.value;
      if (CODE_PROPS.has(k)) return true;
    }
    return false;
  }
  function emit(ps, node, parents, kind) {
    if (ps.every(p => 's' in p === false)) return;
    for (const seg of segments(ps)) {
      if (!isText(seg)) continue;
      const en = norm(renumber(seg));
      add(en, file, lineOf(src, node.start), kind);
    }
  }
  function visit(node, parents) {
    if (!node || typeof node.type !== 'string') return;
    // "+" chain root / template: one pattern
    if ((node.type === 'BinaryExpression' && node.operator === '+') || node.type === 'TemplateLiteral') {
      const ps = parts(node);
      if (ps && !ctxSkip(node, parents)) {
        // x += ' ' + y : pieces stand alone (the runtime joins translated pieces)
        const p = parents[parents.length - 1];
        if (!(p && p.type === 'AssignmentExpression' && p.operator === '+=')) {
          // a pure literal+literal concat is a plain string
          emit(ps, node, parents);
          descendExprs(node, parents);
          return;
        }
      } else if (ps) { descendExprs(node, parents); return; }
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (!ctxSkip(node, parents) && !handled.has(node)) emit([{ s: node.value }], node, parents);
      return;
    }
    const np = parents.concat(node);
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (Array.isArray(v)) for (const c of v) { if (c && typeof c.type === 'string') visit(c, np); }
      else if (v && typeof v.type === 'string') visit(v, np);
    }
  }
  // inside a text pattern only the non-literal operands can hold more text (conditional branches etc.)
  function descendExprs(node, parents) {
    const np = parents.concat(node);
    if (node.type === 'TemplateLiteral') { for (const e of node.expressions) visit(e, np); return; }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      for (const side of [node.left, node.right]) {
        if (side.type === 'Literal' && typeof side.value === 'string') continue;
        if (side.type === 'BinaryExpression' && side.operator === '+' && parts(side)) { descendExprs(side, np); continue; }
        if (side.type === 'TemplateLiteral') { descendExprs(side, np); continue; }
        visit(side, np);
      }
    }
  }
  visit(ast, []);
}

// Evaluate the data modules (never an NPC quest()) in a vm to read enemy names and rebuild the
// "the X" / "The X" forms game.js's theName() produces.
function dynamicExtras() {
  const vm = require('vm');
  const ctx = { console, Math }; ctx.window = ctx; vm.createContext(ctx);
  for (const f of ['data.js', 'grove.js', 'coda.js', 'wilds.js']) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f }); } catch (e) { console.warn('[extract] vm skipped', f, e.message.slice(0, 80)); }
  }
  const out = [];
  try {
    const names = vm.runInContext('Object.values(ENEMIES).map(e => e.name)', ctx);
    for (const n of names) {
      const b = /^(A|An|The) /.test(n) ? n.replace(/^(A|An|The) /, '') : n;
      out.push(n, 'the ' + b, 'The ' + b);
    }
  } catch (e) { console.warn('[extract] no ENEMIES', e.message); }
  try { for (const k of vm.runInContext('Object.keys(ENEMIES)', ctx)) out.push('??? (' + k + ')'); } catch (e) { /* bestiary ids are optional */ }
  out.push('Polite', 'Normal', 'Blunt');
  return out;
}

function run() {
  const entries = new Map();   // en -> { id, en, where:Set, kind }
  const add = (en, file, line, kind) => {
    let e = entries.get(en);
    if (!e) { e = { id: hash(en), en, where: [], pattern: /\{\d+\}/.test(en) }; entries.set(en, e); }
    if (e.where.length < 4) e.where.push(file + ':' + line);
  };
  const files = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && !SKIP_FILES.has(f)).sort();
  for (const f of files) extractFile(f, fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), add);
  // static HTML text of index.html (title screen, panels created in markup)
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    const tmpl = html.replace(/<!--[\s\S]*?-->/g, '');
    for (const seg of segments([{ s: tmpl }])) if (isText(seg)) add(norm(seg), 'index.html', 0);
  } catch (e) { /* optional */ }
  // hand-kept strings the code builds at run time (capitalised tone names, theName() forms...)
  let extras = [];
  try { extras = JSON.parse(fs.readFileSync(path.join(__dirname, 'extras.en.json'), 'utf8')); } catch (e) { /* optional */ }
  for (const en of extras) add(norm(en), 'extras.en.json', 0);
  // names the code builds with theName() and capitalised tone labels: only a run of the data tables shows them
  for (const en of dynamicExtras()) add(norm(en), 'theName()', 0);
  // collision check
  const byId = new Map();
  for (const e of entries.values()) { if (byId.has(e.id)) throw new Error('hash collision: ' + e.en + ' / ' + byId.get(e.id)); byId.set(e.id, e.en); }
  const list = [...entries.values()].sort((a, b) => a.en < b.en ? -1 : a.en > b.en ? 1 : 0);
  const out = {};
  for (const e of list) out[e.id] = { en: e.en, where: e.where, pattern: e.pattern || undefined };
  fs.writeFileSync(path.join(__dirname, 'strings.en.json'), JSON.stringify(out, null, 1) + '\n');
  return list;
}

if (require.main === module) {
  const list = run();
  const byFile = {};
  for (const e of list) { const f = e.where[0].split(':')[0]; byFile[f] = (byFile[f] || 0) + 1; }
  console.log('strings:', list.length, 'patterns:', list.filter(e => e.pattern).length, 'chars:', list.reduce((n, e) => n + e.en.length, 0));
  console.log(byFile);
  if (process.argv.includes('--review')) fs.writeFileSync(path.join(__dirname, 'review.txt'), list.map(e => e.where[0] + '\t' + e.en).join('\n') + '\n');
}
module.exports = { run };
