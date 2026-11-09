// ============================================================
//  daily18 — Phase 18 "Technical", team DAILY: the daily challenge dungeon.
//
//  WHAT IT IS
//    "Daily challenge" on the title screen opens a panel: today's dungeon (seeded by the UTC date, so every machine walks
//    the same floors on the same day), a practice dungeon from a seed of the player's own, the local results table, and a
//    share-code checker. A run is three generated floors built from the game's own tile kit, props, Book One early-game
//    enemies (hounds, swarms, Proctors, Legionnaires) and the strongbox / valuables loot tables. No story NPCs, no named
//    places from the story: the floors are generic [PROPOSED] cellars, an ossuary and a cistern. Fixed starting kit.
//    Score = floors + clear + time + kills + treasure - damage (table SCORE below). One share code per run (date + score +
//    the parts of the score + a checksum); codes are copied by hand and checked locally, never sent anywhere.
//
//  ISOLATION
//    The run is an EXTRAS17 extra registered with { hidden: true } (the one option this phase adds to extras17.js): it does
//    not appear in the Extras menu, needs no Book One unlock or spoiler notice, its banner carries only its own title, and
//    leaving it returns to the bare title screen. Everything else is extras17's isolation, unchanged: the Book One session,
//    slots, hardcore save and autosave are put aside while the run lasts and given back, the same objects, when it ends.
//    Inside a run there are no saves at all (a run is one sitting): Save / Load show a short notice instead.
//
//  DETERMINISM
//    The generator reads nothing but the seed: its own mulberry32 streams (layout, dressing, population) per floor, integer
//    maths only (no trig), so the same date gives the same maps everywhere (the test hashes them). A floor that fails its
//    own checks (spawn, stairs reachable with closed doors passable and locked doors shut, every loose item reachable, no
//    foe within 11 steps / 8 cells of the spawn, heights within a step) is rebuilt from the next attempt seed; after 24
//    attempts a fixed fallback layout is used (never seen in 60 seeds; the test counts attempts). Combat itself is the
//    game's own (Math.random as everywhere else); the score depends on play, the dungeon does not.
//
//  FAIRNESS
//    danger 0 (no random hound spawns), not siphoned (no unwriting while you stand still), the clock is held at mid-morning
//    while the run lasts (no night terrors or dying lights), no foe can see or hear the spawn, nothing hurts you before you
//    move. A fall (hp 0) ends the run (scored); there is no death screen. Elites (Legionnaires on floors 2-3) have x1.5 hp.
//
//  STATE: nothing in G beyond the run's own isolated session; results in localStorage 'octave.daily18.v1' (validated on
//  read; never parsed as markup). Flags: none needed (prefix p18d_ reserved). Security: every string shown is a constant
//  from TX or a number; save/storage/code data goes in through textContent only.
//  Art: two procedural stand-in wall textures (a stair going down, a stair up to daylight), cached once.
// ============================================================
'use strict';

