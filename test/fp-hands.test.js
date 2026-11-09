// PLAYWRIGHT_MODULE=/path/to/playwright PREVIEW_URL=http://127.0.0.1:PORT node test/fp-hands.test.js
// Pins js/fp-hands.js: draw/holster/switch transitions, Song-coloured casting glow,
// climbing hands, flag-off byte identity, and the existing switching inputs.
// Screenshots go to $FPHANDS_SHOTS (outside the repo).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.FPHANDS_SHOTS || '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/P3-HANDS';
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

async function boot(browser, blockModule) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  if (blockModule) await page.route('**/js/fp-hands.js*', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hands Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  if (!blockModule) await page.waitForFunction(() => typeof FPHANDS !== 'undefined');
  page.errors = errors; return page;
}

// Freeze nondeterminism and stand somewhere plain with a few weapons.
const FREEZE = () => {
  for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
  loadMap('oakhaven', { x: 39.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
  Engine.setWeather({}); if (typeof PARTICLES !== 'undefined') PARTICLES.list.length = 0;
  if (typeof ANIM !== 'undefined') ANIM.dt = 0;
  Math.random = () => 0.5; performance.__t = performance.now.bind(performance); performance.now = () => 1000;
  const p = G.player; p.weapons = ['hands', 'sword', 'axe', 'bow'].filter(id => WEAPONS[id]); if (p.weapons.length < 3) p.weapons = Object.keys(WEAPONS).slice(0, 4);
  p.weapon = 0; p.voice = p.voiceMax; p.fat = p.fatMax; p.hp = p.hpMax;
  G.attack.t = 0; G.song.t = 0; G.songFx = 0; G.keys = {};
  G.noise = 0;
  if (typeof FPHANDS !== 'undefined') for (let i = 0; i < 60; i++) update(1 / 60);   // let the transition settle
  G.attack.t = 0;
};

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await boot(browser, false);
    await page.evaluate(FREEZE);
    const shot = async (name) => {
      const b64 = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 960; c.height = 600; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(Engine.canvas || document.querySelector('canvas'), 0, 0, 960, 600); return c.toDataURL('image/png').split(',')[1]; });
      fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(b64, 'base64'));
    };

    // ---- 1. weapon switch: lower -> raise, ends on the new weapon -------------
    const sw = await page.evaluate(() => {
      const seq = []; const p = G.player; const F = FPHANDS;
      render(); const hold = F.st.lower;
      p.weapon = 1; // number-key path writes p.weapon directly
      for (let i = 0; i < 30; i++) { update(1 / 60); render(); seq.push([+F.st.lower.toFixed(3), F.st.shown, +F.offset().toFixed(1)]); }
      return { hold, seq, end: F.st.shown, want: p.weapons[p.weapon] };
    });
    assert.equal(sw.hold, 0);
    const peak = Math.max(...sw.seq.map(s => s[0]));
    assert.equal(peak, 1, 'weapon fully lowered mid-switch');
    const pk = sw.seq.findIndex(s => s[0] === 1);
    assert(sw.seq.slice(0, pk).every((s, i, a) => !i || s[0] >= a[i - 1][0]), 'lowers monotonically');
    assert(sw.seq.slice(pk).every((s, i, a) => !i || s[0] <= a[i - 1][0]), 'then raises monotonically');
    assert(pk >= 8 && pk <= 10, 'lower phase is about 0.15 s (frame ' + pk + ')');
    assert.equal(sw.seq.at(-1)[0], 0, 'ends raised');
    assert.equal(sw.seq.at(-1)[1], sw.want, 'ends on the new weapon');
    assert.equal(sw.seq[0][1] !== sw.want, true, 'old weapon shown while lowering');
    const total = sw.seq.findIndex((s, i) => i > pk && s[0] === 0) + 1;
    assert(total >= 19 && total <= 25, 'whole switch ~0.35 s (' + total + ' frames)');
    console.log('PASS weapon switch lowers, swaps, raises (' + total + ' frames), offsets', sw.seq.slice(0, 22).map(s => s[2]).join(','));

    // screenshots: switch sequence
    await page.evaluate(() => { G.player.weapon = 0; for (let i = 0; i < 60; i++) { update(1 / 60); render(); } });
    await shot('switch-0-ready');
    await page.evaluate(() => { G.player.weapon = 2; for (let i = 0; i < 4; i++) { update(1 / 60); } render(); }); await shot('switch-1-lowering');
    await page.evaluate(() => { for (let i = 0; i < 6; i++) update(1 / 60); render(); }); await shot('switch-2-hidden');
    await page.evaluate(() => { for (let i = 0; i < 6; i++) update(1 / 60); render(); }); await shot('switch-3-raising');
    await page.evaluate(() => { for (let i = 0; i < 20; i++) update(1 / 60); render(); }); await shot('switch-4-ready');

    // interruptible: switch again mid-lower and mid-raise
    const intr = await page.evaluate(() => {
      const p = G.player, F = FPHANDS; p.weapon = 0; for (let i = 0; i < 60; i++) update(1 / 60);
      p.weapon = 1; for (let i = 0; i < 4; i++) update(1 / 60); p.weapon = 2; for (let i = 0; i < 12; i++) update(1 / 60); p.weapon = 0;
      for (let i = 0; i < 80; i++) update(1 / 60);
      return { shown: F.st.shown, want: p.weapons[p.weapon], lower: F.st.lower };
    });
    assert.deepEqual([intr.shown, intr.lower], [intr.want, 0]); console.log('PASS rapid switching is interruptible and settles on the last weapon');

    // ---- 2. attack during a switch cancels the transition (no readiness wait) --
    const atk = await page.evaluate(() => {
      const p = G.player, F = FPHANDS; p.weapon = 0; for (let i = 0; i < 60; i++) update(1 / 60);
      p.weapon = 1; for (let i = 0; i < 5; i++) update(1 / 60); const mid = F.st.lower;
      attack('thrust'); const t0 = G.attack.t; update(1 / 60);
      return { mid, t0, lower: F.st.lower, shown: F.st.shown, want: p.weapons[p.weapon], dur: WEAPONS[p.weapons[p.weapon]].speed };
    });
    assert(atk.mid > 0.2, 'was mid switch'); assert.equal(atk.t0, atk.dur, 'attack timing unchanged');
    assert.equal(atk.lower, 0); assert.equal(atk.shown, atk.want);
    console.log('PASS an attack cancels a switch instantly: no readiness wait, attack clock unchanged');

    // ---- 3. holster on inventory open, draw on close ------------------------------
    const hol = await page.evaluate(() => {
      const p = G.player, F = FPHANDS; G.attack.t = 0; p.weapon = 1; for (let i = 0; i < 60; i++) update(1 / 60);
      const before = F.st.lower; G.state = 'panel'; renderInventory(); const mid = [];
      for (let i = 0; i < 12; i++) { update(1 / 60); mid.push(F.st.lower); }
      const held = F.st.lower; closeModal(); G.state = 'play';
      const rise = []; for (let i = 0; i < 16; i++) { update(1 / 60); rise.push(+F.st.lower.toFixed(2)); }
      return { before, held, rise, end: F.st.lower };
    });
    assert.equal(hol.before, 0); assert.equal(hol.held, 1, 'holstered while the inventory is open'); assert.equal(hol.end, 0, 'drawn again on close');
    assert(hol.rise[0] < 1 && hol.rise[0] > 0.5, 'rises, not snaps'); console.log('PASS holster on inventory open, draw on close');

    // ---- 4. casting glow tints with the Song's root colour ----------------------------
    const cast = await page.evaluate(() => {
      const p = G.player, F = FPHANDS, out = {};
      p.songs = ['murmur', 'tending', 'root', 'fifth', 'name']; for (const id of ['tending', 'name', 'fifth']) SONGS[id] = SONGS[id];
      // custom 285/396/528/639 Songs so every root colour is checked
      for (const [i, n] of SONG_NOTES.entries()) SONGS['t_' + n.freq] = { name: 'T' + n.freq, hz: n.hz, freq: n.freq, cost: 3, noise: 1.5, effects: [], custom: true, dyn: 'forte' };
      const ids = ['tending', 'fifth', 'name', 't_285', 't_396', 't_528', 't_639'];
      for (const id of ids) {
        G.song.t = 0; G.songFx = 0; G.attack.t = 0; G.player.voice = G.player.voiceMax; F.st.cast = 0;
        castSong(id); const col = F.st.castCol.slice(), t0 = G.song.t;
        let n = 0; while (F.st.cast > 0 && n < 200) { update(1 / 60); render(); n++; }
        out[id] = { col, t0, frames: n, hz: F.songFx ? 0 : F.songFreq(id) };
      }
      G.song.t = 0; F.st.cast = 0; const m0 = G.murmurT; castSong('murmur'); out.murmur = { col: F.st.castCol.slice(), power: F.st.castPower, started: F.st.cast > 0 };
      return out;
    });
    const roots = { tending: 174, fifth: 174, name: 741 };
    const cols = new Set();
    for (const [id, v] of Object.entries(cast)) { if (id === 'murmur') continue; assert(v.t0 === 0.7, id + ' sets the Song clock'); assert(v.frames >= 50 && v.frames <= 60, id + ' lasts the Song duration (' + v.frames + ' frames)'); cols.add(v.col.join()); }
    assert.equal(cols.size, 6, 'six distinct root colours (174 285 396 528 639 741)');
    assert(cast.tending.col[0] > cast.tending.col[2], 'Root is warm'); assert(cast.name.col[2] > cast.name.col[1], '741 is violet'); assert(cast.t_639.col[2] > cast.t_639.col[0], '639 is blue');
    assert(cast.murmur.started && cast.murmur.power < 0.5, 'Murmur is subtle but shows');
    console.log('PASS casting glow tints per root note and lasts the Song (' + Object.entries(cast).map(([k, v]) => k + ':' + (v.frames || 'm')).join(' ') + ')');

    // glow actually changes pixels and the colour dominates; Full Voice brighter than Murmur
    const px = await page.evaluate(() => {
      const F = FPHANDS, ctx = Engine.ctx, res = {};
      const grab = () => { const d = ctx.getImageData(110, 100, 100, 50).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } return [r, g, b]; };
      G.song.t = 0; G.songFx = 0; F.st.cast = 0; render(); res.base = grab();
      for (const id of ['tending', 'name', 't_639']) {
        G.song.t = 0; G.songFx = 0; G.player.voice = G.player.voiceMax; castSong(id);
        for (let i = 0; i < 20; i++) update(1 / 60); render(); res[id] = grab();
      }
      G.song.t = 0; G.songFx = 0; F.st.cast = 0; GFX.reduceFlash = false;
      castSong('murmur'); for (let i = 0; i < 20; i++) update(1 / 60); render(); res.murmur = grab();
      return res;
    });
    const lum = a => a[0] + a[1] + a[2];
    assert(lum(px.tending) > lum(px.base) && lum(px.name) > lum(px.base), 'glow brightens the view');
    assert(px.tending[0] / px.tending[2] > px.name[0] / px.name[2] * 1.2, 'Root glow is redder than the 741 glow');
    assert(px.t_639[2] / px.t_639[0] > px.tending[2] / px.tending[0], '639 glow is bluer than Root');
    assert(lum(px.murmur) - lum(px.base) < (lum(px.tending) - lum(px.base)) * 0.6, 'Murmur is dimmer than a full Song');
    console.log('PASS glow pixels: colour-matched, Murmur dimmer than a Song');

    // screenshots for 3 Songs
    for (const id of ['tending', 'fifth', 'name']) {
      await page.evaluate((id) => { G.song.t = 0; G.songFx = 0; FPHANDS.st.cast = 0; G.player.voice = G.player.voiceMax; castSong(id); for (let i = 0; i < 18; i++) update(1 / 60); render(); }, id);
      await shot('cast-' + id);
    }
    await page.evaluate(() => { G.song.t = 0; G.songFx = 0; FPHANDS.st.cast = 0; for (let i = 0; i < 90; i++) update(1 / 60); });
    // reduced flashes: steady, dimmer
    const red = await page.evaluate(() => {
      const ctx = Engine.ctx, F = FPHANDS, pul = []; const lumAt = () => { const d = ctx.getImageData(130, 90, 60, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
      const run = (reduce) => { GFX.reduceFlash = reduce; G.song.t = 0; G.songFx = 0; F.st.cast = 0; G.player.voice = G.player.voiceMax; castSong('name'); const v = []; for (let i = 0; i < 30; i++) { update(1 / 60); render(); v.push(lumAt()); pul.push(F.st.pulse); } return v; };
      const a = run(false); const pn = pul.splice(0).slice(8), b = run(true); const pr = pul.slice(8); GFX.reduceFlash = false;
      const swing = v => Math.max(...v.slice(10, 30)) - Math.min(...v.slice(10, 30));
      return { normal: Math.max(...pn) - Math.min(...pn), reduced: Math.max(...pr) - Math.min(...pr), peakN: Math.max(...a), peakR: Math.max(...b) };
    });
    assert(red.peakR < red.peakN, 'reduced flashes: dimmer glow'); assert(red.reduced < red.normal, 'reduced flashes: no pulsing');
    console.log('PASS reduceFlash dims and stops the pulse');
    await page.evaluate(() => { G.song.t = 0; G.songFx = 0; FPHANDS.st.cast = 0; for (let i = 0; i < 90; i++) update(1 / 60); });

    // ---- 5. climbing ------------------------------------------------------------------------
    const clim = await page.evaluate(() => {
      const p = G.player, F = FPHANDS; p.weapon = 1; p.fat = p.fatMax; for (let i = 0; i < 60; i++) update(1 / 60);
      const c = Engine.cam, x0 = c.x; doClimb({ to: { x: c.x + 0.5, y: c.y }, msg: 'test climb' });
      const log = []; for (let i = 0; i < 80; i++) { update(1 / 60); render(); log.push([F.st.climb > 0, +F.st.lower.toFixed(2)]); }
      const mid = log[30]; const endLower = F.st.lower;
      return { moved: c.x !== x0, mid, endLower, climbing30: log[30][0], climbEnd: log[70][0], shown: F.st.shown };
    });
    assert(clim.moved); assert(clim.climbing30 && clim.mid[1] === 1, 'weapon holstered mid-climb'); assert.equal(clim.climbEnd, false); assert.equal(clim.endLower, 0, 'weapon returns after the climb');
    console.log('PASS climb: hands shown, weapon holstered, weapon drawn after');
    const cpx = await page.evaluate(() => {
      const p = G.player, F = FPHANDS; for (let i = 0; i < 60; i++) update(1 / 60); const c = Engine.cam;
      const grab = () => { const d = Engine.ctx.getImageData(96, 20, 130, 128).data; return Array.from(d.slice(0, 40000)).join().length; };
      doClimb({ to: { x: c.x + 0.4, y: c.y }, msg: 'x' }); for (let i = 0; i < 20; i++) update(1 / 60); render();
      const a = Engine.ctx.getImageData(96, 20, 130, 128).data.slice(); for (let i = 0; i < 12; i++) update(1 / 60); render();
      const b = Engine.ctx.getImageData(96, 20, 130, 128).data; let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      return diff;
    });
    assert(cpx > 500, 'rungs and hands move between frames'); console.log('PASS climbing hands animate (' + cpx + ' bytes differ)');
    await page.evaluate(() => { for (let i = 0; i < 90; i++) update(1 / 60); const c = Engine.cam; G.player.fat = G.player.fatMax; doClimb({ to: { x: c.x + 0.3, y: c.y }, msg: 'x' }); for (let i = 0; i < 6; i++) update(1 / 60); render(); }); await shot('ladder-0-grab');
    await page.evaluate(() => { for (let i = 0; i < 24; i++) update(1 / 60); render(); }); await shot('ladder-1-climbing');
    await page.evaluate(() => { for (let i = 0; i < 14; i++) update(1 / 60); render(); }); await shot('ladder-2-pull');
    await page.evaluate(() => { for (let i = 0; i < 90; i++) update(1 / 60); });

    // ---- 6. existing switching inputs still work ---------------------------------------------
    await page.evaluate(() => { performance.now = performance.__t; });   // the wheel throttle needs a real clock
    const inputs = await page.evaluate(async () => {
      const p = G.player, out = {}; p.weapon = 0; for (let i = 0; i < 60; i++) update(1 / 60);
      cycleWeapon(1); out.cycle = p.weapon === 1;
      cycleWeapon(-1); out.cycleBack = p.weapon === 0;
      return out;
    });
    assert(inputs.cycle && inputs.cycleBack);
    await page.evaluate(() => { G.player.weapon = 0; G.state = 'play'; });
    await page.keyboard.press('2'); assert.equal(await page.evaluate(() => G.player.weapon), 1, 'number key');
    await page.mouse.move(640, 300); await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200); assert.equal(await page.evaluate(() => G.player.weapon), 2, 'wheel');
    await page.waitForTimeout(250); await page.mouse.wheel(0, -120); await page.waitForTimeout(200); assert.equal(await page.evaluate(() => G.player.weapon), 1, 'wheel back');
    const pad = await page.evaluate(() => {
      const p = G.player; p.weapon = 0; G.state = 'play';
      const pads = [{ connected: true, id: 'test', index: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }];
      const orig = navigator.getGamepads; navigator.getGamepads = () => pads;
      return { orig: !!orig, ok: typeof GBTN !== 'undefined', rb: typeof GBTN !== 'undefined' ? GBTN.rb : null };
    });
    if (pad.ok) {
      await page.evaluate(() => { navigator.getGamepads()[0].buttons[GBTN.rb].pressed = true; });
      await page.waitForTimeout(250);
      await page.evaluate(() => { navigator.getGamepads()[0].buttons[GBTN.rb].pressed = false; });
      assert.equal(await page.evaluate(() => G.player.weapon), 1, 'controller RB cycles');
    }
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => FPHANDS.st.shown === G.player.weapons[G.player.weapon]), true, 'and the transition settles on it');
    console.log('PASS keyboard number key, wheel, controller RB and cycleWeapon still switch');

    await page.close();

    // ---- 8. byte-identical with the flag off (and when idle) -----------------------------------
    const frame = async (blocked, setup) => {
      const pg = await boot(browser, blocked);
      await pg.evaluate(FREEZE);
      // a constant backdrop: the 3D view is not deterministic between pages, the HUD is what we compare
      await pg.evaluate(() => { Engine.render = () => { Engine.ctx.fillStyle = '#334455'; Engine.ctx.fillRect(0, 0, VW, VIEW_H); }; });
      const out = await pg.evaluate((setup) => {
        const grab = () => Array.from(new Uint8Array(Engine.ctx.getImageData(0, 0, VW, VH).data.buffer));
        const res = {}; const hash = a => { let h = 2166136261; for (let i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
        if (setup === 'off' && typeof GFX !== 'undefined') GFX.fpHands = false;
        for (const w of [0, 1, 2]) {
          G.player.weapon = w; for (let i = 0; i < 90; i++) update(1 / 60); G.attack.t = 0; render(); res['idle' + w] = hash(grab());
        }
        G.player.weapon = 1; for (let i = 0; i < 90; i++) update(1 / 60); G.player.weapon = 2; update(1 / 60); update(1 / 60); render(); res.midswitch = hash(grab());
        G.player.weapon = 1; for (let i = 0; i < 90; i++) update(1 / 60); G.state = 'panel'; for (let i = 0; i < 30; i++) update(1 / 60); render(); res.panel = hash(grab()); G.state = 'play';
        for (let i = 0; i < 90; i++) update(1 / 60); G.attack.t = 0.3; G.attack.dur = 0.6; G.attack.dirLabel = 'thrust'; render(); res.swing = hash(grab()); G.attack.t = 0;
        return res;
      }, setup);
      assert.deepEqual(pg.errors, []); await pg.close(); return out;
    };
    const base0 = await frame(true, 'blocked'); const base = await frame(true, 'blocked'); assert.deepEqual(base0, base, 'baseline frames are deterministic');
          // module never loaded: the original game
    const off = await frame(false, 'off');          // module loaded, GFX.fpHands = false
    const on = await frame(false, 'on');            // module on
    assert.deepEqual(off, base, 'flag off: every HUD frame byte-identical to the original');
    for (const k of ['idle0', 'idle1', 'idle2', 'swing']) assert.equal(on[k], base[k], 'flag on: ' + k + ' is untouched');
    assert.notEqual(on.midswitch, base.midswitch, 'flag on: mid-switch frame differs (weapon lowered)');
    assert.notEqual(on.panel, base.panel, 'flag on: holstered frame differs');
    console.log('PASS flag off is byte-identical; idle and swing frames are identical even when on');

    // ---- 9. frame cost ---------------------------------------------------------------------------
    const pg = await boot(browser, false); await pg.evaluate(FREEZE);
    const c = await pg.evaluate(() => {
      // the timer is coarse, so time batches of calls and take the median batch
      const med = (fn, n = 400) => { const t = []; for (let r = 0; r < 9; r++) { const a = performance.__t(); for (let i = 0; i < n; i++) fn(); t.push((performance.__t() - a) / n); } t.sort((x, y) => x - y); return t[4] * 1000; };
      const F = FPHANDS; GFX.fpHands = true;
      const idle = med(() => drawHUD());
      GFX.fpHands = false; const off = med(() => drawHUD()); GFX.fpHands = true;
      F.st.lower = 0.5; F.st.shown = G.player.weapons[0]; const sw = med(() => drawHUD());
      F.st.lower = 0; F.st.climb = 5; const cl = med(() => drawHUD()); F.st.climb = 0;
      castSong('fifth'); F.st.cast = 100; G.song.t = 0; const gl = med(() => drawHUD()); F.st.cast = 0;
      const stp = med(() => F.step(1 / 60));
      return { off, idle, sw, cl, gl, stp };
    });
    console.log('FRAME COST (median us/call): drawHUD flag-off', c.off.toFixed(1), '| on idle', c.idle.toFixed(1), '| switching', c.sw.toFixed(1), '| climbing', c.cl.toFixed(1), '| casting glow', c.gl.toFixed(1), '| step', c.stp.toFixed(2));
    assert.deepEqual(pg.errors, []); await pg.close();
    console.log('PASS no page errors');
  } catch (e) { console.error('FAIL', e); process.exitCode = 1; }
  finally { await browser.close(); }
})();
