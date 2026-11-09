// PREVIEW_URL=http://127.0.0.1:3963 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/ledger15.test.js
// Phase 15 LEDGER: paid training, letters of credit, the test console, "Where is..." marks.
// Uses the managed preview; never starts a server. SHOTS=<dir> writes screenshots there. Own seeded RNG stream; no Math.random in the test.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3963';
const SHOTS = process.env.SHOTS || '';

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Ledger Tester');
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
  page.on('console', m => { if ((m.type() === 'error' && !/Failed to load resource/.test(m.text())) || /ledger15:/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/ledger15.js*', r => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  // the page's own seeded stream, with a counter, so a cheat can be shown not to touch it
  await page.addInitScript(() => { let s = 15015; window.__rc = 0; Math.random = () => { window.__rc++; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  return { page, errors };
}
const talkTo = (page, id) => page.evaluate((id) => { const e = G.ents.find(x => x.id === id); if (!e) return false; G.state = 'play'; talk(e); return G.state === 'dialogue' && DLG.ent.id === id; }, id);
const plain = (page) => page.evaluate(() => { try { closeModal(); } catch (e) { /* ignore */ } G.state = 'play'; });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);

    // ---------------------------------------------------------------- loaded, text, items, French
    const base = await pg.evaluate(() => ({ has: typeof LEDGER15, cfg: LEDGER15.cfg, n: LEDGER15.TEXTS.length, items: Object.keys(ITEMS).filter(k => k.startsWith('p15_letter')),
      key: Object.values(ITEMS).filter((_, i) => false).length, keyItem: ['p15_letter_25', 'p15_letter_100', 'p15_letter_500'].map(k => !!ITEMS[k].key), valued: ['p15_letter_25', 'p15_letter_100', 'p15_letter_500'].map(k => ITEMS[k].value != null),
      flags: Object.keys(G.flags).filter(k => k.startsWith('p15l_')),
      noEmoji: LEDGER15.TEXTS.every(t => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)),
      noNumeralDate: LEDGER15.TEXTS.every(t => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)), scream: LEDGER15.TEXTS.filter(t => /\b(screams?|screamed)\b/i.test(t)).length,
      hush: LEDGER15.TEXTS.filter(t => /\bthe Hush (is|looks|feels|sounds|has)\b/i.test(t)).length }));
    check(base.has === 'object' && base.cfg.train && base.cfg.bank && base.cfg.marks && base.cfg.console, 'LEDGER15 exists and all four switches are on by default');
    check(base.n > 100 && base.noEmoji && base.noNumeralDate && base.scream === 0 && base.hush === 0, 'registered text: non-empty, no emoji, no numeral dates, nobody screams, the Hush is not described (' + base.n + ')');
    check(base.items.length === 3 && base.keyItem.every(k => !k) && base.valued.every(v => !v), 'three letter items, not key items (so they ride confiscation and stack), no sale value (so they cannot be sold for gold)');
    check(base.flags.length === 0, 'a fresh game has no p15l_ flags');

    const fs = require('fs'), path = require('path');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p15-ledger.tsv'), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
    const pairs = new Map(tsv.map(r => [r[0], r[1]]));
    const texts = await pg.evaluate(() => LEDGER15.TEXTS);
    const noFr = texts.filter(t => !pairs.get(t));
    const badPh = texts.filter(t => pairs.get(t) && JSON.stringify((t.match(/\{\d+\}/g) || []).sort()) !== JSON.stringify((pairs.get(t).match(/\{\d+\}/g) || []).sort()));
    check(noFr.length === 0 && badPh.length === 0 && tsv.every(r => r.length === 2), 'every registered string has a French pair with the same placeholders (' + noFr.length + ' missing, ' + badPh.length + ' bad)');
    check(!tsv.some(r => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow)\b/.test(r[1])) && !tsv.some(r => /[\u{1F300}-\u{1FAFF}]/u.test(r[1])), 'the French follows the glossary and has no emoji');

    // ---------------------------------------------------------------- 1. TRAINING: the table, exactly
    const tbl = await pg.evaluate(() => { const L = LEDGER15; return {
      sessions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 30].map(L.sessionsAllowed),
      cost: [[15, 1], [25, 0.8], [25, 1.25], [40, 1], [50, 1], [60, 1.2], [80, 1], [100, 1.25]].map(([s, r]) => L.trainCost(s, r)),
      gain: [15, 39, 40, 59, 60, 99].map(L.trainGain) }; });
    check(JSON.stringify(tbl.sessions) === JSON.stringify([1, 1, 2, 2, 3, 3, 3, 4, 4, 4]), 'sessions per level: 1-2 -> 1, 3-4 -> 2, 5-7 -> 3, 8+ -> 4 (' + tbl.sessions + ')');
    // 8 + floor(s^2/40): 15 -> 13; 25 -> 23 (x0.8 = 18, x1.25 = 29); 40 -> 48; 50 -> 70; 60 -> 98 (x1.2 = 118); 80 -> 168; 100 -> 258 (x1.25 = 323)
    check(JSON.stringify(tbl.cost) === JSON.stringify([13, 18, 29, 48, 70, 118, 168, 323]), 'cost = round((8 + floor(skill^2/40)) * rate): ' + tbl.cost);
    check(JSON.stringify(tbl.gain) === JSON.stringify([3, 3, 2, 2, 1, 1]), 'gain by skill: 3 below 40, 2 to 59, 1 from 60 (' + tbl.gain + ')');

    // Old Harrow through the real talk screen
    await pg.evaluate(() => { G.player.level = 1; G.player.gold = 12; G.player.skills.Stealth = 25; });
    check(await talkTo(pg, 'harrow'), 'talk() opens Old Harrow');
    check(await pg.locator('#p15l-train').count() === 1, 'a Train... button is in the dialogue row');
    check(await pg.evaluate(() => document.getElementById('p15l-train').parentElement === document.querySelector('#modal-panel .dlg .btns')), 'the button sits in the talk screen\'s own button row');
    await pg.locator('#p15l-train').click();
    let row = await pg.evaluate(() => { const b = document.querySelector('#d-topics[data-p15l="train"] [data-train]'); return b && { t: b.textContent, purse: document.querySelector('#d-topics .purse').textContent }; });
    check(row && /Stealth/.test(row.t) && /18/.test(row.t) && /sessions used at level 1: 0 of 1/.test(row.purse), 'the lesson row shows the skill and its exact cost 18 (' + JSON.stringify(row) + ')');
    const t0 = await pg.evaluate(() => ({ g: G.player.gold, s: G.player.skills.Stealth, hrs: G.day * 24 + G.tod * 24 }));
    await pg.locator('[data-train]').click();
    const poor = await pg.evaluate(() => ({ g: G.player.gold, s: G.player.skills.Stealth, flags: Object.keys(G.flags).filter(k => k.startsWith('p15l_')) , last: DLG.log[DLG.log.length - 1].t }));
    check(poor.g === t0.g && poor.s === 25 && poor.flags.length === 0, 'too poor: nothing is charged, nothing taught, no flags written (' + JSON.stringify(poor) + ')');
    await shot(pg, 'train-poor');
    await pg.evaluate(() => { G.player.gold = 40; });
    await pg.locator('#p15l-train').click(); await pg.locator('#p15l-train').click();     // off and on: re-render with the new purse
    const h0 = await pg.evaluate(() => G.day * 24 + G.tod * 24);
    await pg.locator('[data-train]').click();
    const done = await pg.evaluate(() => ({ g: G.player.gold, s: G.player.skills.Stealth, hrs: G.day * 24 + G.tod * 24, f: { n: G.flags.p15l_tn, lv: G.flags.p15l_tlv, ts: G.flags.p15l_ts }, last: DLG.log[DLG.log.length - 1].t, log: document.getElementById('msgs') ? '' : '' }));
    check(done.g === 22 && done.s === 28, 'a session costs exactly 18 and raises Stealth 25 -> 28 (gold ' + done.g + ', skill ' + done.s + ')');
    check(Math.abs(done.hrs - h0 - 2) < 0.02, 'a session passes two hours of game time (' + (done.hrs - h0).toFixed(3) + ')');
    check(done.f.n === 1 && done.f.lv === 1 && done.f.ts === 1, 'the session is counted: p15l_tn 1 at level 1 (' + JSON.stringify(done.f) + ')');
    const second = await pg.evaluate(() => { G.player.gold = 500; const r = LEDGER15.train('harrow'); return { r: r.ok, why: r.reason, g: G.player.gold, s: G.player.skills.Stealth }; });
    check(!second.r && second.why === 'limit' && second.g === 500 && second.s === 28, 'a second session at level 1 is refused (limit), costing nothing');
    await pg.locator('#p15l-train').click(); await pg.locator('#p15l-train').click();
    check(await pg.evaluate(() => /No more sessions at this level/.test(document.querySelector('[data-train]').textContent) && document.querySelector('[data-train]').getAttribute('aria-disabled') === 'true'), 'the row says so and is marked disabled for assistive tech');
    // level 3 allows two; the count restarts when the level changes, and the old count is not carried
    const lv = await pg.evaluate(() => { G.player.level = 3; const a = LEDGER15.train('harrow'), b = LEDGER15.train('harrow'), c = LEDGER15.train('harrow');
      return { a: a.ok, b: b.ok, c: c.ok && 1, why: c.reason, s: G.player.skills.Stealth, g: G.player.gold, n: G.flags.p15l_tn, lvf: G.flags.p15l_tlv, ts: G.flags.p15l_ts }; });
    check(lv.a && lv.b && !lv.c && lv.why === 'limit' && lv.n === 2 && lv.lvf === 3 && lv.ts === 3, 'level 3: exactly two sessions, the third refused (' + JSON.stringify(lv) + ')');
    check(lv.s === 34, 'the skill rose by 3 a session: 28 -> 31 -> 34 (' + lv.s + ')');
    // the cap: Harrow can take Stealth to 45 and no further; the last point is a partial gain
    const cap = await pg.evaluate(() => { G.player.level = 9; G.flags.p15l_tn = 0; G.flags.p15l_tlv = 9; G.player.skills.Stealth = 43; G.player.gold = 999;
      const a = LEDGER15.train('harrow'), s1 = G.player.skills.Stealth, b = LEDGER15.train('harrow'); return { a: a.ok, s1, b: b.ok, why: b.reason, s2: G.player.skills.Stealth }; });
    check(cap.a && cap.s1 === 45 && !cap.b && cap.why === 'cap' && cap.s2 === 45, 'the teacher\'s cap holds: 43 -> 45 (a partial gain), then "nothing more to learn" (' + JSON.stringify(cap) + ')');
    // other trainers: the skill that rises is the one named, and the price follows the rate
    const others = await pg.evaluate(() => { const L = LEDGER15, out = {}; G.player.level = 20; G.player.gold = 9999;
      for (const [id, sk] of [['vane', 'Blade'], ['bettany', 'Physician'], ['hob', 'Mercantile']]) { G.flags.p15l_tn = 0; G.flags.p15l_tlv = 20; G.player.skills[sk] = 30; const c = L.trainInfo(id).cost, g = G.player.gold; const r = L.train(id); out[id] = [r.ok, G.player.skills[sk], g - G.player.gold, c]; }
      return out; });
    check(others.vane[0] && others.vane[1] === 33 && others.vane[2] === Math.round((8 + 22) * 1.25), 'Vane teaches Blade for round(30 * 1.25) = 38 (' + others.vane + ')');
    check(others.bettany[0] && others.bettany[1] === 33 && others.bettany[2] === 30, 'Bettany teaches Physician for 30 (' + others.bettany + ')');
    check(others.hob[0] && others.hob[1] === 33 && others.hob[2] === 30, 'Hob teaches Mercantile for 30 (' + others.hob + ')');
    // Law-Song: gated behind the Rite; capped at 60
    const law = await pg.evaluate(() => { const L = LEDGER15; G.player.level = 20; G.player.gold = 9999; G.flags.p15l_tn = 0; G.flags.p15l_tlv = 20;
      for (const k of ['greening', 'escaped', 'part3', 'part4', 'rite_ready', 'rite_started']) delete G.flags[k];
      G.player.skills['Law-Song'] = 40; const pre = L.train('lyra_wg'), preSkill = G.player.skills['Law-Song'], preGold = G.player.gold, preInfo = L.trainInfo('lyra');
      G.flags.rite_started = true; G.flags.rite_ready = true; const mid = L.trainInfo('lyra_wg').reason;
      G.flags.greening = true; G.player.skills['Law-Song'] = 58; const post = L.train('lyra_wg'), s = G.player.skills['Law-Song'], again = L.train('lyra_wg');
      return { pre: pre.ok, preWhy: pre.reason, preSkill, preGold, g: G.player.gold, mid, post: post.ok, s, againWhy: again.reason, oak: preInfo && preInfo.reason }; });
    check(!law.pre && law.preWhy === 'gate' && law.preSkill === 40 && law.preGold === 9999 && law.oak === 'gate', 'Law-Song is refused before the Rite is behind you (gate), in Oakhaven and after (' + JSON.stringify(law) + ')');
    check(law.mid === 'gate', 'being mid-Rite is not enough: only the Greening, escape or later opens it');
    check(law.post && law.s === 60 && law.againWhy === 'cap', 'after the Greening the Cantor teaches (58 -> 60, two points at this level) and then stops at the cap of 60 (' + JSON.stringify(law) + ')');
    await pg.evaluate(() => { for (const k of ['greening', 'rite_started', 'rite_ready']) delete G.flags[k]; delete G.flags.p15l_tn; });
    // keyboard and controller reach the same row; Escape leaves
    await plain(pg);
    await pg.evaluate(() => { G.player.level = 30; G.player.gold = 999; G.player.skills.Stealth = 20; G.flags.p15l_tn = 0; G.flags.p15l_tlv = 30; });
    await talkTo(pg, 'harrow');
    await pg.locator('#p15l-train').focus(); await pg.keyboard.press('Enter');
    check(await pg.locator('[data-train]').count() === 1, 'keyboard: Enter on Train... opens the lesson pane');
    await pg.keyboard.press('1');
    const kb = await pg.evaluate(() => G.player.skills.Stealth);
    check(kb === 23, 'keyboard: the digit 1 takes the first lesson (Stealth 20 -> ' + kb + ')');
    await pg.evaluate(() => {
      window.__pad = { connected: true, buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0] };
      navigator.getGamepads = () => [window.__pad];
    });
    await pg.waitForTimeout(150);
    const press = async (i) => { await pg.evaluate((i) => { window.__pad.buttons[i].pressed = true; }, i); await pg.waitForTimeout(120); await pg.evaluate((i) => { window.__pad.buttons[i].pressed = false; }, i); await pg.waitForTimeout(120); };
    await pg.locator('#p15l-train').focus();
    await press(0);                                               // A on a focused Train... toggles the pane off
    check(await pg.locator('[data-train]').count() === 0, 'controller: A presses the focused button');
    await press(0);
    await press(13);                                              // D-pad down moves focus
    check(await pg.evaluate(() => document.activeElement && document.activeElement.id !== 'p15l-train'), 'controller: the D-pad moves focus');
    await press(1);                                               // B goes back to the plain talk screen
    check(await pg.evaluate(() => G.state === 'dialogue' && !document.querySelector('[data-p15l]')), 'controller: B returns to the plain dialogue');
    await pg.evaluate(() => { navigator.getGamepads = () => []; });
    await pg.keyboard.press('Escape');
    check(await pg.evaluate(() => G.state === 'play'), 'Escape leaves the dialogue');
    // off switch
    await pg.evaluate(() => { LEDGER15.cfg.train = false; });
    await talkTo(pg, 'harrow');
    check(await pg.locator('#p15l-train').count() === 0 && await pg.evaluate(() => LEDGER15.trainInfo('harrow').reason === 'off' && !LEDGER15.train('harrow').ok), 'switch off: no Train... button and no training');
    await plain(pg); await pg.evaluate(() => { LEDGER15.cfg.train = true; });

    // ---------------------------------------------------------------- 2. LETTERS OF CREDIT
    const enc = await pg.evaluate(() => ({ w: ['p15_letter_25', 'p15_letter_100', 'p15_letter_500'].map(k => ITEM_WEIGHTS[k]), face: ['p15_letter_25', 'p15_letter_100', 'p15_letter_500', 'p15_letter_7', 'p15_letter_', 'sword'].map(LEDGER15.faceOf), icon: ['p15_letter_25', 'p15_letter_100', 'p15_letter_500'].every(k => !!ICONS.TABLE[k]),
      pay: [[25, 5], [100, 5], [500, 5], [25, 15], [100, 15], [500, 15], [25, 25], [100, 25], [500, 25]].map(([f, p]) => LEDGER15.payout(f, p)) }));
    check(JSON.stringify(enc.face) === '[25,100,500,0,0,0]', 'only the three faces are letters (a made-up id is not)');
    check(JSON.stringify(enc.pay) === '[23,95,475,21,85,425,18,75,375]', 'payouts: 23/95/475 at 5%, 21/85/425 at 15%, 18/75/375 at 25% (' + enc.pay + ')');
    check(enc.icon, 'each letter has an icon');
    // the clerk is in the Greenhall
    await pg.evaluate(() => { loadMap('greenhall'); });
    await pg.waitForTimeout(200);
    const gh = await pg.evaluate(() => { const m = G.map; return { clerk: m.entities.filter(e => e.id === 'p15l_clerk').length, desk: m.entities.filter(e => e._p15l === 'desk').length, letter: m.entities.filter(e => e._p15l === 'letter' && !e.dead).length,
      transient: m.entities.filter(e => e._p15l).every(e => e.transient === true), npc: !!NPCS.p15l_clerk }; });
    check(gh.clerk === 1 && gh.desk === 1 && gh.letter === 1 && gh.transient && gh.npc, 'Greenhall has the clerk, his desk and one letter on it, all transient (' + JSON.stringify(gh) + ')');
    check(await pg.evaluate(() => { for (let i = 0; i < 5; i++) { LEDGER15.syncCurrent(); loadMap('greenhall'); } return G.map.entities.filter(e => e.id === 'p15l_clerk').length === 1 && G.map.entities.filter(e => e._p15l === 'desk').length === 1; }), 'placing is idempotent: five reloads, still one clerk and one desk');
    check(await talkTo(pg, 'p15l_clerk') && await pg.locator('#p15l-bank').count() === 1, 'the clerk opens a talk screen with a Letters... button');
    await pg.evaluate(() => { G.player.gold = 1000; });
    await pg.locator('#p15l-bank').click();
    const rows = await pg.evaluate(() => ({ draw: Array.from(document.querySelectorAll('[data-draw]')).map(b => b.dataset.draw), cash: document.querySelectorAll('[data-cash]').length, purse: document.querySelector('#d-topics .purse').textContent }));
    check(JSON.stringify(rows.draw) === '["25","100","500"]' && rows.cash === 0 && /1000 sovereigns/.test(rows.purse) && /5%/.test(rows.purse), 'the clerk offers three faces to draw and nothing to cash yet (' + JSON.stringify(rows) + ')');
    const w0 = await pg.evaluate(() => calcCarryWeight());
    await pg.locator('[data-draw="500"]').click(); await pg.locator('[data-draw="100"]').click(); await pg.locator('[data-draw="25"]').click();
    const drawn = await pg.evaluate(() => ({ g: G.player.gold, inv: G.player.inv.filter(s => s.id.startsWith('p15_letter')).map(s => [s.id, s.n]), w: calcCarryWeight() }));
    check(drawn.g === 1000 - 625 && drawn.inv.length === 3, 'drawing costs the face at par: 625 sovereigns for three letters (' + JSON.stringify(drawn) + ')');
    check(Math.abs(drawn.w - w0) < 0.05, 'letters weigh nothing (' + w0 + ' -> ' + drawn.w + ')');
    await shot(pg, 'bank-draw');
    // cash one at 5%, then all
    await pg.locator('[data-cash="100"]').click();
    const c1 = await pg.evaluate(() => ({ g: G.player.gold, lc: G.flags.p15l_lc, fee: G.flags.p15l_fee, held: LEDGER15.heldAll() }));
    check(c1.g === 375 + 95 && c1.lc === 1 && c1.fee === 5 && c1.held === 2, 'cashing a 100 returns 95: the house keeps 5 (' + JSON.stringify(c1) + ')');
    await pg.locator('[data-cash="all"]').click();
    const c2 = await pg.evaluate(() => ({ g: G.player.gold, lc: G.flags.p15l_lc, fee: G.flags.p15l_fee, held: LEDGER15.heldAll(), inv: G.player.inv.filter(s => s.id.startsWith('p15_letter')).length }));
    check(c2.g === 470 + 475 + 23 && c2.lc === 3 && c2.fee === 5 + 25 + 2 && c2.held === 0 && c2.inv === 0, 'cash-all returns 475 + 23: round trip loses exactly the 5% fee, rounded in the house\'s favour (' + JSON.stringify(c2) + ')');
    // no draw/cash sequence at any agent ever pays more than it takes
    const mint = await pg.evaluate(() => { const L = LEDGER15; G.player.gold = 5000; let worst = 0; const start = 5000;
      for (const ag of ['p15l_clerk']) for (const f of [25, 100, 500]) for (let i = 0; i < 4; i++) { L.draw(f, ag); }
      const afterDraw = G.player.gold;
      for (const ag of ['p15l_clerk', 'p15l_veil', 'mags_dw']) { const r = L.cashAll(ag); if (r.ok) worst = Math.max(worst, r.got); break; }
      return { afterDraw, end: G.player.gold, start }; });
    check(mint.end < mint.start && mint.afterDraw === 5000 - 4 * 625, 'draw and cash round trip never mints gold (' + JSON.stringify(mint) + ')');
    // refusals: the others cannot draw; too poor; none held
    const ref = await pg.evaluate(() => { const L = LEDGER15; G.player.gold = 10; return [L.draw(25, 'p15l_clerk').reason, L.draw(25, 'p15l_veil').reason, L.draw(7, 'p15l_clerk').reason, L.cash(25, 'p15l_clerk').reason, L.cash(25, 'nobody').reason, G.player.gold]; });
    check(JSON.stringify(ref) === '["gold","nodraw","face","none","none",10]', 'refusals: too poor, an agent that does not draw, a made-up face, nothing held, no such agent (' + ref + ')');
    await plain(pg);

    // hostile saves: counts clamped, never gold from nothing
    const host = await pg.evaluate(() => {
      const L = LEDGER15, p = G.player; p.gold = 0; p.inv = p.inv.filter(s => !s.id.startsWith('p15_letter'));
      p.inv.push({ id: 'p15_letter_500', n: 1e12 }, { id: 'p15_letter_100', n: -5 }, { id: 'p15_letter_25', n: NaN }, { id: 'p15_letter_500', n: '7' }, { id: 'p15_letter_100', n: 2.9 }, { id: 'p15_letter_25', n: Infinity });
      L.sanitizeLetters();
      const held = [25, 100, 500].map(f => L.held(f)), slots = p.inv.filter(s => s.id.startsWith('p15_letter')).length;
      const r = L.cashAll('p15l_clerk');
      return { held, slots, got: r.got, gold: p.gold, left: L.heldAll() };
    });
    check(host.held[0] === 0 && host.held[1] === 2 && host.held[2] === 99 && host.slots === 2, 'hostile counts are clamped: 1e12 -> 99, negative/NaN/Infinity dropped, 2.9 -> 2, duplicates merged (' + JSON.stringify(host.held) + ')');
    check(host.got === 99 * 475 + 2 * 95 && host.gold === host.got && host.left === 0, 'a hostile stack of 99 cashes for the honest sum and no more (' + host.got + ')');
    const sv = await pg.evaluate(() => {
      const L = LEDGER15; const d = JSON.parse(JSON.stringify(snapshotGame()));
      d.player.inv.push({ id: 'p15_letter_500', n: 1e15 }, { id: 'p15_letter_25', n: 'lots' });
      Object.assign(d.flags, { p15l_cheat: 'yes', p15l_chn: 1e9, p15l_mkO: -1, p15l_tn: 2.5, p15l_bogus: 1, p15l_ts: 7, p15l_desk: true });
      restoreGame(d);
      return { f: Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith('p15l_'))), held: [25, 100, 500].map(L.held) };
    });
    check(sv.held[2] === 99 && sv.held[0] === 0, 'restoring a hostile save clamps the letters');
    check(!('p15l_cheat' in sv.f) && !('p15l_chn' in sv.f) && !('p15l_mkO' in sv.f) && !('p15l_tn' in sv.f) && !('p15l_bogus' in sv.f) && sv.f.p15l_ts === 7 && sv.f.p15l_desk === 1, 'restoring drops out-of-range and unknown p15l_ flags, keeps valid ones (' + JSON.stringify(sv.f) + ')');
    await pg.evaluate(() => { G.player.inv = G.player.inv.filter(s => !s.id.startsWith('p15_letter')); delete G.flags.p15l_ts; delete G.flags.p15l_desk; });

    // theft: the desk letter is owned stock, so taking it goes through the theft panel; arrest holds letters in evidence and gives them back
    await pg.evaluate(() => { loadMap('greenhall'); G.state = 'play'; G.flags.p15l_desk = 0; LEDGER15.syncCurrent(); });
    const theft = await pg.evaluate(() => {
      const e = G.map.entities.find(x => x._p15l === 'letter'); if (!e) return { none: true };
      const own = e.owner, law = lawActive(); pickUp(e);
      return { own, law, panel: G.openPanel, taken: !!e.dead, has: G.count('p15_letter_25') };
    });
    check(!theft.none && theft.own === 'p15l' && theft.law && theft.panel === 'theft' && !theft.taken && theft.has === 0, 'the desk letter is owned: reaching for it opens the theft panel and takes nothing yet (' + JSON.stringify(theft) + ')');
    await pg.locator('#crime-take').click();
    const theft2 = await pg.evaluate(() => ({ has: G.count('p15_letter_25'), thefts: crimeState().thefts }));
    check(theft2.has === 1 && theft2.thefts >= 1, 'taking it anyway is a theft on the books, and the letter is yours (' + JSON.stringify(theft2) + ')');
    await pg.waitForTimeout(700);
    check(await pg.evaluate(() => G.flags.p15l_desk === 1 && !G.map.entities.some(x => x._p15l === 'letter')), 'the desk stays empty afterwards (p15l_desk = 1), even after a reload');
    const arrest = await pg.evaluate(() => { const L = LEDGER15; G.give('p15_letter_500', 2); const before = [L.held(25), L.held(500)]; confiscateGear(); const during = [L.held(25), L.held(500)]; returnEvidence(); return { before, during, after: [L.held(25), L.held(500)] }; });
    check(JSON.stringify(arrest.before) === '[1,2]' && JSON.stringify(arrest.during) === '[0,0]' && JSON.stringify(arrest.after) === '[1,2]', 'an arrest holds letters in evidence and hands them back (' + JSON.stringify(arrest) + ')');
    await pg.evaluate(() => { G.player.inv = G.player.inv.filter(s => !s.id.startsWith('p15_letter')); });

    // after the Greening: the clerk is gone, the letters are not
    await pg.evaluate(() => { G.give('p15_letter_100', 3); G.flags.greening = true; loadMap('greenhall'); });
    await pg.waitForTimeout(200);
    const after = await pg.evaluate(() => ({ clerk: G.map.entities.filter(e => e.id === 'p15l_clerk').length, desk: G.map.entities.filter(e => e._p15l).length, held: LEDGER15.held(100) }));
    check(after.clerk === 0 && after.desk === 0 && after.held === 3, 'after the Greening the Oakhaven clerk and desk are gone; the letters are still held (' + JSON.stringify(after) + ')');
    await pg.evaluate(() => { loadMap('whispergrove'); });
    await pg.waitForTimeout(200);
    const veil = await pg.evaluate(() => ({ n: G.map.entities.filter(e => e.id === 'p15l_veil').length, blocked: (() => { const e = G.map.entities.find(x => x.id === 'p15l_veil'); return e ? G.map.isBlocked(e.x | 0, e.y | 0) : null; })() }));
    check(veil.n === 1, 'in Whisper-Grove the Veil ledger-keeper takes the clerk\'s place');
    check(await talkTo(pg, 'p15l_veil'), 'the ledger-keeper talks');
    await pg.locator('#p15l-bank').click();
    const vr = await pg.evaluate(() => ({ draws: document.querySelectorAll('[data-draw]').length, note: document.querySelector('#d-topics').textContent.includes('does not draw'), purse: document.querySelector('#d-topics .purse').textContent }));
    check(vr.draws === 0 && vr.note && /15%/.test(vr.purse), 'the keeper cashes only, at 15% (' + JSON.stringify(vr) + ')');
    const g0 = await pg.evaluate(() => G.player.gold);
    await pg.locator('[data-cash="100"]').click();
    const g1 = await pg.evaluate(() => ({ g: G.player.gold, held: LEDGER15.held(100) }));
    check(g1.g === g0 + 85 && g1.held === 2, 'a 100 cashes for 85 after the Greening, a worse rate than 95');
    await shot(pg, 'bank-veil');
    await plain(pg);
    // Deep Woods: Mags
    await pg.evaluate(() => { delete G.flags.greening; G.flags.part4 = true; G.flags.part3 = true; loadMap('deepwoods'); });
    await pg.waitForTimeout(200);
    const mags = await talkTo(pg, 'mags_dw');
    if (mags) {
      await pg.locator('#p15l-bank').click();
      const g2 = await pg.evaluate(() => G.player.gold);
      await pg.locator('[data-cash="100"]').click();
      const m = await pg.evaluate(() => ({ g: G.player.gold, g2: 0 }));
      check(m.g === g2 + 75, 'in the Deep Woods Mags cashes a 100 for 75 (a quarter off): letters are never lost');
    } else check(false, 'Mags is reachable in the Deep Woods');
    await plain(pg);
    // switch off: nobody keeps the desk
    await pg.evaluate(() => { for (const k of ['greening', 'part3', 'part4']) delete G.flags[k]; loadMap('oakhaven'); LEDGER15.cfg.bank = false; loadMap('greenhall'); });
    check(await pg.evaluate(() => G.map.entities.filter(e => e._p15l).length === 0 && LEDGER15.draw(25, 'p15l_clerk').reason === 'none'), 'switch off: no clerk, no desk, no drawing');
    await pg.evaluate(() => { LEDGER15.cfg.bank = true; loadMap('oakhaven'); });

    // ---------------------------------------------------------------- 3. THE TEST CONSOLE
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p15l_')) delete G.flags[k]; G.state = 'play'; });
    const rng = await pg.evaluate(() => {
      const L = LEDGER15; const r0 = window.__rc; const out = {};
      // a first code does not run until the player has agreed
      const first = L.runCode('richman'); out.first = [first.ok, first.reason, G.flags.p15l_cheat || 0, G.player.gold];
      L.markSave(); const g0 = G.player.gold;
      out.rich = [L.runCode('richman').ok, G.player.gold - g0];
      const songs0 = G.player.songs.length; out.oct = [L.runCode('octave').ok, songs0, G.player.songs.length, Object.keys(SONGS).filter(k => !SONGS[k].custom).length];
      const v0 = G.map.visited.reduce((a, b) => a + (b ? 1 : 0), 0); L.runCode('showme'); out.show = [v0, G.map.visited.reduce((a, b) => a + (b ? 1 : 0), 0), G.map.w * G.map.h];
      L.runCode('ghostmode'); out.ghost = L.ghost.on; L.runCode('ghostmode'); out.ghostOff = L.ghost.on;
      out.unknown = L.runCode('xyzzy').reason; out.chn = G.flags.p15l_chn; out.rc = window.__rc - r0;
      return out;
    });
    check(rng.first[0] === false && rng.first[1] === 'warn' && rng.first[2] === 0, 'the first code does not run until the player agrees; nothing is marked');
    check(rng.rich[0] && rng.rich[1] === 500, 'richman: +500 sovereigns exactly');
    check(rng.oct[0] && rng.oct[3] >= 5 && rng.oct[2] >= rng.oct[3], 'octave: every non-custom Song is in the book (' + rng.oct + ')');
    check(rng.show[1] === rng.show[2] && rng.show[1] >= rng.show[0], 'showme: every cell of this map is revealed (' + rng.show + ')');
    check(rng.ghost === true && rng.ghostOff === false, 'ghostmode toggles on and off');
    check(rng.unknown === 'unknown' && rng.chn === 5, 'an unknown code runs nothing; each executed code is counted (5)');
    check(rng.rc === 0, 'no cheat touches the RNG stream (' + rng.rc + ' calls)');
    // opensesame: mechanical locks only (the Cloister vestry has a brass tumbler lock; the Watch-house cell is the law's and is left alone)
    const od = await pg.evaluate(() => {
      loadMap('cloister'); G.state = 'play'; const x = 5, y = 12, cell = G.map.get(x, y), key = mechanicalLockKey(cell, x, y); delete G.flags[key];
      Engine.cam.x = 3.5; Engine.cam.y = 12.5; const far = (Engine.cam.x = 15.5, Engine.cam.y = 3.5, LEDGER15.runCode('opensesame'));
      const farPicked = !!G.flags[key]; Engine.cam.x = 3.5; Engine.cam.y = 12.5;
      const before = G.map.doors[y * G.map.w + x].target || 0; const r = LEDGER15.runCode('opensesame');
      return { cellOk: !!cell.door && cell.lockDifficulty === 1, farPicked, picked: !!G.flags[key], target: G.map.doors[y * G.map.w + x].target, before, text: r.text };
    });
    check(od.cellOk && !od.farPicked && od.picked && od.target === 1 && /give way/.test(od.text), 'opensesame picks the mechanical lock in reach (and only in reach): the vestry door opens (' + JSON.stringify(od) + ')');
    const cellDoor = await pg.evaluate(() => { loadMap('watchhouse'); G.state = 'play'; Engine.cam.x = 4.5; Engine.cam.y = 4.5; const k = mechanicalLockKey(G.map.get(5, 4), 5, 4); delete G.flags[k]; LEDGER15.runCode('opensesame'); const r = !!G.flags[k]; loadMap('oakhaven'); return r; });
    check(cellDoor === false, 'opensesame leaves the Watch-house cell lock to the law');
    const seals = await pg.evaluate(() => {
      // every locked story seal in the world stays locked, with the player standing next to it
      let n = 0, same = true;
      for (const id of Object.keys(G.maps)) { const m = G.maps[id]; loadMap(id); for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const c = m.get(x, y); if (c && c.door && c.locked) { n++; const l = c.locked, tg = m.doors[y * m.w + x] && m.doors[y * m.w + x].target; Engine.cam.x = x + 0.5; Engine.cam.y = y + 0.5; LEDGER15.runCode('opensesame'); if (c.locked !== l || (m.doors[y * m.w + x] && m.doors[y * m.w + x].target !== tg)) same = false; } } }
      loadMap('oakhaven'); return { n, same };
    });
    check(seals.n > 0 && seals.same, 'opensesame never clears a locked story seal or opens its door (' + seals.n + ' seals tried, one by one)');
    // ghostmode: walks through a wall, keeps you in bounds, falls no distance, stops cleanly
    const gm = await pg.evaluate(() => {
      loadMap('oakhaven'); G.state = 'play'; const L = LEDGER15, m = G.map, c = Engine.cam; let wx = -1, wy = -1;
      for (let y = 2; y < m.h - 2 && wx < 0; y++) for (let x = 2; x < m.w - 2; x++) if (m.isBlocked(x, y) && !m.isBlocked(x - 1, y)) { wx = x; wy = y; break; }
      c.x = wx - 0.5; c.y = wy + 0.5; const blockedNormal = playerMove(c, 0.9, 0); const nx = c.x; c.x = wx - 0.5;
      L.ghost.on = false; L.runCode('ghostmode'); playerMove(c, 0.9, 0); const through = c.x > wx;
      c.x = 0.7; c.y = 0.7; playerMove(c, -5, -5); const inb = c.x >= 0.6 && c.y >= 0.6;
      c.x = wx + 0.5; c.y = wy + 0.5; L.runCode('ghostmode'); const solidNow = m.isBlocked(c.x | 0, c.y | 0);
      return { through, inb, off: L.ghost.on, outOfWall: !m.isBlocked(c.x | 0, c.y | 0), wasInWall: solidNow };
    });
    check(gm.through && gm.inb && gm.off === false && gm.outOfWall, 'ghostmode: passes a wall, stays in bounds, and turning it off inside a wall nudges you out (' + JSON.stringify(gm) + ')');
    // the marked save is visible in the slot summary, statistics, achievements
    const marked = await pg.evaluate(() => { const d = JSON.parse(JSON.stringify(snapshotGame())); const plainD = JSON.parse(JSON.stringify(d)); delete plainD.flags.p15l_cheat; return { cheat: G.flags.p15l_cheat, withMark: slotSummary(d), without: slotSummary(plainD) }; });
    check(marked.cheat === 1 && /cheats used/.test(marked.withMark) && !/cheats used/.test(marked.without), 'the save is marked (p15l_cheat 1) and the slot summary says "cheats used" only for a marked save (' + marked.withMark + ')');
    await pg.evaluate(() => { G.state = 'play'; });
    const st = await pg.evaluate(() => { const hit = []; try { if (typeof PLAYTOOLS !== 'undefined' && PLAYTOOLS.openStats) PLAYTOOLS.openStats(); } catch (e) { hit.push(String(e)); } return { open: G.openPanel, cell: !!document.querySelector('#p7-stats .p15l-stats'), hit }; });
    let statsOk = st.cell;
    if (!statsOk) {                                              // the Statistics page opens from the Logbook/Codex menu in this build: find its opener
      const opened = await pg.evaluate(() => { try { openModal('<div id="p7-stats"></div>', 'stats'); return !!document.querySelector('#p7-stats .p15l-stats'); } catch (e) { return String(e); } });
      statsOk = opened === true;
    }
    check(statsOk, 'the Statistics page gets a "Ledger and console" block once there is something to count');
    const sr = await pg.evaluate(() => LEDGER15.statsRows().map(r => r.slice(0, 2).join('=')));
    check(/^Cheat codes run=\d+$/.test(sr[0]) && sr[0] !== 'Cheat codes run=0', 'statistics count the codes run (' + sr[0] + ')');
    const clean = await pg.evaluate(() => { const keep = Object.assign({}, G.flags); for (const k of Object.keys(G.flags)) if (k.startsWith('p15l_')) delete G.flags[k]; LEDGER15.clearAllMarks(); closeModal(); openModal('<div id="p7-stats"></div>', 'stats'); const none = !document.querySelector('#p7-stats .p15l-stats'); closeModal(); Object.assign(G.flags, keep); return none; });
    check(clean, 'a game with nothing to count shows no extra block (the page is as before)');
    await plain(pg);
    const ach = await pg.evaluate(() => { try { G.state = 'panel'; renderCodexModal('ach'); } catch (e) { return String(e); } return !!document.querySelector('#modal-panel .p15l-achnote'); });
    check(ach === true, 'the Achievements tab notes that the run used the console');
    await plain(pg);

    // the console screen: key, warning, hardcore
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p15l_')) delete G.flags[k]; G.player.gold = 0; G.state = 'play'; LEDGER15.con.lines = []; });
    await pg.keyboard.press('Shift+Backquote');
    check(await pg.evaluate(() => G.openPanel === 'p15l_console') && await pg.locator('#p15l-in').count() === 1, 'Shift+Backtick (~) opens the console in play');
    await shot(pg, 'console-open');
    await pg.keyboard.type('richman'); await pg.keyboard.press('Enter');
    check(await pg.locator('.p15l-warn').count() === 1 && await pg.evaluate(() => G.player.gold === 0 && !G.flags.p15l_cheat), 'the first code asks first: cheats mark the save (nothing has run, nothing marked)');
    await shot(pg, 'console-warning');
    await pg.locator('#p15l-no').click();
    check(await pg.evaluate(() => G.player.gold === 0 && !G.flags.p15l_cheat) && await pg.locator('.p15l-warn').count() === 0, '"Not now" leaves everything as it was');
    await pg.keyboard.type('RichMan '); await pg.keyboard.press('Enter');
    await pg.locator('#p15l-yes').click();
    const yes = await pg.evaluate(() => ({ g: G.player.gold, c: G.flags.p15l_cheat, n: G.flags.p15l_chn }));
    check(yes.g === 500 && yes.c === 1 && yes.n === 1, 'agreeing marks the save and runs the code (case and spaces ignored) (' + JSON.stringify(yes) + ')');
    await pg.keyboard.type('help'); await pg.keyboard.press('Enter');
    await pg.keyboard.type('plugh'); await pg.keyboard.press('Enter');
    const outTxt = await pg.evaluate(() => document.getElementById('p15l-out').textContent);
    check(/Codes: opensesame/.test(outTxt) && /Nothing answers to "plugh"/.test(outTxt) && await pg.evaluate(() => G.flags.p15l_chn === 1), 'help lists the codes; an unknown code does nothing and is not counted');
    await pg.locator('#p15l-codes').click();
    check(await pg.locator('#p15l-list [data-code]').count() === 5, 'the Codes list has five buttons for touch and controller play');
    await pg.locator('#p15l-list [data-code="octave"]').click();
    check(await pg.evaluate(() => G.flags.p15l_chn === 2 && G.player.songs.length >= Object.keys(SONGS).filter(k => !SONGS[k].custom).length), 'tapping a code in the list runs it (no second warning once agreed)');
    await shot(pg, 'console-codes');
    await pg.keyboard.press('Escape');
    check(await pg.evaluate(() => G.state === 'play' && G.openPanel !== 'p15l_console'), 'Escape closes the console and returns to play');
    // typing digits and letters into the console never fires game keys (the input swallows them)
    const swallowed = await pg.evaluate(() => { openModal('<p>x</p>', 'other'); closeModal(); return LEDGER15.openConsole(); });
    await pg.locator('#p15l-in').focus(); const s0 = await pg.evaluate(() => G.state); await pg.keyboard.type('f1 `1 9'); const s1 = await pg.evaluate(() => G.state);
    check(swallowed && s0 === s1 && s1 === 'panel', 'typing into the console does not trigger game keys');
    await plain(pg);

    // hardcore: shut
    const hc = await pg.evaluate(() => {
      const L = LEDGER15; G.player.hardcore = true; G.state = 'play';
      const r = L.runCode('richman'), g = G.player.gold, opened = L.openConsole(), onGhost = (L.ghost.on = true, L.consoleAllowed());
      L.tick(0.6); const ghostOff = L.ghost.on; G.player.hardcore = false; return { r: r.reason, g, opened, onGhost, ghostOff, panel: G.openPanel };
    });
    check(hc.r === 'hardcore' && hc.g === 500 && hc.onGhost === false && hc.ghostOff === false, 'hardcore: codes refuse, and a ghost already on is switched off (' + JSON.stringify(hc) + ')');
    await pg.evaluate(() => { G.player.hardcore = true; });
    await pg.evaluate(() => { closeModal(); G.state = 'play'; });
    await pg.keyboard.press('Shift+Backquote');
    check(await pg.evaluate(() => G.openPanel !== 'p15l_console'), 'hardcore: the console key does nothing');
    await pg.evaluate(() => { LEDGER15.openConsole(); });
    check(await pg.evaluate(() => document.getElementById('p15l-in') ? document.getElementById('p15l-in').disabled : true), 'hardcore: even if opened from Options, the input is disabled');
    await pg.evaluate(() => { G.player.hardcore = false; closeModal(); G.state = 'play'; });
    // console switch off
    await pg.evaluate(() => { LEDGER15.cfg.console = false; });
    await pg.keyboard.press('Shift+Backquote');
    check(await pg.evaluate(() => G.openPanel !== 'p15l_console' && LEDGER15.runCode('richman').ok === false), 'switch off: no console key and no codes');
    await pg.evaluate(() => { LEDGER15.cfg.console = true; });

    // ---------------------------------------------------------------- 4. "WHERE IS..." MARKS
    await pg.evaluate(() => { for (const k of Object.keys(G.flags)) if (k.startsWith('p15l_mk')) delete G.flags[k]; loadMap('oakhaven'); G.state = 'play'; Engine.cam.x = 20; Engine.cam.y = 20; });
    const place = await pg.evaluate(() => { const names = Object.keys(PLACES); return names.map(n => [n, Math.hypot(PLACE_POS[PLACES[n]][0] - 20, PLACE_POS[PLACES[n]][1] - 20)]).sort((a, b) => b[1] - a[1])[0][0]; });
    const near = await pg.evaluate(() => { const names = Object.keys(PLACES); return names.map(n => [n, Math.hypot(PLACE_POS[PLACES[n]][0] - 20, PLACE_POS[PLACES[n]][1] - 20)]).sort((a, b) => a[1] - b[1])[0]; });
    check(await talkTo(pg, 'harrow'), 'talk for the Where-is test');
    const mk = await pg.evaluate((place) => { askPlace(place); const lg = DLG.log.map(l => l.t); return { marked: LEDGER15.isMarked('O', place), n: LEDGER15.allMarks().length, flag: G.flags.p15l_mkO, said: lg[lg.length - 1], pos: LEDGER15.allMarks()[0] }; }, place);
    check(mk.marked && mk.n === 1 && mk.flag > 0 && /mark it on my map/.test(mk.said), 'asking where a place is marks it (and the log says so): ' + place + ' (' + JSON.stringify(mk) + ')');
    await pg.evaluate(([place]) => { askPlace(place); }, [place]);
    check(await pg.evaluate(() => LEDGER15.allMarks().length === 1), 'asking again does not duplicate the mark');
    const standing = await pg.evaluate(([name]) => { const p = PLACE_POS[PLACES[name]]; Engine.cam.x = p[0]; Engine.cam.y = p[1]; const n0 = LEDGER15.allMarks().length; askPlace(name); const r = LEDGER15.allMarks().length; return [n0, r, LEDGER15.isMarked('O', name)]; }, [near[0]]);
    check(standing[2] === false, '"You are standing at it" marks nothing');
    await pg.evaluate(() => { Engine.cam.x = 20; Engine.cam.y = 20; });
    await plain(pg);
    // the automap
    await pg.evaluate(() => { G.state = 'panel'; renderMap(); });
    const mp = await pg.evaluate(() => { const cv = document.getElementById('amap'); return { has: !!cv, box: !!document.getElementById('p15l-markbox'), line: (document.querySelector('.p15l-markline') || {}).textContent, clear: !!document.getElementById('p15l-clear') }; });
    check(mp.has && mp.box && mp.clear && /Marked: /.test(mp.line), 'the automap lists the marked place and offers a Clear button (' + mp.line + ')');
    const px = await pg.evaluate(() => { const cv = document.getElementById('amap'), m = LEDGER15.allMarks()[0]; const cx = cv.getContext('2d'); const d = cx.getImageData(Math.floor(m.x * 4) + 1, Math.floor(m.y * 4) - 8, 4, 3).data; let red = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 120) red++; return red; });
    check(px > 0, 'a pennant is drawn at the place on the automap canvas');
    check(await pg.evaluate(() => { const b = document.getElementById('p15l-clear'), p = document.getElementById('modal-panel'), rb = b.getBoundingClientRect(), rp = p.getBoundingClientRect(); return rb.bottom <= rp.bottom - 2 && rb.right <= rp.right; }), 'desktop: the Clear marks button is fully inside the panel');
    await shot(pg, 'automap-mark');
    await pg.evaluate(() => { closeModal(); G.state = 'panel'; renderLog(); });
    check(await pg.evaluate(() => { const b = document.querySelector('#modal-panel .p15l-marks'); return !!b && /Marked on your map/.test(b.textContent) && b.nextElementSibling && b.nextElementSibling.tagName === 'H3'; }), 'the logbook has a "Marked on your map" block before the Rite entries');
    await pg.evaluate(() => { closeModal(); G.state = 'play'; });
    // clear by arriving
    const arr = await pg.evaluate((place) => { const m = LEDGER15.allMarks()[0]; Engine.cam.x = m.x + 8; Engine.cam.y = m.y; LEDGER15.clearReached(); const still = LEDGER15.allMarks().length; Engine.cam.x = m.x + 1.5; Engine.cam.y = m.y; LEDGER15.clearReached(); return [still, LEDGER15.allMarks().length, G.flags.p15l_mkO]; }, place);
    check(arr[0] === 1 && arr[1] === 0 && arr[2] === 0, 'far away the mark stays; within about two cells it clears (' + arr + ')');
    // clear by entering the place through its door (interior)
    const intr = await pg.evaluate(() => {
      const hub = G.maps.oakhaven; const idx = hub.cells.findIndex(c => c && c.portal && c.portal.map === 'greenhall'); const x = idx % hub.w + 0.5, y = (idx / hub.w | 0) + 0.5;
      const name = Object.keys(PLACES).find(n => { const p = PLACE_POS[PLACES[n]]; return Math.hypot(p[0] - x, p[1] - y) < 4; });
      if (!name) return { skip: true };
      Engine.cam.x = 5; Engine.cam.y = 5; G.state = 'play'; LEDGER15.setMark('O', name, true); const before = LEDGER15.allMarks().length; loadMap('greenhall'); return { name, before, after: LEDGER15.allMarks().length };
    });
    if (!intr.skip) check(intr.before === 1 && intr.after === 0, 'walking into the building the place is in clears the mark (' + JSON.stringify(intr) + ')'); else console.log('note: no Oakhaven place is within four cells of the Greenhall door; interior-clear case skipped');
    // from an interior the answer is given from the door, and still marks
    const inside = await pg.evaluate(() => { loadMap('greenhall'); G.state = 'play'; const far = Object.keys(PLACES).map(n => [n, PLACE_POS[PLACES[n]]]); const hub = G.maps.oakhaven; const idx = hub.cells.findIndex(c => c && c.portal && c.portal.map === 'greenhall'); const x = idx % hub.w + 0.5, y = (idx / hub.w | 0) + 0.5;
      const pick = far.sort((a, b) => Math.hypot(b[1][0] - x, b[1][1] - y) - Math.hypot(a[1][0] - x, a[1][1] - y))[0][0];
      G.state = 'dialogue'; Object.assign(DLG, { npc: NPCS.hob, ent: { id: 'hob' }, tone: 'normal', log: [], choices: null }); askPlace(pick); return { pick, marked: LEDGER15.isMarked('O', pick), mid: G.mapId }; });
    check(inside.marked, 'asked from inside a building, the answer is given from its door and the place is marked (' + inside.pick + ')');
    await pg.evaluate(() => { LEDGER15.clearAllMarks(); loadMap('oakhaven'); G.state = 'play'; });
    // a place on another map's list is not marked from here ("a long way from Oakhaven")
    const far = await pg.evaluate(() => { G.flags.part3 = true; const n = Object.keys(PLACES_WG)[0]; loadMap('oakhaven'); G.state = 'dialogue'; Object.assign(DLG, { npc: NPCS.hob, ent: { id: 'hob' }, tone: 'normal', log: [], choices: null }); askPlace(n); const r = LEDGER15.allMarks().length; delete G.flags.part3; return r; });
    check(far === 0, 'a "long way from here" answer marks nothing');
    // switch off
    await pg.evaluate(() => { G.state = 'play'; LEDGER15.cfg.marks = false; G.state = 'dialogue'; Object.assign(DLG, { npc: NPCS.hob, ent: { id: 'hob' }, tone: 'normal', log: [], choices: null }); Engine.cam.x = 20; Engine.cam.y = 20; loadMap('oakhaven'); Engine.cam.x = 20; Engine.cam.y = 20; askPlace(Object.keys(PLACES)[3]); });
    check(await pg.evaluate(() => LEDGER15.allMarks().length === 0 || !LEDGER15.cfg.marks), 'switch off: asking marks nothing');
    await pg.evaluate(() => { LEDGER15.cfg.marks = true; G.state = 'play'; });

    // ---------------------------------------------------------------- Options rows
    await pg.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const opts = await pg.evaluate(() => ({ ids: ['p15l-opt-train', 'p15l-opt-bank', 'p15l-opt-marks', 'p15l-opt-console', 'p15l-opt-open'].map(i => !!document.getElementById(i)), once: document.querySelectorAll('#p15l-head').length }));
    check(opts.ids.every(Boolean) && opts.once === 1, 'the Options menu carries the four switches and the console button, once');
    await pg.locator('#p15l-opt-train').click();
    check(await pg.evaluate(() => LEDGER15.cfg.train === false && JSON.parse(localStorage.getItem('octave.ledger15.v1')).train === false), 'a switch changes and is remembered in localStorage');
    await pg.locator('#p15l-opt-train').click();
    await shot(pg, 'options');
    await pg.locator('#p15l-opt-open').click();
    check(await pg.evaluate(() => G.openPanel === 'p15l_console'), 'the Options button opens the console');
    await plain(pg);

    // ---------------------------------------------------------------- the world as before when everything is off
    const off = await boot(browser, { width: 1280, height: 800 }, { blockModule: true }); allErrors.push(off.errors);
    const base2 = await off.page.evaluate(() => ({ has: typeof LEDGER15, flags: Object.keys(G.flags).filter(k => k.startsWith('p15l_')), items: Object.keys(ITEMS).filter(k => k.startsWith('p15_letter')).length }));
    check(base2.has === 'undefined' && base2.flags.length === 0 && base2.items === 0, 'with the module absent the game loads clean (nothing of ours is there)');
    await off.page.close();
    const sw = await boot(browser); allErrors.push(sw.errors);
    const seq = async (p, on) => p.evaluate((on) => { const c = LEDGER15.cfg; c.train = c.bank = c.marks = c.console = on; for (let i = 0; i < 60; i++) { G.time = (G.time || 0) + 0.1; } const sig = JSON.stringify([G.map.entities.filter(e => e.transient).length, G.map.entities.map(e => e.id || e.kind).sort().join(','), Object.keys(G.flags).filter(k => k.startsWith('p15l_'))]); return sig; }, on);
    const sigOff = await seq(sw.page, false);
    check(!/p15l_/.test(JSON.parse(sigOff)[2].join('')), 'all switches off: no p15l_ flag is written by merely playing');
    const outside = await sw.page.evaluate(() => { const c = LEDGER15.cfg; c.train = c.bank = c.marks = c.console = false; loadMap('greenhall'); const n = G.map.entities.filter(e => e._p15l).length; loadMap('oakhaven'); G.state = 'play'; return [n, !!(talk && G.ents.find(e => e.id === 'harrow'))]; });
    check(outside[0] === 0, 'all switches off: Greenhall is exactly as before (no clerk, no desk)');
    await sw.page.evaluate(() => { const c = LEDGER15.cfg; c.train = c.bank = c.marks = c.console = true; });
    await talkTo(sw.page, 'vane');
    check(await sw.page.locator('#p15l-train').count() === 1 || await sw.page.evaluate(() => !G.ents.find(e => e.id === 'vane')) , 'Captain Vane offers training when he is in reach');
    await plain(sw.page);
    await sw.page.close();

    // ---------------------------------------------------------------- 640x400 compact, and a desktop shot of each screen
    const C = await boot(browser, { width: 640, height: 400 }); allErrors.push(C.errors); const cp = C.page;
    const fit = async (name) => cp.evaluate((name) => { const p = document.getElementById('modal-panel'); if (!p) return { name, none: true }; const r = p.getBoundingClientRect(); const w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
      const over = Array.from(p.querySelectorAll('*')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > r.right + 2 || b.left < r.left - 2); }).length;
      return { name, w: Math.round(r.width), h: Math.round(r.height), sx: p.scrollWidth - p.clientWidth, inView: r.right <= w + 1 && r.bottom <= h + 1 + 4 * 0, over, docX: document.documentElement.scrollWidth - w }; }, name);
    await cp.evaluate(() => { G.player.level = 1; G.player.gold = 300; G.player.skills.Stealth = 25; });
    await talkTo(cp, 'harrow'); await cp.locator('#p15l-train').click(); await shot(cp, 'train-640x400');
    let f = await fit('train'); check(f.sx <= 1 && f.over === 0 && f.docX <= 1, 'compact 640x400: the lesson pane has no horizontal overflow (' + JSON.stringify(f) + ')');
    await cp.evaluate(() => { closeModal(); G.state = 'play'; loadMap('greenhall'); });
    await cp.waitForTimeout(150);
    await talkTo(cp, 'p15l_clerk'); await cp.locator('#p15l-bank').click();
    for (const face of [500, 100]) await cp.locator('[data-draw="' + face + '"]').click();
    await shot(cp, 'bank-640x400');
    f = await fit('bank'); check(f.sx <= 1 && f.over === 0 && f.docX <= 1, 'compact: the letters pane has no horizontal overflow (' + JSON.stringify(f) + ')');
    await cp.evaluate(() => { closeModal(); G.state = 'play'; loadMap('oakhaven'); G.player.hardcore = false; });
    await cp.evaluate(() => { LEDGER15.fset('p15l_cheat', 1); G.state = 'play'; });
    await cp.keyboard.press('Shift+Backquote'); await cp.locator('#p15l-codes').click(); await cp.locator('#p15l-in').focus();
    await cp.keyboard.type('help'); await cp.keyboard.press('Enter');
    await shot(cp, 'console-640x400');
    f = await fit('console'); check(f.sx <= 1 && f.over === 0 && f.docX <= 1, 'compact: the console has no horizontal overflow (' + JSON.stringify(f) + ')');
    await cp.evaluate(() => { closeModal(); G.state = 'play'; Engine.cam.x = 20; Engine.cam.y = 20; LEDGER15.clearAllMarks(); const names = Object.keys(PLACES); G.state = 'dialogue'; Object.assign(DLG, { npc: NPCS.hob, ent: { id: 'hob' }, tone: 'normal', log: [], choices: null }); for (const n of names.slice(0, 5)) askPlace(n); closeModal(); G.state = 'panel'; renderMap(); });
    await shot(cp, 'automap-640x400');
    const vis = await cp.evaluate(() => { const b = document.getElementById('p15l-clear'), p = document.getElementById('modal-panel'); if (!b) return false; const rb = b.getBoundingClientRect(), rp = p.getBoundingClientRect(); return rb.bottom <= rp.bottom - 2 && rb.right <= rp.right && rb.top >= rp.top; });
    check(vis, 'compact: the Clear marks button is fully inside the panel');
    f = await fit('automap'); const ml = await cp.evaluate(() => LEDGER15.allMarks().length);
    check(ml >= 3 && f.sx <= 1 && f.over === 0 && f.docX <= 1, 'compact: five questions leave marks and the automap still fits (' + ml + ' marks, ' + JSON.stringify(f) + ')');
    await cp.evaluate(() => { closeModal(); G.state = 'panel'; renderLog(); });
    f = await fit('log'); check(f.sx <= 1 && f.docX <= 1, 'compact: the logbook with marks fits (' + JSON.stringify(f) + ')');
    await cp.evaluate(() => { closeModal(); G.state = 'panel'; renderAccessibilityMenu(); });
    f = await fit('options'); check(f.docX <= 1, 'compact: the Options menu with the new rows has no page overflow (' + JSON.stringify(f) + ')');
    await cp.close();
  } catch (e) {
    fails.push('test crashed: ' + (e && e.stack || e)); console.log('CRASH', e && e.stack || e);
  } finally { await browser.close(); }
  const errs = allErrors.flat().filter(e => !/favicon|Failed to load resource|AudioContext|WebGL|GPU stall|ReadPixels/.test(e));
  check(errs.length === 0, 'no page errors (' + errs.slice(0, 4).join(' | ') + ')');
  console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nledger15 test: all passed');
  process.exit(fails.length ? 1 : 0);
})();
