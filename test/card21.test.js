// PREVIEW_URL=http://127.0.0.1:4105 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/card21.test.js
// Phase 21 CARD: the detailed character card (js/card21.js) and the photo mode upgrade (js/photo21.js).
//  * the likeness: a LOOK from catalog ids only (hostile saves give nothing else), a pure painter (same look, same
//    pixels), every armour piece and every weapon in the catalog visibly different, eight views, breathing frames
//  * the card: the inventory doll keeps its <title>, heading and caption and now holds the painted figure; equipping
//    repaints it at once (no animation frame needed); the rotate buttons turn it; the Character panel shows it; both
//    fit 640x400; the switch off (and GFX.plain()) gives back the Phase 5 doll exactly
//  * the same likeness on the co-op partner (js/partner19.js) and the ghost (js/ghost18.js)
//  * photo mode: the free camera flies past the old dolly radius, never into a wall, looks as far as the renderer
//    allows, Save screenshot makes a PNG at the device's resolution, leaving restores everything; the world never moves
//  * no page errors; the paint cost
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = (process.env.PREVIEW_URL || 'http://127.0.0.1:4105').replace(/\/$/, '');
const SHOTS = process.env.SHOTS_DIR || '';
let passed = 0;
async function step(name, fn) { await fn(); passed++; console.log('PASS ' + name); }

async function boot(ctx, opts) {
  opts = opts || {};
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !(opts.block && /ERR_FAILED/.test(t))) errors.push('console: ' + t); if (m.type() === 'warning' && /card21|photo21/.test(t)) errors.push('console: ' + t); });
  if (opts.block) await page.route('**/js/card21.js*', (r) => r.abort());
  if (opts.r3d) await page.addInitScript(() => { window.__r3d21 = { automation: true, force: true }; });
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(BASE + '/?nosw=1');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.evaluate(() => { GFX.illustratedScreens = false; });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Card Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').nth(opts.cls || 0).click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play');
  await page.waitForTimeout(300);
  return { page, errors };
}

