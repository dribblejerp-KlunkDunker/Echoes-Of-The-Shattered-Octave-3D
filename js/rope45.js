// ============================================================
//  rope45 — Grab the Line, played (Book One ch. 12; ROADMAP R9 item 2).
//
//  The Note has stopped and the Drift-Kestrel has come down over the North Gate (js/greening44.js). The book tells this
//  chapter from Vane's deck; the traveller arrives with the four hundred in the mud, so the scene starts there:
//    1  THE LINE. Mags puts the line over at forty feet. The town does not rush it: Hetty on the mounting-block making a
//       queue with her forearms, Bettany pulling the children forward, Rooke doing triage with two lamps and no table.
//       Vane wants arms at the drum [PROPOSED]: go up and work the winch with Mags, or stay at the foot of the line with
//       the Governor and load.
//    2  THE DRUM (on deck). Haul on the beat with Mags, four at a time, knots at four feet. Vane counts them onto the
//       deck: four, eight, eleven ("Captain—" "I can count."), thirteen, fifteen. The ship is settling; the oaks are not.
//    1g THE FOOT OF THE LINE (in the mud) [PROPOSED]. Put people on the knots with Aldric Vance, who has been doing it
//       for twenty minutes; hear the count from above.
//    3  EIGHTEEN. The hounds come into the canopy (a woman singing about lambs and dusk, a man's tenor missing a high
//       note, a child laughing). The jitter drops onto the line and goes through the old man at the bottom; his hands
//       stay on the knot, then fall (canon, whatever you do). On deck it comes over the rail: strike it yourself, or
//       Kaelen comes over the port rail and takes it out of the air with his glass fist (canon). "Get them up!" Three up.
//       Twenty-one.
//    4  LYRA, AND THE LAST LOAD. Lyra comes up with the last four before the last (with Lissa Merrow roped under the arms
//       and Tobiah with his charts: the books-check fix N1, so that ch. 13 holds), and cannot make a sound. "I know. I
//       know. They're coming." From the foot of the line, Aldric puts you on that load [PROPOSED]. The last load is five:
//       the dye-works woman, two carters, a woman screaming a name, and the Governor at the bottom. "Take her up."
//    5  THE COUNT. The ship goes sideways, the rope snags in a crown, the drum starts to come out of the deck, and Vane
//       counts one to ten, as the book has it. Your only input is where you look. Hold on to the drum at ten and the Echo
//       plays [PROPOSED, GDD 4.9]: the drum tears out, the Kestrel goes into the crown, the Tide-Weaver: "I have watched you
//       choose this four hundred and eleven times." You are back at nine. "Do it," says Kaelen. Vane cuts.
//    6  AFTER. She comes up like a cork. Three hundred and eighty people in the mud, waving. Six feet of cut rope hanging
//       from the drum; nobody coils it. Then game.js's end card, told as you played it.
//    7  done.
//  The deck is js/kestrel16.js's map; it is allowed aboard during stages 2–6 (aboard()), and its ladder and hatch are shut
//  until the cut. Figures are transient and staged again on load. The Greening's clock stands still for the scene.
// ============================================================
'use strict';

