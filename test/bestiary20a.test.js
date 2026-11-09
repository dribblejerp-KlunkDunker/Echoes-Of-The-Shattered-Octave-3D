// PREVIEW_URL=http://127.0.0.1:4072 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/bestiary20a.test.js
// Phase 20 BEASTA: the hand-built five-angle views of the first half of the bestiary (js/bestiary20a.js,
// atlases in img/bestiary20a/, made by tools/art/bestiary/). Never starts a server or writes saves.
// Screenshots go to BESTIARY_SHOTS (default: the system temp dir), never the repo.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.BESTIARY_SHOTS || path.join(os.tmpdir(), 'bestiary20a-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const MINE = ['aegis', 'briarsprite', 'broodmother', 'captain', 'deacon', 'dirge', 'drowned', 'fretcrawler', 'golem', 'horn', 'hound', 'hushwarden'];
const SIDE_ON = ['briarsprite', 'fretcrawler', 'hound'];

(async () => {
  // ---- the atlases on disk match the cell table (bake output not edited by hand, versions current)
  const src = fs.readFileSync(path.join(ROOT, 'js/bestiary20a.js'), 'utf8');
  const table = JSON.parse(/const ATLAS = ([\s\S]*?);\n\s*\/\/ @@ATLAS-END/.exec(src)[1]);
  assert.deepEqual(Object.keys(table).sort(), MINE, 'one atlas per species of the first half');
  let imgBytes = 0;
  for (const [name, a] of Object.entries(table)) {
    const buf = fs.readFileSync(path.join(ROOT, 'img/bestiary20a', a.f)); imgBytes += buf.length;
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8), a.v, name + ' atlas version is the hash of its file');
    assert.equal(buf[25], 3, name + ' atlas is a palette PNG');
  }
  assert.ok(imgBytes < 2.2 * 1024 * 1024, 'atlases stay small (' + imgBytes + ' bytes)');
  console.log('PASS atlases: 12 files, versions match, palette PNG, ' + imgBytes + ' bytes');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto((process.env.PREVIEW_URL || 'http://127.0.0.1:3000') + '/?nosw=1');
    await page.waitForFunction(() => typeof BESTIARY20A !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 90000 });
    await page.waitForFunction(() => BESTIARY20A.species().every(BESTIARY20A.ready), null, { timeout: 60000 });

    const res = await page.evaluate(({ MINE, SIDE_ON }) => {
      const out = { fails: [] }; const check = (ok, t) => { if (!ok) out.fails.push(t); };
      const hash = sp => { let h = 0; for (let i = 0; i < sp.data.length; i++) h = (Math.imul(h, 31) + sp.data[i]) | 0; return h + ':' + sp.w + 'x' + sp.h; };
      const lum = sp => { let s = 0, n = 0; for (const p of sp.data) if ((p >>> 24) > 100) { s += 0.3 * (p & 255) + 0.59 * ((p >>> 8) & 255) + 0.11 * ((p >>> 16) & 255); n++; } return s / n; };
      const glow = sp => { let n = 0; for (const p of sp.data) { if ((p >>> 24) < 100) continue; const r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if ((mx > 150 && (mx - mn) / mx > 0.5) || 0.3 * r + 0.59 * g + 0.11 * b > 225) n++; } return n; };
      GFX.directions = true; GFX.p20_beastA = true;
      check(JSON.stringify(BESTIARY20A.species()) === JSON.stringify(MINE), 'species list');
      const sp = DIRECTIONS.species();
      for (const s of sp) check(!!s.hand === MINE.includes(s.sprite), s.sprite + ' hand flag');
      check(!sp.some(s => s.hand && s.sprite === 'proctor'), 'the Proctor pilot is not taken over');
      const poses = BESTIARY20A.poses; let frontGlow = 0, backGlow = 0; out.darker = 0;
      for (const name of MINE) {
        const views = new Set();
        for (const p of poses) {
          // (the hound's strike is painted head-on; its other angles are drawn from the wind-up's profile frame)
          const srcP = Engine.sprites[name + p]; check(srcP, name + p + ' source frame');
          for (let v = 1; v <= 4; v++) {
            const srcF = name === 'hound' && p === '_a2' && v < 4 ? Engine.sprites.hound_a1 : srcP;
            const s = DIRECTIONS.view(name, v, p);
            check(s && s.data instanceof Uint32Array && s.data.length === s.w * s.h && s.data.some(q => q >>> 24), name + p + ' view ' + v + ' drawn');
            if (!s) continue;
            // same pixel scale and footing as the frame it stands in for
            check(s.h === srcF.h && Math.abs(s.hs - (srcF.hs || 1)) < 1e-6 && (s.dy || 0) === (srcF.dy || 0), name + p + ' view ' + v + ' keeps height, hs and dy');
            check(s.cx > 0.1 && s.cx < 0.9, name + p + ' view ' + v + ' anchored inside its art');
            check(DIRECTIONS.view(name, v, p) === s, name + p + ' view ' + v + ' is cached (same object)');
            // no stray half-transparent pixels: crisp edges
            check(s.data.every(q => (q >>> 24) === 0 || (q >>> 24) === 255), name + p + ' view ' + v + ' has crisp alpha');
          }
          // the pose survives the turn: walk and strike differ from idle in every view
          if (p) for (let v = 1; v <= 4; v++) check(hash(DIRECTIONS.view(name, v, p)) !== hash(DIRECTIONS.view(name, v, '')), name + p + ' view ' + v + ' differs from idle');
        }
        const front = Engine.sprites[name];
        views.add(hash(front)); for (let v = 1; v <= 4; v++) views.add(hash(DIRECTIONS.view(name, v, '')));
        check(views.size === 5, name + ' has five distinct drawings (' + views.size + ')');
        const back = DIRECTIONS.view(name, 4, '');
        if (lum(back) < lum(front) * 0.92) out.darker++;
        frontGlow += glow(front); backGlow += glow(back);
        // the side-on species: a head-on drawing for view 0, in every pose
        if (SIDE_ON.includes(name)) for (const p of poses) {
          const s0 = BESTIARY20A.view(name, 0, p);
          // the hound has a painting of itself head-on (its lunge): that is its view 0 in every pose
          if (name === 'hound') check(s0 === Engine.sprites.hound_a2, 'hound' + p + ' shows the head-on lunge painting at view 0');
          else check(s0 && hash(s0) !== hash(Engine.sprites[name + p]), name + p + ' has a head-on view 0');
        }
        else check(!BESTIARY20A.front0(name), name + ' keeps its painted front for view 0');
      }
      check(out.darker >= MINE.length - 1, 'backs are darker than fronts (' + out.darker + ')');
      check(backGlow < frontGlow * 0.6, 'backs lose the eyes, cores and lamps (' + backGlow + ' vs ' + frontGlow + ')');
      out.glow = [frontGlow, backGlow];

      // ---- through the engine's chooser: octants, mirroring, the flags
      const cam = { x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir };
      const at = (e, o) => { Engine.cam.x = Math.cos(o * Math.PI / 4) * 3; Engine.cam.y = Math.sin(o * Math.PI / 4) * 3; return animDirectionalSprite(e); };
      for (const name of MINE) {
        const e = { kind: 'enemy', sprite: name, x: 0, y: 0, facing: 0 };
        const f = at(e, 0);
        check(f.sprite === (SIDE_ON.includes(name) ? BESTIARY20A.view(name, 0, '') : Engine.sprites[name]), name + ' octant 0');
        for (let o = 1; o <= 3; o++) { const a = at(e, o), b = at(e, 8 - o); check(a.sprite === b.sprite && !a.flip && b.flip && a.sprite === DIRECTIONS.view(name, o, ''), name + ' octants ' + o + '/' + (8 - o) + ' mirror'); }
        check(at(e, 4).sprite === DIRECTIONS.view(name, 4, ''), name + ' back at octant 4');
        e.animSprite = name + '_w1'; check(at(e, 2).sprite === DIRECTIONS.view(name, 2, '_w1'), name + ' walk frame in the side view');
        e.animSprite = name + '_a2'; check(at(e, 3).sprite === DIRECTIONS.view(name, 3, '_a2'), name + ' strike frame in the back-side view');
      }
      // the flag off: directions.js's own stand-ins, exactly; GFX.directions off: the painted front
      const handHash = hash(DIRECTIONS.view('captain', 3, ''));
      GFX.p20_beastA = false;
      const standIn = DIRECTIONS.view('captain', 3, '');
      check(hash(standIn) !== handHash, 'p20_beastA off gives the stand-in');
      const h0 = { kind: 'enemy', sprite: 'hound', x: 0, y: 0, facing: 0 };
      check(at(h0, 0).sprite === Engine.sprites.hound, 'p20_beastA off: the hound shows its painted side at octant 0 again');
      GFX.p20_beastA = true; GFX.directions = false;
      check(at({ kind: 'enemy', sprite: 'golem', x: 0, y: 0, facing: 0 }, 4).sprite === Engine.sprites.golem, 'GFX.directions off: original sprite');
      check(at(h0, 0).sprite === Engine.sprites.hound, 'GFX.directions off: hound original at octant 0');
      GFX.directions = true;
      // the second half and the pilot pass straight through
      for (const other of ['legionnaire', 'proctor', 'mites', 'hushmoth']) {
        GFX.p20_beastA = false; const a = DIRECTIONS.view(other, 2, ''); GFX.p20_beastA = true; const b = DIRECTIONS.view(other, 2, '');
        check(a === b, other + ' untouched by this module');
      }
      // non-enemies untouched
      check(at({ kind: 'npc', sprite: 'captain', x: 0, y: 0, facing: 0 }, 4).sprite === Engine.sprites.captain, 'an NPC using the art is not turned');
      Object.assign(Engine.cam, cam);
      check(BESTIARY20A.budgetBytes() <= BESTIARY20A.cap, 'cell cache inside its budget');
      // cutting a cell out of a loaded atlas is cheap
      BESTIARY20A.clear(); const t0 = performance.now(); let n = 0;
      for (const name of MINE) for (const p of poses) for (let v = 1; v <= 4; v++) { BESTIARY20A.view(name, v, p); n++; }
      out.cutMs = +((performance.now() - t0) / n).toFixed(3);
      check(out.cutMs < 1, 'a view costs well under a millisecond to cut (' + out.cutMs + ')');
      return out;
    }, { MINE, SIDE_ON });
    assert.deepEqual(res.fails, [], res.fails.slice(0, 20).join('\n'));
    console.log('PASS views: every pose and angle of 12 species, five drawings each, poses kept, backs darker (' + res.darker + '), glow ' + res.glow + ', cut ' + res.cutMs + ' ms, flags restore stand-ins/originals, others untouched');

    // ---- in play: a scene of them, frame cost with and without, a screenshot
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Bestiary Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);
    const perf = await page.evaluate((MINE) => {
      loadMap('clearing', { x: 2.5, y: 2.5, dir: 0 }); G.fadeT = 0;
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy' || e.kind === 'npc') e.hidden = true;
      let spot = null;
      for (let y = 6; y < G.map.h - 2 && !spot; y++) for (let x = 2; x < G.map.w - 12 && !spot; x++) {
        let ok = true; for (let dx = 0; dx <= 9 && ok; dx++) for (let dy = -5; dy <= 0 && ok; dy++) if (G.map.isBlocked(x + dx, y + dy)) ok = false;
        if (ok) spot = { x, y };
      }
      const cam = Engine.cam; cam.x = spot.x + 5; cam.y = spot.y - 4.5; cam.dir = Math.PI / 2;
      const types = {}; for (const k in ENEMIES) if (!types[ENEMIES[k].sprite]) types[ENEMIES[k].sprite] = k;
      const added = [];
      MINE.forEach((sp, i) => {
        const e = hydrate({ kind: 'enemy', type: types[sp], x: spot.x + 0.5 + (i % 6) * 1.6, y: spot.y + 0.5 - Math.floor(i / 6) * 1.2 });
        e.facing = i * 0.7; e.state = 'idle'; G.ents.push(e); added.push(e);
      });
      G.state = 'panel';
      // interleaved rounds, best of each: a busy machine only ever adds time, and it adds it to both
      const burst = () => { const t0 = performance.now(); for (let i = 0; i < 10; i++) Engine.render(G.ents, G.tod); return (performance.now() - t0) / 10; };
      for (let i = 0; i < 10; i++) Engine.render(G.ents, G.tod);
      GFX.p20_beastA = false; for (let i = 0; i < 10; i++) Engine.render(G.ents, G.tod); GFX.p20_beastA = true;
      let on = 1e9, off = 1e9;
      for (let r = 0; r < 12; r++) { on = Math.min(on, burst()); GFX.p20_beastA = false; off = Math.min(off, burst()); GFX.p20_beastA = true; }
      // how much screen the creatures cover each way (a head-on hound is a bigger shape than its flank seen end-on)
      const area = () => { Engine.render(G.ents, G.tod); let a = 0; for (const e of added) if (e._screen) a += (e._screen.x1 - e._screen.x0) * (e._screen.y1 - e._screen.y0); return a; };
      const aOn = area(); GFX.p20_beastA = false; const aOff = area(); GFX.p20_beastA = true;
      // and the chooser's own cost per call
      let t0 = performance.now(); for (let i = 0; i < 2000; i++) for (const e of added) animDirectionalSprite(e); const chooseOn = (performance.now() - t0) / 2000 / added.length * 1000;
      GFX.p20_beastA = false; t0 = performance.now(); for (let i = 0; i < 2000; i++) for (const e of added) animDirectionalSprite(e); const chooseOff = (performance.now() - t0) / 2000 / added.length * 1000; GFX.p20_beastA = true;
      return { on: +on.toFixed(2), off: +off.toFixed(2), n: added.length, areaRatio: +(aOn / aOff).toFixed(3), chooseUs: [+chooseOn.toFixed(2), +chooseOff.toFixed(2)] };
    }, MINE);
    // no work per frame beyond looking a view up: the render may only cost what the drawn area costs
    assert.ok(perf.chooseUs[0] - perf.chooseUs[1] < 5, 'the sprite chooser adds microseconds at most (' + JSON.stringify(perf.chooseUs) + ')');
    assert.ok(perf.areaRatio < 1.15, 'the views cover about the same screen as the stand-ins (' + perf.areaRatio + ')');
    // wall-clock on a shared build machine swings by several ms between bursts (measured per species it goes
    // negative), so this bound only catches a real regression; the two checks above are the precise ones
    assert.ok(perf.on <= perf.off * 1.3 + 1, 'frame cost in line with the stand-ins (' + JSON.stringify(perf) + ')');
    await page.addStyleTag({ content: '#msgs { display: none !important; }' });
    await page.waitForTimeout(800);
    await page.locator('#view').screenshot({ path: path.join(SHOTS, 'bestiary20a-scene.png') });
    console.log('PASS scene: 12 species in play, frame ' + perf.on + ' ms with the views, ' + perf.off + ' ms with stand-ins (area ratio ' + perf.areaRatio + ', chooser ' + perf.chooseUs.join('/') + ' us)');
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS no page errors; screenshot ' + path.join(SHOTS, 'bestiary20a-scene.png'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
