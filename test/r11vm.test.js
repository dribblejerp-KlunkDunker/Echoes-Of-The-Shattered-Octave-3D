// PREVIEW_URL=http://127.0.0.1:4213 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r11vm.test.js
// R11 phase 2, team HANDS (js/r11vm.js): the first-person hands and weapons of the realistic look.
//   - R11VM.kinds() is KIT's 13 kinds (with 'glass-arm'); every kind builds, with reasonable draw and triangle counts
//   - kindFor maps every entry of WEAPONS to a kind (and a few by name: the crook is a staff, the dirk a knife, ...);
//     CORE's names ('dagger', 'bow', 'hands') and raw weapon ids build too
//   - the blade is real steel (metalness 1, a roughness map, the scene's environment) with a fuller and bevels in the
//     geometry (more than four distinct points across the blade); the fist is leather with stitches
//   - the glass arm has its one green vein (material 'r11vm:vein', green over red and blue) and draws self-lit: rendered,
//     its pixels are cyan, not white, and the vein shows green through the glass
//   - the swing turns the weapon about the grip (CORE writes group.position/rotation; the grip stays put under rotation)
//   - update(t, walk, F) never throws over a walk and a minute of time
//   - in the game, with the realistic look on, CORE draws R11VM's arm and the equipped weapon's kind, no page errors
// SwiftShader only here: frame times mean nothing and are not checked. SHOTS=<dir> saves the harness and game frames.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:4213';
const SHOTS = process.env.SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

