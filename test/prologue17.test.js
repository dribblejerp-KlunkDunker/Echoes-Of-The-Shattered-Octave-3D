// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/prologue17.test.js
// Phase 17, team PROLOGUE: "Prologue: The River Gate" (js/prologue17.js), an extra after Book One.
//   registration with EXTRAS17, the start (Lyra, the date, the maps, the winter look), flood-fill reachability of both maps
//   (no softlock: every exit and the end are reachable, and you can always walk back), the whole route (the limb, the
//   graves and the stones, the North Gate and the voice, the river gate, Dorran Sedge, the end), the companions (they
//   follow, never block), playing with no voice (the whistle, no rest, no travel), French for every string, hostile flags,
//   and ISOLATION: a Book One game and its save slots are byte-identical after the extra is played and quit, Book One never
//   builds these maps, and every wrapper is inert outside the extra. No page errors.
// SHOT_DIR=<dir> also writes screenshots there (Medium and Cinematic). Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOT_DIR || '';
const ok = (c, m) => { assert.ok(c, m); console.log('PASS ' + m); };

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'warning' && /prologue17/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof PROLOGUE17 !== 'undefined');
  return { page, errors };
}
async function bookOne(page) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Book One Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForTimeout(400);
}

const HELPERS = () => {
  window.T = {
    step(n, keys, dt) { for (let i = 0; i < n; i++) { if (G.state === 'play') G.keys = keys || {}; update(dt || 0.033); } G.keys = {}; },
    at(x, y, dir, n) { const c = Engine.cam; c.x = x; c.y = y; if (dir != null) c.dir = dir; T.step(n || 2); },
    // walk to a point in small steps (the trail the companions follow is laid as you go)
    walk(x, y, steps) { const c = Engine.cam, n = steps || 40, x0 = c.x, y0 = c.y; for (let i = 1; i <= n; i++) { if (G.state !== 'play') break; c.x = x0 + (x - x0) * i / n; c.y = y0 + (y - y0) * i / n; c.dir = Math.atan2(y - y0, x - x0); update(0.05); } },
    ev() { const p = document.getElementById('event'); return p && !p.classList.contains('hidden') ? { title: document.querySelector('#event-panel h2').textContent, text: document.querySelector('#event-panel p').textContent, btns: [...document.querySelectorAll('#event-panel button')].map((b) => b.textContent) } : null; },
    click(t) { const b = [...document.querySelectorAll('#event-panel button')].find((x) => x.textContent.indexOf(t) >= 0); if (!b) return false; b.click(); return true; },
    msgs() { return [...document.querySelectorAll('#msgs .m')].map((m) => m.textContent); },
    // an independent flood fill over the real map: walls and closed doors block, deep water blocks, a portal door is an exit,
    // a solid sprite blocks the cells its circle covers
    reach(m, sx, sy) {
      const solid = m.entities.filter((e) => e.solid && !e.hidden && e.kind === 'deco');
      const blocked = (x, y) => {
        if (x < 0 || y < 0 || x >= m.w || y >= m.h) return true;
        const c = m.cells[y * m.w + x]; if (c) return true;
        if (m.floorCells && m.floorCells[y * m.w + x] === 2) return true;
        return solid.some((e) => Math.hypot(e.x - (x + 0.5), e.y - (y + 0.5)) < (e.radius || 0.35) + 0.2);
      };
      const seen = new Uint8Array(m.w * m.h), exits = []; if (blocked(sx, sy)) return { seen, exits };
      const q = [[sx, sy]]; seen[sy * m.w + sx] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, c = m.get(nx, ny);
          if (c && c.portal) { exits.push([nx, ny, c.portal.map]); continue; }
          if (blocked(nx, ny) || seen[ny * m.w + nx]) continue;
          seen[ny * m.w + nx] = 1; q.push([nx, ny]);
        }
      }
      return { seen, exits };
    },
    lsDump() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== 'octave.extras17.v1') o[k] = localStorage.getItem(k); } } catch (e) { /* none */ } return JSON.stringify(o); },
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const { page, errors } = await boot(browser);
    const E = (f, a) => page.evaluate(f, a);
    await E(HELPERS);

    // ---------------------------------------------------------------- registration, before any game
    const reg = await E(() => { const x = EXTRAS17.list().find((r) => r.id === 'prologue'); return x ? { title: x.title, blurb: x.blurb, start: typeof x.start, unlocked: typeof x.unlocked === 'function' ? x.unlocked() : null } : null; });
    ok(reg && reg.title === 'Prologue: The River Gate' && reg.start === 'function' && reg.unlocked === true && /after Book One|Frostmonth/.test(reg.blurb + reg.title + 'Frostmonth'), 'registered with EXTRAS17: ' + JSON.stringify(reg));
    ok(await E(() => PROLOGUE17.active() === false && !buildAllMaps().p17p_road), 'inert at the title: not active, and buildAllMaps() builds no prologue map');

    // ---------------------------------------------------------------- a Book One game, and its saves, before the extra
    await bookOne(page);
    const b1song = await E(() => { const p = G.player, v = p.voice = p.voiceMax; G.song.t = 0; castSong('root'); const r = { spent: v - p.voice, msg: T.msgs().slice(-1)[0] }; G.song.t = 0; p.voice = p.voiceMax; G.rootWard = 0; return r; });
    ok(b1song.spent > 0 && !/whistle/.test(b1song.msg || ''), 'in Book One the Songs are untouched (the Root note is sung and paid for): ' + JSON.stringify(b1song));
    const before = await E(() => {
      G.flags.kaelen_met = true; G.flags.p9q_test = 2;
      G.state = 'panel';                                                       // hold the Book One clock still while it is measured
      SLOTS[0] = JSON.parse(JSON.stringify(snapshotGame())); SLOTS[1] = JSON.parse(JSON.stringify(SLOTS[0]));   // deep copies: snapshotGame() shares G.flags by reference
      window.__keep = JSON.parse(JSON.stringify(snapshotGame()));               // what EXTRAS17 would put aside
      return { slots: JSON.stringify(SLOTS), ls: T.lsDump(), hc: JSON.stringify(HARDCORE.save), flags: JSON.stringify(G.flags, (k, v) => (/^p7t_[gr]ms$/.test(k) ? undefined : v)), player: JSON.stringify(Object.assign({}, G.player, { cls: G.player.cls.id })), journal: JSON.stringify(G.journal), mapId: G.mapId, maps: Object.keys(G.maps).filter((k) => k.indexOf('p17p') === 0).length, active: PROLOGUE17.active() };
    });
    ok(before.mapId === 'oakhaven' && before.maps === 0 && before.active === false, 'a Book One game has no prologue maps and the extra is not active');

    // ---------------------------------------------------------------- start (as EXTRAS17 would, inside its own session)
    const xs = await E(() => { EXTRAS17.state.done = 1; const r = EXTRAS17.start('prologue'); const ban = document.getElementById('x17-banner'); return { r, inx: EXTRAS17.inExtra(), x17: G.flags.p17x_on, slots: SLOTS.every((x) => x === null), banner: !!ban && !ban.hidden && /after Book One/.test(ban.textContent), aware: PROLOGUE17.state().aware }; });
    ok(xs.r === true && xs.inx === 'prologue' && xs.x17 === 1 && xs.slots && xs.banner && xs.aware, 'EXTRAS17.start(\'prologue\') runs the extra in its own session (banner "An extra — after Book One", Book One slots put aside)');
    const st = await E(() => { return { name: G.player.name, day: DAYS[G.day % 8], gday: G.day, mapId: G.mapId, ev: T.ev(), voice: G.player.voice, slate: G.has('p17p_slate'), weapons: G.player.weapons.slice(), winter: WINTER17.active('p17p_road'), flags: Object.keys(G.flags).filter((k) => k.indexOf('p17p_') === 0), title: document.getElementById('title').classList.contains('hidden'), journal: G.journal.map((j) => j.text), card: SCREENS.FAMILY.p17p_road + '/' + SCREENS.FAMILY.p17p_wood }; });
    ok(st.name === 'Lyra Ashgrove' && st.day === 'Rootday' && st.gday === 73 && st.mapId === 'p17p_road', 'start: Lyra Ashgrove on the Greenroot road, Rootday (G.day 73 = the nineteenth of Frostmonth)');
    ok(st.ev && /nineteenth of Frostmonth/.test(st.ev.title) && /An extra — after Book One/.test(st.ev.text) && st.title, 'the opening card is labelled "An extra — after Book One"; the title screen is gone');
    ok(st.voice === 0 && st.slate && st.weapons.join() === 'hands' && st.winter && st.winter.snow > 0, 'no voice, a slate, bare hands; WINTER17.apply was called for the road');
    ok(st.journal.length === 1 && /Rootday the nineteenth of Frostmonth/.test(st.journal[0]) && st.card === 'hedge/street', 'a fresh logbook with one line; arrival cards are the Hedge and a street, not the burning boat');
    await E(() => T.click('Walk on'));

    // ---------------------------------------------------------------- reachability: both maps, no softlock
    const bfs = await E(() => {
      const road = G.maps.p17p_road, wood = G.maps.p17p_wood;
      const r = T.reach(road, 26, 94), w = T.reach(wood, 40, 61);
      const has = (res, m, x, y) => !!res.seen[y * m.w + x];
      const back = T.reach(wood, 12, 5);
      return {
        roadExits: r.exits.map((e) => e[2]), roadGate: has(r, road, 26, 13), roadSouth: has(r, road, 18, 94), roadStones: PROLOGUE17.STONES.every(([x, y]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => has(r, road, (x | 0) + dx, (y | 0) + dy))),
        bare: PROLOGUE17.BARE.every(([x, y]) => { const ok = (xx, yy) => has(r, road, xx, yy); return ok(x | 0, y | 0) || ok((x | 0) + 1, y | 0) || ok((x | 0) - 1, y | 0); }),
        woodExits: w.exits.map((e) => e[2]), end: has(w, wood, 12, 5), dorran: has(w, wood, 36, 57), way: PROLOGUE17.DORRAN_WAY.every(([x, y]) => has(w, wood, x | 0, y | 0)), backExits: back.exits.map((e) => e[2]),
      };
    });
    ok(bfs.roadExits.includes('p17p_wood') && bfs.roadGate && bfs.roadSouth && bfs.roadStones && bfs.bare, 'road flood fill: the river gate, the North Gate, every bare grave and every stone pile are reachable from the start');
    ok(bfs.woodExits.includes('p17p_road') && bfs.end && bfs.dorran && bfs.way, 'wood flood fill: the top of the river street, Dorran\'s path and the gate back out are reachable from the river gate');
    ok(bfs.backExits.includes('p17p_road'), 'from the top of the river street you can always walk back out of the river gate (no softlock)');

    // ---------------------------------------------------------------- the road
    const road1 = await E(() => {
      T.walk(26.5, 90, 20); const lim0 = PROLOGUE17.fint('limb');
      T.walk(26.5, 84, 30); T.step(10);
      const limb = G.ents.find((e) => e.sprite === 'p17p_limb');
      return { lim0, lim1: PROLOGUE17.fint('limb'), limbShown: limb && !limb.hidden, limbSolid: limb && limb.solid, msgs: T.msgs(), tod: G.tod };
    });
    ok(road1.lim0 === 0 && road1.lim1 === 1 && road1.limbShown && !road1.limbSolid && road1.msgs.some((m) => /dull wet crack/.test(m)), 'at the second milestone the oak-limb falls across the road (and does not block it)');
    await page.waitForTimeout(3000);
    ok((await E(() => T.msgs())).some((m) => /^No bell\./.test(m)), '"No bell." — the wood no longer rings');
    const knock = await E(() => { const c = Engine.cam; c.x = 23.4; c.y = 60.0; c.dir = Math.PI; G.attack.t = 0; document.getElementById('msgs').innerHTML = ''; PROLOGUE17.RUN.knockT = 0; attack(); T.step(30); return T.msgs(); });
    ok(knock.some((m) => /A dull wet knock\. No bell\./.test(m)), 'a blow on an oak only knocks: ' + JSON.stringify(knock.slice(-1)));
    const song = await E(() => { document.getElementById('msgs').innerHTML = ''; const hp = G.player.hp; PROLOGUE17.RUN.whistleT = 0; castSong('tending'); const a = T.msgs(); G.state = 'panel'; renderRest(); const b = { state: G.state, msgs: T.msgs() }; G.state = 'play'; let tb = null; try { tb = travelBlocked(); } catch (e) { tb = 'err'; } return { a, hp0: hp, hp1: G.player.hp, voice: G.player.voice, rest: b, tb, songT: G.song.t }; });
    ok(song.a.some((m) => /whistle the tending note/.test(m)) && song.voice === 0 && song.hp1 === song.hp0 && song.songT === 0, 'the Song key whistles (it hurts, nothing is sung, nothing heals)');
    ok(song.rest.state === 'play' && song.rest.msgs.some((m) => /Not here\. Not yet\./.test(m)) && /one way/.test(song.tb || ''), 'no resting and no travel during the extra');

    // the graves: a stone from the verge, the child's grave at the fifth milestone, then the Aegis and the others
    const graves = await E(() => {
      T.walk(26.5, 50, 60); const counted = PROLOGUE17.fint('count');
      T.walk(26.5, 33.6, 40);
      const bare = G.ents.filter((e) => e.p17pGrave != null && e.use === 'p17p_grave').length;
      useDeco(G.ents.find((e) => e.use === 'p17p_grave' && e.p17pChild));       // no stone yet: the child's grave event offers to set one
      const e1 = T.ev(); T.click('Set a stone'); const need = T.msgs().some((m) => /no stone to set/.test(m));
      useDeco(G.ents.find((e) => e.use === 'p17p_stone')); const got = G.has('p17p_stone');
      useDeco(G.ents.find((e) => e.use === 'p17p_grave' && e.p17pChild)); T.click('Kneel'); const e2 = T.ev(); T.click('Set a stone');
      return { counted, bare, e1, need, got, e2, child: (PROLOGUE17.fint('graves') & 1) === 1, stones: PROLOGUE17.fint('stones'), sprite: G.ents.find((e) => e.p17pChild).sprite, journal: G.journal.length };
    });
    ok(graves.counted === 1 && graves.bare === 10, 'graves all along the road; ten bare ones from the fifth milestone; "You stop counting at the fourth milestone, at sixty."');
    ok(graves.e1 && /A small grave/.test(graves.e1.title) && graves.need && graves.got, 'the child\'s grave asks for a stone; there are flat stones under the snow at the side of the road');
    ok(graves.e2 && /nothing at all/.test(graves.e2.text) && graves.child && graves.stones === 1 && graves.sprite === 'p17p_cgrave' && graves.journal === 2, 'kneel (cold earth, nothing growing), then the stone on the stone: the marker shows it, a log line is written');
    await page.waitForTimeout(2600);
    const help = await E(() => { const n0 = PROLOGUE17.fint('graves'); const aegis = T.msgs().some((m) => /Aegis's knee grinds/.test(m)); T.step(500, {}, 0.05); return { aegis, n0, n1: PROLOGUE17.fint('graves'), help: PROLOGUE17.fint('help'), others: T.msgs().some((m) => /Seraphina begins to do it too/.test(m)) }; });
    const bits = (v) => v.toString(2).split('').filter((c) => c === '1').length;
    ok(help.aegis && bits(help.n0) >= 2 && bits(help.n1) > bits(help.n0) && help.help === 2, 'the Aegis sets a stone on the next bare grave, and then the others help (' + bits(help.n1) + ' of 10 set)');

    // the companions follow and never block
    const comp = await E(() => {
      const ids = PROLOGUE17.COMPANIONS, c = Engine.cam;
      const d = ids.map((id) => { const e = G.ents.find((x) => x.id === id); return e ? Math.hypot(e.x - c.x, e.y - c.y) : -1; });
      return { d, solid: ids.map((id) => G.ents.find((x) => x.id === id).solid), blocked: solidAt(c.x, c.y - 1.2) };
    });
    ok(comp.d.every((x) => x > 0 && x < 9) && comp.solid.every((s) => s === false), 'Seraphina, the Aegis, Ignatius Crane and Solenne follow along your trail, and are never solid: ' + comp.d.map((x) => x.toFixed(1)).join(', '));

    // the Hedge, the North Gate, the voice
    const gate = await E(() => {
      document.getElementById('msgs').innerHTML = '';
      T.walk(26.5, 21, 40); const rise = PROLOGUE17.fint('rise');
      T.walk(26.5, 14.2, 30); const gate = PROLOGUE17.fint('gate');
      const locked = G.map.get(26, 12);
      // try the river gate before the voice has come: the voice comes first
      const rg = G.map.get(46, 12); transfer(rg.portal); const early = T.ev();
      return { rise, gate, ada: T.msgs().some((m) => /Ada Pellow/.test(m)), locked: locked.locked === '__never', early, map: G.mapId };
    });
    ok(gate.rise === 1 && gate.gate === 1 && gate.ada && gate.locked, 'the grey Hedge, and the North Gate rusted shut: where Ada Pellow went in');
    ok(gate.early && gate.early.title === '"Lyra-love."' && gate.map === 'p17p_road', 'going for the river gate first: the voice comes first, the map does not change');
    const voice = await E(() => {
      const out = [];
      out.push(T.ev()); T.click('Listen'); out.push(T.ev()); T.click('Do not turn round'); out.push(T.ev()); T.click('Take up the slate'); out.push(T.ev()); T.click('Walk on');
      return { out, voice: PROLOGUE17.fint('voice'), state: G.state, journal: G.journal[0].text };
    });
    ok(/Is that you\?/.test(voice.out[0].text) && /singing in the orchards/.test(voice.out[1].text) && /Who is that\?/.test(voice.out[2].text), 'the voice: "Lyra-love. Is that you?" — listen — Seraphina: "Who is that?"');
    ok(/NOBODY\./.test(voice.out[3].text) && /Like a question\./.test(voice.out[3].text) && voice.voice === 1 && voice.state === 'play' && /wrote NOBODY/.test(voice.journal), 'the slate: NOBODY. Behind you the voice says your name once more, like a question');
    const again = await E(() => { PROLOGUE17.voiceEvent(); return T.ev(); });
    ok(again === null, 'the voice comes once');

    // the voice by turning away, on a fresh run (the other way it can come)
    const turn = await E(() => {
      const f = G.flags; f.p17p_voice = 0; f.p17p_gate = 0;
      T.at(26.5, 15.5, -Math.PI / 2, 2); T.step(20); T.step(130, {}, 0.05);     // stand and look at the gate, then...
      Engine.cam.dir = Math.PI / 2; T.step(60, {}, 0.05);                         // ...turn to go
      const e = T.ev(); T.click('Do not turn round'); T.click('Take up the slate'); T.click('Walk on');
      return { e: e && e.title, voice: PROLOGUE17.fint('voice') };
    });
    ok(turn.e === '"Lyra-love."' && turn.voice === 1, 'or: stand at the North Gate, then turn away to go round, and the voice says your name');

    // ---------------------------------------------------------------- the river gate, the wood, Dorran Sedge
    const wood = await E(() => {
      T.walk(45.5, 14.2, 50);
      transfer(G.map.get(46, 12).portal);
      const m = G.mapId, wint = WINTER17.active('p17p_wood');
      const comps = PROLOGUE17.COMPANIONS.map((id) => { const e = G.ents.find((x) => x.id === id); return Math.hypot(e.x - Engine.cam.x, e.y - Engine.cam.y); });
      T.step(440, {}, 0.05);
      return { m, wint: !!wint, comps, msgs: T.msgs(), wood: PROLOGUE17.fint('wood'), dorran: PROLOGUE17.fint('dorran'), ev: T.ev(), journal: G.journal.map((j) => j.text) };
    });
    ok(wood.m === 'p17p_wood' && wood.wint && wood.comps.every((d) => d < 4), 'through the river gate into the wood, the company behind you; WINTER17.apply for the wood');
    ok(wood.journal.some((j) => /Oakhaven is a wood/.test(j)) && wood.wood >= 6, 'houses in the trees, the leaves on the ground, "When did they fall?", "Nullday. Nullday night."');
    ok(wood.ev && /Dorran Sedge/.test(wood.ev.title) && /"Cantor," he says\./.test(wood.ev.text) && wood.dorran === 2, 'Dorran Sedge wades out of the trees with a lantern and comes to you');
    const dor = await E(() => {
      const out = [];
      T.click('Lift your good hand'); out.push(T.ev()); T.click('Answer him'); out.push(T.ev()); T.click('Write on the slate'); out.push(T.ev()); T.click('Follow him');
      return { out, dorran: PROLOGUE17.fint('dorran'), journal: G.journal[0].text, msgs: T.msgs() };
    });
    ok(/Does it ring\?/.test(dor.out[0].text) && /torn place/.test(dor.out[1].text) && /NO\./.test(dor.out[2].text) && /come and see the Governor/.test(dor.out[2].text), '"Does it ring?" — no voice, only breath — the slate: NO. "You\'d best come and see the Governor."');
    ok(dor.dorran === 3 && /wrote NO/.test(dor.journal), 'then he leads you up the river street');
    const walk = await E(() => {
      const d = G.ents.find((e) => e.id === 'p17p_dorran');
      let guard = 0;
      while (PROLOGUE17.fint('dorran') < 4 && guard++ < 4000) { const c = Engine.cam, dx = d.x - c.x, dy = d.y - c.y, dd = Math.hypot(dx, dy); if (dd > 1.6) { c.x += dx / dd * 0.06; c.y += dy / dd * 0.06; } c.dir = Math.atan2(dy, dx); update(0.05); }
      T.walk(d.x + 0.8, d.y + 1.0, 10); T.step(10);
      return { dorran: PROLOGUE17.fint('dorran'), ev: T.ev(), guard, at: [d.x, d.y] };
    });
    ok(walk.dorran === 4 && walk.ev && walk.ev.title === 'The Grove' && /As if there were no other\./.test(walk.ev.text) && /Stones you set on the stone/.test(walk.ev.text), 'at the top of the river street the prologue ends: "The Grove. As if there were no other." (' + walk.guard + ' frames)');
    const wait = await E(() => {
      // Dorran waits for you if you hang back (a separate check on a reset of his walk)
      const d = G.ents.find((e) => e.id === 'p17p_dorran'); const x0 = d.x, y0 = d.y;
      G.flags.p17p_dorran = 3; d.p17pWay = 0; hide('#event'); G.state = 'play'; PROLOGUE17.RUN.endShown = true;
      Engine.cam.x = 40.5; Engine.cam.y = 61.2; d.x = 30; d.y = 30; T.step(40);
      const moved = Math.hypot(d.x - 30, d.y - 30);
      G.flags.p17p_dorran = 4; d.x = x0; d.y = y0; PROLOGUE17.RUN.endShown = false; T.walk(x0 + 0.5, y0 + 1, 10); T.step(4);
      return { moved, ev: T.ev() };
    });
    ok(wait.moved < 0.01 && wait.ev && wait.ev.title === 'The Grove', 'Dorran stops and waits when you fall behind; the end card comes back if it was left');

    // ---------------------------------------------------------------- French (the pairs file, and the game showing it)
    const tsvPath = path.join(__dirname, '..', 'tools', 'i18n', 'p17-prologue.tsv');
    const tsv = fs.readFileSync(tsvPath, 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const list = await E(() => PROLOGUE17.LIST.slice());
    const noFr = list.filter((s) => !pairs.has(s));
    ok(noFr.length === 0 && tsv.every((r) => r.length === 2 && r[1].trim()), 'every one of the ' + list.length + ' strings has a French pair' + (noFr.length ? ': missing ' + JSON.stringify(noFr.slice(0, 3)) : ''));
    ok(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Reach)\b/.test(r[1])) && tsv.some((r) => /Chantre/.test(r[1])) && tsv.some((r) => /la Haie/.test(r[1])), 'the French follows the glossary (Chantre, la Haie)');
    const fr = await E(async (pairs) => {
      const had = localStorage.getItem('octave.access.v1');                     // the test's own Language choice is put back afterwards
      await ACCESS.setLocale('fr');
      const cat = STORY_I18N.cats.fr; for (const [en, f] of pairs) if (!/\{\d/.test(en)) cat.s.set(STORY_I18N.hash(STORY_I18N.norm(en)), f);   // the Commander merges the file; here it is put in by hand
      hide('#event'); G.state = 'play';
      PROLOGUE17.dorranMeet(); await new Promise((r) => setTimeout(r, 300));
      const e = T.ev(); T.click('Lever'); await new Promise((r) => setTimeout(r, 300)); const e2 = T.ev();
      hide('#event'); G.state = 'play'; await ACCESS.setLocale('en');
      if (had == null) localStorage.removeItem('octave.access.v1'); else localStorage.setItem('octave.access.v1', had);
      return { e, e2 };
    }, [...pairs]);
    ok(fr.e && /Chantre/.test(fr.e.text) && fr.e.btns.some((b) => /Lever/.test(b)) && fr.e2 && /Ça sonne/.test(fr.e2.text), 'in French, Dorran says « Chantre » and « Ça sonne ? »: ' + (fr.e ? fr.e.btns.join(' | ') : 'none'));

    // ---------------------------------------------------------------- hostile flags
    const hostile = await E(() => {
      Object.assign(G.flags, { p17p_graves: 'all', p17p_stones: 1e9, p17p_voice: -1, p17p_evil: '<img src=x onerror=alert(1)>', p17p_dorran: 2.5 });
      PROLOGUE17.validate();
      return { keys: Object.keys(G.flags).filter((k) => k.indexOf('p17p_') === 0 && ['p17p_graves', 'p17p_stones', 'p17p_voice', 'p17p_evil', 'p17p_dorran'].includes(k)), fint: [PROLOGUE17.fint('graves'), PROLOGUE17.fint('stones')] };
    });
    ok(hostile.keys.length === 0 && hostile.fint.join() === '0,0', 'hostile p17p_ flags are dropped on load and read as 0');

    // ---------------------------------------------------------------- screenshots (Medium and Cinematic, a 3D view in each)
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const lsKeep = await E(() => T.lsDump());                                   // the presets the shots switch are put back afterwards
      const shot = async (name) => { await page.waitForTimeout(450); const box = await page.locator('canvas').first().boundingBox(); await page.screenshot({ path: path.join(SHOTS, name), clip: box }); };
      const view = (args) => E(([mapId, x, y, dir, pitch, setup]) => {
        hide('#event'); G.state = 'play'; if (G.mapId !== mapId) loadMap(mapId, { x, y, dir });
        if (setup) (new Function(setup))();
        const c = Engine.cam; c.x = x; c.y = y; c.dir = dir; c.pitch = pitch || 0; T.step(6);
        c.x = x; c.y = y; c.dir = dir; c.pitch = pitch || 0;
        hide('#event'); G.state = 'play'; try { SCREENS.dismiss(); } catch (e) { /* none */ } document.getElementById('msgs').innerHTML = ''; Engine.render(G.ents, G.tod);
      }, args);
      const place = 'const at = (id, x, y) => { const e = G.ents.find((q) => q.id === id); if (e) { e.x = x; e.y = y; e.hidden = false; } };';
      for (const preset of ['medium', 'cinematic']) {
        await E((p) => PRESETS.apply(p), preset);
        await view(['p17p_road', 26.5, 88.0, -Math.PI / 2, 0, place + "at('p17p_seraphina', 25.4, 84.5); at('p17p_aegis', 27.9, 85.2);"]); await shot(preset + '-1-road.png');
        await view(['p17p_road', 26.2, 34.4, -Math.PI / 2 - 0.55, 4, '']); await shot(preset + '-2-graves.png');
        await view(['p17p_road', 26.5, 19.5, -Math.PI / 2, 6, '']); await shot(preset + '-3-north-gate.png');
        await view(['p17p_wood', 40.3, 61.0, -Math.PI / 2 - 0.3, 22, '']); await shot(preset + '-4-river-gate.png');
        await view(['p17p_wood', 38.6, 47.5, -Math.PI / 2 - 0.15, 10, place + "at('p17p_dorran', 37.6, 45.0); at('p17p_seraphina', 40.2, 45.9);"]); await shot(preset + '-5-dorran.png');
        await view(['p17p_wood', 30.5, 31.5, -Math.PI / 2 - 0.85, 16, '']); await shot(preset + '-6-river-street.png');
      }
      await E(() => PRESETS.apply('medium'));
      await E(() => { PROLOGUE17.voiceEvent(); });
      await page.setViewportSize({ width: 640, height: 400 }); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SHOTS, '7-640x400-event.png') });
      const fit = await E(() => { const p = document.getElementById('event-panel'); return { sw: p.scrollWidth, cw: p.clientWidth, ew: document.documentElement.scrollWidth }; });
      ok(fit.sw <= fit.cw + 1 && fit.ew <= 641, 'the events fit 640x400 without horizontal overflow');
      await page.setViewportSize({ width: 1280, height: 800 });
      await E(() => { hide('#event'); G.state = 'play'; G.flags.p17p_voice = 1; });
      await E((d) => { const o = JSON.parse(d); for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (!(k in o)) localStorage.removeItem(k); } for (const k in o) localStorage.setItem(k, o[k]); }, lsKeep);
    }

    // ---------------------------------------------------------------- finish, and the Book One game is exactly as it was
    const fin = await E(() => {
      hide('#event'); G.state = 'play';
      const r = PROLOGUE17.finish();
      return { r, state: G.state, title: !document.getElementById('title').classList.contains('hidden'), active: PROLOGUE17.active(), winter: WINTER17.active('p17p_road'), inx: EXTRAS17.inExtra(), res: EXTRAS17.state.res.prologue };
    });
    ok(fin.r && fin.r.id === 'prologue' && typeof fin.r.stones === 'number' && fin.state === 'title' && fin.title && !fin.active && fin.winter === null && fin.inx === null && /Stones you set/.test(fin.res || ''), 'finish: EXTRAS17.finish(result) ends the extra, back to the title and the Extras menu, the result on its card, the winter look cleared');
    const after = await E(() => {
      return { slots: JSON.stringify(SLOTS), ls: T.lsDump(), hc: JSON.stringify(HARDCORE.save), flags: JSON.stringify(G.flags, (k, v) => (/^p7t_[gr]ms$/.test(k) ? undefined : v)), player: JSON.stringify(Object.assign({}, G.player, { cls: G.player.cls.id })), journal: JSON.stringify(G.journal), mapId: G.mapId, maps: Object.keys(G.maps).filter((k) => k.indexOf('p17p') === 0).length, active: PROLOGUE17.active(), p17: Object.keys(G.flags).filter((k) => k.indexOf('p17p_') === 0).length };
    });
    if (after.slots !== before.slots) { const A = JSON.parse(after.slots), Bf = JSON.parse(before.slots); for (const i of [0, 1]) for (const k of Object.keys(Bf[i] || {})) if (JSON.stringify(A[i][k]) !== JSON.stringify(Bf[i][k])) console.log('DIFF slot', i, k, JSON.stringify(A[i][k]).slice(0, 300), '| was', JSON.stringify(Bf[i][k]).slice(0, 300)); }
    ok(after.slots === before.slots && after.hc === before.hc, 'the Book One save slots are byte-identical after the extra (' + before.slots.length + ' bytes)');
    if (after.ls !== before.ls) { const A = JSON.parse(after.ls), Bf = JSON.parse(before.ls); for (const k of new Set([...Object.keys(A), ...Object.keys(Bf)])) if (A[k] !== Bf[k]) console.log('LSDIFF', k, String(Bf[k]).slice(0, 200), '=>', String(A[k]).slice(0, 200)); }
    ok(after.ls === before.ls, 'localStorage is byte-identical apart from EXTRAS17\'s own record: the extra stores nothing');
    if (after.flags !== before.flags || after.journal !== before.journal) console.log('AFTER', after.flags.slice(0, 600), '\nBEFORE', before.flags.slice(0, 600), after.mapId, after.maps, after.active, after.journal.slice(0, 200), '|', before.journal.slice(0, 200));
    ok(after.flags === before.flags && after.p17 === 0 && after.journal === before.journal && after.mapId === before.mapId && after.maps === 0 && !after.active, 'the Book One game reloads with the same flags, logbook and place, no prologue flags or maps, and the extra inactive');
    const loadable = await E(() => { restoreGame(JSON.parse(JSON.stringify(SLOTS[0]))); return { mapId: G.mapId, name: G.player.name, kaelen: G.flags.kaelen_met === true }; });
    ok(loadable.mapId === 'oakhaven' && loadable.name === 'Book One Tester' && loadable.kaelen, 'and the Book One slot still loads');
    const inert = await E(() => {
      const p = G.player; p.voice = p.voiceMax; G.song.t = 0; castSong('root'); const spent = p.voiceMax - p.voice; G.song.t = 0;
      return { spent, maps: Object.keys(buildAllMaps()).some((k) => k.indexOf('p17p') === 0), rest: typeof renderRest === 'function' };
    });
    ok(inert.spent > 0 && !inert.maps, 'after the extra every wrapper is inert again: Songs are sung, no prologue maps are built');

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
    console.log('OK prologue17');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e && e.message ? e.message : e); process.exit(1); });