const DAILY18 = (function () {
  const EXTRA_ID = 'daily18';
  const KEY = 'octave.daily18.v1';
  const IDS = ['d18_f1', 'd18_f2', 'd18_f3'];
  const VERSION = 'v1';                  // part of every seed: bump to retire old codes
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hasG = () => typeof G !== 'undefined' && G;
  const warned = {};
  function warnOnce(k, e) { if (!warned[k]) { warned[k] = true; console.warn('daily18 ' + k, e); } }

  // ---------------------------------------------------------------- the one table
  const SCORE = {
    floor: 150,          // each new floor reached (2 and 3)
    clear: 500,          // climbing out of the third floor
    par: 600,            // seconds: on a clear, +1 point for every second under par
    kill: 20, elite: 40, // per foe; an elite adds this on top
    hurt: 3,             // per point of health lost
  };
  const TREASURE = { cache1: 40, cache2: 90, trinket: 25, purse: 10 };
  const KIT = { hp: 30, voice: 30, weapons: ['sword', 'pistol'], pellets: 9, armor: ['a_cap', 'a_gambeson', 'a_softboots'], items: [['tonic', 2], ['honey', 1]], songs: ['murmur', 'tending', 'fifth', 'root'] };
  const SAFE = { steps: 11, cells: 8 };  // no foe nearer the spawn than this (path steps / straight cells)
  const TOD = 0.42;                      // the clock is held here during a run
  const TABLE_MAX = 40;

  // ---------------------------------------------------------------- text
  const TX = {
    btn: 'Daily challenge',
    title: 'Daily challenge',
    practiceTitle: 'Practice dungeon',
    sub: 'Three floors of a dungeon made from the date. Everyone who plays on the same day, by the clock at Greenwich, walks the same floors with the same kit.',
    rules: 'Score: floors reached, the climb out, time, kills and treasure, less the damage you take. No saves: a run is one sitting. Your Book One game is put aside, untouched, and given back when you leave.',
    kit: 'The kit: a short sword, a glass-shot pistol with nine pellets, a leather cap, a gambeson, soft boots, two tonics and a jar of honey.',
    today: 'Today',
    play: 'Begin today’s run',
    practice: 'Practice',
    practiceP: 'A dungeon from a seed of your own (a number up to 999999). It is scored, but not as a daily.',
    seed: 'Seed',
    newSeed: 'New seed',
    playSeed: 'Begin the practice run',
    results: 'Your results',
    none: 'No runs yet in this browser.',
    bestToday: 'Best today',
    noneToday: 'No run today yet.',
    recent: 'Recent runs',
    daily: 'Daily', prac: 'Practice',
    wCleared: 'climbed out', wFell: 'fell', wLeft: 'left',
    codeH: 'Share code',
    codeP: 'Copy it by hand or with the button. Anyone can check it here; it is never sent anywhere.',
    copy: 'Copy', copied: 'Copied.', copyFail: 'Select the code and copy it by hand.',
    checkH: 'Check a code',
    checkBtn: 'Check',
    checkBad: 'That code does not check out.',
    checkOk: 'A true code.',
    close: 'Close', back: 'Back',
    interrupted: 'Your last run was interrupted (the page was closed or reloaded). It is not on the table.',
    failed: 'The run could not start. Your Book One game is untouched.',
    // the result card
    resCleared: 'You climbed out.',
    resFell: 'You fell.',
    resLeft: 'You left the run.',
    rFloors: 'Floors reached', rClear: 'Climbed out', rTime: 'Time', rTimeBonus: 'Time bonus', rKills: 'Kills', rElites: 'Elites',
    rTreasure: 'Treasure', rHurt: 'Damage taken', rScore: 'Score',
    newBest: 'A new best for this day.',
    // in the run
    introBody: 'Three floors down, then the climb out. Find the stair on each floor; take what you can carry and what you can kill on the way.',
    introKit: 'You have a short sword, a pistol with nine pellets, two tonics and a jar of honey. Nothing you find stays with you after the run.',
    introGo: 'Go down',
    introLeave: 'Not now',
    hudFloor: 'Floor', hudTime: 'Time', hudScore: 'Score',
    down: 'A stair going down into the dark',
    out: 'A stair up to daylight. The way out.',
    vault: 'A locked door. Something behind it is worth the trouble.',
    downMsg: 'Down the stair. Floor {0} of 3.',
    startMsg: 'The stair behind you is shut. Find the way down.',
    lastFloor: 'The last floor. Somewhere there is a stair up to daylight.',
    noSave: 'No saves in the daily challenge: a run is one sitting.',
    abandon: 'Abandon the run',
    endScore: 'Score: {0}',
    toResults: 'See the results',
    // floors [PROPOSED] (generic places)
    f1a: 'The Undercroft', f1b: 'The Old Cellars', f2a: 'The Ossuary', f2b: 'The Drowned Chapel', f3a: 'The Glass Cistern', f3b: 'The Old Cuttings',
  };
  const TEXTS = Object.values(TX);

  // ---------------------------------------------------------------- hashing and seeded streams (never Math.random)
  function hash32(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return h >>> 0; }
  function stream(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const ri = (r, a, b) => a + ((r() * (b - a + 1)) | 0);
  const pick = (r, arr) => arr[(r() * arr.length) | 0];
  function weighted(r, list) { let tot = 0; for (const [, w] of list) tot += w; let k = r() * tot; for (const [v, w] of list) { k -= w; if (k < 0) return v; } return list[list.length - 1][0]; }

  // ---------------------------------------------------------------- dates and keys
  // a key is 'YYYYMMDD' (a daily, UTC) or 'p' + 1..999999 (a practice seed)
  const DAY_RE = /^(\d{4})(\d{2})(\d{2})$/, PRAC_RE = /^p([1-9]\d{0,5})$/;
  let clockFn = () => new Date();
  function dayKey(d) { d = d || clockFn(); return d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0'); }
  function validDay(k) {
    const m = DAY_RE.exec(k || ''); if (!m) return false;
    const y = +m[1], mo = +m[2], d = +m[3]; if (y < 2026 || y > 2999) return false;
    const t = new Date(Date.UTC(y, mo - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
  }
  const validKey = (k) => typeof k === 'string' && (validDay(k) || PRAC_RE.test(k));
  const isPractice = (k) => PRAC_RE.test(k || '');
  const isoOf = (k) => (validDay(k) ? k.slice(0, 4) + '-' + k.slice(4, 6) + '-' + k.slice(6) : (isPractice(k) ? '#' + k.slice(1) : ''));
  const seedOf = (k) => hash32('octave-daily18-' + VERSION + '|' + k);

  // ---------------------------------------------------------------- themes (two looks per floor; the date picks one)
  // floorTextures: 0 base, 1 shallows, 2 deep water (impassable), 3 the alternate floor
  const THEMES = [
    [
      { name: 'f1a', small: 'store', w: 36, h: 30, rooms: 8, rmin: 4, rmax: 7, wall: 't_stone', alt: 't_wood', altP: 0.18, pillar: 't_wood', floor: 't_flag', floorAlt: 't_wood', ceil: 't_wood', ceilTex: 'c_beams', fog: [14, 10, 7], fogDist: 11, ambient: 0.15, music: 'dungeon',
        flavors: [['store', 4], ['hall', 2], ['plain', 2], ['ruin', 1], ['shrine', 1]], foes: 6, elites: 0, pool: [['mites', 3], ['hound', 2], ['proctor', 2]], loops: 1, doorP: 0.4, vaults: 1, glass: 0, decals: ['d_crack1', 'd_crack2', 'd_moss1'] },
      { name: 'f1b', small: 'store', w: 36, h: 30, rooms: 8, rmin: 4, rmax: 7, wall: 't_wood', alt: 't_stone', altP: 0.3, pillar: 't_stone', floor: 't_wood', floorAlt: 't_flag', ceil: 't_wood', ceilTex: 'c_beams', fog: [16, 11, 6], fogDist: 11, ambient: 0.16, music: 'dungeon', corrAlt: 1,
        flavors: [['store', 5], ['plain', 2], ['hall', 1], ['ruin', 1]], foes: 6, elites: 0, pool: [['mites', 3], ['hound', 2], ['proctor', 2]], loops: 1, doorP: 0.45, vaults: 1, glass: 0, decals: ['d_scorch1', 'd_crack1', 'd_moss2'] },
    ],
    [
      { name: 'f2a', small: 'ossuary', w: 40, h: 32, rooms: 9, rmin: 5, rmax: 9, wall: 't_catacomb', alt: 't_greymarble', altP: 0.22, pillar: 't_greymarble', floor: 't_flag', floorAlt: 't_marble', ceil: 't_stone', ceilTex: 'c_vault', ceilZ: 1.25, fog: [16, 10, 24], fogDist: 11, ambient: 0.12, music: 'mausoleum',
        flavors: [['ossuary', 4], ['hall', 3], ['shrine', 2], ['ruin', 1], ['pool', 1]], foes: 8, elites: 1, pool: [['proctor', 3], ['legionnaire', 2], ['hound', 2], ['mites', 1]], loops: 2, doorP: 0.35, vaults: 1, glass: 0, decals: ['d_moss1', 'd_moss3', 'd_crack2'] },
      { name: 'f2b', small: 'ossuary', w: 40, h: 32, rooms: 9, rmin: 5, rmax: 9, wall: 't_greymarble', alt: 't_mausoleum', altP: 0.2, pillar: 't_marble', floor: 't_marble', floorAlt: 't_flag', ceil: 't_stone', ceilTex: 'c_vault', ceilZ: 1.25, fog: [18, 14, 28], fogDist: 11, ambient: 0.13, music: 'mausoleum',
        flavors: [['pool', 3], ['hall', 3], ['shrine', 2], ['ossuary', 2]], foes: 8, elites: 1, pool: [['proctor', 3], ['legionnaire', 2], ['hound', 2], ['mites', 1]], loops: 2, doorP: 0.3, vaults: 1, glass: 0, decals: ['d_moss2', 'd_moss3', 'd_crack1'] },
    ],
    [
      { name: 'f3a', small: 'ruin', w: 42, h: 34, rooms: 10, rmin: 5, rmax: 9, wall: 't_glassrock', alt: 't_stone', altP: 0.3, pillar: 't_stone', floor: 't_moss', floorAlt: 't_flag', ceil: 't_stone', ceilTex: 'c_rock', fog: [6, 16, 12], fogDist: 12, ambient: 0.12, music: 'root', corrAlt: 1,
        flavors: [['pool', 4], ['ruin', 2], ['hall', 2], ['plain', 1]], foes: 9, elites: 2, pool: [['legionnaire', 3], ['proctor', 2], ['hound', 2]], loops: 2, doorP: 0.25, vaults: 1, glass: 1, decals: ['d_moss1', 'd_moss2', 'd_moss3'] },
      { name: 'f3b', small: 'ruin', w: 42, h: 34, rooms: 10, rmin: 5, rmax: 9, wall: 't_stone', alt: 't_glassrock', altP: 0.28, pillar: 't_brass', floor: 't_flag', floorAlt: 't_cobble', ceil: 't_stone', ceilTex: 'c_rock', fog: [10, 14, 12], fogDist: 12, ambient: 0.13, music: 'root',
        flavors: [['ruin', 3], ['hall', 2], ['pool', 2], ['store', 1], ['plain', 1]], foes: 9, elites: 2, pool: [['legionnaire', 3], ['proctor', 2], ['hound', 2]], loops: 2, doorP: 0.3, vaults: 1, glass: 1, decals: ['d_crack1', 'd_moss2', 'd_scorch2'] },
    ],
  ];
  const themeFor = (key, f) => THEMES[f - 1][hash32(seedOf(key) + ':theme:' + f) & 1];

  // ---------------------------------------------------------------- the generator
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function genFloor(key, f) {
    const T = themeFor(key, f), base = seedOf(key);
    for (let a = 0; a < 24; a++) {
      const m = tryFloor(T, f, hash32(base + ':floor:' + f + ':' + a));
      if (m) { m._d18.attempt = a; return m; }
    }
    const m = fallbackFloor(T, f); m._d18.attempt = 24; return m;
  }
  function newMap(T, f) {
    const m = new GameMap(IDS[f - 1], TX[T.name], T.w, T.h, {
      floor: T.floor, floorTextures: [T.floor, 't_shallows', 't_water', T.floorAlt], ceil: T.ceil, fogDist: T.fogDist, ambient: T.ambient,
      fogColor: T.fog.slice(), music: T.music, danger: 0, siphoned: false, spawn: { x: 2.5, y: 2.5, dir: 0 },
    });
    if (T.ceilZ) m.ceilZ = T.ceilZ;
    m._d18 = { f, theme: T.name, foes: 0, elites: 0, treasure: 0, attempt: 0, stairs: null, vaults: 0 };
    return m;
  }
  function tryFloor(T, f, seed) {
    const L = stream(seed), D = stream(seed ^ 0x9E3779B9), P = stream(seed ^ 0x85EBCA6B);
    const W = T.w, H = T.h, m = newMap(T, f);
    // walls: the main stone with patches of the second in coarse 4x4 blocks
    const cw = (W >> 2) + 1, coarse = []; for (let i = 0; i < cw * ((H >> 2) + 1); i++) coarse.push(D() < T.altP);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m.cells[y * W + x] = WALL(coarse[(y >> 2) * cw + (x >> 2)] ? T.alt : T.wall);
    // rooms: the start in a corner, then non-overlapping rooms with two cells of rock between
    const rooms = [];
    const corner = ri(L, 0, 3);
    const s0 = { w: 5, h: 5 }; s0.x = (corner & 1) ? W - 2 - s0.w - ri(L, 0, 2) : 2 + ri(L, 0, 2); s0.y = (corner & 2) ? H - 2 - s0.h - ri(L, 0, 2) : 2 + ri(L, 0, 2);
    rooms.push(s0);
    for (let a = 0; a < 700 && rooms.length < T.rooms; a++) {
      const rw = ri(L, T.rmin, T.rmax), rh = ri(L, T.rmin, Math.min(T.rmax, 8));
      const x = ri(L, 2, W - 2 - rw), y = ri(L, 2, H - 2 - rh);
      let ok = true;
      for (const r of rooms) if (x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y) { ok = false; break; }
      if (ok) rooms.push({ x, y, w: rw, h: rh });
    }
    if (rooms.length < T.rooms - 2) return null;
    rooms.forEach((r, i) => { r.i = i; r.cx = r.x + (r.w >> 1); r.cy = r.y + (r.h >> 1); r.area = r.w * r.h; });
    const roomAt = new Int16Array(W * H).fill(-1);
    for (const r of rooms) { m.clear(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) roomAt[y * W + x] = r.i; }
    // corridors: a spanning tree by distance (Prim from the start) plus a few short loops
    const md = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
    const inT = [0], out = rooms.slice(1).map((r) => r.i), edges = [];
    while (out.length) {
      let best = null, bd = 1e9;
      for (const a of inT) for (const b of out) { const d = md(rooms[a], rooms[b]); if (d < bd) { bd = d; best = [a, b]; } }
      edges.push(best); inT.push(best[1]); out.splice(out.indexOf(best[1]), 1);
    }
    const extra = [];
    for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) if (!edges.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) extra.push([a, b, md(rooms[a], rooms[b])]);
    extra.sort((p, q) => p[2] - q[2] || p[0] - q[0] || p[1] - q[1]);
    for (let k = 0, n = 0; k < extra.length && n < T.loops; k++) if (extra[k][2] < 24 && L() < 0.7) { edges.push([extra[k][0], extra[k][1]]); n++; }
    const corr = new Uint8Array(W * H);
    for (const [a, b] of edges) {
      const A = rooms[a], B = rooms[b]; let x = A.cx, y = A.cy; const hf = L() < 0.5;
      const cut = (cx, cy) => { if (cx > 0 && cy > 0 && cx < W - 1 && cy < H - 1 && roomAt[cy * W + cx] < 0) { m.set(cx, cy, null); corr[cy * W + cx] = 1; } };
      const stepX = () => { while (x !== B.cx) { x += Math.sign(B.cx - x); cut(x, y); } };
      const stepY = () => { while (y !== B.cy) { y += Math.sign(B.cy - y); cut(x, y); } };
      if (hf) { stepX(); stepY(); } else { stepY(); stepX(); }
    }
    const solidWall = (x, y) => { const c = m.get(x, y); return !!c && !c.door; };
    // doors where a corridor meets a room between two walls
    const isDoorSpot = (x, y) => {
      if (!corr[y * W + x] || m.get(x, y)) return false;
      const n = solidWall(x, y - 1), s = solidWall(x, y + 1), e = solidWall(x + 1, y), w = solidWall(x - 1, y);
      return (n && s && !e && !w) || (e && w && !n && !s);
    };
    const nextToRoom = (x, y) => DIRS4.some(([dx, dy]) => roomAt[(y + dy) * W + x + dx] >= 0);
    const doorNear = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const c = m.get(x + i, y + j); if (c && c.door) return true; } return false; };
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!isDoorSpot(x, y) || !nextToRoom(x, y) || doorNear(x, y)) continue;
      if (roomAt[y * W + x] < 0 && D() < T.doorP && !(Math.abs(x - rooms[0].cx) + Math.abs(y - rooms[0].cy) < 4)) m.set(x, y, DOOR({}));
    }
    // openings of each room: open cells just outside its edge
    for (const r of rooms) {
      r.open = [];
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
        const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; if (inside) continue;
        const corner = (x === r.x - 1 || x === r.x + r.w) && (y === r.y - 1 || y === r.y + r.h); if (corner) continue;
        const c = m.get(x, y); if (!c || c.door) r.open.push([x, y]);
      }
    }
    // distances from the start (closed doors open; nothing else yet)
    const start = rooms[0];
    let dist = bfs(m, start.cx, start.cy, { locked: false });
    for (const r of rooms) if (dist[r.cy * W + r.cx] < 0) return null;
    // the stair room: the farthest from the start
    let stairsRoom = null;
    for (const r of rooms) if (r !== start && (!stairsRoom || dist[r.cy * W + r.cx] > dist[stairsRoom.cy * W + stairsRoom.cx])) stairsRoom = r;
    // vaults: dead-end rooms behind a lockable door
    const vaults = [];
    for (const r of rooms) {
      if (vaults.length >= T.vaults || r === start || r === stairsRoom || r.open.length !== 1) continue;
      const [ox, oy] = r.open[0], c = m.get(ox, oy);
      if (c && c.door) { c.lockDifficulty = f >= 3 ? 2 : 1; c.label = TX.vault; vaults.push(r); continue; }
      if (isDoorSpot(ox, oy) && !doorNear(ox, oy)) { m.set(ox, oy, DOOR({ lockDifficulty: f >= 3 ? 2 : 1, label: TX.vault })); vaults.push(r); }
    }
    vaults.forEach((r) => { r.vault = true; });
    m._d18.vaults = vaults.length;
    // the stair: a niche in the stair room's wall
    const stair = wallNiche(m, stairsRoom, L);
    if (!stair) return null;
    const last = f === 3;
    m.set(stair.x, stair.y, DOOR({ tex: last ? 'd18_up' : 'd18_down', portal: { map: last ? IDS[2] : IDS[f], useSpawn: true, d18: last ? 'out' : 'down' }, label: last ? TX.out : TX.down }));
    m._d18.stairs = { x: stair.x, y: stair.y, ix: stair.ix, iy: stair.iy };
    // the spawn faces the first corridor out of the start room
    const nb = rooms[edges.find((e) => e[0] === 0)[1]];
    const ddx = nb.cx - start.cx, ddy = nb.cy - start.cy;
    const dir = Math.abs(ddx) >= Math.abs(ddy) ? (ddx >= 0 ? 0 : Math.PI) : (ddy >= 0 ? Math.PI / 2 : -Math.PI / 2);
    m.spawn = { x: start.cx + 0.5, y: start.cy + 0.5, dir };
    // ---- dressing (its own stream): flavours, light, props
    const block = new Uint8Array(W * H);       // cells a solid prop stands on
    const keep = new Uint8Array(W * H);        // cells that must stay clear (the stair's front, the spawn, the openings)
    const keepAround = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < H) keep[yy * W + xx] = 1; } };
    keepAround(stair.ix, stair.iy, 1); keepAround(start.cx, start.cy, 1);
    for (const r of rooms) for (const [ox, oy] of r.open) keepAround(ox, oy, 1);
    const free = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && !m.get(x, y) && !block[y * W + x] && !keep[y * W + x] && m.floorCells[y * W + x] !== 2;
    const flavors = new Map();
    for (const r of rooms) {
      let fl = r === start ? 'start' : weighted(D, T.flavors);
      if (r === stairsRoom && fl === 'pool') fl = 'hall';
      if (fl === 'hall' && (r.w < 7 || r.h < 6)) fl = T.small;
      if ((fl === 'pool' || fl === 'shrine') && (r.w < 5 || r.h < 5)) fl = T.small;
      if (r.vault) fl = 'vault';
      flavors.set(r, fl); r.flavor = fl;
    }
    // floors first (water, daises, plank rooms), then pillars and walls, then props
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (corr[y * W + x] && !m.get(x, y) && T.corrAlt) m.setFloor(x, y, 3);
    for (const r of rooms) {
      const fl = r.flavor, x0 = r.x, y0 = r.y, x1 = r.x + r.w - 1, y1 = r.y + r.h - 1;
      if (fl === 'store' || fl === 'vault') for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, 3);
      if (fl === 'pool') {
        for (let y = y0 + 1; y <= y1 - 1; y++) for (let x = x0 + 1; x <= x1 - 1; x++) m.setFloor(x, y, 1);
        if (r.w >= 7 && r.h >= 7) { for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) if (!keep[y * W + x]) m.setFloor(x, y, 2); }
      }
      if (fl === 'shrine') {
        for (let y = y0 + 1; y <= y1 - 1; y++) for (let x = x0 + 1; x <= x1 - 1; x++) { m.setLvl(x, y, 0.18); m.setFloor(x, y, 3); }
      }
      if (fl === 'hall') {
        for (const [px, py] of [[x0 + 2, y0 + 2], [x1 - 2, y0 + 2], [x0 + 2, y1 - 2], [x1 - 2, y1 - 2]]) if (!keep[py * W + px] && !m.get(px, py)) { m.set(px, py, WALL(T.pillar)); block[py * W + px] = 1; }
      }
      if (fl === 'ruin') {
        const n = ri(D, 1, 3);
        for (let k = 0, tries = 0; k < n && tries < 30; tries++) {
          const px = ri(D, x0 + 2, x1 - 2), py = ri(D, y0 + 2, y1 - 2);
          if (px > x1 - 2 || py > y1 - 2 || !free(px, py)) continue;
          let near = false; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (block[(py + j) * W + px + i]) near = true;
          if (near) continue;
          m.block(px, py, T.alt, 0.42); block[py * W + px] = 1; k++;
        }
      }
    }
    // spots along a room's walls: a floor cell whose neighbour (sx, sy) is plain wall; never beside an opening
    const wallSpots = (r) => {
      const out = [];
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (!free(x, y)) continue;
        for (const [dx, dy] of DIRS4) {
          const nx = x + dx, ny = y + dy; if (roomAt[ny * W + nx] === r.i) continue;
          if (solidWall(nx, ny) && !(m.get(nx, ny).top != null)) { out.push({ x, y, sx: dx, sy: dy }); break; }
        }
      }
      return out;
    };
    const spread = (spots, n) => {     // the first at random, then each the farthest from those chosen
      const out = []; if (!spots.length) return out;
      out.push(spots[(D() * spots.length) | 0]);
      while (out.length < n && out.length < spots.length) {
        let best = null, bd = -1;
        for (const s of spots) { if (out.includes(s)) continue; let d = 1e9; for (const o of out) d = Math.min(d, (s.x - o.x) * (s.x - o.x) + (s.y - o.y) * (s.y - o.y)); if (d > bd) { bd = d; best = s; } }
        if (!best) break; out.push(best);
      }
      return out;
    };
    const torch = (s) => m.deco('torch', s.x + 0.5 + s.sx * 0.36, s.y + 0.5 + s.sy * 0.36, { scale: 0.52, yOff: -0.36, solid: false, nopick: true, glow: 0.8, lightCol: [66, 34, 9], label: TX_LOOK.torch });
    const glassLamp = (s) => { block[s.y * W + s.x] = 1; return m.deco('lamp', s.x + 0.5 + s.sx * 0.22, s.y + 0.5 + s.sy * 0.22, { radius: 0.15, scale: 0.7, glow: 0.5, glassLamp: true, label: TX_LOOK.glass }); };
    const brazier = (x, y) => { block[y * W + x] = 1; return m.deco('brazier', x + 0.5, y + 0.5, { scale: 0.62, solid: true, radius: 0.25, glow: 0.75, lightCol: [62, 31, 8], label: TX_LOOK.brazier }); };
    const prop = (sp, s, opt) => { const solid = !opt || opt.solid !== false; if (solid) block[s.y * W + s.x] = 1; return m.deco(sp, s.x + 0.5 + s.sx * 0.18, s.y + 0.5 + s.sy * 0.18, Object.assign({ solid, radius: solid ? 0.3 : 0.1, scale: 0.75 }, opt || {})); };
    for (const r of rooms) {
      const fl = r.flavor, spots = wallSpots(r);
      const nLight = r === start ? 2 : 1 + (r.area >= 36 ? 1 : 0);
      const lit = spread(spots, nLight);
      lit.forEach((s, i) => { if (T.glass && i % 2 === 1) glassLamp(s); else torch(s); });
      const rest = spots.filter((s) => !lit.includes(s) && free(s.x, s.y));
      const take = (n) => { const out = []; for (let k = 0; k < n && rest.length; k++) out.push(rest.splice((D() * rest.length) | 0, 1)[0]); return out.filter((s) => free(s.x, s.y)); };
      if (fl === 'start') take(2).forEach((s) => prop(pick(D, ['p_barrel', 'p_crate']), s, { scale: 0.7 }));
      if (fl === 'store') take(ri(D, 3, 6)).forEach((s) => prop(pick(D, ['p_barrel', 'p_crate', 'crates', 'p_barrel']), s, { scale: 0.65 + D() * 0.2 }));
      if (fl === 'plain') {
        if (f === 1) { const t = take(2); if (t[0]) prop('table', t[0], { scale: 0.8 }); if (t[1]) prop('chair', t[1], { scale: 0.7 }); }
        else take(2).forEach((s) => prop(f === 2 ? 'bones' : 'ln17_rubble', s, { solid: false, scale: 0.6 }));
      }
      if (fl === 'ossuary') { take(ri(D, 3, 5)).forEach((s) => prop(pick(D, ['bones', 'p_bones_small', 'p_bones_small']), s, { solid: false, scale: 0.6 })); const st = take(1)[0]; if (st) prop(pick(D, ['p_statue_head', 'p_statue_broken2']), st, { scale: 0.8 }); }
      if (fl === 'ruin') take(ri(D, 2, 4)).forEach((s) => prop(pick(D, ['ln17_rubble', 'p14p_heap_b', 'p14p_plank']), s, { solid: false, scale: 0.7 }));
      if (fl === 'hall' && f >= 2) take(1).forEach((s) => prop('p_statue_broken', s, { scale: 0.9 }));
      if (fl === 'shrine') {
        if (free(r.cx, r.cy)) { block[r.cy * W + r.cx] = 1; m.deco('p_statue_broken', r.cx + 0.5, r.cy + 0.5, { solid: true, radius: 0.35, scale: 0.95, label: TX_LOOK.statue }); }
        for (const [bx, by] of [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + r.h - 2]]) if (free(bx, by)) brazier(bx, by);
      }
      if (fl === 'vault') take(1).forEach((s) => prop('shelf', s, { scale: 0.8 }));
      if (fl === 'pool') take(2).forEach((s) => prop(pick(D, ['p14p_plank', 'ln17_rubble']), s, { solid: false, scale: 0.6 }));
    }
    // the stair room: braziers either side of the stair's front
    { const sx = stair.ix - stair.x, sy = stair.iy - stair.y; const px = sy !== 0 ? 1 : 0, py = sx !== 0 ? 1 : 0;
      for (const k of [-1, 1]) { const bx = stair.ix + px * k, by = stair.iy + py * k; if (!m.get(bx, by) && roomAt[by * W + bx] === stairsRoom.i && m.floorCells[by * W + bx] !== 2) { keep[by * W + bx] = 0; if (!block[by * W + bx]) brazier(bx, by); } } }
    // corridor torches, every so often on a corridor wall
    for (let y = 1, n = 0; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (!corr[y * W + x] || m.get(x, y) || keep[y * W + x]) continue;
      if (((x * 7 + y * 13 + (seed & 7)) % 17) !== 0) continue;
      for (const [dx, dy] of DIRS4) if (solidWall(x + dx, y + dy) && roomAt[(y + dy) * W + x + dx] < 0) { torch({ x, y, sx: dx, sy: dy }); n++; break; }
    }
    // wall marks (decals.js reads m._decalsAll): a few faces that look onto open floor
    const marks = {};
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const c = m.get(x, y); if (!c || c.door || c.top != null) continue;
      if (!DIRS4.some(([dx, dy]) => !m.get(x + dx, y + dy))) continue;
      if (D() < 0.09) marks[y * W + x] = pick(D, T.decals);
    }
    m._decalsAll = marks;
    m.ceilTextures = [m.ceil, T.ceilTex]; m._ceilCellsAll = new Uint8Array(W * H).fill(1); m._ceilAssigned = true;
    // ---- population (its own stream)
    dist = bfs(m, start.cx, start.cy, { locked: false, block });
    const sx0 = start.cx, sy0 = start.cy;
    const foeCells = [];
    for (const r of rooms) {
      if (r === start || r.vault) continue;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        const d = dist[y * W + x];
        if (d < SAFE.steps || (x - sx0) * (x - sx0) + (y - sy0) * (y - sy0) < SAFE.cells * SAFE.cells) continue;
        if (!free(x, y) && !(keep[y * W + x] && !m.get(x, y) && !block[y * W + x])) continue;
        if (m.floorCells[y * W + x] === 2) continue;
        foeCells.push([x, y, r]);
      }
    }
    if (foeCells.length < T.foes) return null;
    const foes = [];
    for (let k = 0, tries = 0; k < T.foes && tries < 400; tries++) {
      const [x, y, r] = foeCells[(P() * foeCells.length) | 0];
      if (foes.some((e) => (e.cx - x) * (e.cx - x) + (e.cy - y) * (e.cy - y) < 7)) continue;
      if (foes.filter((e) => e.room === r).length >= 1 + (r.area >= 36 ? 1 : 0) + (r === stairsRoom ? 1 : 0)) continue;
      foes.push({ cx: x, cy: y, room: r, type: weighted(P, T.pool) }); k++;
    }
    if (foes.length < T.foes - 1) return null;
    // elites: Legionnaires; on the last floor one keeps the stair
    let elites = 0;
    if (T.elites) {
      const guard = foes.find((e) => e.room === stairsRoom) || null;
      const order = (guard && f === 3 ? [guard] : []).concat(foes.filter((e) => e !== guard));
      for (const e of order) { if (elites >= T.elites) break; e.type = 'legionnaire'; e.elite = true; elites++; }
    }
    for (const e of foes) {
      const o = m.enemy(e.type, e.cx + 0.5, e.cy + 0.5, { _d18: 1 });
      if (e.elite) { o.elite = true; o._d18elite = 1; }
    }
    m._d18.foes = foes.length; m._d18.elites = elites;
    // treasure and supplies
    let treasure = 0;
    const loose = [];
    const itemAt = (id, s, pts) => { const o = m.item(id, s.x + 0.5 + s.sx * 0.15, s.y + 0.5 + s.sy * 0.15); if (pts) { o._d18t = pts; treasure += pts; } loose.push([s.x, s.y]); return o; };
    const cacheAt = (s, tier) => { const pts = tier >= 2 ? TREASURE.cache2 : TREASURE.cache1; const o = m.add({ kind: 'item', item: 'cache', tier, x: s.x + 0.5 + s.sx * 0.2, y: s.y + 0.5 + s.sy * 0.2, sprite: 'chest', scale: 0.5, solid: false, label: TX_LOOK.chest, _d18t: pts }); treasure += pts; loose.push([s.x, s.y]); return o; };
    const spotIn = (r) => { const sp = wallSpots(r).filter((s) => free(s.x, s.y) && !loose.some(([x, y]) => x === s.x && y === s.y)); return sp.length ? sp[(P() * sp.length) | 0] : null; };
    for (const r of rooms) if (r.vault) { const s = spotIn(r); if (s) cacheAt(s, 2); const t = spotIn(r); if (t) itemAt(pick(P, ['v_signet', 'v_gear', 'v_mesh']), t, TREASURE.trinket); }
    const others = rooms.filter((r) => r !== start && !r.vault);
    const deadEnds = others.filter((r) => r.open.length === 1 && r !== stairsRoom);
    { const r = deadEnds.length ? pick(P, deadEnds) : pick(P, others); const s = spotIn(r); if (s) cacheAt(s, 1); }
    for (let k = 0; k < 1 + f; k++) {
      const r = pick(P, others), s = spotIn(r), purse = P() < 0.45, id = purse ? 'sovereigns' : pick(P, ['v_scrap', 'v_scrap', 'v_signet', 'v_mesh']);
      if (s) itemAt(id, s, purse ? TREASURE.purse : TREASURE.trinket);
    }
    const supplies = f === 1 ? [] : f === 2 ? ['tonic', 'pellets'] : ['tonic', 'honey'];
    for (const id of supplies) { const r = pick(P, others), s = spotIn(r); if (s) itemAt(id, s, 0); }
    m._d18.treasure = treasure;
    // no sealed pockets: a solid prop that walls an open cell off from the rest is taken away (twice over, for corners)
    for (let pass = 0; pass < 3; pass++) {
      const dl = bfs(m, start.cx, start.cy, { locked: true, block });
      let changed = false;
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (m.get(x, y) || block[i] || m.floorCells[i] === 2 || dl[i] >= 0) continue;
        for (const [dx, dy] of DIRS4) {
          const j = (y + dy) * W + x + dx; if (!block[j] || m.get(x + dx, y + dy)) continue;
          for (let k = m.entities.length - 1; k >= 0; k--) { const e = m.entities[k]; if (e.kind === 'deco' && ((e.y | 0) * W + (e.x | 0)) === j) m.entities.splice(k, 1); }
          block[j] = 0; changed = true;
        }
      }
      if (!changed) break;
    }
    m.rooms = rooms.map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, cx: r.cx, cy: r.cy, flavor: r.flavor, vault: !!r.vault, stairs: r === stairsRoom, start: r === start }));
    m.baseCount = m.entities.length;
    m._block = block;
    // ---- the checks: any failure rebuilds from the next attempt seed
    if (!validate(m)) return null;
    return m;
  }
  // a dead-end niche in a room's wall (wall behind it and either side); returns the cell and the floor cell in front
  function wallNiche(m, r, L) {
    const W = m.w, cands = [];
    const solid = (x, y) => { const c = m.get(x, y); return !!c && !c.door && c.top == null; };
    for (const [dx, dy] of DIRS4) {
      if (dx === 0) { const y = dy < 0 ? r.y - 1 : r.y + r.h; for (let x = r.x + 1; x < r.x + r.w - 1; x++) cands.push([x, y, dx, dy]); }
      else { const x = dx < 0 ? r.x - 1 : r.x + r.w; for (let y = r.y + 1; y < r.y + r.h - 1; y++) cands.push([x, y, dx, dy]); }
    }
    // the middle of a wall first, then outwards; which wall from the layout stream
    const off = (L() * 4) | 0;
    cands.sort((a, b) => ((DIRS4.findIndex((d) => d[0] === a[2] && d[1] === a[3]) + off) % 4) - ((DIRS4.findIndex((d) => d[0] === b[2] && d[1] === b[3]) + off) % 4) || (Math.abs(a[0] - r.cx) + Math.abs(a[1] - r.cy)) - (Math.abs(b[0] - r.cx) + Math.abs(b[1] - r.cy)));
    for (const [x, y, dx, dy] of cands) {
      if (x < 1 || y < 1 || x > W - 2 || y > m.h - 2) continue;
      if (!solid(x, y) || !solid(x + dx, y + dy)) continue;
      const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0;
      if (!solid(x + px, y + py) || !solid(x - px, y - py)) continue;
      if (m.get(x - dx, y - dy)) continue;
      return { x, y, ix: x - dx, iy: y - dy };
    }
    return null;
  }
  // breadth-first steps over the cell grid. Closed doors count as open (you open them); locked doors only with
  // { locked: true }; portals, solid props (opts.block) and deep water never. Returns Int32Array (-1 = unreachable).
  function bfs(m, sx, sy, opts) {
    opts = opts || {};
    const W = m.w, H = m.h, d = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
    const open = (x, y) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const i = y * W + x, c = m.cells[i];
      if (c) { if (!c.door || c.portal) return false; if (c.lockDifficulty && !opts.locked) return false; }
      if (m.floorCells && m.floorCells[i] === 2) return false;
      if (opts.block && opts.block[i]) return false;
      return true;
    };
    if (!open(sx, sy)) return d;
    let h = 0, t = 0; d[sy * W + sx] = 0; q[t++] = sy * W + sx;
    while (h < t) {
      const i = q[h++], x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy; if (!open(nx, ny)) continue;
        const j = ny * W + nx; if (d[j] >= 0) continue;
        // heights: a rise taller than a step is a wall
        if (m.lvls && Math.abs((m.lvls[j] || 0) - (m.lvls[i] || 0)) > STEP_UP_SAFE) continue;
        d[j] = d[i] + 1; q[t++] = j;
      }
    }
    return d;
  }
  const STEP_UP_SAFE = (typeof STEP_UP === 'number' ? STEP_UP : 0.36) - 0.05;
  function validate(m) {
    const W = m.w, sx = m.spawn.x | 0, sy = m.spawn.y | 0, st = m._d18.stairs, block = m._block;
    const d = bfs(m, sx, sy, { locked: false, block });
    const dl = bfs(m, sx, sy, { locked: true, block });
    if (d[sy * W + sx] !== 0) return false;
    if (!st || d[st.iy * W + st.ix] < 0) return false;                       // the stair, with every lock shut
    for (const e of m.entities) {
      const i = (e.y | 0) * W + (e.x | 0);
      if (e.kind === 'item' && dl[i] < 0) return false;                       // all loot reachable (vaults by their lock)
      if (e.kind === 'enemy') {
        if (d[i] >= 0 && d[i] < SAFE.steps) return false;
        if ((e.x - m.spawn.x) * (e.x - m.spawn.x) + (e.y - m.spawn.y) * (e.y - m.spawn.y) < SAFE.cells * SAFE.cells) return false;
        if (dl[i] < 0) return false;
      }
    }
    m._d18.stairSteps = d[st.iy * W + st.ix];
    return true;
  }
  // a plain, always-valid floor: a ring of four rooms (never needed in 60 seeds; here so a run can never fail to build)
  function fallbackFloor(T, f) {
    const m = newMap(T, f), W = m.w, H = m.h;
    m.rect(0, 0, W - 1, H - 1, T.wall);
    m.clear(2, 2, 8, 8); m.clear(W - 10, 2, W - 4, 8); m.clear(2, H - 10, 8, H - 4); m.clear(W - 10, H - 10, W - 4, H - 4);
    m.clear(9, 5, W - 11, 5); m.clear(5, 9, 5, H - 11); m.clear(W - 7, 9, W - 7, H - 11);
    m.spawn = { x: 5.5, y: 5.5, dir: 0 };
    const last = f === 3;
    m.set(W - 3, H - 7, DOOR({ tex: last ? 'd18_up' : 'd18_down', portal: { map: last ? IDS[2] : IDS[f], useSpawn: true, d18: last ? 'out' : 'down' }, label: last ? TX.out : TX.down }));
    m._d18.stairs = { x: W - 3, y: H - 7, ix: W - 4, iy: H - 7 };
    m.deco('torch', 2.14, 5.5, { scale: 0.52, yOff: -0.36, solid: false, nopick: true, glow: 0.8, lightCol: [66, 34, 9] });
    m.deco('brazier', W - 4.5, H - 8.5, { scale: 0.62, solid: false, glow: 0.8, lightCol: [74, 38, 10] });
    m.enemy('hound', W - 6.5, 5.5, { _d18: 1 }); m.enemy('proctor', 5.5, H - 6.5, { _d18: 1 });
    m._d18.foes = 2;
    m.add({ kind: 'item', item: 'cache', tier: 1, x: W - 9.5, y: H - 9.5, sprite: 'chest', scale: 0.5, solid: false, label: TX_LOOK.chest, _d18t: TREASURE.cache1 });
    m._d18.treasure = TREASURE.cache1;
    m.rooms = []; m._decalsAll = {}; m._block = new Uint8Array(W * H);
    m.baseCount = m.entities.length;
    return m;
  }
  const TX_LOOK = {
    torch: 'A torch in a wall bracket',
    brazier: 'An iron brazier, coals banked',
    glass: 'A lamp of green-gold glass, burning without oil',
    chest: 'A strongbox, left behind by somebody in a hurry',
    statue: 'A broken statue. Its face has been worn away by hands.',
  };
  for (const v of Object.values(TX_LOOK)) TEXTS.push(v);

  // the three floors of a key, built fresh (pure function of the key)
  function buildAll(key) { return [1, 2, 3].map((f) => genFloor(key, f)); }
  // a stable fingerprint of a built floor: cells, floors, heights, entities, spawn
  function hashMap(m) {
    const parts = [m.id, m.w + 'x' + m.h, m.spawn.x, m.spawn.y, m.spawn.dir.toFixed(4)];
    for (let i = 0; i < m.cells.length; i++) {
      const c = m.cells[i];
      parts.push(c ? c.tex + (c.door ? 'D' : '') + (c.lockDifficulty || '') + (c.top != null ? '^' + c.top : '') + (c.portal ? 'P' + c.portal.d18 : '') : '.');
    }
    parts.push(Array.from(m.floorCells || []).join(''));
    if (m.lvls) parts.push(Array.from(m.lvls, (v) => Math.round(v * 100)).join(','));
    for (const e of m.entities) parts.push([e.kind, e.sprite || '', e.type || '', e.item || '', e.tier || '', e.x.toFixed(2), e.y.toFixed(2), e.elite ? 'E' : '', e._d18t || ''].join(':'));
    for (const k of Object.keys(m._decalsAll || {}).sort((a, b) => a - b)) parts.push(k + '=' + m._decalsAll[k]);
    const s = parts.join('|');
    return hash32(s).toString(16).padStart(8, '0') + hash32('b' + s).toString(16).padStart(8, '0');
  }
  function hashKey(key) { return buildAll(key).map(hashMap).join('-'); }
  const totalsCache = new Map();
  function totals(key) {
    if (totalsCache.has(key)) return totalsCache.get(key);
    const ms = buildAll(key), t = { foes: 0, elites: 0, treasure: 0, attempts: [] };
    for (const m of ms) { t.foes += m._d18.foes; t.elites += m._d18.elites; t.treasure += m._d18.treasure; t.attempts.push(m._d18.attempt); }
    if (totalsCache.size > 64) totalsCache.clear();
    totalsCache.set(key, t); return t;
  }

  // ---------------------------------------------------------------- textures (procedural stand-ins, painted once)
  function paintStair(up) {
    const T = 64, d = new Uint32Array(T * T);
    const px = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
    const n = (x, y, s) => (hash32(x + ',' + y + ',' + s) & 255) / 255;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      // the frame: dressed stone blocks round an arched opening
      const ax = x - 31.5, inArch = Math.abs(ax) < 21 && (y > 14 || (ax * ax + (y - 22) * (y - 22) * 1.6) < 21 * 21) && y < 62;
      let c;
      if (!inArch) {
        const row = (y / 8) | 0, bx = ((x + (row & 1) * 8) / 16) | 0, mortar = y % 8 === 0 || (x + (row & 1) * 8) % 16 === 0;
        const k = mortar ? 0.45 : 0.72 + n(bx, row, up ? 3 : 4) * 0.25 + (n(x, y, 9) - 0.5) * 0.12;
        c = px(118 * k, 110 * k, 98 * k);
      } else {
        // steps: bands that narrow and darken into the distance (down), or climb toward a pale light (up)
        const t = up ? (61 - y) / 46 : (y - 14) / 48;               // 0 near the top of the opening .. 1 at the sill
        const step = ((y - 14) / 5) | 0, edge = (y - 14) % 5 === 0;
        let k;
        if (up) { k = 0.25 + (1 - t) * 0.85; if (edge) k *= 1.25; }
        else { k = 0.06 + t * t * 0.62; if (edge) k *= 1.6; }
        const side = Math.abs(ax) / 21; k *= 1 - side * side * 0.55;
        k *= 0.9 + n(step, x >> 2, up ? 5 : 6) * 0.2;
        c = up ? px(220 * k + (1 - t) * 30, 196 * k + (1 - t) * 20, 150 * k) : px(120 * k, 104 * k, 86 * k);
      }
      d[y * T + x] = c;
    }
    return d;
  }
  function installArt() {
    try {
      if (typeof Engine === 'undefined' || !Engine.addTexture) return;
      if (!Engine.textures.d18_down) Engine.addTexture('d18_down', paintStair(false));
      if (!Engine.textures.d18_up) Engine.addTexture('d18_up', paintStair(true));
    } catch (e) { warnOnce('art', e); }
  }

  // ---------------------------------------------------------------- scoring and the share code
  function scoreOf(r) {   // r: { t seconds, n kills, e elites, r treasure, h hurt, f floor 1..3, w 0 left / 1 fell / 2 cleared }
    let s = (r.f - 1) * SCORE.floor + r.n * SCORE.kill + r.e * SCORE.elite + r.r - r.h * SCORE.hurt;
    if (r.w === 2) s += SCORE.clear + Math.max(0, SCORE.par - r.t);
    return Math.max(0, Math.round(s));
  }
  const PACK = [['t', 6000], ['n', 100], ['e', 10], ['r', 4000], ['h', 1000], ['f', 3], ['w', 3]];
  function pack(r) { let v = 0; for (const [k, b] of PACK) { const x = k === 'f' ? r.f - 1 : r[k]; v = v * b + clamp(x | 0, 0, b - 1); } return v; }
  function unpack(v) { const o = {}; for (let i = PACK.length - 1; i >= 0; i--) { const [k, b] = PACK[i]; o[k] = v % b; v = Math.floor(v / b); } o.f += 1; if (v !== 0) return null; const r = {}; for (const [k] of PACK) r[k] = o[k]; return r; }
  const CHK_SALT = 'octave-daily18-share|';
  function chk(body) { return (hash32(CHK_SALT + body) % 60466176).toString(36).toUpperCase().padStart(5, '0'); }   // 36^5
  function makeCode(key, r) {
    const head = (isPractice(key) ? 'P18-' + key.slice(1) : 'D18-' + key) + '-' + scoreOf(r) + '-' + pack(r).toString(36).toUpperCase();
    return head + '-' + chk(head);
  }
  const CODE_RE = /^(D18-(\d{8})|P18-([1-9]\d{0,5}))-(\d{1,5})-([0-9A-Z]{1,11})-([0-9A-Z]{5})$/;
  // returns { key, score, parts } or null. Rejects: a bad shape, a wrong checksum, a score that does not add up, parts out
  // of range, more kills / elites / treasure than that day's dungeon holds, a date in the future.
  function checkCode(text) {
    const s = String(text == null ? '' : text).trim().toUpperCase().replace(/\s+/g, '').slice(0, 64);
    const m = CODE_RE.exec(s); if (!m) return null;
    const head = s.slice(0, s.lastIndexOf('-'));
    if (chk(head) !== m[6]) return null;
    const key = m[2] ? m[2] : 'p' + m[3];
    if (!validKey(key)) return null;
    if (!isPractice(key) && key > dayKey(new Date(clockFn().getTime() + 86400000))) return null;
    const v = parseInt(m[5], 36); if (!Number.isSafeInteger(v)) return null;
    const r = unpack(v); if (!r) return null;
    if (scoreOf(r) !== +m[4]) return null;
    if (r.e > r.n || (r.w === 2 && r.f !== 3) || (r.w === 2 && r.t < 20)) return null;
    const T = totals(key);
    if (r.n > T.foes || r.e > T.elites || r.r > T.treasure) return null;
    return { key, score: +m[4], parts: r };
  }

  // ---------------------------------------------------------------- the results table (localStorage; validated)
  const store = { runs: [] };
  const intIn = (v, a, b) => typeof v === 'number' && Number.isInteger(v) && v >= a && v <= b;
  function cleanRun(o) {
    if (!o || typeof o !== 'object' || !validKey(o.k)) return null;
    const r = { k: o.k, t: o.t, n: o.n, e: o.e, r: o.r, h: o.h, f: o.f, w: o.w, at: o.at };
    if (!intIn(r.t, 0, 5999) || !intIn(r.n, 0, 99) || !intIn(r.e, 0, 9) || !intIn(r.r, 0, 3999) || !intIn(r.h, 0, 999) || !intIn(r.f, 1, 3) || !intIn(r.w, 0, 2)) return null;
    if (!intIn(r.at, 0, 4102444800000)) r.at = 0;
    r.s = scoreOf(r);
    return r;
  }
  function loadStore() {
    store.runs = [];
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object' && Array.isArray(o.runs)) store.runs = o.runs.slice(0, TABLE_MAX).map(cleanRun).filter(Boolean);
    } catch (e) { /* blocked storage or junk: an empty table */ }
  }
  function saveStore() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, runs: store.runs.map((r) => ({ k: r.k, t: r.t, n: r.n, e: r.e, r: r.r, h: r.h, f: r.f, w: r.w, at: r.at })) })); } catch (e) { /* this page only */ } }
  function bestFor(key) { let b = null; for (const r of store.runs) if (r.k === key && (!b || r.s > b.s)) b = r; return b; }
  function record(run) {
    const prev = bestFor(run.k);
    store.runs.unshift(run); store.runs.length = Math.min(store.runs.length, TABLE_MAX); saveStore();
    return !prev || run.s > prev.s;
  }

  // ---------------------------------------------------------------- the run
  let R = null;              // the live run (null outside one)
  let pending = null;        // { key } set just before EXTRAS17.start
  let lastResult = null;     // the result shown on the panel after a run
  const live = () => !!(R && !R.over && hasG() && typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra() === EXTRA_ID);
  const inRun = () => !!(R && hasG() && typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra() === EXTRA_ID);
  function partsNow(w) {
    return { t: clamp(Math.round(R.t), 0, 5999), n: clamp(R.kills, 0, 99), e: clamp(R.elites, 0, 9), r: clamp(R.treasure, 0, 3999), h: clamp(Math.round(R.hurt), 0, 999), f: R.floor, w };
  }
  function kitUp() {
    const p = G.player;
    p.name = TX.title; p.hpMax = KIT.hp; p.hp = KIT.hp; p.voiceMax = KIT.voice; p.voice = KIT.voice; p.fat = p.fatMax;
    p.weapons = KIT.weapons.slice(); p.weapon = 0; p.pellets = KIT.pellets; p.bolts = 0; p.gold = 0; p.glass = 0; p.glassed = false;
    p.songs = KIT.songs.slice(); p.inv = []; p.armor = {}; p.xp = 0; p.level = 1; p.kills = 0;
    for (const id of KIT.armor) { p.inv.push({ id, n: 1 }); p.armor[ARMOR[id].slot] = id; }
    for (const [id, n] of KIT.items) p.inv.push({ id, n });
  }
  function startRun() {
    const key = pending && validKey(pending.key) ? pending.key : dayKey();
    pending = null;
    const maps = buildAll(key);
    for (const m of maps) G.maps[m.id] = m;
    kitUp();
    G.tod = TOD; G.day = 3; G.noise = 1; G.journal = []; G.ledger = [];
    try { if (typeof Weather !== 'undefined' && Weather.hold) Weather.hold('clear'); } catch (e) { /* none */ }
    R = { key, floor: 1, t: 0, kills: 0, elites: 0, treasure: 0, hurt: 0, lastHp: G.player.hp, over: false, hudT: 0, taken: new Set(), killed: new Set(), totals: totals(key), hashes: maps.map(hashMap) };
    loadMap(IDS[0], maps[0].spawn);
    G.state = 'play';
    hud(true);
    const title = isPractice(key) ? TX.practiceTitle : TX.title;
    showEvent(title, isoOf(key) + '<br><br>' + TX.introBody + '<br><br>' + TX.introKit, [
      { t: TX.introGo, f: () => { try { msg(TX.startMsg, 'warn', 6000); } catch (e) { /* cue only */ } ghostStart(); } },
      { t: TX.introLeave, f: () => { R.t = 0; endRun(0, true); } },
    ]);
  }
  // ghost replays (js/ghost18.js, optional, inert when Ghosts are off): record every run from the first step and race
  // the best one kept for the same key. The ghost never touches the run.
  const ghostKey = (k) => 'daily:' + k;
  const G18 = () => (typeof GHOST18 !== 'undefined' && GHOST18 && GHOST18.enabled && GHOST18.enabled() ? GHOST18 : null);
  function ghostStart() {
    try { const g = G18(); if (!g || !R) return; const k = ghostKey(R.key); if (g.best && g.best(k) && g.play) g.play(k); if (g.record) g.record(k); } catch (e) { warnOnce('ghost', e); }
  }
  function ghostEnd(how, score) {
    try {
      const g = G18(); if (!g) return;
      if (g.stopPlay) g.stopPlay();
      if (how == null) { if (g.abort) g.abort(); } else if (g.stop) g.stop({ win: how === 2, score });
    } catch (e) { warnOnce('ghost', e); }
  }
  function trackHp() {
    const p = G.player; if (!p) return;
    const hp = Math.max(0, p.hp);
    if (hp < R.lastHp) R.hurt += R.lastHp - hp;
    R.lastHp = hp;
  }
  function tick(dt) {
    R.t += dt;
    trackHp();
    G.tod = TOD;                                // the clock holds: no night comes down here
    R.hudT -= dt; if (R.hudT <= 0) { R.hudT = 0.25; hud(true); }
  }
  // how: 0 left, 1 fell, 2 cleared. silent: leave without a card (the intro's "Not now")
  function endRun(how, silent) {
    if (!R || R.over) return null;
    trackHp();
    R.over = true;
    const parts = partsNow(how), run = Object.assign({ k: R.key, at: Date.now() }, parts);
    run.s = scoreOf(parts);
    const res = { key: R.key, parts, score: run.s, code: makeCode(R.key, parts), best: false, silent: !!silent };
    if (!silent) res.best = record(run);
    lastResult = silent ? null : res;
    ghostEnd(silent ? null : how, run.s);
    hud(false);
    if (silent) { leaveRun(res); return res; }
    const title = how === 2 ? TX.resCleared : how === 1 ? TX.resFell : TX.resLeft;
    try { closeModal(); } catch (e) { /* none */ }
    showEvent(title, TX.endScore.replace('{0}', String(run.s)), [{ t: TX.toResults, f: () => leaveRun(res) }]);
    return res;
  }
  function leaveRun(res) {
    const was = R; R = null;
    try { if (typeof Weather !== 'undefined' && Weather.release) Weather.release(); } catch (e) { /* none */ }
    try { EXTRAS17.finish({ text: res && !res.silent ? String(res.score) : '' }); } catch (e) { console.warn('daily18 finish failed', e); }
    hud(false);
    if (res && !res.silent) { try { openPanel({ result: res }); } catch (e) { warnOnce('panel', e); } }
    return was;
  }
  function begin(key) {
    if (typeof EXTRAS17 === 'undefined' || EXTRAS17.inExtra() || !hasG() || G.state !== 'title') return false;
    if (!validKey(key)) return false;
    pending = { key };
    try { closeModal(); } catch (e) { /* none */ }
    const ok = EXTRAS17.start(EXTRA_ID);
    if (!ok) { pending = null; R = null; try { openPanel({ failed: true }); } catch (e) { /* none */ } }
    return ok;
  }

  // ---------------------------------------------------------------- the HUD strip (DOM; labels and numbers in their own nodes)
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  let hudEl = null, hudNums = null;
  function hud(on) {
    try {
      if (!hudEl) {
        const host = document.getElementById('game'); if (!host) return;
        hudEl = el('div', { id: 'd18-hud', role: 'status', 'aria-live': 'off' }); hudNums = {};
        for (const [k, lab] of [['f', TX.hudFloor], ['t', TX.hudTime], ['s', TX.hudScore]]) {
          const g = el('span', { class: 'd18-h' }); g.appendChild(el('span', { class: 'd18-l' }, lab)); hudNums[k] = el('b', null, ''); g.appendChild(hudNums[k]); hudEl.appendChild(g);
        }
        hudEl.hidden = true; host.appendChild(hudEl);
      }
      if (!on || !R) { hudEl.hidden = true; return; }
      hudEl.hidden = false;
      const parts = partsNow(0);
      hudNums.f.textContent = R.floor + '/3'; hudNums.t.textContent = mmss(R.t); hudNums.s.textContent = String(scoreOf(parts));
    } catch (e) { warnOnce('hud', e); }
  }

  // ---------------------------------------------------------------- the title button and the panel
  const CSS = `
#d18-hud { position: absolute; right: 1.2cqw; top: 7.4cqh; z-index: 6; pointer-events: none; font-family: var(--font-sc), serif; font-size: 1.6cqw;
  color: #e9dcc0; background: rgba(12,10,8,.62); border: 1px solid rgba(201,160,80,.45); padding: .25cqh .8cqw; border-radius: 2px; text-shadow: 0 1px 0 #000; }
#d18-hud[hidden] { display: none; }
#d18-hud .d18-h { margin-left: .9cqw; } #d18-hud .d18-h:first-child { margin-left: 0; }
#d18-hud .d18-l { color: #c9b38a; margin-right: .4cqw; } #d18-hud b { color: var(--gold, #d9a441); font-weight: 400; }
#modal-panel .d18-card { border: 1px solid var(--gold-dim, #7a5c2a); padding: .6cqh 1cqw; margin: .8cqh 0; background: rgba(0,0,0,.18); }
#modal-panel .d18-card h3 { margin: 0 0 .3cqh; }
#modal-panel .d18-date { font-family: var(--font-sc), serif; color: #e8d8b0; }
#modal-panel table.d18-tab { border-collapse: collapse; width: 100%; max-width: 100%; table-layout: fixed; }
#modal-panel table.d18-tab td { padding: .15cqh .4cqw; border-bottom: 1px solid rgba(201,160,80,.18); overflow-wrap: anywhere; }
#modal-panel table.d18-tab td.n { text-align: right; font-variant-numeric: tabular-nums; }
#modal-panel .d18-code { width: 100%; box-sizing: border-box; font-family: monospace; font-size: 1.8cqw; letter-spacing: .04em; }
#modal-panel .d18-row { display: flex; flex-wrap: wrap; gap: .6cqw; align-items: center; }
#modal-panel .d18-row input { min-width: 0; }
#modal-panel input.d18-seed { width: 12cqw; }
#modal-panel .d18-warn { color: #f0b060; } #modal-panel .d18-good { color: #b8d890; }
#modal-panel ol.d18-runs { margin: .3cqh 0; padding-left: 3cqw; } #modal-panel ol.d18-runs li { overflow-wrap: anywhere; }
`;
  function injectStyle() {
    if (document.getElementById('daily18-style')) return;
    const s = document.createElement('style'); s.id = 'daily18-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(id, text, onclick, small) { const b = el('button', { class: 'dfbtn' + (small ? ' small' : ''), id, type: 'button' }, text); b.onclick = onclick; return b; }
  function titleButton() {
    if (document.getElementById('btn-daily')) return;
    const menu = document.querySelector('#title .menu'); if (!menu) return;
    const b = el('button', { class: 'dfbtn', id: 'btn-daily', type: 'button' }, TX.btn);
    b.onclick = () => { try { Audio_.init(); Audio_.resume(); } catch (e) { /* ignore */ } openPanel(); };
    const help = document.getElementById('btn-help');
    if (help && help.parentNode === menu) menu.insertBefore(b, help); else menu.appendChild(b);
  }
  const wordOf = (w) => (w === 2 ? TX.wCleared : w === 1 ? TX.wFell : TX.wLeft);
  function runLine(r) {
    const li = el('li');
    li.appendChild(el('span', { class: 'd18-date' }, isoOf(r.k))); li.appendChild(document.createTextNode(' · '));
    li.appendChild(el('span', null, isPractice(r.k) ? TX.prac : TX.daily)); li.appendChild(document.createTextNode(' · '));
    li.appendChild(el('b', null, String(r.s))); li.appendChild(document.createTextNode(' · ' + mmss(r.t) + ' · '));
    li.appendChild(el('span', null, wordOf(r.w)));
    return li;
  }
  function resultCard(res) {
    const c = el('div', { class: 'd18-card', id: 'd18-result' });
    const P = res.parts;
    c.appendChild(el('h3', null, P.w === 2 ? TX.resCleared : P.w === 1 ? TX.resFell : TX.resLeft));
    const d = el('p'); d.appendChild(el('span', { class: 'd18-date' }, isoOf(res.key))); d.appendChild(document.createTextNode(' · ')); d.appendChild(el('span', null, isPractice(res.key) ? TX.prac : TX.daily)); c.appendChild(d);
    const tab = el('table', { class: 'd18-tab' }), rows = [
      [TX.rFloors, P.f + '/3', (P.f - 1) * SCORE.floor],
      [TX.rClear, P.w === 2 ? '1' : '0', P.w === 2 ? SCORE.clear : 0],
      [TX.rTime, mmss(P.t), null],
      [TX.rTimeBonus, '', P.w === 2 ? Math.max(0, SCORE.par - P.t) : 0],
      [TX.rKills, String(P.n), P.n * SCORE.kill],
      [TX.rElites, String(P.e), P.e * SCORE.elite],
      [TX.rTreasure, '', P.r],
      [TX.rHurt, String(P.h), -P.h * SCORE.hurt],
      [TX.rScore, '', res.score],
    ];
    for (const [lab, v, pts] of rows) {
      const tr = el('tr'); tr.appendChild(el('td', null, lab)); tr.appendChild(el('td', { class: 'n' }, v)); tr.appendChild(el('td', { class: 'n' }, pts == null ? '' : (pts > 0 && lab !== TX.rScore ? '+' : '') + pts)); tab.appendChild(tr);
    }
    c.appendChild(tab);
    if (res.best) c.appendChild(el('p', { class: 'd18-good', id: 'd18-best' }, TX.newBest));
    c.appendChild(el('h3', null, TX.codeH));
    c.appendChild(el('p', { class: 'muted' }, TX.codeP));
    const row = el('div', { class: 'd18-row' });
    const inp = el('input', { class: 'd18-code', id: 'd18-code-out', readonly: 'readonly', 'aria-label': TX.codeH }); inp.value = res.code;
    const st = el('span', { class: 'muted', id: 'd18-copy-out', role: 'status' });
    row.appendChild(inp);
    row.appendChild(btn('d18-copy', TX.copy, () => {
      try { inp.focus(); inp.select(); } catch (e) { /* ignore */ }
      const done = (ok) => { st.textContent = ok ? TX.copied : TX.copyFail; };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(res.code).then(() => done(true), () => done(false)); else done(document.execCommand && document.execCommand('copy')); } catch (e) { done(false); }
    }, true));
    row.appendChild(st);
    c.appendChild(row);
    return c;
  }
  function openPanel(opt) {
    opt = opt || {};
    if (!hasG() || G.state !== 'title' || (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra())) return false;
    loadStore();
    openModal('', 'd18menu');
    const p = document.getElementById('modal-panel');
    p.appendChild(el('h2', null, TX.title));
    const x = btn('d18-x', TX.close, () => { closeModal(); }, true); x.classList.add('close'); p.appendChild(x);
    if (opt.failed) p.appendChild(el('p', { class: 'd18-warn' }, TX.failed));
    try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.state && EXTRAS17.state.cut === EXTRA_ID) { p.appendChild(el('p', { class: 'd18-warn', id: 'd18-cut' }, TX.interrupted)); EXTRAS17.state.cut = null; } } catch (e) { /* ignore */ }
    if (opt.result) p.appendChild(resultCard(opt.result));
    const key = dayKey();
    const day = el('p'); day.appendChild(el('span', null, TX.today)); day.appendChild(document.createTextNode(' · ')); day.appendChild(el('span', { class: 'd18-date', id: 'd18-today' }, isoOf(key))); p.appendChild(day);
    p.appendChild(el('p', { class: 'muted' }, TX.sub));
    p.appendChild(el('p', { class: 'muted' }, TX.rules));
    p.appendChild(el('p', { class: 'muted' }, TX.kit));
    const row = el('div', { class: 'btns' }); row.appendChild(btn('d18-play', TX.play, () => begin(key))); p.appendChild(row);
    // results
    p.appendChild(el('h3', null, TX.results));
    const best = bestFor(key);
    const bp = el('p', { id: 'd18-best-today' }); bp.appendChild(el('span', null, TX.bestToday)); bp.appendChild(document.createTextNode(' · '));
    if (best) bp.appendChild(el('b', null, String(best.s))); else bp.appendChild(el('span', { class: 'muted' }, TX.noneToday));
    p.appendChild(bp);
    if (!store.runs.length) p.appendChild(el('p', { class: 'muted', id: 'd18-none' }, TX.none));
    else { p.appendChild(el('p', { class: 'muted' }, TX.recent)); const ol = el('ol', { class: 'd18-runs', id: 'd18-runs' }); for (const r of store.runs.slice(0, 8)) ol.appendChild(runLine(r)); p.appendChild(ol); }
    // practice
    p.appendChild(el('h3', null, TX.practice));
    p.appendChild(el('p', { class: 'muted' }, TX.practiceP));
    const pr = el('div', { class: 'd18-row' });
    pr.appendChild(el('label', { for: 'd18-seed' }, TX.seed));
    const seedIn = el('input', { class: 'd18-seed', id: 'd18-seed', type: 'text', inputmode: 'numeric', maxlength: '6', 'aria-label': TX.seed }); seedIn.value = String(randomSeed());
    pr.appendChild(seedIn);
    pr.appendChild(btn('d18-newseed', TX.newSeed, () => { seedIn.value = String(randomSeed()); }, true));
    pr.appendChild(btn('d18-practice', TX.playSeed, () => { const v = String(seedIn.value || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 6); if (v) begin('p' + v); }, true));
    p.appendChild(pr);
    // check a code
    p.appendChild(el('h3', null, TX.checkH));
    const cr = el('div', { class: 'd18-row' });
    const ci = el('input', { class: 'd18-code', id: 'd18-check-in', type: 'text', maxlength: '64', 'aria-label': TX.checkH });
    const co = el('p', { id: 'd18-check-out', role: 'status' });
    cr.appendChild(ci);
    cr.appendChild(btn('d18-check', TX.checkBtn, () => {
      co.textContent = '';
      const r = checkCode(ci.value);
      if (!r) { co.className = 'd18-warn'; co.textContent = TX.checkBad; return; }
      co.className = 'd18-good';
      co.appendChild(el('span', null, TX.checkOk)); co.appendChild(document.createTextNode(' '));
      co.appendChild(el('span', { class: 'd18-date' }, isoOf(r.key))); co.appendChild(document.createTextNode(' · '));
      co.appendChild(el('span', null, isPractice(r.key) ? TX.prac : TX.daily)); co.appendChild(document.createTextNode(' · '));
      co.appendChild(el('b', null, String(r.score))); co.appendChild(document.createTextNode(' · ' + mmss(r.parts.t) + ' · '));
      co.appendChild(el('span', null, wordOf(r.parts.w)));
    }, true));
    p.appendChild(cr); p.appendChild(co);
    const back = el('div', { class: 'btns' }); back.appendChild(btn('d18-back', TX.back, () => { closeModal(); }, true)); p.appendChild(back);
    return true;
  }
  function randomSeed() {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % 999999); } catch (e) { return 1 + (Date.now() % 999999); }
  }

  // ---------------------------------------------------------------- inside the run: no saves, Abandon instead of Leave
  function renderNoSave() {
    openModal('', 'd18nosave'); G.state = 'panel';
    const p = document.getElementById('modal-panel');
    p.appendChild(el('h2', null, TX.title));
    const x = btn('x', TX.close, () => { closeModal(); G.state = 'play'; }, true); x.classList.add('close'); p.appendChild(x);
    p.appendChild(el('p', { id: 'd18-nosave' }, TX.noSave));
    const row = el('div', { class: 'btns' }); row.appendChild(btn('d18-nosave-back', TX.back, () => renderMenu(), true)); p.appendChild(row);
  }

  // ---------------------------------------------------------------- wrappers
  function wrap() {
    if (typeof update === 'function') {
      const _f = update;
      update = function (dt) {
        const r = _f.apply(this, arguments);
        try { if (live() && G.state === 'play') tick(dt); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
    if (typeof transfer === 'function') {
      const _f = transfer;
      transfer = function (portal) {
        try {
          if (portal && portal.d18 && inRun()) {
            if (!live()) return;
            if (portal.d18 === 'out') { endRun(2); return; }
            if (portal.d18 === 'down' && R.floor < 3) {
              R.floor++;
              const m = G.maps[IDS[R.floor - 1]];
              loadMap(m.id, m.spawn);
              msg(TX.downMsg.replace('{0}', String(R.floor)), 'warn', 5000);
              if (R.floor === 3) msg(TX.lastFloor, '', 7000);
              hud(true);
              return;
            }
            return;
          }
        } catch (e) { warnOnce('transfer', e); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof killEnemy === 'function') {
      const _f = killEnemy;
      killEnemy = function (e) {
        const r = _f.apply(this, arguments);
        try { if (live() && e && e._d18 && !R.killed.has(e)) { R.killed.add(e); R.kills++; if (e._d18elite) R.elites++; } } catch (er) { warnOnce('kill', er); }
        return r;
      };
    }
    if (typeof pickUp === 'function') {
      const _f = pickUp;
      pickUp = function (e) {
        const before = !!(e && e.dead);
        const r = _f.apply(this, arguments);
        try { if (live() && e && e._d18t && !before && e.dead && !R.taken.has(e)) { R.taken.add(e); R.treasure += e._d18t; } } catch (er) { warnOnce('pick', er); }
        return r;
      };
    }
    if (typeof die === 'function') {
      const _f = die;
      die = function () {
        try { if (inRun()) { if (live()) endRun(1); return; } } catch (e) { warnOnce('die', e); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof loadMap === 'function') {
      const _f = loadMap;
      loadMap = function (id) {
        const r = _f.apply(this, arguments);
        try {
          if (IDS.includes(id) && G.map && G.map.id === id) for (const e of G.map.entities) if (e._d18elite && !e._d18hp) { e._d18hp = 1; e.hp = Math.round(e.hp * 1.5); e.hpMax = e.hp; }
        } catch (er) { warnOnce('load', er); }
        return r;
      };
    }
    for (const nm of ['renderSave', 'renderLoad']) {
      if (typeof window[nm] !== 'function') continue;
      const _f = window[nm];
      const w = function () { if (inRun()) { try { renderNoSave(); } catch (e) { warnOnce('nosave', e); } return; } return _f.apply(this, arguments); };
      if (nm === 'renderSave') renderSave = w; else renderLoad = w;
    }
    if (typeof renderMenu === 'function') {
      const _f = renderMenu;
      renderMenu = function () {
        const r = _f.apply(this, arguments);
        try {
          if (inRun()) {
            const t = document.getElementById('mn-title');
            if (t) { t.textContent = TX.abandon; t.onclick = () => { closeModal(); G.state = 'play'; if (live()) endRun(0); }; }
          }
        } catch (e) { warnOnce('menu', e); }
        return r;
      };
    }
  }
  function registerExtra() {
    try {
      if (typeof EXTRAS17 === 'undefined' || !EXTRAS17.register) return;
      EXTRAS17.register({ id: EXTRA_ID, title: TX.title, blurb: TX.sub, hidden: true, start: () => startRun() });
    } catch (e) { console.warn('daily18 register failed', e); }
  }
  function init() {
    loadStore(); installArt();
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) Object.assign(SCREENS.FAMILY, { d18_f1: 'crypt', d18_f2: 'crypt', d18_f3: 'root' }); } catch (e) { /* no cards */ }
    registerExtra();
    // extras17 wraps the game at DOMContentLoaded; ours go on after (outermost), so a run's Save / Load / Options are ours
    const boot = () => { try { wrap(); } catch (e) { warnOnce('wrap', e); } try { injectStyle(); titleButton(); hud(false); } catch (e) { warnOnce('boot', e); } };
    if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
  init();

  return {
    EXTRA_ID, KEY, IDS, SCORE, TREASURE, KIT, SAFE, THEMES, TX, TEXTS, TX_LOOK,
    dayKey, validKey, isPractice, isoOf, seedOf, themeFor, genFloor, buildAll, hashMap, hashKey, totals, bfs, validate,
    scoreOf, pack, unpack, makeCode, checkCode, store, loadStore, saveStore, record, bestFor,
    begin, open: openPanel, endRun, live, inRun, hud,
    get R() { return R; }, get lastResult() { return lastResult; },
    setClock(fn) { clockFn = typeof fn === 'function' ? fn : () => new Date(); totalsCache.clear(); },
  };
})();
if (typeof window !== 'undefined') window.DAILY18 = DAILY18;
