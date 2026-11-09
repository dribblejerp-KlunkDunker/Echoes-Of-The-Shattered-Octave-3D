// ============================================================
//  pumps58 — The eight men at the pumps (Book One ch. 10, ch. 13, ch. 19 ll. 5240–5276, ch. 24 l. 6355; ROADMAP R9 item 19).
//
//  At the Rite (js/rite43.js) eight men are left hooked to the pumps: Edders, Ruhl, Caine, Ott, Sennet, Vey, Marrow,
//  Hale B. On the Kestrel's beam (js/ash50.js) Kaelen cuts "8 men at the pumps — no names. FIND THEM."
//    * THE CLUE IS THE VILLAIN'S. In the Malting's archive, the Tuning Room under the clerks' hall, the first time you come
//      down the steps the Arbiter speaks: through your own arm if you are glassed, through Kaelen's otherwise. "The eight
//      men at the pumps. Whisper-Grove stock, consigned to Oakhaven in the ninth month of 417, which means they will be in
//      the carriage file in the box behind your left shoulder, third shelf, grey spine. I told you. I keep a list too."
//    * THE GREY SPINE. A box on the third shelf. The carriage file, the manifest, and eight names. Tear the page out. Every
//      one goes into your ledger; [PROPOSED] a man you named at the pumps has a pencil tick beside him. Kaelen thinks for a
//      long time afterward about how easy it was.
//  The box is transient. Flags: p58 (1 the voice heard, 2 the page torn out).
// ============================================================
'use strict';

const PUMPS58 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('pumps58: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };

  const MAP = 'malting', ROOM_Y = 15.6, BOX = { x: 18.45, y: 18.25 };
  const NAMES = ['Edders', 'Ruhl', 'Caine', 'Ott', 'Sennet', 'Vey', 'Marrow', 'Hale B.'];
  const stage = () => (hasG() ? Number(F().p58) | 0 : 0);

  const TX = {
    leave: S('Leave it.'),
    voiceTitle: S('The Tuning Room'),
    voiceGlass: S('Halfway down the archive steps your arm goes cold to the shoulder, and a voice speaks in it, very gently, the way a man speaks who has never once needed to raise it.'),
    voiceKaelen: S('Halfway down the archive steps Kaelen stops with his glass hand flat on the wall, and goes grey, and you understand that something is speaking to him through it. When it is over he tells you what it said, word for word, in a voice that is not quite his.'),
    voice: S('"And the eight men at the pumps. Whisper-Grove stock, consigned to Oakhaven in the ninth month of 417, which means they will be in the carriage file in the box behind your left shoulder, third shelf, grey spine." A pause. "I told you. I keep a list too."<br><br>The glass goes quiet.'),
    box: S('A grey-spined box, third shelf'),
    boxLook: S('Carriage files, 417. A grey spine, on the third shelf, where he said.'),
    pageTitle: S('The carriage file'),
    page: S('The carriage file, and the manifest, and on the manifest, in a clerk\'s hand: <i>Stage Nine, Oakhaven. Pump crew, eight, carried from Whisper-Grove stock.</i><br><br><b>Edders. Ruhl. Caine. Ott. Sennet. Vey. Marrow. Hale, B. (no relation).</b>'),
    ticks: S('Beside {0} there is a pencil tick, small and new, in no hand you know: the ones whose names were said aloud at the pumps.'),
    tear: S('Tear the page out'),
    torn: S('You tear the page out and put it inside your shirt. It was very easy. Kaelen, when he sees it, says nothing for a long time, and then: "I wrote them down. That is all it took. Somebody told me where, and I did what I was told."'),
    jVoice: S('In the Malting\'s archive the Arbiter told us where to find the eight men at the pumps: third shelf, grey spine. "I keep a list too."'),
    jPage: S('The eight men at the pumps: Edders, Ruhl, Caine, Ott, Sennet, Vey, Marrow, Hale B. (no relation). I tore the page out of the Office\'s carriage file. They are in my ledger now.'),
    ledgerWhere: S('the pumps, at the Rite'),
  };

  // a box file with a grey spine, on its end (its own sprite: the epilogue's books count every 'shelf' in the Malting)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites.p58_box)) return;
    const w = 12, h = 18, d = new Uint32Array(w * h);
    const px = (x, y, r, g, b) => { d[y * w + x] = (255 << 24) | (b << 16) | (g << 8) | r; };
    for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) {
      const edge = x === 1 || x === w - 2 || y === 1 || y === h - 1, n = (x * 5 + y * 3) % 4;
      if (edge) px(x, y, 52, 50, 48);
      else if (y === 5 || y === 6) px(x, y, 196, 186, 150);                 // the paper label
      else px(x, y, 118 + n * 4, 116 + n * 4, 112 + n * 4);              // grey cloth
    }
    Engine.addSprite('p58_box', { w, h, data: d, hs: 0.42, cx: 0.5, dy: 0 });
  }
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p58 === k);
  function stageBox(m) {
    if (!m || m.id !== MAP) return;
    const have = keyed(m, 'box');
    if (stage() >= 2) { if (have) m.entities.splice(m.entities.indexOf(have), 1); return; }
    if (!have) m.entities.push({ kind: 'deco', sprite: 'p58_box', x: BOX.x, y: BOX.y, scale: 0.9, radius: 0.15, solid: false, use: 'p58_box', label: TX.box, transient: true, _decor: true, _p58: 'box' });
  }
  function voice() {
    const f = F(); if (stage() !== 0) return;
    f.p58 = 1;
    try { journal('main', TX.jVoice); } catch (e) { /* none */ }
    showEvent(TX.voiceTitle, (G.player.glassed ? TX.voiceGlass : TX.voiceKaelen) + '<br><br>' + TX.voice, [{ t: TX.leave, f: null }]);
  }
  function page() {
    const f = F(); if (stage() >= 2) return;
    const said = (f.r43_named || []).filter((n) => NAMES.includes(n));
    const body = TX.page + (said.length ? '<br><br>' + TX.ticks.replace('{0}', said.join(', ')) : '');
    showEvent(TX.pageTitle, body, [{ t: TX.tear, f: () => {
      f.p58 = 2;
      for (const n of NAMES) if (!(G.ledger || []).some((r) => r && r.name === n)) G.ledger.push({ name: n, where: TX.ledgerWhere, day: G.day });
      try { journal('main', TX.jPage); questXp(25); } catch (e) { /* none */ }
      stageBox(G.map);
      showEvent(TX.pageTitle, TX.torn, [{ t: TX.leave, f: null }]);
    } }, { t: TX.leave, f: null }]);
  }
  function tick() {
    if (!hasG() || G.state !== 'play' || guest() || G.mapId !== MAP || stage() !== 0) return;
    try { if (typeof Engine !== 'undefined' && Engine.cam && Engine.cam.y > ROOM_Y && Engine.cam.x > 10 && Engine.cam.x < 20) voice(); /* the Tuning Room, not the press room beside it */ } catch (e) { warnOnce('tick', e); }
  }
  function wire() {
    paint();
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (e && e._p58 === 'box') { if (stage() >= 1) page(); else showEvent(TX.box, TX.boxLook, [{ t: TX.leave, f: null }]); return undefined; } } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { if (hasG()) stageBox(G.map); } catch (e) { warnOnce('load', e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('pumps58 failed to wire', e); }

  return { TX, TEXTS, NAMES, BOX, stage, voice, page, stageBox };
})();
if (typeof window !== 'undefined') window.PUMPS58 = PUMPS58;
