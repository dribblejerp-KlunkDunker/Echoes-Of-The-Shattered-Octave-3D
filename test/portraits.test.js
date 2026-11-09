// PREVIEW_URL=http://127.0.0.1:3203 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/portraits.test.js
// Phase 5 mood portraits (js/portraits.js): four variants per major NPC, deterministic side-effect-free
// selection, hostile ids fall back, switch off = original DOM. Screenshots go to PORTRAITS_SHOTS (default: OS temp dir).
'use strict';
const os = require('os'), path = require('path'), fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.PORTRAITS_SHOTS || path.join(os.tmpdir(), 'portraits-shots');
fs.mkdirSync(SHOTS, { recursive: true });
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3203');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PORTRAITS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Face');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(400);

    ok(await page.evaluate(() => GFX.moodPortraits === true && !('moodPortraits' in GFX.FX)), 'switch GFX.moodPortraits defaults on and is not in GFX.FX');
    await page.evaluate(() => PORTRAITS.ready());

    // ---- 1. the list and the variants ----
    const roster = await page.evaluate(() => {
      const ids = Object.keys(PORTRAITS.MAJOR);
      const used = new Set(Object.values(NPCS).map(n => n.portrait));
      return { n: ids.length, core: ['kaelen', 'lyra', 'vane', 'hetty', 'sable', 'aldric', 'halder'].every(i => ids.includes(i)), allExist: ids.every(i => used.has(i)) };
    });
    ok(roster.n >= 10 && roster.core, `${roster.n} major NPCs incl. Kaelen, Lyra, Vane, Hetty, Sable, Aldric, Halder`);
    ok(roster.allExist, 'every listed portrait id belongs to an NPCS entry');

    const distinct = await page.evaluate(async () => {
      const px = url => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 96, 96); res(x.getImageData(0, 0, 96, 96).data); }; i.src = url; });
      const diff = (a, b) => { let s = 0; for (let k = 0; k < a.length; k += 4) s += Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]); return s / (a.length / 4) / 3; };
      const bad = [];
      for (const id of Object.keys(PORTRAITS.MAJOR)) {
        const imgs = [await px('img/p_' + id + '.jpg')];
        for (const m of PORTRAITS.MOODS) { const u = PORTRAITS.variant(id, m); if (!/^data:image\//.test(u || '')) { bad.push(id + ':' + m + ' missing'); imgs.push(null); continue; } imgs.push(await px(u)); }
        // Phase 20: moods are local expression edits now (brows, lids, mouth), so "distinct" means either a global
        // change (the graded stand-in) or a clear local one: at least 20 pixels that moved by more than 8 levels
        // (JPEG re-encoding alone moves a pixel by 2-4)
        const local = (a, b) => { let n = 0; for (let k = 0; k < a.length; k += 4) if ((Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2])) / 3 > 8) n++; return n; };
        for (let a = 0; a < imgs.length; a++) for (let b = a + 1; b < imgs.length; b++) if (imgs[a] && imgs[b] && diff(imgs[a], imgs[b]) < 4 && local(imgs[a], imgs[b]) < 20) bad.push(id + ' ' + a + '/' + b + ':' + local(imgs[a], imgs[b]));
      }
      return bad;
    });
    ok(distinct.length === 0, 'each major NPC has 4 variants, all distinct from each other and the original' + (distinct.length ? ' ' + distinct.slice(0, 6) : ''));

    // ---- 2. selection: deterministic, no mutation ----
    const sel = await page.evaluate(() => {
      G.flags.lyra_met = true; G.flags.coil_done = true;
      const flagsBefore = JSON.stringify(G.flags), out = { mutated: false, nondet: false, count: 0 };
      for (const k of Object.keys(NPCS)) {
        const n = NPCS[k]; if (!PORTRAITS.has(n.portrait)) continue;
        for (const tone of ['polite', 'normal', 'blunt']) {
          DLG.npc = n; DLG.tone = tone; DLG.log = [{ who: 'them', t: n.greet[tone] }];
          const dBefore = JSON.stringify(DLG);
          const a = PORTRAITS.pick(n), b = PORTRAITS.pick(n), c = PORTRAITS.pick(n, { tone, log: DLG.log, flags: G.flags });
          if (a !== b || a !== c) out.nondet = true;
          if (a !== null && !PORTRAITS.MOODS.includes(a)) out.nondet = true;
          if (JSON.stringify(G.flags) !== flagsBefore || JSON.stringify(DLG) !== dBefore) out.mutated = true;
          out.count++;
        }
      }
      const g = (id, tone) => { const n = Object.values(NPCS).find(x => x.portrait === id); return PORTRAITS.pick(n, { tone, log: [{ who: 'them', t: n.greet[tone] }], flags: {} }); };
      out.vaneP = g('vane', 'polite'); out.vaneB = g('vane', 'blunt'); out.hettyP = g('hetty', 'polite'); out.harrowB = g('harrow', 'blunt');
      out.kaelenN = g('kaelen', 'normal');
      const k = NPCS.kaelen;
      out.no = PORTRAITS.pick(k, { tone: 'blunt', log: [{ who: 'them', t: 'No.' }], flags: {} });
      out.flagSad = PORTRAITS.pick(k, { tone: 'normal', log: [{ who: 'them', t: 'Hearthday.' }], flags: { coil_done: true } });
      out.flagLaterLine = PORTRAITS.pick(k, { tone: 'normal', log: [{ who: 'them', t: 'Hearthday.' }, { who: 'you', t: 'x' }, { who: 'them', t: 'Fine.' }], flags: { coil_done: true } });
      return out;
    });
    ok(!sel.mutated, `pick never mutates G.flags or DLG (${sel.count} NPC/tone cases)`);
    ok(!sel.nondet, 'pick is deterministic and returns only known moods or null');
    ok(sel.vaneP === 'afraid' && sel.vaneB === 'wry' && sel.hettyP === 'sad' && sel.harrowB === 'angry', `phrase table: vane polite=${sel.vaneP}, vane blunt=${sel.vaneB}, hetty polite=${sel.hettyP}, harrow blunt=${sel.harrowB}`);
    ok(sel.kaelenN === null, 'a calm line keeps the neutral portrait (kaelen normal)');
    ok(sel.no === 'angry' && sel.flagSad === 'sad' && sel.flagLaterLine === null, 'rebuff phrase -> angry; flag mood only on the opening line');

    // ---- 3. hostile / unknown ids ----
    const hostile = await page.evaluate(() => {
      const res = [];
      for (const id of ['__proto__', 'constructor', 'toString', '../../x', '"><script>1</script>', 'townsman', 'aegis', '', null, 42, {}]) {
        const n = { portrait: id, greet: { blunt: 'x' } };
        res.push(PORTRAITS.pick(n, { tone: 'blunt', log: [{ who: 'them', t: 'Ha! Please. No.' }], flags: {} }) === null && PORTRAITS.variant(id, 'angry') === null && !PORTRAITS.has(id));
      }
      // hostile log / flags shapes must not throw
      const k = NPCS.kaelen;
      for (const log of [null, 'x', [null], [{ who: 'them', t: { toString() { throw 1; } } }], [{ who: 'them', t: '<img src=x onerror=alert(1)>' }]]) {
        try { PORTRAITS.pick(k, { log, tone: 'blunt', flags: null }); res.push(true); } catch (e) { res.push(false); }
      }
      // a made-up NPC with a hostile portrait id leaves the dialogue image alone
      DLG.npc = { name: 'Odd', portrait: '__proto__', greet: { normal: 'Ha!' } }; DLG.tone = 'normal'; DLG.log = [{ who: 'them', t: 'Ha! Please.' }];
      res.push(PORTRAITS.apply() === null);
      return res;
    });
    ok(hostile.every(Boolean), 'unknown, prototype-named and hostile ids fall back to the original (' + hostile.length + ' cases)');

    // ---- 4. in the dialogue DOM ----
    await page.evaluate(() => { G.flags = {}; DLG.npc = NPCS.vane; DLG.ent = null; DLG.tone = 'polite'; DLG.choices = null; DLG.log = [{ who: 'them', t: NPCS.vane.greet.polite }]; G.state = 'dialogue'; renderDialogue(null); });
    await page.waitForFunction(() => document.querySelector('#modal-panel .dlg .port img').dataset.mood === 'afraid', null, { timeout: 4000 });
    let dom = await page.evaluate(() => { const i = document.querySelector('#modal-panel .dlg .port img'); return { src: i.src.slice(0, 15), alt: i.alt, mood: i.dataset.mood }; });
    ok(dom.src === 'data:image/jpeg' && dom.alt === 'Vane, afraid', 'dialogue shows the afraid portrait with alt "' + dom.alt + '"');
    await page.screenshot({ path: path.join(SHOTS, 'dialogue-afraid.png') });
    await page.evaluate(() => { DLG.tone = 'blunt'; DLG.log = [{ who: 'them', t: NPCS.vane.greet.blunt }]; renderDialogue(null); });
    await page.waitForFunction(() => document.querySelector('#modal-panel .dlg .port img').dataset.mood === 'wry', null, { timeout: 4000 });
    ok(true, 'changing line and tone swaps to the wry portrait');
    await page.screenshot({ path: path.join(SHOTS, 'dialogue-wry.png') });
    await page.evaluate(() => { DLG.npc = NPCS.kaelen; DLG.tone = 'normal'; DLG.log = [{ who: 'them', t: NPCS.kaelen.greet.normal }]; renderDialogue(null); });
    dom = await page.evaluate(() => { const i = document.querySelector('#modal-panel .dlg .port img'); return { src: i.getAttribute('src'), alt: i.alt, mood: i.dataset.mood || null }; });
    ok(dom.src === 'img/p_kaelen.jpg' && dom.alt === '' && dom.mood === null, 'a neutral line leaves the original image element untouched');

    // ---- 5. switch off = original DOM ----
    const off = await page.evaluate(() => {
      GFX.moodPortraits = false;
      const html = [];
      for (const [npc, tone] of [[NPCS.vane, 'polite'], [NPCS.vane, 'blunt'], [NPCS.hetty, 'polite']]) {
        DLG.npc = npc; DLG.tone = tone; DLG.log = [{ who: 'them', t: npc.greet[tone] }]; renderDialogue(null);
        html.push(document.querySelector('#modal-panel').innerHTML);
      }
      GFX.moodPortraits = true;
      return html;
    });
    ok(off.every(h => h.includes('src="img/p_') && h.includes('alt=""') && !h.includes('data-mood') && !h.includes('data:image') && !h.includes('pt-swap')), 'switch off: dialogue DOM has the original image, empty alt, no mood markup');

    // ---- 6. screenshots: contact sheet and compact ----
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div id="sheet" style="position:fixed;inset:0;z-index:9999;background:#120c0e;color:#e8d8b0;font:14px sans-serif;padding:8px;overflow:auto"></div>');
      const s = document.querySelector('#sheet');
      for (const id of Object.keys(PORTRAITS.MAJOR)) { const row = document.createElement('div'); row.style.cssText = 'display:inline-block;margin:4px;text-align:center';
        for (const m of [null, ...PORTRAITS.MOODS]) { const i = new Image(); i.width = i.height = 96; i.style.margin = '1px'; i.src = m ? PORTRAITS.variant(id, m) : 'img/p_' + id + '.jpg'; row.appendChild(i); }
        row.appendChild(document.createElement('br')); row.append(id); s.appendChild(row); } });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'contact-sheet.png') });
    await page.evaluate(() => document.querySelector('#sheet').remove());
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { DLG.npc = NPCS.vane; DLG.tone = 'polite'; DLG.log = [{ who: 'them', t: NPCS.vane.greet.polite }]; renderDialogue(null); });
    await page.waitForTimeout(500);
    const compact = await page.evaluate(() => { const p = document.querySelector('#modal-panel'); return { over: p.scrollWidth > p.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, mood: document.querySelector('#modal-panel .dlg .port img').dataset.mood }; });
    ok(!compact.over && compact.mood === 'afraid', 'compact 640x400: mood portrait shown, no horizontal overflow');
    await page.screenshot({ path: path.join(SHOTS, 'dialogue-compact.png') });

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
