// ============================================================
//  songcraft12 — Phase 12 "Tools of the trade": instruments, the tuning fork, the dowsing rod.
//
//  1. INSTRUMENTS (lute, flute, hurdy-gurdy). Bought, owned, then equipped from the Song-book (Tab / Y / SONG):
//     exactly one instrument at a time, or none. Equipped, an instrument changes how the built-in Songs
//     (castSong) and custom Songs (executeCustomSong) behave, by the table INST below, and gives the Song its own
//     timbre (plucked, breathy, droning) built from the same Web Audio context as Audio_. No instrument = the game
//     as it was: the wrappers return the original call untouched, so seeded fight traces are identical.
//     The tavern's evening set (js/tavern11.js) already looks for an instrument in the pack by id/name; the lute
//     and the flute match its list, and the hurdy-gurdy is named "wheel-fiddle" so it matches too (no edit there).
//  2. TUNING FORK (p12_fork, or the old silver v_fork). Held (J, the inventory, or the Song-book), it hums near
//     hidden things: cracked-open-able resonant walls and the sung wall, unopened strongboxes, Light-glass shards
//     and growths, and Tobin's loose pages. Pitch and volume rise with nearness and the hum pans toward the
//     thing; a trembling fork and a row of pips show it on screen, and Sound captions say it in words.
//  3. DOWSING ROD (p12_rod). Held, a needle swings toward the nearest Anchor-root in the map (quarry shaft and
//     Root-vault bore once Kaelen has spoken of the Root; the Tuning Room floor over the Chorister once you
//     are in the Grove), or failing that the nearest root-vein (Light-glass) or reed bed. It steadies when you
//     are close, and the first find of each kind is a journal line.
//
//  Rules kept (BRIEF_P8..P12): wrappers only; no edits to game.js/upgrades.js/data.js/tavern11.js/index.html
//  (only this module). State is G.flags p12s_* (small integers, validated on every read) and ITEMS/shop stock added
//  from here. Nothing built from save data goes into markup. Every invented fact is marked [PROPOSED].
//
//  Settings (localStorage 'octave.songcraft12.v1', Options -> Graphics & access): Instruments, Tuning fork,
//  Dowsing rod. Gameplay switches default on; each off = the original game (no stock, no hum, no needle, Songs
//  untouched).
// ============================================================
'use strict';

