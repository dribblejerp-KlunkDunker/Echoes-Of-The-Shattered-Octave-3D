// ============================================================
//  orla65 — Orla Hale: the harvest home (ROADMAP R9 item 17; Story Brainstorm #17; Book One ch. 3 ll. 1005–1057, ch. 6
//  ll. 1955–1983, ch. 11 ll. 3462–3492).
//
//    * AFTER THE BOOTS (canon, ch. 6, spoken to whoever brought them): "He sang it. Didn't he." / "I heard him. Clear
//      across the square." / "Was he any good?" You may tell her the truth, as Lyra did ("He couldn't hold the fourth
//      line"), or not. Either way: "Never could. His da couldn't either. Forty years I tried to teach the pair of them."
//      "I heard it again, after ... It had his voice. It didn't have him." And Lyra will sing her down, proper, before the
//      fire. All the lines. Even the fourth.
//    * [PROPOSED] SHE TEACHES YOU THE LAST SHEAF, one lesson a day, from the chair, in the voice like a rusty gate: the first
//      two lines (the only words the book gives: "Oh, the last sheaf's in and the barley's high, and the swallows are low
//      in the harvest sky"; the rest are taught, never written), then the third line, then the fourth, the narrowest
//      band. Each time, the shutters first and a rag in the cracks, or sing with them open and let the Hedge hear it.
//    * The song is a learnable Song [PROPOSED stats: loud, calls hounds]; knowing it sets g44_knows_sheaf, so in the
//      Greening (js/greening44.js) you sing the second voice with Lyra at Orla's tree, as cutting the Last Sheaf with
//      Harrow already does (js/festivals12.js). Orla still stops breathing around the sixth line, whatever you do (canon).
//  Inside the Hedge, before the Greening only. Flags: p65_told (1 truth, 2 kind), p65_day (the day of the last step),
//  p65_lesson (0..3), p65_loud (lessons sung with the shutters open).
// ============================================================
'use strict';

