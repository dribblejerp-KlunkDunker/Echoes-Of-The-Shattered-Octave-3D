// Phase 8 FRENCH: the story in French (js/story-i18n.js + locales/story/fr.json).
//   PREVIEW_URL=http://127.0.0.1:3813 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/story-i18n.test.js
// Uses a running server (the catalogue is fetched, so file:// cannot work). Screenshots go to
// STORY_I18N_SHOTS (default: the OS temp dir), never into the repo.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const lib = require('../tools/i18n/lib');
const { coverage } = require('../tools/i18n/coverage');

const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.STORY_I18N_SHOTS || path.join(os.tmpdir(), 'story-i18n-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const pass = (m) => console.log('PASS ' + m);

// the same boot as test/visual.test.js: title -> character creation -> intro skipped
async function boot(browser, viewport) {
  const page = await browser.newPage({ viewport, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Angle Tester');
  await page.locator('#c-next').click();
  await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click();
  await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else {
      const next = page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first();
      if (!(await next.count())) throw new Error('Unknown creation step: ' + await page.locator('#create-panel').innerText());
      await next.click();
    }
  }
  await page.locator('#c-go').click();
  await page.locator('#btn-intro-skip').click();
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    // ------------------------------------------------------------------ catalogue and coverage (no browser)
    const cov = coverage();
    assert(cov.percent >= 98, `coverage ${cov.percent.toFixed(2)}% (missing ${cov.missing})`);
    pass(`coverage ${cov.percent.toFixed(2)}%: ${cov.translated} translated, ${cov.kept} kept in English on purpose, ${cov.missing} missing`);

    const { page, errors } = await boot(browser, { width: 1280, height: 800 });
    const ev = (fn, arg) => page.evaluate(fn, arg);
    // leave every panel and overlay so the next check starts clean
    const reset = () => ev(() => { try { if (window.READING) READING.dismiss(); } catch (e) { /* none open */ } try { closeModal(); } catch (e) { /* none open */ } for (const s of ['#death', '#ending', '#event']) { try { hide(s); } catch (e) { /* ok */ } } G.dead = false; G.state = 'play'; });

    // the hash in the extractor and the one in the game must agree, or no id would ever match
    const sample = ['Dawnday', 'The Boar & Dulcimer', 'You pick up the {0}.', "Old Harrow, gate-warden", 'Whisper-Grove'];
    const inPage = await ev((xs) => xs.map(x => STORY_I18N.hash(STORY_I18N.norm(x))), sample);
    assert.deepEqual(inPage, sample.map(x => lib.hash(lib.norm(x))), 'tools/i18n/lib.js and js/story-i18n.js hash alike');
    pass('extractor and runtime hash agree');

    // ------------------------------------------------------------------ switching on
    assert.equal(await ev(() => STORY_I18N.locale), 'en', 'English by default');
    const loc = await ev(async () => ACCESS.setLocale('fr'));
    assert.equal(loc, 'fr');
    assert.equal(await ev(() => STORY_I18N.locale), 'fr', 'choosing Français in the Language row switches the story too');
    pass('Language: Français switches the story module through access.js');

    // ------------------------------------------------------------------ Harrow
    const harrow = await ev(async () => {
      NPCS.harrow.quest = () => null;                     // the plain greeting, not a quest opening (as voice-acting.test.js does)
      DLG.tone = 'normal';
      talk({ id: 'harrow', x: Engine.cam.x + 1, y: Engine.cam.y, kind: 'npc' });
      await new Promise(r => setTimeout(r, 120));
      const m = document.querySelector('#modal-panel');
      return { text: m.innerText, head: m.querySelector('h2').innerText, tones: [...m.querySelectorAll('.tone button')].map(b => b.textContent) };
    });
    assert(/La porte est fermée après le crépuscule/.test(harrow.text), 'Harrow greets in French: ' + harrow.text.slice(0, 200));
    assert(/vieux Harrow/.test(harrow.head + harrow.text), 'epithet translated: ' + harrow.head);
    assert.deepEqual(harrow.tones, ['Poli', 'Normal', 'Brusque'], 'the tone buttons: ' + harrow.tones);
    assert(!/Gate's shut/.test(harrow.text));
    await page.screenshot({ path: path.join(SHOTS, 'fr-dialogue-1280.png') });
    pass('Harrow greets in French, epithet and tone buttons translated');

    // ------------------------------------------------------------------ a message with a name in it
    await reset();
    const msgText = await ev(async () => { msg('Kaelen falls in behind you.', '', 2000); await new Promise(r => setTimeout(r, 80)); return document.querySelector('#msgs').innerText; });
    assert(/Kaelen se range derrière vous/.test(msgText), 'msg pattern with a name: ' + msgText);
    pass('msg pattern with a placeholder translated: ' + msgText.split('\n').pop());

    // ------------------------------------------------------------------ logbook entry
    const logbook = await ev(async () => { renderLog(); await new Promise(r => setTimeout(r, 100)); return document.querySelector('#modal-panel').innerText; });
    assert(/Je suis monté par la route de Greenroot/.test(logbook), 'the opening journal entry is French: ' + logbook.slice(0, 300));
    assert(/Journal de bord/.test(logbook));
    await page.screenshot({ path: path.join(SHOTS, 'fr-logbook-1280.png') });
    pass('journal entry in French');

    // ------------------------------------------------------------------ item description (inventory)
    await reset();
    const inv = await ev(async () => { renderInventory(); await new Promise(r => setTimeout(r, 100)); return document.querySelector('#modal-panel').innerText; });
    assert(/Un caillou à ricochets/.test(inv), 'an item description is French: ' + inv.slice(0, 300));
    assert(/Glaive court/.test(inv) && /allonge/.test(inv), 'weapon names and stat lines are French');
    assert(!/skipping|reach \d/.test(inv), 'no English left in the inventory');
    await page.screenshot({ path: path.join(SHOTS, 'fr-inventory-1280.png') });
    pass('item description and weapon stats in French');

    // ------------------------------------------------------------------ a book page (reading.js)
    await reset();
    const book = await ev(async () => { readLoreBook(0); await new Promise(r => setTimeout(r, 120)); const s = document.querySelector('.hd-sheet'); return { text: s.innerText, ui: [...document.querySelectorAll('.hd-bar button, .hd-foot button, .hd-sheet button')].map(b => b.textContent + '|' + (b.getAttribute('aria-label') || '')).join(' ; ') }; });
    assert(/Huit Ancres clouent le continent/.test(book.text), 'the book page is French: ' + book.text.slice(0, 200));
    assert(/Page 1 sur 2/.test(book.text), 'the page counter is French');
    await page.screenshot({ path: path.join(SHOTS, 'fr-reading-1280.png') });
    pass('reading.js book page in French');

    // ------------------------------------------------------------------ death and ending
    await reset();
    const death = await ev(async () => { die('heartglass'); await new Promise(r => setTimeout(r, 80)); return { t: document.querySelector('#death-title').textContent, x: document.querySelector('#death-text').textContent, btn: document.querySelector('#death button') && document.querySelector('#death button').textContent }; });
    assert.equal(death.t, 'Cœur de verre.');
    assert(/Le verre atteint votre cœur/.test(death.x), 'death text: ' + death.x.slice(0, 100));
    await page.screenshot({ path: path.join(SHOTS, 'fr-death-1280.png') });
    await reset();
    const end = await ev(async () => { G.flags.part3 = 1; ending(); await new Promise(r => setTimeout(r, 150)); return { t: document.querySelector('#ending-title').textContent, x: document.querySelector('#ending-text').innerText }; });
    assert.equal(end.t, 'Attrapez la corde');
    assert(/La Crécerelle|Le mât d’amarrage/.test(end.x), 'ending text: ' + end.x.slice(0, 150));
    await page.screenshot({ path: path.join(SHOTS, 'fr-ending-1280.png') });
    pass('death text and ending text in French');

    // ------------------------------------------------------------------ the data crawl: no English left in the story tables
    await reset();
    const crawl = await ev(() => {
      const miss = []; const seen = new Set();
      const names = ['ITEMS', 'WEAPONS', 'ARMOR', 'ENEMIES', 'NPCS', 'SONGS', 'CLASSES', 'CREATION_FACES', 'CREATION_LORE', 'BACKGROUNDS', 'BIOGRAPHY', 'TOPICS', 'RUMOURS', 'COMPANIONS', 'HELP_TEXT', 'LORE_BOOKS', 'ENCHANTMENTS', 'PERK_LIST', 'FACTIONS'];
      const walk = (v, d) => {
        if (d > 6 || v == null) return;
        if (typeof v === 'string') {
          if (v.length < 8 || !/\s/.test(v) || !/[A-Za-z]{3}/.test(v) || /^[a-z_0-9#.\-]+$/.test(v) || seen.has(v)) return;
          seen.add(v);
          const html = /<\w/.test(v);
          const bits = html ? (() => { const d = document.createElement('div'); d.innerHTML = v; const o = []; const w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (/[A-Za-z]{3}/.test(t)) o.push(t); } return o; })() : [v];
          for (const b of bits) if (b.length > 7 && /\s/.test(b) && STORY_I18N.translate(b) == null) miss.push(b.slice(0, 80));
        } else if (Array.isArray(v)) v.forEach(x => walk(x, d + 1));
        else if (typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], d + 1);
      };
      for (const n of names) { try { walk(eval(n), 0); } catch (e) { miss.push('ERR ' + n); } }
      return { n: seen.size, miss };
    });
    assert(crawl.n > 500, 'the crawl saw the tables (' + crawl.n + ')');
    assert.deepEqual(crawl.miss, [], 'story strings without a French entry: ' + JSON.stringify(crawl.miss.slice(0, 8)));
    pass(`data crawl: ${crawl.n} strings in the story tables all have French`);

    // ------------------------------------------------------------------ a hostile save: markup in text stays text
    const hostile = await ev(async () => {
      window.__pwn = 0;
      G.journal.unshift({ cat: 'main', text: '<img src="x" onerror="window.__pwn=1"><b id="pwn-b">Gras</b> <script>window.__pwn=2<\/script>', day: 1 });
      G.journal.unshift({ cat: 'side', text: 'The Pressman\'s Round: <svg onload="window.__pwn=3">', day: 1 });
      const old = G.player.name; G.player.name = '<img src="y" onerror="window.__pwn=4">';
      renderLog(); await new Promise(r => setTimeout(r, 150));
      const p = document.querySelector('#modal-panel');
      const out = { pwn: window.__pwn, imgs: p.querySelectorAll('img[src="x"], img[src="y"]').length, bold: !!document.getElementById('pwn-b'), svg: p.querySelectorAll('svg[onload]').length, text: p.innerText };
      G.player.name = old; G.journal.splice(0, 2);
      return out;
    });
    assert.equal(hostile.pwn, 0, 'no script from a save ran');
    assert.equal(hostile.imgs + hostile.svg, 0, 'no element was built from save text');
    assert(!hostile.bold, 'markup stayed text');
    // the logbook itself drops the angle brackets (cleanText); what is left must be characters, never elements
    assert(/onerror=/.test(hostile.text) && /Gras/.test(hostile.text), 'the hostile text is shown as characters: ' + hostile.text.slice(0, 200));
    await page.screenshot({ path: path.join(SHOTS, 'fr-hostile-1280.png') });
    pass('hostile save: markup in journal text shows as text in French');

    // ------------------------------------------------------------------ back to English
    await reset();
    await ev(async () => { renderLog(); });
    await ev(async () => { await ACCESS.setLocale('en'); });
    assert.equal(await ev(() => STORY_I18N.locale), 'en');
    const back = await ev(async () => {
      await new Promise(r => setTimeout(r, 120));
      const open = document.querySelector('#modal-panel').innerText;          // translated in place, must be restored
      try { closeModal(); } catch (e) { /* ok */ } G.state = 'play';
      NPCS.harrow.quest = () => null; DLG.tone = 'normal';
      talk({ id: 'harrow', x: Engine.cam.x + 1, y: Engine.cam.y, kind: 'npc' });
      await new Promise(r => setTimeout(r, 120));
      return { open, harrow: document.querySelector('#modal-panel').innerText, tones: [...document.querySelectorAll('.tone button')].map(b => b.textContent) };
    });
    assert(/I came up the Greenroot road/.test(back.open), 'an open panel is restored to English: ' + back.open.slice(0, 200));
    assert(/Gate's shut after dusk/.test(back.harrow), 'Harrow is English again: ' + back.harrow.slice(0, 200));
    assert.deepEqual(back.tones, ['Polite', 'Normal', 'Blunt']);
    assert(!/Journal de bord|crépuscule/.test(back.harrow));
    pass('switching back to English restores English (open panel and new dialogue)');

    // ------------------------------------------------------------------ two writers on one node must not hang the page
    const tug = await ev(async () => {
      await ACCESS.setLocale('fr');
      const probe = document.createElement('p'); probe.id = 'tug'; document.getElementById('game').appendChild(probe);
      probe.textContent = 'Gate\'s shut after dusk. Keep it low.';
      const EN = 'Gate\'s shut after dusk. Keep it low.';
      // a rival script that always puts the English back whenever it sees anything else
      let n = 0; const mo = new MutationObserver(() => { if (probe.firstChild.nodeValue !== EN && n++ < 400) probe.firstChild.nodeValue = EN; });
      mo.observe(probe, { childList: true, subtree: true, characterData: true });
      probe.firstChild.nodeValue = EN + ' ';
      await new Promise(r => setTimeout(r, 200)); mo.disconnect(); probe.remove();
      return n;
    });
    assert(tug < 20, 'another script rewriting a node does not start an endless loop (' + tug + ' rounds)');
    pass('tug-of-war guard: a node another script keeps rewriting is left alone after a few rounds');
    await ev(async () => { await ACCESS.setLocale('fr'); });

    // ------------------------------------------------------------------ layout: 1280x800 and the compact 640x400
    const fits = (label) => ev((lab) => {
      const p = document.querySelector('#modal-panel'); if (!p) return { label: lab, err: 'no panel' };
      const r = p.getBoundingClientRect();
      const wide = [...p.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > r.right + 1.5 && getComputedStyle(e).position !== 'fixed'; }).length;
      return { label: lab, hscroll: p.scrollWidth > p.clientWidth + 1, inside: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, wide, bodyH: document.documentElement.scrollWidth > innerWidth + 1 };
    }, label);
    const panels = [
      ['dialogue', async () => { NPCS.harrow.quest = () => null; talk({ id: 'harrow', x: Engine.cam.x + 1, y: Engine.cam.y, kind: 'npc' }); }],
      ['logbook', async () => { renderLog(); }],
      ['inventory', async () => { renderInventory(); }],
    ];
    for (const [w, h] of [[1280, 800], [640, 400]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(200);
      for (const [name, open] of panels) {
        await reset();
        await ev(open); await page.waitForTimeout(150);
        const f = await fits(name + ' ' + w + 'x' + h);
        assert(!f.err, f.label + ': ' + f.err);
        assert(!f.hscroll && !f.bodyH, f.label + ' has horizontal overflow');
        assert(f.inside, f.label + ' stays inside the window');
        assert.equal(f.wide, 0, f.label + ': ' + f.wide + ' elements stick out of the panel');
        if (w === 640) await page.screenshot({ path: path.join(SHOTS, 'fr-' + name + '-640x400.png') });
      }
      pass(`dialogue, logbook and inventory fit ${w}x${h} in French with no horizontal overflow`);
    }
    await reset();

    // ------------------------------------------------------------------ no English sentences left in the panels
    await page.setViewportSize({ width: 1280, height: 800 });
    const left = await ev(async () => {
      const out = [];
      for (const fn of [() => renderInventory(), () => renderLog(), () => renderCharacter(), () => renderSongs(), () => renderLedger(), () => renderMenu(), () => renderControls(), () => renderHelp(), () => renderCodexModal(), () => renderCrafting(), () => renderAccessibilityMenu(), () => renderRest(), () => travelOpen()]) {
        try { closeModal(); } catch (e) { /* ok */ } G.state = 'play'; try { fn(); } catch (e) { out.push('ERR ' + e.message); continue; }
        await new Promise(r => setTimeout(r, 60));
        for (const t of STORY_I18N.untranslated(document.querySelector('#modal-panel') || document.body)) out.push(t.slice(0, 80));
      }
      return [...new Set(out)];
    });
    assert.deepEqual(left, [], 'English sentences left in French panels: ' + JSON.stringify(left.slice(0, 6)));
    pass('crawl of 13 panels: no English sentence left');
    await reset();

    // ------------------------------------------------------------------ the HUD (canvas) and a compact screenshot of play
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, 'fr-play-1280.png') });

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    pass('no page errors');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e && e.stack || e); process.exit(1); });
