// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/parish.test.js
// Phase 9, team PARISH: "The Third Parish" (js/parish.js).
//   access (topics, hedge door, travel waypoint, the Greening's one line), the three linked maps, flood-fill
//   reachability stage by stage, the puzzles (bells, sluice, lever, bar, sung wall, register), the ending (Ignatius /
//   Lyra), both foes (Mire-drone despair + positional drone, Fret-crawler sever + HUD + invisibility), the reed-case,
//   the death-picture fallback, saves (in the dungeon, old, hostile), 640x400 and no page errors.
// SHOT_DIR=<dir> also writes screenshots there. Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /parish/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PARISH !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Parish Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
  return { page, errors };
}

const HELPERS = () => {
  window.T = {
    // a clean slate: my flags gone, my three maps rebuilt, a sturdy traveller, a quiet sky
    reset() {
      for (const k of Object.keys(G.flags)) if (k.startsWith('p9p_') || k === 'greening' || k === 'p6t_page_10') delete G.flags[k];
      const fresh = buildAllMaps();
      for (const id of PARISH.MAPS) G.maps[id] = fresh[id];
      G.maps.clearing = fresh.clearing;
      const p = G.player; p.hp = p.hpMax = 999; p.fat = p.fatMax; p.voice = p.voiceMax; p.needs = false; p.hunger = 100; p.sleep = 100;
      p.inv = p.inv.filter(s => !/^p9_/.test(s.id)); p.gold = 0;
      G.dead = false; G.state = 'play'; G.keys = {}; G.attack.t = 0; G.song.t = 0; G.stillT = 0;
      PARISH.T.sever = 0; PARISH.T.despair = 0;
      UPG.p9Despair = true; GFX.reduceMotion = false; GFX.noFlash = false;
    },
    go(id, x, y, dir) { loadMap(id, { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; },
    ent(pred) { return G.ents.find(pred); },
    use(e) { useDeco(e); },
    adv(ms) { window.advanceTime(ms); },
    quiet() { for (const e of G.ents) if (e.kind === 'enemy') { e.hidden = true; e.dead = true; } },
    // an independent flood fill over the real map: gates by their flags, deep water walls, portal doors terminal
    reach(m, sx, sy) {
      const open = (x, y) => {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
        const c = m.cells[y * m.w + x];
        if (c) { if (!c.door || c.portal) return false; if (c.locked && !(c.locked !== '__never' && c.locked !== 'pass' && G.flags[c.locked] === true)) return false; }
        return !(m.floorCells && m.floorCells[y * m.w + x] === 2);
      };
      const seen = new Uint8Array(m.w * m.h), q = [[sx, sy]]; if (!open(sx, sy)) return seen; seen[sy * m.w + sx] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!open(nx, ny) || seen[ny * m.w + nx]) continue;
          const ga = m.groundAt(x + 0.5, y + 0.5), gb = m.groundAt(nx + 0.5, ny + 0.5);
          if (Math.abs(ga - gb) > STEP_UP && !(m.smooth && m.smooth[ny * m.w + nx] && m.smooth[y * m.w + x])) continue;
          seen[ny * m.w + nx] = 1; q.push([nx, ny]);
        }
      }
      return seen;
    },
    at(seen, m, x, y) { return !!seen[(y | 0) * m.w + (x | 0)]; },
    // is a portal door's near side reachable?
    portalReach(seen, m, x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => T.at(seen, m, x + dx, y + dy)); },
    frameSum(x, y, w, h) { const d = Engine.ctx.getImageData(x, y, w, h).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] * 3 + d[i + 2] * 7; return s; },
    talkTo(id, mode) {
      const n = NPCS[id]; DLG.npc = n; DLG.ent = { id }; DLG.log = []; DLG.choices = null; DLG.tone = 'normal'; G.state = 'dialogue';
      renderDialogue(mode === undefined ? 'tell' : mode);
    },
    topics() { return Array.from(document.querySelectorAll('#d-topics [data-topic]')).map(b => b.getAttribute('data-topic')); },
    clickTopic(t) { const b = Array.from(document.querySelectorAll('#d-topics [data-topic]')).find(x => x.getAttribute('data-topic') === t); if (!b) return false; b.click(); return true; },
    lastReply() { const l = DLG.log[DLG.log.length - 1]; return l ? l.t : ''; },
    // the held sheet only enables its answers on the last page: page to the end, then press the answer
    async pickChoice(rx) {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      await wait(180);
      for (let i = 0; i < 40; i++) { const nx = document.querySelector('[data-act="next"]'); if (!nx || nx.disabled) break; nx.click(); await wait(30); }
      await wait(60);
      const b = Array.from(document.querySelectorAll('#event-panel button')).find(x => rx.test(x.textContent) && !x.disabled);
      if (!b) return false; b.click(); return true;
    },
    closeUi() { try { closeModal(); } catch (e) { /* none */ } const ev = document.getElementById('event'); if (ev) ev.classList.add('hidden'); G.state = 'play'; G.keys = {}; },
  };
};

