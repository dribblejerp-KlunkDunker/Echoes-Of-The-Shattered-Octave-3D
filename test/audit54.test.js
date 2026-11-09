// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/audit54.test.js
// The slate and the bells (js/audit54.js; ROADMAP R9 item 12) and Manifest (js/manifest53.js; R9 item 11): a bell in
// earshot before you talk, say it or write it, the Factor's morning walk (seen, or told), her prices, the second guard at
// Depot Three, the Rite's head start; then the Kestrel's hold: the tags, read you three, filed; and French for both.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };
const frCheck = async (page, file, mod, label) => {
  const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/' + file), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
  const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
  const texts = await page.evaluate((m) => window[m].TEXTS, mod);
  const noFr = texts.filter((t) => !pairs.get(t));
  check(!noFr.length && tsv.every((x) => x.length === 2), label + ': every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /audit54|manifest53/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof AUDIT54 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Slate Tester');
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
        reset() { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; window.__ev.length = 0; window.__msgs.length = 0; },
        step(n) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(0.05); } },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        bye() { try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play'; },
        kaelen() { return G.ents.find((e) => e.kind === 'npc' && e.id === 'kaelen'); },
        bell() {
          const c = Engine.cam; let at = null;
          for (const [dx, dy] of [[0, 2], [0, -2], [2, 0], [-2, 0], [2, 2], [-2, 2], [2, -2], [-2, -2], [0, 3], [3, 0]]) { const x = c.x + dx, y = c.y + dy; if (!G.map.get(Math.floor(x), Math.floor(y)) && los(c.x, c.y, x, y)) { at = [x, y]; break; } }
          const b = { kind: 'enemy', type: 'legionnaire', x: at[0], y: at[1], passive: true, name: 'Hal Ransome', transient: true }; G.map.entities.push(b); hydrate(b); return b;
        },
        nearKaelen() { loadMap('clearing'); const k = T.kaelen(); Engine.cam.x = k.x - 1.0; Engine.cam.y = k.y; },
      };
    });

    // ---- a bell in earshot: say it, or write it on the slate
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.day = 1; G.tod = 14 / 24; T.nearKaelen();
      talk(T.kaelen()); out.noBell = G.state === 'dialogue' && !window.__ev.length; T.bye();
      T.bell(); talk(T.kaelen());
      const ev = T.last();
      out.card = !!ev && ev.t === 'A bell in earshot' && /Hal Ransome stands \d paces off/.test(ev.b) && ev.c.map((c) => c.t).join('|') === 'Say it aloud|Write it on the slate|Not here';
      T.pick(/Say it aloud/);
      out.said = G.state === 'dialogue' && (AUDIT54.logged() & AUDIT54.BITS.kaelen) !== 0 && G.journal.some((j) => /The slate and the bells/.test(j.text)); T.bye();
      window.__ev.length = 0; talk(T.kaelen()); out.oncePerDay = G.state === 'dialogue' && !window.__ev.length; T.bye();
      // the next day, on the slate: nothing logged, ten minutes, the slate's words
      T.reset(); G.day = 1; G.tod = 14 / 24; T.nearKaelen(); T.bell(); const t0 = G.tod;
      talk(T.kaelen()); T.pick(/slate/);
      out.slate = G.state === 'dialogue' && AUDIT54.logged() === 0 && DLG.log[0] && /THEN WE WHISPER, AND WE WRITE/.test(DLG.log[0].t) && Math.abs((G.tod - t0) * 1440 - 10) < 0.5; T.bye();
      T.reset(); G.day = 1; G.tod = 14 / 24; T.nearKaelen(); T.bell(); talk(T.kaelen()); T.pick(/Not here/);
      out.notHere = G.state === 'play' && AUDIT54.logged() === 0;
      // after Part One the bells don't matter
      T.reset(); G.flags.escaped = true; G.day = 1; T.nearKaelen(); T.bell(); window.__ev.length = 0; talk(T.kaelen()); out.partOne = !window.__ev.length; T.bye();
      return out;
    });
    check(r.noBell, 'no bell near: you just talk');
    check(r.card && r.said && r.oncePerDay, 'a Legionnaire within seven paces: say it aloud, write it on the slate, or not here; said aloud, it is logged (once per person per day)');
    check(r.slate && r.notHere && r.partOne, 'on the slate: ten minutes, THEN WE WHISPER, AND WE WRITE, and nothing logged; "not here" leaves it; after Part One no bell asks');

    // ---- the morning walk, her prices, the second guard, the Rite's head start
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.day = 1; G.tod = 14 / 24;
      const item = NPCS.vosk.shop.find((e) => !e.price); const p0 = buyPrice(NPCS.vosk, item);
      AUDIT54.log('kaelen'); AUDIT54.log('body');
      G.tod = 6.5 / 24; loadMap('oakhaven'); T.step(2);
      out.notYet = !window.__ev.some((e) => e.t === 'The Factor\'s morning walk');
      G.day = 2; T.step(2);
      const w = T.last();
      out.walk = !!w && w.t === 'The Factor\'s morning walk' && /The coil was mentioned\. Twice/.test(w.b) && /bell broken/.test(w.b) && /A second Legionnaire stands at Depot Three/.test(w.b) && AUDIT54.pending() === 0;
      out.price = buyPrice(NPCS.vosk, item) > p0 && Math.abs(AUDIT54.priceMult() - 1.3) < 1e-9;
      out.rite = Math.abs(AUDIT54.ritePenalty() - 4.4) < 1e-9;
      loadMap('quarry'); out.guard = G.map.entities.some((e) => e._p54 === 'guard' && e.transient && e.kind === 'enemy' && e.def && e.name === 'Orrin Tey');
      G.flags.rite_started = true; loadMap('clearing'); loadMap('quarry'); out.guardGone = !G.map.entities.some((e) => e._p54 === 'guard');
      // not there for it: she tells you herself
      T.reset(); G.day = 1; AUDIT54.log('vane'); G.day = 2; G.tod = 7 / 24; loadMap('lyra_house'); T.step(2);
      out.away = !window.__ev.some((e) => e.t === 'The Factor\'s morning walk');
      talk({ id: 'vosk', kind: 'npc' });
      out.told = /before you have said anything/.test(T.last().b) && /how many people a ship that size could carry/.test(T.last().b) && AUDIT54.pending() === 0;
      return out;
    });
    check(r.notYet && r.walk, 'the morning after, at the walk: what the bells heard (the coil; the broken bell) and what it costs');
    check(r.price && r.rite, 'her company store goes up 15% for each thing she heard; the Rite\'s collar walk starts with her eye partly on you');
    check(r.guard && r.guardGone, 'a body or a fight at Depot Three puts a second Legionnaire there (transient) until the Rite');
    check(r.away && r.told, 'not there for the walk: the Factor tells you herself the next time you speak to her');

    // ---- Manifest: the Kestrel's hold, once Sable is aboard
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.flags.escaped = true; G.flags.part3 = true; loadMap(MANIFEST53.HOLD); out.notYet = !window.__ev.length;
      G.flags.sable_joined = true; loadMap(MANIFEST53.DECK); out.deck = window.__msgs.some((t) => /gone down into the hold with a lamp/.test(t));
      loadMap(MANIFEST53.HOLD);
      const a = T.last();
      out.tags = !!a && a.t === 'Manifest' && /One thousand three hundred and forty-two/.test(a.b) && /carrier OK-114 is reliable and does not ask questions/.test(a.b) && /Four hundred and thirty-two/.test(a.b);
      T.pick(/Stay with Vane/); out.three = /Read you three/.test(T.last().b) && /Somebody should be carrying them properly/.test(T.last().b);
      T.pick(/Stand with him/); out.corwin = /Corwin Aye/.test(T.last().b) && /has not leaked in nineteen years/.test(T.last().b);
      T.pick(/…/); out.mirren = /Mirren Salk/.test(T.last().b) && /eleven hundred other coats/.test(T.last().b);
      T.pick(/…/); out.annet = /Annet Sowerby/.test(T.last().b) && /would not let go of the hand/.test(T.last().b);
      T.pick(/…/);
      const z = T.last();
      out.filed = z.t === 'Filed' && /You are not lost\. You are <i>filed<\/i>/.test(z.b) && /Is that you, Mistress Dray\?/.test(z.b) && /It\\'s the clerk|It's the clerk/.test(z.b) && G.flags.p53 === 1 && G.journal.some((j) => /Manifest: in the Kestrel's hold/.test(j.text));
      window.__ev.length = 0; loadMap(MANIFEST53.HOLD); out.once = !window.__ev.length;
      T.reset(); G.flags.escaped = true; G.flags.part3 = true; G.flags.sable_joined = true; loadMap(MANIFEST53.HOLD); T.pick(/back up the ladder/);
      out.left = G.flags.p53 === 9 && G.mapId === MANIFEST53.DECK; window.__ev.length = 0; loadMap(MANIFEST53.HOLD); out.leftOnce = !window.__ev.length;
      return out;
    });
    check(r.notYet && r.deck && r.tags, 'Manifest: once Sable has joined, she is in the hold before you: four hundred and thirty-two; one thousand three hundred and forty-two; carrier OK-114');
    check(r.three && r.corwin && r.mirren && r.annet, 'read you three: Corwin Aye\'s barrel, Mirren Salk\'s coat, Annet Sowerby\'s hand');
    check(r.filed && r.once && r.left && r.leftOnce, '"You are not lost. You are filed." "Is that you, Mistress Dray?" "No, love. It\'s the clerk." Once; go back up the ladder and you miss it');

    await frCheck(page, 'p54-audit.tsv', 'AUDIT54', 'the audit');
    await frCheck(page, 'p53-manifest.tsv', 'MANIFEST53', 'Manifest');
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL AUDIT54 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