(async () => {
  const browser = await chromium().launch({ headless: true, args: ['--no-sandbox'] });
  function chromium() { return pw.chromium; }
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const pages = [];
  try {
    const A = await boot(ctx); pages.push(A);
    const page = A.page, Q = (fn, arg) => page.evaluate(fn, arg);
    // wait for the portraits so every frame below is the final one
    await Q(() => { for (let f = 1; f <= 6; f++) CARD21.paint(CARD21.cleanGear({ face: f }), { view: 0 }); });
    await page.waitForFunction(() => [1, 2, 3, 4, 5, 6].every((f) => CARD21._internal.portraits[f]), null, { timeout: 10000 });
    await Q(() => { window.requestAnimationFrame = () => 0; });   // no frames between steps: every repaint below is synchronous

    await step('likeness: the contract is there; a LOOK holds catalog ids only, hostile saves give the defaults; the painter is pure', async () => {
      const r = await Q(() => {
        const out = {};
        out.api = ['lookOf', 'cleanGear', 'lookFromCompact', 'sig', 'paint', 'partnerFrame', 'ghostFrame', 'gear'].every((k) => typeof CARD21[k] === 'function');
        { const q = CARD21.queenEmblem(2); out.api = out.api && q.w === CARD21.QUEEN.w * 2 && q.h === CARD21.QUEEN.h * 2 && q.data.some((v) => v) && CARD21.QUEEN.rows.every((r) => r.length === CARD21.QUEEN.w); }
        const p = G.player, keep = JSON.stringify({ armor: p.armor, weapons: p.weapons, weapon: p.weapon, face: p.face });
        p.armor = { head: '__proto__', body: 'a_kite', hands: '<img src=x onerror=alert(1)>', feet: 'a_greaves', shield: 'constructor' };
        p.weapons = ['toString', 'axe']; p.weapon = 0; p.face = '"><script>';
        const L = CARD21.lookOf(p);
        out.hostile = L.head === null && L.body === null && L.hands === null && L.feet === 'a_greaves' && L.shield === null && L.weapon === 'hands' && L.face === 1;
        const g = CARD21.cleanGear({ cls: 'x', face: 9, head: 'a_plate', body: 'a_plate', weapon: 'hasOwnProperty', off: 'maul', glass: 'lots' });
        out.clean = g && g.head === null && g.body === 'a_plate' && g.weapon === 'hands' && g.off === null && g.face === 1 && g.glass === -1;
        const back = JSON.parse(keep); Object.assign(p, back);
        CARD21.clearCache();
        const L2 = CARD21.cleanGear({ ci: 5, face: 5, weapon: 'longsword', head: 'a_bellhelm', body: 'a_plate', hands: 'a_gauntlets', feet: 'a_greaves', shield: 'a_kite' });
        const a = CARD21.paint(L2, { view: 0, display: true }), aa = Array.from(a.data); CARD21.clearCache();
        const b = CARD21.paint(L2, { view: 0, display: true });
        out.pure = aa.length === b.data.length && aa.every((v, i) => v === b.data[i]);
        out.size = [a.w, a.h]; out.filled = a.data.filter((v) => v).length;
        return out;
      });
      assert.ok(r.api, 'the contract functions exist');
      assert.ok(r.hostile, 'a hostile save gives no foreign ids');
      assert.ok(r.clean, 'cleanGear keeps catalog ids in their own slots only');
      assert.ok(r.pure, 'the same look gives the same pixels');
      assert.deepEqual(r.size, [176, 352]);
      assert.ok(r.filled > 9000, 'the card figure is large (' + r.filled + ' px)');
    });

    await step('every armour piece and every weapon in the catalog shows visibly differently; eight views; breathing; the glass climbs', async () => {
      const r = await Q(() => {
        const hash = (f) => { let h = 2166136261; for (let i = 0; i < f.data.length; i++) { h ^= f.data[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
        const diff = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++; return n; };
        const base = CARD21.cleanGear({ ci: 2, face: 2, weapon: 'sword' });
        const B0 = CARD21.paint(base, { view: 0, display: true });
        const bad = [], seen = {};
        for (const id of Object.keys(ARMOR)) {
          const a = ARMOR[id], L = Object.assign({}, base, { [a.slot]: id });
          if (a.slot === 'shield') L.stowed = false;
          const f = CARD21.paint(L, { view: 0, display: true }), n = diff(f, B0), h = hash(f);
          if (n < 120) bad.push(id + ' changes only ' + n + ' px');
          if (seen[h]) bad.push(id + ' looks like ' + seen[h]); seen[h] = id;
        }
        const wseen = {};
        for (const id of Object.keys(WEAPONS)) {
          const L = Object.assign({}, base, { weapon: id });
          const f = CARD21.paint(L, { view: 0, display: true }), h = hash(f);
          if (wseen[h]) bad.push(id + ' looks like ' + wseen[h]); wseen[h] = id;
          if (id !== 'sword' && diff(f, B0) < 60) bad.push('weapon ' + id + ' barely shows');
        }
        const views = new Set(); for (let v = 0; v < 8; v++) views.add(hash(CARD21.paint(base, { view: v, display: true })));
        const br = diff(CARD21.paint(base, { view: 0, display: true, breath: 0 }), CARD21.paint(base, { view: 0, display: true, breath: 1 }));
        const g1 = CARD21.paint(Object.assign({}, base, { ci: 0, glass: 5 }), { view: 0, display: true }), g2 = CARD21.paint(Object.assign({}, base, { ci: 0, glass: 60 }), { view: 0, display: true });
        const faces = new Set(); for (let f = 1; f <= 6; f++) faces.add(hash(CARD21.paint(Object.assign({}, base, { face: f }), { view: 0, display: true })));
        const calls = new Set(); for (let c = 0; c < 6; c++) calls.add(hash(CARD21.paint(Object.assign({}, base, { ci: c, cls: ['blade', 'cantor', 'corsair', 'archivist', 'penitent', 'quarry'][c] }), { view: 0, display: true })));
        // a two-hander puts the shield on the back: seen from behind
        const st = CARD21.paint(Object.assign({}, base, { weapon: 'maul', shield: 'a_kite', stowed: true }), { view: 4, display: true });
        const st0 = CARD21.paint(Object.assign({}, base, { weapon: 'maul' }), { view: 4, display: true });
        return { bad, nArmor: Object.keys(ARMOR).length, nWeap: Object.keys(WEAPONS).length, views: views.size, br, glass: diff(g1, g2), faces: faces.size, calls: calls.size, stowed: diff(st, st0) };
      });
      assert.deepEqual(r.bad, [], 'every piece shows: ' + r.bad.join('; '));
      assert.ok(r.nArmor >= 18 && r.nWeap >= 20, 'the whole catalog was checked (' + r.nArmor + ' armour, ' + r.nWeap + ' weapons)');
      assert.equal(r.views, 8, 'eight different views');
      assert.ok(r.br > 200, 'breathing moves the figure (' + r.br + ' px)');
      assert.ok(r.glass > 100, 'the glass climbs the arm (' + r.glass + ' px)');
      assert.equal(r.faces, 6, 'six faces'); assert.equal(r.calls, 6, 'six callings');
      assert.ok(r.stowed > 200, 'a stowed shield shows on the back');
    });

    await step('the inventory card: the old doll shows at once, the painted figure swaps in from slices; equipping and rotating repaint it', async () => {
      const px = () => Q(() => { const c = document.querySelector('#modal-panel .paper-doll svg canvas.c21-cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h ^= d[i] | (d[i + 1] << 8) | (d[i + 2] << 16); h = Math.imul(h, 16777619); } return h >>> 0; });
      const r0 = await Q(() => {
        const p = G.player;
        for (const id of ['a_plate', 'a_kite', 'a_bellhelm', 'a_gauntlets', 'a_greaves', 'a_jerkin']) if (!G.has(id)) p.inv.push({ id, n: 1 });
        p.armor = {}; p.weapons = ['sword', 'spear']; p.weapon = 0; G.state = 'panel';
        GFX.card21 = false; let t0 = performance.now(); renderInventory(); const base = performance.now() - t0; GFX.card21 = true;
        CARD21.clearCache();
        t0 = performance.now(); renderInventory(); const ms = performance.now() - t0;
        const pn = document.querySelector('#modal-panel');
        return { ms, base, canvas: !!pn.querySelector('.paper-doll svg canvas.c21-cv'), under: !!pn.querySelector('.paper-doll svg .c21-under'), ready: pn.querySelector('.paper-doll svg').classList.contains('c21-ready'), title: pn.querySelectorAll('.paper-doll svg title').length, heading: pn.querySelector('.paper-doll').innerText.includes('THE TRAVELLER') };
      });
      assert.ok(r0.canvas && r0.under, 'the figure canvas over the old doll'); assert.equal(r0.title, 1, 'one svg title'); assert.ok(r0.heading);
      // the painted figure is not waited for: opening costs about what the plain inventory costs (this box is shared and
      // loaded, so compare against the panel with the card off, opened just before)
      assert.ok(!r0.ready && r0.ms < r0.base + 60, 'opening cold does not wait for the paint (' + r0.ms.toFixed(1) + ' ms vs ' + r0.base.toFixed(1) + ' ms without the card)');
      await Q(() => CARD21.idle());
      assert.ok(await Q(() => document.querySelector('.paper-doll svg').classList.contains('c21-ready')), 'the painted figure swaps in');
      const h0 = await px();
      await Q(() => equipArmor('a_plate')); await Q(() => CARD21.idle());
      const h1 = await px();
      assert.notEqual(h1, h0, 'equipping repaints the card');
      await Q(() => document.querySelector('#modal-panel [data-c21rot="1"]').click()); await Q(() => CARD21.idle());
      const h2 = await px();
      assert.ok(h2 !== h1 && (await Q(() => document.querySelector('.c21-view').textContent)) === 'Front right', 'the rotate buttons turn the figure');
      await Q(() => document.querySelector('#modal-panel [data-c21rot="-1"]').click());
      const r = await Q(async () => {
        const out = { back: document.querySelector('.c21-view').textContent === 'Front' };
        document.querySelector('[data-w="1"]').click();
        out.stowed = document.querySelector('.paper-doll figcaption').textContent.includes('shield stowed') || !G.player.armor.shield;
        document.querySelector('[data-off="body"]').click();
        await CARD21.idle();
        out.off = document.querySelector('.paper-doll svg title').textContent.includes('Body: none') && G.player.armor.body == null;
        out.badges = document.querySelectorAll('.paper-doll svg image.c21-badge').length;
        out.worstSlice = CARD21.stats().sliceWorst;
        return out;
      });
      assert.ok(r.back, 'and back'); assert.ok(r.off, 'Off still removes armour'); assert.ok(r.badges >= 1, 'the readied weapon icon rides along');
      if (SHOTS) await page.locator('.paper-doll').screenshot({ path: path.join(SHOTS, 'card21-doll.png') });
    });

    await step('closed helms: no face or skin shows from any of the eight views (card, partner, ghost sizes); a hood hides the face from behind', async () => {
      const r = await Q(() => {
        const I = CARD21._internal, bad = [];
        const count = (L, size, view) => {
          const S = CARD21.SIZES[size], X = I.makeCtx(S.W, S.H, S.K, view * Math.PI / 4, S.FOOT);
          I.build(X, L, { display: size === 'card' });
          const yNeck = Math.floor(S.FOOT - S.K * 47.8); let skin = 0, face = 0;
          for (let y = 0; y < yNeck; y++) for (let x = 0; x < S.W; x++) { const m = X.m[y * S.W + x]; if (!m) continue; const k = X.mats[m].kind; if (k === 'skin') skin++; else if (k === 'face') face++; }
          return { skin, face };
        };
        for (const face of [1, 2, 3, 4, 5, 6]) for (const size of ['card', 'partner', 'ghost']) for (let v = 0; v < 8; v++) {
          for (const head of Object.keys(ARMOR).filter((id) => ARMOR[id].slot === 'head')) {
            const L = CARD21.cleanGear({ ci: 2, face, head, weapon: 'sword', body: 'a_chain' }), c = count(L, size, v), e = CARD21.armorLook(head);
            if (e && e.full && (c.skin || c.face)) bad.push(head + ' face ' + face + ' ' + size + ' view ' + v + ': ' + JSON.stringify(c));
            if (e && e.kind === 'hood' && v >= 3 && v <= 5 && c.face) bad.push(head + ' face ' + face + ' ' + size + ' view ' + v + ' shows the face from behind');
          }
        }
        return bad;
      });
      assert.deepEqual(r, [], r.slice(0, 6).join('; '));
    });

    await step('the Character panel shows the figure with the portrait; both panels fit 640x400 without horizontal overflow', async () => {
      await Q(() => { closeModal(); G.state = 'panel'; renderCharacter(); return CARD21.idle(); });
      const r = await Q(() => { const c = document.querySelector('#modal-panel .c21-char canvas.c21-cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 120) lit++; return { fig: !!c, face: !!document.querySelector('#modal-panel .c21-char img.c21-face'), lit }; });
      assert.ok(r.fig && r.face, 'figure and portrait'); assert.ok(r.lit > 300, 'the figure is painted (' + r.lit + ')');
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'card21-character.png') });
      await page.setViewportSize({ width: 640, height: 400 });
      for (const which of ['renderCharacter', 'renderInventory']) {
        const o = await Q((w) => { closeModal(); G.state = 'panel'; window[w](); const pn = document.querySelector('#modal-panel'); const box = pn.getBoundingClientRect(); const fig = pn.querySelector('canvas.c21-cv').getBoundingClientRect(); return { hOver: document.documentElement.scrollWidth > innerWidth || pn.scrollWidth > pn.clientWidth + 1, figIn: fig.left >= box.left - 1 && fig.right <= box.right + 1, figW: fig.width }; }, which);
        assert.deepEqual([o.hOver, o.figIn], [false, true], which + ' fits 640x400 (' + JSON.stringify(o) + ')');
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'card21-' + which + '-640.png') });
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    await step('the switch: off (and GFX.plain()) gives the Phase 5 painted doll back exactly; the Options row toggles it', async () => {
      const r = await Q(() => {
        GFX.card21 = false; const off = inventoryDoll();
        GFX.card21 = true; const on = inventoryDoll();
        // the same doll with card21's wrapper out of the chain: icons.js's painted svg (no canvas, no rotate buttons)
        const plainOff = !off.includes('c21') && /<svg viewBox="0 0 180 200"/.test(off);
        GFX.plain(); const pl = inventoryDoll(); const plainGone = !pl.includes('c21-cv');
        PRESETS.apply('medium'); const back = inventoryDoll().includes('c21-cv');
        closeModal(); renderAccessibilityMenu(); const b = document.getElementById('c21-opt'); const t0 = b.textContent; b.click(); const t1 = b.textContent; const offNow = GFX.card21 === false; b.click();
        return { plainOff, onHas: on.includes('c21-cv'), plainGone, back, t0, t1, offNow, onAgain: GFX.card21 === true };
      });
      assert.ok(r.plainOff && r.onHas, 'off = the painted doll');
      assert.ok(r.plainGone, 'GFX.plain() turns the card off');
      assert.ok(r.back, 'a preset brings it back (it is art: on in every preset)');
      assert.deepEqual([r.t0, r.t1, r.offNow, r.onAgain], ['Detailed', 'Simple', true, true]);
      await Q(() => { closeModal(); G.state = 'play'; });
    });

    await step('the same likeness on the co-op partner and the ghost: the real gear, from the validated card and the compact look', async () => {
      const r = await Q(() => {
        const out = {};
        const card = { v: 1, token: 'Tok3nAbcd1234XYZ', name: 'Brother', cls: 'corsair', face: 3, level: 4, xp: 10, attrs: Object.assign({}, CLASSES.find((c) => c.id === 'corsair').attrs), weapons: ['axe', 'pistol'], weapon: 0, armor: { body: 'a_chain', head: 'a_kettle', feet: 'a_greaves', shield: 'a_buckler' }, pellets: 5, bolts: 0, glass: 0 };
        const j = PARTNER19.join(card, { seed: 7 }); out.joined = !!(j && j.ok);
        const look = PARTNER19.S.look;
        out.gear = !!(look && look.gear && look.gear.body === 'a_chain' && look.gear.weapon === 'axe' && look.gear.head === 'a_kettle');
        const mine = CARD21.partnerFrame(0, 0, 0, 0, look), fr = PARTNER19.frameOf(0, 0, 0, 0, look);   // painted now, then the partner's own call finds it
        out.partnerIsCard = fr.w === 80 && fr.h === 192 && fr.data.length === mine.data.length && fr.data.every((v, i) => v === mine.data[i]);
        out.sprite = !!Engine.sprites[fr.name];
        // the host's own figure and memory are never the partner's
        out.homeKept = CARD21.lookOf(G.player).body !== 'a_chain' || G.player.armor.body === 'a_chain';
        PARTNER19.leave('test');
        // the ghost: my compact look stands for my full kit; a stranger's compact look is read as gear
        const p = G.player; p.armor = { body: 'a_plate', head: 'a_bellhelm', shield: 'a_kite' }; p.weapons = ['longsword']; p.weapon = 0;
        const compact = GHOST18.lookNow();
        out.compactHasGear = !!(compact.gear && compact.gear.body === 'a_plate');
        const bare = { cls: compact.cls, face: compact.face, wpn: compact.wpn, arm: compact.arm };   // as decoded from a ghost code
        const gL = CARD21.lookFromCompact(bare);
        out.remembered = gL.body === 'a_plate' && gL.weapon === 'longsword';
        const cf = CARD21.ghostFrame(0, 0, 0, 0, bare), gf = GHOST18.figureFrame(0, 0, 0, 0, bare);
        out.ghostIsCard = gf.w === 80 && gf.data.every((v, i) => v === cf.data[i]) && gf.top.length === 80;
        let pale = 0, n = 0; for (const v of gf.data) if (v) { n++; const a = v >>> 24, b = (v >>> 16) & 255, r2 = v & 255; if (a < 250 && b >= r2) pale++; }
        out.pale = n > 1500 && pale / n > 0.8;
        const stranger = CARD21.lookFromCompact({ cls: 2, face: 4, wpn: 6, arm: (3) | (2 << 2) | (1 << 4) | (1 << 5) });
        out.stranger = stranger.weapon === 'spear' && stranger.head === 'a_kettle' && stranger.hands === 'a_gloves' && stranger.face === 4;
        return out;
      });
      for (const k of Object.keys(r)) assert.ok(r[k], k + ': ' + JSON.stringify(r));
    });

    await step('photo mode: the free camera flies past the old dolly, never into a wall, looks further; Save screenshot gives a device-resolution PNG; leaving restores everything', async () => {
      await Q(() => { loadMap('oakhaven', { x: 29.5, y: 20.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.keys = {}; for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy') G.ents.splice(i, 1); render(); });
      const r = await Q(async () => {
        const cam0 = Object.assign({}, Engine.cam), snap0 = (() => { const o = JSON.parse(JSON.stringify(snapshotGame())); delete o.when; delete o.flags.p7t_rms; return JSON.stringify(o); })();
        const rc0 = window.__rc || 0;
        PLAYTOOLS.enter(); update(1 / 60); render();
        const out = { on: G.state === 'photo', row: !!document.getElementById('p21-row') };
        // fly: hold W while turning about, far beyond the Phase 7 radius of 3.2
        let maxD = 0, blocked = 0;
        for (let i = 0; i < 600; i++) {
          if (i % 40 === 0) Engine.cam.dir = (i * 1.7) % 6.28;
          G.keys.w = true; update(1 / 30);
          if (G.map.isBlocked(Math.floor(Engine.cam.x), Math.floor(Engine.cam.y))) blocked++;
          maxD = Math.max(maxD, Math.hypot(Engine.cam.x - cam0.x, Engine.cam.y - cam0.y));
        }
        G.keys.w = false;
        out.maxD = maxD; out.blocked = blocked;
        G.keys.r = true; for (let i = 0; i < 30; i++) update(1 / 30); G.keys.r = false; out.z = Engine.cam.z;
        G.keys.arrowup = true; for (let i = 0; i < 90; i++) update(1 / 30); G.keys.arrowup = false; out.pitch = Engine.cam.pitch; out.lim = PHOTO21.pitchLimit();
        const blob = await PHOTO21.screenshot();
        const dv = new DataView(await blob.arrayBuffer()), D = PHOTO21.deviceSize();
        out.png = blob.type === 'image/png'; out.dim = [dv.getUint32(16), dv.getUint32(20)]; out.want = [D.w, D.h];
        // a filter and the depth of field bake into the picture
        const plain = PHOTO21.finish(PHOTO21.grab()); PHOTO21.S.filter = (PHOTO21.filters().find((f) => /grayscale\(1\)/.test(f.css)) || { id: 'noir' }).id; PHOTO21.S.dof = true;   // LIGHT21's grades replace the own seven when present
        const noir = PHOTO21.finish(PHOTO21.grab()); PHOTO21.S.filter = 'none'; PHOTO21.S.dof = false;
        const px = (c) => c.getContext('2d').getImageData(c.width >> 1, c.height >> 2, 1, 1).data;
        const a = px(noir); out.grey = Math.abs(a[0] - a[1]) <= 3 && Math.abs(a[1] - a[2]) <= 3; const b = px(plain); out.colour = !(b[0] === b[1] && b[1] === b[2]);
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); render();
        out.left = G.state === 'play' && !PLAYTOOLS.photo.on;
        out.cam = ['x', 'y', 'z', 'dir', 'pitch'].every((k) => Engine.cam[k] === cam0[k]);
        const snap1 = (() => { const o = JSON.parse(JSON.stringify(snapshotGame())); delete o.when; delete o.flags.p7t_rms; return JSON.stringify(o); })();
        out.world = snap1 === snap0; out.rng = (window.__rc || 0) === rc0;
        out.filterGone = !document.getElementById('game').style.getPropertyValue('--p21-photo-filter');
        return out;
      });
      assert.ok(r.on && r.row, 'photo mode with the new row');
      assert.ok(r.maxD > 4, 'the free camera goes past the old 3.2 radius (' + r.maxD.toFixed(2) + ')');
      assert.ok(r.maxD <= 12.01, 'but stays within 12 paces');
      assert.equal(r.blocked, 0, 'never into a wall');
      assert.ok(r.z > 0.6, 'R raises the camera (' + r.z + ')');
      assert.ok(Math.abs(r.pitch) <= r.lim + 1e-6 && r.pitch > 20, 'the look goes up to the renderer\'s limit (' + r.pitch + ' / ' + r.lim + ')');
      assert.ok(r.png); assert.deepEqual(r.dim, r.want, 'the screenshot is at the device resolution');
      assert.ok(r.grey && r.colour, 'the filter bakes into the picture');
      assert.ok(r.left && r.cam && r.world && r.filterGone, 'leaving restores the camera, the world and the view: ' + JSON.stringify(r));
    });

    await step('photo filters follow LIGHT21.photoGrades() when it is there (asked again each time photo mode opens), hostile entries dropped; without it, the own seven', async () => {
      const r = await Q(() => {
        // light21.js, when loaded, is a lexical const: its photoGrades is swapped for this step instead of the object
        const realL = typeof LIGHT21 === 'object' && LIGHT21 ? LIGHT21 : null, realPG = realL && realL.photoGrades;
        const setPG = (fn) => { if (realL) realL.photoGrades = fn; else if (fn) window.LIGHT21 = { photoGrades: fn }; else delete window.LIGHT21; };
        setPG(undefined);
        const own = PHOTO21.filters().map((f) => f.id);
        let here = 'sepia(0.1)';
        setPG(() => [{ id: 'l21-here', label: 'Here and now', css: here }, { id: 'l21-oakhaven', label: 'Oakhaven', css: 'saturate(1.1) contrast(1.05)' }, { id: 'evil', label: 'x', css: 'url(#x)' }, { id: 'l21-bw', label: 'Black and white', css: 'grayscale(1)' }]);
        loadMap('oakhaven', { x: 29.5, y: 20.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; render();
        PLAYTOOLS.enter(); update(1 / 60); render();
        const ids = PHOTO21.filters().map((f) => f.id);
        document.getElementById('p21-filter').click();
        const label = document.getElementById('p21-filter').textContent, css1 = document.getElementById('game').style.getPropertyValue('--p21-photo-filter');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); render();
        here = 'sepia(0.5)'; PLAYTOOLS.enter(); update(1 / 60); render();
        const again = PHOTO21.filters()[1].css;
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); render();
        setPG(undefined); PHOTO21.S.filter = 'none';
        const after = PHOTO21.filters().map((f) => f.id).join() === own.join();
        if (realL) realL.photoGrades = realPG;
        return { own, ids, label, css1, again, after };
      });
      assert.deepEqual(r.own, ['none', 'warm', 'cold', 'vivid', 'print', 'noir', 'hush']);
      assert.deepEqual(r.ids, ['none', 'l21-here', 'l21-oakhaven', 'l21-bw'], 'LIGHT\'s grades, the hostile one dropped');
      assert.equal(r.label, 'Filter: Here and now'); assert.equal(r.css1.trim(), 'sepia(0.1)');
      assert.equal(r.again, 'sepia(0.5)', 'asked again when photo mode opens');
      assert.ok(r.after, 'back to the own seven without LIGHT21');
    });

    await step('cost: painting a card view, a partner frame and a ghost frame', async () => {
      const r = await Q(() => {
        CARD21.clearCache();
        const L = CARD21.cleanGear({ ci: 5, face: 5, weapon: 'longsword', head: 'a_bellhelm', body: 'a_plate', hands: 'a_gauntlets', feet: 'a_greaves', shield: 'a_kite' });
        const t = (fn) => { const t0 = performance.now(); fn(); return performance.now() - t0; };
        const card = t(() => CARD21.paint(L, { view: 1, display: true }));
        const partner = t(() => CARD21.partnerFrame(1, 1, 0, 0, L));
        const ghost = t(() => CARD21.ghostFrame(3, 2, 0, 0, L));
        const cached = t(() => { for (let i = 0; i < 100; i++) CARD21.paint(L, { view: 1, display: true }); }) / 100;
        return { card, partner, ghost, cached };
      });
      console.log('  cost ms', JSON.stringify(r));
      assert.ok(r.cached < 1, 'a cached frame is free');
    });

    await step('photo mode under R3D (forced on, SwiftShader): the look reaches the renderer\'s limit and Save screenshot copies R3D\'s own picture', async () => {
      const R = await boot(ctx, { r3d: true }); pages.push(R);
      const rp = R.page;
      const r = await rp.evaluate(async () => {
        window.requestAnimationFrame = () => 0;
        if (typeof R3D === 'undefined') return { skip: 'no r3d21.js' };
        R3D.setMode('on');
        loadMap('oakhaven', { x: 29.5, y: 20.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.keys = {}; render();
        if (!R3D.active()) return { skip: 'R3D not active here' };
        const cam0 = Object.assign({}, Engine.cam);
        PLAYTOOLS.enter(); update(1 / 60); render();
        G.keys.arrowup = true; for (let i = 0; i < 40; i++) update(1 / 30); G.keys.arrowup = false;
        const ang = Math.atan(Engine.cam.pitch / R3D.FX), lim = R3D.camera.limit();
        G.keys.arrowdown = true; for (let i = 0; i < 20; i++) update(1 / 30); G.keys.arrowdown = false;
        const shot = PHOTO21.grab(), d = shot.getContext('2d').getImageData(0, 0, shot.width, shot.height).data;
        let lit = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
        const blob = await PHOTO21.screenshot();
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' })); render();
        // the co-op partner in R3D: its sprite carries no emissive mask, so no pixel of it (the face included) is marked
        // for LIGHT's bloom (the aux channel's material is never Engine.MAT.glow)
        const card = { v: 1, token: 'Tok3nAbcd1234XYZ', name: 'Brother', cls: 'quarry', face: 5, level: 4, xp: 10, attrs: Object.assign({}, CLASSES.find((c) => c.id === 'quarry').attrs), weapons: ['axe'], weapon: 0, armor: { head: 'a_kettle', body: 'a_jerkin' }, pellets: 0, bolts: 0, glass: 0 };
        PARTNER19.join(card, { seed: 2 }); CARD21.partnerFrame(0, 0, 0, 0, PARTNER19.S.look);
        const S2 = PARTNER19.S, c2 = Engine.cam; S2.x = c2.x + Math.cos(c2.dir) * 1.6; S2.y = c2.y + Math.sin(c2.dir) * 1.6; S2.dir = c2.dir + Math.PI; S2.feet = 0;
        render(); render(); render();
        const fig = PARTNER19.FIG.partner, sc = fig._screen, spr = Engine.sprites[fig.sprite];
        let glow = 0, seen = 0;
        if (sc) for (let y = Math.max(0, sc.y0 | 0); y < Math.min(150, sc.y1); y++) for (let x = Math.max(0, sc.x0 | 0); x < Math.min(320, sc.x1); x++) { const m = R3D.materialAt(x, y); if (m === 6) seen++; if (m === (Engine.MAT ? Engine.MAT.glow : 8)) glow++; }
        // R3D marks a sprite pixel emissive only through the sprite's emit mask (js/r3d21.js atlas upload): none of the
        // partner's sprites carries one (materialAt is also sampled, though SwiftShader's read-back may give nothing)
        const anyEmit = Object.keys(Engine.sprites).filter((k) => /^p19fig_/.test(k)).some((k) => !!Engine.sprites[k].emit);
        const partner = { emit: !!(spr && spr.emit) || anyEmit, sprites: Object.keys(Engine.sprites).filter((k) => /^p19fig_/.test(k)).length, seen, glow, screen: !!sc };
        PARTNER19.leave('silent');
        return { active: true, partner, ang, lim, lit, n: d.length / 4 / 97, png: !!(blob && blob.type === 'image/png'), restored: ['x', 'y', 'z', 'dir', 'pitch'].every((k) => Engine.cam[k] === cam0[k]) };
      });
      if (r.skip) { console.log('  (skipped: ' + r.skip + ')'); return; }
      assert.ok(r.ang > 0.6, 'the look climbs well past the old 9 degrees (' + (r.ang * 57.3).toFixed(1) + ' deg, limit ' + (r.lim * 57.3).toFixed(1) + ')');
      assert.ok(r.ang <= r.lim + 1e-6, 'and stops at the limit');
      assert.ok(r.lit > r.n * 0.3, 'the screenshot holds R3D\'s picture, not a blank canvas (' + r.lit + ' / ' + r.n + ')');
      assert.ok(r.png && r.restored, 'a PNG; leaving restores the camera');
      assert.ok(!r.partner.emit && r.partner.glow === 0, 'the partner is never marked emissive: ' + JSON.stringify(r.partner));
      console.log('  partner under R3D: ' + JSON.stringify(r.partner));
      if (SHOTS) await rp.screenshot({ path: path.join(SHOTS, 'card21-photo-r3d.png') });
      assert.deepEqual(R.errors.filter((e) => !/WebGL|GPU stall|swiftshader|GroupMarker/i.test(e)), [], 'no page errors under R3D');
    });

    assert.deepEqual(A.errors, [], 'no page errors');
    console.log('OK card21 ' + passed + ' steps');
  } catch (e) {
    console.error('FAIL', e && e.stack || e);
    for (const p of pages) if (p.errors.length) console.error('page errors:', p.errors);
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
