// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/daily18.test.js
// Phase 18, team DAILY: the daily challenge dungeon (js/daily18.js) and its one option in js/extras17.js ({ hidden: true }).
//   determinism (the same date gives the same map hash in two fresh pages and the pinned golden hash; different dates and
//   practice seeds differ), an independent BFS over every floor of 60 dates (spawn, stair reachable with locks shut, every
//   item reachable, no foe near the spawn, heights within a step, no fallback layout), no damage standing at the start,
//   scoring, the share code (round trip, tamper and forgery rejection), the results table (hostile storage), a whole run
//   by the UI (title button, intro, stairs, kills, treasure, the climb out, the result card), the fall and Abandon, no saves
//   inside a run, isolation of the Book One save (byte-identical, loadable), the Extras menu never lists it, French, the
//   640x400 title and panel, frame cost in a full room, and no page errors.
// Uses the served preview; never starts a server. SHOTS=<dir> writes screenshots (Medium and Cinematic).
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';
// the three floors of 2026-10-20, pinned: any change to the generator (or to a texture/prop name it writes) moves this
const GOLDEN = { key: '20261020', hash: process.env.D18_GOLDEN || 'f867c2723ae327f6-79c5c54af1fd2fea-051647c6b9cd3f89' };

async function boot(browser, viewport, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /daily18|extras17/.test(m.text())) errors.push('warn: ' + m.text()); });
  await page.addInitScript(() => { let s = 18018; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  if (opts.clear !== false) await page.addInitScript(() => { try { if (!sessionStorage.getItem('d18kept')) { localStorage.removeItem('octave.daily18.v1'); localStorage.removeItem('octave.extras17.v1'); sessionStorage.setItem('d18kept', '1'); } } catch (e) { /* ignore */ } });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof DAILY18 !== 'undefined');
  return { page, errors };
}
async function toGame(page, name) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(name || 'Daily Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(200);
}

