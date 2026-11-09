// ============================================================
//  prologue17 — Phase 17 "Beyond Book One", team PROLOGUE: "Prologue: The River Gate".
//
//  An extra, after Book One. Rootday the nineteenth of Frostmonth, 419: Lyra Ashgrove, with no voice, walks the last
//  of the Greenroot road in snow and comes home to Oakhaven, which is a wood now. The scene is the author's own: Book
//  Four, Part One, Chapter Four ("The Root"), from the road to the river gate and Dorran Sedge, and it stops there,
//  before the square. WHY THIS MOMENT: Book Four says plainly that Lyra had not been inside the Hedge since the
//  Kestrel left in Harvestmonth ("She came through the river gate in the dark, and stood, and did not know where she
//  was"; Dorran: "They said you'd gone up in the airship"), and Book Two puts her on the Kestrel all through Ashfall.
//  The fallen leaves exist only from Nullday the eighteenth of Frostmonth. So the first evening the three set pieces
//  (the houses in the crowns, the leaves, the voice outside the Hedge) can be walked as Lyra without contradicting
//  Books Two to Four is this one. Everything after Dorran's "You'd best come and see the Governor" is left to the book.
//
//    * Two maps, registered from this module ONLY while the extra runs (a Book One game never builds them):
//        p17p_road  The Greenroot road from the second milestone to the grey Hedge, the North Gate (sealed), the path
//                   along the outside of the Hedge, the river and the river gate. Graves along the verges, set the Reach
//                   way (stone on the tongue, stone on the stone); some bare. The oaks do not ring.
//        p17p_wood  Oakhaven inside the river gate: the river street, leaves a foot deep and silent, great grey trunks
//                   with the houses carried up into their crowns. Dorran Sedge comes out of the trees with a lantern.
//    * PLAYING AS LYRA (no voice): what she says, she writes on the slate (event choices); she lifts her good hand; the
//      Song key whistles the tending note, thinly, and it hurts (Book Three: she "found out she could still whistle").
//      She does not hum and does not sing: the Rite took her voice (Book Two, Seraphina: "I'm told the Rite at Oakhaven
//      took it"). Her companions on the road are Book Four's: Seraphina, the Aegis, Ignatius Crane, Solenne. They follow
//      her, never block her (not solid), and help with the stones as the book says.
//    * No combat. Nothing here can hurt you; nothing can be failed. The horror is the graves and a voice in the thorn.
//    * ISOLATION: EXTRAS17 (js/extras17.js) runs start() inside its own session. This module writes only G.flags under
//      p17p_ in that session; every wrapper is inert unless this extra is running (active()). If EXTRAS17 is still the
//      contract stub, start()/finish() fall back to a plain session of their own and return to the title.
//
//  GAMEPLAY TABLE (B below): wading in the leaves x0.82 speed; companions keep about 1.2 u behind each other along your
//  own trail; Dorran walks at 1.35 u/s and waits if you are more than 4.5 u behind; companions set a stone on a bare
//  grave near them every 7 s once the Aegis has begun; the Song key whistles once per 6 s; time of day runs from
//  afternoon at the second milestone to dusk at the Hedge (by how far up the road you are) and is night in the wood.
//
//  STATE: G.flags under p17p_ only, small validated integers (FLAGS). Transient run state (RUN) is never saved.
//  Every invented name, place and fact is marked [PROPOSED]; the dialogue is the author's, from Book Four.
//  Art: procedural stand-ins (canvas painting, cached once); companions are recoloured / over-painted copies of the
//  game's own sprites. Security: event markup is built only from the constant TX table (escaped); nothing from a save.
// ============================================================
'use strict';

