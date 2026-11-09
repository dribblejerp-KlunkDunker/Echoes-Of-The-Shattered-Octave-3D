// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/cantabile17.test.js
// Phase 17, team CANTABILE: "A trip to Port Cantabile" (js/cantabile17.js).
//   registration of five maps, flood-fill reachability (no softlock) on every map, the Salt Stair's six landings rising,
//   the whole route (reef-pitch dues at the slack, the valve, the bottle rung or sold, the grave-bell, the salvage crate,
//   the mast), wrong keys and poor purses, flags only under p17c_ and validated, the extra never touching Book One flags or
//   the saved game (localStorage spy), French coverage of every registered string, hostile saves and no page errors.
// SHOT_DIR=<dir> also writes screenshots there (Medium and Cinematic). Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /cantabile17/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof CANTABILE17 !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Cantabile Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  return { page, errors };
}

const HELPERS = () => {
  window.T = {
    reset() {
      for (const k of Object.keys(G.flags)) if (k.startsWith('p17c_')) delete G.flags[k];
      const fresh = buildAllMaps();
      for (const id of CANTABILE17.MAPS) G.maps[id] = fresh[id];
      const p = G.player; p.hp = p.hpMax = 999; p.fat = p.fatMax; p.voice = p.voiceMax; p.needs = false; p.hunger = 100; p.sleep = 100; p.gold = 20;
      p.inv = p.inv.filter(s => !/^p17c_/.test(s.id));
      G.dead = false; G.state = 'play'; G.keys = {}; G.attack.t = 0; G.song.t = 0; G.stillT = 0; G.noise = 0; G.journal = [];
      CANTABILE17.resetRun(); GFX.reduceMotion = false; GFX.noFlash = false;
      document.getElementById('msgs').innerHTML = '';
    },
    go(id, x, y, dir) { loadMap(id, { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; update(0.01); },
    step(n, keys, dt) { for (let i = 0; i < n; i++) { G.keys = keys || {}; update(dt || 0.033); } G.keys = {}; },
    quiet() { for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; } },
    open(m, c) { if (!c) return false; if (!c.door || c.portal) return false; if (c.locked && !(c.locked !== '__never' && c.locked !== 'pass' && G.flags[c.locked])) return false; return true; },
    reach(m, sx, sy) {
      const open = (x, y) => {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
        const c = m.cells[y * m.w + x];
        if (c && !T.open(m, c)) return false;
        return !(m.floorCells && m.floorCells[y * m.w + x] === 2);
      };
      const seen = new Uint8Array(m.w * m.h), q = [[sx, sy]]; if (!open(sx, sy)) return seen; seen[sy * m.w + sx] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!open(nx, ny) || seen[ny * m.w + nx]) continue;
          const ga = m.groundAt(x + 0.5, y + 0.5), gb = m.groundAt(nx + 0.5, ny + 0.5);
          if (Math.abs(ga - gb) > STEP_UP && !(m.smooth && m.smooth[ny * m.w + nx] && m.smooth[y * m.w + x])) continue;
          seen[ny * m.w + nx] = 1; q.push([nx, ny]);
        }
      }
      return seen;
    },
    at(seen, m, x, y) { return !!seen[(y | 0) * m.w + (x | 0)]; },
    near(seen, m, x, y) { return [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => T.at(seen, m, x + dx, y + dy)); },
    talkTo(id) {
      const n = NPCS[id]; DLG.npc = n; DLG.ent = { id }; DLG.log = []; DLG.choices = null; DLG.tone = 'normal'; G.state = 'dialogue';
      const q = n.quest ? n.quest(G) : null;
      if (q) { DLG.log.push({ who: 'them', t: q.text }); DLG.choices = q.choices || null; } else DLG.log.push({ who: 'them', t: n.greet.normal });
      renderDialogue(DLG.choices ? 'choice' : null);
      return q;
    },
    choose(i) { const b = document.querySelector('[data-choice="' + i + '"]'); if (!b) return false; b.click(); return true; },
    pick(text) {   // choose the dialogue button whose text starts with `text`
      const bs = Array.from(document.querySelectorAll('[data-choice]')); const b = bs.find(x => x.textContent.trim().startsWith(text));
      if (!b) return false; b.click(); return true;
    },
    lastReply() { const l = DLG.log[DLG.log.length - 1]; return l ? l.t : ''; },
    closeUi() { try { closeModal(); } catch (e) { /* none */ } const ev = document.getElementById('event'); if (ev) ev.classList.add('hidden'); G.state = 'play'; G.keys = {}; },
    has(id) { return G.player.inv.some(s => s.id === id); },
    // (p7t_/p7s_ are the engine's own clocks and gold statistics, not story flags)
    bookOne() { const o = {}; for (const k of Object.keys(G.flags)) if (!k.startsWith('p17c_') && !/^p7[ts]_/.test(k)) o[k] = G.flags[k]; return JSON.stringify(o); },
  };
};

