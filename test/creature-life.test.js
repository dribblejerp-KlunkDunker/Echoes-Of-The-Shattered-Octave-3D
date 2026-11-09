// PREVIEW_URL=http://127.0.0.1:PORT PLAYWRIGHT_MODULE=/path/to/playwright node test/creature-life.test.js
// Phase 3 creature-life: species idle fidgets, alert startle synced to the alert
// sound, separate charge/flee strides; and proof that nothing about the AI moves.
// Optional SHOTS=<dir> writes review screenshots (kept out of the repo).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof CREATURE_LIFE !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Life Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);

    const out = await page.evaluate(async (wantShots) => {
      const check = (ok, text) => { if (!ok) throw new Error(text); };
      const r = {}, shots = {};
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
      Engine.setWeather({}); PARTICLES.list.length = 0;
      check(GFX.creatureLife === true && !GFX.FX.includes('creatureLife'), 'flag defaults on and is not a GFX.FX effect');
      const CL = CREATURE_LIFE, FIELDS = ['animSY', 'animSX', 'animLift', 'animSkew', 'animAlpha', 'animHurt', 'animGlow', 'animSprite', 'animFlip', 'facing'];
      // entities are made but NOT pushed into G.ents, so the live render loop never touches them
      const mk = (type, x, y, state) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = state || 'idle'; return e; };
      const snap = e => FIELDS.map(k => e[k]);
      const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
      const range = a => Math.max(...a) - Math.min(...a);
      const cam = Engine.cam; cam.x = 12.5; cam.y = 11.5; cam.dir = -Math.PI / 2;
      const DT = 1 / 30;

      // ---- 1. idle fidgets: every family moves over time, and twins are out of step
      const fam = {};
      const idleSeries = (type, x, y) => {
        const e = mk(type, x, y), t = mk(type, x, y), a = { sy: [], sx: [], sk: [], li: [], al: [], dsy: [], dsx: [], dsk: [], dal: [] };
        t._seed = e._seed = undefined; // identical twin for the original output
        for (let i = 0; i < 360; i++) {
          const T = 20 + i * DT;
          animCreature(e, DT, T); CL.origAnim(t, DT, T);
          a.sy.push(e.animSY); a.sx.push(e.animSX); a.sk.push(e.animSkew); a.li.push(e.animLift); a.al.push(e.animAlpha);
          a.dsy.push(e.animSY - t.animSY); a.dsx.push(e.animSX - t.animSX); a.dsk.push(e.animSkew - t.animSkew); a.dal.push(e.animAlpha - t.animAlpha);
        }
        return a;
      };
      const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      for (const [type, key] of [['hound', 'dsy'], ['weaverling', 'dsy'], ['proctor', 'dsk'], ['legionnaire', 'dsk'], ['quiet', 'dsx'], ['dirge', 'dsx']]) {
        const a = idleSeries(type, 10.5, 8.5), b = idleSeries(type, 14.5, 7.5);
        check(CL.family(mk(type, 1, 1)) !== 'keep', type + ' has a fidget family');
        check(range(a[key]) > 0.02, type + ' idle fidget moves ' + key + ' over time (range ' + range(a[key]).toFixed(4) + ')');
        check(diff(a.sy, b.sy) + diff(a.sk, b.sk) + diff(a.sx, b.sx) > 0.02, 'two ' + type + 's are not in unison');
        fam[type] = CL.family(mk(type, 1, 1));
      }
      r.families = fam;
      check(fam.hound === 'quad' && fam.proctor === 'robed' && fam.quiet === 'spectral', 'families: ' + JSON.stringify(fam));
      // the hound sniffs a few times then pauses: >= 2 dip episodes and a still stretch >= 1.5 s inside ten seconds
      {
        const a = idleSeries('hound', 10.5, 8.5), d = a.dsy.map(v => Math.abs(v) > 0.015);
        let ep = 0, still = 0, best = 0;
        for (let i = 0; i < d.length; i++) { if (d[i] && !d[i - 1]) ep++; still = d[i] ? 0 : still + 1; best = Math.max(best, still); }
        check(ep >= 2, 'hound sniffs repeatedly (' + ep + ' dips)'); check(best * DT >= 1.5, 'hound then pauses (' + (best * DT).toFixed(2) + ' s still)');
        r.sniff = { dips: ep, pauseS: +(best * DT).toFixed(2) };
      }
      // flutter, swarm and static species keep their own motion exactly
      for (const type of ['mites', 'hushmoth', 'horn']) {
        const e = mk(type, 10.5, 8.5), t = mk(type, 10.5, 8.5);
        for (let i = 0; i < 120; i++) { animCreature(e, DT, 5 + i * DT); CL.origAnim(t, DT, 5 + i * DT); check(same(snap(e), snap(t)), type + ' is left alone'); }
      }

      // ---- 2. detection startle starts on the tick of the alert sound and lasts ~0.35 s
      let alerts = 0; const realAlert = Audio_.sfx.enemy;
      Audio_.sfx.enemy = function (d, kind) { if (kind === 'alert') alerts++; return realAlert.apply(this, arguments); };
      const startleRun = (type, y, noise) => {
        const e = mk(type, 12.5, y); e.guard = false; e.facing = Math.PI / 2 + 1.6; // looking away
        for (let i = 0; i < 30; i++) animCreature(e, DT, 40 + i * DT); // settled idle
        G.noise = noise; alerts = 0;
        check(!(e._clSt > 0), 'no startle before the alert');
        enemyUpdate(e, 0.05);
        const sameTick = { state: e.state, alerts, st: e._clSt };
        const t0 = 41, series = []; let t = 0;
        while (e._clSt > 0 && series.length < 40) { animCreature(e, DT, t0 + t); series.push({ sy: e.animSY, sx: e.animSX, lift: e.animLift, f: e.facing }); t += DT; }
        animCreature(e, DT, t0 + t);
        const base = mk(type, 12.5, y); base.state = 'chase'; animCreature(base, DT, 40); const b = base.animSY;
        const toP = Math.atan2(cam.y - e.y, cam.x - e.x); let da = e.facing - toP; da -= 2 * Math.PI * Math.round(da / (2 * Math.PI));
        return { sameTick, dur: series.length * DT, peakIdx: series.map(s => s.sy).indexOf(Math.max(...series.map(s => s.sy))), peak: Math.max(...series.map(s => s.sy)) - b, minSxIdx: series.map(s => s.sx).indexOf(Math.min(...series.map(s => s.sx))), hear: e._clHear, faceErr: Math.abs(da), n: series.length, f0: series[0].f };
      };
      const sight = startleRun('legionnaire', 8.5, 0), hear = startleRun('legionnaire', 4.5, 9);
      for (const [nm, s] of [['sight', sight], ['hearing', hear]]) {
        check(s.sameTick.state === 'chase' && s.sameTick.alerts === 1 && Math.abs(s.sameTick.st - CL.STARTLE_T) < 1e-9, nm + ': startle begins in the same call that flips to chase and plays the alert (' + JSON.stringify(s.sameTick) + ')');
        check(s.dur > 0.3 && s.dur < 0.42, nm + ': lasts about 0.35 s (' + s.dur.toFixed(3) + ')');
        check(s.peak > 0.08, nm + ': an upward stretch jolt (' + s.peak.toFixed(3) + ')');
        check(s.faceErr < 0.05, nm + ': ends facing the player (' + s.faceErr.toFixed(3) + ' rad off)');
      }
      check(sight.hear === false && hear.hear === true, 'sight and hearing alerts are told apart');
      check(hear.peakIdx > sight.peakIdx + 1, 'hearing: head turns first, jolt later (' + hear.peakIdx + ' vs ' + sight.peakIdx + ')');
      check(hear.minSxIdx < hear.peakIdx, 'hearing: the narrow head-turn comes before the jolt');
      Audio_.sfx.enemy = realAlert;
      r.startle = { sight: { dur: +sight.dur.toFixed(3), peak: +sight.peak.toFixed(3), peakIdx: sight.peakIdx }, hear: { dur: +hear.dur.toFixed(3), peak: +hear.peak.toFixed(3), peakIdx: hear.peakIdx } };
      // a transition that does not go through enemyUpdate (struck while idle) is caught one frame later
      { const e = mk('proctor', 12.5, 8.5); animCreature(e, DT, 1); e.state = 'chase'; animCreature(e, DT, 1.03); check(e._clSt > 0.3 && e._clSt < CL.STARTLE_T, 'fallback detection via _prevState'); }
      // already chasing when first seen (summoned hounds): no startle
      { const e = mk('hound', 12.5, 8.5, 'chase'); animCreature(e, DT, 1); check(!(e._clSt > 0), 'no startle for a creature spawned already chasing'); }

      // ---- 3. strides: charge vs flee vs walk
      const run = (type, y0, vy, state, life) => {
        GFX.creatureLife = life;
        const e = mk(type, 12.5, y0, state), a = { sy: [], sx: [], sk: [], li: [] }; let y = y0;
        for (let i = 0; i < 120; i++) { y += vy * DT; e.x = 12.5; e.y = y; animCreature(e, DT, 60 + i * DT); if (i >= 60) { a.sy.push(e.animSY); a.sx.push(e.animSX); a.sk.push(e.animSkew); a.li.push(e.animLift); } }
        GFX.creatureLife = true; return { a, e };
      };
      const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
      const cross = a => { let n = 0; for (let i = 1; i < a.length; i++) if ((a[i] > 0) !== (a[i - 1] > 0) && Math.abs(a[i] - a[i - 1]) > 1e-6) n++; return n / (a.length * DT); };
      const sig = (type, y0, vy, state, life = true) => { const { a } = run(type, y0, vy, state, life); return { sy: mean(a.sy), sx: mean(a.sx), lift: mean(a.li), cross: cross(a.sk), skAmp: range(a.sk) }; };
      const walkA = sig('proctor', 3, 0.9, 'chase'), walkO = sig('proctor', 3, 0.9, 'chase', false);
      const chargeA = sig('proctor', -1, 2.0, 'chase'), chargeO = sig('proctor', -1, 2.0, 'chase', false);
      const fleeA = sig('proctor', 9, -1.5, 'chase'), fleeO = sig('proctor', 9, -1.5, 'chase', false);
      check(JSON.stringify(walkA) === JSON.stringify(walkO), 'normal walking is unchanged');
      check(chargeA.sy < chargeO.sy - 0.04 && chargeA.sx > chargeO.sx + 0.03, 'charge: lower, longer stride (sy ' + chargeA.sy.toFixed(3) + ' vs ' + chargeO.sy.toFixed(3) + ', sx ' + chargeA.sx.toFixed(3) + ' vs ' + chargeO.sx.toFixed(3) + ')');
      check(fleeA.sy < fleeO.sy - 0.05, 'flee: hunched (sy ' + fleeA.sy.toFixed(3) + ' vs ' + fleeO.sy.toFixed(3) + ')');
      check(fleeA.cross > chargeA.cross * 2 && fleeA.cross > fleeO.cross * 1.5 && chargeA.cross < chargeO.cross, 'flee: faster, choppier strides (' + fleeA.cross.toFixed(2) + '/s vs charge ' + chargeA.cross.toFixed(2) + ', orig ' + fleeO.cross.toFixed(2) + ')');
      check(Math.abs(fleeA.sy - chargeA.sy) > 0.01 || Math.abs(fleeA.sx - chargeA.sx) > 0.03, 'charge and flee are distinguishable');
      // an idle wanderer drifting away at wander speed is not "fleeing"
      const wander = sig('proctor', 9, -0.45, 'idle'), wanderO = sig('proctor', 9, -0.45, 'idle', false);
      check(Math.abs(wander.sx - wanderO.sx) < 0.02 && Math.abs(wander.sy - wanderO.sy) < 0.02, 'idle wandering does not trigger flee strides');
      r.stride = { walk: walkA, charge: chargeA, flee: fleeA, origCharge: chargeO, origFlee: fleeO };

      // ---- 4. switch off / reduced motion: the original output, field for field
      for (const mode of ['flag', 'reduced']) {
        const off = () => { if (mode === 'flag') GFX.creatureLife = false; else GFX.reducedMotion = true; }, on = () => { GFX.creatureLife = true; GFX.reducedMotion = false; };
        for (const type of ['hound', 'proctor', 'quiet', 'golem', 'mites']) {
          const e = mk(type, 11.5, 9.5), t = mk(type, 11.5, 9.5); let y = 9.5;
          off();
          for (let i = 0; i < 400; i++) {
            const T = 100 + i * DT;
            if (i === 120) { e.state = t.state = 'chase'; }
            if (i >= 120) { y += (i < 260 ? 2.0 : -1.5) * DT; e.y = t.y = y; }
            animCreature(e, DT, T); CL.origAnim(t, DT, T);
            // under reduced motion js/access.js also calms the original idle motion; compare like with like
            if (mode === 'reduced' && typeof ACCESS !== 'undefined' && ACCESS.calmEntity) ACCESS.calmEntity(t);
            check(same(snap(e), snap(t)), mode + ' off: ' + type + ' equals the original at step ' + i);
          }
          on();
        }
      }

      // ---- 5. no gameplay change: AI traces with and without the module are identical
      const trace = (life, raw) => {
        loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
        Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
        GFX.creatureLife = life; G.player.hp = G.player.hpMax = 9999; G.noise = 4;
        const list = [['hound', 9.5, 7.5], ['proctor', 14.5, 8.5], ['quiet', 11.5, 5.5], ['legionnaire', 8.5, 9.5], ['weaverling', 15.5, 6.5], ['golem', 12.5, 4.5]].map(([t, x, y]) => mk(t, x, y));
        G.ents.push(...list);
        const tr = [], up = raw ? CL.origUpdate : enemyUpdate;
        for (let i = 0; i < 400; i++) {
          if (i === 150) { G.noise = 0; cam.x = 12.5; cam.y = 12.2; }
          for (const e of list) { up(e, 0.05); if (!raw) animCreature(e, 0.05, 200 + i * 0.05); }
          for (const e of list) tr.push([e.x, e.y, e.state, e.cool, e.hp, e.alertT].join(','));
          tr.push(G.player.hp);
        }
        for (const e of list) G.ents.splice(G.ents.indexOf(e), 1);
        GFX.creatureLife = true; cam.x = 12.5; cam.y = 11.5; return tr.join('|');
      };
      trace(false, true); // warm-up: the first run of a map warms pathing's own caches, whatever this module does
      const tRaw = trace(false, true), tOn = trace(true, false), tOff = trace(false, false);
      const fd = (a, b) => { const x = a.split('|'), y = b.split('|'); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return i + ': ' + x[i] + ' / ' + y[i]; return -1; };
      check(tRaw === tOn && tRaw === tOff, fd(tRaw, tOn) + ' ## ' + fd(tRaw, tOff) + ' enemy positions/state/cooldowns/hp identical with and without the module');
      r.aiTraceLen = tRaw.length;
      Math.random = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

      // ---- 6. frame cost: median over many frames of a 12-enemy scene, isolated
      const crowd = []; for (let i = 0; i < 12; i++) crowd.push(mk(['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], 6 + i, 8 + (i % 3)));
      const frameCost = fn => { const ms = []; for (let k = 0; k < 301; k++) { const t0 = performance.now(); for (let j = 0; j < 20; j++) for (const e of crowd) fn(e, DT, k * DT + j); ms.push((performance.now() - t0) / 20); } ms.sort((a, b) => a - b); return ms[150]; };
      frameCost(CL.origAnim); const base = frameCost(CL.origAnim), withLife = frameCost(animCreature);
      r.cost = { orig12us: +(base * 1000).toFixed(1), life12us: +(withLife * 1000).toFixed(1), extraPerFrameUs: +((withLife - base) * 1000).toFixed(1) };

      // ---- screenshots (optional): strips composed in-page from engine frames
      if (wantShots) {
        const realUpdate = animFrame; animFrame = function () {}; // freeze the live loop while we pose entities
        G.state = 'play'; PARTICLES.list.length = 0;
        const strip = (frames, label) => {
          const cv = document.createElement('canvas'), pad = 4, S = 3; let W = pad, H = 0; const crops = [];
          for (const f of frames) { const b = f.box; crops.push(f); W += (b.w * S) + pad; H = Math.max(H, b.h * S); }
          cv.width = W; cv.height = H + 2 * pad; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#000'; c.fillRect(0, 0, W, cv.height);
          let x = pad; for (const f of crops) { c.drawImage(f.cv, 0, 0, f.box.w, f.box.h, x, pad, f.box.w * S, f.box.h * S); x += f.box.w * S + pad; }
          return cv.toDataURL('image/png');
        };
        const grab = ents => {
          Engine.render(G.ents, G.tod);
          const src = Engine.ctx.canvas, S = src.width / 320, f = ents.length ? ents[0]._screen : null; if (!f) return null;
          const x0 = Math.max(0, Math.floor(f.x0 * S) - 10), x1 = Math.min(src.width, Math.ceil(f.x1 * S) + 10), y0 = Math.max(0, Math.floor(f.y0 * S) - 6), y1 = Math.min(Math.floor(150 * S), Math.ceil(f.y1 * S) + 6);
          const cv = document.createElement('canvas'); cv.width = x1 - x0; cv.height = y1 - y0; cv.getContext('2d').drawImage(src, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
          return { cv, box: { w: cv.width, h: cv.height } };
        };
        const stage = (type, x, y, state) => { const e = mk(type, x, y, state); G.ents.push(e); return e; };
        const unstage = e => G.ents.splice(G.ents.indexOf(e), 1);
        // a hound sniffing, ten frames across the sniff
        { const h = stage('hound', 12.5, 8.6); animCreature(h, DT, 1); const s = h._clSeed, P = 6 + 3 * (s * 0.318 - Math.floor(s * 0.318)), T0 = 3 * P - s * 3.7; const fr = [];
          for (const dt of [0.0, 0.2, 0.37, 0.6, 0.87, 1.12, 1.35, 1.8]) { animCreature(h, DT, T0 + dt); fr.push(grab([h])); }
          shots.sniff = strip(fr.filter(Boolean)); unstage(h); }
        // a startle sequence, sight alert, every other frame
        { const e = stage('legionnaire', 12.5, 8.4); e.facing = Math.PI / 2 + 1.6; for (let i = 0; i < 10; i++) animCreature(e, DT, 1 + i * DT); G.noise = 0; enemyUpdate(e, 0.05); const fr = [grab([e])]; let t = 2;
          for (let i = 0; i < 11; i++) { animCreature(e, 0.035, t += 0.035); if (i % 2) fr.push(grab([e])); } shots.startle = strip(fr.filter(Boolean)); unstage(e); }
        // charge vs walk vs flee (one proctor each, same final distance)
        { const mkRun = (y0, vy) => { const e = stage('proctor', 12.5, y0, 'chase'); let y = y0; for (let i = 0; i < 90; i++) { y += vy * DT; e.y = y; animCreature(e, DT, 60 + i * DT); } return e; };
          const fr = [];
          for (const [y0, vy] of [[-1, 2.0], [3.4, 0.9], [9, -1.5]]) {
            const e = mkRun(y0, vy), a = grab([e]); fr.push(a);
            for (let i = 0; i < 4; i++) { e.y += vy * DT * 4; for (let k = 0; k < 4; k++) animCreature(e, DT, 80 + i * 4 * DT + k * DT); }
            fr.push(grab([e])); unstage(e);
          }
          shots.stride = strip(fr.filter(Boolean)); }
        animFrame = realUpdate;
      }
      return { r, shots };
    }, !!SHOTS);
    console.log('PASS idle fidgets by family (twins out of step), alert startle synced to the alert sound, charge/flee strides, flag-off identical, AI traces identical', JSON.stringify(out.r));
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      for (const k in out.shots) fs.writeFileSync(path.join(SHOTS, 'creature-life_' + k + '.png'), Buffer.from(out.shots[k].split(',')[1], 'base64'));
      console.log('PASS screenshots written to ' + SHOTS);
    }
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
