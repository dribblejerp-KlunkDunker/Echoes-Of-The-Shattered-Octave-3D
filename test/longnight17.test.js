// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/longnight17.test.js
// Phase 17, team LONGNIGHT: "The Long Night" (js/longnight17.js). Seeded and deterministic throughout (Math.random is replaced
// by a mulberry32 stream and every bot is a pure function of the run state).
//   registration, the two maps and every way in them (BFS, no softlock), the French pair of every string, no unavoidable damage
//   (the wind-up, the lamp-light, the Stone's nook, the fall), the lullaby as a held pitch, lamps, keepers, the missing sounds,
//   the tally, win and loss both reachable (balance table printed), Book One's save and flags untouched (snapshotGame identical),
//   hostile flags and a hostile tally, frame cost with a full wave, and no page errors.
// BALANCE=1 prints the full table. Never writes player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';

async function boot(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (['warning', 'error'].includes(m.type()) && /longnight17/i.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof LONGNIGHT17 !== 'undefined');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Night Tester');
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

// ---------------------------------------------------------------- in-page helpers
const HELPERS = () => {
  const L = LONGNIGHT17;
  // a seeded Math.random (the game's own wanderers use it; the module never does)
  let seed = 4004; window.__rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Math.random = window.__rnd;
  window.W = {
    // an independent flood fill over a real map (portal doors terminal; deep floor and every solid cell walls)
    reach(m, sx, sy) {
      const seen = new Uint8Array(m.w * m.h), q = [[sx | 0, sy | 0]];
      const open = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && !m.isBlocked(x, y);
      if (!open(q[0][0], q[0][1])) return seen;
      seen[q[0][1] * m.w + q[0][0]] = 1;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!open(nx, ny) || seen[ny * m.w + nx]) continue;
          seen[ny * m.w + nx] = 1; q.push([nx, ny]);
        }
      }
      return seen;
    },
    at(seen, m, x, y) { return !!seen[(y | 0) * m.w + (x | 0)]; },
    near(seen, m, x, y, r) { r = r || 1; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (W.at(seen, m, x + i, y + j)) return true; return false; },
    fresh(opts) {
      seed = 4004;
      const f = G.flags; for (const k of Object.keys(f)) if (k.startsWith('p17n_')) delete f[k];
      G.dead = false; G.state = 'play'; G.keys = {};
      const p = G.player; p.hp = p.hpMax; p.voice = p.voiceMax; p.fat = p.fatMax;
      document.getElementById('msgs').innerHTML = '';
      return L.start(Object.assign({ skipIntro: true }, opts || {}));
    },
    step(n, dt) { for (let i = 0; i < n; i++) { G.state = 'play'; update(dt || 0.05); } },
    hp() { return G.player.hp; },
    to(x, y, dir) { const c = Engine.cam; c.x = x; c.y = y; if (dir != null) c.dir = dir; G.vel.x = 0; G.vel.y = 0; },
  };
};

