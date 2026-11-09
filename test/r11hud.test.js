// PREVIEW_URL=http://127.0.0.1:4113 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r11hud.test.js
// R11 phase 1, team HUD (js/r11hud.js, css/r11hud.css): the bronze bar of the benchmark pictures. It shows in the
// Realistic style and hides in Pixel (live); under automation only when the page opts in; it lies exactly over the canvas
// HUD band; every button does what the old band's button did; the vials follow the game's bars; the compass follows
// Engine.cam.dir; menus and dialogue stay above it; on a phone it collapses to 44 px targets with a MORE panel; every label
// fits in English and French at 1280x800 and 390x844; and no page errors.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const URL0 = process.env.PREVIEW_URL || 'http://127.0.0.1:4113';

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

async function startGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof R11HUD !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hud Tester');
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
    G.tod = 10 / 24; loadMap('oakhaven'); G.state = 'play'; G.fadeT = 0;
    window.__base = JSON.parse(JSON.stringify(snapshotGame()));
    window.HT = {
      reset() { try { closeModal(); } catch (e) { /* none open */ } restoreGame(JSON.parse(JSON.stringify(window.__base))); G.state = 'play'; G.song.t = 0; G.songFx = 0; R11HUD.update(); },
      // what a button left behind: the state, the open panel and its heading, the weapon, the song
      seen() {
        const mp = document.getElementById('modal-panel'), h = mp && !document.getElementById('modal').classList.contains('hidden') ? mp.querySelector('h2') : null;
        return JSON.stringify({ state: G.state, panel: G.openPanel || null, h2: h ? h.textContent : null, weapon: G.player.weapon, song: G.song.t > 0 || G.songFx > 0, voice: Math.round(G.player.voice * 10) });
      },
    };
  });
}
// every visible text label in the bar and the MORE panel: does its text fit?
const overflowScan = () => {
  const out = [];
  for (const root of [R11HUD.bar(), R11HUD.panel()]) {
    if (!root || root.hidden) continue;
    root.querySelectorAll('button, .r11h-wname, .r11h-nword, .r11h-pname, .r11h-when, .r11h-status, .r11h-mhead b, .r11h-mhead small').forEach((el) => {
      const cs = getComputedStyle(el); if (cs.display === 'none' || el.offsetParent === null || !el.textContent.trim()) return;
      out.push({ t: el.textContent, sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight, ok: el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 2 });
    });
  }
  return out;
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  const shots = process.env.R11HUD_SHOTS || '';
  try {
    // ---- automation without the opt-in: the bar never shows (the rest of the suite runs as before)
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL0);
      await startGame(page);
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ shown: R11HUD.shown(), hidden: R11HUD.bar().hidden, active: R11HUD.active() }));
      check(!r.shown && r.hidden && !r.active, 'under automation without window.__r11 the bar stays hidden (' + JSON.stringify(r) + ')');
      await page.close();
    }

    // ---- desktop, opted in
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.__r11 = { automation: true }; try { localStorage.removeItem('octave.r11.v1'); } catch (e) { /* fine */ } });
    await page.goto(URL0);
    await startGame(page);
    await page.waitForTimeout(400);

    let r = await page.evaluate(() => {
      const g = document.getElementById('game').getBoundingClientRect(), b = R11HUD.bar().getBoundingClientRect();
      const bandTop = g.top + g.height * VIEW_H / VH;
      const bg = getComputedStyle(R11HUD.bar()).backgroundImage;
      return { shown: R11HUD.shown(), style: R11HUD.style(), top: b.top, bandTop, bottom: b.bottom, gBottom: g.bottom, left: b.left, right: b.right, gl: g.left, gr: g.right, bg: bg && bg !== 'none',
        btns: [...R11HUD.bar().querySelectorAll('.r11h-btns button:not(.r11h-more)')].map((x) => x.textContent), game: HUD_BTNS.map((x) => x.t) };
    });
    check(r.shown && r.style === 'realistic', 'Realistic is the default and the bar shows (' + r.style + ')');
    check(Math.abs(r.top - r.bandTop) <= 1 && Math.abs(r.bottom - r.gBottom) <= 1 && Math.abs(r.left - r.gl) <= 1 && Math.abs(r.right - r.gr) <= 1 && r.bg,
      'the bar covers exactly the old HUD band, opaque, and nothing of the 3D view (top ' + r.top.toFixed(1) + ' vs band ' + r.bandTop.toFixed(1) + ')');
    check(JSON.stringify(r.btns) === JSON.stringify(r.game), 'every one of the game\'s buttons is on the desktop bar, in its order (' + r.btns.join(' ') + ')');

    // the view is still the view: a point in it is the game's canvas, a point in the band is the bar
    r = await page.evaluate(() => {
      const g = document.getElementById('game').getBoundingClientRect();
      const inView = document.elementFromPoint(g.left + g.width * 0.3, g.top + g.height * 0.6), inBand = document.elementFromPoint(g.left + g.width * 0.5, g.top + g.height * 0.9);
      return { view: inView && inView.tagName, viewIsBar: !!(inView && inView.closest('#r11hud')), band: !!(inBand && inBand.closest('#r11hud')) };
    });
    check(!r.viewIsBar && r.view === 'CANVAS' && r.band, 'the 3D view is not covered (' + r.view + ') and the band is the bar');

    // ---- each button does what the old one did
    const labels = await page.evaluate(() => HUD_BTNS.map((b) => b.t));
    const bad = [];
    for (const t of labels) {
      const old = await page.evaluate((t) => { HT.reset(); const b = HUD_BTNS.find((x) => x.t === t); hudClick(b.x + b.w / 2, b.y + b.h / 2); return HT.seen(); }, t);
      await page.evaluate(() => HT.reset());
      await page.locator(`#r11hud .r11h-btns button[data-t="${t}"]`).click();
      const now = await page.evaluate(() => HT.seen());
      if (old !== now) bad.push(t + ': old ' + old + ' new ' + now);
    }
    await page.evaluate(() => HT.reset());
    check(!bad.length, 'each bar button opens / does the same thing as the old band button (' + labels.length + ' buttons' + (bad.length ? '; ' + bad[0] : '') + ')');
    r = await page.evaluate(() => { HT.reset(); return { focus: document.activeElement && document.activeElement.closest ? !!document.activeElement.closest('#r11hud') : false }; });
    await page.locator('#r11hud button[data-t="WEAPON"]').click();
    r.focusAfter = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#r11hud')));
    check(!r.focusAfter, 'a pressed button never keeps the keyboard focus (Space and Enter still reach the game)');
    r = await page.evaluate(() => { HT.reset(); G.state = 'panel'; renderInventory(); return HT.seen(); });
    await page.evaluate(() => { closeModal(); G.state = 'dialogue'; });
    const before = await page.evaluate(() => HT.seen());
    await page.locator('#r11hud button[data-t="INV"]').click({ force: true });
    const after = await page.evaluate(() => HT.seen());
    check(before === after, 'outside play the buttons do nothing, as the old band did');
    await page.evaluate(() => HT.reset());

    // ---- menus, dialogue and cards stay above the bar
    r = await page.evaluate(() => {
      G.state = 'panel'; renderInventory();
      const g = document.getElementById('game').getBoundingClientRect(), el = document.elementFromPoint(g.left + g.width * 0.5, g.top + g.height * 0.9);
      const modalTop = !(el && el.closest('#r11hud'));
      closeModal(); G.state = 'play';
      const z = (s) => { const e = document.querySelector(s); return e ? +getComputedStyle(e).zIndex || 0 : null; };
      return { modalTop, zBar: z('#r11hud'), zScreen: z('#modal'), zCard: z('#scr-card'), zTouch: z('#touchui') };
    });
    check(r.modalTop && r.zBar < r.zScreen && (r.zCard === null || r.zBar < r.zCard) && r.zBar < r.zTouch, 'panels, title cards and the touch buttons draw above the bar (' + JSON.stringify(r) + ')');

    // ---- vials follow the game's bars
    r = await page.evaluate(() => {
      const p = G.player, h = (k) => parseFloat(R11HUD.els()[k].firstChild.style.height);
      p.hp = p.hpMax * 0.3; p.fat = p.fatMax * 0.55; p.voice = p.voiceMax * 0.8; G.noise = 8; R11HUD.update();
      const a = { hp: h('hp'), fat: h('fat'), voice: h('voice'), narrow: h('narrow'), loud: R11HUD.els().narrow.classList.contains('loud'), tip: R11HUD.els().hp.getAttribute('title') };
      p.hp = p.hpMax; p.fat = 0; G.noise = 1; R11HUD.update();
      a.hp2 = h('hp'); a.fat2 = h('fat'); a.still = R11HUD.els().narrow.classList.contains('still');
      return a;
    });
    check(Math.abs(r.hp - 30) < 0.6 && Math.abs(r.fat - 55) < 0.6 && Math.abs(r.voice - 80) < 0.6 && r.hp2 === 100 && r.fat2 === 0, 'the vials follow Health, Fatigue and Voice as they change (' + [r.hp, r.fat, r.voice, r.hp2, r.fat2].join(', ') + ')');
    check(Math.abs(r.narrow - 80) < 0.6 && r.loud && r.still && /^Health \d+ \/ \d+$/.test(r.tip), 'the Narrow gauge follows the noise and the vials carry the game\'s names (' + r.tip + ')');

    // ---- the compass follows Engine.cam.dir
    r = await page.evaluate(() => {
      const rot = () => { const m = /rotate\(([-\d.]+)\)/.exec(R11HUD.els().rose.getAttribute('transform') || ''); return m ? +m[1] : NaN; };
      const out = {};
      for (const [k, d] of [['north', -Math.PI / 2], ['east', 0], ['south', Math.PI / 2], ['west', Math.PI]]) { Engine.cam.dir = d; R11HUD.update(); out[k] = rot(); }
      return out;
    });
    const near = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180) < 0.2;
    check(near(r.north, 0) && near(r.east, -90) && near(r.south, -180) && near(r.west, -270), 'the compass rose turns with Engine.cam.dir (N ' + r.north + ', E ' + r.east + ', S ' + r.south + ', W ' + r.west + ')');

    // ---- the weapon, the place, the day and the calendar, all the game's own
    r = await page.evaluate(() => {
      HT.reset(); G.tod = 10 / 24; R11HUD.update();
      const e = R11HUD.els();
      return { wname: e.wname.textContent, cw: currentWeapon().name, svg: !!e.wico.querySelector('svg, img'), place: e.pname.textContent, map: G.map.name, when: e.when.textContent,
        wantWhen: DAYS[G.day % 8] + ' · ' + timeName(), status: e.status.textContent, cal: CALENDAR11.hudWord() };
    });
    await page.waitForTimeout(300);
    const status2 = await page.evaluate(() => R11HUD.els().status.textContent);
    check(r.wname.startsWith(r.cw) && r.svg, 'the weapon panel shows the equipped weapon\'s picture and name (' + r.wname + ')');
    check(r.place === r.map && r.when === r.wantWhen && status2 === r.cal, 'the place, "weekday · time" and the Reach calendar date are the old bar\'s own (' + [r.place, r.when, status2].join(' / ') + ')');
    await page.evaluate(() => { const p = G.player; const i = p.weapons.indexOf('glass'); if (i >= 0) { p.weapon = i; R11HUD.update(); } });
    r = await page.evaluate(() => ({ w: R11HUD.els().wname.textContent, cw: currentWeapon().name }));
    check(r.w.startsWith(r.cw), 'switching weapons switches the panel (' + r.w + ')');

    // ---- Pixel hides it; switching back is live
    r = await page.evaluate(async () => {
      const set = (s) => { if (window.R11 && typeof R11.setStyle === 'function') R11.setStyle(s); else localStorage.setItem('octave.r11.v1', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('octave.r11.v1') || '{}'), { style: s }))); };
      set('pixel'); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const a = { pixelShown: R11HUD.shown(), pixelHidden: R11HUD.bar().hidden };
      const g = document.getElementById('game').getBoundingClientRect(), el = document.elementFromPoint(g.left + g.width * 0.5, g.top + g.height * 0.9);
      a.bandIsCanvas = !!el && el.tagName === 'CANVAS';
      set('realistic'); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      a.back = R11HUD.shown() && !R11HUD.bar().hidden;
      return a;
    });
    check(!r.pixelShown && r.pixelHidden && r.bandIsCanvas && r.back, 'Pixel style hides the bar (the canvas band is back) and Realistic brings it back, live (' + JSON.stringify(r) + ')');

    // ---- English and French fit at 1280x800
    let scan = await page.evaluate(overflowScan);
    check(scan.length >= 15 && scan.every((x) => x.ok), 'English: every label fits at 1280x800 (' + scan.length + ' labels' + (scan.find((x) => !x.ok) ? '; ' + JSON.stringify(scan.find((x) => !x.ok)) : '') + ')');
    await page.evaluate(() => ACCESS.setLocale('fr'));
    await page.waitForFunction(() => STORY_I18N.locale === 'fr');
    await page.evaluate(() => { G.player.weapon = 0; R11HUD.update(); });
    r = await page.evaluate(() => ({ btns: [...R11HUD.bar().querySelectorAll('.r11h-btns button:not(.r11h-more)')].map((x) => x.textContent), when: R11HUD.els().when.textContent, status: R11HUD.els().status.textContent, tip: R11HUD.els().hp.getAttribute('title'), n: [...R11HUD.els().rose.querySelectorAll('text')].map((t) => t.textContent).join('') }));
    check(r.btns.join(' ') === 'PERSO INV CHANT JRNL CARTE REPOS NOMS AIDE MURMURE SAUVER ARME' && /^Santé /.test(r.tip) && r.n === 'NSEO', 'French: the buttons, tooltips and compass are French (' + r.btns.join(' ') + ', ' + r.tip + ', ' + r.n + ')');
    check(!/[A-Z][a-z]+day\b/.test(r.when) && !/^The /.test(r.status), 'French: the weekday and the calendar date are French (' + r.when + ' / ' + r.status + ')');
    scan = await page.evaluate(overflowScan);
    check(scan.length >= 15 && scan.every((x) => x.ok), 'French: every label fits at 1280x800 (' + scan.length + ' labels' + (scan.find((x) => !x.ok) ? '; ' + JSON.stringify(scan.find((x) => !x.ok)) : '') + ')');
    if (shots) await page.screenshot({ path: path.join(shots, 'desktop-fr.png') });
    await page.evaluate(() => ACCESS.setLocale('en'));
    await page.waitForFunction(() => STORY_I18N.locale === 'en');
    await page.waitForTimeout(100);
    if (shots) await page.screenshot({ path: path.join(shots, 'desktop-en.png') });
    await page.close();

    // ---- phone: 390x844 with ?touch=1, English and French
    for (const lang of ['en', 'fr']) {
      const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      ph.on('pageerror', (e) => errors.push(e.message));
      await ph.addInitScript(() => { window.__r11 = { automation: true }; });
      await ph.goto(URL0 + '/?touch=1');
      await startGame(ph);
      if (lang === 'fr') { await ph.evaluate(() => ACCESS.setLocale('fr')); await ph.waitForFunction(() => STORY_I18N.locale === 'fr'); }
      await ph.evaluate(() => R11HUD.update());
      await ph.waitForTimeout(300);
      r = await ph.evaluate(() => {
        const vis = [...R11HUD.bar().querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => { const q = b.getBoundingClientRect(); return { t: b.textContent, w: q.width, h: q.height }; });
        const b = R11HUD.bar().getBoundingClientRect();
        return { compact: R11HUD.compact(), vis, barW: b.width, scroll: R11HUD.bar().scrollWidth <= R11HUD.bar().clientWidth + 1, docScroll: document.documentElement.scrollWidth <= innerWidth };
      });
      check(r.compact && r.vis.length === 5 && r.vis.every((x) => x.w >= 44 && x.h >= 44), lang + ' phone 390x844 (?touch=1): a compact bar of the first four buttons and MORE, every target at least 44 px (' + r.vis.map((x) => x.t + ' ' + Math.round(x.w) + 'x' + Math.round(x.h)).join(', ') + ')');
      check(r.scroll && r.docScroll, lang + ' phone: the bar fits its width with nothing pushed off it');
      let sc = await ph.evaluate(overflowScan);
      check(sc.every((x) => x.ok), lang + ' phone: every bar label fits (' + sc.length + (sc.find((x) => !x.ok) ? '; ' + JSON.stringify(sc.find((x) => !x.ok)) : '') + ')');
      // MORE opens the rest; each does what its old button did
      await ph.locator('#r11hud .r11h-more').tap();
      r = await ph.evaluate(() => ({ open: R11HUD.more(), n: [...R11HUD.panel().querySelectorAll('.r11h-mgrid button')].filter((b) => b.offsetParent !== null).map((b) => { const q = b.getBoundingClientRect(); return { t: b.textContent, w: q.width, h: q.height, top: q.top }; }), head: R11HUD.panel().querySelector('.r11h-mhead b').textContent, ptop: R11HUD.panel().getBoundingClientRect().top, gtop: document.getElementById('game').getBoundingClientRect().top }));
      check(r.open && r.n.length === 7 && r.n.every((x) => x.w >= 44 && x.h >= 44) && r.ptop >= r.gtop && r.head, lang + ' phone: MORE opens the other seven buttons (44 px targets, inside the game, place name on top: ' + r.head + ')');
      sc = await ph.evaluate(overflowScan);
      check(sc.every((x) => x.ok), lang + ' phone: every MORE label fits (' + sc.length + (sc.find((x) => !x.ok) ? '; ' + JSON.stringify(sc.find((x) => !x.ok)) : '') + ')');
      if (shots) await ph.screenshot({ path: path.join(shots, 'phone-' + lang + '-more.png') });
      const old = await ph.evaluate(() => { const st = R11HUD.more(); HT.reset(); const b = HUD_BTNS.find((x) => x.t === 'MAP'); hudClick(b.x + b.w / 2, b.y + b.h / 2); const s = HT.seen(); HT.reset(); if (st) R11HUD.setMore(true); return s; });
      await ph.locator('#r11hud-more button[data-t="MAP"]').tap();
      const now = await ph.evaluate(() => HT.seen());
      check(old === now && !(await ph.evaluate(() => R11HUD.more())), lang + ' phone: MAP from the MORE panel opens the map, as the old button, and the panel closes');
      await ph.evaluate(() => HT.reset());
      // the on-screen stick: a touch on the view still starts it, and the bar is not in the stick's half of the view
      r = await ph.evaluate(() => {
        const g = document.getElementById('game').getBoundingClientRect(), c = document.getElementById('view');
        const x = g.left + g.width * 0.2, y = g.top + g.height * 0.5, el = document.elementFromPoint(x, y);
        const ev = (type) => new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true });
        c.dispatchEvent(ev('pointerdown')); const on = document.getElementById('t-stick').classList.contains('on'); c.dispatchEvent(ev('pointerup'));
        return { target: el && el.id, on, touch: G.touchMode };
      });
      check(r.target === 'view' && r.on && r.touch, lang + ' phone: the thumb stick still starts on the view (' + JSON.stringify(r) + ')');
      if (shots) { await ph.evaluate(() => R11HUD.setMore(false)); await ph.screenshot({ path: path.join(shots, 'phone-' + lang + '.png') }); }
      await ph.close();
    }

    // ---- every new string has French
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/r11-hud.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((x) => [x[0], x[1]]));
    const pg = await browser.newPage(); await pg.addInitScript(() => { window.__r11 = { automation: true }; }); await pg.goto(URL0);
    await pg.waitForFunction(() => typeof R11HUD !== 'undefined');
    const texts = await pg.evaluate(() => R11HUD.TEXTS);
    const noFr = texts.filter((t) => !pairs.get(t));
    check(!noFr.length && tsv.every((x) => x.length === 2), 'every new string has a French pair (' + noFr.length + ' missing' + (noFr.length ? ': ' + noFr[0] : '') + ')');
    await pg.close();

    check(!errors.length, 'no page errors (' + errors.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    fails++; console.log('FAIL exception: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
