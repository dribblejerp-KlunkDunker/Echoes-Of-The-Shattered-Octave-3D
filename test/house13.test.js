// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/house13.test.js
// Phase 13 HOUSE: the Tarrows' house, a haunted-house side quest in Oakhaven. Uses the served preview; never starts a server.
// SHOTS=<dir> writes screenshots there.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs'), path = require('path');

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('House Tester');
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
  if (opts.blockModule) await page.route('**/js/house13.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 13013; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  await page.evaluate(() => { window.__go = (map, x, y, dir) => { loadMap(map, { x, y, dir }); G.state = 'play'; G.keys = {}; }; });
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
      has: typeof HOUSE13, on: HOUSE13.cfg.on, n: HOUSE13.TEXTS.length, map: !!G.maps.p13h_tarrow, item: !!ITEMS.p13h_beads, npc: !!NPCS.p13h_wenna,
      flags: Object.keys(G.flags).filter((k) => k.startsWith('p13h_')),
      noEmoji: HOUSE13.TEXTS.every((t) => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
      noNumeralDate: HOUSE13.TEXTS.every((t) => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)),
      noScream: HOUSE13.TEXTS.filter((t) => /\b(scream|screams|screamed|shriek)/i.test(t)).length,
      hush: HOUSE13.TEXTS.filter((t) => /\bthe Hush (is|looks|has a|screams|roars)/i.test(t)).length,
    }));
    check(base.has === 'object' && base.on === true && base.map && base.item && base.npc, 'HOUSE13 exists, the switch is on by default, the map, item and person are registered');
    check(base.n > 60 && base.noEmoji && base.noNumeralDate && base.noScream === 0 && base.hush === 0, 'all registered text is non-empty, emoji-free, no numeral dates, nobody screams, the Hush is not described (' + base.n + ' strings)');
    check(base.flags.length === 0, 'a fresh game has no p13h_ flags');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p13-house.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await ev(() => HOUSE13.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair (' + noFr.length + ' missing)');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow)\b/.test(r[1])), 'the French follows the glossary terms');

    // ---------------------------------------------------------------- the map: six rooms, no dead end, a way out
    const mp = await ev(() => {
      const m = G.maps.p13h_tarrow, H = HOUSE13, out = { w: m.w, h: m.h, rooms: H.ROOMS.length };
      const passable = (x, y) => { const c = m.get(x, y); return !c || !!c.door; };            // doors count as passable: they all open
      const start = [3, 11], seen = new Set([start.join()]), q = [start];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(nx + ',' + ny)) continue; if (!passable(nx, ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny]); } }
      out.reach = H.ROOMS.map((r) => seen.has(Math.floor((r.x0 + r.x1) / 2) + ',' + Math.floor((r.y0 + r.y1) / 2)));
      out.doorsLocked = H.INNER_DOORS.filter(([x, y]) => { const c = m.get(x, y); return !c || !c.door || c.locked; }).length;
      const ex = m.get(H.EXIT[0], H.EXIT[1]); out.exit = { door: !!ex.door, locked: !!ex.locked, portal: ex.portal && ex.portal.map };
      const back = ex.portal, oh = G.maps.oakhaven; out.land = !oh.isBlocked(back.x | 0, back.y | 0);
      const sp = m.spawn; out.spawnFree = !m.isBlocked(sp.x | 0, sp.y | 0) && H.roomOf(sp.x, sp.y) === 0;
      // every room has at least two ways in and out
      out.exits = H.ROOMS.map((r, i) => H.INNER_DOORS.filter(([x, y]) => x >= r.x0 - 1 && x <= r.x1 && y >= r.y0 - 1 && y <= r.y1).length + (i === 0 ? 1 : 0));
      out.base = m.baseCount === m.entities.length;
      return out;
    });
    check(mp.w === 20 && mp.h === 14 && mp.rooms === 6 && mp.reach.every(Boolean), 'the house is 20x14 with six rooms, all reachable from the front door (' + JSON.stringify(mp.reach) + ')');
    check(mp.doorsLocked === 0 && mp.exit.door && !mp.exit.locked && mp.exit.portal === 'oakhaven' && mp.land && mp.spawnFree && mp.base, 'no inner door is locked; the street door is never locked and lands in free ground; static entities are the baseCount');
    check(mp.exits.every((n) => n >= 2), 'every room has two ways out (' + mp.exits.join() + ')');

    // ---------------------------------------------------------------- Bethan and the door: before the quest
    const pre = await ev(() => {
      __go('oakhaven', 7.7, 11.2, -Math.PI / 2);
      const out = {}; const oh = G.maps.oakhaven, c = oh.get(6, 7);
      out.wenna = !!oh.entities.find((e) => e._p13h === 'wenna'); out.lintel = oh.entities.find((e) => e._p13h === 'lintel');
      out.door = { locked: c.locked, msg: c.lockMsg, label: c.label, portal: c.portal && c.portal.map };
      out.keyOpen = !!G.flags[c.locked];
      out.lintelLabel = out.lintel && out.lintel.label; out.lintelSprite = out.lintel && out.lintel.sprite; out.lintel = !!out.lintel;
      out.sprites = ['p13h_lintel3', 'p13h_lintel4', 'p13h_kettle', 'p13h_toy', 'p13h_bundle', 'p13h_board'].every((n) => !!Engine.sprites[n]);
      out.givers = LOGMAP.QUEST_GIVERS.includes('p13h_wenna');
      return out;
    });
    check(pre.wenna && pre.lintel && pre.sprites && pre.givers, 'Bethan and the door-reeds stand in the lane; her sprites are painted; the map marks her as a giver');
    check(pre.door.locked === 'p13h_open' && !pre.keyOpen && /shut, not barred/.test(pre.door.msg) && /three First Reeds|Three First Reeds/.test(pre.lintelLabel) && pre.lintelSprite === 'p13h_lintel3', 'before the key: the door is shut with its own line, three reeds and a bare nail');

    // pressing E at the shut door does not open it
    const shut = await ev(async () => { __go('oakhaven', 6.5, 9.3, -Math.PI / 2); for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r)); interact(); return { map: G.mapId, text: document.querySelector('#msgs').textContent }; });
    check(shut.map === 'oakhaven' && /neighbour has the key/.test(shut.text), 'E at the shut door says the neighbour has the key and does not open it');

    // decline: nothing but the ask flag
    const dec = await ev(() => {
      __go('oakhaven', 7.7, 11.0, -Math.PI / 2);
      const e = G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna'); talk(e);
      const out = { state: G.state, log: DLG.log.map((l) => l.t), choices: DLG.choices.map((c) => c.t) };
      const reply = DLG.choices[1].f(G); out.reply = reply; out.flags = Object.keys(G.flags).filter((k) => k.startsWith('p13h_')).sort(); out.q = HOUSE13.stage();
      closeModal(); G.state = 'play';
      talk(e); out.again = DLG.log[0].t; out.againChoices = DLG.choices.length; closeModal(); G.state = 'play';
      return out;
    });
    check(dec.state === 'dialogue' && /three reeds and a bare nail/.test(dec.log[0]) && dec.choices.length === 2, 'talking to Bethan opens the dialogue with the offer and two choices');
    check(dec.q === 0 && dec.flags.join() === 'p13h_ask' && /No\. No, I would not either/.test(dec.reply) && /You again/.test(dec.again) && dec.againChoices === 2, 'declining is clean: only p13h_ask is written; she asks again, differently');
    // topics
    const top = await ev(() => { const n = NPCS.p13h_wenna; return Object.keys(n.topics).map((k) => [k, n.topics[k].length > 30]); });
    check(top.length === 4 && top.every((t) => t[1]), 'Bethan has four topics (the Tarrows, the First Reed, the Hedge, the Last Note)');

    // accept
    const acc = await ev(() => {
      const e = G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna'); talk(e);
      const j0 = G.journal.length; const reply = DLG.choices[0].f(G); closeModal(); G.state = 'play';
      const c = G.maps.oakhaven.get(6, 7);
      return { reply, q: HOUSE13.stage(), open: G.flags.p13h_open, key: !!G.flags[c.locked], j: G.journal.length - j0, jt: G.journal[0].text, fork: /fork on his bench/.test(reply), workFork: !!G.maps.p13h_tarrow.entities.find((x) => x._p13h === 'fork') };
    });
    check(acc.q === 1 && acc.open === true && acc.key && acc.j === 1 && /Something is being kept/.test(acc.jt) && acc.fork && acc.workFork, 'accepting: stage 1, the door is open to the key, one journal line, and Gil\'s spare fork is on the bench for someone with none');
    // open the door with E and walk in
    const walk = await ev(async () => { __go('oakhaven', 6.5, 9.3, -Math.PI / 2); for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r)); interact(); return { map: G.mapId, room: HOUSE13.T.room, visits: G.flags.p13h_visits }; });
    check(walk.map === 'p13h_tarrow' && walk.room === 0 && walk.visits === 1, 'E at the door goes in: front room, first visit');
    await pg.waitForTimeout(250); await shot(pg, 'h_front');

    // the player cannot be trapped: leave by the door at any time
    const out1 = await ev(async () => { __go('p13h_tarrow', 3.5, 12.3, Math.PI / 2); for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r)); interact(); return G.mapId; });
    check(out1 === 'oakhaven', 'facing the street door from inside and pressing E leaves');

    // ---------------------------------------------------------------- sound: missing, late, kept
    const snd = await ev(async () => {
      const out = {}; const H = HOUSE13;
      let calls = 0; const spy = () => { calls++; }; Audio_.sfx.step._orig = spy; Audio_.sfx.step._test = true;
      __go('p13h_tarrow', 3.5, 11.3, -Math.PI / 2);
      Audio_.sfx.step(); out.front = calls; calls = 0;
      __go('p13h_tarrow', 16.5, 11.5, 0); H.T.room = H.roomOf(16.5, 11.5); H.T.clock += 1;
      Audio_.sfx.step(); out.parlourNow = calls; await new Promise((r) => setTimeout(r, 700)); out.parlourLate = calls; calls = 0;
      __go('p13h_tarrow', 3.5, 5.0, 0); H.T.room = H.roomOf(3.5, 5.0);
      for (let i = 0; i < 5; i++) { G.state = 'play'; await new Promise((r) => requestAnimationFrame(r)); }
      Audio_.sfx.step(); Audio_.sfx.step(); out.mute = calls; out.muffled = Audio_.muffled; out.floor = H.T.floor; out.muteNow = H.muteNow(); calls = 0;
      // walk out of the back room into the front room: audio comes back
      __go('p13h_tarrow', 3.5, 9.5, 0); H.T.room = H.roomOf(3.5, 9.5);
      for (let i = 0; i < 5; i++) await new Promise((r) => requestAnimationFrame(r));
      Audio_.sfx.step(); out.frontAgain = calls; out.muffledFront = Audio_.muffled; out.floorFront = H.T.floor; calls = 0;
      // back in, then leave the house altogether: the floor and the muffle go with it
      __go('p13h_tarrow', 3.5, 5.0, 0); H.T.room = H.roomOf(3.5, 5.0);
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r));
      out.mutedAgain = H.muteNow(); out.floorIn = H.T.floor;
      __go('oakhaven', 7.5, 11.0, 0);
      for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r));
      Audio_.sfx.step(); out.street = calls; out.muffledOut = Audio_.muffled; out.floorOut = H.T.floor; out.muteOut = H.muteNow();
      Audio_.sfx.step._orig = null; return out;
    });
    check(snd.front === 1, 'in the front room a footstep passes straight through (1 call)');
    check(snd.parlourNow === 1 && snd.parlourLate === 2, 'in the parlour a footstep is repeated once, a beat late (' + snd.parlourNow + ' then ' + snd.parlourLate + ')');
    check(snd.mute === 0 && snd.muteNow === true && snd.floor >= 0.35 && snd.muffled >= 0.34, 'in the back room footsteps are swallowed and the air is dulled (calls ' + snd.mute + ', muffle ' + snd.muffled.toFixed(2) + ')');
    check(snd.frontAgain === 1 && snd.muffledFront < 0.02 && snd.floorFront === 0, 'walking out of the back room restores footsteps and the muffle');
    check(snd.mutedAgain && snd.floorIn >= 0.35 && snd.street === 1 && snd.muffledOut < 0.02 && snd.floorOut === 0 && snd.muteOut === false, 'leaving the house altogether restores audio (muffle ' + snd.muffledOut.toFixed(2) + ')');
    // restore the real step for the later tests
    await ev(() => { Audio_.sfx.step._test = false; });

    // ---------------------------------------------------------------- the counting, the kettle: deterministic, no damage
    const cnt = await ev(() => {
      const H = HOUSE13, out = {}; const hp0 = G.player.hp;
      __go('p13h_tarrow', 10.5, 4.0, 0); H.T.room = 4; H.T.lastCount = -1e9; H.T.clock = 100; H.T.count = null;
      H.tick(0.05); out.started = !!H.T.count; out.msg = document.querySelector('#msgs').textContent.includes('One. Two. Three. Four. Five. Six. Seven.');
      for (let i = 0; i < 120; i++) H.tick(0.1);
      out.ended = H.T.count === null; out.endMsg = document.querySelector('#msgs').textContent.includes('It stops there');
      out.nextAt = H.T.clock - H.T.lastCount;
      out.full = !!G.flags.p13h_full; out.hush = H.T.hushT;
      out.hp = G.player.hp === hp0;
      H.T.lastCount = H.T.clock; H.tick(0.1); out.cool = H.T.count === null;
      return out;
    });
    check(cnt.started && cnt.msg && cnt.ended && cnt.endMsg && cnt.cool && cnt.hp, 'the nursery counts to seven and stops, no more often than its cooldown, and nothing is hurt');
    check(cnt.full === false && cnt.hush === 0, 'by default (gentle) the stronger moment does not happen');
    const full = await ev(() => {
      const H = HOUSE13, out = {};
      window.NERVES13 = { scaresAllowed: () => 'full' };
      H.T.count = { t: 7 * H.B.COUNT_BEAT + 1, n: 7 }; H.tick(0.1);
      out.full = !!G.flags.p13h_full; out.hush = H.T.hushT; out.floor = H.T.floor; out.muffled = Audio_.muffled;
      for (let i = 0; i < 30; i++) H.tick(0.1);
      out.after = { hush: H.T.hushT, floor: H.T.floor };
      // once only
      H.T.count = { t: 7 * H.B.COUNT_BEAT + 1, n: 7 }; H.tick(0.1); out.again = H.T.hushT;
      window.NERVES13 = { scaresAllowed: () => 'gentle' }; out.gentle = H.scares();
      window.NERVES13 = { scaresAllowed: () => { throw new Error('x'); } }; out.broken = H.scares();
      delete window.NERVES13; out.none = H.scares();
      return out;
    });
    check(full.full && full.hush > 1 && full.floor === 0.9 && full.muffled >= 0.89, 'on Full scares, once, the sound drops away (muffle ' + full.muffled.toFixed(2) + ')');
    check(full.after.hush === 0 && full.after.floor <= 0.35 && full.again === 0, 'it ends by itself and does not repeat');
    check(full.gentle === 'gentle' && full.broken === 'gentle' && full.none === 'gentle', 'gentle, a failing NERVES13 and no NERVES13 all read as gentle');

    // ---------------------------------------------------------------- props that move only out of sight
    const unit = await ev(() => {
      const H = HOUSE13, out = {};
      __go('p13h_tarrow', 9.0, 11.5, -Math.PI / 2 + 0.0);     // in the kitchen, looking north
      H.T.room = 1; out.sameRoom = H.movable(0);
      H.T.room = 0; Engine.cam.x = 3.5; Engine.cam.y = 11.3; Engine.cam.dir = -Math.PI / 2;   // front room looking north: the kitchen is off to the side
      out.sideOk = H.movable(0);
      Engine.cam.dir = 0.0;                                      // looking east at the kitchen: the kettle is in the cone
      out.cone = H.movable(0);
      Engine.cam.x = 9.8; Engine.cam.y = 11.0; H.T.room = 0; Engine.cam.dir = Math.PI;  // 1.4 cells or nearer: always watched
      out.near = H.watched(10.0, 12.25);
      return out;
    });
    check(unit.sameRoom === false && unit.sideOk === true && unit.cone === false && unit.near === true, 'a prop never moves in the player\'s room, nor in the view cone, nor within 1.4 cells (' + JSON.stringify(unit) + ')');

    const unobs = await ev(async () => {
      const H = HOUSE13, out = { frames: 0, violations: [], moves: 0, onscreenMoves: 0 };
      G.flags.p13h_q = 1; G.flags.p13h_open = true; delete G.flags.p13h_done; HOUSE13.syncAll(); G.flags.p13h_pos = 0;
      H.B.MOVE_GAP = 0.1; H.T.lastMove = -1e9; H.T.moved = [];
      __go('p13h_tarrow', 3.5, 11.3, -Math.PI / 2);
      const m = G.map; const props = m.entities.filter((e) => ['kettle', 'chair', 'toy'].includes(e._p13h));
      let prev = null; const cams = []; let lastCam = null;
      const _r = Engine.render;
      Engine.render = function () {
        const r = _r.apply(this, arguments);
        try {
          if (G.mapId === 'p13h_tarrow') {
            const c = Engine.cam, cur = props.map((e) => ({ id: e._p13h, x: e.x, y: e.y, on: !!e._screen }));
            const cont = lastCam && Math.hypot(c.x - lastCam.x, c.y - lastCam.y) < 0.6 && Math.abs(Math.atan2(Math.sin(c.dir - lastCam.dir), Math.cos(c.dir - lastCam.dir))) < 0.5;
            if (prev) cur.forEach((p, i) => {
              if (p.x !== prev[i].x || p.y !== prev[i].y) { out.moves++; if (p.on || (prev[i].on && cont)) { out.violations.push({ id: p.id, now: p.on, before: prev[i].on, cont: !!cont }); out.onscreenMoves++; } }
            });
            prev = cur; lastCam = { x: c.x, y: c.y, dir: c.dir }; out.frames++;
          } else { prev = null; lastCam = null; }
        } catch (e) { out.err = String(e); }
        return r;
      };
      let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      // room centres, then a continuous walk too
      for (let i = 0; i < 90; i++) {
        const r = H.ROOMS[(i * 5 + (i >> 2)) % 6];
        const x = r.x0 + 1 + rnd() * (r.x1 - r.x0 - 2.2), y = r.y0 + 1 + rnd() * (r.y1 - r.y0 - 2.2), d = rnd() * Math.PI * 2 - Math.PI;
        G.state = 'play'; Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = d;
        await new Promise((res) => setTimeout(res, 70));
        // a short smooth turn, as a player would look about
        for (let k = 0; k < 4; k++) { Engine.cam.dir += 0.12; await new Promise((res) => requestAnimationFrame(res)); }
      }
      Engine.render = _r; out.pos = G.flags.p13h_pos; out.moved = H.T.moved.filter((t) => t != null).length;
      return out;
    });
    check(unobs.frames > 150 && !unobs.err, 'the unobserved-movement watcher saw a lot of rendered frames (' + unobs.frames + ')');
    check(unobs.moves >= 3 && unobs.moved >= 2, 'props did move while nobody watched (' + unobs.moves + ' moves, ' + unobs.moved + ' different props)');
    check(unobs.violations.length === 0, 'no prop ever changed place while on screen: ' + JSON.stringify(unobs.violations.slice(0, 3)));
    // entering the house moves things between visits, and that is done before the first frame
    const between = await ev(() => {
      const H = HOUSE13; H.B.MOVE_GAP = 18; G.flags.p13h_pos = 0; H.T.lastMove = -1e9; H.T.moved = [];
      __go('oakhaven', 6.5, 9.3, -Math.PI / 2); const p0 = G.flags.p13h_pos;
      __go('p13h_tarrow', 3.5, 11.3, -Math.PI / 2); const p1 = G.flags.p13h_pos;
      const out = { p0, p1, moved: [] };
      H.PROPS.forEach((p, i) => { if ((p1 >> i) & 1) { const e = G.map.entities.find((x) => x._p13h === p.id); out.moved.push({ id: p.id, nowWatched: H.watched(e.x, e.y), wasWatched: H.watched(p.at[0][0], p.at[0][1]) }); } });
      return out;
    });
    check(between.p0 === 0 && between.p1 !== 0 && between.moved.length === 1 && !between.moved[0].nowWatched && !between.moved[0].wasWatched, 'on entering the house one prop has changed since last time, and neither its old nor its new place is in view (' + JSON.stringify(between.moved) + ')');
    // the kettle changes its place, and the entity follows the flag
    const placed = await ev(() => { const H = HOUSE13; const out = []; for (const bits of [0, 1, 2, 4, 7]) { G.flags.p13h_pos = bits; H.applyPositions(false); out.push(H.PROPS.map((p) => { const e = G.map.entities.find((x) => x._p13h === p.id); return e.x === p.at[(bits >> H.PROPS.indexOf(p)) & 1][0] && e.y === p.at[(bits >> H.PROPS.indexOf(p)) & 1][1]; }).every(Boolean)); } G.flags.p13h_pos = 0; H.applyPositions(false); return out; });
    check(placed.every(Boolean), 'each prop stands at the resting place its bit says');

    // ---------------------------------------------------------------- the fork finds what is kept
    const fork = await ev(async () => {
      const out = {}; const H = HOUSE13;
      G.flags.p13h_q = 1; delete G.flags.p13h_done; HOUSE13.syncAll();
      out.mark = !!G.maps.p13h_tarrow.entities.find((e) => e._p13h === 'mark' && e.glassGrowth === true && !e.sprite);
      G.give('p12_fork'); SONGCRAFT.setTool(1); out.tool = SONGCRAFT.toolId();
      delete G.flags.p12s_fseen;
      __go('p13h_tarrow', 3.5, 5.0, 0); H.T.room = 3;
      SONGCRAFT.fk.tt = 1; SONGCRAFT.tick(0.2); out.nearLevel = SONGCRAFT.fk.level; out.kind = SONGCRAFT.fk.kind;
      __go('p13h_tarrow', 16.5, 5.0, 0); SONGCRAFT.fk.tt = 1; SONGCRAFT.tick(0.2); out.farLevel = SONGCRAFT.fk.level;
      delete G.flags.p12s_fseen; __go('p13h_tarrow', 5.0, 5.3, 0); H.T.room = 3; document.querySelector('#msgs').innerHTML = '';
      for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 80));
      out.msg = document.querySelector('#msgs').textContent; out.bit = (G.flags.p12s_fseen | 0) & 4; out.txBack = SONGCRAFT.TX.forkSeen.glass;
      SONGCRAFT.setTool(0);
      return out;
    });
    check(fork.mark && fork.tool === 1 && fork.nearLevel > 0.3 && fork.kind === 'glass' && fork.farLevel === 0, 'the held fork hums toward the kept reed and not in the workroom (' + (fork.nearLevel || 0).toFixed(2) + ')');
    check(/Something in here is being kept/.test(fork.msg) && fork.bit === 0 && /Light-glass/.test(fork.txBack), 'the first hum says the house\'s own line, gives the "Light-glass" first-find back and restores songcraft\'s text');
    // no fork, no problem: Gil's bench has one; taking it is remembered; with a fork in the pack nothing spawns
    const spare = await ev(() => {
      const H = HOUSE13, out = {}; G.flags.p13h_q = 1; delete G.flags.p13h_fork;
      for (const s of [...G.player.inv]) if (s.id === 'p12_fork' || s.id === 'v_fork') G.take(s.id);
      H.syncAll(); const m = G.maps.p13h_tarrow;
      out.spawned = !!H.find(m, 'fork');
      G.give('p12_fork'); H.syncAll(); out.withFork = !!H.find(m, 'fork'); G.take('p12_fork'); H.syncAll();
      const f = H.find(m, 'fork'); __go('p13h_tarrow', 15.0, 3.4, 0); pickUp(f); out.took = G.has('p12_fork'); out.flag = G.flags.p13h_fork === true;
      H.syncAll(); out.respawn = !!H.find(m, 'fork'); G.take('p12_fork');
      return out;
    });
    check(spare.spawned && !spare.withFork && spare.took && spare.flag && !spare.respawn, 'Gil\'s spare fork is on the bench only for someone with none, and is not given twice');

    // ---------------------------------------------------------------- reading the name, holding the note, the eighth count
    const q = await ev(async () => {
      const H = HOUSE13, out = {};
      // reset to stage 1, in the back room
      delete G.flags.p13h_done; G.flags.p13h_q = 1; HOUSE13.syncAll();
      __go('p13h_tarrow', 4.5, 5.0, 0);
      const b = H.find(G.map, 'bundle'); out.bundleLabel = b.label;
      const cot0 = (() => { useDeco(H.find(G.map, 'bundle') || b); return null; })();
      out.q2 = H.stage(); out.eventTitle = document.querySelector('#event h2') && document.querySelector('#event h2').textContent;
      out.eventText = document.querySelector('#event p').textContent; out.btns = [...document.querySelectorAll('#event button')].map((x) => x.textContent);
      out.journalFound = G.journal[0].text.startsWith('In the back room');
      out.markGone = !H.find(G.map, 'mark');
      // leave it for now
      document.querySelector('#event button[data-i="1"]').click(); out.state1 = G.state;
      // the cot too early
      __go('p13h_tarrow', 11.0, 3.5, 0); useDeco(G.map.entities.find((e) => e._k === 'cot')); out.early = document.querySelector('#msgs').textContent.includes('not time yet'); out.qEarly = H.stage();
      return out;
    });
    check(q.q2 === 2 && q.eventTitle === 'A shawl, folded' && /NAN TARROW/.test(q.eventText) && q.btns.length === 2 && q.journalFound && q.markGone && q.state1 === 'play', 'the shawl: the name is read (stage 2), one journal line, the fork marker goes, "leave it" leaves');
    check(q.early && q.qEarly === 2, 'the cot says it is not time yet and gives nothing until the note is held');

    // hold the pitch: slip, abort, then success, with the real minigame
    const hold1 = await ev(async () => {
      REEDS.forceManual = true; REEDS.set.on = true;
      const H = HOUSE13, out = {};
      __go('p13h_tarrow', 4.5, 5.0, 0);
      const run = async (mode) => {
        const p = H.holdNote(); await new Promise((r) => setTimeout(r, 60));
        const s = REEDS.session; if (!s) return 'nosession';
        out.title = document.querySelector('#rhp-title') && document.querySelector('#rhp-title').textContent;
        if (mode === 'abort') { s.finish(true); await p; return 'aborted'; }
        for (let i = 0; i < 1200 && !s.done; i++) { s.pitch = mode === 'bad' ? s.centsAt(Math.max(0, s.t)) + 900 : s.centsAt(Math.max(0, s.t)); s.step(1 / 60); }
        await p; await new Promise((r) => setTimeout(r, 50));
        return mode;
      };
      out.bad = await run('bad'); out.qBad = H.stage(); out.msgBad = document.querySelector('#msgs').textContent.includes('slips from you');
      out.abort = await run('abort'); out.qAbort = H.stage();
      out.state = G.state; out.panel = G.openPanel;
      out.good = await run('good'); out.qGood = H.stage();
      out.event = document.querySelector('#event h2') && document.querySelector('#event h2').textContent; out.stateEv = G.state;
      out.journal = G.journal[0].text.startsWith('I held Nan Tarrow');
      document.querySelector('#event button').click();
      REEDS.forceManual = false;
      return out;
    });
    check(hold1.title === 'Hold Nan Tarrow\'s note', 'the minigame is the real Hold the Pitch, titled for Nan (' + hold1.title + ')');
    check(hold1.qBad === 2 && hold1.msgBad && hold1.qAbort === 2 && hold1.state === 'play' && !hold1.panel, 'a bad hold slips, putting the reed down stops: stage stays 2, no penalty, no stuck panel');
    check(hold1.qGood === 3 && hold1.event === 'Her note' && hold1.journal, 'a true hold finishes the note: stage 3, her note event, one journal line');
    // the eighth count
    const fin = await ev(() => {
      const H = HOUSE13, out = {}; const g0 = G.player.gold, rep0 = (G.player.factions && G.player.factions.hedge) || 0;
      G.player.gold = 0; const j0 = G.journal.length;
      __go('p13h_tarrow', 11.0, 3.5, 0); useDeco(G.map.entities.find((e) => e._k === 'cot'));
      out.title = document.querySelector('#event h2').textContent; out.btn = document.querySelector('#event button').textContent;
      document.querySelector('#event button').click();
      out.done = H.done(); out.gold = G.player.gold; out.beads = G.has('p13h_beads'); out.j = G.journal.length - j0; out.jt = G.journal[0].text;
      out.rep = ((G.player.factions && G.player.factions.hedge) || 0) - rep0; out.quiet = H.quiet(); out.pos = G.flags.p13h_pos | 0;
      const again = H.finishQuest(); out.again = again; out.gold2 = G.player.gold;
      out.bundleGone = !H.find(G.map, 'bundle'); out.lintel = G.maps.oakhaven.entities.find((e) => e._p13h === 'lintel').sprite;
      out.wennaDone = (() => { const n = NPCS.p13h_wenna.quest(G); return n.text; })();
      return out;
    });
    check(fin.title === 'The eighth count' && fin.btn === 'Eight.' && fin.done && fin.gold === 10 && fin.beads && fin.j === 1 && /eighth count/.test(fin.jt), 'the eighth count finishes it: 10 sovereigns, the beads, one journal line');
    check(fin.rep === 5, 'Hedge standing rises by 5, once, through changeRep (' + fin.rep + ')');
    check(fin.again === false && fin.gold2 === fin.gold, 'finishing twice pays nothing twice');
    check(fin.quiet && fin.pos === 0 && fin.bundleGone && fin.lintel === 'p13h_lintel4' && /Quiet\. Not the Hedge/.test(fin.wennaDone), 'afterwards the house is quiet, the props rest, the fourth reed hangs, and Bethan says so');
    const quietNow = await ev(async () => {
      const H = HOUSE13, out = {}; let calls = 0; Audio_.sfx.step._orig = () => { calls++; }; Audio_.sfx.step._test = true;
      __go('p13h_tarrow', 3.5, 5.0, 0); H.T.room = 3; H.T.count = null;
      for (let i = 0; i < 5; i++) await new Promise((r) => requestAnimationFrame(r));
      Audio_.sfx.step(); out.mute = calls; calls = 0;
      __go('p13h_tarrow', 16.5, 11.5, 0); H.T.room = 2; Audio_.sfx.step(); await new Promise((r) => setTimeout(r, 700)); out.echo = calls;
      __go('p13h_tarrow', 10.5, 4.0, 0); H.T.room = 4; H.T.lastCount = -1e9; H.tick(0.1); out.count = !!H.T.count; out.muffled = Audio_.muffled;
      const p = G.flags.p13h_pos; for (let i = 0; i < 40; i++) { H.T.clock += 30; H.tryMove(true); } out.pos = G.flags.p13h_pos === p;
      Audio_.sfx.step._test = false; return out;
    });
    check(quietNow.mute === 1 && quietNow.echo === 1 && quietNow.count === false && quietNow.pos, 'after the quest every room is plain: footsteps sound, no echo, no counting, nothing moves');

    // the beads: once a game day, small
    const beads = await ev(() => {
      const H = HOUSE13, out = {}; G.stillT = 5; G.noise = 7;
      out.first = H.useBeads(); out.still = G.stillT; out.noise = G.noise;
      G.noise = 7; out.second = H.useBeads(); out.noise2 = G.noise; G.day++; G.noise = 1; out.third = H.useBeads(); out.noiseLow = G.noise;
      const it = ITEMS.p13h_beads; out.item = [it.name, it.value, !it.key, it.use];
      return out;
    });
    check(beads.first && beads.still === 0 && beads.noise === 2.4 && beads.second === false && beads.noise2 === 7 && beads.third && beads.noiseLow === 1, 'the beads clear the Hush meter and cap noise at 2.4 (never raise it), once per game day');
    check(beads.item[0] === 'Linnet\'s Counting-Beads' && beads.item[3] === 'p13h_beads', 'the item is registered');

    // ---------------------------------------------------------------- save and load, mid-quest
    const save = await ev(async () => {
      const H = HOUSE13, out = {};
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      G.flags.p13h_q = 2; G.flags.p13h_open = true; G.flags.p13h_pos = 5; G.flags.p13h_seen = 9; H.syncAll();
      __go('p13h_tarrow', 4.0, 4.5, 0.4); H.T.room = 3;
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      out.snapMap = snap.mapId; out.snapFlags = Object.keys(snap.flags).filter((k) => k.startsWith('p13h_')).sort().join();
      out.snapTransient = snap.maps.p13h_tarrow.ents.length === G.maps.p13h_tarrow.baseCount;
      // wreck the live state, then load
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      __go('oakhaven', 20.5, 20.5, 0);
      restoreGame(snap);
      out.map = G.mapId; out.q = H.stage(); out.pos = G.flags.p13h_pos; out.open = G.flags.p13h_open;
      const at = (id) => { const e = H.find(G.map, id); return e && [e.x, e.y]; };
      const p = H.PROPS; out.placed = p.every((pr, i) => { const e = H.find(G.map, pr.id); const k = (5 >> i) & 1; return e.x === pr.at[k][0] && e.y === pr.at[k][1]; });
      out.bundle = !!H.find(G.map, 'bundle'); out.cam = [Engine.cam.x, Engine.cam.y].map((v) => Math.round(v * 10) / 10);
      out.door = !!G.flags[G.maps.oakhaven.get(6, 7).locked]; out.wenna = !!H.find(G.maps.oakhaven, 'wenna');
      out.room = H.T.room;
      __go('oakhaven', 20.5, 20.5, 0);
      return out;
    });
    check(save.snapMap === 'p13h_tarrow' && /p13h_open,p13h_pos,p13h_q,p13h_seen/.test(save.snapFlags) && save.snapTransient, 'a save made in the house holds the quest in flags only; props and people are not saved');
    check(save.map === 'p13h_tarrow' && save.q === 2 && save.pos === 5 && save.open === true && save.placed && save.bundle && save.door && save.wenna, 'loading it puts you back in the house, mid-quest, the props where the flags say');

    // hostile flags
    const host = await ev(() => {
      const H = HOUSE13, out = {};
      const bad = { p13h_q: 'x', p13h_pos: 99, p13h_ask: -3, p13h_done: 'yes', p13h_open: 1, p13h_seen: 1.5, p13h_visits: NaN, p13h_bday: 1e9, p13h_closed: {}, p13h_nope: true, p13h_full: [] };
      Object.assign(G.flags, bad); H.sanitize();
      out.left = Object.keys(G.flags).filter((k) => k.startsWith('p13h_'));
      out.q = H.stage(); out.done = H.done(); out.closed = H.closed();
      Object.assign(G.flags, bad); const r = NPCS.p13h_wenna.quest(G); out.quest = !!r && typeof r.text === 'string';
      H.syncAll(); G.flags.p13h_pos = 0;
      out.fint = [H.fint('p13h_q'), H.fint('p13h_pos'), H.fint('p13h_visits')];
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      // hostile save: bad flags and the player parked inside a wall of the house
      G.flags.p13h_q = 77; G.flags.p13h_pos = -1;
      const snap = JSON.parse(JSON.stringify(snapshotGame())); snap.mapId = 'p13h_tarrow'; snap.cam = { x: 7.5, y: 7.5, dir: 0 };
      restoreGame(snap);
      out.cam = !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0); out.qAfter = H.stage(); out.inRoom = H.roomOf(Engine.cam.x, Engine.cam.y) >= 0;
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      __go('oakhaven', 20.5, 20.5, 0);
      return out;
    });
    check(host.left.length === 0 && host.q === 0 && !host.done && !host.closed && host.quest && host.fint.join() === '0,0,0', 'hostile p13h_ flags are dropped or read as 0 (left: ' + host.left.join() + ')');
    check(host.cam && host.qAfter === 0 && host.inRoom, 'a hostile save with the camera inside a house wall lands you on open floor, with bad flags clamped');

    // ---------------------------------------------------------------- the Greening comes first
    const green = await ev(() => {
      const H = HOUSE13, out = {};
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      // never begun: nothing is written
      G.flags.greening = true; const j0 = G.journal.length; H.checkClosure(); out.untouched = [Object.keys(G.flags).filter((k) => k.startsWith('p13h_')).length, G.journal.length - j0];
      delete G.flags.greening;
      // begun: one journal line, once
      G.flags.p13h_q = 1; G.flags.p13h_open = true; H.syncAll();
      G.flags.greening = true; const j1 = G.journal.length; G.maps.oakhaven = buildOakhaven(true);
      loadMap('oakhaven'); H.checkClosure(); H.checkClosure(); H.tick(0.1);
      out.closed = H.closed(); out.lines = G.journal.length - j1; out.line = G.journal[0].text; out.wenna = !!H.find(G.maps.oakhaven, 'wenna'); out.lintel = !!H.find(G.maps.oakhaven, 'lintel');
      const c = G.maps.oakhaven.get(6, 7); out.door = [c.locked, c.lockMsg.slice(0, 22)];
      out.givers = LOGMAP.QUEST_GIVERS.includes('p13h_wenna'); out.active = H.active();
      out.main = Object.keys(G.flags).filter((k) => !k.startsWith('p13h_')).length >= 1;
      // she says nothing quest-like after
      out.quest = NPCS.p13h_wenna.quest(G);
      // a finished quest is left alone
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      G.flags.p13h_q = 3; G.flags.p13h_done = true; const j2 = G.journal.length; H.checkClosure(); out.doneLeft = [H.closed(), G.journal.length - j2];
      delete G.flags.greening; for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      G.maps.oakhaven = buildOakhaven(false); const probe = buildAllMaps(); G.maps.oakhaven = probe.oakhaven; G.maps.p13h_tarrow = probe.p13h_tarrow; loadMap('oakhaven');
      return out;
    });
    check(green.untouched[0] === 0 && green.untouched[1] === 0, 'the Greening with the quest never begun writes nothing');
    check(green.closed && green.lines === 1 && /gone under the oaks/.test(green.line) && !green.wenna && !green.lintel && green.door[0] === '__never' && /A shuttered house/.test(green.door[1]) && !green.givers && !green.active && green.quest === null, 'the Greening with the quest open: one journal line, once; Bethan and the reeds go; the door is barred as before');
    check(green.doneLeft[0] === false && green.doneLeft[1] === 0, 'a finished quest is not closed or re-journalled by the Greening');

    // ---------------------------------------------------------------- switch off = the town as before
    const off = await ev(() => {
      const H = HOUSE13, out = {};
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      G.flags.p13h_q = 1; G.flags.p13h_open = true; H.syncAll();
      const wasDoor = G.maps.oakhaven.get(6, 7).locked;
      H.cfg.on = false; H.saveCfg(); H.syncAll();
      const c = G.maps.oakhaven.get(6, 7);
      out.before = wasDoor; out.door = [c.locked, c.lockMsg, c.label, !!c.portal];
      out.wenna = !!H.find(G.maps.oakhaven, 'wenna'); out.lintel = !!H.find(G.maps.oakhaven, 'lintel'); out.active = H.active();
      out.givers = LOGMAP.QUEST_GIVERS.includes('p13h_wenna');
      out.quest = NPCS.p13h_wenna.quest(G);
      // inside: the house keeps nothing and sounds are the game's
      let calls = 0; Audio_.sfx.step._orig = () => { calls++; }; Audio_.sfx.step._test = true;
      __go('p13h_tarrow', 3.5, 5.0, 0); H.T.room = 3; for (let i = 0; i < 3; i++) H.tick(0.1); Audio_.sfx.step(); out.step = calls; out.floor = H.T.floor;
      const p0 = G.flags.p13h_pos | 0; for (let i = 0; i < 20; i++) { H.T.clock += 30; H.tryMove(true); } out.moved = (G.flags.p13h_pos | 0) !== p0;
      Audio_.sfx.step._test = false; __go('oakhaven', 20.5, 20.5, 0);
      H.cfg.on = true; H.saveCfg(); H.syncAll();
      out.back = [G.maps.oakhaven.get(6, 7).locked, !!H.find(G.maps.oakhaven, 'wenna')];
      return out;
    });
    check(off.door[0] === '__never' && /barred from within/.test(off.door[1]) && off.door[2] === 'A shuttered house' && off.door[3] === false && !off.wenna && !off.lintel && !off.active && !off.givers && off.quest === null, 'switched off: the door is barred with its original line, nobody is in the lane, no marker');
    check(off.step === 1 && off.floor === 0 && off.moved === false, 'switched off, the house is just a house: footsteps sound, nothing is dulled, nothing moves');
    check(off.back[0] === 'p13h_open' && off.back[1] === true, 'switched on again, the lane and the door come back');

    // the Options row exists, toggles, and persists
    const row = await ev(() => { renderAccessibilityMenu(); const b = document.getElementById('h13-house-opt'); const out = { has: !!b, on: b && b.textContent, pressed: b && b.getAttribute('aria-pressed') }; if (b) { b.click(); out.off = [b.textContent, HOUSE13.cfg.on, localStorage.getItem('octave.house13.v1')]; b.click(); out.back = [b.textContent, HOUSE13.cfg.on]; } closeModal(); G.state = 'play'; return out; });
    check(row.has && row.on === 'On' && row.pressed === 'true' && row.off[0] === 'Off' && row.off[1] === false && /false/.test(row.off[2]) && row.back[1] === true, 'the Options row is there, toggles and persists (localStorage)');

    // ---------------------------------------------------------------- keyboard, touch, controller reach the same interact()
    const inp = await ev(async () => {
      const out = {}; const H = HOUSE13;
      const reset = () => { closeModal && G.openPanel && closeModal(); G.state = 'play'; G.keys = {}; __go('oakhaven', 7.7, 10.4, -Math.PI / 2); };
      for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      H.syncAll();
      reset(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); out.key = G.state;
      reset(); const t = document.querySelector('#t-use'); out.hasTouch = !!t;
      if (t) { t.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5, pointerId: 1 })); t.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 5, clientY: 5, pointerId: 1 })); out.touch = G.state; }
      reset(); out.pad0 = G.state;
      const real = navigator.getGamepads; const mk = (a) => [{ connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0 && a, value: 0 })) }];
      navigator.getGamepads = () => mk(true);
      await new Promise((r) => setTimeout(r, 400)); out.pad = G.state;
      navigator.getGamepads = () => mk(false); await new Promise((r) => setTimeout(r, 100)); navigator.getGamepads = real;
      reset(); out.buttons = 0;
      return out;
    });
    check(inp.key === 'dialogue', 'keyboard: E at Bethan opens her dialogue');
    check(!inp.hasTouch || inp.touch === 'dialogue', 'touch: the Use button opens it too');
    check(inp.pad0 === 'play' && inp.pad === 'dialogue', 'controller: button A opens it too');
    const btns = await ev(() => {
      closeModal(); G.state = 'play'; __go('oakhaven', 7.7, 11.0, -Math.PI / 2);
      talk(G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna'));
      const b = [...document.querySelectorAll('#modal-panel button')];
      const out = { n: b.length, focusable: b.every((x) => x.tabIndex >= 0 && !x.disabled), choices: [...document.querySelectorAll('[data-choice]')].length };
      closeModal(); G.state = 'play'; return out;
    });
    check(btns.n >= 4 && btns.focusable && btns.choices === 2, 'the dialogue choices are ordinary buttons (focusable by keyboard, tap and pad focus)');

    // ---------------------------------------------------------------- screenshots at 1280x800
    await ev(() => {
      G.tod = 0.5; for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k];
      HOUSE13.syncAll(); __go('oakhaven', 7.4, 12.0, -Math.PI / 2);
    });
    await pg.waitForTimeout(500); await shot(pg, 'street_before');
    await ev(() => { talk(G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna')); });
    await pg.waitForTimeout(300); await shot(pg, 'wenna_offer');
    await ev(() => { closeModal(); G.state = 'play'; HOUSE13.accept(); G.flags.p13h_pos = 0; __go('p13h_tarrow', 9.0, 11.6, -1.0); G.map.doors && Object.values(G.map.doors).forEach((d) => { d.open = d.target = 1; }); });
    await pg.waitForTimeout(400); await shot(pg, 'kitchen_kettle');
    await ev(() => { __go('p13h_tarrow', 9.6, 9.8, Math.PI / 2 + 0.15); Object.values(G.map.doors).forEach((d) => { d.open = d.target = 1; }); });
    await pg.waitForTimeout(400); await shot(pg, 'kettle_on_hob');
    await ev(() => { __go('p13h_tarrow', 4.3, 4.2, 0.6); Object.values(G.map.doors).forEach((d) => { d.open = d.target = 1; }); });
    await pg.waitForTimeout(400); await shot(pg, 'nan_room');
    await ev(() => { __go('p13h_tarrow', 4.5, 5.0, 0.8); useDeco(G.map.entities.find((e) => e._p13h === 'bundle')); });
    await pg.waitForTimeout(300); await shot(pg, 'shawl_event');
    await ev(() => { document.querySelector('#event button[data-i="1"]').click(); G.state = 'play'; __go('p13h_tarrow', 10.0, 5.6, -0.6); Object.values(G.map.doors).forEach((d) => { d.open = d.target = 1; }); });
    await pg.waitForTimeout(400); await shot(pg, 'nursery');
    await ev(() => { G.flags.p13h_q = 3; HOUSE13.syncAll(); __go('p13h_tarrow', 11.0, 3.6, -Math.PI / 2); useDeco(G.map.entities.find((e) => e._k === 'cot')); });
    await pg.waitForTimeout(300); await shot(pg, 'eighth_event');
    await ev(() => { hide('#event'); G.state = 'play'; for (const k of Object.keys(G.flags)) if (k.startsWith('p13h_')) delete G.flags[k]; __go('oakhaven', 20.5, 20.5, 0); });

    check(A.errors.length === 0, 'no page errors in the main run: ' + A.errors.slice(0, 3).join(' | '));
    await pg.close();

    // ---------------------------------------------------------------- 640x400: dialogue and events fit
    const C = await boot(browser, { width: 640, height: 400 }); const cp = C.page; allErrors.push(C.errors);
    const compact = await cp.evaluate(() => {
      const H = HOUSE13, out = {}; G.tod = 0.5;
      __go('oakhaven', 7.7, 11.0, -Math.PI / 2);
      talk(G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna'));
      const fit = () => { const p = document.querySelector('#modal-panel') || document.querySelector('#event-panel'); const r = p.getBoundingClientRect(); return { w: Math.round(r.width), over: p.scrollWidth > p.clientWidth + 1, inside: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 }; };
      out.dlg = fit(); out.btnsVisible = [...document.querySelectorAll('#modal-panel button')].every((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1; });
      DLG.choices[0].f(G); closeModal(); G.state = 'play';
      __go('p13h_tarrow', 4.5, 5.0, 0); useDeco(H.find(G.map, 'bundle'));
      out.ev = fit(); out.evFits = (() => { const p = document.querySelector('#event-panel'); return p.scrollWidth <= p.clientWidth + 1; })();
      document.querySelector('#event button[data-i="1"]').click(); G.state = 'play';
      renderAccessibilityMenu(); const g = document.querySelector('#modal-panel .ctl-grid'); out.opts = !!document.getElementById('h13-house-opt') && g.scrollWidth <= g.clientWidth + 1; closeModal(); G.state = 'play';
      return out;
    });
    check(compact.dlg.inside && !compact.dlg.over && compact.btnsVisible, '640x400: Bethan\'s dialogue fits with every button visible');
    check(compact.ev.inside && compact.evFits, '640x400: the shawl event fits');
    check(compact.opts, '640x400: the Options row fits the grid');
    await cp.evaluate(() => { __go('p13h_tarrow', 9.0, 11.6, -1.0); Object.values(G.map.doors).forEach((d) => { d.open = d.target = 1; }); });
    await cp.waitForTimeout(400); if (SHOTS) await cp.screenshot({ path: SHOTS + '/compact_kitchen.png' });
    await cp.evaluate(() => { __go('oakhaven', 7.4, 12.0, -Math.PI / 2); talk(G.maps.oakhaven.entities.find((x) => x._p13h === 'wenna')); });
    await cp.waitForTimeout(300); if (SHOTS) await cp.screenshot({ path: SHOTS + '/compact_dialogue.png' });
    check(C.errors.length === 0, 'no page errors at 640x400: ' + C.errors.slice(0, 3).join(' | '));
    await cp.close();

    // ---------------------------------------------------------------- module blocked: the original town, no errors
    const D = await boot(browser, null, { blockModule: true }); const dp = D.page; allErrors.push(D.errors);
    const blocked = await dp.evaluate(() => {
      const c = G.maps.oakhaven.get(6, 7); return { has: typeof HOUSE13, map: !!G.maps.p13h_tarrow, locked: c.locked, msg: c.lockMsg, label: c.label, ents: G.maps.oakhaven.entities.some((e) => e._p13h) };
    });
    check(blocked.has === 'undefined' && !blocked.map && blocked.locked === '__never' && /barred from within/.test(blocked.msg) && blocked.label === 'A shuttered house' && !blocked.ents, 'without the module the original town is untouched');
    check(D.errors.length === 0, 'no page errors without the module: ' + D.errors.slice(0, 3).join(' | '));
    await dp.close();
  } catch (e) {
    fails.push('exception: ' + (e && e.stack || e)); console.log('EXCEPTION', e);
  }
  await browser.close();
  if (allErrors.some((a) => a.length)) { fails.push('page errors: ' + allErrors.flat().slice(0, 4).join(' | ')); }
  console.log(fails.length ? 'FAIL house13 (' + fails.length + ')' : 'PASS house13');
  process.exit(fails.length ? 1 : 0);
})();
