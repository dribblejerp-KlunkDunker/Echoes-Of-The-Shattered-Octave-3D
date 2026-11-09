// PREVIEW_URL=http://127.0.0.1:3405 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/access.test.js
// Phase 7 ACCESS: the Accessibility block (text size, reduce motion, no flashes, high contrast, captions),
// persistence, the message catalog (fallback, hostile values, pseudo-locale fit).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';

async function newGame(page) {
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Access Tester');
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
}
async function open(browser, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w || 1280, height: h || 800 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const logs = []; page.on('console', m => logs.push(m.text()));
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof ACCESS !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  return { ctx, page, errors, logs };
}
const ok = (c, m) => { assert.ok(c, m); console.log('PASS ' + m); };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    // ---------------------------------------------------------------- catalog files (no browser needed)
    const root = path.join(__dirname, '..', 'locales');
    const { page, errors, logs, ctx } = await open(browser);
    const mem = await page.evaluate(() => ({ en: ACCESS.EN, xa: ACCESS.pseudoCatalog(), keys: Object.keys(ACCESS.EN) }));
    const file = n => JSON.parse(fs.readFileSync(path.join(root, n + '.json'), 'utf8'));
    assert.deepEqual(file('en').messages, mem.en, 'locales/en.json equals the embedded English catalog');
    console.log('PASS locales/en.json equals the embedded English catalog (' + mem.keys.length + ' keys)');
    assert.deepEqual(file('en-XA').messages, mem.xa, 'locales/en-XA.json is the generated pseudo-locale');
    for (const k of mem.keys) assert.ok(mem.xa[k].length >= Math.ceil(mem.en[k].length * 1.4), 'pseudo expands ' + k);
    assert.ok(Object.values(mem.xa).every(v => /[^\x00-\x7f]/.test(v)), 'pseudo strings are accented');
    console.log('PASS en-XA matches the generator; every string is accented and at least 40% longer');
    const fr = file('fr').messages;
    for (const k of Object.keys(fr)) {
      assert.ok(k in mem.en, 'fr key exists in English: ' + k);
      const ph = s => (s.match(/\{[a-z0-9_]+\}/gi) || []).sort().join();
      assert.equal(ph(fr[k]), ph(mem.en[k]), 'fr keeps the placeholders of ' + k);
    }
    assert.ok(Object.keys(fr).length > 20 && Object.keys(fr).length <= mem.keys.length, 'fr is a real catalog (Phase 8 completed it: every key)');
    const seen = new Set(); for (const v of Object.values(mem.en)) { assert.ok(!seen.has(v), 'English value is unique: ' + v); seen.add(v); }
    console.log('PASS fr is a placeholder-safe catalog; English values are unique');

    // ---------------------------------------------------------------- defaults = the original game
    const d0 = await page.evaluate(() => ({ cls: document.documentElement.className, ts: ACCESS.settings.ts, hc: ACCESS.settings.hc, cap: ACCESS.settings.cap, loc: ACCESS.locale, rm: GFX.reduceMotion, nf: GFX.noFlash, tsStyle: !!document.getElementById('access-ts-style') && document.getElementById('access-ts-style').textContent.length }));
    ok(d0.ts === 0 && !d0.hc && !d0.cap && d0.loc === 'en' && !/ac-ts|ac-hc/.test(d0.cls), 'defaults: Normal text, no contrast, no captions, English');
    await newGame(page);

    // ---------------------------------------------------------------- the block in Options
    await page.evaluate(() => { G.state = 'panel'; renderMenu(); });
    await page.locator('#mn-gfx').click();
    const ids = await page.evaluate(() => ['ac-head', 'ac-ts-0', 'ac-ts-1', 'ac-ts-2', 'feel-reduce', 'feel-noflash', 'ac-hc', 'ac-cap', 'ac-loc-en', 'ac-loc-fr', 'ac-loc-en-XA'].map(i => !!document.getElementById(i)));
    ok(ids.every(Boolean), 'Options -> Graphics & access has the Accessibility block (text size, motion, flashes, contrast, captions, language)');
    ok(await page.evaluate(() => { const g = document.querySelector('#modal-panel .ctl-grid'); const kids = [...g.children]; const h = kids.indexOf(document.getElementById('ac-head')); return kids.indexOf(document.getElementById('feel-reduce')) > h && kids.indexOf(document.getElementById('feel-noflash')) > h && document.querySelectorAll('#feel-reduce').length === 1; }), 'fp-feel Reduce motion / No flashes live inside the block (moved, not duplicated)');

    // text size
    const fsz = async () => page.evaluate(() => ({ panel: parseFloat(getComputedStyle(document.querySelector('#modal-panel')).fontSize), h2: parseFloat(getComputedStyle(document.querySelector('#modal-panel h2')).fontSize), btn: parseFloat(getComputedStyle(document.querySelector('#ac-hc')).fontSize), small: parseFloat(getComputedStyle(document.querySelector('#modal-panel .ctl-grid small')).fontSize), canvasW: document.getElementById('view').getBoundingClientRect().width, msgs: parseFloat(getComputedStyle(document.getElementById('msgs')).fontSize), hint: parseFloat(getComputedStyle(document.getElementById('hint')).fontSize) }));
    const f0 = await fsz();
    await page.locator('#ac-ts-1').click(); const f1 = await fsz();
    await page.locator('#ac-ts-2').click(); const f2 = await fsz();
    const near = (a, b) => Math.abs(a - b) < 0.6;
    ok(near(f1.panel / f0.panel, 1.2) && near(f2.panel / f0.panel, 1.4) && near(f1.panel / f0.panel * 1, f1.panel / f0.panel), 'text size steps scale panel text x1.2 and x1.4 (' + f0.panel.toFixed(1) + ' -> ' + f1.panel.toFixed(1) + ' -> ' + f2.panel.toFixed(1) + 'px)');
    ok(Math.abs(f1.h2 / f0.h2 - 1.2) < 0.02 && Math.abs(f2.btn / f0.btn - 1.4) < 0.02 && Math.abs(f2.small / f0.small - 1.4) < 0.02 && Math.abs(f2.msgs / f0.msgs - 1.4) < 0.02 && Math.abs(f2.hint / f0.hint - 1.4) < 0.02, 'headings, buttons, hints, messages and the world hint all scale');
    ok(f0.canvasW === f2.canvasW, 'the game canvas (and its HUD text) keep their size');
    assert.equal(await page.evaluate(() => document.getElementById('modal-panel').scrollWidth <= document.getElementById('modal-panel').clientWidth + 1), true, 'Largest text: Options panel has no horizontal overflow');
    await page.locator('#ac-ts-0').click(); const f0b = await fsz();
    ok(near(f0b.panel, f0.panel) && !(await page.evaluate(() => document.documentElement.classList.contains('ac-ts'))), 'Normal restores the original sizes');

    // reduce motion, no flashes through the block
    await page.locator('#feel-reduce').click();
    ok(await page.evaluate(() => GFX.reduceMotion === true && document.documentElement.classList.contains('ac-rm')) && (await page.locator('#feel-reduce').textContent()) === 'On', 'Reduce motion button drives GFX.reduceMotion and the ac-rm class');
    await page.locator('#feel-noflash').click();
    ok(await page.evaluate(() => GFX.noFlash === true && document.documentElement.classList.contains('ac-nf')), 'No flashes button drives GFX.noFlash and the ac-nf class');
    // high contrast
    await page.locator('#ac-hc').click(); await page.waitForTimeout(400);
    const hc = await page.evaluate(() => {
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const p = document.getElementById('modal-panel'), cs = getComputedStyle(p);
      const mut = getComputedStyle(p.querySelector('small'));
      const b = getComputedStyle(document.getElementById('ac-hc'));
      return { cls: document.documentElement.classList.contains('ac-hc'), body: ratio(cs.color, cs.backgroundColor), muted: ratio(mut.color, cs.backgroundColor), btn: ratio(b.color, b.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(0,0,0)' : b.backgroundColor), bw: b.borderTopWidth, bg: cs.backgroundColor };
    });
    ok(hc.cls && hc.body >= 15 && hc.muted >= 12 && hc.btn >= 12 && hc.bw === '2px', 'High contrast: panel text ' + hc.body.toFixed(1) + ':1, hint text ' + hc.muted.toFixed(1) + ':1, buttons outlined');
    await page.locator('#ac-hc').focus(); await page.keyboard.press('Tab');
    ok(await page.evaluate(() => { const a = document.activeElement; return a && getComputedStyle(a).outlineStyle === 'solid' && parseFloat(getComputedStyle(a).outlineWidth) >= 3; }), 'High contrast: keyboard focus gets a 3px outline');
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'hc-options.png') });
    await page.locator('#ac-hc').click();
    ok(!(await page.evaluate(() => document.documentElement.classList.contains('ac-hc'))), 'High contrast toggles off again');

    // captions
    await page.locator('#ac-cap').click();
    await page.evaluate(() => { closeModal(); G.state = 'play'; Audio_.sfx.door(); Audio_.sfx.door(); Audio_.sfx.enemy({ name: 'x' }, 'alert'); });
    const caps = await page.evaluate(() => [...document.querySelectorAll('#ac-captions div')].map(d => d.textContent));
    ok(caps.includes('[A door grinds]') && caps.filter(c => c === '[A door grinds]').length === 1 && caps.includes('[Something cries out]'), 'Sound captions show important sounds once: ' + JSON.stringify(caps));
    await page.evaluate(() => ACCESS.setCaptions(false)); await page.evaluate(() => Audio_.sfx.bell());
    ok(await page.evaluate(() => document.querySelectorAll('#ac-captions div').length === 0), 'captions off: nothing is shown');

    // ---------------------------------------------------------------- the effects honour the switches (settings matrix)
    const eff = await page.evaluate(() => {
      const r = {};
      const e = G.ents.find(x => (x.kind === 'enemy' || x.kind === 'npc') && x.sprite) || null;
      r.haveEnt = !!e;
      // calmEntity directly (the wrapper's body)
      const mk = () => ({ animSkew: 0.1, animSY: 1.08, animSX: 0.94, animLift: 0.06, animHurt: 0.8, animGlow: 1, flash: true });
      GFX.reduceMotion = false; GFX.noFlash = false; let a = mk(); ACCESS.calmEntity(a);
      r.offUntouched = a.animSkew === 0.1 && a.animHurt === 0.8 && a.flash === true;
      GFX.reduceMotion = true; a = mk(); ACCESS.calmEntity(a);
      r.rm = { skew: a.animSkew, sy: a.animSY, lift: a.animLift, hurtKept: a.animHurt };
      GFX.reduceMotion = false; GFX.noFlash = true; a = mk(); ACCESS.calmEntity(a);
      r.nf = { hurt: a.animHurt, flash: a.flash };
      // through the real animCreature
      if (e) {
        e._hurt = 0.3; e.hp = e.hp == null ? 10 : e.hp; e._hp = e.hp;
        animCreature(e, 0.016, 5); r.realHurtNoFlash = e.animHurt;
        GFX.noFlash = false; e._hurt = 0.3; animCreature(e, 0.016, 5); r.realHurtFlash = e.animHurt;
        GFX.noFlash = true; e.flash = true; Engine.render(G.ents, G.tod); r.renderClearsFlash = e.flash === false; e.flash = false;
      }
      // lamp flicker is damped, full-view flashes are skipped
      const t0 = ACCESS.touched.flicker; GFX.noFlash = true; Engine.setFlicker(0.8); r.flick = ACCESS.touched.flicker > t0; Engine.setFlicker(1);
      fx('hurt', 500); r.fxHurt = document.getElementById('fx').className; fx('glass', 500); r.fxGlass = document.getElementById('fx').className;
      GFX.noFlash = false; fx('hurt', 50); r.fxOn = document.getElementById('fx').className; fx('', 1);
      // CSS rules: the party pulse and the scroll text fade stop under reduce motion
      GFX.reduceMotion = true; ACCESS.syncClasses();
      const sp = document.createElement('p'); const box = document.createElement('div'); box.className = 'scroll-text'; box.appendChild(sp); document.body.appendChild(box);
      r.scrollAnim = getComputedStyle(sp).animationName; r.scrollOpacity = getComputedStyle(sp).opacity; box.remove();
      GFX.reduceMotion = false; GFX.noFlash = false; ACCESS.syncClasses();
      return r;
    });
    assert.equal(eff.offUntouched, true, 'with both switches off nothing is altered');
    ok(eff.rm.skew < 0.05 && Math.abs(eff.rm.sy - 1) < 0.04 && eff.rm.lift < 0.04 && eff.rm.hurtKept === 0.8, 'Reduce motion damps creature skew/squash/lift to a third (and leaves the hit cue)');
    ok(eff.nf.hurt === 0 && eff.nf.flash === false, 'No flashes removes the hurt flash and hit strobe');
    if (eff.haveEnt) ok(eff.realHurtNoFlash === 0 && eff.realHurtFlash > 0 && eff.renderClearsFlash, 'real animCreature wrapper: hurt flash only when flashes are allowed; Engine.render clears e.flash');
    ok(eff.flick && eff.fxHurt === '' && eff.fxGlass === '' && /hurt/.test(eff.fxOn), 'No flashes damps lamp flicker, skips the full-view tints, and leaves them when allowed');
    ok(eff.scrollAnim === 'none' && eff.scrollOpacity === '1', 'Reduce motion stops the intro text fade (text stays visible)');

    // ---------------------------------------------------------------- persistence
    await page.evaluate(() => { ACCESS.setTextSize(1); ACCESS.setHighContrast(true); ACCESS.setCaptions(true); ACCESS.setReduceMotion(true); ACCESS.setNoFlash(true); });
    await page.evaluate(() => ACCESS.setLocale('fr'));
    const stored = await page.evaluate(() => ({ a: JSON.parse(localStorage.getItem('octave.access.v1')), f: JSON.parse(localStorage.getItem('octave.feel.v1')) }));
    assert.deepEqual(stored.a, { ts: 1, hc: true, cap: true, loc: 'fr' }); assert.equal(stored.f.r, true); assert.equal(stored.f.n, true);
    await page.reload();
    await page.waitForFunction(() => typeof ACCESS !== 'undefined' && ACCESS.locale === 'fr', null, { timeout: 8000 });
    const re = await page.evaluate(() => ({ ts: ACCESS.settings.ts, cls: document.documentElement.className, rm: GFX.reduceMotion, nf: GFX.noFlash, begin: document.getElementById('btn-new').textContent, css: document.getElementById('access-ts-style') ? document.getElementById('access-ts-style').textContent.length : 0 }));
    ok(re.ts === 1 && /ac-ts/.test(re.cls) && /ac-hc/.test(re.cls) && /ac-rm/.test(re.cls) && /ac-nf/.test(re.cls) && re.rm && re.nf && re.css > 1000 && re.begin === 'Commencer', 'after a reload text size, contrast, motion, flashes and language are restored (title reads "' + re.begin + '")');
    await page.evaluate(() => { localStorage.setItem('octave.access.v1', '{"ts":9,"hc":"yes","loc":"<b>"}'); });
    await page.reload(); await page.waitForFunction(() => typeof ACCESS !== 'undefined');
    ok(await page.evaluate(() => ACCESS.settings.ts === 0 && ACCESS.settings.hc === false && ACCESS.locale === 'en'), 'a corrupt stored value falls back to defaults');
    await page.evaluate(() => { localStorage.removeItem('octave.access.v1'); localStorage.removeItem('octave.feel.v1'); });
    await page.close(); await ctx.close();

    // ---------------------------------------------------------------- catalog: fallback, logging, params
    const c2 = await open(browser); const p2 = c2.page; await newGame(p2);
    const fb = await p2.evaluate(async () => {
      const r = {};
      r.en = ACCESS.t('menu.save');
      // Phase 8 completed locales/fr.json, so the fallback is exercised on a copy with two keys removed; the story
      // module (which would translate the same rows from its own catalogue) is set aside: this block tests access.js alone
      delete window.STORY_I18N;
      const frFile = await (await fetch('locales/fr.json')).json();
      delete frFile.messages['gfx.dark']; delete frFile.messages['menu.hardcore'];
      ACCESS.register('fr', frFile);
      await ACCESS.setLocale('fr');
      r.fr = ACCESS.t('menu.save'); r.frMissing = ACCESS.t('gfx.dark'); r.frMissing2 = ACCESS.t('gfx.dark');
      r.unknown = ACCESS.t('nope.not_a_key'); r.unknown2 = ACCESS.t('nope.not_a_key');
      r.param = ACCESS.t('menu.needs', { state: 'X' }); r.paramEn = ACCESS.t('panel.worn', { n: 7 }, 'en');
      r.missing = ACCESS.missing.filter(m => m.key === 'gfx.dark' && m.locale === 'fr').length;
      r.unknownLogged = ACCESS.missing.filter(m => m.key === 'nope.not_a_key').length;
      G.state = 'panel'; renderMenu();
      r.menu = [...document.querySelectorAll('#modal-panel .dfbtn')].map(b => b.textContent);
      r.h2 = document.querySelector('#modal-panel h2').textContent;
      r.needs = document.getElementById('mn-needs').textContent;
      r.untranslated = document.getElementById('mn-hardcore').textContent;
      document.getElementById('mn-gfx').click();
      r.dark = [...document.querySelectorAll('#modal-panel .ctl-grid > span')].map(s => s.firstChild && s.firstChild.nodeValue).filter(Boolean);
      // a live edit after translation (button flips On/Off) stays in French
      document.getElementById('ac-hc').click(); r.hcBtn = document.getElementById('ac-hc').textContent; document.getElementById('ac-hc').click();
      msg('Sound off.', '', 100); r.msg = document.querySelector('#msgs .m:last-child').textContent;
      await ACCESS.setLocale('en');
      r.back = [...document.querySelectorAll('#modal-panel .dfbtn')].slice(0, 3).map(b => b.textContent);
      r.headBack = document.querySelector('#modal-panel h2').textContent;
      return r;
    });
    ok(fb.en === 'Save game' && fb.fr === 'Sauvegarder', 'locale selection: English default, French when chosen');
    ok(fb.frMissing === 'Dark interiors' && fb.frMissing2 === 'Dark interiors', 'a key missing in fr falls back to the English text, not the key name');
    ok(fb.missing === 1 && fb.unknownLogged === 1, 'each missing key is logged once (fr gfx.dark x1, unknown key x1) though asked twice');
    ok(c2.logs.filter(l => /\[i18n\] fr has no "gfx\.dark"/.test(l)).length === 1, 'the console shows exactly one notice for it');
    ok(fb.unknown === '' && fb.unknown2 === '', 'a key English lacks gives an empty string, never the key');
    ok(fb.param === 'Besoins du voyage (faim et sommeil) : X' && fb.paramEn === 'Worn — Armour Rating 7', 'parameters are filled in');
    ok(fb.h2 === 'Options' && fb.menu.includes('Sauvegarder') && fb.menu.includes('Retour au titre') && fb.menu.includes('Continuer'), 'French Options panel: ' + JSON.stringify(fb.menu.slice(0, 4)));
    ok(/Besoins du voyage \(faim et sommeil\) : (Désactivé|Activé)/.test(fb.needs) && /^Hardcore run .*: Off$/.test(fb.untranslated), 'template rows translate (state word too); unlisted rows stay English');
    ok(fb.dark.includes('Taille du texte') && fb.dark.includes('Langue') && fb.dark.includes('Contraste élevé'), 'the Accessibility block is translated');
    ok(fb.hcBtn === 'Activé' && fb.msg === 'Son coupé.', 'live-edited buttons and msg() lines translate too');
    ok(fb.back[0] !== 'Sauvegarder' && fb.headBack === 'Difficulty, Visuals & Accessibility', 'switching back to English restores every string');

    // ---------------------------------------------------------------- hostile catalog values are text
    await p2.evaluate(() => { closeModal(); G.state = 'play'; });
    const host = await p2.evaluate(async () => {
      window.__pwn = 0;
      const evil = '<img src=x onerror="window.__pwn=1"><script>window.__pwn=2<\/script>';
      const messages = { 'ui.close': evil, 'menu.save': '<b onmouseover=1>Save</b>', 'menu.needs': '<i>{state}</i> ' + evil, 'ui.on': 5, 'bad key!': 'x', 'nope.unknown': 'y', '__proto__': { 'ui.back': 'p' }, 'ui.back': 'z'.repeat(5000) };
      ACCESS.register('zz', { messages });
      await ACCESS.setLocale('zz');
      G.state = 'panel'; renderMenu();
      await new Promise(r => setTimeout(r, 30));
      const p = document.getElementById('modal-panel');
      const r = { close: document.getElementById('x').textContent, save: document.getElementById('mn-save').textContent, imgs: p.querySelectorAll('img, script, b').length, pwn: window.__pwn, needs: document.getElementById('mn-needs').textContent, backLen: ACCESS.t('ui.back').length, on: ACCESS.t('ui.on'), keys: [...ACCESS.catalogs.zz.keys()] };
      r.evilEqual = r.close === evil;
      r.html = document.getElementById('x').innerHTML;
      document.getElementById('mn-gfx').click(); r.pwn2 = window.__pwn;
      await ACCESS.setLocale('en'); closeModal(); G.state = 'play';
      return r;
    });
    ok(host.evilEqual && host.pwn === 0 && host.pwn2 === 0 && host.imgs === 0, 'hostile catalog markup renders as literal text (no element, no script run): ' + host.html.slice(0, 40));
    ok(host.save === '<b onmouseover=1>Save</b>' && /^<i>(On|Off)<\/i> <img/.test(host.needs), 'hostile parameters and templates stay text too');
    ok(host.backLen <= 600 && host.on === 'On' && !host.keys.includes('bad key!') && !host.keys.includes('nope.unknown') && !host.keys.includes('__proto__'), 'untrusted catalogs are sanitised: unknown/invalid keys dropped, non-strings ignored, length capped');
    // a hostile locales/fr.json fetched over the network
    const c3 = await open(browser); const p3 = c3.page;
    await p3.route('**/locales/fr.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ messages: { 'title.begin': '<img src=x onerror="window.__pwn=7">Go', 'ui.close': ['x'] } }) }));
    await p3.evaluate(async () => { window.__pwn = 0; await ACCESS.setLocale('fr'); });
    ok(await p3.evaluate(() => document.getElementById('btn-new').textContent === '<img src=x onerror="window.__pwn=7">Go' && window.__pwn === 0 && !document.querySelector('#title img[src="x"]')), 'a hostile fetched catalog is rendered as text on the title screen');
    await p3.route('**/locales/fr.json', r => r.fulfill({ status: 404, body: 'no' }));
    await p3.evaluate(async () => { delete ACCESS.catalogs.fr; await ACCESS.setLocale('fr'); });
    ok(await p3.evaluate(() => ACCESS.locale === 'en' && document.getElementById('btn-new').textContent === 'Begin'), 'an unreachable catalog keeps English');
    assert.deepEqual(c3.errors, []); await c3.ctx.close();

    // save-derived text is never translated or parsed
    const nm = await p2.evaluate(async () => {
      await ACCESS.setLocale('en-XA'); G.player.name = 'Close'; G.state = 'panel'; renderCharacter();
      const r = { h2: document.querySelector('#modal-panel h2').textContent, closeBtn: document.getElementById('x').textContent };
      await ACCESS.setLocale('en'); closeModal(); G.player.name = 'Access Tester'; G.state = 'play'; return r;
    });
    ok(nm.h2 === 'Close' && nm.closeBtn !== 'Close', 'a traveller named like a catalog word keeps their own name (' + nm.closeBtn + ' is the button)');

    // ---------------------------------------------------------------- pseudo-locale text expansion: every panel fits
    const PANELS = ['renderMenu', 'renderControls', 'renderAccessibilityMenu', 'renderInventory', 'renderCharacter', 'renderLog', 'renderLedger', 'renderSongs', 'renderMap', 'renderSave', 'renderLoad', 'renderHelp'];
    const fitAt = async (page, w, h, big) => {
      await page.setViewportSize({ width: w, height: h });
      return page.evaluate(async ({ PANELS, big }) => {
        await ACCESS.setLocale('en-XA'); ACCESS.setTextSize(big ? 2 : 0);
        const out = [];
        for (const name of PANELS) {
          closeModal(); G.state = 'panel';
          if (name === 'renderLoad') renderLoad(false); else window[name]();
          await new Promise(r => requestAnimationFrame(r));
          const p = document.getElementById('modal-panel'), box = p.getBoundingClientRect(), view = document.getElementById('game').getBoundingClientRect();
          let worst = 0, culprit = '';
          for (const el of p.querySelectorAll('*')) {
            const b = el.getBoundingClientRect(); if (!b.width) continue;
            const over = b.right - box.right; if (over > worst) { worst = over; culprit = el.tagName + '.' + el.className + ' ' + (el.textContent || '').slice(0, 30); }
          }
          const tr = [...p.querySelectorAll('.dfbtn')].filter(b => b.textContent.trim()).length;
          out.push({ name, scrollOverflow: p.scrollWidth - p.clientWidth, worst: Math.round(worst), culprit, within: box.left >= view.left - 1 && box.right <= view.right + 1, buttons: tr, xa: /[ñöüé]/i.test(p.textContent) });
        }
        closeModal(); G.state = 'play'; ACCESS.setTextSize(0); await ACCESS.setLocale('en');
        return out;
      }, { PANELS, big });
    };
    for (const [w, h, big, label] of [[1280, 800, false, '1280x800'], [640, 400, false, '640x400'], [640, 400, true, '640x400 + Largest text']]) {
      const res = await fitAt(p2, w, h, big);
      const bad = res.filter(r => r.scrollOverflow > 1 || r.worst > 2 || !r.within);
      if (bad.length) console.log('OVERFLOW', label, JSON.stringify(bad));
      assert.equal(bad.length, 0, label + ' pseudo-locale: every panel fits without horizontal overflow');
      assert.ok(res.filter(r => r.xa).length >= 5, 'pseudo text really appeared in the panels');
      console.log('PASS pseudo-locale (en-XA, 40% longer) at ' + label + ': ' + res.length + ' panels, no horizontal overflow');
    }
    // the title screen and its buttons
    await p2.evaluate(() => { closeModal(); G.state = 'title'; show('#title'); });
    for (const [w, h] of [[1280, 800], [640, 400]]) {
      await p2.setViewportSize({ width: w, height: h });
      const t = await p2.evaluate(async () => { await ACCESS.setLocale('en-XA'); await new Promise(r => requestAnimationFrame(r)); const t = document.querySelector('#title'), tb = t.getBoundingClientRect(); const bs = [...t.querySelectorAll('.dfbtn')].map(b => b.getBoundingClientRect()); const r = { fits: t.scrollWidth <= t.clientWidth + 1, inside: bs.every(b => b.left >= tb.left - 1 && b.right <= tb.right + 1), txt: document.getElementById('btn-new').textContent }; await ACCESS.setLocale('en'); return r; });
      ok(t.fits && t.inside && /[öñ]/.test(t.txt), 'title screen buttons fit with the pseudo-locale at ' + w + 'x' + h);
    }
    if (SHOTS) {
      await p2.setViewportSize({ width: 1280, height: 800 });
      await p2.evaluate(async () => { hide('#title'); G.state = 'panel'; await ACCESS.setLocale('fr'); renderMenu(); }); await p2.screenshot({ path: path.join(SHOTS, 'fr-options.png') });
      await p2.evaluate(async () => { await ACCESS.setLocale('en-XA'); renderControls(); }); await p2.screenshot({ path: path.join(SHOTS, 'xa-controls.png') });
      await p2.setViewportSize({ width: 640, height: 400 }); await p2.evaluate(async () => { renderAccessibilityMenu(); }); await p2.screenshot({ path: path.join(SHOTS, 'xa-access-640.png') });
      await p2.setViewportSize({ width: 1280, height: 800 });
      await p2.evaluate(async () => { await ACCESS.setLocale('en'); ACCESS.setTextSize(2); renderInventory(); }); await p2.screenshot({ path: path.join(SHOTS, 'largest-inventory.png') });
      await p2.evaluate(async () => { ACCESS.setTextSize(0); ACCESS.setHighContrast(true); renderInventory(); }); await p2.screenshot({ path: path.join(SHOTS, 'hc-inventory.png') });
      await p2.evaluate(() => { closeModal(); G.state = 'play'; ACCESS.setHighContrast(true); ACCESS.setCaptions(true); msg('Your logbook has been updated.', 'warn', 9000); Audio_.sfx.door(); Audio_.sfx.thunder(); }); await p2.waitForTimeout(150); await p2.screenshot({ path: path.join(SHOTS, 'hc-hud-captions.png') });
      await p2.evaluate(() => { ACCESS.setHighContrast(false); ACCESS.setCaptions(false); });
    }
    assert.deepEqual(c2.errors, [], 'no browser runtime errors');
    assert.deepEqual(errors, [], 'no browser runtime errors (first page)');
    console.log('PASS no page errors');
    await c2.ctx.close();
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e.message || e); process.exit(1); });
