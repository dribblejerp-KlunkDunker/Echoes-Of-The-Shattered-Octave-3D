// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r1release27.test.js
// Release road R1, the blockers before Book One goes on sale. One check per fix:
//   1 the Cooper's Row house is left behind after Part Two, and the mast never replays Part Two's ending;
//   2 the shaft asks before the Rite begins, and lists only threads begun and unfinished;
//   3 the six Sheep-Walk and Hanger quests close, once, when the Reach is left;
//   4 the optional threads are logged as side quests;
//   5 the Year 417 board points where the cairn stands;
//   6 the Red Cloak ends even without Sable;
//   7 the small things (the Boar & Dulcimer, Harrow, the six flags, the missable festivals);
//   8 the README's strongbox count is the game's.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof SHEEPWALK22 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Release Tester');
  await page.locator('#c-next').click();
  await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click();
  await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click();
  await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play');
  // capture events instead of showing them
  await page.evaluate(() => { window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); }; });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);

    // ---------------------------------------------------------------- 1. the house and the mast
    const house = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), out = {};
      G.flags.house_bought = true;
      renderBountyBoard(); const b0 = document.querySelector('#bb-house'); out.before = b0 && !b0.disabled && /Enter Your House/.test(b0.textContent);
      closeModal(); G.state = 'play';
      G.flags.part3 = true;
      renderBountyBoard(); const b1 = document.querySelector('#bb-house'); out.after = b1 && b1.disabled && /Left behind in Oakhaven/.test(b1.textContent);
      const map0 = G.mapId; b1.onclick && b1.onclick(); out.stayed = G.mapId === map0;
      closeModal(); G.state = 'play';
      // the mast: Part Three never replays the Part Two ending
      let ends = 0; const _end = window.ending; window.ending = () => { ends++; };
      loadMap('oakhaven'); const mast = G.map.triggers.find((t) => t.id === 'mast');
      const at = () => { Engine.cam.x = mast.x; Engine.cam.y = mast.y; mast.inside = false; checkTriggers(); };
      G.flags = Object.assign({}, keep, { greening: true, part3: true }); at(); out.p3 = ends;
      G.flags = Object.assign({}, keep, { greening: true }); at(); out.p2 = ends;
      window.ending = _end; G.flags = keep; G.state = 'play';
      return out;
    });
    check(house.before && house.after && house.stayed, '1: the noticeboard offers the house in Part Two and shows it left behind once Part Three begins: ' + JSON.stringify(house));
    check(house.p3 === 0 && house.p2 === 1, '1: the mast replays nothing in Part Three, and still ends Part Two after the Greening');

    // ---------------------------------------------------------------- 2. the shaft asks first
    const shaft = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), out = {};
      loadMap('quarry'); window.__ev.length = 0;
      G.flags = Object.assign({}, keep, { tam_met: true, crates_heard: true, vane_told: true, p12f_q: 1 });
      const portal = { map: 'rootvault', useSpawn: true };
      transfer(portal);
      const e = window.__ev[0] || {};
      out.asked = e.t === 'The shaft'; out.started = !!G.flags.rite_started; out.map = G.mapId;
      out.tam = /Old Tam is still waiting/.test(e.b || ''); out.sheaf = /Last Sheaf is still to be cut/.test(e.b || ''); out.vane = /Hetty/.test(e.b || '');
      out.choices = (e.c || []).map((c) => c.t);
      e.c && e.c[1] && e.c[1].f && e.c[1].f();
      out.notYet = !G.flags.rite_started && G.mapId === 'quarry';
      e.c[0].f(); out.down = !!G.flags.rite_started && G.mapId === 'rootvault';
      G.flags = keep; G.riteOk = false; loadMap('oakhaven'); G.state = 'play';
      return out;
    });
    check(shaft.asked && !shaft.started && shaft.map === 'quarry', '2: taking the shaft down asks first and starts nothing');
    check(shaft.tam && shaft.sheaf && !shaft.vane, '2: the warning lists begun, unfinished threads (Tam, the Last Sheaf) and not finished ones (Vane told)');
    check(shaft.notYet && shaft.down && shaft.choices.join('|') === 'Go down.|Not yet.', '2: "Not yet." stays at the top; "Go down." starts the Rite in the Root-vault');

    // ---------------------------------------------------------------- 3. the Sheep-Walk and Hanger close at leaving
    const close = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), jk = G.journal.slice();
      G.flags = Object.assign({}, keep, { p22w_flock: 1, p22w_ram: 2, p22w_fires: 1, p22h_heard: 1, p22h_wool: 2, p22h_kit: 4 });
      G.journal = [];
      loadMap('oakhaven'); const before = G.journal.length;
      G.flags.greening = true; loadMap('oakhaven'); const lines = G.journal.map((j) => j.cat + ':' + j.text);
      loadMap('oakhaven'); const again = G.journal.length;
      const out = { before, n: lines.length, again, lines, flags: ['p22w_flock_closed', 'p22w_ram_closed', 'p22w_fires_closed', 'p22h_hunt_closed', 'p22h_wool_closed', 'p22h_kit_closed'].map((k) => G.flags[k] || 0) };
      G.flags = keep; G.journal = jk; G.state = 'play';
      return out;
    });
    check(close.before === 0, '3: nothing closes while the Reach is still home');
    check(close.n === 4 && close.again === 4 && close.lines.every((l) => l.startsWith('side:')), '3: leaving the Reach writes one side line per begun, unfinished quest, once: ' + close.n + ' then ' + close.again);
    check(close.flags.join(',') === '1,0,1,0,1,1' && close.lines.some((l) => /brought Kit out of Ewe Barrow/.test(l)), '3: a finished quest (the Ram) is left alone, the hunt ends with Kit found, and Kit found but not home gets his own line');

    const hunt = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), jk = G.journal.slice();
      G.flags = Object.assign({}, keep, { p22h_heard: 1, part3: true }); G.journal = [];
      loadMap('oakhaven'); const out = { n: G.journal.length, line: G.journal[0] && G.journal[0].text };
      G.flags = keep; G.journal = jk; return out;
    });
    check(hunt.n === 1 && /Woolwight still hunts/.test(hunt.line), '3: the Woolwight hunt closes on its own when it was only heard');
    // ---------------------------------------------------------------- 4. optional threads are side quests
    const mains = [['js/wilds.js', /journal\('main', '?Lanterns in the Mist|journal\('main', trail/], ['js/data.js', /\['main', 'The Flambeau, Ignatius Crane|journal\('main', 'I gave Kaelen the grey|journal\('main', 'Coda: Kaelen told Lyra/], ['js/grove.js', /journal\('main', 'Under Kaelen\\'s returns/]];
    check(mains.every(([f, re]) => !re.test(src(f))), '4: Lanterns in the Mist, Ignatius, the grey folder and Kaelen telling Lyra are logged as side quests');

    // ---------------------------------------------------------------- 5. the Year 417 board
    const cairn = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags); G.flags.tobin_417_started = true; renderBountyBoard();
      const t = document.querySelector('#bb-tobin').textContent; closeModal(); G.state = 'play'; G.flags = keep;
      const c = G.maps.clearing.entities.find((e) => e.use === 'tobin_cairn');
      return { t, x: c && c.x, w: G.maps.clearing.w };
    });
    check(/western oaks/.test(cairn.t) && !/culvert/.test(cairn.t) && cairn.x < cairn.w / 4, '5: the board sends you to the western oaks, where the cairn stands (x ' + cairn.x + ' of ' + cairn.w + ')');

    // ---------------------------------------------------------------- 6. the Red Cloak without Sable
    const cloak = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), jk = G.journal.slice();
      G.flags = Object.assign({}, keep, { part4: true, sable_with: false }); G.journal = [];
      const q0 = NPCS.aegis_dw.quest(G); const ch = (q0.choices || []).map((c) => c.t);
      const said = q0.choices && q0.choices[0].f(G);
      const q1 = NPCS.aegis_dw.quest(G);
      const out = { ch, kept: !!G.flags.cloak_kept, given: !!G.flags.cloak_given, said: typeof said === 'string', j: G.journal.length, after: !q1.choices };
      G.flags = keep; G.journal = jk; return out;
    });
    check(cloak.ch.length === 2 && cloak.kept && !cloak.given && cloak.said && cloak.j === 1 && cloak.after, '6: without Sable the Aegis can be sat with, which ends the Red Cloak once: ' + JSON.stringify(cloak));

    // ---------------------------------------------------------------- 7. the small things
    check(!/Boar & Bell/.test(src('js/game.js')), '7: no "Boar & Bell" left; Vane\'s bolts are sold at the Boar & Dulcimer');
    const harrow = (src('js/data.js').match(/if \(g\.flags\.need_gate && !g\.flags\.gate_open\)/g) || []).length;
    check(harrow === 1, '7: Harrow has one gate branch, not a duplicate that can never run (' + harrow + ')');
    const all = fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js')).map((f) => src('js/' + f)).join('\n');
    const readsOf = (k) => (all.match(new RegExp('\\b' + k + '\\b(?!\\s*=[^=])', 'g')) || []).length;
    const flagsRead = ['halder_told', 'herald_answered', 'aegis_how', 'hymn_read', 'cat_met'].map((k) => [k, readsOf(k)]);
    check(flagsRead.every(([, n]) => n >= 1) && !/party_plan/.test(all), '7: the six write-only flags are read now, or gone (party_plan): ' + JSON.stringify(flagsRead));
    const fest = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags), d0 = G.day, t0 = G.tod; const said = []; const _m = window.msg; window.msg = (t) => said.push(t);
      delete G.flags.p12f_eelw; G.flags.greening = false;
      G.day = FESTIVALS12.B.EEL_DAY; G.tod = 0.5; FESTIVALS12.tickEelWarn(); FESTIVALS12.tickEelWarn();
      const out = { said: said.filter((t) => /Eel-Run/.test(t)).length, flag: G.flags.p12f_eelw };
      window.msg = _m; G.flags = keep; G.day = d0; G.tod = t0; return out;
    });
    check(fest.said === 1 && fest.flag === 1, '7: the Eel-Run is announced once, on its day, before dusk');
    const halder = await page.evaluate(() => { const keep = Object.assign({}, G.flags); G.flags.halder_done = true; G.flags.halder_told = true; const t = NPCS[Object.keys(NPCS).find((k) => NPCS[k].name && /Halder/.test(NPCS[k].name))].quest(G).text; G.flags = keep; return t; });
    check(/the way he stopped when you told him/.test(halder), '7: telling Halder changes his table afterwards');

    // ---------------------------------------------------------------- 8. the README counts what the game places
    const boxes = await page.evaluate(() => { const maps = buildAllMaps(); let n = 0; for (const id in maps) n += maps[id].entities.filter((e) => e && e.item === 'cache').length; return n; });
    const said = +((src('README.md').match(/(\d+) strongboxes hidden around the world/) || [])[1] || 0);
    check(said === boxes, '8: the README\'s strongbox count matches the game (' + said + ' and ' + boxes + ')');

    // ---------------------------------------------------------------- canon: the Veil memorandum is dated by the Series Bible
    const veil = await page.evaluate(() => LORE_BOOKS.find((b) => b.id === 'bk_veil'));
    check(/c\. 300 SR/.test(veil.title) && !/741 Hz|orderly worker/.test(veil.body), 'canon: the Veil memorandum is c. 300 SR and hints rather than tells');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R1 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
