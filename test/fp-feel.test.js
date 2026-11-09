// PREVIEW_URL=http://127.0.0.1:3205 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/fp-feel.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Covers js/fp-feel.js: optional gentle head bob, landing dip, heavy-hit shake, deafness and Hushed
// effects, the reduce-motion / no-flash switches, written cues, the Options rows, drift and cost.
// Set FEEL_SHOTS to a directory to keep screenshots (3x canvas crops).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.FEEL_SHOTS || path.join(os.tmpdir(), 'octave-feel');
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof FEEL !== 'undefined' && typeof PRESETS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Feel Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);
    // stop the game's own loop: this test drives update() and render() by hand
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);

    // shared helpers, defined once in the page
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.setup = () => {
        G.state = 'play'; G.fadeT = 0; G.dead = false; G.keys = {}; G.stillT = 0; G.unwriting = false; G.whistleT = 0; G.mutedT = 0; G.hurtT = 0;
        for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
        Engine.setWeather({}); if (typeof PARTICLES !== 'undefined' && PARTICLES.list) PARTICLES.list.length = 0;
        if (typeof ANIM !== 'undefined') ANIM.dt = 0;
        // other modules' animated looks (mist drift, star twinkle, grass sway) would move the brightness measures
        if (typeof GFX.plain === 'function') GFX.plain();
        Object.assign(GFX, { headBob: 'off', reduceMotion: false, noFlash: false });
        const s = FEEL.state; Object.assign(s, { dip: 0, dipT: 1, shake: 0, deafT: 0, deaf: 0, hush: 0, hushCue: 0, deafCue: -99, hushCueAt: -99, rollDeg: 0, offY: 0, offDir: 0 });
        const p = G.player; p.hp = p.hpMax; p.fallFrom = null; p.fallV = 0; Engine.cam.bob = 0; Engine.cam.pitch = 0; G.vel.x = G.vel.y = 0;
        document.querySelector('#msgs').innerHTML = '';
        p.feet = G.map.groundAt ? G.map.groundAt(Engine.cam.x, Engine.cam.y) : 0;
      };
      // the effective camera bob each render actually used, via a post hook that sees the offset camera
      window.seen = []; window.__F = null;
      Engine.addPostHook(F => { window.__F = F; window.seen.push({ bob: F.cam.bob, dir: F.cam.dir, horizon: F.horizon }); }, 99);
      window.frameOnce = () => { update(1 / 60); render(); };
      window.msgs = () => Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent);
      // pick a heading with a long clear run so walking tests never stop at a wall
      window.clearHeading = () => {
        const c = Engine.cam; let best = 0, bd = -1;
        for (let k = 0; k < 16; k++) {
          const a = k * Math.PI / 8; let d = 0;
          while (d < 12 && !solidAt(c.x + Math.cos(a) * (d + 0.5), c.y + Math.sin(a) * (d + 0.5))) d += 0.5;
          if (d > bd) { bd = d; best = a; }
        }
        c.dir = best; return bd;
      };
      window.lum = () => { const d = Engine.ctx.getImageData(0, 0, 320 * Engine.getScale(), 150 * Engine.getScale()).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) { s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; n++; } return s / n; };
      window.pixels = () => Engine.ctx.getImageData(0, 0, 320 * Engine.getScale(), 150 * Engine.getScale()).data;
      window.chroma = () => { const d = pixels(); let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); s += mx - mn; n++; } return s / n; };
      window.hgrad = () => { const d = pixels(), w = 320 * Engine.getScale(), h = 150 * Engine.getScale(); let s = 0; for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) { const i = (y * w + x) * 4; s += Math.abs(d[i] - d[i - 4]) + Math.abs(d[i + 1] - d[i - 3]) + Math.abs(d[i + 2] - d[i - 2]); } return s / (w * h); };
    });

    // ---------------------------------------------------------------- defaults: nothing changes the camera
    const def = await page.evaluate(() => {
      setup();
      check(GFX.headBob === 'off' && GFX.reduceMotion === false && GFX.noFlash === false, 'fresh defaults: bob off, reduce motion off, flashes allowed');
      check(typeof FEEL.rawRender === 'function', 'the original Engine.render is kept');
      const c = Engine.cam, r = {};
      clearHeading();
      // pixel identity: wrapped render vs the original render, same state, frozen clock
      const pn = performance.now; performance.now = () => 5000;
      Engine.render(G.ents, G.tod); const a = Array.from(pixels());
      FEEL.rawRender.call(Engine, G.ents, G.tod); const b = Array.from(pixels());
      performance.now = pn;
      let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      r.idleDiff = diff; check(diff === 0, 'idle frame is byte-identical to the original renderer (' + diff + ' bytes differ)');
      // walking: the effective bob IS the game's own bob, frame for frame
      G.keys.w = true; seen.length = 0; let maxD = 0, maxBob = 0, moved = 0; const x0 = c.x, y0 = c.y;
      for (let i = 0; i < 150; i++) { update(1 / 60); const own = c.bob; render(); const eff = seen[seen.length - 1].bob; maxD = Math.max(maxD, Math.abs(eff - own)); maxBob = Math.max(maxBob, Math.abs(own)); }
      moved = Math.hypot(c.x - x0, c.y - y0); G.keys.w = false;
      r.defaultWalk = { maxDelta: maxD, ownAmp: maxBob, moved };
      check(moved > 2, 'the test walker really walked (' + moved.toFixed(2) + ' tiles)');
      check(maxD === 0, 'bob off: effective cam.bob equals the original every frame (max delta ' + maxD + ')');
      check(maxBob > 1.5 && maxBob <= 2.0001, 'the game\'s own bob is sin * 2 rows (measured amplitude ' + maxBob.toFixed(3) + ')');
      check(FEEL.state.rollDeg === 0, 'no roll by default');
      return r;
    });
    console.log('PASS defaults: bob off, camera byte-identical to the original; own bob amplitude ' + def.defaultWalk.ownAmp.toFixed(3) + ' rows, walked ' + def.defaultWalk.moved.toFixed(1) + ' tiles');

    // ---------------------------------------------------------------- gentle bob
    const bob = await page.evaluate(() => {
      const run = (opts) => {
        setup(); Object.assign(GFX, opts); const c = Engine.cam; clearHeading();
        G.keys.w = true; G.keys.shift = false; seen.length = 0; const eff = [], own = [], roll = [];
        for (let i = 0; i < 240; i++) { update(1 / 60); own.push(c.bob); render(); eff.push(seen[seen.length - 1].bob); roll.push(FEEL.state.rollDeg); }
        G.keys.w = false;
        const tail = [];
        for (let i = 0; i < 90; i++) { update(1 / 60); render(); tail.push(seen[seen.length - 1].bob); }
        return { eff, own, roll, tail };
      };
      const gen = run({ headBob: 'gentle' }), org = run({ headBob: 'off' }), red = run({ headBob: 'gentle', reduceMotion: true });
      const amp = a => Math.max(...a.map(Math.abs)), step = a => Math.max(...a.slice(1).map((v, i) => Math.abs(v - a[i])));
      const r = { genAmp: amp(gen.eff), orgAmp: amp(org.eff), genStep: step(gen.eff), orgStep: step(org.eff), roll: amp(gen.roll), redRoll: amp(red.roll), redAmp: amp(red.eff), settle: amp(gen.tail.slice(-20)), cleanDiff: Math.max(...gen.eff.map((v, i) => Math.abs(v - gen.own[i]))) };
      check(r.cleanDiff > 0.3, 'gentle bob changes cam.bob (differs from the original by up to ' + r.cleanDiff.toFixed(2) + ')');
      check(r.genAmp < r.orgAmp && r.genAmp > 0.5, 'gentle is smaller than the original but present (' + r.genAmp.toFixed(2) + ' vs ' + r.orgAmp.toFixed(2) + ')');
      check(r.genStep < 0.5, 'gentle bob moves smoothly (largest frame-to-frame step ' + r.genStep.toFixed(3) + ')');
      check(r.roll > 0.15 && r.roll <= 0.45, 'gentle bob rolls slightly (' + r.roll.toFixed(3) + ' degrees peak)');
      check(r.redRoll === 0, 'reduce motion: no roll');
      check(r.redAmp < r.genAmp, 'reduce motion softens the bob further (' + r.redAmp.toFixed(2) + ')');
      check(r.settle < 0.05, 'the bob settles to nothing when you stop (' + r.settle.toFixed(4) + ')');
      return r;
    });
    console.log('PASS gentle bob: amp ' + bob.genAmp.toFixed(2) + ' vs original ' + bob.orgAmp.toFixed(2) + ' rows, max step ' + bob.genStep.toFixed(3) + ' (original ' + bob.orgStep.toFixed(3) + '), roll ' + bob.roll.toFixed(2) + ' deg, reduce motion -> no roll, settles at rest');

    // ---------------------------------------------------------------- landing dip
    const dip = await page.evaluate(() => {
      const land = (drop, opts) => {
        setup(); Object.assign(GFX, opts || {}); const p = G.player, c = Engine.cam, ground = G.map.groundAt ? G.map.groundAt(c.x, c.y) : 0;
        p.feet = ground + drop; p.hp = p.hpMax; const hp0 = p.hp;
        let minY = 0, frames = 0; const ys = [];
        for (let i = 0; i < 120; i++) { update(1 / 60); render(); const y = seen[seen.length - 1].bob - c.bob; ys.push(y); minY = Math.min(minY, y); }
        return { minY, lastDip: FEEL.state.lastDip, hurt: hp0 - p.hp, end: ys[ys.length - 1], ys, grounded: Math.abs(p.feet - ground) < 1e-6 };
      };
      const stair = land(0.3), small = land(0.6), fall = land(1.5), calm = land(1.5, { reduceMotion: true });
      check(stair.grounded && fall.grounded, 'the player lands');
      check(stair.hurt === 0 && small.hurt === 0, 'a stair and a 0.6 drop cost no health');
      check(fall.hurt > 0, 'a 1.5 drop is a hard landing that costs health (' + fall.hurt + ')');
      check(stair.minY < -0.8, 'a stair descent dips the eye (' + stair.minY.toFixed(2) + ' rows)');
      check(stair.lastDip < small.lastDip && small.lastDip < fall.lastDip, 'dip scales with drop height: ' + [stair, small, fall].map(d => d.lastDip.toFixed(2)).join(' < '));
      check(fall.minY < small.minY && small.minY < stair.minY, 'the camera really goes lower for bigger drops: ' + [stair, small, fall].map(d => d.minY.toFixed(2)).join(' > '));
      // eases down then back up: the minimum is in the middle of the run and it returns to exactly 0
      const iMin = fall.ys.indexOf(Math.min(...fall.ys));
      check(iMin > 2 && iMin < 90 && Math.abs(fall.end) < 1e-9, 'the dip eases down (frame ' + iMin + ', after the ~0.65s fall) and returns to zero');
      const step = Math.max(...stair.ys.slice(1).map((v, i) => Math.abs(v - stair.ys[i])));
      check(step < 0.5, 'no jump in the stair dip (largest step ' + step.toFixed(3) + ')');
      check(calm.lastDip < fall.lastDip * 0.5, 'reduce motion cuts the dip (' + calm.lastDip.toFixed(2) + ' vs ' + fall.lastDip.toFixed(2) + ')');
      return { stair: stair.minY, small: small.minY, fall: fall.minY, calm: calm.lastDip, dips: [stair.lastDip, small.lastDip, fall.lastDip], hurt: fall.hurt };
    });
    console.log('PASS landing dip: stair ' + dip.stair.toFixed(2) + ', 0.6 drop ' + dip.small.toFixed(2) + ', 1.5 fall ' + dip.fall.toFixed(2) + ' rows (damage ' + dip.hurt + '); reduce motion ' + dip.calm.toFixed(2));

    // ---------------------------------------------------------------- heavy-hit shake
    const shake = await page.evaluate(() => {
      // a hit delivered inside a real tick: damagePlayer is what enemies call
      const hit = (dmg, opts) => {
        setup(); Object.assign(GFX, opts || {}); const un = updateNarrow; let done = false;
        updateNarrow = function () { if (!done) { done = true; damagePlayer(dmg, 'Test foe'); } return un.apply(this, arguments); };
        const c = Engine.cam, dir0 = c.dir; let maxY = 0, maxDir = 0, frames = 0; seen.length = 0;
        for (let i = 0; i < 90; i++) { update(1 / 60); render(); const s = seen[seen.length - 1]; maxY = Math.max(maxY, Math.abs(s.bob - c.bob)); maxDir = Math.max(maxDir, Math.abs(s.dir - c.dir)); if (FEEL.state.shake > 0) frames++; }
        updateNarrow = un;
        return { maxY, maxDir, frames, end: FEEL.state.shake, dirDrift: c.dir - dir0, bob: c.bob };
      };
      const hpMax = G.player.hpMax;
      const heavy = hit(Math.ceil(hpMax * 0.4)), light = hit(Math.max(1, Math.floor(hpMax * 0.1))), calm = hit(Math.ceil(hpMax * 0.4), { reduceMotion: true }), noflash = hit(Math.ceil(hpMax * 0.4), { noFlash: true });
      check(heavy.maxY > 1 && heavy.maxDir > 0.004, 'a heavy hit shakes the view (' + heavy.maxY.toFixed(2) + ' rows, ' + heavy.maxDir.toFixed(4) + ' rad)');
      check(heavy.frames > 5 && heavy.end === 0, 'the shake lasts a moment and ends (' + heavy.frames + ' frames)');
      check(light.maxY === 0 && light.maxDir === 0 && light.frames === 0, 'a light hit (' + Math.floor(hpMax * 0.1) + ' of ' + hpMax + ') does not shake');
      check(calm.maxY === 0 && calm.maxDir === 0, 'reduce motion removes the shake');
      check(noflash.maxY > 1, 'no-flash keeps the shake: it is not a flash');
      check(heavy.dirDrift === 0, 'the shake never turns the player');
      return { heavy: heavy.maxY, dir: heavy.maxDir, frames: heavy.frames, hpMax };
    });
    console.log('PASS heavy-hit shake: heavy ' + shake.heavy.toFixed(2) + ' rows / ' + shake.dir.toFixed(4) + ' rad for ' + shake.frames + ' frames (max hp ' + shake.hpMax + '); light none; reduce motion none');

    // ---------------------------------------------------------------- deafness
    const deaf = await page.evaluate(() => {
      setup(); const c = Engine.cam; clearHeading();
      const pn = performance.now; performance.now = () => 5000;
      const cam0 = { x: c.x, y: c.y };
      render(); const base = { g: hgrad(), l: lum() }; const basePx = Array.from(pixels());
      const foe = { x: c.x - Math.cos(c.dir) * 3, y: c.y - Math.sin(c.dir) * 3, def: { chord: true } };
      chordBlast(foe);
      check(FEEL.state.deafT > 1, 'a chord blast deafens');
      for (let i = 0; i < 12; i++) { update(1 / 60); }
      render(); const during = { g: hgrad(), l: lum() };
      check(during.g < base.g * 0.9, 'deafness softens the view horizontally (gradient ' + base.g.toFixed(2) + ' -> ' + during.g.toFixed(2) + ')');
      check(msgs().filter(m => m === 'Your ears ring.').length === 1, 'the written cue "Your ears ring." appears once');
      chordBlast(foe); for (let i = 0; i < 5; i++) update(1 / 60);
      check(msgs().filter(m => m === 'Your ears ring.').length === 1, 'a second chord within seconds does not repeat the cue');
      check(typeof Audio_.muffle === 'function' && Audio_.muffled > 0.3, 'deafness also muffles the sound through the master low-pass (' + Audio_.muffled.toFixed(2) + ')');
      // no flash: with the setting on, the frames under deafness never get brighter than the clear frame
      // each frame is compared with the original renderer in the same state (the world keeps moving meanwhile)
      GFX.noFlash = true; let maxL = 0, rawL = 0, worst = 0;
      for (let i = 0; i < 60; i++) { update(1 / 60); Engine.render(G.ents, G.tod); const a = lum(); FEEL.rawRender.call(Engine, G.ents, G.tod); const b = lum(); if (a / b > worst) { worst = a / b; maxL = a; rawL = b; } }
      check(worst <= 1.005, 'deafness never brightens the view (worst frame ' + maxL.toFixed(2) + ' vs original ' + rawL.toFixed(2) + ')');
      GFX.noFlash = false;
      // it clears
      for (let i = 0; i < 400; i++) update(1 / 60);
      // the world moved on (time of day, the chord's shove), so the clear frame is compared with the ORIGINAL renderer in the same state
      Engine.render(G.ents, G.tod); const after = Array.from(pixels()); FEEL.rawRender.call(Engine, G.ents, G.tod); const raw = Array.from(pixels()); let diff = 0; for (let i = 0; i < after.length; i++) if (after[i] !== raw[i]) diff++;
      check(FEEL.state.deaf === 0 && FEEL.state.deafT === 0, 'deafness clears');
      check(diff === 0, 'the clear frame is byte-identical to the original renderer (' + diff + ' bytes differ)');
      // the felted bell's mute (G.mutedT) also blurs, without the ring cue (the game already prints its own line)
      document.querySelector('#msgs').innerHTML = ''; G.mutedT = 5; for (let i = 0; i < 40; i++) update(1 / 60); render();
      check(FEEL.state.deaf > 0.15, 'muted by a bell: the view softens (' + FEEL.state.deaf.toFixed(2) + ')');
      check(!msgs().includes('Your ears ring.'), 'a mute alone adds no ring cue');
      G.mutedT = 0; for (let i = 0; i < 500; i++) update(1 / 60);
      check(FEEL.state.deaf === 0, 'the mute softening clears');
      // the funeral bell's knock-back goes through codaHitFx
      setup(); const hp = G.player.hp; codaHitFx({ x: c.x - 1, y: c.y, def: {} }, { toll: true });
      performance.now = pn;
      return { base: base.g, during: during.g };
    });
    console.log('PASS deafness: blur ' + deaf.base.toFixed(2) + ' -> ' + deaf.during.toFixed(2) + ' horizontal gradient, one "Your ears ring." cue, clears byte-identical, mute softens, no brightening; sound muffled too');

    // the funeral-bell trigger (random 40%): force the roll
    const bell = await page.evaluate(() => {
      setup(); const rnd = Math.random; Math.random = () => 0.1; const c = Engine.cam;
      codaHitFx({ x: c.x - 2, y: c.y, def: {} }, { toll: true }); Math.random = rnd;
      check(FEEL.state.deafT > 1, 'the funeral bell\'s knock-back deafens too');
      check(msgs().includes('Your ears ring.'), 'and carries the written cue');
      setup(); Math.random = () => 0.9; codaHitFx({ x: c.x - 2, y: c.y, def: {} }, { toll: true }); Math.random = rnd;
      check(FEEL.state.deafT === 0, 'a missed toll does not deafen');
      return true;
    });
    console.log('PASS deafness: funeral-bell knock-back deafens and cues; a miss does not');

    // ---------------------------------------------------------------- Hushed
    const hush = await page.evaluate(() => {
      setup(); const wasSiphoned = G.map.siphoned; G.map.siphoned = true; const c = Engine.cam;
      const pn = performance.now; performance.now = () => 5000;
      render(); const base = { c: chroma(), l: lum() }; const basePx = Array.from(pixels());
      // stand still in siphoned country until the stillness clock passes 5.5 s (at most ten seconds)
      for (let i = 0; i < 60 * 10 && G.stillT < 5.5; i++) update(1 / 60);
      for (let i = 0; i < 30; i++) update(1 / 60);
      render(); const mid = { c: chroma(), l: lum() };
      check(G.stillT > 3 && !G.unwriting, 'standing still builds the Hush without unwriting yet (' + G.stillT.toFixed(1) + 's)');
      check(FEEL.state.hush > 0.2, 'the Hushed effect is up (' + FEEL.state.hush.toFixed(2) + ')');
      check(mid.c < base.c * 0.85, 'colour drains toward grey (chroma ' + base.c.toFixed(1) + ' -> ' + mid.c.toFixed(1) + ')');
      check(mid.l <= base.l * 1.01, 'and it never brightens (' + base.l.toFixed(1) + ' -> ' + mid.l.toFixed(1) + ')');
      check(msgs().some(m => /The Hush is close/.test(m)), 'the written cue prints: ' + msgs().find(m => /Hush/.test(m)));
      const cues = msgs().filter(m => /The Hush is close/.test(m)).length; for (let i = 0; i < 60; i++) update(1 / 60);
      check(msgs().filter(m => /The Hush is close/.test(m)).length === cues, 'the cue does not repeat while the Hush stays');
      // move on: whistle keeps it off, stillT drains
      G.whistleT = 60; for (let i = 0; i < 60 * 9; i++) update(1 / 60);
      Engine.render(G.ents, G.tod); const clear = Array.from(pixels()); FEEL.rawRender.call(Engine, G.ents, G.tod); const raw = Array.from(pixels());
      check(FEEL.state.hush === 0, 'the Hushed effect clears');
      let diff = 0; for (let i = 0; i < clear.length; i++) if (clear[i] !== raw[i]) diff++;
      check(diff === 0, 'the cleared frame is byte-identical to the original renderer (' + diff + ' bytes differ)');
      // an awake Quiet nearby does it too
      G.whistleT = 0; G.stillT = 0; G.map.siphoned = false; setup();
      const q = hydrate({ kind: 'enemy', type: 'quiet', x: c.x + Math.cos(c.dir) * 3, y: c.y + Math.sin(c.dir) * 3 }); q.passive = true; q.transient = true; G.ents.push(q);
      for (let i = 0; i < 120; i++) { q.cool = 99; update(1 / 60); }
      check(FEEL.state.hush > 0.15, 'a Quiet three tiles away hushes the view (' + FEEL.state.hush.toFixed(2) + ')');
      G.ents.splice(G.ents.indexOf(q), 1); for (let i = 0; i < 600; i++) update(1 / 60);
      check(FEEL.state.hush === 0, 'it clears when the Quiet is gone');
      G.map.siphoned = wasSiphoned; performance.now = pn;
      return { base: base.c, mid: mid.c };
    });
    console.log('PASS Hushed: chroma ' + hush.base.toFixed(1) + ' -> ' + hush.mid.toFixed(1) + ' after five still seconds, written cue once, clears byte-identical; an awake Quiet hushes too');

    // ---------------------------------------------------------------- no flashes
    const flash = await page.evaluate(() => {
      setup(); const f = document.querySelector('#fx'); f.className = '';
      fx('hurt', 5000); check(f.className === 'hurt', 'flashes allowed by default: the red hurt flash shows');
      f.className = ''; GFX.noFlash = true;
      for (const cls of ['hurt', 'glass', 'song']) { fx(cls, 5000); check(f.className === '', 'no flashes: fx(' + cls + ') does nothing'); }
      fx('hush', 200); check(f.className === 'hush', 'steady tints (hush) are not flashes and still show'); f.className = '';
      // a heavy hit under no-flash still tells you in words
      const un = updateNarrow, hpMax = G.player.hpMax; let done = false;
      updateNarrow = function () { if (!done) { done = true; damagePlayer(Math.ceil(hpMax * 0.4), 'Test foe'); } return un.apply(this, arguments); };
      update(1 / 60); updateNarrow = un;
      check(msgs().some(m => /Test foe hits you/.test(m)), 'the damage line prints with flashes off');
      check(f.className === '', 'and no flash class was set by it');
      GFX.noFlash = false; return true;
    });
    console.log('PASS no flashes: hurt/glass/song flashes suppressed, steady tints kept, damage still printed');

    // ---------------------------------------------------------------- options rows
    await page.evaluate(() => { setup(); G.state = 'panel'; renderAccessibilityMenu(); });
    const rows = await page.evaluate(() => {
      const q = id => document.getElementById(id);
      check(q('feel-bob') && q('feel-reduce') && q('feel-noflash'), 'the three rows render');
      check(q('gfx-state'), 'the Graphics block from presets.js is still there');
      const grid = document.querySelector('#modal-panel .ctl-grid'), kids = Array.from(grid.children);
      check(kids.indexOf(q('feel-head')) > kids.indexOf(q('gfx-state')), 'our rows come after the Graphics block');
      check(q('feel-bob').textContent === 'Off' && q('feel-reduce').textContent === 'Off' && q('feel-noflash').textContent === 'Off', 'all three read Off by default');
      renderAccessibilityMenu(); check(document.querySelectorAll('#feel-head').length === 1, 'rows are not duplicated on re-render');
      return true;
    });
    await page.locator('#feel-bob').click();
    assert.equal(await page.evaluate(() => GFX.headBob), 'gentle'); assert.equal(await page.locator('#feel-bob').textContent(), 'Gentle');
    assert.equal(await page.locator('#feel-bob').getAttribute('aria-pressed'), 'true');
    await page.locator('#feel-reduce').click(); assert.equal(await page.evaluate(() => GFX.reduceMotion), true); assert.equal(await page.locator('#feel-reduce').textContent(), 'On');
    await page.locator('#feel-noflash').click(); assert.equal(await page.evaluate(() => GFX.noFlash), true); assert.equal(await page.locator('#feel-noflash').textContent(), 'On');
    await page.locator('#feel-bob').click(); await page.locator('#feel-reduce').click(); await page.locator('#feel-noflash').click();
    assert.equal(await page.evaluate(() => [GFX.headBob, GFX.reduceMotion, GFX.noFlash].join()), 'off,false,false');
    // keyboard: Enter on a focused row toggles it
    await page.locator('#feel-noflash').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => GFX.noFlash), true, 'keyboard toggles'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => GFX.noFlash), false);
    // 640x400 compact layout: no horizontal overflow, every button reachable
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { renderAccessibilityMenu(); });
    const fit = await page.evaluate(() => {
      const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel, bad = [];
      const buttons = Array.from(panel.querySelectorAll('button:enabled'));
      for (const b of buttons) { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const q = b.getBoundingClientRect(); if (q.left < -1 || q.right > innerWidth + 1 || q.top < -1 || q.bottom > innerHeight + 1 || q.width < 4) bad.push((b.id || b.textContent) + ' ' + [q.left, q.right, q.top, q.bottom].map(Math.round)); }
      const ours = ['feel-bob', 'feel-reduce', 'feel-noflash'].map(id => document.getElementById(id).getBoundingClientRect().width > 20);
      return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, bad, n: buttons.length, ours };
    });
    assert.equal(fit.panelX && fit.gridX && fit.docX, true, 'compact menu has no horizontal overflow ' + JSON.stringify(fit));
    assert.deepEqual(fit.bad, [], 'compact buttons reachable by scrolling'); assert.deepEqual(fit.ours, [true, true, true]);
    await page.evaluate(() => { document.querySelector('#modal-panel .ctl-grid').scrollTop = 1e6; });
    await page.screenshot({ path: path.join(SHOTS, 'options-feel-640x400.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    // the Options panel itself must still fit (the rows live in the sub-menu, so it is unchanged)
    await page.evaluate(() => { closeModal(); G.state = 'panel'; renderMenu(); });
    assert.equal(await page.locator('#modal-panel button:enabled').evaluateAll(bs => bs.every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })), true, 'Options panel keeps every action on screen');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    console.log('PASS options: Head bob / Reduce motion / No flashes render after the Graphics block, toggle by mouse and keyboard, fit 640x400 (' + fit.n + ' buttons reachable)');

    // ---------------------------------------------------------------- no drift over 1000 frames, with everything firing
    const drift = await page.evaluate(() => {
      setup(); GFX.headBob = 'gentle'; const c = Engine.cam, hpMax = G.player.hpMax;
      c.pitch = 0.37; c.dir = 1.234; const start = { pitch: c.pitch, dir: c.dir };
      let bad = 0, n = 0; G.keys.w = false;
      for (let i = 0; i < 1000; i++) {
        if (i % 120 === 10) { G.player.feet += 1.2; }
        if (i % 150 === 20) { FEEL.heavyHit(0.5); FEEL.deafen(1.5, false); }
        if (i % 200 === 30) G.player.hp = G.player.hpMax;
        const bob0 = c.bob, dir0 = c.dir, pitch0 = c.pitch;
        update(1 / 60); const b1 = c.bob, d1 = c.dir; render(); n++;
        if (c.bob !== b1 || c.dir !== d1 || c.pitch !== pitch0) bad++;
      }
      check(bad === 0, 'render restores cam.bob / dir / pitch exactly in every one of ' + n + ' frames (' + bad + ' failed)');
      check(c.pitch === start.pitch, 'pitch never moved');
      check(Math.abs(c.dir - start.dir) < 1e-12, 'dir never moved (' + (c.dir - start.dir) + ')');
      for (let i = 0; i < 200; i++) update(1 / 60);
      check(Math.abs(c.bob) < 1e-6, 'bob returns to rest (' + c.bob + ')');
      GFX.headBob = 'off'; return { n, pitch: c.pitch, dir: c.dir };
    });
    console.log('PASS no drift: 1000 frames of bob, dips, shakes and deafness; pitch ' + drift.pitch + ' and dir ' + drift.dir + ' exactly as set');

    // ---------------------------------------------------------------- frame cost
    const cost = await page.evaluate(() => {
      setup(); clearHeading(); render();
      const F = __F; check(F && F.fb, 'captured a frame');
      const med = (fn, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); fn(); t.push(performance.now() - a); } t.sort((x, y) => x - y); return t[t.length >> 1]; };
      const st = FEEL.state, r = { size: F.w + 'x' + F.h };
      r.idle = med(() => { FEEL.offsets(); FEEL.post(F); }, 400);
      st.rollDeg = 0.4; r.roll = med(() => FEEL.post(F), 120); st.rollDeg = 0;
      st.hush = 0.6; r.hush = med(() => FEEL.post(F), 120); st.hush = 0;
      st.deaf = 0.5; r.deaf = med(() => FEEL.post(F), 120);
      st.deaf = 1; r.deaf2 = med(() => FEEL.post(F), 120); st.deaf = 0;
      st.rollDeg = 0.4; st.hush = 0.6; st.deaf = 1; r.all = med(() => FEEL.post(F), 120); st.rollDeg = 0; st.hush = 0; st.deaf = 0;
      r.render = med(() => render(), 40);
      return r;
    });
    console.log('COST per call (median ms, ' + cost.size + '): idle offsets+post ' + cost.idle.toFixed(4) + ', roll ' + cost.roll.toFixed(3) + ', hush ' + cost.hush.toFixed(3) + ', deaf ' + cost.deaf.toFixed(3) + ' / full ' + cost.deaf2.toFixed(3) + ', all three ' + cost.all.toFixed(3) + ' (whole render ' + cost.render.toFixed(2) + ')');
    assert.ok(cost.idle < 0.2, 'idle cost is negligible');

    // ---------------------------------------------------------------- screenshots (3x crops of the 3D view)
    const shot = async (name, prep) => {
      const url = await page.evaluate((prepSrc) => {
        setup(); clearHeading(); const pn = performance.now; performance.now = () => 5000;
        eval(prepSrc);
        const S = Engine.getScale(), w = 320 * S, h = 150 * S, o = document.createElement('canvas'); o.width = w * 3; o.height = h * 3;
        const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(Engine.canvas, 0, 0, w, h, 0, 0, w * 3, h * 3);
        performance.now = pn; return o.toDataURL('image/png');
      }, prep);
      fs.writeFileSync(path.join(SHOTS, name), Buffer.from(url.split(',')[1], 'base64'));
    };
    await shot('before-clear.png', 'render();');
    await shot('deaf.png', 'const c = Engine.cam; chordBlast({ x: c.x - 3, y: c.y, def: {} }); for (let i = 0; i < 10; i++) update(1/60); render();');
    await shot('hush.png', 'G.map.siphoned = true; for (let i = 0; i < 360; i++) update(1/60); render(); G.map.siphoned = false; G.whistleT = 0;');
    await shot('shake-frame.png', 'FEEL.heavyHit(0.6); G.time = 1.7; render();');
    await shot('dip-frame.png', 'FEEL.landing(1.0, false); for (let i = 0; i < 6; i++) update(1/60); render();');
    await shot('roll-frame.png', 'GFX.headBob = "gentle"; FEEL.state.rollDeg = 0.4; Engine.render(G.ents, G.tod);');
    await page.evaluate(() => setup());
    console.log('PASS screenshots written to ' + SHOTS);

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS fp-feel: all checks');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
