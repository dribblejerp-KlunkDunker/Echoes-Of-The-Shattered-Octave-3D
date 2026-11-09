// ============================================================
//  aldric63 — Aldric's arc: the Greenhall on Rootday, and the signing (ROADMAP R9 item 16; Story Brainstorm #16;
//  Book One ch. 2 ll. 650–877, ch. 7 ll. 2529–2549).
//
//  Most of Aldric's arc was already in the game: the Governor's house and the aired room, his roots, the coat on the peg
//  and "No. I didn't think he would." (js/governor46.js, R5 #5); the speaking-tube count, "Get to the cage, boy. I'm
//  counting." (js/rite43.js); and the wave at the rope, palm out, like a cart past a hole in the road (js/rope45.js).
//  What was missing is the two scenes in the Greenhall that the rest hangs from:
//    * THE GREENHALL, ROOTDAY (game day 1, from 08:00): a Legionnaire walks Kaelen across town ("the blue jug, Mam. Not
//      the white"), and if you come in behind them you see it as the book has it: the carvings under the banners, the
//      Queen's seal where the Cantor's chair used to stand; "Sit." / he does not sit; Factor Vosk, Revision Seven,
//      STAGE 9 — UNISON HOLD, Source: Cantor, local (1), Collar: standard, Wire: standard, the lamp-chimney singing; the
//      three offers; "It's a chance, Kaelen"; the purse and the Root-glass disc. Then stay when the Factor goes, or go out
//      with her. Stay: the two cups of apple-brandy, "Who's the Cantor, Da?", "No. I didn't think you would.", "You sold
//      them." / "I fed them.", the famine names, "Da. Your hair.", the gate and the step, "Your room's as you left it."
//    * THE SIGNING, DRIFTDAY DUSK (game day 6, 17:00–20:00, once the Church is in town): K. Vance beside Supervising
//      Engineer and again beside Collar & Wire; Aldric's breath, like a man who has been holding a door shut against a
//      storm; the censer, and the creak.
//    * [PROPOSED] Aldric, after the brandy, if you speak to him before you have been up to the house: "You heard him not
//      answer me. ... His room is as he left it. Marrit has the key." That is the door into js/governor46.js's errand.
//  Canon text, cut to fit; nothing reconciles them (the Brainstorm's "Don't"). Missing a day changes nothing else.
//  Flags: p63_walk, p63_hall (1 seen), p63_stayed, p63_signed, p63_bridge.
// ============================================================
'use strict';

