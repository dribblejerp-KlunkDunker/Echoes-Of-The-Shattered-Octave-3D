// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r5conservatory59.test.js
// The Reedside Conservatory and reed orchard (js/conservatory59.js; ROADMAP R5 #7): the door from the Reading Room, the
// reed-hall (the slate board, the reed-rack, the box of slates, Ilse's desk before and after the Church comes), the
// youngest student's tending note, the orchard (the hollow, the tally-board, the heaved flagstone that does not open),
// shut after the Greening, and French.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /conservatory59/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof CONSERVATORY59 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Reed Tester');
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
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        use(u) { const e = G.ents.find((x) => x.use === u); useDeco(e); return T.last(); },
        through(x, y) { const c = G.map.get(x, y); if (!c || !c.portal) return null; loadMap(c.portal.map, c.portal); G.state = 'play'; return G.mapId; },
      };
    });

    // ---- the doors: Reading Room -> reed-hall -> orchard, and back
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); loadMap('lib_conservatory');
      const d = G.map.get(12, 7); out.door = !!d && d.portal && d.portal.map === 'p59_hall';
      out.hall = T.through(12, 7) === 'p59_hall' && window.__msgs.some((t) => /high dark beams/.test(t));
      out.toOrch = T.through(21, 6) === 'p59_orchard' && window.__msgs.some((t) => /whistling under their breath/.test(t));
      out.back = T.through(0, 10) === 'p59_hall' && T.through(0, 6) === 'lib_conservatory';
      const keep = ['p59_hall', 'p59_orchard'].every((id) => !G.maps[id].entities.some((e) => e.transient));
      out.base = keep && G.maps.p59_hall.baseCount === G.maps.p59_hall.entities.length;
      return out;
    });
    check(r.door && r.hall, 'a door in the Reading Room\'s east wall into the reed-hall (high dark beams, a fire of wind-reed)');
    check(r.toOrch && r.back && r.base, 'on through the reed-hall to the orchard and back; both maps are part of the base build');

    // ---- the reed-hall
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); loadMap('p59_hall');
      out.slate = /A Cantor's instrument is the breath\. The voice is only the most common way of spending it\./.test(T.use('p59_slate').b) && G.journal.some((j) => /The Reedside Conservatory: forty students/.test(j.text));
      out.rack = /four hundred pegs/.test(T.use('p59_rack').b) && /will not discuss it/.test(T.last().b);
      out.slates = /L\. Ashgrove\. The tending note\./.test(T.use('p59_slates').b);
      out.desk = /a jar of chalk/.test(T.use('p59_desk').b) && !/Lyra,/.test(T.last().b);
      G.flags.church_come = true; out.letter = /The first word on the top page is <i>Lyra,<\/i>/.test(T.use('p59_desk').b);
      out.benches = G.map.entities.filter((e) => e.sprite === 'p9p_pew').length >= 10 && G.map.entities.every((e) => !e.sprite || Engine.sprites[e.sprite]);
      return out;
    });
    check(r.slate && r.rack && r.slates, 'the slate board (Ilse\'s line of 408), the reed-rack of four hundred pegs and forty reeds, L. Ashgrove\'s old slate');
    check(r.desk && r.letter, 'Ilse\'s desk: bare; after the Church comes, three pages and the first word "Lyra," and the rest face down');
    check(r.benches, 'every sprite in the hall exists (the pews are pews)');

    // ---- the youngest student
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); loadMap('p59_hall');
      out.card = /cannot find the middle of the tending note/.test(T.use('p59_youngest').b) && T.last().c.length === 2;
      out.miss = CONSERVATORY59.finishLesson(0.2) === false && /It took Cantor Ashgrove till she was nine/.test(T.last().b) && !G.flags.p59_lesson;
      out.found = CONSERVATORY59.finishLesson(0.8) === true && G.flags.p59_lesson === 1 && /small and steady/.test(T.last().b) && G.journal.some((j) => /We held it together until she did/.test(j.text));
      out.after = /small and steady/.test(T.use('p59_youngest').b) && T.last().c.length === 1;
      return out;
    });
    check(r.card && r.miss && r.found && r.after, 'the youngest student and the tending note: held together, she finds the middle (and if not, it took Cantor Ashgrove till nine)');

    // ---- the orchard
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); loadMap('p59_orchard');
      out.reeds = G.map.entities.filter((e) => e.sprite === 'p59_reed').length >= 40;
      const h = T.use('p59_hollow'); out.hollow = /every Cantor in Reedside comes and hums into it/.test(h.b);
      T.pick(/Hum into the hollow/); out.hum = /does not come back/.test(T.last().b) && G.flags.p59_hum === 1 && G.journal.some((j) => /hummed into the hollow of the oldest tree/.test(j.text));
      const tally = G.map.entities.find((e) => e.label === CONSERVATORY59.TX.tally); useDeco(tally); out.tally = /scored in fives/.test(T.last().b);
      const flag = G.map.entities.find((e) => e.label === CONSERVATORY59.TX.flag); useDeco(flag);
      out.sealed = /rings very faintly/.test(T.last().b) && /It does not move\./.test(T.last().b) && T.last().c.length === 1 && !G.map.entities.some((e) => /slab|stair/.test(e.sprite || ''));
      return out;
    });
    check(r.reeds && r.hollow && r.hum, 'the reed orchard: rows of wind-reed; hum into the oldest tree\'s hollow and the note goes down and does not come back');
    check(r.tally && r.sealed, 'the tally-board of nights; the heaved flagstone where the Hedge meets the wall rings faintly and does not move (the old stair stays sealed)');

    // ---- shut after the Greening
    r = await page.evaluate(() => {
      T.reset(); G.flags.greening = true; loadMap('lib_conservatory');
      const d = G.map.get(12, 7); return !!d && !d.portal && /door into the rest of the Conservatory is shut/.test(d.lockMsg || '');
    });
    check(r, 'after the Greening the door into the rest of the Conservatory is shut');

    // ---- French for every new string
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/p59-conservatory.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => CONSERVATORY59.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL CONSERVATORY59 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
