// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r3narrow28.test.js
// Release road R3, "The Narrow comes home" (js/narrow28.js, party.js): one check per system.
//   hush-lamps hold off the Hush, and a hush-whistle plants one; the Narrow as law inside the Hedge; songs learned from
//   people through Hold the Pitch; Lyra's voiceless kit; hound packs with a leader; fear, Quiets and the lantern, the dead
//   patch; the Listening Hour; the Concordance; French for every new string.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /narrow28/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof NARROW28 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Narrow Tester');
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
      window.T = {
        go(id, x, y, dir) { loadMap(id, { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.033); } },
        quiet() { for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; } },
        foe(type, x, y) { const e = hydrate({ kind: 'enemy', type, x, y }); G.ents.push(e); return e; },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        tough() { const p = G.player; p.hpMax = 999; p.hp = 999; p.voice = p.voiceMax = 99; p.needs = false; },
      };
      REEDS.forceManual = true;
      window.bot = (mode) => { const s = REEDS.session; let n = 0; while (s && !s.done && n++ < 20000) { s.pitch = mode === 'perfect' ? s.centsAt(Math.max(0, s.t)) : s.hi; s.step(1 / 30); } };
    });

    // ---- 1. hush-lamps hold off the Hush; a hush-whistle plants one
    const lamps = await page.evaluate(() => {
      T.tough(); T.go('quarry', 0, 0); T.quiet(); const c = Engine.cam;
      const lamp = { kind: 'deco', sprite: 'lamp', x: c.x + 1, y: c.y, solid: false, radius: 0.1, glow: 0.55 }; G.map.entities.push(lamp);
      G.stillT = 0; G.noise = 0; T.step(300); const withLamp = { still: G.stillT, un: G.unwriting };
      G.map.entities.splice(G.map.entities.indexOf(lamp), 1); T.step(300); const without = { still: G.stillT, un: G.unwriting };
      G.stillT = 0; G.unwriting = false; document.getElementById('view').classList.remove('unwrite');
      G.give('whistle'); useItem(G.player.inv.find((s) => s.id === 'whistle'));
      const planted = NARROW28.planted.length === 1 && G.ents.some((e) => e._n28lamp);
      G.whistleT = 0; G.stillT = 0; G.noise = 0; T.step(300); const plantHolds = G.stillT < 1;
      T.step(130, 0.5); const gone = !NARROW28.planted.length && !G.ents.some((e) => e._n28lamp);
      T.go('tavern', 8.5, 10.5); G.give('whistle'); useItem(G.player.inv.find((s) => s.id === 'whistle')); const indoors = NARROW28.planted.length;
      G.stillT = 0; G.unwriting = false;
      return { withLamp, without, planted, plantHolds, gone, indoors };
    });
    check(lamps.withLamp.still < 1 && !lamps.withLamp.un && lamps.without.un, 'a lit hush-lamp stops the stillness timer underground; without it the Hush comes (' + lamps.withLamp.still.toFixed(2) + ' / ' + lamps.without.still.toFixed(2) + ')');
    check(lamps.planted && lamps.plantHolds && lamps.gone && lamps.indoors === 0, 'a hush-whistle plants a temporary lamp that holds the Hush off, runs out, and is not planted indoors in town');

    // ---- 2. the Narrow as law inside the Hedge
    const law = await page.evaluate(() => {
      T.go('oakhaven', 23.5, 16.5, 0); G.tod = 0.5; T.quiet(); crimeState().bounty = 0; window.__msgs.length = 0;
      const c = Engine.cam; const w = { kind: 'npc', id: 'n28_hummer', sprite: 'townswoman',   // an id no town routine moves or hides
         x: c.x + 3, y: c.y, facing: Math.PI, solid: false, radius: 0.3 }; w._h = true; w.homeX = w.x; w.homeY = w.y; w.wanderT = 1e9; w.dir = Math.PI; G.ents.push(w);
      NARROW28.reset(); T.step(30);
      G.noise = 8; T.step(1); const warned = T.heard(/ward-sign/) && crimeState().bounty === 0;
      T.step(1); const once = window.__msgs.filter((t) => /ward-sign/.test(t)).length === 1;
      G.noise = 1; T.step(240); T.quiet();
      G.noise = 8; T.step(1); const fined = crimeState().bounty === NARROW28.BAL.breachFine && T.heard(/Twice now/);
      G.ents.splice(G.ents.indexOf(w), 1); G.noise = 1; T.step(240);
      window.__msgs.length = 0; G.noise = 8; T.step(1); const noWitness = !T.heard(/ward-sign/);
      crimeState().bounty = 0; try { syncWantedPosters(); } catch (e) { /* none */ }
      return { warned, once, fined, noWitness, b: crimeState().bounty };
    });
    check(law.warned && law.once, 'inside the Hedge, a loud noise in a witness\'s sight gets the ward-sign, once per noise');
    check(law.fined && law.noWitness, 'a second breach soon after is "a breach of the Narrow", fined through reportCrime; nobody seeing, nothing happens');

    // ---- 3. songs learned from people (Hold the Pitch)
    const songs = await page.evaluate(async () => {
      const p = G.player; p.songs = ['murmur']; p.gold = 50;
      let pr = NARROW28.startLesson('bettany'); bot('none'); const failed = await pr; const afterFail = { songs: p.songs.slice(), gold: p.gold };
      pr = NARROW28.startLesson('bettany'); bot('perfect'); const passed = await pr;
      const out = { failed: failed.reason, afterFail, passed: passed.ok, songs: p.songs.slice(), gold: p.gold, journal: G.journal.some((j) => /Bettany taught me/.test(j.text)) };
      // the dialogue button and its pane
      p.songs = ['murmur']; T.go('oakhaven', 51.5, 19.5, -Math.PI / 2); G.tod = 0.5;
      const b = G.ents.find((e) => e.id === 'bettany'); talk(b);
      out.btn = !!document.getElementById('n28-learn'); if (out.btn) document.getElementById('n28-learn').click();
      out.row = (document.querySelector('[data-n28-song="tending"]') || {}).textContent || '';
      closeModal(); G.state = 'play';
      // gates: Tam teaches only once you told him the truth; Lyra once you have met her
      const keep = Object.assign({}, G.flags);
      G.flags.tam_told = false; out.tamNo = !NARROW28.lessonFor('tam'); G.flags.tam_told = true; out.tamYes = !!NARROW28.lessonFor('tam');
      G.flags.tam_left = true; out.tamLeft = !NARROW28.lessonFor('tam');
      G.flags = keep;
      // Tobin's notebook, page two, at his reed-pipes
      G.flags.p6t_page_2 = true; T.go('lyra_house', 4.5, 4.5); const pipes = G.ents.find((e) => e.tobinPipes); window.__ev.length = 0; useDeco(pipes);
      const ev = window.__ev[0] || {}; out.pipes = ev.t === 'Tobin\'s reed-pipes' && (ev.c || []).length === 2 && /notebook/.test(ev.c[0].t);
      pr = NARROW28.startLesson('tobin'); bot('perfect'); out.fifth = (await pr).ok && p.songs.includes('fifth');
      delete G.flags.p6t_page_2;
      return out;
    });
    check(songs.failed === 'fail' && songs.afterFail.songs.join() === 'murmur' && songs.afterFail.gold === 50, 'a failed Hold the Pitch teaches nothing and costs nothing');
    check(songs.passed && songs.songs.includes('tending') && songs.gold === 32 && songs.journal, 'Bettany teaches the tending breath for eighteen through Hold the Pitch, with a logbook line');
    check(songs.btn && /18/.test(songs.row), 'the dialogue offers "Learn a song…" with the price, like Train…');
    check(songs.tamNo && songs.tamYes && songs.tamLeft, 'Old Tam teaches The Miller\'s Daughter only once you told him the truth about the Flume');
    check(songs.pipes && songs.fifth, 'with page two of Tobin\'s notebook read, his reed-pipes teach the falling fifth');

    const miller = await page.evaluate(() => {
      T.tough(); T.go('clearing', 20.5, 20.5, 0); T.quiet(); const c = Engine.cam, p = G.player;
      if (!p.songs.includes('miller')) p.songs.push('miller'); G.song.t = 0; G.attack.t = 0;
      const h1 = T.foe('hound', c.x + 6, c.y + 0.5), h2 = T.foe('hound', c.x + 6, c.y - 1.2);
      const lx = c.x, ly = c.y; castSong('miller');
      const lured = !!NARROW28.lure && h1._n28lure && h2._n28lure && SONGS.miller.noise >= 6;
      Engine.cam.x = lx - 9; T.step(120);
      const dl = Math.hypot(h1.x - lx, h1.y - ly), dp = Math.hypot(h1.x - Engine.cam.x, h1.y - Engine.cam.y);
      return { lured, dl, dp };
    });
    check(miller.lured && miller.dl < 2 && miller.dp > 6, 'The Miller\'s Daughter is loud, and the hounds go to where it was sung, not to you (' + miller.dl.toFixed(1) + ' / ' + miller.dp.toFixed(1) + ')');

    // ---- 4. Lyra's voiceless kit
    const lyra = await page.evaluate(() => {
      // companions walk with you in Part Four, in the woods (party.js PARTY_MAPS)
      const keep = Object.assign({}, G.flags); G.flags.part4 = true; G.flags.lyra_voice = false;
      T.tough(); loadMap('deepwoods'); G.state = 'play'; T.quiet(); const c = Engine.cam;
      partyJoin('lyra'); G.party.cd = 0;
      const ax = c.x + Math.cos(c.dir) * 2.5, ay = c.y + Math.sin(c.dir) * 2.5;
      const aim = T.foe('hound', ax, ay), side = T.foe('hound', c.x + Math.cos(c.dir + Math.PI / 2) * 2.5, c.y + Math.sin(c.dir + Math.PI / 2) * 2.5);
      partyAbility();
      const out = { aim: aim.stun, side: side.stun };
      aim.dead = side.dead = aim.hidden = side.hidden = true;
      // the tending breath
      const p = G.player; p.hpMax = 100; p.hp = 30; const e = partyEnt(); if (e) e.healT = 0;
      T.step(3); out.breath = p.hp - 30;
      G.flags.lyra_voice = true; p.hp = 30; if (e) e.healT = 0; T.step(3); out.sung = p.hp - 30;
      partyDismiss(true); G.flags = keep; T.tough();
      return out;
    });
    check(Math.abs(lyra.aim - 4) < 0.2 && Math.abs(lyra.side - 1.5) < 0.2, 'before her voice, Lyra\'s whistled fifth can be aimed: the one you look at stops longest (' + lyra.aim + ' / ' + lyra.side + ')');
    check(lyra.breath >= 8 && lyra.breath < 14 && lyra.sung >= 22, 'the tending breath is a small heal before her voice returns, the tending note after (' + lyra.breath + ' / ' + lyra.sung + ')');

    // ---- 5. hound packs with a leader; a falling fifth on the leader routs the pack
    const pack = await page.evaluate(() => {
      T.tough(); T.go('clearing', 20.5, 20.5, 0); T.quiet(); const c = Engine.cam, p = G.player;
      const hs = [T.foe('hound', c.x + 6, c.y), T.foe('hound', c.x + 7, c.y + 1), T.foe('hound', c.x + 7, c.y - 1)];
      NARROW28.regroup();
      const leaders = hs.filter((h) => h._n28lead), L = leaders[0];
      const out = { leaders: leaders.length, members: hs.filter((h) => h._n28pack === L).length, bigger: L && L.scale > hs.find((h) => h !== L).scale };
      if (!p.songs.includes('fifth')) p.songs.push('fifth'); G.song.t = 0; G.attack.t = 0; p.voice = 99;
      castSong('fifth');
      out.routed = hs.every((h) => h._n28rout > 0);
      const d0 = Math.hypot(L.x - c.x, L.y - c.y); T.step(220); out.away = Math.hypot(L.x - c.x, L.y - c.y) - d0;
      out.lone = (() => { T.quiet(); const solo = T.foe('hound', c.x + 5, c.y + 5); NARROW28.regroup(); return !solo._n28lead && !solo._n28pack; })();
      return out;
    });
    check(pack.leaders === 1 && pack.members === 2 && pack.bigger && pack.lone, 'hounds near one another run as a pack behind one larger leader; a lone hound has none');
    check(pack.routed && pack.away > 2, 'a falling fifth that stops the leader routs the whole pack (' + pack.away.toFixed(1) + ' cells off)');

    // ---- 6. three canon combat rules
    const rules = await page.evaluate(() => {
      T.tough(); T.go('clearing', 20.5, 20.5, 0); T.quiet(); const c = Engine.cam, p = G.player; const out = {};
      p.hpMax = 100; p.hp = 20; G.noise = 0; T.step(20); out.fear = G.noise; p.hp = 100; T.step(80); out.calm = G.noise;
      // a Quiet goes to a lit lantern
      const q = T.foe('quiet', c.x + 8.5, c.y); UPG.lantern = false; G.noise = 0; T.step(5); out.dark = q.state;
      UPG.lantern = true; T.step(2); out.lit = q.state; UPG.lantern = false; q.dead = q.hidden = true;
      // where a hound bursts, nothing carries
      const h = T.foe('hound', c.x + 0.6, c.y); killEnemy(h); out.patch = NARROW28.patches.length === 1 && NARROW28.playerInPatch();
      const v0 = p.voice; G.song.t = 0; castSong('tending'); out.mute = p.voice === v0;
      const far = T.foe('hound', c.x + 4.5, c.y + 3); G.noise = 9; enemyUpdate(far, 0.033); out.unheard = far.state;
      Engine.cam.x += 6; far.state = 'idle'; G.noise = 9; enemyUpdate(far, 0.033); out.heard = far.state;
      far.dead = far.hidden = true; NARROW28.reset();
      return out;
    });
    check(rules.fear >= 3.4 && rules.calm < 3.4, 'fear is loud: below 30% health your noise does not fall below ' + rules.fear.toFixed(1));
    check(rules.dark === 'idle' && rules.lit === 'chase', 'a Quiet goes to a lit lantern');
    check(rules.patch && rules.mute && rules.unheard === 'idle' && rules.heard === 'chase', 'where a hound bursts nothing carries: no Song, and nothing hears you in it');

    // ---- 7. the Listening Hour
    const night = await page.evaluate(() => {
      T.go('oakhaven', 23.5, 16.5, 0); T.quiet(); const m = G.map;
      const lamps = () => m.entities.filter((e) => e.sprite === 'lamp' && !e._n28lamp);
      const lit = () => lamps().filter((e) => !e._n28off).length;
      const who = (k) => m.entities.filter((e) => e._n28night && e._n28night.startsWith(k)).length;
      const out = {};
      G.tod = 12 / 24; T.step(1); out.noon = [lit(), who('lamp'), who('h')];
      G.tod = 18.3 / 24; T.step(1); out.dusk = [lit(), who('lamp'), who('h')];
      G.tod = 20 / 24; T.step(1); out.night = [lit(), who('lamp'), who('h'), lamps().length];
      G.day = (G.day || 0) + 1; window.__msgs.length = 0; G.tod = 1.5 / 24; T.step(1); out.call = T.heard(/all's well, all's quiet, keep to the Narrow/);
      T.step(2); out.once = window.__msgs.filter((t) => /all's well/.test(t)).length === 1;
      out.saved = !JSON.stringify(snapshotGame().maps.oakhaven || {}).includes('_n28night');
      G.tod = 0.5; T.step(1);
      return out;
    });
    check(night.noon[0] === 0 && night.noon[1] === 0 && night.noon[2] === 0, 'by day the hush-lamps are dark and nobody keeps the crossings');
    check(night.dusk[0] > 0 && night.dusk[0] < night.night[3] && night.dusk[1] === 1, 'at dusk a lamplighter is out, lighting the lamps one by one (' + night.dusk[0] + ' of ' + night.night[3] + ')');
    check(night.night[0] === night.night[3] && night.night[1] === 0 && night.night[2] === 3, 'by night every lamp is lit and three night-hummers sit at the crossings');
    check(night.call && night.once && night.saved, 'at the dead hour the shift changes with "all\'s well, all\'s quiet, keep to the Narrow", once; none of it is saved');

    // ---- 8. the Concordance
    const conc = await page.evaluate(() => {
      const p = G.player, keep = Object.assign({}, G.flags); p.factions.hedge = 10;
      for (const k of Object.keys(G.flags)) if (k.startsWith('n28_c_')) delete G.flags[k];
      Object.assign(G.flags, { tam_told: true, tam_sat: true, pim_safe: true, pim_tended: true });
      T.go('oakhaven', 23.5, 6.5, Math.PI / 2); G.tod = 0.5; T.step(2); const fed = p.factions.hedge; T.step(5); const once = p.factions.hedge === fed;
      p.factions.hedge = 10; const neutral = buyPrice(NPCS.bettany, { item: 'tonic', price: 5 });
      p.factions.hedge = 60; const friend = buyPrice(NPCS.bettany, { item: 'tonic', price: 5 });
      p.factions.hedge = -40; const foe = buyPrice(NPCS.bettany, { item: 'tonic', price: 5 });
      p.factions.hedge = 40; const harrow = G.ents.find((e) => e.id === 'harrow'); talk(harrow); const hi = DLG.log.some((l) => /People speak well of you/.test(l.t)); closeModal(); G.state = 'play';
      p.factions.hedge = 10; talk(harrow); const plain = !DLG.log.some((l) => /People speak well|The Hedge talks/.test(l.t)); closeModal(); G.state = 'play';
      p.factions.hedge = 40; const end = NARROW28.endingLines(); p.factions.hedge = 10; const endN = NARROW28.endingLines();
      G.flags = keep;
      return { fed, once, neutral, friend, foe, hi, plain, end: end.length, endN: endN.length };
    });
    check(conc.fed === 22 && conc.once, 'choices already made feed Hedge standing, once each (10 to ' + conc.fed + ')');
    check(conc.neutral === 5 && conc.friend < 5 && conc.foe > 5, 'standing moves Oakhaven prices (' + conc.friend + ' / ' + conc.neutral + ' / ' + conc.foe + ')');
    check(conc.hi && conc.plain && conc.end === 1 && conc.endN === 0, 'Harrow says a line when the Hedge thinks well of you, and Book One\'s ending carries one line');
    check(!/\(\$\{val >= 0/.test(src('js/upgrades.js')), 'no standing numbers on screen');

    // ---- French for every new string
    const tsv = src('tools/i18n/p28-narrow.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => NARROW28.TEXTS);
    const party = ['Lyra whistles the falling fifth through two fingers, straight at the one you are looking at. It stops dead; the rest falter.', 'Lyra breathes the tending note close to your ear: no voice in it, only breath. Something knits, a little.'];
    const noFr = texts.concat(party).filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((r) => r.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R3 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
