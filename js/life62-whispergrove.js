// ============================================================
//  life62-whispergrove — Whisper-Grove's Hollows keep their loops (ROADMAP R10 wave 2; engine js/life60.js).
//
//  Whisper-Grove "is the quietest city in the world and has been since the drills" (Book One ch. 15): it died in a single
//  night in 416 and went on standing there. Nobody in it lives a day. What moves is the Hollows, each doing the last thing
//  over and over, and the book's own are kept exactly (ch. 15, the Weeping Plaza):
//    * a woman in a good wool coat walks from the third pillar to the basin's edge, stops, turns, and walks back, and has
//      been doing it since the spring;
//    * two men at the corner of the colonnade, one lifting his hand to make a point in an argument that finished three
//      years ago, the other waiting, forever, politely;
//    * a young man crouched at the water's edge washing a plate that has no dirt on it;
//    * and at dusk "perhaps two hundred of them" are in the plaza: "they did not gather; they simply ended up in the same
//      place, the way leaves do". So the others walk their loops about the city by day, and drift into the Sunken Court
//      at dusk, and stand there in the water through the night.
//  [PROPOSED] The other loops (a sweeper on a drowned step, a man with a bucket, a woman at a stall wrapping nothing, a
//  baker kneading in a doorway, a woman pegging out washing, a man winding a clock that is not there, a joiner's three
//  soft taps, a gatherer at the willows, an old woman on the Moot steps, a man reading a letter as he walks, a woman
//  rocking an empty shawl, a man raking the water, a mother walking to the Cloister door and back), and the one living
//  person who walks the court at dawn and dusk: an Office feeder with a cart, putting bread where the loops go (canon:
//  "they feed themselves if food's put where their loop goes. The Office kept four thousand of them alive for two years").
//  Halder Wick, the lamplighter and the plaza's standing Hollows (js/maps.js) are unchanged.
// ============================================================
'use strict';

