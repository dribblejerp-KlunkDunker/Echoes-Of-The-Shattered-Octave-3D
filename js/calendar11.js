// ============================================================
//  calendar11 — Phase 11 (feedback and feel): the calendar, the moon, birth signs, a recap, a profiler.
//
//  Six items, two kinds of switch (Options -> Graphics & access, each persisted under octave.calendar11.v1):
//   "Calendar events" (default On) governs 1-3 and, off, they do nothing at all:
//     1. THE CANON CALENDAR (Vol VII). G.day 0 is Nullday the sixth of Harvestmonth, 419 [PROPOSED: the day of month; the
//        weekday matches js/data.js DAYS and the Vol VII formula). Years are 12 x 30 days, weeks are 8. The clock panel of
//        the HUD and the logbook give the date in prose. The Rota: each weekday is one Anchor's duty, kept by one person,
//        quietly; the logbook names it and the generic Oakhaven townsfolk mention it. No prices change. Canopy, the first
//        Memoryday of Ashfall (G.day 31), is a quiet unofficial remembrance (not held openly since 416): a few lines only.
//     2. MARKET DAY. day%8 == 3 (every Massday). Oakhaven's east square gets 3-5 transient stalls with a vendor
//        each (the count is 3 + (2n+1)%3 for the n-th market, so the first has 4), selling 3 items each from a
//        pool, rotated by n. Prices are the shop formula at markup 0.9. Never after the Greening.
//     3. MOON PHASES. One phase a day, eight phases, a round of 8 days: phase index (day+3)%8, 0 = new, 4 = full.
//        The night sky gets the phase (a sky hook that shades the engine's moon disc) and the hound spawner
//        (spawnHound, js/game.js) is scaled by MOON_SPAWN[index]: new moon x1.25, full moon x0.75.
//   "Birth signs" (default On; a sign is chosen at creation, "None" is the default): 4.
//   "Previously..." recap (default On): 5.
//   "Performance overlay" (default Off, key F10): 6.
//
//  Saved state: one small integer, G.flags.p11c_sign (0/absent = no sign, 1..7 = Ionian..Locrian), validated
//  on every load. Stalls, vendors, the overlay and the recap are never saved. Everything else is derived from G.day.
//  Wrapped (never edited): talk, loadMap, restoreGame, spawnHound, renderLog, renderCharacter,
//  renderCreate, newPlayer, startGame, drawHUD, render, renderAccessibilityMenu.
//  Lore: dates follow LORE_P6 (Book One, 419 SR, autumn); everything invented is marked [PROPOSED].
// ============================================================
'use strict';