const ORLA65 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const day = () => Number(G.day) || 0;
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 6000); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('orla65: ' + k + ' failed', e); } };
  const jr = (t) => { try { journal('side', t); } catch (e) { /* none */ } };

  const TX = {
    // after the boots (canon, ch. 6)
    heard: S('Orla looks at the boots for a long time.<br><br>"He sang it," she says at last. "Didn\'t he."<br><br>"He sang it."<br><br>"I heard him." A rustling breath. "Clear across the square. I was sitting here with the window open, and I heard my boy sing the harvest home." Her eyes are wet and quite steady. "Was he any good?"'),
    truth: S('"He couldn\'t hold the fourth line."'),
    kind: S('"He was very good."'),
    afterTruth: S('Orla laughs. It is a terrible sound, a laugh with the dry whisper of roots moving beneath it, like wind in barley, and it goes on too long and turns into something else.<br><br>"Never could," she says. "His da couldn\'t either. Forty years I tried to teach the pair of them." A breath. "I heard it again, after. Out past the Hedge. Somebody singing it back. It had his voice. It didn\'t have <i>him</i>. You can tell, when you\'ve known a voice all its life."<br><br>"Lyra will sing me down. Proper. Before they come with their fire. All the lines." A pause. "Even the fourth."'),
    afterKind: S('"Liar," says Orla Hale, quite fondly. "He never could hold the fourth line. His da couldn\'t either. Forty years I tried to teach the pair of them." A breath. "I heard it again, after. Out past the Hedge. Somebody singing it back. It had his voice. It didn\'t have <i>him</i>."<br><br>"Lyra will sing me down. Proper. Before they come with their fire. All the lines." A pause. "Even the fourth."'),
    offer: S('"Somebody ought to have all of it," Orla says. "Somebody who isn\'t going in the ground this week." She lifts her eyebrows at her hands, which cannot lift. "Come back tomorrow, if you want it. Shut the shutters when you come."'),
    // the lessons [PROPOSED]
    lessonBtn: S('Learn the next line of the harvest home'),
    notToday: S('"Tomorrow, lovey. One line a day. That\'s how I learned it, and that\'s how my mother did."'),
    shutTitle: S('"Shutters first"'),
    shut: S('"Shutters, lovey," says Orla. "And a rag in the cracks. I\'ll not have the Hedge learn it off you before you\'ve learned it off me."'),
    doShut: S('Close the shutters and stuff the cracks'),
    openSing: S('Sing with the shutters open'),
    shutDone: S('You pull the shutters to and stuff the cracks with the rags from the basket by the hearth. The room goes brown and close, and the lamp is the only light. Orla nods.'),
    l1Title: S('The harvest home: the first two lines'),
    l1Offer: S('She sings it first, from the chair, in a voice like a rusty gate: <i>Oh, the last sheaf\'s in and the barley\'s high, and the swallows are low in the harvest sky.</i> "Now you. Not loud. It\'s not for loud, not here, not now."'),
    l1Hint: S('Up a little, down a little, and home. Low, so it stays in the room.'),
    l1Done: S('"There. That\'s the start of it. Davin had the start of it at four years old." She shuts her eyes. "Tomorrow, the third line."'),
    l2Title: S('The harvest home: the third line'),
    l2Offer: S('"The third line goes up where you don\'t expect it, like a field going over a hill." She sings it under her breath, and the roots in the floor creak: <i>then it\'s over the hill where the stubble runs gold.</i>'),
    l2Hint: S('It goes over the hill. Follow it up, and bring it back down.'),
    l2Done: S('"You\'ve a better ear than my boy had." She says it quite steadily. "Tomorrow, the fourth. Nobody gets the fourth the first time."'),
    l3Title: S('The harvest home: the fourth line'),
    l3Offer: S('"The fourth line. Davin couldn\'t hold it. His da couldn\'t either." She breathes in, and the barley-rustle under it is louder than it was: <i>and hold it, and hold it, till the sheaf\'s in the fold.</i> "It goes up, and it stays up, and you don\'t let it go till the sheaf\'s in. Hold it."'),
    l3Hint: S('The line Davin could never hold. Up, and stay up.'),
    l3Done: S('You hold it. Not well, and not for long, but you hold it, and Orla Hale shuts her eyes and listens the way she listened on the risers of fifty harvest homes.<br><br>"There," she says. "Now somebody\'s got all of it. Even the fourth. The rest is the same tune, twice more, and you have the tune." She gives you the words with her eyes shut, a line at a time, under her breath:<br><br><i>Oh, the bread\'s on the hearth and the cider\'s poured,<br>and the old ones are sat at the head of the board;<br>then we plait her and hang her up high on the gate,<br>and leave her, and leave her, though the spring come late.</i><br><br><i>Oh, the rest grows back by the break of day,<br>but the last sheaf\'s cut, and she\'s let to stay;<br>then it\'s over the hill, and it\'s down to the stone,<br>and let go, let go, for the sheaf\'s gone home.</i><br><br>"That last one\'s for going down to," she says. A rustling breath. "Lyra will sing me down. But it\'s good to know there\'s two."'),
    fail: S('"No, no. Again," says Orla. "Breathe from under. Come back tomorrow and we\'ll have it."'),
    failFourth: S('It slips off the top, the way it slipped off Davin\'s. Orla does not laugh this time. "Tomorrow," she says. "It took me a year."'),
    loud: S('Out past the Hedge, something stops, and listens, and begins to sing the line back to you, a half-beat behind.'),
    goOn: S('Go on.'),
    // the Song
    songName: S('The Last Sheaf'),
    songDesc: S('Orla Hale\'s harvest home, all the lines, even the fourth. Sung at full voice it carries across the square and past the Hedge, and every hound in hearing comes for it. In the Greening you can sing the second voice with Lyra.'),
    sang: S('You sing the harvest home at full voice, all the lines, even the fourth. It carries. Somewhere past the walls, something turns its head.'),
    jTold: S('Orla asked me whether Davin was any good. "Never could hold the fourth line. His da couldn\'t either." She wants somebody to have all of the harvest home.'),
    jL1: S('Orla Hale taught me the first two lines of the harvest home, from her chair. <i>Oh, the last sheaf\'s in and the barley\'s high.</i>'),
    jL2: S('Orla taught me the third line of the harvest home, the one that goes over the hill. <i>Then it\'s over the hill where the stubble runs gold.</i>'),
    jL3: S('Orla taught me the fourth line, the one Davin could never hold, and the two verses after it. I have all of The Last Sheaf now. "Lyra will sing me down. But it\'s good to know there\'s two."<br><br><i>Oh, the bread\'s on the hearth and the cider\'s poured,<br>and the old ones are sat at the head of the board;<br>then we plait her and hang her up high on the gate,<br>and leave her, and leave her, though the spring come late.</i><br><br><i>Oh, the rest grows back by the break of day,<br>but the last sheaf\'s cut, and she\'s let to stay;<br>then it\'s over the hill, and it\'s down to the stone,<br>and let go, let go, for the sheaf\'s gone home.</i>'),
  };

  // ---- the Song: before any save is restored (ensurePlayerUpgrades filters the player's songs against SONGS)
  const SONG = { name: TX.songName, hz: '—', cost: 12, noise: 7.0, desc: TX.songDesc };
  if (typeof SONGS !== 'undefined' && !SONGS.sheaf) SONGS.sheaf = SONG;

  // the tunes: the Greening's own (js/greening44.js SHEAF and FOURTH), a line at a time
  const LESSON = [
    { title: TX.l1Title, offer: TX.l1Offer, hint: TX.l1Hint, done: TX.l1Done, j: TX.jL1, curve: [[0, 174], [0.8, 196], [1.6, 220], [2.4, 196], [3.2, 174], [5, 174]], wide: 1.05, duration: 5 },
    { title: TX.l2Title, offer: TX.l2Offer, hint: TX.l2Hint, done: TX.l2Done, j: TX.jL2, curve: [[0, 174], [0.8, 196], [1.6, 233], [2.4, 220], [3.2, 196], [4, 174]], wide: 0.85, duration: 4 },
    { title: TX.l3Title, offer: TX.l3Offer, hint: TX.l3Hint, done: TX.l3Done, j: TX.jL3, curve: [[0, 220], [1.0, 262], [2.0, 294], [3.0, 262], [4, 262]], wide: 0.6, duration: 4 },
  ];
  const knows = () => Array.isArray(G.player.songs) && G.player.songs.includes('sheaf');
  const lessonN = () => Number(F().p65_lesson) | 0;
  const open = () => hasG() && !gone() && !!F().p65_told && lessonN() < 3 && !knows();
  const due = () => open() && day() > (Number(F().p65_day) | 0);

  // ---- Orla's quest: the canon follow-up, then the lessons
  function questFor(g) {
    const f = g.flags; if (gone()) return null;
    if (f.boots_delivered && !f.p65_told) {
      return { text: TX.heard, choices: [
        { t: TX.truth, f: () => { f.p65_told = 1; f.p65_day = day(); jr(TX.jTold); return TX.afterTruth + '<br><br>' + TX.offer; } },
        { t: TX.kind, f: () => { f.p65_told = 2; f.p65_day = day(); jr(TX.jTold); return TX.afterKind + '<br><br>' + TX.offer; } },
      ] };
    }
    if (open()) {
      if (!due()) return { text: TX.notToday, journal: null };
      const L = LESSON[lessonN()];
      return { text: L.offer, choices: [
        { t: TX.lessonBtn, f: () => { setTimeout(() => prep(), 0); return null; } },
        { t: TX.goOn, f: () => null },
      ] };
    }
    return null;
  }
  function closeTalk() {
    try { if (G.state === 'dialogue') { closeModal(); } } catch (e) { /* none */ }
    G.state = 'play';
  }
  function prep() {
    closeTalk();
    showEvent(TX.shutTitle, TX.shut, [
      { t: TX.doShut, f: () => { try { passHours(1 / 6); } catch (e) { /* none */ } say(TX.shutDone, '', 4500); lesson(false); } },
      { t: TX.openSing, f: () => lesson(true) },
    ]);
  }
  let busy = false;
  async function lesson(loud) {
    if (busy || !due()) return { ok: false };
    const n = lessonN(), L = LESSON[n], Rd = typeof REEDS !== 'undefined' ? REEDS : null;
    busy = true;
    try {
      G.state = 'play';
      if (loud) {
        F().p65_loud = (Number(F().p65_loud) | 0) + 1;
        try { addNoise(7); } catch (e) { /* none */ }
        say(TX.loud, 'bad', 6500);
      }
      let res = { score: 1 };
      if (Rd && typeof Rd.holdPitch === 'function') {
        const band = typeof Rd.bandFor === 'function' ? Rd.bandFor(0) : 105;
        res = await Rd.holdPitch({ curve: L.curve, width: band * L.wide, duration: L.duration, title: L.title, hint: L.hint });
      }
      F().p65_day = day();
      if (!res || res.aborted || !(res.score >= 0.5)) { say(n === 2 ? TX.failFourth : TX.fail, 'warn', 6500); return { ok: false }; }
      F().p65_lesson = n + 1;
      jr(L.j);
      try { questXp(20 + n * 15); } catch (e) { /* none */ }
      if (n === 2) {
        if (!knows()) G.player.songs.push('sheaf');
        F().g44_knows_sheaf = true;
        showEvent(L.title, L.done, [{ t: TX.goOn, f: null }]);
      } else say(L.done, 'voice', 7000);
      return { ok: true };
    } catch (e) { warnOnce('lesson', e); return { ok: false }; } finally { busy = false; }
  }

  function wire() {
    try {
      if (typeof NPCS !== 'undefined' && NPCS.orla) {
        const own = NPCS.orla.quest;
        NPCS.orla.quest = function (g) {
          try { if (!(g.has && g.has('boots') && !g.flags.boots_delivered)) { const r = questFor(g); if (r) return r; } } catch (e) { warnOnce('quest', e); }
          return own ? own.apply(this, arguments) : null;
        };
      }
    } catch (e) { warnOnce('wire', e); }
  }
  // singing it: the game spends the voice and makes the noise; the harvest home is heard, and in the wilds it is answered
  function wireSong() {
    if (typeof castSong !== 'function') return;
    const _cs = castSong;
    castSong = function (id) {
      if (id !== 'sheaf' || !hasG()) return _cs.apply(this, arguments);
      const v0 = G.player.voice, t0 = G.song ? G.song.t : 0;
      const r = _cs.apply(this, arguments);
      try {
        if (G.player.voice < v0 || (G.song && G.song.t > t0)) {
          try { Audio_.sfx.song(220, 2.4); } catch (e) { /* silent */ }
          say(TX.sang, 'voice', 5000);
          if (G.map && G.map.danger > 0 && typeof spawnHound === 'function') setTimeout(spawnHound, 2000);
        }
      } catch (e) { warnOnce('song', e); }
      return r;
    };
  }
  try { wire(); wireSong(); } catch (e) { console.warn('orla65 failed to wire', e); }

  return { TX, TEXTS, SONG, LESSON, questFor, lesson, prep, due, open };
})();
if (typeof window !== 'undefined') window.ORLA65 = ORLA65;
