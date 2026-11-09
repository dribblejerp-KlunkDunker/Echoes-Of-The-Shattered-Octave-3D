// PREVIEW_URL=http://127.0.0.1:3822 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/sidequests.test.js
// Phase 9 QUESTS: A Reed for Pellow, The Ringing Wood, Telling the Bees. Each is driven end to end with the
// game's own functions (talk, attack, castSong, pickUp, interact, restoreGame), then closed by the Greening,
// saved and loaded mid-quest, and fed hostile flag values.
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SIDEQ_SHOTS || '';
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3822';

async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console:' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof SIDEQ !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Quest Tester');
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
  return { page, errors };
}
const ok = (m) => console.log('PASS ' + m);

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    const ev = (fn, arg) => page.evaluate(fn, arg);

    // ---- in-page helpers and spies
    await ev(() => {
      window.__foreign = {}; window.__xp = 0; { const _q = questXp; questXp = function (n) { window.__xp += n; return _q.apply(this, arguments); }; }
      for (const k of Object.keys(NPCS)) {
        if (k === 'p9_ada' || k === 'p9_tomas' || k === 'bettany') continue;
        const n = NPCS[k]; if (typeof n.quest !== 'function') continue;
        const q = n.quest; n.quest = function () { window.__foreign[k] = (window.__foreign[k] || 0) + 1; return q.apply(this, arguments); };
      }
      window.__nativeReeds = typeof REEDS !== 'undefined' && !!REEDS && typeof REEDS.tuneFirstReed === 'function';
      window.__h = {
        calm() { for (const m of Object.values(G.maps)) for (const e of m.entities) if (e.kind === 'enemy') { e._keep = { hidden: e.hidden, state: e.state }; e.hidden = true; } },
        go(mapId, x, y, dir) { closeModal(); G.state = 'play'; G.dead = false; G.player.hp = G.player.hpMax; if (G.mapId !== mapId) loadMap(mapId, { x, y, dir }); Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = dir; G.attack.t = 0; G.song.t = 0; },
        ent(id) { return G.ents.find(e => e._p9 === id || (e.kind === 'npc' && e.id === id)); },
        choose(i) { if (!document.querySelector('[data-choice]')) document.querySelector('#d-answer').click(); document.querySelector('[data-choice="' + i + '"]').click(); },
        last() { return DLG.log[DLG.log.length - 1].t; },
        journal() { return G.journal.map(j => j.text); },
        reset() {
          for (const k of Object.keys(G.flags)) if (k.startsWith('p9q_')) delete G.flags[k];
          G.player.inv = G.player.inv.filter(s => !s.id.startsWith('p9_'));
          SIDEQ.state.tuning = false; SIDEQ.state.windOverride = null; SIDEQ.state.lastStrikeT = -1e9; SIDEQ.state.calls.length = 0;
          SIDEQ.syncAll(); closeModal(); hide('#event'); G.state = 'play';
        },
        flagsP9() { const o = {}; for (const k of Object.keys(G.flags)) if (k.startsWith('p9q_')) o[k] = G.flags[k]; return o; },
        weapon(id) { const p = G.player; if (!p.weapons.includes(id)) p.weapons.push(id); p.weapon = p.weapons.indexOf(id); },
        strike() { G.attack.t = 0; G.song.t = 0; attack('swing'); },
      };
      __h.calm();
    });

    // ---- the catalogue and where things stand
    const cat = await ev(() => {
      const bad = [];
      const spots = [];
      for (const sp of SIDEQ.SPECS) {
        const m = G.maps[sp.map]; if (!m) { bad.push(sp.id + ' map missing'); continue; }
        spots.push(sp.id);
      }
      return { items: ['p9_split_reed', 'p9_wool', 'p9_bough'].map(i => !!ITEMS[i] && ITEMS[i].name.length > 3), npcs: ['p9_ada', 'p9_tomas'].map(i => typeof NPCS[i].quest === 'function'), bad, spots: spots.length, on: UPG.sideQuests };
    });
    assert.deepEqual(cat.items, [true, true, true]); assert.deepEqual(cat.npcs, [true, true]); assert.deepEqual(cat.bad, []);
    assert.equal(cat.on, true);
    ok('three items, two people, UPG.sideQuests defaults on');

    const place = await ev(() => {
      const out = { bad: [] };
      const reach = (m, sx, sy) => { const seen = new Set([(sx | 0) + ',' + (sy | 0)]); const q = [[sx | 0, sy | 0]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue; const k = nx + ',' + ny; if (seen.has(k) || m.isBlocked(nx, ny)) continue; seen.add(k); q.push([nx, ny]); } } return seen; };
      // light every prop at once so each one is checked
      Object.assign(G.flags, { p9q_pellow: 1, p9q_tomas: 2, p9q_bees: 1 }); SIDEQ.syncAll();
      const starts = { oakhaven: [23.5, 3.5], clearing: [20.5, 32.5], mill: [6.5, 8] };
      for (const mid of ['oakhaven', 'clearing', 'mill']) {
        const m = G.maps[mid], R = reach(m, ...starts[mid]);
        for (const e of m.entities.filter(e => e._p9 && e._p9 !== 'door_nail' && e._p9 !== 'door_reed' && e._p9 !== 'tree')) {
          if (!e.transient && e._p9 !== 'tree') out.bad.push(e._p9 + ' is saved');
          if (m.isBlocked(e.x | 0, e.y | 0)) out.bad.push(e._p9 + ' stands in a wall');
          if (!(R.has((e.x | 0) + ',' + (e.y | 0)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R.has(((e.x + dx) | 0) + ',' + ((e.y + dy) | 0))))) out.bad.push(e._p9 + ' cannot be reached');
          for (const o of m.entities) if (o !== e && o.solid && o.kind !== 'enemy' && !o.hidden && o.x !== undefined && Math.hypot(o.x - e.x, o.y - e.y) < 0.6 && e.solid) out.bad.push(e._p9 + ' overlaps ' + (o.sprite || o.id));
        }
        out[mid] = m.entities.filter(e => e._p9).map(e => e._p9).sort().join(',');
      }
      const tree = G.maps.clearing.entities.find(e => e._p9 === 'tree');
      out.tree = !!tree && tree.use === 'p9_tree';
      __h.reset();
      return out;
    });
    assert.deepEqual(place.bad, []);
    assert.equal(place.oakhaven, 'ada,door_nail,hive1,hive2,hive3'); assert.equal(place.clearing, 'bough,stump,tomas,tree,wagon'); assert.equal(place.mill, 'fleece'); assert(place.tree);
    ok('every prop is transient (never saved), on open floor, reachable, clear of solids; the chalked oak is an existing tree');

    const fresh = await ev(() => ({ oak: G.maps.oakhaven.entities.filter(e => e._p9).map(e => e._p9).sort().join(','), cl: G.maps.clearing.entities.filter(e => e._p9).map(e => e._p9).sort().join(','), flags: __h.flagsP9(), treeUse: G.maps.clearing.entities.filter(e => e.sprite === 'oak' && e.use === 'p9_tree').length }));
    assert.equal(fresh.oak, 'ada,door_reed'); assert.equal(fresh.cl, 'tomas,wagon'); assert.deepEqual(fresh.flags, {}); assert.equal(fresh.treeUse, 0);
    ok('a fresh game: Ada and the split reed in Oakhaven, Tomas and his wagon in the clearing, no hives, no tagged tree, no flags');

    // ---- text: the French file covers every string, rumours obey the rumours rules, nothing carries markup
    const T = await ev(() => ({ texts: SIDEQ.TEXTS.slice(), rum: STORYRUM.RUMOURS.filter(r => r.id.startsWith('d_p9_')).map(r => ({ id: r.id, text: r.text, req: r.req, not: r.not, rank: r.rank, cat: r.cat })), all: STORYRUM.RUMOURS.map(r => r.id), loc: STORYRUM.LOCAL.find(l => l.id === 'p9_timber') }));
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p9-quests.tsv'), 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
    assert(tsv.every(r => r.length === 2 && r[0].trim() && r[1].trim()), 'every tsv line is "english<TAB>french"');
    const fr = new Map(tsv.map(r => [r[0], r[1]]));
    assert.equal(fr.size, tsv.length, 'no duplicate english keys');
    const missing = T.texts.filter(t => !fr.has(t)); assert.deepEqual(missing, [], 'untranslated: ' + missing.map(m => m.slice(0, 50)).join(' | '));
    const extra = [...fr.keys()].filter(k => !T.texts.includes(k)); assert.deepEqual(extra, [], 'tsv has strings the code does not');
    assert(T.texts.every(t => !/[<>&]/.test(t)), 'no markup characters in any shown text');
    assert(tsv.every(r => !/\s{2,}|\t/.test(r[1]) && !/[«»]/.test(r[1])), 'french is plain text (merge.js normalises typography)');
    assert(tsv.every(r => (r[0].match(/\{\d\}/g) || []).join() === (r[1].match(/\{\d\}/g) || []).join()), 'placeholders kept');
    // item names carry a gender code on the French side
    for (const k of ['Split First Reed', 'Bundle of Carded Wool', 'Iron-bough Log']) assert(/\|(m|f)$/.test(fr.get(k)), k + ' has a gender code');
    // french that still reads as english would be a missed line
    assert(tsv.filter(r => r[0] === r[1]).length === 0, 'no untranslated copies');
    ok('p9-quests.tsv: ' + tsv.length + ' lines cover all ' + T.texts.length + ' strings, plain text, placeholders and gender codes in order');

    assert.equal(T.rum.length, 6); assert.equal(new Set(T.all).size, T.all.length, 'rumour ids unique');
    for (const r of T.rum) {
      const sentences = r.text.split(/(?<=[.!?])\s+/);
      assert(sentences.length >= 1 && sentences.length <= 4, r.id + ' length in sentences ' + sentences.length);
      assert(r.text.length > 20 && r.text.length < 330, r.id + ' length');
      assert(r.cat === 'deed' && r.req && r.req.length, r.id + ' is a gated deed');
    }
    assert(T.loc && T.loc.t.length > 20, 'a Gazette line');
    const gate = await ev(() => {
      const E = (flags) => STORYRUM.eligible(STORYRUM.context({ has: (k) => !!flags[k] }), 'patron').map(r => r.id).filter(i => i.startsWith('d_p9_'));
      return { fresh: E({}), pOpen: E({ p9q_pellow: 1 }), pDone: E({ p9q_pellow: 1, p9q_pellow_done: true }), tOpen: E({ p9q_tomas: 1 }), tDone: E({ p9q_tomas_done: true }), bOpen: E({ p9q_bees: 1 }), bDone: E({ p9q_bees_done: true }), green: E({ p9q_bees_done: true, greening: true }),
        local: STORYRUM.localFor(STORYRUM.context({ has: (k) => k === 'p9q_tomas_done' })), localNot: STORYRUM.localFor(STORYRUM.context({ has: () => false })) };
    });
    assert.deepEqual(gate.fresh, []); assert.deepEqual(gate.pOpen, ['d_p9_pellow_open']); assert.deepEqual(gate.pDone, ['d_p9_pellow_done']);
    assert.deepEqual(gate.tOpen, ['d_p9_tomas_open']); assert.deepEqual(gate.tDone, ['d_p9_tomas_done']); assert.deepEqual(gate.bOpen, ['d_p9_bees_open']); assert.deepEqual(gate.bDone, ['d_p9_bees_done']); assert.deepEqual(gate.green, []);
    assert(gate.local && gate.local.id === 'p9_timber' && gate.localNot === null);
    ok('six tavern rumours (gated by quest state, hidden once the town is gone) and a Gazette "Local matters" line in Office dialect');

    // ============================================================ quest 1: A Reed for Pellow
    await ev(() => __h.go('oakhaven', 18.5, 30.6, Math.PI));
    await page.waitForTimeout(300);
    // the real interact path reaches her
    const q1a = await ev(() => { interact(); return { state: G.state, who: DLG.npc && DLG.npc.name, text: DLG.log[0] && DLG.log[0].t, choices: DLG.choices && DLG.choices.length }; });
    assert.equal(q1a.state, 'dialogue'); assert(/Ada Pellow/.test(q1a.who)); assert.equal(q1a.choices, 2); assert(/That is Joram's reed/.test(q1a.text));
    await ev(() => { closeModal(); G.state = 'play'; });
    // decline leaves everything alone
    const q1b = await ev(() => { talk(__h.ent('ada')); __h.choose(1); const r = { flags: __h.flagsP9(), last: __h.last(), has: G.has('p9_split_reed') }; closeModal(); G.state = 'play'; return r; });
    assert.deepEqual(q1b.flags, {}); assert(/Nobody can/.test(q1b.last)); assert.equal(q1b.has, false);
    // accept
    const q1c = await ev(() => { talk(__h.ent('ada')); __h.choose(0); const r = { flags: __h.flagsP9(), has: G.has('p9_split_reed'), j: __h.journal()[0], door: G.ents.filter(e => e._p9 === 'door_reed').length, nail: G.ents.filter(e => e._p9 === 'door_nail').length, giver: LOGMAP.QUEST_GIVERS.includes('p9_ada'), marker: !!UPG.questMarkers }; closeModal(); G.state = 'play'; return r; });
    assert.deepEqual(q1c.flags, { p9q_pellow: 1 }); assert(q1c.has); assert(/Ada Pellow, on Cooper's Row/.test(q1c.j));
    assert.equal(q1c.door, 0); assert.equal(q1c.nail, 1); assert(q1c.giver, 'marker list names her while the quest is open');
    ok('Ada: decline changes nothing; accept gives the split reed, one logbook line, the empty nail, a quest marker');

    // she waits until you have the note
    const q1d = await ev(() => { talk(__h.ent('ada')); const r = { t: __h.last(), ch: DLG.choices }; closeModal(); G.state = 'play'; return { t: r.t, ch: !!r.ch }; });
    assert(/Have you his note/.test(q1d.t)); assert.equal(q1d.ch, false);

    // Tam: the button is there only once the quest is open, and he will not talk about Joram while his own question sits unanswered
    const tam = await ev(() => {
      __h.go('oakhaven', 53, 47.6, Math.PI);
      const e = G.ents.find(x => x.kind === 'npc' && x.id === 'tam'); DLG.npc = NPCS.tam; DLG.ent = e; DLG.log = []; G.state = 'dialogue'; renderDialogue(null);
      const btn = document.querySelector('#d-p9-tam');
      const out = { btn: !!btn, label: btn && btn.textContent };
      btn.click(); out.busy = __h.last(); out.stage = SIDEQ.stage('pellow');
      G.flags.tam_told = true; document.querySelector('#d-p9-tam').click();
      out.told = DLG.log.slice(-3).map(l => l.t); out.stage2 = SIDEQ.stage('pellow'); out.via = G.flags.p9q_pellow_via; out.j = __h.journal()[0];
      out.again = (() => { document.querySelector('#d-p9-tam').click(); return DLG.log.slice(-2).map(l => l.t); })();
      out.after = Object.assign({}, __h.flagsP9());
      closeModal(); G.state = 'play'; delete G.flags.tam_told;
      return out;
    });
    assert(tam.btn && tam.label === 'Ask about Joram Pellow'); assert(/question of my own/.test(tam.busy)); assert.equal(tam.stage, 1);
    assert(/Nine winters/.test(tam.told[1]) && /two hundred and three/.test(tam.told[2])); assert.equal(tam.stage2, 2); assert.equal(tam.via, 1); assert(/two hundred and three/.test(tam.j));
    assert(/Again, then/.test(tam.again[0]));
    assert.deepEqual(tam.after, { p9q_pellow: 2, p9q_pellow_via: 1 });
    ok('Tam: the button appears only when it matters, he is busy until his own question is answered, then hums 203 Hz; the pitch is learnt once');

    // not before: with the quest not open there is no button on Tam or Kaelen
    const nobtn = await ev(() => {
      const hold = Object.assign({}, G.flags); __h.reset();
      const e = G.ents.find(x => x.kind === 'npc' && x.id === 'tam'); DLG.npc = NPCS.tam; DLG.ent = e; DLG.log = []; G.state = 'dialogue'; renderDialogue(null);
      const r = { tam: !!document.querySelector('#d-p9-tam') }; closeModal(); G.state = 'play';
      Object.assign(G.flags, hold); G.give('p9_split_reed'); SIDEQ.syncAll(); return r;
    });
    assert.equal(nobtn.tam, false);

    // back to Ada: the cut-and-tune choice, plain path (no REEDS module in this build; a stand-in is used below)
    const hasStub = await ev(() => typeof REEDS === 'undefined');
    const native = await ev(() => window.__nativeReeds);
    const startTune = async () => {
      await ev(() => { __h.go('oakhaven', 18.5, 30.6, Math.PI); talk(__h.ent('ada')); __h.choose(0); });
    };
    const endState = () => ev(() => ({ flags: __h.flagsP9(), gold: G.player.gold, honey: G.count('honey'), xp: (window.__xp || 0), voice: G.player.voice, split: G.has('p9_split_reed'), state: G.state, ev: (document.querySelector('#event-panel') || document.querySelector('#event') || {}).textContent || '', calls: SIDEQ.state.calls.slice(), tuning: SIDEQ.state.tuning, door: (G.ents.find(e => e._p9 === 'door_reed') || {}).sprite, nail: G.ents.filter(e => e._p9 === 'door_nail').length, giver: LOGMAP.QUEST_GIVERS.includes('p9_ada'), j: __h.journal()[0] }));

    if (hasStub) {
      // the contract of REEDS.tuneFirstReed is the reedcraft team's: read every sane answer
      const variants = [
        ['cancel by false', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; return false; } };', 'cancel'],
        ['cancel by a Promise of false', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; return Promise.resolve(false); } };', 'cancel'],
        ['success by a Promise', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; return Promise.resolve({ ok: true }); } };', 'success'],
        ['success by the done callback', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; setTimeout(o.done, 80); } };', 'success'],
        ['cancel by the cancel callback', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; setTimeout(o.cancel, 80); } };', 'cancel'],
        ['success by a truthy return', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; return true; } };', 'success'],
        ['success when the panel closes (no return)', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; } };', 'success'],
        ['a thrown error falls back to the plain path', 'window.REEDS = { tuneFirstReed(o) { window.__reedArg = o; throw new Error("boom"); } };', 'success'],
      ];
      let i = 0;
      for (const [label, code, want] of variants) {
        await ev(() => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 1 }); G.give('p9_split_reed'); SIDEQ.syncAll(); window.__reedArg = null; });
        await ev(code);
        const before = await ev(() => ({ gold: G.player.gold, xp: (window.__xp || 0) }));
        await startTune();
        await page.waitForTimeout(label.includes('panel closes') ? 1500 : 500);
        const s = await endState();
        const arg = await ev(() => window.__reedArg && { name: window.__reedArg.name, hz: window.__reedArg.hz });
        assert.deepEqual(arg, { name: 'Joram Pellow', hz: 203 }, label + ': the call carries the husband\'s name and 203 Hz');
        if (want === 'success') {
          assert(s.flags.p9q_pellow_done === true && s.gold === before.gold + 8 && s.xp === before.xp + 50 && !s.split && s.honey >= 1, label + ' paid once ' + JSON.stringify({ f: s.flags, g: s.gold, bg: before.gold, xp: s.xp, bxp: before.xp, split: s.split, honey: s.honey }));
          assert(/barred from inside/.test(s.ev), label + ': the held scene shows'); assert.equal(s.tuning, false);
          assert.equal(s.door, 'p9_reed_new'); assert.equal(s.nail, 0); assert.equal(s.giver, false);
          if (!label.includes('thrown')) assert.equal(s.calls[0].real, true, label + ': the real path was taken');
        } else {
          assert(!s.flags.p9q_pellow_done && s.split && s.gold === before.gold && s.tuning === false, label + ' left everything as it was ' + JSON.stringify(s));
        }
        i++;
      }
      await ev(() => { delete window.REEDS; });
      ok('reedcraft stand-in: false/Promise(false)/cancel are cancellations that cost nothing and can be retried; Promise, truthy, done and a closed panel are one payment; a throw falls back; name and hz are passed (' + variants.length + ' variants)');
    } else {
      ok('SKIP stand-in variants: a native REEDS exists, tested below');
    }

    // the plain path (REEDS absent): Tam variant, then Kaelen variant
    if (hasStub) {
      for (const via of [1, 2]) {
        await ev((v) => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: v }); G.give('p9_split_reed'); SIDEQ.syncAll(); }, via);
        const before = await ev(() => ({ gold: G.player.gold, honey: G.count('honey'), xp: (window.__xp || 0), voice: G.player.voice, day: G.day }));
        await startTune(); await page.waitForTimeout(400);
        const s = await endState();
        assert.equal(s.calls.length, 1); assert.equal(s.calls[0].real, false, 'plain path used');
        assert.equal(s.flags.p9q_pellow_done, true); assert.equal(s.gold, before.gold + 8); assert.equal(s.honey, before.honey + 1); assert.equal(s.xp, before.xp + 50);
        assert(Math.abs(s.voice - Math.max(0, before.voice - 4)) < 0.6, 'a little voice is spent: ' + before.voice + ' -> ' + s.voice);
        assert(/It was a comfort to have it wrong/.test(s.ev)); assert(via === 1 ? /Tam had it right/.test(s.ev) : /In the cane the whole time/.test(s.ev));
        assert(/hung it over her door/.test(s.j) && /eight sovereigns/.test(s.j));
        // she has gone in and barred the door; the quest cannot be offered twice
        const after = await ev(() => ({ out: G.ents.filter(e => e._p9 === 'ada').length, q: NPCS.p9_ada.quest(G), flags: __h.flagsP9() }));
        assert.equal(after.out, 0); assert.equal(after.q, null); assert.equal(after.flags.p9q_pellow_done, true);
        // paying twice is not possible
        await ev(() => SIDEQ.finishTuning()); const again = await endState(); assert.equal(again.gold, s.gold);
        await ev(() => { hide('#event'); G.state = 'play'; });
      }
      ok('plain path: 8 sovereigns, one honey, 50 XP, a little voice, the held scene (two variants), the reed hung, no second payment');
    }
    if (native) {
      await ev(() => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 1 }); G.give('p9_split_reed'); SIDEQ.syncAll(); });
      await startTune(); await page.waitForTimeout(600);
      const s = await endState();
      assert.equal(s.calls.length, 1); assert.equal(s.calls[0].real, true, 'the native REEDS.tuneFirstReed was called');
      await ev(() => { closeModal(); G.state = 'play'; SIDEQ.state.tuning = false; });
      ok('native REEDS.tuneFirstReed is called through (no deadlock: tuning ' + s.tuning + ')');
    }

    // Kaelen route
    const kae = await ev(() => {
      __h.reset(); Object.assign(G.flags, { p9q_pellow: 1 }); G.give('p9_split_reed'); SIDEQ.syncAll();
      __h.go('clearing', 14.5, 17.5, 0);
      const e = G.ents.find(x => x.kind === 'npc' && x.id === 'kaelen'); DLG.npc = NPCS.kaelen; DLG.ent = e; DLG.log = []; G.state = 'dialogue'; renderDialogue(null);
      const b = document.querySelector('#d-p9-kaelen'); const out = { btn: !!b, label: b && b.textContent };
      b.click(); out.lines = DLG.log.slice(-2).map(l => l.t); out.flags = __h.flagsP9(); out.j = __h.journal()[0]; out.btn2 = !!document.querySelector('#d-p9-kaelen');
      closeModal(); G.state = 'play';
      // without the reed in hand there is no button
      G.take('p9_split_reed'); Object.assign(G.flags, { p9q_pellow: 1 }); delete G.flags.p9q_pellow_via; DLG.npc = NPCS.kaelen; DLG.log = []; G.state = 'dialogue'; renderDialogue(null);
      out.noReed = !document.querySelector('#d-p9-kaelen'); closeModal(); G.state = 'play';
      return out;
    });
    assert(kae.btn && kae.label === 'Ask him to Listen to the split reed'); assert(/Two hundred and three/.test(kae.lines[1]));
    assert.deepEqual(kae.flags, { p9q_pellow: 2, p9q_pellow_via: 2 }); assert(/Kaelen laid his glass hand/.test(kae.j)); assert.equal(kae.btn2, false); assert.equal(kae.noReed, true);
    ok('Kaelen: the Listen button needs the split reed in hand; it sets the pitch once and the button goes');

    // ============================================================ quest 2: The Ringing Wood
    await ev(() => { __h.reset(); __h.go('clearing', 24.6, 31.6, -Math.PI / 2); });
    await page.waitForTimeout(300);
    const t0 = await ev(() => { talk(__h.ent('tomas')); const r = { text: DLG.log[0].t, ch: DLG.choices.length, name: DLG.npc.name }; __h.choose(1); r.declined = __h.last(); r.flags = __h.flagsP9(); closeModal(); G.state = 'play'; return r; });
    assert(/Does it ring\? Good/.test(t0.text)); assert.equal(t0.ch, 2); assert(/Tomas/.test(t0.name)); assert(/Nobody's trade/.test(t0.declined)); assert.deepEqual(t0.flags, {});
    const t1 = await ev(() => { talk(__h.ent('tomas')); __h.choose(0); const r = { flags: __h.flagsP9(), j: __h.journal()[0], tree: G.maps.clearing.entities.filter(e => e._p9 === 'tree').length, giver: LOGMAP.QUEST_GIVERS.includes('p9_tomas'), reply: __h.last() }; closeModal(); G.state = 'play'; return r; });
    assert.deepEqual(t1.flags, { p9q_tomas: 1 }); assert(/one load short/.test(t1.j)); assert.equal(t1.tree, 1); assert(t1.giver); assert(/Three ways/.test(t1.reply));
    const t1b = await ev(() => { talk(__h.ent('tomas')); const r = { t: __h.last() }; closeModal(); G.state = 'play'; return r; });
    assert(/Not yet\. The bough/.test(t1b.t));
    ok('Tomas: decline is clean; accept opens the quest, tags the chalked oak, shows his marker');

    // wool from the mill, through the real interact path, capped at four
    const wool = await ev(() => {
      __h.go('mill', 3.3, 3.2, -Math.PI / 2);
      const f = G.ents.find(e => e._p9 === 'fleece'); const out = { have: !!f, label: f && f.label };
      for (let i = 0; i < 7; i++) useDeco(f);
      out.n = G.count('p9_wool'); out.last = document.querySelector('#msgs') ? document.querySelector('#msgs').textContent : '';
      return out;
    });
    assert(wool.have); assert.equal(wool.n, 4); assert(/all the wool the work will want/.test(wool.last));
    await page.waitForTimeout(300);
    const woolI = await ev(() => { __h.go('mill', 3.3, 3.6, -Math.PI / 2); const before = G.count('p9_wool'); interact(); return { before, after: G.count('p9_wool') }; });
    assert.equal(woolI.after, woolI.before); // already at the cap: the proximity path answered without giving more
    ok('wool: the fleece in the mill gives a bundle each use and stops at four');

    // the strokes: noise by weapon, wool and wind
    const noises = await ev(() => {
      __h.go('clearing', 33.2, 8.2, 0); __h.weapon('axe');
      const tree = SIDEQ.treeEnt(); const out = { tree: !!tree };
      const measure = (setup) => { G.noise = 0; SIDEQ.state.windOverride = null; setup && setup(); G.attack.t = 0; const p0 = SIDEQ.progress(); attack('swing'); const n = G.noise; return { noise: +n.toFixed(2), prog: SIDEQ.progress() - p0 }; };
      out.loud = measure();
      out.wind = measure(() => { SIDEQ.state.windOverride = 1; });
      out.windHalf = measure(() => { SIDEQ.state.windOverride = 0.5; });
      G.flags.p9q_tomas_muff = 4; out.wool = measure();
      G.flags.p9q_tomas_muff = 4; out.both = measure(() => { SIDEQ.state.windOverride = 1; });
      out.muffLeft = G.flags.p9q_tomas_muff;
      __h.weapon('knife'); out.knife = measure(); out.knifeLoudAxeCompare = out.loud.noise;
      __h.weapon('hands'); G.noise = 0; G.attack.t = 0; const p0 = SIDEQ.progress(); attack('swing'); out.hands = { prog: SIDEQ.progress() - p0, msg: document.querySelector('#msgs').textContent };
      out.air = !/finds nothing but air/.test(document.querySelector('#msgs').textContent);
      __h.weapon('axe');
      out.total = SIDEQ.progress(); out.kerf = SIDEQ.kerfLine(out.total);
      return out;
    });
    assert(noises.tree);
    assert.equal(noises.loud.prog, 3, 'an axe stroke is three'); assert(noises.loud.noise > 4.8 && noises.loud.noise < 6, 'bare axe on iron-bough rings: ' + noises.loud.noise);
    assert(noises.wind.noise < noises.loud.noise * 0.45, 'a full gust takes most of the stroke: ' + noises.wind.noise + ' vs ' + noises.loud.noise);
    assert(noises.windHalf.noise < noises.loud.noise && noises.windHalf.noise > noises.wind.noise, 'half a gust is half the help');
    assert(noises.wool.noise < noises.loud.noise * 0.45, 'wool deadens it: ' + noises.wool.noise); assert(noises.both.noise < noises.wool.noise, 'wool and wind together are quietest: ' + noises.both.noise);
    assert.equal(noises.muffLeft, 3, 'each wrapped stroke uses one of the four'); assert.equal(noises.knife.prog, 1); assert.equal(noises.hands.prog, 0);
    assert(/Bare hands will only bruise/.test(noises.hands.msg), 'bare hands do nothing'); assert(noises.air, 'no "swing finds nothing but air" at a tree');
    ok('noise is real: bare axe ' + noises.loud.noise + ', full gust ' + noises.wind.noise + ', wool ' + noises.wool.noise + ', both ' + noises.both.noise + '; power by weapon, one wrap per stroke; hands do nothing');

    // a real hound, by the real noise system: loud wakes it, wool and wind do not
    const hound = await ev(() => {
      const m = G.maps.clearing; const h = m.entities.find(e => e.kind === 'enemy' && e.type === 'hound');
      const out = { found: !!h };
      const arrange = () => { h.hidden = false; h.dead = false; h.hp = 99; h.x = 29.8; h.y = 13.6; h.homeX = h.x; h.homeY = h.y; h.state = 'idle'; delete h.investigation; h.alertT = 0; G.noise = 0; __h.go('clearing', 33.2, 8.2, 0); };
      const run = (setup) => {
        SIDEQ.reset && 0; __h.reset(); Object.assign(G.flags, { p9q_tomas: 1 }); SIDEQ.syncAll(); arrange(); __h.weapon('axe'); setup && setup(); SIDEQ.state.lastStrikeT = -1e9;
        attack('swing'); let st = h.state; for (let i = 0; i < 4; i++) { update(0.05); st = h.state; } return st;
      };
      out.loud = run(); h.hidden = true;
      out.quiet = run(() => { G.flags.p9q_tomas_muff = 4; SIDEQ.state.windOverride = 1; }); h.hidden = true; SIDEQ.state.windOverride = null;
      out.dist = +Math.hypot(h.x - 33.2, h.y - 8.2).toFixed(1);
      return out;
    });
    assert(hound.found); assert.equal(hound.loud, 'chase', 'a bare stroke wakes the hound'); assert.notEqual(hound.quiet, 'chase', 'a wrapped stroke in a gust does not (hound at ' + hound.dist + ')');
    ok('a hound six cells off hears a bare stroke and ignores a wrapped one in the wind');

    // wind itself: the sky decides, a pinned storm has gusts and a clear day has none
    const sampleWind = () => ev(() => { const T0 = G.time; let max = 0, min = 1, hi = 0, w = Weather.wind; for (let t = 0; t < 400; t += 1.3) { G.time = t; const c = SIDEQ.windCover(34, 8); max = Math.max(max, c); min = Math.min(min, c); if (c > 0.45) hi++; } G.time = T0; return { max: +max.toFixed(2), min: +min.toFixed(2), hi, w: +w.toFixed(2) }; });
    const wind = {};
    for (const k of ['clear', 'storm', 'rain']) { await ev((k) => { Weather.hold(k); }, k); await page.waitForTimeout(500); wind[k] = await sampleWind(); }
    await ev(() => Weather.release());
    assert.equal(wind.clear.max, 0, 'a clear day has no cover'); assert(wind.storm.max > 0.45 && wind.storm.hi > 8, 'a storm has gusts that cover a stroke ' + JSON.stringify(wind.storm)); assert(wind.storm.min < 0.45, 'and quiet moments between them');
    assert(wind.rain.hi <= wind.storm.hi, 'rain is gustier than clear but not more than storm');
    ok('wind cover follows the sky: clear 0, rain ' + wind.rain.max + ', storm ' + wind.storm.max + ' with gaps between gusts');

    // a hound up soon after a stroke: Tomas calls it off until tomorrow; it is a failure with no punishment
    const fail = await ev(() => {
      __h.reset(); Object.assign(G.flags, { p9q_tomas: 1 }); SIDEQ.syncAll(); __h.go('clearing', 33.2, 8.2, 0); __h.weapon('axe'); __h.calm();
      const m = G.maps.clearing; const h = m.entities.find(e => e.kind === 'enemy' && e.type === 'hound'); const out = {};
      G.noise = 0; attack('swing'); const prog = SIDEQ.progress();
      // a hound that is far from the tree, or chasing long after, is not the cause
      h.hidden = false; h.dead = false; h.state = 'chase'; h.x = 3; h.y = 30; SIDEQ.tick(1); out.far = SIDEQ.waitLeft();
      h.x = 30.5; h.y = 12.5; SIDEQ.state.lastStrikeT = G.time - 60; SIDEQ.tick(1); out.late = SIDEQ.waitLeft();
      SIDEQ.state.lastStrikeT = G.time - 1; h.state = 'idle'; SIDEQ.tick(1); out.idle = SIDEQ.waitLeft();
      h.state = 'chase'; SIDEQ.tick(1); out.called = SIDEQ.waitLeft(); out.flags = __h.flagsP9(); out.day = G.day; out.j = __h.journal()[0]; out.label = SIDEQ.treeEnt().label;
      h.hidden = true;
      talk(__h.ent('tomas')); out.talk = __h.last(); out.ch = !!DLG.choices; closeModal(); G.state = 'play';
      // today the bough is silent to the axe and counts nothing
      G.noise = 0; G.attack.t = 0; attack('swing'); out.todayProg = SIDEQ.progress() - prog; out.todayMsg = document.querySelector('#msgs').textContent; out.todayNoise = G.noise < 3.5;
      useDeco(SIDEQ.treeEnt()); out.look = document.querySelector('#msgs').textContent;
      G.day += 1; SIDEQ.tick(1); out.tomorrow = SIDEQ.waitLeft(); G.noise = 0; G.attack.t = 0; attack('swing'); out.tomorrowProg = SIDEQ.progress() - prog;
      talk(__h.ent('tomas')); out.talk2 = __h.last(); closeModal(); G.state = 'play';
      return out;
    });
    assert.equal(fail.far, false); assert.equal(fail.late, false); assert.equal(fail.idle, false, 'only a hound in chase counts'); assert.equal(fail.called, true);
    assert(fail.flags.p9q_tomas === 1 && fail.flags.p9q_tomas_wait === fail.day + 1, JSON.stringify(fail.flags)); assert(/called it off|calling it off|a hound came up/i.test(fail.j));
    assert(/Leave it for today/.test(fail.talk) && !fail.ch); assert.equal(fail.todayProg, 0); assert(/still humming/.test(fail.todayMsg)); assert(/still humming/.test(fail.look) || /Leave it for a day/.test(fail.look) || /still humming/.test(fail.label));
    assert.equal(fail.tomorrow, false); assert.equal(fail.tomorrowProg, 3); assert(/Not yet\. The bough/.test(fail.talk2));
    ok('failure is gentle: a hound in chase near the tree within 14 s calls it off; no progress today, no penalty, and tomorrow the same stroke counts');

    // fell it, carry it, deliver it
    const fell = await ev(() => {
      __h.reset(); Object.assign(G.flags, { p9q_tomas: 1 }); SIDEQ.syncAll(); __h.go('clearing', 33.2, 8.2, 0); __h.weapon('axe'); __h.calm(); SIDEQ.state.windOverride = 1; G.flags.p9q_tomas_muff = 4;
      const out = { strokes: 0 };
      const treeBefore = SIDEQ.treeEnt();
      for (let i = 0; i < 12 && SIDEQ.stage('tomas') === 1; i++) { G.noise = 0; G.attack.t = 0; if (i % 2 === 0) G.flags.p9q_tomas_muff = 4; attack('swing'); out.strokes++; }
      out.stage = SIDEQ.stage('tomas'); out.treeHidden = treeBefore.hidden; out.treeSolid = treeBefore.solid;
      out.bough = G.maps.clearing.entities.filter(e => e._p9 === 'bough').length; out.stump = G.maps.clearing.entities.filter(e => e._p9 === 'stump').length;
      out.j = __h.journal()[0]; out.fellMsg = document.querySelector('#msgs').textContent;
      out.noiseAtFall = G.noise;
      SIDEQ.state.windOverride = null;
      return out;
    });
    assert.equal(fell.strokes, 7, 'seven axe strokes is twenty-one, past the twenty it takes'); assert.equal(fell.stage, 2); assert(fell.treeHidden && !fell.treeSolid); assert.equal(fell.bough, 1); assert.equal(fell.stump, 1);
    assert(/The iron-bough is down/.test(fell.j)); assert(fell.noiseAtFall < 4, 'a wrapped felling in the wind is quiet enough to survive: ' + fell.noiseAtFall);
    // Tomas before the log is carried
    const mid = await ev(() => { __h.go('clearing', 24.6, 31.6, -Math.PI / 2); talk(__h.ent('tomas')); const r = __h.last(); closeModal(); G.state = 'play'; return r; });
    assert(/It is down/.test(mid));
    // pick up the log by the real interact path
    await ev(() => { const b = __h.ent('bough'); __h.go('clearing', b.x - 0.8, b.y, 0); });
    await page.waitForTimeout(350);
    const carry = await ev(() => {
      interact(); const out = { stage: SIDEQ.stage('tomas'), has: G.has('p9_bough'), bough: G.maps.clearing.entities.filter(e => e._p9 === 'bough' && !e.dead).length, flags: __h.flagsP9() };
      // running with the log on the back is loud; walking is not
      G.noise = 0; const a = (() => { updateNarrow(0.5, true, false); return G.noise; })();
      G.noise = 0; const b = (() => { updateNarrow(0.5, true, true); return G.noise; })();
      G.take('p9_bough'); G.noise = 0; const c = (() => { updateNarrow(0.5, true, true); return G.noise; })(); G.give('p9_bough');
      out.walk = +a.toFixed(2); out.run = +b.toFixed(2); out.runNoLog = +c.toFixed(2);
      return out;
    });
    assert.equal(carry.stage, 3); assert(carry.has); assert.equal(carry.bough, 0);
    assert(carry.run - carry.runNoLog > 0.5, 'the log adds to a run: ' + JSON.stringify(carry)); assert(carry.walk <= carry.run);
    const done2 = await ev(() => {
      const before = { gold: G.player.gold, xp: (window.__xp || 0) };
      __h.go('clearing', 24.6, 31.6, -Math.PI / 2); talk(__h.ent('tomas'));
      const out = { text: DLG.log[0].t, gold: G.player.gold - before.gold, xp: (window.__xp || 0) - before.xp, has: G.has('p9_bough'), flags: __h.flagsP9(), j: __h.journal()[0], giver: LOGMAP.QUEST_GIVERS.includes('p9_tomas'), tomas: G.ents.filter(e => e._p9 === 'tomas').length };
      closeModal(); G.state = 'play';
      out.gone = G.ents.filter(e => e._p9 === 'tomas').length;
      return out;
    });
    assert(/That is the quota/.test(done2.text)); assert.equal(done2.gold, 18); assert.equal(done2.xp, 60); assert.equal(done2.has, false); assert.equal(done2.flags.p9q_tomas_done, true); assert(/Tomas has his last load/.test(done2.j));
    assert.equal(done2.giver, false); assert.equal(done2.gone, 0, 'Tomas drives off with his load');
    const gaz = await ev(() => { const c = STORYRUM.context(); const l = STORYRUM.localFor(c); return l && l.id; });
    assert.equal(gaz, 'p9_timber', 'the Gazette now carries Tomas\'s quota in Office dialect');
    ok('felling takes seven axe strokes, the stump and the log appear, carrying the log is loud when you run, delivery pays 18 sovereigns and 60 XP once, the Gazette notes the quota');

    // ============================================================ quest 3: Telling the Bees
    await ev(() => { __h.reset(); __h.go('oakhaven', 51.5, 19.4, -Math.PI / 2); });
    const b0 = await ev(() => {
      const hivesBefore = G.ents.filter(e => e._bit).length;
      talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); const r = { hivesBefore, text: DLG.log[0].t, ch: DLG.choices && DLG.choices.length };
      __h.choose(1); r.declined = __h.last(); r.flags = __h.flagsP9(); closeModal(); G.state = 'play';
      talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); __h.choose(0); r.after = { flags: __h.flagsP9(), hives: G.ents.filter(e => e._bit).length, j: __h.journal()[0], giver: LOGMAP.QUEST_GIVERS.includes('bettany') }; closeModal(); G.state = 'play';
      // her own old talk still works when the quest is not the subject
      talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); r.again = __h.last(); closeModal(); G.state = 'play';
      return r;
    });
    assert.equal(b0.hivesBefore, 0); assert(/Softly, love/.test(b0.text)); assert.equal(b0.ch, 2); assert(/talks to straw/.test(b0.declined)); assert.deepEqual(b0.flags, {});
    assert.deepEqual(b0.after.flags, { p9q_bees: 1 }); assert.equal(b0.after.hives, 3); assert(/Bettany's bees have stopped coming home/.test(b0.after.j)); assert(b0.after.giver, 'marker on Bettany while it is open');
    assert(/Behind my house/.test(b0.again));
    ok('Bettany: decline is clean; accept stands three skeps in town and marks her; she answers when you come back with news owed');

    // too loud: bees lift; softly: they take it. Pressing E at the skep opens the choice (keyboard, touch and controller all reach E)
    const tell = await ev(() => {
      const out = {}; const hv = (n) => G.ents.find(e => e._p9 === 'hive' + n);
      __h.go('oakhaven', 28.6, 36.0, -Math.PI / 2);
      out.label0 = hv(1).label;
      G.noise = 8; G.song.t = 0; G.attack.t = 0; castSong('murmur'); out.loud = { flags: __h.flagsP9(), msg: document.querySelector('#msgs').textContent };
      // far from any skep nothing is told
      __h.go('oakhaven', 40.5, 40.5, 0); G.noise = 1; G.song.t = 0; castSong('murmur'); out.far = __h.flagsP9();
      // E at the straw: the event offers murmuring
      __h.go('oakhaven', 28.6, 35.9, -Math.PI / 2); G.noise = 1; useDeco(hv(1)); out.ev = { state: G.state, title: document.querySelector('#event h2') && document.querySelector('#event h2').textContent, btns: [...document.querySelectorAll('#event button')].map(b => b.textContent) };
      document.querySelector('#event button[data-i="0"]').click(); out.after1 = __h.flagsP9(); out.msg1 = document.querySelector('#msgs').textContent; out.label1 = hv(1).label;
      // the same skep twice: nothing more
      G.song.t = 0; G.attack.t = 0; G.noise = 1; useDeco(hv(1)); out.again = document.querySelector('#msgs').textContent; G.state = 'play';
      // second and third by N (castSong is what the key calls)
      __h.go('oakhaven', 53.5, 36.0, -Math.PI / 2); G.noise = 1.5; G.song.t = 0; G.attack.t = 0; castSong('murmur'); out.after2 = __h.flagsP9();
      __h.go('oakhaven', 44.7, 11.2, -Math.PI / 2); G.noise = 1.5; G.song.t = 0; G.attack.t = 0; castSong('murmur'); out.after3 = __h.flagsP9(); out.j = __h.journal()[0];
      return out;
    });
    assert.equal(tell.label0, TX_label('skepUntold')); assert.deepEqual(tell.loud.flags, { p9q_bees: 1 }); assert(/Softer/.test(tell.loud.msg)); assert.deepEqual(tell.far, { p9q_bees: 1 });
    assert.equal(tell.ev.state, 'event'); assert.equal(tell.ev.title, 'The skep'); assert.deepEqual(tell.ev.btns, ['Murmur the news to them', 'Step back']);
    assert.deepEqual(tell.after1, { p9q_bees: 1, p9q_bees_told: 1 }); assert(/Madders/.test(tell.msg1)); assert.equal(tell.label1, TX_label('skepTold')); assert(/hums back, softly/.test(tell.again));
    assert.deepEqual(tell.after2, { p9q_bees: 1, p9q_bees_told: 3 }); assert.deepEqual(tell.after3, { p9q_bees: 2, p9q_bees_told: 7 }); assert(/All three skeps/.test(tell.j));
    function TX_label(k) { return { skepUntold: 'A straw skep. The bees hang in it in a silent clump.', skepTold: 'A straw skep. It hums low, like a kettle thinking about it.' }[k]; }
    const bPay = await ev(() => {
      const before = { gold: G.player.gold, honey: G.count('honey'), xp: (window.__xp || 0) };
      __h.go('oakhaven', 51.5, 19.4, -Math.PI / 2); talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany'));
      const out = { text: DLG.log[0].t, gold: G.player.gold - before.gold, honey: G.count('honey') - before.honey, xp: (window.__xp || 0) - before.xp, flags: __h.flagsP9(), j: __h.journal()[0], giver: LOGMAP.QUEST_GIVERS.includes('bettany') };
      closeModal(); G.state = 'play'; talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); out.after = __h.last(); closeModal(); G.state = 'play';
      out.hives = G.ents.filter(e => e._bit).length; out.labels = G.ents.filter(e => e._bit).map(e => e.label);
      return out;
    });
    assert(/kettle-sound/.test(bPay.text) && /invoice/.test(bPay.text)); assert.equal(bPay.gold, 6); assert.equal(bPay.honey, 2); assert.equal(bPay.xp, 50);
    assert.equal(bPay.flags.p9q_bees_done, true); assert(/Bettany's bees are home/.test(bPay.j)); assert.equal(bPay.giver, false); assert(!/Softly, love/.test(bPay.after));
    assert.equal(bPay.hives, 3, 'the skeps stay, humming'); assert(bPay.labels.every(l => /hums low/.test(l)));
    ok('bees: a loud murmur lifts them, a soft one inside the Narrow is told once per skep, E opens the same choice, all three bring Bettany\'s pay (6 sov, 2 honey, 50 XP) and the invoice');

    // ============================================================ the other NPCs' quest()s were never called
    const fo = await ev(() => window.__foreign);
    assert.deepEqual(fo, {}, 'no other NPC quest() ran: ' + JSON.stringify(fo));
    ok('no other NPC\'s quest() was called (Tam and Kaelen only ever got a button)');

    // ============================================================ the Greening closes them
    for (const [name, setup, line] of [
      ['pellow', () => { Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 1 }); G.give('p9_split_reed'); }, "Oakhaven is gone under the oaks; Ada Pellow's door is a trunk now"],
      ['tomas', () => { Object.assign(G.flags, { p9q_tomas: 3 }); G.give('p9_bough'); }, "Oakhaven is gone under the oaks; Tomas's wagon went down the road"],
      ['bees', () => { Object.assign(G.flags, { p9q_bees: 1, p9q_bees_told: 3 }); }, "Oakhaven is gone under the oaks; Bettany's bees went up into the new boughs"],
    ]) {
      const r = await ev(({ name, setup, line }) => {
        __h.reset(); (new Function('return ' + setup))()(); SIDEQ.syncAll();
        const before = G.journal.length; const flagsBefore = Object.assign({}, __h.flagsP9());
        G.flags.greening = true; G.maps.oakhaven = buildOakhaven(true); G.mapId === 'oakhaven' || 0;
        SIDEQ.tick(1); SIDEQ.tick(1);
        const out = { closed: G.flags['p9q_' + name + '_closed'], lines: G.journal.slice(0, G.journal.length - before).map(j => j.text).filter(t => t.startsWith('Oakhaven is gone')), done: !!G.flags['p9q_' + name + '_done'] };
        // loading any map keeps it closed and writes nothing more
        const j1 = G.journal.length; loadMap('clearing', { x: 20.5, y: 32.5, dir: 0 }); SIDEQ.tick(1); out.noMore = G.journal.length === j1;
        out.mine = Object.values(G.maps).reduce((n, m) => n + m.entities.filter(e => e._p9).length, 0);
        out.tree = (G.maps.clearing.entities.find(e => e.sprite === 'oak' && Math.abs(e.x - 34.5) < 0.3 && Math.abs(e.y - 8.2) < 0.3) || {}).hidden;
        out.giver = LOGMAP.QUEST_GIVERS.some(g => g === 'p9_ada' || g === 'p9_tomas');
        out.botherEnt = G.ents.filter(e => e._p9).length;
        // the talk is gone and nothing blocks the main road
        out.adaQuest = NPCS.p9_ada.quest(G); out.tomasQuest = NPCS.p9_tomas.quest(G);
        // a stale write cannot reopen it
        G.flags['p9q_' + name] = 1; SIDEQ.syncAll(); out.reopened = G.maps.clearing.entities.filter(e => e._p9).length;
        delete G.flags.greening; delete G.flags['p9q_' + name + '_closed'];
        G.maps.oakhaven = buildAllMaps().oakhaven; loadMap('oakhaven', { x: 23.5, y: 3.5, dir: 0 });
        return out;
      }, { name, setup: setup.toString().replace(/^\(\) =>/, '() =>'), line });
      assert.equal(r.closed, true, name + ' closed'); assert.equal(r.lines.length, 1, name + ': exactly one closing line, got ' + r.lines.length); assert(r.lines[0].startsWith(line), name + ' line: ' + r.lines[0]);
      assert.equal(r.noMore, true); assert.equal(r.mine, 0, name + ': its people and props left'); assert.equal(r.tree, false, 'the oak is just an oak again'); assert.equal(r.giver, false); assert.equal(r.adaQuest, null); assert.equal(r.tomasQuest, null); assert.equal(r.reopened, 0);
      assert(r.lines[0].split('\n').length === 1 && r.lines[0].length < 220, 'one line');
    }
    // the Greening with nothing begun writes nothing; with a finished quest it keeps its own ending
    const quietClose = await ev(() => {
      __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_done: true });
      const before = G.journal.length; G.flags.greening = true; SIDEQ.tick(1); SIDEQ.tick(1);
      const r = { wrote: G.journal.length - before, done: G.flags.p9q_pellow_done, closed: !!G.flags.p9q_pellow_closed, none: !G.flags.p9q_tomas_closed && !G.flags.p9q_bees_closed };
      delete G.flags.greening; __h.reset(); return r;
    });
    assert.equal(quietClose.wrote, 0); assert.equal(quietClose.done, true); assert.equal(quietClose.closed, false); assert(quietClose.none);
    ok('the Greening closes each open quest with one "Oakhaven is gone under the oaks; ..." line; people, props, markers and the tree tag go; a finished quest keeps its ending; an unstarted one writes nothing');

    // ============================================================ save and load, mid-quest
    const sv = await ev(() => {
      const out = {};
      const roundtrip = () => { const d = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(d); };
      // Pellow, mid-way: the reed is in the pack, Tam has hummed
      __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 1 }); G.give('p9_split_reed'); SIDEQ.syncAll(); roundtrip();
      out.p = { flags: __h.flagsP9(), item: G.has('p9_split_reed'), ada: G.maps.oakhaven.entities.filter(e => e._p9 === 'ada').length, nail: G.maps.oakhaven.entities.filter(e => e._p9 === 'door_nail').length, adaTalk: (NPCS.p9_ada.quest(G) || {}).text.slice(0, 20) };
      // Tomas: felled and the log lying, saved while standing next to it
      __h.reset(); Object.assign(G.flags, { p9q_tomas: 2, p9q_tomas_prog: 20, p9q_tomas_muff: 2 }); SIDEQ.syncAll(); __h.go('clearing', 33, 9, 0); roundtrip();
      const cl = G.maps.clearing, oak = cl.entities.find(e => e.sprite === 'oak' && Math.abs(e.x - 34.5) < 0.3 && Math.abs(e.y - 8.2) < 0.3);
      out.t = { flags: __h.flagsP9(), mapId: G.mapId, bough: G.ents.filter(e => e._p9 === 'bough' && !e.dead).length, stump: G.ents.filter(e => e._p9 === 'stump').length, treeHidden: oak.hidden, tomas: G.ents.filter(e => e._p9 === 'tomas').length, tomasTalk: (NPCS.p9_tomas.quest(G) || {}).text.slice(0, 12) };
      // carrying: the log is in the pack, the entity does not come back
      __h.reset(); Object.assign(G.flags, { p9q_tomas: 3, p9q_tomas_prog: 24 }); G.give('p9_bough'); SIDEQ.syncAll(); roundtrip();
      out.c = { item: G.has('p9_bough'), bough: G.maps.clearing.entities.filter(e => e._p9 === 'bough').length, flags: __h.flagsP9() };
      // Tomas, called off today: the day gate survives
      __h.reset(); Object.assign(G.flags, { p9q_tomas: 1, p9q_tomas_prog: 6, p9q_tomas_wait: G.day + 1 }); SIDEQ.syncAll(); roundtrip();
      out.w = { wait: SIDEQ.waitLeft(), prog: SIDEQ.progress(), text: NPCS.p9_tomas.quest(G).text.slice(0, 14) };
      // Bees: one told
      __h.reset(); Object.assign(G.flags, { p9q_bees: 1, p9q_bees_told: 2 }); SIDEQ.syncAll(); roundtrip();
      out.b = { flags: __h.flagsP9(), hives: G.maps.oakhaven.entities.filter(e => e._bit).map(e => e.label) };
      // finished ones stay finished and keep their props
      __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_done: true, p9q_tomas: 3, p9q_tomas_done: true, p9q_bees: 2, p9q_bees_done: true }); SIDEQ.syncAll(); __h.go('clearing', 33, 9, 0); roundtrip();
      out.d = { door: (G.maps.oakhaven.entities.find(e => e._p9 === 'door_reed') || {}).sprite, tomasGone: G.maps.clearing.entities.filter(e => e._p9 === 'tomas').length, stump: G.maps.clearing.entities.filter(e => e._p9 === 'stump').length, treeHidden: G.maps.clearing.entities.find(e => e.sprite === 'oak' && Math.abs(e.x - 34.5) < 0.3 && Math.abs(e.y - 8.2) < 0.3).hidden, hives: G.maps.oakhaven.entities.filter(e => e._bit).length, ada: G.maps.oakhaven.entities.filter(e => e._p9 === 'ada').length };
      __h.reset(); __h.go('oakhaven', 23.5, 3.5, 0);
      return out;
    });
    assert.deepEqual(sv.p.flags, { p9q_pellow: 2, p9q_pellow_via: 1 }); assert(sv.p.item); assert.equal(sv.p.ada, 1); assert.equal(sv.p.nail, 1); assert(/You have it/.test(sv.p.adaTalk));
    assert.equal(sv.t.mapId, 'clearing'); assert.equal(sv.t.bough, 1); assert.equal(sv.t.stump, 1); assert.equal(sv.t.treeHidden, true); assert.equal(sv.t.tomas, 1); assert(/It is down/.test(sv.t.tomasTalk)); assert.equal(sv.t.flags.p9q_tomas_prog, 20);
    assert(sv.c.item); assert.equal(sv.c.bough, 0); assert.equal(sv.c.flags.p9q_tomas, 3);
    assert.equal(sv.w.wait, true); assert.equal(sv.w.prog, 6); assert(/^Leave it for/.test(sv.w.text));
    assert.deepEqual(sv.b.flags, { p9q_bees: 1, p9q_bees_told: 2 }); assert.equal(sv.b.hives.length, 3); assert(sv.b.hives.filter(l => /hums low/.test(l)).length === 1, 'only the told skep hums: ' + sv.b.hives);
    assert.equal(sv.d.door, 'p9_reed_new'); assert.equal(sv.d.tomasGone, 0); assert.equal(sv.d.stump, 1); assert.equal(sv.d.treeHidden, true); assert.equal(sv.d.hives, 3); assert.equal(sv.d.ada, 0);
    ok('save and load mid-quest keeps every stage: Pellow with the reed in the pack, Tomas felled / carrying / called off, one skep told, and finished quests with their props');

    // ============================================================ an old save, and hostile ones
    const old = await ev(() => {
      __h.reset(); const d = JSON.parse(JSON.stringify(snapshotGame()));
      for (const k of Object.keys(d.flags)) if (k.startsWith('p9q_')) delete d.flags[k];
      d.player.inv = d.player.inv.filter(s => !s.id.startsWith('p9_'));
      restoreGame(d);
      talk(__h.ent('ada')); const a = DLG.log[0].t.slice(0, 20); closeModal(); G.state = 'play';
      return { a, flags: __h.flagsP9(), ada: G.maps.oakhaven.entities.filter(e => e._p9 === 'ada').length, hives: G.maps.oakhaven.entities.filter(e => e._bit).length };
    });
    assert(/Does it ring\? No, ne/.test(old.a)); assert.deepEqual(old.flags, {}); assert.equal(old.ada, 1); assert.equal(old.hives, 0);
    ok('an old save with no p9q_ flags opens with all three quests offered and nothing written');

    const evil = ['<img src=x onerror="window.__pwn=1">', '<b>', { a: 1 }, [1, 2], null, NaN, Infinity, -1, 1e9, 2.5, 'true', '2', '', 0, '__proto__', 'constructor'];
    const hostile = await ev((evil) => {
      const errs = []; window.__pwn = 0; const keys = ['p9q_pellow', 'p9q_pellow_via', 'p9q_pellow_done', 'p9q_pellow_closed', 'p9q_tomas', 'p9q_tomas_prog', 'p9q_tomas_muff', 'p9q_tomas_wait', 'p9q_tomas_done', 'p9q_tomas_closed', 'p9q_bees', 'p9q_bees_told', 'p9q_bees_done', 'p9q_bees_closed'];
      const guard = (fn) => { try { fn(); } catch (e) { errs.push(String(e && e.message)); } };
      let combos = 0; const out = { staged: [] };
      for (const v of evil) {
        __h.reset();
        for (const k of keys) G.flags[k] = (typeof v === 'object' && v !== null) ? JSON.parse(JSON.stringify(v)) : v;
        guard(() => SIDEQ.syncAll()); guard(() => SIDEQ.tick(1)); guard(() => SIDEQ.tick(1)); guard(() => SIDEQ.checkClosure());
        for (const id of ['p9_ada', 'p9_tomas']) guard(() => { const q = NPCS[id].quest(G); if (q && q.choices) q.choices.forEach(c => { /* never click: they write flags */ }); });
        guard(() => { const e = G.ents.find(x => x.kind === 'npc' && x.id === 'bettany'); if (e) { talk(e); closeModal(); G.state = 'play'; } });
        guard(() => { SIDEQ.useWool(); SIDEQ.watchHounds(); SIDEQ.syncGivers(); });
        for (const k of ['pellow', 'tomas', 'bees']) out.staged.push(SIDEQ.stage(k));
        guard(() => { renderLog(); closeModal(); G.state = 'play'; });
        guard(() => { renderMap && 0; });
        combos++;
        if (document.querySelector('[onerror], img[src="x"], #msgs b, #modal-panel b, #event b')) out.img = true;
        // restore through a save that carries the junk
        guard(() => { const d = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(d); });
      }
      // junk shapes for the whole flag table
      for (const bad of ['text', 5, [1], null]) { const keep = G.flags; guard(() => { G.flags = bad; SIDEQ.tick(1); SIDEQ.syncAll(); SIDEQ.stage('pellow'); SIDEQ.done('tomas'); SIDEQ.closed('bees'); NPCS.p9_ada.quest(G); }); G.flags = keep; }
      out.errs = errs; out.pwn = window.__pwn; out.combos = combos; out.range = out.staged.every(n => Number.isInteger(n) && n >= 0 && n <= 3);
      out.markup = !/onerror|window.__pwn/.test(document.querySelector('#modal-panel').innerHTML + document.querySelector('#event').innerHTML + document.querySelector('#msgs').innerHTML);
      __h.reset();
      return out;
    }, evil);
    assert.deepEqual(hostile.errs, [], 'no exception from hostile flags: ' + hostile.errs.slice(0, 3));
    assert.equal(hostile.pwn, 0, 'nothing from a flag value ran'); assert(!hostile.img, 'no markup was built from a flag'); assert(hostile.range, 'stages stay inside their range'); assert(hostile.markup);
    ok('hostile flag values (' + hostile.combos + ' kinds on every p9q_ key, plus a non-object flag table) throw nothing, stay in range and never become markup');

    // an unexpected flag type is not a stage: strings, floats, huge and negative numbers read as "not started"
    const reads = await ev(() => { __h.reset(); const g = (k, v) => { G.flags[k] = v; return SIDEQ.stage('pellow'); }; return ['1', 2.5, -1, 99, NaN, null, {}].map(v => g('p9q_pellow', v)).concat([g('p9q_pellow', true), g('p9q_pellow', 2), g('p9q_pellow', 1)]); });
    assert.deepEqual(reads, [0, 0, 0, 0, 0, 0, 0, 1, 2, 1]);
    const doneRead = await ev(() => { __h.reset(); const out = []; for (const v of [1, 'true', {}, 'yes', true]) { G.flags.p9q_bees_done = v; out.push(SIDEQ.done('bees')); } __h.reset(); return out; });
    assert.deepEqual(doneRead, [false, false, false, false, true], '"done" is only ever the boolean true');
    ok('flags are read strictly: a stage is a small whole number or true; done and closed are only the boolean true');

    // ============================================================ the switch, and the clean-off state
    const off = await ev(() => {
      __h.reset(); UPG.sideQuests = false; SIDEQ.syncAll(); const out = { ada: G.maps.oakhaven.entities.filter(e => e._p9).length, cl: G.maps.clearing.entities.filter(e => e._p9).length, tree: G.maps.clearing.entities.filter(e => e.use === 'p9_tree').length };
      out.q = [NPCS.p9_ada.quest(G), NPCS.p9_tomas.quest(G)].every(x => x === null);
      Object.assign(G.flags, { p9q_tomas: 1 }); out.noClose = (() => { const n = G.journal.length; SIDEQ.tick(1); return G.journal.length === n; })();
      UPG.sideQuests = true; __h.reset(); SIDEQ.syncAll(); out.back = G.maps.oakhaven.entities.filter(e => e._p9).length;
      return out;
    });
    assert.equal(off.ada, 0); assert.equal(off.cl, 0); assert.equal(off.tree, 0); assert(off.q); assert(off.noClose); assert.equal(off.back, 2);
    ok('UPG.sideQuests off: no people, no props, no tag on the oak, nothing offered; back on, they return');

    // ============================================================ the markers follow the option
    const mk = await ev(() => {
      __h.reset(); Object.assign(G.flags, { p9q_pellow: 1, p9q_tomas: 1, p9q_bees: 1 }); SIDEQ.syncAll();
      const out = { on: ['p9_ada', 'p9_tomas', 'bettany'].map(i => LOGMAP.QUEST_GIVERS.includes(i)) };
      // the stamps the automap draws: a quest mark above each of them, only while the option is on
      G.map.visited.fill(1);
      const count = () => LOGMAP.collectStamps(G.map, G.ents, G.flags).filter(s => s.kind === 'quest');
      const was = UPG.questMarkers; UPG.questMarkers = true; const ada = G.ents.find(e => e._p9 === 'ada'); const marks = count();
      out.optionOn = marks.length; out.nearAda = marks.some(m => ada && Math.abs(m.x - ada.x) < 1.5 && Math.abs(m.y - (ada.y - 1)) < 0.2);
      UPG.questMarkers = false; out.optionOff = count().length; UPG.questMarkers = true;
      UPG.questMarkers = was;
      Object.assign(G.flags, { p9q_pellow_done: true, p9q_tomas_done: true, p9q_bees_done: true }); SIDEQ.syncAll(); out.done = ['p9_ada', 'p9_tomas', 'bettany'].map(i => LOGMAP.QUEST_GIVERS.includes(i));
      __h.reset(); out.reset = ['p9_ada', 'p9_tomas', 'bettany'].map(i => LOGMAP.QUEST_GIVERS.includes(i));
      G.flags.greening = true; SIDEQ.syncAll(); out.green = ['p9_ada', 'p9_tomas', 'bettany'].map(i => LOGMAP.QUEST_GIVERS.includes(i)); delete G.flags.greening; SIDEQ.syncAll();
      return out;
    });
    assert.deepEqual(mk.on, [true, true, true]); assert.deepEqual(mk.done, [false, false, false]);
    assert.deepEqual(mk.reset, [true, true, false], 'Ada and Tomas are marked from the first; Bettany (a shop pinned quest-free by logmap.test) only once she has asked'); assert.deepEqual(mk.green, [false, false, false], 'the Greening takes the markers away, Bettany back as she was');
    assert(mk.optionOn >= 2 && mk.nearAda, 'the map stamps a quest mark by Ada: ' + JSON.stringify(mk)); assert.equal(mk.optionOff, 0, 'and none when the option is off');
    const sk = await ev(() => ({ a: LOGMAP.sketchFor(SIDEQ.TX.ada.jOffer), b: LOGMAP.sketchFor(SIDEQ.TX.ada.jDone), c: LOGMAP.sketchFor(SIDEQ.TX.tomas.jDone) }));
    assert.equal(sk.a, 'quill'); assert.equal(sk.b, 'quill');
    ok('automap quest markers: Ada, Tomas and Bettany are listed while their quest is open and drop out when done; all three drop out when done or when the Greening comes, Bettany back as she was');

    // ============================================================ 640x400: dialogues and the held scene fit
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(300);
    const fit = async (label, setup) => {
      await ev(setup); await page.waitForTimeout(200);
      const r = await ev(() => {
        const p = document.querySelector('#modal-panel'), ev2 = document.querySelector('#event-panel') || document.querySelector('#event .panel') || document.querySelector('#event');
        const panel = (document.querySelector('#modal').classList.contains('hidden') || getComputedStyle(document.querySelector('#modal')).display === 'none') ? ev2 : p;
        const b = panel.getBoundingClientRect(), g = document.getElementById('game').getBoundingClientRect();
        const btns = [...panel.querySelectorAll('button')]; btns.forEach(x => x.scrollIntoView({ block: 'nearest' }));
        const bad = btns.filter(x => { const r = x.getBoundingClientRect(); return r.right > g.right + 1 || r.left < g.left - 1 || x.scrollWidth > x.clientWidth + 2; }).map(x => x.textContent.slice(0, 20));
        return { inside: b.left >= g.left - 1 && b.right <= g.right + 1 && b.bottom <= g.bottom + 1 && b.top >= g.top - 1, noH: panel.scrollWidth <= panel.clientWidth + 1, docH: document.documentElement.scrollWidth <= innerWidth + 1, bad, n: btns.length };
      });
      assert(r.inside && r.noH && r.docH && r.bad.length === 0, label + ' fits 640x400 ' + JSON.stringify(r));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'sidequests-' + label.replace(/\W+/g, '-') + '-640.png') });
      await ev(() => { closeModal(); hide('#event'); G.state = 'play'; });
    };
    await fit('Ada intro', () => { __h.reset(); __h.go('oakhaven', 18.5, 30.6, Math.PI); talk(__h.ent('ada')); });
    await fit('Ada intro answers', () => { __h.reset(); __h.go('oakhaven', 18.5, 30.6, Math.PI); talk(__h.ent('ada')); if (!document.querySelector('[data-choice]')) document.querySelector('#d-answer').click(); });
    await fit('Tam with the extra button', () => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 1 }); G.flags.tam_told = true; const e = G.ents.find(x => x.kind === 'npc' && x.id === 'tam'); DLG.npc = NPCS.tam; DLG.ent = e; DLG.log = []; G.state = 'dialogue'; renderDialogue(null); document.querySelector('#d-p9-tam').click(); });
    await fit('Kaelen with the extra button', () => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 1 }); G.give('p9_split_reed'); __h.go('clearing', 14.5, 17.5, 0); const e = G.ents.find(x => x.kind === 'npc' && x.id === 'kaelen'); DLG.npc = NPCS.kaelen; DLG.ent = e; DLG.log = []; G.state = 'dialogue'; renderDialogue(null); });
    await fit('Tomas intro', () => { __h.reset(); __h.go('clearing', 24.6, 31.6, -Math.PI / 2); talk(__h.ent('tomas')); });
    await fit('Tomas pays', () => { __h.reset(); Object.assign(G.flags, { p9q_tomas: 3 }); G.give('p9_bough'); SIDEQ.syncAll(); __h.go('clearing', 24.6, 31.6, -Math.PI / 2); talk(__h.ent('tomas')); });
    await fit('Bettany asks', () => { __h.reset(); __h.go('oakhaven', 51.5, 19.4, -Math.PI / 2); talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); });
    await fit('Bettany pays', () => { __h.reset(); Object.assign(G.flags, { p9q_bees: 2, p9q_bees_told: 7 }); SIDEQ.syncAll(); __h.go('oakhaven', 51.5, 19.4, -Math.PI / 2); talk(G.ents.find(e => e.kind === 'npc' && e.id === 'bettany')); });
    await fit('the held reed scene', () => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 2 }); G.give('p9_split_reed'); SIDEQ.syncAll(); SIDEQ.finishTuning(); });
    await fit('the skep', () => { __h.reset(); Object.assign(G.flags, { p9q_bees: 1 }); SIDEQ.syncAll(); __h.go('oakhaven', 28.6, 35.9, -Math.PI / 2); SIDEQ.handleUse(G.ents.find(e => e._p9 === 'hive1')); });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    ok('640x400: every dialogue, the extra buttons on Tam and Kaelen, the held reed scene and the skep fit with no horizontal overflow and every button reachable');

    if (SHOTS) {
      await ev(() => { __h.reset(); Object.assign(G.flags, { p9q_pellow: 2, p9q_pellow_via: 1, p9q_tomas: 1, p9q_bees: 1 }); G.give('p9_split_reed'); SIDEQ.syncAll(); __h.go('oakhaven', 18.5, 30.6, Math.PI); });
      await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, 'sidequests-ada-1280.png') });
      await ev(() => { talk(__h.ent('ada')); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, 'sidequests-ada-talk-1280.png') });
      await ev(() => { closeModal(); G.state = 'play'; __h.go('oakhaven', 28.6, 35.6, -Math.PI / 2); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, 'sidequests-skep-1280.png') });
      await ev(() => { __h.go('clearing', 32.2, 9.6, -0.4); }); await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, 'sidequests-bough-1280.png') });
    }

    // ---- no page errors
    assert.deepEqual(errors.filter(e => !/Failed to load resource|favicon|net::ERR/.test(e)), [], 'page errors: ' + errors.join(' | '));
    ok('no page errors');
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