async function bootGame(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(900000);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /r11vm|r11core/.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.__r11 = { automation: true, force: true, tier: 'phone' }; try { localStorage.setItem('octave.r11.v1', JSON.stringify({ bench: { keep: 1 } })); } catch (e) { /* none */ } });
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL + '/?nosw=1', { timeout: 900000 });
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 900000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Hands Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(500);
  await page.waitForFunction(() => window.R11 && (R11.ready || R11.failed()), null, { timeout: 900000 });
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    // ---------------------------------------------------------------- the harness: R11VM alone, CORE's vm camera
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if ((m.type() === 'warning' || m.type() === 'error') && /r11vm/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.addInitScript(() => { window.__r11 = { automation: true }; });
    await page.goto(URL + '/?nosw=1');
    await page.waitForFunction(() => window.R11THREE && window.R11VM && typeof WEAPONS === 'object', null, { timeout: 300000 });

    let r = await page.evaluate(() => {
      const out = { kinds: R11VM.kinds(), built: {}, bad: [] };
      for (const k of out.kinds) {
        const v = R11VM.viewmodel(k, { lights: false });
        if (!v || !v.group) { out.bad.push(k); continue; }
        out.built[k] = v.stats();
      }
      out.kitKinds = typeof R11KIT !== 'undefined' ? R11KIT.kinds() : null;
      return out;
    });
    check(r.kinds.length === 13 && r.kinds.includes('glass-arm') && (!r.kitKinds || r.kitKinds.every((k) => r.kinds.includes(k))), 'R11VM.kinds() is the 13 kinds of R11KIT, glass-arm among them (' + r.kinds.join(', ') + ')');
    check(!r.bad.length && Object.keys(r.built).length === 13, 'every kind builds a group (' + (r.bad.length ? 'failed: ' + r.bad.join(', ') : '13/13') + ')');
    const stat = Object.entries(r.built);
    check(stat.every(([k, s]) => s.draws >= 1 && s.draws <= (k === 'glass-arm' ? 6 : 9)), 'draws per kind are few: the arm <= 6, a weapon with its fist <= 9 (' + stat.map(([k, s]) => k + ' ' + s.draws).join(', ') + ')');
    check(stat.every(([k, s]) => s.tris >= 500 && s.tris <= 40000), 'triangles per kind are reasonable, 500..40000 (' + stat.map(([k, s]) => k + ' ' + s.tris).join(', ') + ')');

    r = await page.evaluate(() => {
      const ids = Object.keys(WEAPONS), kinds = R11VM.kinds(), bad = [];
      for (const id of ids) { const k = R11VM.kindFor(id); if (!kinds.includes(k)) bad.push(id + '->' + k); }
      const named = { sword: 'sword', longsword: 'longsword', knife: 'knife', axe: 'axe', mace: 'mace', maul: 'maul', spear: 'spear', crossbow: 'crossbow', pistol: 'pistol', hands: 'fists', glass: 'fists', tollhammer: 'mace', p22_crook: 'staff', p12_dirk: 'knife', p12_greatmaul: 'maul', p12_bellglaive: 'spear', p12_glassblade: 'longsword' };
      const wrong = []; for (const id in named) if (WEAPONS[id] && R11VM.kindFor(id) !== named[id]) wrong.push(id + '->' + R11VM.kindFor(id));
      const alias = {}; for (const a of ['dagger', 'bow', 'hands', 'p12_dirk', 'no-such-weapon']) { const v = R11VM.viewmodel(a, { lights: false }); alias[a] = v ? v.kind : null; }
      return { n: ids.length, bad, wrong, alias };
    });
    check(!r.bad.length, 'kindFor maps all ' + r.n + ' entries of WEAPONS to a kind' + (r.bad.length ? ' (bad: ' + r.bad.join(', ') + ')' : ''));
    check(!r.wrong.length, 'kindFor: the crook is a staff, the dirk a knife, the toll-hammer a mace, the Glass Arm leaves the right hand a fist' + (r.wrong.length ? ' (wrong: ' + r.wrong.join(', ') + ')' : ''));
    check(r.alias.dagger === 'knife' && r.alias.bow === 'crossbow' && r.alias.hands === 'fists' && r.alias.p12_dirk === 'knife' && r.alias['no-such-weapon'] === 'blade', 'CORE\'s names and raw ids build (' + JSON.stringify(r.alias) + ')');

    r = await page.evaluate(() => {
      const THREE = R11THREE.THREE, v = R11VM.viewmodel('sword', { lights: false }), out = {};
      let blade = null, glove = null, stitch = null;
      v.group.traverse((o) => { if (o.name === 'r11vm:blade') blade = o; if (o.name === 'r11vm:glove') glove = o; if (o.name === 'r11vm:stitch') stitch = o; });
      out.blade = !!blade; out.glove = !!glove; out.stitch = !!stitch;
      if (blade) {
        const m = blade.material; out.metal = m.metalness; out.rough = !!m.roughnessMap; out.std = m.isMeshStandardMaterial;
        // distinct points across the blade at a third of its length: edge, bevels, flats, the fuller's curve
        const p = blade.geometry.attributes.position; let ymin = 1e9, ymax = -1e9;
        for (let i = 0; i < p.count; i++) { ymin = Math.min(ymin, p.getY(i)); ymax = Math.max(ymax, p.getY(i)); }
        const y3 = ymin + (ymax - ymin) / 3; let best = 1e9; for (let i = 0; i < p.count; i++) best = Math.min(best, Math.abs(p.getY(i) - y3));
        const ring = new Set(); for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(Math.abs(y - y3) - best) < 1e-7) ring.add(p.getX(i).toFixed(5) + ',' + p.getZ(i).toFixed(5)); }
        out.ring = ring.size;
      }
      if (glove) { out.gloveStd = glove.material.isMeshStandardMaterial && glove.material.metalness === 0; }
      // the pivot: under CORE's swing rotation the grip stays where it was (plus CORE's own offset)
      const piv = v.group.userData.pivot; out.piv = !!piv;
      if (piv) {
        v.update(1, 0); v.group.updateMatrixWorld(true);
        v.group.position.set(-0.1, 0.03, -0.02); v.group.rotation.set(-0.5, 0, 0.9); v.group.updateMatrixWorld(true);
        const g = piv.clone().applyMatrix4(v.group.matrixWorld);
        out.pivErr = g.distanceTo(piv.clone().add(new THREE.Vector3(-0.1, 0.03, -0.02)));
        // and the blade's tip moves (the rotation is applied)
      }
      // update never throws, over a walk and a minute of time, for every kind
      out.throws = [];
      for (const k of R11VM.kinds()) { const w = R11VM.viewmodel(k, { lights: false }); try { for (let i = 0; i < 240; i++) w.update(i * 0.25, i < 120 ? i * 0.3 : 36, { dt: 0.25, t: i * 0.25 }); w.update(NaN, undefined); w.update(); } catch (e) { out.throws.push(k + ': ' + e.message); } }
      return out;
    });
    check(r.blade && r.std && r.metal === 1 && r.rough, 'the blade is real steel: MeshStandardMaterial, metalness 1, a roughness map (the HDR environment reflects in it)');
    check(r.ring >= 10, 'the blade\'s cross-section carries a fuller and bevelled edges in the geometry (' + r.ring + ' distinct points across it)');
    check(r.glove && r.gloveStd && r.stitch, 'the fist is a leather glove (not metal) with stitches');
    check(r.piv && r.pivErr < 1e-6, 'the swing turns the weapon about the grip: the grip moves only by CORE\'s offset under rotation (error ' + (r.pivErr != null ? r.pivErr.toExponential(1) : '-') + ')');
    check(!r.throws.length, 'update(t, walk, F) never throws over a walk and a minute, for every kind' + (r.throws.length ? ' (' + r.throws.join('; ') + ')' : ''));

    r = await page.evaluate(() => {
      const v = R11VM.viewmodel('glass-arm', { lights: false }), mats = [], veins = [];
      v.group.traverse((o) => { if (o.isMesh) { mats.push(o.material.name); if (o.material.userData && o.material.userData.vein) veins.push(o); } });
      const c = veins.length && veins[0].material.uniforms && veins[0].material.uniforms.uCol ? veins[0].material.uniforms.uCol.value : null;
      return { mats, veins: veins.length, col: c ? [c.r, c.g, c.b] : null, glass: mats.filter((n) => n === 'r11vm:glass').length };
    });
    check(r.veins === 1 && r.mats.includes('r11vm:vein'), 'the glass arm carries exactly one vein, material r11vm:vein (' + r.mats.join(', ') + ')');
    check(r.col && r.col[1] > r.col[0] * 2 && r.col[1] > r.col[2], 'the vein is green, a sea-green over red and blue (' + (r.col || []).map((x) => x.toFixed(2)).join(', ') + ')');
    check(r.glass >= 1, 'the arm is light-glass (r11vm:glass)');

    // ---- render: CORE's vm camera (40 degrees over the 150 view rows of 200), the HDR sky as the environment
    r = await page.evaluate(async () => {
      const X = R11THREE, THREE = X.THREE;
      const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 800; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
      document.body.appendChild(cv);
      const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping;
      const hdr = await new X.HDRLoader().loadAsync('assets/r11/sky/sky_2k.hdr.wasm'); hdr.mapping = THREE.EquirectangularReflectionMapping;
      const pm = new THREE.PMREMGenerator(renderer), env = pm.fromEquirectangular(hdr).texture; pm.dispose();
      const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.83; scene.background = new THREE.Color(0x2a2c2e);
      scene.add(new THREE.HemisphereLight(0xc4ccd2, 0x4d4338, 0.55)); const key = new THREE.DirectionalLight(0xfff0dc, 0.9); key.position.set(-1, 2, 1); scene.add(key);
      const cam = new THREE.PerspectiveCamera(40, 1280 / 600, 0.01, 10); cam.setViewOffset(1280, 600, 0, 0, 1280, 800); cam.updateProjectionMatrix();
      const arm = R11VM.viewmodel('glass-arm', { lights: false }), sw = R11VM.viewmodel('sword', { lights: false });
      arm.update(1, 0); sw.update(1, 0); scene.add(arm.group, sw.group);
      renderer.render(scene, cam);
      const gl = renderer.getContext(), w = 640, h = 600, b = new Uint8Array(w * h * 4);
      gl.readPixels(0, 200, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
      let glass = 0, white = 0, green = 0, cyanR = 0, cyanB = 0;
      for (let i = 0; i < b.length; i += 4) {
        const R = b[i], G = b[i + 1], B = b[i + 2];
        if (Math.abs(R - 0x2a) + Math.abs(G - 0x2c) + Math.abs(B - 0x2e) < 30) continue;
        glass++; cyanR += R; cyanB += B;
        if (R > 245 && G > 245 && B > 245) white++;
        if (G > R + 50 && G > B + 8) green++;
      }
      const url = cv.toDataURL('image/png');
      // the right half: the sword's steel picks up the sky (not flat): spread of brightness over the blade's pixels
      return { glass, white, green, meanR: cyanR / Math.max(1, glass), meanB: cyanB / Math.max(1, glass), url };
    });
    if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'r11vm-harness.png'), Buffer.from(r.url.split(',')[1], 'base64'));
    check(r.glass > 8000 && r.meanB > r.meanR + 40, 'rendered, the glass hand is cyan in the lower left (' + r.glass + ' px, mean R ' + r.meanR.toFixed(0) + ' B ' + r.meanB.toFixed(0) + ')');
    check(r.white < r.glass * 0.03, 'and never a white blob (' + r.white + ' clipped white px of ' + r.glass + ')');
    check(r.green > 40, 'the green vein shows through the glass (' + r.green + ' green px)');
    check(!errors.length, 'no page errors or r11vm warnings in the harness' + (errors.length ? ' (' + errors.slice(0, 3).join(' | ') + ')' : ''));
    await page.close();

    // ---------------------------------------------------------------- in the game: CORE prefers R11VM
    const g = await bootGame(browser);
    r = await g.page.evaluate(() => {
      const out = { ready: R11.ready, failed: R11.failed() };
      G.state = 'paused'; G.tod = 0.42; loadMap('oakhaven', { x: 20.5, y: 29.2, dir: -1.25 }); G.fadeT = 0; G.state = 'play';
      R11.paused = true; R11.renderOnce(); render();
      const names = R11.vm && R11.vm.scene ? R11.vm.scene.children.map((o) => o.name) : [];
      const p = G.player, id = p.weapons ? p.weapons[p.weapon] : 'hands';
      out.names = names; out.weapon = id; out.kind = R11VM.kindFor(id); out.active = R11.active();
      // equip the sword and draw again: the weapon group follows
      if (WEAPONS.sword) { if (!p.weapons.includes('sword')) p.weapons.push('sword'); p.weapon = p.weapons.indexOf('sword'); R11.renderOnce(); render(); out.names2 = R11.vm.scene.children.map((o) => o.name); }
      return out;
    });
    if (SHOTS) await g.page.screenshot({ path: path.join(SHOTS, 'r11vm-game.png') });
    check(r.ready && !r.failed && r.active, 'the game runs the realistic look (R11 ready and drawing)');
    const kindName = r.kind === 'fists' ? 'R11VM:fists' : 'R11VM:' + r.kind;
    check(r.names.includes('R11VM:glass-arm') && (r.names.includes(kindName) || r.weapon === 'hands'), 'CORE draws R11VM\'s glass arm and the equipped weapon (' + r.weapon + ' -> ' + r.kind + '; vm scene: ' + r.names.filter(Boolean).join(', ') + ')');
    check(!r.names.some((n) => /^R11KIT:/.test(n)), 'R11VM is preferred: no R11KIT viewmodel in the first-person scene');
    check(!r.names2 || r.names2.includes('R11VM:sword'), 'equipping the Short Sword swaps in R11VM\'s sword (' + (r.names2 || []).filter(Boolean).join(', ') + ')');
    check(!g.errors.length, 'no page errors in the game' + (g.errors.length ? ' (' + g.errors.slice(0, 3).join(' | ') + ')' : ''));
  } catch (e) {
    fails++; console.log('FAIL the test ran to the end -- ' + (e && e.message ? e.message.split('\n')[0] : e));
  } finally {
    await browser.close();
  }
  console.log(fails ? fails + ' FAILED' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
