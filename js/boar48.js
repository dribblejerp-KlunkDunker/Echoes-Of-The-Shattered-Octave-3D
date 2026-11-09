// ============================================================
//  boar48 — Hearthday at the Boar & Dulcimer, played (Book One ch. 4; ROADMAP R9 item 5).
//
//  js/days35.js lets Davin Hale die at the Boar on Hearthday evening (game day 2, from 20:00) by the clock alone. If you
//  are in the Boar when the hour comes, it happens in front of you:
//    0  THE AFTERNOON. Davin has been drinking with purpose since noon by the hearth; Hetty waters his mug without being
//       asked. From seven, Kaelen and Lyra are at Vane's table, buying berths for eight days.
//    1  HE STANDS UP, and the room stops. He sings The Last Sheaf at full voice, for his mother. Choose what you do
//       while Vane counts [PROPOSED: the three choices, from the Story Brainstorm §5]: get the children and the
//       dye-works women behind the bar (Lyra's own job, done with her); try to stop him (Hetty tries and is pushed into
//       a table; a strong arm or a kind word can hold the line back a beat, never stop it: the Hedge has already heard);
//       or get between the door and the room.
//    2  THE COUNT, one to ten, as the book has it. At six the iron-oaks ring and the birds stop. At eight the song comes
//       back from outside, a quarter-tone flat, in his own voice.
//    3  THEY COME IN THROUGH EVERYTHING: under the sill, down the chimney, through the shutters. Last Rites; the felt
//       sleeve off with Kaelen's teeth, and every hound flinches from the glass; Second Opinion. You fight what is left.
//    4  THE LOUDEST THING. Two of them turn from the bar toward a child who is beginning to whimper. Make yourself the
//       loudest thing in the room (a shout, a bronze weapon rung on the hearth, a shot), or keep still and Vane does it,
//       on purpose, as in the book. Kaelen's fist comes down through the one at the boots; the other flees up the
//       chimney singing The Last Sheaf in Davin's voice.
//    5  AFTER. Davin's boots side by side on the flags, still laced; a patch of dead hearth; the clerk's ledger
//       ("Hale, D. Carter. Dissonant: self-inflicted. No further action."); Hetty wiping the board and chalking the four
//       rules again, her hand perfectly steady.
//  Missing it changes nothing but what you saw: days35 still takes him at eight, and the boots are there when you come
//  in. Figures and hounds are transient and staged from the flags. Flags: p48 (stage), p48_way, p48_drew.
// ============================================================
'use strict';