const SONGCRAFT = (function () {
  const KEY = 'octave.songcraft12.v1';
  const set = { inst: true, fork: true, rod: true };

  // ---------------------------------------------------------------- balance table (the one place to tune)
  // costMul   voice spent on a Song is multiplied (refund = floor(spent * (1 - costMul)))
  // durMul    timed effects (Root-note ward, stuns, wards, haste) are multiplied; never lengthened on bosses
  // noiseMul  the Narrow noise a Song makes is multiplied
  // fifthReach  extra cells the Falling Fifth reaches, in a narrow cone ahead (never bosses)
  // drone     seconds after a cast that the Narrow floor holds at `floor` and hounds may come (rate per second x map danger)
  const INST = {
    p12_lute:  { key: 'lute',  costMul: 0.75, durMul: 0.7,  noiseMul: 1.0, fifthReach: 0, drone: null },
    p12_flute: { key: 'flute', costMul: 1.0,  durMul: 1.0,  noiseMul: 0.6, fifthReach: 3, drone: null },
    p12_gurdy: { key: 'gurdy', costMul: 1.0,  durMul: 1.6,  noiseMul: 1.5, fifthReach: 0, drone: { secs: 8, floor: 6.2, houndRate: 0.12 } },
  };
  const INST_ORDER = ['p12_lute', 'p12_flute', 'p12_gurdy'];
  const FIFTH_BASE = 10, FIFTH_CONE = 0.5;                 // game.js: dist2 > 100, so 10 cells; the extension is a +-0.5 rad cone
  const FORK = { range: 9, silverRange: 11, pitchLo: 220, pitchHi: 660, volLo: 0.02, volHi: 0.11, tick: 0.12 };
  const ROD = { steady: 2.0, steadyVein: 1.5, wobble: 0.45, maxVein: 60 };
  const ITEM = { fork: 'p12_fork', rod: 'p12_rod', silver: 'v_fork' };
  // Where each item comes from (existing merchants, stock added here). [PROPOSED]
  const STOCK = [
    ['hob', { item: 'p12_lute', price: 24 }],            // Abner Fenning the tanner strings lutes with his own gut
    ['tam', { item: 'p12_flute', price: 14 }],            // Old Tam, of the Hedge-weavers: alder flutes in hush-cloth
    ['vane', { item: 'p12_gurdy', price: 38 }],           // Captain Vane: a wheel-fiddle off the Kestrel
    ['bettany', { item: 'p12_fork', price: 12 }],         // Bettany: an iron fork from a Cantor's widow
    ['orrin', { item: 'p12_rod', price: 30 }],            // Orrin Pale the sexton: bronze from the chapel's cracked old treble (R2)
  ];

  // ---------------------------------------------------------------- text ([PROPOSED] all of it; also in tools/i18n/p12-songcraft.tsv)
  const TX = {
    items: {
      p12_lute: ['Lute', 'Abner Fenning strings these with his own gut, and sells one now and then to people who ask nicely. Equipped, Songs cost a quarter less voice and their timed effects do not last as long.'],
      p12_flute: ['Alder Flute', 'Bored alder, packed in hush-cloth by the Hedge-weavers. Equipped, Songs make far less noise, and the Falling Fifth carries a little further down a narrow line ahead.'],
      p12_gurdy: ['Hurdy-Gurdy, the wheel-fiddle', 'A corsair\'s wheel-fiddle with a drone string that never stops. Equipped, timed effects hold much longer. Songs are louder, and the drone calls hounds for a while after.'],
      p12_fork: ['Iron Tuning Fork', 'Bettany had it from a Cantor\'s widow. Held (J), it hums near what is kept hidden: resonant stone, strongboxes, Light-glass, loose pages. The nearer, the higher it sings.'],
      p12_rod: ['Resonance Rod', 'A rod of bronze from the chapel\'s cracked old treble, ground at the forge to 174. Held loose (J), it dips toward what is rooted below. Do not stand on what it finds.'],
    },
    equip: { p12_lute: 'You take up the lute.', p12_flute: 'You take up the flute.', p12_gurdy: 'You settle the wheel-fiddle across your knees.' },
    unequip: 'You put the instrument away.',
    fx: {
      p12_lute: 'Lute: Songs cost a quarter less voice; timed effects last 30% shorter.',
      p12_flute: 'Flute: Songs make 40% less noise; the Falling Fifth reaches 3 cells further, in a narrow cone ahead.',
      p12_gurdy: 'Hurdy-gurdy: timed effects last 60% longer (not on bosses); Songs are 50% louder, and the drone draws hounds for 8 seconds after.',
    },
    book: { head: 'Instrument', none: 'None', equipped: 'In hand: {0}', tool: 'Held in the other hand', noTool: 'Nothing', hand: 'Hand' },
    tool: {
      forkUp: 'You hold the fork by its stem. It is silent, for now.', forkDown: 'You put the fork away.',
      rodUp: 'You hold the rod loose between two fingers.', rodDown: 'You put the rod away.',
      none: 'You have nothing to hold.',
    },
    forkSeen: {
      wall: 'The fork shivers against your palm. There is stone here that was cut to be listened to.',
      cache: 'The fork hums low. Something has been kept near here.',
      glass: 'The fork sings thin and high. Light-glass, close.',
      page: 'The fork hums, dry and quiet, like a page turned in the next room.',
    },
    cap: { faint: '[A tuning fork hums faintly]', near: '[The fork hums, closer]', clear: '[The fork rings clear]' },
    rodSeen: {
      quarry: 'The rod went still over the quarry floor and would not be coaxed. Whatever the Consortium drills is under my feet, and it is keeping a note it has no breath for. I took my hands off the rod. It seemed the decent thing.',
      rootvault: 'At the Casing the rod stopped dead. The Root does not answer. It listens. I stood there until my hands stopped shaking.',
      malting: 'In the Tuning Room the rod stilled over the floor. Nothing sang. Something a very long way down was keeping count.',
      vein: 'The rod steadied over a root-vein, a thread of green-gold glass under the floor. A small cousin of something much larger.',
      bed: 'The rod steadied over a reed bed. Wet ground, a little life, a note a day long. Not everything it finds is sacred.',
    },
    rodLabel: 'STEADY',
    opts: {
      inst: 'Instruments', instHint: 'a lute, flute or hurdy-gurdy changes how Songs behave',
      fork: 'Tuning fork', forkHint: 'hums nearer hidden stone, strongboxes, Light-glass and pages',
      rod: 'Dowsing rod', rodHint: 'a needle that dips toward the Anchor-roots', on: 'On', off: 'Off',
    },
    touch: 'Tool',
  };

  // ---------------------------------------------------------------- small helpers
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object' && G.player;
  const sayMsg = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* cosmetic */ } };
  function flag(name, lo, hi) { return hasG() ? Math.floor(num(G.flags[name], lo, hi, lo)) : lo; }
  function setFlag(name, v) { if (hasG()) G.flags[name] = v; }
  function held(id) {
    let n = 0;
    if (!hasG() || !Array.isArray(G.player.inv)) return 0;
    for (const s of G.player.inv) if (s && s.id === id) n += Math.floor(num(s.n, 0, 999, 1));
    return n;
  }
  function loadSet() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { set.inst = o.inst !== false; set.fork = o.fork !== false; set.rod = o.rod !== false; }
    } catch (e) { /* private window: defaults */ }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify({ inst: set.inst, fork: set.fork, rod: set.rod })); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- items
  [ // [PROPOSED] every definition; stand-in icons from js/icons.js kinds
    ['p12_lute', 24], ['p12_flute', 14], ['p12_gurdy', 38], ['p12_fork', 12], ['p12_rod', 30],
  ].forEach(([id, value]) => {
    if (typeof ITEMS === 'undefined' || ITEMS[id]) return;
    ITEMS[id] = { name: TX.items[id][0], sprite: 'loot', use: id === 'p12_fork' || id === 'p12_rod' ? 'p12_tool' : 'p12_inst', value, desc: TX.items[id][1] };
  });
  try {
    if (typeof ICONS !== 'undefined' && ICONS.TABLE) {
      const T = ICONS.TABLE;
      T.p12_lute = ['whistle', {}]; T.p12_flute = ['whistle', {}]; T.p12_gurdy = ['cog', {}]; T.p12_fork = ['fork', {}]; T.p12_rod = ['bolts', {}];
    }
  } catch (e) { /* procedural stand-ins only */ }
  if (typeof ITEM_WEIGHTS !== 'undefined') for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy', 'p12_fork', 'p12_rod']) if (ITEM_WEIGHTS[id] == null) ITEM_WEIGHTS[id] = 0.6;

  // merchants: stock is added when a switch is on and taken out when it is off (off = the original shops)
  function stockOn(id) { return id === 'p12_fork' || id === 'p12_rod' ? (id === 'p12_fork' ? set.fork : set.rod) : set.inst; }
  function syncStock() {
    if (typeof NPCS === 'undefined') return;
    for (const [npc, entry] of STOCK) {
      const n = NPCS[npc]; if (!n || !Array.isArray(n.shop)) continue;
      const i = n.shop.findIndex(e => e && e.item === entry.item);
      if (stockOn(entry.item)) { if (i < 0) n.shop.push({ item: entry.item, price: entry.price }); } else if (i >= 0) n.shop.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- state: equipped instrument and held tool
  // p12s_inst 0..3 (index into INST_ORDER + 1), p12s_tool 0 none, 1 fork, 2 rod. Always read through these.
  function instId() {
    if (!set.inst || !hasG()) return null;
    const i = flag('p12s_inst', 0, INST_ORDER.length);
    const id = i > 0 ? INST_ORDER[i - 1] : null;
    return id && held(id) > 0 ? id : null;
  }
  function inst() { const id = instId(); return id ? INST[id] : null; }
  function equip(id) {
    const i = INST_ORDER.indexOf(id);
    if (i < 0 || held(id) < 1 || !set.inst) { setFlag('p12s_inst', 0); return null; }
    setFlag('p12s_inst', flag('p12s_inst', 0, 3) === i + 1 ? 0 : i + 1);
    return instId();
  }
  const hasFork = () => held(ITEM.fork) > 0 || held(ITEM.silver) > 0;
  const hasRod = () => held(ITEM.rod) > 0;
  function toolId() {
    if (!hasG()) return 0;
    const t = flag('p12s_tool', 0, 2);
    if (t === 1 && set.fork && hasFork()) return 1;
    if (t === 2 && set.rod && hasRod()) return 2;
    return 0;
  }
  function setTool(t) {
    t = t === 1 && set.fork && hasFork() ? 1 : t === 2 && set.rod && hasRod() ? 2 : 0;
    const was = toolId();
    setFlag('p12s_tool', t);
    if (t !== 1) stopHum();
    if (t !== was) {
      if (t === 1) sayMsg(TX.tool.forkUp, '', 2600);
      else if (t === 2) sayMsg(TX.tool.rodUp, '', 2600);
      else sayMsg(was === 1 ? TX.tool.forkDown : TX.tool.rodDown, '', 1800);
    }
    return t;
  }
  function cycleTool() {
    const order = [0]; if (set.fork && hasFork()) order.push(1); if (set.rod && hasRod()) order.push(2);
    if (order.length === 1) { sayMsg(TX.tool.none, 'warn', 1800); return 0; }
    return setTool(order[(order.indexOf(toolId()) + 1) % order.length]);
  }
  // clamp whatever a save handed us; unequip what is not owned
  function sanitize() {
    if (!hasG()) return;
    const f = G.flags;
    for (const k of ['p12s_inst', 'p12s_tool', 'p12s_fseen', 'p12s_rseen']) if (k in f) { const v = Number(f[k]); f[k] = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0; }
    f.p12s_inst = Math.min(INST_ORDER.length, f.p12s_inst || 0); f.p12s_tool = Math.min(2, f.p12s_tool || 0);
    f.p12s_fseen = (f.p12s_fseen || 0) & 15; f.p12s_rseen = (f.p12s_rseen || 0) & 31;
    if (!instId()) f.p12s_inst = 0;
    if (!toolId()) f.p12s_tool = 0;
  }

  // ---------------------------------------------------------------- 1. instruments: timbre
  // procedural stand-in voices; they connect to Audio_.sfxBus and do nothing until the AudioContext exists
  let casting = null;                    // the instrument whose Song is being sung right now (timbre switch)
  const stats = { voices: [], hum: null, wrapped: 0 };
  function ctxOk() { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus; }
  function muted() { try { return !!(Audio_.master && Audio_.master.gain.value <= 0.001); } catch (e) { return false; } }
  function playVoice(kind, hz, dur) {
    stats.voices.push({ kind, hz, dur }); if (stats.voices.length > 12) stats.voices.shift();
    if (!ctxOk() || muted()) return;
    try {
      const ctx = Audio_.ctx, t0 = ctx.currentTime, bus = Audio_.sfxBus;
      const out = ctx.createGain(); out.gain.value = 1; out.connect(bus);
      const env = (g, peak, a, d, hold) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.setTargetAtTime(0.0001, t0 + a + (hold || 0), d); };
      const osc = (type, f, g, stop) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + stop); return o; };
      if (kind === 'lute') {                       // a plucked pair: bright triangle, a quick second pluck a fifth up
        for (const [off, f, v] of [[0, hz * 2, 0.16], [0.16, hz * 3, 0.1], [0.3, hz * 2, 0.08]]) {
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0 + off); g.gain.exponentialRampToValueAtTime(v, t0 + off + 0.01); g.gain.setTargetAtTime(0.0001, t0 + off + 0.02, 0.22);
          g.connect(out); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); o.start(t0 + off); o.stop(t0 + off + 1.4);
          const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.01; const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(g); o2.start(t0 + off); o2.stop(t0 + off + 0.6);
        }
      } else if (kind === 'flute') {               // breathy: slow attack, a vibrato, a little air
        const g = ctx.createGain(); g.connect(out); env(g, 0.14, 0.09, 0.35, Math.max(0.2, dur * 0.5));
        const o = osc('sine', hz * 2, g, dur + 1.5); const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.value = hz * 0.012; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 1.5);
        osc('sine', hz * 4.01, (() => { const h = ctx.createGain(); h.gain.value = 0.18; h.connect(g); return h; })(), dur + 1.5);
        const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate), d = nb.getChannelData(0);
        let s = 1; for (let i = 0; i < d.length; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296 - 0.5) * 0.5; }   // private noise: never Math.random
        const ns = ctx.createBufferSource(); ns.buffer = nb; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz * 4; bp.Q.value = 2; const ng = ctx.createGain(); ng.gain.value = 0.05; ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t0);
      } else {                                      // gurdy: two buzzing saws, a sub drone, a rattling 'trumpet' string; it keeps going
        const L = dur * 1.6 + 1.2, g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.connect(out); g.connect(lp);
        env(g, 0.11, 0.05, 0.5, L * 0.6);
        osc('sawtooth', hz, g, L + 1.5); osc('sawtooth', hz * 1.006, g, L + 1.5);
        const sub = ctx.createGain(); sub.gain.value = 0.7; sub.connect(g); osc('sine', hz / 2, sub, L + 1.5);
        const buzz = ctx.createGain(); buzz.gain.value = 0.25; buzz.connect(g); const bz = osc('square', hz * 2, buzz, L + 1.5);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 14; lg.gain.value = 0.2; lfo.connect(lg); lg.connect(buzz.gain); lfo.start(t0); lfo.stop(t0 + L + 1.5);
        void bz;
      }
    } catch (e) { /* audio is cosmetic */ }
  }
  function installTimbre() {
    if (typeof Audio_ === 'undefined' || !Audio_.sfx || Audio_.sfx.__p12s) return;
    const sfx = Audio_.sfx;
    if (typeof sfx.song === 'function') {
      const _song = sfx.song;
      sfx.song = function (hz, dur) {
        if (casting) { try { playVoice(casting.key, num(hz, 40, 4000, 174), num(dur, 0.1, 6, 1.2)); } catch (e) { /* ignore */ } return undefined; }
        return _song.apply(this, arguments);
      };
    }
    if (typeof sfx.fifth === 'function') {
      const _fifth = sfx.fifth;
      sfx.fifth = function () {
        if (casting) { try { playVoice(casting.key, 174, 0.9); setTimeout(() => { try { playVoice(casting && casting.key || 'lute', 116, 0.9); } catch (e) { /* ignore */ } }, 500); } catch (e) { /* ignore */ } return undefined; }
        return _fifth.apply(this, arguments);
      };
    }
    sfx.__p12s = true;
  }

  // ---------------------------------------------------------------- 1. instruments: behaviour
  const enemies = () => (G.ents || []).filter(e => e && e.kind === 'enemy' && !e.dead && !e.hidden);
  function stunSnap() { const m = new Map(); for (const e of (G.ents || [])) if (e && e.kind === 'enemy') m.set(e, num(e.stun, 0, 1e4, 0)); return m; }
  // scale a timed effect that a Song just set; durations are never lengthened on bosses (no stun-locking a boss)
  function scaleStuns(before, I) {
    for (const [e, s0] of before) {
      const s1 = num(e.stun, 0, 1e4, 0);
      if (s1 <= s0) continue;
      const boss = !!(e.def && e.def.boss);
      const mul = boss ? Math.min(1, I.durMul) : I.durMul;
      e.stun = s0 + (s1 - s0) * mul;
    }
  }
  // the flute's longer Fifth: the same thing the Fifth does (e.stun by fifthN), applied to the cone just past the ring
  function extendFifth(I) {
    const c = Engine.cam, lo = FIFTH_BASE * FIFTH_BASE, hi = (FIFTH_BASE + I.fifthReach) * (FIFTH_BASE + I.fifthReach);
    let n = 0;
    for (const e of enemies()) {
      if (!e.def || !e.def.cacophony || e.def.boss) continue;
      const dx = e.x - c.x, dy = e.y - c.y, d2 = dx * dx + dy * dy;
      if (d2 <= lo || d2 > hi) continue;
      if (Math.abs(normAng(Math.atan2(dy, dx) - c.dir)) > FIFTH_CONE) continue;
      e.stun = [4.5, 2.5, 1.2, 0.5][Math.min(3, e.fifthN || 0)]; e.fifthN = (e.fifthN || 0) + 1; n++;
    }
    return n;
  }
  const st = { droneT: 0, houndAcc: 0, lastCast: null };
  function wrapCast(_c) {
    return function (id) {
      const I = inst();
      if (!I || id === 'murmur' || typeof SONGS === 'undefined' || !SONGS[id] || !hasG()) return _c.apply(this, arguments);
      const p = G.player, pre = { v: num(p.voice, 0, 1e6, 0), t: num(G.song && G.song.t, 0, 100, 0), n: num(G.noise, 0, 10, 0), root: num(G.rootWard, 0, 1e4, 0), stun: stunSnap() };
      let r;
      casting = I;
      try { r = _c.apply(this, arguments); } finally { casting = null; }
      try {
        // refused casts (no voice, a quiet in the room, silenced, no fragments) leave the voice and the song timer alone
        if (!(num(G.song && G.song.t, 0, 100, 0) > 0 && pre.t <= 0 && p.voice < pre.v)) return r;
        const spent = pre.v - p.voice;
        const refund = Math.floor(spent * (1 - I.costMul));
        if (refund > 0) p.voice = Math.min(p.voiceMax, p.voice + refund);
        const dn = G.noise - pre.n;
        if (dn > 0 && I.noiseMul !== 1) G.noise = Math.min(10, Math.max(0, pre.n + dn * I.noiseMul));
        if (G.rootWard > pre.root && I.durMul !== 1) G.rootWard = pre.root + (G.rootWard - pre.root) * I.durMul;
        if (I.durMul !== 1) scaleStuns(pre.stun, I);
        let ext = 0;
        if (id === 'fifth' && I.fifthReach > 0) ext = extendFifth(I);
        if (I.drone) st.droneT = I.drone.secs;
        st.lastCast = { id, spent, refund, noise: G.noise - pre.n, ext, inst: I.key };
      } catch (e) { console.warn('songcraft12: instrument failed', e); }
      return r;
    };
  }
  // custom Songs: timed effects follow the instrument too (the cost and noise are paid by whoever casts them)
  function wrapCustom(_e) {
    return function (s) {
      const I = inst();
      if (!I || !hasG()) return _e.apply(this, arguments);
      const pre = { stun: stunSnap(), ward: num(G.songWardT, 0, 1e4, 0), haste: num(G.hasteT, 0, 1e4, 0) };
      casting = I;
      let r; try { r = _e.apply(this, arguments); } finally { casting = null; }
      try {
        if (I.durMul !== 1) {
          scaleStuns(pre.stun, I);
          if (G.songWardT > pre.ward) G.songWardT = pre.ward + (G.songWardT - pre.ward) * I.durMul;
          if (G.hasteT > pre.haste) G.hasteT = pre.haste + (G.hasteT - pre.haste) * I.durMul;
        }
        if (I.drone) st.droneT = I.drone.secs;
      } catch (e) { console.warn('songcraft12: custom song failed', e); }
      return r;
    };
  }
  // the gurdy's drone: the Narrow's floor holds high, and (with a danger above zero) hounds may come
  function wrapNarrow(_u) {
    return function (dt) {
      const r = _u.apply(this, arguments);
      try {
        const I = inst();
        if (st.droneT > 0 && I && I.drone && hasG()) {
          st.droneT -= dt;
          if (G.noise < I.drone.floor) G.noise = I.drone.floor;
          if (G.map && G.map.danger > 0 && Math.random() < dt * I.drone.houndRate * G.map.danger && typeof spawnHound === 'function') spawnHound();
        } else if (st.droneT > 0) st.droneT = 0;
      } catch (e) { st.droneT = 0; }
      return r;
    };
  }

  // ---------------------------------------------------------------- 2. the tuning fork
  const fk = { level: 0, kind: null, d: 99, pan: 0, freq: 0, tt: 0, band: 0 };
  const rod = { has: false, kind: null, rel: 0, d: 99, steady: false, id: null };
  const hum = { o1: null, o2: null, g: null, pan: null };
  function wallCells(map) {
    if (!map || !map.cells) return [];
    if (map._p12sWalls && map._p12sWalls.w === map.w) return map._p12sWalls.list;
    const list = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const c = map.cells[y * map.w + x];
      if (c && typeof c === 'object' && (c.resonant === true || c.p9pSung === true)) list.push({ x, y, cell: c });
    }
    map._p12sWalls = { w: map.w, list };
    return list;
  }
  // what counts as hidden: real map data only
  function hiddenKind(e) {
    if (!e || e.dead || e.hidden || e.corpse) return null;
    if (e.tobinPage) return 'page';
    if (e.kind === 'item') {
      if (e.item === 'cache') return 'cache';
      if (e.item === 'shard') return 'glass';
    }
    if (e.glassGrowth) return 'glass';
    return null;
  }
  function forkRange() { return held(ITEM.silver) > 0 && held(ITEM.fork) < 1 ? FORK.silverRange : FORK.range; }
  const levelAt = (d, R) => (d >= R ? 0 : Math.pow(1 - d / R, 2));   // monotonic: 0 at the edge, 1 on top of it
  function nearestHidden() {
    if (!G.map || !Engine.cam) return null;
    const c = Engine.cam; let best = null;
    const take = (x, y, kind) => { const d = Math.hypot(x - c.x, y - c.y); if (!best || d < best.d) best = { d, x, y, kind }; };
    for (const w of wallCells(G.map)) if (G.map.get(w.x, w.y) === w.cell) take(w.x + 0.5, w.y + 0.5, 'wall');
    for (const e of (G.ents || [])) { const k = hiddenKind(e); if (k && Number.isFinite(e.x) && Number.isFinite(e.y)) take(e.x, e.y, k); }
    return best;
  }
  function probeFork() {
    const R = forkRange(), h = nearestHidden();
    if (!h || h.d >= R) { fk.level = 0; fk.kind = null; fk.d = h ? h.d : 99; fk.pan = 0; return fk; }
    const c = Engine.cam, rel = normAng(Math.atan2(h.y - c.y, h.x - c.x) - c.dir);
    fk.level = levelAt(h.d, R); fk.kind = h.kind; fk.d = h.d; fk.pan = Math.max(-0.75, Math.min(0.75, Math.sin(rel) * 0.75));
    fk.freq = FORK.pitchLo + (FORK.pitchHi - FORK.pitchLo) * fk.level;
    return fk;
  }
  function ensureHum() {
    if (hum.o1 || !ctxOk()) return !!hum.o1;
    try {
      const ctx = Audio_.ctx; hum.g = ctx.createGain(); hum.g.gain.value = 0.0001;
      hum.o1 = ctx.createOscillator(); hum.o1.type = 'sine'; hum.o2 = ctx.createOscillator(); hum.o2.type = 'sine';
      const g2 = ctx.createGain(); g2.gain.value = 0.22; hum.o1.connect(hum.g); hum.o2.connect(g2); g2.connect(hum.g);
      if (ctx.createStereoPanner) { hum.pan = ctx.createStereoPanner(); hum.g.connect(hum.pan); hum.pan.connect(Audio_.sfxBus); } else hum.g.connect(Audio_.sfxBus);
      hum.o1.start(); hum.o2.start(); return true;
    } catch (e) { hum.o1 = null; return false; }
  }
  function stopHum() {
    try { if (hum.g && Audio_.ctx) hum.g.gain.setTargetAtTime(0.0001, Audio_.ctx.currentTime, 0.05); } catch (e) { /* ignore */ }
    try { if (hum.o1) { const a = hum.o1, b = hum.o2; setTimeout(() => { try { a.stop(); b.stop(); } catch (e) { /* stopped */ } }, 300); } } catch (e) { /* ignore */ }
    hum.o1 = hum.o2 = hum.g = hum.pan = null; stats.hum = null;
  }
  function driveHum() {
    const loud = fk.level > 0 && !muted();
    if (!loud) { if (hum.g) { try { hum.g.gain.setTargetAtTime(0.0001, Audio_.ctx.currentTime, 0.12); } catch (e) { /* ignore */ } } stats.hum = null; return; }
    if (!ensureHum()) { stats.hum = { freq: fk.freq, vol: FORK.volLo + (FORK.volHi - FORK.volLo) * fk.level, pan: fk.pan, live: false }; return; }
    const t = Audio_.ctx.currentTime, vol = FORK.volLo + (FORK.volHi - FORK.volLo) * fk.level;
    hum.o1.frequency.setTargetAtTime(fk.freq, t, 0.08); hum.o2.frequency.setTargetAtTime(fk.freq * 2.01, t, 0.08);
    hum.g.gain.setTargetAtTime(vol, t, 0.1); if (hum.pan) hum.pan.pan.setTargetAtTime(fk.pan, t, 0.08);
    stats.hum = { freq: fk.freq, vol, pan: fk.pan, live: true };
  }
  function captionFork() {
    const band = fk.level > 0.7 ? 3 : fk.level > 0.3 ? 2 : fk.level > 0 ? 1 : 0;
    if (band === fk.band) return;
    const up = band > fk.band; fk.band = band;
    if (!up || !band) return;
    try {
      if (typeof ACCESS !== 'undefined' && ACCESS.settings && ACCESS.settings.cap) capLine(TX.cap[['', 'faint', 'near', 'clear'][band]]);
    } catch (e) { /* captions are cosmetic */ }
  }
  // a line in the Sound captions box, written the way access.js writes its own (that box is created lazily there)
  function capLine(text) {
    let box = document.getElementById('ac-captions');
    if (!box) {
      const g = document.getElementById('game'); if (!g) return;
      box = el('div', { id: 'ac-captions', role: 'log', 'aria-live': 'polite', 'aria-label': 'Sound captions' }); g.appendChild(box);
    }
    const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    stats.lastCaption = text;
  }
  function firstSeen() {
    if (!fk.kind || fk.d > 2.2) return;
    const bit = { wall: 1, cache: 2, glass: 4, page: 8 }[fk.kind];
    if (!bit || (flag('p12s_fseen', 0, 15) & bit)) return;
    setFlag('p12s_fseen', flag('p12s_fseen', 0, 15) | bit);
    sayMsg(TX.forkSeen[fk.kind], 'good', 4200);
  }

  // ---------------------------------------------------------------- 3. the dowsing rod
  const hasFlag = (n) => !!(hasG() && G.flags[n]);
  function quarryRoots(map) {
    if (map._p12sShaft && map._p12sShaft.w === map.w) return map._p12sShaft.list;
    const list = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const c = map.cells[y * map.w + x];
      if (c && c.portal && c.portal.map === 'rootvault') list.push({ x: x + 0.5, y: y + 0.5 });
    }
    map._p12sShaft = { w: map.w, list };
    return list;
  }
  // Anchor-roots in the current map, each behind its story gate (so the rod never points ahead of the story)
  function rootTargets() {
    const out = [], id = G.mapId, map = G.map; if (!map) return out;
    if (id === 'quarry' && hasFlag('kaelen_met') && !hasFlag('greening')) for (const s of quarryRoots(map)) out.push({ x: s.x, y: s.y, id: 'quarry', bit: 1 });
    if (id === 'rootvault' && hasFlag('kaelen_met')) for (const e of (G.ents || [])) if (e && e.use === 'bore' && !e.dead) out.push({ x: e.x, y: e.y, id: 'rootvault', bit: 2 });
    if (id === 'malting' && hasFlag('part3') && Array.isArray(map.triggers)) for (const t of map.triggers) if (t && t.id === 'chorister_floor') out.push({ x: t.x, y: t.y, id: 'malting', bit: 4 });
    return out;
  }
  function veinTargets() {
    const out = [];
    for (const e of (G.ents || [])) {
      if (!e || e.dead || e.hidden || !Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;
      if (e.item === 'shard' || e.glassGrowth || (e.kind === 'deco' && e.sprite === 'coil' && !/rope/i.test(e.label || ''))) out.push({ x: e.x, y: e.y, id: 'vein', bit: 8 });
    }
    return out;
  }
  function bedTargets() {
    const out = [], beds = G.map && G.map._p9beds;
    if (Array.isArray(beds)) for (const e of beds) if (e && !e.hidden && Number.isFinite(e.x) && Number.isFinite(e.y)) out.push({ x: e.x, y: e.y, id: 'bed', bit: 16 });
    return out;
  }
  function probeRod() {
    rod.has = false; rod.kind = null; rod.steady = false; rod.id = null;
    if (!G.map || !Engine.cam) return rod;
    const c = Engine.cam;
    let list = rootTargets(), kind = 'root';
    if (!list.length) { list = veinTargets(); kind = 'vein'; }
    if (!list.length) { list = bedTargets(); kind = 'bed'; }
    let best = null;
    for (const t of list) { const d = Math.hypot(t.x - c.x, t.y - c.y); if (!best || d < best.d) best = Object.assign({ d }, t); }
    if (!best || (kind === 'vein' && best.d > ROD.maxVein)) return rod;
    rod.has = true; rod.kind = kind; rod.d = best.d; rod.id = best.id; rod.bit = best.bit;
    rod.rel = normAng(Math.atan2(best.y - c.y, best.x - c.x) - c.dir);
    rod.steady = best.d <= (kind === 'root' ? ROD.steady : ROD.steadyVein);
    return rod;
  }
  function rodFound() {
    if (!rod.has || !rod.steady) return;
    const bit = rod.bit;
    if (flag('p12s_rseen', 0, 31) & bit) return;
    setFlag('p12s_rseen', flag('p12s_rseen', 0, 31) | bit);
    const text = TX.rodSeen[rod.id];
    if (text && typeof journal === 'function') journal('side', text);
  }
  // needle angle from straight up (clockwise): the bearing, plus a wobble that dies away as you close in
  function needleAngle(t) {
    if (!rod.has) return 0;
    if (rod.steady || (typeof GFX !== 'undefined' && GFX.reduceMotion)) return rod.rel;
    const k = Math.min(1, rod.d / 25);
    return rod.rel + (Math.sin(t * 4.1) * ROD.wobble + Math.sin(t * 7.3) * 0.15) * k;
  }

  // ---------------------------------------------------------------- per-frame: tick and HUD
  function tick(dt) {
    if (!hasG() || G.state !== 'play') return;
    const tool = toolId();
    if (!tool) { if (hum.o1) stopHum(); fk.level = 0; fk.band = 0; rod.has = false; return; }
    fk.tt += dt; if (fk.tt < FORK.tick) return; fk.tt = 0;
    if (tool === 1) { probeFork(); driveHum(); captionFork(); firstSeen(); } else { if (hum.o1) stopHum(); fk.level = 0; probeRod(); rodFound(); }
  }
  function drawOverlay() {
    const tool = toolId(); if (!tool || !hasG() || G.state !== 'play') return;
    const ctx = Engine.ctx || (Engine.canvas && Engine.canvas.getContext('2d')); if (!ctx) return;
    const calm = typeof GFX !== 'undefined' && GFX.reduceMotion, T = performance.now() / 1000;
    ctx.save();
    if (tool === 1) {
      const lv = fk.level, sh = calm ? 0 : Math.sin(T * 60) * lv * 1.6;      // the tremble: nothing if motion is reduced, the pips say it instead
      const x = 8 + sh, y = VIEW_H - 22;
      ctx.fillStyle = 'rgba(14,10,7,.7)'; ctx.fillRect(4, VIEW_H - 27, 30, 25);
      ctx.strokeStyle = lv > 0 ? '#e6d19a' : '#8a7a5a'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y + 9); ctx.quadraticCurveTo(x + 10, y + 12, x + 14, y + 9); ctx.lineTo(x + 14, y); ctx.moveTo(x + 10, y + 11); ctx.lineTo(x + 10, y + 19); ctx.stroke();
      if (lv > 0 && !calm) { ctx.strokeStyle = 'rgba(207,233,255,.7)'; ctx.lineWidth = 0.8; for (const dx of [-3, 3]) { ctx.beginPath(); ctx.moveTo(x + 10 + dx * 2.2, y + 1); ctx.lineTo(x + 10 + dx * 2.6, y + 6); ctx.stroke(); } }
      for (let i = 0; i < 5; i++) { ctx.fillStyle = lv > (i + 0.5) / 5.5 ? '#e6d19a' : 'rgba(90,69,48,.8)'; ctx.fillRect(22 + (i % 1), VIEW_H - 25 + i * 4, 8 - i, 2); }
    } else {
      const cx = 160, cy = VIEW_H - 16, r = 11;
      ctx.fillStyle = 'rgba(14,10,7,.72)'; ctx.beginPath(); ctx.arc(cx, cy, r + 1.5, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = rod.steady ? '#a9e07a' : '#8a7a5a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.stroke();
      if (rod.has) {
        const a = needleAngle(T);
        ctx.strokeStyle = rod.steady ? '#d9f09a' : '#e6d19a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - Math.sin(a) * 3, cy + Math.cos(a) * 3); ctx.lineTo(cx + Math.sin(a) * (r - 1.5), cy - Math.cos(a) * (r - 1.5)); ctx.stroke();
      } else { ctx.fillStyle = '#5a4530'; ctx.fillRect(cx - 3, cy - 0.5, 6, 1); }
      ctx.fillStyle = '#c9b88a'; ctx.fillRect(cx - 1, cy - r - 1, 2, 1);
      if (rod.steady) { ctx.font = '6px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#d9f09a'; ctx.fillText(TX.rodLabel, cx, cy - r - 4); }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- panels: Song-book rows, Options rows, the touch button
  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) e.setAttribute(k, props[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function songBookRows() {
    const panel = document.querySelector('#modal-panel');
    if (!panel || panel.querySelector('#p12s-book') || !hasG()) return;
    const owned = INST_ORDER.filter(id => held(id) > 0 && set.inst), tools = [];
    if (set.fork && hasFork()) tools.push(1); if (set.rod && hasRod()) tools.push(2);
    if (!owned.length && !tools.length) return;
    const box = el('div', { id: 'p12s-book', class: 'p12s-book' });
    const refresh = () => { const old = document.getElementById('p12s-book'); if (old) old.remove(); songBookRows(); };
    if (owned.length) {
      box.appendChild(el('h3', null, TX.book.head));
      const row = el('div', { class: 'btns' });
      const none = el('button', { class: 'dfbtn small' + (!instId() ? ' sel' : ''), type: 'button', id: 'p12s-inst-none' }, TX.book.none);
      none.setAttribute('aria-pressed', !instId() ? 'true' : 'false');
      none.onclick = () => { setFlag('p12s_inst', 0); refresh(); };
      row.appendChild(none);
      for (const id of owned) {
        const b = el('button', { class: 'dfbtn small' + (instId() === id ? ' sel' : ''), type: 'button', id: 'p12s-inst-' + INST[id].key }, ITEMS[id].name);
        b.setAttribute('aria-pressed', instId() === id ? 'true' : 'false');
        b.onclick = () => { if (instId() !== id) equip(id); sayMsg(TX.equip[id], 'good', 2200); refresh(); };
        row.appendChild(b);
      }
      box.appendChild(row);
      const cur = instId(); box.appendChild(el('p', { class: 'muted', id: 'p12s-fx' }, cur ? TX.fx[cur] : ''));
    }
    if (tools.length) {
      box.appendChild(el('h3', null, TX.book.tool));
      const row = el('div', { class: 'btns' });
      for (const t of [0].concat(tools)) {
        const label = t === 0 ? TX.book.noTool : t === 1 ? ITEMS[ITEM.fork].name : ITEMS[ITEM.rod].name;
        const b = el('button', { class: 'dfbtn small' + (toolId() === t ? ' sel' : ''), type: 'button', id: 'p12s-tool-' + t }, label);
        b.setAttribute('aria-pressed', toolId() === t ? 'true' : 'false');
        b.onclick = () => { setTool(t); refresh(); };
        row.appendChild(b);
      }
      box.appendChild(row);
    }
    panel.appendChild(box);
  }
  function appendOptionRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p12s-opt-inst')) return;
    const label = (t, hint) => { const s = el('span', { class: 'gfx-label' }, t + ' '); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const toggle = (id, key) => {
      const b = el('button', { class: 'dfbtn small', id, type: 'button' }, set[key] ? TX.opts.on : TX.opts.off);
      const paint = () => { b.textContent = set[key] ? TX.opts.on : TX.opts.off; b.setAttribute('aria-pressed', set[key] ? 'true' : 'false'); b.classList.toggle('sel', set[key]); };
      paint();
      b.onclick = () => { set[key] = !set[key]; saveSet(); paint(); onSwitch(); };
      return b;
    };
    grid.appendChild(label(TX.opts.inst, TX.opts.instHint)); grid.appendChild(toggle('p12s-opt-inst', 'inst'));
    grid.appendChild(label(TX.opts.fork, TX.opts.forkHint)); grid.appendChild(toggle('p12s-opt-fork', 'fork'));
    grid.appendChild(label(TX.opts.rod, TX.opts.rodHint)); grid.appendChild(toggle('p12s-opt-rod', 'rod'));
  }
  function onSwitch() {
    syncStock(); sanitize();
    if (!set.fork && hum.o1) stopHum();
    syncTouch();
  }
  function syncTouch() {
    const b = document.getElementById('p12s-touch'); if (!b) return;
    b.hidden = !(hasG() && ((set.fork && hasFork()) || (set.rod && hasRod())));
  }
  function installTouch() {
    const host = document.getElementById('touchui'); if (!host || document.getElementById('p12s-touch')) return;
    const b = el('button', { id: 'p12s-touch', class: 'tb small', type: 'button', 'aria-label': 'Hold or put away the tuning fork or dowsing rod' }, TX.touch);
    b.hidden = true;
    const act = (ev) => { ev.preventDefault(); ev.stopPropagation(); cycleTool(); syncTouch(); };
    b.addEventListener('click', act);
    host.appendChild(b);
  }

  // ---------------------------------------------------------------- install
  function install() {
    loadSet();
    syncStock();
    try { installTimbre(); } catch (e) { console.warn('songcraft12: timbre failed', e); }
    installTouch();
    if (typeof castSong === 'function') castSong = wrapCast(castSong);
    if (typeof executeCustomSong === 'function') executeCustomSong = wrapCustom(executeCustomSong);
    if (typeof updateNarrow === 'function') updateNarrow = wrapNarrow(updateNarrow);
    if (typeof useItem === 'function') {
      const _use = useItem;
      useItem = function (slot) {
        try {
          const id = slot && slot.id;
          if (INST[id] && hasG() && held(id) > 0) {
            if (!set.inst) { sayMsg(ITEMS[id].desc, '', 5000); return _use.apply(this, arguments); }
            const on = equip(id) === id; sayMsg(on ? TX.equip[id] : TX.unequip, 'good', 2400);
            try { if (typeof renderInventory === 'function') renderInventory(); } catch (e) { /* panel gone */ }
            return undefined;
          }
          if ((id === ITEM.fork || id === ITEM.silver || id === ITEM.rod) && hasG() && held(id) > 0 && ((id === ITEM.rod) ? set.rod : set.fork)) {
            const want = id === ITEM.rod ? 2 : 1; setTool(toolId() === want ? 0 : want); syncTouch();
            try { if (typeof renderInventory === 'function') renderInventory(); } catch (e) { /* panel gone */ }
            return undefined;
          }
        } catch (e) { console.warn('songcraft12: use failed', e); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof renderSongs === 'function') {
      const _rs = renderSongs;
      renderSongs = function () { const r = _rs.apply(this, arguments); try { songBookRows(); } catch (e) { console.warn('songcraft12: song-book rows failed', e); } return r; };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () { const r = _acc.apply(this, arguments); try { appendOptionRows(); } catch (e) { console.warn('songcraft12: options rows failed', e); } return r; };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () { stopHum(); const r = _rg.apply(this, arguments); try { sanitize(); syncTouch(); } catch (e) { /* ignore */ } return r; };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () { const r = _lm.apply(this, arguments); try { fk.band = 0; fk.level = 0; sanitize(); syncTouch(); } catch (e) { /* ignore */ } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) { const r = _up.apply(this, arguments); try { tick(Math.min(0.1, dt)); } catch (e) { /* never break a frame */ } return r; };
    }
    if (typeof drawHUD === 'function') {
      const _hud = drawHUD;
      drawHUD = function () { const r = _hud.apply(this, arguments); try { drawOverlay(); } catch (e) { /* cosmetic */ } return r; };
    }
    window.addEventListener('keydown', (ev) => {
      try {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.repeat || String(ev.key).toLowerCase() !== 'j') return;
        const t = ev.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
        if (hasG() && G.state === 'play') { cycleTool(); syncTouch(); }
      } catch (e) { /* ignore */ }
    });
    try { sanitize(); syncTouch(); } catch (e) { /* no game yet */ }
  }
  try { install(); } catch (e) { console.warn('songcraft12: install failed', e); }

  return {
    INST, INST_ORDER, FORK, ROD, STOCK, TX, set, stats, st, fk, rod,
    instId, inst, equip, toolId, setTool, cycleTool, sanitize, saveSet, loadSet, syncStock, onSwitch,
    levelAt, probeFork, probeRod, nearestHidden, hiddenKind, rootTargets, veinTargets, bedTargets, needleAngle, tick, forkRange,
    playVoice, wrapCast, held, hasFork, hasRod, rodFound, firstSeen,
  };
})();
