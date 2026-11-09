// extras17 — Phase 17 "Beyond Book One", team EXTRAS: the Extras menu (title screen), spoiler notice, unlocks, save
// isolation for extras, the "An extra — after Book One" banner, and the shared winter look (WINTER17).
//
// WINTER17 CONTRACT (stable; other Phase 17 teams call it — the EXTRAS team implements it, these stubs are no-ops):
//   WINTER17.apply(mapId, opts)  opts: { snow: 0..1 ground/roof cover, fall: 0..1 falling snow, breath: bool,
//                                        grade: 0..1 cold colour grade }   — winter on that map until clear()
//   WINTER17.clear(mapId)        — remove it (also cleared automatically when an extra ends)
//   WINTER17.active(mapId)       — the opts in force, or null
// EXTRAS17 CONTRACT (for the extra teams):
//   EXTRAS17.register({ id, title, blurb, start(), unlocked() })  — an extra appears in the Extras menu; start() runs
//                                        inside an isolated session (its own G; the Book One save is never touched)
//   EXTRAS17.inExtra()                — the id of the running extra, or null
//   EXTRAS17.finish(result)           — end the extra and return to the Extras menu (result is shown on its card)
//   Phase 18 (team DAILY), one additive option: register({ ..., hidden: true }) — a standalone run that shares this
//   isolation but is not an extra after Book One: it is not listed in the Extras menu, needs no unlock (its own
//   unlocked() still applies), its banner and tags show only its title (no "An extra — after Book One"), and leaving it
//   returns to the bare title screen instead of the Extras menu. Without the option nothing changes.
//
// ---------------------------------------------------------------------------------------------------------------
// HOW AN EXTRA IS ISOLATED (the Book One save is never touched)
//   Entering an extra (EXTRAS17.start(id), or Play on its card) first puts the whole Book One session aside:
//     * every data field of G, by reference (player, flags, journal, ledger, maps, map, day, tod, party ...), plus
//       Engine.cam and the weather;
//     * the three session slots (SLOTS), the hardcore save (HARDCORE.save) and the pre-boss autosave
//       (UPG.autosaveSlot / autosaveWhen) — they are emptied while the extra runs, so nothing the extra does can
//       write into them, and they are put back, the same objects, when it ends.
//   Then a fresh session is made the way Begin makes one (startGame with a stock traveller, no intro), marked with
//   G.flags.p17x_on = 1 and p17x_x = a number derived from the extra's id, and the extra's start() runs in it.
//   While inside:
//     * Save game shows the extra's own slot only (no save codes, no downloads); Load game shows that slot and the
//       extra's own pre-boss autosave only. restoreGame refuses anything that is not this extra's save.
//     * Options: "Return to title" becomes "Leave the extra"; the hardcore switch is hidden.
//     * a small banner says "An extra — after Book One" and the extra's title.
//   Leaving (EXTRAS17.finish(result), Leave the extra, or the death screen's Leave button) clears every WINTER17
//   map, restores every G field (and deletes fields the extra added), the camera, the weather, the slots, the
//   hardcore save and the autosave, and opens the Extras menu on the title screen.
//   Outside an extra, restoreGame refuses a save carrying p17x_on (an extra's save can never open as Book One).
//   A page reload inside an extra lands on the title as usual (Book One's session slots never outlive a page);
//   the extra's card says the visit was interrupted. Nothing starts by itself.
//
// UNLOCKS
//   Each extra is playable once Book One is truly finished: only the "Not yet" ending (grove.js bookOneEnd1(), flag
//   book_one_done) unlocks. "Grab the Line" (game.js ending(), flag escaped) ends Part Two, not the book, and does
//   not count (author's ruling, FIX17). Remembered in localStorage (per browser, as v:2; an older record, which an
//   escape or "Open them anyway" could have written, unlocks nothing). There is no early unlock.
//   Players who finished before this phase: loading such a save unlocks, and the Extras menu can check a save code
//   or file without loading it. An extra's own unlocked() (optional) can further hold it back.
//
// WINTER17 (GFX.winter17 + Options row "Winter in the extras"; per-frame, so off in Low and Original)
//   ground  (post hook 6)  world-anchored snow on outdoor ground pixels (a stable noise field, coverage = snow),
//                          lit from the pixel it covers so night and lamps still read; thins into the fog.
//   roofs   (post hook 7)  a snow cap along the top edge of every outdoor wall whose top meets the sky or
//                          something farther, with world-anchored drips.
//   flakes  (post hook 39) falling snow drawn into the frame with the depth test (a wall hides flakes behind it);
//                          count = fall x 640 x GFX.particles round the camera (about a fifth in view); none with Reduce motion. No glints (No flashes).
//   grade   (post hook 42) a cold grade: a little desaturation, lifted blue, pressed red (indoors too).
//   breath  air11's cold breath (GFX.coldBreath) on that map (its COLD_MAPS set, restored on clear).
//   Off (flag or switch), or no WINTER17.apply for the current map = pixel-identical frames.
//
// Security: every string shown is a constant from TX below or a registered extra's own title/blurb, and all of them
// go in through textContent. Save data, results and localStorage are validated and never parsed as markup.
// Every invented fact is [PROPOSED] (there are almost none: this module is plumbing and weather).
(function () {
  'use strict';
  const KEY = 'octave.extras17.v1';
  const clamp01 = (v) => { v = +v; return Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0; };
  const hasG = () => typeof G !== 'undefined' && G;
  const warned = {};
  function warnOnce(k, e) { if (!warned[k]) { warned[k] = true; console.warn('extras17 ' + k, e); } }

  // ------------------------------------------------------------------------------------------------ text
  const TX = {
    btn: 'Extras',
    banner: 'An extra — after Book One',
    h: 'Extras',
    sub: 'Short chapters set after the end of Book One. Each one runs on its own save: your Book One game is put aside, untouched, and given back when you leave.',
    spoilH: 'Before you go on',
    spoil: 'These extras take place after Book One and spoil its ending.',
    spoilMore: 'Some of them also show people and events from the books that follow. They open by themselves when Book One is truly finished, at its very end.',
    spoilYes: 'Show me the extras',
    spoilNo: 'Back to the title',
    lockedAll: 'The extras open when Book One is truly finished, at its very end.',
    doneNote: 'Book One is finished in this browser. The extras are open.',
    checkH: 'Finished Book One already?',
    checkP: 'Paste a save code from a finished game, or choose its file. It is only read, never loaded.',
    checkBtn: 'Check the save',
    checkFile: 'Check a file…',
    checkYes: 'That traveller finished Book One. The extras are open.',
    checkNo: 'That save has not reached the end of Book One yet.',
    checkBad: 'That did not read as a save.',
    none: 'No extras are in this build yet.',
    locked: 'Locked: finish Book One to open it.',
    notYet: 'Not open yet.',
    play: 'Play',
    resume: 'Continue from its save',
    again: 'Begin it again',
    lastTime: 'Last time: ',
    cut: 'Your last visit was interrupted (the page was closed or reloaded). It begins again.',
    failed: 'This extra could not start. Your Book One game is untouched.',
    back: 'Back',
    close: 'Close',
    leave: 'Leave the extra',
    leaveDeath: 'Leave the extra',
    saveH: 'Save game',
    saveP: 'This extra keeps one save of its own, for as long as the page is open. Your Book One saves are put aside until you leave.',
    saveSlot: 'Save here',
    saveEmpty: 'The extra’s save — empty',
    saved: 'Saved. This is the extra’s own save.',
    loadH: 'Load game',
    loadP: 'Only this extra’s own save opens here. Book One saves open from the title screen once you leave.',
    loadBtn: 'Load',
    autoLabel: 'The extra’s autosave (before the fight)',
    loadNone: 'There is no save for this extra yet.',
    refuseIn: 'Only this extra’s own save opens inside it.',
    refuseOut: 'That save belongs to an extra. Open it from Extras on the title screen.',
    unlockedNow: 'The extras are open: Extras, on the title screen. They take place after Book One.',
    optLabel: 'Winter in the extras',
    optHint: 'snow on the ground and roofs, falling snow and a cold grade in the after-Book-One extras. Off: they look like the rest of the game.',
    on: 'On', off: 'Off',
    traveller: 'Traveller',
  };
  const TEXTS = Object.values(TX);

  // ------------------------------------------------------------------------------------------------ storage
  // { v: 2, ack: 0/1 spoiler notice seen, done: 0/1 Book One truly finished (the "Not yet" ending), w: 0/1 winter look,
  //   res: { id: short result text }, run: id of an extra in progress (a reload clears it), cut: id interrupted }
  //   done is read only from a v:2 record: before the ruling it was also set by the escape ending and by "Open them
  //   anyway", so an older record keeps its other fields and unlocks nothing; a stored "early" is ignored.
  const ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
  const st = { v: 2, ack: 0, done: 0, w: 1, res: {}, run: null, cut: null };
  function cleanRes(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160); }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!o || typeof o !== 'object') return;
      st.ack = o.ack === 1 ? 1 : 0; st.done = o.v === 2 && o.done === 1 ? 1 : 0; st.w = o.w === 0 ? 0 : 1;
      st.res = {};
      if (o.res && typeof o.res === 'object') for (const k of Object.keys(o.res).slice(0, 32)) if (ID_RE.test(k) && typeof o.res[k] === 'string') st.res[k] = cleanRes(o.res[k]);
      st.run = typeof o.run === 'string' && ID_RE.test(o.run) ? o.run : null;
      st.cut = typeof o.cut === 'string' && ID_RE.test(o.cut) ? o.cut : null;
    } catch (e) { /* no storage, or junk: defaults */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* no storage: this page only */ } }
  load();
  // A reload (or a closed tab) inside an extra: nothing resumes by itself; the card says so.
  if (st.run) { st.cut = st.run; st.run = null; save(); }

  // ------------------------------------------------------------------------------------------------ registry
  const reg = [];
  function register(x) {
    try {
      if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !ID_RE.test(x.id) || typeof x.start !== 'function') { warnOnce('register', new Error('an extra needs an id (a-z, 0-9, _ -) and a start()')); return false; }
      if (reg.find((r) => r.id === x.id)) return false;
      reg.push(x); return true;
    } catch (e) { warnOnce('register', e); return false; }
  }
  const byId = (id) => reg.find((r) => r.id === id) || null;
  function titleOf(x) { return cleanRes(x && x.title) || (x && x.id) || ''; }
  function idCode(id) { let h = 7; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 999983; return h + 1; }
  const opened = () => st.done === 1;
  function playable(x) {
    if (!x.hidden && !opened()) return false;
    if (typeof x.unlocked === 'function') { try { return x.unlocked() !== false; } catch (e) { warnOnce('unlocked', e); return false; } }
    return true;
  }
  const finishedFlags = (f) => !!(f && typeof f === 'object' && f.book_one_done === true);   // "escaped" (Part Two) alone does not count
  function markDone(note) {
    if (st.done === 1) return false;
    st.done = 1; save();
    if (note) { try { msg(TX.unlockedNow, 'good', 7000); } catch (e) { /* cue only */ } }
    return true;
  }

  // ------------------------------------------------------------------------------------------------ session
  // Fields of G that are UI or settings, not the run: never stashed, restored or deleted.
  const LIVE = new Set(['state', 'time', 'opts', 'keys', 'mouse', 'touch', 'touchMode', 'openPanel', 'panelToken', 'msgQueue', 'fadeT', 'vel', 'turnV']);
  let cur = null;          // { id, x, book: {...} } while an extra runs
  const xslot = {};        // id -> the extra's own save (detached), this page only
  const xauto = {};        // id -> { d, when }: the extra's own pre-boss autosave, kept between visits this page

  function stashBook() {
    const g = {}, keys = [];
    for (const k of Object.keys(G)) { if (LIVE.has(k) || typeof G[k] === 'function') continue; g[k] = G[k]; keys.push(k); }
    const c = Engine.cam;
    return {
      g, keys,
      cam: { x: c.x, y: c.y, z: c.z, dir: c.dir, pitch: c.pitch, bob: c.bob },
      slots: SLOTS.slice(),
      hard: HARDCORE.save,
      auto: (typeof UPG === 'object' && UPG) ? UPG.autosaveSlot : null,
      autoWhen: (typeof UPG === 'object' && UPG) ? UPG.autosaveWhen : '',
      weather: (typeof Weather !== 'undefined' && Weather.save) ? Weather.save() : null,
      create: Object.assign({}, CREATE),
    };
  }
  function restoreBook(b) {
    for (const k of Object.keys(G)) { if (LIVE.has(k) || typeof G[k] === 'function') continue; if (!Object.prototype.hasOwnProperty.call(b.g, k)) delete G[k]; }
    for (const k of b.keys) G[k] = b.g[k];
    for (let i = 0; i < SLOTS.length; i++) SLOTS[i] = b.slots[i] === undefined ? null : b.slots[i];
    HARDCORE.save = b.hard;
    if (typeof UPG === 'object' && UPG) { UPG.autosaveSlot = b.auto; UPG.autosaveWhen = b.autoWhen; }
    for (const k of Object.keys(CREATE)) if (!(k in b.create)) delete CREATE[k];
    Object.assign(CREATE, b.create);
    try { if (G.map && Engine.setMap) Engine.setMap(G.map); } catch (e) { warnOnce('setMap', e); }
    Object.assign(Engine.cam, b.cam);
    try { if (typeof Weather !== 'undefined' && Weather.load) Weather.load(b.weather); } catch (e) { warnOnce('weather', e); }
  }
  function clearScreens() {
    for (const s of ['#create', '#intro', '#death', '#ending', '#event']) { try { hide(s); } catch (e) { /* missing */ } }
    try { closeModal(); } catch (e) { /* ignore */ }
    const m = document.getElementById('msgs'); if (m) m.innerHTML = '';
    const v = document.getElementById('view'); if (v) v.classList.remove('unwrite');
  }

  function start(id) {
    const x = byId(id);
    if (!x || cur || !playable(x) || !hasG()) return false;
    const book = stashBook();
    cur = { id: x.id, x, book };
    st.run = x.id; if (st.cut === x.id) st.cut = null; save();
    let ok = false;
    try {
      // the slots are the extra's while it runs: Book One's are aside in `book`
      for (let i = 0; i < SLOTS.length; i++) SLOTS[i] = null;
      HARDCORE.save = null;
      if (typeof UPG === 'object' && UPG) { const a = xauto[x.id]; UPG.autosaveSlot = a ? a.d : null; UPG.autosaveWhen = a ? a.when : ''; }
      freshSession();
      G.flags.p17x_on = 1; G.flags.p17x_x = idCode(x.id);
      clearScreens();
      try { hide('#title'); } catch (e) { /* ignore */ }
      x.start();
      if (G.map && G.player) ok = true;
      if (ok && G.state !== 'play' && G.state !== 'event' && G.state !== 'dialogue' && G.state !== 'panel') G.state = 'play';
    } catch (e) { console.warn('extras17: the extra failed to start', e); ok = false; }
    if (!ok) { leave(null, true); return false; }
    banner(true);
    return true;
  }
  // a new traveller exactly as Begin makes one, without the intro and with no Book One state
  function freshSession() {
    const keep = Object.assign({}, CREATE);
    let ci = CLASSES.findIndex((c) => c.id === 'cantor'); if (ci < 0) ci = 0;
    CREATE.name = TX.traveller; CREATE.cls = ci; CREATE.face = 1; CREATE.bio = []; CREATE.attrs = Object.assign({}, CLASSES[ci].attrs); CREATE.p11cSign = 0;
    G.map = null; G.mapId = null; G.ents = []; G.party = null; G.runs = 0;
    try { startGame(); } finally { for (const k of Object.keys(CREATE)) if (!(k in keep)) delete CREATE[k]; Object.assign(CREATE, keep); }
    // startGame opened the intro scroll and queued Oakhaven behind it: close it before it can fire
    G.state = 'x17'; try { hide('#intro'); } catch (e) { /* ignore */ }
    G.journal = []; G.ledger = [];
    try { if (typeof Weather !== 'undefined' && Weather.load) Weather.load(null); } catch (e) { /* ignore */ }
  }
  function leave(result, failed) {
    if (!cur) return false;
    const c = cur; cur = null;
    try { WINTER17_clearAll(); } catch (e) { warnOnce('winterclear', e); }
    if (typeof UPG === 'object' && UPG) { if (UPG.autosaveSlot) xauto[c.id] = { d: UPG.autosaveSlot, when: UPG.autosaveWhen || '' }; }
    if (result !== undefined && result !== null && !failed) {
      const s = cleanRes(typeof result === 'object' ? (result.text || result.result || '') : result);
      if (s) st.res[c.id] = s;
      delete xslot[c.id]; delete xauto[c.id];        // finished: the next visit starts fresh
    }
    st.run = null; save();
    clearScreens();
    try { restoreBook(c.book); } catch (e) { console.warn('extras17: restoring Book One failed', e); }
    banner(false);
    G.state = 'title'; G.keys = {};
    try { show('#title'); } catch (e) { /* ignore */ }
    try { Audio_.setScene('title'); } catch (e) { /* ignore */ }
    if (!c.x.hidden) { try { renderExtras(failed ? { failed: c.id } : null); } catch (e) { warnOnce('menu', e); } }
    return true;
  }
  function finish(result) { if (!cur) return false; return leave(result === undefined ? '' : result, false); }
  function quit() { if (!cur) return false; return leave(null, false); }
  const inExtra = () => (cur ? cur.id : null);

  // ------------------------------------------------------------------------------------------------ style
  const CSS = `
#x17-banner { position: absolute; right: 1.2cqw; top: 1cqh; z-index: 6; pointer-events: none; font-family: var(--font-sc), serif;
  font-size: 1.7cqw; line-height: 1.2; color: #e9dcc0; background: rgba(12,10,8,.62); border: 1px solid rgba(201,160,80,.55);
  padding: .3cqh .8cqw; border-radius: 2px; text-align: right; max-width: 40cqw; text-shadow: 0 1px 0 #000; }
#x17-banner b { display: block; color: var(--gold, #d9a441); font-weight: 400; font-size: 1.5cqw; }
#x17-banner[hidden] { display: none; }
#modal-panel .x17-card { border: 1px solid var(--gold-dim, #7a5c2a); padding: .6cqh 1cqw; margin: .8cqh 0; background: rgba(0,0,0,.18); }
#modal-panel .x17-card h3 { margin: 0 0 .3cqh; }
#modal-panel .x17-tag { font-family: var(--font-sc), serif; color: #c9b38a; font-size: 1.7cqw; letter-spacing: .03em; }
#modal-panel .x17-res { color: #e8d8b0; font-style: italic; }
#modal-panel .x17-lock { color: #b9a98a; }
#modal-panel textarea.x17-code { width: 100%; height: 6cqh; box-sizing: border-box; }
#modal-panel .x17-warn { color: #f0b060; }
`;
  function injectStyle() {
    if (document.getElementById('extras17-style')) return;
    const s = document.createElement('style'); s.id = 'extras17-style'; s.textContent = CSS; document.head.appendChild(s);
  }

  // ------------------------------------------------------------------------------------------------ DOM helpers
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(id, text, onclick, small) { const b = el('button', { class: 'dfbtn' + (small ? ' small' : ''), id, type: 'button' }, text); b.onclick = onclick; return b; }
  function panel(name) {
    // the title screen stays up behind these panels and G.state stays 'title', so Escape simply closes the panel
    // (game.js) and the title is there underneath, exactly like How to play
    openModal('', name);
    return document.getElementById('modal-panel');
  }

  // ------------------------------------------------------------------------------------------------ banner
  function banner(on) {
    let b = document.getElementById('x17-banner');
    if (!b) {
      const host = document.getElementById('game'); if (!host) return;
      b = el('div', { id: 'x17-banner', role: 'note' }); b.hidden = true;
      host.appendChild(b);
    }
    b.textContent = '';
    if (on && cur) { if (!cur.x.hidden) b.appendChild(document.createTextNode(TX.banner)); b.appendChild(el('b', null, titleOf(cur.x))); b.hidden = false; }
    else b.hidden = true;
  }

  // ------------------------------------------------------------------------------------------------ title button
  function titleButton() {
    if (document.getElementById('btn-extras')) return;
    const menu = document.querySelector('#title .menu'); if (!menu) return;
    const b = el('button', { class: 'dfbtn', id: 'btn-extras', type: 'button' }, TX.btn);
    b.onclick = () => { try { Audio_.init(); Audio_.resume(); } catch (e) { /* ignore */ } openExtras(); };
    const help = document.getElementById('btn-help');
    if (help && help.parentNode === menu) menu.insertBefore(b, help); else menu.appendChild(b);
  }
  function openExtras() {
    if (cur) return;
    if (hasG() && G.state !== 'title') return;
    scanMemorySaves();
    if (!st.ack) renderSpoiler(); else renderExtras();
  }
  // saves already in this page (session slots, the autosave, the hardcore save) count as "already finished"
  function scanMemorySaves() {
    if (st.done) return;
    try {
      const all = SLOTS.concat([HARDCORE.save, typeof UPG === 'object' && UPG ? UPG.autosaveSlot : null]);
      for (const d of all) if (d && d.flags && !d.flags.p17x_on && finishedFlags(d.flags)) { markDone(false); return; }
    } catch (e) { warnOnce('scan', e); }
  }

  function renderSpoiler() {
    const p = panel('x17spoil');
    p.appendChild(el('h2', null, TX.spoilH));
    p.appendChild(el('p', { class: 'x17-warn' }, TX.spoil));
    p.appendChild(el('p', { class: 'muted' }, TX.spoilMore));
    const row = el('div', { class: 'btns' });
    const no = btn('x17-spoil-no', TX.spoilNo, () => { closeModal(); });
    const yes = btn('x17-spoil-yes', TX.spoilYes, () => { st.ack = 1; save(); renderExtras(); });
    row.appendChild(yes); row.appendChild(no); p.appendChild(row);
    try { no.focus(); } catch (e) { /* ignore */ }
  }

  function renderExtras(opt) {
    opt = opt || {};
    const p = panel('x17menu');
    p.appendChild(el('h2', null, TX.h));
    const x = btn('x17-x', TX.close, () => { closeModal(); }, true); x.classList.add('close'); p.appendChild(x);
    p.appendChild(el('p', { class: 'muted' }, TX.sub));
    if (st.done) p.appendChild(el('p', { class: 'muted', id: 'x17-done' }, TX.doneNote));
    else p.appendChild(el('p', { class: 'x17-lock', id: 'x17-locked' }, TX.lockedAll));
    const shown = reg.filter((r) => !r.hidden);
    if (!shown.length) p.appendChild(el('p', { class: 'muted', id: 'x17-none' }, TX.none));
    for (const xx of shown) p.appendChild(card(xx, opt));
    if (!st.done) checker(p);
    const row = el('div', { class: 'btns' });
    row.appendChild(btn('x17-back', TX.back, () => { closeModal(); }, true));
    p.appendChild(row);
  }
  function card(xx, opt) {
    const c = el('div', { class: 'x17-card', 'data-extra': xx.id });
    c.appendChild(el('h3', null, titleOf(xx)));
    c.appendChild(el('div', { class: 'x17-tag' }, TX.banner));
    const blurb = cleanRes(xx.blurb); if (blurb) c.appendChild(el('p', null, blurb));
    if (opt.failed === xx.id) c.appendChild(el('p', { class: 'x17-warn' }, TX.failed));
    if (st.cut === xx.id) c.appendChild(el('p', { class: 'x17-warn' }, TX.cut));
    if (st.res[xx.id]) { const r = el('p', { class: 'x17-res' }); r.appendChild(document.createTextNode(TX.lastTime)); r.appendChild(el('span', null, st.res[xx.id])); c.appendChild(r); }
    const row = el('div', { class: 'btns' });
    if (!opened()) c.appendChild(el('p', { class: 'x17-lock' }, TX.locked));
    else if (!playable(xx)) c.appendChild(el('p', { class: 'x17-lock' }, TX.notYet));
    else if (xslot[xx.id]) {
      row.appendChild(btn('x17-resume-' + xx.id, TX.resume, () => resume(xx.id), true));
      row.appendChild(btn('x17-play-' + xx.id, TX.again, () => { delete xslot[xx.id]; delete xauto[xx.id]; start(xx.id); }, true));
    } else row.appendChild(btn('x17-play-' + xx.id, TX.play, () => start(xx.id), true));
    c.appendChild(row);
    return c;
  }
  function resume(id) {
    const d = xslot[id]; if (!d) return false;
    if (!start(id)) return false;
    try { restoreGame(JSON.parse(JSON.stringify(d))); banner(true); return true; } catch (e) { console.warn('extras17: resume failed', e); return false; }
  }
  // "Finished Book One already?": read a code or file with the game's own decoder; never load it
  function checker(p) {
    p.appendChild(el('h3', null, TX.checkH));
    p.appendChild(el('p', { class: 'muted' }, TX.checkP));
    const ta = el('textarea', { class: 'x17-code', id: 'x17-code', 'aria-label': TX.checkH }); p.appendChild(ta);
    const out = el('p', { class: 'muted', id: 'x17-check-out', role: 'status' });
    const row = el('div', { class: 'btns' });
    const file = el('input', { type: 'file', id: 'x17-file', accept: '.txt,.json,.octave,text/plain' }); file.style.display = 'none';
    row.appendChild(btn('x17-check', TX.checkBtn, () => { checkCode(ta.value).then((r) => after(r)); }, true));
    row.appendChild(btn('x17-check-file', TX.checkFile, () => file.click(), true));
    row.appendChild(file);
    file.onchange = async () => { const f = file.files && file.files[0]; if (!f) return; if (f.size > 4 * 1024 * 1024) { after('bad'); return; } after(await checkCode(await f.text())); };
    p.appendChild(row); p.appendChild(out);
    function after(r) {
      if (r === 'yes') { markDone(false); renderExtras(); const o = document.getElementById('x17-check-out'); if (o) o.textContent = TX.checkYes; else { const d = document.getElementById('x17-done'); if (d) d.textContent = TX.checkYes; } return; }
      out.textContent = r === 'no' ? TX.checkNo : TX.checkBad;
    }
  }
  async function checkCode(text) {
    try {
      const d = await decodeSave(String(text || '').slice(0, 6 * 1024 * 1024));
      if (!d || !d.flags || d.flags.p17x_on) return 'bad';
      return finishedFlags(d.flags) ? 'yes' : 'no';
    } catch (e) { return 'bad'; }
  }

  // ------------------------------------------------------------------------------------------------ in-extra panels
  function renderXSave() {
    const id = cur.id;
    const p = panel('x17save'); G.state = 'panel';
    p.appendChild(el('h2', null, TX.saveH));
    const x = btn('x', TX.close, () => { closeModal(); G.state = 'play'; }, true); x.classList.add('close'); p.appendChild(x);
    p.appendChild(tagEl());
    p.appendChild(el('p', { class: 'muted' }, TX.saveP));
    const s = xslot[id];
    const slot = el('div', { class: 'slot' });
    slot.appendChild(el('span', { class: 'meta' }, s ? summary(s) : TX.saveEmpty));
    slot.appendChild(btn('x17-save-slot', TX.saveSlot, () => {
      try { const d = snapshotGame(); d.mapName = G.map.name; xslot[id] = JSON.parse(JSON.stringify(d)); try { Audio_.sfx.ui(); } catch (e) { /* ignore */ } msg(TX.saved, 'good', 2500); } catch (e) { console.warn('extras17: save failed', e); }
      renderXSave();
    }, true));
    p.appendChild(slot);
    const row = el('div', { class: 'btns' }); row.appendChild(btn('sv-back', TX.back, () => renderMenu(), true)); p.appendChild(row);
  }
  function renderXLoad() {
    const id = cur.id;
    const p = panel('x17load'); G.state = 'panel';
    p.appendChild(el('h2', null, TX.loadH));
    const x = btn('x', TX.close, () => { closeModal(); G.state = 'play'; }, true); x.classList.add('close'); p.appendChild(x);
    p.appendChild(tagEl());
    p.appendChild(el('p', { class: 'muted' }, TX.loadP));
    const err = el('p', { class: 'muted', id: 'ld-err' });
    const s = xslot[id], a = (typeof UPG === 'object' && UPG) ? UPG.autosaveSlot : null;
    const tryLoad = (d) => { try { restoreGame(JSON.parse(JSON.stringify(d))); banner(true); } catch (e) { err.textContent = (e && e.message) || TX.checkBad; } };
    if (s) { const slot = el('div', { class: 'slot' }); slot.appendChild(el('span', { class: 'meta' }, summary(s))); slot.appendChild(btn('x17-load-slot', TX.loadBtn, () => tryLoad(xslot[id]), true)); p.appendChild(slot); }
    if (a) { const slot = el('div', { class: 'slot' }); slot.appendChild(el('span', { class: 'meta' }, TX.autoLabel)); slot.appendChild(btn('x17-load-auto', TX.loadBtn, () => tryLoad(UPG.autosaveSlot), true)); p.appendChild(slot); }
    if (!s && !a) p.appendChild(el('p', { class: 'muted' }, TX.loadNone));
    const row = el('div', { class: 'btns' }); row.appendChild(btn('ld-back', TX.back, () => renderMenu(), true)); p.appendChild(row);
    p.appendChild(err);
  }
  // "An extra — after Book One · <title>" as separate text nodes, so each translates on its own
  function tagEl(id) {
    const t = el('div', id ? { class: 'x17-tag', id } : { class: 'x17-tag' });
    if (!cur.x.hidden) { t.appendChild(el('span', null, TX.banner)); t.appendChild(document.createTextNode(' · ')); }
    t.appendChild(el('span', null, titleOf(cur.x)));
    return t;
  }
  function summary(d) { try { return slotSummary(d); } catch (e) { return TX.saveH; } }

  // ------------------------------------------------------------------------------------------------ wrappers
  function wrapAll() {
    if (typeof renderSave === 'function') {
      const _f = renderSave;
      renderSave = function () { if (cur) { try { renderXSave(); } catch (e) { warnOnce('save', e); } return; } return _f.apply(this, arguments); };
    }
    if (typeof renderLoad === 'function') {
      const _f = renderLoad;
      renderLoad = function () { if (cur) { try { renderXLoad(); } catch (e) { warnOnce('load', e); } return; } return _f.apply(this, arguments); };
    }
    if (typeof renderMenu === 'function') {
      const _f = renderMenu;
      renderMenu = function () {
        const r = _f.apply(this, arguments);
        if (cur) {
          try {
            const t = document.getElementById('mn-title');
            if (t) { t.textContent = TX.leave; t.onclick = () => { quit(); }; }
            const hc = document.getElementById('mn-hardcore'); if (hc) hc.remove();
            const list = document.querySelector('#modal-panel .menu-list');
            if (list && !document.getElementById('x17-menu-tag')) list.parentNode.insertBefore(tagEl('x17-menu-tag'), list);
          } catch (e) { warnOnce('menu', e); }
        }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _f = restoreGame;
      restoreGame = function (d) {
        const f = d && typeof d === 'object' && d.flags && typeof d.flags === 'object' ? d.flags : null;
        if (cur) { if (!f || f.p17x_on !== 1 || f.p17x_x !== idCode(cur.id)) throw new Error(TX.refuseIn); }
        else if (f && f.p17x_on) throw new Error(TX.refuseOut);
        const r = _f.apply(this, arguments);
        if (!cur) { try { if (finishedFlags(G.flags)) markDone(true); } catch (e) { warnOnce('restoreMark', e); } }
        return r;
      };
    }
    if (typeof encodeSave === 'function') {
      // belt and braces: an extra's session never leaves as a code or a file (the panels never offer it either)
      const _f = encodeSave;
      encodeSave = async function (d) { if (cur || (d && d.flags && d.flags.p17x_on)) throw new Error(TX.refuseIn); return _f.apply(this, arguments); };
    }
    // the end of Book One ("Not yet", bookOneEnd1) unlocks the extras; the escape (ending(), end of Part Two) does not, and
    // finishedFlags() would refuse it anyway (function declarations in grove.js are globals: rebind it)
    const endHook = (orig) => function () {
      const r = orig.apply(this, arguments);
      try {
        if (!cur && finishedFlags(G.flags) && markDone(false)) {
          const box = document.getElementById('ending-text');
          if (box && !document.getElementById('x17-unlock-note')) box.appendChild(el('p', { class: 'muted', id: 'x17-unlock-note' }, TX.unlockedNow));
        }
      } catch (e) { warnOnce('end', e); }
      return r;
    };
    if (typeof bookOneEnd1 === 'function') bookOneEnd1 = endHook(bookOneEnd1);
    // death inside an extra: a way out besides waking by the lamp
    if (typeof die === 'function') {
      const _f = die;
      die = function () {
        const r = _f.apply(this, arguments);
        try {
          let b = document.getElementById('x17-death-leave');
          if (cur) {
            if (!b) { const host = document.querySelector('#death .death-inner'); if (host) { b = btn('x17-death-leave', TX.leaveDeath, () => { quit(); }); host.appendChild(b); } }
            if (b) b.hidden = false;
          } else if (b) b.hidden = true;
        } catch (e) { warnOnce('death', e); }
        return r;
      };
    }
  }

  // ================================================================================================ WINTER17
  const winter = {};
  const breathAdded = new Set();
  const set = { winter: st.w !== 0 };
  if (typeof GFX !== 'undefined') {
    if (GFX.winter17 === undefined) GFX.winter17 = true;
    if (GFX.FX && !GFX.FX.includes('winter17')) GFX.FX.push('winter17');
  }
  const on = () => set.winter && typeof GFX !== 'undefined' && GFX.winter17 !== false;
  function normOpts(o) {
    o = o && typeof o === 'object' ? o : {};
    const d = { snow: 0.6, fall: 0.3, breath: true, grade: 0.5 };
    return {
      snow: o.snow === undefined ? d.snow : clamp01(o.snow),
      fall: o.fall === undefined ? d.fall : clamp01(o.fall),
      breath: o.breath === undefined ? d.breath : !!o.breath,
      grade: o.grade === undefined ? d.grade : clamp01(o.grade),
    };
  }
  // air11 breathes on its own cold maps; a winter map with breath joins that set while winter shows on it (the GFX
  // flag and the Options switch included), and leaves it when cleared or switched off
  function syncBreath(mapId) {
    try {
      const A = typeof AIR11 !== 'undefined' && AIR11 && AIR11.breath && AIR11.breath.COLD_MAPS; if (!A) return;
      const w = winter[mapId];
      if (w && w.breath && on()) { if (!A.has(mapId)) { A.add(mapId); breathAdded.add(mapId); } }
      else if (breathAdded.has(mapId)) { A.delete(mapId); breathAdded.delete(mapId); }
    } catch (e) { warnOnce('breath', e); }
  }
  function breathHook(F) { if (F && F.map && (breathAdded.size || winter[F.map.id])) { for (const id of breathAdded) if (id !== F.map.id) syncBreath(id); syncBreath(F.map.id); } }
  function wApply(mapId, opts) {
    if (typeof mapId !== 'string' || !mapId) return null;
    winter[mapId] = normOpts(opts); syncBreath(mapId); return Object.assign({}, winter[mapId]);
  }
  function wClear(mapId) { if (Object.prototype.hasOwnProperty.call(winter, mapId)) { delete winter[mapId]; syncBreath(mapId); } }
  function wActive(mapId) { const w = winter[mapId]; return w ? Object.assign({}, w) : null; }
  function WINTER17_clearAll() { for (const k of Object.keys(winter)) wClear(k); }

  // a 256x256 world-space noise field, histogram-flattened so that coverage = snow exactly. Own seeded stream:
  // never Math.random (combat and test RNG stay untouched). Built once.
  const NZ = 256, NOISE = new Uint8Array(NZ * NZ);
  (function buildNoise() {
    let s = 0x5170117 >>> 0;
    const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const f = new Float32Array(NZ * NZ);
    for (const [cell, amp] of [[32, 1], [16, 0.55], [8, 0.3], [4, 0.14]]) {
      const n = NZ / cell, g = new Float32Array((n + 1) * (n + 1));
      for (let i = 0; i < g.length; i++) g[i] = r();
      for (let i = 0; i <= n; i++) { g[n * (n + 1) + i] = g[i]; g[i * (n + 1) + n] = g[i * (n + 1)]; }   // tile
      for (let y = 0; y < NZ; y++) for (let x = 0; x < NZ; x++) {
        const gx = x / cell, gy = y / cell, x0 = gx | 0, y0 = gy | 0, tx = gx - x0, ty = gy - y0;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = g[y0 * (n + 1) + x0], b = g[y0 * (n + 1) + x0 + 1], c = g[(y0 + 1) * (n + 1) + x0], d = g[(y0 + 1) * (n + 1) + x0 + 1];
        f[y * NZ + x] += amp * ((a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy);
      }
    }
    const idx = new Uint32Array(NZ * NZ); for (let i = 0; i < idx.length; i++) idx[i] = i;
    idx.sort((a, b) => f[a] - f[b]);
    for (let k = 0; k < idx.length; k++) NOISE[idx[k]] = (k * 256 / idx.length) | 0;
  })();
  const NSCALE = 10;   // noise texels per map unit: patches of a few feet, crisp at pixel-art resolution
  const nAt = (wx, wy) => NOISE[(((wy * NSCALE) | 0) & 255) * NZ + (((wx * NSCALE) | 0) & 255)];

  const stats = { ground: 0, roof: 0, flakes: 0, graded: 0, ms: 0, calls: 0 };
  let profile = false;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const ckCache = { w: 0, k: null };
  function colK(w) { if (ckCache.w !== w) { ckCache.w = w; ckCache.k = new Float32Array(w); for (let x = 0; x < w; x++) ckCache.k[x] = 2 * x / w - 1; } return ckCache.k; }
  const c8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
  function wfor(F) { if (!on() || !F || !F.map || !F.fb) return null; return winter[F.map.id] || null; }
  // snow lit by what it covers: the covered pixel's brightness says how much light falls there; its hue (a lamp,
  // the fog) is kept a little so snow by a lantern is warm and snow in the far haze is the haze's colour.
  // Integer maths and tables: this runs on every ground pixel.
  const SNOW_R = new Int16Array(256), SNOW_G = new Int16Array(256), SNOW_B = new Int16Array(256);
  for (let L = 0; L < 256; L++) { const k = Math.min(1, (L * 2.1 + 12) / 236); SNOW_R[L] = 204 * k; SNOW_G[L] = 211 * k; SNOW_B[L] = 226 * k + 8 * (1 - k); }
  function snowPx(p, aI) {     // aI: 0..256
    const pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255;
    const L = (pr * 77 + pg * 150 + pb * 29) >> 8;
    let tr = SNOW_R[L] + (((pr - L) * 77) >> 8), tg = SNOW_G[L] + (((pg - L) * 77) >> 8), tb = SNOW_B[L] + (((pb - L) * 77) >> 8);
    let r = pr + (((tr - pr) * aI) >> 8), g = pg + (((tg - pg) * aI) >> 8), b = pb + (((tb - pb) * aI) >> 8);
    if (r > 255) r = 255; else if (r < 0) r = 0; if (g > 255) g = 255; else if (g < 0) g = 0; if (b > 255) b = 255; else if (b < 0) b = 0;
    return (p & 0xff000000) | (b << 16) | (g << 8) | r;
  }
  function groundHook(F) {
    const W = wfor(F); if (!W || !F.outdoor || W.snow <= 0.001 || !F.dbuf || !F.mbuf) return;
    const t0 = profile ? now() : 0;
    const w = F.w, h = F.h, fb = F.fb, dbuf = F.dbuf, mbuf = F.mbuf, bias = F.surfBias == null ? 0.45 : F.surfBias;
    const camx = F.cam.x, camy = F.cam.y, dX = F.dirX, dY = F.dirY, pX = F.planeX, pY = F.planeY;
    const thr = ((1 - W.snow) * 255) | 0, soft = 26, invFog = 0.45 / Math.max(4, F.fogDist || 8), NS = NSCALE, kx = 2 / w;
    const y0 = F.relief ? 0 : Math.max(0, (F.horizon | 0) - 1);
    let n = 0, tPrev = -1, ax = 0, bx = 0, ay = 0, by = 0, fadeI = 0, farI = 0, evenI = 0;
    const S = F.S || 1, FAR0 = 5 * S, FAR1 = 11 * S, even = 0.25 + 0.65 * W.snow;
    for (let y = y0; y < h; y++) {
      let o = y * w;
      for (let x = 0; x < w; x++, o++) {
        if (mbuf[o] !== 5) continue;
        const d = dbuf[o];
        if (d !== tPrev) {     // a flat floor row shares one depth: the world position is then linear in x
          tPrev = d; const t = d - bias; if (!(t > 0)) { fadeI = -1; continue; }
          ax = (camx + t * (dX - pX)) * NS; bx = t * pX * kx * NS; ay = (camy + t * (dY - pY)) * NS; by = t * pY * kx * NS;
          const f = t * invFog; fadeI = ((0.92 * (1 - (f > 0.45 ? 0.45 : f))) * 256) | 0;
          // far off, the patches shrink below a pixel and would alias into streaks: there the snow becomes an even
          // dusting of the same overall cover
          const m = (t - FAR0) / (FAR1 - FAR0); farI = m <= 0 ? 0 : m >= 1 ? 256 : (m * 256) | 0; evenI = (fadeI * even) | 0;
        }
        if (fadeI < 0) continue;
        let aI;
        if (farI >= 256) aI = evenI;
        else {
          const nv = NOISE[(((ay + by * x) | 0) & 255) * NZ + (((ax + bx * x) | 0) & 255)];
          const nI = nv < thr - soft ? 0 : nv >= thr + soft ? fadeI : ((nv - thr + soft) * fadeI / (2 * soft)) | 0;
          aI = farI ? ((nI * (256 - farI) + evenI * farI) >> 8) : nI;
        }
        if (aI <= 2) continue;
        fb[o] = snowPx(fb[o], aI);
        n++;
      }
    }
    stats.ground = n;
    if (profile) { stats.ms += now() - t0; }
  }
  function roofHook(F) {
    const W = wfor(F); if (!W || !F.outdoor || W.snow <= 0.001 || !F.dbuf || !F.mbuf) return;
    const t0 = profile ? now() : 0;
    const w = F.w, h = F.h, fb = F.fb, dbuf = F.dbuf, mbuf = F.mbuf;
    const camx = F.cam.x, camy = F.cam.y, dX = F.dirX, dY = F.dirY, pX = F.planeX, pY = F.planeY, ck = colK(w);
    const capK = 0.045 + 0.075 * W.snow;
    let n = 0;
    for (let x = 0; x < w; x++) {
      for (let y = 1; y < h; y++) {
        const o = y * w + x;
        if (mbuf[o] !== 4) continue;
        const up = o - w, d = dbuf[o], mu = mbuf[up];
        // the top of a wall face that meets the sky, or something farther away (not a sprite or wall in front)
        if (mu === 4 ? !(dbuf[up] > d + 0.6) : (mu !== 1 && mu !== 0 && !(dbuf[up] > d + 0.6))) continue;
        const cx = ck[x], wx = camx + d * (dX + pX * cx), wy = camy + d * (dY + pY * cx);
        const nv = nAt(wx * 2.3, wy * 2.3);
        if (nv < (1 - W.snow) * 140) continue;                              // bare stretches where the wind took it
        const px = h / Math.max(0.2, d);                                    // the wall's height on screen
        const drip = 0.55 + 0.9 * (nAt(wx * 6.7 + 31, wy * 6.7 + 11) / 255);
        const rows = Math.max(1, Math.round(px * capK * drip));
        const fade = 1 - Math.min(1, d / Math.max(4, F.fogDist || 8)) * 0.5;
        for (let k = 0, oo = o; k < rows && y + k < h; k++, oo += w) {
          if (mbuf[oo] !== 4) break;
          const a = (k === rows - 1 && rows > 1 ? 0.6 : 0.95) * fade;
          fb[oo] = snowPx(fb[oo], (a * (1 - k / (rows + 1) * 0.3) * 256) | 0);
          n++;
        }
        y += rows;
      }
    }
    stats.roof = n;
    if (profile) { stats.ms += now() - t0; }
  }
  // falling snow, placed on a cylinder around the camera so turning sweeps it past and walls hide what is behind them
  const FL_MAX = 1400, flakes = [];
  (function buildFlakes() {
    let s = 0x5170118 >>> 0;
    const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < FL_MAX; i++) flakes.push({ a: r() * Math.PI * 2, v: r(), d: 0.9 + 7 * r() * r(), sp: 0.10 + 0.06 * r(), ph: r() * 6.283, sw: 0.5 + r() });
  })();
  function flakeHook(F) {
    stats.flakes = 0;
    const W = wfor(F); if (!W || !F.outdoor || W.fall <= 0.001 || typeof GFX === 'undefined' || GFX.reduceMotion) return;
    const mult = Number.isFinite(+GFX.particles) ? Math.max(0, +GFX.particles) : 1;
    const N = Math.min(FL_MAX, Math.round(W.fall * 640 * mult)); if (N <= 0) return;
    const t0 = profile ? now() : 0;
    const w = F.w, h = F.h, S = F.S || 1, fb = F.fb, dbuf = F.dbuf, T = (F.animT || 0);
    const camDir = Math.atan2(F.dirY, F.dirX), half = Math.atan(Math.hypot(F.planeX, F.planeY)) + 0.05;
    const day = F.skyDay == null ? 1 : F.skyDay;
    const lum = 0.42 + 0.58 * Math.max(0, Math.min(1, day));
    const cr = 232 * lum, cg = 238 * lum, cb = 250 * lum;
    let n = 0;
    for (let i = 0; i < N; i++) {
      const f = flakes[i];
      let da = f.a + T * 0.012 / f.d - camDir; da -= Math.round(da / 6.2831853) * 6.2831853;
      if (da < -half || da > half) continue;
      const sxN = Math.tan(da) / Math.tan(half - 0.05);                  // -1..1 across the view
      const sway = Math.sin(T * f.sw + f.ph) * 3 * S / f.d;
      const x = Math.round((sxN + 1) * 0.5 * w + sway);
      const fallY = (f.v + T * f.sp * (1.6 / Math.sqrt(f.d))) % 1;
      const y = Math.round((fallY * 1.15 - 0.075) * h);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const sz = (f.d < 2.2 ? 2 : 1) * S, a = Math.min(0.85, 0.5 + 0.5 / f.d);
      for (let yy = 0; yy < sz && y + yy < h; yy++) for (let xx = 0; xx < sz && x + xx < w; xx++) {
        const o = (y + yy) * w + x + xx; if (dbuf[o] < f.d) continue;
        const p = fb[o], pr = p & 255, pg = (p >> 8) & 255, pb = (p >> 16) & 255;
        fb[o] = (p & 0xff000000) | (c8(pb + a * (cb - pb)) << 16) | (c8(pg + a * (cg - pg)) << 8) | c8(pr + a * (cr - pr));
      }
      n++;
    }
    stats.flakes = n;
    if (profile) { stats.ms += now() - t0; }
  }
  function gradeHook(F) {
    const W = wfor(F); if (!W || W.grade <= 0.001) return;
    const t0 = profile ? now() : 0;
    const g = W.grade, dsI = (0.26 * g * 256) | 0, rkI = ((1 - 0.06 * g) * 256) | 0, blI = (0.07 * g * 256) | 0, bkI = (6 * g * 256 / 255) | 0;
    const fb = F.fb, N = F.w * F.h;
    for (let o = 0; o < N; o++) {
      const p = fb[o], r = p & 255, gg = (p >> 8) & 255, b = (p >> 16) & 255;
      const L = (r * 77 + gg * 150 + b * 29) >> 8;
      const nr = (((r << 8) + (L - r) * dsI) * rkI) >> 16, ng = ((gg << 8) + (L - gg) * dsI) >> 8;
      let nb = (((b << 8) + (L - b) * dsI) >> 8) + ((((255 - b) * L) >> 8) * blI >> 8) + ((L * bkI) >> 8); if (nb > 255) nb = 255;
      fb[o] = (p & 0xff000000) | (nb << 16) | (ng << 8) | nr;
    }
    stats.graded = N;
    if (profile) { stats.ms += now() - t0; }
  }
  function hooks() {
    if (typeof Engine === 'undefined' || !Engine.addPostHook) return;
    Engine.addPostHook((F) => { try { breathHook(F); } catch (e) { warnOnce('breathsync', e); } }, -60);   // before air11's clock (-50) and breath (38)
    Engine.addPostHook((F) => { try { groundHook(F); } catch (e) { warnOnce('ground', e); } }, 6);   // after greening (5), before soft fog (10)
    Engine.addPostHook((F) => { try { roofHook(F); } catch (e) { warnOnce('roof', e); } }, 7);
    Engine.addPostHook((F) => { try { flakeHook(F); } catch (e) { warnOnce('flakes', e); } }, 39);  // after bloom (30) and air11 breath (38)
    Engine.addPostHook((F) => { try { gradeHook(F); } catch (e) { warnOnce('grade', e); } }, 42);   // after post.js grade (40), before cinema14 (95)
  }

  // ------------------------------------------------------------------------------------------------ Options row
  function setWinter(v) { set.winter = !!v; st.w = set.winter ? 1 : 0; save(); for (const id of Object.keys(winter)) syncBreath(id); }
  function optionsRow() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('x17-opt-winter')) return;
    const lab = el('span', { class: 'gfx-label', id: 'x17-opt-winter-label' }, TX.optLabel + ' ');
    lab.appendChild(el('small', { class: 'muted' }, TX.optHint));
    const b = el('button', { class: 'dfbtn small', id: 'x17-opt-winter', type: 'button', 'aria-label': TX.optLabel }, set.winter ? TX.on : TX.off);
    b.onclick = () => { setWinter(!set.winter); b.textContent = set.winter ? TX.on : TX.off; };
    const anchor = document.getElementById('sk14-opt-aurora') || null;
    if (anchor && anchor.parentNode === grid) { anchor.insertAdjacentElement('afterend', lab); lab.insertAdjacentElement('afterend', b); }   // label, button pairs: right after the Octave lights row
    else { grid.appendChild(lab); grid.appendChild(b); }
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { optionsRow(); } catch (e) { warnOnce('options', e); } return r; };
  }

  // ------------------------------------------------------------------------------------------------ boot
  function boot() {
    injectStyle(); titleButton(); banner(false);
    try { wrapAll(); } catch (e) { warnOnce('wrap', e); }
    try { wireOptions(); } catch (e) { warnOnce('wireOptions', e); }
    hooks();
  }
  if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.WINTER17 = {
    apply: wApply, clear: wClear, active: wActive,
    // not in the contract: for tests and the Options row
    clearAll: WINTER17_clearAll, on, settings: set, setWinter, stats,
    profile(v) { profile = !!v; stats.ms = 0; stats.calls = 0; }, maps: () => Object.keys(winter),
    hooks: { ground: groundHook, roof: roofHook, flakes: flakeHook, grade: gradeHook },
  };
  window.EXTRAS17 = {
    register, list: () => reg.slice(), inExtra, finish,
    // not in the contract: the menu and tests use them
    start, quit, resume, open: openExtras, render: renderExtras, opened, playable: (id) => { const x = byId(id); return !!(x && playable(x)); },
    state: st, TX, TEXTS, BANNER: TX.banner, idCode, checkCode,
    hasSave: (id) => !!xslot[id],
    _load() { load(); },
    _reset() { st.ack = 0; st.done = 0; st.res = {}; st.run = null; st.cut = null; save(); },
  };
})();
