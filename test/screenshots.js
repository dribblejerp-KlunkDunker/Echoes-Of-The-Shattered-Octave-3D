// PLAYWRIGHT_MODULE=/path/to/playwright node test/screenshots.js
// Uses the managed preview; never starts a server. Stages illustrative scenes
// in authored maps using real feature logic/UI, not painted or synthetic UI.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = path.join(__dirname, '..', 'screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Rowan');
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
    await page.evaluate(() => {
      G.state = 'panel';
      window.gallerySave = JSON.parse(JSON.stringify(snapshotGame()));
      // Freeze only this disposable capture page; step/render scenes explicitly
      // so UI and simulation timers cannot race the screenshot.
      window.requestAnimationFrame = () => 0;
      // these scenes show other features; keep the area loading cards (js/screens.js) out of them
      if (typeof GFX !== 'undefined') GFX.illustratedScreens = false;
    });
    await page.waitForTimeout(100); // drain the single already-queued frame
    await page.evaluate(() => {
      window.galleryScene = id => {
        restoreGame(JSON.parse(JSON.stringify(gallerySave)));
        loadMap(id); closeModal(); G.state = 'play';
        G.opts.touch = 'off'; setTouchMode(false); controlsTick();
        UPG.weather = 'clear'; UPG.weatherFx = { sight: 1, hear: 1 };
        UPG.tutorial = false; G.fadeT = 0; G.noise = 1; G.tod = 0.5;
        G.keys = {}; G.vel.x = G.vel.y = 0; G.touch.fx = G.touch.fy = 0;
        document.querySelector('#msgs').innerHTML = '';
        document.querySelector('#hint').textContent = '';
        document.querySelector('#cover-status').hidden = true;
        document.querySelector('#lockhint').classList.remove('on');
        for (const e of G.ents) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
      };
    });
    const capture = async (name, expectedPanel, heading, scrollable = false) => {
      if (expectedPanel) {
        assert.equal(await page.evaluate(() => G.openPanel), expectedPanel);
        await page.locator('#modal-panel h2').filter({ hasText: heading }).waitFor({ state: 'visible' });
        assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, name + ' has no horizontal overflow');
        if (!scrollable) assert.equal(await page.locator('#modal-panel button:enabled').evaluateAll(buttons => buttons.every(b => {
          const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
        })), true, name + ' actions are visible');
      }
      const file = path.join(output, name + '.png');
      await page.locator('#game').screenshot({ path: file });
      const bytes = fs.readFileSync(file);
      assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
      assert.equal(bytes.readUInt32BE(16), 1280);
      assert.equal(bytes.readUInt32BE(20), 800);
      assert(bytes.length > 5000, name + ' contains rendered content');
      console.log('PASS ' + path.relative(process.cwd(), file) + ' (1280x800, ' + bytes.length + ' bytes)');
    };

    await page.evaluate(() => {
      galleryScene('oakhaven');
      Object.assign(Engine.cam, { x: 23.5, y: 22.25, dir: Math.PI / 2, pitch: 0, bob: 0 });
      const e = G.ents.find(e => e.id === 'bettany');
      Object.assign(e, { x: 23.5, y: 23.5, facing: Math.PI / 2, hidden: false });
      G.player.skills.Stealth = 35; render(); openPickpocket();
    });
    await capture('stealth-pickpocket', 'pickpocket', 'A hand near the purse');

    await page.evaluate(() => {
      galleryScene('oakhaven');
      Object.assign(Engine.cam, { x: 23.5, y: 22.5, dir: Math.PI / 2, pitch: 0, bob: 0 });
      const guard = G.ents.find(e => e.lawGuard);
      Object.assign(guard, { x: 26.5, y: 27.5, hidden: false });
      render(); openDistractions();
    });
    await capture('stealth-distractions', 'distractions', 'A noise elsewhere');

    await page.evaluate(() => {
      galleryScene('oakhaven');
      const recess = G.ents.find(e => e.bodyCover);
      Object.assign(Engine.cam, { x: recess.x - 1, y: recess.y, dir: 0, pitch: 0, bob: 0 });
      if (solidAt(Engine.cam.x, Engine.cam.y, null)) throw new Error('Body scene camera must be on clear floor');
      const source = hydrate({ kind: 'enemy', type: 'proctor', x: recess.x - 0.2, y: recess.y });
      const body = animSpawnDeath(source); animDying(body, 2); G.dragBody = body;
      render(); openBody();
      if (document.querySelector('#body-hide').disabled) throw new Error('Concealment must be available in the screenshot');
    });
    await capture('stealth-body-hiding', 'body', 'What the patrol will find');

    await page.evaluate(() => {
      galleryScene('quarry');
      G.give('a_synodrobe'); equipArmor('a_synodrobe');
      document.querySelector('#msgs').innerHTML = ''; render(); openDisguise();
    });
    await capture('stealth-disguise', 'disguise', 'The borrowed registry');

    await page.evaluate(() => {
      closeModal(); G.state = 'panel'; renderInventory();
    });
    assert((await page.locator('.paper-doll svg title').textContent()).includes('Synod Clerk Robes'));
    // Inventory may scroll by design; verify the robe and paper doll, rather
    // than requiring every inventory action on one screen.
    await page.locator('.paper-doll').waitFor({ state: 'visible' });
    await capture('stealth-robes', 'inv', 'Inventory', true);

    await page.evaluate(() => {
      galleryScene('quarry'); G.give('a_synodrobe'); equipArmor('a_synodrobe');
      // Find a clear lane in an authored room, keeping walls/scenery intact.
      let scene = null;
      for (const room of G.map.rooms) {
        for (let y = room.y + 1; y < room.y + room.h - 1 && !scene; y++) {
          for (let x = room.x + 1; x < room.x + room.w - 3 && !scene; x++) {
            if ([0, 1, 2, 3].every(d => !solidAt(x + d + 0.5, y + 0.5, null))) scene = { x: x + 0.5, y: y + 0.5 };
          }
        }
        if (scene) break;
      }
      if (!scene) throw new Error('No clear inspection lane');
      Object.assign(Engine.cam, { ...scene, dir: 0, pitch: 0, bob: 0 });
      const guard = hydrate({ kind: 'enemy', type: 'proctor', x: scene.x + 2.2, y: scene.y, guard: true });
      G.ents.push(guard); G.coverSuspicion = 1.5; G.player.crime = {}; update(0);
      document.querySelector('#msgs').innerHTML = ''; render(); G.state = 'panel';
      if (!document.querySelector('#cover-status').textContent.includes('INSPECTION 50%')) throw new Error('Inspection screenshot must show live suspicion');
      if (!guard._screen) throw new Error('Inspection patrol must be rendered');
    });
    await page.locator('#cover-status').waitFor({ state: 'visible' });
    await capture('stealth-inspection');

    // --- travel, the watch's socials, and opt-in journey needs (feel systems)
    await page.evaluate(() => {
      closeModal(); galleryScene('oakhaven');
      Object.assign(Engine.cam, { x: 23.5, y: 17.5, dir: -Math.PI / 2, pitch: 0, bob: 0 });
      const guard = G.ents.find(e => e.lawGuard);
      if (!guard) throw new Error('No watch constable in Oakhaven');
      Object.assign(guard, { x: 23.5, y: 15.4, hidden: false });
      G.player.gold = 100; crimeState().bounty = 40;
      render(); renderArrest();
      const bribe = document.querySelector('#crime-bribe');
      if (!bribe || bribe.disabled) throw new Error('Bribe must be affordable in the screenshot');
      if (!/%/.test(document.querySelector('.watch-social').textContent)) throw new Error('Watch socials must show live odds');
    });
    await capture('watch-bargain', 'arrest', 'The Oakhaven watch');

    await page.evaluate(() => {
      closeModal(); galleryScene('oakhaven');
      const stall = G.ents.find(e => e.use === 'stable');
      if (!stall) throw new Error('No stable in Oakhaven');
      // Stand back across the lane from the sign, with the gate crowd in shot.
      Object.assign(Engine.cam, { x: stall.x - 3.5, y: stall.y + 0.6, dir: 0, pitch: 0, bob: 0 });
      for (const e of G.ents) if (e.kind === 'npc') e.hidden = false;
      G.player.gold = 100; render(); openStable();
      if (document.querySelector('#stable-rent').disabled) throw new Error('Hire must be affordable in the screenshot');
    });
    await capture('stables', 'stable', 'The North Gate stables');

    await page.evaluate(() => {
      document.querySelector('#stable-rent').click();
      if (!horseActive()) throw new Error('Hiring at the stable must activate the horse');
      // This capture page renders no frames, so it never records walked ground.
      // Record the ground around the camera, as the running game would have.
      G.map.visited.fill(0);
      const cx = Engine.cam.x | 0, cy = Engine.cam.y | 0;
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && y >= 0 && x < G.map.w && y < G.map.h) G.map.visited[y * G.map.w + x] = 1;
      }
      G.player.needs = true; G.player.hunger = 74; G.player.sleep = 61;
      travelOpen();
      const dest = travelDestinations(TRAVEL.region).find(d => d.state === 'ok');
      if (!dest) throw new Error('No reachable destination for the travel screenshot');
      travelSelect(dest);
      const text = document.querySelector('#modal-panel').innerText;
      if (!/roan mare/i.test(text) || !/Hunger \d+\/100/.test(text)) throw new Error('Travel panel must show the horse and journey needs');
    });
    const regionName = await page.evaluate(() => TRAVEL_REGIONS[TRAVEL.region].name);
    await capture('travel-mounted', 'travel', regionName);

    await page.evaluate(() => {
      travelClose(); G.state = 'panel';
      G.player.fat = G.player.fatMax * 0.62; renderCharacter();
      if (!/Hunger 74\/100/.test(document.querySelector('#modal-panel').innerText)) throw new Error('Character sheet must show journey needs');
    });
    await capture('journey-needs', 'char', 'Rowan', true);

    await page.evaluate(() => { closeModal(); G.state = 'panel'; renderMenu(); });
    await capture('journey-needs-menu', 'menu', 'Options');

    // --- hardcore runs: one save, and the screen that ends it
    await page.evaluate(() => {
      closeModal(); galleryScene('oakhaven');
      G.player.hardcore = true; HARDCORE.save = null; G.player.gold = 40;
      renderSave();
      const btn = document.querySelector('#hc-save');
      if (!btn || !/Save the run/.test(btn.textContent)) throw new Error('A hardcore run must start with no save');
      if (document.querySelector('#savecode')) throw new Error('A hardcore run must not offer a save code');
      btn.click();
      if (!HARDCORE.save) throw new Error('Saving must write the run');
    });
    await capture('hardcore-save', 'save', 'Save game');

    await page.evaluate(() => {
      closeModal(); G.state = 'play';
      G.player.hardcore = true; HARDCORE.save = snapshotGame();
      die('Cacophony hound');
      const text = document.querySelector('#death-text').textContent;
      if (!/Hardcore/.test(text)) throw new Error('The death screen must say the run is over');
      if (document.querySelector('#btn-wake').hidden !== true) throw new Error('Hardcore death must hide the lamp');
      if (HARDCORE.save !== null) throw new Error('Hardcore death must destroy the run save');
    });
    await capture('hardcore-run-over');

    // --- the sky: hills and mountains, and the weather that walks over them
    await page.evaluate(() => {
      // the hardcore scene is over: put the run and the death screen back to normal
      hide('#death'); G.dead = false; G.player.hardcore = false; HARDCORE.save = null;
      closeModal(); galleryScene('oakhaven');
      G.tod = 0.5;
      Weather.hold('storm'); Weather.tick(1 / 60);
      Object.assign(Engine.cam, { x: 23.5, y: 22.5, dir: -Math.PI / 2, pitch: 0, bob: 0 });
      render();
      if (!/storm/.test(weatherLine())) throw new Error('The storm scene must be held under a storm');
      document.querySelector('#msgs').innerHTML = 'A storm walks up the river. The road will be slow, and loud, and lit in pieces.';
    });
    await capture('weather-storm');

    await page.evaluate(() => {
      closeModal(); galleryScene('oakhaven');
      G.tod = 0.27;
      Weather.hold('clear'); Weather.tick(1 / 60);
      Object.assign(Engine.cam, { x: 23.5, y: 22.5, dir: 0, pitch: 0, bob: 0 });
      render();
      if (!/clear/.test(weatherLine())) throw new Error('The dawn scene must be held clear');
      document.querySelector('#msgs').innerHTML = 'Light comes up behind the Grey Teeth. The town smells of wet grass and woodsmoke.';
    });
    await capture('weather-dawn-hills');

    await page.evaluate(() => {
      closeModal(); galleryScene('oakhaven');
      G.tod = 0.42;
      Weather.hold('mist'); Weather.tick(1 / 60);
      Object.assign(Engine.cam, { x: 23.5, y: 20.5, dir: Math.PI / 2, pitch: 0, bob: 0 });
      render();
      if (Weather.STATES.mist.sight >= 1) throw new Error('Mist has to hide you');
      document.querySelector('#msgs').innerHTML = 'A sea-fog walks up the river and sits down in the streets. They will not see you coming.';
    });
    await capture('weather-mist');

    await page.evaluate(() => {
      closeModal(); galleryScene('clearing');
      Object.assign(Engine.cam, { x: 30.6, y: 18.8, dir: -0.25, pitch: 0, bob: 0 });
      Engine.cam.z = (G.map.lvlAt(30.6, 18.8) || 0) + 0.5;
      render();
      if (!G.map.lvls || Math.abs(G.map.lvlAt(28, 18) - 1.2) > 1e-6) throw new Error('The Watch-stone must be standing on real ground');
      document.querySelector('#msgs').innerHTML = 'The Watch-stone: the meadow is a long way down from the top of the steps.';
    });
    await capture('terrain-watch-stone');

    // --- relief: towers over roofs, low walls, a timber stand, walkable hills
    const reliefScene = async (name, id, cam, check, caption) => {
      await page.evaluate(([id, cam, check, caption]) => {
        closeModal(); galleryScene(id); G.tod = 0.5;
        Weather.hold('clear'); Weather.tick(1 / 60);
        loadMap(id, { x: cam.x, y: cam.y, dir: cam.dir }); G.state = 'play'; G.fadeT = 0;
        for (const e of G.ents) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
        if (cam.feet != null) { G.player.feet = cam.feet; Engine.cam.z = cam.feet + 0.5; }
        Engine.cam.pitch = cam.pitch || 0; Engine.cam.bob = 0;
        render();
        if (!new Function('return (' + check + ')')()) throw new Error('Relief scene check failed: ' + check);
        document.querySelector('#msgs').innerHTML = caption;
      }, [id, cam, check, caption]);
      await capture(name);
    };
    await reliefScene('relief-chapel-tower', 'oakhaven', { x: 44.5, y: 13.5, dir: -1.2 },
      "G.map.relief && G.map.get(48, 5).top > 3", 'The Chapel of the Carillon: its bell-tower stands over every roof in Oakhaven.');
    await reliefScene('relief-field-wall', 'clearing', { x: 12.5, y: 12.5, dir: -2.2 },
      "G.map.get(12, 9).top < 0.5 && solidAt(12.5, 9.5, null)", 'A dry-stone field wall, knee-high: you see over it, you do not walk through it.');
    await reliefScene('relief-hound-stand', 'clearing', { x: 36.2, y: 22.5, dir: 3.4, feet: 1.2 },
      "Math.abs(G.map.lvlAt(36.5, 22.5) - 1.2) < 1e-6", 'From the hound-watch stand the Watch-stone is level with your boots.');
    await reliefScene('relief-deepwoods-rise', 'deepwoods', { x: 44.5, y: 11.5, dir: 3.0, feet: 1.0 },
      "G.map.smooth && G.map.gradeAt(44.5, 11.5) > 0.05", 'Over the willow rise: the Mausoleum tower is real stone now, seen from wherever you stand.');
    await reliefScene('relief-crag', 'deepwoods', { x: 42.5, y: 30.5, dir: 0.3 },
      "G.map.gradeAt(48, 30.5) > MAX_GRADE", 'The crag: bare rock on every flank, too steep to climb, and a long tumble down.');
    assert.deepEqual(errors, [], 'capture has no browser runtime errors');
    console.log('PASS twenty-two feature screenshots captured from the managed preview');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
