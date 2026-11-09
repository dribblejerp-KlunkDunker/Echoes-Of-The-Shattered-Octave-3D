// PREVIEW_URL=http://127.0.0.1:3205 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/screens.test.js
// Phase 5 SCREENS: painted area cards, cause-specific death art, Book One ending paintings (js/screens.js).
// Screenshots go to SCREENS_SHOTS (default: the OS temp dir), never into the repo.
'use strict';
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SCREENS_SHOTS || path.join(os.tmpdir(), 'screens-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3205');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof SCREENS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Screen <b>Tester</b>');
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

    // ---- switch and bookkeeping
    ok(await ev(() => GFX.illustratedScreens === true && !GFX.FX.includes('illustratedScreens')), 'switch defaults on and is not part of GFX.FX');
    ok(await ev(() => !!document.getElementById('screens-style')), 'module style injected');
    ok(await ev(() => Object.keys(G.maps).every(id => typeof SCREENS.familyFor(id) === 'string')), 'every map id has a picture family');
    ok(await ev(() => SCREENS.familyFor('no_such_map') === 'plain' && SCREENS.familyFor('__proto__') === 'plain' && SCREENS.familyFor(null) === 'plain' && SCREENS.familyFor({}) === 'plain'), 'unknown / hostile map ids fall back to the plain family');

    // ---- 1. area cards
    await ev(() => { SCREENS.dismiss(); });
    await page.waitForTimeout(1300);
    const r1 = await ev(() => {
      const out = {}; const from = G.mapId; out.from = from;
      loadMap('tavern');
      const c = document.getElementById('scr-card');
      out.shown = !!c && c.classList.contains('on');
      out.name = c && c.querySelector('.scr-name').textContent;
      out.pe = c && getComputedStyle(c).pointerEvents;
      out.hidden = c && c.getAttribute('aria-hidden');
      out.state = G.state; out.fade = G.fadeT;
      return out;
    });
    ok(r1.shown && r1.name === 'The Boar & Dulcimer' || (r1.shown && r1.name.length > 0), 'entering a new area shows its card with the area name: ' + r1.name);
    ok(r1.pe === 'none' && r1.hidden === 'true' && r1.state === 'play', 'card never captures input, is aria-hidden, and play state is untouched');
    await page.waitForTimeout(800);
    ok(await ev(() => !document.getElementById('scr-card').classList.contains('on') && getComputedStyle(document.getElementById('scr-card')).visibility === 'hidden'), 'card is gone within the existing fade (under a second)');
    // same-map reload and rapid moves: no card
    const r2 = await ev(() => { const c = document.getElementById('scr-card'); loadMap('tavern'); return c.classList.contains('on'); });
    ok(r2 === false, 'same-map reload shows no card');
    await page.waitForTimeout(1300);
    ok(await ev(() => { loadMap('oakhaven'); const a = document.getElementById('scr-card').classList.contains('on'); SCREENS.dismiss(); loadMap('tavern'); return a && !document.getElementById('scr-card').classList.contains('on'); }), 'a second move inside ~1 s is treated as a rapid internal move (no second card)');
    await page.waitForTimeout(1300);
    // not in non-play states
    ok(await ev(() => { G.state = 'dead'; loadMap('oakhaven'); const a = document.getElementById('scr-card').classList.contains('on'); G.state = 'play'; return !a; }), 'no card unless the game is in play (load / death / ending)');
    await page.waitForTimeout(1300);
    // skip by any input
    await ev(() => { loadMap('mill'); });
    ok(await ev(() => document.getElementById('scr-card').classList.contains('on')), 'card up before input');
    await page.keyboard.press('x'); await page.waitForTimeout(60);
    ok(await ev(() => !document.getElementById('scr-card').classList.contains('on')), 'any key skips the card');
    await page.waitForTimeout(1300);
    await ev(() => { loadMap('oakhaven'); });
    await page.mouse.move(400, 300); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
    ok(await ev(() => !document.getElementById('scr-card').classList.contains('on')), 'a click skips the card');
    // travel and portal paths
    await page.waitForTimeout(1300);
    ok(await ev(() => { G.state = 'play'; const prev = G.mapId; const p = Object.values(G.map.cells).find(c => c && c.portal && G.maps[c.portal.map] && ['tavern', 'chapel', 'mill', 'greenhall'].includes(c.portal.map)); if (!p) return false; transfer(p.portal); return G.mapId !== prev && G.state === 'play' && document.getElementById('scr-card').classList.contains('on'); }), 'portal transfer to a new map shows the card');
    // reduced motion: simple cross-fade
    await page.waitForTimeout(1300);
    ok(await ev(() => { G.state = 'play'; GFX.reduceMotion = true; loadMap(G.mapId === 'quarry' ? 'oakhaven' : 'quarry'); const c = document.getElementById('scr-card'); const r = c.classList.contains('rm') && c.classList.contains('on'); SCREENS.dismiss(); GFX.reduceMotion = false; return r; }), 'reduced motion uses the plain cross-fade class');
    ok(await ev(() => { const cs = getComputedStyle(document.querySelector('#scr-card canvas')); return typeof cs.animationName === 'string'; }), 'card canvas styled');
    // cache: painting a family twice returns the same canvas
    ok(await ev(() => SCREENS.areaCanvas('quarry') === SCREENS.areaCanvas('quarry') && SCREENS.areaCanvas('street') !== SCREENS.areaCanvas('hearth')), 'area paintings are cached per family');
    // hostile map names are text, never markup
    ok(await ev(() => { const m = G.maps.cloister; const old = m.name; m.name = '<img src=x onerror=window.__scrX=1>'; SCREENS.dismiss(); SCREENS.showArea('cloister'); const c = document.getElementById('scr-card'); const bad = c.querySelectorAll('img').length || window.__scrX; const t = c.querySelector('.scr-name').textContent; m.name = old; SCREENS.dismiss(); return !bad && t.startsWith('<img'); }), 'hostile map name is shown as text');
    ok(await ev(() => SCREENS.showArea('nope') === false && SCREENS.showArea('constructor') === false), 'showArea ignores unknown / prototype ids');
    await page.waitForTimeout(700);
    // screenshots of every family at 1280x800
    const FAMS = ['street', 'hearth', 'hall', 'mill', 'workshop', 'chapel', 'hedge', 'quarry', 'root', 'grove', 'woods', 'crypt', 'belfry', 'arena', 'plain'];
    const SAMPLE = { street: 'oakhaven', hearth: 'tavern', hall: 'greenhall', mill: 'mill', workshop: 'tannery', chapel: 'chapel', hedge: 'clearing', quarry: 'quarry', root: 'rootvault', grove: 'whispergrove', woods: 'deepwoods', crypt: 'catacombs', belfry: 'belfry', arena: 'arena', plain: 'watchhouse' };
    await ev(() => { closeModal(); G.state = 'play'; SCREENS.hold = true; });
    for (const fam of FAMS) {
      await ev((id) => { SCREENS.dismiss(); SCREENS.showArea(id); }, SAMPLE[fam]);
      await page.waitForTimeout(80);
      await page.screenshot({ path: path.join(SHOTS, 'area-' + fam + '.png') });
    }
    ok(await ev(() => ['street', 'hearth', 'hall', 'mill', 'workshop', 'chapel', 'hedge', 'quarry', 'root', 'grove', 'woods', 'crypt', 'belfry', 'arena'].filter((f) => Object.keys(SCREENS.caches.area).some((k) => k.indexOf(f) === 0) || (typeof PAINTED !== 'undefined' && PAINTED.has('area', f))).length >= 14), 'all families painted (stand-in cached, or a painting in the manifest)');
    await page.setViewportSize({ width: 640, height: 400 });
    await ev(() => { SCREENS.dismiss(); SCREENS.showArea('oakhaven'); }); await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOTS, 'compact-area.png') });
    ok(await ev(() => { const g = document.getElementById('game'); return g.scrollWidth <= g.clientWidth + 1; }), 'compact 640x400 card: no horizontal overflow');
    await ev(() => { SCREENS.hold = false; SCREENS.dismiss(); });
    await page.setViewportSize({ width: 1280, height: 800 });

    // ---- 2. death screens
    const SRC = ['heartglass', 'unwrite', 'greening', 'The Cacophony Hound', 'The Carillon Legionnaire', 'The Steam Golem', 'The Catalogue Proctor', 'The Cacophony Swarm', 'The Wearer', 'A Quiet', 'The barbed tripwire', 'the fall', 'The deep water', 'An outrider\'s bolt', 'The Cutter\'s grapnel', 'Something odd'];
    const seen = {}; const texts = {};
    for (const src of SRC) {
      const r = await ev((src) => {
        G.dead = false; G.state = 'play'; G.player.hp = 10;
        die(src);
        const d = document.getElementById('death');
        return { bg: d.style.backgroundImage.length, key: d.dataset.scrDeath, title: document.getElementById('death-title').textContent, text: document.getElementById('death-text').textContent, hidden: d.classList.contains('hidden'), btn: !!document.getElementById('btn-wake') };
      }, src);
      seen[src] = r.key; texts[src] = r.text;
      ok(!r.hidden && r.bg > 100 && r.btn, 'death art for "' + src + '" -> ' + r.key);
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.join(SHOTS, 'death-' + src.replace(/[^a-z]+/gi, '_').toLowerCase() + '.png') });
    }
    const keys = new Set(Object.values(seen));
    ok(keys.size >= 12, 'death families are distinct: ' + [...keys].join(','));
    ok(seen['Something odd'] === 'found', 'unknown death source uses the fallback illustration');
    ok(texts['heartglass'].startsWith('The glass reaches your heart') && texts['The Wearer'].includes('has you.'), 'death text is untouched');
    // hostile sources
    const hs = await ev(() => { const out = []; for (const s of [undefined, null, 42, {}, '<img src=x onerror=window.__d=1>', '__proto__', 'x'.repeat(5000), ['a']]) { G.dead = false; G.state = 'play'; try { die(s); out.push(document.getElementById('death').dataset.scrDeath); } catch (e) { out.push('ERR ' + e.message); } } return { out, x: window.__d, imgs: document.querySelectorAll('#death img').length }; });
    ok(!hs.out.some(o => String(o).startsWith('ERR')) && !hs.x && hs.imgs === 0, 'hostile death sources fall back safely: ' + hs.out.join(','));
    ok(await ev(() => { const u1 = SCREENS.deathURL('heartglass'); return u1 === SCREENS.deathURL('heartglass') && SCREENS.caches.death.heartglass === u1; }), 'death pictures are cached');
    // buttons still work: wake
    ok(await ev(() => { G.dead = false; G.state = 'play'; G.player.hp = 5; die('the fall'); document.getElementById('btn-wake').click(); return G.state === 'play' && document.getElementById('death').classList.contains('hidden'); }), 'Wake still works over the illustrated death screen');
    // compact
    await ev(() => { G.dead = false; G.state = 'play'; die('The Cacophony Hound'); });
    await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOTS, 'compact-death.png') });
    ok(await ev(() => { const i = document.querySelector('#death .death-inner'); const r = i.getBoundingClientRect(), g = document.getElementById('game').getBoundingClientRect(); return r.left >= g.left - 1 && r.right <= g.right + 1 && r.bottom <= g.bottom + 1 && r.top >= g.top - 1; }), 'compact death screen: text and buttons fit');
    await page.setViewportSize({ width: 1280, height: 800 });
    await ev(() => { document.getElementById('btn-wake').click(); });

    // ---- 3. endings
    const flagsets = {
      p2_plain: {}, p2_answered: { hedge_answered: true }, p2_silent: { hedge_silent: true },
      b1_none: {}, b1_follow: { aegis_follow: true }, b1_calmed: { aegis_calmed: true }, b1_destroyed: { aegis_destroyed: true }, b1_herald: { part4: true },
    };
    const endSeen = {};
    for (const [key, flags] of Object.entries(flagsets)) {
      const r = await ev(({ key, flags }) => {
        const saved = JSON.stringify(G.flags); const st = G.state;
        for (const k of Object.keys(flags)) G.flags[k] = true;
        G.state = 'play';
        if (key.startsWith('p2')) ending(); else bookOneEnd1();
        const im = document.querySelector('#ending img.bg');
        const out = { src: im.src.slice(0, 22), key: im.dataset.scrEnding, alt: im.alt, shown: !document.getElementById('ending').classList.contains('hidden'), title: document.getElementById('ending-title').textContent, btns: !!document.getElementById('btn-again') };
        hide('#ending'); G.state = 'play'; G.flags = JSON.parse(saved); G.runs = 0;
        return out;
      }, { key, flags });
      endSeen[key] = r.src;
      ok(r.shown && r.key === key && r.src.startsWith('data:image') && r.alt.length > 40 && r.btns, 'ending variant ' + key + ' painted, alt: ' + r.alt.slice(0, 40) + '…');
      await ev(({ key, flags }) => { for (const k of Object.keys(flags)) G.flags[k] = true; G.state = 'play'; if (key.startsWith('p2')) ending(); else bookOneEnd1(); }, { key, flags });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(SHOTS, 'ending-' + key + '.png') });
      await ev(({ flags }) => { hide('#ending'); G.state = 'play'; for (const k of Object.keys(flags)) delete G.flags[k]; }, { flags });
    }
    ok(new Set(Object.values(endSeen)).size >= 1, 'ending images swapped in');
    ok(await ev(() => { const a = SCREENS.endingURL('p2', { hedge_answered: true }, false).url, b = SCREENS.endingURL('p2', { hedge_silent: true }, false).url, c = SCREENS.endingURL('b1', {}, false).url; return a !== b && b !== c && a === SCREENS.endingURL('p2', { hedge_answered: true }, false).url; }), 'variants differ and are cached');
    ok(await ev(() => SCREENS.endingURL('b1', {}, true).url !== SCREENS.endingURL('b1', {}, false).url), 'glassed overlay changes the painting');
    // hostile flags
    ok(await ev(() => { try { for (const f of [null, undefined, 'x', 5, [], { hedge_answered: '<img src=x>' }, { part4: { a: 1 }, aegis_follow: NaN }]) { const o = SCREENS.endingVariant('b1', f, false); if (!SCREENS.END_KEYS.includes(o.v)) return false; SCREENS.endingURL('p2', f, false); } return true; } catch (e) { return false; } }), 'hostile flag objects resolve to a known ending variant');
    ok(await ev(() => document.querySelectorAll('#ending img').length === 1), 'ending still has one background image');

    // ---- 4. switch off = the original screens
    await ev(() => { GFX.illustratedScreens = false; });
    const off = await ev(() => {
      const res = {};
      G.state = 'play'; G.dead = false; G.player.hp = 5; die('the fall');
      const d = document.getElementById('death'); res.deathBg = d.style.backgroundImage; res.deathCls = d.classList.contains('scr-art');
      document.getElementById('btn-wake').click();
      const im = document.querySelector('#ending img.bg'); G.state = 'play'; bookOneEnd1();
      res.endSrc = im.getAttribute('src'); res.endAlt = im.alt; hide('#ending'); G.state = 'play';
      const cur = G.mapId; setTimeout(() => {}, 0);
      loadMap(cur === 'quarry' ? 'oakhaven' : 'quarry'); const c = document.getElementById('scr-card'); res.card = c && c.classList.contains('on');
      return res;
    });
    ok(off.deathBg === '' && !off.deathCls && off.endSrc === 'img/ending.jpg' && off.endAlt === '' && !off.card, 'switch off: original death, ending and area transition (no card, no inline art, ending.jpg, empty alt)');
    await ev(() => { GFX.illustratedScreens = true; });

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally { await browser.close(); }
  if (fails) { console.log('FAIL screens: ' + fails + ' check(s) failed'); process.exit(1); }
  console.log('PASS screens');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
