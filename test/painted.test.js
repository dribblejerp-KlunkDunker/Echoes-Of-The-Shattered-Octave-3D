// PREVIEW_URL=http://127.0.0.1:3814 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/painted.test.js
// Phase 8 PAINTED: paintings used when present, procedural stand-ins otherwise (js/painted.js).
// Works with an empty manifest (all fallbacks) and with real images: the page-side hook builds its own
// manifest and draws its own JPEG data URL, so no file in img/painted/ is needed.
'use strict';
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.PAINTED_SHOTS || path.join(os.tmpdir(), 'painted-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3814');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof SCREENS !== 'undefined' && typeof PAINTED !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Paint Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(1500);
    const ev = (f, a) => page.evaluate(f, a);

    // ---- 0. API, switch, manifest
    ok(await ev(() => typeof PAINTED_MANIFEST === 'object' && typeof PAINTED.has === 'function' && typeof PAINTED.url === 'function' && GFX.paintedArt === true), 'PAINTED API present, switch defaults on');
    ok(await ev(() => PAINTED.url('area', 'street') === 'img/painted/area/street.jpg' && PAINTED.url('../x', 'y') === null && PAINTED.url('area', '__proto__') !== undefined && !PAINTED.has('__proto__', 'x')), 'urls follow the contract; hostile names are refused');
    const realCount = await ev(() => Object.keys(PAINTED_MANIFEST).length);
    console.log('INFO real manifest entries: ' + realCount);
    // the page's own test picture: a flat magenta JPEG drawn here (no files needed)
    await ev(() => {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const x = c.getContext('2d');
      x.fillStyle = '#ff00ff'; x.fillRect(0, 0, 1280, 720);
      window.__pic = c.toDataURL('image/jpeg', 0.95);
      const s = document.createElement('canvas'); s.width = 800; s.height = 600; const y = s.getContext('2d'); y.fillStyle = '#00ffff'; y.fillRect(0, 0, 800, 600);
      window.__sk = s.toDataURL('image/jpeg', 0.95);
      window.__setup = (keys, bad) => {
        PAINTED.test.reset(); GFX.paintedArt = true; const m = {};
        for (const k of keys) { m[k] = { w: 1280, h: 720, bytes: 1 }; const [g, n] = k.split('/'); PAINTED.test.setUrl(g, n, g === 'sketch' ? window.__sk : window.__pic); }
        for (const k of (bad || [])) { m[k] = { w: 1, h: 1, bytes: 1 }; const [g, n] = k.split('/'); PAINTED.test.setUrl(g, n, 'data:image/jpeg;base64,AAAA'); }
        PAINTED.test.setManifest(m);
      };
      window.__centre = (cv) => { const d = cv.getContext('2d').getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data; return [d[0], d[1], d[2]]; };
    });
    const near = (p, q) => Math.abs(p[0] - q[0]) < 40 && Math.abs(p[1] - q[1]) < 40 && Math.abs(p[2] - q[2]) < 40;

    // ---- 1. empty manifest: everything is the stand-in
    await ev(() => { PAINTED.test.reset(); PAINTED.test.setManifest({}); });
    ok(await ev(() => !PAINTED.has('area', 'street') && !PAINTED.has('death', 'found') && PAINTED.ready('area', 'street') === null), 'empty manifest: has() false, ready() null');
    await ev(() => { SCREENS.dismiss(); });
    await page.waitForTimeout(1300);
    const e1 = await ev(() => { SCREENS.hold = true; SCREENS.showArea('tavern'); const cv = document.querySelector('#scr-card canvas'); const o = { w: cv.width, painted: cv.classList.contains('painted') }; SCREENS.hold = false; SCREENS.dismiss(); return o; });
    ok(e1.w === 320 && !e1.painted, 'area card with no painting is the 320x200 stand-in');
    const d1 = await ev(() => { G.dead = false; G.state = 'play'; G.player.hp = 10; die('The Cacophony Hound'); const d = document.getElementById('death'); return { k: d.dataset.scrDeath, painted: d.classList.contains('scr-painted'), bg: d.style.backgroundImage.slice(-30) }; });
    ok(d1.painted === false && d1.k === 'beast', 'death with no painting uses the stand-in: ' + d1.k);
    await ev(() => { document.getElementById('btn-wake').click(); });

    // ---- 2. area card: not decoded yet -> stand-in for that visit, never waiting
    await page.waitForTimeout(1300);
    const a1 = await ev(() => {
      __setup(['area/hearth']); SCREENS.dismiss();
      const t0 = performance.now(); SCREENS.hold = true; SCREENS.showArea('tavern'); const dt = performance.now() - t0;
      const cv = document.querySelector('#scr-card canvas'); const o = { w: cv.width, painted: cv.classList.contains('painted'), dt }; SCREENS.hold = false; SCREENS.dismiss(); return o;
    });
    ok(a1.w === 320 && !a1.painted && a1.dt < 100, 'painting not decoded yet: stand-in this visit, no wait (' + a1.dt.toFixed(1) + ' ms)');
    await page.waitForTimeout(400);
    ok(await ev(async () => { const im = await PAINTED.load('area', 'hearth'); return !!im && !!PAINTED.ready('area', 'hearth'); }), 'the painting decodes afterwards');
    const a2 = await ev(() => {
      SCREENS.hold = true; SCREENS.showArea('tavern');
      const cv = document.querySelector('#scr-card canvas'); const o = { w: cv.width, h: cv.height, painted: cv.classList.contains('painted'), px: __centre(cv), name: document.querySelector('#scr-card .scr-name').textContent, shade: !!document.querySelector('#scr-card .scr-shade'), on: document.getElementById('scr-card').classList.contains('on') };
      return o;
    });
    ok(a2.painted && a2.w === 1280 && near(a2.px, [255, 0, 255]), 'decoded painting is drawn cover-fit on the card (centre pixel ' + a2.px + ')');
    ok(a2.name.length > 0 && a2.shade && a2.on, 'card keeps its title text and legibility gradient: ' + a2.name);
    await page.screenshot({ path: path.join(SHOTS, 'area-painted.png') });
    await ev(() => { SCREENS.hold = false; SCREENS.dismiss(); });

    // ---- 3. failure: a corrupt file falls back, no broken image, no errors
    const f1 = await ev(async () => {
      __setup([], ['area/street', 'death/fall']);
      const r = await PAINTED.load('area', 'street');
      return { r, has: PAINTED.has('area', 'street'), failed: PAINTED.test.failed() };
    });
    ok(f1.r === null && f1.has === false && f1.failed.includes('area/street'), 'a corrupt painting is rejected (onerror) and remembered as failed');
    const f2 = await ev(async () => {
      await PAINTED.load('death', 'fall');
      G.dead = false; G.state = 'play'; G.player.hp = 10; die('the fall');
      const d = document.getElementById('death'); return { painted: d.classList.contains('scr-painted'), art: d.classList.contains('scr-art'), imgs: document.querySelectorAll('#death img').length };
    });
    ok(!f2.painted && f2.art && f2.imgs === 0, 'death screen with a failing painting shows the stand-in, no <img>');
    await ev(() => { document.getElementById('btn-wake').click(); });

    // ---- 4. death pictures
    const dk = { 'The Cacophony Hound': 'beast', 'The Steam Golem': 'golem', 'the fall': 'fall', 'Something odd': 'found' };
    for (const [src, kind] of Object.entries(dk)) {
      const r = await ev(async ({ src, kind }) => {
        __setup(['death/' + kind]); await PAINTED.load('death', kind);
        G.dead = false; G.state = 'play'; G.player.hp = 10; die(src);
        const d = document.getElementById('death');
        return { painted: d.classList.contains('scr-painted'), bg: d.style.backgroundImage.slice(0, 60), cls: d.classList.contains('scr-art'), title: document.getElementById('death-title').textContent.length, text: document.getElementById('death-text').textContent.length, btn: !!document.getElementById('btn-wake') };
      }, { src, kind });
      ok(r.painted && r.cls && r.bg.startsWith('linear-gradient') && r.title > 0 && r.text > 0 && r.btn, 'death "' + src + '" uses painting death/' + kind + ' under the dark wash with text and button intact');
      if (kind === 'beast') await page.screenshot({ path: path.join(SHOTS, 'death-painted.png') });
      await ev(() => { document.getElementById('btn-wake').click(); });
    }
    // arrives late: stand-in first, swapped for the painting while the screen is up
    const late = await ev(async () => {
      __setup(['death/wearer']); G.dead = false; G.state = 'play'; G.player.hp = 10; die('The Wearer');
      const d = document.getElementById('death'); const before = d.classList.contains('scr-painted');
      await PAINTED.load('death', 'wearer'); await new Promise(r => setTimeout(r, 50));
      return { before, after: d.classList.contains('scr-painted') };
    });
    ok(late.before === false && late.after === true, 'a painting that arrives while the death screen is up replaces the stand-in');
    await ev(() => { document.getElementById('btn-wake').click(); });

    // ---- 5. endings
    const en = await ev(async () => {
      const out = {};
      for (const [kind, flags, v] of [['b1', {}, 'b1_none'], ['b1', { aegis_calmed: true }, 'b1_calmed'], ['p2', { hedge_answered: true }, 'p2_answered'], ['p2', {}, 'p2_plain']]) {
        __setup(['ending/' + v]); await PAINTED.load('ending', v);
        const el = document.querySelector('#ending img.bg'); const saveFlags = G.flags; G.flags = Object.assign({}, flags);
        SCREENS.applyEnding(kind); G.flags = saveFlags;
        out[v] = { src: el.src.slice(0, 22), alt: el.alt, key: el.dataset.scrEnding, painted: el.dataset.scrPainted };
      }
      // glassed player: the tideline is drawn over the painting
      __setup(['ending/b1_none']); await PAINTED.load('ending', 'b1_none'); G.player.glassed = true;
      const el = document.querySelector('#ending img.bg'); const f = G.flags; G.flags = {}; SCREENS.applyEnding('b1'); G.flags = f; G.player.glassed = false;
      out.glass = { src: el.src.slice(0, 22), painted: el.dataset.scrPainted };
      // stand-in alt for comparison
      PAINTED.test.setManifest({}); G.flags = { hedge_answered: true }; SCREENS.applyEnding('p2'); G.flags = f;
      out.standinAlt = el.alt; out.standinSrc = el.src.slice(0, 22);
      return out;
    });
    ok(Object.keys(en).filter(k => /^(b1|p2)_/.test(k)).every(k => en[k].src === 'data:image/jpeg;bas' || en[k].src.startsWith('http') || en[k].src.includes('data:image/jpeg')) && en.b1_none.painted === '1' && en.p2_answered.key === 'p2_answered', 'ending variants use their paintings: ' + Object.keys(en).filter(k => /^(b1|p2)_/.test(k)).join(','));
    ok(en.p2_answered.alt === en.standinAlt && en.standinSrc.startsWith('data:image/jpeg') , 'ending alt text is unchanged by the painting');
    ok(en.glass.painted === '1', 'glassed ending still uses the painting');

    // ---- 6. sketches
    const sk = await ev(async () => {
      __setup(['sketch/quill', 'sketch/gate']);
      const before = LOGMAP.sketchURL('gate').slice(0, 15);
      const fig = LOGMAP.sketchEl('gate'); const first = fig.querySelector('img').src.slice(0, 15);
      await PAINTED.load('sketch', 'gate'); await new Promise(r => setTimeout(r, 50));
      const after = fig.querySelector('img').src.slice(0, 22), alt = fig.querySelector('img').alt;
      return { before, first, after, alt, again: LOGMAP.sketchURL('gate').slice(0, 22), none: LOGMAP.sketchURL('bore').slice(0, 15) };
    });
    ok(sk.before === 'data:image/png;' && sk.first === 'data:image/png;' && sk.after.startsWith('data:image/jpeg') && sk.again.startsWith('data:image/jpeg') && sk.none === 'data:image/png;', 'sketch: stand-in first, painting swapped in when decoded, others unaffected');
    ok(/^Ink sketch: \S/.test(sk.alt), 'sketch alt text unchanged: ' + sk.alt);

    // ---- 7. memory: at most 8 decoded images
    const mem = await ev(async () => {
      const keys = PAINTED.FAMILIES.map(f => 'area/' + f).concat(PAINTED.DEATHS.slice(0, 4).map(k => 'death/' + k)); __setup(keys);
      for (const k of keys) { const [g, n] = k.split('/'); await PAINTED.load(g, n); }
      return { n: PAINTED.test.decoded(), keys: keys.length };
    });
    ok(mem.keys > 8 && mem.n <= 8, 'decoded image cache is capped: ' + mem.n + ' of ' + mem.keys);

    // ---- 8. switch: Stand-ins, persisted, off = original game
    const sw = await ev(async () => {
      __setup(['death/found']); await PAINTED.load('death', 'found');
      GFX.paintedArt = false; PAINTED.save();
      const stored = localStorage.getItem('octave.painted.v1');
      G.dead = false; G.state = 'play'; G.player.hp = 10; die('Something odd');
      const d = document.getElementById('death'); const o = { stored, has: PAINTED.has('death', 'found'), painted: d.classList.contains('scr-painted') };
      document.getElementById('btn-wake').click(); GFX.paintedArt = true; PAINTED.save();
      return o;
    });
    ok(sw.stored === '{"on":false}' && !sw.has && !sw.painted, 'Stand-ins setting persists in octave.painted.v1 and turns the paintings off');
    // the Options row, through the real menu
    await ev(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const row = await ev(() => {
      const b = document.getElementById('painted-toggle'); if (!b) return null;
      const o = { first: b.textContent }; b.click(); o.after = b.textContent; o.off = GFX.paintedArt; o.stored = localStorage.getItem('octave.painted.v1');
      b.click(); o.back = b.textContent; o.on = GFX.paintedArt;
      const g = document.querySelector('#modal-panel'); o.fits = g.scrollWidth <= g.clientWidth + 1;
      return o;
    });
    ok(row && row.first === 'On' && row.after === 'Stand-ins' && row.off === false && row.stored === '{"on":false}' && row.back === 'On' && row.on === true && row.fits, 'Options row "Painted art" toggles On / Stand-ins and persists');
    await page.screenshot({ path: path.join(SHOTS, 'options-row.png') });
    await ev(() => { G.state = 'play'; closeModal(); });

    // ---- 9. restore, empty manifest keeps everything working
    await ev(() => { PAINTED.test.reset(); });
    ok(await ev(() => { loadMap('oakhaven'); return G.state === 'play'; }), 'map loading unaffected');
    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } catch (e) { console.log('FAIL exception: ' + e.stack); fails++; }
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
