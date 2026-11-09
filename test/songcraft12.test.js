// PREVIEW_URL=http://127.0.0.1:3864 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/songcraft12.test.js
// Phase 12 songcraft: instruments (exact modifiers, identical when off), the tavern accepts them, the tuning fork
// (monotonic, only real hidden things, captions), the dowsing rod (nearest valid root, story gates, one journal
// line), save/load of the slot and items (hostile values), keyboard / touch / Song-book (pad) paths, 640x400.
// Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:3864';
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

async function boot(browser, vp) {
  const page = await browser.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /songcraft12/i.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Songcraft Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof SONGCRAFT === 'object' && G.state === 'play');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__seed = (n) => { let s = n || 777; window.__rngCalls = 0; Math.random = () => { window.__rngCalls++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
    GFX.reduceMotion = true;
  });
  return { page, errors };
}
const fits = (page) => page.evaluate(() => {
  const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect();
  return { inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, hscroll: p.scrollWidth > p.clientWidth + 1 };
});

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);

    // ================================================================= 1. items, shops, provenance
    const items = await page.evaluate(() => {
      const S = SONGCRAFT, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy', 'p12_fork', 'p12_rod']) check(ITEMS[id] && ITEMS[id].name && ITEMS[id].desc, 'item ' + id);
      for (const [npc, e] of S.STOCK) check(NPCS[npc] && NPCS[npc].shop.some(x => x.item === e.item && x.price === e.price), 'stocked by ' + npc);
      S.set.inst = false; S.set.fork = false; S.set.rod = false; S.onSwitch();
      for (const [npc, e] of S.STOCK) check(!NPCS[npc].shop.some(x => x.item === e.item), 'off: not stocked by ' + npc);
      S.set.inst = true; S.set.fork = true; S.set.rod = true; S.onSwitch();
      for (const [npc, e] of S.STOCK) check(NPCS[npc].shop.filter(x => x.item === e.item).length === 1, 'back on: exactly once ' + npc);
      return out;
    });
    assert.deepEqual(items.fails, [], 'items and shops: ' + items.fails.join('; '));

    // ================================================================= 2. instruments: modifiers, exact
    const setup = `
      window.__reset = (seed) => {
        const p = G.player; window.__p0 = window.__p0 || { xp: p.xp, level: p.level, kills: p.kills, hpMax: p.hpMax, fat: p.fat };
        p.xp = __p0.xp; p.level = __p0.level; p.kills = __p0.kills; p.fat = __p0.fat; G.ledger.length = 0;
        G.ents = G.ents.filter(e => e.kind !== 'enemy');
        p.voice = p.voiceMax = 60; p.hp = 5; p.hpMax = 40; G.song.t = 0; G.attack.t = 0; G.noise = 2; G.rootWard = 0; G.hasteT = 0; G.murmurT = 0;
        G.map.danger = 0; SONGCRAFT.st.droneT = 0;
        Engine.cam.x = 20; Engine.cam.y = 20; Engine.cam.dir = 0;
        __seed(seed || 4242);
      };
      window.__foe = (type, dx, dy) => { const e = hydrate({ kind: 'enemy', type, x: 20 + dx, y: 20 + dy }); e.state = 'idle'; G.ents.push(e); return e; };
      window.__cast = (id, inst) => {
        const f = G.flags; G.player.inv = G.player.inv.filter(s => !/^p12_(lute|flute|gurdy)$/.test(s.id));
        f.p12s_inst = 0; if (inst) { G.give(inst); f.p12s_inst = SONGCRAFT.INST_ORDER.indexOf(inst) + 1; }
        __reset(); const hound = __foe('hound', 5, 0), boss = __foe('wearer', 6, 0), far = __foe('hound', 11.5, 0), side = __foe('hound', 9, 9), beyond = __foe('hound', 14, 0), farBoss = __foe('wearer', 11.5, 0.5);
        const p = G.player, v0 = p.voice, n0 = G.noise, hp0 = p.hp;
        castSong(id);
        return { cast: G.song.t > 0, spent: v0 - p.voice, dn: G.noise - n0, dhp: p.hp - hp0, root: G.rootWard, hound: hound.stun, boss: boss.stun, far: far.stun, side: side.stun, beyond: beyond.stun, farBoss: farBoss.stun, drone: SONGCRAFT.st.droneT };
      };`;
    await page.evaluate(setup);
    const table = await page.evaluate(() => {
      const out = {};
      for (const id of ['tending', 'root', 'fifth']) {
        out[id] = { none: __cast(id, null) };
        for (const inst of SONGCRAFT.INST_ORDER) out[id][inst] = __cast(id, inst);
      }
      __cast('tending', null); G.ents = G.ents.filter(e => e.kind !== 'enemy');
      return out;
    });
    const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, `${m}: ${a} vs ${b}`);
    for (const id of ['tending', 'root', 'fifth']) {
      const base = table[id].none; assert.ok(base.cast, id + ' casts');
      const cost = { tending: 8, root: 10, fifth: 12 }[id];
      near(base.spent, cost, id + ' base cost');
      // lute: a quarter less voice (rounded down in the player's favour only for whole voice), timed effects 30% shorter
      const L = table[id].p12_lute, F = table[id].p12_flute, Gd = table[id].p12_gurdy;
      near(L.spent, cost - Math.floor(cost * 0.25), id + ' lute cost');
      near(F.spent, cost, id + ' flute cost'); near(Gd.spent, cost, id + ' gurdy cost');
      near(L.dn, base.dn, id + ' lute noise'); near(F.dn, base.dn * 0.6, id + ' flute noise'); near(Gd.dn, base.dn * 1.5, id + ' gurdy noise');
      near(L.dhp, base.dhp, id + ' lute heal unchanged'); near(Gd.dhp, base.dhp, id + ' gurdy heal unchanged');
      near(L.root, base.root * 0.7, id + ' lute ward'); near(F.root, base.root, id + ' flute ward'); near(Gd.root, base.root * 1.6, id + ' gurdy ward');
      near(L.drone, 0, id + ' no drone (lute)'); near(Gd.drone, 8, id + ' gurdy drone');
      if (id === 'fifth') {
        near(base.hound, 4.5, 'fifth stun'); near(base.boss, 4.5, 'fifth stun boss');
        near(L.hound, 4.5 * 0.7, 'lute shortens'); near(L.boss, 4.5 * 0.7, 'lute shortens a boss too (never lengthens)');
        near(Gd.hound, 4.5 * 1.6, 'gurdy lengthens'); near(Gd.boss, 4.5, 'gurdy never lengthens a boss');
        near(F.hound, 4.5, 'flute near stun');
        // the flute: a narrow cone ahead, +3 cells, never a boss, never beside or beyond
        near(base.far, 0, 'no flute: 11.5 ahead is out of reach'); near(F.far, 4.5, 'flute reaches 11.5 ahead');
        near(F.side, 0, 'flute: outside the cone, outside the ring'); near(F.beyond, 0, 'flute: 14 is too far'); near(F.farBoss, 0, 'flute: not a boss');
        near(L.far, 0, 'lute does not reach'); near(Gd.far, 0, 'gurdy does not reach');
      }
    }
    // the gurdy's drone: the Narrow holds high for its seconds, then lets go
    const drone = await page.evaluate(() => {
      __cast('root', 'p12_gurdy'); const o = {};
      for (let i = 0; i < 40; i++) updateNarrow(0.1, false, false);
      o.during = G.noise; o.left = SONGCRAFT.st.droneT;
      for (let i = 0; i < 60; i++) updateNarrow(0.1, false, false);
      o.after = G.noise; o.end = SONGCRAFT.st.droneT;
      __cast('root', null); G.ents = G.ents.filter(e => e.kind !== 'enemy');
      return o;
    });
    assert.ok(drone.during >= 6.2 - 1e-9 && drone.left > 3.5 && drone.left < 4.5, 'the drone holds the Narrow high: ' + JSON.stringify(drone));
    assert.ok(drone.after < 4 && drone.end <= 0, 'the drone ends: ' + JSON.stringify(drone));
    // the gurdy draws hounds on a dangerous map (and only then)
    const hounds = await page.evaluate(() => {
      __cast('root', 'p12_gurdy'); G.map.danger = 1; let spawned = 0; const real = window.spawnHound;
      spawnHound = function () { spawned++; };
      for (let i = 0; i < 300; i++) { SONGCRAFT.st.droneT = 8; updateNarrow(0.1, false, false); }
      const withDrone = spawned; spawned = 0; __cast('root', null); G.map.danger = 1; for (let i = 0; i < 300; i++) updateNarrow(0.1, false, false);
      const without = spawned; spawnHound = real; G.map.danger = 0; return { withDrone, without };
    });
    assert.ok(hounds.withDrone > 0 && hounds.without === 0, 'the drone draws hounds only while it sounds: ' + JSON.stringify(hounds));

    // ================================================================= 3. no instrument / switch off = identical traces
    const trace = (page_, mode) => page_.evaluate((mode) => {
      const S = SONGCRAFT, f = G.flags; G.player.inv = G.player.inv.filter(s => !/^p12_(lute|flute|gurdy)$/.test(s.id));
      S.set.inst = mode !== 'off'; f.p12s_inst = 0;
      if (mode === 'off' || mode === 'lute-off') { G.give('p12_lute'); f.p12s_inst = 1; S.set.inst = false; }
      const log = [];
      for (const seed of [11, 12, 13]) for (const id of ['tending', 'fifth', 'root', 'murmur', 'name']) {
        __reset(seed); const a = __foe('hound', 4, 0), b = __foe('legionnaire', 3, 0.5); G.player.fragments = 3;
        castSong(id); updateNarrow(0.1, false, false);
        log.push([id, G.player.voice, G.noise, G.rootWard, G.player.hp, a.stun, b.stun, b.hp, a.hp, window.__rngCalls, G.song.t, G.murmurT, G.player.fragments, b.dead]);
      }
      S.set.inst = true; f.p12s_inst = 0; G.player.inv = G.player.inv.filter(s => !/^p12_(lute|flute|gurdy)$/.test(s.id)); G.ents = G.ents.filter(e => e.kind !== 'enemy');
      return JSON.stringify(log);
    }, mode);
    const t0 = await trace(page, 'none'), t1 = await trace(page, 'off'), t2 = await trace(page, 'none');
    assert.equal(t0, t2, 'the trace is deterministic');
    assert.equal(t0, t1, 'switch off with a lute equipped = the original Songs, trace and RNG count identical');

    // ================================================================= 4. the tavern evening set takes them as instruments
    const tav = await page.evaluate(() => {
      const out = {}, T = TAVERN;
      const saveInv = G.player.inv; G.player.inv = [];
      out.none = T.hasInstrument();
      for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy']) { G.player.inv = []; G.give(id); out[id] = T.hasInstrument() && T.instrumentIds().includes(id); }
      for (const id of ['p12_fork', 'p12_rod']) { G.player.inv = []; G.give(id); out[id] = T.hasInstrument(); }
      G.player.inv = []; G.give('p12_gurdy'); out.status = T.perfStatus();
      G.player.inv = saveInv; return out;
    });
    assert.equal(tav.none, false);
    for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy']) assert.equal(tav[id], true, id + ' is an instrument to the tavern');
    for (const id of ['p12_fork', 'p12_rod']) assert.equal(tav[id], false, id + ' is not');
    assert.notEqual(tav.status, 'hidden', 'with a gurdy the evening set is offered (' + tav.status + ')');

    // ================================================================= 5. timbre
    const timbre = await page.evaluate(() => {
      const S = SONGCRAFT, o = {}; S.stats.voices.length = 0;
      for (const [id, k] of [['p12_lute', 'lute'], ['p12_flute', 'flute'], ['p12_gurdy', 'gurdy']]) { __cast('tending', id); o[k] = S.stats.voices.slice(-1)[0] && S.stats.voices.slice(-1)[0].kind; }
      S.stats.voices.length = 0; __cast('tending', null); o.plain = S.stats.voices.length;
      __cast('tending', null); G.ents = G.ents.filter(e => e.kind !== 'enemy');
      return o;
    });
    assert.deepEqual(timbre, { lute: 'lute', flute: 'flute', gurdy: 'gurdy', plain: 0 }, 'each instrument has its own voice; none = the original sound');

    // ================================================================= 6. tuning fork
    const fork = await page.evaluate(() => {
      const S = SONGCRAFT, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.give('p12_fork'); G.flags.p12s_tool = 0; S.setTool(1); check(S.toolId() === 1, 'fork held');
      __reset(); G.ents = G.ents.filter(e => !e.tobinPage); if (G.map._p12sWalls) G.map._p12sWalls = null;
      const ents = [], add = (o) => { G.ents.push(o); ents.push(o); return o; };
      const clearAll = () => { for (const e of ents) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); } ents.length = 0; };
      const probe = () => { const r = S.probeFork(); return { level: r.level, kind: r.kind, pan: r.pan, freq: r.freq }; };
      check(probe().level === 0 && probe().kind === null, 'nothing hidden near: silent');
      // hidden cache at growing distance
      const lv = [];
      for (const d of [0.5, 1, 2, 3, 4.5, 6, 7.5, 8.9, 9.5]) { clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 20 + d, y: 20, sprite: 'chest' }); lv.push(probe().level); }
      for (let i = 1; i < lv.length; i++) check(lv[i] <= lv[i - 1] && (lv[i] < lv[i - 1] || lv[i] === 0), 'level falls with distance ' + lv.join(','));
      check(lv[0] > 0.8 && lv[lv.length - 1] === 0, 'near is loud, beyond the range is silent');
      out.levels = lv;
      // pitch rises, volume rises, pan follows the side
      clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 24, y: 20, sprite: 'chest' }); const far = probe(); S.tick(0.2);
      clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 21, y: 20, sprite: 'chest' }); const close = probe();
      check(close.freq > far.freq, 'pitch rises as you near'); out.freqs = [far.freq, close.freq];
      clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 22, y: 23, sprite: 'chest' }); const right = probe();
      clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 22, y: 17, sprite: 'chest' }); const left = probe();
      check(right.pan > 0.2 && left.pan < -0.2, 'pan follows the side ' + right.pan + ' ' + left.pan);
      // every real kind hums; decoys do not
      for (const [k, o] of [['cache', { kind: 'item', item: 'cache', tier: 2 }], ['glass', { kind: 'item', item: 'shard' }], ['glass', { kind: 'deco', glassGrowth: true }], ['page', { kind: 'item', item: 'tobin_page', tobinPage: 3 }]]) {
        clearAll(); add(Object.assign({ x: 22, y: 20, sprite: 'chest' }, o)); const r = probe(); check(r.kind === k && r.level > 0, 'hums for ' + k + ' ' + JSON.stringify(o));
      }
      for (const o of [{ kind: 'item', item: 'tonic' }, { kind: 'deco', sprite: 'lamp', glassLamp: true }, { kind: 'item', item: 'cache', hidden: true }, { kind: 'item', item: 'cache', dead: true }, { kind: 'item', item: 'sovereigns' }, { kind: 'deco', sprite: 'coil', label: 'The bell-rope, cut' }, { kind: 'npc', id: 'x' }]) {
        clearAll(); add(Object.assign({ x: 21, y: 20 }, o)); check(probe().level === 0, 'silent for decoy ' + JSON.stringify(o));
      }
      // a resonant wall hums until it is cracked open; the sung wall too
      clearAll(); const wx = 24, wy = 20, old = G.map.get(wx, wy);
      G.map.set(wx, wy, { tex: 't_glassrock', resonant: true }); G.map._p12sWalls = null; const w1 = probe();
      G.map.set(wx, wy, null); const w2 = probe(); check(w1.kind === 'wall' && w1.level > 0 && w2.level === 0, 'a resonant wall hums, then is quiet once opened');
      G.map.set(wx, wy, { tex: 't_stone' }); G.map._p12sWalls = null; check(probe().level === 0, 'plain stone is silent');
      G.map.set(wx, wy, { tex: 'p9p_reedstone', p9pSung: true }); G.map._p12sWalls = null; check(probe().kind === 'wall', 'the sung wall hums');
      G.map.set(wx, wy, old); G.map._p12sWalls = null;
      // off = silent
      clearAll(); add({ kind: 'item', item: 'cache', tier: 1, x: 21, y: 20, sprite: 'chest' });
      S.set.fork = false; check(S.toolId() === 0, 'switch off puts the fork away'); S.set.fork = true;
      // the old silver fork counts, wider
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.give('v_fork'); G.flags.p12s_tool = 1; check(S.toolId() === 1 && S.forkRange() > 9, 'silver fork works and reaches further');
      clearAll(); G.player.inv = G.player.inv.filter(s => s.id !== 'v_fork'); check(S.toolId() === 0, 'sold: not held'); G.flags.p12s_tool = 0;
      return out;
    });
    assert.deepEqual(fork.fails, [], 'fork: ' + fork.fails.join('; '));

    // captions: words for the hum when Sound captions are on; a first-find line once per kind
    const cap = await page.evaluate(async () => {
      const S = SONGCRAFT, out = {};
      ACCESS.settings.cap = true; document.getElementById('ac-captions')?.replaceChildren();
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.give('p12_fork'); S.setTool(1); G.flags.p12s_fseen = 0; __reset();
      const c = { kind: 'item', item: 'cache', tier: 1, x: 28, y: 20, sprite: 'chest' }; G.ents.push(c);
      const texts = [];
      for (const x of [28, 26, 23.5, 21.5, 20.6]) { c.x = x; S.tick(0.5); const b = document.getElementById('ac-captions'); texts.push(b ? b.textContent : ''); }
      out.last = S.stats.lastCaption; out.texts = texts; out.seen = G.flags.p12s_fseen;
      ACCESS.settings.cap = false; S.stats.lastCaption = null; c.x = 28; S.tick(0.5); c.x = 20.6; S.tick(0.5); out.silentWhenOff = S.stats.lastCaption === null;
      G.ents.splice(G.ents.indexOf(c), 1); S.setTool(0); G.flags.p12s_fseen = 0;
      return out;
    });
    assert.ok(/clear/.test(cap.last) && cap.texts.some(t => /faint/.test(t)) && cap.texts.some(t => /closer/.test(t)), 'captions say it in words: ' + JSON.stringify(cap));
    assert.equal(cap.seen & 2, 2, 'first find of a cache was noted'); assert.ok(cap.silentWhenOff, 'no caption when the setting is off');

    // ================================================================= 7. dowsing rod
    const rodRes = await page.evaluate(() => {
      const S = SONGCRAFT, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.give('p12_rod'); S.setTool(2); check(S.toolId() === 2, 'rod held');
      const f = G.flags; const keep = { kaelen_met: f.kaelen_met, part3: f.part3, greening: f.greening, seen: f.p12s_rseen };
      const go = (map, x, y, dir) => { loadMap(map, G.maps[map].spawn); G.state = 'play'; Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = dir; };
      // rootvault: the bore
      f.kaelen_met = false; go('rootvault', 5, 5, 0);
      check(S.rootTargets().length === 0 && S.probeRod().kind !== 'root', 'gated: before Kaelen speaks of the Root the rod names none');
      f.kaelen_met = true; const bore = G.ents.find(e => e.use === 'bore'); check(!!bore, 'bore exists');
      const ts = S.rootTargets(); check(ts.length === 1 && ts[0].id === 'rootvault', 'rootvault target');
      // stand 6 cells west of the bore facing east: straight ahead; then facing south: it is to the left (negative)
      Engine.cam.x = bore.x - 6; Engine.cam.y = bore.y; Engine.cam.dir = 0; let r = S.probeRod(); out.ahead = r.rel; check(r.kind === 'root' && Math.abs(r.rel) < 1e-6 && !r.steady, 'dips straight ahead');
      Engine.cam.dir = Math.PI / 2; r = S.probeRod(); check(r.rel < -1.4, 'to the left when facing south: ' + r.rel);
      Engine.cam.dir = -Math.PI / 2; r = S.probeRod(); check(r.rel > 1.4, 'to the right when facing north: ' + r.rel);
      // the wobble dies as you close in; steady when close; one journal line, once
      Engine.cam.dir = 0; Engine.cam.x = bore.x - 20; const wob = (t) => Math.abs(S.needleAngle(t) - S.probeRod().rel);
      GFX.reduceMotion = false; let wFar = 0; for (let t = 0; t < 3; t += 0.1) wFar = Math.max(wFar, wob(t));
      Engine.cam.x = bore.x - 3; let wNear = 0; S.probeRod(); for (let t = 0; t < 3; t += 0.1) wNear = Math.max(wNear, wob(t));
      Engine.cam.x = bore.x - 1.5; S.probeRod(); let wStill = 0; for (let t = 0; t < 3; t += 0.1) wStill = Math.max(wStill, wob(t)); GFX.reduceMotion = true;
      check(wFar > wNear && wNear > 0 && wStill === 0, `wobble ${wFar.toFixed(2)} > ${wNear.toFixed(2)} > steady ${wStill}`);
      f.p12s_rseen = 0; const j0 = G.journal.length; r = S.probeRod(); check(r.steady, 'steady within two cells'); S.rodFound(); S.rodFound(); S.tick(1);
      check(G.journal.length === j0 + 1 && /Casing/.test(G.journal[0].text) && (f.p12s_rseen & 2) === 2, 'one journal line on first find: ' + (G.journal[0] && G.journal[0].text));
      // quarry: the shaft gate to the Root-vault (after Kaelen); greened = closed
      go('quarry', 20, 20, 0); const q = S.rootTargets(); check(q.length >= 1 && q.every(t => t.id === 'quarry'), 'quarry target is the shaft');
      const nearest = q.map(t => Math.hypot(t.x - 20, t.y - 20)).sort((a, b) => a - b)[0]; check(Math.abs(S.probeRod().d - nearest) < 1e-9, 'points to the nearest');
      f.greening = true; check(S.rootTargets().length === 0, 'closed once the Greening has happened'); f.greening = keep.greening;
      // the Tuning Room: only once in the Grove
      f.part3 = false; go('malting', 15, 14, Math.PI / 2); check(S.rootTargets().length === 0, 'gated: no Grove root before the Grove');
      f.part3 = true; check(S.rootTargets().length === 1 && S.rootTargets()[0].id === 'malting', 'grove root once part3'); r = S.probeRod(); check(r.kind === 'root' && Math.abs(r.rel) < 0.2, 'malting root ahead');
      // roots beat veins beat beds; veins/beds when no root is in the map
      go('oakhaven', 40, 50, 0); const kinds = S.rootTargets().length === 0; check(kinds, 'oakhaven has no Anchor-root');
      const bed = G.map._p9beds && G.map._p9beds[0]; if (bed) { const rr = S.probeRod(); check(rr.has && rr.kind === 'bed', 'reed bed fallback ' + rr.kind); }
      const sh = { kind: 'item', item: 'shard', x: 44, y: 50, sprite: 'coil' }; G.ents.push(sh); let rr2 = S.probeRod(); check(rr2.kind === 'vein' && rr2.has, 'root-vein before bed'); G.ents.splice(G.ents.indexOf(sh), 1);
      check(S.veinTargets().every(t => t.id === 'vein'), 'veins');
      f.kaelen_met = keep.kaelen_met; f.part3 = keep.part3; f.p12s_rseen = keep.seen || 0; S.setTool(0);
      return out;
    });
    assert.deepEqual(rodRes.fails, [], 'rod: ' + rodRes.fails.join('; '));

    // ================================================================= 8. save / load, hostile values
    const sv = await page.evaluate(() => {
      const S = SONGCRAFT, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.give('p12_flute'); G.give('p12_fork'); G.give('p12_rod');
      S.equip('p12_flute'); S.setTool(2); check(S.instId() === 'p12_flute' && S.toolId() === 2, 'equipped and held');
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      check(snap.flags.p12s_inst === 2 && snap.flags.p12s_tool === 2, 'saved flags are small integers');
      G.flags.p12s_inst = 0; G.flags.p12s_tool = 0; G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id));
      restoreGame(snap);
      check(S.instId() === 'p12_flute' && S.toolId() === 2 && S.held('p12_flute') === 1, 'round trip: slot and items survive');
      // hostile values
      for (const bad of ['evil', -5, 99, NaN, Infinity, {}, [], '2', 2.7, null, '<img src=x onerror=1>', 1e999]) {
        G.flags.p12s_inst = bad; G.flags.p12s_tool = bad; G.flags.p12s_fseen = bad; G.flags.p12s_rseen = bad; S.sanitize();
        const f = G.flags;
        check(Number.isInteger(f.p12s_inst) && f.p12s_inst >= 0 && f.p12s_inst <= 3 && Number.isInteger(f.p12s_tool) && f.p12s_tool >= 0 && f.p12s_tool <= 2, 'clamped ' + String(bad));
        check(Number.isInteger(f.p12s_fseen) && f.p12s_fseen >= 0 && f.p12s_fseen <= 15 && Number.isInteger(f.p12s_rseen) && f.p12s_rseen >= 0 && f.p12s_rseen <= 31, 'seen clamped ' + String(bad));
        check(S.instId() === null || S.held(S.instId()) > 0, 'never equips what is not held');
      }
      // an instrument slot pointing at an item you do not own is dropped
      G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.flags.p12s_inst = 3; G.flags.p12s_tool = 1; S.sanitize();
      check(G.flags.p12s_inst === 0 && G.flags.p12s_tool === 0 && S.instId() === null && S.toolId() === 0, 'unowned slot dropped');
      // hostile stack counts
      G.player.inv = [{ id: 'p12_lute', n: 'many' }, { id: 'p12_lute', n: -3 }, { id: '__proto__', n: 1 }, null, { id: 'p12_fork', n: NaN }]; G.flags.p12s_inst = 1;
      check(S.held('p12_lute') >= 0 && Number.isFinite(S.held('p12_lute')) && S.held('p12_fork') === 1, 'hostile stacks are numbers');
      G.player.inv = []; G.flags.p12s_inst = 0; G.flags.p12s_tool = 0;
      // hostile instrument names in a save never become markup: the Song-book builds buttons with textContent
      return out;
    });
    assert.deepEqual(sv.fails, [], 'save/load: ' + sv.fails.join('; '));

    // ================================================================= 9. keyboard, Song-book (pad), touch, inventory
    await page.evaluate(() => { G.player.inv = G.player.inv.filter(s => !/^p12_/.test(s.id)); G.flags.p12s_inst = 0; G.flags.p12s_tool = 0; for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy', 'p12_fork', 'p12_rod']) G.give(id); G.state = 'play'; });
    await page.keyboard.press('j'); assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 1, 'J takes up the fork');
    await page.keyboard.press('j'); assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 2, 'J again, the rod');
    await page.keyboard.press('j'); assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 0, 'and again, nothing');
    await page.locator('#p12s-touch').waitFor({ state: 'attached' });
    assert.equal(await page.evaluate(() => document.getElementById('p12s-touch').hidden), false, 'the touch button shows once you own a tool');
    await page.evaluate(() => document.getElementById('p12s-touch').click()); assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 1, 'touch cycles the tool');
    await page.evaluate(() => document.getElementById('p12s-touch').click()); await page.evaluate(() => document.getElementById('p12s-touch').click());
    // the Song-book: Tab opens it (the pad's Y calls the same panel), buttons are real buttons reachable by keyboard
    await page.keyboard.press('Tab');
    await page.locator('#p12s-inst-flute').waitFor();
    await page.locator('#p12s-inst-flute').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => SONGCRAFT.instId()), 'p12_flute', 'equip from the Song-book by keyboard');
    assert.ok(/40% less noise/.test(await page.locator('#p12s-fx').textContent()), 'the effect is stated');
    assert.equal(await page.locator('#p12s-inst-flute').getAttribute('aria-pressed'), 'true');
    await page.locator('#p12s-tool-2').click(); assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 2, 'hold the rod from the Song-book');
    await shot(page, 'songbook-1280.png');
    const f1 = await fits(page); assert.ok(f1.inside && !f1.hscroll, 'Song-book rows fit at 1280x800 ' + JSON.stringify(f1));
    await page.locator('#p12s-inst-none').click(); assert.equal(await page.evaluate(() => SONGCRAFT.instId()), null);
    await page.keyboard.press('Escape');
    // using the item in the inventory
    await page.evaluate(() => { G.state = 'panel'; renderInventory(); });
    await page.evaluate(() => { const s = G.player.inv.find(x => x.id === 'p12_lute'); useItem(s); });
    assert.equal(await page.evaluate(() => SONGCRAFT.instId()), 'p12_lute', 'using a lute in the pack equips it');
    await page.evaluate(() => { const s = G.player.inv.find(x => x.id === 'p12_lute'); useItem(s); });
    assert.equal(await page.evaluate(() => SONGCRAFT.instId()), null, 'again puts it away');
    await page.evaluate(() => { useItem(G.player.inv.find(x => x.id === 'p12_fork')); });
    assert.equal(await page.evaluate(() => SONGCRAFT.toolId()), 1, 'using the fork holds it');
    await page.evaluate(() => { closeModal(); G.state = 'play'; SONGCRAFT.setTool(0); });

    // Options rows
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    await page.locator('#p12s-opt-rod').scrollIntoViewIfNeeded();
    await page.locator('#p12s-opt-rod').click();
    assert.equal(await page.evaluate(() => SONGCRAFT.set.rod), false, 'the rod switch turns off');
    assert.equal(await page.evaluate(() => NPCS.orrin.shop.some(e => e.item === 'p12_rod')), false, '... and the stock goes');
    await page.locator('#p12s-opt-rod').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('octave.songcraft12.v1')).rod), true, 'persisted');
    await shot(page, 'options-1280.png');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });

    // ================================================================= 10. screenshots of the fork and the rod in play
    await page.evaluate(() => {
      GFX.reduceMotion = false; const S = SONGCRAFT; __reset(); Engine.cam.x = 20; Engine.cam.y = 20; Engine.cam.dir = 0;
      window.__sc = { kind: 'item', item: 'cache', tier: 1, x: 22, y: 20.3, sprite: 'chest' }; G.ents.push(window.__sc); S.setTool(1); S.tick(0.5);
    });
    await page.waitForTimeout(200); await shot(page, 'fork-1280.png');
    await page.evaluate(() => { G.ents.splice(G.ents.indexOf(window.__sc), 1); const S = SONGCRAFT; S.setTool(2); G.flags.kaelen_met = true; loadMap('rootvault', G.maps.rootvault.spawn); G.state = 'play'; const b = G.ents.find(e => e.use === 'bore'); Engine.cam.x = b.x - 5; Engine.cam.y = b.y; Engine.cam.dir = 0.2; S.tick(0.5); });
    await page.waitForTimeout(250); await shot(page, 'rod-1280.png');
    await page.evaluate(() => { const b = G.ents.find(e => e.use === 'bore'); Engine.cam.x = b.x - 1.6; Engine.cam.y = b.y; Engine.cam.dir = 0; SONGCRAFT.tick(0.5); });
    await page.waitForTimeout(250); await shot(page, 'rod-steady-1280.png');
    await page.evaluate(() => { SONGCRAFT.setTool(0); });

    // ================================================================= 11. 640x400
    const small = await boot(browser, { width: 640, height: 400 });
    await small.page.evaluate(() => { for (const id of ['p12_lute', 'p12_flute', 'p12_gurdy', 'p12_fork', 'p12_rod']) G.give(id); G.state = 'panel'; renderSongs(); });
    await small.page.locator('#p12s-inst-gurdy').waitFor();
    const f2 = await fits(small.page); assert.ok(f2.inside && !f2.hscroll, 'Song-book fits 640x400 ' + JSON.stringify(f2));
    await shot(small.page, 'songbook-640.png');
    await small.page.evaluate(() => { closeModal(); G.state = 'play'; SONGCRAFT.setTool(1); __seed(3); Engine.cam.x = 20; Engine.cam.y = 20; G.ents.push({ kind: 'item', item: 'cache', tier: 1, x: 21.2, y: 20, sprite: 'chest' }); SONGCRAFT.tick(0.5); });
    await small.page.waitForTimeout(250); await shot(small.page, 'fork-640.png');
    await small.page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const f3 = await fits(small.page); assert.ok(f3.inside && !f3.hscroll, 'Options fits 640x400 ' + JSON.stringify(f3));
    assert.deepEqual(small.errors, [], 'no page errors at 640x400: ' + small.errors.join('; '));

    // ================================================================= 12. French coverage
    const strings = await page.evaluate(() => {
      const out = [], walk = (v) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
      walk(SONGCRAFT.TX); return out;
    });
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p12-songcraft.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
    const have = new Map(tsv.map(r => [r[0], r[1]]));
    const missing = strings.filter(s => !have.has(s) || !have.get(s));
    assert.deepEqual(missing, [], 'French for every new string; missing: ' + missing.slice(0, 5).join(' | '));

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS songcraft12');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL songcraft12:', e.message || e); process.exit(1); });