const ALDRIC63 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const day = () => Number(G.day) || 0;
  const partOne = () => { const f = F(); return !(f.greening || f.escaped || f.part3 || f.part4 || f.rite_started); };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('aldric63: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const jr = (t) => { try { journal('main', t); } catch (e) { /* none */ } };

  const TX = {
    goOn: S('Go on.'),
    walk: S('A Legionnaire in a reed-grille helm is walking Kaelen down Cooper\'s Row toward the square. The town watches him the way it always does: sideways. They are going to the Greenhall.'),
    hallTitle: S('The Greenhall, Rootday morning'),
    hall: S('You come in behind Kaelen and the Legionnaire who walked him across town. Under its grille a young woman\'s voice is saying, patiently, <i>the blue jug, Mam. Not the white.</i><br><br>Every beam in the Greenhall is carved, reeds and apple boughs and small singing birds, polished dark by three centuries of lamp smoke, and the carvings are hung over now with banners: the Synod\'s iron-grey, the Consortium\'s green and black. Behind the Governor\'s chair, where the Cantor\'s chair used to stand, is the pale green glass of the Queen\'s seal.<br><br>Aldric Vance sits beneath it, the chain of bronze oak-leaves over a coat that fit him ten years ago, his hair worn long on the left side, combed down over the temple.<br><br>"Kaelen," his father says.<br><br>"Governor."<br><br>"Sit."<br><br>He does not sit.<br><br>A woman at the end of the table rises as he comes in, which nobody in Oakhaven has done for him in seven years. "Engineer Vance," she says. "Adela Vosk. Resident Factor for the Oakhaven works. Thank you for coming."<br><br>"I was required."'),
    planTitle: S('Revision Seven'),
    plan: S('She spreads a bore plan across the table: the quarry in section, the bore-head going down through stone and clay and a great twisting mass drawn in green ink and labelled simply ROOT. In the title block: <b>CALIBRATION: VANCE SEQUENCE, REV. 7 (OAKHAVEN ROOT)</b>.<br><br>"Nine days," the Factor says. "The Root does not hold still the way stone does. We have shattered three bore-heads this month. We have lost two shift-crews. There is only one man in the Reach who has walked a bore through a living casing, Engineer Vance."<br><br>"I didn\'t walk it through," Kaelen says. "It went through me."<br><br>He turns to the seventh revision, and his arm rings: a sharp high rising note, straight up through the felt, so loud that the glass chimney of the lamp at his elbow sings back and his father flinches in his chair. At the foot of the pitch tables, in a small exact hand with a tiny pair of scales in the margin:<br><br><b>STAGE 9 — UNISON HOLD</b><br><i>Pitch: 174. Duration: 4 hrs, or until casing yields.</i><br><i>Source: Cantor, local (1).</i><br><i>Collar: standard. Wire: standard.</i><br><br>"Is something wrong, Engineer?"<br><br>"No," says Kaelen, perfectly level. "The lamp. The glass resonates with certain chimneys."'),
    offerTitle: S('Three things'),
    offer: S('"The Consortium would like you to consult on the final calibration and to supervise the hold. In return, we offer three things." She counts them off on long fingers. "Your arm: our physicians in the Organum have had real success in arresting third-stage calcification." That is a lie, and he lets it lie on the table. "Your badge, reinstated, with seniority. And your Hollow. An Inquisitor is on the road with a warrant of purification. If the calibration is secured, I could make a persuasive case to the Church that the Hollow is a Consortium matter."<br><br>"And if it isn\'t secured?"<br><br>"Then I expect I shall be very busy with other things for the next nine days."<br><br>"It\'s a chance, Kaelen," says his father, low and rough, to the table. It is the first thing he has said since <i>sit</i>. He thinks he is helping.<br><br>"And the Cantor?"<br><br>"Will be very well compensated. Four hours. The collar is removed afterward."<br><br>The collar is removed afterward. The wire is not.<br><br>"I\'ll need to see the bore," Kaelen says. The Factor lays two things on the table: a purse of Consortium scrip, and a disc of green Root-glass stamped with the drill-and-wheel. "Show that at the quarry gate. Any hour, day or night." He takes them both. It is the easiest thing he has done in seven years, and he hates how easy it is.'),
    stay: S('Stay when the Factor goes.'),
    leave: S('Go out with the Factor.'),
    leftTitle: S('The door'),
    left: S('You go out into the square behind the Factor and her Legionnaire. Before the door swings shut you see Aldric get up, heavily, and go to the sideboard, and pour two cups.'),
    brandyTitle: S('Two cups of apple-brandy'),
    brandy: S('When the Factor has gone, Aldric pours two cups of apple-brandy and sets one in front of his son. Kaelen does not touch it.<br><br>"Who\'s the Cantor, Da?"<br><br>"You know who." A long silence. "Lyra Ashgrove. She\'ll be paid. It\'s four hours. The Factor gave me her word."<br><br>"Do you know what the wire is?"<br><br>"Then tell me. You\'re the engineer. Tell me what the wire does, Kaelen, and I\'ll go to the Factor myself and tear up the paper in front of her. Tell me."<br><br>He opens his mouth. Then he closes it.<br><br>"No," his father says quietly. "I didn\'t think you would."<br><br>"You sold them," says Kaelen.<br><br>"I fed them." The old iron in it, the voice that argued with weather. "By midwinter we\'d eaten the seed-corn. By Candlefast we were boiling harness leather. I buried the Wetherby twins, and the Hale girl, and the miller\'s three, and eleven more that winter, Kaelen. <i>Eleven.</i> And in the spring the Consortium came up the Greenroot road with forty wagons of grain and a paper, and I signed it, and I\'d sign it again tomorrow. Don\'t you look at me like that. Don\'t you <i>dare</i>, with that on your arm. You drew the pictures, boy. I only sold them the ground."'),
    hairTitle: S('"Da. Your hair."'),
    hair: S('"Da," Kaelen says. "Your hair."<br><br>His father\'s hand goes to his left temple before he can stop it. The long grey hair has slipped. Beneath it is a square of clean linen, and beneath the linen\'s edge, pale as a grub, a root-tip. A thumbnail long. Turning very slowly toward the lamp.<br><br>Aldric smooths his hair back over it. "The Grafters are discreet," he says, "with the Governor."<br><br>"How often?"<br><br>"Twice a month, now."<br><br>"You never came to the door," Aldric says at last. "When you came home. You stood at the gate."<br><br>"You never came to the gate," says Kaelen. "You stood on the step."<br><br>Kaelen stands up.<br><br>"Your room\'s as you left it," his father says, to the table. "I had them air it every spring."'),
    go: S('Go.'),
    signTitle: S('The signing'),
    sign: S('Kaelen signs the Factor\'s paper at dusk, in the Greenhall, under the pale green seal of the dead Queen.<br><br>His father is there. The Inquisitor is there, in red, with the censer hanging at his side. The Factor is there with her lenses, watching his pen. He writes <i>K. Vance</i> on the line beside <i>Supervising Engineer</i>, and on the line beside <i>Collar &amp; Wire</i> he writes it again, and his hand is perfectly steady, because that is what he has instead.<br><br>Across the table his father lets out a breath that sounds like relief: like a man who has been holding a door shut against a storm for seven years and has just heard the wind drop. He looks at his son, and his eyes are wet, and he nods once, as if to say: <i>There. There, now. You\'ve come home.</i><br><br>Kaelen cannot look at him.<br><br>The Inquisitor lifts the censer and swings it once over the signed paper in blessing, and the chain creaks at the top of its arc.<br><br>Creak.'),
    bridge: S('"You were there," Aldric says, without looking up. "You heard him not answer me." He turns the brandy cup a quarter-turn on the table. "His room is as he left it. Marrit has the key, if you go up to the house. I should like somebody to have seen it."'),
    jHall: S('Rootday: Kaelen was required at the Greenhall. Factor Vosk laid out Revision Seven of his own Sequence. Stage Nine: Unison Hold. Source: Cantor, local (1). Collar: standard. Wire: standard. He took the purse and the Root-glass disc.'),
    jStay: S('I stayed after the Factor left. "You sold them." / "I fed them." Under the Governor\'s long hair, a root-tip, turning toward the lamp. "Your room\'s as you left it. I had them air it every spring."'),
    jSign: S('Driftday, at dusk: Kaelen signed the Factor\'s paper twice, once as Supervising Engineer and once beside Collar & Wire. His father let out a breath like a man who had been holding a door shut against a storm.'),
  };

  // ---------------------------------------------------------------- the scenes
  function hallScene() {
    const f = F(); f.p63_hall = 1;
    jr(TX.jHall);
    showEvent(TX.hallTitle, TX.hall, [{ t: TX.goOn, f: () => showEvent(TX.planTitle, TX.plan, [{ t: TX.goOn, f: () => showEvent(TX.offerTitle, TX.offer, [
      { t: TX.stay, f: () => stayScene() },
      { t: TX.leave, f: () => showEvent(TX.leftTitle, TX.left, [{ t: TX.goOn, f: null }]) },
    ]) }]) }]);
  }
  function stayScene() {
    F().p63_stayed = 1;
    jr(TX.jStay);
    try { questXp(40); } catch (e) { /* none */ }
    showEvent(TX.brandyTitle, TX.brandy, [{ t: TX.goOn, f: () => showEvent(TX.hairTitle, TX.hair, [{ t: TX.go, f: null }]) }]);
  }
  function signScene() {
    F().p63_signed = 1;
    jr(TX.jSign);
    showEvent(TX.signTitle, TX.sign, [{ t: TX.goOn, f: null }]);
  }
  const hallDue = () => { const f = F(); return partOne() && !!f.kaelen_met && !f.p63_hall && day() === 1 && hour() >= 8; };
  const signDue = () => { const f = F(); const h = hour(); return partOne() && !!f.church_come && !f.p63_signed && day() === 6 && h >= 17 && h < 20; };
  function onLoad() {
    if (!hasG() || guest()) return;
    const f = F();
    if (G.mapId === 'oakhaven' && partOne() && f.kaelen_met && !f.p63_walk && !f.p63_hall && day() === 1 && hour() >= 8 && hour() < 12) {
      f.p63_walk = 1; try { msg(TX.walk, 'voice', 7000); } catch (e) { /* cosmetic */ }
    }
    if (G.mapId !== 'greenhall') return;
    if (hallDue()) hallScene();
    else if (signDue()) signScene();
  }

  // ---------------------------------------------------------------- Aldric's quest: after the brandy, the door to the house
  function bridge(g) {
    const f = g.flags;
    if (!f.p63_stayed || f.p63_bridge || f.p46_room || !partOne()) return null;
    f.p63_bridge = 1;
    return { text: TX.bridge, journal: null };
  }

  function wire() {
    try {
      if (typeof NPCS !== 'undefined' && NPCS.aldric) {
        const own = NPCS.aldric.quest;
        NPCS.aldric.quest = function (g) { try { const r = bridge(g); if (r) return r; } catch (e) { warnOnce('bridge', e); } return own ? own.apply(this, arguments) : null; };
      }
    } catch (e) { warnOnce('quest', e); }
    for (const fn of ['loadMap']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { onLoad(); } catch (e) { warnOnce(fn, e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('aldric63 failed to wire', e); }

  return { TX, TEXTS, hallScene, stayScene, signScene, hallDue, signDue, bridge };
})();
if (typeof window !== 'undefined') window.ALDRIC63 = ALDRIC63;
