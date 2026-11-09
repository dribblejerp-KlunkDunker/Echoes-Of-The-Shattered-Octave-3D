// PREVIEW_URL=http://127.0.0.1:3401 PLAYWRIGHT_MODULE=/path/to/playwright node test/spatial-audio.test.js
// Phase 7 SPATIAL: positional sound and weather layers. Inspects node parameters (pan, gain, cut-off) rather than
// listening, so it needs no sound device; the AudioContext is a real one made by the game's own Audio_.init.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      // count every AudioContext the page makes: the game must stay on its single one
      window.__ctxCount = 0; const AC = window.AudioContext;
      window.AudioContext = function (...a) { window.__ctxCount++; return new AC(...a); };
      window.AudioContext.prototype = AC.prototype;
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3401');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof SPATIAL === 'object');

    // ---- before the first gesture: nothing happens, nothing throws
    const pre = await page.evaluate(() => {
      const r = { ctx: Audio_.ctx };
      try {
        Audio_.sfx.bird(); Audio_.sfx.enemy(ENEMIES.hound, 'alert'); Audio_.sfx.thunder(); Audio_.sfx.rain();
        SPATIAL.tickLayers(0.016); SPATIAL.onFlash(); r.threw = false;
      } catch (e) { r.threw = String(e); }
      r.routed = SPATIAL.stats.routed; r.ctxAfter = Audio_.ctx; r.count = window.__ctxCount;
      return r;
    });
    ok(pre.ctx === null && pre.ctxAfter === null && pre.threw === false && pre.routed === 0 && pre.count === 0, 'before unlock: no context made, nothing routed, no errors');

    // ---- boot a new game (the New Game click unlocks audio through the game's own Audio_.init)
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Spatial Tester');
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

    // ---- the pure maths
    const maths = await page.evaluate(() => {
      const S = SPATIAL, L = { x: 10, y: 10, dir: 0 };
      const right = S.mix(L, { x: 14, y: 13 }, 0), left = S.mix(L, { x: 14, y: 7 }, 0), ahead = S.mix(L, { x: 16, y: 10 }, 0);
      const turned = S.mix({ x: 10, y: 10, dir: Math.PI / 2 }, { x: 7, y: 14 }, 0);   // facing +y: right-hand side is -x
      const near = S.mix(L, { x: 11, y: 10 }, 0), mid = S.mix(L, { x: 18, y: 10 }, 0), far = S.mix(L, { x: 34, y: 10 }, 0);
      const w0 = S.mix(L, { x: 14, y: 10 }, 0), w1 = S.mix(L, { x: 14, y: 10 }, 1), w3 = S.mix(L, { x: 14, y: 10 }, 3);
      return { right: right.pan, left: left.pan, ahead: ahead.pan, turned: turned.pan, near: near.gain, mid: mid.gain, far: far.gain, w0: w0.cutoff, w1: w1.cutoff, w3: w3.cutoff, maxPan: Math.abs(S.mix(L, { x: 10, y: 40 }, 0).pan), atFeet: S.mix(L, { x: 10, y: 10 }, 0).pan };
    });
    ok(maths.right > 0.2 && maths.left < -0.2, 'pan sign follows the source side (right of camera positive, left negative)');
    ok(Math.abs(maths.ahead) < 0.05, 'a source dead ahead is centred');
    ok(maths.turned > 0.2, 'pan follows the camera angle, not the map axes');
    ok(maths.maxPan <= 0.76 && maths.atFeet === 0, 'headphone-friendly: pan never hard-panned, none for a sound at your feet');
    ok(maths.near === 1 && maths.mid < maths.near && maths.far < maths.mid && maths.far >= 0.1, 'gain falls with distance and has a floor');
    ok(maths.w1 < maths.w0 && maths.w3 < maths.w1 && maths.w3 >= 420, 'each wall lowers the low-pass cut-off');

    // ---- real nodes through the real graph
    const rig = await page.evaluate(() => {
      loadMap('oakhaven'); closeModal(); G.state = 'play';
      const m = G.map;
      // find a thin wall with open ground each side along x, for a wall test and a clear test
      let spot = null;
      for (let y = 3; y < m.h - 3 && !spot; y++) for (let x = 4; x < m.w - 6; x++) {
        const open = (a, b) => !m.isSolidCell(a, b) && !m.isBlocked(a, b);
        if (open(x - 3, y) && open(x - 2, y) && open(x - 1, y) && m.isSolidCell(x, y) && !m.isSolidCell(x + 1, y) && open(x + 1, y) && open(x + 2, y) && open(x + 3, y)) { spot = { x, y }; break; }
      }
      return spot;
    });
    ok(!!rig, 'found a wall to test through');
    const live = await page.evaluate((spot) => {
      const out = {}; const S = SPATIAL, c = Engine.cam;
      out.ctxCount = window.__ctxCount; out.state = Audio_.ctx && Audio_.ctx.state;
      const mk = (x, y) => { const e = hydrate({ kind: 'enemy', type: 'hound', x, y }); e.state = 'idle'; G.ents.push(e); return e; };
      const clear = () => { for (const e of G.ents.slice()) if (e.kind === 'enemy') G.ents.splice(G.ents.indexOf(e), 1); };
      G.time += 1; clear();
      c.x = spot.x - 2.5; c.y = spot.y + 0.5; c.dir = 0;               // facing +x, towards the wall
      // clear air: a hound to the right of centre (+y), same side of the wall
      let h = mk(spot.x - 0.5, spot.y + 2.2);
      const before = S.stats.routed;
      Audio_.sfx.enemy(ENEMIES.hound, 'alert');
      out.openRouted = S.stats.routed - before; out.open = S.stats.last && { pan: S.stats.last.pan, gain: S.stats.last.gain, cutoff: S.stats.last.cutoff, walls: S.stats.last.walls, lpNode: S.stats.last.chain.lp.frequency.value, panNode: S.stats.last.chain.pan.pan.value, gainNode: S.stats.last.chain.input.gain.value };
      // left of centre
      clear(); G.time += 1; h = mk(spot.x - 0.5, spot.y - 1.2);
      Audio_.sfx.enemy(ENEMIES.hound, 'alert'); out.leftPan = S.stats.last.chain.pan.pan.value;
      // behind the wall
      clear(); G.time += 1; h = mk(spot.x + 2.5, spot.y + 0.5);
      Audio_.sfx.enemy(ENEMIES.hound, 'alert'); out.walled = { cut: S.stats.last.chain.lp.frequency.value, walls: S.stats.last.walls, gain: S.stats.last.chain.input.gain.value };
      // same distance in the open for comparison
      clear(); G.time += 1; h = mk(spot.x - 7.5, spot.y + 0.5); c.x = spot.x - 12.5 + 5; // keep the same 5-cell gap
      c.x = spot.x - 2.5; h.x = spot.x - 7.5;
      Audio_.sfx.enemy(ENEMIES.hound, 'alert'); out.openCut = S.stats.last.chain.lp.frequency.value;
      // the wall cache: a second sound from the same cell in the same frame is a cache hit
      const hits = S.stats.wallCacheHits; Audio_.sfx.enemy(ENEMIES.hound, 'attack'); out.cacheHits = S.stats.wallCacheHits - hits;
      // a foe acting (enemyUpdate context) wins over the nearest-of-type guess
      clear(); G.time += 1; const a = mk(spot.x - 0.5, spot.y + 2.2), b = mk(spot.x - 0.5, spot.y - 1.2); c.x = spot.x - 2.5; c.y = spot.y + 0.5;
      S.current = b; Audio_.sfx.enemy(ENEMIES.hound, 'alert'); S.current = null; out.ctxPan = S.stats.last.chain.pan.pan.value;
      // sounds with no position stay centred: no chain
      const n0 = S.stats.routed, d0 = S.stats.direct; Audio_.sfx.pickup(); Audio_.sfx.step('stone'); Audio_.sfx.hurt(); Audio_.sfx.door();
      out.centredRouted = S.stats.routed - n0; out.centredDirect = S.stats.direct - d0;
      // a bell with no foe acting is the player's / the world's own: centred
      const n1 = S.stats.routed; Audio_.sfx.bell(); out.bellCentred = S.stats.routed - n1;
      // nested: enemy alert for a core foe calls bell inside; only one chain
      clear(); G.time += 1; const core = hydrate({ kind: 'enemy', type: Object.keys(ENEMIES).find(k => ENEMIES[k].core), x: spot.x - 0.5, y: spot.y + 2.2 }); G.ents.push(core);
      const n2 = S.stats.routed; Audio_.sfx.enemy(core.def, 'alert'); out.nested = S.stats.routed - n2;
      out.ctxCountAfter = window.__ctxCount;
      return out;
    }, rig);
    ok(live.openRouted === 1 && live.open.walls === 0 && live.open.panNode > 0.1, 'a foe to the right pans right on a real StereoPannerNode');
    ok(live.leftPan < -0.1, 'a foe to the left pans left');
    ok(Math.abs(live.open.gainNode - live.open.gain) < 1e-6 && Math.abs(live.open.lpNode - live.open.cutoff) < 1 && live.open.gainNode <= 1, 'chain nodes carry the computed gain and cut-off');
    ok(live.walled.walls >= 1 && live.walled.cut < live.openCut && live.walled.cut <= 3100, 'a wall between listener and foe lowers the low-pass cut-off (' + Math.round(live.walled.cut) + ' vs ' + Math.round(live.openCut) + ' Hz)');
    ok(live.cacheHits >= 1, 'wall rays are cached per source per frame');
    ok(live.ctxPan < -0.1, 'the foe whose update is running is the source, not just the nearest of its kind');
    ok(live.centredRouted === 0, 'sounds with no world position (pickup, step, hurt, door) stay centred and unrouted');
    ok(live.bellCentred === 0, 'a bell with no foe acting stays centred');
    ok(live.nested === 1, 'a core foe\'s alert (enemy -> bell) makes exactly one chain');
    ok(live.ctxCount === 1 && live.ctxCountAfter === 1, 'only the game\'s one AudioContext ever exists (state ' + live.state + ')');

    // ---- setting off: the original graph
    const off = await page.evaluate((spot) => {
      const S = SPATIAL, c = Engine.cam, out = {};
      const ctx = Audio_.ctx; let panners = 0; const cp = ctx.createStereoPanner.bind(ctx);
      ctx.createStereoPanner = () => { panners++; return cp(); };
      const dests = []; const oc = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (d) { if (d === Audio_.sfxBus) dests.push('bus'); return oc.apply(this, arguments); };
      for (const e of G.ents.slice()) if (e.kind === 'enemy') G.ents.splice(G.ents.indexOf(e), 1);
      c.x = spot.x - 2.5; c.y = spot.y + 0.5; c.dir = 0; const h = hydrate({ kind: 'enemy', type: 'hound', x: spot.x - 0.5, y: spot.y + 2.2 }); G.ents.push(h); G.time += 1;
      S.settings.positional = true; Audio_.sfx.enemy(ENEMIES.hound, 'alert'); out.onPanners = panners; out.onDirect = dests.length;
      panners = 0; dests.length = 0; const r0 = S.stats.routed;
      S.settings.positional = false; Audio_.sfx.enemy(ENEMIES.hound, 'alert');
      out.offPanners = panners; out.offRouted = S.stats.routed - r0; out.offBusConnects = dests.length;
      out.proto = AudioNode.prototype.connect !== oc;      // the redirect is never left in place
      AudioNode.prototype.connect = oc; ctx.createStereoPanner = cp; S.settings.positional = true;
      out.restored = AudioNode.prototype.connect === oc && window.setTimeout.toString().includes('[native code]');
      return out;
    }, rig);
    ok(off.onPanners === 1 && off.onDirect === 1, 'positional on: one panner, and only the chain\'s own tail connects to the bus');
    ok(off.offPanners === 0 && off.offRouted === 0 && off.offBusConnects > 0, 'positional off: no panner, no routing, nodes go straight to the bus as in the original');
    ok(off.restored, 'connect and setTimeout are restored after every routed call');

    // ---- weather layers
    const wx = await page.evaluate(() => {
      const S = SPATIAL, out = {}; const L = () => ({ rain: S.layers.rain, wind: S.layers.wind, cut: S.layers.rainCut, indoors: S.layers.indoors });
      S.settings.weather = 2; Audio_.muted && Audio_.toggleMute();
      loadMap('oakhaven'); closeModal(); G.state = 'play';
      Weather.hold('clear'); S.tickLayers(0.1); out.clearOut = L();
      Weather.hold('rain'); S.tickLayers(0.1); out.rainOut = L();
      Weather.hold('storm'); S.tickLayers(0.1); out.stormOut = L();
      loadMap('watchhouse'); closeModal(); G.state = 'play'; Weather.hold('rain'); S.tickLayers(0.1); out.rainIn = L();
      loadMap('catacombs'); closeModal(); G.state = 'play'; Weather.hold('rain'); S.tickLayers(0.1); out.rainUnder = L();
      loadMap('deepwoods'); closeModal(); G.state = 'play'; Weather.hold('storm'); Weather.apply(); S.tickLayers(0.1); out.woodsStorm = L();
      Weather.hold('overcast'); Weather.apply(); S.tickLayers(0.1); out.woodsOver = L();
      loadMap('whispergrove'); closeModal(); G.state = 'play'; Weather.hold('storm'); Weather.apply(); S.tickLayers(0.1); out.grove = L();
      loadMap('oakhaven'); closeModal(); G.state = 'play'; Weather.hold('storm'); Weather.apply(); S.tickLayers(0.1); out.townStorm = L();
      out.built = !!S.nodes;
      Weather.hold('rain'); S.tickLayers(0.1); const normal = S.layers.rain;
      S.settings.weather = 3; S.tickLayers(0.1); out.high = S.layers.rain / normal;
      S.settings.weather = 1; S.tickLayers(0.1); out.low = S.layers.rain / normal;
      S.settings.weather = 0; S.tickLayers(0.1); out.off = L();
      S.settings.weather = 2; Audio_.toggleMute(); S.tickLayers(0.1); out.mutedL = L(); out.muted = Audio_.muted; Audio_.toggleMute();
      S.tickLayers(0.1); out.unmuted = L();
      Weather.hold('clear'); S.tickLayers(0.1); out.stopped = L();
      out.ctxCount = window.__ctxCount;
      return out;
    });
    ok(wx.clearOut.rain === 0 && wx.clearOut.wind === 0, 'clear sky: no rain or wind layer');
    ok(wx.rainOut.rain > 0 && wx.rainOut.indoors === false && wx.rainOut.cut >= 5000, 'rain outdoors: open patter, wide low-pass');
    ok(wx.stormOut.rain > wx.rainOut.rain, 'a storm is louder than rain');
    ok(wx.rainIn.rain > 0 && wx.rainIn.indoors === true && wx.rainIn.cut < 1000 && wx.rainIn.rain < wx.rainOut.rain, 'rain indoors: quieter roof patter behind a closed low-pass');
    ok(wx.rainUnder.rain < wx.rainIn.rain / 4, 'rain underground is barely a rumour');
    ok(wx.woodsStorm.wind > 0 && wx.grove.wind > 0 && wx.townStorm.wind === 0, 'willow wind in the Deep Woods and the Whisper-Grove, not in Oakhaven');
    ok(wx.woodsStorm.wind > wx.woodsOver.wind && wx.woodsOver.wind > 0, 'willow wind follows Weather.wind');
    ok(wx.built, 'the layer graph is built lazily once there is something to hear');
    ok(Math.abs(wx.high - 1.5) < 0.01 && Math.abs(wx.low - 0.5) < 0.01, 'the volume setting scales the layers (low < normal < high)');
    ok(wx.off.rain === 0 && wx.off.wind === 0, 'weather sound Off silences the layers');
    ok(wx.mutedL.rain === 0 && wx.mutedL.wind === 0 && wx.muted === true && wx.unmuted.rain > 0, 'mute silences the layers and unmute brings them back');
    ok(wx.stopped.rain === 0 && wx.stopped.wind === 0, 'layers stop when the weather clears');
    ok(wx.ctxCount === 1, 'weather layers reuse the one AudioContext');

    // ---- thunder follows the flash, by distance; no-flash keeps the sound
    const th = await page.evaluate(() => {
      const S = SPATIAL, out = {}; S.settings.weather = 2; GFX.noFlash = true;
      const n = S.stats.thunders.length;
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0.9 });
      out.scheduled = S.stats.thunders.length - n; const r = S.stats.thunders[S.stats.thunders.length - 1];
      out.delay = r && r.delay; out.dist = r && r.dist;
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0.9 });   // same flash: not a second bolt
      out.dupes = S.stats.thunders.length - n - out.scheduled;
      Engine.setWeather({ haze: 0, dark: 0, cloud: 0, tint: [0, 0, 0], flash: 0 });
      out.noFlash = GFX.noFlash; GFX.noFlash = false;
      // the rumble itself builds on the one context and never throws
      try { S.rumble(2, 1); out.rumble = true; } catch (e) { out.rumble = String(e); }
      // with weather sound off, thunder is left to the original
      S.settings.weather = 0; const m = S.stats.thunders.length; S.onFlash(); out.offScheduled = S.stats.thunders.length - m; S.settings.weather = 2;
      return out;
    });
    ok(th.scheduled === 1 && th.delay > 0.35 && th.delay <= 5 && th.dupes === 0, 'a lightning flash schedules one thunder after a distance delay (' + (th.delay || 0).toFixed(2) + ' s for ' + (th.dist || 0).toFixed(1) + ' units)');
    ok(th.noFlash === true, 'GFX.noFlash was on and the thunder was still scheduled (it only quiets the picture)');
    ok(th.rumble === true, 'the rumble builds without error');
    ok(th.offScheduled === 0, 'weather sound off schedules no thunder of its own');

    // ---- options rows
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const rows = await page.evaluate(() => {
      const q = id => document.getElementById(id); const r = { pos: q('spatial-pos') && q('spatial-pos').textContent, wx: q('spatial-wx') && q('spatial-wx').textContent };
      renderAccessibilityMenu(); r.once = document.querySelectorAll('#spatial-head').length;
      const p = document.querySelector('#modal-panel'); r.fits = p.scrollWidth <= p.clientWidth + 1;
      return r;
    });
    ok(rows.pos === 'On' && rows.wx === 'Normal' && rows.once === 1, 'Options shows Positional sound (On) and Weather sound (Normal), not duplicated on re-render');
    ok(rows.fits, 'the panel has no horizontal overflow');
    await page.locator('#spatial-pos').click(); await page.locator('#spatial-wx').click();
    const after = await page.evaluate(() => ({ pos: SPATIAL.settings.positional, wx: SPATIAL.settings.weather, saved: localStorage.getItem('octave.spatial.v1') }));
    ok(after.pos === false && after.wx === 3 && /"p":0/.test(after.saved), 'the buttons flip the settings and they persist');
    await page.evaluate(() => { SPATIAL.settings.positional = true; SPATIAL.settings.weather = 2; SPATIAL.save(); });

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally {
    await browser.close();
  }
  console.log(fails ? 'FAILED: ' + fails : 'spatial-audio: all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
