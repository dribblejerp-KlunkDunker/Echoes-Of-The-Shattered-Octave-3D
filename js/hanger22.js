// ============================================================
//  hanger22 — Phase 22b, "What Bleats in the Wood": the Watch Downs region gets its dark.
//
//  Builds on js/sheepwalk22.js (Wethercombe, the flock, the Ram, the fold-fires). [PROPOSED] throughout.
//    * THE WOOLWIGHT. Something has been pulling the wool out of the Hedge's roots, a fleece at a time, and wearing it:
//      a tall heap of grey fleeces with three sheep's heads at the wrong heights. It bleats like a ewe that has lost her
//      lamb, and it can throw its voice. It hunts by night on the open maps of the region (Wethercombe, the Downs, the
//      Hanger), and it will not come into firelight: lit fold-fires, lanterns and a camp fire keep it off. By day it
//      goes back into the wood. This keeps the ruling: nothing took the sheep. Something took the wool.
//    * THE HANGER (p22_hanger), a steep dark beech wood south of Wethercombe, joined to Wethercombe only (a gap in its
//      south hedge). The Woolwight's nest, a tree hung with snagged Hedge-wool, a pool with glass-eels, a charcoal
//      burners' ring, lambkins (balls of wool on twig legs) and hounds.
//    * EWE BARROW (p22_barrow), the long barrow under the sarsen in Wethercombe: deadly, trapped, five chambers of grave
//      goods, Woolwights and lambkins, and in the last chamber the Old Fleece. The sarsen moves only when the Ram is
//      white and the three fold-fires burn ("when the Ram is white and the fires burn, the barrow gives back").
//    * QUESTS: "Bleating in the Wood" (find what wears the wool) and "The Lambing at Night" (Kit Farrant follows a bleat
//      into the dark: the cap at the nest, the barrow, the Old Fleece, and Kit).
//    * NEW GEAR: Farrant's Crook, Shearing Blades, the Barrow-Bronze Leaf Blade; the Barrow-Warden's Helm, the
//      Hedge-Wool Shroud, Drover's Boots; grave goods (a gold torc, amber beads, a bronze lunula), Hedge-wool.
//    * CAMP AND FISH ANYWHERE: the Drover's Camp Kit pitches a fire and a bedroll where you stand on any open-country map
//      (the fire cooks, as js/hearth15.js's camp fires do; the bedroll sleeps you through the night); the Drover's
//      Fishing Line casts into any water: stand still, strike on the bite. Trout, perch and, by night, glass-eels.
//
//  State: G.flags only, prefix p22h_ (quests) and p22c_ (the camp), small integers validated on every read. Hunting
//  Woolwights, the camp's fire and bedroll, the cap at the nest are TRANSIENT (never saved). The two new maps are built
//  deterministically and their baseCount set once; Wethercombe gains one door cell.
//  Rules kept: wrappers only; no markup from save data; presentation randomness from a private generator (the hunt's
//  spawn rolls too, so the game's own random stream is never drawn by this module).
// ============================================================
'use strict';