const LIFE62_WG = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const PI = Math.PI, N = -PI / 2, SO = PI / 2, E = 0, W = PI;
  const CX = 24.5, CY = 22.5;
  const H = S('A Hollow');

  // the sprites: the Hollow in three more colours of what they were wearing when it happened
  function paint() {
    try {
      if (typeof LIFE60 === 'undefined' || !LIFE60.variant || typeof Engine === 'undefined' || !Engine.sprites.hollow) return;
      LIFE60.variant('hollow', 'p62_hollow_a', 30, 0.55, 0.92);    // a good brown wool
      LIFE60.variant('hollow', 'p62_hollow_b', 205, 0.45, 0.9);    // a faded blue
      LIFE60.variant('hollow', 'p62_hollow_c', 95, 0.35, 0.85);    // green, furred at the shoulders
      if (Engine.sprites.townsman) LIFE60.variant('townsman', 'p61_clerk', 220, 0.22, 0.6);   // the feeder wears Office grey
    } catch (e) { /* the plain Hollow will do */ }
  }

  const st = (from, to, job, at, x) => Object.assign({ from, to, job, at }, x || {});
  // at dusk they end up in the court, the way leaves do: each its own place on a ring round the fountain
  let ringI = 0;
  const RING = 15;
  const ring = () => { const a = (ringI++ / RING) * PI * 2 + 0.21, r = 5.6 + (ringI % 3) * 0.7; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; };
  const dusk = (x) => { const p = ring(); return st(18, 5, 'watch', p, { face: Math.atan2(CY - p[1], CX - p[0]) + (x || 0) }); };

  const R = [
    // ---- the book's own (Book One ch. 15): the same all day and all night
    { key: 'coat', name: H, sprite: 'p62_hollow_a', home: [21.3, 30.3],
      day: [st(0, 24, 'carry', [21.3, 30.3], { to2: [23.7, 24.3] })],
      greet: S('A woman in a good wool coat walks from the third pillar to the basin\'s edge, stops, turns, and walks back to the third pillar. She has been doing it since the spring.'),
      barks: [S('A Hollow in a good wool coat, under her breath: "...I said I\'d be back... I said..."')] },
    { key: 'argA', name: H, sprite: 'hollow', home: [30.2, 11.5],
      day: [st(0, 24, 'chat', [30.2, 11.5], { face: 'argB' })],
      greet: S('Two men stand facing each other at the corner of the colonnade. This one lifts his hand at intervals to make a point in an argument that finished three years ago.'),
      barks: [S('A Hollow at the colonnade, lifting his hand: "...no, but the point is... the point is..."')] },
    { key: 'argB', name: H, sprite: 'p62_hollow_b', home: [31.4, 11.6],
      day: [st(0, 24, 'watch', [31.4, 11.6], { face: 'argA' })],
      greet: S('He is waiting for the other man to finish. He has been waiting, politely, for three years.') },
    { key: 'plate', name: H, sprite: 'p62_hollow_c', scale: 0.92, home: [13.5, 34.2],
      day: [st(0, 24, 'scrub', [13.5, 34.2], { face: E })],
      greet: S('A young man crouched at the water\'s edge, washing a plate that has no dirt on it and has not had for a thousand days.'),
      barks: [S('A Hollow at the water\'s edge: "...nearly... nearly clean..."')] },

    // ---- [PROPOSED] the others: a loop by day, the court at dusk
    { key: 'sweep', name: H, sprite: 'hollow', home: [17.5, 9.5],
      day: [st(5, 18, 'sweep', [17.5, 9.5], { face: N }), dusk()],
      greet: S('She is sweeping the Cloister\'s bottom step, under a foot of water, with a broom worn down to the binding.'),
      barks: [S('A Hollow, sweeping: "...mind the step... mind the step..."')] },
    { key: 'bucket', name: H, sprite: 'p62_hollow_a', home: [9.5, 24.5],
      day: [st(5, 18, 'carry', [9.5, 24.5], { to2: [9.5, 29.4] }), dusk()],
      greet: S('A man carrying an empty bucket from a well that is under the water to a door that is under the water, and back.'),
      barks: [S('A Hollow with a bucket: "...one more... one more and that\'s the copper full..."')] },
    { key: 'stall', name: H, sprite: 'p62_hollow_b', home: [12.5, 9.6],
      day: [st(5, 18, 'sell', [12.5, 9.6], { face: SO }), dusk()],
      props: [['crates', 12.5, 10.4, 0.55]],
      greet: S('She stands at a drowned stall, wrapping nothing in paper that isn\'t there, and folding the ends in neatly, and handing it across.'),
      barks: [S('A Hollow at a stall: "...that\'s a penny... and a penny... and one for luck..."')] },
    { key: 'baker', name: H, sprite: 'hollow', home: [8.6, 20.5],
      day: [st(5, 18, 'knead', [8.6, 20.5], { face: W }), dusk()],
      greet: S('A man in a doorway, kneading. His hands are white to the elbow with flour that was washed off three years ago.'),
      barks: [S('A Hollow in a doorway: "...the bread\'s for Thursday..."')] },
    { key: 'wash', name: H, sprite: 'p62_hollow_c', home: [3.6, 23.6],
      day: [st(5, 18, 'hang', [3.6, 23.6], { face: N }), dusk()],
      props: [['p60_line', 4.6, 23.0, 1.0, 0]],
      greet: S('She pegs out the same shirt, takes it down, and pegs it out again. The line is still up. The shirt is long gone.'),
      barks: [S('A Hollow at a washing line: "...if it holds off... if it only holds off..."')] },
    { key: 'clock', name: H, sprite: 'p62_hollow_b', home: [37.4, 17.6],
      day: [st(5, 18, 'reach', [37.4, 17.6], { face: E }), dusk()],
      greet: S('A man winding a clock that is not on the wall, with a key that is not in his hand. He counts the turns.'),
      barks: [S('A Hollow, winding: "...nine... ten... and back a quarter..."')] },
    { key: 'joiner', name: H, sprite: 'hollow', home: [39.4, 27.5],
      day: [st(5, 18, 'hammer', [39.4, 27.5], { face: E }), dusk()],
      greet: S('He taps a nail into a doorframe: three soft taps, never one loud one. There is no nail.'),
      barks: [S('A Hollow at a doorframe, tapping: three soft taps, and then three more.')] },
    { key: 'gather', name: H, sprite: 'p62_hollow_c', home: [12.6, 13.2],
      day: [st(5, 18, 'pick', [12.6, 13.2], { face: N }), dusk()],
      greet: S('She reaches up into the willow, and picks something, and puts it in an apron pocket that is full of nothing.'),
      barks: [S('A Hollow under a willow: "...the good ones are at the top... always at the top..."')] },
    { key: 'moot', name: H, sprite: 'p62_hollow_a', scale: 0.95, home: [26.5, 9.4],
      day: [st(5, 18, 'sit', [26.5, 9.4], { face: SO }), dusk()],
      greet: S('An old woman sitting on the steps with her hands in her lap, the way you sit to wait for a verdict.'),
      barks: [S('A Hollow on the steps: "...all rise..."')] },
    { key: 'letter', name: H, sprite: 'p62_hollow_b', home: [16.5, 38.5],
      day: [st(5, 18, 'carry', [16.5, 38.5], { to2: [22.4, 38.5] }), dusk()],
      greet: S('A man walking slowly with a letter held up in front of him, reading it, and reaching the bottom, and beginning again at the top.'),
      barks: [S('A Hollow, reading as he walks: "...and we are all well, and the harvest..."')] },
    { key: 'shawl', name: H, sprite: 'p62_hollow_c', home: [2.6, 37.4],
      day: [st(5, 18, 'sit', [2.6, 37.4], { face: E }), dusk()],
      greet: S('A woman sitting against a wall rocking a shawl folded into the shape of something small. The shawl is empty. She rocks it very carefully.'),
      barks: [S('A Hollow, rocking: "...shh... shh..."')] },
    { key: 'rake', name: H, sprite: 'hollow', home: [34.5, 36.5],
      day: [st(5, 18, 'rake', [34.5, 36.5], { face: N }), dusk()],
      greet: S('A man raking the water. Where the rake goes, the water lights, lilac, and goes dark again behind it.'),
      barks: [S('A Hollow with a rake: "...leaves... all these leaves..."')] },
    { key: 'mother', name: H, sprite: 'p62_hollow_a', home: [19.5, 14.5],
      day: [st(5, 18, 'carry', [19.5, 14.5], { to2: [19.5, 9.7] }), dusk()],
      greet: S('A woman walking to the Cloister door, and stopping, and walking back, and walking to the door again. She has a child\'s cloak over her arm.'),
      barks: [S('A Hollow, at the Cloister door: "...Wren? You forgot your cloak..."')] },

    // ---- [PROPOSED] the one who walks the court alive: the Office feeder, at dawn and dusk
    { key: 'feeder', name: S('An Office feeder'), sprite: 'p61_clerk', home: [31.5, 5.5],
      day: [{ from: 19, to: 6, job: 'home' }, st(6, 9, 'carry', [21.0, 18.6], { to2: [28.4, 26.6] }), { from: 9, to: 17, job: 'home' }, st(17, 19, 'carry', [28.4, 18.6], { to2: [20.6, 26.6] })],
      props: [['p60_cart', 31.0, 7.0, 0.9, PI / 2]],
      greet: S('A clerk in Office grey with a handcart of bread, putting a loaf down where each loop will pass, and moving on. He does not look at their faces. "They eat if you put it where they walk," he says. "You learn the loops."'),
      work: S('"Bread at dawn, bread at dusk. Four thousand, once. Fewer now. I don\'t count. Counting is someone else\'s desk."'),
      barks: [S('The Office feeder, setting down a loaf: "There. And there. And there."')] },
  ];

  try { if (typeof LIFE60 !== 'undefined') LIFE60.add('whispergrove', R, { gone: () => false }); } catch (e) { console.warn('life62-whispergrove failed to register', e); }
  // the variants can only be painted once the Hollow sprite exists: paint again whenever the city is staged
  try {
    if (typeof window !== 'undefined' && typeof window.loadMap === 'function') {
      const _l = window.loadMap;
      window.loadMap = function (id) { try { if (id === 'whispergrove') paint(); } catch (e) { /* plain */ } return _l.apply(this, arguments); };   // only for the city: see js/malting61.js on the texture atlas
    }
  } catch (e) { /* none */ }
  return { TEXTS, ROSTER: R, paint };
})();
if (typeof window !== 'undefined') window.LIFE62_WG = LIFE62_WG;