const PROLOGUE17 = (function () {
  const FP = 'p17p_';
  const ID = 'prologue';
  const MAPS = ['p17p_road', 'p17p_wood'];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------------------------------------------------------------- balance and timing, one table
  const B = {
    DAY: 73,                       // G.day 0 is Nullday the sixth of Harvestmonth 419; 73 is Rootday the nineteenth of Frostmonth
    TOD_ROAD: [0.64, 0.752],       // afternoon at the second milestone, dusk at the Hedge (Book Four: "in the dusk")
    ROAD_Y: [92, 19],              // the stretch of road the clock is spread over
    TOD_WOOD: 0.83,                // "in the dark"
    LAMP_FROM: 0.735,              // Lyra's lantern is lit from about here on the road
    WADE: 0.82,                    // "a foot deep in the streets ... so that you waded through them"
    CRUMB: 0.4, GAP: 3, FOLLOW: 5.2, SNAP: 9,   // companions: trail spacing (u), crumbs between them, top speed (u/s), teleport distance
    DORRAN_SPEED: 1.35, DORRAN_LEAD: 4.5, MEET_R: 1.9, END_R: 3.4,
    HELP_EVERY: 7, HELP_R: 9,
    WHISTLE_CD: 6, WHISTLE_HZ: 696,
    LIMB_Y: 85.5, COUNT_Y: 50.5, RISE_Y: 23,
    GATE: { x: 26.5, y: 13.5 }, GATE_ZONE: { x0: 21.5, x1: 31.5, y1: 18.6 }, VOICE_X: 31.6, VOICE_AWAY: 1.4,
    WOOD_LINES: [0.6, 4.2, 8.4, 12.6, 15.4, 18.6],   // seconds after the river gate: the three sights, Seraphina, "You do not know", Dorran
    WINTER: { p17p_road: { snow: 0.8, fall: 0.35, breath: true, grade: 0.45 }, p17p_wood: { snow: 0.4, fall: 0.25, breath: true, grade: 0.45 } },   // in the wood the snow is thin enough that the leaves show through
  };

  // ---------------------------------------------------------------- flags (validated small integers, p17p_ only)
  const FLAGS = { stage: [0, 6], graves: [0, 1023], stones: [0, 99], limb: [0, 1], help: [0, 2], count: [0, 1], rise: [0, 1], gate: [0, 1], voice: [0, 1], seen: [0, 3], wood: [0, 6], dorran: [0, 4], done: [0, 1] };
  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  function fint(k) { const v = flags()[FP + k], r = FLAGS[k]; return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0; }
  function setf(k, v) { const r = FLAGS[k]; flags()[FP + k] = clamp(v | 0, r[0], r[1]); }
  function validate() {
    const f = flags();
    for (const k of Object.keys(f)) {
      if (k.indexOf(FP) !== 0) continue;
      const name = k.slice(FP.length);
      if (!has(FLAGS, name)) { delete f[k]; continue; }
      const v = f[k], r = FLAGS[name];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete f[k];
    }
  }

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  // Dialogue and most description are the author's (Book Four, Part One, Chapter Four), put into the game's second
  // person and present tense. Lines marked [PROPOSED] are this team's.
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    extra: {
      title: S('Prologue: The River Gate'),
      blurb: S('Rootday the nineteenth of Frostmonth, 419. Lyra Ashgrove, with no voice, walks home to Oakhaven through the snow.'),   // [PROPOSED] card text
      banner: S('An extra — after Book One'),
    },
    open: {
      title: S('Rootday the nineteenth of Frostmonth'),
      p: [
        S('An extra — after Book One. It is set two months after the Greening, and it spoils how Book One ends.'),   // [PROPOSED]
        S('There is snow on the Greenroot road. There has never been snow on the Greenroot road in your life.'),
        S('The Kestrel set you down at Greenroot Hamlet on Memoryday, on its way to the Woods and the Coast. You have walked for two days. The snow began on the first night.'),
        S('You are Lyra Ashgrove, Cantor of Oakhaven. You have no voice. There is a slate on a cord round your neck and chalk in your pocket, and your burned hand is bound in clean linen.'),
      ],
      go: S('Walk on.'),
      hint: S('You cannot speak. What you say, you write on the slate. The Song key whistles, thinly, and it hurts.'),   // [PROPOSED] control hint
    },
    road: {
      name: S('The Greenroot road'),
      oak: S('An iron-bark oak, bare and grey, with the snow along its limbs. It does not ring.'),
      woods: S('Iron-bark oaks, close and grey, with the snow lying on them.'),
      knock: S('A dull wet knock. No bell.'),
      m2: S('The second milestone.'), m3: S('The third milestone.'), m4: S('The fourth milestone.'), m5: S('The fifth milestone.'),
      limbFall: S('At the second milestone a branch comes down in the wind, an oak-limb as thick as your thigh, ten yards ahead. It strikes the frozen ground with a dull wet crack.'),
      noBell: S('No bell. In the Reach, since 417, any blow on wood has rung. An oak-limb falling should have tolled like struck bronze, and brought every hound for a mile. It lies across the road in the snow and is only wood.'),
      isThat: S('"Is that—" Seraphina looks at the limb, then at you. You nod.'),
      isGood: S('"Is that good?" You do not know how to answer. You have no slate free: your good hand is holding your coat shut at your throat, and your burned hand is in your armpit for the warmth.'),
      limb: S('An oak-limb as thick as your thigh, across the road. Grey, and dead, and silent.'),
      graves: S('There are graves along the road. Low mounds of turned earth under the snow, a stride long, some shorter.'),
      count: S('You stop counting at the fourth milestone, at sixty. They go on.'),
      graveDone: S('A grave, set the Reach way: a stone at its head, flat side up, with a smaller stone on top. Stone on the tongue, stone on the stone. This one is quiet, and the next person along the road will not dig.'),
      graveBare: S('A grave with a stone at its head, and nothing on it. Whoever buried this one had no time to do it properly. Or had no stone. Or did not know how.'),
      needStone: S('You have no stone to set. There are flat stones under the snow at the side of the road.'),
      stones: S('Stones, under the snow at the side of the road.'),
      took: S('You find a stone under the snow at the side of the road, flat, the size of your palm.'),
      setOne: S('You set it on the marker. Stone on the stone. So that the next person to come along the road will know.'),
      childTitle: S('A small grave'),
      child: S('A child\'s. A stone at the head, and nothing on it. Whoever buried this one had not had time to do it properly. Or had not had a stone. Or had not known how. Or had been the last of their family on the road, and buried the child alone, and walked on.'),
      kneel: S('Kneel, and put your good hand flat on the turned earth.'),
      kneelText: S('It is frozen hard. Nothing comes up through it. No hum. No growth. You had braced for it, for the person in the ground still growing. There is nothing at all: cold earth, and a small shape under it that has stopped. You do not know whether to be glad.'),
      setBtn: S('Set a stone on the marker.'),
      goBtn: S('Go on.'),
      aegis: S('Behind you the Aegis\'s knee grinds as it bends, and iron clicks on stone. It has found a stone too. It has set it on the next bare grave along.'),
      others: S('After a while Seraphina begins to do it too, and then Ignatius Crane with his one good hand, and at the last, without looking at any of you, Solenne.'),
      helped: S('Iron clicks on stone behind you: another bare grave has its stone.'),   // [PROPOSED] wording
      rise: S('The Hedge is grey. It was green, always; even in the Greening it was green. Now the thorn is bare and grey and the wool between the roots is grey and sodden, and the whole long wall of it curves away round the hill in the dusk, under the snow, like the spine of something dead.'),
      hedge: S('The Hedge: blackthorn and briar three men deep, with raw wool packed between the roots to swallow the town\'s sounds. It is grey now. The wind goes through the bare thorn and does not even whistle.'),
      gate: S('The North Gate. A great iron grille in an arch of stone, rusted shut, with the thorn grown through it. It has been sealed since the Greening, only two months. It looks as if it had been shut a hundred years.'),
      post: S('A gatepost of the North Gate, capped with snow.'),
      ada: S('This is where Ada Pellow went in, on the day of the Greening, with the town going under the oaks behind you. The Hedge spoke out of the thorn in the voices of Oakhaven\'s dead, and she heard your father\'s voice, and climbed in toward it. You had sixty people behind you. You kept walking.'),
      good: S('The Hedge is grey and silent in the snow. Good, you think.'),
      round: S('The river gate is round to the east, along the outside of the Hedge. You know the way.'),
      riverGate: S('The river gate, where the river goes in under the Hedge.'),
      noTravel: S('Not tonight. The road goes one way.'),   // [PROPOSED]
      noRest: S('Not here. Not yet.'),                       // [PROPOSED]
    },
    voice: {
      title: S('"Lyra-love."'),
      p1: S('You do not turn round.'),
      p2: S('You stand in the road with your back to the Hedge and your hand at your throat, and you do not turn round, and you do not breathe.'),
      q1: S('"Lyra-love. Is that you?"'),
      listen: S('Listen.'),
      still: S('Do not turn round.'),
      l1: S('Low. Warm. A little hoarse, the way it always was at the end of the day, from singing in the orchards. A man\'s voice. Your father\'s, as it was before they took him.'),
      l2: S('The Hedge was planted to swallow sound. Everything Oakhaven said for two years went into the thorn and was kept there: every word, every cry, every song. Your father never stood inside it. They took him at the Pellow farm in the spring, before there was any thorn. But a week later the voice began at the edge of the fields, and when there was a Hedge it came to the Hedge, and it has said your name there every evening since.'),
      q2: S('"Lyra-love. Come round where I can see you."'),
      whoTitle: S('Who is that?'),
      w1: S('Seraphina comes up beside you in the snow, and stops. Behind you, the Aegis\'s knee grinds.'),
      w2: S('"Lyra," says Seraphina, very low. "Who is that?"'),
      write: S('Take up the slate, and write.'),
      nbTitle: S('NOBODY'),
      nb1: S('You lift the slate on its cord and find the chalk in your pocket. Your fingers are stiff with cold. It takes you a long time to write it.'),
      nb2: S('NOBODY.'),
      nb3: S('You hold it up. Then you walk away from the North Gate along the outside of the Hedge, toward the river gate, in the dusk. You do not look back. Behind you, very faint, through the grey thorn, the voice says your name once more, the way it always said it, with the little fall at the end.'),
      nb4: S('Lyra-love.'),
      nb5: S('Like a question.'),
      go: S('Walk on.'),
      heard: S('Through the grey thorn, a man\'s voice: "Lyra-love."'),
    },
    wood: {
      name: S('Oakhaven'),
      in1: S('You come through the river gate in the dark, and stand, and do not know where you are.'),
      in2: S('Houses. In the trees. Forty feet up, sixty, eighty, wedged in the forks of great grey trunks as thick as towers. Tilted, broken-backed, with their doors hanging open on nothing.'),
      in3: S('The leaves are gone. Every one. They lie a foot deep in the street under the snow, brown and grey and black, and frozen, and they do not rustle when you wade through them.'),
      when: S('"When?" says Seraphina. Her breath smokes. "When did they fall? They\'d fall slowly. In autumn. It\'s not—"'),
      dunno: S('You do not know.'),
      nullday: S('"Nullday," says a voice from the dark. "Nullday night. Last night but one, at the dead hour. All at once."'),
      trunk: S('An iron-bark oak, grey, as thick as a tower. It came up through the cobbles and the cellars and the floors of houses, and carried the houses up with it.'),
      cottage: S('A cottage turned on its side in the crown of an oak above the river street, with its chimney pointing at the river.'),
      shop: S('A shop-front sixty feet up in the snow, the painted board still over the door: HALE & DAUGHTER, CORDWAINERS.'),
      cart: S('A cart, up in the crown of an oak.'),
      bed: S('A bed, iron-framed, caught in the fork of a branch, with its blankets frozen to it.'),
      house: S('A house wedged in the fork of a great grey trunk, broken-backed, its door hanging open on nothing.'),
      bare: S('An iron-bark oak with not one leaf on it.'),
      hedge: S('The Hedge, from the inside. Grey.'),
      back: S('The river gate, back out to the road.'),
    },
    dorran: {
      name: S('Dorran Sedge'),
      d1: S('An old man comes out of the trees on the far side of the river street with a lantern of his own, wading through the leaves. He stops, and holds the lantern up, and looks at you all: at the Aegis, nine feet of iron with DEFEND THE SINGERS on its chest and the rosy light in its helm; at the knight in white with the Sun-Blade; at the tall woman with the wings; at the priest with the translucent hand, in a woman\'s apron. And at you.'),
      d2: S('His face does a thing. "Cantor," he says.'),
      d3: S('You know him. It takes you a moment. He is thinner than he was, and his beard has gone white. Dorran Sedge, who kept the river gate for twenty years and the reed-beds at Reedside before that. He has a wife called Mabbie and a voice like a bullfrog, and he sang bass in the orchard choir every Longest Night you can remember, before 417.'),
      hand: S('Lift your good hand.'),
      e1: S('"Cantor," says Dorran Sedge again. He does not move. He stands in the leaves with the lantern held up and looks at you as if he is afraid that if he moves you will not be there. "Cantor Ashgrove. They said— The ones that walked out. Harvestmonth. They said you\'d gone up in the airship and the airship\'d gone down in the Woods. They said the Church had you. They said—"'),
      e2: S('He stops. He has seen the slate round your neck, and the way you are holding your throat.'),
      e3: S('He comes across the river street to you through the leaves. He is a big man, and he has always been slow. He looks at your throat for a long moment, and then, very carefully, the way you lift something that might break, he puts his free hand on your shoulder.'),
      e4: S('"Does it ring?" says Dorran Sedge.'),
      e5: S('The oldest thing in the Reach. Are you well. You have said it a thousand times, to the burl-sick in the Hollow, to women in labour, to old men in the orchard, to children who had fallen out of trees.'),
      answer: S('Answer him.'),
      writeBtn: S('Write on the slate.'),
      a1: S('You open your mouth. Nothing comes out. Only breath, and a long raw pull low in your throat where the torn place is. You shut your mouth. You stand there.'),
      noTitle: S('NO'),
      n1: S('You take up the slate and write on it, very slowly, with your stiff fingers, in the square capitals you have been writing for two months.'),
      n2: S('NO.'),
      n3: S('Dorran Sedge looks at it for a long time.'),
      n4: S('"No," he says. "No. Nor me." He takes his hand off your shoulder. "Nobody says it now, Cantor. Not since Nullday. Nobody\'s said true enough since the leaves came down."'),
      n5: S('He turns, and holds his lantern up toward the dark at the top of the river street, toward the square. "You\'d best come and see the Governor. Before you see anything else. He\'s been asking for you. He\'s been asking every night." He stops. "He doesn\'t ask so loud now. You\'ll have to go close."'),
      follow: S('Follow him.'),
      lead: S('Follow Dorran Sedge up the river street.'),
      label: S('Dorran Sedge, with his lantern held up toward the top of the river street.'),
      wait: S('Dorran Sedge stops in the leaves, and waits for you, with the lantern held up.'),   // [PROPOSED]
    },
    end: {
      title: S('The Grove'),
      p1: S('It is called the Grove now. Dorran tells you that on the way up the river street, wading. The ones at Reedside have called it that since Ashfall, and the name has stuck. The Grove. As if there were no other.'),
      p2: S('Here the prologue ends. What is at the top of the river street, the books will tell.'),   // [PROPOSED]
      stones: S('Stones you set on the stone, on the Greenroot road: {0}.'),
      btn: S('Return'),
    },
    comp: {
      seraphina: S('Seraphina: the knight in white, with the Sun-Blade.'),
      aegis: S('The Aegis: nine feet of iron with DEFEND THE SINGERS on its chest, and in its helm, faint and rosy, like a hand over a candle, the light of the core.'),
      ignatius: S('Ignatius Crane: the priest with the translucent hand, in a woman\'s apron.'),
      solenne: S('Solenne: the tall woman with the broken black-gold wings.'),
      nSeraphina: S('Seraphina'), nAegis: S('The Aegis'), nIgnatius: S('Ignatius Crane'), nSolenne: S('Solenne'),
    },
    whistle: S('You put your lips together and whistle the tending note, thin and breathy. It hurts, lower down, where the breath goes up past the torn place. You taste iron.'),
    item: {
      slate: S('The slate'),
      slateDesc: S('A slate on a cord round your neck, and a stub of chalk in your pocket. You write in square capitals.'),
      stone: S('A flat stone'),
      stoneDesc: S('A flat stone the size of your palm, from under the snow. For a grave that has none on its marker.'),
    },
    jour: {
      start: S('Rootday the nineteenth of Frostmonth. Two days on foot from Greenroot Hamlet, where the Kestrel set us down. There is snow on the Greenroot road, and the oaks do not ring.'),   // [PROPOSED] Lyra's own log lines
      graves: S('Graves all along the Greenroot road, set the Reach way: stone on the tongue, stone on the stone. Some have no second stone. I set them where I could.'),
      voice: S('At the North Gate the Hedge said my name in my father\'s voice. I wrote NOBODY, and went round to the river gate.'),
      wood: S('Oakhaven is a wood. The houses are up in the trees, and every leaf in the town is on the ground.'),
      dorran: S('Dorran Sedge, who kept the river gate, is still here. He asked me does it ring. I wrote NO. He is taking me up the river street, to the Governor.'),
    },
  };
  const LYRA = 'Lyra Ashgrove';

  // ---------------------------------------------------------------- run state (transient, never saved)
  const RUN = { on: false, aware: false, starting: false, crumbs: [], whistleT: 0, awayT: 0, helpT: 0, woodT: 0, gateT: 0, lamp: null, said: {}, knockT: 0, endShown: false };
  const extraId = () => { try { return typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra ? EXTRAS17.inExtra() : null; } catch (e) { return null; } };
  // a real EXTRAS17 says which extra is running; the contract stub always says null, and then our own flag decides
  function active() { return RUN.aware ? extraId() === ID : RUN.on; }
  const inMine = (id) => MAPS.indexOf(id) >= 0;
  const here = () => active() && typeof G !== 'undefined' && G.map && inMine(G.mapId);
  const mapOf = (id) => (typeof G !== 'undefined' && G.maps) ? G.maps[id] : null;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // event bodies: paragraphs from TX only; {i:..} italic, {b:..} bold
  const body = (paras) => paras.map((p) => (typeof p === 'string' ? esc(p) : p.i ? '<i>' + esc(p.i) + '</i>' : '<b>' + esc(p.b) + '</b>')).join('<br><br>');
  function say(text, cls, ttl, key, gap) {
    if (key) { const now = (G && G.time) || 0; if (RUN.said[key] != null && now - RUN.said[key] < (gap || 1e9)) return false; RUN.said[key] = now; }
    try { msg(text, cls || '', ttl || 6000); } catch (e) { /* no HUD yet */ }
    return true;
  }
  const voiceOf = (id) => { try { if (typeof VOICES !== 'undefined' && VOICES.play) VOICES.play('npc', id, 'greet', null); } catch (e) { /* cosmetic */ } };
  const scares = () => { try { return typeof NERVES13 !== 'undefined' && NERVES13.scaresAllowed ? NERVES13.scaresAllowed() : 'gentle'; } catch (e) { return 'gentle'; } };
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion); } catch (e) { return false; } };

  // ---------------------------------------------------------------- art (procedural stand-ins, painted once)
  const rng = typeof mulberry32 === 'function' ? mulberry32 : (a) => () => (a = (a * 16807) % 2147483647) / 2147483647;
  function hsh(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, cx, cy, s) {             // value noise, periodic over 64 texels
    const nx = 64 / cx, ny = 64 / cy, fx = x / cx, fy = y / cy, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const X0 = ((x0 % nx) + nx) % nx, X1 = (X0 + 1) % nx, Y0 = ((y0 % ny) + ny) % ny, Y1 = (Y0 + 1) % ny;
    const a = hsh(X0, Y0, s), b = hsh(X1, Y0, s), c = hsh(X0, Y1, s), d = hsh(X1, Y1, s), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function makeTex(name, fn) {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || Engine.textures[name]) return;
    const d = new Uint32Array(64 * 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const o = fn(x, y);
      d[y * 64 + x] = (255 << 24) | ((clamp(o[2], 0, 255) | 0) << 16) | ((clamp(o[1], 0, 255) | 0) << 8) | (clamp(o[0], 0, 255) | 0);
    }
    Engine.addTexture(name, d);
  }
  const SNOW = [214, 220, 230], SNOW_SH = [168, 178, 198];
  function paintTextures() {
    // trodden road snow: grey-white, slushy patches, a few old footprints
    makeTex('p17p_snowroad', (x, y) => {
      const n = vnoise(x, y, 16, 16, 3) * 0.6 + vnoise(x, y, 4, 4, 4) * 0.4;
      let c = mix(SNOW, [150, 152, 158], clamp((n - 0.42) * 2.2, 0, 1) * 0.7);
      const fx = (x + 7) % 16, fy = (y + ((x >> 4) * 9)) % 21;
      if ((fx - 5) * (fx - 5) / 6 + (fy - 8) * (fy - 8) / 14 < 1) c = mix(c, [128, 132, 142], 0.45);      // footprints, filled with new snow
      return c.map((v) => v - 6 + hsh(x, y, 5) * 12);
    });
    // field snow: bright, blue in the hollows, a few dry stalks through it
    makeTex('p17p_snow', (x, y) => {
      const n = vnoise(x, y, 16, 16, 7) * 0.7 + vnoise(x, y, 8, 8, 8) * 0.3;
      let c = mix([232, 236, 242], SNOW_SH, clamp((0.62 - n) * 2, 0, 1) * 0.6);
      if (hsh(x >> 1, y >> 2, 9) > 0.985) c = [112, 96, 70];
      return c.map((v) => v - 5 + hsh(x, y, 10) * 10);
    });
    // the leaves: brown and grey and black, frozen, a foot deep, with the snow in drifts over them
    const leaves = (seed, snowAmt) => (x, y) => {
      const cx = x >> 2, cy = y >> 2, h = hsh(cx, cy, seed), ox = (x & 3) - 1.5, oy = (y & 3) - 1.5;
      const pal = [[96, 66, 40], [112, 84, 52], [92, 90, 86], [52, 46, 42], [74, 56, 36], [124, 100, 66]];
      let c = pal[(h * pal.length) | 0];
      const edge = ox * ox + oy * oy > 3.2 + hsh(cx, cy, seed + 1) * 1.5;
      if (edge) c = c.map((v) => v * 0.62);
      if (hsh(x, y, seed + 2) > 0.94) c = c.map((v) => v * 1.25);                     // frost catching the light
      const drift = vnoise(x, y, 16, 16, seed + 3) * 0.75 + vnoise(x, y, 4, 4, seed + 4) * 0.25;
      const k = clamp((drift - (1 - snowAmt)) * 5, 0, 1);
      return mix(c, mix(SNOW, SNOW_SH, vnoise(x, y, 8, 8, seed + 5) * 0.5), k);
    };
    makeTex('p17p_leaves', leaves(31, 0.42));
    makeTex('p17p_leaves2', leaves(37, 0.62));
    // the grey Hedge: bare thorn in a tangle, sodden grey wool at the roots, snow along the top
    makeTex('p17p_hedge', (x, y) => {
      let c = [62, 62, 64].map((v) => v * (0.8 + vnoise(x, y, 16, 16, 40) * 0.4));
      for (let k = 0; k < 5; k++) {                                     // thorn stems: diagonal strands that wander
        const t = ((x * (k % 2 ? 1 : -1) + y * 0.9 + k * 13 + vnoise(x, y, 16, 32, 42 + k) * 14) % 16 + 16) % 16;
        if (t < 1.6) c = mix(c, [150, 148, 142], 0.85 - k * 0.08);
        else if (t < 2.4) c = mix(c, [30, 30, 32], 0.6);
      }
      const w = vnoise(x, y, 8, 8, 47);
      if (w > 0.72) c = mix(c, [146, 144, 136], 0.75);                 // sodden grey wool between the stems
      if (vnoise(x, y, 4, 4, 49) > 0.86) c = mix(c, SNOW, 0.8);         // snow caught in the thorn
      return c.map((v) => v - 4 + hsh(x, y, 50) * 8);
    });
    // the edge of the wood along the road: close grey trunks, dark between, snow at their feet and on their west sides
    makeTex('p17p_woods', (x, y) => {
      const cols = [0, 9, 13, 24, 31, 40, 46, 57, 64];
      let i = 0; while (i < cols.length - 1 && x >= cols[i + 1]) i++;
      const a = cols[i], b = cols[i + 1], t = (x - a) / Math.max(1, b - a), trunk = i % 2 === 0;
      let c = trunk ? mix([116, 114, 108], [70, 70, 68], t) : [30, 32, 40].map((v) => v + vnoise(x, y, 8, 16, 51) * 14);
      if (trunk && vnoise(x, y, 2, 16, 52 + i) > 0.62) c = c.map((v) => v * 0.7);
      if (trunk && t < 0.18) c = mix(c, SNOW, 0.55);
      if (y > 54 - vnoise(x, 0, 8, 64, 53) * 6) c = mix(SNOW, SNOW_SH, vnoise(x, y, 8, 8, 54) * 0.6);
      return c.map((v) => v - 4 + hsh(x, y, 55) * 8);
    });
    // iron-bark: grey, furrowed, snow lodged in the furrows
    makeTex('p17p_bark', (x, y) => {
      const w = (x + vnoise(x, y, 64, 16, 61) * 9) % 64;
      const f = Math.abs(Math.sin(w / 64 * Math.PI * 6));
      let c = mix([62, 60, 58], [138, 134, 126], f);
      c = c.map((v) => v * (0.85 + vnoise(x, y, 4, 16, 62) * 0.3));
      if (f < 0.18 && vnoise(x, y, 8, 8, 63) > 0.62) c = mix(c, SNOW, 0.7);
      if (y > 58) c = mix(c, SNOW, (y - 58) / 6);
      return c;
    });
    // the North Gate: a rusted grille in a stone arch, thorn through the bars
    makeTex('p17p_gate', (x, y) => {
      const stone = x < 6 || x > 57 || y < 7;
      if (stone) { const b = ((y >> 3) + (x >> 4)) % 2; return mix([118, 116, 112], [96, 94, 92], b * 0.5 + vnoise(x, y, 4, 4, 71) * 0.4).map((v) => (y < 3 ? v * 0.6 + 90 : v)); }
      let c = [22, 22, 26].map((v) => v + vnoise(x, y, 8, 8, 72) * 16);
      const bar = (x - 6) % 9 < 3, cross = (y > 22 && y < 26) || (y > 46 && y < 50);
      if (bar || cross) { c = mix([128, 70, 40], [86, 52, 34], vnoise(x, y, 2, 4, 73)); if ((x - 6) % 9 === 0) c = c.map((v) => v * 1.25); }
      const th = ((x * 0.8 + y + vnoise(x, y, 16, 16, 74) * 22) % 21 + 21) % 21;
      if (th < 1.3) c = [118, 116, 110];
      if (y > 58) c = mix(c, SNOW, 0.8);
      return c;
    });
    makeTex('p17p_post', (x, y) => {
      const b = ((y >> 3) + ((x + (y >> 3) * 8) >> 4)) % 2;
      let c = mix([120, 118, 112], [92, 90, 88], b * 0.5 + vnoise(x, y, 4, 4, 81) * 0.5);
      if ((y & 7) === 0 || ((x + (y >> 3) * 8) & 15) === 0) c = c.map((v) => v * 0.6);
      if (y < 6) c = mix(SNOW, c, y / 6);
      return c;
    });
    // the river gate: dark planks, iron bands, grey thorn at its edges
    makeTex('p17p_rivergate', (x, y) => {
      let c = (x % 12 < 1) ? [28, 22, 18] : mix([74, 58, 42], [52, 40, 30], vnoise(x, y, 2, 16, 91));
      if ((y > 12 && y < 16) || (y > 46 && y < 50)) c = mix([70, 66, 64], [46, 44, 44], vnoise(x, y, 4, 2, 92));
      if (x < 4 || x > 59) c = mix(c, [110, 108, 102], 0.6);
      if (y < 4) c = mix(SNOW, c, y / 4);
      return c;
    });
  }

  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    const id = x.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 1; x.stroke(); } };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.lineCap = 'round'; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  function glowMask(name, test) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]; if (!sp || !Engine.setEmissive) return;
    const m = new Uint8Array(sp.w * sp.h); let n = 0;
    for (let i = 0; i < m.length; i++) { const p = sp.data[i], a = p >>> 24; if (a < 120) continue; const r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255; if (test(r, g, b)) { m[i] = 1; n++; } }
    if (n) Engine.setEmissive(name, m);
  }
  // Sprites are painted near the size they are drawn at (the view is 320 pixels wide): bold shapes, no hairlines, so
  // nearest-neighbour scaling keeps them crisp instead of turning thin twigs into dither.
  // a bare branch, recursively, with snow along the upper side of the thicker limbs
  function branch(x, r, x0, y0, ang, len, th, depth, col) {
    const x1 = Math.round(x0 + Math.cos(ang) * len), y1 = Math.round(y0 + Math.sin(ang) * len);
    L(x, x0, y0, x1, y1, col, th);
    if (th >= 3) L(x, x0, y0 - th * 0.45, x1, y1 - th * 0.45, '#e6ebf2', Math.max(1.2, th * 0.34));
    if (depth <= 0 || len < 5) return;
    const n = 2 + (r() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const spread = (i - (n - 1) / 2) * (0.6 + r() * 0.25);
      branch(x, r, x1, y1, ang + spread + (r() - 0.5) * 0.3, len * (0.62 + r() * 0.14), Math.max(1.5, th * 0.62), depth - 1, col);
    }
  }
  function trunk(x, w, h, base, top, yTop) {
    // a grey iron-bark trunk from the ground up to yTop, lit from the left, two furrows, snow banked at the foot
    const cx = w / 2;
    P(x, [[cx - base / 2, h], [cx - top / 2, yTop], [cx + top / 2, yTop], [cx + base / 2, h]], '#8e8b84');
    P(x, [[cx + base * 0.08, h], [cx + top * 0.1, yTop], [cx + top / 2, yTop], [cx + base / 2, h]], '#57564f');
    P(x, [[cx - base / 2, h], [cx - top / 2, yTop], [cx - top / 2 + 3, yTop], [cx - base / 2 + 4, h]], '#a9a69c');
    L(x, cx - base * 0.18, h - 3, cx - top * 0.15, yTop + 4, '#4a4944', 2); L(x, cx + base * 0.22, h - 3, cx + top * 0.25, yTop + 4, '#3c3b37', 2);
    E(x, cx, h - 2, base * 0.72, 5, '#e6ebf2'); E(x, cx - base * 0.2, h - 4, base * 0.3, 2.4, '#f6f8fb');
  }
  function paintOak() {
    addSprite('p17p_oak', 64, 96, (x, w, h) => {
      const r = rng(1701);
      trunk(x, w, h, 14, 8, 48);
      for (const [a, l] of [[-1.95, 22], [-1.45, 26], [-1.05, 22], [-2.5, 17], [-0.6, 17]]) branch(x, r, 32, 50, a, l, 5, 3, '#5a5852');
    });
  }
  // the crowns of Oakhaven's oaks, with what they carried up into them (POLISH17: painted larger and lower in the crown,
  // so each reads as a house from the street: a roof with snow on it, a chimney, a door hanging open on nothing)
  const CROWNS = ['bare', 'cottage', 'shop', 'cart', 'bed', 'house'];
  const CW = 128, CH = 224;                                    // the crown sprite; FORK is where the trunk divides
  const FORK = { bare: 140, cottage: 158, shop: 152, cart: 154, bed: 152, house: 148 };
  const HC = { plaster: '#eadcbc', plasterSh: '#b8a684', plasterDk: '#8e7e62', timber: '#5a3e28', roof: '#7a5a42', roofSh: '#54402e', tile: '#4a3828',
    dark: '#100c0a', door: '#9a6a40', doorSh: '#6a4628', snow: '#f4f7fb', snowSh: '#c6d0de', glass: '#2a3440', stone: '#7a746a' };
  // a 3x5 pixel font for the shop board, so the letters stay crisp when the sprite is scaled by nearest neighbour
  const GLYPH = { H: '101101111101101', A: '010101111101101', L: '100100100100111', E: '111100110100111', '&': '010101010101011', D: '110101101101110',
    U: '101101101101111', G: '011100101101011', T: '111010010010010', R: '110101110101101', C: '011100100100011', O: '010101101101010',
    W: '101101101111101', I: '111010010010111', N: '110101101101101', S: '011100010001110', ' ': '000000000000000' };
  function pixText(x, str, x0, y0, col, sc) {
    x.fillStyle = col; let cx = x0;
    for (const ch of str) { const g = GLYPH[ch] || GLYPH[' ']; for (let i = 0; i < 15; i++) if (g[i] === '1') x.fillRect(cx + (i % 3) * sc, y0 + ((i / 3) | 0) * sc, sc, sc); cx += 4 * sc; }
    return cx - x0 - sc;
  }
  // a house drawn about its own centre (0, 0): front wall w x h, a roof of height rh, a side wall seen in three-quarter,
  // windows, a chimney, and a door (open: a dark doorway and the leaf swung out on one hinge)
  function house(x, o) {
    const C = HC, w = o.w, h = o.h, rh = o.rh, sd = o.side || 10, l = -w / 2, t = -h / 2;
    P(x, [[w / 2, t], [w / 2 + sd, t - sd * 0.5], [w / 2 + sd, h / 2 - sd * 0.5], [w / 2, h / 2]], C.plasterDk);          // the side wall
    P(x, [[w / 2 + sd, t - sd * 0.5], [w / 2 + sd + 2, t - sd * 0.5 - 2], [w / 2 + sd + 2, h / 2 - sd * 0.5], [w / 2 + sd, h / 2 - sd * 0.5]], C.timber);
    R(x, l, t, w, h, C.plaster); R(x, l, h / 2 - 5, w, 5, C.plasterSh);                                             // the front
    R(x, l, t, w, 3, C.timber); R(x, l, h / 2 - 2, w, 2, C.timber); R(x, l, t, 3, h, C.timber); R(x, w / 2 - 3, t, 3, h, C.timber);   // the frame
    if (o.mid) R(x, -1.5, t, 3, h, C.timber);
    // the roof: tiles in rows, the ridge, the snow lying along it
    P(x, [[l - 5, t], [0, t - rh], [w / 2 + 5, t]], C.roof);
    P(x, [[0, t - rh], [w / 2 + 5, t], [w / 2 + sd + 5, t - sd * 0.5], [sd, t - rh - sd * 0.5]], C.roofSh);
    for (let k = 1; k < 4; k++) { const yy = t - rh + rh * k / 4, hw = (w / 2 + 5) * k / 4; L(x, -hw, yy, hw, yy, C.tile, 1.4); }
    P(x, [[l - 5, t], [l - 1, t - 4], [0, t - rh - 3], [sd + 1, t - rh - sd * 0.5 - 3], [sd + 2, t - rh - sd * 0.5 + 1], [0, t - rh + 2], [l + 1, t + 1]], C.snow);
    P(x, [[0, t - rh + 2], [sd + 2, t - rh - sd * 0.5 + 1], [w / 2 + sd + 5, t - sd * 0.5], [w / 2 + 5, t]], C.snowSh);
    if (o.chimney !== false) { const cx = o.chimney || w * 0.22; R(x, cx - 4, t - rh * 0.85 - 6, 8, 16, C.stone); R(x, cx - 5, t - rh * 0.85 - 8, 10, 3, '#3e3a34'); R(x, cx - 5, t - rh * 0.85 - 10, 10, 2, C.snow); }
    // windows: dark glass, a pale sill, one shutter hanging
    for (const wx of o.wins || []) { R(x, wx - 5, t + 7, 10, 10, C.glass); R(x, wx - 5, t + 7, 10, 2, C.dark); R(x, wx - 6, t + 17, 12, 2, C.snow); L(x, wx, t + 7, wx, t + 17, C.timber, 1.2);
      P(x, [[wx + 5, t + 7], [wx + 11, t + 9], [wx + 11, t + 20], [wx + 5, t + 17]], C.door); }
    if (o.door) {                                                                                                  // the doorway, open on nothing
      const dx = o.door, dw = 11, dh = Math.min(h - 6, 20);
      R(x, dx - dw / 2, h / 2 - dh - 1, dw, dh, C.dark); R(x, dx - dw / 2 - 1, h / 2 - dh - 3, dw + 2, 2, C.timber);
      P(x, [[dx + dw / 2, h / 2 - dh - 1], [dx + dw / 2 + 8, h / 2 - dh + 3], [dx + dw / 2 + 8, h / 2 + 3], [dx + dw / 2, h / 2 - 1]], C.door);
      L(x, dx + dw / 2 + 2, h / 2 - dh + 4, dx + dw / 2 + 6, h / 2 - dh + 6, C.doorSh, 1.2); E(x, dx + dw / 2 + 6, h / 2 - dh / 2, 1.2, 1.2, '#2a2018');
    }
  }
  function paintHouse(x, kind, fy) {
    const C = HC, cx = CW / 2;
    x.save();
    if (kind === 'cottage') {                  // a cottage on its side in the crown, its chimney pointing at the river
      x.translate(cx + 2, fy - 30); x.rotate(Math.PI / 2 - 0.08);
      house(x, { w: 58, h: 34, rh: 24, wins: [-16, 14], door: -1, chimney: 16, side: 9 });
    } else if (kind === 'shop') {              // HALE & DAUGHTER, CORDWAINERS: the board still over the door, the door hanging open
      const sc = document.createElement('canvas'); sc.width = 100; sc.height = 92;
      const q = sc.getContext('2d'); q.translate(46, 56);
      house(q, { w: 80, h: 46, rh: 18, wins: [], door: 24, chimney: -24, side: 10, mid: false });
      R(q, -38, -18, 50, 24, '#2c3a4a'); R(q, -36, -16, 46, 20, '#6e8294'); L(q, -13, -16, -13, 4, C.timber, 2); L(q, -36, -6, 10, -6, C.timber, 1.5);   // the shop window
      R(q, -40, -52, 80, 32, '#1e3a2c'); R(q, -40, -52, 80, 2, '#c8a85a'); R(q, -40, -22, 80, 2, '#c8a85a');                                           // the board
      pixText(q, 'HALE &', -23, -49, '#f2e2a8', 2); pixText(q, 'DAUGHTER', -31, -38, '#f2e2a8', 2); pixText(q, 'CORDWAINERS', -22, -27, '#d8c48a', 1);
      R(q, -42, -55, 84, 3, C.snow);
      x.imageSmoothingEnabled = false; x.translate(cx, fy - 30); x.rotate(-0.07); x.drawImage(sc, -46, -56);
    } else if (kind === 'cart') {              // a cart, up in the crown
      x.translate(cx, fy - 22); x.rotate(0.3);
      R(x, -30, -9, 60, 14, '#6e5034'); R(x, -30, -9, 60, 3, '#8a6a46'); R(x, -30, 3, 60, 3, '#3e2c1c'); for (let k = -20; k <= 20; k += 10) L(x, k, -9, k, 5, '#4a3624', 1.2);
      R(x, -31, -13, 62, 4, C.snow);
      L(x, 30, -2, 52, -14, '#5a4230', 3); L(x, 30, 3, 52, -9, '#5a4230', 3);
      for (const wx of [-17, 16]) { x.beginPath(); x.arc(wx, 10, 10, 0, Math.PI * 2); x.strokeStyle = '#2e2216'; x.lineWidth = 3.2; x.stroke(); for (let a = 0; a < 6; a++) L(x, wx, 10, wx + Math.cos(a) * 9, 10 + Math.sin(a) * 9, '#4a3624', 1.6); E(x, wx, 10, 2.6, 2.6, '#2e2216'); }
    } else if (kind === 'bed') {               // an iron bed caught in a fork, its blankets frozen to it
      x.translate(cx, fy - 24); x.rotate(-0.36);
      R(x, -30, -22, 4, 40, '#22222a'); R(x, 26, -14, 4, 32, '#22222a'); for (let k = 0; k < 4; k++) L(x, -30, -18 + k * 5, -26, -18 + k * 5, '#3a3a44', 1.2);
      R(x, -27, -4, 54, 10, '#d8dde4'); R(x, -27, -6, 18, 6, '#eef1f6');                                                  // mattress, pillow
      P(x, [[-12, -6], [27, -7], [30, 10], [22, 26], [6, 18], [-8, 24], [-12, 8]], '#8a9cb4'); L(x, -4, 0, 18, 22, '#6a7c94', 1.4); L(x, 8, -4, 26, 12, '#6a7c94', 1.4);   // the blankets, frozen hanging
      R(x, -27, -9, 56, 3, C.snow); L(x, -28, 8, 28, 8, '#22222a', 2.4);
    } else if (kind === 'house') {             // broken-backed: two halves at an angle, a door hanging open on nothing
      x.save(); x.translate(cx - 18, fy - 28); x.rotate(-0.34); house(x, { w: 36, h: 32, rh: 20, wins: [-6], chimney: -10, side: 6 }); x.restore();
      x.translate(cx + 20, fy - 32); x.rotate(0.3); house(x, { w: 38, h: 34, rh: 22, wins: [], door: 2, chimney: 10, side: 9 });
    }
    x.restore();
  }
  function paintCrowns() {
    CROWNS.forEach((kind, i) => {
      addSprite('p17p_crown_' + kind, CW, CH, (x, w, h) => {
        const r = rng(1711 + i * 31), fy = FORK[kind], col = '#6c6a64';
        trunk(x, w, h, 50, 30, fy);
        const limbs = kind === 'bare' ? [[-2.2, 44], [-1.62, 52], [-1.05, 44], [-2.75, 30], [-0.4, 30]] : [[-2.5, 46], [-0.65, 46], [-2.95, 30], [-0.2, 30], [-1.58, 30]];
        for (const [a, l] of limbs) branch(x, r, 64, fy + 2, a + (r() - 0.5) * 0.1, l, 10, 3, col);
        if (kind !== 'bare') {
          paintHouse(x, kind, fy);
          for (const [bx, a, l] of [[50, -1.25, 22], [80, -1.9, 20], [64, -1.5, 14]]) branch(x, r, bx, fy - 2, a, l, 4, 1, col);   // limbs over what it carries: it is wedged, not set down
        }
      });
    });
  }
  function paintProps() {
    paintOak(); paintCrowns();
    // graves: a low mound under the snow, a flat stone at the head; done = a smaller stone on top
    for (const [name, small, done] of [['p17p_grave', false, true], ['p17p_grave_bare', false, false], ['p17p_cgrave', true, true], ['p17p_cgrave_bare', true, false]]) {
      addSprite(name, 64, 32, (x) => {
        const s = small ? 0.72 : 1;
        E(x, 32, 28, 29 * s, 4, 'rgba(0,0,0,0.3)');
        E(x, 33, 25, 27 * s, 7 * s, '#5a4632'); E(x, 33, 23, 25 * s, 5.5 * s, '#6e5840');               // turned earth
        E(x, 36, 21.5, 15 * s, 3 * s, '#e8edf4'); E(x, 30, 24, 9 * s, 2 * s, '#d8dfe9');                  // snow lying on it
        const hx = 32 - 19 * s;
        R(x, hx - 6 * s, 10, 12 * s, 17, '#55534f'); R(x, hx - 6 * s, 10, 4 * s, 17, '#7a7872'); R(x, hx - 6 * s, 9, 12 * s, 2, '#eef2f7');   // the head stone
        if (done) { R(x, hx - 4 * s, 5, 8 * s, 4, '#4a4844'); R(x, hx - 4 * s, 5, 8 * s, 1, '#8a8882'); }                                       // the stone on the stone
      });
    }
    addSprite('p17p_milestone', 32, 48, (x) => {
      E(x, 16, 45, 13, 3, 'rgba(0,0,0,0.3)');
      x.beginPath(); x.moveTo(6, 46); x.lineTo(6, 14); x.quadraticCurveTo(16, 4, 26, 14); x.lineTo(26, 46); x.closePath(); x.fillStyle = VG(x, 6, 46, '#9a978e', '#6a6862'); x.fill();
      for (let i = 0; i < 3; i++) L(x, 11, 22 + i * 6, 21, 22 + i * 6, 'rgba(40,38,34,0.55)', 1.2);
      x.beginPath(); x.moveTo(6, 15); x.quadraticCurveTo(16, 3, 26, 15); x.lineTo(26, 13); x.quadraticCurveTo(16, 6, 6, 13); x.fillStyle = '#eef2f7'; x.fill(); R(x, 3, 43, 26, 5, '#e2e7ef');
    });
    addSprite('p17p_limb', 128, 32, (x) => {
      const r = rng(1731);
      E(x, 64, 28, 58, 4, 'rgba(0,0,0,0.28)');
      L(x, 6, 24, 120, 20, '#5a5852', 9); L(x, 6, 20.5, 120, 16.5, 'rgba(236,240,248,0.8)', 2);
      for (let i = 0; i < 7; i++) branch(x, r, 20 + i * 14, 22, -1.2 - r() * 0.9, 9 + r() * 8, 2.4, 2, '#5e5c58');
      E(x, 120, 20, 4.5, 4.5, '#b8b0a0'); E(x, 120, 20, 2.6, 2.6, '#8a8070');   // the broken end, pale
    });
    addSprite('p17p_stones', 48, 16, (x) => {
      E(x, 24, 12, 22, 4, '#dfe5ee');
      for (const [sx, sy, rx] of [[14, 10, 6], [27, 11, 7], [37, 9, 5]]) { E(x, sx, sy, rx, 2.6, '#6e6c68'); E(x, sx - 1, sy - 0.8, rx * 0.6, 1, '#9c9a94'); }
      E(x, 30, 8.6, 5, 1.1, '#eef2f7');
    });
  }
  // the people on the road: the game's own painted sprites, recoloured and over-painted (procedural stand-ins)
  function spriteCanvas(name) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]; if (!sp) return null;
    const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sp.data.buffer.slice(0)), sp.w, sp.h), 0, 0);
    return { c, sp };
  }
  function recolor(x, w, h, fn) {
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; const o = fn(d[i], d[i + 1], d[i + 2], (i >> 2) % w, ((i >> 2) / w) | 0); d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; if (o.length > 3) d[i + 3] = o[3]; }
    x.putImageData(id, 0, 0);
  }
  const PEOPLE_ART = {
    // Seraphina: the knight in white, with the Sun-Blade [PROPOSED look]: the Legion's plate turned to white, gold kept
    p17p_seraphina: { src: 'legionnaire', w: 70, h: 160, draw(x, s) {
      x.drawImage(s.c, 2, 0);
      recolor(x, 70, 160, (r, g, b, px) => {
        if (px < 13) return [0, 0, 0, 0];                                         // no polearm: she carries a sword
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        if (r > g * 1.18 && r > 110) return [Math.min(255, r * 1.1), Math.min(255, g * 1.05), b * 0.8];    // the gold stays gold
        return [70 + lum * 0.78, 70 + lum * 0.76, 74 + lum * 0.74];
      });
      L(x, 58, 64, 66, 22, '#f2e2a0', 3); L(x, 58, 64, 66, 22, '#fff8d8', 1); L(x, 54, 66, 62, 64, '#b89a52', 3);   // the Sun-Blade, held up
    } },
    // Ignatius Crane: no fire in the censer now; a woman's apron over the white
    p17p_ignatius: { src: 'flambeau', w: 71, h: 160, draw(x, s) {
      x.drawImage(s.c, 0, 0);
      recolor(x, 71, 160, (r, g, b) => (r > 190 && g > 110 && b < 150 && r > b + 60) ? [150, 146, 140] : [r * 0.86, g * 0.86, b * 0.9]);
      P(x, [[24, 72], [48, 72], [52, 128], [20, 128]], '#8a6e52', '#4a3a2a', 1); L(x, 24, 72, 48, 72, '#5a4636', 2);
      for (let i = 0; i < 4; i++) L(x, 24 + i * 7, 80, 22 + i * 8, 126, 'rgba(60,44,30,0.35)', 1);
    } },
    // Solenne: tall, with broken black-gold wings
    p17p_solenne: { src: 'townswoman', w: 120, h: 172, draw(x, s) {
      const wing = (sx, dir, broken) => {
        x.save(); x.translate(sx, 48); x.scale(dir, 1);
        P(x, [[0, 0], [20, -34], [52, -46], [44, -20], [56, -8], [40, 4], [50, 22], [30, 18], [34, 40], [12, 30]].map(([a, b]) => broken ? [a * 0.9, b * 0.7 + a * 0.55] : [a, b]), '#151317', '#a8843a', 1.5);
        for (let i = 0; i < 4; i++) L(x, 6, 4, 40 - i * 6, (broken ? 10 : -30) + i * 12, 'rgba(176,138,58,0.7)', 1);
        x.restore();
      };
      wing(54, -1, false); wing(66, 1, true);
      x.drawImage(s.c, 32, 12);
      recolor(x, 120, 172, (r, g, b, px) => (px >= 32 && px < 88) ? [r * 0.58, g * 0.56, b * 0.66] : [r, g, b]);
      R(x, 55, 34, 10, 3, '#b8743a');                                              // copper at the throat
    } },
    // Dorran Sedge: a big slow man with a white beard and a lantern [PROPOSED look]
    p17p_dorran: { src: 'townsman', w: 76, h: 160, draw(x, s) {
      x.drawImage(s.c, 0, 0);
      recolor(x, 76, 160, (r, g, b) => [r * 0.66, g * 0.68, b * 0.78]);
      E(x, 30, 32, 8, 9, '#dcd8d0'); E(x, 30, 37, 6, 7, '#ece8e0'); R(x, 25, 27, 10, 2, '#5a4a3c');          // the white beard
      L(x, 58, 82, 66, 92, '#2a2218', 2);
      R(x, 61, 92, 12, 16, '#2a2218'); R(x, 62, 94, 10, 12, '#ffd27a'); E(x, 67, 100, 3, 4, '#fff6d0'); R(x, 60, 90, 14, 3, '#2a2218'); R(x, 60, 107, 14, 3, '#2a2218');
    } },
  };
  function ensurePeople() {
    if (typeof Engine === 'undefined' || !Engine.sprites) return false;
    let all = true;
    for (const name of Object.keys(PEOPLE_ART)) {
      if (Engine.sprites[name]) continue;
      const a = PEOPLE_ART[name], s = spriteCanvas(a.src);
      if (!s) { all = false; continue; }
      addSprite(name, a.w, a.h, (x) => a.draw(x, s));
      if (name === 'p17p_dorran') { const sp = Engine.sprites[name]; if (sp && Engine.setEmissive) { const m = new Uint8Array(sp.w * sp.h); for (let y = 92; y < 108; y++) for (let x = 62; x < 72; x++) m[y * sp.w + x] = 1; Engine.setEmissive(name, m); } }   // the lantern, not the man
    }
    return all;
  }

  // ---------------------------------------------------------------- Lyra's own hands (POLISH17)
  // She has no voice, so she never shows the game's spell-casting hands (fp_hands, with the Song-light in the palms). In
  // this extra the first-person art is hers: her good right hand holding the lantern up by its bail, and the slate on its
  // cord with her burned left hand, bound in clean linen, on its edge. Painted once (640x380: the engine draws the
  // bare-hands art centred at half scale, so this covers the whole view), in two states: the lantern dark (the road by day) and lit (dusk on, the wood).
  // It is swapped in only for the length of drawHUD while this extra is on screen (wrap below), so every other module
  // that draws the bare-hands weapon draws hers instead, and nothing outside the extra ever sees it.
  const FPH = { dark: null, lit: null };
  function paintFpHands(lit) {
    // a full-view overlay: 640x380 is drawn at half scale over the whole 320-wide view, its top above the frame, so the
    // sleeves come in from the edges and the slate's cord runs up out of sight instead of stopping in the air
    const c = document.createElement('canvas'); c.width = 640; c.height = 380;
    const x = c.getContext('2d');
    x.translate(320, 374); x.scale(0.8, 0.8); x.translate(-320, -380);                                          // low in the view, out of the way
    const sk = lit ? ['#c88a58', '#9a6238', '#6a3c22', '#e2a874'] : ['#a87650', '#7e5234', '#523020', '#c2906a'];   // skin: mid, shade, line, light
    const wool = lit ? ['#4a3a30', '#2e241e', '#5e4a3a'] : ['#3a3230', '#221e1c', '#4a3e38'];                       // her coat: mid, dark, lit edge
    // a sleeve: a tapered quad from the screen edge to the wrist, darker underneath, with two folds
    const sleeve = (pts, under, fold) => {
      P(x, pts, wool[0]); P(x, under, wool[1]);
      for (const f of fold) L(x, f[0], f[1], f[2], f[3], wool[2], 2.2);
    };
    // ---- the slate (left of centre), its cord running down toward her neck below the frame
    L(x, 232, 236, 262, 380, '#3a2c1e', 2.6); L(x, 318, 232, 300, 380, '#3a2c1e', 2.6);
    x.save(); x.translate(270, 302); x.rotate(-0.1);
    R(x, -54, -58, 108, 124, lit ? '#8a6a44' : '#6e5638');                                                      // the frame
    R(x, -54, -58, 108, 5, lit ? '#b08a5a' : '#8a6c48'); R(x, -54, -58, 5, 124, lit ? '#a48052' : '#7e6442');
    R(x, -45, -49, 90, 106, lit ? '#3e4850' : '#323a42');                                                       // the slate
    x.fillStyle = 'rgba(220,226,230,0.15)'; for (let i = 0; i < 5; i++) x.fillRect(-38 + i * 15, -38 + (i % 3) * 24, 20, 8);   // old chalk, rubbed out
    L(x, -36, 8, 34, 4, 'rgba(230,236,240,0.30)', 2.4); L(x, -34, 22, 14, 19, 'rgba(230,236,240,0.24)', 2.4);     // the ghost of a word
    R(x, -45, -49, 90, 3, 'rgba(255,255,255,0.10)');
    R(x, -6, -56, 12, 5, '#2a2018');                                                                             // where the cord goes through
    x.restore();
    // ---- her burned left hand, bound in clean linen, on the slate's top edge; the forearm from the bottom left
    sleeve([[84, 380], [206, 250], [252, 264], [214, 380]], [[160, 380], [236, 262], [252, 264], [214, 380]], [[136, 350, 196, 288], [170, 360, 226, 296]]);
    P(x, [[208, 246], [232, 236], [256, 262], [236, 272]], wool[1]);                                             // the cuff
    const lin = lit ? ['#ece2c8', '#c8b894', '#9a8a6a'] : ['#cfc6b0', '#a89c82', '#7a7060'];
    x.beginPath(); x.moveTo(236, 238); x.quadraticCurveTo(250, 220, 274, 224); x.quadraticCurveTo(296, 228, 300, 244); x.quadraticCurveTo(290, 260, 264, 264); x.quadraticCurveTo(244, 262, 236, 238); x.fillStyle = lin[0]; x.fill();
    x.strokeStyle = lin[2]; x.lineWidth = 2; x.stroke();
    for (let i = 0; i < 5; i++) L(x, 245 + i * 10, 228 + i * 1.5, 250 + i * 9, 260 - i, lin[1], 1.6);           // the wrapping
    for (let i = 0; i < 4; i++) { E(x, 278 + i * 6.5, 248 + i * 1.6, 3.4, 4.6, sk[0]); E(x, 278 + i * 6.5, 250 + i * 1.6, 2.2, 2.4, sk[1]); }   // fingertips over the edge
    // ---- the lantern, held out in her good right hand (right of centre); the forearm from the bottom right
    const lx = 382;
    sleeve([[486, 380], [410, 222], [446, 196], [640, 292], [640, 380]], [[486, 380], [410, 222], [424, 214], [540, 380]], [[540, 330, 470, 250], [590, 330, 500, 246]]);
    P(x, [[404, 204], [440, 186], [458, 212], [418, 232]], wool[1]);                                             // the cuff
    P(x, [[404, 184], [424, 182], [436, 202], [410, 214]], sk[1]);                                               // the wrist
    // the bail: an iron hoop from the fist down to the cap
    x.beginPath(); x.moveTo(lx - 24, 252); x.quadraticCurveTo(lx - 24, 216, lx, 212); x.quadraticCurveTo(lx + 24, 216, lx + 24, 252); x.strokeStyle = '#1e1a16'; x.lineWidth = 3.2; x.stroke();
    x.strokeStyle = lit ? '#8a6a3a' : '#5a5048'; x.lineWidth = 1.1; x.stroke();
    // the fist round the top of the bail, seen from behind: the back of the hand with its knuckle ridge, four fingers
    // folded down round the hoop, the thumb across them
    x.beginPath(); x.moveTo(360, 196); x.quadraticCurveTo(364, 178, 386, 176); x.quadraticCurveTo(408, 176, 414, 190); x.lineTo(416, 210); x.lineTo(360, 212); x.closePath();
    x.fillStyle = sk[0]; x.fill(); x.strokeStyle = sk[2]; x.lineWidth = 1.8; x.stroke();
    L(x, 370, 186, 404, 184, sk[3], 2.6); L(x, 376, 196, 408, 198, sk[1], 1.4);                                  // the knuckle ridge, catching the light
    for (let i = 0; i < 4; i++) {                                                                                // the folded fingers
      const fx = 363 + i * 13, fy = 206;
      x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + 12, fy); x.quadraticCurveTo(fx + 13, fy + 18, fx + 6, fy + 22); x.quadraticCurveTo(fx - 1, fy + 18, fx, fy); x.closePath();
      x.fillStyle = i % 2 ? sk[0] : sk[3]; x.fill(); x.strokeStyle = sk[2]; x.lineWidth = 1.4; x.stroke();
      L(x, fx + 2, fy + 9, fx + 10, fy + 9, sk[1], 1.2);
    }
    x.beginPath(); x.moveTo(352, 200); x.quadraticCurveTo(346, 220, 360, 228); x.quadraticCurveTo(378, 230, 384, 220); x.quadraticCurveTo(372, 210, 352, 200); x.fillStyle = sk[1]; x.fill(); x.strokeStyle = sk[2]; x.lineWidth = 1.5; x.stroke();   // the thumb
    E(x, 378, 220, 4, 3, sk[3]);
    // the lantern: a pierced iron cap, four bars and the glass, a flame or a dead wick, the base
    R(x, lx - 3, 248, 6, 6, '#1e1a16');
    P(x, [[lx - 13, 254], [lx + 13, 254], [lx + 24, 265], [lx - 24, 265]], '#2a2622', '#141210', 1.4);
    for (let i = 0; i < 3; i++) R(x, lx - 9 + i * 7.5, 257.5, 3, 3, lit ? '#ffcf70' : '#0e0c0a');
    R(x, lx - 26, 265, 52, 5, '#34302a'); R(x, lx - 26, 265, 52, 1.6, lit ? '#8a7454' : '#5a544c');
    const gl = x.createLinearGradient(lx - 22, 0, lx + 22, 0);
    if (lit) { gl.addColorStop(0, '#d8902e'); gl.addColorStop(0.5, '#ffe2a0'); gl.addColorStop(1, '#c87a24'); }
    else { gl.addColorStop(0, '#2c3434'); gl.addColorStop(0.5, '#46504e'); gl.addColorStop(1, '#262c2c'); }
    R(x, lx - 22, 270, 44, 44, gl);
    if (lit) { x.beginPath(); x.moveTo(lx, 276); x.quadraticCurveTo(lx + 8, 294, lx, 302); x.quadraticCurveTo(lx - 8, 294, lx, 276); x.fillStyle = '#fff6d8'; x.fill(); E(x, lx, 297, 2.6, 4, '#ffb040'); }
    else { R(x, lx - 1, 294, 2, 7, '#141210'); L(x, lx - 15, 274, lx - 11, 308, 'rgba(220,235,240,0.28)', 2); }
    for (const bx of [-22, -8, 6, 20]) R(x, lx + bx, 270, 2.8, 44, '#1e1a16');
    R(x, lx - 26, 313, 52, 7, '#2a2622'); R(x, lx - 22, 320, 44, 5, '#1e1a16');
    return c;
  }
  function fpHands(lit) {
    const k = lit ? 'lit' : 'dark';
    if (!FPH[k]) { try { FPH[k] = paintFpHands(lit); } catch (e) { FPH[k] = null; } }
    return FPH[k];
  }

  // ---------------------------------------------------------------- catalogue: items and people (global, never saved)
  const ITEM_DEFS = {
    p17p_slate: { name: TX.item.slate, sprite: 'loot', key: true, desc: TX.item.slateDesc },
    p17p_stone: { name: TX.item.stone, sprite: 'loot', desc: TX.item.stoneDesc },
  };
  const npcDef = (name, sprite, label, scale) => ({ name, sprite, portrait: sprite === 'aegis' ? 'aegis' : 'townsman', tier: 'low', scale: scale || 1, greet: { polite: label, normal: label, blunt: label }, topics: {} });
  const NPC_DEFS = {
    p17p_seraphina: npcDef(TX.comp.nSeraphina, 'p17p_seraphina', TX.comp.seraphina),
    p17p_aegis: npcDef(TX.comp.nAegis, 'aegis', TX.comp.aegis, 1.3),
    p17p_ignatius: npcDef(TX.comp.nIgnatius, 'p17p_ignatius', TX.comp.ignatius),
    p17p_solenne: npcDef(TX.comp.nSolenne, 'p17p_solenne', TX.comp.solenne, 1.12),
    p17p_dorran: npcDef(TX.dorran.name, 'p17p_dorran', TX.dorran.label, 1.05),
  };
  const COMPANIONS = ['p17p_seraphina', 'p17p_aegis', 'p17p_ignatius', 'p17p_solenne'];   // trail order: Seraphina nearest you
  function installCatalog() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = Object.assign({}, ITEM_DEFS[k]);
    if (typeof NPCS !== 'undefined') for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k];
  }

  // ---------------------------------------------------------------- the maps
  // The road: walls everywhere, then the road, the verges and the clearing under the Hedge carved out.
  const MILES = [[30.3, 86.5, 'm2'], [30.3, 68.5, 'm3'], [30.3, 50.5, 'm4'], [30.3, 32.6, 'm5']];
  const BARE = [[23.35, 31.4, true], [29.7, 30.2], [23.3, 28.9], [29.65, 27.6], [23.4, 26.1], [29.7, 24.9], [23.3, 23.6], [29.6, 22.3], [23.4, 21.0], [29.7, 20.0]];   // index 0 is the child's, at the fifth milestone
  const STONES = [[22.7, 32.6], [30.4, 28.5], [22.6, 25.0], [30.4, 21.6], [22.7, 19.6], [30.4, 34.6]];
  const ROAD_COMP = [[25.6, 95.8], [27.4, 96.2], [25.4, 97.0], [27.6, 97.1]];
  function carve(m, x0, y0, x1, y1, f) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { m.set(x, y, null); m.setFloor(x, y, f); } }
  function buildRoad() {
    const W = 56, H = 100;
    const m = new GameMap('p17p_road', TX.road.name, W, H, { outdoor: true, floor: 'p17p_snow', floorTextures: ['p17p_snowroad', 'p17p_snow', 't_water'], fogDist: 16, fogColor: [104, 108, 120], ambient: 0.24, music: 'wild', danger: 0, spawn: { x: 26.5, y: 94.5, dir: -Math.PI / 2 } });
    m.rect(0, 0, W - 1, H - 1, 'p17p_woods');
    m.rect(1, 1, W - 2, 12, 'p17p_hedge');
    carve(m, 22, 18, 30, 97, 1); carve(m, 24, 18, 28, 97, 0);
    carve(m, 17, 93, 23, 96, 0);                                  // the road bends away west behind you, out of sight
    carve(m, 22, 13, 47, 17, 1); carve(m, 24, 13, 28, 17, 0); carve(m, 29, 15, 46, 16, 0);
    for (let y = 13; y <= 17; y++) for (let x = 48; x <= 51; x++) { m.set(x, y, null); m.setFloor(x, y, 2); }   // the river, going in under the Hedge
    for (let x = 1; x < W - 1; x++) for (const y of [11, 12]) m.block(x, y, 'p17p_hedge', 2.1);   // "twenty feet high"
    m.block(25, 12, 'p17p_post', 2.1); m.block(27, 12, 'p17p_post', 2.1);
    m.set(26, 12, DOOR({ tex: 'p17p_gate', locked: '__never', lockMsg: TX.road.gate, label: TX.road.gate }));
    m.set(46, 12, DOOR({ tex: 'p17p_rivergate', portal: { map: 'p17p_wood', x: 40.5, y: 61.2, dir: -Math.PI / 2 }, label: TX.road.riverGate }));
    // the oaks along both verges, bare, and they do not ring
    const r = rng(1741);
    for (let y = 20.5; y < 96; y += 3.1) {
      m.deco('p17p_oak', 22.3 + r() * 0.15, y + r() * 0.8, { scale: 3.2 + r() * 0.8, radius: 0.28, label: TX.road.oak, p17pWood: true });
      m.deco('p17p_oak', 30.7 - r() * 0.15, y + 1.4 + r() * 0.8, { scale: 3.2 + r() * 0.8, radius: 0.28, label: TX.road.oak, p17pWood: true });
    }
    for (let x = 33.5; x < 47; x += 3.4) m.deco('p17p_oak', x + r() * 0.6, 17.6, { scale: 3.4 + r() * 0.6, radius: 0.28, label: TX.road.oak, p17pWood: true });
    for (const [x, y, k] of MILES) m.deco('p17p_milestone', x, y, { scale: 0.55, radius: 0.18, label: TX.road[k] });
    // graves: done all along; bare ones only from the fifth milestone on (Book Four: "She saw the first at the fifth milestone")
    const g = rng(1747);
    for (let y = 90.5, side = 0; y > 33.5; y -= 1.55 + g() * 0.9, side ^= 1) {
      if (MILES.some(([, my]) => Math.abs(my - y) < 1.1)) continue;
      m.deco('p17p_grave', side ? 29.7 : 23.3, y, { scale: 0.6, radius: 0.25, solid: false, label: TX.road.graveDone });
    }
    for (let y = 33.3, side = 1; y > 19; y -= 2.6, side ^= 1) if (!BARE.some(([, by]) => Math.abs(by - y) < 0.8)) m.deco('p17p_grave', side ? 29.7 : 23.3, y, { scale: 0.6, radius: 0.25, solid: false, label: TX.road.graveDone });
    BARE.forEach(([x, y, child], i) => m.deco(child ? 'p17p_cgrave_bare' : 'p17p_grave_bare', x, y, { scale: child ? 0.5 : 0.6, radius: 0.25, solid: false, use: 'p17p_grave', p17pGrave: i, p17pChild: !!child, label: TX.road.graveBare }));
    for (const [x, y] of STONES) m.deco('p17p_stones', x, y, { scale: 0.22, radius: 0.15, solid: false, use: 'p17p_stone', label: TX.road.stones });
    m.deco('p17p_limb', 26.5, 81.2, { scale: 0.42, radius: 0.2, solid: false, requires: FP + 'limb', label: TX.road.limb, p17pWood: true });
    COMPANIONS.forEach((id, i) => m.npc(id, ROAD_COMP[i][0], ROAD_COMP[i][1], { solid: false, radius: 0.2, p17pComp: true }));
    m.baseCount = m.entities.length;
    return m;
  }
  // Oakhaven inside the river gate: the river street from the gate (south-east) to the dark at its top (north-west)
  const STREET = [[40.5, 61.5], [39.5, 50], [37.5, 40], [33, 32], [25, 22], [17, 12], [12.5, 5.5]];
  const GIANTS = [[34, 46, 'cottage'], [31, 37, 'shop'], [33, 23, 'cart'], [24, 13, 'bed'], [40, 34, 'house'], [21, 27, 'house'], [26, 48, 'house'], [29, 7, 'house'], [33, 55, 'bare'], [10, 16, 'bare'], [6, 9, 'bare'], [38, 13, 'bare'], [19, 38, 'bare'], [13, 27, 'bare']];
  const DORRAN_AT = [36.2, 57.0];
  const DORRAN_WAY = [[39, 50], [37.4, 40], [33, 31.6], [25, 21.8], [17, 11.8], [12.5, 5.6]];
  const WOOD_COMP = [[39.5, 62.4], [41.5, 62.3], [38.6, 62.0], [42.2, 61.9]];
  function streetDist(x, y) {
    let best = 1e9;
    for (let i = 0; i < STREET.length - 1; i++) {
      const [ax, ay] = STREET[i], [bx, by] = STREET[i + 1], dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      best = Math.min(best, Math.hypot(ax + dx * t - x, ay + dy * t - y));
    }
    return best;
  }
  function buildWood() {
    const W = 48, H = 64;
    const m = new GameMap('p17p_wood', TX.wood.name, W, H, { outdoor: true, floor: 'p17p_leaves', floorTextures: ['p17p_leaves', 'p17p_leaves2', 't_water'], fogDist: 19, fogColor: [74, 82, 106], ambient: 0.56, music: 'coda', danger: 0, spawn: { x: 40.5, y: 61.2, dir: -Math.PI / 2 } });
    m.border('p17p_hedge');
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) m.block(x, y, 'p17p_hedge', 2.1);
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) m.block(x, y, 'p17p_hedge', 2.1);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) m.setFloor(x, y, streetDist(x + 0.5, y + 0.5) < 2.2 ? 1 : 0);
    for (let y = 1; y < H - 1; y++) for (let x = 43; x <= 46; x++) m.setFloor(x, y, 2);
    m.set(40, H - 1, DOOR({ tex: 'p17p_rivergate', portal: { map: 'p17p_road', x: 46.5, y: 13.7, dir: Math.PI / 2 }, label: TX.wood.back }));
    const LAB = { cottage: TX.wood.cottage, shop: TX.wood.shop, cart: TX.wood.cart, bed: TX.wood.bed, house: TX.wood.house, bare: TX.wood.bare };
    for (const [x, y, k] of GIANTS) {
      // glow: the snow-light; they read against the sky. The crowns that carry something also carry a faint cold light
      // (POLISH17): at night outdoors everything is darkened together, and only a light lifts the houses out of it
      m.deco('p17p_crown_' + k, x + 1, y + 1, { scale: 8.2, radius: 0.85, solid: true, glow: 0.8, label: LAB[k], p17pWood: true, lightCol: k === 'bare' ? undefined : [21, 24, 33] });
    }
    const r = rng(1753);
    for (let i = 0, n = 0; i < 400 && n < 30; i++) {
      const x = 2 + r() * 40, y = 2 + r() * 60;
      if (streetDist(x, y) < 3.0 || m.get(x | 0, y | 0) || GIANTS.some(([gx, gy]) => Math.hypot(gx + 1 - x, gy + 1 - y) < 3.2)) continue;
      if (m.entities.some((e) => e.sprite === 'p17p_oak' && Math.hypot(e.x - x, e.y - y) < 2.4)) continue;
      m.deco('p17p_oak', x, y, { scale: 4.4 + r() * 1.6, radius: 0.32, glow: 0.42, label: TX.wood.bare, p17pWood: true }); n++;
    }
    m.npc('p17p_dorran', DORRAN_AT[0], DORRAN_AT[1], { solid: false, radius: 0.2, requires: FP + 'dorran', lightCol: [88, 52, 14] });
    COMPANIONS.forEach((id, i) => m.npc(id, WOOD_COMP[i][0], WOOD_COMP[i][1], { solid: false, radius: 0.2, p17pComp: true, lightCol: id === 'p17p_aegis' ? [40, 14, 22] : undefined }));
    m.baseCount = m.entities.length;
    return m;
  }

  // ---------------------------------------------------------------- state derived from flags (idempotent)
  function applyMapState(id) {
    const m = mapOf(id); if (!m) return;
    if (id === 'p17p_road') {
      const g = fint('graves');
      for (const e of m.entities) {
        if (e.p17pGrave == null) continue;
        const done = (g >> e.p17pGrave) & 1;
        e.sprite = e.p17pChild ? (done ? 'p17p_cgrave' : 'p17p_cgrave_bare') : (done ? 'p17p_grave' : 'p17p_grave_bare');
        e.label = done ? TX.road.graveDone : TX.road.graveBare;
        if (done) delete e.use; else e.use = 'p17p_grave';
      }
      const limb = m.entities.find((e) => e.sprite === 'p17p_limb'); if (limb) limb.hidden = fint('limb') === 0;
    }
    if (id === 'p17p_wood') {
      const d = m.entities.find((e) => e.id === 'p17p_dorran'); if (d) d.hidden = fint('dorran') === 0;
    }
    for (const e of m.entities) if (e.kind === 'npc' && e.id && e.id.indexOf(FP) === 0) { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 1e9; e.dir = e.dir || 0; }   // no hydrate dice: they never wander
  }

  // ---------------------------------------------------------------- the stones on the graves
  function markGrave(i) { setf('graves', fint('graves') | (1 << i)); applyMapState('p17p_road'); }
  function setStone(e) {
    if (!G.has('p17p_stone')) { say(TX.road.needStone, 'warn', 5000, 'need', 3); return; }
    G.take('p17p_stone'); markGrave(e.p17pGrave); setf('stones', fint('stones') + 1);
    try { Audio_.sfx.pickup(); } catch (er) { /* silent */ }
    say(TX.road.setOne, 'good', 5500);
    if (fint('help') === 0) { setf('help', 1); RUN.helpT = B.HELP_EVERY; setTimeout(() => { if (here()) { helpOne(true); say(TX.road.aegis, '', 7500); } }, 2200); }
    if (fint('stones') === 1) journal('side', TX.jour.graves);
  }
  function useGrave(e) {
    if (!(e.p17pGrave >= 0) || (fint('graves') >> e.p17pGrave) & 1) { say(e.label || TX.road.graveDone, '', 5000); return; }
    if (e.p17pChild) {
      const kneel = () => showEvent(esc(TX.road.childTitle), body([TX.road.kneelText]), choicesFor(e));
      showEvent(esc(TX.road.childTitle), body([TX.road.child]), [{ t: esc(TX.road.kneel), f: kneel }].concat(choicesFor(e)));
      return;
    }
    setStone(e);
  }
  const choicesFor = (e) => [{ t: esc(TX.road.setBtn), f: () => setStone(e) }, { t: esc(TX.road.goBtn), f: () => {} }];
  // a companion sets a stone on the nearest bare grave near them
  function helpOne(aegisOnly) {
    const m = mapOf('p17p_road'); if (!m || G.mapId !== 'p17p_road') return false;
    const who = m.entities.filter((e) => e.p17pComp && (!aegisOnly || e.id === 'p17p_aegis'));
    let best = null, bd = 1e9;
    for (const e of m.entities) {
      if (e.p17pGrave == null || (fint('graves') >> e.p17pGrave) & 1 || e.p17pGrave === 0) continue;   // the child's grave is Lyra's
      for (const c of who) { const d = Math.hypot(c.x - e.x, c.y - e.y); if (d < B.HELP_R && d < bd) { bd = d; best = e; } }
    }
    if (!best) return false;
    markGrave(best.p17pGrave); return true;
  }

  // ---------------------------------------------------------------- the voice at the North Gate
  function voiceEvent() {
    if (fint('voice') === 1) return;
    try { if (scares() === 'full') Audio_.sfx.voice(); } catch (e) { /* no audio yet */ }
    say(TX.voice.heard, 'voice', 6000, 'heard');
    voiceOf('p17p_seraphina');
    const who = () => showEvent(esc(TX.voice.whoTitle), body([TX.voice.w1, TX.voice.w2]), [{ t: esc(TX.voice.write), f: nobody }]);
    const listen = () => showEvent(esc(TX.voice.title), body([TX.voice.l1, TX.voice.l2, { i: TX.voice.q2 }]), [{ t: esc(TX.voice.still), f: who }]);
    showEvent(esc(TX.voice.title), body([TX.voice.p1, TX.voice.p2, { i: TX.voice.q1 }]), [{ t: esc(TX.voice.listen), f: listen }, { t: esc(TX.voice.still), f: who }]);
  }
  function nobody() {
    showEvent(esc(TX.voice.nbTitle), body([TX.voice.nb1, { b: TX.voice.nb2 }, TX.voice.nb3, { i: TX.voice.nb4 }, TX.voice.nb5]), [{ t: esc(TX.voice.go), f: () => {
      if (fint('voice') === 1) return;
      setf('voice', 1); setf('stage', 3); journal('main', TX.jour.voice); say(TX.road.round, 'warn', 6000);
    } }]);
  }

  // ---------------------------------------------------------------- Dorran Sedge
  function dorranMeet() {
    setf('dorran', 2); voiceOf('p17p_dorran');
    const no = () => showEvent(esc(TX.dorran.noTitle), body([TX.dorran.n1, { b: TX.dorran.n2 }, TX.dorran.n3, TX.dorran.n4, TX.dorran.n5]), [{ t: esc(TX.dorran.follow), f: () => {
      if (fint('dorran') >= 3) return;
      setf('dorran', 3); setf('stage', 5); journal('main', TX.jour.dorran); say(TX.dorran.lead, 'warn', 7000);
    } }]);
    const ring = () => showEvent(esc(TX.dorran.name), body([TX.dorran.e1, TX.dorran.e2, TX.dorran.e3, TX.dorran.e4, TX.dorran.e5]), [
      { t: esc(TX.dorran.answer), f: () => showEvent(esc(TX.dorran.name), body([TX.dorran.a1]), [{ t: esc(TX.dorran.writeBtn), f: no }]) },
      { t: esc(TX.dorran.writeBtn), f: no },
    ]);
    showEvent(esc(TX.dorran.name), body([TX.dorran.d1, TX.dorran.d2, TX.dorran.d3]), [{ t: esc(TX.dorran.hand), f: ring }]);
  }
  function theEnd() {
    if (RUN.endShown) return;
    RUN.endShown = true; setf('stage', 6);
    const n = fint('stones');
    showEvent(esc(TX.end.title), body([TX.end.p1, TX.end.p2, TX.end.stones.replace('{0}', String(n))]), [{ t: esc(TX.end.btn), f: () => finish() }]);
  }

  // ---------------------------------------------------------------- per-frame: the trail, the clock, the beats
  function npcOf(id) { return G.ents.find((e) => e.kind === 'npc' && e.id === id); }
  function seedTrail() { RUN.crumbs = []; const c = Engine.cam; RUN.crumbs.push([c.x, c.y]); }
  function follow(dt) {
    const c = Engine.cam, cr = RUN.crumbs, last = cr[cr.length - 1];
    if (!last || Math.hypot(c.x - last[0], c.y - last[1]) > B.CRUMB) { cr.push([c.x, c.y]); if (cr.length > 80) cr.shift(); }
    COMPANIONS.forEach((id, i) => {
      const e = npcOf(id); if (!e || e.hidden) return;
      const k = cr.length - 1 - (i + 1) * B.GAP; if (k < 0) return;          // not enough trail yet: stand where you are
      const [tx, ty] = cr[k], dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
      if (d > B.SNAP) { e.x = tx; e.y = ty; }
      else if (d > 0.05) { const s = Math.min(d, B.FOLLOW * dt); e.x += dx / d * s; e.y += dy / d * s; e.moving = true; } else e.moving = false;
      e.dir = Math.atan2(c.y - e.y, c.x - e.x); e.facing = e.dir; e.homeX = e.x; e.homeY = e.y;
    });
  }
  function lamp() {
    const on = G.mapId === 'p17p_wood' || G.tod >= B.LAMP_FROM;
    if (!RUN.lamp || G.ents.indexOf(RUN.lamp) < 0) {
      for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i] && G.ents[i].p17pLamp) G.ents.splice(i, 1);   // one lantern, never a stale one left lit
      RUN.lamp ={ kind: 'deco', x: 0, y: 0, solid: false, radius: 0, nopick: true, transient: true, lightCol: [62, 44, 20], p17pLamp: true }; G.ents.push(RUN.lamp); }
    RUN.lamp.lightCol = G.mapId === 'p17p_wood' ? [62, 44, 20] : [34, 26, 12];
    const c = Engine.cam; RUN.lamp.x = c.x + Math.cos(c.dir) * 0.3; RUN.lamp.y = c.y + Math.sin(c.dir) * 0.3; RUN.lamp.hidden = !on;
  }
  function tickRoad(dt) {
    const c = Engine.cam;
    G.tod = B.TOD_ROAD[0] + (B.TOD_ROAD[1] - B.TOD_ROAD[0]) * clamp((B.ROAD_Y[0] - c.y) / (B.ROAD_Y[0] - B.ROAD_Y[1]), 0, 1);
    if (G.state !== 'play') return;
    if (fint('limb') === 0 && c.y < B.LIMB_Y) {
      setf('limb', 1); applyMapState('p17p_road');
      try { Audio_.sfx.hit(); } catch (e) { /* silent */ }
      say(TX.road.limbFall, '', 7000); const onRoad = () => here() && G.mapId === 'p17p_road'; setTimeout(() => { if (onRoad()) say(TX.road.noBell, 'warn', 9000); }, 2600);
      setTimeout(() => { if (onRoad()) { voiceOf('p17p_seraphina'); say(TX.road.isThat, 'voice', 6500); } }, 6800);
      setTimeout(() => { if (onRoad()) say(TX.road.isGood, 'voice', 9000); }, 10500);
    }
    if (c.y < 88 && !RUN.said.graves) say(TX.road.graves, '', 6500, 'graves');
    if (fint('count') === 0 && c.y < B.COUNT_Y) { setf('count', 1); say(TX.road.count, '', 6500); }
    if (fint('help') >= 1) {
      RUN.helpT -= dt;
      if (RUN.helpT <= 0) {
        RUN.helpT = B.HELP_EVERY;
        if (helpOne(false)) { if (fint('help') === 1) { setf('help', 2); say(TX.road.others, '', 8000); } else say(TX.road.helped, '', 3500, 'helped', 12); }
      }
    }
    if (fint('rise') === 0 && c.y < B.RISE_Y) { setf('rise', 1); setf('stage', 2); say(TX.road.rise, '', 10000); }
    const Z = B.GATE_ZONE;
    if (fint('gate') === 0 && c.y < Z.y1 && c.x > Z.x0 && c.x < Z.x1) { setf('gate', 1); RUN.gateT = 0; say(TX.road.ada, '', 11000); setTimeout(() => { if (here() && G.mapId === 'p17p_road') say(TX.road.good, '', 6000); }, 5200); }
    if (fint('gate') === 1 && fint('voice') === 0) {
      RUN.gateT += dt;
      const fx = Math.cos(c.dir), fy = Math.sin(c.dir), gx = B.GATE.x - c.x, gy = B.GATE.y - c.y, gd = Math.hypot(gx, gy) || 1;
      if ((fx * gx + fy * gy) / gd < -0.2 && RUN.gateT > 5) RUN.awayT += dt; else RUN.awayT = 0;
      if (c.x > B.VOICE_X || RUN.awayT > B.VOICE_AWAY) { RUN.awayT = 0; voiceEvent(); }
    }
  }
  function tickWood(dt) {
    G.tod = B.TOD_WOOD;
    if (G.state !== 'play') return;
    const c = Engine.cam;
    RUN.woodT += dt;
    const W_ = B.WOOD_LINES, w = fint('wood');
    if (w < 1 && RUN.woodT > W_[0]) { setf('wood', 1); say(TX.wood.in1, '', 7000); }
    if (w === 1 && RUN.woodT > W_[1]) { setf('wood', 2); say(TX.wood.in2, '', 9000); }
    if (w === 2 && RUN.woodT > W_[2]) { setf('wood', 3); say(TX.wood.in3, '', 9000); journal('main', TX.jour.wood); }
    if (w === 3 && RUN.woodT > W_[3]) { setf('wood', 4); voiceOf('p17p_seraphina'); say(TX.wood.when, 'voice', 7000); }
    if (w === 4 && RUN.woodT > W_[4]) { setf('wood', 5); say(TX.wood.dunno, '', 4000); }
    if (w === 5 && RUN.woodT > W_[5]) { setf('wood', 6); voiceOf('p17p_dorran'); say(TX.wood.nullday, 'voice', 8000); if (fint('dorran') === 0) setf('dorran', 1); applyMapState('p17p_wood'); }
    const d = npcOf('p17p_dorran'); if (!d) return;
    let dd = fint('dorran');
    if (dd === 2) { setf('dorran', 1); dd = 1; }           // a meeting left half-way (a reload): he is still standing there
    if (dd === 1) {                                        // he wades across to you
      const dx = c.x - d.x, dy = c.y - d.y, dist = Math.hypot(dx, dy);
      if (dist <= B.MEET_R) { dorranMeet(); return; }
      const s = Math.min(dist - B.MEET_R + 0.01, B.DORRAN_SPEED * 1.4 * dt); d.x += dx / dist * s; d.y += dy / dist * s; d.dir = Math.atan2(dy, dx); d.moving = true;
    } else if (dd === 3) {                                 // he leads you up the river street
      const pd = Math.hypot(c.x - d.x, c.y - d.y);
      let k = d.p17pWay | 0; while (k < DORRAN_WAY.length - 1 && Math.hypot(DORRAN_WAY[k][0] - d.x, DORRAN_WAY[k][1] - d.y) < 0.3) k++;
      d.p17pWay = k;
      const [tx, ty] = DORRAN_WAY[k], tdx = tx - d.x, tdy = ty - d.y, td = Math.hypot(tdx, tdy);
      if (pd > B.DORRAN_LEAD) { d.moving = false; d.dir = Math.atan2(c.y - d.y, c.x - d.x); if (pd > B.DORRAN_LEAD + 3) say(TX.dorran.wait, '', 4500, 'wait', 20); }
      else if (td > 0.05) { const s = Math.min(td, B.DORRAN_SPEED * dt); d.x += tdx / td * s; d.y += tdy / td * s; d.dir = Math.atan2(tdy, tdx); d.moving = true; }
      if (k === DORRAN_WAY.length - 1 && td < 0.3) { setf('dorran', 4); }
    } else if (dd === 4) {
      d.moving = false;
      if (Math.hypot(c.x - d.x, c.y - d.y) < B.END_R) theEnd();
    }
    d.homeX = d.x; d.homeY = d.y; d.facing = d.dir;
  }
  function tick(dt) {
    if (!here()) return;
    try { G.player.voice = 0; } catch (e) { /* none */ }        // she has none
    RUN.whistleT = Math.max(0, RUN.whistleT - dt); RUN.knockT = Math.max(0, RUN.knockT - dt);
    if (G.state === 'play') follow(dt);
    lamp();
    if (G.mapId === 'p17p_road') tickRoad(dt); else tickWood(dt);
  }

  // ---------------------------------------------------------------- arrival
  function arrive() {
    validate(); applyMapState(G.mapId);
    const m = G.map, c = Engine.cam;
    if (m.isBlocked(c.x | 0, c.y | 0) || !isFinite(c.x) || !isFinite(c.y)) { c.x = m.spawn.x; c.y = m.spawn.y; c.dir = m.spawn.dir || 0; try { settleFeet(); } catch (e) { /* ok */ } }
    // the company comes through behind you
    const at = G.mapId === 'p17p_road' && Math.hypot(c.x - 46.5, c.y - 13.7) < 2 ? [[45.6, 14.8], [47.2, 15.6], [44.6, 15.9], [46.4, 16.8]] : (G.mapId === 'p17p_wood' && c.y > 58 ? WOOD_COMP : null);
    if (at) COMPANIONS.forEach((id, i) => { const e = npcOf(id); if (e) { e.x = at[i][0]; e.y = at[i][1]; } });
    seedTrail(); RUN.lamp = null; RUN.awayT = 0;
    if (G.mapId === 'p17p_wood') { RUN.woodT = fint('wood') >= 6 ? 99 : 0; if (fint('stage') < 4) setf('stage', 4); }
    setf('seen', fint('seen') | (G.mapId === 'p17p_road' ? 1 : 2));
    try { if (typeof WINTER17 !== 'undefined') WINTER17.apply(G.mapId, B.WINTER[G.mapId]); } catch (e) { /* the shared winter look is EXTRAS17's */ }
    try { if (typeof Weather !== 'undefined' && Weather.hold) Weather.hold('overcast'); } catch (e) { /* no rain on a snow road */ }
    lamp();
  }

  // ---------------------------------------------------------------- the extra: start and finish
  function lyraPlayer(p) {
    p.name = LYRA; p.face = 2; p.weapons = ['hands']; p.weapon = 0; p.pellets = 0; p.gold = 0; p.voice = 0;
    p.songs = ['tending'];
    if (!p.inv.some((s) => s.id === 'p17p_slate')) p.inv.push({ id: 'p17p_slate', n: 1 });
    return p;
  }
  function start() {
    RUN.aware = extraId() === ID; RUN.on = true; RUN.said = {}; RUN.endShown = false; RUN.helpT = 0; RUN.woodT = 0; RUN.crumbs = []; RUN.lamp = null;
    installCatalog(); ensurePeople();
    // EXTRAS17 has already made a fresh session (startGame, its own flags p17x_*): only make it Lyra's. With the
    // contract stub, make a fresh game the ordinary way here, so every module resets its run state.
    if (!RUN.aware) {
    const ci = Math.max(0, CLASSES.findIndex((c) => c.id === 'cantor'));
    const keep = { name: CREATE.name, cls: CREATE.cls, face: CREATE.face, bio: CREATE.bio, attrs: CREATE.attrs, step: CREATE.step, sign: CREATE.p11cSign };
    Object.assign(CREATE, { name: LYRA, cls: ci, face: 2, bio: [], attrs: Object.assign({}, CLASSES[ci].attrs), p11cSign: 0 });
    RUN.starting = true;
    try { startGame(); } finally { RUN.starting = false; Object.assign(CREATE, { name: keep.name, cls: keep.cls, face: keep.face, bio: keep.bio, attrs: keep.attrs, step: keep.step, p11cSign: keep.sign }); }
    }
    try { for (const id of ['#title', '#create', '#intro', '#death', '#ending']) hide(id); $('#msgs').innerHTML = ''; } catch (e) { /* none */ }
    lyraPlayer(G.player);
    G.journal = []; G.day = B.DAY; G.tod = B.TOD_ROAD[0]; G.noise = 1;
    for (const k of Object.keys(G.flags)) if (k.indexOf(FP) === 0) delete G.flags[k];
    setf('stage', 1);
    if (!G.maps.p17p_road) { G.maps.p17p_road = buildRoad(); G.maps.p17p_wood = buildWood(); }
    loadMap('p17p_road'); G.state = 'play'; G.keys = {};
    journal('main', TX.jour.start);
    showEvent(esc(TX.open.title), body(TX.open.p), [{ t: esc(TX.open.go), f: () => say(TX.open.hint, 'warn', 8000) }]);
    return true;
  }
  function finish() {
    const result = { id: ID, stones: fint('stones'), done: fint('stage') >= 6, text: TX.end.stones.replace('{0}', String(fint('stones'))) };
    for (const id of MAPS) { try { if (typeof WINTER17 !== 'undefined') WINTER17.clear(id); } catch (e) { /* EXTRAS17 clears too */ } }
    try { if (typeof Weather !== 'undefined' && Weather.release) Weather.release(); } catch (e) { /* none */ }
    RUN.on = false; RUN.lamp = null;
    try { hide('#event'); } catch (e) { /* none */ }
    G.state = 'p17p_end';
    try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.finish) EXTRAS17.finish(result); } catch (e) { console.warn('prologue17: EXTRAS17.finish failed', e); }
    if (G.state === 'p17p_end') {                         // the contract stub took nothing over: back to the title ourselves
      G.state = 'title'; G.keys = {};
      try { $('#msgs').innerHTML = ''; closeModal(); show('#title'); Audio_.setScene('title'); } catch (e) { /* headless */ }
    }
    return result;
  }

  // ---------------------------------------------------------------- uses, talk, songs, wood that does not ring
  function onUse(e) {
    if (e.use === 'p17p_grave') { useGrave(e); return true; }
    if (e.use === 'p17p_stone') { G.give('p17p_stone'); try { Audio_.sfx.pickup(); } catch (er) { /* silent */ } say(TX.road.took, 'good', 4500, 'took', 2); return true; }
    return false;
  }
  function onTalk(e) {
    if (e.id === 'p17p_dorran') { if (fint('dorran') === 1 || fint('dorran') === 2) dorranMeet(); else say(TX.dorran.label, '', 4500); return true; }
    const n = NPC_DEFS[e.id]; if (n) { say(n.greet.normal, '', 5000); return true; }
    return false;
  }
  function whistle() {
    if (RUN.whistleT > 0) return;
    RUN.whistleT = B.WHISTLE_CD;
    try { Audio_.sfx.song(B.WHISTLE_HZ, 0.9); } catch (e) { /* no audio yet */ }
    say(TX.whistle, 'voice', 6500);
  }
  function woodAhead(reach) {
    const c = Engine.cam, m = G.map;
    for (let d = 0.3; d <= reach + 0.6; d += 0.2) {
      const x = c.x + Math.cos(c.dir) * d, y = c.y + Math.sin(c.dir) * d, cell = m.get(x | 0, y | 0);
      if (cell && (cell.tex === 'p17p_bark' || cell.tex === 'p17p_woods')) return true;
      if (cell) return false;
    }
    for (const e of G.ents) {
      if (!e.p17pWood || e.hidden) continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy);
      let a = Math.atan2(dy, dx) - c.dir; while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
      if (d <= reach + (e.radius || 0.3) + 0.5 && Math.abs(a) < 0.6) return true;
    }
    return false;
  }
  const WALL_LABELS = () => ({ p17p_hedge: G.mapId === 'p17p_wood' ? TX.wood.hedge : TX.road.hedge, p17p_woods: TX.road.woods, p17p_bark: TX.wood.trunk, p17p_post: TX.road.post, p17p_gate: TX.road.gate, p17p_rivergate: G.mapId === 'p17p_wood' ? TX.wood.back : TX.road.riverGate });

  // ---------------------------------------------------------------- wiring: wrappers, inert unless this extra is running
  function wrap() {
    const W = (name, make) => { if (typeof window[name] === 'function' || (typeof globalThis !== 'undefined' && typeof globalThis[name] === 'function')) make(); };
    W('buildAllMaps', () => { const _f = buildAllMaps; buildAllMaps = function () { const maps = _f.apply(this, arguments); try { if (active()) { maps.p17p_road = buildRoad(); maps.p17p_wood = buildWood(); } } catch (er) { console.warn('prologue17 maps failed', er); } return maps; }; });
    W('loadMap', () => { const _f = loadMap; loadMap = function () { if (active()) { try { ensurePeople(); validate(); } catch (er) { /* art retries later */ } } const r = _f.apply(this, arguments); try { if (here()) arrive(); } catch (er) { console.warn('prologue17 arrival failed', er); } return r; }; });
    W('update', () => {
      const _f = update;
      update = function (dt) {
        const on = here() && G.state === 'play' && G.mapId === 'p17p_wood', c = typeof Engine !== 'undefined' ? Engine.cam : null, pre = on && c ? { x: c.x, y: c.y } : null;
        const r = _f.apply(this, arguments);
        try {
          if (pre && G.mapId === 'p17p_wood' && typeof playerMove === 'function') { const mx = c.x - pre.x, my = c.y - pre.y; if (mx || my) playerMove(c, -mx * (1 - B.WADE), -my * (1 - B.WADE)); }
          tick(dt || 0);
        } catch (er) { console.warn('prologue17 tick failed', er); }
        return r;
      };
    });
    W('talk', () => { const _f = talk; talk = function (e) { try { if (active() && e && typeof e.id === 'string' && e.id.indexOf(FP) === 0 && onTalk(e)) return; } catch (er) { console.warn('prologue17 talk failed', er); } return _f.apply(this, arguments); }; });
    W('useDeco', () => { const _f = useDeco; useDeco = function (e) { try { if (active() && e && typeof e.use === 'string' && e.use.indexOf(FP) === 0 && onUse(e)) return; } catch (er) { console.warn('prologue17 use failed', er); } return _f.apply(this, arguments); }; });
    W('castSong', () => { const _f = castSong; castSong = function () { if (here()) { try { whistle(); } catch (er) { console.warn('prologue17 whistle failed', er); } return; } return _f.apply(this, arguments); }; });
    W('renderRest', () => { const _f = renderRest; renderRest = function () { if (here()) { G.state = 'play'; say(TX.road.noRest, 'warn', 3500); return; } return _f.apply(this, arguments); }; });
    W('travelBlocked', () => { const _f = travelBlocked; travelBlocked = function () { if (active()) return TX.road.noTravel; return _f.apply(this, arguments); }; });
    W('travelOpen', () => { const _f = travelOpen; travelOpen = function () { if (active()) { G.state = 'play'; say(TX.road.noTravel, 'warn', 3500); return; } return _f.apply(this, arguments); }; });
    W('transfer', () => { const _f = transfer; transfer = function (portal) { try { if (here() && portal && portal.map === 'p17p_wood' && fint('voice') === 0) { voiceEvent(); return; } } catch (er) { console.warn('prologue17 gate failed', er); } return _f.apply(this, arguments); }; });
    W('attack', () => {
      const _f = attack;
      attack = function () {
        const r = _f.apply(this, arguments);
        try { if (here() && G.attack.t > 0 && RUN.knockT <= 0 && woodAhead((currentWeapon() || {}).reach || 1)) { RUN.knockT = 3; say(TX.road.knock, '', 3500); } } catch (er) { /* cosmetic */ }
        return r;
      };
    });
    W('wallLabel', () => { const _f = wallLabel; wallLabel = function (cell) { try { if (here() && cell && typeof cell.tex === 'string' && cell.tex.indexOf(FP) === 0 && !cell.label) { const t = WALL_LABELS()[cell.tex]; if (t) return t; } } catch (er) { /* fall through */ } return _f.apply(this, arguments); }; });
    // Lyra's hands: hers for the length of one HUD draw, then the game's own again (POLISH17)
    W('drawHUD', () => {
      const _f = drawHUD;
      drawHUD = function () {
        let im = null, prev = null;
        try {
          const imgs = typeof Engine !== 'undefined' && Engine.images;
          if (imgs && here() && G.player) { im = fpHands(G.mapId === 'p17p_wood' || G.tod >= B.LAMP_FROM); if (im) { prev = imgs.fp_hands; imgs.fp_hands = im; } }
        } catch (er) { im = null; }
        try { return _f.apply(this, arguments); } finally { if (im) Engine.images.fp_hands = prev; }
      };
    });
    W('startGame', () => { const _f = startGame; startGame = function () { if (!RUN.starting) { RUN.aware = extraId() === ID; RUN.on = RUN.aware; } return _f.apply(this, arguments); }; });
    W('restoreGame', () => { const _f = restoreGame; restoreGame = function () { if (!RUN.starting) { RUN.aware = extraId() === ID; RUN.on = RUN.aware; } return _f.apply(this, arguments); }; });   // EXTRAS17 restoring an extra's own save keeps it running
    // the leaves do not rustle
    try {
      if (typeof Audio_ !== 'undefined' && Audio_.sfx && typeof Audio_.sfx.step === 'function') {
        const _s = Audio_.sfx.step;
        Audio_.sfx.step = function () { if (here() && G.mapId === 'p17p_wood') return; return _s.apply(this, arguments); };
        for (const k of ['_orig', '_test', '_p13h', '_p16d']) if (k in _s) Object.defineProperty(Audio_.sfx.step, k, { configurable: true, enumerable: true, get: () => _s[k], set: (v) => { _s[k] = v; } });   // pass inner wrappers' hooks through (house13 keeps its spy on ._orig)
      }
    } catch (er) { /* audio optional */ }
  }

  // ---------------------------------------------------------------- registration
  function register() {
    try {
      if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.register) EXTRAS17.register({ id: ID, title: TX.extra.title, blurb: TX.extra.blurb, start, unlocked: () => true });
    } catch (e) { console.warn('prologue17: could not register with EXTRAS17', e); }
  }
  const CARDS = { p17p_road: 'hedge', p17p_wood: 'street' };
  function init() {
    paintTextures(); paintProps(); installCatalog(); ensurePeople();
    wrap(); register();
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) Object.assign(SCREENS.FAMILY, CARDS); } catch (e) { /* no cards */ }
  }
  init();

  function state() { return { on: RUN.on, aware: RUN.aware, active: active(), crumbs: RUN.crumbs.length, woodT: RUN.woodT, endShown: RUN.endShown }; }
  return {
    ID, FP, MAPS, B, TX, LIST, FLAGS, RUN, NPC_DEFS, ITEM_DEFS, COMPANIONS, BARE, STONES, MILES, STREET, GIANTS, DORRAN_WAY, CARDS,
    start, finish, active, state, fint, setf, validate, buildRoad, buildWood, applyMapState, voiceEvent, dorranMeet, theEnd, helpOne,
    ensurePeople, tick, streetDist,
  };
})();
if (typeof window !== 'undefined') window.PROLOGUE17 = PROLOGUE17;
