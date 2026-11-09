// PREVIEW_URL=http://127.0.0.1:3302 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/couriers.test.js
// Phase 6 COURIERS: letters from the people you helped (js/couriers.js).
// Screenshots go to COURIERS_SHOTS (default: the OS temp dir), never into the repo.
'use strict';
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.COURIERS_SHOTS || path.join(os.tmpdir(), 'couriers-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3302');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof COURIERS !== 'undefined' && typeof READING !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Letter <b>Tester</b>');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(1200);
    const ev = (f, a) => page.evaluate(f, a);
    // a clean slate between sections; delivery moments are driven by hand with minWait 0
    const reset = (flags) => ev((fl) => { closeModal(); hide('#event'); G.state = 'play'; G.dead = false; G.flags = Object.assign({}, fl || {}); G.player.gold = 0; G.player.inv = G.player.inv.filter(s => !['bandage', 'herb_reed', 'whistle', 'tonic'].includes(s.id)); UPG.storyCouriers = true; COURIERS.state.minWait = 0; COURIERS.state.last = null; }, flags);

    // ---- basics: switch, table, held-document registration
    ok(await ev(() => UPG.storyCouriers === true && !GFX.FX.includes('storyCouriers')), 'switch defaults on and is not in GFX.FX');
    ok(await ev(() => !!document.getElementById('couriers-style')), 'module style injected');
    ok(await ev(() => COURIERS.LETTERS.length >= 12), '12+ letters (' + await ev(() => COURIERS.LETTERS.length) + ')');
    ok(await ev(() => COURIERS.LETTERS.every(L => READING.SOURCES[L.title] && READING.SOURCES[L.title].style === 'paper' && READING.SOURCES[L.title].kind === 'Letter')), 'every letter title is registered as a paper Letter');
    ok(await ev(() => new Set(COURIERS.LETTERS.map(L => L.id)).size === COURIERS.LETTERS.length && new Set(COURIERS.LETTERS.map(L => L.title)).size === COURIERS.LETTERS.length), 'letter ids and titles are unique');

    // ---- text: 60-180 words in every branch, branch-specific, no markup beyond <p>
    const SAMPLES = {
      orla: [{}], rooke: [{}], nell: [{}, { pim_tended: true }], pim: [{}, { pim_tended: true }],
      tam: [{ tam_told: true }, { tam_told: true, tam_sat: true }, { tam_left: true }],
      hob: [{}, { twins_named: true }], hetty: [{}, { vane_told: true }], vane: [{}, { hetty_paid: true }], tobiah: [{}],
      hew: [{}, { hew_home: true }], sable_ret: [{}, { sable_accused: true }], sable_kept: [{}],
      quist: [{}, { round_struck: true }, { quist_sable: true }, { round_struck: true, quist_sable: true }],
      halder: [{}, { halder_sat: true }], bettis: [{}], sexton: [{}, { bell_rung: true }],
    };
    const texts = await ev((S) => COURIERS.LETTERS.map(L => ({ id: L.id, variants: (S[L.id] || []).map(fl => { const t = L.text(fl); return { fl, html: t, words: t.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length }; }) })), SAMPLES);
    ok(texts.every(t => t.variants.length > 0), 'every letter has branch samples under test');
    const bad = texts.flatMap(t => t.variants.filter(v => v.words < 60 || v.words > 180).map(v => t.id + ' ' + JSON.stringify(v.fl) + ' ' + v.words));
    ok(bad.length === 0, 'every branch of every letter is 60-180 words' + (bad.length ? ': ' + bad.join('; ') : ''));
    ok(texts.every(t => t.variants.every(v => !/<(?!\/?p\b)/.test(v.html))), 'letter markup is only paragraphs');
    const distinct = texts.filter(t => t.variants.length > 1).every(t => new Set(t.variants.map(v => v.html)).size === t.variants.length);
    ok(distinct, 'every branch reads differently from the others');
    ok(await ev(() => /moved|did not move/.test(COURIERS.LETTERS.find(l => l.id === 'tam').text({ tam_told: true, tam_sat: true })) && /whole song/.test(COURIERS.LETTERS.find(l => l.id === 'tam').text({ tam_told: true })) && /coward/.test(COURIERS.LETTERS.find(l => l.id === 'tam').text({ tam_left: true }))), 'Tam: sat / told / left branches carry their own lines');
    ok(await ev(() => /tended|hummed it different/i.test(COURIERS.LETTERS.find(l => l.id === 'pim').text({ pim_tended: true })) && /the jar/.test(COURIERS.LETTERS.find(l => l.id === 'pim').text({}))), 'Pim: tended vs honey branch');
    ok(await ev(() => /Ned and Wyn/.test(COURIERS.LETTERS.find(l => l.id === 'hob').text({ twins_named: true })) && !/Ned and Wyn/.test(COURIERS.LETTERS.find(l => l.id === 'hob').text({}))), 'Hob: names the twins only if the player wrote them down');
    ok(await ev(() => /where you sat/.test(COURIERS.LETTERS.find(l => l.id === 'halder').text({ halder_sat: true })) && !/where you sat/.test(COURIERS.LETTERS.find(l => l.id === 'halder').text({}))), 'Halder: remembers who sat in the fourth chair');

    // ---- delivery rule: nothing without the deed; deed alone does nothing until a delivery moment
    await reset({});
    ok(await ev(() => COURIERS.tryDeliver('arrival') === null && COURIERS.deliveredLetters().length === 0), 'no deed, no letter (nothing is delivered for what was not done)');
    await reset({ boots_delivered: true });
    ok(await ev(() => COURIERS.eligible(COURIERS.LETTERS.find(l => l.id === 'orla')) && !COURIERS.eligible(COURIERS.LETTERS.find(l => l.id === 'rooke'))), 'eligibility follows the deed flags (Rooke also needs his own thanks)');
    // real minWait: a deed noticed just now cannot be answered on the same breath
    await ev(() => { COURIERS.state.minWait = 45; for (const k in COURIERS.state) { /* keep */ } });
    const early = await ev(() => { COURIERS.stamp(); return COURIERS.tryDeliver('arrival'); });
    ok(early === null, 'a fresh deed is not answered on the same breath (minWait)');
    const later = await ev(() => { G.time += 46; return COURIERS.tryDeliver('arrival'); });
    ok(later === 'orla', 'after the wait the next delivery moment brings it');
    // a real area change is a delivery moment
    await reset({ tobiah_met: true });
    const viaMap = await ev(() => { G.time += 1; const here = G.mapId; loadMap(here); return COURIERS.deliveredLetters().map(l => l.id); });
    ok(JSON.stringify(viaMap) === '["tobiah"]', 'arriving in an area delivers (loadMap wrapper)');
    // a rest is a delivery moment
    await reset({ vane_told: true });
    const viaRest = await ev(() => { G.time += 1; COURIERS.stamp(); G.time += 1; doRest('self'); return COURIERS.deliveredLetters().map(l => l.id); });
    ok(JSON.stringify(viaRest) === '["vane"]', 'finishing a rest delivers (doRest wrapper)');
    // the day turning over is a delivery moment (polled)
    await reset({ hob_told: true });
    const viaDay = await ev(async () => { COURIERS.tick(); COURIERS.stamp(); G.day += 1; COURIERS.tick(); return COURIERS.deliveredLetters().map(l => l.id); });
    ok(JSON.stringify(viaDay) === '["hob"]', 'the day turning over delivers');
    // one per moment; several deeds trickle
    await reset({ hob_told: true, vane_told: true, tobiah_met: true, boots_delivered: true });
    const trickle = await ev(() => { const out = []; for (let i = 0; i < 6; i++) out.push(COURIERS.tryDeliver('arrival')); return out; });
    ok(trickle.filter(Boolean).length === 4 && trickle.slice(4).every(x => x === null) && trickle.slice(0, 4).every(Boolean), 'one letter per moment, then no more: ' + JSON.stringify(trickle));
    // nothing while a panel / event / death screen is up
    await reset({ vane_told: true });
    ok(await ev(() => { G.state = 'panel'; const a = COURIERS.tryDeliver('arrival'); G.state = 'event'; const b = COURIERS.tryDeliver('arrival'); G.state = 'play'; G.dead = true; const c = COURIERS.tryDeliver('arrival'); G.dead = false; return a === null && b === null && c === null && COURIERS.tryDeliver('arrival') === 'vane'; }), 'letters wait while a panel, event or death screen is up, then arrive');
    // the courier says so, and names the sender
    await reset({ vane_told: true });
    const line = await ev(() => { COURIERS.tryDeliver('arrival'); return [...document.querySelectorAll('#msgs *')].map(n => n.textContent).join('|'); });
    ok(/A courier has found you with a letter from Captain Vane/.test(line) && /ten sovereigns enclosed/.test(line), 'a courier message announces the letter and its gift');

    // ---- sender gone / not yet in reach
    await reset({ boots_delivered: true, rite_started: true });
    ok(await ev(() => COURIERS.tryDeliver('arrival') === null), 'Oakhaven letters stop once the Rite has begun');
    for (const fl of [{ greening: true }, { escaped: true }, { part3: true }]) {
      await reset(Object.assign({ boots_delivered: true, hob_told: true }, fl));
      ok(await ev(() => COURIERS.tryDeliver('arrival') === null), 'no Oakhaven letter once ' + Object.keys(fl)[0]);
    }
    await reset({ sexton_rest: true, halder_rest: true, quist_press: true, bettis_kept_awake: true });
    ok(await ev(() => COURIERS.tryDeliver('arrival') === null), 'road letters do not arrive before Part Three');
    await reset({ part3: true, halder_rest: true, halder_dead: true });
    ok(await ev(() => COURIERS.tryDeliver('arrival') === null), 'a dead Halder writes no letter');
    await reset({ part3: true, bettis_kept_awake: true, bettis_put_back: true });
    ok(await ev(() => COURIERS.tryDeliver('arrival') === null), 'Bettis who was put back writes no letter');
    await reset({ part3: true, halder_rest: true, quist_press: true, sexton_rest: true, bettis_kept_awake: true });
    ok(await ev(() => { const a = []; for (let i = 0; i < 5; i++) a.push(COURIERS.tryDeliver('arrival')); return a.filter(Boolean).sort().join() === 'bettis,halder,quist,sexton'; }), 'all four road letters arrive in Part Three');
    // a killed named NPC in any map cancels their letter
    await reset({ hob_told: true });
    ok(await ev(() => { const hob = Object.values(G.maps).flatMap(m => m.entities).find(e => e.id === 'hob'); if (!hob) return 'nohob'; hob.dead = true; const r = COURIERS.tryDeliver('arrival'); hob.dead = false; return r; }) === null, 'a dead sender sends nothing');

    // ---- gifts: right size, right branch, once
    await reset({ vane_told: true });
    await ev(() => { COURIERS.tryDeliver('arrival'); });
    ok(await ev(() => G.player.gold === 10), 'Vane\'s ten sovereigns arrive with the letter');
    await ev(() => { COURIERS.tryDeliver('arrival'); COURIERS.tryDeliver('rest'); COURIERS.tick(); });
    ok(await ev(() => G.player.gold === 10), 'the gift is given once, however many moments pass');
    await reset({ pim_safe: true, pim_tended: true });
    await ev(() => { COURIERS.tryDeliver('a'); COURIERS.tryDeliver('b'); });
    ok(await ev(() => G.player.gold === 8 && G.has('herb_reed')), 'tended branch: Nell\'s eight sovereigns and Pim\'s reed');
    await reset({ pim_safe: true });
    await ev(() => { COURIERS.tryDeliver('a'); COURIERS.tryDeliver('b'); });
    ok(await ev(() => G.player.gold === 0 && G.has('herb_reed')), 'honey branch: no coin from Nell (she already paid), Pim\'s reed only');
    ok(await ev(() => COURIERS.LETTERS.every(L => { const gs = [{}, { pim_tended: true, hew_home: true, tam_sat: true, tam_told: true, bell_rung: true }].map(f => L.gift(f)).filter(Boolean); return gs.every(g => (!g.gold || g.gold <= 12) && (!g.item || ['bandage', 'herb_reed', 'whistle', 'tonic'].includes(g.item))); })), 'no gift is larger than 12 sovereigns or more than a bandage, tonic, whistle or herb (never quest items)');
    await reset({ part3: true, sexton_rest: true, bell_rung: true });
    await ev(() => { COURIERS.tryDeliver('a'); });
    ok(await ev(() => G.player.gold === 9), 'the sexton\'s tolling fee only comes if you rang the bell');
    await reset({ part3: true, sexton_rest: true });
    await ev(() => { COURIERS.tryDeliver('a'); });
    ok(await ev(() => G.player.gold === 0 && COURIERS.delivered(COURIERS.LETTERS.find(l => l.id === 'sexton'))), 'no bell, no fee, but the letter still comes');

    // ---- no duplicates across save / load
    await reset({ boots_delivered: true, hob_told: true, vane_told: true });
    const saved = await ev(() => { COURIERS.tryDeliver('a'); COURIERS.tryDeliver('b'); COURIERS.tryDeliver('c'); const snap = JSON.parse(JSON.stringify(snapshotGame())); return { snap, gold: G.player.gold, ids: COURIERS.deliveredLetters().map(l => l.id) }; });
    ok(saved.ids.length === 3, 'three letters delivered before the save');
    const after = await ev((s) => { restoreGame(JSON.parse(JSON.stringify(s.snap))); COURIERS.state.minWait = 0; for (let i = 0; i < 5; i++) COURIERS.tryDeliver('arrival'); COURIERS.tick(); return { gold: G.player.gold, ids: COURIERS.deliveredLetters().map(l => l.id) }; }, saved);
    ok(JSON.stringify(after.ids) === JSON.stringify(saved.ids) && after.gold === saved.gold, 'after save/load: same letters, no re-delivery, no second gift');
    ok(await ev(() => ['p6c_orla', 'p6c_hob', 'p6c_vane'].every(k => G.flags[k] === 1) && Object.keys(G.flags).filter(k => k.startsWith('p6c_')).every(k => G.flags[k] === 1)), 'delivery state is only p6c_ flags holding 1');
    // an old save without any p6c_ flags still loads and shows no Letters
    await ev(() => { const d = JSON.parse(JSON.stringify(snapshotGame())); for (const k of Object.keys(d.flags)) if (k.startsWith('p6c_')) delete d.flags[k]; d.flags = { rite_ready: true }; restoreGame(d); G.state = 'panel'; renderLog(); });
    ok(await ev(() => !document.querySelector('.p6c-letters') && typeof COURIERS.deliveredLetters().length === 'number'), 'an old save without p6c_ flags loads and the logbook has no Letters section');
    await ev(() => { closeModal(); G.state = 'play'; });

    // ---- hostile flag values
    const HOSTILE = ['<img src=x onerror=alert(1)>', '1', 'true', 2, -1, 1e9, NaN, Infinity, {}, [], [1], null, undefined, '__proto__', { toString: 'x' }, 0, false];
    let hostileOk = true, hostileWhy = '';
    for (const v of HOSTILE) {
      await reset({ hob_told: true });
      const r = await ev((hv) => {
        const V = hv === 'NaN' ? NaN : hv === 'Infinity' ? Infinity : hv === 'undef' ? undefined : hv;
        G.flags.p6c_hob = V; G.flags.p6c_orla = V; G.flags.p6c_sexton = V; G.flags.p6c_nothing = V;
        const before = COURIERS.deliveredLetters().map(l => l.id).join();
        const id = COURIERS.tryDeliver('arrival');
        G.state = 'panel'; renderLog();
        const panel = document.querySelector('#modal-panel');
        const bad = panel.querySelectorAll('script, [onerror], img:not([src^="data:image/"]):not([src^="img/painted/"])').length;
        const out = { before, id, bad, after: COURIERS.deliveredLetters().map(l => l.id).join(), flag: G.flags.p6c_hob };
        closeModal(); G.state = 'play'; return out;
      }, typeof v === 'number' && isNaN(v) ? 'NaN' : v === Infinity ? 'Infinity' : v === undefined ? 'undef' : v);
      // only a flag that is exactly 1 / true counts as delivered; any other value is replaced by 1 on delivery
      const strict = v === true || v === 1;
      if (r.bad) { hostileOk = false; hostileWhy += ' markup:' + JSON.stringify(v); }
      if (!strict && r.id !== 'hob') { hostileOk = false; hostileWhy += ' undelivered:' + JSON.stringify(v); }
      if (!strict && r.flag !== 1) { hostileOk = false; hostileWhy += ' notreplaced:' + JSON.stringify(v); }
    }
    ok(hostileOk, 'hostile p6c_ flag values (strings, objects, NaN, negatives, huge numbers) never show markup, never count as delivered, and are replaced by 1' + hostileWhy);
    // hostile values on letters that were not earned: still never shown as a letter the deed does not allow
    await reset({});
    ok(await ev(() => { G.flags.p6c_hob = '<b>x</b>'; G.flags.p6c_vane = {}; G.flags.hob_told = '<script>x</script>'; return COURIERS.tryDeliver('arrival') === 'hob' && !document.querySelector('#msgs script, #msgs b'); }), 'a hostile deed-flag value is only ever tested for truthiness; nothing of it is displayed');
    // hostile flags object
    ok(await ev(() => { const keep = G.flags; G.flags = null; const a = COURIERS.tryDeliver('x'); COURIERS.tick(); G.flags = 'str'; const b = COURIERS.tryDeliver('x'); G.flags = keep; return a === null && b === null; }), 'a missing or non-object flags table is survived');

    // ---- Letters in the logbook, reading, compact fit
    await reset({ boots_delivered: true, rooke_thanks: true, pim_safe: true, pim_tended: true, tam_told: true, tam_sat: true, hob_told: true, twins_named: true, hetty_paid: true, vane_told: true, tobiah_met: true, sable_returned: true, sable_accused: true, hew_thanked: true, hew_home: true });
    await ev(() => { COURIERS.tryDeliver; for (let i = 0; i < 20; i++) COURIERS.tryDeliver('arrival'); G.flags.part3 = true; delete G.flags.escaped; });
    await ev(() => { Object.assign(G.flags, { part3: true, quist_press: true, round_struck: true, quist_sable: true, halder_rest: true, halder_sat: true, bettis_kept_awake: true, sexton_rest: true, bell_rung: true, sable_kept: true }); for (let i = 0; i < 20; i++) COURIERS.tryDeliver('arrival'); });
    const nd = await ev(() => COURIERS.deliveredLetters().length);
    ok(nd >= 12, 'at least twelve letters can be earned and kept in one playthrough state (' + nd + ')');
    await ev(() => { G.journal = [{ cat: 'main', text: 'Harrow has unbarred the North Gate for me.', day: 0 }, { cat: 'side', text: 'Old Tam listens to his dead wife\'s voice on the Flume.', day: 1 }]; G.state = 'panel'; renderLog(); });
    const sec = await ev(() => { const w = document.querySelector('.p6c-letters'); return w && { n: w.querySelectorAll('button').length, h: w.querySelector('h3').textContent, txt: w.textContent.length }; });
    ok(sec && sec.h === 'Letters' && sec.n === nd, 'the logbook has a Letters section listing every delivered letter');
    await page.screenshot({ path: path.join(SHOTS, 'couriers-log-1280.png') });
    await page.setViewportSize({ width: 640, height: 400 });
    const fit = await ev(() => { const p = document.querySelector('#modal-panel'), b = p.getBoundingClientRect(); const btn = document.querySelector('.p6c-btn'); btn.scrollIntoView({ block: 'nearest' }); const r = btn.getBoundingClientRect(); return { inside: b.left >= 0 && b.right <= innerWidth && b.bottom <= innerHeight + 1, noH: p.scrollWidth <= p.clientWidth + 1, btnVisible: r.top >= 0 && r.bottom <= innerHeight, btnsWide: [...document.querySelectorAll('.p6c-btn')].every(x => x.scrollWidth <= x.clientWidth + 1) }; });
    ok(fit.inside && fit.noH && fit.btnVisible && fit.btnsWide, 'compact 640x400: logbook with sixteen letters has no horizontal overflow and its buttons are reachable ' + JSON.stringify(fit));
    await ev(() => { document.querySelector('#modal-panel').scrollTop = 99999; });
    await page.screenshot({ path: path.join(SHOTS, 'couriers-log-640.png') });
    // open one as a held paper document, then return to the logbook
    await ev(() => document.querySelector('.p6c-btn[data-letter="tam"]').click());
    await page.waitForTimeout(400);
    const held = await ev(() => ({ kind: (document.querySelector('.hd-kicker') || {}).textContent, title: (document.querySelector('.hd-title') || {}).textContent, paper: !!document.querySelector('.hd-sheet.hd-paper'), state: G.state, sig: !!document.querySelector('.hd-body .p6c-sig') }));
    ok(held.kind === 'Letter' && held.title === 'Letter from Old Tam' && held.paper && held.state === 'event' && held.sig, 'a letter opens as a held paper Letter ' + JSON.stringify(held));
    await page.screenshot({ path: path.join(SHOTS, 'couriers-letter-640.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'couriers-letter-1280.png') });
    await ev(() => READING.choose(0));
    await page.waitForTimeout(200);
    ok(await ev(() => G.state === 'panel' && !!document.querySelector('.p6c-letters') && document.querySelector('#event').classList.contains('hidden')), 'folding the letter away returns to the logbook');
    await ev(() => { closeModal(); G.state = 'play'; });
    // with held documents off the letter is the normal panel and still reads
    await ev(() => { GFX.heldDocs = false; COURIERS.openLetter(COURIERS.LETTERS.find(l => l.id === 'hob'), false); });
    ok(await ev(() => !document.querySelector('.hd-sheet') && /Ned and Wyn/.test(document.querySelector('#event-panel').textContent)), 'with held documents off the letter opens in the ordinary panel');
    await ev(() => { hide('#event'); G.state = 'play'; GFX.heldDocs = true; });
    // every letter opens without errors
    const opened = await ev(() => { const out = []; for (const L of COURIERS.LETTERS) { COURIERS.openLetter(L, false); out.push(!!document.querySelector('.hd-sheet') && document.querySelector('.hd-title').textContent === L.title); READING.choose(0); } G.state = 'play'; return out; });
    ok(opened.every(Boolean), 'all ' + opened.length + ' letters open as held documents');

    // ---- switch off = the original game: no letters, no gifts, no section, no message
    await reset({ boots_delivered: true, vane_told: true });
    await ev(() => { UPG.storyCouriers = false; });
    const off = await ev(() => { const r = []; for (let i = 0; i < 3; i++) r.push(COURIERS.tryDeliver('arrival')); COURIERS.tick(); G.time += 100; const k = loadMap(G.mapId); doRest('self'); G.state = 'panel'; renderLog(); return { r, gold: G.player.gold, flags: Object.keys(G.flags).filter(k => k.startsWith('p6c_')), section: !!document.querySelector('.p6c-letters') }; });
    ok(off.r.every(x => x === null) && off.gold === 0 && off.flags.length === 0 && !off.section, 'switch off: no letters, no gifts, no flags, no Letters section');
    await ev(() => { closeModal(); G.state = 'play'; });
    // delivered letters already in the save stay hidden while off, and come back when on again
    await ev(() => { UPG.storyCouriers = true; COURIERS.state.minWait = 0; COURIERS.tryDeliver('arrival'); UPG.storyCouriers = false; G.state = 'panel'; renderLog(); });
    ok(await ev(() => !document.querySelector('.p6c-letters')), 'switch off hides earlier letters too (original logbook)');
    await ev(() => { closeModal(); G.state = 'play'; UPG.storyCouriers = true; G.state = 'panel'; renderLog(); });
    ok(await ev(() => !!document.querySelector('.p6c-letters')), 'switch back on shows them again');
    await ev(() => { closeModal(); G.state = 'play'; });
    await ev(() => { delete UPG.storyCouriers; GFX.storyCouriers = false; });
    ok(await ev(() => COURIERS.on() === false), 'GFX.storyCouriers = false also switches it off');
    await ev(() => { delete GFX.storyCouriers; UPG.storyCouriers = true; });

    // ---- the poll runs on its own and survives a real minute of play-time
    await reset({ hob_told: true });
    await ev(() => { COURIERS.state.minWait = 45; });
    await page.waitForTimeout(1300);
    ok(await ev(() => COURIERS.state.last === null && !COURIERS.deliveredLetters().length), 'the background poll alone never delivers mid-day (only the three moments do)');

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log(fails ? 'FAIL couriers: ' + fails + ' failing' : 'PASS couriers: all checks passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
