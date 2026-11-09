// PREVIEW_URL=http://127.0.0.1:3901 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/nerves13.test.js
// Phase 13 NERVES: the Jump-scare switch (Off / Gentle / Full), whispers from behind at high Dissonance, and lights dying
// one by one in long corridors. The game loop is frozen (requestAnimationFrame stubbed) and every step is driven by hand;
// sound is checked by reading what was scheduled on AudioParams and by the geometry the module returns, never by listening.
//   NERVES_SHOTS=/dir writes screenshots there (optional).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.NERVES_SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /nerves13|tick failed|render hook/i.test(m.text()) && !/listener failed/.test(m.text()))) errors.push('console: ' + m.text()); });
    await page.addInitScript(() => { window.__ctxCount = 0; const AC = window.AudioContext; window.AudioContext = function (...a) { window.__ctxCount++; return new AC(...a); }; window.AudioContext.prototype = AC.prototype; });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3901');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Nerves Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => typeof NERVES13 === 'object' && G.state === 'play');
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(120);

    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      if (!Audio_.ctx) Audio_.init();
      window.go = (id, x, y, dir) => { loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.ents = G.map.entities; G.vel.x = G.vel.y = 0; Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = dir; try { DREAD.scan(true); } catch (e) { /* later */ } };
      window.reset = () => {
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; closeModal(); G.dead = false;
        document.querySelectorAll('#ac-captions div').forEach(d => d.remove());
        GFX.reduceMotion = false; GFX.noFlash = false; ACCESS.settings.cap = false; UPG.lantern = false; Weather.hold('clear');
        if (GFX.preset !== 'medium') PRESETS.apply('medium');
        NERVES13.setScares('gentle'); NERVES13.setLights(true); DREAD.setOn(false); NERVES13.seed(12345); DREAD.seed(777);
        NERVES13.wst.active = null; NERVES13.wst.t = 5; NERVES13.resetLights(true);
        G.vel.x = G.vel.y = 0; G.tod = 0.5; G.fadeT = 0;
      };
      window.caps = () => Array.from(document.querySelectorAll('#ac-captions div')).map(d => d.textContent);
      window.frame = () => { Engine.setTime(5); Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data; };
      window.hash = (d) => { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i += 4) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; h ^= d[i + 1]; h = Math.imul(h, 16777619) >>> 0; h ^= d[i + 2]; h = Math.imul(h, 16777619) >>> 0; } return h; };
      // the ptLights of the last frame
      window.__lights = 0; Engine.addPostHook((F) => { window.__lights = F.ptLights ? F.ptLights.length : 0; window.__flash = F.wx ? F.wx.flash : 0; }, 300);
    });
    const run = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); };

    // ================================================================ 1. the switch
    const sw = await run(() => {
      reset();
      localStorage.removeItem('octave.nerves13.v1');
      check(NERVES13.scaresAllowed() === 'gentle', 'default is gentle');
      check(window.NERVES13 === NERVES13 && typeof NERVES13.onChange === 'function', 'API is on window');
      const seen = [], un = NERVES13.onChange(v => seen.push(v));
      NERVES13.setScares('off'); NERVES13.setScares('off'); NERVES13.setScares('full'); NERVES13.setScares('bogus'); NERVES13.setScares('gentle');
      check(JSON.stringify(seen) === '["off","full","gentle"]', 'onChange fires once per real change, never for junk: ' + JSON.stringify(seen));
      un(); NERVES13.setScares('off'); check(seen.length === 3, 'unsubscribe works');
      let thrown = 0; const bad = NERVES13.onChange(() => { thrown++; throw new Error('listener'); }); const ok = []; const good = NERVES13.onChange(v => ok.push(v));
      NERVES13.setScares('full'); check(thrown === 1 && ok.length === 1, 'a throwing listener does not stop the others'); bad(); good();
      check(JSON.parse(localStorage.getItem('octave.nerves13.v1')).s === 'full', 'persisted');
      NERVES13.set.scares = 'gentle'; NERVES13.load(); check(NERVES13.scaresAllowed() === 'full', 'load() restores the stored level');
      localStorage.setItem('octave.nerves13.v1', '{"s":"evil","l":7}'); NERVES13.load(); check(NERVES13.scaresAllowed() === 'full' && NERVES13.set.lights === true, 'hostile stored value ignored');
      localStorage.setItem('octave.nerves13.v1', 'not json'); NERVES13.load(); check(NERVES13.scaresAllowed() === 'full', 'unparseable stored value ignored');
      NERVES13.setScares('gentle');
      check(NERVES13.pick(1, 2, 3) === 2 && NERVES13.stingerGain() === 0.5 && NERVES13.attackSeconds() === 0.3, 'helpers follow the level');
      return { seen };
    });
    console.log('PASS switch: default gentle, onChange once per change, persists, hostile values ignored', JSON.stringify(sw.seen));

    // ---- Off suppresses the wrapped stingers (the effect bus is held down and swells), Gentle softens, Full is as designed
    const st = await run(() => {
      reset();
      const calls = [], gain = Audio_.sfxBus.gain, P = Object.getPrototypeOf(gain);
      const sv = P.setValueAtTime, lr = P.linearRampToValueAtTime;
      P.setValueAtTime = function (v, t) { if (this === gain) calls.push(['set', +v.toFixed(3)]); return sv.apply(this, arguments); };
      P.linearRampToValueAtTime = function (v, t) { if (this === gain) calls.push(['ramp', +v.toFixed(3), +(t - Audio_.ctx.currentTime).toFixed(2)]); return lr.apply(this, arguments); };
      const out = {};
      try {
        for (const lvl of ['off', 'gentle', 'full']) {
          NERVES13.setScares(lvl); out[lvl] = {};
          for (const name of NERVES13.STINGERS) {
            calls.length = 0; const before = NERVES13.stats.softened[name] || 0;
            Audio_.sfx[name]();
            out[lvl][name] = { calls: calls.slice(), softened: (NERVES13.stats.softened[name] || 0) - before };
          }
        }
      } finally { P.setValueAtTime = sv; P.linearRampToValueAtTime = lr; }
      return out;
    });
    for (const name of ['crack', 'press', 'golem', 'hound', 'thunder', 'bellDie']) {
      const off = st.off[name], gen = st.gentle[name], full = st.full[name];
      assert.equal(off.softened, 1, name + ' is softened at Off'); assert.equal(gen.softened, 1, name + ' is softened at Gentle'); assert.equal(full.softened, 0, name + ' is as designed at Full');
      assert.deepEqual(full.calls, [], name + ' at Full does not touch the bus');
      const peakOff = off.calls.find(c => c[0] === 'ramp'), peakGen = gen.calls.find(c => c[0] === 'ramp');
      assert.ok(off.calls[0][0] === 'set' && off.calls[0][1] <= 0.12, name + ' Off starts low: ' + JSON.stringify(off.calls));
      assert.ok(peakOff[1] <= 0.22 + 1e-6 && peakOff[2] >= 0.85, name + ' Off peaks at 0.22 over 0.9 s: ' + JSON.stringify(peakOff));
      assert.ok(peakGen[1] <= 0.5 + 1e-6 && peakGen[2] >= 0.25 && peakGen[2] < 0.5, name + ' Gentle peaks at 0.5 over 0.3 s: ' + JSON.stringify(peakGen));
    }
    console.log('PASS stingers: Off swells to 0.22 over 0.9 s, Gentle to 0.5 over 0.3 s, Full untouched (crack, press, golem, hound, thunder, bellDie)');

    // ---- the pictures: the death screen fades in, the view flashes ease in, lightning is capped
    const pic = await run(() => {
      reset(); const out = {};
      for (const lvl of ['off', 'gentle', 'full']) {
        NERVES13.setScares(lvl);
        die('a test'); const cs = getComputedStyle($('#death')); out['death_' + lvl] = [cs.animationName, cs.animationDuration];
        $('#btn-wake').click(); G.state = 'play'; G.dead = false;
        const fs_ = getComputedStyle($('#fx')); out['fx_' + lvl] = [fs_.transitionDuration, fs_.opacity];
        Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 1 }); Engine.render(G.ents, G.tod); out['flash_' + lvl] = window.__flash;
      }
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 0 });
      GFX.noFlash = true; NERVES13.setScares('full'); Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 1 }); Engine.render(G.ents, G.tod); out.flash_noflash = window.__flash; GFX.noFlash = false;
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, flash: 0 });
      return out;
    });
    assert.deepEqual(pic.death_off, ['n13-fade', '1.6s']); assert.deepEqual(pic.death_gentle, ['n13-fade', '0.7s']); assert.equal(pic.death_full[0], 'none');
    assert.equal(pic.fx_off[0], '0.6s'); assert.equal(pic.fx_gentle[0], '0.3s'); assert.equal(pic.fx_full[0], '0.12s');
    assert.ok(pic.flash_off > 0.4 && pic.flash_off <= 0.45 + 1e-6, 'lightning capped at Off: ' + pic.flash_off); assert.ok(pic.flash_gentle > 0.65 && pic.flash_gentle <= 0.7 + 1e-6, 'capped at Gentle: ' + pic.flash_gentle);
    assert.ok(pic.flash_full > 0.95, 'Full: as designed ' + pic.flash_full); assert.equal(pic.flash_noflash, 0, 'No flashes still wins');
    console.log('PASS pictures: death fades 1.6 s / 0.7 s / none, #fx eases 600 / 300 / 120 ms, lightning 0.45 / 0.7 / 1, No flashes still zero', JSON.stringify(pic));

    // ================================================================ 2. whispers from behind
    const geo = await run(() => {
      reset(); go('clearing', 20.5, 32.5, 0);
      const res = [];
      for (let k = 0; k < 8; k++) {
        const dir = k * Math.PI / 4 - Math.PI + 0.1;
        for (const off of [-0.35, -0.1, 0, 0.1, 0.35]) {
          const L = { x: 28.5, y: 28.5, dir }, m = NERVES13.whisperMix(L, off, 3.2, 0);
          const relExpect = ((Math.PI + off + Math.PI) % (2 * Math.PI)) - Math.PI;
          const a = Math.atan2(m.pos.y - L.y, m.pos.x - L.x) - dir; const rel = Math.atan2(Math.sin(a), Math.cos(a));
          check(m.behind && Math.abs(Math.cos(rel) + Math.cos(off)) < 1e-9, 'behind at dir ' + dir + ' off ' + off);
          check(Math.abs(Math.abs(rel) - (Math.PI - Math.abs(off))) < 1e-9, 'angle is pi - |off|');
          // a positive offset is to the listener's left: negative pan; dead astern is centred
          check(off === 0 ? Math.abs(m.pan) < 1e-9 : Math.sign(m.pan) === -Math.sign(off), 'pan sign at off ' + off + ': ' + m.pan);
          check(Math.abs(m.pan) <= SPATIAL.MAX_PAN + 1e-9, 'pan within the spatial limit');
          // the same distance in front is brighter than behind
          const front = SPATIAL.mix(L, { x: L.x + Math.cos(dir) * 3.2, y: L.y + Math.sin(dir) * 3.2 }, 0);
          check(m.cutoff < Math.min(front.cutoff, 3200), 'behind is duller than the same sound in front');
          res.push(m.pan);
        }
      }
      // gain falls with distance, as spatial-audio's own curve does
      const L = { x: 10, y: 10, dir: 0 };
      check(NERVES13.whisperMix(L, 0, 2.4, 0).gain >= NERVES13.whisperMix(L, 0, 4.6, 0).gain, 'nearer is not quieter');
      return res.length;
    });
    console.log('PASS whisper geometry: always behind (angle pi - |off|), pan sign opposite the offset, duller than in front,', geo, 'cases');

    const wh = await run(() => {
      const out = {};
      // Dread off: nothing
      reset(); go('clearing', 20.5, 32.5, 0); DREAD.st.D = 90; NERVES13.wst.t = 0.1;
      for (let i = 0; i < 400; i++) NERVES13.whisperTick(0.25);
      out.dreadOff = NERVES13.stats.whispers;
      // Dread on but below the threshold
      reset(); DREAD.setOn(true); go('clearing', 20.5, 32.5, 0); DREAD.st.mapT = 99; DREAD.st.cd = 99; DREAD.st.D = 50; NERVES13.wst.t = 0.1; const w0 = NERVES13.stats.whispers;
      for (let i = 0; i < 400; i++) { DREAD.st.D = 50; NERVES13.whisperTick(0.25); }
      out.below = NERVES13.stats.whispers - w0;
      // above: frequency scales with Dissonance
      const count = (D) => { reset(); DREAD.setOn(true); go('clearing', 20.5, 32.5, 0); DREAD.st.mapT = 99; DREAD.st.cd = 99; NERVES13.wst.t = 0.1; NERVES13.wst.active = null; const w = NERVES13.stats.whispers; for (let i = 0; i < 960; i++) { DREAD.st.D = D; NERVES13.whisperTick(0.25); } return NERVES13.stats.whispers - w; };
      out.d60 = count(60); out.d80 = count(80); out.d100 = count(100);
      out.gap = [55, 77.5, 100].map(d => NERVES13.whisperGap(d));
      // never in dialogue / a panel, never when dead
      reset(); DREAD.setOn(true); go('clearing', 20.5, 32.5, 0); DREAD.st.mapT = 99; DREAD.st.D = 95; NERVES13.wst.t = 0.1;
      G.state = 'dialogue'; const w1 = NERVES13.stats.whispers; for (let i = 0; i < 200; i++) { DREAD.st.D = 95; NERVES13.whisperTick(0.25); } out.dialogue = NERVES13.stats.whispers - w1;
      G.state = 'panel'; for (let i = 0; i < 200; i++) { DREAD.st.D = 95; NERVES13.whisperTick(0.25); } out.panel = NERVES13.stats.whispers - w1;
      G.state = 'play'; G.dead = true; for (let i = 0; i < 200; i++) { DREAD.st.D = 95; NERVES13.whisperTick(0.25); } out.dead = NERVES13.stats.whispers - w1; G.dead = false;
      // never in the Hedge (Oakhaven) either
      go('oakhaven', 39.5, 6.5, 0); DREAD.st.mapT = 99; for (let i = 0; i < 400; i++) { DREAD.st.D = 95; NERVES13.whisperTick(0.25); } out.hedge = NERVES13.stats.whispers - w1;
      return out;
    });
    assert.equal(wh.dreadOff, 0, 'no whispers with Dread off'); assert.equal(wh.below, 0, 'none below the threshold');
    assert.ok(wh.d60 >= 2 && wh.d80 > wh.d60 && wh.d100 > wh.d80, 'frequency rises with Dissonance: ' + [wh.d60, wh.d80, wh.d100]);
    assert.deepEqual(wh.gap, [26, 17.5, 9]); assert.equal(wh.dialogue, 0); assert.equal(wh.panel, 0); assert.equal(wh.dead, 0); assert.equal(wh.hedge, 0, 'not in the Hedge');
    console.log('PASS whispers: only with Dread on above 55; counts in 240 s at D 60/80/100 =', [wh.d60, wh.d80, wh.d100], '; none in dialogue, panels, death, the Hedge');

    const turn = await run(() => {
      reset(); DREAD.setOn(true); ACCESS.settings.cap = true; go('clearing', 20.5, 32.5, 0.7); DREAD.st.D = 90;
      const nodes0 = NERVES13.stats.nodes;
      const w = NERVES13.startWhisper(false);
      check(w && w.mix.behind, 'a whisper began, behind');
      check(w.plan.phones.length >= 3 && w.plan.phones.length <= 6, 'a fragment of 3-6 phones');
      check(NERVES13.stats.nodes > nodes0 && !!w.voice, 'audio nodes built: ' + (NERVES13.stats.nodes - nodes0));
      check(caps().includes('[whispering behind you]'), 'caption shown: ' + JSON.stringify(caps()));
      // a small turn: still behind, keeps going
      Engine.cam.dir += 0.5; NERVES13.whisperTick(0.05);
      check(NERVES13.wst.active === w, 'a 29 degree turn does not stop it');
      // turn round: the source is now in front
      const cuts0 = NERVES13.stats.cuts; Engine.cam.dir += Math.PI * 0.6; NERVES13.whisperTick(0.05);
      check(NERVES13.wst.active === null && NERVES13.stats.cuts === cuts0 + 1 && w.cut === 'turn', 'turning to face it stops it');
      check(NERVES13.wst.t >= 4, 'and it keeps quiet for a while');
      // with captions off there is no caption
      ACCESS.settings.cap = false; document.querySelectorAll('#ac-captions div').forEach(d => d.remove()); NERVES13.startWhisper(false);
      check(caps().length === 0, 'no caption with captions off');
      NERVES13.cutWhisper('test');
      return { count: NERVES13.stats.whispers, ctx: window.__ctxCount };
    });
    assert.equal(turn.ctx, 1, 'one AudioContext only');
    console.log('PASS whisper behaviour: 3-6 phones, nodes built, caption "[whispering behind you]", stops when you turn, no caption when captions are off');

    // ================================================================ 3. lights dying one by one
    const lights = await run(() => {
      const out = { corridors: [] };
      reset();
      for (const c of NERVES13.CORRIDORS) {
        go(c.map, c.axis === 'h' ? c.a0 + 0.5 : c.y0 + 0.5, c.axis === 'h' ? c.y0 + 0.5 : c.a0 + 0.5, 0);
        const t = NERVES13.torchesOf(c);
        check(NERVES13.cellsOf(c).every(([x, y]) => !G.map.isSolidCell(x, y)), c.id + ': every corridor cell is open');
        check(t.length >= 2, c.id + ': at least two torches (' + t.length + ')');
        check(t.every(e => e.transient === true && e.solid === false && G.map.entities.includes(e) && G.map.entities.indexOf(e) >= G.map.baseCount), c.id + ': transient, past baseCount, not solid');
        // each torch stands against a wall, inside the corridor cell
        check(t.every(e => { const cx = e.x | 0, cy = e.y | 0; return !G.map.isSolidCell(cx, cy) && (Math.abs(e.x - cx - 0.5) > 0.3 || Math.abs(e.y - cy - 0.5) > 0.3); }), c.id + ': torches sit in a wall face');
        out.corridors.push([c.id, c.map, t.length, c.when]);
      }
      return out;
    });
    assert.ok(lights.corridors.length >= 3 && lights.corridors.length <= 5, '3-5 corridors');
    console.log('PASS corridors:', JSON.stringify(lights.corridors));

    const seq = await run(() => {
      const out = {};
      reset(); const c = NERVES13.CORRIDORS.find(x => x.id === 'rv_gallery');
      go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; UPG.lantern = true;
      const list = NERVES13.torchesOf(c);
      const sprites = () => list.map(e => e.sprite);
      out.before = { sprites: sprites(), glow: list.map(e => e.glow), lights: (frame(), window.__lights) };
      // walk east a little (the player stays inside the corridor), step 0.25 s at a time
      const times = [], order = [];
      let t = 0;
      for (let i = 0; i < 160; i++) {
        t += 0.25; Engine.cam.x = Math.min(3.5 + t * 0.4, 8);
        const before = NERVES13.stats.outs; NERVES13.lightsTick(0.25);
        if (NERVES13.stats.outs > before) { times.push(+t.toFixed(2)); order.push(NERVES13.lst.order[NERVES13.lst.order.length - 1].x); }
        if (list.every(e => e._n13.st === 'out')) break;
      }
      // every torch ahead (at least 2.2 cells away along x) went out; the nearest first
      out.times = times; out.order = order; out.final = list.map(e => [e.x, e._n13.st, e.sprite, e.glow, e.lightCol]);
      frame(); out.lightsOut = window.__lights;
      out.lantern = !!LIGHTING.lanternLight();
      out.camX = Engine.cam.x;
      // the player's lantern still lights: the lantern is one of the frame's lights, and the torches' are gone
      return out;
    });
    assert.ok(seq.times.length >= 3, 'several torches went out one by one: ' + JSON.stringify(seq.times));
    assert.ok(seq.times[0] >= 1.25 && seq.times[0] <= 1.75, 'the first after about 1.3 s: ' + seq.times[0]);
    for (let i = 1; i < seq.times.length; i++) assert.ok(seq.times[i] - seq.times[i - 1] >= 1.7 - 1e-6 && seq.times[i] - seq.times[i - 1] <= 2.9, 'gap 1.7-2.6 s: ' + seq.times);
    for (let i = 1; i < seq.order.length; i++) assert.ok(seq.order[i] > seq.order[i - 1], 'in order, nearest ahead first: ' + seq.order);
    assert.ok(seq.order[0] > 3.5 + 2.2, 'never the torch right beside the player');
    assert.ok(seq.final.filter(f => f[1] === 'out').length >= 3 && seq.final.filter(f => f[1] === 'out').every(f => f[2] === 'p13n_torch_out' && f[3] === 0 && f[4] === null), 'dead torches have no light and the dead sprite');
    assert.ok(seq.before.sprites.every(s => s === 'torch') && seq.before.glow.every(g => g === 0.8), 'all lit before');
    assert.ok(seq.lightsOut < seq.before.lights && seq.lantern, 'fewer lights in the frame, the lantern still burns: ' + seq.before.lights + ' -> ' + seq.lightsOut);
    console.log('PASS lights out: first at', seq.times[0], 's, then', JSON.stringify(seq.times.slice(1)), '; order', JSON.stringify(seq.order), '; frame lights', seq.before.lights, '->', seq.lightsOut);

    const relight = await run(() => {
      const out = {};
      reset(); const c = NERVES13.CORRIDORS.find(x => x.id === 'rv_gallery');
      go('rootvault', 3.5, 5.5, 0); G.tod = 0.92;
      let list = NERVES13.torchesOf(c);
      let t = 0; for (let i = 0; i < 120 && !list.every(e => e._n13.st === 'out'); i++) { t += 0.25; Engine.cam.x = Math.min(3.5 + t * 0.4, 8); NERVES13.lightsTick(0.25); }
      const nOut = list.filter(e => e._n13.st === 'out').length; out.nOut = nOut;
      // the player leaves: walk out of the corridor (south is a wall; step through to the far room by teleport inside the same map)
      Engine.cam.x = 24.5; Engine.cam.y = 5.5;
      const relitAt = [], order = NERVES13.lst.order.slice();
      let t2 = 0; for (let i = 0; i < 80; i++) { t2 += 0.25; const c0 = NERVES13.stats.relights; NERVES13.lightsTick(0.25); if (NERVES13.stats.relights > c0) relitAt.push(+t2.toFixed(2)); }
      out.relitAt = relitAt; out.after = list.map(e => [e._n13.st, e.sprite, e.glow, JSON.stringify(e.lightCol)]);
      out.sameOrder = JSON.stringify(order.map(e => e.x));
      // an unattended hold: the player stays, everything is relit after 55 s from the first, then stays lit for a cool-down while they stand there
      reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; t = 0; list = NERVES13.torchesOf(c);
      const first = NERVES13.stats.relights; let sawOut = 0;
      for (let i = 0; i < 400; i++) { t += 0.25; NERVES13.lightsTick(0.25); sawOut = Math.max(sawOut, list.filter(e => e._n13.st !== 'lit').length); if (NERVES13.stats.relights > first) break; }
      out.holdAt = t; out.sawOut = sawOut;
      // leaving the map relights at once
      reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; t = 0; list = NERVES13.torchesOf(c); for (let i = 0; i < 40; i++) { t += 0.25; Engine.cam.x = 3.5 + t * 0.2; NERVES13.lightsTick(0.25); }
      const outBefore = list.filter(e => e._n13.st !== 'lit').length; go('quarry', 9.1, 35.5, 0);
      out.mapOut = [outBefore, list.filter(e => e._n13.st !== 'lit').length, list.every(e => e.sprite === 'torch' && e.glow === 0.8)];
      return out;
    });
    assert.ok(relight.nOut >= 3);
    assert.ok(relight.relitAt.length === relight.nOut, 'every dead torch relit one by one: ' + JSON.stringify(relight.relitAt));
    assert.ok(relight.relitAt[0] >= 3.9 && relight.relitAt[0] <= 4.4, 'about 4 s after the player left: ' + relight.relitAt[0]);
    for (let i = 1; i < relight.relitAt.length; i++) assert.ok(relight.relitAt[i] - relight.relitAt[i - 1] >= 0.45, 'one at a time');
    assert.ok(relight.after.every(a => a[0] === 'lit' && a[1] === 'torch' && a[2] === 0.8 && a[3] === '[66,34,9]'), 'all lit again with their own light: ' + JSON.stringify(relight.after));
    assert.ok(relight.holdAt >= 55 && relight.holdAt <= 70 && relight.sawOut >= 3, 'hold timeout relights after about 55 s: ' + relight.holdAt);
    assert.deepEqual(relight.mapOut.slice(0, 1).map(x => x > 0), [true]); assert.equal(relight.mapOut[1], 0); assert.equal(relight.mapOut[2], true, 'leaving the map relights at once');
    console.log('PASS relight: one by one in the order they died, first about 4 s after leaving at', relight.relitAt[0], '; hold timeout at', relight.holdAt, 's; instant on map change');

    const rules = await run(() => {
      const out = {};
      // day: the "night" corridors stay lit, the "always" one does not
      const run1 = (id, tod) => {
        reset(); const c = NERVES13.CORRIDORS.find(x => x.id === id);
        go(c.map, c.axis === 'h' ? c.a0 + 0.5 : c.y0 + 0.5, c.axis === 'h' ? c.y0 + 0.5 : c.a0 + 0.5, c.axis === 'h' ? 0 : Math.PI / 2); G.tod = tod;
        const o0 = NERVES13.stats.outs; let t = 0;
        for (let i = 0; i < 120; i++) { t += 0.25; if (c.axis === 'h') Engine.cam.x = Math.min(c.a0 + 0.5 + t * 0.4, c.a1 - 2); else Engine.cam.y = Math.min(c.a0 + 0.5 + t * 0.4, c.a1 - 2); NERVES13.lightsTick(0.25); }
        return NERVES13.stats.outs - o0;
      };
      out.cat_east_day = run1('cat_east', 0.5); out.cat_east_night = run1('cat_east', 0.95);
      out.quarry_day = run1('quarry_shaft', 0.45); out.quarry_night = run1('quarry_shaft', 0.05);
      out.gr_day = run1('gr_passage', 0.5); out.gr_night = run1('gr_passage', 0.97);
      out.rv_day = run1('rv_gallery', 0.5); out.cat_west_day = run1('cat_west', 0.5);
      // never in a town or outdoors, whatever the table says
      const fake = { id: 'x', map: 'oakhaven', axis: 'h', a0: 10, a1: 20, y0: 10, y1: 10, when: 'always' };
      reset(); go('oakhaven', 39.5, 6.5, 0); out.town = NERVES13.eligible(fake, G.map);
      go('tavern', 3.5, 3.5, 0); out.tavern = NERVES13.eligible(Object.assign({}, fake, { map: 'tavern' }), G.map);
      go('deepwoods', 28.5, 28.5, 0); out.outdoor = NERVES13.eligible(Object.assign({}, fake, { map: 'deepwoods' }), G.map);
      // walk Oakhaven at night for a minute: nothing happens, no torch exists there
      go('oakhaven', 39.5, 6.5, 0); G.tod = 0.95; const o1 = NERVES13.stats.outs; for (let i = 0; i < 240; i++) NERVES13.lightsTick(0.25);
      out.oakOuts = NERVES13.stats.outs - o1; out.oakTorches = G.map.entities.filter(e => e._n13).length;
      // a chasing foe stops it
      reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; const foe = hydrate({ kind: 'enemy', type: 'hound', x: 6.5, y: 5.5 }); foe.state = 'chase'; G.map.entities.push(foe); G.ents = G.map.entities;
      const o2 = NERVES13.stats.outs; for (let i = 0; i < 80; i++) NERVES13.lightsTick(0.25); out.chased = NERVES13.stats.outs - o2;
      foe.dead = true;
      // panels pause it
      reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; G.state = 'panel'; const o3 = NERVES13.stats.outs; for (let i = 0; i < 80; i++) NERVES13.lightsTick(0.25); out.panel = NERVES13.stats.outs - o3; G.state = 'play';
      return out;
    });
    assert.equal(rules.cat_east_day, 0, 'cat_east is off by day'); assert.ok(rules.cat_east_night >= 1, 'cat_east dims at night');
    assert.equal(rules.quarry_day, 0); assert.ok(rules.quarry_night >= 1); assert.equal(rules.gr_day, 0); assert.ok(rules.gr_night >= 1);
    assert.ok(rules.rv_day >= 2 && rules.cat_west_day >= 1, 'the Hush-touched corridors dim by day too');
    assert.equal(rules.town, false); assert.equal(rules.tavern, false); assert.equal(rules.outdoor, false);
    assert.equal(rules.oakOuts, 0); assert.equal(rules.oakTorches, 0); assert.equal(rules.chased, 0, 'not while a foe chases'); assert.equal(rules.panel, 0, 'not in a panel');
    console.log('PASS rules: day-off for night corridors', JSON.stringify([rules.cat_east_day, rules.quarry_day, rules.gr_day]), 'night on', JSON.stringify([rules.cat_east_night, rules.quarry_night, rules.gr_night]), '; never in towns, outdoors, while chased or in panels');

    const gentle = await run(() => {
      const out = {};
      const sprites = (flags) => {
        reset(); Object.assign(GFX, flags); const c = NERVES13.CORRIDORS.find(x => x.id === 'rv_gallery');
        go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; const e = NERVES13.torchesOf(c)[1], seen = [];
        let t = 0; for (let i = 0; i < 40; i++) { t += 0.05; Engine.cam.x = 3.5; NERVES13.lightsTick(0.05); const s = e.sprite; if (seen[seen.length - 1] !== s) seen.push(s); }
        // run on to see this torch's whole story
        for (let i = 0; i < 400 && e._n13.st !== 'out'; i++) { NERVES13.lightsTick(0.05); const s = e.sprite; if (seen[seen.length - 1] !== s) seen.push(s); }
        return seen;
      };
      out.plain = sprites({ noFlash: false, reduceMotion: false }); out.noFlash = sprites({ noFlash: true, reduceMotion: false }); out.reduce = sprites({ noFlash: false, reduceMotion: true });
      GFX.noFlash = false; GFX.reduceMotion = false;
      return out;
    });
    assert.deepEqual(gentle.noFlash, ['torch', 'p13n_torch_low', 'p13n_torch_out'], 'No flashes: low then out, no flicker: ' + JSON.stringify(gentle.noFlash));
    assert.deepEqual(gentle.reduce, ['torch', 'p13n_torch_low', 'p13n_torch_out']);
    assert.deepEqual(gentle.plain, ['torch', 'p13n_torch_low', 'torch', 'p13n_torch_low', 'p13n_torch_out'], 'otherwise a single flicker back: ' + JSON.stringify(gentle.plain));
    console.log('PASS No flashes / Reduce motion: low then out, no flicker; otherwise one flicker', JSON.stringify(gentle.plain));

    // ---- no saved state, and switches off = identical
    const off = await run(() => {
      const out = {};
      reset(); NERVES13.setLights(false); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92;
      const sig = () => JSON.stringify(G.map.entities.map(e => [e.sprite, e.x, e.y, e.glow, e.hidden]));
      out.sigOff = sig(); out.frameOff = hash(frame()); out.entsOff = G.map.entities.length;
      NERVES13.setLights(true); out.entsOn = G.map.entities.length; out.frameOn = hash(frame());
      NERVES13.setLights(false); out.sigAgain = sig(); out.frameAgain = hash(frame());
      // the snapshot never carries the torches or any module flag
      NERVES13.setLights(true);
      let t = 0; for (let i = 0; i < 60; i++) { t += 0.25; Engine.cam.x = 3.5 + t * 0.2; NERVES13.lightsTick(0.25); }
      out.someOut = G.map.entities.filter(e => e._n13 && e._n13.st !== 'lit').length;
      const snap = JSON.parse(JSON.stringify(snapshotGame())), text = JSON.stringify(snap);
      out.snapHasModule = /p13n|_n13|torch/i.test(text);
      out.flagKeys = Object.keys(snap.flags).filter(k => /^p13n_/.test(k));
      out.extra = (snap.maps.rootvault.extra || []).length; out.ents = snap.maps.rootvault.ents.length; out.base = G.map.baseCount;
      // a save made mid-dark loads clean
      restoreGame(snap); G.state = 'play'; G.ents = G.map.entities;
      out.afterLoad = G.map.entities.filter(e => e._n13 && e._n13.st !== 'lit').length;
      // the Original preset turns the lights off
      NERVES13.setLights(true); PRESETS.apply('original'); out.original = [GFX.dyingLights, G.map.entities.filter(e => e._n13).length]; PRESETS.apply('medium');
      out.mediumBack = [GFX.dyingLights, G.map.entities.filter(e => e._n13).length > 0];
      return out;
    });
    assert.equal(off.sigOff, off.sigAgain, 'switch off twice = identical entity list'); assert.equal(off.frameOff, off.frameAgain, 'and identical frame');
    assert.ok(off.entsOn > off.entsOff, 'switch on adds the torches'); assert.notEqual(off.frameOn, off.frameOff, 'which show');
    assert.ok(off.someOut >= 1 && !off.snapHasModule && off.flagKeys.length === 0 && off.extra === 0 && off.ents === off.base, 'no saved state: ' + JSON.stringify(off));
    assert.equal(off.afterLoad, 0, 'a save made mid-dark loads lit'); assert.deepEqual(off.original, [false, 0], 'Original preset: no dying lights'); assert.deepEqual(off.mediumBack, [true, true]);
    console.log('PASS switches: lights off = identical list and frame, nothing in the save (flags, extras, torches), Original preset leaves them off');

    const full = await run(() => {
      reset(); NERVES13.setScares('full'); const d0 = NERVES13.stats.ducks; Audio_.sfx.crack(); Audio_.sfx.hound(); const duck = NERVES13.stats.ducks - d0;
      document.body.className.includes('n13') && 0;
      return { duck, body: document.body.className };
    });
    assert.equal(full.duck, 0); assert.ok(!/n13-/.test(full.body), 'Full: no body class, original CSS');
    console.log('PASS Full: stingers untouched and no CSS override');

    // ================================================================ screenshots, Options row at 640x400
    await run(() => { reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; UPG.lantern = false; });
    await run(() => { Engine.render(G.ents, G.tod); drawHUD(); });
    await shot('01-gallery-lit.png');
    await run(() => { const list = NERVES13.torchesOf(NERVES13.CORRIDORS[0]); let t = 0; for (let i = 0; i < 80; i++) { t += 0.25; NERVES13.lightsTick(0.25); } Engine.render(G.ents, G.tod); drawHUD(); window.__outN = list.filter(e => e._n13.st === 'out').length; });
    await shot('02-gallery-dying.png');
    await run(() => { UPG.lantern = true; Engine.render(G.ents, G.tod); drawHUD(); });
    await shot('03-gallery-dark-lantern.png');
    await run(() => { reset(); closeModal(); G.state = 'panel'; renderAccessibilityMenu(); });
    const row = page.locator('#nerves13-scares');
    assert.equal(await row.textContent(), 'Gentle');
    await row.click(); assert.equal(await row.textContent(), 'Full'); await row.click(); assert.equal(await row.textContent(), 'Off'); await row.click(); assert.equal(await row.textContent(), 'Gentle');
    assert.equal(await run(() => NERVES13.scaresAllowed()), 'gentle'); assert.equal(await run(() => JSON.parse(localStorage.getItem('octave.nerves13.v1')).s), 'gentle');
    const lrow = page.locator('#nerves13-lights'); assert.equal(await lrow.textContent(), 'On'); await lrow.click(); assert.equal(await lrow.textContent(), 'Off'); assert.equal(await run(() => NERVES13.set.lights), false); await lrow.click();
    assert.equal(await page.locator('#nerves13-scares').count(), 1, 'one row, however often the menu is drawn');
    await run(() => { closeModal(); G.state = 'panel'; renderAccessibilityMenu(); }); assert.equal(await page.locator('#nerves13-scares').count(), 1);
    await shot('04-options-1280.png');
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'options panel: no horizontal overflow at 640x400');
    await page.locator('#nerves13-scares').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#nerves13-scares').evaluate(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 20; }), true, 'the Jump scares button is inside the screen at 640x400');
    await shot('05-options-640.png');
    await run(() => { closeModal(); reset(); go('rootvault', 3.5, 5.5, 0); G.tod = 0.92; UPG.lantern = true; for (let i = 0; i < 80; i++) NERVES13.lightsTick(0.25); Engine.render(G.ents, G.tod); drawHUD(); });
    await shot('06-gallery-640.png');
    const fits = await run(() => ({ overflowX: document.documentElement.scrollWidth > innerWidth + 1 }));
    assert.equal(fits.overflowX, false, 'no horizontal page scroll at 640x400');
    console.log('PASS Options: Jump scares cycles Gentle > Full > Off > Gentle and persists; Dying lights toggles; one row each; fits 640x400');
    await page.setViewportSize({ width: 1280, height: 800 });

    // French: every player-visible string is in tools/i18n/p13-nerves.tsv
    const tsv = new Map(fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p13-nerves.tsv'), 'utf8').split('\n').filter(l => l && l[0] !== '#').map(l => l.split('\t')));
    const cat = await run(() => NERVES13.catalog().map(c => c.en));
    for (const en of cat) assert.ok(tsv.get(en) && tsv.get(en).length > 3, 'French line missing for: ' + en);
    for (const [en, fr] of tsv) { assert.ok(cat.includes(en), 'TSV line the game never shows: ' + en); assert.ok(!/\s{2,}|[ ]$/.test(fr), 'stray spaces: ' + fr); }
    console.log('PASS French: ' + cat.length + ' strings, all in tools/i18n/p13-nerves.tsv');

    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS nerves13: no page errors');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e.message || e); process.exit(1); });
