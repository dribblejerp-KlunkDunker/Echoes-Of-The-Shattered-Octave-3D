// ============================================================
//  deep16 — Phase 16 (new ground), team DEEP: THE LOWER PLAZAS, the drowned administrative quarter under Whisper-Grove.
//
//  After the Greening (part3 and later) a stair goes on down under the deep pool at the south-west of the Sunken Court
//  [PROPOSED]. Below is the Synod's "restorative administration" as it was left: a notice hall, a filing hall, the clerks'
//  room, a stair down past the painted water marks, the depot of the relief convoy of 416 (the year of the Silencing; the
//  relief that came to the Grove afterwards and was taken over by the restorative administration; author's ruling
//  2026-10-20: no 409, no flood relief), a register office and a room of things nobody
//  came back for [PROPOSED, all of it]. The Unstrung are alive above; down here there is only what was left. Few foes,
//  and those far back. The dread is light, silence, and what the records say.
//
//  THE MECHANIC (new: before this, deep water could only be swum at the surface, js/upgrades.js tickSwim):
//    * The whole map is under water. You swim in three dimensions: W/A/S/D as on land (slower, with a glide), Space rises,
//      X or Ctrl sinks, and swimming forward while looking up or down climbs or dives (so touch and controller players
//      swim with the look alone). The eye height is a swim depth z between the floor and the vault (Engine.cam.z on a
//      relief map: the Phase 2 height system draws it). Low furniture (the counter, the filing stacks) can be swum over.
//    * Breath: a meter on the HUD (role=meter, labelled, with captions). It drains while you are under; it refills only
//      where air is caught under a vault (a silver ceiling and a trembling skin of light) and your head is up in it.
//      Warnings at half, a quarter and a tenth; when it is empty you get a grace of B.GRACE seconds and only then the
//      water starts to hurt, ramping slowly. Never instantly lethal: from a full breath the first damage is
//      B.BREATH + B.GRACE seconds away, and death some seconds after that.
//    * Down here Songs do not carry (the Hush rule fits: silence), except a murmur. Weapons come slow.
//    * The view: a full-screen under-water post pass (green-lilac depth fog, slow caustic light on floor and walls,
//      a little drifting silt, a slow wobble). Off above water and when your head is in a pocket of air. Sound goes
//      through the master low-pass (Audio_.muffle, as house13 does: a floor, never fighting fp-feel) and the recorded
//      music is ducked; the procedural Extended score goes through the master and so through the low-pass too.
//
//  GAMEPLAY TABLE (the one table; B below):
//    breath                      B.BREATH s (+0.1 s per Endurance point over 40, at most +6)      drain 1/s, x1.6 sprinting, x0.75 still
//    refill                      B.REFILL per s with your head in a pocket of air
//    warnings                    50 %, 25 %, 10 % (message + caption), empty: message + caption, then B.GRACE s grace
//    drowning                    B.DROWN_DPS hp/s rising to B.DROWN_MAX over B.DROWN_RAMP s; only after the grace
//    swim speed                  B.SWIM u/s (B.SPRINT with Shift; walking on land is about 2.6-3.3); rise/sink B.RISE u/s
//    weapons                     cooldown x B.WEAPON_SLOW under water
//    Songs                       only the murmur, under water; the others do nothing and cost nothing
//    foes                        three Drowned Hollows, all in the deep rooms, all guards (they see you only close up)
//    reward                      the relief register: 9 names into the Ledger, a journal line, B.XP xp; Sable has a topic about it
//
//  ROUTE: dive point (E at the pool, 15.5 34.5 in the Sunken Court) -> Well Three (air) -> notice hall -> filing hall (air in
//  the fallen vault) -> clerks' room (air) -> the stair down -> the depot, whose lamp-shaft (air) is the second way out ->
//  the register office (air; the register) -> the returns room. Every air pocket is in reach of the next with margin
//  (DEEP16.budget(), tested); two ways up (Well Three, the lamp-shaft), never locked.
//
//  STATE: G.flags under p16d_ only, validated on every read (FLAGS): reg (the register taken), air (the last air pocket,
//  0-5), seen (room bits), dives (0-99), j (journal stage). Swimming state, breath and depth are TRANSIENT: a save made
//  under water loads you safely at the last air pocket you breathed at, head up, breath full.
//  SWITCHES: Options -> Graphics & access -> "The Lower Plazas" (content; default On; localStorage 'octave.deep16.v1'; Off
//  = no dive point, the original Court) and "Underwater view" (GFX.deepView; in GFX.FX so Original/plain turn it off; in
//  LOW_OFF, per-frame). With the view off, the map's own fog still makes it murky.
//  ACCESS: Reduce motion = no wobble, slow caustics, still silt, no sway; No flashes = static caustics, no meter pulse;
//  captions for every sound cue; the meter has role=meter and a text label. Cinematic: this pass adds no bloom and no
//  vignette when cinema14's grade is on, so nothing doubles.
//  Procedural stand-ins: every texture and sprite is painted here once and cached. Nothing draws from Math.random.
// ============================================================
'use strict';

if (typeof GFX !== 'undefined') {
  if (GFX.deepView === undefined) GFX.deepView = true;
  if (GFX.FX && !GFX.FX.includes('deepView')) GFX.FX.push('deepView');
}