const HANGER22 = (function () {
  const SW = typeof SHEEPWALK22 !== 'undefined' ? SHEEPWALK22 : null;
  const COMBE = 'p22_combe', DOWNS = 'p20_downs', HANGER = 'p22_hanger', BARROW = 'p22_barrow';
  const HW = 50, HH = 44, BW = 41, BH = 13;
  const GAP_COMBE = [14, 59], GAP_HANGER = [25, 0];
  const NEST = [24.5, 22.5], POOL = [9, 15, 13, 19], WOOLTREE = [38.5, 31.5], RING = [40.5, 10.5];
  const SARSEN = [6.6, 50.4];
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d; };
  const flag = (k, hi) => hasG() && has(G.flags, 'p22h_' + k) ? num(G.flags['p22h_' + k], 0, hi || 1, 0) : 0;
  const setFlag = (k, v, hi) => { if (hasG()) G.flags['p22h_' + k] = num(v, 0, hi || 1, 0); };
  const hour = () => hasG() ? (((Number(G.tod) || 0) % 1) + 1) % 1 * 24 : 12;
  const night = () => { const h = hour(); return h >= 19.5 || h < 5.5; };
  const warned = new Set();
  const warnOnce = (k, e) => { if (warned.has(k)) return; warned.add(k); try { console.warn('hanger22: ' + k, e); } catch (x) { /* none */ } };
  const stats = { hunters: 0, spawned: 0, fled: 0, bleats: 0, decoys: 0, kept: 0, casts: 0, catches: 0, trees: 0, lush: 0 };
  let seed = 22202;
  const prand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seeded = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const fmt = (s, ...a) => String(s).replace(/\{(\d)\}/g, (m, i) => a[+i] !== undefined ? a[+i] : m);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 3500); } catch (e) { /* no HUD */ } };

  // ================================================================ text [PROPOSED], every line
  const TX = {
    hanger: S('The Hanger'),
    barrow: S('Ewe Barrow'),
    gapIn: S('A gap in the hedge, and the dark of a beech wood beyond it: the Hanger'),
    gapOut: S('The gap in the hedge, back to Wethercombe'),
    barrowOut: S('Daylight, at the end of the passage'),
    sarsenShut: S('Ewe Barrow: a long mound older than any name for it. Its door is a slab of grey sarsen, set in the chalk and not meant to move. Someone has laid a sprig of thyme on the sill. Absalom says: when the Ram is white and the fires burn, the barrow gives back.'),
    sarsenOpen: S('The sarsen has moved. It stands a hand\'s breadth off the door, the way a door stands when somebody inside has opened it. Cold air comes out, and the smell of wet wool.'),
    nest: S('A nest the size of a cart, of grey wool: fleece after fleece, matted, pulled long, snagged with Hedge-thorn. It is not sheep\'s wool off a sheep. It is wool that has been in the ground.'),
    nestEmpty: S('The nest. The wool is warm on the inside. Whatever lies here was here this morning.'),
    woolTree: S('A beech hung all over with tufts of grey wool, as if a flock had been dragged through it. There is no flock. There has not been a flock.'),
    ring: S('A charcoal burners\' ring, cold for years: a black circle in the leaf-litter, a turf hut fallen in, a rake with no teeth.'),
    pool: S('A pool in the beech roots, black as tea. Something long and faintly lit turns over in it, and goes down.'),
    stump: S('A beech stump with a hollow in it, the kind children hide things in.'),
    tracks: S('Tracks in the leaf-mould: a lot of small hooves, close together, all going the same way. They come from one set of feet.'),
    hunt: {
      first: S('Somewhere out in the dark, a ewe bleats: a long, broken bleat, like one that has lost her lamb. There are no ewes out tonight.'),
      far: [S('A ewe bleats in the dark, a long way off.'), S('Bleating, down by the wood. It stops when you listen.'), S('A bleat, close, and then the same bleat from the other side of you.')],
      near: [S('Bleating, close. Too low for a ewe.'), S('Something big moves in the dark, and bleats.'), S('Wool, and wet earth, and a bell that does not ring.')],
      light: S('It will not come into the firelight. It stands just past it, and bleats.'),
      dawn: S('The bleating goes back into the wood, and the birds start.'),
      kill: S('It comes apart: wool, and wool, and Hedge-thorn, and nothing in the middle.'),
      journal: S('Something hunts the Watch Downs and Wethercombe by night: a heap of grey wool with sheep\'s heads, that bleats. It will not come into firelight.'),
    },
    gideon: { wood: S('Bleating, nights, down by the Hanger. Tamar counts hers every morning and they are all there. Absalom says it is the Hedge-wool walking. Absalom is old. Go and look, by daylight, if you are going to.') },
    tamar: {
      wool: S('That\'s not wool off a sheep. That\'s Hedge-wool, packed under the roots in 417: you can see the earth in it, and the thorn. My mother\'s mark is on that hank. It\'s been pulling the Hedge apart from underneath, a fleece at a time, and wearing it. Nothing took our sheep. Something took the wool.'),
      woolThanks: S('Here. My father\'s camp kit, and his line. If you\'re going to be out at night, you\'ll want a fire you can carry. It won\'t come into firelight. Nothing that wears wool likes fire.'),
      lost: S('Kit\'s gone. He went out to the fold last night at dark and the hurdle\'s open and he\'s gone. He said he heard a ewe crying in the wood. Ours were all in. He went anyway. Please.'),
      lostWait: S('Find him. Please. He went toward the Hanger.'),
      home: S('Kit. Kit. — You brought him back. Out of the barrow? Out of — No. Don\'t tell me. Take this. It was my father\'s crook and his father\'s; it has pulled ewes out of drifts and hounds off lambs. I\'d rather it went with someone who brings children home.'),
    },
    kit: {
      lost: S('You came. It was making a noise like a lamb. Like a lamb that needed me. And then it was big. It\'s still in there. Is it still in there?'),
      safe: S('I\'m going home. I\'m going to watch the fold and not the hill. I mean it this time.'),
    },
    absalom: {
      wool: S('A thing that wears wool and bleats. Aye. My grandfather called it the Woolwight and said it was a story for keeping boys in at night. It walks the Downs when the fires are out. Light them and it keeps off the light. Find where it lies up, by daylight, in the Hanger, and bring me proof.'),
      barrow: S('Ewe Barrow. The shepherds buried somebody in there before there were shepherds. When the Ram is white and the fires burn, the barrow gives back. That is the rhyme. I never knew what it gave.'),
    },
    cap: S('Kit Farrant\'s cap, in the nest, wet through. Tracks lead away from the nest toward Wethercombe. Toward Ewe Barrow.'),
    capJournal: S('Kit\'s cap was in the Woolwight\'s nest in the Hanger. Its tracks go back toward Ewe Barrow. The sarsen has moved.'),
    woolJournal: S('Gideon at the Bellwether hears bleating at night by the Hanger, and Tamar\'s ewes are all in. Absalom calls it the Woolwight. He wants proof of where it lies up.'),
    woolFound: S('I found the Woolwight\'s nest in the Hanger: Hedge-wool, pulled from under the Hedge\'s roots. I took a hank of it for Absalom and Tamar.'),
    woolDone: S('Tamar knew the wool: Hedge-wool, packed in 417, her mother\'s mark on it. The Woolwight has been pulling the Hedge apart from underneath. Nothing took the sheep. Something took the wool.'),
    lostJournal: S('Kit Farrant went out after a bleat in the night and has not come back. Tamar thinks he went toward the Hanger.'),
    foundJournal: S('I found Kit in the last chamber of Ewe Barrow, behind the Old Fleece, and brought him out.'),
    homeJournal: S('Kit is home at the fold. Tamar gave me the Farrants\' crook.'),
    huntClosed: S('As far as I know the Woolwight still hunts the Downs by night. I left it there when we left the Reach.'),
    woolClosed: S('I never brought Tamar the Woolwight\'s wool. Whatever it was pulling out from under the Hedge, the Hedge is behind us now.'),
    kitFoundClosed: S('I brought Kit out of Ewe Barrow, but we left the Reach before I could tell Tamar. I hope he found the fold by himself.'),
    kitLostClosed: S('Kit Farrant was still out when we left the Reach. I did not find him in time.'),
    boss: S('The Old Fleece is down. Its bell rolls across the floor of the chamber and stops, and for the first time it rings.'),
    camp: {
      notOutdoors: S('You need open country and sky to pitch a camp.'),
      notHere: S('Not here. Find a clear bit of ground, out of the town.'),
      blocked: S('There is no room to pitch a camp just there.'),
      pitched: S('You clear a ring, lay the furze and the bedroll, and strike a light. The fire takes. It is yours for as long as you want it.'),
      menu: S('Your camp'),
      menuBody: S('The fire is going. The bedroll is laid. Out past the light the night does what it does.'),
      rest: S('Sleep by the fire (eight hours)'),
      roast: S('Roast what you caught'),
      cook: S('Cook with what you carry'),
      fish: S('Fish the water'),
      strike: S('Strike camp'),
      leave: S('Leave it'),
      slept: S('You sleep by the fire. Once in the night you wake, and something is standing out past the light, bleating, and does not come in. In the morning there are hoof-prints round the fire in a ring, and none inside it.'),
      sleptQuiet: S('You sleep by the fire and wake with the dew on the bedroll and the fire down to ash. Nothing came.'),
      struck: S('You kick the fire out, roll the bedroll and shoulder the kit.'),
      roasted: S('You roast {0} on a green stick and eat it off the stick.'),
      nothing: S('You have nothing to roast. A fish, or mutton chops, would do.'),
      moved: S('You strike the old camp and pitch a new one here.'),
    },
    fish: {
      none: S('There is no water near enough to cast into.'),
      cast: S('You cast and let the line settle. Stand still, and keep quiet.'),
      still: S('The line is in. Stand still.'),
      bite: S('The line jumps! Strike now (Use).'),
      missed: S('Gone. Whatever it was spat the hook.'),
      away: S('You walk off and the line comes out of the water.'),
      loud: S('Too much noise. Nothing will bite.'),
      startled: S('You scared it off.'),
      caught: S('You land {0}.'),
    },
    items: {
      hedgewool: { name: S('Hedge-Wool'), desc: S('A hank of grey wool from under the Hedge\'s roots, earth and thorn in it. Shepherds will know the marks.') },
      hank: { name: S('A Hank of Hedge-Wool, Marked'), desc: S('From the Woolwight\'s nest, with an old raddle mark still in it. Tamar or Absalom will know what it is.') },
      bell: { name: S('Woolwight\'s Bell'), desc: S('A sheep-bell on a rotten strap, with the clapper wrapped in wool so it never rings.') },
      torc: { name: S('Barrow-Gold Torc'), desc: S('A twisted neck-ring of pale gold, from a grave older than the Reach.') },
      amber: { name: S('String of Amber Beads'), desc: S('Amber beads on a gut string. There is a fly in one of them, older than anything.') },
      lunula: { name: S('Bronze Lunula'), desc: S('A crescent collar of beaten bronze, green at the edges.') },
      cap: { name: S('Kit Farrant\'s Cap'), desc: S('A boy\'s woollen cap, wet through, from the Woolwight\'s nest.') },
      campkit: { name: S('Drover\'s Camp Kit'), desc: S('A bedroll, a tinder-box and a bundle of furze, strapped together. Use it on open ground to pitch a camp where you stand: a fire to cook at and keep the dark off, and a bed. One camp at a time.') },
      line: { name: S('Drover\'s Fishing Line'), desc: S('A hand-line on a cork, hooks in the cork. Use it near any water to cast: stand still, and strike (Use) when it bites.') },
      trout: { name: S('Brown Trout'), desc: S('A chalk-stream trout, speckled red. Restores 4 health and 8 fatigue raw; better roasted at a camp.'), eat: S('Raw trout. It is not what you wanted.') },
      perch: { name: S('Perch'), desc: S('A striped perch, all spines. Restores 3 health and 8 fatigue raw; better roasted at a camp.'), eat: S('Raw perch, and spines.') },
      glasseel: { name: S('Glass-Eel'), desc: S('An eel you can see through, lit faintly from inside, caught after dark. Restores 10 voice raw; roasted, more.'), eat: S('It tastes of cold light, and your throat loosens.') },
      boot: { name: S('Drowned Boot'), desc: S('Somebody\'s boot, full of water and a crayfish. The crayfish has gone.') },
      troutR: { name: S('Roast Trout'), desc: S('Trout off the fire. Restores 18 health and 25 fatigue.'), eat: S('Hot trout, and the skin crisp. You eat it with your fingers.') },
      perchR: { name: S('Roast Perch'), desc: S('Perch off the fire, the spines pulled. Restores 14 health and 25 fatigue.'), eat: S('Sweet white perch. Mind the bones.') },
      glasseelR: { name: S('Roast Glass-Eel'), desc: S('Glass-eel off the fire, still faintly lit. Restores 25 voice and 10 health.'), eat: S('Your throat feels like a struck bell.') },
      chopsR: { name: S('Camp-Roast Chops'), desc: S('Mutton chops done black over a camp fire. Restores 22 health and 30 fatigue.'), eat: S('Fat and smoke and the dark all round.') },
    },
    weapons: {
      crook: { name: S('Farrant\'s Crook'), desc: S('A shepherd\'s crook of ash with a horn head, three generations of Farrants worn into the grip. Long reach; the hook staggers what it catches.') },
      shears: { name: S('Shearing Blades'), desc: S('A pair of spring-steel sheep-shears, the bow filed sharp, from the barrow\'s antechamber. Quick and close.') },
      leaf: { name: S('Barrow-Bronze Leaf Blade'), desc: S('A leaf-shaped bronze sword from a grave in Ewe Barrow. It rings when it strikes, like a small bell: the Cacophony does not like it.') },
    },
    armor: {
      helm: { name: S('Barrow-Warden\'s Helm'), desc: S('A bronze cap with cheek-guards, green with age, from the barrow. Whoever wore it guarded the door from the inside.') },
      shroud: { name: S('Hedge-Wool Shroud'), desc: S('A cloak of Hedge-wool torn from the Old Fleece. It drinks every sound you make. It smells of the ground.') },
      boots: { name: S('Drover\'s Boots'), desc: S('Long greased boots for a drove-road: quiet in wet grass and thorn-proof.') },
    },
    foes: {
      woolwight: { name: S('Woolwight'), desc: S('A heap of grey fleeces taller than a man, stitched with thorn, three sheep\'s heads set in it at the wrong heights. It bleats like a ewe that has lost her lamb. It will not come into firelight. When it comes at you, the wool splits, and out of it, on a neck of raw meat, comes a bull\'s skull with the skin gone and the jaw hanging open.') },
      lambkin: { name: S('Lambkin'), desc: S('A ball of wet wool on twig legs, the size of a lamb. It bleats, very small, and bites.') },
      oldfleece: { name: S('The Old Fleece'), desc: S('The oldest of them, the size of a cart, fleeces to the roof, a bell at its throat with the clapper wrapped in wool. It has been under the barrow a long time.') },
    },
  };

  // ================================================================ art (procedural stand-ins)
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); fn(x, w, h);
    return new Uint32Array(x.getImageData(0, 0, w, h).data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fillStyle = fill; x.fill(); };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  // a sheep's skull-head with its wool still on, eyes two pale points (eyes: 0 dark, 1 lit)
  function head(x, cx, cy, k, tilt, eyes) {
    x.save(); x.translate(cx, cy); x.rotate(tilt || 0);
    E(x, 0, -2 * k, 7.5 * k, 5.5 * k, '#c8c0aa'); E(x, -5 * k, 2 * k, 5.4 * k, 3.8 * k, '#ece4d0'); E(x, 2 * k, -6 * k, 6 * k, 3 * k, '#a89e88'); E(x, -9 * k, 3.4 * k, 2.4 * k, 1.8 * k, '#4a3a34');
    E(x, 4 * k, -4 * k, 4 * k, 1.6 * k, '#7a7466', 0.6);
    R(x, -4 * k, -1 * k, 2 * k, 1.6 * k, eyes ? '#e8f0d8' : '#1a1410'); R(x, -1 * k, -1.6 * k, 1.6 * k, 1.4 * k, eyes ? '#e8f0d8' : '#1a1410');
    x.restore();
  }
  // what is under the wool: a bull's skull with the skin gone, on a neck of raw meat. `out` 0..1 is how far it has
  // burst from the heap (0.45 when it rears: horns and brow through a split in the wool; 1 when it lunges: all of it,
  // the jaw dropped wide). Seen from the front, because it only shows itself when it comes at you.
  function bullSkull(x, cx, cy, k, out, rr) {
    const open = out >= 1 ? 1 : 0, s = k * (0.7 + 0.5 * out);
    const PO = (pts, fill) => { P(x, pts, fill); x.strokeStyle = '#1a0e08'; x.lineWidth = 1.3; x.stroke(); };   // outlined, to read at a distance
    // the wound in the heap: torn fleece lips round a wet red hole
    E(x, cx, cy + 6 * s, 24 * s, 18 * s, '#2a0a08');
    E(x, cx, cy + 6 * s, 20 * s, 14 * s, '#5a1410');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, px = cx + Math.cos(a) * 23 * s, py = cy + 6 * s + Math.sin(a) * 17 * s;
      E(x, px, py, (5 + rr() * 3) * s, (3 + rr() * 2) * s, ['#b8b09c', '#9c9482', '#c8c0ac'][(rr() * 3) | 0], a);   // the torn lips
      L(x, px, py, cx + Math.cos(a) * 15 * s, cy + 6 * s + Math.sin(a) * 10 * s, '#8a2018', 1.4);                  // flesh strings
    }
    if (out < 0.5) {
      // rearing: only the brow and the horns through the split, and two lit eyes in the dark
      x.save(); x.beginPath(); x.ellipse(cx, cy + 6 * s, 20 * s, 14 * s, 0, 0, Math.PI * 2); x.clip();
      E(x, cx, cy + 2 * s, 11 * s, 9 * s, '#d4c7a8'); E(x, cx, cy + 6 * s, 12 * s, 5 * s, '#a4282a');
      E(x, cx - 5 * s, cy + 3 * s, 3 * s, 2.4 * s, '#140606'); E(x, cx + 5 * s, cy + 3 * s, 3 * s, 2.4 * s, '#140606');
      R(x, cx - 5.6 * s, cy + 2.4 * s, 1.6 * s, 1.4 * s, '#f0f6e4'); R(x, cx + 4.2 * s, cy + 2.4 * s, 1.6 * s, 1.4 * s, '#f0f6e4');
      x.restore();
      for (const sd of [-1, 1]) {   // horn tips, pushing up through the wool
        x.beginPath(); x.moveTo(cx + sd * 9 * s, cy - 1 * s); x.quadraticCurveTo(cx + sd * 24 * s, cy - 8 * s, cx + sd * 27 * s, cy - 27 * s);
        x.quadraticCurveTo(cx + sd * 18 * s, cy - 10 * s, cx + sd * 4 * s, cy + 3 * s); x.closePath();
        x.fillStyle = VG(x, cy - 27 * s, cy, '#1e1610', '#8a7a5a'); x.fill(); x.strokeStyle = '#120a06'; x.lineWidth = 1.3; x.stroke();
      }
      return;
    }
    // lunging: the neck, raw and striated, out of the hole
    P(x, [[cx - 13 * s, cy + 16 * s], [cx - 9 * s, cy - 4 * s], [cx + 9 * s, cy - 4 * s], [cx + 13 * s, cy + 16 * s]], '#8a1c16');
    for (let i = -3; i <= 3; i++) L(x, cx + i * 3 * s, cy + 16 * s, cx + i * 2.2 * s, cy - 4 * s, i % 2 ? '#c03a2c' : '#5a0e0a', 1.4);
    // the horns: thick at the poll, sweeping out and up, black at the tips
    for (const sd of [-1, 1]) {
      x.beginPath(); x.moveTo(cx + sd * 10 * s, cy - 19 * s);
      x.quadraticCurveTo(cx + sd * 34 * s, cy - 22 * s, cx + sd * 36 * s, cy - 42 * s);
      x.quadraticCurveTo(cx + sd * 26 * s, cy - 22 * s, cx + sd * 8 * s, cy - 8 * s); x.closePath();
      x.fillStyle = VG(x, cy - 42 * s, cy - 8 * s, '#16100a', '#a89470'); x.fill(); x.strokeStyle = '#120a06'; x.lineWidth = 1.4; x.stroke();
      L(x, cx + sd * 14 * s, cy - 15 * s, cx + sd * 30 * s, cy - 24 * s, 'rgba(90,70,50,0.6)', 1);   // ridges
    }
    // the cranium: a broad poll, the face narrowing to a long muzzle, bone with the meat half off it
    PO([[cx - 13 * s, cy - 18 * s], [cx + 13 * s, cy - 18 * s], [cx + 11 * s, cy - 2 * s], [cx + 6 * s, cy + 14 * s], [cx + 4 * s, cy + 24 * s], [cx - 4 * s, cy + 24 * s], [cx - 6 * s, cy + 14 * s], [cx - 11 * s, cy - 2 * s]], '#cfc1a0');
    P(x, [[cx + 4 * s, cy - 16 * s], [cx + 13 * s, cy - 18 * s], [cx + 11 * s, cy - 2 * s], [cx + 6 * s, cy + 14 * s], [cx + 4 * s, cy + 24 * s], [cx + 2 * s, cy + 6 * s]], 'rgba(60,40,24,0.35)');   // the shadowed side
    E(x, cx, cy - 15 * s, 13 * s, 4 * s, '#e0d4b4');                                   // the poll
    P(x, [[cx - 11 * s, cy - 4 * s], [cx - 6 * s, cy + 12 * s], [cx - 9 * s, cy + 8 * s], [cx - 13 * s, cy - 6 * s]], '#a42a22');   // meat clinging to the cheeks
    P(x, [[cx + 11 * s, cy - 4 * s], [cx + 6 * s, cy + 12 * s], [cx + 9 * s, cy + 8 * s], [cx + 13 * s, cy - 6 * s]], '#a42a22');
    L(x, cx, cy - 16 * s, cx, cy + 20 * s, 'rgba(110,90,64,0.55)', 1.2);                 // the suture
    // the sockets, deep, with a coal in each
    for (const sd of [-1, 1]) { E(x, cx + sd * 7 * s, cy - 6 * s, 4.4 * s, 3.6 * s, '#120404', sd * 0.3); R(x, cx + sd * 7 * s - 1.2 * s, cy - 7 * s, 2.4 * s, 2 * s, '#f0f6e4'); }
    E(x, cx - 2.2 * s, cy + 20 * s, 1.4 * s, 2.4 * s, '#1a0a06'); E(x, cx + 2.2 * s, cy + 20 * s, 1.4 * s, 2.4 * s, '#1a0a06');   // the nasal holes
    // the maw: the jaw dropped wide, a red throat, teeth top and bottom, sinew strung between
    const jy = cy + 24 * s, drop = 16 * s * open;
    E(x, cx, jy + drop * 0.5, 9 * s, drop * 0.55 + 2 * s, '#3a0606');
    E(x, cx, jy + drop * 0.6, 5 * s, drop * 0.35 + 1, '#7a1410');
    PO([[cx - 9 * s, jy + drop], [cx + 9 * s, jy + drop], [cx + 6 * s, jy + drop + 8 * s], [cx - 6 * s, jy + drop + 8 * s]], '#bfb090');   // the lower jaw
    P(x, [[cx - 9 * s, jy + drop], [cx - 6 * s, jy + drop + 8 * s], [cx - 12 * s, jy + drop - 2 * s]], '#a42a22');
    P(x, [[cx + 9 * s, jy + drop], [cx + 6 * s, jy + drop + 8 * s], [cx + 12 * s, jy + drop - 2 * s]], '#a42a22');
    for (let i = 0; i < 6; i++) {
      const tx = cx - 6.5 * s + i * 2.6 * s;
      P(x, [[tx, jy - 1], [tx + 2 * s, jy - 1], [tx + 1 * s, jy + 3.6 * s]], '#ece0c0');                 // upper teeth
      P(x, [[tx, jy + drop + 1], [tx + 2 * s, jy + drop + 1], [tx + 1 * s, jy + drop - 3.2 * s]], '#ece0c0');   // lower teeth
    }
    for (const sd of [-1, 1]) L(x, cx + sd * 7 * s, jy, cx + sd * 6 * s, jy + drop, '#b03024', 1.2);   // sinew
    L(x, cx - 3 * s, jy + 2, cx - 1 * s, jy + drop - 1, 'rgba(200,190,170,0.7)', 0.8);                 // a string of spit
  }
  // the Woolwight in five poses: '', _w1, _w2 (the heap shifts on its legs), _a1 (rears), _a2 (lunges)
  function paintWoolwight(x, w, h, pose, big) {
    const r = seeded(big ? 515 : 313), k = big ? 1.25 : 1, sway = pose === '_w1' ? -3 : pose === '_w2' ? 3 : 0, rear = pose === '_a1' ? -12 : pose === '_a2' ? 3 : 0, lunge = pose === '_a2' ? -9 : 0;
    E(x, w / 2, h - 3, w * 0.4, 4, 'rgba(0,0,0,0.42)');
    // legs: a crowd of sheep's legs under the heap, knees bent, out of step, black hooves
    const legTop = h * 0.7;
    for (let i = 0; i < 8; i++) {
      const lx = w * 0.24 + i * w * 0.075, st = (i % 2 ? sway : -sway), kx = lx + (i % 3 - 1) * 3 + st * 0.6, ky = legTop + (h - 6 - legTop) * 0.5;
      L(x, lx, legTop, kx, ky, '#3a3028', 3 * k); L(x, kx, ky, lx + st, h - 6, '#2e2620', 2.4 * k); E(x, lx + st, h - 5, 2.6 * k, 2, '#120e0c');
    }
    // the heap: matted fleeces, cream going grey going brown at the hem where it drags; a ridge of thorn down its back
    const cx = w / 2 + sway + lunge, top = h * 0.1 + rear + 6;
    P(x, [[w * 0.12 + sway, legTop + 4], [w * 0.16 + sway, top + 34], [cx - 14, top + 6], [cx + 6, top], [cx + 22, top + 10], [w * 0.86 + sway, top + 38], [w * 0.9 + sway, legTop + 4]], '#8a8274');
    for (let i = 0; i < 70; i++) {
      const t = r(), px = w * 0.14 + r() * w * 0.72 + sway, py = top + 6 + t * (legTop - top - 4), shade = t < 0.35 ? ['#d6cfbd', '#c8c0ac', '#e2dccb'] : t < 0.7 ? ['#aaa290', '#9c9482', '#b8b09c'] : ['#7a6e5c', '#6a5e4c', '#5a4e3e'];
      E(x, px, py, (5 + r() * 6) * k, (4 + r() * 4) * k, shade[(r() * 3) | 0]);
      if (r() < 0.5) { x.strokeStyle = 'rgba(70,60,48,0.55)'; x.lineWidth = 1; x.beginPath(); x.arc(px, py, 2.4 * k, r() * 3, r() * 3 + 3.5); x.stroke(); }   // curls
    }
    for (let i = 0; i < 18; i++) { const px = cx - 18 + r() * 40, py = top + 2 + r() * 20; L(x, px, py, px + (r() - 0.5) * 6, py - 4 - r() * 5, '#2a2018', 1.2); }   // thorn
    for (let i = 0; i < 12; i++) { const px = w * 0.16 + r() * w * 0.68 + sway; L(x, px, legTop - 2, px + (r() - 0.5) * 3, legTop + 6 + r() * 8, '#6a5e4c', 2); }   // the dragging hem
    // the heads: sheep's skulls with the wool still on them, at the wrong heights, eyes lit in two of them
    const attack = pose === '_a1' || pose === '_a2';
    if (!attack) head(x, cx - 18 * k, top + 12, 1.35 * k, -0.25, true);
    head(x, w * 0.78 + sway, top + 34, 1.05 * k, 0.6, false);
    head(x, w * 0.28 + sway, legTop - 12, 0.95 * k, 2.7, true);
    // the bell on its strap, the clapper wrapped in wool
    L(x, cx - 6, top + 22, cx - 4, top + 36, '#3a2a1a', 2); E(x, cx - 4, top + 40, 4.4 * k, 5.4 * k, '#8a7038'); E(x, cx - 4, top + 41, 3 * k, 3.6 * k, '#cfc6b2');
    // when it comes at you, what wears the wool shows itself: the skinned bull's skull, out through the fleece and the flesh
    if (attack) bullSkull(x, cx - 2 * k, top + (pose === '_a2' ? 50 : 32) * k, k, pose === '_a2' ? 1 : 0.45, seeded(big ? 616 : 414));
  }
  function paintLambkin(x, w, h, pose) {
    const r = seeded(717), hop = pose === '_w1' ? -3 : pose === '_w2' ? -1 : 0, bite = pose === '_a2' ? -4 : 0;
    E(x, w / 2, h - 2, w * 0.3, 2, 'rgba(0,0,0,0.35)');
    for (let i = 0; i < 4; i++) { const lx = w * 0.3 + i * w * 0.13; L(x, lx, h * 0.6 + hop, lx + (i % 2 ? 2 : -2) * (pose ? 1 : 0), h - 3, '#3a2a1a', 1.4); }
    for (let i = 0; i < 16; i++) E(x, w / 2 + (r() - 0.5) * w * 0.5, h * 0.42 + hop + (r() - 0.5) * h * 0.3, 4 + r() * 3, 3 + r() * 3, ['#8a847a', '#77726a', '#9a9384'][(r() * 3) | 0]);
    head(x, w * 0.24 + bite, h * 0.38 + hop + (pose === '_a1' ? -3 : 0), 0.55, -0.2, true);
  }
  function paintArt() {
    const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
    for (const p of POSES) addSprite('p22_woolwight' + p, 110, 150, (x, w, h) => paintWoolwight(x, w, h, p, false));
    for (const p of POSES) addSprite('p22_oldfleece' + p, 150, 170, (x, w, h) => paintWoolwight(x, w, h, p, true));
    for (const p of POSES) addSprite('p22_lambkin' + p, 44, 34, (x, w, h) => paintLambkin(x, w, h, p));
    try { for (const p of POSES) for (const n of ['p22_woolwight', 'p22_oldfleece', 'p22_lambkin']) { const sp = Engine.sprites[n + p]; if (!sp) continue; const m = new Uint8Array(sp.w * sp.h); for (let i = 0; i < m.length; i++) { const v = sp.data[i]; if ((v >>> 24) > 100 && (v & 255) > 220 && ((v >> 8) & 255) > 230) m[i] = 1; } Engine.setEmissive(n + p, m); } } catch (e) { /* plain eyes */ }
    addSprite('p22_nest', 140, 60, (x, w, h) => {
      const r = seeded(919);
      E(x, w / 2, h - 6, w * 0.48, 10, 'rgba(0,0,0,0.35)');
      for (let i = 0; i < 70; i++) { const a = r() * Math.PI, rr = 0.5 + r() * 0.5; E(x, w / 2 + Math.cos(a) * w * 0.42 * rr * (r() < 0.5 ? 1 : -1), h - 12 - Math.sin(a) * 30 * rr, 9 + r() * 7, 6 + r() * 4, ['#6a655c', '#7a746a', '#58534a', '#8a847a'][(r() * 4) | 0]); }
      E(x, w / 2, h - 14, w * 0.22, 8, '#3a342c');
      for (let i = 0; i < 30; i++) { const px = 10 + r() * (w - 20), py = 14 + r() * (h - 24); L(x, px, py, px + (r() - 0.5) * 14, py + (r() - 0.5) * 8, '#2a2218', 1); }
    });
    addSprite('p22_wooltree', 112, 150, (x) => {
      const r = seeded(921);
      E(x, 56, 147, 34, 3.5, 'rgba(0,0,0,0.3)');
      P(x, [[48, 148], [50, 84], [54, 60], [60, 60], [64, 84], [66, 148]], VG(x, 60, 148, '#7a7a72', '#4a4c46'));
      L(x, 56, 84, 26, 50, '#5e5e56', 4); L(x, 58, 80, 88, 46, '#5e5e56', 4);
      for (let i = 0; i < 60; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); E(x, 56 + Math.cos(a) * d * 48, 46 + Math.sin(a) * d * 34, 6 + r() * 5, 5 + r() * 4, ['#2e4a22', '#38582a', '#24401c'][(r() * 3) | 0]); }
      for (let i = 0; i < 40; i++) { const px = 12 + r() * 88, py = 20 + r() * 90; L(x, px, py, px + (r() - 0.5) * 3, py + 6 + r() * 6, '#8a847a', 1); E(x, px, py + 8 + r() * 4, 3, 4, '#9a9488'); }
    });
    addSprite('p22_bedroll', 72, 18, (x) => {
      E(x, 36, 15, 34, 3, 'rgba(0,0,0,0.3)');
      x.fillStyle = VG(x, 6, 16, '#6a4e34', '#3e2c1c'); x.beginPath(); x.moveTo(6, 15); x.quadraticCurveTo(8, 6, 20, 7); x.lineTo(60, 7); x.quadraticCurveTo(68, 8, 66, 15); x.closePath(); x.fill();
      x.fillStyle = '#8a6c48'; x.beginPath(); x.moveTo(20, 7); x.lineTo(60, 7); x.lineTo(58, 10); x.lineTo(22, 10); x.closePath(); x.fill();
      E(x, 13, 9, 8, 4, '#c8bfa0'); E(x, 13, 8, 6, 2.4, '#e0d8bc');
      for (let i = 0; i < 4; i++) L(x, 26 + i * 9, 7, 26 + i * 9, 15, 'rgba(0,0,0,0.25)', 1);
    });
    addSprite('p22_sarsen_open', 72, 72, (x) => {
      E(x, 36, 69, 32, 3, 'rgba(0,0,0,0.3)');
      P(x, [[16, 70], [16, 20], [26, 10], [44, 10], [52, 20], [52, 70]], '#0a0808');
      P(x, [[40, 70], [44, 14], [56, 6], [70, 18], [68, 70]], VG(x, 6, 70, '#9a968a', '#5e5a52'));
      for (let i = 0; i < 8; i++) E(x, 48 + (i * 7 % 18), 16 + (i * 13 % 46), 3, 2, 'rgba(120,140,90,0.45)');
      R(x, 18, 64, 30, 6, '#3a342c');
    });
    // beech leaf-litter: copper and brown over the moss, and a darker drift of it
    for (const [name, k] of [['t_p22_litter', 0], ['t_p22_litter2', 1]]) {
      if (!Engine.addTexture || Engine.textures[name] || !Engine.textures.t_moss) continue;
      const src = Engine.textures.t_moss, d = new Uint32Array(4096), r = seeded(808 + k);
      for (let i = 0; i < 4096; i++) { const p = src[i]; d[i] = ((255 << 24) | ((((p >> 16) & 255) * 0.55) << 16) | ((((p >> 8) & 255) * 0.62) << 8) | ((p & 255) * 0.7)) >>> 0; }
      for (let n = 0; n < (k ? 140 : 100); n++) {
        const cx = (r() * 64) | 0, cy = (r() * 64) | 0, col = [[150, 84, 40], [176, 104, 48], [120, 70, 36], [196, 134, 64], [92, 58, 34]][(r() * 5) | 0];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) { if (Math.abs(dx) + Math.abs(dy) > 2) continue; const x = (cx + dx + 64) & 63, y = (cy + dy + 64) & 63, sh = k ? 0.75 : 1; d[y * 64 + x] = ((255 << 24) | ((col[2] * sh) << 16) | ((col[1] * sh) << 8) | (col[0] * sh)) >>> 0; }
      }
      Engine.addTexture(name, d);
    }
    // the barrow's walls: grey sarsen blocks, dry-laid
    if (Engine.addTexture && !Engine.textures.t_p22_sarsenwall && Engine.textures.t_stone) {
      const s = Engine.textures.t_stone, d = new Uint32Array(4096);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const p = s[y * 64 + x], bx = Math.floor((x + ((y >> 4) & 1) * 11) / 22), by = y >> 4, n = (Math.imul(bx * 73856093 ^ by * 19349663, 2654435761) >>> 0) / 4294967296;
        const edge = (y & 15) === 0 || ((x + ((y >> 4) & 1) * 11) % 22) === 0, k = edge ? 0.45 : 0.78 + n * 0.3;
        const r = ((p & 255) * 0.5 + 60) * k, g = (((p >> 8) & 255) * 0.5 + 62) * k, b = (((p >> 16) & 255) * 0.5 + 58) * k;
        d[y * 64 + x] = ((255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r)) >>> 0;
      }
      Engine.addTexture('t_p22_sarsenwall', d);
    }
  }

  // ================================================================ catalogue: foes, loot, items, weapons, armour
  const ENEMY_DEFS = {
    p22_woolwight: { name: TX.foes.woolwight.name, sprite: 'p22_woolwight', hp: 72, dmg: [7, 15], speed: 1.75, reach: 1.35, scale: 1.3, xp: 95, woolwight: true, desc: TX.foes.woolwight.desc },
    p22_lambkin: { name: TX.foes.lambkin.name, sprite: 'p22_lambkin', hp: 12, dmg: [2, 5], speed: 2.3, reach: 0.9, scale: 0.5, xp: 10, desc: TX.foes.lambkin.desc },
    p22_oldfleece: { name: TX.foes.oldfleece.name, sprite: 'p22_oldfleece', hp: 230, dmg: [10, 20], speed: 1.2, reach: 1.7, scale: 1.9, xp: 420, boss: true, woolwight: true, desc: TX.foes.oldfleece.desc },
  };
  const LOOT_DEFS = {
    p22_woolwight: { chance: 0.9, table: [['p22_hedgewool', 55], ['p22_wwbell', 25], ['sovereigns', 20]] },
    p22_lambkin: { chance: 0.3, table: [['p22_hedgewool', 70], ['sovereigns', 30]] },
    p22_oldfleece: { chance: 1, table: [['a_p22_shroud', 100]] },
  };
  const VOICE_DEFS = { p22_woolwight: { f0: 150, fs: 0.8, style: 'beast' }, p22_lambkin: { f0: 420, fs: 1.2, style: 'beast' }, p22_oldfleece: { f0: 90, fs: 0.6, style: 'beast' } };
  const FOOD = {
    p22_trout: { k: 'trout', hp: 4, fat: 8, value: 3 }, p22_perch: { k: 'perch', hp: 3, fat: 8, value: 2 }, p22_glasseel: { k: 'glasseel', voice: 10, value: 14 },
    p22_trout_roast: { k: 'troutR', hp: 18, fat: 25, value: 6 }, p22_perch_roast: { k: 'perchR', hp: 14, fat: 25, value: 5 }, p22_glasseel_roast: { k: 'glasseelR', hp: 10, voice: 25, value: 20 },
    p22_chops_roast: { k: 'chopsR', hp: 22, fat: 30, value: 8 },
  };
  const ROAST = [['p22_trout', 'p22_trout_roast'], ['p22_perch', 'p22_perch_roast'], ['p22_glasseel', 'p22_glasseel_roast'], ['p22_mutton_chops', 'p22_chops_roast']];
  const WEAPON_DEFS = {
    p22_crook: { name: TX.weapons.crook.name, img: 'fp_spear', dmg: [6, 13], reach: 2.2, noise: 1.0, speed: 0.6, type: 'iron', blunt: true, twoHanded: true, value: 160, rare: true, desc: TX.weapons.crook.desc },
    p22_shears: { name: TX.weapons.shears.name, img: 'fp_knife', dmg: [4, 9], reach: 1.1, noise: 0.6, speed: 0.26, type: 'iron', value: 48, desc: TX.weapons.shears.desc },
    p22_leafblade: { name: TX.weapons.leaf.name, img: 'fp_sword', dmg: [6, 14], reach: 1.45, noise: 1.5, speed: 0.46, type: 'bronze', value: 150, rare: true, desc: TX.weapons.leaf.desc },
  };
  const ARMOR_DEFS = {
    a_p22_barrowhelm: { name: TX.armor.helm.name, slot: 'head', ar: 4, noise: 0.2, value: 70, desc: TX.armor.helm.desc },
    a_p22_shroud: { name: TX.armor.shroud.name, slot: 'body', ar: 5, noise: -0.9, value: 140, desc: TX.armor.shroud.desc },
    a_p22_droverboots: { name: TX.armor.boots.name, slot: 'feet', ar: 2, noise: -0.25, value: 22, desc: TX.armor.boots.desc },
  };
  function installCatalog() {
    if (typeof ENEMIES !== 'undefined') for (const k in ENEMY_DEFS) if (!ENEMIES[k]) ENEMIES[k] = Object.assign({}, ENEMY_DEFS[k]);
    if (typeof LOOT !== 'undefined') for (const k in LOOT_DEFS) if (!LOOT[k]) LOOT[k] = LOOT_DEFS[k];
    try { if (typeof VOICES !== 'undefined' && VOICES.ENEMY_VOICES) for (const k in VOICE_DEFS) if (!VOICES.ENEMY_VOICES[k]) VOICES.ENEMY_VOICES[k] = Object.assign({}, VOICE_DEFS[k]); } catch (e) { /* default voices */ }
    try { if (typeof ANIM !== 'undefined' && ANIM.quadruped) ANIM.quadruped.add('p22_lambkin'); } catch (e) { /* plain */ }
    if (typeof ITEMS === 'undefined') return;
    const I = TX.items, add = (id, o) => { if (!ITEMS[id]) ITEMS[id] = o; };
    add('p22_hedgewool', { name: I.hedgewool.name, sprite: 'loot', desc: I.hedgewool.desc, valuable: true, value: 8 });
    add('p22_wwbell', { name: I.bell.name, sprite: 'loot', desc: I.bell.desc, valuable: true, value: 18 });
    add('p22_torc', { name: I.torc.name, sprite: 'loot', desc: I.torc.desc, valuable: true, value: 90 });
    add('p22_amber', { name: I.amber.name, sprite: 'loot', desc: I.amber.desc, valuable: true, value: 30 });
    add('p22_lunula', { name: I.lunula.name, sprite: 'loot', desc: I.lunula.desc, valuable: true, value: 55 });
    add('p22_hank', { name: I.hank.name, sprite: 'loot', desc: I.hank.desc, key: true });
    add('p22_kitcap', { name: I.cap.name, sprite: 'loot', desc: I.cap.desc, key: true });
    add('p22_campkit', { name: I.campkit.name, sprite: 'loot', desc: I.campkit.desc, use: 'p22_camp', value: 20 });
    add('p22_line', { name: I.line.name, sprite: 'loot', desc: I.line.desc, use: 'p22_fish', value: 8 });
    add('p22_boot', { name: I.boot.name, sprite: 'loot', desc: I.boot.desc, valuable: true, value: 1 });
    for (const id in FOOD) { const d = FOOD[id], t = I[d.k]; add(id, { name: t.name, sprite: 'loot', desc: t.desc, use: 'p22_food', hp: d.hp || 0, voice: d.voice || 0, fat: d.fat || 0, eat: t.eat, value: d.value }); }
    if (typeof WEAPONS !== 'undefined') for (const id in WEAPON_DEFS) { if (!WEAPONS[id]) WEAPONS[id] = Object.assign({}, WEAPON_DEFS[id]); add('w_' + id, { name: WEAPON_DEFS[id].name, sprite: 'gear', weapon: id, value: WEAPON_DEFS[id].value, desc: WEAPON_DEFS[id].desc }); }
    if (typeof ARMOR !== 'undefined') for (const id in ARMOR_DEFS) { if (!ARMOR[id]) ARMOR[id] = Object.assign({}, ARMOR_DEFS[id]); add(id, Object.assign({ sprite: 'gear', armor: true }, ARMOR[id])); }
    try {
      if (typeof ICONS !== 'undefined' && ICONS.TABLE) Object.assign(ICONS.TABLE, {
        p22_hedgewool: ['herb', { v: 'moss' }], p22_wwbell: ['valve', {}], p22_torc: ['signet', {}], p22_amber: ['shard', { col: '#e0a030' }], p22_lunula: ['scrap', {}],
        p22_hank: ['scroll', { paper: '#8a847a', ink: '#8a2a1a' }], p22_kitcap: ['scroll', { paper: '#6a7a8a', ink: '#2a3a4a' }], p22_campkit: ['book', { cov: '#7a5a3a', band: '#c8b080', title: '#3a2a1a' }],
        p22_line: ['whistle', {}], p22_boot: ['pebble', {}], p22_trout: ['eel', {}], p22_perch: ['eel', {}], p22_glasseel: ['eel', {}], p22_trout_roast: ['eel', {}],
        p22_perch_roast: ['eel', {}], p22_glasseel_roast: ['eel', {}], p22_chops_roast: ['pebble', {}],
      });
      const T = ICONS.TABLE, clone = (k, extra) => T[k] ? [T[k][0], Object.assign({}, T[k][1], extra || {})] : null;
      const more = { 'weapon:p22_crook': clone('weapon:spear', { m: '#a88a5a' }), 'weapon:p22_shears': clone('weapon:knife', { len: 13 }), 'weapon:p22_leafblade': clone('weapon:tobin_blade', { glow: null, glow2: null, runes: null }),
        a_p22_barrowhelm: clone('a_kettle'), a_p22_droverboots: clone('a_hobnails') };
      for (const k in more) if (more[k]) T[k] = more[k];
    } catch (e) { /* fallback icons */ }
  }

  // hand-built 24x24 pixel icons (js/icons.js's PIX kit)
  function installPixelIcons() {
    if (typeof ICONS === 'undefined' || !ICONS.PIX || !ICONS.C_PX) return;
    const X = ICONS.PIX, C = ICONS.C_PX, put = (id, fn) => { if (!X[id]) X[id] = fn; };
    const fish = (d, body, belly, spots, done) => {
      if (done) d.layer(C.ash).line(2, 19, 22, 9);
      d.layer(body, { shiny: 1 }).poly([3, 13, 8, 9, 15, 9, 19, 12, 15, 15, 8, 16]).poly([18, 12, 22, 8, 22, 16]);
      d.layer(belly, { sep: false }).path([6, 14, 15, 14]);
      d.mark('#1a120c', 6, 11); if (spots) d.mark(spots, 10, 11, 13, 12, 12, 10, 16, 12);
    };
    put('p22_hedgewool', (d) => { d.layer(C.wool, { shiny: 1 }).ell(10, 13, 6, 5).ell(15, 11, 5, 4.4).ell(13, 16, 5, 3.6); d.layer('#5a4a38', { shade: 'flat' }).path([5, 18, 9, 15]).px(15, 15, 17, 13); d.layer('#2a2018').path([16, 6, 18, 9]); });
    put('p22_wwbell', (d) => { d.layer(C.leather).path([6, 3, 12, 6, 18, 3]); d.layer(C.bell, { shiny: 1 }).poly([8, 8, 16, 8, 18, 19, 6, 19]); d.layer(C.wool, { sep: false }).ell(12, 19, 3, 2); d.mark('#ffe8a8', 10, 10); });
    put('p22_torc', (d) => { const g = d.layer(C.gold, { shiny: 1 }); g.ell(12, 13, 8.5, 7).cut().ell(12, 13, 6, 4.8).add().cut().rect(10, 17, 4, 4).add(); d.layer('#a8802a', { sep: false }).px(6, 10, 8, 8, 11, 6, 14, 6, 17, 8, 19, 11); d.layer(C.gold, { shiny: 1 }).ell(9, 19, 1.6, 1.6).ell(15, 19, 1.6, 1.6); });
    put('p22_amber', (d) => { d.layer(C.parch, { shade: 'flat' }).path([4, 6, 8, 14, 12, 18, 16, 14, 20, 6]); [[5, 8], [7.5, 12], [10, 16], [14, 16], [16.5, 12], [19, 8]].forEach(([x, y]) => d.layer(C.amber, { shiny: 1 }).ell(x, y, 2, 2)); d.mark('#2a1a0a', 14, 16); });
    put('p22_lunula', (d) => { const b = d.layer(C.bronze, { shiny: 1 }); b.ell(12, 9, 10, 9).cut().ell(12, 6, 8, 7).add(); d.layer('#5a8a6a', { sep: false }).px(4, 12, 20, 12, 6, 15, 18, 15); d.layer(C.bronze).ell(3, 9, 1.4, 1.4).ell(21, 9, 1.4, 1.4); });
    put('p22_hank', (d) => { d.layer(C.wool, { shiny: 1 }).thick([5, 6, 12, 10, 19, 6], () => 3).thick([5, 18, 12, 14, 19, 18], () => 3); d.layer('#8a847a').rect(10, 8, 4, 8); d.layer(C.red, { shade: 'flat' }).rect(11, 10, 2, 3); });
    put('p22_kitcap', (d) => { d.layer('#5a6a8a', { shiny: 1 }).ell(12, 13, 8, 6).rect(4, 13, 16, 4); d.layer('#3a4a6a', { sep: false }).path([4, 15, 20, 15]); d.layer('#c8c0a8').ell(12, 6, 2.4, 2.2); d.layer('#2a5a7a', { shade: 'flat' }).px(8, 17, 12, 18, 16, 17); });
    put('p22_campkit', (d) => { d.layer('#7a5a3a', { shiny: 1 }).ell(12, 13, 9, 5); d.layer('#5a3e24', { sep: false }).ell(12, 13, 3, 3); d.layer(C.dleather).rect(7, 7, 2, 12).rect(15, 7, 2, 12); d.layer(C.straw).rect(9, 3, 6, 3); d.mark('#e8c840', 10, 3, 13, 4); });
    put('p22_line', (d) => { d.layer('#b08a5a', { shiny: 1 }).ell(10, 12, 6, 6); d.layer('#8a6a40', { sep: false }).ell(10, 12, 3, 3); d.layer(C.linen, { shade: 'flat' }).path([16, 12, 20, 15, 21, 20]); d.layer(C.steel).px(21, 21, 20, 21, 20, 20); });
    put('p22_boot', (d) => { d.layer(C.dleather, { shiny: 1 }).poly([7, 3, 14, 3, 14, 14, 20, 16, 20, 20, 6, 20]); d.layer('#3c6a8a', { sep: false }).rect(8, 4, 5, 2); d.layer('#c87a50').px(17, 13, 18, 12); d.mark('#9ac8e8', 10, 4); });
    put('p22_trout', (d) => fish(d, '#8a7a4a', '#e8d8a0', '#c83a2a', false));
    put('p22_perch', (d) => { fish(d, '#6a8a3a', '#e8e0a0', null, false); d.layer('#2a4020', { shade: 'flat', sep: false }).px(9, 10, 9, 11, 12, 10, 12, 11, 15, 10, 15, 11); d.layer('#c84a2a').poly([10, 9, 13, 6, 14, 9]); });
    put('p22_glasseel', (d) => { d.layer('#9ad8e0', { shiny: 1 }).thick([3, 15, 8, 10, 13, 14, 18, 9, 21, 11], (t) => 2.4 - t * 1.2); d.mark('#ffffff', 7, 10, 12, 13, 17, 9).mark('#1a3a40', 4, 14); });
    put('p22_trout_roast', (d) => fish(d, '#7a4a24', '#d8a060', '#3a1a08', true));
    put('p22_perch_roast', (d) => { fish(d, '#6a4a22', '#c89a58', null, true); d.layer('#3a2410', { shade: 'flat', sep: false }).px(9, 10, 12, 10, 15, 10); });
    put('p22_glasseel_roast', (d) => { d.layer(C.ash).line(2, 20, 22, 6); d.layer('#c8a060', { shiny: 1 }).thick([4, 17, 9, 12, 14, 13, 19, 8], (t) => 2.2 - t); d.mark('#e8fbff', 9, 12, 14, 13, 18, 8); });
    put('p22_chops_roast', (d) => { d.layer(C.ash).line(3, 20, 21, 4); d.layer('#5a2a14', { shiny: 1 }).ell(9, 14, 4.6, 3.6).ell(15, 9, 4.4, 3.4); d.layer('#1a0a04', { sep: false }).px(7, 13, 10, 15, 14, 8, 16, 10); d.layer(C.bone).rect(17, 4, 2, 3); });
    put('weapon:p22_crook', (d) => { d.layer(C.ash, { shiny: 1 }).line(6, 22, 14, 6).line(7, 22, 15, 6); const h = d.layer(C.bone, { shiny: 1 }); h.ell(16, 5, 4.4, 4).cut().ell(16, 6, 2.4, 2.2).add().cut().rect(16, 6, 6, 6).add(); d.mark('#fff6d8', 14, 2); });
    put('weapon:p22_shears', (d) => { d.layer(C.steel, { shiny: 1 }).poly([4, 20, 11, 6, 13, 7, 7, 21]).poly([20, 20, 13, 6, 11, 7, 17, 21]); d.layer(C.dsteel).ell(12, 4, 3.4, 2.4).cut().ell(12, 4, 1.6, 1).add(); d.mark('#ffffff', 9, 10, 15, 10); });
    put('weapon:p22_leafblade', (d) => { d.tilt(12, 12, 1); d.layer(C.bronze, { shiny: 1 }).rpoly([0, -11, 2.6, -4, 2, 3, 0.8, 5, -0.8, 5, -2, 3, -2.6, -4]); d.layer('#7a5a2a', { sep: false }).rrect(-0.4, -9, 0.8, 13); d.layer(C.dwood).rrect(-1, 5, 2, 6); d.layer(C.brass, { shiny: 1 }).rell(0, 11.5, 1.6, 1.4); });
    put('a_p22_barrowhelm', (d) => { d.layer(C.bronze, { shiny: 1 }).ell(12, 11, 8, 7).rect(4, 11, 16, 3); d.layer('#5a8a6a', { sep: false }).px(6, 8, 9, 6, 15, 6, 18, 9); d.layer(C.bronze).rect(4, 13, 4, 7).rect(16, 13, 4, 7); d.mark('#ffe0a0', 9, 6); });
    put('a_p22_shroud', (d) => { d.layer('#6a665e', { shiny: 1 }).poly([9, 2, 15, 2, 21, 21, 3, 21]); d.layer('#4a463e', { sep: false }).path([12, 3, 12, 20]).path([6, 14, 9, 18]).path([18, 14, 15, 18]); d.layer('#8a847a').ell(12, 4, 3, 2); d.mark('#2a2018', 7, 19, 17, 19); });
    put('a_p22_droverboots', (d) => { [[5, 0], [12, 0]].forEach(([x]) => { d.layer('#4a3222', { shiny: 1 }).poly([x, 2, x + 6, 2, x + 6, 16, x + 8, 19, x + 8, 21, x, 21]); d.layer('#2a1a10', { sep: false }).rect(x, 19, 8, 2); d.mark('#a87a50', x + 1, 3); }); });
  }

  // ================================================================ the Hanger
  const HANGER_FLOORS = ['t_moss', 't_p22_litter', 't_water', 't_p20_track', 't_shallows', 't_grass', 't_p22_litter2'];
  const TREE_RE = /^p22_(beech|ash|yew|haw|elder|bellash|glassthorn)$|^oak$|^willow$|^p22_wooltree$/;
  // n tries at random spots (or at pick(rng) when given), never closer than gap to anything solid, never in water or a door
  function plantTrees(m, list, avoid, pick, n, gap, rng) {
    const taken = m.entities.filter((e) => e.solid || e.use || e.kind !== 'deco').map((e) => [e.x, e.y]);
    let k = 0;
    for (let i = 0; i < n; i++) {
      const at = pick ? pick(rng) : [1.4 + rng() * (m.w - 2.8), 1.4 + rng() * (m.h - 2.8)]; if (!at) continue;
      const x = at[0], y = at[1], cx = Math.floor(x), cy = Math.floor(y);
      if (x < 1.4 || y < 1.4 || x > m.w - 1.4 || y > m.h - 1.4 || m.get(cx, cy) || avoid(cx, cy, x, y) || taken.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < gap)) continue;
      let bad = false; for (let dy = -1; dy <= 1 && !bad; dy++) for (let dx = -1; dx <= 1; dx++) { const f = m.floorCells[(cy + dy) * m.w + cx + dx]; if (/water|shallow/.test((m.floorTextures && m.floorTextures[f]) || '') || m.doors[(cy + dy) * m.w + cx + dx]) { bad = true; break; } }
      if (bad) continue;
      const [sprite, sc, label] = list[(rng() * list.length) | 0];
      m.deco(sprite, +x.toFixed(2), +y.toFixed(2), { radius: sprite === 'p22_glassthorn' ? 0.3 : 0.34, scale: sc * (0.85 + rng() * 0.35), label }); taken.push([x, y]); k++;
    }
    return k;
  }
  function fellPockets(m, sx, sy) {
    if (typeof HORIZON20 === 'undefined' || !HORIZON20.reach) return;
    for (let pass = 0; pass < 10; pass++) {
      const rc = HORIZON20.reach(m, sx, sy, sx, sy); if (!rc.stuck) return;
      for (const [x, y] of rc.stuckCells) {
        let bi = -1, bd = 1e9; m.entities.forEach((e, i) => { if (!TREE_RE.test(e.sprite || '') || e.use) return; const d = Math.hypot(e.x - x - 0.5, e.y - y - 0.5); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0 && bd < 3) m.entities.splice(bi, 1);
      }
    }
  }
  function buildHanger() {
    const m = new GameMap(HANGER, TX.hanger, HW, HH, {
      outdoor: true, floor: 't_moss', floorTextures: HANGER_FLOORS, fogDist: 14, fogColor: [26, 34, 28],
      music: 'wild', danger: 2, spawn: { x: GAP_HANGER[0] + 0.5, y: 1.6, dir: Math.PI / 2 },
    });
    const LEAVES = 1, WATER = 2, TRACK = 3, SHALLOW = 4, LEAVES2 = 6;
    m.border(Engine.textures && Engine.textures.p17p_woods ? 'p17p_woods' : 't_hedge');
    m.set(GAP_HANGER[0], 0, DOOR({ tex: 't_p20_gate', portal: { map: COMBE, x: GAP_COMBE[0] + 0.5, y: GAP_COMBE[1] - 1.4, dir: -Math.PI / 2 }, label: TX.gapOut }));
    // the ground: banks round a dell where the nest is
    m.hill(9, 32, 9, 8, 1.5); m.hill(41, 22, 8, 11, 1.9); m.hill(31, 39, 11, 4, 1.1); m.hill(42, 4, 7, 4, 1.0); m.hill(6, 6, 6, 5, 1.2);
    // leaf-litter in drifts
    const lr = seeded(5150);
    for (let y = 1; y < HH - 1; y++) for (let x = 1; x < HW - 1; x++) { const v = lr(); if (v < 0.45) m.setFloor(x, y, LEAVES); else if (v < 0.6) m.setFloor(x, y, LEAVES2); }
    const track = (pts) => { for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2; for (let k = 0; k <= n; k++) m.setFloor(Math.floor(ax + (bx - ax) * k / n), Math.floor(ay + (by - ay) * k / n), TRACK); } };
    track([[25, 1], [24, 8], [22, 14], [24, 20]]); track([[24, 20], [17, 18], [14, 17]]); track([[24, 20], [33, 14], [39, 11]]); track([[25, 23], [32, 27], [37, 30]]);
    for (let y = POOL[1]; y <= POOL[3]; y++) for (let x = POOL[0]; x <= POOL[2]; x++) m.setFloor(x, y, (x === POOL[0] || x === POOL[2] || y === POOL[1] || y === POOL[3]) ? SHALLOW : WATER);
    // the nest, the wool-tree, the ring, a stump; lambkins round the nest, hounds by the pool
    m.deco('p22_nest', NEST[0], NEST[1], { radius: 1.1, scale: 1.6, use: 'p22_nest', label: TX.nest });
    m.deco('p22_wooltree', WOOLTREE[0], WOOLTREE[1], { radius: 0.5, scale: 1.7, label: TX.woolTree });
    m.deco('p15r_ash', RING[0], RING[1], { radius: 0.3, solid: false, scale: 1.4, label: TX.ring });
    for (const [x, y] of [[39.2, 9.4], [42.0, 11.6]]) m.deco('p9_log', x, y, { radius: 0.35, scale: 0.8, label: TX.ring });
    m.deco('p9_stump', 34.5, 36.5, { radius: 0.35, scale: 0.9, label: TX.stump });
    m.deco('sign', 13.4, 20.8, { radius: 0.2, scale: 0.65, label: TX.pool });
    m.deco('footprints', 20.5, 21.5, { radius: 0.1, solid: false, scale: 0.6, label: TX.tracks });
    for (const [x, y] of [[21.5, 25.0], [27.5, 25.5], [22.5, 19.0], [28.0, 20.5]]) m.enemy('p22_lambkin', x, y);
    for (const [x, y] of [[11.5, 22.0], [16.0, 21.5]]) m.enemy('hound', x, y);
    m.item('a_p22_droverboots', 41.2, 12.6); m.item('p22_amber', 35.2, 37.2); m.item('shard', 8.4, 13.6); m.item('tonic', 45.5, 35.5);
    // a beech hanger, thick: beech and yew, bell-ash and glass-thorn, a few old oaks
    const R = SW && SW.TX && SW.TX.reach ? SW.TX.reach : {}, TT = SW && SW.TX && SW.TX.trees ? SW.TX.trees : {};
    const avoid = (cx, cy, x, y) => Math.hypot(x - NEST[0], y - NEST[1]) < 4 || Math.hypot(x - WOOLTREE[0], y - WOOLTREE[1]) < 2 || Math.hypot(x - RING[0], y - RING[1]) < 3 || Math.hypot(x - GAP_HANGER[0] - 0.5, y) < 3.5 || (cx >= POOL[0] - 1 && cx <= POOL[2] + 1 && cy >= POOL[1] - 1 && cy <= POOL[3] + 1);
    const KINDS = [['p22_beech', 2.3, TT.beech], ['p22_beech', 2.6, TT.beech], ['p22_beech', 2.1, TT.beech], ['p22_yew', 1.7, TT.yew], ['p22_bellash', 2.1, R.bellash], ['p22_glassthorn', 1.2, R.glassthorn], ['oak', 2.2, undefined]];
    // the walkable wood, laid out first: the rides, glades where a slow noise is low, the ground round every landmark,
    // and deer-paths from the rides to everything worth finding. Trees go everywhere else, close, and none may block
    // a walkable cell (HORIZON20's rule: a trunk shuts the cells within its radius + 0.24), so the wood is thick and
    // the way through it is never cut.
    const walk = new Uint8Array(HW * HH), mark = (x, y) => { if (x > 0 && y > 0 && x < HW - 1 && y < HH - 1) walk[y * HW + x] = 1; };
    for (let y = 1; y < HH - 1; y++) for (let x = 1; x < HW - 1; x++) if (m.floorCells[y * HW + x] === TRACK) mark(x, y);
    const nr = seeded(5154), NS = 5, gw = Math.ceil(HW / NS) + 2, grid = []; for (let i = 0; i < gw * (Math.ceil(HH / NS) + 2); i++) grid.push(nr());
    const sm = (t) => t * t * (3 - 2 * t);
    const noise = (x, y) => { const gx = x / NS, gy = y / NS, ix = Math.floor(gx), iy = Math.floor(gy), fx = sm(gx - ix), fy = sm(gy - iy), g = (a, b) => grid[(iy + b) * gw + ix + a]; return (g(0, 0) * (1 - fx) + g(1, 0) * fx) * (1 - fy) + (g(0, 1) * (1 - fx) + g(1, 1) * fx) * fy; };
    for (let y = 1; y < HH - 1; y++) for (let x = 1; x < HW - 1; x++) if (noise(x + 0.5, y + 0.5) < 0.3 || avoid(x, y, x + 0.5, y + 0.5)) mark(x, y);
    const SPOTS = [NEST, WOOLTREE, RING, [34.5, 36.5], [13.4, 20.8], [8.4, 13.6], [41.2, 12.6], [35.2, 37.2], [45.5, 35.5]];
    for (const e of m.entities) if (e.kind === 'enemy') SPOTS.push([e.x, e.y]);
    const trackCells = []; for (let i = 0; i < HW * HH; i++) if (m.floorCells[i] === TRACK) trackCells.push([i % HW, (i / HW) | 0]);
    for (const [px, py] of SPOTS) {
      let x = Math.floor(px), y = Math.floor(py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(x + dx, y + dy);
      let best = null, bd = 1e9; for (const [tx, ty] of trackCells) { const d = Math.abs(tx - x) + Math.abs(ty - y); if (d < bd) { bd = d; best = [tx, ty]; } }
      if (!best) continue;
      while (x !== best[0]) { x += Math.sign(best[0] - x); mark(x, y); }         // an L-shaped deer-path: 4-connected
      while (y !== best[1]) { y += Math.sign(best[1] - y); mark(x, y); }
    }
    const shuts = (x, y, r) => { for (let cy = Math.floor(y - r); cy <= Math.floor(y + r); cy++) for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) if (cx >= 0 && cy >= 0 && cx < HW && cy < HH && walk[cy * HW + cx] && Math.hypot(cx + 0.5 - x, cy + 0.5 - y) < r) return true; return false; };
    const avoidWalk = (cx, cy, x, y) => avoid(cx, cy, x, y) || shuts(x, y, 0.34 + 0.26);
    // the rides first, so they are lined; then the wood, close-set
    const rides = trackCells.map(([x, y]) => [x + 0.5, y + 0.5]);
    const byRide = (r) => { const [tx, ty] = rides[(r() * rides.length) | 0], a = r() * Math.PI * 2, d = 0.95 + r() * 0.7; return [tx + Math.cos(a) * d, ty + Math.sin(a) * d]; };
    stats.trees = plantTrees(m, KINDS, avoidWalk, byRide, rides.length * 4, 1.15, seeded(5152));
    stats.trees += plantTrees(m, KINDS, avoidWalk, null, 4000, 1.1, seeded(5151));
    m._p22walk = walk;
    fellPockets(m, GAP_HANGER[0], 1);
    stats.trees = m.entities.filter((e) => TREE_RE.test(e.sprite || '')).length;
    m.baseCount = m.entities.length;
    return m;
  }
  const hangerZone = (m, x, y) => { const f = m.floorCells[y * m.w + x]; if (f === 2 || f === 3) return null; let bank = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.floorCells[(y + dy) * m.w + x + dx] === 2 || m.floorCells[(y + dy) * m.w + x + dx] === 4) bank = true; return bank ? 'bank' : 'wood'; };

  // ================================================================ Ewe Barrow
  function buildBarrow() {
    const m = new GameMap(BARROW, TX.barrow, BW, BH, { floor: 't_flag', ceil: 'c_rock', fogDist: 8, ambient: 0.05, fogColor: [4, 4, 6], music: 'dungeon', danger: 3, spawn: { x: BW - 2.6, y: 6.5, dir: Math.PI } });
    m.ceilZ = 2.1;                                                         // a tall sarsen gallery: room for what walks in it
    const wall = Engine.textures && Engine.textures.t_p22_sarsenwall ? 't_p22_sarsenwall' : 't_stone';
    for (let i = 0; i < BW * BH; i++) m.cells[i] = WALL(wall);
    m.clear(7, 5, BW - 2, 7);                                              // the passage
    m.clear(1, 2, 7, 10);                                                  // the last chamber
    for (const [x0, y0, x1, y1, ox, oy] of [[29, 1, 33, 3, 30, 4], [29, 9, 33, 11, 31, 8], [18, 1, 22, 3, 19, 4], [18, 9, 22, 11, 20, 8]]) { m.clear(x0, y0, x1, y1); m.clear(ox, oy, ox + 1, oy); }
    m.set(BW - 1, 6, DOOR({ portal: { map: COMBE, x: SARSEN[0] + 1.9, y: SARSEN[1] - 1.5, dir: -Math.PI / 2 }, label: TX.barrowOut }));
    // traps (js/game.js TRAP_TYPES): a barbed tripwire, a net, an alarm-bell
    const trap = (type, x, y, id) => m.deco(TRAP_TYPES[type].sprite, x, y, { solid: false, scale: type === 'alarm' ? 0.35 : 0.45, use: 'trap', trapType: type, trapId: 'p22b' + id, label: TRAP_TYPES[type].name + ' — inspect to disarm', glow: 0.35 });
    if (typeof TRAP_TYPES !== 'undefined') { trap('tripwire', 35.5, 6.5, 1); trap('net', 25.5, 5.6, 2); trap('alarm', 13.5, 7.4, 3); trap('tripwire', 8.5, 5.5, 4); }
    // lantern-bells grown through the cracks: the only light down here
    for (const [x, y] of [[31.0, 1.6], [19.4, 10.5], [3.0, 2.8], [5.6, 9.4], [26.0, 7.3], [36.2, 5.3], [12.0, 5.3]]) m.deco('p22_lanternbell', x, y, { radius: 0.1, solid: false, scale: 0.5, lightCol: [18, 40, 70], label: SW && SW.TX && SW.TX.reach ? SW.TX.reach.lanternbell : '' });
    // the dead's things, the barrow's keepers
    m.item('p22_amber', 31.5, 2.0); m.item('a_p22_barrowhelm', 32.6, 2.6);
    m.item('p22_torc', 31.0, 10.4);
    m.item('w_p22_leafblade', 20.0, 2.0);
    m.item('p22_lunula', 21.0, 10.4); m.item('w_p22_shears', 18.8, 10.0);
    m.item('tonic', 2.0, 9.0); m.item('tonic', 2.6, 9.4);
    for (const [x, y] of [[29.8, 2.2], [32.4, 1.6], [30.6, 3.0]]) m.enemy('p22_lambkin', x, y);
    for (const [x, y] of [[19.0, 10.6], [21.6, 9.6], [20.2, 11.0]]) m.enemy('p22_lambkin', x, y);
    m.enemy('p22_woolwight', 31.4, 10.2); m.enemy('p22_woolwight', 20.4, 2.2);
    m.enemy('p22_oldfleece', 4.0, 6.5);
    m.npc('p22_kitlost', 1.8, 6.5, { facing: 0, requires: 'p22h_kitbarrow' });   // shown only while he is lost down here
    m.baseCount = m.entities.length;
    return m;
  }

  function hookCombe(cm) {
    cm.set(GAP_COMBE[0], GAP_COMBE[1], DOOR({ tex: 't_p20_gate', portal: { map: HANGER, x: GAP_HANGER[0] + 0.5, y: 1.6, dir: Math.PI / 2 }, label: TX.gapIn }));
    // the way to the gap and to the barrow's door stays clear of trees
    for (let i = cm.entities.length - 1; i >= 0; i--) { const e = cm.entities[i]; if (TREE_RE.test(e.sprite || '') && !e.use && (Math.hypot(e.x - GAP_COMBE[0] - 0.5, e.y - GAP_COMBE[1]) < 2.4 || Math.hypot(e.x - SARSEN[0] - 1.9, e.y - SARSEN[1] + 1.5) < 1.6)) cm.entities.splice(i, 1); }
    const s = cm.entities.find((e) => e.sprite === 'p22_sarsen'); if (s) s.use = 'p22_sarsen';
    fellPockets(cm, SW ? SW.STILE[0] : 34, 1);
    // flora.js has already laid the combe's grass (transient, and only when Grass is on): the saved, positional part of
    // the list is everything before it, so the tufts go back after the count
    const tufts = []; for (let i = cm.entities.length - 1; i >= 0; i--) if (cm.entities[i] && cm.entities[i]._flora) tufts.unshift(cm.entities.splice(i, 1)[0]);
    cm.baseCount = cm.entities.length;
    for (const t of tufts) cm.entities.push(t);
  }

  // ================================================================ quests
  const barrowOpen = () => !!(SW && SW.scourCount() >= 6 && SW.litCount() >= 3);
  const woolStage = () => flag('wool', 3), kitStage = () => flag('kit', 5);
  const NPC_DEFS = {
    p22_kitlost: { name: S('Kit Farrant'), sprite: 'p22_kit', portrait: 'pim', tier: 'low', scale: 0.74,
      greet: { polite: TX.kit.lost, normal: TX.kit.lost, blunt: TX.kit.lost }, topics: {}, quest: () => kitLostQuest() },
  };
  // Leaving the Reach closes the three that are begun and unfinished, once each (R1).
  const leftReach = () => hasG() && !!(G.flags.greening || G.flags.escaped || G.flags.part3 || G.flags.part4);
  function closeAtLeaving() {
    if (!leftReach()) return;
    const w = flag('wool', 3), k = flag('kit', 5);
    const close = (key, line) => { if (flag(key)) return; setFlag(key, 1); journal('side', line); };
    if (flag('heard') && !flag('boss') && k < 4) close('hunt_closed', TX.huntClosed);
    if (w >= 1 && w < 3) close('wool_closed', TX.woolClosed);
    if (k >= 2 && k < 5) close('kit_closed', k === 4 ? TX.kitFoundClosed : TX.kitLostClosed);
  }
  function kitLostQuest() {
    const k = kitStage();
    if (k >= 1 && k <= 3) {
      const boss = G.maps[BARROW] && G.maps[BARROW].entities.find((e) => e.type === 'p22_oldfleece');
      if (boss && !boss.dead) return { text: TX.kit.lost, journal: null };
      setFlag('kit', 4, 5); syncAll();
      return { text: TX.kit.safe, journal: ['side', TX.foundJournal] };
    }
    return { text: TX.kit.safe, journal: null };
  }
  function wrapQuest(id, mine) {
    const n = typeof NPCS !== 'undefined' && NPCS[id]; if (!n || n._p22h) return;
    const orig = n.quest; n._p22h = true;
    n.quest = function (g) { let r = null; try { r = mine(g); } catch (e) { warnOnce('quest ' + id, e); } return r || (orig ? orig.apply(this, arguments) : null); };
  }
  function installQuests() {
    if (typeof NPCS === 'undefined') return;
    for (const id in NPC_DEFS) if (!NPCS[id]) NPCS[id] = NPC_DEFS[id];
    wrapQuest('p22_gideon', () => {
      if (woolStage() === 0 && (flag('heard') || (SW && SW.flockStage() >= 1))) { setFlag('wool', 1, 3); return { text: TX.gideon.wood, journal: ['side', TX.woolJournal] }; }
      return null;
    });
    wrapQuest('p22_absalom', () => {
      if (woolStage() >= 1 && !flag('absw')) { setFlag('absw', 1); return { text: TX.absalom.wool, journal: null }; }
      if (SW && SW.fireStage() >= 2 && !flag('absb')) { setFlag('absb', 1); return { text: TX.absalom.barrow, journal: null }; }
      return null;
    });
    wrapQuest('p22_tamar', () => {
      const k = kitStage();
      if (k === 1) { setFlag('kit', 2, 5); return { text: TX.tamar.lost, journal: ['side', TX.lostJournal] }; }
      if (k === 2 || k === 3) return { text: TX.tamar.lostWait, journal: null };
      if (k === 4) {
        setFlag('kit', 5, 5);
        try { if (G.has('p22_kitcap')) G.take('p22_kitcap'); if (!G.player.weapons.includes('p22_crook') && !G.has('w_p22_crook')) G.give('w_p22_crook'); G.player.gold += 50; } catch (e) { warnOnce('reward', e); }
        syncAll();
        return { text: TX.tamar.home, journal: ['side', TX.homeJournal] };
      }
      if (woolStage() === 2 && G.has('p22_hank')) {
        setFlag('wool', 3, 3);
        try { G.take('p22_hank'); if (!G.has('p22_campkit')) G.give('p22_campkit'); if (!G.has('p22_line')) G.give('p22_line'); G.player.gold += 30; } catch (e) { warnOnce('reward', e); }
        return { text: TX.tamar.wool + ' ' + TX.tamar.woolThanks, journal: ['side', TX.woolDone] };
      }
      return null;
    });
  }
  // Kit goes missing: the first night in Wethercombe after the wool is known and the barrow can open
  function lambingCheck() {
    if (kitStage() === 0 && woolStage() >= 3 && barrowOpen() && night() && G.mapId === COMBE) { setFlag('kit', 1, 5); say(TX.hunt.first, 'warn', 5000); syncAll(); }
  }
  function useNest(e) {
    const k = kitStage();
    if (k >= 1 && k <= 2 && !G.has('p22_kitcap')) { G.give('p22_kitcap'); setFlag('kit', 3, 5); say(TX.cap, 'warn', 6000); journal('side', TX.capJournal); return true; }
    if (woolStage() === 1 && !G.has('p22_hank')) { G.give('p22_hank'); setFlag('wool', 2, 3); say(TX.nestEmpty, '', 5000); journal('side', TX.woolFound); return true; }
    say(woolStage() ? TX.nestEmpty : TX.nest, '', 5000);
    return true;
  }
  function useSarsen(e) {
    if (!barrowOpen()) { say(TX.sarsenShut, '', 6500); return true; }
    try { G.state = 'play'; transfer({ map: BARROW, x: BW - 2.6, y: 6.5, dir: Math.PI }); } catch (x) { warnOnce('barrow', x); }
    return true;
  }

  // ================================================================ the hunt by night
  const HUNT_MAX = { [COMBE]: 1, [DOWNS]: 1, [HANGER]: 2 };
  const H = { spawnT: 6, bleatT: 8, lightSaid: 0, dawnSaid: false, fish: { st: 'idle', t: 0, wait: 0, x: 0, y: 0, loud: 0 } };
  const LIGHT_SPRITES = new Set(['lamp', 'campfire', 'hearth', 'brazier', 'torch', 'p22_beacon_lit']);
  function lightsHere() {
    const out = [];
    for (const e of G.ents) { if (!e || e.hidden || e.dead || e.kind === 'enemy') continue; if (e.lightCol || LIGHT_SPRITES.has(e.sprite)) out.push([e.x, e.y, e.sprite === 'campfire' || e.sprite === 'p22_beacon_lit' ? 6 : 4.5]); }
    return out;
  }
  const hunters = () => G.ents.filter((e) => e && e._p22h === 'hunt');
  function spawnHunter(lights) {
    const c = Engine.cam, m = G.map;
    for (let i = 0; i < 24; i++) {
      const a = prand() * Math.PI * 2, d = 11 + prand() * 6, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      if (x < 1.5 || y < 1.5 || x > m.w - 1.5 || y > m.h - 1.5) continue;
      if (typeof solidAt === 'function' && solidAt(x, y)) continue;
      if (m._p22walk && !m._p22walk[Math.floor(y) * m.w + Math.floor(x)]) continue;   // never inside a thicket
      if (lights.some(([lx, ly, lr]) => Math.hypot(x - lx, y - ly) < lr + 2)) continue;
      const e = hydrate({ kind: 'enemy', type: 'p22_woolwight', x, y });
      e.transient = true; e._p22h = 'hunt'; e.state = 'chase'; e.alertT = 8;
      G.ents.push(e); stats.spawned++;
      if (!flag('heard')) { setFlag('heard', 1); say(TX.hunt.first, 'warn', 6000); journal('side', TX.hunt.journal); }
      return e;
    }
    return null;
  }
  function woolBleat(x, y, vol, low) {
    stats.bleats++;
    const ok = (() => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } })();
    if (!ok) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, c = Engine.cam, d = Math.hypot(x - c.x, y - c.y), g0 = vol * Math.max(0.04, 1 - d / 22) * 0.25;
      const g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 2.2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + 0.12); g.gain.setValueAtTime(g0, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      const base = (low ? 140 : 210) * (0.95 + prand() * 0.1);
      for (const k of [1, 1.013, 0.497]) {                                            // a ewe's bleat, doubled, slightly wrong, with something under it
        const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(base * k, t); o.frequency.linearRampToValueAtTime(base * k * 0.82, t + 1.4);
        lfo.frequency.value = 5 + prand() * 2; lg.gain.value = base * 0.05; lfo.connect(lg); lg.connect(o.frequency);
        o.connect(f); o.start(t); lfo.start(t); o.stop(t + 1.55); lfo.stop(t + 1.55);
      }
      let out = g; f.connect(g);
      if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(), rel = Math.atan2(y - c.y, x - c.x) - c.dir; pn.pan.value = Math.max(-0.95, Math.min(0.95, Math.sin(rel))); g.connect(pn); out = pn; }
      out.connect(Audio_.sfxBus);
    } catch (e) { warnOnce('bleat', e); }
  }
  function huntTick(dt) {
    const max = G.map && G.map.outdoor ? (HUNT_MAX[G.mapId] || 0) : 0;
    if (!max) return;   // hunters live only on the hunt maps (transient: they never follow you off them)
    const list = hunters(), c = Engine.cam;
    stats.hunters = list.length;
    for (const e of list) if (e.dead && !e._p22said) { e._p22said = true; say(TX.hunt.kill, 'good', 4000); }
    const live = list.filter((e) => !e.dead);
    H.lightT = (H.lightT || 0) - dt;
    if (H.lightT <= 0 || !H.lights) { H.lights = lightsHere(); H.lightT = 0.5; }
    const lights = H.lights;
    if (night()) {
      H.dawnSaid = false;
      H.spawnT -= dt;
      if (H.spawnT <= 0) { H.spawnT = 18 + prand() * 22; if (live.length < max && prand() < 0.65) spawnHunter(lights); }
      for (const e of live) {
        // it hunts: it keeps your trail while you are out of the light
        const d = Math.hypot(c.x - e.x, c.y - e.y), safe = lights.some(([lx, ly, lr]) => Math.hypot(c.x - lx, c.y - ly) < lr - 0.5);
        const near = lights.find(([lx, ly, lr]) => Math.hypot(e.x - lx, e.y - ly) < lr + 1.2);
        if (near) {
          // the light: it backs out of it, and if you stand in the light it waits at its edge
          const ax = e.x - near[0], ay = e.y - near[1], al = Math.hypot(ax, ay) || 1;
          if (typeof moveWithSlide === 'function') moveWithSlide(e, ax / al * 2.4 * dt, ay / al * 2.4 * dt, e);
          e.state = 'idle'; e.alertT = 0; stats.kept++;
          if (G.time - H.lightSaid > 25 && d < 12) { H.lightSaid = G.time; say(TX.hunt.light, 'warn', 4000); }
        } else if (safe && d < 7.5) { e.state = 'idle'; e.alertT = 0; }
        else if (d < 26) { e.state = 'chase'; e.alertT = Math.max(e.alertT || 0, 4); }
      }
      H.bleatT -= dt;
      if (H.bleatT <= 0 && live.length) {
        H.bleatT = 6 + prand() * 9;
        const e = live[(prand() * live.length) | 0], decoy = prand() < 0.35;
        const bx = decoy ? c.x + Math.cos(prand() * 6.28) * 10 : e.x, by = decoy ? c.y + Math.sin(prand() * 6.28) * 10 : e.y;
        if (decoy) stats.decoys++;
        woolBleat(bx, by, 1, false);
        const d = Math.hypot(c.x - e.x, c.y - e.y), L = d < 8 ? TX.hunt.near : TX.hunt.far;
        if (prand() < 0.45) say(L[(prand() * L.length) | 0], 'warn', 3500);
      }
    } else if (live.length) {
      // dawn: back into the wood
      if (!H.dawnSaid) { H.dawnSaid = true; say(TX.hunt.dawn, '', 4000); }
      for (const e of live) {
        const ax = e.x - c.x, ay = e.y - c.y, al = Math.hypot(ax, ay) || 1; e.state = 'idle';
        if (typeof moveWithSlide === 'function') moveWithSlide(e, ax / al * 2.6 * dt, ay / al * 2.6 * dt, e);
        e._gone = (e._gone || 0) + dt;
        if (al > 13 || e._gone > 6) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); stats.fled++; }
      }
    }
  }
  function bossTick() {
    if (G.mapId !== BARROW || flag('boss')) return;
    const b = G.ents.find((e) => e && e.type === 'p22_oldfleece');
    if (b && b.dead) { setFlag('boss', 1); say(TX.boss, 'good', 6000); }
  }

  // ================================================================ camp and fishing, anywhere
  const NO_CAMP = new Set(['oakhaven', 'whispergrove', 'cantabile_harbour', 'p16k_kestrel_deck', 'arena', 'watchhouse']);
  const campHere = () => hasG() && typeof G.flags.p22c_map === 'string' && G.maps[G.flags.p22c_map] && G.flags.p22c_map;
  function syncCamp(m) {
    if (!m || !Array.isArray(m.entities)) return;
    for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p22c) m.entities.splice(i, 1);
    if (campHere() !== m.id) return;
    const x = num(G.flags.p22c_x, 10, m.w * 10 - 10, 0) / 10, y = num(G.flags.p22c_y, 10, m.h * 10 - 10, 0) / 10;
    if (!x || !y) return;
    m.entities.push({ kind: 'deco', sprite: 'campfire', x, y, solid: true, radius: 0.3, scale: 0.7, use: 'campfire', transient: true, _p22c: 'fire', label: TX.camp.menu });
    m.entities.push({ kind: 'deco', sprite: 'p22_bedroll', x: x + 0.95, y: y + 0.45, solid: false, radius: 0.2, scale: 0.3, use: 'p22_bedroll', transient: true, _p22c: 'bed', label: TX.camp.menu });
  }
  function pitchCamp() {
    const m = G.map;
    if (!m || !m.outdoor) { say(TX.camp.notOutdoors, 'warn'); return; }
    if (NO_CAMP.has(G.mapId) || G.mapId.indexOf('mod:') === 0) { say(TX.camp.notHere, 'warn'); return; }
    const c = Engine.cam, x = c.x + Math.cos(c.dir) * 1.5, y = c.y + Math.sin(c.dir) * 1.5;
    const bad = (px, py) => (typeof solidAt === 'function' && solidAt(px, py)) || waterAt(m, px, py) || px < 1.5 || py < 1.5 || px > m.w - 1.5 || py > m.h - 1.5;
    if (bad(x, y) || bad(x + 0.95, y + 0.45)) { say(TX.camp.blocked, 'warn'); return; }
    const had = campHere();
    G.flags.p22c_map = G.mapId; G.flags.p22c_x = Math.round(x * 10); G.flags.p22c_y = Math.round(y * 10);
    if (had && had !== G.mapId && G.maps[had]) syncCamp(G.maps[had]);
    syncCamp(m);
    say(had ? TX.camp.moved : TX.camp.pitched, 'good', 5000);
    try { Audio_.sfx.door(); } catch (e) { /* silent */ }
  }
  function strikeCamp() { const id = campHere(); delete G.flags.p22c_map; delete G.flags.p22c_x; delete G.flags.p22c_y; if (id && G.maps[id]) syncCamp(G.maps[id]); say(TX.camp.struck, '', 3500); }
  function campMenu(fire, origUse) {
    const ch = [{ t: TX.camp.rest, f: () => restAtCamp() }];
    ch.push({ t: TX.camp.roast, f: () => { const r = ROAST.find(([q]) => G.has(q)); if (!r) { say(TX.camp.nothing); return; } G.take(r[0]); G.give(r[1]); say(fmt(TX.camp.roasted, ITEMS[r[0]].name.toLowerCase()), 'good', 4000); } });
    if (origUse) ch.push({ t: TX.camp.cook, f: () => { try { origUse(fire); } catch (e) { warnOnce('cook', e); } } });
    if (G.has('p22_line') && waterNear()) ch.push({ t: TX.camp.fish, f: () => startFish() });
    ch.push({ t: TX.camp.strike, f: () => strikeCamp() });
    ch.push({ t: TX.camp.leave });
    showEvent(TX.camp.menu, TX.camp.menuBody, ch);
  }
  function restAtCamp() {
    // the same rules as the game's own rest (js/game.js renderRest): not while something hunts you, not on a clock
    if (G.escapeTimer > 0 || G.boreHold > 0) { say('There is no time to rest. Not now.', 'bad', 2500); return; }
    if (G.ents.some((e) => e.kind === 'enemy' && !e.dead && !e.hidden && e.state === 'chase' && Math.hypot(e.x - Engine.cam.x, e.y - Engine.cam.y) < 12)) { say('You cannot rest with enemies nearby.', 'bad', 2500); return; }
    const p = G.player, region = !!HUNT_MAX[G.mapId], wasNight = night();
    try { passHours(8); } catch (e) { /* time stands */ }
    p.hp = p.hpMax; p.voice = p.voiceMax; p.fat = p.fatMax;
    try { if (typeof needsOn === 'function' && needsOn()) p.sleep = 100; } catch (e) { /* none */ }
    say(region && wasNight ? TX.camp.slept : TX.camp.sleptQuiet, 'good', 7000);
  }
  const waterAt = (m, x, y) => { const cx = Math.floor(x), cy = Math.floor(y); if (!m.floorCells || !m.floorTextures) return /water|shallow/.test(m.floor || ''); return /water|shallow|flume/i.test(m.floorTextures[m.floorCells[cy * m.w + cx]] || ''); };
  function waterNear() {
    const m = G.map, c = Engine.cam; if (!m) return false;
    for (let dy = -2.5; dy <= 2.5; dy += 0.5) for (let dx = -2.5; dx <= 2.5; dx += 0.5) { const x = c.x + dx, y = c.y + dy; if (x < 0 || y < 0 || x >= m.w || y >= m.h || Math.hypot(dx, dy) > 2.6) continue; if (waterAt(m, x, y)) return true; }
    return false;
  }
  function startFish() {
    const F = H.fish;
    if (F.st === 'bite') { haul(); return; }
    if (F.st === 'wait') { say(TX.fish.still, '', 2200); return; }
    if (!waterNear()) { say(TX.fish.none, 'warn', 3000); return; }
    if ((Number(G.noise) || 0) > 2.6) { say(TX.fish.loud, 'warn', 3000); return; }
    F.st = 'wait'; F.t = 0; F.loud = 0; F.x = Engine.cam.x; F.y = Engine.cam.y; F.wait = 3 + prand() * 6; stats.casts++;
    say(TX.fish.cast, '', 3000);
    try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
  }
  function haul() {
    const F = H.fish; F.st = 'idle'; F.t = 0;
    const table = night() ? [['p22_glasseel', 25], ['p22_trout', 40], ['p22_perch', 25], ['p22_boot', 10]] : [['p22_trout', 50], ['p22_perch', 38], ['p22_boot', 12]];
    let t = prand() * table.reduce((a, b) => a + b[1], 0), id = table[0][0];
    for (const [k, w] of table) { t -= w; if (t <= 0) { id = k; break; } }
    G.give(id); stats.catches++;
    say(fmt(TX.fish.caught, ITEMS[id].name.toLowerCase().replace(/^(?!a |an )/, (s) => /^[aeiou]/.test(ITEMS[id].name.toLowerCase()) ? 'an ' : 'a ')), 'good', 4000);
    try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
  }
  function fishTick(dt) {
    const F = H.fish; if (F.st === 'idle') return;
    if (!G.map || G.state === 'dead') { F.st = 'idle'; return; }
    if (G.state !== 'play') return;
    if (Math.hypot(Engine.cam.x - F.x, Engine.cam.y - F.y) > 1.2) { F.st = 'idle'; say(TX.fish.away, '', 3000); return; }
    F.t += dt;
    if (F.st === 'wait') {
      if ((Number(G.noise) || 0) > 3) { F.loud += dt; if (F.loud > 1.5) { F.st = 'idle'; say(TX.fish.startled, 'warn', 3500); return; } }
      if (F.t >= F.wait) { F.st = 'bite'; F.t = 0; say(TX.fish.bite, 'warn', 2400); try { Audio_.sfx.ui(); } catch (e) { /* silent */ } }
    } else if (F.st === 'bite' && F.t > 1.8) { F.st = 'idle'; say(TX.fish.missed, '', 3000); }
  }

  // ================================================================ syncing a map as it loads
  function syncSarsen(m) {
    const s = m.entities.find((e) => e && e.use === 'p22_sarsen'); if (!s) return;
    const open = barrowOpen(); s.sprite = open ? 'p22_sarsen_open' : 'p22_sarsen'; s.label = open ? TX.sarsenOpen : TX.sarsenShut;
  }
  function syncKit() {
    const k = kitStage(), lost = k >= 1 && k <= 3;
    const fold = G.maps[COMBE] && G.maps[COMBE].entities.find((e) => e.id === 'p22_kit'); if (fold) fold.hidden = lost;
    const bar = G.maps[BARROW] && G.maps[BARROW].entities.find((e) => e.id === 'p22_kitlost'); if (lost) G.flags.p22h_kitbarrow = 1; else delete G.flags.p22h_kitbarrow; if (bar) bar.hidden = !lost;
  }
  function syncAll() { if (!hasG()) return; syncKit(); if (G.map) { if (G.mapId === COMBE) syncSarsen(G.map); } }
  function syncMap(id) {
    const m = G.maps[id]; if (!m) return;
    for (const mid of [COMBE, DOWNS, HANGER]) { const mm = G.maps[mid]; if (mm) for (let i = mm.entities.length - 1; i >= 0; i--) if (mm.entities[i] && mm.entities[i]._p22h === 'hunt') mm.entities.splice(i, 1); }
    H.spawnT = 4 + prand() * 6; H.fish.st = 'idle'; H.lights = null;
    if (id === COMBE) syncSarsen(m);
    if (id === HANGER && SW && SW.addLush) { const before = m.entities.length; SW.addLush(m, hangerZone, 1700, 5152); stats.lush = Math.max(stats.lush, m.entities.length - before); }
    syncKit();
    syncCamp(m);
    lambingCheck();
  }

  // ================================================================ wiring
  function installShops() {
    if (typeof NPCS === 'undefined' || typeof ITEMS === 'undefined') return;
    const add = (id, items) => { const n = NPCS[id]; if (!n) return; if (!Array.isArray(n.shop)) n.shop = []; for (const it of items) if (ITEMS[it] && !n.shop.some((s) => s && s.item === it)) n.shop.push({ item: it }); };
    add('p22_gideon', ['p22_campkit', 'p22_line', 'a_p22_droverboots']); add('p22_tamar', ['p22_line']);
    add('vane', ['p22_campkit']); add('p17c_sloe', ['p22_line', 'p22_campkit']); add('hob', ['a_p22_droverboots']);
  }
  function tick(dt) {
    if (!hasG() || !G.map) return;
    if (G.state === 'play') { huntTick(dt); bossTick(); lambingCheck(); }
    fishTick(dt);
  }
  function wire() {
    try { paintArt(); } catch (e) { warnOnce('art', e); }
    installCatalog(); installQuests(); installShops();
    try { installPixelIcons(); } catch (e) { warnOnce('pixel icons', e); }
    try { if (typeof LANDMARKS !== 'undefined' && LANDMARKS[COMBE] && !LANDMARKS[HANGER]) LANDMARKS[HANGER] = LANDMARKS[COMBE].map((l) => Object.assign({}, l, { h: l.h * 0.7 })); } catch (e) { /* none */ }
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) { SCREENS.FAMILY[HANGER] = 'woods'; SCREENS.FAMILY[BARROW] = 'crypt'; } } catch (e) { /* no cards */ }
    try { if (typeof FLORA !== 'undefined' && FLORA.PLANS && !FLORA.PLANS[HANGER]) FLORA.PLANS[HANGER] = { grass: 120, reed: 30 }; } catch (e) { /* no grass */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { if (maps[COMBE] && !maps[HANGER]) { hookCombe(maps[COMBE]); maps[HANGER] = buildHanger(); maps[BARROW] = buildBarrow(); if (typeof FLORA !== 'undefined' && FLORA.place) FLORA.place({ [HANGER]: maps[HANGER] }); } } catch (e) { warnOnce('maps', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _l = loadMap;
      loadMap = function (id) { const r = _l.apply(this, arguments); try { closeAtLeaving(); } catch (e) { warnOnce('close', e); } try { syncMap(id); } catch (e) { warnOnce('load', e); } return r; };
    }
    if (typeof update === 'function') {
      const _u = update;
      update = function (dt) { const r = _u.apply(this, arguments); try { tick(Math.min(0.1, Number(dt) || 0)); } catch (e) { warnOnce('tick', e); } return r; };
    }
    if (typeof useDeco === 'function') {
      const _d = useDeco;
      useDeco = function (e) {
        try {
          if (e && e.use === 'p22_nest' && useNest(e)) return;
          if (e && e.use === 'p22_sarsen' && useSarsen(e)) return;
          if (e && (e._p22c === 'fire' || e.use === 'p22_bedroll')) { const fire = e._p22c === 'fire' ? e : G.ents.find((q) => q && q._p22c === 'fire'); campMenu(fire, fire ? () => _d.call(this, fire) : null); return; }
        } catch (x) { warnOnce('use', x); }
        return _d.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _i = useItem;
      useItem = function (slot) {
        try {
          const it = slot && ITEMS[slot.id];
          if (it && it.use === 'p22_camp') { try { closeModal(); } catch (e) { /* none */ } G.state = 'play'; pitchCamp(); return; }
          if (it && it.use === 'p22_fish') { try { closeModal(); } catch (e) { /* none */ } G.state = 'play'; startFish(); return; }
        } catch (x) { warnOnce('item', x); }
        return _i.apply(this, arguments);
      };
    }
    if (typeof interact === 'function') {
      const _x = interact;
      interact = function () { try { if (H.fish.st === 'bite') { haul(); return; } } catch (x) { warnOnce('strike', x); } return _x.apply(this, arguments); };
    }
  }
  wire();

  return { closeAtLeaving, COMBE, HANGER, BARROW, GAP_COMBE, GAP_HANGER, NEST, SARSEN, TX, TEXTS: LIST, stats, H, ENEMY_DEFS, WEAPON_DEFS, ARMOR_DEFS, FOOD, ROAST,
    barrowOpen, woolStage, kitStage, pitchCamp, strikeCamp, startFish, haul, waterNear, hunters, spawnHunter, lightsHere, syncMap, buildHanger, buildBarrow };
})();
if (typeof window !== 'undefined') window.HANGER22 = HANGER22;
