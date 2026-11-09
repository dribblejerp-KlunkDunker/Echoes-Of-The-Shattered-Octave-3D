// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/rope45.test.js
// Grab the Line, played (Book One ch. 12; ROADMAP R9 item 2): the line over the North Gate; up to the drum or down at the
// foot of it with the Governor; hauling on the beat while Vane counts them onto the deck (4, 8, 11, "I can count", 13, 15);
// eighteen: the canopy's voices, the jitter through the old man (his hands stay on the knot), over the rail (you, or
// Kaelen); twenty-one; Lyra up with the last four before the last (Lissa and Tobiah among them, so ch. 13 holds); the last
// load with Aldric at the bottom; the count one to ten; the Echo if you hold the drum at ten; the cut; the rope that
// hangs; the end card; the deck's ladder shut during the scene; a save mid-haul; voices; French; no page errors.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /rope45|greening44|kestrel16/.test(m.text())) errors.push(m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Rope Tester');
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
      window.requestAnimationFrame = () => 0;
      window.__vo = []; VOICE_ACT.playLine = (l) => { window.__vo.push(l.id); return 0.01; };
      window.T = {
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.05); } },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        idx(s) { return window.__msgs.findIndex((t) => t.includes(s)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const e = T.last(); const c = e && e.c.find((x) => re.test(x.t)); if (c) c.f(); return !!c; },
        first() { const e = T.last(); if (e && e.c[0]) e.c[0].f(); },
        at(x, y) { Engine.cam.x = x; Engine.cam.y = y; },
        ent(k) { return G.ents.find((e) => e && e._r45 === k); },
        reset() {
          const f = G.flags;
          for (const k of Object.keys(f)) if (/^r45|^escaped$/.test(k)) delete f[k];
          Object.assign(f, { lyra_met: true, kaelen_met: true, gate_open: true, coil_done: true, rite_started: true, bore_broken: true, greening: true, r43: 7, g44: 5, g44_gate: 4, g44_note_stopped: true, g44_orla: 'two' });
          hide('#ending'); G.state = 'play'; G.escapeTimer = 300; G.maps.oakhaven = buildOakhaven(true);
          loadMap('oakhaven', { x: 23.5, y: 8.5, dir: -Math.PI / 2 }); G.state = 'play';
          window.__ev.length = 0; window.__msgs.length = 0; window.__vo.length = 0;
        },
        haulOnBeat() { ROPE45.R.beat = 0; ROPE45.R.haulCool = 0; useDeco(T.ent('drum')); },
      };
      T.reset();
    });

    // ---- 1 · the line, and up to the drum
    const up = await page.evaluate(() => {
      const out = {}, f = G.flags;
      ROPE45.begin(); const c = T.last();
      out.card = !!c && /The line/.test(c.t) && /They do not rush it/.test(c.b) && /One with arms, for the drum/.test(c.b) && c.c.length === 2;
      out.vo = window.__vo.includes('vane.rope.arms'); out.journal = G.journal.some((j) => /Mags put the line over/.test(j.text));
      T.pick(/work the drum/); out.climb = /up the knots between two loads of children/.test(T.last().b);
      T.first(); out.deck = G.mapId === ROPE45.DECK && ROPE45.stage() === 2 && !!T.ent('drum') && !!T.ent('mags') && !!T.ent('vane') && !!T.ent('line');
      out.clock = G.escapeTimer > 0;
      const lad = G.ents.find((e) => e && e.use === 'p16k_exit'); if (lad) useDeco(lad); out.ladderShut = G.mapId === ROPE45.DECK;
      return out;
    });
    if (process.env.DEBUG) console.log('up', JSON.stringify(up));
    check(up.card && up.vo && up.journal, 'the line over the North Gate: the town does not rush it (Hetty on the block, Bettany, Rooke\'s triage); Vane wants arms at the drum');
    check(up.climb && up.deck && up.ladderShut && up.clock, 'up the knots between two loads of children onto the Kestrel\'s deck: the drum, Mags, Vane, the line; the ladder is shut during the scene');

    // ---- 2 · the drum
    const drum = await page.evaluate(() => {
      const out = {}, f = G.flags, d = T.ent('drum');
      T.at(d.x + 0.9, d.y - 0.6);
      ROPE45.R.prog = 0; ROPE45.R.beat = 0.6; ROPE45.R.haulCool = 0; useDeco(d); out.slip = Math.abs(ROPE45.R.prog - 0.35) < 0.01 && T.heard(/Off the beat/);
      ROPE45.R.prog = 0; T.haulOnBeat(); out.good = ROPE45.R.prog === 1;
      T.haulOnBeat(); T.haulOnBeat(); out.four = f.r45_count === 4 && T.heard(/^Four\.$/) && window.__vo.includes('vane.rope.four');
      let n = 0; while (ROPE45.stage() === 2 && n < 60) { T.haulOnBeat(); n++; }
      out.order = ['Four.', 'Eight.', 'Eleven.', 'I can count', 'Thirteen. Fifteen.'].map((s) => T.idx(s));
      out.crowd = G.ents.filter((e) => e && /^aboard/.test(e._r45 || '') && !e.hidden).length >= 9;
      // Mags hauls alone if you do not: never stuck
      return out;
    });
    if (process.env.DEBUG) console.log('drum', JSON.stringify(drum));
    check(drum.slip && drum.good && drum.four, 'haul on the beat: on it the line comes up a knot, off it the load swings; three hauls to a load and Vane counts "Four."');
    check(drum.order.every((i, k, a) => i >= 0 && (k === 0 || i > a[k - 1])) && drum.crowd, 'Vane counts them onto the deck as the book has it: four, eight, eleven, "Captain—" "I can count.", thirteen, fifteen; the deck fills, the children in the middle');

    // ---- 3 · eighteen: the jitter; Kaelen takes it (you were too slow)
    const ei = await page.evaluate(() => {
      const out = {}, f = G.flags;
      const c = T.last(); out.card = /At eighteen/.test(c.t) && /goes through him/.test(c.b) && /His hands stay on the rope/.test(c.b);
      out.canopy = T.heard(/lambs and dusk/) && G.ledger.some((r) => /old man on the rope/.test(r.name));
      T.first(); out.jitter = !!T.ent('jitter') && ROPE45.stage() === 3;
      T.at(16 + 21, 14 + 5); T.step(90, 0.1); out.dbg = { st: ROPE45.stage(), j: f.r45_jitter, jt: ROPE45.R.jitterT, ev: (T.last() || {}).t, map: G.mapId, hp: G.player.hp, state: G.state };
      const k = T.last(); out.kaelen = f.r45_jitter === 'kaelen' && /Kaelen Vance comes over the port rail/.test(k.b) && /Get them up!/.test(k.b);
      T.first(); out.three = /Twenty-one\./.test(T.last().b) && /Look at the trees/.test(T.last().b);
      T.first(); const l = T.last(); out.lyra = /The last four before the last/.test(l.t) && /Lissa Merrow roped under the arms/.test(l.b) && /Tobiah Marsh with his charts/.test(l.b) && /They're coming/.test(l.b) && !!T.ent('lyra');
      T.first(); const ll = T.last(); out.last = /dye-works apron/.test(ll.b) && /two carters/.test(ll.b) && /Governor's chain/.test(ll.b) && /Take her up/.test(ll.b) && /The rope snags/.test(ll.b) && !/bandaged stumps|charts stuffed/.test(ll.b);
      out.vo = ['kaelen.rope.getthemup', 'engineer.rope.down', 'kaelen.rope.iknow', 'vane.rope.takeup'].every((id) => window.__vo.includes(id));
      return out;
    });
    if (process.env.DEBUG) console.log('ei', JSON.stringify(ei));
    check(ei.card && ei.canopy && ei.jitter, 'eighteen: the canopy\'s voices; the jitter goes through the old man at the bottom and his hands stay on the knot (into the ledger); it comes up for the rail');
    check(ei.kaelen && ei.three, 'too slow and Kaelen comes over the port rail and takes it out of the air (canon): "Get them up!" Three up; twenty-one; "Look at the trees, Captain"');
    check(ei.lyra && ei.last && ei.vo, 'Lyra comes up with the last four before the last (Lissa and Tobiah with her, so ch. 13 holds) and cannot make a sound; the last load is the dye-works woman, two carters, a screaming woman and the Governor; "Take her up."; the rope snags');

    // ---- 5 · the count, held at ten: the Echo, then back at nine
    const count = await page.evaluate(async () => {
      const out = {}, f = G.flags;
      window.__msgs.length = 0; T.first(); out.stage = ROPE45.stage() === 5 && T.heard(/drum's coming out of the deck/);
      const ln = ROPE45.AT.line; T.at(ln[0] + 0.2, ln[1] - 2.2); Engine.cam.dir = Math.PI / 2;
      let n = 0; while (n < 400 && !T.heard(/^Five\./)) { T.step(1, 0.05); n++; }
      useDeco(T.ent('drum')); out.hold = f.r45_hold === true;
      window.__ev.length = 0; n = 0; while (n < 400 && !T.heard(/^Ten\.$/)) { T.step(1, 0.05); n++; }
      await new Promise((r) => setTimeout(r, 500));
      out.numbers = ['One.', 'Two.', 'Three.', 'Four. The deck-beam', 'Five.', 'Six.', 'Seven.', 'Eight.', 'Nine.', 'Ten.'].map((s) => T.idx(s)).every((i, k, a) => i >= 0 && (k === 0 || i > a[k - 1]));
      out.wave = T.heard(/palm out, the way a man waves a cart on past a hole in the road/) && T.heard(/"Do it," says Kaelen/);
      const e = T.last(); out.echo = !!e && /An Echo/.test(e.t) && /four hundred and eleven times/.test(e.b) && f.r45_echo && document.querySelector('canvas').style.filter.includes('grayscale');
      e.c[0].f(); window.__ev.length = 0; n = 0; window.__msgs.length = 0;
      while (n < 200 && !T.heard(/^Ten\.$/)) { T.step(1, 0.05); n++; }
      await new Promise((r) => setTimeout(r, 500));
      const a = T.last(); out.cut = !!a && /Like a cork/.test(a.t) && /Vane cuts the line/.test(a.b) && /Nobody coils it/.test(a.b) && ROPE45.stage() === 6;
      out.saw = f.r45_saw === true && /You saw his hand go up/.test(a.b);
      out.ledger = G.ledger.some((r) => r.name === 'Aldric Vance');
      out.rope = !T.ent('line') && G.ents.some((x) => x && x.sprite === 'p16k_rope' && !x.hidden && /cut rope hanging from the winch drum/.test(x.label));
      out.vo = ['vane.rope.n1', 'vane.rope.n9', 'weaver.rope.echo'].every((id) => window.__vo.includes(id));
      a.c[0].f(); out.ending = G.state === 'ending' && ROPE45.stage() === 7 && G.flags.g44 === 6;
      const txt = document.querySelector('#ending-text').textContent;
      out.endText = /You worked the winch drum with Mags/.test(txt) && /waved the cart on past a hole in the road/.test(txt) && /held on to the drum at ten/.test(txt) && !/The mooring mast is taken by a tree/.test(txt);
      out.journal = G.journal.some((j) => /Vane cut the line on ten/.test(j.text));
      return out;
    });
    if (process.env.DEBUG) console.log('count', JSON.stringify(count));
    check(count.stage && count.numbers && count.wave, 'the count, one to ten, line by line as the book has it: the beam goes, Vane takes the axe, Aldric looks up and waves the cart on, "Do it."');
    check(count.hold && count.echo, 'hold on to the drum at ten and the Echo plays, grey: the drum tears out, the Kestrel goes into the crown, "four hundred and eleven times"');
    check(count.cut && count.saw && count.ledger && count.rope && count.vo, 'back at nine, then ten, and Vane cuts: like a cork; you were looking, you saw his hand; Aldric into the ledger; six feet of cut rope hanging from the drum');
    check(count.ending && count.endText && count.journal, 'Grab the Line\'s end card tells it as played (the drum, the count, the Echo) instead of "the mooring mast is taken by a tree"');

    // ---- the other way: at the foot of the line with the Governor; a save mid-haul; the jitter struck yourself
    const foot = await page.evaluate(async () => {
      const out = {}; let f = G.flags;
      T.reset(); f = G.flags; ROPE45.begin(); T.pick(/Stay at the foot/);
      out.staged = G.mapId === 'oakhaven' && !!T.ent('aldric') && !!T.ent('queue0') && T.heard(/Put them on the knots/);
      useDeco(T.ent('queue0')); useDeco(T.ent('queue1')); useDeco(T.ent('queue2'));
      out.four = f.r45_count === 4 && T.heard(/From forty feet up, Vane, counting them onto the deck: "Four\."/);
      let n = 0; while (ROPE45.stage() === 1 && n < 900) { T.step(1, 0.1); n++; }
      const c = T.last(); out.eighteen = /At eighteen/.test(c.t) && /They fall at your feet/.test(c.b) && /white-hot wick/.test(c.b);
      T.first(); const l = T.last();
      out.up = G.mapId === ROPE45.DECK && /Up with her\. Keep her on the knot/.test(l.b) && window.__vo.includes('aldric.rope.you');
      T.first(); T.first(); const ln = ROPE45.AT.line; T.at(ln[0], ln[1] - 2); Engine.cam.dir = -Math.PI / 2;
      window.__ev.length = 0; n = 0; while (n < 400 && !T.heard(/^Ten\.$/)) { T.step(1, 0.05); n++; }
      await new Promise((r) => setTimeout(r, 500));
      const a = T.last(); out.noEcho = /Like a cork/.test(a.t) && !f.r45_echo && /You were not looking/.test(a.b);
      a.c[0].f();
      out.end = /You stood at the foot of the line with Aldric Vance/.test(document.querySelector('#ending-text').textContent);
      // a save at the drum keeps you aboard
      T.reset(); f = G.flags; ROPE45.begin(); T.pick(/work the drum/); T.first(); T.haulOnBeat();
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); f = G.flags; G.state = 'play'; T.step(2, 0.05);
      out.saved = G.mapId === ROPE45.DECK && ROPE45.stage() === 2 && G.ents.filter((e) => e && e._r45 === 'drum').length === 1;
      // strike the jitter yourself
      f.r45_load = 5; f.r45_count = 15; ROPE45.R.prog = 2.995; T.step(1, 0.1); T.first();
      const j = T.ent('jitter'); j.dead = true; j.hidden = true; T.step(2, 0.1);
      out.you = f.r45_jitter === 'you' && /You meet it at the rail/.test(T.last().b);
      return out;
    });
    if (process.env.DEBUG) console.log('foot', JSON.stringify(foot));
    check(foot.staged && foot.four && foot.eighteen, 'stay at the foot of the line: put them on the knots with Aldric; the count from forty feet up; at eighteen the old man\'s hands fall at your feet, and Kaelen\'s light on the rail');
    check(foot.up && foot.noEcho && foot.end, 'Aldric puts you on Lyra\'s load ("Up with her. Keep her on the knot."); the count from the deck; not looking at eight; the end card says you loaded with him');
    check(foot.saved && foot.you, 'a save at the drum keeps you aboard, staged once; strike the jitter yourself before Kaelen and the card says so');

    // ---- voices and French
    const vo = await page.evaluate(() => ({ missing: Object.values(ROPE45.VO).flat().filter((id) => !VOICE_ACT.LINES[id]) }));
    check(vo.missing.length === 0, 'Grab the Line is voiced: every card and spoken message has its recorded lines (' + (vo.missing.slice(0, 3).join(', ') || 'all there') + ')');
    const fr = JSON.parse(src('locales/story/fr.json'));
    const tsv = src('tools/i18n/p45-rope.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const texts = await page.evaluate(() => ROPE45.TEXTS.slice());
    const noFr = texts.filter((t) => !pairs.has(t) || !(fr.s[hash(norm(t))] || fr.p.some((p) => p[0] === norm(t))));
    check(texts.length >= 70 && noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair in p45-rope.tsv and locales/story/fr.json (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow|Hearthday|Greening|Pennick)\b/.test(r[1])) && !texts.some((t) => /Pennick/.test(t)), 'the French follows the glossary; the engineer is unnamed in Book One (no "Pennick")');

    check(errors.length === 0, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL ROPE TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
