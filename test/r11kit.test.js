// PREVIEW_URL=http://127.0.0.1:4112 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r11kit.test.js
// R11 phase 1, team KIT (js/r11kit.js): the art of the realistic view. dressMap on Oakhaven returns a group; the cells it
// hides are wall cells only (never a door, never open ground); no kit building intrudes into walkable ground beyond the
// overhang allowance (sampled over every part's box); every map door of a kit building still has a door drawn at it;
// the props stand on solid decos, against walls, or off the paths; other maps get nothing; the Greening build works;
// every viewmodel kind builds; the tiers cut draw calls; no page errors. It renders its own minimal Three.js harness
// (the same axes as R11: x = map x, z = map y, y = game height x ZK) and saves screenshots under army/R11-KIT/ (SHOTS).
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
// the harness canvas, straight to a PNG (a page screenshot waits on the game's own loop under SwiftShader)
const grab = async (page, file) => { const url = await page.evaluate(() => window.__kh.renderer.domElement.toDataURL('image/png')); fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64')); };

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

// the harness, run in the page: a renderer, the sky, sun and fog, plain ground and boxes for whatever KIT does not hide
async function harness() {
  window.__kitH = async function (o) {
    const X = window.R11THREE, THREE = X.THREE, M = 0.1875, ZK = 0.61875;
    let H = window.__kh;
    if (!H) {
      const cv = document.createElement('canvas'); cv.width = o.w; cv.height = o.h;
      cv.style.cssText = `position:fixed;left:0;top:0;width:${o.w}px;height:${o.h}px;z-index:99999`;
      document.body.appendChild(cv);
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1); renderer.setSize(o.w, o.h, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.02;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      const hdr = await new X.HDRLoader().loadAsync('assets/r11/sky/sky_2k.hdr.wasm'); hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(hdr).texture; pm.dispose();
      const tl = new THREE.TextureLoader(), t = (n, s) => { const x = tl.load('assets/r11/tex/cobblestone_floor_08_' + n + '.jpg'); x.wrapS = x.wrapT = THREE.RepeatWrapping; if (s) x.colorSpace = THREE.SRGBColorSpace; return x; };
      const arm = t('arm');
      const cobble = new THREE.MeshStandardMaterial({ map: t('diff', true), normalMap: t('nor'), aoMap: arm, roughnessMap: arm, metalnessMap: arm, metalness: 1, roughness: 0.62, color: 0xb9b4ad, normalScale: new THREE.Vector2(1.4, 1.4) });
      H = window.__kh = { renderer, hdr, env, cobble, THREE, M, ZK };
    }
    return H;
  };
  window.__kitScene = async function (map, tier) {
    const H = await window.__kitH({ w: 1280, h: 800 }), THREE = H.THREE, M = H.M, ZK = H.ZK;
    const scene = new THREE.Scene(); scene.background = H.hdr; scene.environment = H.env; scene.backgroundIntensity = 0.95; scene.environmentIntensity = 1.05;
    scene.fog = new THREE.FogExp2(0x8c9599, 0.0021 / M * 0.6);
    const lights = [];
    const ctx = { scene, THREE, tier, addLight(l, p) { lights.push([l, p]); scene.add(l); } };
    const t0 = performance.now();
    const res = R11KIT.dressMap(map, ctx);
    const ms = performance.now() - t0;
    scene.add(res.group);
    // the ground: cobbles where the map has them, grass elsewhere, water in the Flume
    const W = map.w, C = 1 / M, cob = [], grass = [], water = [];
    for (let y = 0; y < map.h; y++) for (let x = 0; x < W; x++) { const f = map.floorCells ? map.floorCells[y * W + x] : 0; (f === 1 ? cob : f === 2 ? water : grass).push([x, y]); }
    const quads = (list, uvS) => { const P = [], U = [], N = []; for (const [x, y] of list) { const v = [[x, y], [x, y + 1], [x + 1, y + 1], [x, y], [x + 1, y + 1], [x + 1, y]]; for (const [a, b] of v) { P.push(a, 0, b); U.push(a * C / uvS, b * C / uvS); N.push(0, 1, 0); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); return g; };
    const ground = new THREE.Group();
    const gm = new THREE.Mesh(quads(cob, 1.6), H.cobble); gm.receiveShadow = true; ground.add(gm);
    const gg = new THREE.Mesh(quads(grass, 2), new THREE.MeshStandardMaterial({ color: 0x4a5a2c, roughness: 1 })); gg.receiveShadow = true; ground.add(gg);
    const gw = new THREE.Mesh(quads(water, 2), new THREE.MeshStandardMaterial({ color: 0x1f3a2a, roughness: 0.05 })); ground.add(gw);
    gw.position.y = -0.02;
    scene.add(ground);
    // CORE's stand-in: plain boxes for every wall cell KIT did not hide
    const boxG = new THREE.BoxGeometry(1, 1, 1), bm = new Map();
    for (let i = 0; i < map.cells.length; i++) {
      const c = map.cells[i]; if (!c || res.hiddenCells.has(i)) continue;
      if (c.door) continue;
      const top = (c.top == null ? 1 : c.top) * ZK, key = c.tex === 't_hedge' ? 0x2f3d22 : c.tex === 't_stone' ? 0x77736c : 0x8a7f70;
      if (!bm.has(key)) bm.set(key, new THREE.MeshStandardMaterial({ color: key, roughness: 1 }));
      const m = new THREE.Mesh(boxG, bm.get(key)); m.scale.set(1, top, 1); m.position.set(i % W + 0.5, top / 2, ((i / W) | 0) + 0.5); m.castShadow = m.receiveShadow = true; scene.add(m);
    }
    const hemi = new THREE.HemisphereLight(0xcdd6db, 0x51463b, 0.55); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffeeda, 1.35); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const cam = new THREE.PerspectiveCamera(70, 1280 / 800, 0.015, 420);
    window.__ks = { scene, cam, sun, res, ms, lights };
    return { ms, draws: res.stats.draws, hidden: res.hiddenCells.size, stats: res.stats, lights: lights.length };
  };
  window.__kitShot = function (x, y, tx, ty, eye, pitch) {
    const K = window.__ks, H = window.__kh, M = H.M;
    const e = (eye || 1.65) * M;
    K.cam.position.set(x, e, y); K.cam.lookAt(tx, e + (pitch || 0), ty);
    K.sun.position.set(x - 38 * M, 62 * M, y + 26 * M); K.sun.target.position.set(x + (tx - x) * 0.4, 0, y + (ty - y) * 0.4);
    const s = 48 * M; Object.assign(K.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 2 * M, far: 200 * M }); K.sun.shadow.camera.updateProjectionMatrix();
    H.renderer.render(K.scene, K.cam);
    return true;
  };
  window.__kitVM = function (kinds) {
    const H = window.__kh, THREE = H.THREE;
    const scene = new THREE.Scene(); scene.environment = H.env; scene.background = new THREE.Color(0x6d7276);
    const cam = new THREE.PerspectiveCamera(52, 1280 / 800, 0.01, 10);
    const out = [];
    for (const k of kinds) { const v = R11KIT.viewmodel(k); if (v) { v.update(1.0, 0); scene.add(v.group); out.push(k); } }
    H.renderer.autoClear = true; H.renderer.render(scene, cam);
    return out;
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && /r11kit/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.addInitScript(() => { window.__r11 = { automation: true }; });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4112');
    await page.waitForFunction(() => typeof R11KIT !== 'undefined' && window.R11THREE && typeof buildAllMaps === 'function', null, { timeout: 120000 });
    await page.evaluate(harness);
    await page.evaluate(() => { window.__maps = buildAllMaps(); R11KIT.debug = true; });

    // ---- dressMap on Oakhaven, at High
    let r = await page.evaluate(async () => {
      const m = window.__maps.oakhaven, s = await window.__kitScene(m, 'high');
      await R11KIT.ready(); await (window.__ks.res.gltfDone || Promise.resolve());
      const res = window.__ks.res, out = { s, bad: [] };
      out.group = !!(res.group && res.group.isGroup && res.group.children.length);
      for (const i of res.hiddenCells) { const c = m.cells[i]; if (!c || c.door) out.bad.push(i); }
      out.kinds = R11KIT._internal.findBuildings(m).filter((b) => b.doors.length).map((b) => R11KIT._internal.kindOf(b));
      out.replaced = res.replaced.size; out.lights = res.lights.length; out.well = res.wellHouse;
      out.draws = R11KIT.countDraws(res.group);
      return out;
    });
    check(r.group, 'dressMap(oakhaven) returns a group with children (' + r.s.ms.toFixed(0) + ' ms, ' + r.s.stats.buildings + ' buildings, ' + r.s.stats.lots + ' lots, ' + r.s.stats.oaks + ' oaks, ' + r.s.stats.lamps + ' hush-lamps)');
    check(r.s.hidden > 300 && !r.bad.length, 'hiddenCells are wall cells only, never doors or open ground (' + r.s.hidden + ' hidden, ' + r.bad.length + ' bad)');
    check(['chapel', 'greenhall', 'inn'].every((k) => r.kinds.includes(k)), 'the Chapel, the Greenhall and the Boar & Dulcimer are found by their doors (' + r.kinds.filter((k) => k !== 'house' && k !== 'shed').join(', ') + ')');
    check(r.lights >= 20 && r.replaced >= 40, 'hush-lamps light through ctx.addLight and the map\'s oaks, lamps, tables and crates are replaced (' + r.lights + ' lights, ' + r.replaced + ' decos)');

    // ---- what you see is what blocks you: sample every kit part's box against walkable ground
    r = await page.evaluate(() => {
      const m = window.__maps.oakhaven, res = window.__ks.res, C = 1 / 0.1875, W = m.w, out = { bldg: 0, worst: [], props: 0, propBad: [], n: res.boxes.length };
      const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < m.h && !m.isBlocked(x, y);
      // distance (m) from a point to the nearest blocked cell, looking two cells round
      const toBlocked = (px, pz) => { const cx = Math.floor(px / C), cy = Math.floor(pz / C); let best = 1e9; for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) { if (walk(x, y)) continue; const dx = Math.max(x * C - px, 0, px - (x + 1) * C), dz = Math.max(y * C - pz, 0, pz - (y + 1) * C); best = Math.min(best, Math.hypot(dx, dz)); } return best; };
      const solids = (m.entities || []).filter((e) => e.solid && !e.hidden && e.kind === 'deco');
      const inSolidEnt = (px, pz) => solids.some((e) => Math.hypot(px - e.x * C, pz - e.y * C) <= ((e.radius || 0.3) + 0.22) * C + 0.1);
      const doorFronts = []; for (const k in m.doors) { const i = +k, x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(x + dx, y + dy)) doorFronts.push([x + dx, y + dy, dx, dy]); }
      for (const b of res.boxes) {
        const [cat, x0, y0, z0, x1, y1, z1] = b;
        if (cat === 'far' || cat === 'flat') continue;
        const allow = y0 < 2.2 ? 0.6 : y0 < 6 ? 1.25 : 1e9;
        if (allow > 1e8) continue;
        const st = 0.25, nx = Math.max(1, Math.ceil((x1 - x0) / st)), nz = Math.max(1, Math.ceil((z1 - z0) / st));
        let worst = 0, wp = null;
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
          const px = x0 + (x1 - x0) * i / nx, pz = z0 + (z1 - z0) * j / nz, cx = Math.floor(px / C), cy = Math.floor(pz / C);
          if (!walk(cx, cy)) continue;
          const d = toBlocked(px, pz);
          if (cat === 'bldg') { if (d > allow && d > worst) { worst = d; wp = [px / C, pz / C]; } }
          else if (cat === 'prop' || cat === 'tree') { if (d > 1.25 && !inSolidEnt(px, pz) && y0 < 2.2) { worst = Math.max(worst, d); wp = [px / C, pz / C]; } }
          else if (cat === 'open') { if (doorFronts.some(([fx, fy, dx, dy]) => cx === fx && cy === fy && Math.abs((px / C - (fx + 0.5)) * (dy ? 1 : 0) + (pz / C - (fy + 0.5)) * (dx ? 1 : 0)) < 0.25)) { worst = 1; wp = [px / C, pz / C]; } }
        }
        if (worst > 0) { if (cat === 'bldg') { out.bldg++; if (out.worst.length < 4) out.worst.push(cat + ' ' + worst.toFixed(2) + 'm at ' + wp.map((v) => v.toFixed(2))); } else { out.props++; if (out.propBad.length < 4) out.propBad.push(cat + ' at ' + wp.map((v) => v.toFixed(2))); } }
      }
      return out;
    });
    check(r.n > 1000 && r.bldg === 0, 'no kit building part intrudes into walkable ground beyond the overhangs (0.6 m below 2.2 m, 1.25 m up to 6 m; ' + r.n + ' boxes sampled; ' + r.worst.join('; ') + ')');
    check(r.props === 0, 'props stand on the map\'s solid decos or against walls, and nothing sits across a door\'s approach (' + r.propBad.join('; ') + ')');

    // ---- every map door of a kit building still has a door, at its cell
    r = await page.evaluate(() => {
      const m = window.__maps.oakhaven, res = window.__ks.res, C = 1 / 0.1875, W = m.w, out = { n: 0, miss: [], hiddenDoor: 0 };
      for (const k in m.doors) {
        const i = +k, x = i % W, y = (i / W) | 0;
        if (res.hiddenCells.has(i)) out.hiddenDoor++;
        const kit = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => res.hiddenCells.has((y + dy) * W + x + dx));
        if (!kit) continue;
        out.n++;
        const ok = res.doorsDrawn.some(([px, pz]) => px >= x * C - 0.4 && px <= (x + 1) * C + 0.4 && pz >= y * C - 0.4 && pz <= (y + 1) * C + 0.4);
        if (!ok) out.miss.push(x + ',' + y + ' ' + (m.cells[i].label || ''));
      }
      return out;
    });
    check(r.n >= 30 && !r.miss.length && !r.hiddenDoor, 'every map door of a kit building has its door drawn at its cell, and no door cell is hidden (' + r.n + ' doors; missing: ' + r.miss.join('; ') + ')');

    // ---- canon: the Chapel's belfry holds nothing; no castle on the skyline; the landmarks stand where the map raises them
    r = await page.evaluate(() => {
      const res = window.__ks.res, C = 1 / 0.1875;
      return { lm: (res.landmarks || []).map((l) => [l[0], l[1][0] / C, l[1][1] / C, l[2]]) };
    });
    const lm = (n) => r.lm.find((l) => l[0] === n);
    check(lm('chapel tower') && Math.abs(lm('chapel tower')[1] - 49) < 0.6 && Math.abs(lm('chapel tower')[2] - 6) < 0.6, 'the Chapel tower stands where the map raises it (48-49, 5-6)');
    check(lm('greenhall dome') && Math.abs(lm('greenhall dome')[1] - 30.5) < 0.6 && Math.abs(lm('greenhall dome')[2] - 6.5) < 0.6, 'the Greenhall dome stands on the map\'s dome cell (30, 6)');
    check(lm('mooring mast') && Math.abs(lm('mooring mast')[1] - 37) < 0.6 && Math.abs(lm('mooring mast')[2] - 20) < 0.6, 'the mooring mast stands on its block (36-37, 19-20)');
    const src = fs.readFileSync(path.join(ROOT, 'js/r11kit.js'), 'utf8');
    check(!/castle\(/i.test(src) && !/bell\s*=|hangBell|bellMesh/i.test(src), 'no castle builder and nothing hung in the belfry (source check)');

    // ---- screenshots (LOOK at them): the square by day (bench1's kind of view), the inn front, the chapel, the north road, the Teeth
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const views = [['square-day', 21.2, 27.8, 29.3, 17.0], ['inn-front', 27.6, 20.6, 29.6, 16.2, 1.65, 0.05], ['chapel', 48.6, 15.6, 48.9, 8.0, 1.65, 0.1], ['north-road', 23.5, 4.2, 25.0, 15.0], ['greenhall', 27.0, 11.4, 31.0, 6.0, 1.65, 0.16], ['far-north', 23.5, 20.5, 23.0, 1.0, 1.65, 0.08], ['mast', 31.5, 23.5, 37.0, 20.0, 1.65, 0.2]];
      for (const v of views) {
        await page.evaluate((a) => window.__kitShot(a[1], a[2], a[3], a[4], a[5], a[6]), v);
        await grab(page, path.join(SHOTS, 'kit-' + v[0] + '.png'));
      }
    }

    // ---- the viewmodels
    r = await page.evaluate(() => {
      const kinds = ['glass-arm', 'sword', 'longsword', 'knife', 'axe', 'mace', 'maul', 'spear', 'staff', 'pistol', 'crossbow', 'fists', 'blade'];
      const ok = kinds.filter((k) => { const v = R11KIT.viewmodel(k); if (!v || !v.group || !v.group.isObject3D) return false; v.update(0.5, 0); v.update(0.6, 0.4); return v.group.children.length > 0; });
      const map = { sword: R11KIT.kindFor('sword'), longsword: R11KIT.kindFor('longsword'), axe: R11KIT.kindFor('axe'), pistol: R11KIT.kindFor('pistol'), hands: R11KIT.kindFor('hands'), glass: R11KIT.kindFor('glass'), dirk: R11KIT.kindFor('p12_dirk'), nope: R11KIT.kindFor('no_such_thing') };
      const all = Object.keys(WEAPONS).map((id) => R11KIT.kindFor(id));
      return { ok, kinds, map, all };
    });
    check(r.ok.length === r.kinds.length, 'every viewmodel kind builds and updates (' + r.ok.join(', ') + ')');
    check(r.map.sword === 'sword' && r.map.axe === 'axe' && r.map.pistol === 'pistol' && r.map.hands === 'fists' && r.map.dirk === 'knife' && r.map.nope === 'blade' && r.all.every((k) => r.kinds.includes(k)), 'weapons map to kinds from their WEAPONS entries, a generic blade otherwise (' + JSON.stringify(r.map) + ')');
    if (SHOTS) {
      await page.evaluate(() => window.__kitVM(['glass-arm', 'sword'])); await grab(page, path.join(SHOTS, 'kit-vm-sword.png'));
      await page.evaluate(() => window.__kitVM(['glass-arm', 'axe'])); await grab(page, path.join(SHOTS, 'kit-vm-axe.png'));
      await page.evaluate(() => window.__kitVM(['glass-arm', 'pistol'])); await grab(page, path.join(SHOTS, 'kit-vm-pistol.png'));
      // the square with both hands in it, as bench1 frames them
      await page.evaluate(() => {
        const K = window.__ks, H = window.__kh, THREE = H.THREE;
        window.__kitShot(21.2, 27.8, 29.3, 17.0);
        const vs = new THREE.Scene(); vs.environment = H.env; const vc = new THREE.PerspectiveCamera(52, 1280 / 800, 0.01, 10);
        for (const k of ['glass-arm', 'sword']) { const v = R11KIT.viewmodel(k); v.update(1, 0); vs.add(v.group); }
        H.renderer.autoClear = false; H.renderer.clearDepth(); H.renderer.render(vs, vc); H.renderer.autoClear = true; void K;
      });
      await grab(page, path.join(SHOTS, 'kit-square-hands.png'));
    }

    // ---- tiers: draw calls the kit group adds; phone cuts leaves, props' shadows
    r = await page.evaluate(async () => {
      const out = {};
      for (const t of ['ultra', 'high', 'phone']) {
        const res = R11KIT.dressMap(window.__maps.oakhaven, { THREE: window.R11THREE.THREE, tier: t });
        await (res.gltfDone || Promise.resolve());
        let leaves = 0, shadowSmall = 0; res.group.traverse((o) => { if (o.name === 'kit:leaves') leaves = o.count; if (o.userData && o.userData.small && o.castShadow) shadowSmall++; });
        out[t] = { draws: R11KIT.countDraws(res.group), leaves, shadowSmall };
      }
      return out;
    });
    console.log('INFO draw calls by tier: ' + JSON.stringify(r));
    check(r.phone.draws <= 80 && r.phone.leaves < r.high.leaves && r.high.leaves < r.ultra.leaves && r.phone.shadowSmall === 0, 'phone: fewer leaves, no shadows from small props, within budget (draws ' + r.ultra.draws + '/' + r.high.draws + '/' + r.phone.draws + ')');

    // ---- other maps get nothing; the Greening build dresses too
    r = await page.evaluate(() => {
      const out = {};
      for (const id of ['clearing', 'quarry', 'tavern']) { const m = window.__maps[id]; if (!m) continue; const res = R11KIT.dressMap(m, { THREE: window.R11THREE.THREE, tier: 'high' }); out[id] = res.group.children.length + res.hiddenCells.size; }
      const g = buildOakhaven(true), res = R11KIT.dressMap(g, { THREE: window.R11THREE.THREE, tier: 'high' });
      out.green = { hidden: res.hiddenCells.size, oaks: res.stats.oaks, lamps: res.stats.lamps };
      return out;
    });
    check(Object.values(r).filter((v) => typeof v === 'number').every((v) => v === 0), 'other maps get an empty group and hide nothing (' + JSON.stringify(r) + ')');
    check(r.green.hidden > 300 && r.green.oaks > 30 && r.green.lamps === 0, 'the Greening build of Oakhaven dresses too: more oaks, no hush-lamps (' + JSON.stringify(r.green) + ')');
    // ---- French
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/r11-kit.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const texts = await page.evaluate(() => R11KIT.TEXTS);
    check(texts.every((t) => tsv.some((p) => p[0] === t && p[1])), 'every new string has a French pair');
    check(!errors.length, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
  } catch (e) {
    fails++; console.log('FAIL exception: ' + (e && e.stack || e));
  } finally {
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
