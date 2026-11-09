// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/calendar11.test.js
// Phase 11 calendar: holidays and their prices, the Oakhaven market, the moon (sky and hound spawns), birth signs,
// the "Previously..." recap and the performance overlay. Uses the managed preview; never starts a server.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';

async function toSummary(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof CALENDAR11 !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Cal Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
}
async function boot(browser, viewport, pickSign) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await toSummary(page);
  if (pickSign) await page.locator('#p11c-sign button[data-s="' + pickSign + '"]').click();
  return { page, errors };
}
async function go(page) { await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(400); }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } };
  try {
    // ---------------- birth signs: the default character, then one with a sign (creation UI)
    const A = await boot(browser, { width: 1280, height: 800 });
    const picker = await A.page.evaluate(() => ({ has: !!document.querySelector('#p11c-sign'), n: document.querySelectorAll('#p11c-sign button').length, none: document.querySelector('#p11c-sign button.sel')?.textContent }));
    check(picker.has && picker.n === 8 && picker.none === 'None', 'the creation summary has a birth-sign picker: None plus seven modes, None selected (' + JSON.stringify(picker) + ')');
    const baseAttrs = await A.page.evaluate(() => JSON.stringify(CREATE.attrs || null));
    await go(A.page);
    const none = await A.page.evaluate(() => ({ attrs: G.player.attrs, cls: G.player.cls.attrs, hp: G.player.hpMax, flag: 'p11c_sign' in G.flags, snap: 'p11c_sign' in snapshotGame().flags }));
    check(!none.flag && !none.snap, 'default (no sign): no flag, nothing saved');
    check(none.hp === await A.page.evaluate(() => G.player.cls.hp + Math.floor(G.player.attrs.Endurance / 10)), 'default hp is the original formula');

    const B = await boot(browser, { width: 1280, height: 800 }, 4);
    const sel = await B.page.evaluate(() => ({ blurb: document.querySelector('.p11c-blurb').textContent, luck: [...document.querySelectorAll('.attrs > div')].find(d => d.firstChild.textContent === 'Luck').querySelector('b').textContent }));
    check(/Lydian/.test(sel.blurb) && /Luck/.test(sel.blurb), 'blurb names the sign and the attribute');
    await go(B.page);
    const signed = await B.page.evaluate(() => ({ luck: G.player.attrs.Luck, clsLuck: G.player.cls.attrs.Luck, flag: G.flags.p11c_sign, snap: snapshotGame().flags.p11c_sign, bio: G.player.attrs.Luck - G.player.cls.attrs.Luck }));
    check(signed.flag === 4 && signed.snap === 4, 'the sign is saved as the small integer 4 (Lydian)');
    check(+sel.luck === signed.luck, 'the summary showed the same Luck the character got (' + sel.luck + ' vs ' + signed.luck + ')');
    // the signed character is the unsigned one plus 5 Luck: same class, same biography rolls are fixed answers (first choice)
    const unsignedLuck = await A.page.evaluate(() => G.player.attrs.Luck);
    check(signed.luck - unsignedLuck === 5, 'a sign adds exactly +5 to one attribute (' + signed.luck + ' vs ' + unsignedLuck + ')');
    const sheet = await B.page.evaluate(async () => { G.state = 'panel'; renderCharacter(); const t = document.querySelector('#p11c-signline')?.textContent; closeModal(); G.state = 'play'; return t; });
    check(/Lydian/.test(sheet || ''), 'the character sheet names the sign');

    // ---------------- hostile and old saves
    const hostile = await B.page.evaluate(() => {
      const out = {}, base = JSON.parse(JSON.stringify(snapshotGame()));
      const tries = { str: '4', big: 99, neg: -1, frac: 2.5, html: '<img src=x onerror=1>', obj: { a: 1 }, nul: null, tru: true, nan: NaN, inf: Infinity, zero: 0, ok: 7 };
      for (const k in tries) {
        const d = JSON.parse(JSON.stringify(base)); d.flags.p11c_sign = tries[k]; if (k === 'nan' || k === 'inf') d.flags.p11c_sign = tries[k];
        restoreGame(d); out[k] = G.flags.p11c_sign === undefined ? 'none' : G.flags.p11c_sign;
      }
      const old = JSON.parse(JSON.stringify(base)); delete old.flags.p11c_sign; restoreGame(old); out.old = 'p11c_sign' in G.flags ? 'has' : 'none';
      return out;
    });
    check(['str', 'big', 'neg', 'frac', 'html', 'obj', 'nul', 'tru', 'nan', 'inf', 'zero', 'old'].every(k => hostile[k] === 'none') && hostile.ok === 7, 'hostile sign values are dropped, 7 is kept, an old save has none: ' + JSON.stringify(hostile));
    check(B.errors.length === 0 && A.errors.length === 0, 'no page errors in creation: ' + A.errors.concat(B.errors));
    await A.page.close();

    // ---------------- the main page for the rest
    const { page, errors } = B;
    await page.evaluate(() => { G.state = 'play'; G.fadeT = 0; closeModal(); });

    // ---------------- 1. the canon calendar is a pure function of the day number
    const sched = await page.evaluate(() => {
      const C = CALENDAR11, r = {}; r.mk = []; r.moon = []; r.days = [];
      for (let d = 0; d < 64; d++) { r.mk.push(C.marketIndex(d)); r.moon.push(C.moonIndex(d)); r.days.push(C.dateOf(d).weekday === DAYS[d % 8]); }
      r.d0 = C.dateProse(0); r.d4 = C.dateProse(4); r.d10 = C.dateProse(10); r.d24 = C.dateProse(24); r.d25 = C.dateProse(25); r.d31 = C.dateProse(31);
      r.short0 = C.dateShort(0); r.canopy = []; for (let d = 0; d < 400; d++) if (C.isCanopy(d)) r.canopy.push(d);
      // Vol VII formula, independent: weekday = ((doy+3) mod 8)+1 in the Rootday-first list
      const root = ['Rootday', 'Hearthday', 'Massday', 'Stasisday', 'Dawnday', 'Driftday', 'Memoryday', 'Nullday'];
      r.formula = true; for (let d = 0; d < 120; d++) { const t = C.dateOf(d); if (root[(t.doy + 3) % 8] !== t.weekday) r.formula = false; }
      r.rotaAll = C.ROTA.length === 8 && C.ROTA.every(x => x.log && x.folk);
      r.counts = [0, 1, 2, 3, 4, 5].map(n => C.stallCount(n));
      r.stock = [0, 1, 2].map(n => C.VENDORS.map(v => C.stockFor(v, n).join('+')));
      r.itemsOk = C.VENDORS.every(v => v.pool.every(id => ITEMS[id])) && C.VENDORS.every(v => [0, 1, 2, 3].every(n => C.stockFor(v, n).length === 3));
      r.kinds = [0, 1, 2, 3].map(n => new Set(C.vendorsFor(n).map(v => v.key)).size === C.vendorsFor(n).length);
      return r;
    });
    check(sched.days.every(Boolean), 'the weekday of the date is the game\'s own DAYS weekday for 64 days');
    check(sched.formula, 'the weekday matches the Vol VII formula ((doy+3)%8)+1');
    check(sched.d0 === 'Nullday the sixth of Harvestmonth' && sched.d10 === 'Hearthday the sixteenth of Harvestmonth' && sched.d24 === 'Nullday the thirtieth of Harvestmonth' && sched.d25 === 'Rootday the first of Ashfall', 'date prose: ' + [sched.d0, sched.d10, sched.d24, sched.d25]);
    check(sched.canopy.join() === '31,391' && /Memoryday the seventh of Ashfall/.test(sched.d31), 'Canopy is the first Memoryday of Ashfall: ' + sched.canopy);
    check(sched.rotaAll, 'every weekday has a Rota line and a townsfolk line');
    check(sched.mk.every((m, d) => m === (d % 8 === 3 ? (d - 3) / 8 : -1)), 'market days are every Massday (day%8==3), indexed from 0');
    check(sched.moon.every((m, d) => m === (d + 3) % 8), 'moon index is (day+3)%8');
    check(sched.counts.join() === '4,3,5,4,3,5' && sched.counts.every(c => c >= 3 && c <= 5), 'stall counts are 3-5: ' + sched.counts);
    check(sched.stock[0].join() !== sched.stock[1].join() && sched.itemsOk && sched.kinds.every(Boolean), 'stock rotates between markets, every pool item exists, a market has no repeated vendor kind');
    // no price anywhere depends on the day any more
    const prices = await page.evaluate(() => { const n = NPCS.bettany, out = []; for (const d of [0, 2, 3, 10, 31]) { G.day = d; out.push(n.shop.map(e => buyPrice(n, e)).join('/')); } G.day = 0; return out; });
    check(new Set(prices).size === 1, 'shop prices do not change with the day: ' + prices);

    // ---------------- 2. market stalls
    const mk = await page.evaluate(async () => {
      const C = CALENDAR11, r = {};
      const placed = () => G.maps.oakhaven.entities.filter(e => e._p11c);
      G.flags = Object.assign({}, G.flags); delete G.flags.greening;
      G.day = 4; G.tod = 0.5; loadMap('oakhaven'); r.day4 = placed().length;
      G.day = 3; loadMap('oakhaven'); r.day3 = placed().length / 2; const info = C.marketInfo(); r.stalls = info.stalls.length; r.stallItems = info.stalls.map(s => s.items.length);
      r.transient = placed().every(e => e.transient); r.past = placed().every(e => G.maps.oakhaven.entities.indexOf(e) >= G.maps.oakhaven.baseCount);
      r.saved = JSON.stringify(snapshotGame().maps.oakhaven.extra).includes('p11c');
      // reload keeps it, a second load does not duplicate
      loadMap('oakhaven'); loadMap('oakhaven'); r.again = placed().length / 2;
      // vendors sell their board at market prices
      const v = placed().find(e => e.kind === 'npc'); r.vendorShop = NPCS[v.id].shop.length;
      G.state = 'play'; G.player.gold = 99; talk(v); r.dlgShop = !!DLG.npc.shop.length; const e0 = DLG.npc.shop[0]; r.price = buyPrice(DLG.npc, e0); r.shopPrice = buyPrice(NPCS.bettany, { item: e0.item }); r.markup = DLG.npc.markup; closeModal(); G.state = 'play';
      // day 4 again: gone; switch off on day 3: gone, back on: back
      G.day = 4; CALENDAR11.syncMarket(true); r.gone = placed().length / 2;
      G.day = 3; CALENDAR11.syncMarket(true); r.back = placed().length / 2;
      C.cfg.events = false; C.syncMarket(true); r.off = placed().length / 2; C.cfg.events = true; C.syncMarket(true);
      // second market (day 11): different count and stock
      G.day = 11; C.syncMarket(true); r.n1 = C.marketInfo().stalls.length; r.stock1 = C.marketInfo().stalls.map(s => s.items.join('+')).join('|');
      G.day = 19; C.syncMarket(true); r.n2 = C.marketInfo().stalls.length;
      G.day = 3; C.syncMarket(true); r.stock0 = C.marketInfo().stalls.map(s => s.items.join('+')).join('|');
      // the Greening: nothing, and the rebuilt map has none
      G.flags.greening = true; C.syncMarket(true); r.green = placed().length;
      G.maps.oakhaven = buildOakhaven(true); loadMap('oakhaven'); r.greenMap = G.maps.oakhaven.entities.filter(e => e._p11c).length;
      r.greenLines = C.entryLines('oakhaven').length; r.greenFolk = C.folkLine({ id: 'townsman', homeX: 3, homeY: 4 });
      delete G.flags.greening; G.maps.oakhaven = buildOakhaven(false); loadMap('oakhaven');
      return r;
    });
    check(mk.day4 === 0 && mk.day3 === 4 && mk.stalls === 4 && mk.stallItems.every(n => n === 3), 'day 4: no stalls; day 3: 4 stalls of 3 items (' + mk.day4 + '/' + mk.day3 + ')');
    check(mk.transient && mk.past && !mk.saved && mk.again === mk.day3, 'stalls are transient, appended, never saved, never duplicated');
    check(mk.dlgShop && mk.vendorShop === 3 && mk.markup === 0.9 && mk.price <= mk.shopPrice, 'a vendor sells 3 items at markup 0.9 (price ' + mk.price + ' vs shop ' + mk.shopPrice + ')');
    check(mk.gone === 0 && mk.back === 4 && mk.off === 0, 'stalls follow the day and the switch');
    check(mk.n1 === 3 && mk.n2 === 5 && mk.stock1 !== mk.stock0, 'the next markets have 3 and 5 stalls and another stock (' + mk.n1 + ',' + mk.n2 + ')');
    check(mk.green === 0 && mk.greenMap === 0 && mk.greenLines === 0 && mk.greenFolk === null, 'after the Greening: no stalls, no Oakhaven entry lines, no townsfolk lines');

    // ---------------- 1c. Rota and Canopy lines, before and after the Greening
    const hl = await page.evaluate(() => {
      const C = CALENDAR11, r = {}; G.flags = Object.assign({}, G.flags); delete G.flags.greening; G.tod = 0.6;
      r.oak = [0, 1, 2, 4, 5, 6, 7].map(d => { G.day = d; const l = C.entryLines('oakhaven'); return l.length + ':' + l[0][0].slice(0, 14); });
      G.day = 3; r.market = C.entryLines('oakhaven').length;
      r.folk = []; for (let d = 0; d < 8; d++) { G.day = d; r.folk.push(C.folkLine({ id: 'townsman', homeX: 3.5, homeY: 4.5 })); }
      r.notFolk = C.folkLine({ id: 'harrow', homeX: 3.5, homeY: 4.5 }); G.day = 1; r.stable = C.folkLine({ id: 'townsman', homeX: 3.5, homeY: 4.5 }) === C.folkLine({ id: 'townsman', homeX: 3.5, homeY: 4.5 });
      G.day = 31; r.canopyOak = C.entryLines('oakhaven').length; r.canopyFolk = C.folkLine({ id: 'townsman', homeX: 3.5, homeY: 4.5 });
      r.canopyOther = (G.day = 30, C.entryLines('oakhaven').length);
      G.flags.greening = true;
      G.day = 31; r.groveCanopy = C.entryLines('whispergrove').map(x => x[0].slice(0, 20)); r.oakAfter = C.entryLines('oakhaven').length; r.folkAfter = C.folkLine({ id: 'townsman', homeX: 3.5, homeY: 4.5 });
      G.day = 30; r.groveOther = C.entryLines('whispergrove').length;
      delete G.flags.greening;
      // talking: the line lands in the dialogue log
      G.day = 2; G.state = 'play'; loadMap('oakhaven');
      const tt = G.maps.oakhaven.entities.find(e => e.kind === 'npc' && e.id === 'townsman' && !e._p11c); G.ents = G.maps.oakhaven.entities;
      talk(tt); r.dlgLines = DLG.log.filter(l => l.who === 'them').length; r.dlgLast = DLG.log[DLG.log.length - 1].t; closeModal(); G.state = 'play'; G.day = 0;
      return r;
    });
    check(hl.oak.every(s => /^1:/.test(s)) && new Set(hl.oak).size === 7 && hl.market === 2, 'each weekday has its own Rota line on entering Oakhaven (market day adds one)');
    check(hl.folk.every(Boolean) && new Set(hl.folk).size >= 6 && hl.stable && hl.notFolk === null, 'townsfolk have a stable line every day; named people do not');
    check(hl.canopyOak === 3 && hl.canopyFolk && hl.canopyOther === 1, 'Canopy before the Greening: quiet candles and lines on that day only');
    check(hl.groveCanopy.length === 2 && hl.oakAfter === 0 && hl.folkAfter === null && hl.groveOther === 0, 'after the Greening: Canopy in Whisper-Grove only, nothing from Oakhaven');
    check(hl.dlgLines >= 2 && /./.test(hl.dlgLast), 'talking to a townsman adds the line (' + hl.dlgLines + ')');

    // logbook and HUD word
    const ui = await page.evaluate(() => {
      const C = CALENDAR11, r = {}; G.day = 0; G.state = 'panel'; renderLog(); r.log = document.querySelector('#p11c-almanac')?.textContent || ''; r.logHtml = document.querySelector('#p11c-almanac')?.innerHTML || ''; closeModal(); G.state = 'play';
      r.hud = C.hudWord(); G.day = 3; r.hudM = C.hudWord(); C.cfg.events = false; r.hudOff = C.hudWord(); G.state = 'panel'; renderLog(); r.logOff = !!document.querySelector('#p11c-almanac'); closeModal(); G.state = 'play'; C.cfg.events = true; G.day = 0;
      return r;
    });
    check(/Nullday the sixth of Harvestmonth, 419 SR/.test(ui.log) && /moon/.test(ui.log) && /Nullday\./.test(ui.log) && !/</.test(ui.logHtml.replace(/<\/?(p|small)[^>]*>/g, '')), 'the logbook gives the prose date, the Rota line and the moon');
    check(ui.hud === 'The sixth of Harvestmonth' && ui.hudM === 'The ninth of Harvestmonth' && ui.hudOff === '' && !ui.logOff, 'HUD date follows the day and the switch: ' + ui.hud);

    // ---------------- 3. the moon: spawns
    const sp = await page.evaluate(() => {
      const C = CALENDAR11, r = {}; G.day = 0; loadMap('clearing'); const base = G.map.baseCount != null ? G.map.baseCount : G.ents.length;
      const hounds = () => G.ents.filter(e => e.kind === 'enemy' && e.type === 'hound' && !e.dead).length;
      const reset = () => { for (let i = G.ents.length - 1; i >= base; i--) if (G.ents[i].type === 'hound') G.ents.splice(i, 1); for (const e of G.ents) if (e.type === 'hound') e.dead = true; };
      const realRandom = Math.random, realST = window.setTimeout; let delayed = 0;
      window.setTimeout = function (fn, ms) { if (fn === spawnHound || ms === 2500) { delayed++; return 0; } return realST.apply(window, arguments); };
      // a single call at a given random value: spawned or not
      const once = (day, u) => { G.day = day; reset(); Math.random = () => u; try { spawnHound(); } finally { Math.random = realRandom; } return hounds(); };
      const out = {};
      for (const idx of [0, 4, 2]) {
        const day = ((idx - 3) % 8 + 8) % 8, m = C.MOON_SPAWN[idx];
        out[idx] = { mult: C.moonSpawnMult(day), below: once(day, Math.max(0, Math.min(m, 1) - 0.001)), above: once(day, Math.min(0.999, Math.min(m, 1) + 0.001)) };
      }
      // new moon: the extra spawn is scheduled when the roll is under 0.25
      G.day = 5; delayed = 0; reset(); Math.random = () => 0.2; try { spawnHound(); } finally { Math.random = realRandom; } out.delayedLow = delayed;
      G.day = 5; delayed = 0; reset(); Math.random = () => 0.3; try { spawnHound(); } finally { Math.random = realRandom; } out.delayedHigh = delayed;
      // off: every call spawns whatever the roll is, whatever the moon
      C.cfg.events = false; out.off = [once(1, 0.99), once(5, 0.99)]; out.offMult = C.moonSpawnMult(5); C.cfg.events = true;
      window.setTimeout = realST; reset(); G.day = 0; loadMap('oakhaven');
      return out;
    });
    check(sp[0].mult === 1.25 && sp[4].mult === 0.75 && sp[2].mult === 1, 'spawn multipliers: new x1.25, full x0.75, quarter x1');
    check(sp[4].below === 1 && sp[4].above === 0, 'full moon: a spawn is kept when the roll is under 0.75 and refused above');
    check(sp[0].below === 1 && sp[0].above === 1 && sp[2].below === 1 && sp[2].above === 1, 'new moon and quarter always spawn the first hound');
    check(sp.delayedLow === 1 && sp.delayedHigh === 0, 'new moon: a second hound follows when the roll is under 0.25 (' + sp.delayedLow + '/' + sp.delayedHigh + ')');
    check(sp.off[0] === 1 && sp.off[1] === 1 && sp.offMult === 1, 'switch off: the original spawner');

    // ---------------- 3b. the moon in the sky
    const moon = await page.evaluate(async () => {
      const C = CALENDAR11, r = {}; G.flags = Object.assign({}, G.flags); delete G.flags.greening; G.day = 0; loadMap('oakhaven');
      G.tod = 0.0; Engine.cam.dir = Math.PI / 2; Engine.cam.pitch = 0;   // midnight: the moon stands in +y
      const shot = (day) => { G.day = day; Engine.render(G.ents, G.tod); return Object.assign({}, C.moonStats); };
      r.phases = []; for (let i = 0; i < 8; i++) { const day = ((i - 3) % 8 + 8) % 8; r.phases.push(shot(day)); }
      C.cfg.events = false; r.off = shot(5); C.cfg.events = true;
      const pre = GFX.moonPhase; GFX.moonPhase = false; r.noGfx = shot(5); GFX.moonPhase = pre;
      G.tod = 0.5; r.day = shot(5); G.tod = 0.78; G.day = 0;
      return r;
    });
    const sh = moon.phases.map(p => p.shadowPx), lit = moon.phases.map(p => p.drawn);
    check(sh[4] === 0 && lit[0] === 0 && sh[0] > 0 && lit[4] > 0, 'full moon has no shade, new moon has no lit disc (shade ' + sh + ', lit ' + lit + ')');
    check(sh[2] > 0 && lit[2] > 0 && Math.abs(sh[2] - lit[2]) < 0.35 * (sh[2] + lit[2]) && sh[6] > 0 && sh[1] > sh[3] && sh[7] > sh[5], 'quarters are about half lit; crescents are darker than gibbous');
    check(moon.off.shadowPx === 0 && moon.noGfx.shadowPx === 0 && moon.day.shadowPx === 0, 'no shade with the switch off, with the effect off, or by day');

    // ---------------- 5. "Previously..." recap
    const rc = await page.evaluate(async () => {
      const C = CALENDAR11, r = {}, wait = (ms) => new Promise(res => setTimeout(res, ms));
      G.flags = Object.assign({}, G.flags); delete G.flags.greening; G.day = 0; G.tod = 0.5; loadMap('oakhaven');
      G.journal = [{ cat: 'main', text: 'I came up the Greenroot road. <b>x</b>', day: 0 }, { cat: 'side', text: 'A second line.', day: 1 }];
      const make = (when) => { const d = JSON.parse(JSON.stringify(snapshotGame())); if (when === undefined) delete d.when; else d.when = when; return d; };
      const card = () => document.querySelector('#p11c-recap');
      const load = (d) => { C.hideRecap(); restoreGame(d); return !!card(); };
      const now = Date.now();
      r.fresh = load(make(now)); r.nine = load(make(now - 9 * 60000)); r.eleven = load(make(now - 11 * 60000)); r.html = card() ? card().innerHTML : '';
      r.text = card() ? card().textContent : '';
      r.noWhen = load(make(undefined)); r.nan = load(make('x')); r.future = load(make(now + 1e12));
      // a file read in the last moments makes a fresh save qualify
      await new Promise(res => { const fr = new FileReader(); fr.onload = res; fr.readAsText(new Blob(['x'])); });
      r.file = load(make(now));
      await wait(25000 > 0 ? 450 : 0);
      r.fileLater = true;
      // dismiss: key, tap, button
      load(make(now - 11 * 60000)); await wait(450); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' })); r.byKey = !card();
      load(make(now - 11 * 60000)); await wait(450); window.dispatchEvent(new Event('pointerdown')); r.byTap = !card();
      load(make(now - 11 * 60000)); document.querySelector('#p11c-recap-go').click(); r.byBtn = !card();
      // empty logbook: still a card, still dismissable, never blocks
      G.journal = []; r.emptyShown = load(make(now - 11 * 60000)); r.emptyText = card() ? card().textContent : ''; r.stateOk = G.state === 'play'; C.hideRecap();
      // switch off
      C.cfg.recap = false; r.offShown = load(make(now - 11 * 60000)); C.cfg.recap = true;
      // a bad save throws before any card
      let threw = false; C.hideRecap(); try { restoreGame({ nope: 1 }); } catch (e) { threw = true; } r.badThrew = threw; r.badCard = !!card();
      return r;
    });
    check(!rc.fresh && !rc.nine && rc.eleven, 'recap: not for a fresh save or 9 minutes, yes after 11 minutes');
    check(!rc.noWhen && !rc.nan && !rc.future, 'recap: a save with no usable time stamp shows nothing');
    check(rc.file, 'recap: a load right after a file was read shows the card');
    check(/Previously/.test(rc.text) && /Oakhaven/.test(rc.text) && /Greenroot road/.test(rc.text) && !/<b>/.test(rc.html.replace(/<\/?(h3|p|ul|li|button)[^>]*>/g, '').replace(/&lt;b&gt;x&lt;\/b&gt;/g, '')), 'the card shows the place and the last entries, built with textContent');
    check(rc.byKey && rc.byTap && rc.byBtn, 'dismiss by any key, any tap, or the button');
    check(rc.emptyShown && /logbook is empty/.test(rc.emptyText) && rc.stateOk, 'an empty logbook still gets a short card and never blocks play');
    check(!rc.offShown && rc.badThrew && !rc.badCard, 'recap: off means no card; a damaged save shows none');

    // ---------------- 6. performance overlay
    const perfBefore = await page.evaluate(() => !!document.querySelector('#p11c-perf'));
    await page.keyboard.press('F10'); await page.waitForTimeout(1500);
    const pv = await page.evaluate(() => ({ el: document.querySelector('#p11c-perf')?.textContent || '', perf: Object.assign({}, CALENDAR11.perf), on: CALENDAR11.cfg.perf }));
    check(!perfBefore && pv.on && /Frame/.test(pv.el) && /FPS/.test(pv.el) && /Enemies/.test(pv.el), 'F10 shows the overlay: ' + pv.el.replace(/\n/g, ' / '));
    check(pv.perf.median > 0 && pv.perf.median < 500 && pv.perf.p95 >= pv.perf.median && pv.perf.fps > 1 && pv.perf.scale >= 1 && pv.perf.enemies >= 0 && pv.perf.lights >= 0 && pv.perf.particles >= 0, 'overlay numbers are sane: ' + JSON.stringify(pv.perf));
    const heap = await page.evaluate(() => !!performance.memory);
    check(!heap || (pv.perf.heapMB > 1 && /JS heap/.test(pv.el)), 'JS heap shown when performance.memory exists');
    const ring = await page.evaluate(() => { const C = CALENDAR11; for (let i = 0; i < 300; i++) C.perfFrame(1000 + i * 10, 2); return { n: C.ring.length, ok: C.pct([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5) }; });
    check(ring.n === 120 && ring.ok === 6, 'frame ring is 120 samples; percentile helper');
    await page.keyboard.press('F10'); await page.waitForTimeout(300);
    check(!(await page.evaluate(() => !!document.querySelector('#p11c-perf') || CALENDAR11.cfg.perf)), 'F10 again hides it');

    // ---------------- options rows at 640x400, creation picker, recap card and overlay fit
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(200);
    const fit = await page.evaluate(async () => {
      const r = {}; G.state = 'panel'; renderAccessibilityMenu(); await new Promise(res => setTimeout(res, 50));
      const p = document.querySelector('#modal-panel'); r.rows = ['c11-events-opt', 'c11-signs-opt', 'c11-recap-opt', 'c11-perf-opt'].map(id => !!document.getElementById(id));
      r.optOver = p.scrollWidth - p.clientWidth; document.getElementById('c11-perf-opt').click(); r.perfOn = CALENDAR11.cfg.perf; r.perfEl = !!document.querySelector('#p11c-perf');
      closeModal(); G.state = 'play'; return r;
    });
    check(fit.rows.every(Boolean) && fit.optOver <= 1, 'four option rows, no horizontal overflow at 640x400 (' + fit.optOver + ')');
    check(fit.perfOn, 'the options button turns the overlay on');
    await page.waitForTimeout(700);
    const fit2 = await page.evaluate(async () => {
      const r = {}, g = document.querySelector('#game').getBoundingClientRect(), box = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left - g.left, t: b.top - g.top, r: g.right - b.right, b: g.bottom - b.bottom, w: b.width, h: b.height }; };
      r.perf = box('#p11c-perf'); CALENDAR11.setPerf(false);
      G.journal = [{ cat: 'main', text: 'A long entry. '.repeat(30), day: 0 }, { cat: 'side', text: 'Two. '.repeat(30), day: 1 }, { cat: 'side', text: 'Three. '.repeat(30), day: 1 }];
      CALENDAR11.showRecap(); r.recap = box('#p11c-recap'); const c = document.querySelector('#p11c-recap'); r.recapOver = c.scrollWidth - c.clientWidth; CALENDAR11.hideRecap();
      return r;
    });
    check(fit2.perf && fit2.perf.l >= 0 && fit2.perf.t >= 0 && fit2.perf.r >= 0 && fit2.perf.w < 330, 'overlay is small and inside the frame at 640x400 ' + JSON.stringify(fit2.perf));
    check(fit2.recap && fit2.recap.l >= 0 && fit2.recap.t >= 0 && fit2.recap.r >= 0 && fit2.recap.b >= 0 && fit2.recapOver <= 1, 'recap card fits 640x400 ' + JSON.stringify(fit2.recap));
    // the creation picker at 640x400
    const C2 = await boot(browser, { width: 640, height: 400 });
    const cp = await C2.page.evaluate(() => { const p = document.querySelector('#create-panel'), s = document.querySelector('#p11c-sign').getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect(); const go = document.querySelector('#c-go').getBoundingClientRect(); return { over: p.scrollWidth - p.clientWidth, signR: g.right - s.right, signL: s.left - g.left, goB: g.bottom - go.bottom, goT: go.top - g.top, ph: p.scrollHeight, ch: p.clientHeight }; });
    check(cp.over <= 1 && cp.signR >= 0 && cp.signL >= 0, 'birth-sign picker fits 640x400 horizontally ' + JSON.stringify(cp));
    check(cp.goB >= 0 || cp.ph > cp.ch, 'Go button reachable at 640x400 (visible or the panel scrolls) ' + JSON.stringify(cp));
    if (SHOTS) await C2.page.screenshot({ path: SHOTS + '/creation-640.png' });
    check(C2.errors.length === 0, 'no page errors in compact creation');
    await C2.page.close();

    check(errors.length === 0, 'no page errors: ' + errors);
  } finally { await browser.close(); }
  if (fails.length) { console.log('FAIL calendar11: ' + fails.length + ' check(s)'); process.exit(1); }
  console.log('PASS calendar11');
})().catch(e => { console.error(e); process.exit(1); });
