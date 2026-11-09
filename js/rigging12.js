// ============================================================
//  rigging12 — Phase 12 "Tools of the trade", team RIGGING
//
//  1. THE OFFICE GRAPNEL (item p12_grapnel).
//     Where you get it: a cutter-man's grapnel gun lies in the moss beside the wrecked Office cutter OC-742 in
//     the Deep Woods (a found item, picked up with E; same "grey coats still on the wreck" rule as the cutter's own
//     hold, so the Cutter-Men have to be dealt with first). It is a key item: it cannot be sold or lost to custody.
//     Use: face an iron ring set in a post (five anchors, listed in ANCHORS) and press 0 / pad Y / the Hook touch
//     button. You are hauled to a fixed landing beside the ring. It works ONLY at those rings, so there is no
//     wall-climbing; the landing is fixed and checked, so you cannot leave the map or reach a gated place; it is
//     loud; it will not fire within 2 s of being hurt, nor while a boss-class foe is awake on the map.
//
//  2. ENVIRONMENTAL KILLS.
//     (a) Chandeliers (CHANDS): cut the chain with a shot, or an edged blade from 1.5+ units away, and it falls on
//         whatever stands beneath: big damage, a long stagger, the light goes out, a great noise. It also hurts you
//         if you stand under it.
//     (b) Scaffolds (SCAFFS) in the Quarry and the Root-vault: strike or shoot one and it comes down away from you
//         onto a patch of floor beyond it.
//     (c) Deep water: a shove (key 0 / pad Y / Shove button, only offered when deep water lies within a shove's
//         length of the foe), or any knockback (RIGGING.onKnockback(enemy, dx, dy), which team ARMS' shield bash
//         calls; a generic detector also treats a sudden displacement of a stunned foe as a knockback) drowns small
//         foes. Bosses, armoured foes, swimmers and anything big are immune.
//     Persistence: broken props stay broken for good, in two small bit-mask flags (p12r_ch, p12r_sc); the cache
//     and the grapnel pickup have p12r_ca and p12r_hk. Nothing else is saved.
//
//  Rules kept (BRIEF_P8..P12): wrappers only (no edits to game.js, data.js, maps.js, index.html); every flag is
//  validated on read; nothing built from save data goes into markup; procedural stand-in art; no Math.random in any
//  presentation or detection code (the only game RNG touched is the game's own loot roll when the cache is opened
//  and the game's own kill code when something dies); every mechanic has an Options switch and, off, the module's
//  props are removed from the entity lists and every wrapper returns straight to the original.
// ============================================================
'use strict';