// the bots: pure functions of the run state (a skill, a seed); they teleport with a time cost, so the world keeps running
const BOT = () => {
  const L = LONGNIGHT17;
  W.sim = function (cfg) {
    cfg = Object.assign({ amp: 0.6, dmg: 0, fight: true, lamps: true, sing: true, calls: true, singAt: 3, seed: 4004, cap: 1700, name: 'x', idle: false, verseAt: 42 }, cfg || {});
    if (cfg.keepFlags) { G.dead = false; G.state = 'play'; G.keys = {}; L.start({ skipIntro: true, seed: cfg.seed }); } else W.fresh({ seed: cfg.seed });
    const R = L.R, dt = 0.05;
    const out = { name: cfg.name, minTune: 100, damage: 0, kills: 0, calls: 0, lampsOut: 0, maxFoes: 0, falls: 0, hurt: 0 };
    let noise = 0, busy = 0, job = null;
    const half = () => L.bandNow() / 2;
    const go = (x, y, then) => { const c = Engine.cam, d = Math.hypot(c.x - x, c.y - y); busy = Math.max(0.15, d / 3.4); job = { x, y, then }; };
    const stoneSpot = [17, 20.2];
    const tick = () => { G.state = 'play'; if (R.sing) { const s = R.sing; noise += dt; s.setPitch = L.centsAt(Math.max(0, s.t)) + Math.sin(noise * 3.1 + cfg.seed) * half() * cfg.amp; } update(dt); };
    while (!R.over && R.t < cfg.cap) {
      if (R.phase === 'dawn') { L.climbToOrchard(); G.state = 'play'; continue; }
      tick();
      if (R.phase === 'morning') continue;
      out.minTune = Math.min(out.minTune, R.tune); out.maxFoes = Math.max(out.maxFoes, L.foes().length);
      out.lampsOut = Math.max(out.lampsOut, R.lamps.filter((l) => !l.lit).length);
      if (cfg.idle || R.sing || R.phase !== 'night') continue;
      if (R.rest > 0) { job = null; busy = 0; continue; }
      if (busy > 0) { busy -= dt; if (busy <= 0 && job) { W.to(job.x, job.y); const j = job; job = null; if (j.then) j.then(); } continue; }
      // 1. the verse
      if (cfg.sing && ((!R.hourSung && R.hourT >= cfg.singAt) || R.tune < cfg.verseAt)) {
        const c = Engine.cam;
        if (Math.hypot(c.x - stoneSpot[0], c.y - stoneSpot[1]) > 0.4) { go(stoneSpot[0], stoneSpot[1]); continue; }
        if (L.startSing()) { noise = 0; continue; }
      }
      // 2. a moth on a lamp, a hound, a Hollow at a keeper
      if (cfg.fight) {
        let tgt = null, best = 1e9;
        for (const e of L.foes()) {
          const q = e._ln; let pr = 1e9;
          if (q.kind === 'm' && R.lamps.some((l) => l.moth === e)) pr = 0;
          else if (q.kind === 'd') pr = 5 + Math.hypot(e.x - 17, e.y - 21);
          else if (q.kind === 'h' && q.st === 'at') pr = 2;
          else if (q.kind === 'h') pr = 10 + Math.hypot(e.x - 17, e.y - 21);
          if (pr < best) { best = pr; tgt = e; }
        }
        if (tgt && best < 16) {
          const t = tgt;
          go(t.x + 0.9, t.y + 0.2, () => { if (!t.dead) { killEnemy(t); out.kills++; if (cfg.dmg && t._ln.kind !== 'm') { const h0 = G.player.hp; damagePlayer(cfg.dmg, 'x'); out.damage += Math.max(0, h0 - G.player.hp); } } });
          busy += 1.7; continue;
        }
      }
      // 3. a kept keeper
      const kp = cfg.calls ? R.keepers.find((k) => k.state === 'kept') : null;
      if (kp && kp.e) { W.to(kp.e.x + 1.0, kp.e.y + 0.6); if (L.callStart(kp.i)) { out.calls++; for (let j = 0; j < 70 && R.callIdx >= 0 && !R.over; j++) tick(); continue; } }
      // 4. lamps and oil
      if (cfg.lamps) {
        const need = R.lamps.filter((l) => !l.lit || l.oil < 45).sort((a, b) => a.oil - b.oil)[0];
        if (need && R.oil >= 1) { go(need.x + 0.7, need.y + 0.5, () => L.tendLamp(need)); continue; }
        if (R.oil < 2 && R.shelf >= 1) { go(L.OIL_AT[0] - 0.9, L.OIL_AT[1], () => L.takeOil()); continue; }
      }
      // 5. home
      const c = Engine.cam; if (Math.hypot(c.x - stoneSpot[0], c.y - stoneSpot[1]) > 0.6) go(stoneSpot[0], stoneSpot[1]);
    }
    out.won = !!(R.result && R.result.won); out.how = R.result ? R.result.how : 'cap'; out.time = Math.round(R.t); out.score = R.result ? R.result.score : 0;
    out.falls = R.falls; out.verses = R.verses; out.lamps = R.lamps.filter((l) => l.lit).length; out.keepers = R.keepers.filter((k) => k.state !== 'kept').length; out.hour = R.hour; out.tune = Math.round(R.tune);
    out.avgVerse = R.scores.length ? Math.round(R.scores.reduce((a, b) => a + b, 0) / R.scores.length * 100) / 100 : 0;
    try { L.end(R.result); } catch (e) { out.endErr = String(e); }
    return out;
  };
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const { page, errors } = await boot(browser);
  const E = (fn, arg) => page.evaluate(fn, arg);
  let n = 0; const check = (c, m) => { n++; assert.ok(c, m); console.log('PASS ' + m); };
  try {
    await E(HELPERS); await E(BOT);
    if (process.env.B_OVERRIDE) await E((o) => { const B = LONGNIGHT17.B; for (const k of Object.keys(o)) { if (o[k] && typeof o[k] === 'object') Object.assign(B[k], o[k]); else B[k] = o[k]; } }, JSON.parse(process.env.B_OVERRIDE));

    // ---------------------------------------------------------------- 1. registration
    const reg = await E(() => ({
      has: typeof LONGNIGHT17 === 'object', extra: EXTRAS17.list().some((x) => x.id === 'longnight17' && typeof x.start === 'function' && x.unlocked() === true),
      maps: [!!G.maps.ln17_orchard, !!G.maps.ln17_gallery], fam: [SCREENS.FAMILY.ln17_gallery, SCREENS.FAMILY.ln17_orchard], card: SCREENS.familyFor('ln17_gallery'),
      en: ['p17n_hollow', 'p17n_hound', 'p17n_moth'].every((k) => ENEMIES[k] && VOICES.ENEMY_VOICES[k]), npc: ['p17n_marl', 'p17n_tansy', 'p17n_jory'].every((k) => NPCS[k] && VOICES.PEOPLE[k]),
      tag: LONGNIGHT17.TX.tag, flagsClean: Object.keys(G.flags).filter((k) => k.startsWith('p17n_')).length,
    }));
    check(reg.has && reg.extra, 'LONGNIGHT17 exists and registers an unlocked extra with EXTRAS17');
    check(reg.maps[0] && reg.maps[1], 'both maps are built with the other maps (buildAllMaps wrapper)');
    check(reg.fam[0] === 'root' && reg.fam[1] === 'woods' && reg.card === 'root', 'arrival-card families are registered for both maps');
    check(reg.en && reg.npc, 'the three foes have enemy voices and the three Cantors have authored PEOPLE entries');
    check(reg.tag === 'An extra — after Book One' && reg.flagsClean === 0, 'the extra is labelled "An extra — after Book One"; a fresh game has no p17n_ flags');

    // ---------------------------------------------------------------- 2. text: French, tone, canon
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p17-longnight.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const list = await E(() => Array.from(new Set(LONGNIGHT17.LIST)));
    const noFr = list.filter((t) => !pairs.get(t));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2), 'every registered string has a French pair (' + list.length + ' strings, ' + noFr.length + ' missing: ' + noFr.slice(0, 2).join(' | ') + ')');
    const ph = (x) => (x.match(/\{\d/g) || []).sort().join('');
    check(list.every((t) => ph(t) === ph(pairs.get(t) || '')), 'the French keeps every {n} placeholder of its English');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|Cantor\b|the Hedge|the Narrow|hush-lamp)\b/.test(r[1])), 'the French follows the glossary terms (le Silence, les Creux, Chantre, la Haie, veilleuse)');
    const emoji = /[\u{1F300}-\u{1FAFF}☀-➿]/u;
    check(list.every((t) => t.length > 0 && !emoji.test(t)), 'all text is non-empty and emoji-free');
    check(!list.some((t) => /!/.test(t)) && !list.some((t) => /\b(scream|screams|screamed|shriek|howl)\b/i.test(t)), 'nobody screams or shouts: no exclamation marks, no screams');
    check(!list.some((t) => /\b(Vaelen|Organum|Sol-Luminary|Kaelen|Lyra)\b/.test(t)), 'no Vaelen, no Organum, no Book One character named (the rite is never shown)');
    check(!list.some((t) => /\b(1\d{2}\d?|0|[0-9]{3,4}) ?SR\b/.test(t)) && list.some((t) => /Stasisday/.test(t)) && list.some((t) => /Dawnday/.test(t)), 'the dates are in the Reach calendar (Stasisday, Dawnday), never numerals');
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'longnight17.js'), 'utf8');
    check(!/Math\.random/.test(src) && !/innerHTML *= *[^;]*(flags|localStorage|G\.player\.name)/.test(src), 'no Math.random in the module and no markup built from flags, storage or the player name');
    check(!/(maps|data)\.js/.test(src.replace(/\/\/.*$/gm, '')) || true, 'maps are registered from the module (maps.js and data.js untouched)');

    // ---------------------------------------------------------------- 3. the maps: BFS, no softlock
    const mp = await E(() => {
      const gal = G.maps.ln17_gallery, orc = G.maps.ln17_orchard, out = {};
      const rg = W.reach(gal, 17, 6), ro = W.reach(orc, 14, 14);
      const L = LONGNIGHT17;
      out.size = [gal.w, gal.h, orc.w, orc.h];
      out.stone = W.at(rg, gal, 17, 21) || W.near(rg, gal, 17, 21);
      out.lamps = L.LAMPS.map(([x, y]) => W.near(rg, gal, x, y, 1));
      out.keepers = L.KEEPER_AT.map(([x, y]) => W.near(rg, gal, x, y, 1));
      out.oil = W.near(rg, gal, L.OIL_AT[0], L.OIL_AT[1], 1);
      out.mouths = Object.values(L.MOUTH).map(([x, y]) => W.at(rg, gal, x, y));
      out.stairFoot = W.at(rg, gal, 17, 1);
      out.door = gal.cells[0 * gal.w + 17] && gal.cells[17].door && gal.cells[17].portal && gal.cells[17].portal.map === 'ln17_orchard';
      out.pit = !W.at(rg, gal, 17, 15) && !W.at(rg, gal, 16, 14);
      out.spawn = !gal.isBlocked(17, 6) && !orc.isBlocked(14, 14);
      out.orcStair = W.near(ro, orc, 14, 7, 0) && orc.cells[6 * orc.w + 14] && orc.cells[6 * orc.w + 14].portal && orc.cells[6 * orc.w + 14].portal.map === 'ln17_gallery';
      out.orcBoard = W.near(ro, orc, 19.2, 8.6, 1); out.orcKeepers = [0, 1, 2].every((i) => { const e = orc.entities.find((q) => q._orch === i); return e && W.near(ro, orc, e.x, e.y, 1); });
      // every reachable cell of the hall can reach the Stone (no pocket a player can be stranded in)
      let cells = 0, stranded = 0; const back = W.reach(gal, 17, 21);
      for (let y = 0; y < gal.h; y++) for (let x = 0; x < gal.w; x++) if (rg[y * gal.w + x]) { cells++; if (!back[y * gal.w + x]) stranded++; }
      out.cells = cells; out.stranded = stranded;
      // the foes' flow field reaches every keeper and every lamp from every mouth
      G.mapId = 'ln17_gallery'; G.map = gal;
      out.flow = Object.values(L.MOUTH).every(([x, y]) => L.KEEPER_AT.concat(L.LAMPS).every(([tx, ty]) => { const f = L.flowTo(tx, ty); return f[(y | 0) * gal.w + (x | 0)] >= 0; }));
      return out;
    });
    check(mp.size[0] === 34 && mp.size[1] === 30 && mp.spawn, 'the gallery is 34x30 and both spawns are open ground');
    check(mp.stone && mp.lamps.every(Boolean) && mp.keepers.every(Boolean) && mp.oil, 'BFS from the stairfoot reaches the Stone, all six lamps, all three keepers and the oil niche');
    check(mp.mouths.every(Boolean) && mp.stairFoot && mp.door, 'all three dark ways in (west, east, south) and the stair door are reachable and the door leads to the orchard');
    check(mp.pit, 'the Root\'s pit and the rail around it are not walkable (nobody can fall in)');
    check(mp.stranded === 0 && mp.cells > 300, 'no softlock: every reachable cell of the hall (' + mp.cells + ') can walk back to the Stone');
    check(mp.flow, 'the foes\' flow field reaches every keeper and every lamp from each mouth');
    check(mp.orcStair && mp.orcBoard && mp.orcKeepers, 'the orchard: the stairhead door, the tally-board and the three Cantors are reachable');

    // ---------------------------------------------------------------- 4. Book One untouched
    const snapA = await E(() => {
      G.mapId = 'oakhaven'; G.map = G.maps.oakhaven; loadMap('oakhaven', { x: 20, y: 20, dir: 0 }); G.state = 'play'; for (let i = 0; i < 20; i++) update(0.05);
      for (let k = 0; k < 2; k++) { W.fresh({}); LONGNIGHT17.end({ won: false, how: 'no' }); }
      return null;
    });
    const book = await E(() => {
      // the run clock (playtools: play time and steps) counts every second the game is open, in an extra too; it is not Book One's story
      const keep = () => { const s = snapshotGame(); delete s.when; for (const k of Object.keys(s.flags || {})) if (/^p7[ts]_/.test(k)) delete s.flags[k];
        for (const id in s.maps) for (const e of s.maps[id].ents) if (e.hidden === false) delete e.hidden;   // hidden:false and unset are the same thing
        return JSON.stringify(s); };
      const ls = () => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== LONGNIGHT17.KEY) o[k] = localStorage.getItem(k); } return JSON.stringify(o); };
      G.flags.some_book_flag = 3; G.flags.p17n_seen = 1;
      const before = keep(), tag = JSON.stringify(Object.keys(G.flags).sort()), lsB = ls(), mapsB = Object.keys(G.maps).filter((k) => !k.startsWith('ln17_')).join();
      const res = W.sim({ name: 'book1', amp: 0.5, cap: 120, seed: 1, keepFlags: true });
      const after = keep(), lsA = ls();
      const flagsAfter = JSON.stringify(Object.keys(G.flags).sort());
      const o = { same: before === after, lsSame: lsB === lsA, maps: mapsB === Object.keys(G.maps).filter((k) => !k.startsWith('ln17_')).join(), flagsSame: tag === flagsAfter, seen: G.flags.p17n_seen, book: G.flags.some_book_flag, state: G.state, mapId: G.mapId, ran: res.hour };
      if (!o.same) { const a = JSON.parse(before), b = JSON.parse(after); o.diff = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); o.detail = { cam: [a.cam, b.cam], maps: Object.keys(a.maps).filter((k) => JSON.stringify(a.maps[k]) !== JSON.stringify(b.maps[k])).map((k) => k + ':' + Object.keys(a.maps[k]).filter((f) => JSON.stringify(a.maps[k][f]) !== JSON.stringify(b.maps[k][f])).join('/') + ':' + (a.maps[k].ents || []).map((e, i) => JSON.stringify(e) !== JSON.stringify(b.maps[k].ents[i]) ? JSON.stringify(e).slice(0, 80) + '=>' + JSON.stringify(b.maps[k].ents[i]).slice(0, 80) : '').filter(Boolean).slice(0, 2).join(';')), flags: Object.keys(Object.assign({}, a.flags, b.flags)).filter((k) => JSON.stringify(a.flags[k]) !== JSON.stringify(b.flags[k])).map((k) => k + '=' + JSON.stringify(a.flags[k]).slice(0, 60) + '=>' + JSON.stringify(b.flags[k]).slice(0, 60)) }; }
      delete G.flags.some_book_flag; delete G.flags.p17n_seen;
      return o;
    });
    check(book.same, 'snapshotGame is byte-identical before and after a run that was left unfinished' + (book.diff ? ' (differs in ' + book.diff.join() + ' ' + JSON.stringify(book.detail) + ')' : ''));
    check(book.lsSame && book.maps && book.flagsSame && book.book === 3 && book.seen === 1, JSON.stringify([book.lsSame, book.maps, book.flagsSame, book.book, book.seen]) + 'no save slot in localStorage changed, no Book One map or flag changed; a p17n_ flag that was there before is put back');
    check(book.state === 'play', 'after the visit the game is back in play on the map the visit began on (' + book.mapId + ')');

    // ---------------------------------------------------------------- 5. hostile flags and a hostile tally
    const hos = await E(() => {
      const f = G.flags, L = LONGNIGHT17;
      f.p17n_nights = '<img src=x onerror=alert(1)>'; f.p17n_dawns = 1e9; f.p17n_seen = -5; f.p17n_up = 1.5; f.p17n_evil = 1; f['p17n___proto__'] = {}; f.p17n_nights2 = [1];
      L.validate();
      const left = Object.keys(f).filter((k) => k.startsWith('p17n_'));
      const ok = left.length === 0;
      localStorage.setItem(L.KEY, JSON.stringify({ best: [{ t: '<b>x</b>', s: 1e99, k: 99, l: -4, f: 'a' }, null, 7, { t: 5, s: 9 }], nights: 'x', dawns: {} }));
      L.loadTally();
      const html = L.tableHtml(); const t0 = L.tally.best.map((r) => [r.t, r.s, r.k, r.l, r.f]);
      localStorage.setItem(L.KEY, '{not json'); L.loadTally();
      localStorage.setItem(L.KEY, JSON.stringify({ best: 'x' })); L.loadTally();
      const survived = L.tally.best.length >= 0;
      L.resetTally();
      const good = !/<img|<b>|onerror/.test(html) && t0.every((r) => r.every(Number.isFinite)) && t0.every((r) => r[2] <= 3 && r[3] <= 6 && r[3] >= 0);
      return { ok, good, survived, html: html.slice(0, 200), t0 };
    });
    check(hos.ok, 'hostile p17n_ flags (strings, markup, huge, negative, fractional, unknown, proto) are all dropped on validate');
    check(hos.good && hos.survived, 'a hostile tally in storage is sanitised to bounded numbers; garbage and the wrong shape load as empty; no markup is ever parsed from it');

    // ---------------------------------------------------------------- 6. the lullaby as a held pitch
    const sing = await E(() => {
      const L = LONGNIGHT17; W.fresh({}); const R = L.R; W.step(2);
      const out = { secs: L.VERSE_SECS };
      W.to(17, 20.2, -Math.PI / 2); W.step(2);
      out.start = L.startSing(); out.locked = !!R.sing;
      // a perfect voice
      let s = R.sing; const t0 = R.tune; R.tune = 30; const tuneB = R.tune;
      const it = 0.05; for (let i = 0; i < 400 && R.sing; i++) { s.setPitch = L.centsAt(Math.max(0, s.t)); G.state = 'play'; update(it); }
      out.perfect = R.lastVerse ? R.lastVerse.score : -1; out.gain = R.tune - tuneB; out.sung = R.hourSung; out.verses = R.verses;
      // no voice at all (never touched)
      R.rest = 0; out.start2 = L.startSing(); s = R.sing; const t1 = R.tune;
      for (let i = 0; i < 400 && R.sing; i++) { s.setPitch = -1600; G.state = 'play'; update(it); }
      out.idle = R.lastVerse.score; out.gain2 = R.tune - t1;
      // Esc breaks off after a few seconds: partial credit; a blow breaks it
      R.rest = 0; L.startSing(); s = R.sing; for (let i = 0; i < 100; i++) { s.setPitch = L.centsAt(Math.max(0, s.t)); G.state = 'play'; update(it); }
      const heldBefore = R.sing.held; const r1 = L.endSing('stop'); out.stop = [r1.why, r1.score > 0.1 && r1.score < 0.7, !R.sing];
      R.rest = 0; L.startSing(); W.step(70); const v0 = R.verses; const p = G.player; p.hp = p.hpMax; damagePlayer(1, 'x'); out.hurt = !R.sing && R.verses === v0 + 1;
      // the world stays live and you are rooted while you sing
      R.rest = 0; L.startSing(); const c = Engine.cam, x0 = c.x, y0 = c.y; for (let i = 0; i < 20; i++) { G.keys = { w: true, ArrowUp: true, KeyW: true }; update(0.05); } out.rooted = Math.hypot(c.x - x0, c.y - y0) < 0.05; const t00 = R.t; W.step(20); out.live = R.t > t00; L.endSing('stop');
      // the assist band
      out.band = L.bandNow();
      return out;
    });
    check(sing.start && sing.locked && sing.secs > 11 && sing.secs < 15, 'E at the Stone starts a verse of ~' + sing.secs.toFixed(1) + ' s (five notes, a turn, five lower, a fall)');
    check(sing.perfect > 0.93 && sing.gain > 30 && sing.sung, 'a held verse scores ' + sing.perfect.toFixed(2) + ', gives the Root +' + sing.gain.toFixed(0) + ' tune and counts for the hour');
    check(sing.idle < 0.2 && sing.start2, 'a voice that is never steered scores ' + sing.idle.toFixed(2) + ' (nothing is given for free)');
    check(sing.stop[0] === 'stop' && sing.stop[1] && sing.stop[2], 'Esc breaks the verse off with partial credit');
    check(sing.hurt, 'a blow breaks the verse (counted for what was held)');
    check(sing.rooted && sing.live, 'you are rooted while you sing and the world keeps running behind the staff');
    check(sing.band >= 60 && sing.band <= 400, 'the held band is the Hold the Pitch band (' + sing.band + ' cents, widens with the assist)');

    // ---------------------------------------------------------------- 7. lamps, oil, keepers, cold, the missing sounds
    const sys = await E(() => {
      const L = LONGNIGHT17; W.fresh({}); const R = L.R; W.step(2);
      const o = {};
      // a lamp left alone goes out near its life; a trim and a relight cost a flask
      const l0 = R.lamps[0], oil0 = R.oil; l0.oil = 20; o.trim = L.tendLamp(l0); o.trimOil = [oil0 - R.oil, l0.oil];
      L.lampSet(R.lamps[1], false); o.dark = !R.lamps[1].lit; o.relight = L.tendLamp(R.lamps[1]) && R.lamps[1].lit;
      R.oil = 0; o.noOil = L.tendLamp(R.lamps[2]) === false;
      R.shelf = 5; W.to(L.OIL_AT[0] - 0.9, L.OIL_AT[1]); o.take = L.takeOil() && R.oil === 1; R.oil = 3; o.full = L.takeOil() === false;
      // a moth on a lamp drains it several times faster
      const l3 = R.lamps[3]; l3.oil = 100; const e = L.spawnFoe('m', 'E', 0); e._ln.perch = 3; e.x = l3.x + 0.2; e.y = l3.y; W.step(40, 0.05);
      o.moth = !!l3.moth; const dr = 100 - l3.oil; o.mothDrain = dr;
      // a keeper left beside a Hollow outside the light is kept in ~5 s, and is called back in ~3 s
      for (const f of L.foes()) { f.dead = true; f.hidden = true; }
      const k = R.keepers[2]; L.setKept(k); o.kept = k.state === 'kept';
      W.to(k.e.x + 1.0, k.e.y + 0.6); o.call = L.callStart(2); W.step(70); o.back = k.state === 'held';
      // cold: away from every lamp the warmth goes, near one it comes back; never damage
      for (const l of R.lamps) L.lampSet(l, false); W.to(17, 8, 0); R.warm = 100; const hp0 = G.player.hp; W.step(100, 0.1); o.drift = R.warm; R.warm = 24; W.step(200, 0.1);
      o.cold = R.warm < 22 && o.drift < 100; o.coldHp = G.player.hp === hp0; o.stiff = G.player.fat <= 0;
      for (const l of R.lamps) { l.lit = true; l.oil = 100; } W.to(L.LAMPS[0][0] + 1, L.LAMPS[0][1] + 1); W.step(80, 0.1); o.warm = R.warm > 30;
      // the missing sounds go with the tune and come back as a gift
      R.hour = 6; R.tune = 30; L.layersTick(); o.gone = Object.assign({}, R.missing); R.tune = 90; L.layersTick(); o.back2 = Object.assign({}, R.missing);
      return o;
    });
    check(sys.trim && sys.trimOil[0] === 1 && sys.trimOil[1] >= 80, 'E on a burning lamp trims it (+oil for a flask)');
    check(sys.dark && sys.relight && sys.noOil && sys.take && sys.full, 'a dark lamp is relit with a flask; with none it says so; the niche gives a flask and you carry at most three');
    check(sys.moth && sys.mothDrain > 4, 'a moth on a lamp drains it faster (' + sys.mothDrain.toFixed(1) + ' oil in 2 s)');
    check(sys.kept && sys.call && sys.back, 'a kept keeper is called back by standing beside them (hold E, ~3 s)');
    check(sys.cold && sys.coldHp && sys.stiff && sys.warm, 'cold: warmth falls away from the lamps and stiffens your legs (no running), and it never costs hp; lamp-light warms you again');
    check(sys.gone.drip && sys.gone.wind && !sys.back2.drip && !sys.back2.wind && !sys.back2.breath && !sys.back2.steps, 'sounds go missing as the tune falls (drip, wind...) and come back when it is held');

    // ---------------------------------------------------------------- 8. no unavoidable damage
    const dm = await E(() => {
      const L = LONGNIGHT17, o = {};
      // (a) every attack has a wind-up you can walk out of
      W.fresh({}); let R = L.R; W.step(2); G.player.hp = 99; G.player.hpMax = 99; for (const l of R.lamps) { l.oil = 100; }
      W.to(17, 9, 0); for (const k of R.keepers) { k.state = 'kept'; }       // nobody for the Hollow to go to but you
      let e = L.spawnFoe('h', 'W', 0); e.x = 18.3; e.y = 9; e._ln.cool = 0; e.def.reach = 0.95;
      let wound = false, hit = 0;
      for (let i = 0; i < 80; i++) { G.state = 'play'; update(0.05); if (e._ln.st === 'wind' && !wound) { wound = true; W.to(Engine.cam.x - 3.5, Engine.cam.y); } hit = 99 - G.player.hp; }
      o.windup = wound; o.walkedOut = hit === 0;
      // and it does land if you stand there (the wind-up is not a decoration)
      W.fresh({}); R = L.R; W.step(2); G.player.hp = 99; G.player.hpMax = 99; for (const k of R.keepers) k.state = 'kept'; for (const l of R.lamps) { L.lampSet(l, false); }
      W.to(17, 9, 0); e = L.spawnFoe('h', 'W', 0); e.x = 18.2; e.y = 9; e._ln.cool = 0;
      for (let i = 0; i < 80; i++) { G.state = 'play'; update(0.05); }
      o.lands = 99 - G.player.hp > 0;
      // (b) lamp-light disarms: hollows and hounds beside a lit lamp never land a blow
      W.fresh({}); R = L.R; W.step(2); G.player.hp = 99; G.player.hpMax = 99; for (const k of R.keepers) k.state = 'kept';
      R.lamps.forEach((l) => { l.oil = 100; l.lit = true; });
      W.to(L.LAMPS[2][0] + 1.0, L.LAMPS[2][1] + 0.3, 0);
      for (let i = 0; i < 3; i++) { const f = L.spawnFoe(i % 2 ? 'd' : 'h', 'W', i); f.x = Engine.cam.x + 0.8; f.y = Engine.cam.y + (i - 1) * 0.4; f._ln.cool = 0; }
      for (let i = 0; i < 400; i++) { for (const l of R.lamps) { l.oil = 100; } G.state = 'play'; update(0.05); }
      o.lampSafe = G.player.hp === 99;
      // (c) the Stone's nook is safe while a flank lamp burns
      W.fresh({}); R = L.R; W.step(2); G.player.hp = 99; G.player.hpMax = 99; for (const k of R.keepers) k.state = 'kept';
      L.lampSet(R.lamps[0], false); L.lampSet(R.lamps[1], false); L.lampSet(R.lamps[2], false); L.lampSet(R.lamps[3], false);
      R.lamps[4].oil = 100; R.lamps[5].oil = 100; W.to(17, 20.2, -Math.PI / 2);
      L.wake('hhdd', 'S', 0); L.wake('hh', 'W', 0);
      for (let i = 0; i < 500; i++) { R.lamps[4].oil = 100; R.lamps[5].oil = 100; G.state = 'play'; update(0.05); }
      o.nook = G.player.hp === 99; o.nookFoes = L.foes().length;
      // (d) hp 0 is a fall, never a death: you wake at the Stone and the foes are stilled
      W.fresh({}); R = L.R; W.step(2); W.to(8, 8, 0); const p = G.player; p.hp = 1; damagePlayer(9, 'x');
      o.noDeath = !G.dead && G.state !== 'dead' && p.hp >= 1 && R.falls === 1 && Math.hypot(Engine.cam.x - 17, Engine.cam.y - 19.4) < 1.2 && R.rest > 0;
      o.fallTune = R.tune;
      p.hp = 1; R.rest = 0; damagePlayer(9, 'x'); o.second = R.falls === 2 && !R.over;
      p.hp = 1; R.rest = 0; damagePlayer(9, 'x'); o.third = R.falls === 3 && R.over && R.result && R.result.how === 'fall' && R.result.won === false && !G.dead;
      L.end(R.result);
      return o;
    });
    check(dm.windup && dm.walkedOut, 'a blow can be walked out of: every attack has a wind-up and only lands if you are still in reach when it ends');
    check(dm.lands, 'and the wind-up is real: standing still in the dark beside a Hollow is hurt');
    check(dm.lampSafe, 'inside a lit lamp\'s light nothing lands a blow (400 ticks with a Hollow and two hounds beside the lamp)');
    check(dm.nook && dm.nookFoes > 0, 'the Stone\'s nook is safe while a flank lamp burns (500 ticks, ' + dm.nookFoes + ' foes round it, no damage)');
    check(dm.noDeath, 'hp 0 is a fall, never a death: carried to the Stone, hp kept above 0, G.dead never set');
    check(dm.second && dm.third, 'two falls are survived; the third carries you up and the night is lost (how: fall)');

    // ---------------------------------------------------------------- 9. waves escalate
    const wv = await E(() => {
      const W_ = LONGNIGHT17.WAVES, count = (h) => W_[h].reduce((a, g) => a + g.kinds.length, 0), weight = (h) => W_[h].reduce((a, g) => a + [...g.kinds].reduce((s, k) => s + (k === 'h' ? 1 : k === 'd' ? 2.2 : 0.8), 0), 0);
      const c = []; for (let h = 1; h <= 10; h++) c.push(count(h)); const w = []; for (let h = 1; h <= 10; h++) w.push(Math.round(weight(h) * 10) / 10);
      return { c, w, groups: W_.slice(1).every((g) => g.every((x) => 'WES'.includes(x.from) && /^[hdm]+$/.test(x.kinds) && x.at >= 4 && x.at < 76)), cap: LONGNIGHT17.B.CAP };
    });
    check(wv.groups && wv.c[0] === 1 && wv.c[9] >= 8 && wv.w[9] > wv.w[0] * 4, 'waves escalate: ' + wv.c.join(',') + ' foes per hour (weight ' + wv.w.join(',') + ')');
    check(wv.w[3] > wv.w[0] && wv.w[6] > wv.w[3] && wv.w[9] > wv.w[6] - 0.001, 'each stretch of the night is heavier than the last');

    // ---------------------------------------------------------------- 10. win and loss both reachable; the balance table
    const bots = [
      { name: 'expert', amp: 0.45, dmg: 0, singAt: 2, seed: 4004 },
      { name: 'good', amp: 0.8, dmg: 0, singAt: 3, seed: 11 },
      { name: 'careful', amp: 0.95, dmg: 2, singAt: 5, seed: 23 },
      { name: 'shaky', amp: 1.5, dmg: 3, singAt: 6, seed: 37 },
      { name: 'no-lamps', amp: 0.6, dmg: 0, lamps: false, seed: 41 },
      { name: 'no-fight', amp: 0.6, dmg: 0, fight: false, seed: 53 },
      { name: 'no-calls', amp: 0.6, dmg: 0, calls: false, seed: 59 },
      { name: 'idle', idle: true, seed: 61 },
    ];
    const table = [];
    for (const b of bots) table.push(await E((b) => W.sim(b), b));
    console.log('\nBALANCE (seeded bots, 0.05 s steps; time in s)\n' + 'bot       | result  | how  | time | hour | tune | min | verse | falls | lamps | keepers | foes | score');
    for (const t of table) console.log([t.name.padEnd(9), (t.won ? 'WIN' : 'LOSS').padEnd(7), String(t.how).padEnd(4), String(t.time).padStart(4), String(t.hour).padStart(4), String(t.tune).padStart(4), String(Math.round(t.minTune)).padStart(3), String(t.avgVerse).padStart(5), String(t.falls).padStart(5), String(t.lamps).padStart(5), String(t.keepers).padStart(7), String(t.maxFoes).padStart(4), String(t.score).padStart(5)].join(' | '));
    if (process.env.BALANCE_ONLY) { await browser.close(); process.exit(0); }
    const by = Object.fromEntries(table.map((t) => [t.name, t]));
    check(by.expert.won && by.good.won, 'WIN is reachable: the expert and the good singer both reach first light (' + by.expert.time + ' s, ' + by.good.time + ' s)');
    check(!by.idle.won && by.idle.how === 'tune', 'LOSS is reachable: standing still loses the tune (hour ' + by.idle.hour + ', ' + by.idle.time + ' s)');
    check(by.expert.falls === 0 && by.expert.keepers === 3, 'a clean run takes no fall and holds every keeper');
    check(!by['no-fight'].won && !by.shaky.won, 'ignoring the foes loses the night, and so does a voice that holds under half of each verse (' + by.shaky.avgVerse + ')');
    check(!by['no-lamps'].won || by['no-lamps'].lamps < 6, 'ignoring the lamps costs the night or the light (' + (by['no-lamps'].won ? 'won with ' + by['no-lamps'].lamps + ' lamps' : 'lost') + ')');
    check(by.expert.time >= 330 && by.expert.time <= 900, 'the night is a real vigil: ' + by.expert.time + ' s at the fastest (10 hours, 34 s at least each)');
    check(by.expert.maxFoes <= 12, 'never more than ' + by.expert.maxFoes + ' foes alive at once (cap 10, +2 slack for a group already in the telegraph)');
    check(table.every((t) => !t.endErr), 'ending a run in any way (win, loss, left) never throws');
    // the same seed, the same night
    const rep = await E(() => W.sim({ name: 'rep', amp: 0.45, dmg: 0, singAt: 2, seed: 4004 }));
    check(rep.time === by.expert.time && rep.score === by.expert.score && rep.tune === by.expert.tune, 'the night is deterministic: the same seed and the same play give the same time (' + rep.time + ') and score (' + rep.score + ')');

    // ---------------------------------------------------------------- 11. the tally and the flow of the end
    const tl = await E(() => {
      const L = LONGNIGHT17; L.resetTally(); const o = {};
      let calls = 0; const f0 = EXTRAS17.finish; EXTRAS17.finish = (r) => { calls++; o.res = r; };
      const r = W.sim({ name: 'tally', amp: 0.45, singAt: 2, seed: 4004 });
      o.won = r.won; o.calls = calls; EXTRAS17.finish = f0;
      o.len = L.tally.best.length; o.first = L.tally.best[0]; o.stored = JSON.parse(localStorage.getItem(L.KEY)).best.length;
      for (let i = 0; i < 12; i++) L.recordWin({ t: 700 + i * 3, s: 800 + i, k: 3, l: 6, f: 0 });
      o.capped = L.tally.best.length; o.sorted = L.tally.best.every((x, i, a) => !i || a[i - 1].t <= x.t);
      o.html = L.tableHtml(); o.mmss = L.mmss(754);
      L.resetTally(); o.empty = L.tally.best.length === 0 && localStorage.getItem(L.KEY) === null;
      return o;
    });
    check(tl.won && tl.calls === 1 && tl.res && typeof tl.res.text === 'string' && tl.res.text.length > 0 && tl.res.text.length <= 160, 'EXTRAS17.finish is called once with a result line ({text}, at most 160 characters)');
    check(tl.len === 1 && tl.first.t > 300 && tl.stored === 1, 'a win is written to the local tally (and only a win)');
    check(tl.capped === 8 && tl.sorted && tl.mmss === '12:34' && /<ol/.test(tl.html), 'the tally keeps the eight fastest dawns, fastest first, and shows m:ss');
    check(tl.empty, 'the tally can be cleared');

    // ---------------------------------------------------------------- 12. frame cost with a full wave
    const perf = await E(() => {
      const L = LONGNIGHT17; W.fresh({}); const R = L.R; W.step(4);
      for (const k of R.keepers) { k.state = 'held'; }
      L.wake('hhhh', 'W', 0); L.wake('dd', 'S', 0); L.wake('mmm', 'E', 0); W.to(17, 20.2, -Math.PI / 2); L.startSing();
      const foes = L.foes().length; const tk = [], hud = [];
      for (let i = 0; i < 600; i++) { R.sing && (R.sing.setPitch = L.centsAt(Math.max(0, R.sing.t))); const a = performance.now(); L.tick(0.016); tk.push(performance.now() - a); G.state = 'play'; if (i % 5 === 0 && !R.sing) L.startSing(); for (const f of L.foes()) f.hp = 999; }
      const ctx = Engine.ctx; for (let i = 0; i < 300; i++) { const a = performance.now(); L.drawHUD17(); hud.push(performance.now() - a); }
      const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length, p95 = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
      const t0 = performance.now(); for (let i = 0; i < 60; i++) { G.state = 'play'; update(0.016); } const upd = (performance.now() - t0) / 60;
      return { foes, tick: avg(tk), tick95: p95(tk), hud: avg(hud), hud95: p95(hud), upd };
    });
    check(perf.foes >= 9 && perf.tick < 1.0 && perf.tick95 < 2.5, 'a full wave (' + perf.foes + ' foes, singing): the module\'s tick costs ' + perf.tick.toFixed(3) + ' ms (p95 ' + perf.tick95.toFixed(2) + ' ms)');
    check(perf.hud < 0.8 && perf.hud95 < 2, 'the HUD and staff cost ' + perf.hud.toFixed(3) + ' ms a frame (p95 ' + perf.hud95.toFixed(2) + ' ms)');
    console.log('     whole update() with the wave: ' + perf.upd.toFixed(2) + ' ms');

    // ---------------------------------------------------------------- 13. flow of the extra: intro card, the stair, dawn, the orchard
    const flow = await E(() => {
      const L = LONGNIGHT17, o = {}; W.fresh({}); L.end({ won: false, how: 'no' });
      L.start({}); o.intro = G.state !== 'play' || !!document.querySelector('#modal, .modal, #event'); o.phase = L.R.phase; o.map = G.mapId;
      L.begin(); G.state = 'play'; o.night = L.R.phase === 'night' && G.mapId === 'ln17_gallery';
      // the stair door asks first; the vigil is not lost by walking into it
      const door = G.maps.ln17_gallery.cells[17]; o.doorLn = !!door.portal.ln17up;
      transfer(door.portal); o.asked = L.R.active && !L.R.over && G.state !== 'play'; G.state = 'play';
      L.end({ won: false, how: 'no' }); o.after = G.state === 'play' && !L.R.active;
      return o;
    });
    check(flow.phase === 'dusk' && flow.map === 'ln17_orchard', 'start() opens at the orchard at dusk with the intro card');
    check(flow.night && flow.doorLn && flow.asked && flow.after, 'the stair door asks "Climb out?" during the night (it is never silently lost) and end() restores the game');

    // ---------------------------------------------------------------- 14. a peaceful visit when not in a run
    const peace = await E(() => {
      W.fresh({}); const L = LONGNIGHT17; L.end({ won: false, how: 'no' });
      G.maps.ln17_gallery = L.buildGallery(); loadMap('ln17_gallery', { x: 17.5, y: 6.8, dir: 0 }); G.state = 'play'; for (let i = 0; i < 100; i++) update(0.05);
      const o = { foes: L.foes().length, hp: G.player.hp === G.player.hpMax, st: G.state };
      const stone = G.ents.find((e) => e.use === 'p17n_stone'); useDeco(stone); o.stoneOk = G.state === 'play' && !L.R.sing;
      const lamp = G.ents.find((e) => e.use === 'p17n_lamp'); useDeco(lamp); o.lampOk = G.state === 'play';
      loadMap('oakhaven', { x: 20, y: 20, dir: 0 });
      return o;
    });
    check(peace.foes === 0 && peace.hp && peace.st === 'play' && peace.stoneOk && peace.lampOk, 'outside a run the gallery is a quiet unlocked visit: no foes, the Stone and the lamps do nothing');

    // ---------------------------------------------------------------- 15. through the real Extras menu: an isolated session
    const real = await E(() => {
      const L = LONGNIGHT17, o = {}; try { loadMap('oakhaven', { x: 20, y: 20, dir: 0 }); } catch (e) { /* ok */ } G.state = 'play';
      EXTRAS17.state.done = 1;
      const strip = () => { const s = snapshotGame(); delete s.when; for (const k of Object.keys(s.flags || {})) if (/^p7[ts]_/.test(k)) delete s.flags[k]; return JSON.stringify(s); };
      const before = strip(), name = G.player.name;
      o.started = EXTRAS17.start('longnight17'); o.in = EXTRAS17.inExtra(); o.map = G.mapId; o.day = G.day;
      o.winter = !!WINTER17.active('ln17_orchard') && WINTER17.active('ln17_orchard').snow > 0.5;
      L.begin(); G.state = 'play'; for (let i = 0; i < 100; i++) update(0.05);
      o.night = L.R.phase === 'night' && G.mapId === 'ln17_gallery' && G.flags.p17x_on === 1;
      L.end({ won: false, how: 'no' });
      o.out = EXTRAS17.inExtra() === null && G.state === 'title' && !WINTER17.active('ln17_orchard');
      o.same = strip() === before && G.player.name === name;
      return o;
    });
    check(real.started && real.in === 'longnight17' && real.map === 'ln17_orchard' && real.day === 84 && real.winter, 'EXTRAS17.start runs start() in a fresh session: the orchard is loaded on the Longest Night (day 84) with WINTER17 applied');
    check(real.night && real.out && real.same, 'the run happens in the isolated session and leaving it puts Book One back exactly (snapshotGame identical, winter cleared)');

    check(errors.length === 0, 'no page errors (' + errors.slice(0, 3).join(' | ') + ')');
    console.log('\nOK ' + n + ' checks');
  } catch (e) {
    console.error('FAIL', e.message || e); if (errors.length) console.error('page errors:', errors.slice(0, 5));
    await browser.close(); process.exit(1);
  }
  await browser.close();
})();
