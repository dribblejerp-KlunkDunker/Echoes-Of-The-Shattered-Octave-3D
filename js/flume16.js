// ============================================================
//  flume16 — Phase 16 "New ground", team FLUME: "The Chlorophyll Flume".
//
//  A side area outside Oakhaven's east Hedge, before the Greening: the living aqueduct that carries a green river UPHILL.
//    * Three linked outdoor maps, registered from this module (never maps.js / data.js):
//        flume_road     The Flume Road: a path climbing beside the grown-wood channel (the height system: the path
//                       rises 2.4, the channel rises 3.6, so the water ends up above your head). The Wash is a cutting
//                       where the aqueduct over-pumps (the surge). A hollow pier under the Wash, opened by a rumour.
//        flume_landing  Stillwater Landing, the lower lock: a smugglers' wharf. Tobit Dree the lockkeeper sells the same
//                       news to six parties; Madge Tallow fences at a bad rate; Barnaby Haft's raft is chained behind the lock.
//        flume_lowrings The Low Rings: Oakhaven's flooded lower quarter. Roofs and upper floors out of green water.
//    * THE SURGE. A clock runs while you are in these maps: quiet, then a telegraph (the Flume's held vowel climbs a fifth
//      and a rumble builds), then the surge (a wall of green fills the Wash; standing in it walks you back down the road and
//      slows you; two pockets in the cutting are out of the water), then the drain. No damage, ever: only fatigue.
//    * THE HELD VOWEL. A continuous low "ohh" (174 Hz, the Growth Anchor, through two vowel formants) synthesised on
//      Audio_'s one context, panned and filtered by SPATIAL toward the nearest channel cell, audible on all three maps.
//    * FOES. Briar-sprites (new, procedural art, five poses): small spore-fauna that strip leather and boots. The game does
//      not track armour condition, so each hit instead makes a small bleed (UPG.status.bleed, ticked here, never lethal)
//      and steals fatigue. Mire-drones (parish.js) in the Low Rings; hounds on the road. RINGING TIMBER: a blow near
//      grown wood rings like a bell: noise, and every hound within hearing turns to investigate.
//    * THE LOCK OF STILLWATER (side quest): Barnaby Haft, a Timber Compact cutter, has forty iron-bough logs on a raft behind
//      the chained lower lock. Open the lock-wheel (lockpicking), or sing the Root note at it, or buy the key from Tobit.
//    * ACCESS: a door in Oakhaven's east Hedge beside the Flume's exit (a world-map waypoint too). After the Greening the
//      door is a hedge and the waypoints go; an open quest writes one closing journal line. Nothing blocks the main quest.
//
//  GAMEPLAY EFFECTS (the one table, B below):
//    surge cycle        quiet 10 s, telegraph 4 s, surge 8 s, drain 2.5 s           Wash cutting, x 24..39
//    surge in the Wash  push 3.4 u/s downhill (west), speed x0.45, fatigue -7/s     no HP loss, pockets are safe
//    briar-sprite       hp 7, 1-2 damage, bleed 4 s (0.5 hp/s, floor 1 hp), fatigue -6 per hit
//    ringing timber     +2.6 noise per blow near grown wood, wakes hounds within 18
//    fence              buys at 50 % of the shop-sell price
//    rumour             12 sovereigns; opens the hollow pier (flag p16f_tip)
//    lock quest         40 sovereigns, 60 xp, Hedge standing +3, two honey
//
//  STATE: G.flags under p16f_ only, small validated integers (see FLAGS): q quest stage (0 none, 1 taken, 2 done, 3 closed
//  by the Greening), tip (the rumour was bought), lock (the lock-wheel was opened), key (the key was bought), seen
//  (a bitmask of the maps visited), gift (a gift left in the loft), done (the reward was paid), met (the keeper has been spoken to). Anything else under the prefix is dropped on load. The surge clock, the sprite
//  bleed and the wave props are transient (never saved); the three maps are built deterministically so saved entity
//  indexes line up (baseCount set once, nothing is inserted into an old map's list).
//  SWITCHES: Options -> Graphics & access -> "Flume surges" (default on; off = the Wash never floods, the note stays
//  level) and the GFX flag flumeGlow ("Flume glow": the green light of the water; per-frame, so off in Low and Original).
//  Every invented name, place and fact is marked [PROPOSED]; all player-visible text is in TX, registered through S().
//  Art: procedural stand-ins (canvas painting, cached once). Security: no markup is built from saves or flags.
// ============================================================
'use strict';

if (typeof GFX !== 'undefined') {
  if (GFX.flumeGlow === undefined) GFX.flumeGlow = true;
  if (GFX.FX && !GFX.FX.includes('flumeGlow')) GFX.FX.push('flumeGlow');
}

