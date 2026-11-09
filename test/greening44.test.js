// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/greening44.test.js
// The Greening, walked (Book One ch. 11; ROADMAP R9 item 1): the quarry gone green and Tobiah's shout; the town drowning
// and the Hedge closing over the North Gate; the lanes and their pieces in the book's order; the corridor (Lyra's circle,
// the line, people pulled from doorways, hounds at the tail, the green that takes your boots, the clock that stands
// still while you are with the line); the square and Rooke's long drops; Orla's tree and the harvest home as Hold the
// Pitch, the fourth line narrowest; the square held with Rooke instead; the North Gate (the Hedge's voices, DON'T
// ANSWER IT three ways, Ada Pellow), the Note stopping and the Kestrel; the end card; saves; voices; French; errors.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { hash, norm } = require(path.join(ROOT, 'tools', 'i18n', 'lib'));

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /greening44/.test(m.text())) errors.push(m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Green Tester');
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
      window.requestAnimationFrame = () => 0;   // freeze the page's own loop: only T.step ticks the game from here
      window.__vo = []; VOICE_ACT.playLine = (l) => { window.__vo.push(l.id); return 0.01; };
      window.__pitch = 0.9; window.__curves = []; REEDS.holdPitch = (o) => { window.__curves.push(o); return Promise.resolve({ score: window.__pitch, aborted: false }); };
      window.T = {
        go(id, x, y, dir) { loadMap(id, x == null ? undefined : { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.05); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const e = T.last(); const c = e && e.c.find((x) => re.test(x.t)); if (c) c.f(); return !!c; },
        at(x, y) { Engine.cam.x = x; Engine.cam.y = y; },
        ent(k) { return G.ents.find((e) => e && e._g44 === k); },
        ents(re) { return G.ents.filter((e) => e && re.test(e._g44 || '')); },
      };
      const f = G.flags; f.lyra_met = f.kaelen_met = f.gate_open = true; f.coil_done = f.rite_started = f.bore_seated = f.bore_broken = f.greening = true; f.r43 = 7; f.boots_delivered = true;
      G.maps.oakhaven = buildOakhaven(true); G.escapeTimer = 300;
    });

    // ---- 0 · the quarry
    const q = await page.evaluate(() => {
      window.__ev.length = 0; T.go('quarry'); const c = T.last();
      return { card: !!c && /A bowl of green/.test(c.t) && /The road's still open/.test(c.b), vo: window.__vo.includes('tobiah.green.road'), once: (T.go('quarry'), window.__ev.length === 1) };
    });
    if (process.env.DEBUG) console.log('q', JSON.stringify(q));
    check(q.card && q.vo && q.once, 'out of the winch-house: the quarry a bowl of green, the Legionnaires with grass through their feet, Tobiah: "The road\'s still open!" (once)');

    // ---- 1 · the town and the lanes
    const lanes = await page.evaluate(() => {
      const out = {}, f = G.flags;
      window.__ev.length = 0; window.__msgs.length = 0; T.go('oakhaven', 23.5, 3.5, Math.PI / 2);
      const c = T.last(); out.card = !!c && /drowning in its own ground/.test(c.t) && /closing over the North Gate/.test(c.b) && /I see it\./.test(c.b);
      out.stage1 = GREEN44.stage() === 1 && !!T.ent('lyra') && !!T.ent('kaelen');
      c.c[0].f(); out.shut = T.heard(/thorn closes over the North Gate/);
      window.__msgs.length = 0; transfer({ map: 'clearing', x: 20.5, y: 32.5, dir: 0 }); out.sealed = G.mapId === 'oakhaven' && T.heard(/closes over the North Gate/);
      out.journal = G.journal.some((j) => /Hearthday afternoon\. The Greening/.test(j.text));
      // walk behind Lyra down the main road; the clock does not run while you are with her
      const t0 = G.escapeTimer; let n = 0; window.__msgs.length = 0;
      while (GREEN44.stage() === 1 && n < 1200) { const ly = T.ent('lyra'); T.at(ly.x, ly.y - 1.6); T.step(1, 0.1); n++; }
      out.order = ['heaving', 'I punched it down', 'dreadful embarrassment', 'She goes in anyway'].map((s) => window.__msgs.findIndex((m) => m.includes(s)));
      out.clock = G.escapeTimer >= t0 - 0.01;
      out.well = /The well-head/.test(T.last().t) && /Behind me!/.test(T.last().b);
      out.vo = window.__vo.includes('townswoman.green.punched') && window.__vo.includes('lyra_ruined.green.behind');
      // falling behind: she waits, and the clock runs
      return out;
    });
    if (process.env.DEBUG) console.log('lanes', JSON.stringify(lanes));
    check(lanes.card && lanes.stage1 && lanes.shut && lanes.sealed && lanes.journal, 'Oakhaven drowning, the iron-oaks ringing, "The gate — Kael—" "I see it."; the thorn closes over the North Gate behind you');
    check(lanes.order.every((i, k, a) => i >= 0 && (k === 0 || i > a[k - 1])) && lanes.clock, 'down the lanes behind Lyra, the pieces in the book\'s order: the churchyard, the baker\'s wife, the carter at Weavers\' Cross, the Hollow; the hour does not run while you are with her');
    check(lanes.well && lanes.vo, 'at the well-head she sings the falling fifth at full voice: "Behind me! In a line!"');

    // ---- 2 · the corridor
    const cor = await page.evaluate(() => {
      const out = {}, f = G.flags;
      T.last().c[0].f(); out.hint = T.heard(/Walk with the line/);
      out.line0 = GREEN44.lineN() === 6 && T.ents(/^line/).filter((e) => !e.hidden).length === 6 && T.ents(/^door/).length === 6;
      const d0 = T.ent('door0'); T.at(d0.x + 0.6, d0.y); useDeco(d0); out.pulled = GREEN44.lineN() === 7 && !T.ent('door0') && f.g44_pulled.includes(0);
      // stray from the line: the green takes your boots
      const hp = G.player.hp; T.at(10.5, 46.5); T.step(40, 0.1); out.green = G.player.hp < hp && T.heard(/strayed from the line/) && GREEN44.R.inGreen;
      const hpAfter = G.player.hp; G.player.hp = G.player.hpMax;
      // walk with the line; let the first hound reach the tail, kill the others
      let n = 0, killed = 0;
      while (GREEN44.stage() === 2 && n < 1600) {
        const ly = T.ent('lyra'); T.at(ly.x + 1.2, ly.y + 0.5);
        for (const h of T.ents(/^tailhound$/)) if (!h.dead && (f.g44_lost | 0) >= 1) { h.dead = true; h.hidden = true; killed++; }
        T.step(1, 0.1); n++;
      }
      out.lost = (f.g44_lost | 0) === 1; out.killed = killed >= 1; out.hounds = GREEN44.R.hounds === 3;
      out.joins = T.heard(/Hetty Bram gets them into a line/) && T.heard(/children into the middle/) && T.heard(/Rooke comes up the lane/) && T.heard(/the way a wake closes/);
      out.square = GREEN44.stage() === 3 && /The square/.test(T.last().t) && /long drops/.test(T.last().b);
      out.vo = window.__vo.includes('lyra_ruined.green.orla');
      out.hpAfter = hpAfter >= 1;
      return out;
    });
    if (process.env.DEBUG) console.log('cor', JSON.stringify(cor));
    check(cor.hint && cor.line0 && cor.pulled, 'the line: six behind her to start, hands on shoulders; use a person in a doorway and they join it');
    check(cor.green && cor.hpAfter, 'stray from the line and the green takes your boots (health drains; never below one)');
    check(cor.lost && cor.killed && cor.hounds && cor.joins, 'three hounds come for the tail: one that gets there takes the last man; Hetty, the dye-works women, Bettany (the children in the middle) and Rooke work the line; the wake closes three feet behind');
    check(cor.square && cor.vo, 'the square: "Orla." Rooke could not cross her floor; he gives Lyra the long drops: "Go on, girl. Go."');

    // ---- 3–4 · with Lyra to Orla's tree
    const orla = await page.evaluate(async () => {
      const out = {}, f = G.flags;
      T.pick(/Go with Lyra to Orla/); out.stage4 = GREEN44.stage() === 4 && !f.g44_hold;
      let n = 0; while (n < 400 && (f.g44_o || 0) < GREEN44.polyLen(GREEN44.TO_ORLA) - 0.05) { const ly = T.ent('lyra'); T.at(ly.x - 1.2, ly.y); T.step(1, 0.1); n++; }
      out.atDoor = Math.hypot(T.ent('lyra').x - 29.0, T.ent('lyra').y - 40.5) < 0.3;
      window.__ev.length = 0; T.go('orla_house', 7.5, 5.5, Math.PI);
      const c = T.last(); out.card = !!c && /Orla's tree/.test(c.t) && /You're late, lovey/.test(c.b) && !!T.ent('tree');
      c.c[0].f(); const c2 = T.last(); out.now = /Now, girl\. Now\. All the lines\./.test(c2.b) && /three of them/.test(c2.b);
      out.noSecond = !c2.c.some((x) => /second voice/.test(x.t)) && c2.c.some((x) => /Root/.test(x.t)) && c2.c.some((x) => /door/.test(x.t));
      window.__curves.length = 0; window.__pitch = 0.9; T.pick(/Root under her/); await new Promise((r) => setTimeout(r, 50));
      out.curves = window.__curves.length === 2 && window.__curves[1].width < window.__curves[0].width * 0.5 && window.__curves[0].curve.every((p) => p[1] === 174);
      out.orla = f.g44_orla === 'root' && /Lyra holds it/.test(T.last().b) && /stops breathing/.test(T.last().b);
      T.last().c[0].f(); out.hounds = /Kaelen meets the first one/.test(T.last().b) && /Then we open it/.test(T.last().b);
      T.last().c[0].f(); out.gate = GREEN44.stage() === 5 && G.mapId === 'oakhaven' && !!T.ent('crowd0');
      out.vo = ['orla.green.late', 'lyra_ruined.green.hurt', 'kaelen.green.line'].every((id) => window.__vo.includes(id));
      return out;
    });
    if (process.env.DEBUG) console.log('orla', JSON.stringify(orla));
    check(orla.stage4 && orla.atDoor && orla.card && orla.now, 'with Lyra to the house two doors from the blue door: Orla included in the tree, "You\'re late, lovey", the long drops, "Now, girl. Now. All the lines."');
    check(orla.noSecond && orla.curves && orla.orla, 'without the Sheaf you hum the Root under her (two Holds; the fourth line narrowest); Lyra holds the fourth line; Orla stops breathing around the sixth');
    check(orla.hounds && orla.gate && orla.vo, 'the hounds through the canopy; Kaelen: "The gate—" "The gate\'s closed." "Then we open it."');

    // ---- 5 · the North Gate: shout it yourself
    const gate = await page.evaluate(() => {
      const out = {}, f = G.flags;
      window.__ev.length = 0; T.at(23.5, 9.5); T.step(2, 0.1);
      const c = T.last(); out.card = !!c && /The North Gate/.test(c.t) && /Four hundred people/.test(c.b) && /grows back faster than they cut/.test(c.b);
      out.crowd = T.ents(/^crowd/).length >= 30;
      c.c[0].f(); window.__msgs.length = 0; let n = 0;
      while ((f.g44_gate | 0) < 2 && n < 400) { T.at(23.5, 7.5); T.step(1, 0.1); n++; }
      out.voices = ['"Lark."', 'way through down here', 'Tammy', 'I know the way out', 'the barley'].every((s) => T.heard(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))));
      out.vo = ['wearer.green.lark', 'wearer.green.tam', 'wearer.green.lyra', 'wearer.green.davin', 'lyra_ruined.green.dont'].every((id) => window.__vo.includes(id));
      const d = T.last(); out.dont = /DON'T ANSWER IT/.test(d.t) && d.c.length === 3;
      T.pick(/Shout it yourself/); out.loud = G.noise >= 6 && T.ents(/^crowdhound$/).length === 3;
      T.step(20, 0.1); out.waits = (f.g44_gate | 0) === 2;
      for (const h of T.ents(/^crowdhound$/)) { h.dead = true; h.hidden = true; }
      n = 0; while ((f.g44_gate | 0) < 3 && n < 100) { T.step(1, 0.1); n++; }
      const a = T.last(); out.ada = /Ada Pellow/.test(a.t) && /is that you\?/.test(a.b) && /Hello, Ada/.test(a.b) && G.ledger.some((r) => r.name === 'Ada Pellow');
      a.c[0].f(); out.easy = T.heard(/easy from this side/);
      n = 0; while ((f.g44_gate | 0) < 4 && n < 100) { T.step(1, 0.1); n++; }
      const ch = T.last(); out.chapel = /The Note stops/.test(ch.t) && /Drift-Kestrel/.test(ch.b) && f.g44_note_stopped;
      out.mute = !Audio_.master || Audio_.master.gain.value >= 0;
      ch.c[0].f(); out.rope = typeof ROPE45 === 'undefined' || (ROPE45.stage() === 1 && /The line/.test(T.last().t)); if (typeof ROPE45 !== 'undefined') ROPE45.finish();
      out.ending = out.rope && G.state === 'ending' && !document.querySelector('#ending').classList.contains('hidden');
      const txt = document.querySelector('#ending-text').textContent;
      out.endOrla = /with you on the Root under her/.test(txt) && !/Lyra sang Orla Hale down proper/.test(txt);
      out.endAda = /you shouted it with her/.test(txt) && /taken from the tail/.test(txt);
      out.journal = G.journal.some((j) => /Hello, Ada\./.test(j.text));
      return out;
    });
    if (process.env.DEBUG) console.log('gate', JSON.stringify(gate));
    check(gate.card && gate.crowd, 'the North Gate: four hundred people in a lozenge of mud, the thorn thirty feet high outgrowing the axes');
    check(gate.voices && gate.vo, 'the Hedge speaks as Tobin ("Lark."), Tam, Lyra whole and Davin\'s harvest home');
    check(gate.dont && gate.loud && gate.waits, 'Lyra screams DON\'T ANSWER IT from the mounting-block; shout it yourself and the hounds come to the crowd (the scene waits for them)');
    check(gate.ada && gate.easy, 'Ada Pellow: "Tobin Ashgrove, is that you?" "Hello, Ada." She goes into the thorn (into the ledger); "It\'s easy from this side."');
    check(gate.chapel && gate.mute && gate.ending && gate.journal, 'the Chapel falls, the Note stops, "Lyra. Look up." the Kestrel; then Grab the Line');
    check(gate.endOrla && gate.endAda, 'the end card tells it as you played it: Orla sung with you on the Root, the line and its losses, the shout at the gate');

    // ---- the other way: hold the square with Rooke; the Sheaf known; stay silent at the gate; a save mid-walk
    const other = await page.evaluate(async () => {
      const out = {}; let f = G.flags;
      hide('#ending'); G.state = 'play';
      for (const k of Object.keys(f)) if (/^g44|^escaped$/.test(k)) delete f[k];
      G.ledger = G.ledger.filter((r) => r.name !== 'Ada Pellow'); G.escapeTimer = 300; G.maps.oakhaven = buildOakhaven(true);
      window.__ev.length = 0; T.go('oakhaven', 23.5, 3.5); T.last().c[0].f();
      // a save in the lanes keeps the stage and stages the figures again
      f.g44_l = 20; const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); f = G.flags; G.state = 'play'; T.step(1, 0.05);
      out.saved = GREEN44.stage() === 1 && T.ents(/^lyra$/).length === 1 && Math.abs(T.ent('lyra').y - (5 + 20)) < 0.2;
      GREEN44.startCorridor(); T.last().c[0].f(); f.g44_d = GREEN44.polyLen(GREEN44.CORRIDOR); T.step(1, 0.05);
      out.square = GREEN44.stage() === 3;
      T.pick(/hold the square/); out.hold = GREEN44.stage() === 4 && f.g44_hold === 1 && T.ent('lyra').hidden;
      let n = 0; while (!GREEN44.R.holdDone && n < 600) { T.at(GREEN44.SQUARE[0], GREEN44.SQUARE[1] + 2); for (const h of T.ents(/^sqhound$/)) { h.dead = true; h.hidden = true; } T.step(1, 0.1); n++; }
      out.held = GREEN44.R.holdDone && f.g44_whole === true && f.g44_orla === 'one' && /Lyra comes back up the lane/.test(T.last().b) && /goes to the gate whole/.test(T.last().b);
      T.last().c[0].f(); out.gate = GREEN44.stage() === 5;
      // the Sheaf known: the second voice is offered at Orla's tree
      f.g44 = 4; f.g44_hold = 0; delete f.g44_orla; f.p12f_q = 2; window.__ev.length = 0; T.go('orla_house', 7.5, 5.5, Math.PI); if (!T.last()) { out.dbg = { s: GREEN44.stage(), map: G.mapId, live: GREEN44.live(), hold: f.g44_hold, orla: f.g44_orla, esc: f.escaped, held: out.held, sq: out.square, h: out.hold }; return out; } T.last().c[0].f();
      out.second = T.last().c.some((x) => /second voice/.test(x.t));
      window.__curves.length = 0; T.pick(/second voice/); await new Promise((r) => setTimeout(r, 50));
      out.melody = window.__curves[0] && window.__curves[0].curve.some((p) => p[1] !== 174) && f.g44_orla === 'two' && /The two of you hold it/.test(T.last().b);
      // the gate, saying nothing
      T.last().c[0].f(); T.last().c[0].f();
      window.__ev.length = 0; T.at(23.5, 9.5); T.step(2, 0.1); T.last().c[0].f(); n = 0;
      while ((f.g44_gate | 0) < 2 && n < 400) { T.at(23.5, 7.5); T.step(1, 0.1); n++; }
      T.pick(/say nothing/); window.__msgs.length = 0; n = 0; while ((f.g44_gate | 0) < 3 && n < 100) { T.step(1, 0.1); n++; }
      T.last().c[0].f(); await new Promise((r) => setTimeout(r, 2700));
      out.silent = f.g44_shout === 'silent' && T.heard(/Tanner cousins says "Mam\?"/);
      out.endLines = GREEN44.endLines().join(' ');
      return out;
    });
    if (process.env.DEBUG) console.log('other', JSON.stringify(other));
    check(other.saved, 'a save in the lanes keeps the stage and Lyra\'s place; the figures are staged again, once');
    check(other.square && other.hold && other.held && other.gate, 'hold the square with Rooke: forty seconds of hounds at the line; Lyra sings Orla down alone and comes back with nothing in her voice; the line goes to the gate whole');
    check(other.second && other.melody, 'if you cut the Last Sheaf with Harrow you sing the second voice (the melody, not the Root), and the two of you hold the fourth line');
    check(other.silent && /a Tanner cousin went after a voice/.test(other.endLines), 'say nothing at the gate: [PROPOSED] one more answers, a Tanner cousin; the end card says so');

    // ---- voices and French
    const vo = await page.evaluate(() => {
      const all = Object.values(GREEN44.VO).flat();
      return { missing: all.filter((id) => !VOICE_ACT.LINES[id]) };
    });
    check(vo.missing.length === 0, 'the Greening is voiced: every card and spoken message has its recorded lines (' + (vo.missing.slice(0, 3).join(', ') || 'all there') + ')');
    const fr = JSON.parse(src('locales/story/fr.json'));
    const tsv = src('tools/i18n/p44-greening.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => GREEN44.TEXTS.slice());
    const noFr = texts.filter((t) => !pairs.has(t) || !(fr.s[hash(norm(t))] || fr.p.some((p) => p[0] === norm(t))));
    check(texts.length >= 100 && noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair in p44-greening.tsv and locales/story/fr.json (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow|Hearthday|Greening)\b/.test(r[1])), 'the French follows the glossary (le Silence, les Creux, Chantre, la Haie, Âtredi, le Verdissement)');

    check(errors.length === 0, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL GREENING TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
