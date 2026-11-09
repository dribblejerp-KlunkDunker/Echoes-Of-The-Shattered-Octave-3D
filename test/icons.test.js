// PREVIEW_URL=http://127.0.0.1:3202 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/icons.test.js
// Phase 5 ICONS: every item/weapon/armour id has a painted icon; panels show them without changing text;
// the paper doll keeps its semantics; hostile ids get no markup; the switch restores the originals.
'use strict';
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/P5-ICONS';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3202');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Icon Tester');
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
    await page.waitForFunction(() => typeof ICONS !== 'undefined');

    // ---- catalogue coverage
    const cov = await page.evaluate(() => {
      const ids = ICONS.allIds(), bad = [], urls = {};
      for (const id of ids.items) { const u = ICONS.url(id); if (!/^data:image\/png;base64,/.test(u || '')) bad.push('item ' + id); urls[id] = u; }
      for (const id of ids.weapons) if (!/^data:image\/png;base64,/.test(ICONS.weaponUrl(id) || '')) bad.push('weapon ' + id);
      for (const id of ids.armor) if (!/^data:image\/png;base64,/.test(ICONS.url(id) || '')) bad.push('armor ' + id);
      const quest = ids.items.filter(id => ITEMS[id].key), seen = {}, dup = [];
      for (const id of quest) { const u = urls[id]; if (seen[u]) dup.push(id + '=' + seen[u]); else seen[u] = id; }
      // painted, not blank: a decent share of pixels carry colour
      const cv = document.createElement('canvas'); cv.width = cv.height = 48; const c = cv.getContext('2d'); const im = new Image();
      return new Promise(res => { im.onload = () => { c.drawImage(im, 0, 0); const d = c.getImageData(0, 0, 48, 48).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; res({ bad, dup, quest: quest.length, total: ids.items.length + ids.weapons.length, opaque: n }); }; im.src = urls.a_plate; });
    });
    assert.deepEqual(cov.bad, [], 'every id has an icon');
    assert.deepEqual(cov.dup, [], 'no two quest items share an icon');
    assert(cov.opaque > 1500, 'icons are painted, not blank');
    console.log('PASS every item, weapon and armour id has a painted icon; quest items are all distinct', { quest: cov.quest, total: cov.total });

    // ---- hostile ids
    const hostile = await page.evaluate(() => {
      const evil = ['<img src=x onerror=alert(1)>', '__proto__', 'constructor', 'toString', 'w_nonexistent', '', null, 7];
      const r = { icons: evil.map(id => ICONS.url(id)), weapons: ['__proto__', 'constructor', 'nope'].map(w => ICONS.weaponUrl(w)) };
      const p = G.player, inv0 = p.inv.slice(), houseStorage0 = p.houseStorage; let threw = null;
      try {
        p.inv = inv0.concat([{ id: '<img src=x onerror=alert(1)>', n: 1 }, { id: '__proto__', n: 1 }]);
        p.weapons = p.weapons.concat(['<b>x</b>']);
        const pn = document.querySelector('#modal-panel'); pn.innerHTML = '<div class="carry"><table><tr><td><span class="nm">a</span></td></tr><tr><td><span class="nm">b</span></td></tr><tr><td><span class="nm">c</span></td></tr></table></div>';
        p.inv = [{ id: '<img src=x onerror=alert(1)>', n: 1 }, { id: '__proto__', n: 1 }, { id: 'toString', n: 1 }];
        ICONS.decorateInventory(); ICONS.decorateChest(); ICONS.decorateCrafting();
        r.imgs = pn.querySelectorAll('img').length;
      } catch (e) { threw = String(e); }
      p.inv = inv0; p.houseStorage = houseStorage0; p.weapons = p.weapons.filter(w => w !== '<b>x</b>');
      r.threw = threw; return r;
    });
    assert(hostile.icons.every(u => u === null) && hostile.weapons.every(u => u === null), 'unknown ids give no icon');
    assert.equal(hostile.imgs, 0, 'unknown inventory ids get no icon markup');
    assert.equal(hostile.threw, null, 'unknown ids do not crash decoration');
    console.log('PASS hostile-save ids get no icon markup and no crash');

    // ---- inventory: icons added, text and controls unchanged
    await page.evaluate(() => {
      const p = G.player;
      for (const id of ['a_plate', 'a_kite', 'a_bellhelm', 'a_hobnails', 'w_axe', 'tonic', 'v_fork', 'herb_moss', 'charts', 'unrungbell']) if (!G.has(id)) p.inv.push({ id, n: 1 });
      p.armor = { head: 'a_bellhelm', body: 'a_plate', hands: 'a_gauntlets', feet: 'a_greaves', shield: 'a_kite' };
      p.weapons = ['sword', 'spear', 'glass']; p.weapon = 0; G.state = 'panel';
    });
    const snap = async () => page.evaluate(() => { renderInventory(); const pn = document.querySelector('#modal-panel'); const clone = pn.cloneNode(true); const n = clone.querySelectorAll('img.ico').length; clone.querySelectorAll('img.ico').forEach(i => i.remove()); return { html: clone.innerHTML, text: pn.innerText, n, doll: pn.querySelector('.paper-doll svg').innerHTML.length, images: pn.querySelectorAll('.paper-doll svg image').length }; });
    const onS = await snap();
    await page.evaluate(() => { GFX.itemIcons = false; });
    const offS = await snap();
    await page.evaluate(() => { GFX.itemIcons = true; });
    assert(onS.n >= 15, 'inventory shows icons (' + onS.n + ')');
    assert.equal(offS.n, 0, 'switch off: no icons'); assert.equal(offS.images, 0, 'switch off: no doll images');
    const strip = h => h.replace(/<svg[\s\S]*?<\/svg>/, '');
    assert.equal(strip(onS.html), strip(offS.html), 'icons are the only DOM difference outside the doll');
    assert(onS.images >= 2, 'doll carries weapon and shield icons');
    console.log('PASS inventory icons added without changing text, ids or buttons; switch off restores original');

    // ---- doll semantics
    await page.evaluate(() => { G.player.armor = { head: null, body: null, hands: null, feet: null, shield: null }; renderInventory(); });
    const titles = await page.locator('.paper-doll svg title').count();
    assert.equal(titles, 1, 'one svg title');
    assert((await page.locator('.paper-doll svg title').textContent()).includes('Body: none'));
    assert((await page.locator('.paper-doll').innerText()).includes('THE TRAVELLER'));
    await page.evaluate(() => { G.player.armor.body = 'a_chain'; G.player.armor.shield = 'a_kite'; G.player.weapons = ['sword', 'spear']; G.player.weapon = 1; renderInventory(); });
    assert((await page.locator('.paper-doll figcaption').textContent()).includes('shield stowed'));
    assert(!(await page.locator('.paper-doll svg title').textContent()).includes('Body: none'));
    assert.equal(await page.locator('.paper-doll figcaption img').getAttribute('src').then(s => /^img\/face_[1-6]\.jpg$/.test(s)), true, 'face whitelist kept');
    const faceHostile = await page.evaluate(() => { G.player.face = '"><script>x</script>'; const h = inventoryDoll(); G.player.face = 1; return /face_1\.jpg/.test(h) && !h.includes('<script'); });
    assert(faceHostile, 'hostile face stays whitelisted');
    await page.locator('[data-w="0"]').click();
    await page.locator('[data-off="body"]').click();
    assert((await page.locator('.paper-doll svg title').textContent()).includes('Body: none'), 'Off still removes armour');
    await page.locator('[data-use]').filter({ hasText: 'Wear' }).first().click();
    console.log('PASS painted doll keeps title, heading, caption, face whitelist and equip/remove controls');
    await page.evaluate(() => { const p = G.player; p.armor = { head: 'a_bellhelm', body: 'a_plate', hands: 'a_gauntlets', feet: 'a_greaves', shield: 'a_kite' }; p.weapons = ['sword', 'spear', 'glass']; p.weapon = 0; renderInventory(); });
    await page.evaluate(() => { document.querySelector('#modal-panel').scrollTop = 0; });
    await page.screenshot({ path: SHOTS + '/inventory-1280.png' });
    await page.locator('.paper-doll').screenshot({ path: SHOTS + '/doll-plate.png' });
    await page.evaluate(() => { const p = G.player; p.armor = { head: 'a_hood', body: 'a_synodrobe', hands: 'a_gloves', feet: 'a_softboots', shield: null }; p.weapons = ['crossbow', 'sword']; p.weapon = 0; renderInventory(); });
    await page.locator('.paper-doll').screenshot({ path: SHOTS + '/doll-robes.png' });
    await page.evaluate(() => { const p = G.player; p.armor = { head: 'a_cap', body: 'a_jerkin', hands: null, feet: 'a_hobnails', shield: 'a_buckler' }; p.weapons = ['axe', 'sword']; p.weapon = 0; renderInventory(); });
    await page.locator('.paper-doll').screenshot({ path: SHOTS + '/doll-leather.png' });

    // ---- compact fit
    await page.setViewportSize({ width: 640, height: 400 });
    const fit = await page.evaluate(() => { const pn = document.querySelector('#modal-panel'), x = document.querySelector('#x'); const b = pn.getBoundingClientRect(); x.scrollIntoView({ block: 'nearest' }); const r = x.getBoundingClientRect(); const bad = [...pn.querySelectorAll('img.ico')].filter(i => i.getBoundingClientRect().right > b.right + 1).length; return { ok: b.left >= 0 && b.right <= innerWidth && pn.scrollWidth <= pn.clientWidth + 1, close: r.top >= 0 && r.bottom <= innerHeight, bad }; });
    assert(fit.ok && fit.bad === 0, 'compact inventory has no horizontal overflow'); assert(fit.close, 'compact inventory close button stays reachable');
    await page.screenshot({ path: SHOTS + '/inventory-640.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS compact 640x400 inventory fits');

    // ---- shop, sell, chest, forge/brewing
    const shop = await page.evaluate(() => {
      const out = {}; const n = Object.values(NPCS).find(x => x.shop && x.shop.length > 2); DLG.npc = n; DLG.log = []; DLG.tone = 'normal'; DLG.choices = null;
      G.state = 'dialogue'; G.player.inv.push({ id: 'v_signet', n: 1 });
      renderDialogue('buy'); const pn = document.querySelector('#modal-panel');
      out.buyRows = pn.querySelectorAll('[data-buy]').length; out.buyIcons = pn.querySelectorAll('[data-buy] img.ico').length;
      out.buyText = [...pn.querySelectorAll('[data-buy] b')].map(b => b.textContent).join('|');
      out.buyNames = n.shop.map(e => ITEMS[e.item].name).join('|');
      out.buyAlt = [...pn.querySelectorAll('img.ico')].every(i => i.getAttribute('alt') === '');
      renderDialogue('sell'); out.sellRows = pn.querySelectorAll('[data-sell]').length; out.sellIcons = pn.querySelectorAll('[data-sell] img.ico').length;
      return out;
    });
    assert(shop.buyRows > 2 && shop.buyIcons === shop.buyRows, 'every shop row has an icon'); assert.equal(shop.buyText, shop.buyNames, 'shop text unchanged');
    assert(shop.buyAlt, 'icons have empty alt'); assert(shop.sellRows >= 1 && shop.sellIcons === shop.sellRows, 'sell rows have icons');
    await page.evaluate(() => renderDialogue('buy'));
    await page.screenshot({ path: SHOTS + '/shop-1280.png' });
    await page.setViewportSize({ width: 640, height: 400 });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'compact shop has no horizontal overflow');
    await page.screenshot({ path: SHOTS + '/shop-640.png' });
    await page.setViewportSize({ width: 1280, height: 800 });
    const more = await page.evaluate(() => {
      const out = {}; const p = G.player; ensurePlayerUpgrades(p);
      p.houseStorage = [{ id: 'tonic', n: 2 }, { id: 'a_cap', n: 1 }]; p.inv.push({ id: 'herb_willow', n: 2 }, { id: 'herb_reed', n: 3 }, { id: 'herb_moss', n: 1 });
      renderHouseChest(); let pn = document.querySelector('#modal-panel');
      out.chestRows = pn.querySelectorAll('td .dfbtn').length; out.chestIcons = pn.querySelectorAll('td b img.ico').length;
      out.chestText = [...pn.querySelectorAll('td b')].map(b => b.textContent).join('|');
      renderCrafting(); pn = document.querySelector('#modal-panel');
      out.brew = pn.querySelectorAll('[data-brew]').length; out.brewIcons = pn.querySelectorAll('[data-brew] img.ico').length; out.forgeIcon = pn.querySelectorAll('.slot b img.ico').length;
      return out;
    });
    assert(more.chestRows > 0 && more.chestIcons === more.chestRows, 'chest rows have icons'); assert(more.brew > 0 && more.brewIcons === more.brew && more.forgeIcon === 1, 'brewing and forge icons');
    await page.screenshot({ path: SHOTS + '/forge-brewing-1280.png' });
    await page.evaluate(() => { renderHouseChest(); });
    await page.screenshot({ path: SHOTS + '/chest-1280.png' });
    console.log('PASS shop, sell, house chest and forge/brewing rows show icons', more);

    // ---- cache: no per-render regeneration
    const cached = await page.evaluate(() => { const n = ICONS.cacheSize(); for (let i = 0; i < 3; i++) renderInventory(); return ICONS.cacheSize() - n; });
    assert(cached <= 4, 'icons are cached, not regenerated per render');
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS icons cached; no page errors');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
