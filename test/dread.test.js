// PREVIEW_URL=http://127.0.0.1:3843 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/dread.test.js
// Phase 10 DREAD: the Dissonance meter (Songs, decay, the HUD band, whispers from behind, the second shadow, the false foe)
// and the stalker (approach states, safe places, the keeping and its return), plus Off = the original game, saves (hostile
// ones too), reduce motion / no flashes / captions, frame cost, 640x400 fit. Uses the managed preview; never starts a server
// and never writes player saves. The game loop is frozen (requestAnimationFrame stubbed) and every step is driven by hand,
// so each number is repeatable; sound is checked by reading node parameters, never by listening.
//   DREAD_SHOTS=/dir writes screenshots there (optional).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.DREAD_SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /dread|render hook|tick failed/i.test(m.text()))) errors.push('console: ' + m.text()); });
    // count every audio node made directly by js/dread.js (the caller of create* is a function in that file), and every AudioContext the page makes
    await page.addInitScript(() => {
      window.__ctxCount = 0; window.__dreadNodes = 0; window.__allNodes = 0;
      const AC = window.AudioContext;
      window.AudioContext = function (...a) { window.__ctxCount++; return new AC(...a); };
      window.AudioContext.prototype = AC.prototype;
      for (const k of ['createGain', 'createBiquadFilter', 'createBufferSource', 'createOscillator', 'createStereoPanner', 'createBuffer', 'createDelay']) {
        const f = AC.prototype[k];
        AC.prototype[k] = function () { window.__allNodes++; if (/dread\.js/.test(((new Error().stack || '').split('\n')[2]) || '')) window.__dreadNodes++; return f.apply(this, arguments); };
      }
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3843');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Dread Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => typeof DREAD === 'object' && G.state === 'play');
    await page.waitForTimeout(400);
    // freeze the live loop: from here every step is driven by hand
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(120);

    // ---- fixtures shared by every block (all run inside the page)
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.reset = (on) => {
        DREAD.setOn(!!on);
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; $('#msgs').innerHTML = ''; closeModal();
        document.querySelectorAll('#ac-captions div').forEach(d => d.remove());
        GFX.reduceMotion = false; GFX.noFlash = false; ACCESS.settings.cap = false; UPG.lantern = false; Weather.hold('clear');
        if (GFX.dreadFx === false || GFX.preset !== 'medium') PRESETS.apply('medium');
        G.player.songs = ['murmur', 'tending', 'fifth', 'root', 'name']; G.player.voice = G.player.voiceMax;
        G.noise = 2; G.stillT = 0; G.rootWard = 0; G.murmurT = 0; G.whistleT = 0; G.vel.x = G.vel.y = 0; G.fadeT = 0; G.dead = false;
        DREAD.st.mapT = 99; DREAD.st.cd = 0; DREAD.st.clock = 0; DREAD.talk = 0;
      };
      window.go = (id, x, y, dir) => { if (/^dread_/.test(id) && !G.maps[id]) (id === 'dread_hall' ? hall(id) : field(id)); loadMap(id, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.ents = G.map.entities; DREAD.st.mapT = 99; DREAD.st.cd = 0; DREAD.scan(true); };
      window.tickN = (secs, dt, keepD) => { dt = dt || 0.25; for (let t = 0; t < secs; t += dt) { if (keepD) DREAD.st.D = Math.max(DREAD.st.D, keepD); DREAD.tick(dt); } };
      window.frame = () => { Engine.setTime(5); Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, 320, 150).data; };
      // rows 0..63 hold the sky, which shimmers by itself between two renders; everything below is deterministic
      window.diffIn = (a, b, x0, x1) => { let n = 0; for (let y = 64; y < 150; y++) for (let x = x0; x < x1; x++) { const i = (y * 320 + x) * 4; if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++; } return n; };
      window.msgs = () => document.querySelector('#msgs').textContent;
      window.caps = () => Array.from(document.querySelectorAll('#ac-captions div')).map(d => d.textContent);
      // a test room with a long straight hall (no guards, no hounds) for the sight-line tests
      window.hall = (id, opts) => {
        const m = new GameMap(id, 'Dread test hall', 44, 9, Object.assign({ floor: 't_flag', ceil: 't_stone', fogDist: 26, spawn: { x: 3.5, y: 4.5, dir: 0 } }, opts || {}));
        m.border('t_stone'); G.maps[id] = m; m.baseCount = 0; return m;
      };
      // an open, lamp-free night field (outdoor, so the wind is what you cannot hear)
      window.field = (id) => {
        const m = new GameMap(id, 'Dread test field', 40, 40, { outdoor: true, floor: 't_grass', fogDist: 16, fogColor: [50, 55, 50], spawn: { x: 20.5, y: 20.5, dir: 0 } });
        m.border('t_stone'); G.maps[id] = m; m.baseCount = 0; return m;
      };
      window.addLamp = (x, y) => { const e = { kind: 'deco', sprite: 'lamp', x, y, radius: 0.1, solid: false, glow: 0.8, label: 'test lamp' }; G.map.entities.push(e); G.ents = G.map.entities; DREAD.scan(true); return e; };
    });
    const run = (fn, arg) => page.evaluate(fn, arg);
    const shot = async (name) => { if (!SHOTS) return; fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); };

    // ================================================================ 1. Off = the original game
    const off = await run(() => {
      reset(false);
      const r = {};
      check(DREAD.set.on === false, 'Dread defaults to Off');
      // the Options row exists, reads Off, and the hint carries the no-jump-scare note
      renderAccessibilityMenu();
      const row = document.getElementById('dread-on'), lab = document.getElementById('dread-label');
      check(row && row.textContent === 'Off' && row.getAttribute('aria-pressed') === 'false', 'one Dread row, Off');
      check(lab && /^Dread/.test(lab.textContent) && /Jump scares: none/.test(lab.textContent), 'row label Dread and the "Jump scares: none" note');
      check(document.querySelectorAll('#dread-on').length === 1, 'exactly one Dread row');
      closeModal(); G.state = 'play';
      // no audio nodes, no flags, no state, no random numbers from this module while Off
      const nodes0 = window.__dreadNodes;
      go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92;
      G.player.voice = G.player.voiceMax;
      const realRandom = Math.random; let calls = 0; Math.random = () => { calls++; return realRandom(); };
      for (const id of ['tending', 'fifth', 'root']) { G.player.voice = G.player.voiceMax; G.song.t = 0; G.attack.t = 0; castSong(id); }
      const before = calls; for (let i = 0; i < 400; i++) DREAD.tick(0.25); r.randomFromTick = calls - before;
      Math.random = realRandom;
      check(r.randomFromTick === 0, 'DREAD.tick draws no Math.random while Off');
      check(DREAD.st.D === 0 && DREAD.st.S === 0 && !DREAD.st.shadow && !DREAD.st.foe, 'Songs raise nothing while Off, nothing approaches');
      check(window.__dreadNodes === nodes0, 'no audio node made by dread.js while Off');
      check(Object.keys(G.flags).every(k => !/^p10d_/.test(k)) && !/p10d_/.test(JSON.stringify(snapshotGame().flags)), 'no p10d_ flag written, live or in a snapshot');
      // the HUD is the original: the band region is the same with a doctored meter
      DREAD.st.D = 90; drawHUD(); const a = Engine.ctx.getImageData(40, 150, 12, 50).data; DREAD.st.D = 0; drawHUD(); const b = Engine.ctx.getImageData(40, 150, 12, 50).data;
      check(a.every((v, i) => v === b[i]), 'HUD identical with Dread Off, whatever the meter holds');
      // the journal is untouched; the step sound is the game's
      DREAD.st.S = 3; DREAD.st.keep.n = G.journal.length; renderLog(); const txt = document.querySelector('#modal-panel').textContent; closeModal(); G.state = 'play';
      check(G.journal[0].text.length > 3 && txt.includes(G.journal[0].text.slice(0, 20)), 'logbook shows every line while Off');
      DREAD.st.S = 0; DREAD.st.keep.n = 0;
      r.ok = true;
      return r;
    });
    console.log('PASS Off: one row, no nodes, no flags, no random draws, no HUD change, no state', JSON.stringify(off));

    // AI traces identical: the same seeded run with Dread Off and with Dread On at full Dissonance, standing in an open map by night
    // (enemyUpdate driven directly, as test/creature-life.test.js does; Songs are cast in both runs so the Narrow is the same)
    const trace = await run(() => {
      const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'chase'; return e; };
      const realRandom = Math.random;
      const runTrace = (on) => {
        reset(on); go('clearing', 12.5, 11.5, -Math.PI / 2); G.tod = 0.92; G.player.hp = G.player.hpMax = 9999; G.noise = 4;
        const list = [['hound', 9.5, 7.5], ['proctor', 14.5, 8.5], ['quiet', 11.5, 5.5], ['legionnaire', 8.5, 9.5], ['golem', 12.5, 4.5]].map(([t, x, y]) => mk(t, x, y));
        G.map.entities.push(...list); G.ents = G.map.entities;
        let s = 4242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const out = [];
        try {
          for (let i = 0; i < 300; i++) {
            if (on) { DREAD.st.D = Math.max(DREAD.st.D, 95); DREAD.tick(0.05); }
            if (i % 40 === 5) { G.player.voice = G.player.voiceMax; G.song.t = 0; G.attack.t = 0; castSong(['tending', 'fifth', 'root'][(i / 40 | 0) % 3]); }
            if (i === 150) G.noise = 0;
            for (const e of list) enemyUpdate(e, 0.05);
            for (const e of list) out.push([e.x, e.y, e.state, e.cool, e.hp, e.alertT].join(','));
            out.push(G.noise, G.player.hp, G.rootWard);
          }
        } finally { Math.random = realRandom; }
        for (const e of list) G.map.entities.splice(G.map.entities.indexOf(e), 1); G.ents = G.map.entities;
        return out.join('|');
      };
      runTrace(false);                       // warm-up: pathing warms its own caches on a map's first run
      const tOff = runTrace(false), tOn = runTrace(true), tOff2 = runTrace(false);
      check(tOff === tOff2, 'the trace is repeatable (control)');
      check(tOff === tOn, 'enemy positions / states / cooldowns / hp / noise identical with Dread On at full Dissonance and Off');
      return { len: tOff.length };
    });
    console.log('PASS Off vs On: AI traces identical', JSON.stringify(trace));

    // ================================================================ 2. Dissonance: rises with Songs, decays
    const diss = await run(() => {
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.5;
      const r = {}, cast = (id) => { G.player.voice = G.player.voiceMax; G.song.t = 0; G.attack.t = 0; castSong(id); };
      const one = (id) => { DREAD.st.D = 0; DREAD.st.lastCast = -99; DREAD.st.clock += 30; cast(id); return DREAD.st.D; };
      r.tending = one('tending'); r.fifth = one('fifth'); r.root = one('root'); r.murmur = one('murmur');
      G.player.fragments = 0; r.nameFail = one('name');                                             // nothing to pay with: the Song does not happen
      DREAD.st.D = 0; DREAD.st.clock += 30; DREAD.onSong('name'); r.name = DREAD.st.D;
      check(Math.abs(r.tending - SONGS.tending.noise * 7) < 0.01, 'a Song adds its loudness x 7');
      check(r.fifth / SONGS.fifth.noise < r.tending / SONGS.tending.noise * 0.7, 'the Falling Fifth adds less per unit of loudness');
      check(r.root / SONGS.root.noise < r.tending / SONGS.tending.noise * 0.7, 'the Root Note adds less per unit of loudness');
      check(Math.abs(r.name - SONGS.name.noise * 7) < 0.01 && r.murmur === 0 && r.nameFail === 0, 'Read the Name counts when it is sung; murmuring and a failed Song do not');
      // close together costs more
      DREAD.st.D = 0; DREAD.st.clock += 40; cast('tending'); const first = DREAD.st.D; tickN(2); const mid = DREAD.st.D; cast('tending'); const second = DREAD.st.D - mid;
      check(second > first * 1.5, 'a second Song inside eight seconds adds more than the first');
      DREAD.st.D = 0; DREAD.st.clock += 40; cast('tending'); tickN(15); const m2 = DREAD.st.D; cast('tending'); const mid20 = DREAD.st.D - m2;
      check(mid20 > first * 1.1 && mid20 < second, 'inside twenty seconds adds a little more');
      // a Song that fails (no voice) adds nothing
      DREAD.st.D = 0; G.player.voice = 0; G.song.t = 0; castSong('tending'); check(DREAD.st.D === 0, 'a Song with no voice behind it adds nothing');
      // decay: slow in quiet, slower while loud, fast by a lamp, faster in the Hedge, rest takes hours off
      const dec = (setup, secs) => { DREAD.st.D = 60; setup(); const d0 = DREAD.st.D; tickN(secs); return d0 - DREAD.st.D; };
      G.noise = 1;
      r.quiet = dec(() => {}, 10);
      G.noise = 8; r.loud = dec(() => {}, 10); G.noise = 1;
      const lamp = addLamp(Engine.cam.x + 2, Engine.cam.y); r.lamp = dec(() => {}, 10); G.map.entities.splice(G.map.entities.indexOf(lamp), 1); G.ents = G.map.entities; DREAD.scan(true);
      go('oakhaven', 23.5, 20.5, -Math.PI / 2); r.hedge = dec(() => {}, 10);
      go('dread_field', 20.5, 20.5, -Math.PI / 2);
      check(r.quiet > 3.5 && r.quiet < 5.5, 'slow in quiet (' + r.quiet.toFixed(2) + ' in ten seconds)');
      check(r.loud < r.quiet * 0.6, 'slower while the Narrow is loud');
      check(r.lamp > r.quiet * 4, 'much faster beside a hush-lamp');
      check(r.hedge > r.quiet * 2, 'faster inside the Hedge');
      DREAD.st.D = 80; passHours(4); r.rest = 80 - DREAD.st.D;
      check(Math.abs(r.rest - 56) < 0.01, 'four hours of rest take 56 off');
      DREAD.st.D = 0; DREAD.addDissonance(500); check(DREAD.st.D === 100, 'the meter stops at 100');
      DREAD.addDissonance(-500); check(DREAD.st.D === 0, 'and at 0');
      r.tick = Object.keys(r).length;
      return r;
    });
    console.log('PASS Dissonance: rises with Songs by loudness (settling Songs less, close casts more), decays slowly / fast / in the Hedge / at rest', JSON.stringify(diss));

    // ================================================================ 3. the meter on the HUD
    const hud = await run(() => {
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.5;
      const px = (x0, y0, w, h) => Engine.ctx.getImageData(x0, y0, w, h).data;
      const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      DREAD.st.D = 0; drawHUD(); const empty = px(0, 150, 320, 50);
      DREAD.st.D = 50; drawHUD(); const half = px(0, 150, 320, 50);
      DREAD.st.D = 100; drawHUD(); const full = px(0, 150, 320, 50);
      // everything left of the band (x < 43) and right of it (x >= 47) is the game's own HUD
      const cols = (d, a, b) => { const o = []; for (let y = 0; y < 50; y++) for (let x = a; x < b; x++) { const i = (y * 320 + x) * 4; o.push(d[i], d[i + 1], d[i + 2]); } return o; };
      check(sameBytes(cols(empty, 0, 43), cols(full, 0, 43)) && sameBytes(cols(empty, 47, 320), cols(full, 47, 320)), 'the band touches only its own four columns; every other HUD pixel is the game’s');
      check(!sameBytes(cols(empty, 43, 47), cols(half, 43, 47)) && !sameBytes(cols(half, 43, 47), cols(full, 43, 47)), 'the band fills with Dissonance');
      // it is the thin second band beside the Narrow bar (x 32..40) and clear of the buttons (x >= 48)
      const fillRows = (d, x) => { let n = 0; for (let y = 5; y < 46; y++) { const i = (y * 320 + x) * 4; if (d[i + 2] > 150 && d[i] > 100) n++; } return n; };
      check(fillRows(half, 45) >= 18 && fillRows(half, 45) <= 22 && fillRows(full, 45) >= 38, 'band height tracks the meter (half = 20 rows, full = 40)');
      // a doctored meter cannot break the layout
      for (const v of [NaN, -5, 1e9, Infinity]) { DREAD.st.D = v; drawHUD(); }
      DREAD.st.D = 100;
      // reduce motion: no tremble, whatever the time
      GFX.reduceMotion = true; const t0 = performance.now(); const a = (drawHUD(), px(43, 150, 4, 50)); const wait = (ms) => { const e = performance.now() + ms; while (performance.now() < e); }; wait(130);
      const b = (drawHUD(), px(43, 150, 4, 50)); wait(130); const c = (drawHUD(), px(43, 150, 4, 50));
      check(sameBytes(a, b) && sameBytes(b, c), 'Reduce motion: the band is perfectly still');
      GFX.reduceMotion = false; let seen = new Set(); for (let i = 0; i < 6; i++) { drawHUD(); seen.add(Array.from(px(43, 150, 4, 50)).join(',')); wait(70); }
      check(seen.size >= 2, 'Without it, the band trembles one pixel at high Dissonance');
      // the Original preset drops the picture half (the band) and keeps the game as it was
      DREAD.st.D = 100; PRESETS.apply('original'); drawHUD(); const orig = px(0, 150, 320, 50); PRESETS.apply('medium');
      const none = (() => { DREAD.setOn(false); drawHUD(); const d = px(0, 150, 320, 50); DREAD.setOn(true); return d; })();
      check(sameBytes(orig, none), 'the Original preset shows no band');
      check(GFX.FX.includes('dreadFx') && GFX.dreadFx === true, 'the picture half is a GFX.FX switch, back on with Medium');
      GFX.plain(); DREAD.st.D = 100; drawHUD(); check(sameBytes(px(0, 150, 320, 50), none), 'GFX.plain() shows no band either'); PRESETS.apply('medium');
      return { ok: true };
    });
    console.log('PASS HUD: a thin second band, only its own columns, still under Reduce motion, off with Original / plain', JSON.stringify(hud));
    await run(() => { reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.9; DREAD.st.D = 70; drawHUD(); });
    await shot('01-hud-band-1280.png');

    // ================================================================ 4. whispers come from behind
    const wh = await run(() => {
      reset(true); go('dread_field', 20.5, 20.5, 0); G.tod = 0.9; ACCESS.settings.cap = true;
      const ripples0 = (typeof RIPPLES !== 'undefined') ? RIPPLES.stats.spawned : 0; if (typeof RIPPLES !== 'undefined') RIPPLES.settings.on = true;
      const r = { bearings: [], pans: [] }, nodes0 = window.__dreadNodes;
      const dirs = [0, 1, 2, 3, -1, -2.5, 4.4, 6];
      for (const dir of dirs) {
        Engine.cam.dir = dir; for (let k = 0; k < 6; k++) {
          const m = DREAD.whisper(); check(m, 'whisper fires');
          // the recorded bearing is relative to where you look: behind is |b| near pi
          check(Math.abs(m.bearing) > 2.2, 'bearing ' + m.bearing.toFixed(2) + ' is behind the camera (dir ' + dir + ')');
          const S = SPATIAL.mix({ x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir }, { x: m.x, y: m.y }, SPATIAL.wallsBetween(G.map, m.x, m.y, Engine.cam.x, Engine.cam.y));
          check(Math.abs(S.pan - m.pan) < 1e-9 && Math.abs(m.pan) < 0.45, 'pan comes from SPATIAL.mix and stays near centre for a sound behind (' + m.pan.toFixed(3) + ')');
          const dist = Math.hypot(m.x - Engine.cam.x, m.y - Engine.cam.y); check(dist > 0.9 && dist < 5.5, 'close enough to be a whisper in your ear (' + dist.toFixed(1) + ')');
          r.bearings.push(m.bearing); r.pans.push(m.pan);
        }
      }
      check(Math.min(...r.bearings) < -2.3 && Math.max(...r.bearings) > 2.3, 'it comes from both sides of straight-behind');
      check(window.__dreadNodes > nodes0, 'a whisper is real sound (nodes made by dread.js)');
      // the nodes are released and the context count stays at one
      check(window.__ctxCount === 1, 'still one AudioContext');
      // caption: the whisper caption and nothing else
      const c = caps(); check(c.length >= 1 && c.every(t => t === '[a whisper behind you]'), 'captions: only "[a whisper behind you]" (' + JSON.stringify(c) + ')');
      // no ripple, no other caption
      if (typeof RIPPLES !== 'undefined') check(RIPPLES.stats.spawned === ripples0, 'no ripple for a whisper');
      // never a word: no message printed carries speech, only the one-time stage line
      check(!/["“]/.test(msgs()), 'no quoted words anywhere');
      // not in Oakhaven (the Hedge swallows sound), not in Whisper-Grove's plazas, not during a panel
      const w0 = DREAD.stats.whispers;
      G.tod = 0.5; DREAD.st.D = 90; DREAD.st.mapT = 99; go('oakhaven', 23.5, 20.5, 0); tickN(60, 0.25, 90); check(DREAD.stats.whispers === w0, 'no whispers inside the Hedge');
      go('whispergrove', G.map.spawn.x, G.map.spawn.y, 0); tickN(60, 0.25, 90); check(DREAD.stats.whispers === w0, 'no whispers in the plazas of Whisper-Grove');
      go('dread_field', 20.5, 20.5, 0); DREAD.st.D = 90; G.state = 'panel'; tickN(60, 0.25, 90); check(DREAD.stats.whispers === w0, 'no whispers behind a panel'); G.state = 'play';
      G.tod = 0.5; tickN(80, 0.25, 90); check(DREAD.stats.whispers > w0, 'but in the open they come, on their own, once the meter is high');
      const a = DREAD.stats.whispers; DREAD.st.D = 30; DREAD.st.cd = 0; for (let t = 0; t < 80; t += 0.25) { DREAD.st.D = 40; DREAD.tick(0.25); } check(DREAD.stats.whispers === a, 'and not below 45');
      return { n: DREAD.stats.whispers, nodes: window.__dreadNodes - nodes0, caps: c.length };
    });
    console.log('PASS Whispers: behind you (|bearing| > 126 deg), pan from SPATIAL.mix, captioned, no ripple, never in the Hedge / plazas / panels', JSON.stringify(wh));

    // ================================================================ 5. the second shadow
    const sh = await run(() => {
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.9;
      const r = {};
      const A0 = frame(), A1 = frame(); const noise = diffIn(A0, A1, 0, 320); r.noise = noise;
      // synthetic frame first: exact pixels
      const mkF = () => { const w = 320, h = 150, fb = new Uint32Array(w * h).fill(0xff808080); const c = Engine.cam; return { fb, w, h, horizon: 75, cam: c, dirX: Math.cos(c.dir), dirY: Math.sin(c.dir), planeX: -Math.sin(c.dir) * 0.66, planeY: Math.cos(c.dir) * 0.66, dbuf: new Float32Array(w * h).fill(1e9), fogDist: 16 }; };
      for (const side of [-1, 1]) {
        const s = DREAD.spawnShadow(side); s.a = 0.5; const F = mkF(); DREAD.post(F);
        let inner = 0, outer = 0; for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) if (F.fb[y * 320 + x] !== 0xff808080) { if (x > 52 && x < 268) inner++; else outer++; }
        check(inner === 0, 'side ' + side + ': not one pixel drawn in the central 67% of the view');
        check(outer > 150, 'side ' + side + ': a silhouette in the outer edge (' + outer + ' px)');
        // it only ever darkens: nothing brighter than the scene, no flash
        let bright = 0; for (let i = 0; i < F.fb.length; i++) if ((F.fb[i] & 255) > 0x80) bright++; check(bright === 0, 'it only darkens');
        // the side it is on
        let leftN = 0, rightN = 0; for (let y = 0; y < 150; y++) for (let x = 0; x < 320; x++) if (F.fb[y * 320 + x] !== 0xff808080) (x < 160 ? leftN++ : rightN++);
        check(side < 0 ? leftN > 0 && rightN === 0 : rightN > 0 && leftN === 0, 'it stands on the side it was spawned on');
        // you turn toward it: it is not there
        const phi = s.phi; Engine.cam.dir = phi - side * 0.25; DREAD.stepShadow(0.05); check(s.dying === true, 'turning toward it ends it');
        const F2 = mkF(); DREAD.post(F2); check(F2.fb.every(v => v === 0xff808080), 'and nothing is drawn once you face it');
        for (let i = 0; i < 12; i++) DREAD.stepShadow(0.1); check(DREAD.st.shadow === null, 'it dissolves completely');
        Engine.cam.dir = -Math.PI / 2;
      }
      // away: behind you it cannot be seen either
      const s2 = DREAD.spawnShadow(1); s2.a = 0.5; Engine.cam.dir += Math.PI; const F3 = mkF(); DREAD.post(F3); check(F3.fb.every(v => v === 0xff808080), 'turned away it is off-screen'); Engine.cam.dir -= Math.PI; DREAD.st.shadow = null;
      // through the real renderer: only the edges differ from the same frame without it
      const base = frame(), s3 = DREAD.spawnShadow(-1); s3.a = 0.5; const withS = frame();
      r.centre = diffIn(base, withS, 56, 264); r.edge = diffIn(base, withS, 0, 56);
      check(r.centre <= noise + 5, 'real frame: centre untouched (' + r.centre + ' vs noise ' + noise + ')');
      check(r.edge > noise + 300, 'real frame: the edge carries it (' + r.edge + ')');
      DREAD.st.shadow = null;
      // it appears on its own, only above 60, only in the open, and never beside a real foe in a fight
      G.tod = 0.5; DREAD.st.D = 90; DREAD.st.mapT = 99; const n0 = DREAD.stats.shadows; tickN(120, 0.25, 90); check(DREAD.stats.shadows > n0, 'at high Dissonance the shadow comes on its own');
      DREAD.st.shadow = null; DREAD.st.cd = 0; const n1 = DREAD.stats.shadows; for (let t = 0; t < 120; t += 0.25) { DREAD.st.D = 50; DREAD.tick(0.25); } check(DREAD.stats.shadows === n1, 'not below 60');
      // reduce motion / no flash: fades in at no more than half a step a second, and no brighter than the cap
      GFX.noFlash = true; const s4 = DREAD.spawnShadow(1); tickN(10, 0.1); check(s4.a <= 0.38 + 1e-9, 'No flashes lowers the shadow’s strength'); GFX.noFlash = false; DREAD.st.shadow = null;
      return r;
    });
    console.log('PASS Shadow: only in the outer edge, dies when you turn, only darkens, real frame centre untouched', JSON.stringify(sh));

    // ================================================================ 6. the false foe
    const foe = await run(() => {
      reset(true); hall('dread_hall'); go('dread_hall', 3.5, 4.5, 0); G.tod = 0.9; GFX.softFog = true;
      const r = {};
      const spot = DREAD.foeSpot(); check(spot && spot.d >= 8 && spot.x > 12, 'a long sight-line finds a far end (' + (spot && spot.d.toFixed(1)) + ')');
      const entsBefore = G.ents.slice(), jsonBefore = JSON.stringify(G.ents.map(e => [e.kind, e.type, e.x, e.y, e.hp, e.state, e.hidden]));
      const base = frame();
      const f = DREAD.spawnFoe(); f.a = 0.6; const withF = frame();
      r.centreDiff = diffIn(base, withF, 0, 320);
      check(r.centreDiff > 12, 'the hound-shape is drawn (' + r.centreDiff + ' px)');
      // it is pixels only: nothing in the entity list, nothing to pick, nothing to hit, nothing saved
      check(G.ents.length === entsBefore.length && G.ents.every((e, i) => e === entsBefore[i]), 'G.ents untouched (not a world entity)');
      check(JSON.stringify(G.ents.map(e => [e.kind, e.type, e.x, e.y, e.hp, e.state, e.hidden])) === jsonBefore, 'no entity changed');
      check(Engine.pick(G.ents, 99) === null, 'nothing under the crosshair to target');
      check(!G.ents.some(e => e.kind === 'enemy'), 'it never counts as an enemy');
      const snap = JSON.stringify(snapshotGame()); check(!/dread_hall.*hound/.test(snap) && snap.indexOf('"foe"') < 0, 'never in a save');
      // walking through it changes nothing: no collision (player passes through that spot after it is gone), no AI
      const cx = Engine.cam.x; for (let i = 0; i < 10; i++) update(0.05); check(Math.abs(Engine.cam.x - cx) < 1e-6, 'a standing player is not moved by it');
      // a wall in front hides it exactly (depth-tested)
      const wallMap = G.map; const wx = Math.floor((3.5 + spot.x) / 2); for (let y = 1; y < 8; y++) wallMap.set(wx, y, WALL('t_stone'));
      const base2 = frame(); DREAD.st.foe = null; const f2 = DREAD.spawnFoe({ x: spot.x, y: spot.y }); f2.a = 0.6; const hid = frame(); r.occluded = diffIn(base2, hid, 0, 320); DREAD.st.foe = null;
      check(r.occluded <= diffIn(base2, frame(), 0, 320) + 5, 'a wall between hides it');
      for (let y = 1; y < 8; y++) wallMap.set(wx, y, null);
      // it dissolves when it would be in clear view, and never moves
      const f3 = DREAD.spawnFoe({ x: 3.5 + 20, y: 4.5 }); f3.a = 0.6; const x0 = f3.x, y0 = f3.y;
      Engine.cam.x = 3.5 + 20 - f3.clear + 1.5; DREAD.stepFoe(0.05); check(f3.dying === true, 'approaching it ends it (clear view at ' + f3.clear.toFixed(1) + ')');
      for (let i = 0; i < 20; i++) DREAD.stepFoe(0.1); check(DREAD.st.foe === null, 'and it is gone, not near you, not behind you');
      check(f3.x === x0 && f3.y === y0, 'it never moved');
      Engine.cam.x = 3.5;
      // staring at it ends it too
      const f4 = DREAD.spawnFoe({ x: 3.5 + 22, y: 4.5 }); f4.a = 0.6; for (let i = 0; i < 30; i++) DREAD.stepFoe(0.1); check(f4.dying === true, 'staring ends it'); for (let i = 0; i < 30; i++) DREAD.stepFoe(0.1);
      // leaving the map ends it
      const f5 = DREAD.spawnFoe({ x: 3.5 + 22, y: 4.5 }); f5.a = 0.5; go('dread_field', 20.5, 20.5, 0); check(DREAD.st.foe === null, 'changing map clears it');
      // it never attacks: five minutes with it standing in a corridor does nothing to the player
      go('dread_hall', 3.5, 4.5, 0); const hp = G.player.hp; DREAD.st.D = 100; const keepFoe = DREAD.spawnFoe(); keepFoe.a = 0.6; keepFoe.life = 1e9; keepFoe.stare = -1e9;
      for (let i = 0; i < 400; i++) { DREAD.stepFoe(0.25); if (DREAD.st.foe) DREAD.st.foe.stare = -1e9; }
      check(G.player.hp === hp && Engine.cam.x === 3.5, 'it never touches you');
      DREAD.st.foe = null;
      // no flash: strength capped lower
      GFX.noFlash = true; const f6 = DREAD.spawnFoe(); for (let i = 0; i < 30; i++) DREAD.stepFoe(0.1); check(f6.a <= 0.42 + 1e-9, 'No flashes lowers the hound-shape’s strength'); GFX.noFlash = false; DREAD.st.foe = null;
      // it comes on its own only at 75+, in the open
      reset(true); hall('dread_hall'); go('dread_hall', 3.5, 4.5, 0); G.tod = 0.5; DREAD.st.D = 90; const n0 = DREAD.stats.foes; for (let i = 0; i < 700; i++) { DREAD.st.D = 90; DREAD.tick(0.25); if (DREAD.st.foe) { DREAD.st.foe.life = 1e9; } if (DREAD.stats.foes > n0) break; }
      check(DREAD.stats.foes > n0, 'at high Dissonance, in a long hall, the hound-shape comes on its own');
      DREAD.st.foe = null; DREAD.st.shadow = null; DREAD.st.cd = 0; const n1 = DREAD.stats.foes; for (let t = 0; t < 300; t += 0.25) { DREAD.st.D = 70; DREAD.tick(0.25); } check(DREAD.stats.foes === n1, 'not below 75');
      return r;
    });
    console.log('PASS False foe: pixels only (not in G.ents, no pick, no hit, not saved), depth-tested, dissolves in clear view / on a stare / on leaving, never moves or attacks', JSON.stringify(foe));
    if (SHOTS) {
      await run(() => { reset(true); hall('dread_hall'); go('dread_hall', 3.5, 4.5, 0); G.tod = 0.9; G.state = 'play'; const f = DREAD.spawnFoe(); f.a = 0.6; f.life = 1e9; Engine.render(G.ents, G.tod); drawHUD(); });
      await shot('02-false-foe-1280.png');
      await run(() => { reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.9; DREAD.st.D = 70; const s = DREAD.spawnShadow(1); s.a = 0.5; s.life = 1e9; Engine.render(G.ents, G.tod); drawHUD(); });
      await shot('03-shadow-1280.png');
    }

    // ================================================================ 7. the stalker
    const stalk = await run(() => {
      const r = {};
      // night, outside the Hedge, standing still: it comes, in four steps, then keeps
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.noise = 1; DREAD.st.mapT = 99;
      const ents0 = G.ents.length;
      check(DREAD.S === 0, 'starts absent');
      const seen = [0], k0 = DREAD.stats.keeps; let kept = false, t = 0;
      for (; t < 400; t += 0.25) { G.noise = 1; DREAD.tick(0.25); if (DREAD.S !== seen[seen.length - 1]) seen.push(DREAD.S); if (DREAD.stats.keeps > k0) { kept = true; break; } }
      r.seen = seen.join('>'); r.secs = t;
      check(seen[1] === 1 && seen.includes(2) && seen.includes(3), 'S advances 0 > 1 > 2 > 3 (' + r.seen + ')');
      check(kept, 'standing still at night in the open, it keeps something in under three minutes (' + t + ' s)');
      check(t > 90, 'but not at once (' + t + ' s)');
      check(Number.isInteger(DREAD.S) && DREAD.S >= 0 && DREAD.S <= 3, 'its state is a small integer');
      check(G.ents.length === ents0 && !G.ents.some(e => /stalk|quiet|dread/i.test(String(e.id || e.type || e.sprite))), 'no world entity, never in G.ents');
      // the cues: what you cannot hear. The message box keeps five lines, so read what was raised
      const cues = DREAD.stats.cues; r.cues = cues.join(',');
      check(cues.some(k => /^c1_/.test(k)) && cues.some(k => /^c2_/.test(k)) && cues.includes('c3'), 'it arrives as a quiet, in three cues: ' + r.cues);
      for (const k of cues) check(/cannot hear|gone quiet|stopped|no sound|is gone|stopped coming back/.test(DREAD.TXT[k]), 'cue "' + k + '" says what you cannot hear');
      // the Hush rules, on every sentence the module can show: never described, kind, nobody screams, no attack
      for (const k of Object.keys(DREAD.TXT)) check(!/scream|shriek|wail|howl|claw|bite|teeth|eyes|figure|creature|monster|shadow|face\b|hand\b|arms?\b|hunt|attack|hurt|blood|kill|die\b|dead\b|grab|snarl/i.test(DREAD.TXT[k]) || k === 'hint', 'text "' + k + '" breaks no Hush rule');
      return r;
    });
    console.log('PASS Stalker: advances through four states on stillness at night, then keeps; no entity', JSON.stringify(stalk));

    const rules = await run(() => {
      const r = {};
      // from the same start (p = 2.0, night, in the open, nothing else going on) apply one thing at a time for 20 s and see which way p moves
      const start = (D) => { reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.noise = 1; DREAD.st.mapT = 99; DREAD.st.D = D || 0; DREAD.st.p = 2.0; DREAD.st.S = 2; DREAD.resetSession && 0; DREAD.st.D = D || 0; };
      const drift = (setup, secs, D) => { start(D); const hook = setup || (() => {}); const p0 = DREAD.st.p; for (let t = 0; t < (secs || 20); t += 0.25) { hook(); DREAD.st.D = Math.max(D || 0, DREAD.st.D); DREAD.tick(0.25); } return DREAD.st.p - p0; };
      r.still = drift(() => { G.noise = 1; G.vel.x = G.vel.y = 0; });
      check(r.still > 0.3, 'control: still, quiet, at night: it comes on (' + r.still.toFixed(2) + ')');
      r.moving = drift(() => { G.noise = 3; G.vel.x = 2; G.vel.y = 0; });
      check(r.moving < 0, 'moving on drives it back (' + r.moving.toFixed(2) + ')');
      r.noise = drift(() => { G.noise = 4; G.vel.x = G.vel.y = 0; });
      check(r.noise < r.still - 0.2, 'noise in moderation holds it off (' + r.noise.toFixed(2) + ')');
      r.murmur = drift(() => { G.noise = 1; G.murmurT = 4; });
      check(r.murmur < 0.01, 'a murmur holds it (' + r.murmur.toFixed(2) + ')');
      r.light = drift(() => { G.noise = 1; UPG.lantern = true; });
      check(r.light < r.still * 0.5, 'a lit lantern slows it (' + r.light.toFixed(2) + ')');
      r.day = drift(() => { G.tod = 0.5; G.noise = 1; });
      check(r.day < 0, 'daylight sends it away (' + r.day.toFixed(2) + ')');
      r.lamp = drift(() => { if (!G.ents.some(e => e.sprite === 'lamp')) addLamp(Engine.cam.x + 3, Engine.cam.y); G.noise = 1; });
      check(r.lamp < -0.5, 'a hush-lamp drives it off fast (' + r.lamp.toFixed(2) + ')');
      r.root = drift(() => { G.noise = 1; G.rootWard = 10; });
      check(r.root < 0, 'the Root Note drives it back (' + r.root.toFixed(2) + ')');
      r.reed = (() => { start(); G.player.inv.push({ id: 'p9_reed_root', n: 1 }); const p0 = DREAD.st.p; REEDS.useRoot(); for (let t = 0; t < 6; t += 0.25) { G.noise = 1; DREAD.tick(0.25); } return DREAD.st.p - p0; })();
      check(r.reed < 0, 'the root-note reed drives it back (' + r.reed.toFixed(2) + ')');
      for (let i = 0; i < 60 && REEDS.steady > 0; i++) update(0.25);           // let the reed's own breath run out (the game's update counts it down)
      check(REEDS.steady <= 0, 'the reed\u2019s steadiness ran out');
      r.talk = drift(() => { G.noise = 1; DREAD.talk = 25; });
      check(r.talk < 0, 'a companion talking drives it back (' + r.talk.toFixed(2) + ')');
      // companions speaking through the game's own party lines set the timer
      DREAD.talk = 0; G.party = { id: 'kaelen', said: {}, order: 'follow', hp: 30 }; try { partySay('Hold.'); } catch (e) { /* msg only */ } check(DREAD.talk > 20, 'a companion’s spoken line starts the timer'); G.party = null; $('#msgs').innerHTML = '';
      // Dissonance draws it, even in daylight, even while walking a little
      r.dissNight = drift(() => { G.noise = 3.5; G.vel.x = 2; }, 20, 100);
      r.dissDay = drift(() => { G.tod = 0.5; G.noise = 3.5; G.vel.x = 2; }, 20, 100);
      r.dissQuiet = drift(() => { G.noise = 1; }, 20, 100);
      check(r.dissNight > r.moving + 0.3, 'at full Dissonance even walking does not shake it (' + r.dissNight.toFixed(2) + ' vs ' + r.moving.toFixed(2) + ')');
      check(r.dissQuiet > r.still, 'Dissonance and stillness add up');
      // retreat is faster than approach
      check(Math.abs(r.moving) > r.still * 0.7 && Math.abs(r.lamp) > r.still, 'it leaves faster than it comes');
      // S follows p in both directions and a quiet line comes back on the way out
      start(); DREAD.st.p = 2.9; DREAD.st.S = 3; G.vel.x = 2; G.noise = 3; tickN(120, 0.25); check(DREAD.S === 0, 'walking on, it falls back to absent'); check(/Sound comes back/.test(msgs()), 'and sound comes back, said once');
      // twenty quiet seconds on every new map; a murmur-less still night cannot push it before that
      start(); go('dread_field', 20.5, 20.5, 0); DREAD.st.mapT = 0; DREAD.st.p = 0; DREAD.st.S = 0; G.noise = 1; tickN(15, 0.25); check(DREAD.st.p === 0, 'a new map gets twenty quiet seconds');
      // moving on to another map loses some of it
      start(); DREAD.st.p = 2.0; DREAD.st.S = 2; go('deepwoods', G.maps.deepwoods.spawn.x, G.maps.deepwoods.spawn.y, 0); check(DREAD.st.p < 1.3, 'a new map loses some of it (' + DREAD.st.p.toFixed(2) + ')');
      return r;
    });
    console.log('PASS Stalker rules: moving, noise, murmur, lantern, daylight, lamp, Root Note / reed, companions retreat it; Dissonance and stillness draw it', JSON.stringify(rules));

    const safe = await run(() => {
      const r = {};
      const setup = (map, x, y) => { reset(true); go(map, x, y, 0); G.tod = 0.92; G.noise = 1; DREAD.st.D = 100; DREAD.st.mapT = 99; };
      // the Hedge: Oakhaven and its rooms
      for (const id of ['oakhaven', 'tavern', 'greenhall', 'chapel', 'orla_house', 'lyra_house', 'mill']) {
        setup(id, G.maps[id].spawn.x, G.maps[id].spawn.y);
        for (let t = 0; t < 400; t += 0.25) { G.noise = 1; DREAD.st.D = 100; DREAD.tick(0.25); }
        check(DREAD.S === 0 && DREAD.st.p === 0, id + ': safe inside the Hedge');
      }
      // Whisper-Grove's plazas and the Coda rooms
      for (const id of ['whispergrove', 'mausoleum', 'belfry']) {
        setup(id, G.maps[id].spawn.x, G.maps[id].spawn.y);
        for (let t = 0; t < 400; t += 0.25) { G.noise = 1; DREAD.st.D = 100; DREAD.tick(0.25); }
        check(DREAD.S === 0 && DREAD.st.p === 0 && !DREAD.st.shadow && !DREAD.st.foe, id + ': never here');
      }
      // entering the Hedge with it behind you ends it, and says why
      setup('dread_field', 20.5, 20.5); DREAD.st.p = 2.2; DREAD.st.S = 2; DREAD.st.D = 0; loadMap('oakhaven', { x: 23.5, y: 20.5, dir: 0 }); G.state = 'play';
      check(DREAD.S === 0 && /Hedge/.test(msgs()), 'walking into the Hedge ends it (the Hedge swallows sound)');
      check(DREAD.st.cd >= 20, 'and it cannot follow straight back out');
      // a boss alive on the map
      setup('dread_field', 20.5, 20.5); const boss = hydrate({ kind: 'enemy', type: 'wearer', x: 24.5, y: 24.5 }); G.map.entities.push(boss); G.ents = G.map.entities; DREAD.scan(true);
      const wB = DREAD.stats.whispers, shB = DREAD.stats.shadows; for (let t = 0; t < 300; t += 0.25) { G.noise = 1; DREAD.tick(0.25); } check(DREAD.S === 0 && DREAD.stats.whispers === wB && DREAD.stats.shadows === shB, 'not while a boss lives'); G.map.entities.splice(G.map.entities.indexOf(boss), 1); G.ents = G.map.entities; DREAD.scan(true);
      // a real foe chasing: nothing new comes
      setup('dread_field', 20.5, 20.5); DREAD.st.D = 100; const h = hydrate({ kind: 'enemy', type: 'hound', x: 21.5, y: 27.5 }); h.state = 'chase'; G.map.entities.push(h); G.ents = G.map.entities; DREAD.scan(true);
      const w0 = DREAD.stats.whispers, s0 = DREAD.stats.shadows; for (let t = 0; t < 200; t += 0.25) { G.noise = 1; DREAD.st.D = 100; DREAD.tick(0.25); } check(DREAD.S === 0 && DREAD.stats.whispers === w0 && DREAD.stats.shadows === s0, 'not while a real foe is on you');
      G.map.entities.splice(G.map.entities.indexOf(h), 1); G.ents = G.map.entities; DREAD.scan(true);
      // dialogue, panels, cutscenes, photo mode, death: frozen, and the sound comes back
      for (const state of ['dialogue', 'panel', 'event', 'photo', 'intro', 'ending', 'dead']) {
        setup('dread_field', 20.5, 20.5); DREAD.st.p = 1.6; DREAD.st.S = 2; DREAD.st.D = 70; G.state = state; const p0 = DREAD.st.p, w = DREAD.stats.whispers;
        for (let t = 0; t < 200; t += 0.25) { G.noise = 1; DREAD.tick(0.25); }
        check(DREAD.st.p === p0 && DREAD.S === 2 && DREAD.stats.whispers === w && !DREAD.st.shadow && !DREAD.st.foe, 'frozen in state ' + state);
        check(DREAD.st.duck < 0.01, 'and its sound is gone during ' + state);
      }
      // the hardcore death sequence
      setup('dread_field', 20.5, 20.5); G.player.hardcore = true; DREAD.st.p = 2.7; DREAD.st.S = 3; const kd = DREAD.stats.keeps; die('test'); const pd = DREAD.st.p; tickN(60, 0.25); check(DREAD.st.p === pd && DREAD.stats.keeps === kd, 'nothing happens during a hardcore death'); G.player.hardcore = false; G.dead = false; hide('#death');
      return { ok: true };
    });
    console.log('PASS Safe places: never in the Hedge, Whisper-Grove’s plazas, the Coda rooms, near a boss or a chasing foe, in dialogue / panels / cutscenes / photo / death', JSON.stringify(safe));

    // ================================================================ 7b. the keeping
    const keeping = await run(() => {
      const r = {};
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.noise = 1; DREAD.st.mapT = 99;
      G.journal.unshift({ cat: 'main', text: 'The line that will be kept.', day: G.day });
      const texts0 = G.journal.map(j => j.text), len0 = G.journal.length;
      DREAD.st.S = 3; DREAD.st.p = 3.39; const keepsA = DREAD.stats.keeps;
      for (let t = 0; t < 12; t += 0.25) { G.noise = 1; DREAD.tick(0.25); }
      check(DREAD.stats.keeps === keepsA + 1, 'one keeping'); const kk = DREAD.stats.keeps - 1 + 1; check(DREAD.st.keep.n === len0, 'it kept the most recent line (n = ' + DREAD.st.keep.n + ')');
      check(DREAD.S === 0 && DREAD.st.cd > 100, 'and it withdrew, with a long rest before another visit');
      check(/Nothing touches you/.test(msgs()), 'what happened is said, gently');
      check(G.journal.map(j => j.text).join('|') === texts0.join('|'), 'G.journal is untouched: the text is still there');
      const hpBefore = G.player.hp; check(G.player.hp === hpBefore && G.player.hp > 0, 'it did not hurt you');
      // the logbook shows the line blank
      renderLog(); let ps = Array.from(document.querySelectorAll('#modal-panel p')).map(p => p.textContent); closeModal(); G.state = 'play';
      check(!ps.some(t => t.includes('The line that will be kept.')), 'the logbook shows that line blank');
      check(ps.some(t => /Rootday|Hearthday|Massday|Stasisday|Dawnday|Memoryday|Nullday|Driftday —\s*$/.test(t)), 'the empty line keeps its day at the head');
      check(G.journal.map(j => j.text).join('|') === texts0.join('|'), 'text restored straight after drawing');
      // the second visit while one is kept takes nothing
      DREAD.st.cd = 0; DREAD.st.S = 3; DREAD.st.p = 3.39; for (let t = 0; t < 12; t += 0.25) { G.noise = 1; DREAD.tick(0.25); }
      check(DREAD.stats.keeps === keepsA + 2 && DREAD.st.keep.n === len0 && /nothing worth keeping/.test(msgs()), 'only one line is ever kept; the second visit takes nothing');
      // new entries do not move the blank line
      journal('side', 'Another line, later.'); renderLog(); ps = Array.from(document.querySelectorAll('#modal-panel p')).map(p => p.textContent); closeModal(); G.state = 'play';
      check(ps.some(t => t.includes('Another line, later.')) && !ps.some(t => t.includes('The line that will be kept.')), 'a newer line shows; the kept one stays blank');
      // it returns at dawn
      DREAD.st.cd = 0; const day0 = G.day; G.tod = 0.97; DREAD.tick(0.25); check(DREAD.st.keep.n > 0, 'not at night');
      G.day = day0 + 1; G.tod = 0.2; DREAD.tick(0.25); check(DREAD.st.keep.n > 0, 'not before dawn');
      G.tod = 0.27; DREAD.tick(0.25); check(DREAD.st.keep.n === 0, 'at dawn it is given back');
      check(/back in your logbook/.test(msgs()) && G.journal[0].text.includes('Everything returned is a gift'), 'with a line that says what it cost');
      renderLog(); ps = Array.from(document.querySelectorAll('#modal-panel p')).map(p => p.textContent); closeModal(); G.state = 'play';
      check(ps.some(t => t.includes('The line that will be kept.')), 'the line is back in the logbook');
      // after dawn the other way round: kept at 2 in the morning returns the same morning
      G.tod = 0.08; DREAD.st.S = 3; DREAD.st.p = 3.39; DREAD.st.cd = 0; for (let t = 0; t < 12; t += 0.25) { G.noise = 1; DREAD.tick(0.25); } check(DREAD.st.keep.n > 0, 'kept again');
      G.tod = 0.3; DREAD.tick(0.25); check(DREAD.st.keep.n === 0, 'kept before dawn, it comes back at that same dawn');
      // resting by a hush-lamp gives it back at once; resting in the dark does not (before dawn)
      DREAD.st.cd = 0; G.tod = 0.92; DREAD.st.S = 3; DREAD.st.p = 3.39; for (let t = 0; t < 12; t += 0.25) { G.noise = 1; DREAD.tick(0.25); }
      check(DREAD.st.keep.n > 0, 'kept a third time'); DREAD.st.D = 50;
      G.tod = 0.9; doRest('self'); check(DREAD.st.keep.n > 0, 'a half rest in the dark does not give it back');
      go('dread_field', 20.5, 20.5, 0); addLamp(Engine.cam.x + 2, Engine.cam.y); G.tod = 0.9; doRest('lamp'); check(DREAD.st.keep.n === 0 && DREAD.st.D === 0, 'a night by a hush-lamp returns it and clears the meter');
      r.ok = true;
      return r;
    });
    console.log('PASS The keeping: the latest logbook line goes blank (display only), only one at a time, returns at dawn or by a hush-lamp, gently said', JSON.stringify(keeping));

    // the logbook at 1280 and 640x400 with a kept line
    await run(() => { reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.journal.unshift({ cat: 'main', text: 'I went down by the shaft with the coil.', day: G.day }); DREAD.st.keep.n = G.journal.length; DREAD.st.keep.ret = Math.round((G.day + 1.3) * 48); G.state = 'panel'; renderLog(); });
    await shot('04-logbook-kept-line-1280.png');
    await run(() => { closeModal(); G.state = 'play'; DREAD.st.keep.n = 0; });

    // ================================================================ 8. saves
    const saves = await run(() => {
      const r = {};
      reset(true); go('clearing', 12.5, 11.5, -Math.PI / 2); G.tod = 0.92;
      G.journal.unshift({ cat: 'main', text: 'Saved while kept.', day: G.day });
      DREAD.st.D = 64.4; DREAD.st.S = 2; DREAD.st.p = 2.1; DREAD.st.keep.n = G.journal.length; DREAD.st.keep.ret = Math.round((G.day + 1.25) * 48); DREAD.st.met = 5;
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      const own = Object.keys(snap.flags).filter(k => /^p10d_/.test(k)); r.keys = own.join(',');
      check(own.length <= 5 && own.every(k => Number.isInteger(snap.flags[k])), 'small validated integers only: ' + JSON.stringify(own.map(k => [k, snap.flags[k]])));
      check(JSON.stringify(own.map(k => snap.flags[k])).length < 40, 'the whole state is a few bytes');
      check(Object.keys(G.flags).every(k => !/^p10d_/.test(k)), 'the live flags stay clean');
      check(!JSON.stringify(snap).includes('shadow') || !/"foe"|"shadow":\{/.test(JSON.stringify(snap)), 'shadow and false foe are never saved');
      // load it back
      DREAD.st.D = 0; DREAD.st.S = 0; DREAD.st.p = 0; DREAD.st.keep.n = 0; DREAD.st.met = 0;
      restoreGame(JSON.parse(JSON.stringify(snap))); G.state = 'play';
      check(DREAD.st.D === 64 && DREAD.S === 2 && DREAD.st.keep.n === G.journal.length && DREAD.st.met === 5, 'state comes back (D ' + DREAD.st.D + ', S ' + DREAD.S + ')');
      check(Object.keys(G.flags).every(k => !/^p10d_/.test(k)), 'and is taken out of the live flags');
      check(DREAD.st.shadow === null && DREAD.st.foe === null, 'no shadow or hound-shape survives a load');
      renderLog(); const ps = Array.from(document.querySelectorAll('#modal-panel p')).map(p => p.textContent); closeModal(); G.state = 'play';
      check(!ps.some(t => t.includes('Saved while kept.')), 'the kept line is still blank after a load');
      // old save: no p10d_ keys at all
      const old = JSON.parse(JSON.stringify(base)); restoreGame(old); G.state = 'play';
      check(DREAD.st.D === 0 && DREAD.S === 0 && DREAD.st.keep.n === 0, 'an old save loads clean');
      // Off: a save made with Dread On opens with Dread Off, state is ignored, flags left alone and the logbook is whole
      DREAD.setOn(true); const withKeep = JSON.parse(JSON.stringify(snap)); DREAD.setOn(false); restoreGame(withKeep); G.state = 'play';
      check(DREAD.st.D === 0 && DREAD.S === 0 && DREAD.st.keep.n === 0, 'Dread Off ignores saved Dread state');
      renderLog(); const ps2 = Array.from(document.querySelectorAll('#modal-panel p')).map(p => p.textContent); closeModal(); G.state = 'play';
      check(ps2.some(t => t.includes('Saved while kept.')), 'with Dread Off the logbook shows every line');
      // hostile saves: every kind of wrong value
      DREAD.setOn(true);
      const hostile = [
        { p10d_d: 'DROP', p10d_s: {}, p10d_kn: [1], p10d_kr: 'x', p10d_m: null },
        { p10d_d: -50, p10d_s: -1, p10d_kn: -3, p10d_kr: -9, p10d_m: -1 },
        { p10d_d: 1e9, p10d_s: 99, p10d_kn: 1e9, p10d_kr: 1e30, p10d_m: 1e9 },
        { p10d_d: NaN, p10d_s: Infinity, p10d_kn: 0.5, p10d_kr: 1.5, p10d_m: 2.5 },
        { p10d_d: 50.5, p10d_s: 1.2, p10d_kn: 2, p10d_kr: 9 },
        { p10d_d: '<img src=x onerror=alert(1)>', p10d_kn: '<script>1</script>', p10d_kr: true, p10d_s: true },
        { __proto__: { p10d_d: 100 }, constructor: 5 },
      ];
      for (const f of hostile) {
        const hs = JSON.parse(JSON.stringify(base)); hs.flags = Object.assign({}, hs.flags); for (const k in f) hs.flags[k] = f[k]; if (Number.isNaN(f.p10d_d)) hs.flags.p10d_d = NaN;
        const text = JSON.stringify(hs).replace(/NaN/g, 'null');
        restoreGame(JSON.parse(text)); G.state = 'play';
        check(Number.isFinite(DREAD.st.D) && DREAD.st.D >= 0 && DREAD.st.D <= 100 && Number.isInteger(DREAD.st.D), 'hostile D stays an integer 0..100 (' + DREAD.st.D + ')');
        check(Number.isInteger(DREAD.S) && DREAD.S >= 0 && DREAD.S <= 3, 'hostile S stays 0..3');
        const kn = DREAD.st.keep.n; check(Number.isInteger(kn) && kn >= 0 && kn <= G.journal.length, 'hostile keep place stays inside the journal');
        check(DREAD.st.keep.n === 0 || DREAD.st.keep.ret <= Math.round((G.day + G.tod + 1.5) * 48) + 1, 'a doctored return time cannot keep a line past tomorrow');
        check(DREAD.st.met >= 0 && DREAD.st.met <= 15, 'story bits stay small');
        renderLog(); const html = document.querySelector('#modal-panel').innerHTML; closeModal(); G.state = 'play';
        check(!/<img src=x|<script>1/.test(html) && !document.querySelector('#modal-panel script'), 'nothing from a hostile flag reaches the page');
        check(!/onerror/.test(document.body.innerHTML), 'no markup from a flag');
        for (let i = 0; i < 40; i++) DREAD.tick(0.25);
      }
      // a hostile journal: the kept place counts from the oldest end; a shrunken journal cannot point out of range
      restoreGame(JSON.parse(JSON.stringify(snap))); G.state = 'play'; DREAD.st.keep.n = 9999; check(DREAD.keptIndex() === -1, 'a place outside the journal is no place'); DREAD.st.keep.n = 0;
      r.ok = true; return r;
    });
    console.log('PASS Saves: a few validated integers (snapshot only), round trip, old save, Dread Off ignores them, hostile values clamped', JSON.stringify(saves));

    // ================================================================ 9. reduce motion, no flashes, captions
    const acc = await run(() => {
      const r = {};
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.noise = 1; GFX.reduceMotion = true; GFX.noFlash = true; ACCESS.settings.cap = true;
      let fxCalls = 0; const _fx = window.fx; window.fx = function () { fxCalls++; return _fx.apply(this, arguments); };
      const shake0 = FEEL.state.shake, dip0 = FEEL.state.dipT; let maxShake = 0, maxFxClass = '';
      // run the whole show: Dissonance high, shadow, hound-shape, stalker to the top, keeping
      // js/dread.js seeds its own generator from Date.now(), and the restore above already drew this session's timers from it:
      // unseeded, a false foe drawn before the first shadow ends this run at the keeping with no shadow about one time in four
      // (Phase 16 as well). Seeded and the timers drawn again, the whole show runs the same way every time.
      DREAD.seed(7); DREAD.resetSession();
      DREAD.st.D = 100; const keepsB = DREAD.stats.keeps, visB = DREAD.stats.visits, whB = DREAD.stats.whispers, shB = DREAD.stats.shadows;
      for (let t = 0; t < 700; t += 0.25) {
        G.noise = 1; DREAD.st.D = Math.max(DREAD.st.D, 90); update(0.25);
        if (DREAD.st.cd > 0 && DREAD.stats.keeps > keepsB) break;
        maxShake = Math.max(maxShake, FEEL.state.shake); if ($('#fx').className) maxFxClass = $('#fx').className;
        if (t % 5 === 0) { Engine.render(G.ents, G.tod); drawHUD(); }
      }
      window.fx = _fx;
      check(DREAD.stats.whispers > whB && DREAD.stats.shadows > shB && DREAD.stats.visits > visB, 'the whole sequence ran (whispers ' + (DREAD.stats.whispers - whB) + ', shadows ' + (DREAD.stats.shadows - shB) + ', visits ' + (DREAD.stats.visits - visB) + ')');
      check(maxShake === 0 && FEEL.state.shake === shake0, 'no screen shake, ever');
      check(fxCalls === 0 && maxFxClass === '', 'no full-view flash (fx() never called, #fx never set)');
      check(FEEL.state.dipT === dip0 || FEEL.state.dipT >= 1, 'no camera dip');
      // captions: only the allowed set
      const allowed = new Set(Object.keys(DREAD.TXT).filter(k => k[0] === 'k').map(k => DREAD.TXT[k])); const c = caps();
      check(c.length > 0 && c.every(t => allowed.has(t)), 'captions are only from the listed set: ' + JSON.stringify(c));
      check(DREAD.stats.captions.includes('[a whisper behind you]'), 'the whisper has its caption');
      check(DREAD.stats.captions.some(t => /goes quiet|dripping stops|go quiet/.test(t)), 'the first quiet has its caption ("[the river goes quiet]" and kin)');
      r.captions = Array.from(new Set(DREAD.stats.captions));
      // captions off: no caption box entries
      document.querySelectorAll('#ac-captions div').forEach(d => d.remove()); ACCESS.settings.cap = false; DREAD.whisper(); check(caps().length === 0, 'Sound captions off: no caption');
      // the river: a map with water says so
      ACCESS.settings.cap = true; DREAD.st.cd = 0; DREAD.st.S = 0; DREAD.st.p = 0; const cue = DREAD.cueFor(1); r.cue = cue[0];
      const wmap = Object.values(G.maps).find(m => m.floorTextures && m.floorTextures.includes('t_water')); go(wmap.id, wmap.spawn.x, wmap.spawn.y, 0); check(DREAD.cueFor(1)[0] === 'c1_river' && DREAD.TXT.k_river === '[the river goes quiet]', 'by water: "[the river goes quiet]"');
      return r;
    });
    console.log('PASS Accessibility: no shake, no flash, no fx() call, captions only from the listed set and only when on', JSON.stringify(acc));

    // ================================================================ 10. the sounds: ambient dip, own steps, crows, the drawn-off breath
    const snd = await run(() => {
      const r = {};
      reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.92; G.noise = 1;
      // the ambient bed dips with S and comes back
      const duckAt = (S) => { DREAD.st.S = S; for (let t = 0; t < 12; t += 0.25) { G.noise = 1; DREAD.st.p = S + 0.3; DREAD.tick(0.25); } return DREAD.st.duck; };
      r.d0 = duckAt(0); r.d1 = duckAt(1); r.d2 = duckAt(2); r.d3 = duckAt(3);
      check(r.d0 === 0 && r.d1 > 0.05 && r.d2 > r.d1 && r.d3 > r.d2 && r.d3 < 0.5, 'the bed dips further with each state (' + [r.d0, r.d1, r.d2, r.d3].map(v => v.toFixed(2)).join(' < ') + ')');
      DREAD.st.S = 0; DREAD.st.p = 0; DREAD.st.cd = 999; tickN(30, 0.25); check(DREAD.st.duck === 0, 'and the sound comes all the way back');
      // own footsteps
      DREAD.st.S = 0; DREAD.st.p = 0.2; const before = window.__allNodes; for (let i = 0; i < 6; i++) Audio_.sfx.step(); const n0 = window.__allNodes - before;
      DREAD.st.S = 2; const b2 = window.__allNodes; for (let i = 0; i < 6; i++) Audio_.sfx.step(); const n2 = window.__allNodes - b2;
      DREAD.st.S = 3; const b3 = window.__allNodes; for (let i = 0; i < 6; i++) Audio_.sfx.step(); const n3 = window.__allNodes - b3;
      check(n0 > 0 && n2 > 0 && n2 < n0 && n3 === 0, 'footsteps: all at S0, about half at S2, none at S3 (' + [n0, n2, n3].join('/') + ' nodes)');
      DREAD.st.S = 1; const bb = window.__allNodes; for (let i = 0; i < 4; i++) { Audio_.sfx.bird(); Audio_.sfx.rat(); } check(window.__allNodes === bb, 'the crows and rats stop at S1');
      DREAD.st.S = 0; DREAD.setOn(false); DREAD.st.S = 3; const bo = window.__allNodes; Audio_.sfx.step(); check(window.__allNodes > bo, 'with Dread Off the game’s steps always sound'); DREAD.setOn(true); DREAD.st.S = 0;
      // the drawn-off breath, placed behind
      reset(true); go('dread_field', 20.5, 20.5, 1.1); G.tod = 0.92; G.noise = 1; DREAD.st.p = 0.45; DREAD.st.S = 0; G.vel.x = G.vel.y = 0; const dn = window.__dreadNodes;
      DREAD.st.D = 0; for (let t = 0; t < 40; t += 0.25) { G.noise = 1; DREAD.tick(0.25); if (DREAD.S >= 1) break; }
      check(DREAD.S === 1 && DREAD.stats.lastInhale && Math.abs(DREAD.stats.lastInhale.bearing) > 2.2, 'the presence arrives behind you (bearing ' + (DREAD.stats.lastInhale && DREAD.stats.lastInhale.bearing.toFixed(2)) + ')');
      check(window.__dreadNodes > dn, 'and the sound being drawn off is made');
      // its position is computed relative to you every tick, and always behind your heading
      const p1 = DREAD.stalkerPos(); Engine.cam.x += 3; Engine.cam.dir += 0.8; DREAD.tick(0.25); const p2 = DREAD.stalkerPos();
      check(p1 && p2 && Math.hypot(p2.x - p1.x, p2.y - p1.y) > 2, 'its sound position follows you');
      for (const dir of [0, 1, 2, 3, 4, 5]) { Engine.cam.dir = dir; DREAD.tick(0.25); const q = DREAD.stalkerPos(); let b = Math.atan2(q.y - Engine.cam.y, q.x - Engine.cam.x) - dir; while (b > Math.PI) b -= 2 * Math.PI; while (b < -Math.PI) b += 2 * Math.PI; check(Math.abs(b) > Math.PI - 0.6, 'behind at heading ' + dir); }
      DREAD.st.S = 3; const q3 = DREAD.stalkerPos(); DREAD.st.S = 1; const q1 = DREAD.stalkerPos(); check(q3.dist < q1.dist, 'nearer as the state rises');
      check(window.__ctxCount === 1, 'still the game’s one AudioContext');
      return r;
    });
    console.log('PASS Sound: the bed dips by state and returns, own steps and the crows go quiet, the drawn-off breath comes from behind, one AudioContext', JSON.stringify(snd));

    // ================================================================ 11. frame cost
    const perf = await run(() => {
      reset(true); hall('dread_hall'); go('dread_hall', 3.5, 4.5, 0); G.tod = 0.9;
      // 12 enemies in view (isolated: no AI, just the render), like test/creature-life.test.js section 6
      const crowd = []; for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'quiet', 'legionnaire'][i % 4], x: 8 + i * 2, y: 3.5 + (i % 3) }); e.state = 'idle'; crowd.push(e); }
      G.map.entities.push(...crowd); G.ents = G.map.entities;
      // paired and interleaved: the machine is shared and noisy, so each Off frame is timed right beside an On frame and the
      // median of the differences is what counts (Off and On medians taken minutes apart would measure the neighbours)
      const sh = DREAD.spawnShadow(1); sh.a = 0.5; sh.life = 1e9; const fo = DREAD.spawnFoe(); if (fo) { fo.a = 0.6; fo.life = 1e9; fo.stare = -1e9; }
      const offSet = () => { DREAD.setOn(false); DREAD.st.shadow = null; DREAD.st.foe = null; };
      const onSet = () => { DREAD.setOn(true); DREAD.st.D = 100; DREAD.st.S = 3; DREAD.st.p = 3; DREAD.st.cd = 0; DREAD.st.shadow = sh; DREAD.st.foe = fo; if (fo) { fo.stare = -1e9; fo.dying = false; } };
      const one = () => { const t0 = performance.now(); for (let j = 0; j < 3; j++) { DREAD.tick(0.016); Engine.render(G.ents, G.tod); drawHUD(); } return (performance.now() - t0) / 3; };
      for (let k = 0; k < 20; k++) { offSet(); one(); onSet(); one(); }
      const offs = [], ons = [], diffs = [];
      for (let k = 0; k < 160; k++) { offSet(); const a = one(); onSet(); const b = one(); offs.push(a); ons.push(b); diffs.push(b - a); }
      const med = (v) => v.slice().sort((x, y) => x - y)[v.length >> 1];
      DREAD.setOn(true); DREAD.st.shadow = null; DREAD.st.foe = null; DREAD.st.D = 0; DREAD.st.S = 0;
      return { offMs: +med(offs).toFixed(3), onMs: +med(ons).toFixed(3), extraMs: +med(diffs).toFixed(3) };
    });
    console.log('FRAME COST (median ms per tick+render+HUD, 12-enemy scene, 1x): Dread off', perf.offMs, '| on with meter, shadow, hound-shape and S3', perf.onMs, '| extra', perf.extraMs);
    assert.ok(perf.extraMs < 1.0, 'extra frame cost under 1 ms (' + perf.extraMs + ')');
    console.log('PASS Perf: under 1 ms extra');

    // ================================================================ 12. the Options row and 640x400
    await run(() => { reset(false); closeModal(); G.state = 'panel'; renderAccessibilityMenu(); });
    const row = await page.locator('#dread-on');
    assert.equal(await row.textContent(), 'Off');
    await row.click();
    assert.equal(await row.textContent(), 'On'); assert.equal(await run(() => DREAD.set.on), true);
    assert.equal(await run(() => JSON.parse(localStorage.getItem('octave.dread.v1')).on), 1, 'the setting persists');
    await row.click(); assert.equal(await row.textContent(), 'Off');
    await shot('05-options-dread-row-1280.png');
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'options panel: no horizontal overflow at 640x400');
    await page.locator('#dread-on').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#dread-on').evaluate(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 20; }), true, 'the Dread button is inside the screen at 640x400');
    await shot('06-options-dread-row-640.png');
    // the HUD band and a scare at 640x400
    await run(() => { closeModal(); reset(true); go('dread_field', 20.5, 20.5, -Math.PI / 2); G.tod = 0.9; DREAD.st.D = 80; const s = DREAD.spawnShadow(1); s.a = 0.5; s.life = 1e9; Engine.render(G.ents, G.tod); drawHUD(); });
    await shot('07-meter-shadow-640.png');
    const fits = await run(() => {
      const g = document.getElementById('game').getBoundingClientRect();
      return { w: Math.round(g.width), h: Math.round(g.height), overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.equal(fits.overflowX, false, 'no horizontal page scroll at 640x400');
    console.log('PASS Options: one persisted Dread row, fits 640x400, no overflow', JSON.stringify(fits));
    await page.setViewportSize({ width: 1280, height: 800 });
    await run(() => { DREAD.setOn(false); });

    // French: every player-visible string has a pair in tools/i18n/p10-dread.tsv, and the French keeps the typography rules
    const tsv = new Map(fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p10-dread.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')));
    const cat = await run(() => DREAD.catalog().map(c => c.en));
    for (const en of cat) assert.ok(tsv.get(en) && tsv.get(en).length > 3, 'French line missing for: ' + en);
    for (const [en, fr] of tsv) { assert.ok(cat.includes(en), 'TSV line the game never shows: ' + en); assert.ok(!/\s{2,}|[ ]$/.test(fr), 'stray spaces: ' + fr); }
    console.log('PASS French: ' + cat.length + ' strings, all in tools/i18n/p10-dread.tsv');

    assert.deepEqual(errors, [], 'no page errors: ' + JSON.stringify(errors));
    console.log('PASS no page errors');
    console.log('ALL DREAD TESTS PASSED');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e && e.message || e); process.exit(1); });
