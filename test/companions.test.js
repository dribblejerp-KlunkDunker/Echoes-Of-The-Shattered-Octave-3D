// PREVIEW_URL=http://127.0.0.1:3101 PLAYWRIGHT_MODULE=/path/to/playwright node test/companions.test.js
// Phase 4 companions: hit reactions, injury limp, Kaelen's chest-hold + Root-note hum (one ramp),
// Lyra's singing rings, camp sharpening / warming hands, and "switch off = original game state".
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof COMPANIONS_FX !== 'undefined', null, { timeout: 120000 });
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Companion Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const out = {}; const check = (ok, text) => { if (!ok) throw new Error(text); };
      const FX = COMPANIONS_FX, rnd = () => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      G.flags.part4 = true; GFX.companionLife = true; GFX.reduceMotion = false; GFX.noFlash = false; GFX.particles = 1;
      const frozen = () => { Engine.setWeather({}); if (typeof PARTICLES !== 'undefined') PARTICLES.list = []; ANIM.dt = 0; };
      const join = (id, x, y, dir) => {
        G.dead = false; loadMap('deepwoods', { x, y, dir }); G.state = 'play'; G.fadeT = 0;
        G.party = null; partyJoin(id); const e = partyEnt(); e.x = x + 1.2 * Math.cos(dir); e.y = y + 1.2 * Math.sin(dir);
        G.party.x = e.x; G.party.y = e.y; G.party.order = 'wait'; return e;
      };
      const step = (e, n, dt) => { for (let i = 0; i < n; i++) { ANIM.T += dt; animCreature(e, dt, ANIM.T); } };

      // ---- 1. Kaelen's chest-hold and hum are one ramp
      let e = join('kaelen', 27.5, 38.0, Math.PI / 2); const P = G.party, max = partyMax('kaelen');
      const spBase = Engine.sprites.kaelen, sp = FX.chestSprite();
      check(sp && sp !== spBase && sp.w === spBase.w && sp.h === spBase.h, 'the chest-holding sprite exists');
      let diff = 0; for (let i = 0; i < sp.data.length; i++) if (sp.data[i] !== spBase.data[i]) diff++;
      check(diff > 150, 'the pose really repaints the arm (' + diff + ' pixels)');
      P.hp = max; FX.sync(5); step(e, 5, 0.016);
      check(FX.state.chest === 0 && e.animSprite !== 'kaelen_chest', 'healthy: no pose');
      P.hp = max * 0.2; const seq = [];
      for (let i = 0; i < 20; i++) { FX.sync(0.1); step(e, 1, 0.016); seq.push([FX.state.chest > 0, e.animSprite === 'kaelen_chest', FX.state.hum > 0, (Audio_.hums['kaelen-root'] || 0) > 0]); }
      check(seq.every(s => s[0] === s[1] && s[1] === s[2]), 'pose and hum rise together');
      check(FX.state.chest === 1 && FX.state.hum > 0.5, 'ramp reaches full (' + FX.state.chest + '/' + FX.state.hum + ')');
      out.audioHumLive = Audio_.ready ? Audio_.hums['kaelen-root'] : 'audio not started';
      if (Audio_.ready) check(Audio_.hums['kaelen-root'] > 0.3, 'Audio_.hums reports the hum');
      const stopSeq = (why, prep) => {
        P.hp = max * 0.2; FX.sync(5); prep(); const s = [];
        for (let i = 0; i < 40; i++) { FX.sync(0.1); const ee = partyEnt() || e; step(ee, 1, 0.016); s.push([ee.animSprite === 'kaelen_chest', FX.state.hum > 0, FX.state.chest > 0]); }
        const last = s[s.length - 1]; check(!last[0] && !last[1] && !last[2], why + ': both stop (' + JSON.stringify(last) + ')');
        check(s.every(x => x[0] === x[1] || !partyEnt()), why + ': in step');
        if (Audio_.ready) check((Audio_.hums['kaelen-root'] || 0) < 0.01, why + ': audio hum dies away');
      };
      stopSeq('recovered', () => { P.hp = max; });
      e = join('kaelen', 27.5, 38.0, Math.PI / 2); stopSeq('downed', () => { G.party.downed.kaelen = true; });
      e = join('kaelen', 27.5, 38.0, Math.PI / 2); stopSeq('paused', () => { G.state = 'panel'; });
      G.state = 'play';
      e = join('kaelen', 27.5, 38.0, Math.PI / 2); G.party.hp = max * 0.2; FX.sync(5); check(FX.state.hum > 0, 'hum before map change');
      loadMap('oakhaven'); FX.sync(0.3); FX.sync(0.3); check(FX.state.hum === 0 && FX.state.chest === 0, 'map change stops pose and hum');
      loadMap('deepwoods', { x: 27.5, y: 38, dir: 1.5 }); G.state = 'play';
      e = join('lyra', 27.5, 38.0, Math.PI / 2); G.party.hp = 1; FX.sync(5); check(FX.state.hum === 0, 'Lyra low health: no Root-note hum');
      // switch off: no pose, no hum
      e = join('kaelen', 27.5, 38.0, Math.PI / 2); G.party.hp = max * 0.2; GFX.companionLife = false; FX.sync(5); step(e, 3, 0.016);
      check(FX.state.chest === 0 && FX.state.hum === 0 && e.animSprite !== 'kaelen_chest', 'switch off: no pose, no hum'); GFX.companionLife = true;

      // ---- 2. hit reactions, from G.party.hp
      e = join('kaelen', 27.5, 38.0, Math.PI / 2); G.party.order = 'follow'; Math.random = rnd();
      const foe = hydrate({ kind: 'enemy', type: 'hound', x: e.x + 0.6, y: e.y }); G.ents.push(foe); foe.state = 'chase'; foe.alertT = 9; foe.stun = 0;
      e.hurtT = 0; const before = G.party.hp; let hits = 0;
      for (let i = 0; i < 40 && !FX.state.hits; i++) { foe.state = 'chase'; foe.x = e.x + 0.6; foe.y = e.y; foe.hp = foe.def.hp; partyTick(0.05); }
      check(FX.state.hits > 0 && G.party.hp < before && e._cHit > 0, 'a hit on the companion starts a flinch (' + FX.state.hits + ')');
      step(e, 1, 0.016); check(e.animHurt > 0.5 && (Math.abs(e.animSkew) > 0.04 || /_p20flinch/.test(e.animSprite || '')), 'flinch: red tint and a lurch or the painted flinch frame (' + e.animHurt.toFixed(2) + '/' + e.animSkew.toFixed(3) + ')');
      GFX.noFlash = true; e._cHit = 0.3; step(e, 1, 0.016); check(e.animHurt === 0, 'No flash: no red tint'); GFX.noFlash = false;
      GFX.reduceMotion = true; e._cHit = 0.3; const calmSkew = (step(e, 1, 0.016), Math.abs(e.animSkew)); GFX.reduceMotion = false; e._cHit = 0.3; const fullSkew = (step(e, 1, 0.016), Math.abs(e.animSkew));
      check(calmSkew < fullSkew, 'reduced motion calms the flinch (' + calmSkew.toFixed(3) + ' < ' + fullSkew.toFixed(3) + ')');
      G.ents.splice(G.ents.indexOf(foe), 1);

      // ---- 3. injury stoop and limp
      const walk = (hpFrac) => {
        e = join('kaelen', 27.5, 38.0, Math.PI / 2); G.party.hp = max * hpFrac; FX.state.chest = 0; GFX.companionLife = true;
        e._phase = 0; e._spd = 0; const lifts = [], skews = [], poses = {}; let sy = 0;
        for (let i = 0; i < 160; i++) { e.x += 0.012; ANIM.T += 0.016; animCreature(e, 0.016, ANIM.T); if (i > 40) { lifts.push(e.animLift); skews.push(e.animSkew); sy += e.animSY; if (/_p20/.test(e.animSprite || '')) poses[e.animSprite] = 1; } }
        const m = a => a.reduce((x, y) => x + y, 0) / a.length;
        return { lift: m(lifts), skew: m(skews), sy: sy / lifts.length, liftMax: Math.max(...lifts), poses: Object.keys(poses) };
      };
      const healthy = walk(1), hurt = walk(0.3);
      check(hurt.lift < healthy.lift - 0.003, 'a limp: the average lift drops (' + hurt.lift.toFixed(4) + ' < ' + healthy.lift.toFixed(4) + ')');
      // Phase 20: the stoop and limp are painted frames now (the squash/skew on top is much smaller)
      check(hurt.sy < healthy.sy && hurt.skew < healthy.skew + 0.03 && (Math.abs(hurt.skew - healthy.skew) > 0.004 || hurt.poses.length >= 2), 'a stoop and a lean');
      check(!healthy.poses.length && hurt.poses.some(n => /limpA/.test(n)) && hurt.poses.some(n => /limpB/.test(n)), 'painted limp frames while hurt, none while healthy (' + hurt.poses.join(',') + ')');
      GFX.reduceMotion = true; const calmWalk = walk(0.3); GFX.reduceMotion = false;
      check(Math.abs(calmWalk.skew - hurt.skew) > 0.0005 || calmWalk.liftMax >= hurt.liftMax, 'reduced motion drops the limp bobbing');
      out.limp = { healthy, hurt };

      // ---- 4. Lyra's rings
      e = join('lyra', 27.5, 38.0, Math.PI / 2); G.party.order = 'wait'; frozen();
      Engine.cam.x = 27.5; Engine.cam.y = 38.0; Engine.cam.dir = Math.PI / 2; e.x = 27.5; e.y = 39.6;
      const grab = () => { Engine.render(G.ents, G.tod); const d = Engine.ctx.getImageData(0, 0, 320, 150).data; return d; };
      const lum = d => { let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; return s; };
      const changed = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; return n; };
      e._cRings = []; frozen(); const quiet = grab(); frozen(); const noise = changed(quiet, grab());   // render noise with nothing changed
      e._cRings = [0.3, 0.9]; frozen(); const ringsOn = grab();
      const nRing = changed(quiet, ringsOn); check(nRing > noise + 15, 'singing draws rings in the air (' + nRing + ' px)');
      // particles 0 also thins other modules' smoke, leaves and critters, so compare like with like: rings vs none, both at 0
      GFX.particles = 0; const saved = e._cRings; e._cRings = []; frozen(); const quiet0 = grab(); e._cRings = saved; frozen();
      const none = changed(quiet0, grab()); GFX.particles = 1; check(none <= noise + 2, 'GFX.particles 0 removes them (' + none + ' vs noise ' + noise + ')');
      GFX.particles = 0.3; const few = changed(quiet, grab()); GFX.particles = 1; check(few < nRing, 'GFX.particles scales them (' + few + ' < ' + nRing + ')');
      GFX.noFlash = true; const nf = grab(); GFX.noFlash = false;
      check(changed(quiet, nf) > 5 && lum(nf) - lum(quiet) < (lum(ringsOn) - lum(quiet)) * 0.3, 'No flash: a teal cast, no brightening (' + (lum(nf) - lum(quiet)).toFixed(0) + ' vs ' + (lum(ringsOn) - lum(quiet)).toFixed(0) + ')');
      GFX.reduceMotion = true; e._cRings = [0.1]; const s1 = grab(); e._cRings = [1.4]; const s2 = grab(); GFX.reduceMotion = false;
      check(changed(s1, s2) <= noise + 2 && changed(quiet, s1) > 5, 'reduced motion: one steady ring');
      // a wall in front hides it
      // a wall hides it: stand in the mausoleum (stone rooms), find a thin wall with open floor behind it
      e = join('lyra', 27.5, 38.0, Math.PI / 2); loadMap('mausoleum'); G.state = 'play'; G.party.order = 'follow'; G.party.hp = 5; partySpawn(); e = partyEnt();
      const cfg = (() => {
        const W = G.map.w, H = G.map.h, C = G.map.cells, wall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !!C[y * W + x];
        for (let y = 2; y < H - 5; y++) for (let x = 2; x < W - 5; x++) {
          for (const [ux, uy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
            const c = k => wall(x + ux * k, y + uy * k);
            if (!c(0) && !c(1) && c(2) && !c(3) && !c(4) && !c(5) && !wall(x - ux, y - uy)) return { x: x + 0.5, y: y + 0.5, a: Math.atan2(uy, ux), ux, uy };
          }
        } return null;
      })();
      check(cfg, 'found a wall to test against');
      const place = (behind) => { Engine.cam.x = cfg.x; Engine.cam.y = cfg.y; Engine.cam.dir = cfg.a; const dd = behind ? 4.0 : 1.0; e.x = cfg.x + cfg.ux * dd; e.y = cfg.y + cfg.uy * dd; e.hidden = false; e._cRings = [0.5]; frozen(); const r0 = FX.state.rings; grab(); return FX.state.rings - r0; };
      const inFront = place(false), behindWall = place(true);
      out.wall = { inFront, behindWall };
      check(inFront > 5 && behindWall < inFront * 0.3, 'a wall hides the rings (' + behindWall + ' behind vs ' + inFront + ' in front)');
      // does it start from the real singing signal? (the Calling-Song)
      e = join('lyra', 27.5, 38.0, Math.PI / 2); G.party.cd = 0; step(e, 2, 0.016); partyAbility(); step(e, 4, 0.016);
      check(e._cRings && e._cRings.length >= 1, 'the Calling-Song makes rings'); step(e, 400, 0.016); check(!e._cRings.length, 'and they die away');

      // ---- 5. the camp
      G.party = null; partySpawn(); loadMap('deepwoods', { x: 27.5, y: 46.0, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.party = null; partyCampNpcs();
      const kd = G.ents.find(o => o.id === 'kaelen_dw'); check(kd && !kd.hidden, 'Kaelen is at the camp');
      Engine.cam.x = 28.4; Engine.cam.y = 46.5; Engine.cam.dir = Math.atan2(kd.y - 46.5, kd.x - 28.4); frozen();
      const skews = [], sharp = []; for (let i = 0; i < 400; i++) { ANIM.T += 0.016; animCreature(kd, 0.016, ANIM.T); skews.push(kd.animSkew); sharp.push(kd._cSharp); }
      const rangeOf = a => Math.max(...a) - Math.min(...a);
      check(rangeOf(skews) > 0.03 && sharp.includes(1) && sharp.includes(0), 'Kaelen sharpens in strokes, with pauses');
      GFX.companionLife = false; const offSkews = []; for (let i = 0; i < 400; i++) { ANIM.T += 0.016; animCreature(kd, 0.016, ANIM.T); offSkews.push(kd.animSkew); } GFX.companionLife = true;
      check(rangeOf(offSkews) < rangeOf(skews) * 0.8, 'switch off: only the original sway');
      // sparks (drawn on the stroke), removed by No flash and reduced motion
      const sparkRun = () => { frozen(); const s0 = FX.state.sparks; for (let i = 0; i < 300; i++) { ANIM.T += 0.016; animCreature(kd, 0.016, ANIM.T); if (kd._cSharp) { frozen(); Engine.render(G.ents, G.tod); } } return FX.state.sparks - s0; };
      Engine.cam.x = 28.4; Engine.cam.y = 46.5; Engine.cam.dir = Math.atan2(kd.y - 46.5, kd.x - 28.4); Engine.render(G.ents, G.tod);
      const sparksN = sparkRun(); check(sparksN > 0, 'sparks fly off the stone (' + sparksN + ')');
      GFX.noFlash = true; check(sparkRun() === 0, 'No flash: no sparks'); GFX.noFlash = false;
      GFX.reduceMotion = true; check(sparkRun() === 0, 'reduced motion: no sparks'); GFX.reduceMotion = false;
      GFX.particles = 0; check(sparkRun() === 0, 'GFX.particles 0: no sparks'); GFX.particles = 1;
      // warming hands: a camp figure leans toward the fire, whichever side you view from
      const fire = G.ents.find(o => o.sprite === 'campfire'), lyraDw = G.ents.find(o => o.id === 'lyra_dw'); check(fire && lyraDw && !lyraDw.hidden, 'a camp figure beside the fire');
      const leanFrom = (cx, cy) => { Engine.cam.x = cx; Engine.cam.y = cy; Engine.cam.dir = Math.atan2(lyraDw.y - cy, lyraDw.x - cx); let s = 0; for (let i = 0; i < 80; i++) { ANIM.T += 0.016; animCreature(lyraDw, 0.016, ANIM.T); s += lyraDw.animSkew; } return s / 80; };
      const a = leanFrom(lyraDw.x - 2.5, lyraDw.y + 0.0), b = leanFrom(lyraDw.x + 0.0, lyraDw.y + 2.5), c2 = leanFrom(lyraDw.x + 0.0, lyraDw.y - 2.5);
      out.lean = [a, b, c2];
      check(Math.abs(b - c2) > 0.02 && Math.sign(b) !== Math.sign(c2), 'the lean flips with the viewing side (' + b.toFixed(3) + ' / ' + c2.toFixed(3) + ')');
      GFX.companionLife = false; const offLean = leanFrom(lyraDw.x + 0.0, lyraDw.y + 2.5); GFX.companionLife = true;
      check(Math.abs(offLean) < Math.abs(b), 'switch off: no lean');
      // someone far from any fire is untouched
      const far = G.ents.find(o => o.id === 'vane_dw'); far.x = 24; far.y = 49; Engine.cam.x = 24; Engine.cam.y = 47; Engine.cam.dir = Math.PI / 2;
      const farSk = []; for (let i = 0; i < 80; i++) { ANIM.T += 0.016; animCreature(far, 0.016, ANIM.T); farSk.push(far.animSkew); }
      GFX.companionLife = false; const farOff = []; for (let i = 0; i < 80; i++) { ANIM.T += 0.016; animCreature(far, 0.016, ANIM.T); farOff.push(far.animSkew); } GFX.companionLife = true;
      check(Math.abs(Math.max(...farSk) - Math.max(...farOff)) < 0.02, 'figures away from a fire keep their own idle');

      // ---- 6. twin: GFX.companionLife off must match the original party results exactly
      const twin = (life) => {
        GFX.companionLife = life; Math.random = rnd();
        e = join('kaelen', 27.5, 38.0, Math.PI / 2); G.party.order = 'follow';
        const f1 = hydrate({ kind: 'enemy', type: 'hound', x: e.x + 3, y: e.y + 1 }), f2 = hydrate({ kind: 'enemy', type: 'hound', x: e.x - 2, y: e.y + 3 });
        G.ents.push(f1, f2); for (const f of [f1, f2]) { f.state = 'chase'; f.alertT = 99; f.hp = 400; }
        const pl = G.player; pl.hp = pl.hpMax * 0.4; Engine.cam.x = 27.5; Engine.cam.y = 38; Engine.cam.dir = Math.PI / 2; G.noise = 0;
        const trace = [];
        for (let i = 0; i < 700; i++) {
          partyTick(0.05); if (i % 50 === 0) { f1.cool = 0; f2.cool = 0; }
          const ee = partyEnt(); const P2 = G.party;
          if (i % 7 === 0) trace.push([P2.id, +(P2.hp).toFixed(4), P2.cd, ee ? +ee.x.toFixed(4) : null, ee ? +ee.y.toFixed(4) : null, f1.hp, f2.hp, +pl.hp.toFixed(3), +G.noise.toFixed(3), Object.keys(P2.said).length, G.log ? G.log.length : 0]);
          if (G.party && !G.party.id) break;
        }
        const res = JSON.stringify({ trace, said: G.party.said, downed: G.party.downed, hp: G.party.hp });
        G.ents.splice(G.ents.indexOf(f1), 1); G.ents.splice(G.ents.indexOf(f2), 1); return res;
      };
      const offRes = twin(false), offRes2 = twin(false), onRes = twin(true);
      check(offRes === offRes2, 'the twin test is deterministic');
      check(onRes === offRes, 'companionLife on or off: identical party, player and enemy results');
      out.twinLen = offRes.length; GFX.companionLife = true;
      // the original function: the wrapper adds nothing when off. Run the same trace through the un-wrapped body if it is reachable
      out.stats = { hits: FX.state.hits, sparks: FX.state.sparks, rings: FX.state.rings };

      // ---- 7. frame cost (median of many calls, in isolation)
      const med = (fn, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); fn(); t.push(performance.now() - a); } t.sort((x, y) => x - y); return t[t.length >> 1]; };
      e = join('lyra', 27.5, 38.0, Math.PI / 2); e._cRings = [0.2, 0.7, 1.2]; Engine.cam.dir = Math.PI / 2; e.x = 27.5; e.y = 39.6; frozen();
      GFX.companionLife = false; const rOff = med(() => Engine.render(G.ents, G.tod), 120); GFX.companionLife = true; const rOn = med(() => { e._cRings = [0.2, 0.7, 1.2]; Engine.render(G.ents, G.tod); }, 120);
      const aOn = med(() => { for (let i = 0; i < 200; i++) animCreature(e, 0.016, ANIM.T += 0.016); }, 30) / 200; GFX.companionLife = false;
      const aOff = med(() => { for (let i = 0; i < 200; i++) animCreature(e, 0.016, ANIM.T += 0.016); }, 30) / 200; GFX.companionLife = true;
      const tOn = med(() => partyTick(0.016), 400); GFX.companionLife = false; const tOff = med(() => partyTick(0.016), 400); GFX.companionLife = true;
      out.cost = { renderOffMs: rOff, renderOnMs: rOn, animOnMs: aOn, animOffMs: aOff, tickOnMs: tOn, tickOffMs: tOff };
      return out;
    });
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log(JSON.stringify(r));
    console.log('PASS companions');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL companions:', e.message); process.exit(1); });
