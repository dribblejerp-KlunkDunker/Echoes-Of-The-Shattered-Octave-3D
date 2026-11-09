// PREVIEW_URL=http://127.0.0.1:3964 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/hearth15.test.js
// Phase 15 hearth: camp cooking (recipes, exact exclusive buffs, the beat by keyboard / touch / pad / auto, no spoilage in the
// needs system so none invented), Rounds (rules, payouts, loss cap, seeded stream, no Math.random, panel by keyboard / touch / pad,
// no deal animation under Reduce motion, the Greening closes it once), boss trophies (per flag, retroactive, mounts only, save
// round-trip, hostile p15h_ values, Statistics), the French rows, 640x400. Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:3964';
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

async function boot(browser, vp) {
  const page = await browser.newPage({ viewport: vp || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /hearth15/i.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hearth Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof HEARTH15 === 'object' && G.state === 'play');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    // test helper: nothing hostile near the fire unless a test puts it there
    window.__calm = () => { for (const e of G.ents || []) if (e && e.kind === 'enemy') { e.passive = true; e.state = 'idle'; } };
  });
  return { page, errors };
}
const fits = (page) => page.evaluate(() => {
  const p = document.querySelector('#modal-panel'), r = p.getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect();
  return { inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, hscroll: p.scrollWidth > p.clientWidth + 1, vscroll: p.scrollHeight > p.clientHeight + 2, r: [r.width | 0, r.height | 0] };
});
const btnsInside = (page) => page.evaluate(() => {
  const g = document.querySelector('#game').getBoundingClientRect();
  return Array.from(document.querySelectorAll('#modal-panel button')).filter((b) => !b.hidden && b.offsetParent).every((b) => { const r = b.getBoundingClientRect(); return r.left >= g.left - 1 && r.right <= g.right + 1; });
});

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(() => { GFX.reduceMotion = true; });
    const reset = () => page.evaluate(() => {
      for (const k of ['cook', 'rounds', 'trophies']) HEARTH15.cfg[k] = true;
      HEARTH15.cfg.auto = false;
      try { closeModal(); } catch (e) { /* none open */ }
      document.getElementById('event').classList.add('hidden');
      G.flags = {}; G.day = 4; G.tod = 0.8; G.party = null;
      const p = G.player; p.gold = 200; p.hpMax = 200; p.hp = 50; p.voiceMax = 100; p.voice = 10; p.fatMax = 100; p.fat = 10; p.needs = false; p.hunger = 50; p.sleep = 80;
      p.inv = p.inv.filter((s) => !/^p15_|^p12_|^honey$|^herb_willow$|^flume_eel$/.test(s.id));
      HEARTH15.warm.rem = 0; HEARTH15.sync();
      window.__calm(); G.state = 'play'; G.keys = {};
    });

    // ================================================================= 0. the module, items, sprites, source hygiene
    const mod = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const ids = Object.keys(ITEMS).filter((k) => k.startsWith('p15_') && !k.startsWith('p15_letter'));   // js/ledger15.js adds its own p15_letter_* items
      check(ids.length === 15, '15 p15_ items (3 dishes, 12 trophies): ' + ids.length);
      for (const k of ['p15_smoked_eel', 'p15_toasted_round', 'p15_soothing_draught']) check(ITEMS[k] && ITEMS[k].use === 'p15_food' && !ITEMS[k].key, k + ' is a usable dish');
      for (const t of H.TX.trophy.items) { const it = ITEMS['p15_t_' + t.key]; check(it && it.key === true && it.use === 'p15_trophy', 'trophy item ' + t.key + ' is a key item'); check(Engine.sprites['p15_t_' + t.key], 'sprite ' + t.key); }
      check(Engine.sprites.p15_peg, 'peg sprite');
      check(H.TX.trophy.items.length === 12 && H.PEGS.length === 12, 'twelve trophies, twelve pegs');
      check(NPCS.p15_dealer && NPCS.p15_dealer.name === 'Nessa Tolliver', 'Nessa is registered');
      out.names = new Set(H.TX.trophy.items.map((t) => t.name)).size;
      check(out.names === 12, 'twelve distinct trophy names');
      return out;
    });
    assert.deepEqual(mod.fails, [], 'module: ' + mod.fails);
    console.log('PASS module: 3 dishes and 12 key-item trophies registered, sprites painted, Nessa registered');

    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'hearth15.js'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
    assert(!/Math\.random/.test(code), 'hearth15.js never calls Math.random');
    assert(!/\$\{/.test(src), 'no template interpolation: save data is never put into markup');
    assert(!/\.innerHTML\s*=/.test(code), 'no innerHTML assignments');
    console.log('PASS source: no Math.random, no innerHTML, no ${} interpolation in markup');

    const list = await page.evaluate(() => HEARTH15.LIST);
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p15-hearth.tsv'), 'utf8');
    const rows = new Map(tsv.split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t')));
    const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
    const missing = list.filter((s) => !rows.has(s) || !rows.get(s) || !rows.get(s).trim());
    assert.deepEqual(missing, [], 'French rows missing: ' + missing.slice(0, 4));
    const badPh = list.filter((s) => ph(s) !== ph(rows.get(s)));
    assert.deepEqual(badPh, [], 'placeholders differ: ' + badPh.slice(0, 3));
    assert(![...rows.values()].some((v) => /[<>]/.test(v)), 'no markup in the French rows');
    console.log('PASS French: ' + list.length + ' strings, every one with a row, placeholders kept');

    // ================================================================= 1. COOKING: recipes, buffs, one at a time
    await reset();
    const cook = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const near = (a, b, e) => Math.abs(a - b) <= (e == null ? 1e-6 : e);
      const wipe = () => { G.player.inv = G.player.inv.filter((s) => !/^p15_|^p12_|^honey$|^herb_willow$/.test(s.id)); };
      window.__calm();
      const real = Math.random; let calls = 0; Math.random = () => { calls++; return real(); };
      try {
        const want = { eel: ['p12_flume_eel'], round: ['p12_hearth_bread', 'p12_moot_curd'], draught: ['honey', 'herb_willow'] };
        check(H.RECIPES.length === 3, 'three recipes');
        for (const r of H.RECIPES) {
          wipe(); check(!H.recipeState(r).ok, r.id + ': nothing in the pack, nothing to cook');
          const need = want[r.id];
          check(JSON.stringify(r.needs.map((n) => n[0])) === JSON.stringify(need), r.id + ' inputs');
          for (let i = 0; i < need.length - 1; i++) G.give(need[i]);
          check(need.length === 1 || !H.recipeState(r).ok, r.id + ': half the inputs is not enough');
          G.give(need[need.length - 1]); G.give(need[0]);
          check(H.recipeState(r).ok, r.id + ': complete');
          const before = need.map((id) => G.count(id));
          const dish = H.finishCook(r);
          check(dish === r.dish && ITEMS[dish], r.id + ' yields ' + r.dish);
          check(need.every((id, i) => G.count(id) === before[i] - 1), r.id + ' takes exactly one of each input');
        }
        wipe(); check(H.finishCook(H.RECIPES[0]) === null, 'no inputs, no dish');
        // the beat is a pure function of the presses
        const run = (times, auto) => { const s = H.makeCookSession(H.RECIPES[0], { slow: true, auto: !!auto }); let t = 0; while (!s.done && t < 20) { for (const p of times) if (Math.abs(p - t) < 0.0049) s.press(); s.step(0.01); t += 0.01; } return [s.turns, s.presses, s.marks.map((m) => m.state).join('-')]; };
        const slowMarks = H.B.MARKS.map((m) => m * H.B.SLOW);
        const a = run(slowMarks), b = run(slowMarks);
        check(JSON.stringify(a) === JSON.stringify(b), 'the beat is deterministic'); check(a[0] === 3, 'on the marks: 3 turns (' + a + ')');
        check(run([])[0] === 0 && run([])[2] === 'miss-miss-miss', 'no presses: nothing turned');
        check(run([0.05, 0.1, 0.2])[0] === 0, 'presses far from every mark turn nothing');
        check(run([slowMarks[0], slowMarks[0] + 0.02, slowMarks[0] + 0.04])[0] === 1, 'a mark is turned once; extra presses cost nothing');
        check(run(slowMarks.concat([0.3, 0.4]))[0] === 3, 'extra presses never cost a turn');
        check(run([], true)[0] === 3 && run([], true)[1] === 0, 'auto-turn turns all three marks with no presses');
        const ss = H.makeCookSession(H.RECIPES[0], { slow: false }), sr = H.makeCookSession(H.RECIPES[0], { slow: true });
        check(ss.end === H.B.BEAT && near(sr.end, H.B.BEAT * H.B.SLOW) && sr.win > ss.win, 'Reduce motion gives a longer beat and a wider window');
        check(H.B.WIN * 2 < H.B.MARKS[1] - H.B.MARKS[0], 'marks never share a window');
      } finally { Math.random = real; }
      check(calls === 0, 'cooking never draws from Math.random (' + calls + ')');

      // buffs: exact numbers, one at a time
      const D = H.DISHES, QUAL = H.B.QUAL, P = G.player;
      for (const [dish, d] of Object.entries(D)) {
        for (let q = 0; q <= 3; q++) {
          G.flags = {}; H.warm.rem = 0; P.hp = 1; P.voice = 1; P.fat = 1; P.hpMax = 200; P.voiceMax = 100; P.fatMax = 100;
          const b = H.eatDish(dish, q), secs = Math.ceil(H.BUFFS[d.buff].secs * QUAL[q]);
          check(b && b.id === d.buff && b.secs === secs, dish + ' q' + q + ' warmth ' + (b && b.secs) + ' vs ' + secs);
          check(G.flags.p15h_b === d.buff && G.flags.p15h_bt === secs, dish + ' q' + q + ' flags');
          check(near(P.hp, 1 + d.hp) && near(P.voice, 1 + d.voice) && near(P.fat, 1 + d.fat), dish + ' immediate numbers');
        }
      }
      check(D.p15_smoked_eel.hp === 20 && D.p15_smoked_eel.fat === 30 && D.p15_toasted_round.hp === 16 && D.p15_toasted_round.voice === 10 && D.p15_soothing_draught.voice === 18, 'the table in the header matches');
      check(H.BUFFS[1].secs === 150 && H.BUFFS[2].secs === 180 && H.BUFFS[3].secs === 150, 'warmth lengths 150 / 180 / 150');
      P.hp = P.hpMax - 3; H.eatDish('p15_smoked_eel', 2); check(P.hp === P.hpMax, 'health caps at the maximum');
      // exclusive: a new meal replaces the old and does not stack
      G.flags = {}; H.warm.rem = 0; H.eatDish('p15_smoked_eel', 2);
      const r2 = H.eatDish('p15_toasted_round', 2);
      check(r2.replaced === true && G.flags.p15h_b === 2 && G.flags.p15h_bt === 180, 'a new meal replaces the old warmth');
      P.fat = 10; P.hp = 50; for (let i = 0; i < 200; i++) H.tickWarm(0.05);
      check(near(P.fat, 10), 'the eel warmth is gone: no fatigue regen from a stacked buff'); check(near(P.hp, 51, 1e-3), 'only the round heals: +0.10/s (' + P.hp + ')');
      check(near(H.warm.rem, 170, 0.06), 'ten seconds spent: ' + H.warm.rem);
      G.flags = {}; H.warm.rem = 0; H.eatDish('p15_smoked_eel', 2); H.eatDish('p15_smoked_eel', 2);
      check(G.flags.p15h_bt === 150, 'the same dish twice refreshes, it does not add');
      const eff = (dish) => { G.flags = {}; H.warm.rem = 0; H.eatDish(dish, 2); P.hp = 50; P.voice = 10; P.fat = 10; for (let i = 0; i < 100; i++) H.tickWarm(0.05); return [P.hp - 50, P.voice - 10, P.fat - 10]; };
      let e = eff('p15_smoked_eel'); check(near(e[0], 0, 1e-6) && near(e[1], 0, 1e-6) && near(e[2], 5, 1e-6), 'smoke: fatigue +1.0/s only (' + e + ')');
      e = eff('p15_toasted_round'); check(near(e[0], 0.5, 1e-6) && near(e[1], 0) && near(e[2], 0), 'hearth: health +0.10/s only (' + e + ')');
      e = eff('p15_soothing_draught'); check(near(e[0], 0) && near(e[1], 1.25, 1e-6) && near(e[2], 0), 'throat: voice +0.25/s only (' + e + ')');
      // combat: a hostile chasing close by pauses regeneration, never the clock
      G.flags = {}; H.warm.rem = 0; H.eatDish('p15_toasted_round', 2); P.hp = 50;
      const foe = { kind: 'enemy', x: Engine.cam.x + 3, y: Engine.cam.y, state: 'chase', dead: false, hp: 10 }; G.ents.push(foe);
      try {
        check(H.inCombat(), 'a chasing hostile within range is combat'); const t0 = H.warm.rem;
        for (let i = 0; i < 40; i++) H.tickWarm(0.05);
        check(P.hp === 50 && near(H.warm.rem, t0 - 2, 0.06), 'no healing in a fight, the clock still runs');
        foe.state = 'idle'; check(!H.inCombat(), 'an idle hostile is not combat'); for (let i = 0; i < 40; i++) H.tickWarm(0.05); check(P.hp > 50.1, 'healing resumes');
        foe.x = Engine.cam.x + 40; foe.state = 'chase'; check(!H.inCombat(), 'a far hostile is not combat');
      } finally { G.ents.splice(G.ents.indexOf(foe), 1); }
      // it ends
      G.flags = {}; H.warm.rem = 0; H.eatDish('p15_smoked_eel', 2); G.flags.p15h_bt = 1; H.loadWarm();
      for (let i = 0; i < 40; i++) H.tickWarm(0.05);
      check(G.flags.p15h_b === 0 && G.flags.p15h_bt === 0 && H.warm.rem === 0, 'it runs out and clears');
      // a long rest burns it
      H.eatDish('p15_toasted_round', 3); const w0 = H.warm.rem; passHours(1); check(near(w0 - H.warm.rem, H.B.HOUR_SECS, 1), 'an hour of rest burns ' + H.B.HOUR_SECS + ' s'); passHours(3); check(G.flags.p15h_b === 0, 'three more hours end it');
      return out;
    });
    assert.deepEqual(cook.fails, [], 'cooking: ' + cook.fails.slice(0, 6));
    console.log('PASS cooking: three recipes consume exact inputs, the beat is deterministic, warmth numbers exact, one at a time, paused in a fight, burnt by rest');

    // spoilage: the needs system has hunger and sleep only. None invented; cooked is richer than raw.
    const needs = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const P = G.player; G.flags = {}; H.warm.rem = 0;
      const gsrc = [needsOn, drainNeeds, passHours, needsLine].map((f) => f.toString()).join('\n');
      check(!/spoil|rot\b|stale|decay/i.test(gsrc), 'the game has no spoilage, so none is invented here');
      P.needs = true; P.hunger = 10; G.give('p12_flume_eel'); const slot = P.inv.find((s) => s.id === 'p12_flume_eel'); useItem(slot);
      const raw = P.hunger - 10;
      P.hunger = 10; H.eatDish('p15_smoked_eel', 2); const cooked = P.hunger - 10;
      check(cooked > raw && cooked === H.B.HUNGER_COOKED, 'cooked refills more hunger than raw: ' + cooked + ' vs ' + raw);
      P.needs = false; P.hunger = 10; H.eatDish('p15_toasted_round', 2); check(P.hunger === 10, 'Needs off: hunger is never touched');
      P.needs = true;
      const loss = (dish) => { G.flags = {}; H.warm.rem = 0; if (dish) H.eatDish(dish, 2); P.hunger = 80; drainNeeds(5); return 80 - P.hunger; };
      const base = loss(null), smoke = loss('p15_smoked_eel'), hearth = loss('p15_toasted_round');
      check(base > 0 && Math.abs(smoke - base * 0.75) < 1e-6, 'smoke-warmed: hunger loss x0.75 (' + smoke + ' vs ' + base + ')');
      check(Math.abs(hearth - base) < 1e-6, 'hearth-fed does not touch hunger');
      P.needs = false; G.flags = {}; H.warm.rem = 0; P.hunger = 50;
      out.raw = raw; out.cooked = cooked; out.base = base; out.smoke = smoke;
      return out;
    });
    assert.deepEqual(needs.fails, [], 'needs: ' + needs.fails);
    console.log('PASS needs: no spoilage exists in game.js (none invented); cooked +' + needs.cooked + ' hunger vs raw +' + needs.raw + '; smoke slows the road ' + needs.base.toFixed(2) + ' -> ' + needs.smoke.toFixed(2));

    // hostile flag values
    const hostile = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const bad = [NaN, Infinity, -Infinity, -9, 1e12, 'abc', null, undefined, {}, [], '7', 1.9];
      for (const v of bad) {
        G.flags = {}; H.warm.rem = 0;
        for (const k of ['p15h_b', 'p15h_bt', 'p15h_cooked', 'p15h_games', 'p15h_rwon', 'p15h_lday', 'p15h_lost', 'p15h_closed', 'p15h_got']) G.flags[k] = v;
        for (let i = 0; i < 12; i++) G.flags['p15h_p' + i] = v;
        try {
          H.loadWarm(); const id = H.buffId(); check(id >= 0 && id <= 3 && Number.isInteger(id), 'buff id sane for ' + String(v) + ': ' + id);
          check(H.warm.rem >= 0 && H.warm.rem <= H.B.BUFF_MAX && Number.isFinite(H.warm.rem), 'warmth sane for ' + String(v));
          for (let i = 0; i < 5; i++) H.tickWarm(0.05);
          const m = H.maxStake(); check(m === 0 || (m >= 2 && m <= 30), 'stake sane ' + m + ' for ' + String(v)); check(H.lostToday() >= 0 && H.lostToday() <= 9999, 'lost sane');
          const pm = H.placedMap(); const pegs = Object.keys(pm.byPeg); check(new Set(pegs).size === pegs.length && pegs.every((p) => +p >= 0 && +p < 12), 'pegs sane for ' + String(v));
          for (const k in pm.byTrophy) check(H.isGot(+k), 'only granted trophies hang');
          H.ensurePegs(G.maps.cooper_house); check(G.maps.cooper_house.entities.filter((e) => e._p15h === 'peg').length === 12, 'twelve pegs for ' + String(v));
          H.hungCount(); H.sync(); H.scanTrophies(true); H.checkClosure();
        } catch (err) { check(false, 'threw on ' + String(v) + ': ' + err.message); }
      }
      G.flags = { p15h_b: 99, p15h_bt: 9999 }; H.loadWarm(); check(H.buffId() === 3 && H.warm.rem === 600, 'out-of-range buff is clamped, not trusted');
      G.flags = { p15h_got: 0xFFFFFFF }; check(H.gotMask() === 4095, 'the trophy mask is 12 bits');
      G.flags = {}; H.warm.rem = 0; H.sync();
      return out;
    });
    assert.deepEqual(hostile.fails, [], 'hostile: ' + hostile.fails.slice(0, 6));
    console.log('PASS hostile p15h_ values (NaN, huge, negative, strings, objects) are clamped and never break a read');

    // ================================================================= 2. COOKING: the panel (camp fire, hearth, home)
    await reset();
    const where = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 });
      const h = G.map.entities.find((e) => e.kind === 'deco' && e.sprite === 'hearth'); check(h && h.use === 'p15_cook', 'the Boar\'s hearth can be used');
      HEARTH15.cfg.cook = false; HEARTH15.sync(); check(!G.maps.tavern.entities.find((e) => e.sprite === 'hearth').use, 'cook off: the hearth is as before');
      HEARTH15.cfg.cook = true; HEARTH15.sync();
      loadMap('cooper_house', { x: 6, y: 5, dir: 0 });
      const hh = G.map.entities.find((e) => e.kind === 'deco' && e.sprite === 'hearth'); check(hh && hh.use === 'house_forge', 'home hearth keeps its forge');
      loadMap('deepwoods'); const cf = G.map.entities.find((e) => e.use === 'campfire'); check(!!cf, 'the camp fire is in the Deep Woods');
      for (const id in G.maps) if (!['tavern', 'cooper_house'].includes(id)) for (const e of G.maps[id].entities) if (e.use === 'p15_cook') check(false, 'foreign hearth in ' + id);
      window.__calm();
      return out;
    });
    assert.deepEqual(where.fails, [], 'sites: ' + where.fails);

    await page.evaluate(() => { window.__msgs = []; window.__rmsg = msg; msg = (t) => window.__msgs.push(String(t)); const cf = G.map.entities.find((e) => e.use === 'campfire'); useDeco(cf); });
    const ev1 = await page.evaluate(() => ({ title: document.querySelector('#event-panel h2').textContent, btns: Array.from(document.querySelectorAll('#event-panel button')).map((b) => b.textContent) }));
    assert.equal(ev1.title, 'The camp fire'); assert.deepEqual(ev1.btns, ['Sit by the fire for a while.', 'Cook something.', 'Step back.']);
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    const nofood = await page.evaluate(() => { msg = window.__rmsg; return { msgs: window.__msgs, state: G.state }; });
    assert(nofood.msgs.some((m) => /You have nothing to cook/.test(m)), 'no food: it says so ' + nofood.msgs); assert.equal(nofood.state, 'play');
    await page.evaluate(() => { G.player.hp = 20; useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Sit by the fire' }).click();
    assert(await page.evaluate(() => G.player.hp > 20), 'the camp rest still heals');

    await page.evaluate(() => { closeModal(); G.state = 'play'; window.__calm(); G.player.hp = 50; G.give('p12_flume_eel'); G.give('honey'); G.give('herb_willow'); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    assert.equal(await page.evaluate(() => G.state), 'panel');
    await shot(page, 'cook-pick.png');
    const a11y = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const cv = document.getElementById('p15c-cv'), say = document.getElementById('p15c-say');
      check(cv.getAttribute('role') === 'img' && cv.getAttribute('aria-label').length > 20, 'the canvas has a text alternative');
      check(say.getAttribute('role') === 'status' && say.getAttribute('aria-live') === 'polite', 'the say line is a polite status');
      const bs = Array.from(document.querySelectorAll('#p15c-list button')); check(bs.length === 3, 'three recipe buttons');
      check(bs.every((b) => b.tagName === 'BUTTON' && b.textContent.trim().length > 3), 'real buttons with text');
      check(bs[0].disabled === false && bs[1].disabled === true && bs[2].disabled === false, 'the round (no bread, no curd) is greyed, the others live');
      check(/You need:/.test(bs[1].textContent), 'a greyed recipe says what it needs');
      check(document.activeElement === bs[0], 'focus lands on the first live recipe');
      check(document.getElementById('p15c-auto').getAttribute('aria-pressed') === 'false', 'auto-turn has a pressed state');
      check(document.getElementById('p15c-keys').textContent.length > 40, 'the keys are written on the panel');
      check(document.querySelector('#modal-panel h2').textContent === 'Cooking', 'titled');
      return out;
    });
    assert.deepEqual(a11y.fails, [], 'cook a11y: ' + a11y.fails);
    const fp = await fits(page); assert(fp.inside && !fp.hscroll, 'cook panel fits ' + JSON.stringify(fp));
    await page.keyboard.press('2'); assert.equal(await page.evaluate(() => HEARTH15.cookUi.phase), 'pick', 'a greyed recipe cannot be chosen');
    await page.keyboard.press('1'); assert.equal(await page.evaluate(() => HEARTH15.cookUi.phase), 'beat');
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.slow), true, 'Reduce motion slows the beat');
    await shot(page, 'cook-beat.png');
    for (let i = 0; i < 3; i++) {
      await page.evaluate((i) => { const s = HEARTH15.cookUi.s; s.t = s.marks[i].t; }, i);
      await page.keyboard.press(' ');
    }
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.turns), 3, 'three presses on three marks, three turns');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.end - 0.01; });
    await page.waitForFunction(() => HEARTH15.cookUi.phase === 'done');
    assert.equal(await page.evaluate(() => [G.count('p12_flume_eel'), G.flags.p15h_cooked, HEARTH15.cookUi.q].join()), '0,1,3', 'the eel is spent, one meal cooked, quality 3');
    assert(/Even all the way round/.test(await page.locator('#p15c-say').innerText()), 'a perfect cook says so');
    await shot(page, 'cook-done.png');
    await page.keyboard.press('1');
    await page.waitForFunction(() => !HEARTH15.cookUi && G.state === 'play');
    const eaten = await page.evaluate(() => [G.flags.p15h_b, G.flags.p15h_bt, Math.round(G.player.hp), G.player.fat > 10].join());
    assert.equal(eaten, '1,173,70,true', 'eat hot: smoke-warmed for 150 x 1.15 = 173 s, +20 health, +30 fatigue');
    console.log('PASS cook panel by keyboard: recipes greyed or live, three presses, quality 3, eaten hot for exactly 173 s');

    // auto-turn from the beat; wrap for the road; eat from the pack at the plain quality
    await page.evaluate(() => { HEARTH15.warm.rem = 0; G.flags.p15h_b = 0; G.flags.p15h_bt = 0; window.__calm(); G.give('honey'); G.give('herb_willow'); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    await page.keyboard.press('3');
    await page.keyboard.press('a');
    assert.equal(await page.evaluate(() => [HEARTH15.cookUi.s.auto, HEARTH15.cfg.auto].join()), 'true,true', 'A switches auto-turn on and keeps the choice');
    assert.equal(await page.locator('#p15c-auto').getAttribute('aria-pressed'), 'true');
    await page.keyboard.press(' ');
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.presses), 0, 'auto-turn takes no presses');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.end - 0.01; });
    await page.waitForFunction(() => HEARTH15.cookUi.phase === 'done');
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.q), 3, 'auto-turn is never worse than turning it well');
    await page.keyboard.press('2');
    await page.waitForFunction(() => !HEARTH15.cookUi);
    assert.equal(await page.evaluate(() => [G.count('p15_soothing_draught'), G.flags.p15h_b].join()), '1,0', 'wrapped: in the pack, no warmth yet');
    await page.evaluate(() => { G.player.voice = 10; useItem(G.player.inv.find((x) => x.id === 'p15_soothing_draught')); });
    assert.equal(await page.evaluate(() => [G.count('p15_soothing_draught'), G.flags.p15h_b, G.flags.p15h_bt, Math.round(G.player.voice)].join()), '0,3,150,28', 'from the pack: a 2-turn dish, 150 s, +18 voice');
    await page.evaluate(() => { HEARTH15.cfg.auto = false; HEARTH15.saveCfg(); });
    console.log('PASS cook panel: auto-turn by key (no presses, quality 3), wrap for the road, eat from the pack at the plain quality');

    // Esc: in the beat it steps back (nothing spent); in the list it leaves; when the dish is made it wraps it
    await page.evaluate(() => { G.give('p12_flume_eel'); window.__calm(); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    await page.keyboard.press('1'); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => [HEARTH15.cookUi.phase, G.count('p12_flume_eel')].join()), 'pick,1', 'Esc in the beat: back to the list, the eel untouched');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !HEARTH15.cookUi && G.state === 'play');
    assert.equal(await page.evaluate(() => G.openPanel || null), null);
    await page.evaluate(() => { window.__calm(); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    await page.keyboard.press('1'); await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.end - 0.01; });
    await page.waitForFunction(() => HEARTH15.cookUi.phase === 'done');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !HEARTH15.cookUi);
    assert.equal(await page.evaluate(() => [G.count('p15_smoked_eel'), G.count('p12_flume_eel')].join()), '1,0', 'Esc with a finished dish wraps it, never wastes it');
    console.log('PASS cook panel: Esc steps back, leaves, or wraps a finished dish; nothing is wasted');

    // touch, then pad
    await page.evaluate(() => { HEARTH15.warm.rem = 0; G.flags.p15h_b = 0; G.give('p12_flume_eel'); G.give('p12_flume_eel'); window.__calm(); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    await page.locator('#p15c-list button').first().tap();
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.phase), 'beat', 'a tap begins the beat');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.marks[0].t; });
    await page.locator('#p15c-cv').tap();
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.turns), 1, 'a tap on the pan turns the spit');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.marks[1].t; });
    await page.locator('#p15c-turn').tap();
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.turns), 2, 'the Turn button works by touch');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.end - 0.01; });
    await page.waitForFunction(() => HEARTH15.cookUi.phase === 'done');
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.q), 2);
    await page.locator('#p15c-eat').tap();
    await page.waitForFunction(() => !HEARTH15.cookUi);
    assert.equal(await page.evaluate(() => [G.flags.p15h_b, G.flags.p15h_bt].join()), '1,150', 'two turns: x1.0, 150 s');
    await page.evaluate(() => { window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [window.__pad]; });
    const padTap = (b) => page.evaluate(async (b) => { const raf = () => new Promise((r) => requestAnimationFrame(() => r())); window.__pad.buttons[b].pressed = true; for (let k = 0; k < 4; k++) await raf(); window.__pad.buttons[b].pressed = false; for (let k = 0; k < 3; k++) await raf(); }, b);
    await page.evaluate(() => { window.__calm(); useDeco(G.map.entities.find((e) => e.use === 'campfire')); });
    await page.locator('#event-panel button', { hasText: 'Cook something.' }).click();
    await page.waitForFunction(() => G.openPanel === 'p15h_cook');
    await padTap(0);
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.phase), 'beat', 'pad A chooses the focused recipe');
    await padTap(2); assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.auto), true, 'pad X switches auto-turn on');
    await padTap(2); assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.auto), false, 'pad X switches it off');
    await page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.marks[2].t; });
    await padTap(0); assert.equal(await page.evaluate(() => HEARTH15.cookUi.s.turns), 1, 'pad A turns the spit');
    await padTap(1);
    assert.equal(await page.evaluate(() => HEARTH15.cookUi.phase), 'pick', 'pad B steps back'); await padTap(1);
    await page.waitForFunction(() => !HEARTH15.cookUi && G.state === 'play');
    await page.evaluate(() => { HEARTH15.cfg.auto = false; });
    console.log('PASS cook panel by touch (tap recipe, tap pan, Turn button, Eat) and pad (A, X, B)');

    // the Boar's hearth and the home hearth; trouble close by
    await page.evaluate(() => { G.give('p12_flume_eel'); loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); window.__calm(); useDeco(G.map.entities.find((e) => e.sprite === 'hearth')); });
    const ev2 = await page.evaluate(() => ({ t: document.querySelector('#event-panel h2').textContent, b: Array.from(document.querySelectorAll('#event-panel button')).map((x) => x.textContent) }));
    assert.deepEqual(ev2, { t: 'The hearth', b: ['Cook something.', 'Step back.'] }); await page.locator('#event-panel button', { hasText: 'Step back.' }).click();
    await page.evaluate(() => { loadMap('cooper_house', { x: 6, y: 5, dir: 0 }); window.__calm(); useDeco(G.map.entities.find((e) => e.sprite === 'hearth')); });
    const ev3 = await page.evaluate(() => ({ t: document.querySelector('#event-panel h2').textContent, b: Array.from(document.querySelectorAll('#event-panel button')).map((x) => x.textContent) }));
    assert.deepEqual(ev3, { t: 'Your hearth', b: ['Cook something.', 'Craft, repair and brew.', 'Step back.'] });
    await page.locator('#event-panel button', { hasText: 'Craft, repair and brew.' }).click();
    const forge = await page.evaluate(() => G.state); assert.notEqual(forge, 'event', 'the original forge use ran');
    await page.evaluate(() => { try { closeModal(); } catch (e) { /* none */ } G.state = 'play'; });
    const trouble = await page.evaluate(() => {
      loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 });
      const foe = { kind: 'enemy', x: Engine.cam.x + 2, y: Engine.cam.y, state: 'chase', dead: false, hp: 5 }; G.ents.push(foe);
      let res; try { useDeco(G.map.entities.find((e) => e.sprite === 'hearth')); res = document.getElementById('event').classList.contains('hidden'); } finally { G.ents.splice(G.ents.indexOf(foe), 1); }
      return res;
    });
    assert.equal(trouble, true, 'with a hostile chasing, the hearth menu does not open');
    console.log('PASS sites: camp fire (rest kept), the Boar\'s hearth, your hearth (forge kept), none with trouble close');

    const comp = await page.evaluate(async () => {
      const out = {}, said = [], real = partySay; partySay = (l) => said.push(l);
      for (const id of ['kaelen', 'lyra', 'sable']) { G.party = { id, map: G.mapId }; const l = HEARTH15.companionLine(); out[id] = HEARTH15.TX.camp[id].includes(l); }
      G.party = null; out.none = HEARTH15.companionLine();
      G.party = { id: 'kaelen', map: 'somewhere_else' }; out.away = HEARTH15.companionLine(); G.party = null;
      await new Promise((r) => setTimeout(r, 1600)); partySay = real; out.said = said.length;
      return out;
    });
    assert.deepEqual(comp, { kaelen: true, lyra: true, sable: true, none: null, away: null, said: 3 }, 'a companion at the fire says one of their lines; alone or elsewhere, nothing');
    console.log('PASS companion camp line: Kaelen, Lyra, Sable each have one; nobody there, no line');

    // ================================================================= 3. ROUNDS: the rules
    await reset();
    const rules = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const names = new Set(); for (let c = 0; c < 24; c++) names.add(H.cardName(c));
      check(names.size === 24, 'twenty-four distinct cards');
      check(H.SUITS.join() === 'Bells,Reeds,Glass,Roots' && H.RANKS.join() === '1,2,3,Deacon,Factor,Cantor', 'suits and ranks as briefed');
      for (let c = 0; c < 24; c++) check(H.suitOf(c) * 6 + H.rankOf(c) - 1 === c && H.rankOf(c) >= 1 && H.rankOf(c) <= 6, 'card ' + c);
      for (let s = 1; s < 400; s++) {
        const r = H.newHand(s, 5), all = [...r.hands.me, ...r.hands.npc, r.turned];
        check(r.hands.me.length === 6 && r.hands.npc.length === 6 && new Set(all).size === 13, 'seed ' + s + ': six each, a turned card, no card twice');
        check(r.trump === H.suitOf(r.turned), 'the turned card names trumps');
      }
      const a = H.newHand(777, 5), b = H.newHand(777, 5), c2 = H.newHand(778, 5);
      check(JSON.stringify([a.hands, a.turned]) === JSON.stringify([b.hands, b.turned]), 'same seed, same deal'); check(JSON.stringify([a.hands, a.turned]) !== JSON.stringify([c2.hands, c2.turned]), 'a different seed, a different deal');
      check(H.newHand(1, 0).stake === 2 && H.newHand(1, 999).stake === 30 && H.newHand(1, NaN).stake === 2 && H.newHand(1, 7.9).stake === 7, 'stake clamps to 2-30');
      const mk = (hand, led) => ({ hands: { me: hand, npc: [] }, trick: led == null ? [] : [{ who: 'npc', card: led }] });
      check(H.legalCards(mk([0, 7, 14], null), 'me').length === 3, 'leading: anything');
      check(JSON.stringify(H.legalCards(mk([0, 1, 7, 14], 3), 'me')) === '[0,1]', 'must follow Bells');
      check(JSON.stringify(H.legalCards(mk([7, 14], 3), 'me')) === '[7,14]', 'no Bells: anything');
      const W = (led, other, trump) => H.trickWinner([{ who: 'npc', card: led }, { who: 'me', card: other }], trump);
      check(W(1, 4, 3) === 'me', 'higher of the suit led wins'); check(W(4, 1, 3) === 'npc', 'lower of the suit led loses');
      check(W(4, 19, 3) === 'me', 'a trump beats the suit led'); check(W(19, 4, 3) === 'npc', 'a trump led beats the others');
      check(W(19, 20, 3) === 'me' && W(20, 19, 3) === 'npc', 'higher trump wins'); check(W(1, 8, 3) === 'npc', 'an off-suit, non-trump card never wins');
      check(W(1, 4, 0) === 'me' && W(1, 8, 0) === 'npc', 'when the suit led is trumps, the higher follower wins and strangers lose');
      const r = H.newHand(42, 5); check(H.play(r, 'npc', r.hands.npc[0]) === null, 'not her turn'); check(H.play(r, 'me', 99) === null, 'a card you do not hold');
      const first = r.hands.me[0]; check(H.play(r, 'me', first) && r.trick.length === 1, 'the lead is played'); check(H.play(r, 'me', r.hands.me[0]) === null, 'twice in a row');
      const kinds = {}, stake = 10; let min = 0;
      for (let i = 0; i < 3000; i++) {
        const h = H.playAuto(H.seedFor(i % 11, i), stake, { leader: i % 2 ? 'npc' : 'me', mePick: (rr) => H.aiChoose(rr, 'me') });
        kinds[h.result] = (kinds[h.result] || 0) + 1; min = Math.min(min, h.delta);
        const m = h.tricks.me, n = h.tricks.npc;
        check(h.phase === 'done' && m + n === 6 && h.log.length === 6 && h.hands.me.length === 0 && h.hands.npc.length === 0, 'a hand is six tricks');
        if (m === 6) check(h.result === 'sweep' && h.delta === 20, 'six tricks pay double'); else if (m >= 4) check(h.result === 'win' && h.delta === 10, '4-5 tricks pay the stake');
        else if (m === 3) check(h.result === 'push' && h.delta === 0 && n === 3, 'three apiece is a push'); else check(h.result === 'lose' && h.delta === -10, '2 or fewer loses the stake');
        check(H.describeHand(h).length > 10, 'every result has words');
        for (const t of h.log) { const [x, y] = t.cards; check(t.winner === H.trickWinner([x, y], h.trump), 'every trick has its rightful winner'); }
      }
      check(min === -10, 'Nessa never claims the double: the worst hand costs one stake (' + min + ')');
      for (const k of ['win', 'lose', 'push', 'sweep']) check(kinds[k] > 0, 'result ' + k + ' occurs');
      out.kinds = kinds;
      const p1 = H.playAuto(5150, 7), p2 = H.playAuto(5150, 7), p3 = H.playAuto(5151, 7);
      check(JSON.stringify([p1.log, p1.delta]) === JSON.stringify([p2.log, p2.delta]), 'same seed, same game'); check(JSON.stringify(p1.log) !== JSON.stringify(p3.log), 'another seed, another game');
      check(H.seedFor(3, 4) === H.seedFor(3, 4) && H.seedFor(3, 4) !== H.seedFor(3, 5) && H.seedFor(3, 4) !== H.seedFor(4, 4), 'the seed follows the day and the hand count');
      const real = Math.random; let calls = 0; Math.random = () => { calls++; return real(); };
      try { for (let i = 0; i < 100; i++) H.playAuto(i, 3); H.newHand(1, 5); } finally { Math.random = real; }
      check(calls === 0, 'Rounds never draws from Math.random (' + calls + ')');
      let swaps = 0;
      for (let s = 1; s <= 300; s++) {
        for (const mode of ['lead', 'follow']) {
          const A = H.newHand(s, 5, { leader: mode === 'lead' ? 'npc' : 'me' }), Bh = H.newHand(s, 5, { leader: mode === 'lead' ? 'npc' : 'me' });
          if (mode === 'follow') { const c = A.hands.me[0]; H.play(A, 'me', c); H.play(Bh, 'me', c); }
          const pool = []; for (let c = 0; c < 24; c++) if (!Bh.hands.npc.includes(c) && c !== Bh.turned && !Bh.played.includes(c) && !Bh.trick.some((t) => t.card === c) && !Bh.hands.me.includes(c)) pool.push(c);
          const n = Bh.hands.me.length; if (pool.length < n) continue;
          Bh.hands.me = pool.slice(0, n); swaps++;
          check(H.aiChoose(A, 'npc') === H.aiChoose(Bh, 'npc'), 'Nessa played differently when your hidden cards changed (seed ' + s + ' ' + mode + ')');
        }
      }
      check(swaps > 200, 'enough swap trials ran (' + swaps + ')');
      const ev = (pick) => { let net = 0, n = 4000; for (let i = 0; i < n; i++) net += H.playAuto(H.seedFor(i % 9, i), 10, { leader: i % 2 ? 'npc' : 'me', mePick: pick }).delta; return net / n / 10; };
      out.evMirror = ev((rr) => H.aiChoose(rr, 'me'));
      out.evFirst = ev((rr) => H.legalCards(rr, 'me')[0]);
      out.evLow = ev((rr) => H.legalCards(rr, 'me').reduce((a2, b2) => (H.rankOf(b2) < H.rankOf(a2) ? b2 : a2)));
      check(out.evMirror > -0.1 && out.evMirror < 0.12, 'playing as well as Nessa is roughly even (' + out.evMirror.toFixed(3) + ')');
      check(out.evFirst < -0.1 && out.evLow < -0.1, 'careless play loses (' + out.evFirst.toFixed(3) + ', ' + out.evLow.toFixed(3) + ')');
      return out;
    });
    assert.deepEqual(rules.fails, [], 'rounds rules: ' + rules.fails.slice(0, 5));
    console.log('PASS Rounds rules: deck, deal, follow suit, trick winner, payouts, no double for her, seeded, no Math.random, her blindness to your hand; EV mirror ' + rules.evMirror.toFixed(3) + ' first ' + rules.evFirst.toFixed(3) + ' low ' + rules.evLow.toFixed(3) + ' ' + JSON.stringify(rules.kinds));

    const purse = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const P = G.player; G.flags = {}; G.day = 10;
      const fake = (delta, result) => ({ delta, result, settled: false, tricks: { me: 0, npc: 0 } });
      P.gold = 500; check(H.maxStake() === 30, 'plenty of gold: the stake tops out at 30');
      P.gold = 12; check(H.maxStake() === 12, 'a short purse: the stake is the purse'); P.gold = 1; check(H.maxStake() === 0, 'under 2 sovereigns: no game'); P.gold = 0; check(H.maxStake() === 0, 'broke');
      P.gold = 500;
      let r = fake(-30, 'lose'); H.settle(r); check(P.gold === 470 && H.lostToday() === 30, 'a loss pays out and is tallied'); check(H.settle(r) === 0 && P.gold === 470, 'settling twice pays once');
      r = fake(-30, 'lose'); H.settle(r); r = fake(-30, 'lose'); H.settle(r); check(H.lostToday() === 90 && P.gold === 410, 'three losses of 30: 90 down');
      check(H.maxStake() === 0, 'the daily cap of 90 closes the table');
      P.gold = 500; G.flags.p15h_lost = 80; check(H.maxStake() === 10, 'room left under the cap: 10');
      G.flags.p15h_lost = 89; check(H.maxStake() === 0, 'one under the cap is still under the minimum stake');
      G.flags.p15h_lost = 88; check(H.maxStake() === 2, 'two under the cap: a stake of 2');
      G.flags.p15h_lost = 90; r = fake(20, 'sweep'); H.settle(r); check(H.lostToday() === 70, 'a win of 20 gives 20 of the room back'); check(H.maxStake() === 20, 'room 20');
      r = fake(0, 'push'); H.settle(r); check(H.lostToday() === 70, 'a push moves nothing');
      r = fake(100, 'win'); H.settle(r); check(H.lostToday() === 0, 'the tally never goes below zero');
      G.flags.p15h_lost = 90; G.flags.p15h_lday = G.day + 1; check(H.maxStake() === 0, 'capped today'); G.day++; check(H.lostToday() === 0 && H.maxStake() === 30, 'a new day, a fresh cap');
      P.gold = 3; r = fake(-30, 'lose'); H.settle(r); check(P.gold === 0 && r.paid === -3, 'cannot pay more than the purse');
      G.flags.p15h_rwon = 0; P.gold = 100; H.settle(fake(5, 'win')); H.settle(fake(10, 'sweep')); H.settle(fake(0, 'push')); H.settle(fake(-5, 'lose')); check(G.flags.p15h_rwon === 2, 'two wins counted');
      P.gold = 200; G.flags = {};
      return out;
    });
    assert.deepEqual(purse.fails, [], 'purse and cap: ' + purse.fails.slice(0, 5));
    console.log('PASS purse and cap: stakes 2-30, 90 net a day, wins give room back, a new day is fresh, the purse is never overdrawn, settling is once');

    // ================================================================= 4. ROUNDS: Nessa, the panel
    await reset();
    await page.evaluate(() => { G.day = 6; G.player.gold = 100; loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); });
    await page.waitForTimeout(250);
    const nessa = await page.evaluate(() => {
      const g = G.ents.find((e) => e._p15h === 'nessa'); if (!g) return null;
      const free = !solidAt(g.x, g.y, g);
      Engine.cam.dir = Math.atan2(g.y - Engine.cam.y, g.x - Engine.cam.x); talk(g);
      return { free, btn: !!document.getElementById('d-p15-rounds'), transient: g.transient, idx: G.ents.indexOf(g), base: G.map.baseCount, text: document.querySelector('#modal-panel .dlg').textContent.includes('Nessa') };
    });
    assert(nessa, 'Nessa is at the Boar'); assert(nessa.free, 'her chair is clear'); assert(nessa.btn, 'Play Rounds is in her dialogue'); assert(nessa.transient && nessa.idx >= nessa.base, 'she is transient and past baseCount (never saved)'); assert(nessa.text);
    await shot(page, 'nessa-dialogue.png');
    await page.locator('#d-p15-rounds').click();
    await page.waitForFunction(() => G.openPanel === 'p15h_rounds');
    await shot(page, 'rounds-open.png');
    const r1 = await fits(page); assert(r1.inside && !r1.hscroll, 'Rounds fits the window ' + JSON.stringify(r1));
    const pa = await page.evaluate(() => {
      const out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const cv = document.getElementById('p15r-cv'); check(cv.getAttribute('role') === 'img' && cv.getAttribute('aria-label').length > 20, 'canvas alternative');
      check(document.getElementById('p15r-say').getAttribute('role') === 'status', 'status line'); check(document.getElementById('p15r-hand').getAttribute('role') === 'group', 'the hand is a group');
      check(/Twenty-four cards/.test(document.getElementById('p15r-rules').textContent) && /Esc/.test(document.getElementById('p15r-keys').textContent), 'rules and keys on the panel');
      check(document.getElementById('p15r-stake').textContent === 'Stake 5', 'opens at a stake of 5'); check(/Purse 100 · lost today 0 of 90/.test(document.getElementById('p15r-purse').textContent), 'purse line');
      check(document.getElementById('p15r-less').getAttribute('aria-label') === 'Less' && document.getElementById('p15r-more').getAttribute('aria-label') === 'More', 'stake buttons are labelled');
      check(document.activeElement && document.activeElement.id === 'p15r-main', 'focus on Deal');
      return out;
    });
    assert.deepEqual(pa.fails, [], 'rounds a11y: ' + pa.fails);
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => HEARTH15.roundsUi.stake), 16, 'stake 5 +5 +5 +1');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowLeft'); assert.equal(await page.evaluate(() => HEARTH15.roundsUi.stake), 10, '-5 -1');
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => HEARTH15.roundsUi.stake), 2, 'floor at 2');
    for (let i = 0; i < 40; i++) await page.keyboard.press('ArrowUp'); assert.equal(await page.evaluate(() => HEARTH15.roundsUi.stake), 30, 'ceiling at 30');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => HEARTH15.roundsUi.stake), 10);
    const gold0 = await page.evaluate(() => G.player.gold);
    await page.keyboard.press('Enter');
    const anim = await page.evaluate(() => ({ deal: document.querySelectorAll('.p15r-card.deal').length, delay: Array.from(document.querySelectorAll('.p15r-card')).filter((b) => b.style.transitionDelay).length, cards: document.querySelectorAll('.p15r-card').length }));
    assert.deepEqual(anim, { deal: 0, delay: 0, cards: 6 }, 'Reduce motion: no deal animation, six cards at once');
    await page.waitForFunction(() => HEARTH15.roundsUi.r && !HEARTH15.roundsUi.busy);
    await shot(page, 'rounds-hand.png');
    const f2 = await fits(page); assert(f2.inside && !f2.hscroll, 'Rounds mid-hand fits ' + JSON.stringify(f2));
    assert.equal(await page.evaluate(() => G.flags.p15h_games), 1, 'one hand dealt'); assert.equal(await page.evaluate(() => HEARTH15.roundsUi.r.leader), 'me', 'the first hand is yours to lead');
    let guard = 0; const misfires = [];
    while (guard++ < 500) {
      const st = await page.evaluate(() => {
        const u = HEARTH15.roundsUi, r = u.r, out = { phase: r.phase, turn: r.turn, busy: u.busy };
        if (r.phase === 'play' && r.turn === 'me' && !u.busy) {
          const legal = HEARTH15.legalCards(r, 'me'), btns = Array.from(document.querySelectorAll('.p15r-card'));
          out.bad = btns.map((b, i) => (b.disabled === legal.includes(r.hands.me[i]) ? i : -1)).filter((i) => i >= 0);
          out.names = btns.every((b, i) => b.getAttribute('aria-label') === HEARTH15.cardName(r.hands.me[i]));
          out.focus = !!(document.activeElement && document.activeElement.classList.contains('p15r-card'));
          out.pick = r.hands.me.indexOf(legal[legal.length - 1]) + 1;
        }
        return out;
      });
      if (st.phase === 'done') break;
      if (st.phase === 'play' && st.turn === 'me' && !st.busy) {
        if (st.bad.length) misfires.push('disabled flags wrong: ' + st.bad); if (!st.names) misfires.push('card labels'); if (!st.focus) misfires.push('focus left the hand');
        await page.keyboard.press(String(st.pick));
      } else await page.waitForTimeout(70);
    }
    assert.deepEqual(misfires, [], 'in the hand: ' + misfires.slice(0, 3));
    await page.waitForFunction(() => HEARTH15.roundsUi.r.settled);
    const done = await page.evaluate((g0) => { const r = HEARTH15.roundsUi.r; return { result: r.result, delta: r.delta, gold: G.player.gold - g0, say: document.getElementById('p15r-say').textContent, games: G.flags.p15h_games, main: document.getElementById('p15r-main').textContent }; }, gold0);
    assert.equal(done.gold, done.delta, 'the purse moved by exactly the result'); assert(done.say.length > 12 && done.main === 'Deal again', 'the result is written: ' + done.say);
    assert.equal(done.games, 1);
    await shot(page, 'rounds-done.png');
    console.log('PASS Rounds panel by keyboard: stake 2-30 by arrows, no deal animation under Reduce motion, illegal cards disabled, a full hand by number keys, result "' + done.say + '"');

    // second hand: Nessa leads (hands alternate); touch, then pad
    await page.locator('#p15r-more').tap(); await page.locator('#p15r-main').tap();
    await page.waitForFunction(() => G.flags.p15h_games === 2);
    await page.waitForFunction(() => { const u = HEARTH15.roundsUi; return u.r.leader === 'npc' && !u.busy && u.r.turn === 'me'; });
    assert.equal(await page.evaluate(() => HEARTH15.roundsUi.r.trick.length), 1, 'Nessa led first this hand');
    const lead = await page.locator('#p15r-say').innerText();
    assert(/Nessa leads the/.test(lead) && /Follow|You have no/.test(lead), 'her lead is announced with the follow-suit rule: ' + lead);
    await page.locator('.p15r-card:not([disabled])').first().tap();
    await page.waitForFunction(() => { const u = HEARTH15.roundsUi; return u.r.log.length >= 1 && !u.busy; });
    await page.evaluate(() => { window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) }; navigator.getGamepads = () => [window.__pad]; });
    const beforePad = await page.evaluate(() => HEARTH15.roundsUi.r.hands.me.length);
    await padTap(15);
    const afterPad = await page.evaluate(() => { const u = HEARTH15.roundsUi; return { card: u.r.hands.me[u.cur], legal: HEARTH15.legalCards(u.r, 'me').includes(u.r.hands.me[u.cur]) }; });
    assert(afterPad.legal, 'the pad moves the cursor onto a legal card');
    await padTap(0);
    await page.waitForFunction((n) => HEARTH15.roundsUi.r.hands.me.length < n, beforePad);
    assert.equal(await page.evaluate((c) => HEARTH15.roundsUi.r.played.includes(c), afterPad.card), true, 'pad A played the card under the cursor');
    await page.waitForFunction(() => !HEARTH15.roundsUi.busy || HEARTH15.roundsUi.r.phase === 'done');
    console.log('PASS Rounds by touch (stake +, Deal, a card) and pad (D-pad cursor, A plays); hands alternate who leads');

    // Esc asks twice; the second forfeits the stake
    while (await page.evaluate(() => HEARTH15.roundsUi.r.phase === 'play')) {
      const can = await page.evaluate(() => { const u = HEARTH15.roundsUi; return u.r.turn === 'me' && !u.busy; });
      if (can) await page.keyboard.press(String(await page.evaluate(() => { const u = HEARTH15.roundsUi; return u.r.hands.me.indexOf(HEARTH15.legalCards(u.r, 'me')[0]) + 1; }))); else await page.waitForTimeout(70);
    }
    await page.waitForFunction(() => HEARTH15.roundsUi.r.settled);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => G.flags.p15h_games === 3 && HEARTH15.roundsUi.r.phase === 'play');
    const pre = await page.evaluate(() => ({ gold: G.player.gold, lost: HEARTH15.lostToday(), stake: HEARTH15.roundsUi.r.stake }));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => !!HEARTH15.roundsUi), true, 'one Esc only asks'); assert(/Press Escape again/.test(await page.locator('#p15r-say').innerText()));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !HEARTH15.roundsUi && G.state === 'play');
    const post = await page.evaluate(() => ({ gold: G.player.gold, lost: HEARTH15.lostToday() }));
    assert.deepEqual([pre.gold - post.gold, post.lost - pre.lost], [pre.stake, pre.stake], 'leaving mid-hand forfeits the stake and counts toward the cap');
    console.log('PASS Rounds: Esc asks, the second Esc forfeits exactly the stake');

    // the cap at the table
    await page.evaluate(() => { G.player.gold = 300; G.flags.p15h_lday = G.day + 1; G.flags.p15h_lost = 90; G.state = 'play'; HEARTH15.openRounds(); });
    await page.waitForFunction(() => G.openPanel === 'p15h_rounds');
    assert.equal(await page.evaluate(() => document.getElementById('p15r-main').disabled), true, 'capped: Deal is disabled');
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => G.flags.p15h_games), 3, 'Enter deals nothing past the cap'); assert(/lost today 90 of 90/.test(await page.locator('#p15r-purse').innerText()));
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !HEARTH15.roundsUi);
    await page.evaluate(() => { G.player.gold = 1; G.flags.p15h_lost = 0; G.state = 'play'; HEARTH15.openRounds(); });
    await page.waitForFunction(() => G.openPanel === 'p15h_rounds'); assert.equal(await page.evaluate(() => document.getElementById('p15r-main').disabled), true, 'broke: Deal is disabled');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !HEARTH15.roundsUi);
    console.log('PASS Rounds: the daily cap and an empty purse both close the table');

    // ================================================================= 5. ROUNDS: animation only with motion; switch off; the Greening
    await reset();
    await page.evaluate(() => { GFX.reduceMotion = false; G.player.gold = 100; G.state = 'play'; HEARTH15.openRounds(); });
    await page.waitForFunction(() => G.openPanel === 'p15h_rounds');
    await page.keyboard.press('Enter');
    const anim2 = await page.evaluate(() => ({ deal: document.querySelectorAll('.p15r-card.deal').length, delay: Array.from(document.querySelectorAll('.p15r-card')).filter((b) => b.style.transitionDelay).length }));
    assert(anim2.deal > 0 && anim2.delay > 0, 'motion on: the cards are dealt with a delay (positive control) ' + JSON.stringify(anim2));
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForFunction(() => !HEARTH15.roundsUi);
    await page.evaluate(() => { GFX.reduceMotion = true; });
    await reset();
    const off = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = {}; G.day = 5; G.player.gold = 80;
      H.cfg.rounds = false; H.sync(); check(!G.maps.tavern.entities.some((e) => e._p15h === 'nessa'), 'off: no Nessa');
      loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); check(!G.ents.some((e) => e._p15h === 'nessa'), 'off: not placed on entering');
      talk(G.ents.find((e) => e.id === 'hetty')); check(!document.getElementById('d-p15-rounds'), 'off: Hetty offers nothing new'); closeModal(); G.state = 'play';
      H.cfg.rounds = true; H.sync(); loadMap('tavern', { x: 5.5, y: 6.5, dir: 0 }); check(G.ents.some((e) => e._p15h === 'nessa'), 'on: she is back');
      talk(G.ents.find((e) => e.id === 'hetty')); check(!document.getElementById('d-p15-rounds'), 'only Nessa deals'); closeModal(); G.state = 'play';
      G.flags = { greening: true }; const j0 = G.journal.length; H.sync(); H.sync(); check(G.journal.length === j0 && !G.flags.p15h_closed, 'never played: nothing to close, no line');
      check(!G.maps.tavern.entities.some((e) => e._p15h === 'nessa'), 'after the Greening she is gone');
      G.flags = { p15h_games: 3 }; H.sync(); check(G.maps.tavern.entities.some((e) => e._p15h === 'nessa'), 'before the Greening she sits there');
      G.flags.greening = true; const j1 = G.journal.length; H.sync(); H.sync(); H.checkClosure();
      check(G.journal.length === j1 + 1 && /Nessa/.test(G.journal[0].text), 'the Greening closes it with one journal line'); check(G.flags.p15h_closed === 1, 'closed flag');
      check(!G.maps.tavern.entities.some((e) => e._p15h === 'nessa') && !H.roundsActive(), 'nothing offered after the Greening');
      for (const f of ['escaped', 'part3']) { G.flags = { p15h_games: 1, [f]: true }; const j = G.journal.length; H.sync(); check(G.journal.length === j + 1, f + ' closes it too'); }
      G.flags = {}; H.sync();
      return out;
    });
    assert.deepEqual(off.fails, [], 'rounds off / Greening: ' + off.fails);
    console.log('PASS Rounds: deal animation only with motion on; switch off = nothing placed or offered; the Greening closes the table once, with a journal line');

    // ================================================================= 6. TROPHIES
    await reset();
    const trophies = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = H.TX.trophy.items, key = (k) => 'p15_t_' + T[k].key;
      const have = () => T.map((t, k) => (G.has(key(k)) ? t.key : null)).filter(Boolean).join();
      const clear = () => { for (const id of Object.keys(ITEMS)) if (id.startsWith('p15_t_')) while (G.has(id)) G.take(id); };
      const trial = (flags, expect, why) => { clear(); G.flags = Object.assign({}, flags); H.scanTrophies(true); check(have() === expect, why + ': got [' + have() + '] wanted [' + expect + ']'); };
      trial({}, '', 'no bosses, no trophies');
      trial({ wearer_dead: 1 }, 'wearer', 'the Hedge Wearer'); trial({ wearer_dead: 1, wearer_coda_dead: 1 }, 'coda', 'the coda Wearer is the second fight, not the first');
      trial({ coda_done: 1 }, 'requiem', 'the Requiem'); trial({ coda_done: 1, wearer_coda_dead: 1 }, 'coda', 'coda done by the Wearer is not the Requiem');
      trial({ aegis_destroyed: 1 }, 'aegis', 'the Aegis broken'); trial({ aegis_calmed: 1 }, 'hymn', 'the Aegis calmed'); trial({ aegis_calmed: 1, aegis_destroyed: 1 }, 'aegis', 'broken beats calmed');
      trial({ weaver_dead: 1 }, 'weaver', 'the Weaver'); trial({ mallow_dead: 1 }, 'mallow', 'Mallow'); trial({ brood_dead: 1 }, 'brood', 'the Brood-Mother'); trial({ bosun_dead: 1 }, 'bosun', 'the bosun');
      trial({ horn_dead: 1 }, 'horn', 'the listening horn'); trial({ deacon_dead: 1 }, 'deacon', 'the Deacon'); trial({ captain_dead: 1 }, 'captain', 'the Captain');
      trial({ aegis_done: 1, hymn_done: 1, coda_complete: 1, unrelated: 1 }, '', 'other flags grant nothing');
      trial({ wearer_dead: 1, mallow_dead: 1, bosun_dead: 1, captain_dead: 1 }, 'wearer,mallow,bosun,captain', 'several at once');
      const sets = { wearer: { wearer_dead: 1 }, coda: { wearer_coda_dead: 1 }, requiem: { coda_done: 1 }, aegis: { aegis_destroyed: 1 }, hymn: { aegis_calmed: 1 }, weaver: { weaver_dead: 1 }, mallow: { mallow_dead: 1 }, brood: { brood_dead: 1 }, bosun: { bosun_dead: 1 }, horn: { horn_dead: 1 }, deacon: { deacon_dead: 1 }, captain: { captain_dead: 1 } };
      for (const t of T) trial(sets[t.key], t.key, 'exactly ' + t.key);
      trial(Object.assign({}, ...Object.values(sets), { aegis_calmed: 0, wearer_dead: 1, wearer_coda_dead: 0, coda_done: 1 }), 'wearer,requiem,aegis,weaver,mallow,brood,bosun,horn,deacon,captain', 'everything but the alternates');
      check(H.scanTrophies(true) === 0, 'a second scan grants nothing'); const n = G.player.inv.filter((s) => s.id.startsWith('p15_t_')).length; H.scanTrophies(false); check(G.player.inv.filter((s) => s.id.startsWith('p15_t_')).length === n, 'no duplicates');
      clear(); G.flags = { captain_dead: 1 }; H.cfg.trophies = false; check(H.scanTrophies(true) === 0 && !have(), 'off: nothing granted'); H.cfg.trophies = true; check(H.scanTrophies(true) === 1 && have() === 'captain', 'on again: granted retroactively');
      clear(); G.flags = { brood_dead: 1 }; const lines = []; const rm = msg; msg = (t) => lines.push(t); try { H.scanTrophies(false); } finally { msg = rm; }
      check(lines.length === 1 && /The Weaverling Spindle is yours to keep/.test(lines[0]), 'a line when it is won: ' + lines[0]);
      return out;
    });
    assert.deepEqual(trophies.fails, [], 'trophies: ' + trophies.fails.slice(0, 5));
    console.log('PASS trophies: each boss flag grants exactly its piece, retroactively, once; the alternates are exclusive; off grants nothing');

    await reset();
    const walls = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      const T = H.TX.trophy.items, key = (k) => 'p15_t_' + T[k].key;
      G.flags = { wearer_dead: 1, weaver_dead: 1, horn_dead: 1, captain_dead: 1, mallow_dead: 1 }; H.scanTrophies(true);
      const got = T.map((t, k) => k).filter((k) => H.isGot(k)); check(got.length === 5, 'five won');
      loadMap('cooper_house', { x: 6, y: 5, dir: 0 });
      const pegs = () => G.map.entities.filter((e) => e._p15h === 'peg');
      check(pegs().length === 12, 'twelve pegs on the walls'); check(pegs().every((e, i) => e.x === H.PEGS[i].x && e.y === H.PEGS[i].y && e.sprite === 'p15_peg' && e.use === 'p15_peg' && e.transient === true && e.solid === false), 'pegs are at the fixed mount points, bare, transient, not solid');
      check(pegs().every((e) => e.x < 1.5 || e.x > 10.5 || e.y < 1.5 || e.y > 7.5), 'every mount sits on a wall');
      check(new Set(H.PEGS.map((p) => p.x + ',' + p.y)).size === 12, 'distinct mounts');
      const k0 = got[0], k1 = got[1];
      const lines = []; const rm = msg; msg = (t) => lines.push(t);
      try {
        check(H.hang(k0, 3) === true, 'hang on a free mount'); check(lines.length === 1 && lines[0] === T[k0].hung, 'a line when it is placed');
        check(!G.has(key(k0)), 'it leaves the pack'); check(pegs()[3].sprite === 'p15_t_' + T[k0].key && pegs()[3].label === T[k0].name, 'the mount shows it');
        check(pegs().filter((e) => e.sprite !== 'p15_peg').length === 1, 'only that mount changed');
        check(H.hang(k0, 4) === false, 'a hung trophy cannot be hung twice'); check(H.hang(k1, 3) === false, 'a mount holds one piece');
        for (const bad of [-1, 12, 99, 1.5, NaN, Infinity, '3', '5', null, undefined, {}, []]) check(H.hang(k1, bad) === false, 'no peg ' + String(bad) + ' - only the twelve mounts');
        for (const badK of [-1, 12, 99, NaN, '1', null, 0.5]) check(H.hang(badK, 5) === false, 'no trophy ' + String(badK));
        const notWon = T.map((t, k) => k).find((k) => !H.isGot(k)); check(H.hang(notWon, 5) === false, 'an unwon trophy cannot be hung');
        G.flags.p15h_got |= 1 << notWon; check(H.hang(notWon, 5) === false, 'a bit set without the item in the pack hangs nothing (' + T[notWon].key + ')'); G.flags.p15h_got &= ~(1 << notWon);
        check(H.hang(k1, 11) === true && pegs()[11].sprite === 'p15_t_' + T[k1].key, 'a second piece on the last mount');
        check(G.map.entities.filter((e) => /^p15_t_/.test(e.sprite || '')).every((e) => e._p15h === 'peg'), 'trophy sprites appear only on pegs');
        check(G.map.entities.filter((e) => /^p15_t_/.test(e.sprite || '')).every((e) => H.PEGS.some((p) => p.x === e.x && p.y === e.y)), 'at the fixed positions only');
        check(H.takeDown(k0) === true && G.has(key(k0)) && pegs()[3].sprite === 'p15_peg', 'take it down: back in the pack, bare peg'); check(H.takeDown(k0) === false && H.takeDown('x') === false && H.takeDown(-1) === false, 'nothing to take twice');
        check(H.hang(k0, 0) === true, 'rehang elsewhere'); check(H.hungCount() === 2, 'two hang');
      } finally { msg = rm; }
      for (const t of T) { const it = ITEMS['p15_t_' + t.key]; const bad = Object.keys(it).filter((p) => /^(atk|dmg|damage|def|armor|armour|ar|hp|voice|fat|bonus|stat|stats|slot|equip|weapon|speed|crit|resist|buff|power|heal|mod)$/i.test(p)); check(bad.length === 0, t.key + ' carries no stat: ' + bad); }
      const nums = () => JSON.stringify(Object.entries(G.player).filter(([k, v]) => typeof v === 'number' && !['hp', 'voice', 'fat', 'gold', 'hunger', 'sleep'].includes(k)));
      const snap = nums();
      for (const fl of ['wearer_dead', 'wearer_coda_dead', 'coda_done', 'aegis_destroyed', 'weaver_dead', 'mallow_dead', 'brood_dead', 'bosun_dead', 'horn_dead', 'deacon_dead', 'captain_dead']) G.flags[fl] = 1;
      H.scanTrophies(true); check(nums() === snap, 'twelve trophies change no stat');
      return out;
    });
    assert.deepEqual(walls.fails, [], 'walls: ' + walls.fails.slice(0, 5));
    console.log('PASS walls: twelve fixed mounts, a line when placed, one piece per mount, only integers 0-11, take down and rehang, no stats');

    await reset();
    await page.evaluate(() => { G.flags = { horn_dead: 1, deacon_dead: 1 }; HEARTH15.scanTrophies(true); loadMap('cooper_house', { x: 6, y: 5, dir: 0 }); window.__calm(); useDeco(G.map.entities.filter((e) => e._p15h === 'peg')[4]); });
    const menu = await page.evaluate(() => ({ t: document.querySelector('#event-panel h2').textContent, b: Array.from(document.querySelectorAll('#event-panel button')).map((x) => x.textContent) }));
    assert.deepEqual(menu, { t: 'A bare peg', b: ['The Horn-Lens', 'The Felted Clapper', 'Leave it bare.'] });
    await page.locator('#event-panel button', { hasText: 'The Felted Clapper' }).click();
    assert.equal(await page.evaluate(() => [HEARTH15.placedMap().byTrophy[10], G.has('p15_t_deacon')].join()), '4,false', 'the menu hung the clapper on the fifth mount');
    await page.evaluate(() => { useDeco(G.map.entities.filter((e) => e._p15h === 'peg')[4]); });
    assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#event-panel button')).map((x) => x.textContent)), ['Take it down.', 'Leave it hung.']);
    await page.locator('#event-panel button', { hasText: 'Take it down.' }).click();
    assert.equal(await page.evaluate(() => G.has('p15_t_deacon')), true, 'taken down: back in the pack');
    await page.evaluate(() => { useDeco(G.map.entities.filter((e) => e._p15h === 'peg')[7]); });
    await shot(page, 'peg-menu.png');
    await page.locator('#event-panel button', { hasText: 'Leave it bare.' }).click();
    assert.equal(await page.evaluate(() => HEARTH15.hungCount()), 0);
    await page.evaluate(() => { G.flags = {}; G.player.inv = G.player.inv.filter((s) => !s.id.startsWith('p15_t_')); useDeco(G.map.entities.filter((e) => e._p15h === 'peg')[0]); });
    assert.equal(await page.evaluate(() => document.getElementById('event').classList.contains('hidden')), true, 'no trophies: no menu, only a line');
    console.log('PASS peg menu: hang from the pack, take down, leave bare, nothing to hang');

    await page.evaluate(() => { G.flags = { wearer_dead: 1, mallow_dead: 1, p15h_games: 4, p15h_rwon: 3 }; G.player.inv = G.player.inv.filter((s) => !s.id.startsWith('p15_t_')); HEARTH15.scanTrophies(true); HEARTH15.hang(0, 6); G.state = 'panel'; PLAYTOOLS.renderStats(); });
    await page.waitForSelector('#p7-stats .p15h-stats');
    const st = await page.evaluate(() => Array.from(document.querySelectorAll('#p7-stats .p15h-stats .p7-srow')).map((r) => r.textContent));
    assert(st.some((t) => /The Borrowed Collar.*Hung/.test(t)) && st.some((t) => /The Pressman's Plate.*In your pack/.test(t)), 'won pieces listed, hung or in the pack: ' + st);
    assert(st.some((t) => /2 of 12 won/.test(t)) && st.some((t) => /Rounds won.*3 \/ 4/.test(t)), 'the count and the Rounds record: ' + st);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#p7-stats .p15h-stats').length), 1, 'listed once');
    await shot(page, 'stats.png');
    await page.evaluate(() => { closeModal(); G.state = 'play'; G.flags = {}; HEARTH15.cfg.trophies = false; G.state = 'panel'; PLAYTOOLS.renderStats(); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#p7-stats .p15h-stats').length), 0, 'trophies off: the Statistics screen is as before');
    await page.evaluate(() => { closeModal(); G.state = 'play'; HEARTH15.cfg.trophies = true; G.flags = {}; G.state = 'panel'; PLAYTOOLS.renderStats(); });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#p7-stats .p15h-stats').length), 0, 'nothing won and nothing played: the Statistics screen is exactly as before');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    console.log('PASS Statistics: trophies listed (hung / in your pack), the count, the Rounds record; off = as before');

    // the save round-trip
    const save = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = { wearer_dead: 1, coda_done: 1, aegis_destroyed: 1, weaver_dead: 1, mallow_dead: 1, brood_dead: 1, captain_dead: 1, horn_dead: 1 };
      G.player.inv = G.player.inv.filter((s) => !s.id.startsWith('p15_t_')); H.scanTrophies(true);
      loadMap('cooper_house', { x: 6, y: 5, dir: 0 });
      const T = H.TX.trophy.items, ks = T.map((t, k) => k).filter((k) => H.isGot(k)); check(ks.length === 8, 'eight won');
      const plan = { 0: 9, 2: 0, 3: 5, 7: 11 }; for (const [k, p] of Object.entries(plan)) check(H.hang(+k, p), 'hung ' + k);
      G.flags.p15h_b = 2; G.flags.p15h_bt = 77; G.flags.p15h_games = 6; G.flags.p15h_lost = 12; G.flags.p15h_lday = G.day + 1;
      const dump = () => ({ placed: JSON.stringify(H.placedMap()), pack: G.player.inv.filter((s) => s.id.startsWith('p15_t_')).map((s) => s.id).sort().join(), flags: Object.keys(G.flags).filter((f) => f.startsWith('p15h_')).sort().map((f) => f + '=' + G.flags[f]).join() });
      const before = dump();
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      check(!snap.maps.cooper_house.extra.some((e) => /^p15_/.test(e.sprite || '')), 'the pegs are transient: never written into the save');
      check(Object.keys(snap.flags).every((f) => !f.startsWith('p15h_') || Number.isFinite(snap.flags[f])), 'the saved p15h_ flags are plain numbers');
      G.flags = {}; G.player.inv = G.player.inv.filter((s) => !s.id.startsWith('p15_t_')); H.warm.rem = 0; loadMap('oakhaven', { x: 20.5, y: 20.5, dir: 0 });
      restoreGame(snap);
      check(G.mapId === 'cooper_house', 'back in the house');
      const after = dump();
      check(before.placed === after.placed, 'the pegs: ' + before.placed + ' vs ' + after.placed); check(before.pack === after.pack, 'the pack: ' + before.pack + ' vs ' + after.pack); check(before.flags === after.flags, 'flags: ' + before.flags + ' vs ' + after.flags);
      const pegs = G.map.entities.filter((e) => e._p15h === 'peg'); check(pegs.length === 12, 'twelve pegs after load (' + pegs.length + ')');
      for (const [k, p] of Object.entries(plan)) check(pegs[p] && pegs[p].sprite === 'p15_t_' + T[k].key, 'trophy ' + k + ' is back on mount ' + p);
      check(H.warm.rem > 0 && H.warm.rem <= 77 && H.buffId() === 2, 'the warmth comes back with the save (' + H.warm.rem + ')');
      const old = JSON.parse(JSON.stringify(snapshotGame())); for (const f of Object.keys(old.flags)) if (f.startsWith('p15h_')) delete old.flags[f]; old.player.inv = old.player.inv.filter((s) => !s.id.startsWith('p15_t_'));
      restoreGame(old);
      check(G.player.inv.filter((s) => s.id.startsWith('p15_t_')).length === 8, 'an old save is granted its trophies retroactively (' + G.player.inv.filter((s) => s.id.startsWith('p15_t_')).length + ')');
      check(G.map.entities.filter((e) => e._p15h === 'peg').every((e) => e.sprite === 'p15_peg'), 'nothing is hung until you hang it');
      return out;
    });
    assert.deepEqual(save.fails, [], 'save: ' + save.fails.slice(0, 5));
    console.log('PASS save round-trip: pegs, pack, flags and warmth survive; pegs never enter the save; an old save is granted retroactively');

    // switches off = as before; the Options rows
    await reset();
    const swo = await page.evaluate(() => {
      const H = HEARTH15, out = { fails: [] }, check = (c, m) => { if (!c) out.fails.push(m); };
      G.flags = { wearer_dead: 1 }; H.scanTrophies(true); H.hang(0, 2); loadMap('cooper_house', { x: 6, y: 5, dir: 0 }); window.__calm();
      H.cfg.trophies = false; H.sync(); check(G.map.entities.filter((e) => e._p15h === 'peg').length === 0, 'off: no pegs'); check(H.hang(0, 3) === false, 'off: nothing to hang'); check(H.scanTrophies(true) === 0, 'off: no scan');
      H.cfg.trophies = true; H.sync(); check(G.map.entities.filter((e) => e._p15h === 'peg').length === 12, 'on: the pegs return'); check(G.map.entities.filter((e) => e._p15h === 'peg')[2].sprite === 'p15_t_wearer', 'and what was hung is still hung');
      H.cfg.cook = false; H.sync(); useDeco(G.map.entities.find((e) => e.sprite === 'hearth'));
      check(document.getElementById('event').classList.contains('hidden') || !/Your hearth/.test(document.getElementById('event-panel').textContent), 'cook off: the home hearth is the plain forge');
      try { closeModal(); } catch (e) { /* none */ } G.state = 'play';
      H.cfg.cook = true; H.sync();
      return out;
    });
    assert.deepEqual(swo.fails, [], 'switches: ' + swo.fails);
    await page.evaluate(() => { document.getElementById('event').classList.add('hidden'); G.state = 'panel'; renderAccessibilityMenu(); });
    const opt = await page.evaluate(() => ['p15h-opt-cook', 'p15h-opt-auto', 'p15h-opt-rounds', 'p15h-opt-trophies'].map((id) => !!document.getElementById(id)));
    assert.deepEqual(opt, [true, true, true, true], 'four rows in Options');
    await page.locator('#p15h-opt-auto').click(); assert.equal(await page.evaluate(() => HEARTH15.cfg.auto), true); assert.equal(await page.locator('#p15h-opt-auto').innerText(), 'Automatic');
    await page.locator('#p15h-opt-rounds').click();
    assert.equal(await page.evaluate(() => [HEARTH15.cfg.rounds, JSON.parse(localStorage.getItem('octave.hearth15.v1')).rounds].join()), 'false,false'); assert.equal(await page.locator('#p15h-opt-rounds').getAttribute('aria-pressed'), 'false');
    await page.locator('#p15h-opt-rounds').click(); await page.locator('#p15h-opt-auto').click();
    assert.equal(await page.evaluate(() => [HEARTH15.cfg.rounds, HEARTH15.cfg.auto].join()), 'true,false');
    await page.evaluate(() => { closeModal(); G.state = 'play'; });
    console.log('PASS switches: trophies / cooking off = the game as before; four Options rows, persisted');

    // ================================================================= 7. 640x400
    const small = await boot(browser, { width: 640, height: 400 });
    await small.page.evaluate(() => { GFX.reduceMotion = true; });
    await small.page.evaluate(() => { G.flags = {}; G.day = 4; G.player.gold = 100; G.give('p12_flume_eel'); G.give('p12_hearth_bread'); G.give('p12_moot_curd'); G.give('honey'); G.give('herb_willow'); G.flags.wearer_dead = 1; G.flags.horn_dead = 1; HEARTH15.scanTrophies(true); HEARTH15.hang(0, 1); G.state = 'play'; HEARTH15.openCook('camp'); });
    await small.page.waitForFunction(() => G.openPanel === 'p15h_cook');
    let fz = await fits(small.page); assert(fz.inside && !fz.hscroll && await btnsInside(small.page), 'cook list at 640x400 ' + JSON.stringify(fz));
    await shot(small.page, 'cook-pick-640x400.png');
    await small.page.keyboard.press('1'); await small.page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.marks[0].t; });
    fz = await fits(small.page); assert(fz.inside && !fz.hscroll && await btnsInside(small.page), 'cook beat at 640x400 ' + JSON.stringify(fz)); await shot(small.page, 'cook-beat-640x400.png');
    await small.page.evaluate(() => { const s = HEARTH15.cookUi.s; s.t = s.end - 0.01; }); await small.page.waitForFunction(() => HEARTH15.cookUi.phase === 'done');
    fz = await fits(small.page); assert(fz.inside && !fz.hscroll && await btnsInside(small.page), 'cook done at 640x400 ' + JSON.stringify(fz)); await shot(small.page, 'cook-done-640x400.png');
    await small.page.keyboard.press('Escape'); await small.page.waitForFunction(() => !HEARTH15.cookUi);
    await small.page.evaluate(() => { G.state = 'play'; HEARTH15.openRounds(); }); await small.page.waitForFunction(() => G.openPanel === 'p15h_rounds');
    fz = await fits(small.page); assert(fz.inside && !fz.hscroll && await btnsInside(small.page), 'Rounds list at 640x400 ' + JSON.stringify(fz)); await shot(small.page, 'rounds-pick-640x400.png');
    await small.page.keyboard.press('Enter'); await small.page.waitForFunction(() => HEARTH15.roundsUi.r && !HEARTH15.roundsUi.busy);
    fz = await fits(small.page); assert(fz.inside && !fz.hscroll && await btnsInside(small.page), 'Rounds hand at 640x400 ' + JSON.stringify(fz));
    const cardsIn = await small.page.evaluate(() => { const g = document.querySelector('#game').getBoundingClientRect(); return Array.from(document.querySelectorAll('.p15r-card')).every((b) => { const r = b.getBoundingClientRect(); return r.left >= g.left && r.right <= g.right && r.bottom <= g.bottom + 1 && r.width > 28; }); });
    assert(cardsIn, 'all six cards visible and tappable at 640x400'); await shot(small.page, 'rounds-hand-640x400.png');
    await small.page.keyboard.press('Escape'); await small.page.keyboard.press('Escape'); await small.page.waitForFunction(() => !HEARTH15.roundsUi);
    await small.page.evaluate(() => { G.state = 'panel'; PLAYTOOLS.renderStats(); }); await small.page.waitForSelector('#p7-stats .p15h-stats');
    fz = await fits(small.page); assert(fz.inside && !fz.hscroll, 'Statistics at 640x400 ' + JSON.stringify(fz));
    const statsBtns = await small.page.evaluate(() => { const g = document.querySelector('#game').getBoundingClientRect(); return Array.from(document.querySelectorAll('#modal-panel button')).every((b) => { const r = b.getBoundingClientRect(); return r.bottom <= g.bottom + 1 && r.top >= g.top - 1; }); });
    assert(statsBtns, 'Statistics buttons stay on screen at 640x400'); await shot(small.page, 'stats-640x400.png');
    await small.page.evaluate(() => { closeModal(); G.state = 'play'; });
    console.log('PASS 640x400: cooking (list, beat, done), Rounds (list, hand with six cards) and Statistics fit without horizontal overflow');
    assert.deepEqual(small.errors, [], 'no page errors (640x400): ' + small.errors);

    assert.deepEqual(errors, [], 'no page errors: ' + errors);
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e.message || e); process.exit(1); });
