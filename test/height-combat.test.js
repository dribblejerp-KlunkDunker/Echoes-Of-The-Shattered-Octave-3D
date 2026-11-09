// PLAYWRIGHT_MODULE=/path/to/playwright node test/height-combat.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Pins the audit fixes: melee and enemy sight respect height (galleries, low
// walls), and GFX.plain() restores the original look after any preset.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PRESETS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Height Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);
    const out = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      const r = {};
      // --- the belfry gallery: a legionnaire on the floor below cannot trade blows with you ---
      loadMap('belfry', { x: 9.4, y: 7.5, dir: Math.PI }); G.state = 'play'; G.fadeT = 0;
      check(G.player.feet > 1.7, 'standing on the gallery');
      const foe = hydrate({ kind: 'enemy', type: 'legionnaire', x: 8.5, y: 7.5 }); G.ents.push(foe);
      foe.state = 'chase'; foe.alertT = 8; foe.cool = 0; foe.facing = 0;
      const hp0 = G.player.hp = G.player.hpMax;
      for (let i = 0; i < 200; i++) { enemyUpdate(foe, 0.05); if (foe.hp <= 0) break; }
      check(G.player.hp === hp0, 'a foe 1.8 below cannot hit you (' + (hp0 - G.player.hp) + ' damage taken)');
      const fhp = foe.hp; G.player.weapon = 0; Engine.cam.dir = Math.PI;
      for (let i = 0; i < 6; i++) { G.attack.t = 0; if (typeof attack === 'function') attack('thrust'); }
      check(foe.hp === fhp, 'your sword does not reach a foe 1.8 below (' + (fhp - foe.hp) + ' damage dealt)');
      r.gallery = { taken: hp0 - G.player.hp, dealt: fhp - foe.hp };
      // ...but on the same floor the fight is on
      G.ents.splice(G.ents.indexOf(foe), 1);
      loadMap('belfry', { x: 3.5, y: 7.5, dir: 0 }); G.state = 'play';
      const foe2 = hydrate({ kind: 'enemy', type: 'legionnaire', x: 4.3, y: 7.5 }); G.ents.push(foe2);
      foe2.state = 'chase'; foe2.alertT = 8; foe2.cool = 0;
      G.player.hp = G.player.hpMax; Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      for (let i = 0; i < 200; i++) enemyUpdate(foe2, 0.05);
      check(G.player.hp < G.player.hpMax, 'a foe on your own level still hits you');
      G.ents.splice(G.ents.indexOf(foe2), 1);
      // --- a save taken while a spawned enemy is still arriving keeps it solid ---
      if (typeof TELEGRAPHS !== 'undefined') {
        loadMap('clearing', { x: 20.5, y: 28.5, dir: 0 }); G.state = 'play';
        const arr = hydrate({ kind: 'enemy', type: 'hound', x: 23.5, y: 28.5 }); arr.state = 'chase'; G.ents.push(arr);
        enemyUpdate(arr, 0.05);
        check(arr._tg && arr.solid === false, 'a mid-play spawn is non-solid while it arrives');
        const snap = snapshotGame(), saved = snap.maps.clearing.extra.find(o => o.type === 'hound' && Math.abs(o.x - arr.x) < 1e-6);
        check(saved && saved.solid === true && arr.solid === false, 'the save records it as solid; the live entrance is untouched');
        G.ents.splice(G.ents.indexOf(arr), 1);
      }
      // --- access settings reach every module: one reduced-motion switch, no lightning flash, muffled sound ---
      GFX.reduceMotion = true; check(GFX.reducedMotion === true, 'reducedMotion and reduceMotion are one switch');
      GFX.reducedMotion = false; check(GFX.reduceMotion === false, 'and either name turns it off');
      loadMap('clearing', { x: 20.5, y: 28.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
      const skyLum = () => { Engine.render(G.ents, G.tod); const d = Engine.ctx.getImageData(0, 0, 320, 30).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4); };
      Engine.setWeather({}); const calm = skyLum();
      Engine.setWeather({ flash: 1 }); const lit = skyLum();
      GFX.noFlash = true; Engine.setWeather({ flash: 1 }); const unlit = skyLum(); GFX.noFlash = false; Engine.setWeather({});
      check(lit > calm + 20 && Math.abs(unlit - calm) < 2, 'No flashes removes the lightning flash (' + calm.toFixed(0) + ' / ' + lit.toFixed(0) + ' / ' + unlit.toFixed(0) + ')');
      if (typeof FEEL !== 'undefined' && Audio_.muffle) {
        Audio_.muffle(0); check(Audio_.muffled === 0, 'sound starts clear');
        FEEL.deafen(2, false);
        for (let i = 0; i < 20; i++) update(0.05);
        check(!FEEL.deafen || Audio_.muffled > 0.3, 'deafness muffles the sound (' + Audio_.muffled.toFixed(2) + ')');
      }
      // --- sight over a knee-high wall, not through a full one ---
      loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play';
      check(los(12.5, 11.5, 12.5, 7.5), 'you and a patrol see each other over the knee-high field wall');
      check(!los(9.5, 15.5, 13.5, 15.5) || !G.map.isSolidCell(10, 15), 'a full wall still blocks sight');
      check(!los(7.5, 16.5, 12.5, 16.5), "Kaelen's hut blocks sight");
      // --- GFX.plain() after any preset is the original look ---
      loadMap('tavern', { x: 8.5, y: 10.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
      const hash = () => { Engine.render(G.ents, G.tod); let h = 0; const d = Engine.ctx.getImageData(0, 0, 320, 150).data; for (let i = 0; i < d.length; i += 4) h = (Math.imul(h, 31) + d[i] + (d[i + 1] << 8) + (d[i + 2] << 16)) | 0; return h; };
      // Phase 20 MAX: the Original preset keeps the hand-built art on, so plain() (everything off) has its own reference frame
      PRESETS.apply('original'); const base = hash(); GFX.plain(); Engine.setScale(1); const plainBase = hash(); PRESETS.apply('original');
      for (const name of ['low', 'high', 'medium']) {
        PRESETS.apply(name); GFX.plain();
        // plain() keeps the render resolution (a display choice); everything else is original
        check(Engine.getScale() === GFX.scale, 'GFX.plain() after ' + name + ' keeps the chosen resolution');
        Engine.setScale(1);
        check(hash() === plainBase, 'GFX.plain() after ' + name + ' gives the plain frame (view distance and particles reset)');
        PRESETS.apply('original');
        check(Engine.getScale() === 1 && Engine.canvas.width === 320 && hash() === base, "PRESETS.apply('original') after " + name + ' restores everything, 1x included');
      }
      // --- dark interiors: off in Low, and a switch of its own ---
      PRESETS.apply('low'); check(GFX.darkInteriors === false, 'Low keeps interiors at their original brightness');
      PRESETS.apply('medium'); check(GFX.darkInteriors === true, 'Medium darkens interiors');
      G.state = 'panel'; renderAccessibilityMenu();
      const sw = document.getElementById('gfx-dark'); check(!!sw && sw.textContent === 'On', 'the Graphics block has a Dark interiors switch');
      sw.click(); check(GFX.darkInteriors === false && document.getElementById('gfx-dark').textContent === 'Off', 'the switch turns dark interiors off');
      closeModal(); G.state = 'play';
      return r;
    });
    console.log('PASS height-aware melee and sight, GFX.plain() restores the original look, dark-interior switch', JSON.stringify(out));
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
