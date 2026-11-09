// ============================================================
//  tamsin52 — Tamsin Reed: Depot Three properly, and "Tell Mam" (Book One ch. 5 ll. 1839–1919, ch. 7 ll. 2377–2409;
//  the Bible's audit: Sable finds her in the Ledger in Part Three; ROADMAP R9 item 10).
//
//  PART ONE, THE QUARRY. The Legionnaire at Depot Three has the reed grille, and its bell murmurs only her line: "the blue
//  jug, Mam. Not the white" (js/game.js coreMurmur). Come within three paces and it raises its gauntlets to take you by the
//  arms, and you choose:
//    - FIGHT: loud; the terraces hear it (js/audit54.js).
//    - TAKE IT BY THE BELL (the glassed calling only; canon): lay the glass hand on the bronze, swallow the alarm, put your
//      fist through the grille. The voice comes out: "I'm Tamsin. I'm Tamsin. I'm Tamsin Reed. Tell her. Tell Mam."
//      The glass drinks it; the tideline climbs a little [PROPOSED: +3].
//    - READ HER NAME (Read the Name, the archivist's song): she stops, and you still have to break her.
//    - STEP BACK.
//  THE BODY (canon: the slag-slope behind the depot): the depot's back wall has the head of the slag-slope, a recess for
//  js/game.js's body system. Send her over (any concealment counts), or leave her. Leaving her, the Factor's walk finds
//  her and Depot Three is guarded (js/audit54.js). Sending her over, the Factor asks you, the next time you speak to her,
//  the book's question: "Did you see anything?" "No." "No," the Factor agreed. "It was very dark." [PROPOSED: that she
//  asks you, not Kaelen.]
//  AT DAWN, at Kaelen's hut (the first morning after, 05:00 to 09:00): you tell him the name, and from the clearing his
//  own voice says "Tamsin Reed." a breath after, the way an answer comes; "I'm sorry." If you are glassed: in your voice.
//  PART THREE, WHISPER-GROVE [PROPOSED throughout]: give Sable the cracked core. She does not need the Ledger to find the
//  entry: she wrote it. Tamsin Reed, nineteen, dairymaid, of the Bell Yard, who asked whether her mother would be told. The
//  Hollow at the window on the Bell Yard (js/grove31.js), setting a blue jug and a white one on the sill over and over, is
//  her mother. Set the white one aside, say her daughter's name, or leave her be. Either way the core goes into the Ledger
//  with a name and a mother, not a tag.
//  Flags: p52 (0, 1 met and fighting, 2 dead), p52_how (f fight, g glass, n name, o otherwise), p52_t (hours at her death),
//  p52_body (1 sent over, 2 left), p52_vosk (1 asked), p52_dawn (1 heard, 9 missed), p52_ledger (1), p52_jug (1 the white
//  set aside, 2 the name said, 3 left be). Staged things are transient.
// ============================================================
'use strict';