const BOAR48 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('boar48: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return /^(cantabile|p17)/.test(String((typeof G !== 'undefined' && G && G.mapId) || '')); };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const PI = Math.PI;

  const TAVERN = 'tavern', DAY = 2, AT_HOUR = 20, TOO_LATE = 23, DRINKING = 12, BERTHS = 19;
  const TICK = 1.15;
  const AT = {
    davin: [13.5, 6.2], lyraHearth: [13.0, 6.9], kaelen: [12.4, 8.7], lyra: [13.2, 8.6], boots: [13.8, 6.4], ash: [14.2, 6.5],
    behind: [[2.6, 1.5], [3.6, 1.4], [4.7, 1.5], [5.7, 1.4]], kids: [[9.5, 4.6], [10.5, 3.8], [7.5, 6.2], [11.4, 5.4]],
    gaps: [[14.3, 6.4], [8.5, 10.3], [1.6, 4.8], [1.6, 7.4], [15.2, 3.0]],   // the chimney, the sill, the shutters
  };
  const stage = () => { const v = Number(hasG() ? F().p48 : 0); return Number.isFinite(v) ? Math.max(0, Math.min(9, Math.floor(v))) : 0; };
  const setStage = (n) => { F().p48 = n; };
  const live = () => hasG() && stage() >= 1 && stage() <= 4;
  const R = { ct: -1, ci: 0, ft: -1, kaelenT: 0, step: 0, loud: -1, slow: 0 };

  const TX = {
    leave: S('Leave it.'),
    // the afternoon
    davin: S('Davin Hale, by the hearth'),
    davinLook: S('A big man, thirties, in a carter\'s jerkin, his hands scarred by rope. He has been drinking with purpose since noon, and he is perfectly steady on his feet, which is the worst kind. Hetty waters his mug without being asked and keeps one eye on him while she does it.'),
    davinNear: S('Davin Hale doesn\'t look up from the fire. "My mam sang it every harvest home," he says, to the fire. "Every year of my life."'),
    afternoon: S('A big man by the hearth has been drinking since noon. Hetty waters his mug without being asked.'),
    berths: S('Kaelen Vance and Lyra Ashgrove at Vane\'s table'),
    berthsLook: S('The glass man has put a purse on the felt between them. "Eight days. Hold the berths eight days." Vane puts his hand on it. Lyra stands at Kaelen\'s shoulder with her wrapped hand on his stool and looks at Vane with a steady, measuring look, as if she were counting him.'),
    // 1 he stands up
    standTitle: S('Hearthday, at the Boar & Dulcimer'),
    stand: S('The man by the hearth stands up, and the whole room stops. Every head comes up, every mouth closes, every hand goes flat on the felt, and the hush-lamps whistle from the beams like a field of frightened birds. Lyra\'s hand closes on the back of Kaelen\'s stool. "Davin," she whispers. "Oh, no. Davin, no."<br><br>He lifts his chin and sings. <i>Oh, the last sheaf\'s in and the barley\'s high.</i> Full voice. Not the Narrow. Not a hand\'s width.<br><br>"She sang it," he says, between lines, weeping now. "Every harvest home. And they\'ve put the mark on her door, and they\'re going to burn her in her chair, and nobody\'s allowed to sing it for her. So I\'m going to sing it." In the corner, Vane is counting under his breath.'),
    wayKids: S('Get the children and the dye-works women behind the bar'),
    wayStop: S('Try to stop him'),
    wayDoor: S('Get between the door and the room'),
    kidsGo: S('Lyra is already moving, round the tables, her ruined voice making no sound at all. You go the other way, and between you the dye-works women and the children go behind the bar, low, with their hands over their own mouths.'),
    stopGo: S('Hetty gets there first. She goes at him like a ship coming about, both big hands up, and he puts out an arm without looking and pushes her into a table, and a tankard goes over, and nobody rights it.'),
    stopHeld: S('You get a hand on his arm and your face in front of his, and for one breath he looks at you and the line catches in his throat. Then he goes on. It was always going to go on. The Hedge has already heard.'),
    stopNot: S('You get a hand on his arm. He doesn\'t feel it. He goes on.'),
    doorGo: S('You put your back to the door. It is barred and felted and packed round with wool, and the hounds will not bother with it. You will not know that until nine.'),
    // 2 the count
    c1: S('One.'), c2: S('Two.'), c3: S('Three.'), c4: S('Four.'), c5: S('Five. Lyra reaches him and lays her wrapped hand flat on his chest, over his heart. He keeps singing.'),
    c6: S('Six. Outside, every oak in Oakhaven rings at once, a long rising shimmer of bronze. Then it stops, and every bird in the square stops with it.'),
    c7: S('Seven.'),
    c8: S('Eight. Faintly, from outside, from several directions at once, someone begins to sing The Last Sheaf back, in Davin Hale\'s own voice. A half-beat behind. A quarter-tone flat.'),
    c9: S('Nine. In the corner, Vane laughs.'),
    hudCount: S('Vane\'s count'),
    // 3 the fight
    inThrough: S('They come in through everything: under the sill, down the chimney, through the chinks in the shutters.'),
    lastRites: S('Last Rites goes off like the end of the world. Every hound in the room turns toward the shot, and toward Vane\'s laughter.'),
    sleeve: S('Kaelen tears the felt sleeve off his left arm with his teeth. The glass rings like a struck bell, and every hound in the room flattens and flinches from it.'),
    secondOp: S('Second Opinion goes off. Another hound comes apart in a shower of glass-bright notes.'),
    kaelenHits: S('Kaelen\'s glass fist goes through a hound\'s flank, and the arm drinks what is left of it.'),
    // 4 the loudest thing
    loudTitle: S('The loudest thing in the room'),
    loud: S('Vane has emptied both pistols. Behind the bar, Lyra kneels with two children\'s faces pressed into her chest and her wrapped hand over a third child\'s mouth, being the quietest thing in the room. The child is beginning to whimper.<br><br>Two of the hounds turn from Vane, and cast about, and turn toward the bar.'),
    loudShout: S('Be the loudest thing in the room: shout'),
    loudBell: S('Ring your bell-bronze on the hearthstones'),
    loudShot: S('Fire'),
    loudStill: S('Keep still'),
    youDrew: S('You fill the room with it. Both hounds turn from the bar and come for you, low and fast across the felt, and the first one reaches your boots, and you feel it the way you feel the moment before sleep: a lurch, a loosening. Then a pale blue fist comes down through the middle of it.'),
    vaneDrew: S('You keep still. Vane doesn\'t. He throws back his head and laughs, loud, on purpose, the biggest and ugliest laugh he has, and both hounds turn from the bar and go for him, and he laughs right into their mouths as they come. The first reaches his boots. Then a pale blue fist comes down through the middle of it.'),
    fled: S('The last one breaks and flees up the chimney, singing The Last Sheaf in Davin Hale\'s voice all the way up and out over the square and away toward the Hedge.'),
    // 5 after
    afterTitle: S('Then there was nothing in the Boar & Dulcimer but people breathing'),
    after: S('Nobody speaks for a long time. Davin Hale\'s boots stand on the flags by the hearth, side by side, still laced. Nothing else. A leather mug on its side, and a patch of hearthstone where the ash has gone dead and flat. Kaelen stands in the middle of the room with his left arm bare and blazing, and the ringing is deeper now than it was when he came in. He looks at the arm as though it belongs to someone he does not much like.<br><br>The Legionnaires come eventually, too late, and a Synod clerk with a ledger, who looks at the boots and writes for some time. You read it upside down as he passes: Hale, D. Carter. Dissonant: self-inflicted. No further action.<br><br>Then Hetty Bram goes to the black board by the door and wipes the rules off it, slowly, line by line, and picks up the chalk. NO SINGING. NO TOASTS. NO DICE. NO WEEPING ABOVE A HAND. Her hand does not shake at all.'),
    afterYou: S('Across the felt, Vane is looking at you. "You drew them off the children," he says. "You did it on purpose." It is not quite a question.'),
    afterVane: S('Vane\'s hands are shaking so badly he cannot get his powder-horn open. He puts the pistols down on the felt and sits on them.'),
    afterGo: S('Sit with them'),
    boots: S('Davin Hale\'s boots'),
    bootsLook: S('A carter\'s boots on the flags by the hearth, side by side, still laced. Nobody has moved them. Nobody will until morning.'),
    ash: S('A patch of dead hearth'),
    ashLook: S('Where a hound burst, the ash has gone dead and flat. It will not make a sound when you step on it, for a day or two.'),
    jDone: S('Hearthday at the Boar & Dulcimer: Davin Hale stood up and sang The Last Sheaf for his mother at full voice, and the Hedge sang it back. The hounds came in through the gaps. His boots are by the hearth, still laced. The clerk wrote: Dissonant, self-inflicted. Hetty chalked the rules again.'),
    jYou: S('When two of them turned toward a child behind the bar, I made myself the loudest thing in the room. Vane saw me do it.'),
    jVane: S('When two of them turned toward a child behind the bar, Vane laughed out loud, on purpose, and drew them off.'),
    ledgerWhere: S('the Boar & Dulcimer, Hearthday'),
    vaneLine: S('"You drew them off the children," Vane says, before you have said anything. "At the Boar. I watched you do it. On purpose." He looks at you a long moment. "Most people don\'t, you know. Most people go quiet and let the next loudest thing have it."'),
  };

  // ================================================================ staging (transient figures, from the flags)
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p48 === k);
  function put(m, k, e) {
    let have = keyed(m, k); if (have) return have;
    e = Object.assign(e, { transient: true, _decor: true, _p48: k });
    m.entities.push(e); return e;
  }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p48 && (!pred || pred(e))) m.entities.splice(i, 1); } }
  const fig = (m, k, sprite, pos, o) => put(m, k, Object.assign({ kind: 'deco', sprite, x: pos[0], y: pos[1], scale: 1.0, solid: true, radius: 0.3, facing: PI / 2 }, o || {}));
  const childSprite = () => (Engine.sprites && Engine.sprites.p17c_child) ? 'p17c_child' : 'pim';
  const davinDay = () => { const d = Number(G.day) || 0; return d === DAY && hour() >= DRINKING; };
  function stage0(m) {
    if (!m || m.id !== TAVERN) return;
    const f = F(), s = stage();
    const before = !f.davin_gone && s < 5 && s !== 9 && davinDay();
    const scene = s >= 1 && s <= 4;
    if (before || scene) fig(m, 'davin', 'townsman', s >= 2 ? [AT.davin[0] - 0.2, AT.davin[1]] : AT.davin, { scale: 1.08, label: TX.davin, use: 'p48_look', look: TX.davinLook, facing: PI });
    else drop(m, (e) => e._p48 === 'davin');
    const berths = (before && hour() >= BERTHS) || scene;
    if (berths) {
      fig(m, 'kaelen', 'kaelen', AT.kaelen, { label: TX.berths, use: 'p48_look', look: TX.berthsLook, facing: 0 });
      const lp = s >= 2 ? AT.behind[1] : AT.lyra, ly = fig(m, 'lyra', 'lyra', lp, { scale: 0.96, label: TX.berths, use: 'p48_look', look: TX.berthsLook, facing: PI });
      ly.x = lp[0]; ly.y = lp[1];
    } else drop(m, (e) => e._p48 === 'kaelen' || e._p48 === 'lyra');
    if (scene) {
      const hid = s >= 2;
      for (let i = 0; i < 4; i++) {
        const k = 'kid' + i, pos = hid ? AT.behind[i] : AT.kids[i];
        const e = fig(m, k, i < 2 ? childSprite() : 'townswoman', pos, { scale: i < 2 ? 0.62 : 0.95, solid: false, radius: 0.2, facing: PI / 2 });
        e.x = pos[0]; e.y = pos[1];
      }
    } else drop(m, (e) => /^kid/.test(e._p48));
    // after: the boots and the dead hearth, until the morning after next
    const boots = (s === 5 || ((s === 0 || s === 9) && f.davin_gone)) && (Number(G.day) || 0) <= DAY + 1;
    if (boots) {
      fig(m, 'boots', (Engine.sprites && Engine.sprites.p9p_boots) ? 'p9p_boots' : 'crates', AT.boots, { scale: 0.42, solid: false, radius: 0.2, label: TX.boots, use: 'p48_look', look: TX.bootsLook });
      fig(m, 'ash', 'bones', AT.ash, { scale: 0.01, solid: false, radius: 0.45, label: TX.ash, use: 'p48_look', look: TX.ashLook });
    } else drop(m, (e) => e._p48 === 'boots' || e._p48 === 'ash');
  }

  // ================================================================ 1 · he stands up
  const due = () => hasG() && G.mapId === TAVERN && (Number(G.day) || 0) === DAY && hour() >= AT_HOUR && hour() < TOO_LATE && stage() === 0 && !F().davin_gone_seen;
  function begin() {
    const f = F(); if (stage() !== 0) return;
    setStage(1);   // days35 marks him gone at eight by the clock; here it happens in front of you
    stage0(G.map);
    try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
    showEvent(TX.standTitle, TX.stand, [
      { t: TX.wayKids, f: () => way('kids') },
      { t: TX.wayStop, f: () => way('stop') },
      { t: TX.wayDoor, f: () => way('door') },
    ]);
  }
  function way(w) {
    const f = F(); if (stage() !== 1) return;
    f.p48_way = w; R.slow = 0;
    if (w === 'kids') say(TX.kidsGo, '', 7000);
    else if (w === 'door') say(TX.doorGo, '', 7000);
    else {
      say(TX.stopGo, '', 6000);
      const a = (G.player && G.player.attrs) || {};
      const held = Math.max(Number(a.Strength) || 0, Number(a.Personality) || 0) >= 55;
      R.slow = held ? TICK * 1.6 : 0;
      setTimeout(() => say(held ? TX.stopHeld : TX.stopNot, '', 6000), 900);
    }
    setStage(2); R.ct = 0; R.ci = 0;
    stage0(G.map);
  }

  // ================================================================ 2 · the count
  function tickCount(dt) {
    if (R.ct < 0) return;
    R.ct += dt;
    try { G.noise = Math.max(G.noise, 6); } catch (e) { /* the song is the loudest thing */ }
    while (R.ci < 9 && R.ct >= (R.ci + 1) * TICK + (R.ci >= 3 ? R.slow : 0)) {
      R.ci++;
      say(TX['c' + R.ci], R.ci >= 8 ? 'bad' : '', TICK * 1000 + 1800);
      if (R.ci === 6) { try { Audio_.sfx.bell && Audio_.sfx.bell(); } catch (e) { /* silent */ } }
    }
    if (R.ci === 9 && R.ct >= 10 * TICK + R.slow) { R.ct = -1; inThrough(); }
  }

  // ================================================================ 3 · they come in through everything
  function hound(m, i, pos) {
    let h = null; try { h = hydrate({ kind: 'enemy', type: 'hound', x: pos[0], y: pos[1] }); } catch (e) { h = { kind: 'enemy', type: 'hound', x: pos[0], y: pos[1], hp: 12 }; }
    return Object.assign(h, { transient: true, _p48: 'h' + i, state: 'chase' });
  }
  const hounds = () => (G.map && G.map.entities || []).filter((e) => e && /^h\d$/.test(e._p48 || '') && !e.dead && !e.hidden && !(e.hp <= 0));
  function kill(e) { if (!e) return; e.dead = true; e.hidden = true; e.hp = 0; try { Audio_.sfx.shatter && Audio_.sfx.shatter(); } catch (err) { /* silent */ } }
  const nearestTo = (x, y) => { let best = null, bd = 1e9; for (const h of hounds()) { const d = dist(h.x, h.y, x, y); if (d < bd) { bd = d; best = h; } } return best; };
  function inThrough() {
    if (stage() !== 2) return;
    setStage(3); R.ft = 0; R.step = 0; R.kaelenT = 0;
    const m = G.map;
    if (m && m.id === TAVERN) AT.gaps.forEach((p, i) => { if (!keyed(m, 'h' + i)) m.entities.push(hound(m, i, p)); });
    say(TX.inThrough, 'bad', 6000);
    try { Audio_.sfx.hound(); } catch (e) { /* silent */ }
  }
  function tickFight(dt) {
    R.ft += dt;
    const vane = (G.map.entities || []).find((e) => e && e.kind === 'npc' && e.id === 'vane') || { x: 13.5, y: 9.5 };
    if (R.step === 0 && R.ft >= 0.8) { R.step = 1; kill(nearestTo(vane.x, vane.y)); say(TX.lastRites, 'bad', 6000); }
    if (R.step === 1 && R.ft >= 2.0) { R.step = 2; for (const h of hounds()) h.stun = 1.6; say(TX.sleeve, '', 6000); }
    if (R.step === 2 && R.ft >= 3.4) { R.step = 3; kill(nearestTo(AT.kaelen[0], AT.kaelen[1])); say(TX.kaelenHits, '', 4500); }
    if (R.step === 3 && R.ft >= 4.6) { R.step = 4; kill(nearestTo(vane.x, vane.y)); say(TX.secondOp, 'bad', 5000); }
    if (R.step === 4 && R.ft >= 5.6) {
      R.step = 5;
      const left = hounds();
      while (left.length > 2) kill(left.pop());
      while (hounds().length < 2) { const i = 5 + hounds().length; G.map.entities.push(hound(G.map, i, AT.gaps[0])); }
      for (const h of hounds()) { h.stun = 0; h.state = 'idle'; }
      setStage(4); loudCard();
    }
  }

  // ================================================================ 4 · the loudest thing in the room
  function loudCard() {
    const p = G.player, w = p && p.weapons ? WEAPONS[p.weapons[p.weapon]] : null;
    const ch = [{ t: TX.loudShout, f: () => drew('you') }];
    if (w && w.type === 'bronze') ch.push({ t: TX.loudBell, f: () => drew('you') });
    if (w && w.ranged && w.ammo && G.has && G.has(w.ammo)) ch.push({ t: TX.loudShot, f: () => drew('you', w.ammo) });
    ch.push({ t: TX.loudStill, f: () => drew('vane') });
    showEvent(TX.loudTitle, TX.loud, ch);
  }
  function drew(who, ammo) {
    const f = F(); if (stage() !== 4) return;
    f.p48_drew = who;
    if (ammo) { try { G.take(ammo); } catch (e) { /* none */ } }
    if (who === 'you') { try { addNoise(8); } catch (e) { /* none */ } }
    const hs = hounds();
    kill(hs[0]);
    if (hs[1]) { hs[1].dead = true; hs[1].hidden = true; }
    say(TX.fled, '', 7000);
    showEvent(TX.loudTitle, who === 'you' ? TX.youDrew : TX.vaneDrew, [{ t: TX.afterGo, f: () => afterCard() }]);
  }

  // ================================================================ 5 · after
  function afterCard() {
    const f = F(); if (stage() !== 4) return;
    setStage(5); f.davin_gone = true; f.davin_gone_seen = true;
    for (const h of (G.map.entities || []).filter((e) => e && /^h\d$/.test(e._p48 || ''))) kill(h);
    drop(G.map, (e) => /^h\d$/.test(e._p48));
    const old = G.ledger || (G.ledger = []);
    if (!old.some((r) => r && r.name === 'Davin Hale')) old.push({ name: 'Davin Hale', where: TX.ledgerWhere, day: G.day });
    try { journal('main', TX.jDone); journal('side', f.p48_drew === 'you' ? TX.jYou : TX.jVane); } catch (e) { /* none */ }
    try { questXp(f.p48_drew === 'you' ? 50 : 30); } catch (e) { /* none */ }
    stage0(G.map);
    showEvent(TX.afterTitle, TX.after + '<br><br>' + (f.p48_drew === 'you' ? TX.afterYou : TX.afterVane), [{ t: TX.afterGo, f: null }]);
  }
  function missed() {
    if (!hasG() || inExtra()) return;
    const f = F(), s = stage(), d = Number(G.day) || 0;
    if (s !== 0) return;
    if (d > DAY || (d === DAY && hour() >= TOO_LATE) || (d === DAY && hour() >= AT_HOUR && G.mapId !== TAVERN)) setStage(9);
  }

  // ================================================================ the HUD, the tick, the wiring
  function drawOverlay() {
    if (!hasG() || G.state !== 'play' || stage() !== 2 || R.ct < 0) return;
    const ctx = Engine.ctx; if (!ctx) return;
    ctx.save(); ctx.font = '12px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6a40';
    ctx.fillText(TX.hudCount + ' · ' + Math.max(1, R.ci), 160, (typeof VIEW_H === 'number' ? VIEW_H : 150) - 30);
    ctx.restore();
  }
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || guest() || inExtra()) return;
    try {
      missed();
      if (due()) { begin(); return; }
      const s = stage();
      if (G.mapId !== TAVERN) return;
      if (s === 2) tickCount(dt);
      else if (s === 3) tickFight(dt);
    } catch (e) { warnOnce('tick', e); }
  }
  // Vane says it to you, once, the next time you speak with him
  const vaneReady = (f) => f.p48_drew === 'you' && stage() === 5 && !f.p48_vane;
  function onLoad() {
    if (!hasG()) return;
    try {
      if (G.mapId === TAVERN) {
        stage0(G.map);
        if (davinDay() && !F().davin_gone && stage() === 0) say(TX.afternoon, '', 6000);
        if (stage() === 3) { R.ft = Math.max(R.ft, 0); }
      }
    } catch (e) { warnOnce('load', e); }
  }
  function useOwn(e) {
    if (!e || !e._p48) return false;
    if (e.use === 'p48_look') {
      if (e._p48 === 'davin' && stage() === 0) { say(TX.davinNear, 'voice', 6000); return true; }
      showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true;
    }
    return false;
  }
  function wire() {
    if (typeof update === 'function') { const _u = update; update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; }; }
    if (typeof drawHUD === 'function') { const _d = drawHUD; drawHUD = function () { const r = _d.apply(this, arguments); try { drawOverlay(); } catch (e) { warnOnce('hud', e); } return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const n = e && e.id === 'vane' && typeof NPCS !== 'undefined' ? NPCS.vane : null;
        if (!n || !hasG() || guest() || !vaneReady(F())) return _t.apply(this, arguments);
        const own = n.quest;
        n.quest = function (g) { if (vaneReady(g.flags)) { g.flags.p48_vane = true; return { text: TX.vaneLine }; } return own ? own.apply(this, arguments) : null; };
        try { return _t.apply(this, arguments); } finally { n.quest = own; }
      };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); if (fn === 'restoreGame') { R.ct = stage() === 2 ? 0 : -1; R.ci = 0; R.ft = stage() === 3 ? 0 : -1; R.step = 0; } onLoad(); return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('boar48 failed to wire', e); }

  return { TX, TEXTS, AT, R, DAY, AT_HOUR, TICK, stage, live, due, begin, way, inThrough, drew, afterCard, hounds, stage0, missed, vaneReady };
})();
if (typeof window !== 'undefined') window.BOAR48 = BOAR48;
