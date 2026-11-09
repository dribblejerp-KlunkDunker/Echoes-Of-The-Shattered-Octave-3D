// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/festivals12.test.js
// Phase 12 festivals: the Last Sheaf (decor, notice, side quest), the Rite as a false festival, the Eel-Run, the Drowned
// Lanterns. Uses the managed preview; never starts a server. SHOTS=<dir> writes screenshots there.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Fest Tester');
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
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/festivals12.js*', r => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  return { page, errors };
}
// run the module's per-frame work (not the whole game) for a number of seconds
const ticks = (page, secs, dt) => page.evaluate(([secs, dt]) => { const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { G.time = (G.time || 0) + dt; FESTIVALS12.tick(dt); } return n; }, [secs, dt || 0.1]);
const setClock = (page, day, tod, flags) => page.evaluate(([day, tod, flags]) => { G.day = day; G.tod = tod; Object.assign(G.flags, flags || {}); if (G.mapId !== 'oakhaven' && !(flags && flags.__stay)) loadMap('oakhaven'); FESTIVALS12.syncCurrent(); }, [day, tod, flags]);
const mine = (page) => page.evaluate(() => G.map.entities.filter(e => e._p12f).map(e => e._p12f));
// the world's identity: what stands where (props, fixtures) and who is there (people, creatures: by kind, not by where they have wandered to)
const sig = (page) => page.evaluate(() => JSON.stringify(G.map.entities.map(e => (e.kind === 'npc' || e.kind === 'enemy' || /^kestrel/.test(e.sprite || '')) ? [e.kind, e.id || '', (e.sprite || '').replace(/_m\d+$/, '')] : [e.kind, e.id || '', e.sprite || '', +e.x.toFixed(2), +e.y.toFixed(2)]).sort()));
const flagSig = (page) => page.evaluate(() => JSON.stringify(Object.keys(G.flags).filter(k => k.indexOf('p12f_') !== 0).sort().map(k => [k, G.flags[k]])));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    // ---------------------------------------------------------------- loaded, text, items
    const base = await pg.evaluate(() => ({ has: typeof FESTIVALS12, on: FESTIVALS12.cfg.on, n: FESTIVALS12.TEXTS.length, items: Object.keys(ITEMS).filter(k => k.startsWith('p12_')), npcs: ['p12_baker', 'p12_dunna', 'p12_herald'].every(k => NPCS[k]), flags: Object.keys(G.flags).filter(k => k.startsWith('p12f_')),
      noEmoji: FESTIVALS12.TEXTS.every(t => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)), noNumeralDate: FESTIVALS12.TEXTS.every(t => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)) }));
    check(base.has === 'object' && base.on === true, 'FESTIVALS12 exists and the switch is on by default');
    check(base.n > 90 && base.noEmoji && base.noNumeralDate, 'all registered text is non-empty, emoji-free, no numeral dates (' + base.n + ' strings)');
    check(['p12_hearth_bread', 'p12_cider', 'p12_moot_curd', 'p12_flume_eel', 'p12_sheaf_figure'].every(k => base.items.includes(k)) && base.npcs, 'p12_ items and the three people are registered');
    check(base.flags.length === 0, 'a fresh game has no p12f_ flags (nothing is written until the festival is touched)');
    const vocab = await pg.evaluate(() => FESTIVALS12.TEXTS.filter(t => /\b(screams?|screamed)\b/i.test(t)).length);
    check(vocab === 0, 'no text has anybody scream');

    // French: every registered string has a pair in tools/i18n/p12-festivals.tsv, with the same placeholders
    const fs = require('fs'), path = require('path');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p12-festivals.tsv'), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
    const pairs = new Map(tsv.map(r => [r[0], r[1]]));
    const texts = await pg.evaluate(() => FESTIVALS12.TEXTS);
    const noFr = texts.filter(t => !pairs.get(t));
    const badPh = texts.filter(t => pairs.get(t) && JSON.stringify((t.match(/\{\d+\}/g) || []).sort()) !== JSON.stringify((pairs.get(t).match(/\{\d+\}/g) || []).sort()));
    check(noFr.length === 0 && badPh.length === 0 && tsv.every(r => r.length === 2), 'every registered string has a French pair with the same placeholders (' + noFr.length + ' missing, ' + badPh.length + ' bad)');
    check(!tsv.some(r => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow)\b/.test(r[1])), 'the French follows the glossary terms');
    // the Sheaf Song: sixteen notes, one to a beat, and humming it without audio is harmless
    const song = await pg.evaluate(() => ({ n: FESTIVALS12.SONG.length, ok: FESTIVALS12.SONG.every(f => f > 300 && f < 700), hum: (() => { try { return typeof FESTIVALS12.humSong(0.01); } catch (e) { return String(e); } })() }));
    check(song.n === 16 && song.ok && song.hum === 'boolean', 'the Sheaf Song is sixteen notes in range and humming it never throws (' + JSON.stringify(song) + ')');
    const hum = await pg.evaluate(() => { G.day = 2; G.tod = 0.6; loadMap('tavern'); FESTIVALS12.state.humT = 0; FESTIVALS12.state.said = {}; G.state = 'play'; const t0 = FESTIVALS12.state.humT; FESTIVALS12.tick(0.1); return [t0, FESTIVALS12.state.humT]; });
    check(hum[1] > 30, 'in the tavern, while the Sheaf is being prepared, the hum is scheduled again after a verse (' + hum[1].toFixed(1) + ')');
    await pg.evaluate(() => { loadMap('oakhaven'); });

    // ---------------------------------------------------------------- the schedule: pure function of the day, the hour and the flags
    const sched = await pg.evaluate(() => { const F = FESTIVALS12, o = {};
      o.d = [0, 1, 2, 3, 4, 9].map(d => F.phaseOf(d, {}));
      o.rite = F.phaseOf(3, { rite_started: true }); o.riteReady = [F.phaseOf(9, { rite_ready: true }), F.phaseOf(10, { rite_ready: true })];
      o.gone = ['greening', 'escaped', 'part3'].map(k => F.phaseOf(5, { [k]: true, rite_started: true }));
      o.dead = [3.9 / 24, 4 / 24, 5.9 / 24, 6 / 24].map(t => F.isDeadHour(t));
      o.eel = [[6, 0.81], [6, 0.9], [7, 0.1], [7, 0.3], [5, 0.9], [8, 0.1]].map(a => F.isEelNight(a[0], a[1]));
      F.cfg.on = false; o.off = F.phaseOf(3, {}); F.cfg.on = true;
      return o; });
    check(JSON.stringify(sched.d) === JSON.stringify(['early', 'early', 'prep', 'prep', 'post', 'post']), 'schedule by day: early, early, prep (2-3), post (4+) ' + JSON.stringify(sched.d));
    check(sched.rite === 'rite' && sched.riteReady[0] === 'post' && sched.riteReady[1] === 'rite', 'the Rite phase follows the quest flags (rite_started; rite_ready and day 10)');
    check(sched.gone.every(x => x === 'gone'), 'the Greening, the escape and the Third Part end the festivals: ' + JSON.stringify(sched.gone));
    check(JSON.stringify(sched.dead) === '[false,true,true,false]', 'the dead hour is 04:00 to 06:00');
    check(JSON.stringify(sched.eel) === '[false,true,true,false,false,false]', 'the Eel-Run night is evening of day 6 to before dawn of day 7: ' + JSON.stringify(sched.eel));
    check(sched.off === 'off', 'switched off, the phase is off');

    // ---------------------------------------------------------------- the Last Sheaf, preparing: day 2 and 3
    await setClock(pg, 1, 0.45); let k = await mine(pg);
    check(!k.includes('gate') && !k.includes('table') && !k.some(x => x.startsWith('bunt')), 'day 1: no sheaf, no bunting, no table');
    check(k.includes('stand'), 'the north field and its last stand are there from the start');
    await setClock(pg, 2, 0.45); k = await mine(pg);
    check(k.includes('gate') && k.filter(x => x.startsWith('bunt')).length === 8 && k.includes('table') && k.includes('baker'), 'day 2 by day: sheaf on the gate, bunting, harvest table and baker');
    const np = await pg.evaluate(() => G.map.entities.filter(e => e._p12f && e.kind === 'deco' && !e.use && e.nopick !== true && e._p12f !== 'table').map(e => e._p12f)); check(np.length === 0, np.join() + ' pure decor is nopick (the readable table, a solid prop in the square, aside): it can never intercept the gate door or a door');
    await setClock(pg, 2, 0.9); k = await mine(pg);
    check(!k.includes('table') && !k.includes('baker') && k.includes('gate'), 'the table and baker are a daytime thing; the sheaf stays at night');
    await setClock(pg, 3, 0.45);
    const shop = await pg.evaluate(() => { const b = G.map.entities.find(e => e.id === 'p12_baker'); const n = NPCS.p12_baker; G.player.gold = 100; return { has: !!b, sells: n.shop.map(s => s.item), cons: ['p12_hearth_bread', 'p12_cider', 'p12_moot_curd', 'p12_flume_eel'].map(i => itemCat(i)) }; });
    check(shop.has && shop.sells.slice(0, 3).join() === 'p12_hearth_bread,p12_cider,p12_moot_curd', 'the baker sells hearth bread, cider and moot-curd (first; Phase 22 adds her mutton pies after them)');
    // eating: small buffs
    const food = await pg.evaluate(() => { const o = {}; const p = G.player; ['p12_hearth_bread', 'p12_cider', 'p12_moot_curd', 'p12_flume_eel'].forEach(id => { p.hp = 5; p.voice = 3; p.fat = 5; G.give(id); const before = [p.hp, p.voice, p.fat, G.count(id)]; const slot = p.inv.find(s => s.id === id); useItem(slot); o[id] = [p.hp - before[0], p.voice - before[1], p.fat - before[2], before[3] - G.count(id)]; }); return o; });
    check(food.p12_hearth_bread[0] === 12 && food.p12_hearth_bread[3] === 1 && food.p12_cider[1] === 10 && food.p12_moot_curd[0] === 6 && food.p12_flume_eel[0] === 14, 'the food items heal what their text says and are used up: ' + JSON.stringify(food));
    // townsfolk
    const folk = await pg.evaluate(() => { const o = { prep: new Set() }; for (let i = 0; i < 24; i++) { const e = { id: 'townsman', x: 10 + i * 1.7, y: 20 + (i % 5), homeX: 10 + i * 1.7, homeY: 20 + (i % 5) }; const l = FESTIVALS12.folkLine(e); if (l) o.prep.add(l); } o.n = o.prep.size; o.ok = [...o.prep].every(l => FESTIVALS12.TX.sheaf.folkPrep.includes(l)); return { n: o.n, ok: o.ok }; });
    check(folk.n >= 3 && folk.ok, 'townsfolk have Last Sheaf lines in the prep window (' + folk.n + ' distinct)');
    // the Gazette
    const gaz = await pg.evaluate(() => { STORYRUM.readGazette(); const t = document.querySelector('#event')?.textContent || document.body.textContent; return t.includes(FESTIVALS12.TX.sheaf.gazettePrep); });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    check(gaz, 'the Synod Gazette prints the prep line (agricultural customs are tolerated)');
    check(await pg.evaluate(() => G.state === 'play'), 'Escape puts the Gazette down');

    // ---------------------------------------------------------------- the postponement: day 4
    await setClock(pg, 4, 0.45); k = await mine(pg);
    check(k.includes('gate') && k.includes('notice') && !k.some(x => x.startsWith('bunt')) && !k.includes('table'), 'day 4: the notice is nailed up, the bunting is down, the sheaf stays on the gate');
    const notice = await pg.evaluate(() => { const e = G.map.entities.find(e => e._p12f === 'notice'); useDeco(e); const t = (document.querySelector('#event') || document.body).textContent; const r = t.includes('Notice will be given'); (document.querySelector('#event .hd-choices button') || document.querySelector('#event button'))?.click(); G.state = 'play'; return { r, use: e.use, nopick: e.nopick }; });
    check(notice.r && notice.use === 'p12f_notice' && notice.nopick === false, 'the notice can be read');
    const gaz2 = await pg.evaluate(() => { STORYRUM.readGazette(); return (document.querySelector('#event') || document.body).textContent.includes(FESTIVALS12.TX.sheaf.gazettePost); });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    check(gaz2, 'the Gazette prints the postponement');
    // sheaf entry message
    const entry = await pg.evaluate(() => new Promise(res => { document.querySelector('#msgs').innerHTML = ''; FESTIVALS12.state.said = {}; FESTIVALS12.sayEntry('oakhaven'); setTimeout(() => res(document.querySelector('#msgs').textContent), 3300); }));
    check(entry.includes('Church notice'), 'entering Oakhaven after the postponement says the notice is up');

    // ---------------------------------------------------------------- the side quest: Harrow
    await pg.evaluate(() => { NPCS.harrow.quest(G); });   // Harrow's own business first: the Cantor's word
    const harrow = await pg.evaluate(() => { const o = {}; G.flags.p12f_q = 0; const r = NPCS.harrow.quest(G); o.offer = !!(r && r.choices && r.choices.length === 2); o.askAfter = G.flags.p12f_ask; r.choices[1].f(); o.q1 = G.flags.p12f_q | 0;
      const r2 = NPCS.harrow.quest(G); o.reoffer = r2 && r2.text === FESTIVALS12.TX.harrow.reoffer;
      const n0 = G.journal.length; const t = r2.choices[0].f(); o.q2 = G.flags.p12f_q; o.j = G.journal.length - n0; o.jt = G.journal[0].text; o.accept = t === FESTIVALS12.TX.harrow.accept;
      const r3 = NPCS.harrow.quest(G); o.waiting = r3 && r3.text === FESTIVALS12.TX.harrow.waiting; return o; });
    check(harrow.offer && harrow.askAfter === 1 && harrow.q1 === 0, 'Harrow offers the Sheaf after the postponement; declining writes no quest state: ' + JSON.stringify(harrow));
    check(harrow.reoffer && harrow.q2 === 1 && harrow.j === 1 && /dead hour/.test(harrow.jt) && harrow.accept && harrow.waiting, 'he offers again; accepting sets p12f_q to 1, adds one journal line and he then says the north field, the dead hour');
    // the main quest is untouched: Harrow's own gate dialogue still comes first
    const ownFirst = await pg.evaluate(() => { const f = JSON.stringify(G.flags); delete G.flags.met_harrow; G.flags.need_gate = true; const r = NPCS.harrow.quest(G); const first = r && /Cantor sent for|gate/i.test(r.text); G.flags = JSON.parse(f); return !!first; });
    check(ownFirst, 'Harrow\'s own gate business still comes before the Sheaf (his quest function runs first)');

    // ---------------------------------------------------------------- the crew at the dead hour
    await setClock(pg, 4, 0.5); k = await mine(pg);
    check(!k.includes('dunna') && !k.some(x => x.startsWith('crew')), 'in the day the north field has no crew');
    await setClock(pg, 5, 5 / 24); k = await mine(pg);
    check(k.includes('dunna') && k.filter(x => x.startsWith('crew')).length === 4, 'in the dead hour Dunna and four villagers are in the field');
    const quiet = await pg.evaluate(() => { G.noise = 6; const loud = NPCS.p12_dunna.quest(G); G.noise = 1; const q = NPCS.p12_dunna.quest(G); const crew = G.map.entities.find(e => e._crew === 0); return { loud: loud.text === FESTIVALS12.TX.dunna.tooLoud && !loud.choices, quiet: !!(q.choices && q.choices.length === 2), crewClear: !!crew && Math.hypot(crew.x - Engine.cam.x, crew.y - Engine.cam.y) > 0 }; });
    check(quiet.loud && quiet.quiet, 'Dunna will not begin while you are loud, and offers the line when you are quiet');
    const crewWalk = await pg.evaluate(() => G.map.entities.filter(e => e._p12f && e.kind === 'npc').every(e => e.wanderT >= 1e8));
    check(crewWalk, 'the crew stands still (no wander)');
    await shot(pg, 'p12f-field-deadhour');

    // ---------------------------------------------------------------- the cut: the model
    const model = await pg.evaluate(() => { const F = FESTIVALS12, o = {};
      const run = (grades, opts) => { const c = F.newCut(opts || {}); for (let i = 0; i < 16; i++) { const g = grades[i % grades.length]; const off = g === 'perfect' ? 0 : g === 'good' ? 0.2 : 0.4; const to = c.beats[i].t + off; c.step(to - c.t); c.press(); if (c.over) break; } for (let i = 0; i < 6 && !c.over; i++) c.step(0.4); return c; };
      let c = run(['perfect']); o.clean = [c.result, c.landed, c.din.toFixed(2)];
      c = run(['good']); o.good = [c.result, c.landed];
      c = run(['ragged']); o.ragged = [c.result, c.landed];
      c = F.newCut({}); c.step(-c.t + 0.3); for (let i = 0; i < 9; i++) { c.press(); c.step(0.1); } o.stray = [c.result, c.patrol, c.din.toFixed(2)];
      c = F.newCut({}); for (let i = 0; i < 40; i++) c.step(0.4); o.idle = [c.result, c.landed];
      c = F.newCut({ noise: 8 }); o.startDin = +c.din.toFixed(2);
      const w = F.newCut({ timing: 'wide' }); o.wide = [+w.win.good.toFixed(2), +F.newCut({}).win.good.toFixed(2)];
      const a = F.newCut({ timing: 'auto' }); a.t = a.beats[3].t + 0.3; a.press(); o.autoGrade = a.beats[3].state;
      const cc = F.newCut({}); cc.t = -1; o.countIn = cc.press();
      return o; });
    check(model.clean[0] === 'clean' && model.clean[1] === 16, 'sixteen on-beat cuts end clean and keep the din low: ' + JSON.stringify(model.clean));
    check(model.good[0] === 'clean', 'sixteen good (not perfect) cuts end clean: ' + JSON.stringify(model.good));
    check(model.stray[0] === 'patrol' && model.stray[1] === true, 'a run of stray strokes brings the patrol: ' + JSON.stringify(model.stray));
    check(model.idle[0] === 'ragged' && model.idle[1] === 0, 'doing nothing ends the cut ragged, no patrol: ' + JSON.stringify(model.idle));
    check(model.ragged[0] === 'patrol' || model.ragged[0] === 'ragged', 'all-ragged cutting is patrol or ragged (never clean): ' + JSON.stringify(model.ragged));
    check(model.startDin > 0 && model.startDin <= 1.2, 'a noisy start carries into the din (bounded): ' + model.startDin);
    check(model.wide[0] > model.wide[1] && model.autoGrade === 'good' && model.countIn === null, 'wide timing widens the window, auto timing accepts a near press, the count-in is for listening');

    // ---------------------------------------------------------------- the cut: the panel, keyboard
    await setClock(pg, 5, 5 / 24);
    await pg.evaluate(() => { G.noise = 1; const d = G.map.entities.find(e => e._p12f === 'dunna'); talk(d); });
    check(await pg.evaluate(() => G.state === 'dialogue' && DLG.choices && DLG.choices.length === 2), 'talking to Dunna in the dead hour, quietly, opens a two-choice dialogue');
    await pg.evaluate(() => { document.querySelectorAll('#dialogue button, #dlg-choices button, .dlg-choice').length; });
    await pg.evaluate(() => { DLG.choices[0].f && DLG.choices[0].f(); });
    // the dialogue choice function may be wrapped by the UI; open the cut directly if it did not open
    if (!(await pg.evaluate(() => FESTIVALS12.cutUi.open))) await pg.evaluate(() => { closeModal(); G.state = 'play'; FESTIVALS12.openCut(); });
    await pg.waitForTimeout(150);
    check(await pg.evaluate(() => G.openPanel === 'p12f_cut' && G.state === 'panel'), 'the cut opens as a panel');
    await shot(pg, 'p12f-cut-1280');
    await pg.keyboard.press('Space'); await pg.waitForTimeout(250);
    check(await pg.evaluate(() => FESTIVALS12.cutUi.cur.running), 'Space begins the cut ' + await pg.evaluate(() => JSON.stringify([G.state, G.openPanel, FESTIVALS12.cutUi.open, document.hasFocus(), !!document.querySelector('#f12-cv')])));
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    check(await pg.evaluate(() => !FESTIVALS12.cutUi.open && G.state === 'play' && !G.openPanel && (G.flags.p12f_q | 0) === 1 && !G.flags.p12f_try), 'Escape puts the sickle down: back in play, no flag changed, no punishment');
    // the panel, touch (pointer) and pad
    await pg.evaluate(() => { G.noise = 1; FESTIVALS12.openCut(); });
    await pg.waitForTimeout(100);
    await pg.locator('#f12-cv').dispatchEvent('pointerdown');
    await pg.waitForTimeout(200);
    check(await pg.evaluate(() => FESTIVALS12.cutUi.cur.running), 'a tap on the canvas begins, as a touch would');
    await pg.evaluate(() => { const c = FESTIVALS12.cutUi.cur; const b = c.beats.find(x => !x.state || x.state === 'wait' || x.state === 'pending') || c.beats[c.beats.length - 1]; c.t = b.t;   /* the first beat still to come (an early one may already have passed while the page waited) */ });
    await pg.locator('#f12-go').click();   // the Cut button
    check(await pg.evaluate(() => FESTIVALS12.cutUi.cur.landed >= 1), 'the Cut button lands a cut on the beat ' + await pg.evaluate(() => { const c = FESTIVALS12.cutUi.cur; return JSON.stringify({ t: c.t, b0: c.beats[0], landed: c.landed, running: c.running, missed: c.missed, noise: G.noise, state: G.state }); }));
    await pg.evaluate(() => { let pressed = false; navigator.getGamepads = () => [{ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 1 && pressed, value: 0 })), axes: [0, 0, 0, 0] }]; window.__pad = () => { pressed = true; }; });
    await pg.waitForTimeout(150);     // a frame or two with nothing held (the module reads the pad's resting state first)
    await pg.evaluate(() => window.__pad()); await pg.waitForTimeout(250);
    check(await pg.evaluate(() => !FESTIVALS12.cutUi.open && G.state === 'play'), 'the pad B button puts the sickle down');
    await pg.evaluate(() => { delete navigator.getGamepads; });
    // pad A cuts
    await pg.evaluate(() => { G.noise = 1; FESTIVALS12.openCut(); let a = false; navigator.getGamepads = () => [{ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 0 && a, value: 0 })), axes: [0, 0, 0, 0] }]; window.__a = (v) => { a = v; }; });
    await pg.waitForTimeout(150);
    await pg.evaluate(() => window.__a(true)); await pg.waitForTimeout(150);
    check(await pg.evaluate(() => FESTIVALS12.cutUi.cur.running), 'the pad A button begins the cut');
    await pg.evaluate(() => { window.__a(false); FESTIVALS12.cutUi.cur.stopAll(); delete navigator.getGamepads; });
    await pg.waitForTimeout(100);

    // ---------------------------------------------------------------- the cut: a patrol (abandoned by noise), then success, once
    await pg.evaluate(() => { G.noise = 1; FESTIVALS12.openCut(); });
    await pg.evaluate(() => { const c = FESTIVALS12.cutUi.cur; c.running = false; document.getElementById('f12-go').click(); });
    await pg.waitForTimeout(100);
    const patrol = await pg.evaluate(async () => { const c = FESTIVALS12.cutUi.cur; for (let i = 0; i < 12 && !c.over; i++) { c.t = 20; c.doCut(); } await new Promise(r => setTimeout(r, 300));
      const m = G.map; return { result: c.result, tryFlag: G.flags.p12f_try, day: G.day, q: G.flags.p12f_q, state: G.state, crew: m.entities.filter(e => e._p12f === 'dunna' || (e._p12f || '').startsWith('crew')).length, patrol: m.entities.filter(e => e._p12f === 'patrol').length, inv: G.count('p12_sheaf_figure'), hp: G.player.hp > 0, fig: G.flags.p12f_hung | 0, text: (document.querySelector('#event')?.textContent || '').includes('Another night') }; });
    check(patrol.result === 'patrol' && patrol.tryFlag === patrol.day + 1 && patrol.q === 1 && patrol.crew === 0 && patrol.patrol === 2 && patrol.inv === 0 && patrol.text, 'too loud: a patrol walks the hedge-lane, the crew goes home, the quest stays open, nothing is lost: ' + JSON.stringify(patrol));
    await pg.evaluate(() => { (document.querySelector('#event .hd-choices button') || document.querySelector('#event button'))?.click(); G.state = 'play'; });
    await shot(pg, 'p12f-patrol');
    await ticks(pg, 30, 0.5);
    check(await pg.evaluate(() => !G.map.entities.some(e => e._p12f === 'patrol')), 'the patrol is gone again within the half minute');
    check(!(await pg.evaluate(() => FESTIVALS12.crewOn())), 'the crew stays away for the rest of that dead hour');
    await setClock(pg, 6, 5 / 24); check(await pg.evaluate(() => FESTIVALS12.crewOn()), 'the next night the crew is back');
    // success
    await pg.evaluate(() => { G.noise = 1; FESTIVALS12.openCut(); document.getElementById('f12-go').click(); });
    await pg.waitForTimeout(80);
    const win = await pg.evaluate(async () => { const c = FESTIVALS12.cutUi.cur, F = FESTIVALS12; const rep0 = G.player.factions && G.player.factions.hedge, xp0 = G.player.xp;
      for (let i = 0; i < 16; i++) { c.t = c.beats[i].t; c.doCut(); c.din = Math.max(0, c.din - 0.4); }
      c.t = c.beats[15].t + 0.5; await new Promise(r => setTimeout(r, 400));
      const o = { q: G.flags.p12f_q, fig: G.count('p12_sheaf_figure'), bread: G.count('p12_hearth_bread'), cider: G.count('p12_cider'), rep: (G.player.factions && G.player.factions.hedge) - (rep0 || 0), xp: G.player.xp - xp0, j: G.journal[0].text.includes('Dunna Sedge plaited'), ev: (document.querySelector('#event')?.textContent || '').includes('This one stays cut') };
      (document.querySelector('#event .hd-choices button') || document.querySelector('#event button'))?.click(); G.state = 'play';
      F.finishCut(); F.finishCut(); o.again = G.count('p12_sheaf_figure'); return o; });
    check(win.q === 2 && win.fig === 1 && win.bread >= 1 && win.cider >= 1 && win.ev && win.j, 'a clean cut: quest done, the sheaf-figure, a loaf, a jug, the scene and the journal line: ' + JSON.stringify(win));
    check(win.rep === 5 && win.xp >= 40 && win.again === 1, 'a small Hedge standing bump (5), 40 xp, paid exactly once: ' + JSON.stringify([win.rep, win.xp, win.again]));
    k = await mine(pg);
    check(k.some(x => x.startsWith('stook')) && !k.includes('stand'), 'the north field now has stooks and no standing stand');
    check(!(await pg.evaluate(() => FESTIVALS12.crewOn())), 'once cut, the crew does not come again');
    // the figure hangs on the gate
    const hang = await pg.evaluate(() => { const f = FESTIVALS12; const slot = G.player.inv.find(s => s.id === 'p12_sheaf_figure'); Engine.cam.x = 50; Engine.cam.y = 40; useItem(slot); const far = G.count('p12_sheaf_figure') === 1 && !G.flags.p12f_hung; Engine.cam.x = 23.5; Engine.cam.y = 4; useItem(slot); return { far, hung: G.flags.p12f_hung, gone: G.count('p12_sheaf_figure'), ent: G.map.entities.some(e => e._p12f === 'gatefig') }; });
    check(hang.far && hang.hung === 1 && hang.gone === 0 && hang.ent, 'the figure only hangs near the Hedge-gate, then shows beside the sheaf');
    // Harrow afterwards
    const hd = await pg.evaluate(() => { const r = NPCS.harrow.quest(G); return r && r.text === FESTIVALS12.TX.harrow.done; });
    check(hd, 'Harrow says the one closing line once it is cut');

    // ---------------------------------------------------------------- decline, miss it, and the Greening closing it
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; G.flags.met_harrow = true; });
    await setClock(pg, 5, 0.5, {});
    const closure = await pg.evaluate(() => { const F = FESTIVALS12, o = {};
      NPCS.harrow.quest(G).choices[0].f(); o.q = G.flags.p12f_q;
      G.flags.greening = true; F.tick(0.6); F.tick(0.6); F.tick(0.6);
      o.q2 = G.flags.p12f_q; o.j = G.journal.filter(j => j.text === F.TX.harrow.jClosed).length; F.tick(1); o.j2 = G.journal.filter(j => j.text === F.TX.harrow.jClosed).length;
      return o; });
    check(closure.q === 1 && closure.q2 === 3 && closure.j === 1 && closure.j2 === 1, 'the Greening before the cut closes the quest once, with the one journal line: ' + JSON.stringify(closure));
    const green = await pg.evaluate(() => { G.day = 6; G.tod = 0.5; buildAllMaps && 0; loadMap('oakhaven'); FESTIVALS12.syncCurrent(); const m = G.map; return { stand: m.entities.some(e => e._p12f === 'stand'), gate: m.entities.some(e => e._p12f === 'gate'), bunt: m.entities.some(e => (e._p12f || '').startsWith('bunt')), notice: m.entities.some(e => e._p12f === 'notice'), dunna: m.entities.some(e => e._p12f === 'dunna'), label: (m.entities.find(e => e._p12f === 'stand') || {}).label }; });
    check(green.stand && !green.gate && !green.bunt && !green.notice && !green.dunna && green.label === 'The sheaf is still standing in the north field.', 'in the greened Oakhaven the stand still stands, labelled "The sheaf was still standing", and nothing else of the festival is left: ' + JSON.stringify(green));
    const closingLine = await pg.evaluate(() => new Promise(res => { document.querySelector('#msgs').innerHTML = ''; FESTIVALS12.state.said = {}; G.flags.p12f_seen = 1; FESTIVALS12.sayEntry('oakhaven'); setTimeout(() => res(document.querySelector('#msgs').textContent), 3300); }));
    check(closingLine.includes('The sheaf is still standing in the north field.'), 'the closing line is said on entering the greened Oakhaven');
    await shot(pg, 'p12f-greened-field');

    // ---------------------------------------------------------------- the Rite as false festival (presentation only)
    for (const x of ['greening']) await pg.evaluate((x) => { delete G.flags[x]; }, x);
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; });
    await setClock(pg, 10, 0.5, { rite_started: true }); k = await mine(pg);
    check(k.filter(x => x.startsWith('banner')).length === 10 && k.filter(x => x.startsWith('censer')).length === 4 && k.includes('herald') && k.includes('ritenotice') && !k.some(x => x.startsWith('bunt')), 'the Rite: white banners, four censers, a herald and the compulsory notice; no bunting');
    const smoke = await pg.evaluate(() => { Engine.cam.x = 23.5; Engine.cam.y = 26; const f = window.FIRESMOKE; let n = 0; const _s = FIRESMOKE.spawn; FIRESMOKE.spawn = function () { n++; return _s.apply(this, arguments); }; FESTIVALS12.state.accT = 0; for (let i = 0; i < 20; i++) FESTIVALS12.censerSmoke(0.1); FIRESMOKE.spawn = _s; return n; });
    check(smoke >= 6, 'the censers give off smoke through FIRESMOKE (' + smoke + ' puffs in two seconds)');
    const sermon = await pg.evaluate(() => { document.querySelector('#msgs').innerHTML = ''; FESTIVALS12.state.sermonT = 0; for (let i = 0; i < 360; i++) { G.time = (G.time || 0) + 0.1; FESTIVALS12.tick(0.1); } return document.querySelector('#msgs').textContent; });
    check(FESTIVALS12_has(sermon, 'Pure Note') || /Gladness|feast|Rite|Quiet|listening|elsewhere/.test(sermon), 'a sermon line is read out in the square');
    const herald = await pg.evaluate(() => { const e = G.map.entities.find(e => e.id === 'p12_herald'); talk(e); const t = DLG.log.map(l => l.t).join(' '); document.querySelector('#modal-close, #dlg-close') && 0; closeModal(); G.state = 'play'; return t; });
    check(/Rite|festival|Pure Note/.test(herald), 'the herald speaks in the Office voice');
    const rg = await pg.evaluate(() => { STORYRUM.readGazette(); return (document.querySelector('#event') || document.body).textContent.includes('declared a district festival'); });
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    check(rg, 'the Gazette dresses the Rite as a festival');
    await shot(pg, 'p12f-rite-square');
    // the Rite logic untouched: flags written through the Rite window are identical with festivals on and off
    const flagsOn = await pg.evaluate(() => { const before = JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p12f_')).sort().map(k => [k, G.flags[k]])); for (let i = 0; i < 100; i++) { G.time = (G.time || 0) + 0.1; FESTIVALS12.tick(0.1); } const e = G.map.entities.find(e => e.id === 'p12_herald'); talk(e); closeModal(); G.state = 'play'; const after = JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p12f_')).sort().map(k => [k, G.flags[k]])); return [before, after]; });
    check(flagsOn[0] === flagsOn[1], 'the Rite window with festivals on writes no quest flag');
    await pg.evaluate(() => { G.flags.rite_ready = true; });
    check(await pg.evaluate(() => FESTIVALS12.phase() === 'rite'), 'rite_started keeps the Rite presentation on');

    // ---------------------------------------------------------------- the Eel-Run
    await pg.evaluate(() => { for (const k of ['rite_started', 'rite_ready']) delete G.flags[k]; for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; });
    await setClock(pg, 5, 0.9, {}); k = await mine(pg);
    check(!k.some(x => x.startsWith('stake')), 'the night before: no lanterns on the Flume');
    await setClock(pg, 6, 0.9, {}); k = await mine(pg);
    check(k.filter(x => x.startsWith('stake')).length === 8 && k.filter(x => x.startsWith('float')).length >= 6 && k.filter(x => x.startsWith('trapper')).length === 3 && k.filter(x => x.startsWith('trap') && !x.startsWith('trapper')).length === 3, 'Eel-Run night: lanterns on stakes, floating lanterns, three trappers with traps');
    check(await pg.evaluate(() => G.map.entities.filter(e => e._p12f && /^stake/.test(e._p12f)).every(e => e.glow > 0 && e.nopick === true)), 'the stake lanterns glow and cannot be picked');
    await shot(pg, 'p12f-eel-run');
    await setClock(pg, 7, 0.3, {}); check((await mine(pg)).filter(x => x.startsWith('stake')).length === 0, 'by morning the lanterns are gone');
    await setClock(pg, 6, 0.9, {});
    const fish = await pg.evaluate(() => { const F = FESTIVALS12, o = {}; const spot = G.map.entities.find(e => e.use === 'fish_spot'); o.spot = !!spot; Engine.cam.x = spot.x; Engine.cam.y = spot.y + 1.2;
      G.noise = 5; F.state.fish.st = 'idle'; useDeco(spot); o.loudCast = F.state.fish.st;
      G.noise = 1; useDeco(spot); o.cast = F.state.fish.st;
      // quiet through the wait: the bite comes
      G.state = 'play'; let n = 0; while (F.state.fish.st === 'wait' && n++ < 200) { F.tickFish(0.1); } o.bite = F.state.fish.st; o.waitedS = +(n / 10).toFixed(1);
      useDeco(spot); o.haul = G.count('p12_flume_eel'); o.flag = G.flags.p12f_eel; o.after = F.state.fish.st; o.journal = G.journal.filter(j => /Eel-Run/.test(j.text)).length;
      // loud during the wait: startled
      G.noise = 1; useDeco(spot); G.noise = 6; for (let i = 0; i < 6; i++) F.tickFish(0.1); o.startled = F.state.fish.st; o.eels = G.count('p12_flume_eel');
      // walked away
      G.noise = 1; useDeco(spot); Engine.cam.x += 9; F.tickFish(0.1); o.away = F.state.fish.st;
      // missed bite
      Engine.cam.x = spot.x; Engine.cam.y = spot.y + 1.2; G.noise = 1; useDeco(spot); let m = 0; while (F.state.fish.st === 'wait' && m++ < 200) F.tickFish(0.1); for (let i = 0; i < 40 && F.state.fish.st === 'bite'; i++) F.tickFish(0.1); o.missed = F.state.fish.st;
      // the cap
      G.flags.p12f_eel = 6; G.noise = 1; useDeco(spot); o.cap = F.state.fish.st;
      return o; });
    check(fish.spot && fish.loudCast === 'idle' && fish.cast === 'wait', 'eels cannot be cast for while loud; cast quietly begins the wait: ' + JSON.stringify([fish.loudCast, fish.cast]));
    check(fish.bite === 'bite' && fish.waitedS >= 4 && fish.waitedS <= 8, 'a quiet wait ends in a bite after four to eight seconds (' + fish.waitedS + ')');
    check(fish.haul === 1 && fish.flag === 1 && fish.after === 'idle' && fish.journal === 1, 'hauling on the bite gives one run-eel, counts it, and writes the one journal line');
    check(fish.startled === 'idle' && fish.eels === 1, 'noise during the wait startles the eels: nothing is caught');
    check(fish.away === 'idle' && fish.missed === 'idle' && fish.cap === 'idle', 'walking away, a missed bite and the six-eel cap all return to idle with no catch');
    await pg.evaluate(() => { G.day = 9; G.tod = 0.5; });
    const normal = await pg.evaluate(() => { const spot = G.map.entities.find(e => e.use === 'fish_spot'); const before = G.player.inv.length; FESTIVALS12.state.fish.st = 'idle'; Engine.cam.x = spot.x; Engine.cam.y = spot.y + 1.2; G.noise = 6; useDeco(spot); return FESTIVALS12.state.fish.st; });
    check(normal === 'idle', 'outside the Eel-Run night the old fishing spot is the old fishing spot (no quiet-fish state)');

    // ---------------------------------------------------------------- the Drowned Lanterns
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; G.flags.greening = true; G.flags.part3 = true; G.flags.tam_met = true; G.flags.twins_found = true; G.ledger = [{ name: 'Marra Venn', where: 'x', day: 1 }, { name: '<img src=x onerror="window.__pwn=1">', where: 'y', day: 2 }, { name: 'Marra Venn', where: 'z', day: 3 }, { name: '  ', where: 'q', day: 3 }, { name: 'A'.repeat(55), where: 'w', day: 4 }]; G.day = 12; G.tod = 0.9; loadMap('whispergrove'); });
    await pg.waitForTimeout(200);
    const dl = await pg.evaluate(() => ({ dl: G.flags.p12f_dl, night: FESTIVALS12.lanternNight(), ents: G.map.entities.filter(e => e._p12f).map(e => e._p12f), mapId: G.mapId }));
    check(dl.dl === 13 && dl.night, 'the first night in the Grove after the Greening is the lantern night (p12f_dl = day + 1)');
    check(dl.ents.includes('basket') && dl.ents.filter(x => x.startsWith('wfloat')).length >= 12, 'the basket and the lanterns on the lit water are placed');
    const names = await pg.evaluate(() => FESTIVALS12.lanternNames());
    check(names.includes('Essa, who was Tam\'s') && names.includes('Ned Fenning') && names.includes('Marra Venn'), 'names come from flags and the ledger: ' + JSON.stringify(names));
    check(names.filter(n => n === 'Marra Venn').length === 1 && names.every(n => n.length <= 40 && !/[<>&"`\\]/.test(n)) && !names.includes('A'.repeat(55)), 'names are de-duplicated, capped and stripped of markup characters');
    await pg.evaluate(() => { Engine.cam.x = 22.5; Engine.cam.y = 40.6; G.state = 'play'; const b = G.map.entities.find(e => e._p12f === 'basket'); useDeco(b); });
    await pg.waitForTimeout(150);
    const panel = await pg.evaluate(() => ({ open: G.openPanel, rows: [...document.querySelectorAll('.f12-row')].map(b => b.textContent), imgs: document.querySelectorAll('#modal-panel img').length, pwn: window.__pwn || 0, last: [...document.querySelectorAll('.f12-row')].pop().textContent }));
    check(panel.open === 'p12f_lanterns' && panel.rows.length === names.length + 1 && panel.last === 'For the ones not written down', 'the lantern panel lists the names and ends with the generic "For the ones not written down"');
    check(panel.imgs === 0 && panel.pwn === 0, 'a hostile ledger name makes no element and runs nothing (textContent only)');
    await shot(pg, 'p12f-lanterns-panel');
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
    const set1 = await pg.evaluate(() => ({ n: G.flags.p12f_dls, set: G.map.entities.filter(e => e._p12f === 'set').length, j: G.journal.filter(j => /Court's water rose/.test(j.text)).length, jNames: G.journal.some(j => /Essa|Joss|Marra/.test(j.text) && /rose/.test(j.text)) }));
    check(set1.n === 1 && set1.set === 1 && set1.j === 1 && !set1.jNames, 'Enter sets a lantern for the chosen name; the first one writes a journal line with no name in it');
    await pg.keyboard.press('ArrowDown'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(80);
    check(await pg.evaluate(() => G.flags.p12f_dls === 2 && G.journal.filter(j => /Court's water rose/.test(j.text)).length === 1), 'a second lantern counts but writes no second journal line');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(120);
    check(await pg.evaluate(() => !G.openPanel && G.state === 'play' && !FESTIVALS12.lanternUi.open), 'Escape steps back from the water');
    const drift = await pg.evaluate(() => { const e = G.map.entities.find(e => e._p12f === 'set'); const x0 = e.x, y0 = e.y; for (let i = 0; i < 100; i++) { G.time = (G.time || 0) + 0.1; FESTIVALS12.tickDrift(0.1); } const moved = Math.hypot(e.x - x0, e.y - y0); G.time += 100; FESTIVALS12.tickDrift(0.1); return { moved, gone: e.hidden === true }; });
    check(drift.moved > 0.3 && drift.gone, 'a set lantern floats out and goes out after its minute and a half');
    // the cap and the generic lantern, touch (click)
    const cap = await pg.evaluate(() => { for (let i = 0; i < 30; i++) FESTIVALS12.setLantern(null); return G.map.entities.filter(e => e._p12f === 'set' && !e.hidden).length; });
    check(cap <= 16, 'no more than sixteen lanterns are alive at once (' + cap + ')');
    await pg.evaluate(() => { Engine.cam.x = 22.5; Engine.cam.y = 40.6; for (const e of G.map.entities) if (e._p12f === 'set') { e.hidden = true; e.dead = true; } FESTIVALS12.state.lanterns = []; G.state = 'play'; FESTIVALS12.openLanterns(); });
    await pg.locator('.f12-row').last().click();
    check(await pg.evaluate(() => /not written down/.test(document.querySelector('#msgs').textContent)), 'a click on the generic row sets the generic lantern with its line');
    await pg.keyboard.press('Escape');
    await pg.evaluate(() => { Engine.cam.x = 40; Engine.cam.y = 20; G.state = 'play'; const b = G.map.entities.find(e => e._p12f === 'basket'); useDeco(b); });
    check(await pg.evaluate(() => G.openPanel !== 'p12f_lanterns'), 'too far from the water edge, the basket does not open');
    await pg.evaluate(() => { G.day = 14; G.tod = 0.9; FESTIVALS12.syncCurrent(); });
    check(await pg.evaluate(() => !G.map.entities.some(e => e._p12f === 'basket')), 'only the one night: the next night the water is just water');
    await shot(pg, 'p12f-lanterns-water');
    // the pad drives the lantern panel
    await pg.evaluate(() => { G.day = 12; G.tod = 0.9; FESTIVALS12.syncCurrent(); Engine.cam.x = 22.5; Engine.cam.y = 40.6; for (const e of G.map.entities) if (e._p12f === 'set') e.dead = true; FESTIVALS12.state.lanterns = []; G.state = 'play'; FESTIVALS12.openLanterns(); window.__dp = { 13: false, 0: false, 1: false }; navigator.getGamepads = () => [{ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!window.__dp[i], value: 0 })), axes: [0, 0, 0, 0] }]; });
    await pg.waitForTimeout(150);
    await pg.evaluate(() => { window.__dp[13] = true; }); await pg.waitForTimeout(300); await pg.evaluate(() => { window.__dp[13] = false; }); await pg.waitForTimeout(80);
    check(await pg.evaluate(() => [...document.querySelectorAll('.f12-row')].findIndex(b => b.classList.contains('sel')) === 1), 'D-pad down moves the selection ' + await pg.evaluate(() => JSON.stringify({ rows: document.querySelectorAll('.f12-row').length, sel: [...document.querySelectorAll('.f12-row')].findIndex(b => b.classList.contains('sel')), panel: G.openPanel, state: G.state, open: FESTIVALS12.lanternUi && FESTIVALS12.lanternUi.open })));
    await pg.evaluate(() => { window.__dp[1] = true; }); await pg.waitForTimeout(150);
    check(await pg.evaluate(() => G.openPanel !== 'p12f_lanterns' && G.state === 'play'), 'pad B steps back');
    await pg.evaluate(() => { delete navigator.getGamepads; });

    // ---------------------------------------------------------------- saves: round trip, and a hostile save
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; G.flags.p12f_q = 2; G.flags.p12f_eel = 4; G.flags.p12f_hung = 1; loadMap('oakhaven'); });
    const rt = await pg.evaluate(() => { const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); return { q: G.flags.p12f_q, eel: G.flags.p12f_eel, hung: G.flags.p12f_hung, noEnt: !snap.maps.oakhaven || !(snap.maps.oakhaven.entities || []).some(e => e._p12f) }; });
    check(rt.q === 2 && rt.eel === 4 && rt.hung === 1, 'save and load keep the small integers');
    const hostile = await pg.evaluate(() => { const o = {};
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      snap.flags = { p12f_q: 'x', p12f_ask: { a: 1 }, p12f_eel: 1e9, p12f_dl: -5, p12f_dls: 3.5, p12f_try: '7', p12f_hung: true, p12f_seen: [1], p12f_evil: '<img src=x onerror=alert(1)>', p12f_: 1, greening: false };
      restoreGame(snap); const f = G.flags;
      o.keys = Object.keys(f).filter(k => k.startsWith('p12f_')).sort(); o.hung = f.p12f_hung; o.q = FESTIVALS12.fint('p12f_q'); o.eel = FESTIVALS12.fint('p12f_eel'); o.dl = FESTIVALS12.fint('p12f_dl'); o.dls = FESTIVALS12.fint('p12f_dls');
      o.proto = (() => { const s2 = JSON.parse(JSON.stringify(snapshotGame())); s2.flags = JSON.parse('{"__proto__":{"p12f_q":3},"p12f_q":2}'); restoreGame(s2); return [FESTIVALS12.fint('p12f_q'), ({}).p12f_q]; })();
      return o; });
    check(hostile.keys.every(k => ['p12f_hung', 'p12f_seen'].includes(k)) && hostile.hung === 1 && hostile.q === 0 && hostile.eel === 0 && hostile.dl === 0 && hostile.dls === 0, 'a hostile save: bad values dropped, unknown p12f_ keys deleted, a true flag clamped to 1: ' + JSON.stringify(hostile));
    check(hostile.proto[0] === 2 && hostile.proto[1] === undefined, 'a __proto__ in the save flags cannot reach the schedule');
    const safeSched = await pg.evaluate(() => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.p12f_q = 'evil'; G.flags.p12f_eel = NaN; G.day = 6; G.tod = 0.9; G.state = 'play'; try { FESTIVALS12.syncCurrent(); FESTIVALS12.tick(0.1); return true; } catch (e) { return String(e); } });
    check(safeSched === true, 'a bad flag in a running game does not throw');

    // ---------------------------------------------------------------- the switch
    const sw = await pg.evaluate(() => { const o = {}; G.flags = {}; G.day = 4; G.tod = 0.5; loadMap('oakhaven'); FESTIVALS12.syncCurrent(); o.on = G.map.entities.filter(e => e._p12f).length;
      FESTIVALS12.cfg.on = false; FESTIVALS12.syncCurrent(); o.off = G.map.entities.filter(e => e._p12f).length; o.harrow = (() => { G.flags.met_harrow = true; return NPCS.harrow.quest(G); })();
      o.phase = FESTIVALS12.phase(); o.folk = FESTIVALS12.folkLine({ id: 'townsman', x: 10, y: 20 }); o.eelnight = (G.day = 6, G.tod = 0.9, FESTIVALS12.eelNight());
      FESTIVALS12.cfg.on = true; return o; });
    check(sw.on > 10 && sw.off === 0 && sw.harrow === null && sw.phase === 'off' && sw.folk === null && sw.eelnight === false, 'switched off: no props, no people, no quest offer, no lines, no run: ' + JSON.stringify([sw.on, sw.off, sw.harrow, sw.phase, sw.folk, sw.eelnight]));
    // the Options row
    const row = await pg.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); const b = document.getElementById('f12-festivals-opt'); const o = { has: !!b, txt: b && b.textContent, pressed: b && b.getAttribute('aria-pressed') }; if (b) { b.click(); o.off = [FESTIVALS12.cfg.on, localStorage.getItem('octave.festivals12.v1')]; b.click(); o.on = [FESTIVALS12.cfg.on, localStorage.getItem('octave.festivals12.v1')]; } closeModal(); G.state = 'play'; return o; });
    check(row.has && row.txt === 'On' && row.pressed === 'true' && row.off[0] === false && /false/.test(row.off[1]) && row.on[0] === true, 'the Options row "Festivals" exists, defaults On, toggles and persists: ' + JSON.stringify(row));
    await pg.keyboard.press('Escape');

    // ---------------------------------------------------------------- 640x400 fit
    const C = await boot(browser, { width: 640, height: 400 }); allErrors.push(C.errors);
    await setClock(C.page, 5, 5 / 24, { met_harrow: true, p12f_q: 1 });
    await C.page.evaluate(() => { G.noise = 1; FESTIVALS12.openCut(); });
    await C.page.waitForTimeout(150);
    const fitCut = await C.page.evaluate(() => { const p = document.querySelector('#modal-panel').getBoundingClientRect(); const cv = document.querySelector('#f12-cv').getBoundingClientRect(); const mp = document.querySelector('#modal-panel'); const btns = [...document.querySelectorAll('#modal-panel button')].map(b => b.getBoundingClientRect()); return { top: p.top, bottom: p.bottom, left: p.left, right: p.right, vh: innerHeight, vw: innerWidth, sw: mp.scrollWidth, cw: mp.clientWidth, sh: mp.scrollHeight, ch: mp.clientHeight, btnsIn: btns.every(b => b.bottom <= innerHeight && b.right <= innerWidth && b.top >= 0), cvw: cv.width, docW: document.documentElement.scrollWidth }; });
    check(fitCut.top >= 0 && fitCut.bottom <= fitCut.vh && fitCut.left >= 0 && fitCut.right <= fitCut.vw && fitCut.sw <= fitCut.cw + 1 && fitCut.btnsIn && fitCut.docW <= fitCut.vw, 'the cut panel fits 640x400 with no horizontal overflow and its buttons on screen: ' + JSON.stringify(fitCut));
    check(fitCut.sh <= fitCut.ch + 2, 'the cut panel needs no vertical scroll at 640x400 (' + fitCut.sh + ' vs ' + fitCut.ch + ')');
    await shot(C.page, 'p12f-cut-640x400');
    await C.page.keyboard.press('Escape'); await C.page.waitForTimeout(100);
    await C.page.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_')) delete G.flags[k]; G.flags.greening = true; G.flags.part3 = true; G.flags.tam_met = true; G.flags.twins_found = true; G.flags.tobin_417_done = true; G.flags.halder_dead = true; G.flags.rooke_boots = true; G.ledger = Array.from({ length: 12 }, (_, i) => ({ name: 'Ledger Person Number ' + i, where: 'w', day: i })); G.day = 12; G.tod = 0.9; loadMap('whispergrove'); Engine.cam.x = 22.5; Engine.cam.y = 40.6; G.state = 'play'; FESTIVALS12.openLanterns(); });
    await C.page.waitForTimeout(150);
    const fitL = await C.page.evaluate(() => { const mp = document.querySelector('#modal-panel'), p = mp.getBoundingClientRect(); const rows = [...document.querySelectorAll('.f12-row')]; const list = document.querySelector('#f12-list'); const stop = document.querySelector('#f12-stop').getBoundingClientRect(); return { top: p.top, bottom: p.bottom, vh: innerHeight, vw: innerWidth, right: p.right, sw: mp.scrollWidth, cw: mp.clientWidth, n: rows.length, stopIn: stop.bottom <= innerHeight && stop.top >= 0, docW: document.documentElement.scrollWidth, listScroll: list.scrollHeight > list.clientHeight }; });
    check(fitL.top >= 0 && fitL.bottom <= fitL.vh && fitL.right <= fitL.vw && fitL.sw <= fitL.cw + 1 && fitL.stopIn && fitL.docW <= fitL.vw && fitL.n >= 14, 'the lantern panel with a long list fits 640x400; the list scrolls inside, the Step back button stays on screen: ' + JSON.stringify(fitL));
    await shot(C.page, 'p12f-lanterns-640x400');
    await C.page.keyboard.press('Escape');
    // at 640x400 the Rite and the field also render without errors
    await setClock(C.page, 10, 0.5, { rite_started: true, greening: false, part3: false }); await C.page.waitForTimeout(500); await shot(C.page, 'p12f-rite-640x400');

    // ---------------------------------------------------------------- off = identical to a game without the module
    const OFF = await boot(browser, { width: 1280, height: 800 }, { blockModule: true }); allErrors.push(OFF.errors);
    check(await OFF.page.evaluate(() => typeof FESTIVALS12 === 'undefined' || !window.FESTIVALS12), 'baseline page has no module');
    const ONOFF = await boot(browser); allErrors.push(ONOFF.errors);
    await ONOFF.page.evaluate(() => { FESTIVALS12.cfg.on = false; });
    const scenes = [[0, 0.74, {}], [2, 0.45, {}], [3, 0.9, {}], [4, 0.45, { met_harrow: true }], [5, 5 / 24, { p12f_q: 1 }], [6, 0.9, {}], [10, 0.5, { rite_started: true }], [11, 0.5, { greening: true }]];
    let same = true, detail = '';
    for (const [d, t, f] of scenes) {
      for (const P of [OFF.page, ONOFF.page]) { await P.evaluate(([d, t, f]) => { for (const k of Object.keys(G.flags)) if (k.startsWith('p12f_') || ['rite_started', 'greening', 'part3'].includes(k)) delete G.flags[k]; Object.assign(G.flags, f); G.day = d; G.tod = t; loadMap('oakhaven'); }, [d, t, f]); await P.waitForTimeout(120); await P.evaluate(() => { if (window.FESTIVALS12) FESTIVALS12.syncCurrent(); }); }
      const [a, b] = [await sig(OFF.page), await sig(ONOFF.page)];
      if (a !== b) { same = false; const A = JSON.parse(a).map(x => x.join('|')), B = JSON.parse(b).map(x => x.join('|')); detail += ' scene ' + d + '/' + t.toFixed(2) + ' only-without:' + JSON.stringify(A.filter(x => !B.includes(x)).slice(0, 3)) + ' only-off:' + JSON.stringify(B.filter(x => !A.includes(x)).slice(0, 3)); }
    }
    check(same, 'switch off: the Oakhaven entities are the same as in a game without the module in every scene:' + detail);
    // and the grove after the Greening
    for (const P of [OFF.page, ONOFF.page]) await P.evaluate(() => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.part3 = true; G.flags.greening = true; G.day = 12; G.tod = 0.9; loadMap('whispergrove'); });
    await OFF.page.waitForTimeout(150); await ONOFF.page.evaluate(() => FESTIVALS12.syncCurrent());
    check((await sig(OFF.page)) === (await sig(ONOFF.page)), 'switch off: the Grove on the lantern night is the same as without the module');
    check((await ONOFF.page.evaluate(() => Object.keys(G.flags).filter(k => k.startsWith('p12f_')).length)) === 0, 'switch off writes no p12f_ flag');
    // quest logic and dialogue of an existing NPC is the same off as without the module
    const nq = async (P) => P.evaluate(() => { G.flags = {}; G.day = 5; G.tod = 0.5; loadMap('oakhaven'); const a = NPCS.harrow.quest(G); const b = NPCS.harrow.quest(G); return JSON.stringify([a && a.text, b && b.text, Object.keys(G.flags).sort()]); });
    check((await nq(OFF.page)) === (await nq(ONOFF.page)), 'switch off: Harrow says and sets exactly what he did before');
    // frame time with the switch off and on, in a busy scene: per-frame work under about one millisecond
    const perf = await pg.evaluate(() => { const F = FESTIVALS12; F.cfg.on = true; G.flags = { rite_started: true }; G.day = 10; G.tod = 0.5; loadMap('oakhaven'); F.syncCurrent(); G.state = 'play'; Engine.cam.x = 23.5; Engine.cam.y = 23;
      const t0 = performance.now(); for (let i = 0; i < 400; i++) { G.time += 0.016; F.tick(0.016); } const per = (performance.now() - t0) / 400; return { per: +per.toFixed(3) }; });
    check(perf.per < 1.0, 'per-frame work stays under 1 ms in the Rite square (' + perf.per + ' ms)');
    const perfQ = await pg.evaluate(() => { const F = FESTIVALS12; G.flags = {}; G.day = 6; G.tod = 0.9; loadMap('oakhaven'); F.syncCurrent(); G.state = 'play'; const t0 = performance.now(); for (let i = 0; i < 400; i++) { G.time += 0.016; F.tick(0.016); } return +((performance.now() - t0) / 400).toFixed(3); });
    check(perfQ < 1.0, 'per-frame work stays under 1 ms on the Eel-Run night (' + perfQ + ' ms)');
    // sprites are cached once: no per-frame generation
    const spr = await pg.evaluate(() => { const names = ['p12_sheaf', 'p12_sheaf_fig', 'p12_bunting', 'p12_grain_big', 'p12_stook', 'p12_table', 'p12_banner', 'p12_censer', 'p12_stake_lantern', 'p12_lantern_float', 'p12_trap', 'p12_basket']; const a = names.map(n => Engine.sprites[n]); FESTIVALS12.syncCurrent(); for (let i = 0; i < 30; i++) FESTIVALS12.tick(0.1); return names.every((n, i) => Engine.sprites[n] === a[i] && a[i] && a[i].w > 0); });
    check(spr, 'the procedural stand-in sprites are made once and cached');
  } catch (e) {
    fails.push('exception: ' + (e && e.stack || e)); console.log('EXCEPTION', e);
  } finally {
    await browser.close();
  }
  const flat = [].concat(...allErrors).filter(Boolean);
  check(flat.length === 0, 'no page errors (' + flat.slice(0, 4).join(' | ') + ')');
  console.log(fails.length ? '\nFAILED ' + fails.length : '\nOK festivals12');
  process.exit(fails.length ? 1 : 0);

  function FESTIVALS12_has(s, t) { return String(s).includes(t); }
})();
