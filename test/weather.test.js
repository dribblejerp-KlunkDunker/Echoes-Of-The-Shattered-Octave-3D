// PLAYWRIGHT_MODULE=/path/to/playwright node test/weather.test.js
// Uses the managed preview; never starts a server or writes player saves.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Weather Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(600);
    await page.evaluate(() => { G.state = 'panel'; window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(80);
    const rules = await page.evaluate(() => {
      function check(ok, text) { if (!ok) throw new Error(text); }
      window.wxBase = JSON.parse(JSON.stringify(snapshotGame()));
      window.wxReset = (mapId) => {
        restoreGame(JSON.parse(JSON.stringify(wxBase)));
        if (mapId && mapId !== G.mapId) loadMap(mapId);
        closeModal(); G.state = 'play'; G.opts.touch = 'off'; setTouchMode(false); UPG.tutorial = false; G.keys = {};
        document.querySelector('#msgs').innerHTML = '';
        Weather.set('clear', 4); Weather.release();
      };
      const sheet = () => { G.state = 'panel'; renderCharacter(); return document.querySelector('#modal-panel').innerText; };

      // --- the six states exist and mean what they say
      const names = Object.keys(Weather.STATES);
      check(names.length === 6 && ['clear', 'overcast', 'rain', 'storm', 'mist', 'snow'].every(s => names.includes(s)), 'six weather states are defined');
      check(Weather.STATES.mist.sight < Weather.STATES.rain.sight && Weather.STATES.storm.hear < Weather.STATES.clear.hear, 'mist hides you and rain covers your sound');
      check(Weather.STATES.snow.hear > 1 && Weather.STATES.storm.wind > Weather.STATES.mist.wind, 'snow carries your noise and the storm drives the wind');

      // --- places have their own climates
      check(Weather.climateOf('whispergrove').mist > Weather.climateOf('oakhaven').mist, 'the Spectral Woods are a mistier country than the Reach');
      check(Weather.climateOf('deepwoods').snow > Weather.climateOf('oakhaven').snow, 'the Deep Woods see more snow');
      check(Weather.climateOf('nowhere-at-all').clear > 0, 'unknown places fall back to the Reach climate');

      // --- every state reaches the renderer and the legacy hooks
      wxReset();
      for (const s of names) {
        Weather.set(s, 4); Weather.tick(1 / 60);
        check(Weather.state === s, 'the sky can be ' + s);
        check(Math.abs(UPG.weatherFx.sight - Weather.STATES[s].sight) < 1e-9 && Math.abs(UPG.weatherFx.hear - Weather.STATES[s].hear) < 1e-9, s + ' reaches the perception hooks');
        check(UPG.weather === s, s + ' is what UPG reports');
      }
      // the old four-state names still work for anything that sets them by hand
      UPG.weather = 'fog'; Weather.tick(1 / 60);
      check(Weather.state === 'mist', 'the old name fog still means mist');
      UPG.weather = 'clear'; Weather.tick(1 / 60);
      check(Weather.state === 'clear' && Weather.STATES[Weather.state].sight === 1, 'an outside hand can still hold the sky clear');

      // --- the clock carries the weather
      wxReset(); Weather.release();
      Weather.set('rain', 1);
      Weather.advance(4);
      check(Weather.state !== 'rain' || Weather.left > 0, 'hours passing roll the weather on');
      const rolled = Weather.state;
      Weather.set(rolled, 6); const before = Weather.left;
      Weather.advance(2);
      check(Weather.left < before - 1 && !Weather.pinned, 'time on the road eats into the sky, and unpins a held sky');
      wxReset(); Weather.set('storm', 3); passHours(6);
      check(!Weather.pinned, 'resting and travelling loosen a pinned sky');
      wxReset(); Weather.hold('snow');
      check(Weather.state === 'snow' && Weather.held, 'a sky can be held still on purpose');
      passHours(20);
      check(Weather.state === 'snow' && Weather.held, 'a held sky survives the clock');
      Weather.release(); Weather.advance(1);
      check(!Weather.held && !Weather.pinned, 'releasing it gives the sky back to the world');

      // --- weather is saved, and old saves still read
      wxReset(); Weather.set('snow', 2.5);
      const saved = JSON.parse(JSON.stringify(snapshotGame()));
      check(saved.weather && saved.weather.s === 'snow', 'the sky is part of the save');
      restoreGame(saved); G.state = 'play';
      check(Weather.state === 'snow' && !Weather.pinned, 'the sky comes back with the save');
      const old = JSON.parse(JSON.stringify(saved)); delete old.weather;
      restoreGame(old); G.state = 'play';
      check(Weather.state === 'clear' && Weather.STATES[Weather.state].sight === 1, 'older saves open under clear skies');
      const evil = JSON.parse(JSON.stringify(saved)); evil.weather = { s: '<script>', left: 9999 };
      restoreGame(evil); G.state = 'play';
      check(Weather.state === 'clear', 'a hostile sky is refused');
      const evil2 = JSON.parse(JSON.stringify(saved)); evil2.weather = { s: 'storm', left: -5 };
      restoreGame(evil2); G.state = 'play';
      check(Weather.left > 0 && Weather.left <= 24, 'a hostile sky duration is clamped');

      // --- it reaches the game the player reads
      wxReset(); Weather.set('storm', 3); Weather.tick(1 / 60);
      check(/^storm/.test(weatherLine()), 'the status line names the sky');
      check(/Sky: storm/.test(sheet()), 'the character sheet names the sky');
      check(/minutes of it left/.test(sheet()), 'the sheet says how long it will last');
      closeModal(); G.state = 'play';
      Weather.set('clear', 3); Weather.tick(1 / 60);
      check(!/Sky:/.test(sheet()), 'a clear sky is not worth a line');
      closeModal(); G.state = 'play';

      // --- it changes the road, the belly and the running
      wxReset(); TRAVEL.region = 'reach'; TRAVEL.pace = 'reckless'; TRAVEL.here = [0.2, 0.2];
      Weather.set('clear', 3);
      const dest = travelDestinations('reach').find(d => d.map === 'oakhaven' && d.spawn);
      check(!!dest, 'the gate square is a known destination');
      const clearMins = travelMinutes(dest);
      // The gate square sits inside the Hedge, where nothing troubles anyone: make
      // it a road for the length of this check so the risk maths is actually read.
      const mc = TRAVEL_REGIONS.reach.maps[dest.map], wasSafe = mc.safe;
      mc.safe = false;
      const clearRisk = travelRisk(dest, clearMins);
      Weather.set('storm', 3);
      const stormMins = travelMinutes(dest), stormRisk = travelRisk(dest, stormMins);
      check(stormMins > clearMins, 'a storm makes the same journey longer');
      check(stormRisk > clearRisk, 'and the road more dangerous');
      Weather.set('mist', 3);
      check(travelMinutes(dest) === clearMins && travelRisk(dest, clearMins) > clearRisk, 'mist costs no time but hides the road');
      mc.safe = wasSafe;
      check(Weather.riskFactor() > 1 && Weather.travelFactor() === 1 && clearRisk > 0, 'mist is riskier but no slower, and the fixture was actually read');
      wxReset(); const p = G.player;
      p.needs = true; p.hunger = 100;
      Weather.set('clear', 3); passHours(10);
      const dry = 100 - p.hunger;
      p.hunger = 100; Weather.set('rain', 3); passHours(10);
      const wet = 100 - p.hunger;
      check(wet > dry, 'foul weather makes a traveller hungrier than still air');
      check(Weather.STATES.rain.wet === 1 && Weather.STATES.clear.wet === 0, 'the exposure factor follows the rain');
      wxReset(); const q2 = G.player; q2.needs = true; q2.hunger = 100;
      loadMap('tavern'); Weather.set('rain', 3); passHours(10);
      const indoorDrain = 100 - q2.hunger;
      check(indoorDrain < wet, 'indoors, the rain does not make you hungrier');
      loadMap('oakhaven');

      // --- the renderer takes the sky, and indoors keeps its own air
      let callCount = 0;
      wxReset(); Weather.set('storm', 3); Weather.tick(1 / 60);
      const real = Weather.drawOverlay; let calls = 0;
      Weather.drawOverlay = () => { calls++; return real.apply(Weather); };
      try { Engine.render(G.ents, G.tod); } finally { Weather.drawOverlay = real; }
      check(calls === 1, 'the storm draws its overlay over the view');
      loadMap('tavern'); Weather.set('storm', 3); Weather.tick(1 / 60);
      const ctx = Engine.ctx; let painted = 0;
      const rf = ctx.fillRect.bind(ctx), rs = ctx.stroke.bind(ctx);
      ctx.fillRect = (...a) => { painted++; return rf(...a); };
      ctx.stroke = (...a) => { painted++; return rs(...a); };
      try { real.call(Weather); } finally { ctx.fillRect = rf; ctx.stroke = rs; }
      check(painted === 0, 'indoors the weather paints nothing at all');
      callCount = calls;
      loadMap('oakhaven');
      return { states: names.length, stormMins, clearMins, dry, wet, indoorDrain, overlayCalls: callCount };
    });
    console.log('PASS dynamic weather: states, climates, clock, saves, road, belly and the look', rules);
    await page.evaluate(() => { wxReset(); Weather.set('storm', 3); G.state = 'play'; });
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { G.state = 'panel'; renderCharacter(); });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'character sheet has no horizontal overflow with a sky line');
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS weather readouts hold their layout');
    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
