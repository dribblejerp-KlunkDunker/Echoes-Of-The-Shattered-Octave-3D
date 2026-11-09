// PREVIEW_URL=http://127.0.0.1:3821 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/reedcraft.test.js
// Phase 9 reed-craft: the Hold the Pitch minigame, reed beds, drying, recipes, the lure, the root reed,
// tuneFirstReed, saves (hostile too), compact fit, keyboard / touch / gamepad. Uses the managed preview;
// never starts a server and never writes player saves. The minigame is driven by hand
// (REEDS.forceManual): steps of fixed length, so every score is repeatable.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /reed/i.test(m.text()))) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3821');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reed Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => typeof REEDS === 'object' && G.state === 'play');
    await page.waitForTimeout(400);

    // ---- fixtures shared by every block (all run inside the page)
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.reset = () => {
        if (REEDS.session) REEDS.session.finish(true);
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; $('#msgs').innerHTML = '';
        REEDS.forceManual = true; REEDS.set.on = true; REEDS.set.assist = false; GFX.reduceMotion = false; ACCESS.settings.cap = false;
        G.noise = 2; G.stillT = 0; G.rootWard = 0; G.throwReady = 0; Weather.hold('clear');
      };
      window.msgs = () => document.querySelector('#msgs').textContent;
      // a bot that plays the minigame: perfect, partly right (then wrong), or never moving
      window.bot = (mode, dt) => {
        const s = REEDS.session; let n = 0;
        while (s && !s.done && n++ < 20000) {
          if (mode === 'perfect') s.pitch = s.centsAt(Math.max(0, s.t));
          else if (mode === 'part') s.pitch = s.t < s.duration * 0.62 ? s.centsAt(Math.max(0, s.t)) : s.hi;
          s.step(dt || 1 / 30);
        }
      };
      // a small closed room for the world tests: no guards, no hounds
      window.room = (id, opts) => {
        const m = new GameMap(id, 'Reed test room', 20, 12, Object.assign({ floor: 't_flag', ceil: 't_stone', fogDist: 14, spawn: { x: 3.5, y: 6, dir: 0 } }, opts || {}));
        m.border('t_stone'); G.maps[id] = m; m.baseCount = 0; return m;
      };
    });
    const run = (fn, arg) => page.evaluate(fn, arg);

    // ---------------------------------------------------------------- items, beds, the lure's entry
    await run(() => {
      reset();
      for (const id of ['p9_windreed', 'p9_dryreed', 'p9_reed_root', 'p9_reed_lure', 'p9_reed_first']) check(ITEMS[id] && ITEMS[id].name && ITEMS[id].desc, id + ' defined');
      check(ITEMS.p9_reed_first.key === true, 'the First Reed is a key-style item (never sold, never stacked away)');
      check(ITEMS.p9_dryreed.value === 0 && itemCat('p9_dryreed') === null && itemCat('p9_windreed') === null, 'dry and raw reeds are worth nothing in a shop');
      check(DISTRACTIONS.p9_reed_lure && DISTRACTIONS.p9_reed_lure.duration > DISTRACTIONS.empty_bottle.duration && DISTRACTIONS.p9_reed_lure.hearing < DISTRACTIONS.empty_bottle.hearing, 'the lure lasts longer than a bottle but is heard less far');
      const oh = REEDS.BEDS.filter(b => b[0] === 'oakhaven'), cl = REEDS.BEDS.filter(b => b[0] === 'clearing');
      check(oh.length >= 4 && cl.length >= 2, 'beds in Oakhaven and the clearing');
      for (const [map, x, y] of REEDS.BEDS) {
        const m = G.maps[map]; check(!m.isBlocked(Math.floor(x), Math.floor(y)), `bed ${x},${y} stands on open ground`);
        if (map === 'oakhaven') check(Math.abs(x - 53.5) < 13 && y > 47 && y < 53, 'Oakhaven beds sit on the Flume banks by the crossing');
        check(m._p9beds && m._p9beds.some(e => e.x === x && e.y === y && e.transient === true && e.use === 'p9_reedbed'), 'bed entity is transient and usable');
      }
      for (const m of Object.values(G.maps)) if (m.id !== 'oakhaven' && m.id !== 'clearing') check(!m.entities.some(e => e.p9bed != null), 'no beds anywhere else (' + m.id + ')');
      // anim.js sweeps transients on every map change; the beds must come back
      loadMap('clearing'); check(G.ents.filter(e => e.p9bed != null).length === cl.length, 'clearing beds after entering');
      loadMap('oakhaven'); check(G.ents.filter(e => e.p9bed != null).length === oh.length, 'Oakhaven beds after returning');
      // saves never carry them
      const snap = snapshotGame(); check(!JSON.stringify(snap.maps.oakhaven).includes('p9_reedbed'), 'beds are not written into saves');
    });
    console.log('PASS items, bed placement on both maps, beds survive map changes, never saved');

    // ---------------------------------------------------------------- gathering and regrowth, quiet
    await run(() => {
      reset(); loadMap('oakhaven', { x: 48.6, y: 50.4, dir: Math.PI / 2 }); G.state = 'play';
      const bed = G.ents.find(e => e.p9bed === 0), other = G.ents.find(e => e.p9bed === 1);
      const noise0 = G.noise; G.noise = 2;
      for (let i = 0; i < 3; i++) { G.time += 1; useDeco(bed); }
      check(REEDS.held('p9_windreed') === 3, 'three reeds from a bed');
      check(Math.abs(G.noise - 2) < 1e-9, 'cutting is quiet (no noise)');
      check(REEDS.bedCut(0) === 3 && /stubble/.test(bed.label), 'the bed reads as cut to the stubble');
      G.time += 1; useDeco(bed);
      check(REEDS.held('p9_windreed') === 3 && /stubble/.test(msgs()), 'a fourth cut is refused with a line');
      G.time += 1; useDeco(other); check(REEDS.held('p9_windreed') === 4, 'another bed still gives');
      check(G.flags.p9r_c0 === 3 && Number.isInteger(G.flags.p9r_cutday) && Number.isInteger(G.flags.p9r_cuth), 'state is small integer flags');
      // a new game day: the beds come again (and the old bundle has gone dry)
      G.day += 1; REEDS.sync(); REEDS.refreshBeds();
      check(REEDS.held('p9_windreed') === 0 && REEDS.held('p9_dryreed') === 4, 'a day later the held reeds are dry');
      check(REEDS.bedCut(0) === 0 && !/stubble/.test(bed.label), 'the bed has regrown');
      G.time += 1; useDeco(bed); check(REEDS.held('p9_windreed') === 1, 'cut again on the new day');
      check(G.flags.p9r_c0 === 1 && G.flags.p9r_bedday === G.day, 'bed counters reset for the new day');
      // the beds do not exist when the setting is off
      REEDS.set.on = false; REEDS.refreshBeds(); check(bed.hidden === true, 'beds hide when Reed-craft is off');
      REEDS.set.on = true; REEDS.refreshBeds(); check(bed.hidden === false, 'and return');
    });
    // a real E press, through the real interact path
    await run(() => { reset(); loadMap('oakhaven', { x: 48.6, y: 50.4, dir: Math.PI / 2 }); G.state = 'play'; });
    await page.waitForTimeout(500);
    await page.keyboard.press('e');
    const ePress = await run(() => ({ n: REEDS.held('p9_windreed'), st: G.state, panel: G.openPanel, mapId: G.mapId, at: [G.player.x, G.player.y], t: G.time, pick: (() => { const e = Engine.pick(G.ents, USE_RANGE); return e && [e.kind, e.sprite, e.label, e.p9bed]; })(), cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir] }));
    assert.equal(ePress.n, 1, 'E at a bed cuts one reed ' + JSON.stringify(ePress));
    console.log('PASS gathering: three a bed, quiet, regrowth next day, off switch, real E press');

    // ---------------------------------------------------------------- drying
    await run(() => {
      reset(); G.give('p9_windreed', 2); REEDS.sync();   // no stamp: an odd save counts as cut now
      check(REEDS.held('p9_windreed') === 2 && G.flags.p9r_cutday === G.day, 'unstamped reeds are stamped fresh');
      passHours(23); REEDS.sync(); check(REEDS.held('p9_windreed') === 2 && REEDS.hoursLeft() > 0, 'still green before the day is out');
      passHours(2); const n = REEDS.sync();
      check(n === 2 && REEDS.held('p9_windreed') === 0 && REEDS.held('p9_dryreed') === 2, 'dry after a day');
      useItem({ id: 'p9_dryreed' }); check(REEDS.held('p9_dryreed') === 1 && /burn/.test(msgs()), 'a dry reed burns');
      G.state = 'panel'; renderInventory(); check(document.getElementById('modal-panel').textContent.includes('Dry Reed'), 'inventory shows it');
      // the stamp follows the newest cut
      G.state = 'play'; G.give('p9_windreed', 1); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24); passHours(12);
      check(REEDS.sync() === 0 && REEDS.held('p9_windreed') === 1, 'half a day on, still fresh');
    });
    console.log('PASS drying after a day, dry reeds burn and are worth nothing');

    // ---------------------------------------------------------------- Hold the Pitch: scoring with synthetic keyboard input
    await run(() => {
      reset(); window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 });
      const s = REEDS.session; check(s && s.manual && G.openPanel === 'holdpitch' && G.state === 'panel', 'panel opened, modal');
      check(s.inside === false, 'starts off the note');
      for (let i = 0; i < 30; i++) s.step(1 / 60);
      check(s.glow < 0.05 && s.held === 0, 'outside the band: no score, the ring stays dark');
    });
    await page.keyboard.down('w');
    await run(() => { const s = REEDS.session; for (let i = 0; i < 53; i++) s.step(1 / 60); });   // 53 steps with W held: 280 cents up (after 30 steps outside)
    await page.keyboard.up('w');
    const wRun = await run(async () => {
      const s = REEDS.session, out = { insideAfterW: s.inside };
      for (let i = 0; i < 20; i++) s.step(1 / 60);
      out.glow = s.glow;
      for (let i = 0; i < 400 && !s.done; i++) s.step(1 / 60);
      out.result = await window.__p; return out;
    });
    assert(wRun.insideAfterW === true && wRun.glow > 0.9, 'W raised the voice into the band and the ring brightened');
    assert(wRun.result.aborted === false && wRun.result.score > 0.62 && wRun.result.score < 0.69, 'W key: about 65% held, got ' + JSON.stringify(wRun.result));
    assert(wRun.result.held > 2.5 && wRun.result.held < 2.8 && wRun.result.longest > 2.5, 'held seconds reported');
    await run(() => { reset(); window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 }); });
    await page.keyboard.down('ArrowUp');
    await run(() => { const s = REEDS.session; for (let i = 0; i < 53; i++) s.step(1 / 60); });
    await page.keyboard.up('ArrowUp');
    const full = await run(async () => { const s = REEDS.session; for (let i = 0; i < 400 && !s.done; i++) s.step(1 / 60); return await window.__p; });
    assert(full.aborted === false && full.score > 0.74 && full.score < 0.82, 'arrow keys: about 78% held, got ' + JSON.stringify(full));
    await run(() => { reset(); window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 }); });
    await page.keyboard.down('ArrowDown');                                          // the wrong way: stays out of the band
    await run(() => { const s = REEDS.session; for (let i = 0; i < 60; i++) s.step(1 / 60); });
    await page.keyboard.up('ArrowDown');
    const wrongWay = await run(async () => { const s = REEDS.session; for (let i = 0; i < 400 && !s.done; i++) s.step(1 / 60); return await window.__p; });
    assert.equal(wrongWay.score, 0, 'steering away from the note scores nothing');
    const inOut = await run(async () => {
      const out = {};
      reset();
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 }); window.bot('perfect', 1 / 60); out.perfect = await window.__p;
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 }); window.bot('none', 1 / 60); out.none = await window.__p;
      // the band follows the scripted curve: a steady pitch scores only while the curve passes through it
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [2, 174], [3, 220], [6, 220]], width: 60, duration: 6, lead: 0 });
      const ms = REEDS.session; ms.pitch = REEDS.toCents(174); for (let i = 0; i < 400 && !ms.done; i++) ms.step(1 / 60); out.moving = await window.__p;
      out.after = [G.state, G.openPanel];
      return out;
    });
    assert(inOut.perfect.score > 0.99 && inOut.perfect.held > 3.95, 'perfect play scores ~1');
    assert.equal(inOut.none.score, 0, 'never moving scores 0');
    assert(inOut.moving.score > 0.3 && inOut.moving.score < 0.55, 'a fixed pitch scores only while the curve is near it: ' + inOut.moving.score);
    assert.deepEqual(inOut.after, ['play', null], 'panel closed and the game state restored');
    console.log('PASS Hold the Pitch scoring: inside / outside / partial, W and arrow keys, curve following, state restored');

    // ---------------------------------------------------------------- abort, busy, lead-in, options sanitising
    await run(() => {
      reset(); window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], duration: 4 });
    });
    await page.keyboard.press('Escape');
    const ab = await run(async () => { const r = await window.__p; return { r, panel: G.openPanel, state: G.state, hidden: document.getElementById('modal').classList.contains('hidden'), session: !!REEDS.session }; });
    assert(ab.r.aborted === true && ab.panel === null && ab.state === 'play' && ab.hidden && !ab.session, 'Escape aborts and closes the panel: ' + JSON.stringify(ab));
    const more = await run(async () => {
      const out = {};
      reset(); window.__p = REEDS.holdPitch({ duration: 4, lead: 0 });
      const second = await REEDS.holdPitch({ duration: 2 }); out.busy = second;        // one at a time
      document.getElementById('rhp-abort').click(); out.btn = await window.__p; out.afterBtn = G.state;
      // another panel taking over (the options menu from a pad's Start) puts the reed down without closing it
      window.__p = REEDS.holdPitch({ duration: 4, lead: 0 }); REEDS.session.step(0.1);
      G.state = 'panel'; renderMenu(); REEDS.session && REEDS.session.step(0.1); out.takeover = await window.__p; out.menuStillOpen = G.openPanel; out.menuText = /Options/.test(document.getElementById('modal-panel').textContent);
      closeModal(); G.state = 'play';
      // the lead-in is for listening: no score
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [3, 174]], width: 100, duration: 3, lead: 1 }); const s = REEDS.session;
      s.pitch = REEDS.toCents(174); for (let i = 0; i < 50; i++) s.step(1 / 60); out.leadHeld = s.held; out.leadT = s.t;
      s.finish(true); out.leadAbort = await window.__p;
      // junk options never throw
      window.__p = REEDS.holdPitch({ curve: 'nonsense', duration: -5, width: 'x', title: '<img src=x onerror=window.__pwn=1>', hint: '<b id=hurt>hi</b>', hz: Infinity });
      out.junkTitle = document.getElementById('rhp-title').textContent; out.junkEls = document.querySelectorAll('#modal-panel img, #modal-panel #hurt').length;
      REEDS.session.finish(true); out.junk = await window.__p; out.pwn = window.__pwn || 0;
      // curves with bad points are cleaned
      out.norm = REEDS.normCurve([[0, 174], [NaN, 5], [-1, 300], [2, 99999], [3, 'a'], [1, 220], 'x', null], 174).map(p => [p[0], Math.round(p[1])]);
      window.__p = REEDS.holdPitch({ duration: 4, lead: 0 }); G.dead = true; REEDS.session.step(0.1); G.dead = false; out.dead = await window.__p;
      return out;
    });
    assert(more.busy.aborted === true && more.busy.busy === true, 'a second Hold the Pitch while one runs is refused');
    assert(more.btn.aborted === true && more.afterBtn === 'play', 'the Put the reed down button aborts');
    assert(more.takeover.aborted === true && more.menuStillOpen && more.menuStillOpen !== 'holdpitch' && more.menuText, 'another panel taking over aborts without closing that panel: ' + more.menuStillOpen);
    assert(more.leadHeld === 0 && more.leadT < 0 && more.leadAbort.held === 0, 'the lead-in is not scored');
    assert(more.junkTitle === 'img src=x onerror=window.__pwn=1' && more.junkEls === 0 && more.pwn === 0 && more.junk.aborted, 'titles go in as text with markup characters stripped; junk options do not throw: ' + more.junkTitle);
    assert.deepEqual(more.norm, [[0, 0], [1, Math.round(1200 * Math.log2(220 / 174))]], 'bad curve points dropped, the rest sorted');
    assert(more.dead.aborted === true, 'dying aborts');
    console.log('PASS abort: Escape, button, takeover, busy, lead-in unscored, hostile options, death');

    // ---------------------------------------------------------------- sound: tone, mute, no audio context
    const snd = await run(async () => {
      const out = {};
      reset(); check(Audio_.ctx, 'an audio context exists after the first gestures');
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [4, 174]], width: 80, duration: 4, lead: 0 });
      let s = REEDS.session; s.pitch = REEDS.toCents(200); s.step(0.05);
      out.live = REEDS.audio();
      Audio_.toggleMute(); s.step(0.05); out.muted = REEDS.audio(); Audio_.toggleMute(); s.step(0.05); out.unmuted = REEDS.audio();
      s.finish(true); await window.__p; out.after = REEDS.audio();
      // no AudioContext: the game still works, silently
      const desc = Object.getOwnPropertyDescriptor(Audio_, 'ctx');
      Object.defineProperty(Audio_, 'ctx', { get: () => null, configurable: true });
      try {
        window.__p = REEDS.holdPitch({ curve: [[0, 174], [3, 174]], width: 80, duration: 3, lead: 0 });
        out.silent = REEDS.audio(); window.bot('perfect', 1 / 60); out.silentResult = await window.__p;
      } finally { Object.defineProperty(Audio_, 'ctx', desc); }
      out.restored = !!Audio_.ctx;
      return out;
    });
    assert(snd.live.active && Math.abs(snd.live.playerHz - 200) < 0.5 && Math.abs(snd.live.droneHz - 174) < 0.5 && snd.live.playerGain > 0 && snd.live.droneGain > 0 && snd.live.droneGain < snd.live.playerGain, 'a tone at your pitch, a fainter drone on the target: ' + JSON.stringify(snd.live));
    assert(snd.muted.playerGain === 0 && snd.muted.droneGain === 0 && snd.unmuted.playerGain > 0, 'mute silences both');
    assert(snd.after.active === false, 'tones stopped when the panel closed');
    assert(snd.silent.active === false && snd.silentResult.score > 0.99 && snd.restored, 'no audio context: no tone, the minigame still works');
    console.log('PASS sound: player tone and target drone, mute respected, silent without an audio context');

    // ---------------------------------------------------------------- captions and reduce motion
    const vis = await run(async () => {
      const out = {};
      reset(); ACCESS.settings.cap = true;
      window.__p = REEDS.holdPitch({ curve: [[0, 174], [6, 174]], width: 80, duration: 6, lead: 0 }); const s = REEDS.session;
      s.step(0.05); out.off = document.getElementById('rhp-cap').textContent;
      s.pitch = REEDS.toCents(174); s.step(0.05); out.hold = document.getElementById('rhp-cap').textContent;
      ACCESS.settings.cap = false; s.pitch = s.lo + 50; s.step(0.05); out.quiet = document.getElementById('rhp-cap').textContent;
      s.finish(true); await window.__p;
      // static band for reduce motion: the right-hand half of the staff does not change as time passes
      const slice = (cv) => { const d = cv.getContext('2d').getImageData(300, 24, 240, 150).data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0; return h; };
      const play = (reduce) => {
        GFX.reduceMotion = reduce;
        window.__p = REEDS.holdPitch({ curve: REEDS.makeCurve('root', 174, 8), width: 90, duration: 8, lead: 0 }); const q = REEDS.session;
        const adv = (n) => { for (let i = 0; i < n; i++) q.step(0.25); }; adv(4); const a = slice(q.cv); adv(6); const b = slice(q.cv); const rm = q.reduce; q.finish(true);
        return window.__p.then(() => ({ a, b, rm }));
      };
      out.scroll = await play(false); out.still = await play(true);
      GFX.reduceMotion = false;
      return out;
    });
    assert.equal(vis.off, 'Off pitch.', 'captions on: off pitch'); assert.equal(vis.hold, 'Holding.', 'captions on: holding'); assert.equal(vis.quiet, '', 'captions off: the line clears');
    assert(vis.scroll.rm === false && vis.scroll.a !== vis.scroll.b, 'scrolling by default: the band moves');
    assert(vis.still.rm === true && vis.still.a === vis.still.b, 'reduce motion: a static band (marker moves, band does not)');
    console.log('PASS captions (holding / off pitch) and reduce-motion static band');

    // ---------------------------------------------------------------- touch (pointer drag) and gamepad
    const inp = await run(async () => {
      const out = {};
      reset(); window.__p = REEDS.holdPitch({ curve: [[0, 174], [8, 174]], width: 80, duration: 8, lead: 0 });
      let s = REEDS.session; const cv = s.cv, rect = cv.getBoundingClientRect();
      const yFor = (c) => rect.top + ((14 + (s.hi - c) / (s.hi - s.lo) * (cv.height - 28)) / cv.height) * rect.height;
      const target = REEDS.toCents(174) + 250;
      cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: rect.left + 100, clientY: yFor(target) }));
      for (let i = 0; i < 30; i++) s.step(1 / 60);
      out.touch = Math.abs(s.pitch - target) < 8;
      cv.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: rect.left + 120, clientY: yFor(0) }));
      for (let i = 0; i < 30; i++) s.step(1 / 60);
      out.touchBack = Math.abs(s.pitch - 0) < 8 && s.inside;
      cv.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' }));
      const held = s.pitch; for (let i = 0; i < 10; i++) s.step(1 / 60); out.stays = Math.abs(s.pitch - held) < 1e-6;
      // gamepad: stick up, then down on the D-pad, then B puts the reed down
      const pad = { connected: true, axes: [0, -1, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
      const _gp = navigator.getGamepads; navigator.getGamepads = () => [pad];
      try {
        const p0 = s.pitch; for (let i = 0; i < 30; i++) s.step(1 / 60); out.stickUp = s.pitch - p0 > 100;
        pad.axes = [0, 0, 0, 0]; pad.buttons[13].pressed = true; const p1 = s.pitch; for (let i = 0; i < 30; i++) s.step(1 / 60); out.dpadDown = p1 - s.pitch > 100;
        pad.buttons[13].pressed = false; pad.buttons[1].pressed = true; s.step(1 / 60); out.padAbort = await window.__p;
      } finally { navigator.getGamepads = _gp; }
      return out;
    });
    assert(inp.touch && inp.touchBack && inp.stays, 'touch / pointer drag steers the voice: ' + JSON.stringify(inp));
    assert(inp.stickUp && inp.dpadDown && inp.padAbort.aborted === true, 'gamepad stick, D-pad and B: ' + JSON.stringify(inp));
    console.log('PASS touch drag and gamepad stick / D-pad / B');

    // ---------------------------------------------------------------- skill: the band and the grades
    await run(() => {
      reset();
      check(REEDS.bandFor(0) === 105 && REEDS.bandFor(10) === 55 && REEDS.bandFor(99) === 55, 'the band narrows with practice to a floor');
      REEDS.set.assist = true; check(Math.abs(REEDS.bandFor(10) - 88) < 1e-9, 'assist widens it 60%'); REEDS.set.assist = false;
      check(REEDS.trueAt(0) === 0.85 && Math.abs(REEDS.trueAt(10) - 0.75) < 1e-9 && REEDS.trueAt(50) === 0.75, 'a true tune gets easier to earn');
      check(REEDS.grade(0.49, 0) === 'fail' && REEDS.grade(0.5, 0) === 'fair' && REEDS.grade(0.85, 0) === 'true' && REEDS.grade(0.75, 10) === 'true', 'grades');
      G.flags.p9r_tunes = 'junk'; check(REEDS.bandFor(NaN) === 105, 'junk practice counts as none');
    });

    // ---------------------------------------------------------------- recipes: success, a flat tune, failure, abort, shortfall
    const rec = await run(async () => {
      const out = {};
      reset(); const p = G.player; G.give('p9_windreed', 2); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24);
      const lore0 = (p.skills.Lore || 15) * 1000 + (p.skillProg.Lore || 0);
      let c = REEDS.craft('root'); check(REEDS.session && G.openPanel === 'holdpitch', 'tuning opens the minigame'); window.bot('perfect'); out.root = await c;
      out.rootHeld = [REEDS.held('p9_reed_root'), REEDS.held('p9_windreed')];
      out.loreUp = (p.skills.Lore || 15) * 1000 + (p.skillProg.Lore || 0) > lore0;
      out.journal = G.journal.filter(j => /breastbone/.test(j.text)).length; out.tunes1 = G.flags.p9r_tunes; out.msgTrue = /rings true/.test(msgs());
      // a flat one: 1 reed, no bonus
      G.give('p9_windreed', 2); c = REEDS.craft('root'); window.bot('part'); out.flat = await c;
      out.flatHeld = [REEDS.held('p9_reed_root'), REEDS.held('p9_windreed')]; out.msgFlat = /a little flat/.test(msgs());
      // a split reed: one raw reed wasted, no product
      G.give('p9_windreed', 2); const before = REEDS.held('p9_reed_root'); c = REEDS.craft('root'); window.bot('none'); out.fail = await c;
      out.failHeld = [REEDS.held('p9_reed_root') - before, REEDS.held('p9_windreed')]; out.msgFail = /splits along the slot/.test(msgs());
      out.journalAfter = G.journal.filter(j => /breastbone/.test(j.text)).length;
      // the lure takes one reed
      c = REEDS.craft('lure'); window.bot('perfect'); out.lure = await c; out.lureHeld = [REEDS.held('p9_reed_lure'), REEDS.held('p9_windreed')];
      // not enough reeds: nothing opens
      out.short = await REEDS.craft('root'); out.shortOpen = !!REEDS.session;
      // abort: the reed is kept
      const t0 = G.flags.p9r_tunes; G.give('p9_windreed', 2); c = REEDS.craft('root'); REEDS.session.finish(true); out.abort = await c;
      out.abortKept = [REEDS.held('p9_windreed'), G.flags.p9r_tunes === t0];
      out.unknown = await REEDS.craft('nonsense');
      out.tunes = G.flags.p9r_tunes;
      return out;
    });
    assert(rec.root.quality === 'true' && rec.root.made === 2 && rec.rootHeld[0] === 2 && rec.rootHeld[1] === 0 && rec.msgTrue, 'a true tune: two reeds raws gone: ' + JSON.stringify(rec.root));
    assert(rec.loreUp && rec.journal === 1 && rec.tunes1 === 1, 'Lore XP, one journal line, p9r_tunes counts ' + JSON.stringify([rec.loreUp, rec.journal, rec.tunes1]));
    assert(rec.flat.quality === 'fair' && rec.flat.made === 1 && rec.flatHeld[0] === 3 && rec.flatHeld[1] === 0 && rec.msgFlat, 'a flat tune gives one reed: ' + JSON.stringify(rec.flat) + JSON.stringify(rec.flatHeld));
    assert(rec.fail.quality === 'fail' && rec.failHeld[0] === 0 && rec.failHeld[1] === 1 && rec.msgFail, 'a split reed wastes exactly one raw reed: ' + JSON.stringify(rec.failHeld));
    assert(rec.journalAfter === 1, 'the first-tune journal entry is written once');
    assert(rec.lure.quality === 'true' && rec.lure.item === 'p9_reed_lure' && rec.lureHeld[0] === 2 && rec.lureHeld[1] === 0, 'lure reed recipe: ' + JSON.stringify(rec.lureHeld));
    assert(rec.short === null && rec.shortOpen === false, 'too few reeds: nothing opens');
    assert(rec.abort.aborted === true && rec.abortKept[0] === 2 && rec.abortKept[1] === true, 'abort keeps the reeds and the practice count');
    assert(rec.unknown === null && rec.tunes === 4, 'unknown recipe ignored; four completed tunings counted, got ' + rec.tunes);
    console.log('PASS recipes: true / flat / split / lure / shortfall / abort, Lore XP, one journal line');

    // ---------------------------------------------------------------- the Reeds panel: forge tab, R-rest by a fire, Use on a reed
    const ui = await run(async () => {
      const out = {};
      reset(); G.give('p9_windreed', 3); G.give('p9_dryreed', 2); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24);
      G.state = 'panel'; renderCrafting();
      const tab = document.getElementById('p9r-tab'); out.tab = tab && tab.textContent;
      tab.click(); out.panel = G.openPanel; out.text = document.getElementById('modal-panel').textContent;
      document.querySelector('[data-reed="lure"]').click();                   // tune from the panel
      out.session = !!REEDS.session; window.bot('perfect'); await new Promise(r => setTimeout(r, 30));
      out.back = G.openPanel; out.lures = REEDS.held('p9_reed_lure'); out.rawLeft = REEDS.held('p9_windreed');
      document.getElementById('p9r-burn').click(); out.burnt = REEDS.held('p9_dryreed');
      document.getElementById('p9r-back').click(); out.toForge = G.openPanel;
      // R-rest next to a fire offers it; with no fire it does not
      room('reedroom0'); loadMap('reedroom0'); G.state = 'panel'; renderRest(); out.restNoFire = !!document.getElementById('p9r-rest'); closeModal();
      const m = room('reedroom'); m.deco('campfire', 5.5, 6, { solid: false }); loadMap('reedroom'); G.state = 'panel'; renderRest();
      out.restFire = !!document.getElementById('p9r-rest'); document.getElementById('p9r-rest').click(); out.restPanel = G.openPanel;
      document.getElementById('p9r-back').click(); out.restBack = G.openPanel; closeModal(); G.state = 'play';
      // Use on a Wind-Reed in the inventory opens the panel
      G.state = 'panel'; renderInventory(); const slot = G.player.inv.find(s => s.id === 'p9_windreed'); useItem(slot); out.useRaw = G.openPanel;
      // off = the original forge panel
      REEDS.set.on = false; G.state = 'panel'; renderCrafting(); out.tabOff = !!document.getElementById('p9r-tab');
      return out;
    });
    assert(/Reeds \(3\)/.test(ui.tab) && ui.panel === 'reeds' && /Fresh Flume-reed ×3/.test(ui.text) && /Dry reed ×2/.test(ui.text), 'forge has a Reeds tab: ' + ui.tab);
    assert(ui.session && ui.back === 'reeds' && ui.lures === 2 && ui.rawLeft === 2, 'tuning from the panel returns to the panel: ' + JSON.stringify(ui));
    assert(ui.burnt === 0 && ui.toForge === 'craft', 'burn dry reeds; back goes to the forge');
    assert(ui.restNoFire === false && ui.restFire === true && ui.restPanel === 'reeds' && ui.restBack === 'rest', 'R-rest by a fire offers tuning');
    assert(ui.useRaw === 'reeds' && ui.tabOff === false, 'Use opens the panel; switched off, the forge is the original');
    console.log('PASS Reeds panel: forge tab, rest by a fire, Use on a reed, off switch');

    // ---------------------------------------------------------------- the lure draws an idle enemy exactly like a stone
    const lure = await run(async () => {
      const out = {};
      reset(); const m = room('reedroom2'); loadMap('reedroom2', { x: 3.5, y: 6, dir: 0 }); G.state = 'play';
      const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); m.entities.push(e); return e; };
      const e = mk('proctor', 9.0, 7.5);
      const trial = (id) => {
        e.state = 'idle'; delete e.investigation; G.throwReady = 0; G.give(id, 1); Engine.cam.x = 3.5; Engine.cam.y = 6; Engine.cam.dir = 0;
        const pt = distractionImpact(id), n0 = G.count(id); $('#msgs').innerHTML = '';
        const ok = throwDistraction(id);
        return { ok, state: e.state, inv: e.investigation && { x: e.investigation.x, y: e.investigation.y, left: e.investigation.left }, pt, used: n0 - G.count(id), said: msgs() };
      };
      out.stone = trial('pebble'); out.lure = trial('p9_reed_lure');
      out.lureNote = REEDS.lure && { left: REEDS.lure.left, map: REEDS.lure.map };
      // visible threats and bosses are not drawn, exactly as with a stone
      const chaser = mk('proctor', 9.0, 4.5); chaser.state = 'chase'; G.throwReady = 0; G.give('p9_reed_lure', 1); throwDistraction('p9_reed_lure'); out.chaserState = chaser.state;
      const boss = mk('wearer', 9.0, 8.0); G.throwReady = 0; G.give('p9_reed_lure', 1); throwDistraction('p9_reed_lure'); out.bossState = boss.state;
      // the throw menu lists it; key 3 and pad Y throw it
      e.state = 'idle'; delete e.investigation; G.throwReady = 0; G.give('p9_reed_lure', 2); Engine.cam.x = 3.5; Engine.cam.y = 6; Engine.cam.dir = 0;
      G.state = 'play'; openDistractions(); out.menu = !!document.getElementById('throw-p9_reed_lure') && /3 lure reed/.test(document.getElementById('modal-panel').textContent);
      return out;
    });
    await page.keyboard.press('3');
    const afterKey = await run(() => ({ panel: G.openPanel, state: G.state, left: G.count('p9_reed_lure') }));
    assert(lure.stone.ok && lure.lure.ok && lure.stone.state === 'investigate' && lure.lure.state === 'investigate', 'both draw an idle proctor');
    assert(lure.stone.used === 1 && lure.lure.used === 1, 'one of each is used up');
    assert(Math.abs(lure.stone.inv.x - lure.stone.pt.x) < 1e-9 && Math.abs(lure.lure.inv.x - lure.lure.pt.x) < 1e-9 && lure.lure.inv.y === lure.stone.inv.y, 'the same ray, the same investigation point rule');
    assert(lure.stone.inv.left === 6 && lure.lure.inv.left === 14, 'investigate for the item\'s duration (stone 6 s, lure 14 s)');
    assert(/Lure reed: sounds a thin note/.test(lure.lure.said) && !/clatters/.test(lure.lure.said), 'the lure\'s line says it sounds a note: ' + lure.lure.said);
    assert(lure.lureNote && lure.lureNote.left === 14, 'a thin note keeps sounding for 14 s');
    assert(lure.chaserState === 'chase' && lure.bossState === 'idle', 'visible threats and bosses are not distracted (same rules as a stone)');
    assert(lure.menu, 'the lure is in the throw menu with its key');
    assert(afterKey.panel === null && afterKey.state === 'play' && afterKey.left === 1, 'key 3 throws it: ' + JSON.stringify(afterKey));
    const padY = await run(async () => {
      G.give('p9_reed_lure', 1); G.throwReady = 0; Engine.cam.x = 3.5; Engine.cam.y = 6; Engine.cam.dir = 0; G.state = 'play'; openDistractions();
      const n = G.count('p9_reed_lure'); const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) }; pad.buttons[3].pressed = true;
      const _gp = navigator.getGamepads; navigator.getGamepads = () => [pad];
      try { controlsTick(); controlsTick(); } finally { navigator.getGamepads = _gp; }
      return { used: n - G.count('p9_reed_lure'), panel: G.openPanel };
    });
    assert(padY.used === 1 && padY.panel === null, 'pad Y throws the lure from the panel (once)');
    await run(() => { loadMap('oakhaven'); check(REEDS.lure === null, 'the note dies with the map'); });
    console.log('PASS lure: same investigation as a stone (6 s vs 14 s), thin note, threats/bosses ignored, menu, key 3, pad Y');

    // ---------------------------------------------------------------- the root reed
    const root = await run(async () => {
      const out = {};
      reset(); const m = room('reedroom3', { siphoned: true }); loadMap('reedroom3', { x: 3.5, y: 6, dir: 0 }); G.state = 'play';
      G.stillT = 5.5; G.noise = 0.2; G.rootWard = 0; G.give('p9_reed_root', 2);
      const mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); m.entities.push(e); return e; };
      const hollow = mk('drowned', 7.5, 6); hollow.state = 'chase'; const proc = mk('proctor', 7.5, 8); proc.state = 'chase';
      G.state = 'panel'; renderInventory();
      const btn = [...document.querySelectorAll('[data-use]')].find(b => /Root-Note/.test(b.closest('tr').textContent)); out.hasUse = !!btn; btn.click();
      out.after = { used: 2 - G.count('p9_reed_root'), still: G.stillT, noise: G.noise, ward: G.rootWard, steady: REEDS.steady, hollow: hollow.state, proc: proc.state, line: msgs() };
      G.state = 'play'; hollow.hidden = true; proc.hidden = true;
      // standing still in siphoned country: the Hush meter is held clear for the reed's breath, then resumes
      Engine.cam.x = 3.5; G.noise = 0.2; for (let i = 0; i < 360; i++) update(1 / 60);   // 6 s
      out.steadyStill = G.stillT; out.steadyUnwrite = G.unwriting;
      for (let i = 0; i < 1200; i++) update(1 / 60);                                       // 20 s more
      out.resumed = G.stillT > 7 || G.unwriting;
      G.stillT = 0; G.unwriting = false;
      return out;
    });
    assert(root.hasUse && root.after.used === 1 && root.after.still === 0 && root.after.noise >= 2.4 && root.after.noise <= 4, 'root reed: one used, Hush meter cleared, noise steadied: ' + JSON.stringify(root.after));
    assert(root.after.ward >= 9 && root.after.ward <= 12 && root.after.steady > 0 && root.after.steady <= 8, 'a Root-note ward no longer than the song\'s 12 s');
    assert(root.after.hollow === 'idle' && root.after.proc === 'chase', 'a Hollow coming for you stops; a proctor is not a Hollow');
    assert(/breastbone/.test(root.after.line), 'its line');
    assert(root.steadyStill === 0 && root.steadyUnwrite === false && root.resumed, 'the Hush meter stays clear while steadied, then the Narrow resumes');
    console.log('PASS root reed: Hush meter, noise, Root ward, Hollow calmed, one use');

    // ---------------------------------------------------------------- tuneFirstReed: the contract for the quest team
    const first = await run(async () => {
      const out = {}; reset();
      const inv0 = () => JSON.stringify(G.player.inv.map(s => [s.id, s.n]).filter(([id]) => id !== 'p9_windreed'));
      // no reed: false at once, nothing opens
      out.none = await REEDS.tuneFirstReed({ name: 'Ada Pellow', hz: 250 }); out.noneOpen = !!REEDS.session;
      G.give('p9_windreed', 3); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24);
      const other = inv0(), j0 = G.journal.length;
      let c = REEDS.tuneFirstReed({ name: 'Ada Pellow', hz: 261.63 }); out.type = c instanceof Promise;
      const s = REEDS.session; out.title = document.getElementById('rhp-title').textContent;
      out.endHz = REEDS.toHz(s.centsAt(99)); out.startHz = REEDS.toHz(s.centsAt(0));
      window.bot('perfect'); out.ok = await c; out.rawAfter = REEDS.held('p9_windreed'); out.otherSame = inv0() === other;
      // a failed tuning: false, one reed wasted, no gift
      c = REEDS.tuneFirstReed({ name: 'Tam', hz: 200 }); window.bot('none'); out.fail = await c; out.failRaw = REEDS.held('p9_windreed'); out.failMsg = /splits along the slot/.test(msgs());
      // an abandoned one: false, reed kept
      c = REEDS.tuneFirstReed({ hz: 300 }); out.untitled = document.getElementById('rhp-title').textContent; REEDS.session.finish(true); out.abort = await c; out.abortRaw = REEDS.held('p9_windreed');
      // hostile names are text, not markup; junk Hz is clamped
      c = REEDS.tuneFirstReed({ name: '<img src=x onerror=window.__pwn2=1>Wren', hz: 1e9 });
      out.hostile = document.getElementById('rhp-title').textContent; out.hostileEls = document.querySelectorAll('#modal-panel img').length; out.hostileHz = REEDS.toHz(REEDS.session.centsAt(99));
      REEDS.session.finish(true); await c; out.pwn = window.__pwn2 || 0;
      // generic: grants nothing itself (no First Reed, no gold, no flags beyond p9r_)
      out.noGrant = G.count('p9_reed_first') === 0 && inv0() === other;
      out.flagsOnlyP9r = Object.keys(G.flags).filter(k => /^p9/.test(k) && !/^p9r_/.test(k)).length === 0;
      out.journalNew = G.journal.length - j0;
      // while a minigame is open a second call refuses
      c = REEDS.tuneFirstReed({ hz: 200 }); out.reentrant = await REEDS.tuneFirstReed({ hz: 200 }); REEDS.session.finish(true); await c;
      return out;
    });
    assert(first.none === false && first.noneOpen === false, 'no reed: false, nothing opens');
    assert(first.type && first.ok === true && first.rawAfter === 2 && first.otherSame, 'success: Promise<true>, exactly one wind-reed consumed');
    assert(first.title === 'Tune a reed to Ada Pellow' && Math.abs(first.endHz - 261.63) < 0.01 && first.startHz > 261.63, 'the curve lands on that person\'s Hz');
    assert(first.fail === false && first.failRaw === 1 && first.failMsg, 'failure: false, one reed wasted');
    assert(first.abort === false && first.abortRaw === 1 && first.untitled === 'Tune a First Reed', 'abort: false, reed kept');
    assert(first.hostile.indexOf('Tune a reed to img src=x') === 0 && first.hostile.length <= 'Tune a reed to '.length + 32 && !/[<>&"]/.test(first.hostile) && first.hostileEls === 0 && first.pwn === 0 && first.hostileHz <= 1500.01, 'hostile name is plain text and Hz clamped ' + JSON.stringify([first.hostile, first.hostileHz]));
    assert(first.noGrant && first.flagsOnlyP9r, 'it grants nothing itself and touches no quest flags');
    assert(first.reentrant === false, 'a second call while busy is refused');
    console.log('PASS tuneFirstReed: Promise<bool>, one reed on success, waste on failure, abort keeps, generic, hostile-safe');

    // ---------------------------------------------------------------- oakhaven law: sounding a reed
    const law = await run(async () => {
      const out = {};
      reset(); G.give('p9_windreed', 4); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24);
      loadMap('oakhaven', { x: 23.5, y: 24.5, dir: Math.PI / 2 }); G.state = 'play';
      out.law = lawActive(); const b0 = crimeState().bounty;
      G.noise = 2; let c = REEDS.craft('root'); out.hedgeNoise = G.noise - 2; out.hounds0 = G.ents.filter(e => e.kind === 'enemy' && e.type === 'hound').length;
      REEDS.session.finish(true); await c; out.bountyHedge = crimeState().bounty - b0;
      // a constable in sight glances, nothing more
      const guard = G.maps.oakhaven.npc('townsman', 23.5, 27.5, { lawGuard: true, name: 'Oakhaven watch constable' }); G.ents = G.maps.oakhaven.entities; Engine.cam.x = 23.5; Engine.cam.y = 24.5;
      guard.dir = 0; $('#msgs').innerHTML = ''; G.noise = 2; c = REEDS.craft('root'); out.glance = /glances over/.test(msgs()); out.faced = Math.abs(guard.dir + Math.PI / 2) < 0.01;
      REEDS.session.finish(true); await c; out.bountyGlance = crimeState().bounty - b0; out.guardState = guard.state;
      // outside the Hedge a reed carries
      loadMap('clearing', { x: 20.5, y: 20, dir: 0 }); out.outLaw = lawActive(); G.noise = 2; c = REEDS.craft('root'); out.wildNoise = G.noise - 2; REEDS.session.finish(true); await c;
      return out;
    });
    assert(law.law === true && Math.abs(law.hedgeNoise - 0.8) < 1e-9 && law.hounds0 === 0 && law.bountyHedge === 0, 'in the Hedge: a small noise event, no hounds, no crime: ' + JSON.stringify(law));
    assert(law.glance && law.faced && law.bountyGlance === 0, 'the watch glances and nothing more');
    assert(law.outLaw === false && Math.abs(law.wildNoise - 1.6) < 1e-9, 'beyond the Hedge the note carries farther');
    console.log('PASS Oakhaven law: Hedge noise 0.8, constable glances, no new crime; the wild 1.6');

    // ---------------------------------------------------------------- the Greening closes the beds gracefully
    const green = await run(async () => {
      const out = {}; reset();
      G.give('p9_windreed', 2); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24); G.flags.p9r_tunes = 2; G.flags.p9r_seen = 1;
      G.flags.greening = true; const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play'; REEDS.forceManual = true;
      out.ohBeds = G.maps.oakhaven.entities.filter(e => e.p9bed != null).length + (G.maps.oakhaven._p9beds ? G.maps.oakhaven._p9beds.length : 0);
      out.clBeds = G.maps.clearing._p9beds.length;
      const cnt = () => G.journal.filter(j => /reed beds by the Flume went under/.test(j.text)).length;
      update(0.6); update(0.6); update(0.6); update(0.6);
      out.journal = cnt(); out.line = true;
      update(1.1); update(1.1); out.once = cnt();
      // crafting with held reeds still works afterwards
      const c = REEDS.craft('lure'); window.bot('perfect'); out.craft = await c;
      return out;
    });
    assert(green.ohBeds === 0 && green.clBeds === 2, 'a Greened Oakhaven has no beds; the clearing\'s remain');
    assert(green.journal === 1 && green.once === 1, 'one journal line when the beds go under');
    assert(green.craft && green.craft.quality === 'true', 'held reeds can still be tuned');
    console.log('PASS the Greening: beds gone from Oakhaven, one journal line, clearing beds and tuning continue');

    // ---------------------------------------------------------------- save / load round trip and a hostile save
    const sv = await run(async () => {
      const out = {}; reset(); loadMap('oakhaven', { x: 48.6, y: 50.4, dir: Math.PI / 2 }); G.state = 'play';
      const bed = G.ents.find(e => e.p9bed === 2); G.time += 1; useDeco(bed); G.time += 1; useDeco(bed);
      G.give('p9_reed_root', 2); G.give('p9_reed_lure', 3); G.give('p9_reed_first', 1); G.flags.p9r_tunes = 5;
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.saved = Object.keys(snap.flags).filter(k => /^p9r_/.test(k)).sort().join(',');
      restoreGame(snap); G.state = 'play'; REEDS.forceManual = true;
      out.held = [REEDS.held('p9_windreed'), REEDS.held('p9_reed_root'), REEDS.held('p9_reed_lure'), REEDS.held('p9_reed_first')];
      out.tunes = G.flags.p9r_tunes; out.bedCut = REEDS.bedCut(2); out.beds = G.ents.filter(e => e.p9bed != null).length;
      out.bedLabel = G.ents.find(e => e.p9bed === 2).label;
      // hostile: strings, objects and absurd numbers where p9r_ flags and reed stacks are read
      const evil = JSON.parse(JSON.stringify(snapshotGame()));
      Object.assign(evil.flags, { p9r_tunes: '<img src=x onerror=window.__pwn3=1>', p9r_cutday: { a: 1 }, p9r_cuth: -50, p9r_bedday: 'x', p9r_c0: 99999999, p9r_c1: '<b>', p9r_first: [], p9r_seen: 'yes', p9r_greened: {} });
      evil.player.inv.push({ id: 'p9_windreed', n: '<b>many</b>' }, { id: 'p9_windreed', n: -5 }, { id: 'p9_reed_root', n: 1e9 }, { id: 'p9_dryreed', n: null }, { id: 'p9_nothing', n: 1 });
      restoreGame(evil); G.state = 'play'; REEDS.forceManual = true;
      out.evilHeld = [REEDS.held('p9_windreed'), REEDS.held('p9_reed_root'), REEDS.held('p9_dryreed')];
      REEDS.sync(); REEDS.refreshBeds(); out.evilTunes = REEDS.bandFor(G.flags.p9r_tunes);
      G.state = 'panel'; renderCrafting(); document.getElementById('p9r-tab').click(); out.evilPanel = document.getElementById('modal-panel').innerHTML;
      out.evilImgs = document.querySelectorAll('#modal-panel img, #modal-panel [onerror]').length;
      out.evilBeds = G.maps.oakhaven._p9beds.map(e => e.label).join('|');
      REEDS.openPanel('inv'); out.evilText = document.getElementById('modal-panel').textContent;
      closeModal(); G.state = 'play'; for (let i = 0; i < 90; i++) update(1 / 60);
      const c = REEDS.craft('lure'); if (REEDS.session) window.bot('perfect'); out.evilCraft = await c;
      out.pwn = window.__pwn3 || 0;
      return out;
    });
    assert.equal(sv.saved, 'p9r_bedday,p9r_c0,p9r_c1,p9r_c2,p9r_c3,p9r_c4,p9r_c5,p9r_c6,p9r_cutday,p9r_cuth,p9r_seen,p9r_tunes', 'only small p9r_ flags are saved');
    assert.deepEqual(sv.held, [2, 2, 3, 1], 'reeds and products survive a save'); assert(sv.tunes === 5, 'practice survives');
    assert(sv.bedCut === 2 && /1 still standing/.test(sv.bedLabel), 'bed state restored: ' + sv.bedLabel);
    assert(sv.beds === 5, 'Oakhaven beds are rebuilt on load');
    assert(sv.evilImgs === 0 && sv.pwn === 0 && !/NaN|undefined|\[object/.test(sv.evilText + sv.evilPanel.replace(/<[^>]*>/g, ' ')), 'hostile flags and stacks never become markup or NaN');
    assert(sv.evilTunes === 105 && sv.evilHeld.every(Number.isFinite), 'hostile practice counts as none; stack counts stay finite: ' + JSON.stringify(sv.evilHeld));
    assert(sv.evilCraft === null || sv.evilCraft.aborted === false, 'crafting still works after a hostile save');
    console.log('PASS save / load round trip and hostile save');

    // ---------------------------------------------------------------- Options rows
    const opt = await run(() => {
      const out = {}; reset(); G.state = 'panel'; renderMenu();
      [...document.querySelectorAll('#modal-panel button')].find(b => /Graphics/.test(b.textContent)).click();
      out.head = !!document.getElementById('p9r-head'); out.on = document.getElementById('p9r-on').textContent; out.assist = document.getElementById('p9r-assist').textContent;
      document.getElementById('p9r-assist').click(); out.assistSet = REEDS.set.assist; out.band = REEDS.bandFor(0);
      document.getElementById('p9r-on').click(); out.offSet = REEDS.set.on; out.hidden = G.maps.oakhaven._p9beds.every(e => e.hidden);
      out.stored = JSON.parse(localStorage.getItem('octave.reedcraft.v1'));
      document.getElementById('p9r-on').click(); document.getElementById('p9r-assist').click();
      const p = document.getElementById('modal-panel'); out.fit = p.scrollWidth <= p.clientWidth + 1;
      return out;
    });
    assert(opt.head && opt.on === 'On' && opt.assist === 'Off' && opt.assistSet === true && Math.abs(opt.band - 168) < 1e-6 && opt.offSet === false && opt.hidden && opt.stored.on === false && opt.stored.assist === true && opt.fit, 'Options row works and persists: ' + JSON.stringify(opt));
    console.log('PASS Options: Reed-craft switch and assist, persisted');

    // ---------------------------------------------------------------- 640x400: every new panel fits
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(150);
    const fit = await run(() => {
      reset(); const out = {};
      const measure = (name) => {
        const p = document.getElementById('modal-panel'), g = document.getElementById('game').getBoundingClientRect(), r = p.getBoundingClientRect();
        out[name] = { noX: p.scrollWidth <= p.clientWidth + 1, noY: p.scrollHeight <= p.clientHeight + 1, inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, w: Math.round(r.width), h: Math.round(r.height) };
      };
      G.give('p9_windreed', 3); G.give('p9_dryreed', 1); G.flags.p9r_cutday = G.day; G.flags.p9r_cuth = Math.floor(G.tod * 24);
      window.__p = REEDS.holdPitch({ curve: REEDS.makeCurve('root', 174, 8), width: 105, duration: 8, hint: 'Find 174 and hold it.', title: 'Tune the root-note reed' }); measure('hold');
      const cv = REEDS.session.cv.getBoundingClientRect(); out.canvas = [Math.round(cv.width), Math.round(cv.height)]; REEDS.session.finish(true);
      ACCESS.settings.cap = true; window.__p = REEDS.holdPitch({ duration: 4 }); REEDS.session.step(0.05); measure('holdCaptions'); REEDS.session.finish(true); ACCESS.settings.cap = false;
      G.state = 'panel'; REEDS.openPanel('craft'); measure('reeds');
      renderCrafting(); measure('craft'); G.give('p9_reed_lure', 1); G.state = 'play'; openDistractions(); measure('throw'); closeModal(); G.state = 'play';
      G.state = 'panel'; renderMenu(); [...document.querySelectorAll('#modal-panel button')].find(b => /Graphics/.test(b.textContent)).click(); measure('options');
      return out;
    });
    for (const k of ['hold', 'holdCaptions', 'reeds', 'throw', 'options']) assert(fit[k].noX && fit[k].inside, `640x400 ${k} fits: ${JSON.stringify(fit[k])}`);
    assert(fit.hold.noY && fit.holdCaptions.noY && fit.reeds.noY, 'the minigame and Reeds panels fit without scrolling vertically');
    assert(fit.craft.noX && fit.craft.inside, 'forge panel (with the Reeds button) fits sideways');
    console.log('PASS 640x400: hold-the-pitch, Reeds, forge, throw and options panels fit (canvas ' + fit.canvas.join('x') + ')');
    await page.setViewportSize({ width: 1280, height: 800 });

    // ---------------------------------------------------------------- real-time play (no manual stepping): the animation loop scores, Escape aborts
    await run(() => { reset(); REEDS.forceManual = false; window.__p = REEDS.holdPitch({ curve: [[0, 174], [2, 174]], width: 300, duration: 2, lead: 0.2, linger: 0 }); });
    const live = await run(async () => { const r = await window.__p; REEDS.forceManual = true; return r; });
    assert(live.aborted === false && live.score >= 0 && live.score <= 1 && live.duration === 2, 'the animation-frame loop runs a session to its end: ' + JSON.stringify(live));
    console.log('PASS real-time loop completes a session');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
