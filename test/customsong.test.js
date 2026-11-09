// PREVIEW_URL=... node test/customsong.test.js — a Song composed in the Spellmaker is actually sung when cast from the
// Song-book or its F-key: castSong reaches executeCustomSong (before Phase 12 the voice was spent and nothing happened).
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof executeCustomSong === 'function' && G.state === 'title' && Engine.sprites.proctor);
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Song Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) { const c = page.locator('#create-panel .list button').first(); if (await c.count()) await c.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click(); }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const check = (ok, l) => { if (!ok) throw new Error(l); };
      G.state = 'play'; const p = G.player;
      for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;   // no quiet nearby to eat the air
      const built = computeCustomSong({ name: 'Test Canticle', note: 0, note2: -1, cadence: 0, dyn: 0 });
      const id = 'custom_test'; SONGS[id] = built; p.customSongs = p.customSongs || {}; p.customSongs[id] = built; if (!p.songs.includes(id)) p.songs.push(id);
      let called = 0; const real = executeCustomSong; executeCustomSong = function (s) { called++; return real.apply(this, arguments); };
      p.voice = p.voiceMax || 100; G.song.t = 0; G.attack.t = 0;
      const v0 = p.voice; castSong(id);
      executeCustomSong = real;
      check(called === 1, 'castSong on a composed Song calls executeCustomSong once (called ' + called + ')');
      check(p.voice < v0, 'the voice is spent');
      // ordinary Songs never go down the custom path
      called = 0; executeCustomSong = function () { called++; }; G.song.t = 0; p.voice = v0; castSong('murmur'); executeCustomSong = real;
      check(called === 0, 'an ordinary Song does not call executeCustomSong');
      return { effects: built.effects, cost: built.cost };
    });
    console.log('PASS customsong ' + JSON.stringify(r));
    if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await b.close(); }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
