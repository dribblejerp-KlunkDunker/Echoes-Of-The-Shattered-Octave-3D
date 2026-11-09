// ============================================================
//  hearth15 — Phase 15 (the province moves), team HEARTH: three small, warm things to do between the fights.
//
//  1. CAMP COOKING. At a camp fire (the Deep Woods camp, use:'campfire'), at the Boar & Dulcimer's hearth and at
//     your own hearth on Cooper's Row, "Cook something" turns carried food into a dish. A short beat at the spit
//     (three marks, press to turn; or let it turn itself) sets how well it comes out, and then you eat it hot at
//     the fire or wrap it for the road. Cooked food is richer than raw and leaves a small timed warmth, one at a
//     time: a new meal replaces the old. [PROPOSED] recipes only (see RECIPES). The needs system has no spoilage
//     (js/game.js "optional journey needs" is hunger and sleep only), so none is invented: "outlasts raw" is
//     carried by the richer numbers, a bigger hunger refill with Needs on, and the Smoke-warmed buff slowing hunger.
//  2. ROUNDS. Nessa Tolliver, a ferrywoman off the Flume [PROPOSED], deals Rounds at the Boar: a 24-card trick-taking
//     game (Bells, Reeds, Glass, Roots; 1, 2, 3, Deacon, Factor, Cantor) for 2-30 sovereigns, a net loss cap per
//     day like Bones. Own seeded stream; the NPC reads only its own hand and what is face up. Closes with the
//     Greening exactly as tavern11's games do (they do not move to Whisper-Grove), with one journal line.
//  3. BOSS TROPHIES. Each boss already beaten leaves a trophy item (p15_t_*), granted once and retroactively from
//     the boss flags the game already sets. Twelve fixed pegs on the walls of your house hold them; hanging one
//     prints a line; the Statistics screen lists them. No combat power. Pride only.
//
//  GAMEPLAY / BALANCE (the one table, B below; the report repeats it)
//    Dish            inputs                        at once (hp/voice/fat/hunger*)   warmth (secs)  effect while warm
//    Smoked Run-Eel  Run-Eel x1                    20 / 0 / 30 / +50                150            fatigue +1.0/s, hunger loss -25%
//    Toasted Round   hearth bread x1 + curd x1     16 / 10 / 20 / +50               180            health +0.10/s
//    Soothing Draught honey x1 + willow-bark x1    6 / 18 / 0 / +50                 150            voice +0.25/s
//    (*hunger only with Needs on; raw food gives +35.)  Regeneration pauses while a hostile is chasing within 12
//    tiles. Quality (turns 0-3 at the spit) scales the warmth: x0.75, x0.9, x1.0, x1.15; auto-turn = 3 turns.
//    Rounds: stake 2-30, loss cap 90 a day, 4-5 tricks pays 1x, all six 2x, three apiece is a push, 2 or fewer
//    loses the stake (the NPC never claims the double). Trophies: no numbers.
//
//  SAVED STATE, all G.flags under p15h_, small integers validated on every read:
//    p15h_b buff id 0-3, p15h_bt seconds left 0-600, p15h_cooked meals cooked 0-9999,
//    p15h_games hands dealt 0-9999, p15h_rwon hands won 0-9999, p15h_lday / p15h_lost day+1 and net loss of the tally,
//    p15h_closed 1 once the Greening closed Nessa's table for a player who had used it,
//    p15h_got bitmask of trophies granted (12 bits), p15h_p0..p15h_p11 the peg (1-12) each trophy hangs on (0 none).
//    Anything else under the prefix is ignored. Hung trophies and pegs are TRANSIENT entities rebuilt from the flags.
//  SWITCHES (localStorage 'octave.hearth15.v1', Options -> Graphics & access): Camp cooking, Cooking by hand/auto,
//  Rounds, Boss trophies. Off = the game exactly as before (no button, no peg, no extra `use` on a hearth).
//  Wrapped, never edited: loadMap, restoreGame, update, useDeco, useItem, openModal (Statistics), renderDialogue,
//  renderAccessibilityMenu, renderInventory, passHours, drainNeeds. Art: procedural stand-ins (canvas).
//  Every invented fact is marked [PROPOSED]; all player-visible text is in TX, registered through S().
// ============================================================
'use strict';

