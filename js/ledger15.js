// ============================================================
//  ledger15 — Phase 15 (the province moves), team LEDGER: Daggerfall's small systems.
//  Four things, each with its own Options switch (all default On; Off = the game as before):
//   1. PAID TRAINING. Some people teach one skill for sovereigns. A session costs more the better you already are, passes
//      two hours, raises the skill by a few points up to what that teacher knows, and only so many sessions are allowed
//      at each character level (see B.SESSIONS). Law-Song is taught only by a Cantor and only once the Rite is behind you,
//      so it can never carry the player through Hearthday. Entry is the existing talk screen: a "Train..." button.
//   2. LETTERS OF CREDIT. The Consortium's clerk in the Greenhall draws letters for gold at par; any agent cashes them for
//      a fee (5% from the clerk; the Oakhaven counting-house goes under the oaks with the Greening, so after it the Veil's
//      ledger-keeper in Whisper-Grove pays at 15% and the Kestrel's first mate in the Deep Woods at 25%). A letter is a
//      plain inventory item (three faces: p15_letter_25 / _100 / _500): it weighs nothing, it is held in evidence and
//      handed back with the rest of a prisoner's gear, and one lies on the clerk's desk for anyone who will take it
//      (owned stock: the ordinary theft path). Letters are never lost to the Greening, only to the road.
//   3. TEST CONSOLE. Shift+Backtick (~) or Options. Typed codes: opensesame, richman, ghostmode, octave, showme (and help).
//      The first code asks first: cheating marks the save (p15l_cheat), shown in the save slot, the Statistics page and the
//      Achievements tab. Shut in hardcore runs. No code touches the game's RNG, a story flag, or a story seal.
//   4. "WHERE IS..." MARKS. The existing directions answers also drop a mark for that place on the automap (with its name)
//      and list it in the logbook. It comes off when you get there, or with the Clear button.
//
//  Saved state: G.flags p15l_ only, small validated integers (FLAGS). Anything else under that prefix is dropped on load.
//  Letters are inventory slots; their counts are clamped on load (a hostile save cannot mint gold). Entities this module
//  adds (the clerk, the keeper, the desk and its letter) are transient and rebuilt from the flags.
//  Wrapped (never edited): renderDialogue, askPlace, loadMap, update, restoreGame, startGame, playerMove, drawHUD,
//  slotSummary, openModal (Statistics only), renderCodexModal (Achievements only), renderMap, renderLog, renderAccessibilityMenu.
//  Every invented fact is marked [PROPOSED]; all player-visible text is in TX (registered through S()).
// ============================================================
'use strict';

