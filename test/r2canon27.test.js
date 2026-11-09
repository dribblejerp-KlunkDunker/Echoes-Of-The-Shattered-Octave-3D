// PREVIEW_URL=http://127.0.0.1:4074 PLAYWRIGHT_MODULE=/opt/node-tools/node_modules/playwright node test/r2canon27.test.js
// Release road R2, the canon sweep. One check per fix, against Book One and the Series Bible:
//   the Boar keeps its own rules; the dying names are invented; the Cloister's tapes are canon's; the lore books;
//   Tobin's lyre by the stile and his seven reed-pipes; the lease is Aldric's; Ignatius gives once and the sexton keeps
//   the stock; the Mausoleum is the Veil's House; the Wendle twins; the Hall of Carriage at the Organum; Lyra whistles
//   before her voice returns; the smaller fixes; the near-collisions; the Cloister letter; Flume-reeds.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const allJs = () => fs.readdirSync(path.join(ROOT, 'js')).filter((f) => f.endsWith('.js') && !/library26-books|voice-lines/.test(f)).map((f) => src('js/' + f)).join('\n');

let fails = 0;
const check = (cond, label) => { if (cond) console.log('PASS ' + label); else { fails++; console.log('FAIL ' + label); } };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4074');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof CHAPEL27 !== 'undefined' && !document.querySelector('#loading')?.classList.contains('on'));
    await page.locator('#btn-new').click();
    await page.locator('#cname').fill('Canon Tester');
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
    await page.waitForFunction(() => G.state === 'play');
    await page.evaluate(() => { window.__ev = []; window.showEvent = (t, b, c) => { window.__ev.push({ t, b, c }); }; });

    // ---- the Boar & Dulcimer: NO DICE upstairs, NO SINGING, so the bones are in the cellar and the set is silent
    const boar = await page.evaluate(() => {
      loadMap('tavern'); const g = G.ents.find((e) => e._p11t === 'garrow');
      const cellarDoor = G.map.get(3, 9); const T = TAVERN.TX.perf;
      return { gy: g && g.y, below: g && g.y > 9, free: g && !solidAt(g.x, g.y, g), door: !!(cellarDoor && cellarDoor.door), claps: /clap|stamp/i.test([T.low, T.mid, T.high].join(' ')), silent: /without a sound|nobody makes a sound/.test(T.mid + T.high) };
    });
    check(boar.below && boar.free && boar.door, 'the Boar: Garrow\'s bones are in the cellar, past the cellar door (y ' + boar.gy + ')');
    check(!boar.claps && boar.silent, 'the Boar: the evening set is applauded without a sound');

    // ---- names: invented dying names, canon's tapes, the Veil's tomb names, near-collisions
    const names = await page.evaluate(() => ({ pool: NAMES_POOL.slice(), tapes: CLOISTER_NAMES.slice(), tombs: TOMB_NOTES.map((t) => t[0]) }));
    check(!names.pool.some((n) => ['Joss Carder', 'Emory Wain', 'Wren Halloway', 'Annet Sowerby', 'Merret Salt'].includes(n)) && !names.pool.some((n) => ['Tamsin Reed', 'Corwin Aye', 'Mirren Salk'].includes(n)) && names.pool.length === 15, 'the Legionnaires\' dying names are invented people only (Tamsin Reed is Depot Three\'s alone; Corwin Aye and Mirren Salk are in the Kestrel\'s crates)');
    const voices = JSON.parse(src('voices/script.json')).lines.find((l) => l.id === 'core.death').names;
    check(names.pool.every((n) => voices.includes(n) && fs.existsSync(path.join(ROOT, 'voices/core_voice/core.death.' + n.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.mp3'))), 'every dying name has its recording');
    check(['M. Orry', 'Ben Dray', 'A. Sowerby', 'Halloran', 'Marchant', 'Tipp'].every((n) => names.tapes.includes(n)) && names.tapes.length === 9 && !names.tapes.includes('Elsie Fenn') && !names.tapes.some((n) => /Wick/.test(n)), 'the Cloister\'s nine tapes are canon\'s (ch. 20), and none of them is a Wick');
    check(names.tombs.every((n) => /^Scribe /.test(n)), 'the Mausoleum\'s tombs are the Veil\'s scribes, not "Cantors of Memory"');
    const js = allJs();
    check(!/Cantors? of Memory/.test(js) && /House of the Silent Veil/.test(js), 'nothing calls it a tomb of the Cantors of Memory; it is the House of the Silent Veil');
    check(!/Pellam Dree|Wenna Marl|Annet Sorrel|Orrin Haft|Joss Wendle|Tanner twins/.test(js), 'near-collisions renamed: Tobit Dree, Bethan Marl, Aveline Sorrel, Barnaby Haft, Ned Wendle, the Wendle twins');

    // ---- the lore books
    const books = await page.evaluate(() => ({ oct: LORE_BOOKS.find((b) => b.id === 'bk_octave').body, rhyme: LORE_BOOKS.find((b) => b.id === 'bk_narrow').body }));
    check(/Time in the Shifting Dunes \(417 Hz\)/.test(books.oct) && /Decay at the Gate \(852 Hz\)/.test(books.oct) && !/Silica|Keynote|its blood/.test(books.oct), 'On the Eight Anchors: canon\'s eight, and no spoiled blood');
    check(/Voice at the hedge, voice at the door/.test(books.rhyme) && /so murmur, my lamb, in the Narrow\. Hush\./.test(books.rhyme), 'the skipping rhyme is canon\'s (Book One\'s opening epigraph)');

    // ---- Tobin: his lyre is buried by the stile; his seven reed-pipes are in Lyra's house
    const tobin = await page.evaluate(() => {
      const c = G.maps.clearing.entities.find((e) => e.use === 'tobin_cairn');
      loadMap('lyra_house'); const pipes = G.ents.find((e) => e.tobinPipes);
      window.__ev.length = 0; if (pipes) useDeco(pipes); const ev = window.__ev[0] || {};
      const before = G.map.entities.filter((e) => e.tobinPipes).length; loadMap('lyra_house'); const after = G.map.entities.filter((e) => e.tobinPipes).length;
      const snap = snapshotGame(); const saved = JSON.stringify(snap.maps.lyra_house || {}).includes('tobinPipes');
      return { label: c && c.label, pipes: !!pipes, title: ev.t, body: ev.b, once: before === 1 && after === 1, saved };
    });
    check(/old stile/.test(tobin.label) && /buried his lyre/.test(tobin.label), 'the cairn is by the stile, where they buried his lyre');
    check(tobin.pipes && tobin.title === 'Tobin\'s reed-pipes' && /Seven reed-pipes/.test(tobin.body) && tobin.once && !tobin.saved, 'Tobin\'s seven reed-pipes hang in Lyra\'s house, once, and are never saved');

    // ---- the lease, the sexton, Ignatius
    check(/Aldric Vance, Governor, 414/.test(src('js/heist16.js')) && !/Alder Mossbrook, for the Reeve-Moot, 404/.test(src('js/heist16.js')), 'the quarry lease is Aldric\'s, 414; Mossbrook only witnessed it');
    const chapel = await page.evaluate(() => {
      const keep = Object.assign({}, G.flags); G.flags = Object.assign({}, keep, { greening: false });
      loadMap('chapel'); const os = G.ents.filter((e) => e._c27 === 'orrin' || e.id === 'p16h_orrin'); const o = os[0];
      const out = { orrin: os.length === 1, free: o && !solidAt(o.x, o.y, o), shop: ((NPCS[o && o.id] || {}).shop || []).map((s) => s.item), igShop: !!(NPCS.ignatius.shop && NPCS.ignatius.shop.length), rumour: RUMOURS.some((r) => /Ignatius sells/.test(r)) };
      // with heist16's business over (the rite begun) but Oakhaven still standing, this module stands him instead
      G.flags = Object.assign({}, keep, { greening: false, rite_started: true }); loadMap('chapel'); const os2 = G.ents.filter((e) => e._c27 === 'orrin' || e.id === 'p16h_orrin');
      out.fallback = os2.length === 1 && os2[0]._c27 === 'orrin' && (NPCS.orrin.shop || []).some((s) => s.item === 'p12_rod');
      G.flags = Object.assign({}, keep, { ignatius_met: true }); const n0 = (G.player.inv.find((s) => s.id === 'pellets') || {}).n || 0;
      const q1 = NPCS.ignatius.quest(G); const q2 = NPCS.ignatius.quest(G); const n1 = (G.player.inv.find((s) => s.id === 'pellets') || {}).n || 0;
      out.gave = n1 > n0 && /gives, once/.test(q1 && q1.text) && !(q2 && /gives, once/.test(q2.text));
      G.flags = Object.assign({}, keep, { greening: true }); loadMap('chapel'); out.goneAfter = !G.ents.some((e) => e._c27 === 'orrin' || e.id === 'p16h_orrin');
      G.flags = keep; loadMap('oakhaven'); G.state = 'play'; return out;
    });
    check(chapel.orrin && chapel.free && chapel.fallback && ['w_mace', 'w_spear', 'a_bellhelm', 'tonic', 'p12_rod'].every((i) => chapel.shop.includes(i)), 'Orrin Pale the sexton stands in the chapel, only one of him, with the stock, the dowsing rod included');
    check(!chapel.igShop && !chapel.rumour && chapel.gave && chapel.goneAfter, 'Ignatius keeps no shop and gives once; the sexton is gone with Oakhaven');

    // ---- Lyra whistles before her voice returns
    const lyra = await page.evaluate(() => { const keep = Object.assign({}, G.flags); G.flags.lyra_voice = false; const a = COMPANIONS.lyra.ability.name; G.flags.lyra_voice = true; const b = COMPANIONS.lyra.ability.name; G.flags = keep; return { a, b }; });
    check(lyra.a === 'Whistled Fifth' && lyra.b === 'Calling-Song', 'Lyra whistles the fifth until her voice returns, then sings');

    // ---- the smaller fixes
    check(/twenty paces from my door/.test(src('js/companion-talk.js')) && !/On the hound-bed, outside my hut/.test(src('js/companion-talk.js')), 'Kaelen\'s hound\'s bed is canon\'s: a fear, not a refuge');
    check(!/He said a martyr is just a musician/.test(src('js/companion-talk.js')) && /I told him once, when I was twelve/.test(src('js/companion-talk.js')), 'the martyr line is Lyra\'s own');
    check(!/beasts or proctors/.test(src('js/upgrades.js')), 'the noticeboard posts no public bounty on proctors');
    const menus = await page.evaluate(() => ({ hetty: (NPCS.hetty.shop || []).map((s) => s.item).filter((i) => /mutton/.test(i)), gideon: (NPCS.p22_gideon.shop || []).filter((s) => /mutton/.test(s.item)).length }));
    check(menus.hetty.join() === 'p22_salt_mutton' && menus.gideon >= 4, 'Oakhaven sells only dear salt mutton; Wethercombe\'s inn has the flock\'s dishes');
    check(/If we ever reach the Organum, the Hall of Carriage/.test(src('js/upgrades.js')) && !/Port Cantabile, the Hall of Carriage/.test(src('js/upgrades.js')), 'the Hall of Carriage is at the Organum');
    check(!/Cloister of the Lost Choir[^']*Thursday/.test(src('js/grove.js')), 'nothing in Whisper-Grove from before 416 calls it the Cloister of the Lost Choir');
    check(!/wind-reed/i.test(src('js/reedcraft.js').replace('Not the old wind-reed', '')) && /Flume-Reed/.test(src('js/reedcraft.js')), 'reedcraft cuts Flume-reeds; the wind-reeds turned in 412');

    check(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL R2 TESTS PASSED');
  process.exit(fails ? 1 : 0);
})();
