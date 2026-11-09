// PREVIEW_URL=http://127.0.0.1:3305 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/epilogue.test.js
// Phase 6 EPILOGUE: Kaelen/Lyra ending epilogues by flag combination, and the Organum / Iron Peaks / Rift lore teasers.
// Screenshots go to EPILOGUE_SHOTS (default: the OS temp dir), never into the repo.
'use strict';
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.EPILOGUE_SHOTS || path.join(os.tmpdir(), 'epilogue-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3305');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined' && typeof EPILOGUE !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reader');
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

// ---- the cases: [kind, who, flags, ctx, expected base id, expected suffix ids]
const P2K = [
  ['no Kaelen meeting', {}, {}, 'k2_unmet', []],
  ['unmet beats charts', {}, { charts: true }, 'k2_unmet', []],
  ['charts', { kaelen_met: 1 }, { charts: true }, 'k2_charts', []],
  ['charts beat glass', { kaelen_met: 1 }, { charts: true, glassed: true, glass: 90 }, 'k2_charts', []],
  ['deep glass', { kaelen_met: 1 }, { glassed: true, glass: 80 }, 'k2_glass_deep', []],
  ['shallow glass', { kaelen_met: 1 }, { glassed: true, glass: 30 }, 'k2_glass', []],
  ['plain', { kaelen_met: 1 }, {}, 'k2_plain', []],
  ['plain + Hedge answered', { kaelen_met: 1, hedge_answered: 1 }, {}, 'k2_plain', ['k2_h_answered']],
  ['charts + Hedge silent', { kaelen_met: 1, hedge_silent: 1 }, { charts: true }, 'k2_charts', ['k2_h_silent']],
  ['glass + Hedge listened', { kaelen_met: 1, hedge_listened: 1 }, { glassed: true, glass: 10 }, 'k2_glass', ['k2_h_listened']],
];
const P2L = [
  ['blade', { tobin_417_done: 1 }, {}, 'l2_blade', []],
  ['blade beats boots', { tobin_417_done: 1, boots_delivered: 1, pim_safe: 1 }, {}, 'l2_blade', []],
  ['boots + Pim', { boots_delivered: 1, pim_safe: 1 }, {}, 'l2_orla_pim', []],
  ['boots', { boots_delivered: 1 }, {}, 'l2_boots', []],
  ['Pim tended by you', { pim_safe: 1, pim_tended: 1 }, {}, 'l2_pim_tended', []],
  ['Pim by honey', { pim_safe: 1 }, {}, 'l2_pim', []],
  ['plain', {}, {}, 'l2_plain', []],
  ['plain + Hedge answered', { hedge_answered: 1 }, {}, 'l2_plain', ['l2_h_answered']],
  ['boots + Hedge silent', { boots_delivered: 1, hedge_silent: 1 }, {}, 'l2_boots', ['l2_h_silent']],
];
const B1K = [
  ['told in the Malting, travelled with him', { part4: 1, folder_given: 1, p6e_ride_k: true }, {}, 'kb_told_with', []],
  ['told at the fire', { part4: 1, kaelen_told_now: 1 }, {}, 'kb_told', []],
  ['told + went down', { part4: 1, folder_given: 1, p6e_down_k: true }, {}, 'kb_told', ['kb_s_down']],
  ['folder still in the pack', { part4: 1 }, { folder: true }, 'kb_kept', []],
  ['folder kept, hurt', { part4: 1, folder_kept: 1, p6e_hurt_k: true }, {}, 'kb_kept', ['kb_s_hurt']],
  ['folder kept, travelled', { part4: 1, folder_kept: 1, p6e_ride_k: true }, {}, 'kb_kept', ['kb_s_ride']],
  ['never found it', { part4: 1 }, {}, 'kb_none', []],
  ['never found it, travelled and went down', { part4: 1, p6e_ride_k: true, p6e_down_k: true }, {}, 'kb_none', ['kb_s_down']],
];
const B1L = [
  ['you sang the coda', { part4: 1, coda_done: 1, coda_by_you: 1 }, {}, 'lb_you_sang', []],
  ['you sang against her father', { part4: 1, coda_done: 1, coda_by_you: 1, wearer_coda_dead: 1 }, {}, 'lb_you_sang', []],
  ['she sang against the Wearer', { part4: 1, coda_done: 1, wearer_coda_dead: 1 }, {}, 'lb_sang_wearer', []],
  ['she sang against the Requiem', { part4: 1, coda_done: 1 }, {}, 'lb_sang_req', []],
  ['coda not sung', { part4: 1 }, {}, 'lb_pending', []],
  ['no Part Four', {}, {}, 'lb_p3', []],
  ['tended + Wren (two suffixes)', { part4: 1, coda_done: 1, p6e_tend_l: true, wren_saved: 1, p6e_ride_l: true }, {}, 'lb_sang_req', ['lb_s_tend', 'lb_s_wren']],
  ['Wren taken + blade', { part4: 1, coda_done: 1, wren_taken: 1, tobin_417_done: 1 }, {}, 'lb_sang_req', ['lb_s_taken', 'lb_s_blade']],
  ['went down + travelled', { part4: 1, coda_done: 1, p6e_down_l: true, p6e_ride_l: true }, {}, 'lb_sang_req', ['lb_s_down', 'lb_s_ride']],
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser, { width: 1280, height: 800 });
    ok(await page.evaluate(() => typeof EPILOGUE === 'object' && EPILOGUE.enabled() === true && UPG.storyEpilogues === true), 'EPILOGUE loads with UPG.storyEpilogues on by default');

    // helper inside the page: reset flags, run an ending, report the epilogue paragraphs and the whole panel
    await page.evaluate(() => {
      window.__run = (kind, flags, ctx, on) => {
        UPG.storyEpilogues = !!on;
        for (const k of Object.keys(G.flags)) delete G.flags[k];
        Object.assign(G.flags, flags);
        G.player.glassed = !!ctx.glassed; G.player.glass = ctx.glass || 0;
        while (G.has('charts')) G.take('charts'); if (ctx.charts) G.give('charts');
        while (G.has('folder')) G.take('folder'); if (ctx.folder) G.give('folder');
        hide('#ending'); G.state = 'play'; G.runs = 0;
        if (kind === 'p2') ending(); else bookOneEnd();
        const box = document.getElementById('ending-text');
        const epi = [...box.querySelectorAll('.p6e-epi')];
        const clone = box.cloneNode(true); clone.querySelectorAll('.p6e-epi').forEach(n => n.remove());
        return { ids: epi.map(p => p.dataset.p6e), texts: epi.map(p => p.textContent), htmlWithout: clone.innerHTML, html: box.innerHTML,
          title: document.getElementById('ending-title').textContent, part3Hidden: document.getElementById('btn-part3').classList.contains('hidden'),
          btns: [...document.querySelectorAll('#ending button')].map(b => b.id + ':' + b.textContent), lastIsMuted: !!box.lastElementChild.querySelector('.muted'),
          epiBeforeLast: epi.length ? epi[epi.length - 1].nextElementSibling === box.lastElementChild : true, epiCount: epi.length, epiHtml: epi.map(p => p.innerHTML) };
      };
    });

    // ---- 1. each epilogue variant appears exactly for its flag combination ----
    const groups = [['p2', 'kaelen', P2K], ['p2', 'lyra', P2L], ['b1', 'kaelen', B1K], ['b1', 'lyra', B1L]];
    const allTexts = await page.evaluate(() => { const o = {}; for (const k of Object.keys(EPILOGUE.TABLE)) for (const w of Object.keys(EPILOGUE.TABLE[k])) { const T = EPILOGUE.TABLE[k][w]; o[k + '.' + w] = { base: T.base.map(v => [v.id, v.text]), suffix: T.suffix.map(v => [v.id, v.text]) }; } return o; });
    let variantsSeen = {};
    for (const [kind, who, cases] of groups) {
      const T = allTexts[kind + '.' + who];
      for (const [label, flags, ctx, baseId, sufIds] of cases) {
        const other = who === 'kaelen' ? 'lyra' : 'kaelen';
        // the other character's flags are left at defaults; only this character's paragraph is judged
        const r = await page.evaluate(([k, f, c]) => window.__run(k, f, c, true), [kind, flags, ctx]);
        const idx = who === 'kaelen' ? 0 : 1;
        ok(r.ids.length === 2 && r.ids[idx] === baseId, `${kind} ${who}: ${label} -> ${baseId} (got ${r.ids[idx]})`);
        variantsSeen[kind + who + baseId] = true;
        const txt = r.texts[idx];
        const baseText = T.base.find(b => b[0] === baseId)[1];
        const wantSuf = sufIds.map(id => T.suffix.find(s => s[0] === id)[1]);
        ok(txt === [baseText].concat(wantSuf).join(' '), `${kind} ${who}: ${label}: text is the base plus exactly the expected sentences`);
        const strays = T.base.filter(b => b[0] !== baseId && txt.includes(b[1])).length + T.suffix.filter(s => !sufIds.includes(s[0]) && txt.includes(s[1])).length;
        ok(strays === 0, `${kind} ${who}: ${label}: no other variant leaks in`);
      }
    }
    const nBase = (kind, who) => allTexts[kind + '.' + who].base.length;
    ok(nBase('p2', 'kaelen') >= 4 && nBase('p2', 'lyra') >= 4 && nBase('b1', 'kaelen') >= 4 && nBase('b1', 'lyra') >= 4, 'at least four variants per character per ending');
    ok(Object.keys(variantsSeen).length === nBase('p2', 'kaelen') + nBase('p2', 'lyra') + nBase('b1', 'kaelen') + nBase('b1', 'lyra'), 'every base variant was reached by a case: ' + Object.keys(variantsSeen).length);
    // every suffix sentence reached
    const sufUsed = new Set([...P2K, ...P2L, ...B1K, ...B1L].flatMap(c => c[4]));
    const sufAll = ['p2', 'b1'].flatMap(k => ['kaelen', 'lyra'].flatMap(w => allTexts[k + '.' + w].suffix.map(s => s[0])));
    ok(sufAll.every(id => sufUsed.has(id)), 'every suffix sentence was reached by a case');

    // ---- 2. existing ending untouched ----
    for (const [kind, flags, ctx] of [['p2', { kaelen_met: 1, hedge_answered: 1, boots_delivered: 1, twins_named: 1, sable_returned: 1 }, { charts: true, glassed: true, glass: 75 }], ['b1', { part4: 1, coda_done: 1, folder_given: 1, wearer_coda_dead: 1, aegis_calmed: 1 }, { glassed: true, glass: 20 }]]) {
      const on = await page.evaluate(([k, f, c]) => window.__run(k, f, c, true), [kind, flags, ctx]);
      const off = await page.evaluate(([k, f, c]) => window.__run(k, f, c, false), [kind, flags, ctx]);
      ok(off.epiCount === 0 && !/p6e/.test(off.html), `${kind}: switch off adds no paragraph`);
      ok(on.htmlWithout === off.html, `${kind}: with the section removed the ending HTML is byte-identical to the switch-off ending`);
      ok(on.title === off.title && on.part3Hidden === off.part3Hidden && JSON.stringify(on.btns) === JSON.stringify(off.btns), `${kind}: title, buttons and Part Three button unchanged`);
      ok(on.epiCount === 2 && on.lastIsMuted && on.epiBeforeLast, `${kind}: two paragraphs, placed just above the closing "Here ends" line`);
    }

    // ---- 3. the Part Four companion flags are written by the wrapped party functions ----
    const pf = await page.evaluate(() => {
      const o = {}; UPG.storyEpilogues = true;
      for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.part4 = true; G.party = null;
      partyJoin('kaelen'); o.rideK = G.flags.p6e_ride_k === true && !G.flags.p6e_ride_l;
      partyBark('selfhurt'); o.hurtK = G.flags.p6e_hurt_k === true;
      partyDowned(); o.downK = G.flags.p6e_down_k === true;
      partyJoin('lyra'); o.rideL = G.flags.p6e_ride_l === true;
      partyBark('hurt'); o.tendL = G.flags.p6e_tend_l === true;
      partyDowned(); o.downL = G.flags.p6e_down_l === true;
      o.valuesBool = Object.keys(G.flags).filter(k => k.startsWith('p6e_')).every(k => G.flags[k] === true);
      for (const k of Object.keys(G.flags)) if (k.startsWith('p6e_')) delete G.flags[k]; G.party = null; partyRemoveEnt();
      UPG.storyEpilogues = false; G.party = null; partyJoin('kaelen'); partyBark('selfhurt'); o.offClean = !Object.keys(G.flags).some(k => k.startsWith('p6e_'));
      UPG.storyEpilogues = true; G.party = null; partyRemoveEnt(); delete G.flags.part4;
      return o;
    });
    ok(pf.rideK && pf.hurtK && pf.downK, 'Kaelen: travelled, low-health hum and downed are remembered as p6e_ flags');
    ok(pf.rideL && pf.tendL && pf.downL, 'Lyra: travelled, tending note and downed are remembered as p6e_ flags');
    ok(pf.valuesBool, 'every p6e_ flag is a boolean');
    ok(pf.offClean, 'switch off: no p6e_ flag is written');

    // ---- 4. lore teasers: counts, word counts ----
    const tz = await page.evaluate(() => {
      const wc = (s) => s.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      const reg = {}; for (const v of EPILOGUE.VOLUMES) (reg[v.region] = reg[v.region] || []).push({ id: v.id, w: wc(v.text), title: v.title });
      return { reg, codex: EPILOGUE.CODEX.map(c => [c.region, wc(c.text)]), margin: Object.fromEntries(Object.entries(EPILOGUE.MARGIN).map(([k, a]) => [k, a.map(wc)])),
        sources: EPILOGUE.VOLUMES.every(v => READING.SOURCES[v.title] && READING.SOURCES[v.title].kind) };
    });
    for (const r of ['o', 'p', 'r']) {
      const L = tz.reg[r];
      ok(L.length >= 3 && L.every(v => v.w >= 40 && v.w <= 120), `region ${r}: ${L.length} volumes, words ${L.map(v => v.w).join('/')} (40-120)`);
    }
    ok(tz.codex.length === 3 && tz.codex.every(c => c[1] >= 40 && c[1] <= 120), 'codex stubs: one per region, 40-120 words: ' + tz.codex.map(c => c[1]).join('/'));
    ok(Object.values(tz.margin).every(a => a.length >= 2 && a.every(n => n >= 8)), 'map margin notes: two per region');
    ok(tz.sources, 'every volume is registered as a held document');

    // ---- 5. teasers reachable: shelves, held sheet, flags, codex, map ----
    const shelf = await page.evaluate(() => {
      UPG.storyEpilogues = true; GFX.heldDocs = true; const out = [];
      for (const v of EPILOGUE.VOLUMES) {
        loadMap(v.map);
        const sh = G.map.entities.filter(e => e.sprite === 'shelf'), e = sh[v.ord];
        const res = { id: v.id, found: !!e && e.use === 'lore_shelf' && e.bookIdx === EPILOGUE.BASE + EPILOGUE.VOLUMES.indexOf(v) && /Bookshelf: "/.test(e.label), orig: sh[0] && (v.ord === 0 || sh[0].bookIdx < 1000) };
        useDeco(e);
        res.title = !!document.querySelector('#event-panel .hd-title') && document.querySelector('#event-panel .hd-title').textContent === v.title;
        res.sheet = READING.state().open;
        res.body = document.querySelector('#event-panel .hd-body') ? document.querySelector('#event-panel .hd-body').textContent.length > 100 : false;
        res.flag = G.flags['p6e_rd_' + v.id] === true;
        READING.dismiss(); hide('#event'); G.state = 'play';
        out.push(res);
      }
      return out;
    });
    for (const s of shelf) ok(s.found && s.title && s.sheet && s.body && s.flag && s.orig, `shelf volume ${s.id} is reachable on its shelf and opens as a held sheet`);
    const kept = await page.evaluate(() => { loadMap('greenhall'); const a = G.map.entities.filter(e => e.sprite === 'shelf').map(e => e.bookIdx); loadMap('malting'); const b = G.map.entities.filter(e => e.sprite === 'shelf').map(e => e.bookIdx); return { a, b }; });
    ok(kept.a[0] === 2 && kept.b[0] === 1, 'the first shelf in each library keeps its original book (' + kept.a[0] + ', ' + kept.b[0] + ')');
    const plainPanel = await page.evaluate(() => { GFX.heldDocs = false; loadMap('quarry'); const e = G.map.entities.find(x => x.sprite === 'shelf'); useDeco(e); const r = { panel: /Harness|Memorandum/.test(document.querySelector('#event-panel h2').textContent), sheet: READING.state().open }; hide('#event'); G.state = 'play'; GFX.heldDocs = true; return r; });
    ok(plainPanel.panel && !plainPanel.sheet, 'held documents off: the volume opens in the normal panel');

    // codex
    const cx = await page.evaluate(() => {
      for (const k of Object.keys(G.flags)) if (k.startsWith('p6e_rd_')) delete G.flags[k];
      renderCodexModal('codex'); const none = document.querySelectorAll('.p6e-codex').length;
      const o = EPILOGUE.VOLUMES.find(v => v.region === 'o'); G.flags['p6e_rd_' + o.id] = true;
      renderCodexModal('codex'); const one = [...document.querySelectorAll('div.p6e-codex')].map(d => d.textContent);
      renderCodexModal('bestiary'); const other = document.querySelectorAll('.p6e-codex').length;
      for (const v of EPILOGUE.VOLUMES) G.flags['p6e_rd_' + v.id] = true;
      renderCodexModal('codex'); const all = document.querySelectorAll('div.p6e-codex').length;
      closeModal(); G.state = 'play';
      return { none, one, other, all };
    });
    ok(cx.none === 2 && cx.one.length === 1 && /Organum/.test(cx.one[0]) && cx.other === 0 && cx.all === 3, 'codex: a hint with nothing read, one stub per region read, nothing on other tabs');

    // map margin notes
    const mp = await page.evaluate(() => {
      for (const k of Object.keys(G.flags)) if (k.startsWith('p6e_rd_')) delete G.flags[k];
      G.state = 'play'; travelOpen(); TRAVEL.view = 'continent'; travelRender();
      const out = {};
      for (const id of ['organum', 'peaks', 'rift', 'caldera']) {
        travelRealm(TRAVEL_REALMS.find(r => r.id === id));
        out[id] = document.querySelectorAll('#tvinfo .p6e-margin').length;
      }
      const v = EPILOGUE.VOLUMES.find(x => x.region === 'r'); G.flags['p6e_rd_' + v.id] = true;
      travelRealm(TRAVEL_REALMS.find(r => r.id === 'rift')); out.riftRead = document.querySelectorAll('#tvinfo .p6e-margin').length;
      travelRealm(TRAVEL_REALMS.find(r => r.id === 'organum')); out.orgStill = document.querySelectorAll('#tvinfo .p6e-margin').length;
      return out;
    });
    ok(mp.organum === 1 && mp.peaks === 1 && mp.rift === 1 && mp.caldera === 0 && mp.riftRead === 2 && mp.orgStill === 1, 'map: a margin note beside each far realm, a second once a volume is read, none elsewhere: ' + JSON.stringify(mp));
    await page.evaluate(() => { hide('#ending'); for (const v of EPILOGUE.VOLUMES) G.flags['p6e_rd_' + v.id] = true; travelRealm(TRAVEL_REALMS.find(r => r.id === 'rift')); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'map-margin.png') });
    await page.evaluate(() => { travelClose(); });

    // ---- 6. switch off: original shelves, codex, map ----
    const off = await page.evaluate(() => {
      UPG.storyEpilogues = false; const o = {};
      loadMap('greenhall'); o.green = G.map.entities.filter(e => e.sprite === 'shelf').map(e => e.use + ':' + e.bookIdx + ':' + e.label);
      loadMap('quarry'); const q = G.map.entities.find(e => e.sprite === 'shelf'); o.quarry = q.use === undefined || q.use === null ? 'none' : q.use;
      loadMap('malting'); o.malting = G.map.entities.filter(e => e.sprite === 'shelf').map(e => e.bookIdx);
      readLoreBook(1001); o.legacyBook = document.querySelector('#event-panel h2, #event-panel .hd-title') ? document.querySelector('#event-panel h2, #event-panel .hd-title').textContent : '';
      READING.dismiss(); hide('#event'); G.state = 'play';
      renderCodexModal('codex'); o.codex = document.querySelectorAll('.p6e-codex').length; closeModal(); G.state = 'play';
      travelOpen(); TRAVEL.view = 'continent'; travelRender(); travelRealm(TRAVEL_REALMS.find(r => r.id === 'organum')); o.margin = document.querySelectorAll('#tvinfo .p6e-margin').length; travelClose();
      UPG.storyEpilogues = true; return o;
    });
    ok(off.green.every(s => /^lore_shelf:2:Bookshelf: "Treatise on Aether-Glass/.test(s)) && off.quarry === 'none' && off.malting.every(i => i === 1), 'switch off: every shelf is back to its original book or none: ' + JSON.stringify(off.green.length) + ' ' + off.quarry);
    ok(!/Notice to Visitors/.test(off.legacyBook) && off.codex === 0 && off.margin === 0, 'switch off: no teaser in the codex or on the map, a stray teaser index falls back to the original books (' + off.legacyBook + ')');
    const on2 = await page.evaluate(() => { loadMap('quarry'); const q = G.map.entities.find(e => e.sprite === 'shelf'); return q.use === 'lore_shelf' && q.bookIdx >= 1000; });
    ok(on2, 'switch back on: the shelves return on the next map load');

    // ---- 7. hostile flags and hostile player values ----
    const h = await page.evaluate(() => {
      const o = {}; window.__x = 0; UPG.storyEpilogues = true;
      const evil = '<img src=x onerror="window.__x=1"><script>window.__x=1</script>';
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      for (const k of ['kaelen_met', 'hedge_answered', 'tobin_417_done', 'boots_delivered', 'pim_safe', 'pim_tended', 'part4', 'coda_done', 'coda_by_you', 'folder_given', 'wearer_coda_dead', 'wren_saved', 'p6e_ride_k', 'p6e_ride_l', 'p6e_down_k', 'p6e_down_l', 'p6e_tend_l', 'p6e_hurt_k']) G.flags[k] = evil;
      for (const v of EPILOGUE.VOLUMES) G.flags['p6e_rd_' + v.id] = evil;
      G.flags.p6e_obj = { a: 1 }; G.flags.p6e_fn = () => 1;
      G.player.glassed = evil; G.player.glass = evil;
      G.state = 'play'; G.runs = 0; ending();
      o.p2 = [...document.querySelectorAll('#ending-text .p6e-epi')].map(p => p.innerHTML);
      G.state = 'play'; bookOneEnd();
      o.b1 = [...document.querySelectorAll('#ending-text .p6e-epi')].map(p => p.innerHTML);
      o.noMarkup = [...o.p2, ...o.b1].every(t => !/<|&lt;|onerror/.test(t));
      o.ownIgnored = ![...o.b1.join(' ').matchAll(/walked the Deep Woods/g)].length; // string-valued p6e_ flags do not count
      renderCodexModal('codex'); o.codex = document.querySelectorAll('div.p6e-codex').length; closeModal(); G.state = 'play';
      travelOpen(); TRAVEL.view = 'continent'; travelRender(); travelRealm(TRAVEL_REALMS.find(r => r.id === 'peaks')); o.margin = document.querySelectorAll('#tvinfo .p6e-margin').length; o.marginImg = document.querySelectorAll('#tvinfo img, #tvinfo script').length; travelClose();
      o.x = window.__x;
      G.player.glassed = false; G.player.glass = 0;
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      return o;
    });
    ok(h.noMarkup && h.x === 0, 'hostile flags: no markup reaches the ending text, nothing executes');
    ok(h.codex === 0 && h.margin === 1 && h.marginImg === 0, 'hostile p6e_rd_ flags (strings) unlock nothing: codex shows only the hint (' + h.codex + '), one margin note (' + h.margin + ')');
    ok(h.ownIgnored, 'hostile p6e_ flags that are not true/1 do not choose a variant');
    const sec = await page.evaluate(() => /innerHTML|insertAdjacentHTML/.test(String(EPILOGUE.addToEnding)) );
    ok(!sec, 'the ending section is written with textContent only');

    // ---- 8. screenshots and layout ----
    await page.evaluate(() => {
      UPG.storyEpilogues = true; for (const k of Object.keys(G.flags)) delete G.flags[k];
      Object.assign(G.flags, { kaelen_met: 1, coil_done: 1, hedge_silent: 1, boots_delivered: 1, pim_safe: 1, pim_tended: 1, twins_named: 1 }); G.give('charts'); G.player.glassed = true; G.player.glass = 40;
      hide('#ending'); G.state = 'play'; G.runs = 0; ending();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const b = document.getElementById('ending-text'); const e = b.querySelector('.p6e-first'); if (e) e.scrollIntoView({ block: 'center' }); });
    await page.screenshot({ path: path.join(SHOTS, 'ending-part2.png') });
    await page.evaluate(() => {
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      Object.assign(G.flags, { part4: 1, coda_done: 1, wearer_coda_dead: 1, folder_given: 1, aegis_calmed: 1, p6e_tend_l: true, p6e_ride_l: true, wren_saved: 1, p6e_ride_k: true });
      hide('#ending'); G.state = 'play'; G.runs = 0; bookOneEnd();
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const e = document.querySelector('#ending-text .p6e-first'); if (e) e.scrollIntoView({ block: 'center' }); });
    await page.screenshot({ path: path.join(SHOTS, 'ending-bookone.png') });
    await page.evaluate(() => { hide('#ending'); G.state = 'play'; loadMap('malting'); const e = G.map.entities.filter(x => x.sprite === 'shelf')[1]; useDeco(e); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, 'volume-rift.png') });
    await page.evaluate(() => { READING.dismiss(); hide('#event'); G.state = 'play'; renderCodexModal('codex'); const b = document.querySelector('#modal-panel div[style*="overflow-y"]'); b.scrollTop = b.scrollHeight; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'codex.png') });
    ok(errors.length === 0, 'no page errors on the 1280x800 run' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await page.close();

    // compact 640x400
    const c = await boot(browser, { width: 640, height: 400 });
    const cm = await c.page.evaluate(() => {
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      Object.assign(G.flags, { part4: 1, coda_done: 1, coda_by_you: 1, wearer_coda_dead: 1, folder_given: 1, p6e_tend_l: true, p6e_ride_l: true, wren_saved: 1, p6e_ride_k: true, p6e_down_k: true });
      hide('#ending'); G.state = 'play'; G.runs = 0; bookOneEnd();
      const inner = document.querySelector('#ending .ending-inner') || document.getElementById('ending-text');
      const box = document.getElementById('ending-text');
      const e = box.querySelector('.p6e-first'); if (e) e.scrollIntoView({ block: 'center' });
      return { overflowX: [inner, box, document.getElementById('ending')].map(n => n.scrollWidth > n.clientWidth + 1), btnVisible: !!document.getElementById('btn-again').getBoundingClientRect().width };
    });
    ok(cm.overflowX.every(x => !x), 'compact 640x400: the ending has no horizontal overflow');
    await c.page.waitForTimeout(300);
    await c.page.screenshot({ path: path.join(SHOTS, 'compact-ending.png') });
    await c.page.evaluate(() => { hide('#ending'); G.state = 'play'; loadMap('greenhall'); const e = G.map.entities.filter(x => x.sprite === 'shelf')[1]; useDeco(e); });
    await c.page.waitForTimeout(400);
    const sheet = await c.page.evaluate(() => { const s = document.querySelector('.hd-sheet'); const r = s && s.getBoundingClientRect(); return r ? { w: r.width, h: r.height, over: s.scrollWidth > s.clientWidth + 1 } : null; });
    ok(sheet && sheet.w <= 640 && sheet.h <= 400 && !sheet.over, 'compact 640x400: a teaser sheet fits without horizontal overflow');
    await c.page.screenshot({ path: path.join(SHOTS, 'compact-volume.png') });
    ok(c.errors.length === 0, 'no page errors on the compact run' + (c.errors.length ? ': ' + c.errors.join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
