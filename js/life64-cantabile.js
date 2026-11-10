// ============================================================
//  life64-cantabile — Port Cantabile's Lantern Yard and the Long Mole keep the hours (ROADMAP R10 wave 3; engine
//  js/life60.js). The harbour is the "A trip to Port Cantabile" extra's map (js/cantabile17.js), set after Book One.
//
//  Canon (World Bible Vol IV, "Book Three: the Rust Coast"; Book Two ch. 8–14): a cliff harbour; the trade is salvage,
//  pilotage and vox-bottles; the Free Captains and their Articles; the carillon rigging on forty boats; the Mole-bell rung
//  once for each soul that goes into the water, and then the harbour counts; Hesper's four houses on the Yard, with small
//  boots by the doors. Nothing here is still.
//  [PROPOSED] Every person below (roles only, no names): net-menders and a fishwife, two salvage divers bringing crates up
//  the Yard steps to the Harbour office (Article the Sixteenth, the Harbour's fifth), a rope-coiler laying the Harbour's way,
//  Hesper's children and the eldest girl at the washing line, a pilot waiting on the Mole for a fare, two Free Captains
//  arguing, a boy sluicing the Mole, a caulker, a sail-mender, a water-carrier, the Harbour's reader at noon, the
//  lamplighter at dusk, the night watch on the Mole-head and a man fishing off the Mole after dark. Grown-ups go home up
//  the Salt Stair; the children go in at Hesper's doors.
//  They keep to the quay (flags and Mole, never the water or the cliff), and when the Mole-bell rings they stop where they
//  are and say nothing until the harbour has counted (js/cantabile17.js T.count).
//  R11 phase 4 (owner's ruling 9 Nov 2026, Book Two): the Long Mole is twenty feet wide with a parapet on the sea side and
//  its moorings on the harbour side, so the pilot watches the sea over the parapet and the caulker and the night fisher
//  work the harbour edge, and the two Free Captains argue a little further out.
//  The Flambeaux at the counting-house and the Book Two scenes are not staged, as in the extra.
// ============================================================
'use strict';

