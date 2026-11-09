// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/canon32.test.js
// The canon pass (owner's ruling, 28 Oct: "match any inconsistency to the book"). Bettis Renn is Ivo's wife, as in Book One
// ch. 14 and 18, and the brainstorm's text-level contradictions (section 5) follow the manuscript.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Canon Tester');
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
    await page.evaluate(() => {
      window.__msgs = []; const _m = window.msg; window.msg = function (t) { window.__msgs.push(String(t)); return _m.apply(this, arguments); };
      window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
    });

    // ---- Bettis Renn: Ivo's wife, in the Malting yard with her basket; put back or carried to the Kestrel
    const bettis = await page.evaluate(() => {
      const out = {}, f = G.flags;
      loadMap('malting'); G.state = 'play';
      const e = G.ents.find((o) => o.id === 'bettis');
      out.npc = NPCS.bettis.portrait === 'townswoman' && /basket/.test(NPCS.bettis.name) && /go second/.test(NPCS.bettis.greet.normal);
      out.voice = VOICES.PEOPLE.bettis.f0 >= 180;
      f.sable_joined = false; window.__msgs.length = 0; talkBettis(e);
      out.hollow = window.__msgs.some((t) => /Hollow woman/.test(t) && /WG-40,102/.test(t) && !/PRESSED TWICE/.test(t));
      f.sable_joined = true; window.__ev.length = 0; talkBettis(e);
      const ev = window.__ev[0];
      out.first = !!ev && /A woman of about forty/.test(ev.b) && /coat over her arm/.test(ev.b) && /does not like to break a pair/.test(ev.b) && !/name, please|PRESSED TWICE|\bhis\b/.test(ev.b);
      ev.c[0].f();
      const wake = window.__ev[1];
      out.wake = !!wake && /Wife of Ivo Renn, cooper, of Ashlane/.test(wake.b) && /She asked to go second/.test(wake.b) && /put it back, put it back/.test(wake.b) && /third stack, he is whole/.test(wake.b);
      out.choices = wake.c.map((c) => c.t).join(' | ');
      wake.c[1].f();
      out.kept = f.bettis_kept_awake && e.hidden && G.journal.some((j) => /to her husband in the third stack/.test(j.text));
      loadMap('malting'); G.state = 'play';
      out.staysGone = G.ents.find((o) => o.id === 'bettis').hidden === true;
      delete f.bettis_kept_awake; delete f.bettis_awake;
      return out;
    });
    check(bettis.npc && bettis.voice && bettis.hollow, 'Bettis Renn is a Hollow woman with a basket, tag WG-40,102; "...I will go second..."; a woman\'s voice');
    check(bettis.first && bettis.wake, 'Sable puts her back as in ch. 18: the entry read aloud, the screaming, "put it back", "your husband is in the third stack" (' + bettis.choices + ')');
    check(bettis.kept && bettis.staysGone, 'kept awake, she is carried to the Kestrel, to Ivo in the third stack, and is not in the Malting after');

    // ---- the brainstorm's text-level contradictions, each to the book
    const text = await page.evaluate(() => {
      const out = {};
      const q = NPCS.quist.quest(G); const show = q && q.choices && q.choices.find((c) => /pressing/.test(c.t));
      out.form9 = !!show && /Name\. Age\. Trade\./.test(show.f(G)) ;
      out.tam = /Tammy/.test(NPCS.tam.topics['The Flume']) && /old king went into the glass/.test(NPCS.tam.topics['The Flume']) && !/sluice/.test(NPCS.tam.topics['The Flume']);
      out.hollow = /The Hollow behind the tannery is to be burned/.test(JSON.stringify(NPCS.ignatius.topics)) && !/Hollow in the quarry/.test(JSON.stringify(NPCS.ignatius.topics));
      out.herald = /shake the entire time/.test(NPCS.herald.greet.normal);
      out.camp = /twenty-six souls/.test(NPCS.sable_dw.greet.polite);
      out.linnet = NPCS.wren_dw.name === 'Linnet';
      out.pool = !NAMES_POOL.some((n) => ['Tamsin Reed', 'Corwin Aye', 'Mirren Salk'].includes(n));
      // the bells: Tamsin Reed alone speaks of the blue jug; every other bell keeps its own last things
      out.tamsin = /blue jug, Mam/.test(coreMurmur({ name: 'Tamsin Reed' }));
      out.others = NAMES_POOL.every((n) => !/blue jug/.test(coreMurmur({ name: n })) && coreMurmur({ name: n }).indexOf(n.split(' ')[0].toLowerCase()) >= 0);
      out.varied = new Set(NAMES_POOL.map((n) => coreMurmur({ name: n }).replace(/^\.\.\.[a-z]+\.\.\. /, ''))).size >= 4;
      return out;
    });
    check(text.form9, 'Quist\'s three questions are Form 9\'s: name, age, trade');
    check(text.tam, 'Tam\'s Essa died of the pox forty years ago, and called him Tammy');
    check(text.hollow, 'Ignatius\'s warrant burns the Hollow behind the tannery, not "the Hollow in the quarry"');
    check(text.herald && text.camp && text.linnet, 'the herald\'s hands shake; the Deep Woods camp is twenty-six souls; the hush-gift child is Linnet, not Wren');
    check(text.pool && text.tamsin && text.others && text.varied, 'the blue jug is Tamsin Reed\'s alone; Corwin Aye and Mirren Salk are not Legionnaires; each bell murmurs its own last things');

    const src2 = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
    const js = ['js/game.js', 'js/grove.js', 'js/data.js', 'js/sidequests.js', 'js/maps.js', 'js/dreams.js'].map(src2).join('\n');
    check(/Forty-one\. Forty\./.test(js) && !/three\. Two\. For Oakhaven/.test(js), 'Aldric counts sixty seconds, "Forty-one. Forty.", not "three, two, for Oakhaven"');
    check(/Emory Wain\. Twenty-six\. Of Cooper\\'s Rise/.test(js) && !/Ansel Grey/.test(js), 'Sable stops the proctor by reading Emory Wain\'s surrendered name');
    check(/Madders on Nullday/.test(js) && !/Madders on Massday/.test(js) && !/Essa, in the Cascade year/.test(js), 'the Madder girl is born on Nullday; the bees are told Essa died the year the old king went into the glass');
    check(/Nobody searches the supervising engineer/.test(js) && !/searches me at the casing/.test(js), 'Kaelen\'s coil goes in your bag by choice: nobody searches the supervising engineer\'s toolbag');
    check(!/Corwin Aye' \}\)/.test(js) && !/blue jug on the sill/.test(js), 'the quarry barracks Legionnaire is not Corwin Aye; the pump Hollow does not borrow the blue jug');

    // ---- the talking crates are in the Kestrel's hold, not Hetty's cellar (ch. 4, 8)
    const crates = await page.evaluate(() => {
      const out = {}, f = G.flags;
      const tav = G.maps.tavern.entities.filter((e) => e.use === 'crates');
      const oak = G.maps.oakhaven.entities.filter((e) => e.use === 'crates');
      out.where = tav.length === 0 && oak.length === 1 && /mast-ladder/.test(oak[0].label);
      out.hetty = /ship\'s hold, at the mast/.test(NPCS.hetty.topics['The Drift-Kestrel']);
      delete f.hetty_crates; const q = NPCS.hetty.quest(G); out.ask = /mast-ladder/.test(q.text) && /hold/.test(q.journal[1]);
      window.__ev.length = 0; delete f.crates_heard; useDeco(oak[0]);
      const ev = window.__ev[0]; out.event = !!ev && ev.t === 'The crates in the hold' && /twelve crates, lashed/.test(ev.b) && /Annet Sowerby/.test(ev.b);
      out.ledger = G.ledger.some((r) => r.name === 'Annet Sowerby' && r.where === 'the Kestrel\'s hold');
      f.greening = true; window.__ev.length = 0; window.__msgs.length = 0; useDeco(oak[0]); out.gone = window.__ev.length === 0 && window.__msgs.some((t) => /Not now/.test(t)); delete f.greening;
      return out;
    });
    check(crates.where && crates.hetty && crates.ask, 'the crates are in the Kestrel\'s hold at the mast; Hetty hears them taking his supper up the mast-ladder');
    check(crates.event && crates.ledger && crates.gone, 'you listen at them from the mast-ladder; the names go in the ledger "from the Kestrel\'s hold"; after the Greening the ladder is not for climbing');

    // ---- Hob Wendle is the book's field-hand of the Hollow, who roots into the Kestrel's deck; the tanner is someone else
    const hob = await page.evaluate(() => {
      const out = {}, f = G.flags;
      out.tanner = NPCS.hob.name === 'Abner Fenning, tanner' && !/Hob|Wendle/.test(JSON.stringify(NPCS.hob));
      out.hollow = G.maps.p30_hollow.entities.some((e) => e.kind === 'npc' && e.id === 'p30_hob') && /field-hand/.test(NPCS.p30_hob.name);
      const d0 = G.day; G.day = 0; delete f.p30_hob_before; const b = NPCS.p30_hob.quest(G); G.day = 2; delete f.p30_hob_after; const a2 = NPCS.p30_hob.quest(G); G.day = d0;
      out.toes = /gone to wood/.test(b.text) && /Rootday/.test(b.text) && /took them clean on Rootday/.test(a2.text);
      return out;
    });
    const groveSrc = src('js/grove.js');
    check(hob.tanner && hob.hollow && hob.toes, 'Hob Wendle is a field-hand on his step in the Hollow whose three toes Rooke takes on Rootday; the tanner is Abner Fenning');
    check(/I\\'m sorry about your ship, Captain/.test(groveSrc) && /Hob Wendle/.test(groveSrc), 'Part Three opens with Hob rooting into the Kestrel\'s deck, as in ch. 13');
    check(!/Hob Wendle|Wendle twins|Ned Wendle|\bHob\b(?!\\?'s Knap)/.test(['js/data.js', 'js/game.js', 'js/kestrel16.js', 'js/couriers.js', 'js/rumours.js', 'js/thin29.js'].map(src).join('\n').replace(/Hob Wendle, field-hand/g, '')), 'nothing else calls the tanner Hob, or his twins Wendle');

    // ---- The Office cutter is a courier that hunts the murmur of the Kestrel's own 432 cores (ch. 21); its hold holds a few seized bottles
    const cutter = await page.evaluate(() => {
      const out = {}, f = G.flags;
      f.part4 = true; loadMap('deepwoods'); G.state = 'play';
      for (const o of G.ents) if (o.kind === 'enemy') { o.dead = true; o.hidden = true; }
      window.__msgs.length = 0; codaBossDown({ type: 'bosun' });
      out.bosun = G.has('holdkey') && window.__msgs.some((t) => /TELLER — HOLD\./.test(t) && /count of the Kestrel's hold, taken by ear/.test(t)) && G.journal.some((j) => /^Teller's Hold: /.test(j.text)) && LOGMAP.sketchFor("Teller's Hold: I killed Bosun Teller") === 'vox';
      window.__ev.length = 0; codaHold();
      const ev = window.__ev[0];
      out.hold = !!ev && /twelve stoppered vox-bottles/.test(ev.b) && /No cargo/.test(ev.b) && !/CONSIGNMENT 19|432/.test(ev.b);
      const n = G.ledger.length; ev.c[0].f();
      out.kept = f.bottles_kept && G.ledger.length === n + 1 && G.ledger[n].name === 'Twelve voices in seized vox-bottles';
      out.ending = codaEndingLines().some((l) => /^Twelve seized vox-bottles ride in the Kestrel's hold beside the four hundred and thirty-two/.test(l));
      window.__ev.length = 0; delete f.log_read; codaLog();
      out.log = /CARGO: none/.test(window.__ev[0].b) && /Bosun counts DK's hold at 432 by ear/.test(window.__ev[0].b);
      out.vane = /our hold she was listening to/.test(NPCS.vane_dw ? NPCS.vane_dw.topics['The Office cutter'] : JSON.stringify(NPCS)) && /courier-cutter/.test(TOPICS['The Office cutter'].high);
      return out;
    });
    const cutterSrc = ['js/coda.js', 'js/data.js', 'js/grove.js', 'js/companion-talk.js', 'js/hearth15.js'].map(src).join('\n');
    check(cutter.bosun && cutter.hold && cutter.kept && cutter.ending && cutter.log && cutter.vane, 'the cutter hunts the Kestrel\'s own 432 by ear, and its hold holds only twelve seized vox-bottles (' + JSON.stringify(cutter) + ')');
    check(!/four hundred and thirty-two (voices|vox-bottles)|CONSIGNMENT 19 — 432|bottling consignment|432 units/i.test(cutterSrc), 'nothing gives the cutter a hold of 432 voices any more');

    // ---- The canon days: Davin dies on Hearthday evening, Pim is lured on Massday, the Church comes on Dawnday (js/days35.js)
    const days = await page.evaluate(() => {
      const out = {}, f = G.flags;
      for (const k of ['davin_gone', 'pim_lured', 'church_come', 'rite_ready', 'rite_started', 'rooke_boots']) delete f[k];
      const talkTo = (id, map, quiet) => { loadMap(map); G.state = 'play'; const e = G.ents.find((o) => o.id === id), q = NPCS[id].quest; if (quiet) NPCS[id].quest = () => null; try { const n0 = window.__ev.length; talk(e); const ev = window.__ev[window.__ev.length - 1]; if (window.__ev.length > n0 && ev && ev.t === 'A bell in earshot') { const c = ev.c.find((o) => /slate/.test(o.t)); if (c) c.f(); } } finally { NPCS[id].quest = q; } /* js/audit54.js: a bell in earshot asks first */ const log = DLG.log.map((l) => l.t); closeModal(); G.state = 'play'; return log; };
      const topicOf = (id, key) => { DLG.npc = NPCS[id]; DLG.log = []; askTopic(key); return DLG.log.map((l) => l.t).join(' '); };
      DLG.tone = 'polite'; G.day = 0; G.tod = 0.8; DAYS35.sync();
      out.d0 = { hetty: talkTo('hetty', 'tavern', true), rooke: talkTo('rooke', 'surgery'), boots: G.has('boots'), rumour: RUMOURS.some((r) => /^Davin Hale/.test(r)) };
      G.day = 2; G.tod = 21 / 24; DAYS35.sync();
      out.d2 = { gone: !!f.davin_gone, rooke: talkTo('rooke', 'surgery'), boots: G.has('boots') };
      G.day = 3; G.tod = 0.3; DAYS35.sync();
      out.d3 = { rooke: talkTo('rooke', 'surgery'), boots: G.has('boots'), lured: !!f.pim_lured };
      G.day = 3; G.tod = 20 / 24; DAYS35.sync();
      out.lured = !!f.pim_lured && /I went/.test(DAYS35.TX.pimLured);
      G.day = 4; G.tod = 0.5; window.__msgs.length = 0; DAYS35.sync();
      out.d4 = { church: !!f.church_come };
      G.day = 5; G.tod = 8 / 24; DAYS35.sync();   // after the hour js/church55.js holds it for
      out.d5 = { church: !!f.church_come, herald: window.__msgs.some((t) => /^At sunrise the Church comes up the Greenroot road/.test(t) && /Lyra Ashgrove, kept in the Church's protection/.test(t)), journal: G.journal.some((j) => /^The Church came up the Greenroot road/.test(j.text)) };
      loadMap('chapel'); G.state = 'play';
      out.chapel = G.ents.some((o) => o.id === 'ignatius' && !o.hidden);
      out.lyra = talkTo('lyra', 'lyra_house', true);
      loadMap('lyra_house'); G.state = 'play';
      out.guards = G.ents.filter((o) => o.p35_guard && !o.hidden).length;
      { const m = G.maps.lyra_house, b = m.baseCount; out.base = !!(m.entities[b - 1].p35_guard && m.entities[b - 2].p35_guard && !m.entities.slice(b).some((o) => !o.transient)); }
      return out;
    });
    const couriersSrc = src('js/couriers.js');
    check(!/Davin/.test(days.d0.hetty.join(' ')) && /House rule/.test(days.d0.hetty.join(' ')) && !days.d0.boots && !days.d0.rumour, 'on Nullday nobody speaks of Davin as dead, and Rooke has no boots to carry (' + JSON.stringify(days.d0) + ')');
    check(days.d2.gone && !days.d2.boots && days.d3.boots && /Davin Hale\'s boots/.test(days.d3.rooke.join(' ')) && !days.d3.lured, 'Davin dies on Hearthday evening; Rooke gives his boots from Massday morning');
    check(days.lured && /f\.pim_lured/.test(couriersSrc), 'Pim is lured at the Listening Hour on Massday, and he goes; Lyra brings him back');
    check(!days.d4.church && days.d5.church && days.d5.herald && days.d5.journal && days.chapel, 'the Church comes at sunrise on Dawnday, the warrant is read, and Ignatius is in the chapel');
    check(days.lyra.some((l) => /in the rubric/.test(l)) && /CAN'T TALK|NOT HERE|very fortunate/.test(days.lyra.join(' ')) && days.guards === 2 && days.base, 'Lyra is in the Church\'s protection: two Legionnaires at her door, and she answers on a slate (' + JSON.stringify(days.lyra.slice(0, 2)) + ')');

    // ---- Halder Wick's table is unanswered (ch. 15, l. 4435), and nobody on the Cloister pegs is a Wick
    const halder = await page.evaluate(() => {
      const out = {}, f = G.flags;
      for (const k of ['halder_done', 'halder_sat', 'halder_told', 'halder_rest', 'halder_dead', 'wick_dresser']) delete f[k];
      out.greet = JSON.stringify(NPCS.halder.greet) + NPCS.halder.quest(G).text;
      loadMap('wickhouse'); G.state = 'play';
      window.__ev.length = 0; const before = G.has('adaletter');
      useDeco(G.ents.find((o) => o.use === 'wick_letter'));
      const ev = window.__ev[0];
      out.dresser = !!ev && /nothing in this house says/.test(ev.b) && !before && !G.has('adaletter') && G.journal.some((j) => /I do not know who he was expecting\. There is no one left to ask\./.test(j.text));
      f.cloak_names = true; out.quest = NPCS.halder.quest(G).choices.map((c) => c.t).join(' | ');
      return out;
    });
    check(!/Bryony|the boys/.test(halder.greet) && /four/.test(halder.greet), 'Halder\'s murmurs name nobody');
    check(halder.dresser && !/tape|collar/i.test(halder.quest), 'the Wick house answers nothing, and no name-tape lays Halder to rest: "There is no one left to ask."');
    check(!/Bryony|Tom Wick|\bWat\b/.test(['js/grove.js', 'js/couriers.js', 'js/maps.js', 'js/dreams.js'].map(src).join('\n')) && !/Tom Wick|halder_rest = true/.test(src('js/data.js')), 'nothing in the game names who Halder is expecting');

    // ---- One Wearer (ch. 20, 23): the mast is a voice and a hound pack; the Cloister porch is Voice at the Door, not a fight
    const wearer = await page.evaluate(() => {
      const out = {}, f = G.flags;
      // the Oakhaven mast, after the Greening, with the Hedge answered
      loadMap('oakhaven'); G.state = 'play';
      const t = G.map.triggers.find((o) => o.id === 'mast'); Engine.cam.x = t.x; Engine.cam.y = t.y; t.inside = false;
      Object.assign(f, { greening: true, hedge_answered: true }); delete f.mast_voice; delete f.part3; delete f.part4;
      window.__ended = 0; const _end = window.ending; window.ending = () => { window.__ended++; };
      const hounds0 = G.ents.filter((o) => o.kind === 'enemy' && o.type === 'hound' && !o.dead).length;
      window.__msgs.length = 0; checkTriggers();
      out.mast = f.mast_voice && !G.ents.some((o) => o.kind === 'enemy' && o.type === 'wearer') && G.ents.filter((o) => o.kind === 'enemy' && o.type === 'hound' && !o.dead).length === hounds0 + 3 && window.__msgs.some((m) => /"Grab the line\." It followed your voice here/.test(m)) && window.__ended === 0;
      for (const o of G.ents) if (o.kind === 'enemy' && o.type === 'hound') o.dead = true;
      t.inside = false; checkTriggers(); out.mastEnd = window.__ended === 1;
      window.ending = _end; delete f.greening; delete f.hedge_answered;
      // the porch
      loadMap('whispergrove'); G.state = 'play';
      Object.assign(f, { part3: true, aegis_done: true, aegis_calmed: true }); for (const k of ['wearer_porch', 'porch_survived', 'porch_held', 'porch_aside', 'porch_slate', 'porch_answered', 'porch_told_lyra', 'lyra_porch']) delete f[k];
      const before = G.ents.length; window.__ev.length = 0; wgTrigger({ id: 'wearer_porch', x: 19.5, y: 10.4, r: 2 });
      const titles = [];
      const step = (pick) => { const ev = window.__ev[window.__ev.length - 1]; titles.push(ev.t); const c = ev.c.find((o) => pick.test(o.t)); if (c && c.f) c.f(); return !!c; };
      out.chain = step(/Do not turn/) && step(/Hold up a child's slate/) && step(/^Say nothing/) && step(/Stand in the doorway, arms across/) && step(/Keep them there/) && step(/Breathe/);
      out.titles = titles.join(' | ');
      out.porch = f.wearer_porch && f.porch_survived && f.porch_held && f.porch_slate && !f.porch_answered && G.ents.length === before && !G.ents.some((o) => o.kind === 'enemy' && o.type === 'wearer') && G.journal.some((j) => /^Voice at the Door: .*would not come in/.test(j.text) && /held the doorway/.test(j.text));
      // Lyra at the landing, and Kaelen at the fire
      f.lyra_wg_met = true; f.lyra_aegis = true; f.round_hook = true; const q = NPCS.lyra_wg.quest(G);
      out.lyraAsk = !!q.choices && /IT FOLLOWED US/.test(q.text) && q.choices.length === 2; out.q = q.text.slice(0, 90);
      if (q.choices) q.choices[0].f(G); out.told = !!f.porch_told_lyra;
      f.kaelen_dw_done = true; f.kaelen_log = true; out.kaelenKnows = /She knows\. She has known since the Cloister porch/.test(NPCS.kaelen_dw.quest(G).text);
      f.porch_told_lyra = false; out.kaelenNot = /She does not know/.test(NPCS.kaelen_dw.quest(G).text);
      delete f.kaelen_dw_done;
      return out;
    });
    check(wearer.mast && wearer.mastEnd, 'at the mast the thing that learned your voice sends hounds and will not come into the light; the Kestrel lifts once they are dead');
    check(wearer.chain && wearer.porch, 'at the Cloister porch the Wearer talks and sings in the fog and is not fought: the slate, the doorway, seven hymns (' + wearer.titles + ')');
    check(wearer.lyraAsk && wearer.told && wearer.kaelenKnows && wearer.kaelenNot, 'Lyra asks what it said; telling her is why Kaelen says she has known since the porch (' + JSON.stringify([wearer.lyraAsk, wearer.told, wearer.kaelenKnows, wearer.kaelenNot, wearer.q]) + ')');
    check(!/type: 'wearer'/.test(src('js/game.js') + src('js/grove.js')), 'nothing spawns a Wearer before the coda');

    // ---- The ring of lamps (ch. 23): the coda is in the clearing; the choir keeps the Requiem for afterwards
    const ring = await page.evaluate(() => {
      const out = {}, f = G.flags;
      const RESET = ['coda_done', 'coda_go', 'coda_by_you', 'ring_set', 'ring_go', 'ring_fight', 'ring_sung', 'ring_struck', 'ring_back', 'ring_sat_no', 'lyra_dw_met', 'lyra_requiem', 'requiem_done', 'wearer_dead', 'wearer_coda_dead', 'coda_fight', 'coda_sung', 'herald_come', 'kaelen_dw_done', 'kaelen_told_now', 'lyra_voice'];
      for (const k of RESET) delete f[k];
      Object.assign(f, { part4: true, aegis_follow: true, sable_with: true });
      loadMap('deepwoods'); G.state = 'play'; G.player.hp = G.player.hpMax = 999;
      const lamps = () => G.ents.filter((o) => o.ringLamp), rl = () => G.ents.find((o) => o.ringLyra), cl = () => G.ents.find((o) => o.id === 'lyra_dw' && !o.ringLyra);
      const t = G.map.triggers.find((o) => o.id === 'ring');
      const tc = { id: 'coda_choir', said: false, done: false }; window.__msgs.length = 0; codaTrigger(tc);
      out.choirWaits = !f.coda_fight && !tc.done && window.__msgs.some((m) => /The thing in the woods wears her father, and it comes first/.test(m));
      let q = NPCS.lyra_dw.quest(G); out.first = /IT FOLLOWED US/.test(q.text) && /RING OF LAMPS/.test(q.text) && /I NEED MY VOICE/.test(q.text);
      q = NPCS.lyra_dw.quest(G); out.noVoice = /I HAVE NO VOICE/.test(q.text) && q.choices.length === 2 && /Sing it yourself/.test(q.choices[0].t);
      f.lyra_voice = true; f.kaelen_told_now = true;
      q = NPCS.lyra_dw.quest(G); out.plan = /kill it tonight/.test(q.text) && /Set the ring of lamps/.test(q.choices[0].t);
      const d0 = G.day; const plan = q.choices[0].f(G);
      out.set = f.ring_set && f.ring_go && G.day === d0 + 1 && Math.abs(G.tod - 2 / 24) < 1e-9 && lamps().length === 6 && lamps().every((o) => !o.hidden) && !rl().hidden && cl().hidden && /Bait doesn't sing/.test(plan) && /may I say the obvious thing/.test(plan);
      out.lyraAt = Math.hypot(rl().x - RING.bx, rl().y - RING.by) < 0.01 && RING.by < RING.cy && Math.hypot(RING.bx - RING.cx, RING.by - RING.cy) < RING.r;
      Engine.cam.x = RING.cx; Engine.cam.y = RING.cy; t.inside = false; checkTriggers(); out.fight = !!f.ring_fight;
      let spawnT = null, passive = true;
      for (let i = 0; i < 44 * 30 && f.ring_t > 1; i++) { codaTick(1 / 30); const w = ringWearer(); if (w) { if (spawnT == null) spawnT = f.ring_t; if (w.state !== 'passive') passive = false; } }
      out.circles = spawnT != null && spawnT <= 31 && spawnT > 29 && passive && !f.ring_sung && !!ringWearer() && ringWearer().transient;
      codaShield(ringWearer(), 10);
      out.early = !f.ring_fight && !f.ring_set && !f.ring_go && !ringWearer() && lamps().every((o) => o.hidden) && !cl().hidden && G.journal.some((j) => /the ring failed\. I struck too early/.test(j.text));
      q = NPCS.lyra_dw.quest(G); q.choices[0].f(G); Engine.cam.x = RING.cx; Engine.cam.y = RING.cy; t.inside = false; checkTriggers();
      for (let i = 0; i < 60 * 30 && !f.ring_sung; i++) codaTick(1 / 30);
      const w = ringWearer(); const dC = Math.hypot(w.x - RING.cx, w.y - RING.cy), dB = Math.hypot(w.x - RING.bx, w.y - RING.by);
      out.close = f.ring_sung && dC < RING.r + 1.0 && dB < 1.3 && f.ring_w > 0 && window.__msgs.some((m) => /I know it's a two-voice part/.test(m));
      window.__ev.length = 0; const dmg = codaShield(w, 10); w.hp -= dmg; if (w.hp <= 0) killEnemy(w, true);
      out.kill = f.coda_done && f.wearer_coda_dead && f.wearer_dead && f.ring_struck === 'you' && !f.ring_fight && window.__ev.length === 1 && /It comes apart four feet in front of her/.test(window.__ev[0].t) && /Davin Hale, singing the fourth line/.test(window.__ev[0].b) && /Louder\./.test(window.__ev[0].b) && /nine feet of bronze/.test(window.__ev[0].b);
      window.__ev[0].c[0].f(); const after = window.__ev[1]; after.c[0].f();
      out.after = !!after && /Say something/.test(after.b) && after.c[0].t === '"No."' && f.ring_sat_no && G.journal.some((j) => /^Coda: in the clearing by the Mausoleum of Chords, inside the ring of lamps/.test(j.text));
      loadMap('deepwoods'); G.state = 'play'; out.back = f.ring_back && rl().hidden && !cl().hidden && lamps().every((o) => !o.hidden);
      q = NPCS.lyra_dw.quest(G); out.requiemAsk = /Not the Wearer\. Something older/.test(q.text) && f.lyra_requiem;
      loadMap('mausoleum'); G.state = 'play'; const tc2 = { id: 'coda_choir', said: false, done: false }; codaTrigger(tc2);
      out.choir = tc2.done && f.coda_fight && G.ents.some((o) => o.kind === 'enemy' && o.type === 'requiem' && !o.dead) && !G.ents.some((o) => o.kind === 'enemy' && o.type === 'wearer_coda');
      f.coda_sung = true; const rq = G.ents.find((o) => o.kind === 'enemy' && o.type === 'requiem'); killEnemy(rq, true);
      out.requiem = f.requiem_done && f.coda_done && G.journal.some((j) => /^The Requiem: in the choir/.test(j.text));
      out.ending = codaEndingLines().some((l) => /inside a ring of hush-lamps/.test(l) && /You struck it four feet in front of her/.test(l)) && codaEndingLines().some((l) => /against the Requiem/.test(l));
      for (const k of RESET) delete f[k];
      loadMap('deepwoods'); G.state = 'play'; q = NPCS.lyra_dw.quest(G); q = NPCS.lyra_dw.quest(G); q.choices[0].f(G);
      out.byYou = f.coda_by_you && f.ring_set && rl().hidden && cl().hidden;
      Engine.cam.x = RING.cx + 1.8; Engine.cam.y = RING.cy; t.inside = false; checkTriggers(); out.byYouFight = !!f.ring_fight;
      codaTick(1 / 30); out.byYouOut = !f.ring_fight && G.journal.some((j) => /I stepped off the spot past the last lamp/.test(j.text));
      q = NPCS.lyra_dw.quest(G); q.choices[0].f(G); Engine.cam.x = RING.bx; Engine.cam.y = RING.by; t.inside = false; checkTriggers();
      const v0 = G.player.voice; window.__ev.length = 0;
      for (let i = 0; i < 70 * 30 && !f.coda_done; i++) codaTick(1 / 30);
      out.kaelen = f.coda_done && f.ring_struck === 'kaelen' && G.player.voice < v0 && window.__ev.length === 1 && /Kaelen comes out of the dark behind it/.test(window.__ev[0].b);
      for (const k of RESET) delete f[k];
      return out;
    });
    check(ring.choirWaits && ring.first && ring.noVoice && ring.plan && ring.set && ring.lyraAt, 'Lyra plans the ring of lamps at the fire; the lamps go up and she stands past the last one; the choir waits (' + JSON.stringify(ring) + ')');
    check(ring.fight && ring.circles && ring.early, 'the office is sung and the Wearer circles in from the dark; a strike before the close sends it away, and the night is lost');
    check(ring.close && ring.kill && ring.after, 'she sings the close alone with it four feet in front of her inside the lamps; one strike bursts it; "Say something" / "No."');
    check(ring.back && ring.requiemAsk && ring.choir && ring.requiem && ring.ending, 'next morning she is back at the fire; the Mausoleum choir keeps the Requiem for afterwards (' + JSON.stringify([ring.back, ring.requiemAsk, ring.choir, ring.requiem, ring.ending]) + ')');
    check(ring.byYou && ring.byYouFight && ring.byYouOut && ring.kaelen, 'without her voice you stand past the last lamp and sing, and Kaelen strikes');

    // ---- Sable stays in Whisper-Grove (ch. 14, 16); the Reach's scribe is Umber, a Veil runaway [PROPOSED]
    const umber = await page.evaluate(() => {
      const out = {}, f = G.flags;
      for (const k of ['sable_met', 'sable_done', 'sable_returned', 'sable_kept', 'sable_accused', 'sable_aboard', 'sable_joined', 'sable_with', 'bettis_awake', 'hew_thanked']) delete f[k];
      out.npc = !!NPCS.umber && !NPCS.sable && NPCS.umber.portrait !== NPCS.sable_wg.portrait && /runaway of the Veil/.test(NPCS.umber.name) && /Sable is a Veil designation/.test(NPCS.sable_wg.topics['The scribe in the mist']) && /Sable designed it/.test(NPCS.umber.topics['The Catalogue']);
      out.clearing = G.maps.clearing.entities.some((e) => e.kind === 'npc' && e.id === 'umber') && !G.maps.clearing.entities.some((e) => e.kind === 'npc' && e.id === 'sable');
      // three names, then Hew Callan's, at the cost of Umber's bell; Sable's own fragments are untouched
      let q = NPCS.umber.quest(G); out.first = /I am Umber/.test(q.text) && /Loose Leaves/.test(q.text) && f.sable_met;
      const n0 = G.ledger.length; G.ledger.push({ name: 'A', where: 'x', day: 0 }, { name: 'B', where: 'x', day: 0 }, { name: 'C', where: 'x', day: 0 });
      q = NPCS.umber.quest(G); out.ask = !!q.choices && /scriptorium bell at matins/.test(q.text) && q.choices.length === 3;
      const r = q.choices[0].f(G);
      out.hew = f.sable_returned && f.sable_done && /A bell/.test(r) && umberFragments(G) === 2 && sableFragments(G) === 3 && G.maps.quarry.entities.some((e) => e.restore === 'hew' && e.name === 'Hew Callan, pump-man') && G.journal.some((j) => /^Umber read a name back out of the Veil's Loose Leaves/.test(j.text));
      f.bettis_awake = true; out.frag = sableFragments(G) === 2 && umberFragments(G) === 2; delete f.bettis_awake;
      G.ledger.length = n0;
      // the Kestrel: Umber stays; Sable is at the fountain, never aboard
      f.greening = true; const st = G.state; G.state = 'play'; ending(); const L = document.getElementById('ending-text').textContent; hide('#ending'); G.state = st;
      out.ending = /Umber does not come to the rope/.test(L) && !/Sable comes up the rope/.test(L) && /runaway of the Veil in the mist said the order's last archivist/.test(L);
      delete f.greening; delete f.escaped;
      return out;
    });
    check(umber.npc && umber.clearing, 'the scribe in the mist outside the Hedge is Umber, a runaway of the Veil, not Sable');
    check(umber.first && umber.ask && umber.hew && umber.frag, 'Umber reads Hew Callan his name from the Veil\'s leaves at the cost of her bell; Sable\'s three fragments are her own');
    check(umber.ending, 'Umber stays in the Reach when the Kestrel lifts; the course is set for the archivist in the drowned city');
    check(!/sable_aboard = true/.test(src('js/grove.js')) && !/f\.sable_aboard \?/.test(src('js/grove.js')) && !/f\.sable_aboard\)/.test(src('js/data.js')), 'Sable never comes up the rope: nothing sets sable_aboard');

    // ---- French for every new line
    const tsv = ['tools/i18n/p32-canon.tsv', 'tools/i18n/p33-crates.tsv', 'tools/i18n/p34-hob.tsv', 'tools/i18n/p35-cutter.tsv', 'tools/i18n/p36-days.tsv', 'tools/i18n/p37-halder.tsv', 'tools/i18n/p38-wearer.tsv', 'tools/i18n/p39-lamps.tsv', 'tools/i18n/p40-umber.tsv'].map(src).join('\n').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const fr = JSON.parse(src('locales/story/fr.json'));
    const { hash, norm } = require(path.join(ROOT, 'tools/i18n/lib'));
    const pats = new Set((fr.p || []).map((p) => p[0]));
    const missing = tsv.filter(([en]) => !(fr.s[hash(norm(en))] || pats.has(norm(en))));
    check(tsv.length >= 390 && tsv.every((r) => r.length === 2) && !missing.length, 'every changed line has its French (' + missing.length + ' missing)');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL CANON PASS TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
