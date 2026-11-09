// PREVIEW_URL=http://127.0.0.1:3204 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/logmap.test.js
// Phase 5 LOGMAP: quest logbook sketches and painted automap stamps.
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.LOGMAP_SHOTS || '';

// ---- static scan: every journal() string in js/*.js (and dialogue `journal: [cat, text]`) -----------
// Collect every string literal inside each call's argument list (balanced parens, quotes skipped).
function scanJournalCalls() {
  const dir = path.join(__dirname, '..', 'js');
  const sites = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f === 'logmap.js') continue;
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /(?<![\w.])journal\(|journal:\s*\[/g; let m;
    while ((m = re.exec(s))) {
      const line = s.slice(0, m.index).split('\n').length;
      if (/function\s+$/.test(s.slice(Math.max(0, m.index - 12), m.index))) continue;
      const open = m[0].endsWith('(') ? '(' : '[', close = open === '(' ? ')' : ']';
      let i = m.index + m[0].length, depth = 1; const lits = [];
      while (i < s.length && depth > 0) {
        const ch = s[i];
        if (ch === '\'' || ch === '"' || ch === '`') {
          let t = ''; i++;
          while (i < s.length && s[i] !== ch) { if (s[i] === '\\') { t += s[i + 1]; i += 2; continue; } t += s[i++]; }
          lits.push(t); i++; continue;
        }
        if (ch === open || ch === '(' || ch === '[') depth++;
        else if (ch === close || ch === ')' || ch === ']') depth--;
        i++;
      }
      sites.push({ where: f + ':' + line, lits, dynamic: /^\s*(null|q\.journal)/.test(s.slice(m.index + m[0].length, m.index + m[0].length + 12)) || lits.filter(t => t.length >= 25).length === 0 });
    }
  }
  return sites;
}

// new game -> character creation -> intro skip (same sequence as test/visual.test.js)
async function boot() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Ink Tester');
  await page.locator('#c-next').click();
  await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click();
  await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else {
      const next = page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first();
      if (!(await next.count())) throw new Error('Unknown creation step');
      await next.click();
    }
  }
  await page.locator('#c-go').click();
  await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof LOGMAP !== 'undefined');
  return { browser, page, errors };
}

