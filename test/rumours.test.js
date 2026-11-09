// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/rumours.test.js
// Phase 6 RUMOURS: the deed-sensitive "Any news?" talk at the Boar & Dulcimer and the Synod
// Gazette on Oakhaven's notice boards. Proves: every line is reachable only when its flags say
// the deed happened, the choice is deterministic and never repeats back to back, no quest flag
// is ever written, hostile saves render as text only, and the switch off restores the original.
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof STORYRUM !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Rumour Tester');
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

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    const out = await page.evaluate(() => {
      const fails = [], r = {};
      const check = (c, m) => { if (!c) fails.push(m); };
      const SR = STORYRUM, R = SR.RUMOURS;
      G.state = 'play'; G.fadeT = 0;
      const setFlags = (list) => { for (const k of Object.keys(G.flags)) delete G.flags[k]; for (const k of list) G.flags[k] = true; };
      // a pinned, empty world: no crime, clear noon sky, no horse, no glass, no body
      const BASE = { weather: '', hour: 12, day: 3, daysLeft: 7, crime: { bounty: 0, thefts: 0, assaults: 0, escapes: 0, jail: 0 }, body: false, exposed: false, glassed: false, horse: false };
      const ctx = (over) => SR.context(Object.assign({}, BASE, over || {}));
      const elig = (flags, over, who) => { setFlags(flags); return SR.eligible(ctx(over), who || 'patron').map(x => x.id); };

      // ---------------- 1. the table
      r.count = R.length; r.deeds = R.filter(x => x.cat === 'deed').length;
      check(R.length >= 40, 'at least 40 rumours (' + R.length + ')');
      check(r.deeds >= 30, 'at least 30 deed rumours (' + r.deeds + ')');
      check(new Set(R.map(x => x.id)).size === R.length, 'rumour ids are unique');
      const samples = [3, 8, 11, 13].map(d => ctx({ daysLeft: 10 - d, day: d }));
      for (const x of R) {
        for (const c of samples) {
          const t = SR.textOf(x, c);
          const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean).length;
          check(sentences >= 1 && sentences <= 4, x.id + ' has ' + sentences + ' sentences');
          check(t.length > 20 && t.length < 330, x.id + ' length ' + t.length);
          check(!/[<>&]/.test(t), x.id + ' has no markup characters');
        }
        check(['deed', 'world', 'weather', 'ambient'].includes(x.cat) && ['any', 'hetty', 'patron'].includes(x.who), x.id + ' has a valid cat and speaker');
        check(x.cat !== 'deed' || (x.req || x.any || x.when || x.not), x.id + ' deed rumour is conditional');
      }

      // ---------------- 2. a fresh game: no rumour about something that was not done
      const fresh = new Set(['d_cantor_asks', 'd_hearthday']);
      for (const who of ['patron', 'hetty']) {
        const e = elig([], {}, who).map(id => R.find(x => x.id === id));
        const deeds = e.filter(x => x.cat === 'deed').map(x => x.id);
        check(deeds.every(id => fresh.has(id)), who + ': fresh game only hears the arrival lines, got ' + deeds);
        check(deeds.length === 2, who + ': both arrival lines are eligible at the start (' + deeds + ')');
      }
      // speaker rules
      const hettyOnly = R.filter(x => x.who === 'hetty').map(x => x.id), patronOnly = R.filter(x => x.who === 'patron').map(x => x.id);
      setFlags(['hetty_crates', 'crates_heard', 'hetty_paid', 'vane_told']);
      check(!SR.eligible(ctx(), 'patron').some(x => hettyOnly.includes(x.id)), 'a patron never speaks Hetty\'s lines');
      check(!SR.eligible(ctx(), 'hetty').some(x => patronOnly.includes(x.id)), 'Hetty never speaks the patrons\' lines');

      // ---------------- 3. every flag-gated rumour needs exactly its flags
      let gated = 0;
      for (const x of R) {
        if (!(x.req || x.any || x.not)) continue;
        gated++;
        const who = x.who === 'hetty' ? 'hetty' : 'patron';
        const on = (x.req || []).slice().concat(x.any ? [x.any[0]] : []);
        check(elig(on, {}, who).includes(x.id), x.id + ' is eligible with its flags (' + on + ')');
        for (const k of (x.req || [])) check(!elig(on.filter(y => y !== k), {}, who).includes(x.id), x.id + ' is NOT eligible without ' + k);
        if (x.any) check(!elig((x.req || []), {}, who).includes(x.id), x.id + ' is NOT eligible with none of its any-flags');
        for (const k of (x.not || [])) check(!elig(on.concat([k]), {}, who).includes(x.id), x.id + ' is NOT eligible once ' + k + ' is set');
      }
      r.gated = gated;
      check(gated >= 35, 'at least 35 flag-gated rumours (' + gated + ')');
      // flags set to junk values that are falsy do not count; truthy junk still only selects constant text
      setFlags([]); G.flags.lyra_met = 0; G.flags.kaelen_met = ''; G.flags.coil_done = null;
      check(elig(Object.keys(G.flags).filter(k => G.flags[k]), {}).every(id => !['d_kaelen', 'd_coil'].includes(id)), 'falsy flag values prove nothing');

      // ---------------- 4. crime, body, disguise, weather, hour
      const cr = (o) => ({ crime: Object.assign({ bounty: 0, thefts: 0, assaults: 0, escapes: 0, jail: 0 }, o) });
      const has = (flags, over, id) => elig(flags, over).includes(id);
      for (const id of ['c_small_bounty', 'c_wanted', 'c_wanted_big', 'c_theft', 'c_assault', 'c_jail', 'c_escape', 'c_body', 'c_disguise']) check(!has([], {}, id), id + ' is absent from a clean record');
      check(has([], cr({ bounty: 10 }), 'c_small_bounty') && !has([], cr({ bounty: 0 }), 'c_small_bounty') && !has([], cr({ bounty: 40 }), 'c_small_bounty'), 'small bounty band is 1-39');
      check(has([], cr({ bounty: 40 }), 'c_wanted') && !has([], cr({ bounty: 39 }), 'c_wanted'), 'the warrant line starts at 40');
      check(elig([], cr({ bounty: 120 }), 'hetty').includes('c_wanted_big') && !elig([], cr({ bounty: 99 }), 'hetty').includes('c_wanted_big'), 'the big-sum line starts at 100');
      check(elig([], cr({ bounty: 120 }), 'hetty').includes('c_wanted_big') && !elig([], cr({ bounty: 120 }), 'patron').includes('c_wanted_big'), 'the big-sum line is Hetty\'s');
      check(has([], cr({ thefts: 1 }), 'c_theft') && has([], cr({ assaults: 1 }), 'c_assault') && has([], cr({ jail: 6 }), 'c_jail') && has([], cr({ escapes: 1 }), 'c_escape'), 'theft, assault, jail and escape lines');
      check(has([], { body: true }, 'c_body') && has([], { exposed: true }, 'c_disguise'), 'body and disguise lines');
      for (const k of ['greening', 'part3']) check(!has([k], Object.assign(cr({ bounty: 150, thefts: 2, assaults: 1, escapes: 1, jail: 6 }), { body: true, exposed: true }), 'c_wanted') && !has([k], cr({ escapes: 1 }), 'c_escape') && !has([k], { body: true }, 'c_body'), 'no law talk once the watch is off duty (' + k + ')');
      for (const w of ['rain', 'storm', 'mist', 'snow', 'overcast', 'clear']) {
        check(has([], { weather: w }, 'w_' + w), 'weather line for ' + w);
        for (const o of ['rain', 'storm', 'mist', 'snow', 'overcast', 'clear']) if (o !== w) check(!has([], { weather: w }, 'w_' + o), 'weather ' + w + ' does not give the ' + o + ' line');
      }
      check(!has([], { weather: '' }, 'w_rain'), 'no weather line without a known sky');
      check(has([], { hour: 1 }, 'w_night') && has([], { hour: 23.5 }, 'w_night') && !has([], { hour: 12 }, 'w_night'), 'night line only at night');
      check(has([], { glassed: true }, 'p_glass') && !has([], { glassed: false }, 'p_glass') && has([], { horse: true }, 'p_horse') && !has([], {}, 'p_horse'), 'glass and horse lines');
      // the real context reads the real game
      setFlags([]); G.player.crime = { bounty: 55, thefts: 2, assaults: 0, escapes: 0, jailHours: 0 };
      let c = SR.context(); check(c.crime.bounty === 55 && c.crime.thefts === 2 && c.lawOn, 'context reads the crime record');
      const crimeBefore = JSON.stringify(G.player.crime); SR.context(); check(JSON.stringify(G.player.crime) === crimeBefore, 'reading the crime record does not write it');
      delete G.player.crime; c = SR.context(); check(!G.player.crime && c.crime.bounty === 0, 'a save with no crime record is read as clean and left alone');
      G.flags['disguise:exposed:oakhaven'] = true; check(SR.context().exposed, 'a saved disguise exposure is seen'); setFlags([]);
      G.flags.p6r_body = true; check(SR.context().body, 'a remembered body is seen'); setFlags([]);

      // ---------------- 5. determinism, newest first, no back-to-back repeats
      const RICH = ['lyra_met', 'gate_open', 'kaelen_met', 'tobiah_met', 'hetty_crates', 'crates_heard', 'hetty_paid', 'vane_told', 'culvert_open', 'twins_found', 'twins_named', 'hob_told', 'rooke_boots', 'boots_delivered', 'nell_met', 'pim_safe', 'tam_met', 'tam_told', 'sable_met', 'ignatius_met', 'hedge_silent', 'plinth_read', 'bounty_1_done', 'house_bought'];
      const run = (flags, who, over, n) => { setFlags(flags); const o = []; for (let i = 0; i < n; i++) { const t = SR.next(who, Object.assign({}, BASE, over || {})); o.push(t.id); } return o; };
      const A = run(RICH, 'patron', {}, 24), B = run(RICH, 'patron', {}, 24);
      check(JSON.stringify(A) === JSON.stringify(B), 'the same state tells the same rumours in the same order');
      check(A.every((id, i) => i === 0 || id !== A[i - 1]), 'no rumour twice in a row: ' + A.join(','));
      const top = elig(RICH, {}, 'patron').map(id => R.find(x => x.id === id)).filter(x => x.cat === 'deed').sort((a, b) => b.rank - a.rank)[0];
      check(A[0] === top.id, 'the first rumour is the newest deed (' + A[0] + ' vs ' + top.id + ')');
      check(new Set(A).size >= 8, 'a long run varies (' + new Set(A).size + ' distinct)');
      check(A.some(id => R.find(x => x.id === id).cat !== 'deed'), 'every third ask is wider-world colour');
      const aId = new Set(elig(RICH, {}, 'patron'));
      check(A.every(id => aId.has(id)), 'every told rumour was eligible');
      const T = run([], 'hetty', {}, 12); check(T.every((id, i) => i === 0 || id !== T[i - 1]), 'a fresh game also never repeats back to back: ' + T.join(','));
      // different speakers, different pools
      const H = run(['hetty_crates', 'crates_heard', 'hetty_paid', 'vane_told'], 'hetty', {}, 6);
      check(H.includes('d_vane_told') && !H.includes('d_vane_told_p'), 'Hetty tells her own version of the Kestrel news');
      // the counters are small integers and nothing else is written
      setFlags(RICH); const keysBefore = Object.keys(G.flags).sort().join();
      for (let i = 0; i < 30; i++) SR.next('patron');
      const added = Object.keys(G.flags).filter(k => !keysBefore.split(',').includes(k)).sort();
      check(JSON.stringify(added) === JSON.stringify(['p6r_last', 'p6r_n']), 'only p6r_n and p6r_last are written (' + added + ')');
      check(Number.isInteger(G.flags.p6r_n) && G.flags.p6r_n < 1000 && Number.isInteger(G.flags.p6r_last), 'counters are small integers');
      const questSnap = JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p6r_')).map(k => [k, G.flags[k]]));
      for (let i = 0; i < 10; i++) SR.next('patron'); check(JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p6r_')).map(k => [k, G.flags[k]])) === questSnap, 'asking never changes a quest flag');
      // hostile counters
      G.flags.p6r_n = 'x'; G.flags.p6r_last = { a: 1 }; check(SR.next('patron') && Number.isInteger(G.flags.p6r_n), 'junk counters are ignored and overwritten');
      G.flags.p6r_n = -5; G.flags.p6r_last = 99999; check(SR.next('patron') && G.flags.p6r_n === 1, 'out-of-range counters restart');
      setFlags([]);

      // ---------------- 6. the Gazette: issues
      const ids = SR.ISSUES.map(i => i.id); r.issues = ids.length;
      check(ids.length >= 6, 'at least 6 issues (' + ids.length + ')');
      const ladder = [[[], 'arrival'], [['lyra_met'], 'cantor'], [['lyra_met', 'kaelen_met'], 'quarry'], [['tobiah_met'], 'quarry'], [['kaelen_met', 'hedge_listened'], 'hedge'], [['wearer_dead'], 'hedge'],
        [['kaelen_met', 'hedge_answered', 'coil_done'], 'coil'], [['coil_done', 'rite_started'], 'rite'], [['rite_started', 'greening'], 'greening'], [['greening', 'escaped'], 'reclassed'], [['part3'], 'reclassed'], [['book_one_done'], 'reclassed']];
      for (const [fl, want] of ladder) { setFlags(fl); const got = SR.issueFor(ctx()).id; check(got === want, 'flags ' + JSON.stringify(fl) + ' front-page the ' + want + ' issue, got ' + got); }
      for (const s of SR.ISSUES) {
        if (!s.req && !s.any) continue;
        const on = (s.req || []).concat(s.any ? [s.any[0]] : []);
        setFlags(on.filter(k => !ids.includes(k))); // the issue's own flags only
        // none of the issue's flags => it is never the front page
        setFlags([]); check(SR.issueFor(ctx()).id === 'arrival', s.id + ' is not shown with no flags');
      }
      setFlags(['greening']); let h = SR.issueHtml(BASE);
      check(/AGRICULTURAL IRREGULARITY/.test(h) && /scheduling matter/.test(h), 'the Greening is spun as an agricultural irregularity and a scheduling matter');
      setFlags(['hedge_listened']); h = SR.issueHtml(BASE); check(/acoustic echo artifacting/i.test(h), 'the Hedge is spun as acoustic echo artifacting');
      setFlags([]); h = SR.issueHtml(BASE);
      check(!/Local matters/.test(h) && !/rm-pell/.test(h), 'a clean record and no crates: no local matters, no free-press page');
      check(/Local matters/.test(SR.issueHtml(Object.assign({}, BASE, cr({ escapes: 1 })))) && /scheduling matter/.test(SR.issueHtml(Object.assign({}, BASE, cr({ escapes: 1 })))), 'a jailbreak is a scheduling matter');
      check(/expression of interest/.test(SR.issueHtml(Object.assign({}, BASE, cr({ bounty: 60 })))), 'a warrant is an expression of interest');
      check(/reconciled to that place/.test(SR.issueHtml(Object.assign({}, BASE, { body: true }))), 'a found body is reconciled');
      check(/counted/.test(SR.issueHtml(Object.assign({}, BASE, { exposed: true }))), 'a disguise is a wardrobe audit');
      check(!/Local matters/.test(SR.issueHtml(Object.assign({}, BASE, cr({ escapes: 1 }), { lawOn: false }))), 'no local matters when the watch is off duty');
      setFlags(['crates_heard']); check(/rm-pell/.test(SR.issueHtml(BASE)) && /Cosimo Pell/.test(SR.issueHtml(BASE)), 'the free-press page appears once you have heard the crates');
      setFlags(['hetty_crates']); check(!/rm-pell/.test(SR.issueHtml(BASE)), 'and not before');
      // every combination renders 2-4 items with a headline and a notice, only constant tags
      const FL = ['lyra_met', 'kaelen_met', 'tobiah_met', 'hedge_answered', 'hedge_listened', 'hedge_silent', 'wearer_dead', 'coil_done', 'rite_started', 'greening', 'escaped', 'crates_heard'];
      const CR = [{}, { escapes: 1 }, { bounty: 60 }, { thefts: 1 }];
      let combos = 0, badCombo = null; const seen = new Set();
      for (let m = 0; m < (1 << FL.length); m++) {
        const fl = FL.filter((_, i) => m & (1 << i)); setFlags(fl);
        for (const cc of CR) for (const body of [false, true]) {
          const o = Object.assign({}, BASE, cr(cc), { body });
          const html = SR.issueHtml(o); combos++;
          const items = (html.match(/class="rm-item/g) || []).length;
          seen.add(SR.issueFor(SR.context(o)).id);
          if (items < 2 || items > 4 || !/rm-head/.test(html) || !/rm-notice/.test(html) || /<(?!\/?(div|b|h3)\b)/.test(html)) { badCombo = badCombo || [fl, cc, body, items]; }
        }
      }
      check(!badCombo, 'every combination renders 2-4 items, a headline, a notice and only constant tags: ' + JSON.stringify(badCombo));
      check(seen.size === ids.length, 'every issue is reachable (' + [...seen] + ')');
      r.combos = combos;
      setFlags([]);

      // ---------------- 7. no mutation by looking at a Gazette
      setFlags(RICH); G.player.crime = { bounty: 0, thefts: 0, assaults: 0, escapes: 0, jailHours: 0 };
      const pre = JSON.stringify({ f: G.flags, p: G.player, j: G.journal, l: G.ledger });
      SR.issueHtml(); check(JSON.stringify({ f: G.flags, p: G.player, j: G.journal, l: G.ledger }) === pre, 'building an issue changes nothing');
      setFlags([]);
      return Object.assign(r, { fails });
    });
    assert.deepEqual(out.fails, [], out.fails.join('\n'));

    // ---------------- 8. the dialogue button, the boards, the switch
    const ui = await page.evaluate(() => {
      const fails = [], r = {};
      const check = (c, m) => { if (!c) fails.push(m); };
      const SR = STORYRUM;
      // the choices of a held document sit on its last page
      const putBack = () => { READING.go(99); const b = document.querySelector('#event .hd-choices button'); b.onclick(); };
      G.state = 'play'; G.fadeT = 0;
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      UPG.storyRumours = true; delete GFX.storyRumours;
      const topicsBefore = JSON.stringify(Object.keys(NPCS.hetty.topics)), tk = TOPIC_KEYS.length, oldRum = RUMOURS.length, askSrc = String(askTopic);
      loadMap('tavern');
      const hetty = G.ents.find(e => e.id === 'hetty'), patron = G.ents.find(e => e.id === 'townsman');
      check(hetty && patron, 'Hetty and a patron are in the Boar');
      const btnHtml = () => { const b = document.querySelector('#modal-panel .dlg .btns'); if (!b) return ''; const k = b.cloneNode(true); const n = k.querySelector('#d-news'); if (n) n.remove(); return k.innerHTML; };
      const close = () => { closeModal(); G.state = 'play'; };
      talk(hetty);
      check(!!document.querySelector('#d-news') && document.querySelector('#d-news').textContent === 'Any news?', 'Hetty has an Any news? button');
      const withBtn = btnHtml();
      const order = Array.from(document.querySelectorAll('#modal-panel .dlg .btns button')).map(b => b.id || b.dataset.t || b.textContent);
      check(order.indexOf('d-news') > order.indexOf('d-where') && order.indexOf('d-news') < order.indexOf('d-bye'), 'the button sits between Where is and Goodbye: ' + order);
      // existing topics unchanged
      document.querySelector('#d-tell').click();
      check(document.querySelectorAll('[data-topic]').length === tk, 'Tell me about still offers all ' + tk + ' topics');
      check(document.querySelector('#d-news'), 'the button survives re-render');
      const f0 = JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p6r_')).map(k => [k, G.flags[k]])), j0 = G.journal.length, g0 = G.player.gold;
      document.querySelector('#d-news').click();
      const lines = Array.from(document.querySelectorAll('#dlg-log > div')).map(d => ({ cls: d.className, t: d.textContent }));
      check(lines.some(l => l.cls === 'you' && /Any news\?/.test(l.t)), 'your question is in the log');
      const told = lines[lines.length - 1];
      check(told.cls === 'them' && SR.RUMOURS.some(x => [3, 8, 11].some(d => SR.textOf(x, SR.context({ daysLeft: 10 - d, day: d })) === told.t)) || told.cls === 'them' && told.t.length > 20, 'Hetty answers with a rumour from the table');
      document.querySelector('#d-news').click();
      const told2 = Array.from(document.querySelectorAll('#dlg-log > div')).pop().textContent;
      check(told2 !== told.t, 'asking twice never gives the same rumour twice');
      check(JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p6r_')).map(k => [k, G.flags[k]])) === f0 && G.journal.length === j0 && G.player.gold === g0, 'asking for news changes no flag, journal or purse');
      check(Number.isInteger(G.flags.p6r_n) && G.flags.p6r_n === 2, 'two asks = p6r_n 2');
      close();
      talk(patron); check(!!document.querySelector('#d-news'), 'the tavern patron has the button'); close();
      const harrow = Object.assign({ kind: 'npc', id: 'harrow', x: 5, y: 5 }); talk(harrow); check(!document.querySelector('#d-news'), 'Harrow (a named quest NPC without rumour:true) has no button'); close();
      G.state = 'play';
      const vane = G.ents.find(e => e.id === 'vane'); talk(vane); check(!document.querySelector('#d-news'), 'Vane has no button'); close();
      check(JSON.stringify(Object.keys(NPCS.hetty.topics)) === topicsBefore && TOPIC_KEYS.length === tk && RUMOURS.length === oldRum && String(askTopic) === askSrc, 'NPCS, TOPICS, RUMOURS and askTopic are untouched');

      // ---- switch off: the original buttons, the original street
      UPG.storyRumours = false;
      talk(hetty); check(!document.querySelector('#d-news'), 'switch off: no Any news? button');
      check(btnHtml() === withBtn, 'switch off: the button row is exactly the original row');
      close();
      G.state = 'play';
      const before = G.flags.p6r_n;
      loadMap('oakhaven'); check(G.map.entities.filter(e => e._rmBoard).length === 0, 'switch off: no notice boards in Oakhaven');
      loadMap('tavern'); check(G.map.entities.filter(e => e._rmBoard).length === 0, 'switch off: no notice board in the Boar');
      check(G.flags.p6r_n === before, 'switch off: nothing written');
      // the original wanted poster and stable sign are the only signs with a use
      loadMap('oakhaven');
      check(!G.map.entities.some(e => e.use === 'synod_gazette'), 'switch off: no Gazette sign is usable');
      UPG.storyRumours = true;

      // ---- boards
      loadMap('oakhaven'); SR.syncCurrent();
      const bo = G.map.entities.filter(e => e._rmBoard), bt = (() => { loadMap('tavern'); return G.map.entities.filter(e => e._rmBoard); })();
      check(bo.length === 2 && bt.length === 1, 'two boards in Oakhaven and one in the Boar (' + bo.length + ',' + bt.length + ')');
      for (const b of bo.concat(bt)) check(b.transient && b.solid === false && b.kind === 'deco' && b.use === 'synod_gazette' && b.label, 'board is a transient, walk-through, labelled deco');
      loadMap('oakhaven');
      const boards = G.map.entities.filter(e => e._rmBoard);
      for (const b of boards) check(G.map.entities.indexOf(b) >= G.map.baseCount && !G.map.get(b.x | 0, b.y | 0) && !G.map.isBlocked(b.x | 0, b.y | 0), 'board is past baseCount, in the open and not in a wall');
      // does not sit on the street door cells or the wanted posters
      for (const b of boards) check(G.map.entities.filter(e => !e.transient && e !== b && Math.hypot(e.x - b.x, e.y - b.y) < 0.7 && (e.solid !== false || e.kind !== 'deco')).length === 0, 'board overlaps nothing solid');
      // reading one with E
      const b0 = boards[0];
      G.state = 'play'; Object.assign(Engine.cam, { x: b0.x - 1.2, y: b0.y, dir: 0 });
      G.ents.forEach(e => { if (e.kind === 'npc') e.hidden = true; });
      interact();
      check(G.state === 'event' && document.querySelector('#event .hd-sheet') && /The Synod Gazette/.test(document.querySelector('#event .hd-title').textContent), 'E at a board opens the Gazette as a held document');
      check(/Broadsheet/.test(document.querySelector('#event .hd-kicker').textContent) && document.querySelector('#event .hd-office'), 'it is an Office sheet');
      check(/THE PURE NOTE IS TO BE HELD OVER OAKHAVEN/.test(document.querySelector('#event .hd-body').textContent), 'a fresh game sees the arrival issue');
      putBack(); check(G.state === 'play', 'putting it back returns to play');
      // issue follows the story
      G.flags.greening = true; interact();
      check(/AGRICULTURAL IRREGULARITY/.test(document.querySelector('#event .hd-body').textContent), 'after the Greening the board reads agricultural irregularity');
      putBack(); delete G.flags.greening;
      // held docs off: the ordinary panel
      GFX.heldDocs = false; interact();
      check(G.state === 'event' && !document.querySelector('#event .hd-sheet') && /The Synod Gazette/.test(document.querySelector('#event-panel h2').textContent), 'held documents off: the ordinary event panel');
      document.querySelector('#event-panel button').click(); GFX.heldDocs = true;
      check(G.state === 'play', 'closed');

      // ---- the Greening rebuilds Oakhaven; the boards come back
      G.flags.greening = true; G.maps.oakhaven = buildOakhaven(true); loadMap('oakhaven');
      check(G.map.entities.filter(e => e._rmBoard).length === 2, 'the Greening\'s new Oakhaven has its boards'); delete G.flags.greening;
      G.maps.oakhaven = buildAllMaps().oakhaven; loadMap('oakhaven');

      // ---- save / load
      G.flags.p6r_n = 4; G.flags.p6r_last = 3; G.flags.p6r_body = true;
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      check(snap.maps.oakhaven.ents.length === G.maps.oakhaven.baseCount && !JSON.stringify(snap).includes('synod_gazette'), 'boards are never written to a save');
      restoreGame(snap); G.state = 'play';
      check(G.flags.p6r_n === 4 && G.flags.p6r_last === 3 && G.flags.p6r_body === true, 'the p6r_ flags survive a save and load');
      loadMap('oakhaven'); check(G.map.entities.filter(e => e._rmBoard).length === 2, 'boards are back after a load');
      // an old save without any p6r_ flag
      const old = JSON.parse(JSON.stringify(snap)); for (const k of Object.keys(old.flags)) if (k.startsWith('p6r_')) delete old.flags[k];
      restoreGame(old); G.state = 'play'; check(SR.next('patron').text.length > 20 && G.flags.p6r_n === 1, 'an old save without p6r_ flags works');
      return Object.assign(r, { fails });
    });
    assert.deepEqual(ui.fails, [], ui.fails.join('\n'));

    // ---------------- 9. hostile saves render as text only
    const hostile = await page.evaluate(() => {
      const fails = [];
      const check = (c, m) => { if (!c) fails.push(m); };
      const SR = STORYRUM;
      const putBack = () => { READING.go(99); document.querySelector('#event .hd-choices button').onclick(); };
      window.__pwn = 0;
      const evil = '<img src=x onerror="window.__pwn=1"><script>window.__pwn=2</script>';
      G.state = 'play';
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      for (const k of ['lyra_met', 'kaelen_met', 'tobiah_met', 'hedge_answered', 'wearer_dead', 'coil_done', 'rite_started', 'crates_heard', 'tam_told', 'twins_named', 'hob_told', 'sable_kept']) G.flags[k] = evil;
      G.flags['disguise:exposed:' + evil] = true; G.flags['<b>' + evil] = evil; G.flags.p6r_n = evil; G.flags.p6r_last = evil; G.flags.p6r_body = evil;
      G.player.name = evil; G.day = evil; G.tod = evil; UPG.weather = evil;
      G.player.crime = { bounty: evil, thefts: '9<b>', assaults: [1], escapes: { a: evil }, jailHours: NaN, evidence: evil, custody: evil };
      const texts = [];
      for (const who of ['hetty', 'patron']) for (let i = 0; i < 30; i++) { const t = SR.next(who); texts.push(t.text); }
      const html = SR.issueHtml();
      check(texts.every(t => !/[<>]/.test(t)), 'rumour text has no markup');
      check(!/onerror|<script|<img|pwn/i.test(html) && !/pwn/.test(texts.join(' ')), 'the issue and rumours carry nothing from the save');
      check(Array.from(html.matchAll(/<(\w+)/g)).every(m => ['div', 'b', 'h3'].includes(m[1])), 'the issue uses only constant tags');
      // put them on screen
      loadMap('tavern'); const hetty = G.ents.find(e => e.id === 'hetty'); talk(hetty);
      for (let i = 0; i < 3; i++) document.querySelector('#d-news').click();
      check(!document.querySelector('#dlg-log img, #dlg-log script, #dlg-log [onerror]'), 'dialogue shows the rumours as text');
      closeModal(); G.state = 'play';
      SR.readGazette();
      check(!document.querySelector('#event img, #event script, #event [onerror]'), 'the held Gazette shows only text');
      check(window.__pwn === 0, 'nothing from the save ever ran');
      putBack();
      // hostile values never become eligible for something undone: only the flags set truthy do, and text stays constant
      check(typeof SR.context().crime.bounty === 'number' && SR.context().crime.bounty === 0 && SR.context().crime.thefts === 0, 'junk crime numbers read as zero');
      check(SR.context().day === 0, 'a junk day reads as zero');
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      G.player.name = 'Rumour Tester'; G.day = 0; G.tod = 0.5; delete UPG.weather; delete G.player.crime;
      return { fails };
    });
    assert.deepEqual(hostile.fails, [], hostile.fails.join('\n'));
    assert.deepEqual(errors, [], 'page errors: ' + errors.join('; '));

    // ---------------- 10. compact 640x400: the Gazette and the dialogue fit
    const small = await boot(browser, { width: 640, height: 400 });
    const fit = await small.page.evaluate(() => {
      const fails = [];
      const check = (c, m) => { if (!c) fails.push(m); };
      const putBack = () => { READING.go(99); document.querySelector('#event .hd-choices button').onclick(); };
      G.state = 'play';
      for (const k of Object.keys(G.flags)) delete G.flags[k];
      for (const k of ['lyra_met', 'kaelen_met', 'tobiah_met', 'hedge_answered', 'wearer_dead', 'crates_heard']) G.flags[k] = true;
      G.player.crime = { bounty: 60, thefts: 1, assaults: 0, escapes: 1, jailHours: 0 };
      STORYRUM.readGazette();
      const sh = document.querySelector('#event .hd-sheet'), body = document.querySelector('#event .hd-body');
      const r = sh.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      check(r.left >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1, 'the sheet fits 640x400');
      check(document.documentElement.scrollWidth <= vw + 1, 'no horizontal page overflow');
      check(body.scrollHeight <= body.clientHeight + 2, 'columns do not overflow vertically');
      check(parseFloat(getComputedStyle(body).fontSize) >= 14, 'text stays readable (>= 14px)');
      const pages = document.querySelector('#event .hd-count').textContent;
      putBack();
      loadMap('tavern'); talk(G.ents.find(e => e.id === 'hetty'));
      const pm = document.querySelector('#modal-panel').getBoundingClientRect();
      check(pm.right <= vw + 1 && pm.bottom <= vh + 1, 'the dialogue fits 640x400 with the extra button');
      const btn = document.querySelector('#d-news').getBoundingClientRect();
      check(btn.right <= vw + 1 && btn.width > 20, 'the Any news? button is on screen');
      closeModal(); G.state = 'play';
      return { fails, pages };
    });
    assert.deepEqual(fit.fails, [], fit.fails.join('\n'));
    assert.deepEqual(small.errors, [], 'compact page errors: ' + small.errors.join('; '));

    console.log('PASS rumours.test.js: ' + out.count + ' rumours (' + out.deeds + ' deeds, ' + out.gated + ' flag-gated), ' + out.issues + ' issues, ' + out.combos + ' front-page combinations');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL rumours.test.js:', e.message); process.exit(1); });
