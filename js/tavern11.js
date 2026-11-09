// ============================================================
//  tavern11 — Phase 11 (feedback and feel): the Boar & Dulcimer's pastimes, and the cat of Whisper-Grove.
//
//  1. BONES. Garrow Finch, a quarry hauler, sits in the Boar's cellar (before the Greening): the board upstairs
//     says NO DICE (Book One ch. 4), so the bones are played below, among the crates, where a rattle does not carry.
//     "Play Bones" in his dialogue opens a dice game: closest to fourteen, up to four dice, push your luck.
//     Stakes 1-20 sovereigns, a net loss cap per day, never below 0 gold. The dice come from a private
//     seeded stream (mulberry32 of the day and a games counter): the game's combat rolls are never drawn.
//  2. THE EVENING SET. A Narrow performance (the board says NO SINGING): played at a hand's width, and the room
//     applauds without a sound. Carrying an instrument or a reed, Hetty's dialogue offers "Play for the room" from
//     17:00 until midnight, once per evening: ~46 s of notes on four lanes, paying sovereigns and a little
//     Hedge standing by accuracy. Reduce motion slows the tune; "Performance timing" adds a wider window or
//     an auto-timing mode (right lane, roughly right moment).
//  3. THE CAT. The stray in Whisper-Grove takes food from you on three different days and is then yours:
//     she follows through the open maps, waits outside halls and dungeons, cannot be hurt or lost, and
//     hisses (sound panned to where it is, plus a line) at a hostile she can sense within ten tiles that you
//     cannot see. She is not a combat companion: she does nothing else.
//
//  Saved state, all in G.flags, all small integers validated on every read (a hostile save cannot make
//  them anything else):
//    p11t_games rounds of Bones dealt        p11t_lday / p11t_lost  day (+1) and net loss of the tally
//    p11t_pday  day (+1) of last evening set  p11t_perf  sets played
//    p11t_fed   feedings (0-3)  p11t_fday  day (+1) last fed  p11t_adopt 0/1  p11t_name 0-7  p11t_stay 0/1
//    p11t_closed 1 once the Greening closed the Boar's pastimes for a player who had used them
//  Settings (localStorage 'octave.tavern11.v1', Options -> Graphics & access): Tavern games, The cat,
//  Performance timing. Off = the game exactly as before (nothing is placed, no button added).
//  Rules kept: wrappers only; nothing built from save data goes into markup; art is procedural (canvas).
//  Every invented line is marked [PROPOSED] in a comment and listed in P11-TAVERN/TEXT.md.
// ============================================================
'use strict';

