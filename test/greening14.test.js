// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3921 node test/greening14.test.js
// Covers js/greening14.js: the Greening's stages in Oakhaven (flags -> growth, the escape-timer creep), Light-glass spreading
// at the story events, glowing veins at the Anchor-roots (pulse / steady / nearness), presets, "off = the original frame",
// per-frame cost, 640x400 Options, and page errors.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
// Frames are pinned: Engine.render is called by hand with a fixed clock and weather, and the module's own tick is stepped by
// hand with the game paused (G.state 'panel'), so the live loop cannot move anything between two calls.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'greening14-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }

async function bootPage(browser, url, viewport, block) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if ((m.type() === 'error' || /greening14/.test(m.text())) && !(block && /ERR_FAILED|greening14/.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  if (block) await page.route('**/js/greening14.js*', r => r.abort());
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(url);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Green Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  return { page, errors };
}

const HELPERS = () => {
  const S = window.S = { cap: null, on: false };
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), w: F.w, h: F.h }; }, 99);
  const FLAGS = {
    s0: {}, s1: { kaelen_met: true }, s2: { kaelen_met: true, coil_done: true, rite_ready: true }, s3: { kaelen_met: true, coil_done: true, rite_started: true },
    s4: { kaelen_met: true, coil_done: true, rite_started: true, bore_seated: true, bore_broken: true, greening: true },
    s5: { kaelen_met: true, coil_done: true, rite_started: true, bore_seated: true, bore_broken: true, greening: true, escaped: true, part3: true },
  };
  S.FLAGS = FLAGS;
  // set the story: flags, and the greening Oakhaven map the way finishBore builds it
  S.story = (name, extra) => {
    G.flags = Object.assign({}, FLAGS[name] || {}, extra || {});
    G.maps.oakhaven = G.flags.greening ? buildOakhaven(true) : buildAllMaps().oakhaven;
    G.escapeTimer = 0;
    if (typeof GREENING14 !== 'undefined') GREENING14.reset();
  };
  S.stage = (map, x, y, dir, tod) => {
    loadMap(map, { x, y, dir }); G.fadeT = 0; G.tod = tod == null ? 0.5 : tod; Engine.cam.pitch = 0; Engine.cam.bob = 0;
    Weather.hold('clear'); GFX.reduceMotion = false; GFX.noFlash = false; G.state = 'panel';
  };
  S.tick = (n, dt) => { for (let i = 0; i < n; i++) GREENING14.tick(dt == null ? 0.1 : dt); };
  S.frame = (ents, t) => {
    Engine.setTime(t == null ? 5 : t); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
    S.on = true; Engine.render(ents, G.tod); S.on = false; return S.cap;
  };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  S.sig = (m) => { const d = m.decals; if (!d) return '0:0'; let h = 2166136261, n = 0; for (const k of Object.keys(d).sort((a, b) => a - b)) { n++; const v = k + d[k]; for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 16777619); } } return n + ':' + (h >>> 0); };
  S.png = (k) => { const c = Engine.canvas, o = document.createElement('canvas'), vh = Engine.VIEW_H * Engine.getScale(); o.width = c.width * k; o.height = vh * k; const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(c, 0, 0, c.width, vh, 0, 0, o.width, o.height); return o.toDataURL('image/png'); };
  const STATIC = ['lamp', 'campfire', 'coil', 'brazier', 'hearth', 'willow', 'oak', 'grave', 'kestrel', 'lifttank', 'crates'];
  S.fixed = () => G.ents.filter(e => e.kind === 'deco' && STATIC.includes(e.sprite));
  // the fixed scenes of the "off = original" comparison; with `on` the three switches are on, otherwise off. Only fixed scenery.
  S.scenes = (on) => {
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = 1; GFX.particles = 1; Engine.setLook({ fogK: 1 });
    if (on) { GFX.greenStages = true; GFX.glassSpread = true; GFX.rootVeins = true; }
    GFX.changed();
    const out = [];
    const add = (story, extra, map, x, y, dir, tod) => { S.story(story, extra); S.stage(map, x, y, dir, tod); if (typeof GREENING14 !== 'undefined') S.tick(2, 0.1); out.push(S.hash(S.frame(S.fixed()).fb)); };
    add('s5', null, 'oakhaven', 23.5, 20.5, -1.57, 0.95);       // the fully greened town: switches off = unchanged
    add('s4', null, 'oakhaven', 23.5, 24.5, 0, 0.95);
    add('s0', null, 'oakhaven', 23.5, 20.5, -1.57, 0.95);       // the story has not started: switches on = unchanged too
    add('s0', null, 'clearing', 20.5, 33.5, -1.57, 0.95);
    add('s0', null, 'quarry', G.maps.quarry.spawn.x, G.maps.quarry.spawn.y, G.maps.quarry.spawn.dir, 0.5);
    add('s0', null, 'rootvault', 34.5, 11.5, -1.57, 0.5);
    add('s0', null, 'whispergrove', 24.5, 27.5, -1.57, 0.5);
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3921';
  try {
    const { page, errors } = await bootPage(browser, URL);
    await page.evaluate(HELPERS);
    const shot = async (name, prep) => {
      const url = await page.evaluate((prep) => { if (prep) eval(prep); Engine.render(G.ents, G.tod); return S.png(3); }, prep || null);
      fs.writeFileSync(path.join(SHOT_DIR, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    };

    // ------------------------------------------------------------------
    //  0. the module, the switches, the presets
    // ------------------------------------------------------------------
    const KEYS = ['greenStages', 'glassSpread', 'rootVeins'];
    const st = await page.evaluate((KEYS) => {
      const o = { has: typeof GREENING14 === 'object', fx: KEYS.map(k => GFX.FX.includes(k)), def: KEYS.map(k => GFX[k]) };
      o.presets = {};
      for (const p of ['original', 'low', 'medium', 'high']) { PRESETS.apply(p); o.presets[p] = KEYS.map(k => GFX[k]).join(','); }
      PRESETS.apply('medium'); GFX.plain(); o.plain = KEYS.map(k => GFX[k]).join(',');
      PRESETS.apply('medium'); o.cur = PRESETS.current();
      PRESETS.apply('low'); o.curLow = PRESETS.current();
      PRESETS.apply('medium');
      return o;
    }, KEYS);
    ok(st.has && st.fx.every(Boolean), 'module: GREENING14 exists and its three flags are in GFX.FX');
    ok(st.presets.original === 'false,false,false' && st.presets.low === 'false,false,false' && st.curLow === 'low', `presets: Original and Low have them off (per-frame passes); Low is still recognised (${st.curLow})`);
    ok(st.presets.medium === 'true,true,true' && st.presets.high === 'true,true,true' && st.cur === 'medium' && st.plain === 'false,false,false', 'presets: Medium and High have them on; GFX.plain() turns them off');

    // ------------------------------------------------------------------
    //  1. off = the original game, pixel for pixel
    // ------------------------------------------------------------------
    const offMine = await page.evaluate(() => { S.scenes(false); return S.scenes(false); });
    const onMine = await page.evaluate(() => { S.scenes(true); return S.scenes(true); });
    const { page: page2, errors: errors2 } = await bootPage(browser, URL, null, true);
    await page2.evaluate(HELPERS);
    const base = await page2.evaluate(() => { S.scenes(false); return S.scenes(false); });
    ok(offMine.length === 7 && offMine.every((h, i) => h === base[i]), `off: with every switch off (even in the greened town), ${offMine.length} fixed-camera frames hash identically to the game without the module (${offMine.map(h => h.toString(16)).join(' ')})`);
    ok([2, 3, 4, 5, 6].every(i => onMine[i] === base[i]), 'on at stage 0: before the story has started the frames are the original frames, switches on or off (Oakhaven, clearing, quarry, Root-vault, Grove)');
    ok(onMine[0] !== base[0] && onMine[1] !== base[1], 'on at stage 5 / stage 4: the greened town is a different picture');
    ok(errors2.length === 0, 'off: the module-less page also loads without errors');
    await page2.close();

    // ------------------------------------------------------------------
    //  2. stages chosen by flags
    // ------------------------------------------------------------------
    const stages = await page.evaluate(() => {
      for (const k of GFX.FX) GFX[k] = false; GFX.greenStages = GFX.glassSpread = GFX.rootVeins = true; GFX.changed();
      const out = [];
      for (const n of ['s0', 's1', 's2', 's3', 's4', 's5']) {
        S.story(n); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5);
        if (n === 's4') G.escapeTimer = 300;
        S.tick(3, 0.1);
        const s = GREENING14.stats, m = G.map;
        out.push({ n, stage: GREENING14.stage(), amt: GREENING14.amountNow(), walls: s.wallsGreen, ground: s.groundGreen, decals: Object.keys(m.decals || {}).length, sig: S.sig(m) });
      }
      // each rung from its own flags only
      const f = (o) => { G.flags = o; return GREENING14.stage(); };
      const rungs = [f({}), f({ kaelen_met: true }), f({ coil_done: true }), f({ rite_ready: true }), f({ rite_started: true }), f({ bore_seated: true }), f({ greening: true }), f({ escaped: true }), f({ part3: true }), f({ part4: true }), f({ greening: true, escaped: true })];
      return { out, rungs };
    });
    const sg = stages.out;
    ok(stages.rungs.join() === '0,1,2,2,3,3,4,5,5,5,5', 'stages: stage() by flag (none 0, kaelen_met 1, coil_done/rite_ready 2, rite_started/bore_seated 3, greening 4, escaped/part3/part4 5): ' + stages.rungs);
    ok(sg[0].walls === 0 && sg[0].ground === 0 && sg[0].decals === sg[0].decals, 'stage 0: no growth at all');
    ok(sg.every((s, i) => s.stage === i), 'stage numbers 0..5 follow the six story states');
    ok(sg[1].ground > 0 && sg[1].walls >= 0 && sg[2].walls > sg[1].walls && sg[3].walls > sg[2].walls && sg[4].walls > sg[3].walls && sg[5].walls > sg[4].walls, `growth is monotonic in wall vines (${sg.map(s => s.walls).join(' < ')}) and moss/flowers (${sg.map(s => s.ground).join(' < ')})`);
    ok(sg[1].ground < sg[2].ground && sg[2].ground < sg[3].ground && sg[3].ground <= sg[4].ground && sg[4].ground < sg[5].ground, 'ground growth rises with every stage too');
    ok(new Set(sg.map(s => s.sig)).size === 6, 'every stage gives a different decal table');

    // the outer maps (the clearing's Hedge, the Greenhall, Greenroot) show only from stage 4
    const outer = await page.evaluate(() => {
      const o = {};
      for (const n of ['s3', 's4', 's5']) {
        S.story(n); if (n === 's4') G.escapeTimer = 40;
        for (const id of ['clearing', 'greenhall', 'greenroot']) { const m = G.maps[id]; S.stage(id, m.spawn.x, m.spawn.y, m.spawn.dir); S.tick(3, 0.1); o[n + id] = GREENING14.stats.wallsGreen; }
      }
      return o;
    });
    ok(outer.s3clearing === 0 && outer.s3greenhall === 0 && outer.s3greenroot === 0 && outer.s5clearing > 0 && outer.s5greenhall > 0 && outer.s5greenroot > 0 && outer.s4clearing <= outer.s5clearing, 'the clearing, the Greenhall and Greenroot grow only from the Greening on: ' + JSON.stringify(outer));

    // ------------------------------------------------------------------
    //  3. the creep: animates only while the escape timer runs
    // ------------------------------------------------------------------
    const creep = await page.evaluate(() => {
      S.story('s4'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5);
      const m = G.map, rec = [];
      for (const t of [300, 270, 225, 180, 135, 90, 45, 5]) { G.escapeTimer = t; S.tick(2, 0.1); rec.push({ t, sig: S.sig(m), walls: GREENING14.stats.wallsGreen, g: GREENING14.stats.groundGreen, amt: GREENING14.amountNow() }); }
      // frozen timer: ticking for a long while changes nothing
      G.escapeTimer = 150; S.tick(3, 0.1); const s0 = S.sig(m); S.tick(200, 0.1); const frozen = S.sig(m) === s0;
      // stage 5 and stage 3 never move
      S.story('s5'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); S.tick(3, 0.1); const a5 = S.sig(G.map); S.tick(100, 0.1); const still5 = S.sig(G.map) === a5;
      S.story('s3'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); S.tick(3, 0.1); const a3 = S.sig(G.map); S.tick(100, 0.1); const still3 = S.sig(G.map) === a3;
      // a death-and-wake resets the timer to 150 but the town never un-grows
      S.story('s4'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); G.escapeTimer = 40; S.tick(2, 0.1); const hi = GREENING14.amountNow(); G.escapeTimer = 150; S.tick(2, 0.1); const after = GREENING14.amountNow();
      // Reduce motion: coarse steps (fewer distinct tables across the same timer run)
      S.story('s4'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); GFX.reduceMotion = true;
      const calm = new Set(); for (let t = 300; t >= 0; t -= 3) { G.escapeTimer = t; S.tick(1, 0.1); calm.add(S.sig(G.map)); }
      GFX.reduceMotion = false; GREENING14.reset();
      const fine = new Set(); for (let t = 300; t >= 0; t -= 3) { G.escapeTimer = t; S.tick(1, 0.1); fine.add(S.sig(G.map)); }
      return { rec, frozen, still5, still3, hi, after, calm: calm.size, fine: fine.size };
    });
    ok(creep.rec.every((r, i) => i === 0 || (r.walls >= creep.rec[i - 1].walls && r.amt > creep.rec[i - 1].amt)) && creep.rec[7].walls > creep.rec[0].walls, `creep: as the timer runs 300 -> 5 s the vines and moss increase (walls ${creep.rec.map(r => r.walls)}; ground ${creep.rec.map(r => r.g)})`);
    ok(new Set(creep.rec.map(r => r.sig)).size === 8, 'creep: eight timer readings give eight different decal tables');
    ok(creep.frozen && creep.still5 && creep.still3, 'creep: nothing moves when the timer is not running down (frozen timer, stage 3, stage 5)');
    ok(creep.after >= creep.hi, `the growth is ratcheted: waking with the timer reset to 150 does not un-grow the town (${creep.hi} -> ${creep.after})`);
    ok(creep.calm >= 2 && creep.calm < creep.fine * 0.6, `Reduce motion: the creep moves in a few coarse steps (${creep.calm} tables) instead of ${creep.fine}`);

    // ------------------------------------------------------------------
    //  4. Light-glass spreads at the right events, and stays
    // ------------------------------------------------------------------
    const glass = await page.evaluate(() => {
      const o = {}; const flagOf = () => G.flags.p14g_gv | 0;
      S.story('s0', { kaelen_met: true }); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GFX.greenStages = false; GFX.changed();
      S.tick(5, 0.1); o.noEvent = { reach: GREENING14.S.reach, glass: GREENING14.stats.wallsGlass + GREENING14.stats.groundGlass, flag: flagOf() };
      // the Rite begins: the glass starts to spread from the bore
      G.flags.rite_started = true; const reaches = []; const c0 = GREENING14.stats.chimeCalls;
      for (let i = 0; i < 45; i++) { S.tick(1, 0.1); if (i % 5 === 0) reaches.push(+GREENING14.S.reach.toFixed(2)); }
      o.rite = { reaches, reach: GREENING14.S.reach, flag: flagOf(), chimes: GREENING14.stats.chimeCalls - c0, ground: GREENING14.stats.groundGlass, walls: GREENING14.stats.wallsGlass };
      G.flags.bore_seated = true; S.tick(80, 0.1); o.seat = { reach: GREENING14.S.reach, flag: flagOf(), ground: GREENING14.stats.groundGlass, walls: GREENING14.stats.wallsGlass };
      G.flags.greening = true; G.flags.bore_broken = true; S.tick(120, 0.1); o.brk = { reach: GREENING14.S.reach, flag: flagOf(), ground: GREENING14.stats.groundGlass, walls: GREENING14.stats.wallsGlass };
      // staying: leave the map and come back, even with the live module state thrown away
      S.stage('quarry', G.maps.quarry.spawn.x, G.maps.quarry.spawn.y, 0); S.tick(3, 0.1); o.quarry = { reach: GREENING14.S.reach, glass: GREENING14.stats.wallsGlass + GREENING14.stats.groundGlass };
      GREENING14.reset(); const c1 = GREENING14.stats.chimeCalls;
      S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GREENING14.tick(0); o.back = { reach: GREENING14.S.reach, anim: GREENING14.S.animating, glass: GREENING14.stats.wallsGlass + GREENING14.stats.groundGlass, chimes: GREENING14.stats.chimeCalls - c1 };
      // an old save at an earlier stage loaded into the same map: the glass steps back to that stage
      G.flags = Object.assign({}, S.FLAGS.s3, { p14g_gv: 1 }); S.tick(3, 0.1); o.earlier = { reach: GREENING14.S.reach };
      // the Grove
      S.story('s0'); S.stage('whispergrove', 24.5, 27.5, -1.57, 0.5); S.tick(5, 0.1); o.groveBefore = { reach: GREENING14.S.reach, glass: GREENING14.stats.wallsGlass + GREENING14.stats.groundGlass };
      G.flags.part3 = true; S.tick(70, 0.1); o.grove = { reach: GREENING14.S.reach, flag: G.flags.p14g_gg | 0, glass: GREENING14.stats.groundGlass + GREENING14.stats.wallsGlass };
      // Reduce motion: grown at once
      S.story('s0', { kaelen_met: true, rite_started: true }); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GFX.reduceMotion = true; GREENING14.tick(0.1); o.calm = { reach: GREENING14.S.reach, flag: flagOf() }; GFX.reduceMotion = false;
      // hostile flags: strings, negatives, huge, floats
      const hostile = [];
      for (const v of ['zzz', -5, 99, 1.5, NaN, null, {}, [3]]) { S.story('s0', { kaelen_met: true, rite_started: true, p14g_gv: v }); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GREENING14.tick(0.1); hostile.push([typeof v, GREENING14.S.reach >= 0 && GREENING14.S.reach <= 11]); }
      o.hostile = hostile.every(h => h[1]) && GREENING14.stats.errors === 0;
      // switch off: nothing grows
      S.story('s5'); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GFX.glassSpread = false; GFX.changed(); S.tick(5, 0.1); o.off = { reach: GREENING14.S.reach, glass: GREENING14.stats.wallsGlass + GREENING14.stats.groundGlass }; GFX.glassSpread = true; GFX.changed();
      return o;
    });
    ok(glass.noEvent.reach === 0 && glass.noEvent.glass === 0 && glass.noEvent.flag === 0, 'glass: nothing grows in the Root-vault before the Rite');
    const rr = glass.rite.reaches;
    ok(rr.length > 3 && rr[0] < rr[1] && rr.every((v, i) => i === 0 || v >= rr[i - 1]) && glass.rite.reach === 4 && glass.rite.flag === 1, `glass: the Rite spreads the crystals from the bore over seconds, cell by cell, to R 4 (${rr.join(' ')})`);
    ok(glass.rite.chimes >= 2 && glass.rite.ground > 6, `glass: a faint chime plays as it spreads (${glass.rite.chimes} chimes, ${glass.rite.ground} floor cells, ${glass.rite.walls} wall cells)`);
    ok(glass.seat.reach === 7 && glass.seat.flag === 2 && glass.seat.ground > glass.rite.ground && glass.seat.walls >= glass.rite.walls, `glass: seating the coil spreads it to R 7 (${glass.seat.ground} floor, ${glass.seat.walls} wall cells)`);
    ok(glass.brk.reach === 11 && glass.brk.flag === 3 && glass.brk.ground > glass.seat.ground && glass.brk.walls > glass.seat.walls, `glass: the Greening (the bit snapping) spreads it to R 11 (${glass.brk.ground} floor, ${glass.brk.walls} wall cells)`);
    ok(glass.quarry.reach === 0 && glass.quarry.glass === 0, 'glass: other maps (the quarry) are untouched');
    ok(glass.back.reach === 11 && !glass.back.anim && glass.back.chimes === 0 && glass.back.glass === glass.brk.ground + glass.brk.walls, 'glass: it persists, the grown place is grown on arrival with no replay and no chime');
    ok(glass.earlier.reach === 4, 'glass: loading an earlier save into the map steps the glass back to that stage (R 4)');
    ok(glass.groveBefore.reach === 0 && glass.groveBefore.glass === 0 && glass.grove.reach === 6 && glass.grove.flag === 1 && glass.grove.glass > 8, `glass: the Grove grows its Light-glass once part3 begins (${glass.grove.glass} cells)`);
    ok(glass.calm.reach === 4 && glass.calm.flag === 1, 'glass: Reduce motion grows it at once, with no animation');
    ok(glass.hostile, 'glass: hostile p14g_gv values (strings, negatives, huge, NaN, objects) are clamped and never throw');
    ok(glass.off.reach === 0 && glass.off.glass === 0, 'glass: switched off, nothing grows even in the finished story');

    // ------------------------------------------------------------------
    //  5. root veins: only near roots; pulse, steady, nearness
    // ------------------------------------------------------------------
    const veins = await page.evaluate(() => {
      const o = {};
      GFX.greenStages = GFX.glassSpread = false; GFX.rootVeins = true; GFX.changed();
      // where there are no roots, nothing
      S.story('s5'); S.stage('oakhaven', 23.5, 20.5, -1.57, 0.5); S.tick(3, 0.1); o.oak = GREENING14.stats.groundVein + GREENING14.stats.wallsVein;
      S.story('s0'); S.stage('quarry', G.maps.quarry.spawn.x, G.maps.quarry.spawn.y, G.maps.quarry.spawn.dir, 0.5); S.tick(3, 0.1); o.quarryEarly = GREENING14.stats.groundVein + GREENING14.stats.wallsVein;
      // the quarry shaft once Kaelen has spoken of the Root
      S.story('s1'); S.stage('quarry', G.maps.quarry.spawn.x, G.maps.quarry.spawn.y, G.maps.quarry.spawn.dir, 0.5); S.tick(3, 0.1);
      const rootsQ = SONGCRAFT.rootTargets(); o.quarry = { roots: rootsQ.length, ground: GREENING14.stats.groundVein, walls: GREENING14.stats.wallsVein };
      // the Root-vault bore: every vein cell lies within the radius of the root
      S.story('s1'); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); S.tick(3, 0.1);
      const m = G.map, e = GREENING14.entryFor(m), V = e.veins, R = GREENING14.CFG.vein.radius, rt = V.roots[0];
      const far = (list) => list.some(i => Math.hypot((i % m.w) + 0.5 - rt.x, ((i / m.w) | 0) + 0.5 - rt.y) > R + 0.8);
      o.vault = { roots: V.roots.length, ground: V.ground.idx.length, walls: V.walls.idx.length, outside: far(V.ground.idx) || far(V.walls.idx) };
      // pulse: sample the glow of one floor vein cell across 2.4 s
      const cell = V.ground.idx[0], cam = Engine.cam, samples = [];
      cam.x = rt.x + 2; cam.y = rt.y + 3;
      const sample = () => { const a = []; for (let i = 0; i < 24; i++) { S.tick(1, 0.1); a.push(GREENING14.S.gglow[cell]); } return a; };
      const pulse = sample();
      o.pulse = { min: Math.min(...pulse), max: Math.max(...pulse), a: pulse.slice(0, 12).map(v => +v.toFixed(2)) };
      // period: the same phase 1.2 s later is the same glow, the half-period is different
      const g0 = GREENING14.S.gglow[cell]; S.tick(12, 0.1); const g12 = GREENING14.S.gglow[cell]; S.tick(6, 0.1); const g18 = GREENING14.S.gglow[cell];
      o.period = { same: Math.abs(g0 - g12) < 0.03, diff: Math.abs(g0 - g18) > 0.05 };
      // steady modes
      const steady = (set) => { set(true); const a = []; for (let i = 0; i < 24; i++) { S.tick(1, 0.1); a.push(GREENING14.S.gglow[cell]); } set(false); return Math.max(...a) - Math.min(...a); };
      o.noFlash = steady(v => { GFX.noFlash = v; }); o.calm = steady(v => { GFX.reduceMotion = v; });
      // nearness: the glow climbs as you walk up to the root
      GFX.noFlash = true; const at = (d) => { cam.x = rt.x + d; cam.y = rt.y; S.tick(1, 0.1); return GREENING14.S.gglow[cell]; };
      o.near = { far: at(14), mid: at(7), close: at(2) }; GFX.noFlash = false;
      // switch off
      GFX.rootVeins = false; GFX.changed(); S.tick(3, 0.1); o.off = { decalsBase: G.map.decals === (GFX.decals ? G.map._decalsAll : null), gid: GREENING14.S.hasGround || GREENING14.S.hasEmit };
      GFX.rootVeins = true; GFX.changed(); S.tick(3, 0.1);
      // the Malting's Tuning Room floor, once the Grove is reached
      S.story('s5'); S.stage('malting', G.maps.malting.spawn.x, G.maps.malting.spawn.y, G.maps.malting.spawn.dir, 0.5); S.tick(3, 0.1); o.malting = { roots: SONGCRAFT.rootTargets().length, ground: GREENING14.stats.groundVein };
      return o;
    });
    ok(veins.oak === 0 && veins.quarryEarly === 0, 'veins: none in Oakhaven, and none at the quarry shaft before Kaelen has spoken of the Root');
    ok(veins.quarry.roots === 1 && veins.quarry.ground > 3 && veins.quarry.walls > 3, `veins: the quarry shaft grows veins once the Root is known (${veins.quarry.ground} floor, ${veins.quarry.walls} wall cells)`);
    ok(veins.vault.roots === 1 && veins.vault.ground > 5 && veins.vault.walls >= 3 && !veins.vault.outside, `veins: the Root-vault bore has veins, all within ${9} cells of the root (${veins.vault.ground} floor, ${veins.vault.walls} wall cells)`);
    ok(veins.pulse.max - veins.pulse.min > 0.12 && veins.period.same && veins.period.diff, `veins: they pulse slowly, period 1.2 s (glow ${veins.pulse.min.toFixed(2)}..${veins.pulse.max.toFixed(2)}: ${veins.pulse.a.join(' ')})`);
    ok(veins.noFlash < 1e-6 && veins.calm < 1e-6, `veins: No flashes and Reduce motion give a steady glow (swing ${veins.noFlash.toFixed(4)}, ${veins.calm.toFixed(4)})`);
    ok(veins.near.far < veins.near.mid && veins.near.mid < veins.near.close, `veins: brighter as you approach (${veins.near.far.toFixed(2)} < ${veins.near.mid.toFixed(2)} < ${veins.near.close.toFixed(2)})`);
    ok(veins.off.decalsBase && !veins.off.gid, 'veins: switched off, no decals and no floor pass');
    ok(veins.malting.roots === 1 && veins.malting.ground > 2, 'veins: the Malting\'s Tuning Room floor over the Chorister has them once the Grove is reached');

    // ------------------------------------------------------------------
    //  6. pixels: the picture actually contains the effects; walls glow in the dark
    // ------------------------------------------------------------------
    const px = await page.evaluate(() => {
      const o = {};
      GFX.greenStages = GFX.glassSpread = GFX.rootVeins = true; GFX.changed();
      const frameOf = () => S.frame(S.fixed());
      const diffCount = (a, b) => { let n = 0; for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) n++; return n; };
      // greened town vs the plain town (same camera)
      S.story('s5'); S.stage('oakhaven', 23.5, 24.5, 0, 0.5); S.tick(3, 0.1);
      GFX.greenStages = false; GFX.changed(); S.tick(1, 0.1); const plain = frameOf(); GFX.greenStages = true; GFX.changed(); S.tick(2, 0.1); const green = frameOf();
      o.townPx = diffCount(plain, green); o.townGround = GREENING14.stats.pixels;
      // veins in the vault: the floor pass draws, and a wall with a vein decal is brighter than without the glow pass
      S.story('s1'); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); S.tick(4, 0.1);
      GFX.rootVeins = false; GFX.changed(); S.tick(1, 0.1); const noVein = frameOf(); GFX.rootVeins = true; GFX.changed(); S.tick(3, 0.1); const vein = frameOf();
      o.veinPx = diffCount(noVein, vein);
      // a crystal wall in the dark vault: the glow pass adds light
      S.story('s5'); G.flags.p14g_gv = 3; S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); S.tick(3, 0.1);
      const e = GREENING14.entryFor(G.map), gl = e.glass; let cell = -1; for (const i of gl.walls.idx) { if (GREENING14.S.merged[i] && /g14_cry/.test(GREENING14.S.merged[i])) { cell = i; break; } }
      const x = cell % G.map.w, y = (cell / G.map.w) | 0; let cam = null;
      for (const [dx, dy, a] of [[0, 1, -Math.PI / 2], [0, -1, Math.PI / 2], [1, 0, Math.PI], [-1, 0, 0]]) if (G.map.cells[(y + dy * 2) * G.map.w + x + dx * 2] === null && G.map.cells[(y + dy) * G.map.w + x + dx] === null) { cam = [x + 0.5 + dx * 2, y + 0.5 + dy * 2, a]; break; }
      if (cam) { Engine.cam.x = cam[0]; Engine.cam.y = cam[1]; Engine.cam.dir = cam[2]; }
      const withGlow = frameOf(); const w0 = GREENING14.stats.wallPixels; GREENING14.S.wemit.fill(0); const noGlow = frameOf();
      let sumA = 0, sumB = 0; for (let i = 0; i < withGlow.fb.length; i++) { const p = withGlow.fb[i], q = noGlow.fb[i]; sumA += (p & 255) + ((p >> 8) & 255) + ((p >> 16) & 255); sumB += (q & 255) + ((q >> 8) & 255) + ((q >> 16) & 255); }
      o.glow = { wallPixels: w0, a: sumA, b: sumB, cam: !!cam };
      return o;
    });
    ok(px.townPx > 3000 && px.townGround > 500, `pixels: the greened town differs from the plain one in ${px.townPx} pixels (${px.townGround} on the floor)`);
    ok(px.veinPx > 300, `pixels: the veins are in the picture (${px.veinPx} pixels differ)`);
    ok(px.glow.cam && px.glow.wallPixels > 20 && px.glow.a > px.glow.b, `pixels: the wall glow pass lights crystals in the dark (${px.glow.wallPixels} pixels, brightness ${px.glow.b} -> ${px.glow.a})`);

    // ------------------------------------------------------------------
    //  7. perf: a 12-enemy scene, feature on vs off
    // ------------------------------------------------------------------
    const perf = await page.evaluate(() => {
      const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'passive'; return e; };
      const crowd = (x, y) => { const out = []; for (let i = 0; i < 12; i++) out.push(mk(['hound', 'proctor', 'legionnaire', 'quiet'][i % 4], x + (i % 4) * 1.2 - 1.8, y - 1.5 - Math.floor(i / 4) * 1.4)); return out; };
      const res = {};
      for (const [label, story, map, x, y, dir] of [['town', 's5', 'oakhaven', 23.5, 27.5, -1.57], ['vault', 's5', 'rootvault', 34.5, 12.5, -1.57]]) {
        S.story(story); S.stage(map, x, y, dir, 0.5); S.tick(3, 0.1);
        const ents = S.fixed().concat(crowd(x, y)), m = G.map, merged = m.decals, base = m._decalsAll || null;
        const frame = () => { Engine.setTime(5); Engine.render(ents, G.tod); };
        const setMode = (on) => { GFX.greenStages = GFX.glassSpread = GFX.rootVeins = on; m.decals = on ? merged : base; };
        // interleaved single frames in five rounds, so machine load hits both modes alike; each mode keeps its quietest round's median
        for (let i = 0; i < 30; i++) { setMode(i % 2 === 0); frame(); }
        const offMed = [], onMed = [], med = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
        for (let round = 0; round < 5; round++) {
          const offs = [], ons = [];
          for (let i = 0; i < 160; i++) { const on = i % 2 === 1; setMode(on); const t0 = performance.now(); frame(); (on ? ons : offs).push(performance.now() - t0); }
          offMed.push(med(offs)); onMed.push(med(ons));
        }
        setMode(true);
        GREENING14.profile = true; const pm = []; for (let i = 0; i < 80; i++) { frame(); pm.push(GREENING14.stats.ms); } GREENING14.profile = false; pm.sort((a, b) => a - b);
        res[label] = { off: Math.min(...offMed), on: Math.min(...onMed), pass: pm[pm.length >> 1], px: GREENING14.stats.pixels, wall: GREENING14.stats.wallPixels };
      }
      res.w = Engine.canvas.width; res.h = Engine.canvas.height; return res;
    });
    const dT = perf.town.on - perf.town.off, dV = perf.vault.on - perf.vault.off;
    console.log(`INFO perf (12-enemy scene, ${perf.w}x${perf.h}, interleaved medians): town ${perf.town.off.toFixed(2)} -> ${perf.town.on.toFixed(2)} ms (+${dT.toFixed(2)}; floor pass alone ${perf.town.pass.toFixed(2)} ms, ${perf.town.px} px); Root-vault ${perf.vault.off.toFixed(2)} -> ${perf.vault.on.toFixed(2)} ms (+${dV.toFixed(2)}; pass ${perf.vault.pass.toFixed(2)} ms, ${perf.vault.px} floor px, ${perf.vault.wall} wall px)`);
    ok(dT < 2.5 && dV < 2.5 && perf.town.pass < 1.5 && perf.vault.pass < 1.5, `perf: the fully greened town costs +${dT.toFixed(2)} ms and the grown, veined vault +${dV.toFixed(2)} ms per frame (pass alone ${perf.town.pass.toFixed(2)} / ${perf.vault.pass.toFixed(2)} ms; target ~1 ms for the pass; the frame delta also carries the shared server's noise, so its limit is 2.5)`);

    // ------------------------------------------------------------------
    //  8. Options, 640x400
    // ------------------------------------------------------------------
    const opts = await page.evaluate(() => {
      PRESETS.apply('medium'); G.state = 'panel'; renderAccessibilityMenu();
      const ids = ['g14-green', 'g14-glass', 'g14-veins'];
      const out = { btns: ids.map(id => { const b = document.getElementById(id); return b ? b.textContent + ':' + b.getAttribute('aria-pressed') : null; }) };
      document.getElementById('g14-glass').click(); out.glassOff = GFX.glassSpread === false; out.stored = JSON.parse(localStorage.getItem('octave.greening14.v1'));
      document.getElementById('g14-glass').click(); out.glassOn = GFX.glassSpread === true;
      PRESETS.apply('original'); out.orig = [GFX.greenStages, GFX.glassSpread, GFX.rootVeins].join(); PRESETS.apply('medium');
      localStorage.removeItem('octave.greening14.v1');
      closeModal(); G.state = 'panel'; return out;
    });
    ok(opts.btns.join() === 'On:true,On:true,On:true', 'Options > Graphics & access has three switches, default On: ' + opts.btns);
    ok(opts.glassOff && opts.glassOn && opts.stored && opts.stored.glassSpread === false, 'a row drives its GFX flag and persists (octave.greening14.v1)');
    ok(opts.orig === 'false,false,false', 'the Original preset leaves all three off');
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(250);
    const compact = await page.evaluate(() => {
      G.state = 'panel'; renderAccessibilityMenu(); const q = document.getElementById('modal-panel'); const o = { sw: q.scrollWidth, cw: q.clientWidth };
      const rowOk = ['g14-green', 'g14-glass', 'g14-veins'].every(id => { const b = document.getElementById(id); if (!b) return false; const r = b.getBoundingClientRect(), pr = q.getBoundingClientRect(); return r.right <= pr.right + 1 && r.left >= pr.left - 1; });
      closeModal(); G.state = 'panel'; return { o, rowOk };
    });
    ok(compact.o.sw <= compact.o.cw + 1 && compact.rowOk, 'Options rows at 640x400: no horizontal overflow (' + JSON.stringify(compact.o) + ')');
    await page.screenshot({ path: path.join(SHOT_DIR, 'compact-options.png') });
    // a real frame at 640x400, greened
    await page.evaluate(() => { GFX.greenStages = GFX.glassSpread = GFX.rootVeins = true; S.story('s5'); S.stage('oakhaven', 23.5, 24.5, 0, 0.5); S.tick(3, 0.1); G.state = 'play'; });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOT_DIR, 'compact-town.png') });
    await page.evaluate(() => { G.state = 'panel'; });
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(200);

    // ------------------------------------------------------------------
    //  9. screenshots (day / night, near / far, every stage) and errors
    // ------------------------------------------------------------------
    const SHOTS = process.env.SHOTS !== '0';
    if (SHOTS) {
      const views = [['sq', 23.5, 20.5, -1.57], ['hall', 23.5, 8.5, 0], ['lane', 24.5, 26.5, 3.14], ['sqn', 23.5, 27.5, -1.57]];
      for (const stg of ['s0', 's2', 's4', 's5']) for (const [lab, tod] of [['day', 0.5], ['night', 0.97]]) for (const [vl, x, y, d] of views) {
        await shot(`oak-${stg}-${lab}-${vl}`, `S.story('${stg}'); if ('${stg}' === 's4') G.escapeTimer = 150; S.stage('oakhaven', ${x}, ${y}, ${d}, ${tod}); S.tick(3, 0.1);`);
      }
      await shot('vault-rite', "S.story('s3', { p14g_gv: 0 }); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GREENING14.tick(0); S.tick(30, 0.1);");
      await shot('vault-seat', "S.story('s3', { bore_seated: true, p14g_gv: 1 }); S.stage('rootvault', 34.5, 11.5, -1.57, 0.5); GREENING14.tick(0); S.tick(60, 0.1);");
      await shot('vault-greening', "S.story('s4', { p14g_gv: 2 }); S.stage('rootvault', 34.5, 12.5, -1.57, 0.5); GREENING14.tick(0); S.tick(100, 0.1);");
      await shot('quarry-shaft', "S.story('s1'); const q = (() => { const m = G.maps.quarry; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.cells[y * m.w + x]; if (c && c.portal && c.portal.map === 'rootvault') return [x, y]; } })(); S.stage('quarry', q[0] + 0.5, q[1] + 3.5, -Math.PI / 2, 0.5); S.tick(8, 0.1);");
    }
    ok(errors.length === 0, 'no page errors or warnings from the module' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    ok(await page.evaluate(() => GREENING14.stats.errors === 0), 'the module recorded no internal errors');
  } finally {
    await browser.close();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
