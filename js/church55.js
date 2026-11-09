// ============================================================
//  church55 — The Church comes up the road, played (Book One ch. 7, ll. 2259–2373; ROADMAP R9 item 13).
//
//  js/days35.js brings the Church up the Greenroot road at sunrise on Dawnday (game day 5, 06:00) with a message. If you
//  are in Oakhaven at that hour, you are there for it instead:
//    * THE GATE. Old Harrow and half the north side in the gatehouse and along the inner bank of the Hedge, hands over
//      their mouths. Go to the gatehouse (canon: Kaelen watches from the North Gate) or watch from where you stand.
//    * THE COLUMN comes in through the North Gate and down the main road to the square: the Inquisitor alone at the head
//      with the brass censer (creak, at the top of each arc), the choir in white four abreast holding one note, the breath
//      passed down the line, Flambeaux either side. Out along the tree-line the hounds pace and will not close. Make a
//      noise while it passes and a Flambeau's hood turns toward the bank (js/audit54.js hears it too).
//    * THE SQUARE. They stop, and the silence is enormous. The herald reads the warrant aloud (the book's words). Two
//      Legionnaires cross the square to Lyra at the mouth of Cooper's Row and stand either side of her. The choir files
//      into the chapel, still singing, and does not stop until Hearthday: from here the Pure Note hums over Oakhaven
//      (outdoors, faintly) until the Rite.
//    * THE WELL-HOUSE. Ignatius finds Kaelen at the corner of the square afterwards (until 08:00). Go close and you hear it:
//      "It let go because they held." If you are of the glassed calling he says the rest to you [PROPOSED].
//  Miss it and days35's message stands. Nothing fails. Staged figures are transient; townsfolk in the column's road step
//  aside for it (hidden for the scene, back after). Flags: p55 (0 not yet, 1 the column, 2 the warrant read, 3 the
//  well-house heard, 9 missed), p55_heard (you were heard at the gate), p55_way (1 the gatehouse, 2 where you stood).
// ============================================================
'use strict';