const TAVERN = (function () {
  const KEY = 'octave.tavern11.v1';
  const set = { games: true, cat: true, timing: 'normal' };      // timing: normal | wide | auto
  const TIMINGS = ['normal', 'wide', 'auto'];

  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const flag = (name, lo, hi) => Math.floor(num(hasG() ? G.flags[name] : 0, lo, hi, lo));
  const setFlag = (name, v, lo, hi) => { if (hasG()) G.flags[name] = Math.floor(num(v, lo, hi, lo)); };
  const today = () => Math.floor(num(hasG() ? G.day : 0, 0, 99999, 0));
  const hourNow = () => num(hasG() ? G.tod : 0, 0, 0.99999, 0) * 24;
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const sayMsg = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  const reduced = () => !!(typeof GFX !== 'undefined' && (GFX.reduceMotion || GFX.reducedMotion));
  const noFlash = () => !!(typeof GFX !== 'undefined' && GFX.noFlash);
  const worldGone = () => { if (!hasG()) return true; const f = G.flags; return !!(f.greening || f.escaped || f.part3); };

  function loadSet() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { set.games = o.games !== false; set.cat = o.cat !== false; if (TIMINGS.includes(o.timing)) set.timing = o.timing; }
    } catch (e) { /* private window or blocked storage: the defaults stand */ }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify({ games: set.games, cat: set.cat, timing: set.timing })); } catch (e) { /* ignore */ } }
  const gamesOn = () => set.games !== false;
  const catOn = () => set.cat !== false;

  // ---------------------------------------------------------------- the text [PROPOSED] (all of it; see TEXT.md)
  const TX = {
    opts: {
      games: 'Tavern games', gamesHint: 'Bones with Garrow Finch, and playing for the room, at the Boar & Dulcimer.',
      cat: 'The cat', catHint: 'The stray of Whisper-Grove: feed her on three days and she follows you, and hisses at what you cannot see.',
      timing: 'Performance timing', timingHint: 'Normal, a wider window, or auto-timing (the right lane at roughly the right moment).',
      normal: 'Normal', wide: 'Wide window', auto: 'Auto-timing', on: 'On', off: 'Off',
    },
    garrow: {
      name: 'Garrow Finch',
      greetPolite: 'Garrow Finch, on a crate in the cellar, nudges a stool out with his boot. "Hetty\'s board says no dice, and Hetty\'s board is upstairs. A throw of bones, if you have a coin to lose?"',
      greetNormal: 'Garrow Finch, a quarry hauler off shift, shakes his cup inside his coat so it will not rattle. "Bones? One to twenty sovereigns. Nobody down here ever got rich, and nobody has had to leave."',
      greetBlunt: '"Bones, or back up the stair," says Garrow, and shakes the cup inside his coat.',
      button: 'Play Bones',
      cap: 'Garrow slides the cup away. "Enough for one day. Come back when it has turned over."',
      broke: 'You have nothing to put on the table.',
      closedJournal: 'Garrow\'s bones in the cellar, Hetty\'s taproom, the playing at a hand\'s width: all of it is on the wrong side of the Greening now. I still catch myself counting to fourteen.',
    },
    bones: {
      title: 'Bones',
      rules: 'Closest to fourteen wins. Take dice one at a time, up to four; go over fourteen and you bust. Garrow takes a die on eleven or less. Ties go to the table. Exactly fourteen pays double. Two ones on your first throw is a Quiet: the cup is void.',
      stake: 'Stake',
      purse: 'Purse {0} · lost today {1} of {2}',
      deal: 'Deal', take: 'Take a die', stand: 'Stand', again: 'Again', leave: 'Leave the table', less: 'Less', more: 'More',
      pick: 'Choose a stake, then deal.',
      yourMove: 'Your total is {0}. Take a die, or stand.',
      houseMove: 'Garrow turns his hidden die over.',
      keys: 'Left / Right stake ±1 · Up / Down ±5 · Enter or Space deals and takes · S stands · Esc leaves · pad: A takes, X stands, B leaves, D-pad stakes',
      sure: 'Stand to end the throw, or press Escape again to walk away. The stake is lost.',
      alt: 'A table with two sets of dice on it.',
      yours: 'You', his: 'Garrow',
      win: 'You hold {0} to his {1}. He pays you {2}.',
      chord: 'Fourteen, on the nose. Garrow whistles through his teeth and counts out {0}.',
      lose: 'He holds {1} to your {0}. You pay {2}.',
      tie: 'Level at {0}, and level goes to the table. You pay {1}.',
      bust: 'Over fourteen: {0}. The bones are not sorry. You pay {1}.',
      houseBust: 'Garrow draws and goes over: {0}. He pays you {1}.',
      voidRoll: 'Two ones. The Quiet: the table goes still for a breath, the cup is void, and the stake is yours again.',
      forfeit: 'You leave the table in the middle of a throw. Garrow keeps the stake.',
    },
    perf: {
      button: 'Play for the room',
      early: 'Play for the room (the Boar fills in the evening)',
      done: 'Play for the room (you have played tonight)',
      title: 'The Boar\'s Reel',
      intro: 'You take out your instrument and play for the room the Narrow way, a hand\'s width loud, the tune carried by the fingers and not the breath. The Boar goes quiet in the ordinary way: the way a room does before someone tries.',
      hint: 'Notes fall to the line. Press the lane as each one lands.',
      keys: 'A S W D or the arrow keys · pad: X A Y B, Back puts it away · or tap a lane · Esc puts it away',
      alt: 'Four lanes of falling notes and a line to meet them on.',
      listen: 'Ready…', go: 'Play', stop: 'Put it away',
      lanes: ['Left', 'Down', 'Up', 'Right'],
      none: 'Nobody looks up. Hetty collects the glasses.',
      low: 'A few people touch two fingers to the table, which is how the Boar applauds now. Someone puts two coins in the hat.',
      mid: 'Half the room taps the last verse out on the tables with one finger, without a sound. Hetty sets a cup by your elbow.',
      high: 'On the last bars the whole room lifts its hands and shakes them in the air, the silent applause, and nobody makes a sound. Even Hetty stops wiping the same glass.',
      pay: 'You collect {0} sovereigns from the hat.',
      nopay: 'The hat stays empty.',
      rep: 'The Hedge folk will remember it kindly.',
      abort: 'You put the instrument away unfinished.',
      score: 'Perfect {0} · Good {1} · Missed {2}',
      result: 'Accuracy {0}%',
      close: 'Close',
    },
    cat: {
      title: 'The cat',
      offer: 'A grey cat, wet to the elbows, sits where the water-light is best. She looks at the food in your hand and then at your face, in that order, as if one of them might be lying.',
      offerBtn: 'Offer the {0}', scratch: 'Scratch her ears', leave: 'Leave her be',
      notHungry: 'She is not hungry. She has the look of someone who will be, tomorrow.',
      fed1: 'She takes it three feet off, eats with her back to you, and leaves at once. Not thanks. Acknowledgement.',
      fed2: 'She eats this one at arm\'s length, eyes on you the whole time. When she is done she does not leave.',
      fed3: 'She finishes, washes one paw, and climbs onto your arm as though it had been agreed some time ago. She is yours, or you are hers. The cat has not said.',
      journalAdopt: 'A grey cat in Whisper-Grove has decided I am hers. She is not a Hollow. She remembers all of it and keeps her own counsel.',
      namePrompt: 'What will you call her?',
      nameKeys: '1-8 or Enter keeps the current name · Escape keeps it',
      nameBtn: 'Rename her',
      named: '{0}. She considers it, and does not object.',
      pet: '{0} leans her whole weight into your hand.',
      idle: '{0} watches you with the patience of someone who has never been in a hurry.',
      stayBtn: 'Ask her to wait here', followBtn: 'Ask her to come along',
      stayMsg: '{0} sits. It is not a promise, only a sit.',
      followMsg: '{0} gets up, stretches, and falls in behind your heels.',
      waits: '{0} sits down outside and washes a paw. She does not do doors that echo.',
      hiss: '{0} stops, ears flat, and hisses {1}.',
      dirs: ['ahead of you', 'off to your right', 'behind you', 'off to your left'],
    },
  };
  const TIMING_NAME = { normal: TX.opts.normal, wide: TX.opts.wide, auto: TX.opts.auto };
  const CAT_NAMES = ['Thimble', 'Burr', 'Sorrel', 'Wick', 'Tansy', 'Nettle', 'Moth', 'Pip'];   // [PROPOSED] Thimble is the default
  const catName = () => CAT_NAMES[flag('p11t_name', 0, CAT_NAMES.length - 1)];

  // ---------------------------------------------------------------- a private, seeded random stream
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFor(day, games) { return (Math.imul((day | 0) + 11, 2654435761) ^ Math.imul((games | 0) + 7, 40503) ^ 0x426F6E65) >>> 0; }

  // ================================================================ 1. BONES (the rules, pure)
  const B = { TARGET: 14, MAX_DICE: 4, HOUSE_DRAWS: 11, MIN_STAKE: 1, MAX_STAKE: 20, DAY_CAP: 60 };
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  // A round: two dice each (the house's second one face down). Everything the dice do comes from this
  // round's own stream, in a fixed order, so the same seed and the same choices give the same game.
  function newRound(seed, stake) {
    const rng = mulberry32(seed >>> 0);
    const roll = () => 1 + Math.floor(rng() * 6);
    const r = { seed: seed >>> 0, stake: Math.floor(num(stake, B.MIN_STAKE, B.MAX_STAKE, B.MIN_STAKE)), roll, mine: [], house: [], hidden: true, phase: 'player', result: null, delta: 0 };
    r.mine.push(roll()); r.house.push(roll()); r.mine.push(roll()); r.house.push(roll());
    if (r.mine[0] === 1 && r.mine[1] === 1) finish(r, 'void');
    return r;
  }
  function finish(r, kind) {
    r.phase = 'done'; r.hidden = false; r.result = kind;
    r.delta = kind === 'win' || kind === 'houseBust' ? r.stake : kind === 'chord' ? r.stake * 2 : kind === 'void' ? 0 : -r.stake;
    return r;
  }
  function take(r) {
    if (!r || r.phase !== 'player' || r.mine.length >= B.MAX_DICE) return false;
    r.mine.push(r.roll());
    if (sum(r.mine) > B.TARGET) { finish(r, 'bust'); return true; }
    if (r.mine.length >= B.MAX_DICE) stand(r);       // four dice and still standing: the throw ends itself
    return true;
  }
  function stand(r) {
    if (!r || r.phase !== 'player') return false;
    r.phase = 'house'; r.hidden = false;
    while (sum(r.house) <= B.HOUSE_DRAWS && r.house.length < B.MAX_DICE) r.house.push(r.roll());
    const m = sum(r.mine), h = sum(r.house);
    if (h > B.TARGET) finish(r, 'houseBust');
    else if (m > h) finish(r, m === B.TARGET ? 'chord' : 'win');
    else finish(r, 'lose');                           // ties go to the table
    r.tie = m === h;
    return true;
  }
  // Largest stake the player may put down now: purse, 20, and what is left of the day's loss cap.
  function lostToday() { return flag('p11t_lday', 0, 100000) === today() + 1 ? flag('p11t_lost', 0, 9999) : 0; }
  function maxStake() {
    const gold = Math.floor(num(hasG() && G.player ? G.player.gold : 0, 0, 1e9, 0));
    return Math.max(0, Math.min(B.MAX_STAKE, gold, B.DAY_CAP - lostToday()));
  }
  // Settle a finished round against the purse and the day's tally (the only place gold moves).
  function settle(r) {
    const p = G.player; if (!p) return 0;
    const gold = Math.floor(num(p.gold, 0, 1e9, 0));
    let delta = r.delta;
    if (delta < 0) delta = -Math.min(-delta, gold);   // never below 0, whatever happened since the deal
    p.gold = gold + delta;
    const d = today(), lost = lostToday();
    setFlag('p11t_lday', d + 1, 0, 100000);
    setFlag('p11t_lost', Math.max(0, lost - delta), 0, 9999);
    r.settled = true; r.paid = delta;
    return delta;
  }
  // One whole round without any screen: used by the tests and by anything that wants a result.
  function playAuto(seed, stake, standAt) {
    const r = newRound(seed, stake);
    while (r.phase === 'player') { if (sum(r.mine) >= (standAt == null ? 11 : standAt)) stand(r); else take(r); }
    return r;
  }
  function describe(r) {
    const T = TX.bones, m = sum(r.mine), h = sum(r.house), s = r.stake;
    switch (r.result) {
      case 'win': return fmt(T.win, m, h, s);
      case 'chord': return fmt(T.chord, s * 2);
      case 'lose': return r.tie ? fmt(T.tie, m, s) : fmt(T.lose, m, h, s);
      case 'bust': return fmt(T.bust, m, s);
      case 'houseBust': return fmt(T.houseBust, h, s);
      case 'void': return T.voidRoll;
      default: return '';
    }
  }

  // ---------------------------------------------------------------- tiny audio helpers (procedural, on Audio_'s own graph)
  let noiseBuf = null;
  const sfxOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  const cosRnd = (() => { let s = 0x5EED1234; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; })();   // cosmetic stream
  function noise() {
    const ctx = Audio_.ctx;
    if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = cosRnd() * 2 - 1;
    }
    return noiseBuf;
  }
  // a few dry knocks on wood: bandpassed noise ticks and a low thud
  function clatter(n) {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t0 = ctx.currentTime;
      for (let i = 0; i < n; i++) {
        const at = t0 + i * (0.05 + cosRnd() * 0.05), src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = noise(); bp.type = 'bandpass'; bp.frequency.value = 1400 + cosRnd() * 2200; bp.Q.value = 3;
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.16, at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
        src.connect(bp); bp.connect(g); g.connect(Audio_.sfxBus); src.start(at, cosRnd() * 0.3, 0.07);
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(190, at); o.frequency.exponentialRampToValueAtTime(95, at + 0.06);
        og.gain.setValueAtTime(0.0001, at); og.gain.exponentialRampToValueAtTime(0.09, at + 0.005); og.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
        o.connect(og); og.connect(Audio_.sfxBus); o.start(at); o.stop(at + 0.08);
      }
    } catch (e) { /* no sound is not an error */ }
  }
  // a plucked dulcimer-ish note for the evening set
  function pluck(freq, vol) {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o1.type = 'triangle'; o1.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2.01; g2.gain.value = 0.3;
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(Audio_.sfxBus); o1.start(t); o2.start(t); o1.stop(t + 1); o2.stop(t + 1);
    } catch (e) { /* ignore */ }
  }
  function thud() {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g); g.connect(Audio_.sfxBus); o.start(t); o.stop(t + 0.18);
    } catch (e) { /* ignore */ }
  }
  // the cat's hiss, panned to where the thing is
  function hissSound(pan) {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise(); hp.type = 'highpass'; hp.frequency.value = 2500; bp.type = 'bandpass'; bp.frequency.value = 5200; bp.Q.value = 0.8;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.05); g.gain.setTargetAtTime(0.0001, t + 0.35, 0.12);
      src.connect(hp); hp.connect(bp); bp.connect(g);
      let tail = g;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = num(pan, -0.8, 0.8, 0); g.connect(p); tail = p; }
      tail.connect(Audio_.sfxBus); src.start(t, 0, 0.7);
    } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------- the panel plumbing shared by Bones and the set
  function padNow() {
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ }
    return null;
  }
  const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- pixel dice (procedural stand-in)
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  function drawDie(c, x, y, size, v, o) {
    o = o || {};
    const u = size / 14, R = (gx, gy, gw, gh, col) => { c.fillStyle = col; c.fillRect(Math.round(x + gx * u), Math.round(y + gy * u), Math.ceil(gw * u), Math.ceil(gh * u)); };
    R(2, 13, 11, 1, 'rgba(0,0,0,.35)');                                   // shadow on the cloth
    R(1, 1, 12, 12, o.dim ? '#4a3d28' : '#5a4a30');                       // edge
    R(2, 2, 10, 10, o.dim ? '#a89c80' : '#d8cdb0');                       // face
    R(2, 2, 10, 1, '#efe6cc'); R(2, 2, 1, 10, '#efe6cc');                 // light edge
    R(2, 11, 10, 1, '#a99a78'); R(11, 2, 1, 10, '#a99a78');               // shade edge
    if (v >= 1 && v <= 6) for (const cell of PIPS[v]) R(3 + (cell % 3) * 3 + 0.5, 3 + Math.floor(cell / 3) * 3 + 0.5, 2, 2, o.hot ? '#8a1a10' : '#2a1d12');
    else R(5, 5, 4, 4, '#7d6e50');                                         // a face-down die: a blank block
  }

  // ---------------------------------------------------------------- the Bones panel
  let bonesUi = null;
  function openBones(opts) {
    opts = opts || {};
    if (bonesUi || !hasG() || !G.player) return null;
    if (G.state === 'play') G.state = 'panel';
    const ui = bonesUi = { round: null, stake: Math.min(5, Math.max(1, maxStake() || 1)), shown: { mine: 0, house: 0 }, anim: [], busy: false, sure: 0, closed: false, say: '', padPrev: {}, token: 0, rolls: 0 };
    const T = TX.bones;
    openModal(`<h2></h2>
      <div class="t11"><canvas id="t11-cv" width="480" height="168" role="img"></canvas>
      <p class="t11-say" id="t11-say" role="status" aria-live="polite"></p>
      <p class="muted t11-purse" id="t11-purse"></p>
      <div class="btns t11-btns"><button class="dfbtn small" id="t11-less" type="button"></button><b id="t11-stake" class="t11-stake" aria-live="polite"></b><button class="dfbtn small" id="t11-more" type="button"></button>
      <button class="dfbtn small" id="t11-main" type="button"></button><button class="dfbtn small" id="t11-stand" type="button"></button><button class="dfbtn small" id="t11-leave" type="button"></button></div>
      <p class="muted t11-rules" id="t11-rules"></p><p class="muted t11-keys" id="t11-keys"></p></div>`, 'p11t_bones');
    ui.token = G.panelToken;
    const q = (id) => document.getElementById(id);
    q('t11-cv').setAttribute('aria-label', T.alt);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('t11-less').textContent = '−'; q('t11-less').setAttribute('aria-label', T.less); q('t11-more').textContent = '+'; q('t11-more').setAttribute('aria-label', T.more);
    q('t11-stand').textContent = T.stand; q('t11-leave').textContent = T.leave;
    q('t11-rules').textContent = T.rules; q('t11-keys').textContent = T.keys;
    ui.cv = q('t11-cv'); ui.cx = ui.cv.getContext('2d');
    const inRound = () => !!(ui.round && ui.round.phase !== 'done');
    const sync = () => {
      const r = ui.round, cap = maxStake();
      ui.stake = Math.max(cap ? 1 : 0, Math.min(ui.stake, cap || 0));
      const playing = inRound() && !ui.busy;
      q('t11-stake').textContent = T.stake + ' ' + (r && r.phase !== 'done' ? r.stake : ui.stake);
      q('t11-less').disabled = inRound() || ui.stake <= 1; q('t11-more').disabled = inRound() || ui.stake >= cap;
      const main = q('t11-main');
      main.textContent = inRound() ? T.take : (r ? T.again : T.deal);
      main.disabled = inRound() ? (!playing || r.mine.length >= B.MAX_DICE) : (cap < 1);
      q('t11-stand').disabled = !playing; q('t11-stand').hidden = !inRound();
      q('t11-leave').disabled = ui.busy;
      q('t11-purse').textContent = fmt(T.purse, Math.floor(num(G.player.gold, 0, 1e9, 0)), lostToday(), B.DAY_CAP);
      q('t11-say').textContent = ui.say;
      draw();
    };
    ui.sync = sync;
    const say = (t) => { ui.say = t; const e = q('t11-say'); if (e) e.textContent = t; };
    ui.sayNow = say;
    // dice on the cloth. A die rolling shows a tumble of faces for a moment; reduce motion skips it.
    const dieAnim = (side, i, now) => ui.anim.find((a) => a.side === side && a.i === i && now < a.until);
    function draw() {
      const c = ui.cx, W = ui.cv.width, H = ui.cv.height, now = performance.now(), r = ui.round;
      c.imageSmoothingEnabled = false;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3a2a'); g.addColorStop(1, '#1b281c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4);
      c.font = '15px "Alegreya SC", Georgia, serif'; c.textBaseline = 'alphabetic';
      const row = (label, dice, shown, y, side, total, hiddenIdx) => {
        c.fillStyle = '#e8d9b5'; c.textAlign = 'left'; c.fillText(label, 14, y + 18);
        for (let i = 0; i < 4; i++) {
          const x = 120 + i * 62;
          c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(x - 2, y + 4, 54, 54);
          if (i >= dice.length || i >= shown) continue;
          const an = dieAnim(side, i, now);
          let v = dice[i], dy = 0, dx = 0;
          if (hiddenIdx === i && r && r.hidden) v = 0;
          if (an) { v = 1 + Math.floor((now / 70 + i * 3) % 6); const k = (an.until - now) / an.dur; dy = -Math.abs(Math.sin(k * 9)) * 16 * k; dx = Math.sin(k * 14) * 3 * k; }
          drawDie(c, x + dx, y + 6 + dy, 50, v, { hot: !an && v === 1 && side === 'mine' && dice.length === 2 && dice[0] === 1 && dice[1] === 1 });
        }
        c.textAlign = 'right'; c.fillStyle = '#d9a441'; c.font = '20px "Alegreya SC", Georgia, serif'; c.fillText(total, W - 16, y + 36); c.font = '15px "Alegreya SC", Georgia, serif';
      };
      const mineTot = r ? sum(r.mine.slice(0, ui.shown.mine)) : '';
      let houseTot = '';
      if (r) houseTot = r.hidden ? sum(r.house.slice(0, 1)) + ' + ?' : sum(r.house.slice(0, ui.shown.house));
      row(TX.bones.his, r ? r.house : [], ui.shown.house, 8, 'house', houseTot, 1);
      row(TX.bones.yours, r ? r.mine : [], ui.shown.mine, 92, 'mine', r ? mineTot + ' / ' + B.TARGET : '', -1);
    }
    ui.draw = draw;
    // reveal dice one by one (instantly under Reduce motion), then show the verdict
    const roll = (side, i, instant) => {
      const dur = instant ? 0 : 450;
      ui.shown[side] = Math.max(ui.shown[side], i + 1);
      if (!instant) { ui.anim.push({ side, i, until: performance.now() + dur, dur }); clatter(3); } else thud();
    };
    const stepAnim = () => { if (!ui.closed) { draw(); ui.raf = requestAnimationFrame(stepAnim); } };
    ui.raf = requestAnimationFrame(stepAnim);
    const wait = (ms) => new Promise((res) => { ui.timer = setTimeout(res, ms); });
    const instant = () => reduced() || opts.instant === true;
    ui.deal = async () => {
      if (ui.busy || inRound()) return;
      const cap = maxStake();
      if (cap < 1) { say(G.player.gold < 1 ? TX.garrow.broke : TX.garrow.cap); sync(); return; }
      ui.stake = Math.min(ui.stake, cap) || 1;
      const games = flag('p11t_games', 0, 9999);
      setFlag('p11t_games', games + 1, 0, 9999);
      const r = ui.round = newRound(seedFor(today(), games), ui.stake);
      ui.shown = { mine: 0, house: 0 }; ui.anim = []; ui.busy = true; ui.sure = 0; say(''); sync();
      const inst = instant();
      roll('mine', 0, inst); if (!inst) await wait(260); roll('house', 0, inst); if (!inst) await wait(260);
      roll('mine', 1, inst); if (!inst) await wait(260); roll('house', 1, inst); if (!inst) await wait(480);
      if (ui.closed) return;
      ui.busy = false;
      if (r.phase === 'done') await conclude(); else { say(fmt(T.yourMove, sum(r.mine))); sync(); }
    };
    ui.take = async () => {
      const r = ui.round; if (ui.busy || !r || r.phase !== 'player') return;
      const before = r.mine.length;
      if (!take(r)) return;
      ui.busy = true; ui.sure = 0; roll('mine', before, instant()); sync();
      if (!instant()) await wait(520);
      if (ui.closed) return;
      if (r.phase === 'house') { await revealHouse(); return; }      // four dice: the throw ended itself
      ui.busy = false;
      if (r.phase === 'done') await conclude(); else { say(fmt(T.yourMove, sum(r.mine))); sync(); }
    };
    async function revealHouse() {
      const r = ui.round; ui.busy = true; say(T.houseMove); ui.shown.house = Math.max(ui.shown.house, 2); sync();
      const inst = instant();
      if (!inst) await wait(500);
      for (let i = 2; i < r.house.length; i++) { if (ui.closed) return; roll('house', i, inst); sync(); if (!inst) await wait(560); }
      if (ui.closed) return;
      ui.busy = false; await conclude();
    }
    ui.stand = async () => {
      const r = ui.round; if (ui.busy || !r || r.phase !== 'player') return;
      stand(r); ui.sure = 0;
      if (r.phase === 'done' || r.phase === 'house') { ui.shown.house = Math.max(ui.shown.house, 1); await revealHouse(); }
    };
    async function conclude() {
      const r = ui.round; if (!r || r.settled) return;
      ui.shown = { mine: r.mine.length, house: r.house.length };
      settle(r);
      if (r.result === 'bust') thud();
      say(describe(r) + (maxStake() < 1 ? ' ' + (G.player.gold < 1 ? TX.garrow.broke : TX.garrow.cap) : ''));
      ui.stake = Math.min(ui.stake, Math.max(1, maxStake()));
      sync();
    }
    // forfeit: the panel is going away in the middle of a throw
    const forfeit = () => {
      const r = ui.round;
      if (r && r.phase !== 'done' && !r.settled) { r.phase = 'done'; r.result = 'lose'; r.delta = -r.stake; settle(r); sayMsg(T.forfeit, 'warn', 3500); }
    };
    ui.close = () => {
      if (ui.closed) return; ui.closed = true;
      forfeit();
      clearTimeout(ui.timer); cancelAnimationFrame(ui.raf);
      window.removeEventListener('keydown', onKey, true);
      if (ui.poll) cancelAnimationFrame(ui.poll);
      if (G.panelToken === ui.token && G.openPanel === 'p11t_bones') closeModal();
      if (G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {}; bonesUi = null;
    };
    const leaveAsk = () => {
      if (ui.busy) return;
      if (inRound() && !ui.round.settled) {
        if (ui.sure && performance.now() - ui.sure < 3500) { ui.close(); return; }
        ui.sure = performance.now(); say(T.sure); return;
      }
      ui.close();
    };
    ui.leave = leaveAsk;
    const adj = (d) => { if (inRound() || ui.busy) return; ui.stake = Math.max(1, Math.min(maxStake() || 1, ui.stake + d)); sync(); };
    ui.adj = adj;
    const main = () => { if (inRound()) ui.take(); else ui.deal(); };
    q('t11-main').onclick = main; q('t11-stand').onclick = () => ui.stand(); q('t11-leave').onclick = leaveAsk;
    q('t11-less').onclick = () => adj(-1); q('t11-more').onclick = () => adj(1);
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      const used = ['enter', ' ', '1', '2', 's', 'escape', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k);
      if (!used) return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      if (ev.repeat && k !== 'arrowleft' && k !== 'arrowright') return;
      if (k === 'enter' || k === ' ' || k === '1') main();
      else if (k === 's' || k === '2') ui.stand();
      else if (k === 'escape') leaveAsk();
      else if (k === 'arrowleft') adj(-1); else if (k === 'arrowright') adj(1);
      else if (k === 'arrowup') adj(5); else if (k === 'arrowdown') adj(-5);
    }
    window.addEventListener('keydown', onKey, true);
    // controller
    const pollPad = () => {
      if (ui.closed) return;
      if (G.panelToken !== ui.token || G.openPanel !== 'p11t_bones') { ui.close(); return; }     // another panel took over: walk away
      const g = padNow();
      if (g) {
        const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed); const was = ui.padPrev[i]; ui.padPrev[i] = now; return now && !was; };
        if (edge(0)) main(); if (edge(2)) ui.stand(); if (edge(1)) leaveAsk();
        if (edge(14)) adj(-1); if (edge(15)) adj(1); if (edge(12)) adj(5); if (edge(13)) adj(-5);
      }
      ui.poll = requestAnimationFrame(pollPad);
    };
    ui.poll = requestAnimationFrame(pollPad);
    say(T.pick);
    sync();
    const first = q('t11-main'); if (first && !first.disabled) first.focus({ preventScroll: true });
    return ui;
  }

  // ================================================================ 2. THE EVENING SET
  // [PROPOSED] an original tune, "The Boar's Reel": 18 bars of eight eighth-notes, lanes 0-3, '.' a rest.
  // The four lanes sound 174 Hz (Growth) up an octave, a ninth above it, the fifth and the sixth: a plain
  // five-note scale, so a player who misses a note still hears something that belongs.
  const REEL = ['0.1.2.1.', '2.3.2.1.', '0.1.2.3.', '2.1.0...', '0.1.2.1.', '2.3.2.1.', '3.2.1.2.', '0.1.0...',
    '1.2.3.2.', '1.2.3.3.', '3.2.3.2.', '1.2.1.0.', '0.1.2.3.', '3.2.1.2.', '0123.321', '2.3.2.1.', '0.1.2.1.', '0.......'];
  const LANE_HZ = [348, 391.5, 522, 580];
  const BPM = 96, LEAD = 2.2, TAIL = 1.8;
  const WINDOWS = { normal: { perfect: 0.07, good: 0.14 }, wide: { perfect: 0.11, good: 0.22 }, auto: { perfect: 0.45, good: 0.45 } };
  // The chart: every note's time in seconds. `slow` (Reduce motion) stretches the tune by a quarter.
  function chart(slow) {
    const eighth = 60 / BPM / 2 * (slow ? 1.25 : 1), notes = [];
    REEL.forEach((bar, b) => { for (let s = 0; s < 8; s++) { const ch = bar[s]; if (ch !== '.') notes.push({ t: LEAD + (b * 8 + s) * eighth, lane: +ch, grade: null }); } });
    return { notes, end: notes[notes.length - 1].t + TAIL };
  }
  // The pay table (also the tests' reference): accuracy 0..1 -> sovereigns and Hedge standing.
  function reward(acc) {
    acc = num(acc, 0, 1, 0);
    return { gold: acc < 0.15 ? 0 : Math.round(2 + acc * 18), rep: acc >= 0.9 ? 2 : acc >= 0.6 ? 1 : 0 };
  }
  function instrumentIds() {
    const out = [];
    if (!hasG() || !G.player || !Array.isArray(G.player.inv) || typeof ITEMS === 'undefined') return out;
    for (const s of G.player.inv) {
      if (!s || typeof s.id !== 'string' || out.includes(s.id)) continue;
      const it = ITEMS[s.id]; if (!it || s.id === 'p9_dryreed' || s.id === 'p9_reed_split') continue;
      if (num(s.n, 0, 999, 1) < 1) continue;
      if (/whistle|flute|lute|fiddle|dulcimer|pipe|horn|reed|drum/i.test(s.id + ' ' + (it.name || ''))) out.push(s.id);
    }
    return out;
  }
  const hasInstrument = () => instrumentIds().length > 0;
  const isEvening = () => hourNow() >= 17;
  const playedTonight = () => flag('p11t_pday', 0, 100000) === today() + 1;
  // 'hidden' (no instrument, switched off, or the Boar is gone), 'early', 'done' or 'ready'
  function perfStatus() {
    if (!gamesOn() || worldGone() || !hasInstrument()) return 'hidden';
    if (playedTonight()) return 'done';
    return isEvening() ? 'ready' : 'early';
  }

  let perfUi = null;
  // A session: judge(t, lane) against the chart. `manual` lets tests step time themselves.
  function startPerformance(opts) {
    opts = opts || {};
    if (perfUi) return null;
    const slow = opts.slow != null ? !!opts.slow : reduced();
    const mode = TIMINGS.includes(opts.mode) ? opts.mode : set.timing;
    const ch = chart(slow), W = WINDOWS[mode];
    const s = perfUi = { notes: ch.notes, end: ch.end, mode, win: W, t: -0.8, slow, perfect: 0, good: 0, miss: 0, stray: 0, done: false, manual: !!opts.manual, flash: [], shake: 0, last: [0, 0, 0, 0], padPrev: {}, keysDown: {} };
    s.total = s.notes.length;
    s.press = (lane) => {
      if (s.done || !(lane >= 0 && lane < 4)) return null;
      let best = null, bd = 1e9;
      // the oldest waiting note in the lane inside the window: with wide windows two notes can both be in reach
      for (const n of s.notes) { if (n.grade || n.lane !== lane) continue; const d = Math.abs(n.t - s.t); if (d <= W.good) { best = n; bd = d; break; } }
      s.last[lane] = s.t;
      if (!best) { if (s.mode !== 'auto' && s.t > 0) s.stray++; if (s.mode !== 'auto') s.shake = reduced() ? 0 : 0.18; return { hit: false }; }
      best.grade = bd <= W.perfect ? 'perfect' : 'good';
      if (best.grade === 'perfect') s.perfect++; else s.good++;
      s.flash.push({ lane, t: s.t, grade: best.grade });
      pluck(LANE_HZ[lane], 0.17);
      return { hit: true, grade: best.grade, d: bd };
    };
    s.step = (dt) => {
      if (s.done) return;
      s.t += s.manual ? Math.max(0, Number(dt) || 0) : num(dt, 0, 0.25, 0);     // a real frame never jumps; a test may
      for (const n of s.notes) if (!n.grade && s.t - n.t > W.good) { n.grade = 'miss'; s.miss++; if (!reduced() && s.mode !== 'auto') s.shake = 0.12; }
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt);
      if (s.t >= s.end) s.finish(false);
    };
    s.result = () => {
      const base = (s.perfect + s.good * 0.6) / Math.max(1, s.total);
      const acc = num(s.mode === 'auto' ? (s.perfect + s.good) / Math.max(1, s.total) : base - Math.min(0.3, s.stray * 0.01), 0, 1, 0);
      return { accuracy: acc, perfect: s.perfect, good: s.good, miss: s.total - s.perfect - s.good, stray: s.stray, total: s.total, mode: s.mode };
    };
    s.promise = new Promise((resolve) => { s.resolve = resolve; });
    s.finish = (aborted) => {
      if (s.done) return; s.done = true;
      const res = s.result(); res.aborted = !!aborted;
      if (!aborted) {
        // everything unplayed counts as missed, then the evening is spent and the hat comes round
        const r = reward(res.accuracy); res.gold = r.gold; res.rep = r.rep;
        setFlag('p11t_pday', today() + 1, 0, 100000); setFlag('p11t_perf', flag('p11t_perf', 0, 99) + 1, 0, 99);
        if (r.gold && G.player) G.player.gold = Math.floor(num(G.player.gold, 0, 1e9, 0)) + r.gold;
        try { if (r.rep && typeof changeRep === 'function') changeRep('hedge', r.rep); } catch (e) { /* standing is a bonus */ }
      }
      s.out = res; perfUi = null;
      s.resolve(res);
    };
    return s;
  }

  function openPerformance(opts) {
    opts = opts || {};
    if (perfUi || !hasG() || !G.player) return null;
    if (G.state === 'play') G.state = 'panel';
    const T = TX.perf;
    openModal(`<h2></h2>
      <div class="t11"><canvas id="t11-cv" width="480" height="232" role="img"></canvas>
      <p class="t11-say" id="t11-say" role="status" aria-live="polite"></p>
      <div class="btns t11-lanes" id="t11-lanes"></div>
      <div class="btns t11-btns"><button class="dfbtn small" id="t11-go" type="button"></button><button class="dfbtn small" id="t11-stop" type="button"></button></div>
      <p class="muted t11-keys" id="t11-keys"></p></div>`, 'p11t_perf');
    const token = G.panelToken;
    const q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('t11-cv').setAttribute('aria-label', T.alt);
    q('t11-keys').textContent = T.keys + ' · ' + TIMING_NAME[set.timing];
    q('t11-go').textContent = T.go; q('t11-stop').textContent = T.stop;
    q('t11-say').textContent = T.hint;
    const s = startPerformance(Object.assign({ manual: true }, opts));
    s.manual = !!opts.manual; s.running = false; s.unbound = false;
    s.panel = true;
    const cv = q('t11-cv'), c = cv.getContext('2d');
    const LANE_COL = ['#d9a441', '#9fd6c8', '#d46a5a', '#a99bd6'];
    const lanesEl = q('t11-lanes');
    for (let i = 0; i < 4; i++) {
      const b = el('button', { class: 'dfbtn t11-lane', type: 'button', 'data-lane': String(i), 'aria-label': T.lanes[i] }, ['◀', '▼', '▲', '▶'][i]);
      b.style.borderBottomColor = LANE_COL[i];
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); lane(i); });
      lanesEl.appendChild(b);
    }
    function lane(i) { if (!s.running) return; const r = s.press(i); const b = lanesEl.children[i]; if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90); } return r; }
    s.lane = lane;
    const shape = (k, x, y, r, col, line) => {
      c.beginPath();
      if (k === 0) c.arc(x, y, r, 0, 7); else if (k === 1) c.rect(x - r, y - r, r * 2, r * 2);
      else if (k === 2) { c.moveTo(x, y - r - 1); c.lineTo(x + r + 2, y + r); c.lineTo(x - r - 2, y + r); c.closePath(); } else { c.moveTo(x, y - r - 2); c.lineTo(x + r + 2, y); c.lineTo(x, y + r + 2); c.lineTo(x - r - 2, y); c.closePath(); }
      c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = line || '#0e0a07'; c.stroke();
    };
    const PXPS = 120;                                   // pixels a note falls per second
    const draw = () => {
      if (!cv.isConnected) return;
      const Wd = cv.width, H = cv.height, lineY = H - 44, lw = (Wd - 20) / 4;
      c.save();
      if (s.shake > 0 && !reduced()) c.translate((Math.sin(s.t * 90)) * 3 * (s.shake / 0.18), 0);
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#171109'); bg.addColorStop(1, '#0e0a07'); c.fillStyle = bg; c.fillRect(-4, 0, Wd + 8, H);
      for (let i = 0; i < 4; i++) {
        const x0 = 10 + i * lw;
        c.fillStyle = i % 2 ? 'rgba(232,217,181,.05)' : 'rgba(232,217,181,.09)'; c.fillRect(x0, 0, lw, H);
        c.strokeStyle = 'rgba(232,217,181,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 0.5, 0); c.lineTo(x0 + 0.5, H); c.stroke();
      }
      // the line the notes fall to (wide windows draw a band)
      const bandPx = s.win.good * PXPS;
      c.fillStyle = 'rgba(217,164,65,.14)'; c.fillRect(10, lineY - bandPx, Wd - 20, bandPx * 2);
      c.strokeStyle = 'rgba(232,217,181,.75)'; c.lineWidth = 2; c.beginPath(); c.moveTo(10, lineY); c.lineTo(Wd - 10, lineY); c.stroke();
      for (let i = 0; i < 4; i++) {            // lane marks under the line: the same shape the note has
        const x = 10 + i * lw + lw / 2, glow = Math.max(0, 1 - (s.t - s.last[i]) / 0.15);
        shape(i, x, lineY + 24, 9, glow > 0 ? '#fff1c8' : LANE_COL[i], glow > 0 ? '#fff1c8' : '#0e0a07');
      }
      for (const n of s.notes) {
        if (n.grade === 'perfect' || n.grade === 'good') continue;
        const y = lineY - (n.t - s.t) * PXPS; if (y < -20 || y > H + 20) continue;
        shape(n.lane, 10 + n.lane * lw + lw / 2, y, 10, n.grade === 'miss' ? 'rgba(120,110,95,.6)' : LANE_COL[n.lane]);
      }
      // hit bursts (still under noFlash; they are shapes, not flashes of the screen)
      for (const f of s.flash) {
        const age = s.t - f.t; if (age > 0.3) continue;
        const x = 10 + f.lane * lw + lw / 2, rr = 12 + age * (reduced() ? 20 : 70);
        c.strokeStyle = f.grade === 'perfect' ? 'rgba(255,241,200,' + (1 - age / 0.3) + ')' : 'rgba(159,214,200,' + (1 - age / 0.3) + ')'; c.lineWidth = noFlash() ? 1 : 3;
        c.beginPath(); c.arc(x, lineY, rr, 0, 7); c.stroke();
      }
      c.fillStyle = 'rgba(232,217,181,.18)'; c.fillRect(10, 4, Wd - 20, 3); c.fillStyle = '#d9a441'; c.fillRect(10, 4, (Wd - 20) * Math.max(0, Math.min(1, s.t / s.end)), 3);
      c.font = '15px "Alegreya SC", Georgia, serif'; c.fillStyle = '#e8d9b5'; c.textAlign = 'right';
      c.fillText(fmt(T.score, s.perfect, s.good, s.notes.filter((n) => n.grade === 'miss').length), Wd - 14, 24);
      c.textAlign = 'left'; c.restore();
    };
    s.draw = draw;
    const cleanup = () => {
      window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true);
      cancelAnimationFrame(s.raf);
      if (G.panelToken === token && G.openPanel === 'p11t_perf') closeModal();
      if (G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {};
    };
    const showResult = (res) => {
      const say = q('t11-say'); if (!say) return;
      const tier = res.gold === 0 && res.accuracy < 0.15 ? T.none : res.accuracy < 0.4 ? T.low : res.accuracy < 0.75 ? T.mid : T.high;
      say.textContent = tier + ' ' + (res.gold ? fmt(T.pay, res.gold) : T.nopay) + (res.rep ? ' ' + T.rep : '') + ' ' + fmt(T.result, Math.round(res.accuracy * 100)) + '.';
      q('t11-go').hidden = true; q('t11-stop').textContent = T.close; lanesEl.hidden = true;
    };
    s.promise.then((res) => {
      if (res.aborted) { cleanup(); sayMsg(T.abort, '', 2800); return; }
      draw(); showResult(res);
      s.over = true;
    });
    const stopOrClose = () => { if (s.over) { cleanup(); } else if (!s.done) { s.finish(true); } else cleanup(); };
    s.close = stopOrClose;
    q('t11-stop').onclick = stopOrClose;
    q('t11-go').onclick = () => { if (s.running || s.done) return; s.running = true; q('t11-go').hidden = true; q('t11-say').textContent = ''; };
    const keyLane = { a: 0, arrowleft: 0, s: 1, arrowdown: 1, w: 2, arrowup: 2, d: 3, arrowright: 3 };
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      if (!(k in keyLane) && k !== 'escape' && k !== 'enter' && k !== ' ') return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      if (ev.repeat) return;
      if (k === 'escape') { stopOrClose(); return; }
      if (k === 'enter' || k === ' ') { if (!s.running && !s.done) q('t11-go').click(); else if (s.over) cleanup(); return; }
      if (!s.keysDown[k]) { s.keysDown[k] = true; lane(keyLane[k]); }
    }
    function onKeyUp(ev) { const k = String(ev.key || '').toLowerCase(); if (k in s.keysDown) s.keysDown[k] = false; if (k in keyLane) ev.stopImmediatePropagation(); }
    window.addEventListener('keydown', onKey, true); window.addEventListener('keyup', onKeyUp, true);
    // pointer on the canvas picks the lane under the finger
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); const r = cv.getBoundingClientRect(); const x = (ev.clientX - r.left) / Math.max(1, r.width); lane(Math.max(0, Math.min(3, Math.floor((x * cv.width - 10) / ((cv.width - 20) / 4))))); });
    const pad = () => {
      const g = padNow(); if (!g) return;
      const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed); const was = s.padPrev[i]; s.padPrev[i] = now; return now && !was; };
      const map = [[2, 0], [14, 0], [0, 1], [13, 1], [3, 2], [12, 2], [1, 3], [15, 3]];
      for (const [b, l] of map) if (edge(b)) { if (!s.running && !s.done && b === 0) q('t11-go').click(); else lane(l); }
      if (edge(9) || edge(8)) stopOrClose();
    };
    if (!s.manual) {
      s.last0 = performance.now();
      const loop = (now) => {
        if (G.panelToken !== token || G.openPanel !== 'p11t_perf') { if (!s.done) s.finish(true); else cleanup(); return; }
        const dt = Math.min(0.05, Math.max(0, (now - s.last0) / 1000)); s.last0 = now;
        try { pad(); } catch (e) { /* no pad */ }
        if (s.running) s.step(dt);
        draw(); s.raf = requestAnimationFrame(loop);
      };
      s.raf = requestAnimationFrame(loop);
    } else draw();
    return s;
  }

  // ================================================================ 3. THE CAT
  const FOOD_RE = /\b(fish|eel|trout|bream|perch|pike|carp|salmon|herring|sprat|minnow|kipper|mutton|meat|jerky|sausage|cheese|bread|biscuit|ration|stew|pie|egg)s?\b/i;
  function foodIds() {
    const out = [];
    if (!hasG() || !G.player || !Array.isArray(G.player.inv) || typeof ITEMS === 'undefined') return out;
    for (const s of G.player.inv) {
      if (!s || typeof s.id !== 'string' || out.includes(s.id)) continue;
      const it = ITEMS[s.id]; if (!it || num(s.n, 0, 999, 1) < 1) continue;
      if (it.use === 'food' || FOOD_RE.test(it.name || '')) out.push(s.id);
    }
    return out;
  }
  const adopted = () => flag('p11t_adopt', 0, 1) === 1;
  const fedToday = () => flag('p11t_fday', 0, 100000) === today() + 1;
  function originalCat() {
    const m = hasG() && G.maps && G.maps.whispergrove; if (!m || !Array.isArray(m.entities)) return null;
    return m.entities.find((e) => e && e.kind === 'npc' && e.id === 'cat' && !e._p11t) || null;
  }
  const FOLLOW_OK = () => !!(G.map && G.map.outdoor);
  function myCat() {
    if (!hasG() || !G.ents) return null;
    if (G.mapId === 'whispergrove') { const o = originalCat(); return o && G.ents.includes(o) ? o : null; }
    return G.ents.find((e) => e && e._p11t === 'cat') || null;
  }
  function clearClones(list) { if (!Array.isArray(list)) return; for (let i = list.length - 1; i >= 0; i--) if (list[i] && list[i]._p11t === 'cat') list.splice(i, 1); }
  function behind(dist, side) {
    const c = Engine.cam, cs = Math.cos(c.dir), sn = Math.sin(c.dir);
    return { x: c.x - cs * dist - sn * side, y: c.y - sn * dist + cs * side };
  }
  let catMsgMap = null, hissAt = -1e9, trackedName = null;
  const state = { followed: 0, hisses: 0, lastHiss: null };

  function tickCat(dt) {
    if (!catOn() || !adopted() || !hasG() || !G.ents || !G.map) return;
    // her name on the crosshair hint
    if (typeof NPCS !== 'undefined' && NPCS.cat && NPCS.cat.name !== catName()) NPCS.cat.name = catName();
    const stay = flag('p11t_stay', 0, 1) === 1;
    if (G.state !== 'play') return;
    let e = myCat();
    if (G.mapId === 'whispergrove') { clearClones(G.ents); }
    else if (!FOLLOW_OK() || stay) {
      if (e) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
      if (!FOLLOW_OK() && !stay && catMsgMap !== G.mapId) { catMsgMap = G.mapId; sayMsg(fmt(TX.cat.waits, catName()), '', 4200); }
      return;
    } else if (!e) {
      const p = behind(1.3, 0.4);
      e = { kind: 'npc', id: 'cat', x: solidAt(p.x, p.y) ? Engine.cam.x : p.x, y: solidAt(p.x, p.y) ? Engine.cam.y : p.y, sprite: 'cat', scale: 0.38, solid: false, radius: 0.2, transient: true, _decor: true, _p11t: 'cat' };
      settle11(e);
      G.ents.push(e);
    }
    if (!e || e.dead) return;
    catMsgMap = null;
    if (stay) return;
    // the cat is not an ordinary wanderer any more, and nothing frightens her off
    e.wander = false; e.moving = false; e._slCalm = 4; e._slFlee = 0;
    const c = Engine.cam, tgt = behind(1.5, 0.55), dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy), dPlayer = Math.hypot(c.x - e.x, c.y - e.y);
    if (dPlayer > 9) {          // left behind: she turns up at your heels, out of view if there is a way
      const spots = [behind(1.4, 0.5), behind(1.4, -0.5), behind(2.2, 0)];
      const s = spots.find((p) => !solidAt(p.x, p.y)); if (s) { e.x = s.x; e.y = s.y; }
      return;
    }
    if (d > 0.6) {
      const sp = Math.min(6, 1.6 + (d - 0.6) * 1.5), step = Math.min(sp * dt, d);
      const moved = moveWithSlide(e, dx / d * step, dy / d * step, e);
      e.facing = Math.atan2(dy, dx); e.stuckT = moved ? 0 : (e.stuckT || 0) + dt;
      if (e.stuckT > 1.2 && dPlayer > 3) { const s = [behind(1.2, 0.5), behind(1.2, -0.5)].find((p) => !solidAt(p.x, p.y)); if (s) { e.x = s.x; e.y = s.y; } e.stuckT = 0; }
      state.followed += step;
    }
  }

  // Enemies she could hiss at: hostile (not passive, not dead, not hidden), in this map, within range of the
  // player, and not in view (outside the field of view, or behind something). Pure of side effects.
  function hissTargets(range) {
    range = range || 10;
    const out = [];
    if (!hasG() || !G.ents || typeof Engine === 'undefined') return out;
    const c = Engine.cam;
    for (const e of G.ents) {
      if (!e || e.kind !== 'enemy' || e.dead || e.hidden || e.passive || e.state === 'passive') continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.hypot(dx, dy);
      if (!(d <= range)) continue;
      let rel = Math.atan2(dy, dx) - c.dir; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const inView = Math.abs(rel) < 0.95 && typeof los === 'function' && los(c.x, c.y, e.x, e.y);
      if (inView) continue;
      out.push({ e, d, rel });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  function dirPhrase(rel) {
    const D = TX.cat.dirs, a = Math.abs(rel);
    return a < Math.PI / 4 ? D[0] : a > Math.PI * 3 / 4 ? D[2] : rel > 0 ? D[1] : D[3];     // positive = on the right
  }
  function tickHiss() {
    if (!catOn() || !adopted() || flag('p11t_stay', 0, 1) === 1 || G.state !== 'play' || !myCat()) return;
    if (G.time - hissAt < 18) return;
    const list = hissTargets(10); if (!list.length) return;
    const t = list.find((x) => !(G.time - (x.e._p11tHiss || -1e9) < 60)); if (!t) return;
    t.e._p11tHiss = G.time; hissAt = G.time; state.hisses++;
    state.lastHiss = { d: t.d, rel: t.rel, type: t.e.type };
    const lateral = Math.sin(t.rel);
    hissSound(lateral * 0.75);
    sayMsg(fmt(TX.cat.hiss, catName(), dirPhrase(t.rel)), 'warn', 4500);
  }

  // ---- talking to her
  function fedNote(n) { return n === 1 ? TX.cat.fed1 : n === 2 ? TX.cat.fed2 : TX.cat.fed3; }
  function feedWith(id) {
    if (!G.has(id) || fedToday() || adopted()) return false;
    G.take(id);
    const n = Math.min(3, flag('p11t_fed', 0, 3) + 1);
    setFlag('p11t_fed', n, 0, 3); setFlag('p11t_fday', today() + 1, 0, 100000);
    try { Audio_.sfx.pickup(); } catch (e) { /* no audio yet */ }
    sayMsg(fedNote(n), n === 3 ? 'good' : '', 7000);
    if (n >= 3) {
      setFlag('p11t_adopt', 1, 0, 1);
      try { journal('side', TX.cat.journalAdopt); } catch (e) { /* no journal yet */ }
      setTimeout(() => { try { if (hasG() && G.state === 'play') openNaming(); } catch (e) { /* ignore */ } }, 700);
    }
    return true;
  }
  function openNaming() {
    if (G.state === 'play') G.state = 'panel';
    openModal(`<h2></h2><div class="btns t11-names" id="t11-names"></div><p class="muted" id="t11-nkeys"></p>`, 'p11t_name');
    document.querySelector('#modal-panel h2').textContent = TX.cat.namePrompt;
    const box = document.getElementById('t11-names'), token = G.panelToken;
    const done = (i) => {
      setFlag('p11t_name', i, 0, CAT_NAMES.length - 1);
      window.removeEventListener('keydown', onKey, true);
      if (G.panelToken === token) closeModal();
      G.state = 'play'; G.keys = {};
      if (typeof NPCS !== 'undefined' && NPCS.cat) NPCS.cat.name = catName();
      sayMsg(fmt(TX.cat.named, catName()), 'good', 4500);
    };
    CAT_NAMES.forEach((n, i) => { const b = el('button', { class: 'dfbtn small', type: 'button', 'data-name': String(i) }, (i + 1) + '. ' + n); b.onclick = () => done(i); box.appendChild(b); });
    document.getElementById('t11-nkeys').textContent = TX.cat.nameKeys;
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      if (k >= '1' && k <= '8') { ev.stopImmediatePropagation(); ev.preventDefault(); done(+k - 1); }
      else if (k === 'escape' || k === 'enter') { ev.stopImmediatePropagation(); ev.preventDefault(); done(flag('p11t_name', 0, CAT_NAMES.length - 1)); }
    }
    window.addEventListener('keydown', onKey, true);
    box.firstChild && box.firstChild.focus({ preventScroll: true });
  }
  function talkToCat(_orig, e) {
    const T = TX.cat;
    if (!adopted()) {
      const foods = foodIds();
      if (foods.length && !fedToday() && typeof showEvent === 'function') {
        const ch = foods.slice(0, 4).map((id) => ({ t: fmt(T.offerBtn, ITEMS[id].name), f: () => feedWith(id) }));
        ch.push({ t: T.scratch, f: () => _orig.call(null, e) }); ch.push({ t: T.leave, f: null });
        showEvent(T.title, T.offer, ch);
        return;
      }
      if (foods.length && fedToday()) { try { _orig.call(null, e); } catch (err) { /* original line */ } sayMsg(T.notHungry, '', 4500); return; }
      return _orig.call(null, e);
    }
    const stay = flag('p11t_stay', 0, 1) === 1, nm = catName();
    const ch = [
      { t: T.scratch, f: () => { sayMsg(fmt(T.pet, nm), 'good', 3500); } },
      { t: stay ? T.followBtn : T.stayBtn, f: () => { setFlag('p11t_stay', stay ? 0 : 1, 0, 1); sayMsg(fmt(stay ? T.followMsg : T.stayMsg, nm), '', 3500); } },
      { t: T.nameBtn, f: () => openNaming() },
      { t: T.leave, f: null },
    ];
    showEvent(nm, fmt(T.idle, nm), ch);
  }

  // ================================================================ placement of Garrow, Hetty's button, the Greening
  // game.js hydrate() draws two numbers from Math.random for an NPC; we must not move the game's rolls, so set the same fields by hand
  function settle11(e) { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 0; e.dir = 0; }
  const GARROW = { x: 5.4, y: 10.5, facing: Math.PI };   // the cellar, east of the crates, clear of the cellar door's cell
  function registerNpc() {
    if (typeof NPCS === 'undefined' || NPCS.p11_dicer) return;
    NPCS.p11_dicer = {
      name: TX.garrow.name, sprite: 'townsman', portrait: 'townsman', tier: 'low',
      greet: { polite: TX.garrow.greetPolite, normal: TX.garrow.greetNormal, blunt: TX.garrow.greetBlunt },
      topics: {}, quest: () => null,
    };
  }
  function active() { return gamesOn() && !worldGone(); }
  function ensureGarrow(m) {
    if (!m || m.id !== 'tavern' || !Array.isArray(m.entities)) return;
    const have = m.entities.find((e) => e && e._p11t === 'garrow');
    if (!active()) { if (have) m.entities.splice(m.entities.indexOf(have), 1); return; }
    if (have) return;
    const e = { kind: 'npc', id: 'p11_dicer', x: GARROW.x, y: GARROW.y, sprite: 'townsman', scale: 1, solid: true, radius: 0.35, facing: GARROW.facing, transient: true, _decor: true, _p11t: 'garrow' };
    settle11(e);
    m.entities.push(e);
  }
  function checkClosure() {
    if (!hasG() || !worldGone() || flag('p11t_closed', 0, 1)) return;
    if (flag('p11t_games', 0, 9999) > 0 || flag('p11t_perf', 0, 99) > 0) { setFlag('p11t_closed', 1, 0, 1); try { journal('side', TX.garrow.closedJournal); } catch (e) { /* no journal */ } }
  }
  function addDialogueButtons() {
    if (!hasG() || typeof DLG === 'undefined' || !DLG.npc || typeof NPCS === 'undefined') return;
    const btns = document.querySelector('#modal-panel .dlg .btns'); if (!btns) return;
    const bye = btns.querySelector('#d-bye');
    const add = (id, label, fn, disabled) => {
      if (btns.querySelector('#' + id)) return;
      const b = el('button', { class: 'dfbtn small', id, type: 'button' }, label);
      if (disabled) b.disabled = true; else b.onclick = () => { try { fn(); } catch (e) { console.warn('tavern11: dialogue button failed', e); } };
      btns.insertBefore(b, bye || null);
    };
    if (DLG.npc === NPCS.p11_dicer && active()) {
      add('d-p11-bones', TX.garrow.button, () => { closeModal(); G.state = 'play'; openBones(); });
    }
    if (DLG.npc === NPCS.hetty) {
      const st = perfStatus();
      if (st === 'ready') add('d-p11-play', TX.perf.button, () => { closeModal(); G.state = 'play'; sayMsg(TX.perf.intro, '', 5200); openPerformance(); });
      else if (st === 'early') add('d-p11-play', TX.perf.early, null, true);
      else if (st === 'done') add('d-p11-play', TX.perf.done, null, true);
    }
  }

  // ================================================================ Options rows and wiring
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('t11-opt-games')) return;
    const label = (t, hint) => { const s = el('span', { class: 'gfx-label' }, t + ' '); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const toggle = (id, get, setter) => {
      const b = el('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': get() ? 'true' : 'false' }, get() ? TX.opts.on : TX.opts.off);
      b.classList.toggle('sel', get());
      b.onclick = () => { setter(!get()); saveSet(); b.textContent = get() ? TX.opts.on : TX.opts.off; b.setAttribute('aria-pressed', get() ? 'true' : 'false'); b.classList.toggle('sel', get()); sync(); };
      return b;
    };
    const O = TX.opts;
    grid.appendChild(label(O.games, O.gamesHint));
    grid.appendChild(toggle('t11-opt-games', gamesOn, (v) => { set.games = v; }));
    grid.appendChild(label(O.cat, O.catHint));
    grid.appendChild(toggle('t11-opt-cat', catOn, (v) => { set.cat = v; }));
    grid.appendChild(label(O.timing, O.timingHint));
    const t = el('button', { class: 'dfbtn small', id: 't11-opt-timing', type: 'button' }, TIMING_NAME[set.timing]);
    t.onclick = () => { set.timing = TIMINGS[(TIMINGS.indexOf(set.timing) + 1) % TIMINGS.length]; saveSet(); t.textContent = TIMING_NAME[set.timing]; };
    grid.appendChild(t);
  }
  // put everything right for the current switches: Garrow in or out, her name, her wanderlust
  function sync() {
    try {
      if (!hasG()) return;
      registerNpc();
      if (G.maps && G.maps.tavern) ensureGarrow(G.maps.tavern);
      if (typeof NPCS !== 'undefined' && NPCS.cat) {
        if (!NPCS.cat._p11Name0) NPCS.cat._p11Name0 = NPCS.cat.name;
        NPCS.cat.name = catOn() && adopted() ? catName() : NPCS.cat._p11Name0;
      }
      const o = originalCat();
      if (o && !(catOn() && adopted()) && o.wander === false) o.wander = true;            // off, or never adopted: the original wanderer
      if (!(catOn() && adopted()) && G.ents) clearClones(G.ents);
      checkClosure();
    } catch (e) { console.warn('tavern11: sync failed', e); }
  }

  function install() {
    loadSet();
    registerNpc();
    const css = document.createElement('style'); css.id = 'tavern11-style';
    css.textContent = `#modal-panel:has(.t11) { width: 84cqw; max-height: 96cqh; }
.t11 canvas { display: block; width: min(100%, 118cqh); height: auto; margin: 0 auto; background: #0e0a07; border: 2px solid #0b0806; image-rendering: pixelated; }
.t11-say { min-height: 4.6cqh; margin: .5cqh 0; color: var(--gold); font-family: var(--font-sc); font-size: 2cqw; }
.t11-purse, .t11-rules, .t11-keys { font-size: 1.55cqw; margin: .2cqh 0; }
.t11-btns { display: flex; flex-wrap: wrap; gap: .8cqw; align-items: center; justify-content: center; margin-top: .4cqh; }
.t11-stake { font-family: var(--font-sc); color: var(--gold); min-width: 9cqw; text-align: center; font-size: 2.2cqw; }
.t11-lanes { display: flex; gap: 1cqw; justify-content: center; margin-top: .4cqh; }
.t11-lane { min-width: 9cqw; border-bottom-width: .8cqh; }
.t11-lane.hit { color: #fff1c8; background: #4a3719; }
.t11-names { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1cqw; }`;
    document.head.appendChild(css);

    if (typeof loadMap === 'function') {
      const _load = loadMap;
      loadMap = function (id) {
        try { sync(); if (G.maps && G.maps[id]) ensureGarrow(G.maps[id]); } catch (e) { console.warn('tavern11: placement failed', e); }
        const r = _load.apply(this, arguments);
        // anim.js sweeps transients when a map is re-entered: put them back
        try { ensureGarrow(G.map); catMsgMap = null; } catch (e) { /* never break a map change */ }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _restore = restoreGame;
      restoreGame = function () {
        if (bonesUi) bonesUi.close(true);
        if (perfUi && perfUi.panel) perfUi.finish(true);
        const r = _restore.apply(this, arguments);
        try { sync(); if (G.map) ensureGarrow(G.map); } catch (e) { /* ignore */ }
        return r;
      };
    }
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function () {
        const r = _rd.apply(this, arguments);
        try { addDialogueButtons(); } catch (e) { console.warn('tavern11: dialogue buttons failed', e); }
        return r;
      };
    }
    if (typeof talkCat === 'function') {
      const _tc = talkCat;
      talkCat = function (e) {
        if (!catOn() || !hasG() || !G.flags.part3 && G.mapId !== 'whispergrove') return _tc.apply(this, arguments);
        try { return talkToCat(_tc, e); } catch (err) { console.warn('tavern11: cat talk failed', err); return _tc.apply(this, arguments); }
      };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('tavern11: options rows failed', e); }
        return r;
      };
    }
    if (typeof update === 'function') {
      const _up = update;
      let acc = 0;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try {
          if (G.state === 'play') {
            tickCat(Math.min(0.1, dt));
            acc += dt; if (acc >= 0.3) { acc = 0; tickHiss(); }
          }
        } catch (err) { /* never break a frame */ }
        return r;
      };
    }
    if (hasG()) { try { sync(); if (G.map) ensureGarrow(G.map); } catch (e) { /* nothing built yet */ } }
  }
  try { install(); } catch (e) { console.warn('tavern11: install failed', e); }

  return {
    TX, B, CAT_NAMES, REEL, LANE_HZ, WINDOWS, TIMINGS, set, FOOD_RE,
    newRound, take, stand, settle, playAuto, describe, maxStake, lostToday, seedFor, mulberry32,
    openBones, get bonesUi() { return bonesUi; },
    chart, reward, startPerformance, openPerformance, perfStatus, hasInstrument, instrumentIds, isEvening, playedTonight, get perfUi() { return perfUi; },
    foodIds, feedWith, talkToCat, openNaming, catName, adopted, myCat, originalCat, tickCat, hissTargets, tickHiss, dirPhrase, state,
    ensureGarrow, sync, checkClosure, flag, worldGone, saveSet, loadSet, active, perfActive: () => gamesOn() && !worldGone(),
  };
})();
