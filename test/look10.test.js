// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:3841 node test/look10.test.js
// Optional: BASE_URL=http://127.0.0.1:<port> serves the branch this phase started from (phase10-picks);
//   when set, frames with the switches off are compared pixel for pixel against it.
//   SHOT_DIR=/some/dir   where screenshots go (default: os tmpdir)
// Covers js/look10.js (ground shadows, fight marks) and the Phase 10 colour grades in js/post.js.
// Frames are pinned: Engine.render is called by hand with an explicit entity list, the clock and the
// weather are fixed, so exact comparisons are meaningful. Uses the managed preview; never writes saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const SHOT_DIR = process.env.SHOT_DIR || path.join(os.tmpdir(), 'look10-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
let passed = 0, failed = 0;
function ok(cond, text) { if (cond) { passed++; console.log('PASS ' + text); } else { failed++; console.log('FAIL ' + text); } }
function check(fn, text) { try { fn(); passed++; console.log('PASS ' + text); } catch (e) { failed++; console.log('FAIL ' + text + ' -- ' + (e && e.message ? e.message.split('\n')[0] : e)); } }

async function bootPage(browser, url, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  // a seeded Math.random at load, so the sky's cloud noise and every other load-time roll is the same on every page
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(url);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Look Tester');
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

// in-page helpers shared by every section
const HELPERS = () => {
  const S = window.S = { cap: null, on: false };
  Engine.addPostHook(F => { if (S.on) S.cap = { fb: F.fb.slice(), dbuf: F.dbuf.slice(), mbuf: F.mbuf.slice(), w: F.w, h: F.h, horizon: F.horizon, dirX: F.dirX, dirY: F.dirY, planeX: F.planeX, planeY: F.planeY, cam: { x: F.cam.x, y: F.cam.y, z: F.cam.z }, relief: F.relief, bias: F.surfBias, gAt: F.gAt }; }, 99);
  // put the camera somewhere and silence everything else the game would draw
  S.stage = (map, x, y, dir, tod) => {
    loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = tod == null ? 0.5 : tod; Engine.cam.pitch = 0; Engine.cam.bob = 0;
    Weather.hold('clear'); GFX.reduceMotion = true;
  };
  S.mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'passive'; if (!e.name) e.name = 'Test ' + type; return e; };
  S.npc = (sprite, x, y, extra) => Object.assign({ kind: 'npc', id: 'tester', name: 'Tester', sprite, x, y, solid: true, radius: 0.3, lines: ['...'] }, extra || {});
  // one pinned frame of exactly these entities, with exactly these GFX flags
  S.frame = (ents, flags) => {
    // like GFX.plain() but without telling the listeners (switching fight marks off would, rightly, clear them)
    for (const k of GFX.FX) GFX[k] = false; GFX.viewDist = 1; GFX.particles = 1; Engine.setLook({ fogK: 1 });
    for (const k of (flags || [])) GFX[k] = true;
    Engine.setTime(5); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [196, 200, 214], flash: 0 });
    S.on = true; Engine.render(ents, G.tod); S.on = false;
    return S.cap;
  };
  S.diff = (a, b) => {   // pixels that differ between two captured frames
    const out = [];
    for (let i = 0; i < a.fb.length; i++) if (a.fb[i] !== b.fb[i]) out.push(i);
    return out;
  };
  S.lum = (px) => ((px & 255) * 77 + ((px >> 8) & 255) * 150 + ((px >> 16) & 255) * 29) >> 8;
  // world position of a ground pixel of a captured frame
  S.world = (f, i) => { const x = i % f.w, t = f.dbuf[i] - f.bias, cx = 2 * x / f.w - 1; return [f.cam.x + t * (f.dirX + f.planeX * cx), f.cam.y + t * (f.dirY + f.planeY * cx), t]; };
  S.hash = (fb) => { let h = 2166136261; for (let i = 0; i < fb.length; i++) { h ^= fb[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  S.stats = (f, idx) => ({ n: idx.length, nonGround: idx.filter(i => f.mbuf[i] !== 5).length });
  S.mean = (fb, w, h) => { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < w * h; i++) { r += fb[i] & 255; g += (fb[i] >> 8) & 255; b += (fb[i] >> 16) & 255; n++; } return [r / n, g / n, b / n]; };
  S.hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };
  S.sat = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3841';
  try {
    const { page, errors } = await bootPage(browser, URL);
    await page.evaluate(HELPERS);
    const shot = async (name) => page.locator('#game').screenshot({ path: path.join(SHOT_DIR, name + '.png') });

    // ------------------------------------------------------------------
    //  1. ground shadows on a flat map
    // ------------------------------------------------------------------
    const sh = await page.evaluate(() => {
      const o = {};
      S.stage('oakhaven', 23.5, 20.5, -1.57);
      const base = (ents) => { const a = S.frame(ents, []), b = S.frame(ents, ['groundShadows']); const idx = S.diff(a, b); return { a, b, idx }; };
      // a hound standing in the street
      const hound = S.mk('hound', 23.5, 18.2);
      let r = base([hound]);
      const dark = r.idx.filter(i => S.lum(r.b.fb[i]) < S.lum(r.a.fb[i])).length;
      let far = 0; for (const i of r.idx) { const [wx, wy] = S.world(r.b, i); far = Math.max(far, Math.hypot(wx - hound.x, wy - hound.y)); }
      o.hound = Object.assign(S.stats(r.b, r.idx), { dark, far: +far.toFixed(2) });
      // things that must not cast one
      const none = {};
      for (const [k, ent] of Object.entries({
        moth: S.mk('hushmoth', 23.5, 18.2), swarm: S.mk('mites', 23.5, 18.2), quiet: S.mk('quiet', 23.5, 18.2), dirge: S.mk('dirge', 23.5, 18.2),
        hearth: { kind: 'deco', sprite: 'hearth', x: 23.5, y: 18.2, scale: 0.9 },
        lamp: { kind: 'deco', sprite: 'lamp', x: 23.5, y: 18.2, scale: 0.7 },
        loot: { kind: 'item', item: 'tonic', sprite: 'loot', x: 23.5, y: 18.2, scale: 0.35 },
      })) { const q = base([ent]); none[k] = q.idx.length; }
      o.none = none;
      // people and a ghost-like Hollow
      const man = base([S.npc('townsman', 23.5, 18.2)]), hol = base([S.npc('hollow', 23.5, 18.2, { id: 'hollow' })]);
      const tot = (q) => q.idx.reduce((s, i) => s + S.lum(q.a.fb[i]) - S.lum(q.b.fb[i]), 0);
      o.npc = { n: man.idx.length, drop: tot(man) }; o.hollow = { n: hol.idx.length, drop: tot(hol) };
      // scale: the big golem's shadow covers more ground than the hound's
      const gol = base([S.mk('golem', 23.5, 18.2)]); o.golem = { n: gol.idx.length };
      const big = S.mk('hound', 23.5, 18.2); big.scale = 1.7;
      o.houndSame = { n: base([S.mk('hound', 23.5, 18.2)]).idx.length, big: base([big]).idx.length };
      // far away: faded
      const relMean = (q) => { let r = 0; for (const i of q.idx) r += 1 - S.lum(q.b.fb[i]) / Math.max(1, S.lum(q.a.fb[i])); return r / Math.max(1, q.idx.length); };
      const peak = (q) => { let m = 0; for (const i of q.idx) m = Math.max(m, 1 - S.lum(q.b.fb[i]) / Math.max(1, S.lum(q.a.fb[i]))); return m; };
      const farHound = base([S.mk('hound', 23.5, 12.5)]); o.farHound = { n: farHound.idx.length, peak: peak(farHound) };
      const nearHound = base([S.mk('hound', 23.5, 18.0)]); o.nearHound = { peak: peak(nearHound), n: nearHound.idx.length };
      return o;
    });
    ok(sh.hound.n > 40, `shadow: a hound in the street gets one (${sh.hound.n} px)`);
    ok(sh.hound.nonGround === 0, 'shadow: it only touches ground pixels, never the hound or a wall');
    ok(sh.hound.dark === sh.hound.n, 'shadow: every changed pixel is darker');
    ok(sh.hound.far < 0.9, `shadow: it stays within a pace of the hound's feet (${sh.hound.far})`);
    for (const k of Object.keys(sh.none)) ok(sh.none[k] === 0, `shadow: nothing under a ${k}`);
    ok(sh.npc.n > 30, `shadow: a townsman gets one (${sh.npc.n} px)`);
    ok(sh.hollow.n > 10 && sh.hollow.drop < sh.npc.drop * 0.7, `shadow: a Hollow's is faint (${sh.hollow.drop} vs ${sh.npc.drop})`);
    ok(sh.golem.n > 100 && sh.houndSame.big > sh.houndSame.n * 1.3, `shadow: scales with sprite scale (hound x1 ${sh.houndSame.n} px, x1.7 ${sh.houndSame.big} px; golem ${sh.golem.n} px)`);
    ok(sh.farHound.peak < sh.nearHound.peak, `shadow: fades with distance (peak darkening ${sh.farHound.peak.toFixed(3)} at 8 paces, ${sh.nearHound.peak.toFixed(3)} at 2.5)`);

    // walls and depth, flat path: a wall between camera and creature hides it
    const wall = await page.evaluate(() => {
      const o = {}; S.stage('oakhaven', 23.5, 20.5, 0);
      const m = G.map; let spot = null;
      const C = (x, y) => m.cells[y * m.w + x];
      for (let y = 4; y < m.h - 4 && !spot; y++) for (let x = 4; x < m.w - 8 && !spot; x++) {
        if (C(x - 1, y) || C(x - 2, y) || !C(x, y) || C(x, y).door || C(x, y).top) continue;
        let L = 1; while (L < 5 && C(x + L, y) && !C(x + L, y).door && !C(x + L, y).top) L++;
        if (L < 5 && !C(x + L, y) && !C(x + L + 1, y)) spot = { x, y, L };   // open, a run of tall wall, open again
      }
      o.spot = spot;
      loadMap('oakhaven', { x: spot.x - 2.5, y: spot.y + 0.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5;   // far enough back that the ground at the hound's feet is on screen from the standing eye (0.88)
      const cmp = (ent) => { const a = S.frame([ent], []), b = S.frame([ent], ['groundShadows']); return { f: b, idx: S.diff(a, b), spr: b.mbuf.reduce((n, v) => n + (v === 6 ? 1 : 0), 0) }; };
      const hid = cmp(S.mk('hound', spot.x + spot.L + 0.5, spot.y + 0.5)); o.behind = { shadow: hid.idx.length, sprite: hid.spr };
      const front = cmp(S.mk('hound', spot.x - 0.9, spot.y + 0.5)); o.front = { shadow: front.idx.length, sprite: front.spr };
      // beside the wall face: the disc reaches the wall, the wall pixels are untouched
      const edge = cmp(S.mk('hound', spot.x - 0.18, spot.y + 0.5)); o.edge = { n: edge.idx.length, nonGround: edge.idx.filter(i => edge.f.mbuf[i] !== 5).length };
      return o;
    });
    ok(wall.spot && wall.behind.shadow === 0 && wall.behind.sprite === 0, `shadow: a wall in between hides the creature and its shadow (wall at ${JSON.stringify(wall.spot)})`);
    ok(wall.front.shadow > 20, `shadow: the same hound in front of the wall casts one (${wall.front.shadow} px)`);
    ok(wall.edge.n > 10 && wall.edge.nonGround === 0, `shadow: against a wall face it never draws on the wall (${wall.edge.n} px, ${wall.edge.nonGround} on walls)`);

    // another creature in front: its pixels are never painted over
    const occl = await page.evaluate(() => {
      S.stage('oakhaven', 23.5, 20.5, -1.57);
      const back = S.mk('hound', 23.5, 17.0), front = S.mk('golem', 23.5, 18.4);
      const a = S.frame([back, front], []), b = S.frame([back, front], ['groundShadows']);
      const idx = S.diff(a, b); return { n: idx.length, onSprite: idx.filter(i => b.mbuf[i] === 6 || b.mbuf[i] === 8).length };
    });
    ok(occl.n > 40 && occl.onSprite === 0, `shadow: sprites in front keep their pixels (${occl.n} px changed, ${occl.onSprite} on sprites)`);

    // relief: slopes carry the shadow, a crest hides it
    const rel = await page.evaluate(() => {
      const o = {};
      S.stage('deepwoods', 27.5, 30.5, 0);
      let gAt = null; Engine.addPostHook(F => { gAt = F.gAt; }, 98); Engine.render([], G.tod);
      const m = G.map; let best = null;
      for (let y = 3; y < m.h - 3 && !best; y++) for (let x = 3; x < m.w - 3 && !best; x++) {
        if (m.cells[y * m.w + x]) continue;
        const gx = gAt(x + 1.5, y + 0.5, x + 1, y) - gAt(x - 0.5, y + 0.5, x - 1, y);
        if (Math.abs(gx) > 0.7) { let free = true; for (let dx = -6; dx <= 3; dx++) if (m.cells[y * m.w + x + dx]) free = false; if (free) best = { x, y }; }
      }
      o.best = best;
      const cx = best.x - 5.5, cy = best.y + 0.5;
      loadMap('deepwoods', { x: cx, y: cy, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5;
      const golem = S.mk('golem', best.x - 2.5, best.y + 0.9);
      const a = S.frame([golem], []), b = S.frame([golem], ['groundShadows']), idx = S.diff(a, b);
      o.golem = { n: idx.length, nonGround: idx.filter(i => b.mbuf[i] !== 5).length, relief: b.relief };
      // height check: every shadow pixel lies on ground, close to the creature
      let worstZ = 0, worstD = 0;
      for (const i of idx) { const [wx, wy, t] = S.world(b, i), y = (i / b.w) | 0; const zp = b.cam.z - (y - b.horizon) * t / b.h; worstZ = Math.max(worstZ, Math.abs(zp - gAt(wx, wy, wx | 0, wy | 0))); worstD = Math.max(worstD, Math.hypot(wx - golem.x, wy - golem.y)); }
      o.golem.worstZ = +worstZ.toFixed(3); o.golem.worstD = +worstD.toFixed(2);
      o.golem.slopeHere = +(Math.abs(gAt(golem.x + 0.4, golem.y, (golem.x + 0.4) | 0, golem.y | 0) - gAt(golem.x - 0.4, golem.y, (golem.x - 0.4) | 0, golem.y | 0))).toFixed(2);
      // the hound behind the crest: the slope in front of the camera hides its feet, one tile further back so the standing eye cannot see over
      const hound = S.mk('hound', best.x + 1.5, best.y + 0.5);
      const a2 = S.frame([hound], []), b2 = S.frame([hound], ['groundShadows']);
      o.crest = { shadow: S.diff(a2, b2).length, sprite: b2.mbuf.reduce((n, v) => n + (v === 6 ? 1 : 0), 0) };
      // the same kind of hound on open ground in view casts one
      const open = S.mk('hound', best.x - 3.2, best.y + 0.5);
      const a3 = S.frame([open], []), b3 = S.frame([open], ['groundShadows']); o.open = S.diff(a3, b3).length;
      return o;
    });
    ok(rel.best && rel.golem.relief && rel.golem.n > 40, `relief: a golem on the Deep Woods slope gets a shadow (${rel.golem.n} px, local slope ${rel.golem.slopeHere})`);
    ok(rel.golem.nonGround === 0 && rel.golem.worstD < 1.0 && rel.golem.worstZ < 0.13, `relief: it hugs the ground (worst height error ${rel.golem.worstZ}, worst reach ${rel.golem.worstD})`);
    ok(rel.crest.shadow === 0 && rel.crest.shadow < rel.open, `relief: the slope hides the feet of a creature behind the crest, so no shadow floats in the air (${rel.crest.sprite} sprite px still show, ${rel.crest.shadow} shadow px)`);
    ok(rel.open > 20, `relief: a hound on open ground in view casts one (${rel.open} px)`);

    // strong in the light, soft in the dark: same creature, noon and midnight; lit and dark rooms
    const light = await page.evaluate(() => {
      const o = {};
      const rel = (a, b, idx) => { let r = 0; for (const i of idx) r += 1 - S.lum(b.fb[i]) / Math.max(1, S.lum(a.fb[i])); return r / Math.max(1, idx.length); };
      for (const [k, tod] of [['noon', 0.5], ['night', 0.02]]) {
        S.stage('oakhaven', 23.5, 20.5, -1.57, tod);
        const e = S.mk('golem', 23.5, 18.2), a = S.frame([e], []), b = S.frame([e], ['groundShadows']), idx = S.diff(a, b);
        o[k] = { n: idx.length, rel: rel(a, b, idx) };
      }
      for (const [k, dark] of [['lit', false], ['dark', true]]) {
        S.stage('tavern', 8.5, 10.5, -1.57);
        const e = S.mk('hound', 8.5, 8.2), fl = dark ? ['darkInteriors'] : [];
        if (dark) GFX.darkInteriors = true;
        const a = S.frame([e], fl), b = S.frame([e], fl.concat(['groundShadows'])), idx = S.diff(a, b);
        o['room_' + k] = { n: idx.length, rel: rel(a, b, idx) };
      }
      return o;
    });
    ok(light.noon.n > 0 && light.noon.rel > light.night.rel, `shadow: darker in full light than at night (${light.noon.rel.toFixed(3)} vs ${light.night.rel.toFixed(3)})`);
    ok(light.room_lit.n > 0 && light.room_dark.rel <= light.room_lit.rel + 0.005, `shadow: no stronger in a dark room (${light.room_dark.rel.toFixed(3)} vs lit ${light.room_lit.rel.toFixed(3)})`);

    // ------------------------------------------------------------------
    //  2. off = the original frame
    // ------------------------------------------------------------------
    const med = ['softFog', 'mist', 'bloom', 'grade', 'decals', 'detail', 'scenery', 'grass', 'reflections'];
    const offSame = await page.evaluate((med) => {
      const o = {}; S.stage('clearing', 20.5, 28.5, -1.57);
      const crowd = [S.mk('hound', 20.5, 26), S.mk('golem', 22, 25), S.mk('legionnaire', 19, 25)];
      const plain = S.hash(S.frame(crowd, []).fb);
      const off = S.hash(S.frame(crowd, med).fb);
      const sOn = S.hash(S.frame(crowd, med.concat(['groundShadows'])).fb);
      o.plainStable = plain === S.hash(S.frame(crowd, []).fb);
      o.offStable = off === S.hash(S.frame(crowd, med).fb);
      o.shadowsChange = off !== sOn;
      S.frame(crowd, med.concat(['groundShadows', 'fightMarks']));   // flipped on, then off again: nothing left behind
      o.afterToggle = off === S.hash(S.frame(crowd, med).fb);
      o.hashes = { plain, off };
      return o;
    }, med);
    ok(offSame.plainStable && offSame.offStable && offSame.afterToggle, 'off: two renders with the switches off are identical, and toggling on then off leaves no trace');
    ok(offSame.shadowsChange, 'off: switching shadows on changes the frame');
    if (process.env.BASE_URL) {
      const base = await bootPage(browser, process.env.BASE_URL);
      await base.page.evaluate(HELPERS);
      const bh = await base.page.evaluate((med) => {
        const o = {}; S.stage('clearing', 20.5, 28.5, -1.57);
        const crowd = [S.mk('hound', 20.5, 26), S.mk('golem', 22, 25), S.mk('legionnaire', 19, 25)];
        o.plain = S.hash(S.frame(crowd, []).fb); o.off = S.hash(S.frame(crowd, med).fb); return o;
      }, med);
      ok(bh.plain === offSame.hashes.plain, `off: a plain frame is byte-identical to the base branch (${bh.plain})`);
      ok(bh.off === offSame.hashes.off, `off: a Medium-look frame in the Meadow (grade unchanged there) is byte-identical to the base branch (${bh.off})`);
      ok(base.errors.length === 0, 'base page had no errors');
    } else console.log('SKIP off vs base branch (set BASE_URL to compare against phase10-picks)');

    // ------------------------------------------------------------------
    //  3. colour grades per area, noon and night (the mean hue of a real frame)
    // ------------------------------------------------------------------
    const gr = await page.evaluate(() => {
      const o = {}, post = ['softFog', 'mist', 'bloom', 'grade'];
      const spots = { oakhaven: [23.5, 20.5, -1.57], whispergrove: [24.5, 27.5, -1.57], deepwoods: [27.5, 30.5, -1.57], tavern: [8.5, 10.5, 0], clearing: [20.5, 28.5, -1.57] };
      for (const [id, [x, y, dir]] of Object.entries(spots)) for (const [hn, tod] of [['noon', 0.5], ['night', 0.02]]) {
        S.stage(id, x, y, dir, tod);
        const p = S.frame([], []), g = S.frame([], post);
        const mp = S.mean(p.fb, p.w, p.h), mg = S.mean(g.fb, g.w, g.h);
        o[id + '_' + hn] = { hue: +S.hue(mg).toFixed(1), sat: +S.sat(mg).toFixed(3), rgb: mg.map(v => +v.toFixed(1)), plainRgb: mp.map(v => +v.toFixed(1)), lum: mg[0] * 0.3 + mg[1] * 0.59 + mg[2] * 0.11 };
      }
      return o;
    });
    const hueIn = (v, a, b) => v >= a && v <= b;
    const rb = (k) => gr[k].rgb[0] - gr[k].rgb[2];
    ok(hueIn(gr.oakhaven_noon.hue, 20, 48) && gr.oakhaven_noon.sat > 0.25, `grade: Oakhaven at noon is amber (hue ${gr.oakhaven_noon.hue}, sat ${gr.oakhaven_noon.sat})`);
    ok(gr.oakhaven_night.lum < gr.oakhaven_noon.lum * 0.4 && rb('oakhaven_night') < rb('oakhaven_noon') - 20, `grade: Oakhaven at night is dark (${gr.oakhaven_night.rgb}) and cooler than noon (r-b ${rb('oakhaven_night').toFixed(1)} vs ${rb('oakhaven_noon').toFixed(1)})`);
    ok(hueIn(gr.whispergrove_noon.hue, 175, 215) && gr.whispergrove_noon.sat > 0.2, `grade: Whisper-Grove at noon is cold teal (hue ${gr.whispergrove_noon.hue}, sat ${gr.whispergrove_noon.sat})`);
    ok(hueIn(gr.whispergrove_night.hue, 190, 235), `grade: Whisper-Grove at night stays teal-blue (hue ${gr.whispergrove_night.hue})`);
    ok(hueIn(gr.deepwoods_noon.hue, 270, 325) && gr.deepwoods_noon.sat > 0.15, `grade: the Deep Woods at noon are bruised violet (hue ${gr.deepwoods_noon.hue}, sat ${gr.deepwoods_noon.sat})`);
    ok(hueIn(gr.deepwoods_night.hue, 255, 310), `grade: the Deep Woods at night stay violet (hue ${gr.deepwoods_night.hue})`);
    ok(rb('tavern_noon') > 25, `grade: Oakhaven interiors are candle-amber (r-b ${rb('tavern_noon').toFixed(1)})`);
    ok(Math.abs(rb('clearing_noon') - (gr.clearing_noon.plainRgb[0] - gr.clearing_noon.plainRgb[2])) < 25, 'grade: areas left alone (the Meadow) keep their old grade');
    for (const k of ['oakhaven_noon', 'whispergrove_noon', 'deepwoods_noon']) ok(gr[k].lum > 45 && gr[k].lum < 200, `grade: ${k} keeps its brightness for readability (mean luma ${gr[k].lum.toFixed(0)})`);

    // ------------------------------------------------------------------
    //  4. fight marks
    // ------------------------------------------------------------------
    const mk = await page.evaluate(() => {
      const o = {};
      S.stage('oakhaven', 23.5, 20.5, -1.57);
      GFX.plain(); GFX.fightMarks = true; GFX.groundShadows = true; LOOK10.marks.clear();
      const hound = S.mk('hound', 22.7, 18.6), golem = S.mk('golem', 24.4, 18.4), leg = S.mk('legionnaire', 23.6, 17.2);
      G.ents.push(hound, golem, leg);
      let tt = 5;
      const render = () => { Engine.setTime(tt += 0.05); Engine.render(G.ents, G.tod); };
      render();   // baselines
      o.nothingYet = LOOK10.marks.total();
      const rr = Math.random; Math.random = () => 0.01;
      const swing = (e, n) => { Engine.cam.dir = Math.atan2(e.y - Engine.cam.y, e.x - Engine.cam.x); for (let i = 0; i < n; i++) { G.attack.t = 0; G.song.t = 0; attack('swing'); render(); } };
      const near = (e) => { Engine.cam.x = e.x - 0.8; Engine.cam.y = e.y + 0.9; };
      const kinds = () => LOOK10.marks.slots.filter(s => s.on).map(s => s.kind);
      near(hound); hound.hp = 18; swing(hound, 3); o.houndHit = { hp: hound.hp, kinds: kinds() };
      hound.hp = 1; swing(hound, 1); o.houndDead = { dead: hound.dead, kinds: kinds() };
      LOOK10.marks.clear(); render();
      near(golem); golem.hp = 52; swing(golem, 4); o.golemHit = { hp: golem.hp, kinds: kinds() };
      golem.hp = 1; swing(golem, 1); o.golemDead = { dead: golem.dead, kinds: kinds() };
      LOOK10.marks.clear(); render();
      near(leg); leg.hp = 30; swing(leg, 3); o.legHit = { kinds: kinds() };
      leg.hp = 1; swing(leg, 1); o.legDead = { dead: leg.dead, kinds: kinds() };
      Math.random = rr;
      // things that leave nothing: hit hard and kill them
      LOOK10.marks.clear();
      const ghosts = ['quiet', 'mites', 'hushmoth', 'drowned', 'dirge'].map((t, i) => S.mk(t, 21 + i * 0.7, 18.0));
      G.ents.push(...ghosts); render();
      for (const g of ghosts) { g.hp -= 3; render(); }
      for (const g of ghosts) { g.hp = 0; g.dead = true; g.hidden = true; render(); }
      o.ghostKinds = kinds();
      o.classify = { hollow: LOOK10.classify({ sprite: 'hollow', def: {}, type: 'x' }), quiet: LOOK10.classify(ghosts[0]), golem: LOOK10.classify(golem), leg: LOOK10.classify(leg), hound: LOOK10.classify(hound) };
      // a heavy blow lands on the player
      LOOK10.marks.clear(); const g2 = S.mk('golem', 23.5, 19.0); G.ents.push(g2); Engine.cam.x = 23.5; Engine.cam.y = 20.0; render();
      damagePlayer(9, g2.def.name); o.golemBlow = kinds();
      // songs: a burning one scorches, a shattering one cracks
      const song = (ef) => ({ effects: [ef], power: 4, freq: 528, cost: 0, noise: 0, stun: 0, bleed: 0, mendFat: 0, name: 'T', cadence: 'unison', hz: '528' });
      LOOK10.marks.clear(); const t1 = S.mk('hound', 23.5, 18.0); G.ents.push(t1); Engine.cam.x = 23.5; Engine.cam.y = 20.5; Engine.cam.dir = -Math.PI / 2; render();
      G.player.voice = 99; executeCustomSong(song('sear')); render(); o.searKinds = kinds();
      LOOK10.marks.clear(); const t2 = S.mk('hound', 23.5, 18.0); G.ents.push(t2); render();
      executeCustomSong(song('shatter')); render(); o.shatterKinds = kinds();
      // a heavy blunt weapon cracks the floor under what it hits (a mace; the roll is the module's own)
      LOOK10.marks.clear(); const t3 = S.mk('hound', 23.5, 19.2); t3.hp = 99999; G.ents.push(t3); render();
      const w0 = G.player.weapons.slice(), wi = G.player.weapon; G.player.weapons = ['mace']; G.player.weapon = 0;
      Math.random = () => 0.01; let swings = 0; Engine.cam.x = 23.5; Engine.cam.y = 20.2; Engine.cam.dir = -Math.PI / 2;
      for (; swings < 40 && !kinds().includes('crack'); swings++) { G.attack.t = 0; G.song.t = 0; attack('swing'); render(); }
      Math.random = rr; G.player.weapons = w0; G.player.weapon = wi;
      o.mace = { swings, kinds: kinds() };
      o.flagsSame = Object.keys(G.flags).filter(k => /look|l10|p10l|mark|shadow/i.test(k)).length === 0;
      for (const e of [hound, golem, leg, g2, t1, t2, t3, ...ghosts]) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
      return o;
    });
    ok(mk.nothingYet === 0, 'marks: none before anything happens');
    ok(mk.houndHit.kinds.length > 0 && mk.houndHit.kinds.every(k => k === 'blood'), `marks: blows on a hound leave small blood (${mk.houndHit.kinds})`);
    ok(mk.houndDead.kinds.includes('pool'), `marks: a hound falling leaves a stain (${mk.houndDead.kinds})`);
    ok(mk.golemHit.kinds.length > 0 && mk.golemHit.kinds.every(k => k === 'spark' || k === 'crack' || k === 'scorch'), `marks: a golem sparks, never bleeds (${mk.golemHit.kinds})`);
    ok(mk.golemDead.kinds.includes('scorch') && !mk.golemDead.kinds.includes('pool') && !mk.golemDead.kinds.includes('blood'), `marks: a destroyed golem leaves scorch (${mk.golemDead.kinds})`);
    ok(mk.legHit.kinds.every(k => k === 'spark') && mk.legDead.kinds.every(k => k === 'spark' || k === 'scorch'), `marks: a legionnaire's glass core does not bleed (${mk.legHit.kinds} / ${mk.legDead.kinds})`);
    ok(mk.ghostKinds.length === 0, `marks: the Quiet, swarms, moths, the drowned and Dirges leave nothing (${mk.ghostKinds})`);
    ok(mk.classify.hollow === 'none' && mk.classify.quiet === 'none' && mk.classify.golem === 'spark' && mk.classify.leg === 'spark' && mk.classify.hound === 'blood', `marks: classification ${JSON.stringify(mk.classify)}`);
    ok(mk.golemBlow.includes('crack'), `marks: a golem's blow cracks the floor where it lands (${mk.golemBlow})`);
    ok(mk.searKinds.includes('scorch') && !mk.searKinds.includes('blood'), `marks: a burning Song scorches (${mk.searKinds})`);
    ok(mk.shatterKinds.includes('crack'), `marks: a shattering Song cracks (${mk.shatterKinds})`);
    ok(mk.mace.kinds.includes('crack'), `marks: a mace cracks the floor under its target (after ${mk.mace.swings} swings)`);
    ok(mk.flagsSame, 'marks: G.flags is untouched');

    // appearance, cap, fade, map change, saves, switch
    const mk2 = await page.evaluate(() => {
      const o = {};
      S.stage('oakhaven', 23.5, 20.5, -1.57);
      GFX.plain(); LOOK10.marks.clear();
      // drawn: a blood mark in view changes only ground pixels, and only while the switch is on
      LOOK10.marks.add('blood', 23.5, 18.0, 0.3, 0);
      const a = S.frame([], []), b = S.frame([], ['fightMarks']), idx = S.diff(a, b);
      o.drawn = { n: idx.length, nonGround: idx.filter(i => b.mbuf[i] !== 5).length, darker: idx.filter(i => S.lum(b.fb[i]) < S.lum(a.fb[i])).length, redder: idx.filter(i => (b.fb[i] & 255) - ((b.fb[i] >> 16) & 255) > (a.fb[i] & 255) - ((a.fb[i] >> 16) & 255)).length };
      o.offSame = S.diff(a, S.frame([], [])).length === 0;
      o.kinds = {};
      for (const k of ['blood', 'pool', 'scorch', 'spark', 'crack']) { LOOK10.marks.clear(); LOOK10.marks.add(k, 23.5, 18.0, 0.35, 0); const f = S.frame([], ['fightMarks']); o.kinds[k] = S.diff(a, f).length; }
      // cap and fade
      LOOK10.marks.clear(); LOOK10.marks.tick(100);
      for (let i = 0; i < 60; i++) { LOOK10.marks.tick(100 + i * 0.01); LOOK10.marks.add('blood', 20 + (i % 10) * 0.6, 17 + ((i / 10) | 0) * 0.6, 0.15); }
      o.cap = { live: LOOK10.marks.live(), total: LOOK10.marks.total(), cap: LOOK10.marks.cap };
      const seqs = LOOK10.marks.slots.filter(s => s.on && s.dying < 0).map(s => s.seq);
      o.newestKept = seqs.length === 40 && Math.min(...seqs) > Math.max(...LOOK10.marks.slots.filter(s => s.on && s.dying >= 0).map(s => s.seq));
      // a fading mark is fainter than a fresh one
      LOOK10.marks.clear(); S.frame([], ['fightMarks']); const s1 = LOOK10.marks.add('pool', 23.5, 18.0, 0.4, 0);   // (the frame sets the module's clock)
      const full = S.frame([], ['fightMarks']); const fd = S.diff(a, full).reduce((t, i) => t + Math.abs(S.lum(full.fb[i]) - S.lum(a.fb[i])), 0);
      s1.dying = LOOK10.marks.now - 1.25;   // half way through its fade
      const half = S.frame([], ['fightMarks']); const hd = S.diff(a, half).reduce((t, i) => t + Math.abs(S.lum(half.fb[i]) - S.lum(a.fb[i])), 0);
      o.fade = { full: fd, half: hd };
      LOOK10.marks.tick(LOOK10.marks.now + 3); o.faded = LOOK10.marks.total();
      // wall marks ride the seeded decal table without touching it
      LOOK10.marks.clear(); GFX.decals = true; GFX.fightMarks = true; DECALS.sync(G.map); const shared = G.map._decalsAll, keys0 = Object.keys(shared).length;
      const cells = []; for (let i = 0; i < G.map.cells.length - 1 && cells.length < 3; i++) { const c = G.map.cells[i]; if (c && !c.door && !shared[i] && G.map.cells[i + 1] === null) cells.push(i); }
      const w = LOOK10.marks.addWall('crack', cells[0] % G.map.w, (cells[0] / G.map.w) | 0);
      o.wall = { added: !!w, mine: G.map.decals && G.map.decals[cells[0]], sharedClean: !shared[cells[0]] && Object.keys(shared).length === keys0, sharedIsOther: G.map.decals !== shared, live: LOOK10.marks.live() };
      // map change clears everything and restores the seeded table
      loadMap('tavern', { x: 8.5, y: 10.5, dir: 0 });
      o.cleared = { total: LOOK10.marks.total(), wallTable: Object.keys(LOOK10.marks.wall).length };
      loadMap('oakhaven', { x: 23.5, y: 20.5, dir: -1.57 });
      o.restored = { decals: G.map.decals === G.map._decalsAll, total: LOOK10.marks.total(), hasAll: !!G.map._decalsAll, dec: typeof G.map.decals };
      // never saved
      LOOK10.marks.add('blood', 23.5, 18.0, 0.3); LOOK10.marks.addWall('scorch', cells[1] % G.map.w, (cells[1] / G.map.w) | 0);
      const snap = JSON.stringify(snapshotGame());
      o.save = { l10: /_l10|look10|fightMark|"blood"|"scorch"|"crack"/i.test(snap), bytes: snap.length };
      // the switch: switching it off clears; off records nothing and the past does not come back
      GFX.fightMarks = false; GFX.changed(); o.afterOff = LOOK10.marks.total();
      const hound = S.mk('hound', 23.5, 18.0); G.ents.push(hound); S.frame([hound], []); hound.hp -= 5; S.frame([hound], []);
      o.recordedWhileOff = LOOK10.marks.total();
      S.frame([hound], ['fightMarks']); o.afterOn = LOOK10.marks.total();
      G.ents.splice(G.ents.indexOf(hound), 1);
      return o;
    });
    ok(mk2.drawn.n > 20 && mk2.drawn.nonGround === 0 && mk2.drawn.darker === mk2.drawn.n, `marks: a blood mark darkens ground pixels only (${mk2.drawn.n} px)`);
    ok(mk2.drawn.redder > mk2.drawn.n * 0.5, `marks: blood reads red-brown (${mk2.drawn.redder}/${mk2.drawn.n} px redder)`);
    ok(mk2.offSame, 'marks: with the switch off the frame is untouched');
    for (const k of Object.keys(mk2.kinds)) ok(mk2.kinds[k] > 8, `marks: ${k} draws (${mk2.kinds[k]} px)`);
    ok(mk2.cap.live === 40 && mk2.cap.total <= 52 && mk2.newestKept, `marks: capped at ${mk2.cap.cap} per map, the oldest are the ones evicted (live ${mk2.cap.live}, still fading ${mk2.cap.total - mk2.cap.live})`);
    ok(mk2.fade.half > 0 && mk2.fade.half < mk2.fade.full * 0.8, `marks: an evicted mark fades (full ${mk2.fade.full} -> half ${mk2.fade.half})`);
    ok(mk2.faded === 0, 'marks: faded marks are gone');
    ok(mk2.wall.added && mk2.wall.mine && mk2.wall.sharedClean && mk2.wall.sharedIsOther, `marks: wall cracks use the decal table through a private copy (${mk2.wall.mine})`);
    ok(mk2.cleared.total === 0 && mk2.cleared.wallTable === 0 && mk2.restored.decals && mk2.restored.total === 0, `marks: ${JSON.stringify([mk2.cleared, mk2.restored])} gone when the map changes; the seeded wall decals return`);
    ok(!mk2.save.l10, `marks: never saved (${mk2.save.bytes} byte save has no mark data)`);
    ok(mk2.afterOff === 0 && mk2.recordedWhileOff === 0 && mk2.afterOn === 0, 'marks: off records and shows nothing, and the past does not reappear when it is switched on');

    // ------------------------------------------------------------------
    //  5. presets, options, persistence
    // ------------------------------------------------------------------
    const pre = await page.evaluate(() => {
      const o = {};
      for (const p of ['original', 'low', 'medium', 'high']) { PRESETS.apply(p); o[p] = [GFX.groundShadows, GFX.fightMarks]; }
      PRESETS.apply('medium'); GFX.plain(); o.plain = [GFX.groundShadows, GFX.fightMarks];
      PRESETS.apply('medium'); o.inFX = GFX.FX.includes('groundShadows') && GFX.FX.includes('fightMarks'); o.current = PRESETS.current();
      return o;
    });
    check(() => assert.deepEqual(pre.original, [false, false]), 'presets: Original has both off');
    check(() => assert.deepEqual([pre.medium, pre.high], [[true, true], [true, true]]), 'presets: Medium and High have both on');
    check(() => assert.deepEqual(pre.plain, [false, false]), 'presets: GFX.plain() switches both off');
    ok(pre.inFX && pre.current === 'medium', 'presets: both flags belong to the preset system (Medium still reads as Medium)');

    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const opt = await page.evaluate(() => {
      const a = document.getElementById('look-shadows'), b = document.getElementById('look-marks'); if (!a || !b) return { missing: true };
      const o = { shadowsText: a.textContent, marksText: b.textContent, dup: document.querySelectorAll('#look-shadows').length };
      a.click(); o.afterClick = [GFX.groundShadows, a.textContent, a.getAttribute('aria-pressed')]; o.stored = localStorage.getItem('echoes-look10');
      b.click(); o.afterClick2 = [GFX.fightMarks, b.textContent];
      renderAccessibilityMenu(); o.dup2 = document.querySelectorAll('#look-shadows').length;
      return o;
    });
    ok(!opt.missing && opt.shadowsText === 'On' && opt.marksText === 'On' && opt.dup === 1 && opt.dup2 === 1, 'options: Ground shadows and Fight marks rows exist once, on by default (Medium)');
    ok(opt.afterClick && opt.afterClick[0] === false && opt.afterClick[1] === 'Off' && opt.afterClick[2] === 'false' && opt.afterClick2[0] === false, 'options: the buttons toggle the flags');
    ok(opt.stored && JSON.parse(opt.stored).groundShadows === false, `options: the choice is stored in localStorage (${opt.stored})`);
    await page.evaluate(() => { closeModal(); G.state = 'play'; PRESETS.apply('medium'); });
    ok(await page.evaluate(() => GFX.groundShadows === true && localStorage.getItem('echoes-look10') === '{"groundShadows":null,"fightMarks":null}'), 'options: choosing a preset takes over again (the stored override is dropped)');

    // ------------------------------------------------------------------
    //  6. performance: a 12-enemy scene
    // ------------------------------------------------------------------
    const perf = await page.evaluate(() => {
      const out = {};
      for (const [scene, args] of [['oakhaven', ['oakhaven', 23.5, 20.5, -1.57]], ['whispergrove', ['whispergrove', 24.5, 27.5, -1.57]]]) {
        S.stage(...args); PRESETS.apply('medium'); GFX.reduceMotion = true;
        const types = ['hound', 'proctor', 'legionnaire', 'golem'], crowd = [];
        const cam = Engine.cam; for (let i = 0; i < 12; i++) { const a = cam.dir + (i % 4 - 1.5) * 0.28, d = 2.5 + ((i / 4) | 0) * 1.6; const e = S.mk(types[i % 4], cam.x + Math.cos(a) * d, cam.y + Math.sin(a) * d); G.ents.push(e); crowd.push(e); }
        for (const e of G.ents) if (e.kind === 'enemy' && !crowd.includes(e)) e.hidden = true;
        const cfgs = { off: [false, false], shadows: [true, false], marks: [false, true], both: [true, true] };
        LOOK10.marks.clear(); Engine.setTime(5); Engine.render(G.ents, G.tod);
        for (let i = 0; i < 20; i++) LOOK10.marks.add(['blood', 'pool', 'scorch', 'spark', 'crack'][i % 5], cam.x + Math.cos(cam.dir + (i % 5 - 2) * 0.16) * (2 + (i % 4)), cam.y + Math.sin(cam.dir + (i % 5 - 2) * 0.16) * (2 + (i % 4)), 0.3);
        const times = {}; for (const k in cfgs) times[k] = [];
        const frames = 40, runs = 11;
        for (let r = 0; r < runs; r++) for (const k in cfgs) {
          [GFX.groundShadows, GFX.fightMarks] = cfgs[k];
          for (let i = 0; i < 4; i++) Engine.render(G.ents, G.tod);
          const t0 = performance.now(); for (let i = 0; i < frames; i++) Engine.render(G.ents, G.tod); times[k].push((performance.now() - t0) / frames);
        }
        const med = a => Math.min(...a), o = {};   // best of the runs: other processes on the machine only ever add time
        for (const k in cfgs) o[k] = +med(times[k]).toFixed(3);
        LOOK10.profile = true; GFX.groundShadows = GFX.fightMarks = true; let best = 1e9;
        for (let i = 0; i < 30; i++) { Engine.render(G.ents, G.tod); best = Math.min(best, LOOK10.stats.ms); }
        o.passMs = +best.toFixed(3); o.shadowsDrawn = LOOK10.stats.shadows; o.marksDrawn = LOOK10.stats.marks; LOOK10.profile = false;
        o.addShadows = +(o.shadows - o.off).toFixed(3); o.addMarks = +(o.marks - o.off).toFixed(3); o.addBoth = +(o.both - o.off).toFixed(3);
        out[scene] = o;
        for (const e of crowd) G.ents.splice(G.ents.indexOf(e), 1);
        LOOK10.marks.clear(); PRESETS.apply('medium');
      }
      return out;
    });
    console.log('PERF 12 enemies, 1x, ms per Engine.render (best of 9 runs of 40 frames):', JSON.stringify(perf));
    for (const [scene, o] of Object.entries(perf)) ok(o.addBoth < 6 && o.passMs < 4, `perf: ${scene}: shadows +${o.addShadows} ms, marks +${o.addMarks} ms, both +${o.addBoth} ms (pass alone ${o.passMs} ms, ${o.shadowsDrawn} shadows, ${o.marksDrawn} marks drawn)`);
    fs.writeFileSync(path.join(SHOT_DIR, 'perf.json'), JSON.stringify(perf, null, 2));

    // 2x render scale: the same code on a bigger frame
    const x2 = await page.evaluate(() => {
      PRESETS.apply('high'); S.stage('oakhaven', 23.5, 20.5, -1.57); const hound = S.mk('hound', 23.5, 18.2);
      const a = S.frame([hound], []), b = S.frame([hound], ['groundShadows']), idx = S.diff(a, b);
      const o = { scale: Engine.getScale(), n: idx.length, nonGround: idx.filter(i => b.mbuf[i] !== 5).length };
      PRESETS.apply('medium'); return o;
    });
    ok(x2.scale === 2 && x2.n > 150 && x2.nonGround === 0, `scale 2: the shadow follows (${x2.n} px at 2x)`);

    // ------------------------------------------------------------------
    //  7. screenshots
    // ------------------------------------------------------------------
    await page.evaluate(() => {
      S.stage('oakhaven', 23.5, 20.5, -1.57); PRESETS.apply('medium'); LOOK10.marks.clear();
      const mkE = (t, x, y) => { const e = S.mk(t, x, y); G.ents.push(e); return e; };
      window.__shots = [mkE('hound', 22.4, 18.2), mkE('golem', 24.3, 18.0), mkE('legionnaire', 23.3, 17.0)];
      for (const e of G.ents) if (e.kind === 'enemy' && !window.__shots.includes(e)) e.hidden = true;
      Engine.cam.pitch = 0; GFX.groundShadows = false; GFX.fightMarks = true; G.state = 'play';
    });
    const settle = async () => { await page.evaluate(() => { Engine.setTime(5); }); await page.waitForTimeout(250); };
    await settle(); await shot('look-shadows-off');
    await page.evaluate(() => { GFX.groundShadows = true; }); await settle(); await shot('look-shadows-on');
    // a fight: blood, sparks, scorch, a cracked floor
    await page.evaluate(() => {
      const [h, g, l] = window.__shots; const rr = Math.random; Math.random = () => 0.01; const cam = Engine.cam;
      const swing = (e, n) => { cam.dir = Math.atan2(e.y - cam.y, e.x - cam.x); for (let i = 0; i < n; i++) { G.attack.t = 0; G.song.t = 0; attack('swing'); Engine.render(G.ents, G.tod); } };
      Engine.render(G.ents, G.tod);
      cam.x = h.x - 0.8; cam.y = h.y + 0.9; h.hp = 18; swing(h, 3);
      cam.x = l.x - 0.8; cam.y = l.y + 0.9; l.hp = 30; swing(l, 3); l.hp = 1; swing(l, 1);
      cam.x = g.x - 0.8; cam.y = g.y + 0.9; swing(g, 3); Math.random = rr;
      damagePlayer(9, g.def.name);
      cam.x = 23.5; cam.y = 21.4; cam.dir = -1.57;
    });
    await settle(); await shot('look-fight-marks');
    ok(true, 'screenshots written to ' + SHOT_DIR);

    // ------------------------------------------------------------------
    //  8. 640x400 and a live run with everything on: no page errors
    // ------------------------------------------------------------------
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { G.state = 'play'; GFX.groundShadows = true; GFX.fightMarks = true; }); await settle(); await shot('look-640x400');
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const fit = await page.evaluate(() => {
      const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel, bad = [];
      for (const b of Array.from(panel.querySelectorAll('button:enabled'))) { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const q = b.getBoundingClientRect(); if (q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1 || q.width < 4) bad.push(b.id || b.textContent); }
      return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, bad, ours: ['look-shadows', 'look-marks'].map(id => document.getElementById(id).getBoundingClientRect().width > 20) };
    });
    ok(fit.panelX && fit.gridX && fit.docX && fit.bad.length === 0 && fit.ours.every(Boolean), `640x400: the Graphics & access menu has no horizontal overflow and our buttons are reachable ${JSON.stringify(fit)}`);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { closeModal(); G.state = 'panel'; renderMenu(); });
    ok(await page.locator('#modal-panel button:enabled').evaluateAll(bs => bs.every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })), 'options: the Options panel keeps every action on screen');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    await page.evaluate(() => { PRESETS.apply('medium'); S.stage('oakhaven', 23.5, 20.5, -1.57); GFX.reduceMotion = false; });
    await page.waitForTimeout(1200);
    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
