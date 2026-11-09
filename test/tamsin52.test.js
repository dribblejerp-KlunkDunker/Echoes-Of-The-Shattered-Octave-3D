// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/tamsin52.test.js
// Tamsin Reed (js/tamsin52.js; Book One ch. 5 and 7; ROADMAP R9 item 10): the doorway at Depot Three and its choices by
// calling, the voice in the bell, the slag-slope, the Factor's question, a body left, dawn at Kaelen's hut, Sable's
// Ledger, the jugs on the Bell Yard, and French.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /tamsin52|audit54/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof TAMSIN52 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Depot Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForFunction(() => G.state === 'play');
    await page.evaluate(() => {
      window.__msgs = []; const _m = window.msg; window.msg = function (t) { window.__msgs.push(String(t)); return _m.apply(this, arguments); };
      window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); };
      window.__base = JSON.parse(JSON.stringify(snapshotGame()));
      window.T = {
        reset(glassed, archivist) { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; G.player.glassed = !!glassed; G.player.songs = G.player.songs.filter((s) => s !== 'name'); if (archivist) G.player.songs.push('name'); window.__ev.length = 0; window.__msgs.length = 0; },
        step(n) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(0.05); } },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        toDoor() { G.day = 1; G.tod = 2 / 24; loadMap('quarry'); const t = TAMSIN52.tamsin(G.map); loadMap('quarry', { x: t.x, y: t.y + 2.2, dir: -Math.PI / 2 }); T.step(2); return TAMSIN52.tamsin(G.map); },
      };
    });

    // ---- the doorway: what you can do depends on your calling
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(false, false); const e = T.toDoor();
      const ev = T.last();
      out.slag = G.map.entities.some((x) => x._p52 === 'slag' && x.bodyCover && x.transient);
      out.card = !!ev && ev.t === 'Depot Three' && /the blue jug, Mam\. Not the white/.test(ev.b) && /interlaced reeds/.test(ev.b);
      out.plain = ev.c.map((c) => c.t).join('|') === 'Fight it|Step back';
      T.pick(/Step back/); T.step(3); out.once = window.__ev.length === 1;
      T.reset(true, true); T.toDoor();
      out.both = T.last().c.map((c) => c.t).join('|') === 'Fight it|Take it by the bell|Read it its name|Step back';
      // fight: loud, and the bells log it
      T.pick(/Fight it/);
      out.fight = G.flags.p52 === 1 && G.flags.p52_how === 'f' && (AUDIT54.logged() & AUDIT54.BITS.fight) !== 0 && T.heard(/Bronze on bronze/);
      return out;
    });
    check(r.slag && r.card, 'at Depot Three the reed-grille Legionnaire comes to take you by the arms: "the blue jug, Mam. Not the white"; the slag-slope recess is there (transient)');
    check(r.plain && r.once, 'without glass or the Read the Name song: fight it or step back (and the card waits until you come again)');
    check(r.both && r.fight, 'glassed and an archivist: take it by the bell, or read it its name; fighting is loud, and the bells log it');

    // ---- by the bell: the voice, the core, the glass; the slag-slope and the Factor's question
    r = await page.evaluate(() => {
      const out = {};
      T.reset(true, false); const e = T.toDoor(); const g0 = G.player.glass;
      T.pick(/by the bell/); T.step(30);
      const ev = window.__ev.find((x) => x.t === 'Inside the bell');
      out.voice = !!ev && /I'm <i>Tamsin Reed<\/i>\. Tell her\. Tell Mam/.test(ev.b) && /the glass drinks it/.test(ev.b);
      out.dead = e.dead && TAMSIN52.stage() === 2 && G.flags.p52_how === 'g' && G.has('core') && G.ledger.some((l) => l.name === 'Tamsin Reed') && G.player.glass === Math.min(99, g0 + 3);
      out.quiet = (AUDIT54.logged() & AUDIT54.BITS.fight) === 0;
      const body = G.map.entities.find((x) => x._p52body);
      const slag = G.map.entities.find((x) => x._p52 === 'slag');
      out.body = !!body && !!slag;
      if (body) { body.x = slag.x; body.y = slag.y; body.hidden = true; body.stashedIn = slag; }
      loadMap('clearing'); T.step(1);
      out.pit = G.flags.p52_body === 1 && T.heard(/old green water/) && (AUDIT54.logged() & AUDIT54.BITS.body) === 0;
      // the Factor asks, once
      window.__ev.length = 0; talk({ id: 'vosk', kind: 'npc' });
      out.asks = /Did you see anything\?/.test(T.last().b);
      T.pick(/^"No\."$/); out.dark = /It was very dark/.test(T.last().b) && G.flags.p52_vosk === 1;
      return out;
    });
    check(r.voice && r.dead && r.quiet, 'glassed, by the bell (canon): the glass drinks the alarm; "I\'m Tamsin Reed. Tell her. Tell Mam"; the core, the ledger, the tideline +3, and no noise');
    check(r.body && r.pit, 'her body to the slag-slope: it goes over into the old green water, and no bell saw it');
    check(r.asks && r.dark, 'the Factor\'s question: "Did you see anything?" "No." "No," the Factor agreed. "It was very dark."');

    // ---- by her name; a body left; dawn at Kaelen's hut
    r = await page.evaluate(() => {
      const out = {};
      T.reset(false, true); const e = T.toDoor();
      T.pick(/Read it its name/);
      out.named = /You still have to break her/.test(T.last().b) && e.stun >= 29;
      T.pick(/fist through the grille/); T.step(30);
      out.dead = e.dead && G.flags.p52_how === 'n';
      loadMap('clearing'); T.step(1);
      out.left = G.flags.p52_body === 2 && (AUDIT54.logged() & AUDIT54.BITS.body) !== 0 && G.journal.some((j) => /left the Legionnaire in the doorway/.test(j.text));
      // dawn: the next morning at Kaelen's hut
      window.__ev.length = 0;
      G.day = 2; G.tod = 6 / 24; loadMap('clearing', { x: TAMSIN52.HUT.x + 2, y: TAMSIN52.HUT.y, dir: Math.PI }); T.step(2);
      const d = T.last();
      out.dawn = !!d && /five paces from his door/.test(d.b) && /His voice/.test(d.b) && G.flags.p52_dawn === 1;
      T.reset(true, false); const e2 = T.toDoor(); T.pick(/by the bell/); T.step(30);
      G.day = 2; G.tod = 6 / 24; loadMap('clearing', { x: TAMSIN52.HUT.x + 2, y: TAMSIN52.HUT.y, dir: Math.PI }); T.step(2);
      out.yours = /Your voice/.test(T.last().b);
      T.reset(true, false); T.toDoor(); T.pick(/by the bell/); T.step(30); G.day = 4; G.tod = 12 / 24; T.step(1);
      out.missed = G.flags.p52_dawn === 9;
      return out;
    });
    check(r.named && r.dead, 'an archivist reads it its name: it stops, and you still have to break her');
    check(r.left, 'leave her in the doorway and the bells log it for the Factor\'s walk');
    check(r.dawn && r.yours && r.missed, 'at dawn at Kaelen\'s hut the clearing says "Tamsin Reed" back, in his voice or (glassed) in yours; miss the morning and it is gone');

    // ---- Whisper-Grove: Sable's Ledger, and the jugs on the Bell Yard
    r = await page.evaluate(() => {
      const out = {};
      T.reset(true, false); T.toDoor(); T.pick(/by the bell/); T.step(30);
      window.__ev.length = 0; talk({ id: 'sable_wg', kind: 'npc' });
      const s = T.last();
      out.sable = !!s && /Tamsin Reed\. Nineteen\. Dairymaid, of the Bell Yard/.test(s.b) && /will my mother be told\?/.test(s.b) && /I wrote that entry/.test(s.b);
      T.pick(/Give her the core/);
      out.ledger = G.flags.p52_ledger === 1 && !G.has('core') && G.journal.some((j) => /Tell Mam: Sable wrote/.test(j.text));
      talk({ id: 'p31_jugs', kind: 'npc' });
      out.jug = /the blue one, and the white one/.test(T.last().b) && T.last().c.length === 3;
      T.pick(/Say her daughter's name/);
      out.named = G.flags.p52_jug === 2 && /does not take it in again/.test(T.last().b) && G.journal.some((j) => /a name and a mother, not a tag/.test(j.text));
      loadMap('p31_bellyard'); G.state = 'play';
      const m = G.ents.find((x) => x.kind === 'npc' && x.id === 'p31_jugs'); talk(m);
      out.after = typeof DLG !== 'undefined' && DLG.log.some((l) => /\.\.\.Tamsin\.\.\. the blue one/.test(l.t)) && /blue one, and the white one/.test(NPCS.p31_jugs.greet.polite);
      try { document.getElementById('d-bye').click(); } catch (e) { /* none */ }
      return out;
    });
    check(r.sable && r.ledger, 'Sable does not need the Ledger: she wrote Tamsin\'s entry, "will my mother be told?"; the core goes to her');
    check(r.jug && r.named && r.after, 'the Hollow at the window on the Bell Yard: say her daughter\'s name, and she sets the blue jug out alone');

    // ---- French for every new string
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/p52-tamsin.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => TAMSIN52.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL TAMSIN52 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