const TAMSIN52 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const abs = () => (Number(G.day) || 0) * 24 + hour();
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('tamsin52: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return false; };
  const audit = (k) => { try { if (typeof AUDIT54 !== 'undefined') AUDIT54.log(k); } catch (e) { warnOnce('audit', e); } };

  const NAME = 'Tamsin Reed', QUARRY = 'quarry', CLEARING = 'clearing', YARD = 'p31_bellyard';
  const NEAR = 3.0, HUT = { x: 13.5, y: 16.5 }, HUT_NEAR = 6.5, GLASS = 3;
  const stage = () => (hasG() ? Number(F().p52) | 0 : 0);
  const C = { cool: 0, shown: false };

  const TX = {
    leave: S('Leave it.'),
    // the doorway
    doorTitle: S('Depot Three'),
    door: S('The Legionnaire stands in the depot\'s doorway with the night behind it. Its bell is tilted down toward you, and the grille at its mouth is worked in a pattern of interlaced reeds.<br><br><i>—the blue jug, Mam. Not the white—</i><br><br>It does not need to move. In the morning, before the day shift, the Factor will walk her line and listen to each one, and this one will tell her who came to Depot Three in the middle watch. It raises its long pewter gauntlets, slowly, with that small sound of oiled joints, and comes toward you to take you by the arms.'),
    fight: S('Fight it'),
    glass: S('Take it by the bell'),
    readName: S('Read it its name'),
    back: S('Step back'),
    glassed: S('You lay your glass hand flat against the side of the bronze, the way you lay a hand on a struck bell to stop it ringing, and feel the bell try to sound: the whole of its thin fine bronze gathering itself for the one enormous note that would wake every soul in the quarry. And the glass drinks it. The note goes into your hand and up your arm and is gone, and the arm rings low and full, like a mouth closing on something.<br><br>The bell makes no sound at all. You draw back your fist and put it through the grille, and something smooth and cold the size of an apple cracks under your knuckles like ice under a boot.'),
    named: S('"Tamsin Reed," you say to the grille, in the archivist\'s voice, the one for reading names.<br><br>It stops. The gauntlets stop a hand\'s width from your arms and stay there. Behind the reeds, very close, something is listening, the way a girl listens at a door for her own name being called in from the yard.<br><br>It will not stay stopped. You still have to break her.'),
    breakIt: S('Put your fist through the grille'),
    voiceTitle: S('Inside the bell'),
    voice: S('And the voice comes out. Not murmuring now. Clear. Close. A young woman\'s voice, very frightened, as if she had been shut in a cupboard in the dark and someone had just opened the door.<br><br>"<i>Mam?</i> Mam, where — I can\'t find it, I can\'t find the blue jug, I\'ve been looking and looking — where <i>is</i> everyone—" A breath that is not a breath. "I\'m Tamsin. I\'m Tamsin. I\'m <i>Tamsin Reed</i>. Tell her. Tell Mam I\'m Tamsin Reed, I\'m—"<br><br>And stops. The Legionnaire folds at the knees and goes down onto the plank floor, slowly, the way a tent comes down when the pole is pulled.'),
    fought: S('Bronze on bronze. Somewhere up on the terraces a lamp comes on.'),
    core: S('You reach into the broken bell and find the core in the dark: a sphere of pale lilac glass, cracked clean through, with a milky fog inside it already going thin. It is very light.'),
    // the body
    slag: S('The head of the slag-slope'),
    slagLook: S('The depot\'s back door gives onto the lowest terrace, and forty yards along it the slag-slope drops two hundred feet of grey waste stone into the old green water of the pit. Bring remains here and G sends them over.'),
    sentOver: S('It goes over the edge and tumbles end over end down two hundred feet of grey waste stone, bell and gauntlets and pewter plate, and comes to rest in the old green water at the bottom, and sinks.'),
    leftHer: S('You leave her in the doorway of Depot Three with her bell broken.'),
    // the Factor
    voskTitle: S('Factor Adela Vosk'),
    vosk: S('"Oh — a small thing." The Factor does not look up at once. "One of my Legionnaires walked into the slag-pit in the middle watch. They do that occasionally, when an engram degrades. They wander." The green lenses come up, and do not leave your face. "You were on the terraces that night, I think. Did you see anything?"'),
    no: S('"No."'),
    truth: S('Tell her'),
    voskNo: S('"No," the Factor agrees. "It was very dark." She picks up her pen.'),
    voskTruth: S('She listens to all of it without writing anything down, which is worse. "Thank you," she says at the end. "That was very honest of you, and very unwise." Then she writes one line in her small book.'),
    // dawn
    dawnTitle: S('Kaelen\'s hut, before dawn'),
    dawn: S('The hound\'s bed is five paces from his door: a dead dry oval in the wet grass, pressed flat, the size of something long and low. Kaelen is standing over it when you come, in the grey light, and he does not ask where you have been.<br><br>You tell him what was in the bell at Depot Three. "Tamsin Reed," you say.<br><br>"Tamsin Reed," he says after you, so that he will not forget it. "I\'m sorry."<br><br>And from the clearing, from the grey mist among the stumps, from somewhere much nearer than the stumps, a voice says, quietly, perfectly:<br><br>"<i>Tamsin Reed.</i>"'),
    dawnHis: S('His voice. His exact voice, the Reach in the vowels and the rasp at the bottom of it. Not an echo: it came a full breath after he finished speaking, the way an answer comes. Then, softer, almost tenderly, as if trying the shape of the words: "<i>I\'m sorry.</i>"<br><br>Kaelen stands very still in the wet grass. For seven years he has said things out loud in this clearing because nobody heard.'),
    dawnYours: S('Your voice. Your exact voice, the way your own tongue comes down on the R. Not an echo: it came a full breath after you finished speaking, the way an answer comes. Then, softer, almost tenderly, as if trying the shape of the words: "<i>I\'m sorry.</i>"<br><br>Kaelen looks at your arm, and then at you, and says nothing at all.'),
    // Sable
    sableTitle: S('The cracked core'),
    sable: S('Sable turns the cracked lilac sphere over in her good hand without looking at it, the way you weigh a coin you already know. She does not open the Ledger.<br><br>"Entry forty thousand, two hundred and seventy," she says. "Tamsin Reed. Nineteen. Dairymaid, of the Bell Yard. Taken on the eighth day, in the hour before dark. What she said at the door was: <i>will my mother be told?</i>" A pause, exactly long enough. "I wrote that entry. I said yes. It was what we said."<br><br>She sets the core down on the Ledger\'s open page, very gently, as if it might roll. "Her mother is the woman at the window on the Bell Yard. The one with the jugs."'),
    give: S('Give her the core'),
    // the Bell Yard
    jugTitle: S('A Hollow at a window'),
    jug: S('A woman at an open window on the Bell Yard sets a blue jug on the sill, and then a white one beside it, and takes them both in, and sets them out again. Over and over. Her hands know the work. The rest of her has gone somewhere else.<br><br>"...the blue one, and the white one... the blue one, and the white one..."'),
    whiteAside: S('Take the white jug, and set it aside'),
    sayName: S('Say her daughter\'s name'),
    leaveBe: S('Leave her be'),
    jugWhite: S('You take the white jug off the sill and set it down inside, out of her reach. Her hands come back for it and do not find it, and after a while they set the blue one out alone.<br><br>"...the blue one... the blue one..."'),
    jugName: S('"Tamsin Reed," you say, under the window.<br><br>Her hands stop with the blue jug in them. Nothing in her face changes. Then she sets it on the sill, carefully, on its own, and does not take it in again.<br><br>"...Tamsin..." she says, to nobody. "...the blue one..."'),
    jugLeave: S('You leave her at her window, with the blue one and the white one.'),
    jugAfterWhite: S('...the blue one... the blue one...'),
    jugAfterName: S('...Tamsin... the blue one...'),
    // logbook
    jMet: S('Tamsin Reed: the Legionnaire at Depot Three has a grille of reeds, and its bell says only one thing: the blue jug, Mam. Not the white.'),
    jDead: S('Tamsin Reed: I broke the bell at Depot Three. She said her name three times, and asked me to tell her mother. I have her core: cracked lilac glass, very light.'),
    jPit: S('I sent the Legionnaire over the slag-slope into the old green water of the pit.'),
    jLeft: S('I left the Legionnaire in the doorway of Depot Three. The Factor walks her line every morning.'),
    jDawn: S('At dawn, at Kaelen\'s door, I said her name, and the clearing said it back a breath later. The Hedge has been listening to him say things aloud for seven years.'),
    jLedger: S('Tell Mam: Sable wrote Tamsin Reed\'s entry herself. Nineteen, a dairymaid of the Bell Yard, who asked whether her mother would be told. Her mother is the Hollow at the window on the Bell Yard, with the blue jug and the white one.'),
    jDone: S('Tell Mam: I went to the window on the Bell Yard. The core is in the Ledger now, with a name and a mother, not a tag.'),
  };

  // ================================================================ art
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    if (Engine.sprites && Engine.sprites.p52_slag) return;
    const w = 28, h = 10, d = new Uint32Array(w * h);
    const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
    for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) {
      const e = (x - 14) * (x - 14) / 160 + (y - 5.5) * (y - 5.5) / 16; if (e > 1) continue;
      const n = (x * 7 + y * 13) % 9;
      if (e < 0.45) px(x, y, 14 + n, 18 + n, 16 + n);                               // the drop: dark, a green tinge of the pit far down
      else px(x, y, 92 + n * 4, 90 + n * 4, 86 + n * 3);                           // grey waste stone at the lip
    }
    Engine.addSprite('p52_slag', { w, h, data: d, hs: 0.3, cx: 0.5, dy: 0 });
  }

  // ================================================================ the quarry
  const tamsin = (m) => (m && m.entities || []).find((e) => e && e.kind === 'enemy' && e.name === NAME);
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p52 === k);
  function stageQuarry(m) {
    if (!m || m.id !== QUARRY || !m.named || !m.named.depot) return;
    const dp = m.named.depot;
    if (!keyed(m, 'slag')) m.entities.push({ kind: 'deco', sprite: 'p52_slag', x: dp.x + dp.w - 0.65, y: dp.cy + 0.5, solid: false, scale: 0.9, radius: 0.3, bodyCover: true, use: 'body_cover', label: TX.slag, transient: true, _decor: true, _p52: 'slag' });
  }
  function meet(e) {
    const f = F(); C.shown = true;
    if (!f.p52_met) { f.p52_met = true; try { journal('side', TX.jMet); } catch (err) { /* none */ } }
    const p = G.player, ch = [{ t: TX.fight, f: () => fightIt(e) }];
    if (p.glassed) ch.push({ t: TX.glass, f: () => byBell(e) });
    if (Array.isArray(p.songs) && p.songs.includes('name')) ch.push({ t: TX.readName, f: () => byName(e) });
    ch.push({ t: TX.back, f: () => { C.cool = 8; C.shown = false; try { e.stun = Math.max(Number(e.stun) || 0, 1.5); } catch (err) { /* none */ } } });
    showEvent(TX.doorTitle, TX.door, ch);
  }
  function fightIt(e) {
    const f = F(); f.p52 = 1; f.p52_how = 'f';
    try { addNoise(4); } catch (err) { /* none */ }
    try { e.state = 'chase'; e.alertT = 3; } catch (err) { /* none */ }
    say(TX.fought, 'warn', 4500);
    audit('fight');
  }
  function quietly(e, how) {
    const f = F(); f.p52_how = how;
    showEvent(TX.voiceTitle, (how === 'g' ? TX.glassed + '<br><br>' : '') + TX.voice, [{ t: TX.leave, f: () => { say(TX.core, '', 6000); } }]);
    try { killEnemy(e, false); } catch (err) { warnOnce('kill', err); e.dead = true; e.hidden = true; }
    try { G.noise = Math.min(Number(G.noise) || 0, 2); } catch (err) { /* noise */ }
  }
  function byBell(e) {
    const p = G.player; p.glass = Math.min(99, (Number(p.glass) || 0) + GLASS);
    quietly(e, 'g');
  }
  function byName(e) {
    try { e.stun = Math.max(Number(e.stun) || 0, 30); } catch (err) { /* none */ }
    const p = G.player; if (Number.isFinite(p.voice)) p.voice = Math.max(0, p.voice - 6);
    showEvent(TX.doorTitle, TX.named, [{ t: TX.breakIt, f: () => quietly(e, 'n') }, { t: TX.back, f: () => { C.cool = 8; C.shown = false; e.stun = 4; } }]);
  }
  // she died (however): mark her body for the slag-slope
  function died(m, e) {
    const f = F(); if (stage() >= 2) return;
    f.p52 = 2; f.p52_t = abs(); if (!f.p52_how) f.p52_how = 'o';
    try { journal('side', TX.jDead); } catch (err) { /* none */ }
    const body = (m.entities || []).filter((b) => b && (b.corpse || b.dying) && b.sprite === e.sprite && Math.hypot(b.x - e.x, b.y - e.y) < 0.9).pop();
    if (body) body._p52body = true;
  }
  function leaveQuarry(m) {
    const f = F(); if (stage() !== 2 || f.p52_body) return;
    const body = (m.entities || []).find((b) => b && b._p52body);
    if (body && body.stashedIn) { f.p52_body = 1; say(TX.sentOver, '', 6500); try { journal('side', TX.jPit); } catch (e) { /* none */ } }
    else { f.p52_body = 2; try { journal('side', TX.jLeft); } catch (e) { /* none */ } audit('body'); }
  }

  // ================================================================ dawn, the Factor, Sable, the Bell Yard
  const dawnDue = () => { const f = F(); return stage() === 2 && !f.p52_dawn && abs() > (Number(f.p52_t) || 0) + 1 && hour() >= 5 && hour() < 9; };
  function dawn() {
    const f = F(); f.p52_dawn = 1;
    try { journal('side', TX.jDawn); questXp(15); } catch (e) { /* none */ }
    showEvent(TX.dawnTitle, TX.dawn + '<br><br>' + (G.player.glassed ? TX.dawnYours : TX.dawnHis), [{ t: TX.leave, f: null }]);
  }
  const voskDue = () => { const f = F(); return Number(f.p52_body) === 1 && !f.p52_vosk && !f.rite_started && !f.escaped; };
  function voskAsks(after) {
    const f = F(); f.p52_vosk = 1;
    showEvent(TX.voskTitle, TX.vosk, [
      { t: TX.no, f: () => { f.p52_vosk = 1; showEvent(TX.voskTitle, TX.voskNo, [{ t: TX.leave, f: after }]); } },
      { t: TX.truth, f: () => { f.p52_vosk = 2; audit('body'); showEvent(TX.voskTitle, TX.voskTruth, [{ t: TX.leave, f: after }]); } },
    ]);
  }
  const sableDue = () => { const f = F(); return stage() === 2 && !f.p52_ledger && G.has('core'); };
  function sableReads(after) {
    showEvent(TX.sableTitle, TX.sable, [{ t: TX.give, f: () => {
      const f = F(); f.p52_ledger = 1;
      try { G.take('core'); journal('side', TX.jLedger); questXp(20); } catch (e) { /* none */ }
      if (after) after();
    } }]);
  }
  const jugDue = () => { const f = F(); return Number(f.p52_ledger) === 1 && !f.p52_jug; };
  function jugs() {
    const f = F();
    const end = (n, t) => { f.p52_jug = n; try { journal('side', TX.jDone); questXp(30); } catch (e) { /* none */ } showEvent(TX.jugTitle, t, [{ t: TX.leave, f: null }]); };
    showEvent(TX.jugTitle, TX.jug, [
      { t: TX.whiteAside, f: () => end(1, TX.jugWhite) },
      { t: TX.sayName, f: () => end(2, TX.jugName) },
      { t: TX.leaveBe, f: () => end(3, TX.jugLeave) },
    ]);
  }

  // ================================================================ tick, wiring
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || guest() || inExtra()) return;
    try {
      const m = G.map;
      if (C.cool > 0) C.cool -= Number(dt) || 0.033;
      if (G.mapId === QUARRY) {
        const e = tamsin(m);
        if (e) {
          if (e.dead && stage() < 2) died(m, e);
          else if (!e.dead && !e.hidden && !C.shown && C.cool <= 0 && stage() === 0) {
            const c = Engine.cam, d = Math.hypot(e.x - c.x, e.y - c.y);
            let clear = true; try { clear = typeof los !== 'function' || los(c.x, c.y, e.x, e.y); } catch (err) { clear = true; }
            if (d < NEAR && clear) { meet(e); return; }
          }
        }
      }
      if (G.mapId === CLEARING && dawnDue()) {
        const c = Engine.cam;
        if (Math.hypot(c.x - HUT.x, c.y - HUT.y) < HUT_NEAR) { dawn(); return; }
      }
      const f = F();
      if (stage() === 2 && !f.p52_dawn && abs() > (Number(f.p52_t) || 0) + 30) f.p52_dawn = 9;
    } catch (e) { warnOnce('tick', e); }
  }
  function rearm() { C.shown = false; C.cool = 0; }
  function wire() {
    paint();
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function (dt) { const r = _un.apply(this, arguments); tick(dt); return r; }; }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const self = this, args = arguments;
        if (!e || !hasG() || guest() || inExtra()) return _t.apply(self, args);
        try {
          if (e.id === 'vosk' && voskDue()) { voskAsks(() => _t.apply(self, args)); return undefined; }
          if (e.id === 'sable_wg' && sableDue()) { sableReads(null); return undefined; }
          if (e.id === 'p31_jugs' && jugDue()) { jugs(); return undefined; }
        } catch (err) { warnOnce('talk', err); }
        // her mother's line, after
        const n = e.id === 'p31_jugs' && typeof NPCS !== 'undefined' ? NPCS.p31_jugs : null;
        const j = Number(F().p52_jug) | 0;
        if (n && (j === 1 || j === 2) && n.greet) {
          const own = Object.assign({}, n.greet), t = j === 1 ? TX.jugAfterWhite : TX.jugAfterName;
          n.greet.polite = n.greet.normal = n.greet.blunt = t;
          try { return _t.apply(self, args); } finally { Object.assign(n.greet, own); }
        }
        return _t.apply(self, args);
      };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () {
        const was = hasG() ? G.map : null;
        try { if (fn === 'loadMap' && was && was.id === QUARRY) leaveQuarry(was); } catch (e) { warnOnce('leave', e); }
        const r = _f.apply(this, arguments);
        try { if (hasG()) { stageQuarry(G.map); rearm(); } } catch (e) { warnOnce('load', e); }
        return r;
      };
    }
  }
  try { wire(); } catch (e) { console.warn('tamsin52 failed to wire', e); }

  return { TX, TEXTS, NAME, HUT, stage, tamsin, meet, fightIt, byBell, byName, died, leaveQuarry, dawn, dawnDue, voskDue, voskAsks, sableDue, sableReads, jugDue, jugs, stageQuarry };
})();
if (typeof window !== 'undefined') window.TAMSIN52 = TAMSIN52;
