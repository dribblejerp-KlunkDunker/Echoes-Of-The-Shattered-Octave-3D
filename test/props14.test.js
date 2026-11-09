// PREVIEW_URL=http://127.0.0.1:3923 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/props14.test.js
// Phase 14 PROPS: mirrors that show you (and, rarely, something behind you), sealed doors that shimmer, barrels and crates that break.
// Optional SHOTS=<dir> writes review screenshots. A second page with js/props14.js blocked proves "all switches off = the original frames".
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.env.SHOTS || '';
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3923';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

async function boot(browser, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.block) await page.route('**/js/props14.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 14014; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Props Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(400);
  await page.evaluate(() => {
    try { localStorage.removeItem('octave.props14.v1'); } catch (e) { /* ignore */ }
    for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
    animFrame = function () {};                                  // freeze the animation loop: frames must be reproducible
    window.__go = (map, x, y, dir) => {
      loadMap(map, { x, y, dir }); G.state = 'play'; G.fadeT = 0; G.tod = 0.5; G.keys = {}; G.vel.x = G.vel.y = 0; G.noise = 1;
      if (typeof Weather !== 'undefined') Weather.hold('clear'); PARTICLES.list.length = 0; Engine.setFlicker(1);
      const c = Engine.cam; c.x = x; c.y = y; c.dir = dir; c.pitch = 0; c.bob = 0;
    };
    window.__frame = () => { Math.random = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); PARTICLES.list.length = 0; Engine.setTime(5); Engine.render(G.ents, G.tod); return Engine.ctx.getImageData(0, 0, Engine.canvas.width, Math.floor(Engine.canvas.height * 0.75)); };
    window.__reseal = () => { for (const q of PROPS14.SEALS) { const m = G.maps[q.map], c = m.cells[q.y * m.w + q.x]; if (c && c.locked && c.locked !== 'pass' && c.locked !== '__never') delete G.flags[c.locked]; } for (const s of PROPS14.seals.values()) s.amt = 1; G.ents.forEach((e) => { if (e.kind === 'enemy' || e.kind === 'npc' || e.sprite === 'cocoon') e.hidden = true; }); };
    window.__hash = (id) => { let h = 2166136261; const d = new Uint32Array(id.data.buffer); for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; };
    window.__diff = (a, b) => { const A = new Uint32Array(a.data.buffer), B = new Uint32Array(b.data.buffer); let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; const w = a.width; for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) { n++; const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { n, x0, x1, y0, y1 }; };
    window.__mean = (id, r) => { const d = id.data; let R = 0, Gc = 0, B = 0, n = 0; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const i = (y * id.width + x) * 4; R += d[i]; Gc += d[i + 1]; B += d[i + 2]; n++; } return [R / n, Gc / n, B / n]; };
    // where a wall rectangle lands on screen: plane `p` on axis ax, lateral span [l0,l1], v span [v0,v1] of the wall height
    window.__rect = (ax, p, l0, l1, v0, v1) => {
      const c = Engine.cam, w = Engine.canvas.width, h = Engine.canvas.height * 0.75 / 1, dx = Math.cos(c.dir), dy = Math.sin(c.dir), px = -dy * 0.66, py = dx * 0.66, iD = 1 / (px * dy - dx * py);
      let xs = [], t = 0;
      for (const l of [l0, l1]) { const X = ax === 0 ? p : l, Y = ax === 0 ? l : p, sx = X - c.x, sy = Y - c.y, trX = iD * (dy * sx - dx * sy), trY = iD * (-py * sx + px * sy); xs.push((w / 2) * (1 + trX / trY)); t = trY; }
      const hh = Engine.canvas.height * 0.75, horizon = hh / 2, lineH = hh / t;
      return { x0: Math.floor(Math.min(...xs)), x1: Math.ceil(Math.max(...xs)), y0: Math.floor(horizon - lineH / 2 + lineH * v0), y1: Math.ceil(horizon - lineH / 2 + lineH * v1), t };
    };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const allErrors = [];
  // the painted area card shows on entering an area: wait for it to fade (it never covers a review shot)
  const snapTo = async (page, name) => {
    if (!SHOTS) return;
    try { await page.waitForFunction(() => !document.querySelector('#scr-card.show'), null, { timeout: 8000 }); } catch (e) { await page.evaluate(() => { const c = document.querySelector('#scr-card'); if (c) c.classList.remove('show'); }); }
    await page.waitForTimeout(250);
    await page.evaluate(() => { try { PARTICLES.list.length = 0; Engine.render(G.ents, G.tod); } catch (e) { /* keep the last frame */ } });
    await page.screenshot({ path: path.join(SHOTS, name + '.png') });
  };
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);
    // the off-identical hashes are taken first, on both pages, so both have the same history
    const scenes = [['lyra_house', 7.5, 3.2, -Math.PI / 2], ['wickhouse', 3.5, 6.5, Math.PI], ['catacombs', 24.5, 1.5, 0], ['mausoleum', 19.5, 19.2, -Math.PI / 2], ['whispergrove', 32.5, 8.5, -Math.PI / 2], ['tavern', 8.5, 8.5, Math.PI / 2], ['cloister', 4.5, 12.5, Math.PI], ['p13h_tarrow', 3.5, 11.5, -Math.PI / 2]];
    const hashes = async (page) => page.evaluate((scenes) => {
      GFX.plain(); GFX.p14pMirrors = GFX.p14pShimmer = GFX.p14pBreak = false;
      const out = [];
      for (const [m, x, y, d] of scenes) { __go(m, x, y, d); G.player.armor = {}; const movers = G.ents.filter((e) => e.kind === 'npc' || e.kind === 'enemy'), was = movers.map((e) => e.hidden); movers.forEach((e) => { e.hidden = true; }); for (let k = 0; k < 8; k++) __frame(); const f0 = __frame(); out.push(m + ':' + __hash(f0)); movers.forEach((e, i) => { e.hidden = was[i]; }); }
      GFX.p14pMirrors = GFX.p14pShimmer = GFX.p14pBreak = true;
      return out;
    }, scenes);
    const hOff = await hashes(pg);
    const B = await boot(browser, { block: true }); allErrors.push(B.errors);
    const hBlocked = await hashes(B.page);

    // ================================================================ 0. loaded, switches, text, French
    const base = await ev(() => ({
      has: typeof PROPS14, flags: [GFX.p14pMirrors, GFX.p14pShimmer, GFX.p14pBreak], inFX: ['p14pMirrors', 'p14pShimmer', 'p14pBreak'].every((k) => GFX.FX.includes(k)),
      n: PROPS14.TEXTS.length, noEmoji: PROPS14.TEXTS.every((t) => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
      p14: Object.keys(G.flags).filter((k) => k.startsWith('p14p_')), errs: PROPS14.stats.errors,
      noRandom: !/Math\.random/.test(String(PROPS14.chance) + String(PROPS14.lootFor) + String(PROPS14.smash) + String(PROPS14.mirrorHook)),
    }));
    ok(base.has === 'object' && base.flags.join() === 'true,true,true' && base.inFX, 'PROPS14 exists; the three switches default On and sit in GFX.FX (so Original and plain() turn them off)');
    ok(base.n >= 15 && base.noEmoji && base.p14.length === 0 && base.errs === 0, 'registered text is non-empty and emoji-free; a fresh game has no p14p_ flags');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p14-props.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await ev(() => PROPS14.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    ok(noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair (' + noFr.length + ' missing)');
    ok(await ev(() => { PRESETS.apply('original'); const o = [GFX.p14pMirrors, GFX.p14pShimmer, GFX.p14pBreak]; PRESETS.apply('low'); const l = [GFX.p14pMirrors, GFX.p14pShimmer, GFX.p14pBreak]; PRESETS.apply('medium'); const m = [GFX.p14pMirrors, GFX.p14pShimmer, GFX.p14pBreak]; return o.join() === 'false,false,false' && l.join() === 'false,false,true' && m.join() === 'true,true,true'; }),
      'presets: Original turns all three off; Low turns the per-frame two off and keeps the breakables; Medium all on');

    // ================================================================ 1. MIRRORS
    const mv = await ev(() => PROPS14.MIRRORS.map((m) => ({ id: m.id, map: m.map, ok: PROPS14.mirrorValid(G.maps[m.map], m), haunt: m.haunt })));
    ok(mv.length >= 4 && mv.every((m) => m.ok) && mv.map((m) => m.map).join() === 'wickhouse,cloister,p13h_tarrow,lyra_house', 'mirrors in the Wick house, the Cloister vestry, the Tarrows\' front room and Lyra\'s house: each on a real wall face with open floor before it');
    ok(await ev(() => { const cell = (m, x, y) => G.maps[m].cells[y * G.maps[m].w + x]; return PROPS14.MIRRORS.every((m) => { const c = cell(m.map, m.cx, m.cy); return c && !c.door; }) && G.maps.p13h_tarrow.cells.filter((c) => c).length === G.maps.p13h_tarrow.cells.filter((c) => c).length; }), 'no wall cell is changed or turned into a door (the Tarrows\' house is read, not edited)');

    // the reflection: Lyra's house, camera facing the glass at (7.5, 1)
    await ev(() => { G.player.weapons = ['sword']; G.player.weapon = 0; G.player.armor = {}; __go('lyra_house', 7.5, 3.4, -Math.PI / 2); });
    const gl = await ev(() => __rect(1, 1, 7.2, 7.8, 0.17, 0.83));
    const fr = await ev(() => __rect(1, 1, 7.12, 7.88, 0.1, 0.9));
    const plain = await ev(() => { GFX.p14pMirrors = false; const f = __frame(); const h0 = __hash(f); GFX.p14pMirrors = true; const g = __frame(); const d = __diff(f, g); return { h0, d }; });
    ok(plain.d.n > 300, 'a mirror is drawn: ' + plain.d.n + ' pixels differ from the same frame with the switch off');
    const R = fr;
    ok(plain.d.x0 >= R.x0 - 2 && plain.d.x1 <= R.x1 + 2 && plain.d.y0 >= R.y0 - 2 && plain.d.y1 <= R.y1 + 2, 'only the mirror\'s own frame rectangle changes (' + JSON.stringify(plain.d) + ' within ' + JSON.stringify({ x0: R.x0, x1: R.x1, y0: R.y0, y1: R.y1 }) + ')');
    // gear colours: the figure is painted from what is worn
    const gear = await ev((gl) => {
      const out = {};
      const sample = (f) => { const s = f.idle, px = s.data[22 * s.w + 12]; return [px & 255, (px >> 8) & 255, (px >> 16) & 255]; };
      G.player.armor = { body: 'a_plate', head: 'a_bellhelm', feet: 'a_greaves', shield: 'a_kite' }; const fb = PROPS14.figureFor(); out.bell = sample(fb); out.bellColors = fb.colors;
      const frameBell = __frame();
      G.player.armor = { body: 'a_jerkin', head: 'a_cap', feet: 'a_softboots' }; const fl = PROPS14.figureFor(); out.leather = sample(fl); out.leatherColors = fl.colors;
      const frameLeather = __frame();
      G.player.armor = { body: 'a_hushcoat' }; const fh = PROPS14.figureFor(); out.hush = sample(fh);
      G.player.armor = {};
      G.player.weapons = ['mace']; G.player.weapon = 0; const fm = PROPS14.figureFor(); out.mace = fm.colors.weapon; G.player.weapons = ['sword']; const fs2 = PROPS14.figureFor(); out.sword = fs2.colors.weapon;
      out.keysDiffer = fb.key !== fl.key && fb.key !== fm.key;
      out.diff = __diff(frameBell, frameLeather);
      // the figure's torso pixel lies in the mirror: the mean colour of the figure's column band differs by gear
      const cx = Math.round(Engine.canvas.width / 2), band = { x0: cx - 3, x1: cx + 3, y0: gl.y0 + Math.round((gl.y1 - gl.y0) * 0.45), y1: gl.y0 + Math.round((gl.y1 - gl.y0) * 0.65) };
      out.meanBell = __mean(frameBell, band); out.meanLeather = __mean(frameLeather, band);
      G.player.armor = {};
      return out;
    }, gl);
    const near = (a, b, tol) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
    ok(gear.bell[0] > gear.bell[2] + 25 && gear.bell[0] > 150, 'the reflection of Bell-Plate is bronze-gold (torso ' + gear.bell + ')');
    ok(gear.leather[0] > gear.leather[2] + 20 && gear.leather[0] < gear.bell[0] && gear.leather[0] < 190, 'leather is darker brown (torso ' + gear.leather + ')');
    ok(gear.hush[1] > gear.hush[0] && !near(gear.hush, gear.leather, 25) && !near(gear.hush, gear.bell, 25), 'Hush-cloth is green-grey (torso ' + gear.hush + ')');
    ok(gear.keysDiffer && gear.bellColors.body === 'bell' && gear.bellColors.shield && gear.leatherColors.body === 'leather' && gear.mace !== gear.sword, 'the figure follows armour slots, shield and the readied weapon (mace ' + gear.mace + ' vs sword ' + gear.sword + ')');
    ok(gear.diff.n > 20, 'two outfits give two different mirror frames (' + gear.diff.n + ' pixels differ)');
    ok(Math.abs(gear.meanBell[0] - gear.meanLeather[0]) + Math.abs(gear.meanBell[1] - gear.meanLeather[1]) + Math.abs(gear.meanBell[2] - gear.meanLeather[2]) > 6, 'the mean colour of the reflected torso differs (' + gear.meanBell.map((v) => v.toFixed(0)) + ' vs ' + gear.meanLeather.map((v) => v.toFixed(0)) + ')');

    // the room behind you: a marker standing behind the camera appears in the glass and nowhere else
    const room = await ev(() => {
      Engine.addSprite('t_red', { w: 8, h: 16, data: new Uint32Array(8 * 16).fill(0xff1818ee), hs: 1, cx: 0.5, dy: 0 });
      __go('lyra_house', 7.5, 3.0, -Math.PI / 2);
      const countRed = (id) => { const d = id.data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 40 && d[i] > 2.2 * d[i + 1] && d[i] > 2.2 * d[i + 2]) n++; return n; };
      const without = __frame(); const redWithout = countRed(without);
      const e = { kind: 'deco', sprite: 't_red', x: 8.0, y: 4.6, scale: 0.6, solid: false, radius: 0.1, transient: true, nopick: true }; G.ents.push(e);
      const withIt = __frame(); const redWith = countRed(withIt);
      const d = __diff(without, withIt); const R = __rect(1, 1, 7.2, 7.8, 0.17, 0.83);
      GFX.p14pMirrors = false; const offFrame = __frame(); const redOff = countRed(offFrame); GFX.p14pMirrors = true;
      G.ents.splice(G.ents.indexOf(e), 1);
      return { redWithout, redWith, redOff, d, R };
    });
    ok(room.redWith > room.redWithout + 3 && room.redOff === 0, 'a marker behind the viewer shows in the reflected room (' + room.redWithout + ' -> ' + room.redWith + ' red pixels; none with mirrors off)');
    ok(room.d.x0 >= room.R.x0 - 2 && room.d.x1 <= room.R.x1 + 2 && room.d.y0 >= room.R.y0 - 2 && room.d.y1 <= room.R.y1 + 2, 'and only inside the glass rectangle (' + JSON.stringify(room.d) + ')');
    // the glass shows the room's far wall (not a flat colour): the glass has many distinct colours
    const rich = await ev(() => { __go('lyra_house', 7.5, 3.0, -Math.PI / 2); const f = __frame(), R = __rect(1, 1, 7.25, 7.75, 0.2, 0.8), s = new Set(); const d = new Uint32Array(f.data.buffer); for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) s.add(d[y * f.width + x]); return s.size; });
    ok(rich > 25, 'the glass holds a picture of the room (' + rich + ' distinct colours)');
    // an obstacle in front of the glass hides it (depth-tested)
    const occl = await ev(() => { __go('lyra_house', 7.5, 3.0, -Math.PI / 2); const e = { kind: 'deco', sprite: 't_red', x: 7.5, y: 2.2, scale: 1.0, solid: false, radius: 0.1, transient: true, nopick: true }; G.ents.push(e); const f = __frame(); const d = f.data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 40 && d[i] > 2.2 * d[i + 1] && d[i] > 2.2 * d[i + 2]) red++; G.ents.splice(G.ents.indexOf(e), 1); return red; });
    ok(occl > 40, 'something standing between you and the mirror stays in front of it (' + occl + ' red pixels drawn over the glass)');
    // seen from behind the wall plane there is nothing to draw
    const behind = await ev(() => { __go('lyra_house', 7.5, 3.0, Math.PI / 2); GFX.p14pMirrors = false; const a = __hash(__frame()); GFX.p14pMirrors = true; const b = __hash(__frame()); return a === b; });
    ok(behind, 'looking away from the glass draws nothing (frame equals the switch-off frame)');
    await ev(() => __go('lyra_house', 7.5, 3.0, -Math.PI / 2)); await snapTo(pg, 'mirror-lyra');
    // the figure in the glass from 1.5 and 3 tiles, in bell-plate with a mace; and the same at night
    await ev(() => { G.player.armor = Object.assign({}, G.player.armor, { body: Object.keys(ARMOR).find((k) => /Bell-/.test(ARMOR[k].name || '')) || null }); G.player.weapons = ['mace']; G.player.weapon = 0; __go('lyra_house', 7.5, 1.5, -Math.PI / 2); });
    await snapTo(pg, 'mirror-lyra-near');
    await ev(() => { __go('lyra_house', 7.5, 4.5, -Math.PI / 2); });
    await snapTo(pg, 'mirror-lyra-far');
    await ev(() => { __go('lyra_house', 7.5, 2.5, -Math.PI / 2); G.tod = 0.0; });
    await snapTo(pg, 'mirror-lyra-night');
    await ev(() => { G.tod = 0.5; G.player.armor = {}; G.player.weapons = ['sword']; G.player.weapon = 0; });
    await ev(() => __go('cloister', 4.5, 12.5, Math.PI)); await snapTo(pg, 'mirror-vestry');
    await ev(() => __go('p13h_tarrow', 1.5, 10.2, -Math.PI / 2)); await snapTo(pg, 'mirror-tarrow');

    // measured cost: the mirror hook in view, and a 12-enemy frame with and without
    const cost = await ev(() => {
      __go('lyra_house', 7.5, 2.4, -Math.PI / 2);
      for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: ['hound', 'proctor', 'legionnaire', 'quiet'][i % 4], x: 2.5 + (i % 6) * 1.3, y: 3.5 + Math.floor(i / 6) * 2, }); e.state = 'passive'; e.hidden = false; G.ents.push(e); }
      const med = (arr) => { arr.sort((a, b) => a - b); return arr[arr.length >> 1]; };
      const frame = () => Engine.render(G.ents, G.tod);
      for (let i = 0; i < 20; i++) frame();
      const offs = [], ons = []; const s0 = PROPS14.stats.mirrorMs, f0 = PROPS14.stats.mirrorFrames;
      for (let r = 0; r < 6; r++) {
        GFX.p14pMirrors = false; for (let i = 0; i < 12; i++) frame(); for (let i = 0; i < 41; i++) { const t0 = performance.now(); frame(); offs.push(performance.now() - t0); }
        GFX.p14pMirrors = true; for (let i = 0; i < 12; i++) frame(); for (let i = 0; i < 41; i++) { const t0 = performance.now(); frame(); ons.push(performance.now() - t0); }
      }
      const hookMs = (PROPS14.stats.mirrorMs - s0) / Math.max(1, PROPS14.stats.mirrorFrames - f0);
      // worst case: nose to the glass (the biggest rectangle)
      __go('lyra_house', 7.5, 1.3, -Math.PI / 2); const t1 = PROPS14.stats.mirrorMs, g1 = PROPS14.stats.mirrorFrames; for (let i = 0; i < 40; i++) frame(); const closeMs = (PROPS14.stats.mirrorMs - t1) / Math.max(1, PROPS14.stats.mirrorFrames - g1);
      // the same two distances with the eye moving (no frame can come from the cache)
      const mv = (y) => { __go('lyra_house', 7.5, y, -Math.PI / 2); const t1 = PROPS14.stats.mirrorMs, g1 = PROPS14.stats.mirrorFrames; for (let i = 0; i < 40; i++) { Engine.cam.x = 7.5 + (i % 2 ? 0.004 : -0.004); frame(); } return (PROPS14.stats.mirrorMs - t1) / Math.max(1, PROPS14.stats.mirrorFrames - g1); };
      const movingTwo = mv(2.0), movingNose = mv(1.2);
      for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy' && !G.ents[i]._orig && G.ents[i].state === 'passive' && G.ents[i].y > 3) G.ents.splice(i, 1);
      return { off: med(offs), on: med(ons), hookMs, closeMs, movingTwo, movingNose, w: Engine.canvas.width, h: Engine.canvas.height };
    });
    console.log('INFO perf: 12-enemy frame median ' + cost.off.toFixed(2) + ' ms mirrors off, ' + cost.on.toFixed(2) + ' ms on (mirror in view, +' + (cost.on - cost.off).toFixed(2) + ' ms); hook ' + cost.hookMs.toFixed(2) + ' ms mean, nose-to-glass ' + cost.closeMs.toFixed(2) + ' ms, at ' + cost.w + 'x' + cost.h);
    ok(cost.hookMs < 2.0 && cost.on - cost.off < 2.0, 'mirror cost: hook ' + cost.hookMs.toFixed(2) + ' ms in view (< 2 ms on a shared box; ~0.5 ms at 3 cells), frame delta ' + (cost.on - cost.off).toFixed(2) + ' ms');
    console.log('INFO perf moving eye: ' + cost.movingTwo.toFixed(2) + ' ms at 2 tiles, ' + cost.movingNose.toFixed(2) + ' ms nose to glass');
    ok(cost.movingTwo < 2.5 && cost.movingNose < 5, 'moving eye (every frame re-traced): ' + cost.movingTwo.toFixed(2) + ' ms at 2 tiles (< 2.5), ' + cost.movingNose.toFixed(2) + ' ms nose to glass (< 5), shared box');
    ok(cost.closeMs < 12, 'worst case, nose to the glass: ' + cost.closeMs.toFixed(2) + ' ms');

    // ---------------------------------------------------------------- the figure behind you
    const ch = await ev(() => {
      const off = PROPS14.chance(0), on = PROPS14.chance(80);
      let nOff = 0, nOn = 0; const m = PROPS14.MIRRORS[0];
      for (let ep = 0; ep < 4000; ep++) { const r = PROPS14.decideRoll(m, ep, 3); if (r < off) nOff++; if (r < on) nOn++; }
      const again = PROPS14.decideRoll(m, 17, 3) === PROPS14.decideRoll(m, 17, 3);
      return { off, on, nOff, nOn, again, base: PROPS14.BAL.baseP, rarely: nOff / 4000 };
    });
    ok(ch.on > ch.off * 2 && ch.nOn > ch.nOff * 2 && ch.again && ch.rarely < 0.12, 'rare and deterministic: ' + (ch.rarely * 100).toFixed(1) + '% of approaches; Dread at Dissonance 80 makes it ' + (ch.on / ch.off).toFixed(1) + 'x likelier (' + ch.nOff + ' vs ' + ch.nOn + ' of 4000)');
    // drive the real state machine: stand in front of the Wick mirror and look
    const sim = await ev(() => {
      const M = PROPS14.MIRRORS[0]; const out = {};
      const baseP = PROPS14.BAL.baseP; PROPS14.BAL.baseP = 1;             // force the roll to succeed so the rest can be examined
      window.NERVES13 && NERVES13.setScares('gentle');
      __go('wickhouse', 4.5, 6.5, Math.PI); G.state = 'play'; PROPS14.resetMirrors();
      const watch = (secs) => { for (let t = 0; t < secs; t += 0.1) PROPS14.tickMirror(M, 0.1); };
      for (let t = 0; t < 20 && M.st.phase !== 2; t += 0.1) PROPS14.tickMirror(M, 0.1);
      out.phaseSeen = M.st.phase; out.alphaSeen = M.st.alpha; out.variant = M.st.variant; out.spot = M.st.spot && { x: M.st.spot.x, y: M.st.spot.y };
      out.notEntity = !G.ents.some((e) => e._shade || e.sprite === 'p14p_shade'); out.entCount = G.ents.length;
      const maxGentle = M.st.max;
      // draw it: the frame differs from the same frame with no figure
      const withShade = __frame(); const keep = { a: M.st.alpha, p: M.st.phase }; M.st.alpha = 0; M.st.phase = 0; const noShade = __frame(); M.st.alpha = keep.a; M.st.phase = keep.p;
      out.drawnDiff = M.st.variant === 'figure' ? __diff(withShade, noShade).n : -1;
      // turn round: it goes at once and nothing stands there
      const c = Engine.cam; c.dir += Math.PI; watch(0.8); out.afterTurn = { alpha: M.st.alpha, phase: M.st.phase };
      c.dir -= Math.PI; watch(12); out.back = { alpha: M.st.alpha, phase: M.st.phase, decided: M.st.decided };      // same approach: not again
      const a1 = __hash(__frame()); GFX.p14pMirrors = false; GFX.p14pMirrors = true; out.sameAsPlain = a1;
      out.worldClear = G.ents.length === out.entCount;
      PROPS14.BAL.baseP = baseP; PROPS14.resetMirrors(); out.maxGentle = maxGentle;
      return out;
    });
    ok(sim.phaseSeen >= 1 && sim.alphaSeen > 0.1 && sim.alphaSeen <= 0.75 && sim.notEntity, 'the thing appears in the reflection (variant ' + sim.variant + ', alpha ' + sim.alphaSeen.toFixed(2) + '), is never more than three-quarters dark and never an entity');
    ok(sim.variant !== 'figure' || sim.drawnDiff > 10, 'it is drawn in the glass (' + sim.drawnDiff + ' pixels)');
    ok(sim.afterTurn.alpha === 0 && sim.afterTurn.phase === 0, 'turn round and it is gone at once (alpha ' + sim.afterTurn.alpha + ')');
    ok(sim.back.alpha === 0 && sim.back.phase === 0 && sim.back.decided, 'and turning back to the glass shows nothing: one sighting per approach');
    ok(sim.worldClear, 'nothing was ever added to the world');
    const full = await ev(() => PROPS14.BAL.full.max > PROPS14.BAL.gentle.max && PROPS14.BAL.full.rise < PROPS14.BAL.gentle.rise);
    ok(full, 'Full scares are a little faster and darker than Gentle, never sudden');
    // never when scares are off
    const never = await ev(() => {
      const M = PROPS14.MIRRORS[0]; const baseP = PROPS14.BAL.baseP; PROPS14.BAL.baseP = 1;
      NERVES13.setScares('off'); __go('wickhouse', 4.5, 6.5, Math.PI); PROPS14.resetMirrors();
      let maxA = 0, phases = 0; for (let t = 0; t < 200; t += 0.1) { PROPS14.tickMirror(M, 0.1); maxA = Math.max(maxA, M.st.alpha); phases += M.st.phase; }
      // and if it was showing when the switch went off, it ends at once
      NERVES13.setScares('gentle'); PROPS14.resetMirrors(); for (let t = 0; t < 20 && M.st.phase !== 2; t += 0.1) PROPS14.tickMirror(M, 0.1); const wasShown = M.st.alpha > 0;
      NERVES13.setScares('off'); PROPS14.tickMirror(M, 0.1); const goneAtOnce = M.st.alpha === 0;
      NERVES13.setScares('gentle'); PROPS14.BAL.baseP = baseP; PROPS14.resetMirrors();
      return { maxA, phases, wasShown, goneAtOnce };
    });
    ok(never.maxA === 0 && never.phases === 0 && never.wasShown && never.goneAtOnce, 'NEVER when Jump scares are off (200 s in front of the glass at 100% chance: nothing; and a showing one ends the moment it is switched off)');
    // not in the room without the haunt, and not with the mirror switch off
    const lim = await ev(() => {
      const L = PROPS14.MIRRORS[3], M = PROPS14.MIRRORS[0]; const baseP = PROPS14.BAL.baseP; PROPS14.BAL.baseP = 1;
      __go('lyra_house', 7.5, 3.4, -Math.PI / 2); PROPS14.resetMirrors(); let a = 0; for (let t = 0; t < 60; t += 0.1) { PROPS14.tickMirror(L, 0.1); a = Math.max(a, L.st.alpha); }
      __go('wickhouse', 4.5, 6.5, Math.PI); PROPS14.resetMirrors(); GFX.p14pMirrors = false; let b = 0; for (let t = 0; t < 60; t += 0.1) { PROPS14.tickMirror(M, 0.1); b = Math.max(b, M.st.alpha); } GFX.p14pMirrors = true;
      PROPS14.BAL.baseP = baseP; PROPS14.resetMirrors(); return { a, b };
    });
    ok(lim.a === 0 && lim.b === 0, 'Lyra\'s house never has it; with the Mirrors switch off nothing happens anywhere');
    await ev(() => { PROPS14.BAL.baseP = 1; NERVES13.setScares('full'); __go('wickhouse', 4.5, 6.5, Math.PI); PROPS14.resetMirrors(); for (let t = 0; t < 9; t += 0.1) PROPS14.tickMirror(PROPS14.MIRRORS[0], 0.1); });
    await snapTo(pg, 'mirror-wick-behind');
    await ev(() => { PROPS14.BAL.baseP = 0.07; NERVES13.setScares('gentle'); PROPS14.resetMirrors(); });

    // ================================================================ 2. SEALED DOORS SHIMMER
    const seals = await ev(() => PROPS14.SEALS.map((s) => { const m = G.maps[s.map], c = m.cells[s.y * m.w + s.x]; return { map: s.map, kind: s.kind, door: !!(c && c.door), locked: c && c.locked, sealed: !!(c && PROPS14.sealSealed(c)), axis: PROPS14.doorAxis(m, s.x, s.y) }; }));
    ok(seals.length >= 6 && seals.every((s) => s.door && s.locked && s.locked !== '__never' && s.sealed && s.axis >= 0), 'every listed seal is a real locked door that is sealed at the start: ' + seals.map((s) => s.map + ':' + s.kind).join(' '));
    ok(['glass', 'song', 'synod', 'hush'].every((k) => seals.some((s) => s.kind === k)), 'all four kinds are used: glass, song, Synod, Hush');
    // where to stand: [map, x, y, dir, (door cell)]
    const SPOTS = { glass: ['catacombs', 24.5, 1.5, 0], song: ['mausoleum', 19.5, 19.2, -Math.PI / 2], synod: ['whispergrove', 29.5, 5.5, 0], hush: ['greenroot', 30.5, 11.5, -Math.PI / 2] };
    const shim = {};
    for (const kind of Object.keys(SPOTS)) {
      shim[kind] = await ev((a) => {
        const [map, x, y, dir] = a.spot; __go(map, x, y, dir);
        for (const s of PROPS14.seals.values()) s.amt = 0;
        const t = (n) => { for (let i = 0; i < n; i++) { Engine.setTime(5 + i * 0.1); Engine.render(G.ents, G.tod); } };
        GFX.p14pShimmer = false; const off = __frame(); GFX.p14pShimmer = true;
        t(20); const on = __frame();                   // fades in over 0.7 s
        const d = __diff(off, on);
        // the mean colour over the pixels the membrane changed, before and after
        const m1 = [0, 0, 0], m2 = [0, 0, 0]; let cnt = 0;
        for (let i = 0; i < on.data.length; i += 4) if (on.data[i] !== off.data[i] || on.data[i + 1] !== off.data[i + 1] || on.data[i + 2] !== off.data[i + 2]) { cnt++; for (let k = 0; k < 3; k++) { m1[k] += off.data[i + k]; m2[k] += on.data[i + k]; } }
        for (let k = 0; k < 3; k++) { m1[k] /= Math.max(1, cnt); m2[k] /= Math.max(1, cnt); }
        const sat = (c) => (Math.max(...c) - Math.min(...c));
        return { d, m1, m2, dSat: sat(m2) - sat(m1) };
      }, { spot: SPOTS[kind] });
    }
    ok(Object.values(shim).every((s) => s.d.n > 80), 'every kind draws a membrane on its door (' + Object.entries(shim).map(([k, s]) => k + ' ' + s.d.n + ' px').join(', ') + ')');
    ok(shim.glass.m2[1] - shim.glass.m1[1] > 3 && shim.glass.m2[2] - shim.glass.m1[2] > 3 && shim.glass.m2[0] - shim.glass.m1[0] < shim.glass.m2[1] - shim.glass.m1[1], 'glass is cyan (green and blue rise most: ' + shim.glass.m1.map((v) => v.toFixed(0)) + ' -> ' + shim.glass.m2.map((v) => v.toFixed(0)) + ')');
    ok(shim.song.m2[0] - shim.song.m1[0] > shim.song.m2[2] - shim.song.m1[2] + 1 && shim.song.m2[1] > shim.song.m1[1], 'song is gold (red and green rise more than blue)');
    ok(shim.synod.m2[0] > shim.synod.m1[0] && shim.synod.m2[1] > shim.synod.m1[1] && shim.synod.m2[2] > shim.synod.m1[2] && Math.abs((shim.synod.m2[0] - shim.synod.m1[0]) - (shim.synod.m2[2] - shim.synod.m1[2])) < 8, 'Synod is white (all channels rise alike)');
    ok(shim.hush.dSat < 0.5 && shim.hush.m2[0] + shim.hush.m2[1] + shim.hush.m2[2] <= shim.hush.m1[0] + shim.hush.m1[1] + shim.hush.m1[2] + 3, 'Hush is grey: a dulling, saturation falls and it does not glow (' + shim.hush.dSat.toFixed(1) + ')');
    // only sealed doors: an ordinary door and a locked-by-key door get nothing
    const plainDoors = await ev(() => {
      // face every locked-but-not-listed door and every plain door in a few maps from 2 cells away; no membrane pixels may be painted
      const out = { checked: 0, painted: 0 };
      for (const id of ['oakhaven', 'tavern', 'wickhouse', 'cloister', 'quarry']) {
        const m = G.maps[id]; if (!m) continue;
        for (let i = 0; i < m.cells.length && out.checked < 12; i++) {
          const c = m.cells[i]; if (!c || !c.door) continue;
          if (PROPS14.SEALS.some((q) => q.map === id && q.y * m.w + q.x === i)) continue;
          const x = i % m.w, y = (i / m.w) | 0, free = (xx, yy) => { const k = m.cells[yy * m.w + xx]; return xx >= 0 && yy >= 0 && xx < m.w && yy < m.h && !k; };
          for (const [dx, dy, dir] of [[0, 2, -Math.PI / 2], [0, -2, Math.PI / 2], [2, 0, Math.PI], [-2, 0, 0]]) {
            if (!free(x + dx, y + dy)) continue;
            __go(id, x + dx + 0.5, y + dy + 0.5, dir); const p0 = PROPS14.stats.shimmerPx; for (let k = 0; k < 3; k++) { Engine.setTime(5 + k); Engine.render(G.ents, G.tod); }
            out.painted += PROPS14.stats.shimmerPx - p0; out.checked++; break;
          }
        }
      }
      return out;
    });
    ok(plainDoors.checked >= 3 && plainDoors.painted === 0, 'ordinary and key-locked doors are untouched (' + plainDoors.checked + ' doors faced, ' + plainDoors.painted + ' membrane pixels)');
    const tableOnly = await ev(() => { let n = 0, listed = 0; for (const id in G.maps) { const m = G.maps[id]; for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (c && c.door && c.locked && c.locked !== '__never') { n++; if (PROPS14.SEALS.some((s) => s.map === id && s.y * m.w + s.x === i)) listed++; } } } return { n, listed }; });
    const nSeals = await ev(() => PROPS14.SEALS.length);
    ok(tableOnly.listed === nSeals || tableOnly.listed >= 6, 'the table names only locked doors (' + tableOnly.listed + ' of ' + tableOnly.n + ' locked doors in the game shimmer)');
    // clears when the door opens: unlock (fades over about a second) and open (at once)
    const clears = await ev(() => {
      const [map, x, y, dir] = ['mausoleum', 19.5, 19.2, -Math.PI / 2]; __go(map, x, y, dir);
      const S = PROPS14.SEALS.find((s) => s.map === 'mausoleum'), m = G.maps.mausoleum, c = m.cells[S.y * m.w + S.x], key = S.y * m.w + S.x, out = {};
      for (const s of PROPS14.seals.values()) s.amt = 0;
      let t = 5; const step = (n, dt) => { for (let i = 0; i < n; i++) { t += dt; Engine.setTime(t); Engine.render(G.ents, G.tod); } };
      step(30, 0.1); const st = PROPS14.sealState(m, S); out.sealedAmt = st.amt;
      GFX.p14pShimmer = false; const off = __hash(__frame()); GFX.p14pShimmer = true;
      G.flags[c.locked] = true;                                  // the bells have been rung
      step(2, 0.1); out.fading = st.amt; step(25, 0.1); out.cleared = st.amt; { const p0 = PROPS14.stats.shimmerPx; step(1, 0.1); out.sameAsOff = PROPS14.stats.shimmerPx === p0; }
      delete G.flags[c.locked]; step(30, 0.1); out.back = st.amt;
      m.doors[key].open = 0.3; step(1, 0.05); out.openAmt = st.amt; m.doors[key].open = 0;
      G.flags[c.locked] = true; step(40, 0.1);
      return out;
    });
    ok(clears.sealedAmt === 1 && clears.fading < 1 && clears.fading > 0 && clears.cleared === 0 && clears.sameAsOff, 'it clears when the door is unlocked: fading (' + clears.fading.toFixed(2) + ') then gone, no membrane pixels painted');
    ok(clears.back === 1 && clears.openAmt === 0, 'it returns if the seal does, and is gone the moment the leaf moves');
    // No flashes: still; Reduce motion: slow
    const motion = await ev(() => {
      __go('mausoleum', 19.5, 19.2, -Math.PI / 2); for (const s of PROPS14.seals.values()) s.amt = 1; const S = PROPS14.SEALS.find((s) => s.map === 'mausoleum'); delete G.flags[G.maps.mausoleum.cells[S.y * G.maps.mausoleum.w + S.x].locked];
      const at = (t) => { Engine.setTime(t); PARTICLES.list.length = 0; Engine.render(G.ents, G.tod); const f = Engine.ctx.getImageData(0, 0, Engine.canvas.width, Math.floor(Engine.canvas.height * 0.75)); return f; };
      for (const s of PROPS14.seals.values()) s.amt = 1;
      const norm = (() => { GFX.noFlash = false; GFX.reduceMotion = false; at(10); const a = at(10.4); return __diff(at(10), a).n; })();
      const reduced = (() => { GFX.reduceMotion = true; const a = at(10); const b = at(10.4); return __diff(a, b).n; })();
      const still = (() => {
        GFX.reduceMotion = false; GFX.noFlash = true;
        const delta = (t) => { GFX.p14pShimmer = false; const a = at(t); GFX.p14pShimmer = true; const b = at(t); const o = new Int16Array(a.data.length); for (let i = 0; i < o.length; i++) o[i] = b.data[i] - a.data[i]; return o; };
        const d1 = delta(10), d2 = delta(31.7); let live = 0, bad = 0; for (let i = 0; i < d1.length; i++) { if (d1[i] || d2[i]) live++; if (Math.abs(d1[i] - d2[i]) > 2) bad++; }
        return live > 100 ? (bad <= live * 0.01 ? 0 : bad) : -1;
      })();
      GFX.noFlash = false; GFX.reduceMotion = false;
      return { norm, reduced, still };
    });
    ok(motion.norm > 100 && motion.reduced < motion.norm && motion.reduced > 0, 'Reduce motion runs the ripple slower (changed pixels over 0.4 s: ' + motion.norm + ' normal, ' + motion.reduced + ' reduced)');
    ok(motion.still === 0, 'No flashes: a static tint (the membrane\'s own pixels differ in ' + motion.still + ' places between t=10 and t=31.7; -1 means it drew nothing)');
        await ev(() => { __go('catacombs', 23.5, 1.5, 0); __reseal(); for (const s of PROPS14.seals.values()) s.amt = 1; for (let i = 0; i < 5; i++) { Engine.setTime(8 + i * 0.1); Engine.render(G.ents, G.tod); } });
    await snapTo(pg, 'shimmer-glass');
    await ev(() => { __go('mausoleum', 19.5, 19.2, -Math.PI / 2); __reseal(); for (let i = 0; i < 5; i++) { Engine.setTime(8 + i * 0.1); Engine.render(G.ents, G.tod); } });
    await snapTo(pg, 'shimmer-song');
    await ev(() => { __go('whispergrove', 29.5, 5.5, 0); __reseal(); for (let i = 0; i < 5; i++) { Engine.setTime(8 + i * 0.1); Engine.render(G.ents, G.tod); } });
    await snapTo(pg, 'shimmer-synod');
    await ev(() => { __go('greenroot', 30.5, 10.5, -Math.PI / 2); __reseal(); for (let i = 0; i < 5; i++) { Engine.setTime(8 + i * 0.1); Engine.render(G.ents, G.tod); } });
    await snapTo(pg, 'shimmer-hush');
    // its cost
    const sc = await ev(() => {
      __go('mausoleum', 19.5, 17.4, -Math.PI / 2); for (const s of PROPS14.seals.values()) s.amt = 1;
      const s0 = PROPS14.stats.shimmerMs, f0 = PROPS14.stats.shimmerFrames; for (let i = 0; i < 80; i++) { Engine.setTime(5 + i * 0.03); Engine.render(G.ents, G.tod); }
      return (PROPS14.stats.shimmerMs - s0) / Math.max(1, PROPS14.stats.shimmerFrames - f0);
    });
    console.log('INFO perf: shimmer hook ' + sc.toFixed(3) + ' ms per frame with a sealed door close in view');
    ok(sc < 2.5, 'shimmer cost ' + sc.toFixed(3) + ' ms (< 2.5 ms, door at arm length on a shared box)');

    // ================================================================ 3. BREAKABLES
    const bk = await ev(() => {
      const m = G.maps.oakhaven, scn = m._scn.filter((e) => e._scn === 'barrel' || e._scn === 'crate');
      // every deco with a use, anywhere, and every crate-like thing a story map placed
      let story = 0, storyBreakable = 0;
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'deco' && !e._scn && (e.use || /crate|coat|children/i.test(e.label || ''))) { story++; if (PROPS14.isBreakable(e)) storyBreakable++; }
      G.map === m || loadMap('oakhaven', { x: 24.5, y: 24.5, dir: 0 });
      const hetty = G.maps.tavern ? G.maps.tavern.entities.filter((e) => e.use === 'crates') : [];
      const cellar = Object.values(G.maps).flatMap((mm) => mm.entities.filter((e) => e.use === 'crates' || e.use === 'twins'));
      return { n: scn.length, barrels: scn.filter((e) => e._scn === 'barrel').length, crates: scn.filter((e) => e._scn === 'crate').length, story, storyBreakable, cellar: cellar.length, cellarBreakable: cellar.filter((e) => PROPS14.isBreakable(e)).length, hetty: hetty.length };
    });
    ok(bk.barrels >= 10 && bk.crates >= 8, 'oakhaven carries scenery barrels and crates to break (' + bk.barrels + ' barrels, ' + bk.crates + ' crates)');
    ok(bk.story >= 8 && bk.storyBreakable === 0 && bk.cellar >= 1 && bk.cellarBreakable === 0, 'story props are never breakable: ' + bk.story + ' decos with a use or a story label, ' + bk.cellar + ' crates with something in them (the Hetty cellar crates, the two small coats): 0 breakable');
    // set up one prop in a clear place and swing at it
    const setup = () => (async () => {
      await ev(() => { G.player.weapons = ['sword']; G.player.weapon = 0; G.player.hp = G.player.hpMax; });
    })();
    await setup();
    const swing = (spec) => ev((spec) => {
      const map = G.map;
      const mkProp = (kind, x, y) => { const e = { kind: 'deco', sprite: kind === 'crate' ? 'p_crate' : 'p_barrel', x, y, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: kind, label: 'test ' + kind }; map._scn.push(e); map.entities.push(e); return e; };
      const e = mkProp(spec.kind, spec.x, spec.y); const c = Engine.cam; c.x = spec.x + 1.0; c.y = spec.y; c.dir = Math.PI; G.attack.t = 0;
      G.player.weapons = [spec.weapon]; G.player.weapon = 0; G.noise = 1;
      const n0 = G.noise, hits = []; let gold0 = G.player.gold;
      for (let i = 0; i < 6; i++) { G.attack.t = 0; attack('slash'); hits.push(!G.map.entities.includes(e)); if (!G.map.entities.includes(e)) break; }
      return { hits, noise: G.noise - n0, gone: !G.map.entities.includes(e), inScn: map._scn.includes(e), deb: G.map.entities.filter((o) => o._p14d).length, gold: G.player.gold - gold0 };
    }, spec);
    await ev(() => __go('clearing', 12.5, 11.5, Math.PI));
    const sw1 = await swing({ kind: 'barrel', x: 11.5, y: 11.5, weapon: 'sword' });
    ok(sw1.gone && sw1.hits.length === 1 && !sw1.inScn && sw1.deb >= 5 && sw1.noise > 1, 'one sword blow smashes a barrel into pieces and a heap, and makes noise (+' + sw1.noise.toFixed(1) + ')');
    const sw2 = await swing({ kind: 'barrel', x: 13.5, y: 15.5, weapon: 'hands' });
    ok(sw2.hits.length === 2 && sw2.gone, 'bare hands need two blows on a barrel (three on a crate) (' + sw2.hits.join() + ')');
    const sw3 = await swing({ kind: 'crate', x: 14.5, y: 11.5, weapon: 'mace' });
    ok(sw3.gone && sw3.hits.length === 1, 'a mace breaks a crate in one blow');
    const sw4 = await swing({ kind: 'crate', x: 15.5, y: 12.5, weapon: 'pistol' });
    ok(!sw4.gone, 'a ranged weapon does not smash (the pistol never touched it)');
    const hp = await ev(() => { const w = WEAPONS, p = G.player; return ['hands', 'knife', 'sword', 'axe', 'mace'].map((k) => k + ':' + PROPS14.hitsNeeded({ _scn: 'barrel' }, w[k], p) + '/' + PROPS14.hitsNeeded({ _scn: 'crate' }, w[k], p)).join(' '); });
    console.log('INFO blows to break (barrel/crate): ' + hp);
    // not path blocking
    const free = await ev(() => {
      const map = G.map; const e = { kind: 'deco', sprite: 'p_barrel', x: 9.5, y: 11.5, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'barrel' }; map._scn.push(e); map.entities.push(e);
      const blockedBefore = solidAt(9.5, 11.5); const c = Engine.cam; c.x = 10.5; c.y = 11.5; c.dir = Math.PI; G.player.weapons = ['axe']; G.player.weapon = 0; G.attack.t = 0; attack('chop');
      const solidAfter = [[9.5, 11.5], [9.3, 11.5], [9.7, 11.5], [9.5, 11.3], [9.5, 11.7]].map(([x, y]) => solidAt(x, y));
      const pieces = map.entities.filter((o) => o._p14d);
      return { blockedBefore, solidAfter, anySolid: pieces.some((o) => o.solid), n: pieces.length };
    });
    ok(free.blockedBefore === true && free.solidAfter.every((s) => !s) && !free.anySolid && free.n >= 5, 'afterwards nothing solid is left where it stood: the prop is gone and no piece or heap collides (' + free.n + ' pieces)');
    // pieces fall and settle
    const fall = await ev(() => {
      const map = G.map; const e = { kind: 'deco', sprite: 'p_crate', x: 16.5, y: 15.5, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'crate' }; map._scn.push(e); map.entities.push(e);
      const c = Engine.cam; c.x = 17.6; c.y = 15.5; c.dir = Math.PI; G.player.weapons = ['mace']; G.player.weapon = 0; G.attack.t = 0; attack('chop');
      const moving = PROPS14.debris.length, air0 = map.entities.filter((o) => o._p14d && o.yOff < -0.05).length;
      for (let i = 0; i < 90; i++) PROPS14.tickDebris(1 / 30);
      const air1 = map.entities.filter((o) => o._p14d && o.yOff < -0.05).length, still = PROPS14.debris.length;
      return { moving, air0, air1, still };
    });
    ok(fall.moving >= 5 && fall.air0 >= 4 && fall.air1 === 0 && fall.still === 0, 'the pieces start in the air and are all settled after three seconds (' + fall.air0 + ' airborne -> ' + fall.air1 + ')');
    // loot: deterministic, small, never a quest item
    const loot = await ev(() => {
      const mk = (x, y, kind) => ({ kind: 'deco', x, y, _scn: kind });
      const out = { rows: [], ids: new Set() };
      Math.random = () => 0.123;
      let a = [], b = [];
      for (let i = 0; i < 400; i++) { const e = mk(3 + (i % 20) * 1.37, 5 + Math.floor(i / 20) * 1.61, i % 2 ? 'crate' : 'barrel'); const l = PROPS14.lootFor('oakhaven', e); a.push(l ? l.id + ':' + l.n : '-'); }
      Math.random = () => 0.987;
      for (let i = 0; i < 400; i++) { const e = mk(3 + (i % 20) * 1.37, 5 + Math.floor(i / 20) * 1.61, i % 2 ? 'crate' : 'barrel'); const l = PROPS14.lootFor('oakhaven', e); b.push(l ? l.id + ':' + l.n : '-'); }
      const some = a.filter((x) => x !== '-'), ids = [...new Set(some.map((x) => x.split(':')[0]))];
      const crateIds = new Set(), barrelIds = new Set();
      for (let i = 0; i < 400; i++) { const k = i % 2 ? 'crate' : 'barrel', e = mk(3 + (i % 20) * 1.37, 5 + Math.floor(i / 20) * 1.61, k), l = PROPS14.lootFor('oakhaven', e); if (l) (k === 'crate' ? crateIds : barrelIds).add(l.id); }
      const allowed = new Set([...PROPS14.LOOT.barrel.map((r) => r[0]), ...PROPS14.LOOT.crate.map((r) => r[0])]);
      return { same: a.join() === b.join(), frac: some.length / 400, ids, quest: ids.some((i) => ITEMS[i].key || /^(oil|key|p13|p9|p12)/.test(i)), allowed: ids.every((i) => allowed.has(i)), inTables: ids.every((i) => !!ITEMS[i]), gold: some.filter((x) => x.startsWith('sovereigns')).map((x) => +x.split(':')[1]), crateIds: [...crateIds], barrelIds: [...barrelIds], other: PROPS14.lootFor('tavern', mk(3, 5, 'crate')) + '' };
    });
    ok(loot.same && loot.frac > 0.15 && loot.frac < 0.55, 'loot is a pure function of map and position (identical with two different Math.random streams), found in ' + (loot.frac * 100).toFixed(0) + '% of props');
    ok(!loot.quest && loot.allowed && loot.inTables && Math.max(...loot.gold) <= 9 && Math.min(...loot.gold) >= 3, 'only small common things from the game\'s own tables, no quest items (' + loot.ids.join(',') + '; gold ' + Math.min(...loot.gold) + '-' + Math.max(...loot.gold) + ')');
    console.log('INFO loot table: barrel ' + JSON.stringify(loot.barrelIds) + ' crate ' + JSON.stringify(loot.crateIds));
    // a real smash hands over exactly what lootFor says
    const real = await ev(() => {
      __go('clearing', 12.5, 11.5, Math.PI); G.player.weapons = ['axe']; G.player.weapon = 0;
      for (let k = 0; k < 40; k++) {
        const e = { kind: 'deco', sprite: 'p_crate', x: 5.5 + (k % 8) * 1.2, y: 6.5 + Math.floor(k / 8), scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'crate' };
        const want = PROPS14.lootFor('clearing', e); if (!want || want.id !== 'tonic') continue;
        G.map._scn.push(e); G.map.entities.push(e); const c = Engine.cam; c.x = e.x + 1; c.y = e.y; c.dir = Math.PI; const n0 = G.count('tonic'); G.attack.t = 0; attack('chop');
        return { want, got: G.count('tonic') - n0 };
      }
      return null;
    });
    ok(real && real.got === 1, 'a smash gives exactly what the seeded stream said (' + JSON.stringify(real) + ')');
    // crime in town
    const crime = await ev(() => {
      const out = {}; const law = crimeState();
      const mkc = (kind, x, y) => { const e = { kind: 'deco', sprite: kind === 'crate' ? 'p_crate' : 'p_barrel', x, y, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: kind }; G.map._scn.push(e); G.map.entities.push(e); return e; };
      const hit = (e) => { const c = Engine.cam; c.x = e.x + 1; c.y = e.y; c.dir = Math.PI; G.attack.t = 0; G.player.weapons = ['axe']; G.player.weapon = 0; attack('chop'); };
      __go('oakhaven', 30.5, 10.5, Math.PI);
      const npcs = G.ents.filter((e) => e.kind === 'npc'); const hidden = npcs.map((e) => e.hidden); npcs.forEach((e) => { e.hidden = true; });
      law.bounty = 0; law.thefts = 0;
      const c1 = mkc('crate', 31.5, 10.5); const lootBefore = G.player.gold; hit(c1); out.unseen = { bounty: law.bounty, thefts: law.thefts, gone: !G.map.entities.includes(c1) };
      // a constable in view
      npcs.forEach((e, i) => { e.hidden = hidden[i]; });
      const guard = npcs.find((e) => e.lawGuard) || npcs[0]; npcs.forEach((e) => { if (e !== guard) e.hidden = true; });
      const gx = 36.5, gy = 10.5; guard.x = gx; guard.y = gy; guard.facing = 0; guard.hidden = false; guard.dead = false;
      const c2 = mkc('crate', 31.5, 10.5); out.witness = typeof theftWitness === 'function' && !!theftWitness(null); hit(c2);
      out.seen = { bounty: law.bounty, thefts: law.thefts, gone: !G.map.entities.includes(c2), guardLaw: !!guard.lawGuard };
      // a barrel in view of the same constable: no crime
      const b0 = law.bounty; const bb = mkc('barrel', 31.5, 10.5); hit(bb); out.barrel = { delta: law.bounty - b0, gone: !G.map.entities.includes(bb) };
      // a crate outside the town's law
      __go('clearing', 12.5, 11.5, Math.PI); const b1 = law.bounty; const cc = mkc('crate', 11.5, 11.5); hit(cc); out.wild = { delta: law.bounty - b1, gone: !G.map.entities.includes(cc) };
      npcs.forEach((e, i) => { e.hidden = hidden[i]; });
      return out;
    });
    ok(crime.unseen.gone && crime.unseen.bounty === 0, 'smashing an owned crate with nobody watching: no crime');
    ok(crime.witness && crime.seen.gone && crime.seen.bounty === PROPS14_FINE(20) && crime.seen.thefts === 1, 'in view of a constable it is a crime like theft: +20 bounty and one theft on the record (' + JSON.stringify(crime.seen) + ')');
    ok(crime.barrel.gone && crime.barrel.delta === 0 && crime.wild.gone && crime.wild.delta === 0, 'barrels are not owned, and outside the town\'s law nothing is recorded');
    // per visit: gone when you come back, nothing saved
    const visit = await ev(() => {
      __go('oakhaven', 30.5, 10.5, Math.PI);
      const e = { kind: 'deco', sprite: 'p_barrel', x: 31.5, y: 10.5, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'barrel' }; G.map._scn.push(e); G.map.entities.push(e);
      const c = Engine.cam; c.x = 32.5; c.y = 10.5; c.dir = Math.PI; G.player.weapons = ['axe']; G.player.weapon = 0; G.attack.t = 0; attack('chop');
      const there = G.map.entities.some((o) => o._p14d);
      loadMap('tavern', { x: 8.5, y: 9.5, dir: -Math.PI / 2 }); loadMap('oakhaven', { x: 30.5, y: 10.5, dir: Math.PI });
      const snap = JSON.stringify(snapshotGame ? snapshotGame() : {});
      return { there, back: G.map.entities.includes(e) || G.map._scn.includes(e), debrisAfter: G.map.entities.filter((o) => o._p14d).length, flags: Object.keys(G.flags).filter((k) => k.startsWith('p14p_')), inSave: /p14p|_p14/.test(snap) };
    });
    ok(visit.there && !visit.back && visit.debrisAfter === 0 && visit.flags.length === 0 && !visit.inSave, 'per visit: the prop stays gone on coming back, the loose pieces are swept away, and nothing at all is saved (no p14p_ flag)');
    // switch off: a swing does nothing
    const offb = await ev(() => {
      __go('clearing', 12.5, 11.5, Math.PI); GFX.p14pBreak = false; const e = { kind: 'deco', sprite: 'p_barrel', x: 11.5, y: 11.5, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'barrel' }; G.map._scn.push(e); G.map.entities.push(e);
      const c = Engine.cam; c.x = 12.5; c.y = 11.5; c.dir = Math.PI; G.player.weapons = ['axe']; G.player.weapon = 0; G.attack.t = 0; attack('chop'); const stays = G.map.entities.includes(e); GFX.p14pBreak = true; return stays;
    });
    ok(offb, 'with Breakables off a blow leaves the barrel alone');
    // enemy in the way: the blow is the enemy's
    const foe = await ev(() => {
      __go('clearing', 12.5, 11.5, Math.PI); const e = { kind: 'deco', sprite: 'p_barrel', x: 11.0, y: 11.5, scale: 0.5, radius: 0.3, solid: true, transient: true, nopick: true, _scn: 'barrel' }; G.map._scn.push(e); G.map.entities.push(e);
      const f = hydrate({ kind: 'enemy', type: 'proctor', x: 11.6, y: 11.5 }); f.state = 'passive'; f.hidden = false; G.ents.push(f);
      const c = Engine.cam; c.x = 12.5; c.y = 11.5; c.dir = Math.PI; G.player.weapons = ['axe']; G.player.weapon = 0; G.attack.t = 0; attack('chop'); const kept = G.map.entities.includes(e); G.ents.splice(G.ents.indexOf(f), 1); return kept;
    });
    ok(foe, 'a foe standing in front takes the blow, the barrel behind him is not smashed');

    // ================================================================ 4. everything off = the original frames
    ok(hOff.join() === hBlocked.join(), 'all three switches off: frames are identical to a page with js/props14.js blocked (' + hOff.map((h, i) => scenes[i][0] + (h === hBlocked[i] ? '=' : '!=')).join(' ') + ')');
    ok(await B.page.evaluate(() => typeof PROPS14 === 'undefined'), 'the blocked page really has no module');
    // switch on, same scenes: the mirror scenes differ and the others do not
    const hOn = await pg.evaluate((scenes) => {
      const out = [];
      for (const [m, x, y, d] of scenes) {
        __go(m, x, y, d); G.player.armor = {}; G.ents.forEach((e) => { if (e.kind === 'npc' || e.kind === 'enemy') e.hidden = true; });
        const shot = (on) => { GFX.p14pMirrors = GFX.p14pShimmer = GFX.p14pBreak = on; for (const s of PROPS14.seals.values()) s.amt = 1; for (let i = 0; i < 12; i++) { Engine.setTime(5 + i * 0.1); Engine.render(G.ents, G.tod); } return __hash(__frame()); };
        const a = shot(false), b = shot(true); out.push(a === b ? 'same' : 'differs');
      }
      return out;
    }, scenes);
    ok(hOn.slice(0, 5).every((v) => v === 'differs') && hOn[5] === 'same', 'switched on, the mirror and sealed-door scenes change and an ordinary room does not (' + hOn.map((h, i) => scenes[i][0] + ':' + h).join(' ') + ')');
    await B.page.close();

    // ================================================================ 5. Options, 640x400
    const opts = await ev(() => {
      GFX.p14pMirrors = GFX.p14pShimmer = GFX.p14pBreak = true; PROPS14.set.mirrors = PROPS14.set.shimmer = PROPS14.set.breaks = true;
      G.state = 'panel'; renderAccessibilityMenu();
      const out = { head: !!document.getElementById('p14p-head'), btns: ['mirrors', 'shimmer', 'breaks'].map((k) => { const b = document.getElementById('p14p-' + k); return b ? b.textContent + ':' + b.getAttribute('aria-pressed') : null; }) };
      document.getElementById('p14p-mirrors').click(); out.off = GFX.p14pMirrors === false && PROPS14.set.mirrors === false; out.stored = JSON.parse(localStorage.getItem('octave.props14.v1'));
      document.getElementById('p14p-mirrors').click(); out.on = GFX.p14pMirrors === true;
      closeModal(); G.state = 'play'; return out;
    });
    ok(opts.head && opts.btns.join() === 'On:true,On:true,On:true' && opts.off && opts.on && opts.stored && opts.stored.mirrors === false, 'Options > Graphics & access: three switches, default On, each drives its GFX flag and persists (' + opts.btns + ')');
    await pg.setViewportSize({ width: 640, height: 400 }); await pg.waitForTimeout(250);
    const compact = await ev(() => {
      G.state = 'panel'; renderAccessibilityMenu(); const q = document.getElementById('modal-panel'); const o = { sw: q.scrollWidth, cw: q.clientWidth };
      const rowOk = ['p14p-mirrors', 'p14p-shimmer', 'p14p-breaks'].every((id) => { const b = document.getElementById(id); if (!b) return false; const r = b.getBoundingClientRect(), pr = q.getBoundingClientRect(); return r.right <= pr.right + 1 && r.left >= pr.left - 1; });
      closeModal(); G.state = 'play'; return { o, rowOk };
    });
    ok(compact.o.sw <= compact.o.cw + 1 && compact.rowOk, 'Options rows at 640x400: no horizontal overflow (' + JSON.stringify(compact.o) + ')');
    const c640 = await ev(() => { __go('lyra_house', 7.5, 3.2, -Math.PI / 2); const f = __frame(); GFX.p14pMirrors = false; const g = __frame(); GFX.p14pMirrors = true; return { n: __diff(f, g).n, w: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    ok(c640.n > 100 && c640.w, 'at 640x400 the mirror draws and the page does not scroll sideways');
    await snapTo(pg, 'compact-mirror');
    await pg.setViewportSize({ width: 1280, height: 800 }); await pg.waitForTimeout(150);

    // ================================================================ 6. render scale 2
    const s2 = await ev(() => { PRESETS.apply('high'); GFX.p14pMirrors = true; __go('lyra_house', 7.5, 3.2, -Math.PI / 2); const f = __frame(); GFX.p14pMirrors = false; const g = __frame(); const n = __diff(f, g).n; GFX.p14pMirrors = true; const w = Engine.canvas.width; PRESETS.apply('medium'); GFX.p14pMirrors = GFX.p14pShimmer = GFX.p14pBreak = true; return { n, w }; });
    ok(s2.w === 640 && s2.n > 800, 'render scale 2 (640 px wide): the mirror draws at the finer scale (' + s2.n + ' pixels)');

    // ================================================================ 7. hostile saves and errors
    const hostile = await ev(() => {
      try { localStorage.setItem('octave.props14.v1', '{"mirrors":"yes","shimmer":5,"breaks":null}'); } catch (e) { /* ignore */ }
      G.flags.p14p_x = '<img src=x onerror=1>'; G.flags.p14p_bits = 1e12;
      __go('lyra_house', 7.5, 3.2, -Math.PI / 2); __frame();
      return { errs: PROPS14.stats.errors };
    });
    ok(hostile.errs === 0, 'junk in storage and in p14p_ flags changes nothing and raises no error (the module reads neither)');
    ok(A.errors.length === 0, 'no page errors on the main page: ' + A.errors.slice(0, 3).join(' | '));
    ok(await ev(() => PROPS14.stats.errors === 0), 'PROPS14.stats.errors is 0 after the whole run');
  } catch (e) {
    console.log('FAIL exception: ' + (e && e.stack || e)); fails++;
  } finally {
    await browser.close();
  }
  console.log(fails ? ('\n' + fails + ' FAILED') : '\nall props14 checks passed');
  process.exit(fails ? 1 : 0);
})();
function PROPS14_FINE(n) { return n; }