const ROPE45 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('rope45: ' + k + ' failed', e); } };
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const px = () => Engine.cam.x, py = () => Engine.cam.y;
  const fmt = (t, ...a) => String(t).replace(/\{(\d+)\}/g, (m, i) => a[+i] != null ? a[+i] : m);
  let MSG_VO = null, CARD_VO = null, voTok = 0;
  const say = (t, cls, ms) => { try { msg(String(t).replace(/<\/?i>/g, ''), cls || '', ms || 5200); } catch (e) { /* cosmetic */ } const ids = MSG_VO && MSG_VO.get(t); if (ids) seq(ids); };
  const card = (title, body, choices) => {
    const hushed = (choices || []).map((c) => Object.assign({}, c, { f: function () { hush(); return c.f && c.f.apply(this, arguments); } }));
    try { showEvent(title, body, hushed); } catch (e) { warnOnce('card', e); }
    const v = CARD_VO && CARD_VO.find(([t]) => String(body).startsWith(t)); if (v) seq(v[1]);
  };
  const voiced = () => typeof VOICE_ACT !== 'undefined' && !!VOICE_ACT.LINES && (typeof VOICES === 'undefined' || ['acted', 'spoken'].includes(VOICES.mode));
  function hush() { voTok++; try { const c = VOICE_ACT.state && VOICE_ACT.state.current; if (c) { c.stop(); VOICE_ACT.state.current = null; } } catch (e) { /* nothing playing */ } }
  function seq(ids) {
    if (!voiced()) return;
    const tok = ++voTok; let i = 0;
    const next = () => {
      while (tok === voTok && i < ids.length) {
        const id = ids[i++], l = VOICE_ACT.LINES[id];
        if (!l) continue;
        let d = 0; try { d = VOICE_ACT.playLine(Object.assign({ id }, l), { interrupt: true }) || 0; } catch (e) { warnOnce('line', e); }
        if (d > 0 && i < ids.length) setTimeout(next, (d + 0.3) * 1000);
        return;
      }
    };
    next();
  }

  // ================================================================ the words (Book One ch. 12, ll. 3583–3814)
  const TX = {
    // 1 the line
    lineTitle: S('The line'),
    line: S('The Drift-Kestrel comes down to forty feet and holds there, with the envelope taking a beating from the updraught off all that new wood, and Mags puts the line over, and four hundred people look up at it.<br><br>They do not rush it. Hetty Bram is on the mounting-block by the gatepost, pushing people into a queue with her forearms. Bettany is going down the line pulling children out and moving them forward. Rooke is doing triage on the ground with two lamps and no table. They take the children first: four at a time on the knotted line, the biggest child with the smallest tied against her chest with a shawl, and Mags on the winch drum taking them up hand over hand with her jaw set.<br><br>From forty feet up, Vane\'s voice: "Arms! One with arms, for the drum!" Hetty looks at you.'),
    lineUp: S('Go up and work the drum with Mags'),
    lineStay: S('Stay at the foot of the line with the Governor'),
    climb: S('You go up the knots between two loads of children, forty feet with the green coming in under you, and Mags takes you by the collar at the rail and puts your hands on the drum beside hers without a word. She cannot hear you. She does not need to.'),
    jStart: S('The Kestrel came down over the North Gate and Mags put the line over. They are taking the children first, four to a line.'),
    // 2 the drum
    drumHint: S('Haul the drum with Mags: use it on the beat. Four to a load, knots at four feet.'),
    lookDrum: S('The winch drum'),
    lookDrumText: S('The winch drum, bolted through the deck-beams. The line runs off it over the rail and down forty feet into the mud.'),
    haulGood: S('The drum turns over, and the line comes up a knot.'),
    haulSlip: S('Off the beat: the drum jerks and the load swings below you.'),
    four: S('Four.'),
    eight: S('Eight.'),
    eleven: S('Eleven.'),
    captain: S('"Captain—" says the engineer. "I can count."'),
    fifteen: S('Thirteen. Fifteen.'),
    settling: S('The Kestrel is settling. You can feel it through the drum: she is a hundred feet lower than she was ten minutes ago, and the iron-oaks on the common are not a hundred feet lower than they were ten minutes ago. They are higher. The trees are coming up at you.'),
    hudDrum: S('THE DRUM'),
    hudCount: S('aboard'),
    hudSettle: S('SETTLING'),
    lookMags: S('Mags'),
    lookMagsText: S('Mags on the drum, hand over hand, jaw set. She cannot hear the count. She is watching Vane\'s mouth.'),
    lookVane: S('Captain Vane'),
    lookVaneText: S('Vane at the wheel, holding her at forty feet, counting them onto the deck.'),
    lookEngineer: S('The engineer'),
    lookEngineerText: S('The engineer, with the slate, doing sums he does not like out loud.'),
    // 1g the foot of the line
    footHint: S('Put them on the knots with the Governor: use the next in the queue. Four to a load.'),
    lookAldric: S('Governor Aldric Vance'),
    lookAldricText: S('A big grey-headed old man in a chain of bronze oak-leaves, taking people by the elbows and putting them on the rope and sending them up, and stepping back for the next one. He has been doing it for twenty minutes.'),
    lookQueue: S('The next in the queue'),
    putOn: S('You take them by the elbows and put their boots on the knot, and the line goes up.'),
    countAbove: S('From forty feet up, Vane, counting them onto the deck: "{0}"'),
    hudFoot: S('THE FOOT OF THE LINE'),
    // 3 eighteen
    canopy: S('From the new green of the oaks to starboard, a woman\'s voice, singing something sweet and patient about lambs and dusk; then a man\'s cracked tenor going up and up for a high note and missing it; then, very clearly, a child laughing.'),
    vaneUp: S('"Up," Vane says. "Mags — up, get them—"'),
    jitterTitle: S('At eighteen'),
    jitter: S('The jitter comes out of the crown of the nearest oak and drops onto the line. There are four on the rope: a young man near the top, then two women, then an old man at the bottom with his boots hooked in a knot. It goes down the line the way a spider goes down silk, and it does not stop at the old man. It goes through him. His shape goes soft at the edges, then grainy, like a charcoal drawing with a thumb dragged across it, and the screaming thins into static in a breath and a half.<br><br>His hands stay on the rope. Just the hands, gripping the knot, for perhaps a second, before they come off and fall.<br><br>Then the thing comes up the line after the women.'),
    jitterDeck: S('It comes up the rope toward the rail and the drum, toward you.'),
    jitterFoot: S('From the mud you see the hands come off the knot. They fall at your feet.'),
    jitterGo: S('...'),
    fightHint: S('Over the rail: strike it before it reaches the women.'),
    youStruck: S('You meet it at the rail and it bursts into a spray of bright falling notes and a laugh you will hear again at three in the morning, for years. Kaelen comes over the port rail a breath later with his arm blazing like a lamp, and finds nothing left to hit. "Get them up!" he shouts.'),
    kaelenStruck: S('Kaelen Vance comes over the port rail with his left sleeve gone and his arm blazing like a lamp with a white-hot wick, and puts himself between the winch and the line, and when the jitter comes over the rail he takes it out of the air with his glass fist. It bursts into a spray of bright falling notes and a laugh. "Get them up!" he shouts.'),
    kaelenFoot: S('Up on the rail, a light like a lamp with a white-hot wick: Kaelen, with his arm bare, and the thing bursts into a spray of bright falling notes. "Get them up!"'),
    threeUp: S('They get the three up. The old man on the deck-boards is a pair of boots and a knitted cap and nothing else, and one of the women who came over the rail after him has blood on her, though there was no blood, because she bit through her own lip getting up the rope.<br><br>Twenty-one.<br><br>The engineer has Vane\'s arm in both hands, crying without knowing it. "Captain, we are at twenty-one souls and the crates and we are going down. Not slow. Look at the trees. Look at the trees, Captain—"'),
    threeGo: S('The last loads'),
    // 4 Lyra and the last load
    lyraTitle: S('The last four before the last'),
    lyraDeck: S('Lyra Ashgrove comes up with the last four before the last: Lissa Merrow roped under the arms, Tobiah Marsh with his charts down his shirt, and a carter\'s boy. She comes over the rail like a dropped coat, and Hetty and Bettany get her under the arms, and she cannot stand. There is blood down the front of a shift that was white this morning and a hole under her jaw where a copper wire was. She gets a hand into Kaelen\'s collar and pulls his ear down to her mouth, and tries to say something, and nothing comes out at all. Not a rasp. Nothing.<br><br>"I know," Kaelen says. "I know. They\'re coming."'),
    lyraFoot: S('Aldric puts Lyra on the knot himself, and Lissa Merrow roped under the arms, and Tobiah Marsh with his charts down his shirt. Then he takes you by the shoulder, not hard, the way you move a man out of a doorway. "You. Up with her. Keep her on the knot." You go up the rope under her, forty feet, with her boots on your hands, and over the rail. Hetty and Bettany get her under the arms; she cannot stand, and she cannot make a sound.<br><br>"I know," Kaelen says. "I know. They\'re coming."'),
    lastLoad: S('Mags puts the line down for the last load. Five go onto it. From the rail you see them from above: an old woman in a dye-works apron, the same one who was pulling children out of the queue; two carters who have been passing children up all afternoon; a woman screaming somebody\'s name up at the ship. And at the bottom, last, with his boots on the lowest knot and one arm through it and the other hand still on the shoulder of the man he has just pushed up ahead of himself, a big grey-headed old man in a Governor\'s chain of bronze oak-leaves.<br><br>"Take her up," Vane says.<br><br>Mags winds. The line comes up. And the Drift-Kestrel, sixty feet lower than she was at the start of it, does not go with it. She goes sideways. The wind comes round and pushes her, and the line and the five on it swing out and down, and the crown of an iron-oak that was a sapling at breakfast comes up through the arc like a hand closing. The rope goes into the branches. The rope snags.'),
    lastGo: S('Hold on'),
    // 5 the count
    countHint: S('Look where you will.'),
    c1: S('One. Twenty-one people on the deck. Nine of them children.'),
    c2: S('Two. The old woman on the line has her feet on the branches and is trying to get one of the carters off the rope and into the tree.'),
    c3: S('Three. Mags, at the winch, with the axe already in her fist, looking at Vane. She will not swing it without an order.'),
    c4: S('Four. The deck-beam under the drum goes off like a musket.'),
    c5: S('Five. Vane takes the axe out of Mags\'s hands.'),
    c6: S('Six. Kaelen comes up to the rail and looks down the line at his father.'),
    c7: S('Seven. Aldric Vance looks up.'),
    c8: S('Eight. He lets go of the rope with one hand and raises it, palm out, the way a man waves a cart on past a hole in the road.'),
    c9: S('Nine. "Do it," says Kaelen.'),
    c10: S('Ten.'),
    drumOut: S('"The drum, Captain, the drum\'s coming out of the deck—"'),
    holdDrum: S('You have both hands on the drum. You are not letting go.'),
    hudTen: S('THE COUNT'),
    // the Echo
    echoTitle: S('An Echo'),
    echo: S('You do not let go of the drum, and nobody cuts.<br><br>The drum tears out of the deck with the beam still bolted to it, and the Kestrel goes into the crown after the rope, and the leaves close over the envelope, and twenty-one people go into the green with you, nine of them children.<br><br>Somewhere outside the colour of it, the Tide-Weaver: "I have watched you choose this four hundred and eleven times."<br><br>You are back at nine.'),
    echoGo: S('Nine'),
    // 6 after
    afterTitle: S('Like a cork'),
    after: S('Vane cuts the line.<br><br>She comes up like a cork. That is the obscene part. The instant the rope goes, the Kestrel sheds three hundred pounds and the tree\'s grip together, and she leaps a hundred and fifty feet into the green afternoon, and everyone on deck goes down on their knees with the surge of it. Below, five people fall forty feet into a canopy that did not exist this morning, and the canopy closes over them.<br><br>At eight hundred feet the town goes small, and the green keeps coming. In the trampled mud by the North Gate, three hundred and eighty people stand in the last clear ground in the world and watch the only ship go away. Some of them are waving. Not shaking fists. Waving, the way you wave a cart on past a hole in the road.<br><br>There is six feet of rope hanging from the winch drum, cut clean, swinging. Nobody coils it.'),
    afterSaw: S('You saw his hand go up. You were looking.'),
    afterLooked: S('You were not looking at the line at eight. You will wonder, later, what his face was doing.'),
    afterPim: S('Pim Carder is at the hatch. He has seen all of it, and he is looking at Vane with his mouth a little open and his hands held out stiff in front of him. Vane opens his mouth to say something, and nothing comes up at all.'),
    afterGo: S('North-east, into the wind'),
    jCut: S('Vane cut the line on ten. Aldric Vance was at the bottom of the last load, and he looked up and waved us on like a cart past a hole in the road. Kaelen said "Do it." Twenty-one aboard, nine of them children, and three hundred and eighty in the mud by the North Gate, waving. Six feet of cut rope hangs from the drum.'),
    ledgerWhere: S('the last load, the North Gate'),
    ledgerOld: S('The old man on the rope at eighteen'),
    ropeLabel: S('Six feet of cut rope hanging from the winch drum. Nobody has coiled it.'),
    // the end card
    endDeck: S('You worked the winch drum with Mags while Vane counted them onto the deck, four to a line, children first{0}. At eighteen the hounds came into the canopy and a jitter went through the old man at the bottom of the rope; his hands stayed on the knot a moment before they fell.'),
    endDeckYou: S(', and you met the jitter at the rail before Kaelen did'),
    endFoot: S('You stood at the foot of the line with Aldric Vance and put his town on the knots, four at a time, until he put you on Lyra\'s load with one hand on your shoulder and sent you up.'),
    endCount: S('On the last load the Governor was at the bottom. The line snagged in a crown, the drum began to come out of the deck, and Vane counted to ten. Aldric Vance looked up and waved the cart on past a hole in the road. "Do it," said Kaelen. Six feet of cut rope hung from the drum for six days.'),
    endEcho: S('You held on to the drum at ten, once, and saw where that goes. Then you were back at nine.'),
  };

  // ================================================================ the voices
  const VO = {
    line: ['vane.rope.arms'],
    four: ['vane.rope.four'], eight: ['vane.rope.eight'], eleven: ['vane.rope.eleven'], captain: ['engineer.rope.captain', 'vane.rope.icancount'], fifteen: ['vane.rope.fifteen'],
    vaneUp: ['vane.rope.up'],
    youStruck: ['kaelen.rope.getthemup'], kaelenStruck: ['kaelen.rope.getthemup'], kaelenFoot: ['kaelen.rope.getthemup'],
    threeUp: ['engineer.rope.down'],
    lyraDeck: ['kaelen.rope.iknow'], lyraFoot: ['aldric.rope.you', 'kaelen.rope.iknow'],
    lastLoad: ['vane.rope.takeup'],
    drumOut: ['engineer.rope.drum'],
    c1: ['vane.rope.n1'], c2: ['vane.rope.n2'], c3: ['vane.rope.n3'], c4: ['vane.rope.n4'], c5: ['vane.rope.n5'], c6: ['vane.rope.n6'], c7: ['vane.rope.n7'], c8: ['vane.rope.n8'],
    c9: ['vane.rope.n9', 'kaelen.rope.doit'], c10: ['vane.rope.n10'],
    echo: ['weaver.rope.echo'],
  };
  const MSGS = ['four', 'eight', 'eleven', 'captain', 'fifteen', 'vaneUp', 'drumOut', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
  MSG_VO = new Map(MSGS.map((k) => [TX[k], VO[k]]));
  CARD_VO = Object.keys(VO).filter((k) => !MSGS.includes(k)).map((k) => [TX[k], VO[k]]);

  // ================================================================ the ground and the deck
  const DECK = 'p16k_kestrel_deck', OX = 16, OY = 14;
  const L = (lx, ly) => [OX + lx, OY + ly];          // ship-local to map (js/kestrel16.js)
  const AT = {
    drum: L(9.0, 7.4), line: L(9.0, 8.45), you: L(10.3, 6.5), mags: L(10.3, 7.7), vane: L(3.2, 6.7), vaneCut: L(7.9, 7.7), engineer: L(6.0, 7.0),
    kaelenIn: L(11.0, 1.6), kaelen: L(9.9, 8.1), lyra: L(12.4, 7.2), hetty: L(13.1, 6.6), bettany: L(13.1, 7.8), nell: L(12.5, 5.6), pim: L(12.9, 5.4),
    rail: L(9.0, 8.3), crowdFrom: [14.5, 2.0],
  };
  const FOOT = { line: [23.5, 6.6], aldric: [22.9, 7.2], queue: [[23.5, 8.0], [23.1, 8.8], [23.9, 9.6], [23.3, 10.4], [23.7, 11.2]] };
  const COUNTS = [4, 8, 11, 13, 15, 18], SAYS = ['four', 'eight', 'eleven', 'captain', 'fifteen', null];
  const BEAT = 1.25, WINDOW = 0.22, HAULS = 3, MAGS_RATE = 0.16, FOOT_RATE = 0.22, JITTER_SECS = 8, TICK = 1.7;

  const stage = () => (hasG() && F().r45) | 0;
  const setStage = (n) => { F().r45 = n; };
  const aboard = () => hasG() && stage() >= 2 && stage() <= 6;
  const active = () => hasG() && stage() >= 1 && stage() <= 6;
  const R = { beat: 0, prog: 0, jitterT: 0, ct: -1, ci: 0, settle: 0, said: {}, haulCool: 0 };

  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._r45 === k);
  function put(m, k, e) {
    let have = keyed(m, k); if (have) return have;
    e = Object.assign(e, { transient: true, _decor: true, nopick: true, _r45: k });
    m.entities.push(e); return e;
  }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._r45 && pred(e)) m.entities.splice(i, 1); } }
  const fig = (m, k, sprite, pos, o) => put(m, k, Object.assign({ kind: 'deco', sprite, x: pos[0], y: pos[1], scale: 1.0, solid: true, radius: 0.3, facing: Math.PI / 2 }, o || {}));

  // ================================================================ staging
  function stageDeck(m) {
    if (!m || m.id !== DECK || !aboard()) return;
    const s = stage(), f = F();
    for (const e of m.entities) if (e && !e._r45 && (e.sprite === 'p16k_rope')) { e.hidden = s < 6; e.label = TX.ropeLabel; e.x = AT.line[0] - 0.5; e.y = AT.line[1] - 0.6; }
    fig(m, 'drum', 'lever', AT.drum, { scale: 0.9, radius: 0.35, use: 'r45_drum', label: TX.lookDrum, look: TX.lookDrumText });
    if (s < 6) fig(m, 'line', 'ladder', AT.line, { scale: 1.3, solid: false, radius: 0.1, label: TX.lookDrum, look: TX.lookDrumText });
    else drop(m, (e) => e._r45 === 'line');
    fig(m, 'mags', 'mags', AT.mags, { facing: Math.PI, use: 'r45_look', label: TX.lookMags, look: TX.lookMagsText });
    const v = fig(m, 'vane', 'vane', AT.vane, { facing: 0, use: 'r45_look', label: TX.lookVane, look: TX.lookVaneText });
    if (s >= 5) { v.x = AT.vaneCut[0]; v.y = AT.vaneCut[1]; v.facing = Math.PI / 2; }
    fig(m, 'engineer', 'townsman', AT.engineer, { facing: 0, use: 'r45_look', label: TX.lookEngineer, look: TX.lookEngineerText });
    if (f.pim_safe) { fig(m, 'nell', 'nell', AT.nell, { facing: Math.PI / 2 }); fig(m, 'pim', 'pim', AT.pim, { facing: Math.PI / 2, scale: 0.6 }); }
    const k = fig(m, 'kaelen', 'kaelen', AT.kaelen, { facing: Math.PI / 2, lightCol: [18, 66, 58] }); k.hidden = s < 4 && !f.r45_kaelen;
    if (s >= 4) { fig(m, 'lyra', 'lyra', AT.lyra, { facing: Math.PI, scale: 0.9, yOff: -0.08 }); fig(m, 'hetty', 'hetty', AT.hetty, { facing: Math.PI }); fig(m, 'bettany', 'bettany', AT.bettany, { facing: Math.PI }); }
    // the people counted onto the deck so far: children small, in the middle, as Bettany puts them
    const n = Math.min(14, Math.ceil((f.r45_count | 0) / 1.6));
    for (let i = 0; i < 14; i++) {
      const e = keyed(m, 'aboard' + i);
      if (i >= n) { if (e) e.hidden = true; continue; }
      const lx = AT.crowdFrom[0] + (i % 5) * 1.05, ly = AT.crowdFrom[1] + Math.floor(i / 5) * 1.3;
      const o = fig(m, 'aboard' + i, i % 3 === 1 ? 'townsman' : 'townswoman', L(lx, ly), { facing: Math.PI / 2, scale: i < 9 ? 0.66 : 0.95, solid: false }); o.hidden = false;
    }
  }
  function stageFoot(m) {
    if (!m || m.id !== 'oakhaven' || stage() !== 1 || F().r45_way !== 'foot') return;
    fig(m, 'line', 'ladder', FOOT.line, { scale: 2.4, solid: false, radius: 0.1, yOff: 0.2, label: TX.lookDrum, look: TX.lookDrumText });
    fig(m, 'aldric', 'aldric', FOOT.aldric, { facing: Math.PI / 2, use: 'r45_look', label: TX.lookAldric, look: TX.lookAldricText });
    FOOT.queue.forEach((p, i) => fig(m, 'queue' + i, i % 2 ? 'townsman' : 'townswoman', p, { facing: -Math.PI / 2, scale: i === 0 ? 0.7 : 0.95, use: 'r45_put', label: TX.lookQueue }));
  }

  // ================================================================ 1 · the line
  function begin() {
    if (!hasG() || stage() !== 0) return;
    const f = F(); setStage(1); f.r45_count = 0; f.r45_load = 0;
    journal('main', TX.jStart);
    card(TX.lineTitle, TX.line, [
      { t: TX.lineUp, f: () => { f.r45_way = 'deck'; card(TX.lineTitle, TX.climb, [{ t: TX.lookDrum, f: () => toDeck(2) }]); } },
      { t: TX.lineStay, f: () => { f.r45_way = 'foot'; stageFoot(G.map); say(TX.footHint, 'warn', 8000); } },
    ]);
  }
  function toDeck(s) {
    setStage(s);
    try { loadMap(DECK, { x: AT.you[0], y: AT.you[1], dir: Math.PI / 2 }); } catch (e) { warnOnce('deck', e); }
    if (s === 2) say(TX.drumHint, 'warn', 8000);
  }
  // a load is done: the next count, said from the wheel
  function loaded() {
    const f = F(), i = f.r45_load | 0; if (i >= COUNTS.length) return;
    f.r45_load = i + 1; f.r45_count = COUNTS[i];
    if (f.r45_way !== 'foot') { if (SAYS[i]) say(TX[SAYS[i]], '', 3600); }
    else if (SAYS[i] && SAYS[i] !== 'captain') { say(fmt(TX.countAbove, TX[SAYS[i]]), 'voice', 3600); seq(VO[SAYS[i]]); }
    if (i === 3 && !R.said.settle) { R.said.settle = true; setTimeout(() => { try { if (stage() <= 2) say(TX.settling, '', 8000); } catch (e) { /* cosmetic */ } }, 3500); }
    if (G.mapId === DECK) stageDeck(G.map);
    if (f.r45_load >= COUNTS.length) eighteen();
  }
  function haul() {
    if (stage() !== 2) return false;
    if (R.haulCool > 0) return true;
    R.haulCool = 0.25;
    const ph = R.beat % BEAT, d = Math.min(ph, BEAT - ph);
    if (d <= WINDOW) { R.prog += 1; if (!R.said.good) { R.said.good = true; say(TX.haulGood, 'good', 2500); } try { Audio_.sfx.ui(); } catch (e) { /* silent */ } }
    else { R.prog += 0.35; if (!R.said.slip) { R.said.slip = true; say(TX.haulSlip, 'warn', 3000); } }
    if (R.prog >= HAULS) { R.prog = 0; loaded(); }
    return true;
  }
  function putOn(e) {
    if (stage() !== 1 || F().r45_way !== 'foot') return false;
    R.prog += 1; say(TX.putOn, '', 2500);
    if (R.prog >= HAULS) { R.prog = 0; loaded(); }
    return true;
  }
  function tickDrum(dt) {
    R.beat += dt; R.haulCool = Math.max(0, R.haulCool - dt);
    R.prog += dt * MAGS_RATE;                      // Mags hauls alone if you do not; never stuck
    R.settle = Math.min(1, R.settle + dt / 90);
    if (R.prog >= HAULS) { R.prog = 0; loaded(); }
  }
  function tickFoot(dt) {
    if (G.mapId !== 'oakhaven') return;
    if (!keyed(G.map, 'aldric')) stageFoot(G.map);
    R.prog += dt * FOOT_RATE;                     // Aldric loads them whether you help or not
    if (R.prog >= HAULS) { R.prog = 0; loaded(); }
  }

  // ================================================================ 3 · eighteen
  function eighteen() {
    const f = F(); if (f.r45_jitter) return;
    say(TX.canopy, 'voice', 8000); setTimeout(() => { try { say(TX.vaneUp, '', 4000); } catch (e) { /* cosmetic */ } }, 1800);
    try { Audio_.sfx.hound(); } catch (e) { /* silent */ }
    const old = G.ledger || (G.ledger = []);
    if (!old.some((r) => r && r.name === TX.ledgerOld)) old.push({ name: TX.ledgerOld, where: TX.ledgerWhere, day: G.day });
    if (f.r45_way === 'foot') {
      f.r45_jitter = 'kaelen'; setStage(3);
      card(TX.jitterTitle, TX.jitter + '<br><br>' + TX.jitterFoot + '<br><br>' + TX.kaelenFoot, [{ t: TX.threeGo, f: () => lyraUp() }]);
      return;
    }
    f.r45_jitter = 'pending'; setStage(3);
    card(TX.jitterTitle, TX.jitter + '<br><br>' + TX.jitterDeck, [{ t: TX.jitterGo, f: () => {
      R.jitterT = JITTER_SECS; say(TX.fightHint, 'bad', 5000);
      if (G.mapId === DECK) G.map.entities.push(Object.assign(hydrate({ kind: 'enemy', type: 'hound', x: AT.rail[0], y: AT.rail[1] }), { transient: true, _r45: 'jitter', state: 'chase' }));
    } }]);
  }
  function tickJitter(dt) {
    const f = F(); if (f.r45_jitter !== 'pending' || R.jitterT <= 0) return;
    R.jitterT -= dt;
    const j = keyed(G.map, 'jitter');
    const dead = !!j && (j.dead || j.hidden || j.hp <= 0);   // gone from the map is not struck
    if (dead || R.jitterT <= 0) {
      if (j && !dead) { j.dead = true; j.hidden = true; }
      f.r45_jitter = dead && R.jitterT >= 0 ? 'you' : 'kaelen'; f.r45_kaelen = true; R.jitterT = 0;
      if (G.mapId === DECK) stageDeck(G.map);
      card(TX.jitterTitle, f.r45_jitter === 'you' ? TX.youStruck : TX.kaelenStruck, [{ t: TX.threeGo, f: () => card(TX.jitterTitle, TX.threeUp, [{ t: TX.threeGo, f: () => lyraUp() }]) }]);
    }
  }

  // ================================================================ 4 · Lyra, and the last load
  function lyraUp() {
    const f = F(); setStage(4); f.r45_kaelen = true;
    if (f.r45_way === 'foot') {
      toDeck(4);
      card(TX.lyraTitle, TX.lyraFoot, [{ t: TX.threeGo, f: () => lastLoad() }]);
    } else {
      if (G.mapId === DECK) stageDeck(G.map);
      card(TX.lyraTitle, TX.lyraDeck, [{ t: TX.threeGo, f: () => lastLoad() }]);
    }
  }
  function lastLoad() {
    card(TX.lyraTitle, TX.lastLoad, [{ t: TX.lastGo, f: () => startCount() }]);
  }

  // ================================================================ 5 · the count
  function startCount() {
    const f = F(); setStage(5); R.ct = 0; R.ci = 0; f.r45_hold = false; f.r45_saw = false;
    if (G.mapId === DECK) stageDeck(G.map);
    say(TX.drumOut, 'bad', 3500); say(TX.countHint, 'warn', 3000);
  }
  function looking() {
    const c = Engine.cam, a = Math.atan2(AT.line[1] + 3 - c.y, AT.line[0] - c.x);
    let d = Math.abs(((c.dir - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
    return d < 0.75;
  }
  function tickCount(dt) {
    const f = F(); if (R.ct < 0) return;
    R.ct += dt;
    if (R.ci >= 6 && R.ci <= 9 && looking()) f.r45_saw = true;
    while (R.ci < 10 && R.ct >= (R.ci + 1) * TICK) {
      R.ci++;
      say(TX['c' + R.ci], R.ci === 10 ? 'bad' : '', TICK * 1000 + 600);
      if (R.ci === 10) { R.ct = -1; setTimeout(() => { try { atTen(); } catch (e) { warnOnce('ten', e); } }, 400); }
    }
  }
  function atTen() {
    const f = F(); if (stage() !== 5) return;
    if (f.r45_hold && !f.r45_echo) {
      f.r45_echo = true; f.r45_hold = false;
      try { const cv = document.querySelector('canvas'); if (cv) { cv.style.filter = 'grayscale(1) contrast(0.9)'; setTimeout(() => { cv.style.filter = ''; }, 9000); } } catch (e) { /* cosmetic */ }
      card(TX.echoTitle, TX.echo, [{ t: TX.echoGo, f: () => { try { const cv = document.querySelector('canvas'); if (cv) cv.style.filter = ''; } catch (e) { /* cosmetic */ } R.ci = 8; R.ct = 8 * TICK; say(TX.c9, '', TICK * 1000 + 600); } }]);
      return;
    }
    cut();
  }
  function holdDrum() {
    if (stage() !== 5 || R.ct < 0) return false;
    F().r45_hold = true; say(TX.holdDrum, 'warn', 2500); return true;
  }

  // ================================================================ 6 · after
  function cut() {
    const f = F(); if (stage() !== 5) return;
    setStage(6); f.r45_cut = true;
    const old = G.ledger || (G.ledger = []);
    if (!old.some((r) => r && r.name === 'Aldric Vance')) old.push({ name: 'Aldric Vance', where: TX.ledgerWhere, day: G.day });
    journal('main', TX.jCut);
    try { Audio_.sfx.crack(); } catch (e) { /* silent */ }
    if (G.mapId === DECK) stageDeck(G.map);
    const body = TX.after + '<br><br>' + (f.r45_saw ? TX.afterSaw : TX.afterLooked) + (f.pim_safe ? '<br><br>' + TX.afterPim : '');
    card(TX.afterTitle, body, [{ t: TX.afterGo, f: () => finish() }]);
  }
  function finish() {
    const f = F(); setStage(7);
    if (typeof GREEN44 !== 'undefined' && (f.g44 | 0) === 5) f.g44 = 6;
    try { ending(); } catch (e) { warnOnce('ending', e); }
  }
  function endLines() {
    if (!hasG() || stage() < 7) return [];
    const f = F(), out = [];
    out.push(f.r45_way === 'foot' ? TX.endFoot : fmt(TX.endDeck, f.r45_jitter === 'you' ? TX.endDeckYou : ''));
    out.push(TX.endCount);
    if (f.r45_echo) out.push(TX.endEcho);
    return out;
  }

  // ================================================================ the HUD, the tick, the wiring
  function drawOverlay() {
    if (!active() || G.state !== 'play') return;
    const ctx = Engine.ctx; if (!ctx) return;
    const s = stage(), f = F();
    ctx.save(); ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'center';
    const Y = (typeof VIEW_H === 'number' ? VIEW_H : 150) - 30;
    const bar = (y, frac, col) => { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(110, y, 100, 5); ctx.fillStyle = col; ctx.fillRect(110, y, Math.max(0, Math.min(100, 100 * frac)), 5); };
    if (s === 2) {
      ctx.fillStyle = '#d9a441'; ctx.fillText(TX.hudDrum + ' · ' + (f.r45_count | 0) + ' ' + TX.hudCount, 160, Y - 8);
      // the beat: a gold window in the middle, the marker sweeping through it
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(110, Y - 4, 100, 6);
      ctx.fillStyle = 'rgba(217,164,65,0.55)'; ctx.fillRect(160 - 100 * WINDOW / BEAT, Y - 4, 200 * WINDOW / BEAT, 6);
      const ph = ((R.beat + BEAT / 2) % BEAT) / BEAT; ctx.fillStyle = '#fff'; ctx.fillRect(110 + 100 * ph - 1, Y - 5, 2, 8);
      bar(Y + 5, R.prog / HAULS, '#7fe060');
      ctx.fillStyle = '#9aa0b0'; ctx.fillText(TX.hudSettle, 160, Y + 18); bar(Y + 20, R.settle, '#ff6a40');
    } else if (s === 1 && f.r45_way === 'foot') { ctx.fillStyle = '#d9a441'; ctx.fillText(TX.hudFoot + ' · ' + (f.r45_count | 0) + ' ' + TX.hudCount, 160, Y); bar(Y + 4, R.prog / HAULS, '#7fe060'); }
    else if (s === 5 && R.ct >= 0) { ctx.fillStyle = '#ff6a40'; ctx.font = '12px "Alegreya SC", serif'; ctx.fillText(TX.hudTen + ' · ' + Math.max(1, R.ci), 160, Y); }
    ctx.restore();
  }
  function tick(dt) {
    if (!hasG() || G.state !== 'play') return;
    const s = stage(); if (s < 1 || s > 6) return;
    try {
      if (G.escapeTimer > 0) G.escapeTimer = Math.max(60, G.escapeTimer + dt);   // the scene keeps its own clock
      if (s === 1 && F().r45_way === 'foot') tickFoot(dt);
      else if (s === 2) { if (G.mapId === DECK) { if (!keyed(G.map, 'drum')) stageDeck(G.map); tickDrum(dt); } }
      else if (s === 3) tickJitter(dt);
      else if (s === 5) tickCount(dt);
    } catch (e) { warnOnce('tick' + s, e); }
  }
  // the deck over a drowning town, not the ship's usual mist: green fog for the scene, the ship's own after it
  const GREEN_FOG = [72, 96, 64], GREEN_AMB = 0.5;
  function tint(m, on) {
    if (!m || m.id !== DECK) return;
    if (on && !m._r45fog) { m._r45fog = { c: m.fogColor, a: m.ambient }; m.fogColor = GREEN_FOG.slice(); m.ambient = GREEN_AMB; }
    else if (!on && m._r45fog) { m.fogColor = m._r45fog.c; m.ambient = m._r45fog.a; m._r45fog = null; }
    else return;
    try { if (G.map === m && Engine.setMap) Engine.setMap(m); } catch (e) { /* cosmetic */ }
  }
  function onLoad() {
    if (!hasG()) return;
    const m = G.map, s = stage();
    if (m && m.id === DECK) tint(m, aboard());
    if (m && m.id === DECK && aboard()) stageDeck(m);
    if (m && m.id === DECK && s >= 7) for (const e of m.entities) if (e && e.sprite === 'p16k_rope') e.label = TX.ropeLabel;
    if (m && m.id === 'oakhaven' && s === 1) stageFoot(m);
  }
  function useOwn(e) {
    if (!e) return false;
    if (aboard() && (e.use === 'p16k_exit' || e.use === 'p16k_down')) { say(TX.drumHint, 'warn', 3000); return true; }
    if (!e._r45) return false;
    if (e.use === 'r45_drum') { if (stage() === 2) return haul(); if (stage() === 5) return holdDrum(); say(e.look || e.label, '', 5000); return true; }
    if (e.use === 'r45_put') return putOn(e);
    if (e.use === 'r45_look') { say(e.look || e.label || '', '', 6000); return true; }
    return false;
  }
  function wire() {
    if (typeof update === 'function') { const _u = update; update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; }; }
    if (typeof drawHUD === 'function') { const _d = drawHUD; drawHUD = function () { const r = _d.apply(this, arguments); try { drawOverlay(); } catch (e) { warnOnce('hud', e); } return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof loadMap === 'function') { const _lm = loadMap; loadMap = function () { const r = _lm.apply(this, arguments); try { onLoad(); } catch (e) { warnOnce('load', e); } return r; }; }
    if (typeof restoreGame === 'function') { const _rg = restoreGame; restoreGame = function () { const r = _rg.apply(this, arguments); try { Object.assign(R, { beat: 0, prog: 0, ct: stage() === 5 ? 0 : -1, ci: 0, jitterT: stage() === 3 && F().r45_jitter === 'pending' ? JITTER_SECS : 0 }); onLoad(); } catch (e) { warnOnce('restore', e); } return r; }; }
  }
  try { wire(); } catch (e) { console.warn('rope45 failed to wire', e); }

  return { TX, TEXTS, VO, R, AT, FOOT, COUNTS, DECK, stage, aboard, active, begin, toDeck, haul, putOn, loaded, eighteen, lyraUp, lastLoad, startCount, atTen, holdDrum, cut, finish, endLines, tick, seq, hush,
    consts: { BEAT, WINDOW, HAULS, MAGS_RATE, FOOT_RATE, JITTER_SECS, TICK } };
})();
if (typeof window !== 'undefined') window.ROPE45 = ROPE45;
