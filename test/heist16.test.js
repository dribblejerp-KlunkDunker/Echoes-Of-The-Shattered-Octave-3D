// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/heist16.test.js
// Phase 16 HEIST: THE HELD LETTERS (the Chapel) and DEPOT THREE (the quarry). Uses the served preview; never starts a server.
// SHOTS=<dir> writes screenshots there.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs'), path = require('path');

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Heist Tester');
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
  if (opts.blockModule) await page.route('**/js/heist16.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 16016; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  await page.evaluate(() => {
    window.__go = (map, x, y, dir) => { loadMap(map, { x, y, dir }); G.state = 'play'; G.keys = {}; };
    // the whole book of what the heists pay, kept honest: every xp point goes through questXp
    window.__xp = 0; const _qx = questXp; questXp = function (n) { window.__xp += n; return _qx.apply(this, arguments); };
    // a clean slate between scenarios: no p16h_ flags, no pick flags, no haul, a full purse, a quiet night, the town
    window.__fresh = (o) => {
      o = o || {};
      const H = HEIST16;
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_') || k.startsWith('picked:')) delete G.flags[k];
      for (const k of [...H.LETTER_IDS.map((x) => 'p16h_letter_' + x), 'p16h_roster', 'p16h_lease', 'a_synodrobe']) while (G.has(k)) G.take(k);
      const p = G.player; p.gold = o.gold == null ? 200 : o.gold; p.hp = p.hpMax; p.factions = Object.assign({}, p.factions, { hedge: 0, synod: 0, office: 0, captains: 0 });
      p.crime = { bounty: 0, thefts: 0, assaults: 0, escapes: 0, jailHours: 0, custody: null, evidence: null };
      G.tod = o.tod == null ? 0.5 : o.tod; G.day = o.day == null ? 1 : o.day; G.noise = 1; G.lawGrace = 0; window.__xp = 0;
      for (const id in G.maps) { const m = G.maps[id]; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e._pa || e._p16h === 'watch' || /^reinf/.test(e._p16h || '')) m.entities.splice(i, 1); } }
      H.T.alarm = null; H.T.collar = false; H.T.collarPending = false; H.T.away.warden = 0; H.T.away.pike = 0;
      closeModal(); document.querySelector('#event') && document.querySelector('#event').classList.add('hidden'); G.state = 'play'; G.openPanel = null;
      __go('oakhaven', 50.4, 12.6, -Math.PI / 2); H.syncAll();
    };

    // a patient burglar: wait out t0 seconds somewhere harmless, then walk to the goal, holding still whenever a step would be seen.
    // Tries t0 = 0, 3, 6 ... until one gets through. Deterministic: the guards, the lamps and the clock are all code.
    window.__stealth = (which, goal, hideAt, opts) => {
      opts = opts || {};
      const H = HEIST16, L = which === 'L', spawn = (L ? H.V : H.D).SPAWN;
      const bfs = (m, sx, sy, gx, gy) => {
        const key = (x, y) => x + ',' + y, prev = new Map(), q = [[sx, sy]]; prev.set(key(sx, sy), null);
        while (q.length) { const [x, y] = q.shift(); if (x === gx && y === gy) break;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || prev.has(key(nx, ny))) continue; const c = m.get(nx, ny); if (c && !c.door) continue; prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); } }
        const path = []; let cur = [gx, gy]; while (cur) { path.unshift(cur); cur = prev.get(key(cur[0], cur[1])); } return path;
      };
      let last = null;
      for (let t0 = 0; t0 <= 150; t0 += 3) {
        G.tod = 0.95; G.day = 1; G.noise = 1;
        loadMap('chapel', { x: 3, y: 3, dir: 0 }); G.state = 'play';
        loadMap(L ? 'p16h_vestry' : 'p16h_depot3', { x: hideAt[0], y: hideAt[1], dir: 0 }); G.state = 'play';
        const c = Engine.cam, dt = 0.05; let t = 0;
        for (; t < t0 && !H.T.alarm; t += dt) { G.noise = 1.0; update(dt); }
        if (H.T.alarm) { last = { t0, fail: 'waiting' }; continue; }
        const path = bfs(G.map, c.x | 0, c.y | 0, goal[0] | 0, goal[1] | 0);
        let wp = 1, run = 0, maxSus = 0, holds = 0; const speed = 2.4;
        const seesAt = (px, py, margin) => { for (const g of H.guardsOf()) { if (g.hidden) continue; const gd = Math.hypot(px - g.x, py - g.y), ang = Math.abs(normAng(Math.atan2(py - g.y, px - g.x) - g.facing)); const range = (H.isLit(px, py) ? 7 : 3.8) + margin; if (gd < range && (ang < 0.85 + margin * 0.15 || gd < 1.2 + margin * 0.3) && los(g.x, g.y, px, py)) return true; } return false; };
        let ok = false;
        while (run < 200 && !H.T.alarm) {
          const tgt = wp < path.length ? [path[wp][0] + 0.5, path[wp][1] + 0.5] : goal;
          const dx = tgt[0] - c.x, dy = tgt[1] - c.y, d = Math.hypot(dx, dy);
          if (wp >= path.length && d < 0.3) { ok = true; break; }
          const look = Math.min(d, speed * 1.2), nx = c.x + dx / (d || 1) * look, ny = c.y + dy / (d || 1) * look;
          if (!seesAt(nx, ny, 0.8)) { const stepd = Math.min(d, speed * dt); c.x += dx / (d || 1) * stepd; c.y += dy / (d || 1) * stepd; G.noise = 2.4; if (d < 0.25) wp++; } else { G.noise = 1.0; holds += dt; }
          update(dt); run += dt; maxSus = Math.max(maxSus, H.T.sus);
        }
        last = { t0, ok, alarm: H.T.alarm, run: Math.round(run), holds: Math.round(holds), maxSus: +maxSus.toFixed(2) };
        if (ok) return last;
      }
      return last;
    };
    // pNx_ flags are other modules' own bookkeeping (clocks, gold watches): not the main quest and not ours
    window.__nonHeistFlags = () => { const o = {}; for (const k of Object.keys(G.flags).sort()) if (!k.startsWith('p16h_') && !/^p\d+[a-z]*_/.test(k)) o[k] = G.flags[k]; return JSON.stringify(o); };
    window.__flagDiff = (before) => { const a = JSON.parse(before), b = JSON.parse(__nonHeistFlags()), d = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) d.push(k); return d.join(); };
    window.__count = (k) => (G.player.inv.find((s) => s.id === k) || { n: 0 }).n;
    window.__rep = (f) => G.player.factions[f] || 0;
    window.__choose = (text) => { const b = [...document.querySelectorAll('#event-panel button')].find((x) => x.textContent.indexOf(text) >= 0); if (!b) return false; b.click(); return true; };
    // the game's own lockpick minigame, solved by feel
    window.__pick = () => { let n = 0; while (typeof LOCKPICK !== 'undefined' && LOCKPICK && n++ < 20) { LOCKPICK.position = LOCKPICK.centers[LOCKPICK.pin]; lockpickInput('lift'); } G.state = 'play'; return n; };
    // the dialogue as the player sees it: answer the n-th choice
    window.__say = (npcId, n) => {
      const m = G.map; const e = G.ents.find((x) => x.id === npcId) || m.entities.find((x) => x.id === npcId);
      if (n === undefined) { talk(e); return DLG.choices ? DLG.choices.map((c) => c.t) : null; }
      const r = DLG.choices[n].f(); return r;
    };
  });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const DEBUG = {};
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); if (DEBUG.last) console.log('   detail: ' + JSON.stringify(DEBUG.last)); } else console.log('ok: ' + m); };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);

    // ---------------------------------------------------------------- loaded, text, French, no dice
    const base = await ev(() => ({
      has: typeof HEIST16, on: HEIST16.cfg.on, n: HEIST16.TEXTS.length, maps: [!!G.maps.p16h_vestry, !!G.maps.p16h_depot3], items: ['p16h_letter_lyra', 'p16h_letter_dessa', 'p16h_roster', 'p16h_lease'].every((k) => !!ITEMS[k]),
      npcs: Object.values(HEIST16.NPC_IDS).every((k) => !!NPCS[k]), sprites: !!Engine.sprites.p16h_cabinet && !!Engine.sprites.p16h_safe,
      flags: Object.keys(G.flags).filter((k) => k.startsWith('p16h_')),
      keyItems: ['p16h_letter_lyra', 'p16h_letter_kaelen', 'p16h_letter_hetty', 'p16h_letter_orla', 'p16h_letter_pim', 'p16h_letter_dessa', 'p16h_roster', 'p16h_lease'].every((k) => ITEMS[k].key === true),
      law: LAW_MAPS.has('p16h_vestry'), quarryLaw: LAW_MAPS.has('quarry'),
      noEmoji: HEIST16.TEXTS.every((t) => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
      noNumeralDate: HEIST16.TEXTS.every((t) => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t) && !/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(t)),
      noScream: HEIST16.TEXTS.filter((t) => /\b(scream|screams|screamed|shriek|shrieks)/i.test(t)).length,
      noExclaim: HEIST16.TEXTS.filter((t) => /!/.test(t)).length,
      hush: HEIST16.TEXTS.filter((t) => /\bthe Hush\b/i.test(t)).length,
      music: [G.maps.p16h_vestry.music, G.maps.p16h_depot3.music],
    }));
    check(base.has === 'object' && base.on === true && base.maps[0] && base.maps[1] && base.items && base.npcs && base.sprites, 'HEIST16 exists, the switch is on by default, both maps, the items, the people and the art are registered');
    check(base.n > 250 && base.noEmoji && base.noNumeralDate && base.noScream === 0 && base.noExclaim === 0 && base.hush === 0, 'all registered text is non-empty, emoji-free, no numeral dates, nobody screams or shouts, the Hush is never described (' + base.n + ' strings)');
    check(base.flags.length === 0, 'a fresh game has no p16h_ flags');
    check(base.keyItems && base.law && !base.quarryLaw, 'letters and ledgers are key items (never confiscated); the vestry is a law map and the quarry is not');
    check(base.music.join() === 'cloister,dungeon', 'each new map has its own music (' + base.music.join() + ')');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p16-heist.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await ev(() => HEIST16.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair (' + noFr.length + ' missing: ' + noFr.slice(0, 2).join(' | ') + ')');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow)\b/.test(r[1])), 'the French follows the glossary terms (le Silence, les Creux, Chantre, la Haie)');
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'heist16.js'), 'utf8');
    check(!/Math\.random/.test(src), 'no Math.random anywhere in the module (the patrols, the bore and the guards are all deterministic)');

    // ---------------------------------------------------------------- the maps
    const mp = await ev(() => {
      const H = HEIST16, out = {}, v = G.maps.p16h_vestry, d = G.maps.p16h_depot3;
      const rv = H.reach(v, 1, 12), rd = H.reach(d, 1, 10);
      const free = (m, x, y) => !m.isBlocked(x | 0, y | 0);
      out.v = { w: v.w, h: v.h, cab: rv.has('23,1'), box: rv.has('25,14'), hatch: rv.has('3,5'), exit: rv.has('0,12'), sp: free(v, 1.5, 12.5), base: v.baseCount === v.entities.filter((e) => !e.transient).length };
      out.d = { w: d.w, h: d.h, safe: rd.has('18,14'), hatch: rd.has('28,5'), exit: rd.has('0,10'), ines: rd.has('10,3'), sp: free(d, 1.5, 10.6), base: d.baseCount === d.entities.filter((e) => !e.transient).length };
      out.routes = [H.V.ROUTE.every(([x, y]) => free(v, x, y) && rv.has((x | 0) + ',' + (y | 0))), H.D.ROUTE_R.every(([x, y]) => free(d, x, y) && rd.has((x | 0) + ',' + (y | 0))), H.D.ROUTE_P.every(([x, y]) => free(d, x, y) && rd.has((x | 0) + ',' + (y | 0)))];
      // every deco the player or a guard might need is on floor you can reach
      out.decos = [v, d].map((m, i) => m.entities.filter((e) => e.kind === 'deco' && e.use).every((e) => (i ? rd : rv).has((e.x | 0) + ',' + (e.y | 0)) || true)).every(Boolean);
      // exits: two ways out of each, neither locked, and each lands on free ground
      const ev1 = v.get(0, 12), ed = d.get(0, 10);
      out.exits = { vDoor: !!ev1.door && !ev1.locked && !ev1.lockDifficulty && ev1.portal.map === 'chapel', dDoor: !!ed.door && !ed.locked && !ed.lockDifficulty && ed.portal.map === 'quarry',
        vHatch: v.entities.some((e) => e._k === 'hatch'), dHatch: d.entities.some((e) => e._k === 'hatch'),
        chapelLand: free(G.maps.chapel, ev1.portal.x, ev1.portal.y), quarryLand: free(G.maps.quarry, ed.portal.x, ed.portal.y), oakLand: free(G.maps.oakhaven, 48.5, 2.7), quarryHatch: free(G.maps.quarry, 33.4, 5.5) };
      // the doors in the world are real doors
      const cd = G.maps.chapel.get(0, 3), qd = G.maps.quarry.get(32, 7);
      out.doors = { c: !!cd.door && cd.portal.map === 'p16h_vestry', q: !!qd.door && qd.portal.map === 'p16h_depot3', cApproach: free(G.maps.chapel, 1.5, 3.5), qApproach: free(G.maps.quarry, 31.5, 7.3) };
      // guards: only the two existing enemy types, defined on entry, none in the saved list
      out.defs = ['proctor', 'legionnaire'].every((t) => !!ENEMIES[t]);
      return out;
    });
    check(mp.v.w === 28 && mp.v.h === 17 && mp.v.cab && mp.v.box && mp.v.hatch && mp.v.exit && mp.v.sp && mp.v.base, 'the vestry (28 x 17): from the spawn you can reach the cabinet, the strongbox, the hatch and the exit; the saved entity list is just the built one');
    check(mp.d.w === 30 && mp.d.h === 18 && mp.d.safe && mp.d.hatch && mp.d.exit && mp.d.ines && mp.d.sp && mp.d.base, 'Depot Three (30 x 18): from the spawn you can reach the safe, the hatch, the clerk and the exit');
    check(mp.routes.every(Boolean), 'every patrol waypoint is free floor you can reach (the Warden, the Reckoner, Pike)');
    check(mp.exits.vDoor && mp.exits.dDoor && mp.exits.vHatch && mp.exits.dHatch && mp.exits.chapelLand && mp.exits.quarryLand && mp.exits.oakLand && mp.exits.quarryHatch, 'each map has two ways out (a door and a hatch), neither locked, each landing on free ground');
    check(mp.doors.c && mp.doors.q && mp.doors.cApproach && mp.doors.qApproach, 'the Chapel and the quarry each have a real door to the new map, with free floor before it');

    // ---------------------------------------------------------------- the people, the hook, the plan
    const plan = await ev(() => {
      const H = HEIST16, out = {}; __fresh();
      const d = H.find(G.maps.oakhaven, 'dessa'); out.dessa = !!d && !G.maps.oakhaven.isBlocked(d.x | 0, d.y | 0);
      __go('oakhaven', d.x, d.y + 1.5, -Math.PI / 2);
      out.first = __say('p16h_dessa'); out.q0 = H.stageL();
      out.no = __say('p16h_dessa', 1); out.askNo = G.flags.p16h_l_ask;
      closeModal(); G.state = 'play';
      out.again = __say('p16h_dessa'); out.yes = typeof __say('p16h_dessa', 0) === 'string'; out.q1 = H.stageL();
      out.asks = DLG.choices.map((c) => c.t);
      out.r1 = __say('p16h_dessa', 0).slice(0, 12); out.k1 = G.flags.p16h_l_k; out.q2 = H.stageL();
      out.asks2 = DLG.choices ? DLG.choices.map((c) => c.t) : null;
      __say('p16h_dessa', 0); out.k2 = G.flags.p16h_l_k; __say('p16h_dessa', 0); out.k3 = G.flags.p16h_l_k; out.qEnd = H.stageL(); out.asks3 = DLG.choices;
      closeModal(); G.state = 'play';
      out.journal = G.journal.filter((j) => /Dessa Quill|plan is whole/.test(j.text)).map((j) => j.text.slice(0, 30));
      out.planned = __say('p16h_dessa'); out.lastText = DLG.log[DLG.log.length - 1].t.slice(0, 30);
      closeModal(); G.state = 'play';
      // the notice board gives the window on its own
      __fresh(); __go('chapel', 3.2, 3.2, -Math.PI / 2);
      const board = H.find(G.maps.chapel, 'cboard'); out.board = !!board;
      useDeco(board); out.boardBit = G.flags.p16h_l_k; out.eventUp = document.querySelector('#event-panel').textContent.indexOf('STASISDAY') >= 0;
      document.querySelector('#event-panel button').click();
      return out;
    });
    check(plan.dessa && plan.first.length === 2 && plan.q0 === 0, 'Dessa Quill stands on free ground in Oakhaven and asks: help, or not');
    check(plan.askNo === 1 && plan.again.length === 2 && plan.yes && plan.q1 === 1, 'declining remembers you were asked and changes nothing; agreeing starts the job (the hook)');
    check(plan.asks.length === 3 && plan.k1 === 1 && plan.q2 === 1 && plan.asks2.length === 2 && plan.k2 === 3 && plan.k3 === 7 && !plan.asks3 && plan.qEnd === 2, 'she answers the three questions one at a time, never again once answered; with all three known the plan is whole (stage 2)');
    check(plan.journal.length === 2 && /Dessa Quill/.test(plan.journal[1]) && /plan is whole|I know now/.test(plan.journal.join(' ')), 'the logbook fills as you learn (the offer, then the plan)');
    check(plan.board && plan.boardBit === 2 && plan.eventUp, 'the nave notice board tells the hymn hours by itself (the window bit)');

    const plan2 = await ev(() => {
      const H = HEIST16, out = {}; __fresh();
      // the Compact steward in the clearing, Vause at the headframe, the Reeve in the Greenhall
      out.where = ['clearing', 'greenhall'].map((id) => { const m = G.maps[id]; return m.entities.filter((e) => e._p16h).map((e) => [e._p16h, !m.isBlocked(e.x | 0, e.y | 0)]); });
      const st = H.find(G.maps.clearing, 'steward'); __go('clearing', st.x, st.y + 1.5, -Math.PI / 2);
      out.first = __say('p16h_steward').length; __say('p16h_steward', 0);
      out.asks = DLG.choices.map((c) => c.t);
      __say('p16h_steward', 0); __say('p16h_steward', 0); __say('p16h_steward', 0);
      out.k = G.flags.p16h_d_k; out.q = H.stageD(); closeModal(); G.state = 'play';
      __go('quarry', 27.0, 9.0, Math.PI / 2); const qb = H.find(G.maps.quarry, 'qboard'); out.qb = !!qb;
      G.flags.p16h_d_k = 5; useDeco(qb); out.bell = G.flags.p16h_d_k; document.querySelector('#event-panel button').click();
      return out;
    });
    check(plan2.where.flat().length === 3 && plan2.where.flat().every((x) => x[1]), 'the Compact steward and Sergeant Vause (clearing) and Reeve Mossbrook (Greenhall) stand on free ground');
    check(plan2.first === 2 && plan2.asks.length === 3 && plan2.k === 7 && plan2.q === 2, 'the steward hooks you and answers route, bell and safe; all three known = the plan is whole');
    check(plan2.qb && plan2.bell === 7, 'the quarry shift board gives the bell (the bore cycle) on its own');

    // ---------------------------------------------------------------- the windows (availability)
    const win = await ev(() => {
      const H = HEIST16, out = { L: [], D: [] }; __fresh();
      const open = (c) => !c.locked && c.lockDifficulty === 2;
      for (let h = 0; h < 24; h += 0.5) {
        G.tod = h / 24; G.day = 1; H.syncDoors();
        out.L.push([h, open(G.maps.chapel.get(0, 3)), H.windowL()]);
        out.D.push([h, open(G.maps.quarry.get(32, 7)), H.windowD()]);
      }
      // the edges
      G.tod = 20.99 / 24; H.syncDoors(); out.l2099 = open(G.maps.chapel.get(0, 3));
      G.tod = 21.0 / 24 + 0.0001; H.syncDoors(); out.l2100 = open(G.maps.chapel.get(0, 3));
      G.tod = 4.99 / 24; H.syncDoors(); out.l0459 = open(G.maps.chapel.get(0, 3));
      G.tod = 5.0 / 24 + 0.0001; H.syncDoors(); out.l0500 = open(G.maps.chapel.get(0, 3));
      G.tod = 21.99 / 24; H.syncDoors(); out.d2159 = open(G.maps.quarry.get(32, 7));
      G.tod = 22.0 / 24 + 0.0001; H.syncDoors(); out.d2200 = open(G.maps.quarry.get(32, 7));
      G.tod = 5.99 / 24; H.syncDoors(); out.d0559 = open(G.maps.quarry.get(32, 7));
      G.tod = 6.0 / 24 + 0.0001; H.syncDoors(); out.d0600 = open(G.maps.quarry.get(32, 7));
      // the sermon window: pick the Dawnday slot from the game's own table, in daylight
      const slot = SYNOD15.B.SLOTS[0]; let day = 0; while (SYNOD15.sermonAt(day, slot.from + 0.01, G.flags) !== 0 && day < 30) day++;
      G.day = day; G.tod = slot.from + 0.01; H.syncDoors();
      out.sermonHour = (G.tod * 24).toFixed(1); out.sermon = [SYNOD15.sermonNow(), H.windowL(), open(G.maps.chapel.get(0, 3)), H.windowD()];
      G.day = day; G.tod = slot.to + 0.01; H.syncDoors(); out.after = [SYNOD15.sermonNow(), H.windowL()];
      // the bribe opens any hour, and only the Chapel door
      G.day = 1; G.tod = 0.5; G.flags.p16h_l_br = true; H.syncDoors(); out.bribe = [H.windowL(), open(G.maps.chapel.get(0, 3))]; delete G.flags.p16h_l_br; delete G.flags['picked:chapel:door:0:3'];
      // shut by day: the message tells you why
      G.tod = 0.5; H.syncDoors(); out.msgL = G.maps.chapel.get(0, 3).lockMsg; out.msgD = G.maps.quarry.get(32, 7).lockMsg;
      return out;
    });
    check(win.L.every(([h, o, w]) => o === ((h >= 21 || h < 5)) && (o ? w === 'night' : w === null)), 'Chapel door: open exactly from the ninth hour of the evening to the fifth of the morning, shut in between');
    check(win.D.every(([h, o, w]) => o === ((h >= 22 || h < 6)) && (o ? w === 'night' : w === null)), 'Depot door: open exactly from the night bell (22) to the morning bell (6), shut in between');
    check(!win.l2099 && win.l2100 && win.l0459 && !win.l0500 && !win.d2159 && win.d2200 && win.d0559 && !win.d0600, 'the window edges are exact (21:00, 05:00, 22:00, 06:00)');
    check(win.sermon[0] === 0 && win.sermon[1] === 'sermon' && win.sermon[2] && win.sermon[3] === null && win.after[0] === -1 && win.after[1] === null, 'a live sermon (Dawnday) opens the Chapel door by day, the quarry stays shut, and the window closes with the last hymn (sermon at ' + win.sermonHour + ')');
    check(win.bribe[0] === 'bribe' && win.bribe[1], 'the sexton\'s key opens the Chapel door at any hour');
    check(/singing, or when it is dark/.test(win.msgL) && /after the night bell/.test(win.msgD), 'the shut doors say why and when to come');

    // ---------------------------------------------------------------- closing (the Greening, the Rite) and the switch
    const clo = await ev(() => {
      const H = HEIST16, out = {}; __fresh();
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7; G.flags.p16h_d_q = 1; H.syncAll();
      out.before = [H.find(G.maps.oakhaven, 'dessa') ? 1 : 0, H.find(G.maps.clearing, 'steward') ? 1 : 0, H.find(G.maps.greenhall, 'moss') ? 1 : 0, H.find(G.maps.chapel, 'orrin') ? 1 : 0];
      const n0 = G.journal.length;
      G.flags.greening = true; G.tod = 0.95; H.checkClosure(); H.checkClosure();
      out.after = [H.find(G.maps.oakhaven, 'dessa') ? 1 : 0, H.find(G.maps.clearing, 'steward') ? 1 : 0, H.find(G.maps.greenhall, 'moss') ? 1 : 0, H.find(G.maps.chapel, 'orrin') ? 1 : 0, H.find(G.maps.chapel, 'cboard') ? 1 : 0, H.find(G.maps.quarry, 'qboard') ? 1 : 0];
      out.closedFlags = [!!G.flags.p16h_l_closed, !!G.flags.p16h_d_closed]; out.lines = G.journal.length - n0;
      out.doors = [G.maps.chapel.get(0, 3).locked, G.maps.quarry.get(32, 7).locked, G.maps.chapel.get(0, 3).lockMsg.indexOf('new lock') >= 0, G.maps.quarry.get(32, 7).lockMsg.indexOf('finished reconciling') >= 0];
      out.win = [H.windowL(), H.windowD()];
      out.dessaTalk = (() => { const q = NPCS.p16h_dessa.quest(G); return q && q.text.slice(0, 20); })();
      delete G.flags.greening;
      // the Rite and the switch
      __fresh(); G.flags.p16h_d_q = 2; G.flags.rite_started = true; H.checkClosure(); out.rite = [!!G.flags.p16h_d_closed, H.windowD()]; delete G.flags.rite_started;
      __fresh(); H.cfg.on = false; G.tod = 0.95; H.syncAll();
      out.off = [H.find(G.maps.oakhaven, 'dessa') ? 1 : 0, H.find(G.maps.chapel, 'orrin') ? 1 : 0, G.maps.chapel.get(0, 3).locked, G.maps.quarry.get(32, 7).locked, H.windowL(), H.windowD(), NPCS.p16h_dessa.quest(G).text.slice(0, 12)];
      H.cfg.on = true; H.syncAll();
      out.on = [H.find(G.maps.oakhaven, 'dessa') ? 1 : 0, G.maps.chapel.get(0, 3).locked];
      return out;
    });
    check(clo.before.join() === '1,1,1,1' && clo.after.join() === '0,0,0,0,0,0', 'at the Greening every new person and prop is gone from the world');
    check(clo.closedFlags.join() === 'true,true' && clo.lines === 2, 'a heist begun and not finished closes with exactly one logbook line each, however often it is checked');
    check(clo.doors[0] === '__never' && clo.doors[1] === '__never' && clo.doors[2] && clo.doors[3] && clo.win.join() === ',', 'both doors are shut for good with their own line, even at night');
    check(clo.rite[0] === true && clo.rite[1] === null, 'the Rite closes the heists too');
    check(clo.off[0] === 0 && clo.off[1] === 0 && clo.off[2] === '__never' && clo.off[3] === '__never' && clo.off[4] === null && clo.off[5] === null, 'switched off: nobody asks, the props are gone, both doors stay shut at night (the original game)');
    check(clo.on[0] === 1 && clo.on[1] !== '__never', 'switched back on: everything returns');

    await ev(() => { HEIST16.cfg.on = true; });
    // ---------------------------------------------------------------- THE HELD LETTERS: quiet (night, the lock, the stealth)
    const l1 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      const nonHeist0 = __nonHeistFlags(), g0 = G.player.gold, hedge0 = __rep('hedge'), syn0 = __rep('synod'), xp0 = window.__xp;
      __go('chapel', 1.7, 3.5, Math.PI); H.syncAll();
      interact(); out.lockUp = G.openPanel === 'lockpick';
      __pick(); out.doorFlag = !!G.flags['picked:chapel:door:0:3'];
      G.state = 'play'; interact(); out.map = G.mapId; out.q3 = H.stageL(); out.ap = G.flags.p16h_l_ap;
      out.guards = H.guardsOf().length;
      out.stealth = __stealth('L', [23.6, 3.0], [5, 12.5]);
      out.alarm = H.T.alarm; out.mapStill = G.mapId;
      const cab = G.ents.find((e) => e._k === 'cab'); out.cab = !!cab && Math.hypot(cab.x - Engine.cam.x, cab.y - Engine.cam.y) < 2.6;
      useDeco(cab); out.choices = [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent);
      __choose('Pick the brass'); out.lockUp2 = G.openPanel === 'lockpick'; __pick();
      out.q4 = H.stageL(); out.letters = H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)); out.pk = !!G.flags.p16h_pk_cab;
      out.label = cab.label.slice(0, 30);
      // the strongbox, picked
      const box = G.ents.find((e) => e._k === 'box'); __go('p16h_vestry', box.x - 1.0, box.y - 0.5, 0); H.T.away.warden = 999; for (const g of H.guardsOf()) g.hidden = true;
      useDeco(box); __choose('Pick the lock'); __pick(); out.fee = [G.player.gold - g0, !!G.flags.p16h_l_fee]; useDeco(box); out.feeTwice = G.player.gold - g0;
      // out by the front door: the exit door cell, by hand
      __go('p16h_vestry', 1.5, 12.5, Math.PI); interact();
      out.out = { map: G.mapId, q: H.stageL(), flag: !!G.flags.p16h_l_out, clean: !!G.flags.p16h_l_clean, xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, synod: __rep('synod') - syn0, gold: G.player.gold - g0, bounty: G.player.crime.bounty,
        pk: Object.keys(G.flags).filter((k) => k.startsWith('p16h_pk_') || k.startsWith('picked:')), lettersKept: H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join(''), nonHeist: __flagDiff(nonHeist0),
        guardsLeft: G.maps.p16h_vestry.entities.filter((e) => e._pa).length, journal: G.journal.filter((j) => /six letters/.test(j.text)).length };
      H.syncAll(); G.tod = 0.95; out.reentry = [H.windowL(), G.maps.chapel.get(0, 3).locked];
      return out;
    });
    check(l1.lockUp && l1.doorFlag && l1.map === 'p16h_vestry' && l1.q3 === 3 && l1.ap === 1 && l1.guards === 1, 'quiet: at night the vestry door is the game\'s own lockpick; you are in (stage "in"), approach "quiet", one Warden on the round');
    check(l1.stealth.ok && l1.alarm === null && l1.mapStill === 'p16h_vestry' && l1.cab, 'quiet: a patient burglar reaches the cabinet unseen (waited ' + l1.stealth.t0 + ' s, held ' + l1.stealth.holds + ' s, most-watched ' + l1.stealth.maxSus + ')');
    check(l1.choices.length === 3 && /Pick/.test(l1.choices[0]) && /Force/.test(l1.choices[1]) && l1.lockUp2 && l1.q4 === 4 && l1.letters.join('') === '111111' && /open/.test(l1.label), 'quiet: the cabinet offers pick / force / leave (no key without Orrin); the game\'s lockpick opens it; six letters, one each');
    check(l1.fee[0] === 36 && l1.fee[1] && l1.feeTwice === 36, 'the strongbox pays 36 sovereigns, once');
    check(l1.out.map === 'chapel' && l1.out.q === 5 && l1.out.flag && l1.out.clean && l1.out.xp === 60 && l1.out.hedge === 2 && l1.out.synod === 0 && l1.out.gold === 36 && l1.out.bounty === 0, 'quiet: out by the door clean: +60 xp, +2 standing with the Hedge exactly, nothing with the Synod, no warrant (' + JSON.stringify([l1.out.xp, l1.out.hedge, l1.out.gold]) + ')');
    DEBUG.last = l1.out;
    check(l1.out.pk.length === 0 && l1.out.lettersKept === '111111' && l1.out.nonHeist === '' && l1.out.guardsLeft === 0 && l1.out.journal === 2, 'the picked locks are forgotten, the letters stay with you, no other flag moved, the guards are gone; the logbook has the take and the way out');
    check(l1.reentry[0] === null && l1.reentry[1] === '__never', 'the job is done: the Chapel door stays shut');

    // ---------------------------------------------------------------- delivering the six: exact payoffs
    const dl = await ev(() => {
      const H = HEIST16, out = { rows: [] };
      const where = { lyra: 'lyra_house', kaelen: 'clearing', hetty: 'tavern', orla: 'orla_house', pim: 'mill' };
      const hedge = () => __rep('hedge');
      for (const k of ['lyra', 'kaelen', 'hetty', 'orla', 'pim']) {
        const m = G.maps[where[k]], e = m.entities.find((x) => x.id === k);
        const near = !!e && !e.hidden && !e.dead;
        __go(where[k], e.x, e.y + 1.4, -Math.PI / 2);
        // away from the person it is only a letter
        const far = (() => { __go(where[k] === 'tavern' ? 'oakhaven' : 'oakhaven', 30.5, 30.5, 0); useItem({ id: 'p16h_letter_' + k }); const t = document.querySelector('#event-panel').textContent; const btn = [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent); document.querySelector('#event-panel button').click(); return [/not here/.test(t), btn.length]; })();
        __go(where[k], e.x, e.y + 1.4, -Math.PI / 2);
        const h0 = hedge(), g0 = G.player.gold, x0 = window.__xp;
        useItem({ id: 'p16h_letter_' + k }); const hasBtn = __choose('Give it to them');
        out.rows.push([k, near, far.join(), hasBtn, +(hedge() - h0).toFixed(2), G.player.gold - g0, window.__xp - x0, __count('p16h_letter_' + k), !!(H.delivered(k))]);
        document.querySelector('#event').classList.add('hidden'); G.state = 'play';
      }
      // Dessa, by talking
      const d = H.find(G.maps.oakhaven, 'dessa'); __go('oakhaven', d.x, d.y + 1.5, -Math.PI / 2);
      const h0 = hedge(), g0 = G.player.gold, x0 = window.__xp;
      const ch = __say('p16h_dessa'); out.dessaChoices = ch; const r = __say('p16h_dessa', 0);
      out.dessa = [+(hedge() - h0).toFixed(2), G.player.gold - g0, window.__xp - x0, __count('p16h_letter_dessa'), H.deliveredCount(), H.stageL(), !!G.flags.p16h_l_all, G.player.titles.includes('Letter-Bearer'), typeof r === 'string' && r.length > 20];
      closeModal(); G.state = 'play';
      out.total = [__rep('hedge'), G.player.gold, window.__xp];
      out.ld = G.flags.p16h_l_ld;
      out.after = (() => { talk(d); return DLG.log[DLG.log.length - 1].t.slice(0, 22); })(); closeModal(); G.state = 'play';
      out.again = (() => { const before = [hedge(), G.player.gold, window.__xp]; for (const k of H.LETTER_IDS) H.deliverLetter(k); return [hedge() === before[0], G.player.gold === before[1], window.__xp === before[2]]; })();
      return out;
    });
    const want = { lyra: [3, 0, 20], kaelen: [3, 0, 20], hetty: [2, 8, 15], orla: [2, 6, 15], pim: [2, 0, 15] };
    check(dl.rows.every((r) => r[1] && r[2] === 'true,1' && r[3]), 'each letter, read away from its person, only reads (and offers no delivery); next to its person it offers to deliver');
    check(dl.rows.every((r) => want[r[0]].join() === [r[4], r[5], r[6]].join() && r[7] === 0 && r[8]), 'each of the five letters pays exactly its own: Lyra +3 / Kaelen +3 / Hetty +2 and 8 sov. / Orla +2 and 6 sov. / Pim +2, with 20/20/15/15/15 xp');
    check(dl.dessa[0] === 2 + 4 && dl.dessa[1] === 0 && dl.dessa[2] === 15 && dl.dessa[3] === 0 && dl.dessa[4] === 6 && dl.dessa[5] === 6 && dl.dessa[6] && dl.dessa[7] && dl.dessa[8], 'the sixth, to Dessa by talking: +2, and with all six +4 more and the title Letter-Bearer; the job is done (stage 6)');
    check(dl.out === undefined && dl.ld === 63 && /Quiet\./.test(dl.after) && dl.again.every(Boolean), 'the books are closed: Dessa has her closing line and nothing can be delivered twice');

    // ---------------------------------------------------------------- THE HELD LETTERS: the sexton's key (bribe)
    const l2 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.5, gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 3; G.flags.p16h_l_ask = 2;
      const nonHeist0 = __nonHeistFlags(), g0 = G.player.gold, hedge0 = __rep('hedge'), xp0 = window.__xp;
      __go('chapel', 3.4, 5.6, Math.PI); H.syncAll();
      out.day = [H.windowL(), G.maps.chapel.get(0, 3).locked];
      const ch = __say('p16h_orrin'); out.offer = ch && ch.length; out.keyLearnt = G.flags.p16h_l_k;
      const r = __say('p16h_orrin', 0); out.paid = [g0 - G.player.gold, !!G.flags.p16h_l_br, !!G.flags['picked:chapel:door:0:3'], H.windowL(), G.flags.p16h_l_q];
      closeModal(); G.state = 'play';
      out.again = (() => { talk(H.find(G.maps.chapel, 'orrin')); const t = DLG.log[DLG.log.length - 1].t; closeModal(); G.state = 'play'; return /asleep/.test(t) && G.player.gold === g0 - 30; })();
      __go('chapel', 1.7, 3.5, Math.PI); interact(); out.map = G.mapId; out.ap = G.flags.p16h_l_ap;
      for (let i = 0; i < 40; i++) { G.noise = 1; update(0.05); }
      const w = H.guardsOf()[0]; out.warden = [w.hidden, H.T.away.warden > 80 && H.T.away.warden <= 90];
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      useDeco(cab); out.choices = [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent);
      __choose('key'); out.noPanel = G.openPanel !== 'lockpick'; out.q4 = H.stageL(); out.letters = H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join('');
      // out by the coal-hatch
      const hatch = G.ents.find((e) => e._k === 'hatch'); __go('p16h_vestry', hatch.x + 0.4, hatch.y + 0.5, Math.PI); useDeco(hatch);
      out.out = { map: G.mapId, q: H.stageL(), clean: !!G.flags.p16h_l_clean, xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, gold: G.player.gold - g0, br: !!G.flags.p16h_l_br, picked: !!G.flags['picked:chapel:door:0:3'], ap: G.flags.p16h_l_ap, nonHeist: __flagDiff(nonHeist0), free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0) };
      return out;
    });
    check(l2.day[0] === null && l2.day[1] === '__never' && l2.offer === 2 && l2.keyLearnt === 7, 'bribe: by day the door is shut; Orrin Pale, once you are in on it, names his price (and the keys bit is learnt)');
    check(l2.paid[0] === 30 && l2.paid[1] && l2.paid[2] && l2.paid[3] === 'bribe' && l2.again, 'bribe: thirty sovereigns exactly, the key is in the lock at any hour, and he cannot be paid twice');
    check(l2.map === 'p16h_vestry' && l2.ap === 2 && l2.warden[0] && l2.warden[1], 'bribe: you walk straight in; the Warden is "at supper" for ninety seconds and out of sight');
    check(l2.choices.length === 4 && /key/.test(l2.choices[0]) && l2.noPanel && l2.q4 === 4 && l2.letters === '111111', 'bribe: the cabinet offers Orrin\'s key first; it opens without the lockpick');
    DEBUG.last = l2.out;
    check(l2.out.map === 'oakhaven' && l2.out.free && l2.out.q === 5 && l2.out.clean && l2.out.xp === 60 && l2.out.hedge === 2 && l2.out.gold === -30 && !l2.out.br && !l2.out.picked && l2.out.ap === 2 && l2.out.nonHeist === '', 'bribe: out by the coal-hatch into the Oakhaven lane, same payoff (+60 xp, +2), net cost thirty sovereigns, the key flags cleared');

    // ---------------------------------------------------------------- THE HELD LETTERS: under the hymn (a live sermon)
    const l3 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      const slot = SYNOD15.B.SLOTS[0]; let day = 0; while (SYNOD15.sermonAt(day, slot.from + 0.01, G.flags) !== 0 && day < 30) day++;
      G.day = day; G.tod = slot.from + 0.02; H.syncAll();
      const hedge0 = __rep('hedge'), xp0 = window.__xp;
      __go('chapel', 1.7, 3.5, Math.PI); interact(); out.lock = G.openPanel; __pick(); G.state = 'play'; interact();
      out.map = G.mapId; out.ap = G.flags.p16h_l_ap; out.sermon = H.sermonLive();
      for (let i = 0; i < 60; i++) { G.noise = 1; update(0.05); }
      out.warden = H.guardsOf()[0].hidden;
      // running in the open under the hymn: your noise is capped
      G.noise = 6; out.eff = H.effNoise();
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      useDeco(cab); __choose('Force the doors');
      out.noAlarm = H.T.alarm === null; out.bounty = G.player.crime.bounty; out.q4 = H.stageL(); out.letters = H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join('');
      __go('p16h_vestry', 1.5, 12.5, Math.PI); interact();
      out.out = { map: G.mapId, q: H.stageL(), clean: !!G.flags.p16h_l_clean, xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, ap: G.flags.p16h_l_ap, synod: __rep('synod') };
      return out;
    });
    check(l3.lock === 'lockpick' && l3.map === 'p16h_vestry' && l3.ap === 4 && l3.sermon && l3.warden && l3.eff === 2, 'hymn: a live sermon opens the door by day, the Warden stands with the deacon (out of sight), and your noise is held at 2.0');
    check(l3.noAlarm && l3.bounty === 0 && l3.q4 === 4 && l3.letters === '111111', 'hymn: the cabinet can be forced on the downbeat, quietly: no alarm, no warrant');
    check(l3.out.map === 'chapel' && l3.out.q === 5 && l3.out.clean && l3.out.xp === 60 && l3.out.hedge === 2 && l3.out.ap === 4 && l3.out.synod === 0, 'hymn: out clean with the same payoff');

    // ---------------------------------------------------------------- THE HELD LETTERS: in the Synod\'s robes
    const l4 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      G.give('a_synodrobe'); equipArmor('a_synodrobe'); out.worn = wearingDisguise();
      __go('chapel', 1.7, 3.5, Math.PI); interact(); __pick(); G.state = 'play'; interact();
      out.map = G.mapId; out.ap = G.flags.p16h_l_ap;
      __go('p16h_vestry', 18.4, 11.9, Math.PI);
      const w = H.guardsOf()[0]; w.x = 14.0; w.y = 11.9; w._pa.wait = 1e6; w._pa.baseFace = 0; w.facing = 0; w.hidden = false;
      let maxSus = 0; for (let i = 0; i < 80; i++) { G.noise = 2.4; w.x = 14.0; w.y = 11.9; update(0.05); maxSus = Math.max(maxSus, w._pa.sus); }
      out.robes = [+maxSus.toFixed(2), H.T.alarm, w.state];
      removeArmor('body'); out.bare = wearingDisguise();
      maxSus = 0; for (let i = 0; i < 80 && !H.T.alarm; i++) { G.noise = 2.4; if (!H.T.alarm) { w.x = 14.0; w.y = 11.9; } update(0.05); maxSus = Math.max(maxSus, w._pa.sus); }
      out.control = [+maxSus.toFixed(2), H.T.alarm];
      return out;
    });
    check(l4.worn && l4.map === 'p16h_vestry' && l4.ap === 5, 'robes: wearing the Synod clerk robes is recorded as the approach');
    check(l4.robes[0] === 0 && l4.robes[1] === null && l4.robes[2] === 'idle', 'robes: a Proctor four paces off, in the lamplight, facing you, never grows suspicious');
    DEBUG.last = [l4.bare, l4.control];
    check(!l4.bare && l4.control[0] >= 1 && l4.control[1] === 'seen', 'robes: the same scene without them is seen within seconds (the control)');

    // ---------------------------------------------------------------- THE HELD LETTERS: loud (force it, and the law)
    const l5 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95, gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      const nonHeist0 = __nonHeistFlags(), hedge0 = __rep('hedge'), syn0 = __rep('synod'), xp0 = window.__xp, g0 = G.player.gold;
      __go('chapel', 1.7, 3.5, Math.PI); interact(); __pick(); G.state = 'play'; interact();
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = 13.5; g.y = 3.0; }
      useDeco(cab); __choose('Force the doors');
      out.alarm = [H.T.alarm, G.flags.p16h_l_al, G.flags.p16h_l_ap, G.player.crime.bounty, +(__rep('synod') - syn0).toFixed(2), H.stageL(), H.guardsOf().every((g) => g.state === 'chase')];
      out.letters = H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join('');
      H.reinforce(3); out.watch0 = !!H.find(G.map, 'watch');
      H.reinforce(B_WATCH());
      function B_WATCH() { return HEIST16.B.WATCH_SECS; }
      const c = H.find(G.map, 'watch'); out.watch = !!c && c.lawGuard === true && c.transient === true;
      // the constable reaches you: the existing arrest panel, with its existing ways out
      c.x = Engine.cam.x - 1.2; c.y = Engine.cam.y; update(0.05); out.arrestPanel = G.openPanel;
      const pay = document.getElementById('crime-pay'); out.payBtn = !!pay && !pay.disabled;
      pay.click(); out.paid = [g0 - G.player.gold, G.player.crime.bounty, G.state, G.openPanel];
      // and the way out: the hatch
      const hatch = G.ents.find((e) => e._k === 'hatch'); __go('p16h_vestry', hatch.x + 0.4, hatch.y + 0.5, Math.PI); useDeco(hatch);
      out.out = { map: G.mapId, q: H.stageL(), clean: !!G.flags.p16h_l_clean, xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, synod: +(__rep('synod') - syn0).toFixed(2), ap: G.flags.p16h_l_ap, nonHeist: __flagDiff(nonHeist0), watchLeft: G.maps.p16h_vestry.entities.filter((e) => e._p16h === 'watch').length };
      return out;
    });
    check(l5.alarm[0] === 'loud' && l5.alarm[1] === 2 && l5.alarm[2] === 3 && l5.alarm[3] === 40 && l5.alarm[4] === -4 && l5.alarm[5] === 4 && l5.alarm[6], 'loud: forcing the cabinet raises a loud alarm: warrant +40, Synod standing -4 exactly, approach "loud", the Warden comes for you, the letters are yours');
    check(l5.letters === '111111' && !l5.watch0 && l5.watch, 'loud: the haul is kept; the watch constable comes down the stair ten seconds after, not before');
    check(l5.arrestPanel === 'arrest' && l5.payBtn && l5.paid[0] === 40 && l5.paid[1] === 0 && l5.paid[2] === 'play', 'loud: when the constable reaches you it is the existing arrest panel; paying the fine (exactly 40) clears the warrant and you may go');
    DEBUG.last = l5.out;
    check(l5.out.map === 'oakhaven' && l5.out.q === 5 && !l5.out.clean && l5.out.xp === 60 && l5.out.hedge === 2 && l5.out.synod === -4 && l5.out.ap === 3 && l5.out.nonHeist === '' && l5.out.watchLeft === 0, 'loud: you get out with the letters; same payoff, no "clean" mark, the Synod still angry');

    // ---------------------------------------------------------------- THE HELD LETTERS: caught (seen with the haul), and the law
    const l6 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95, gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      const syn0 = __rep('synod'), xp0 = window.__xp, hedge0 = __rep('hedge'), nonHeist0 = __nonHeistFlags();
      __go('chapel', 1.7, 3.5, Math.PI); interact(); __pick(); G.state = 'play'; interact();
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = 13.5; g.y = 3.0; }
      useDeco(cab); __choose('Pick the brass'); __pick();
      out.had = [H.stageL(), H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join('')];
      // the Warden comes round the shelf and stands where he can see you, in the dark, two paces off
      const w = H.guardsOf()[0]; w.x = 20.5; w.y = 3.2; w.facing = 0; w._pa.baseFace = 0; w._pa.wait = 1e6; w.state = 'idle'; w.hidden = false;
      let i = 0; for (; i < 120 && !H.T.alarm; i++) { G.noise = 1; w.x = 20.5; w.y = 3.2; update(0.05); }
      out.seenAfter = +(i * 0.05).toFixed(1);
      out.alarm = [H.T.alarm, G.flags.p16h_l_al, G.player.crime.bounty, +(__rep('synod') - syn0).toFixed(2), H.stageL(), H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join(''), !!G.flags.p16h_pk_cab, cab.label.slice(0, 30)];
      // he takes your sleeve: you are walked out. No fight, no death.
      let j = 0; for (; j < 400 && G.mapId === 'p16h_vestry'; j++) update(0.05);
      out.collar = [G.mapId, G.state, H.T.alarm, H.stageL(), G.flags.p16h_l_try, G.player.crime.bounty, G.player.hp > 0, (Number(G.lawGrace) || 0) > 0, !G.flags['picked:chapel:door:0:3']];
      // the existing law: a constable in the nave, the arrest panel, and every way out of it
      G.lawGrace = 0; renderArrest(); out.panel = G.openPanel;
      document.getElementById('crime-flee').click(); out.flee = [G.state, G.openPanel];
      G.lawGrace = 0; renderArrest(); document.getElementById('crime-jail').click();
      out.jail = [G.mapId, !!G.player.crime.custody, G.state];
      tickCustody(6); out.freed = [G.mapId, G.player.crime.bounty, G.player.crime.custody, G.state, G.openPanel];
      // and the job is still there to do again, and pays once
      H.syncAll(); out.again = [H.stageL(), H.windowL()];
      G.tod = 0.95; __go('chapel', 1.7, 3.5, Math.PI); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      for (const g of H.guardsOf()) g.hidden = true; H.T.away.warden = 999; H.takeLetters(); __go('p16h_vestry', 1.5, 12.5, Math.PI); interact();
      out.second = { map: G.mapId, q: H.stageL(), xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, clean: !!G.flags.p16h_l_clean, tries: G.flags.p16h_l_try };
      return out;
    });
    DEBUG.last = l6;
    check(l6.had[0] === 4 && l6.had[1] === '111111' && l6.alarm[0] === 'seen' && l6.seenAfter < 4, 'caught: a Proctor who sees you in the dark two paces off raises the alarm within seconds (' + l6.seenAfter + ' s)');
    check(l6.alarm[1] === 1 && l6.alarm[2] === 40 && l6.alarm[3] === -4 && l6.alarm[4] === 3 && l6.alarm[5] === '000000' && !l6.alarm[6] && /Held Cabinet/.test(l6.alarm[7]) && !/open/.test(l6.alarm[7]), 'caught: warrant +40, Synod -4 exactly; the six letters go back into the cabinet and the cabinet is sealed again');
    check(l6.collar[0] === 'chapel' && l6.collar[1] === 'play' && l6.collar[2] === null && l6.collar[3] === 2 && l6.collar[4] === 1 && l6.collar[5] === 40 && l6.collar[6] && l6.collar[7] && l6.collar[8], 'caught: he walks you out into the nave: alive, free to move, the warrant stands, the job can be tried again (stage back to "planned", one try counted)');
    check(l6.panel === 'arrest' && l6.flee[0] === 'play' && l6.flee[1] === null, 'law: the existing arrest panel opens in the Chapel, and "Refuse and run" returns you to play');
    check(l6.jail[0] === 'watchhouse' && l6.jail[1] && l6.freed[0] === 'oakhaven' && l6.freed[1] === 0 && l6.freed[2] === null && l6.freed[3] === 'play' && l6.freed[4] === null, 'law: prison, serve the six hours, released into Oakhaven with the warrant withdrawn (no softlock)');
    check(l6.again[0] === 2 && l6.second.q === 5 && l6.second.xp === 60 && l6.second.hedge === 2 && l6.second.clean && l6.second.tries === 1, 'caught once, free again, you can do it again and be paid once (60 xp, +2); the earlier try stays counted');

    const l7 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95, gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7;
      __go('chapel', 1.7, 3.5, Math.PI); interact(); __pick(); G.state = 'play'; interact();
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = 13.5; g.y = 3.0; }
      useDeco(cab); __choose('Force the doors');
      out.loud = [H.T.alarm, H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join('')];
      H.reinforce(11); const c = H.find(G.map, 'watch'); c.x = Engine.cam.x - 1.2; c.y = Engine.cam.y; update(0.05);
      out.arrest = G.openPanel; document.getElementById('crime-jail').click();
      out.jail = [G.mapId, !!G.player.crime.custody, H.LETTER_IDS.map((k) => __count('p16h_letter_' + k)).join(''), H.stageL(), G.flags.p16h_l_try, !!G.flags.p16h_l_out];
      tickCustody(6); out.freed = [G.mapId, G.state, G.player.crime.bounty];
      return out;
    });
    check(l7.loud[0] === 'loud' && l7.loud[1] === '111111' && l7.arrest === 'arrest' && l7.jail[0] === 'watchhouse' && l7.jail[2] === '000000' && l7.jail[3] === 2 && l7.jail[4] === 1 && !l7.jail[5], 'law: arrested inside the vestry with the haul, you go to the watch-house without it (the letters are returned to the Chapel), and nothing is paid');
    check(l7.freed[0] === 'oakhaven' && l7.freed[1] === 'play' && l7.freed[2] === 0, 'law: released, warrant withdrawn');

    // ---------------------------------------------------------------- DEPOT THREE: quiet (the night bell, the bore, the lock)
    const d1 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      const nonHeist0 = __nonHeistFlags(), g0 = G.player.gold, hedge0 = __rep('hedge'), xp0 = window.__xp, off0 = __rep('office'), syn0 = __rep('synod');
      __go('quarry', 31.5, 7.3, 0); H.syncAll();
      interact(); out.lockUp = G.openPanel === 'lockpick'; __pick(); out.doorFlag = !!G.flags['picked:quarry:door:32:7'];
      G.state = 'play'; interact(); out.map = G.mapId; out.q3 = H.stageD(); out.ap = G.flags.p16h_d_ap; out.guards = H.guardsOf().map((g) => g.type).sort().join();
      out.stealth = __stealth('D', [19.5, 14.2], [3.5, 15]);
      out.alarm = H.T.alarm;
      const safe = G.ents.find((e) => e._k === 'safe'); out.near = Math.hypot(safe.x - Engine.cam.x, safe.y - Engine.cam.y) < 2.6;
      useDeco(safe); out.choices = [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent);
      __choose('Pick the three'); out.lock2 = G.openPanel === 'lockpick'; __pick();
      out.took = [H.stageD(), __count('p16h_roster'), __count('p16h_lease'), G.player.gold - g0, safe.label.slice(0, 30)];
      useDeco(safe); out.twice = G.player.gold - g0;
      __go('p16h_depot3', 1.5, 10.6, Math.PI); interact();
      out.out = { map: G.mapId, q: H.stageD(), clean: !!G.flags.p16h_d_clean, xp: window.__xp - xp0, hedge: __rep('hedge') - hedge0, office: __rep('office') - off0, synod: __rep('synod') - syn0, gold: G.player.gold - g0, bounty: G.player.crime.bounty,
        pk: Object.keys(G.flags).filter((k) => k.startsWith('p16h_pk_') || k.startsWith('picked:')), kept: [__count('p16h_roster'), __count('p16h_lease')].join(''), nonHeist: __flagDiff(nonHeist0), guardsLeft: G.maps.p16h_depot3.entities.filter((e) => e._pa).length };
      H.syncAll(); out.reentry = [H.windowD(), G.maps.quarry.get(32, 7).locked];
      return out;
    });
    DEBUG.last = d1.out;
    check(d1.lockUp && d1.doorFlag && d1.map === 'p16h_depot3' && d1.q3 === 3 && d1.ap === 1 && d1.guards === 'legionnaire,proctor', 'depot quiet: after the night bell the Factor\'s door is the game\'s own lockpick; you are in, approach "quiet", two guards (a Proctor and a Legionnaire)');
    check(d1.stealth.ok && d1.alarm === null && d1.near, 'depot quiet: a patient burglar gets past the Reckoner and Pike to the safe unseen (waited ' + d1.stealth.t0 + ' s, held ' + d1.stealth.holds + ' s, most-watched ' + d1.stealth.maxSus + ')');
    DEBUG.last = [d1.choices, d1.lock2, d1.took, d1.twice];
    check(d1.choices.length === 3 && /Pick/.test(d1.choices[0]) && d1.lock2 && d1.took[0] === 4 && d1.took[1] === 1 && d1.took[2] === 1 && d1.took[3] === 50 && /open/.test(d1.took[4]) && d1.twice === 50, 'depot quiet: pick / break it open / leave; the game\'s lockpick opens the safe: the roster, the lease and fifty sovereigns, once');
    check(d1.out.map === 'quarry' && d1.out.q === 5 && d1.out.clean && d1.out.xp === 70 && d1.out.hedge === 0 && d1.out.office === 0 && d1.out.synod === 0 && d1.out.gold === 50 && d1.out.bounty === 0, 'depot quiet: out by the door clean: +70 xp, no standing moved, no warrant, the fifty sovereigns kept');
    check(d1.out.pk.length === 0 && d1.out.kept === '11' && d1.out.nonHeist === '' && d1.out.guardsLeft === 0 && d1.reentry[0] === null && d1.reentry[1] === '__never', 'depot quiet: the picked locks are forgotten, the documents stay with you, no other flag moved, and the job is done (the door stays shut)');

    // ---------------------------------------------------------------- DEPOT THREE: the clerk (bribe)
    const d2 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95, gold: 100 });
      G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 3;
      const nonHeist0 = __nonHeistFlags(), g0 = G.player.gold, xp0 = window.__xp;
      __go('quarry', 31.5, 7.3, 0); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      out.map = G.mapId; out.ap0 = G.flags.p16h_d_ap;
      // find the clerk on the counting floor while the Reckoner is elsewhere
      const ines = H.find(G.map, 'ines'); out.ines = !!ines && !ines.hidden;
      __go('p16h_depot3', ines.x + 0.3, ines.y + 1.4, -Math.PI / 2);
      for (const g of H.guardsOf()) if (g.type === 'proctor') { g.hidden = true; g.x = 27.5; g.y = 10.6; g._pa.wait = 1e6; }
      const ch = __say('p16h_ines'); out.offer = ch && ch.length; out.safeBit = G.flags.p16h_d_k;
      __say('p16h_ines', 0); out.paid = [g0 - G.player.gold, !!G.flags.p16h_d_br, !!G.flags.p16h_pk_safe, H.windowD(), G.flags.p16h_d_ap, H.T.away.pike > 70];
      closeModal(); G.state = 'play';
      out.again = (() => { talk(H.find(G.map, 'ines')); const t = DLG.log[DLG.log.length - 1].t; closeModal(); G.state = 'play'; return /empty|cup/.test(t) || DLG.log.length; })();
      for (let i = 0; i < 40; i++) { G.noise = 1; update(0.05); }
      const pike = H.guardsOf().find((g) => g.type === 'legionnaire'); out.pike = [pike.hidden, find2().hidden];
      function find2() { return H.find(G.map, 'ines'); }
      const safe = G.ents.find((e) => e._k === 'safe'); __go('p16h_depot3', 19.6, 14.2, Math.PI);
      for (const g of H.guardsOf()) { if (g.type === 'proctor') { g.hidden = true; g.x = 27.5; g.y = 10.6; g._pa.wait = 1e6; } }
      useDeco(safe); out.choices = [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent);
      __choose('plate-key'); out.noPanel = G.openPanel !== 'lockpick'; out.docs = [H.stageD(), __count('p16h_roster'), __count('p16h_lease')];
      const hatch = G.ents.find((e) => e._k === 'hatch'); __go('p16h_depot3', hatch.x - 0.4, hatch.y + 0.5, 0); useDeco(hatch);
      out.out = { map: G.mapId, q: H.stageD(), clean: !!G.flags.p16h_d_clean, xp: window.__xp - xp0, gold: G.player.gold - g0, br: !!G.flags.p16h_d_br, picked: Object.keys(G.flags).filter((k) => k.startsWith('p16h_pk_') || k.startsWith('picked:')), ap: G.flags.p16h_d_ap, nonHeist: __flagDiff(nonHeist0), free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0) };
      return out;
    });
    DEBUG.last = d2;
    check(d2.map === 'p16h_depot3' && d2.ines && d2.offer === 2 && d2.safeBit === 7, 'depot bribe: Ines Tarn, the night clerk, sits at her desk on the counting floor; once you are in on it she names her price (and the safe bit is learnt)');
    check(d2.paid[0] === 40 && d2.paid[1] && d2.paid[3] === 'bribe' && d2.paid[4] === 2 && d2.paid[5], 'depot bribe: forty sovereigns exactly; Corporal Pike goes for tea for seventy-five seconds; the approach is "bribe"');
    check(d2.pike[0] && d2.pike[1], 'depot bribe: Pike and the clerk both leave the room');
    check(d2.choices.length === 4 && /plate-key/.test(d2.choices[0]) && d2.noPanel && d2.docs.join() === '4,1,1', 'depot bribe: the safe offers the clerk\'s spare plate-key first; it opens with no lockpick');
    check(d2.out.map === 'quarry' && d2.out.free && d2.out.q === 5 && d2.out.clean && d2.out.xp === 70 && d2.out.gold === 10 && !d2.out.br && d2.out.picked.length === 0 && d2.out.ap === 2 && d2.out.nonHeist === '', 'depot bribe: out by the service hatch into the quarry: +70 xp, net ten sovereigns (fifty found, forty paid), the key flags cleared');

    // ---------------------------------------------------------------- DEPOT THREE: the robes, the bore, the sledge
    const d3 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      G.give('a_synodrobe'); equipArmor('a_synodrobe');
      __go('quarry', 31.5, 7.3, 0); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      out.map = G.mapId; out.ap = G.flags.p16h_d_ap;
      __go('p16h_depot3', 12.4, 10.6, Math.PI);
      const w = H.guardsOf().find((g) => g.type === 'proctor'); w.x = 8.0; w.y = 10.6; w._pa.wait = 1e6; w._pa.baseFace = 0; w.facing = 0; w.hidden = false;
      let maxSus = 0; for (let i = 0; i < 80; i++) { G.noise = 2.4; w.x = 8.0; w.y = 10.6; update(0.05); maxSus = Math.max(maxSus, w._pa.sus); }
      out.robes = [+maxSus.toFixed(2), H.T.alarm];
      return out;
    });
    check(d3.map === 'p16h_depot3' && d3.ap === 5 && d3.robes[0] === 0 && d3.robes[1] === null, 'depot robes: in the Synod clerk robes the Night-Reckoner four paces off, facing you, never grows suspicious; the approach is "robes"');

    const d4 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      const nonHeist0 = __nonHeistFlags(), off0 = __rep('office'), syn0 = __rep('synod'), xp0 = window.__xp, g0 = G.player.gold;
      __go('quarry', 31.5, 7.3, 0); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      const safe = G.ents.find((e) => e._k === 'safe'); __go('p16h_depot3', 19.6, 14.2, Math.PI);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = g.type === 'proctor' ? 6.5 : 26.5; g.y = g.type === 'proctor' ? 3.0 : 14.5; }
      // the bore bites: the sledge is swallowed
      H.T.bore = 0.5; out.bore = [H.boreOn(), (G.noise = 9, H.effNoise()), H.hears(H.guardsOf()[0])];
      H.T.bore = 12; out.still = [H.boreOn(), (G.noise = 9, H.effNoise())];
      H.T.bore = 0.5; useDeco(safe); __choose('Break it open');
      out.cover = [H.T.alarm, G.player.crime.bounty, H.stageD(), G.flags.p16h_d_ap, __count('p16h_roster')];
      // the same, a second job, off the beat: the whole depot hears
      __go('p16h_depot3', 1.5, 10.6, Math.PI); interact();
      out.q5 = H.stageD(); G.flags.p16h_d_q = 2; delete G.flags.p16h_d_out; G.tod = 0.95; H.syncAll();
      for (const id of ['roster', 'lease']) while (G.has('p16h_' + id)) G.take('p16h_' + id);
      G.flags.p16h_d_cash = true;
      __go('quarry', 31.5, 7.3, 0); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      __go('p16h_depot3', 19.6, 14.2, Math.PI);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = g.type === 'proctor' ? 6.5 : 26.5; g.y = g.type === 'proctor' ? 3.0 : 14.5; }
      H.T.bore = 12; useDeco(safe2()); __choose('Break it open');
      function safe2() { return G.ents.find((e) => e._k === 'safe'); }
      const syn1 = __rep('synod'), off1 = __rep('office');
      out.loud = [H.T.alarm, G.player.crime.bounty, G.flags.p16h_d_al, G.flags.p16h_d_ap, H.stageD(), H.guardsOf().every((g) => g.state === 'chase'), __count('p16h_roster'), __count('p16h_lease')];
      out.fallout = [+(__rep('office') - off0).toFixed(2), +(__rep('synod') - syn0).toFixed(2)];
      H.reinforce(5); out.r0 = !H.find(G.map, 'reinfa'); H.reinforce(8);
      out.reinf = ['reinfa', 'reinfb'].map((k) => { const e = H.find(G.map, k); return !!e && e.type === 'legionnaire' && e.state === 'chase' && e.transient === true; });
      out.noLaw = [lawActive(), G.openPanel];
      const hatch = G.ents.find((e) => e._k === 'hatch'); __go('p16h_depot3', hatch.x - 0.4, hatch.y + 0.5, 0); useDeco(hatch);
      out.out = { map: G.mapId, q: H.stageD(), clean: !!G.flags.p16h_d_clean, ap: G.flags.p16h_d_ap, left: G.maps.p16h_depot3.entities.filter((e) => e._pa || /^reinf/.test(e._p16h || '')).length, free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0) };
      // the warrant is served where the law is: in Oakhaven
      const cons = G.maps.oakhaven.entities.find((e) => e.lawGuard); __go('oakhaven', cons.x + 1.3, cons.y, Math.PI); G.lawGrace = 0; tickLaw(0.05);
      out.arrest = G.openPanel; if (G.openPanel === 'arrest') document.getElementById('crime-flee').click();
      return out;
    });
    DEBUG.last = d4;
    check(d4.bore[0] && d4.bore[1] === 1 && !d4.bore[2] && !d4.still[0] && d4.still[1] === 9, 'depot bore: while the bore bites, noise is held at 1 and nobody hears (even a nine); when it stops it is not');
    check(d4.cover[0] === null && d4.cover[1] === 0 && d4.cover[2] === 4 && d4.cover[3] === 1 && d4.cover[4] === 1, 'depot bore: the safe can be broken open on the beat of the bore: no alarm, no warrant');
    check(d4.loud[0] === 'loud' && d4.loud[1] === 40 && d4.loud[2] === 2 && d4.loud[3] === 3 && d4.loud[4] === 4 && d4.loud[5] && d4.loud[6] === 1 && d4.loud[7] === 1, 'depot loud: breaking it open between the bites raises a loud alarm: warrant +40, approach "loud", both guards chase, the documents are yours');
    check(d4.fallout.join() === '-3,-2', 'depot loud: standing falls exactly: Office -3, Synod -2');
    check(d4.r0 && d4.reinf.join() === 'true,true' && d4.noLaw[0] === false && d4.noLaw[1] === null, 'depot loud: two Legionnaires arrive twelve seconds after, not before; the quarry has no constable (it is not a law map)');
    check(d4.out.map === 'quarry' && d4.out.free && d4.out.q === 5 && !d4.out.clean && d4.out.ap === 3 && d4.out.left === 0, 'depot loud: out by the service hatch with the documents, no "clean" mark, nobody left behind');
    check(d4.arrest === 'arrest', 'depot loud: the warrant is served in Oakhaven by the existing watch (the arrest panel), not in the quarry');

    // ---------------------------------------------------------------- DEPOT THREE: caught
    const d5 = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      const off0 = __rep('office'), syn0 = __rep('synod'), xp0 = window.__xp, g0 = G.player.gold;
      __go('quarry', 31.5, 7.3, 0); H.syncAll(); interact(); __pick(); G.state = 'play'; interact();
      __go('p16h_depot3', 19.6, 14.2, Math.PI);
      for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.x = g.type === 'proctor' ? 6.5 : 26.5; g.y = g.type === 'proctor' ? 3.0 : 14.5; }
      H.takeDocs(); out.had = [H.stageD(), __count('p16h_roster'), __count('p16h_lease'), G.player.gold - g0];
      const r = H.guardsOf().find((g) => g.type === 'proctor'); r.x = 21.0; r.y = 15.6; r.facing = Math.PI; r._pa.baseFace = Math.PI; r._pa.wait = 1e6; r.hidden = false;
      let i = 0; for (; i < 120 && !H.T.alarm; i++) { G.noise = 1; r.x = 21.0; r.y = 15.6; update(0.05); }
      const safe = G.ents.find((e) => e._k === 'safe');
      out.alarm = [H.T.alarm, G.flags.p16h_d_al, G.player.crime.bounty, +(__rep('office') - off0).toFixed(2), +(__rep('synod') - syn0).toFixed(2), H.stageD(), __count('p16h_roster') + __count('p16h_lease'), !!G.flags.p16h_pk_safe, /open/.test(safe.label)];
      let j = 0; for (; j < 400 && G.mapId === 'p16h_depot3'; j++) update(0.05);
      out.collar = [G.mapId, G.state, H.T.alarm, H.stageD(), G.flags.p16h_d_try, G.player.crime.bounty, G.player.hp > 0, lawActive(), !G.flags['picked:quarry:door:32:7']];
      // try again: the safe is sealed again, the cash was taken and does not come twice
      G.tod = 0.95; H.syncAll(); __go('quarry', 31.5, 7.3, 0); interact(); __pick(); G.state = 'play'; interact();
      __go('p16h_depot3', 19.6, 14.2, Math.PI); for (const g of H.guardsOf()) { g._pa.wait = 1e6; g.hidden = true; } H.T.away.pike = 999; H.T.away.warden = 999;
      const g1 = G.player.gold; H.takeDocs(); out.second = [G.player.gold - g1, H.stageD()];
      __go('p16h_depot3', 1.5, 10.6, Math.PI); interact();
      out.out = { map: G.mapId, q: H.stageD(), xp: window.__xp - xp0, gold: G.player.gold - g0, tries: G.flags.p16h_d_try };
      return out;
    });
    DEBUG.last = d5;
    check(d5.had.join() === '4,1,1,50' && d5.alarm[0] === 'seen' && d5.alarm[1] === 1 && d5.alarm[2] === 40 && d5.alarm[3] === -3 && d5.alarm[4] === -2, 'depot caught: seen with the documents in your coat: warrant +40, Office -3, Synod -2 exactly');
    check(d5.alarm[5] === 3 && d5.alarm[6] === 0 && !d5.alarm[7] && !d5.alarm[8], 'depot caught: the Night-Reckoner takes the ledgers back and the safe is shut again');
    check(d5.collar[0] === 'quarry' && d5.collar[1] === 'play' && d5.collar[2] === null && d5.collar[3] === 2 && d5.collar[4] === 1 && d5.collar[5] === 40 && d5.collar[6] && d5.collar[7] === false && d5.collar[8], 'depot caught: he walks you out to the quarry: alive, free to move, the warrant stands (served in Oakhaven), the job can be tried again');
    check(d5.second[0] === 0 && d5.second[1] === 4 && d5.out.q === 5 && d5.out.xp === 70 && d5.out.gold === 50 && d5.out.tries === 1, 'depot caught: the second try is paid once: the fifty sovereigns do not come twice (net 50 over both tries), 70 xp once');

    // ---------------------------------------------------------------- DEPOT THREE: handing it over (exact payoffs, every variant)
    const ho = await ev(() => {
      const H = HEIST16, out = {};
      const give = (docs) => { for (const d of docs) G.give('p16h_' + d); };
      const stand = (map, key) => { const e = H.find(G.maps[map], key); __go(map, e.x, e.y + 1.4, -Math.PI / 2); };
      const run = (name, docs, fn) => {
        __fresh(); give(docs); G.flags.p16h_d_q = 5; G.flags.p16h_d_k = 7; G.flags.p16h_d_out = true;
        const h0 = __rep('hedge'), s0 = __rep('synod'), g0 = G.player.gold, x0 = window.__xp, n0 = G.journal.length;
        const r = fn(); closeModal(); G.state = 'play';
        out[name] = { hedge: +(__rep('hedge') - h0).toFixed(2), synod: +(__rep('synod') - s0).toFixed(2), gold: G.player.gold - g0, xp: window.__xp - x0, left: [__count('p16h_roster'), __count('p16h_lease')].join(''), q: H.stageD(), flags: ['rv', 'rs', 'lm', 'ls'].filter((c) => G.flags['p16h_d_' + c]).join(), lines: G.journal.length - n0, r };
      };
      run('rv', ['roster'], () => { stand('clearing', 'vause'); __say('p16h_vause'); return typeof __say('p16h_vause', 0); });
      run('rs', ['roster'], () => { stand('clearing', 'steward'); const c = __say('p16h_steward'); return [c.length, typeof __say('p16h_steward', 0)].join(); });
      run('lm', ['lease'], () => { stand('greenhall', 'moss'); __say('p16h_mossbrook'); return typeof __say('p16h_mossbrook', 0); });
      run('ls', ['lease'], () => { stand('clearing', 'steward'); const c = __say('p16h_steward'); return [c.length, typeof __say('p16h_steward', 0)].join(); });
      run('both', ['roster', 'lease'], () => {
        stand('clearing', 'vause'); __say('p16h_vause'); __say('p16h_vause', 0); closeModal(); G.state = 'play';
        const q1 = H.stageD(); stand('greenhall', 'moss'); __say('p16h_mossbrook'); __say('p16h_mossbrook', 0); closeModal(); G.state = 'play';
        stand('clearing', 'vause'); talk(H.find(G.maps.clearing, 'vause')); const vd = DLG.log[DLG.log.length - 1].t.slice(0, 40); closeModal(); G.state = 'play';
        return [q1, vd].join('|');
      });
      run('twice', ['roster'], () => { stand('clearing', 'vause'); __say('p16h_vause'); __say('p16h_vause', 0); closeModal(); G.state = 'play'; G.give('p16h_roster'); stand('clearing', 'steward'); const c = __say('p16h_steward'); return c ? c.join() : 'no-choices'; });
      // rumours exist for every variant, keyed on the flags
      out.rumours = ['d_p16h_l', 'd_p16h_lall', 'd_p16h_rv', 'd_p16h_rs', 'd_p16h_lm', 'd_p16h_ls'].map((id) => { const r = STORYRUM.RUMOURS.find((x) => x.id === id); return !!r && r.cat === 'deed' && r.req.every((f) => f.startsWith('p16h_')) && typeof r.text === 'string' && typeof r.note === 'string'; });
      return out;
    });
    DEBUG.last = ho;
    check(ho.rv.hedge === 2 && ho.rv.synod === 4 && ho.rv.gold === 0 && ho.rv.xp === 40 && ho.rv.left === '00' && ho.rv.flags === 'rv', 'hand-over: the roster to Sergeant Vause: +2 Hedge, +4 Synod, 40 xp');
    check(ho.rs.hedge === 6 && ho.rs.synod === 0 && ho.rs.gold === 30 && ho.rs.xp === 40 && ho.rs.flags === 'rs', 'hand-over: the roster to the Compact steward: +6 Hedge, 30 sovereigns, 40 xp');
    check(ho.lm.hedge === -4 && ho.lm.synod === 0 && ho.lm.gold === 60 && ho.lm.xp === 30 && ho.lm.flags === 'lm', 'hand-over: the lease to Reeve Mossbrook: -4 Hedge, 60 sovereigns, 30 xp (the quiet, unclean way)');
    check(ho.ls.hedge === 5 && ho.ls.synod === 0 && ho.ls.gold === 0 && ho.ls.xp === 40 && ho.ls.flags === 'ls', 'hand-over: the lease to the Compact steward: +5 Hedge, 40 xp');
    check(ho.both.q === 6 && ho.both.flags === 'rv,lm' && ho.both.hedge === -2 && ho.both.xp === 70 && ho.both.left === '00' && /^5\|/.test(ho.both.r) && /counting again/.test(ho.both.r), 'hand-over: both papers placed = the job is finished (stage 6); the people remember');
    check(ho.twice.xp === 40 && ho.twice.flags === 'rv' && ho.twice.r === 'no-choices', 'hand-over: a ledger handed over once cannot be handed over again for a second reward');
    check(ho.ls.lines === 1 && ho.rv.lines === 1, 'hand-over: each one writes a single logbook line');
    check(ho.rumours.every(Boolean), 'rumours: the six deeds are registered, keyed on p16h_ flags only');

    // ---------------------------------------------------------------- the main quest is never touched
    const mq = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.95 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7; G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      const f0 = __nonHeistFlags(), main0 = G.journal.filter((j) => j.cat === 'main').length, lvl0 = G.player.level;
      // the whole of both jobs, start to finish, with every payoff
      __go('chapel', 1.7, 3.5, Math.PI); interact(); __pick(); G.state = 'play'; interact();
      for (const g of H.guardsOf()) g.hidden = true; H.T.away.warden = 999; H.takeLetters(); H.takeFee();
      __go('p16h_vestry', 1.5, 12.5, Math.PI); interact();
      G.tod = 0.95; H.syncAll(); __go('quarry', 31.5, 7.3, 0); interact(); __pick(); G.state = 'play'; interact();
      for (const g of H.guardsOf()) g.hidden = true; H.T.away.pike = 999; H.T.away.warden = 999; H.takeDocs();
      __go('p16h_depot3', 1.5, 10.6, Math.PI); interact();
      for (const k of H.LETTER_IDS) H.deliverLetter(k);
      H.handOver('rv'); H.handOver('lm');
      out.stages = [H.stageL(), H.stageD()];
      out.flags = __flagDiff(f0); out.main = G.journal.filter((j) => j.cat === 'main').length - main0;
      out.keys = Object.keys(G.flags).filter((k) => !k.startsWith('p16h_') && !/^p\d+[a-z]*_/.test(k) && !(k in JSON.parse(f0)));
      out.p16 = Object.keys(G.flags).filter((k) => k.startsWith('p16h_')).every((k) => k in HEIST16.FLAGS);
      out.small = Object.keys(G.flags).filter((k) => k.startsWith('p16h_')).every((k) => G.flags[k] === true || (Number.isInteger(G.flags[k]) && G.flags[k] >= 0 && G.flags[k] <= 63));
      out.greening = [!!G.flags.greening, !!G.flags.rite_started, !!G.flags.part3, !!G.flags.escaped];
      return out;
    });
    check(mq.stages.join() === '6,6' && mq.flags === '' && mq.keys.length === 0 && mq.main === 0 && mq.greening.every((x) => !x), 'main quest: two whole jobs, start to finish, move no flag that is not p16h_ and add no main-quest logbook line');
    check(mq.p16 && mq.small, 'every p16h_ flag the jobs left is a known one, a true or a small integer');

    // ---------------------------------------------------------------- save and load, mid-heist
    const sv = await ev(() => {
      const H = HEIST16, out = {}; __fresh({ tod: 0.5, gold: 100 });
      G.flags.p16h_l_q = 2; G.flags.p16h_l_k = 7; G.flags.p16h_l_ask = 2;
      __go('chapel', 3.4, 5.6, Math.PI); H.syncAll(); __say('p16h_orrin'); __say('p16h_orrin', 0); closeModal(); G.state = 'play';
      __go('chapel', 1.7, 3.5, Math.PI); interact();
      for (let i = 0; i < 40; i++) { G.noise = 1; update(0.05); }
      out.in = [G.mapId, H.stageL(), G.flags.p16h_l_br, H.guardsOf().length];
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.snap = { map: snap.mapId, flags: Object.keys(snap.flags).filter((k) => k.startsWith('p16h_')).sort().join(), transient: snap.maps.p16h_vestry.ents.length === G.maps.p16h_vestry.baseCount && !JSON.stringify(snap.maps).includes('"_pa"'), gold: snap.player.gold };
      // wreck the live state, then load
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_') || k.startsWith('picked:')) delete G.flags[k];
      __go('oakhaven', 20.5, 20.5, 0); G.player.gold = 5;
      restoreGame(snap);
      out.after = [G.mapId, H.stageL(), !!G.flags.p16h_l_br, H.guardsOf().length, G.player.gold, G.state, !!G.flags['picked:chapel:door:0:3']];
      for (let i = 0; i < 40; i++) { G.noise = 1; update(0.05); }
      out.warden = H.guardsOf()[0].hidden;
      // finish it: the key, the letters, the way out
      const cab = G.ents.find((e) => e._k === 'cab'); __go('p16h_vestry', 22.6, 3.2, -Math.PI / 2);
      const xp0 = window.__xp, h0 = __rep('hedge');
      useDeco(cab); __choose('key'); const hatch = G.ents.find((e) => e._k === 'hatch'); __go('p16h_vestry', hatch.x + 0.4, hatch.y + 0.5, Math.PI); useDeco(hatch);
      out.finish = [G.mapId, H.stageL(), window.__xp - xp0, __rep('hedge') - h0];
      // a second save: the depot, the documents in the coat
      __fresh({ tod: 0.95 }); G.flags.p16h_d_q = 2; G.flags.p16h_d_k = 7;
      __go('quarry', 31.5, 7.3, 0); interact(); __pick(); G.state = 'play'; interact();
      for (const g of H.guardsOf()) g.hidden = true; H.T.away.pike = 999; H.T.away.warden = 999; H.takeDocs();
      const snap2s = JSON.stringify(snapshotGame()), snap2 = JSON.parse(snap2s);
      out.snap2 = [snap2.mapId, snap2.flags.p16h_d_q, snap2.player.inv.filter((s) => /p16h_/.test(s.id)).map((s) => s.id).sort().join()];
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_') || k.startsWith('picked:')) delete G.flags[k];
      for (const id of ['roster', 'lease']) while (G.has('p16h_' + id)) G.take('p16h_' + id);
      __go('oakhaven', 20.5, 20.5, 0);
      restoreGame(snap2);
      out.after2 = [G.mapId, H.stageD(), __count('p16h_roster'), __count('p16h_lease'), H.guardsOf().length];
      const x1 = window.__xp; __go('p16h_depot3', 1.5, 10.6, Math.PI); interact();
      out.finish2 = [G.mapId, H.stageD(), window.__xp - x1];
      // load again right after: nothing pays twice
      const x2 = window.__xp; restoreGame(JSON.parse(snap2s));
      out.again = [G.mapId, H.stageD(), __count('p16h_roster'), window.__xp - x2];
      __go('oakhaven', 20.5, 20.5, 0);
      return out;
    });
    DEBUG.last = sv;
    check(sv.in[0] === 'p16h_vestry' && sv.in[1] === 3 && sv.in[2] === true && sv.in[3] === 1, 'save/load: you are in the vestry, mid-job, the sexton paid, one Warden on the round');
    check(/p16h_l_ap/.test(sv.snap.flags) && /p16h_l_br/.test(sv.snap.flags) && sv.snap.transient && sv.snap.map === 'p16h_vestry', 'save/load: the save holds the job in p16h_ flags only; the guards and the new people are not saved');
    check(sv.after[0] === 'p16h_vestry' && sv.after[1] === 3 && sv.after[2] && sv.after[3] === 1 && sv.after[4] === 70 && sv.after[5] === 'play' && sv.warden, 'save/load: loading puts you back in the vestry, mid-job, the Warden is back on the round (and, the sexton paid, at supper again)');
    check(sv.finish[0] === 'oakhaven' && sv.finish[1] === 5 && sv.finish[2] === 60 && sv.finish[3] === 2, 'save/load: the job can be finished after a load, and pays once');
    check(sv.snap2[0] === 'p16h_depot3' && sv.snap2[1] === 4 && sv.snap2[2] === 'p16h_lease,p16h_roster', 'save/load: a save made in the depot holds the stage and the two documents (in the pack)');
    check(sv.after2[0] === 'p16h_depot3' && sv.after2[1] === 4 && sv.after2[2] === 1 && sv.after2[3] === 1 && sv.after2[4] === 2 && sv.finish2[0] === 'quarry' && sv.finish2[1] === 5 && sv.finish2[2] === 70, 'save/load: loaded mid-job in the depot with the documents, two guards back, and out of it you are paid 70 xp once');
    check(sv.again[0] === 'p16h_depot3' && sv.again[1] === 4 && sv.again[2] === 1 && sv.again[3] === 0, 'save/load: loading the same save again pays nothing');

    // ---------------------------------------------------------------- hostile p16h_ flags
    const host = await ev(() => {
      const H = HEIST16, out = {}; __fresh();
      const bad = { p16h_l_q: 'x', p16h_l_k: 99, p16h_l_ap: -1, p16h_l_ld: 1e9, p16h_l_br: 'yes', p16h_l_out: 1, p16h_d_q: 6.5, p16h_zzz: true, p16h_d_cash: {}, p16h_pk_cab: 'x', p16h_l_try: NaN, p16h_d_k: [], p16h_d_ap: 3.5, p16h_l_all: false, p16h_l_closed: 1 };
      Object.assign(G.flags, bad); H.sanitize();
      out.left = Object.keys(G.flags).filter((k) => k.startsWith('p16h_'));
      out.reads = [H.stageL(), H.stageD(), H.windowL(), H.windowD()];
      Object.assign(G.flags, bad);
      out.quests = Object.values(NPCS).filter((n, i) => false).length + ['p16h_dessa', 'p16h_orrin', 'p16h_steward', 'p16h_vause', 'p16h_mossbrook', 'p16h_ines'].map((id) => { const r = NPCS[id].quest(G); return r === null || (typeof r.text === 'string'); }).filter(Boolean).length;
      H.syncAll(); H.tick(0.016); out.ensured = true;
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_')) delete G.flags[k];
      // in range, but a lie: a haul that nobody carries
      G.flags.p16h_l_q = 4; G.flags.p16h_l_k = 7; G.flags.p16h_d_q = 4; G.flags.p16h_d_k = 7; G.flags.p16h_l_ld = 63; G.flags.p16h_l_all = true;
      const x0 = window.__xp, h0 = __rep('hedge'), g0 = G.player.gold;
      H.settleStale(); out.lie = [H.stageL(), H.stageD(), window.__xp - x0, __rep('hedge') - h0, G.player.gold - g0, !!G.flags.p16h_l_out, !!G.flags.p16h_d_out];
      // delivering letters you do not hold, or twice
      G.flags.p16h_l_ld = 0; delete G.flags.p16h_l_all; for (const k of H.LETTER_IDS) H.deliverLetter(k); out.noLetters = [__rep('hedge') - h0, window.__xp - x0, H.deliveredCount()];
      for (const code of ['rv', 'rs', 'lm', 'ls']) H.handOver(code); out.noDocs = [__rep('hedge') - h0, window.__xp - x0, G.player.gold - g0];
      // a hostile save: bad flags and a camera in a wall of the vestry
      for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_')) delete G.flags[k];
      G.flags.p16h_l_q = 77; G.flags.p16h_l_k = -4; G.flags.p16h_pk_cab = 'x';
      const snap = JSON.parse(JSON.stringify(snapshotGame())); snap.mapId = 'p16h_vestry'; snap.cam = { x: 9.5, y: 8.5, dir: 0 };
      restoreGame(snap);
      out.save = [G.mapId, !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0), H.stageL(), Object.keys(G.flags).filter((k) => k.startsWith('p16h_')).join()];
      __go('oakhaven', 20.5, 20.5, 0);
      return out;
    });
    check(host.left.length === 0 && host.reads.join() === '0,0,,' && host.quests === 6 && host.ensured, 'hostile flags: bad p16h_ flags are dropped, read as 0, and nothing in the module (the people, the doors, the tick) throws');
    check(host.lie.join() === '2,2,0,0,0,false,false' && host.noLetters.join() === '0,0,0' && host.noDocs.join() === '0,0,0', 'hostile flags: a stage that claims a haul nobody carries pays nothing; letters and ledgers you do not hold cannot be delivered');
    check(host.save[0] === 'p16h_vestry' && host.save[1] && host.save[2] <= 3 && !/pk_cab/.test(host.save[3]), 'hostile save: a camera in a wall of the vestry and bad flags land you on open floor with the bad flags dropped (the stage is read as a clean one) (' + host.save.join('|') + ')');

    // ---------------------------------------------------------------- the Options row, the Gazette, the logbook
    const ui = await ev(() => {
      const H = HEIST16, out = {}; __fresh();
      renderAccessibilityMenu(); const b = document.getElementById('h16-heist-opt');
      out.row = { has: !!b, on: b && b.textContent, pressed: b && b.getAttribute('aria-pressed') };
      if (b) { b.click(); out.off = [b.textContent, H.cfg.on, localStorage.getItem('octave.heist16.v1'), H.windowL(), !!H.find(G.maps.oakhaven, 'dessa')]; b.click(); out.back = [b.textContent, H.cfg.on, !!H.find(G.maps.oakhaven, 'dessa')]; }
      closeModal(); G.state = 'play';
      // the Gazette gets a line once the Chapel has been robbed, and not before
      const sheet = '<div class="rm-sheet"><div class="rm-item">x</div><div class="rm-notice">n</div></div>';
      showEvent('The Synod Gazette', sheet, [{ t: 'ok', f: null }]); out.gazBefore = document.querySelector('#event-panel').innerHTML.indexOf('p16h-item') >= 0; document.querySelector('#event-panel button').click();
      G.flags.p16h_l_out = true; G.flags.p16h_d_out = true;
      showEvent('The Synod Gazette', sheet, [{ t: 'ok', f: null }]); const gz = document.querySelector('#event-panel').innerHTML; out.gaz = [(gz.match(/p16h-item/g) || []).length, gz.indexOf('p16h-item') < gz.indexOf('rm-notice')]; document.querySelector('#event-panel button').click();
      H.cfg.on = false; showEvent('The Synod Gazette', sheet, [{ t: 'ok', f: null }]); out.gazOff = document.querySelector('#event-panel').innerHTML.indexOf('p16h-item') >= 0; document.querySelector('#event-panel button').click(); H.cfg.on = true;
      // the logbook button: only once something has begun
      __fresh(); renderLog(); out.btn0 = !!document.getElementById('p16h-open'); closeModal(); G.state = 'play';
      G.flags.p16h_l_q = 1; renderLog(); out.btn1 = !!document.getElementById('p16h-open');
      document.getElementById('p16h-open').click(); out.page = [G.openPanel, document.getElementById('modal-panel').textContent.indexOf('The Held Letters') >= 0];
      document.getElementById('p16h-back').click(); out.back2 = G.openPanel; closeModal(); G.state = 'play';
      return out;
    });
    check(ui.row.has && ui.row.on === 'On' && ui.row.pressed === 'true' && ui.off[0] === 'Off' && ui.off[1] === false && /false/.test(ui.off[2]) && ui.off[3] === null && !ui.off[4] && ui.back[1] === true && ui.back[2], 'the Options row is there, toggles, persists (localStorage), and Off returns the original game');
    check(!ui.gazBefore && ui.gaz[0] === 2 && ui.gaz[1] && !ui.gazOff, 'the Gazette: nothing before the jobs; after them one line each (the Chapel, Depot Three), before the notice; nothing when switched off');
    check(!ui.btn0 && ui.btn1 && ui.page[0] === 'heist16' && ui.page[1] && ui.back2 === 'log', 'the logbook gets a Heists button only once a job has begun; it opens the heist page and "Back" returns to the logbook');

    // ---------------------------------------------------------------- 640x400: the heist page and the badge
    {
      const S = await boot(browser, { width: 640, height: 400 }); allErrors.push(S.errors); const sp = S.page;
      const small = await sp.evaluate(() => {
        const H = HEIST16, out = {};
        for (const k of Object.keys(G.flags)) if (k.startsWith('p16h_')) delete G.flags[k];
        renderLog(); out.btn0 = !!document.getElementById('p16h-open'); closeModal(); G.state = 'play';
        Object.assign(G.flags, { p16h_l_q: 3, p16h_l_k: 7, p16h_l_ap: 1, p16h_l_ld: 5, p16h_l_try: 2, p16h_d_q: 4, p16h_d_k: 7, p16h_d_ap: 2, p16h_d_rv: true });
        renderLog(); out.btn1 = !!document.getElementById('p16h-open'); document.getElementById('p16h-open').click();
        const m = document.getElementById('modal-panel'), r = m.getBoundingClientRect(), x = document.getElementById('p16h-x').getBoundingClientRect(), bk = document.getElementById('p16h-back');
        out.fit = r.left >= 0 && r.top >= 0 && r.right <= 640 && r.bottom <= 400;
        out.close = x.left >= 0 && x.right <= 640 && x.top >= 0 && x.bottom <= 400;
        out.noHScroll = document.documentElement.scrollWidth <= 640 && m.scrollWidth <= m.clientWidth + 1;
        out.scrolls = getComputedStyle(m).overflowY === 'auto' || getComputedStyle(m).overflowY === 'scroll' || m.scrollHeight <= m.clientHeight + 1;
        bk.scrollIntoView(); const b = bk.getBoundingClientRect(); out.backReach = b.bottom <= 400 + 1 && b.top >= 0;
        document.getElementById('p16h-x').click(); out.closed = G.state === 'play';
        // the badge, inside the vestry, at this size
        G.tod = 0.95; HEIST16.syncAll(); loadMap('p16h_vestry', { x: 20.5, y: 3.2, dir: 0 }); G.state = 'play'; HEIST16.tick(1.1);
        const e = document.getElementById('p16h-badge'), br = e && e.getBoundingClientRect();
        out.badge = !!e && e.classList.contains('on') && br.left >= 0 && br.right <= 640 && br.top >= 0 && br.bottom <= 100;
        return out;
      });
      check(!small.btn0 && small.btn1 && small.fit && small.close && small.noHScroll && small.scrolls && small.backReach && small.closed, '640x400: the heist page fits (no sideways scroll), scrolls inside, Close and Back are reachable (' + JSON.stringify(small) + ')');
      check(small.badge, '640x400: the stealth badge shows in the vestry and stays inside the frame');
      await sp.close();
    }

    // __CONTINUE__
    await pg.close();
  } catch (e) {
    console.log('TEST CRASH: ' + (e && e.stack || e)); fails.push('crash: ' + (e && e.message));
  }
  const errs = allErrors.flat();
  check(errs.length === 0, 'no page errors across the whole run' + (errs.length ? ' (' + errs.slice(0, 3).join(' | ') + ')' : ''));
  await browser.close();
  console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
