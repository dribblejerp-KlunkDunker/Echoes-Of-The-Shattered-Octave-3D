// ============================================================
//  meadow49 — The water-meadow, played (Book One ch. 6, "The Listening Hour"; ROADMAP R9 item 4).
//
//  js/days35.js lets the Hedge lure Pim through the tannery culvert at the Listening Hour on Massday (game day 3, from
//  19:00) by the clock alone. If you are in the town's low corner when it happens, you go after him:
//    1  NELL at the blue door with a lamp: "He went for water. He said he heard you."
//    2  THE CROSSING. Tam on his stool, grey-faced; the grate pushed aside, a small bucket on its side in the mud. If you
//       told him the truth about the voice on the Flume (tam_told), he went down early and is the first one there; if you
//       let him think it might be her (tam_left), he had stopped humming to listen, and didn't see Pim go (canon l. 2059).
//       Lyra crawls into the culvert. You follow her through, outside the Hedge at the Listening Hour.
//    3  THE MEADOW. No sound anywhere. Pim halfway across in his dead father's cut-down shirt, hands held out stiff. At
//       the tree-line, Tobin Ashgrove's shape, made of the air, singing in Lyra's old whole voice: "Come on, love."
//    4  THE WHISTLE DUEL [PROPOSED: the duel as play, from the design document]: whistle the falling fifth with Lyra
//       (Hold the Pitch, js/reedcraft.js), three times. The thing answers a sixth too wide, then a wide fifth, then
//       exactly right. You watch it learn: a trick works on a mimic once.
//    5  IT SINGS INSTEAD, the calling-song, in her old voice; Lyra answers at full voice, torn, and Pim knows which voice
//       is his. He runs to her. Then the jitter comes out of the tree-line, low and fast: keep them off her back.
//       The Wearer can't be fought here. Hounds can. Pim is never harmed on screen.
//    6  TAM'S WALK. From the gap beside the culvert somebody begins to sing The Miller's Daughter at full voice: Tam,
//       blanket round his shoulders, walking away along the Hedge, face to the sky, going up for the high note. The
//       hounds swerve to him. You can't save him; you can only see it.
//    7  AFTER. Nell on the bank with Pim in her lap; the dye-works woman sets Tam's stool straight and hums; and at the
//       dead hour four voices from the Hedge, and at the very end, softly, the whistle, exactly right.
//  Missing it changes lines, never fails a quest: days35 still lures Pim and Lyra still brings him back, and Old Tam
//  keeps his old ending. Figures and hounds are transient. Flags: p49 (stage), p49_whistle (rounds held), p49_tam.
// ============================================================
'use strict';

