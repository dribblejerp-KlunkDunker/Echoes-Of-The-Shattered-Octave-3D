// PREVIEW_URL=http://127.0.0.1:3851 PLAYWRIGHT_MODULE=/path/to/playwright node test/hud11.test.js
// Phase 11 HUD11: hit-direction marker, enemy health bars, damage numbers, organ pipes, stillness tint.
// Optional SHOTS=<dir> writes review screenshots.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3851');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof HUD11 === 'object');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hud Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      localStorage.removeItem('echoes-hud11');
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      window.__stage = (x, y, dir) => { loadMap('clearing', { x: x == null ? 12.5 : x, y: y == null ? 11.5 : y, dir: dir == null ? -Math.PI / 2 : dir }); G.state = 'play'; G.fadeT = 0; Engine.setWeather({}); PARTICLES.list.length = 0; G.keys = {}; G.vel.x = G.vel.y = 0; for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy') G.ents.splice(i, 1); G.dead = false; G.player.hp = G.player.hpMax; G.noise = 2; G.attack.t = 0; G.song.t = 0; G.songFx = 0; G.hurtT = 0; G.murmurT = 0; G.whistleT = 0; G.webT = 0; G.player.fat = G.player.fatMax; UPG.blocking = false; UPG.parryCool = 0; UPG.parryWindow = 0; };
      window.__mk = (type, x, y, st) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = st || 'idle'; e._tgSeen = true; G.ents.push(e); return e; };
      window.__seed = (n) => { let s = n || 777; window.__rngCalls = 0; Math.random = () => { window.__rngCalls++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
      window.__flags = (on) => { for (const k of HUD11.FLAGS) GFX[k] = !!on; HUD11.reset(); };
      window.__px = () => Engine.ctx.getImageData(0, 0, 320 * Engine.getScale(), 200 * Engine.getScale());
      // the pixels a call to fn() changes, as a box and centroid in logical coordinates
      window.__delta = (fn) => {
        const S = Engine.getScale(), a = __px(); fn(); const b = __px(); const W = 320 * S, H = 200 * S;
        let n = 0, sx = 0, sy = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4;
          if (Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]) > 24) { n++; const lx = x / S, ly = y / S; sx += lx; sy += ly; if (lx < x0) x0 = lx; if (lx > x1) x1 = lx; if (ly < y0) y0 = ly; if (ly > y1) y1 = ly; }
        }
        return { n, cx: n ? sx / n : -1, cy: n ? sy / n : -1, box: [x0, y0, x1, y1] };
      };
    });
    await page.evaluate(() => { window.__raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    const snap = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };

    // ---- 1. off by default: no draw calls, no DOM, same frame as the raw renderer
    const off = await page.evaluate(() => {
      __stage(); __flags(false);
      const e = __mk('proctor', 12.5, 9.5);
      let calls = 0; const proto = CanvasRenderingContext2D.prototype, names = ['fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText', 'stroke', 'fill', 'ellipse', 'arc'], orig = {};
      for (const n of names) { orig[n] = proto[n]; proto[n] = function () { calls++; return orig[n].apply(this, arguments); }; }
      const count = (fn) => { calls = 0; fn(); return calls; };
      render(); let wrapped = 0, raw = 0;
      for (let i = 0; i < 6; i++) { __seed(31 + i); wrapped += count(() => render()); __seed(31 + i); raw += count(() => HUD11.raw.render()); }
      for (const n of names) proto[n] = orig[n];
      const d = { flags: HUD11.FLAGS.map(k => GFX[k]), wrapped, raw, drawn: HUD11.stats.drawn + HUD11.stats.frames, ids: document.querySelectorAll('[id^=h11-]').length, key: localStorage.getItem('echoes-hud11') };
      G.ents.splice(G.ents.indexOf(e), 1); return d;
    });
    ok(off.flags.every(v => v === false), 'all five switches default to off');
    ok(off.drawn === 0 && off.ids === 0 && off.key === null, 'all off: HUD11.draw never ran over 20 frames (' + off.wrapped + ' canvas calls per 6 frames, all the game\'s own), no DOM, nothing stored');

    // ---- 2. a seeded fight: identical combat traces with everything on and everything off
    const trace = await page.evaluate(() => {
      const base = JSON.stringify(G.player);
      const run = (on) => {
        // the ambient bird/rat timer (js/upgrades.js UPG._ambT) runs on from run to run and from the live loop before the freeze:
        // left alone it fires at a different step in each run (one Math.random call or ~3000 for a rat) and the traces differ by chance
        UPG._ambT = 4;
        Object.assign(G.player, JSON.parse(base)); __seed(4242); __stage(); G.player.hp = G.player.hpMax; G.noise = 2; __flags(on);
        const es = [__mk('proctor', 12.5, 10.3, 'chase'), __mk('hound', 13.4, 10.0, 'chase'), __mk('proctor', 11.3, 10.6, 'chase')];
        G.player.weapon = G.player.weapons.indexOf('sword') >= 0 ? G.player.weapons.indexOf('sword') : G.player.weapon;
        const tr = [];
        for (let i = 0; i < 360; i++) {
          __seed(9000 + i);                         // every step starts from its own seed, so the baseline is repeatable
          update(1 / 60);
          if (i % 24 === 0) attack('swing');
          if (i % 3 === 0) render();
          if (i % 12 === 0) tr.push([Math.round(G.player.hp * 100), ...es.map(e => Math.round(e.hp * 100) + ':' + e.state + ':' + e.x.toFixed(3) + ',' + e.y.toFixed(3)), G.noise.toFixed(4)].join('|'));
        }
        const out = tr.join('\n'); for (const e of es) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
        return { out, calls: window.__rngCalls, hp: G.player.hp, marks: HUD11.stats.marks, nums: HUD11.stats.nums, bars: HUD11.stats.bars };
      };
      run(false); const a = run(false), b = run(true), c = run(false);
      // the module itself must never draw on the game's random generator
      __flags(true); __stage(); const ee = __mk('proctor', 12.5, 9.5); HUD11.raw.render(); __seed(5); const r0 = window.__rngCalls;
      HUD11.addHit(15, 11); HUD11.addNumber('hit', 3, ee); HUD11.addNumber('taken', 2, null); HUD11.stillSeconds = 20; HUD11.draw(); HUD11.draw();
      const own = window.__rngCalls - r0; G.ents.splice(G.ents.indexOf(ee), 1); __flags(false);
      return { dump: a.out === b.out ? '' : [a.out.split('\n')[0], b.out.split('\n')[0], a.out.split('\n').find((l, i) => l !== b.out.split('\n')[i]), b.out.split('\n').find((l, i) => l !== a.out.split('\n')[i]), a.out === c.out].join('\n'), same: a.out === b.out && a.out === c.out, lines: a.out.split('\n').length, aHp: a.hp, own, onDrew: [b.marks, b.nums, b.bars], firstDiff: a.out === b.out ? -1 : a.out.split('\n').findIndex((l, i) => l !== b.out.split('\n')[i]) };
    });
    if (!trace.same) console.log(trace.dump);
    ok(trace.same && trace.lines >= 20, 'seeded fight: damage, enemy HP, state, positions, noise and RNG calls identical with all five on and off (' + trace.lines + ' samples)');
    ok(trace.own === 0, 'the module makes no Math.random calls of its own (' + trace.own + ')');
    ok( trace.onDrew[0] > 0 && trace.onDrew[1] > 0, 'the on-run really drew markers (' + trace.onDrew[0] + ') and numbers (' + trace.onDrew[1] + '), bars ' + trace.onDrew[2]);

    // ---- 3. hit marker direction: left / right / behind / ahead, through the real damage path
    const dirs = await page.evaluate(() => {
      const out = {};
      for (const [name, dx, dy] of [['right', 1, 0], ['left', -1, 0], ['behind', 0, 1], ['ahead', 0, -1]]) {
        __seed(5); __stage(); __flags(false); GFX.hitMarker = true; G.player.hp = G.player.hpMax; UPG.blocking = false; UPG.parryCool = 0; UPG.parryWindow = 0;
        const e = __mk('proctor', 12.5 + dx * 0.9, 11.5 + dy * 0.9, 'chase'); e.cool = 0; e.alertT = 8;
        Math.random = () => 0.99;                                  // never dodges
        enemyUpdate(e, 0.016);
        const m = HUD11.marks[0]; if (!m) { out[name] = null; G.ents.splice(G.ents.indexOf(e), 1); continue; }
        const th = HUD11.bearing(Engine.cam, m.x, m.y);
        render();                                                  // a clean frame, then only our drawing
        const d = __delta(() => HUD11.draw());
        out[name] = { th, d, hurt: G.player.hp < G.player.hpMax, n: HUD11.marks.length };
        G.ents.splice(G.ents.indexOf(e), 1);
      }
      return out;
    });
    const R = dirs.right, L = dirs.left, B = dirs.behind, A = dirs.ahead;
    ok(R && L && B && A && R.hurt, 'a foe that hits you leaves one marker for the hit');
    ok(R && R.th > 1.3 && R.th < 1.8 && R.d.cx > 240, 'source on the right: bearing +90deg, ink on the right (cx ' + (R && R.d.cx.toFixed(0)) + ')');
    ok(L && L.th < -1.3 && L.th > -1.8 && L.d.cx < 80, 'source on the left: bearing -90deg, ink on the left (cx ' + (L && L.d.cx.toFixed(0)) + ')');
    ok(B && Math.abs(B.th) > 2.9 && B.d.cy > 110 && Math.abs(B.d.cx - 160) < 25, 'source behind: bearing 180deg, ink at the bottom edge, centred (cy ' + (B && B.d.cy.toFixed(0)) + ')');
    ok(A && Math.abs(A.th) < 0.15 && A.d.cy < 40 && Math.abs(A.d.cx - 160) < 25, 'source ahead: ink at the top edge, centred');

    // turning moves the arc; fades by ~1 s; cap of 4; flurry from one source merges; trap and bolt sources
    const mm = await page.evaluate(() => {
      __stage(); __flags(false); GFX.hitMarker = true;
      const o = {};
      HUD11.addHit(12.5 + 4, 11.5); render(); HUD11.clock; // a source to the right
      const th0 = HUD11.bearing(Engine.cam, 16.5, 11.5); Engine.cam.dir += Math.PI / 2; const th1 = HUD11.bearing(Engine.cam, 16.5, 11.5); Engine.cam.dir -= Math.PI / 2;
      o.turn = [th0, th1];
      HUD11.marks.length = 0;
      for (let i = 0; i < 7; i++) HUD11.addHit(12.5 + i, 3.5);
      o.cap = HUD11.marks.length;
      HUD11.marks.length = 0; const src = {}; HUD11.addHit(15, 11, src); HUD11.addHit(15, 11, src); o.merge = HUD11.marks.length;
      HUD11.marks.length = 0; HUD11.addHit(15, 11); const t0 = HUD11.clock; HUD11.clock = t0 + 0.5; render(); const mid = HUD11.marks.length; HUD11.clock = t0 + 1.05; render(); o.fade = [mid, HUD11.marks.length];
      // a trap is a source too
      __flags(false); GFX.hitMarker = true; HUD11.marks.length = 0;
      const trap = { kind: 'trap', trapType: 'tripwire', trapId: 'h11t', x: 12.5 - 2, y: 11.5, hidden: false, dead: false };
      delete G.flags['trap:' + G.mapId + ':h11t']; triggerTrap(trap); o.trap = HUD11.marks.length && Math.round(HUD11.bearing(Engine.cam, HUD11.marks[0].x, HUD11.marks[0].y) * 100) / 100;
      HUD11.marks.length = 0;
      // fall damage and other sourceless harm make no marker
      damagePlayer(2, 'Something'); o.noSrc = HUD11.marks.length;
      // a crossbow bolt (from enemyUpdate -> wildsExtra) has a source
      __seed(9); const e = __mk('outrider', 12.5 + 5, 11.5, 'chase'); e.cool = 5; e.shotT = 0; e.alertT = 8;
      Math.random = () => 0.99; G.player.hp = G.player.hpMax; enemyUpdate(e, 0.5); o.bolt = HUD11.marks.length; G.ents.splice(G.ents.indexOf(e), 1);
      return o;
    });
    ok(mm.turn[0] > 1.4 && mm.turn[0] < 1.7 && Math.abs(mm.turn[1]) < 0.1, 'the arc follows the camera: turning to face the source moves it from the right to ahead');
    ok(mm.cap === 4, 'at most 4 markers at once (7 hits -> ' + mm.cap + ')');
    ok(mm.merge === 1, 'a flurry from one source is one marker');
    ok(mm.fade[0] === 1 && mm.fade[1] === 0, 'a marker is still there at 0.5 s and gone by 1.05 s');
    ok(mm.trap !== false && mm.trap < -1.3 && mm.trap > -1.8, 'a trap marks its own side (left)');
    ok(mm.noSrc === 0, 'damage with no known source makes no marker');
    ok(mm.bolt === 1, 'a crossbow bolt marks the shooter');

    // colour-blind palette and high contrast change the ink; No flashes and Reduce motion keep it still
    const pal = await page.evaluate(() => {
      const col = () => {
        __stage(); __flags(false); GFX.hitMarker = true; HUD11.addHit(16.5, 11.5); render(); const a = __px(); HUD11.draw(); const b = __px(); const S = Engine.getScale();
        let best = null, bl = -1; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1]) { const L = b.data[i] + b.data[i + 1] + b.data[i + 2]; if (L > bl) { bl = L; best = [b.data[i], b.data[i + 1], b.data[i + 2]]; } }
        return best;
      };
      const o = { plain: col() };
      UPG.colorblind = true; o.cb = col(); UPG.colorblind = false;
      ACCESS.settings.hc = true; document.documentElement.classList.add('ac-hc'); o.hc = col(); ACCESS.settings.hc = false; document.documentElement.classList.remove('ac-hc');
      GFX.reduceMotion = true; GFX.noFlash = true; o.calm = col(); GFX.reduceMotion = false; GFX.noFlash = false;
      return o;
    });
    ok(pal.plain && pal.plain[0] > pal.plain[1] * 1.5, 'normal marker is red (' + pal.plain + ')');
    ok(pal.cb && pal.cb[1] > pal.plain[1] * 1.3, 'colour-blind switch: an amber/white marker, not red (' + pal.cb + ')');
    ok(pal.hc && pal.hc[1] > 150 && pal.hc[2] > 150, 'high contrast: a white marker (' + pal.hc + ')');
    ok(pal.calm && pal.calm[0] > 100, 'Reduce motion + No flashes: still drawn, as a still fade');

    // ---- 4. enemy health bars
    const bars = await page.evaluate(() => {
      __stage(); __flags(false); GFX.enemyBars = true; const o = {};
      const e = __mk('proctor', 12.5, 8.5); e.hp = Math.round(e.hpMax * 0.5);
      render(); o.aimed = HUD11.barsNow.length === 1 && HUD11.barsNow[0] === e;
      HUD11.raw.render(); const dFull = __delta(() => HUD11.draw()); o.box = dFull.box; o.top = e._screen.y0;
      // not under the crosshair and not hit: no bar
      Engine.cam.dir = -Math.PI / 2 + 0.9; render(); o.offAim = HUD11.barsNow.length;
      Engine.cam.dir = -Math.PI / 2;
      // just hit but not aimed at: a bar for ~2.5 s
      Engine.cam.dir = -Math.PI / 2 + 0.2; __seed(3); const e2 = __mk('hound', 12.5 + 1.2, 10.4); render(); o.hitBefore = HUD11.barsNow.length;
      HUD11.recent.set(e2, HUD11.clock + 2.5); render(); o.hitBar = HUD11.barsNow.includes(e2) || !e2._screen;
      HUD11.clock += 3; render(); o.expired = !HUD11.barsNow.includes(e2);
      Engine.cam.dir = -Math.PI / 2; G.ents.splice(G.ents.indexOf(e2), 1);
      // behind a wall: nothing. Put a wall cell between the player and the foe.
      const wallIdx = G.map.cells.findIndex(c => c); const idx = 9 * G.map.w + 12, keep = G.map.cells[idx];
      G.map.cells[idx] = G.map.cells[wallIdx]; render();
      o.wallEdge = !!(e._screen); o.visWall = e._screen ? HUD11.visible(e) : null; o.barsWall = HUD11.barsNow.length;
      G.map.cells[idx] = keep; render(); o.barsClear = HUD11.barsNow.length;
      // a boss and a Hush-thing get none
      const b = __mk('weaver', 12.5, 8.5); const bossEl = HUD11.barEligible(b); G.ents.splice(G.ents.indexOf(b), 1); o.boss = bossEl;
      G.ents.splice(G.ents.indexOf(e), 1);
      return o;
    });
    ok(bars.aimed, 'a bar shows over the enemy under the crosshair');
    ok(bars.box[3] <= bars.top + 1 && bars.box[1] >= bars.top - 8 && bars.box[2] - bars.box[0] >= 10 && bars.box[2] - bars.box[0] <= 42, 'the bar sits at the top of the sprite (bar y ' + bars.box[1] + '..' + bars.box[3] + ', sprite top ' + bars.top.toFixed(1) + ')');
    ok(bars.offAim === 0, 'a foe off the crosshair and not hit shows no bar');
    ok(bars.hitBar && bars.expired, 'something you just hit keeps a bar for about 2.5 s, then it goes');
    ok(bars.wallEdge ? (bars.visWall === false && bars.barsWall === 0) : bars.barsWall === 0, 'a foe behind a wall shows no bar (visible=' + bars.visWall + ')');
    ok(bars.barsClear === 1, 'the bar returns when the wall is gone');
    ok(bars.boss === false, 'bosses get no second bar');

    // ---- 5. damage numbers match the damage dealt and taken
    const nums = await page.evaluate(() => {
      const o = { dealt: [], taken: [] };
      __flags(false); GFX.dmgNumbers = true; GFX.enemyBars = true;
      for (let i = 0; i < 8; i++) {
        __seed(100 + i * 13); __stage(); G.player.hp = G.player.hpMax; HUD11.nums.forEach(n => n.on = false);
        G.player.weapon = Math.max(0, G.player.weapons.indexOf('sword'));
        const e = __mk('proctor', 12.5, 10.4); render();
        const hp0 = e.hp; G.attack.t = 0; G.song.t = 0; attack('swing');
        const d = hp0 - e.hp, live = HUD11.nums.filter(n => n.on && (n.kind === 'hit' || n.kind === 'crit'));
        o.dealt.push([d, live.length ? live[0].value : null, live.length ? live[0].kind : null, live.length ? live[0].text : null]);
        G.ents.splice(G.ents.indexOf(e), 1);
      }
      for (let i = 0; i < 4; i++) {
        __seed(7 + i); __stage(); G.player.hp = G.player.hpMax; HUD11.nums.forEach(n => n.on = false); UPG.blocking = false; UPG.parryCool = 0; UPG.parryWindow = 0;
        const e = __mk('proctor', 12.5, 10.5, 'chase'); e.cool = 0; e.alertT = 8; Math.random = () => 0.99;
        const hp0 = G.player.hp; enemyUpdate(e, 0.016); const lost = hp0 - G.player.hp, live = HUD11.nums.filter(n => n.on && n.kind === 'taken');
        o.taken.push([lost, live.length ? live[0].value : null, live.length ? live[0].text : null]); G.ents.splice(G.ents.indexOf(e), 1);
      }
      return o;
    });
    ok(nums.dealt.some(x => x[0] > 0) && nums.dealt.every(x => x[0] === 0 ? x[1] === null : x[1] === x[0]), 'numbers dealt equal the HP the foe lost: ' + nums.dealt.map(x => x[0] + '/' + x[1]).join(' '));
    ok(nums.taken.every(x => x[0] > 0 && x[1] === x[0] && x[2] === '-' + x[0]), 'numbers taken equal the HP you lost: ' + nums.taken.map(x => x[0] + '/' + x[1]).join(' '));
    const kinds = await page.evaluate(() => {
      const o = {};
      __flags(false); GFX.dmgNumbers = true; GFX.hitMarker = true; __stage(); const e = __mk('proctor', 12.5, 10.5, 'chase');
      const hit = (setup) => { G.player.hp = G.player.hpMax; HUD11.nums.forEach(n => n.on = false); HUD11.marks.length = 0; e.cool = 0; e.alertT = 8; setup(); Math.random = () => 0.99; const hp0 = G.player.hp; enemyUpdate(e, 0.016); const n = HUD11.nums.find(x => x.on); return { lost: hp0 - G.player.hp, n: n ? [n.kind, n.value, n.text] : null, marks: HUD11.marks.length }; };
      o.parry = hit(() => { UPG.blocking = true; UPG.parryWindow = 0.3; UPG.parryCool = 1; });
      o.block = hit(() => { UPG.blocking = true; UPG.parryWindow = 0; UPG.parryCool = 1; });
      UPG.blocking = false; UPG.parryCool = 0;
      // a strong hit: top of the weapon's range, gold with "!"
      G.player.weapon = Math.max(0, G.player.weapons.indexOf('sword')); render();
      let strong = null;
      for (let i = 0; i < 60 && !strong; i++) {
        __seed(500 + i); e.hp = e.hpMax; e.state = 'idle'; HUD11.nums.forEach(n => n.on = false); G.attack.t = 0; render(); attack('swing');
        const n = HUD11.nums.find(x => x.on && x.kind === 'crit'); if (n) strong = [n.kind, n.value, n.text, e.hpMax - e.hp];
      }
      o.strong = strong; return o;
    });
    ok(kinds.parry.lost === 0 && kinds.parry.n && kinds.parry.n[0] === 'parry' && kinds.parry.n[2] === 'Parry' && kinds.parry.marks === 0, 'a parried blow shows "Parry" and no marker');
    ok(kinds.block.lost > 0 && kinds.block.n && kinds.block.n[0] === 'blocked' && kinds.block.n[1] === kinds.block.lost && kinds.block.n[2] === '[' + kinds.block.lost + ']', 'a blocked blow shows the reduced damage in [brackets] (' + (kinds.block.n && kinds.block.n[2]) + ')');
    ok(kinds.strong && kinds.strong[0] === 'crit' && kinds.strong[1] === kinds.strong[3] && kinds.strong[2] === kinds.strong[1] + '!', 'a top-of-range blow is styled apart, and still shows the exact damage (' + (kinds.strong && kinds.strong[2]) + ')');
    const pool = await page.evaluate(() => {
      __flags(false); GFX.dmgNumbers = true; __stage(); const e = __mk('proctor', 12.5, 10.4); render();
      for (let i = 0; i < 60; i++) HUD11.addNumber('hit', i + 1, e);
      const live = HUD11.nums.filter(n => n.on).length, len = HUD11.nums.length;
      HUD11.clock += 2; render(); const after = HUD11.nums.filter(n => n.on).length; G.ents.splice(G.ents.indexOf(e), 1);
      return { live, len, after };
    });
    ok(pool.len === 24 && pool.live === 24 && pool.after === 0, 'numbers are pooled and capped (60 spawned -> ' + pool.live + ' of ' + pool.len + ' live, all gone after 2 s)');
    const numpx = await page.evaluate(() => {
      __flags(false); GFX.dmgNumbers = true; __stage(); const e = __mk('proctor', 12.5, 10.4); render(); HUD11.addNumber('hit', 12, e); HUD11.addNumber('taken', 7, null);
      render(); const a = __delta(() => { HUD11.clock += 0.3; HUD11.draw(); }); G.ents.splice(G.ents.indexOf(e), 1); return a;
    });
    ok(numpx.n > 20, 'numbers are drawn on the canvas (' + numpx.n + ' pixels)');

    // ---- 6. organ pipes
    const pipes = await page.evaluate(() => {
      __flags(false); __stage(); const o = {}; const p = G.player; const y0 = VIEW_H;
      const colAt = (x, y) => { const d = Engine.ctx.getImageData(x * Engine.getScale(), y * Engine.getScale(), 1, 1).data; return d[0] + ',' + d[1] + ',' + d[2]; };
      const fillRows = (i) => { const g = HUD11.pipeGeometry, x = g.x[i] + 3; let n = 0; for (let y = y0 + g.fillTop; y < y0 + g.fillTop + g.fillH; y++) { const d = Engine.ctx.getImageData(x * Engine.getScale(), y * Engine.getScale(), 1, 1).data; if (d[0] + d[1] + d[2] > 60) n++; } return n; };
      const setv = (h, f, v) => { p.hp = p.hpMax * h; p.fat = p.fatMax * f; p.voice = p.voiceMax * v; };
      render();
      GFX.organPipes = true;
      const probe = [[1, 1, 1], [0.5, 0.25, 0.75], [0, 0, 0]];
      o.rows = probe.map(([h, f, v]) => { setv(h, f, v); render(); return [fillRows(0), fillRows(1), fillRows(2)]; });
      // the pipes alone: draw them over an already-rendered bar frame and see exactly which pixels move
      setv(1, 1, 1); GFX.organPipes = false; render(); GFX.organPipes = true;
      const S = Engine.getScale(), W = 320 * S, a = __px(); HUD11.draw(); const b = __px();
      let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1;
      for (let y = 0; y < 200 * S; y++) for (let x = 0; x < W; x++) {
        const k = (y * W + x) * 4;
        if (a.data[k] !== b.data[k] || a.data[k + 1] !== b.data[k + 1] || a.data[k + 2] !== b.data[k + 2]) { const lx = x / S, ly = y / S; if (lx < minx) minx = lx; if (lx > maxx) maxx = lx; if (ly < miny) miny = ly; if (ly > maxy) maxy = ly; }
      }
      o.box = [minx, miny, maxx, maxy];
      GFX.organPipes = false; return o;
    });
    ok(pipes.rows[0][0] === 34 && pipes.rows[0][1] === 34 && pipes.rows[0][2] === 34, 'full values fill every pipe (' + pipes.rows[0] + ' rows of 34)');
    ok(pipes.rows[1][0] === 17 && pipes.rows[1][1] === 9 && pipes.rows[1][2] === 26, 'pipes reflect health 50%, fatigue 25%, Song power 75% (' + pipes.rows[1] + ')');
    ok(pipes.rows[2][0] === 0 && pipes.rows[2][1] === 0 && pipes.rows[2][2] === 0, 'empty values leave empty pipes');
    ok(pipes.box[0] >= 3 && pipes.box[2] <= 31 && pipes.box[1] >= 150 && pipes.box[3] <= 200, 'the pipes stay inside x 4..30 of the HUD bar: the glass bar, Narrow bar, Dread band and buttons are untouched (box ' + pipes.box.map(v => Math.round(v)) + ')');

    // ---- 7. stillness tint
    const still = await page.evaluate(() => {
      __flags(false); GFX.stillTint = true; __stage(); G.noise = 1; const o = {};
      const amt = [];
      for (let i = 0; i <= 36 * 60; i++) { update(1 / 60); if (i % 360 === 0) { amt.push(+HUD11.tintAmount().toFixed(3)); (window.__dbg = window.__dbg || []).push([G.state, G.noise, Math.hypot(G.vel.x, G.vel.y), G.murmurT, G.whistleT, G.ents.filter(e => e.kind === 'enemy' && !e.hidden && !e.dead).length]); } }
      o.amt = amt; o.s = HUD11.stillSeconds; o.dbg = window.__dbg;
      render(); const a = __px(); const edge = (x, y) => { const d = a.data, k = (y * 320 + x) * 4; return d[k] + d[k + 1] + d[k + 2]; };
      o.max = HUD11.tintAmount();
      // noise clears it quickly
      addNoise(6); for (let i = 0; i < 90; i++) update(1 / 60); o.afterNoise = HUD11.tintAmount();
      // walking clears it too
      for (let i = 0; i < 36 * 60; i++) update(1 / 60); o.regrown = HUD11.tintAmount();
      G.keys.w = true; for (let i = 0; i < 90; i++) update(1 / 60); G.keys.w = false; o.afterWalk = HUD11.tintAmount();
      // a murmur counts as sound
      for (let i = 0; i < 36 * 60; i++) update(1 / 60); G.murmurT = 3; for (let i = 0; i < 120; i++) update(1 / 60); o.afterMurmur = HUD11.tintAmount();
      return o;
    });
        ok(still.amt[0] === 0 && still.amt[1] > 0 && still.amt.every((v, i, a) => i === 0 || v >= a[i - 1]) && still.amt[still.amt.length - 1] > 0.25, 'stillness grows with time and never past its ceiling (' + still.amt.join(' ') + ')');
    ok(still.max <= 0.3001, 'the darkest corner is at most 30% (very subtle)');
    ok(still.afterNoise < still.max * 0.2, 'a loud noise clears it within 1.5 s (' + still.max.toFixed(2) + ' -> ' + still.afterNoise.toFixed(2) + ')');
    ok(still.regrown > 0.2 && still.afterWalk < still.regrown * 0.2, 'moving clears it within 1.5 s (' + still.regrown.toFixed(2) + ' -> ' + still.afterWalk.toFixed(2) + ')');
    ok(still.afterMurmur < 0.25 * 0.3 + 0.001, 'a murmur clears it too (' + still.afterMurmur.toFixed(2) + ')');
    const tintpx = await page.evaluate(() => {
      __flags(false); GFX.stillTint = true; __stage(); render(); HUD11.stillSeconds = 30;
      const S = Engine.getScale(), a = __px(); HUD11.draw(); const b = __px();
      const lum = (im, x, y) => { const k = (y * 320 * S + x) * 4 * S; return im.data[k] + im.data[k + 1] + im.data[k + 2]; };
      return { corner: [lum(a, 3, 3), lum(b, 3, 3)], centre: [lum(a, 160, 75), lum(b, 160, 75)], hud: [lum(a, 100, 170), lum(b, 100, 170)] };
    });
    ok(tintpx.corner[1] < tintpx.corner[0] * 0.85 && tintpx.centre[1] === tintpx.centre[0] && tintpx.hud[1] === tintpx.hud[0], 'the tint darkens the corners, leaves the centre and the HUD bar alone');

    // ---- 8. options rows, presets, persistence
    const opt = await page.evaluate(() => {
      __flags(false); G.state = 'panel'; renderAccessibilityMenu();
      const ids = ['h11-marker', 'h11-bars', 'h11-nums', 'h11-style', 'h11-still'], o = { ids: ids.map(id => !!document.getElementById(id)) };
      renderAccessibilityMenu(); o.dup = document.querySelectorAll('#h11-marker').length;
      const st = document.getElementById('h11-style'); o.styleTxt = [st.textContent]; st.click(); o.styleTxt.push(st.textContent, GFX.organPipes); st.click(); o.styleTxt.push(st.textContent);
      document.getElementById('h11-marker').click(); o.stored = JSON.parse(localStorage.getItem('echoes-hud11')); o.marker = GFX.hitMarker;
      document.getElementById('h11-bars').click(); document.getElementById('h11-still').click();
      PRESETS.apply('original'); o.original = HUD11.FLAGS.map(k => GFX[k]);
      document.getElementById('h11-marker') && 0;
      HUD11.setFlag('hitMarker', true); HUD11.setFlag('stillTint', true); PRESETS.apply('medium'); o.medium = HUD11.FLAGS.map(k => GFX[k]);
      PRESETS.apply('low'); o.low = HUD11.FLAGS.map(k => GFX[k]);
      HUD11.setFlag('hitMarker', true); GFX.plain(); o.plain = HUD11.FLAGS.map(k => GFX[k]);
      PRESETS.apply('medium'); G.state = 'play'; closeModal(); return o;
    });
    ok(opt.ids.every(Boolean) && opt.dup === 1, 'Options has all five rows, once each');
    ok(opt.styleTxt[0] === 'Bars' && opt.styleTxt[1] === 'Organ pipes' && opt.styleTxt[2] === true && opt.styleTxt[3] === 'Bars', 'HUD style toggles Bars / Organ pipes');
    ok(opt.stored && opt.stored.hitMarker === true && opt.marker === true, 'the choice is stored in localStorage');
    ok(opt.original.every(v => v === false) && opt.low.every(v => v === false) && opt.plain.every(v => v === false), 'Original, Low and plain presets switch all five off');
    ok(opt.medium.every(v => v === true || v === false) && opt.medium[0] === true && opt.medium[4] === true, 'Medium leaves the player\'s own choices alone');

    // ---- 9. hostile save: nothing here reads save text; a hostile entity name never reaches the canvas
    const host = await page.evaluate(() => {
      __flags(true); __stage(); const e = __mk('proctor', 12.5, 10.4); e.name = '<img src=x onerror=window.__pwn=1>'; e.hp = 5;
      render(); HUD11.addNumber('hit', 3, e); render(); G.ents.splice(G.ents.indexOf(e), 1); __flags(false);
      return { pwn: window.__pwn || 0, imgs: document.querySelectorAll('img[src="x"]').length };
    });
    ok(host.pwn === 0 && host.imgs === 0, 'hostile names never touch the page (the canvas only draws numbers and bars)');

    // ---- 10. perf: 12-enemy scene. The added cost is HUD11.draw() on a rendered frame, timed on its own (whole-frame
    // timings on a shared build box wobble by more than the thing being measured), plus an interleaved A/B of render().
    const perf = await page.evaluate(() => {
      __stage(); const crowd = []; for (let i = 0; i < 12; i++) crowd.push(__mk(['hound', 'proctor', 'legionnaire', 'hound'][i % 4], 7 + i, 8 + (i % 3), 'idle'));
      G.player.hp = G.player.hpMax * 0.6; Engine.cam.dir = -Math.PI / 2 - 0.3;
      const med = (a) => { a.sort((x, y) => x - y); return a[a.length >> 1]; };
      __flags(true); crowd.forEach(e => HUD11.recent.set(e, 1e9)); for (let i = 0; i < 4; i++) HUD11.addHit(12.5 + i - 2, 14); for (let i = 0; i < 24; i++) HUD11.addNumber('taken', i + 1, null); HUD11.stillSeconds = 30;
      HUD11.raw.render(); HUD11.draw();
      const ds = []; for (let k = 0; k < 301; k++) { HUD11.clock = 0.1; for (const m of HUD11.marks) m.t0 = 0.1; for (const n of HUD11.nums) { n.on = true; n.t0 = 0.1; } const t0 = performance.now(); for (let j = 0; j < 5; j++) HUD11.draw(); ds.push((performance.now() - t0) / 5); }
      const bars = HUD11.barsNow.length;
      const ab = { on: [], off: [] };
      for (let k = 0; k < 120; k++) { for (const m of [true, false]) { __flags(m); if (m) { for (let i = 0; i < 4; i++) HUD11.addHit(12.5 + i - 2, 14); crowd.forEach(e => HUD11.recent.set(e, 1e9)); HUD11.stillSeconds = 30; } const t0 = performance.now(); render(); (m ? ab.on : ab.off).push(performance.now() - t0); } }
      __flags(false); for (const e of crowd) G.ents.splice(G.ents.indexOf(e), 1);
      return { draw: med(ds), bars, on: med(ab.on), off: med(ab.off) };
    });
    console.log('PERF 12-enemy scene (all five on, 4 markers, 24 numbers, bars on ' + perf.bars + ', full tint, pipes): HUD11.draw() median ' + perf.draw.toFixed(3) + ' ms; render() interleaved A/B median off ' + perf.off.toFixed(2) + ' ms, on ' + perf.on.toFixed(2) + ' ms (' + (perf.on - perf.off).toFixed(2) + ' ms)');
    ok(perf.draw < 1.0, 'added draw cost with all five on is under 1 ms (' + perf.draw.toFixed(3) + ' ms)');

    // ---- screenshots and compact fit
    if (SHOTS) {
      await page.evaluate(() => {
        __flags(true); __stage(12.5, 11.5, -Math.PI / 2);
        G.player.hp = G.player.hpMax * 0.65; G.player.fat = G.player.fatMax * 0.8; G.player.voice = G.player.voiceMax * 0.45;
        const a = __mk('proctor', 12.5, 8.6); a.hp = Math.round(a.hpMax * 0.6); const b = __mk('hound', 14.2, 9.4); const c = __mk('legionnaire', 10.8, 9.8);
        render(); HUD11.recent.set(b, HUD11.clock + 2.5); HUD11.recent.set(c, HUD11.clock + 2.5);
        HUD11.addNumber('hit', 9, a); HUD11.addNumber('crit', 14, b); HUD11.addNumber('taken', 5, null); HUD11.addNumber('blocked', 3, null);
        HUD11.addHit(12.5 + 4, 11.5); HUD11.addHit(12.5, 11.5 + 4); HUD11.addHit(12.5 - 4, 11.5 - 2);
        HUD11.clock += 0.2; HUD11.stillSeconds = 14; render();
        window.__hold = true;
      });
      await snap('hud11-all-1280x800');
      await page.evaluate(() => { GFX.organPipes = false; GFX.hitMarker = false; GFX.dmgNumbers = false; GFX.enemyBars = false; GFX.stillTint = false; render(); });
      await snap('hud11-bars-baseline-1280x800');
      await page.evaluate(() => { __flags(false); GFX.organPipes = true; render(); });
      await snap('hud11-pipes-only-1280x800');
      await page.setViewportSize({ width: 640, height: 400 });
      await page.evaluate(() => { __flags(true); HUD11.addHit(16.5, 11.5); HUD11.addNumber('taken', 6, null); render(); });
      await snap('hud11-all-640x400');
      await page.setViewportSize({ width: 1280, height: 800 });
    }
    const fit = await page.evaluate(() => { const c = Engine.canvas.getBoundingClientRect(); return { w: c.width, h: c.height, docX: document.documentElement.scrollWidth <= innerWidth + 1 }; });
    ok(fit.docX, 'no horizontal page scroll');
    await page.setViewportSize({ width: 640, height: 400 });
    const compact = await page.evaluate(() => {
      __flags(true); __stage(); render(); G.state = 'panel'; renderAccessibilityMenu();
      const panel = document.getElementById('modal-panel'), grid = panel.querySelector('.ctl-grid');
      const o = { panelX: panel.scrollWidth <= panel.clientWidth + 1, gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1 };
      const btns = ['h11-marker', 'h11-bars', 'h11-nums', 'h11-style', 'h11-still'].map(id => document.getElementById(id).getBoundingClientRect().width > 20);
      o.btns = btns.every(Boolean); closeModal(); G.state = 'play'; __flags(false); return o;
    });
    ok(compact.panelX && compact.gridX && compact.docX && compact.btns, 'Options at 640x400: no horizontal overflow, all five buttons usable');
    await page.setViewportSize({ width: 1280, height: 800 });

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
