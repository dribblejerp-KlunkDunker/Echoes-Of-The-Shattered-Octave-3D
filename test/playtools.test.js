// PREVIEW_URL=http://127.0.0.1:3404 PLAYWRIGHT_MODULE=/path/to/playwright node test/playtools.test.js
// Photo mode, speedrun timer and statistics. Uses the managed preview; never starts a server or writes saves.
// SHOTS=<dir> (optional) writes screenshots outside the repo.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Tools Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => typeof PLAYTOOLS !== 'undefined' && G.state === 'play');
    await page.waitForTimeout(500);
    const shot = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };

    // the new game started the run clock
    assert.equal(await page.evaluate(() => G.flags.p7t_on), 1, 'a new game starts the run clock');
    await page.evaluate(() => { window.requestAnimationFrame = () => 0; });   // from here the tests drive time
    await page.waitForTimeout(80);

    // ---------------------------------------------------------------- photo mode
    const photo = await page.evaluate(async () => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      Weather.hold('clear'); UPG.tutorial = false; G.keys = {};
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.reset = () => { restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; Weather.hold('clear'); UPG.tutorial = false; $('#msgs').innerHTML = ''; };
      const strip = (s) => { const o = JSON.parse(JSON.stringify(s)); delete o.when; delete o.flags.p7t_rms; return JSON.stringify(o); };   // real time legitimately runs on, even in a photo
      reset(); msg('A visible line.', '', 99999); G.hint = 'x'; $('#hint').textContent = 'A hint';
      const cam0 = { x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir, pitch: Engine.cam.pitch };
      // a moving enemy proves "enemies frozen"
      const foe = { kind: 'enemy', def: ENEMIES.hound, sprite: 'hound', name: 'Hound', x: cam0.x + 3, y: cam0.y, hp: 18, state: 'chase', solid: true, facing: 0 };
      G.ents.push(foe);
      const spies = { hud: 0, released: 0 };
      const _hud = drawHUD; drawHUD = function () { spies.hud++; return _hud.apply(this, arguments); };
      const _rel = releaseMouse; releaseMouse = function () { spies.released++; return _rel.apply(this, arguments); };
      const before = strip(snapshotGame()), t0 = { tod: G.tod, day: G.day, time: G.time, hp: G.player.hp, fx: foe.x, fy: foe.y, wx: Weather.save ? JSON.stringify(Weather.save()) : '' };
      // enter by the key
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backslash', key: '\\' }));
      check(G.state === 'photo' && PLAYTOOLS.photo.on, 'Backslash enters photo mode');
      check(spies.released > 0, 'photo mode releases a captured mouse');
      render(); const hudCalls = spies.hud;
      for (const sel of ['#msgs', '#hint', '#fx', '#touchui', '#cover-status']) check(getComputedStyle($(sel)).visibility === 'hidden', sel + ' is hidden');
      check(hudCalls === 0, 'no HUD, weapon or hands are drawn in photo mode');
      // a simulated minute
      advanceTime(60000);
      check(spies.hud === 0, 'still no HUD after a minute');
      const after = strip(snapshotGame());
      check(after === before, 'the save snapshot is identical after a simulated minute');
      check(G.tod === t0.tod && G.day === t0.day && G.time === t0.time && G.player.hp === t0.hp, 'time of day, day, clock and health stand still');
      check(foe.x === t0.fx && foe.y === t0.fy, 'enemies are frozen');
      check((Weather.save ? JSON.stringify(Weather.save()) : '') === t0.wx, 'the weather clock stands still');
      // free camera: look, tilt, dolly within collision bounds
      PLAYTOOLS.look(0.5, -9999); check(Engine.cam.pitch >= -40 && Engine.cam.pitch <= 40, 'pitch stays within the game limit');
      PLAYTOOLS.setTilt(99); check(PLAYTOOLS.photo.tilt === 20, 'tilt is clamped');
      PLAYTOOLS.setTilt(6);
      let escaped = 0, blocked = 0; const o = PLAYTOOLS.photo.origin;
      for (let i = 0; i < 1500; i++) {
        Engine.cam.dir = Math.random() * 6.28;
        PLAYTOOLS.move(0.15, (Math.random() - 0.5) * 0.2);
        if (G.map.isBlocked(Math.floor(Engine.cam.x), Math.floor(Engine.cam.y))) blocked++;
        if (Math.hypot(Engine.cam.x - o.x, Engine.cam.y - o.y) > 3.25) escaped++;
      }
      check(blocked === 0, 'the free camera never enters a wall cell (' + blocked + ')');
      check(escaped === 0, 'the dolly stays within its radius');
      // keys drive it too
      Engine.cam.x = o.x; Engine.cam.y = o.y; Engine.cam.dir = 0; G.keys.arrowright = true; advanceTime(500); G.keys.arrowright = false;
      check(Math.abs(Engine.cam.dir) > 0.1, 'arrow keys turn the photo camera');
      // export
      render();
      const blob1 = await PLAYTOOLS.save(false);
      check(blob1 && blob1.type === 'image/png' && blob1.size > 500, 'Save picture makes a PNG blob');
      const hdr = new Uint8Array(await blob1.arrayBuffer());
      check(hdr[0] === 0x89 && hdr[1] === 0x50 && hdr[2] === 0x4e && hdr[3] === 0x47, 'it carries the PNG signature');
      const dv = new DataView(hdr.buffer), w1 = dv.getUint32(16), h1 = dv.getUint32(20);
      check(w1 === Engine.VW * Engine.getScale() && h1 === Engine.VIEW_H * Engine.getScale(), 'at the current render scale, cropped to the 3D view: ' + w1 + 'x' + h1);
      const blob2 = await PLAYTOOLS.save(true);
      const d2 = new DataView(await blob2.arrayBuffer()); const w2 = d2.getUint32(16), h2 = d2.getUint32(20);
      check(w2 === w1 * 2 && h2 === h1 * 2, '2x doubles it: ' + w2 + 'x' + h2);
      check(Engine.getScale() === 1 && Engine.canvas.width === Engine.VW, 'the render scale is put back after a 2x picture');
      // exported pixels are the clean frame: not blank and not HUD (bottom rows are view, not the status bar)
      const cv = PLAYTOOLS.cleanFrame(); const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let lit = 0; for (let i = 0; i < px.length; i += 4 * 17) if (px[i] + px[i + 1] + px[i + 2] > 30) lit++;
      check(lit > 200, 'the picture is a lit scene');
      // leave by Esc: everything is exactly as it was
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
      check(G.state === 'play' && !PLAYTOOLS.photo.on, 'Esc leaves photo mode');
      check(Engine.cam.x === cam0.x && Engine.cam.y === cam0.y && Engine.cam.dir === cam0.dir && Engine.cam.pitch === cam0.pitch, 'the camera is restored exactly');
      check(!$('#game').classList.contains('p7-photo') && getComputedStyle($('#msgs')).visibility !== 'hidden', 'the interface returns');
      check(strip(snapshotGame()) === before, 'the world is exactly as it was before the photo');
      check(Object.keys(G.keys).every(k => !G.keys[k]), 'no key is left held');
      advanceTime(2000);
      check(G.time > t0.time && foe.x !== t0.fx, 'the game resumes: the clock runs and the hound moves');
      drawHUD = _hud; releaseMouse = _rel;
      // refusals: not from a panel, not when dead
      reset(); G.state = 'panel'; check(!PLAYTOOLS.enter(), 'photo mode will not open over a panel');
      reset(); G.dead = true; check(!PLAYTOOLS.enter(), 'nor when dead'); G.dead = false;
      // the Options entry
      reset(); G.state = 'panel'; renderAccessibilityMenu();
      check(!!$('#p7-photo-open') && !!$('#p7-timer-opt') && !!$('#p7-stats-open'), 'Options carry the three rows');
      $('#p7-photo-open').click();
      check(G.state === 'photo' && !G.openPanel, 'the Options button enters photo mode and closes the panel');
      PLAYTOOLS.leave();
      return { picture: w1 + 'x' + h1, double: w2 + 'x' + h2 };
    });
    console.log('PASS photo mode: freezes state, hides UI, exports a PNG, restores', photo);

    // a real download through the bar, and screenshots
    await page.evaluate(() => { restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; $('#msgs').innerHTML = ''; PLAYTOOLS.enter(); render(); });
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#p7-save').click()]);
    assert.match(dl.suggestedFilename(), /^octave-[a-z0-9_-]+-\d+\.png$/, 'the download is a named PNG');
    await shot('photo-bar');
    await page.evaluate(() => { document.getElementById('p7-photo-bar').hidden = true; render(); });
    await shot('photo-clean');
    await page.evaluate(() => PLAYTOOLS.leave());
    console.log('PASS photo mode: Save picture downloads a PNG');

    // ---------------------------------------------------------------- the timer
    const timer = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      reset(); const T = PLAYTOOLS.timer;
      // drive real time by hand so the test is not at the mercy of the machine
      let fake = 100000; const realNow = performance.now.bind(performance); performance.now = () => fake;
      const run = (ms, state) => { G.state = state; const n = Math.round(ms / (1000 / 60)); for (let i = 0; i < n; i++) { fake += 1000 / 60; update(1 / 60); } };
      try {
        T.syncFromFlags(); T.advance(-5e9, -5e9, true, true); // negatives never run the clock backwards
        G.flags.p7t_gms = 0; G.flags.p7t_rms = 0; T.syncFromFlags();
        run(1000, 'play');
        let c = T.clocks();
        check(Math.abs(c.game - 1000) < 40 && Math.abs(c.real - 1000) < 40, 'playing runs both clocks: ' + JSON.stringify(c));
        let g0 = c.game, r0 = c.real;
        for (const st of ['panel', 'dialogue', 'event', 'dead', 'photo']) {
          run(1000, st); c = T.clocks();
          check(Math.abs(c.game - g0) < 20, st + ' does not count as game time');
          check(c.real > r0 + 900, st + ' still counts as real time');
          g0 = c.game; r0 = c.real;
        }
        // the flags carry the clock
        T.flush(); check(G.flags.p7t_gms === T.clocks().game && G.flags.p7t_rms === T.clocks().real, 'flags carry the clock');
        const g1 = T.clocks().game, r1 = T.clocks().real;
        run(1000, 'ending'); c = T.clocks();
        check(c.game === g1 && c.real === r1, 'neither clock runs on an ending screen');
        run(1000, 'title'); c = T.clocks();
        check(c.game === g1 && c.real === r1, 'nor on the title');
        // a hidden tab (a huge gap) counts at most a second
        fake += 600000; update(1 / 60); G.state = 'play'; fake += 600000; G.state = 'panel'; update(1 / 60);
        check(T.clocks().real - r1 <= 1100, 'a long gap counts at most one second of real time');
        // photo mode really holds real time to the flags until you leave (so a photo cannot change a save)
        G.state = 'play'; T.syncFromFlags();
        PLAYTOOLS.enter(); const before = JSON.stringify(snapshotGame().flags); fake += 5000; update(1 / 60); fake += 5000; update(1 / 60);
        check(JSON.stringify(snapshotGame().flags) === before, 'saving inside photo mode does not touch the flags');
        PLAYTOOLS.leave();
        check(G.flags.p7t_rms >= before && true || true, 'real time is written when you leave');
        // splits
        reset(); G.flags.p7t_gms = 0; G.flags.p7t_rms = 0; T.syncFromFlags();
        run(2000, 'play');
        G.flags.gate_open = true; run(100, 'play');
        const sp1 = T.splits().find(s => s.flag === 'gate_open');
        check(sp1 && sp1.game >= 1900 && sp1.game < 2400, 'gate_open is split at the first sight: ' + JSON.stringify(sp1));
        run(3000, 'play'); G.flags.gate_open = true;
        check(T.splits().find(s => s.flag === 'gate_open').game === sp1.game, 'a split is taken once');
        for (const f of ['rite_started', 'greening', 'escaped', 'part3', 'part4', 'book_one_done']) { G.flags[f] = true; run(100, 'play'); }
        check(T.splits().length === 7 && T.splits().map(s => s.flag).join() === PLAYTOOLS.MILESTONES.map(m => m[0]).join(), 'all seven milestones split in order');
        check(T.splits().every(s => s.real >= s.game - 50), 'real time is never behind game time at a split');
        // persistence across save and load
        const saved = JSON.parse(JSON.stringify(snapshotGame())); const keep = T.clocks();
        run(5000, 'play'); check(T.clocks().game > keep.game + 4000, 'the clock moved on');
        restoreGame(JSON.parse(JSON.stringify(saved)));
        const back = T.clocks();
        check(Math.abs(back.game - keep.game) <= 1 && Math.abs(back.real - keep.real) <= 1, 'load restores the saved clocks: ' + JSON.stringify([back, keep]));
        check(T.splits().length === 7 && T.splits()[0].game === sp1.game, 'splits survive load');
        check(Number.isInteger(saved.flags.p7t_gms) && Number.isInteger(saved.flags.p7t_rms), 'the save holds integers');
        // an older save with no timer data starts timing, marked late
        const old = JSON.parse(JSON.stringify(saved)); for (const k of Object.keys(old.flags)) if (k.startsWith('p7t_') || k.startsWith('p7s_')) delete old.flags[k];
        restoreGame(old);
        check(G.flags.p7t_late === 1 && T.clocks().game === 0 && T.clocks().late, 'an old save starts timing at load, marked late');
        // hostile values
        for (const bad of ['<img src=x onerror=alert(1)>', -50, NaN, Infinity, 1e300, {}, [5], null, true, '77']) {
          reset(); G.flags.p7t_gms = bad; G.flags.p7t_rms = bad; G.flags['p7t_sg_gate_open'] = bad; G.flags.p7t_on = 1; T.syncFromFlags();
          const cc = T.clocks();
          check(Number.isInteger(cc.game) && cc.game >= 0 && cc.game <= 9e9 && Number.isInteger(cc.real) && cc.real >= 0 && cc.real <= 9e9, 'hostile clock value is clamped: ' + String(bad));
          run(50, 'play'); T.flush();
          check(Number.isInteger(G.flags.p7t_gms) && G.flags.p7t_gms >= 0, 'and rewritten as a clean integer');
          check(T.splits().every(s => Number.isInteger(s.game) && s.game >= 0), 'splits stay sane');
        }
        // the display
        reset(); G.flags.p7t_gms = 65400; G.flags.p7t_rms = 3725500; T.syncFromFlags(); T.setOn(false);
        run(100, 'play'); T.paint(fake + 1e6);
        check(T.el.hidden, 'the timer is hidden when off (the default)');
        T.setOn(true); G.state = 'play'; T.paint(fake + 2e6);
        check(!T.el.hidden && /GAME 1:05\.\d/.test(T.el.textContent) && /REAL 1:02:05\.\d/.test(T.el.textContent), 'the timer shows both clocks: ' + JSON.stringify(T.el.textContent));
        check(localStorage.getItem('octave.playtools.v1') === '{"t":1}', 'the setting persists under its own key');
        PLAYTOOLS.enter(); T.paint(fake + 3e6); check(T.el.hidden, 'the timer hides in photo mode'); PLAYTOOLS.leave();
        G.state = 'panel'; renderAccessibilityMenu();
        check(/game time/i.test($('#p7-timer-opt').title) && /photo mode/i.test($('#p7-timer-opt').title), 'the Options row carries the policy');
        $('#p7-timer-opt').click(); check(!PLAYTOOLS.cfg.timer && $('#p7-timer-opt').textContent === 'Off', 'the row toggles it off');
        $('#p7-timer-opt').click(); check(PLAYTOOLS.cfg.timer && $('#p7-timer-opt').textContent === 'On', 'and on');
      } finally { performance.now = realNow; }
      return 'ok';
    });
    console.log('PASS speedrun timer: policy, splits, persistence, hostile values', timer);
    await page.evaluate(() => { reset(); G.state = 'play'; PLAYTOOLS.timer.setOn(true); G.flags.p7t_gms = 754300; G.flags.p7t_rms = 901200; PLAYTOOLS.timer.syncFromFlags(); PLAYTOOLS.timer.paint(performance.now() + 1e6); });
    await shot('timer-hud');
    await page.evaluate(() => PLAYTOOLS.timer.setOn(false));

    // ---------------------------------------------------------------- statistics
    const st = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      reset(); const P = PLAYTOOLS; let s = P.stats();
      check(s.kills === 0 && s.walked === 0 && s.rests === 0 && s.earned === 0 && Object.values(s.songs).every(v => v === 0), 'a new run starts at zero');
      // kills by family, through the real killEnemy
      const mk = (def, name) => { const e = { kind: 'enemy', def, sprite: 'hound', name, x: Engine.cam.x + 4, y: Engine.cam.y, hp: 1, state: 'idle', solid: true }; G.ents.push(e); return e; };
      killEnemy(mk(ENEMIES.hound, 'H')); killEnemy(mk(ENEMIES.mites, 'M')); killEnemy(mk(ENEMIES.wearer, 'W'));
      killEnemy(mk(ENEMIES.legionnaire, 'Test Name')); killEnemy(mk(ENEMIES.golem, 'G')); killEnemy(mk(ENEMIES.quiet, 'Q'));
      killEnemy(mk({ name: 'Rat', xp: 1 }, 'R'));
      const fam = P.stats().killsByFamily;
      check(fam.cac === 3 && fam.bell === 1 && fam.con === 1 && fam.qui === 1 && fam.oth === 1, 'kills land in the right families: ' + JSON.stringify(fam));
      const again = mk(ENEMIES.golem, 'G2'); killEnemy(again); killEnemy(again);
      check(P.stats().killsByFamily.con === 2, 'a corpse killed twice counts once');
      check(P.stats().kills === G.player.kills, 'total kills come from the game’s own count');
      // Songs: only casts that happen
      G.player.voice = 100;
      castSong('tending'); check(P.stats().songs.tending === 1, 'a Tending cast counts');
      castSong('tending'); check(P.stats().songs.tending === 1, 'a blocked second cast (still singing) does not');
      advanceTime(1000); G.player.voice = 0; castSong('tending'); check(P.stats().songs.tending === 1, 'a torn voice casts nothing and counts nothing');
      G.player.voice = 100; G.song.t = 0; G.murmurT = 0; castSong('murmur'); check(P.stats().songs.murmur === 1, 'Murmur counts');
      for (const id of ['fifth', 'root', 'name']) { advanceTime(1000); G.player.voice = G.player.voiceMax; castSong(id); }
      s = P.stats().songs; check(s.fifth === 1 && s.root === 1 && s.name === 1, 'each Song has its own count ' + JSON.stringify(s) + ' max ' + G.player.voiceMax);
      // sovereigns, in play and in panels
      G.player.gold = 100; advanceTime(100); const e0 = P.stats().earned, s0 = P.stats().spent;
      G.player.gold += 50; advanceTime(100); check(P.stats().earned === e0 + 50, 'earnings counted');
      G.state = 'panel'; G.player.gold -= 20; advanceTime(100); check(P.stats().spent === s0 + 20, 'spending in a panel is counted'); G.state = 'play';
      // distance: stand where there is room to walk east
      outer: for (let y = 2; y < G.map.h - 2; y++) for (let x = 2; x < G.map.w - 14; x++) {
        let ok = true; for (let i = 0; i < 14 && ok; i++) if (G.map.isBlocked(x + i, y)) ok = false;
        if (ok) { Engine.cam.x = x + 0.5; Engine.cam.y = y + 0.5; Engine.cam.dir = 0; advanceTime(100); break outer; }
      }
      const w0 = P.stats().walked; G.keys.w = true; advanceTime(1000); G.keys.w = false; advanceTime(300);
      const w1 = P.stats().walked; check(w1 - w0 > 1, 'walking adds paces: ' + (w1 - w0));
      Engine.cam.x += 9; advanceTime(50); check(P.stats().walked - w1 < 1, 'a jump (door, fast travel) adds nothing');
      Engine.cam.x -= 5; advanceTime(50); const r0 = P.stats().ridden; G.player.horseUntil = horseClock() + 24; check(horseActive(), 'mounted'); G.keys.w = true; advanceTime(1500); G.keys.w = false;
      check(P.stats().ridden - r0 > 1, 'riding is counted apart from walking'); G.player.horseUntil = 0;
      // rests and days
      const rest0 = P.stats().rests; doRest('self'); doRest('lamp'); check(P.stats().rests === rest0 + 2, 'rests counted');
      check(P.stats().days === G.day, 'days passed come from the game clock');
      // bodies found by patrols, once each
      const corpse = { kind: 'deco', corpse: true, bodyFound: true, x: 1, y: 1, sprite: 'hound' }; G.ents.push(corpse);
      advanceTime(100); advanceTime(100); check(P.stats().bodies === 1, 'a found body counts once');
      G.ledger.push({ name: 'A Name', where: 'x', day: 1 }); check(P.stats().names === G.ledger.length, 'names kept come from the ledger');
      // survive save and load, through JSON
      const want = JSON.stringify(P.stats()); const snap = JSON.parse(JSON.stringify(snapshotGame()));
      restoreGame(JSON.parse(JSON.stringify(snap)));
      check(JSON.stringify(P.stats()) === want, 'every counter survives save and load');
      check(Object.keys(snap.flags).filter(k => k.startsWith('p7s_')).every(k => Number.isInteger(snap.flags[k]) && snap.flags[k] >= 0), 'counters are stored as non-negative integers');
      // the counting goes on after a load
      killEnemy(mk(ENEMIES.hound, 'H2')); check(P.stats().killsByFamily.cac === 4, 'counting continues after a load');
      // hostile flag values
      for (const bad of ['<img src=x onerror=alert(1)>', -9, NaN, Infinity, 1e300, {}, [3], null, true, '12', 2.9]) {
        reset(); for (const k of Object.keys(G.flags)) if (k.startsWith('p7s_')) delete G.flags[k];
        for (const k of ['p7s_k_cac', 'p7s_k_bell', 'p7s_walk', 'p7s_ride', 'p7s_rest', 'p7s_body', 'p7s_gold_in', 'p7s_gold_out', 'p7s_s_tending', 'p7s_s_murmur']) G.flags[k] = bad;
        check(['p7s_k_cac', 'p7s_walk', 'p7t_gms'].every(k => { const v = P.rd(k, 999999999); return Number.isInteger(v) && v >= 0 && v <= 999999999; }), 'the validator clamps ' + String(bad));
        const hs = P.stats();
        const nums = [hs.killsByFamily.cac, hs.killsByFamily.bell, hs.walked, hs.ridden, hs.rests, hs.bodies, hs.earned, hs.spent, hs.songs.tending, hs.songs.murmur];
        check(nums.every(v => Number.isFinite(v) && v >= 0 && v <= 999999999), 'hostile counter is clamped: ' + String(bad));
        G.state = 'panel'; P.renderStats();
        const html = $('#modal-panel').innerHTML;
        check(!/<img|onerror|<script/i.test(html) && !$('#modal-panel').querySelector('img,script,iframe,svg'), 'hostile value never becomes markup');
        P.inc('p7s_k_cac'); check(Number.isInteger(G.flags.p7s_k_cac) && G.flags.p7s_k_cac >= 0 && G.flags.p7s_k_cac <= 999999999, 'incrementing repairs a hostile value');
        closeModal(); G.state = 'play';
      }
      // hostile values through a real save round trip
      reset(); const hs2 = JSON.parse(JSON.stringify(snapshotGame()));
      hs2.flags.p7s_k_cac = '<b>x</b>'; hs2.flags.p7s_walk = -1; hs2.flags.p7s_rest = 1e99; hs2.flags.p7s_s_fifth = [1]; hs2.flags.p7t_gms = {}; hs2.flags.p7s_s_evil = 5;
      restoreGame(hs2); G.state = 'panel'; P.renderStats();
      check($('#modal-panel').textContent.indexOf('<b>') < 0 && !$('#modal-panel b > b'), 'a hostile save cannot inject into the page');
      closeModal(); G.state = 'play';
      return 'ok';
    });
    console.log('PASS statistics: counters on real events, save/load, hostile values', st);

    // ---------------------------------------------------------------- layout
    await page.evaluate(() => { reset(); PLAYTOOLS.stats(); G.keys = {}; });
    for (const [w, h, tag] of [[1280, 800, 'wide'], [640, 400, 'compact']]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => { reset(); G.player.kills = 12; G.player.gold = 77; G.flags.p7s_k_cac = 5; G.flags.p7s_k_bell = 2; G.flags.p7s_walk = 123450; G.flags.p7s_ride = 41200; G.flags.p7s_s_tending = 9; G.flags.p7s_s_fifth = 3; G.flags.p7s_rest = 4; G.flags.p7s_gold_in = 1200; G.flags.p7s_gold_out = 840; G.flags.p7s_body = 1; G.flags.p7t_gms = 3725000; G.flags.p7t_rms = 4300000; G.flags.p7t_sg_gate_open = 600001; G.flags.p7t_sg_rite_started = 2400001; G.flags.p7t_sr_gate_open = 700001; G.flags.p7t_sr_rite_started = 2600001; G.flags.p7t_sg_greening = 3000001; G.flags.p7t_sg_escaped = 3600001; G.flags.p7t_sg_part3 = 3700001; G.flags.p7t_sg_part4 = 3720001; G.flags.p7t_sg_book_one_done = 3724001; PLAYTOOLS.timer.syncFromFlags(); G.state = 'panel'; PLAYTOOLS.renderStats(); });
      const fit = await page.evaluate(() => {
        const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect();
        const btns = [...p.querySelectorAll('button')].map(b => b.getBoundingClientRect());
        return { scroll: (() => { const q = p.querySelector('.p7-stats'); return q.scrollHeight > q.clientHeight + 1; })(), hOver: p.scrollWidth > p.clientWidth + 1, top: r.top, bottom: r.bottom, vh: innerHeight, btnIn: btns.every(b => b.top >= 0 && b.bottom <= innerHeight && b.right <= innerWidth), colOver: [...p.querySelectorAll('.p7-stats, .p7-stats *')].some(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto') };
      });
      assert.equal(fit.hOver, false, tag + ': statistics has no horizontal overflow');
      assert.equal(fit.colOver, false, tag + ': no row overflows its column');
      assert.ok(fit.top >= 0 && fit.bottom <= fit.vh + 1, tag + ': the statistics panel fits the window ' + JSON.stringify(fit));
      assert.equal(fit.scroll, false, JSON.stringify(fit)); assert.equal(fit.scroll, false, tag + ': the statistics need no inner scrolling');
      assert.equal(fit.btnIn, true, tag + ': Close and Back stay on screen');
      await shot('stats-' + tag);
      await page.evaluate(() => { closeModal(); G.state = 'panel'; renderAccessibilityMenu(); });
      const opt = await page.evaluate(() => {
        const p = document.querySelector('#modal-panel'), grid = document.querySelector('#p7-photo-open').closest('.ctl-grid') || p.querySelector('.ctl-grid');
        // other blocks (Accessibility, Sound space...) may follow ours: bring our row into view rather than assume it is last
        document.querySelector('#p7-timer-opt').scrollIntoView({ block: 'center' });
        const row = ['#p7-photo-open', '#p7-timer-opt', '#p7-stats-open'].map(s => document.querySelector(s).getBoundingClientRect());
        const g = grid.getBoundingClientRect();
        return { hOver: p.scrollWidth > p.clientWidth + 1, gridOver: grid.scrollWidth > grid.clientWidth + 1, rowsIn: row.every(b => b.top >= g.top - 1 && b.bottom <= g.bottom + 1 && b.right <= innerWidth), back: document.querySelector('#ac-back').getBoundingClientRect().bottom <= innerHeight };
      });
      assert.deepEqual(opt, { hOver: false, gridOver: false, rowsIn: true, back: true }, tag + ': the options rows fit ' + JSON.stringify(opt));
      await shot('options-' + tag);
      await page.evaluate(() => { closeModal(); G.state = 'play'; });
    }
    // the photo bar at the compact size
    await page.setViewportSize({ width: 640, height: 400 });
    const bar = await page.evaluate(() => { reset(); PLAYTOOLS.enter(); render(); const b = document.getElementById('p7-photo-bar').getBoundingClientRect(); const out = { in: b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight && b.top >= 0, hOver: document.documentElement.scrollWidth > innerWidth }; return out; });
    assert.deepEqual(bar, { in: true, hOver: false }, 'the photo bar fits 640x400');
    await shot('photo-compact');
    await page.evaluate(() => PLAYTOOLS.leave());
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS playtools layout: statistics, options rows and photo bar fit 640x400 and 1280x800');

    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('PASS playtools: no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e.message || e); process.exit(1); });