const CHURCH55 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('church55: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return false; };
  const PI = Math.PI;

  const OAK = 'oakhaven', DAY = 5, FROM = 6, UNTIL = 7.5, WELL_UNTIL = 8;
  const ROAD_X = 23.5, GATE_Y = 0.6, STOP_Y = 19.2, SPEED = 1.0, NOTE_EVERY = 2.4, LOUD = 6.5;
  const GATEHOUSE = { x: 20.6, y: 2.7, dir: 0.35 };
  const LYRA = { x: 21.5, y: 28.4 }, LEGS = [[20.8, 28.5], [22.2, 28.5]], LEGS_FROM = [[22.9, 21.2], [24.1, 21.2]];
  const WELL = { kaelen: [27.3, 22.6], crane: [26.5, 22.9] }, WELL_NEAR = 3.4;
  const stage = () => { const v = Number(hasG() ? F().p55 : 0); return Number.isFinite(v) ? Math.max(0, Math.min(9, Math.floor(v))) : 0; };
  const window5 = () => hasG() && (Number(G.day) || 0) === DAY && hour() >= FROM && hour() < UNTIL;

  const TX = {
    leave: S('Leave it.'),
    // the gate
    gateTitle: S('Dawnday, at sunrise'),
    gate: S('Singing, on the Greenroot road. Nobody has heard singing on the Greenroot road in two years.<br><br>Old Harrow has the North Gate\'s wicket open a hand\'s width, and half of the north side is packed into the gatehouse and along the inner bank of the Hedge with their hands over their mouths. The whole town is at a window or a wall.'),
    toGate: S('Go to the gatehouse, and put your hand over your mouth'),
    stay: S('Watch from where you are'),
    coming: S('One note. Five hundred and twenty-eight. Held without end, the breath passed down the line from voice to voice so that the note never breaks. Out along the tree-line the hounds are pacing, keeping pace, and they will not close.'),
    creak: S('Creak. The censer\'s chain, at the top of each arc.'),
    heard: S('A Flambeau\'s hood turns toward the bank, toward you, and the glass-fire in its cage flares. Then it turns back to the road.'),
    // the square
    squareTitle: S('The warrant'),
    square: S('They sing all the way to the square and stop, and the silence afterward is so enormous that people put their hands over their ears.<br><br>A herald in white and gold unrolls a warrant with the High Patriarch\'s sunburst seal hanging from it on a ribbon, and reads it aloud, in a voice trained for cathedrals, going up off the stones and over the rooftops:<br><br><i>Whereas the second note has taken root in the town of Oakhaven, in the Resonant Reach, among the dwellings of the district called the Hollow, and whereas the ground must be made clean before the Rite, it is ordered that the Pure Note be held over the town of Oakhaven without end, by day and by night, until the Rite; and that the Hollow be given to the Pure Flame at the hour the Rite of Unison is begun, on Hearthday next, that the ground beneath the Rite be sanctified. And it is further ordered that the Cantor of Oakhaven be taken into the Church\'s protection until the Rite.</i><br><br>Across the square, three hundred heads turn.'),
    lyra: S('She is there, at the mouth of Cooper\'s Row, with her shawl around her shoulders and her hands in its folds, and a bruise on her cheekbone. She stands very straight under three hundred stares and does not look at anyone. Two Legionnaires detach themselves from the line and cross the square toward her, clanking softly, and take up their places either side of her, bells lifted.<br><br><i>In the Church\'s protection.</i>'),
    watch: S('Watch'),
    filed: S('The choir files into the chapel, still singing, and does not stop. It will not stop now until Hearthday. The note goes up out of the empty belfry and settles over Oakhaven like a lid.'),
    // the well-house
    wellTitle: S('At the corner of the well-house'),
    well: S('The Inquisitor has found Kaelen at the corner of the well-house while the crowd breaks up. He stops a pace away, the censer hanging quiet at his side, and looks at the felt sleeve the way a scholar looks at a text he has only ever seen quoted.<br><br>"Engineer Vance. The prodigal technician returns. I see you survived the Foundry." His eyes go to the sleeve. "More or less."<br><br>"You too," says Kaelen, and looks at the white silk glove. "More or less."<br><br>The Inquisitor tells him, very privately, what he has come to believe in seven years of prayer: that the unison was broken. That somebody shouted.<br><br>"It let go because they held," says Kaelen. "It asked a question. You heard it. I saw your face. It asked, and they answered, and it believed them. You have been praying about the wrong sound for seven years, Inquisitor."<br><br>For a moment something moves behind the statue\'s face. Then it closes. "Do not presume to teach me the Light, Engineer," says Ignatius Crane softly, and lifts the bleached hand between them. "I have <i>held</i> it."<br><br>Creak, goes the chain as he walks away. Creak.'),
    wellGlass: S('Before he goes, the Inquisitor turns, and finds you, and his eyes go to your own glass arm with the same courteous, absolute interest. "And you. Dawning glass. I can hear it from here." A small smile. "Do you know what the Church calls men like you?"'),
    consecrated: S('"Consecrated."'),
    heldToo: S('"It let go because they held."'),
    nothing: S('Say nothing'),
    glassAnsConsecrated: S('"Consecrated," the Inquisitor agrees, as if you had passed a small examination. "The High Patriarch would give a great deal to have you kneel in the Chapel of the Organum. You would be a sermon in yourself." Creak, goes the chain. Creak.'),
    glassAnsHeld: S('The Inquisitor goes very still, as he did for Kaelen, and for the same moment. "Two of you," he says at last, pleasantly. "How very instructive." Creak, goes the chain as he walks away.'),
    glassAnsNone: S('You say nothing. "Wise," says Ignatius Crane, and walks away. Creak, goes the chain. Creak.'),
    lookCrane: S('The Inquisitor'), lookCraneText: S('Red robes, worn as though he had been born in them. On his right hand, the Inquisitor\'s ring. His left he keeps gloved in white silk.'),
    lookChoir: S('The choir of the Pure Note'), lookChoirText: S('Young men and young women in white, four abreast, with gorgets of gold at their throats, holding one note between them without a seam.'),
    lookFlam: S('A Flambeau'), lookFlamText: S('A robe the red of banked coals, hooded; a fire-stave as tall as a man, and in its iron cage a fist of amber glass, burning.'),
    lookHerald: S('The herald'), lookHeraldText: S('White and gold, and the warrant rolled under one arm with the sunburst seal swinging on its ribbon.'),
    lookKaelen: S('Kaelen Vance'), lookKaelenText: S('At the corner of the well-house, not moving, his right hand flat on the stone.'),
    lookCrowd: S('The north side of Oakhaven'), lookCrowdText: S('Hands over mouths. Nobody looks at anybody.'),
    lookLyra: S('Lyra Ashgrove'), lookLyraText: S('She does not look at anyone.'),
    lookLeg: S('A Legionnaire of the Carillon'), lookLegText: S('Bell lifted. It will stand at her door until the Rite.'),
    // logbook
    jSaw: S('The Church came up the Greenroot road at sunrise on Dawnday, and I was at the North Gate for it: thirty voices holding one note, the Flambeaux, the hounds pacing the tree-line and not closing, the Inquisitor with the censer. In the square the herald read the warrant: the Pure Note over Oakhaven until the Rite, the Hollow to the Pure Flame when the Rite begins, and Lyra in the Church\'s protection. Two Legionnaires went and stood either side of her.'),
    jWell: S('At the well-house, afterwards, Kaelen told the Inquisitor that the Light let go because they held. Something moved behind Ignatius Crane\'s face, and then it closed.'),
  };

  // ================================================================ staging (all transient)
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p55 === k);
  function put(m, k, e) { const have = keyed(m, k); if (have) return have; Object.assign(e, { transient: true, _decor: true, _p55: k, solid: false }); m.entities.push(e); return e; }
  function dropAll(m, test) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p55 && (!test || test(e._p55))) m.entities.splice(i, 1); } }
  const look = (name, text) => ({ use: 'p55_look', label: name, look: text });
  // the column: [key, sprite, row behind the head, offset across the road, look]
  const COLUMN = [['crane', 'flambeau', 0, 0, 'crane'], ['cens', 'p12_censer', 0.55, 0.45, null], ['herald', 'herald', 1.6, 0, 'herald']];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) COLUMN.push(['ch' + r + c, 'deacon', 2.8 + r * 1.0, -0.9 + c * 0.6, 'choir']);
  for (let r = 0; r < 3; r++) for (const s of [-1, 1]) COLUMN.push(['fl' + r + (s < 0 ? 'w' : 'e'), 'proctor', 2.8 + r * 1.5, s * 1.3, 'flam']);
  const LOOKS = { crane: [TX.lookCrane, TX.lookCraneText], choir: [TX.lookChoir, TX.lookChoirText], flam: [TX.lookFlam, TX.lookFlamText], herald: [TX.lookHerald, TX.lookHeraldText] };
  const CROWD = [[14.5, 2.6, 'townsman'], [16.0, 2.7, 'townswoman'], [17.4, 2.5, 'townsman'], [19.0, 2.8, 'townswoman'], [26.4, 2.6, 'townsman'], [27.9, 2.7, 'townswoman'], [29.6, 2.5, 'townsman'], [31.2, 2.8, 'townswoman']];
  const S_ = { t: 0, head: GATE_Y, note: 0, creaked: false, run: false, hiddenNpcs: [], legT: 0, after: 0 };

  function stageGate(m) {
    put(m, 'harrow', Object.assign({ kind: 'deco', sprite: 'harrow', x: 21.9, y: 1.7, scale: 1.0, facing: PI / 2 }, look(TX.lookCrowd, TX.lookCrowdText)));
    CROWD.forEach(([x, y, sp], i) => put(m, 'crowd' + i, Object.assign({ kind: 'deco', sprite: sp, x, y, scale: 0.95, facing: PI / 2 }, look(TX.lookCrowd, TX.lookCrowdText))));
  }
  function stageColumn(m) {
    for (const [k, sp, row, off, lk] of COLUMN) {
      const L = lk ? LOOKS[lk] : null;
      put(m, k, Object.assign({ kind: 'deco', sprite: sp, x: ROAD_X + off, y: GATE_Y - row, scale: sp === 'p12_censer' ? 0.55 : 1.0, facing: PI / 2, _row: row, _off: off, lightCol: sp === 'p12_censer' ? [40, 95, 160] : undefined }, L ? look(L[0], L[1]) : {}));
    }
    // people standing in the road step aside for it
    S_.hiddenNpcs = [];
    for (const e of m.entities) if (e && !e._p55 && e.kind === 'npc' && !e.hidden && Math.abs(e.x - ROAD_X) < 1.7 && e.y > 2 && e.y < STOP_Y + 2) { e.hidden = true; S_.hiddenNpcs.push(e); }
  }
  function restoreNpcs() { for (const e of S_.hiddenNpcs) { if (e) e.hidden = false; } S_.hiddenNpcs = []; }
  const walkFrame = (e, t) => { try { if (!Engine.sprites[e.sprite + '_w1']) return; const ph = Math.floor(t * 3.2 + (e._row || 0)) & 3; e.animSprite = ph === 1 ? e.sprite + '_w1' : ph === 3 ? e.sprite + '_w2' : null; } catch (err) { /* frames */ } };
  function tickColumn(m, dt) {
    S_.t += dt; S_.head = Math.min(STOP_Y, S_.head + SPEED * dt);
    for (const e of m.entities) {
      if (!e || !e._p55 || e._row == null) continue;
      e.y = S_.head - e._row; e.x = ROAD_X + e._off + (e.sprite === 'p12_censer' ? Math.sin(S_.t * 2.2) * 0.25 : 0);
      e.facing = PI / 2;
      e.hidden = !!m.get(Math.floor(e.x), Math.floor(e.y)) || e.y < 0.2;   // nobody is drawn inside the gate's stone
      if (S_.head < STOP_Y) walkFrame(e, S_.t); else e.animSprite = null;
    }
    if (S_.t - S_.note > NOTE_EVERY) { S_.note = S_.t; try { Audio_.sfx.song(528, 2.6); } catch (e) { /* silent */ } }
    if (!S_.creaked && S_.t > 3) { S_.creaked = true; say(TX.creak, 'voice', 4200); }
    // hands over mouths: a noise while it passes and a hood turns
    const f = F();
    if (!f.p55_heard && S_.head < STOP_Y && (Number(G.noise) || 0) > LOUD) {
      f.p55_heard = true; say(TX.heard, 'warn', 6000);
      try { if (typeof AUDIT54 !== 'undefined') AUDIT54.log('gate'); } catch (e) { warnOnce('audit', e); }
    }
    if (S_.head >= STOP_Y && S_.t > 0) warrant();
  }

  // ================================================================ the beats
  function begin() {
    const f = F(); if (stage() !== 0) return;
    f.p55 = 1; f.church_come = true;   // days35 then has nothing left to announce
    stageGate(G.map);
    showEvent(TX.gateTitle, TX.gate, [
      { t: TX.toGate, f: () => { f.p55_way = 1; try { loadMap(OAK, GATEHOUSE); } catch (e) { warnOnce('gate', e); } go(); } },
      { t: TX.stay, f: () => { f.p55_way = 2; go(); } },
    ]);
  }
  function go() {
    S_.t = 0; S_.head = GATE_Y; S_.note = -NOTE_EVERY; S_.creaked = false; S_.run = true;
    stageGate(G.map); stageColumn(G.map);
    try { G.noise = Math.min(Number(G.noise) || 0, 3); } catch (e) { /* noise */ }
    say(TX.coming, 'voice', 9000);
  }
  function warrant() {
    if (!S_.run) return; S_.run = false;
    const f = F(); if (stage() !== 1) return;
    const m = G.map;
    put(m, 'lyra', Object.assign({ kind: 'deco', sprite: 'lyra', x: LYRA.x, y: LYRA.y, scale: 0.9, facing: -PI / 2 }, look(TX.lookLyra, TX.lookLyraText)));
    LEGS.forEach((p, i) => put(m, 'leg' + i, Object.assign({ kind: 'deco', sprite: 'legionnaire', x: LEGS_FROM[i][0], y: LEGS_FROM[i][1], scale: 1.0, facing: PI / 2, _to: p, _from: LEGS_FROM[i] }, look(TX.lookLeg, TX.lookLegText))));
    S_.legT = 0;
    try { journal('main', TX.jSaw); } catch (e) { /* none */ }
    showEvent(TX.squareTitle, TX.square + '<br><br>' + TX.lyra, [{ t: TX.watch, f: () => filed() }]);
  }
  function filed() {
    const f = F(); if (stage() !== 1) return;
    f.p55 = 2; S_.legT = 0; S_.after = 0;
    // the legionnaires take up their places; the choir goes into the chapel; the well-house afterwards
    dropAll(G.map, (k) => COLUMN.some((c) => c[0] === k) || k === 'harrow' || /^crowd/.test(k));
    restoreNpcs();
    stageWell(G.map);
    say(TX.filed, 'voice', 9000);
    try { questXp(25); } catch (e) { /* none */ }
  }
  function stageWell(m) {
    if (!m || m.id !== OAK) return;
    const on = stage() === 2 && (Number(G.day) || 0) === DAY && hour() < WELL_UNTIL;
    if (!on) { dropAll(m, (k) => k === 'kaelen' || k === 'crane2'); return; }
    put(m, 'kaelen', Object.assign({ kind: 'deco', sprite: 'kaelen', x: WELL.kaelen[0], y: WELL.kaelen[1], scale: 1.0, facing: PI }, look(TX.lookKaelen, TX.lookKaelenText), { use: 'p55_well' }));
    put(m, 'crane2', Object.assign({ kind: 'deco', sprite: 'flambeau', x: WELL.crane[0], y: WELL.crane[1], scale: 1.0, facing: 0 }, look(TX.lookCrane, TX.lookCraneText), { use: 'p55_well' }));
  }
  function wellHouse() {
    const f = F(); if (stage() !== 2) return;
    f.p55 = 3;
    try { journal('main', TX.jWell); questXp(15); } catch (e) { /* none */ }
    const end = () => { dropAll(G.map, (k) => k === 'kaelen' || k === 'crane2'); };
    if (G.player.glassed) {
      showEvent(TX.wellTitle, TX.well + '<br><br>' + TX.wellGlass, [
        { t: TX.consecrated, f: () => { f.p55_glass = 1; end(); showEvent(TX.wellTitle, TX.glassAnsConsecrated, [{ t: TX.leave, f: null }]); } },
        { t: TX.heldToo, f: () => { f.p55_glass = 2; end(); showEvent(TX.wellTitle, TX.glassAnsHeld, [{ t: TX.leave, f: null }]); } },
        { t: TX.nothing, f: () => { f.p55_glass = 3; end(); showEvent(TX.wellTitle, TX.glassAnsNone, [{ t: TX.leave, f: null }]); } },
      ]);
    } else showEvent(TX.wellTitle, TX.well, [{ t: TX.leave, f: () => end() }]);
  }

  // ================================================================ the Pure Note over the town, until the Rite
  let humming = false;
  function drone() {
    try {
      const on = hasG() && !!F().church_come && !F().rite_started && !F().greening && G.mapId === OAK && G.state !== 'title';
      if (on || humming) { Audio_.hum(on ? 0.2 : 0, 528, 'p55_note'); humming = on; }
    } catch (e) { warnOnce('drone', e); }
  }

  // ================================================================ tick, uses, wiring
  function useOwn(e) {
    if (!e || !e._p55) return false;
    if (e.use === 'p55_well' && stage() === 2) { wellHouse(); return true; }
    showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]);
    return true;
  }
  function missed() {
    if (stage() !== 0 || !F().church_come) return;
    F().p55 = 9;
  }
  // From 06:00 to 07:30 on Dawnday js/days35.js holds its announcement while this scene can still happen: be in Oakhaven
  // (the town itself, not a house) in that hour and you are there for it; after it, days35 announces it as before.
  function holds() {
    if (!hasG() || guest() || inExtra()) return false;
    const f = F();
    return stage() === 0 && !f.church_come && !f.rite_ready && !f.rite_started && !f.greening && window5();
  }
  function pre() {
    if (!hasG() || G.state !== 'play') return;
    if (G.mapId === OAK && holds()) begin();
  }
  function tick(dt) {
    if (!hasG() || guest() || inExtra()) return;
    try {
      drone();
      if (G.state !== 'play') return;
      if (G.mapId === OAK && stage() === 1 && S_.run) tickColumn(G.map, Math.min(0.1, Math.max(0, Number(dt) || 0.033)));
      if (G.mapId === OAK && stage() === 2) {
        const m = G.map, L = m.entities.filter((e) => e && e._p55 && e._to);
        S_.legT = Math.min(1, S_.legT + (Number(dt) || 0.033) / 4);
        for (const e of L) { e.x = e._from[0] + (e._to[0] - e._from[0]) * S_.legT; e.y = e._from[1] + (e._to[1] - e._from[1]) * S_.legT; }
        S_.after += Number(dt) || 0.033;
        if (S_.after > 30 && L.length) dropAll(m, (k) => /^leg/.test(k) || k === 'lyra');   // she goes home with them
        const k = keyed(m, 'kaelen');
        if (k && Math.hypot(Engine.cam.x - k.x, Engine.cam.y - k.y) < WELL_NEAR) { wellHouse(); return; }
        if (hour() >= WELL_UNTIL || (Number(G.day) || 0) !== DAY) stageWell(m);
      }
      missed();
    } catch (e) { warnOnce('tick', e); }
  }
  function wire() {
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function (dt) { try { pre(); } catch (e) { warnOnce('pre', e); } const r = _un.apply(this, arguments); tick(dt); return r; };
    }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () {
        // leaving mid-scene: the column has gone on without you
        const was = hasG() ? G.mapId : null;
        const r = _f.apply(this, arguments);
        try {
          if (!hasG()) return r;
          if (fn === 'loadMap' && G.mapId === OAK && holds()) { begin(); return r; }   // coming into Oakhaven in the hour
          if (was === OAK && G.mapId !== OAK && stage() === 1) { S_.run = false; F().p55 = 2; dropAll(G.maps[OAK]); restoreNpcs(); try { journal('main', TX.jSaw); } catch (e) { /* none */ } }
          if (fn === 'restoreGame') { dropAll(G.map); S_.run = false; if (stage() === 1) F().p55 = 2; }
          if (G.mapId === OAK && stage() === 2) stageWell(G.map);
        } catch (e) { warnOnce('load', e); }
        return r;
      };
    }
  }
  try { wire(); } catch (e) { console.warn('church55 failed to wire', e); }

  return { TX, TEXTS, DAY, FROM, UNTIL, ROAD_X, STOP_Y, GATEHOUSE, WELL, COLUMN, stage, holds, begin, go, warrant, filed, wellHouse, stageWell, pre, state: () => S_ };
})();
if (typeof window !== 'undefined') window.CHURCH55 = CHURCH55;