(async () => {
  const browser = await chromium.launch();
  const lines = []; const log = s => { lines.push(s); console.log(s); };
  let n = 0; const ok = (c, msg) => { assert.ok(c, msg); n++; log('PASS ' + msg); };
  try {
    const { page, errors } = await boot(browser);
    await page.evaluate(HELPERS);
    const E = (fn, arg) => page.evaluate(fn, arg);
    await E(() => { T.reset(); });

    // ---------------------------------------------------------------- 1. the catalogue
    {
      const c = await E(() => {
        const o = {};
        o.maps = PARISH.MAPS.map(id => !!G.maps[id] && G.maps[id].baseCount === G.maps[id].entities.length);
        o.poses = {}; for (const s of ['miredrone', 'fretcrawler']) o.poses[s] = ['', '_w1', '_w2', '_a1', '_a2'].map(p => { const sp = Engine.sprites[s + p]; return !!(sp && sp.w > 8 && sp.data && sp.data.length === sp.w * sp.h); });
        o.defs = ['miredrone', 'fretcrawler'].map(t => !!(ENEMIES[t] && ENEMIES[t].sprite === t && ENEMIES[t].hp > 0 && ENEMIES[t].xp > 0 && LOOT[t]));
        o.voice = ['miredrone', 'fretcrawler'].map(t => !!VOICES.ENEMY_VOICES[t] && !!VOICES.resolveEnemy(t).authored);
        o.quad = ANIM.quadruped.has('miredrone') && ANIM.quadruped.has('fretcrawler');
        o.frames = ['miredrone', 'fretcrawler'].map(t => typeof animHasFrames === 'function' ? !!animHasFrames(ENEMIES[t].sprite) : true);
        o.items = ['p9_greenroot_register', 'p9_verrow_reedcase'].map(i => !!(ITEMS[i] && ITEMS[i].key && Engine.sprites[ITEMS[i].sprite]));
        o.topics = [PARISH.TOPIC_ROAD, PARISH.TOPIC_PARISH, PARISH.TOPIC_REG].map(t => !!TOPICS[t] && TOPICS[t].low.length > 40 && TOPICS[t].high.length > 40);
        o.tex = !!Engine.textures.p9p_reedstone && Engine.textures.p9p_reedstone.length === 4096;
        o.setting = UPG.p9Despair === true;
        o.dirs = ['miredrone', 'fretcrawler'].map(t => { try { const v = DIRECTIONS.view(ENEMIES[t].sprite, 'back', 0); return !!v; } catch (e) { return String(e); } });
        // every string in the module's text tables is markup-free (the register carries its own <p> tags)
        const bad = []; const walk = (v, k) => { if (typeof v === 'string') { if (k !== 'REGISTER_HTML' && /[<>&]/.test(v)) bad.push(k); } else if (v && typeof v === 'object') for (const kk in v) walk(v[kk], kk); };
        walk(PARISH.text, 'text'); walk(PARISH.REGISTER_PAGES, 'pages'); o.bad = bad;
        return o;
      });
      ok(c.maps.every(Boolean), 'the three maps are registered with baseCount set');
      ok(Object.values(c.poses).every(a => a.every(Boolean)), 'both foes have sprites in all five poses (base, _w1, _w2, _a1, _a2)');
      ok(c.defs.every(Boolean) && c.voice.every(Boolean) && c.quad && c.frames.every(Boolean), 'both foes are in ENEMIES, LOOT, VOICES.ENEMY_VOICES and the quadruped gait');
      ok(c.items.every(Boolean) && c.topics.every(Boolean) && c.tex && c.setting, 'items, topics, the sung-wall texture and the Options default exist');
      ok(c.dirs.every(v => v === true), 'directional views build for both foes: ' + JSON.stringify(c.dirs));
      ok(c.bad.length === 0, 'no markup characters in any text table: ' + c.bad.join(','));
    }

    // ---------------------------------------------------------------- 2. access: topics, the hedge door
    {
      const a = await E(() => {
        T.reset(); const o = {};
        o.roadClosed = (() => { const cl = G.maps.clearing, r = cl._p9pRoad, cell = cl.get(r.x, r.y); return { door: !!cell.door, locked: cell.locked, label: cell.label, portal: cell.portal && cell.portal.map }; })();
        G.state = 'play';
        T.talkTo('harrow'); o.harrow1 = T.topics();
        o.road = T.clickTopic(PARISH.TOPIC_ROAD); o.roadReply = T.lastReply(); o.knownAfter = G.flags.p9p_known === true;
        o.journal = G.journal.some(j => /Greenroot/.test(j.text));
        T.talkTo('harrow'); o.harrow2 = T.topics();
        T.clickTopic(PARISH.TOPIC_PARISH); o.parishReply = T.lastReply();
        T.talkTo('hetty'); o.hetty = T.topics();
        T.talkTo('ignatius'); o.ignatius = T.topics();
        T.talkTo('lyra'); o.lyra = T.topics();
        const j0 = G.journal.length; T.talkTo('harrow'); T.clickTopic(PARISH.TOPIC_ROAD); o.noDupJournal = G.journal.length === j0;
        // Tobin's page 10 alone opens the topic
        T.reset(); G.flags.p6t_page_10 = true; T.talkTo('harrow'); o.page10 = T.topics(); T.talkTo('ignatius'); o.page10i = T.topics();
        // the door follows
        T.reset(); G.flags.p9p_known = true;
        const cl = G.maps.clearing, r = cl._p9pRoad;
        T.go('clearing', r.x - 0.6, r.y + 0.5, 0); T.quiet(); Engine.render(G.ents, G.tod);
        const w = Engine.pickWall(2.0); o.pick = !!(w && w.cell && w.cell.portal);
        interact(); o.arrived = G.mapId;
        o.flagsAfter = { visited: G.flags.p9p_visited === true };
        T.closeUi();
        return o;
      });
      ok(a.roadClosed.door && a.roadClosed.locked === 'p9p_known' && a.roadClosed.portal === 'greenroot' && a.roadClosed.label === 'The east hedge', 'the clearing\'s east hedge has a shut door that does not name the road: ' + JSON.stringify(a.roadClosed));
      ok(a.harrow1.includes('The Greenroot road'), 'Harrow offers "The Greenroot road"');
      ok(!a.harrow1.includes('The third parish'), 'but not yet "The third parish"');
      ok(a.road && /Greenroot/.test(a.roadReply) && a.knownAfter && a.journal, 'asking about the road answers, sets p9p_known and writes the logbook');
      ok(a.harrow2.includes('The third parish') && /Greenroot/.test(a.parishReply), 'afterwards Harrow offers "The third parish" and answers');
      ok(!a.hetty.includes('The third parish') && !a.hetty.includes('The Greenroot road') && !a.lyra.includes('The third parish'), 'other townsfolk do not offer the topics');
      ok(a.ignatius.includes('The third parish'), 'Ignatius offers "The third parish" once the road is known');
      ok(a.noDupJournal, 'asking again does not repeat the logbook entry');
      ok(a.page10.includes('The third parish') && a.page10i.includes('The third parish'), 'Tobin\'s page 10 alone opens "The third parish" (Harrow and Ignatius)');
      ok(a.pick && a.arrived === 'greenroot' && a.flagsAfter.visited, 'with the road known the hedge door takes you to Greenroot');
    }

    // ---------------------------------------------------------------- 3. travel there and back
    {
      const t = await E(() => {
        T.reset(); const o = {};
        // before ever going: no waypoint
        G.flags.p9p_known = true; T.go('clearing', 20.5, 32.5, 0);
        o.before = travelDestinations('reach').some(d => d.map === 'greenroot');
        // walk there (the door), then travel away and back by the map
        const r = G.maps.clearing._p9pRoad; T.go('clearing', r.x - 0.6, r.y + 0.5, 0); T.adv(300); Engine.render(G.ents, G.tod); interact();
        o.walked = G.mapId; T.quiet(); T.closeUi(); T.adv(300);
        const open = () => { G.state = 'play'; travelOpen(); return TRAVEL.dests.slice(); };
        const east = open(); o.names = east.map(d => d.name);
        const home = east.find(d => d.map === 'clearing' && d.spawn);
        o.homeOk = !!home && home.state === 'ok';
        o.blocked = travelBlocked();
        T.go('greenroot', 3.5, 13.5, 0); T.quiet();
        o.blocked2 = travelBlocked();
        open(); travelGo(TRAVEL.dests.find(d => d.map === 'clearing' && d.spawn)); o.backAt = G.mapId; T.closeUi();
        const gr = open().find(d => d.map === 'greenroot' && d.spawn);
        o.grOk = !!gr && gr.state === 'ok';
        if (gr) { T.quiet(); travelGo(gr); o.thereAt = G.mapId; T.closeUi(); }
        o.foes = TRAVEL_FOES.greenroot;
        o.rect = TRAVEL_REGIONS.reach.maps.greenroot.rect;
        // back by foot through the west door
        T.go('greenroot', 1.2, 13.5, Math.PI); Engine.render(G.ents, G.tod); interact(); o.footAt = G.mapId; o.footX = Engine.cam.x;
        T.closeUi();
        return o;
      });
      ok(!t.before, 'no Greenroot waypoint before you have been');
      ok(t.walked === 'greenroot' && t.names.some(x => /Greenroot/.test(x)) && t.homeOk, 'after walking there, the world map lists Greenroot and the way home: ' + t.names.join(' | '));
      ok(t.backAt === 'clearing' && t.thereAt === 'greenroot' && t.grOk, 'travel there and back by the world map works');
      ok(t.footAt === 'clearing' && t.footX > 36, 'the west road door returns you to the clearing\'s east hedge');
      ok(t.rect[0] >= 0.72 && t.rect[2] <= 1 && t.rect[3] <= 0.5, 'the waypoint rectangle sits in the free east forest of the Reach painting');
    }

    // ---------------------------------------------------------------- 4. maps load, render, and are reachable stage by stage
    {
      const m = await E(() => {
        T.reset(); const o = { render: {} };
        for (const id of PARISH.MAPS) { const sp = G.maps[id].spawn; T.go(id, sp.x, sp.y, sp.dir); T.quiet(); Engine.render(G.ents, G.tod); o.render[id] = G.mapId === id && T.frameSum(0, 0, Engine.VW, Engine.VIEW_H) > 1000; }
        // Greenroot, no flags: every use, item and door is reachable from the road
        const gr = G.maps.greenroot, g = T.reach(gr, 1, 13);
        o.gr = { miss: gr.entities.filter(e => (e.kind === 'item' || (e.kind === 'deco' && e.use) || e.type === 'miredrone') && !T.at(g, gr, e.x, e.y)).map(e => e.item || e.use || e.type), doors: [] };
        for (let i = 0; i < gr.cells.length; i++) { const c = gr.cells[i]; if (c && c.portal) o.gr.doors.push([c.portal.map, T.portalReach(g, gr, i % gr.w, (i / gr.w) | 0)]); }
        // the Greenroot chapel door is shut from outside until the bar is lifted
        o.gr.chapelShut = gr.get(30, 8).locked === 'p9p_chapel';
        // crypt, stage by stage
        const cr = G.maps.greenroot_crypt, ent = (pred) => cr.entities.filter(pred);
        const st = {}; const stage = (name, flagsOn) => { for (const k of ['bells', 'drained', 'gate', 'wall']) delete G.flags['p9p_' + k]; for (const k of flagsOn) G.flags['p9p_' + k] = true; PARISH.applyMapState('greenroot_crypt'); const s = T.reach(cr, 2, 12); st[name] = s; return s; };
        const cell = (s, x, y) => T.at(s, cr, x, y);
        const byUse = (u) => ent(e => e.use === u)[0];
        const s0 = stage('s0', []);
        o.s0 = { hall: cell(s0, 17, 12), bells: ent(e => e.use === 'p9p_bell').every(e => T.at(s0, cr, e.x, e.y + 0.8)), below: cell(s0, 13, 20), east: cell(s0, 26, 22), fam: cell(s0, 27, 12), niche: cell(s0, 17, 4), out: T.portalReach(s0, cr, 0, 12), valve: cell(s0, 9, 22) };
        const s1 = stage('s1', ['bells']);
        o.s1 = { valve: T.at(s1, cr, byUse('p9p_sluice').x, byUse('p9p_sluice').y), westSh: cell(s1, 12, 23), eastSh: cell(s1, 22, 22), lever: T.at(s1, cr, byUse('p9p_lever').x, byUse('p9p_lever').y), fam: cell(s1, 27, 12) };
        const s2 = stage('s2', ['bells', 'drained']);
        o.s2 = { lever: T.at(s2, cr, byUse('p9p_lever').x, byUse('p9p_lever').y), channel: cell(s2, 17, 22), fam: cell(s2, 27, 12), back: cell(s2, 17, 12) };
        const s3 = stage('s3', ['bells', 'drained', 'gate']);
        o.s3 = { fam: cell(s3, 27, 12), stairUp: T.portalReach(s3, cr, 31, 12), chest: T.at(s3, cr, 29.2, 14.2), niche: cell(s3, 17, 4), exit: T.portalReach(s3, cr, 0, 12) };
        const s4 = stage('s4', ['bells', 'drained', 'gate', 'wall']);
        const rc = ent(e => e.item === 'p9_verrow_reedcase')[0], cache = ent(e => e.item === 'cache' && e.tier === 2)[0];
        o.s4 = { reed: T.at(s4, cr, rc.x, rc.y), cache: T.at(s4, cr, cache.x, cache.y), hallBack: cell(s4, 17, 8) };
        o.s0.reedHidden = !T.at(s0, cr, rc.x, rc.y);
        // items and every use are reachable by the stage that wants them
        o.itemsMiss = cr.entities.filter(e => (e.kind === 'item' || (e.kind === 'deco' && e.use)) && !T.at(s4, cr, e.x, e.y) && !(e.use === 'p9p_bell')).map(e => e.item || e.use);
        o.bellsMiss = cr.entities.filter(e => e.use === 'p9p_bell').filter(e => !T.at(s4, cr, e.x, e.y + 0.8)).length;
        // chapel
        const ch = G.maps.greenroot_chapel; delete G.flags.p9p_chapel; const c0 = T.reach(ch, 2, 2);
        o.ch = { lectern: T.at(c0, ch, 10.5, 3.2), kettle: T.at(c0, ch, 3.2, 2.2), bar: T.at(c0, ch, 8.5, 11.5), nave: T.at(c0, ch, 7, 9), frontShut: !T.portalReach(c0, ch, 7, 12) || ch.get(7, 12).locked === 'p9p_chapel', stair: T.portalReach(c0, ch, 2, 0) };
        o.ch.miss = ch.entities.filter(e => (e.kind === 'item' || (e.kind === 'deco' && e.use)) && !T.at(c0, ch, e.x, e.y)).map(e => e.use || e.item);
        // hints fit one line: every label and door label is short; long text is read from `look`
        o.long = []; o.looks = 0; o.badLook = [];
        for (const id of PARISH.MAPS) { const mm = G.maps[id]; for (const e of mm.entities) { if (typeof e.label === 'string' && e.label.length > 62) o.long.push(id + ':' + e.label.slice(0, 30)); if (typeof e.look === 'string') { o.looks++; if (!e.use || e.look.length < 20) o.badLook.push(e.sprite); } }
          for (const c of mm.cells) if (c && typeof c.label === 'string' && c.label.length > 62) o.long.push(id + ':cell:' + c.label.slice(0, 30)); }
        o.wallText = (() => { const c = G.maps.greenroot_crypt.get(16, 6); return wallLabel(c); })();
        // old-map ground: every spawn and every door arrival lands on free floor
        o.arrive = [];
        for (const id of PARISH.MAPS) { const mm = G.maps[id]; for (let i = 0; i < mm.cells.length; i++) { const c = mm.cells[i]; if (c && c.portal) { const t = G.maps[c.portal.map], px = c.portal.x, py = c.portal.y; o.arrive.push([id + '->' + c.portal.map, !!t && !t.isBlocked(px | 0, py | 0)]); } } }
        return o;
      });
      ok(Object.values(m.render).every(Boolean), 'each of the three maps loads and renders a frame');
      ok(m.gr.miss.length === 0 && m.gr.doors.length === 3 && m.gr.doors.every(d => d[1]), 'Greenroot: every use, item, drone and door is reachable from the road without any flag (' + m.gr.miss.join(',') + ')');
      ok(m.gr.chapelShut, 'the chapel door is barred from outside until the bar is lifted');
      ok(m.s0.hall && m.s0.bells && m.s0.out && !m.s0.below && !m.s0.east && !m.s0.fam && !m.s0.niche, 'crypt, no flags: landing, hall and bells reachable and the way out; the flooded crypt, family room and niche are not: ' + JSON.stringify(m.s0));
      ok(m.s1.valve && m.s1.westSh && !m.s1.eastSh && !m.s1.lever && !m.s1.fam, 'after the bells: the flooded crypt\'s west half and the valve are reachable, the east half is not: ' + JSON.stringify(m.s1));
      ok(m.s2.lever && m.s2.channel && m.s2.back && !m.s2.fam, 'after the sluice: the lever is reachable, the way back is open, the family room is still shut: ' + JSON.stringify(m.s2));
      ok(m.s3.fam && m.s3.stairUp && m.s3.chest && m.s3.exit && !m.s3.niche, 'after the lever: the family room, its chest and the stair up are reachable: ' + JSON.stringify(m.s3));
      ok(m.s4.reed && m.s4.cache && m.s4.hallBack && m.s0.reedHidden, 'the sung wall alone opens the niche, with the reed-case and the strongbox: ' + JSON.stringify(m.s4));
      ok(m.itemsMiss.length === 0 && m.bellsMiss === 0, 'with everything open every item and use in the crypt is reachable (' + m.itemsMiss.join(',') + ')');
      ok(m.ch.lectern && m.ch.kettle && m.ch.bar && m.ch.nave && m.ch.stair && m.ch.frontShut && m.ch.miss.length === 0, 'chapel: lectern, kettle, bar-lever and nave are reachable from the stair; the front door is the bar\'s: ' + JSON.stringify(m.ch));
      ok(m.long.length === 0 && m.looks > 20 && m.badLook.length === 0 && /Grooved reed-stone/.test(m.wallText), 'hints fit one line (labels under 63 characters); long text is read from each prop\'s look, and the sung wall speaks through wallLabel: ' + m.long.join(' | '));
      ok(m.arrive.every(a => a[1]), 'every door arrival lands on free floor: ' + m.arrive.filter(a => !a[1]).map(a => a[0]).join(','));
    }

    // ---------------------------------------------------------------- 5. the puzzles, through the game's own functions
    {
      const p = await E(() => {
        T.reset(); const o = {};
        // --- bells: wrong order resets, the right order opens the passing gate
        T.go('greenroot_crypt', 17.5, 9.5, -Math.PI / 2); T.quiet();
        const bells = G.ents.filter(e => e.use === 'p9p_bell').sort((a, b) => a.bellIdx - b.bellIdx);
        const byAge = (age) => bells.find(b => b.bellAge === age);
        const gate = G.map.doors[18 * G.map.w + 13];
        o.sixBells = bells.length;
        T.use(byAge(19)); o.wrongFlag = G.flags.p9p_bells; o.wrongState = PARISH.state().rung.length;
        T.use(byAge(81)); T.use(byAge(56)); T.use(byAge(34)); o.midFlag = G.flags.p9p_bells; o.midRung = PARISH.state().rung.length;
        T.use(byAge(81)); o.afterWrong = PARISH.state().rung.length;
        T.use(byAge(81)); T.use(byAge(56)); T.use(byAge(34)); T.use(byAge(19));
        o.bells = G.flags.p9p_bells === true; o.gateTarget = gate.target;
        // a locked gate refuses before the flag, opens after
        o.gateLockedTxt = G.map.get(13, 18).lockMsg;
        // --- sluice
        const before = G.map.floorCells[22 * G.map.w + 17];
        const valve = G.ents.find(e => e.use === 'p9p_sluice'); T.use(valve);
        o.sluice = { before, after: G.map.floorCells[22 * G.map.w + 17], flag: G.flags.p9p_drained === true, blocked: G.map.isBlocked(17, 22) };
        T.use(valve); o.sluiceTwice = G.map.floorCells[22 * G.map.w + 17];
        // --- lever -> reed gate
        const reedGate = G.map.doors[12 * G.map.w + 23]; o.gateBefore = reedGate.target;
        T.use(G.ents.find(e => e.use === 'p9p_lever')); o.lever = { flag: G.flags.p9p_gate === true, target: reedGate.target };
        // --- the sung wall: the root note, near the middle panel, with a voice to sing it with
        T.go('greenroot_crypt', 17.5, 8.4, -Math.PI / 2); T.quiet();
        G.player.voice = G.player.voiceMax; const v0 = G.player.voice;
        castSong('fifth'); o.fifthNoOpen = G.flags.p9p_wall === undefined;
        G.song.t = 0; G.attack.t = 0; G.player.voice = G.player.voiceMax;
        T.go('greenroot_crypt', 12.5, 15.5, 0); T.quiet(); castSong('root'); o.farNoOpen = G.flags.p9p_wall === undefined;
        G.song.t = 0; G.player.voice = G.player.voiceMax;
        T.go('greenroot_crypt', 17.5, 8.4, -Math.PI / 2); T.quiet();
        o.wallBefore = !!G.map.get(17, 6); castSong('root');
        o.wall = { flag: G.flags.p9p_wall === true, cell: G.map.get(17, 6), lvl: G.map.groundAt(17.5, 6.5), cost: v0 - G.player.voice };
        // the niche is now walkable: step in and the reed-case is in reach
        T.go('greenroot_crypt', 17.5, 5.6, -Math.PI / 2); o.nicheFree = !G.map.isBlocked(17, 5) && !G.map.isBlocked(17, 6);
        const rc = G.ents.find(e => e.item === 'p9_verrow_reedcase'); T.go('greenroot_crypt', rc.x, rc.y + 0.6, -Math.PI / 2); pickUp(rc);
        o.reed = G.has('p9_verrow_reedcase');
        // --- chapel: the bar lever, then the register
        T.go('greenroot_chapel', 8.5, 10.4, Math.PI / 2); T.quiet();
        const door = G.map.doors[12 * G.map.w + 7]; const outer = G.maps.greenroot.get(30, 8);
        o.barBefore = { chapelFlag: G.flags.p9p_chapel, locked: G.map.get(7, 12).locked };
        T.use(G.ents.find(e => e.use === 'p9p_chapel_bar')); o.bar = { flag: G.flags.p9p_chapel === true, target: door.target, outerTarget: G.maps.greenroot.doors[8 * 36 + 30].target };
        o.exit = (() => { T.go('greenroot_chapel', 7.5, 11.2, Math.PI / 2); Engine.render(G.ents, G.tod); interact(); return G.mapId; })();
        T.go('greenroot_chapel', 10.5, 3.4, -Math.PI / 2);
        const lec = G.ents.find(e => e.use === 'p9p_register');
        T.use(lec); o.event = G.state; o.eventTitle = document.querySelector('#event-panel h2') ? document.querySelector('#event-panel h2').textContent : '';
        o.sheet = !!document.querySelector('.hd-sheet');
        const html = document.querySelector('#event-panel').textContent; o.stops = /about to\s*$/.test(html.replace(/The next line is ruled, and empty\.?\s*/, '').replace(/\s+Take the register\..*$/, '').trim()) || /about to/.test(html);
        o.emptyLine = /ruled, and empty/.test(html);
        return o;
      });
      ok(p.sixBells === 4 && !p.wrongFlag && p.wrongState === 0 && p.afterWrong === 0, 'bells: ringing out of turn resets the rail');
      ok(!p.midFlag && p.midRung === 3, 'bells: three right in a row hold, the fourth is still to come');
      ok(p.bells && p.gateTarget === 1, 'bells: the house rung eldest to youngest sets p9p_bells and raises the passing gate');
      ok(p.sluice.before === 2 && p.sluice.after === 1 && p.sluice.flag && !p.sluice.blocked && p.sluiceTwice === 1, 'the sluice valve turns the deep channel into a wade, once');
      ok(p.gateBefore === 0 && p.lever.flag && p.lever.target === 1, 'the bronze lever raises the reed gate');
      ok(p.fifthNoOpen && p.farNoOpen && !p.wallBefore === false && p.wall.flag && p.wall.cell === null && p.wall.cost === 10, 'the sung wall answers the root note only close to it, and not the fifth: ' + JSON.stringify({ f: p.fifthNoOpen, far: p.farNoOpen, w: p.wall }));
      ok(p.nicheFree && p.reed, 'the niche is open and the tuning-reed case can be taken');
      ok(p.barBefore.locked === 'p9p_chapel' && !p.barBefore.chapelFlag && p.bar.flag && p.bar.target === 1 && p.bar.outerTarget === 1, 'the chapel\'s bar-lever frees both sides of the front door');
      ok(p.exit === 'greenroot', 'the barred door now leads out to the churchyard');
      ok(p.event === 'event' && p.eventTitle === 'The Greenroot Register' && p.sheet && p.emptyLine, 'the lectern opens the register as a held document, ending on an empty ruled line');
    }

    // ---------------------------------------------------------------- 6. the register and the ending
    {
      const r = await E(async () => {
        T.reset(); const o = {};
        T.go('greenroot_chapel', 10.5, 3.4, -Math.PI / 2); T.quiet();
        const lec = G.ents.find(e => e.use === 'p9p_register');
        T.use(lec);
        const btns = Array.from(document.querySelectorAll('#event-panel button')).map(b => b.textContent).filter(t => !/^A[-+]$|Back|Next/.test(t));
        o.choices = btns;
        // leave it: nothing taken
        o.leaveOk = await T.pickChoice(/Leave/);
        o.left = { has: G.has('p9_greenroot_register'), read: G.flags.p9p_read === true, state: G.state };
        T.use(lec);
        o.takeOk = await T.pickChoice(/Take/);
        o.took = { has: G.has('p9_greenroot_register'), reg: G.flags.p9p_reg === true, journal: G.journal.some(j => /Greenroot register/.test(j.text)), label: lec.look, count: G.player.inv.filter(s => s.id === 'p9_greenroot_register').length };
        T.use(lec); o.second = { msg: G.state, count: G.player.inv.filter(s => s.id === 'p9_greenroot_register').length };
        // read it again from the pack
        const slot = G.player.inv.find(s => s.id === 'p9_greenroot_register'); useItem(slot); o.reread = { state: G.state, title: document.querySelector('#event-panel h2') && document.querySelector('#event-panel h2').textContent };
        o.closeOk = await T.pickChoice(/Close/); o.closed = G.state;
        // --- Ignatius files it
        const g0 = G.player.gold, x0 = G.player.xp + G.player.level * 1000, syn0 = G.player.factions.synod;
        T.talkTo('ignatius'); o.igTopics = T.topics();
        T.clickTopic(PARISH.TOPIC_REG); o.offerMode = DLG.choices && DLG.choices.length; o.offerBtns = document.querySelectorAll('[data-choice]').length;
        document.querySelector('[data-choice="1"]').click(); o.hold = { has: G.has('p9_greenroot_register'), filed: G.flags.p9p_filed };
        T.talkTo('ignatius'); T.clickTopic(PARISH.TOPIC_REG); document.querySelector('[data-choice="0"]').click();
        o.filed = { flag: G.flags.p9p_filed === true, has: G.has('p9_greenroot_register'), gold: G.player.gold - g0, xp: G.player.xp + G.player.level * 1000 - x0 > 0, rep: G.player.factions.synod - syn0, journal: G.journal.some(j => /Ignatius Crane/.test(j.text) && /filed/.test(j.text)), kept: G.flags.p9p_kept };
        T.talkTo('ignatius'); o.igAfter = T.topics(); T.clickTopic(PARISH.TOPIC_PARISH); o.igReply = T.lastReply();
        // consequence lines: a rumour and a Gazette item
        const ctx = STORYRUM.context(); const rums = STORYRUM.eligible(ctx, 'patron').map(x => x.id); o.rumourFiled = rums.includes('d_p9p_filed') && !rums.includes('d_p9p_kept');
        const gz = STORYRUM.ISSUES.map(i => STORYRUM.issueHtml ? STORYRUM.issueHtml(i, ctx) : ''); o.gazette = gz.filter(h => /consolidated/.test(h)).length;
        T.closeUi();
        // --- Lyra keeps it
        T.reset(); G.player.inv.push({ id: 'p9_greenroot_register', n: 1 }); G.flags.p9p_reg = true;
        const g1 = G.player.gold; const tonic0 = G.count('tonic');
        T.talkTo('lyra'); o.lyTopics = T.topics(); T.clickTopic(PARISH.TOPIC_REG); document.querySelector('[data-choice="0"]').click();
        o.kept = { flag: G.flags.p9p_kept === true, has: G.has('p9_greenroot_register'), gold: G.player.gold - g1, tonics: G.count('tonic') - tonic0, filed: G.flags.p9p_filed, journal: G.journal.some(j => /gave the Greenroot register to Lyra/.test(j.text)) };
        const ctx2 = STORYRUM.context(); const hetty = STORYRUM.eligible(ctx2, 'hetty').map(x => x.id), pat = STORYRUM.eligible(ctx2, 'patron').map(x => x.id);
        o.rumourKept = hetty.includes('d_p9p_kept_h') && pat.includes('d_p9p_kept') && !pat.includes('d_p9p_filed');
        o.gazette2 = STORYRUM.ISSUES.map(i => STORYRUM.issueHtml ? STORYRUM.issueHtml(i, ctx2) : '').filter(h => /read aloud/.test(h)).length;
        T.talkTo('lyra'); o.lyAfter = T.topics();
        // neither: with no register the topic is never offered
        T.reset(); T.talkTo('ignatius'); o.noReg = !T.topics().includes(PARISH.TOPIC_REG);
        T.closeUi();
        return o;
      });
      ok(r.leaveOk && r.takeOk && r.closeOk && r.choices.length === 2 && r.left.has === false && r.left.read && r.left.state === 'play', 'the register can be left where it lies');
      ok(r.took.has && r.took.reg && r.took.journal && r.took.count === 1 && /pale oblong/.test(r.took.label), 'taking it gives the key item once, writes the logbook and empties the lectern');
      ok(r.second.count === 1 && r.reread.state === 'event' && r.reread.title === 'The Greenroot Register' && r.closed === 'play', 'it can be re-read from the pack, and never taken twice');
      ok(r.igTopics.includes('The Greenroot register') && r.offerMode === 2 && r.offerBtns === 2, 'with the register in your pack Ignatius offers it, with two answers');
      ok(r.hold.has && !r.hold.filed, '"Not yet" keeps it');
      ok(r.filed.flag && !r.filed.has && r.filed.gold === 45 && r.filed.xp && r.filed.rep === 3 && r.filed.journal && !r.filed.kept, 'giving it to Ignatius files it: the flag, 45 sovereigns, xp, Synod standing and a logbook line');
      ok(!r.igAfter.includes('The Greenroot register') && /Filed/.test(r.igReply), 'afterwards the topic is gone and Ignatius answers "The third parish" differently');
      ok(r.rumourFiled && r.gazette >= 1, 'consequence lines: a patron rumour and a Gazette item (Church spin) for the filed ending');
      ok(r.lyTopics.includes('The Greenroot register') && r.kept.flag && !r.kept.has && r.kept.tonics === 2 && r.kept.gold === 0 && !r.kept.filed && r.kept.journal, 'giving it to Lyra keeps it: the flag, two tonics, a logbook line');
      ok(r.rumourKept && r.gazette2 >= 1 && !r.lyAfter.includes('The Greenroot register') && r.lyAfter.includes('The third parish'), 'consequence lines for the kept ending (Hetty, a patron, the Gazette) and Lyra\'s own answer');
      ok(r.noReg, 'with no register in the pack the topic is never offered');
    }

    // ---------------------------------------------------------------- 7. the Mire-drone
    {
      const d = await E(() => {
        T.reset(); const o = {};
        T.go('greenroot', 7.5, 21.0, Math.PI / 2);
        const drone = G.ents.find(e => e.type === 'miredrone'), p = G.player;
        // put the traveller at (px, py) with only this drone alive, lying at (7.5, 23.6)
        const place = (px, py) => {
          T.go('greenroot', px, py, Math.PI / 2);
          for (const e of G.ents) if (e.kind === 'enemy' && e !== drone) { e.hidden = true; e.dead = true; }
          drone.hidden = false; drone.dead = false; drone.hp = 30; drone.x = 7.5; drone.y = 23.6; drone.state = 'passive'; p.fat = p.fatMax; p.hunger = 100;
        };
        place(7.5, 21.0);
        o.passive = drone.state; o.def = { name: drone.def.name, hp: drone.hp };
        // non-aggressive: it never closes on you, even close and noisy
        G.noise = 9; const hp0 = p.hp;
        for (let i = 0; i < 120; i++) enemyUpdate(drone, 0.05);
        o.stayed = Math.hypot(drone.x - 7.5, drone.y - 23.6) < 0.01 && p.hp === hp0 && drone.state === 'passive';
        // despair builds near it (the Journey's needs on), drains fatigue and hunger
        p.needs = true; place(7.5, 21.0);
        const f0 = p.fat, h0 = p.hunger; T.adv(4000);
        o.near = { despair: PARISH.state().despair, fat: f0 - p.fat, hunger: h0 - p.hunger, visual: PARISH.state().visual };
        // the same minutes far away: nothing
        PARISH.T.despair = 0; place(20.5, 6.5); const h1 = p.hunger; T.adv(4000); o.far = { despair: PARISH.state().despair, fatLoss: p.fatMax - p.fat, hunger: h1 - p.hunger };
        // setting off: no despair, no drain, no hum
        UPG.p9Despair = false; PARISH.T.despair = 0; place(7.5, 21.0); T.adv(3000); o.off = { despair: PARISH.state().despair, fat: p.fatMax - p.fat, hum: PARISH.droneMix() };
        UPG.p9Despair = true;
        // reduce motion / no flashes: the heaviness is real, the blur is not drawn
        GFX.reduceMotion = true; PARISH.T.despair = 0; place(7.5, 21.0); T.adv(3500);
        o.rm = { despair: PARISH.state().despair, visual: PARISH.state().visual, fat: p.fatMax - p.fat };
        GFX.reduceMotion = false; GFX.noFlash = true; T.adv(500); o.nf = { despair: PARISH.state().despair, visual: PARISH.state().visual };
        GFX.noFlash = false; T.adv(500); o.vis = PARISH.state().visual;
        // the vignette is really drawn: the view's rim is darker with despair than without
        PARISH.T.despair = 0.9; Engine.render(G.ents, G.tod); drawHUD(); const rimOn = T.frameSum(0, 0, 40, Engine.VIEW_H);
        PARISH.T.despair = 0; Engine.render(G.ents, G.tod); drawHUD(); const rimOff = T.frameSum(0, 0, 40, Engine.VIEW_H);
        o.rim = { on: rimOn, off: rimOff };
        // a hush-lamp lifts it
        const lamp = G.ents.filter(e => e.sprite === 'lamp').sort((a, b) => Math.hypot(a.x - 7.5, a.y - 23.6) - Math.hypot(b.x - 7.5, b.y - 23.6))[0];
        place(lamp.x + 0.9, lamp.y); drone.x = lamp.x + 0.9 + Math.cos(0.4) * 3; drone.y = lamp.y + 3; PARISH.T.despair = 0; T.adv(3000); const withLamp = PARISH.state().despair;
        o.lamp = withLamp;
        // it can be avoided (walk off) and killed
        place(7.5, 21.0); T.adv(3000); const high = PARISH.state().despair; place(20.5, 6.5); T.adv(6000); o.recover = { high, low: PARISH.state().despair };
        place(7.5, 22.6); drone.x = 7.5; drone.y = 23.6; Math.random = () => 0.01; G.attack.t = 0;
        attack('slash'); o.woke = drone.state === 'chase' || drone.dead; o.hpAfterHit = drone.hp;
        drone.hp = 1; G.attack.t = 0; attack('slash');
        o.dead = drone.dead === true && drone.hidden === true;
        T.adv(4000); o.deadDespair = PARISH.state().despair;
        return o;
      });
      ok(d.passive === 'passive' && d.stayed, 'the Mire-drone is not aggressive: it lies where it is, however close and loud you are');
      ok(d.near.despair > 0.4 && d.near.fat > 1 && d.near.hunger > 0.01 && d.near.visual > 0.3, 'near it, despair builds, drains fatigue and (with needs on) hunger, and blurs the view: ' + JSON.stringify(d.near));
      ok(d.far.despair === 0 && d.far.hunger < 0.2, 'far from it there is no despair');
      ok(d.off.despair === 0 && d.off.fat < 1 && d.off.hum === null, 'with the Options setting off there is no despair, no drain and no hum');
      ok(d.rm.despair > 0.3 && d.rm.visual === 0 && d.rm.fat > 1 && d.nf.visual === 0 && d.nf.despair > 0.3 && d.vis > 0.3, 'reduce motion and no flashes draw no blur (the weight stays); both restore the blur when off: ' + JSON.stringify({ rm: d.rm, nf: d.nf, vis: d.vis }));
      ok(d.rim.on < d.rim.off, 'the view edge is darker while despair is on: ' + JSON.stringify(d.rim));
      ok(d.lamp < 0.35, 'beside a hush-lamp the weight lifts: ' + d.lamp);
      ok(d.recover.high > 0.4 && d.recover.low < 0.05, 'walking away lifts it: ' + JSON.stringify(d.recover));
      ok(d.woke && d.dead && d.deadDespair === 0, 'it can be woken, killed, and its despair dies with it');
    }

    // ---------------------------------------------------------------- 8. the drone's sound is positional and polite
    {
      const s = await E(() => {
        T.reset(); const o = {};
        T.go('greenroot', 10.5, 23.0, 0);
        const drone = G.ents.find(e => e.type === 'miredrone'); for (const e of G.ents) if (e.kind === 'enemy' && e !== drone) { e.hidden = true; e.dead = true; }
        drone.x = 10.5 + Math.cos(-Math.PI / 2) * 0; drone.y = 23.0;
        // listener faces east (dir 0): a source to the south is on the right (positive y is the right-hand side)
        const place = (dx, dy) => { drone.x = 10.5 + dx; drone.y = 23.0 + dy; return PARISH.droneMix(); };
        const south = place(0, 4), north = place(0, -4);
        o.pan = { south: south && south.pan, north: north && north.pan };
        const near = place(2, 0), far = place(9, 0), gone = place(20, 0);
        o.gain = { near: near && near.gain, far: far && far.gain, gone };
        const wall = place(0, 3); o.walls = wall && wall.walls;
        o.hasCtx = !!Audio_.ctx; PARISH.T.lastDrone = 'unset'; PARISH.tick(0.016); o.noCtx = o.hasCtx ? 'n/a' : PARISH.T.lastDrone;
        return o;
      });
      ok(s.pan.south > 0.1 && s.pan.north < -0.1, 'the drone is panned to where it is: ' + JSON.stringify(s.pan));
      ok(s.gain.near > s.gain.far && s.gain.far > 0 && s.gain.gone === null, 'it is louder close, quieter far, and silent beyond hearing');
      ok(s.noCtx === 'n/a' || s.noCtx === null, 'with no AudioContext the module does nothing (no second context is made)');
      // with the real context: a hum on the shared bus, silent when muted
      const a = await E(() => {
        const o = { ctxBefore: !!Audio_.ctx };
        if (!Audio_.ctx) { try { Audio_.init(); } catch (e) { o.initErr = String(e); } }
        o.ctx = !!Audio_.ctx;
        if (!Audio_.ctx) return o;
        const real = Audio_.ctx; T.reset(); T.go('greenroot', 10.5, 23.0, 0);
        const drone = G.ents.find(e => e.type === 'miredrone'); for (const e of G.ents) if (e.kind === 'enemy' && e !== drone) { e.hidden = true; e.dead = true; }
        drone.x = 12.5; drone.y = 23.0; drone.hidden = false; drone.dead = false;
        PARISH.tick(0.016); o.live = PARISH.T.lastDrone && PARISH.T.lastDrone.gain > 0;
        if (!Audio_.muted) Audio_.toggleMute(); PARISH.tick(0.016); o.muted = PARISH.T.lastDrone && PARISH.T.lastDrone.gain === 0;
        Audio_.toggleMute(); o.same = Audio_.ctx === real;
        return o;
      });
      if (a.ctx) ok(a.live && a.muted && a.same, 'with the one shared AudioContext the drone hums on the sfx bus, goes silent when muted, and makes no second context');
      else log('INFO no AudioContext in this browser; hum graph not exercised');
    }

    // ---------------------------------------------------------------- 9. the Fret-crawler and the reed-case
    {
      const f = await E(() => {
        T.reset(); const o = {};
        T.go('greenroot_crypt', 12.6, 12.5, 0);
        const cr = G.ents.find(e => e.type === 'fretcrawler');
        for (const e of G.ents) if (e.kind === 'enemy' && e !== cr) { e.hidden = true; e.dead = true; }
        cr.x = 14.5; cr.y = 12.5; cr.state = 'idle';
        // invisible on stone until it moves
        const still = []; for (let i = 0; i < 80; i++) { animCreature(cr, 0.02, i * 0.02); still.push(cr.animAlpha); }
        o.stillAlpha = Math.max(...still.slice(40));
        const mov = []; for (let i = 0; i < 40; i++) { cr.x += 0.03; animCreature(cr, 0.02, i * 0.02); mov.push(cr.animAlpha); }
        o.movingAlpha = mov[mov.length - 1];
        const fade = []; for (let i = 0; i < 120; i++) { animCreature(cr, 0.02, i * 0.02); fade.push(cr.animAlpha); }
        o.fadeAlpha = fade[fade.length - 1];
        GFX.reduceMotion = true; const rm = (animCreature(cr, 0.02, 0), cr.animAlpha); GFX.reduceMotion = false; o.rmAlpha = rm;
        // AI: the guard stays still until you come within four paces and are seen, then comes
        cr.x = 14.5; cr.y = 12.5; cr.homeX = 14.5; cr.homeY = 12.5; cr.state = 'idle'; cr.guard = true;
        T.go('greenroot_crypt', 21.5, 12.5, 0); for (const e of G.ents) if (e.kind === 'enemy' && e !== cr) { e.hidden = true; e.dead = true; }
        for (let i = 0; i < 40; i++) enemyUpdate(cr, 0.05); o.farState = cr.state;
        T.go('greenroot_crypt', 17.8, 12.5, Math.PI); for (const e of G.ents) if (e.kind === 'enemy' && e !== cr) { e.hidden = true; e.dead = true; }
        cr.x = 14.5; cr.y = 12.5; for (let i = 0; i < 6; i++) enemyUpdate(cr, 0.05); o.nearState = cr.state;
        // damage and the sever
        const p = G.player; p.hp = p.hpMax = 500; const hp0 = p.hp;
        Math.random = () => 0.999; cr.state = 'chase'; cr.cool = 0; cr.x = Engine.cam.x - 0.7; cr.y = Engine.cam.y;
        enemyUpdate(cr, 0.05); o.hit = { dmg: hp0 - p.hp, sever: PARISH.state().sever, flagless: Object.keys(G.flags).filter(k => k.startsWith('p9p_')).length };
        // songs are cut; the HUD says so (the biter has gone, so the clock can run down)
        cr.dead = true; cr.hidden = true;
        const v0 = p.voice; G.song.t = 0; castSong('tending'); o.blocked = { voice: p.voice === v0, hp: p.hp };
        castSong('murmur'); o.murmur = G.murmurT > 0;
        Engine.render(G.ents, G.tod); drawHUD(); const sevHud = T.frameSum(157, Engine.VIEW_H + 36, 62, 9);
        T.adv(10000); o.mid = PARISH.state().sever;
        G.song.t = 0; castSong('tending'); o.midBlocked = p.voice === v0;
        T.go('greenroot_crypt', 17.8, 12.5, Math.PI); T.quiet(); G.state = 'play';
        T.adv(11000); o.end = PARISH.state().sever;
        Engine.render(G.ents, G.tod); drawHUD(); const clearHud = T.frameSum(157, Engine.VIEW_H + 36, 62, 9);
        o.hud = { sev: sevHud, clear: clearHud, differs: sevHud !== clearHud };
        G.song.t = 0; G.attack.t = 0; p.hp = 100; castSong('tending'); o.after = { spent: v0 - p.voice, healed: p.hp > 100 };
        // the reed-case refund: about a quarter less
        p.voice = p.voiceMax; G.song.t = 0; const a0 = p.voice; castSong('tending'); const plain = a0 - p.voice;
        p.inv.push({ id: 'p9_verrow_reedcase', n: 1 }); p.voice = p.voiceMax; G.song.t = 0; const b0 = p.voice; castSong('tending'); const cased = b0 - p.voice;
        o.case = { plain, cased };
        return o;
      });
      ok(f.stillAlpha <= 0.1 && f.movingAlpha > 0.95 && f.fadeAlpha <= 0.1 && f.rmAlpha <= 0.1, 'the crawler is all but invisible on stone until it moves, then plain, then gone again: ' + JSON.stringify({ s: f.stillAlpha, m: f.movingAlpha, f: f.fadeAlpha }));
      ok(f.farState === 'idle' && f.nearState === 'chase', 'AI: a guard lies still at range and comes when you are within four paces');
      ok(f.hit.dmg >= 3 && f.hit.dmg <= 6 && f.hit.sever === 20, 'its bite does 3-6 and severs your intervals for 20 s: ' + JSON.stringify(f.hit));
      ok(f.blocked.voice && f.murmur, 'while severed no Song is cast (voice untouched), but the murmur still keeps the stillness off');
      ok(f.mid > 8 && f.mid <= 10.1 && f.midBlocked && f.end === 0, 'the cut lasts about twenty seconds, counting only play time: ' + JSON.stringify({ mid: f.mid, end: f.end }));
      ok(f.hud.differs, 'the HUD shows SEVERED while it lasts');
      ok(f.after.spent === 8 && f.after.healed, 'afterwards the Songs come back');
      ok(f.case.plain === 8 && f.case.cased === 6, 'Verrow\'s tuning-reed case makes Songs cost about a quarter less: ' + JSON.stringify(f.case));
    }

    // ---------------------------------------------------------------- 10. death pictures fall back
    {
      const x = await E(() => {
        T.reset(); const o = {};
        for (const src of ['Fret-crawler', 'Mire-drone']) {
          G.dead = false; die(src);
          const el = document.getElementById('death');
          o[src] = { shown: !el.classList.contains('hidden'), art: el.classList.contains('scr-art'), kind: el.dataset.scrDeath, text: document.getElementById('death-text').textContent, bg: el.style.backgroundImage.slice(0, 20), kindFn: SCREENS.deathKind(src).kind || SCREENS.deathKind(src).key };
          el.classList.add('hidden'); G.dead = false; G.state = 'play'; G.player.hp = 999;
        }
        return o;
      });
      for (const k of ['Fret-crawler', 'Mire-drone']) ok(x[k].shown && x[k].art && x[k].kind === 'found' && /has you/.test(x[k].text) && (x[k].bg.startsWith('linear-gradient') || x[k].bg.startsWith('url')), 'dying to the ' + k + ' falls back to the "found" picture (' + x[k].kind + ')');
    }

    // ---------------------------------------------------------------- 11. saves: in the dungeon, old, hostile
    {
      const s = await E(() => {
        T.reset(); const o = {};
        Object.assign(G.flags, { p9p_known: true, p9p_bells: true, p9p_drained: true, p9p_gate: true, p9p_wall: true, p9p_visited: true });
        PARISH.applyMapState('greenroot_crypt');
        T.go('greenroot_crypt', 26.5, 12.5, Math.PI);
        const cr0 = G.ents.filter(e => e.type === 'fretcrawler'); cr0[2].dead = true; cr0[2].hidden = true; cr0[2].hp = 0;
        const rc = G.ents.find(e => e.item === 'p9_verrow_reedcase'); rc.dead = true; rc.hidden = true; G.give('p9_verrow_reedcase');
        G.map.doors[12 * G.map.w + 23].open = 1; G.map.doors[12 * G.map.w + 23].target = 1;
        const snap = JSON.parse(JSON.stringify(snapshotGame()));
        o.snapMap = snap.mapId;
        // scribble over the live state, then restore
        for (const k of Object.keys(G.flags)) delete G.flags[k]; G.maps.greenroot_crypt = buildAllMaps().greenroot_crypt; T.go('oakhaven', 20, 20, 0);
        restoreGame(snap); G.state = 'play';
        const m = G.maps.greenroot_crypt;
        o.back = { map: G.mapId, flags: ['known', 'bells', 'drained', 'gate', 'wall'].every(k => G.flags['p9p_' + k] === true), channel: m.floorCells[22 * m.w + 17], wall: m.get(17, 6) === null, gate: m.doors[12 * m.w + 23].target, crawlerDead: m.entities.filter(e => e.type === 'fretcrawler')[2].dead === true, reedGone: m.entities.find(e => e.item === 'p9_verrow_reedcase').dead === true, hasCase: G.has('p9_verrow_reedcase'), x: Engine.cam.x };
        o.walkable = !m.isBlocked(17, 22) && !m.isBlocked(17, 6);
        Engine.render(G.ents, G.tod);
        // an old save: no parish maps, no parish flags
        const old = JSON.parse(JSON.stringify(snap)); for (const id of PARISH.MAPS) delete old.maps[id]; for (const k of Object.keys(old.flags)) if (k.startsWith('p9p_')) delete old.flags[k];
        old.mapId = 'oakhaven'; old.cam = { x: 23.5, y: 5.5, dir: 0 };
        restoreGame(old); G.state = 'play'; o.old = { map: G.mapId, maps: PARISH.MAPS.every(id => !!G.maps[id] && G.maps[id].entities.length === G.maps[id].baseCount), road: G.maps.clearing.get(39, 33) && G.maps.clearing.get(39, 33).door === true, flags: Object.keys(G.flags).filter(k => k.startsWith('p9p_')) };
        // also an old save from inside the clearing next to the hedge
        const old2 = JSON.parse(JSON.stringify(old)); old2.mapId = 'clearing'; old2.cam = { x: 38.4, y: 33.5, dir: 0 }; restoreGame(old2); G.state = 'play'; o.old2 = G.mapId;
        // hostile: junk in every parish flag, the camera in a wall, markup everywhere
        const evil = '<img src=x onerror=window.__pwn=1>'; const bad = JSON.parse(JSON.stringify(snap));
        for (const k of ['known', 'visited', 'crypt', 'chapel', 'bells', 'gate', 'drained', 'wall', 'read', 'reg', 'filed', 'kept']) bad.flags['p9p_' + k] = k.length % 2 ? evil : { a: 1 };
        bad.flags.p9p_unknown = evil; bad.flags['p9p_' + evil] = evil; bad.mapId = 'greenroot_crypt'; bad.cam = { x: 0.5, y: 0.5, dir: 0 };
        restoreGame(bad); G.state = 'play';
        o.evil = { map: G.mapId, free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0), gateShut: !G.flags.p9p_gate, bellsShut: !G.flags.p9p_bells, channel: G.maps.greenroot_crypt.floorCells[22 * 34 + 17], pwn: window.__pwn, html: /onerror/.test(document.body.innerHTML), listed: PARISH.availableTopics('harrow') };
        Engine.render(G.ents, G.tod); drawHUD();
        // hostile + the Greening: the dungeon is gone, you wake in the clearing
        const gl = JSON.parse(JSON.stringify(snap)); gl.flags.greening = true; gl.mapId = 'greenroot_crypt'; gl.cam = { x: 5.5, y: 12.5, dir: 0 };
        restoreGame(gl); G.state = 'play'; o.greened = { map: G.mapId, x: Engine.cam.x, free: !G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0) };
        delete G.flags.greening;
        return o;
      });
      ok(s.snapMap === 'greenroot_crypt' && s.back.map === 'greenroot_crypt' && s.back.flags && s.back.channel === 1 && s.back.wall && s.back.gate === 1, 'a save made in the dungeon loads back in the dungeon with every flag and every changed cell: ' + JSON.stringify(s.back));
      ok(s.back.crawlerDead && s.back.reedGone && s.back.hasCase && s.walkable, 'a slain crawler stays slain, a taken reed-case stays taken, and the drained channel and opened wall are walkable');
      ok(s.old.map === 'oakhaven' && s.old.maps && s.old.road && s.old.flags.length === 0 && s.old2 === 'clearing', 'an old save with no parish maps or flags loads, and the parish maps are rebuilt untouched: ' + JSON.stringify(s.old));
      ok(s.evil.map === 'greenroot_crypt' && s.evil.free && s.evil.gateShut && s.evil.bellsShut && s.evil.channel === 2 && !s.evil.pwn && !s.evil.html, 'a hostile save (junk flags, markup, the camera in a wall) loads safely: junk flags are dropped and the traveller is placed on free floor: ' + JSON.stringify(s.evil));
      ok(s.greened.map === 'clearing' && s.greened.free, 'a stale save from inside the parish with the Greening set wakes in the clearing');
    }

    // ---------------------------------------------------------------- 12. the Greening closes the road
    {
      const g = await E(() => {
        T.reset(); const o = {};
        G.flags.p9p_known = true; G.flags.p6t_page_10 = true;
        const cl = G.maps.clearing, r = cl._p9pRoad;
        T.go('clearing', r.x - 0.6, r.y + 0.5, 0); T.quiet(); Engine.render(G.ents, G.tod);
        PARISH.tick(1.5); G.time += 5; PARISH.tick(1.5);
        const cell = cl.get(r.x, r.y); o.open = { locked: cell.locked };
        G.flags.greening = true; G.time += 5; PARISH.tick(0.5);
        o.cell = { locked: cell.locked, msg: cell.lockMsg, label: cell.label };
        document.getElementById('msgs').innerHTML = ''; Engine.render(G.ents, G.tod); interact();
        o.stay = G.mapId; o.said = document.getElementById('msgs').textContent;
        T.talkTo('harrow'); o.topics = T.topics(); T.clickTopic(PARISH.TOPIC_ROAD); o.roadReply = T.lastReply(); T.talkTo('harrow'); T.clickTopic(PARISH.TOPIC_PARISH); o.parishReply = T.lastReply();
        T.closeUi();
        T.go('oakhaven', 20.5, 6.5, 0);
        o.travel = travelDestinations('reach').some(d => d.map === 'greenroot' || d.door === 'greenroot');
        o.redirect = (() => { loadMap('greenroot', { x: 3, y: 13, dir: 0 }); return G.mapId; })();
        const t = PARISH.text; o.oneLine = [t.CLOSED_LINE, t.ROAD_CLOSED].every(s => s.length > 40 && s.length < 260);
        delete G.flags.greening; PARISH.tick(1); G.time += 5; PARISH.tick(1);
        return o;
      });
      ok(g.open.locked === 'p9p_known' && g.cell.locked === '__never' && /grown across/.test(g.cell.msg), 'after the Greening the hedge door is shut for good with one line: ' + g.cell.msg);
      ok(g.stay === 'clearing' && /grown across/.test(g.said), 'pushing at it says so and goes nowhere');
      ok(g.roadReply === g.parishReply && /Greening/.test(g.roadReply) && g.topics.length >= 1, 'Harrow answers either topic with the same single closing line');
      ok(!g.travel && g.redirect === 'clearing', 'the world map no longer lists Greenroot, and loading it lands you in the clearing');
    }

    // ---------------------------------------------------------------- 13. the Options row and 640x400
    {
      const o = await E(() => {
        T.reset(); G.state = 'panel'; renderAccessibilityMenu();
        const cap = document.getElementById('ac-cap'), rp = document.getElementById('rp-toggle'), lab = document.getElementById('p9-despair-label'), b = document.getElementById('p9-despair');
        const r = { has: !!b && !!lab, after: !!rp && !!lab && !!(rp.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING) && lab.nextElementSibling === b };   // other Phase 9 rows may sit between
        renderAccessibilityMenu(); r.dup = document.querySelectorAll('#p9-despair').length;
        const btn = document.getElementById('p9-despair'); const was = UPG.p9Despair;
        btn.click(); r.off = UPG.p9Despair; r.stored = localStorage.getItem('octave.p9.despair.v1'); r.pressed = document.getElementById('p9-despair').getAttribute('aria-pressed');
        document.getElementById('p9-despair').click(); r.on = UPG.p9Despair; r.was = was;
        return r;
      });
      ok(o.has && o.after && o.dup === 1, 'one Options row, after the sound ripples, not duplicated on re-render');
      ok(o.was === true && o.off === false && o.stored === '{"on":0}' && o.pressed === 'false' && o.on === true, 'the row toggles UPG.p9Despair and persists in localStorage');
      const reload = await E(() => { UPG.p9Despair = true; localStorage.setItem('octave.p9.despair.v1', '{"on":0}'); return UPG.p9Despair; });
      ok(reload === true, 'a stored preference is only read at load (checked by the reload below)');
      await E(() => { closeModal(); G.state = 'play'; });
    }

    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const shot = async (name) => { const box = await page.locator('canvas').first().boundingBox(); await page.screenshot({ path: path.join(SHOTS, name), clip: box }); };
      const look = (id, x, y, dir, extra) => E(([id, x, y, dir, extra]) => { T.reset(); if (extra) eval(extra); T.go(id, x, y, dir); T.quiet(); G.tod = 0.55; G.time = 100; Engine.render(G.ents, G.tod); }, [id, x, y, dir, extra || '']);
      await look('greenroot', 3.5, 13.5, 0); await E(() => T.adv(300)); await shot('01-greenroot-road.png');
      await look('greenroot', 14.5, 13.8, -Math.PI / 2 - 0.3); await E(() => T.adv(300)); await shot('02-green-well.png');
      await look('greenroot', 8.5, 17.4, Math.PI / 2 + 0.1); await E(() => T.adv(300)); await shot('03-door-reeds.png');
      await look('greenroot', 26.5, 13.5, -0.2); await E(() => T.adv(300)); await shot('04-knoll-chapel.png');
      await look('greenroot_chapel', 7.5, 10.9, -Math.PI / 2); await E(() => T.adv(300)); await shot('05-chapel-nave.png');
      await look('greenroot_chapel', 10.5, 4.6, -Math.PI / 2); await E(() => T.adv(300)); await shot('06-lectern.png');
      await E(() => { UPG.lantern = true; });
      await look('greenroot_crypt', 3.5, 12.5, 0, 'UPG.lantern = true'); await E(() => T.adv(300)); await shot('07-crypt-landing.png');
      await look('greenroot_crypt', 17.5, 14.5, -Math.PI / 2, 'UPG.lantern = true'); await E(() => T.adv(300)); await shot('08-ossuary-hall.png');
      await look('greenroot_crypt', 17.5, 9.2, -Math.PI / 2, 'UPG.lantern = true'); await E(() => T.adv(300)); await shot('09-bells-and-sung-wall.png');
      await look('greenroot_crypt', 13.5, 19.8, Math.PI / 2, 'UPG.lantern = true; G.flags.p9p_bells = true'); await E(() => T.adv(300)); await shot('10-flooded-crypt.png');
      await look('greenroot', 7.5, 21.2, Math.PI / 2 - 0.2, 'UPG.lantern = false'); await E(() => { const d = G.ents.find(e => e.type === 'miredrone'); d.x = 7.8; d.y = 23.2; PARISH.T.despair = 0.85; Engine.render(G.ents, G.tod); drawHUD(); }); await shot('11-mire-drone-despair.png');
      await E(() => { PARISH.T.despair = 0; });
      await look('greenroot_crypt', 15.0, 11.6, 0, 'UPG.lantern = true'); await E(() => { const c = G.ents.find(e => e.type === 'fretcrawler'); c.x = 16.4; c.y = 11.6; c.state = 'idle'; c._p9a = 0.07; Engine.render(G.ents, G.tod); animCreature(c, 0.02, 0); Engine.render(G.ents, G.tod); }); await shot('12-fret-crawler-hidden.png');
      await E(() => { const c = G.ents.find(e => e.type === 'fretcrawler'); c._p9a = 1; c.animAlpha = 1; PARISH.T.sever = 14; Engine.render(G.ents, G.tod); drawHUD(); }); await shot('13-fret-crawler-seen-severed.png');
      await E(() => { PARISH.T.sever = 0; T.reset(); T.go('greenroot_chapel', 10.5, 3.4, -Math.PI / 2); T.use(G.ents.find(e => e.use === 'p9p_register')); }); await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, '14-register.png') });
      await E(() => { T.closeUi(); });
    }

    // 640x400: the register, the dialogue with the new topic, the Options row
    {
      await page.setViewportSize({ width: 640, height: 400 });
      const fit = await E(() => {
        T.reset(); const o = {}; const inside = (el) => { const q = el.getBoundingClientRect(); return q.left >= -1 && q.right <= innerWidth + 1 && q.top >= -1 && q.bottom <= innerHeight + 1; };
        T.go('greenroot_chapel', 10.5, 3.4, -Math.PI / 2); T.use(G.ents.find(e => e.use === 'p9p_register'));
        const ev = document.getElementById('event-panel'); o.eventX = ev.scrollWidth <= ev.clientWidth + 1; o.eventBtns = Array.from(ev.querySelectorAll('button')).every(inside) || !!document.querySelector('.hd-sheet');
        const sheet = document.querySelector('.hd-sheet'); o.sheetIn = sheet ? inside(sheet) : true;
        T.closeUi();
        G.flags.p9p_known = true; G.player.inv.push({ id: 'p9_greenroot_register', n: 1 }); T.talkTo('ignatius');
        const panel = document.querySelector('#modal-panel'); o.dlgX = panel.scrollWidth <= panel.clientWidth + 1; o.topics = Array.from(document.querySelectorAll('#d-topics [data-topic]')).filter(b => /Greenroot|third parish/.test(b.textContent)).every(b => { b.scrollIntoView({ block: 'nearest' }); return b.getBoundingClientRect().width > 20; });
        T.clickTopic(PARISH.TOPIC_REG); o.choice = Array.from(document.querySelectorAll('[data-choice]')).length === 2 && document.documentElement.scrollWidth <= innerWidth + 1;
        T.closeUi(); G.state = 'panel'; renderAccessibilityMenu();
        const grid = document.querySelector('#modal-panel .ctl-grid'), b = document.getElementById('p9-despair'); b.scrollIntoView({ block: 'nearest' }); const q = b.getBoundingClientRect();
        o.opt = { gridX: grid.scrollWidth <= grid.clientWidth + 1, docX: document.documentElement.scrollWidth <= innerWidth + 1, reach: q.left >= -1 && q.right <= innerWidth + 1 && q.width > 20 };
        closeModal(); G.state = 'play'; T.go('greenroot', 14.5, 13.8, -Math.PI / 2); Engine.render(G.ents, G.tod); drawHUD(); PARISH.T.sever = 5; drawHUD();
        o.canvas = { w: Engine.VW, h: Engine.VH };
        return o;
      });
      ok(fit.eventX && fit.eventBtns && fit.sheetIn, '640x400: the register sheet fits');
      ok(fit.dlgX && fit.topics && fit.choice, '640x400: the dialogue with the new topics and the two answers fits');
      ok(fit.opt.gridX && fit.opt.docX && fit.opt.reach, '640x400: the Options row is reachable with no horizontal overflow');
      if (SHOTS) {
        await E(() => { T.reset(); T.go('greenroot', 14.5, 13.8, -Math.PI / 2 - 0.3); T.quiet(); Engine.render(G.ents, G.tod); T.adv(200); });
        await page.screenshot({ path: path.join(SHOTS, '15-640x400-greenroot.png') });
      }
      await page.setViewportSize({ width: 1280, height: 800 });
    }

    // ---------------------------------------------------------------- 14. a stored preference survives a reload
    {
      await page.evaluate(() => { localStorage.setItem('octave.p9.despair.v1', '{"on":0}'); });
      await page.reload();
      await page.waitForFunction(() => typeof PARISH !== 'undefined' && G.state === 'title');
      const off = await page.evaluate(() => UPG.p9Despair);
      await page.evaluate(() => { localStorage.removeItem('octave.p9.despair.v1'); });
      ok(off === false, 'a stored "off" preference is read back at load');
    }

    ok(errors.length === 0, 'no page errors or parish warnings: ' + errors.join(' | '));
    await page.close();
    log(`ALL PASS (${n} checks)`);
  } catch (e) {
    console.error('FAIL', e.message); process.exitCode = 1;
  } finally { await browser.close(); }
})();