const HEARTH15 = (function () {
  const KEY = 'octave.hearth15.v1';
  const cfg = { cook: true, auto: false, rounds: true, trophies: true };
  const SWITCHES = ['cook', 'auto', 'rounds', 'trophies'];
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') for (const k of SWITCHES) if (typeof o[k] === 'boolean') cfg[k] = o[k];
    } catch (e) { /* private window or blocked storage: the defaults stand */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- balance, one table
  const B = {
    // cooking
    BEAT: 4.4, MARKS: [1.2, 2.4, 3.6], WIN: 0.55, SLOW: 1.5, WIN_SLOW: 0.85,   // seconds; Reduce motion stretches the beat x1.5
    QUAL: [0.75, 0.9, 1.0, 1.15],                                              // warmth multiplier by turns caught (0-3)
    PACK_Q: 2,                                                                 // a dish eaten from the pack counts as 2 turns
    HUNGER_RAW: 35, HUNGER_COOKED: 50,                                         // game.js eat gives 35; cooked gives more (Needs on)
    BUFF_MAX: 600, HOUR_SECS: 90,                                              // a game hour of rest or travel burns 90 s of warmth
    COMBAT_RANGE: 12,                                                          // a chasing hostile this close pauses regeneration
    // rounds
    MIN_STAKE: 2, MAX_STAKE: 30, DAY_CAP: 90, SWEEP: 2, AI_SLIP: 0.08,
    NPC_DELAY: 520, NPC_DELAY_SLOW: 260, RESOLVE: 760, RESOLVE_SLOW: 340, DEAL_STEP: 70,
    // trophies
    PEGS: 12, SCAN: 1.0,
  };

  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const flag = (name, lo, hi) => Math.floor(num(hasG() ? G.flags[name] : 0, lo, hi, lo));
  const setFlag = (name, v, lo, hi) => { if (hasG()) G.flags[name] = Math.floor(num(v, lo, hi, lo)); };
  const today = () => Math.floor(num(hasG() ? G.day : 0, 0, 99999, 0));
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const sayMsg = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  const reduced = () => !!(typeof GFX !== 'undefined' && (GFX.reduceMotion || GFX.reducedMotion));
  const worldGone = () => { if (!hasG()) return true; const f = G.flags; return !!(f.greening || f.escaped || f.part3); };
  const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
  const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------------------------------------------------------------- the text [PROPOSED] (all of it; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      cook: S('Camp cooking'), cookHint: S('cook carried food at camp fires, the Boar\'s hearth and your own: a short beat at the spit, and a small warmth from the meal.'),
      auto: S('Turning the spit'), autoHint: S('turn it yourself at the marks, or let it turn itself (never worse than turning it well).'),
      hand: S('By hand'), automatic: S('Automatic'),
      rounds: S('Rounds'), roundsHint: S('Nessa Tolliver deals Rounds at the Boar & Dulcimer: a trick-taking card game for two to thirty sovereigns.'),
      trophies: S('Boss trophies'), trophiesHint: S('bosses you have beaten leave a trophy to hang on the pegs of your house on Cooper\'s Row. Pride only.'),
      on: S('On'), off: S('Off'),
    },
    cook: {
      campTitle: S('The camp fire'),
      campBody: S('The fire is low and steady. There is room beside it for a pan, and for a spit if you have something to put on it.'),
      campSit: S('Sit by the fire for a while.'),
      hearthTitle: S('The hearth'),
      hearthBody: S('There is a corner of the grate kept free for a pan. Nobody here will mind, and nobody will watch.'),
      homeTitle: S('Your hearth'),
      homeBody: S('Banked and warm, and yours. The tempering brazier sits at one side, and the other side is a good place for a pan.'),
      homeCraft: S('Craft, repair and brew.'),
      go: S('Cook something.'), back: S('Step back.'),
      busy: S('Not with trouble this close.'),
      nothing: S('You have nothing to cook. A Run-Eel, hearth bread and moot-curd, or honey and willow-bark would do.'),
      title: S('Cooking'), pick: S('What will you cook?'),
      need: S('You need: {0}'), needSep: S(' and '),
      keys: S('1-3 choose · Space, Enter or tap turns the spit · pad: A chooses and turns, X auto-turn, B leaves · Esc steps away'),
      alt: S('A pan and a spit over a low fire, with a marker crossing a bar below them.'),
      turn: S('Turn the spit'), autoOn: S('Auto-turn: on'), autoOff: S('Auto-turn: off'), leave: S('Step away'),
      begin: S('The fire pops and settles. Turn the spit at each bright notch.'),
      now: S('Now.'), caught: S('Turned.'), missed: S('That side catches.'),
      abort: S('You take it off the heat before it is done.'),
      q3: S('Even all the way round, and it smells like a kitchen.'),
      q2: S('Mostly even. One side is darker, and none the worse for it.'),
      q1: S('It caught on one side. It will still do.'),
      q0: S('You forgot it was there. It is cooked, in the way a coal is cooked.'),
      eatHot: S('Eat it hot.'), pack: S('Wrap it for the road.'),
      packed: S('You wrap the {0} in a cloth and put it away.'),
      lost: S('Whatever you meant to cook is no longer in your pack.'),
    },
    dish: {
      eel: { name: S('Smoked Run-Eel'), desc: S('A Run-Eel split, salted and turned over a fire until the skin crackles. It is richer than raw. Restores 20 health and 30 fatigue, and leaves you smoke-warmed.'), eat: S('You eat the smoked eel with your fingers. It tastes of river and woodsmoke.') },
      round: { name: S('Toasted Round'), desc: S('Hearth bread toasted over the coals with moot-curd melted into the crumb. Restores 16 health, 10 voice and 20 fatigue, and leaves you hearth-fed.'), eat: S('The curd runs into the crumb. You eat it standing, the way the moot does.') },
      draught: { name: S('Soothing Draught'), desc: S('Honey and willow-bark steeped hot in a tin cup. Restores 18 voice and 6 health, and leaves you easy-throated.'), eat: S('Hot honey and bitter bark. Your throat unknots a little at a time.') },
    },
    recipe: {
      eel: S('Smoke the Run-Eel'), round: S('Toast the bread and curd'), draught: S('Steep honey and willow-bark'),
    },
    buff: {
      smoke: { name: S('Smoke-warmed'), desc: S('You get your breath back faster, and the road costs less hunger.') },
      hearth: { name: S('Hearth-fed'), desc: S('Cuts and bruises knit a little faster while nothing is hunting you.') },
      throat: { name: S('Easy throat'), desc: S('Your voice returns faster while nothing is hunting you.') },
      started: S('{0} ({1}). {2}'),
      replaced: S('The new meal replaces the old warmth.'),
      ended: S('The warmth of the meal has gone. It was good while it lasted.'),
      inv: S('{0}: {1} left'),
    },
    camp: {
      kaelen: [S('Salt on the edge, and then wait. A habit from Fortis. The woman who taught me weighed her salt.'), S('I once cooked for forty engineers. Nobody died. That was the entire review.')],
      lyra: [S('My mother toasted the heel of the loaf and gave it to whoever was crying. I was often at that table.'), S('That smell. Somebody is going to be kind to somebody tonight.')],
      sable: [S('Entry: a meal at a fire. I will not write down who ate what. Some things are better unfiled.'), S('Hearth smoke has no register. I find that restful.')],
    },
    rounds: {
      name: S('Nessa Tolliver'),
      greetPolite: S('Nessa Tolliver, a ferrywoman off the Flume, shuffles a worn deck with one hand. "Evening. A round of Rounds, if you have the patience?"'),
      greetNormal: S('Nessa Tolliver shuffles twenty-four cards with the ease of someone who has done it on a moving boat. "Rounds. Two to thirty sovereigns. I only cheat the river."'),
      greetBlunt: S('"Rounds, or the next seat," says Nessa, and cuts the deck.'),
      button: S('Play Rounds'),
      cap: S('Nessa squares the deck. "That is the lot for one day. The cards will keep till it has turned over."'),
      broke: S('You have nothing to stake.'),
      closedJournal: S('Nessa\'s deck, the table by the east window, the Boar: all of it is on the wrong side of the Greening now. I still lead the Cantor when I mean to be brave.'),
      title: S('Rounds'),
      rules: S('Twenty-four cards: Bells, Reeds, Glass and Roots, each a 1, 2, 3, Deacon, Factor and Cantor (low to high). Six cards each; the turned card names trumps. Follow the suit led if you can. The highest trump takes a trick, else the highest of the suit led, and the winner leads. Four tricks win the stake and six pay double; three apiece is a push. Nessa never claims the double.'),
      stake: S('Stake'), purse: S('Purse {0} · lost today {1} of {2}'),
      deal: S('Deal'), again: S('Deal again'), leave: S('Leave the table'), less: S('Less'), more: S('More'),
      pick: S('Choose a stake, then deal.'),
      keys: S('Left / Right stake ±1 · Up / Down ±5 · Enter or Space deals · in a hand: Left / Right choose, Enter plays, 1-6 plays that card · Esc leaves · pad: A plays, B leaves, D-pad chooses'),
      sure: S('Press Escape again, or choose Leave, to walk away. The stake is lost.'),
      alt: S('A table with a card game laid out: her hand of backs, the turned trump card, and the trick being played.'),
      handLabel: S('Your hand'), cardName: S('{0} of {1}'),
      suits: [S('Bells'), S('Reeds'), S('Glass'), S('Roots')],
      ranks: [S('1'), S('2'), S('3'), S('Deacon'), S('Factor'), S('Cantor')],
      nessa: S('Nessa'), you: S('You'),
      trumps: S('Trumps: {0}'), tricks: S('Tricks: you {0}, Nessa {1}'),
      lead: S('You lead. Play a card.'),
      follow: S('Nessa plays the {0}.'),
      mustFollow: S('Follow {0} if you can.'), voidSuit: S('You have no {0}: play anything.'),
      illegal: S('You must follow {0}.'),
      took: S('You take the trick with the {0}.'), lost: S('Nessa takes it with the {0}.'),
      nessaLeads: S('Nessa leads the {0}.'),
      win: S('You take {0} tricks to {1}. She pays you {2}.'),
      sweep: S('All six. Nessa whistles, shakes her head, and counts out {0}.'),
      push: S('Three and three. The stake stays where it is.'),
      lose: S('She takes {1} to your {0}. You pay {2}.'),
      forfeit: S('You leave the table in the middle of a hand. Nessa keeps the stake.'),
    },
    trophy: {
      got: S('{0} is yours to keep. It would look well on a wall.'),
      use: S('Hang it on a peg in your house on Cooper\'s Row.'),
      pegBare: S('A bare peg in the wall. Something won could hang here.'),
      pegTitle: S('A bare peg'), pegAsk: S('What will you hang here?'),
      none: S('You have nothing to hang. The bosses you beat leave something behind.'),
      more: S('Another trophy…'), leaveBare: S('Leave it bare.'),
      takeDown: S('Take it down.'), leaveHung: S('Leave it hung.'),
      hungCount: S('{0} of {1} trophies hang on the pegs.'),
      statsHead: S('Trophies'), statsHung: S('Hung'), statsPack: S('In your pack'), statsCount: S('{0} of {1} won'),
      roundsRow: S('Rounds won'),
      items: [
        { key: 'wearer', name: S('The Borrowed Collar'), desc: S('A collar of knotted cord, cut from the thing that wore the villagers\' voices at the Hedge. It is only cord now.'), hung: S('You hang the Borrowed Collar where the lamplight finds it. It stays quiet, which is the kindest thing it does.') },
        { key: 'coda', name: S('The Split Funeral-Reed'), desc: S('A mourning-reed split down its length, from the choir of the Mausoleum. It sounds nothing now, and it is the right nothing.'), hung: S('You hang the split reed. For a moment you think you hear someone count to eight, and then the room is only a room.') },
        { key: 'requiem', name: S('The Requiem\'s Chord-Plate'), desc: S('A bronze plate engraved with a chord that has one voice too many, taken from the Requiem in the Mausoleum of Chords.'), hung: S('The chord-plate goes up beside the lamp. It does not ring. You are glad of that.') },
        { key: 'aegis', name: S('The Aegis\'s Cheek-Plate'), desc: S('A brass plate from the Aegis of the Cloister, still scratched with a chalk hymn-number.'), hung: S('The cheek-plate hangs crooked and you let it. It has earned crooked.') },
        { key: 'hymn', name: S('The Hymn-Nine Slate'), desc: S('A slate board from the Cloister, chalked HYMN 9. The Aegis chimed its alto line when you touched it.'), hung: S('You hang the slate. The alto line stays in your head all evening, and nobody minds.') },
        { key: 'weaver', name: S('The Weaver\'s Shuttle'), desc: S('A bobbin-shuttle of pale wood from the loom under Whisper-Grove. A little shroud-thread is still wound on it, in no colour.'), hung: S('You hang the shuttle by its cord. It turns once and stops.') },
        { key: 'mallow', name: S('The Pressman\'s Plate'), desc: S('A brass numbering-plate off Pressman Mallow\'s press-frame. The number is worn smooth.'), hung: S('The press-plate goes on its peg. It is only a plate. You make yourself say so.') },
        { key: 'brood', name: S('The Weaverling Spindle'), desc: S('A spindle of lift-silk wound by the Brood-Mother\'s get, light as breath. Whatever the silk was carrying has been let go.'), hung: S('You hang the spindle near the window. The draught moves it and nothing else.') },
        { key: 'bosun', name: S('Teller\'s Lanyard'), desc: S('A leather lanyard with a brass tag: TELLER, HOLD. On the back, scratched with a pin: 432. The hold is open now.'), hung: S('You hang Teller\'s lanyard. He counted your hold by ear. Four hundred and thirty-two is a number you will not stop knowing.') },
        { key: 'horn', name: S('The Horn-Lens'), desc: S('A thick glass lens from the Office cutter\'s listening-horn. Hold it up and the room looks back a little late.'), hung: S('The lens catches the lamp and throws a small round of light on the floor.') },
        { key: 'deacon', name: S('The Felted Clapper'), desc: S('The clapper of the Unrung Bell, wrapped in grey felt so that it would never be heard. You have unwrapped it a little.'), hung: S('You hang the clapper on its peg, still half in its felt. It is easier to look at that way.') },
        { key: 'captain', name: S('The Captain\'s Gorget'), desc: S('A dented steel gorget stamped with Outrider-Captain Brennick\'s rank. Whoever wore it held his line.'), hung: S('The gorget goes up on its peg, facing the door, as if it were still on watch.') },
      ],
    },
  };

  // ---------------------------------------------------------------- a private, seeded random stream
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFor(day, games) { return (Math.imul((day | 0) + 13, 2654435761) ^ Math.imul((games | 0) + 5, 40503) ^ 0x526F756E) >>> 0; }

  // ================================================================ 1. CAMP COOKING
  // [PROPOSED] recipes. Inputs are existing items: the Run-Eel, hearth bread and moot-curd (js/festivals12.js), honey
  // and silver willow-bark (js/data.js, js/upgrades.js).
  const RECIPES = [
    { id: 'eel', dish: 'p15_smoked_eel', needs: [['p12_flume_eel', 1]] },
    { id: 'round', dish: 'p15_toasted_round', needs: [['p12_hearth_bread', 1], ['p12_moot_curd', 1]] },
    { id: 'draught', dish: 'p15_soothing_draught', needs: [['honey', 1], ['herb_willow', 1]] },
  ];
  // buff id 1-3; `secs` is the base warmth, the rest are per-second effects (see the table at the top)
  const BUFFS = [null,
    { id: 'smoke', secs: 150, fatRegen: 1.0, hungerKeep: 0.25 },
    { id: 'hearth', secs: 180, hpRegen: 0.10 },
    { id: 'throat', secs: 150, voiceRegen: 0.25 },
  ];
  const DISHES = {
    p15_smoked_eel: { key: 'eel', buff: 1, hp: 20, voice: 0, fat: 30, value: 10 },
    p15_toasted_round: { key: 'round', buff: 2, hp: 16, voice: 10, fat: 20, value: 9 },
    p15_soothing_draught: { key: 'draught', buff: 3, hp: 6, voice: 18, fat: 0, value: 8 },
  };
  function registerItems() {
    if (typeof ITEMS === 'undefined') return;
    for (const id in DISHES) {
      const d = DISHES[id], t = TX.dish[d.key];
      if (!ITEMS[id]) ITEMS[id] = { name: t.name, sprite: 'loot', desc: t.desc, use: 'p15_food', hp: d.hp, voice: d.voice, fat: d.fat, eat: t.eat, value: d.value };
    }
    TX.trophy.items.forEach((t, k) => {
      const id = trophyId(k);
      if (!ITEMS[id]) ITEMS[id] = { name: t.name, sprite: 'loot', desc: t.desc, use: 'p15_trophy', key: true };
    });
    try {
      if (typeof ICONS !== 'undefined' && ICONS && ICONS.TABLE) {
        Object.assign(ICONS.TABLE, {
          p15_smoked_eel: ['eel', {}], p15_toasted_round: ['pebble', {}], p15_soothing_draught: ['jar', { liq: '#d9a441' }],
          p15_t_wearer: ['gem', { col: '#7e8a6a' }], p15_t_coda: ['herb', { v: 'reed' }],
          p15_t_requiem: ['book', { cov: '#8a6a2e', band: '#e3bc4c' }], p15_t_aegis: ['shield', { v: 'buckler', m: '#c9a24a' }],
          p15_t_hymn: ['scroll', { paper: '#2f3a3a', ink: '#e8e0cc' }], p15_t_weaver: ['spool', {}],
          p15_t_mallow: ['press', {}], p15_t_brood: ['silkbolt', {}], p15_t_bosun: ['bigkey', {}],
          p15_t_horn: ['shard', { col: '#9fe0e8' }], p15_t_deacon: ['cylinder', {}], p15_t_captain: ['helm', { v: 'kettle', m: '#8e9a9e' }],
        });
      }
    } catch (e) { /* the fallback icons will do */ }
  }

  // ---- what the pack holds
  const count = (id) => { try { return hasG() && G.player ? G.count(id) : 0; } catch (e) { return 0; } };
  function recipeState(r) {
    const missing = [];
    for (const [id, n] of r.needs) if (count(id) < n) missing.push((typeof ITEMS !== 'undefined' && ITEMS[id] ? ITEMS[id].name : id) + (n > 1 ? ' ×' + n : ''));
    return { ok: !missing.length, missing };
  }
  const anyRecipe = () => RECIPES.some((r) => recipeState(r).ok);

  // ---- the warmth (one at a time)
  const warm = { rem: 0 };                        // seconds left, kept as a float between whole-second writes
  const buffId = () => flag('p15h_b', 0, 3);
  function loadWarm() { warm.rem = buffId() ? flag('p15h_bt', 0, B.BUFF_MAX) : 0; if (!warm.rem && buffId()) setFlag('p15h_b', 0, 0, 3); }
  function writeWarm() { setFlag('p15h_bt', Math.ceil(warm.rem), 0, B.BUFF_MAX); }
  function startBuff(id, mult) {
    const bf = BUFFS[id]; if (!bf) return null;
    const had = buffId();
    setFlag('p15h_b', id, 0, 3);
    warm.rem = Math.min(B.BUFF_MAX, Math.max(1, bf.secs * num(mult, 0.5, 2, 1)));
    writeWarm();
    return { id, secs: Math.ceil(warm.rem), replaced: had !== 0 };
  }
  function endBuff(quiet) {
    if (!buffId()) return;
    setFlag('p15h_b', 0, 0, 3); setFlag('p15h_bt', 0, 0, B.BUFF_MAX); warm.rem = 0;
    if (!quiet) sayMsg(TX.buff.ended, '', 4200);
  }
  const buffKey = () => (BUFFS[buffId()] ? BUFFS[buffId()].id : null);
  // a hostile chasing close by: regeneration waits (no healing in the middle of a fight)
  function inCombat() {
    if (!hasG() || !G.ents || typeof Engine === 'undefined') return false;
    const c = Engine.cam, R2 = B.COMBAT_RANGE * B.COMBAT_RANGE;
    for (const e of G.ents) {
      if (!e || e.kind !== 'enemy' || e.dead || e.hidden || e.passive || e.state !== 'chase') continue;
      const dx = e.x - c.x, dy = e.y - c.y; if (dx * dx + dy * dy < R2) return true;
    }
    return false;
  }
  // per-frame: tick the warmth down and apply its small per-second effect
  function tickWarm(dt) {
    const id = buffId(); if (!id || !hasG() || !G.player) return;
    if (!(warm.rem > 0)) { loadWarm(); if (!(warm.rem > 0)) { endBuff(true); return; } }
    const bf = BUFFS[id], p = G.player;
    dt = num(dt, 0, 0.1, 0);
    warm.rem -= dt;
    if (warm.rem <= 0) { warm.rem = 0; endBuff(false); return; }
    if (!inCombat()) {
      if (bf.hpRegen) p.hp = Math.min(p.hpMax, p.hp + bf.hpRegen * dt);
      if (bf.voiceRegen) p.voice = Math.min(p.voiceMax, p.voice + bf.voiceRegen * dt);
      if (bf.fatRegen) { const cap = typeof fatCap === 'function' ? fatCap() : p.fatMax; p.fat = Math.min(cap, p.fat + bf.fatRegen * dt); }
    }
    if (Math.ceil(warm.rem) !== flag('p15h_bt', 0, B.BUFF_MAX)) writeWarm();
  }
  function warmLine() { const bf = buffKey(); return bf && warm.rem > 0 ? fmt(TX.buff.inv, TX.buff[bf].name, mmss(warm.rem)) : ''; }

  // ---- eating a dish
  const needsLive = () => { try { return typeof needsOn === 'function' && needsOn(); } catch (e) { return false; } };
  // apply a dish: the immediate numbers, the hunger refill (Needs on), and the warmth. `q` = turns caught 0-3.
  function eatDish(id, q) {
    const d = DISHES[id], p = hasG() ? G.player : null; if (!d || !p) return null;
    q = Math.floor(num(q, 0, 3, B.PACK_Q));
    p.hp = Math.min(p.hpMax, p.hp + d.hp);
    p.voice = Math.min(p.voiceMax, p.voice + d.voice);
    p.fat = Math.min(p.fatMax, p.fat + d.fat);
    if (needsLive()) p.hunger = Math.min(100, Math.max(0, (Number(p.hunger) || 0) + B.HUNGER_COOKED));
    const b = startBuff(d.buff, B.QUAL[q]);
    const bk = BUFFS[d.buff].id;
    sayMsg(TX.dish[d.key].eat, 'good', 4200);
    if (b) sayMsg((b.replaced ? TX.buff.replaced + ' ' : '') + fmt(TX.buff.started, TX.buff[bk].name, mmss(warm.rem), TX.buff[bk].desc), 'good', 6200);
    return b;
  }

  // ---- the beat at the spit (a pure, steppable session: the panel and the tests share it)
  function makeCookSession(recipe, opts) {
    opts = opts || {};
    const slow = opts.slow != null ? !!opts.slow : reduced(), k = slow ? B.SLOW : 1;
    const s = {
      recipe, t: 0, slow, auto: opts.auto != null ? !!opts.auto : cfg.auto,
      marks: B.MARKS.map((t) => ({ t: t * k, state: 'wait' })), win: slow ? B.WIN_SLOW : B.WIN, end: B.BEAT * k, turns: 0, presses: 0, done: false, spin: 0, events: [],
    };
    // one press: the nearest unclaimed mark inside the window is turned; extra presses cost nothing
    s.press = function () {
      if (s.done) return null;
      s.presses++; s.spin += 1;
      let best = null, bd = 1e9;
      for (const m of s.marks) { if (m.state !== 'wait') continue; const d = Math.abs(m.t - s.t); if (d <= s.win && d < bd) { best = m; bd = d; } }
      if (best) { best.state = 'hit'; s.turns++; s.events.push('hit'); return { hit: true }; }
      return { hit: false };
    };
    s.step = function (dt) {
      if (s.done) return;
      s.t += num(dt, 0, 1, 0);
      for (const m of s.marks) {
        if (m.state !== 'wait') continue;
        if (s.auto && s.t >= m.t) { m.state = 'hit'; s.turns++; s.spin += 1; s.events.push('hit'); }
        else if (s.t - m.t > s.win) { m.state = 'miss'; s.events.push('miss'); }
      }
      if (s.t >= s.end) s.done = true;
    };
    s.nearMark = () => s.marks.find((m) => m.state === 'wait' && Math.abs(m.t - s.t) <= s.win) || null;
    s.quality = () => s.turns;
    return s;
  }
  // finish a cook: take the inputs, hand back the dish id (null if the pack changed under us)
  function finishCook(recipe) {
    if (!hasG() || !G.player) return null;
    if (!recipeState(recipe).ok) return null;
    for (const [id, n] of recipe.needs) for (let i = 0; i < n; i++) G.take(id);
    setFlag('p15h_cooked', flag('p15h_cooked', 0, 9999) + 1, 0, 9999);
    return recipe.dish;
  }
  // the dish out of the fire: eat it hot (quality counts) or put it in the pack (as a 2-turn dish)
  function serve(dish, q, eatNow) {
    if (eatNow) return eatDish(dish, q);
    G.give(dish); return null;
  }
  const qualityLine = (q) => TX.cook['q' + Math.floor(num(q, 0, 3, 2))];

  // ---- camp company: one quiet line from whoever is with you
  function companionLine() {
    try {
      const P = typeof G !== 'undefined' ? G.party : null;
      if (!P || !P.id || P.map !== G.mapId || typeof partySay !== 'function') return null;
      const pool = TX.camp[P.id]; if (!pool) return null;
      const line = pool[(flag('p15h_cooked', 0, 9999) + today()) % pool.length];
      setTimeout(() => { try { partySay(line); } catch (e) { /* the line is a bonus */ } }, 1200);
      return line;
    } catch (e) { return null; }
  }

  // ---- sound (procedural, on Audio_'s own graph; nothing before the first gesture)
  let noiseBuf = null;
  const sfxOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  const cosRnd = (() => { let s = 0x5EED15; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; })();   // cosmetic stream
  function noise() {
    const ctx = Audio_.ctx;
    if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = cosRnd() * 2 - 1;
    }
    return noiseBuf;
  }
  function sizzle(vol, dur) {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noise(); bp.type = 'bandpass'; bp.frequency.value = 3400 + cosRnd() * 1800; bp.Q.value = 0.9;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.4));
      src.connect(bp); bp.connect(g); g.connect(Audio_.sfxBus); src.start(t, cosRnd() * 0.2, (dur || 0.4) + 0.05);
    } catch (e) { /* no sound is not an error */ }
  }
  function thup() {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.09);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(Audio_.sfxBus); o.start(t); o.stop(t + 0.14);
    } catch (e) { /* ignore */ }
  }
  function chime(freq) {
    if (!sfxOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, g = ctx.createGain(), o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = freq || 440;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(Audio_.sfxBus); o.start(t); o.stop(t + 0.7);
    } catch (e) { /* ignore */ }
  }
  function padNow() {
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ }
    return null;
  }

  // ---- the cooking panel
  let cookUi = null;
  function openCook(site) {
    if (cookUi || !hasG() || !G.player) return null;
    if (G.state === 'play') G.state = 'panel';
    const T = TX.cook;
    openModal(`<h2></h2>
      <div class="p15c"><canvas id="p15c-cv" width="480" height="150" role="img"></canvas>
      <p class="p15c-say" id="p15c-say" role="status" aria-live="polite"></p>
      <div class="p15c-list" id="p15c-list"></div>
      <div class="btns p15c-btns"><button class="dfbtn small" id="p15c-turn" type="button" hidden></button><button class="dfbtn small" id="p15c-auto" type="button"></button><button class="dfbtn small" id="p15c-leave" type="button"></button></div>
      <p class="muted p15c-keys" id="p15c-keys"></p></div>`, 'p15h_cook');
    const ui = cookUi = { site: site || 'camp', phase: 'pick', s: null, recipe: null, dish: null, q: 0, closed: false, token: G.panelToken, padPrev: {}, say: '', last: 0, nextSizzle: 0 };
    const q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('p15c-cv').setAttribute('aria-label', T.alt);
    q('p15c-turn').textContent = T.turn; q('p15c-leave').textContent = T.leave; q('p15c-keys').textContent = T.keys;
    const autoBtn = q('p15c-auto');
    const syncAuto = () => { autoBtn.textContent = cfg.auto ? T.autoOn : T.autoOff; autoBtn.setAttribute('aria-pressed', cfg.auto ? 'true' : 'false'); autoBtn.classList.toggle('sel', cfg.auto); };
    syncAuto();
    const cv = q('p15c-cv'), cx = cv.getContext('2d');
    const say = (t) => { ui.say = t; const e = q('p15c-say'); if (e) e.textContent = t; };
    ui.say_ = say;
    // the fire, the spit and the bar. Reduce motion keeps the flames still; the marker still has to move.
    const FIRE = [[200, 118, 26, 46], [240, 120, 32, 58], [282, 118, 24, 42], [222, 112, 20, 34], [262, 112, 20, 36]];
    function draw() {
      if (!cv.isConnected) return;
      const W = cv.width, H = cv.height, now = performance.now() / 1000, s = ui.s, still = reduced();
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a130c'); g.addColorStop(1, '#0d0906'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.fillStyle = '#2a2018'; cx.fillRect(0, 128, W, 22);                                  // the hearth-stone
      cx.fillStyle = '#3a2c1f'; for (let i = 0; i < 9; i++) cx.fillRect(14 + i * 52, 130, 46, 8);
      // flames: three layers of teardrops; a slow sway unless motion is reduced
      FIRE.forEach(([x, y, w, h], i) => {
        const sway = still ? 0 : Math.sin(now * 5 + i * 1.7) * 3, hh = h * (still ? 1 : 0.9 + 0.12 * Math.sin(now * 7 + i));
        for (const [col, k] of [['#b8431a', 1], ['#e8892a', 0.74], ['#ffd27a', 0.46]]) {
          cx.fillStyle = col; cx.beginPath(); cx.moveTo(x - w * k / 2, y + 12); cx.quadraticCurveTo(x - w * k / 2 + sway, y - hh * k * 0.6, x + sway, y - hh * k); cx.quadraticCurveTo(x + w * k / 2 + sway, y - hh * k * 0.6, x + w * k / 2, y + 12); cx.closePath(); cx.fill();
        }
      });
      // the spit: an iron rod across two forks, the food turning on it
      cx.strokeStyle = '#6a625a'; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(150, 60); cx.lineTo(150, 128); cx.moveTo(330, 60); cx.lineTo(330, 128); cx.stroke();
      cx.beginPath(); cx.moveTo(140, 62); cx.lineTo(150, 72); cx.lineTo(160, 62); cx.moveTo(320, 62); cx.lineTo(330, 72); cx.lineTo(340, 62); cx.stroke();
      cx.strokeStyle = '#aaa194'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(130, 72); cx.lineTo(350, 72); cx.stroke();
      const turned = s ? s.spin : 0, rot = turned * 1.9 + (s && !still ? Math.min(0.5, (s.t % 1) * 0.1) : 0);
      const rid = ui.recipe ? ui.recipe.id : 'eel';
      cx.save(); cx.translate(240, 72); cx.rotate(rot);
      if (rid === 'eel') { cx.fillStyle = '#7a8a5a'; cx.beginPath(); cx.ellipse(0, 0, 66, 12, 0, 0, 7); cx.fill(); cx.fillStyle = '#4a5a3a'; cx.fillRect(-60, -3, 120, 5); cx.fillStyle = '#c2b484'; cx.fillRect(-60, 4, 120, 4); }
      else if (rid === 'round') { cx.fillStyle = '#c9a15a'; cx.beginPath(); cx.arc(0, 0, 26, 0, 7); cx.fill(); cx.fillStyle = '#8a5a26'; cx.beginPath(); cx.arc(0, 0, 26, 0.2, 2.6); cx.lineTo(0, 0); cx.fill(); cx.fillStyle = '#e8d9a8'; cx.beginPath(); cx.arc(-6, -6, 8, 0, 7); cx.fill(); }
      else { cx.fillStyle = '#7a6a58'; cx.fillRect(-26, -16, 52, 32); cx.fillStyle = '#d9a441'; cx.fillRect(-22, -12, 44, 12); cx.strokeStyle = '#7a6a58'; cx.lineWidth = 4; cx.beginPath(); cx.arc(30, 0, 12, -1.4, 1.4); cx.stroke(); }
      cx.restore();
      // sparks (still: none)
      if (!still) { for (let i = 0; i < 6; i++) { const t = (now * 0.7 + i * 0.37) % 1; cx.fillStyle = 'rgba(255,210,120,' + (1 - t) + ')'; cx.fillRect(210 + i * 14 + Math.sin(now * 3 + i) * 6, 100 - t * 70, 2, 2); } }
      // the bar: a marker crosses it; the notches are the marks
      const bx = 40, bw = W - 80, by = 18;
      cx.fillStyle = 'rgba(232,217,181,.14)'; cx.fillRect(bx, by, bw, 10);
      if (s) {
        for (const m of s.marks) {
          const x = bx + bw * (m.t / s.end), live = m.state === 'wait' && Math.abs(m.t - s.t) <= s.win;
          cx.fillStyle = m.state === 'hit' ? '#9fd6a0' : m.state === 'miss' ? '#7a6a5a' : live ? '#fff1c8' : '#d9a441';
          cx.fillRect(x - 5, by - 6, 10, 22);
          if (m.state === 'wait') { cx.strokeStyle = 'rgba(217,164,65,.45)'; cx.lineWidth = 2; cx.strokeRect(bx + bw * ((m.t - s.win) / s.end), by - 1, bw * (2 * s.win / s.end), 12); }
        }
        cx.fillStyle = '#e8d9b5'; cx.fillRect(bx + bw * Math.min(1, s.t / s.end) - 2, by - 8, 4, 26);
      }
      cx.fillStyle = '#e8d9b5'; cx.font = '15px "Alegreya SC", Georgia, serif'; cx.textAlign = 'right';
      if (s) cx.fillText(s.turns + ' / ' + s.marks.length, W - 14, 52);
      cx.textAlign = 'left';
    }
    ui.draw = draw;
    const list = q('p15c-list');
    function showPick() {
      ui.phase = 'pick'; ui.s = null; ui.recipe = null; list.textContent = ''; list.hidden = false; q('p15c-turn').hidden = true; autoBtn.hidden = false;
      say(T.pick);
      RECIPES.forEach((r, i) => {
        const st = recipeState(r), b = el('button', { class: 'dfbtn', type: 'button', 'data-recipe': r.id }, (i + 1) + '. ' + TX.recipe[r.id]);
        b.appendChild(el('small', { class: 'muted' }, ' ' + (st.ok ? TX.dish[DISHES[r.dish].key].name : fmt(T.need, st.missing.join(TX.cook.needSep)))));
        if (!st.ok) { b.disabled = true; b.title = fmt(T.need, st.missing.join(TX.cook.needSep)); }
        b.onclick = () => beginBeat(r);
        list.appendChild(b);
      });
      const first = list.querySelector('button:not(:disabled)'); if (first) first.focus({ preventScroll: true }); else q('p15c-leave').focus({ preventScroll: true });
    }
    function beginBeat(r) {
      if (ui.phase !== 'pick' || !recipeState(r).ok) return;
      ui.recipe = r; ui.phase = 'beat'; ui.s = makeCookSession(r, { auto: cfg.auto }); list.hidden = true; q('p15c-turn').hidden = false; q('p15c-turn').focus({ preventScroll: true });
      ui.last = performance.now(); ui.nextSizzle = 0; say(T.begin); sizzle(0.08, 0.6);
      ui.raf = requestAnimationFrame(loop);
    }
    function turn() {
      const s = ui.s; if (ui.phase !== 'beat' || !s || s.done) return;
      if (s.auto) return;                                   // it turns itself
      const r = s.press(); thup(); sizzle(0.05, 0.25);
      if (r && r.hit) say(T.caught);
    }
    ui.turn = turn;
    function afterBeat() {
      const s = ui.s; ui.phase = 'done'; q('p15c-turn').hidden = true; autoBtn.hidden = true;
      const dish = finishCook(ui.recipe);
      if (!dish) { say(T.lost); showPick(); return; }
      ui.dish = dish; ui.q = s.quality();
      chime(523.25);
      say(qualityLine(ui.q) + ' ' + TX.dish[DISHES[dish].key].name + '.');
      list.textContent = ''; list.hidden = false;
      const hot = el('button', { class: 'dfbtn', type: 'button', id: 'p15c-eat' }, '1. ' + T.eatHot), wrap = el('button', { class: 'dfbtn', type: 'button', id: 'p15c-pack' }, '2. ' + T.pack);
      hot.onclick = () => { if (ui.phase !== 'done') return; serve(ui.dish, ui.q, true); companionLine(); ui.phase = 'over'; close(); };
      wrap.onclick = () => { if (ui.phase !== 'done') return; serve(ui.dish, ui.q, false); sayMsg(fmt(T.packed, TX.dish[DISHES[ui.dish].key].name), '', 3500); companionLine(); ui.phase = 'over'; close(); };
      list.append(hot, wrap); hot.focus({ preventScroll: true });
    }
    ui.afterBeat = afterBeat;
    function loop(now) {
      if (ui.closed) return;
      if (G.panelToken !== ui.token || G.openPanel !== 'p15h_cook') { close(); return; }
      const dt = Math.min(0.05, Math.max(0, (now - ui.last) / 1000)); ui.last = now;
      try { pollPad(); } catch (e) { /* no pad */ }
      const s = ui.s;
      if (ui.phase === 'beat' && s) {
        const before = s.events.length;
        s.step(dt);
        for (let i = before; i < s.events.length; i++) { if (s.events[i] === 'miss') say(T.missed); else if (s.auto) { say(T.caught); thup(); } }
        if (!s.auto) { const nm = s.nearMark(); if (nm && ui.say !== T.now && ui.say !== T.caught) say(T.now); else if (!nm && ui.say === T.now) say(''); }
        ui.nextSizzle -= dt; if (ui.nextSizzle <= 0) { sizzle(0.04, 0.3); ui.nextSizzle = 0.8 + cosRnd() * 0.6; }
        if (s.done) afterBeat();
      }
      draw();
      ui.raf = requestAnimationFrame(loop);
    }
    function close() {
      if (ui.closed) return; ui.closed = true;
      cancelAnimationFrame(ui.raf); cancelAnimationFrame(ui.poll);
      window.removeEventListener('keydown', onKey, true);
      if (G.panelToken === ui.token && G.openPanel === 'p15h_cook') closeModal();
      if (G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {}; cookUi = null;
    }
    ui.close = close;
    const stepAway = () => {
      if (ui.phase === 'done') { q('p15c-pack').click(); return; }       // the dish is made: Esc wraps it, never wastes it
      if (ui.phase === 'beat') { say(T.abort); ui.phase = 'pick'; cancelAnimationFrame(ui.raf); showPick(); ui.raf = requestAnimationFrame(loop); return; }
      close();
    };
    ui.stepAway = stepAway;
    q('p15c-leave').onclick = stepAway;
    q('p15c-turn').onclick = turn;
    autoBtn.onclick = () => { cfg.auto = !cfg.auto; saveCfg(); syncAuto(); if (ui.s && ui.phase === 'beat') ui.s.auto = cfg.auto; };
    // pointer on the canvas turns the spit too (a big touch target)
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); turn(); });
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      const used = ['1', '2', '3', 'enter', ' ', 'e', 't', 'a', 'escape', 'arrowup', 'arrowdown', 'tab'].includes(k);
      if (!used || k === 'tab') return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      if (ev.repeat) return;
      if (k === 'escape') { stepAway(); return; }
      if (ui.phase === 'beat') { if (k === 'enter' || k === ' ' || k === 'e' || k === 't') turn(); else if (k === 'a') autoBtn.click(); return; }
      if (ui.phase === 'pick') {
        if (k >= '1' && k <= '3') { const b = list.children[+k - 1]; if (b && !b.disabled) b.click(); }
        else if (k === 'a') autoBtn.click();
        else if (k === 'enter' || k === ' ' || k === 'e') { const f = document.activeElement; if (f && list.contains(f) && !f.disabled) f.click(); }
        else if (k === 'arrowup' || k === 'arrowdown') moveFocus(k === 'arrowdown' ? 1 : -1);
        return;
      }
      if (ui.phase === 'done') {
        if (k === '1' || k === 'e') q('p15c-eat').click(); else if (k === '2') q('p15c-pack').click();
        else if (k === 'enter' || k === ' ') { const f = document.activeElement; if (f && list.contains(f)) f.click(); }
        else if (k === 'arrowup' || k === 'arrowdown') moveFocus(k === 'arrowdown' ? 1 : -1);
      }
    }
    function moveFocus(d) {
      const bs = Array.from(list.querySelectorAll('button:not(:disabled)')); if (!bs.length) return;
      const i = Math.max(0, bs.indexOf(document.activeElement)); bs[(i + d + bs.length) % bs.length].focus({ preventScroll: true });
    }
    window.addEventListener('keydown', onKey, true);
    function pollPad() {
      const g = padNow(); if (!g) return;
      const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed); const was = ui.padPrev[i]; ui.padPrev[i] = now; return now && !was; };
      if (edge(0)) { if (ui.phase === 'beat') turn(); else { const f = document.activeElement; if (f && list.contains(f) && !f.disabled) f.click(); } }
      if (edge(2)) autoBtn.click();
      if (edge(1)) stepAway();
      if (edge(12)) moveFocus(-1); if (edge(13)) moveFocus(1);
    }
    // polling continues while no beat runs (pick / done phases) so the pad can choose
    const idlePoll = () => { if (ui.closed) return; if (G.panelToken !== ui.token || G.openPanel !== 'p15h_cook') { close(); return; } if (ui.phase !== 'beat') { try { pollPad(); } catch (e) { /* none */ } draw(); } ui.poll = requestAnimationFrame(idlePoll); };
    ui.poll = requestAnimationFrame(idlePoll);
    showPick();
    draw();
    return ui;
  }

  // ---- where you can cook, and the menu at each place
  const HEARTH_MAPS = ['tavern', 'cooper_house'];           // inn and home; other hearths belong to other people
  function setHearthUse() {
    if (!hasG() || !G.maps) return;
    for (const id of HEARTH_MAPS) {
      const m = G.maps[id]; if (!m || !Array.isArray(m.entities)) continue;
      for (const e of m.entities) {
        if (!e || e.kind !== 'deco' || e.sprite !== 'hearth') continue;
        if (cfg.cook) { if (!e.use) { e.use = 'p15_cook'; e._p15h = 'hearth'; } }
        else if (e.use === 'p15_cook' && e._p15h === 'hearth') { delete e.use; delete e._p15h; }
      }
    }
  }
  // the menu: returns true when it handled the use. `orig` is the wrapped useDeco for the choices it keeps.
  function openSite(e, kind, orig) {
    if (!cfg.cook || !hasG() || G.state !== 'play') return false;
    const T = TX.cook;
    if (inCombat()) { if (kind === 'camp') return false; sayMsg(T.busy, 'warn', 2800); return true; }
    const go = { t: T.go, f: () => { if (!anyRecipe()) { sayMsg(T.nothing, '', 5200); return; } openCook(kind); } };
    if (typeof showEvent !== 'function') return false;
    if (kind === 'camp') {
      showEvent(T.campTitle, T.campBody, [{ t: T.campSit, f: () => { try { orig.call(null, e); } catch (err) { /* the original rest */ } } }, go, { t: T.back, f: null }]);
    } else if (kind === 'home') {
      showEvent(T.homeTitle, T.homeBody, [go, { t: T.homeCraft, f: () => { try { orig.call(null, e); } catch (err) { /* the original crafting */ } } }, { t: T.back, f: null }]);
    } else {
      showEvent(T.hearthTitle, T.hearthBody, [go, { t: T.back, f: null }]);
    }
    return true;
  }

  // ================================================================ 2. ROUNDS (the rules, pure)
  const SUITS = TX.rounds.suits, RANKS = TX.rounds.ranks;
  const suitOf = (c) => (c / 6) | 0, rankOf = (c) => (c % 6) + 1;
  const otherOf = (w) => (w === 'me' ? 'npc' : 'me');
  const cardName = (c) => fmt(TX.rounds.cardName, RANKS[rankOf(c) - 1], SUITS[suitOf(c)]);
  const tricksOf = (r, w) => r.tricks[w];

  function newHand(seed, stake, opts) {
    opts = opts || {};
    const rng = mulberry32(seed >>> 0), deck = [];
    for (let i = 0; i < 24; i++) deck.push(i);
    for (let i = 23; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    const srt = (h) => h.sort((a, b) => a - b);
    const r = {
      seed: seed >>> 0, stake: Math.floor(num(stake, B.MIN_STAKE, B.MAX_STAKE, B.MIN_STAKE)),
      hands: { me: srt(deck.slice(0, 6)), npc: srt(deck.slice(6, 12)) }, turned: deck[12], trump: suitOf(deck[12]),
      leader: opts.leader === 'npc' ? 'npc' : 'me', turn: null, trick: [], tricks: { me: 0, npc: 0 }, played: [], log: [], last: null,
      phase: 'play', result: null, delta: 0, settled: false, aiRng: mulberry32((seed ^ 0xA5A5A5A5) >>> 0),
    };
    r.turn = r.leader;
    return r;
  }
  function legalCards(r, who) {
    const hand = r.hands[who]; if (!r.trick.length) return hand.slice();
    const led = suitOf(r.trick[0].card), follow = hand.filter((c) => suitOf(c) === led);
    return follow.length ? follow : hand.slice();
  }
  // the winner of a two-card trick: highest trump, else the highest of the suit led
  function trickWinner(trick, trump) {
    const a = trick[0], b = trick[1], sa = suitOf(a.card), sb = suitOf(b.card);
    if (sa === sb) return rankOf(b.card) > rankOf(a.card) ? b.who : a.who;
    if (sb === trump) return b.who;
    return a.who;                                             // a trump led, or the other card is neither led suit nor trump
  }
  function finishHand(r) {
    r.phase = 'done'; r.turn = null;
    const m = r.tricks.me;
    r.result = m === 6 ? 'sweep' : m >= 4 ? 'win' : m === 3 ? 'push' : 'lose';
    r.delta = r.result === 'sweep' ? r.stake * B.SWEEP : r.result === 'win' ? r.stake : r.result === 'push' ? 0 : -r.stake;
    return r;
  }
  function play(r, who, card) {
    if (!r || r.phase !== 'play' || r.turn !== who) return null;
    const hand = r.hands[who], i = hand.indexOf(card);
    if (i < 0 || !legalCards(r, who).includes(card)) return null;
    hand.splice(i, 1); r.trick.push({ who, card }); r.played.push(card);
    if (r.trick.length === 1) { r.turn = otherOf(who); return { resolved: false, card }; }
    const w = trickWinner(r.trick, r.trump);
    r.tricks[w]++; r.last = { cards: r.trick.map((t) => ({ who: t.who, card: t.card })), winner: w }; r.log.push(r.last);
    r.trick = []; r.leader = w; r.turn = w;
    if (r.log.length >= 6) finishHand(r);
    return { resolved: true, winner: w, card };
  }
  // The NPC (and the tests' auto-player): it reads ITS OWN hand, the cards played, the turned card and the other
  // hand's SIZE. It never reads the other hand. One slip draw and one pick draw per move, always, so the stream
  // is the same however the branches fall.
  function aiChoose(r, who) {
    who = who || 'npc';
    const legal = legalCards(r, who), opp = otherOf(who);
    const slip = r.aiRng(), pick = r.aiRng();
    if (legal.length === 1) return legal[0];
    if (slip < B.AI_SLIP) return legal[Math.floor(pick * legal.length)];
    const val = (c) => rankOf(c) + (suitOf(c) === r.trump ? 10 : 0);
    const lowest = (L) => L.reduce((a, b) => (val(b) < val(a) ? b : a));
    if (r.trick.length) {
      const lead = r.trick[0].card;
      const wins = legal.filter((c) => trickWinner([{ who: opp, card: lead }, { who, card: c }], r.trump) === who);
      return wins.length ? lowest(wins) : lowest(legal);
    }
    const known = new Set([...r.hands[who], ...r.played, r.turned]);
    const unseen = []; for (let c = 0; c < 24; c++) if (!known.has(c)) unseen.push(c);
    const U = Math.max(1, unseen.length), pIn = Math.min(1, r.hands[opp].length / U);
    let best = null, bp = 2;
    for (const c of legal) {
      let H = 0, T = 0;
      for (const u of unseen) { if (suitOf(u) === suitOf(c) && rankOf(u) > rankOf(c)) H++; else if (suitOf(c) !== r.trump && suitOf(u) === r.trump) T++; }
      const pBeat = 1 - Math.pow(1 - pIn, H) * Math.pow(1 - 0.5 * pIn, T);
      if (pBeat < bp - 1e-9 || (Math.abs(pBeat - bp) <= 1e-9 && val(c) < val(best))) { bp = pBeat; best = c; }
    }
    return best;
  }
  // one whole hand without any screen: the tests and anything else that wants a result
  function playAuto(seed, stake, opts) {
    opts = opts || {};
    const r = newHand(seed, stake, opts);
    let guard = 0;
    while (r.phase === 'play' && guard++ < 40) { const who = r.turn; play(r, who, who === 'npc' || !opts.mePick ? aiChoose(r, who) : opts.mePick(r)); }
    return r;
  }
  function lostToday() { return flag('p15h_lday', 0, 100000) === today() + 1 ? flag('p15h_lost', 0, 9999) : 0; }
  function maxStake() {
    const gold = Math.floor(num(hasG() && G.player ? G.player.gold : 0, 0, 1e9, 0));
    const m = Math.max(0, Math.min(B.MAX_STAKE, gold, B.DAY_CAP - lostToday()));
    return m < B.MIN_STAKE ? 0 : m;
  }
  // settle a finished hand against the purse and the day's tally (the only place gold moves)
  function settle(r) {
    const p = G.player; if (!p || r.settled) return 0;
    const gold = Math.floor(num(p.gold, 0, 1e9, 0));
    let delta = r.delta;
    if (delta < 0) delta = -Math.min(-delta, gold);           // never below 0, whatever happened since the deal
    p.gold = gold + delta;
    const lost = lostToday();
    setFlag('p15h_lday', today() + 1, 0, 100000);
    setFlag('p15h_lost', Math.max(0, lost - delta), 0, 9999);
    if (r.result === 'win' || r.result === 'sweep') setFlag('p15h_rwon', flag('p15h_rwon', 0, 9999) + 1, 0, 9999);
    r.settled = true; r.paid = delta;
    return delta;
  }
  function describeHand(r) {
    const T = TX.rounds, m = r.tricks.me, n = r.tricks.npc, s = r.stake;
    switch (r.result) {
      case 'sweep': return fmt(T.sweep, s * B.SWEEP);
      case 'win': return fmt(T.win, m, n, s);
      case 'push': return T.push;
      case 'lose': return fmt(T.lose, m, n, s);
      default: return '';
    }
  }

  // ---- procedural cards (stand-in): a suit mark, a rank, a figure for the courts
  const SUIT_COL = ['#c9902e', '#5f8a4a', '#3f97a2', '#8a4a2e'];
  function drawSuit(c, s, cx, cy, r, col) {
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = Math.max(1, r * 0.2); c.lineCap = 'round';
    if (s === 0) {                                             // Bells: a flared bell and its clapper
      c.beginPath(); c.moveTo(cx - r * 0.95, cy + r * 0.55); c.quadraticCurveTo(cx - r * 0.85, cy - r * 0.95, cx, cy - r); c.quadraticCurveTo(cx + r * 0.85, cy - r * 0.95, cx + r * 0.95, cy + r * 0.55); c.closePath(); c.fill();
      c.beginPath(); c.arc(cx, cy + r * 0.82, r * 0.22, 0, 7); c.fill();
    } else if (s === 1) {                                      // Reeds: three stalks with slotted heads
      for (let i = -1; i <= 1; i++) {
        const x0 = cx + i * r * 0.62, x1 = cx + i * r * 0.5, ty = cy - r * (0.7 - Math.abs(i) * 0.25);
        c.beginPath(); c.moveTo(x0, cy + r); c.lineTo(x1, ty + r * 0.2); c.stroke();
        c.beginPath(); c.ellipse(x1, ty, r * 0.17, r * 0.36, 0, 0, 7); c.fill();
      }
    } else if (s === 2) {                                      // Glass: a faceted shard
      c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx + r * 0.72, cy - r * 0.05); c.lineTo(cx, cy + r); c.lineTo(cx - r * 0.72, cy - r * 0.05); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(1, r * 0.1); c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r); c.moveTo(cx - r * 0.72, cy - r * 0.05); c.lineTo(cx + r * 0.72, cy - r * 0.05); c.stroke();
    } else {                                                   // Roots: a trunk forking into three
      c.beginPath(); c.moveTo(cx, cy - r); c.lineTo(cx, cy + r * 0.05); c.stroke();
      c.beginPath(); c.moveTo(cx, cy + r * 0.05); c.lineTo(cx - r * 0.8, cy + r); c.moveTo(cx, cy + r * 0.05); c.lineTo(cx + r * 0.8, cy + r); c.moveTo(cx, cy + r * 0.05); c.lineTo(cx, cy + r); c.stroke();
      c.beginPath(); c.moveTo(cx, cy - r * 0.35); c.lineTo(cx - r * 0.55, cy - r * 0.75); c.moveTo(cx, cy - r * 0.35); c.lineTo(cx + r * 0.55, cy - r * 0.75); c.stroke();
    }
  }
  function drawBack(c, x, y, w, h) {
    c.fillStyle = '#26374a'; c.fillRect(x, y, w, h);
    c.strokeStyle = '#d9a441'; c.lineWidth = Math.max(1, w * 0.04); c.strokeRect(x + w * 0.08, y + w * 0.08, w * 0.84, h - w * 0.16);
    c.strokeStyle = 'rgba(217,164,65,.55)';
    for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(x + w / 2, y + h / 2, w * 0.1 * i, 0, 7); c.stroke(); }
    c.strokeStyle = '#0d1520'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  function drawCard(c, x, y, w, h, card, o) {
    o = o || {};
    if (card == null) { drawBack(c, x, y, w, h); return; }
    const s = suitOf(card), rk = rankOf(card), col = SUIT_COL[s], lab = rk <= 3 ? String(rk) : ['D', 'F', 'C'][rk - 4];
    c.fillStyle = o.dim ? '#bdb394' : '#ece1c6'; c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x + 1, y + 1, w - 2, 2);
    c.strokeStyle = o.hot ? '#d9a441' : '#3a2c1a'; c.lineWidth = o.hot ? Math.max(2, w * 0.06) : 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    c.fillStyle = col; c.font = 'bold ' + Math.round(w * 0.3) + 'px Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(lab, x + w * 0.08, y + h * 0.04);
    c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillText(lab, x + w * 0.92, y + h * 0.96); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    drawSuit(c, s, x + w * 0.2, y + h * 0.34, w * 0.1, col);
    const cx = x + w / 2, cy = y + h / 2 + h * 0.02;
    if (rk <= 3) {                                             // numerals: that many marks
      const r0 = w * (rk === 1 ? 0.26 : 0.16), pos = rk === 1 ? [[0, 0]] : rk === 2 ? [[0, -0.2], [0, 0.2]] : [[0, -0.24], [-0.17, 0.16], [0.17, 0.16]];
      for (const [dx, dy] of pos) drawSuit(c, s, cx + dx * w, cy + dy * h, r0, col);
    } else {                                                   // courts: a small figure over a suit mark
      c.fillStyle = col; c.strokeStyle = col; c.lineWidth = Math.max(1, w * 0.05);
      const hx = cx, hy = cy - h * 0.16, hr = w * 0.1;
      c.beginPath(); c.arc(hx, hy, hr, 0, 7); c.fill();
      c.beginPath(); c.moveTo(hx - w * 0.18, cy + h * 0.1); c.lineTo(hx - w * 0.08, hy + hr); c.lineTo(hx + w * 0.08, hy + hr); c.lineTo(hx + w * 0.18, cy + h * 0.1); c.closePath(); c.fill();
      if (rk === 6) { c.beginPath(); c.moveTo(hx + w * 0.26, cy + h * 0.12); c.lineTo(hx + w * 0.26, hy - hr); c.stroke(); c.beginPath(); c.ellipse(hx + w * 0.26, hy - hr, w * 0.03, w * 0.07, 0, 0, 7); c.fill(); }          // the Cantor's reed
      else if (rk === 5) { c.fillStyle = '#ece1c6'; c.fillRect(hx - w * 0.07, cy - h * 0.02, w * 0.14, h * 0.1); c.strokeRect(hx - w * 0.07, cy - h * 0.02, w * 0.14, h * 0.1); }                                            // the Factor's ledger
      else { c.beginPath(); c.moveTo(hx - hr * 1.5, hy + hr * 0.2); c.lineTo(hx, hy - hr * 1.9); c.lineTo(hx + hr * 1.5, hy + hr * 0.2); c.closePath(); c.fill(); }                                                              // the Deacon's hood
      drawSuit(c, s, cx, y + h * 0.78, w * 0.13, col);
    }
  }

  // ---- the Rounds panel
  let roundsUi = null;
  function openRounds(opts) {
    opts = opts || {};
    if (roundsUi || !hasG() || !G.player) return null;
    if (G.state === 'play') G.state = 'panel';
    const T = TX.rounds;
    openModal(`<h2></h2>
      <div class="p15r"><canvas id="p15r-cv" width="480" height="150" role="img"></canvas>
      <p class="p15r-say" id="p15r-say" role="status" aria-live="polite"></p>
      <div class="p15r-hand" id="p15r-hand" role="group"></div>
      <p class="muted p15r-purse" id="p15r-purse"></p>
      <div class="btns p15r-btns"><button class="dfbtn small" id="p15r-less" type="button"></button><b id="p15r-stake" class="p15r-stake" aria-live="polite"></b><button class="dfbtn small" id="p15r-more" type="button"></button>
      <button class="dfbtn small" id="p15r-main" type="button"></button><button class="dfbtn small" id="p15r-leave" type="button"></button></div>
      <p class="muted p15r-rules" id="p15r-rules"></p><p class="muted p15r-keys" id="p15r-keys"></p></div>`, 'p15h_rounds');
    const ui = roundsUi = { r: null, stake: Math.min(5, Math.max(B.MIN_STAKE, maxStake() || B.MIN_STAKE)), busy: false, sure: 0, closed: false, token: G.panelToken, padPrev: {}, say: '', cur: 0, instant: !!opts.instant, dealt: 0 };
    const q = (id) => document.getElementById(id);
    document.querySelector('#modal-panel h2').textContent = T.title;
    q('p15r-cv').setAttribute('aria-label', T.alt); q('p15r-hand').setAttribute('aria-label', T.handLabel);
    q('p15r-less').textContent = '−'; q('p15r-less').setAttribute('aria-label', T.less); q('p15r-more').textContent = '+'; q('p15r-more').setAttribute('aria-label', T.more);
    q('p15r-leave').textContent = T.leave; q('p15r-rules').textContent = T.rules; q('p15r-keys').textContent = T.keys;
    const cv = q('p15r-cv'), cx = cv.getContext('2d'), handEl = q('p15r-hand');
    const inHand = () => !!(ui.r && ui.r.phase === 'play');
    const slow = () => reduced();
    const fast = () => ui.instant;
    const pause = (ms) => (fast() ? Promise.resolve() : new Promise((res) => { ui.timer = setTimeout(res, ms); }));
    const say = (t) => { ui.say = t; const e = q('p15r-say'); if (e) e.textContent = t; };
    ui.sayNow = say;

    // the table: her hand of backs, the turned trump card, and the trick in the middle
    function draw() {
      if (!cv.isConnected) return;
      const W = cv.width, H = cv.height, r = ui.r;
      const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3a2a'); g.addColorStop(1, '#1b281c'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 4; cx.strokeRect(2, 2, W - 4, H - 4);
      cx.font = '15px "Alegreya SC", Georgia, serif'; cx.textBaseline = 'alphabetic'; cx.fillStyle = '#e8d9b5'; cx.textAlign = 'left';
      cx.fillText(T.nessa, 14, 20);
      const nN = r ? r.hands.npc.length : 0;
      for (let i = 0; i < nN; i++) drawBack(cx, 14 + i * 20, 28, 34, 48);
      if (r) {
        cx.fillStyle = '#e8d9b5'; cx.textAlign = 'left'; cx.fillText(fmt(T.tricks, r.tricks.me, r.tricks.npc), 14, H - 12);
        cx.textAlign = 'right'; cx.fillText(fmt(T.trumps, SUITS[r.trump]), W - 14, 20);
        drawCard(cx, W - 14 - 50, 28, 50, 70, r.turned);
        // the trick: hers on the left, yours on the right (a finished trick stays up, dimmed, until the next card)
        const shown = r.trick.length ? r.trick : (r.last ? r.last.cards : []);
        const dim = !r.trick.length;
        const slotX = { npc: 190, me: 262 };
        for (const who of ['npc', 'me']) {
          cx.fillStyle = 'rgba(0,0,0,.22)'; cx.fillRect(slotX[who] - 2, 36, 60, 84);
          const t = shown.find((x) => x.who === who);
          if (t) drawCard(cx, slotX[who], 38, 56, 80, t.card, { dim, hot: dim && r.last && r.last.winner === who });
        }
        cx.fillStyle = '#e8d9b5'; cx.textAlign = 'center'; cx.fillText(T.nessa, slotX.npc + 28, 134); cx.fillText(T.you, slotX.me + 28, 134);
      }
      cx.textAlign = 'left';
    }
    ui.draw = draw;
    // the hand: six real buttons; illegal cards are disabled (and say why on focus)
    function buildHand(animate) {
      handEl.textContent = '';
      const r = ui.r; if (!r) return;
      const mine = r.hands.me;
      mine.forEach((card, i) => {
        const b = el('button', { class: 'p15r-card', type: 'button', 'data-i': String(i), 'data-card': String(card), 'aria-label': cardName(card) });
        const c = el('canvas', { width: '80', height: '112', 'aria-hidden': 'true' }); drawCard(c.getContext('2d'), 0, 0, 80, 112, card);
        b.appendChild(c); b.appendChild(el('span', { class: 'p15r-cn' }, cardName(card)));
        b.onclick = () => ui.playIdx(i);
        if (animate && !slow() && !fast()) { b.classList.add('deal'); setTimeout(() => b.classList.remove('deal'), 40 + i * B.DEAL_STEP); b.style.transitionDelay = (i * B.DEAL_STEP) + 'ms'; }
        handEl.appendChild(b);
      });
      refreshHand();
    }
    function refreshHand() {
      const r = ui.r; if (!r) return;
      const legal = r.turn === 'me' && r.phase === 'play' ? legalCards(r, 'me') : [];
      Array.from(handEl.children).forEach((b, i) => {
        const card = r.hands.me[i], ok = legal.includes(card) && !ui.busy;
        b.disabled = !ok; b.classList.toggle('cur', i === ui.cur);
      });
      const cb = handEl.children[ui.cur]; if (cb && !cb.disabled && document.activeElement !== cb && inHand()) cb.focus({ preventScroll: true });
    }
    const sync = () => {
      const r = ui.r, cap = maxStake();
      ui.stake = Math.max(cap ? B.MIN_STAKE : 0, Math.min(ui.stake, cap || 0));
      q('p15r-stake').textContent = T.stake + ' ' + (r && r.phase === 'play' ? r.stake : ui.stake);
      q('p15r-less').disabled = inHand() || ui.busy || ui.stake <= B.MIN_STAKE; q('p15r-more').disabled = inHand() || ui.busy || ui.stake >= cap;
      const main = q('p15r-main'); main.textContent = r ? T.again : T.deal; main.hidden = inHand(); main.disabled = ui.busy || cap < B.MIN_STAKE;
      q('p15r-less').hidden = q('p15r-more').hidden = inHand();
      q('p15r-leave').disabled = ui.busy && !inHand();
      q('p15r-purse').textContent = fmt(T.purse, Math.floor(num(G.player.gold, 0, 1e9, 0)), lostToday(), B.DAY_CAP);
      q('p15r-say').textContent = ui.say;
      refreshHand(); draw();
    };
    ui.sync = sync;
    function mustFollowLine() {
      const r = ui.r; if (!r || !r.trick.length) return '';
      const led = suitOf(r.trick[0].card), has = r.hands.me.some((c) => suitOf(c) === led);
      return has ? fmt(T.mustFollow, SUITS[led]) : fmt(T.voidSuit, SUITS[led]);
    }
    // announce what just happened
    function announce(res, who) {
      const r = ui.r;
      if (who === 'npc' && !res.resolved) return (fmt(T.nessaLeads, cardName(res.card)) + ' ' + mustFollowLine()).trim();
      const winLine = res.resolved ? (res.winner === 'me' ? fmt(T.took, cardName(r.last.cards.find((c) => c.who === 'me').card)) : fmt(T.lost, cardName(r.last.cards.find((c) => c.who === 'npc').card))) : '';
      if (who === 'npc') return (fmt(T.follow, cardName(res.card)) + ' ' + winLine).trim();
      return winLine;
    }
    async function runNpc() {
      const r = ui.r;
      while (!ui.closed && r.phase === 'play' && r.turn === 'npc') {
        ui.busy = true; sync();
        await pause(slow() ? B.NPC_DELAY_SLOW : B.NPC_DELAY);
        if (ui.closed) return;
        const c = aiChoose(r, 'npc'), res = play(r, 'npc', c);
        say(announce(res, 'npc'));
        if (res.resolved) { chime(392); sync(); await pause(slow() ? B.RESOLVE_SLOW : B.RESOLVE); }
      }
      if (ui.closed) return;
      ui.busy = false;
      if (r.phase === 'done') { await conclude(); return; }
      if (r.turn === 'me') {
        const legal = legalCards(r, 'me'); ui.cur = Math.max(0, r.hands.me.indexOf(legal[0]));
        if (!r.trick.length) say(((r.log.length && ui.say ? ui.say + ' ' : '') + T.lead).trim());
      }
      sync();
    }
    async function conclude() {
      const r = ui.r; if (!r || r.settled) return;
      settle(r);
      chime(r.delta > 0 ? 523.25 : 261.63);
      say(describeHand(r) + (maxStake() < B.MIN_STAKE ? ' ' + (G.player.gold < B.MIN_STAKE ? TX.rounds.broke : TX.rounds.cap) : ''));
      ui.busy = false; ui.stake = Math.min(ui.stake, Math.max(B.MIN_STAKE, maxStake()));
      sync();
    }
    ui.deal = async () => {
      if (ui.busy || inHand()) return;
      const cap = maxStake();
      if (cap < B.MIN_STAKE) { say(G.player.gold < B.MIN_STAKE ? T.broke : TX.rounds.cap); sync(); return; }
      ui.stake = Math.min(ui.stake, cap);
      const games = flag('p15h_games', 0, 9999);
      setFlag('p15h_games', games + 1, 0, 9999);
      const r = ui.r = newHand(seedFor(today(), games), ui.stake, { leader: games % 2 === 0 ? 'me' : 'npc' });
      ui.cur = 0; ui.sure = 0; ui.busy = true; say(''); buildHand(true); sync();
      if (!slow() && !fast()) await pause(6 * B.DEAL_STEP + 120);
      if (ui.closed) return;
      if (r.turn === 'npc') { say(TX.rounds.nessa + '.'); await runNpc(); return; }
      ui.busy = false; say(T.lead); sync();
    };
    ui.playIdx = async (i) => {
      const r = ui.r; if (ui.busy || !r || r.phase !== 'play' || r.turn !== 'me') return null;
      const card = r.hands.me[i]; if (card == null) return null;
      if (!legalCards(r, 'me').includes(card)) { say(fmt(T.illegal, SUITS[suitOf(r.trick[0].card)])); return null; }
      ui.busy = true; ui.sure = 0;
      const res = play(r, 'me', card);
      if (res.resolved) { say(announce(res, 'me')); chime(392); }
      else say(cardName(card) + '.');
      ui.cur = Math.min(ui.cur, Math.max(0, r.hands.me.length - 1)); buildHand(false); sync();
      if (res.resolved) await pause(slow() ? B.RESOLVE_SLOW : B.RESOLVE);
      if (ui.closed) return res;
      await runNpc();
      return res;
    };
    // forfeit: the panel is going away in the middle of a hand
    const forfeit = () => {
      const r = ui.r;
      if (r && r.phase === 'play' && !r.settled) { r.phase = 'done'; r.result = 'lose'; r.delta = -r.stake; settle(r); sayMsg(T.forfeit, 'warn', 3500); }
    };
    ui.close = () => {
      if (ui.closed) return; ui.closed = true;
      forfeit();
      clearTimeout(ui.timer); cancelAnimationFrame(ui.poll);
      window.removeEventListener('keydown', onKey, true);
      if (G.panelToken === ui.token && G.openPanel === 'p15h_rounds') closeModal();
      if (G.state === 'panel' && !G.openPanel) G.state = 'play';
      G.keys = {}; roundsUi = null;
    };
    const leaveAsk = () => {
      if (ui.busy && !inHand()) return;
      if (inHand()) {
        if (ui.sure && performance.now() - ui.sure < 3500) { ui.close(); return; }
        ui.sure = performance.now(); say(T.sure); return;
      }
      ui.close();
    };
    ui.leave = leaveAsk;
    const adj = (d) => { if (inHand() || ui.busy) return; ui.stake = Math.max(B.MIN_STAKE, Math.min(maxStake() || B.MIN_STAKE, ui.stake + d)); sync(); };
    ui.adj = adj;
    const curMove = (d) => {
      const r = ui.r; if (!r || !inHand() || ui.busy) return;
      const n = r.hands.me.length, legal = legalCards(r, 'me'); if (!n) return;
      for (let k = 1; k <= n; k++) { const j = (ui.cur + d * k + n * 6) % n; if (legal.includes(r.hands.me[j])) { ui.cur = j; break; } }
      refreshHand();
    };
    ui.cursor = curMove;
    const mainAct = () => { if (inHand()) { if (!ui.busy) ui.playIdx(ui.cur); } else ui.deal(); };
    q('p15r-main').onclick = () => ui.deal(); q('p15r-leave').onclick = leaveAsk;
    q('p15r-less').onclick = () => adj(-1); q('p15r-more').onclick = () => adj(1);
    function onKey(ev) {
      const k = String(ev.key || '').toLowerCase();
      const used = ['enter', ' ', 'escape', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '1', '2', '3', '4', '5', '6'].includes(k);
      if (!used) return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      if (ev.repeat && k !== 'arrowleft' && k !== 'arrowright') return;
      if (k === 'escape') { leaveAsk(); return; }
      if (inHand()) {
        if (k >= '1' && k <= '6') { ui.playIdx(+k - 1); return; }
        if (k === 'enter' || k === ' ') { mainAct(); return; }
        if (k === 'arrowleft' || k === 'arrowup') curMove(-1); else if (k === 'arrowright' || k === 'arrowdown') curMove(1);
        return;
      }
      if (k === 'enter' || k === ' ') ui.deal();
      else if (k === 'arrowleft') adj(-1); else if (k === 'arrowright') adj(1);
      else if (k === 'arrowup') adj(5); else if (k === 'arrowdown') adj(-5);
    }
    window.addEventListener('keydown', onKey, true);
    const pollPad = () => {
      if (ui.closed) return;
      if (G.panelToken !== ui.token || G.openPanel !== 'p15h_rounds') { ui.close(); return; }     // another panel took over: walk away
      const g = padNow();
      if (g) {
        const edge = (i) => { const now = !!(g.buttons[i] && g.buttons[i].pressed); const was = ui.padPrev[i]; ui.padPrev[i] = now; return now && !was; };
        if (edge(0)) mainAct(); if (edge(1)) leaveAsk();
        if (inHand()) { if (edge(14) || edge(4) || edge(12)) curMove(-1); if (edge(15) || edge(5) || edge(13)) curMove(1); }
        else { if (edge(14)) adj(-1); if (edge(15)) adj(1); if (edge(12)) adj(5); if (edge(13)) adj(-5); }
      }
      ui.poll = requestAnimationFrame(pollPad);
    };
    ui.poll = requestAnimationFrame(pollPad);
    say(T.pick);
    sync();
    const first = q('p15r-main'); if (first && !first.disabled) first.focus({ preventScroll: true });
    return ui;
  }

  // ---- Nessa herself, her table, and the Greening
  const NESSA = { x: 10.4, y: 8.5, facing: 0 };
  function settleNpc(e) { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 0; e.dir = 0; }     // as tavern11: hydrate() would draw Math.random
  function registerNpc() {
    if (typeof NPCS === 'undefined' || NPCS.p15_dealer) return;
    NPCS.p15_dealer = {
      name: TX.rounds.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low',
      greet: { polite: TX.rounds.greetPolite, normal: TX.rounds.greetNormal, blunt: TX.rounds.greetBlunt },
      topics: {}, quest: () => null,
    };
  }
  const roundsActive = () => cfg.rounds && !worldGone();
  function ensureNessa(m) {
    if (!m || m.id !== 'tavern' || !Array.isArray(m.entities)) return;
    const have = m.entities.find((e) => e && e._p15h === 'nessa');
    if (!roundsActive()) { if (have) m.entities.splice(m.entities.indexOf(have), 1); return; }
    if (have) return;
    const e = { kind: 'npc', id: 'p15_dealer', x: NESSA.x, y: NESSA.y, sprite: 'townswoman', scale: 1, solid: true, radius: 0.35, facing: NESSA.facing, transient: true, _decor: true, _p15h: 'nessa' };
    settleNpc(e);
    m.entities.push(e);
  }
  function checkClosure() {
    if (!hasG() || !worldGone() || flag('p15h_closed', 0, 1)) return;
    if (flag('p15h_games', 0, 9999) > 0) { setFlag('p15h_closed', 1, 0, 1); try { journal('side', TX.rounds.closedJournal); } catch (e) { /* no journal */ } }
  }
  function addDialogueButtons() {
    if (!hasG() || typeof DLG === 'undefined' || !DLG.npc || typeof NPCS === 'undefined') return;
    const btns = document.querySelector('#modal-panel .dlg .btns'); if (!btns) return;
    if (DLG.npc !== NPCS.p15_dealer || !roundsActive() || btns.querySelector('#d-p15-rounds')) return;
    const bye = btns.querySelector('#d-bye');
    const b = el('button', { class: 'dfbtn small', id: 'd-p15-rounds', type: 'button' }, TX.rounds.button);
    b.onclick = () => { try { closeModal(); G.state = 'play'; openRounds(); } catch (e) { console.warn('hearth15: rounds failed', e); } };
    btns.insertBefore(b, bye || null);
  }

  // ================================================================ 3. BOSS TROPHIES
  const trophyId = (k) => 'p15_t_' + TX.trophy.items[k].key;
  // the boss flags the game already sets (js/coda.js, js/grove.js, js/wilds.js, js/game.js). The Wearer at the Hedge and the
  // Wearer of the coda are different fights: wearer_dead is set by both, wearer_coda_dead only by the second.
  const TROPHY_TEST = {
    wearer: (f) => !!f.wearer_dead && !f.wearer_coda_dead,
    coda: (f) => !!f.wearer_coda_dead,
    requiem: (f) => !!f.requiem_done || (!!f.coda_done && !f.wearer_coda_dead),
    aegis: (f) => !!f.aegis_destroyed,
    hymn: (f) => !!f.aegis_calmed && !f.aegis_destroyed,
    weaver: (f) => !!f.weaver_dead,
    mallow: (f) => !!f.mallow_dead,
    brood: (f) => !!f.brood_dead,
    bosun: (f) => !!f.bosun_dead,
    horn: (f) => !!f.horn_dead,
    deacon: (f) => !!f.deacon_dead,
    captain: (f) => !!f.captain_dead,
  };
  const gotMask = () => flag('p15h_got', 0, (1 << B.PEGS) - 1);
  const isGot = (k) => (gotMask() & (1 << k)) !== 0;
  const isAnyGot = () => gotMask() !== 0;
  // [PROPOSED] the twelve pegs: x, y on the wall face, height offset. Walls of the 12x9 house: north y=1, east x=11, west x=1, south y=8.
  const PEGS = [
    { x: 5.0, y: 1.12 }, { x: 6.0, y: 1.12 }, { x: 7.0, y: 1.12 },
    { x: 10.86, y: 3.4 }, { x: 10.86, y: 4.4 }, { x: 10.86, y: 6.8 },
    { x: 1.14, y: 3.2 }, { x: 1.14, y: 6.0 }, { x: 1.14, y: 7.0 },
    { x: 2.6, y: 7.86 }, { x: 4.2, y: 7.86 }, { x: 8.0, y: 7.86 },
  ];
  const PEG_YOFF = -0.42;
  // which trophy hangs on which peg, validated every time: needs a granted trophy, a peg 1-12, no peg used twice
  function placedMap() {
    const byPeg = {}, byTrophy = {};
    for (let k = 0; k < TX.trophy.items.length; k++) {
      const v = flag('p15h_p' + k, 0, B.PEGS);
      if (v < 1 || v > B.PEGS || !isGot(k) || byPeg[v - 1] != null) continue;
      byPeg[v - 1] = k; byTrophy[k] = v - 1;
    }
    return { byPeg, byTrophy };
  }
  function ensurePegs(m) {
    if (!m || m.id !== 'cooper_house' || !Array.isArray(m.entities)) return;
    for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p15h === 'peg') m.entities.splice(i, 1);
    if (!cfg.trophies || !hasG()) return;
    const { byPeg } = placedMap();
    PEGS.forEach((P, i) => {
      const k = byPeg[i], t = k != null ? TX.trophy.items[k] : null;
      m.entities.push({
        kind: 'deco', sprite: k != null ? 'p15_t_' + t.key : 'p15_peg', x: P.x, y: P.y, scale: k != null ? 0.6 : 0.26, yOff: PEG_YOFF + (k != null ? -0.06 : 0.04),
        solid: false, radius: 0.2, transient: true, _decor: true, _p15h: 'peg', _pi: i, _h: true, use: 'p15_peg', label: t ? t.name : TX.trophy.pegBare,
      });
    });
  }
  function grant(k) {
    const id = trophyId(k);
    if (isGot(k)) return false;
    G.give(id);
    setFlag('p15h_got', gotMask() | (1 << k), 0, (1 << B.PEGS) - 1);
    return true;
  }
  // give every trophy whose boss flag is set and that has not been given (retroactive for old saves)
  function scanTrophies(quiet) {
    if (!cfg.trophies || !hasG() || !G.player || !Array.isArray(G.player.inv)) return 0;
    let n = 0;
    TX.trophy.items.forEach((t, k) => {
      if (isGot(k) || !TROPHY_TEST[t.key](G.flags)) return;
      if (grant(k)) { n++; if (!quiet) sayMsg(fmt(TX.trophy.got, t.name), 'good', 6500); }
    });
    return n;
  }
  function hang(k, peg) {
    if (!cfg.trophies || !hasG() || !Number.isInteger(k) || !Number.isInteger(peg) || k < 0 || k >= TX.trophy.items.length || peg < 0 || peg >= B.PEGS) return false;
    const { byPeg, byTrophy } = placedMap();
    if (!isGot(k) || byTrophy[k] != null || byPeg[peg] != null || !G.has(trophyId(k))) return false;
    G.take(trophyId(k)); setFlag('p15h_p' + k, peg + 1, 0, B.PEGS);
    if (G.mapId === 'cooper_house') ensurePegs(G.map); else if (G.maps && G.maps.cooper_house) ensurePegs(G.maps.cooper_house);
    sayMsg(TX.trophy.items[k].hung, 'good', 6500);
    return true;
  }
  function takeDown(k) {
    if (!hasG() || !Number.isInteger(k) || k < 0 || k >= TX.trophy.items.length) return false;
    const { byTrophy } = placedMap(); if (byTrophy[k] == null) return false;
    setFlag('p15h_p' + k, 0, 0, B.PEGS); G.give(trophyId(k));
    if (G.mapId === 'cooper_house') ensurePegs(G.map); else if (G.maps && G.maps.cooper_house) ensurePegs(G.maps.cooper_house);
    return true;
  }
  const carried = () => TX.trophy.items.map((t, k) => k).filter((k) => isGot(k) && placedMap().byTrophy[k] == null && G.has(trophyId(k)));
  function pegMenu(e) {
    if (!cfg.trophies || typeof showEvent !== 'function') return;
    const T = TX.trophy, pi = e._pi, { byPeg } = placedMap(), k = byPeg[pi];
    if (k != null) {
      showEvent(T.items[k].name, T.items[k].desc, [{ t: T.takeDown, f: () => takeDown(k) }, { t: T.leaveHung, f: null }]);
      return;
    }
    const list = carried();
    if (!list.length) { sayMsg(T.none, '', 4800); return; }
    const page = (start) => {
      const slice = list.slice(start, start + 5), ch = slice.map((kk) => ({ t: T.items[kk].name, f: () => hang(kk, pi) }));
      if (list.length > 5) ch.push({ t: T.more, f: () => setTimeout(() => page((start + 5) % list.length), 0) });
      ch.push({ t: T.leaveBare, f: null });
      showEvent(T.pegTitle, T.pegAsk, ch);
    };
    page(0);
  }
  function hungCount() { return Object.keys(placedMap().byTrophy).length; }

  // ---- procedural trophy art (stand-in): 32x32 pieces and a brass peg
  function paintSprite(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let i = 0; i < w * h; i++) { const o = i * 4; u8[o + 3] = u8[o + 3] < 100 ? 0 : 255; }
    return new Uint32Array(id.data.buffer);
  }
  const ART = {
    peg(c) { c.fillStyle = '#6a4a22'; c.fillRect(6, 11, 4, 4); c.fillStyle = '#c9a24a'; c.beginPath(); c.moveTo(8, 3); c.lineTo(12, 8); c.lineTo(8, 13); c.lineTo(4, 8); c.closePath(); c.fill(); c.fillStyle = '#7a5a22'; c.fillRect(7, 7, 2, 2); },
    wearer(c) { c.strokeStyle = '#8a8272'; c.lineWidth = 4; c.beginPath(); c.arc(16, 17, 10, 0.3, Math.PI * 2 - 0.3); c.stroke(); c.strokeStyle = '#4a4438'; c.lineWidth = 1.5; for (let a = 0.5; a < 6; a += 0.8) { c.beginPath(); c.moveTo(16 + Math.cos(a) * 8, 17 + Math.sin(a) * 8); c.lineTo(16 + Math.cos(a) * 12, 17 + Math.sin(a) * 12); c.stroke(); } c.fillStyle = '#b9b09a'; c.beginPath(); c.arc(16, 6, 3, 0, 7); c.fill(); },
    coda(c) { c.fillStyle = '#9aa88a'; c.beginPath(); c.moveTo(13, 28); c.lineTo(11, 6); c.lineTo(15, 4); c.lineTo(16, 28); c.closePath(); c.fill(); c.fillStyle = '#7a8870'; c.beginPath(); c.moveTo(18, 28); c.lineTo(17, 5); c.lineTo(21, 7); c.lineTo(22, 28); c.closePath(); c.fill(); c.fillStyle = '#2a2a22'; c.fillRect(15, 6, 3, 22); },
    requiem(c) { c.fillStyle = '#9a6a2a'; c.fillRect(4, 6, 24, 20); c.fillStyle = '#c9902e'; c.fillRect(5, 7, 22, 18); c.strokeStyle = '#5a3a12'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(7, 11 + i * 4); c.lineTo(25, 11 + i * 4); c.stroke(); } c.fillStyle = '#3a2208'; for (const [x, y] of [[10, 14], [15, 10], [20, 18], [13, 22]]) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); } },
    aegis(c) { c.fillStyle = '#b8923a'; c.beginPath(); c.moveTo(4, 8); c.quadraticCurveTo(16, 0, 28, 8); c.lineTo(25, 24); c.quadraticCurveTo(16, 30, 7, 24); c.closePath(); c.fill(); c.strokeStyle = '#6a4c12'; c.lineWidth = 1.2; c.stroke(); c.strokeStyle = '#f0e6c8'; c.lineWidth = 1; c.beginPath(); c.moveTo(11, 12); c.lineTo(14, 18); c.moveTo(15, 11); c.lineTo(15, 19); c.moveTo(19, 12); c.lineTo(17, 18); c.stroke(); },
    hymn(c) { c.fillStyle = '#6a4a22'; c.fillRect(4, 5, 24, 22); c.fillStyle = '#2f3a3a'; c.fillRect(6, 7, 20, 18); c.fillStyle = '#e8e0cc'; c.font = 'bold 14px Georgia, serif'; c.textAlign = 'center'; c.fillText('9', 16, 21); c.fillRect(8, 9, 10, 1); },
    weaver(c) { c.fillStyle = '#c8b48a'; c.beginPath(); c.moveTo(3, 16); c.quadraticCurveTo(16, 6, 29, 16); c.quadraticCurveTo(16, 26, 3, 16); c.fill(); c.strokeStyle = '#6a5a3a'; c.lineWidth = 1; c.stroke(); c.strokeStyle = '#d8d4cc'; c.lineWidth = 1.3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(11 + i * 2, 12 + (i % 2)); c.lineTo(11 + i * 2, 20 - (i % 2)); c.stroke(); } c.fillStyle = '#4a3a22'; c.fillRect(14, 15, 4, 2); },
    mallow(c) { c.fillStyle = '#7a7468'; c.fillRect(4, 8, 24, 16); c.fillStyle = '#a49c8c'; c.fillRect(5, 9, 22, 14); c.fillStyle = '#4a463e'; for (const [x, y] of [[7, 11], [25, 11], [7, 21], [25, 21]]) { c.beginPath(); c.arc(x, y, 1.3, 0, 7); c.fill(); } c.fillRect(11, 14, 3, 6); c.fillRect(16, 14, 3, 6); c.fillStyle = '#8a8478'; c.fillRect(21, 14, 3, 6); },
    brood(c) { c.fillStyle = '#6a5a3a'; c.fillRect(15, 3, 2, 26); c.fillStyle = '#ece8dc'; c.beginPath(); c.moveTo(16, 9); c.lineTo(23, 25); c.lineTo(9, 25); c.closePath(); c.fill(); c.strokeStyle = '#b8b2a2'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(11 + i * 0.5, 22 - i * 4); c.lineTo(21 - i * 0.5, 22 - i * 4); c.stroke(); } },
    bosun(c) { c.strokeStyle = '#6a4228'; c.lineWidth = 3; c.beginPath(); c.moveTo(10, 3); c.quadraticCurveTo(4, 16, 16, 20); c.quadraticCurveTo(28, 16, 22, 3); c.stroke(); c.fillStyle = '#c9a24a'; c.fillRect(10, 19, 12, 9); c.strokeStyle = '#6a4c12'; c.lineWidth = 1; c.strokeRect(10.5, 19.5, 11, 8); c.fillStyle = '#4a3208'; c.fillRect(12, 22, 8, 1); c.fillRect(12, 25, 6, 1); },
    horn(c) { c.fillStyle = '#6a7a80'; c.beginPath(); c.arc(16, 16, 12, 0, 7); c.fill(); c.fillStyle = '#9fe0e8'; c.beginPath(); c.arc(16, 16, 9.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(12, 12, 3.5, 2, -0.7, 0, 7); c.fill(); c.strokeStyle = '#3a4a50'; c.lineWidth = 1; c.beginPath(); c.arc(16, 16, 9.5, 0, 7); c.stroke(); },
    deacon(c) { c.fillStyle = '#8a8a86'; c.fillRect(11, 4, 10, 18); c.fillStyle = '#a8a8a2'; c.fillRect(12, 5, 3, 16); c.strokeStyle = '#5a5a56'; c.lineWidth = 1; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(11, 8 + i * 4); c.lineTo(21, 8 + i * 4); c.stroke(); } c.fillStyle = '#b8883a'; c.beginPath(); c.arc(16, 25, 4.5, 0, 7); c.fill(); },
    captain(c) { c.fillStyle = '#8e9a9e'; c.beginPath(); c.moveTo(3, 8); c.quadraticCurveTo(16, 0, 29, 8); c.lineTo(24, 24); c.quadraticCurveTo(16, 18, 8, 24); c.closePath(); c.fill(); c.strokeStyle = '#4a5458'; c.lineWidth = 1.2; c.stroke(); c.fillStyle = '#d6dcdf'; for (const x of [8, 13, 19, 24]) { c.beginPath(); c.arc(x, 9 + (x < 16 ? 1 : 0), 1.2, 0, 7); c.fill(); } c.fillStyle = '#6e7a7e'; c.fillRect(13, 14, 6, 6); },
  };
  function paintAll() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || typeof document === 'undefined') return;
    const reg = (name, w, h, fn) => { if (Engine.sprites[name]) return; Engine.addSprite(name, { w, h, data: paintSprite(w, h, fn), hs: 1, cx: 0.5, dy: 0 }); };
    reg('p15_peg', 16, 16, ART.peg);
    for (const t of TX.trophy.items) reg('p15_t_' + t.key, 32, 32, ART[t.key]);
  }

  // ---- the Statistics screen and the inventory line
  function addStats() {
    const root = document.getElementById('p7-stats'); if (!root || root.querySelector('.p15h-stats')) return;
    if (!isAnyGot() && !flag('p15h_games', 0, 9999)) return;         // nothing won, nothing played: the screen is exactly as before
    const T = TX.trophy, cells = root.querySelectorAll('.p7-cell');
    const host = cells.length > 1 ? cells[1] : root;                 // the right-hand column has the room
    const col = el('div', { class: 'p7-col p15h-stats' }); col.appendChild(el('h3', null, T.statsHead));
    const row = (k, v) => { const r = el('div', { class: 'p7-srow' }); r.appendChild(el('span', null, k)); r.appendChild(el('b', null, v)); col.appendChild(r); };
    const { byTrophy } = placedMap(); let won = 0;
    T.items.forEach((t, k) => { if (!isGot(k)) return; won++; row(t.name, byTrophy[k] != null ? T.statsHung : T.statsPack); });
    row(fmt(T.statsCount, won, T.items.length), '');
    if (flag('p15h_games', 0, 9999) > 0) row(T.roundsRow, flag('p15h_rwon', 0, 9999) + ' / ' + flag('p15h_games', 0, 9999));
    host.appendChild(col);
  }

  // ================================================================ options rows, sync, install
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p15h-opt-cook')) return;
    const label = (t, hint) => { const s = el('span', { class: 'gfx-label' }, t + ' '); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const toggle = (id, key) => {
      const b = el('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': cfg[key] ? 'true' : 'false' }, cfg[key] ? TX.opts.on : TX.opts.off);
      b.classList.toggle('sel', cfg[key]);
      b.onclick = () => { cfg[key] = !cfg[key]; saveCfg(); b.textContent = cfg[key] ? TX.opts.on : TX.opts.off; b.setAttribute('aria-pressed', cfg[key] ? 'true' : 'false'); b.classList.toggle('sel', cfg[key]); sync(); };
      return b;
    };
    const O = TX.opts;
    grid.appendChild(label(O.cook, O.cookHint)); grid.appendChild(toggle('p15h-opt-cook', 'cook'));
    grid.appendChild(label(O.auto, O.autoHint));
    const a = el('button', { class: 'dfbtn small', id: 'p15h-opt-auto', type: 'button' }, cfg.auto ? O.automatic : O.hand);
    a.onclick = () => { cfg.auto = !cfg.auto; saveCfg(); a.textContent = cfg.auto ? O.automatic : O.hand; };
    grid.appendChild(a);
    grid.appendChild(label(O.rounds, O.roundsHint)); grid.appendChild(toggle('p15h-opt-rounds', 'rounds'));
    grid.appendChild(label(O.trophies, O.trophiesHint)); grid.appendChild(toggle('p15h-opt-trophies', 'trophies'));
  }
  function sync() {
    try {
      if (!hasG()) return;
      registerNpc();
      if (G.maps) { if (G.maps.tavern) ensureNessa(G.maps.tavern); if (G.maps.cooper_house) ensurePegs(G.maps.cooper_house); }
      setHearthUse();
      checkClosure();
      loadWarm();
    } catch (e) { console.warn('hearth15: sync failed', e); }
  }

  function install() {
    loadCfg();
    registerItems();
    try { paintAll(); } catch (e) { console.warn('hearth15: art failed', e); }
    registerNpc();
    const css = document.createElement('style'); css.id = 'hearth15-style';
    css.textContent = `#modal-panel:has(.p15c), #modal-panel:has(.p15r) { width: 84cqw; max-height: 96cqh; }
.p15c canvas, .p15r canvas { display: block; width: min(100%, 118cqh); height: auto; margin: 0 auto; background: #0e0a07; border: 2px solid #0b0806; image-rendering: pixelated; }
.p15c-say, .p15r-say { min-height: 4.4cqh; margin: .4cqh 0; color: var(--gold); font-family: var(--font-sc); font-size: 2cqw; }
.p15c-list { display: flex; flex-direction: column; gap: .6cqh; margin: .3cqh 0; }
.p15c-list[hidden] { display: none; }
.p15c-list .dfbtn small { font-size: 1.6cqw; }
.p15c-btns, .p15r-btns { display: flex; flex-wrap: wrap; gap: .8cqw; align-items: center; justify-content: center; margin-top: .4cqh; }
.p15c-keys, .p15r-keys, .p15r-rules, .p15r-purse { font-size: 1.5cqw; margin: .2cqh 0; }
.p15r-stake { font-family: var(--font-sc); color: var(--gold); min-width: 9cqw; text-align: center; font-size: 2.2cqw; }
.p15r-hand { display: flex; gap: .8cqw; justify-content: center; margin: .5cqh 0; min-height: 11cqh; }
.p15r-card { position: relative; width: 8.4cqw; padding: 0; border: 2px solid #3a2c1a; background: #1b1510; cursor: pointer; line-height: 0; transition: transform .18s ease, opacity .18s ease; }
.p15r-card canvas { width: 100%; height: auto; display: block; margin: 0; border: 0; image-rendering: auto; }
.p15r-card .p15r-cn { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.p15r-card:disabled { opacity: .45; cursor: default; filter: grayscale(.4); }
.p15r-card.cur:not(:disabled), .p15r-card:focus-visible { outline: 3px solid var(--gold); outline-offset: 1px; transform: translateY(-.8cqh); }
.p15r-card.deal { opacity: 0; transform: translateY(-3cqh); }
@media (prefers-reduced-motion: reduce) { .p15r-card { transition: none; } }
`;
    document.head.appendChild(css);

    if (typeof loadMap === 'function') {
      const _load = loadMap;
      loadMap = function (id) {
        try { sync(); if (G.maps && G.maps[id]) { ensureNessa(G.maps[id]); ensurePegs(G.maps[id]); } } catch (e) { console.warn('hearth15: placement failed', e); }
        const r = _load.apply(this, arguments);
        // anim.js sweeps transients when a map is re-entered: put them back
        try { ensureNessa(G.map); ensurePegs(G.map); setHearthUse(); } catch (e) { /* never break a map change */ }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _restore = restoreGame;
      restoreGame = function () {
        if (cookUi) cookUi.close();
        if (roundsUi) roundsUi.close();
        const r = _restore.apply(this, arguments);
        try { sync(); if (G.map) { ensureNessa(G.map); ensurePegs(G.map); } scanTrophies(true); } catch (e) { /* ignore */ }
        return r;
      };
    }
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try {
          if (e && e.kind === 'deco') {
            if (e.use === 'p15_cook') { openSite(e, 'hearth', _use); return; }
            if (e.use === 'campfire' && openSite(e, 'camp', _use)) return;
            if (e.use === 'house_forge' && e.sprite === 'hearth' && openSite(e, 'home', _use)) return;
            if (e.use === 'p15_peg') { pegMenu(e); return; }
            if (e.use === 'house_trophy' && cfg.trophies) { const r = _use.apply(this, arguments); sayMsg(fmt(TX.trophy.hungCount, hungCount(), TX.trophy.items.length), '', 4000); return r; }
          }
        } catch (err) { console.warn('hearth15: use failed', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _item = useItem;
      useItem = function (slot) {
        const it = slot && typeof slot.id === 'string' && typeof ITEMS !== 'undefined' && Object.prototype.hasOwnProperty.call(ITEMS, slot.id) ? ITEMS[slot.id] : null;
        try {
          if (it && it.use === 'p15_food' && DISHES[slot.id]) { G.take(slot.id); eatDish(slot.id, B.PACK_Q); try { renderInventory(); } catch (e) { /* closed */ } return; }
          if (it && it.use === 'p15_trophy') { sayMsg(TX.trophy.use, '', 4500); return; }
        } catch (err) { console.warn('hearth15: item failed', err); }
        return _item.apply(this, arguments);
      };
    }
    if (typeof openModal === 'function') {
      const _open = openModal;
      openModal = function (html, name) {
        const r = _open.apply(this, arguments);
        try { if (name === 'stats' && cfg.trophies) queueMicrotask(() => { try { addStats(); } catch (e) { console.warn('hearth15: stats failed', e); } }); } catch (e) { console.warn('hearth15: stats failed', e); }
        return r;
      };
    }
    if (typeof renderInventory === 'function') {
      const _inv = renderInventory;
      renderInventory = function () {
        const r = _inv.apply(this, arguments);
        try { const line = warmLine(); const top = line && document.querySelector('#modal-panel .invtop'); if (top) top.appendChild(document.createTextNode(' · ' + line)); } catch (e) { /* cosmetic */ }
        return r;
      };
    }
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function () {
        const r = _rd.apply(this, arguments);
        try { addDialogueButtons(); } catch (e) { console.warn('hearth15: dialogue buttons failed', e); }
        return r;
      };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('hearth15: options rows failed', e); }
        return r;
      };
    }
    // a long rest or road burns the warmth; the warmth of a smoked meal slows the hunger a road costs (Needs on)
    if (typeof passHours === 'function') {
      const _ph = passHours;
      passHours = function (hours) {
        const r = _ph.apply(this, arguments);
        try { if (buffId() && hours > 0) { warm.rem = Math.max(0, warm.rem - hours * B.HOUR_SECS); if (warm.rem <= 0) endBuff(false); else writeWarm(); } } catch (e) { /* cosmetic */ }
        return r;
      };
    }
    if (typeof drainNeeds === 'function') {
      const _dn = drainNeeds;
      drainNeeds = function (hours) {
        const p = hasG() ? G.player : null, before = p ? Number(p.hunger) : 0;
        const r = _dn.apply(this, arguments);
        try {
          const bf = BUFFS[buffId()];
          if (p && bf && bf.hungerKeep && needsLive() && warm.rem > 0 && before > p.hunger) p.hunger = Math.min(100, p.hunger + (before - p.hunger) * bf.hungerKeep);
        } catch (e) { /* cosmetic */ }
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
            tickWarm(dt);
            acc += dt; if (acc >= B.SCAN) { acc = 0; scanTrophies(false); }
          }
        } catch (err) { /* never break a frame */ }
        return r;
      };
    }
    if (hasG()) { try { sync(); if (G.map) { ensureNessa(G.map); ensurePegs(G.map); } } catch (e) { /* nothing built yet */ } }
  }
  try { install(); } catch (e) { console.warn('hearth15: install failed', e); }

  return {
    TX, LIST, B, cfg, RECIPES, BUFFS, DISHES, PEGS, SUITS, RANKS, TROPHY_TEST, HEARTH_MAPS, SWITCHES,
    // cooking
    recipeState, anyRecipe, makeCookSession, finishCook, serve, eatDish, startBuff, endBuff, tickWarm, buffId, buffKey, loadWarm, warm, warmLine, inCombat,
    openCook, openSite, companionLine, setHearthUse, get cookUi() { return cookUi; },
    // rounds
    mulberry32, seedFor, newHand, legalCards, trickWinner, play, aiChoose, playAuto, settle, maxStake, lostToday, describeHand, cardName, suitOf, rankOf,
    openRounds, ensureNessa, checkClosure, roundsActive, get roundsUi() { return roundsUi; }, drawCard,
    // trophies
    trophyId, gotMask, isGot, placedMap, ensurePegs, scanTrophies, grant, hang, takeDown, carried, pegMenu, hungCount, addStats, paintAll,
    flag, setFlag, saveCfg, loadCfg, sync, worldGone,
  };
})();
