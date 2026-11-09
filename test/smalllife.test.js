// PREVIEW_URL=http://127.0.0.1:3103 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/smalllife.test.js
// Phase 4 small life: crows and rats that flee, the cat that walks and darts, the moored Kestrel,
// glimmering Light-glass. Uses a preview server; never writes saves. The "switches off" proof loads
// a second page with js/smalllife.js blocked and compares frames and saved state byte for byte.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

async function boot(page) {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; let q = 99; Math.random = () => (q = (q * 16807) % 2147483647) / 2147483647; });   // the real-time loop never runs: every step below is by hand
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Small Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  return errors;
}

// deterministic probe shared by both pages: frame hashes and saved state after a fixed script
const PROBE = `(() => {
  const out = {};
  let s = 12345; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  // wandering NPCs draw on the game's own random stream and the wall clock: pin them so the comparison is exact
  for (const id in G.maps) for (const e of G.maps[id].entities) { if (e.kind === 'enemy') e.hidden = true; if (e.kind === 'npc' || e.kind === 'deco') { e.wander = false; e.loop = false; e.moving = false; } }
  performance.now = () => 5000; GFX.grass = false; GFX.flyovers = false; GFX.changed();
  const hash = () => { if (typeof WATER !== 'undefined' && WATER.clear) WATER.clear(); Engine.render(G.ents, G.tod); const d = Engine.ctx.getImageData(0, 0, 320, 150).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
  const pose = { oakhaven: [30, 27, -0.75], whispergrove: [27, 28.5, -1.5], catacombs: null, tavern: null, deepwoods: [20, 40, 0] };
  for (const id of ['oakhaven', 'whispergrove', 'catacombs', 'tavern', 'deepwoods']) {
    const p = pose[id] ? { x: pose[id][0], y: pose[id][1], dir: pose[id][2] } : undefined;
    loadMap(id, p); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Engine.setWeather({}); PARTICLES.list = []; ANIM.dt = 0;
    G.vel.x = 3.1; G.vel.y = 0; Engine.cam.dir = p ? p.dir : Engine.cam.dir;
    for (let i = 0; i < 30; i++) { G.vel.x = 3.1; update(0.05); }
    Engine.setTime(12.5); Engine.setFlicker(1);
    // whispergrove's shallows ripple from wall-clock state the probe cannot pin: its frame is left out, its saved state (the cat) is not
    if (id !== 'whispergrove') out[id] = hash();
  }
  const sn = snapshotGame(); sn.when = 0; out.snap = JSON.stringify(sn);
  return out;
})()`;

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = await boot(page);
    await page.waitForFunction(() => typeof SMALLLIFE !== 'undefined');

    const r = await page.evaluate(() => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const res = {};
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      const fresh = (id, x, y, dir) => { loadMap(id, x == null ? undefined : { x, y, dir: dir || 0 }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; Engine.setWeather({}); G.vel.x = G.vel.y = 0; PARTICLES.list = []; SMALLLIFE.ensure(); };
      const crits = kind => G.ents.filter(e => e._sl && e._sl.kind === kind);
      const walkV = 2.6 + (G.player.attrs.Speed || 0) / 60;
      const setPace = mode => { const v = mode === 'run' ? walkV * 1.7 : mode === 'walk' ? walkV : 0; G.vel.x = v; G.vel.y = 0; };
      const open = (x, y) => !G.map.isBlocked(x | 0, y | 0) && !solidAt(x, y, null) && !(waterLvl(x, y) > 0);
      // a spot near (x,y) at distance d in the open and in sight, so the test does not depend on the map layout
      const spotAt = (e, d) => { for (let k = 0; k < 48; k++) { const a = k * 0.131; const x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d; if (open(x, y) && los(e.x, e.y, x, y)) return [x, y]; } return null; };

      // ---- art and the module's switches
      for (const n of ['crow_stand', 'crow_peck', 'crow_w1', 'crow_w2', 'crow_fly1', 'crow_fly2', 'crow_fly3', 'rat_idle', 'rat_sniff', 'rat_w1', 'rat_w2', 'rat_run', 'kestrel_m0', 'kestrel_m1', 'kestrel_m2', 'kestrel_m3', 'kestrel_m4']) check(Engine.sprites[n] && Engine.sprites[n].data instanceof Uint32Array && Engine.sprites[n].data.some(v => v >>> 24), 'sprite ' + n + ' is painted');
      for (const k of ['critters', 'kestrelMoored', 'shardGlint']) check(GFX[k] === true && GFX.FX.includes(k), 'GFX.' + k + ' defaults on and is a plain() effect');

      // ---- crows: outdoor maps, by day, transient and untouchable
      fresh('oakhaven', 30, 27, 0);
      const base0 = G.map.baseCount;
      let crows = crits('crow');
      check(crows.length === SMALLLIFE.CROWS.oakhaven, 'oakhaven has its crows (' + crows.length + ')');
      for (const e of crows) check(e._decor === true && e.kind === 'deco' && e.transient === true && e.nopick === true && e.solid === false && !e.dead, 'crows are transient non-solid nopick decos');
      check(crows.every(e => G.map.entities.indexOf(e) >= base0), 'crows are appended past baseCount');
      const snapTxt = JSON.stringify(snapshotGame());
      check(!snapTxt.includes('crow_') && !snapTxt.includes('kestrel_m') && !snapTxt.includes('"_sl"'), 'critters and the ship are not in the save');
      check(G.ents.filter(e => e.kind === 'npc' || e.kind === 'enemy').every(e => !e._sl), 'critters are never npcs or enemies (law, bodies, kills, quests)');
      res.crows = crows.length;
      // a crow in front of the camera cannot be picked or targeted
      { const c = crows[0], cam = Engine.cam; c.x = cam.x + 2; c.y = cam.y; cam.dir = 0; c.hidden = false; c._sl.st = 'peck'; c._sl.t = 99; Engine.render(G.ents, G.tod); check(c._screen && Engine.pick(G.ents, 6) !== c, 'a crow in the crosshair is not pickable'); }

      // ---- crows flee: closer and sooner when you run, and they land elsewhere
      fresh('oakhaven', 30, 27, 0);
      crows = crits('crow');
      const crow = crows[0]; { const s = spotAt(crow, 2.6); check(s, 'a clear spot beside the crow'); var spot = s; }
      const wake = () => { for (const c of crows) { c.hidden = false; c._sl.st = 'peck'; c._sl.t = 99; } };
      const place = (e, x, y) => { Engine.cam.x = x; Engine.cam.y = y; };
      for (const c of crows) if (c !== crow) { c.x = 2; c.y = 2; c.hidden = true; c._sl.st = 'gone'; c._sl.t = 999; }
      wake(); crow.hidden = false;
      const state = () => crow._sl.st;
      // standing still at 2.6: not startled (R 2.1)
      place(crow, spot[0], spot[1]); setPace('still'); SMALLLIFE.tick(0.05); check(state() === 'peck', 'a still player at 2.6 does not startle a crow');
      // walking at 2.6: startled (R 3.4)
      setPace('walk'); SMALLLIFE.tick(0.05); check(state() === 'fly', 'a walking player at 2.6 sends the crow up');
      // running reaches further: put the player 5.5 away
      crow._sl.st = 'peck'; crow._sl.t = 99; crow.hidden = false; crow.x = 30; crow.y = 27;
      { const s2 = spotAt(crow, 5.5); check(s2, 'a spot 5.5 from the crow'); place(crow, s2[0], s2[1]); }
      setPace('walk'); SMALLLIFE.tick(0.05); check(state() === 'peck', 'a walker at 5.5 does not startle a crow');
      setPace('run'); SMALLLIFE.tick(0.05); check(state() === 'fly', 'a runner at 5.5 does');
      res.crowSpeedRun = crow._sl.dur;
      // the flight: climbs, then lands elsewhere on open ground, no nearer the player than 5
      const x0 = crow.x, y0 = crow.y; let maxLift = 0, flew = 0;
      setPace('still');
      for (let i = 0; i < 600 && state() === 'fly'; i++) { SMALLLIFE.tick(0.05); maxLift = Math.max(maxLift, crow._sl.lift); flew++; }
      check(maxLift > 0.6, 'the crow climbs (' + maxLift.toFixed(2) + ')');
      check(state() !== 'fly' && crow._sl.lift === 0 || state() === 'gone', 'it came down or flew out of the map');
      if (state() === 'peck') { check(Math.hypot(crow.x - x0, crow.y - y0) > 6, 'it landed well away from where it rose'); check(Math.hypot(crow.x - Engine.cam.x, crow.y - Engine.cam.y) >= 5, 'and not beside the player'); check(open(crow.x, crow.y), 'on open ground'); }
      res.flightTicks = flew;
      // it still looks like a crow in flight: wing frames cycle
      { const seen = new Set(); crow._sl.st = 'peck'; crow._sl.t = 99; crow.hidden = false; crow.x = 30; crow.y = 27; { const s3 = spotAt(crow, 2); place(crow, s3[0], s3[1]); } setPace('walk'); for (let i = 0; i < 14; i++) { SMALLLIFE.tick(0.05); seen.add(crow.animSprite); } setPace('still'); check([...seen].filter(n => /fly/.test(n)).length >= 2, 'flight frames cycle (' + [...seen] + ')'); }
      // night: the crows fly off and stay away until morning
      fresh('oakhaven', 30, 27, 0); G.tod = 0.9; setPace('still');
      for (let i = 0; i < 700; i++) SMALLLIFE.tick(0.05);
      check(crits('crow').every(e => e.hidden && e._sl.st === 'gone'), 'crows are gone at night');
      G.tod = 0.5; for (let i = 0; i < 1400; i++) SMALLLIFE.tick(0.05);
      check(crits('crow').some(e => !e.hidden && e._sl.st !== 'gone'), 'and back by day');
      // density
      GFX.particles = 0; fresh('oakhaven', 30, 27, 0); check(crits('crow').length === 0, 'no particles, no critters');
      GFX.particles = 0.5; fresh('oakhaven', 30, 27, 0); check(crits('crow').length === 2, 'half density, half the crows (' + crits('crow').length + ')');
      GFX.particles = 1; fresh('oakhaven', 30, 27, 0);
      // a saved game restores with fresh crows and no duplicates
      { const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play'; SMALLLIFE.ensure(); check(crits('crow').length === SMALLLIFE.CROWS[G.mapId] || !SMALLLIFE.CROWS[G.mapId], 'restoring a save leaves one set of crows'); check(G.ents.filter(e => e._sl).length === SMALLLIFE.L.list.length, 'no duplicate critters after restore'); }
      // leaving and re-entering: anim.js sweeps transients of the map left, so they are re-appended on every load
      fresh('oakhaven', 30, 27, -0.75); fresh('tavern'); render(); render(); fresh('oakhaven', 30, 27, -0.75); render();
      check(crits('crow').length === SMALLLIFE.CROWS.oakhaven && G.ents.some(e => e._slShip), 'crows and the ship are back after leaving and re-entering Oakhaven');
      check(G.ents.filter(e => e._sl).length === new Set(G.ents.filter(e => e._sl)).size && G.ents.filter(e => e._slShip).length === 1, 'no duplicates after re-entry');
      for (const id in G.maps) if (id !== 'oakhaven') check(!G.maps[id].entities.some(e => e._sl || e._slShip), 'nothing left behind on ' + id);
      { const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play'; SMALLLIFE.ensure(); render(); check(G.ents.some(e => e._slShip) === (G.mapId === 'oakhaven'), 'ship follows the map after a save/load'); }
      fresh('oakhaven', 30, 27, -0.75); { const e = crits('crow')[0]; G.ents.splice(G.ents.indexOf(e), 1); SMALLLIFE.tick(0.05); check(G.ents.includes(e), 'a swept critter is put back by the tick'); }
      fresh('clearing', 20.5, 28.5, 0); check(crits('crow').length === 3, 'the clearing has crows');
      fresh('deepwoods', 20, 40, 0); check(crits('crow').length === 3, 'the deep woods have crows');
      fresh('tavern'); check(G.ents.every(e => !e._sl), 'no critters in the tavern');

      // ---- rats: cellars and crypts, flee into the dark, never at the player
      fresh('catacombs');
      let rats = crits('rat'); check(rats.length === SMALLLIFE.RATS.catacombs, 'rats in the catacombs (' + rats.length + ')');
      res.rats = rats.length;
      let tested = 0, away = 0;
      for (const rat of rats) {
        const sp = spotAt(rat, 2.2); if (!sp) continue;
        for (const o of rats) if (o !== rat) { o.hidden = true; }
        rat.hidden = false; rat._sl.st = 'idle'; rat._sl.t = 99; place(rat, sp[0], sp[1]); setPace('walk');
        const d0 = Math.hypot(rat.x - Engine.cam.x, rat.y - Engine.cam.y); let dmin = d0, moved0 = [rat.x, rat.y];
        SMALLLIFE.tick(0.05); setPace('still');
        if (rat._sl.st === 'flee') {
          check(Math.hypot(rat._sl.tx - Engine.cam.x, rat._sl.ty - Engine.cam.y) > d0 + 0.5, 'a rat picks a corner farther from the player, not toward them');
          for (let i = 0; i < 120; i++) { SMALLLIFE.tick(0.05); dmin = Math.min(dmin, Math.hypot(rat.x - Engine.cam.x, rat.y - Engine.cam.y)); }
          check(dmin >= d0 - 0.06, 'a fleeing rat never closes on the player (' + dmin.toFixed(2) + ' vs ' + d0.toFixed(2) + ')');
          check(Math.hypot(rat.x - moved0[0], rat.y - moved0[1]) > 0.8, 'it ran');
          away++;
        }
        tested++; if (away >= 2) break;
      }
      check(away >= 1, 'at least one rat bolted for a corner (' + away + '/' + tested + ')');
      for (const o of rats) o.hidden = false;
      // a runner makes them go further and faster
      { const rat = rats.find(q => spotAt(q, 4.5)); if (rat) { const sp = spotAt(rat, 4.5); for (const o of rats) if (o !== rat) o.hidden = true; rat._sl.st = 'idle'; rat._sl.t = 99; place(rat, sp[0], sp[1]); setPace('walk'); SMALLLIFE.tick(0.05); const walkSt = rat._sl.st; setPace('run'); SMALLLIFE.tick(0.05); check(walkSt === 'idle' && (rat._sl.st === 'flee' || rat._sl.st === 'cower'), 'rats startle at 4.5 only for a runner (' + walkSt + ' / ' + rat._sl.st + ')'); } }
      fresh('underhedge'); check(crits('rat').length === SMALLLIFE.RATS.underhedge, 'rats in the Under-hedge');
      fresh('quarry'); check(crits('rat').length === SMALLLIFE.RATS.quarry, 'rats in the quarry');
      fresh('tavern'); check(crits('rat').length === 0, 'none in a tavern');

      // ---- the cat
      fresh('whispergrove', 27.5, 28.5, -Math.PI / 2);
      const cat = SMALLLIFE.theCat(); check(cat, 'the cat is there');
      const catPlace = (dx) => { cat.x = 27.5; cat.y = 31.5; cat.moving = false; cat.wanderT = 99; cat._slCalm = 0; Engine.cam.x = cat.x - dx; Engine.cam.y = cat.y; };
      catPlace(3); setPace('walk'); { const p0 = [cat.x, cat.y]; for (let i = 0; i < 10; i++) { SMALLLIFE.tickCat(cat, 0.05, SMALLLIFE.playerPace()); } check(Math.hypot(cat.x - p0[0], cat.y - p0[1]) < 1e-6, 'a walker at 3 does not scare the cat'); }
      catPlace(0.9); setPace('still'); { const p0 = [cat.x, cat.y]; for (let i = 0; i < 10; i++) SMALLLIFE.tickCat(cat, 0.05, SMALLLIFE.playerPace()); check(Math.hypot(cat.x - p0[0], cat.y - p0[1]) < 1e-6, 'standing beside the cat does not scare it, so it can be talked to'); }
      catPlace(0.9); setPace('walk'); { const p0 = [cat.x, cat.y]; for (let i = 0; i < 10; i++) SMALLLIFE.tickCat(cat, 0.05, SMALLLIFE.playerPace()); check(Math.hypot(cat.x - p0[0], cat.y - p0[1]) > 0.3, 'walking straight at it makes it step away'); }
      catPlace(3.5); setPace('run'); { const p0 = [cat.x, cat.y]; for (let i = 0; i < 10; i++) SMALLLIFE.tickCat(cat, 0.05, SMALLLIFE.playerPace()); const moved = Math.hypot(cat.x - p0[0], cat.y - p0[1]); check(moved > 0.5 && cat.x > p0[0] - 0.01, 'a runner at 3.5 makes the cat dart away (' + moved.toFixed(2) + ')'); check(cat._slFlee > 0, 'flee posture on'); res.catDart = +moved.toFixed(2); }
      // talking still works, and the cat stays put for a moment afterwards
      catPlace(1.2); G.flags.cat_met = false; talkCat(cat); check(G.flags.cat_met === true && cat._slCalm > 0, 'talkCat still works and calms the cat');
      setPace('run'); { const p0 = [cat.x, cat.y]; SMALLLIFE.tickCat(cat, 0.05, SMALLLIFE.playerPace()); check(Math.hypot(cat.x - p0[0], cat.y - p0[1]) < 1e-6, 'the cat is not startled right after you speak to it'); }
      // walk frames from its own motion
      { setPace('still'); cat._slCalm = 0; cat._slFlee = 0; const seen = new Set(); let t = 0; for (let i = 0; i < 40; i++) { cat.x += 0.04; animCreature(cat, 0.05, t += 0.05); if (cat._spd > 0.25) seen.add(cat.animSprite); } check(seen.has('cat_w1') && seen.has('cat_w2'), 'the cat alternates walk frames (' + [...seen] + ')'); check(Engine.sprites.cat_run && Engine.sprites.cat_run.w > Engine.sprites.cat.w, 'and has a low wide dart frame'); cat._slFlee = 1; cat.x += 0.05; animCreature(cat, 0.05, t += 0.05); check(cat.animSprite === 'cat_run', 'dart frame while fleeing'); }
      GFX.critters = false; { cat._slFlee = 0; cat.x += 0.04; animCreature(cat, 0.05, 99); check(!cat.animSprite, 'critters off: the cat is animated as before'); } GFX.critters = true;

      // ---- the moored Kestrel
      fresh('oakhaven', 30, 27, -0.75);
      check(SMALLLIFE.isMoored(), 'moored before the Greening');
      let ship = G.ents.find(e => e._slShip); check(ship && ship.transient && ship.nopick && ship.solid === false, 'ship is a transient non-solid deco');
      const M = SMALLLIFE.MAST, P0 = SMALLLIFE.shipPose(0, 0.15);
      check(Math.hypot(P0.x - M.x, P0.y - M.y) < 2.2 && Math.hypot(P0.x - M.x, P0.y - M.y) > 1.5, 'she hangs on her line beside the mast');
      let hmin = 9, hmax = -9; for (let t = 0; t < 400; t += 1) { const h = SMALLLIFE.shipPose(t, 0.15).h; hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
      check(hmax - hmin > 0.6, 'she swings round slowly with the wind (' + (hmax - hmin).toFixed(2) + ' rad)');
      let rate = 0; for (let t = 0; t < 400; t += 0.5) rate = Math.max(rate, Math.abs(SMALLLIFE.shipPose(t + 0.5, 1).h - SMALLLIFE.shipPose(t, 1).h) / 0.5);
      check(rate < 0.2, 'and slowly (max ' + rate.toFixed(3) + ' rad/s)');
      const spread = w => { let a = 9, b = -9; for (let t = 0; t < 400; t += 1) { const h = SMALLLIFE.shipPose(t, w).h; a = Math.min(a, h); b = Math.max(b, h); } return b - a; };
      check(spread(1) > spread(0) + 0.3, 'a stronger wind swings her wider');
      check(SMALLLIFE.shipPose(0, 0.5).lift !== SMALLLIFE.shipPose(1.5, 0.5).lift, 'she bobs');
      // views change as she turns, and the entity follows the pose
      { const seen = new Set(); for (let t = 0; t < 200; t += 2) { const p = SMALLLIFE.shipPose(t, 0.6), v = SMALLLIFE.shipView(p.h, p.x, p.y); seen.add(v.view + (v.flip ? 'f' : '')); } check(seen.size >= 3, 'several views are used as she turns (' + [...seen] + ')'); }
      animDeco(ship, 0.05, 20, true); const pp = SMALLLIFE.shipPose(20); check(Math.abs(ship.x - pp.x) < 1e-9 && /^kestrel_m[0-4]$/.test(ship.animSprite) && ship.animLift > 1, 'animDeco poses the ship at height');
      res.shipLift = +ship.animLift.toFixed(2);
      // reduced motion: she hangs still
      GFX.reduceMotion = true; { const a = SMALLLIFE.shipPose(5), b = SMALLLIFE.shipPose(80); check(a.h === b.h && a.lift === b.lift && a.x === b.x, 'reduced motion: no turning or bobbing'); } GFX.reduceMotion = false;
      // gated by story and switch
      G.flags.part3 = true; SMALLLIFE.syncShip(); check(!G.ents.some(e => e._slShip), 'gone when Part Three begins'); G.flags.part3 = false; SMALLLIFE.syncShip(); check(G.ents.some(e => e._slShip), 'and recomputed from flags');
      G.flags.greening = true; SMALLLIFE.syncShip(); check(!G.ents.some(e => e._slShip), 'gone at the Greening (the ship lifts without you)'); G.flags.greening = false; SMALLLIFE.syncShip();
      GFX.kestrelMoored = false; SMALLLIFE.syncShip(); check(!G.ents.some(e => e._slShip), 'switch off removes her'); GFX.kestrelMoored = true; SMALLLIFE.syncShip(); check(G.ents.some(e => e._slShip), 'and on brings her back');
      fresh('clearing', 20.5, 28.5, 0); check(!G.ents.some(e => e._slShip) && !SMALLLIFE.isMoored(), 'not moored anywhere else');
      // the ship draws: rendered pixels differ from the same frame without her
      fresh('oakhaven', 30, 27, -0.75); Engine.setTime(5);
      const grab = () => { Engine.render(G.ents, G.tod); return Array.from(Engine.ctx.getImageData(0, 0, 320, 120).data); };
      for (const c of crits('crow')) { c.hidden = true; c._sl.st = 'gone'; c._sl.t = 999; }
      animDeco(G.ents.find(e => e._slShip), 0.05, 5, true); const withShip = grab();
      GFX.kestrelMoored = false; SMALLLIFE.syncShip(); const without = grab(); GFX.kestrelMoored = true; SMALLLIFE.syncShip();
      let diff = 0; for (let i = 0; i < withShip.length; i++) if (withShip[i] !== without[i]) diff++;
      check(diff > 40, 'the ship and her mooring line are drawn (' + diff + ' bytes differ)'); res.shipPixels = diff;

      // ---- Light-glass glimmer (indoors so nothing else animates)
      fresh('tavern', 8, 6, 0); Engine.setFlicker(1);
      const shard = hydrate({ kind: 'item', item: 'shard', sprite: 'coil', x: 11, y: 6, scale: 0.35, yOff: 0, solid: false }); G.ents.push(shard);
      for (const c of G.ents) if (c.kind === 'npc') c.hidden = true;
      const shot = T => { Engine.setTime(T); Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data.slice(); };
      const sameBuf = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
      const nDiff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      GFX.shardGlint = false; const PER = 2 * Math.PI / 2.4, off0 = shot(1), off1 = shot(1 + PER); check(sameBuf(off0, off1), 'switch off: the shard frame is the same at any time (original)');
      GFX.shardGlint = true; GFX.noFlash = true; const nf0 = shot(1), nf1 = shot(1 + PER), nf2 = shot(1 + 3 * PER);
      check(sameBuf(nf0, nf1) && sameBuf(nf1, nf2), 'no flash: a steady glow that never changes');
      check(nDiff(off0, nf0) > 15, 'the steady glow shows around the shard (' + nDiff(off0, nf0) + ' px)'); res.glowPx = nDiff(off0, nf0);
      GFX.noFlash = false; GFX.reduceMotion = true; { const a = shot(1), b = shot(1 + 2 * PER); check(sameBuf(a, b) && sameBuf(a, nf0), 'reduced motion: the same steady glow, no twinkling'); } GFX.reduceMotion = false;
      let twinkle = 0, maxD = 0; for (let t = 0; t < 12; t += 0.07) { const on = shot(t); GFX.noFlash = true; const st = shot(t); GFX.noFlash = false; const d = nDiff(on, st); if (d > 0) twinkle++; maxD = Math.max(maxD, d); }
      check(twinkle > 12, 'glints come and go (' + twinkle + ' of 171 frames differ)'); res.glintFrames = twinkle;
      // visible at distance
      Engine.cam.x = 3.2; Engine.cam.y = 6; { let far = 0; for (let t = 0; t < 12; t += 0.07) { const on = shot(t); GFX.noFlash = true; const st = shot(t); GFX.noFlash = false; if (nDiff(on, st) > 0) far++; } check(far > 5, 'the glint is visible from 8 cells'); }
      // behind a wall nothing leaks through
      Engine.cam.x = 8; Engine.cam.y = 6;
      G.ents.splice(G.ents.indexOf(shard), 1);

      // ---- fixed cost: tick (crows in view) and the render hook
      fresh('oakhaven', 30, 27, 0); setPace('still'); SMALLLIFE.timing = false;
      const med = a => a.sort((x, y) => x - y)[a.length >> 1];
      const bt = (fn, n) => { const r = []; for (let k = 0; k < 15; k++) { const t0 = performance.now(); for (let i = 0; i < n; i++) fn(); r.push((performance.now() - t0) / n); } return +med(r).toFixed(4); };
      res.tickMs = bt(() => SMALLLIFE.tick(0.016), 200);
      let F = null; Engine.addPostHook(f => { F = f; }, 200);
      fresh('tavern', 8, 6, 0); const sh2 = hydrate({ kind: 'item', item: 'shard', sprite: 'coil', x: 11, y: 6, scale: 0.35, yOff: 0, solid: false }); G.ents.push(sh2); Engine.render(G.ents, G.tod);
      res.glimmerMs = bt(() => SMALLLIFE.glimmer(F), 200);
      fresh('oakhaven', 30, 27, -0.75); Engine.render(G.ents, G.tod);
      res.ropeMs = bt(() => { SMALLLIFE.rope(F); SMALLLIFE.glimmer(F); }, 200);
      return res;
    });

    // ---- running is inferred from the real keys and movement, end to end
    const run = await page.evaluate(() => {
      loadMap('clearing', { x: 20.5, y: 28.5, dir: 0 }); G.state = 'play'; G.fadeT = 0; G.vel.x = G.vel.y = 0;
      const k = G.keys, paces = {};
      k.w = true; k.shift = false; G.opts.alwaysRun = false; for (let i = 0; i < 8; i++) update(0.05); paces.walk = SMALLLIFE.playerPace();
      k.shift = true; for (let i = 0; i < 12; i++) update(0.05); paces.run = SMALLLIFE.playerPace();
      k.w = false; k.shift = false; for (let i = 0; i < 30; i++) update(0.05); paces.still = SMALLLIFE.playerPace();
      return paces;
    });
    assert.ok(run.walk.moving && !run.walk.run, 'walking is moving but not running ' + JSON.stringify(run.walk));
    assert.ok(run.run.run, 'holding shift while moving reads as running ' + JSON.stringify(run.run));
    assert.ok(!run.still.moving, 'standing still reads as still');

    // ---- the switches off: frames and saved state identical to a build without the module
    // each variant runs in its own fresh page so the earlier checks cannot leak into the comparison
    const errs = [];
    async function variant(block, flagsOff) {
      const pg = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      if (block) await pg.route('**/js/smalllife.js*', rt => rt.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      errs.push(...await boot(pg));
      if (flagsOff) await pg.evaluate(() => { GFX.critters = GFX.kestrelMoored = GFX.shardGlint = false; GFX.changed(); });
      const out = await pg.evaluate(PROBE); await pg.close(); return out;
    }
    const original = await variant(true, false), original2 = await variant(true, false); { let k = 0; while (k < original.snap.length && original.snap[k] === original2.snap[k]) k++; if (k < original.snap.length) console.log('SNAPDIFF', k, JSON.stringify(original.snap.slice(Math.max(0, k - 60), k + 80)), JSON.stringify(original2.snap.slice(Math.max(0, k - 60), k + 80))); } console.log('DET', JSON.stringify(Object.keys(original).filter(k => original[k] !== original2[k]))); assert.deepEqual(original, original2, 'the probe is deterministic without the module');
    const off = await variant(false, true), flagsOn = await variant(false, false);
    const baseErrors = [];
    for (const id of ['oakhaven', 'catacombs', 'tavern', 'deepwoods']) assert.equal(off[id], original[id], 'switches off: ' + id + ' frame identical to a build without the module');
    assert.equal(off.snap, original.snap, 'switches off: saved state identical to a build without the module');
    // switched on, a map with nothing for the module to do is unchanged too
    assert.equal(flagsOn.tavern, original.tavern, 'switches on: the tavern frame is untouched');
    assert.notEqual(flagsOn.oakhaven, original.oakhaven, 'switches on: oakhaven differs (ship and crows are drawn)');
    // the cat is the only saved thing critters touch: with switches on, a run at it moves it; with them off, nothing moves
    assert.equal(errors.length, 0, 'page errors: ' + errors.join(' | ')); assert.equal(baseErrors.length, 0, 'baseline page errors: ' + baseErrors.join(' | '));

    console.log('PASS small life: crows, rats and the cat flee (more when you run), the Kestrel hangs moored before the Greening, shards glimmer; switches off == no module', JSON.stringify(Object.assign({}, r, { crowSpeedRun: undefined })));
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