(async () => {
  const sites = scanJournalCalls();
  const real = sites.filter(x => !x.dynamic);
  const dynamic = sites.filter(x => x.dynamic);
  assert(real.length >= 100, 'static scan found the journal strings (' + real.length + ')');
  // the only calls without a literal text are the dialogue relay and null placeholders
  assert(dynamic.every(d => d.lits.length <= 2), 'only relay/null journal sites are literal-free: ' + dynamic.map(d => d.where).join(' '));
  console.log('PASS static scan: ' + real.length + ' journal sites with literal text, ' + dynamic.length + ' relays/placeholders');

  const { browser, page, errors } = await boot();
  try {
    // ---- every journal string maps to a specific sketch (the entry's opening literal, and the whole call joined; the later
    // literals of a call are mid-sentence fragments, not entry beginnings) -------------------------------------------
    const mapped = await page.evaluate((ss) => ss.map(s => ({ where: s.where, ids: [LOGMAP.sketchFor(s.lits.slice(1).find(t => t.length >= 6)), LOGMAP.sketchFor(s.lits.slice(1).join(''))] })), real);
    const generic = mapped.filter(m => m.ids.some(id => id === 'quill'));
    assert.equal(generic.length, 0, 'every journal() string maps to a specific sketch; generic: ' + JSON.stringify(generic));
    const used = await page.evaluate((m) => [...new Set(m.flatMap(x => x.ids))], mapped);
    const known = await page.evaluate(() => Object.keys(LOGMAP.SUBJECTS));
    assert(used.every(id => known.includes(id)), 'all sketch ids are in the subject table');
    console.log('PASS all ' + mapped.length + ' journal() sites map to one of ' + used.length + ' quest sketches (generic quill only for unknown text)');
    assert.equal(await page.evaluate(() => LOGMAP.sketchFor('Something nobody wrote yet') + LOGMAP.sketchFor(null) + LOGMAP.sketchFor({})), 'quillquillquill');
    console.log('PASS unknown text falls back to the deliberate generic sketch');

    // ---- switches default on -----------------------------------------------------------------------
    assert.deepEqual(await page.evaluate(() => [GFX.logSketches, GFX.mapStamps, GFX.FX && ('logSketches' in GFX.FX || 'mapStamps' in GFX.FX)]), [true, true, false]);
    console.log('PASS switches default on and are not part of GFX.FX');

    // ---- logbook -----------------------------------------------------------------------------------
    const seed = () => page.evaluate(() => {
      G.journal = [
        { cat: 'main', text: 'Harrow has unbarred the North Gate for me. Kaelen Vance\'s hut lies north of the Hedge.', day: 0 },
        { cat: 'main', text: 'Old Harrow at the North Gate says the Cantor is expecting me.', day: 0 },
        { cat: 'main', text: 'I have the reverse-phase coil from Depot Three.', day: 1 },
        { cat: 'side', text: 'The Tower Bell: Amos Fell says nobody has rung the great bell.', day: 2 },
        { cat: 'side', text: 'I gave Davin\'s boots to Orla Hale. She asked me to sing, and I did not.', day: 2 },
        { cat: 'side', text: 'Surgeon-Grafter Rooke gave me Davin Hale\'s boots to carry.', day: 1 },
        { cat: 'side', text: 'Sable, the last Archivist of the Veil, is hiding in the mist.', day: 1 },
        { cat: 'side', text: 'Pim Carder has put out roots in his hands.', day: 1 },
      ];
    });
    await seed();
    await page.evaluate(() => { GFX.logSketches = false; G.state = 'panel'; renderLog(); });
    const offHTML = await page.evaluate(() => document.querySelector('#modal-panel').innerHTML);
    assert(!/lm-group|<img|<figure/.test(offHTML), 'logSketches off: no sketch markup');
    await page.evaluate(() => { GFX.logSketches = true; closeModal(); G.state = 'panel'; renderLog(); });
    const info = await page.evaluate(() => {
      const panel = document.querySelector('#modal-panel');
      const groups = [...panel.querySelectorAll('.lm-group')];
      const figs = groups.map(g => ({ id: g.querySelector('figure').dataset.sketch, alt: g.querySelector('img').alt, src: g.querySelector('img').getAttribute('src').slice(0, 22), n: g.querySelectorAll('.lm-entries > p').length }));
      // the original entries, in the original order, are all still there unchanged
      const ps = [...panel.querySelectorAll('p')].filter(p => p.firstElementChild && p.firstElementChild.classList.contains('muted'));
      return { figs, ps: ps.map(p => p.outerHTML), h3: [...panel.querySelectorAll('h3')].map(h => h.textContent), heights: [...panel.querySelectorAll('img')].map(i => [i.naturalWidth, i.naturalHeight]) };
    });
    assert.deepEqual(info.figs.map(f => f.id), ['gate', 'coil', 'bells', 'boots', 'sable', 'pim'], 'sketches grouped per storyline: ' + JSON.stringify(info.figs.map(f => f.id)));
    assert.equal(info.figs[0].n, 2, 'two consecutive gate entries share one sketch');
    assert.equal(info.figs[3].n, 2, 'both boots entries share one sketch');
    assert(info.figs.every(f => /^Ink sketch: \S/.test(f.alt) && (f.src === 'data:image/png;base64,' || f.src.indexOf('img/painted/sketch/') === 0)), 'every sketch has alt text naming its subject and is a data URL (or, once decoded, its painting)');
    assert.deepEqual(info.h3, ['The Rite', 'Other matters'], 'headings unchanged');
    assert.equal(info.ps.length, 8, 'all eight entries kept');
    assert(info.heights.every(h => h[0] === 144 && h[1] === 108), 'sketches decode');
    // entries identical to the flag-off render (same text/markup, same order)
    const offEntries = offHTML.match(/<p><span class="muted">[^]*?<\/p>/g);
    assert.deepEqual(info.ps, offEntries, 'entry paragraphs byte-identical to the original render');
    console.log('PASS logbook: grouped sketches with alt text, entries byte-identical to the original; flag off = original markup');

    // cached, drawn once, and not blank
    const cached = await page.evaluate(() => {
      const a = LOGMAP.sketchURL('gate'), b = LOGMAP.sketchURL('gate'); const out = { same: a === b, lens: {} };
      for (const id of Object.keys(LOGMAP.SUBJECTS)) out.lens[id] = LOGMAP.sketchURL(id).length;
      return out;
    });
    assert(cached.same, 'sketch URL cached');
    const distinct = new Set(Object.values(cached.lens));
    assert(Object.values(cached.lens).every(l => l > 5000), 'no sketch is blank: ' + JSON.stringify(cached.lens));
    assert(distinct.size >= Object.keys(cached.lens).length - 2, 'sketches are distinct drawings');
    const ink = await page.evaluate(async () => {
      const res = {};
      for (const id of Object.keys(LOGMAP.SUBJECTS)) {
        const img = new Image(); img.src = LOGMAP.sketchURL(id); await img.decode();
        const c = document.createElement('canvas'); c.width = 144; c.height = 108; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, 144, 108).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 110) dark++;
        res[id] = dark;
      }
      return res;
    });
    assert(Object.values(ink).every(n => n > 150), 'every sketch has ink strokes: ' + JSON.stringify(ink));
    console.log('PASS sketches cached, distinct and inked (' + Object.keys(ink).length + ' drawings)');

    // hostile saves: journal text is only ever text
    const hostile = await page.evaluate(() => {
      window.__pwn = 0;
      const d = JSON.parse(JSON.stringify(snapshotGame()));
      d.journal = [
        { cat: 'main', text: '<img src=x onerror="window.__pwn=1">Harrow <script>window.__pwn=2</script>North Gate', day: 0 },
        { cat: 'side<b>', text: '"><svg onload="window.__pwn=3"> The Tower Bell: <iframe src=javascript:1>', day: '<i>', extra: '<img src=y onerror="window.__pwn=4">' },
        { cat: 'side', text: { toString() { return '<img src=z onerror="window.__pwn=5">'; } }, day: 1 },
      ];
      restoreGame(d);
      G.state = 'panel'; renderLog();
      const panel = document.querySelector('#modal-panel');
      return {
        pwn: window.__pwn, html: panel.innerHTML, text: panel.textContent,
        bad: panel.querySelectorAll('script,svg,iframe,b,i,[onerror],[onload],img[src="x"],img[src="y"],img[src="z"]').length,
        ids: [...panel.querySelectorAll('figure')].map(f => f.dataset.sketch),
        alts: [...panel.querySelectorAll('img')].map(i => i.alt),
      };
    });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.__pwn), 0, 'no hostile script ran');
    assert.equal(hostile.bad, 0, 'hostile journal text creates no elements: ' + hostile.html.slice(0, 300));
    assert(hostile.ids.every(id => Object.keys(cached.lens).includes(id)), 'sketch ids come only from the constant table');
    assert(hostile.alts.every(a => /^Ink sketch: [A-Za-z' ,.\-]+$/.test(a)), 'alt text comes only from the constant table: ' + JSON.stringify(hostile.alts));
    assert(/img src=x/.test(hostile.text), 'hostile text is shown as plain text');
    console.log('PASS hostile journal text renders as text only; sketch ids and alts are constants');

    // compact 640x400: no horizontal overflow, entries readable
    await page.evaluate(() => {
      closeModal(); G.state = 'play'; const t = ['Harrow has unbarred the North Gate for me.', 'The Tower Bell: Amos Fell says nobody has rung the great bell in the Mausoleum\'s tower since Nan was buried.', 'Surgeon-Grafter Rooke gave me Davin Hale\'s boots to carry to his mother Orla, who is rooted into her chair in the house behind the tannery.', 'Part Four: Coda. The Kestrel came down in the Deep Woods of the Spectral Woods, by the Mausoleum of Chords, with her number-two lift-tank holed.', 'The Hush-Gift: the child is called Linnet. She is at the camp fire now, and Lyra is teaching her the skipping-rhyme.', 'Sable, the last Archivist of the Veil, is hiding in the mist outside the Hedge with the stolen Bound Ledger.'];
      G.journal = t.map((x, i) => ({ cat: i % 2 ? 'side' : 'main', text: x, day: i }));
    });
    for (const [w, h, tag] of [[1280, 800, ''], [640, 400, '-compact']]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => { closeModal(); G.state = 'panel'; renderLog(); });
      const fit = await page.evaluate(() => { const p = document.querySelector('#modal-panel'); const r = p.getBoundingClientRect(); return { over: p.scrollWidth - p.clientWidth, right: r.right, bottom: r.bottom, vw: innerWidth, vh: innerHeight, imgW: document.querySelector('.lm-sketch img').getBoundingClientRect().width }; });
      assert(fit.over <= 1 && fit.right <= fit.vw + 1, 'logbook has no horizontal overflow at ' + w + 'x' + h + ' ' + JSON.stringify(fit));
      if (tag) assert(fit.imgW >= 40, 'compact sketches stay visible (' + fit.imgW + 'px)');
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'log' + tag + '.png') });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS logbook fits 1280x800 and 640x400 without horizontal overflow');

    // ---- automap -----------------------------------------------------------------------------------
    const stampsInfo = await page.evaluate(() => {
      const m = { w: 10, h: 10, visited: new Uint8Array(100), cells: new Array(100).fill(null) };
      const open = (x, y) => { m.visited[y * 10 + x] = 1; };
      m.cells[2 * 10 + 2] = { door: true }; open(2, 2);
      m.cells[2 * 10 + 7] = { portal: { map: 'x' } }; // never visited: must not be stamped
      m.cells[5 * 10 + 5] = { portal: { map: 'x' } }; open(5, 5);
      const ents = [
        { kind: 'npc', id: 'bettany', x: 3.5, y: 3.5 },                       // shop + quest-free
        { kind: 'npc', id: 'vane', x: 4.5, y: 3.5 },                          // shop and quest giver
        { kind: 'npc', id: 'harrow', x: 4.5, y: 4.5 },                        // quest giver
        { kind: 'npc', id: 'cat', x: 4.5, y: 5.5 },                           // nothing
        { kind: 'npc', id: '__proto__', x: 4.5, y: 5.5 },
        { kind: 'npc', id: 'harrow', x: 8.5, y: 8.5 },                        // unexplored
        { kind: 'enemy', type: 'hound', x: 6.5, y: 6.5 },
        { kind: 'enemy', type: 'wearer', x: 6.5, y: 7.5 },                    // boss
        { kind: 'enemy', type: 'weaver', x: 5.5, y: 7.5 },                    // boss (wilds / grove)
        { kind: 'enemy', type: 'hound', x: 5.5, y: 6.5, hidden: true },       // unseen
        { kind: 'enemy', type: 'hound', x: 5.5, y: 6.5, dead: true },
        { kind: 'enemy', type: 'hound', x: 9.5, y: 9.5 },                     // unexplored
        { kind: 'deco', trapType: 'net', trapId: 't1', x: 6.5, y: 5.5 },
        { kind: 'deco', trapType: 'nonsense', trapId: 't2', x: 6.5, y: 5.5 },
      ];
      for (const e of ents) if (e.x < 8) open(e.x | 0, e.y | 0);
      const kinds = (list) => list.map(s => s.kind).sort().join(',');
      const res = { all: kinds(LOGMAP.collectStamps(m, ents, {})) };
      res.sprung = kinds(LOGMAP.collectStamps(m, ents, { ['trap:' + G.mapId + ':t1']: 'triggered' }));
      const q = UPG.questMarkers; UPG.questMarkers = false; res.noQuest = kinds(LOGMAP.collectStamps(m, ents, {})); UPG.questMarkers = q;
      m.visited.fill(0); res.none = LOGMAP.collectStamps(m, ents, {}).length;
      return res;
    });
    assert.equal(stampsInfo.all, 'boss,boss,danger,door,door,quest,quest,shop,shop,trap', 'stamps by kind: ' + stampsInfo.all);
    assert(!/trap/.test(stampsInfo.sprung), 'a sprung trap is not stamped');
    assert(!/quest/.test(stampsInfo.noQuest) && /shop/.test(stampsInfo.noQuest), 'UPG.questMarkers off hides quest-giver stamps only');
    assert.equal(stampsInfo.none, 0, 'nothing is stamped in unvisited cells');
    console.log('PASS stamp collection: doors/portals, quest givers, shops, dangers, bosses, traps; visited cells only');

    // the actual map
    await page.evaluate(() => {
      closeModal(); G.state = 'play';
      const m = G.map; for (let i = 0; i < m.visited.length; i++) m.visited[i] = 1;
      G.ents.push(hydrate({ kind: 'enemy', type: 'hound', x: Engine.cam.x + 1.5, y: Engine.cam.y + 0.5 }));
    });
    const hasEnt = await page.evaluate(() => LOGMAP.collectStamps(G.map, G.ents, G.flags).reduce((a, s) => (a[s.kind] = (a[s.kind] || 0) + 1, a), {}));
    assert(hasEnt.door > 0 && hasEnt.shop > 0 && hasEnt.quest > 0 && hasEnt.danger > 0, 'the real map yields doors, shops, quest givers and dangers: ' + JSON.stringify(hasEnt));
    const mapOff = await page.evaluate(() => { GFX.mapStamps = false; G.state = 'panel'; renderMap(); const c = document.getElementById('amap'); return { url: c.toDataURL(), legend: !!document.getElementById('lm-legend'), cls: document.getElementById('modal-panel').classList.contains('lm-map'), html: document.getElementById('modal-panel').innerHTML.replace(/<canvas[^>]*>/, '') }; });
    assert(!mapOff.legend && !mapOff.cls, 'mapStamps off: no legend, no class');
    const mapOn = await page.evaluate(() => { GFX.mapStamps = true; closeModal(); G.state = 'panel'; renderMap(); const c = document.getElementById('amap'); const lg = document.getElementById('lm-legend'); return { url: c.toDataURL(), keys: [...lg.querySelectorAll('.lm-key')].map(k => k.textContent), html: document.getElementById('modal-panel').innerHTML.replace(/<canvas[^>]*>/, ''), cls: document.getElementById('modal-panel').classList.contains('lm-map') }; });
    assert.equal(mapOn.html.replace(/<div class="lm-legend"[^]*?<\/div>/, ''), mapOff.html, 'mapStamps on adds only the legend to the original markup');
    assert.notEqual(mapOn.url, mapOff.url, 'stamps are painted on the automap canvas');
    assert.deepEqual(mapOn.keys, ['Door', 'Quest giver', 'Shop', 'Danger', 'Boss', 'Trap'], 'legend lists every stamp kind');
    assert(mapOn.cls, 'panel marked for the compact map height');
    console.log('PASS automap stamps painted with a legend; mapStamps off = original canvas and markup');

    // nothing explored = nothing stamped (canvas identical with the switch on and off)
    const blank = await page.evaluate(() => {
      const keep = G.map.visited.slice(); G.map.visited.fill(0);
      const keepEnts = G.ents; G.ents = G.ents.filter(e => e.kind !== 'npc' || true);
      const grab = (flag) => { GFX.mapStamps = flag; closeModal(); G.state = 'panel'; renderMap(); return document.getElementById('amap').toDataURL(); };
      const off = grab(false), on = grab(true);
      GFX.mapStamps = true; G.map.visited.set(keep); G.ents = keepEnts;
      return off === on;
    });
    assert(blank, 'an unexplored map is identical with stamps on and off (no reveal)');
    console.log('PASS stamps never reveal unexplored places');

    for (const [w, h, tag] of [[1280, 800, ''], [640, 400, '-compact']]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => { closeModal(); G.state = 'panel'; renderMap(); });
      const fit = await page.evaluate(() => {
        const p = document.querySelector('#modal-panel'), pr = p.getBoundingClientRect(), lg = document.getElementById('lm-legend').getBoundingClientRect(), cv = document.getElementById('amap').getBoundingClientRect();
        return { over: p.scrollWidth - p.clientWidth, lgBottom: lg.bottom, lgTop: lg.top, cvBottom: cv.bottom, panelBottom: pr.bottom, vh: innerHeight, scroll: p.scrollHeight - p.clientHeight };
      });
      assert(fit.over <= 1, 'map has no horizontal overflow at ' + w + 'x' + h + ' ' + JSON.stringify(fit));
      assert(fit.lgBottom <= fit.vh + 1 && fit.lgBottom <= fit.panelBottom + 1, 'legend fully visible at ' + w + 'x' + h + ' ' + JSON.stringify(fit));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'map' + tag + '.png') });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS automap and legend fit 1280x800 and 640x400');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS no page errors');
  } finally {
    await browser.close();
  }
})().catch(e => { console.log('FAIL ' + (e && e.message || e)); process.exit(1); });
