// PREVIEW_URL=http://127.0.0.1:4114 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r11bench.test.js
// R11 phase 1, team BENCH (js/r11bench.js): the quality setting, dynamic resolution, the first-run pick and the in-game
// benchmark. Options rows in both languages; run({duration:3000}) completes and puts everything back exactly; the report
// has every field; renderScale steps down and up on synthetic samples; autoTier never overrides a manual choice.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOT_DIR || path.join(__dirname, '..', 'screenshots', 'r11-bench');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(240000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.__r11 = { automation: true }; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ style: 'pixel' })); } catch (e) { /* none */ } });
    await page.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:4114') + '/?nosw=1');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof R11BENCH !== 'undefined', null, { timeout: 240000 });
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Bench Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => G.state === 'play');

    // ---- storage keeps CORE's keys
    let r = await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('octave.r11.v1')); return { style: o.style, tier: o.tier, T: R11BENCH.TIERS.includes(o.tier) }; });
    check(r.style === 'pixel' && r.T, 'the setting merges into octave.r11.v1 and keeps CORE\'s style key (' + JSON.stringify(r) + ')');

    // ---- Options rows, English then French
    r = await page.evaluate(() => {
      R11BENCH.choose('auto'); renderAccessibilityMenu();
      const q = (id) => document.getElementById(id);
      return { tier: q('r11-tier') && q('r11-tier').textContent, bench: q('r11-bench') && q('r11-bench').textContent, lab: q('r11-tier-label') && q('r11-tier-label').textContent, lab2: q('r11-bench-label') && q('r11-bench-label').textContent };
    });
    check(/^Auto: (Ultra|High|Phone)$/.test(r.tier || '') && r.bench === 'Run benchmark' && /Graphics quality/.test(r.lab || '') && /^Benchmark/.test(r.lab2 || ''), 'Options: the Quality and Benchmark rows exist in English ' + JSON.stringify(r));
    await page.locator('#r11-tier').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'options-en.png') });
    const cyc = await page.evaluate(() => { const b = document.getElementById('r11-tier'), seen = []; for (let i = 0; i < 4; i++) { b.click(); seen.push(b.textContent + '/' + R11BENCH.choice()); } R11BENCH.choose('auto'); return seen; });
    check(/^Auto: \w+\/auto$/.test(cyc[3]) && cyc.join(',') === 'Ultra/ultra,High/high,Phone/phone,' + cyc[3], 'the quality button cycles Auto, Ultra, High, Phone (' + cyc.join(', ') + ')');
    await page.evaluate(() => ACCESS.setLocale('fr'));
    await page.waitForFunction(() => /Qualité graphique/.test(document.getElementById('r11-tier-label').textContent), null, { timeout: 30000 }).catch(() => {});
    r = await page.evaluate(() => ({ tier: document.getElementById('r11-tier').textContent, bench: document.getElementById('r11-bench').textContent, lab: document.getElementById('r11-tier-label').textContent, lab2: document.getElementById('r11-bench-label').textContent }));
    check(/^Auto : (Ultra|Élevé|Téléphone)$/.test(r.tier) && r.bench === 'Lancer le banc d\'essai' && /Qualité graphique/.test(r.lab) && /^Banc d'essai/.test(r.lab2), 'Options: the rows are in French ' + JSON.stringify(r));
    await page.screenshot({ path: path.join(SHOTS, 'options-fr.png') });
    await page.evaluate(() => { ACCESS.setLocale('en'); closeModal(); G.state = 'play'; });
    await page.waitForTimeout(500);

    // ---- every TEXTS string has a French pair
    const texts = await page.evaluate(() => R11BENCH.TEXTS);
    const pairs = new Map(fs.readFileSync(path.join(__dirname, '..', 'tools/i18n/r11-bench.tsv'), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')));
    const miss = texts.filter((t) => !pairs.get(t));
    check(!miss.length, 'every new string has a French pair (' + miss.length + ' missing' + (miss[0] ? ': ' + miss[0] : '') + ')');

    // ---- the benchmark path stays on open ground
    r = await page.evaluate(() => {
      const m = buildAllMaps().oakhaven, p = R11BENCH.buildPath(m); let bad = 0, maxStep = 0, prev = null;
      for (let k = 0; k < 1; k += 0.002) { const q = p.at(k); if (m.get(Math.floor(q.x), Math.floor(q.y))) bad++; if (prev) maxStep = Math.max(maxStep, Math.hypot(q.x - prev.x, q.y - prev.y)); prev = q; }
      return { bad, len: Math.round(p.length), maxStep: +maxStep.toFixed(3) };
    });
    check(r.bad === 0 && r.len > 60, 'the benchmark path never enters a wall (' + JSON.stringify(r) + ')');

    // ---- run(): the game is put back exactly
    const before = await page.evaluate(() => {
      G.state = 'play'; loadMap('tavern', undefined); G.tod = 0.33; restoreGame(snapshotGame()); G.state = 'paused';   // a restore normalises the save exactly as the benchmark's own restore will
      const s = snapshotGame(); delete s.when; for (const k in s.flags) if (/^p7t_/.test(k)) delete s.flags[k];   // p7t_* are wall-clock play-time counters that every snapshot advances
      window.__before = JSON.stringify(s); window.__cam = { id: G.mapId, x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir };
      return window.__cam;
    });
    const mid = await page.evaluate(async () => { const p = R11BENCH.run({ duration: 3000 }); await new Promise((r) => setTimeout(r, 1500)); const m = { day: G.day, tod: G.tod, map: G.mapId, state: G.state, ev: !document.getElementById('event').classList.contains('hide') && getComputedStyle(document.getElementById('event')).display !== 'none' }; window.__rep = await p; return m; });
    const rep = await page.evaluate(() => window.__rep);
    check(mid.map === 'oakhaven' && mid.day === 17 && mid.day % 8 === 1 && Math.abs(mid.tod - 10 / 24) < 0.01 && mid.state === 'paused' && !mid.ev, 'mid-run: Oakhaven on an ordinary Rootday at 10:00, no card or event ' + JSON.stringify(mid));
    check(rep && rep.frames > 0, 'run({ duration: 3000 }) completes (' + (rep && rep.frames) + ' frames)');
    const after = await page.evaluate(() => { const s = snapshotGame(); delete s.when; for (const k in s.flags) if (/^p7t_/.test(k)) delete s.flags[k]; return { json: JSON.stringify(s), cam: { id: G.mapId, x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir }, state: G.state, same: JSON.stringify(s) === window.__before }; });
    let why = '';
    if (!after.same) { why = await page.evaluate(() => { const s = snapshotGame(), b = JSON.parse(window.__before), out = []; delete s.when; const d = (x, y, pth) => { if (out.length > 8) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) d(x[k], y[k], pth + '.' + k); } else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(pth + ' ' + JSON.stringify(x) + '->' + JSON.stringify(y)); }; d(b, s, ''); return out.join('; '); }); }
    check(after.same, 'the game state afterwards equals the snapshot from before, JSON compared' + (why ? ' (differs: ' + why + ')' : ''));
    check(after.cam.id === before.id && Math.abs(after.cam.x - before.x) < 1e-9 && Math.abs(after.cam.y - before.y) < 1e-9 && Math.abs(after.cam.dir - before.dir) < 1e-9, 'the map and position are restored (' + JSON.stringify(after.cam) + ')');
    const fields = ['scene', 'renderer', 'tier', 'tierMode', 'date', 'frames', 'fps', 'avgMs', 'p50Ms', 'p95Ms', 'p99Ms', 'draws', 'triangles', 'renderSize', 'gpu', 'ua', 'dpr', 'restored'];
    const lack = fields.filter((f) => !(f in rep));
    check(!lack.length && ['R11', 'R3D', 'raycaster'].includes(rep.renderer) && rep.fps > 0 && rep.p99Ms >= rep.p95Ms && rep.p95Ms >= rep.p50Ms && rep.renderSize[0] > 0 && rep.restored === true && typeof rep.gpu === 'string' && rep.gpu.length > 0, 'the report has every field (' + (lack.join(',') || 'none missing') + ', renderer ' + rep.renderer + ', gpu ' + rep.gpu + ')');
    check(JSON.stringify(await page.evaluate(() => R11BENCH.report())) === JSON.stringify(rep), 'report() returns the same object');
    const card = await page.evaluate(() => ({ title: document.querySelector('#event-panel h2') && document.querySelector('#event-panel h2').textContent, copy: !!document.getElementById('r11b-copy'), state: G.state, text: document.getElementById('event-panel').innerText }));
    check(card.title === 'Benchmark result' && card.copy && card.state === 'event' && /Average frame/.test(card.text) && /GPU/.test(card.text) && /Renderer/.test(card.text), 'the result card shows with a Copy report button');
    await page.screenshot({ path: path.join(SHOTS, 'card-en.png') });
    // copy: permission granted -> clipboard holds the JSON; denied -> the textarea holds it selected
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    await page.locator('#r11b-copy').click(); await page.waitForTimeout(400);
    const clip = await page.evaluate(async () => { try { return JSON.parse(await navigator.clipboard.readText()).scene; } catch (e) { return 'ERR ' + e.message; } });
    check(clip === 'oakhaven-square-10:00', 'Copy report puts the JSON on the clipboard (' + clip + ')');
    await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }); document.getElementById('r11b-copy').click(); });
    await page.waitForTimeout(300);
    const ta = await page.evaluate(() => { const t = document.getElementById('r11b-ta'); return t ? { ok: JSON.parse(t.value).scene, sel: t.selectionEnd - t.selectionStart > 100 } : null; });
    check(ta && ta.ok === 'oakhaven-square-10:00' && ta.sel, 'when copying fails the JSON is shown selected in a textarea');
    await page.evaluate(() => ACCESS.setLocale('fr'));
    await page.waitForTimeout(1200);
    const fr = await page.evaluate(() => document.getElementById('event-panel').innerText);
    check(/Résultat du banc d'essai/.test(fr) && /Image moyenne/.test(fr) && /Copi/.test(fr), 'the result card is in French');
    await page.screenshot({ path: path.join(SHOTS, 'card-fr.png') });
    await page.evaluate(() => { ACCESS.setLocale('en'); document.querySelector('#event-panel .list button').click(); });
    check((await page.evaluate(() => G.state)) === 'play', 'closing the card goes back to play');

    // ---- renderScale on synthetic samples
    r = await page.evaluate(() => {
      const B = R11BENCH, out = {}; B.choose('high'); B._reset();
      for (let i = 0; i < 29; i++) B.sample(30);
      out.early = B.renderScale();                                           // under 30 samples: nothing yet
      B.sample(30);
      out.down1 = B.renderScale();                                           // one step of 0.1
      const seq = []; for (let i = 0; i < 300; i++) { B.sample(30); if (i % 30 === 29) seq.push(B.renderScale()); }
      out.seq = seq;                                                         // keeps stepping, never faster than once a second, floor 0.5
      B._reset(); for (let i = 0; i < 400; i++) B.sample(30);
      out.floor = B.renderScale();
      let up = []; for (let i = 0; i < 1500; i++) { B.sample(8); if (i % 150 === 149) up.push(B.renderScale()); }
      out.up = up;
      B._reset(); for (let i = 0; i < 300; i++) B.sample(14); out.band = B.renderScale();     // between 75% and 100% of budget: holds
      B.choose('phone'); B._reset(); for (let i = 0; i < 300; i++) B.sample(30); out.phoneOk = B.renderScale();   // 30 ms is inside the phone budget
      for (let i = 0; i < 300; i++) B.sample(45); out.phoneSlow = B.renderScale();
      B.choose('high'); B._reset(); B.sample(5000); B.sample(-1); B.sample(NaN); out.junk = B.renderScale();
      B._reset(); const t0 = []; for (let i = 0; i < 200; i++) { const before = B.renderScale(); B.sample(30); const a = B.renderScale(); if (a !== before) t0.push(B.state.clock); }
      out.gaps = t0.map((v, i) => i ? v - t0[i - 1] : null).filter((v) => v != null);
      B.choose('auto'); B._reset();
      return out;
    });
    check(r.early === 1 && r.down1 === 0.9, 'renderScale steps down 0.1 when the median is over budget, not before 30 samples (' + r.early + ', ' + r.down1 + ')');
    check(r.seq.every((v, i) => i === 0 || v <= r.seq[i - 1]) && r.floor === 0.5, 'it keeps stepping down to a floor of 0.5 (' + r.seq.join(',') + ' / floor ' + r.floor + ')');
    check(r.gaps.length > 1 && r.gaps.every((g) => g >= 1000), 'at most one step a second (gaps ms ' + r.gaps.join(',') + ')');
    check(r.up[r.up.length - 1] === 1 && r.up.every((v, i) => i === 0 || v >= r.up[i - 1]) && r.up[0] > 0.5, 'under 75% of the budget it steps back up by 0.05 to 1 (' + r.up.join(',') + ')');
    check(r.band === 1 && r.phoneOk === 1 && r.phoneSlow < 1 && r.junk === 1, 'the in-between band holds, the phone budget is 33 ms, stalls and junk are ignored (' + JSON.stringify({ band: r.band, phoneOk: r.phoneOk, phoneSlow: r.phoneSlow }) + ')');

    // ---- autoTier: heuristics, the first-play check, and a manual choice is never overridden
    r = await page.evaluate(() => {
      const B = R11BENCH, out = {};
      out.pick = [B.pick({ coarse: true, cores: 8, mem: 8 }), B.pick({ coarse: true }), B.pick({ mobile: true, cores: 6, mem: 4 }), B.pick({ cores: 16, mem: 8 }), B.pick({ cores: 12 }), B.pick({ cores: 4, mem: 8 }), B.pick({ mem: 2, cores: 12 }), B.pick({})];
      G.state = 'play';
      B.choose('auto'); const start = B.tier(); out.start = start;
      for (let i = 0; i < 400; i++) B.sample(60);                              // 24 s of 60 ms frames
      out.afterSlow = B.tier(); out.stored = JSON.parse(localStorage.getItem('octave.r11.v1'));
      B.choose('auto'); for (let i = 0; i < 400; i++) B.sample(5); out.afterFast = B.tier();  // smooth play keeps the pick
      B.choose('ultra'); for (let i = 0; i < 400; i++) B.sample(80); out.manualHeld = B.tier(); out.manualStored = JSON.parse(localStorage.getItem('octave.r11.v1'));
      out.autoTierManual = B.autoTier(); out.choice = B.choice();
      localStorage.setItem('octave.r11.v1', JSON.stringify({ style: 'realistic', tier: 'phone', tierManual: true })); out.afterReload = B.autoTier(); out.styleKept = JSON.parse(localStorage.getItem('octave.r11.v1')).style;
      B.choose('auto');
      return out;
    });
    check(r.pick.join(',') === 'high,phone,phone,ultra,ultra,high,high,high', 'the first-run pick from touch, user agent, memory and cores (' + r.pick.join(',') + ')');
    check(r.start && (r.afterSlow === 'phone' || (r.start === 'phone' && r.afterSlow === 'phone') || r.afterSlow === ({ ultra: 'high', high: 'phone', phone: 'phone' })[r.start]) && r.stored.tierChecked === true && r.stored.tierManual === false, 'auto: slow first seconds of play step the tier down one (' + r.start + ' -> ' + r.afterSlow + ')');
    check(r.afterFast === r.start, 'auto: smooth first seconds keep the pick (' + r.afterFast + ')');
    check(r.manualHeld === 'ultra' && r.manualStored.tier === 'ultra' && r.manualStored.tierManual === true && r.autoTierManual === 'ultra' && r.choice === 'ultra', 'a manual choice is never overridden by slow frames or by autoTier()');
    check(r.afterReload === 'phone' && r.styleKept === 'realistic', 'autoTier() returns the stored manual choice and leaves CORE\'s keys alone');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors[0] : ''));
  } finally { await browser.close(); }
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL ' + (e && e.stack || e)); process.exit(1); });