const LEDGER15 = (function () {
  const KEY = 'octave.ledger15.v1';
  const cfg = { train: true, bank: true, marks: true, console: true };
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of Object.keys(cfg)) if (typeof o[k] === 'boolean') cfg[k] = o[k];
    } catch (e) { /* storage blocked: the defaults stand */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- balance, one table
  const B = {
    // training
    HOURS: 2,                                    // a session passes two hours (passHours)
    SESSIONS: [[1, 1], [3, 2], [5, 3], [8, 4]],  // [from character level, sessions allowed at each level]
    COST_BASE: 8, COST_DIV: 40,                  // sovereigns = round((COST_BASE + floor(skill^2 / COST_DIV)) * trainer rate)
    GAIN: [[0, 3], [40, 2], [60, 1]],            // [from skill, points a session adds], never past the trainer's cap or 100
    // letters
    FACES: [25, 100, 500],                       // [PROPOSED] the three faces a letter is drawn in
    FEE: { clerk: 5, veil: 15, mags: 25 },       // [PROPOSED] percent the house keeps on cashing (whole sovereigns, rounded down for the holder)
    HELD_MAX: 99,                                // most letters of one face a save may hold; more are clamped away on load
    GOLD_MAX: 9999999,                           // no purse, however it got there, passes this
    // console
    RICH: 500,                                   // richman
    DOOR_REACH: 3.0,                             // opensesame: cells around the player
    // marks
    CLEAR_DIST: 2.2,                             // cells: you have "got there"
    LABEL_MAX: 22,                               // characters of a place's name written on the automap
  };

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      head: S('Trainers, letters and the test console'),
      train: { label: S('Paid training'), hint: S('a few people teach a skill for sovereigns; a session takes two hours, and only so many are allowed at each level') },
      bank: { label: S('Letters of credit'), hint: S('the Consortium clerk draws letters for gold and agents cash them for a fee; they weigh nothing') },
      marks: { label: S('Where-is marks'), hint: S('asking the way marks the place on your automap until you get there') },
      con: { label: S('Test console'), hint: S('typed codes for testing and fun; they mark your save and are shut in hardcore runs'), open: S('Open') },
    },
    train: {
      btn: S('Train…'),
      purse: S('You have {0} sovereigns · sessions used at level {3}: {1} of {2}'),
      rowDesc: S('Now {0} · taught up to {1} · two hours'),
      you: S('Teach me.'),
      gated: S('Not until Hearthday is behind you.'),
      capped: S('Nothing more to learn here.'),
      limit: S('No more sessions at this level.'),
      broke: S('That is more than your purse holds.'),
      limitLine: S('Not again yet. Go and live with it a while, and come back when you have grown.'),     // [PROPOSED]
      hours: S('Two hours pass over the lesson.'),
    },
    tr: {
      harrow: { offer: S('Quiet feet? I have kept this gate eleven years on quiet feet. Heel first. Breathe with the Hedge, not against it. I will show you for coin, and I will not say what I do with the coin.'),
        done: S('Again. Slower. Better. There. The Hedge did not notice you, which is the whole of it.'),
        cap: S('That is all I have. The rest you learn by being afraid at the right moment.') },
      vane: { offer: S('Blade-work? I can show you. Rust Coast style: short, mean, nothing a Synod fencing-master would sign. It costs. Everything I know cost me something.'),
        done: S('Wrist, not arm. Better. Nobody ever won a fight by thinking about it. I speak as a man who has thought about a great many.'),
        cap: S('You have the lot of what I can give. After this it is not skill, it is who you are willing to be.') },
      bettany: { offer: S('Willow-bark, reed-pith, moon-moss: which steeps and which scalds. I can teach you to tell, and to know what a body will take. Bring coin, love, and patience.'),
        done: S('There. Smell it before you trust it. The nose knows before the book does.'),
        cap: S('Past that is Rooke\'s trade, and I would not wish his trade on a dog.') },
      hob: { offer: S('Every coin has a face and a back, and selling is showing them whichever they want to see. I can teach that. Coin first. Always coin first.'),
        done: S('See? You let them name the price. Then you look sorry. Practise looking sorry.'),
        cap: S('Past that you are a Consortium factor, and I will not teach you to be one.') },
      lyraGate: S('Not now. My voice is not mine to spend before Hearthday is past. Ask me afterwards, if there is an afterwards.'),
      lyra: { offer: S('She writes on her slate: I HAVE NO VOICE. I STILL HAVE THE SHAPES. SIT.'),
        done: S('She draws the interval in chalk, has you hold it in your head, and rubs half of it out. She writes: AGAIN.'),
        cap: S('She writes: THAT IS EVERYTHING I CAN DRAW. THE REST IS BREATH. She does not write anything under it.') },
      kaelen: { offer: S('Glass keeps what it is given. I can show you how to give it less. It is not a gift. It costs, and so will I.'),
        done: S('Lighter. Lighter than that. It is listening to your hands. Everything is.'),
        cap: S('Past that it stops being work and starts being a diagnosis. Stop there.') },
      sable: { offer: S('I can teach reading. Not the letters: the gaps between them. What a ledger leaves out is the ledger. Sit. Do not speak while I count.'),
        done: S('There. You saw the gap before you saw the name. Keep it.'),
        cap: S('The rest is in the Bound Ledger, and the Bound Ledger is not for lending.') },
      mags: { offer: S('Rigging. You climb a line by thinking of the next hand, never the drop. I will show you, if you watch my mouth. Pay first.'),
        done: S('Better. Slower. Slower is faster up a line.'),
        cap: S('You climb like a Kestrel hand now. I cannot give you more height than that.') },
    },
    bank: {
      btn: S('Letters…'),
      purse: S('You have {0} sovereigns · letters held: {1} · the house keeps {2}% on cashing'),
      drawB: S('Draw a letter of {0}'),
      drawS: S('Costs {0} sovereigns · weighs nothing'),
      cashB: S('Cash a letter of {0}'),
      cashS: S('You hold {0} · you receive {1} after the fee'),
      allB: S('Cash every letter'),
      allS: S('You hold {0} · the house keeps {1}'),
      noDraw: S('This counter cashes letters. It does not draw them.'),
      youDraw: S('A letter of {0}, please.'),
      youCash: S('Cash this letter of {0}.'),
      youAll: S('Cash all of them.'),
      drawn: [S('Sealed and stamped. Do not fold it twice.'), S('Gold in, paper out. Keep it dry, and keep it to yourself.')],
      cashed: S('Counted out: {0} sovereigns. The house keeps {1}.'),
      short: S('You do not have that much in your purse.'),
      full: S('That is a great deal of paper. Cash some before I draw more.'),
      none: S('You hold no letter of that sum.'),
      clerkHello: S('Gold in, paper out; paper in, gold out, less five in the hundred. A letter is a promise and a seal. Lose it and the promise is the finder\'s.'),
      veilHello: S('Paper is paper. We keep all of it, whether or not anyone is left to be paid. I will honour a Consortium hand at fifteen in the hundred; the counting-house that made it is under the oaks.'),
      magsHello: S('A Consortium letter. Paper that was good once. I know a captain who takes it a quarter off, for the paper, not the promise.'),
      clerk: { name: S('Anselm Fenn, Consortium clerk'),
        polite: S('Good day. The Consortium draws letters of credit here, payable to the bearer. Five in the hundred on cashing. Quietly, please; the Factor is at the next desk.'),
        normal: S('Letters of credit. Gold in, paper out. Do not unfold one near the lamp.'),
        blunt: S('If you want to shout, shout at the Factor. If you want a letter, speak low.') },
      veil: { name: S('Oswin Marl, Veil ledger-keeper'),
        polite: S('You are welcome at the desk. It is not much of a desk. Everything on it is kept.'),
        normal: S('Ledger-keeper. If it is paper, I will read it. If it is owed, I will write it down.'),
        blunt: S('Raised voices are written down too. Shall I begin?') },
      deskLabel: S('A letter of credit, sealed, lying on the clerk\'s desk.'),
      deskName: S('The clerk\'s desk'),
    },
    items: {
      l25: { name: S('Letter of Credit, 25'), desc: S('A Consortium letter of credit for twenty-five sovereigns, payable to the bearer. It weighs nothing. Any agent will cash it for a fee, and so will whoever finds it.') },
      l100: { name: S('Letter of Credit, 100'), desc: S('A Consortium letter of credit for a hundred sovereigns, payable to the bearer. It weighs nothing. Any agent will cash it for a fee, and so will whoever finds it.') },
      l500: { name: S('Letter of Credit, 500'), desc: S('A Consortium letter of credit for five hundred sovereigns, payable to the bearer. It weighs nothing. Any agent will cash it for a fee, and so will whoever finds it.') },
    },
    con: {
      title: S('Test console'),
      intro: S('Type a code and press Enter. Cheats mark this save, and are shut in hardcore runs. Type help for the codes.'),
      inLabel: S('Code'),
      run: S('Run'), codes: S('Codes'), close: S('Close'),
      you: S('> {0}'),
      helpHead: S('Codes: opensesame, richman, ghostmode, octave, showme. The Codes button lists what each does.'),
      warn: S('Cheats mark this save. The mark shows in the save slot, in Statistics and under Achievements, and it stays. Run the code anyway?'),
      warnYes: S('Mark my save and run'), warnNo: S('Not now'),
      shut: S('The console is shut. A hardcore run keeps no cheats.'),
      unknown: S('Nothing answers to "{0}". Type help for the codes.'),
      desc: {
        opensesame: S('unlock the mechanical locks in reach (never story seals)'),
        richman: S('five hundred sovereigns'),
        ghostmode: S('walk through walls; again to stop'),
        octave: S('learn every Song'),
        showme: S('reveal this whole map'),
      },
      did: {
        opensesame: S('The locks in reach give way.'),
        opensesameNone: S('Nothing near you is shut with a latch. Story seals do not answer.'),
        richman: S('Five hundred sovereigns arrive from nowhere. Nobody signs for them.'),
        ghostOn: S('You are thin as a held breath. Walls do not notice you.'),
        ghostOff: S('You are solid again.'),
        ghostOffMoved: S('You are solid again, and the nearest open ground takes you in.'),
        octave: S('Every Song the Octave knows is in your book.'),
        octaveNone: S('You already know every Song.'),
        showme: S('The map remembers every cell, though you were never there.'),
      },
      ghostChip: S('GHOST'),
    },
    marks: {
      you: S('I\'ll mark it on my map.'),
      legend: S('Marked place'),
      clear: S('Clear marks'),
      logHead: S('Marked on your map'),
      line: S('Marked: {0}'),
      arrive: S('You reach {0}. The mark comes off your map.'),
    },
    stats: {
      head: S('Ledger and console'),
      cheats: S('Cheat codes run'), none: S('None'),
      sessions: S('Training sessions'), cashed: S('Letters cashed'), fees: S('Fees paid'), marked: S('Places marked'),
      slot: S('cheats used'),
      ach: S('This run has used the test console. Its achievements stand, marked.'),
    },
  };

  // ---------------------------------------------------------------- small helpers
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const flags = () => (hasG() && !Array.isArray(G.flags) ? G.flags : {});
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const warned = {};
  function warnOnce(k, e) { if (!warned[k]) { warned[k] = true; console.warn('ledger15: ' + k + ' failed', e); } }
  const hardcore = () => { try { return typeof hardcoreOn === 'function' && hardcoreOn(); } catch (e) { return false; } };

  // ---------------------------------------------------------------- flags: small validated integers
  const MASK_MAX = 0x3fffffff;
  const FLAGS = {
    p15l_cheat: [0, 1], p15l_chn: [0, 999],                         // the save is marked / how many codes were run
    p15l_tlv: [0, 99], p15l_tn: [0, 9], p15l_ts: [0, 9999],         // level the count is for / sessions used at it / sessions in all
    p15l_lc: [0, 9999], p15l_fee: [0, 99999], p15l_desk: [0, 1],    // letters cashed / sovereigns paid in fees / the desk letter is taken
    p15l_mkO: [0, MASK_MAX], p15l_mkW: [0, MASK_MAX], p15l_mkD: [0, MASK_MAX],   // marked places, one bit per entry of each place list
  };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : r[0];
  }
  function fset(k, v) { const r = FLAGS[k]; try { if (hasG()) G.flags[k] = clamp(Math.floor(Number.isFinite(v) ? v : 0), r[0], r[1]); } catch (e) { /* a save that cannot hold flags */ } }
  // a loaded save is untrusted: every known flag is clamped back to an integer in range, every other p15l_ key is dropped
  function sanitizeFlags() {
    if (!hasG()) return;
    const f = G.flags;
    for (const k of Object.keys(f)) {
      if (k.indexOf('p15l_') !== 0) continue;
      if (!own(FLAGS, k)) { delete f[k]; continue; }
      const r = FLAGS[k], v = f[k];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) { if (v === true && r[1] === 1) f[k] = 1; else delete f[k]; }
    }
  }

  // ================================================================ 1. PAID TRAINING
  // [PROPOSED] who teaches what. cap = the best skill that teacher can bring you to; rate = their price against the base table.
  // Law-Song is capped at 60 (the song-cost discount only reaches its 35% ceiling at 88) and gated behind the Rite.
  const rite = (f) => !!(f.greening || f.escaped || f.part3 || f.part4);
  const TRAINERS = {
    harrow: { skill: 'Stealth', cap: 45, rate: 0.8, txt: 'harrow' },
    vane: { skill: 'Blade', cap: 60, rate: 1.25, txt: 'vane' }, vane_wg: { skill: 'Blade', cap: 60, rate: 1.25, txt: 'vane' }, vane_dw: { skill: 'Blade', cap: 60, rate: 1.25, txt: 'vane' },
    bettany: { skill: 'Physician', cap: 55, rate: 1.0, txt: 'bettany' },
    hob: { skill: 'Mercantile', cap: 50, rate: 1.0, txt: 'hob' },
    lyra: { skill: 'Law-Song', cap: 60, rate: 1.0, txt: 'lyra', gate: rite }, lyra_wg: { skill: 'Law-Song', cap: 60, rate: 1.0, txt: 'lyra', gate: rite }, lyra_dw: { skill: 'Law-Song', cap: 60, rate: 1.0, txt: 'lyra', gate: rite },
    kaelen_wg: { skill: 'Glasswork', cap: 55, rate: 1.2, txt: 'kaelen' }, kaelen_dw: { skill: 'Glasswork', cap: 55, rate: 1.2, txt: 'kaelen' },
    sable_wg: { skill: 'Lore', cap: 60, rate: 1.0, txt: 'sable' }, sable_dw: { skill: 'Lore', cap: 60, rate: 1.0, txt: 'sable' },
    mags_dw: { skill: 'Climbing', cap: 60, rate: 1.0, txt: 'mags' },
  };
  function sessionsAllowed(level) {
    let n = B.SESSIONS[0][1];
    for (const [from, k] of B.SESSIONS) if (level >= from) n = k;
    return n;
  }
  function trainCost(skill, rate) { return Math.max(1, Math.round((B.COST_BASE + Math.floor(skill * skill / B.COST_DIV)) * rate)); }
  function trainGain(skill) { let g = B.GAIN[0][1]; for (const [from, k] of B.GAIN) if (skill >= from) g = k; return g; }
  function levelNow() { const p = hasG() ? G.player : null; return p ? clamp(Math.floor(Number(p.level)) || 1, 1, 99) : 1; }
  function usedAt(level) { return fint('p15l_tlv') === level ? fint('p15l_tn') : 0; }
  function skillNow(skill) {
    const p = G.player; const v = Math.floor(Number(p.skills && p.skills[skill]));
    return Number.isFinite(v) && v >= 1 ? clamp(v, 1, 100) : 15;
  }
  // everything the screen and the tests need to know about one teacher, in one place
  function trainInfo(id) {
    if (!own(TRAINERS, id) || !hasG() || !G.player) return null;
    const def = TRAINERS[id];
    try { ensurePlayerUpgrades(G.player); } catch (e) { /* skills are defaulted by skillNow */ }
    const level = levelNow(), cur = skillNow(def.skill), used = usedAt(level), allowed = sessionsAllowed(level);
    const gold = Number.isFinite(Number(G.player.gold)) ? Math.max(0, Math.floor(Number(G.player.gold))) : 0;
    const cost = trainCost(cur, def.rate);
    const gated = !!(def.gate && !def.gate(flags()));
    const capped = cur >= def.cap;
    const limited = used >= allowed;
    const reason = !cfg.train ? 'off' : gated ? 'gate' : capped ? 'cap' : limited ? 'limit' : gold < cost ? 'gold' : '';
    return { id, skill: def.skill, cap: def.cap, rate: def.rate, txt: def.txt, level, cur, used, allowed, cost, gain: Math.min(trainGain(cur), def.cap - cur), gold, gated, capped, limited, reason };
  }
  function train(id) {
    const info = trainInfo(id);
    if (!info) return { ok: false, reason: 'none' };
    if (info.reason) return { ok: false, reason: info.reason, info };
    const p = G.player, def = TRAINERS[id];
    p.gold = Math.max(0, Math.floor(Number(p.gold)) || 0) - info.cost;
    try { if (typeof passHours === 'function') passHours(B.HOURS); } catch (e) { warnOnce('hours', e); }
    const to = clamp(info.cur + info.gain, 1, Math.min(def.cap, 100));
    if (!p.skills || typeof p.skills !== 'object') p.skills = {};
    p.skills[def.skill] = to;
    if (fint('p15l_tlv') !== info.level) { fset('p15l_tlv', info.level); fset('p15l_tn', 0); }
    fset('p15l_tn', fint('p15l_tn') + 1); fset('p15l_ts', fint('p15l_ts') + 1);
    say('Your ' + def.skill + ' skill has increased to ' + to + '.', 'good', 2600);   // the game's own sentence (js/upgrades.js gainSkill)
    say(TX.train.hours, '', 2600);
    return { ok: true, cost: info.cost, from: info.cur, to, hours: B.HOURS, level: info.level, info };
  }

  // ================================================================ 2. LETTERS OF CREDIT
  const FACE_ID = (f) => 'p15_letter_' + f;
  const faceOf = (id) => { const m = /^p15_letter_(\d+)$/.exec(String(id)); return m && B.FACES.indexOf(+m[1]) >= 0 ? +m[1] : 0; };
  const AGENTS = {
    p15l_clerk: { fee: B.FEE.clerk, draw: true, hello: TX.bank.clerkHello },
    p15l_veil: { fee: B.FEE.veil, draw: false, hello: TX.bank.veilHello },
    mags_dw: { fee: B.FEE.mags, draw: false, hello: TX.bank.magsHello },
  };
  // a save is untrusted: a letter slot holds a whole number of letters from 1 to HELD_MAX, in one slot per face
  function sanitizeLetters() {
    if (!hasG() || !G.player || !Array.isArray(G.player.inv)) return;
    const inv = G.player.inv, seen = {};
    for (let i = inv.length - 1; i >= 0; i--) {
      const s = inv[i];
      if (!s || typeof s !== 'object' || !faceOf(s.id)) continue;
      const n = Number(s.n);
      if (!Number.isFinite(n) || n < 1) { inv.splice(i, 1); continue; }
      s.n = clamp(Math.floor(n), 1, B.HELD_MAX);
    }
    for (let i = 0; i < inv.length; i++) {
      const s = inv[i]; if (!s || !faceOf(s.id)) continue;
      if (seen[s.id] != null) { const first = inv[seen[s.id]]; first.n = Math.min(B.HELD_MAX, first.n + s.n); inv.splice(i, 1); i--; } else seen[s.id] = i;
    }
  }
  function held(face) {
    if (!hasG() || !G.player || !Array.isArray(G.player.inv)) return 0;
    sanitizeLetters();
    const s = G.player.inv.find((x) => x && x.id === FACE_ID(face));
    return s ? s.n : 0;
  }
  const payout = (face, feePct) => Math.floor(face * (100 - feePct) / 100);
  const goldNow = () => (hasG() && G.player && Number.isFinite(Number(G.player.gold)) ? clamp(Math.floor(Number(G.player.gold)), 0, B.GOLD_MAX) : 0);
  function setGold(v) { G.player.gold = clamp(Math.floor(Number.isFinite(v) ? v : 0), 0, B.GOLD_MAX); }
  function heldAll() { return B.FACES.reduce((a, f) => a + held(f), 0); }
  function draw(face, agentId) {
    const ag = own(AGENTS, agentId) ? AGENTS[agentId] : null;
    if (!ag || !cfg.bank || !hasG() || !G.player) return { ok: false, reason: 'none' };
    if (!ag.draw) return { ok: false, reason: 'nodraw' };
    if (B.FACES.indexOf(face) < 0) return { ok: false, reason: 'face' };
    if (held(face) >= B.HELD_MAX) return { ok: false, reason: 'full' };
    if (goldNow() < face) return { ok: false, reason: 'gold' };
    setGold(goldNow() - face); G.give(FACE_ID(face), 1);
    return { ok: true, face, cost: face };
  }
  // cash up to n letters of one face (n defaults to all held); the holder gets the face less the house's cut, rounded down
  function cash(face, agentId, n) {
    const ag = own(AGENTS, agentId) ? AGENTS[agentId] : null;
    if (!ag || !cfg.bank || !hasG() || !G.player) return { ok: false, reason: 'none' };
    if (B.FACES.indexOf(face) < 0) return { ok: false, reason: 'face' };
    const have = held(face);
    if (!have) return { ok: false, reason: 'none' };
    const k = clamp(Math.floor(Number(n)) || have, 1, have);
    let took = 0;
    for (let i = 0; i < k; i++) { const before = held(face); if (before < 1) break; G.take(FACE_ID(face)); if (held(face) < before) took++; else break; }
    if (!took) return { ok: false, reason: 'none' };
    const each = payout(face, ag.fee), got = each * took, fee = face * took - got;
    setGold(goldNow() + got);
    fset('p15l_lc', fint('p15l_lc') + took); fset('p15l_fee', fint('p15l_fee') + fee);
    return { ok: true, face, count: took, got, fee };
  }
  function cashAll(agentId) {
    let got = 0, fee = 0, count = 0;
    for (const f of B.FACES) { const r = cash(f, agentId); if (r.ok) { got += r.got; fee += r.fee; count += r.count; } }
    return count ? { ok: true, count, got, fee } : { ok: false, reason: 'none' };
  }

  // ================================================================ 3. THE TEST CONSOLE
  const ghost = { on: false, safe: null };
  const CODES = ['opensesame', 'richman', 'ghostmode', 'octave', 'showme'];
  function consoleAllowed() { return cfg.console && !hardcore() && hasG() && !!G.player; }
  function ghostOn() { return ghost.on && consoleAllowed(); }
  function solidAt(x, y) { try { return !!(G.map && (G.map.isSolidCell(x | 0, y | 0) || G.map.isBlocked(x | 0, y | 0))); } catch (e) { return false; } }
  function nearestOpen(x, y) {
    const m = G.map;
    for (let r = 0; r <= 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = (x | 0) + dx, cy = (y | 0) + dy;
      if (cx < 1 || cy < 1 || cx >= m.w - 1 || cy >= m.h - 1) continue;
      if (!solidAt(cx, cy)) return [cx + 0.5, cy + 0.5];
    }
    return null;
  }
  function ghostSet(on) {
    if (on) { ghost.on = true; ghost.safe = [Engine.cam.x, Engine.cam.y]; return TX.con.did.ghostOn; }
    ghost.on = false;
    const c = Engine.cam; let moved = false;
    if (G.map && solidAt(c.x, c.y)) {
      const to = nearestOpen(c.x, c.y) || ghost.safe;
      if (to) { c.x = to[0]; c.y = to[1]; moved = true; }
    }
    return moved ? TX.con.did.ghostOffMoved : TX.con.did.ghostOff;
  }
  // the mechanical locks in reach: the doors and strongboxes the game lets a pick open. cell.locked (story seals) is never touched.
  function openLocks() {
    const m = G.map, c = Engine.cam, R = B.DOOR_REACH; let n = 0;
    if (!m || G.mapId === 'watchhouse') return 0;               // the cell lock is the law's: a cheat does not serve a sentence for you
    for (let y = Math.max(0, Math.floor(c.y - R)); y <= Math.min(m.h - 1, Math.ceil(c.y + R)); y++) {
      for (let x = Math.max(0, Math.floor(c.x - R)); x <= Math.min(m.w - 1, Math.ceil(c.x + R)); x++) {
        const cell = m.get(x, y);
        if (!cell || !cell.door || !cell.lockDifficulty || cell.locked) continue;
        if (Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y) > R) continue;
        const key = mechanicalLockKey(cell, x, y);
        if (!G.flags[key]) { G.flags[key] = true; n++; }
        const d = m.doors[y * m.w + x]; if (d) d.target = 1;
      }
    }
    for (const e of (G.ents || [])) {
      if (!e || e.kind !== 'item' || e.item !== 'cache' || !(e.tier >= 2) || e.dead || e.hidden) continue;
      if (Math.hypot(e.x - c.x, e.y - c.y) > R) continue;
      const key = mechanicalLockKey(e);
      if (!G.flags[key]) { G.flags[key] = true; n++; }
    }
    return n;
  }
  function learnAll() {
    const p = G.player; if (!Array.isArray(p.songs)) p.songs = [];
    let n = 0;
    for (const id of Object.keys(SONGS)) {
      const s = SONGS[id];
      if (!s || s.custom || typeof s.name !== 'string' || typeof s.cost !== 'number' || p.songs.indexOf(id) >= 0) continue;
      p.songs.push(id); n++;
    }
    return n;
  }
  const CHEATS = {
    opensesame: () => (openLocks() ? TX.con.did.opensesame : TX.con.did.opensesameNone),
    richman: () => { setGold(goldNow() + B.RICH); return TX.con.did.richman; },
    ghostmode: () => ghostSet(!ghost.on),
    octave: () => (learnAll() ? TX.con.did.octave : TX.con.did.octaveNone),
    showme: () => { if (G.map && G.map.visited && typeof G.map.visited.fill === 'function') G.map.visited.fill(1); return TX.con.did.showme; },
  };
  // a code is run only through here: hardcore refuses, the first one asks first, every one marks the save, none touches the RNG
  function runCode(code) {
    if (!own(CHEATS, code)) return { ok: false, reason: 'unknown' };
    if (!consoleAllowed()) return { ok: false, reason: hardcore() ? 'hardcore' : 'off' };
    if (!fint('p15l_cheat')) return { ok: false, reason: 'warn' };
    fset('p15l_chn', fint('p15l_chn') + 1);
    return { ok: true, text: CHEATS[code]() };
  }
  function markSave() { fset('p15l_cheat', 1); }
  const con = { lines: [], pending: null, open: false, codesShown: false, built: false };
  function conPush(t, cls) { con.lines.push({ t, cls: cls || '' }); if (con.lines.length > 40) con.lines.shift(); }
  function normCode(raw) { return String(raw == null ? '' : raw).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24); }
  function submit(raw) {
    const code = normCode(raw);
    if (!code) return;
    conPush(fmt(TX.con.you, String(raw).slice(0, 24)), 'you');
    if (hardcore()) { conPush(TX.con.shut); paintCon(); return; }
    if (code === 'help') { conPush(TX.con.helpHead); paintCon(); return; }
    if (!own(CHEATS, code)) { conPush(fmt(TX.con.unknown, String(raw).trim().slice(0, 24))); paintCon(); return; }
    const r = runCode(code);
    if (r.reason === 'warn') { con.pending = code; paintCon(); return; }
    if (r.ok) conPush(r.text, 'did'); else conPush(TX.con.shut);
    paintCon();
  }
  function confirmPending() {
    const code = con.pending; con.pending = null;
    if (!code) return;
    markSave();
    const r = runCode(code);
    conPush(r.ok ? r.text : TX.con.shut, 'did');
    paintCon();
  }
  function openConsole() {
    if (!hasG() || !G.player || G.dead || typeof openModal !== 'function') return false;
    if (!cfg.console) return false;
    con.open = true; con.pending = null; con.codesShown = false;
    G.state = 'panel';
    openModal('<div id="p15l-con" class="p15l-con"></div>', 'p15l_console');
    buildCon();
    return true;
  }
  function closeConsole() {
    con.open = false; con.pending = null;
    try { closeModal(); } catch (e) { /* ignore */ }
    if (G.state === 'panel' || G.state === 'dialogue') G.state = 'play';
    try { G.keys = {}; } catch (e) { /* ignore */ }
  }
  function buildCon() {
    const root = document.getElementById('p15l-con'); if (!root) return;
    root.textContent = '';
    root.appendChild(el('h2', null, TX.con.title));
    const x = el('button', { class: 'dfbtn small close', type: 'button', id: 'p15l-x' }, TX.con.close); x.onclick = closeConsole; root.appendChild(x);
    root.appendChild(el('p', { class: 'muted' }, TX.con.intro));
    const out = el('div', { id: 'p15l-out', class: 'p15l-out', role: 'log', 'aria-live': 'polite' }); root.appendChild(out);
    const row = el('div', { class: 'btns p15l-row' });
    const inp = el('input', { id: 'p15l-in', type: 'text', maxlength: '24', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', 'aria-label': TX.con.inLabel, class: 'p15l-in' });
    inp.onkeydown = (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter') { ev.preventDefault(); const v = inp.value; inp.value = ''; submit(v); }
      else if (ev.key === 'Escape') { ev.preventDefault(); closeConsole(); }
    };
    const run = el('button', { class: 'dfbtn small', type: 'button', id: 'p15l-run' }, TX.con.run);
    run.onclick = () => { const v = inp.value; inp.value = ''; submit(v); };
    const codes = el('button', { class: 'dfbtn small', type: 'button', id: 'p15l-codes' }, TX.con.codes);
    codes.onclick = () => { con.codesShown = !con.codesShown; paintCon(); };
    row.append(inp, run, codes); root.appendChild(row);
    root.appendChild(el('div', { id: 'p15l-list', class: 'p15l-list' }));
    root.setAttribute('data-p15l', 'console');
    paintCon();
    if (!hardcore()) { try { inp.focus(); } catch (e) { /* not focusable yet */ } }
    padStart(closeConsole);
  }
  function paintCon() {
    const out = document.getElementById('p15l-out'); if (!out) return;
    out.textContent = '';
    if (hardcore() && !con.lines.length) con.lines.push({ t: TX.con.shut, cls: '' });
    for (const l of con.lines.slice(-8)) out.appendChild(el('div', { class: 'p15l-line ' + l.cls }, l.t));
    const inp = document.getElementById('p15l-in'), run = document.getElementById('p15l-run');
    const shut = hardcore();
    if (inp) inp.disabled = shut || !!con.pending; if (run) run.disabled = shut || !!con.pending;
    if (inp && !inp.disabled && !con.pending && (document.activeElement === document.body || !document.activeElement)) { try { inp.focus(); } catch (e) { /* ignore */ } }
    if (con.pending) {
      const w = el('div', { class: 'p15l-warn', role: 'alertdialog' });
      w.appendChild(el('p', null, TX.con.warn));
      const no = el('button', { class: 'dfbtn small', type: 'button', id: 'p15l-no' }, TX.con.warnNo);
      const yes = el('button', { class: 'dfbtn small', type: 'button', id: 'p15l-yes' }, TX.con.warnYes);
      no.onclick = () => { con.pending = null; paintCon(); try { document.getElementById('p15l-in').focus(); } catch (e) { /* ignore */ } };
      yes.onclick = confirmPending;
      const b = el('div', { class: 'btns' }); b.append(no, yes); w.appendChild(b); out.appendChild(w);
      try { no.focus(); } catch (e) { /* ignore */ }
    }
    const list = document.getElementById('p15l-list');
    if (list) {
      list.textContent = ''; list.hidden = !con.codesShown;
      if (con.codesShown) for (const c of CODES) {
        const b = el('button', { class: 'dfbtn small shoprow', type: 'button', 'data-code': c });
        b.append(el('b', null, c), el('span', null, TX.con.desc[c]), el('em', null, ''));
        b.onclick = () => submit(c);
        list.appendChild(b);
      }
    }
    out.scrollTop = out.scrollHeight;
  }
  function onGlobalKey(ev) {
    try {
      if (!(ev.key === '~' || (ev.code === 'Backquote' && ev.shiftKey))) return;
      const t = ev.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (!hasG() || !G.player || G.state !== 'play' || G.dead || !consoleAllowed()) return;
      ev.preventDefault(); ev.stopPropagation(); openConsole();
    } catch (e) { warnOnce('key', e); }
  }

  // ================================================================ 4. "WHERE IS..." MARKS
  const LISTS = {
    O: { flag: 'p15l_mkO', hub: 'oakhaven', names: () => Object.keys(PLACES), pos: (n) => (typeof PLACE_POS !== 'undefined' && PLACE_POS[PLACES[n]]) || null },
    W: { flag: 'p15l_mkW', hub: 'whispergrove', names: () => Object.keys(PLACES_WG), pos: (n) => PLACES_WG[n] || null },
    D: { flag: 'p15l_mkD', hub: 'deepwoods', names: () => Object.keys(PLACES_DW), pos: (n) => PLACES_DW[n] || null },
  };
  // which list is the "Where is" screen using now? (the same test as the game's: placeSet() is null in Oakhaven)
  function activeList() {
    let ps = null; try { ps = typeof placeSet === 'function' ? placeSet() : null; } catch (e) { ps = null; }
    if (!ps) return 'O';
    return ps.hub === 'deepwoods' ? 'D' : 'W';
  }
  function markIndex(which, name) { const i = LISTS[which].names().indexOf(name); return i >= 0 && i < 30 ? i : -1; }
  function isMarked(which, name) { const i = markIndex(which, name); return i >= 0 && (fint(LISTS[which].flag) & (1 << i)) !== 0; }
  function setMark(which, name, on) {
    const i = markIndex(which, name); if (i < 0) return false;
    const L = LISTS[which], cur = fint(L.flag);
    fset(L.flag, on ? (cur | (1 << i)) : (cur & ~(1 << i)));
    return true;
  }
  function allMarks() {
    const out = [];
    if (!hasG()) return out;
    for (const which of ['O', 'W', 'D']) {
      const L = LISTS[which], bits = fint(L.flag); if (!bits) continue;
      const names = L.names();
      for (let i = 0; i < names.length && i < 30; i++) if (bits & (1 << i)) { const p = L.pos(names[i]); if (p && Number.isFinite(p[0]) && Number.isFinite(p[1])) out.push({ which, name: names[i], x: p[0], y: p[1], map: L.hub }); }
    }
    return out;
  }
  const marksOn = (mapId) => allMarks().filter((m) => m.map === mapId);
  function clearAllMarks() { for (const w of ['O', 'W', 'D']) fset(LISTS[w].flag, 0); }
  // "Where is X?" worked out the way the game works it out; true when the answer was a direction (so a mark means something)
  function whereAnswered(place) {
    const which = activeList(), L = LISTS[which];
    const pos = L.pos(place); if (!pos) return null;
    const hub = G.maps && G.maps[L.hub]; if (!hub) return null;
    let from = [Engine.cam.x, Engine.cam.y];
    if (G.mapId !== L.hub) {
      if (G.mapId === 'underhedge') return null;
      const idx = hub.cells.findIndex((c) => c && c.portal && c.portal.map === G.mapId);
      if (idx < 0) return null;
      from = [idx % hub.w + 0.5, (idx / hub.w | 0) + 0.5];
    }
    return { which, dist: Math.hypot(pos[0] - from[0], pos[1] - from[1]) };
  }
  function markPlace(place) {
    if (!cfg.marks || !hasG()) return false;
    const a = whereAnswered(place);
    if (!a || a.dist < 2) return false;                   // "You are standing at it" marks nothing
    return setMark(a.which, place, true);
  }
  function clearReached() {
    if (!cfg.marks || !hasG() || !G.player) return;
    for (const m of allMarks()) {
      let hit = false;
      if (G.mapId === m.map) hit = Math.hypot(Engine.cam.x - m.x, Engine.cam.y - m.y) < B.CLEAR_DIST;
      else {
        const hub = G.maps && G.maps[m.map];
        if (hub && hub.cells) for (let i = 0; i < hub.cells.length && !hit; i++) {
          const c = hub.cells[i];
          if (c && c.portal && c.portal.map === G.mapId && Math.hypot(i % hub.w + 0.5 - m.x, (i / hub.w | 0) + 0.5 - m.y) < B.CLEAR_DIST + 0.4) hit = true;
        }
      }
      if (hit) { setMark(m.which, m.name, false); say(fmt(TX.marks.arrive, m.name), 'good', 3800); }
    }
  }
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
  function decorateMap() {
    const cv = document.getElementById('amap');
    if (!cv || cv.dataset.p15l || !cfg.marks || !hasG() || !G.map) return;
    cv.dataset.p15l = '1';
    const here = marksOn(G.mapId), all = allMarks();
    if (here.length) {
      const cx = cv.getContext('2d'), cw = 4;
      cx.save(); cx.font = '700 7px "Alegreya SC", serif'; cx.textBaseline = 'middle'; cx.lineJoin = 'round';
      for (const m of here) {                              // a pennant on a pole (procedural stand-in), with the place's name beside it
        const px = clamp(m.x * cw, 3, cv.width - 3), py = clamp(m.y * cw, 12, cv.height - 3);
        cx.strokeStyle = '#140d07'; cx.lineWidth = 2.4; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, py - 10); cx.stroke();
        cx.fillStyle = '#e24b2a'; cx.beginPath(); cx.moveTo(px, py - 10); cx.lineTo(px + 6, py - 7.5); cx.lineTo(px, py - 5); cx.closePath(); cx.fill(); cx.stroke();
        cx.strokeStyle = '#f2d98a'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px, py - 10); cx.stroke();
        const label = short(m.name, B.LABEL_MAX), w = cx.measureText(label).width;
        const lx = px + 8 + w > cv.width - 2 ? Math.max(2, px - 3 - w) : px + 8, ly = clamp(py - 7, 5, cv.height - 5);
        cx.strokeStyle = '#140d07'; cx.lineWidth = 2.6; cx.strokeText(label, lx, ly);
        cx.fillStyle = '#f6e7b0'; cx.fillText(label, lx, ly);
      }
      cx.restore();
    }
    if (!all.length) return;
    const box = el('div', { class: 'p15l-markbox', id: 'p15l-markbox' });
    box.appendChild(el('p', { class: 'muted p15l-markline' }, fmt(TX.marks.line, all.map((m) => m.name).join(' · '))));
    const b = el('button', { class: 'dfbtn small', type: 'button', id: 'p15l-clear' }, TX.marks.clear);
    b.onclick = () => { clearAllMarks(); try { renderMap(); } catch (e) { warnOnce('clear', e); } };
    box.appendChild(b);
    const lg = document.getElementById('lm-legend');
    if (lg) lg.insertAdjacentElement('afterend', box); else cv.insertAdjacentElement('afterend', box);
    if (here.length && lg) {                               // the legend key for the pennant
      const k = el('span', { class: 'lm-key', 'data-kind': 'p15l' }); const ic = el('canvas', { width: '24', height: '24', 'aria-hidden': 'true' });
      const c2 = ic.getContext('2d'); c2.strokeStyle = '#140d07'; c2.lineWidth = 2.4; c2.beginPath(); c2.moveTo(8, 21); c2.lineTo(8, 4); c2.stroke();
      c2.fillStyle = '#e24b2a'; c2.beginPath(); c2.moveTo(8, 4); c2.lineTo(20, 8.5); c2.lineTo(8, 13); c2.closePath(); c2.fill(); c2.stroke();
      k.append(ic, el('span', null, TX.marks.legend)); lg.appendChild(k);
    }
  }
  function decorateLog() {
    if (!cfg.marks || !hasG()) return;
    const panel = document.getElementById('modal-panel'); if (!panel || panel.querySelector('.p15l-marks')) return;
    const all = allMarks(); if (!all.length) return;
    const box = el('div', { class: 'p15l-marks' });
    box.appendChild(el('h3', null, TX.marks.logHead));
    for (const m of all) box.appendChild(el('p', { class: 'p15l-markrow' }, m.name));
    const h3 = panel.querySelector('h3');
    if (h3) panel.insertBefore(box, h3); else panel.appendChild(box);
  }

  // ================================================================ items and people
  const ITEM_DEFS = {};
  for (const f of B.FACES) ITEM_DEFS[FACE_ID(f)] = { name: TX.items['l' + f].name, sprite: 'loot', desc: TX.items['l' + f].desc };
  if (typeof ITEMS !== 'undefined') for (const id in ITEM_DEFS) if (!ITEMS[id]) ITEMS[id] = ITEM_DEFS[id];
  try {
    if (typeof ITEM_WEIGHTS !== 'undefined') for (const f of B.FACES) ITEM_WEIGHTS[FACE_ID(f)] = 1e-6;       // truthy, and under a hundredth of a stone at 99 letters: "weighs nothing"
    if (typeof ICONS !== 'undefined' && ICONS && ICONS.TABLE) {
      Object.assign(ICONS.TABLE, { p15_letter_25: ['scroll', { paper: '#e5d7ae', ink: '#355a8a' }], p15_letter_100: ['scroll', { paper: '#e5d7ae', ink: '#3f6a3a' }], p15_letter_500: ['scroll', { paper: '#ecdcae', ink: '#8a2d22' }] });
    }
  } catch (e) { /* icons and weights are optional */ }
  const NPC_DEFS = {
    p15l_clerk: { name: TX.bank.clerk.name, sprite: 'townsman', portrait: 'townsman', tier: 'high',
      greet: { polite: TX.bank.clerk.polite, normal: TX.bank.clerk.normal, blunt: TX.bank.clerk.blunt }, topics: {}, quest: () => null },
    p15l_veil: { name: TX.bank.veil.name, sprite: 'townsman', portrait: 'townsman', tier: 'high',
      greet: { polite: TX.bank.veil.polite, normal: TX.bank.veil.normal, blunt: TX.bank.veil.blunt }, topics: {}, quest: () => null },
  };
  if (typeof NPCS !== 'undefined') for (const id in NPC_DEFS) if (!NPCS[id]) NPCS[id] = NPC_DEFS[id];

  // ---- placing the clerk, the desk and its letter, the keeper (transient: never saved, rebuilt from the flags)
  const DIMS = { greenhall: [17, 12], whispergrove: [48, 48] };
  const SPOTS = { clerk: [13.6, 4.3], desk: [13.6, 3.5], note: [13.6, 3.35], veil: [23.4, 41.2] };   // [PROPOSED] where they stand
  const realMap = (m) => !!m && !!DIMS[m.id] && m.w === DIMS[m.id][0] && m.h === DIMS[m.id][1];
  const gone = (f) => !!(f.greening || f.escaped || f.part3);
  const wantClerk = () => cfg.bank && !gone(flags());
  const wantDeskLetter = () => wantClerk() && fint('p15l_desk') === 0;
  const wantVeil = () => cfg.bank && !!(flags().greening || flags().part3);
  function cellFree(m, x, y) { return !m.isBlocked(x | 0, y | 0); }
  function nearFree(m, x, y, r) {
    r = r || 0.4;
    if (cellFree(m, x, y) && cellFree(m, x - r, y) && cellFree(m, x + r, y)) return [x, y];
    for (let k = 1; k <= 8; k++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * Math.PI / 4) * k * 0.5, py = y + Math.sin(a * Math.PI / 4) * k * 0.5; if (cellFree(m, px, py) && cellFree(m, px - r, py) && cellFree(m, px + r, py)) return [px, py]; }
    return null;
  }
  function removeMine(m, key) { for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p15l === key) m.entities.splice(i, 1); } }
  function removeAll(m) { for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p15l) m.entities.splice(i, 1); } }
  function specsFor(m) {
    const ent = (o) => Object.assign({ transient: true }, o);
    if (m.id === 'greenhall') return [
      { key: 'desk', when: wantClerk, make: () => ent({ kind: 'deco', sprite: 'table', x: SPOTS.desk[0], y: SPOTS.desk[1], scale: 0.6, solid: true, radius: 0.42, nopick: false, label: TX.bank.deskName }) },
      { key: 'clerk', when: wantClerk, make: () => ent({ kind: 'npc', id: 'p15l_clerk', sprite: 'townsman', x: SPOTS.clerk[0], y: SPOTS.clerk[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: -Math.PI / 2, _still: true }) },
      { key: 'letter', when: wantDeskLetter, make: () => ent({ kind: 'item', item: FACE_ID(25), sprite: 'loot', x: SPOTS.note[0], y: SPOTS.note[1], scale: 0.3, yOff: -0.25, solid: false, owner: 'p15l', label: TX.bank.deskLabel }) },
    ];
    if (m.id === 'whispergrove') return [
      { key: 'veil', when: wantVeil, make: () => ent({ kind: 'npc', id: 'p15l_veil', sprite: 'townsman', x: SPOTS.veil[0], y: SPOTS.veil[1], scale: 1, solid: true, radius: 0.35, nopick: false, facing: Math.PI / 2, _still: true }) },
    ];
    return [];
  }
  function ensureMap(m) {
    if (!m || !Array.isArray(m.entities) || !realMap(m)) return;
    if (!cfg.bank) { removeAll(m); return; }
    for (const sp of specsFor(m)) {
      let want = false;
      try { want = !!sp.when(); } catch (e) { want = false; }
      const have = m.entities.find((e) => e && e._p15l === sp.key);
      if (!want) { if (have) removeMine(m, sp.key); continue; }
      if (have) continue;
      const o = sp.make();
      if (o.kind === 'npc' || o.solid) { const at = nearFree(m, o.x, o.y, o.radius || 0.4); if (!at) continue; o.x = at[0]; o.y = at[1]; }
      const e = Object.assign(o, { _p15l: sp.key });
      if (typeof hydrate === 'function') hydrate(e);
      if (e.kind === 'npc') { e.wanderT = 1e9; if (e.facing != null) e.dir = e.facing; }
      m.entities.push(e);
    }
  }
  function syncCurrent() { try { if (hasG() && G.map && G.maps) ensureMap(G.map); } catch (e) { warnOnce('sync', e); } }
  function checkDesk() {
    // the desk letter is "owned stock": taking it goes through the game's theft panel. Once it is gone it stays gone.
    for (const id of ['greenhall']) {
      const m = G.maps && G.maps[id]; if (!m) continue;
      const e = m.entities.find((x) => x && x._p15l === 'letter');
      if (e && (e.dead || e.hidden)) { fset('p15l_desk', 1); removeMine(m, 'letter'); }
    }
  }

  // ================================================================ the dialogue screen: Train..., Letters...
  const ui = { mode: null, focus: -1 };
  function isTrainer(id) { return cfg.train && own(TRAINERS, id); }
  function isAgent(id) { return cfg.bank && own(AGENTS, id); }
  const npcId = () => (typeof DLG !== 'undefined' && DLG && DLG.ent && typeof DLG.ent.id === 'string' ? DLG.ent.id : '');
  function dlgPush(who, t) { try { DLG.log.push({ who, t }); } catch (e) { /* no dialogue open */ } }
  function sayOnce(key, text) {
    if (typeof DLG === 'undefined' || !DLG) return;
    DLG.p15l = DLG.p15l || {};
    if (DLG.p15l[key]) return;
    DLG.p15l[key] = 1; dlgPush('them', text);
  }
  function toggleMode(mode) {
    const id = npcId();
    if (ui.mode !== mode) {
      if (mode === 'train' && own(TRAINERS, id)) { const info = trainInfo(id); sayOnce('t' + id, info && info.gated ? TX.tr.lyraGate : TX.tr[TRAINERS[id].txt].offer); }
      if (mode === 'bank' && own(AGENTS, id)) sayOnce('b' + id, AGENTS[id].hello);
    }
    renderDialogue(ui.mode === mode ? null : mode);
  }
  function addButtons(mode) {
    const id = npcId(); if (!id) return;
    const row = document.querySelector('#modal-panel .dlg .btns'); if (!row) return;
    const tone = row.querySelector('.tone');
    const add = (bid, text, m) => {
      const b = el('button', { class: 'dfbtn small' + (mode === m ? ' sel' : ''), type: 'button', id: bid, 'aria-pressed': String(mode === m) }, text);
      b.onclick = () => toggleMode(m);
      if (tone) row.insertBefore(b, tone); else row.appendChild(b);
    };
    if (isTrainer(id) && !document.getElementById('p15l-train')) add('p15l-train', TX.train.btn, 'train');
    if (isAgent(id) && !document.getElementById('p15l-bank')) add('p15l-bank', TX.bank.btn, 'bank');
  }
  function paneBox(kind) {
    const box = document.getElementById('d-topics'); if (!box) return null;
    box.className = 'topics shop'; box.textContent = ''; box.setAttribute('data-p15l', kind);
    return box;
  }
  function lessonLine(txt, key, i) { return TX.tr[txt][key]; }
  function renderTrainPane() {
    const id = npcId(), info = trainInfo(id), box = paneBox('train'); if (!info || !box) return;
    box.appendChild(el('div', { class: 'purse' }, fmt(TX.train.purse, info.gold, info.used, info.allowed, info.level)));
    const locked = !!(info.gated || info.capped || info.limited);
    const row = el('button', { class: 'dfbtn small shoprow' + (locked || info.gold < info.cost ? ' dear' : ''), type: 'button', 'data-train': id, 'aria-disabled': String(locked) });
    const why = info.gated ? TX.train.gated : info.capped ? TX.train.capped : info.limited ? TX.train.limit : fmt(TX.train.rowDesc, info.cur, info.cap);
    row.append(el('b', null, info.skill), el('span', null, why), el('em', null, String(info.cost)));
    row.onclick = () => doTrain(id);
    box.appendChild(row);
  }
  function doTrain(id) {
    if (typeof DLG === 'undefined' || !DLG || !DLG.npc) return;
    const r = train(id), info = r.info || trainInfo(id), t = info ? TX.tr[info.txt] : null;
    dlgPush('you', TX.train.you);
    let line;
    if (r.ok) line = t.done;
    else if (r.reason === 'gate') line = TX.tr.lyraGate;
    else if (r.reason === 'cap') line = t.cap;
    else if (r.reason === 'limit') line = TX.train.limitLine;
    else if (r.reason === 'gold') line = TX.train.broke;
    else return;
    dlgPush('them', line);
    ui.focus = 1;
    renderDialogue('train');
  }
  function renderBankPane() {
    const id = npcId(), ag = own(AGENTS, id) ? AGENTS[id] : null, box = paneBox('bank'); if (!ag || !box) return;
    box.appendChild(el('div', { class: 'purse' }, fmt(TX.bank.purse, goldNow(), heldAll(), ag.fee)));
    if (ag.draw) for (const f of B.FACES) {
      const dear = goldNow() < f || held(f) >= B.HELD_MAX;
      const b = el('button', { class: 'dfbtn small shoprow' + (dear ? ' dear' : ''), type: 'button', 'data-draw': String(f) });
      b.append(el('b', null, fmt(TX.bank.drawB, f)), el('span', null, fmt(TX.bank.drawS, f)), el('em', null, String(f)));
      b.onclick = () => doBank('draw', f);
      box.appendChild(b);
    } else box.appendChild(el('div', { class: 'purse' }, TX.bank.noDraw));
    for (const f of B.FACES) {
      const n = held(f); if (!n) continue;
      const b = el('button', { class: 'dfbtn small shoprow', type: 'button', 'data-cash': String(f) });
      b.append(el('b', null, fmt(TX.bank.cashB, f)), el('span', null, fmt(TX.bank.cashS, n, payout(f, ag.fee))), el('em', null, String(payout(f, ag.fee))));
      b.onclick = () => doBank('cash', f);
      box.appendChild(b);
    }
    const total = B.FACES.reduce((a, f) => a + held(f), 0);
    if (total >= 2) {
      const got = B.FACES.reduce((a, f) => a + held(f) * payout(f, ag.fee), 0), face = B.FACES.reduce((a, f) => a + held(f) * f, 0);
      const b = el('button', { class: 'dfbtn small shoprow', type: 'button', 'data-cash': 'all' });
      b.append(el('b', null, TX.bank.allB), el('span', null, fmt(TX.bank.allS, total, face - got)), el('em', null, String(got)));
      b.onclick = () => doBank('all', 0);
      box.appendChild(b);
    }
  }
  function doBank(kind, face) {
    const id = npcId(); if (!own(AGENTS, id) || typeof DLG === 'undefined' || !DLG || !DLG.npc) return;
    let r;
    if (kind === 'draw') { dlgPush('you', fmt(TX.bank.youDraw, face)); r = draw(face, id); }
    else if (kind === 'cash') { dlgPush('you', fmt(TX.bank.youCash, face)); r = cash(face, id, 1); }
    else { dlgPush('you', TX.bank.youAll); r = cashAll(id); }
    if (r.ok && kind === 'draw') dlgPush('them', TX.bank.drawn[(fint('p15l_lc') + heldAll()) % TX.bank.drawn.length]);
    else if (r.ok) dlgPush('them', fmt(TX.bank.cashed, r.got, r.fee));
    else dlgPush('them', r.reason === 'gold' ? TX.bank.short : r.reason === 'full' ? TX.bank.full : TX.bank.none);
    try { Audio_.sfx.pickup(); } catch (e) { /* no audio yet */ }
    ui.focus = 1;
    renderDialogue('bank');
  }
  function decorateDialogue(mode) {
    ui.mode = mode === 'train' || mode === 'bank' ? mode : null;
    const id = npcId();
    if (!id || (!isTrainer(id) && !isAgent(id))) return;
    addButtons(mode);
    if (mode === 'train' && isTrainer(id)) renderTrainPane();
    else if (mode === 'bank' && isAgent(id)) renderBankPane();
    else return;
    const bs = Array.from(document.querySelectorAll('#d-topics[data-p15l] button'));
    const f = bs[Math.max(0, Math.min(bs.length - 1, ui.focus < 0 ? 0 : ui.focus - 1))]; ui.focus = -1;
    try { if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest' }); } } catch (e) { /* ignore */ }
    padStart(() => { if (typeof renderDialogue === 'function' && typeof DLG !== 'undefined' && DLG && DLG.npc && G.state === 'dialogue') renderDialogue(); else closeConsole(); });
  }

  // ---- keyboard and controller for my own screens: arrows and digits move and choose, D-pad / A / B on a pad
  const pad = { raf: 0, prev: [], back: null };
  function focusables() { return Array.from(document.querySelectorAll('#modal-panel button:not([disabled]), #modal-panel input:not([disabled])')).filter((b) => b.getClientRects().length); }
  function moveFocus(dir) {
    const bs = focusables(); if (!bs.length) return;
    let i = bs.indexOf(document.activeElement); i = i < 0 ? 0 : (i + dir + bs.length) % bs.length; bs[i].focus();
  }
  const paneUp = () => !!document.querySelector('[data-p15l]') && (G.openPanel === 'p15l_console' || G.state === 'dialogue');
  function onPaneKey(ev) {
    try {
      if (!paneUp() || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.target && ev.target.tagName === 'INPUT') return;
      const k = ev.key;
      if (/^[1-9]$/.test(k) && G.state === 'dialogue') {
        const bs = Array.from(document.querySelectorAll('#d-topics[data-p15l] button')), b = bs[+k - 1];
        if (b) { ev.preventDefault(); ev.stopPropagation(); b.click(); }
      } else if (k === 'ArrowDown' || k === 'ArrowRight') { ev.preventDefault(); ev.stopPropagation(); moveFocus(1); }
      else if (k === 'ArrowUp' || k === 'ArrowLeft') { ev.preventDefault(); ev.stopPropagation(); moveFocus(-1); }
    } catch (e) { warnOnce('panekey', e); }
  }
  function padPoll() {
    pad.raf = 0;
    if (!paneUp()) return;
    let gp = null;
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (let i = 0; i < ps.length; i++) if (ps[i] && ps[i].connected) { gp = ps[i]; break; } } catch (e) { gp = null; }
    if (gp) {
      const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), edge = (i) => btn(i) && !pad.prev[i];
      const ay = gp.axes[1] || 0, ax = gp.axes[0] || 0;
      const down = edge(13) || edge(15) || (ay > 0.6 && !pad.prev.ay) || (ax > 0.6 && !pad.prev.ax);
      const up = edge(12) || edge(14) || (ay < -0.6 && !pad.prev.ay) || (ax < -0.6 && !pad.prev.ax);
      if (down) moveFocus(1); else if (up) moveFocus(-1);
      else if (edge(0)) { const a = document.activeElement; if (a && a.tagName === 'BUTTON' && a.closest && a.closest('#modal-panel')) a.click(); }
      else if (edge(1)) { if (pad.back) pad.back(); }
      for (let i = 0; i < 16; i++) pad.prev[i] = btn(i);
      pad.prev.ay = Math.abs(ay) > 0.6; pad.prev.ax = Math.abs(ax) > 0.6;
    }
    if (typeof requestAnimationFrame === 'function') pad.raf = requestAnimationFrame(padPoll);
  }
  function padStart(back) {
    pad.back = back;
    if (pad.raf) return;                                        // one loop is enough; it ends itself when the screen goes
    try {
      const ps = navigator.getGamepads ? navigator.getGamepads() : null; pad.prev = [];
      if (ps) for (let i = 0; i < ps.length; i++) if (ps[i] && ps[i].connected) { for (let j = 0; j < 16; j++) pad.prev[j] = !!(ps[i].buttons[j] && ps[i].buttons[j].pressed); break; }   // a held A from opening is ignored
    } catch (e) { pad.prev = []; }
    if (typeof requestAnimationFrame === 'function') pad.raf = requestAnimationFrame(padPoll);
  }

  // ================================================================ per-frame work and the wrappers
  const state = { acc: 0 };
  function tick(dt) {
    if (!hasG() || !G.player || !G.map) return;
    if (ghost.on) {
      if (!ghostOn()) ghostSet(false);
      else if (!solidAt(Engine.cam.x, Engine.cam.y)) ghost.safe = [Engine.cam.x, Engine.cam.y];
    }
    state.acc += dt;
    if (state.acc < 0.5) return;
    state.acc = 0;
    syncCurrent(); checkDesk();
    if (G.state === 'play') clearReached();
  }
  function ghostFeet() {
    // a ghost does not fall: keep the feet on the ground it is over, so a ledge costs nothing
    try {
      const p = G.player, m = G.map, c = Engine.cam;
      if (p && m && (m.lvls || m.smooth)) { p.feet = m.groundAt(c.x, c.y); p.fallFrom = null; p.fallV = 0; }
    } catch (e) { /* flat map */ }
  }
  function wire(name, fn) { try { fn(); } catch (e) { console.warn('ledger15: ' + name + ' wiring failed', e); } }
  function wireDialogue() {
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function (mode) {
        const r = _rd.apply(this, arguments);
        try { decorateDialogue(mode); } catch (e) { warnOnce('dialogue', e); }
        return r;
      };
    }
    if (typeof askPlace === 'function') {
      const _ap = askPlace;
      askPlace = function (place) {
        const r = _ap.apply(this, arguments);
        try { if (markPlace(place)) dlgPush('you', TX.marks.you); } catch (e) { warnOnce('askPlace', e); }
        return r;
      };
    }
    window.addEventListener('keydown', onPaneKey, true);
    window.addEventListener('keydown', onGlobalKey, true);
  }
  function wireWorld() {
    if (typeof update === 'function') {
      const _update = update;
      update = function (dt) {
        try { if (ghost.on && ghostOn()) ghostFeet(); } catch (e) { warnOnce('ghostfeet', e); }
        const r = _update.apply(this, arguments);
        try { tick(dt); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
    if (typeof pickUp === 'function') {
      const _pu = pickUp;
      pickUp = function (e) {
        const r = _pu.apply(this, arguments);
        try { if (e && e._p15l === 'letter' && (e.dead || e.hidden)) { fset('p15l_desk', 1); for (const id in (G.maps || {})) removeMine(G.maps[id], 'letter'); } } catch (err) { warnOnce('pickUp', err); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        const r = _lm.apply(this, arguments);
        try { syncCurrent(); clearReached(); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        const r = _rg.apply(this, arguments);                 // a bad save throws here, before anything below
        try { ghost.on = false; con.lines = []; con.pending = null; sanitizeFlags(); sanitizeLetters(); syncCurrent(); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () {
        const r = _sg.apply(this, arguments);
        try { ghost.on = false; con.lines = []; con.pending = null; } catch (e) { warnOnce('start', e); }
        return r;
      };
    }
    if (typeof playerMove === 'function') {
      const _pm = playerMove;
      playerMove = function (o, dx, dy) {
        if (ghost.on && o === Engine.cam && ghostOn() && G.map) {
          o.x = clamp(o.x + dx, 0.6, G.map.w - 0.6); o.y = clamp(o.y + dy, 0.6, G.map.h - 0.6);
          return { bx: false, by: false };
        }
        return _pm.apply(this, arguments);
      };
    }
    if (typeof drawHUD === 'function') {
      const _hud = drawHUD;
      drawHUD = function () {
        const r = _hud.apply(this, arguments);
        try {
          if (ghost.on && ghostOn() && Engine.ctx) {
            const ctx = Engine.ctx; ctx.save(); ctx.font = '8px "Alegreya SC", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.strokeText(TX.con.ghostChip, 4, 4); ctx.fillStyle = '#bfe3ff'; ctx.fillText(TX.con.ghostChip, 4, 4); ctx.restore();
          }
        } catch (e) { warnOnce('hud', e); }
        return r;
      };
    }
  }
  function wireScreens() {
    if (typeof slotSummary === 'function') {
      const _ss = slotSummary;
      slotSummary = function (d) {
        const r = _ss.apply(this, arguments);
        try { if (d && d.flags && typeof d.flags === 'object' && d.flags.p15l_cheat === 1) return r + ' · ' + TX.stats.slot; } catch (e) { /* the plain line stands */ }
        return r;
      };
    }
    if (typeof openModal === 'function') {
      const _om = openModal;
      openModal = function (html, name) {
        const r = _om.apply(this, arguments);
        try { if (name === 'stats') addStatsCell(); } catch (e) { warnOnce('stats', e); }
        return r;
      };
    }
    if (typeof renderCodexModal === 'function') {
      const _cm = renderCodexModal;
      renderCodexModal = function (tab) {
        const r = _cm.apply(this, arguments);
        try {
          if (tab === 'ach' && hasG() && fint('p15l_cheat') === 1) {
            const panel = document.getElementById('modal-panel');
            if (panel && !panel.querySelector('.p15l-achnote')) {
              const p = el('p', { class: 'muted p15l-achnote' }, TX.stats.ach), first = panel.querySelector('p.muted');
              if (first) first.insertAdjacentElement('afterend', p); else panel.appendChild(p);
            }
          }
        } catch (e) { warnOnce('ach', e); }
        return r;
      };
    }
    if (typeof renderMap === 'function') {
      const _rm = renderMap;
      renderMap = function () { const r = _rm.apply(this, arguments); try { decorateMap(); } catch (e) { warnOnce('map', e); } return r; };
    }
    if (typeof renderLog === 'function') {
      const _rl = renderLog;
      renderLog = function () { const r = _rl.apply(this, arguments); try { decorateLog(); } catch (e) { warnOnce('log', e); } return r; };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { optionRows(); } catch (e) { warnOnce('options', e); }
        return r;
      };
    }
  }
  // [label, value, used]: the Statistics block lists a row only once there is something to say, so a plain game's page is unchanged
  function statsRows() {
    return [
      [TX.stats.cheats, fint('p15l_cheat') ? String(fint('p15l_chn')) : TX.stats.none, fint('p15l_cheat') === 1],
      [TX.stats.sessions, String(fint('p15l_ts')), fint('p15l_ts') > 0],
      [TX.stats.cashed, String(fint('p15l_lc')), fint('p15l_lc') > 0],
      [TX.stats.fees, String(fint('p15l_fee')), fint('p15l_fee') > 0],
      [TX.stats.marked, String(allMarks().length), allMarks().length > 0],
    ];
  }
  function addStatsCell() {
    const root = document.getElementById('p7-stats'); if (!root || root.querySelector('.p15l-stats')) return;
    const rows = statsRows().filter((r) => r[2]); if (!rows.length) return;
    const cell = el('div', { class: 'p7-cell p15l-stats' }), col = el('div', { class: 'p7-col' });
    col.appendChild(el('h3', null, TX.stats.head));
    for (const [k, v] of rows) { const r = el('div', { class: 'p7-srow' }); r.appendChild(el('span', null, k)); r.appendChild(el('b', null, v)); col.appendChild(r); }
    cell.appendChild(col); root.appendChild(cell);
  }

  // ================================================================ Options rows and style
  function optionRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p15l-head')) return;
    const head = el('span', { id: 'p15l-head' }, TX.opts.head);
    head.style.cssText = 'grid-column:1/-1;margin-top:1cqh;color:var(--gold);font-family:var(--font-display);letter-spacing:.08em';
    grid.appendChild(head);
    const label = (t, hint) => { const s = el('span', { class: 'gfx-label' }, t + ' '); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const toggle = (key, id, T) => {
      const b = el('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': String(cfg[key]) }, cfg[key] ? 'On' : 'Off');
      b.classList.toggle('sel', cfg[key]);
      b.onclick = () => {
        cfg[key] = !cfg[key]; saveCfg(); b.textContent = cfg[key] ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(cfg[key])); b.classList.toggle('sel', cfg[key]);
        if (key === 'bank') { try { for (const mid in G.maps) { if (!cfg.bank) removeAll(G.maps[mid]); } syncCurrent(); } catch (e) { warnOnce('bank toggle', e); } }
        if (key === 'console' && !cfg.console && ghost.on) ghostSet(false);
      };
      grid.appendChild(label(T.label, T.hint)); grid.appendChild(b);
    };
    toggle('train', 'p15l-opt-train', TX.opts.train);
    toggle('bank', 'p15l-opt-bank', TX.opts.bank);
    toggle('marks', 'p15l-opt-marks', TX.opts.marks);
    toggle('console', 'p15l-opt-console', TX.opts.con);
    const open = el('button', { class: 'dfbtn small', id: 'p15l-opt-open', type: 'button' }, TX.opts.con.open);
    open.disabled = hardcore() || !cfg.console;
    open.onclick = () => { if (!open.disabled) openConsole(); };
    grid.appendChild(label(TX.con.title, TX.opts.con.hint)); grid.appendChild(open);
  }
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('ledger15-style')) return;
    const st = document.createElement('style'); st.id = 'ledger15-style';
    st.textContent = `
.p15l-con { display: flex; flex-direction: column; gap: .6cqh; }
.p15l-out { min-height: 14cqh; max-height: 28cqh; overflow-y: auto; background: #0e0a07; border: 2px solid; border-color: var(--edge-d) var(--edge-l) var(--edge-l) var(--edge-d); padding: .8cqh 1.2cqw; font-size: 2cqw; }
.p15l-line.you { color: var(--gold); }
.p15l-line.did { color: var(--parch); }
.p15l-row { align-items: center; margin-top: .4cqh; }
.p15l-in { flex: 1 1 22cqw; min-width: 0; font-family: var(--font-body); font-size: 2.2cqw; padding: .5cqh 1cqw; background: #0e0a07; color: var(--parch); border: 2px solid var(--edge-d); }
.p15l-list { display: grid; grid-template-columns: 1fr; gap: .45cqh; max-height: 24cqh; overflow-y: auto; }
.p15l-list[hidden] { display: none; }
.dlg .topics.shop[data-p15l] .shoprow { grid-template-columns: 25cqw 1fr 8cqw; }
.p15l-list .shoprow { display: grid; grid-template-columns: 16cqw 1fr; gap: 1.2cqw; text-align: left; width: 100%; align-items: center; }
.p15l-list .shoprow em { display: none; }
.p15l-warn p { margin: .4cqh 0; font-size: 2cqw; }
#modal-panel.lm-map:has(.p15l-markbox) #amap { max-height: 46cqh !important; }
.p15l-markbox { display: flex; flex-wrap: nowrap; gap: .8cqw; align-items: center; margin-top: .5cqh; }
.p15l-markbox button { flex: none; }
.p15l-markline { margin: 0; font-size: 1.7cqw; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.p15l-marks h3 { margin: .6cqh 0 .2cqh; }
.p15l-markrow { margin: .1cqh 0 .1cqh 1.4cqw; }
`;
    document.head.appendChild(st);
  }

  // ================================================================ boot
  loadCfg();
  try { injectStyle(); } catch (e) { /* head not ready */ }
  wire('dialogue', wireDialogue); wire('world', wireWorld); wire('screens', wireScreens);
  if (hasG() && G.map) wire('first sync', syncCurrent);

  return {
    cfg, saveCfg, B, TX, TEXTS: LIST, FLAGS, TRAINERS, AGENTS, CODES, ITEM_DEFS, NPC_DEFS, SPOTS,
    sessionsAllowed, trainCost, trainGain, trainInfo, train, usedAt, levelNow,
    faceOf, held, payout, draw, cash, cashAll, sanitizeLetters, heldAll,
    runCode, markSave, submit, openConsole, closeConsole, con, ghost, ghostSet, openLocks, learnAll, consoleAllowed,
    allMarks, marksOn, markPlace, isMarked, setMark, clearAllMarks, clearReached, whereAnswered, decorateMap,
    ensureMap, syncCurrent, checkDesk, sanitizeFlags, fint, fset, tick, statsRows, optionRows, state,
  };
})();
if (typeof window !== 'undefined') window.LEDGER15 = LEDGER15;
