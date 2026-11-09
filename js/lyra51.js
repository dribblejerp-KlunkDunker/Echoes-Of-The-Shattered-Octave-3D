// ============================================================
//  lyra51 — The forty-one nights (Book One ch. 1 and ch. 3; ROADMAP R9 item 7): the canon spine of Lyra's own quest.
//
//  By the owner's ruling that the game's days match the book (js/days35.js: game day 0 is Nullday, the Madder birth),
//  the forty-first night is the dead hour after it (game day 1, before 05:00), and the forty-second, when she does not go
//  and the Hedge hums Kaelen's note to her instead, is the dead hour after Rootday (game day 2).
//    * THE STONE: behind the old cooperage, where the thorn is thinner, a stretch of rotted wadding with no crossing and
//      no night-hummer near it, and a flat stone at its foot, worn smooth (ch. 1). There by day for anyone who looks.
//    * THE FORTY-FIRST NIGHT: be near it at the dead hour, and Lyra is on the stone with her back to the thorn. "Hello,
//      Da." "Boy or girl?" It asks about Pim Carder's hands. You are close enough to hear, and not to interrupt without
//      being heard by both of them. Then, what you do about it:
//        - KEEP IT (canon): go, quietly.
//        - TELL KAELEN [PROPOSED]: the next time you speak to him. It changes lines only: he goes to her door that night
//          and hums at the latch, which in the book he does anyway.
//        - ANSWER IT YOURSELF [PROPOSED]: it learns you (the game's own hedge_answered, which other scenes already read).
//      (A fourth way in the Story Brainstorm, sitting with her so that she never goes back, breaks from the book. It is
//      left for the owner's ruling and not built.)
//    * THE FORTY-SECOND NIGHT: she does not come. If you are at the stone at the dead hour, the Hedge hums the Root note
//      with a ring of glass threaded through it: Kaelen's hum, which she heard at her door three hours before. It is not
//      waiting for her. It is practising.
//  Missing either night changes nothing but what you know. Staged figures are transient. Flags: p51 (0 unseen,
//  1 seen and choosing, 2 kept, 3 told Kaelen, 4 answered, 9 missed), p51_k (Kaelen told), p51_42 (the hum heard).
// ============================================================
'use strict';

