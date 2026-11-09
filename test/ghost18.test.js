// PREVIEW_URL=http://127.0.0.1:4014 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/ghost18.test.js
// Phase 18 ghost replays: record / replay a boss fight, best run kept, size caps, export / import round trip, tampered codes refused,
// gameplay identical with ghosts on and off (seeded trace, no Math.random), manual (daily-style) recordings across maps, Watch mode from a
// hung boss trophy, Options rows, French rows, 640x400 fit, Reduce motion, per-frame cost. Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:4014';
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

async function boot(browser, vp) {
  const page = await browser.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /ghost18/i.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Ghost Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof GHOST18 === 'object' && G.state === 'play');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
    window.__stage = (x, y, d) => { loadMap('clearing', { x: x == null ? 12.5 : x, y: y == null ? 11.5 : y, dir: d == null ? -Math.PI / 2 : d }); G.state = 'play'; G.fadeT = 0; G.keys = {}; G.vel.x = G.vel.y = 0; for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy') G.ents.splice(i, 1); try { closeModal(); } catch (e) { /* none */ } };
    window.__seed = (n) => { let s = n || 777; window.__rc = 0; Math.random = () => { window.__rc++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
    // a scripted fight: the player strafes and swings, the boss loses health after a while; returns ticks run
    window.__fight = (type, opts) => {
      opts = opts || {};
      __stage(12.5, 11.5); __seed(5);
      const e = hydrate({ kind: 'enemy', type, x: 12.5, y: 7.5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e);
      G.player.hpMax = G.player.hp = 9999;
      const steps = opts.steps || 600, ph = opts.phase || 0;
      for (let i = 0; i < steps && !e.dead; i++) {
        __seed(100 + i);
        Engine.cam.dir = -Math.PI / 2 + Math.sin((i + ph) / 40) * 0.5; Engine.cam.x = 12.5 + Math.sin((i + ph) / 50) * 2;
        update(1 / 60);
        if (i % 40 === 0) attack('slash right');
        if (i > steps - 100) e.hp = Math.max(0, e.hp - 3);
        if (e.hp <= 0 && !e.dead) killEnemy(e);
      }
      update(1 / 60);
      return { e, dead: e.dead };
    };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    const reset = () => page.evaluate(() => { GFX.ghostReplay = true; GHOST18.cfg.echo = false; GHOST18.reset(); GHOST18.saveAll(); try { closeModal(); } catch (e) { /* none */ } G.state = 'play'; window.requestAnimationFrame = () => 0; });
    await page.evaluate(() => { window.__raf = window.requestAnimationFrame.bind(window); });
    await reset();

    // ================================================================= 1. module, switch, presets
    const m = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, t) => { if (!c) out.fails.push(t); };
      check(typeof GHOST18.record === 'function' && typeof GHOST18.stop === 'function' && typeof GHOST18.best === 'function' && typeof GHOST18.play === 'function', 'the DAILY contract: record/stop/best/play');
      check(GFX.FX.includes('ghostReplay'), 'ghostReplay is a GFX flag');
      PRESETS.apply('original'); out.orig = GFX.ghostReplay; PRESETS.apply('medium'); out.med = GFX.ghostReplay; PRESETS.apply('cinematic'); out.cin = GFX.ghostReplay;
      check(out.orig === false && out.med === true && out.cin === true, 'Original off, Medium and Cinematic on: ' + [out.orig, out.med, out.cin]);
      GFX.ghostReplay = true; check(GHOST18.BOSS_LIST.every((t) => GHOST18.isBossType(t)), 'every listed boss exists in ENEMIES');
      let bosses = 0; for (const k in ENEMIES) if (ENEMIES[k].boss || ENEMIES[k].wildsBoss || ENEMIES[k].codaBoss) { bosses++; check(GHOST18.isBossType(k), 'boss ' + k + ' is accepted'); }
      out.bosses = bosses;
      PRESETS.apply('original'); GHOST18.reset(); out.rec = GHOST18.record('daily:x'); PRESETS.apply('medium'); GFX.ghostReplay = true;
      check(out.rec === false, 'record() is inert with ghosts off');
      return out;
    });
    assert.deepEqual(m.fails, [], 'module: ' + m.fails);
    console.log('PASS module: contract functions, GFX flag (Original off, Medium/Cinematic on), ' + m.bosses + ' flagged bosses accepted, inert when off');

    // ================================================================= 2. record a boss fight, keep the best, replay it
    await reset();
    const f1 = await page.evaluate(() => {
      const r = __fight('wearer', { steps: 700 });
      const b = GHOST18.best('boss:wearer');
      return { dead: r.dead, b, rec: !!GHOST18.recs.auto, code: GHOST18.exportCode('boss:wearer') };
    });
    assert(f1.dead && f1.b && f1.b.win && f1.b.ticks >= 100 && f1.b.hpEnd === 0 && f1.b.source === 'mine', 'a won fight is kept: ' + JSON.stringify(f1.b));
    assert(!f1.rec, 'the recorder is closed after the fight');
    console.log('PASS record: a Wearer fight of ' + f1.b.secs.toFixed(1) + ' s kept as ' + f1.b.ticks + ' ticks, ' + f1.b.bytes + ' characters');
    const f2 = await page.evaluate(() => {
      // a slower win does not replace it; a quicker one does; a loss never replaces a win
      const first = GHOST18.best('boss:wearer');
      __fight('wearer', { steps: 900, phase: 7 }); const slower = GHOST18.best('boss:wearer');
      __fight('wearer', { steps: 400, phase: 3 }); const quicker = GHOST18.best('boss:wearer');
      // a lost fight: the player dies mid-fight
      __stage(12.5, 11.5); const e = hydrate({ kind: 'enemy', type: 'wearer', x: 12.5, y: 7.5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e);
      for (let i = 0; i < 200; i++) update(1 / 60);
      G.player.hp = 0; G.dead = true; update(1 / 60); G.dead = false; G.state = 'play'; G.player.hp = G.player.hpMax;
      const afterLoss = GHOST18.best('boss:wearer');
      return { first, slower, quicker, afterLoss, list: GHOST18.list().length };
    });
    assert.equal(f2.slower.secs, f2.first.secs, 'a slower win is not kept');
    assert(f2.quicker.secs < f2.first.secs, 'a quicker win replaces the best: ' + f2.first.secs + ' -> ' + f2.quicker.secs);
    assert.equal(f2.afterLoss.secs, f2.quicker.secs, 'a lost fight never replaces a win');
    assert.equal(f2.list, 1, 'one ghost per boss');
    console.log('PASS best kept: slower win ignored, quicker win replaces (' + f2.first.secs.toFixed(1) + ' s -> ' + f2.quicker.secs.toFixed(1) + ' s), a loss never replaces a win');

    // the next attempt shows the ghost, on the recorded path, and it ends
    const pl = await page.evaluate(() => {
      __stage(12.5, 15.5, -Math.PI / 2);
      const e = hydrate({ kind: 'enemy', type: 'wearer', x: 12.5, y: 7.5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e);
      const n0 = G.ents.length; update(1 / 60);
      const started = !!GHOST18.pb && GHOST18.state().bossFight === 'wearer';
      const g = GHOST18.slots['boss:wearer|m'].g, p0 = GHOST18.pbPose(GHOST18.pb);
      GHOST18.pb.t = 3.05; const p1 = GHOST18.pbPose(GHOST18.pb);
      const i = Math.floor(3.05 / 0.1), exp = [g.X[i] / 8, g.Y[i] / 8];
      let near = 99; for (const t of [i, i + 1]) near = Math.min(near, Math.hypot(p1.x - g.X[t] / 8, p1.y - g.Y[t] / 8));
      return { started, p0, near, entsSame: G.ents.length === n0, hasGhostEnt: G.ents.some((x) => x && (x._ghost18 || /^p18g/.test(String(x.sprite || x.id || '')))) };
    });
    assert(pl.started, 'the ghost starts with the fight');
    assert(pl.near < 0.3, 'the replay follows the recorded path: ' + pl.near);
    assert(!pl.hasGhostEnt, 'the ghost is not an entity (the trace test below also pins the entity count on / off)');
    console.log('PASS replay: the ghost starts with the next fight, follows the recorded path, is not in G.ents');

    // ================================================================= 3. the figure: drawn, occluded, faded, still under Reduce motion
    const fig = await page.evaluate(() => {
      const out = {};
      const aim = (dist, gx) => { const q = GHOST18.pbPose(GHOST18.pb); Engine.cam.x = q.x - dist; Engine.cam.y = q.y; Engine.cam.dir = 0; };
      GHOST18.pb.vis = 1; GHOST18.pb.t = 2.0; aim(3.0); render(); out.near = GHOST18.stats.drawn; out.nearAlpha = GHOST18.stats.last && GHOST18.stats.last.alpha;
      // behind a body in front of it: a solid enemy between camera and ghost hides the covered pixels
      const q = GHOST18.pbPose(GHOST18.pb);
      const wall = hydrate({ kind: 'enemy', type: 'wearer', x: q.x - 1.5, y: q.y }); wall.state = 'idle'; wall.passive = true; G.ents.push(wall);
      render(); out.behind = GHOST18.stats.drawn; G.ents.splice(G.ents.indexOf(wall), 1);
      aim(1.2); GHOST18.pb.vis = 1; render(); out.close = GHOST18.stats.last && GHOST18.stats.last.alpha;
      aim(Math.max(2, (Engine.farInfo().fogDist || 12) * 1.05)); render(); out.far = GHOST18.stats.drawn;
      out.fadeNear = GHOST18.ghostAlpha(0.4, 12, 1); out.fadeFar = GHOST18.ghostAlpha(20, 12, 1); out.fadeMid = GHOST18.ghostAlpha(4, 12, 1);
      GFX.ghostReplay = false; aim(3); render(); out.off = GHOST18.stats.drawn; GFX.ghostReplay = true;
      GFX.reduceMotion = true; const t0 = GHOST18.pb.vis; GHOST18.pb.vis = 0; GHOST18.stepPlay; out.rm = true; GFX.reduceMotion = false;
      return out;
    });
    assert(fig.near > 300 && fig.nearAlpha > 0.4, 'the figure is drawn near: ' + fig.near + ' px, alpha ' + fig.nearAlpha);
    assert(fig.behind < fig.near * 0.7, 'a body in front hides it: ' + fig.behind + ' < ' + fig.near);
    assert(fig.fadeNear === 0 && fig.fadeFar === 0 && fig.fadeMid > 0.3, 'fades to nothing very near and far: ' + [fig.fadeNear, fig.fadeMid, fig.fadeFar]);
    assert(fig.off === 0, 'ghosts off draws nothing');
    console.log('PASS figure: drawn translucent (alpha ' + fig.nearAlpha.toFixed(2) + '), hidden behind bodies, fades near and far, nothing when off');

    // ================================================================= 4. export / import round trip and tampering
    const ex = await page.evaluate(() => {
      const out = {}; const code = GHOST18.exportCode('boss:wearer');
      out.len = code.length; out.head = code.slice(0, 4);
      const g0 = GHOST18.slots['boss:wearer|m'].g;
      GHOST18.remove('boss:wearer'); out.gone = GHOST18.best('boss:wearer');
      const r = GHOST18.importCode(code); out.imp = r;
      const b = GHOST18.best('boss:wearer'); out.bestAfter = b;
      const g1 = GHOST18.slots['boss:wearer|f'].g; out.same = g0.n === g1.n && g0.X.every((v, i) => v === g1.X[i]) && g0.Y.every((v, i) => v === g1.Y[i]) && g0.D.every((v, i) => v === g1.D[i]) && g0.A.every((v, i) => v === g1.A[i]) && g0.hp.every((v, i) => v === g1.hp[i]);
      // tampering
      const bad = (c) => { const r = GHOST18.importCode(c); return r.ok ? 'ACCEPTED' : r.reason; };
      const flip = code.slice(0, 40) + (code[40] === 'A' ? 'B' : 'A') + code.slice(41);
      out.flip = bad(flip); out.cut = bad(code.slice(0, code.length - 6)); out.junk = bad('hello world'); out.empty = bad('  '); out.prefix = bad('GH2.' + code.slice(4));
      out.spaces = GHOST18.decode(code.replace(/(.{20})/g, '$1 \n')).ok;
      // a forger who recomputes the checksum: teleport, bad time, boss key that does not exist, a win with boss health left
      const forge = (mut) => { const g = Object.assign({}, g0, { X: Int16Array.from(g0.X), Y: Int16Array.from(g0.Y), A: Uint8Array.from(g0.A), D: Uint8Array.from(g0.D), M: Uint8Array.from(g0.M), maps: g0.maps.slice() }); mut(g); const c = GHOST18.encode(g); return bad(c); };
      out.teleport = forge((g) => { g.X[50] = g.X[49] + 100; });
      out.range = forge((g) => { g.X[10] = 5000; });
      out.badKey = forge((g) => { g.key = 'boss:notaboss'; });
      out.hpWin = forge((g) => { g.hpEnd = 40; });
      out.badKeyShape = forge((g) => { g.key = 'Bad Key!'; });
      out.ok2 = (() => { const g = Object.assign({}, g0); return GHOST18.decode(GHOST18.encode(g)).ok; })();
      // a quick import never replaces a better local ghost, and the slower one is refused with a reason
      return out;
    });
    assert.equal(ex.head, 'GH1.'); assert(ex.len < 16000, 'under the code cap: ' + ex.len);
    assert(ex.gone === null && ex.imp.ok && ex.bestAfter && ex.bestAfter.source === 'friend', 'import restores it as an imported ghost: ' + JSON.stringify(ex.imp));
    assert(ex.same, 'the imported ghost is identical, tick for tick');
    assert(ex.spaces, 'a code pasted with line breaks still decodes');
    assert.equal(ex.flip, 'sum', 'a flipped character fails the checksum'); assert.equal(ex.cut, 'sum', 'a cut code fails');
    assert.equal(ex.junk, 'format'); assert.equal(ex.empty, 'empty'); assert.equal(ex.prefix, 'format');
    assert.equal(ex.teleport, 'shape', 'a teleport with a good checksum is refused'); assert.equal(ex.range, 'shape'); assert.equal(ex.badKey, 'key'); assert.equal(ex.hpWin, 'shape'); assert.equal(ex.badKeyShape, 'shape');
    console.log('PASS export/import: ' + ex.len + '-character code round-trips tick for tick; flipped, cut, junk, wrong-version, teleport, out-of-range, unknown boss and impossible-win codes all refused');

    // ================================================================= 5. caps
    const cap = await page.evaluate(() => {
      const out = {}; GHOST18.reset();
      // a manual run longer than the cap is not kept and does not grow without bound
      GHOST18.record('daily:long'); __stage();
      for (let i = 0; i < 2600 * 6; i++) update(1 / 60 * 1.0);
      const rec = GHOST18.recs.manual; out.ticks = rec.n; out.full = rec.full;
      out.stop = GHOST18.stop({ win: true, score: 10 }); out.kept = !!GHOST18.best('daily:long');
      // slot cap: oldest daily ghosts go first and a boss best is never dropped
      GHOST18.reset();
      __fight('wearer', { steps: 400 }); const bossCode = GHOST18.exportCode('boss:wearer');
      let made = 0;
      for (let i = 0; i < GHOST18.B.MAX_SLOTS + 8; i++) { GHOST18.record('daily:d' + i); __stage(); for (let k = 0; k < 150; k++) update(1 / 60 * 2); const r = GHOST18.stop({ win: true, score: i }); if (r && r.saved) made++; }
      out.made = made; out.slots = Object.keys(GHOST18.slots).length; out.bossKept = !!GHOST18.best('boss:wearer'); out.oldGone = !GHOST18.best('daily:d0'); out.newKept = !!GHOST18.best('daily:d' + (GHOST18.B.MAX_SLOTS + 7));
      return out;
    });
    assert(cap.full && cap.ticks <= 2400 && !cap.kept, 'a run over the tick cap stops at ' + cap.ticks + ' ticks and is not kept: ' + JSON.stringify(cap.stop));
    assert(cap.slots <= 60 && cap.bossKept && cap.oldGone && cap.newKept, 'slot cap: ' + JSON.stringify(cap));
    console.log('PASS size caps: ' + cap.ticks + ' ticks max and an over-long run is dropped; ' + cap.slots + ' of 60 slots, oldest daily ghost dropped first, the boss best kept');

    // ================================================================= 6. manual (daily-style) recording across maps; score ranking
    const man = await page.evaluate(() => {
      GHOST18.reset(); const out = {};
      out.rec = GHOST18.record('daily:2026-10-20'); __stage(12.5, 11.5);
      for (let i = 0; i < 90; i++) { Engine.cam.x = 12.5 + i * 0.03; update(1 / 60 * 2); }
      loadMap('tavern', { x: 8.5, y: 10.5, dir: 0 }); G.state = 'play'; G.fadeT = 0;
      for (let i = 0; i < 90; i++) { Engine.cam.x = 8.5 + i * 0.02; update(1 / 60 * 2); }
      out.state = GHOST18.state(); const s = GHOST18.stop({ win: true, score: 120 });
      out.saved = s && s.saved; out.meta = GHOST18.best('daily:2026-10-20');
      const g = GHOST18.slots['daily:2026-10-20|m'].g; out.maps = g.maps; out.rt = GHOST18.decode(GHOST18.exportCode('daily:2026-10-20')).ok;
      // a lower score does not replace it; a higher one does
      GHOST18.record('daily:2026-10-20'); for (let i = 0; i < 60; i++) update(1 / 60 * 2); out.low = GHOST18.stop({ win: true, score: 50 }).saved;
      GHOST18.record('daily:2026-10-20'); for (let i = 0; i < 60; i++) update(1 / 60 * 2); out.high = GHOST18.stop({ win: true, score: 400 }).saved;
      out.score = GHOST18.best('daily:2026-10-20').score;
      // play() starts a replay on the right map
      loadMap('clearing', { x: 12.5, y: 11.5, dir: 0 }); G.state = 'play';
      out.play = GHOST18.play('daily:2026-10-20'); out.playing = GHOST18.state().playing; GHOST18.stopPlay(); out.after = GHOST18.state().playing;
      out.bad = [GHOST18.record('Bad Key'), GHOST18.record('boss:wearer'), GHOST18.play('daily:none')];
      return out;
    });
    assert(man.rec && man.state.recording === 'daily:2026-10-20' && man.saved && man.meta.score === 120 && man.maps.length === 2, 'two-map run kept: ' + JSON.stringify(man));
    assert(man.rt && man.low === false && man.high === true && man.score === 400, 'score ranking: lower refused, higher kept');
    assert(man.play && man.playing === 'daily:2026-10-20' && man.after === null && man.bad.every((v) => v === false), 'play()/stopPlay() and bad keys: ' + JSON.stringify(man.bad));
    console.log('PASS manual recording: a two-map daily-style run round-trips, ranks by score, plays and stops, bad keys refused');

    // ================================================================= 7. gameplay identical with ghosts on and off
    const trace = await page.evaluate(() => {
      const base = JSON.stringify(G.player);
      GHOST18.reset();
      __fight('wearer', { steps: 500 });                   // a kept ghost, so the "on" run really replays one
      const run = (on) => {
        Object.assign(G.player, JSON.parse(base)); G.player.hpMax = G.player.hp = 9999; GFX.ghostReplay = on; if (!on) GHOST18.stopPlay();
        __stage(12.5, 15.5); __seed(4242); G.noise = 2;
        const es = [hydrate({ kind: 'enemy', type: 'wearer', x: 12.5, y: 8.5 }), hydrate({ kind: 'enemy', type: 'proctor', x: 11.3, y: 12.5 })];
        for (const e of es) { e.state = 'chase'; e.alertT = 99; G.ents.push(e); }
        const tr = []; let drew = 0;
        for (let i = 0; i < 480; i++) {
          __seed(9000 + i); update(1 / 60);
          if (i % 24 === 0) attack('thrust');
          if (i % 3 === 0) { render(); drew += GHOST18.stats.drawn; }
          if (i % 12 === 0) tr.push([Math.round(G.player.hp * 100), Engine.cam.x.toFixed(3), ...es.map((e) => Math.round(e.hp * 100) + ':' + e.state + ':' + e.x.toFixed(3) + ',' + e.y.toFixed(3)), G.noise.toFixed(4), G.ents.filter((x) => x.kind === 'enemy').length].join('|'));
        }
        for (const e of es) { const k = G.ents.indexOf(e); if (k >= 0) G.ents.splice(k, 1); }
        return { out: tr.join('\n'), calls: window.__rc, drew, pb: !!GHOST18.pb };
      };
      const a = run(false), b = run(true), c = run(false);
      const wasOn = b.drew > 0;
      const own = (() => { __seed(5); const r0 = window.__rc; GHOST18.encode(GHOST18.slots['boss:wearer|m'].g); GHOST18.decode(GHOST18.exportCode('boss:wearer')); GHOST18.figureFrame(1, 1, 3, 2, { cls: 2, face: 3, wpn: 4, arm: 5 }); return window.__rc - r0; })();
      const dl = (x, y) => { const X = x.split('\n'), Y = y.split('\n'); const i = X.findIndex((l, k) => l !== Y[k]); return i < 0 ? '' : i + ': ' + X[i] + ' <> ' + Y[i]; };
      return { dump: [dl(a.out, b.out), dl(a.out, c.out)].join(' || '), same: a.out === b.out && a.out === c.out, lines: a.out.split('\n').length, drewOn: b.drew, drewOff: a.drew, rcSame: a.calls === b.calls && a.calls === c.calls, own, wasOn };
    });
    if (!trace.same) console.log(trace.dump);
    assert(trace.same && trace.lines >= 40, 'seeded boss fight: HP, boss and foe state/position, noise, enemy count identical on / off / off');
    assert(trace.rcSame, 'the same number of Math.random calls with ghosts on and off');
    assert(trace.drewOn > 0 && trace.drewOff === 0, 'the on-run really drew the ghost (' + trace.drewOn + ' px) and the off-run drew none');
    assert.equal(trace.own, 0, 'the module makes no Math.random calls of its own');
    console.log('PASS gameplay identical: ' + trace.lines + ' samples of a seeded Wearer fight match with ghosts on and off; same RNG call count; the module itself draws on no random numbers');

    // ================================================================= 8. Watch from a hung trophy, Options rows, panels at 640x400
    const wt = await page.evaluate(async () => {
      const out = { fails: [] }, check = (c, t) => { if (!c) out.fails.push(t); };
      GFX.ghostReplay = true; GHOST18.reset(); __fight('wearer', { steps: 500 });
      G.flags = Object.assign(G.flags || {}, { wearer_dead: true });
      HEARTH15.scanTrophies(true); check(HEARTH15.isGot(0), 'the Borrowed Collar is granted');
      loadMap('cooper_house', { x: 6, y: 5, dir: 0 }); G.state = 'play'; G.fadeT = 0; HEARTH15.ensurePegs(G.map);
      check(HEARTH15.hang(0, 0), 'the collar hangs on peg 1');
      const peg = G.ents.find((e) => e.use === 'p15_peg' && e._pi === 0); check(!!peg, 'a peg entity');
      useDeco(peg);
      const btns = Array.from(document.querySelectorAll('#event-panel button')).map((b) => b.textContent);
      out.btns = btns; check(btns.includes(GHOST18.TX.peg.watch), 'Watch is a choice on the trophy: ' + btns);
      const w = Array.from(document.querySelectorAll('#event-panel button')).find((b) => b.textContent === GHOST18.TX.peg.watch);
      if (!w) { out.fails.push('no Watch button: ' + JSON.stringify(btns) + ' best=' + JSON.stringify(GHOST18.best('boss:wearer')) + ' on=' + GHOST18.enabled()); return out; }
      w.click();
      await new Promise((r) => setTimeout(r, 120));
      out.open = G.openPanel === 'p18g' && !!document.getElementById('p18g-cv') && GHOST18.ui && GHOST18.ui.view === 'watch'; check(out.open, 'the Watch panel opened');
      const cv = document.getElementById('p18g-cv'); const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 150) lit++; out.lit = lit; check(lit > 40, 'something is drawn on the canvas: ' + lit);
      out.fit = (() => { const p = document.querySelector('#modal-panel').getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect(); return p.left >= g.left - 1 && p.right <= g.right + 1 && p.top >= g.top - 1 && p.bottom <= g.bottom + 1; })();
      if (!document.getElementById('p18g-play')) { out.fails.push('no watch panel: ' + G.openPanel + ' ' + G.state + ' ' + (document.getElementById('modal-panel').innerHTML.slice(0, 120))); return out; }
      document.getElementById('p18g-play').click(); const s = document.getElementById('p18g-scrub'); s.value = '40'; s.dispatchEvent(new Event('input')); await new Promise((r) => setTimeout(r, 60));
      out.hpText = document.getElementById('p18g-hpt').textContent; check(/\d+/.test(out.hpText), 'boss health shown: ' + out.hpText);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      out.closed = !GHOST18.ui && G.state === 'play' && !G.openPanel; check(out.closed, 'Escape closes Watch and returns to play: ' + G.state + ' ' + G.openPanel);
      // with ghosts off the trophy has no Watch choice
      GFX.ghostReplay = false; useDeco(peg); out.offBtns = Array.from(document.querySelectorAll('#event-panel button')).map((b) => b.textContent); check(!out.offBtns.includes(GHOST18.TX.peg.watch), 'no Watch with ghosts off');
      document.getElementById('event').classList.add('hidden'); G.state = 'play'; GFX.ghostReplay = true;
      return out;
    });
    assert.deepEqual(wt.fails, [], 'watch: ' + wt.fails);
    console.log('PASS watch: the hung Borrowed Collar offers "Watch your best run", the panel draws the arena, scrubs, shows boss health, Escape closes; no Watch when ghosts are off');

    const big = await page.evaluate(async () => { GHOST18.openWatch('boss:wearer'); await new Promise((r) => setTimeout(r, 100)); const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect(); const ok = Array.from(p.querySelectorAll('button')).every((b) => b.getBoundingClientRect().bottom <= r.bottom + 1); return ok; });
    await shot(page, 'ghost18-watch-1280.png'); await page.evaluate(() => GHOST18.closeUi());
    assert(big, 'Watch buttons inside the panel at 1280x800');
    await page.setViewportSize({ width: 640, height: 400 });
    const small = await page.evaluate(async () => {
      const fits = () => { const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect(); return { inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, hscroll: p.scrollWidth > p.clientWidth + 1, btns: Array.from(p.querySelectorAll('button')).filter((b) => !b.hidden && b.offsetParent).every((b) => { const q = b.getBoundingClientRect(); return q.left >= g.left - 1 && q.right <= g.right + 1 && q.top >= g.top - 1 && q.bottom <= g.bottom + 1 && q.bottom <= r.bottom + 1; }) }; };
      const out = {}; GHOST18.openWatch('boss:wearer'); await new Promise((r) => setTimeout(r, 120)); out.watch = fits(); GHOST18.closeUi();
      GHOST18.openList(); await new Promise((r) => setTimeout(r, 120)); out.list = fits(); out.rows = document.querySelectorAll('.p18g-row').length;
      const inp = document.getElementById('p18g-in'); inp.value = 'nonsense'; document.getElementById('p18g-imp').click(); out.say = document.getElementById('p18g-say').textContent;
      inp.value = GHOST18.exportCode('boss:wearer'); GHOST18.remove('boss:wearer'); document.getElementById('p18g-imp').click(); out.say2 = document.getElementById('p18g-say').textContent; out.rows2 = document.querySelectorAll('.p18g-row').length;
      GHOST18.closeUi(); return out;
    });
    await shot(page, 'ghost18-list-640.png');
    for (const k of ['watch', 'list']) assert(small[k].inside && !small[k].hscroll && small[k].btns, k + ' panel fits 640x400: ' + JSON.stringify(small[k]));
    assert(small.rows >= 1 && /not a ghost code/.test(small.say) && /Imported/.test(small.say2) && small.rows2 >= 1, 'the list panel lists, refuses nonsense and imports: ' + JSON.stringify([small.rows, small.say, small.say2]));
    console.log('PASS panels at 640x400: Watch and the ghost list fit, the list shows ghosts, refuses a bad code and imports a good one');
    await page.setViewportSize({ width: 1280, height: 800 });

    const opt = await page.evaluate(async () => {
      GFX.ghostReplay = true; renderAccessibilityMenu(); await new Promise((r) => setTimeout(r, 50));
      const g = document.getElementById('p18g-opt-ghost'), e = document.getElementById('p18g-opt-echo'), c = document.getElementById('p18g-opt-codes');
      const out = { rows: !!(g && e && c), before: g && g.textContent }; g.click(); out.after = GFX.ghostReplay; out.stored = JSON.parse(localStorage.getItem('octave.ghost18.v1')).override; g.click(); e.click(); out.echo = GHOST18.cfg.echo; e.click();
      out.inGrid = !!document.querySelector('#modal-panel .ctl-grid #p18g-opt-ghost');
      c.click(); out.codes = G.openPanel; GHOST18.closeUi(); try { closeModal(); } catch (er) { /* none */ } G.state = 'play';
      // a preset change takes over a stored override
      PRESETS.apply('original'); out.afterPreset = [GFX.ghostReplay, JSON.parse(localStorage.getItem('octave.ghost18.v1')).override]; PRESETS.apply('medium'); GFX.ghostReplay = true;
      return out;
    });
    assert(opt.rows && opt.inGrid && opt.before === 'On' && opt.after === false && opt.stored === false && opt.echo === true && opt.codes === 'p18g', 'Options rows: ' + JSON.stringify(opt));
    assert(opt.afterPreset[0] === false && opt.afterPreset[1] === null, 'a preset change takes over the stored choice: ' + JSON.stringify(opt.afterPreset));
    console.log('PASS options: Ghost replays, Ghost echo and Ghost codes rows work, the choice persists, a preset change takes over');

    // ================================================================= 9. French, Reduce motion / No flashes, hostile storage
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p18-ghost.tsv'), 'utf8');
    const rows = new Map(tsv.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t')));
    const list = await page.evaluate(() => GHOST18.LIST);
    const missing = list.filter((s) => !rows.has(s) || !rows.get(s));
    assert.deepEqual(missing, [], 'French rows missing: ' + missing.slice(0, 4));
    for (const s of list) { const a = (s.match(/\{\d+\}/g) || []).sort().join(), b = (rows.get(s).match(/\{\d+\}/g) || []).sort().join(); assert.equal(a, b, 'placeholders kept: ' + s); }
    assert(![...rows.values()].some((v) => /[<>]/.test(v)), 'no markup in French');
    console.log('PASS French: ' + list.length + ' strings, each with a row, placeholders kept');

    const rm = await page.evaluate(() => {
      const out = {};
      GHOST18.reset(); __fight('wearer', { steps: 400 }); GHOST18.play('boss:wearer');
      GFX.reduceMotion = true; GHOST18.pb.vis = 0; const t0 = GHOST18.pb.t; for (let i = 0; i < 20; i++) GHOST18.stepPlay ? 0 : 0; update(0.25); out.visRM = GHOST18.pb.vis;
      GFX.reduceMotion = false; GHOST18.pb.vis = 0; update(0.25); out.visNorm = GHOST18.pb.vis;
      // no flicker: the same pose drawn on consecutive frames is pixel-identical (nothing pulses)
      GHOST18.pb.vis = 1; GFX.noFlash = true; GHOST18.pb.t = 1.0; const q = GHOST18.pbPose(GHOST18.pb); Engine.cam.x = q.x - 3; Engine.cam.y = q.y; Engine.cam.dir = 0;
      render(); const s1 = [GHOST18.stats.drawn, GHOST18.stats.last.alpha]; render(); const s2 = [GHOST18.stats.drawn, GHOST18.stats.last.alpha]; out.diff = (s1[0] === s2[0] && s1[1] === s2[1]) ? 0 : 1;
      GFX.noFlash = false;
      // hostile storage: junk, a hand-edited code and a throwing setItem
      localStorage.setItem('octave.ghost18.v1', '{"v":1,"slots":{"boss:wearer|m":"GH1.AAAA","x|m":5},"echo":"yes","override":3}'); GHOST18.reset(); GHOST18.loadAll(); out.hostile = Object.keys(GHOST18.slots).length;
      const si = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error('blocked'); };
      try { __fight('wearer', { steps: 400 }); out.memory = !!GHOST18.best('boss:wearer'); } finally { Storage.prototype.setItem = si; }
      return out;
    });
    assert(rm.visRM > rm.visNorm, 'Reduce motion fades in faster, never slower: ' + rm.visRM + ' vs ' + rm.visNorm);
    assert.equal(rm.diff, 0, 'a held pose draws the same pixels at the same alpha frame to frame (no pulse, no flicker)');
    assert.equal(rm.hostile, 0, 'a hand-edited store drops everything that fails the import checks'); assert(rm.memory, 'with storage blocked the ghost lives in memory');
    console.log('PASS accessibility and hostile storage: Reduce motion shortens the fade, no pulse or flicker, a corrupt store is dropped, blocked storage keeps the session ghost');

    // ================================================================= 9b. the figure reads as a person, at an NPC's size
    const body = await page.evaluate(() => {
      const runs = (f, y) => { let n = 0, inR = false; for (let x = 0; x < f.w; x++) { const on = (f.data[y * f.w + x] >>> 24) > 0; if (on && !inR) n++; inR = on; } return n; };
      const rows = (d, w, h) => { let t = h, b = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((d[y * w + x] >>> 24) > 100) { if (t === h) t = y; b = y; } return [t, b]; };
      const luma = (p) => 0.3 * (p & 255) + 0.59 * ((p >>> 8) & 255) + 0.11 * ((p >>> 16) & 255);
      const out = { looks: [] };
      const looks = [{ cls: 0, face: 1, wpn: 1, arm: 0 }, { cls: 2, face: 3, wpn: 7, arm: 1 | 16 }, { cls: 5, face: 6, wpn: 6, arm: 2 << 2 }, { cls: 1, face: 2, wpn: 0, arm: 4 }];
      for (const L of looks) {
        const f = GHOST18.figureFrame(0, 0, 0, 0, L), w = f.w, h = f.h, [t, b] = rows(f.data, w, h), H = b - t + 1;
        // the widest row above the hips, the arms-and-body row at the hands, the legs row at the knees
        let wide = 0; for (let y = t; y < t + H * 0.5; y++) { let x0 = w, x1 = -1; for (let x = 0; x < w; x++) if (f.data[y * w + x]) { x0 = Math.min(x0, x); x1 = x; } wide = Math.max(wide, x1 - x0 + 1); }
        const handRow = Math.round(t + H * 0.5), kneeRow = Math.round(t + H * 0.8);
        let armSplit = 0; for (let y = handRow - 4; y <= handRow + 4; y++) armSplit = Math.max(armSplit, runs(f, y));
        let legSplit = 0; for (let y = kneeRow - 3; y <= kneeRow + 3; y++) legSplit = Math.max(legSplit, runs(f, y));
        // the rim (outermost ring) is brighter than the body inside it, and the whole is a pale blue
        let rimL = 0, rimN = 0, inL = 0, inN = 0, rS = 0, bS = 0;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const p = f.data[y * w + x]; if (!p) continue; rS += p & 255; bS += (p >>> 16) & 255;
          const edge = !f.data[y * w + x - 1] || !f.data[y * w + x + 1] || !(f.data[(y - 1) * w + x]) || !(f.data[(y + 1) * w + x]);
          if (edge) { rimL += luma(p); rimN++; } else { inL += luma(p); inN++; }
        }
        out.looks.push({ L, H: H / h, aspect: w / h, wide: wide / H, armSplit, legSplit, rim: rimL / rimN, inner: inL / inN, blue: bS > rS, robe: L.cls === 1 });
      }
      // an NPC sprite of scale 1 fills its frame height the same way (Old Harrow)
      const sp = Engine.sprites.harrow; const [nt, nb] = rows(sp.data, sp.w, sp.h); out.npcH = (nb - nt + 1) / sp.h * (sp.hs || 1);
      // walking: the legs part in profile; the painter is a pure function (same pixels twice)
      const wf = GHOST18.figureFrame(2, 1, 0, 0, looks[0]); let lw = 0; const [wt, wb] = rows(wf.data, wf.w, wf.h); for (let y = Math.round(wt + (wb - wt) * 0.85); y <= wb - 2; y++) lw = Math.max(lw, runs(wf, y)); out.walkLegs = lw;
      const a = GHOST18.paintFigure(1, 2, 3, 2, looks[1]), b2 = GHOST18.paintFigure(1, 2, 3, 2, looks[1]); out.pure = a.length === b2.length && a.every((v, i) => v === b2[i]);
      out.cached = GHOST18.figureFrame(1, 2, 3, 2, looks[1]) === GHOST18.figureFrame(1, 2, 3, 2, looks[1]);
      return out;
    });
    for (const k of body.looks) {
      assert(Math.abs(k.H - body.npcH) < 0.08, 'the figure stands as tall in its frame as an NPC sprite: ' + k.H.toFixed(2) + ' vs ' + body.npcH.toFixed(2));
      assert(k.aspect > 0.33 && k.aspect < 0.55, 'frame aspect like the NPC sprites: ' + k.aspect.toFixed(2));
      assert(k.wide > 0.26, 'shoulders and arms span over a quarter of the height (not a post): ' + k.wide.toFixed(2) + ' ' + JSON.stringify(k.L));
      assert(k.armSplit >= 3, 'front view: the arms hang clear of the body (' + k.armSplit + ' runs at the hands) ' + JSON.stringify(k.L));
      if (!k.robe) assert(k.legSplit >= 2, 'front view: two legs apart at the knees ' + JSON.stringify(k.L));
      assert(k.rim > k.inner, 'a brighter rim round the figure: ' + k.rim.toFixed(0) + ' > ' + k.inner.toFixed(0));
      assert(k.blue, 'a pale-blue tint');
    }
    assert(body.walkLegs >= 2, 'walking in profile the legs are apart: ' + body.walkLegs);
    assert(body.pure && body.cached, 'the painter is pure and its frames are cached');
    console.log('PASS figure shape: NPC-height (' + body.looks[0].H.toFixed(2) + ' vs ' + body.npcH.toFixed(2) + '), shoulders ' + body.looks.map((k) => k.wide.toFixed(2)).join('/') + ' of height, arms clear, legs apart, brighter rim, pale blue, pure and cached');

    // ================================================================= 10. screenshots, cost
    await reset();
    const ready = await page.evaluate(() => { __fight('wearer', { steps: 500 }); return !!GHOST18.best('boss:wearer'); });
    assert(ready);
    for (const preset of ['medium', 'cinematic']) {
      await page.evaluate((preset) => {
        PRESETS.apply(preset); GFX.ghostReplay = true; G.tod = 0.5; __stage(12.5, 15.5);
        const e = hydrate({ kind: 'enemy', type: 'wearer', x: 12.5, y: 7.5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e);
        for (let i = 0; i < 3; i++) update(1 / 60);
        GHOST18.pb.vis = 1; GHOST18.pb.t = 3.4; const q = GHOST18.pbPose(GHOST18.pb); Engine.cam.x = q.x - 3.2; Engine.cam.y = q.y + 0.6; Engine.cam.dir = Math.atan2(q.y - Engine.cam.y, q.x - Engine.cam.x); render();
      }, preset);
      await shot(page, 'ghost18-' + preset + '.png');
    }
    const perf = await page.evaluate(() => {
      PRESETS.apply('medium'); GFX.ghostReplay = true; __stage(12.5, 15.5);
      for (let i = 0; i < 12; i++) { const e = hydrate({ kind: 'enemy', type: 'proctor', x: 6 + i, y: 10 }); e.state = 'idle'; e.passive = true; G.ents.push(e); }
      GHOST18.play('boss:wearer'); GHOST18.pb.vis = 1; GHOST18.pb.t = 2; const q = GHOST18.pbPose(GHOST18.pb); Engine.cam.x = q.x - 3; Engine.cam.y = q.y; Engine.cam.dir = 0;
      const hook = GHOST18.drawHook, F = {}; let tot = 0; const N = 200;
      let withG = 1e9, without = 1e9;   // round robin, best of five 40-frame runs each: machine noise hits both alike
      for (let r = 0; r < 5; r++) {
        GFX.ghostReplay = true; let t = performance.now(); for (let i = 0; i < 40; i++) { GHOST18.pb.vis = 1; GHOST18.pb.t = 2; render(); } withG = Math.min(withG, (performance.now() - t) / 40);
        GFX.ghostReplay = false; t = performance.now(); for (let i = 0; i < 40; i++) render(); without = Math.min(without, (performance.now() - t) / 40);
      }
      GFX.ghostReplay = true;
      // recording: one sample
      const rec = GHOST18.record('daily:perf'); const t2 = performance.now(); for (let i = 0; i < 200; i++) update(0.1); const upd = (performance.now() - t2) / 200; GHOST18.abort();
      return { hookMs: GHOST18.stats.ms, withG, without, delta: withG - without, upd, drawn: GHOST18.stats.drawn };
    });
    assert(perf.delta < 1.5, 'the ghost costs under ~1 ms a frame: ' + perf.delta.toFixed(2) + ' ms, hook alone ' + perf.hookMs.toFixed(2) + ' (' + perf.withG.toFixed(2) + ' vs ' + perf.without.toFixed(2) + ')');
    console.log('PASS perf (12-enemy scene, Medium 1x): ghost adds ' + perf.delta.toFixed(2) + ' ms a frame (' + perf.withG.toFixed(2) + ' vs ' + perf.without.toFixed(2) + ' ms), drew ' + perf.drawn + ' px');

    assert.deepEqual(errors.filter((e) => !/favicon/i.test(e)), [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
