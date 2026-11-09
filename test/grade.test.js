// PLAYWRIGHT_MODULE=/path/to/playwright node test/grade.test.js
// Uses the managed preview; never starts a server or writes player saves.
// Regression: the per-area colour grade must never wrap a channel. Saturation
// above 1 once pushed a warm dawn sky past 255 and the overflow spilled into
// the next channel, painting a teal disc around the Deep Woods sun.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof POST !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Grade Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(300);
    const out = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      // synthetic frame of vivid colours through the real grade hook, in the most saturated area/hour
      const vivid = [[255, 128, 0], [255, 220, 40], [0, 200, 255], [255, 0, 0], [40, 255, 60], [250, 180, 120]];
      const fb = new Uint32Array(vivid.length);
      vivid.forEach(([r, g, b], i) => { fb[i] = (255 << 24) | (b << 16) | (g << 8) | r; });
      let worst = 0;
      for (const id of ['deepwoods', 'whispergrove', 'oakhaven', 'clearing']) for (const tod of [0.26, 0.3, 0.5, 0.76]) {
        const f = fb.slice();
        POST.reset(); GFX.grade = true;
        POST.hooks.grade({ fb: f, w: f.length, h: 1, map: G.maps[id], outdoor: true, tod, skyDay: 0.6, S: 1 });
        for (let i = 0; i < f.length; i++) {
          const [r0, g0, b0] = vivid[i], r = f[i] & 255, g = (f[i] >> 8) & 255, b = (f[i] >> 16) & 255;
          // the brightest input channel must stay the brightest-or-equal output channel (no wrap-around)
          const inMax = Math.max(r0, g0, b0), outMax = Math.max(r, g, b);
          const kept = (r0 === inMax ? r : g0 === inMax ? g : b) >= outMax - 1;
          check(kept, id + ' @' + tod + ': colour ' + vivid[i] + ' kept its dominant channel (got ' + [r, g, b] + ')');
          check((f[i] >>> 24) === 255, 'alpha untouched');
          worst = Math.max(worst, Math.abs(r - r0) + Math.abs(g - g0) + Math.abs(b - b0));
        }
      }
      // and the real scene that showed it: Deep Woods at dawn, looking toward the sun
      G.state = 'play'; G.tod = 0.3; Weather.hold('clear'); Weather.tick(1 / 60);
      loadMap('deepwoods', { x: 48.8, y: 11.5, dir: 0 }); G.fadeT = 0; G.player.feet = 1.31; Engine.cam.z = 1.81;
      PRESETS.apply('medium'); Engine.render(G.ents, G.tod);
      const d = Engine.ctx.getImageData(0, 0, 320, 75).data; let teal = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 150 && d[i + 2] > 150 && d[i] < 90) teal++;
      check(teal === 0, 'no teal disc around the dawn sun (' + teal + ' px)');
      return { worst };
    });
    console.log('PASS grade never wraps a colour channel; the Deep Woods dawn sun stays warm', JSON.stringify(out));
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