const FLUME16 = (function () {
  const FP = 'p16f_';
  const KEY = 'octave.flume16.v1';
  const MAPS = ['flume_road', 'flume_landing', 'flume_lowrings'];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const cfg = { surges: true };
  function loadCfg() { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object' && typeof o.surges === 'boolean') cfg.surges = o.surges; } catch (e) { /* storage blocked: the default stands */ } }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ surges: cfg.surges })); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- balance, one table
  const B = {
    QUIET: 10, TELEGRAPH: 4, SURGE: 8, DRAIN: 2.5,   // seconds; the cycle is 24.5 s
    FIRST: 14,                                       // quiet left on arrival in the road map (a full quiet is never worse)
    PUSH: 3.4, SLOW: 0.45, FAT_DRAIN: 7,             // the surge: units/s downhill, speed factor, fatigue/s
    PITCH_LO: 174, PITCH_HI: 261,                    // the vowel: the Growth Anchor, and a fifth above it
    ZONE: { x0: 24, x1: 40, y0: 11, y1: 14 },        // the Wash: the path's three rows (cells x0 <= x < x1, y0 <= y < y1)
    POCKETS: [[30, 14], [35, 14]],                   // cells of the cutting wall cut away; out of the water
    SPRITE: { hp: 7, dmg: [1, 2], speed: 2.4, reach: 0.8, scale: 0.5, xp: 8, bleed: 4, bleedCap: 8, fat: 6 },
    BLEED_DPS: 0.5,                                  // never takes the last hit point
    RING_NOISE: 2.6, RING_HEAR: 18, RING_REACH_PAD: 0.7,
    FENCE_RATE: 0.5,
    TIP_PRICE: 12, KEY_PRICE: 25,
    REWARD: { gold: 40, xp: 60, rep: 3, honey: 2, gift_xp: 15 },
  };

  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  const FLAGS = { q: [0, 3], tip: [0, 1], lock: [0, 1], key: [0, 1], seen: [0, 7], gift: [0, 1], done: [0, 1], met: [0, 1] };
  function fint(k) { const v = flags()[FP + k], r = FLAGS[k]; return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0; }
  function setf(k, v) { const r = FLAGS[k]; flags()[FP + k] = clamp(v | 0, r[0], r[1]); }
  const greening = () => { const f = flags(); return has(f, 'greening') && !!f.greening; };
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion || GFX.noFlash); } catch (e) { return false; } };
  const inMine = (id) => MAPS.indexOf(id) >= 0;
  const mapOf = (id) => (typeof G !== 'undefined' && G.maps) ? G.maps[id] : null;
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
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    gate: {
      label: S('The way along the Flume'),
      shut: S('The Hedge has grown across the sluice-arch, thick and green and ringing faintly. Whatever lay along the Flume is under the green now. Leave it with the others.'),
      back: S('The way back into Oakhaven'),
    },
    road: {
      arrive: S('The Flume leaves the Hedge by a grown-wood arch and goes uphill, green and quiet, with one note held under everything. The path goes with it.'),
      journal: S('Outside the Hedge, east of the Flume crossing, the Flume climbs. The water goes uphill in a channel of grown wood, humming one low note, and there is a path beside it. Briar-sprites in the verge; do not stand still.'),
      wall: S('The channel wall is grown, not built. Green light moves in it like sap. There is water running uphill on the other side, and the wall hums.'),
      post: S('A grown-wood stake with a ring of bark healed round it. A blow on it would ring like a bell, and the hounds would hear.'),
      sign: S('Painted on a plank in a Compact hand: THE WASH. WHEN THE NOTE CLIMBS, GET IN A POCKET. Under it, in another hand: or go back. [Timber Compact, Stillwater]'),
      pocket: S('A pocket in the cutting, deep enough for one person and a pack. The water cannot get a grip in here.'),
      briar: S('Briar in full leaf in the wrong month. It is faintly warm, and something in it breathes.'),
      knotShut: S('A great knot in the grown wood, shut tight. It does not look like a door.'),
      box: S('A smuggler\'s strongbox, wedged into the root where no surveyor would look.'),
      lamp: S('A knot of grown wood with a bead of green sap-light in it, the size of a plum. It hums, very slightly flat.'),
      end: S('The Flume goes on up over the ridge, toward the quarry, humming. There is no path to follow it. There is a view, and it is green.'),
      branch: S('A lane cut down through the hedge. Plank marks in the mud: barrows, going down.'),
      toLanding: S('The lane to Stillwater Landing'),
    },
    surge: {
      tele: S('The Flume\'s note is climbing. Something under the boards is filling.'),
      go: S('The Flume over-pumps. A wall of green comes down the Wash.'),
      push: S('The water takes your legs and walks you back down the road. It does not hurt. It does not stop.'),
      drain: S('The Wash drains away through the boards, hissing, and the note settles.'),
      pocket: S('You wedge yourself into the pocket. The green goes by at the height of your chin, and over you.'),
    },
    sprite: {
      name: S('Briar-sprite'),
      desc: S('Spore-fauna, mutated out of the verge-briar: the size of a cat, all thorn and pale little lamps. It strips leather and bootlace in under a minute, and what it opens does not close quickly.'),
      bleed: S('Thorns open your sleeve, and the cut will not close at once. You are bleeding.'),
      fat: S('The briar-sprite hangs on your boot, and your legs go heavy.'),
      hud: S('BLEEDING'),
    },
    ring: {
      ring: S('The wood rings, a bell struck in a cupboard. Somewhere in the verge, a hound lifts its head.'),
      quiet: S('The wood only knocks. Nothing is listening.'),
    },
    landing: {
      arrive: S('Stillwater Landing. A wharf of grown planking on a basin of green water, and nobody who looks up.'),
      journal: S('Stillwater Landing, at the Flume\'s lower lock: a smugglers\' wharf in a basin of green water, where Reach timber leaves for Fortis and Cantabile broadsheets come in. The lockkeeper sells the same news to anybody who asks.'),
      sign: S('A board nailed to a piling: STILLWATER. LOCK DUES PAID IN ADVANCE. LOCK DUES NOT REFUNDED. NO QUESTIONS, PLEASE, ABOUT THE BOARD.'),
      hutShut: S('The lockkeeper\'s house. The door is shut. He does his business on the porch, in the air, where he can see who is listening.'),
      storeShut: S('A cooperage with the barrel-hoops all new. The door is locked, and the lock is better than the door.'),
      raft: S('A raft of iron-bough logs, forty or so, cut and chalked for Fortis. They are lashed down, and every lashing has been oiled so it will not creak.'),
      raftGone: S('The mooring, empty. A scrape of chalk on the piling, and a ring of bark in the water.'),
      wheelShut: S('The lock-wheel, chained and padlocked to its post. The sluice behind it is grown timber, black with seep.'),
      wheelOpen: S('The lock-wheel, free of its chain. The sluice stands open on the river.'),
      road: S('The lane back up to the Flume Road'),
      rings: S('The gangway to the Low Rings'),
      ringsBack: S('The gangway back to Stillwater'),
      boat: S('A flat boat with a sail folded down to a bundle. It is named, in chalk, something that has been scrubbed out.'),
      barrels: S('Barrels, hoops new, lids nailed. Whatever is in them sloshes quietly and is not water.'),
    },
    pellam: {
      name: S('Tobit Dree, lockkeeper'),
      polite: S('Lock dues in advance, friend. Or a coin for the news. Or both. Everyone does both.'),
      normal: S('You have the look of someone who wants to know something. It is twelve sovereigns, or the tide, whichever turns first.'),
      blunt: S('Quietly. The basin carries.'),
      intro: S('Tobit Dree, lockkeeper. Before you ask: yes, I will sell you what I know, and yes, I sold the same this week to the Church\'s man, the Compact\'s, a woman from Cantabile with a very small hat, the Reeve\'s clerk, a Bores factor and a boy who did not say who he worked for. Six of you. It is not a secret if six people have it. It is a service.'),
      again: S('Back again. Is it news you want, or only my company? Company is dearer.'),
      buy: S('Buy the news. Twelve sovereigns.'),
      who: S('Who are the six?'),
      key: S('Ask about the lock-wheel key.'),
      keyBuy: S('Pay twenty-five for the key.'),
      none: S('Not today.'),
      whoText: S('The Church, the Compact, the Reeve-Moot, the quarry, a Cantabile broadsheet, and whoever is paying this week. Each of them believes they are the sixth. That is how I keep the lock oiled.'),
      broke: S('Twelve, I said, and I do not do credit. Credit is how a man ends up in the basin.'),
      tip: S('The third pier on the Flume road, the one in the Wash, is hollow. There is a knot in its south face that you would swear was a knot. Turn it. It opens at both ends, and the tunnel goes under the Wash, so the water never sees you. A man I will not name left something in the middle that he would like back, which is why he is not going himself. That is true. I only lie to the ones who haggle.'),
      tipJournal: S('Tobit Dree, the lockkeeper at Stillwater, sold me news for twelve sovereigns: the third pier in the Wash cutting is hollow. A knot in its south face turns, it opens at both ends, and the tunnel runs under the surge. Something is hidden in the middle.'),
      had: S('You have the only true thing I sell. The rest is for the other five.'),
      keyText: S('The key went to a factor from the quarry in the spring. Twenty-five sovereigns and I find another one. I have a drawer of them. Do not ask about the drawer.'),
      keyDone: S('A brass key, warm from his pocket. "The wheel will take it," he says, "and I will say I never saw you, and that will be true."'),
      keyBroke: S('Twenty-five. You are short, and I am a man who notices.'),
      keyHad: S('You have it. Use it before I remember I have another buyer.'),
    },
    madge: {
      name: S('Madge Tallow, fence'),
      polite: S('Do not tell me where it came from. I will tell you what it is worth, and it is less than you hoped.'),
      normal: S('Half. Half of what a clean shop pays, and no questions.'),
      blunt: S('Put it on the board or put it back.'),
      hello: S('Half of a clean price, and nobody asks. You can carry it to Oakhaven and ask the Hedge for the other half.'),
      thanks: [S('Gone.'), S('I never saw it.'), S('That did not happen.')],
    },
    orrin: {
      name: S('Barnaby Haft, Timber Compact cutter'),
      polite: S('Does it ring? No. Nothing rings on this wharf, that is the trouble.'),
      normal: S('Forty logs and a chained lock.'),
      blunt: S('If you are not here about the wheel, you are in the way of the wheel.'),
      intro: S('Does it ring? No. Nothing rings on this wharf, that is the trouble. Barnaby Haft, Timber Compact, cutter. Forty iron-bough logs on that raft, cut and chalked for Fortis, and the lower lock is chained. The keeper says the key went to a factor in the spring. He says it the way he says everything. I have the Compact\'s wages to show by the end of the month, and the Compact is not in a patient mood. Open the wheel for me and I will not forget it.'),
      yes: S('I will see to the lock.'),
      no: S('Not my trouble.'),
      accept: S('True enough. The wheel is on the post by the gate. Pick it, or buy a key off Tobit if you like paying twice. Or, and he drops his voice, sing it the root. Grown wood remembers one note. Not loud.'),
      declined: S('He nods, slowly, as at weather. "The lock does not mind waiting. I do."'),
      waiting: S('Is it open? No. Then I am still a man with forty logs and a debt.'),
      openFirst: S('The gate is open. Was that you? Then say it was.'),
      itWas: S('It was.'),
      done: S('He lays his hand flat on the gate as it swings, the way you touch a horse. "Sap and splinters," he says, softly. "It went." The raft comes off its chocks with no sound at all. "Take this. The Compact does not pay, so I do."'),
      after: S('The raft is in Fortis by now, or it is not. Either way, it is out of my hands, and the logs did not ring once.'),
      journalOffer: S('Barnaby Haft, a Timber Compact cutter at Stillwater Landing, has a raft of iron-bough chained behind the lower lock. The wheel will take a pick, or the Root note sung at it, or a key from Tobit Dree.'),
      journalDone: S('The lower lock at Stillwater is open and Barnaby Haft\'s raft has gone out on the Flume with forty logs. He paid me what the Compact would not.'),
      closed: S('Whatever raft went down the Flume, the Greening shut the Hedge behind it. I never learned where it fetched up.'),
      reward: S('You receive 40 sovereigns and two jars of honey.'),
    },
    hand: {
      name: S('Wharf hand'),
      polite: S('You came along the Flume road on foot? Under the Wash? Then you timed it. Good. The last man who did not is still being walked back down.'),
      normal: S('Mind the planks. They are not all as old as they look.'),
      blunt: S('Not now.'),
    },
    wife: {
      name: S('Raft-wife'),
      polite: S('My man poles the raft. The wheel has been shut since spring. The Compact blames the lock, the lock blames the keeper, the keeper blames the weather. It is a very cold way to run a river.'),
      normal: S('We are out of tea, patience and luck, in that order.'),
      blunt: S('Mind your feet near the edge.'),
    },
    rings: {
      arrive: S('The Low Rings. Roofs and upper floors stand out of green water, and the water is only knee-deep in the lanes. It is very quiet, and the quiet hums.'),
      journal: S('The Low Rings: Oakhaven\'s lower town, flooded when the Flume began to over-pump, and left. Mire-drones lie in the lanes. Some of the upper rooms are dry, and some of them have been lived in.'),
      chandler: S('A chandler\'s loft. Wicks hang from the rafters in bunches, and none has been lit in years. The shutter knocks once, and it is only the wind.'),
      counting: S('Ledger-desks bolted to the floor. The clerks left in order of rank, and tidily. Someone has been through the drawers since, and left the cashbox for being too heavy.'),
      loft: S('A loft with a stove still warm. Four bowls, rinsed and stacked. A child\'s reed hangs over the hatch, and it sounds. Whoever lives here is somewhere else, quietly, watching you.'),
      reed: S('A wind-reed hung over the hatch on its cord. It is tuned to someone small, and it sounds, softly, in a room with no wind. It is the only reed you have heard in the Low Rings.'),
      stove: S('A little iron stove, banked low. The kettle on it is warm.'),
      stoveTitle: S('The warm stove'),
      stoveGift: S('Leave something for them on the stove.'),
      stoveLeave: S('Leave it be.'),
      stoveHeld: S('You set it by the kettle and step back. Nothing moves. The reed over the hatch sounds, once, a little higher.'),
      stoveNone: S('You have nothing to leave that would be welcome. Honey, or food, would be.'),
      gift: S('I left food on the stove of a loft in the Low Rings, where somebody who never left lives, out of sight. Their reed sounds. I did not look for them.'),
      table: S('A table too low for a grown man. Four places laid, with room for a fifth that was never needed.'),
      desk: S('A clerk\'s desk, the blotter still stained from the last page. Somebody has pencilled across the corner: LEAVE THE WATER ALONE.'),
      boards: S('Boards laid roof to roof across the lane by people who needed to go on living here.'),
      sunken: S('A street, under green water. The cobbles are quite clear, and a long way down.'),
      drone: S('Something large lies in the shallows ahead, the colour of the bank.'),
      lamp: S('A lantern hung from a roof-beam, lit, and not by anyone you can see.'),
    },
    jour: {
      lockOpened: S('The lock-wheel at Stillwater is open.'),
    },
    key: {
      name: S('The Lock-Wheel Key'),
      desc: S('A heavy brass key, still warm. It fits the padlock on the lower lock\'s chain at Stillwater, and nothing else.'),
    },
    opt: {
      surges: S('Flume surges'),
      surgesHint: S('the Wash floods now and then on the Flume road: it walks you back and slows you, and never hurts'),
      glow: S('Flume glow'),
      glowHint: S('the green light of the Flume\'s water'),
    },
    gazette: S('A quantity of Reach timber has cleared the lower lock at Stillwater. The lock is recorded as having opened itself. The record is not disputed.'),
    rumour: S('The raft from Stillwater came off its chocks without a sound. The keeper says the lock opened itself, and I have never known him say anything so plainly, which is how I know it is not true.'),
    rumourNote: S('You opened the lock at Stillwater'),
  };

  // ---------------------------------------------------------------- art (procedural stand-ins)
  const rng = typeof mulberry32 === 'function' ? mulberry32 : (a) => () => (a = (a * 16807) % 2147483647) / 2147483647;
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    const id = x.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill, stroke) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); } };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  // emissive mask from a painted sprite: the pixels that give their own light (here: bright, green-dominant)
  function glowMask(name, test) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]; if (!sp || !Engine.setEmissive) return;
    const m = new Uint8Array(sp.w * sp.h); let n = 0;
    for (let i = 0; i < m.length; i++) { const p = sp.data[i], a = p >>> 24; if (a < 120) continue; const r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255; if (test(r, g, b)) { m[i] = 1; n++; } }
    if (n) Engine.setEmissive(name, m);
  }
  const brightGreen = (r, g, b) => g > 170 && g > r + 40 && g > b + 20;
  // a recoloured copy of an existing sprite (people on the wharf wear different coats)
  function tintSprite(src, dst, k) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[src]; if (!sp || Engine.sprites[dst]) return;
    const d = new Uint32Array(sp.data.length);
    for (let i = 0; i < d.length; i++) {
      const p = sp.data[i], a = p >>> 24;
      if (!a) { d[i] = p; continue; }
      const r = Math.min(255, (p & 255) * k[0]), g = Math.min(255, ((p >>> 8) & 255) * k[1]), b = Math.min(255, ((p >>> 16) & 255) * k[2]);
      d[i] = ((a << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
    }
    Engine.addSprite(dst, Object.assign({}, sp, { data: d }));
  }

  // wall textures. The aqueduct is GROWN wood (Phase 16 polish): bark-brown ribs of uneven width that wander a little,
  // fissured bark between them, the odd knot, a ragged growth collar, moss low down, and a wet lip at the top where the
  // channel water laps. The green light belongs to the water (glowHook), not to the wood. Three variants so a long wall
  // never repeats one tile; all are periodic, so they tile cleanly. Procedural stand-ins, painted once.
  const GROWN = ['p16f_grown', 'p16f_grown2', 'p16f_grown3'];
  const grownAt = (x) => GROWN[((x * 7 + (x >> 2) * 3) % 5) % 3];
  function hsh(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, cx, cy, s) {             // value noise with cells cx by cy texels, periodic over 64
    const nx = 64 / cx, ny = 64 / cy, fx = x / cx, fy = y / cy, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const X0 = ((x0 % nx) + nx) % nx, X1 = (X0 + 1) % nx, Y0 = ((y0 % ny) + ny) % ny, Y1 = (Y0 + 1) % ny;
    const a = hsh(X0, Y0, s), b = hsh(X1, Y0, s), c = hsh(X0, Y1, s), d = hsh(X1, Y1, s), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }
  // one grown-wood tile: returns [r, g, b] per texel
  function grownTexel(seed) {
    // rib edges across the tile: uneven widths that add up to 64
    const r0 = rng(seed), edges = [0]; let acc = 0;
    while (acc < 64) { const wdt = 6 + Math.floor(r0() * 9); acc = Math.min(64, acc + wdt); edges.push(acc); }
    if (64 - edges[edges.length - 2] < 5 && edges.length > 2) edges.splice(edges.length - 2, 1);
    const knots = []; for (let i = 0; i < 2; i++) if (r0() < 0.5) knots.push([6 + r0() * 52, 8 + r0() * 44, 1.6 + r0() * 1.6]);
    const collar = 18 + Math.floor(r0() * 30);
    return (x, y) => {
      const wob = (vnoise(x, y, 64, 16, seed + 1) - 0.5) * 4;              // the ribs wander as they climb
      const xs = ((x + wob) % 64 + 64) % 64;
      let i = 1; while (i < edges.length - 1 && xs >= edges[i]) i++;
      const a = edges[i - 1], b = edges[i], t = (xs - a) / Math.max(1, b - a);
      let k = 0.55 + 0.5 * Math.sin(t * Math.PI) - 0.18 * t;              // rounded rib, lit from the left
      const grain = vnoise(x, y, 2, 16, seed + 2) * 0.22 + vnoise(x, y, 4, 32, seed + 3) * 0.18;
      k *= 0.78 + grain;
      if (t < 0.09 || t > 0.93) k *= 0.42;                                  // the fissure between two ribs
      if (vnoise(x, y, 8, 8, seed + 4) > 0.8 && (t < 0.2 || t > 0.8)) k *= 0.7;   // bark breaking open
      const cd = Math.abs(y - collar - (vnoise(x, 0, 16, 64, seed + 5) - 0.5) * 6);
      if (cd < 1.6) k *= 1.18; else if (cd < 2.8) k *= 0.7;                  // a ragged growth collar
      let r = 104 * k, g = 78 * k, bl = 50 * k;
      for (const [kx, ky, kr] of knots) {                                   // knots: dark heart, rings, a pale rim
        const dx = x - kx, dy = (y - ky) * 0.7, d = Math.sqrt(dx * dx + dy * dy);
        if (d < kr * 2.2) { const ring = 0.86 + 0.14 * Math.sin(d * 2.6); const kk = d < kr * 0.6 ? 0.45 : d > kr * 1.9 ? 1.08 : ring * 0.85; r *= kk; g *= kk; bl *= kk; }
      }
      const moss = Math.max(0, (y - 44) / 20) * vnoise(x, y, 8, 8, seed + 6);   // moss low on the wood
      if (moss > 0.25) { const m = Math.min(1, (moss - 0.25) * 2.2) * 0.55; r = r * (1 - m) + 52 * m; g = g * (1 - m) + 70 * m; bl = bl * (1 - m) + 34 * m; }
      if (y < 3) { const w = (3 - y) / 3 * 0.5; r = r * (1 - w) + 40 * w; g = g * (1 - w) + 92 * w; bl = bl * (1 - w) + 64 * w; }   // the wet lip: water light, faint
      return [r, g, bl];
    };
  }
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || !Engine.textures.t_wood) return;
    const make = (name, fn) => {
      if (Engine.textures[name]) return;
      const d = new Uint32Array(64 * 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const o = fn(x, y);
        d[y * 64 + x] = (255 << 24) | ((clamp(o[2], 0, 255) | 0) << 16) | ((clamp(o[1], 0, 255) | 0) << 8) | (clamp(o[0], 0, 255) | 0);
      }
      Engine.addTexture(name, d);
    };
    GROWN.forEach((name, i) => make(name, grownTexel(1601 + i * 37)));
    // the hidden doors: the same wood with one great knot, its rings picked out (it does not look like a door)
    const kb = grownTexel(1601);
    make('p16f_knot', (x, y) => {
      let [r, g, b] = kb(x, y);
      const dx = x - 32, dy = y - 34, d = Math.sqrt(dx * dx * 0.8 + dy * dy * 0.55);
      if (d < 19) {
        const ring = Math.sin(d * 1.15) * 0.5 + 0.5, k = d < 5 ? 0.35 : 0.62 + 0.4 * ring;
        r = r * k + 14 * ring; g = g * k + 9 * ring; b = b * k + 4 * ring;
        if (Math.abs(d - 19) < 0.9) { r *= 0.55; g *= 0.55; b *= 0.55; }
      }
      return [r, g, b];
    });
    const src = Engine.textures.t_wood;
    const make2 = (name, fn) => make(name, (x, y) => { const p = src[y * 64 + x]; return fn(x, y, p & 255, (p >>> 8) & 255, (p >>> 16) & 255); });
    // the lock gate: near-black timber, banded, with green seep running down it
    make2('p16f_gate', (x, y, r, g, b) => {
      r *= 0.36; g = g * 0.42 + 4; b *= 0.34;
      if (y % 22 < 3) { r = 38; g = 42; b = 40; }
      if ((y % 22 < 3) && (x % 16 === 4 || x % 16 === 11)) { r = 80; g = 84; b = 80; }
      const sx = (x * 7 + 3) % 17;
      if (sx < 2 && ((y + x * 3) % 29) < 22) { g += 14; r += 2; b += 6; }   // seep: wet, only a little green
      return [r, g, b];
    });
  }

  function paintProps() {
    // a ringing stake: grown wood with a healed ring of bark and a bead of green at the head
    addSprite('p16f_post', 28, 72, (x) => {
      E(x, 14, 68, 11, 3, 'rgba(0,0,0,0.35)');
      x.beginPath(); x.moveTo(8, 68); x.quadraticCurveTo(6, 40, 9, 14); x.lineTo(19, 14); x.quadraticCurveTo(22, 40, 20, 68); x.closePath(); x.fillStyle = VG(x, 14, 68, '#4a4a2c', '#2a2a1a'); x.fill();
      L(x, 12, 16, 11, 66, 'rgba(255,240,170,0.18)', 1.2); L(x, 17, 16, 18, 66, 'rgba(0,0,0,0.3)', 1);
      for (const y of [30, 44]) { x.beginPath(); x.ellipse(14, y, 8, 2.4, 0, 0, Math.PI * 2); x.strokeStyle = '#6a7a3a'; x.lineWidth = 2.2; x.stroke(); }
      E(x, 14, 12, 6, 6, '#3a4a22'); E(x, 14, 11, 3.2, 3.2, '#9cff9a'); E(x, 13, 10, 1.4, 1.4, '#eaffea');
    });
    // a sap-lamp: a knot of grown wood with a bead of green light in it
    addSprite('p16f_lamp', 32, 64, (x) => {
      E(x, 16, 60, 11, 3, 'rgba(0,0,0,0.3)');
      x.beginPath(); x.moveTo(10, 60); x.quadraticCurveTo(7, 40, 12, 26); x.lineTo(20, 26); x.quadraticCurveTo(25, 40, 22, 60); x.closePath(); x.fillStyle = VG(x, 26, 60, '#4a4a2c', '#262616'); x.fill();
      L(x, 13, 28, 12, 58, 'rgba(255,240,170,0.16)', 1);
      E(x, 16, 22, 11, 11, 'rgba(120,255,150,0.22)'); E(x, 16, 22, 8, 8, 'rgba(120,255,150,0.38)'); E(x, 16, 22, 5.4, 5.4, '#7cf29a'); E(x, 16, 22, 3, 3, '#d8ffe0'); E(x, 14.6, 20.6, 1.2, 1.2, '#ffffff');
      x.strokeStyle = '#6a8a3a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(8, 30); x.quadraticCurveTo(14, 22, 10, 14); x.stroke(); x.beginPath(); x.moveTo(24, 30); x.quadraticCurveTo(18, 22, 22, 14); x.stroke();
    });
    glowMask('p16f_lamp', brightGreen);
    // a column of the surge: translucent green water standing up, lit from within, with a foam crest; the sides feather out so
    // neighbouring columns run together into one wall
    addSprite('p16f_wave', 64, 128, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(210,255,225,0.95)'); g.addColorStop(0.08, 'rgba(120,255,170,0.9)'); g.addColorStop(0.5, 'rgba(44,170,96,0.9)'); g.addColorStop(1, 'rgba(20,100,70,0.95)');
      x.fillStyle = g; x.fillRect(0, 6, 64, 122);
      const r = rng(5);
      for (let i = 0; i < 30; i++) { const px = 6 + r() * 52, py = 10 + r() * 110; L(x, px, py, px + (r() - 0.5) * 10, py + 6 + r() * 14, 'rgba(210,255,225,0.28)', 1.2); }
      for (let i = 0; i < 9; i++) E(x, 4 + i * 7.5, 5 + ((i * 5) % 3) * 2, 5.6, 4.4, 'rgba(235,255,240,0.9)');
      x.globalCompositeOperation = 'destination-in';           // soft left and right edges
      const f = x.createLinearGradient(0, 0, 64, 0);
      f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(0.22, 'rgba(0,0,0,1)'); f.addColorStop(0.78, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = f; x.fillRect(0, 0, 64, 128);
      x.globalCompositeOperation = 'source-over';
    });
    // briar: a bush in leaf with a spore-lamp or two
    addSprite('p16f_briar', 72, 56, (x) => {
      E(x, 36, 52, 30, 4, 'rgba(0,0,0,0.3)');
      const r = rng(23);
      for (let i = 0; i < 16; i++) { const a = -0.4 - r() * 2.4, len = 18 + r() * 22; L(x, 36 + (r() - 0.5) * 16, 50, 36 + Math.cos(a) * len, 50 + Math.sin(a) * len, '#3a2e18', 2.2); }
      for (let i = 0; i < 40; i++) E(x, 10 + r() * 52, 14 + r() * 34, 4 + r() * 4, 2.4 + r() * 2.4, `rgb(${46 + (r() * 30 | 0)},${110 + (r() * 60 | 0)},${46 + (r() * 24 | 0)})`, r());
      for (let i = 0; i < 14; i++) { const px = 8 + r() * 56, py = 14 + r() * 36; L(x, px, py, px + 2 + r() * 3, py - 3 - r() * 4, '#d8d0a0', 1); }
      for (const [px, py] of [[22, 28], [50, 22]]) { E(x, px, py, 3.2, 3.2, 'rgba(170,255,190,0.5)'); E(x, px, py, 1.6, 1.6, '#e8fff0'); }
    });
    glowMask('p16f_briar', (r, g, b) => r > 200 && g > 230 && b > 220);
    // the lock-wheel: an iron wheel on a grown post, with a chain and a padlock
    addSprite('p16f_wheel', 56, 84, (x) => {
      E(x, 28, 80, 16, 3, 'rgba(0,0,0,0.35)');
      R(x, 23, 38, 10, 42, VG(x, 38, 80, '#3a3a22', '#1e1e12'));
      x.beginPath(); x.arc(28, 30, 20, 0, Math.PI * 2); x.strokeStyle = '#6a6e68'; x.lineWidth = 4; x.stroke();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.2; L(x, 28, 30, 28 + Math.cos(a) * 20, 30 + Math.sin(a) * 20, '#585c56', 3); }
      E(x, 28, 30, 5, 5, '#7a7e78');
      x.strokeStyle = '#8a8e88'; x.lineWidth = 2; for (let i = 0; i < 5; i++) x.strokeRect(24 + i * 1.5, 52 + i * 5, 6, 4);
      R(x, 23, 74, 10, 8, '#c9a45a'); R(x, 23, 74, 10, 2, '#e8cc86'); x.beginPath(); x.arc(28, 74, 4.4, Math.PI, 0); x.strokeStyle = '#c9a45a'; x.lineWidth = 2; x.stroke();
      R(x, 10, 14, 4, 3, '#4a8a5a'); R(x, 44, 46, 5, 3, '#4a8a5a');
    });
    // Barnaby's raft: forty-odd iron-bough logs, chalked, lashed
    addSprite('p16f_raft', 136, 56, (x) => {
      E(x, 68, 50, 62, 4, 'rgba(10,40,30,0.5)');
      const r = rng(31);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
        const lx = 6 + i * 14 + (row % 2) * 7, ly = 40 - row * 12;
        x.beginPath(); x.ellipse(lx + 7, ly, 8, 6, 0, 0, Math.PI * 2); x.fillStyle = VG(x, ly - 6, ly + 6, '#6a6a3a', '#3a3a1e'); x.fill();
        E(x, lx + 7, ly, 5, 3.6, '#8a8a52'); E(x, lx + 7, ly, 2.4, 1.6, '#5a5a2e');
        if (r() < 0.3) L(x, lx + 2, ly - 3, lx + 10, ly + 3, '#e8e4d0', 1.2);
      }
      L(x, 6, 30, 130, 30, '#2a2214', 2); L(x, 6, 44, 130, 44, '#2a2214', 2);
    });
    // a flat boat with a furled sail
    addSprite('p16f_boat', 112, 44, (x) => {
      E(x, 56, 40, 50, 3, 'rgba(10,40,30,0.5)');
      P(x, [[6, 22], [106, 22], [96, 38], [16, 38]], VG(x, 22, 38, '#5a4630', '#32261a'), '#1e160e');
      L(x, 10, 26, 102, 26, '#7a6040', 1.2); L(x, 56, 22, 56, 2, '#4a3826', 2.4);
      P(x, [[56, 4], [86, 20], [56, 20]], '#cfc8b0', '#6a6454');
    });
    // the Low Rings (Phase 16 polish): the ridge of a drowned house's roof standing out of the green water. Tiles in rows,
    // a ridge-beam, a chimney stub; below the waterline nothing (the street's own water shows), with a pale ripple at it.
    addSprite('p16f_sunkroof', 96, 44, (x) => {
      const wl = 36;
      P(x, [[6, wl], [48, 6], [90, wl]], VG(x, 6, wl, '#6a5a3a', '#3e3424'));
      for (let row = 0; row < 6; row++) {                                       // tile courses: scalloped lines
        const y = 10 + row * 4.6, half = (y - 6) / (wl - 6) * 42;
        for (let tx = 48 - half; tx < 48 + half - 2; tx += 5) { x.beginPath(); x.arc(tx + 2.5, y, 2.5, 0, Math.PI); x.strokeStyle = row % 2 ? '#2e2618' : '#36301e'; x.lineWidth = 1; x.stroke(); }
      }
      L(x, 48, 6, 90, wl, 'rgba(0,0,0,0.35)', 2); L(x, 48, 6, 6, wl, 'rgba(255,240,200,0.18)', 1.5);
      R(x, 44, 4, 8, 4, '#2a2216');                                             // the ridge-beam end
      R(x, 62, 6, 7, 12, '#5a4a3a'); R(x, 61, 5, 9, 2, '#3a3026');                // a chimney stub
      for (let i = 0; i < 7; i++) E(x, 10 + i * 12.5, wl + 1, 7, 1.2, 'rgba(200,235,215,0.85)');   // the ripple at the waterline
    });
    // a coil of briar-wrapped rope and a barrel are in the game already; here, a hanging lantern for the Low Rings
    addSprite('p16f_hang', 28, 56, (x) => {
      L(x, 14, 0, 14, 20, '#3a2c1e', 1.4);
      R(x, 8, 20, 12, 3, '#2a2214'); R(x, 9, 23, 10, 16, 'rgba(255,230,160,0.35)'); R(x, 8, 38, 12, 3, '#2a2214');
      E(x, 14, 31, 3.6, 5, '#fff2b0'); E(x, 14, 31, 1.6, 2.4, '#ffffff');
    });
    glowMask('p16f_hang', (r, g, b) => r > 220 && g > 220);
  }

  // Briar-sprite: a hunched cat-sized thing of thorn and bramble with pale lamps for eyes. a1 rears, a2 lashes forward.
  function paintSprite(x, w, h, pose) {
    const bob = pose === '_w1' ? -2 : pose === '_w2' ? 2 : 0;
    const lunge = pose === '_a2' ? 10 : pose === '_a1' ? -4 : 0, rear = pose === '_a1' ? -7 : pose === '_a2' ? 4 : 0;
    const leg = pose === '_w1' ? 4 : pose === '_w2' ? -4 : 0;
    const r = rng(41);
    E(x, 36, 62, 26, 3.6, 'rgba(0,0,0,0.35)');
    // thorny legs
    for (const [lx, s] of [[24, 1], [32, -1], [42, 1], [50, -1]]) { const ox = leg * s; L(x, lx, 50 + bob, lx + ox - 3, 62, '#3a2e18', 2.4); L(x, lx + ox - 3, 62, lx + ox + 2, 63, '#2a2010', 2.4); }
    // body: a knot of bramble
    E(x, 36 + lunge * 0.4, 42 + bob + rear * 0.3, 20, 14, VG(x, 28, 56, '#4a5a28', '#222a14'));
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 6 + r() * 14, px = 36 + lunge * 0.4 + Math.cos(a) * d, py = 42 + bob + rear * 0.3 + Math.sin(a) * d * 0.7;
      L(x, px, py, px + Math.cos(a) * (5 + r() * 6), py + Math.sin(a) * (5 + r() * 6), i % 3 ? '#cfc8a0' : '#6a8a38', 1.2);
    }
    for (let i = 0; i < 14; i++) E(x, 22 + lunge * 0.4 + r() * 30, 34 + bob + r() * 18, 3 + r() * 2.6, 2 + r() * 2, `rgb(${50 + (r() * 24 | 0)},${100 + (r() * 60 | 0)},${44 + (r() * 20 | 0)})`, r());
    // head: low, forward, two lamps
    const hx = 52 + lunge, hy = 36 + bob + rear;
    E(x, hx, hy, 10, 8, VG(x, hy - 8, hy + 8, '#5a6a30', '#2a3218'));
    for (let i = 0; i < 6; i++) L(x, hx - 6 + i * 2.4, hy - 6, hx - 7 + i * 3, hy - 12 - (i % 2) * 3, '#cfc8a0', 1.2);
    for (const ex of [-3.6, 3.2]) { E(x, hx + 3 + ex, hy - 1, 3.2, 3.2, 'rgba(170,255,190,0.5)'); E(x, hx + 3 + ex, hy - 1, 1.8, 1.8, '#e8fff0'); }
    const gape = pose === '_a2' ? 5 : pose === '_a1' ? 3 : 1;
    E(x, hx + 7, hy + 4, 4, gape, '#120c08');
    for (let i = 0; i < 4; i++) L(x, hx + 4 + i * 1.6, hy + 3, hx + 4.4 + i * 1.6, hy + 4 + gape, '#e8e0c0', 0.9);
  }
  const POSES = ['', '_w1', '_w2', '_a1', '_a2'];
  function paintFoes() {
    for (const pose of POSES) addSprite('briarsprite' + pose, 72, 72, (x, w, h) => paintSprite(x, w, h, pose), { hs: 1, cx: 0.5, dy: 0 });
    glowMask('briarsprite', (r, g, b) => r > 200 && g > 240 && b > 220);
    ensureCoats();
  }
  // coats for the wharf: recoloured copies of the town's people. The game's own art arrives as decoded images, so this is
  // tried again whenever a map is built or loaded until every coat exists.
  const COATS = [['townsman', 'p16f_dockman', [0.85, 0.95, 0.9]], ['townswoman', 'p16f_dockwoman', [1.05, 0.8, 1.0]], ['townsman', 'p16f_cutter', [0.8, 1.0, 0.72]], ['hob', 'p16f_keeper', [0.78, 0.9, 1.05]], ['townswoman', 'p16f_rafter', [0.8, 0.95, 1.05]]];
  function ensureCoats() {
    if (typeof Engine === 'undefined' || !Engine.sprites) return false;
    let all = true;
    for (const [src, dst, k] of COATS) { if (!Engine.sprites[dst]) tintSprite(src, dst, k); if (!Engine.sprites[dst]) all = false; }
    return all;
  }

  // ---------------------------------------------------------------- catalogue: foe, item, people, loot
  const ENEMY_DEFS = {
    briarsprite: { name: TX.sprite.name, sprite: 'briarsprite', hp: B.SPRITE.hp, dmg: B.SPRITE.dmg.slice(), speed: B.SPRITE.speed, reach: B.SPRITE.reach, scale: B.SPRITE.scale, xp: B.SPRITE.xp, briar: true, desc: TX.sprite.desc },
  };
  const LOOT_DEFS = { briarsprite: { chance: 0.3, table: [['herb_moss', 40], ['bandage', 30], ['sovereigns', 30]] } };
  const ITEM_DEFS = {
    p16_lock_key: { name: TX.key.name, sprite: 'loot', key: true, desc: TX.key.desc },
  };
  const VOICE_DEFS = { briarsprite: { style: 'beast', f0: 380, fs: 0.5 } };

  function installCatalog() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = Object.assign({}, ITEM_DEFS[k]);
    if (typeof ENEMIES !== 'undefined') for (const k in ENEMY_DEFS) if (!ENEMIES[k]) ENEMIES[k] = Object.assign({}, ENEMY_DEFS[k]);
    if (typeof LOOT !== 'undefined') for (const k in LOOT_DEFS) {
      if (LOOT[k]) continue;
      const t = LOOT_DEFS[k].table.filter(([id]) => typeof ITEMS === 'undefined' || ITEMS[id]);
      LOOT[k] = { chance: LOOT_DEFS[k].chance, table: t };
    }
    if (typeof VOICES !== 'undefined' && VOICES.ENEMY_VOICES) for (const k in VOICE_DEFS) if (!VOICES.ENEMY_VOICES[k]) VOICES.ENEMY_VOICES[k] = Object.assign({}, VOICE_DEFS[k]);
    if (typeof ANIM !== 'undefined' && ANIM.quadruped) ANIM.quadruped.add('briarsprite');
  }

  // ---------------------------------------------------------------- the maps
  const TEXTURES = ['t_moss', 't_cobble', 't_water', 't_shallows', 't_grass', 't_wood'];   // road: 0 moss, 1 cobble, 2 deep (walls), 3 shallows, 4 grass, 5 boards
  const lerp = (a, b, t) => a + (b - a) * t;
  // the path's un-dipped height, the channel's, and the dip the Wash cuts into the path
  const pathH = (x) => 2.4 * clamp((x - 4) / 54, 0, 1);
  const chanH = (x) => pathH(x) + 0.2 + 0.1 * clamp((x - 2) / 58, 0, 1);
  const dipAt = (x) => { const a = clamp((x - 22.5) / 3, 0, 1), b = clamp((40.5 - x) / 3, 0, 1); return 0.55 * Math.min(a, b); };
  const pathAt = (x) => pathH(x) - dipAt(x);
  const ringWall = (tex) => { const c = WALL(tex); c.p16fRing = true; return c; };
  const ringBlock = (m, x, y, tex, top, opts) => { const c = m.block(x, y, tex, top, opts); c.p16fRing = true; return c; };
  const J = (m, sprite, x, y, o) => m.deco(sprite, x, y, o);
  // the sap-lamps' light: a restrained green spill near the channel, so the road stays a road (Phase 16 polish)
  const LAMP_LIGHT = [8, 26, 14], LAMP_LIGHT_POCKET = [10, 32, 18];

  function buildRoad() {
    const W = 64, H = 32, Z = B.ZONE;
    const m = new GameMap('flume_road', 'The Flume Road', W, H, { outdoor: true, floor: 't_moss', floorTextures: TEXTURES, fogDist: 17, fogColor: [62, 64, 56], music: 'wild', danger: 1, spawn: { x: 2.0, y: 12.5, dir: 0 } });
    m.border('t_hedge');
    // the hedge band behind the channel, and the grown-wood outer wall of the aqueduct
    m.rect(1, 1, W - 2, 6, 't_hedge');
    for (let x = 1; x < W - 1; x++) m.set(x, 7, ringWall(grownAt(x)));
    // heights: the path and verge are a smooth slope that climbs (the Wash is dipped); the channel and the hedge band behind it are
    // flat cells at their own level, so the channel's face is a riser of grown wood that grows over the Wash
    const V = m.ensureVerts(), W1 = W + 1, Lv = m.ensureLvls();
    for (let vy = 0; vy <= H; vy++) for (let vx = 0; vx <= W; vx++) V[vy * W1 + vx] = vy <= 11 ? pathAt(vx) : (vy >= 20 ? pathH(vx) : pathAt(vx));
    m.syncSlopes(0, 0, W - 1, H - 1);
    for (let y = 0; y <= 10; y++) for (let x = 0; x < W; x++) { m.smooth[y * W + x] = 0; Lv[y * W + x] = chanH(x + 0.5); }
    // the channel: three cells of deep water (walls to a walker), faced in grown wood on the path side
    for (let x = 1; x < W - 1; x++) for (let y = 8; y <= 10; y++) m.setFloor(x, y, 2);
    for (let x = 1; x < W - 1; x++) m.setSide(x, 8, x, 10, grownAt(x + 1));
    // the path (cobble) and the boarded Wash
    for (let x = 1; x < W - 1; x++) for (let y = 11; y <= 13; y++) m.setFloor(x, y, x >= Z.x0 && x < Z.x1 ? 5 : 1);
    for (let y = 14; y <= 18; y++) for (let x = 1; x < W - 1; x++) m.setFloor(x, y, (x * 7 + y * 3) % 11 === 0 ? 4 : 0);
    // the south hedge, with the lane down to Stillwater cut through it at x 7..9
    for (let x = 1; x < W - 1; x++) if (x < 7 || x > 9) m.set(x, 19, WALL('t_hedge'));
    m.rect(1, 20, 6, H - 2, 't_hedge'); m.rect(10, 20, W - 2, H - 2, 't_hedge');
    for (let y = 19; y <= H - 2; y++) for (let x = 7; x <= 9; x++) m.setFloor(x, y, 0);
    // the cutting: a solid pier of grown wood 14..18 deep under the Wash, with two pockets cut into its path face
    for (let x = Z.x0; x < Z.x1; x++) for (let y = 14; y <= 18; y++) m.set(x, y, ringWall(grownAt(x + y)));
    for (const [px, py] of B.POCKETS) { m.set(px, py, null); m.setFloor(px, py, 0); }
    // the hollow of the third pier: a tunnel along y 16 with a knot-door at each end, shut until the rumour is bought
    for (let x = Z.x0 + 1; x < Z.x1 - 1; x++) m.set(x, 16, null);
    for (const x of [Z.x0, Z.x1 - 1]) m.set(x, 16, DOOR({ tex: 'p16f_knot', locked: 'p16f_tip', lockMsg: TX.road.knotShut, label: TX.road.knotShut }));
    for (let x = Z.x0 + 1; x < Z.x1 - 1; x++) m.setFloor(x, 16, 5);
    // ways out: back to Oakhaven in the west, the lane to the Landing in the south
    m.set(0, 12, DOOR({ portal: { map: 'oakhaven', x: 67.4, y: 51.5, dir: Math.PI }, label: TX.gate.back }));
    m.set(8, H - 1, DOOR({ portal: { map: 'flume_landing', x: 16.5, y: 1.6, dir: Math.PI / 2 }, label: TX.road.toLanding }));
    // ---- props
    const lampXs = [6.5, 13.5, 20.5, 44.5, 51.5, 58.0];
    for (const x of lampXs) J(m, 'p16f_lamp', x, 11.45, { solid: false, radius: 0.1, scale: 0.7, glow: 0.7, lightCol: LAMP_LIGHT, label: TX.road.lamp });
    for (const x of [28.5, 34.0]) J(m, 'p16f_lamp', x, 11.45, { solid: false, radius: 0.1, scale: 0.7, glow: 0.7, lightCol: LAMP_LIGHT, label: TX.road.lamp });
    for (const [px, py] of B.POCKETS) J(m, 'p16f_lamp', px + 0.5, py + 0.45, { solid: false, radius: 0.1, scale: 0.55, glow: 0.8, lightCol: LAMP_LIGHT_POCKET, label: TX.road.pocket, use: 'p16f_pocket' });
    J(m, 'sign', 22.2, 13.2, { solid: false, radius: 0.15, scale: 0.75, label: TX.road.sign });
    J(m, 'sign', 10.6, 17.2, { solid: false, radius: 0.15, scale: 0.75, label: TX.road.branch });
    for (const [x, y] of [[9.5, 15.6], [19.0, 16.4], [43.0, 15.6], [50.0, 16.8], [46.4, 13.0]]) J(m, 'p16f_post', x, y, { solid: true, radius: 0.22, scale: 0.9, label: TX.road.post, use: 'p16f_ring', ring: true });
    for (const [x, y] of [[12.5, 17.6], [16.4, 15.2], [21.0, 17.4], [44.6, 17.6], [48.4, 15.4], [53.5, 17.4]]) J(m, 'p16f_briar', x, y, { solid: false, radius: 0.3, scale: 0.8, label: TX.road.briar });
    const rnd = mulberry32(1604);
    for (let i = 0, n = 0; i < 160 && n < 12; i++) {
      const x = 2.5 + rnd() * (W - 5), y = 14.6 + rnd() * 4.0;
      if ((x > Z.x0 - 1.5 && x < Z.x1 + 1.5) || (x > 6 && x < 11) || m.get(x | 0, y | 0)) continue;
      J(m, 'oak', x, y, { scale: 1.2 + rnd() * 0.7, radius: 0.45 }); n++;
    }
    // ---- the strongbox in the hollow pier, and the view at the end of the road
    m.add({ kind: 'item', item: 'cache', tier: 2, x: 31.5, y: 16.5, sprite: 'chest', scale: 0.5, solid: false, label: TX.road.box });
    for (const x of [27.5, 36.5]) J(m, 'p16f_lamp', x, 16.2, { solid: false, radius: 0.1, scale: 0.5, glow: 0.8, lightCol: LAMP_LIGHT_POCKET, label: TX.road.lamp });
    J(m, 'sign', 58.4, 12.2, { solid: false, radius: 0.15, scale: 0.75, label: TX.road.end });
    m.add({ kind: 'item', item: 'cache', tier: 1, x: 60.2, y: 16.2, sprite: 'chest', scale: 0.5, solid: false });
    // ---- foes: two briar packs in the verge, two hounds that listen for ringing wood
    for (const [x, y] of [[13.5, 16.8], [15.2, 17.8], [11.6, 17.6]]) m.enemy('briarsprite', x, y);
    for (const [x, y] of [[46.8, 16.6], [48.6, 17.6]]) m.enemy('briarsprite', x, y);
    m.enemy('hound', 18.6, 17.4); m.enemy('hound', 51.4, 15.6);
    m.item('honey', 3.4, 15.6); m.item('tonic', 57.0, 17.6);
    m.baseCount = m.entities.length;
    return m;
  }

  // Stillwater Landing, the lower lock: a quay, a basin of green water, the lock wall across its east end
  const LANDING = { wheel: [26.6, 14.5], gate: [28, 19], gate2: [28, 20], raft: [25.4, 19.6] };
  function buildLanding() {
    const W = 34, H = 26;
    const m = new GameMap('flume_landing', 'Stillwater Landing', W, H, { outdoor: true, floor: 't_moss', floorTextures: ['t_moss', 't_wood', 't_water', 't_shallows', 't_cobble', 't_grass'], fogDist: 16, fogColor: [58, 62, 58], music: 'town', danger: 0, spawn: { x: 16.5, y: 2.0, dir: Math.PI / 2 } });
    m.border('t_hedge');
    const rect = (x0, y0, x1, y1, idx) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, idx); };
    // the lane from the road, and the quay along the top of the basin
    rect(15, 1, 17, 12, 4); rect(1, 13, 32, 14, 1);
    // the basin (deep water) with two finger piers; the lock wall at x 28; the river beyond it
    rect(1, 15, 32, 24, 2); rect(7, 15, 8, 20, 1); rect(14, 15, 15, 21, 1);
    for (let y = 15; y <= 24; y++) m.set(28, y, ringWall('p16f_gate'));
    m.set(LANDING.gate[0], LANDING.gate[1], DOOR({ tex: 'p16f_gate', locked: '__never', lockMsg: TX.landing.wheelShut, label: TX.landing.wheelShut }));
    m.set(LANDING.gate2[0], LANDING.gate2[1], DOOR({ tex: 'p16f_gate', locked: '__never', lockMsg: TX.landing.wheelShut, label: TX.landing.wheelShut }));
    m.setFloor(28, 19, 1); m.setFloor(28, 20, 1);
    // buildings: the lockkeeper's house, the fence's lean-to, the cooperage (locked), and a few barred houses
    m.rect(22, 3, 27, 7, 't_house'); m.set(24, 7, DOOR({ locked: '__never', lockMsg: TX.landing.hutShut, label: TX.landing.hutShut }));
    m.rect(4, 3, 9, 6, 't_wood'); m.rect(11, 3, 19, 8, 't_wood');
    m.clear(12, 4, 18, 7);
    m.set(15, 8, DOOR({ lockDifficulty: 3, label: TX.landing.storeShut }));
    m.set(15, 9, null);
    m.rect(29, 3, 32, 8, 't_house'); m.set(30, 8, DOOR({ locked: '__never', lockMsg: TX.landing.hutShut, label: TX.landing.hutShut }));
    m.rect(1, 3, 2, 8, 't_house');
    // roofs: the buildings stand a little above their eaves
    for (const [x0, y0, x1, y1, tex] of [[23, 4, 26, 6, 't_roof'], [5, 4, 8, 5, 't_roof'], [30, 4, 31, 7, 't_roof']]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.block(x, y, tex, 1.45, { capTex: 't_roof' });
    // ways out: north lane to the road, the gangway west to the Low Rings
    m.set(16, 0, DOOR({ portal: { map: 'flume_road', x: 8.5, y: 29.6, dir: -Math.PI / 2 }, label: TX.landing.road }));
    m.set(0, 13, DOOR({ portal: { map: 'flume_lowrings', x: 36.4, y: 18.5, dir: Math.PI }, label: TX.landing.rings }));
    // ---- props
    J(m, 'sign', 14.2, 11.4, { solid: false, radius: 0.15, scale: 0.75, label: TX.landing.sign });
    for (const [x, y] of [[3.5, 12.4], [10.5, 12.4], [18.6, 12.4], [30.5, 12.4], [12.8, 14.3], [21.0, 14.3]]) J(m, 'lamp', x, y, { solid: true, radius: 0.15, scale: 0.7, glow: 0.7 });
    for (const [x, y] of [[8.5, 14.2], [20.2, 12.2], [29.5, 14.2]]) J(m, 'p16f_lamp', x, y, { solid: false, radius: 0.1, scale: 0.7, glow: 0.7, lightCol: LAMP_LIGHT, label: TX.road.lamp });
    J(m, 'p_barrel', 10.4, 13.4, { radius: 0.3, scale: 0.65, label: TX.landing.barrels }); J(m, 'p_barrel', 11.2, 13.8, { radius: 0.3, scale: 0.65, label: TX.landing.barrels });
    J(m, 'p_crate', 5.5, 13.5, { radius: 0.3, scale: 0.7 }); J(m, 'p_crate', 30.4, 13.6, { radius: 0.3, scale: 0.7 });
    J(m, 'p16f_boat', 11.0, 18.6, { solid: false, scale: 0.75, yOff: -0.12, label: TX.landing.boat }); J(m, 'p16f_boat', 19.0, 22.0, { solid: false, scale: 0.7, yOff: -0.12, label: TX.landing.boat });
    J(m, 'table', 6.4, 7.3, { radius: 0.5, scale: 0.7 });
    // the quest: the raft and the lock-wheel
    m.add({ kind: 'deco', sprite: 'p16f_raft', x: LANDING.raft[0], y: LANDING.raft[1], scale: 1.15, yOff: -0.1, solid: false, radius: 0.3, label: TX.landing.raft, p16fRaft: true });
    J(m, 'p16f_wheel', LANDING.wheel[0], LANDING.wheel[1], { radius: 0.3, scale: 0.8, use: 'p16f_wheel', label: TX.landing.wheelShut, glow: 0.2 });
    // the cooperage's stock (behind a lock of difficulty 3)
    m.add({ kind: 'item', item: 'cache', tier: 2, x: 17.4, y: 5.4, sprite: 'chest', scale: 0.5, solid: false, label: TX.road.box });
    J(m, 'p_barrel', 13.2, 4.6, { radius: 0.3, scale: 0.65, label: TX.landing.barrels }); J(m, 'p_crate', 13.4, 6.6, { radius: 0.3, scale: 0.7 });
    m.item('bolts', 16.4, 4.4); m.item('v_signet', 14.2, 6.0);
    // people (their own NPC entries; see NPC_DEFS)
    m.add({ kind: 'npc', id: 'p16f_pellam', x: 24.5, y: 8.7, sprite: 'p16f_keeper', scale: 1, solid: true, radius: 0.35, facing: Math.PI / 2 });
    m.add({ kind: 'npc', id: 'p16f_madge', x: 7.3, y: 8.2, sprite: 'p16f_dockwoman', scale: 1, solid: true, radius: 0.35, facing: Math.PI / 2 });
    m.add({ kind: 'npc', id: 'p16f_orrin', x: 23.2, y: 12.4, sprite: 'p16f_cutter', scale: 1, solid: true, radius: 0.35, facing: 0 });
    m.add({ kind: 'npc', id: 'p16f_wife', x: 20.2, y: 12.6, sprite: 'p16f_rafter', scale: 1, solid: true, radius: 0.35, facing: 0 });
    m.add({ kind: 'npc', id: 'p16f_hand', x: 12.4, y: 12.4, sprite: 'p16f_dockman', scale: 1, solid: true, radius: 0.35, facing: Math.PI / 2 });
    m.baseCount = m.entities.length;
    return m;
  }

  // The Low Rings: Oakhaven's flooded lower quarter. Streets of knee-deep green water between roofs; three dry upper rooms.
  const RINGS = { loft: { stove: [29.5, 4.6], reed: [29.5, 7.6] } };
  function buildRings() {
    const W = 38, H = 30;
    const m = new GameMap('flume_lowrings', 'The Low Rings', W, H, { outdoor: true, floor: 't_shallows', floorTextures: ['t_shallows', 't_cobble', 't_water', 't_wood', 't_moss'], fogDist: 14, fogColor: [44, 54, 50], music: 'grove', danger: 1, spawn: { x: 36.4, y: 18.5, dir: Math.PI } });
    m.border('t_hedge');
    const rect = (x0, y0, x1, y1, idx) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, idx); };
    // sinkholes in the street (deep: not wadeable) and boards laid across between the roofs
    rect(11, 12, 12, 14, 2); rect(23, 11, 24, 16, 2); rect(5, 16, 7, 17, 2);
    rect(3, 9, 12, 9, 3); rect(14, 9, 22, 9, 3);
    // the three rooms: walls, a cleared interior on a floor 0.3 above the water, boards for a floor, a step in at the door
    const room = (x0, y0, x1, y1, dx, dy, door) => {
      m.rect(x0, y0, x1, y1, 't_house'); m.clear(x0 + 1, y0 + 1, x1 - 1, y1 - 1);
      for (let y = y0 + 1; y <= y1 - 1; y++) for (let x = x0 + 1; x <= x1 - 1; x++) { m.setLvl(x, y, 0.3); m.setFloor(x, y, 3); }
      m.set(dx, dy, door); m.setLvl(dx, dy, 0.3); m.setFloor(dx, dy, 3);
    };
    room(3, 3, 9, 8, 6, 8, DOOR({ label: 'The chandler\'s' }));
    room(14, 3, 21, 8, 17, 8, DOOR({ lockDifficulty: 2, label: 'The counting-house' }));
    room(26, 3, 33, 8, 29, 8, DOOR({ label: 'A loft' }));
    // barred, drowned houses in the south and a tower of a counting-house stair, roofs and upper storeys out of the water
    const house = (x0, y0, x1, y1, dx, top, tex) => {
      m.rect(x0, y0, x1, y1, tex || 't_house');
      for (let y = y0 + 1; y <= y1 - 1; y++) for (let x = x0 + 1; x <= x1 - 1; x++) m.block(x, y, 't_roof', top, { capTex: 't_roof' });
      m.set(dx, y0, DOOR({ locked: '__never', lockMsg: TX.rings.sunken, label: TX.rings.sunken }));
    };
    house(3, 20, 10, 26, 6, 1.9); house(14, 20, 20, 27, 17, 2.4); house(26, 20, 34, 26, 29, 1.7);
    house(31, 11, 34, 16, 32, 1.6); house(16, 12, 20, 16, 18, 2.1, 't_marble');
    // the street out: the Landing's gangway at the east end
    m.set(37, 18, DOOR({ portal: { map: 'flume_landing', x: 1.8, y: 13.5, dir: 0 }, label: TX.landing.ringsBack }));
    m.set(36, 18, null);
    // ---- props
    J(m, 'p16f_hang', 6.5, 9.6, { solid: false, radius: 0.1, scale: 0.7, glow: 0.8, lightCol: [64, 58, 24], label: TX.rings.lamp });
    J(m, 'p16f_hang', 17.5, 9.6, { solid: false, radius: 0.1, scale: 0.7, glow: 0.8, lightCol: [64, 58, 24], label: TX.rings.lamp });
    J(m, 'p16f_hang', 29.5, 9.6, { solid: false, radius: 0.1, scale: 0.7, glow: 0.8, lightCol: [64, 58, 24], label: TX.rings.lamp });
    for (const [x, y] of [[9.5, 11.2], [25.5, 13.5], [34.5, 12.2], [14.5, 17.4], [3.5, 14.6], [21.5, 18.6]]) J(m, 'p16f_lamp', x, y, { solid: false, radius: 0.1, scale: 0.7, glow: 0.7, lightCol: LAMP_LIGHT, label: TX.road.lamp });
    // room 1: the chandler's loft
    J(m, 'shelf', 4.7, 4.4, { solid: false, radius: 0.3, scale: 0.8, label: TX.rings.chandler });
    m.item('bandage', 7.5, 6.4); m.item('honey', 5.0, 6.8);
    // room 2: the counting-house (a lock of difficulty 2)
    J(m, 'table', 18.0, 4.8, { radius: 0.5, scale: 0.7, label: TX.rings.desk });
    m.add({ kind: 'item', item: 'cache', tier: 2, x: 19.6, y: 6.6, sprite: 'chest', scale: 0.5, solid: false, label: TX.rings.counting });
    m.item('v_mesh', 15.8, 6.4);
    // room 3: the loft where somebody stayed. The reed sounds; the stove is warm.
    J(m, 'hearth', RINGS.loft.stove[0], RINGS.loft.stove[1], { radius: 0.4, scale: 0.7, glow: 0.6, use: 'p16f_stove', label: TX.rings.stove });
    J(m, 'table', 31.0, 5.6, { radius: 0.5, scale: 0.5, label: TX.rings.table });
    J(m, 'p9p_doorreed', RINGS.loft.reed[0], RINGS.loft.reed[1], { solid: false, radius: 0.1, scale: 0.55, yOff: -0.3, use: 'p16f_reed', label: TX.rings.reed });
    // ---- foes: drones wallow in the lanes, briar-sprites in the corners
    m.enemy('miredrone', 12.5, 16.6, { passive: true, facing: 0.6 }); m.enemy('miredrone', 24.0, 9.9, { passive: true, facing: 3.4 }); m.enemy('miredrone', 29.5, 15.6, { passive: true, facing: 1.2 });
    for (const [x, y] of [[8.4, 12.4], [19.4, 10.8], [28.4, 12.6]]) m.enemy('briarsprite', x, y);
    m.item('tonic', 22.4, 17.4);
    // ---- the flooded quarter's dressing (Phase 16 polish), appended last so every earlier entity keeps its index: roofs of
    // drowned houses in the gaps between the barred houses, mooring posts, a cart and barrels gone over, a floating log, reeds.
    for (const [x, y, sc] of [[12.0, 23.0, 1.0], [23.0, 23.6, 1.1], [35.6, 23.2, 0.9], [27.6, 17.9, 0.85]]) J(m, 'p16f_sunkroof', x, y, { solid: true, radius: 0.45, scale: sc, label: TX.rings.sunken });
    for (const [x, y] of [[14.2, 17.9], [25.2, 18.9], [33.8, 17.6], [9.6, 10.6]]) J(m, 'p12r_post', x, y, { solid: true, radius: 0.12, scale: 0.6 });
    J(m, 'p_cart_broken', 1.9, 15.4, { solid: true, radius: 0.4, scale: 0.6, label: TX.rings.sunken });
    for (const [x, y] of [[19.6, 18.3], [30.6, 13.1]]) J(m, 'p_barrel_side', x, y, { solid: false, radius: 0.2, scale: 0.45 });
    for (const [x, y] of [[8.0, 14.9], [27.2, 10.7]]) J(m, 'p9_log', x, y, { solid: false, radius: 0.2, scale: 0.55 });
    for (const [x, y, k] of [[1.4, 10.4, 1], [1.5, 18.7, 2], [35.7, 10.3, 2], [10.4, 19.4, 1], [24.7, 19.4, 2], [36.4, 12.6, 1]]) J(m, 'p_reed' + k, x, y, { solid: false, radius: 0.1, scale: 0.55 });
    m.baseCount = m.entities.length;
    return m;
  }

  // more words, kept with the rest of the text
  Object.assign(TX.landing, {
    songOpen: S('You sing the Root note, low, at the wheel. The grown wood remembers it. The chain slides off its post as if it had been waiting to be asked.'),
    keyOpen: S('The brass key turns. The chain drops into the water, and the wheel is yours.'),
    pickOpen: S('The chain falls away from the wheel. The gate behind it begins to open, with a long wet creak that the whole basin hears.'),
  });

  // ---------------------------------------------------------------- transient state: never saved
  const T = {
    phase: 'quiet', t: B.FIRST, was: false,       // the surge clock
    told: {}, caught: false, waves: [], floorSaved: null, floorLevel: 0,
    ohh: { freq: B.PITCH_LO, gain: 0, rumble: 0, pan: 0, dist: 0 },
    lastRing: -1e9, lastBleedMsg: -1e9, lastFatMsg: -1e9, bleedHud: 0, met: false, shown: {},
  };

  // ---------------------------------------------------------------- the surge clock
  const surgeActive = () => T.phase === 'surge';
  const inZone = (x, y) => x >= B.ZONE.x0 && x < B.ZONE.x1 && y >= B.ZONE.y0 && y < B.ZONE.y1;
  function setPhase(p) {
    T.phase = p;
    T.t = p === 'quiet' ? B.QUIET : p === 'telegraph' ? B.TELEGRAPH : p === 'surge' ? B.SURGE : B.DRAIN;
    if (p === 'telegraph') say(TX.surge.tele, 'warn', 6000);
    if (p === 'surge') { T.caught = false; say(TX.surge.go, 'warn', 6500); raiseWaves(); }
    if (p === 'drain') { say(TX.surge.drain, '', 4500); lowerWaves(); }
    if (p === 'quiet') clearWaves();
    syncFloor();
  }
  // messages only land in these maps (the clock keeps time on all three, the Wash is on the road)
  function say(text, cls, ttl) { if (inMine(G.mapId) && typeof msg === 'function') msg(text, cls, ttl); }
  function tickClock(dt) {
    if (!inMine(G.mapId)) { T.met = false; return; }
    if (!T.met) { T.met = true; T.phase = 'quiet'; T.t = B.FIRST; clearWaves(); syncFloor(); }
    if (!cfg.surges) { if (T.phase !== 'quiet') { T.phase = 'quiet'; clearWaves(); syncFloor(); } T.t = B.QUIET; return; }
    T.t -= dt;
    let guard = 0;
    if (T.phase === 'telegraph' || T.phase === 'drain') syncFloor();
    while (T.t <= 0 && guard++ < 4) setPhase(T.phase === 'quiet' ? 'telegraph' : T.phase === 'telegraph' ? 'surge' : T.phase === 'surge' ? 'drain' : 'quiet');
  }
  const p01 = () => {
    const d = T.phase === 'telegraph' ? B.TELEGRAPH : T.phase === 'surge' ? B.SURGE : T.phase === 'drain' ? B.DRAIN : B.QUIET;
    return clamp(1 - T.t / d, 0, 1);
  };
  // the vowel's pitch and the rumble under it, as a pure read of the clock (the audio and the tests share it)
  function ohhNow() {
    const k = p01(), sm = k * k * (3 - 2 * k);
    if (T.phase === 'telegraph') return { freq: lerp(B.PITCH_LO, B.PITCH_HI, sm), rumble: 0.15 + 0.6 * sm };
    if (T.phase === 'surge') return { freq: B.PITCH_HI, rumble: 0.85 };
    if (T.phase === 'drain') return { freq: lerp(B.PITCH_HI, B.PITCH_LO, sm), rumble: 0.5 * (1 - sm) };
    return { freq: B.PITCH_LO, rumble: 0 };
  }

  // the floor of the Wash: weeping boards in the telegraph, wet through the surge, back to dry in the drain
  function washCells() {
    const out = [];
    for (let y = B.ZONE.y0; y < B.ZONE.y1; y++) for (let x = B.ZONE.x0; x < B.ZONE.x1; x++) out.push([x, y]);
    return out;
  }
  function syncFloor() {
    const m = mapOf('flume_road'); if (!m || !m.floorCells) return;
    const k = p01();
    const hash = (x, y) => (((x * 7 + y * 13 + x * y * 3) % 10) + 0.5) / 10;      // puddles spread cell by cell, always the same cells
    const wet = (x, y) => {
      if (T.phase === 'surge') return true;
      if (T.phase === 'telegraph') return hash(x, y) < k * 1.05 - 0.1;
      if (T.phase === 'drain') return hash(x, y) < (1 - k) * 1.05 - 0.05;
      return false;
    };
    for (const [x, y] of washCells()) m.floorCells[y * m.w + x] = wet(x, y) ? 3 : 5;
  }

  // ---------------------------------------------------------------- the wall of green (transient sprites)
  function clearWaves() {
    for (const w of T.waves) { const i = G.ents ? G.ents.indexOf(w) : -1; if (i >= 0) G.ents.splice(i, 1); const m = mapOf('flume_road'); if (m && m.entities !== G.ents) { const j = m.entities.indexOf(w); if (j >= 0) m.entities.splice(j, 1); } }
    T.waves.length = 0;
  }
  function raiseWaves() {
    clearWaves();
    const m = mapOf('flume_road'); if (!m) return;
    for (const [y, top] of [[11.5, 1.5], [13.5, 1.5], [12.5, 0.7]]) for (let x = B.ZONE.x0 + 0.4 + (y === 12.5 ? 0.6 : 0); x < B.ZONE.x1; x += 0.9) {
      const w = { kind: 'deco', sprite: 'p16f_wave', x, y, scale: reduced() ? top : 0.05, top, yOff: 0, solid: false, radius: 0.1, nopick: true, transient: true, _p16f: 'wave', animAlpha: 0.7, animSX: 1.8, label: TX.surge.go, rise: 1 };
      m.entities.push(w); T.waves.push(w);
    }
  }
  function lowerWaves() { for (const w of T.waves) w.rise = -1; }
  function animWaves(dt) {
    if (!T.waves.length) return;
    const surge = T.phase === 'surge';
    for (const w of T.waves) {
      const target = w.rise > 0 ? w.top : 0.04;
      w.scale = reduced() ? (w.rise > 0 ? w.top : 0.04) : w.scale + (target - w.scale) * Math.min(1, dt * (w.rise > 0 ? 2.4 : 1.8));
      w.animAlpha = (surge ? (w.top < 1 ? 0.55 : 0.8) : 0.5) * (reduced() ? 1 : 0.9 + 0.1 * Math.sin((G.time || 0) * 3 + w.x));
    }
  }

  // ---------------------------------------------------------------- the push, the slowing, the fatigue (no damage)
  function beforeUpdate(dt) {
    if (typeof G === 'undefined' || !G.player || G.dead) return null;
    tickClock(dt);
    if (G.state !== 'play') return null;
    const c = Engine.cam;
    if (!(G.mapId === 'flume_road' && surgeActive() && inZone(c.x, c.y))) return null;
    // downhill is west: the water walks you back down the road
    if (typeof playerMove === 'function') playerMove(c, -B.PUSH * dt, 0);
    const p = G.player; p.fat = Math.max(0, p.fat - B.FAT_DRAIN * dt);
    if (!T.caught) { T.caught = true; say(TX.surge.push, 'warn', 5500); }
    return { x: c.x, y: c.y };
  }
  function afterUpdate(dt, pre) {
    if (pre && G.state === 'play' && !G.dead) {
      const c = Engine.cam, mx = c.x - pre.x, my = c.y - pre.y, k = 1 - B.SLOW;
      if (typeof playerMove === 'function' && (mx || my)) playerMove(c, -mx * k, -my * k);   // the water keeps most of every step
    }
    animWaves(dt);
    tickBleed(dt);
    tickQuest(dt);
  }

  // ---------------------------------------------------------------- the held vowel (synthesised once, positional)
  const SRC = { flume_landing: [16, -9], flume_lowrings: [56, 14] };
  function ohhSource() {
    const c = Engine.cam;
    if (G.mapId === 'flume_road') return { x: clamp(c.x, 1, 62), y: 9.0 };    // the nearest cell of the channel
    const s = SRC[G.mapId]; return s ? { x: s[0], y: s[1] } : null;
  }
  function ohhMix() {
    if (!inMine(G.mapId) || !Engine || !Engine.cam) return null;
    const src = ohhSource(); if (!src) return null;
    const c = Engine.cam, d = Math.hypot(src.x - c.x, src.y - c.y);
    let m = null, walls = 0;
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.wallsBetween) walls = SPATIAL.wallsBetween(G.map, src.x, src.y, c.x, c.y); } catch (e) { walls = 0; }
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.mix) m = SPATIAL.mix({ x: c.x, y: c.y, dir: c.dir }, src, walls); } catch (e) { m = null; }
    if (!m) { const dx = src.x - c.x, dy = src.y - c.y; m = { pan: clamp((-Math.sin(c.dir) * dx + Math.cos(c.dir) * dy) / Math.max(1.2, d), -1, 1), gain: 1 / (1 + d / 6), cutoff: 1600 }; }
    let pan = m.pan;
    try { if (typeof SPATIAL !== 'undefined' && SPATIAL.settings && SPATIAL.settings.positional === false) pan = 0; } catch (e) { /* default */ }
    const far = G.mapId === 'flume_road' ? 1 : 0.55;                       // three kilometres out it is still there, only lower
    const o = ohhNow();
    return { x: src.x, y: src.y, dist: d, pan, gain: clamp(0.05 + 0.1 * m.gain, 0, 0.15) * far, cutoff: Math.min(m.cutoff, 2200), freq: o.freq, rumble: o.rumble, walls };
  }
  const OA = { ctx: null, g: null, pan: null, lp: null, osc: [], rg: null, vib: null };
  function ohhAudio() {
    const A = typeof Audio_ !== 'undefined' ? Audio_ : null;
    const mix = ohhMix();
    T.ohh = mix ? { freq: mix.freq, gain: mix.gain, rumble: mix.rumble, pan: mix.pan, dist: mix.dist } : { freq: B.PITCH_LO, gain: 0, rumble: 0, pan: 0, dist: 0 };
    if (!A || !A.ctx || !A.sfxBus) return;            // nothing at all until the one AudioContext exists
    const ctx = A.ctx;
    if (!OA.g || OA.ctx !== ctx) {
      try {
        OA.ctx = ctx; OA.g = ctx.createGain(); OA.g.gain.value = 0;
        OA.lp = ctx.createBiquadFilter(); OA.lp.type = 'lowpass'; OA.lp.frequency.value = 1600; OA.lp.Q.value = 0.5;
        OA.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        // a sung "oh": a pair of detuned saws through two vowel formants (about 520 Hz and 900 Hz)
        const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 4;
        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 5;
        const mixg = ctx.createGain(); mixg.gain.value = 1.4;
        OA.osc = [ctx.createOscillator(), ctx.createOscillator(), ctx.createOscillator()];
        OA.osc[0].type = 'sawtooth'; OA.osc[1].type = 'sawtooth'; OA.osc[2].type = 'sine';
        OA.osc[0].frequency.value = B.PITCH_LO; OA.osc[1].frequency.value = B.PITCH_LO * 1.006; OA.osc[2].frequency.value = B.PITCH_LO / 2;
        const sub = ctx.createGain(); sub.gain.value = 0.5;
        OA.vib = ctx.createOscillator(); OA.vib.frequency.value = 4.6; const vg = ctx.createGain(); vg.gain.value = 1.8; OA.vib.connect(vg); vg.connect(OA.osc[0].frequency); vg.connect(OA.osc[1].frequency); OA.vib.start();
        OA.osc[0].connect(f1); OA.osc[1].connect(f1); OA.osc[0].connect(f2); OA.osc[1].connect(f2); f1.connect(mixg); f2.connect(mixg);
        OA.osc[2].connect(sub); sub.connect(mixg);
        mixg.connect(OA.lp);
        if (OA.pan) { OA.lp.connect(OA.pan); OA.pan.connect(OA.g); } else OA.lp.connect(OA.g);
        // the rumble: slow brown noise through a low-pass
        const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        let last = 0, seed = 7; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; const w = seed / 2147483647 * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
        const ns = ctx.createBufferSource(); ns.buffer = buf; ns.loop = true;
        const rl = ctx.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 90; OA.rg = ctx.createGain(); OA.rg.gain.value = 0;
        ns.connect(rl); rl.connect(OA.rg); OA.rg.connect(A.sfxBus);
        OA.g.connect(A.sfxBus);
        for (const o of OA.osc) o.start(); ns.start();
      } catch (er) { OA.g = null; return; }
    }
    const t = ctx.currentTime, muted = !!A.muted;
    try {
      OA.g.gain.setTargetAtTime(!mix || muted ? 0 : mix.gain, t, 0.25);
      if (mix) {
        for (const [i, k] of [[0, 1], [1, 1.006], [2, 0.5]]) OA.osc[i].frequency.setTargetAtTime(mix.freq * k, t, 0.15);
        if (OA.pan) OA.pan.pan.setTargetAtTime(mix.pan, t, 0.12);
        OA.lp.frequency.setTargetAtTime(mix.cutoff, t, 0.2);
      }
      OA.rg.gain.setTargetAtTime(!mix || muted ? 0 : clamp(mix.rumble * 0.34 * (G.mapId === 'flume_road' ? 1 : 0.5), 0, 0.4), t, 0.3);
    } catch (er) { /* a closed context */ }
  }

  // ---------------------------------------------------------------- the glow of the water (a post pass on these maps only)
  function glowHook(F) {
    if (!GFX.flumeGlow) return;
    const map = F.map; if (!map || !inMine(map.id)) return;
    const { fb, mbuf, dbuf, w, h, horizon } = F;
    const t = (GFX.noFlash ? 0 : F.animT) * (GFX.reduceMotion ? 0.2 : 1);
    const y0 = horizon < 1 ? 1 : horizon, invFog = 1 / Math.max(6, F.fogDist || 16);
    const web = (typeof SKIES14 !== 'undefined' && SKIES14.caustics && SKIES14.caustics.state && SKIES14.caustics.state.tex) || null, TN = 128, TM = 127;
    const night = 1 - (F.skyDay || 0);
    const amp = 38 + 24 * night, cam = F.cam, dirX = F.dirX, dirY = F.dirY, planeX = F.planeX, planeY = F.planeY;
    for (let x = 0; x < w; x++) {
      const u = 2 * x / w - 1, rx = dirX + planeX * u, ry = dirY + planeY * u;
      for (let y = y0; y < h; y++) {
        const o = y * w + x, mt = mbuf[o];
        if (mt !== 2 && mt !== 3) continue;
        const dp = dbuf[o] - 0.45; if (dp <= 0.2) continue;
        const fade = 1 - dp * invFog; if (fade <= 0.03) continue;
        const wx = cam.x + dp * rx, wy = cam.y + dp * ry;
        let c = 0.34 + 0.12 * Math.sin(t * 0.9 + wx * 0.7 + wy * 0.5);              // the sap-light breathes slowly with the held note
        if (web) { const v = web[(((wy * 36 + t * 6) | 0) & TM) * TN + (((wx * 36 - t * 5) | 0) & TM)]; c += v * (0.5 / 255); }
        c *= fade * (mt === 2 ? 1 : 0.8);
        const e = c * amp, p = fb[o], a = (mt === 2 ? 0.2 : 0.3) * fade;                // lean the water toward sap-green, then add the light
        const R = (p & 255) * (1 - a) + 50 * a + e * 0.25, G_ = ((p >> 8) & 255) * (1 - a) + 200 * a + e * 1.0, Bb = ((p >> 16) & 255) * (1 - a) + 105 * a + e * 0.45;
        fb[o] = (255 << 24) | ((Bb > 255 ? 255 : Bb) << 16) | ((G_ > 255 ? 255 : G_) << 8) | (R > 255 ? 255 : R);
        if (c > 0.8 && fade > 0.55) mbuf[o] = 8;                                                    // the brightest threads give light of their own (Cinematic blooms them)
      }
    }
  }

  // ---------------------------------------------------------------- ringing timber
  const normAng = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  function timberAt(reach) {
    const c = Engine.cam, m = G.map;
    for (let d = 0.35; d <= reach + B.RING_REACH_PAD; d += 0.25) {
      const x = c.x + Math.cos(c.dir) * d, y = c.y + Math.sin(c.dir) * d, cell = m.get(x | 0, y | 0);
      if (cell && cell.p16fRing) return { x: x | 0, y: y | 0, d };
      if (cell && !cell.door) break;                       // some other wall is in front: the swing is for that
    }
    for (const e of G.ents) {
      if (e.kind !== 'deco' || !e.ring || e.hidden) continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy);
      if (d <= reach + (e.radius || 0.25) + 0.45 && Math.abs(normAng(Math.atan2(dy, dx) - c.dir)) < 0.7) return { x: e.x, y: e.y, d };
    }
    return null;
  }
  function beforeStrike() {
    if (!inMine(G.mapId) || G.state !== 'play' || G.dead || G.attack.t > 0 || G.song.t > 0) return null;
    const w = currentWeapon(); if (!w || w.ranged) return null;
    const hit = timberAt(w.reach || 1);
    if (!hit) return null;
    const c = Engine.cam;
    for (const e of G.ents) {                              // a foe nearer than the wood: the swing is for it
      if (e.kind !== 'enemy' || e.dead || e.hidden) continue;
      const ex = e.x - c.x, ey = e.y - c.y, ed = Math.hypot(ex, ey);
      if (ed < hit.d && ed <= (w.reach || 1) + (e.radius || 0.3) && Math.abs(normAng(Math.atan2(ey, ex) - c.dir)) < 0.55) return null;
    }
    return { noise: G.noise, hit };
  }
  function afterStrike(pre) {
    if (!(G.attack.t > 0)) return;                         // the swing never began
    const part = Math.max(0, G.noise - pre.noise);
    G.noise = clamp(pre.noise + part + B.RING_NOISE, 0, 10);
    ringOut();
  }
  // the bell-note: hounds within hearing turn toward the player
  function ringOut() {
    const c = Engine.cam; let woke = 0;
    try { Audio_.sfx.bell(); } catch (e) { /* no audio yet */ }
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden || !e.def || !e.def.noiseLure) continue;
      if (e.state === 'chase' || e.state === 'passive') continue;
      if (Math.hypot(e.x - c.x, e.y - c.y) > B.RING_HEAR) continue;
      e.investigation = { x: c.x, y: c.y, left: 10, source: 'ring' }; e.state = 'investigate'; woke++;
    }
    T.lastWoke = woke;
    if ((G.time || 0) - T.lastRing > 3.5) { T.lastRing = G.time || 0; msg(woke ? TX.ring.ring : TX.ring.quiet, woke ? 'warn' : '', 3800); }
    return woke;
  }

  // ---------------------------------------------------------------- briar-sprites: a small bleed, a little fatigue stolen
  function briarHit() {
    const p = G.player; if (!p || G.dead) return;
    const S_ = B.SPRITE;
    if (typeof UPG !== 'undefined' && UPG.status) {
      const was = UPG.status.bleed > 0;
      UPG.status.bleed = Math.min(S_.bleedCap, (Number(UPG.status.bleed) || 0) + S_.bleed);      // each hit adds to the bleed, up to the cap
      if (!was && (G.time || 0) - T.lastBleedMsg > 6) { T.lastBleedMsg = G.time || 0; msg(TX.sprite.bleed, 'bad', 4200); }
    }
    p.fat = Math.max(0, p.fat - S_.fat);
    if ((G.time || 0) - T.lastFatMsg > 9) { T.lastFatMsg = G.time || 0; msg(TX.sprite.fat, 'warn', 3200); }
  }
  function tickBleed(dt) {
    if (typeof UPG === 'undefined' || !UPG.status || !G.player || G.dead || G.state !== 'play') { T.bleedHud = 0; return; }
    const s = UPG.status;
    if (!(s.bleed > 0)) { T.bleedHud = 0; return; }
    s.bleed = Math.max(0, s.bleed - dt);
    const p = G.player; p.hp = Math.max(Math.min(p.hp, 1), p.hp - B.BLEED_DPS * dt);   // it never takes the last hit point
    T.bleedHud = s.bleed;
  }

  // ---------------------------------------------------------------- people: Tobit, Madge, Barnaby, the hand, the raft-wife
  const addG = (n) => { try { G.gold(n); } catch (e) { G.player.gold = (Number(G.player.gold) || 0) + n; } };
  const gold = () => Number(G.player && G.player.gold) || 0;
  const spend = (n) => { G.player.gold = Math.max(0, gold() - n); };
  const GIFTS = ['honey', 'p12_hearth_bread', 'p12_flume_eel', 'p12_moot_curd'];
  const giftId = () => { for (const id of GIFTS) if (typeof ITEMS !== 'undefined' && ITEMS[id] && G.has(id)) return id; return null; };
  const hasKey = () => { try { return G.has('p16_lock_key'); } catch (e) { return false; } };

  function pellamQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.pellam, first = fint('met') === 0;
    setf('met', 1);
    const choices = [];
    if (fint('tip') === 0) choices.push({ t: P.buy, f: () => {
      if (gold() < B.TIP_PRICE) return P.broke;
      spend(B.TIP_PRICE); setf('tip', 1); try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
      journal('side', P.tipJournal); return P.tip;
    } });
    choices.push({ t: P.who, f: () => P.whoText });
    if (fint('lock') === 0 && !hasKey()) choices.push({ t: P.key, f: () => {
      if (gold() < B.KEY_PRICE) return P.keyText + ' ' + P.keyBroke;
      spend(B.KEY_PRICE); setf('key', 1); G.give('p16_lock_key'); try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
      return P.keyText + ' ' + P.keyDone;
    } });
    choices.push({ t: P.none, f: () => (fint('tip') ? P.had : P.again) });
    return { text: first ? P.intro : (hasKey() && fint('lock') === 0 ? P.keyHad : P.again), choices };
  }
  function orrinQuest() {
    if (!inMine(G.mapId)) return null;
    const O = TX.orrin, q = fint('q');
    if (q >= 2) return { text: O.after };
    if (fint('lock') === 1) return { text: O.openFirst, choices: [{ t: O.itWas, f: () => completeLock() }] };
    if (q === 1) return { text: O.waiting };
    return { text: O.intro, choices: [
      { t: O.yes, f: () => { setf('q', 1); journal('side', O.journalOffer); return O.accept; } },
      { t: O.no, f: () => O.declined },
    ] };
  }
  function completeLock() {
    if (fint('done') === 1) return TX.orrin.after;
    const R = B.REWARD;
    setf('q', 2); setf('done', 1);
    addG(R.gold); try { questXp(R.xp); } catch (e) { /* xp is a bonus */ }
    try { if (typeof changeRep === 'function') changeRep('hedge', R.rep); } catch (e) { /* standing is a bonus */ }
    for (let i = 0; i < R.honey; i++) { try { G.give('honey'); } catch (e) { /* pack full */ } }
    journal('side', TX.orrin.journalDone);
    applyMapState('flume_landing');
    try { msg(TX.orrin.reward, 'good', 5000); } catch (e) { /* silent */ }
    return TX.orrin.done;
  }
  const NPC_DEFS = {
    p16f_pellam: { name: TX.pellam.name, sprite: 'p16f_keeper', portrait: 'townsman', tier: 'low', greet: { polite: TX.pellam.polite, normal: TX.pellam.normal, blunt: TX.pellam.blunt }, topics: {}, quest: pellamQuest },
    p16f_madge: { name: TX.madge.name, sprite: 'p16f_dockwoman', portrait: 'townswoman', tier: 'low', greet: { polite: TX.madge.polite, normal: TX.madge.normal, blunt: TX.madge.blunt }, topics: {},
      fenceRate: B.FENCE_RATE, markup: 1.3, shop: [{ item: 'bandage' }, { item: 'tonic' }],
      shopTalk: { hello: TX.madge.hello, broke: TX.madge.broke, thanks: TX.madge.thanks.slice(), buys: ['valuable', 'weapon', 'armor', 'consumable'] } },
    p16f_orrin: { name: TX.orrin.name, sprite: 'p16f_cutter', portrait: 'townsman', tier: 'low', greet: { polite: TX.orrin.polite, normal: TX.orrin.normal, blunt: TX.orrin.blunt }, topics: {}, quest: orrinQuest },
    p16f_hand: { name: TX.hand.name, sprite: 'p16f_dockman', portrait: 'townsman', tier: 'low', greet: { polite: TX.hand.polite, normal: TX.hand.normal, blunt: TX.hand.blunt }, topics: {} },
    p16f_wife: { name: TX.wife.name, sprite: 'p16f_rafter', portrait: 'townswoman', tier: 'low', greet: { polite: TX.wife.polite, normal: TX.wife.normal, blunt: TX.wife.blunt }, topics: {} },
  };
  NPC_DEFS.p16f_madge.broke = TX.madge.broke;
  function installNpcs() { if (typeof NPCS !== 'undefined') for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k]; }

  // the fence: she pays a fraction of the clean price, and what she takes that was stolen stops being contraband
  function wrapSell() {
    if (typeof sellPrice !== 'function') return;
    const _f = sellPrice;
    sellPrice = function (id) {
      const v = _f.apply(this, arguments);
      try { if (typeof DLG !== 'undefined' && DLG.npc && DLG.npc.fenceRate && G.state === 'dialogue') return Math.max(1, Math.floor(v * DLG.npc.fenceRate)); } catch (e) { /* the clean price stands */ }
      return v;
    };
  }
  function reconcileStolen() {
    try {
      if (typeof ROADS15 === 'undefined' || !ROADS15.stolenCounts || !G.count) return;
      const s = ROADS15.stolenCounts();
      for (const id of Object.keys(s)) {
        const have = G.count(id) | 0;
        if (have >= s[id]) continue;
        const k = 'p15r_s_' + id;
        if (have > 0) G.flags[k] = have; else delete G.flags[k];
      }
    } catch (e) { /* the register is the roads module's */ }
  }

  // ---------------------------------------------------------------- state derived from flags (idempotent, run on every load)
  function applyMapState(id) {
    const m = mapOf(id); if (!m) return;
    if (id === 'flume_landing') {
      if (fint('lock') === 1) {
        for (const [x, y] of [LANDING.gate, LANDING.gate2]) { if (m.get(x, y)) m.set(x, y, null); m.setFloor(x, y, 1); }
        const wh = m.entities.find((e) => e.use === 'p16f_wheel'); if (wh) wh.label = TX.landing.wheelOpen;
      }
      const raft = m.entities.find((e) => e.p16fRaft);
      if (raft) { raft.hidden = fint('done') === 1; raft.label = fint('done') === 1 ? TX.landing.raftGone : TX.landing.raft; }
    }
    try { if (typeof Engine !== 'undefined' && Engine.scanRelief && G.map === m) Engine.scanRelief(m); } catch (e) { /* cosmetic */ }
  }
  function openLock(how) {
    if (fint('lock') === 1) return false;
    setf('lock', 1); applyMapState('flume_landing');
    try { Audio_.sfx.door(); } catch (e) { /* silent */ }
    msg(how === 'song' ? TX.landing.songOpen : how === 'key' ? TX.landing.keyOpen : TX.landing.pickOpen, 'good', 6500);
    journal('side', TX.jour.lockOpened);
    return true;
  }
  function useWheel() {
    if (fint('lock') === 1) { msg(TX.landing.wheelOpen, '', 3500); return true; }
    if (hasKey()) { G.take('p16_lock_key'); openLock('key'); return true; }
    const key = 'picked:flume_landing:wheel';
    if (G.flags[key] === true) { openLock('pick'); return true; }
    const target = { kind: 'deco', locked: false, x: LANDING.wheel[0], y: LANDING.wheel[1] };
    if (!beginLockpick(target, key, 3, () => openLock('pick'))) msg(TX.landing.wheelShut, 'warn', 4000);
    return true;
  }
  function useStove() {
    if (fint('gift') === 1) { msg(TX.rings.stoveHeld, '', 4500); return true; }
    const id = giftId();
    if (!id) { msg(TX.rings.stoveNone, '', 4500); return true; }
    showEvent(TX.rings.stoveTitle, TX.rings.stove, [
      { t: TX.rings.stoveGift, f: () => {
        if (!G.has(id)) return;
        G.take(id); setf('gift', 1); try { questXp(B.REWARD.gift_xp); } catch (e) { /* xp is a bonus */ }
        journal('side', TX.rings.gift); msg(TX.rings.stoveHeld, 'good', 5500);
      } },
      { t: TX.rings.stoveLeave, f: () => {} },
    ]);
    return true;
  }
  function onUse(e) {
    switch (e.use) {
      case 'p16f_wheel': return useWheel();
      case 'p16f_ring': addNoiseSafe(B.RING_NOISE); ringOut(); return true;
      case 'p16f_pocket': msg(TX.surge.pocket, '', 4500); return true;
      case 'p16f_stove': return useStove();
      case 'p16f_reed': msg(TX.rings.reed, '', 5000); return true;
      default: return false;
    }
  }
  const addNoiseSafe = (n) => { try { G.noise = clamp((Number(G.noise) || 0) + n, 0, 10); } catch (e) { /* none */ } };

  // ---------------------------------------------------------------- the quest closes with the Greening
  let closeT = 0;
  function tickQuest(dt) {
    closeT -= dt || 0;
    if (closeT > 0) return;
    closeT = 0.5;
    if (greening() && fint('q') === 1) { setf('q', 3); try { journal('side', TX.orrin.closed); } catch (e) { /* silent */ } }
    if (G.mapId === 'flume_landing') reconcileStolen();
  }

  // ---------------------------------------------------------------- arrival
  function arrive() {
    const m = G.map, c = Engine.cam;
    if (m.isBlocked(c.x | 0, c.y | 0) || !isFinite(c.x) || !isFinite(c.y)) { c.x = m.spawn.x; c.y = m.spawn.y; c.dir = m.spawn.dir || 0; try { settleFeet(); } catch (e) { /* ok */ } }
    const bit = { flume_road: 1, flume_landing: 2, flume_lowrings: 4 }[G.mapId] | 0;
    const first = (fint('seen') & bit) === 0;
    if (first) setf('seen', fint('seen') | bit);
    const t = { flume_road: TX.road, flume_landing: TX.landing, flume_lowrings: TX.rings }[G.mapId];
    if (t) { msg(t.arrive, '', 6500); if (first) journal('side', t.journal); }
  }

  // ---------------------------------------------------------------- Oakhaven's gate, the world map, the Gazette, the rumour
  const GATE = { x: 69, y: 51 };
  function hookOakhaven(m) {
    if (!m || m.w !== 70 || m.h !== 64) return m;
    if (m.get(GATE.x, GATE.y) && m.get(GATE.x, GATE.y).portal) return m;
    const shut = greening();
    m.set(GATE.x - 1, GATE.y, null);
    m.set(GATE.x, GATE.y, DOOR(shut
      ? { tex: 't_hedge', locked: '__never', lockMsg: TX.gate.shut, label: TX.gate.shut }
      : { tex: 't_hedge', portal: { map: 'flume_road', x: 1.7, y: 12.5, dir: 0 }, label: TX.gate.label }));
    return m;
  }
  function wireTravel() {
    if (typeof TRAVEL_REGIONS === 'undefined' || !TRAVEL_REGIONS.reach) return;
    const R = TRAVEL_REGIONS.reach;
    if (!R.maps.flume_road) R.maps.flume_road = { ch: 1, rect: [0.72, 0.60, 0.98, 0.84], risk: 0.1 };
    if (!R.extra.some((x) => x.map === 'flume_road' && x.spawn)) R.extra.push({ map: 'flume_road', spawn: true, name: 'The Flume Road, outside the Hedge' });
    if (typeof TRAVEL_FOES !== 'undefined' && !TRAVEL_FOES.flume_road) TRAVEL_FOES.flume_road = ['hound'];
    if (typeof travelDestinations === 'function') {
      const _f = travelDestinations;
      travelDestinations = function (regionId) {
        const out = _f.apply(this, arguments);
        if (!greening()) return out;
        return out.filter((d) => !inMine(d.map) && !inMine(d.door));
      };
    }
  }
  const RUMOUR_DEFS = [{ id: 'd_p16f_lock', cat: 'deed', who: 'patron', rank: 71, req: [FP + 'done'], note: TX.rumourNote, text: TX.rumour }];
  const GAZETTE_ITEMS = [{ req: [FP + 'done'], t: TX.gazette }];
  function wireStory() {
    if (typeof STORYRUM === 'undefined') return;
    const ids = new Set(STORYRUM.RUMOURS.map((r) => r.id));
    for (const d of RUMOUR_DEFS) if (!ids.has(d.id)) STORYRUM.RUMOURS.push(Object.assign({}, d));
    for (const issue of STORYRUM.ISSUES) {
      if (issue.items.some((it) => it && it.t === GAZETTE_ITEMS[0].t)) continue;
      for (const g of GAZETTE_ITEMS) issue.items.push(Object.assign({}, g));
    }
  }
  function wireLog() {
    const arr = (typeof LOGMAP !== 'undefined' && LOGMAP && Array.isArray(LOGMAP.QUEST_GIVERS)) ? LOGMAP.QUEST_GIVERS : null;
    if (arr && arr.indexOf('p16f_orrin') < 0) arr.push('p16f_orrin');
  }

  // ---------------------------------------------------------------- Options rows
  const ROWS = [
    ['p16f-opt-surges', TX.opt.surges, TX.opt.surgesHint, 'surges'],
    ['p16f-opt-glow', TX.opt.glow, TX.opt.glowHint, 'flumeGlow'],
  ];
  const rowOn = (k) => (k === 'surges' ? cfg.surges : !!(GFX && GFX.flumeGlow !== false));
  function syncBtn(b, k) { const on = rowOn(k); b.textContent = on ? 'On' : 'Off'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('sel', on); }
  function setSwitch(k, v) {
    if (k === 'surges') { cfg.surges = !!v; saveCfg(); } else {
      GFX.flumeGlow = !!v;
      try { if (typeof PRESETS !== 'undefined') GFX.preset = PRESETS.current(); GFX.changed(); if (typeof PRESETS !== 'undefined' && PRESETS.refresh) PRESETS.refresh(); } catch (e) { /* menu closed */ }
    }
    for (const [id, , , kk] of ROWS) { const b = typeof document !== 'undefined' && document.getElementById(id); if (b) syncBtn(b, kk); }
    return rowOn(k);
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p16f-opt-surges')) return;
    let anchor = document.getElementById('sk14-opt-caustics') || document.getElementById('rp-toggle') || document.getElementById('ac-cap');
    for (const [id, label, hint, k] of ROWS) {
      const lab = document.createElement('span'); lab.className = 'gfx-label'; lab.id = id + '-label'; lab.textContent = label + ' ';
      const small = document.createElement('small'); small.className = 'muted'; small.textContent = hint; lab.appendChild(small);
      const b = document.createElement('button'); b.className = 'dfbtn small'; b.id = id; b.type = 'button'; b.setAttribute('aria-label', label);
      b.onclick = () => setSwitch(k, !rowOn(k));
      syncBtn(b, k);
      if (anchor && anchor.parentNode) { anchor.insertAdjacentElement('afterend', b); anchor.insertAdjacentElement('afterend', lab); anchor = b; }
      else { grid.appendChild(lab); grid.appendChild(b); }
    }
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _f = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _f.apply(this, arguments);
      try { appendRows(); } catch (er) { console.warn('flume16 rows failed', er); }
      return r;
    };
  }

  // ---------------------------------------------------------------- wiring: wrappers, never edits
  function resetRun() { T.met = false; T.phase = 'quiet'; T.t = B.FIRST; T.caught = false; T.bleedHud = 0; T.waves.length = 0; }
  function wrap() {
    if (typeof useDeco === 'function') {
      const _f = useDeco;
      useDeco = function (e) {
        try { if (e && typeof e.use === 'string' && e.use.indexOf('p16f_') === 0 && onUse(e)) return; } catch (er) { console.warn('flume16 use failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof wallLabel === 'function') {
      const _f = wallLabel;
      wallLabel = function (cell) { if (cell && cell.p16fRing && typeof cell.p16fLook !== 'string') return TX.road.wall; return _f.apply(this, arguments); };
    }
    if (typeof attack === 'function') {
      const _f = attack;
      attack = function () {
        let pre = null;
        try { pre = beforeStrike(); } catch (er) { pre = null; }
        const r = _f.apply(this, arguments);
        try { if (pre) afterStrike(pre); } catch (er) { console.warn('flume16 ring failed', er); }
        return r;
      };
    }
    if (typeof castSong === 'function') {
      const _f = castSong;
      castSong = function (id) {
        const p = G.player, s = typeof SONGS !== 'undefined' ? SONGS[id] : null, before = p ? p.voice : 0;
        const r = _f.apply(this, arguments);
        try {
          if (p && s && id === 'root' && G.mapId === 'flume_landing' && fint('lock') === 0 && G.song.t > 0 && before - p.voice >= (s.cost || 0) - 0.01) {
            const c = Engine.cam;
            if (Math.hypot(c.x - LANDING.wheel[0], c.y - LANDING.wheel[1]) <= 3.4) openLock('song');
          }
        } catch (er) { console.warn('flume16 song failed', er); }
        return r;
      };
    }
    if (typeof damagePlayer === 'function') {
      const _f = damagePlayer;
      damagePlayer = function (dmg, src) {
        const r = _f.apply(this, arguments);
        try { if (src === ENEMY_DEFS.briarsprite.name && !G.dead) briarHit(); } catch (er) { console.warn('flume16 briar failed', er); }
        return r;
      };
    }
    if (typeof update === 'function') {
      const _f = update;
      update = function (dt) {
        let pre = null;
        try { pre = beforeUpdate(dt); } catch (er) { console.warn('flume16 pre-tick failed', er); }
        const r = _f.apply(this, arguments);
        try { afterUpdate(dt, pre); ohhAudio(); } catch (er) { console.warn('flume16 tick failed', er); }
        return r;
      };
    }
    if (typeof drawHUD === 'function') {
      const _f = drawHUD;
      drawHUD = function () {
        const r = _f.apply(this, arguments);
        try {
          if (T.bleedHud > 0 && G.player && G.state !== 'title' && !(typeof PARISH !== 'undefined' && PARISH.T && PARISH.T.sever > 0)) {
            const ctx = Engine.ctx, y0 = VIEW_H;
            ctx.fillStyle = '#0e0a07'; ctx.fillRect(157, y0 + 36, 62, 9);
            ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e08070'; ctx.fillText(TX.sprite.hud + ' ' + Math.ceil(T.bleedHud), 188, y0 + 42);
          }
        } catch (er) { console.warn('flume16 hud failed', er); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _f = loadMap;
      loadMap = function (id, pos) {
        const from = typeof G !== 'undefined' ? G.mapId : null;
        try {
          ensureCoats();
          validate();
          if (inMine(id) && greening()) {                // the Hedge has closed: a stale or hostile save lands at the gate
            id = 'oakhaven'; pos = { x: 67.4, y: 51.5, dir: Math.PI };
          }
          if (inMine(id)) applyMapState(id);
        } catch (er) { console.warn('flume16 load failed', er); }
        const r = _f.call(this, id, pos);
        try {
          if (inMine(G.mapId)) {
            if (!inMine(from)) { resetRun(); clearWaves(); syncFloor(); }
            applyMapState(G.mapId); arrive();
            // back on the road mid-surge (by the lane from the Landing): loading drops transient props, so the wall of
            // water would be missing until the next cycle. Stand it up again as it was (Phase 16 polish).
            if (G.mapId === 'flume_road' && T.waves.length && T.waves.some((w) => G.map.entities.indexOf(w) < 0)) {
              const ph = T.phase; raiseWaves();
              for (const w of T.waves) w.scale = w.top;
              if (ph === 'drain') lowerWaves();
            }
          }
        } catch (er) { console.warn('flume16 arrival failed', er); }
        return r;
      };
    }
    if (typeof buildAllMaps === 'function') {
      const _f = buildAllMaps;
      buildAllMaps = function () {
        const maps = _f.apply(this, arguments);
        try {
          ensureCoats();
          maps.flume_road = buildRoad(); maps.flume_landing = buildLanding(); maps.flume_lowrings = buildRings();
          resetRun();
          if (maps.oakhaven) hookOakhaven(maps.oakhaven);
        } catch (er) { console.warn('flume16 maps failed', er); }
        return maps;
      };
    }
    if (typeof buildOakhaven === 'function') {
      const _f = buildOakhaven;
      buildOakhaven = function () {
        const m = _f.apply(this, arguments);
        try { hookOakhaven(m); } catch (er) { console.warn('flume16 gate failed', er); }
        return m;
      };
    }
    if (typeof startGame === 'function') { const _f = startGame; startGame = function () { resetRun(); return _f.apply(this, arguments); }; }
    if (typeof restoreGame === 'function') { const _f = restoreGame; restoreGame = function () { resetRun(); return _f.apply(this, arguments); }; }
  }

  function state() {
    return { phase: T.phase, t: T.t, met: T.met, caught: T.caught, ohh: Object.assign({}, T.ohh), bleed: T.bleedHud, waves: T.waves.length, cfg: Object.assign({}, cfg) };
  }
  const CARDS = { flume_road: 'hedge', flume_landing: 'street', flume_lowrings: 'street' };
  function init() {
    loadCfg();
    paintTextures(); paintProps(); paintFoes(); installCatalog(); installNpcs();
    wrap(); wrapSell(); wireTravel(); wireStory(); wireLog();
    if (typeof Engine !== 'undefined' && Engine.addPostHook) Engine.addPostHook(glowHook, 27);
    // arrival cards (js/screens.js): an unlisted outdoor map falls back to the 'woods' painting (a burning boat in a
    // forest). Name the right existing paintings instead: the road leaves by the Hedge; the Landing and the Low Rings
    // are wet lanes of a town at night (Phase 16 polish).
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) Object.assign(SCREENS.FAMILY, CARDS); } catch (e) { /* no cards */ }
    if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenu); else wireMenu();
  }
  init();

  return {
    FP, KEY, MAPS, B, T, TX, LIST, FLAGS, LANDING, RINGS, ROWS, ENEMY_DEFS, ITEM_DEFS, NPC_DEFS, GATE, cfg,
    state, fint, setf, validate, greening, applyMapState, openLock, useWheel, onUse, completeLock, ringOut, briarHit, tickBleed,
    setPhase, tickClock, surgeActive, inZone, ohhNow, ohhMix, ohhAudio, ohhSource, glowHook, setSwitch, appendRows, syncFloor, raiseWaves, clearWaves,
    pathH, chanH, pathAt, buildRoad, buildLanding, buildRings, hookOakhaven, beforeUpdate, afterUpdate, timberAt, pellamQuest, orrinQuest, resetRun,
    RUMOUR_DEFS, GAZETTE_ITEMS, OA, CARDS, GROWN, grownAt,
  };
})();
if (typeof window !== 'undefined') window.FLUME16 = FLUME16;
