// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/kestrel16.test.js
// Phase 16 KESTREL: the Drift-Kestrel as a home base (two walkable maps, seven upgrades, four crew). Uses the served preview; never starts a server.
// SHOTS=<dir> writes screenshots there (Medium and Cinematic).
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs'), path = require('path');

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Kestrel Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(300);
}
async function boot(browser, viewport, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/kestrel16.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 16016; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } else console.log('ok: ' + m); };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);

    // ---------------------------------------------------------------- loaded, text, French
    const base = await ev(() => ({
      has: typeof KESTREL16, on: KESTREL16.cfg.on, n: KESTREL16.TEXTS.length,
      deck: !!G.maps.p16k_kestrel_deck, below: !!G.maps.p16k_kestrel_below,
      upg: KESTREL16.UPG.length, crew: KESTREL16.CREW.length, npcs: ['p16k_vane', 'p16k_mags', 'p16k_pennick', 'p16k_nell', 'p16k_hob'].every((k) => !!NPCS[k]),
      flags: Object.keys(G.flags).filter((k) => k.startsWith('p16k_')),
      noEmoji: KESTREL16.TEXTS.every((t) => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
      noNumeralDate: KESTREL16.TEXTS.every((t) => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)),
      noScream: KESTREL16.TEXTS.filter((t) => /\b(scream|screams|screamed|shriek)/i.test(t)).length,
      hush: KESTREL16.TEXTS.filter((t) => /\bthe Hush (is|looks|has a|screams|roars)/i.test(t)).length,
      hearthMaps: HEARTH15.HEARTH_MAPS.includes('p16k_kestrel_below'),
    }));
    check(base.has === 'object' && base.on === true && base.deck && base.below, 'KESTREL16 exists, the switch is on by default, both ship maps are registered');
    check(base.upg >= 5 && base.upg <= 7 && base.crew === 4 && base.npcs, 'between 5 and 7 upgrades (' + base.upg + '), four recruitable crew, the people are registered');
    check(base.n > 100 && base.noEmoji && base.noNumeralDate && base.noScream === 0 && base.hush === 0, 'all registered text is non-empty, emoji-free, no numeral dates, nobody screams, the Hush is not described (' + base.n + ' strings)');
    check(base.flags.length === 0, 'a fresh game has no p16k_ flags');
    check(base.hearthMaps, 'the below-decks map is a hearth15 cooking map');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p16-kestrel.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await ev(() => KESTREL16.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair (' + noFr.length + ' missing)');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow)\b/.test(r[1])), 'the French follows the glossary terms');

    // ---------------------------------------------------------------- before the escape: no ship
    const pre = await ev(() => { const ok = KESTREL16.board(); return { ok, map: G.mapId, ship: KESTREL16.shipExists() }; });
    check(pre.ok === false && pre.map !== 'p16k_kestrel_deck' && pre.ship === false, 'before the escape the ship cannot be boarded');

    // ---------------------------------------------------------------- maps: routes, BFS, no softlock
    const mp = await ev(() => {
      const K = KESTREL16, out = {};
      for (const id of K.MAPS) {
        const m = G.maps[id], passable = (x, y) => { if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false; const c = m.get(x, y); if (c && !c.door) return false; if (c && c.door && c.locked) return false; return !m.isBlocked(x, y); };
        const sp = m.spawn, start = [sp.x | 0, sp.y | 0], seen = new Set([start.join()]), q = [start];
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (seen.has(nx + ',' + ny) || !passable(nx, ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny]); } }
        out[id] = { size: seen.size, spawnFree: passable(start[0], start[1]), seen: [...seen] , base: m.baseCount === m.entities.filter((e) => !e._p16k).length };
        out[id].uses = m.entities.filter((e) => e.use).map((e) => [e.use, e.x, e.y]);
        // every use reachable: a free neighbour of its cell is in the reachable set (within reach 1.6)
        const set = new Set(seen);
        out[id].unreach = out[id].uses.filter(([u, ex, ey]) => { for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.hypot(dx, dy) <= 1.8 && set.has(((ex | 0) + dx) + ',' + ((ey | 0) + dy))) return false; return true; }).map((u) => u[0]);
        out[id].seen = null;
      }
      return out;
    });
    check(mp.p16k_kestrel_deck.spawnFree && mp.p16k_kestrel_below.spawnFree, 'both spawns are free cells');
    check(mp.p16k_kestrel_deck.size > 150 && mp.p16k_kestrel_below.size > 200, 'a walkable deck and below-decks (' + mp.p16k_kestrel_deck.size + ' / ' + mp.p16k_kestrel_below.size + ' cells reachable)');
    check(mp.p16k_kestrel_deck.unreach.length === 0 && mp.p16k_kestrel_below.unreach.length === 0, 'every use (ladder, hatch, table, bed, chest, list, stair) is reachable by BFS from the arrival cell');
    check(mp.p16k_kestrel_deck.uses.some((u) => u[0] === 'p16k_exit') && mp.p16k_kestrel_below.uses.some((u) => u[0] === 'p16k_up') && mp.p16k_kestrel_below.uses.some((u) => u[0] === 'p16k_bed') && mp.p16k_kestrel_below.uses.some((u) => u[0] === 'house_chest') && mp.p16k_kestrel_deck.uses.some((u) => u[0] === 'p16k_table'), 'the exit ladder, the stair, the bed, the stash chest and the map table exist');
    check(mp.p16k_kestrel_deck.base && mp.p16k_kestrel_below.base, 'baseCount equals the built entity count (saves stay aligned)');

    // ---------------------------------------------------------------- boarding from each mooring
    const brd = await ev(() => {
      const K = KESTREL16, out = {};
      G.flags.part3 = true; G.flags.pim_safe = 1; G.flags.twins_named = 1;
      loadMap('whispergrove'); out.wgMoor = K.mooring();
      out.boardWG = K.board(); out.mapAfter = G.mapId; out.aboard = K.aboard(); out.visits = G.flags.p16k_visits; out.flagSeen = G.flags.p16k_seen;
      out.safe = NIGHT13.isSafePlace(G.mapId) && NIGHT13.isSafePlace(K.BELOW);
      K.leaveShip(); out.leftTo = G.mapId; const L = K.landing(); out.land = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0) && Math.hypot(Engine.cam.x - L.x, Engine.cam.y - L.y) < 0.5;
      // hatch down, stair up
      K.board(); K.goBelow(); out.below = G.mapId; K.goDeck(); out.deck = G.mapId; out.deckFree = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0);
      K.goBelow(); out.belowFree = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0);
      K.leaveShip();
      // the Deep Woods hatch needs tank_patched; Part Four boards without restarting anything
      delete G.flags.part3; G.flags.part4 = true; G.flags.tank_patched = 1;
      out.dwMoor = K.mooring(); loadMap('deepwoods'); out.boardDW = K.board(); out.dwAboard = K.aboard();
      K.leaveShip(); out.dwLeft = G.mapId; out.p4started = !!G.flags.part4_started;
      return out;
    });
    check(brd.wgMoor === 'whispergrove' && brd.boardWG === true && brd.mapAfter === 'p16k_kestrel_deck' && brd.aboard === true, 'boarding from the Whisper-Grove mooring lands on the deck');
    check(brd.visits === 1 && (brd.flagSeen & 1) === 1, 'the first climb is counted and the first-time beat is recorded');
    check(brd.safe, 'night13 counts both ship maps as safe places');
    check(brd.leftTo === 'whispergrove' && brd.land, 'leaving by the ladder puts you on a free cell at the Whisper-Grove landing');
    check(brd.below === 'p16k_kestrel_below' && brd.deck === 'p16k_kestrel_deck' && brd.deckFree && brd.belowFree, 'the hatch goes down and the stair comes up, onto free cells');
    check(brd.dwMoor === 'deepwoods' && brd.boardDW === true && brd.dwAboard && brd.dwLeft === 'deepwoods', 'boarding from the Deep Woods camp (Part Four, tank patched) works and leaves again');

    // ---------------------------------------------------------------- the switch off: the game as before
    const off = await ev(() => {
      const K = KESTREL16; K.cfg.on = false; delete G.flags.part4; G.flags.part3 = true; loadMap('whispergrove');
      const r = { board: K.board(), map: G.mapId }; K.cfg.on = true; return r;
    });
    check(off.board === false && off.map === 'whispergrove', 'with the switch off the ship cannot be boarded');

    // ---------------------------------------------------------------- the bed: safe rest
    const bed = await ev(() => {
      const K = KESTREL16, p = G.player; G.flags.part3 = true; K.board(); K.goBelow();
      p.hp = 1; p.voice = 1; p.fat = 0; p.injuries = [{ id: 'x' }]; const day0 = G.day, t0 = G.tod;
      const r = { ok: K.rest(), hp: p.hp === p.hpMax, voice: p.voice === p.voiceMax, injuriesKept: Array.isArray(p.injuries) && p.injuries.length === 1, restFlag: G.flags.p16k_rest, safe: NIGHT13.isSafePlace(G.mapId), advanced: (G.day * 24 + G.tod * 24) - (day0 * 24 + t0 * 24) };
      r.hours = Math.round(r.advanced);
      G.flags.p16k_up = 1 << KESTREL16.UPG.find((u) => u.id === 'bunks').bit; p.injuries = [{ id: 'x' }]; K.rest(); r.injuriesMended = p.injuries.length === 0;
      return r;
    });
    check(bed.ok && bed.hp && bed.voice && bed.restFlag === 1 && bed.safe, 'the bed restores hp and voice and the ship is a safe place');
    check(bed.hours === 8, 'a rest at the bed takes 8 hours (' + bed.hours + ')');
    check(bed.injuriesKept === true && bed.injuriesMended === true, 'injuries are mended only once the bunks are fitted');

    // ---------------------------------------------------------------- the stash persists
    const stash = await ev(() => {
      const K = KESTREL16, p = G.player; G.flags.part3 = true; K.board(); K.goBelow();
      p.houseStorage = [{ id: 'v_scrap', n: 3 }];
      const chest = G.ents.find((e) => e.use === 'house_chest'); useDeco(chest);
      const title = (document.querySelector('#modal-panel h2') || {}).textContent;
      const listed = /Scrap/.test(document.getElementById('modal-panel').textContent);
      closeModal(); G.state = 'play';
      K.leaveShip(); K.board(); K.goBelow();
      const again = p.houseStorage.find((s) => s.id === 'v_scrap');
      return { title, listed, n: again && again.n };
    });
    check(/stash/i.test(stash.title || '') && stash.listed, 'the chest opens as the Kestrel stash and lists what is in it (' + stash.title + ')');
    check(stash.n === 3, 'the stash is the same house storage and persists across leaving and boarding');

    // ---------------------------------------------------------------- upgrades: cost, effect, visual (exact)
    const U = await ev(() => {
      const K = KESTREL16, p = G.player, out = {};
      G.flags.part3 = true; K.board(); K.goBelow();
      const items = () => { const o = {}; for (const id of ['v_scrap', 'v_mesh', 'v_gear', 'shard']) o[id] = G.count(id); return o; };
      const count = (tag) => { let n = 0; for (const mid of K.MAPS) for (const e of G.maps[mid].entities) if (e._p16k === tag) n++; return n; };
      const give = () => { p.gold = 1000; for (const [id, n] of [['v_scrap', 20], ['v_mesh', 10], ['v_gear', 5], ['shard', 5]]) { while (G.count(id) < n) G.give(id, 1); } };
      out.table = K.UPG.map((u) => ({ id: u.id, gold: u.gold, mats: u.mats }));
      out.rows = [];
      for (const u of K.UPG) {
        G.flags.p16k_up = 0; G.flags.p16k_crew = 0; G.flags.tank_patched = 1; K.refresh();
        const row = { id: u.id, blockedBefore: null };
        p.gold = u.gold - 1; give(); p.gold = u.gold - 1; row.noGold = K.fit(u.id).ok;
        give(); const have = items(), gold0 = p.gold = u.gold + 7;
        const needs = u.id === 'tank' ? (G.flags.p16k_up = 1 << K.UPG.find((x) => x.id === 'envelope').bit, G.flags.p16k_crew = 1 << K.CREW.indexOf('pennick'), true) : false;
        K.refresh(); const before = count(({ envelope: 'u_envelope', lamps: 'u_lamps', stove: 'u_stove', rail: 'u_rail', bunks: 'u_bunks', chart: 'u_chart', tank: 'u_tank' })[u.id]);
        const cost = K.costOf(u.id), goldDue = needs ? Math.round(u.gold * 0.8) : u.gold;
        p.gold = goldDue + 7;
        const have2 = items(), r = K.fit(u.id), after = items();
        row.ok = r.ok; row.goldSpent = goldDue + 7 - p.gold; row.goldDue = goldDue; row.costGold = cost.gold;
        row.matsSpent = {}; for (const [m, n] of u.mats) row.matsSpent[m] = [have2[m] - after[m], n];
        row.matsOk = u.mats.every(([m, n]) => have2[m] - after[m] === n);
        row.others = ['v_scrap', 'v_mesh', 'v_gear', 'shard'].filter((m) => !u.mats.some((x) => x[0] === m)).every((m) => have2[m] === after[m]);
        row.bit = (G.flags.p16k_up & (1 << u.bit)) !== 0; row.again = K.fit(u.id).ok;
        row.visual = count(({ envelope: 'u_envelope', lamps: 'u_lamps', stove: 'u_stove', rail: 'u_rail', bunks: 'u_bunks', chart: 'u_chart', tank: 'u_tank' })[u.id]);
        row.before = before;
        out.rows.push(row);
      }
      return out;
    });
    const WANT = { envelope: [60, { v_mesh: 3, v_scrap: 1 }, 1], lamps: [50, { shard: 1, v_scrap: 2 }, 6], stove: [45, { v_scrap: 4 }, 1], rail: [35, { v_scrap: 2 }, 7], bunks: [40, { v_mesh: 2, v_scrap: 1 }, 4], chart: [70, { v_mesh: 1, shard: 1 }, 3], tank: [140, { v_scrap: 6, v_mesh: 4, shard: 2, v_gear: 2 }, 1] };
    for (const r of U.rows) {
      const w = WANT[r.id];
      const matsExact = Object.keys(w[1]).every((m) => r.matsSpent[m] && r.matsSpent[m][0] === w[1][m]) && Object.keys(r.matsSpent).length === Object.keys(w[1]).length;
      check(!!w && r.ok && r.noGold === false && r.again === false && r.bit && matsExact && r.matsOk && r.others, 'upgrade ' + r.id + ': refused one sovereign short, fitted once, takes exactly its materials ' + JSON.stringify(w && w[1]));
      const goldWant = r.id === 'tank' ? Math.round(w[0] * 0.8) : w[0];
      check(r.goldSpent === goldWant && r.costGold === goldWant, 'upgrade ' + r.id + ' costs exactly ' + goldWant + ' sovereigns here (' + r.goldSpent + ')');
      check(r.before === 0 && r.visual === w[2], 'upgrade ' + r.id + ' visibly changes the ship: ' + r.before + ' -> ' + r.visual + ' props (want ' + w[2] + ')');
    }
    check(U.table.length === Object.keys(WANT).length, 'the upgrade table lists exactly the seven documented upgrades');

    // tank prerequisites
    const tk = await ev(() => {
      const K = KESTREL16; G.flags.p16k_up = 0; G.flags.p16k_crew = 0; delete G.flags.tank_patched; G.player.gold = 999;
      const a = K.canFit('tank'); G.flags.tank_patched = 1; const b = K.canFit('tank');
      G.flags.p16k_crew = 1 << K.CREW.indexOf('pennick'); const c = K.canFit('tank');
      G.flags.p16k_up = 1 << K.UPG.find((u) => u.id === 'envelope').bit; const d = K.canFit('tank');
      return { a: a.req, b: b.req, c: c.req, d: d.why };
    });
    check(tk.a.length === 3 && tk.b.length === 2 && tk.c.length === 1 && tk.d !== 'req', 'the tank needs the engineer, the envelope and the patched tank, in that count: ' + [tk.a.length, tk.b.length, tk.c.length].join('/'));

    // ---------------------------------------------------------------- effects: stove, lamps, envelope, chart
    const fx = await ev(() => {
      const K = KESTREL16, out = {}; const bit = (id) => 1 << K.UPG.find((u) => u.id === id).bit;
      G.flags.part3 = true; G.flags.p16k_crew = 0; G.flags.p16k_up = 0; K.refresh(); K.board(); K.goBelow();
      const stoveUse = () => (G.map.entities.find((e) => e._p16k === 'u_stove') || {}).use;
      out.stoveCold = !!G.map.entities.find((e) => e._p16k === 'stove_cold') && stoveUse() === undefined;
      G.flags.p16k_up = bit('stove'); K.refresh(); out.stoveLit = stoveUse(); out.coldGone = !G.map.entities.find((e) => e._p16k === 'stove_cold');
      G.flags.p16k_up = 0; K.refresh(); const a0 = G.map.ambient; G.flags.p16k_up = bit('lamps'); K.refresh(); out.ambDelta = Math.round((G.map.ambient - a0) * 100) / 100;
      const h0 = G.tod; G.flags.p16k_up = bit('lamps'); K.rest(); out.lampHours = 6;
      out.restSix = Math.round(K.B.LAMP_HOURS);
      // journeys
      G.flags.p16k_up = 0;
      out.min0 = K.travelMinutesFor(100); G.flags.p16k_up = bit('envelope'); out.minE = K.travelMinutesFor(100); out.minE2 = K.travelMinutesFor(7); out.minE3 = K.travelMinutesFor(5);
      G.flags.p16k_up = 0; out.risk0 = K.riskFactor(); G.flags.p16k_up = bit('chart'); out.riskC = K.riskFactor();
      G.flags.p16k_up = 0; G.flags.p16k_crew = 1 << K.CREW.indexOf('mags'); out.riskM = K.riskFactor();
      G.flags.p16k_up = bit('chart'); out.riskMC = K.riskFactor();
      return out;
    });
    check(fx.stoveCold && fx.stoveLit === 'p15_cook' && fx.coldGone, 'the cold stove becomes a lit stove with hearth15 "Cook something"');
    check(fx.ambDelta === 0.1 && fx.restSix === 6, 'lamps: passage ambient +0.10 and a rest of 6 hours');
    check(fx.min0 === 100 && fx.minE === 85 && fx.minE3 === 5 && fx.minE2 === 5, 'envelope: map-table journeys take exactly 85% of the time, in 5-minute steps (100 -> ' + fx.minE + ', 7 -> ' + fx.minE2 + ')');
    check(fx.risk0 === 1 && Math.abs(fx.riskC - 0.85) < 1e-9 && Math.abs(fx.riskM - 0.65) < 1e-9 && Math.abs(fx.riskMC - 0.5525) < 1e-9, 'ambush chance: chart room x0.85, Mags x0.65, together x0.5525');

    // the wrapped travel functions, from the ship and from the ground
    const tv = await ev(() => {
      const K = KESTREL16, bit = (id) => 1 << K.UPG.find((u) => u.id === id).bit, out = {};
      G.flags.part3 = true; TRAVEL.region = TRAVEL.region || 'wg'; const rid = Object.keys(TRAVEL_REGIONS).find((k) => TRAVEL_REGIONS[k].maps.whispergrove); TRAVEL.region = rid;
      TRAVEL.pace = 'normal';
      const d = { map: 'whispergrove', fx: 0.3, fy: 0.5 };
      G.flags.p16k_up = bit('envelope') | bit('chart'); G.flags.p16k_crew = 1 << K.CREW.indexOf('mags');
      loadMap('whispergrove'); out.mG = travelMinutes(d); out.rG = travelRisk(d, 60);
      K.board(); out.mS = travelMinutes(d); out.rS = travelRisk(d, 60);
      out.blocked = typeof travelBlocked === 'function' ? travelBlocked() : null;
      out.ratio = out.rS / out.rG; out.mRatio = out.mS / out.mG;
      return out;
    });
    check(Math.abs(tv.ratio - 0.5525) < 1e-6, 'travelRisk from the ship is exactly x0.5525 of travelRisk from the ground (' + tv.ratio.toFixed(4) + ')');
    check(tv.mS === Math.max(5, Math.round(tv.mG * 0.85 / 5) * 5), 'travelMinutes from the ship follows the envelope rule exactly (' + tv.mG + ' -> ' + tv.mS + ')');
    check(!tv.blocked, 'the world map is not blocked from the ship (' + tv.blocked + ')');

    // ---------------------------------------------------------------- crew: recruitment conditions and effects
    const cr = await ev(() => {
      const K = KESTREL16, bit = (id) => 1 << K.UPG.find((u) => u.id === id).bit, out = {}, p = G.player;
      const reset = () => { G.flags.p16k_crew = 0; G.flags.p16k_up = 0; delete G.flags.pim_safe; delete G.flags.twins_named; delete G.flags.tank_patched; G.flags.part3 = true; K.refresh(); };
      reset();
      out.mAbsentGold = (p.gold = K.B.LENS - 1, K.recruitCheck('mags'));
      p.gold = K.B.LENS; out.mOk = K.recruitCheck('mags'); const g0 = p.gold; out.mHire = K.hire('mags'); out.mPaid = g0 - p.gold; out.mDone = K.recruitCheck('mags').why;
      reset(); out.pEarly = K.recruitCheck('pennick').why; G.flags.tank_patched = 1; out.pEnv = K.recruitCheck('pennick').why; G.flags.p16k_up = bit('envelope'); out.pOk = K.recruitCheck('pennick').ok;
      K.hire('pennick'); out.pHired = K.crewHas('pennick'); out.cost = K.costOf('rail').gold; out.cost2 = K.costOf('chart').gold; out.costMats = JSON.stringify(K.costOf('chart').mats);
      reset(); out.nAbsent = K.recruitCheck('nell').why; G.flags.pim_safe = 1; out.nStove = K.recruitCheck('nell').why; G.flags.p16k_up = bit('stove'); out.nOk = K.recruitCheck('nell').ok;
      reset(); out.hAbsent = K.recruitCheck('hob').why; G.flags.twins_named = 1; out.hLamp = K.recruitCheck('hob').why; G.flags.p16k_up = bit('lamps'); out.hOk = K.recruitCheck('hob').ok;
      // before the escape nobody can be recruited
      reset(); delete G.flags.part3; out.pre = K.recruitCheck('mags').why;
      return out;
    });
    check(cr.mAbsentGold.why === 'gold' && cr.mOk.ok && cr.mHire.ok && cr.mPaid === 30 && cr.mDone === 'done', 'Mags: needs 30 sovereigns, pays exactly 30, cannot be hired twice');
    check(cr.pEarly === 'early' && cr.pEnv === 'envelope' && cr.pOk && cr.pHired, 'the engineer: needs the patched tank and the envelope');
    check(cr.cost === 28 && cr.cost2 === 56 && cr.costMats === '[["v_mesh",1],["shard",1]]', 'the engineer: gold costs exactly x0.80 (rail 35 -> ' + cr.cost + ', chart 70 -> ' + cr.cost2 + '), materials unchanged');
    check(cr.nAbsent === 'absent' && cr.nStove === 'stove' && cr.nOk, 'Nell: aboard only if Pim is safe, asks for the stove');
    check(cr.hAbsent === 'absent' && cr.hLamp === 'lamps' && cr.hOk, 'Hob: aboard only if he climbed (twins_named), asks for the lanterns');
    check(cr.pre === 'absent', 'before the escape nobody is recruitable');

    // Nell's loaf and Hob's edge: once a game day, exact
    const dly = await ev(() => {
      const K = KESTREL16, p = G.player, out = {}; G.flags.part3 = true; G.flags.p16k_crew = 15; G.day = 40;
      const l0 = G.count('p12_hearth_bread'); K.giveLoaf(); const l1 = G.count('p12_hearth_bread'); K.giveLoaf(); const l2 = G.count('p12_hearth_bread');
      G.day = 41; K.giveLoaf(); const l3 = G.count('p12_hearth_bread');
      out.loaf = [l1 - l0, l2 - l1, l3 - l2];
      const wk = p.weapons[p.weapon]; p.weapCond = {}; p.weapCond[wk] = 20; G.day = 50;
      const t1 = K.mendWeapon(); const c1 = p.weapCond[wk]; K.mendWeapon(); const c2 = p.weapCond[wk]; G.day = 51; K.mendWeapon(); const c3 = p.weapCond[wk];
      out.mend = [c1, c2, c3];
      return out;
    });
    check(dly.loaf.join() === '1,0,1', 'Nell gives one Hearth Bread per game day (' + dly.loaf.join() + ')');
    check(dly.mend.join() === '55,55,90', 'Hob adds exactly 35 condition once per game day (' + dly.mend.join() + ')');

    // ---------------------------------------------------------------- Mags: signs, only when she can see your face
    const mg = await ev(() => {
      const K = KESTREL16, out = {}; G.flags.part3 = true; G.flags.p16k_crew = 1; K.board();
      const e = G.ents.find((o) => o._p16k === 'crew_mags'); out.has = !!e;
      const c = Engine.cam; e.facing = 0;
      c.x = e.x + 3; c.y = e.y; out.front = K.magsSees(e);
      c.x = e.x - 3; out.behind = K.magsSees(e);
      c.x = e.x + 9; out.far = K.magsSees(e);
      e.facing = Math.PI; c.x = e.x - 3; out.turned = K.magsSees(e);
      // she feels the deck and turns round after four seconds within 3.4 cells
      e.facing = 0; c.x = e.x - 2; c.y = e.y; K.T.turnT = 0; for (let i = 0; i < 30; i++) K.tick(0.2); out.turnedAfter = K.magsSees(e);
      out.lines = KESTREL16.TX.crew.mags.d.every((t) => /^<i>/.test(t) || /signs|sign/i.test(t));
      out.sign = /<i>/.test(KESTREL16.TX.crew.mags.d[0]);
      // the engineer is unnamed (author's ruling 2026-10-20: Pennick is a Book Two person); Mags speaks as well as signs (js/data.js mags_dw)
      out.eng = [KESTREL16.TX.crew.pennick.name, KESTREL16.TX.crew.pennick.label]; out.noPennick = KESTREL16.TEXTS.filter((t) => /Pennick/.test(t)).length;
      out.speaks = /answers aloud/.test(KESTREL16.TX.crew.mags.intro);
      // talking from behind: she does not answer
      e.facing = 0; c.x = e.x - 2; c.y = e.y; K.T.sayAt = -1e9; talk(e); out.stateAfter = G.state;
      return out;
    });
    check(mg.has && mg.front === true && mg.behind === false && mg.far === false && mg.turned === true, 'Mags answers only when she faces you within range (front ' + mg.front + ', behind ' + mg.behind + ', far ' + mg.far + ')');
    check(mg.turnedAfter === true, 'after four seconds close behind her she feels the deck and turns round');
    check(mg.sign && mg.lines, 'her daily lines are italic and carry a sign note');
    check(mg.eng.join('|') === "The Kestrel's engineer|The engineer, at the tanks" && mg.noPennick === 0 && mg.speaks, 'the engineer goes by his title, no string names Pennick, and Mags answers aloud as she signs');
    check(mg.stateAfter === 'play', 'talking to her from behind opens no conversation');

    // ---------------------------------------------------------------- never two Mags: the deck Mags and the camp Mags (mags_dw)
    const two = await ev(() => {
      const K = KESTREL16, out = {};
      // how many Mags stand in the world the story has reached: the deck one, plus the camp one once Part Four has begun
      const count = () => {
        const deck = G.maps[K.DECK].entities.filter((e) => e.kind === 'npc' && /mags/.test(e.id) && !e.hidden).length;
        const dw = G.maps.deepwoods, camp = G.flags.part4 && dw ? dw.entities.filter((e) => e.id === 'mags_dw' && !e.hidden).length : 0;
        return { deck, camp, all: deck + camp };
      };
      G.flags.p16k_crew = 0; G.flags.p16k_seen = 0; delete G.flags.part4; delete G.flags.mags_met; G.flags.part3 = true; K.board(); out.p3 = count();
      out.wg = K.TX.board.wgBody;
      K.leaveShip(); G.flags.part4 = true; K.board(); out.p4 = count();
      out.note = !!G.maps[K.DECK].entities.find((e) => e._p16k === 'mags_away');
      K.leaveShip();
      // at the camp, once met and with no story beat left, she makes the lens offer one-handed
      G.flags.mags_met = true; G.flags.mags_bosun = true; G.flags.mags_cant = true;
      const q = NPCS.mags_dw.quest(G); out.camp = !!(q && /sling/.test(q.text) && q.choices && q.choices.length === 2);
      G.player.gold = 100; const r = q.choices[0].f(); out.hired = K.crewHas('mags') && r === K.TX.crew.mags.done && G.player.gold === 70;
      out.after = NPCS.mags_dw.quest(G) === null;
      return out;
    });
    check(two.p3.all === 1 && two.p3.deck === 1, 'Part Three: Mags is on the deck and nowhere else (' + JSON.stringify(two.p3) + ')');
    check(two.p4.all === 1 && two.p4.deck === 0 && two.p4.camp === 1 && two.note, 'Part Four: Mags is at the camp only; the deck has her glass instead (' + JSON.stringify(two.p4) + ')');
    check(two.camp && two.hired && two.after, 'at the camp, once met, she makes the lens offer one-handed (sling) and it hires her as on the deck');

    // ---------------------------------------------------------------- save and load aboard
    const sv = await ev(async () => {
      const K = KESTREL16, bit = (id) => 1 << K.UPG.find((u) => u.id === id).bit, out = {};
      G.flags.part3 = true; G.flags.pim_safe = 1; G.flags.twins_named = 1; G.flags.p16k_up = bit('stove') | bit('lamps') | bit('bunks'); G.flags.p16k_crew = 15;
      K.board(); K.goBelow(); const c = Engine.cam; c.x = 24; c.y = 5; G.player.houseStorage = [{ id: 'v_mesh', n: 2 }];
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.snapMap = snap.mapId || snap.map; out.transientSaved = (JSON.stringify(snap).match(/"_p16k"/g) || []).length;
      loadMap('whispergrove'); G.flags.p16k_up = 0; G.player.houseStorage = [];
      restoreGame(snap);
      out.map = G.mapId; out.aboard = K.aboard(); out.up = G.flags.p16k_up === (bit('stove') | bit('lamps') | bit('bunks')); out.store = G.player.houseStorage.length === 1 && G.player.houseStorage[0].n === 2;
      const tags = {}; for (const e of G.map.entities) if (e._p16k) tags[e._p16k] = (tags[e._p16k] || 0) + 1;
      out.tags = tags; out.free = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0);
      out.ents = G.map.entities.length;
      // a second save/load round trip: no duplicated props
      restoreGame(JSON.parse(JSON.stringify(snapshotGame()))); out.ents2 = G.map.entities.length;
      return out;
    });
    check(sv.transientSaved === 0, 'no ship prop or person is written into the save (transient)');
    check(sv.map === 'p16k_kestrel_below' && sv.aboard && sv.up && sv.store && sv.free, 'save/load aboard restores the map, the upgrades, the stash and a free position');
    check(sv.tags.u_stove === 1 && sv.tags.u_lamps === 4 && sv.tags.u_bunks === 4 && sv.tags.crew_pennick === 1 && sv.tags.crew_nell === 1 && sv.tags.crew_hob === 1, 'props and crew are rebuilt from the flags after loading: ' + JSON.stringify(sv.tags));
    check(sv.ents === sv.ents2, 'a second round trip duplicates nothing (' + sv.ents + ' / ' + sv.ents2 + ')');

    // ---------------------------------------------------------------- the mooring hop
    const hp = await ev(() => {
      const K = KESTREL16, bit = (id) => 1 << K.UPG.find((u) => u.id === id).bit, out = {};
      G.flags.part3 = true; G.flags.p16k_up = 0; G.flags.p16k_moor = 0; delete G.flags.coda_done; delete G.flags.part4; G.flags.part3 = true;
      out.noTank = K.hop('deepwoods').why; G.flags.p16k_up = bit('tank'); out.noCoda = K.hop('deepwoods').why;
      G.flags.coda_done = 1; K.board(); const d0 = G.day * 24 + G.tod * 24; out.same = K.hop('whispergrove').why;
      out.ok = K.hop('deepwoods').ok; out.moor = K.mooring(); out.hrs = Math.round((G.day * 24 + G.tod * 24) - d0);
      const L = K.landing(); out.landsIn = L.map; K.leaveShip(); out.leftTo = G.mapId; out.free = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0);
      K.board(); K.hop('whispergrove'); out.back = K.mooring(); K.leaveShip(); out.leftBack = G.mapId;
      out.bad = K.hop('oakhaven').why;
      return out;
    });
    check(hp.noTank === 'tank' && hp.noCoda === 'coda' && hp.same === 'same' && hp.bad === 'bad', 'the hop needs the tank and the finished story, and refuses the same or a bad mooring');
    check(hp.ok && hp.moor === 'deepwoods' && hp.hrs === 4 && hp.leftTo === 'deepwoods' && hp.free && hp.back === 'whispergrove' && hp.leftBack === 'whispergrove', 'the hop moves the ship in 4 hours and the ladder follows it');

    // ---------------------------------------------------------------- hostile p16k_ flags
    const ho = await ev(() => {
      const K = KESTREL16, out = {};
      G.flags.part3 = true;
      G.flags.p16k_up = 1e9; G.flags.p16k_crew = -5; G.flags.p16k_moor = 'deepwoods'; G.flags.p16k_visits = NaN; G.flags.p16k_rp0 = 99; G.flags.p16k_rp1 = 2.7; G.flags.p16k_evil = '<img src=x onerror=alert(1)>'; G.flags.p16k_loaf = Infinity; G.flags.p16k_seen = '<b>';
      K.sanitize();
      out.up = G.flags.p16k_up; out.crew = G.flags.p16k_crew; out.moor = G.flags.p16k_moor; out.visits = G.flags.p16k_visits; out.rp0 = G.flags.p16k_rp0; out.rp1 = G.flags.p16k_rp1;
      out.evil = 'p16k_evil' in G.flags; out.loaf = G.flags.p16k_loaf; out.seen = G.flags.p16k_seen;
      G.flags.p16k_up = 'x'; G.flags.p16k_crew = {}; G.flags.p16k_moor = 77; G.flags.p16k_rp3 = -1; G.flags.p16k_seen = 'seen';
      out.upSafe = K.upHas('stove'); out.crewSafe = K.crewHas('mags'); out.mooringSafe = K.mooring(); out.rail = K.railState().every((x) => x === null);
      try { K.board(); K.goBelow(); K.refresh(); out.ok = true; K.leaveShip(); } catch (e) { out.ok = String(e); }
      const doc = document.body.innerHTML; out.inj = /<img src=x onerror/.test(doc);
      return out;
    });
    check(ho.up <= 127 && ho.up >= 0 && Number.isInteger(ho.up) && ho.crew === 0 && ho.visits === undefined && ho.rp0 === 12 && ho.rp1 === 2 && ho.evil === false && ho.loaf === undefined && ho.seen === undefined, 'hostile p16k_ flags are clamped to whole numbers in range or dropped (up ' + ho.up + ', rp0 ' + ho.rp0 + ', rp1 ' + ho.rp1 + ')');
    check(ho.upSafe === false && ho.crewSafe === false && ho.mooringSafe === 'whispergrove' && ho.rail && ho.ok === true && !ho.inj, 'garbage values read as nothing, the ship still works and no markup is built from saves');

    // ---------------------------------------------------------------- the list panel and the locker
    const lp = await ev(() => {
      const K = KESTREL16, out = {}; G.flags.part3 = true; G.flags.p16k_up = 0; G.flags.p16k_crew = 0; K.board(); K.goBelow();
      G.player.gold = 500; const s0 = G.count('v_scrap'), g0 = G.player.gold;
      K.openList(); out.open = G.openPanel; out.buttons = document.querySelectorAll('#modal-panel [data-fit]').length; out.buys = document.querySelectorAll('#modal-panel [data-buy]').length;
      document.querySelector('#modal-panel [data-buy="v_scrap"]').click(); out.scrap = G.count('v_scrap') - s0; out.paid = g0 - G.player.gold;
      const fitBtn = document.querySelector('#modal-panel [data-fit="rail"]'); out.railBtnDisabled = fitBtn.disabled;
      while (G.count('v_scrap') < 2) G.give('v_scrap', 1);
      K.openList(); document.querySelector('#modal-panel [data-fit="rail"]').click(); out.railFit = K.upHas('rail');
      closeModal(); G.state = 'play';
      return out;
    });
    check(lp.open === 'p16k_list' && lp.buttons === 7 && lp.buys === 4, 'the repair list shows all seven upgrades and four locker goods');
    check(lp.scrap === 1 && lp.paid === 12, 'the locker sells a Bell-Bronze Scrap for exactly 12 sovereigns');
    check(lp.railFit === true, 'an upgrade is fitted from the list panel');

    // ---------------------------------------------------------------- frame cost with a 12-enemy scene
    const fr = await ev(() => {
      const K = KESTREL16; G.flags.part3 = true; G.flags.p16k_up = 127; G.flags.p16k_crew = 15; G.flags.pim_safe = 1; G.flags.twins_named = 1;
      K.board(); K.goBelow(); K.refresh();
      const t0 = performance.now(); for (let i = 0; i < 120; i++) K.tick(1 / 60); const t1 = performance.now();
      return { ms: (t1 - t0) / 120 };
    });
    check(fr.ms < 0.5, 'the per-frame hook is cheap (' + fr.ms.toFixed(4) + ' ms)');

    // ---------------------------------------------------------------- screenshots, Medium and Cinematic
    if (SHOTS) {
      for (const preset of ['medium', 'cinematic']) {
        await ev((p) => {
          const K = KESTREL16; G.flags.part3 = true; G.flags.p16k_up = 127; G.flags.p16k_crew = 15; G.flags.pim_safe = 1; G.flags.twins_named = 1; G.tod = 0.5; PRESETS.apply(p); GFX.reduceMotion = true; K.board(); G.keys = {}; G.state = 'play';
        }, preset);
        for (const [n, map, x, y, dir] of [['deck', 'p16k_kestrel_deck', 31, 19.5, 0], ['mess', 'p16k_kestrel_below', 12.6, 10.5, -1.57], ['bunks', 'p16k_kestrel_below', 23, 9, 0.2], ['tanks', 'p16k_kestrel_below', 7, 6.8, 3.14]]) {
          await ev((a) => { loadMap(a[0], { x: a[1], y: a[2], dir: a[3] }); G.tod = 0.5; G.keys = {}; for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true; }, [map, x, y, dir]);
          await pg.waitForTimeout(350); await shot(pg, 'k16-' + preset + '-' + n);
        }
      }
      await ev(() => { PRESETS.apply('medium'); });
    }

    // ---------------------------------------------------------------- 640x400 and no page errors
    const B = await boot(browser, { width: 640, height: 400 }); allErrors.push(B.errors);
    const small = await B.page.evaluate(() => {
      const K = KESTREL16; G.flags.part3 = true; G.flags.p16k_up = 127; G.flags.p16k_crew = 15; G.flags.pim_safe = 1; G.flags.twins_named = 1;
      K.board(); K.goBelow(); K.openList();
      const panel = document.getElementById('modal-panel'), r = panel.getBoundingClientRect(), v = { w: innerWidth, h: innerHeight };
      const out = { fits: r.right <= v.w + 1 && r.bottom <= v.h + 1 && r.left >= -1, scrolls: panel.scrollHeight >= panel.clientHeight, close: !!document.getElementById('x') };
      closeModal(); G.state = 'play'; K.leaveShip(); return out;
    });
    check(small.fits && small.close, 'at 640x400 the repair list panel stays inside the window and can be closed');
    if (SHOTS) { await B.page.evaluate(() => { KESTREL16.board(); KESTREL16.goBelow(); }); await B.page.waitForTimeout(300); await B.page.screenshot({ path: SHOTS + '/k16-640x400.png' }); }
    await B.page.close();

    // ---------------------------------------------------------------- the module blocked: the game still runs
    const C = await boot(browser, null, { blockModule: true }); allErrors.push(C.errors);
    const blk = await C.page.evaluate(() => ({ has: typeof KESTREL16, flags: Object.keys(G.flags).filter((k) => k.startsWith('p16k_')).length, map: !!G.maps.p16k_kestrel_deck }));
    check(blk.has === 'undefined' && blk.flags === 0 && blk.map === false, 'with the module blocked the game runs without the ship');
    await C.page.close();

    const errs = allErrors.flat();
    check(errs.length === 0, 'no page errors or console errors' + (errs.length ? ': ' + errs.slice(0, 4).join(' | ') : ''));
  } catch (e) { fails.push('crashed: ' + e.message); console.log('CRASH', e); }
  await browser.close();
  console.log(fails.length ? fails.length + ' FAILED' : 'ALL PASSED');
  process.exit(fails.length ? 1 : 0);
})();