const RIGGING = (function () {
  const KEY = 'octave.rigging12.v1';
  const ITEM = 'p12_grapnel';

  // ---------------------------------------------------------------- balance: every number in one table
  const CFG = {
    hookRange: 8.0,        // furthest ring you can hook (world units)
    hookMin: 1.8,          // nearer than this to the ring, just walk
    hookCone: 0.3,         // radians off the view centre that still counts as aimed at a ring
    hookCool: 3.0,         // seconds between shots
    combatLock: 2.0,       // seconds after any hurt before the grapnel works again
    hookFat: 8,            // fatigue the pull costs
    hookNoise: 3.5,        // noise added on firing (a whip-crack of line); ~ a sword swing plus a half
    landNoise: 1.5,        // and on landing
    pullSpeed: 9.0,        // units per second of the haul (clamped to 0.35..0.9 s)
    landSlack: 0.3,        // the landing's ground may differ this much from the table before it is refused
    bossWake: 18,          // an awake boss-class foe within this many cells disables the grapnel
    chandDmg: 36, chandR: 2.5, chandStun: 3.0, chandNoise: 6, chandSelf: 0.3, chandCutMin: 1.5, chandShot: 9,
    scaffDmg: 26, scaffR: 1.5, scaffReach: 1.8, scaffStun: 2.4, scaffNoise: 5, scaffSelf: 0.2,
    bigHp: 60,             // a foe with this much max HP (or a boss/coda/wilds boss) takes at most bossCap of its HP
    bossCap: 0.15, bossStun: 0.8,
    shoveReach: 1.7, shoveCone: 0.6, shovePush: 2.4, shoveCool: 2.0, shoveFat: 5, shoveNoise: 1.2, shoveStun: 0.5, shoveSpeed: 9,
    drownHp: 36,           // only foes with at most this much max HP can be drowned
    drownXp: 0.5,          // a drowning is worth half the foe's XP (and drops nothing) so a bank cannot be farmed
    knockMin: 0.35,        // displacement in one tick that the generic detector reads as a knockback
    knockExtra: 1.0,       // how much further than it went a detected knockback is assumed to be heading
  };

  const set = { hook: true, props: true, water: true };
  function loadSet() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (o && typeof o === 'object') { for (const k of Object.keys(set)) if (typeof o[k] === 'boolean') set[k] = o[k]; }
    } catch (e) { /* private window or blocked storage: defaults */ }
  }
  function saveSet() { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- tables
  // Anchors. `x,y` is the ring (a decorative post); `land` is where you are set down; `z` is the ground height
  // there (re-read from the map at fire time; the table value is what the tests check against).
  // type 'shortcut': the landing is reachable on foot from the map's spawn with every locked door shut, so the
  //                  haul only saves a walk (or a stair) and skips no gate.
  // type 'cache':    the landing lies on a ledge nothing else reaches (and nothing else lives on): it holds the
  //                  cache and the way back down is the matching 'down' anchor.
  const ANCHORS = [
    { id: 'belfry', map: 'belfry', x: 10.3, y: 7.5, land: { x: 10.9, y: 6.9 }, z: 1.8, scale: 1.6, type: 'shortcut',
      why: 'Bell gallery: the same gallery the timber stair reaches; the bell needs the sexton\'s hammer either way.' },
    { id: 'clearing', map: 'clearing', x: 28.5, y: 15.5, land: { x: 28.5, y: 16.7 }, z: 1.2, type: 'shortcut',
      why: 'Plateau above the clearing, which its west ramp already reaches; nothing on it is gated.' },
    { id: 'greenroot', map: 'greenroot', x: 27.5, y: 15.5, land: { x: 27.5, y: 14.4 }, z: 0.6, type: 'shortcut',
      why: 'The chapel terrace, a 0.6 ledge the stair at its west end already climbs; the chapel doors keep their own locks.' },
    { id: 'crag_up', map: 'deepwoods', x: 49.5, y: 31.5, land: { x: 50.5, y: 31.5 }, z: 2.6, type: 'cache',
      why: 'Crag top: a ledge no path reaches, holding a cache and nothing of the story.' },
    { id: 'crag_down', map: 'deepwoods', x: 45.0, y: 33.5, land: { x: 44.4, y: 33.5 }, z: 0, type: 'down',
      why: 'The way back down from the crag top, to open ground.' },
  ];
  // Chandeliers: x,y on the floor plan; z0 is the height of the chandelier's underside.
  const CHANDS = [
    { map: 'cloister', x: 15.0, y: 2.5 },
    { map: 'mausoleum', x: 20.0, y: 22.4 },
    { map: 'mausoleum', x: 19.5, y: 7.0 },
    { map: 'malting', x: 15.5, y: 7.0 },
    { map: 'greenroot_chapel', x: 8.0, y: 5.5 },
  ];
  // Scaffolds: `face` is only a hint for the telegraph text; the fall goes away from whoever strikes.
  const SCAFFS = [
    { map: 'quarry', x: 18.5, y: 19.4 },
    { map: 'quarry', x: 36.5, y: 13.5 },
    { map: 'rootvault', x: 26.5, y: 22.6 },
  ];
  const CACHES = [{ map: 'deepwoods', x: 52.4, y: 31.5, tier: 2 }];
  const PILE = { map: 'deepwoods', x: 44.4, y: 23.3 };   // beside the cutter at (46.6, 23.6)

  // ---------------------------------------------------------------- small helpers
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const word = (w) => { try { return (typeof STORY_I18N !== 'undefined' && STORY_I18N.translate && STORY_I18N.translate(w)) || w; } catch (e) { return w; } };
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c, ms); } catch (e) { /* the message line is cosmetic */ } };
  const hash = (n) => { let h = Math.imul((n | 0) ^ 0x9e3779b9, 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function bits(name, n) { const v = G && G.flags ? Number(G.flags[name]) : 0; return Number.isInteger(v) && v >= 0 && v < (1 << n) ? v : 0; }
  function setBit(name, i, n) { G.flags[name] = bits(name, n) | (1 << i); }
  function hasBit(name, i, n) { return !!(bits(name, n) & (1 << i)); }
  const owns = () => { try { return !!(G.player && G.has(ITEM)); } catch (e) { return false; } };
  const playing = () => G.state === 'play' && !G.dead && !G.openPanel && G.player && G.map;
  const reduce = () => !!(typeof GFX !== 'undefined' && GFX.reduceMotion);

  // ---------------------------------------------------------------- the item
  if (typeof ITEMS !== 'undefined' && !ITEMS[ITEM]) {
    // [PROPOSED] item text
    ITEMS[ITEM] = { name: 'Office Grapnel', sprite: 'loot', key: true,
      desc: 'A cutter-man\'s grapnel gun, Office issue, the line still spooled and OC-742 stencilled on the stock. Face an iron ring set in a post or beam and press 0 (Y on a pad, Hook on touch) to be hauled across. It only holds at rings, it is loud, and it will not fire for a couple of breaths after a blow.' };
  }
  try { if (typeof ICONS !== 'undefined' && ICONS.TABLE) ICONS.TABLE[ITEM] = ['spool', {}]; } catch (e) { /* the fallback icon is fine */ }

  // ---------------------------------------------------------------- procedural stand-in sprites
  // Everything below is canvas-painted at load and cached; nothing is regenerated per frame.
  function paint(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (u8[o + 3] < 100) { u8[o + 3] = 0; continue; }
      const k = 1 + (hash(x * 131 + y * 7919 + w) - 0.5) * 0.16;
      u8[o] = Math.min(255, u8[o] * k); u8[o + 1] = Math.min(255, u8[o + 1] * k); u8[o + 2] = Math.min(255, u8[o + 2] * k); u8[o + 3] = 255;
    }
    return { data: new Uint32Array(id.data.buffer), w, h };
  }
  function reg(name, sp, emit) { Engine.addSprite(name, { w: sp.w, h: sp.h, data: sp.data, hs: 1, cx: 0.5, dy: 0 }); if (emit) Engine.setEmissive(name, emit); }
  // pixels that are bright flame yellow become the emissive mask
  function flameMask(sp) {
    const m = new Uint8Array(sp.w * sp.h);
    for (let i = 0; i < m.length; i++) { const px = sp.data[i]; if ((px >>> 24) > 100) { const r = px & 255, g = (px >>> 8) & 255, b = (px >>> 16) & 255; if (r > 220 && g > 170 && b < 120) m[i] = 1; } }
    return m;
  }
  function line(c, pts, col, w) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }
  function makeSprites() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || Engine.sprites.p12r_post) return;
    // an oak post with a bright iron ring through a bracket at the top
    reg('p12r_post', paint(32, 56, (c) => {
      c.fillStyle = '#5a554f'; c.fillRect(8, 49, 16, 7); c.fillStyle = '#74706a'; c.fillRect(9, 49, 14, 2);
      c.fillStyle = '#8a6a40'; c.fillRect(13, 20, 7, 30); c.fillStyle = '#a98655'; c.fillRect(13, 20, 2, 30); c.fillStyle = '#4d361d'; c.fillRect(19, 20, 1, 30);
      c.fillStyle = '#50555b'; c.fillRect(10, 20, 13, 4); c.fillStyle = '#8b939b'; c.fillRect(10, 20, 13, 1);
      c.strokeStyle = '#34373b'; c.lineWidth = 4; c.beginPath(); c.arc(16, 12, 8, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#aab3bb'; c.lineWidth = 2; c.beginPath(); c.arc(16, 12, 8, Math.PI * 1.05, Math.PI * 1.8); c.stroke();
      c.fillStyle = '#ffffff'; c.fillRect(10, 6, 2, 2);                      // the glint pixel
      c.fillStyle = '#25272a'; c.fillRect(12, 21, 1, 1); c.fillRect(19, 21, 1, 1);
    }));
    // a chandelier: chain, hub, an iron hoop of candles. Short variant for the 1.0 ceilings, tall for 2.5.
    const chand = (w, h, chainH, name) => {
      const sp = paint(w, h, (c) => {
        const cx = w / 2, ry = Math.max(4, h * 0.13), cy = chainH + (h - chainH) * 0.45, rx = w * 0.45;
        c.fillStyle = '#4b4743';
        for (let y = 0; y < chainH; y += 3) c.fillRect(cx - 1 + ((y / 3) & 1 ? 0 : 1), y, 2, 2);
        c.fillStyle = '#3a3835'; c.fillRect(cx - 3, chainH - 1, 6, 4);
        c.strokeStyle = '#4a4440'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, chainH + 2); c.lineTo(cx - rx, cy); c.moveTo(cx, chainH + 2); c.lineTo(cx + rx, cy); c.moveTo(cx, chainH + 2); c.lineTo(cx, cy + ry); c.stroke();
        c.strokeStyle = '#2f2c29'; c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#7b7066'; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, cy - 0.6, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
          c.fillStyle = '#d9d0b4'; c.fillRect(x - 1, y - 5, 2, 5);
          c.fillStyle = '#ffd860'; c.fillRect(x - 1, y - 8, 2, 3); c.fillStyle = '#fff2a8'; c.fillRect(x - 1, y - 8, 1, 2);
        }
        c.fillStyle = '#3a3835'; c.beginPath(); c.moveTo(cx - 2, cy + ry); c.lineTo(cx + 2, cy + ry); c.lineTo(cx, h - 1); c.closePath(); c.fill();
      });
      reg(name, sp, flameMask(sp));
    };
    chand(72, 40, 12, 'p12r_chand');
    chand(36, 64, 30, 'p12r_chandt');
    // the same, on the floor: a bent hoop, snapped candles, a heap of chain
    reg('p12r_wreck', paint(52, 20, (c) => {
      c.strokeStyle = '#2f2c29'; c.lineWidth = 3; c.beginPath(); c.ellipse(26, 11, 20, 5, 0.12, 0.2, Math.PI * 1.75); c.stroke();
      c.strokeStyle = '#6a6056'; c.lineWidth = 1; c.beginPath(); c.ellipse(26, 10, 20, 5, 0.12, Math.PI * 1.1, Math.PI * 1.6); c.stroke();
      c.fillStyle = '#d9d0b4'; c.fillRect(10, 12, 5, 2); c.fillRect(33, 14, 6, 2); c.fillRect(22, 5, 2, 5);
      c.fillStyle = '#4b4743'; for (let i = 0; i < 9; i++) c.fillRect(34 + (i % 4) * 3, 6 + ((i * 5) % 7), 2, 2);
      c.fillStyle = '#25231f'; c.fillRect(6, 16, 40, 2);
    }));
    // a timber scaffold: two lashed uprights, a sagging plank deck, a brace, a hanging rope
    reg('p12r_scaffold', paint(48, 72, (c) => {
      c.fillStyle = '#5a4026'; c.fillRect(5, 6, 5, 64); c.fillRect(38, 6, 5, 64);
      c.fillStyle = '#7a5a35'; c.fillRect(5, 6, 2, 64); c.fillRect(38, 6, 2, 64);
      c.fillStyle = '#3d2a17'; c.fillRect(9, 6, 1, 64); c.fillRect(42, 6, 1, 64);
      line(c, [8, 62, 40, 30], '#4a341d', 3); line(c, [8, 30, 40, 62], '#4a341d', 2.4);
      c.fillStyle = '#6b4d2c'; for (let i = 0; i < 6; i++) c.fillRect(3 + i * 7.5, 24 + (i === 3 ? 1 : 0), 7, 4);
      c.fillStyle = '#4a341d'; c.fillRect(3, 28, 42, 2);
      c.fillStyle = '#6b4d2c'; c.fillRect(3, 48, 42, 3); c.fillStyle = '#4a341d'; c.fillRect(3, 51, 42, 1);
      c.fillStyle = '#1e1a14'; for (const y of [10, 24, 48, 62]) { c.fillRect(4, y, 7, 2); c.fillRect(37, y, 7, 2); }   // tarred lashings
      line(c, [24, 6, 25, 22], '#8a7b5a', 1.2);
      c.fillStyle = '#5a5047'; c.fillRect(21, 21, 6, 5);                                                          // a bucket on the rope
    }));
    reg('p12r_scrap', paint(56, 18, (c) => {
      const pl = [[2, 12, 30, 3, -0.08], [14, 8, 34, 3, 0.1], [8, 4, 26, 3, -0.2], [26, 11, 28, 3, 0.05], [20, 1, 22, 3, 0.3]];
      for (const [x, y, w, h, r] of pl) { c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(r); c.fillStyle = '#6b4d2c'; c.fillRect(-w / 2, -h / 2, w, h); c.fillStyle = '#3d2a17'; c.fillRect(-w / 2, h / 2 - 1, w, 1); c.restore(); }
      c.fillStyle = '#3a342c'; c.fillRect(4, 14, 46, 3);
    }));
    // a grapnel gun on the moss: grey stock, three-pronged head, a coil of line
    reg('p12r_gear', paint(40, 22, (c) => {
      c.fillStyle = '#2c3a2a'; c.beginPath(); c.ellipse(20, 18, 19, 4, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#8f8a74'; c.lineWidth = 3; c.beginPath(); c.ellipse(28, 12, 7, 4, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#a79f84'; c.lineWidth = 1; c.beginPath(); c.ellipse(28, 11.5, 7, 4, 0, Math.PI * 1.1, Math.PI * 1.8); c.stroke();
      c.fillStyle = '#585e63'; c.fillRect(4, 10, 20, 5); c.fillStyle = '#7b838a'; c.fillRect(4, 10, 20, 1);
      c.fillStyle = '#3e4347'; c.fillRect(3, 9, 5, 8);
      line(c, [24, 12, 32, 5], '#6c747b', 2); line(c, [24, 12, 34, 9], '#6c747b', 2); line(c, [24, 12, 32, 15], '#6c747b', 2);
      c.fillStyle = '#c9ced1'; c.fillRect(7, 12, 3, 1);
    }));
  }

  // ---------------------------------------------------------------- prop entities (transient, rebuilt with the maps)
  function propEnt(m, o) {
    const e = Object.assign({ kind: 'deco', solid: false, radius: 0.3, transient: true, _decor: true, nopick: false }, o);
    return e;
  }
  function buildProps(maps) {
    if (!maps) return;
    for (const id in maps) { const m = maps[id]; if (m && !m._p12r) m._p12r = []; }
    const add = (mapId, e) => { const m = maps[mapId]; if (!m || m._p12r.some(o => o._p12r && e._p12r && o._p12r.k === e._p12r.k && o._p12r.i === e._p12r.i)) return; m._p12r.push(e); };
    ANCHORS.forEach((a, i) => add(a.map, propEnt(maps[a.map], { sprite: 'p12r_post', x: a.x, y: a.y, scale: a.scale || 1.0, use: 'p12r_look', glow: 0.2, _p12r: { k: 'anchor', i } })));
    CHANDS.forEach((c, i) => {
      const m = maps[c.map]; if (!m) return;
      const z = m.ceilZ || 1, tall = z > 1.6, drop = tall ? 1.35 : 0.55, sc = z - drop;
      add(c.map, propEnt(m, { sprite: tall ? 'p12r_chandt' : 'p12r_chand', x: c.x, y: c.y, scale: sc, yOff: -drop, lightCol: [58, 38, 12], use: 'p12r_look', _p12r: { k: 'chand', i, drop } }));
    });
    SCAFFS.forEach((s, i) => add(s.map, propEnt(maps[s.map], { sprite: 'p12r_scaffold', x: s.x, y: s.y, scale: 1.35, use: 'p12r_look', _p12r: { k: 'scaff', i } })));
    CACHES.forEach((c, i) => add(c.map, propEnt(maps[c.map], { sprite: 'chest', x: c.x, y: c.y, scale: 0.55, use: 'p12r_cache', label: 'A cache wedged into the rock, left by someone who came here by line.', _p12r: { k: 'cache', i } })));
    add(PILE.map, propEnt(maps[PILE.map], { sprite: 'p12r_gear', x: PILE.x, y: PILE.y, scale: 0.7, use: 'p12r_pile', glow: 0.3, _p12r: { k: 'pile', i: 0 } }));
  }
  // The state a prop should show now: wanted in the entity list at all, and which look it has.
  function wanted(e) {
    const k = e._p12r.k, i = e._p12r.i;
    if (k === 'anchor') return set.hook;
    if (k === 'pile') return set.hook && !hasBit('p12r_hk', 0, 1);
    if (k === 'cache') return set.hook && !hasBit('p12r_ca', 0, 1);
    return set.props;
  }
  function refreshLook(e) {
    const k = e._p12r.k, i = e._p12r.i;
    if (k === 'chand') {
      if (e._p12r.fall) return;                        // mid-fall: the animation owns the entity
      if (hasBit('p12r_ch', i, 8)) { e.sprite = 'p12r_wreck'; e.scale = 0.42; e.yOff = 0; e.lightCol = null; e.glow = 0; e.label = 'The wreck of a chandelier. The room is darker for it.'; }
      else { const z = (G.map && G.map.ceilZ) || 1, tall = z > 1.6, drop = e._p12r.drop; e.sprite = tall ? 'p12r_chandt' : 'p12r_chand'; e.scale = z - drop; e.yOff = -drop; e.lightCol = [58, 38, 12]; e.label = 'A chandelier hangs on a rusted chain that creaks when nobody touches it. A shot or a clean cut would bring it down.'; }
    } else if (k === 'scaff') {
      if (e._p12r.fall) return;
      if (hasBit('p12r_sc', i, 8)) { e.sprite = 'p12r_scrap'; e.scale = 0.5; e.label = 'What is left of a scaffold.'; }
      else { e.sprite = 'p12r_scaffold'; e.scale = 1.35; e.label = 'Rotten timbers lashed with tarred rope. It ticks and settles when you stand near it.'; }
    } else if (k === 'anchor') {
      e.label = owns() ? 'An iron ring set deep in old oak, bright on the inside where a line has run. A grapnel would hold here (0).' : 'An iron ring set deep in old oak, bright on the inside where a line has run.';
    } else if (k === 'pile') {
      e.label = 'A cutter-man\'s grapnel gun in the moss by the hull.';
    }
  }
  // put the map's props in or out of its entity list according to the switches
  function syncProps(m) {
    m = m || (typeof G !== 'undefined' ? G.map : null);
    if (!m || !m._p12r) return;
    const have = new Set(m.entities);
    for (const e of m._p12r) {
      const want = wanted(e), isIn = have.has(e);
      if (want) { refreshLook(e); e.hidden = false; if (!isIn) m.entities.push(e); }
      else if (isIn) { const i = m.entities.indexOf(e); if (i >= 0) m.entities.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- sound (the shared audio context; nothing before the first gesture)
  let noiseBuf = null;
  function ctxOk() { return typeof Audio_ !== 'undefined' && Audio_.ctx && !Audio_.muted && Audio_.sfxBus; }
  function tone(f0, f1, dur, gain, type) {
    if (!ctxOk()) return;
    try {
      const ac = Audio_.ctx, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(Audio_.sfxBus); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* sound is a courtesy */ }
  }
  function burst(dur, gain, lp) {
    if (!ctxOk()) return;
    try {
      const ac = Audio_.ctx;
      if (!noiseBuf) { const n = ac.sampleRate | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); let s = 12345; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; } noiseBuf = b; }
      const t = ac.currentTime, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.setValueAtTime(lp || 1800, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(Audio_.sfxBus); src.start(t); src.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }
  const sfx = {
    creak() { tone(150, 96, 0.45, 0.035, 'sawtooth'); },
    snap() { tone(900, 300, 0.12, 0.08, 'square'); },
    crash() { burst(0.9, 0.5, 2600); tone(110, 40, 0.5, 0.2, 'triangle'); },
    twang() { tone(620, 190, 0.28, 0.1, 'sawtooth'); burst(0.22, 0.12, 4000); },
    thud() { tone(130, 55, 0.3, 0.16, 'triangle'); burst(0.2, 0.1, 900); },
    splash() { burst(0.55, 0.22, 1400); },
  };
  // a written note for Sound captions (access.js has no entry for these, so say it ourselves)
  function caption(text) {
    try {
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      const g = document.getElementById('game'); if (!g) return;
      let b = document.getElementById('ac-captions');
      if (!b) { b = document.createElement('div'); b.id = 'ac-captions'; b.setAttribute('role', 'log'); b.setAttribute('aria-live', 'polite'); b.setAttribute('aria-label', 'Sound captions'); g.appendChild(b); }
      const d = document.createElement('div'); d.textContent = word(text); b.appendChild(d);
      while (b.children.length > 4) b.removeChild(b.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* cosmetic */ }
  }

  // ---------------------------------------------------------------- foes: who is small, who is a boss
  function bossLike(e) { const d = e.def || {}; return !!(d.boss || d.coda || d.wildsBoss || d.horn || (e.hpMax || 0) >= CFG.bigHp); }
  // valid to drown: small, not armoured, not a swimmer/wallower/flyer, not tied to a quest hook
  function drownable(e) {
    const d = e && e.def; if (!e || e.kind !== 'enemy' || e.dead || e.hidden || !d) return false;
    if (d.boss || d.coda || d.wildsBoss || d.armored || d.fearless || d.horn || d.moth || d.hushkin || d.shriek || d.drone) return false;
    if (e.type === 'drowned' || e.onDeath || e.state === 'passive') return false;
    return (e.hpMax || d.hp || 99) <= CFG.drownHp;
  }
  function deepAt(m, x, y) {
    if (!m || !(x >= 0 && y >= 0 && x < m.w && y < m.h)) return false;
    const fc = m.floorCells;
    return !!fc && fc[(y | 0) * m.w + (x | 0)] === 2 && !!m.floorTextures && m.floorTextures[2] === 't_water';
  }
  // damage with the boss cap and a stun; kills through the game's own code
  function hurtFoe(e, dmg, stun, what) {
    const big = bossLike(e);
    if (big) { dmg = Math.min(dmg, Math.max(1, Math.ceil((e.hpMax || e.hp) * CFG.bossCap))); stun = Math.min(stun, CFG.bossStun); }
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = true; e.stun = Math.max(e.stun || 0, stun);
    if (e.state === 'idle' || e.state === 'investigate') { delete e.investigation; e.state = 'chase'; e.alertT = 8; }
    try { if (typeof HUD11 === 'object' && HUD11.addNumber && GFX.dmgNumbers) HUD11.addNumber('hit', dmg, e); } catch (err) { /* cosmetic */ }
    if (e.hp <= 0) killEnemy(e, false);
    return dmg;
  }
  function hurtPlayer(dmg, what) {
    dmg = Math.max(1, Math.round(dmg));
    try { damagePlayer(dmg, what); } catch (e) { /* the game's own */ }
    return dmg;
  }
  function crush(x, y, R, dmgMax, stun, selfK, what, noise) {
    const c = Engine.cam, res = { foes: 0, killed: 0, self: 0 };
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden || e.state === 'passive') continue;
      const d = Math.sqrt(dist2(e.x, e.y, x, y)); if (d > R) continue;
      const was = e.dead; hurtFoe(e, dmgMax * (1 - 0.5 * d / R), stun, what); res.foes++; if (e.dead && !was) res.killed++;
    }
    if (selfK > 0 && G.player && !G.dead) {
      const d = Math.sqrt(dist2(c.x, c.y, x, y));
      if (d <= R * 0.8) { res.self = hurtPlayer(dmgMax * selfK * (1 - 0.5 * d / R), what); }
    }
    addNoise(noise);
    return res;
  }

  // ---------------------------------------------------------------- chandeliers and scaffolds
  const falls = [];   // props mid-fall: { e, kind, i, t0, dur, x, y, dir }
  function propsHere(k) { const m = G.map; return m && m._p12r ? m._p12r.filter(e => e._p12r.k === k && G.ents.includes(e)) : []; }
  function cutChand(e, by) {
    const i = e._p12r.i;
    if (e._p12r.fall || hasBit('p12r_ch', i, 8)) return false;
    e._p12r.fall = true;
    falls.push({ e, kind: 'chand', i, t0: G.time + 0.3, dur: 0.4, drop: e._p12r.drop });
    sfx.snap(); caption('a chain parts');
    say('The chain parts. For a breath the chandelier hangs in the air.', 'warn', 2500);
    return true;
  }
  function knockScaff(e, fromX, fromY) {
    const i = e._p12r.i;
    if (e._p12r.fall || hasBit('p12r_sc', i, 8)) return false;
    e._p12r.fall = true;
    let dx = e.x - fromX, dy = e.y - fromY; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    falls.push({ e, kind: 'scaff', i, t0: G.time + 0.1, dur: 0.45, dx, dy });
    sfx.snap(); caption('timber groans');
    say('You put your weight to it. The lashings go, and the whole frame comes down.', 'warn', 2500);
    return true;
  }
  function stepFalls(dt) {
    for (let n = falls.length - 1; n >= 0; n--) {
      const f = falls[n], e = f.e;
      if (G.map && !G.ents.includes(e)) { e._p12r.fall = false; falls.splice(n, 1); continue; }   // left the map mid-fall: it stays up
      const k = (G.time - f.t0) / f.dur;
      if (k < 0) continue;
      if (f.kind === 'chand') {
        const q = Math.min(1, k); e.yOff = -f.drop * (1 - q * q);
        if (k < 1) continue;
        e.lightCol = null;
        setBit('p12r_ch', f.i, 8);
        e._p12r.fall = false;
        refreshLook(e);
        sfx.crash(); caption('a crash of iron');
        const r = crush(e.x, e.y, CFG.chandR, CFG.chandDmg, CFG.chandStun, CFG.chandSelf, 'The chandelier', CFG.chandNoise);
        say(r.foes ? 'It comes down on them like a dropped bell.' : 'It hits the flags like a dropped bell. Every ear in the place has heard it.', 'good', 3200);
        if (r.self) say('The falling iron clips you for {0}.'.replace('{0}', String(r.self)), 'bad', 2500);
        stats.chands++;
        falls.splice(n, 1);
      } else {
        const q = Math.min(1, k); e.scale = 1.35 - (reduce() ? 0 : 0.8) * q * q;   // anim.js resets animSY every frame, so the collapse is a shrink of the entity's own scale

        if (k < 1) continue;
        setBit('p12r_sc', f.i, 8);
        e._p12r.fall = false;
        refreshLook(e);
        const cx = e.x + f.dx * CFG.scaffReach, cy = e.y + f.dy * CFG.scaffReach;
        sfx.crash(); caption('timber falling');
        const r = crush(cx, cy, CFG.scaffR, CFG.scaffDmg, CFG.scaffStun, CFG.scaffSelf, 'The scaffold', CFG.scaffNoise);
        say(r.foes ? 'It comes down on them in a long splintering rush.' : 'It comes down with a long splintering rush. Anything near has heard.', 'good', 3200);
        if (r.self) say('A falling timber clips you for {0}.'.replace('{0}', String(r.self)), 'bad', 2500);
        stats.scaffs++;
        falls.splice(n, 1);
      }
    }
  }
  // the angle test the game's own attack() uses
  function coneHit(c, ex, ey, w, d) {
    const dx = ex - c.x, dy = ey - c.y, dist = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.abs(normAng(Math.atan2(dy, dx) - c.dir));
    const cone = w.ranged ? 0.12 + 0.25 / Math.max(1, dist) : 0.55;
    return { dist, ok: ang <= cone };
  }
  // after a swing or shot has really happened (the game set G.attack.t), see whether it struck a prop
  function afterSwing() {
    if (!set.props) return;
    const c = Engine.cam, w = currentWeapon();
    for (const e of propsHere('chand')) {
      if (e._p12r.fall || hasBit('p12r_ch', e._p12r.i, 8)) continue;
      const dx = e.x - c.x, dy = e.y - c.y, dist = Math.sqrt(dx * dx + dy * dy), ang = Math.abs(normAng(Math.atan2(dy, dx) - c.dir));
      const h = { dist }, tol = w.ranged ? 0.14 + 0.35 / Math.max(1, dist) : 0.5;     // the chain is high: a little slack on the plan angle
      if (ang > tol) continue;
      if (w.ranged) { if (h.dist > CFG.chandShot || !los(c.x, c.y, e.x, e.y)) continue; }
      else {
        if (w.blunt || w === WEAPONS.hands || w.reach < 1.3) continue;         // a chain needs an edge
        if (h.dist < CFG.chandCutMin || h.dist > w.reach + 1.0 || !los(c.x, c.y, e.x, e.y)) continue;
      }
      cutChand(e, 'player'); return;
    }
    for (const e of propsHere('scaff')) {
      if (e._p12r.fall || hasBit('p12r_sc', e._p12r.i, 8)) continue;
      const h = coneHit(c, e.x, e.y, w, 0);
      if (!h.ok) continue;
      if (w.ranged) { if (h.dist > 9 || !los(c.x, c.y, e.x, e.y)) continue; }
      else if (h.dist > w.reach + 0.8 || !los(c.x, c.y, e.x, e.y)) continue;
      knockScaff(e, c.x, c.y); return;
    }
  }

  // ---------------------------------------------------------------- the grapnel
  let prevHp = null, pull = null, cdUntil = 0, lastHurt = -99, msgOnce = 0;
  const stats = { hooks: 0, chands: 0, scaffs: 0, drowned: 0, shoves: 0, refused: 0, knocks: 0 };
  function anchorEnts() { const m = G.map; return m && m._p12r ? m._p12r.filter(e => e._p12r.k === 'anchor' && G.ents.includes(e)) : []; }
  function anchorOf(e) { return ANCHORS[e._p12r.i]; }
  // a free, level spot to be set down on, near the table's landing
  function landingFor(a) {
    const m = G.map, offs = [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [ox, oy] of offs) {
      const x = a.land.x + ox, y = a.land.y + oy;
      if (x < 0.8 || y < 0.8 || x > m.w - 0.8 || y > m.h - 0.8) continue;
      const g = (m.lvls || m.smooth) ? m.groundAt(x, y) : 0;
      if (Math.abs(g - a.z) > CFG.landSlack) continue;
      if (m.smooth && m.gradeAt(x, y) > MAX_GRADE) continue;
      if (solidAt(x, y, { x, y, feet: g })) continue;
      return { x, y, z: g };
    }
    return null;
  }
  // is the straight haul from here to there clear of walls, and does it stay inside the map?
  function flightClear(m, sx, sy, sz, ex, ey, ez) {
    const d = Math.hypot(ex - sx, ey - sy), n = Math.max(2, Math.ceil(d / 0.25));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = sx + (ex - sx) * t, y = sy + (ey - sy) * t;
      if (x < 0.6 || y < 0.6 || x > m.w - 0.6 || y > m.h - 0.6) return false;
      const s = t * t * (3 - 2 * t), eye = sz + (ez - sz) * s + 0.35 * Math.sin(Math.PI * t) + 0.5;
      const ix = x | 0, iy = y | 0;
      if (m.isSolidCell(ix, iy)) { const cell = m.get(ix, iy); if (!cell || cell.door || cell.top == null || cell.top > eye - 0.05) return false; }
    }
    return true;
  }
  function boardState() {
    // why the grapnel may not be used right now, or null
    if (!set.hook) return 'off';
    if (!owns()) return 'none';
    if (!playing()) return 'state';
    if (pull) return 'busy';
    if (G.time < cdUntil) return 'Your hands are not steady enough for another shot yet.';
    if (G.time - lastHurt < CFG.combatLock) return 'Your hands shake from the blow. Wait a moment.';
    if (G.dragBody || G.escapeTimer > 0 || G.boreHold > 0) return 'Not now.';
    try { const cs = crimeState(); if (cs && cs.custody) return 'Not now.'; } catch (e) { /* no crime state */ }
    for (const e of G.ents) if (e.kind === 'enemy' && !e.dead && !e.hidden && bossLike(e) && e.state === 'chase' && dist2(e.x, e.y, Engine.cam.x, Engine.cam.y) < CFG.bossWake * CFG.bossWake) return 'Not with that thing awake and watching you.';
    return null;
  }
  function aimedAnchor() {
    const c = Engine.cam; let best = null, bd = 9;
    for (const e of anchorEnts()) {
      const a = anchorOf(e), dx = a.x - c.x, dy = a.y - c.y, d = Math.hypot(dx, dy);
      if (d > CFG.hookRange || d < CFG.hookMin) continue;
      const ang = Math.abs(normAng(Math.atan2(dy, dx) - c.dir)); if (ang > CFG.hookCone || ang >= bd) continue;
      if (!los(c.x, c.y, a.x, a.y)) continue;
      // already standing at the far end: nothing to haul
      if (Math.hypot(a.land.x - c.x, a.land.y - c.y) < 1.8) continue;
      bd = ang; best = a;
    }
    return best;
  }
  function fire(a) {
    const why = boardState();
    if (why) { if (why !== 'off' && why !== 'none' && why !== 'state' && why !== 'busy') say(why, 'warn', 2400); stats.refused++; return false; }
    const m = G.map, c = Engine.cam, p = G.player;
    const land = landingFor(a);
    if (!land) { say('There is no room to land there.', 'warn', 2400); stats.refused++; return false; }
    const sz = typeof p.feet === 'number' ? p.feet : 0;
    if (!flightClear(m, c.x, c.y, sz, land.x, land.y, land.z)) { say('The line fouls on something in the way.', 'warn', 2400); stats.refused++; return false; }
    const d = Math.hypot(land.x - c.x, land.y - c.y);
    pull = { a, sx: c.x, sy: c.y, sz, ex: land.x, ey: land.y, ez: land.z, t: 0, dur: clamp(d / CFG.pullSpeed, 0.35, 0.9), rx: a.x, ry: a.y };
    cdUntil = G.time + CFG.hookCool;
    p.fat = Math.max(0, p.fat - CFG.hookFat);
    addNoise(CFG.hookNoise);
    sfx.twang(); caption('a line sings');
    say('The grapnel bites. The line sings, and you go.', 'good', 2200);
    stats.hooks++;
    return true;
  }
  function stepPull(dt) {
    const c = Engine.cam, p = G.player, q = pull;
    if (!q) return;
    if (G.dead || !G.map) { pull = null; return; }
    q.t += (G.state === 'play' ? dt : 1);               // a panel opened mid-haul: finish at once rather than save you in the air
    const t = Math.min(1, q.t / q.dur), s = t * t * (3 - 2 * t);
    c.x = q.sx + (q.ex - q.sx) * s; c.y = q.sy + (q.ey - q.sy) * s;
    p.feet = q.sz + (q.ez - q.sz) * s + 0.35 * Math.sin(Math.PI * t);
    c.z = p.feet + 0.88;
    G.vel.x = 0; G.vel.y = 0; p.fallV = 0; p.fallFrom = null; p.tumble = false;
    if (t >= 1) {
      c.x = q.ex; c.y = q.ey; p.feet = q.ez; c.z = q.ez + 0.5;
      pull = null; addNoise(CFG.landNoise); sfx.thud();
      say('You land with your ears ringing from the line.', '', 1800);
    }
  }

  // ---------------------------------------------------------------- drowning and shoving
  const slides = [];   // { e, dx, dy, left }
  function dropsInWater(startLen) {
    // items the dying foe dropped are lost to the water
    for (let i = G.ents.length - 1; i >= startLen; i--) { const o = G.ents[i]; if (o.kind === 'item' && deepAt(G.map, o.x, o.y)) { G.ents.splice(i, 1); } }
  }
  function drown(e, why) {
    if (!drownable(e)) return false;
    const m = G.map, n0 = G.ents.length;
    e.def = Object.assign({}, e.def, { xp: Math.floor((e.def.xp || 0) * CFG.drownXp) });   // half the XP, and no loot, so a bank is not a farm
    try { WATER.ripple(e.x, e.y, 1.5); WATER.ripple(e.x + 0.3, e.y + 0.2, 1); } catch (err) { /* ripples are cosmetic */ }
    sfx.splash(); caption('a splash');
    killEnemy(e, false);
    dropsInWater(n0);
    say(why || 'The water closes over it, and the ripples settle.', 'good', 3000);
    stats.drowned++;
    return true;
  }
  // The push ray: the first deep-water cell within `len` along (dx,dy) from the foe, with no wall in between.
  function waterAhead(e, dx, dy, len) {
    const m = G.map;
    for (let s = 0.25; s <= len + 1e-6; s += 0.25) {
      const x = e.x + dx * s, y = e.y + dy * s;
      if (deepAt(m, x, y)) return { x, y, s };
      if (!(x >= 0.5 && y >= 0.5 && x < m.w - 0.5 && y < m.h - 0.5) || m.isSolidCell(x | 0, y | 0)) return null;
    }
    return null;
  }
  function shoveTarget() {
    if (!set.water || !playing()) return null;
    const c = Engine.cam, p = G.player; let best = null, bd = 99;
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden || e.state === 'passive') continue;
      const dx = e.x - c.x, dy = e.y - c.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d > CFG.shoveReach + (e.radius || 0.3) || d >= bd) continue;
      if (Math.abs(normAng(Math.atan2(dy, dx) - c.dir)) > CFG.shoveCone) continue;
      if (Math.abs(feetOf(e) - feetOf(p)) > MELEE_RISE || !los(c.x, c.y, e.x, e.y)) continue;
      bd = d; best = { e, dx: dx / d, dy: dy / d, d };
    }
    if (!best) return null;
    best.water = waterAhead(best.e, best.dx, best.dy, CFG.shovePush);
    best.ok = !!best.water && drownable(best.e);
    best.heavy = !!best.water && !drownable(best.e);
    return best;
  }
  let shoveReady = 0;
  function shove(t) {
    if (!t || !t.ok) return false;
    if (G.time < shoveReady) { say('Your shoulder is not ready for another.', 'warn', 1800); return false; }
    shoveReady = G.time + CFG.shoveCool;
    const e = t.e, p = G.player;
    p.fat = Math.max(0, p.fat - CFG.shoveFat);
    addNoise(CFG.shoveNoise);
    e.stun = Math.max(e.stun || 0, CFG.shoveStun);
    if (e.state !== 'chase') { delete e.investigation; e.state = 'chase'; e.alertT = 8; }
    slides.push({ e, dx: t.dx, dy: t.dy, left: t.water.s + 0.3 });
    sfx.thud(); stats.shoves++;
    say('You put your shoulder into ' + theName(e.def.name, false) + ' and drive it off the bank.', '', 2200);
    return true;
  }
  function stepSlides(dt) {
    const m = G.map;
    for (let n = slides.length - 1; n >= 0; n--) {
      const s = slides[n], e = s.e;
      if (e.dead || !G.ents.includes(e)) { slides.splice(n, 1); continue; }
      const mv = Math.min(s.left, CFG.shoveSpeed * dt);
      e.x += s.dx * mv; e.y += s.dy * mv; s.left -= mv; e.stun = Math.max(e.stun || 0, 0.3);
      if (deepAt(m, e.x, e.y)) { slides.splice(n, 1); drown(e, 'You shove ' + theName(e.def.name, false) + ' off the bank. The water closes over it.'); continue; }
      if (m.isSolidCell(e.x | 0, e.y | 0)) { e.x -= s.dx * mv; e.y -= s.dy * mv; slides.splice(n, 1); continue; }
      if (s.left <= 1e-6) slides.splice(n, 1);
    }
  }
  // Team ARMS (shield bash) and anything else that knocks a foe back calls this with the displacement it
  // meant to apply (or applied). If the line from the foe's position along it reaches deep water, a valid
  // foe is lost to it; nothing else changes (the caller moves the foe as it always did).
  function onKnockback(e, dx, dy, from) {
    if (!set.water || !e || !G.map || !(Number.isFinite(dx) && Number.isFinite(dy))) return false;
    const l = Math.hypot(dx, dy); if (l < 1e-6) return false;
    stats.knocks++;
    const o = from && Number.isFinite(from.x) && Number.isFinite(from.y) ? from : e;
    const reach = waterAhead(o, dx / l, dy / l, Math.min(5, l + 0.3));
    if (!reach || !drownable(e)) return false;
    e.x = reach.x; e.y = reach.y;
    return drown(e, 'The water takes ' + theName(e.def.name, false) + '.');
  }
  // generic detector: a stunned foe that moved far in one tick was knocked
  const lastPos = new WeakMap();
  function detectKnocks(dt) {
    if (!set.water) return;
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden) continue;
      const prev = lastPos.get(e);
      if (prev && prev.map === G.mapId && !slides.some(s => s.e === e)) {
        const dx = e.x - prev.x, dy = e.y - prev.y, d = Math.hypot(dx, dy);
        const walk = ((e.def && e.def.speed) || 2) * 2.2 * Math.min(dt, 0.1) + 0.05;
        if (d > Math.max(CFG.knockMin, walk * 3) && (e.stun > 0 || e.flash || e.hp < prev.hp)) {
          if (onKnockback(e, dx / d * CFG.knockExtra, dy / d * CFG.knockExtra)) { lastPos.delete(e); continue; }
        }
      }
      lastPos.set(e, { x: e.x, y: e.y, hp: e.hp, map: G.mapId });
    }
  }

  // ---------------------------------------------------------------- one action for key, button and pad
  function act() {
    if (!playing()) return false;
    const a = set.hook && owns() ? aimedAnchor() : null;
    if (a) return fire(a);
    const t = shoveTarget();
    if (t) {
      if (t.ok) return shove(t);
      if (t.heavy) { say('It is too heavy to shove.', 'warn', 1800); return false; }
    }
    if (set.hook && owns() && G.time - msgOnce > 1.5) { msgOnce = G.time; say('No ring in view.', '', 1400); }
    else if (!owns() && set.water && G.time - msgOnce > 1.5) { msgOnce = G.time; say('Nothing here to push anything into.', '', 1400); }
    return false;
  }
  // what the button would do right now, for the touch button and the on-screen prompt
  function context() {
    if (!playing()) return null;
    if (set.hook && owns()) { const a = aimedAnchor(); if (a) return { kind: 'hook', a }; }
    const t = shoveTarget(); if (t && t.ok) return { kind: 'shove', t };
    return null;
  }

  // ---------------------------------------------------------------- per-frame work
  let creakAt = 0;
  function tick(dt) {
    const m = G.map; if (!m) return;
    const p = G.player;
    if (p) { if (prevHp != null && p.hp < prevHp - 0.01) lastHurt = G.time; prevHp = p.hp; }
    // glints and creaks
    const c = Engine.cam;
    for (const e of m._p12r || []) {
      if (!G.ents.includes(e)) continue;
      const k = e._p12r.k;
      if (k === 'anchor') {
        const ph = e._p12r.i * 2.3, g = Math.pow(Math.max(0, Math.sin(G.time * 1.6 + ph)), 8);
        const near = Math.hypot(e.x - c.x, e.y - c.y) < CFG.hookRange && owns();
        e.glow = reduce() ? 0.25 : 0.12 + (near ? 0.3 : 0.2) * g + (near ? 0.12 : 0);
      } else if (k === 'pile') {
        e.glow = reduce() ? 0.3 : 0.2 + 0.25 * Math.pow(Math.max(0, Math.sin(G.time * 1.3)), 6);
      } else if ((k === 'chand' && !hasBit('p12r_ch', e._p12r.i, 8)) || (k === 'scaff' && !hasBit('p12r_sc', e._p12r.i, 8))) {
        if (k === 'chand' && !e._p12r.fall) e.glow = reduce() ? 0 : 0.18 * Math.pow(Math.max(0, Math.sin(G.time * 1.1 + e._p12r.i * 1.7)), 10);   // a faint glint on the chain
        if (!e._p12r.fall && G.time > creakAt && Math.hypot(e.x - c.x, e.y - c.y) < 7) {
          creakAt = G.time + 6 + hash(e._p12r.i * 17 + (k === 'chand' ? 1 : 2) + (G.time | 0)) * 7;
          sfx.creak(); caption(k === 'chand' ? 'a chain creaks' : 'timber ticks');
        }
      }
    }
    stepFalls(dt);
    stepSlides(dt);
    detectKnocks(dt);
  }

  // ---------------------------------------------------------------- the prompt and the rope (drawn on the view after the frame)
  function drawOverlay() {
    const ctx = Engine.ctx, vh = typeof VIEW_H === 'number' ? VIEW_H : 160;
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(0, 0, VW, vh); ctx.clip();
      if (pull) {
        const e = anchorEnts().find(o => anchorOf(o) === pull.a), s = e && e._screen;
        if (s) {
          const tx = (s.x0 + s.x1) / 2, ty = s.y0 + (s.y1 - s.y0) * 0.2, sx = VW * 0.62, sy = vh + 2, sag = (1 - Math.min(1, pull.t / pull.dur)) * 6;
          ctx.strokeStyle = '#1b1712'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + tx) / 2, (sy + ty) / 2 + sag, tx, ty); ctx.stroke();
          ctx.strokeStyle = '#a89870'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + tx) / 2, (sy + ty) / 2 + sag, tx, ty); ctx.stroke();
        }
      } else {
        const cx = context();
        if (cx) {
          if (cx.kind === 'hook') {
            const e = anchorEnts().find(o => anchorOf(o) === cx.a), s = e && e._screen;
            if (s) {
              const mx = (s.x0 + s.x1) / 2, my = s.y0 + (s.y1 - s.y0) * 0.15, r = 6;
              ctx.strokeStyle = '#f0d890'; ctx.lineWidth = 1;
              for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(mx + sx2 * r, my + sy2 * (r - 3)); ctx.lineTo(mx + sx2 * r, my + sy2 * r); ctx.lineTo(mx + sx2 * (r - 3), my + sy2 * r); ctx.stroke(); }
            }
          }
          const label = word(cx.kind === 'hook' ? 'Grapnel' : 'Shove');
          const key = G.touchMode ? '' : '0 · ';
          ctx.font = '700 8px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(8,4,2,0.9)'; ctx.strokeText(key + label, VW / 2, vh - 26);
          ctx.fillStyle = '#f0d890'; ctx.fillText(key + label, VW / 2, vh - 26);
        }
      }
    } finally { ctx.restore(); }
  }

  // ---------------------------------------------------------------- Options rows
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p12r-head')) return;
    const el = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) { if (k === 'style') e.style.cssText = props[k]; else e.setAttribute(k, props[k]); } if (text != null) e.textContent = text; return e; };
    grid.appendChild(el('span', { id: 'p12r-head', style: 'grid-column:1/-1;margin-top:1cqh;color:var(--gold);font-family:var(--font-display);letter-spacing:.08em' }, 'Rigging'));
    const row = (label, hint) => { const s = el('span', { class: 'gfx-label' }, label); s.appendChild(document.createTextNode(' ')); s.appendChild(el('small', { class: 'muted' }, hint)); return s; };
    const bs = [];
    const btn = (id, aria, key) => { const b = el('button', { class: 'dfbtn small', id, type: 'button' }, ''); b.setAttribute('aria-label', aria); b.onclick = () => { set[key] = !set[key]; saveSet(); syncProps(G.map); sync2(); }; bs.push([b, key]); return b; };
    function sync2() { for (const [b, k] of bs) { b.textContent = set[k] ? 'On' : 'Off'; b.setAttribute('aria-pressed', set[k] ? 'true' : 'false'); b.classList.toggle('sel', !!set[k]); } }
    grid.appendChild(row('Grapnel', 'the Office hook, its iron rings and the hidden cache'));
    grid.appendChild(btn('p12r-hook', 'Grapnel', 'hook'));
    grid.appendChild(row('Falling chandeliers and scaffolds', 'cut or shoot them down onto what stands beneath'));
    grid.appendChild(btn('p12r-props', 'Falling chandeliers and scaffolds', 'props'));
    grid.appendChild(row('Shove into deep water', 'small foes pushed or knocked off a bank are lost'));
    grid.appendChild(btn('p12r-water', 'Shove into deep water', 'water'));
    sync2();
  }

  // ---------------------------------------------------------------- wiring
  let suppressY = false;
  function wire() {
    makeSprites();
    // anim.js sways anything in ANIM.hanging: the chandeliers get the same slow swing as the hush-lamps
    try { if (typeof ANIM !== 'undefined' && ANIM.hanging && ANIM.hanging.add) { ANIM.hanging.add('p12r_chand'); ANIM.hanging.add('p12r_chandt'); } } catch (e) { /* no sway */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildProps(maps); } catch (e) { console.warn('rigging props failed', e); } return maps; };
      try { if (G.maps) { buildProps(G.maps); syncProps(G.map); } } catch (e) { /* nothing built yet */ }
    }
    if (typeof loadMap === 'function') {
      const _l = loadMap;
      loadMap = function () {
        pull = null; falls.length = 0; slides.length = 0;
        const r = _l.apply(this, arguments);
        try { if (G.map && !G.map._p12r && G.maps) buildProps(G.maps); syncProps(G.map); for (const e of (G.map && G.map._p12r) || []) if (e._p12r) e._p12r.fall = false; } catch (e) { console.warn('rigging sync failed', e); }
        return r;
      };
    }
    if (typeof useDeco === 'function') {
      const _u = useDeco;
      useDeco = function (e) {
        if (e && e._p12r && (e.use === 'p12r_look' || e.use === 'p12r_pile' || e.use === 'p12r_cache')) { try { useProp(e); } catch (err) { console.warn('rigging use failed', err); } return; }
        return _u.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _i = useItem;
      useItem = function (slot) {
        if (slot && slot.id === ITEM) { say('Face an iron ring and press 0 (Y on a pad, Hook on touch).', '', 4000); return; }
        return _i.apply(this, arguments);
      };
    }
    if (typeof attack === 'function') {
      const _a = attack;
      attack = function () {
        if (!set.props) return _a.apply(this, arguments);
        const before = G.attack.t;
        const r = _a.apply(this, arguments);
        try { if (before <= 0 && G.attack.t > 0) afterSwing(); } catch (e) { console.warn('rigging swing failed', e); }
        return r;
      };
    }
    if (typeof damagePlayer === 'function') {
      const _d = damagePlayer;
      damagePlayer = function () { lastHurt = G.time; return _d.apply(this, arguments); };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try {
          if (G.player && G.map) {
            if (pull) stepPull(dt);
            if (G.state === 'play' && (set.hook || set.props || set.water)) tick(dt);
          }
        } catch (e) { console.warn('rigging tick failed', e); }
        return r;
      };
    }
    if (typeof render === 'function') {
      const _r = render;
      render = function () {
        const r = _r.apply(this, arguments);
        try { if ((set.hook || set.water) && G.player && G.map && G.state === 'play') drawOverlay(); } catch (e) { console.warn('rigging overlay failed', e); }
        return r;
      };
    }
    // keys: 0 (the number row or the keypad); every letter is taken
    window.addEventListener('keydown', (ev) => {
      if (ev.repeat || (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA'))) return;
      if (ev.code !== 'Digit0' && ev.code !== 'Numpad0') return;
      try { act(); } catch (e) { console.warn('rigging key failed', e); }
    });
    // pad: Y fires the grapnel / shoves when there is something to use it on (otherwise it keeps its own job)
    let yPrev = false;
    if (typeof controlsTick === 'function') {
      const _ct = controlsTick;
      controlsTick = function () {
        let took = false;
        try {
          const pads = navigator.getGamepads ? navigator.getGamepads() : [];
          let y = false;
          for (let i = 0; i < pads.length; i++) { const g = pads[i]; if (g && g.connected && g.buttons[3] && g.buttons[3].pressed) y = true; }
          if (y && !yPrev && playing() && !(typeof pickpocketTarget === 'function' && pickpocketTarget()) && context()) { took = true; act(); }
          yPrev = y;
          // the touch button
          const tb = document.getElementById('t-rig');
          if (tb) { const cx = G.touchMode && G.state === 'play' ? context() : null; tb.hidden = !cx; if (cx) tb.textContent = cx.kind === 'hook' ? 'Hook' : 'Shove'; }
        } catch (e) { /* no pad */ }
        suppressY = took;
        try { return _ct.apply(this, arguments); } finally { suppressY = false; }
      };
    }
    if (typeof renderSongs === 'function') {
      const _s = renderSongs;
      renderSongs = function () { if (suppressY) { if (G.state === 'panel') G.state = 'play'; return; } return _s.apply(this, arguments); };
    }
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('rigging rows failed', e); }
        return r;
      };
    }
    // the touch button, inside the game's own touch layer
    try {
      const ui = document.getElementById('touchui');
      if (ui && !document.getElementById('t-rig')) {
        const b = document.createElement('button'); b.id = 't-rig'; b.className = 'tb small'; b.type = 'button'; b.hidden = true; b.textContent = 'Hook';
        b.setAttribute('aria-label', 'Use the grapnel or shove');
        ui.appendChild(b);
        if (typeof tbtn === 'function') tbtn('#t-rig', null, () => { try { act(); } catch (e) { console.warn('rigging touch failed', e); } });
      }
    } catch (e) { console.warn('rigging touch ui failed', e); }
  }

  function useProp(e) {
    const k = e._p12r.k, i = e._p12r.i;
    if (k === 'pile') {
      if (hasBit('p12r_hk', 0, 1) || owns()) { say('The moss is empty where the gear lay.', '', 2000); return; }
      // the same rule as the cutter's hold: no grey coats on the wreck
      const near = G.ents.some(o => o.kind === 'enemy' && !o.dead && !o.hidden && !(o.def && o.def.cacophony) && dist2(o.x, o.y, Engine.cam.x, Engine.cam.y) < 49);
      if (near) { say('Grey coats on the wreck, between you and the gear. Not yet.', 'warn', 3500); return; }
      G.flags.p12r_hk = 1; G.give(ITEM);
      try { Audio_.sfx.pickup(); } catch (err) { /* silent */ }
      say('You take the Office grapnel off the moss. Its line is still spooled, and the stencil on the stock says OC-742.', 'good', 5000);
      try { journal('side', 'I took a grapnel gun off the Office cutter in the Deep Woods. Where somebody set iron rings in old oak, it will haul me across to them. It is not a quiet thing, and it does not forgive a blow.'); } catch (err) { /* ignore */ }
      syncProps(G.map);
      return;
    }
    if (k === 'cache') {
      if (hasBit('p12r_ca', 0, 1)) return;
      G.flags.p12r_ca = 1;
      try { Audio_.sfx.pickup(); } catch (err) { /* silent */ }
      openCache({ tier: CACHES[i].tier });
      syncProps(G.map);
      return;
    }
    // look
    refreshLook(e); say(e.label, '', 4200);
  }

  loadSet();
  try { wire(); } catch (e) { console.warn('rigging failed to wire', e); }

  return {
    CFG, set, loadSet, saveSet, ITEM, ANCHORS, CHANDS, SCAFFS, CACHES, PILE, stats,
    act, context, aimedAnchor, fire, shoveTarget, shove, onKnockback, drown, drownable, deepAt, waterAhead, bossLike, crush,
    cutChand, knockScaff, afterSwing, landingFor, flightClear, boardState, syncProps, buildProps, appendRows, bits, hasBit,
    get pull() { return pull; }, get falls() { return falls; }, get slides() { return slides; },
    get lastHurt() { return lastHurt; }, set lastHurt(v) { lastHurt = v; }, get cdUntil() { return cdUntil; }, set cdUntil(v) { cdUntil = v; },
    resetCooldowns() { cdUntil = 0; shoveReady = 0; lastHurt = -99; },
    stepPull, stepFalls, stepSlides, tick,
  };
})();
if (typeof window !== 'undefined') window.RIGGING = RIGGING;