// an independent check of one built floor (written here, not borrowed from the module)
const AUDIT = () => {
  window.__audit = function (m) {
    const W = m.w, H = m.h, out = { errs: [] };
    const solidDeco = new Uint8Array(W * H);
    for (const e of m.entities) if (e.kind === 'deco' && e.solid !== false && (e.radius || 0.35) >= 0.15) solidDeco[(e.y | 0) * W + (e.x | 0)] = 1;
    const lv = (i) => (m.lvls ? m.lvls[i] : 0);
    const flood = (sx, sy, locks) => {
      const seen = new Int32Array(W * H).fill(-1);
      const open = (x, y) => {
        if (x < 0 || y < 0 || x >= W || y >= H) return false;
        const i = y * W + x, c = m.cells[i];
        if (c && (!c.door || c.portal || (c.lockDifficulty && !locks))) return false;
        if (m.floorCells && m.floorCells[i] === 2) return false;
        return !solidDeco[i];
      };
      if (!open(sx, sy)) return seen;
      const q = [[sx, sy]]; seen[sy * W + sx] = 0;
      for (let h = 0; h < q.length; h++) {
        const [x, y] = q[h];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!open(nx, ny)) continue;
          const j = ny * W + nx; if (seen[j] >= 0) continue;
          if (Math.abs(lv(j) - lv(y * W + x)) >= STEP_UP) { out.errs.push('step ' + nx + ',' + ny); continue; }
          seen[j] = seen[y * W + x] + 1; q.push([nx, ny]);
        }
      }
      return seen;
    };
    const sx = m.spawn.x | 0, sy = m.spawn.y | 0;
    const shut = flood(sx, sy, false), all = flood(sx, sy, true);
    if (shut[sy * W + sx] !== 0) out.errs.push('spawn blocked');
    // the stair: a portal door with an open cell in front of it, reachable with every lock shut
    const portals = [];
    for (let i = 0; i < m.cells.length; i++) { const c = m.cells[i]; if (c && c.portal) portals.push(i); }
    if (portals.length !== 1) out.errs.push('portals ' + portals.length);
    let stairOk = false, stairSteps = -1;
    for (const i of portals) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (shut[j] >= 0) { stairOk = true; stairSteps = Math.max(stairSteps, shut[j]); } }
      out.portal = m.cells[i].portal;
    }
    if (!stairOk) out.errs.push('stair unreachable');
    out.stairSteps = stairSteps;
    let minFoe = 1e9, foes = 0, items = 0, unreach = 0;
    for (const e of m.entities) {
      const i = (e.y | 0) * W + (e.x | 0);
      if (e.kind === 'item') { items++; if (all[i] < 0) unreach++; }
      if (e.kind === 'enemy') {
        foes++;
        const d = shut[i] >= 0 ? shut[i] : (all[i] >= 0 ? all[i] : 1e9);
        minFoe = Math.min(minFoe, d);
        if (Math.hypot(e.x - m.spawn.x, e.y - m.spawn.y) < 8) out.errs.push('foe within 8 cells');
        if (all[i] < 0) out.errs.push('foe unreachable');
      }
    }
    if (unreach) out.errs.push(unreach + ' items unreachable');
    if (minFoe < 11) out.errs.push('foe ' + minFoe + ' steps from the spawn');
    // every open floor cell is reachable (no sealed pockets) once locks are picked
    let pockets = 0;
    for (let i = 0; i < W * H; i++) if (!m.cells[i] && m.floorCells[i] !== 2 && !solidDeco[i] && all[i] < 0) pockets++;
    if (pockets) out.errs.push(pockets + ' open cells sealed off');
    Object.assign(out, { minFoe, foes, items, attempt: m._d18.attempt, w: W, h: H });
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } else console.log('ok: ' + m); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);

    // ------------------------------------------------------------ 1. contract, registration, title button
    const base = await ev(() => {
      const x = EXTRAS17.list().find((r) => r.id === 'daily18');
      const menu = [...document.querySelectorAll('#title .menu button')].map((b) => b.id);
      return { reg: !!x, hidden: !!(x && x.hidden), btn: (document.getElementById('btn-daily') || {}).textContent, menu, playable: EXTRAS17.playable('daily18'), opened: EXTRAS17.opened(), texts: DAILY18.TEXTS };
    });
    check(base.reg && base.hidden, 'the run is registered with EXTRAS17 as a hidden extra');
    check(base.btn === 'Daily challenge' && base.menu.indexOf('btn-daily') > base.menu.indexOf('btn-extras') && base.menu.indexOf('btn-daily') < base.menu.indexOf('btn-help'), 'the title screen has a "Daily challenge" button before How to play (' + base.menu.join(', ') + ')');
    check(base.playable && !base.opened, 'it is playable without the Book One unlock (the extras themselves stay locked)');
    check(base.texts.every((t) => typeof t === 'string' && t && !/[\u{1F300}-\u{1FAFF}]/u.test(t) && !/\bscream/i.test(t) && !/[<>&]/.test(t)), 'texts are non-empty, emoji-free, markup-free, nobody screams');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p18-daily.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const noFr = base.texts.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2 && r[1].trim()), 'every string has a French pair (' + base.texts.length + ' strings, ' + noFr.length + ' missing: ' + noFr.slice(0, 3).join(' | ') + ')');
    const ph = (s) => (s.match(/\{\d\}/g) || []).sort().join();
    check(tsv.every((r) => ph(r[0]) === ph(r[1])), 'the French keeps every {n} placeholder');
    // the Extras menu never lists it
    const xm = await ev(() => { EXTRAS17.state.ack = 1; EXTRAS17.open(); const o = { panel: G.openPanel, card: !!document.querySelector('[data-extra="daily18"]'), txt: document.getElementById('modal-panel').textContent }; closeModal(); EXTRAS17.state.ack = 0; return o; });
    check(xm.panel === 'x17menu' && !xm.card && !/Daily challenge/.test(xm.txt), 'the Extras menu does not list the daily challenge');

    // ------------------------------------------------------------ 2. determinism: hashes
    const h1 = await ev((k) => ({ h: DAILY18.hashKey(k), again: DAILY18.hashKey(k), theme: [1, 2, 3].map((f) => DAILY18.themeFor(k, f).name) }), GOLDEN.key);
    const B = await boot(browser); allErrors.push(B.errors);
    const h2 = await B.page.evaluate((k) => DAILY18.hashKey(k), GOLDEN.key);
    await B.page.close();
    check(h1.h === h1.again && h1.h === h2, 'the same date gives the same map hash, twice in one page and in a second fresh page (' + h1.h + ')');
    if (GOLDEN.hash) check(h1.h === GOLDEN.hash, 'the hash of ' + GOLDEN.key + ' matches the pinned golden hash ' + GOLDEN.hash);
    else console.log('     (no D18_GOLDEN given: the hash of ' + GOLDEN.key + ' is ' + h1.h + ')');
    const many = await ev(() => {
      const out = { keys: [], hashes: [], floorHashes: new Set(), themes: new Set() };
      for (let i = 0; i < 60; i++) { const k = DAILY18.dayKey(new Date(Date.UTC(2026, 9, 20 + i))); out.keys.push(k); const ms = DAILY18.buildAll(k); const hs = ms.map(DAILY18.hashMap); out.hashes.push(hs.join('-')); hs.forEach((h) => out.floorHashes.add(h)); ms.forEach((m) => out.themes.add(m._d18.theme)); }
      const p1 = DAILY18.hashKey('p1'), p2 = DAILY18.hashKey('p2');
      return { keys: out.keys, n: new Set(out.hashes).size, floors: out.floorHashes.size, themes: [...out.themes].sort(), p1, p2, pIn: out.hashes.includes(p1) };
    });
    check(many.n === 60 && many.floors === 180, 'different dates differ: 60 dates give 60 different dungeons and 180 different floors');
    check(many.p1 !== many.p2 && !many.pIn, 'practice seeds give their own dungeons');
    check(many.themes.length === 6, 'all six floor looks appear across the 60 dates (' + many.themes.join(', ') + ')');
    check(await ev(() => DAILY18.dayKey(new Date(Date.UTC(2026, 9, 20, 23, 59))) === '20261020' && DAILY18.dayKey(new Date(Date.UTC(2026, 9, 21, 0, 0))) === '20261021'), 'the day turns at midnight UTC');

    // ------------------------------------------------------------ 3. 60 dates: BFS on every floor
    await ev(AUDIT);
    const audit = await ev((keys) => {
      const res = { errs: [], attempts: 0, maxAttempt: 0, foes: 0, items: 0, minFoe: 1e9, stairMin: 1e9, stairMax: 0, ms: 0 };
      const t0 = performance.now();
      for (const k of keys) {
        const ms = DAILY18.buildAll(k);
        ms.forEach((m, i) => {
          const a = __audit(m);
          for (const e of a.errs) res.errs.push(k + ' f' + (i + 1) + ': ' + e);
          const want = i < 2 ? { d18: 'down', map: 'd18_f' + (i + 2) } : { d18: 'out' };
          if (!a.portal || a.portal.d18 !== want.d18 || (want.map && a.portal.map !== want.map)) res.errs.push(k + ' f' + (i + 1) + ': wrong stair ' + JSON.stringify(a.portal));
          res.attempts += a.attempt; res.maxAttempt = Math.max(res.maxAttempt, a.attempt); res.foes += a.foes; res.items += a.items; res.minFoe = Math.min(res.minFoe, a.minFoe);
          res.stairMin = Math.min(res.stairMin, a.stairSteps); res.stairMax = Math.max(res.stairMax, a.stairSteps);
        });
      }
      res.ms = (performance.now() - t0) / keys.length;
      return res;
    }, many.keys);
    check(audit.errs.length === 0, '60 dates x 3 floors: spawn open, the stair reachable with every lock shut, every item reachable, no sealed pockets, no foe within 11 steps / 8 cells, heights within a step (' + audit.errs.slice(0, 4).join(' | ') + ')');
    check(audit.maxAttempt < 24, 'no floor fell back to the fixed layout (rebuild attempts: ' + audit.attempts + ' in 180 floors, worst ' + audit.maxAttempt + ')');
    console.log('     ' + audit.foes + ' foes, ' + audit.items + ' items over 180 floors; nearest foe ' + audit.minFoe + ' steps; stair ' + audit.stairMin + '..' + audit.stairMax + ' steps from the spawn; ' + audit.ms.toFixed(1) + ' ms to build a day');

    // ------------------------------------------------------------ 4. scoring and the share code
    const sc = await ev(() => {
      const S = DAILY18.scoreOf;
      const out = {
        cleared: S({ t: 420, n: 12, e: 2, r: 205, h: 18, f: 3, w: 2 }),
        fell: S({ t: 300, n: 5, e: 0, r: 60, h: 30, f: 2, w: 1 }),
        floor: S({ t: 10, n: 0, e: 0, r: 0, h: 0, f: 1, w: 0 }),
        slow: S({ t: 900, n: 0, e: 0, r: 0, h: 0, f: 3, w: 2 }),
        hurt: S({ t: 100, n: 0, e: 0, r: 0, h: 200, f: 1, w: 1 }),
      };
      const k = '20261020', T = DAILY18.totals(k);
      const parts = { t: 433, n: Math.min(9, T.foes), e: Math.min(1, T.elites), r: Math.min(140, T.treasure), h: 23, f: 3, w: 2 };
      const code = DAILY18.makeCode(k, parts), back = DAILY18.checkCode(code), lower = DAILY18.checkCode(' ' + code.toLowerCase() + ' ');
      const pcode = DAILY18.makeCode('p4242', { t: 77, n: 1, e: 0, r: 10, h: 4, f: 1, w: 0 }), pback = DAILY18.checkCode(pcode);
      const flip = (s, i) => s.slice(0, i) + (s[i] === '1' ? '2' : '1') + s.slice(i + 1);
      const segs = code.split('-');
      const tamper = {
        score: DAILY18.checkCode(segs.slice(0, 2).concat([String(+segs[2] + 1)], segs.slice(3)).join('-')),
        date: DAILY18.checkCode(code.replace('20261020', '20261021')),
        payload: DAILY18.checkCode(segs.slice(0, 3).concat([flip(segs[3], segs[3].length - 1)], segs.slice(4)).join('-')),
        chk: DAILY18.checkCode(segs.slice(0, 4).concat([flip(segs[4], 0)]).join('-')),
        junk: DAILY18.checkCode('<img src=x onerror=alert(1)>'), empty: DAILY18.checkCode(''), nul: DAILY18.checkCode(null),
      };
      // forgeries with a correct checksum (the salt is in the source): impossible numbers are still refused
      const forge = {
        kills: DAILY18.checkCode(DAILY18.makeCode(k, Object.assign({}, parts, { n: T.foes + 1 }))),
        treasure: DAILY18.checkCode(DAILY18.makeCode(k, Object.assign({}, parts, { r: T.treasure + 5 }))),
        elites: DAILY18.checkCode(DAILY18.makeCode(k, Object.assign({}, parts, { e: 3, n: 2 }))),
        clearEarly: DAILY18.checkCode(DAILY18.makeCode(k, Object.assign({}, parts, { f: 2 }))),
        future: DAILY18.checkCode(DAILY18.makeCode('20991231', { t: 300, n: 0, e: 0, r: 0, h: 0, f: 1, w: 0 })),
        badDate: DAILY18.checkCode(DAILY18.makeCode('20260231', { t: 300, n: 0, e: 0, r: 0, h: 0, f: 1, w: 0 })),
        instant: DAILY18.checkCode(DAILY18.makeCode(k, Object.assign({}, parts, { t: 3 }))),
      };
      return { out, code, back, lower: !!lower, parts, pcode, pback, tamper, forge, T };
    });
    const exp = { cleared: 2 * 150 + 500 + 180 + 12 * 20 + 2 * 40 + 205 - 18 * 3, fell: 150 + 5 * 20 + 60 - 30 * 3, floor: 0, slow: 300 + 500, hurt: 0 };
    check(JSON.stringify(sc.out) === JSON.stringify(exp), 'score = floors 150 each + climb out 500 + (600 - seconds) + 20 a kill + 40 an elite + treasure - 3 per hp lost, never below 0 ' + JSON.stringify(sc.out));
    check(/^D18-20261020-\d+-[0-9A-Z]+-[0-9A-Z]{5}$/.test(sc.code) && sc.back && sc.back.key === '20261020' && JSON.stringify(sc.back.parts) === JSON.stringify(sc.parts) && sc.lower, 'the share code round-trips (' + sc.code + '; case and spaces forgiven)');
    check(/^P18-4242-/.test(sc.pcode) && sc.pback && sc.pback.key === 'p4242', 'a practice code names its seed (' + sc.pcode + ')');
    check(Object.values(sc.tamper).every((v) => v === null), 'tampered codes are rejected: score, date, payload, checksum, junk and markup');
    check(Object.values(sc.forge).every((v) => v === null), 'forged codes with a good checksum are still rejected: more kills / treasure / elites than the day holds, a clear before floor 3, a future or impossible date, a 3-second clear');
    console.log('     ' + sc.code + ' -> ' + JSON.stringify(sc.back.parts) + '; day 20261020 holds ' + JSON.stringify(sc.T));

    // ------------------------------------------------------------ 5. hostile results storage
    const hostile = await ev(() => {
      localStorage.setItem('octave.daily18.v1', JSON.stringify({ runs: [
        { k: '20261020', t: 400, n: 3, e: 0, r: 40, h: 5, f: 3, w: 2, s: 999999 },
        { k: '<b>x</b>', t: 1, n: 1, e: 0, r: 0, h: 0, f: 1, w: 0 }, { k: '20261020', t: -5, n: 1, e: 0, r: 0, h: 0, f: 1, w: 0 },
        { k: 'p0', t: 1, n: 1, e: 0, r: 0, h: 0, f: 1, w: 0 }, null, 'junk', { k: '20261020', t: 1.5, n: 0, e: 0, r: 0, h: 0, f: 9, w: 0 },
      ] }));
      DAILY18.loadStore();
      const r = DAILY18.store.runs.map((x) => ({ k: x.k, s: x.s }));
      localStorage.setItem('octave.daily18.v1', '{not json'); DAILY18.loadStore(); const junk = DAILY18.store.runs.length;
      localStorage.removeItem('octave.daily18.v1'); DAILY18.loadStore();
      return { r, junk };
    });
    check(hostile.r.length === 1 && hostile.r[0].s === 1085 && hostile.junk === 0, 'hostile storage: bad keys, ranges and junk are dropped; the stored score is recomputed, never trusted ' + JSON.stringify(hostile.r));

    // ------------------------------------------------------------ 6. a Book One game to protect
    await toGame(pg, 'Book One Keeper');
    const book = await ev(async () => {
      G.flags.test_mark = 7; G.player.gold = 99; G.day = 4; G.give('honey', 2);
      renderSave(); await new Promise((r) => setTimeout(r, 50));
      document.querySelector('[data-slot="0"]').click();
      UPG.autosaveSlot = snapshotGame(); UPG.autosaveWhen = 'Oakhaven (day 4)';
      window.__bookCode = await saveCode();
      window.__book = { player: G.player, flags: G.flags, maps: G.maps, map: G.map, journal: G.journal, slot0: SLOTS[0], auto: UPG.autosaveSlot };
      closeModal(); G.state = 'play';
      return { slots: SLOTS.map((s) => !!s) };
    });
    check(book.slots[0], 'a Book One game saved to session slot 1, with an autosave and a code');
    await ev(() => { renderMenu(); }); await pg.locator('#mn-title').click();
    const bookAt = await ev(() => ({ flush: snapshotGame() && 1, slot: JSON.stringify(SLOTS[0]), auto: JSON.stringify(UPG.autosaveSlot), when: UPG.autosaveWhen, flags: JSON.stringify(G.flags), map: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir] }));

    // ------------------------------------------------------------ 7. a whole run, by the UI
    await ev(() => DAILY18.setClock(() => new Date(Date.UTC(2026, 9, 20, 12, 0))));
    await pg.locator('#btn-daily').click();
    const panel = await ev(() => ({ panel: G.openPanel, state: G.state, today: (document.getElementById('d18-today') || {}).textContent, none: !!document.getElementById('d18-none'), over: document.getElementById('modal-panel').scrollWidth - document.getElementById('modal-panel').clientWidth }));
    check(panel.panel === 'd18menu' && panel.state === 'title' && panel.today === '2026-10-20' && panel.none && panel.over <= 1, 'the button opens the Daily challenge panel over the title: today 2026-10-20, no runs yet, no overflow');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/d18-panel.png' });
    await pg.locator('#d18-play').click();
    const intro = await ev(() => ({ state: G.state, map: G.mapId, inX: EXTRAS17.inExtra(), ev: document.getElementById('event-panel').textContent, banner: document.getElementById('x17-banner').textContent, hud: !document.getElementById('d18-hud').hidden, maps: DAILY18.IDS.every((id) => !!G.maps[id]), hashes: DAILY18.R.hashes.join('-'), notBook: G.player !== __book.player && G.flags !== __book.flags, slots: SLOTS.map((s) => !!s), auto: !!UPG.autosaveSlot }));
    check(intro.inX === 'daily18' && intro.state === 'event' && intro.map === 'd18_f1' && /2026-10-20/.test(intro.ev) && /Three floors down/.test(intro.ev), 'Begin starts the run on floor 1 behind an intro card with the date');
    check(intro.banner === 'Daily challenge' && !/after Book One/.test(intro.banner) && intro.hud, 'the banner reads only "Daily challenge" (no "An extra — after Book One"); the HUD strip shows');
    check(intro.maps && intro.hashes === h1.h, 'the run plays exactly the floors that were hashed');
    check(intro.notBook && intro.slots.every((s) => !s) && !intro.auto, 'the run is an isolated session: Book One player, flags, slots and autosave are put aside');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/d18-intro.png' });
    await pg.locator('#event-panel button').first().click();
    const kit = await ev(() => { const p = G.player; return { state: G.state, hp: p.hp, hpMax: p.hpMax, w: p.weapons.join(), pel: p.pellets, inv: p.inv.map((s) => s.id + 'x' + s.n).join(), armor: Object.values(p.armor).sort().join(), lvl: p.level, gold: p.gold, map: G.map.danger + '/' + G.map.siphoned }; });
    check(kit.state === 'play' && kit.hp === 30 && kit.hpMax === 30 && kit.w === 'sword,pistol' && kit.pel === 9 && /tonicx2/.test(kit.inv) && /honeyx1/.test(kit.inv) && kit.armor === 'a_cap,a_gambeson,a_softboots' && kit.lvl === 1 && kit.gold === 0, 'the fixed kit: 30 hp, short sword and pistol with 9 pellets, cap, gambeson, boots, two tonics, honey ' + JSON.stringify(kit));
    check(kit.map === '0/false', 'floors are danger 0 (no random hounds) and not siphoned (no unwriting)');
    // no damage standing at the start: 40 s with nobody touching the controls, every floor
    const idle = await ev(() => {
      const out = [];
      for (let f = 1; f <= 3; f++) {
        const m = G.maps['d18_f' + f]; if (G.mapId !== m.id) loadMap(m.id, m.spawn);
        const p = G.player; p.hp = p.hpMax; DAILY18.R.lastHp = p.hp; const hurt0 = DAILY18.R.hurt;
        let chase = 0;
        for (let i = 0; i < 800; i++) { G.state = 'play'; G.keys = {}; update(0.05); for (const e of G.ents) if (e.kind === 'enemy' && !e.dead && e.state === 'chase') chase++; }
        out.push({ f, hp: p.hp, hurt: DAILY18.R.hurt - hurt0, chase, tod: G.tod });
      }
      loadMap('d18_f1', G.maps.d18_f1.spawn);
      DAILY18.R.t = 0; DAILY18.R.hurt = 0; DAILY18.R.floor = 1;
      return out;
    });
    check(idle.every((o) => o.hp === 30 && o.hurt === 0 && o.chase === 0 && Math.abs(o.tod - 0.42) < 1e-9), 'standing still at the spawn for 40 s on every floor: no damage, nothing gives chase, the clock holds at mid-morning ' + JSON.stringify(idle));
    // no saves inside
    const saves = await ev(async () => {
      const o = {};
      renderMenu(); o.leave = (document.getElementById('mn-title') || {}).textContent;
      renderSave(); o.save = G.openPanel; o.note = !!document.getElementById('d18-nosave'); o.slotBtn = !!document.getElementById('x17-save-slot');
      renderLoad(false); o.load = G.openPanel;
      try { await saveCode(); o.code = true; } catch (e) { o.code = false; }
      closeModal(); G.state = 'play';
      o.slots = SLOTS.map((s) => !!s); o.extraSave = EXTRAS17.hasSave('daily18');
      return o;
    });
    check(saves.leave === 'Abandon the run' && saves.save === 'd18nosave' && saves.note && !saves.slotBtn && saves.load === 'd18nosave' && saves.code === false && saves.slots.every((s) => !s) && !saves.extraSave, 'inside a run: Save and Load show "no saves", no code, nothing written; Options offers "Abandon the run" ' + JSON.stringify(saves));
    // HUD, then play it through: a kill, a strongbox, the stairs, the climb out
    if (SHOTS) for (const preset of ['medium', 'cinematic']) {
      await ev((p) => { PRESETS.apply(p); GFX.reduceMotion = false; const m = G.maps.d18_f1; loadMap(m.id, m.spawn); G.fadeT = 0; document.getElementById('msgs').innerHTML = ''; }, preset);
      await pg.waitForTimeout(800); await pg.screenshot({ path: SHOTS + '/d18-' + preset + '-f1-spawn.png' });
    }
    await ev(() => PRESETS.apply('medium'));
    const run = await ev(() => {
      const R = DAILY18.R, o = {};
      const foe = G.ents.find((e) => e.kind === 'enemy' && !e.dead);
      killEnemy(foe, false); killEnemy(foe, false); o.kills = R.kills;
      const box = G.ents.find((e) => e.kind === 'item' && e._d18t && !(e.item === 'cache' && e.tier >= 2));
      const pts = box._d18t; pickUp(box); pickUp(box); o.treasure = R.treasure; o.pts = pts;
      const p = G.player; p.hp -= 7; update(0.05); o.hurt = R.hurt;
      R.t = 30;
      for (let f = 1; f <= 2; f++) { const st = G.map._d18.stairs; transfer(G.map.get(st.x, st.y).portal); o['floor' + f] = G.mapId + '@' + R.floor; }
      o.hudText = document.getElementById('d18-hud').textContent;
      const elite = G.ents.find((e) => e._d18elite); o.eliteHp = elite ? elite.hp + '/' + elite.def.hp : 'none';
      if (elite) { killEnemy(elite); } o.elites = R.elites;
      R.t = 312.4;
      const st = G.map._d18.stairs; transfer(G.map.get(st.x, st.y).portal);
      o.state = G.state; o.card = document.getElementById('event-panel').textContent;
      return o;
    });
    check(run.kills === 1 && run.treasure === run.pts && run.pts > 0 && run.hurt === 7, 'kills, treasure and damage are counted once each (' + JSON.stringify({ k: run.kills, t: run.treasure, h: run.hurt }) + ')');
    check(run.floor1 === 'd18_f2@2' && run.floor2 === 'd18_f3@3' && /Floor3\/3/.test(run.hudText.replace(/\s/g, '')), 'the stairs take you down to floor 2 and 3; the HUD follows (' + run.hudText + ')');
    check(/\/\d+/.test(run.eliteHp) && +run.eliteHp.split('/')[0] === Math.round(1.5 * +run.eliteHp.split('/')[1]) && run.elites === 1, 'elites on floor 3 have x1.5 hp and count as elites (' + run.eliteHp + ')');
    check(run.state === 'event' && /climbed out/.test(run.card) && /Score: \d+/.test(run.card), 'the stair up ends the run with a result card');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/d18-endcard.png' });
    await pg.locator('#event-panel button').first().click();
    const after = await ev(() => {
      const res = DAILY18.lastResult;
      return {
        state: G.state, panel: G.openPanel, inX: EXTRAS17.inExtra(), title: !document.getElementById('title').classList.contains('hidden'), hud: document.getElementById('d18-hud').hidden, banner: document.getElementById('x17-banner').hidden,
        card: !!document.getElementById('d18-result'), code: (document.getElementById('d18-code-out') || {}).value, best: !!document.getElementById('d18-best'), runs: DAILY18.store.runs.length, res,
        check: res ? DAILY18.checkCode(res.code) : null, rescore: res ? DAILY18.scoreOf(res.parts) : -1, bestToday: (document.getElementById('d18-best-today') || {}).textContent,
        slot: JSON.stringify(SLOTS[0]), auto: JSON.stringify(UPG.autosaveSlot), when: UPG.autosaveWhen, flags: JSON.stringify(G.flags), map: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir],
        same: G.player === __book.player && G.flags === __book.flags && G.maps === __book.maps && G.map === __book.map && G.journal === __book.journal && SLOTS[0] === __book.slot0 && UPG.autosaveSlot === __book.auto,
        noD18: !Object.keys(G.maps).some((k) => /^d18_/.test(k)), ls: localStorage.getItem('octave.daily18.v1'),
        ghost: typeof GHOST18 !== 'undefined' ? { on: GHOST18.enabled(), best: GHOST18.best('daily:20261020'), st: GHOST18.state() } : null,
      };
    });
    const P = after.res && after.res.parts;
    check(after.state === 'title' && after.panel === 'd18menu' && after.inX === null && after.title && after.hud && after.banner, 'See the results returns to the title with the Daily panel open; HUD and banner gone');
    check(P && P.w === 2 && P.f === 3 && P.n === 2 && P.e === 1 && P.t === 312 && P.h === 7 && after.res.score === after.rescore, 'the result: climbed out, floor 3, 2 kills (1 elite), 312 s, 7 hurt ' + JSON.stringify(P) + ' = ' + (after.res && after.res.score));
    check(after.card && after.code === after.res.code && after.check && after.check.score === after.res.score && after.best && after.runs === 1 && new RegExp(String(after.res.score)).test(after.bestToday), 'the result card shows the breakdown, the share code (which checks out), "a new best"; the table has the run');
    check(/"runs":\[\{"k":"20261020"/.test(after.ls || '') && !/<|>/.test(after.ls), 'the run is stored locally (validated fields only)');
    if (after.ghost && after.ghost.on) check(after.ghost.best && after.ghost.best.win === true && after.ghost.best.score === after.res.score && after.ghost.st.recording === null && after.ghost.st.playing === null, 'with Ghost replays on, the run was recorded and kept as the day\'s best ghost (' + JSON.stringify(after.ghost.best && { win: after.ghost.best.win, score: after.ghost.best.score, secs: after.ghost.best.secs }) + ')');
    else console.log('     (ghosts off or GHOST18 absent: ghost wiring not checked)');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/d18-result.png' });
    check(after.slot === bookAt.slot && after.auto === bookAt.auto && after.when === bookAt.when, 'the Book One session slot and autosave are byte-identical after the run');
    check(after.flags === bookAt.flags && after.same && after.map === bookAt.map && after.cam.join() === bookAt.cam.join() && after.noD18, 'the live Book One session is the same objects as before; no daily map leaks into it');
    // the code checker in the panel, by the UI
    await pg.locator('#d18-check-in').fill(after.res.code); await pg.locator('#d18-check').click();
    const ui1 = await ev(() => document.getElementById('d18-check-out').textContent);
    await pg.locator('#d18-check-in').fill(after.res.code.replace(/-(\d+)-/, (m, s) => '-' + (+s + 5) + '-')); await pg.locator('#d18-check').click();
    const ui2 = await ev(() => document.getElementById('d18-check-out').textContent);
    await pg.locator('#d18-check-in').fill('<img src=x onerror="window.__pwn=1">'); await pg.locator('#d18-check').click();
    const ui3 = await ev(() => ({ t: document.getElementById('d18-check-out').textContent, pwn: !!window.__pwn, imgs: document.querySelectorAll('#modal-panel img').length }));
    check(/A true code/.test(ui1) && new RegExp(String(after.res.score)).test(ui1) && /does not check out/.test(ui2) && /does not check out/.test(ui3.t) && !ui3.pwn && ui3.imgs === 0, 'the panel checks a code: a true one, a tampered one, markup (never parsed)');
    // Book One still loads
    const loads = await ev(async () => {
      const out = {}; closeModal(); renderLoad(true); document.querySelector('[data-slot="0"]').click();
      out.state = G.state; out.mark = G.flags.test_mark; out.gold = G.player.gold; out.noX = !Object.keys(G.flags).some((k) => k.startsWith('p17x_'));
      try { await loadCode(__bookCode); out.code = G.flags.test_mark === 7; } catch (e) { out.code = 'threw ' + e.message; }
      return out;
    });
    check(loads.state === 'play' && loads.mark === 7 && loads.gold === 99 && loads.noX && loads.code === true, 'the Book One slot and code load after the run');

    // ------------------------------------------------------------ 8. the fall and Abandon (practice runs)
    const fall = await ev(async () => {
      const o = {};
      renderMenu(); document.getElementById('mn-title').click();
      o.begin = DAILY18.begin('p777'); document.querySelector('#event-panel button').click();
      o.map = G.mapId; o.title = document.getElementById('x17-banner').textContent;
      damagePlayer(500, 'A test');
      o.death = !document.getElementById('death').classList.contains('hidden'); o.card = document.getElementById('event-panel').textContent;
      document.querySelector('#event-panel button').click();
      o.res = DAILY18.lastResult && DAILY18.lastResult.parts; o.key = DAILY18.lastResult && DAILY18.lastResult.key; o.state = G.state; o.inX = EXTRAS17.inExtra();
      closeModal();
      o.begin2 = DAILY18.begin('p778'); document.querySelector('#event-panel button').click();
      renderMenu(); document.getElementById('mn-title').click();
      o.card2 = document.getElementById('event-panel').textContent; document.querySelector('#event-panel button').click();
      o.res2 = DAILY18.lastResult && DAILY18.lastResult.parts; o.state2 = G.state; o.runs = DAILY18.store.runs.map((r) => r.k + ':' + r.w);
      // "Not now" on the intro leaves without a run on the table
      closeModal(); DAILY18.begin('p779'); document.querySelectorAll('#event-panel button')[1].click();
      o.state3 = G.state; o.runs3 = DAILY18.store.runs.length; o.panel3 = G.openPanel;
      return o;
    });
    check(fall.begin && fall.map === 'd18_f1' && !fall.death && /fell/.test(fall.card) && fall.res && fall.res.w === 1 && fall.res.h === 30 && fall.key === 'p777' && fall.state === 'title' && fall.inX === null, 'a fall ends the run (no death screen), scored with the hp lost; back on the title ' + JSON.stringify(fall.res));
    check(fall.begin2 && /left the run/.test(fall.card2) && fall.res2 && fall.res2.w === 0 && fall.state2 === 'title' && fall.runs.join() === 'p778:0,p777:1,20261020:2', 'Abandon the run (Options) ends it as left; the table keeps all three runs ' + fall.runs.join());
    check(fall.state3 === 'title' && fall.runs3 === 3 && fall.panel3 === null, '"Not now" on the intro leaves quietly, with nothing recorded');
    await pg.close();

    // ------------------------------------------------------------ 9. French
    const F = await boot(browser); allErrors.push(F.errors);
    const fr = await F.page.evaluate(async (list) => {
      await STORY_I18N.load('fr');
      const cat = STORY_I18N.cats.fr;
      for (const [en, frx] of list) if (!/\{\d\}/.test(en)) cat.s.set(STORY_I18N.hash(STORY_I18N.norm(en)), frx);
      await STORY_I18N.setLocale('fr');
      await new Promise((r) => setTimeout(r, 50));
      const btn = document.getElementById('btn-daily').textContent;
      DAILY18.open(); await new Promise((r) => setTimeout(r, 80));
      const h = document.querySelector('#modal-panel h2').textContent, play = document.getElementById('d18-play').textContent;
      const left = STORY_I18N.untranslated(document.getElementById('modal-panel'));
      closeModal(); await STORY_I18N.setLocale('en');
      return { btn, h, play, left };
    }, tsv);
    check(fr.btn === 'Défi du jour' && fr.h === 'Défi du jour' && /Commencer la partie du jour/.test(fr.play) && fr.left.length === 0, 'in French the button and the panel read in French, nothing left in English (' + fr.left.slice(0, 2).join(' | ') + ')');
    await F.page.close();

    // ------------------------------------------------------------ 10. compact 640x400
    const C = await boot(browser, { width: 640, height: 400 }); allErrors.push(C.errors);
    const fit = await C.page.evaluate(() => {
      const g = document.getElementById('game').getBoundingClientRect(), ti = document.querySelector('#title .title-inner').getBoundingClientRect();
      const b = document.getElementById('btn-daily').getBoundingClientRect();
      DAILY18.open(); const p = document.getElementById('modal-panel');
      return { titleFits: ti.right <= g.right + 1 && ti.bottom <= g.bottom + 1, btnIn: b.right <= g.right && b.bottom <= g.bottom && b.width > 0, over: p.scrollWidth - p.clientWidth };
    });
    check(fit.titleFits && fit.btnIn && fit.over <= 1, 'at 640x400 the title (with both new buttons) fits and the Daily panel has no horizontal overflow');
    if (SHOTS) { await C.page.screenshot({ path: SHOTS + '/d18-panel-640x400.png' }); await C.page.evaluate(() => closeModal()); await C.page.screenshot({ path: SHOTS + '/d18-title-640x400.png' }); }
    await C.page.close();

    // ------------------------------------------------------------ 11. frame cost in a full room (12 foes), against the Whisper Catacombs
    const Pf = await boot(browser); allErrors.push(Pf.errors);
    await toGame(Pf.page, 'Perf');
    const perf = await Pf.page.evaluate(() => {
      PRESETS.apply('medium');
      const measure = (mapId, pos) => {
        loadMap(mapId, pos);
        const c = Engine.cam;
        for (const e of G.ents) if (e.kind === 'enemy' && !e.transient) e.hidden = true;
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const e = hydrate({ kind: 'enemy', type: ['proctor', 'legionnaire', 'hound'][i % 3], x: c.x + Math.cos(c.dir) * 3 + Math.cos(a) * 1.4, y: c.y + Math.sin(c.dir) * 3 + Math.sin(a) * 1.4, transient: true }); e.state = 'passive'; G.ents.push(e); }
        for (let i = 0; i < 10; i++) Engine.render(G.ents, G.tod);
        const t = []; for (let i = 0; i < 20; i++) { const a = performance.now(); Engine.render(G.ents, G.tod); t.push(performance.now() - a); }
        t.sort((x, y) => x - y); return t[10];
      };
      const big = (m) => m.rooms.filter((r) => !r.start).sort((a, b) => b.w * b.h - a.w * a.h)[0];
      G.maps.d18_f2 = DAILY18.genFloor('20261020', 2); G.maps.d18_f3 = DAILY18.genFloor('20261020', 3);
      const r2 = big(G.maps.d18_f2), r3 = big(G.maps.d18_f3);
      // interleaved rounds, the median of each: the machine is shared, so single runs are noisy
      const runs = { cat: [], f2: [], f3: [] };
      for (let k = 0; k < 5; k++) {
        runs.cat.push(measure('catacombs', { x: 17.5, y: 14.5, dir: 0 }));
        runs.f2.push(measure('d18_f2', { x: r2.x + 0.6, y: r2.cy + 0.5, dir: 0 }));
        runs.f3.push(measure('d18_f3', { x: r3.x + 0.6, y: r3.cy + 0.5, dir: 0 }));
        for (const id of ['catacombs', 'd18_f2', 'd18_f3']) { const L = G.maps[id].entities; for (let i = L.length - 1; i >= 0; i--) if (L[i].transient) L.splice(i, 1); }
      }
      const md = (a) => a.sort((x, y) => x - y)[2];
      const cat = md(runs.cat), f2 = md(runs.f2), f3 = md(runs.f3);
      const u = []; for (let i = 0; i < 30; i++) { const a = performance.now(); G.state = 'play'; update(0.016); u.push(performance.now() - a); }
      u.sort((x, y) => x - y);
      return { cat, f2, f3, upd: u[15] };
    });
    check(perf.f2 < perf.cat * 1.5 + 2 && perf.f3 < perf.cat * 1.5 + 2, 'frame cost in a full room (12 foes, Medium, median render): floor 2 ' + perf.f2.toFixed(2) + ' ms, floor 3 ' + perf.f3.toFixed(2) + ' ms vs the Whisper Catacombs ' + perf.cat.toFixed(2) + ' ms (update ' + perf.upd.toFixed(2) + ' ms)');
    await Pf.page.close();

    // ------------------------------------------------------------ 12. with the module blocked the title is the original one
    const X = await browser.newPage(); const xerr = []; X.on('pageerror', (e) => xerr.push(e.message));
    await X.route('**/js/daily18.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
    await X.goto(URL); await X.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    const blocked = await X.evaluate(() => ({ btn: !!document.getElementById('btn-daily'), ex: !!document.getElementById('btn-extras') }));
    check(!blocked.btn && blocked.ex && xerr.length === 0, 'with the module blocked there is no Daily button and nothing breaks');
    await X.close();
  } catch (e) { fails.push('exception: ' + (e && e.stack || e)); console.log('FAIL: exception ' + (e && e.stack || e)); }
  const errs = allErrors.flat().filter((m) => !/favicon|ERR_FILE_NOT_FOUND/.test(m));
  check(errs.length === 0, 'no page errors (' + errs.slice(0, 3).join(' | ') + ')');
  await browser.close();
  if (fails.length) { console.log('\n' + fails.length + ' FAILED'); process.exit(1); }
  console.log('\nPASS daily18 — all checks');
})();