const CALENDAR11 = (function () {
  const KEY = 'octave.calendar11.v1';
  const $q = (s) => document.querySelector(s);
  const hasG = () => typeof G !== 'undefined' && G;
  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) { if (k === 'class') e.className = props[k]; else e.setAttribute(k, props[k]); }
    if (text != null) e.textContent = text;
    return e;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ================================================================ settings
  const cfg = { events: true, signs: true, recap: true, perf: false };
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of Object.keys(cfg)) if (typeof o[k] === 'boolean') cfg[k] = o[k];
    } catch (e) { /* no storage here: the defaults stand */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }
  if (typeof GFX !== 'undefined') {
    if (GFX.moonPhase === undefined) GFX.moonPhase = true;               // the moon's phase in the night sky (visual: Original turns it off)
    if (GFX.FX && !GFX.FX.includes('moonPhase')) GFX.FX.push('moonPhase');
  }

  // ================================================================ 1. the calendar
  const greened = () => !!(hasG() && G.flags && G.flags.greening);
  const dayNo = (d) => (d === undefined ? (hasG() ? G.day | 0 : 0) : d | 0);
  // Vol VII: 12 months x 30 days; day-of-year -> weekday index in the Rootday-first list is ((doy+3)%8)+1; the game's DAYS
  // starts at Nullday, so DAYS index = (doy+4)%8. Day 0 is Nullday: (270 + 6 + 4) % 8 == 0, so START_DOM = 6 [PROPOSED].
  const MONTHS = ['Stillmonth', 'Thawmonth', 'Seedmonth', 'Lambmonth', 'Reedmonth', 'Longsun', 'Dustmonth', 'Firstfruit', 'Sheafmonth', 'Harvestmonth', 'Ashfall', 'Frostmonth'];
  const WEEK = ['Nullday', 'Rootday', 'Hearthday', 'Massday', 'Stasisday', 'Dawnday', 'Driftday', 'Memoryday'];
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth', 'twenty-sixth', 'twenty-seventh', 'twenty-eighth', 'twenty-ninth', 'thirtieth'];
  const START_MONTH = 10, START_DOM = 6;
  const doyOf = (d) => (START_MONTH - 1) * 30 + START_DOM + Math.max(0, dayNo(d));    // day of the year, 1-based, may pass 360 (it wraps)
  function dateOf(d) {
    const doy = ((doyOf(d) - 1) % 360) + 1, month = Math.floor((doy - 1) / 30) + 1, dom = ((doy - 1) % 30) + 1;
    return { doy, month, dom, monthName: MONTHS[month - 1], weekday: WEEK[(doyOf(d) + 4) % 8], weekIdx: (doyOf(d) + 4) % 8 };
  }
  const dateProse = (d) => { const t = dateOf(d); return t.weekday + ' the ' + ORD[t.dom] + ' of ' + t.monthName; };
  const dateShort = (d) => { const t = dateOf(d); return 'The ' + ORD[t.dom] + ' of ' + t.monthName; };
  // [PROPOSED] the Rota lines: one Anchor's duty a day, one keeper, quietly. logbook line, then what townsfolk say.
  const ROTA = [
    { log: 'Nullday. The last duty of the week: one person sits at the quiet end of the town and keeps it. The rest of Oakhaven is careful to be elsewhere.', folk: 'It is Nullday. Somebody is keeping the quiet end today. I would not go and look.' },
    { log: 'Rootday. One person from the street goes to stand at a tree for the Root\'s hour, and says nothing.', folk: 'Rootday. Rootday. The tree is one neighbour\'s turn this week. They go alone. That is the whole of it.' },
    { log: 'Hearthday. One person keeps the hearth-stone warm for the Rota, and makes no feast of it.', folk: 'Hearthday. One of us keeps the stone warm. Nobody talks about it. It is better that way.' },
    { log: 'Massday. One person stands on the old floor of the square for the Mass duty, and stays until the weight is felt.', folk: 'Massday. Someone is standing on the square floor for the weight. Walk around them, if you would.' },
    { log: 'Stasisday. One person winds the dial in the square and names the hour once, softly.', folk: 'Stasisday. The dial gets wound by one hand, and the hour is said once. Do not say it again after.' },
    { log: 'Dawnday. One person opens a shutter to the first light and leaves it open an hour.', folk: 'Dawnday. Someone has the shutter today. You will see one window open on the whole street.' },
    { log: 'Driftday. One person walks the Flume channel end to end for the Velocity duty, quietly, and walks back.', folk: 'Driftday. The walker is out on the Flume bank. Walks there and back and never hurries.' },
    { log: 'Memoryday. One person says one name aloud at the Hedge side, and then stands there. Nobody asks whose.', folk: 'Memoryday. One of us says a name at the Hedge. We do not ask whose. We are good at not asking.' },
  ];
  // Canopy: the first Memoryday of Ashfall. Not held openly since 416; a few candles and lines, nothing official, no shop effect.
  const CANOPY = {
    oak: ['The Canopy Feast would fall today. It has not been held in the open since 416. A few candles stand at the backs of windows, and no one says what for.', 'Someone has left a lit candle on a doorstep with its back to the road.'],
    grove: ['The first Memoryday of Ashfall. Canopy. Nobody holds it in the Grove; someone has set a few small candles at the foot of the Weeping Canopy anyway, facing in.', 'A voice somewhere is reading names, quietly, and nobody tells it to stop.'],
    folk: ['Canopy would be today. We do not hold it. A candle is not a feast.', 'Do not look at the windows too long today. There are candles in some of them.'],
  };
  function isCanopy(d) { const t = dateOf(d); return t.month === 11 && t.weekIdx === 7 && t.dom <= 7; }
  const rotaOf = (d) => ROTA[dateOf(d).weekIdx];

  // ---- market day: every Massday (day%8 == 3), n-th market = (day-3)/8
  const marketIndex = (d) => { d = dayNo(d); return d >= 3 && d % 8 === 3 ? (d - 3) / 8 : -1; };
  const marketOn = (d) => cfg.events && marketIndex(d) >= 0;
  const stallCount = (n) => 3 + ((2 * n + 1) % 3);

  // ---- the moon: one phase a day, eight phases, a round of 8 days. 0 new, 2 first quarter, 4 full, 6 last quarter.
  const MOON_OFFSET = 3;   // the eight-day cycle itself is [PROPOSED]; canon (Vol VII) gives the calendar, not a moon;             // [PROPOSED] day 0 (Nullday, the arrival) is a waxing gibbous moon; day 1 is full, day 5 new, day 9 full
  const MOON_NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  // multiplier on how often the Hush's hounds come (js/game.js spawnHound): the dark nights are bolder, the lit ones slower
  const MOON_SPAWN = [1.25, 1.10, 1.00, 0.90, 0.75, 0.90, 1.00, 1.10];
  const MOON_LINES = [   // [PROPOSED] the in-world explanation, one per phase
    'No moon tonight. Old hunters say the Hush keeps closest when the sky is empty, and the hounds come bolder. They count the dark nights twice.',
    'A thin moon, waxing. The hounds are a little bolder than they will be a week from now.',
    'A half moon, rising. The hounds keep their ordinary hours.',
    'The moon is fattening. The hunters sleep a little easier.',
    'The moon is full. The Hush keeps further off when the sky is lit, the hunters say, and the hounds are slow to come.',
    'The moon is past full. The hounds are not yet hungry again.',
    'A half moon, falling. The hounds keep their ordinary hours.',
    'A thin moon, waning. The dark is coming back, and the dogs know it first.',
  ];
  const moonIndex = (d) => ((dayNo(d) + MOON_OFFSET) % 8 + 8) % 8;
  const moonName = (d) => MOON_NAMES[moonIndex(d)];
  const moonSpawnMult = (d) => (cfg.events ? MOON_SPAWN[moonIndex(d)] : 1);

  // ================================================================ event lines (1)
  const shownKey = {};                                  // day:map -> true, so an entry line is said once a visit
  const folkId = (id) => id === 'townsman' || id === 'townswoman';
  function entryLines(mapId) {
    const out = [], d = dayNo();
    if (greened()) {
      if (isCanopy(d) && mapId === 'whispergrove') out.push([CANOPY.grove[0], 'warn'], [CANOPY.grove[1], 'voice']);
      return out;
    }
    if (mapId === 'oakhaven') {
      out.push([rotaOf(d).log, 'warn']);
      if (isCanopy(d)) out.push([CANOPY.oak[0], 'warn'], [CANOPY.oak[1], 'voice']);
    }
    if (marketOn(d) && mapId === 'oakhaven') out.push([MARKET_LINE, 'warn']);
    return out;
  }
  const MARKET_LINE = 'Massday market. The east square has filled with stalls, awnings the colour of old wine and old moss. Everyone speaks at the volume of people who are not trying to.';   // [PROPOSED]
  const MARKET_FOLK = ['Market day. Take the good honey before the Boar\'s cook does.', 'Prices are fair on Massday. Everyone is watching everyone else\'s scales.', 'The stalls come up at dawn and are gone by dark. Funny how quiet a busy place can be.'];   // [PROPOSED]
  function sayEntry(mapId) {
    if (!cfg.events || !hasG() || typeof msg !== 'function') return;
    const key = dayNo() + ':' + mapId + ':' + (greened() ? 'g' : 'o');
    if (shownKey[key]) return;
    const lines = entryLines(mapId); if (!lines.length) return;
    shownKey[key] = true;
    lines.forEach(([t, c], i) => setTimeout(() => { try { msg(t, c, 7500); } catch (e) { /* cosmetic */ } }, i * 900));
  }
  // one line per (day, speaker) from the generic townsfolk, Oakhaven only and only before the Greening
  function folkLine(e) {
    if (!cfg.events || greened() || !e || !folkId(e.id) || !hasG() || G.mapId !== 'oakhaven') return null;
    const d = dayNo(), k = hash(d + ':' + Math.round(e.homeX * 10) + ':' + Math.round(e.homeY * 10));
    if (isCanopy(d)) return CANOPY.folk[k % CANOPY.folk.length];
    if (marketOn(d) && k % 2 === 0) return MARKET_FOLK[k % MARKET_FOLK.length];
    return rotaOf(d).folk;
  }
  function wireTalk() {
    if (typeof talk !== 'function') return;
    const _talk = talk;
    talk = function (e) {
      const r = _talk.apply(this, arguments);
      try {
        const line = folkLine(e);
        if (line && G.state === 'dialogue' && DLG && DLG.ent === e && DLG.log) { DLG.log.push({ who: 'them', t: line }); renderDialogue(DLG.choices ? 'choice' : null); }
      } catch (err) { console.warn('calendar11: townsfolk line failed', err); }
      return r;
    };
  }

  // ================================================================ 2. market stalls
  // Vendor kinds: a pool of catalog ids each, three of which are on the board, rotated by the market's number.
  // [PROPOSED] vendor names and their lines are new.
  const VENDORS = [
    { key: 'herb', name: 'Market herb-seller', sprite: 'townswoman', tint: [0.8, 1.0, 0.75], awning: [96, 128, 70], off: 0, pool: ['herb_willow', 'herb_reed', 'herb_moss', 'bandage', 'honey'],
      greet: ['Willow-bark, reed-pith, moss. Cut this morning, so it still remembers being green.', 'Herbs. Bandage-stuff, if you bleed.', 'Handle it or buy it. It bruises.'],
      hello: 'Market prices today, and honest weight. Ask the scale.', broke: 'Come back with coin, love. The herbs will wilt without you, but slowly.', thanks: ['Bind it clean.', 'Mind the bruising.', 'Fresh as a market gets.'] },
    { key: 'larder', name: 'Market provisioner', sprite: 'townsman', tint: [1.05, 0.85, 0.7], awning: [150, 70, 60], off: 2, pool: ['honey', 'flume_eel', 'tonic', 'herb_reed', 'empty_bottle'],
      greet: ['Eat something. You have the look of someone who has been listening too hard.', 'Honey, eel, tonic. Eat first, ask after.', 'Buy or stop breathing on the pies.'],
      hello: 'Market prices. The eel came out of the Flume this morning, green as a bruise and better than it looks.', broke: 'That will not stretch to a pie, friend.', thanks: ['Eat it warm.', 'Do not tell my wife what I charged.', 'Thank you, love.'] },
    { key: 'tinker', name: 'Market tinker', sprite: 'townsman', tint: [0.8, 0.85, 1.05], awning: [70, 84, 120], off: 1, pool: ['whetstone', 'bolts', 'tknives', 'pellets', 'empty_bottle', 'pebble'],
      greet: ['Mending, selling, sharpening. Mostly selling.', 'Edges and shot. Do not ask where the shot came from.', 'If it is loud, I do not stock it.'],
      hello: 'Market prices. Everything here is oiled so it will not creak. A creak is a word, out there.', broke: 'Short. Come back when the purse has caught up.', thanks: ['Keep it dry.', 'It will do what it says.', 'Mind the edge.'] },
    { key: 'odds', name: 'Oddments-seller', sprite: 'townswoman', tint: [1.0, 0.8, 1.05], awning: [118, 76, 118], off: 3, pool: ['whistle', 'bandage', 'empty_bottle', 'pebble', 'tonic'],
      greet: ['A little of everything, and the everything is mostly quiet.', 'Reeds, bottles, pebbles. Do not ask what the pebbles are for.', 'Look, do not breathe on it.'],
      hello: 'Market prices. Nothing here has ever been the right size for what you want it for.', broke: 'Not enough, dear. Try the pebbles. They are cheap.', thanks: ['A good choice, probably.', 'Thank you. Do not lose it.', 'Quietly now.'] },
    { key: 'fish', name: 'Flume fisher-wife', sprite: 'townswoman', tint: [0.75, 1.0, 0.95], awning: [60, 110, 100], off: 4, pool: ['flume_eel', 'honey', 'empty_bottle', 'pebble', 'bandage'],
      greet: ['Flume eel, the green sort. Do not worry about the colour. It is only the water.', 'Eel or nothing.', 'You smell of the Hedge. Buy an eel and I will forget.'],
      hello: 'Market prices. Pulled them out at first light, while the Flume was still talking to itself.', broke: 'The eel does not take credit, love.', thanks: ['Wrap it in dock-leaf.', 'Eat it today.', 'Bless the Flume.'] },
  ];
  const STALL_SPOTS = [[53.5, 19.8], [47.5, 19.8], [57.0, 18.0], [53.5, 15.2], [50.0, 14.9], [46.8, 16.4], [58.6, 14.9], [60.5, 17.8], [50.8, 20.2], [56.0, 14.9], [59.5, 20.2]];
  for (const v of VENDORS) v.id = 'p11c_' + v.key;
  function defineVendors() {
    if (typeof NPCS === 'undefined') return;
    for (const v of VENDORS) {
      if (NPCS[v.id]) continue;
      NPCS[v.id] = {
        name: v.name, sprite: v.sprite, portrait: v.sprite, tier: 'low', markup: 0.9,
        greet: { polite: v.greet[0], normal: v.greet[1], blunt: v.greet[2] }, topics: {},
        shop: [], shopTalk: { hello: v.hello, broke: v.broke, thanks: v.thanks, buys: ['consumable'] },
        quest: () => null,
      };
    }
  }
  // the three items a vendor of kind v has on the board at market n (deterministic, rotates by n)
  function stockFor(v, n) {
    const L = v.pool.length, start = ((2 * n + v.off) % L + L) % L, out = [];
    for (let i = 0; out.length < 3 && i < L; i++) { const id = v.pool[(start + i) % L]; if (ITEMS[id] && !out.includes(id)) out.push(id); }
    return out;
  }
  // which vendor kinds attend market n, in a fixed order that shifts by n
  function vendorsFor(n) {
    const c = stallCount(n), out = [];
    for (let i = 0; i < c; i++) out.push(VENDORS[(n + i) % VENDORS.length]);
    return out;
  }
  // procedural stand-in art: a striped awning over a counter of goods, and tinted copies of the townsfolk sprites
  const spriteDone = {};
  function ensureSprites() {
    if (typeof Engine === 'undefined' || !Engine.sprites || !Engine.addSprite) return false;
    for (const v of VENDORS) {
      const sn = 'p11c_stall_' + v.key;
      if (!spriteDone[sn]) {
        const w = 64, h = 56, data = new Uint32Array(w * h);
        const px = (r, g, b) => (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255);
        const rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < w && Y < h) data[Y * w + X] = c; } };
        const [ar, ag, ab] = v.awning, rnd = ((s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; })(hash(v.key));
        // posts and counter
        rect(5, 14, 2, 40, px(70, 52, 36)); rect(57, 14, 2, 40, px(70, 52, 36));
        rect(4, 36, 56, 16, px(98, 74, 50)); rect(4, 36, 56, 2, px(128, 100, 70)); rect(4, 50, 56, 2, px(60, 44, 30));
        // goods on the counter: little blocks in a few earth colours
        for (let i = 0; i < 9; i++) { const gx = 8 + i * 6 + ((rnd() * 2) | 0), gh = 3 + ((rnd() * 5) | 0), shade = 110 + ((rnd() * 90) | 0); rect(gx, 36 - gh, 4, gh, px(shade * (0.7 + i % 3 * 0.15), shade * 0.8, shade * (0.5 + (i % 2) * 0.3))); }
        // the awning: stripes, a scalloped hem
        for (let y = 2; y < 16; y++) for (let x = 1; x < 63; x++) {
          const stripe = ((x >> 3) & 1) === 0, k = stripe ? 1 : 0.62;
          const left = y - 2 > (x - 1) * 0.0;                       // flat roof
          if (left) data[y * w + x] = px(ar * k, ag * k, ab * k);
        }
        for (let x = 1; x < 63; x++) { const hem = 16 + (((x >> 2) & 1) ? 3 : 0); for (let y = 16; y < hem; y++) data[y * w + x] = px(ar * (((x >> 3) & 1) ? 0.62 : 1) * 0.85, ag * (((x >> 3) & 1) ? 0.62 : 1) * 0.85, ab * (((x >> 3) & 1) ? 0.62 : 1) * 0.85); }
        rect(1, 2, 62, 1, px(ar * 0.5, ag * 0.5, ab * 0.5));
        Engine.addSprite(sn, { w, h, data, hs: 1, cx: 0.5, dy: 0 });
        spriteDone[sn] = true;
      }
      const vn = 'p11c_vendor_' + v.key, src = Engine.sprites[v.sprite];
      if (!spriteDone[vn] && src && src.data) {
        const data = new Uint32Array(src.data.length);
        for (let i = 0; i < data.length; i++) {
          const p = src.data[i], a = p >>> 24; if (!a) continue;
          data[i] = ((a << 24) | (clamp((p >> 16 & 255) * v.tint[2], 0, 255) << 16) | (clamp((p >> 8 & 255) * v.tint[1], 0, 255) << 8) | clamp((p & 255) * v.tint[0], 0, 255)) >>> 0;
        }
        Engine.addSprite(vn, { w: src.w, h: src.h, data, hs: src.hs, cx: src.cx, dy: src.dy });   // no `img`: only the pixel data is read
        spriteDone[vn] = true;
      }
    }
    return true;
  }
  const stalls = { map: null, list: [], idx: -2 };       // what is currently placed
  const freeSpot = (m, x, y) => {
    if (m.isBlocked(x | 0, y | 0) || m.isBlocked((x - 0.6) | 0, y | 0) || m.isBlocked((x + 0.6) | 0, y | 0) || m.isBlocked(x | 0, (y - 1.0) | 0)) return false;
    for (const o of m.entities) {
      if (o.kind !== 'deco' || o.solid === false) continue;          // only fixed props count: wandering townsfolk walk around a stall
      if (Math.hypot(o.x - x, o.y - y) < 1.25 || Math.hypot(o.x - x, o.y - (y - 0.8)) < 0.9) return false;
    }
    return true;
  };
  function removeStalls() {
    if (!stalls.map) { stalls.list = []; stalls.idx = -2; return; }
    const L = stalls.map.entities;
    for (let i = L.length - 1; i >= 0; i--) if (L[i]._p11c) L.splice(i, 1);
    stalls.list = []; stalls.idx = -2; stalls.map = null;
  }
  // The stalls exist exactly when the switch is on, today is a market day and the Greening has not happened.
  function syncMarket(force) {
    if (!hasG() || !G.maps) return;
    const m = G.maps.oakhaven; if (!m) return;
    const want = cfg.events && !greened() && marketIndex() >= 0 ? marketIndex() : -1;
    // the map object can be replaced (a rebuild, a load): forget stalls that are not in this one
    if (stalls.map && stalls.map !== m) { stalls.map = null; stalls.list = []; stalls.idx = -2; }
    if (want < 0) { if (stalls.idx !== -2 || m.entities.some(e => e._p11c)) { stalls.map = m; removeStalls(); } return; }
    const present = m.entities.filter(e => e._p11c).length;
    if (!force && stalls.idx === want && stalls.map === m && present === stalls.list.length * 2 && present > 0) return;
    if (!ensureSprites()) return;
    stalls.map = m; removeStalls(); stalls.map = m;
    defineVendors();
    const kinds = vendorsFor(want), spots = STALL_SPOTS.slice(), rot = want % spots.length;
    const order = spots.slice(rot).concat(spots.slice(0, rot));
    let placed = 0;
    for (const sp of order) {
      if (placed >= kinds.length) break;
      if (!freeSpot(m, sp[0], sp[1])) continue;
      const v = kinds[placed]; placed++;
      const items = stockFor(v, want);
      // each vendor kind has one NPCS record; the board is written into it at placement (it is rewritten every market)
      NPCS[v.id].shop = items.map(id => ({ item: id }));
      const stall = m.add({ kind: 'deco', sprite: 'p11c_stall_' + v.key, x: sp[0], y: sp[1], solid: true, radius: 0.55, scale: 0.85, transient: true, _p11c: true, nopick: false, label: 'A market stall — ' + v.name.toLowerCase() });
      const vend = m.add({ kind: 'npc', id: v.id, x: sp[0], y: sp[1] - 0.8, sprite: 'p11c_vendor_' + v.key, scale: 1, solid: true, radius: 0.35, facing: Math.PI / 2, transient: true, _p11c: true, _p11cKey: v.key });
      if (typeof hydrate === 'function') { hydrate(stall); hydrate(vend); }
      vend.wanderT = 1e9;                                // vendors stay behind their stalls
      stalls.list.push({ key: v.key, x: sp[0], y: sp[1], items, stall, vend });
    }
    stalls.idx = want;
    if (G.map === m) G.ents = m.entities;
  }
  // the board belongs to the vendor kind; two stalls of one kind cannot share records, so each kind appears once per market
  function marketInfo() { return { index: stalls.idx, stalls: stalls.list.map(s => ({ key: s.key, x: s.x, y: s.y, items: s.items.slice() })) }; }

  // ================================================================ 3. the moon in the sky
  const moonStats = { shadowPx: 0, drawn: 0, idx: 0 };
  let rowTab = new Float32Array(0), rowCY = NaN, rowH = 0;
  function moonHook(F) {
    moonStats.shadowPx = 0; moonStats.drawn = 0;
    if (!cfg.events || !F.outdoor || (typeof GFX !== 'undefined' && (!GFX.moonPhase || GFX.preset === 'low'))) return;
    const elev = Math.cos((F.tod - 0.5) * Math.PI * 2);
    if (!(elev < 0.02)) return;                           // by day the sun is not touched
    const { fb, mbuf, w, h, horizon, dirX, dirY, planeX, planeY } = F;
    const idx = moonIndex(), theta = idx * Math.PI / 4, illum = (1 - Math.cos(theta)) / 2, waxing = idx < 4;
    moonStats.idx = idx;
    // the engine's own geometry (js/engine.js, "sun and moon"), repeated so the shade lands on the disc it drew
    const sunA = (F.tod - 0.25) * Math.PI * 2, bodyA = sunA + Math.PI;
    const bodyEl = Math.min(0.8, Math.max(0.18, -elev));
    const bodyCY = Math.max(2, Math.min(horizon - 1, horizon - bodyEl * h * 0.58));
    const strength = 0.45 * (1 - Math.min(0.8, F.wx.cloud * 0.8)) * (1 - F.wx.dark * 0.5);
    const rDisc = Math.max(2.5, h * 0.05), rAng = rDisc / (w * 0.55);
    const haloKeep = 0.4 + 0.6 * illum;
    const TR = 150, TG = 160, TB = 190;
    let n = 0, sh = 0;
    // the row falloff of the glow depends only on the frame size and the moon's height: one table, rebuilt when they change
    if (rowTab.length !== horizon || rowCY !== bodyCY || rowH !== h) {
      if (rowTab.length !== horizon) rowTab = new Float32Array(horizon);
      for (let y = 0; y < horizon; y++) { const dd = (y - bodyCY) / (h * 0.44); rowTab[y] = Math.exp(-dd * dd); }
      rowCY = bodyCY; rowH = h;
    }
    if (idx === 4) { moonStats.drawn = 1; return; }   // a full moon is the engine's own disc, untouched
    for (let x = 0; x < w; x++) {
      const camX = 2 * x / w - 1;
      const ang = Math.atan2(dirY + planeY * camX, dirX + planeX * camX);
      let da = ang - bodyA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      const d = Math.abs(da); if (d > 0.95) continue;
      const k = d / 0.4, glow = Math.exp(-k * k) * strength;
      const inDisc = d < rAng;
      if (glow < 0.02 && !inDisc) continue;
      if (!inDisc) {
        // a column of halo only: the dimmed halo is a plain scale of what the engine added, over the rows where it is visible at all
        const c1 = glow * 0.55 * (1 - haloKeep); if (c1 < 0.004) continue;
        const dm = Math.sqrt(-Math.log(0.004 / c1)) * 0.44 * h;
        const ya = Math.max(0, Math.floor(bodyCY - dm)), yb = Math.min(horizon - 1, Math.ceil(bodyCY + dm));
        for (let y = ya; y <= yb; y++) {
          const o = y * w + x, dl = c1 * rowTab[y]; if (dl <= 0.002 || mbuf[o] !== 1) continue;
          const px = fb[o];
          const r = Math.max(0, (px & 255) - TR * dl), g = Math.max(0, ((px >> 8) & 255) - TG * dl), b = Math.max(0, ((px >> 16) & 255) - TB * dl);
          fb[o] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
        continue;
      }
      // the columns that cross the disc: the halo plus the disc itself, pixel by pixel
      for (let y = 0; y < horizon; y++) {
        const o = y * w + x; if (mbuf[o] !== 1) continue;
        const aHalo = glow * rowTab[y] * 0.55;
        let aWas = aHalo, aNow = aHalo * haloKeep;
        const dy = (y - bodyCY) / rDisc, dx = da / rAng, r2 = Math.sqrt(dx * dx + dy * dy);
        if (r2 <= 1) {
          aWas = Math.max(aHalo, 0.9 - r2 * 0.2);
          const t = Math.cos(theta) * Math.sqrt(Math.max(0, 1 - dy * dy));
          const lit = waxing ? dx > t : dx < -t;
          aNow = lit ? aWas : Math.max(aHalo * haloKeep, 0.07 * (1 - r2));     // the dark side: a faint earthshine
          if (lit) n++; else sh++;
        }
        const da2 = aWas - aNow; if (da2 <= 0.002) continue;
        const px = fb[o];
        const r = Math.max(0, (px & 255) - TR * da2), g = Math.max(0, ((px >> 8) & 255) - TG * da2), b = Math.max(0, ((px >> 16) & 255) - TB * da2);
        fb[o] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    moonStats.drawn = n; moonStats.shadowPx = sh;
  }
  function wireMoon() {
    if (typeof Engine !== 'undefined' && Engine.addSkyHook) Engine.addSkyHook(moonHook, 5);
    if (typeof spawnHound !== 'function') return;
    const _sh = spawnHound;
    spawnHound = function () {
      let m = 1; try { m = moonSpawnMult(); } catch (e) { m = 1; }
      if (m === 1) return _sh.apply(this, arguments);
      if (m < 1) { if (Math.random() < m) return _sh.apply(this, arguments); return undefined; }
      const r = _sh.apply(this, arguments);
      if (Math.random() < m - 1) setTimeout(_sh, 2500);    // a bolder night brings a second one, a moment later (same 5-hound cap)
      return r;
    };
  }

  // ================================================================ 4. birth signs
  const MODES = [
    null,
    { id: 'ionian', name: 'Ionian', epithet: 'the Open Door', attr: 'Personality', blurb: 'The bright, plain mode a child learns first. Doors open a little easier for you.' },
    { id: 'dorian', name: 'Dorian', epithet: 'the Cloister Walk', attr: 'Willpower', blurb: 'A minor mode with one stubborn bright note. You keep hope without making a fuss of it.' },
    { id: 'phrygian', name: 'Phrygian', epithet: 'the Hound\'s Step', attr: 'Agility', blurb: 'Dark, tight and quick off the mark. You are light on your feet when the floor goes quiet.' },
    { id: 'lydian', name: 'Lydian', epithet: 'the Floating Light', attr: 'Luck', blurb: 'A bright mode with one note held a little too high. Things tend to land on your side.' },
    { id: 'mixolydian', name: 'Mixolydian', epithet: 'the Road-Song', attr: 'Speed', blurb: 'A traveller\'s mode, major with a flat seventh that never resolves. You walk fast.' },
    { id: 'aeolian', name: 'Aeolian', epithet: 'the Mourner\'s Hour', attr: 'Endurance', blurb: 'The natural minor, slow and long-breathed. You outlast things.' },
    { id: 'locrian', name: 'Locrian', epithet: 'the Broken Fifth', attr: 'Intelligence', blurb: 'The mode with no true fifth, and no rest in it. You notice what is missing.' },
  ];
  const SIGN_BONUS = 5;
  // a sign read from anywhere untrusted: only an integer 1..7 is a sign, everything else is "none" (0)
  function validSign(v) { return (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 7) ? v : 0; }
  const signOf = () => (hasG() && G.flags ? validSign(G.flags.p11c_sign) : 0);
  function statsFor(c, a) { return { hp: c.hp + Math.floor(a.Endurance / 10), voice: c.voice + Math.floor(a.Willpower / 10), fat: a.Strength + a.Endurance }; }
  function wireCreation() {
    if (typeof newPlayer === 'function') {
      const _np = newPlayer;
      newPlayer = function () {
        const p = _np.apply(this, arguments);
        try {
          const s = cfg.signs ? validSign(CREATE.p11cSign) : 0;
          if (s) {
            p.attrs[MODES[s].attr] += SIGN_BONUS;
            const st = statsFor(p.cls, p.attrs);
            p.hpMax = st.hp; p.hp = st.hp; p.voiceMax = st.voice; p.voice = st.voice; p.fatMax = st.fat; p.fat = st.fat;
          }
        } catch (e) { console.warn('calendar11: birth sign failed', e); }
        return p;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () {
        const s = cfg.signs ? validSign(CREATE.p11cSign) : 0;
        const r = _sg.apply(this, arguments);
        try { if (G.flags) { if (s) G.flags.p11c_sign = s; else delete G.flags.p11c_sign; } } catch (e) { /* cosmetic */ }
        return r;
      };
    }
    if (typeof renderCreate === 'function') {
      const _rc = renderCreate;
      renderCreate = function () {
        const r = _rc.apply(this, arguments);
        try {
          if (CREATE.step === 0) CREATE.p11cSign = 0;
          else if (CREATE.step >= 4 && cfg.signs) signPicker();
        } catch (e) { console.warn('calendar11: sign picker failed', e); }
        return r;
      };
    }
    if (typeof renderCharacter === 'function') {
      const _rch = renderCharacter;
      renderCharacter = function () {
        const r = _rch.apply(this, arguments);
        try {
          const s = signOf(), panel = $q('#modal-panel');
          if (s && panel && !$q('#p11c-signline')) {
            const m = MODES[s], p = el('p', { class: 'muted', id: 'p11c-signline' });
            p.textContent = 'Birth sign: ' + m.name + ', ' + m.epithet + ' (+' + SIGN_BONUS + ' ' + m.attr + ')';
            const col = panel.querySelector('.col:last-child') || panel; col.appendChild(p);
          }
        } catch (e) { console.warn('calendar11: sign line failed', e); }
        return r;
      };
    }
  }
  // the optional picker on the last creation step: None plus the seven modes, a one-line blurb, the numbers update in place
  function signPicker() {
    const p = $q('#create-panel'); if (!p || $q('#p11c-sign')) return;
    const box = el('div', { id: 'p11c-sign', class: 'p11c-sign' });
    box.appendChild(el('div', { class: 'p11c-signhead' }, 'Birth sign (optional): the mode the Reach was humming when you were born'));
    const row = el('div', { class: 'p11c-signrow', role: 'group', 'aria-label': 'Birth sign' });
    const blurb = el('p', { class: 'muted p11c-blurb', 'aria-live': 'polite' });
    const base = {};
    const attrDivs = () => Array.from(p.querySelectorAll('.attrs > div'));
    const attrNow = (a) => { const d = attrDivs().find(x => x.firstChild && x.firstChild.textContent === a); return d ? d.querySelector('b') : null; };
    for (const a of ATTRS) { const b = attrNow(a); if (b) base[a] = +b.textContent; }
    const refresh = () => {
      const s = validSign(CREATE.p11cSign);
      for (const a of ATTRS) { const b = attrNow(a); if (b && base[a] != null) b.textContent = String(base[a] + (s && MODES[s].attr === a ? SIGN_BONUS : 0)); }
      const c = CLASSES[CREATE.cls]; if (c) {
        const at = Object.assign({}, base); if (s) at[MODES[s].attr] += SIGN_BONUS;
        const st = statsFor(c, at), bs = p.querySelectorAll('.col p b'); if (bs.length >= 3) { bs[0].textContent = String(st.hp); bs[1].textContent = String(st.voice); bs[2].textContent = String(st.fat); }
      }
      row.querySelectorAll('button').forEach((b) => { const on = +b.dataset.s === s; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      blurb.textContent = s ? MODES[s].name + ', ' + MODES[s].epithet + '. ' + MODES[s].blurb + ' +' + SIGN_BONUS + ' ' + MODES[s].attr + '.' : 'No birth sign. You were born between two notes.';
    };
    for (let i = 0; i <= 7; i++) {
      const b = el('button', { class: 'dfbtn small', type: 'button', 'data-s': String(i) }, i ? MODES[i].name : 'None');
      b.onclick = () => { CREATE.p11cSign = i; if (typeof Audio_ !== 'undefined') Audio_.sfx.ui(); refresh(); };
      row.appendChild(b);
    }
    box.appendChild(row); box.appendChild(blurb);
    const btns = p.querySelector('.btns'); if (btns) p.insertBefore(box, btns); else p.appendChild(box);
    refresh();
  }

  // a loaded save is untrusted: keep only a valid sign, drop everything else
  function sanitizeFlags() {
    if (!hasG() || !G.flags) return;
    if (!('p11c_sign' in G.flags)) return;
    const s = validSign(G.flags.p11c_sign);
    if (s) G.flags.p11c_sign = s; else delete G.flags.p11c_sign;
  }

  // ================================================================ 5. "Previously..." recap
  const RECAP_MIN_MS = 10 * 60 * 1000;
  let lastFileRead = -1e9;                               // when the page last read a file (origins.js load-from-file)
  const FILE_WINDOW_MS = 20000;
  function recapQualifies(d, fromFile) {
    if (!cfg.recap) return false;
    if (fromFile) return true;
    const when = d && typeof d.when === 'number' && Number.isFinite(d.when) ? d.when : null;
    if (when == null) return false;                      // no timestamp (an old save): no way to know, so no card
    const gap = Date.now() - when;
    return gap > RECAP_MIN_MS;
  }
  const trim = (s, n) => { s = String(s == null ? '' : s).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  function recapData() {
    const j = Array.isArray(G.journal) ? G.journal : [];
    const last = j.slice(0, 3).map(e => ({ day: DAYS[(e.day | 0) % DAYS.length], text: trim(e.text, 170) }));
    const main = j.find(e => e && e.cat === 'main');
    return { place: G.map ? G.map.name : '', day: DAYS[G.day % DAYS.length], time: typeof timeName === 'function' ? timeName() : '', last, current: main ? trim(main.text, 200) : '' };
  }
  let recapEl = null, recapOff = null, recapTimer = 0;
  function hideRecap() {
    if (recapTimer) { clearTimeout(recapTimer); recapTimer = 0; }
    if (recapOff) { recapOff(); recapOff = null; }
    if (recapEl) { recapEl.remove(); recapEl = null; }
  }
  // The card does not pause or capture anything: any key, tap or its button puts it away (the key still reaches the game),
  // and it puts itself away after 20 seconds. Everything it shows goes in through textContent.
  function showRecap() {
    hideRecap();
    const host = $q('#game'); if (!host || !hasG()) return null;
    const dta = recapData();
    const card = el('div', { id: 'p11c-recap', class: 'p11c-recap', role: 'dialog', 'aria-label': 'Previously' });
    card.appendChild(el('h3', null, 'Previously…'));
    card.appendChild(el('p', { class: 'p11c-where' }, 'You stand in ' + dta.place + ', ' + dta.day + (dta.time ? ', ' + dta.time : '') + '.'));
    if (dta.last.length) {
      const ul = el('ul'); for (const e of dta.last) ul.appendChild(el('li', null, e.day + ' — ' + e.text)); card.appendChild(ul);
    } else card.appendChild(el('p', { class: 'p11c-empty' }, 'The logbook is empty. The road is all there is so far.'));
    if (dta.current) card.appendChild(el('p', { class: 'p11c-now' }, 'The thread: ' + dta.current));
    const b = el('button', { class: 'dfbtn small', type: 'button', id: 'p11c-recap-go' }, 'Go on');
    card.appendChild(b);
    host.appendChild(card); recapEl = card;
    b.onclick = (ev) => { ev.stopPropagation(); hideRecap(); };
    const onKey = () => hideRecap(), onTap = () => hideRecap();
    // let the load itself finish before any key can count (the key that pressed "Load" may still be down)
    const arm = setTimeout(() => { window.addEventListener('keydown', onKey, true); window.addEventListener('pointerdown', onTap, true); }, 400);
    recapOff = () => { clearTimeout(arm); window.removeEventListener('keydown', onKey, true); window.removeEventListener('pointerdown', onTap, true); };
    recapTimer = setTimeout(hideRecap, 20000);
    return card;
  }
  function wireRecap() {
    if (typeof FileReader !== 'undefined' && FileReader.prototype && FileReader.prototype.readAsText) {
      const _rt = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function () { lastFileRead = performance.now(); return _rt.apply(this, arguments); };
    }
    if (typeof restoreGame !== 'function') return;
    const _rg = restoreGame;
    restoreGame = function (d) {
      const fromFile = performance.now() - lastFileRead < FILE_WINDOW_MS;
      const r = _rg.apply(this, arguments);                // a bad save throws here, before any card
      try { sanitizeFlags(); } catch (e) { /* cosmetic */ }
      try { hideRecap(); if (recapQualifies(d, fromFile)) showRecap(); } catch (e) { console.warn('calendar11: recap failed', e); }
      return r;
    };
  }

  // ================================================================ 6. the performance overlay
  const ring = new Float32Array(120); let ringN = 0, ringI = 0, lastT = 0, renderMs = 0;
  let perfEl = null, perfNext = 0;
  const perf = { median: 0, p95: 0, fps: 0, scale: 1, enemies: 0, lights: 0, particles: 0, heapMB: null, text: '' };
  function pct(sorted, q) { if (!sorted.length) return 0; return sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1) + 0.5))]; }
  function perfCompute() {
    const n = Math.min(ringN, ring.length), a = Array.from(ring.subarray(0, n)).sort((x, y) => x - y);
    perf.median = pct(a, 0.5); perf.p95 = pct(a, 0.95);
    perf.fps = perf.median > 0 ? 1000 / perf.median : 0;
    perf.scale = typeof Engine !== 'undefined' && Engine.getScale ? Engine.getScale() : 1;
    let en = 0; if (hasG() && G.ents) for (const e of G.ents) if (e.kind === 'enemy' && !e.dead && !e.hidden) en++;
    perf.enemies = en;
    let li = 0; try { if (hasG() && G.ents) for (const e of G.ents) if (e.glow > 0 && !e.hidden) li++; } catch (e) { /* ignore */ }
    perf.lights = li;
    perf.particles = typeof PARTICLES !== 'undefined' && PARTICLES.list ? PARTICLES.list.length : 0;
    const pm = typeof performance !== 'undefined' ? performance.memory : null;
    perf.heapMB = pm && pm.usedJSHeapSize ? pm.usedJSHeapSize / 1048576 : null;
    perf.text = 'Frame ' + perf.median.toFixed(1) + ' ms median · ' + perf.p95.toFixed(1) + ' ms 95th\n' +
      perf.fps.toFixed(0) + ' FPS · render ' + renderMs.toFixed(1) + ' ms · scale ' + perf.scale + 'x\n' +
      'Enemies ' + perf.enemies + ' · lights ' + perf.lights + ' · particles ' + perf.particles +
      (perf.heapMB != null ? '\nJS heap ' + perf.heapMB.toFixed(1) + ' MB' : '');
    return perf;
  }
  function perfFrame(now, ms) {
    if (!cfg.perf) { lastT = 0; return; }
    if (lastT) { ring[ringI] = now - lastT; ringI = (ringI + 1) % ring.length; ringN = Math.min(ringN + 1, ring.length); }
    lastT = now; renderMs = renderMs * 0.9 + ms * 0.1;
    if (now >= perfNext) {
      perfNext = now + 250;
      perfCompute();
      if (!perfEl) { perfEl = el('div', { id: 'p11c-perf', role: 'status', 'aria-label': 'Performance overlay' }); const host = $q('#game'); if (host) host.appendChild(perfEl); }
      if (perfEl) perfEl.textContent = perf.text;
    }
  }
  function setPerf(on) {
    cfg.perf = !!on; saveCfg();
    if (!cfg.perf) { if (perfEl) { perfEl.remove(); perfEl = null; } ringN = 0; ringI = 0; lastT = 0; }
  }
  function wireRender() {
    if (typeof render !== 'function') return;
    const _render = render;
    render = function () {
      const t0 = performance.now();
      const r = _render.apply(this, arguments);
      try {
        if (cfg.perf) perfFrame(t0, performance.now() - t0);
        if (cfg.events) { syncMarket(false); tickVendors(); }
        else if (stalls.idx !== -2) syncMarket(true);
      } catch (e) { if (!wireRender.warned) { wireRender.warned = true; console.warn('calendar11: frame work failed', e); } }
      return r;
    };
    window.addEventListener('keydown', (ev) => {
      if (ev.code !== 'F10' && ev.key !== 'F10') return;
      ev.preventDefault(); setPerf(!cfg.perf);
      const b = $q('#c11-perf-opt'); if (b) { b.textContent = cfg.perf ? 'On' : 'Off'; b.classList.toggle('sel', cfg.perf); b.setAttribute('aria-pressed', String(cfg.perf)); }
    });
  }
  // vendors go home at night (hidden) when the player is not watching the square
  function tickVendors() {
    if (!stalls.list.length || !hasG()) return;
    const hr = G.tod * 24, night = hr < 6 || hr >= 20;
    for (const s of stalls.list) {
      if (!!s.vend.hidden === night) continue;
      const far = G.mapId !== 'oakhaven' || Math.hypot(Engine.cam.x - s.vend.x, Engine.cam.y - s.vend.y) > 12;
      if (far) s.vend.hidden = night;
    }
  }

  // ================================================================ HUD, logbook, map entry, loading
  function hudWord() {
    if (!cfg.events || !hasG()) return '';
    return dateShort(dayNo());
  }
  function wireHud() {
    if (typeof drawHUD === 'function') {
      const _hud = drawHUD;
      drawHUD = function () {
        const r = _hud.apply(this, arguments);
        try {
          const word = hudWord();
          if (word && G.player && !(G.escapeTimer > 0 || G.boreHold > 0 || G.rootWard > 0 || G.whistleT > 0)) {
            const ctx = Engine.ctx; ctx.save(); ctx.font = '6px "Alegreya", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#d9a441';
            ctx.fillText(word, 188, VIEW_H + 42, 60); ctx.restore();   // maxWidth squeezes a long month to the panel
          }
        } catch (e) { /* cosmetic */ }
        return r;
      };
    }
    if (typeof renderLog === 'function') {
      const _log = renderLog;
      renderLog = function () {
        const r = _log.apply(this, arguments);
        try { addAlmanac(); } catch (e) { console.warn('calendar11: almanac failed', e); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        const r = _lm.apply(this, arguments);
        try { syncMarket(true); tickVendors(); sayEntry(id); } catch (e) { console.warn('calendar11: map entry failed', e); }
        return r;
      };
    }
  }
  function almanacLines() {
    if (!cfg.events || !hasG()) return [];
    const out = [], d = dayNo();
    out.push(dateProse(d) + ', 419 SR.');
    out.push(rotaOf(d).log);
    if (isCanopy(d)) out.push(greened() ? CANOPY.grove[0] : CANOPY.oak[0]);
    if (marketOn(d) && !greened()) out.push('Massday market in the east square. Prices are a tenth under the shops\u2019.');
    out.push('The moon: ' + MOON_NAMES[moonIndex(d)] + '. ' + MOON_LINES[moonIndex(d)]);
    return out;
  }
  function addAlmanac() {
    const panel = $q('#modal-panel'); if (!panel || $q('#p11c-almanac')) return;
    const lines = almanacLines(); if (!lines.length) return;
    const head = panel.querySelector('p.muted'); const box = el('div', { id: 'p11c-almanac', class: 'p11c-almanac' });
    for (const t of lines) box.appendChild(el('p', { class: 'muted' }, t));
    if (head) head.parentNode.insertBefore(box, head.nextSibling); else panel.appendChild(box);
  }

  // ================================================================ options rows
  function row(grid, id, label, hint, get, set) {
    const lab = el('span', { class: 'gfx-label' }, label + ' '); lab.appendChild(el('small', { class: 'muted' }, hint));
    const b = el('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': String(!!get()) }, get() ? 'On' : 'Off');
    b.classList.toggle('sel', !!get());
    b.onclick = () => { set(!get()); b.textContent = get() ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(!!get())); b.classList.toggle('sel', !!get()); };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function appendRows() {
    const grid = $q('#modal-panel .ctl-grid');
    if (!grid || $q('#c11-events-opt')) return;
    row(grid, 'c11-events-opt', 'Calendar events', 'The date, the weekly Rota, a market in Oakhaven, and a moon whose phase the Hush follows. Off: none of it.', () => cfg.events, (v) => { cfg.events = v; saveCfg(); try { syncMarket(true); } catch (e) { /* ignore */ } });
    row(grid, 'c11-signs-opt', 'Birth signs', 'Pick a musical mode when you make a character. Off: no picker.', () => cfg.signs, (v) => { cfg.signs = v; saveCfg(); });
    row(grid, 'c11-recap-opt', '“Previously…” recap', 'A short card when you load a save after a break, or from a file.', () => cfg.recap, (v) => { cfg.recap = v; saveCfg(); if (!v) hideRecap(); });
    row(grid, 'c11-perf-opt', 'Performance overlay', 'Frame time, frame rate, render scale, enemies, lights, particles, memory. F10 toggles it.', () => cfg.perf, (v) => setPerf(v));
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { appendRows(); } catch (e) { console.warn('calendar11: options rows failed', e); }
      return r;
    };
  }

  // ================================================================ style
  function injectStyle() {
    if (document.getElementById('calendar11-style')) return;
    const st = document.createElement('style'); st.id = 'calendar11-style';
    st.textContent = `
.p11c-sign { margin-top: .8cqh; }
.p11c-signhead { font-size: 1.7cqw; color: var(--gold); font-family: var(--font-sc); }
.p11c-signrow { display: flex; flex-wrap: wrap; gap: .5cqw; margin: .5cqh 0; }
.p11c-signrow .dfbtn { padding: .3cqh .9cqw; font-size: 1.6cqw; }
.p11c-blurb { font-size: 1.7cqw; min-height: 4.4cqh; margin: 0; }
.p11c-almanac p { margin: .3cqh 0; font-size: 1.75cqw; }
#p11c-signline { font-size: 1.8cqw; }
#p11c-recap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 64cqw; max-height: 78cqh; overflow: auto; box-sizing: border-box; z-index: 12;
  padding: 2.2cqh 2.6cqw; color: #2a1d10; font-family: var(--font-body); font-size: 2.1cqw; line-height: 1.32;
  background: radial-gradient(ellipse at 30% 20%, #e8d8b0 0%, #d9c394 55%, #c4a96f 100%); border: .35cqw solid #6b4a24; box-shadow: 0 0 0 .2cqw #1a110a, 0 1cqh 3cqh rgba(0,0,0,.7); border-radius: .4cqw; animation: p11c-in .25s ease-out; }
#p11c-recap h3 { margin: 0 0 .8cqh; font-family: var(--font-display); font-size: 3cqw; color: #4a2d12; letter-spacing: .04em; }
#p11c-recap ul { margin: .6cqh 0; padding-left: 2cqw; }
#p11c-recap li { margin: .4cqh 0; }
#p11c-recap .p11c-where, #p11c-recap .p11c-now { margin: .5cqh 0; }
#p11c-recap .p11c-now { font-style: italic; }
#p11c-recap .dfbtn { margin-top: 1cqh; color: #2a1d10; background: #cdb27b; border-color: #6b4a24; }
html.ac-reduce-motion #p11c-recap { animation: none; }
@keyframes p11c-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #p11c-recap { animation: none; } }
#p11c-perf { position: absolute; left: .8cqw; top: .8cqh; z-index: 11; pointer-events: none; white-space: pre; padding: .5cqh .8cqw; background: rgba(8,6,4,.72); color: #cfe3b0;
  font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 1.55cqw; line-height: 1.3; border: 1px solid rgba(217,164,65,.45); }
`;
    document.head.appendChild(st);
  }

  // ================================================================ boot
  loadCfg();
  injectStyle();
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('calendar11: ' + name + ' wiring failed', e); } };
  wire('talk', wireTalk); wire('moon', wireMoon); wire('creation', wireCreation);
  wire('recap', wireRecap); wire('render', wireRender); wire('hud', wireHud); wire('options', wireOptions);
  wire('vendors', defineVendors);

  return {
    cfg, saveCfg, ROTA, CANOPY, MONTHS, WEEK, VENDORS, STALL_SPOTS, MODES, SIGN_BONUS, MOON_NAMES, MOON_SPAWN, MOON_LINES, MOON_OFFSET, RECAP_MIN_MS,
    dateOf, dateProse, dateShort, rotaOf, isCanopy, marketIndex, marketOn, stallCount, stockFor, vendorsFor, moonIndex, moonName, moonSpawnMult,
    sayEntry, entryLines, folkLine, syncMarket, marketInfo, stalls, ensureSprites, almanacLines, hudWord,
    moonHook, moonStats,
    validSign, signOf, sanitizeFlags, statsFor, signPicker,
    recapQualifies, recapData, showRecap, hideRecap, get recapEl() { return recapEl; },
    setPerf, perfCompute, perfFrame, perf, ring, pct,
    shownKey,
  };
})();
if (typeof window !== 'undefined') window.CALENDAR11 = CALENDAR11;