const MEADOW49 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('meadow49: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return /^(cantabile|p17)/.test(String((typeof G !== 'undefined' && G && G.mapId) || '')); };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const PI = Math.PI;

  const MAP = 'p49_meadow';
  const DAY = 3, AT_HOUR = 19, TOO_LATE = 21;
  const LOW_CORNER = ['oakhaven', 'tannery', 'p30_hollow', 'p30_carders', 'p30_cellar'];
  const W = 34, H = 22;
  const AT = { culvert: [1.6, 11.5], lyra: [3.0, 11.0], pim: [10.5, 11.5], wearer: [21.5, 11.5], tamFrom: [1.8, 12.6], tamTo: [6.0, 1.8], tamGo: [3.0, 3.0] };
  const OUT = { map: 'oakhaven', x: 23.5, y: 60.6, dir: -PI / 2 };   // inside the Hedge, at the tannery culvert's mouth
  const ROOT_HZ = 174, FIFTH = 2 / 3;
  const PASS = 0.45;
  const stage = () => { const v = Number(hasG() ? F().p49 : 0); return Number.isFinite(v) ? Math.max(0, Math.min(9, Math.floor(v))) : 0; };
  const setStage = (n) => { F().p49 = n; };
  const R = { t: 0, beat: 0, holding: false, said: {} };

  const TX = {
    leave: S('Leave it.'),
    meadow: S('The water-meadow'),
    toTown: S('The culvert, back under the Hedge'),
    notYet: S('Not without the boy.'),
    // 1 Nell
    nellTitle: S('The Listening Hour, Massday'),
    nell: S('Nell Carder comes down the lane at a run with a lamp in her hand, and the lamp is the loudest thing in the town. "He went for water," she says. "Pim. He went for water. He said he heard you." She is looking past you, toward the tannery. "He said he heard Lyra."'),
    run: S('Run for the culvert'),
    letGo: S('Let Lyra go after him'),
    letGone: S('You stay. Lyra goes past you down the lane at a run, without a voice to call with.'),
    // 2 the crossing
    crossTitle: S('The Flume crossing'),
    cross: S('Where the tannery lane meets the bank, the Hedge comes right down to the water, and the runoff goes out under it through a stone culvert with an iron grate. Its bars rusted through at the bottom two winters ago. The grate is pushed aside. A small bucket lies on its side in the mud, a trickle of water running out of it into the reeds.'),
    crossLeft: S('Tam is on his stool with his blanket over his knees, and his face has gone grey. "I didn\'t see," he says. "I was listening. I\'d stopped. Just for a bit. I was only..."'),
    crossTold: S('Tam is already down at the grate on his knees, his blanket in the mud. "He went past me," he says. "I heard him from the bench and I came, and I was too slow. You told me it isn\'t her. I know it isn\'t her."'),
    crossVoice: S('From the far side of the Hedge, very clearly, a woman begins to sing in the Narrow, low and sweet and patient, the Root and down: Lyra\'s voice, her old voice, the whole one. "Come on, love. Come here. Let me sing to your hands." And a small voice, further off than it should be: "Lyra? I can\'t see you." Lyra pulls her wrist out of Tam\'s hand, very gently, and goes down on her knees in the tannery mud, and into the culvert.'),
    crawl: S('Crawl through after her'),
    // 3 the meadow
    outTitle: S('The water-meadow'),
    out: S('Eight feet of culvert, low, stinking of lime and rotten hide. You come out on your hands and knees on the wrong side of the Hedge, and the world is very quiet. Inside there is always a sound. Out here there is none: a long grey slope of wet grass and mist down to the iron-oaks, and the Flume running alongside it, green and silent.<br><br>Pim is halfway across the meadow, in his dead father\'s cut-down shirt, walking slowly toward the trees with his hands held out stiff, the careful walk of a child going toward someone he trusts in the dark.<br><br>And at the tree-line, waiting for him, stands Lyra\'s father. His height, his stoop, his weight on one leg. It is made of the air; you can see the oaks through it. Out of the place where its face is not comes Lyra\'s voice.'),
    // 4 the whistle duel
    whistleWith: S('Whistle the falling fifth with Lyra'),
    whistleTitle: S('The falling fifth'),
    whistleHint: S('Two notes, the Root and down. Louder than the Narrow: it has to cross the meadow.'),
    lyraFirst: S('Lyra puts her fingers to her lips and whistles: two notes, sharp and high, the Root and down, across the meadow like a thrown stone. Pim stops, and turns.'),
    w1: S('The thing at the tree-line stops singing. It tilts its head. Then, out of the place where its face is not, a whistle: the first note right, the second falling too far, a sixth instead of a fifth, wavering, sliding, like a child\'s whistle before he has the shape of it.'),
    w2: S('It answers again. Nearer. A wide fifth now, the second note sliding down onto the right one and almost staying there. It is listening to you. It is learning.'),
    w3: S('It answers a third time, and the whistle is exactly right. Two notes, the Root and down, in the voice of a seven-year-old boy. A trick works on a mimic once.'),
    wSlip: S('Your whistle cracks and goes to air. Lyra\'s carries on alone, across the meadow.'),
    wPut: S('You let it go. Lyra whistles on her own.'),
    // 5 it sings instead
    singTitle: S('Two Lyras'),
    sing: S('It gives up the whistle and begins a different song: the calling-song, in Lyra\'s whole voice, perfect and sweet. And Pim, crying, turns back toward the trees.<br><br>Lyra stands up in the mud and opens her mouth and sings. It comes out of her like something tearing: hoarse, cracked, a voice that has been broken and set wrong. The thing at the tree-line sings too, louder, matching her, and for three long notes the two Lyras sing the same song across the meadow, one perfect, one ruined.<br><br>Pim knows. Every word she has said to him since Rootday came out of her in this voice. He turns and runs to her.'),
    keepOff: S('Keep them off her back'),
    jitter: S('The jitter comes out of the tree-line, low and fast, a sound like rain coming across a field.'),
    caught: S('Lyra has him. She turns for the culvert with his arms round her neck and his stiff small root-hands clasped behind her, and runs.'),
    // 6 Tam's walk
    tam: S('From the gap beside the culvert, somebody begins to sing The Miller\'s Daughter, at the top of a voice he has been saving. Old Tam comes out of the culvert on his hands and knees and stands up with his blanket round his shoulders, and walks away from you along the Hedge, his face turned up to the dark, going up for the high note.'),
    veer: S('The hounds go past you. Not at you; past you, like a gust of wind that has changed its mind, the whole pack of them veering away across the meadow after the old man\'s song.'),
    gone: S('He misses the high note. Then there is nothing out there but the jitter, and the mist, and the song, still going, in his voice, a quarter-tone flat, moving away along the Hedge.'),
    back: S('Lyra is through. Go back under the Hedge.'),
    // 7 after
    afterTitle: S('The bank, in the lamplight'),
    after: S('Nell sits on the bank in the lamplight with Pim in her lap, rocking, both of them silent, his hands held out stiff behind her back. People come down the lane with lamps and stand at a distance. Lyra sits in the mud with her back against the culvert and her bleeding mouth in her hands.<br><br>After a while one of the old women from the dye-works comes down the bank without a word, and picks up Tam\'s stool, and sets it straight at the crossing, and sits on it, and begins to hum. Through her nose. Missing the high notes. The basket he was weaving lies finished beside it.'),
    afterNight: S('At the dead hour the Hedge talks, as it does every night. Tonight it has four voices you know: Davin Hale\'s, singing The Last Sheaf; Tam\'s, singing The Miller\'s Daughter and missing the high note; Lyra\'s old one; and Lyra\'s new one, hoarse and cracked and real. At the very end, just before dawn, softly, in the Narrow, it whistles. Two notes. The Root, and down. Exactly right.'),
    afterGo: S('Go up the bank'),
    stool: S('Tam\'s stool, set straight at the crossing'),
    stoolLook: S('A three-legged stool set straight at the crossing, and a basket beside it, finished, the rim tied off.'),
    jDone: S('The water-meadow: the Hedge whistled Pim\'s whistle at the Listening Hour and he went through the culvert. Lyra and I went after him. A thing in her father\'s shape sang to him in her old voice; we whistled the falling fifth, and it learned it in three. Lyra brought him back singing in her broken voice. Old Tam walked out along the Hedge singing The Miller\'s Daughter, and the hounds went to him and not to us.'),
    jWhistle: S('The thing at the tree-line answered the falling fifth a sixth too wide, then a wide fifth, then exactly right. A trick works on a mimic once.'),
    tamEnd: S('On Massday, at the Listening Hour, Old Tam walked out into the water-meadow singing The Miller\'s Daughter at the top of a voice he had been saving, and the hounds went to him and not to Lyra and the boy. He missed the high note. It learned the song off him anyway.'),
  };

  // ================================================================ the map (new: always built)
  function buildMeadow() {
    const woods = (typeof Engine !== 'undefined' && Engine.textures && Engine.textures.p17p_woods) ? 'p17p_woods' : 't_hedge';
    const m = new GameMap(MAP, TX.meadow, W, H, {
      outdoor: true, floor: 't_grass', floorTextures: ['t_grass', 't_moss', 't_water', 't_shallows'], fogDist: 22, fogColor: [70, 78, 86], ambient: 0.2,
      music: 'wild', danger: 2, spawn: { x: AT.culvert[0] + 0.6, y: AT.culvert[1], dir: 0 },
    });
    m.border('t_hedge');
    for (let y = 1; y < H - 1; y++) m.set(W - 1, y, WALL(woods));
    m.set(0, 11, DOOR({ tex: 't_hedge', portal: { map: OUT.map, x: OUT.x, y: OUT.y, dir: OUT.dir }, label: TX.toTown, locked: 'p49_back', lockMsg: TX.notYet }));
    // the Flume along the south side, green and silent; wet ground by it
    for (let x = 1; x < W - 1; x++) { m.setFloor(x, H - 2, 2); m.setFloor(x, H - 3, x % 4 === 0 ? 3 : 2); m.setFloor(x, H - 4, 3); }
    for (let x = 1; x < W - 1; x += 2) m.setFloor(x, 10 + (x % 3), 1);
    // the iron-oaks at the forest's edge
    for (let y = 1.5; y < H - 4; y += 2.2) m.deco('oak', W - 2.3 + ((y * 7) % 3) * 0.3, y, { scale: 1.8, radius: 0.45 });
    for (const [x, y] of [[26.5, 3.5], [27.2, 17.2], [25.4, 7.0]]) m.deco('oak', x, y, { scale: 1.6, radius: 0.45 });
    for (const [x, y] of [[6.5, 17.5], [12.0, 3.0], [19.5, 18.0]]) m.deco('p20_thorn', x, y, { scale: 0.8, radius: 0.35 });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildMaps(maps) { if (!maps[MAP]) maps[MAP] = buildMeadow(); }

  // ================================================================ staging
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p49 === k);
  function put(m, k, e) { let have = keyed(m, k); if (have) return have; e = Object.assign(e, { transient: true, _decor: true, _p49: k }); m.entities.push(e); return e; }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p49 && (!pred || pred(e))) m.entities.splice(i, 1); } }
  const fig = (m, k, sprite, pos, o) => put(m, k, Object.assign({ kind: 'deco', sprite, x: pos[0], y: pos[1], scale: 1.0, solid: false, radius: 0.3, facing: 0 }, o || {}));
  function stageMeadow(m) {
    if (!m || m.id !== MAP) return;
    const s = stage();
    if (s >= 3 && s <= 6) {
      fig(m, 'lyra', 'lyra', AT.lyra, { scale: 0.96 });
      fig(m, 'pim', 'pim', AT.pim, { scale: 0.7, facing: 0, glow: 0.15 });
      fig(m, 'wearer', (Engine.sprites && Engine.sprites.wearer) ? 'wearer' : 'hollow', AT.wearer, { scale: 1.2, facing: PI, glow: 0.5, lightCol: [34, 36, 52] });
    } else drop(m);
  }
  function stageTown(m) {
    if (!m || m.id !== 'oakhaven') return;
    const s = stage();
    if (s === 9 && F().p49_tam && (Number(G.day) || 0) <= DAY + 2) fig(m, 'stool', 'chair', [23.2, 59.6], { scale: 0.5, label: TX.stool, use: 'p49_look', look: TX.stoolLook });
    else drop(m, (e) => e._p49 === 'stool');
    // Old Tam is gone from his bench once he has walked out
    if (F().p49_tam) for (const e of m.entities) if (e && e.kind === 'npc' && e.id === 'tam') e.hidden = true;
  }

  // ================================================================ 1 · Nell
  const due = () => hasG() && LOW_CORNER.includes(G.mapId) && (Number(G.day) || 0) === DAY && hour() >= AT_HOUR && hour() < TOO_LATE && stage() === 0 && !F().p49_lured_seen;
  function begin() {
    if (stage() !== 0) return;
    setStage(1);
    showEvent(TX.nellTitle, TX.nell, [{ t: TX.run, f: crossing }, { t: TX.letGo, f: () => { setStage(9); say(TX.letGone, '', 6000); } }]);
  }
  // ================================================================ 2 · the crossing
  function crossing() {
    const f = F(); if (stage() !== 1) return;
    setStage(2);
    const tam = f.tam_told ? TX.crossTold : TX.crossLeft;
    showEvent(TX.crossTitle, TX.cross + '<br><br>' + tam + '<br><br>' + TX.crossVoice, [{ t: TX.crawl, f: through }]);
  }
  function through() {
    if (stage() !== 2) return;
    setStage(3); F().p49_back = false;
    try { loadMap(MAP, { x: AT.culvert[0] + 0.6, y: AT.culvert[1], dir: 0 }); } catch (e) { warnOnce('load', e); }
    G.tod = Math.max(G.tod, (AT_HOUR + 0.2) / 24);
    stageMeadow(G.map);
    showEvent(TX.outTitle, TX.out, [{ t: TX.whistleWith, f: () => { say(TX.lyraFirst, '', 6000); setTimeout(() => whistle(1), 0); } }]);
  }

  // ================================================================ 4 · the whistle duel
  async function whistle(round) {
    if (R.holding || stage() !== 3) return;
    R.holding = true;
    let res = null;
    try {
      const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
      if (!Rd) res = { score: 1 };
      else {
        const hi = ROOT_HZ * 2, lo = hi * FIFTH;   // whistled an octave up: the Root, and down a fifth
        const curve = [[0, hi * 1.03], [0.8, hi], [2.2, hi], [2.9, lo], [4.6, lo]];
        res = await Rd.holdPitch({ curve, width: (typeof Rd.bandFor === 'function' ? Rd.bandFor(0) : 100) * 1.3, duration: 4.6, title: TX.whistleTitle, hint: TX.whistleHint });
      }
    } catch (e) { warnOnce('whistle', e); res = null; }
    R.holding = false;
    try { if (G.state !== 'play' && !G.openPanel) G.state = 'play'; } catch (e) { /* ok */ }
    const f = F();
    if (!res || res.aborted) say(TX.wPut, '', 3500);
    else if (!(res.score >= PASS)) say(TX.wSlip, '', 3500);
    else f.p49_whistle = Math.min(3, (Number(f.p49_whistle) || 0) + 1);
    const ans = round === 1 ? TX.w1 : round === 2 ? TX.w2 : TX.w3;
    if (round < 3) showEvent(TX.whistleTitle, ans, [{ t: TX.whistleWith, f: () => { setTimeout(() => whistle(round + 1), 0); } }]);
    else { try { journal('side', TX.jWhistle); } catch (e) { /* none */ } showEvent(TX.whistleTitle, ans, [{ t: TX.keepOff, f: singsInstead }]); }
  }

  // ================================================================ 5 · it sings instead; the jitter
  function hound(i, pos) {
    let h = null; try { h = hydrate({ kind: 'enemy', type: 'hound', x: pos[0], y: pos[1] }); } catch (e) { h = { kind: 'enemy', type: 'hound', x: pos[0], y: pos[1], hp: 12 }; }
    return Object.assign(h, { transient: true, _p49: 'h' + i, state: 'chase' });
  }
  const hounds = () => (G.map && G.map.entities || []).filter((e) => e && /^h\d$/.test(e._p49 || '') && !e.dead && !e.hidden && !(e.hp <= 0));
  function singsInstead() {
    if (stage() !== 3) return;
    showEvent(TX.singTitle, TX.sing, [{ t: TX.keepOff, f: () => {
      setStage(4); R.t = 0; R.beat = 0;
      const m = G.map;
      if (m && m.id === MAP) [[28.5, 6.0], [29.0, 16.0], [28.0, 11.5], [27.5, 3.0]].forEach((p, i) => { if (!keyed(m, 'h' + i)) m.entities.push(hound(i, p)); });
      say(TX.jitter, 'bad', 6000);
      try { Audio_.sfx.hound(); } catch (e) { /* silent */ }
    } }]);
  }
  function tickRun(dt) {
    const m = G.map; if (!m || m.id !== MAP) return;
    R.t += dt;
    const pim = keyed(m, 'pim'), lyra = keyed(m, 'lyra');
    // Pim runs to her; then she carries him for the culvert, slower than a child runs
    if (pim && lyra) {
      if (!R.said.caught) {
        const d = dist(pim.x, pim.y, lyra.x, lyra.y), v = 3.2 * dt;
        if (d > 0.5) { pim.x += (lyra.x - pim.x) / d * v; pim.y += (lyra.y - pim.y) / d * v; }
        else { R.said.caught = true; say(TX.caught, '', 5000); }
      } else { pim.x = lyra.x + 0.2; pim.y = lyra.y + 0.1; }
    }
    // the Wearer stays at the trees; it cannot be fought here
    for (const h of hounds()) { if (h.x < 3.0) h.x = 3.0; }
    if (R.said.caught && !R.said.tam && R.t >= 9) tamWalks();
    if (R.said.tam) tickTam(dt);
  }
  // ================================================================ 6 · Tam's walk
  function tamWalks() {
    const m = G.map; R.said.tam = true; R.tamT = 0;
    setStage(5); F().p49_tam = true;
    fig(m, 'tam', (Engine.sprites && Engine.sprites.tam) ? 'tam' : 'townsman', AT.tamFrom, { scale: 0.92, facing: -PI / 2 });
    say(TX.tam, 'voice', 9000);
    setTimeout(() => say(TX.veer, '', 7000), 2200);
  }
  function tickTam(dt) {
    const m = G.map; R.tamT = (R.tamT || 0) + dt;
    const tam = keyed(m, 'tam'), lyra = keyed(m, 'lyra'), pim = keyed(m, 'pim');
    if (tam) { const d = dist(tam.x, tam.y, AT.tamTo[0], AT.tamTo[1]); if (d > 0.2) { const v = 0.9 * dt; tam.x += (AT.tamTo[0] - tam.x) / d * v; tam.y += (AT.tamTo[1] - tam.y) / d * v; } }
    // the hounds veer past you to the song
    for (const h of hounds()) {
      if (!tam) break;
      h.state = 'idle'; h.stun = 0.2;
      const d = dist(h.x, h.y, tam.x, tam.y), v = 4.0 * dt;
      if (d > 0.4) { h.x += (tam.x - h.x) / d * v; h.y += (tam.y - h.y) / d * v; }
    }
    if (lyra) { const d = dist(lyra.x, lyra.y, AT.culvert[0], AT.culvert[1]); if (d > 0.3) { const v = 1.6 * dt; lyra.x += (AT.culvert[0] - lyra.x) / d * v; lyra.y += (AT.culvert[1] - lyra.y) / d * v; } }
    if (R.tamT >= 6 && stage() === 5) {
      setStage(6);
      for (const h of hounds()) { h.dead = true; h.hidden = true; }
      if (tam) tam.hidden = true; if (lyra) lyra.hidden = true; if (pim) pim.hidden = true;
      F().p49_back = true;
      say(TX.gone, 'voice', 8000);
      setTimeout(() => say(TX.back, 'warn', 5000), 2600);
    }
  }
  // ================================================================ 7 · after
  function afterCard() {
    const f = F(); if (stage() !== 6) return;
    setStage(9); f.p49_lured_seen = true; f.pim_lured = true;
    try { journal('main', TX.jDone); questXp(60); } catch (e) { /* none */ }
    stageTown(G.map);
    showEvent(TX.afterTitle, TX.after + '<br><br>' + TX.afterNight, [{ t: TX.afterGo, f: null }]);
  }
  function missed() {
    if (!hasG() || inExtra() || stage() !== 0) return;
    const d = Number(G.day) || 0;
    if (d > DAY || (d === DAY && hour() >= TOO_LATE)) setStage(9);
  }

  // ================================================================ the tick, the end card, the wiring
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || guest() || inExtra()) return;
    try {
      missed();
      if (due()) { begin(); return; }
      const s = stage();
      if (s >= 4 && s <= 5) tickRun(dt);
      if (s === 6 && G.mapId === 'oakhaven') afterCard();
    } catch (e) { warnOnce('tick', e); }
  }
  // game.js's end card asks for Tam's line here once he has walked out on Massday
  function endLine() { return hasG() && F().p49_tam ? TX.tamEnd : null; }
  function onLoad() {
    if (!hasG()) return;
    try {
      if (G.mapId === MAP) {
        stageMeadow(G.map);
        if (stage() >= 4 && stage() <= 5 && !hounds().length) { R.t = 0; R.said = {}; }
      }
      if (G.mapId === 'oakhaven') stageTown(G.map);
    } catch (e) { warnOnce('load', e); }
  }
  function useOwn(e) {
    if (!e || !e._p49) return false;
    if (e.use === 'p49_look') { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true; }
    return false;
  }
  function wire() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof update === 'function') { const _u = update; update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); if (fn === 'restoreGame') { R.t = 0; R.said = {}; R.holding = false; } onLoad(); return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('meadow49 failed to wire', e); }

  return { TX, TEXTS, MAP, AT, R, DAY, AT_HOUR, stage, due, begin, crossing, through, whistle, singsInstead, tamWalks, afterCard, hounds, endLine, missed };
})();
if (typeof window !== 'undefined') window.MEADOW49 = MEADOW49;
