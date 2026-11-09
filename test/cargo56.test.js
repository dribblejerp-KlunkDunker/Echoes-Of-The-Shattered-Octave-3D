// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/cargo56.test.js
// Cargo night (js/cargo56.js; R9 item 14), Tobiah's arc (js/tobiah57.js; R9 item 18) and the eight men at the pumps
// (js/pumps58.js; R9 item 19): the clerk stalled or not, the boot, the count; the third crate, the slate, Annet; the long
// gun over the slag-slope; the signed book by calling and the Stage Nine kit; the voice in the archive and the grey spine;
// and French for all three.
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
    page.on('console', (m) => { if (m.type() === 'warning' && /cargo56|tobiah57|pumps58/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof CARGO56 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Cargo Tester');
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
        ladder() { loadMap('oakhaven'); G.state = 'play'; const e = G.ents.find((x) => x.use === 'crates' && x.sprite === 'ladder'); useDeco(e); return e; },
        bye() { try { document.getElementById('d-bye').click(); } catch (e) { /* none */ } G.state = 'play'; },
      };
    });

    // ---- Stall the Clerk
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.day = 6; G.tod = 14 / 24; T.ladder(); out.dayOld = /The crates in the hold/.test(T.last().t);
      T.reset(); G.day = 6; G.tod = 20 / 24; T.ladder();
      out.card = T.last().t === 'Driftday night, aboard' && /a count of twenty/.test(T.last().b);
      T.pick(/Go on/); out.round = /Mags's count: 0 of twenty/.test(T.last().b) && T.last().c.length === 3;
      T.pick(/The wind/); T.pick(/Port Cantabile/); T.pick(/drift-glass/);
      const b = T.last(); out.boot = b.t === 'By the third crate' && /The sail-locker door is shut/.test(b.b) && /child's boot/.test(b.b);
      T.pick(/Put your own boot over it/);
      const c = T.last();
      out.count = c.t === 'Twelve' && /They do carry on, don't they/.test(c.b) && /harvest-house at Whisper-Grove/.test(c.b) && G.flags.p56 === 1 && G.flags.p56_clerk === 1 && G.flags.p56_boot === 1;
      // twice wrong: Vane takes over; picking up the boot is noted
      T.reset(); G.day = 6; G.tod = 20 / 24; T.ladder(); T.pick(/Go on/);
      T.pick(/The crates, and what is in them/); T.pick(/The sail-locker in the bow/);
      out.vane = /Vane takes over/.test(T.last().b); T.pick(/Pick it up/);
      out.picked = G.flags.p56_clerk === 2 && G.flags.p56_boot === 2 && /"Yours\?"/.test(T.last().b);
      T.ladder(); out.once = !/Driftday night/.test(T.last().t);
      return out;
    });
    check(r.dayOld && r.card && r.round, 'by day the ladder is the old crates card; on Driftday night the clerk comes up, and Mags needs a count of twenty');
    check(r.boot && r.count, 'three good topics hold him; your boot over the child\'s; twelve, "They do carry on, don\'t they", the harvest-house at Whisper-Grove');
    check(r.vane && r.picked && r.once, 'twice wrong and Vane takes over; pick up the boot and the clerk notes it; it happens once');

    // ---- the third crate, Annet, the long gun
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.day = 7; G.tod = 2 / 24; const n0 = G.ledger.length; T.ladder();
      const a = T.last();
      out.crate = a.t === 'The third crate, at the dead hour' && /hello, hello, is anyone there/.test(a.b) && /WG-41,004/.test(a.b) && /does not laugh/.test(a.b) && G.flags.crates_heard && G.ledger.length === n0 + 3;
      T.pick(/Go on/); out.figures = /Six\. Seven if it's children/.test(T.last().b) && /eighteen, Captain/.test(T.last().b) && /so nobody hears the splash/.test(T.last().b);
      T.pick(/Go on/); T.pick(/Say it yourself/);
      out.annet = /"Annet," you say, to the wood\. "You're going home\."/.test(T.last().b) && G.flags.p56 === 2 && G.flags.p56_say === 2 && G.has(CARGO56.ITEM) && G.journal.some((j) => /WG-41,004/.test(j.text));
      // the long gun over the slag-slope at Depot Three
      loadMap('quarry'); G.state = 'play'; const slag = G.ents.find((e) => e._p52 === 'slag'); useDeco(slag);
      out.slagCard = T.last().t === 'The head of the slag-slope'; T.pick(/Send them over/);
      out.sunk = G.flags.p56_gun === 2 && !G.has(CARGO56.ITEM) && G.journal.some((j) => /long gun over the slag-slope/.test(j.text));
      // missing the night: the old card, and the flag
      T.reset(); G.day = 8; G.tod = 10 / 24; T.step(1); out.missed = CARGO56.stage() === 9;
      return out;
    });
    check(r.crate && r.figures, 'at the dead hour: Pim at the third crate, WG-41,004, Vane does not laugh; the slate says six, then eighteen with the long gun over');
    check(r.annet && r.sunk, '"Annet. You\'re going home." (you, or Vane); the long gun goes over the slag-slope at Depot Three, in the dark');
    check(r.missed, 'miss both nights and only lines change');

    // ---- Tobiah: the book by calling, and the kit
    r = await page.evaluate(() => {
      const out = {};
      const tob = () => { loadMap('quarry'); G.state = 'play'; return G.ents.find((e) => e.kind === 'npc' && e.id === 'tobiah'); };
      T.reset(); G.player.cls = Object.assign({}, G.player.cls, { id: 'blade' }); talk(tob());
      out.blade = /ALWAYS BENEATH/.test(T.last().b) && /Did you know him\? At the Conservatory\?/.test(T.last().b);
      T.pick(/Sign it anyway/); out.signed = G.flags.p57_book === 2; T.pick(/Leave it/); out.talked = G.state === 'dialogue'; T.bye();
      window.__ev.length = 0; talk(tob()); out.once = !window.__ev.length; T.bye();
      T.reset(); G.player.cls = Object.assign({}, G.player.cls, { id: 'archivist' }); talk(tob());
      out.arch = /Is it true they keep everything\?/.test(T.last().b); T.pick(/Not everything/); out.margins = /Nobody files a margin/.test(T.last().b) && G.flags.p57_book === 5; T.pick(/Leave it/); T.bye();
      // the kit, once the Church has come
      G.flags.church_come = true; talk(tob());
      out.kit = T.last().t === 'The Stage Nine kit' && /curved like a new moon/.test(T.last().b) && /Do you think she knows yet, sir\?/.test(T.last().b);
      T.pick(/She knows/); out.knows = G.flags.p57_kit === 1;
      G.flags.rite_started = false; window.__ev.length = 0; talk(tob()); out.kitOnce = !window.__ev.some((e) => e.t === 'The Stage Nine kit'); T.bye();
      return out;
    });
    check(r.blade && r.signed && r.talked && r.once, 'a Blade: Tobiah asks you to sign K. Vance\'s book, then sees it is the wrong man ("At the Conservatory?"); then he talks as before');
    check(r.arch && r.margins, 'an archivist: "Is it true they keep everything?" "Not everything." "Nobody files a margin."');
    check(r.kit && r.knows && r.kitOnce, 'after the Church comes: the Stage Nine kit, the needle curved like a new moon, "Do you think she knows yet, sir?"');

    // ---- the eight men at the pumps
    r = await page.evaluate(() => {
      const out = {};
      T.reset(); G.flags.part3 = true; G.flags.r43_named = ['Ott', 'Vey']; G.player.glassed = true;
      loadMap('malting'); G.state = 'play';
      const box = G.ents.find((e) => e._p58 === 'box'); out.box = !!box && box.transient;
      useDeco(box); out.notYet = /grey spine/.test(T.last().b) && PUMPS58.stage() === 0;
      Engine.cam.x = 15.5; Engine.cam.y = 16.6; T.step(1);
      out.voice = PUMPS58.stage() === 1 && /your arm goes cold/.test(T.last().b) && /third shelf, grey spine/.test(T.last().b) && /I keep a list too/.test(T.last().b);
      useDeco(box);
      out.page = /Edders\. Ruhl\. Caine\. Ott\. Sennet\. Vey\. Marrow\. Hale, B\. \(no relation\)/.test(T.last().b) && /Beside Ott, Vey there is a pencil tick/.test(T.last().b);
      const n0 = G.ledger.length; T.pick(/Tear the page out/);
      out.torn = PUMPS58.stage() === 2 && G.ledger.length === n0 + 8 && /I wrote them down/.test(T.last().b) && !G.ents.some((e) => e._p58 === 'box');
      T.reset(); G.flags.part3 = true; G.player.glassed = false; loadMap('malting'); G.state = 'play'; Engine.cam.x = 15.5; Engine.cam.y = 16.6; T.step(1);
      out.kaelen = /Kaelen stops with his glass hand flat on the wall/.test(T.last().b);
      return out;
    });
    check(r.box && r.notYet && r.voice, 'the Malting\'s archive: the Arbiter speaks through the glass, "third shelf, grey spine. I keep a list too."');
    check(r.page && r.torn && r.kaelen, 'the grey spine: eight names, ticks by the ones you said at the pumps; tear the page out and all eight go in the ledger (through Kaelen if you are not glassed)');

    await frCheck(page, 'p56-cargo.tsv', 'CARGO56', 'Cargo night');
    await frCheck(page, 'p57-tobiah.tsv', 'TOBIAH57', 'Tobiah');
    await frCheck(page, 'p58-pumps.tsv', 'PUMPS58', 'the pumps');
    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL CARGO56 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
