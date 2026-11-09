// ============================================================
//  roads15 — Phase 15 "The province moves", team ROADS: three things that happen to the world while you are not looking.
//
//  1. ROADSIDE EVENTS on a world-map journey (T). The journey itself is untouched: travelGo() still takes the same
//     hours and lands you at the same place. This module only wraps it. After a trip that raised no ambush, one roll on
//     a private seeded stream (never Math.random) may pick ONE event; at most one per trip. The event is a small panel
//     that opens when the picture of the walk ends (the figure halts short of the mark, as it does for an ambush, but
//     without the red alarm):
//       broken cart   Help mend it (half an hour, a Strength-or-Intelligence check) for a few sovereigns and a line, or pass.
//       refugees      Before the Greening: families leaving the Reach. Share a meal (honey, bread, curd, eel) for a little
//                     Hedge standing and a rumour. After it: no refugees, the road's graves instead (a line, no mechanics).
//       checkpoint    Reach, before the Greening: a Synod checkpoint. Papers (a disguise / standing check), a toll, or
//                     turn back. Failing the check gets your pack searched: contraband (the Office grapnel, goods you
//                     stole) is confiscated, the grapnel also earns a small bounty. It NEVER blocks you: every outcome
//                     ends with you on the road to where you were going, and Turn back is always offered. Quest items
//                     (ITEMS[x].key) are never taken.
//  2. FIRE AND REBUILDING [PROPOSED]. A flask fire (js/kit12.js) that burns beside one of four generic, unnamed houses for
//     3 s sets it alight (a story event may call ROADS15.ignite). It burns 5 h (flames, smoke through js/firesmoke.js),
//     stands charred (a wall-decal char, persisted by flags) for 3 days, is scaffolded and worked on by builders in the
//     daytime for 6 days, then is whole again. Never a shop, never a story building, never the Greening's Oakhaven. A
//     charred house has one townsfolk line. Arson seen by a neighbour or a constable is a heavy bounty.
//  3. LASTING LOSSES [PROPOSED]. The game had no way for an unnamed townsperson to die (the player's blows are nonlethal
//     and enemies only ever go for the player), so this adds the smallest one: an enemy that is in a chase, is closer to
//     an unnamed townsperson than to you, and stays within reach of them for 2 s, cuts them down. They stay dead for the
//     save (a bitmask by home position), their routines go with them, and a neighbour says one line the next day.
//     Named and story people are never in the table. The town cannot empty (see BAL.loss.floor).
//
//  Everything is switchable in Options (Graphics & access) and, off, plays exactly as before. Saved state is a handful of
//  small integers under p15r_ (validated on every load). Nothing here draws on Math.random.
//  Procedural stand-in art: the char decals, the scaffold and the ash heap are painted in code.
// ============================================================
'use strict';