const DEEP16 = (function () {
  const KEY = 'octave.deep16.v1';
  const cfg = { on: true, view: true };
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { if (typeof o.on === 'boolean') cfg.on = o.on; if (typeof o.view === 'boolean') cfg.view = o.view; }
    } catch (e) { /* storage blocked: defaults */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ on: cfg.on, view: cfg.view })); } catch (e) { /* ignore */ } }

  const MAPID = 'p16d_lower';
  const W = 40, H = 32;
  // ---------------------------------------------------------------- balance (the one table)
  const B = {
    BREATH: 30, BREATH_END: 0.1, BREATH_END_MAX: 6,
    DRAIN: 1, DRAIN_SPRINT: 1.6, DRAIN_STILL: 0.75,
    REFILL: 10,
    WARN: [0.5, 0.25, 0.1],
    GRACE: 2.5, DROWN_DPS: 2, DROWN_MAX: 5, DROWN_RAMP: 6,
    SWIM: 1.55, SPRINT: 2.15, RISE: 1.2, ACC: 3.2, GLIDE: 1.5, PITCH_K: 0.95, SINK: 0.04,
    BODY: 0.3,                       // the swimmer's body reaches this far below the eye
    CEIL: 3.4,                       // the vault, everywhere
    ZTOP: 3.25, ZTOP_AIR: 3.3,       // the highest the eye can go: under stone / in a pocket of air
    WL: 3.12,                        // in a pocket, an eye above this is above the water
    WEAPON_SLOW: 1.6, MUSIC_DUCK: 0.45, MUFFLE: 0.72, MUFFLE_AIR: 0.3,
    MARGIN: 0.6,                     // the route keeps every stretch without air under this share of a base breath
    U_AIR: 0.4,                      // how much of the under-water look stays with your head in a pocket of air
    XP: 60,
  };
  const LV = { U: 2.0, S: 1.5, M: 1.0, s: 0.5, D: 0 };

  // ---------------------------------------------------------------- text (every player-visible string goes through S)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      label: S('The Lower Plazas'),
      hint: S('a dive under the Sunken Court after the Greening: swimming, breath and pockets of air. Off: the stair is not there.'),
      view: S('Underwater view'),
      viewHint: S('green-lilac murk, slow water-light and drifting silt while you swim'),
    },
    mapName: S('The Lower Plazas'),
    dive: {
      label: S('Under the lit water a stair goes on down where the pool should end. A rope is tied to the rail.'),
      title: S('The Lower Plazas'),
      body: S('Under the lit water, a stair goes on down where the pool should end. Brass rail, marble treads, a painted hand on the wall: LOWER PLAZAS. RESTORATIVE ADMINISTRATION. A rope has been tied to the rail and let down into the dark. Somebody meant to come back up it.<br><br>Below, the water is still. You will need air. There will be places where the vaults still hold some.'),
      go: S('Take a breath and go down'),
      no: S('Not yet'),
      arrive: S('You go down the rope hand over hand. The light of the pool closes over you like a lid.'),
      help: S('Under water: Space rises, X sinks, or look up and down as you swim. Silver under a vault is air.'),
    },
    breath: {
      label: S('Breath'),
      full: S('Breath: full'),
      pct: S('Breath: {0} in a hundred'),
      warn50: S('Your chest has started to ask for air.'),
      warn25: S('You need air. Look up: silver under a vault is air.'),
      warn10: S('Your lungs burn.'),
      empty: S('There is no breath left in you. Up. Get up into the air.'),
      hurt: S('The water is in your throat.'),
      first: S('You break into a hand\'s breadth of air under the vault. It is stale, and cold, and enough.'),
      death: S('The still water under Whisper-Grove'),
    },
    song: S('You open your mouth and the water takes the note. Only a murmur carries down here.'),
    weapon: S('The water takes the weight out of the swing. Every blow comes slow.'),
    shriek: S('The Drowned Hollow opens its mouth wide. Down here nothing comes out of it but silver.'),
    rooms: {
      well: S('WELL THREE. A rope, a rail, and the stone throat of a well going up into green light.'),
      notices: S('A hall of notices. The paper has gone soft and stayed on the boards. The ink has not run. Office ink does not.'),
      filing: S('The filing hall. Drawers to the vault, and every drawer labelled in the same square hand.'),
      clerks: S('The clerks\' room. Four desks, four chairs, a coat over the back of each chair, buttoned.'),
      stair: S('The stair goes down into the dark, past lines painted on the wall one above another, each a hand higher than the last: WATER. WATER. WATER. Nobody painted the next one.'),
      depot: S('The depot. Handcarts in a row, loaded, their shafts down, as if the horses had only been led round to the front.'),
      office: S('A small office with a stove in it. The stove door is shut. A register lies open on the desk.'),
      returns: S('RETURNS. UNCLAIMED. Shelves of shoes, in pairs, tied together by the laces.'),
    },
    look: {
      rope: S('The rope down from the Sunken Court. Up, into the green light.'),
      shaft: S('A lamp-shaft goes up through the vault, and there is light at the top of it. A chain hangs down.'),
      air: S('Air, caught under the vault: a skin of silver, trembling.'),
      weed: S('Pale weed growing up from the floor, lit from inside, lilac. It leans toward you when you move.'),
      wellSign: S('Painted on the well-head, under the slime: WELL THREE. LOWER PLAZAS. STAFF ONLY.'),
      counter: S('The intake counter. A brass bell on it, and a card: RING ONCE. You try. Under water it moves, and that is all.'),
      bench: S('A waiting bench. Clean. People hesitate less when the bench is clean.'),
      drawers: S('Filing drawers, oak, to the vault. Every card in the same square hand: LANTERN ROW. CANDLE STREET. THE STEPS. HOUSEHOLDS, BY NUMBER.'),
      ledgers: S('Ledgers, swollen to twice their thickness, in a heap where a shelf gave way. The covers are stamped with a number and nothing else.'),
      coat: S('A clerk\'s coat over the back of a chair, buttoned to the collar. A pen in the breast pocket. The chair is pulled in to the desk.'),
      cup: S('A cup on the desk with a saucer over it, to keep the warmth in.'),
      daybook: S('The station desk, with the daybook open on it.'),
      desk: S('The desk. Under the inkstand, a relief worker\'s daybook, open at the last page.'),
      cart: S('A handcart of relief stores: sacks of meal, a crate of lamp oil, blankets tied in tens. The tally chalked on the shaft has been rubbed out and written again, lower.'),
      crates: S('Relief crates, stencilled WHISPER-GROVE STATION. The lids are nailed down. Nobody came to open them.'),
      stove: S('The office stove. The door is shut on a grate of black water.'),
      shelves: S('Pigeonholes, each with a household\'s number on a brass tab, each with a folded slip in it.'),
      shoes: S('Shoes, in pairs, tied by the laces, each pair with a paper tag. The tags have a number on them. Some have a name under the number, in pencil, added later.'),
      coatHook: S('A child\'s coat on a hook, with a tag on the button: UNCLAIMED.'),
      specs: S('Spectacles in a tray, folded, each pair on its own slip of paper. The slips are blank.'),
    },
    notices: {
      a: S('NOTICE. Residents of the Loop Quarters are not to be addressed by name. Names are recorded at intake and need not be repeated. Repetition is not conversation. Restorative Administration, Whisper-Grove Station.'),
      b: S('RELIEF ISSUE. Bread: one loaf per household per Memoryday. Households are counted by the places set at table. Where a place is set for an absent member, the place is not counted.'),
      c: S('STAFF. Clerks who find they have said a sentence twice are to stop work, record the sentence, and report to the station desk. This is not a disciplinary matter.'),
      board: S('STORES BOARD, in three hands. Painted: RELIEF CONVOY, 416. WHISPER-GROVE. In chalk, neat: Stores reassigned to Restorative Administration. In chalk, lower, larger: No further issue. Workers unable to continue.'),
    },
    docs: {
      ledgerTitle: S('Ledger: Lantern Row, page four'),
      ledgerBody: S('No. 11. Fell. Two adults. Present. Loop recorded: "the bread\'s for Thursday." Issue: bread, two.<br>No. 12. Quill. One adult. Present. Loop recorded: "mind the water." Issue: bread, one.<br>No. 13. Door open. Meal on the table. Nobody present. Not counted.<br>No. 14. Marr. Mother, one child. Present. Loop recorded (mother): "come in now." Loop recorded (child): none. Child does not speak. Issue: bread, two.<br><br>Carry the two. Balance forward.'),
      daybookTitle: S('Daybook, station desk'),
      daybookBody: S('Memoryday. Issue completed, Lantern Row. Clerk Abelard reports a sentence. Sentence recorded.<br>Dawnday. Clerk Abelard reports a sentence. The same sentence. Recorded again.<br>Nullday. The desk is short two clerks. Coats to stay on the chairs, in case the clerks wish to collect them.'),
      lastTitle: S('A relief worker\'s last page'),
      lastBody: S('In pencil, in a hand that gets larger toward the end:<br><br><i>Issued bread on Lantern Row. Bettrys at No. 11 asked me where Wren\'s cloak was. I said, on the peg. She asked again, the same words. I said, on the peg.<br><br>I have been writing the names into the register at night, so that they are somewhere. The Office has numbers. A number is somewhere, but it is not a place you can go.<br><br>Today I said a sentence twice at the desk and did not notice until Hesk told me. I have put the register on the desk where it will be found. Whoever reads this: they are not numbers. Read them out.<br><br>M. Orly, relief.</i>'),
      close: S('Close it'),
    },
    reg: {
      item: S('The Relief Register'),
      desc: S('A relief register, swollen with water and still legible: the households of the Loop Quarters, in pencil, in a hand that is not the Office\'s. Not numbers. Names.'),
      label: S('A register, open on the desk, weighted with an inkstand.'),
      take: S('You close the register and take it. It is heavier than paper should be.'),
      title: S('The Relief Register'),
      body: S('Lantern Row, in pencil, a household to a line, written at night:<br><br>Halm and Bettrys Fell, and Wren, nine. Aster Quill. Lettice Marr and her boy Tamsin. Cobb Annory. Jory Mapp, who kept the lamps. Hewe Partridge.<br><br>Under them, the same hand: <i>More tomorrow.</i>'),
      close: S('Close it gently'),
      journal: S('Under the Sunken Court, in the drowned offices of the Synod\'s restorative administration, I found a relief worker\'s register: the households of Lantern Row, by name, written at night so that they would be somewhere. The Office kept numbers. I have entered the names in my ledger.'),
      where: S('the relief register, under the Sunken Court'),
    },
    exit: {
      up: S('You go up into the light, and out into the pool.'),
    },
    cap: {
      under: S('[Water closes over your head]'),
      gasp: S('[You gasp for air]'),
      heart: S('[Your heartbeat, loud]'),
      bubbles: S('[Bubbles]'),
      muffled: S('[Every sound comes from a long way off]'),
    },
    j: {
      dive: S('Under the deep pool in the Sunken Court a stair goes on down into the drowned Lower Plazas, where the Synod\'s restorative administration kept its offices. The water is still. There is air caught under some of the vaults.'),
    },
    sable: {
      title: S('The relief register'),
      s: S('"Entry: you have brought a register up from under the Court. Not the Office\'s. Pencil, a hand I do not know, and every line a name." She does not reach for it.'),
      o1: S('"It\'s yours to read."'),
      r1: S('"No. It is yours. You went down for it." She reads the first line with her lips only. "Entry: Fell, Lantern Row. I had that household as a number. I had it as eleven."'),
      o2: S('"The Office only kept numbers."'),
      r2: S('"Entry: the Office keeps what it can carry. A name is heavy. Somebody down there carried them anyway, at night, after the desk was shut."'),
      o3: S('"Will you read them out?"'),
      r3: S('"At the water, when it rises. One lantern each. It will take some nights. I have the nights."'),
    },
  };
  // the names entered in the Ledger [PROPOSED, all]
  const NAMES = ['Halm Fell', 'Bettrys Fell', 'Wren Fell', 'Aster Quill', 'Lettice Marr', 'Tamsin Marr', 'Cobb Annory', 'Jory Mapp', 'Hewe Partridge'];

  // ---------------------------------------------------------------- state: flags (validated on every read)
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object' && !Array.isArray(G.flags);
  const flags = () => (hasG() ? G.flags : {});
  const FLAGS = { p16d_air: [0, 5], p16d_seen: [0, 255], p16d_dives: [0, 99], p16d_j: [0, 3], p16d_reg: 'b' };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    if (!r || r === 'b') return 0;
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0;
  }
  function fset(k, v) { const r = FLAGS[k]; if (!r || !hasG()) return; try { G.flags[k] = r === 'b' ? true : Math.max(r[0], Math.min(r[1], Math.floor(v))); } catch (e) { /* a save that cannot hold flags */ } }
  const fbool = (k) => flags()[k] === true;
  function sanitize() {
    if (!hasG()) return;
    for (const k of Object.keys(G.flags)) {
      if (k.indexOf('p16d_') !== 0) continue;
      const r = FLAGS[k], v = G.flags[k];
      if (!r) { delete G.flags[k]; continue; }
      if (r === 'b') { if (v !== true) delete G.flags[k]; }
      else if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete G.flags[k];
    }
  }
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('deep16: ' + k + ' failed', e); } };
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c || '', ms || 4000); } catch (e) { /* cosmetic */ } };
  const part3 = () => { const f = flags(); return !!(f.part3 || f.part4); };
  const on = () => cfg.on !== false;
  const viewOn = () => cfg.view !== false && typeof GFX !== 'undefined' && GFX.deepView === true;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------------------------------------------------------------- the map
  // rooms: [id, x0, y0, x1, y1, level]; carved in order, so the later ones win where they touch
  const ROOMS = [
    { id: 'well', x0: 1, y0: 1, x1: 5, y1: 5, lv: LV.U },
    { id: 'notices', x0: 7, y0: 1, x1: 17, y1: 7, lv: LV.U },
    { id: 'filing', x0: 7, y0: 10, x1: 21, y1: 19, lv: LV.M },
    { id: 'clerks', x0: 23, y0: 10, x1: 31, y1: 17, lv: LV.M },
    { id: 'stair', x0: 33, y0: 10, x1: 37, y1: 19, lv: LV.M },
    { id: 'depot', x0: 22, y0: 20, x1: 38, y1: 30, lv: LV.D },
    { id: 'office', x0: 12, y0: 22, x1: 20, y1: 30, lv: LV.D },
    { id: 'returns', x0: 2, y0: 21, x1: 10, y1: 30, lv: LV.D },
  ];
  const LINKS = [   // archways and the broken stair between rooms
    { x0: 6, y0: 2, x1: 6, y1: 3, lv: LV.U },
    { x0: 13, y0: 8, x1: 15, y1: 9, lv: LV.S },
    { x0: 22, y0: 13, x1: 22, y1: 14, lv: LV.M },
    { x0: 32, y0: 12, x1: 32, y1: 13, lv: LV.M },
    { x0: 21, y0: 25, x1: 21, y1: 26, lv: LV.D },
    { x0: 11, y0: 24, x1: 11, y1: 25, lv: LV.D },
  ];
  // air pockets (index = p16d_air): the cells under a vault that still holds air
  const POCKETS = [
    { id: 'A', x0: 2, y0: 2, x1: 4, y1: 4, at: [3.5, 3.5], dir: 0, exit: 'A' },          // Well Three: the way in, and out
    { id: 'D', x0: 14, y0: 17, x1: 15, y1: 18, at: [15.0, 18.0], dir: -Math.PI / 2 },    // the fallen vault in the filing hall
    { id: 'B', x0: 30, y0: 10, x1: 31, y1: 11, at: [31.0, 11.0], dir: Math.PI },         // the clerks' room
    { id: 'F', x0: 36, y0: 20, x1: 37, y1: 21, at: [37.0, 21.0], dir: Math.PI, exit: 'F' }, // the lamp-shaft: the second way out
    { id: 'E', x0: 19, y0: 25, x1: 20, y1: 26, at: [20.0, 26.0], dir: Math.PI },        // the register office, inside the arch
    { id: 'G', x0: 2, y0: 21, x1: 3, y1: 22, at: [3.0, 22.0], dir: Math.PI / 2 },       // the returns room
  ];
  const EXITS = {
    A: { at: [3.5, 2.4], portal: { map: 'whispergrove', x: 13.5, y: 34.5, dir: Math.PI }, label: 'rope' },
    F: { at: [37.0, 20.5], portal: { map: 'whispergrove', x: 37.5, y: 32.5, dir: 0 }, label: 'shaft' },
  };
  const DIVE_AT = [15.5, 34.5];                     // the deep pool south-west of the Court (deep cells 14-16, 33-35)
  const REG_AT = [16.5, 24.6];
  // low furniture you can swim over: [x0, y0, x1, y1, height above its floor, texture]
  const LOWS = [
    [9, 5, 16, 5, 0.75, 'p16d_counter'],              // the intake counter
    [8, 12, 13, 12, 1.4, 'p16d_drawers'], [15, 12, 20, 12, 1.4, 'p16d_drawers'],
    [8, 14, 9, 14, 1.4, 'p16d_drawers'], [11, 14, 20, 14, 1.4, 'p16d_drawers'],
    [8, 16, 18, 16, 1.4, 'p16d_drawers'],
  ];
  function roomOf(x, y) {
    for (let i = ROOMS.length - 1; i >= 0; i--) { const r = ROOMS[i]; if (x >= r.x0 && x < r.x1 + 1 && y >= r.y0 && y < r.y1 + 1) return i; }
    return -1;
  }
  function pocketOf(x, y) {
    for (let i = 0; i < POCKETS.length; i++) { const p = POCKETS[i]; if (x >= p.x0 && x < p.x1 + 1 && y >= p.y0 && y < p.y1 + 1) return i; }
    return -1;
  }
  const inMap = () => hasG() && G.mapId === MAPID && G.map && G.map.id === MAPID;
  const realMap = (m) => m && m.id === MAPID && m.w === W && m.h === H;

  function buildMap() {
    const m = new GameMap(MAPID, TX.mapName, W, H, { floor: 't_marble', ceil: 't_stone', fogDist: 11, ambient: 0.28, fogColor: [10, 28, 32], music: 'cloister', danger: 1, spawn: { x: POCKETS[0].at[0], y: POCKETS[0].at[1], dir: 0 } });
    m.rect(0, 0, W - 1, H - 1, 't_greymarble');
    m.ceilZ = B.CEIL;
    m.ensureLvls();
    const carve = (r) => { for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { m.set(x, y, null); m.setLvl(x, y, r.lv); } };
    ROOMS.forEach(carve); LINKS.forEach(carve);
    // the deep stair steps down: 1.0 at the top, 0.5, then the depot floor
    for (let y = 14; y <= 16; y++) for (let x = 33; x <= 37; x++) m.setLvl(x, y, LV.s);
    for (let y = 17; y <= 19; y++) for (let x = 33; x <= 37; x++) m.setLvl(x, y, LV.D);
    for (const [x0, y0, x1, y1, ht, tex] of LOWS) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const lv = m.lvls[y * W + x]; m.block(x, y, tex, lv + ht, { p16dLow: true, capTex: tex === 'p16d_counter' ? 't_marble' : 't_wood' }); }
    // the ceilings that hold air are silver
    m.ceilTextures = ['t_stone', 'p16d_airceil']; m.ceilCells = new Uint8Array(W * H);
    for (const p of POCKETS) for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) m.ceilCells[y * W + x] = 1;
    // the depot's columns: they hold the vault up, and they are the only way to judge how far anything is
    for (const [x, y] of [[25, 24], [29, 24], [33, 24], [25, 28], [29, 28], [33, 28]]) m.set(x, y, WALL('t_greymarble'));
    // the side of a raised floor is old marble
    m.setSide(0, 0, W - 1, H - 1, 't_greymarble');

    const lvAt = (x, y) => m.lvls[(y | 0) * W + (x | 0)];
    const look = (sprite, x, y, k, o) => m.add(Object.assign({ kind: 'deco', sprite, x, y, solid: true, radius: 0.3, use: 'p16d_look', _k: k, label: TX.look[k] || TX.notices[k] || '' }, o || {}));
    const weed = (x, y, s) => m.add({ kind: 'deco', sprite: 'p16d_weed', x, y, solid: false, radius: 0.15, scale: s || 0.7, glow: 0.62, lightCol: [30, 22, 52], use: 'p16d_look', _k: 'weed', label: TX.look.weed });
    // the air: a trembling skin under each pocket's vault (not pickable: it hangs over the exits)
    for (const p of POCKETS) {
      const cx = (p.x0 + p.x1 + 1) / 2, cy = (p.y0 + p.y1 + 1) / 2, lv = lvAt(cx, cy);
      m.add({ kind: 'deco', sprite: 'p16d_air', x: cx, y: cy, solid: false, radius: 0.1, scale: 0.34, yOff: -(B.CEIL - 0.3 - lv), glow: 0.75, lightCol: [24, 40, 44], nopick: true, _k: 'air', label: TX.look.air });
    }
    // the ways out
    look('p16d_rope', EXITS.A.at[0], EXITS.A.at[1], 'rope', { use: 'p16d_exit', _x: 'A', solid: false, radius: 0.15, scale: 1.45 });
    look('p16d_rope', EXITS.F.at[0], EXITS.F.at[1], 'shaft', { use: 'p16d_exit', _x: 'F', solid: false, radius: 0.15, scale: 3.45 });
    // Well Three
    look('sign', 1.5, 4.6, 'wellSign', { radius: 0.2, scale: 0.7 });
    weed(4.6, 1.6, 0.6); weed(1.6, 1.8, 0.5);
    // the notice hall
    look('p16d_notice', 9.5, 1.3, 'a', { radius: 0.2, scale: 0.75, use: 'p16d_look' });
    look('p16d_notice', 12.5, 1.3, 'b', { radius: 0.2, scale: 0.75 });
    look('p16d_notice', 15.5, 1.3, 'c', { radius: 0.2, scale: 0.75 });
    look('chair', 8.2, 3.2, 'bench', { radius: 0.2, scale: 0.5 }); look('chair', 8.2, 4.0, 'bench', { radius: 0.2, scale: 0.5 });
    weed(17.2, 7.2, 0.8); weed(7.6, 6.8, 0.6);
    // the filing hall
    look('p16d_ledgers', 10.5, 18.6, 'ledgers', { radius: 0.4, scale: 0.55, _doc: 'ledger' });
    look('p16d_ledgers', 19.6, 10.6, 'ledgers', { radius: 0.4, scale: 0.5 });
    m.add({ kind: 'deco', sprite: 'p16d_ledgers', x: 13.2, y: 18.8, solid: true, radius: 0.35, scale: 0.42, use: 'p16d_look', _k: 'ledgers', label: TX.look.ledgers });
    weed(20.5, 18.6, 0.9); weed(7.6, 19.0, 0.7); weed(16.6, 10.4, 0.6);
    // the clerks' room
    [[25.0, 12.0], [28.0, 12.0], [25.0, 15.2], [28.0, 15.2]].forEach(([x, y], i) => {
      look('table', x, y, i === 0 ? 'daybook' : 'cup', { radius: 0.5, scale: 0.6, _doc: i === 0 ? 'daybook' : undefined });
      look('p16d_coatchair', x, y + 0.8, 'coat', { radius: 0.25, scale: 0.6 });
    });
    weed(23.6, 16.6, 0.8); weed(31.2, 16.4, 0.6);
    // the stair down
    weed(33.5, 15.5, 0.8); weed(37.4, 18.0, 0.9);
    // the depot
    [[25.0, 22.0], [27.4, 22.0], [29.8, 22.0], [32.2, 22.0]].forEach(([x, y]) => look('p16d_cart', x, y, 'cart', { radius: 0.55, scale: 0.75 }));
    look('crates', 23.6, 27.0, 'crates', { radius: 0.45, scale: 0.8 }); look('crates', 26.8, 29.6, 'crates', { radius: 0.45, scale: 0.8 }); look('crates', 31.2, 29.5, 'crates', { radius: 0.45, scale: 0.8 });
    [[27.0, 26.2], [31.0, 26.2], [35.2, 25.6]].forEach(([x, y]) => look('p16d_cart', x, y, 'cart', { radius: 0.55, scale: 0.75 }));
    look('crates', 34.6, 27.8, 'crates', { radius: 0.45, scale: 0.8 }); look('crates', 36.8, 29.2, 'crates', { radius: 0.45, scale: 0.8 });
    look('p16d_notice', 30.0, 20.3, 'board', { radius: 0.2, scale: 0.9 });
    weed(22.6, 20.6, 1.0); weed(38.2, 24.6, 0.9); weed(29.0, 23.2, 0.8); weed(22.8, 25.0, 0.8); weed(25.0, 29.0, 0.9); weed(33.0, 27.2, 0.8); weed(37.6, 30.2, 1.0); weed(27.6, 20.6, 0.7);
    // the register office
    look('table', 16.5, 24.0, 'desk', { radius: 0.5, scale: 0.65, _doc: 'last' });
    look('hearth', 19.6, 22.6, 'stove', { radius: 0.3, scale: 0.7, glow: 0 });
    look('shelf', 12.4, 23.0, 'shelves', { radius: 0.2, scale: 0.9 }); look('shelf', 20.6, 28.0, 'shelves', { radius: 0.2, scale: 0.9 });
    m.add({ kind: 'item', item: 'p16d_register', x: REG_AT[0], y: REG_AT[1], sprite: 'p16d_book', scale: 0.3, yOff: -0.42, solid: false, label: TX.reg.label });
    weed(13.0, 25.8, 0.8); weed(20.4, 30.4, 0.7);
    // the returns room
    look('shelf', 2.4, 22.5, 'shoes', { radius: 0.2, scale: 0.9 }); look('shelf', 2.4, 26.0, 'shoes', { radius: 0.2, scale: 0.9 });
    look('p16d_coathook', 6.0, 21.3, 'coatHook', { radius: 0.2, scale: 0.55 });
    look('table', 7.5, 27.5, 'specs', { radius: 0.5, scale: 0.6 });
    weed(9.6, 21.6, 0.8); weed(4.4, 29.8, 0.7);
    // three Drowned Hollows, far back, guarding (they see you only close up)
    m.enemy('drowned', 3.6, 29.2, { guard: true, p16d: true });
    m.enemy('drowned', 24.2, 29.6, { guard: true, p16d: true });
    m.enemy('drowned', 37.4, 27.0, { guard: true, p16d: true });
    m.baseCount = m.entities.length;
    return m;
  }

  // ---------------------------------------------------------------- procedural stand-in art (cached once)
  function paintPx(w, h, draw, hard) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    if (hard !== false) for (let i = 0; i < w * h; i++) { const o = i * 4; u8[o + 3] = u8[o + 3] < 100 ? 0 : 255; }
    return new Uint32Array(id.data.buffer.slice(0));
  }
  function reg(name, w, h, draw, emitTest) {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    const data = paintPx(w, h, draw);
    Engine.addSprite(name, { w, h, data, hs: 1, cx: 0.5, dy: 0 });
    if (emitTest && Engine.setEmissive) {
      const mask = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) { const p = data[i]; if ((p >>> 24) > 100 && emitTest(p & 255, (p >> 8) & 255, (p >> 16) & 255)) mask[i] = 1; }
      Engine.setEmissive(name, mask);
    }
  }
  function tex(name, draw) {
    if (typeof Engine === 'undefined' || !Engine.addTexture) return;
    try { Engine.addTexture(name, paintPx(64, 64, draw, false)); } catch (e) { warnOnce('tex ' + name, e); }
  }
  // a tiny seeded stream for the art only (never Math.random)
  function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function paintAll() {
    tex('p16d_airceil', (c) => {               // trapped air seen from below: the underside of a skin of water, dark, with light in its creases
      const r = rng(161);
      c.fillStyle = '#2c4446'; c.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 60; i++) { const x = r() * 64, y = r() * 64, rr = 2 + r() * 6, l = 70 + r() * 50 | 0; c.fillStyle = `rgba(${l - 10},${l + 20},${l + 18},${0.25 + r() * 0.3})`; c.beginPath(); c.ellipse(x, y, rr, rr * 0.6, r() * 3, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = 'rgba(190,230,222,0.55)'; c.lineWidth = 1;
      for (let i = 0; i < 7; i++) { const y0 = i * 9 + 2 + r() * 3; c.beginPath(); c.moveTo(0, y0); c.bezierCurveTo(18, y0 - 4, 38, y0 + 5, 64, y0); c.stroke(); }
    });
    tex('p16d_drawers', (c) => {              // filing drawers: oak, a grid of drawer fronts with pale label cards
      c.fillStyle = '#3a2c1e'; c.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const X = x * 16, Y = y * 16;
        c.fillStyle = '#5a4430'; c.fillRect(X + 1, Y + 1, 14, 14); c.fillStyle = '#4a3826'; c.fillRect(X + 1, Y + 12, 14, 3);
        c.fillStyle = '#c8c2a4'; c.fillRect(X + 4, Y + 4, 8, 4); c.fillStyle = '#2a2014'; c.fillRect(X + 5, Y + 5, 6, 1);
        c.fillStyle = '#8a7a56'; c.fillRect(X + 7, Y + 10, 2, 2);
      }
    });
    tex('p16d_counter', (c) => {              // the intake counter: marble panels with a brass rail
      c.fillStyle = '#9a9690'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#86827c'; for (let x = 0; x < 64; x += 16) c.fillRect(x + 2, 8, 12, 50);
      c.fillStyle = '#b8a060'; c.fillRect(0, 2, 64, 3); c.fillStyle = '#6a5a30'; c.fillRect(0, 5, 64, 1);
    });
    const rope = (c, w, h, col) => { c.fillStyle = col; for (let y = 0; y < h; y += 3) { c.fillRect(w / 2 - 1.5 + ((y / 3) % 2), y, 3, 3); } c.fillStyle = 'rgba(255,255,230,0.35)'; for (let y = 0; y < h; y += 6) c.fillRect(w / 2, y, 1, 2); };
    reg('p16d_rope', 12, 120, (c, w, h) => { rope(c, w, h, '#8a7a5a'); c.fillStyle = '#6a5a3a'; for (let y = 14; y < h; y += 26) c.fillRect(w / 2 - 3, y, 6, 4); });
    reg('p16d_rail', 40, 48, (c) => {        // the top of a drowned stair rail, brass, with a rope tied off and going down
      c.fillStyle = '#8a7438'; c.fillRect(6, 10, 4, 38); c.fillRect(30, 18, 4, 30); c.fillRect(4, 8, 32, 3);
      c.fillStyle = '#c8a858'; c.fillRect(6, 8, 30, 1); c.fillRect(7, 11, 1, 36);
      c.fillStyle = '#9a8a62'; for (let y = 11; y < 48; y += 3) c.fillRect(20 + ((y / 3) % 2), y, 3, 3);
      c.fillStyle = '#6a5a3a'; c.fillRect(17, 8, 9, 5);
    });
    reg('p16d_air', 64, 14, (c) => {         // the underside of a pocket of air: a silver lens
      const g = c.createRadialGradient(32, 7, 2, 32, 7, 30); g.addColorStop(0, '#e8f4f0'); g.addColorStop(0.6, '#9cc0bc'); g.addColorStop(1, '#5a7a7a');
      c.fillStyle = g; c.beginPath(); c.ellipse(32, 7, 31, 6, 0, 0, Math.PI * 2); c.fill();
    }, (r, g, b) => r + g + b > 330);
    reg('p16d_weed', 24, 48, (c) => {        // phosphorescent weed, lilac, lit from inside
      for (let i = 0; i < 6; i++) {
        const x0 = 4 + i * 3.2, sway = (i % 2 ? 3 : -3);
        c.strokeStyle = i % 2 ? '#c8a8f0' : '#a888d8'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x0, 48); c.bezierCurveTo(x0 + sway, 34, x0 - sway, 20, x0 + sway * 0.6, 6 + (i % 3) * 4); c.stroke();
      }
      c.fillStyle = '#f0e0ff'; for (let i = 0; i < 6; i++) c.fillRect(4 + i * 3.4, 8 + (i % 3) * 5, 2, 2);
    }, (r, g, b) => b > 150);
    reg('p16d_notice', 40, 44, (c) => {      // a notice board, the paper gone soft
      c.fillStyle = '#3a2e22'; c.fillRect(2, 2, 36, 30); c.fillStyle = '#4a3c2c'; c.fillRect(18, 32, 4, 12);
      c.fillStyle = '#cfc8b0'; c.fillRect(5, 5, 14, 18); c.fillRect(21, 6, 14, 22);
      c.fillStyle = '#5a5444'; for (let y = 8; y < 21; y += 3) c.fillRect(7, y, 10, 1); for (let y = 9; y < 26; y += 3) c.fillRect(23, y, 10, 1);
      c.fillStyle = '#8a1a1a'; c.fillRect(11, 19, 3, 3);                                   // an Office seal
    });
    reg('p16d_ledgers', 36, 26, (c) => {     // swollen ledgers in a heap
      const cols = ['#4a3a2a', '#3a3428', '#5a4632', '#463a30'];
      for (let i = 0; i < 6; i++) { const y = 22 - i * 3.6, x = 4 + (i % 3) * 2.5; c.fillStyle = cols[i % 4]; c.fillRect(x, y, 26 - (i % 2) * 3, 4); c.fillStyle = '#c8bea0'; c.fillRect(x + 1, y + 1, 24 - (i % 2) * 3, 1); }
    });
    reg('p16d_coatchair', 32, 46, (c) => {   // a chair with a coat over its back, buttoned
      c.fillStyle = '#3a2a1a'; c.fillRect(7, 30, 18, 3); c.fillRect(8, 33, 3, 13); c.fillRect(21, 33, 3, 13); c.fillRect(8, 6, 3, 26); c.fillRect(21, 6, 3, 26);
      c.fillStyle = '#2c3038'; c.beginPath(); c.moveTo(5, 7); c.lineTo(27, 7); c.lineTo(28, 31); c.lineTo(4, 31); c.closePath(); c.fill();
      c.fillStyle = '#1e2228'; c.fillRect(15, 7, 2, 24); c.fillStyle = '#9a8a5a'; for (let y = 11; y < 30; y += 5) c.fillRect(13, y, 2, 2);
      c.fillStyle = '#d8d0b8'; c.fillRect(19, 9, 1, 5);                                  // a pen in the breast pocket
    });
    reg('p16d_cart', 56, 36, (c) => {        // a relief handcart, loaded, shafts down
      c.fillStyle = '#4a3a26'; c.fillRect(6, 16, 36, 4); c.fillRect(40, 18, 16, 2);
      c.fillStyle = '#7a6a48'; c.fillRect(8, 6, 14, 10); c.fillStyle = '#8a7a58'; c.fillRect(22, 8, 12, 8); c.fillStyle = '#5a5a5a'; c.fillRect(34, 9, 7, 7);
      c.strokeStyle = '#2a2014'; c.lineWidth = 2; c.beginPath(); c.arc(16, 27, 7, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(34, 27, 7, 0, Math.PI * 2); c.stroke();
    });
    reg('p16d_coathook', 24, 44, (c) => {   // a child's coat on a hook, a tag on the button
      c.fillStyle = '#5a5a5a'; c.fillRect(11, 2, 2, 4);
      c.fillStyle = '#6a3a3a'; c.beginPath(); c.moveTo(12, 5); c.lineTo(20, 12); c.lineTo(19, 36); c.lineTo(5, 36); c.lineTo(4, 12); c.closePath(); c.fill();
      c.fillStyle = '#e0d8c0'; c.fillRect(13, 18, 5, 4); c.fillStyle = '#2a1a1a'; c.fillRect(11, 14, 2, 2);
    });
    reg('p16d_book', 28, 20, (c) => { c.fillStyle = '#3a2a1e'; c.fillRect(2, 6, 24, 12); c.fillStyle = '#d8d0b4'; c.fillRect(4, 4, 10, 12); c.fillRect(14, 4, 10, 12); c.fillStyle = '#4a4438'; for (let y = 6; y < 15; y += 2) { c.fillRect(5, y, 8, 1); c.fillRect(15, y, 8, 1); } });
  }

  // ---------------------------------------------------------------- items
  function installItems() {
    if (typeof ITEMS === 'undefined') return;
    if (!ITEMS.p16d_register) ITEMS.p16d_register = { name: TX.reg.item, sprite: 'p16d_book', use: 'p16d_register', value: 0, key: true, desc: TX.reg.desc };
    try { if (typeof ICONS !== 'undefined' && ICONS.TABLE) ICONS.TABLE.p16d_register = ['ledger', {}]; } catch (e) { /* icon fallback */ }
    try { if (typeof ITEM_WEIGHTS !== 'undefined' && ITEM_WEIGHTS.p16d_register == null) ITEM_WEIGHTS.p16d_register = 0.5; } catch (e) { /* optional */ }
  }

  // ---------------------------------------------------------------- transient swim state (never saved)
  const T = {
    z: 0.5, vz: 0, vx: 0, vy: 0, breath: B.BREATH, max: B.BREATH, warn: 0, emptyT: 0, drownT: 0, hurtMsgT: -99,
    surfaced: false, U: 0, dt: 1 / 60, pm: false, room: -1, arrive: null, clock: 0, firstAir: false, said: {},
    weaponSaid: false, capT: {}, floor: 0, ext: 0, hudT: 0, motes: null, gasped: false,
  };
  function breathMax() {
    let k = B.BREATH;
    try { const e = Number(G.player.attrs.Endurance) || 0; k += clamp((e - 40) * B.BREATH_END, 0, B.BREATH_END_MAX); } catch (e) { /* no player yet */ }
    return k;
  }
  const swimming = () => inMap();     // never gated by the content switch: whoever is down here can always swim out
  const underwater = () => swimming() && !T.surfaced;
  function zTopAt(x, y) { return pocketOf(x, y) >= 0 ? B.ZTOP_AIR : B.ZTOP; }
  function groundAt(x, y) { try { return G.map.groundAt(x, y); } catch (e) { return 0; } }
  // can the swimmer's body be in cell (cx, cy) with the eye at z? (walls no; low furniture only from above; floors only above)
  function cellOpen(m, cx, cy, z) {
    if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h) return false;
    const c = m.cells[cy * m.w + cx], lv = m.lvls ? m.lvls[cy * m.w + cx] : 0;
    if (c) { if (c.p16dLow && c.top != null) return z - B.BODY >= c.top; if (c.door) return !m.isSolidCell(cx, cy); return false; }
    return z - B.BODY >= lv - 1e-6;
  }
  function swimSolid(x, y) {
    const m = G.map, r = 0.24;
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (!cellOpen(m, (x + dx) | 0, (y + dy) | 0, T.z)) return true;
    for (const e of G.ents) { if (!e.solid || e.hidden || e.dead) continue; const rr = (e.radius || 0.3) + 0.22; if ((x - e.x) * (x - e.x) + (y - e.y) * (y - e.y) < rr * rr) return true; }
    return false;
  }

  // ---------------------------------------------------------------- captions, messages
  function capLine(text, gap) {
    try {
      if (gap && T.clock - (T.capT[text] || -1e9) < gap) return;
      T.capT[text] = T.clock;
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      let box = document.getElementById('ac-captions');
      if (!box) { const g = document.getElementById('game'); if (!g) return; box = document.createElement('div'); box.id = 'ac-captions'; box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', 'Sound captions'); g.appendChild(box); }
      const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
      while (box.children.length > 4) box.removeChild(box.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* captions are cosmetic */ }
  }

  // ---------------------------------------------------------------- audio: the master low-pass as a floor; the music ducked
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  let _muffle = null;
  function setFloor(v) {
    v = clamp(v, 0, 1);
    if (Math.abs(v - T.floor) < 0.005) return;
    T.floor = v;
    try { if (_muffle) _muffle.call(Audio_, Math.max(T.ext, T.floor)); } catch (e) { /* audio optional */ }
  }
  function musicVol(vol) { return underwater() ? (vol == null ? 1 : vol) * B.MUSIC_DUCK : vol; }
  function wireAudio() {
    if (typeof Audio_ === 'undefined') return;
    if (typeof Audio_.muffle === 'function' && !Audio_.muffle._p16d) {
      _muffle = Audio_.muffle;
      const w = function (a) { T.ext = clamp(+a || 0, 0, 1); return _muffle.call(Audio_, Math.max(T.ext, T.floor)); };
      w._p16d = true;
      try { Audio_.muffle = w; } catch (e) { _muffle = null; }
    }
    const M = Audio_.music;
    if (M && typeof M.request === 'function' && !M.request._p16d) {
      const _req = M.request;
      const w = function (id, vol, rate) { try { if (id && underwater()) return _req.call(this, id, musicVol(vol), rate); } catch (e) { warnOnce('music', e); } return _req.apply(this, arguments); };
      w._p16d = true; M.request = w;
    }
    const sfx = Audio_.sfx;
    if (sfx && typeof sfx.step === 'function' && !sfx.step._p16d) {
      const _step = sfx.step;
      const w = function (surface) { try { if (swimming()) { T.stroke = (T.stroke || 0) + 1; return (T.stroke % 2) ? undefined : _step.call(this, 'water'); } } catch (e) { warnOnce('step', e); } return _step.apply(this, arguments); };
      // pass the inner wrapper's hooks through (house13 keeps the game's step on ._orig, and a test may swap a spy there)
      for (const k of ['_orig', '_test', '_p13h']) {
        if (k in _step) Object.defineProperty(w, k, { configurable: true, enumerable: true, get: () => _step[k], set: (v) => { _step[k] = v; } });
      }
      w._p16d = true; sfx.step = w;
    }
  }
  function gaspSound() {
    if (!audioOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, n = ctx.createBufferSource(), len = (ctx.sampleRate * 0.5) | 0, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      const r = rng(T.clock * 1000 | 0); for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
      n.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      n.connect(f).connect(g).connect(Audio_.sfxBus); n.start(t); n.stop(t + 0.55);
    } catch (e) { /* sound is optional */ }
  }

  // ---------------------------------------------------------------- the HUD breath meter (DOM; role=meter)
  let hud = null;
  function ensureHud() {
    if (hud && hud.isConnected) return hud;
    if (typeof document === 'undefined') return null;
    const g = document.getElementById('game'); if (!g) return null;
    hud = document.createElement('div'); hud.id = 'p16d-breath'; hud.setAttribute('role', 'meter');
    hud.setAttribute('aria-label', TX.breath.label); hud.setAttribute('aria-valuemin', '0'); hud.setAttribute('aria-valuemax', '100');
    const lab = document.createElement('span'); lab.className = 'p16d-lab'; lab.textContent = TX.breath.label;
    const bar = document.createElement('span'); bar.className = 'p16d-bar'; bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span'); fill.className = 'p16d-fill'; bar.appendChild(fill);
    hud.appendChild(lab); hud.appendChild(bar); hud.hidden = true;
    g.appendChild(hud);
    return hud;
  }
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('deep16-style')) return;
    const s = document.createElement('style'); s.id = 'deep16-style';
    s.textContent = [
      '#p16d-breath { position: absolute; left: 50%; bottom: 43cqh; transform: translateX(-50%); width: 20cqw; display: flex; align-items: center; gap: .8cqw; padding: .5cqh .9cqw; background: rgba(6,18,20,.62); border: 1px solid rgba(160,200,196,.45); border-radius: .6cqw; pointer-events: none; z-index: 5; font-family: var(--font-sc, serif); font-size: 1.6cqw; color: #d8ece6; }',
      '#p16d-breath[hidden] { display: none; }',
      '#p16d-breath .p16d-bar { flex: 1; height: 1.4cqh; min-height: 4px; background: rgba(0,0,0,.55); border-radius: .4cqw; overflow: hidden; }',
      '#p16d-breath .p16d-fill { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #6fb7ad, #c8eae2); transition: width .2s linear; }',
      '#p16d-breath.low .p16d-fill { background: linear-gradient(90deg, #c09048, #e8c888); }',
      '#p16d-breath.crit .p16d-fill { background: linear-gradient(90deg, #a83a2a, #e07a5a); }',
      '#p16d-breath.crit { border-color: #e07a5a; }',
      '#p16d-breath.pulse { animation: p16dPulse 1.1s ease-in-out infinite; }',
      '@keyframes p16dPulse { 0%,100% { box-shadow: 0 0 0 rgba(224,122,90,0); } 50% { box-shadow: 0 0 1.2cqw rgba(224,122,90,.55); } }',
      'html.ac-hc #p16d-breath { background: #000; color: #fff; border-color: #fff; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }
  function updateHud(force) {
    const h = ensureHud(); if (!h) return;
    const show = swimming() && (!T.surfaced || T.breath < T.max - 0.01);
    if (h.hidden === show) h.hidden = !show;
    if (!show) return;
    if (!force && T.clock - T.hudT < 0.2) return;
    T.hudT = T.clock;
    const f = clamp(T.breath / T.max, 0, 1), pct = Math.round(f * 100);
    const fill = h.querySelector('.p16d-fill'); if (fill) fill.style.width = pct + '%';
    if (h.getAttribute('aria-valuenow') !== String(pct)) {
      h.setAttribute('aria-valuenow', String(pct));
      h.setAttribute('aria-valuetext', pct >= 100 ? TX.breath.full : TX.breath.pct.replace('{0}', String(pct)));
    }
    h.classList.toggle('low', f <= B.WARN[1] && f > B.WARN[2]);
    h.classList.toggle('crit', f <= B.WARN[2]);
    const pulse = f <= B.WARN[1] && !(typeof GFX !== 'undefined' && (GFX.noFlash || GFX.reduceMotion));
    h.classList.toggle('pulse', pulse);
  }

  // ---------------------------------------------------------------- breath
  function tickBreath(dt, moving, sprinting) {
    const p = G.player; if (!p) return;
    T.max = breathMax();
    const pk = pocketOf(Engine.cam.x, Engine.cam.y);
    const was = T.surfaced;
    T.surfaced = pk >= 0 && T.z >= B.WL;
    if (T.surfaced) {
      if (!was) {
        if (pk !== fint('p16d_air')) fset('p16d_air', pk);
        if (T.breath < T.max * 0.92) { capLine(TX.cap.gasp, 2); gaspSound(); }
        if (!T.firstAir) { T.firstAir = true; say(TX.breath.first, 'good', 5500); }
      }
      if (fint('p16d_air') !== pk) fset('p16d_air', pk);
      T.breath = Math.min(T.max, T.breath + B.REFILL * dt);
      T.emptyT = 0; T.drownT = 0;
      if (T.breath > T.max * B.WARN[0]) T.warn = 0;
      else if (T.breath > T.max * B.WARN[1]) T.warn = Math.min(T.warn, 1);
      return;
    }
    if (was) capLine(TX.cap.under, 4);
    const k = sprinting ? B.DRAIN_SPRINT : moving ? B.DRAIN : B.DRAIN_STILL;
    T.breath = Math.max(0, T.breath - k * dt);
    const f = T.breath / T.max;
    if (T.warn < 1 && f <= B.WARN[0]) { T.warn = 1; say(TX.breath.warn50, 'warn', 3500); capLine(TX.cap.bubbles); }
    if (T.warn < 2 && f <= B.WARN[1]) { T.warn = 2; say(TX.breath.warn25, 'warn', 4500); capLine(TX.cap.heart); }
    if (T.warn < 3 && f <= B.WARN[2]) { T.warn = 3; say(TX.breath.warn10, 'bad', 4000); capLine(TX.cap.heart); }
    if (T.breath <= 0) {
      if (T.warn < 4) { T.warn = 4; say(TX.breath.empty, 'bad', 5000); capLine(TX.cap.heart); }
      T.emptyT += dt;
      if (T.emptyT > B.GRACE) {
        T.drownT += dt;
        const dps = B.DROWN_DPS + (B.DROWN_MAX - B.DROWN_DPS) * clamp(T.drownT / B.DROWN_RAMP, 0, 1);
        p.hp -= dps * dt; G.hurtT = Math.max(G.hurtT || 0, 0.12);
        if (T.clock - T.hurtMsgT > 4) { T.hurtMsgT = T.clock; say(TX.breath.hurt, 'bad', 2500); }
        if (p.hp <= 0 && !G.dead) { try { die(TX.breath.death); } catch (e) { warnOnce('die', e); } }
      }
    }
  }

  // ---------------------------------------------------------------- per-frame swimming (wrapped around the game's update)
  function preUpdate(dt) { T.dt = dt; T.pm = false; }
  function inputVertical() {
    const k = G.keys || {};
    let v = 0;
    if (k[' ']) v += 1;
    if (k.x || k.control) v -= 1;
    return v;
  }
  function postUpdate(dt) {
    const c = Engine.cam, p = G.player, m = G.map;
    T.clock += dt;
    // the game's own fall-and-climb logic must not act on a swimmer: the feet stay on the floor below (combat and
    // collision code read them), and the eye is ours
    const ground = groundAt(c.x, c.y);
    if (p) { p.feet = ground; p.fallV = 0; p.fallFrom = null; p.tumble = false; }
    // the glide: when nothing pushed this frame, the body carries on and slows
    const hv = Math.hypot(T.vx, T.vy);
    if (!T.pm && hv > 0.01) {
      const d = Math.exp(-B.GLIDE * dt); T.vx *= d; T.vy *= d;
      if (Math.hypot(T.vx, T.vy) < 0.02) { T.vx = 0; T.vy = 0; }
      else if (_pm) { const r = _pm(c, T.vx * dt, T.vy * dt); if (r && r.bx) T.vx = 0; if (r && r.by) T.vy = 0; }
    }
    // up and down: keys, plus the look when swimming forward
    const vin = inputVertical();
    const fwd = (Math.cos(c.dir) * T.vx + Math.sin(c.dir) * T.vy) / B.SWIM;
    const pitch = clamp((c.pitch || 0) / 40, -1, 1);
    let want = vin * B.RISE + clamp(fwd, -1, 1) * pitch * B.PITCH_K * B.RISE - (vin === 0 ? B.SINK : 0);
    want = clamp(want, -B.RISE, B.RISE);
    T.vz += (want - T.vz) * (1 - Math.exp(-B.ACC * dt));
    let z = T.z + T.vz * dt;
    // the floor under the whole body, and any furniture under it
    let floor = ground;
    const r = 0.24;
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const cx = (c.x + dx) | 0, cy = (c.y + dy) | 0, cell = m.cells[cy * m.w + cx];
      const lv = m.lvls ? m.lvls[cy * m.w + cx] : 0;
      if (lv > floor) floor = lv;
      if (cell && cell.p16dLow && cell.top > floor) floor = cell.top;
    }
    const zMin = floor + B.BODY, zMax = zTopAt(c.x, c.y);
    if (z < zMin) { z = zMin; if (T.vz < 0) T.vz = 0; }
    if (z > zMax) { z = zMax; if (T.vz > 0) T.vz = 0; }
    T.z = z; c.z = z;
    // a slow sway instead of the walking bob
    c.bob = (typeof GFX !== 'undefined' && GFX.reduceMotion) ? 0 : Math.sin(T.clock * 1.1) * 0.7;
    const moving = hv > 0.15 || Math.abs(T.vz) > 0.15;
    const sprinting = !!(G.keys && G.keys.shift) && hv > B.SWIM * 1.05;
    tickBreath(dt, moving, sprinting);
    // the view blends in and out of the water over a third of a second
    const target = T.surfaced ? B.U_AIR : 1;      // in a pocket the air is dim and stale: a little of the water's look stays
    T.U += (target - T.U) * (1 - Math.exp(-dt * 7)); if (Math.abs(T.U - target) < 0.004) T.U = target;
    setFloor(T.surfaced ? B.MUFFLE_AIR : B.MUFFLE);
    // rooms: a first line each
    const rm = roomOf(c.x, c.y);
    if (rm >= 0 && rm !== T.room) {
      T.room = rm;
      const bit = 1 << rm, seen = fint('p16d_seen');
      if (!(seen & bit)) { fset('p16d_seen', seen | bit); const id = ROOMS[rm].id; if (TX.rooms[id]) say(TX.rooms[id], '', 6500); }
    }
    updateHud(false);
  }
  let _pm = null;   // the game's playerMove (as wrapped before this module), for the glide

  // ---------------------------------------------------------------- arriving, leaving, saves
  function settle(pk) {
    const p = POCKETS[clamp(pk | 0, 0, POCKETS.length - 1)];
    const c = Engine.cam;
    c.x = p.at[0]; c.y = p.at[1]; c.dir = p.dir; c.pitch = 0;
    T.z = B.ZTOP_AIR - 0.02; c.z = T.z; T.vx = T.vy = T.vz = 0;
    T.max = breathMax(); T.breath = T.max; T.surfaced = true; T.U = B.U_AIR; T.warn = 0; T.emptyT = 0; T.drownT = 0;
    try { if (G.player) { G.player.feet = groundAt(c.x, c.y); G.player.fallV = 0; G.player.fallFrom = null; } } catch (e) { /* ok */ }
  }
  function onLoad(id) {
    sanitize();
    syncAll();
    if (id !== MAPID || !inMap()) { leave(); return; }
    T.room = -1; T.clock = T.clock || 0;
    if (T.arrive === 'dive') {
      settle(0);
      fset('p16d_dives', fint('p16d_dives') + 1);
      if (fint('p16d_j') < 1) { fset('p16d_j', 1); try { journal('side', TX.j.dive); } catch (e) { /* no journal */ } }
      say(TX.dive.arrive, '', 5500); capLine(TX.cap.under);
      if (fint('p16d_dives') <= 2) setTimeout(() => { if (inMap()) say(TX.dive.help, 'warn', 7000); }, 1200);
    } else {
      // a save, a load, anything else that puts you down here: up into the last air you breathed, head up, breath full
      settle(fint('p16d_air'));
    }
    T.arrive = null;
    capLine(TX.cap.muffled);
    setFloor(B.MUFFLE_AIR);
    updateHud(true);
  }
  function leave() {
    if (T.floor) setFloor(0);
    T.U = 0; T.surfaced = false; T.vx = T.vy = T.vz = 0;
    if (hud) hud.hidden = true;
  }
  function doDive() {
    if (!on() || !part3() || !hasG() || !G.maps || !G.maps[MAPID]) return false;
    T.arrive = 'dive';
    try { if (typeof transfer === 'function') transfer({ map: MAPID, x: POCKETS[0].at[0], y: POCKETS[0].at[1], dir: 0 }); else loadMap(MAPID, { x: POCKETS[0].at[0], y: POCKETS[0].at[1], dir: 0 }); }
    catch (e) { T.arrive = null; warnOnce('dive', e); return false; }
    return true;
  }
  function doExit(k) {
    const x = EXITS[k]; if (!x || !inMap()) return false;
    say(TX.exit.up, 'good', 4000);
    try { if (typeof transfer === 'function') transfer(x.portal); else loadMap(x.portal.map, x.portal); } catch (e) { warnOnce('exit', e); return false; }
    return true;
  }
  function openDive() {
    if (!on() || !part3()) return;
    showEvent(TX.dive.title, TX.dive.body, [{ t: TX.dive.go, f: () => { doDive(); } }, { t: TX.dive.no, f: null }]);
  }

  // ---------------------------------------------------------------- the register (the reward)
  function takeRegister() {
    if (fbool('p16d_reg')) return false;
    fset('p16d_reg', true);                                    // settle the books first: the reward can never be paid twice
    try {
      if (Array.isArray(G.ledger)) {
        const have = new Set(G.ledger.map((l) => l && l.name));
        for (const n of NAMES) if (!have.has(n)) G.ledger.push({ name: n, where: TX.reg.where, day: G.day | 0 });
      }
    } catch (e) { warnOnce('ledger', e); }
    try { questXp(B.XP); } catch (e) { /* no xp */ }
    try { journal('side', TX.reg.journal); } catch (e) { /* no journal */ }
    say(TX.reg.take, 'good', 5000);
    addSableTopic();
    return true;
  }
  function readRegister() { showEvent(TX.reg.title, TX.reg.body, [{ t: TX.reg.close, f: null }]); }
  // Sable's topic joins companion-talk only once the register is up, so the catalogue of a game without it is unchanged
  let sableAdded = false;
  function addSableTopic() {
    if (sableAdded || !fbool('p16d_reg')) return;
    try {
      if (typeof COMPANION_TALK === 'undefined' || !COMPANION_TALK || !Array.isArray(COMPANION_TALK.TOPICS)) return;
      if (COMPANION_TALK.TOPICS.some((t) => t.id === 's_p16d_register' || (t.who === 'sable' && t.bit === 21))) { sableAdded = true; return; }
      const has = (k) => { const f = flags(); return Object.prototype.hasOwnProperty.call(f, k) && !!f[k]; };
      COMPANION_TALK.TOPICS.push({
        id: 's_p16d_register', who: 'sable', bit: 21, title: TX.sable.title,       // bit 21: the one free bit between Sable's (16-20) and Vane's (22-25)
        req: () => has('p16d_reg') && (has('sable_met') || has('sable_wg_met') || has('sable_with') || has('sable_joined')),
        root: () => ({ s: TX.sable.s, m: 'sad', o: [
          { t: TX.sable.o1, k: 'kind', a: 2, r: TX.sable.r1 },
          { t: TX.sable.o2, k: 'blunt', a: 1, r: TX.sable.r2 },
          { t: TX.sable.o3, k: 'steady', a: 2, r: TX.sable.r3 },
        ] }),
      });
      sableAdded = true;
    } catch (e) { warnOnce('sable', e); }
  }

  // ---------------------------------------------------------------- the dive point in the Court (a transient entity)
  const entsOf = (m) => (m && Array.isArray(m.entities)) ? m.entities : [];
  function find(m, key) { return entsOf(m).find((e) => e && e._p16d === key); }
  function drop(m, key) { const a = entsOf(m); for (let i = a.length - 1; i >= 0; i--) if (a[i] && a[i]._p16d === key) a.splice(i, 1); }
  const realCourt = (m) => m && m.id === 'whispergrove' && m.w === 48 && m.h === 48;
  function syncAll() {
    if (!hasG() || !G.maps) return;
    const m = G.maps.whispergrove;
    if (!realCourt(m)) return;
    if (on() && part3()) {
      if (!find(m, 'dive')) m.entities.push({ kind: 'deco', sprite: 'p16d_rail', x: DIVE_AT[0], y: DIVE_AT[1], scale: 0.62, yOff: 0.12, glow: 0.35, lightCol: [20, 46, 44], solid: false, radius: 0.55, use: 'p16d_dive', label: TX.dive.label, transient: true, _p16d: 'dive', _decor: true });
    } else drop(m, 'dive');
    if (fbool('p16d_reg')) addSableTopic();
  }

  // ---------------------------------------------------------------- the under-water view (a post pass)
  const VW = { parts: { wobble: true, caustics: true, motes: true }, fogLut: new Uint8Array(256), fogA: new Uint8Array(256), absR: new Uint8Array(256), absG: new Uint8Array(256), absB: new Uint8Array(256), vxI: new Int32Array(0), cvCol: new Float32Array(0), cvM: new Uint8Array(0), rowR: new Float32Array(0), rowG: new Float32Array(0), rowB: new Float32Array(0), vx: new Float32Array(0), vy: new Float32Array(0), rx: new Float32Array(0), ry: new Float32Array(0), tmp: new Uint32Array(0), w: 0, h: 0, ctex: null,
    // the Medium balance (see viewHook): contrast about a pivot, a small lift, the murk thinned by a fraction, vignette strength
    med: { con: 0.22, pivot: 52, lift: 6, fog: 0.16, vig: 0.55 } };
  const stats = { ms: 0, px: 0, calls: 0, profile: false, vig: false };
  const FOG_SPAN = 16, FOG_LEN = 6.5;
  for (let i = 0; i < 256; i++) { const d = i / 255 * FOG_SPAN; VW.fogLut[i] = Math.round(Math.min(0.82, 1 - Math.exp(-d / FOG_LEN)) * 255); }
  (function caustics() {                       // a tileable web of thin bright lines (procedural stand-in), built once
    const N = 64, t = new Uint8Array(N * N), TAU = Math.PI * 2;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N * TAU, v = y / N * TAU;
      const a = Math.sin(2 * u + 1.6 * Math.sin(v + 0.4)) + Math.sin(2 * v + 1.6 * Math.sin(u)) + Math.sin(u + v + 1.1 * Math.sin(u - v));
      const c = Math.max(0, 1 - Math.abs(a) * 0.9); t[y * N + x] = Math.round(c * c * 255);
    }
    VW.ctex = t;
  })();
  function ensureView(w, h) {
    if (VW.w === w && VW.h === h) return;
    VW.w = w; VW.h = h;
    VW.rowR = new Float32Array(h); VW.rowG = new Float32Array(h); VW.rowB = new Float32Array(h);
    VW.cvCol = new Float32Array(w); VW.cvM = new Uint8Array(w); VW.vxI = new Int32Array(w); VW.vx = new Float32Array(w); VW.vy = new Float32Array(h); VW.rx = new Float32Array(w); VW.ry = new Float32Array(w); VW.tmp = new Uint32Array(w);
    for (let x = 0; x < w; x++) { const u = (x + 0.5) / w * 2 - 1; VW.vx[x] = 1 - 0.32 * u * u; }
    for (let y = 0; y < h; y++) { const v = (y + 0.5) / h * 2 - 1; VW.vy[y] = 1 - 0.38 * v * v; }
  }
  // drifting silt: a few points in the water around the eye (positions from a seeded stream, never Math.random)
  const MOTES = 26;
  function motes() {
    if (T.motes) return T.motes;
    const r = rng(16016), a = [];
    for (let i = 0; i < MOTES; i++) a.push({ ox: r() * 8 - 4, oy: r() * 8 - 4, oz: r() * 2.6, sp: 0.04 + r() * 0.07, ph: r() * 6.28 });
    return (T.motes = a);
  }
  function viewHook(F) {
    stats.px = 0;
    if (!viewOn() || !swimming() || !F.map || F.map.id !== MAPID) return;
    const U = T.U; if (!(U > 0.004)) return;
    const t0 = stats.profile ? now() : 0;
    const fb = F.fb, db = F.dbuf, mb = F.mbuf, w = F.w, h = F.h, hor = F.horizon, S = F.S || 1, cam = F.cam;
    ensureView(w, h);
    const still = !!GFX.noFlash, slow = !!GFX.reduceMotion;
    const tA = still ? 0 : (F.animT || 0) * (slow ? 0.2 : 1);
    // the wobble: whole rows nudged sideways by a pixel or so, slowly (never with Reduce motion or No flashes)
    if (!slow && !still && VW.parts.wobble) {
      const amp = 0.9 * S * U, tmp = VW.tmp;
      for (let y = 0; y < h; y++) {
        const sh = Math.round(Math.sin(y * 0.11 / S + tA * 1.25) * amp); if (!sh) continue;
        const o = y * w; tmp.set(fb.subarray(o, o + w));
        if (sh > 0) { for (let x = w - 1; x >= sh; x--) fb[o + x] = tmp[x - sh]; } else { for (let x = 0; x < w + sh; x++) fb[o + x] = tmp[x - sh]; }
      }
    }
    // the colour of the water by row: lighter and greener high up (light through the pools above), lilac and dark low
    const zk = clamp((T.z - 0.3) / 3.0, 0, 1);
    for (let y = 0; y < h; y++) {
      const k = clamp((y - hor) / (h * 0.6), -1, 1);       // -1 high in view .. 1 low
      const up = (1 - k) * 0.5;
      VW.rowR[y] = 10 + 12 * up + 6 * zk; VW.rowG[y] = 24 + 26 * up + 8 * zk; VW.rowB[y] = 30 + 18 * up + 14 * (1 - up);
    }
    const dirX = F.dirX, dirY = F.dirY, plX = F.planeX, plY = F.planeY;
    for (let x = 0; x < w; x++) { const u = 2 * x / w - 1; VW.rx[x] = dirX + plX * u; VW.ry[x] = dirY + plY * u; }
    const lut = VW.fogLut, ctex = VW.ctex, fScale = 255 / FOG_SPAN, uq = (U * 256) | 0;
    const vig = !(GFX.cineGrade === true), vx = VW.vx, vy = VW.vy, caus = VW.parts.caustics;
    stats.vig = vig;
    const cK1 = 64 / 2.8, cK2 = 64 / 1.9, cA1 = tA * 5, cA2 = -tA * 4.2, cAmp = 84 * U;
    const camX = cam.x, camY = cam.y, camZ = cam.z, bias = F.surfBias || 0.45;
    // absorption (red goes first), then the depth fog toward the row's water colour, then the vignette: all in integers,
    // through tables rebuilt once a frame (U, the blend in and out of the water, is folded into them)
    const absR = VW.absR, absG = VW.absG, absB = VW.absB, fogA = VW.fogA, vxI = VW.vxI;
    // Medium (no cinema grade after this pass) gets the balance Cinematic gets from cinema14's grade: a little contrast
    // folded into the absorption tables, a thinner murk and a gentler vignette. All in the per-frame tables: no cost per pixel.
    const MB = VW.med, mk = vig ? U : 0, con = 1 + MB.con * mk, piv = MB.pivot, lift = MB.lift * mk, fk = 1 - MB.fog * mk, vs = vig ? MB.vig : 1;
    for (let v = 0; v < 256; v++) {
      let c = mk ? piv + (v - piv) * con + lift : v; c = c < 0 ? 0 : c > 255 ? 255 : c;
      absR[v] = (c * (1 - 0.36 * U)) | 0; absG[v] = (c * (1 - 0.06 * U)) | 0; absB[v] = (c * (1 - 0.1 * U)) | 0; fogA[v] = (lut[v] * uq * fk) >> 8;
    }
    for (let x = 0; x < w; x++) vxI[x] = ((1 - vs * (1 - vx[x])) * 256) | 0;
    const cvCol = VW.cvCol, cvM = VW.cvM; cvM.fill(255);
    const fogSky = (240 * uq) >> 8, vA = vig ? ((1 - U) * 256) | 0 : 256;
    let px = 0;
    for (let y = 0; y < h; y++) {
      const rR = VW.rowR[y] | 0, rG = VW.rowG[y] | 0, rB = VW.rowB[y] | 0, vB = vig ? (U * (1 - vs * (1 - vy[y])) * 256) | 0 : 0;
      let o = y * w, lastCv = 0, lastM = -1;
      for (let x = 0; x < w; x++, o++) {
        const p = fb[o], m = mb[o], d = db[o];
        let r = absR[p & 255], g = absG[(p >> 8) & 255], b = absB[(p >> 16) & 255];
        // slow caustic light on the floor and on the walls near it
        if (caus && d < 7 && (m === 5 || m === 4)) {
          const dp = m === 5 ? d - bias : d;
          const reuseY = S > 1 && (y & 1) && cvM[x] === m;   // at 2x a 2x2 block shares one sample of the light
          if (reuseY || ((x & 1) && m === lastM)) { const cvr = reuseY ? cvCol[x] : lastCv; if (cvr > 0.5) { r += (cvr * 0.55) | 0; g += (cvr * 0.95) | 0; b += (cvr * 0.85) | 0; if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255; } if (!reuseY) { cvCol[x] = cvr; cvM[x] = m; } }
          // (odd columns reuse their left neighbour's light: half the lookups, the same look)
          else if (dp > 0.25) {
            const wx = camX + dp * VW.rx[x], wy = camY + dp * VW.ry[x];
            let s1 = 0, s2 = 0, fade = 1 - d / 7;
            if (m === 5) { s1 = ctex[(((wy * cK1 + cA1) | 0) & 63) * 64 + (((wx * cK1 + cA1 * 0.6) | 0) & 63)]; s2 = ctex[(((wy * cK2 - cA2) | 0) & 63) * 64 + (((wx * cK2 + cA2) | 0) & 63)]; }
            else { const z = camZ - (y - hor) * d / h, zf = 1 - (z - groundAtFast(wx, wy)) / 1.2; if (zf > 0) { fade *= zf; const sx = (wx + wy) * 0.7; s1 = ctex[(((z * cK1 + cA1) | 0) & 63) * 64 + (((sx * cK1) | 0) & 63)]; s2 = ctex[(((z * cK2 - cA2) | 0) & 63) * 64 + (((sx * cK2 + cA2) | 0) & 63)]; } }
            const cv = ((s1 + s2) * fade * cAmp) / 510; lastCv = cv; lastM = m; cvCol[x] = cv; cvM[x] = m;
            if (cv > 0.5) { r += (cv * 0.55) | 0; g += (cv * 0.95) | 0; b += (cv * 0.85) | 0; if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255; px++; }
          }
        }
        // the murk: lights cut through it a little better than stone does
        let a = d >= 1e8 ? fogSky : fogA[d * fScale >= 255 ? 255 : (d * fScale) | 0];
        if (m === 8) a = (a * 140) >> 8;
        r += ((rR - r) * a) >> 8; g += ((rG - g) * a) >> 8; b += ((rB - b) * a) >> 8;
        if (vig) { const k = vA + ((vB * vxI[x]) >> 8); r = (r * k) >> 8; g = (g * k) >> 8; b = (b * k) >> 8; }
        fb[o] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    // silt: a few soft points, depth-tested, drifting up slowly (still with Reduce motion)
    const det = dirX * plY - dirY * plX;
    if (Math.abs(det) > 1e-6 && VW.parts.motes) {
      const M = motes(), cx = Math.floor(camX / 8) * 8, cy = Math.floor(camY / 8) * 8, sz = S > 1 ? 2 : 1;
      for (let i = 0; i < M.length; i++) {
        const q = M[i];
        let mx = cx + ((q.ox + 4) % 8 + 8) % 8 - 4 + 4, my = cy + ((q.oy + 4) % 8 + 8) % 8 - 4 + 4;
        if (mx - camX > 4) mx -= 8; else if (mx - camX < -4) mx += 8;
        if (my - camY > 4) my -= 8; else if (my - camY < -4) my += 8;
        const mz = (slow ? q.oz : (q.oz + tA * q.sp) % 2.6) + 0.5 + Math.sin(tA * 0.7 + q.ph) * (slow ? 0 : 0.05);
        const rx = mx - camX, ry = my - camY;
        const tx = (plY * rx - plX * ry) / det, tz = (-dirY * rx + dirX * ry) / det;   // depth along the view, and across
        if (tx < 0.4 || tx > 6) continue;
        const sxp = ((w / 2) * (1 + tz / tx)) | 0, syp = (hor + (camZ - mz) * h / tx) | 0;
        if (sxp < 0 || sxp >= w - sz || syp < 0 || syp >= h - sz) continue;
        const o = syp * w + sxp; if (db[o] < tx) continue;
        const k = (1 - tx / 6) * 0.3 * U;
        for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) {
          const oo = o + yy * w + xx, pp = fb[oo];
          const R = (pp & 255) + (190 - (pp & 255)) * k, G2 = ((pp >> 8) & 255) + (214 - ((pp >> 8) & 255)) * k, B2 = ((pp >> 16) & 255) + (200 - ((pp >> 16) & 255)) * k;
          fb[oo] = (255 << 24) | ((B2 | 0) << 16) | ((G2 | 0) << 8) | (R | 0);
        }
      }
    }
    stats.px = px; stats.calls++;
    if (stats.profile) stats.ms = now() - t0;
  }
  function groundAtFast(x, y) { const m = G.map; if (!m || !m.lvls) return 0; const cx = x | 0, cy = y | 0; if (cx < 0 || cy < 0 || cx >= m.w || cy >= m.h) return 0; return m.lvls[cy * m.w + cx]; }

  // ---------------------------------------------------------------- the route: BFS in 3D, and the breath budget
  const ZSTEP = 0.1;
  function zLevels() { const a = []; for (let z = B.BODY; z <= B.ZTOP_AIR + 1e-6; z += ZSTEP) a.push(+z.toFixed(3)); return a; }
  // states (cell, z index); moves: up/down a step inside the cell, or across to a neighbour at the same z.
  // Times: across = 1 / SWIM, a z step = ZSTEP / RISE. Returns the Dijkstra time to every state from the given sources.
  function solve(m, sources) {
    const Z = zLevels(), nz = Z.length, N = m.w * m.h * nz, dist = new Float64Array(N).fill(Infinity);
    const open = (cx, cy, zi) => cellOpen(m, cx, cy, Z[zi]) && Z[zi] <= zTopAt(cx + 0.5, cy + 0.5) + 1e-6;
    const heap = [];   // a small binary heap of [t, state]
    const push = (t, s) => { heap.push([t, s]); let i = heap.length - 1; while (i > 0) { const pa = (i - 1) >> 1; if (heap[pa][0] <= heap[i][0]) break; [heap[pa], heap[i]] = [heap[i], heap[pa]]; i = pa; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
    for (const [cx, cy, zi] of sources) { if (!open(cx, cy, zi)) continue; const s = (cy * m.w + cx) * nz + zi; dist[s] = 0; push(0, s); }
    const tAcross = 1 / B.SWIM, tUp = ZSTEP / B.RISE;
    while (heap.length) {
      const [t, s] = pop(); if (t > dist[s]) continue;
      const zi = s % nz, ci = (s - zi) / nz, cx = ci % m.w, cy = (ci - cx) / m.w;
      const tryS = (nx, ny, nzi, dt) => { if (nzi < 0 || nzi >= nz || !open(nx, ny, nzi)) return; const ns = (ny * m.w + nx) * nz + nzi, nt = t + dt; if (nt < dist[ns]) { dist[ns] = nt; push(nt, ns); } };
      tryS(cx, cy, zi + 1, tUp); tryS(cx, cy, zi - 1, tUp);
      tryS(cx + 1, cy, zi, tAcross); tryS(cx - 1, cy, zi, tAcross); tryS(cx, cy + 1, zi, tAcross); tryS(cx, cy - 1, zi, tAcross);
    }
    return { dist, nz, Z, open };
  }
  function airStates(m, pk) {
    const Z = zLevels(), out = [], p = POCKETS[pk];
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) Z.forEach((z, i) => { if (z >= B.WL - 1e-6) out.push([x, y, i]); });
    return out;
  }
  function minTo(res, m, pred) {
    let best = Infinity; const nz = res.nz;
    for (let s = 0; s < res.dist.length; s++) { if (res.dist[s] >= best) continue; const zi = s % nz, ci = (s - zi) / nz, cx = ci % m.w, cy = (ci - cx) / m.w; if (pred(cx, cy, res.Z[zi])) best = res.dist[s]; }
    return best;
  }
  // every state that can reach an exit (no softlock), and the stretches without air along the route
  function budget(m) {
    m = m || (hasG() && G.maps ? G.maps[MAPID] : null) || buildMap();
    const n = POCKETS.length, cap = B.BREATH * B.MARGIN;
    const fromAir = POCKETS.map((p, i) => solve(m, airStates(m, i)));
    const inPk = (j) => (cx, cy, z) => pocketOf(cx + 0.5, cy + 0.5) === j && z >= B.WL - 1e-6;
    const pair = []; for (let i = 0; i < n; i++) { pair.push([]); for (let j = 0; j < n; j++) pair[i].push(i === j ? 0 : minTo(fromAir[i], m, inPk(j))); }
    // the breath graph: pockets joined when the swim between them is within the margin
    const link = (i, j) => pair[i][j] <= cap;
    const reach = new Set([0]), q = [0]; while (q.length) { const i = q.shift(); for (let j = 0; j < n; j++) if (!reach.has(j) && link(i, j)) { reach.add(j); q.push(j); } }
    // the register: the round trip from the best pocket
    const rx = REG_AT[0] | 0, ry = REG_AT[1] | 0;
    const near = (cx, cy) => Math.abs(cx - rx) <= 1 && Math.abs(cy - ry) <= 1;
    let regTrip = Infinity, regFrom = -1;
    for (let i = 0; i < n; i++) { if (!reach.has(i)) continue; const t = minTo(fromAir[i], m, (cx, cy) => near(cx, cy)); if (2 * t < regTrip) { regTrip = 2 * t; regFrom = i; } }
    // every room's centre within a round trip of some reachable pocket
    const rooms = ROOMS.map((r) => { const cx = ((r.x0 + r.x1) / 2) | 0, cy = ((r.y0 + r.y1) / 2) | 0; let best = Infinity; for (let i = 0; i < n; i++) if (reach.has(i)) best = Math.min(best, 2 * minTo(fromAir[i], m, (x, y) => Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1)); return { id: r.id, trip: best }; });
    // no softlock: from the exits' air (A and F) the whole open space is reachable, and moves are reversible, so every
    // open state can get back to an exit
    const exitsRes = solve(m, airStates(m, 0).concat(airStates(m, 3)));
    let openN = 0, stuck = 0;
    for (let s = 0; s < exitsRes.dist.length; s++) { const zi = s % exitsRes.nz, ci = (s - zi) / exitsRes.nz, cx = ci % m.w, cy = (ci - cx) / m.w; if (!exitsRes.open(cx, cy, zi)) continue; openN++; if (!isFinite(exitsRes.dist[s])) stuck++; }
    let worst = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && reach.has(i) && reach.has(j) && link(i, j)) worst = Math.max(worst, pair[i][j]);
    return { cap, pair, reach: Array.from(reach).sort(), regTrip, regFrom, rooms, openN, stuck, worstLink: worst };
  }

  // ---------------------------------------------------------------- interaction
  function look(e) {
    const k = e && e._k; if (!k) return false;
    if (e._doc === 'ledger') { showEvent(TX.docs.ledgerTitle, TX.docs.ledgerBody, [{ t: TX.docs.close, f: null }]); return true; }
    if (e._doc === 'daybook') { showEvent(TX.docs.daybookTitle, TX.docs.daybookBody, [{ t: TX.docs.close, f: null }]); return true; }
    if (e._doc === 'last') { showEvent(TX.docs.lastTitle, TX.docs.lastBody, [{ t: TX.docs.close, f: null }]); return true; }
    const text = e.label || TX.look[k] || TX.notices[k]; if (!text) return false;
    say(text, '', 8000);
    return true;
  }
  function nearTarget() {
    try {
      if (Engine.pick(G.ents, typeof USE_RANGE === 'number' ? USE_RANGE : 2.6)) return true;
      const c = Engine.cam;
      for (const o of G.ents) { if (o.hidden || o.dead || (o.kind !== 'item' && !(o.kind === 'deco' && o.use) && o.kind !== 'npc')) continue; const d = Math.hypot(o.x - c.x, o.y - c.y); if (d > 1.6 + (o.radius || 0)) continue; let a = Math.atan2(o.y - c.y, o.x - c.x) - c.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 0.8) return true; }
    } catch (e) { return true; }
    return false;
  }
  function wireGame() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try {
          if (e && e.use === 'p16d_dive') { openDive(); return; }
          if (e && e.use === 'p16d_exit') { doExit(e._x); return; }
          if (e && e.use === 'p16d_look' && look(e)) return;
        } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof interact === 'function') {
      const _it = interact;
      interact = function () {
        // Space is "rise" under water: a press with nothing in reach must not read the wall in front aloud
        try { if (swimming() && G.keys && G.keys[' '] && !nearTarget()) return undefined; } catch (e) { /* fall through */ }
        return _it.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _item = useItem;
      useItem = function (slot) {
        const it = slot && typeof slot.id === 'string' && typeof ITEMS !== 'undefined' ? ITEMS[slot.id] : null;
        if (it && it.use === 'p16d_register') { try { if (typeof closeModal === 'function') closeModal(); readRegister(); } catch (e) { warnOnce('read', e); } return; }
        return _item.apply(this, arguments);
      };
    }
    if (typeof pickUp === 'function') {
      const _pick = pickUp;
      pickUp = function (e) {
        const mine = e && e.item === 'p16d_register' && !e.dead && !e.hidden;
        const r = _pick.apply(this, arguments);
        try { if (mine && e.dead) takeRegister(); } catch (err) { warnOnce('pick', err); }
        return r;
      };
    }
    if (typeof castSong === 'function') {
      const _cs = castSong;
      castSong = function (id) {
        try { if (underwater() && id !== 'murmur') { say(TX.song, 'warn', 3500); capLine(TX.cap.muffled, 6); return undefined; } } catch (e) { /* fall through */ }
        return _cs.apply(this, arguments);
      };
    }
    if (typeof attack === 'function') {
      const _at = attack;
      attack = function () {
        const before = G.attack ? G.attack.t : 0;
        const r = _at.apply(this, arguments);
        try {
          if (underwater() && G.attack && G.attack.t > 0 && G.attack.t !== before) {
            G.attack.t *= B.WEAPON_SLOW; if (G.attack.dur) G.attack.dur *= B.WEAPON_SLOW;
            if (!T.weaponSaid) { T.weaponSaid = true; say(TX.weapon, 'warn', 3500); }
          }
        } catch (e) { warnOnce('attack', e); }
        return r;
      };
    }
    if (typeof drownedShriek === 'function') {
      const _ds = drownedShriek;
      drownedShriek = function (e) {
        try { if (swimming()) { if (!T.said.shriek || T.clock - T.said.shriek > 8) { T.said.shriek = T.clock; say(TX.shriek, 'bad', 4500); capLine(TX.cap.bubbles); } return undefined; } } catch (err) { /* fall through */ }
        return _ds.apply(this, arguments);
      };
    }
    if (typeof solidAt === 'function') {
      const _sa = solidAt;
      solidAt = function (x, y, self) {
        if (!self) { try { if (swimming()) return swimSolid(x, y); } catch (e) { warnOnce('solid', e); } }
        return _sa.apply(this, arguments);
      };
    }
    if (typeof playerMove === 'function') {
      _pm = playerMove;
      const w = function (o, dx, dy) {
        try {
          if (swimming() && o === Engine.cam) {
            const dt = T.dt > 0 ? T.dt : 1 / 60;
            const sprint = !!(G.keys && G.keys.shift);
            // the game's own velocity says which way, and roughly how hard; the water decides how fast
            const wantX = dx / dt, wantY = dy / dt, mag = Math.hypot(wantX, wantY);
            const top = sprint ? B.SPRINT : B.SWIM, k = mag > 1e-6 ? Math.min(1, mag / 2.6) * top / mag : 0;
            const tx = wantX * k, ty = wantY * k, a = 1 - Math.exp(-B.ACC * dt);
            T.vx += (tx - T.vx) * a; T.vy += (ty - T.vy) * a; T.pm = true;
            const r = _pm.call(this, o, T.vx * dt, T.vy * dt);
            if (r && r.bx) T.vx = 0; if (r && r.by) T.vy = 0;
            return r;
          }
        } catch (e) { warnOnce('move', e); }
        return _pm.apply(this, arguments);
      };
      playerMove = w;
    }
    if (typeof wallLabel === 'function') {
      const _wl = wallLabel;
      wallLabel = function (cell) { try { if (cell && cell.p16dLow) return cell.tex === 'p16d_counter' ? TX.look.counter : TX.look.drawers; } catch (e) { /* ok */ } return _wl.apply(this, arguments); };
    }
  }
  function wireMaps() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { if (!maps[MAPID]) maps[MAPID] = buildMap(); } catch (e) { warnOnce('build', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        try { sanitize(); } catch (e) { /* ignore */ }
        const r = _lm.apply(this, arguments);
        try { onLoad(id); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        T.arrive = null;
        const r = _rg.apply(this, arguments);            // a bad save throws here, before anything below
        try { sanitize(); syncAll(); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () { const r = _sg.apply(this, arguments); try { T.arrive = null; T.firstAir = false; T.weaponSaid = false; T.said = {}; leave(); syncAll(); } catch (e) { warnOnce('start', e); } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const sw = (() => { try { return swimming() && G.state === 'play'; } catch (e) { return false; } })();
        if (sw) preUpdate(Math.max(0, Math.min(0.25, Number(dt) || 0)));
        const r = _up.apply(this, arguments);
        try { if (sw && swimming() && G.state === 'play' && !G.dead) postUpdate(Math.max(0, Math.min(0.25, Number(dt) || 0))); else if (!swimming() && T.floor) leave(); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
  }

  // ---------------------------------------------------------------- options
  function row(grid, id, label, hint, get, set) {
    const mk = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
    const lab = mk('span', { class: 'gfx-label' }, label + ' '); lab.appendChild(mk('small', { class: 'muted' }, hint));
    const b = mk('button', { class: 'dfbtn small', id, type: 'button', 'aria-pressed': String(get()), 'aria-label': label }, get() ? 'On' : 'Off');
    b.classList.toggle('sel', get());
    b.onclick = () => { set(!get()); saveCfg(); b.textContent = get() ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(get())); b.classList.toggle('sel', get()); };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try {
        const grid = document.querySelector('#modal-panel .ctl-grid');
        if (grid && !document.getElementById('p16d-opt')) {
          row(grid, 'p16d-opt', TX.opts.label, TX.opts.hint, () => cfg.on, (v) => { cfg.on = v; try { syncAll(); } catch (e) { /* ignore */ } });
          row(grid, 'p16d-view', TX.opts.view, TX.opts.viewHint, () => cfg.view && GFX.deepView !== false, (v) => { cfg.view = v; if (v) GFX.deepView = true; });
        }
      } catch (e) { warnOnce('options', e); }
      return r;
    };
  }

  // ---------------------------------------------------------------- boot
  loadCfg();
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('deep16: ' + name + ' wiring failed', e); } };
  try { if (typeof document !== 'undefined') { paintAll(); injectStyle(); } } catch (e) { console.warn('deep16: art failed', e); }
  installItems();
  wire('audio', wireAudio); wire('game', wireGame); wire('maps', wireMaps);
  if (typeof document !== 'undefined') wire('options', wireOptions);
  if (typeof Engine !== 'undefined' && Engine.addPostHook) Engine.addPostHook((F) => { try { viewHook(F); } catch (e) { warnOnce('view', e); } }, 50);   // after post.js's grade (40) and the sparks (45); before cinema14 (95)

  return {
    MAPID, W, H, B, LV, TX, ROOMS, LINKS, POCKETS, EXITS, LOWS, DIVE_AT, REG_AT, NAMES, FLAGS, T, cfg, saveCfg, loadCfg, stats, VW,
    get TEXTS() { return LIST.slice(); },
    fint, fset, sanitize, syncAll, buildMap, roomOf, pocketOf, cellOpen, swimSolid, swimming, underwater, breathMax, zTopAt,
    doDive, doExit, openDive, takeRegister, readRegister, addSableTopic, settle, onLoad, leave, musicVol, setFloor, viewHook,
    solve, budget, zLevels, updateHud, inMap,
  };
})();
if (typeof window !== 'undefined') window.DEEP16 = DEEP16;
