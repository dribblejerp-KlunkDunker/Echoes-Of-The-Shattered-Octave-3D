// PREVIEW_URL=http://127.0.0.1:3811 PLAYWRIGHT_MODULE=/path/to/playwright node test/ripples.test.js
// Phase 8 RIPPLES: directional on-screen sound ripples. Optional SHOTS=<dir> writes review screenshots.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
const SHOTS = process.env.SHOTS || '';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3811');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof RIPPLES === 'object');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Ripple Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    // set the stage: clear map, hidden foes, a frozen frame loop so the test alone draws
    await page.evaluate(() => {
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
      Engine.setWeather({}); PARTICLES.list.length = 0; localStorage.removeItem('octave.ripples.v1');
      window.__mk = (type, x, y) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = 'idle'; G.ents.push(e); return e; };
      window.__rm = (e) => { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); };
      // pixel summary of the overlay: where the ink is (left/right/top/bottom share) and how strong
      window.__ink = () => {
        const c = RIPPLES.canvas; if (!c) return null;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let w = 0, n = 0, sx = 0, sy = 0, sa = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const a = d[(y * c.width + x) * 4 + 3]; if (d[(y * c.width + x) * 4] > 170 && d[(y * c.width + x) * 4 + 1] > 170 && d[(y * c.width + x) * 4 + 2] > 170 && a > 100) w++; if (a > 20) { n++; sx += x; sy += y; sa += a; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
        return { w, n, cx: n ? sx / n / c.width : -1, cy: n ? sy / n / c.height : -1, a: n ? sa / n : 0, box: [x0, y0, x1, y1] };
      };
    });
    await page.evaluate(() => { window.__raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    const wait = (ms) => page.waitForTimeout(ms);

    // ---- 1. default off: no ripples, no overlay at all
    const off = await page.evaluate(() => {
      const e = __mk('hound', 12.5, 7.5); Audio_.sfx.enemy(e.def, 'alert'); RIPPLES.draw(performance.now() + 50);
      const r = { on: RIPPLES.settings.on, n: RIPPLES.list.length, drawn: RIPPLES.stats.drawn, canvas: !!document.getElementById('rp-canvas'), key: localStorage.getItem('octave.ripples.v1') };
      __rm(e); return r;
    });
    ok(off.on === false && off.n === 0 && off.drawn === 0 && !off.canvas, 'off by default: sounds make no ripples and no overlay exists');

    // ---- 2. left / right / ahead / behind
    await page.evaluate(() => { RIPPLES.setOn(true); });
    const dirs = [];
    for (const [name, dx, dy] of [['right', 4, 0], ['left', -4, 0], ['ahead', 0, -4], ['behind', 0, 4]]) {
      const r = await page.evaluate(([name, dx, dy]) => {
        RIPPLES.clear(); const e = __mk('hound', 12.5 + dx, 11.5 + dy); Audio_.sfx.enemy(e.def, 'alert');
        const rp = RIPPLES.list[0]; RIPPLES.draw(rp.t0 + 150);
        const ink = __ink(), out = { name, n: RIPPLES.list.length, theta: rp.theta, edge: RIPPLES.edgePoint(rp.theta, 960, 450).edge, tint: rp.tint, ink };
        __rm(e); return out;
      }, [name, dx, dy]);
      dirs.push(r);
    }
    const D = Object.fromEntries(dirs.map(d => [d.name, d]));
    ok(D.right.n === 1 && D.right.edge === 'right' && D.right.ink.cx > 0.7, 'source on the right: right edge, ink on the right (cx ' + D.right.ink.cx.toFixed(2) + ')');
    ok(D.left.edge === 'left' && D.left.ink.cx < 0.3, 'source on the left: left edge, ink on the left (cx ' + D.left.ink.cx.toFixed(2) + ')');
    ok(D.ahead.edge === 'top' && D.ahead.ink.cy < 0.3 && Math.abs(D.ahead.ink.cx - 0.5) < 0.1, 'source ahead: top edge, centred');
    ok(D.behind.edge === 'bottom' && D.behind.ink.cy > 0.7 && Math.abs(D.behind.ink.cx - 0.5) < 0.1, 'source behind: bottom edge, centred');
    ok(dirs.every(d => d.tint === 'enemy'), 'enemy sounds are tinted as enemies');
    // turning the camera moves the arc: facing east, the source that was on the right is now behind
    const turned = await page.evaluate(() => {
      RIPPLES.clear(); const e = __mk('hound', 16.5, 11.5); Audio_.sfx.enemy(e.def, 'alert'); const rp = RIPPLES.list[0], c = Engine.cam, d0 = c.dir;
      c.dir = 0; RIPPLES.draw(rp.t0 + 100); const ahead = RIPPLES.edgePoint(rp.theta, 960, 450).edge; c.dir = d0; __rm(e); return ahead;
    });
    ok(turned === 'top', 'the arc follows the camera: turning to face the source moves it to the top edge');

    // ---- 3. muffled through a wall: dashed and fainter
    const wall = await page.evaluate(() => {
      const m = G.map, orig = m.isSolidCell; const res = {};
      const e = __mk('hound', 17.5, 11.5);
      RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'alert'); const clear = RIPPLES.list[0]; res.clearAlpha = clear.alpha; res.clearMuffled = clear.muffled;
      m.isSolidCell = (x, y) => (x === 15 ? true : orig.call(m, x, y));
      RIPPLES.clear(); for (const k in {}) { } Audio_.sfx.enemy(e.def, 'alert');
      const w = RIPPLES.list[0]; res.wallAlpha = w.alpha; res.wallMuffled = w.muffled;
      const cx = RIPPLES.canvas ? RIPPLES.canvas.getContext('2d') : null; const dashes = [];
      const proto = CanvasRenderingContext2D.prototype, sd = proto.setLineDash; proto.setLineDash = function (a) { dashes.push(a.length); return sd.apply(this, arguments); };
      RIPPLES.draw(w.t0 + 100); proto.setLineDash = sd; res.dashed = dashes.some(n => n > 0);
      RIPPLES.clear(); m.isSolidCell = orig; Audio_.sfx.enemy(e.def, 'alert'); const dashes2 = []; proto.setLineDash = function (a) { dashes2.push(a.length); return sd.apply(this, arguments); };
      RIPPLES.draw(RIPPLES.list[0].t0 + 100); proto.setLineDash = sd; res.openDashed = dashes2.some(n => n > 0);
      __rm(e); return res;
    });
    ok(wall.clearMuffled === false && wall.wallMuffled === true && wall.wallAlpha < wall.clearAlpha, 'behind a wall: muffled, fainter (' + wall.wallAlpha.toFixed(2) + ' < ' + wall.clearAlpha.toFixed(2) + ')');
    ok(wall.dashed === true && wall.openDashed === false, 'muffled arcs are dashed, open-air arcs are solid');

    // ---- 4. loudness sizes it, distance fades it
    const size = await page.evaluate(() => {
      RIPPLES.clear(); const near = __mk('golem', 12.5, 8.5), far = __mk('hound', 12.5, -4.5 + 16);
      Audio_.sfx.enemy(near.def, 'attack'); const a = RIPPLES.list[0];
      RIPPLES.clear(); far.x = 12.5 + 14; far.y = 11.5; Audio_.sfx.enemy(far.def, 'hurt'); const b = RIPPLES.list[0];
      __rm(near); __rm(far); return { loud: a.size, quiet: b.size, nearA: a.alpha, farA: b.alpha };
    });
    ok(size.loud > size.quiet && size.nearA > size.farA, 'louder = bigger (' + size.loud + ' > ' + size.quiet + '), farther = fainter (' + size.nearA.toFixed(2) + ' > ' + size.farA.toFixed(2) + ')');

    // ---- 5. limits: six at once, one per source per ~0.3 s
    const lim = await page.evaluate(async () => {
      RIPPLES.clear(); const es = [];
      for (let i = 0; i < 9; i++) es.push(__mk('proctor', 6 + i, 8));
      for (const e of es) RIPPLES.spawn('attack', 'enemy', e.x, e.y, e);   // nine distinct sources at once
      const n = RIPPLES.list.length;
      RIPPLES.clear(); const e0 = es[0], l0 = RIPPLES.stats.limited;
      for (const e of es.slice(1)) __rm(e);
      Audio_.sfx.enemy(e0.def, 'alert'); Audio_.sfx.enemy(e0.def, 'attack'); Audio_.sfx.enemy(e0.def, 'hurt');
      const same = RIPPLES.list.length, limited = RIPPLES.stats.limited - l0;
      await new Promise(r => setTimeout(r, 380)); Audio_.sfx.enemy(e0.def, 'attack'); const later = RIPPLES.list.length;
      __rm(e0); return { n, same, limited, later };
    });
    ok(lim.n === 6, 'at most 6 ripples at once (' + lim.n + ')');
    ok(lim.same === 1 && lim.limited === 2 && lim.later === 2, 'one source is rate-limited: 3 sounds in a burst = 1 ripple, one more after 0.3 s');

    // ---- 6. other sources: thunder shimmer, thrown stone, door, footsteps, companion line
    const src = await page.evaluate(async () => {
      const r = {}; RIPPLES.clear();
      Audio_.sfx.thunder(); const th = RIPPLES.list[0]; r.thunder = !!th && th.sky === true && th.tint === 'world';
      RIPPLES.draw(th.t0 + 100); const ink = __ink(); r.thunderInk = ink && ink.cy < 0.2 && ink.box[0] < 40 && ink.box[2] > 900;   // the whole top edge
      // thrown stone: gives the impact a place ahead
      RIPPLES.clear(); G.inv = G.inv || {}; if (!G.has('pebble')) G.give('pebble'); G.throwReady = 0;
      const ok1 = throwDistraction('pebble'); r.stone = ok1 && RIPPLES.list.length === 1 && RIPPLES.list[0].snd === 'stone' && RIPPLES.list[0].tint === 'world' && Math.abs(RIPPLES.list[0].theta) < 0.1;
      // doors: another hand opens a door across the room, none at your elbow
      RIPPLES.clear(); const w = G.map.w, key = 6 * w + 20, near = 11 * w + 13;
      const saved = G.map.doors; G.map.doors = {}; G.map.doors[key] = { target: 0, open: 0 }; G.map.doors[near] = { target: 0, open: 0 };
      RIPPLES.tick(); G.map.doors[key].target = 1; G.map.doors[near].target = 1; RIPPLES.tick();
      r.door = RIPPLES.list.length === 1 && RIPPLES.list[0].snd === 'door' && RIPPLES.list[0].tint === 'world'; G.map.doors = saved; RIPPLES.tick();
      // footsteps of a foe that walks near, but not the Hush
      RIPPLES.clear(); const e = __mk('legionnaire', 8.5, 9.5), q = __mk('quiet', 16.5, 9.5);
      RIPPLES.tick(); e.x += 1.0; q.x -= 1.0; await new Promise(r => setTimeout(r, 560)); RIPPLES.tick();
      r.foot = RIPPLES.list.length === 1 && RIPPLES.list[0].snd === 'foot'; r.quietSilent = !RIPPLES.list.some(x => Math.abs(x.x - q.x) < 0.01);
      const f1 = RIPPLES.list.length; RIPPLES.tick(); e.x += 1.0; RIPPLES.tick(); r.footLimited = RIPPLES.list.length === f1;   // inside the gap: nothing new
      __rm(e); __rm(q);
      // a companion's line
      RIPPLES.clear(); const comp = hydrate({ kind: 'npc', type: 'lyra', x: 9.5, y: 11.5 }); comp.companion = true; G.ents.push(comp);
      const pe = window.partyEnt; window.partyEnt = () => comp; VOICE_ACT.playLine({ id: 'x', kind: 'companion', src: 'voices/none.mp3', d: 1 }); window.partyEnt = pe;
      r.companion = RIPPLES.list.length === 1 && RIPPLES.list[0].tint === 'person'; __rm(comp);
      return r;
    });
    ok(src.thunder && src.thunderInk, 'thunder: a full-width shimmer along the top, no direction');
    ok(src.stone, 'a thrown stone ripples where it lands (world colour, ahead)');
    ok(src.door, 'a door moved across the room ripples; one at your own elbow does not');
    ok(src.foot && src.quietSilent && src.footLimited, 'a foe\'s footfalls ripple (rate-limited); the Hush makes none');
    ok(src.companion, 'a companion\'s spoken line ripples in the people colour');

    // ---- 7. captions: text only when Sound captions is on
    const caps = await page.evaluate(() => {
      const e = __mk('hound', 16.5, 11.5), o = ACCESS.settings.cap;
      ACCESS.settings.cap = false; RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'alert'); const off = RIPPLES.list[0].text;
      ACCESS.settings.cap = true; RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'attack'); const on = RIPPLES.list[0].text; RIPPLES.draw(RIPPLES.list[0].t0 + 100);
      ACCESS.settings.cap = o; __rm(e); return { off, on };
    });
    ok(caps.off === '' && caps.on.length > 0, 'caption text appears beside the ripple only with Sound captions on (' + caps.on + ')');

    // ---- 8. reduce motion: a still arc that only fades
    const rm = await page.evaluate(() => {
      const res = {}; const e = __mk('hound', 16.5, 11.5);
      for (const mode of [false, true]) {
        GFX.reduceMotion = mode; RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'alert'); const t0 = RIPPLES.list[0].t0;
        RIPPLES.draw(t0 + 100); const a = __ink(); RIPPLES.draw(t0 + 400); const b = __ink();
        res[mode ? 'still' : 'moving'] = { boxA: a.box, boxB: b.box, aA: a.a, aB: b.a };
      }
      GFX.reduceMotion = false; __rm(e); return res;
    });
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 4), same = near(rm.still.boxA, rm.still.boxB), grew = !near(rm.moving.boxA, rm.moving.boxB);
    ok(same && grew && rm.still.aB < rm.still.aA, 'reduce motion: arc geometry fixed (no expansion), only fades; normal mode expands');

    // ---- 9. no flashes and high contrast
    const fx = await page.evaluate(() => {
      const res = {}; const e = __mk('golem', 12.5, 8.5);
      for (const nf of [false, true]) { GFX.noFlash = nf; RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'attack'); const t0 = RIPPLES.list[0].t0; RIPPLES.draw(t0 + 100); res[nf ? 'nf' : 'norm'] = __ink().a; }
      GFX.noFlash = false;
      RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'attack'); const t0 = RIPPLES.list[0].t0; RIPPLES.draw(t0 + 100); const thin = __ink();
      document.documentElement.classList.add('ac-hc'); RIPPLES.draw(t0 + 100); const hc = __ink(); document.documentElement.classList.remove('ac-hc');
      __rm(e); return { nf: res.nf, norm: res.norm, thin: thin.n, hc: hc.n, hcWhite: hc.w, thinWhite: thin.w };
    });
    ok(fx.nf < fx.norm, 'no flashes: softer peak (' + fx.nf.toFixed(0) + ' < ' + fx.norm.toFixed(0) + ')');
    ok(fx.hc > fx.thin && fx.hcWhite > 12 && fx.thinWhite === 0, 'high contrast: thicker, white-on-black outlined arcs (' + fx.hc + ' px vs ' + fx.thin + ', white ' + fx.hcWhite + ')');

    // ---- 10. photo mode hides them
    const photo = await page.evaluate(() => {
      const e = __mk('hound', 16.5, 11.5); RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'alert'); RIPPLES.draw(RIPPLES.list[0].t0 + 100);
      const visible = getComputedStyle(RIPPLES.canvas).display;
      document.getElementById('game').classList.add('p7-photo'); const hidden = getComputedStyle(RIPPLES.canvas).display;
      const drawn = RIPPLES.draw(RIPPLES.list[0].t0 + 120); const ink = __ink();
      document.getElementById('game').classList.remove('p7-photo'); __rm(e); return { visible, hidden, drawn, ink: ink.n };
    });
    ok(photo.visible === 'block' && photo.hidden === 'none' && photo.drawn === 0 && photo.ink === 0, 'photo mode: overlay hidden and cleared');

    // ---- 11. off again: nothing drawn
    const offAgain = await page.evaluate(() => {
      const e = __mk('hound', 16.5, 11.5); RIPPLES.setOn(false); const d0 = RIPPLES.stats.drawn, s0 = RIPPLES.stats.spawned;
      Audio_.sfx.enemy(e.def, 'alert'); Audio_.sfx.thunder(); RIPPLES.draw(performance.now() + 50);
      const r = { spawned: RIPPLES.stats.spawned - s0, drawn: RIPPLES.stats.drawn - d0, shown: RIPPLES.canvas.classList.contains('on'), key: localStorage.getItem('octave.ripples.v1') };
      __rm(e); return r;
    });
    ok(offAgain.spawned === 0 && offAgain.drawn === 0 && !offAgain.shown && offAgain.key === '{"on":0}', 'off: no ripples, no drawing, overlay hidden, setting stored');

    // ---- 12. the Options row, persistence, 640x400 fit
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const row = await page.evaluate(() => {
      const cap = document.getElementById('ac-cap'), lab = document.getElementById('rp-label'), b = document.getElementById('rp-toggle');
      const adjacent = !!cap && cap.nextElementSibling === lab && lab.nextElementSibling === b;
      renderAccessibilityMenu(); const dup = document.querySelectorAll('#rp-toggle').length;
      b.click(); const on = RIPPLES.settings.on, stored = localStorage.getItem('octave.ripples.v1'), pressed = document.getElementById('rp-toggle').getAttribute('aria-pressed');
      document.getElementById('rp-toggle').click();
      return { adjacent, dup, on, stored, pressed, off: RIPPLES.settings.on };
    });
    ok(row.adjacent && row.dup === 1, 'one Options row, placed right after Sound captions, not duplicated on re-render');
    ok(row.on === true && row.stored === '{"on":1}' && row.pressed === 'true' && row.off === false, 'the row toggles and persists in octave.ripples.v1');
    await page.keyboard.press('Escape'); await page.evaluate(() => { closeModal && closeModal(); G.state = 'play'; RIPPLES.setOn(true); });

    // the setting survives a reload
    await page.evaluate(() => { RIPPLES.setOn(true); });
    const reload = await page.evaluate(() => { RIPPLES.settings.on = false; RIPPLES.load(); return RIPPLES.settings.on; });
    ok(reload === true, 'setting reloads from storage');

    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const fit = await page.evaluate(() => {
      const panel = document.querySelector('#modal-panel'), grid = panel.querySelector('.ctl-grid') || panel;
      const b = document.getElementById('rp-toggle'); b.scrollIntoView({ block: 'nearest' }); const q = b.getBoundingClientRect();
      return { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, reach: q.left >= -1 && q.right <= innerWidth + 1 && q.width > 20 };
    });
    ok(fit.panelX && fit.gridX && fit.docX && fit.reach, 'compact 640x400: Options row reachable, no horizontal overflow');
    const compact = await page.evaluate(() => {
      closeModal && closeModal(); G.state = 'play'; const e = __mk('hound', 16.5, 11.5); RIPPLES.setOn(true); RIPPLES.clear(); Audio_.sfx.enemy(e.def, 'alert'); RIPPLES.draw(RIPPLES.list[0].t0 + 150);
      const g = document.getElementById('game').getBoundingClientRect(), c = RIPPLES.canvas.getBoundingClientRect(), v = document.getElementById('view').getBoundingClientRect();
      return { inside: c.left >= g.left - 1 && c.right <= g.right + 1 && c.top >= g.top - 1, aboveHud: c.bottom <= g.top + g.height * 0.75 + 2, docX: document.documentElement.scrollWidth <= innerWidth + 1, ratio: c.height / g.height, viewTop: v.top };
    });
    ok(compact.inside && compact.aboveHud && compact.docX, 'compact 640x400: overlay sits inside the 3D view, above the HUD bar, no overflow');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ripples-640x400.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { const e = G.ents.find(x => x.kind === 'enemy' && x.type === 'hound' && !x.hidden); if (e) __rm(e); RIPPLES.clear(); });

    // ---- 13. screenshots (optional) with the live frame loop on
    if (SHOTS) {
      await page.evaluate(() => { window.requestAnimationFrame = window.__raf; window.__raf(frame); });
      const shot = async (name, setup) => {
        await page.evaluate(setup); await page.waitForTimeout(260);
        await page.screenshot({ path: path.join(SHOTS, name) });
      };
      await page.evaluate(() => { G.state = 'play'; RIPPLES.setOn(true); ACCESS.settings.cap = true; window.__keep = () => { for (const r of RIPPLES.list) r.t0 = performance.now() - 250; }; });
      await shot('ripples-sides.png', () => { for (const e of G.ents.filter(x => x.__t)) __rm(e); RIPPLES.clear(); const a = __mk('hound', 17, 11.5), b = __mk('proctor', 8, 11.5); a.__t = b.__t = 1; Audio_.sfx.enemy(a.def, 'alert'); Audio_.sfx.enemy(b.def, 'attack'); });
      await shot('ripples-behind-wall.png', () => { for (const e of G.ents.filter(x => x.__t)) __rm(e); RIPPLES.clear(); const m = G.map, o = m.isSolidCell; m.isSolidCell = (x, y) => (y === 14 ? true : o.call(m, x, y)); const a = __mk('golem', 12.5, 17), c = __mk('hound', 12.5, 7); a.__t = c.__t = 1; Audio_.sfx.enemy(a.def, 'attack'); Audio_.sfx.enemy(c.def, 'alert'); setTimeout(() => { m.isSolidCell = o; }, 300); });
      await shot('ripples-hc.png', () => { RIPPLES.clear(); document.documentElement.classList.add('ac-hc'); const a = __mk('golem', 17, 9); a.__t = 1; Audio_.sfx.enemy(a.def, 'attack'); Audio_.sfx.thunder(); });
      await page.evaluate(() => { document.documentElement.classList.remove('ac-hc'); });
    }

    // ---- 14. no gameplay change: AI traces with ripples on and off are identical
    const trace = await page.evaluate(() => {
      const run = (on) => {
        RIPPLES.setOn(on); RIPPLES.clear(); loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
        Math.random = (() => { let s = 12345; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
        G.player.hp = G.player.hpMax = 9999; G.noise = 4;
        const list = [['hound', 9.5, 7.5], ['proctor', 14.5, 8.5], ['quiet', 11.5, 5.5], ['legionnaire', 8.5, 9.5], ['weaverling', 15.5, 6.5], ['golem', 12.5, 4.5]].map(([t, x, y]) => { const e = hydrate({ kind: 'enemy', type: t, x, y }); e.state = 'idle'; return e; });
        G.ents.push(...list); const tr = [], cam = Engine.cam;
        for (let i = 0; i < 400; i++) {
          if (i === 150) { G.noise = 0; cam.x = 12.5; cam.y = 12.2; }
          for (const e of list) enemyUpdate(e, 0.05);
          RIPPLES.tick();
          for (const e of list) tr.push([e.x, e.y, e.state, e.cool, e.hp, e.alertT].join(','));
          tr.push(G.player.hp);
        }
        const spawned = RIPPLES.stats.spawned;
        for (const e of list) G.ents.splice(G.ents.indexOf(e), 1);
        cam.x = 12.5; cam.y = 11.5; return { s: tr.join('|'), spawned };
      };
      run(false); const a = run(false), b = run(true), c = run(false);
      RIPPLES.setOn(false); RIPPLES.clear();
      return { same: a.s === b.s && a.s === c.s, ripples: b.spawned - a.spawned, len: a.s.length };
    });
    ok(trace.same && trace.ripples > 0, 'enemy AI trace identical with ripples on and off (' + trace.len + ' chars; ripples did fire: ' + trace.ripples + ')');

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? 'FAIL ripples (' + fails + ')' : 'PASS ripples');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL ripples', e); process.exit(1); });
