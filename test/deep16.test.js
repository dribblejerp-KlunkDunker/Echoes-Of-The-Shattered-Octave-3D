// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/deep16.test.js
// Phase 16 DEEP: the Lower Plazas under Whisper-Grove: diving, breath, swimming in three dimensions, the under-water view,
// the route (3D BFS and the breath budget), saves, the register. Uses the served preview; never starts a server.
// SHOTS=<dir> writes screenshots there.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3982';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs'), path = require('path');

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Deep Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(300);
}
async function boot(browser, viewport, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/deep16.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 16016; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  await page.evaluate(() => {
    window.__go = (map, x, y, dir) => { loadMap(map, { x, y, dir }); G.state = 'play'; G.keys = {}; };
    // under water at a point, eye at z, breath full (the way a dive leaves you, but anywhere)
    window.__under = (x, y, dir, z) => {
      DEEP16.T.arrive = 'dive'; loadMap(DEEP16.MAPID, { x: 3.5, y: 3.5, dir: 0 }); G.state = 'play'; G.keys = {};
      const c = Engine.cam; c.x = x; c.y = y; c.dir = dir || 0; c.pitch = 0;
      const T = DEEP16.T; T.z = z; c.z = z; T.vx = T.vy = T.vz = 0; T.surfaced = false; T.U = 1; T.breath = T.max = DEEP16.breathMax(); T.warn = 0; T.emptyT = 0; T.drownT = 0;
      G.vel.x = 0; G.vel.y = 0;
    };
    window.__run = (n, keys, dt) => { G.keys = Object.assign({}, keys || {}); for (let i = 0; i < n; i++) { G.state = 'play'; update(dt || 1 / 60); } G.keys = {}; };
    window.__msgs = () => document.querySelector('#msgs').textContent;
  });
  return { page, errors };
}
const HELPERS = () => {
  if (window.S) return;
  const S = window.S = { cap: null, on: false };
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), w: F.w, h: F.h }; }, 199);
  S.stage = (map, x, y, dir, tod, flags) => {
    for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {});
    loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = tod == null ? 0.5 : tod; G.day = 3;
    Engine.cam.pitch = 0; Engine.cam.bob = 0; Weather.hold('clear'); GFX.reduceMotion = false; GFX.noFlash = false;
  };
  S.frame = (fx, t) => {
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = 1; GFX.particles = 1; Engine.setLook({ fogK: 1 });
    for (const k of (fx || [])) GFX[k] = true;
    Engine.setTime(t == null ? 5 : t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
    S.on = true; Engine.render(G.ents.filter(e => e.kind === 'deco'), G.tod); S.on = false;
    return S.cap;
  };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  S.scenes = () => {
    const out = [];
    const add = (map, x, y, dir, tod, flags) => { S.stage(map, x, y, dir, tod, flags); out.push(S.hash(S.frame(['deepView'], 5).fb)); };
    add('whispergrove', 24.5, 27.5, -1.57, 0.5, {});
    add('whispergrove', 13.5, 34.5, 0, 0.9, {});
    add('cloister', 9.5, 13.3, -1.57, 0.95, {});
    add('catacombs', 2.6, 14.5, 0, 0.5, {});
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m, extra) => { if (!c) { fails.push(m); console.log('FAIL: ' + m + (extra !== undefined ? ' ' + JSON.stringify(extra).slice(0, 400) : '')); } else console.log('ok: ' + m); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);
    const shot = async (name) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, name + '.png') }); };

    // ---------------------------------------------------------------- above water: the module changes no frame (first, on a fresh page)
    await ev(HELPERS);
    const mine = await ev(() => { S.scenes(); return S.scenes(); });
    const Bp = await boot(browser, null, { blockModule: true });
    await Bp.page.evaluate(HELPERS);
    const baseH = await Bp.page.evaluate(() => { S.scenes(); return S.scenes(); });
    check(mine.length === 4 && mine.every((h, i) => h === baseH[i]), 'above water: ' + mine.length + ' fixed-camera frames (the Court twice, the Cloister, the catacombs) hash identically to the game without this module', { mine, baseH });
    check(Bp.errors.length === 0, 'the module-less page loads without errors', Bp.errors);
    await Bp.page.close();
    // ---------------------------------------------------------------- loaded, text, French, presets
    const base = await ev(() => {
      const o = { has: typeof DEEP16, on: DEEP16.cfg.on, n: DEEP16.TEXTS.length, map: !!G.maps.p16d_lower, item: !!ITEMS.p16d_register,
        w: G.maps.p16d_lower.w, h: G.maps.p16d_lower.h, relief: !!G.maps.p16d_lower.lvls, ceil: G.maps.p16d_lower.ceilZ,
        flags: Object.keys(G.flags).filter((k) => k.startsWith('p16d_')), fx: GFX.FX.includes('deepView'), def: GFX.deepView,
        noEmoji: DEEP16.TEXTS.every((t) => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
        noNumeralDate: DEEP16.TEXTS.every((t) => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)),
        noScream: DEEP16.TEXTS.filter((t) => /\b(scream|screams|screamed|shriek)/i.test(t)).length,
        hush: DEEP16.TEXTS.filter((t) => /\bthe Hush\b/i.test(t)).length,
        enemies: G.maps.p16d_lower.entities.filter((e) => e.kind === 'enemy').map((e) => e.type + ':' + !!e.guard),
        rooms: DEEP16.ROOMS.length, pockets: DEEP16.POCKETS.length, base: G.maps.p16d_lower.baseCount === G.maps.p16d_lower.entities.length };
      o.presets = {}; for (const p of ['original', 'low', 'medium', 'high', 'cinematic']) { PRESETS.apply(p); o.presets[p] = [GFX.deepView, GFX.bloom, !!GFX.cineGrade]; }
      PRESETS.apply('medium'); GFX.plain(); o.plain = GFX.deepView; PRESETS.apply('medium');
      return o;
    });
    check(base.has === 'object' && base.on && base.map && base.item && base.w === 40 && base.h === 32 && base.relief && base.ceil === 3.4 && base.base, 'DEEP16 exists, the switch is on, the 40x32 relief map (vault 3.4) and the register are registered');
    check(base.rooms >= 6 && base.rooms <= 10 && base.pockets >= 3, 'six to ten rooms (' + base.rooms + ') and pockets of air (' + base.pockets + ')');
    check(base.enemies.length <= 5 && base.enemies.every((e) => e === 'drowned:true'), 'few foes, existing type, all guards (' + base.enemies.join() + ')');
    check(base.n > 80 && base.noEmoji && base.noNumeralDate && base.noScream === 0 && base.hush === 0, 'text: ' + base.n + ' strings, no emoji, no numeral dates, nobody screams, the Hush not named');
    check(base.flags.length === 0, 'a fresh game has no p16d_ flags');
    check(base.fx && base.def === true && base.plain === false, 'GFX.deepView is in GFX.FX, on by default, off in GFX.plain()');
    check(base.presets.original[0] === false && base.presets.low[0] === false && base.presets.medium[0] === true && base.presets.high[0] === true && base.presets.cinematic[0] === true, 'presets: Original and Low off (per-frame), Medium/High/Cinematic on', base.presets);
    check(base.presets.cinematic[1] === false && base.presets.cinematic[2] === true, 'Cinematic: post bloom off (cinema14 replaces it) and the cinema grade on');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p16-deep.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await ev(() => DEEP16.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2 && r[1].trim()), 'every registered string has a French pair (' + noFr.length + ' missing)', noFr.slice(0, 3));
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|the Office|the Synod)\b/.test(r[1])), 'the French follows the glossary terms');

    // ---------------------------------------------------------------- the dive point in the Court
    const dv = await ev(async () => {
      const out = {};
      __go('whispergrove', 13.5, 34.5, 0); out.before = !!G.map.entities.find((e) => e._p16d === 'dive');
      G.flags.part3 = true; G.flags.greening = true; __go('whispergrove', 13.5, 34.5, 0);
      const d = G.map.entities.find((e) => e._p16d === 'dive'); out.after = !!d;
      out.onDeep = d ? G.map.floorCells[(d.y | 0) * G.map.w + (d.x | 0)] === 2 : false;
      DEEP16.cfg.on = false; DEEP16.syncAll(); out.off = !!G.map.entities.find((e) => e._p16d === 'dive');
      DEEP16.cfg.on = true; DEEP16.syncAll(); out.back = !!G.map.entities.find((e) => e._p16d === 'dive');
      const snapE = snapshotGame().maps.whispergrove; out.notSaved = !(snapE.extra || []).some((o) => o.sprite === 'p16d_rail');
      // E on it
      for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
      interact(); out.state = G.state; out.title = document.querySelector('#event-panel h2') && document.querySelector('#event-panel h2').textContent;
      return out;
    });
    check(!dv.before && dv.after && dv.onDeep && !dv.off && dv.back && dv.notSaved, 'the dive point stands in the deep pool only after the Greening (part3), only with the switch on, and is never saved', dv);
    check(dv.state === 'event' && dv.title === 'The Lower Plazas', 'E at the pool opens the dive (' + dv.title + ')');
    await shot('d_dive_event');
    await pg.locator('#event-panel button').first().click(); await pg.waitForTimeout(200);
    const arr = await ev(() => ({ map: G.mapId, z: Engine.cam.z, T: { z: DEEP16.T.z, surf: DEEP16.T.surfaced, breath: DEEP16.T.breath, max: DEEP16.T.max, U: DEEP16.T.U }, dives: G.flags.p16d_dives, j: G.journal[0] && G.journal[0].text, swim: DEEP16.swimming(), under: DEEP16.underwater() }));
    check(arr.map === 'p16d_lower' && arr.T.surf && arr.T.z >= DEEP16_WL(arr) && Math.abs(arr.T.breath - arr.T.max) < 0.5 && arr.dives === 1 && /Lower Plazas/.test(arr.j) && arr.swim && !arr.under, 'diving lands you in Well Three, head up in the air, breath full, one journal line', arr);
    function DEEP16_WL() { return 3.12; }

    // ---------------------------------------------------------------- the route: 3D BFS, the breath budget, the ways out
    const rt = await ev(() => {
      const b = DEEP16.budget(), out = { cap: b.cap, reach: b.reach, regTrip: b.regTrip, rooms: b.rooms, stuck: b.stuck, openN: b.openN, worst: b.worstLink };
      out.pairs = b.pair.map((r) => r.map((v) => +v.toFixed(1)));
      const wg = G.maps.whispergrove;
      out.exits = Object.keys(DEEP16.EXITS).map((k) => { const x = DEEP16.EXITS[k]; return { k, inPocket: DEEP16.pocketOf(x.at[0], x.at[1]) >= 0, land: !wg.isBlocked(x.portal.x | 0, x.portal.y | 0), map: x.portal.map }; });
      out.ent = G.maps.p16d_lower.entities.filter((e) => e.use === 'p16d_exit').length;
      out.spawnPk = DEEP16.pocketOf(G.maps.p16d_lower.spawn.x, G.maps.p16d_lower.spawn.y);
      return out;
    });
    check(rt.stuck === 0 && rt.openN > 5000, '3D BFS: from the two exits every one of ' + rt.openN + ' swimmable (cell, depth) states is reachable, so every state can swim back out (moves are reversible)');
    check(rt.reach.length === 6 && rt.worst <= rt.cap, 'breath graph: every pocket of air is in reach of the next within ' + rt.cap + ' s (60 % of a base breath); the longest stretch is ' + rt.worst.toFixed(1) + ' s', rt.pairs);
    check(rt.regTrip <= rt.cap && rt.rooms.every((r) => r.trip <= rt.cap), 'the register and the middle of every room are a round trip of at most ' + rt.cap + ' s from air (register ' + rt.regTrip.toFixed(1) + ' s; ' + rt.rooms.map((r) => r.id + ' ' + r.trip.toFixed(1)).join(', ') + ')');
    check(rt.exits.length === 2 && rt.exits.every((x) => x.inPocket && x.land && x.map === 'whispergrove') && rt.ent === 2 && rt.spawnPk === 0, 'two ways up, both in air pockets, landing in free ground in the Court; the map spawn is in Well Three');

    // ---------------------------------------------------------------- movement: swimming speeds, glide, up and down
    const mv = await ev(() => {
      const out = {}, c = Engine.cam;
      __under(7.6, 17.5, 0, 1.8);
      __run(60, { w: true }); const x1 = c.x; __run(60, { w: true }); out.swim = c.x - x1;   // steady second
      out.vz0 = DEEP16.T.z;
      const g0 = c.x; __run(40, {}); out.glide = c.x - g0;
      // walking the same second on land
      __go('whispergrove', 24.5, 43.5, 0); c.dir = -Math.PI / 2; __run(60, { w: true }); const y1 = c.y; __run(60, { w: true }); out.land = y1 - c.y;
      // sprint
      __under(7.6, 17.5, 0, 1.8); __run(60, { w: true, shift: true }); const x2 = c.x; __run(30, { w: true, shift: true }); out.sprint = (c.x - x2) * 2;
      // rise and sink
      __under(10.5, 18.5, 0, 1.6); const z0 = DEEP16.T.z; __run(60, { ' ': true }); out.rise = DEEP16.T.z - z0;
      __run(40, {}); const z1 = DEEP16.T.z; __run(60, { x: true }); out.sink = z1 - DEEP16.T.z;
      __run(400, { ' ': true }); out.top = DEEP16.T.z;
      __run(400, { control: true }); out.bottom = DEEP16.T.z; out.floor = G.map.groundAt(c.x, c.y);
      // look up and swim forward: you climb
      __under(7.6, 18.5, 0, 1.5); c.pitch = 40; __run(90, { w: true }); out.pitchRise = DEEP16.T.z - 1.5; c.pitch = 0;
      // low furniture: the drawer row at y 16 blocks a low swimmer and lets a high one over
      __under(12.5, 17.5, -Math.PI / 2, 1.5); __run(90, { w: true }); out.lowY = c.y;
      __under(12.5, 17.5, -Math.PI / 2, 3.1); __run(120, { w: true }); out.highY = c.y;
      // the game's feet stay on the floor (combat and the fall logic read them): no fall damage swimming off the stair
      __under(14.5, 7.5, Math.PI / 2, 3.0); const hp0 = G.player.hp; __run(200, { w: true }); out.stairHp = G.player.hp - hp0; out.stairY = c.y; out.feet = G.player.feet; out.feetGround = G.map.groundAt(c.x, c.y);
      return out;
    });
    const Bv = await ev(() => DEEP16.B);
    check(mv.swim > Bv.SWIM * 0.8 && mv.swim < Bv.SWIM * 1.1 && mv.land > mv.swim * 1.4, 'swimming: ' + mv.swim.toFixed(2) + ' u/s (B.SWIM ' + Bv.SWIM + '), walking on land ' + mv.land.toFixed(2) + ' u/s');
    check(mv.sprint > mv.swim * 1.2 && mv.sprint < Bv.SPRINT * 1.1, 'Shift swims harder: ' + mv.sprint.toFixed(2) + ' u/s');
    check(mv.glide > 0.15 && mv.glide < 1.6, 'letting go glides on: ' + mv.glide.toFixed(2) + ' u in two thirds of a second');
    check(mv.rise > 0.6 && mv.rise < Bv.RISE * 1.05 && mv.sink > 0.6, 'Space rises ' + mv.rise.toFixed(2) + ', X sinks ' + mv.sink.toFixed(2) + ' in a second (B.RISE ' + Bv.RISE + ')');
    check(Math.abs(mv.top - Bv.ZTOP) < 1e-6 && Math.abs(mv.bottom - (mv.floor + Bv.BODY)) < 1e-6, 'the vault and the floor bound the swim (top ' + mv.top.toFixed(2) + ', bottom ' + mv.bottom.toFixed(2) + ')');
    check(mv.pitchRise > 0.5, 'swimming forward while looking up climbs (' + mv.pitchRise.toFixed(2) + '): touch and controller swim with the look alone');
    check(mv.lowY > 16.95 && mv.highY < 15.6, 'the drawer stacks stop a low swimmer (y ' + mv.lowY.toFixed(2) + ') and let a high one over (y ' + mv.highY.toFixed(2) + ')');
    check(mv.stairHp === 0 && mv.stairY > 10 && mv.feet === mv.feetGround, 'swimming down off the broken stair: no fall damage, the feet follow the floor', mv);

    // ---------------------------------------------------------------- breath: drain, warnings, grace, damage, refill
    const br = await ev(() => {
      const out = {}, T = DEEP16.T, B = DEEP16.B;
      ACCESS.settings.cap = true;
      __under(10.5, 18.5, 0, 1.6); out.max = T.max; __run(600, {}); out.drainStill = T.max - T.breath;
      __under(10.5, 18.5, 0, 1.6); T.breath = T.max * 0.505; document.querySelector('#msgs').innerHTML = ''; __run(30, {}); out.w50 = __msgs();
      T.breath = T.max * 0.255; __run(30, {}); out.w25 = __msgs(); out.hudLow = document.getElementById('p16d-breath').className;
      out.meter = { role: document.getElementById('p16d-breath').getAttribute('role'), label: document.getElementById('p16d-breath').getAttribute('aria-label'), now: +document.getElementById('p16d-breath').getAttribute('aria-valuenow'), hidden: document.getElementById('p16d-breath').hidden };
      T.breath = T.max * 0.105; __run(30, {}); out.w10 = __msgs();
      out.caps = Array.from(document.querySelectorAll('#ac-captions div')).map((d) => d.textContent);
      // empty: a grace, then slow damage; never lethal at once
      G.player.hp = 40; G.player.hpMax = Math.max(G.player.hpMax, 40);
      T.breath = 0.001; __run(Math.floor((B.GRACE - 0.3) * 60), {}); out.graceHp = G.player.hp; out.empty = /no breath left/.test(__msgs());
      __run(120, {}); out.after2 = 40 - G.player.hp; out.dead = !!G.dead;
      // from full breath: time to the first damage, swimming hard into a wall
      __under(10.5, 18.5, Math.PI, 1.6); G.player.hp = 1000; let n = 0; const hp0 = G.player.hp;
      while (G.player.hp === hp0 && n < 60 * 60) { G.keys = { w: true, shift: true }; G.state = 'play'; update(1 / 60); n++; } G.keys = {};
      out.firstHurt = n / 60;
      // refill in a pocket of air, head up
      const p = DEEP16.POCKETS[1]; __under(p.at[0], p.at[1], 0, 3.0); T.breath = 2; G.player.hp = 40;
      __run(80, { ' ': true }); out.surf = T.surfaced; out.refill = T.breath; out.air = G.flags.p16d_air; out.capGasp = Array.from(document.querySelectorAll('#ac-captions div')).some((d) => /gasp/.test(d.textContent));
      out.hudHiddenFull = (() => { __run(120, {}); return document.getElementById('p16d-breath').hidden; })();
      ACCESS.settings.cap = false;
      return out;
    });
    check(Math.abs(br.drainStill - 10 * Bv.DRAIN_STILL) < 0.3, 'breath drains ' + br.drainStill.toFixed(2) + ' in ten still seconds (B.DRAIN_STILL ' + Bv.DRAIN_STILL + '/s; meter ' + br.max.toFixed(1) + ' s)');
    check(/started to ask/.test(br.w50) && /You need air/.test(br.w25) && /lungs burn/.test(br.w10), 'warnings at a half, a quarter and a tenth');
    check(/low/.test(br.hudLow) && br.meter.role === 'meter' && br.meter.label === 'Breath' && br.meter.now >= 20 && br.meter.now <= 26 && !br.meter.hidden, 'the HUD meter: role=meter, labelled, its value tracks the breath, amber when low', br.meter);
    check(br.caps.some((c) => /heartbeat/.test(c)), 'captions name the sound cues (' + br.caps.join(' | ') + ')');
    check(br.empty && br.graceHp === 40 && br.after2 > 0 && br.after2 < 12 && !br.dead, 'an empty breath says so, waits ' + Bv.GRACE + ' s, then hurts slowly (' + br.after2.toFixed(1) + ' hp in two seconds), not at once');
    check(br.firstHurt >= br.max / Bv.DRAIN_SPRINT + Bv.GRACE - 0.2, 'from a full breath, sprinting, the first damage comes after ' + br.firstHurt.toFixed(1) + ' s');
    check(br.surf && br.refill > 12 && br.air === 1 && br.capGasp && br.hudHiddenFull, 'head up in a pocket: breath refills (' + br.refill.toFixed(1) + '), the pocket is remembered, a gasp caption, the meter hides when full');

    // ---------------------------------------------------------------- Songs, weapons, the shriek, sound
    const sw = await ev(() => {
      const out = {}, p = G.player, T = DEEP16.T;
      __under(10.5, 18.5, 0, 1.6); __run(2, {});
      if (!p.songs.includes('tending')) p.songs.push('tending');
      p.voice = p.voiceMax = 20; G.song.t = 0; G.attack.t = 0; document.querySelector('#msgs').innerHTML = '';
      castSong('tending'); out.voiceUnder = p.voice; out.songMsg = /water takes the note/.test(__msgs());
      castSong('murmur'); out.murmur = G.murmurT;
      out.muffUnder = Audio_.muffled; out.duck = DEEP16.musicVol(1);
      G.attack.t = 0; G.song.t = 0; const w = currentWeapon(); attack('swing'); out.atk = G.attack.t / w.speed;
      const e = G.map.entities.find((x) => x.kind === 'enemy'); const n0 = G.noise; document.querySelector('#msgs').innerHTML = ''; drownedShriek(e); out.shriekNoise = G.noise - n0; out.shriekMsg = __msgs();
      // in the air of a pocket, a Song carries again
      const pk = DEEP16.POCKETS[2]; __under(pk.at[0], pk.at[1], 0, 3.25); __run(20, { ' ': true }); G.song.t = 0; G.attack.t = 0; p.voice = 20;
      out.surf = T.surfaced; castSong('tending'); out.voiceAir = p.voice; out.muffAir = Audio_.muffled; out.duckAir = DEEP16.musicVol(1);
      // and on land
      __go('whispergrove', 24.5, 43.5, 0); __run(2, {}); out.muffLand = Audio_.muffled; out.duckLand = DEEP16.musicVol(1); out.hudLand = document.getElementById('p16d-breath').hidden;
      G.attack.t = 0; G.song.t = 0; attack('swing'); out.atkLand = G.attack.t / w.speed; out.z = Engine.cam.z;
      out.req = !!(Audio_.music.request && Audio_.music.request._p16d);
      return out;
    });
    check(sw.voiceUnder === 20 && sw.songMsg && sw.murmur === 4, 'under water a Song does not carry and costs nothing; the murmur still works');
    check(sw.surf && sw.voiceAir < 20, 'head up in a pocket of air, a Song carries again');
    check(Math.abs(sw.atk - Bv.WEAPON_SLOW) < 0.01 && Math.abs(sw.atkLand - 1) < 0.01, 'weapons come slow under water (x' + sw.atk.toFixed(2) + '), as before on land');
    check(sw.shriekNoise === 0 && /nothing comes out of it but silver/.test(sw.shriekMsg), 'a Drowned Hollow\'s shriek makes no sound under water');
    check(sw.muffUnder >= Bv.MUFFLE - 0.01 && Math.abs(sw.muffAir - Bv.MUFFLE_AIR) < 0.02 && sw.muffLand < 0.01, 'the master low-pass: ' + sw.muffUnder.toFixed(2) + ' under water, ' + sw.muffAir.toFixed(2) + ' in a pocket, restored to ' + sw.muffLand.toFixed(2) + ' above');
    check(Math.abs(sw.duck - Bv.MUSIC_DUCK) < 1e-6 && sw.duckAir === 1 && sw.duckLand === 1 && sw.req, 'the recorded music is ducked to ' + Bv.MUSIC_DUCK + ' under water only');
    check(sw.hudLand === true && Math.abs(sw.z - 0.88) < 0.01, 'back on land: no meter, the eye back at its height');

    // ---------------------------------------------------------------- the under-water view
    await ev(HELPERS);
    const vw = await ev(() => {
      const out = {};
      PRESETS.apply('medium');
      __under(15.0, 11.0, 1.9, 2.9); __run(2, {});
      const T = DEEP16.T; T.U = 1;
      const on = S.frame(['deepView'], 5), off = S.frame([], 5);
      let d = 0; for (let i = 0; i < on.fb.length; i++) if (on.fb[i] !== off.fb[i]) d++;
      out.under = d / on.fb.length;
      T.U = DEEP16.B.U_AIR; let lum = (fb) => { let t = 0; for (let i = 0; i < fb.length; i += 7) t += (fb[i] & 255) + ((fb[i] >> 8) & 255) + ((fb[i] >> 16) & 255); return t; };
      const s0 = S.frame(['deepView'], 5), s1 = S.frame([], 5); T.U = 1; const s2 = S.frame(['deepView'], 5);
      out.airLighter = lum(s0.fb) > lum(s2.fb) && lum(s0.fb) < lum(s1.fb);
      T.U = 0; const s3 = S.frame(['deepView'], 5); let d2 = 0; for (let i = 0; i < s3.fb.length; i++) if (s3.fb[i] !== s1.fb[i]) d2++; out.surfacedDiff = d2;
      T.U = 1;
      // Reduce motion and No flashes: still frames over time
      GFX.reduceMotion = true; GFX.noFlash = true; const r1 = S.hash(S.frame(['deepView'], 5).fb), r2 = S.hash(S.frame(['deepView'], 7).fb); out.still = r1 === r2;
      GFX.reduceMotion = false; GFX.noFlash = false; const a1 = S.hash(S.frame(['deepView'], 5).fb), a2 = S.hash(S.frame(['deepView'], 7).fb); out.moves = a1 !== a2;
      // Cinematic: no double vignette, no bloom of our own
      PRESETS.apply('cinematic'); Engine.render(G.ents, G.tod); out.cineVig = DEEP16.stats.vig; out.cineBloom = GFX.bloom;
      PRESETS.apply('medium'); Engine.render(G.ents, G.tod); out.medVig = DEEP16.stats.vig;
      // above water: identical frames with the pass on or off
      __go('whispergrove', 24.5, 27.5, -1.57); const w0 = S.frame(['deepView'], 5), w1 = S.frame([], 5); let d3 = 0; for (let i = 0; i < w0.fb.length; i++) if (w0.fb[i] !== w1.fb[i]) d3++; out.landDiff = d3;
      PRESETS.apply('medium');
      return out;
    });
    check(vw.under > 0.6, 'under water the pass touches ' + (vw.under * 100).toFixed(0) + ' % of the view');
    check(vw.airLighter, 'head up in a pocket of air, a little of the water\'s look stays: lighter than under, darker than none');
    check(vw.surfacedDiff === 0 && vw.landDiff === 0, 'with the blend at zero, and anywhere above water, the frame is identical with the pass on or off');
    check(vw.still && vw.moves, 'Reduce motion + No flashes hold the water still; otherwise it moves');
    check(vw.cineVig === false && vw.medVig === true && vw.cineBloom === false, 'Cinematic: this pass leaves the vignette to cinema14 and adds no bloom (post bloom is off there too)');

    // ---------------------------------------------------------------- the register, the Ledger, Sable
    const rg = await ev(() => {
      const out = {};
      G.flags.sable_met = true; G.flags.sable_with = true; G.flags.part3 = true;
      __under(16.5, 25.8, -Math.PI / 2, 1.0); __run(2, {});
      const e = G.map.entities.find((x) => x.item === 'p16d_register'); const l0 = G.ledger.length, j0 = G.journal.length, xp0 = G.player.xp;
      out.topicBefore = COMPANION_TALK.TOPICS.some((t) => t.id === 's_p16d_register');
      pickUp(e);
      out.reg = G.flags.p16d_reg; out.ledger = G.ledger.length - l0; out.names = G.ledger.slice(-9).map((l) => l.name); out.j = G.journal.length - j0; out.xp = G.player.xp - xp0 >= 0; out.inv = G.has('p16d_register');
      out.again = DEEP16.takeRegister(); out.ledger2 = G.ledger.length - l0;
      const t = COMPANION_TALK.TOPICS.find((x) => x.id === 's_p16d_register'); out.topic = !!t && t.bit === 21 && t.who === 'sable';
      out.avail = COMPANION_TALK.available('sable').some((x) => x.id === 's_p16d_register');
      out.bits = COMPANION_TALK.TOPICS.filter((x) => x.bit === 21).length;
      const slot = G.player.inv.find((s) => s.id === 'p16d_register'); useItem(slot); out.read = document.querySelector('#event-panel').textContent; document.querySelector('#event-panel button').click();
      return out;
    });
    check(!rg.topicBefore && rg.reg === true && rg.ledger === 9 && rg.j === 1 && rg.inv && rg.again === false && rg.ledger2 === 9, 'taking the register: nine names into the Ledger once, one journal line, the item kept; never paid twice', rg.names);
    check(rg.topic && rg.avail && rg.bits === 1 && /Wren/.test(rg.read), 'Sable has a topic about it (bit 21, only once the register is up); reading it shows the names');

    // ---------------------------------------------------------------- saves: under water, hostile flags, old saves
    const sv = await ev(() => {
      const out = {};
      __under(33.0, 25.0, 0, 1.0); G.flags.p16d_air = 3; __run(2, {});
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.savedKeys = Object.keys(snap.flags).filter((k) => k.startsWith('p16d_')).sort();
      restoreGame(JSON.parse(JSON.stringify(snap))); __run(2, {});
      const c = Engine.cam, p = DEEP16.POCKETS[3];
      out.r = { map: G.mapId, x: c.x, y: c.y, px: p.at[0], py: p.at[1], surf: DEEP16.T.surfaced, z: DEEP16.T.z, breath: DEEP16.T.breath, max: DEEP16.T.max, hp: G.player.hp > 0 };
      // hostile values
      const bad = JSON.parse(JSON.stringify(snap)); Object.assign(bad.flags, { p16d_air: 99, p16d_seen: 'x', p16d_reg: 'yes', p16d_dives: -4, p16d_evil: '<img src=x onerror=alert(1)>' });
      restoreGame(bad); __run(2, {});
      out.h = { keys: Object.keys(G.flags).filter((k) => k.startsWith('p16d_')).sort(), map: G.mapId, x: c.x, y: c.y, surf: DEEP16.T.surfaced };
      out.evil = !!document.querySelector('#game img[src="x"]');
      // an old save: no p16d_ flags at all, on the surface
      const old = JSON.parse(JSON.stringify(snap)); for (const k of Object.keys(old.flags)) if (k.startsWith('p16d_')) delete old.flags[k]; old.mapId = 'whispergrove'; old.cam = { x: 24.5, y: 43.5, dir: 0 };
      restoreGame(old); __run(2, {}); out.old = { map: G.mapId, z: Engine.cam.z, hud: document.getElementById('p16d-breath').hidden, flags: Object.keys(G.flags).filter((k) => k.startsWith('p16d_')) };
      return out;
    });
    check(sv.r.map === 'p16d_lower' && Math.abs(sv.r.x - sv.r.px) < 1e-6 && Math.abs(sv.r.y - sv.r.py) < 1e-6 && sv.r.surf && sv.r.z >= 3.12 && Math.abs(sv.r.breath - sv.r.max) < 0.5 && sv.r.hp, 'a save made under water loads at the last pocket of air breathed, head up, breath full', sv.r);
    check(sv.h.keys.join() === 'p16d_j' || sv.h.keys.every((k) => ['p16d_j', 'p16d_dives', 'p16d_seen', 'p16d_air', 'p16d_reg'].includes(k)) && !sv.h.keys.includes('p16d_evil'), 'hostile p16d_ values are dropped (' + sv.h.keys.join() + ')');
    check(sv.h.map === 'p16d_lower' && sv.h.surf && Math.abs(sv.h.x - 3.5) < 1e-6 && !sv.evil, 'a hostile save still lands safely in Well Three, and nothing from it reaches the page');
    check(sv.old.map === 'whispergrove' && Math.abs(sv.old.z - 0.88) < 0.01 && sv.old.hud, 'an old save without p16d_ flags loads unchanged');

    // ---------------------------------------------------------------- the ways out
    const ex = await ev(() => {
      const out = {};
      for (const k of ['A', 'F']) {
        const p = DEEP16.POCKETS[k === 'A' ? 0 : 3]; __under(p.at[0], p.at[1], 0, 1.4);
        const e = G.map.entities.find((x) => x.use === 'p16d_exit' && x._x === k); useDeco(e);
        out[k] = { map: G.mapId, x: Engine.cam.x, y: Engine.cam.y, z: Engine.cam.z, blocked: G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0), muff: Audio_.muffled };
      }
      // the content switch off while down there: you can still swim out
      __under(10.5, 18.5, 0, 1.6); DEEP16.cfg.on = false; __run(30, { ' ': true }); out.swimOff = DEEP16.swimming() && DEEP16.T.z > 1.6; DEEP16.cfg.on = true;
      return out;
    });
    check(ex.A.map === 'whispergrove' && !ex.A.blocked && ex.F.map === 'whispergrove' && !ex.F.blocked && Math.abs(ex.F.z - 0.88) < 0.01 && ex.F.muff < 0.01, 'both ropes take you up into the Court, onto free ground, sound restored');
    check(ex.swimOff, 'turning the content switch off while below never strands you: you still swim');

    // ---------------------------------------------------------------- options
    const op = await ev(() => {
      closeModal(); G.state = 'panel'; renderAccessibilityMenu();
      const a = document.getElementById('p16d-opt'), b = document.getElementById('p16d-view');
      const out = { a: !!a, b: !!b, pressed: a && a.getAttribute('aria-pressed') };
      b.click(); out.viewOff = DEEP16.cfg.view === false; b.click(); out.viewOn = DEEP16.cfg.view === true;
      closeModal(); G.state = 'play';
      return out;
    });
    check(op.a && op.b && op.pressed === 'true' && op.viewOff && op.viewOn, 'Options has "The Lower Plazas" and "Underwater view" rows that toggle');

    // ---------------------------------------------------------------- per-frame cost: the 12-enemy scene
    const pf = await ev(() => {
      const out = {};
      __under(30.0, 24.0, Math.PI, 1.4);
      const m = G.map; for (let i = 0; i < 12; i++) { const e = { kind: 'enemy', type: 'drowned', x: 24 + (i % 6) * 2.2, y: 22.5 + Math.floor(i / 6) * 3.5, transient: true, guard: true }; hydrate(e); e.state = 'passive'; m.entities.push(e); }
      G.ents = m.entities;
      // on and off frames interleaved, so a busy machine slows both alike
      const time = (scale) => {
        GFX.scale = scale; Engine.setScale(scale); DEEP16.stats.profile = true;
        for (let i = 0; i < 6; i++) Engine.render(G.ents, G.tod);
        const on = [], off = [], own = [];
        for (let i = 0; i < 80; i++) {
          const flag = (i & 1) === 0; GFX.deepView = flag; Engine.setTime(5 + i * 0.03);
          const t0 = performance.now(); Engine.render(G.ents, G.tod); const dt = performance.now() - t0;
          if (flag) { on.push(dt); own.push(DEEP16.stats.ms); } else off.push(dt);
        }
        const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
        GFX.deepView = true;
        return { on: med(on), off: med(off), own: med(own) };
      };
      PRESETS.apply('medium');
      out.m1 = time(1); out.m2 = time(2);
      PRESETS.apply('medium');
      for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i].transient && m.entities[i].kind === 'enemy') m.entities.splice(i, 1);
      DEEP16.stats.profile = false;
      return out;
    });
    console.log('perf (median ms, 12 Drowned Hollows in view): 1x frame ' + pf.m1.on.toFixed(2) + ' with the pass, ' + pf.m1.off.toFixed(2) + ' without, the pass alone ' + pf.m1.own.toFixed(2) + '; 2x frame ' + pf.m2.on.toFixed(2) + ' / ' + pf.m2.off.toFixed(2) + ', the pass ' + pf.m2.own.toFixed(2));
    // a shared build server: the bound is absolute when the machine is quiet, relative to the frame when it is not
    check(pf.m1.own < Math.max(2.0, pf.m1.off * 0.2), 'per-frame: the under-water pass costs ' + pf.m1.own.toFixed(2) + ' ms at 1x in the 12-enemy scene, ' + (100 * pf.m1.own / pf.m1.off).toFixed(0) + ' % of the frame (2x: ' + pf.m2.own.toFixed(2) + ' ms)');

    allErrors.push(A.errors);
    await pg.close();

    // ---------------------------------------------------------------- 640x400: the meter and the dive panel fit
    const C = await boot(browser, { width: 640, height: 400 }); allErrors.push(C.errors);
    const cp = await C.page.evaluate(async () => {
      const out = {};
      G.flags.part3 = true; __go('whispergrove', 13.5, 34.5, 0); DEEP16.openDive();
      const ep = document.querySelector('#event'); const r = ep.getBoundingClientRect(); out.event = { w: r.width, h: r.height, iw: innerWidth, ih: innerHeight, scroll: document.documentElement.scrollWidth <= innerWidth };
      document.querySelector('#event-panel button').click(); await new Promise((res) => setTimeout(res, 50));
      __under(10.5, 18.5, 0, 1.6); DEEP16.T.breath = DEEP16.T.max * 0.4; __run(20, {});
      const m = document.getElementById('p16d-breath'), g = document.getElementById('game').getBoundingClientRect(), mr = m.getBoundingClientRect();
      out.meter = { hidden: m.hidden, inside: mr.left >= g.left && mr.right <= g.right && mr.top >= g.top && mr.bottom <= g.bottom, h: mr.height, w: mr.width, sw: m.scrollWidth <= m.clientWidth + 1 };
      out.scroll = document.documentElement.scrollWidth <= innerWidth;
      return out;
    });
    check(cp.event.scroll && cp.event.w <= cp.event.iw && cp.event.h <= cp.event.ih, '640x400: the dive panel fits', cp.event);
    check(!cp.meter.hidden && cp.meter.inside && cp.meter.sw && cp.meter.h > 6 && cp.scroll, '640x400: the breath meter shows inside the game, no overflow (' + Math.round(cp.meter.w) + 'x' + Math.round(cp.meter.h) + ')', cp.meter);
    if (SHOTS) await C.page.screenshot({ path: path.join(SHOTS, 'd_compact_640x400.png') });
    await C.page.close();
  } catch (e) {
    fails.push('exception: ' + (e && e.stack || e)); console.log('FAIL: exception', e);
  }
  const errs = allErrors.flat();
  check(errs.length === 0, 'no page errors (' + errs.length + ')', errs.slice(0, 5));
  await browser.close();
  console.log(fails.length ? `\ndeep16: FAIL (${fails.length})` : '\ndeep16: PASS');
  process.exit(fails.length ? 1 : 0);
})();