const LIFE64_CANT = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const PI = Math.PI, N = -PI / 2, SO = PI / 2, E = 0, W = PI;
  const MAP = 'cantabile_harbour';
  const STAIR = [46.5, 43.5];   // the foot of the Salt Stair: where the grown-ups go home

  const st = (from, to, job, at, x) => Object.assign({ from, to, job, at }, x || {});
  const home = (from, to) => ({ from, to, job: 'home' });

  const R = [
    { key: 'netA', name: S('A net-mender'), sprite: 'p60_wom_a', home: STAIR,
      day: [home(18, 7), st(7, 12, 'knead', [10.5, 55.4], { face: SO }), st(12, 13, 'chat', [10.5, 55.4], { face: 'netB' }), st(13, 18, 'knead', [10.5, 55.4], { face: SO })],
      props: [['p17c_net', 10.6, 56.3, 0.8]],
      greet: S('"Mind the net, love, it\'s got more holes than mending in it this week. Reef took a bite."'),
      work: S('"Mending. A net\'s a set of holes held together with string, and my job\'s to keep the string winning."'),
      barks: [S('A net-mender: "Over, under, pull. Over, under, pull."'), S('A net-mender, to the other: "...and he says it\'s the coral. It\'s never the coral. It\'s him."')] },
    { key: 'netB', name: S('A net-mender'), sprite: 'p16f_dockwoman', home: STAIR,
      day: [home(18, 7), st(7, 12, 'knead', [11.7, 55.5], { face: SO }), st(12, 13, 'chat', [11.7, 55.5], { face: 'netA' }), st(13, 18, 'knead', [11.7, 55.5], { face: SO })],
      greet: S('She does not look up from the net. "If you\'re selling, we\'re not buying. If you\'re buying, we\'re not selling. If you\'re lost, the Stair\'s behind you."'),
      barks: [S('A net-mender: "Knot. Knot. Knot. Pass me the needle."')] },
    { key: 'fish', name: S('A fishwife'), sprite: 'p60_wom_b', home: STAIR,
      day: [home(17, 6), st(6, 13, 'sell', [44.6, 47.5], { face: W }), st(13, 17, 'carry', [44.6, 47.5], { to2: [21.5, 57.0] })],
      props: [['p_barrel', 43.9, 48.2, 0.6], ['p60_basket', 44.0, 46.9, 1.0]],
      greet: S('"Mackerel, rock-cod, a crab with opinions. Fresh this morning, or I\'ll eat the basket."'),
      work: S('"Selling what the boats bring in before the gulls do. The gulls are winning. They\'ve got the numbers."'),
      barks: [S('A fishwife, loudly: "Mackerel! Fresh mackerel! Fresher than you!"'), S('A fishwife, to a gull: "Not one. Not one, you thief."')] },
    { key: 'diverA', name: S('A salvage diver'), sprite: 'p16f_dockman', home: STAIR,
      day: [home(17, 8), st(8, 16, 'carry', [21.5, 57.2], { to2: [34.6, 52.4] }), st(16, 17, 'sit', [31.6, 56.4], { face: SO })],
      greet: S('Water still running off him. "Article the Sixteenth. What lies below the tide-mark belongs to whoever brings it up. I bring it up."'),
      work: S('"Down off the Yard steps at the slack, up with whatever the reef\'s let go of, and a fifth to the Harbour\'s box. Honestly. Mostly honestly."'),
      barks: [S('A salvage diver, under a crate: "A fifth. A fifth of a wet crate. Lovely."')] },
    { key: 'diverB', name: S('A salvage diver'), sprite: 'p17c_hand', home: STAIR,
      day: [home(17, 9), st(9, 16, 'carry', [22.4, 57.2], { to2: [33.6, 52.6] }), st(16, 17, 'sit', [32.6, 56.4], { face: SO })],
      greet: S('"You don\'t open them. That\'s the rule. Bottles you don\'t open, crates you do, and you learn the difference before you learn to swim."'),
      barks: [S('A salvage diver: "Mind your feet. Mind the bottle. That one\'s a bottle."')] },
    { key: 'rope', name: S('A rope-coiler'), sprite: 'p60_man_b', home: STAIR,
      day: [home(18, 7), st(7, 18, 'reach', [33.5, 56.6], { face: SO })],
      props: [['p17c_coil', 34.4, 56.8, 0.7]],
      greet: S('"Left hand over right. The Harbour\'s way. Coil it the other way and it\'ll kink when you need it, and somebody\'ll go in the water, and the bell will ring."'),
      work: S('"Coiling. Every rope on the Yard, every morning, the Harbour\'s way. It\'s the Articles, near enough."'),
      barks: [S('A rope-coiler: "Left over right. Left over right."')] },
    { key: 'kidA', name: S('One of Hesper\'s children'), sprite: 'p17c_child', scale: 0.72, home: [14.5, 50.4],
      day: [home(18, 9), st(9, 12, 'play', [20.5, 53.6], { area: 2.4 }), home(12, 14), st(14, 18, 'play', [20.5, 53.6], { area: 2.4 })],
      greet: S('"We\'re playing the bell. You stand still and count, and whoever moves first goes in the water. Not real water."'),
      barks: [S('One of Hesper\'s children: "Dong! Now count! Now count!"')] },
    { key: 'kidB', name: S('One of Hesper\'s children'), sprite: 'p17c_child', scale: 0.68, home: [21.5, 50.4],
      day: [home(18, 9), st(9, 12, 'play', [20.5, 53.6], { area: 2.4 }), home(12, 14), st(14, 18, 'play', [20.5, 53.6], { area: 2.4 })],
      greet: S('He has a gull feather in his hair and no shoes on. His boots are by the door, in a row with everybody else\'s. "Hesper says boots are for church and the Cay."'),
      barks: [S('One of Hesper\'s children: "You moved! You\'re in the water!"')] },
    { key: 'kidC', name: S('One of Hesper\'s children'), sprite: 'p17c_child', scale: 0.7, home: [28.5, 50.4],
      day: [home(18, 9), st(9, 12, 'play', [20.5, 53.6], { area: 2.4 }), home(12, 14), st(14, 18, 'play', [20.5, 53.6], { area: 2.4 })],
      greet: S('"Are you off the sky-ship? Is it true she talks? Mags says she murmurs. That\'s not the same."'),
      barks: [S('One of Hesper\'s children, very seriously: "...four... five... six..."')] },
    { key: 'washgirl', name: S('Hesper\'s eldest'), sprite: 'p60_wom_c', scale: 0.86, home: [7.5, 50.4],
      day: [home(18, 8), st(8, 13, 'hang', [24.5, 51.6], { face: N }), st(13, 18, 'watch', [18.5, 52.4], { face: 'kidA' })],
      props: [['p17c_wash', 24.6, 50.9, 0.9]],
      greet: S('"Thirty-one pairs of socks. Hesper says count them out and count them in. I count them in my sleep."'),
      work: S('"Washing, then minding the little ones. Then washing. It\'s salt again by noon, all of it. Everything here is."'),
      barks: [S('Hesper\'s eldest: "Don\'t go near the steps! I can see you!"')] },
    { key: 'pilot', name: S('A pilot'), sprite: 'p60_man_c', home: STAIR,
      day: [home(18, 6), st(6, 18, 'watch', [66.5, 51.62], { face: SO })],
      greet: S('"Want taking through the reef? I can hear it from here. It\'s on the fourth key and going up. Ask me in an hour and I\'ll tell you a different price."'),
      work: S('"Pilotage. I listen to the sea and tell boats where it\'s lying. Auld Bessa reads it better. Auld Bessa is eighty-four."'),
      barks: [S('A pilot, to the sea: "Going up. Going up. There\'s the turn."')] },
    { key: 'capA', name: S('A Free Captain'), sprite: 'p60_man_a', home: STAIR,
      day: [home(16, 10), st(10, 16, 'chat', [64.9, 50.8], { face: 'capB' })],
      greet: S('"Free Captain, and free to tell you to mind your business. Politely."'),
      barks: [S('A Free Captain: "...and I say it\'s my fifth, by the Articles, and he says—"'), S('A Free Captain, hand on heart: "On the Articles. On the drop."')] },
    { key: 'capB', name: S('A Free Captain'), sprite: 'p16f_dockman', home: STAIR,
      day: [home(16, 10), st(10, 16, 'chat', [65.9, 51.0], { face: 'capA' })],
      greet: S('She is listening to the other captain with the expression of a woman counting how far it is from the Mole to the derrick.'),
      barks: [S('A Free Captain: "Then take it to the Queen. Take it to the Queen, and take your boots off first."')] },
    { key: 'sluice', name: S('A boy with a bucket'), sprite: 'p17c_child', scale: 0.8, home: STAIR,
      day: [home(18, 7), st(7, 10, 'scrub', [57.5, 51.5], { face: N }), st(10, 16, 'carry', [55.5, 51.4], { to2: [70.5, 51.4] }), st(16, 18, 'sit', [56.6, 49.5], { face: N })],
      greet: S('"Penny a morning to sluice the Mole. Gulls are a penny each. Not to sluice. To shout at."'),
      barks: [S('A boy with a bucket: "Gangway! Wet stones! Gangway!"')] },
    { key: 'caulk', name: S('A caulker'), sprite: 'p60_man_b', home: STAIR,
      day: [home(18, 7), st(7, 12, 'hammer', [68.9, 50.3], { face: N }), st(12, 13, 'sit', [69.5, 51.4], { face: N }), st(13, 18, 'hammer', [68.9, 50.3], { face: N })],
      props: [['p_barrel', 67.9, 50.35, 0.55]],
      greet: S('"Oakum and pitch. Tap it in, pay it over, she\'s tight. Mind the pot, it\'s hot, and so am I."'),
      barks: [S('A caulker: "Tap. Tap. Pay it in."')] },
    { key: 'sail', name: S('A sail-mender'), sprite: 'p60_wom_a', home: STAIR,
      day: [home(18, 9), st(9, 18, 'sit', [74.4, 53.6], { face: E })],
      greet: S('"Every boat in the harbour has a bar of bells at the shroud-head, and every one of them\'s tuned, and not one of them\'s tuned to the next. Listen. That\'s forty boats arguing."'),
      work: S('"Patching. Wind tears it, I sew it, wind tears it. We\'ve an understanding."'),
      barks: [S('A sail-mender: "Palm, needle, pull."')] },
    { key: 'water', name: S('A water-carrier'), sprite: 'p60_man_a', home: STAIR,
      day: [home(17, 7), st(7, 17, 'carry', [45.6, 45.4], { to2: [8.5, 52.6] })],
      greet: S('"From the cistern at the top, down six flights, to the Yard. Then back up for more. My knees are older than I am."'),
      barks: [S('A water-carrier: "Water! Coming through! Water!"')] },
    { key: 'reader', name: S('The Harbour\'s reader'), sprite: 'p60_man_c', home: [39.5, 51.4],
      day: [home(13, 12), st(12, 13, 'watch', [40.6, 51.8], { face: SO })],
      greet: S('"The Articles are read at noon. I read them. In a flat voice. That is how they are read."'),
      barks: [S('The Harbour\'s reader, in a flat voice: "Article the Sixteenth. What lies below the tide-mark belongs to whoever brings it up. The Harbour takes a fifth."'), S('The Harbour\'s reader, in a flat voice: "Article the Ninth. Any vessel making the harbour under no hand shall be boarded by the Harbour\'s people and no other."')] },
    { key: 'lamp', name: S('The lamplighter'), sprite: 'p60_man_c', home: STAIR,
      day: [home(21.5, 19), st(19, 21.5, 'reach', [5.6, 51.6], { to2: [50.4, 51.6] })],   // dusk is about 19:00 in the extra (js/cantabile17.js)
      greet: S('"Yard first, then the Stair, one landing at a time. By the time I\'m at the top the bottom wants trimming."'),
      barks: [S('The lamplighter: "There. And up we go."')] },
    { key: 'watch', name: S('The night watch on the Mole-head'), sprite: 'p16f_dockman', home: STAIR,
      day: [st(19, 7, 'watch', [76.6, 48.6], { face: E }), home(7, 19)],
      props: [['p17c_lantern', 77.2, 48.2, 0.7]],
      greet: S('"Watching for boats. Watching for weather. Watching for anybody who wants to climb that mast who isn\'t crew."'),
      barks: [S('The night watch, to the dark: "All\'s well on the Mole. All\'s well."')] },
    { key: 'nightfish', name: S('A man fishing off the Mole'), sprite: 'p17c_hand', home: STAIR,
      day: [home(0, 20), st(20, 24, 'sit', [60.6, 50.25], { face: N })],
      greet: S('"Not biting. Never bites. I come for the quiet. There isn\'t any, but I come for it."'),
      barks: [S('A man fishing: "...come on... come on..."')] },
  ];

  // they keep to the quay: flags and Mole, never the sea, the shallows or the cliff
  const walk = (m, x, y) => {
    try {
      const f = m.floorCells[y * m.w + x];
      if (f === 2 || f === 3) return false;                       // water, shallows (js/cantabile17.js F.water / F.shal)
      return Math.abs(m.lvlAt(x + 0.5, y + 0.5) - 0.4) < 0.3;     // the Yard's level: not the Stair or the terraces
    } catch (e) { return true; }
  };
  const pause = () => { try { return typeof CANTABILE17 !== 'undefined' && CANTABILE17.T && CANTABILE17.T.count > 0; } catch (e) { return false; } };

  try { if (typeof LIFE60 !== 'undefined') LIFE60.add(MAP, R, { gone: () => false, walk, pause }); } catch (e) { console.warn('life64-cantabile failed to register', e); }
  return { TEXTS, ROSTER: R, walk, pause };
})();
if (typeof window !== 'undefined') window.LIFE64_CANT = LIFE64_CANT;