const LYRA51 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('lyra51: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return false; };
  const PI = Math.PI;

  const OAK = 'oakhaven';
  const STONE = { x: 67.25, y: 40.5 }, WADDING = { x: 67.92, y: 40.5 }, LYRA = { x: 67.35, y: 40.5 };
  const NEAR = 6.5, DEAD = 5;
  const NIGHT41 = 1, NIGHT42 = 2;
  const stage = () => { const v = Number(hasG() ? F().p51 : 0); return Number.isFinite(v) ? Math.max(0, Math.min(9, Math.floor(v))) : 0; };
  const deadHour = (day) => hasG() && (Number(G.day) || 0) === day && hour() < DEAD;
  const near = () => hasG() && G.mapId === OAK && typeof Engine !== 'undefined' && Engine.cam && Math.hypot(Engine.cam.x - STONE.x, Engine.cam.y - STONE.y) < NEAR;

  const TX = {
    leave: S('Leave it.'),
    stone: S('A flat stone at the foot of the Hedge'),
    stoneDay: S('Behind the old cooperage the thorn is thinner. A wet spring rotted some of the wadding here, and nobody has got round to replacing it. There is no crossing near it and no night-hummer. At its foot there is a flat stone, worn smooth, where a person could sit with her back to the thorn.'),
    stoneKnown: S('The flat stone behind the cooperage, worn smooth. You know who sits here, and what answers her.'),
    wadding: S('Rotted wadding in the Hedge'),
    waddingLook: S('Wool wadding packed into the thorn, gone black and soft with the wet. You can see through it in places. You do not put your face to it.'),
    // the forty-first night
    title41: S('Behind the cooperage, at the dead hour'),
    night41: S('Lyra is sitting on the flat stone with her shawl pulled tight and her knees drawn up, her back to the thorn. She does not see you at the corner of the cooperage wall. She does not have to wait long.<br><br>"<i>There\'s my lark.</i>" Just the other side of the thorn, a hand\'s width away, a hand\'s width of voice. Warm, and a little hoarse.<br><br>"Hello, Da," Lyra whispers.<br><br>"<i>You\'re out late.</i>" "I couldn\'t sleep." "<i>You never could, after a birth. Your mother was the same.</i>" A soft sound, like a laugh through the nose. "<i>Boy or girl?</i>"<br><br>"Girl. Ruth Madder\'s. She came out quiet, but I brought her round."<br><br>"<i>Course you did. And the Carder boy? His hands? You said you\'d try the falling fifth.</i>"<br><br>Lyra opens her eyes. She looks at the dark, and at the thorn, and at her own hands in her lap. Her father never heard of Pim Carder\'s hands. Her father has been dead two years.<br><br>"It worked," she whispers. "A little. The roots went back a half-step."<br><br>You are close enough to hear every word, and not close enough to say anything without being heard by both of them.'),
    keep: S('Go, quietly'),
    tell: S('Go, and tell Kaelen in the morning'),
    answer: S('Answer it yourself'),
    kept: S('You go back the way you came, on the soft side of the lane. Behind you she is still talking, very low, telling it about her day.'),
    toldLater: S('You go. In the morning you will tell Kaelen where she goes at the dead hour.'),
    answered: S('"I\'m here," you say, from the corner of the wall.<br><br>The voice behind the thorn stops. Lyra\'s head comes round, and her face, when she sees you, is the face of somebody caught at something worse than theft. Then the Hedge says, gently, in your voice, "<i>I\'m here.</i>" And again, a little further along the thorn. "<i>I\'m here.</i>"<br><br>Lyra gets up off the stone and goes past you without a word.'),
    // telling Kaelen
    kaelenTold: S('He listens without looking at you, turning a scrap of charcoal over in his glass fingers. "Behind the cooperage," he says. "At the dead hour." A long breath. "Every night?" He does not wait for an answer. "I\'ll go to her door tonight. Before the Hour. I won\'t say why."'),
    // the forty-second night
    title42: S('Behind the cooperage, the next night'),
    night42: S('The stone is empty. She has not come.<br><br>From the thorn, very faint, under the whistling of every lamp in Oakhaven, there is a low hum: the Root note, perfectly held, and threaded through the heart of it, thin and bright and cold, the ring of glass. It does not call her name. It does not use her father\'s voice. It only hums, low and patient, the way you would hum to a child pretending to be asleep, over and over.<br><br>It has not been waiting for her. It has been practising.'),
    night42Told: S('Kaelen went to her door before the Hour tonight, because you told him, and hummed at the latch. She heard the note then. She is hearing it now, a street and a half away, lying still in the loft. She does not come.'),
    // logbook
    j41: S('The forty-one nights: behind the old cooperage, where the wadding has rotted, Lyra sits on a flat stone at the dead hour and talks to the Hedge in her father\'s voice. It asked her about Pim Carder\'s hands. She told it.'),
    jKept: S('I said nothing about the stone behind the cooperage. It is hers to tell.'),
    jTold: S('I told Kaelen where Lyra goes at the dead hour. He is going to her door tonight.'),
    jAnswered: S('I answered the voice behind the cooperage myself. It said "I\'m here" back to me, in my own voice. Lyra went past me without a word.'),
    j42: S('The forty-second night: Lyra did not go to the stone. The Hedge hummed Kaelen\'s note there instead, with the glass in it. It was not waiting for her. It was practising.'),
  };

  // ================================================================ art
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, w, h, hs, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px, w, h); Engine.addSprite(name, { w, h, data: d, hs, cx: 0.5, dy: 0 });
    };
    mk('p51_stone', 24, 8, 0.24, (px) => {   // a flat stone, worn smooth
      for (let y = 2; y < 8; y++) for (let x = 2; x < 22; x++) { if ((x - 12) * (x - 12) / 110 + (y - 5) * (y - 5) / 10 > 1) continue; const n = ((x * 5 + y * 3) % 7) * 3; px(x, y, (y < 4 ? 162 : 128) + n, (y < 4 ? 158 : 124) + n, (y < 4 ? 146 : 114) + n); }
    });
    mk('p51_wadding', 20, 28, 0.9, (px) => {   // rotted black wool packed into the thorn, with holes
      for (let y = 2; y < 28; y++) for (let x = 2; x < 18; x++) { const n = ((x * 7 + y * 11) % 13); if (n < 2) continue; px(x, y, 30 + n * 2, 28 + n * 2, 24 + n); }
    });
  }

  // ================================================================ staging (all transient)
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p51 === k);
  function put(m, k, e) { const have = keyed(m, k); if (have) return have; Object.assign(e, { transient: true, _decor: true, _p51: k }); m.entities.push(e); return e; }
  function drop(m, k) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p51 === k) m.entities.splice(i, 1); }
  function stage0(m) {
    if (!m || m.id !== OAK || m.w !== 70 || m.h !== 64) return;
    put(m, 'stone', { kind: 'deco', sprite: 'p51_stone', x: STONE.x, y: STONE.y, solid: false, radius: 0.3, scale: 0.9, label: TX.stone, use: 'p51_stone' });
    put(m, 'wadding', { kind: 'deco', sprite: 'p51_wadding', x: WADDING.x, y: WADDING.y, solid: false, radius: 0.1, scale: 0.8, label: TX.wadding, use: 'p51_look', look: TX.waddingLook });
    const sitting = deadHour(NIGHT41) && stage() <= 1;
    if (sitting) put(m, 'lyra', { kind: 'deco', sprite: 'lyra', x: LYRA.x, y: LYRA.y, solid: true, radius: 0.28, scale: 0.86, facing: PI, label: TX.stone, use: 'p51_stone' });
    else drop(m, 'lyra');
  }

  // ================================================================ the nights
  function night41() {
    const f = F(); if (stage() !== 0) return;
    f.p51 = 1;
    try { journal('side', TX.j41); } catch (e) { /* none */ }
    showEvent(TX.title41, TX.night41, [
      { t: TX.keep, f: () => choose(2) },
      { t: TX.tell, f: () => choose(3) },
      { t: TX.answer, f: () => choose(4) },
    ]);
  }
  function choose(n) {
    const f = F(); if (stage() !== 1) return;
    f.p51 = n;
    if (n === 2) { say(TX.kept, '', 6000); try { journal('side', TX.jKept); } catch (e) { /* none */ } }
    if (n === 3) { say(TX.toldLater, '', 5000); }
    if (n === 4) {
      f.hedge_answered = true;
      try { addNoise(5); } catch (e) { /* none */ }
      try { journal('side', TX.jAnswered); } catch (e) { /* none */ }
      showEvent(TX.title41, TX.answered, [{ t: TX.leave, f: null }]);
    }
    try { questXp(20); } catch (e) { /* none */ }
    drop(G.map, 'lyra');
  }
  function night42() {
    const f = F(); if (f.p51_42) return;
    f.p51_42 = 1;
    try { journal('side', TX.j42); } catch (e) { /* none */ }
    showEvent(TX.title42, TX.night42 + (f.p51_k ? '<br><br>' + TX.night42Told : ''), [{ t: TX.leave, f: null }]);
  }
  function missed() {
    if (stage() !== 0) return;
    const d = Number(G.day) || 0;
    if (d > NIGHT41 || (d === NIGHT41 && hour() >= DEAD)) F().p51 = 9;
  }
  // Kaelen hears it from you, once, the next time you speak with him (after the forty-first night, before the Greening)
  const kaelenReady = (f) => Number(f.p51) === 3 && !f.p51_k && !f.greening && !f.escaped;

  // ================================================================ uses, tick, wiring
  function useOwn(e) {
    if (!e || !e._p51) return false;
    if (e.use === 'p51_look') { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true; }
    if (e.use === 'p51_stone') {
      if (deadHour(NIGHT41) && stage() === 0) { night41(); return true; }
      showEvent(TX.stone, stage() >= 1 && stage() <= 4 ? TX.stoneKnown : TX.stoneDay, [{ t: TX.leave, f: null }]);
      return true;
    }
    return false;
  }
  function tick() {
    if (!hasG() || G.state !== 'play' || guest() || inExtra()) return;
    try {
      if (G.mapId === OAK) {
        if (deadHour(NIGHT41) && stage() === 0) { stage0(G.map); if (near()) { night41(); return; } }
        else if (keyed(G.map, 'lyra') && !(deadHour(NIGHT41) && stage() <= 1)) drop(G.map, 'lyra');
        if (deadHour(NIGHT42) && !F().p51_42 && near()) { night42(); return; }
      }
      missed();
    } catch (e) { warnOnce('tick', e); }
  }
  function wire() {
    paint();
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const n = e && e.id === 'kaelen' && typeof NPCS !== 'undefined' ? NPCS.kaelen : null;
        if (!n || !hasG() || guest() || !kaelenReady(F())) return _t.apply(this, arguments);
        const own = n.quest;
        n.quest = function (g) { if (kaelenReady(g.flags)) { g.flags.p51_k = true; try { journal('side', TX.jTold); } catch (err) { /* none */ } return { text: TX.kaelenTold }; } return own ? own.apply(this, arguments) : null; };
        try { return _t.apply(this, arguments); } finally { n.quest = own; }
      };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { if (hasG()) stage0(G.map); } catch (e) { warnOnce('load', e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('lyra51 failed to wire', e); }

  return { TX, TEXTS, STONE, NIGHT41, NIGHT42, stage, near, deadHour, night41, night42, choose, kaelenReady, stage0, missed };
})();
if (typeof window !== 'undefined') window.LYRA51 = LYRA51;