const ROADS15 = (() => {
  // ---- the one balance table ------------------------------------------------------------------------------------
  const BAL = {
    events: {
      rate: { oakhaven: 0.14, clearing: 0.22, whispergrove: 0.18, deepwoods: 0.22 },   // chance per trip before the modifiers
      rateOther: 0.16,
      pace: { cautious: 0.85, reckless: 1 },
      lenMins: 60, lenMin: 0.5, lenMax: 1.5,                    // the trip's length scales it: clamp(minutes / 60)
      cap: 0.6,                                                  // never more than this
      weights: { before: { cart: 40, refugees: 35, checkpoint: 25 }, after: { cart: 50, graves: 50 } },
      ttl: 45,                                                   // seconds a waiting event is kept
      cart: { hours: 0.5, base: 0.25, perPoint: 0.006, max: 0.85, gold: [5, 12], failGold: 2, xp: 6 },
      refugees: { hedge: 2, foods: ['p12_hearth_bread', 'p12_moot_curd', 'p12_flume_eel', 'flume_eel', 'honey'] },
      checkpoint: {
        base: 0.4, disguise: 0.45, synod: 0.3, office: 0.2, bounty: -0.25, bountyAt: 40, min: 0.1, max: 0.95,
        toll: 8, feeFail: 5, delay: 0.25, grapnelBounty: 30,
      },
    },
    fire: {
      reach: 2, dwell: 3,                                        // a flask fire this close (tiles from the footprint) for this long (s)
      burnHours: 5, charHours: 72, rebuildHours: 144,            // burning / charred (from the start) / scaffolded
      maxActive: 2,                                              // never more than two houses in trouble at once
      arson: 90,                                                 // a witnessed fire at a house (kit12's street fire is +35 on top)
      flames: 5, smokePerSec: 7, smokeSlow: 1.2, lineRange: 7,
      workFrom: 8, workTo: 16, workers: 2,
    },
    loss: {
      reach: 1.1, time: 2, perDay: 1, tick: 0.1, lineRange: 10,
      floor: { folk: 8, watch: 1, law: 1 },                      // at least this many of each kind are always alive (of 12 / 2 / 2)
    },
  };
  const FLAG = 'p15r_';
  const KEY = 'octave.roads15.v1';
  const set = { events: true, fire: true, loss: true };
  const stats = { trips: 0, events: 0, fires: 0, deaths: 0, refused: 0, errors: 0 };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player && G.flags;
  const frac = (x) => x - Math.floor(x);

  // ---- persistence of the three switches ------------------------------------------------------------------------
  function loadSet() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object') for (const k of Object.keys(set)) if (typeof o[k] === 'boolean') set[k] = o[k]; } catch (e) { /* storage blocked: defaults */ }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) { /* optional */ } }

  // ---- seeded randomness: a hash and mulberry32; never Math.random ---------------------------------------------
  function hash32(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const worldSeed = () => { try { return hash32(String(G.player.name || '') + '|' + String((G.player.cls && G.player.cls.id) || '') + '|p15r'); } catch (e) { return 1; } };

  // ---- flags: small validated integers --------------------------------------------------------------------------
  function fint(key, lo, hi) {
    const f = hasG() ? G.flags : null; if (!f) return lo;
    const v = f[key];
    return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : lo;
  }
  function wint(key, v) { if (hasG()) G.flags[key] = v; }
  const clockHours = () => (Number(G.day) || 0) * 24 + (Number(G.tod) || 0) * 24;
  const greened = () => !!(hasG() && (G.flags.greening || G.flags.part3 || G.flags.part4));

  // ---- every sentence this module shows ([PROPOSED], listed in P15-ROADS/TEXT.md; French in tools/i18n/p15-roads.tsv) --
  const TX = {
    optHead: 'The province moves',
    optEvents: 'Roadside events', optEventsHint: 'now and then a broken cart, refugees, a Synod checkpoint or a road\'s graves on a world-map journey',
    optFire: 'Fire and rebuilding', optFireHint: 'a house set alight in Oakhaven stays charred, then is scaffolded and rebuilt over days',
    optLoss: 'Lasting losses', optLossHint: 'an unnamed townsperson killed by enemies stays dead for the save',
    on: 'On', off: 'Off',
    hint2: '1 first choice · 2 second choice · Escape goes on without. Controller: A first, X second, B goes on.',
    hint3: '1 first choice · 2 second choice · 3 third choice · Escape goes on without. Controller: A first, X second, Y third, B goes on.',
    hint3back: '1 first choice · 2 second choice · 3 third choice · Escape turns back. Controller: A first, X second, Y third, B turns back.',
    hintOk: 'Enter, Space or Escape goes on. Controller: A or B.',
    cont: 'Go on',
    sceneAt: 'On the road to',
    paused: 'The road ahead is not clear.',
    paid: 'You are paid {0} sovereigns.', paidSmall: 'He presses {0} sovereigns on you for your trouble.',
    spent: 'You spend {0} sovereigns.', spentOn: 'It costs you {0} sovereigns.',
    lostItem: 'They take: {0}.', hedgeUp: 'The Hedge folk will hear of it. (+2 Hedge standing)',
    timeHalf: 'Half an hour goes.', timeQuarter: 'A quarter of an hour goes.',
    bountyUp: 'It goes in a book. (+{0} Oakhaven bounty)',
    cart: {
      title: 'A cart in the ditch',
      sceneReach: 'A carter\'s cart lies canted in the ditch with a wheel off. The carter is trying to lift the axle with his shoulder, and the pony, who has had enough, is eating the verge.',
      sceneWoods: 'A reed-cutter\'s hand-cart has dropped its axle-pin in the moss. Its owner is on his knees feeling for it in the leaf-mould, and he does not look up.',
      help: 'Help mend it (about half an hour)', pass: 'Go round',
      ok: [
        'Between you, you get the wheel back on and the pin through. He raps the rim and listens. "True enough," he says, and presses coin on you that he can plainly ill spare.',
        'The axle goes up on your shoulder and the wheel goes on. He drives the pin home with a stone. "Does it ring?" "True enough." He will not be argued out of paying you.',
        'It takes the two of you, a lever of green ash and a good deal of Reach language. The wheel holds. He counts out a few coins and will not look at you while he does it.',
      ],
      fail: 'You get the wheel on, and then the pin shears and it all comes off again. You hold the cart up while he finds another pin. It is not the help either of you wanted, and he thanks you for it anyway.',
      passed: 'You go round. Behind you the carter says nothing, which carries a surprising way down a road.',
    },
    refugees: {
      title: 'Families on the road',
      scene: 'Families from the outlying farms are walking out of the Reach: bundles on their backs, a goat on a string, children carried and children walking very straight. None of them looks back at the Hedge. A woman stops in front of you and does not quite ask.',
      share: 'Share your food', shareNone: 'Share your food (you have none)', wish: 'Wish them well',
      shared: [
        'She takes it in both hands. The children do not thank you; they are eating. Going on, over her shoulder, she says: "The reeds at Ketter\'s Ford stopped sounding on Memoryday. Not one of them. We did not wait to see the rest."',
        'She takes it in both hands. The children do not thank you; they are eating. Going on, over her shoulder, she says: "They called three parishes to the Greenhall. Two came. The third sent a note saying they had stopped being able to send. We are going where there are still Cantors."',
        'She takes it in both hands. The children do not thank you; they are eating. Going on, over her shoulder, she says: "The timber wagons don\'t creak any more. They hum. Tomas says it is only the wood. Tomas always says it is only the wood."',
      ],
      wished: 'You wish them well. She nods as if you had given her something, which is kind of her, and the line goes on down the road.',
      journal: 'Families from the outlying farms are leaving the Reach by the south road. I shared my food with them and heard what they know. Nobody would say where they are going, only that it is away.',
    },
    graves: {
      title: 'The road\'s graves',
      lines: [
        'A row of stones along the verge, each with a reed driven in beside it. None of the reeds sound. Someone has been keeping the grass cut.',
        'Eleven small cairns where the road bends. No names. The nearest has a child\'s boot set on it, laced.',
        'A wheel stood upright in the earth, rim to the sky, for a carter who did not get as far as the Grove.',
        'Someone has hung a cut reed on a post at every tenth grave. It is for the Last Note. The family holds it in silence now, because the note does not carry.',
        'A new mound, and on its stone a name scratched with a nail. Beneath it, smaller, in another hand: "Come back for it."',
      ],
    },
    checkpoint: {
      title: 'A Synod checkpoint',
      scene: 'A trestle across the road, two Proctors in grey oilcloth, and a clerk at a folding desk with a brass plate that says RECONCILIATION. "Papers," the clerk says, to the air a little to one side of you. "For the record." Behind the trestle the road goes on.',
      papers: 'Show your papers', toll: 'Pay the toll (8 sovereigns)', tollNone: 'Pay the toll (8 sovereigns, you have not got it)', back: 'Turn back',
      passed: 'The clerk looks at the paper and not at you. "Reconciled," he says, and lifts the trestle with one finger. The Proctors regard the middle distance, as they are trained to.',
      passedRobe: 'The robes do the talking. The clerk glances at your collar, writes something that is not your name, and has the trestle raised. One of the Proctors nods to you, as to a colleague.',
      searched: 'The clerk\'s eye stops on you. "Voluntary declaration of property," he says, in the voice of a man reading from a card, and a Proctor opens your pack. They take what is not yours to carry, write it down, and thank you for your cooperation.',
      grapnel: 'The Proctor holds the grapnel gun up to the light. "Office issue. OC-742." The clerk makes a note. "That will be a matter for the Catalogue." You are not detained. That is somehow worse.',
      clean: 'They go through your pack with the care of men who expect to find nothing and be thanked for looking. They find nothing. "A processing fee," says the clerk, "of five sovereigns. For the delay." The road is slower for it.',
      tolled: 'The clerk counts the coins without looking at them and writes the word "receipt". "A toll is not a bribe," he says. "It is a toll." The trestle goes up. No one searches you.',
      crime: 'possession of Office property',
      turned: 'You turn round. "Noted," says the clerk, and notes it. The road home is the same road it was, only longer.',
    },
    fire: {
      catch: 'The oil-fire licks up a wall and into the eaves. The house takes with a sound like a long indrawn breath.',
      arson: 'arson',
      doorBurnt: 'The door is charred through and wedged shut with a length of timber. Nobody is humming.',
      doorBuilding: 'New timber is stacked against the wall and the whole place smells of the saw. The door is barred. Nobody is humming yet.',
      labelBurnt: 'A burnt house', labelBuilding: 'A house being rebuilt',
      lines: [
        'A neighbour, to no one in particular: "Nobody was in, thank the reeds. We carried the pump up from the Flume by hand, and it was all for the walls next door."',
        'A neighbour, not stopping: "The roof went first. You could hear the tiles, ringing. I have not heard anything ring like that in two years."',
        'A neighbour, with a bucket: "They are staying with the cooper\'s people. They took the reed from over the door. It had stopped sounding long ago, but they took it."',
        'A neighbour, looking at the char: "Black to the eaves. It will be spring before it is a house again. If there is a spring."',
      ],
    },
    loss: {
      folkM: 'What was chasing you reaches a townsman before anyone can call out. It is over quickly, and the lane goes quiet where he was.',
      folkF: 'What was chasing you reaches a townswoman before anyone can call out. It is over quickly, and the lane goes quiet where she was.',
      watch: 'What was chasing you reaches a night-watchman before he can lift his lantern. The lantern rolls a little way, and stops.',
      law: 'What was chasing you reaches a constable before he can reach his whistle. The street is very still afterwards.',
      journal: 'Something followed me into Oakhaven and killed one of the townsfolk. I brought it. Nobody has said so.',
      next: [
        'A neighbour stops you, not meaning to. "We buried him this morning, by the Hedge, face to the road. Nobody sang. We have mostly stopped, in the lanes."',
        'A neighbour, quietly: "Her door is open and her bread is still on the board. Nobody likes to be the one to shut it."',
        'A neighbour, to the air: "The watch is a man short, and the street is a good deal longer."',
        'A neighbour, folding a cloth: "They took him in the day, in plain sight. You would think a town would shout. We just stood there and held the sound in."',
      ],
    },
  };

  // =============================================================================================================
  //  1. ROADSIDE EVENTS
  // =============================================================================================================
  let pending = null;            // { plan, dest:{name,map}, origin:{mapId,x,y,dir}, born, paused }
  let open = null;               // the panel that is up: { plan, stage, res, sel }
  let tripAmbushed = false;
  let forced = null;             // a test hook: the next trip that raises no ambush gets exactly this event
  let heldArrive = null;
  const E = BAL.events;

  function eventRate(ctx) {
    const base = Object.prototype.hasOwnProperty.call(E.rate, ctx.map) ? E.rate[ctx.map] : E.rateOther;
    const pace = ctx.pace === 'cautious' ? E.pace.cautious : E.pace.reckless;
    const len = clamp((Number(ctx.mins) || 0) / E.lenMins, E.lenMin, E.lenMax);
    return Math.min(E.cap, base * pace * len);
  }
  // Pure: the same trip on the same save always gives the same answer. ctx = { world, trips, dest, map, mins, pace, day, after }
  function planEvent(ctx) {
    const r = rng32(hash32(`${ctx.world}|${ctx.trips}|${ctx.dest}|${ctx.day}`));
    const rate = eventRate(ctx);
    const roll = r();
    if (roll >= rate) return null;
    const w = E.weights[ctx.after ? 'after' : 'before'];
    const keys = Object.keys(w); let total = 0; for (const k of keys) total += w[k];
    let x = r() * total, type = keys[keys.length - 1];
    for (const k of keys) { if (x < w[k]) { type = k; break; } x -= w[k]; }
    return { type, seed: (r() * 4294967296) >>> 0, rate, roll, trips: ctx.trips };
  }

  function installTravel() {
    if (typeof travelGo !== 'function') return;
    if (typeof travelAmbush === 'function') {
      const _amb = travelAmbush;
      travelAmbush = function () {
        const n0 = G.ents ? G.ents.length : 0;
        const r = _amb.apply(this, arguments);
        try { if (G.ents && G.ents.length > n0) tripAmbushed = true; } catch (e) { /* cosmetic */ }
        return r;
      };
    }
    const _go = travelGo;
    travelGo = function (d) {
      if (!set.events || !d || !hasG()) return _go.apply(this, arguments);
      let ctx = null;
      try {
        if (!travelBlocked()) {
          const c = Engine.cam;
          ctx = { world: worldSeed(), trips: fint(FLAG + 'trips', 0, 99999), dest: d.name, map: d.map, mins: travelMinutes(d), pace: TRAVEL.pace, day: G.day, after: greened(),
            origin: { mapId: G.mapId, x: c.x, y: c.y, dir: c.dir } };
        }
      } catch (e) { ctx = null; }
      tripAmbushed = false;
      const r = _go.apply(this, arguments);
      try { if (ctx && G.mapId === d.map) afterTrip(ctx, d); } catch (e) { stats.errors++; console.warn('roads15 trip failed', e); }
      return r;
    };
  }
  function afterTrip(ctx, d) {
    stats.trips++;
    wint(FLAG + 'trips', clamp(ctx.trips + 1, 0, 99999));
    if (tripAmbushed) return;                                    // an ambush is this trip's event
    const plan = forced || planEvent(ctx);
    forced = null;
    if (!plan) return;
    pending = { plan, dest: { name: d.name, map: d.map }, origin: ctx.origin, born: now(), paused: false };
  }
  const now = () => (typeof performance !== 'undefined' ? performance.now() / 1000 : Date.now() / 1000);

  // The picture of the walk: the figure halts short of the mark (no red alarm: that is for an ambush).
  function installPicture() {
    if (typeof openModal !== 'function') return;
    const _om = openModal;
    openModal = function (html, name) {
      const r = _om.apply(this, arguments);
      try { if (name === 'travelanim' && pending && !pending.paused) queueMicrotask(pauseFigure); } catch (e) { /* cosmetic */ }
      return r;
    };
  }
  function pauseFigure() {
    try {
      const A = typeof MOTION10 !== 'undefined' && MOTION10.travel && MOTION10.travel.state && MOTION10.travel.state.anim;
      if (!A || !A.plan || !pending || pending.paused || A.plan.ambush) return;
      pending.paused = true;
      A.plan.stopU = 0.6 + 0.3 * frac(pending.plan.seed / 4294967296);
      A.plan.roadEvent = pending.plan.type;
      const watch = () => {
        const cur = MOTION10.travel.state.anim;
        if (!cur || cur !== A || A.done) return;
        const el = document.getElementById('tva-note');
        if (el && A.note === 'Arrived.' && el.textContent !== TX.paused) el.textContent = TX.paused;
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    } catch (e) { /* cosmetic */ }
  }

  // ---- the check numbers ---------------------------------------------------------------------------------------
  function cartChance() {
    const a = G.player.attrs || {}, C = E.cart;
    const score = Math.max(Number(a.Strength) || 0, Number(a.Intelligence) || 0);
    return clamp(C.base + score * C.perPoint, C.base, C.max);
  }
  function disguiseOn() { try { return typeof wearingDisguise === 'function' && wearingDisguise() && !disguiseExposed(); } catch (e) { return false; } }
  function papersChance() {
    const C = E.checkpoint, fac = (G.player.factions) || {};
    let c = C.base;
    if (disguiseOn()) c += C.disguise;
    c += clamp((Number(fac.synod) || 0) / 100, -1, 1) * C.synod + clamp((Number(fac.office) || 0) / 100, -1, 1) * C.office;
    try { if (crimeState().bounty >= C.bountyAt) c += C.bounty; } catch (e) { /* no law state */ }
    return clamp(c, C.min, C.max);
  }
  function foodItem() { for (const id of E.refugees.foods) if (typeof ITEMS !== 'undefined' && ITEMS[id] && G.has(id)) return id; return null; }

  // ---- contraband: the Office grapnel and anything you took that was not yours -----------------------------------
  const STOLEN = FLAG + 's_';
  function stolenCounts() {
    const out = {}; if (!hasG()) return out;
    for (const k of Object.keys(G.flags)) {
      if (k.indexOf(STOLEN) !== 0) continue;
      const id = k.slice(STOLEN.length), v = G.flags[k];
      if (typeof ITEMS !== 'undefined' && Object.prototype.hasOwnProperty.call(ITEMS, id) && !ITEMS[id].key && Number.isInteger(v) && v >= 1 && v <= 9) out[id] = v;
    }
    return out;
  }
  function contraband() {
    const out = [];
    if (typeof ITEMS !== 'undefined' && ITEMS.p12_grapnel && G.has('p12_grapnel')) out.push({ id: 'p12_grapnel', n: 1, grapnel: true });
    const s = stolenCounts();
    for (const id of Object.keys(s)) { const have = G.count ? G.count(id) : 0; if (have > 0) out.push({ id, n: Math.min(have, s[id]), stolen: true }); }
    return out;
  }
  function noteStolen(id) {
    if (!hasG() || typeof ITEMS === 'undefined' || !ITEMS[id] || ITEMS[id].key) return;
    const k = STOLEN + id;
    if (Object.keys(stolenCounts()).length >= 6 && !G.flags[k]) return;     // bounded
    wint(k, clamp(fint(k, 0, 9) + 1, 1, 9));
  }
  function installTheft() {
    if (typeof pickUp !== 'function') return;
    const _pu = pickUp;
    pickUp = function (e, theftConfirmed) {
      const r = _pu.apply(this, arguments);
      try { if (theftConfirmed === true && e && e.owner && e.item && e.dead) noteStolen(e.item); } catch (x) { /* optional */ }
      return r;
    };
  }

  // ---- resolutions: the exact rules. choice 0/1/2; opts.roll pins the check (tests), opts.silent skips the log ------
  function say(text, cls, ttl) { try { if (typeof msg === 'function') msg(text, cls || '', ttl || 5200); } catch (e) { /* cosmetic */ } }
  function fmt(s, ...a) { return s.replace(/\{(\d)\}/g, (m, i) => (a[+i] == null ? '' : String(a[+i]))); }
  function pay(n) { if (typeof G.gold === 'function') G.gold(n); else G.player.gold = (Number(G.player.gold) || 0) + n; }
  function spend(n) { const have = Number(G.player.gold) || 0; const t = Math.min(have, n); G.player.gold = have - t; return t; }
  function giveXp(n) { try { G.player.xp += n; if (typeof checkLevel === 'function') checkLevel(); } catch (e) { /* ignore */ } }

  const RES = {
    cart(plan, choice, opts) {
      const r = rng32(plan.seed), r0 = r(), roll = opts && opts.roll != null ? opts.roll : r0, pick = r(), pay1 = r();
      const C = E.cart, out = { type: 'cart', choice, texts: [], effects: [], after: null };
      if (choice !== 0) { out.texts.push(TX.cart.passed); out.outcome = 'passed'; return out; }
      passHours(C.hours); out.effects.push(TX.timeHalf);
      const chance = cartChance(); out.chance = chance;
      if (roll < chance) {
        const gold = C.gold[0] + Math.floor(pay1 * (C.gold[1] - C.gold[0] + 1));
        pay(gold); giveXp(C.xp);
        out.texts.push(TX.cart.ok[Math.floor(pick * TX.cart.ok.length) % TX.cart.ok.length]); out.effects.push(fmt(TX.paid, gold));
        out.outcome = 'mended'; out.gold = gold;
      } else {
        pay(C.failGold);
        out.texts.push(TX.cart.fail); out.effects.push(fmt(TX.paidSmall, C.failGold));
        out.outcome = 'failed'; out.gold = C.failGold;
      }
      return out;
    },
    refugees(plan, choice, opts) {
      const r = rng32(plan.seed), pick = r();
      const out = { type: 'refugees', choice, texts: [], effects: [], after: null };
      const food = choice === 0 ? foodItem() : null;
      if (choice !== 0 || !food) { out.texts.push(TX.refugees.wished); out.outcome = 'wished'; return out; }
      G.take(food);
      try { changeRep('hedge', E.refugees.hedge); } catch (e) { /* standing is a bonus */ }
      out.texts.push(TX.refugees.shared[Math.floor(pick * TX.refugees.shared.length) % TX.refugees.shared.length]);
      out.effects.push(TX.hedgeUp);
      out.outcome = 'shared'; out.food = food;
      const n = fint(FLAG + 'ref', 0, 9);
      wint(FLAG + 'ref', clamp(n + 1, 0, 9));
      if (n === 0 && !(opts && opts.silent)) { try { journal('side', TX.refugees.journal); } catch (e) { /* ignore */ } }
      return out;
    },
    graves(plan) {
      const r = rng32(plan.seed);
      return { type: 'graves', choice: 0, texts: [TX.graves.lines[Math.floor(r() * TX.graves.lines.length) % TX.graves.lines.length]], effects: [], after: null, outcome: 'seen' };
    },
    checkpoint(plan, choice, opts) {
      const r = rng32(plan.seed), r0 = r(), roll = opts && opts.roll != null ? opts.roll : r0;
      const C = E.checkpoint, T = TX.checkpoint, out = { type: 'checkpoint', choice, texts: [], effects: [], after: null };
      if (choice === 2) { out.texts.push(T.turned); out.after = 'back'; out.outcome = 'turned'; return out; }
      if (choice === 1) {
        if ((Number(G.player.gold) || 0) < C.toll) { out.texts.push(T.passed); out.outcome = 'refused'; return RES.checkpoint(plan, 0, opts); }
        spend(C.toll); out.texts.push(T.tolled); out.effects.push(fmt(TX.spentOn, C.toll)); out.outcome = 'tolled'; return out;
      }
      const chance = papersChance(); out.chance = chance;
      if (roll < chance) { out.texts.push(disguiseOn() ? T.passedRobe : T.passed); out.outcome = 'passed'; return out; }
      // the pack is searched: contraband goes, nothing else, and never a quest item
      const bad = contraband(), taken = [];
      for (const c of bad) { for (let i = 0; i < c.n; i++) G.take(c.id); taken.push(ITEMS[c.id].name); }
      for (const c of bad) if (c.stolen) { const k = STOLEN + c.id; const left = fint(k, 0, 9) - c.n; if (left > 0) wint(k, left); else if (hasG()) delete G.flags[k]; }
      out.taken = bad.map(c => c.id);
      if (bad.length) {
        out.texts.push(T.searched);
        const gr = bad.find(c => c.grapnel);
        if (gr) {
          out.texts.push(T.grapnel);
          try { reportCrime(T.crime, C.grapnelBounty); out.effects.push(fmt(TX.bountyUp, C.grapnelBounty)); } catch (e) { /* no law state */ }
        }
        out.effects.push(fmt(TX.lostItem, taken.join(', ')));
        out.outcome = 'confiscated';
      } else {
        out.texts.push(T.clean);
        const t = spend(C.feeFail); out.effects.push(fmt(TX.spentOn, t)); out.fee = t;
        out.outcome = 'fee';
      }
      passHours(C.delay); out.effects.push(TX.timeQuarter);
      return out;
    },
  };
  function resolve(plan, choice, opts) { const f = RES[plan.type]; return f ? f(plan, choice, opts || {}) : null; }

  // ---- the panel -----------------------------------------------------------------------------------------------
  let styled = false;
  function injectStyle() {
    if (styled || typeof document === 'undefined') return; styled = true;
    const st = document.createElement('style'); st.id = 'roads15-style';
    st.textContent = '#modal-panel .p15r p{margin:.8cqh 0}#modal-panel .p15r .p15r-fx{color:var(--gold,#d9a441);font-style:italic}#modal-panel .p15r .btns{margin-top:1.4cqh}#modal-panel .p15r .btns button{display:block;width:100%;margin:.6cqh 0;text-align:left}';
    document.head.appendChild(st);
  }
  function el(tag, props, text) { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; }
  function choicesFor(plan) {
    const C = TX[plan.type];
    if (plan.type === 'cart') return [{ t: C.help }, { t: C.pass, leave: true }];
    if (plan.type === 'refugees') { const f = foodItem(); return [{ t: f ? C.share : C.shareNone, off: !f }, { t: C.wish, leave: true }]; }
    if (plan.type === 'checkpoint') { const gold = Number(G.player.gold) || 0; return [{ t: C.papers }, { t: gold >= E.checkpoint.toll ? C.toll : C.tollNone, off: gold < E.checkpoint.toll }, { t: C.back, leave: true }]; }
    return [];
  }
  function sceneOf(plan) {
    const C = TX[plan.type];
    if (plan.type === 'cart') return plan.after ? C.sceneWoods : (plan.region === 'woods' ? C.sceneWoods : C.sceneReach);
    if (plan.type === 'graves') return null;
    return C.scene;
  }
  function openEvent() {
    if (!pending || !hasG()) return;
    injectStyle();
    const p = pending; pending = null;
    p.plan.after = greened();
    p.plan.region = (p.dest.map === 'whispergrove' || p.dest.map === 'deepwoods') ? 'woods' : 'reach';
    open = { plan: p.plan, dest: p.dest, origin: p.origin, stage: 'ask', res: null };
    stats.events++;
    G.state = 'panel';
    openModal('<div class="p15r"><h2 id="p15r-t"></h2><p class="muted" id="p15r-d"></p><p class="q" id="p15r-s"></p><div id="p15r-x"></div><div class="btns" id="p15r-b"></div><p class="muted" id="p15r-h"></p></div>', 'roadevent');
    renderStage();
  }
  function renderStage() {
    const O = open; if (!O) return;
    const plan = O.plan, C = TX[plan.type];
    document.getElementById('p15r-t').textContent = C.title;
    document.getElementById('p15r-d').textContent = TX.sceneAt;
    const d2 = document.getElementById('p15r-d'); d2.appendChild(document.createTextNode(' ')); d2.appendChild(el('span', null, O.dest.name));
    const sc = document.getElementById('p15r-s'), fxBox = document.getElementById('p15r-x'), bt = document.getElementById('p15r-b'), hint = document.getElementById('p15r-h');
    sc.textContent = ''; fxBox.textContent = ''; bt.textContent = '';
    if (O.stage === 'ask' && plan.type !== 'graves') {
      sc.textContent = sceneOf(plan);
      const ch = choicesFor(plan);
      O.choices = ch;
      ch.forEach((c, i) => {
        const b = el('button', { class: 'dfbtn', id: 'p15r-b' + i, type: 'button' }, c.t);
        if (c.off) b.disabled = true;
        b.onclick = () => pick(i);
        bt.appendChild(b);
      });
      hint.textContent = ch.length === 3 ? (ch[2].leave ? TX.hint3back : TX.hint3) : TX.hint2;
      const first = bt.querySelector('button:not([disabled])'); if (first) { try { first.focus(); } catch (e) { /* ignore */ } }
    } else {
      if (O.stage === 'ask') { O.res = resolve(plan, 0); O.stage = 'result'; }
      for (const t of O.res.texts) fxBox.appendChild(el('p', { class: 'q' }, t));
      for (const t of O.res.effects) fxBox.appendChild(el('p', { class: 'p15r-fx' }, t));
      const b = el('button', { class: 'dfbtn', id: 'p15r-ok', type: 'button' }, TX.cont);
      b.onclick = () => finish();
      bt.appendChild(b);
      hint.textContent = TX.hintOk;
      try { b.focus(); } catch (e) { /* ignore */ }
    }
  }
  function pick(i) {
    const O = open; if (!O || O.stage !== 'ask' || G.openPanel !== 'roadevent') return;
    const c = O.choices && O.choices[i]; if (!c || c.off) return;
    O.res = resolve(O.plan, i); O.stage = 'result';
    renderStage();
  }
  function finish() {
    const O = open; if (!O) return;
    open = null;
    if (G.openPanel === 'roadevent') { try { closeModal(); } catch (e) { /* ignore */ } }
    if (G.state === 'panel') G.state = 'play';
    G.keys = {};
    if (O.res && O.res.after === 'back' && O.origin) {
      try { loadMap(O.origin.mapId, { x: O.origin.x, y: O.origin.y, dir: O.origin.dir }); } catch (e) { console.warn('roads15 turn-back failed', e); }
    }
  }
  // keyboard: while the panel is up, every key is ours
  window.addEventListener('keydown', (ev) => {
    if (typeof G === 'undefined' || G.openPanel !== 'roadevent' || !open) return;
    ev.stopImmediatePropagation();
    if (ev.repeat) { ev.preventDefault(); return; }
    const k = (ev.key || '').toLowerCase();
    if (open.stage === 'result') { if (k === 'enter' || k === ' ' || k === 'escape' || k === '1') { ev.preventDefault(); finish(); } return; }
    if (k === '1' || k === '2' || k === '3') { ev.preventDefault(); pick(+k - 1); return; }
    if (k === 'escape') { ev.preventDefault(); const ch = open.choices || []; const li = ch.findIndex(c => c.leave); if (li >= 0) pick(li); }
  }, true);
  // controller: A first, X second, Y third, B goes on (or the leave choice)
  let padPrev = [];
  function padNow() { try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* none */ } return null; }
  function padTick() {
    if (!open || G.openPanel !== 'roadevent') { padPrev = []; return; }
    const g = padNow(); if (!g) return;
    const btn = (i) => !!(g.buttons[i] && g.buttons[i].pressed), edge = (i) => btn(i) && !padPrev[i];
    if (open.stage === 'result') { if (edge(0) || edge(1)) finish(); }
    else {
      const ch = open.choices || [];
      if (edge(0)) pick(0); else if (edge(2)) pick(1); else if (edge(3)) pick(2);
      else if (edge(1)) { const li = ch.findIndex(c => c.leave); if (li >= 0) pick(li); }
    }
    for (let i = 0; i < 16; i++) padPrev[i] = btn(i);
  }
  function pump() {
    if (open && G.openPanel !== 'roadevent') {                    // something else closed it: the quiet way on
      const O = open; open = null;
      if (O.stage === 'ask') { try { O.res = resolve(O.plan, (O.choices || []).findIndex(c => c.leave) >= 0 ? O.choices.findIndex(c => c.leave) : 0); } catch (e) { /* ignore */ } }
    }
    if (!pending) return;
    if (now() - pending.born > E.ttl || G.mapId !== pending.dest.map) { pending = null; return; }
    if (G.state !== 'play' || G.openPanel || G.dead) return;
    const A = typeof MOTION10 !== 'undefined' && MOTION10.travel && MOTION10.travel.state && MOTION10.travel.state.anim;
    if (A) return;
    openEvent();
  }

  // =============================================================================================================
  //  2. FIRE AND REBUILDING
  // =============================================================================================================
  // Four generic Oakhaven houses (js/maps.js buildings): unnamed, no shop, no story. Never the Tarrows' (house13), Cooper's
  // Row (the one the player can buy), the Boar, the mill, the tannery or anything that is somebody's name.
  const F = BAL.fire;
  const BUILDINGS = [
    { key: 'east', label: 'A shuttered house', x: 40, y: 14, w: 3, h: 6, door: [40, 16] },
    { key: 'orchard', label: 'A shuttered house', x: 46, y: 39, w: 5, h: 4, door: [48, 39] },
    { key: 'meadow', label: 'A shuttered house', x: 38, y: 38, w: 5, h: 4, door: [38, 40] },
    { key: 'madders', label: 'The Madders\' house', x: 4, y: 27, w: 3, h: 6, door: [6, 29] },
  ];
  const CHAR = ['p15r_char_a', 'p15r_char_b', 'p15r_char_c'], BURN = 'p15r_burn';
  const MINE_DECALS = new Set(CHAR.concat([BURN]));
  const props = BUILDINGS.map(() => ({ list: [], stage: 'none', workers: [], keyed: '' }));
  const saved = new WeakMap();    // map -> { ci: original decal name | null }

  function buildingAt(m, b) {
    if (!m || m.id !== 'oakhaven' || m.w !== 70 || m.h !== 64) return null;
    const dc = m.cells[b.door[1] * m.w + b.door[0]];
    if (!dc || !dc.door || (dc._p15 ? dc._p15.label : dc.label) !== b.label) return null;
    if (dc.portal) return null;                                  // a building you can enter is somebody's
    return dc;
  }
  function ringCells(m, b) {
    const out = [];
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      if (!(x === b.x || x === b.x + b.w - 1 || y === b.y || y === b.y + b.h - 1)) continue;
      if (x === b.door[0] && y === b.door[1]) continue;
      const c = m.cells[y * m.w + x]; if (!c || c.door) continue;
      out.push(y * m.w + x);
    }
    return out;
  }
  function outward(b) {
    const [dx, dy] = b.door;
    if (dx === b.x) return [-1, 0]; if (dx === b.x + b.w - 1) return [1, 0];
    if (dy === b.y) return [0, -1]; return [0, 1];
  }
  function stageOf(i) {
    if (!set.fire || !hasG() || greened()) return 'none';
    const v = fint(FLAG + 'b' + i, 0, 9999999);
    if (!v) return 'none';
    const start = Math.min(v - 1, Math.floor(clockHours()));      // a hostile save cannot start a fire in the future
    const age = clockHours() - start;
    if (age < F.burnHours) return 'burning';
    if (age < F.charHours) return 'charred';
    if (age < F.charHours + F.rebuildHours) return 'scaffold';
    return 'rebuilt';
  }
  const activeCount = () => BUILDINGS.reduce((n, b, i) => { const s = stageOf(i); return n + (s === 'burning' || s === 'charred' || s === 'scaffold' ? 1 : 0); }, 0);

  function setDecal(m, ci, name) {
    let sv = saved.get(m); if (!sv) { sv = Object.create(null); saved.set(m, sv); }
    if (!m._decalsAll) m._decalsAll = {};
    const base = m._decalsAll;
    if (name) { if (!(ci in sv)) sv[ci] = base[ci] || null; base[ci] = name; }
    else if (ci in sv) { if (sv[ci]) base[ci] = sv[ci]; else delete base[ci]; delete sv[ci]; }
    for (const t of [m.decals, m._l10dec]) {                      // the tables look10 and greening14 keep as private copies
      if (!t || t === base) continue;
      if (name) t[ci] = name; else if (MINE_DECALS.has(t[ci])) { if (base[ci]) t[ci] = base[ci]; else delete t[ci]; }
    }
  }
  function charName(ci, burning) {
    const h = hash32('c' + ci);
    if (burning) return h % 3 === 0 ? CHAR[h % CHAR.length] : BURN;
    return (h % 7 === 0) ? null : CHAR[h % CHAR.length];          // a few faces escape the soot
  }
  function applyWalls(m, i, stage) {
    const b = BUILDINGS[i], ring = ringCells(m, b);
    for (const ci of ring) {
      const want = stage === 'burning' ? charName(ci, true) : (stage === 'charred' || stage === 'scaffold') ? charName(ci, false) : null;
      setDecal(m, ci, want);
    }
    if (typeof DECALS !== 'undefined' && DECALS.sync && !m.decals && typeof GFX !== 'undefined' && GFX.decals) DECALS.sync(m);
  }
  function applyDoor(m, i, stage) {
    const b = BUILDINGS[i], c = m.cells[b.door[1] * m.w + b.door[0]]; if (!c || !c.door) return;
    if (!c._p15) { if (c.label !== b.label) return; c._p15 = { label: c.label, lockMsg: c.lockMsg }; }
    if (stage === 'charred' || stage === 'burning') { c.label = TX.fire.labelBurnt; c.lockMsg = TX.fire.doorBurnt; }
    else if (stage === 'scaffold') { c.label = TX.fire.labelBuilding; c.lockMsg = TX.fire.doorBuilding; }
    else { c.label = c._p15.label; c.lockMsg = c._p15.lockMsg; }
  }
  const sprite = (name) => (typeof Engine !== 'undefined' && Engine.sprites ? Engine.sprites[name] : null);
  const decoEnt = (spr, x, y, scale, extra) => Object.assign({ kind: 'deco', sprite: spr, x, y, scale, solid: false, radius: 0.1, nopick: true, transient: true, _decor: true, _p15r: true }, extra || {});
  const freeAt = (m, x, y) => !m.isBlocked(x | 0, y | 0) && !m.isBlocked((x + 0.3) | 0, y | 0) && !m.isBlocked((x - 0.3) | 0, y | 0) && !m.isBlocked(x | 0, (y + 0.3) | 0) && !m.isBlocked(x | 0, (y - 0.3) | 0);
  function ringSpots(b, gap) {
    // points just outside each side, every ~1.6 tiles, skipping the doorway
    const out = [], [ox, oy] = outward(b), dc = [b.door[0] + 0.5, b.door[1] + 0.5];
    const add = (x, y) => { if (Math.hypot(x - dc[0] - ox * gap, y - dc[1] - oy * gap) > 1.3) out.push([x, y]); };
    for (let x = b.x + 0.8; x < b.x + b.w; x += 1.6) { add(x, b.y - gap); add(x, b.y + b.h + gap); }
    for (let y = b.y + 0.8; y < b.y + b.h; y += 1.6) { add(b.x - gap, y); add(b.x + b.w + gap, y); }
    return out;
  }
  function makeProps(m, i, stage) {
    const b = BUILDINGS[i], P = props[i], [ox, oy] = outward(b);
    const fx = b.door[0] + 0.5 + ox * 0.9, fy = b.door[1] + 0.5 + oy * 0.9;
    const list = [];
    if (stage === 'burning' && sprite('p12_flames')) {
      const spots = [[fx, fy], [fx - oy * 0.9, fy + ox * 0.9], [fx + oy * 0.9, fy - ox * 0.9]];
      for (const s of ringSpots(b, 0.55)) if (spots.length < F.flames) spots.push(s);
      let first = true;
      for (const [x, y] of spots) {
        if (!freeAt(m, x, y)) continue;
        const e = decoEnt('p12_flames', x, y, 0.85, { glow: 0.95, label: 'A house on fire', yOff: 0 });
        if (first) { e.lightCol = [110, 54, 12]; first = false; }
        list.push(e);
      }
    }
    if ((stage === 'charred' || stage === 'scaffold' || stage === 'burning') && sprite('p15r_ash')) {
      for (const [x, y] of [[fx - oy * 0.55, fy + ox * 0.55], [fx + oy * 0.7, fy - ox * 0.7]]) if (freeAt(m, x, y)) list.push(decoEnt('p15r_ash', x, y, 0.5, { label: 'Charred timbers' }));
    }
    if (stage === 'scaffold' && sprite('p15r_scaffold')) {
      for (const [x, y] of ringSpots(b, 0.6)) if (freeAt(m, x, y)) list.push(decoEnt('p15r_scaffold', x, y, 0.95, { label: 'Scaffolding' }));
    }
    P.list = list;
    return list;
  }
  function makeWorkers(m, i) {
    const b = BUILDINGS[i], P = props[i], [ox, oy] = outward(b), out = [];
    const fx = b.door[0] + 0.5 + ox * 1.6, fy = b.door[1] + 0.5 + oy * 1.6;
    const spots = [[fx - oy * 1.1, fy + ox * 1.1], [fx + oy * 1.1, fy - ox * 1.1], [fx + ox * 0.8, fy + oy * 0.8]];
    let n = 0;
    for (const [x, y] of spots) {
      if (n >= F.workers || !freeAt(m, x, y)) continue;
      const id = n % 2 ? 'townswoman' : 'townsman', def = typeof NPCS !== 'undefined' ? NPCS[id] : null; if (!def) continue;
      const e = { kind: 'npc', id, x, y, sprite: def.sprite, scale: def.scale || 1, solid: false, radius: 0.35, facing: Math.atan2(b.y + b.h / 2 - y, b.x + b.w / 2 - x), transient: true, _p15r: true, _p15work: n + 1, hidden: true };
      if (typeof hydrate === 'function') hydrate(e);
      out.push(e); n++;
    }
    P.workers = out;
    return out;
  }
  function clearProps(i) {
    const P = props[i];
    for (const e of P.list.concat(P.workers)) { const k = G.ents ? G.ents.indexOf(e) : -1; if (k >= 0) G.ents.splice(k, 1); }
    P.list = []; P.workers = [];
  }
  function inEnts(e) { return G.ents && G.ents.includes(e); }
  function syncBuilding(m, i, stage) {
    const P = props[i];
    if (P.stage !== stage || P.map !== m) {
      clearProps(i);
      applyWalls(m, i, stage); applyDoor(m, i, stage);
      P.stage = stage; P.map = m; P.visit = -1;
    }
    if (G.mapId !== 'oakhaven' || m !== G.map) return;
    const want = stage === 'burning' || stage === 'charred' || stage === 'scaffold';
    if (!want) { if (P.list.length || P.workers.length) clearProps(i); return; }
    // props are transient (loadMap clears them), so each visit to the town builds them again
    if (P.visit !== visit || (P.list.length && !inEnts(P.list[0]))) {
      clearProps(i);
      for (const e of makeProps(m, i, stage)) G.ents.push(e);
      if (stage === 'scaffold') for (const e of makeWorkers(m, i)) G.ents.push(e);
      P.visit = visit;
    }
  }
  function syncFire() {
    if (!hasG()) return;
    const m = G.maps && G.maps.oakhaven; if (!m) return;
    for (let i = 0; i < BUILDINGS.length; i++) {
      if (!buildingAt(m, BUILDINGS[i])) continue;
      let stage = 'none';
      try { stage = stageOf(i); } catch (e) { stage = 'none'; }
      if (stage === 'rebuilt') stage = 'none';
      syncBuilding(m, i, stage);
    }
  }
  function workHour() { const h = (((G.tod % 1) + 1) % 1) * 24; return h >= F.workFrom && h < F.workTo; }
  function tickWorkers() {
    const on = workHour();
    for (let i = 0; i < BUILDINGS.length; i++) for (const e of props[i].workers) if (!e.dead && e.hidden === on) e.hidden = !on;
  }

  function validateBuilding(i) {
    const m = hasG() && G.maps && G.maps.oakhaven; return !!(m && BUILDINGS[i] && buildingAt(m, BUILDINGS[i]));
  }
  // by: 'flask' (the player's fire; a witness reports it) or 'story' (an event; no one to blame)
  function ignite(i, by) {
    if (typeof i === 'string') i = BUILDINGS.findIndex(b => b.key === i);
    if (!set.fire || !hasG() || greened() || i < 0 || i >= BUILDINGS.length || !validateBuilding(i)) return false;
    if (stageOf(i) !== 'none' || fint(FLAG + 'b' + i, 0, 9999999)) return false;            // each house burns once, ever
    if (activeCount() >= F.maxActive) return false;
    wint(FLAG + 'b' + i, Math.floor(clockHours()) + 1);
    stats.fires++;
    if (G.mapId === 'oakhaven') say(TX.fire.catch, 'bad', 6000);
    if (by === 'flask') {
      try { if (typeof lawActive === 'function' && lawActive() && typeof theftWitness === 'function' && theftWitness(null)) reportCrime(TX.fire.arson, F.arson); } catch (e) { /* no law state */ }
    }
    syncFire();
    return true;
  }
  function nearFootprint(b, x, y) {
    const dx = Math.max(b.x - x, 0, x - (b.x + b.w)), dy = Math.max(b.y - y, 0, y - (b.y + b.h));
    return Math.hypot(dx, dy);
  }
  function tickFire(dt) {
    // a flask fire (js/kit12.js) that has burned beside a house for a few seconds takes it
    if (typeof KIT12 !== 'undefined' && KIT12.fires && KIT12.fires.length && G.mapId === 'oakhaven' && !greened()) {
      for (const f of KIT12.fires) {
        if (f.map !== 'oakhaven') continue;
        if ((f.dur - f.left) < F.dwell) continue;
        for (let i = 0; i < BUILDINGS.length; i++) if (nearFootprint(BUILDINGS[i], f.x, f.y) <= F.reach) { if (ignite(i, 'flask')) break; }
      }
    }
    syncFire();
    tickWorkers();
    if (G.mapId !== 'oakhaven') return;
    // smoke: columns from the roof while it burns, a thin thread while it smoulders
    if (typeof FIRESMOKE !== 'undefined' && FIRESMOKE.spawn && typeof GFX !== 'undefined' && GFX.smoke) {
      const c = Engine.cam, m = G.map;
      for (let i = 0; i < BUILDINGS.length; i++) {
        const s = props[i].stage; if (s !== 'burning' && (s !== 'charred' || clockHours() - (fint(FLAG + 'b' + i, 0, 9999999) - 1) > F.burnHours + 18)) continue;
        const b = BUILDINGS[i], cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        if ((cx - c.x) ** 2 + (cy - c.y) ** 2 > 18 * 18) continue;
        props[i].acc = (props[i].acc || 0) + dt * (s === 'burning' ? F.smokePerSec : F.smokeSlow);
        while (props[i].acc >= 1) {
          props[i].acc -= 1;
          const z = 1.9, a = (hash32(i + ':' + Math.floor(G.time * 7)) % 628) / 100, d = (b.w + b.h) * 0.08;
          try { FIRESMOKE.spawn(0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, z, 0, 0, s === 'burning' ? 0.9 : 0.5, s === 'burning' ? 3.4 : 2.6, 0.2, 0.7, s === 'burning' ? 0.5 : 0.3, 0, z + 3.6); } catch (e) { /* cosmetic */ }
        }
      }
      void m;
    }
    // the charred house's one line, from a neighbour, the first time you come near
    const c = Engine.cam;
    for (let i = 0; i < BUILDINGS.length; i++) {
      const s = props[i].stage; if (s !== 'charred' && s !== 'scaffold') continue;
      const bit = 1 << i, said = fint(FLAG + 'bs', 0, 15);
      if (said & bit) continue;
      const b = BUILDINGS[i];
      if (nearFootprint(b, c.x, c.y) <= F.lineRange) { wint(FLAG + 'bs', said | bit); say(TX.fire.lines[i % TX.fire.lines.length], 'voice', 8000); }
    }
  }

  // ---- the art (procedural stand-ins) ---------------------------------------------------------------------------
  const px = (r, g, b, a) => (((a == null ? 255 : a) << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  function h2(ix, iy, seed) { let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, seed) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); const a = h2(x0, y0, seed), b = h2(x0 + 1, y0, seed), c = h2(x0, y0 + 1, seed), d = h2(x0 + 1, y0 + 1, seed); return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy; }
  function paintChar(seed, burning) {
    // soot rising from windows and eaves in ragged streaks: dense at the top, thinning to bare wall near the foot
    const T = 64, d = new Uint32Array(T * T);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const streak = vn(x / 3.2, y / 22, seed), blot = vn(x / 9, y / 9, seed + 7), grain = vn(x / 2, y / 2, seed + 13);
      const v = 0.95 - (y / T) * 0.62 + (streak - 0.5) * 0.9 + (blot - 0.5) * 0.5;
      if (v < 0.42) continue;
      if (burning && v < 0.5 && grain > 0.45) { const g = 120 + (grain - 0.45) * 280; d[y * T + x] = px(255, g, 30, 235); continue; }   // a live edge
      const dark = clamp((v - 0.42) * 1.6, 0, 1), s = 14 + (1 - dark) * 38 + grain * 14;
      d[y * T + x] = px(s * 1.05, s * 0.92, s * 0.85, 190 + dark * 60);
    }
    return d;
  }
  function buildArt() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.addSprite) return;
    if (!Engine.textures || !Engine.textures[CHAR[0]]) { /* addTexture is idempotent by name */ }
    CHAR.forEach((n, i) => Engine.addTexture(n, paintChar(11 + i * 5, false)));
    Engine.addTexture(BURN, paintChar(31, true));
    const sp = (name, w, h, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const data = new Uint32Array(w * h);
      const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) data[y * w + x] = c; };
      draw(put); Engine.addSprite(name, { w, h, data, hs: 1, cx: 0.5, dy: 0 });
    };
    // scaffolding: two poles, three planks, a brace and rope lashings (procedural stand-in)
    sp('p15r_scaffold', 36, 48, (put) => {
      const wood = px(150, 112, 70), dark = px(92, 66, 40), light = px(184, 146, 96), rope = px(206, 184, 130);
      for (let y = 2; y < 48; y++) { for (const x of [4, 5, 30, 31]) put(x, y, x % 2 ? dark : wood); }
      for (const y of [14, 28, 42]) for (let x = 1; x < 35; x++) { put(x, y, light); put(x, y + 1, wood); put(x, y + 2, dark); }
      for (let i = 0; i < 30; i++) { put(6 + i * 0.8, 42 - i * 0.9, wood); put(6 + i * 0.8, 43 - i * 0.9, dark); }
      for (const y of [13, 27, 41]) for (const x of [4, 31]) { put(x - 1, y, rope); put(x + 1, y, rope); put(x, y - 1, rope); }
    });
    // a heap of charred timbers with a few embers (procedural stand-in)
    sp('p15r_ash', 30, 16, (put) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 30; x++) {
        const dx = (x - 14.5) / 14.5, dy = (y - 10) / 6.2;
        if (dx * dx + dy * dy > 1) continue;
        const n = h2(x, y, 5);
        put(x, y, n > 0.93 ? px(220, 90, 24) : n > 0.5 ? px(30, 26, 24) : px(52, 44, 40));
      }
      for (let i = 0; i < 4; i++) for (let x = 3 + i * 6; x < 12 + i * 6; x++) { const y = 9 - ((x * 7 + i) % 5) - (i & 1); put(x, y, px(18, 15, 14)); put(x, y + 1, px(40, 34, 30)); }
    });
    try { if (Engine.sprites.p15r_ash) Engine.sprites.p15r_ash._p15r = true; } catch (e) { /* ignore */ }
  }

  // builders hammer: a small bob on the figure, nothing that moves them
  function installWorkAnim() {
    if (typeof animCreature !== 'function') return;
    const _an = animCreature;
    animCreature = function (e, dt, T) {
      _an.apply(this, arguments);
      if (!e._p15work || e.hidden || (typeof GFX !== 'undefined' && GFX.reduceMotion)) return;
      const t = (T + e._p15work * 1.7) % 3.4;
      if (t < 2.4) { const k = Math.sin(t * 8.2); e.animSkew += 0.04 * k; e.animSY -= 0.03 * Math.max(0, k); e.animLift -= 0.004 * Math.max(0, k); }
    };
  }

  // =============================================================================================================
  //  3. LASTING LOSSES
  // =============================================================================================================
  const L = BAL.loss;
  // 12 townsfolk, 2 night-watch, 2 constables. The index is the bit; the position is the build's own (js/maps.js, js/upgrades.js).
  const HOMES = [
    { id: 'townsman', x: 50.5, y: 32.5, k: 'folk' }, { id: 'townsman', x: 58.5, y: 36.5, k: 'folk' }, { id: 'townswoman', x: 49.5, y: 20.5, k: 'folk' },
    { id: 'townswoman', x: 56.5, y: 15.5, k: 'folk' }, { id: 'townsman', x: 30.5, y: 55.5, k: 'folk' }, { id: 'townswoman', x: 8.5, y: 48.5, k: 'folk' },
    { id: 'townsman', x: 19.5, y: 23.5, k: 'folk' }, { id: 'townsman', x: 36.5, y: 25.5, k: 'folk' }, { id: 'townsman', x: 10.5, y: 30.5, k: 'folk' },
    { id: 'townswoman', x: 27.5, y: 19.5, k: 'folk' }, { id: 'townswoman', x: 9.5, y: 14.5, k: 'folk' }, { id: 'townswoman', x: 34.5, y: 34.5, k: 'folk' },
    { id: 'townsman', x: 23.5, y: 20.5, k: 'watch' }, { id: 'townswoman', x: 23.6, y: 44.4, k: 'watch' },
    { id: 'townsman', x: 52.5, y: 20.5, k: 'law' }, { id: 'townsman', x: 23.5, y: 9.5, k: 'law' },
  ];
  const KIND_TOTAL = { folk: 12, watch: 2, law: 2 };
  let homeMap = null, homeEnts = null;
  function eligible(e, h) {
    if (!e || e.kind !== 'npc' || e.transient || e.id !== h.id) return false;
    if (e.companion || e.requires || e.until || e.quest || e._p11t || e.guard) return false;
    if (h.k === 'folk') return !e.lawGuard && !e.nightWatch;
    if (h.k === 'watch') return !!e.nightWatch && !e.lawGuard;
    return !!e.lawGuard;
  }
  function homes() {
    const m = hasG() && G.maps && G.maps.oakhaven; if (!m) return [];
    if (homeMap === m && homeEnts) return homeEnts;
    const used = new Set(), out = [];
    for (let i = 0; i < HOMES.length; i++) {
      const h = HOMES[i]; let found = null, bd = 0.8;
      for (const e of m.entities) {
        if (used.has(e) || !eligible(e, h)) continue;
        const ex = e.homeX != null ? e.homeX : e.x, ey = e.homeY != null ? e.homeY : e.y, d = Math.hypot(ex - h.x, ey - h.y);
        if (d < bd) { bd = d; found = e; }
      }
      if (found) used.add(found);
      out.push(found);
    }
    homeMap = m; homeEnts = out;
    return out;
  }
  // the accepted dead: bits in order, a bit that would breach a floor is dropped (so a hostile mask cannot empty the town)
  function acceptedMask(raw) {
    const v = typeof raw === 'number' && Number.isInteger(raw) && raw > 0 ? (raw & 0xFFFF) : 0;
    const dead = { folk: 0, watch: 0, law: 0 };
    let out = 0;
    for (let i = 0; i < HOMES.length; i++) {
      if (!(v & (1 << i))) continue;
      const k = HOMES[i].k;
      if (KIND_TOTAL[k] - (dead[k] + 1) < L.floor[k]) continue;
      dead[k]++; out |= 1 << i;
    }
    return out;
  }
  const deadMask = () => (hasG() ? acceptedMask(G.flags[FLAG + 'dead']) : 0);
  function aliveCount(k) { let n = KIND_TOTAL[k]; const v = deadMask(); for (let i = 0; i < HOMES.length; i++) if (HOMES[i].k === k && (v & (1 << i))) n--; return n; }

  function removeFolk(e) {
    e.dead = true; e.hidden = true; e.solid = false; e.dying = false;
    const st = e._tfStandIn;
    if (st) { st.dead = true; st.hidden = true; st.solid = false; const tav = G.maps && G.maps.tavern; if (tav) { const k = tav.entities.indexOf(st); if (k >= 0 && k >= (tav.baseCount != null ? tav.baseCount : 0)) tav.entities.splice(k, 1); } e._tfStandIn = null; }
    e._tf = null;                                                // its routine is gone with it
  }
  function applyDead() {
    if (!set.loss || !hasG()) return;                              // the dead stay dead, Greening or no
    const v = deadMask(); if (!v) return;
    const list = homes();
    for (let i = 0; i < HOMES.length; i++) if ((v & (1 << i)) && list[i] && !(list[i].dead && list[i].hidden && list[i]._tf == null)) removeFolk(list[i]);
  }
  const lineKey = (i) => (HOMES[i].k === 'folk' ? (HOMES[i].id === 'townsman' ? 0 : 1) : HOMES[i].k === 'watch' ? 2 : 3);
  function slay(i, source) {
    if (typeof i !== 'number' || i < 0 || i >= HOMES.length || !set.loss || !hasG() || greened() || G.mapId !== 'oakhaven') return false;
    const list = homes(), e = list[i]; if (!e || e.dead) return false;
    const v = deadMask(); if (v & (1 << i)) return false;
    const k = HOMES[i].k;
    if (aliveCount(k) - 1 < L.floor[k]) { stats.refused++; return false; }                          // the town never empties
    if (fint(FLAG + 'dday', 0, 99999) === (Number(G.day) || 0) + 1) { stats.refused++; return false; }   // one a day at most
    wint(FLAG + 'dead', v | (1 << i));
    wint(FLAG + 'dday', clamp((Number(G.day) || 0) + 1, 1, 99999));
    stats.deaths++;
    try { if (typeof animSpawnDeath === 'function' && !e.hidden) animSpawnDeath(e); } catch (x) { /* cosmetic */ }
    removeFolk(e);
    const t = TX.loss;
    say(HOMES[i].k === 'folk' ? (HOMES[i].id === 'townsman' ? t.folkM : t.folkF) : HOMES[i].k === 'watch' ? t.watch : t.law, 'bad', 7000);
    if (fint(FLAG + 'dn', 0, 99) === 0) { try { journal('side', t.journal); } catch (x) { /* ignore */ } }
    wint(FLAG + 'dn', clamp(fint(FLAG + 'dn', 0, 99) + 1, 0, 99));
    void source;
    return true;
  }
  const maul = new WeakMap();      // townsperson -> seconds an enemy has been on them
  let lossAcc = 0;
  function maulable(en) {
    if (!en || en.kind !== 'enemy' || en.dead || en.hidden || en.state !== 'chase' || !en.def) return false;
    const d = en.def; if (d.quiet || d.hushkin || d.moth) return false;               // the Hush keeps, it never kills
    return Array.isArray(d.dmg) ? d.dmg[1] > 0 : (Number(d.dmg) || 0) > 0;
  }
  function tickLoss(dt) {
    if (!set.loss || greened() || G.mapId !== 'oakhaven') return;
    lossAcc += dt; if (lossAcc < L.tick) return;
    const step = lossAcc; lossAcc = 0;
    const list = homes(), c = Engine.cam;
    const foes = []; for (const en of G.ents) if (maulable(en)) foes.push(en);
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (!e || e.dead || e.hidden || (typeof DLG !== 'undefined' && DLG.ent === e && G.state === 'dialogue')) continue;
      let on = false;
      for (const en of foes) {
        const d = Math.hypot(en.x - e.x, en.y - e.y);
        if (d > L.reach + (en.radius || 0.35) * 0.3) continue;
        if (d >= Math.hypot(en.x - c.x, en.y - c.y)) continue;                         // it is after you, not them
        on = true; break;
      }
      const t = on ? (maul.get(e) || 0) + step : Math.max(0, (maul.get(e) || 0) - step * 2);
      maul.set(e, t);
      if (t >= L.time) { maul.set(e, 0); slay(i, 'enemy'); }
    }
    // the next day, a neighbour says one thing
    const dd = fint(FLAG + 'dday', 0, 99999);
    if (dd && (Number(G.day) || 0) >= dd && G.state === 'play') {
      const said = fint(FLAG + 'dsay', 0, 0xFFFF), v = deadMask();
      for (let i = 0; i < HOMES.length; i++) {
        if (!(v & (1 << i)) || (said & (1 << i))) continue;
        for (const e of list) if (e && !e.dead && !e.hidden && Math.hypot(e.x - c.x, e.y - c.y) < L.lineRange) {
          wint(FLAG + 'dsay', said | (1 << i)); say(TX.loss.next[lineKey(i) % TX.loss.next.length], 'voice', 9000); return;
        }
        break;
      }
    }
  }

  // =============================================================================================================
  //  wiring
  // =============================================================================================================
  function sanitize() {
    if (!hasG()) return;
    const f = G.flags;
    for (const k of Object.keys(f)) {
      if (k.indexOf(FLAG) !== 0) continue;
      const v = f[k];
      if (k === FLAG + 'trips') { f[k] = fint(k, 0, 99999); continue; }
      if (/^p15r_b[0-3]$/.test(k)) { f[k] = fint(k, 0, 9999999); if (!f[k]) delete f[k]; else f[k] = Math.min(f[k], Math.floor(clockHours()) + 1); continue; }
      if (k === FLAG + 'bs') { f[k] = fint(k, 0, 15); continue; }
      if (k === FLAG + 'dead') { f[k] = acceptedMask(v); if (!f[k]) delete f[k]; continue; }
      if (k === FLAG + 'dsay') { f[k] = fint(k, 0, 0xFFFF); continue; }
      if (k === FLAG + 'dday') { f[k] = fint(k, 0, 99999); continue; }
      if (k === FLAG + 'dn' || k === FLAG + 'ref') { f[k] = fint(k, 0, 99); continue; }
      if (k.indexOf(STOLEN) === 0) { const id = k.slice(STOLEN.length); if (!(typeof ITEMS !== 'undefined' && Object.prototype.hasOwnProperty.call(ITEMS, id) && !ITEMS[id].key && Number.isInteger(v) && v >= 1 && v <= 9)) delete f[k]; continue; }
      delete f[k];                                                // not ours
    }
    // the fires: at most two houses in trouble at once, however many a hostile save lists
    let live = 0; for (let i = 0; i < BUILDINGS.length; i++) { const s = stageOf(i); if (s === 'burning' || s === 'charred' || s === 'scaffold') { live++; if (live > F.maxActive) delete f[FLAG + 'b' + i]; } }
  }
  function syncAll() { try { sanitize(); } catch (e) { stats.errors++; } try { syncFire(); } catch (e) { stats.errors++; } try { applyDead(); } catch (e) { stats.errors++; } }
  let tickAcc = 0, visit = 0;
  function tick(dt) {
    pump();
    if (!hasG() || G.state !== 'play') return;
    tickAcc += dt; if (tickAcc < 0.1) return;
    const step = tickAcc; tickAcc = 0;
    if (set.fire) tickFire(step);
    if (set.loss) tickLoss(step);
  }

  function wrapGlobals() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { homeMap = null; homeEnts = null; } catch (e) { /* none */ }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () { visit++; const r = _lm.apply(this, arguments); try { syncAll(); } catch (e) { stats.errors++; } return r; };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () { homeMap = null; homeEnts = null; const r = _rg.apply(this, arguments); try { syncAll(); } catch (e) { stats.errors++; console.warn('roads15 restore failed', e); } return r; };
    }
    if (typeof passHours === 'function') {
      const _ph = passHours;
      passHours = function () { const r = _ph.apply(this, arguments); try { syncFire(); } catch (e) { stats.errors++; } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try { if (dt > 0) tick(dt); } catch (e) { stats.errors++; console.warn('roads15 tick failed', e); }
        return r;
      };
    }
    if (typeof controlsTick === 'function') {
      const _ct = controlsTick;
      controlsTick = function () { const r = _ct.apply(this, arguments); try { padTick(); } catch (e) { /* no pad */ } return r; };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendRows(); } catch (e) { console.warn('roads15 rows failed', e); } return r; };
    }
  }
  function setSwitch(k, on) {
    if (!(k in set)) return;
    set[k] = !!on; saveSet();
    try {
      if (hasG() && G.maps && G.maps.oakhaven) {
        const m = G.maps.oakhaven;
        if (k === 'fire') { for (let i = 0; i < BUILDINGS.length; i++) { if (!buildingAt(m, BUILDINGS[i])) continue; syncBuilding(m, i, set.fire ? (stageOf(i) === 'rebuilt' ? 'none' : stageOf(i)) : 'none'); } }
      }
      if (k === 'events' && !on) { pending = null; }
    } catch (e) { stats.errors++; }
  }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p15r-head')) return;
    grid.appendChild(el('span', { id: 'p15r-head', style: 'grid-column:1/-1;margin-top:1cqh;color:var(--gold);font-family:var(--font-display);letter-spacing:.08em' }, TX.optHead));
    const rows = [['events', TX.optEvents, TX.optEventsHint], ['fire', TX.optFire, TX.optFireHint], ['loss', TX.optLoss, TX.optLossHint]];
    for (const [k, label, hintText] of rows) {
      const lab = el('span', { class: 'gfx-label' }, label); lab.appendChild(document.createTextNode(' ')); lab.appendChild(el('small', { class: 'muted' }, hintText));
      const b = el('button', { class: 'dfbtn small', id: 'p15r-opt-' + k, type: 'button' }, '');
      const sync = () => { b.textContent = set[k] ? TX.on : TX.off; b.setAttribute('aria-pressed', set[k] ? 'true' : 'false'); b.classList.toggle('sel', set[k]); };
      b.setAttribute('aria-label', label);
      b.onclick = () => { setSwitch(k, !set[k]); sync(); };
      sync(); grid.appendChild(lab); grid.appendChild(b);
    }
  }

  // ---- init ----------------------------------------------------------------------------------------------------
  loadSet();
  try { buildArt(); } catch (e) { console.warn('roads15 art failed', e); }
  try { installTravel(); installPicture(); installTheft(); installWorkAnim(); wrapGlobals(); } catch (e) { console.warn('roads15 wiring failed', e); }

  return {
    BAL, TX, set, stats, BUILDINGS, HOMES, CHAR, BURN,
    planEvent, eventRate, resolve, RES, cartChance, papersChance, contraband, noteStolen, stolenCounts, foodItem,
    openEvent, pick, finish, pump,
    get pending() { return pending; }, set pending(v) { pending = v; }, get open() { return open; }, forceNext(plan) { forced = plan; },
    stageOf, ignite, activeCount, syncFire, buildingAt, ringCells, validateBuilding, props, tickFire, tickWorkers, workHour,
    slay, acceptedMask, deadMask, aliveCount, homes, applyDead, tickLoss, maulable,
    sanitize, syncAll, setSwitch, worldSeed, hash32, rng32,
  };
})();
if (typeof window !== 'undefined') window.ROADS15 = ROADS15;