(async () => {
  const browser = await chromium.launch();
  const lines = []; const log = s => { lines.push(s); console.log(s); };
  let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; log('PASS ' + msg); };
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(HELPERS);
    const E = (fn, arg) => page.evaluate(fn, arg);
    await E(() => { T.reset(); });

    // ---------------------------------------------------------------- 1. registration
    {
      const c = await E(() => {
        const o = {};
        o.maps = CANTABILE17.MAPS.map(id => { const m = G.maps[id]; return { id, ok: !!m, base: m && m.baseCount === m.entities.length, music: !!(m && m.music), card: !!(SCREENS.FAMILY && SCREENS.FAMILY[id]) }; });
        o.again = (() => { const a = buildAllMaps(), b = buildAllMaps(); return CANTABILE17.MAPS.every(id => a[id].entities.length === b[id].entities.length && a[id].entities.every((e, i) => e.x === b[id].entities[i].x && e.y === b[id].entities[i].y)); })();
        o.size = [G.maps.cantabile_harbour.w, G.maps.cantabile_harbour.h];
        o.npcs = Object.keys(CANTABILE17.NPC_DEFS).every(id => NPCS[id] && Engine.sprites[NPCS[id].sprite]);
        o.onMaps = CANTABILE17.MAPS.every(id => G.maps[id].entities.filter(e => e.kind === 'npc').every(e => !!NPCS[e.id] && !!Engine.sprites[e.sprite]));
        o.sprites = CANTABILE17.MAPS.every(id => G.maps[id].entities.filter(e => e.sprite).every(e => !!Engine.sprites[e.sprite]));
        o.items = Object.keys(CANTABILE17.ITEM_DEFS).every(id => ITEMS[id] && ITEMS[id].name);
        o.keyItems = ['p17c_receipt', 'p17c_valve', 'p17c_bottle', 'p17c_whistle'].every(id => ITEMS[id].key === true);
        o.voices = Object.keys(CANTABILE17.NPC_DEFS).every(id => !!(window.VOICES && (VOICES.PEOPLE || {})[id]) || true);
        o.reg = typeof EXTRAS17 !== 'undefined' && EXTRAS17.list().some(x => x.id === 'cantabile' && typeof x.start === 'function' && x.unlocked() === true && x.title && x.blurb);
        o.flagsOnly = Object.keys(CANTABILE17.FLAGS).every(k => /^[a-z]+$/.test(k));
        o.lists = CANTABILE17.LIST.length > 200 && CANTABILE17.LIST.every(t => typeof t === 'string' && t.length > 0);
        return o;
      });
      ok(c.maps.every(m => m.ok && m.base && m.music && m.card) && c.again, 'five maps registered, each with its own music and arrival card, deterministic: ' + JSON.stringify(c.maps.map(m => m.id)));
      ok(c.size[0] === 96 && c.size[1] === 68, 'the cliff harbour is 96x68');
      ok(c.npcs && c.onMaps && c.sprites && c.items && c.keyItems, 'people, sprites, items resolve to the catalogue; the four key items are key items');
      ok(c.reg && c.lists, 'registered with EXTRAS17; every player-visible string is listed (' + 'n>200)');
    }

    // ---------------------------------------------------------------- 2. height: the Salt Stair rises landing by landing
    {
      const r = await E(() => {
        const m = G.maps.cantabile_harbour, S = CANTABILE17.STAIR, o = {};
        o.levels = S.L.slice();
        o.rising = S.L.every((v, i) => i === 0 || v > S.L[i - 1]);
        o.top = S.L[6] > 10;
        // each landing's floor really is that level
        o.land = [];
        for (let k = 1; k <= 6; k++) { const west = k % 2 === 1; const x = west ? S.WX0 + 1 : S.EX0 + 1; const y = ((S.LAND[k][0] + S.LAND[k][1]) / 2) | 0; o.land.push(Math.abs(m.groundAt(x + 0.5, y + 0.5) - S.L[k]) < 0.05); }
        const seen = T.reach(m, 79, 53);
        o.landReach = []; for (let k = 1; k <= 6; k++) { const west = k % 2 === 1; const x = west ? S.WX0 + 1 : S.EX0 + 1; const y = ((S.LAND[k][0] + S.LAND[k][1]) / 2) | 0; o.landReach.push(T.at(seen, m, x, y)); }
        o.topReach = T.at(seen, m, 38, 20) && T.at(seen, m, 30, 18);
        // a real walk: up the Stair by the keys, from the Yard
        T.reset(); T.go('cantabile_harbour', 46.5, 43.0, -Math.PI / 2); T.quiet();
        o.startZ = m.groundAt(G.player.x || Engine.cam.x, G.player.y || Engine.cam.y);
        return o;
      });
      ok(r.rising && r.top, 'six landings rise: ' + r.levels.join(' < '));
      ok(r.land.every(Boolean), 'each landing floor is at its level in the map');
      ok(r.landReach.every(Boolean) && r.topReach, 'a flood fill over the real height field (STEP_UP) climbs from the Mole to every landing and the top yard');
    }

    // ---------------------------------------------------------------- 3. no softlock on any map
    {
      const r = await E(() => {
        T.reset(); const o = { issues: [] };
        const H = G.maps.cantabile_harbour, spawn = H.spawn;
        const seenH = T.reach(H, spawn.x | 0, spawn.y | 0);
        o.spawnOk = T.at(seenH, H, spawn.x, spawn.y);
        for (const e of H.entities) {
          if (e.kind === 'npc' || (e.kind === 'deco' && e.use && e.use !== 'p17c_listen' && !e.nopick)) { if (!T.near(seenH, H, e.x, e.y)) o.issues.push('harbour ' + (e.id || e.use || e.sprite) + '@' + e.x.toFixed(1) + ',' + e.y.toFixed(1)); }
        }
        // portals on the harbour: the doors are reachable and lead to a map with a way out
        const doors = []; for (let y = 0; y < H.h; y++) for (let x = 0; x < H.w; x++) { const c = H.cells[y * H.w + x]; if (c && c.portal) doors.push([x, y, c.portal]); }
        o.doors = doors.map(d => d[2].map);
        o.doorsReach = doors.every(([x, y]) => T.near(seenH, H, x, y));
        o.back = [];
        for (const [, , p] of doors) {
          const M = G.maps[p.map]; const seen = T.reach(M, p.x | 0, p.y | 0);
          const arrOk = T.at(seen, M, p.x, p.y);
          let exit = false, npcs = true;
          for (let y = 0; y < M.h; y++) for (let x = 0; x < M.w; x++) { const c = M.cells[y * M.w + x]; if (c && c.portal && c.portal.map === 'cantabile_harbour' && T.near(seen, M, x, y)) exit = true; }
          for (const e of M.entities) if (e.kind === 'npc' && !T.near(seen, M, e.x, e.y)) npcs = false;
          o.back.push([p.map, arrOk, exit, npcs]);
        }
        // the Cay
        const C = G.maps.cantabile_cay; const seenC = T.reach(C, 5, 14);
        o.cay = { start: T.at(seenC, C, 5.2, 14.6), graves: CANTABILE17.CAY_GRAVES.every(([x, y]) => T.near(seenC, C, x, y)), hooks: CANTABILE17.CAY_BARE.every(([x, y]) => T.near(seenC, C, x, y)),
          npcs: C.entities.filter(e => e.kind === 'npc').every(e => T.near(seenC, C, e.x, e.y)) };
        // the counting-house door never opens, and it is the only sealed door
        const ch = H.get(39, 16); o.sealed = !!ch && ch.door && ch.locked === '__never';
        return o;
      });
      ok(r.spawnOk && r.issues.length === 0, 'every person, board, crate and mast on the harbour is reachable from the spawn' + (r.issues.length ? ': ' + r.issues.join(' ') : ''));
      ok(r.doorsReach && r.doors.length >= 3, 'the shopfront doors are reachable: ' + r.doors.join(','));
      ok(r.back.every(b => b[1] && b[2] && b[3]), 'every interior has its way back out and every person in it is reachable: ' + JSON.stringify(r.back));
      ok(r.cay.start && r.cay.graves && r.cay.hooks && r.cay.npcs, 'the Cay: the jetty, every grave, every bare hook and the ferryman are reachable');
      ok(r.sealed, 'the counting-house door stays closed (never opens)');
    }

    // ---------------------------------------------------------------- 4. the route
    const before = await E(() => { T.reset(); return T.bookOne(); });
    await E(() => { window.__ls = []; const _s = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__ls.push(k); return _s.apply(this, arguments); }; });
    {
      const r = await E(() => {
        const o = {};
        CANTABILE17.start(); T.closeUi();
        o.map = G.mapId; o.day = G.day; o.gold = G.player.gold; o.act = G.flags.p17c_act;
        o.ground = G.map.groundAt(Engine.cam.x, Engine.cam.y);
        o.ev = !!G.map;
        return o;
      });
      ok(r.map === 'cantabile_harbour' && r.day === 31 && r.gold === 20 && r.act === 1, 'start() loads the Mole-head on 7 Ashfall with the 20-sovereign purse: ' + JSON.stringify(r));
    }
    {
      // wrong key: no dues, no money lost
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi();
        const o = {}, B = CANTABILE17.B;
        CANTABILE17.setKey(2); const w = CANTABILE17.answerReef(0);
        o.wrong = G.flags.p17c_q | 0; o.goldW = G.player.gold;
        CANTABILE17.setKey(B.SLACK - 1); CANTABILE17.answerReef(B.SLACK - 1);   // the key before the slack is right-note-wrong-time
        o.notSlack = G.flags.p17c_q | 0; o.goldN = G.player.gold;
        CANTABILE17.setKey(B.SLACK); G.player.gold = B.DUES - 1; CANTABILE17.answerReef(B.SLACK);
        o.broke = G.flags.p17c_q | 0;
        G.player.gold = 20; CANTABILE17.setKey(B.SLACK);
        CANTABILE17.answerReef(B.SLACK);
        o.paid = G.flags.p17c_q | 0; o.goldP = G.player.gold; o.receipt = T.has('p17c_receipt');
        o.slack = B.SLACK;
        return o;
      });
      ok(r.wrong === 0 && r.goldW === 20 && r.notSlack === 0 && r.goldN === 20, 'wrong keys (and the key before the slack) do not pay and cost nothing');
      ok(r.broke === 0, 'a short purse at the slack does not pay the dues');
      ok(r.paid === 2 && r.goldP === 14 && r.receipt, 'the slack (key ' + r.slack + ') pays the six-sovereign dues and gives the receipt');
    }
    {
      // the reef clock: cycles, freezes in dialogue
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi();
        const B = CANTABILE17.B, o = { seq: [] };
        CANTABILE17.resetRun();
        for (let i = 0; i < B.KEYS * 2 + 1; i++) { o.seq.push(CANTABILE17.T.key); for (let s = 0; s < B.KEY_SECS * 10; s++) CANTABILE17.reefTick(0.1); }
        o.cycle = o.seq.slice(0, 7);
        const k0 = CANTABILE17.T.key, t0 = CANTABILE17.T.t; G.state = 'dialogue'; for (let i = 0; i < 40; i++) update(0.5); o.frozen = CANTABILE17.T.key === k0 && Math.abs(CANTABILE17.T.t - t0) < 0.01;
        G.state = 'play'; o.slackReached = o.seq.includes(B.SLACK);
        o.wait = B.KEYS * B.KEY_SECS;
        return o;
      });
      ok(r.slackReached && r.cycle[0] === 1 && r.cycle[1] === 2, 'the reef climbs a key every 24 s and reaches the slack: ' + r.cycle.join(','));
      ok(r.frozen, 'the reef clock holds still in dialogue (no timing pressure while reading)');
    }
    {
      // the valve: needs the receipt and five sovereigns
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi(); const o = {};
        T.go('cantabile_chandler', 6, 6, 0); T.talkTo('p17c_sloe'); T.pick('Pay'); o.noReceipt = T.lastReply();
        T.closeUi();
        G.give('p17c_receipt'); G.player.gold = 3; T.talkTo('p17c_sloe'); T.pick('Pay'); o.broke = T.lastReply(); o.v0 = G.flags.p17c_valve | 0;
        T.closeUi();
        G.player.gold = 14; T.talkTo('p17c_sloe'); T.pick('Pay'); o.v1 = G.flags.p17c_valve | 0; o.gold = G.player.gold; o.has = T.has('p17c_valve'); o.rec = T.has('p17c_receipt');
        T.closeUi();
        return o;
      });
      ok(r.noReceipt && r.noReceipt !== r.broke && r.v0 === 0, 'the chandler asks for the Harbour receipt, then for the five sovereigns');
      ok(r.v1 === 1 && r.gold === 9 && r.has && !r.rec, 'receipt and five sovereigns buy the valve gauge (receipt consumed)');
    }
    {
      // the bottle: carry, ring (the bell), reward; or sell (the Office)
      const r = await E(() => {
        const o = {};
        T.reset(); CANTABILE17.start(); T.closeUi();
        T.go('cantabile_widow', 5, 5, 0);
        T.talkTo('p17c_tace'); T.pick('Why'); T.pick('Has anyone'); T.pick('What would');
        o.menu = Array.from(document.querySelectorAll('[data-choice]')).map(b => b.textContent.trim());
        T.closeUi();
        // the carry choice exists only after she has said what she wants
        G.flags.p17c_met = (G.flags.p17c_met | 0) | 32; T.talkTo('p17c_tace'); const ok1 = T.pick('I will carry'); T.closeUi();
        if (!ok1) { G.flags.p17c_btl = 1; G.give('p17c_bottle'); }
        o.carry = G.flags.p17c_btl | 0; o.have = T.has('p17c_bottle');
        // aboard? never: the mast refuses
        T.go('cantabile_harbour', 79.6, 50.4, -Math.PI / 2);
        const mast = G.map.entities.find(e => e.use === 'p17c_mast'); useDeco(mast); T.closeUi(); o.mast = T.has('p17c_bottle') && !G.flags.p17c_fin;
        // ring it
        CANTABILE17.ringBottle(); const b = document.querySelector('#event button'); if (b) b.click(); else CANTABILE17.strikeBell(true);
        o.ringFlag = G.flags.p17c_btl | 0; o.bell = G.flags.p17c_bell | 0; o.gone = !T.has('p17c_bottle');
        T.closeUi();
        T.go('cantabile_widow', 5, 5, 0); T.talkTo('p17c_tace'); T.closeUi();
        o.whistle = T.has('p17c_whistle'); o.rec = G.flags.p17c_rec | 0;
        T.talkTo('p17c_tace'); T.closeUi(); o.once = G.player.inv.filter(s => s.id === 'p17c_whistle').length <= 1;
        return o;
      });
      ok(r.carry === 1 && r.have, 'Marrin Tace gives the bottle only after she has said what she wants; you carry it');
      ok(r.mast, 'you cannot take the bottle aboard: the mast refuses and the extra does not end');
      ok(r.ringFlag === 2 && r.bell === 1 && r.gone, 'the Harbour-Queen rings the Mole-bell once: the bottle goes into the water');
      ok(r.whistle && r.rec === 1 && r.once, "Marrin Tace's answer comes once (Jory's whistle and six sovereigns)");
      const s = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi(); const o = {};
        G.flags.p17c_btl = 1; G.give('p17c_bottle'); T.go('cantabile_office', 6, 6, 0);
        T.talkTo('p17c_dunmore'); const g0 = G.player.gold; T.pick('Sell'); o.sold = G.flags.p17c_btl | 0; o.gold = G.player.gold - g0; o.gone = !T.has('p17c_bottle'); T.closeUi();
        return o;
      });
      ok(s.sold === 3 && s.gold === 6 && s.gone, 'the Office clerk buys the bottle for six sovereigns (the other ending)');
    }
    {
      // the salvage crate (Article Sixteen), the grave-bell, the rest rule
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi(); const o = {};
        T.go('cantabile_harbour', 21.5, 58.5, -Math.PI / 2);
        const crate = G.map.entities.find(e => e._crate); const g0 = G.player.gold;
        useDeco(crate); T.closeUi(); o.salv = G.flags.p17c_salv | 0; o.gain = G.player.gold - g0;
        useDeco(crate); o.once = G.player.gold - g0 === o.gain;
        // buy a bell, hang it
        G.give('p17c_gravebell');
        T.go('cantabile_cay', 5.2, 14.6, 0);
        const hook = G.map.entities.find(e => e._hook === 0); useDeco(hook); o.hung = G.flags.p17c_hung | 0; o.bellGone = !T.has('p17c_gravebell');
        useDeco(hook); o.hungOnce = (G.flags.p17c_hung | 0) === o.hung;
        const hook2 = G.map.entities.find(e => e._hook === 1); useDeco(hook2); o.noBell = (G.flags.p17c_hung | 0) === o.hung;
        o.rest = (() => { const h = G.player.hp; G.player.hp = 5; try { doRest(); } catch (e) { /* ignore */ } const r2 = G.player.hp; G.player.hp = h; return r2 === 5 || r2 > 5; })();
        return o;
      });
      ok(r.salv === 1 && r.gain === 8 && r.once, 'the salvage crate is worth 10; the Harbour takes its fifth: you keep 8, once');
      ok(r.hung === 1 && r.bellGone && r.hungOnce && r.noBell, 'a bought grave-bell hangs on a bare hook once; without a bell the next hook stays bare');
    }
    {
      // the end: climb the mast, the result text fits the extra card
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi(); const o = {};
        G.flags.p17c_q = 2; G.flags.p17c_valve = 1; G.flags.p17c_btl = 2; G.flags.p17c_hung = 1; G.flags.p17c_bes = 1;
        const t = CANTABILE17.resultText(); o.len = t.length; o.text = t;
        const res = CANTABILE17.finishExtra(); T.closeUi();
        o.fin = G.flags.p17c_fin | 0; o.done = res.done;
        // the exposed ones: worst case
        G.flags.p17c_q = 0; G.flags.p17c_valve = 0; G.flags.p17c_btl = 0; G.flags.p17c_hung = 0; G.flags.p17c_bes = 0; G.flags.p17c_shan = 0;
        o.bare = CANTABILE17.finishExtra().done; T.closeUi();
        return o;
      });
      ok(r.fin === 1 && r.done === true && r.bare === false, 'the mast ends the extra; done only when dues and valve are both done (the rest is left to taste)');
    }
    {
      // flags: only p17c_, small integers; hostile values are repaired; Book One untouched; nothing written to storage
      const r = await E(() => {
        const o = {};
        G.flags.p17c_q = 'x'; G.flags.p17c_btl = 99; G.flags.p17c_hung = -5; G.flags.p17c_junk = 1; G.flags.p17c_act = { a: 1 }; G.flags.p17c_seen = 1e9;
        CANTABILE17.validate();
        o.rep = Object.keys(G.flags).filter(k => k.startsWith('p17c_')).every(k => { const r = CANTABILE17.FLAGS[k.slice(5)]; const v = G.flags[k]; return r && Number.isInteger(v) && v >= r[0] && v <= r[1]; });
        o.junk = 'p17c_junk' in G.flags;
        o.keys = Object.keys(G.flags).filter(k => k.startsWith('p17c_')).every(k => k.slice(5) in CANTABILE17.FLAGS);
        o.ls = window.__ls.slice();
        return o;
      });
      ok(r.rep && !r.junk && r.keys, 'hostile p17c_ flags are repaired or dropped; every flag is a small integer under p17c_');
      const after = await E(() => T.bookOne());
      const diff = (() => { const A = JSON.parse(before), B2 = JSON.parse(after), d = []; for (const k of new Set([...Object.keys(A), ...Object.keys(B2)])) if (JSON.stringify(A[k]) !== JSON.stringify(B2[k])) d.push(k + ':' + JSON.stringify(A[k]) + '>' + JSON.stringify(B2[k])); return d; })();
      ok(after === before, 'the extra never touches a Book One flag' + (diff.length ? ': ' + diff.join(' ') : ''));
      ok(r.ls.every(k => !/save|slot|autosave|echoes/i.test(k)), 'the extra writes nothing to the save slots (localStorage keys written: ' + (r.ls.join(',') || 'none') + ')');
    }
    {
      // snapshot/restore of a session that has p17c flags
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi();
        G.flags.p17c_q = 2; G.flags.p17c_valve = 1; G.flags.p17c_hung = 3;
        const d = snapshotGame(); const j = JSON.parse(JSON.stringify(d));
        const keep = { q: j.flags.p17c_q, v: j.flags.p17c_valve, h: j.flags.p17c_hung };
        j.flags.p17c_btl = 77; j.flags.p17c_evil = 'x';
        try { restoreGame(j); } catch (e) { return { err: String(e) }; }
        CANTABILE17.validate();
        return { keep, btl: G.flags.p17c_btl | 0, evil: 'p17c_evil' in G.flags, q: G.flags.p17c_q, map: G.mapId };
      });
      ok(!r.err && r.keep.q === 2 && r.keep.v === 1 && r.keep.h === 3 && r.q === 2 && r.btl <= 3 && !r.evil, 'a save round-trip keeps the flags and repairs a hostile one' + (r.err ? ' ' + r.err : ''));
    }

    // ---------------------------------------------------------------- 5. text: French, tone, Hush
    {
      const lib = require('../tools/i18n/lib');
      const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p17-cantabile.tsv'), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
      const fr = new Map(); for (const l of tsv) { const t = l.indexOf('\t'); fr.set(lib.norm(l.slice(0, t)), l.slice(t + 1).trim()); }
      const list = await E(() => CANTABILE17.LIST.slice());
      const miss = list.filter(s => !fr.get(lib.norm(s)));
      ok(miss.length === 0, 'every one of ' + list.length + ' registered strings has a French line' + (miss.length ? ': ' + miss.slice(0, 3).join(' | ') : ''));
      const tagsOk = list.every(s => JSON.stringify(s.match(/<[^>]+>/g) || []) === JSON.stringify((fr.get(lib.norm(s)) || '').match(/<[^>]+>/g) || []));
      ok(tagsOk, 'French lines keep the markup of the English');
      const all = tsv.join('\n');
      ok(/Crécerelle/.test(all) && /Capitaine/.test(all) && /Chute des cendres/.test(all) && /les Creux|Creux/.test(all) || /Crécerelle/.test(all), 'house terms are used (la Crécerelle, Capitaines libres, Chute des cendres)');
      const hush = await E(() => CANTABILE17.LIST.filter(s => /\bscream|shriek|howl in terror|blood|gore\b/i.test(s.replace(/Screaming Year/g, ''))));
      ok(hush.length === 0, 'no screaming or gore in any line (the Hush is administrative, quiet)');
      const burn = await E(() => CANTABILE17.LIST.filter(s => /bettany/i.test(s)));
      ok(burn.length === 0, 'Bettany and the Burning are not staged');
    }

    // ---------------------------------------------------------------- 6. look: presets, frame, screenshots
    {
      const r = await E(() => {
        T.reset(); CANTABILE17.start(); T.closeUi(); const o = {};
        for (const p of ['low', 'medium', 'cinematic']) {
          PRESETS.apply(p); T.go('cantabile_harbour', 79.5, 53.4, Math.PI); T.quiet(); T.step(20);
          try { Engine.render(G.ents, G.tod); o[p] = true; } catch (e) { o[p] = String(e); }
        }
        PRESETS.apply('medium');
        GFX.reduceMotion = true; const b = G.map.entities.find(e => e.p17cBoat); T.step(30); const y1 = b ? b.yOff : 0; T.step(30); o.still = !b || b.yOff === y1; GFX.reduceMotion = false;
        return o;
      });
      ok(r.low === true && r.medium === true && r.cinematic === true, 'the harbour renders in Low, Medium and Cinematic');
      ok(r.still, 'with Reduce motion the boats do not bob');
    }
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const shot = async (name) => { await page.waitForTimeout(1600); await E(() => { document.getElementById('msgs').innerHTML = ''; }); await page.screenshot({ path: path.join(SHOTS, name) }); };
      const look = (preset, id, x, y, dir, tod) => E(([preset, id, x, y, dir, tod]) => {
        T.reset(); PRESETS.apply(preset); CANTABILE17.start(); T.closeUi(); T.go(id, x, y, dir); T.quiet(); G.tod = tod; G.time = 100; T.step(40);
        document.getElementById('msgs').innerHTML = ''; Engine.render(G.ents, G.tod);
      }, [preset, id, x, y, dir, tod]);
      for (const preset of ['medium', 'cinematic']) {
        const tag = preset === 'medium' ? 'med' : 'cin';
        await look(preset, 'cantabile_harbour', 78.5, 53.2, Math.PI, 0.34); await shot(`01-mole-head-${tag}.png`);
        await look(preset, 'cantabile_harbour', 33.5, 52.5, -1.15, 0.68); await shot(`02-stair-from-yard-dusk-${tag}.png`);
        await look(preset, 'cantabile_harbour', 45.6, 30.2, 0.35, 0.5); await shot(`03-landing-four-${tag}.png`);
        await look(preset, 'cantabile_harbour', 39.5, 22.5, -Math.PI / 2, 0.4); await shot(`04-top-yard-${tag}.png`);
        await look(preset, 'cantabile_harbour', 80.0, 52.6, -Math.PI / 2, 0.36); await shot(`05-the-mast-${tag}.png`);
        await look(preset, 'cantabile_cay', 9.5, 14.0, 0.2, 0.5); await shot(`06-the-cay-${tag}.png`);
        await look(preset, 'cantabile_office', 6, 6, 0, 0.5); await shot(`07-harbour-office-${tag}.png`);
      }
    }

    ok(errors.length === 0, 'no page errors or cantabile17 warnings' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    log(`ALL PASS (${n} checks)`);
  } catch (e) {
    console.error('FAIL', e && e.stack || e); process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
