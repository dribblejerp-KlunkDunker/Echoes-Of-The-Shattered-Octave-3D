// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/ash50.test.js
// Ash in the Hold, played (js/ash50.js; Book One ch. 13; ROADMAP R9 item 8): the Part Two ending's button, sleeping
// through it, the night's beats, the fourth hour, the seams, first light both ways, the calling-song, the beam, the
// shortened Part Three card, the pale plank, a save aboard, and French. Set SHOT_DIR to also write screenshots.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SHOTS = process.env.SHOT_DIR || '';

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && /ash50/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof ASH50 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Hold Tester');
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
      window.__holds = []; REEDS.holdPitch = (o) => { window.__holds.push(o); return Promise.resolve({ score: 1, held: 1, aborted: false }); };
      window.__base = JSON.parse(JSON.stringify(snapshotGame()));
      window.T = {
        reset(extra) { restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; Object.assign(G.flags, { escaped: true }, extra || {}); window.__ev.length = 0; window.__msgs.length = 0; },
        click() { document.getElementById('btn-part3').onclick(); },
        heard(re) { return window.__msgs.some((t) => re.test(t)); },
        last() { return window.__ev[window.__ev.length - 1] || null; },
        pick(re) { const ev = T.last(); const c = ev && ev.c.find((o) => re.test(o.t)); if (c && c.f) c.f(); return !!c; },
        ent(k) { return G.map.entities.find((e) => e._p50 === k); },
        use(u) { useDeco(typeof u === 'string' ? G.map.entities.find((e) => e.use === u) : u); return T.last(); },
        step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; G.keys = {}; update(dt || 0.033); } },
      };
    });
    const tick = () => page.waitForTimeout(40);
    const shot = async (name, prep) => {
      if (!SHOTS) return;
      if (prep) await page.evaluate(prep);
      await page.evaluate(() => { document.getElementById('msgs').innerHTML = ''; });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SHOTS, name + '.png') });
    };

    // ---- the button; sleeping through it keeps the old card
    let r = await page.evaluate(() => {
      const out = {};
      T.reset(); T.click();
      out.offer = G.mapId === 'p50_deck' && T.last().t === 'Ash in the Hold' && T.last().c.length === 2 && Math.abs(G.tod * 24 - 22) < 0.1;
      T.pick(/Sleep through it/);
      out.slept = ASH50.stage() === 8 && G.mapId === 'whispergrove' && G.flags.part3 && /YOU SAID DO IT/.test(T.last().b) && /At the fourth hour the foredeck goes green/.test(T.last().b);
      out.direct = (() => { T.reset(); startPart3(); return G.mapId === 'whispergrove' && /YOU SAID DO IT/.test(T.last().b); })();
      return out;
    });
    check(r.offer, 'the Part Two ending\'s button now offers the night aboard, at ten at night, or sleeping through it');
    check(r.slept && r.direct, 'sleep through it (or startPart3 directly) and Part Three begins with the old card, unchanged');

    // ---- the night
    r = await page.evaluate(() => {
      const out = {};
      T.reset({ vane_told: true }); T.click(); T.pick(/Stay with them/);
      out.stage = ASH50.stage() === 1 && !solidAt(Engine.cam.x, Engine.cam.y);
      out.cast = ['vane', 'lyra', 'kaelen', 'bettany', 'hurt0', 'hurt3', 'lissa', 'hetty', 'kid0', 'nell', 'pim', 'mags', 'pennick', 'tobiah'].every((k) => !!T.ent(k)) && !T.ent('hob');
      out.transient = G.map.entities.filter((e) => e._p50).every((e) => e.transient);
      // the hospital
      let ev = T.use(T.ent('hurt0')); out.noCup = /water cask/.test(ev.b) && ev.c.length === 1;
      T.use('p50_cask'); T.pick(/Fill the cup/); ev = T.use(T.ent('hurt0')); T.pick(/Give them water/);
      out.water = (G.flags.p50_w & 1) === 1 && !G.flags.p50_cup && T.heard(/drink it all/);
      ev = T.use(T.ent('hurt0')); out.once = /Tended/.test(ev.b);
      G.give('tonic'); ev = T.use(T.ent('hurt1')); T.pick(/tonic/); out.tonic = (G.flags.p50_w & 2) === 2 && !G.has('tonic');
      G.player.songs = (G.player.songs || []).concat(['tending']); G.player.voice = G.player.voiceMax;
      const v0 = G.player.voice; T.use(T.ent('hurt2')); T.pick(/Hum the tending note/); out.hum = (G.flags.p50_w & 4) === 4 && G.player.voice === v0 - 8;
      ev = T.use(T.ent('lissa')); out.lissa = /has not spoken since/.test(ev.b);
      ev = T.use(T.ent('bettany')); out.bettany = /Not for days/.test(ev.b);
      ev = T.use(T.ent('hetty')); out.hetty = /Seven\. Eight\. Nine\./.test(ev.b) && /not about safety/.test(ev.b);
      T.use(T.ent('hetty')); out.hettyAgain = T.heard(/"Nine," Hetty says/);
      // Lyra and the slate
      ev = T.use(T.ent('lyra')); out.lyra1 = /Bettany says days/.test(ev.b) && ev.c.length === 1;
      ev = T.use(T.ent('lyra')); T.pick(/slate/); ev = T.last();
      out.slate = /YOU SAID DO IT/.test(ev.b) && /"Yes," says Kaelen/.test(ev.b) && ev.c.length === 2;
      T.pick(/Say something/); out.nothingHelps = T.heard(/it is not the thing/);
      // the hold
      T.use('p50_down'); out.hold = G.mapId === 'p50_hold' && !solidAt(Engine.cam.x, Engine.cam.y);
      ev = T.use('p50_beam'); out.bare = /Bare oak/.test(ev.b);
      ev = T.use('p50_crate'); T.pick(/Sit with Kaelen/); ev = T.last();
      out.root = /still holding/.test(ev.b) && /Somebody has to hold it/.test(ev.b) && /Thirteen hundred/.test(ev.b) && /That's why I said it/.test(ev.b);
      return out;
    });
    check(r.stage && r.cast && r.transient, 'twenty-one aboard: the hospital, Hetty and the children, Nell and Pim, Lyra at the stern; all staged, nothing saved');
    check(r.noCup && r.water && r.once && r.tonic && r.hum && r.lissa && r.bettany, 'the field hospital: water from the cask, a tonic, or the tending note, once each; Lissa has not spoken');
    check(r.hetty && r.hettyAgain, 'Hetty counts the nine children aloud, and then again from one');
    check(r.lyra1 && r.slate && r.nothingHelps, 'Lyra at the stern; the second time, the slate: YOU SAID DO IT, and nothing you say helps');
    check(r.hold && r.bare && r.root, 'in the hold, the Root through the glass still holding; Vane\'s confession; "That\'s why I said it"');
    await shot('p50-deck', () => { loadMap('p50_deck', { x: ASH50.OX + 12.6, y: ASH50.OY + 5.4, dir: -2.2 }); G.state = 'play'; ASH50.restage(); T.step(1); });

    // ---- the fourth hour
    r = await page.evaluate(() => {
      const out = {}; const d0 = G.day;
      T.pick(/Wait/);
      out.fourth = ASH50.stage() === 2 && G.mapId === 'p50_deck' && G.day === d0 + 1 && Math.abs(G.tod * 24 - 4) < 0.1 && /sorry about your ship, Captain/.test(T.last().b) && !!T.ent('hob') && !!T.ent('roots');
      T.pick(/Go to him/); const ev = T.last();
      out.drops = /nothing comes out of it/.test(ev.b) && ev.c.some((c) => /Hold his shoulders/.test(c.t)) && ev.c.some((c) => /Hum the tending note with Bettany/.test(c.t));
      window.__drops = ev;
      return out;
    });
    check(r.fourth, 'at the fourth hour Hob Wendle has rooted into the deck: "I\'m sorry about your ship, Captain"');
    check(r.drops, 'Lyra cannot make the tending note; hold his shoulders, or hum it with Bettany if you have it');
    await shot('p50-hob', () => { loadMap('p50_deck', { x: ASH50.OX + 20.6, y: ASH50.OY + 4.6, dir: 0.05 }); G.state = 'play'; ASH50.restage(); T.step(1); });
    await page.evaluate(() => { const c = window.__drops.c.find((x) => /Hum the tending/.test(x.t)); c.f(); }); await tick();
    r = await page.evaluate(() => {
      const out = {}, ev = T.last();
      out.hum = window.__holds.some((h) => h.curve[1][1] === 174) && /very nearly one note/.test(ev.b) && /over the side together into the dark/.test(ev.b) && /Vane says the words/.test(ev.b);
      out.ledger = G.ledger.filter((l) => l.name === 'Hob Wendle').length === 1 && G.journal.some((j) => /Hob Wendle rooted into the Kestrel's deck/.test(j.text));
      T.pick(/check the seams/);
      out.seams = ASH50.stage() === 3 && G.map.entities.filter((e) => e.use === 'p50_seam').length === 5 && !T.ent('hob');
      for (const e of G.map.entities.filter((x) => x.use === 'p50_seam').slice(0, 4)) useDeco(e);
      out.found = G.flags.p50_sm === 15 && G.map.entities.filter((e) => e.use === 'p50_seam').length === 1 && T.heard(/Pennick takes it from you/);
      for (let i = 0; i < 4000 && ASH50.stage() === 3; i++) { G.state = 'play'; update(0.05); }
      out.dawn = ASH50.stage() === 4 && G.flags.p50_miss === 1 && T.heard(/He has not\. You do not tell him/) && /Firebreaks/.test(T.last().b) && /I saw what you put in the port/.test(T.last().b);
      return out;
    });
    check(r.hum && r.ledger, 'Bettany hums the tending note and you under her; they put him over the side; Hob goes in the ledger once');
    check(r.seams && r.found, 'the seams: five showing green, prised up one by one with Pennick');
    check(r.dawn, 'first light comes whether or not you find them all (one missed); the firebreak ring; Tobiah: "I saw what you put in the port"');

    // ---- first light, the calling-song, the beam, the Part Three card
    r = await page.evaluate(() => {
      const out = {};
      const had = G.has('charts');
      T.pick(/Tell him why/); let ev = T.last();
      out.told = G.flags.p50_tob === 1 && /beautiful Sequence/.test(ev.b) && /absorbed by the source/.test(ev.b) && (had || (G.has('charts') && /Take them/.test(ev.b)));
      T.pick(/Go to the stern/); ev = T.last();
      out.song = /In Lyra's voice/.test(ev.b) && /hand on the axe/.test(ev.b) && ev.c.length === 1;
      T.pick(/Stand beside her/); out.rhyme = ASH50.stage() === 5 && T.heard(/it can find you anywhere/);
      G.ledger.push({ name: 'Annet Sowerby', where: 'test', day: G.day }, { name: 'Davin Hale', where: 'test', day: G.day });
      loadMap('p50_hold'); G.state = 'play'; ASH50.restage();
      ev = T.use('p50_beam');
      out.beam = ASH50.stage() === 6 && /3½/.test(ev.b) && /Davin Hale/.test(ev.b) && /Hob Wendle/.test(ev.b) && /FIND THEM/.test(ev.b) && /was the Catalogue/.test(ev.b) && ev.b.indexOf('Davin Hale') < ev.b.indexOf('Hob Wendle') && !/Annet Sowerby/.test(ev.b);
      out.written = G.map.entities.find((e) => e.use === 'p50_beam').sprite === 'p50_beam_w';
      T.pick(/rest of the names/); ev = T.last(); out.added = /Annet Sowerby/.test(ev.b) && G.flags.p50_names === 1;
      T.pick(/fly on/);
      ev = T.last();
      out.p3 = ASH50.stage() === 9 && G.mapId === 'whispergrove' && G.flags.part3 && !/YOU SAID DO IT/.test(ev.b) && !/foredeck goes green/.test(ev.b) && /list of names in charcoal/.test(ev.b) && /Spectral Woods/.test(ev.b);
      out.hob1 = G.ledger.filter((l) => l.name === 'Hob Wendle').length === 1;
      out.again = (() => { T.click(); return G.mapId === 'whispergrove'; })();
      loadMap('p16k_kestrel_below'); G.state = 'play'; out.patch = !!T.ent('patch') && /paler than the rest/.test(T.ent('patch').label);
      return out;
    });
    check(r.told && r.song && r.rhyme, 'tell him why: "It was a beautiful Sequence, sir" (and his charts, if you had none); the calling-song in Lyra\'s whole voice; Mags reaches for the axe');
    check(r.beam && r.written && r.added, 'the beam: 3½ and the names in the book\'s order, the pumps; you add the rest of yours');
    check(r.p3 && r.hob1 && r.again, 'then Part Three begins, its card no longer telling the night again; Hob is in the ledger once');
    check(r.patch, 'a missed seam leaves a pale new plank in the Kestrel\'s hold in Part Three');

    // ---- silence, no vane_told, the coat, and a save aboard
    r = await page.evaluate(() => {
      const out = {};
      T.reset({ p46_coat: 2 }); T.click(); T.pick(/Stay/);
      T.use('p50_down'); T.use('p50_crate'); T.pick(/Sit with Kaelen/);
      out.ladder = /will not come down into his own hold/.test(T.last().b) && !/Thirteen hundred/.test(T.last().b);
      const snap = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap); G.state = 'play';
      out.saved = G.mapId === 'p50_hold' && ASH50.stage() === 1 && !!T.ent('kaelen');
      ASH50.fourthHour(); T.pick(/Go to him/); T.pick(/Hold his shoulders/);
      out.shoulders = /You hold his shoulders/.test(T.last().b); T.pick(/seams/);
      const snap2 = JSON.parse(JSON.stringify(snapshotGame())); restoreGame(snap2); G.state = 'play';
      out.saved2 = G.mapId === 'p50_deck' && ASH50.stage() === 3 && G.map.entities.filter((e) => e.use === 'p50_seam').length === 5;
      for (const e of G.map.entities.filter((x) => x.use === 'p50_seam')) useDeco(e);
      out.all = ASH50.stage() === 4 && G.flags.p50_miss === 0 && T.heard(/does not find any more/);
      T.pick(/Say nothing/); out.silent = G.flags.p50_tob === 2 && /work it out/.test(T.last().b);
      T.pick(/stern/); T.pick(/Stand beside/); loadMap('p50_hold'); G.state = 'play';
      const ev = T.use('p50_beam'); out.coat = /good wool coat from the step/.test(ev.b);
      T.pick(/fly on/); loadMap('p16k_kestrel_below'); G.state = 'play'; out.noPatch = !T.ent('patch');
      return out;
    });
    check(r.ladder, 'if Vane never heard the crates, he will not come down into his own hold');
    check(r.saved && r.saved2, 'a save in the hold, or during the seams, loads back into the night');
    check(r.shoulders && r.all && r.silent, 'hold his shoulders; find every seam; or say nothing to Tobiah, who will work it out');
    check(r.coat && r.noPatch, 'if you left his coat on the hut\'s step, Kaelen is wearing it at the beam; no seam missed, no pale plank');

    // ---- the code and French
    const grove = src('js/grove.js');
    check(/ASH50\.played\(\)/.test(grove) && /if \(played\) L\.push\(ASH50\.TX\.part3\)/.test(grove), 'js/grove.js asks ASH50 whether the night was played');
    const tsv = src('tools/i18n/p50-ash.tsv').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const texts = await page.evaluate(() => ASH50.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0].slice(0, 60) : '') + ')');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL ASH50 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
