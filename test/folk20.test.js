// PREVIEW_URL=http://127.0.0.1:4075 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/folk20.test.js
// Phase 20 FOLK: the people and small life. Pixel-art item icons for every catalogue id (distinct, one size, hostile ids
// get nothing), Kaelen's and Lyra's painted frames (same sizes and anchors as the sprites they come from, built once),
// pixel-art crows, rats and the cat's walk (same canvases and feet rows), mood portraits as expression edits, the
// Original preset unchanged, no page errors, and the frame cost of the new frames.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = (process.env.PREVIEW_URL || 'http://127.0.0.1:4075') + '/?nosw=1';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  let failed = 0;
  const ok = (c, msg) => { if (c) console.log('PASS ' + msg); else { failed++; console.log('FAIL ' + msg); } };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(URL);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof ICONS !== 'undefined' && typeof COMPANIONS_FX !== 'undefined' && typeof SMALLLIFE !== 'undefined' && typeof PORTRAITS !== 'undefined', null, { timeout: 120000 });
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Folk Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);

    // ---- 1. icons
    const ic = await page.evaluate(async () => {
      const ids = ICONS.allIds(), miss = [], urls = new Map(), dup = [];
      const key = (kind, id) => kind === 'w' ? 'weapon:' + id : id;
      for (const id of ids.weapons) { if (!ICONS.hasPixel('weapon:' + id)) miss.push('W:' + id); urls.set('W:' + id, ICONS.weaponUrl(id)); }
      for (const id of ids.items) {
        if (!ICONS.hasPixel(id)) miss.push(id);
        // w_<weapon> items show their weapon's art by design; every other item must look like itself
        if (ITEMS[id].weapon) continue;
        urls.set(id, ICONS.url(id));
      }
      const seen = {}; for (const [k, u] of urls) { if (seen[u]) dup.push(k + '=' + seen[u]); else seen[u] = k; }
      const size = await new Promise(res => { const im = new Image(); im.onload = () => res([im.width, im.height]); im.src = ICONS.url('tonic'); });
      const hostile = ['<img src=x onerror=alert(1)>', '__proto__', 'constructor', 'toString', 'w_nonexistent', '', null, 7].map(id => ICONS.url(id))
        .concat(['__proto__', 'constructor', 'nope'].map(w => ICONS.weaponUrl(w))).every(u => u === null);
      ICONS.setPixel(false); const painted = ICONS.url('tonic'); ICONS.setPixel(true);
      return { miss, dup, n: urls.size, size, hostile, switched: painted !== ICONS.url('tonic') && /^data:image\/png/.test(painted) };
    });
    ok(ic.miss.length === 0, 'every item, weapon and armour id has a hand-built pixel icon' + (ic.miss.length ? ' (missing ' + ic.miss.join(',') + ')' : ''));
    ok(ic.dup.length === 0, 'all ' + ic.n + ' icons are distinct' + (ic.dup.length ? ' (' + ic.dup.slice(0, 8).join(' ') + ')' : ''));
    ok(ic.size[0] === 48 && ic.size[1] === 48, 'icons keep the 48x48 size (' + ic.size + ')');
    ok(ic.hostile, 'hostile and unknown ids get no icon');
    ok(ic.switched, 'the Phase 5 painted stand-ins are still there behind setPixel(false)');

    // ---- 2. companion frames
    const cf = await page.evaluate(() => {
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      G.flags.part4 = true; GFX.companionLife = true; GFX.reduceMotion = false;
      const FX = COMPANIONS_FX, out = { bad: [], frames: 0 };
      const same = (a, b) => a.w === b.w && a.h === b.h && a.hs === b.hs && a.cx === b.cx && a.dy === b.dy;
      const differs = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n; };
      for (const who of ['kaelen', 'lyra']) for (const pose of ['flinch', 'stoop', 'limpA', 'limpB']) {
        const srcs = who === 'kaelen' ? [who, 'kaelen_w1', 'kaelen_w2'] : [who];
        for (const src of srcs) {
          const name = FX.poseFrame(who, pose, src), sp = Engine.sprites[name], s0 = Engine.sprites[src];
          if (!sp) { out.bad.push(who + ' ' + pose + ' ' + src + ' missing'); continue; }
          if (!same(sp, s0)) out.bad.push(name + ' size/anchor');
          if (differs(sp, s0) < 200) out.bad.push(name + ' barely differs');
          if (FX.poseFrame(who, pose, src) !== name || Engine.sprites[name] !== sp) out.bad.push(name + ' rebuilt');
          out.frames++;
        }
      }
      const ch = FX.chestSprite(), kb = Engine.sprites.kaelen;
      out.chest = !!ch && same(ch, kb) && differs(ch, kb) > 300;
      // in play: hurt and walking uses the frames; switch off uses none
      const join = () => { G.dead = false; loadMap('deepwoods', { x: 27.5, y: 38, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.party = null; partyJoin('lyra'); const e = partyEnt(); G.party.order = 'wait'; return e; };
      const walk = (frac) => { const e = join(); G.party.hp = partyMax('lyra') * frac; e._phase = 0; e._spd = 0; const seen = {}; for (let i = 0; i < 120; i++) { e.x += 0.012; ANIM.T += 0.016; animCreature(e, 0.016, ANIM.T); if (i > 30) seen[e.animSprite || '-'] = 1; } return Object.keys(seen); };
      out.hurt = walk(0.3); GFX.companionLife = false; out.off = walk(0.3); GFX.companionLife = true; out.well = walk(1);
      // frame cost: render with a frame vs the plain sprite (the frames are built once, so the cost is the same blit)
      const e = join(); Engine.cam.x = 27.5; Engine.cam.y = 38; Engine.cam.dir = Math.PI / 2; e.x = 27.5; e.y = 39.6; G.state = 'panel';
      const keep = animCreature; animCreature = function () {};
      const time = (spr) => { e.animSprite = spr; Engine.render(G.ents, G.tod); const t0 = performance.now(); for (let i = 0; i < 20; i++) Engine.render(G.ents, G.tod); return (performance.now() - t0) / 20; };
      const st = FX.poseFrame('lyra', 'stoop', 'lyra'); let a = 1e9, b = 1e9; for (let k = 0; k < 8; k++) { a = Math.min(a, time(null)); b = Math.min(b, time(st)); }   // fastest of eight, interleaved: a shared box is noisy
      animCreature = keep; G.state = 'play';
      out.ms = [a, b];
      return out;
    });
    ok(cf.bad.length === 0 && cf.frames === 16, 'companion frames: ' + cf.frames + ' built once, same size and anchors as their source, really re-posed' + (cf.bad.length ? ' ' + cf.bad.join(',') : ''));
    ok(cf.chest, "Kaelen's chest-hold keeps his sprite's size and repaints the arm");
    ok(cf.hurt.some(n => /_p20limpA/.test(n)) && cf.hurt.some(n => /_p20limpB/.test(n)) && cf.hurt.some(n => /_p20stoop/.test(n)), 'a hurt Lyra walks with the limp and stoop frames (' + cf.hurt.join(',') + ')');
    ok(!cf.off.some(n => /_p20/.test(n)) && !cf.well.some(n => /_p20/.test(n)), 'no frames when healthy or with companion life off');
    ok(cf.ms[1] < cf.ms[0] * 1.25 + 0.5, 'frame cost unchanged (' + cf.ms.map(x => x.toFixed(2)).join(' vs ') + ' ms)');

    // ---- 3. small life
    const sl = await page.evaluate(() => {
      loadMap('clearing'); G.state = 'play'; GFX.critters = true; SMALLLIFE.populate();
      const out = { bad: [] };
      const feet = sp => { for (let x = 0; x < sp.w; x++) if ((sp.data[(sp.h - 1) * sp.w + x] >>> 24) > 0) return true; return false; };
      for (const p of ['stand', 'peck', 'w1', 'w2', 'fly1', 'fly2', 'fly3']) { const s = Engine.sprites['crow_' + p]; if (!s || s.w !== 40 || s.h !== 32) out.bad.push('crow_' + p); if (s && !p.startsWith('fly') && !feet(s)) out.bad.push('crow_' + p + ' feet'); }
      for (const p of ['idle', 'sniff', 'w1', 'w2', 'run']) { const s = Engine.sprites['rat_' + p]; if (!s || s.w !== 32 || s.h !== 16 || !feet(s)) out.bad.push('rat_' + p); }
      out.pixel = !!SMALLLIFE.stats.pixelArt;
      const c = SMALLLIFE.pxCat; for (const p of ['w1', 'w2', 'run']) { const s = c(p); if (s.w !== 92 || s.h !== 48 || Math.abs(s.hs - 48 / 70) > 1e-9 || !feet(s)) out.bad.push('cat ' + p); }
      out.crowsOn = SMALLLIFE.L.list.length;
      return out;
    });
    ok(sl.bad.length === 0 && sl.pixel, 'crows and rats are pixel art on the stand-ins\' canvases and feet rows; the cat walks side-on at its own pixel size' + (sl.bad.length ? ' ' + sl.bad.join(',') : ''));

    // ---- 4. portraits
    const pt = await page.evaluate(async () => {
      await PORTRAITS.ready();
      const ids = Object.keys(PORTRAITS.MAJOR), faces = Object.keys(PORTRAITS.FACES);
      const missing = []; for (const id of ids) for (const m of PORTRAITS.MOODS) if (!/^data:image\/jpeg/.test(PORTRAITS.variant(id, m) || '')) missing.push(id + ':' + m);
      return { n: ids.length, faces: faces.length, kept: ids.filter(i => !faces.includes(i)), missing };
    });
    ok(pt.missing.length === 0, 'every major face has all four moods');
    ok(pt.faces === 17 && pt.kept.join() === 'sable,harrow,orla', pt.faces + ' of ' + pt.n + ' faces are expression edits; stand-ins kept: ' + pt.kept.join(', '));

    // ---- 5. Original preset: all of it (Phase 20 MAX)
    const orig = await page.evaluate(() => { PRESETS.apply('original'); const r = { icons: GFX.itemIcons, comp: GFX.companionLife, crit: GFX.critters, mood: GFX.moodPortraits }; PRESETS.apply('medium'); return r; });
    // Phase 20 MAX: art is on in every preset, so the Original preset keeps small life (GFX.critters) too; the item icons,
    // companion life and mood portraits have their own switches (GFX.itemIcons / companionLife / moodPortraits), which
    // the presets have never touched.
    ok(orig.crit === true && orig.mood === true && orig.icons === true && orig.comp === true, 'the Original preset treats these switches exactly as before (' + JSON.stringify(orig) + ')');
    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } catch (e) { failed++; console.log('FAIL folk20: ' + (e && e.stack || e)); }
  finally { await browser.close(); }
  if (failed) { console.log(failed + ' FAILED'); process.exit(1); }
  console.log('PASS folk20');
})();
