// PREVIEW_URL=http://127.0.0.1:4052 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/sync19.test.js
// Phase 19 SYNC: the host-authoritative shared world. Two browser contexts (host + guest) joined by a LOCAL loopback
// transport (this test relays the messages between the pages; nothing touches the PeerJS broker or the internet).
// Checks: single-player byte-identical with nobody connected (seeded trace, save code, frame hash vs a page with
// js/sync19.js blocked); join; the guest's movement predicted at once and reconciled to the host; the host's RNG
// untouched by the guest's movement; the guest follows the host across a map change and cannot leave alone;
// snapshots bounded (bytes, entities, < 20 KB/s to the guest in a 30-enemy scene); untrusted input rejected on both
// sides; the guest gets its own world back byte-identical on leaving; a phone guest (devices['iPhone 14'], touch)
// joins from the title screen and walks with the touch stick; no page errors. Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = (process.env.PREVIEW_URL || 'http://127.0.0.1:4052') + '/?nosw=1';
const SHOTS = process.env.SHOTS_DIR || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0;
const ok = (cond, text) => { assert.ok(cond, text); passed++; console.log('PASS ' + text); };

// The REAL NET19 (team NET) carries the session; only its link is this test's: an injected transport whose frames this
// script relays between the two browser contexts (NET19's injected-transport hook: { name, listen, connect, close }).
// Every frame still goes through NET19's framing, define() specs, sender-role, size and rate checks on both sides.
const RELAY = `(() => {
  const links = new Map(); let onLinkFn = null, waiting = null, n = 0;
  const mk = (id) => { const l = { unreliable: false, open: true, onmessage: null, onclose: null };
    l.send = (s, r) => { if (!l.open) return false; window.__p19send(JSON.stringify({ k: 'm', id, d: s, r: r !== false })); return true; };
    l.close = () => { if (!l.open) return; l.open = false; window.__p19send(JSON.stringify({ k: 'x', id })); setTimeout(() => { if (l.onclose) l.onclose(); }, 0); };
    links.set(id, l); return l; };
  window.__p19deliver = (str) => {
    const m = JSON.parse(str);
    if (m.k === 'knock' && onLinkFn) { const l = mk(m.id); window.__p19send(JSON.stringify({ k: 'accept', id: m.id })); onLinkFn(l); }
    else if (m.k === 'accept' && waiting && waiting.id === m.id) { const w = waiting; waiting = null; w.res(mk(m.id)); }
    else if (m.k === 'm') { const l = links.get(m.id); if (l && l.open && l.onmessage) l.onmessage(m.d, m.r); }
    else if (m.k === 'x') { const l = links.get(m.id); if (l && l.open) { l.open = false; if (l.onclose) l.onclose(); } }
  };
  window.__relayT = () => ({
    name: 'relay',
    listen(code, onLink) { onLinkFn = onLink; return Promise.resolve({ code }); },
    // (an unanswered knock fails after 1.5 s: NET19 only retries a reconnect once the last attempt has settled)
    connect(code) { return new Promise((res, rej) => { const id = 'L' + (++n) + '-' + Date.now(); waiting = { id, res }; window.__p19send(JSON.stringify({ k: 'knock', id })); setTimeout(() => { if (waiting && waiting.id === id) { waiting = null; const e = new Error('no answer'); e.code = 'timeout'; rej(e); } }, 1500); }); },
    close() { onLinkFn = null; for (const l of links.values()) l.close(); },
  });
})();`;

class Relay {
  constructor() { this.pages = {}; this.lat = 0; this.cut = false; }
  from(name, s) {
    if (this.cut) return;
    const to = name === 'host' ? 'guest' : 'host', p = this.pages[to]; if (!p) return;
    const go = () => { if (!this.cut) p.evaluate((m) => window.__p19deliver && window.__p19deliver(m), s).catch(() => { }); };
    if (this.lat) setTimeout(go, this.lat); else go();
  }
}
const NETCFG = { heartbeatMs: 300, lostMs: 1500, reconnectMs: 400, giveUpMs: 60000, joinTimeoutMs: 15000, iceServers: [] };

async function open(browser, relay, name, ctxOpts, block) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 }, hasTouch: true }, ctxOpts || {}));
  await ctx.addInitScript(RELAY);
  if (block) await ctx.route(/js\/sync19\.js/, (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && /sync19/i.test(m.text()))) errors.push(name + ' console: ' + m.text()); });
  await page.exposeBinding('__p19send', (src, s) => relay.from(name, s));
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on') && G.state === 'title');
  await page.evaluate((c) => NET19.configure(c), NETCFG);
  relay.pages[name] = page;
  return { ctx, page, errors };
}
async function newGame(page, who) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(who);
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play' && G.map);
  await page.waitForTimeout(300);
}
// a deterministic stage and a seeded trace (the loop is stopped so only this script steps the world)
const TRACE = () => {
  window.__seed = (n) => { let s = n || 777; Math.random = () => { window.__rc++; if (window.__rlog) window.__rlog.push((new Error().stack.split('\n')[2] || '').replace(/^.*\/js\//, '').replace(/\?v=\d+/, '').slice(0, 90)); return (s = (s * 16807) % 2147483647) / 2147483647; }; };
  window.__stopLoop = () => { if (!window.__raf) window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; };
  window.__startLoop = () => { window.requestAnimationFrame = window.__raf; requestAnimationFrame(frame); };
  window.__stage = () => {
    __freeze(); __seed(4242); window.__rc = 0;
    if (typeof UPG !== 'undefined') UPG._ambT = 4;   // the ambience timer survives from before the stage
    G.maps = buildAllMaps(); G.flags = {}; G.tod = 0.5; G.day = 1; G.time = 0; G.noise = 2; G.keys = {}; G.vel.x = G.vel.y = 0; G.turnV = 0;
    G.attack.t = 0; G.song.t = 0; G.hurtT = 0; G.escapeTimer = 0; G.rootWard = 0; G.glassLock = 0;
    if (typeof Weather !== 'undefined') Weather.load({ s: 'clear', left: 5 });
    G.player.hp = G.player.hpMax = 9999; G.player.fat = G.player.fatMax; G.player.voice = G.player.voiceMax;
    loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
    for (const [t, x, y] of [['hound', 12.5, 7.5], ['hound', 14.5, 8.5], ['proctor', 10.5, 8.5]]) { const e = hydrate({ kind: 'enemy', type: t, x, y }); e.state = 'chase'; e.alertT = 99; G.ents.push(e); }
    __thaw();
  };
  // real time is frozen while the script steps the world (the game's own modules read the clock), and thawed after
  window.__freeze = (t) => { if (!window.__realNow) { window.__realNow = performance.now.bind(performance); window.__realDate = Date.now; } const v = t == null ? window.__realNow() : t; performance.now = () => v; Date.now = () => 1700000000000 + Math.floor(v); };
  window.__thaw = () => { if (window.__realNow) { performance.now = window.__realNow; Date.now = window.__realDate; } };
  window.__trace = (from, to) => {
    __freeze(); try {
    for (let i = from; i < to; i++) {
      __seed(1000 + i);
      Engine.cam.dir = -Math.PI / 2 + Math.sin(i / 40) * 0.5;
      update(1 / 60);
      if (i % 30 === 0) attack('slash right');
    }
    } finally { __thaw(); }
    return window.__rc;
  };
  window.__state = () => {
    const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
    const ents = G.ents.filter((e) => e.kind === 'enemy').map((e) => [e.type, e.x.toFixed(4), e.y.toFixed(4), e.hp, e.state, !!e.dead].join(':')).join('|');
    const d = snapshotGame(); delete d.when;
    return { ents: h(ents), cam: [Engine.cam.x.toFixed(5), Engine.cam.y.toFixed(5)].join(','), hp: G.player.hp, xp: G.player.xp, save: h(JSON.stringify(d)), noise: G.noise.toFixed(5) };
  };
  window.__frame = () => {
    __freeze(123456); try { render(); } finally { __thaw(); }
    const c = Engine.canvas || document.getElementById('view'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x = 2166136261; for (let i = 0; i < d.length; i += 3) { x ^= d[i]; x = Math.imul(x, 16777619) >>> 0; } return x.toString(16);
  };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const allErrors = [];
  try {
    // ================================================================ 1. single-player unchanged (module vs blocked)
    {
      const relay = new Relay();
      const A = await open(browser, relay, 'solo', {}, process.env.P19_A === 'blk');
      const Bk = await open(browser, new Relay(), 'blocked', {}, process.env.P19_B !== 'mod');
      if (!process.env.P19_A && !process.env.P19_B) {
        ok(await A.page.evaluate(() => typeof SYNC19 === 'object' && !SYNC19.active()), 'SYNC19 loads and is idle with nobody connected');
        ok(await Bk.page.evaluate(() => typeof SYNC19 === 'undefined'), 'the comparison page runs with js/sync19.js blocked');
      }
      const res = [];
      for (const P of [A, Bk]) {
        await newGame(P.page, 'Solo Tester');
        await P.page.evaluate(TRACE); if (process.env.P19_RNGLOG) await P.page.evaluate(() => { window.__P19LOG = true; });
        await P.page.evaluate(() => { __stopLoop(); });
        await P.page.waitForTimeout(100);
        res.push(await P.page.evaluate(() => {
          if (window.__P19LOG) window.__rlog = [];
          __stage(); const rc = __trace(0, 600); const s = __state(); s.rc = rc;
          if (window.__P19LOG) { const d = snapshotGame(); delete d.when; s.raw = JSON.stringify(d); }
          if (window.__rlog) { s.rlog = window.__rlog; window.__rlog = null; }
          // frames: particles and idle motion carry state from each page's own real-time history, so they are off here
          GFX.particles = 0; GFX.reduceMotion = true; if (GFX.changed) GFX.changed();
          if (typeof ANIM !== 'undefined') { ANIM.T = 5; ANIM.last = 123456; ANIM.dirLast = Engine.cam.dir; }   // the animators' own clocks too (as test/light21.test.js and test/firesmoke.test.js pin them)
          if (typeof FLORA !== 'undefined') { FLORA.hold(true); FLORA.T = 5; }
          s.frames = {};
          // seed the stream as well as the clock: the staged scenes are off from each page's own history too
          for (const id of ['mill', 'greenhall', 'underhedge']) { __seed(123456); __freeze(123456); loadMap(id, G.maps[id].spawn); G.fadeT = 0; __thaw(); s.frames[id] = __frame(); }
          __seed(123456); PRESETS.apply('original'); s.frames.original = __frame(); PRESETS.apply('medium');
          s.frame = Object.values(s.frames).join('.');
          return s;
        }));
      }
      if (res[0].rlog) { const a = res[0].rlog, b = res[1].rlog; let i = 0; while (i < a.length && a[i] === b[i]) i++; console.log('  RNG diverges at', i, 'of', a.length, b.length); for (let k = Math.max(0, i - 4); k < i + 6; k++) console.log('   ', k, a[k], ' || ', b[k]); delete res[0].rlog; delete res[1].rlog; }
      console.log('  trace with module:', JSON.stringify(res[0]));
      if (res[0].raw && res[1].raw) { const a = JSON.parse(res[0].raw), b = JSON.parse(res[1].raw); const walk = (x, y, p) => { if (JSON.stringify(x) === JSON.stringify(y)) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + '.' + k); } else console.log('  DIFF', p, JSON.stringify(x)?.slice(0, 200), JSON.stringify(y)?.slice(0, 200)); }; walk(a, b, ''); delete res[0].raw; delete res[1].raw; }
      console.log('  trace blocked    :', JSON.stringify(res[1]));
      ok(res[0].rc === res[1].rc && res[0].rc > 0, 'single player: the same number of Math.random calls in a 600-step seeded fight (' + res[0].rc + ')');
      ok(res[0].ents === res[1].ents && res[0].cam === res[1].cam && res[0].hp === res[1].hp && res[0].noise === res[1].noise, 'single player: enemies, camera, health and noise identical after the trace');
      ok(res[0].save === res[1].save, 'single player: the save code is identical');
      ok(res[0].frame === res[1].frame, 'single player: rendered frames identical in three places (Medium) and in Original (' + res[0].frame + ')');
      allErrors.push(...A.errors, ...Bk.errors.filter((e) => !/Failed to load resource/.test(e)));   // the blocked page's own aborted script
      await A.ctx.close(); await Bk.ctx.close();
    }

    // ================================================================ 2. join, predict, reconcile, follow, bounds, RNG
    const relay = new Relay();
    const host = await open(browser, relay, 'host');
    const guest = await open(browser, relay, 'guest');
    await newGame(host.page, 'Host Tester'); await newGame(guest.page, 'Guest Tester');
    await host.page.evaluate(TRACE); await guest.page.evaluate(TRACE);
    // the guest's own world, to compare after leaving
    await guest.page.evaluate(() => { loadMap('tavern', { x: 8.5, y: 10.5, dir: -Math.PI / 2 }); G.state = 'play'; });
    await guest.page.waitForTimeout(200);
    // (the clock of the guest's own world runs while it is on screen, before joining and after coming home: tod and the
    // play-time counters are left out, and so is the noise you make, which settles a little more each frame it is on
    // screen (under load that is more frames); everything else must come back exactly)
    const OWN = () => { const d = snapshotGame(); delete d.when; delete d.tod; delete d.noise; for (const k of Object.keys(d.flags)) if (/^p7t_/.test(k)) delete d.flags[k]; return JSON.stringify(d); };
    const ownBefore = await guest.page.evaluate(`(${OWN})()`);
    // host stands in Oakhaven's street
    await host.page.evaluate(() => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; loadMap('oakhaven', { x: 23.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax = 9999; });
    const CODE = await host.page.evaluate(async () => (await NET19.host({ transport: __relayT(), name: 'Host Tester' })).code);
    await guest.page.evaluate(async (c) => { await NET19.join(c, { transport: __relayT(), name: 'Guest Tester' }); }, CODE);
    ok(await guest.page.evaluate(() => NET19.role() === 'guest' && NET19.connected()), 'the guest is connected through NET19 (code ' + CODE + ')');
    await guest.page.waitForFunction(() => SYNC19.isGuest(), null, { timeout: 8000 });
    await host.page.waitForFunction(() => SYNC19.isHost());
    await guest.page.waitForFunction(() => SYNC19.stats().recon > 3, null, { timeout: 5000 });
    {
      const h = await host.page.evaluate(() => ({ map: G.mapId, n: G.ents.length, vis: G.ents.filter((e) => !e.hidden && !e.dead).length }));
      const g = await guest.page.evaluate(() => ({ map: G.mapId, n: G.ents.length, vis: G.ents.filter((e) => !e.hidden && !e.dead).length, st: G.state, figs: SYNC19.figures().length, msgs: document.getElementById('msgs').textContent }));
      ok(g.map === h.map && g.map === 'oakhaven', 'the guest joins on the host\'s map (' + g.map + ')');
      console.log('  census host', JSON.stringify(h), 'guest', g.n, g.vis);
      if (g.n !== h.n) {
        console.log('  guest unmatched', await guest.page.evaluate(() => JSON.stringify(G.ents.filter((e) => !SYNC19._internal.C.applied.has(e._sid19)).map((e) => [e._sid19, e.kind, e.sprite, e.x.toFixed(1), e.y.toFixed(1), !!e.hidden]).slice(0, 12))));
        console.log('  host', await host.page.evaluate(() => JSON.stringify({ base: G.map.baseCount, n: G.ents.length, extras: G.ents.filter((e, i) => i >= G.map.baseCount).map((e) => [e.kind, e.sprite, e.x.toFixed(1), e.y.toFixed(1)]).slice(0, 10) })));
        console.log('  guest base', await guest.page.evaluate(() => G.map.baseCount));
      }
      ok(g.n === h.n && g.vis === h.vis, 'the census gives the guest the host\'s entities (' + g.n + ' / ' + g.vis + ' visible)');
      ok(g.st === 'play' && g.figs === 1 && (await host.page.evaluate(() => SYNC19.figures().length)) === 1, 'each side sees one remote traveller');
      const gs = await host.page.evaluate(() => SYNC19.guestState());
      const gc = await guest.page.evaluate(() => [Engine.cam.x, Engine.cam.y]);
      ok(Math.hypot(gs.x - gc[0], gs.y - gc[1]) < 0.05 && Math.hypot(gs.x - 23.5, gs.y - 6.5) < 2, 'the guest is set down beside the host and both agree where');
    }
    // ---- prediction and reconciliation, with 80 ms each way
    relay.lat = 120;
    {
      // somewhere open: a spot with 4 clear tiles ahead, away from the host
      const spot = await host.page.evaluate(() => {
        const m = G.map, c = Engine.cam;
        for (let r = 2; r < 14; r++) for (let a = 0; a < 16; a++) {
          const x = c.x + Math.cos(a / 16 * 6.283) * r, y = c.y + Math.sin(a / 16 * 6.283) * r;
          for (const d of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
            let clear = true; for (let t = 0; t <= 4.5 && clear; t += 0.25) { const px = x + Math.cos(d) * t, py = y + Math.sin(d) * t; for (const [ox, oy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) if (m.isBlocked((px + ox) | 0, (py + oy) | 0) || (m.lvls || m.smooth) && Math.abs(m.groundAt(px, py) - m.groundAt(x, y)) > 0.2) clear = false; if (Math.hypot(px - c.x, py - c.y) < 1.5) clear = false; for (const e of G.ents) if (e.solid && !e.hidden && !e.dead && Math.hypot(px - e.x, py - e.y) < 0.8) clear = false; }
            if (clear) return { x, y, d };
          }
        }
        return null;
      });
      ok(!!spot, 'found open ground to walk on');
      await host.page.evaluate((s) => SYNC19.placeGuest(s.x, s.y, s.d), spot);
      await guest.page.waitForTimeout(500);
      await guest.page.evaluate((s) => { Engine.cam.dir = s.d; }, spot);
      await guest.page.waitForTimeout(300);
      await guest.page.evaluate(() => SYNC19.resetStats());   // the set-down above was a deliberate jump
      const p0 = await guest.page.evaluate(() => [Engine.cam.x, Engine.cam.y]);
      const h0 = await host.page.evaluate(() => { const g = SYNC19.guestState(); return [g.x, g.y]; });
      const seq0 = await guest.page.evaluate(() => SYNC19._internal.C.seq);
      await guest.page.keyboard.down('w');
      await guest.page.waitForTimeout(120);
      const p1 = await guest.page.evaluate(() => [Engine.cam.x, Engine.cam.y, SYNC19._internal.C.lastAck]);
      const h1 = await host.page.evaluate(() => { const g = SYNC19.guestState(); return [g.x, g.y]; });
      await guest.page.waitForTimeout(900);
      await guest.page.keyboard.up('w');
      await guest.page.waitForTimeout(900);
      const p2 = await guest.page.evaluate(() => ({ cam: [Engine.cam.x, Engine.cam.y], st: [SYNC19._internal.C.st.x, SYNC19._internal.C.st.y], stats: SYNC19.stats() }));
      const h2 = await host.page.evaluate(() => { const g = SYNC19.guestState(); return [g.x, g.y]; });
      const moved = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), hostMoved1 = Math.hypot(h1[0] - h0[0], h1[1] - h0[1]);
      console.log(`  predicted after 120 ms: ${moved.toFixed(3)} tiles (host had ${hostMoved1.toFixed(3)}); after release guest ${p2.st.map((v) => v.toFixed(3))} host ${h2.map((v) => v.toFixed(3))}; recon err max ${p2.stats.reconErrMax}`);
      ok(moved > 0.15 && p1[2] <= seq0 + 1, 'the guest\'s movement shows at once (predicted: ' + moved.toFixed(2) + ' tiles), before the host has answered for any of it (240 ms round trip)');
      ok(Math.hypot(h2[0] - h0[0], h2[1] - h0[1]) > 1.5, 'the host moved the guest\'s traveller from the inputs');
      ok(Math.hypot(p2.st[0] - h2[0], p2.st[1] - h2[1]) < 0.02 && Math.hypot(p2.cam[0] - h2[0], p2.cam[1] - h2[1]) < 0.05, 'reconciled: the guest ends exactly where the host says');
      ok(p2.stats.reconErrMax < 0.3, 'prediction errors stay small (max correction ' + p2.stats.reconErrMax + ' tiles)');
    }
    relay.lat = 0;
    // ---- doors: the guest opens an ordinary door; a portal does not take the guest anywhere
    {
      const r = await host.page.evaluate(() => {
        // an ordinary door (not a portal, not locked) somewhere in the province, with open floor beside it
        for (const id in G.maps) {
          const m = G.maps[id];
          for (const k in m.doors) {
            const c = m.cells[k]; if (!c || c.portal || c.locked || c.lockDifficulty) continue;
            const x = (k % m.w), y = Math.floor(k / m.w);
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!m.isBlocked(x + dx, y + dy) && !m.isBlocked(x + 2 * dx, y + 2 * dy) && !(m.lvls || m.smooth)) {
              loadMap(id, { x: x + 2 * dx + 0.5, y: y + 2 * dy + 0.5, dir: Math.atan2(-dy, -dx) }); G.state = 'play'; G.fadeT = 0;
              return { map: id, k: +k, x: x + dx + 0.5, y: y + dy + 0.5, dir: Math.atan2(-dy, -dx), t: m.doors[k].target };
            }
          }
        }
        return null;
      });
      if (r) {
        await guest.page.waitForFunction((r) => G.mapId === r.map, r, { timeout: 5000 });
        await guest.page.waitForTimeout(300);
        await guest.page.evaluate((r) => { SYNC19.sendAction({ a: 'door', k: r.k }); }, r);
        await host.page.waitForFunction((r) => G.map.doors[r.k].target !== r.t, r, { timeout: 3000 });
        await guest.page.waitForFunction((r) => G.map.doors[r.k].target !== r.t, r, { timeout: 3000 });
        ok(true, 'the guest opens an ordinary door on the host (' + r.map + ') and sees it open');
        await host.page.evaluate(() => { loadMap('oakhaven', { x: 23.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; });
        await guest.page.waitForFunction(() => G.mapId === 'oakhaven', null, { timeout: 5000 });
      } else ok(false, 'found a plain door to test');
      const portalTry = await guest.page.evaluate(() => { const before = G.mapId; transfer({ map: 'tavern', useSpawn: true }); return before === G.mapId && G.mapId === 'oakhaven'; });
      ok(portalTry, 'the guest cannot take a portal alone (come-with-me rule)');
    }
    // ---- the host's RNG: SYNC never draws from it. With the host's loop stopped (so only SYNC's own handlers and ticks
    // run), the guest walks, strikes, sings and opens a door; every Math.random call made from inside sync19.js counts.
    {
      await host.page.evaluate(() => {
        __stopLoop();
        const R = Math.random; window.__syncRng = 0; window.__allRng = 0;
        Math.random = function () { window.__allRng++; const st = new Error().stack || ''; if (/sync19\.js/.test(st) && /partner19\.js/.test(st)) window.__partnerRng = (window.__partnerRng || 0) + 1; else if (/sync19\.js/.test(st)) { window.__syncRng++; if (!window.__rs) window.__rs = st.split('\n').slice(1, 12).map((l) => l.replace(/^.*\/js\//, '').replace(/\?v=\d+/, '')).join(' < '); } return R(); };
        window.__restoreRng = () => { Math.random = R; };
      });
      await host.page.evaluate(() => { const e = hydrate({ kind: 'enemy', type: 'hound', x: Engine.cam.x + 2, y: Engine.cam.y }); e.state = 'idle'; G.ents.push(e); });
      await guest.page.keyboard.down('d');
      for (let c = 0; c < 15; c++) {
        await host.page.waitForTimeout(80);
        await host.page.evaluate(() => SYNC19._internal.hostTick());
        if (c === 5) await guest.page.evaluate(() => attack('slash right'));
        if (c === 9) await guest.page.evaluate(() => castSong('tending'));
      }
      await guest.page.keyboard.up('d');
      await host.page.waitForTimeout(200);
      const r = await host.page.evaluate(() => { window.__restoreRng(); return { stack: window.__rs, partner: window.__partnerRng || 0, sync: window.__syncRng, all: window.__allRng, inputs: SYNC19.guestState().inputs, acts: SYNC19.stats().acts }; });
      console.log('  host Math.random while serving the guest:', JSON.stringify(r));
      ok(r.inputs > 20 && r.acts >= 2 && r.sync === 0, 'serving the guest (inputs, snapshots, a strike and a Song) never draws from the host\'s Math.random in SYNC\'s own code (' + r.sync + ' calls; PARTNER, acting on the guest\'s real actions: ' + r.partner + ')');
      await host.page.evaluate(() => __startLoop());
      // a drop: the host carries on alone, PARTNER's partner steps out (paused) until the guest is back
      relay.cut = true;
      await host.page.waitForFunction(() => !SYNC19.active(), null, { timeout: 8000 });
      ok(await host.page.evaluate(() => typeof PARTNER19 !== 'object' || !PARTNER19.active() || PARTNER19.S.paused), 'the host carries on alone when the connection drops (the partner is paused)');
      await host.page.waitForTimeout(500);
      relay.cut = false;
      await host.page.waitForFunction(() => SYNC19.isHost(), null, { timeout: 15000 });
      await guest.page.waitForFunction(() => SYNC19.isGuest() && G.mapId === 'oakhaven' && SYNC19.stats().recon > 0, null, { timeout: 8000 });
      ok(await host.page.evaluate(() => typeof PARTNER19 !== 'object' || (PARTNER19.active() && !PARTNER19.S.paused)), 'after a drop the guest asks again and is welcomed back into the same world, the same partner');
    }
    // ---- map change: the guest comes along
    {
      await host.page.evaluate(() => { transfer({ map: 'tavern', useSpawn: true }); G.state = 'play'; });
      await guest.page.waitForFunction(() => G.mapId === 'tavern', null, { timeout: 5000 });
      await guest.page.waitForTimeout(400);
      const hp = await host.page.evaluate(() => [Engine.cam.x, Engine.cam.y]);
      const gp = await guest.page.evaluate(() => [Engine.cam.x, Engine.cam.y, G.ents.length]);
      const hn = await host.page.evaluate(() => G.ents.length);
      ok(Math.hypot(hp[0] - gp[0], hp[1] - gp[1]) < 2 && gp[2] === hn, 'the guest follows the host into the tavern and lands beside them (' + Math.hypot(hp[0] - gp[0], hp[1] - gp[1]).toFixed(2) + ' tiles)');
      await host.page.evaluate(() => { loadMap('oakhaven', { x: 23.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; });
      await guest.page.waitForFunction(() => G.mapId === 'oakhaven', null, { timeout: 5000 });
      ok(true, 'and back out into Oakhaven');
    }
    // ---- bounded snapshots: a 30-enemy scene around the host
    {
      await host.page.evaluate(() => {
        loadMap('clearing', { x: 14.5, y: 14.5, dir: 0 }); G.state = 'play'; G.player.hp = G.player.hpMax = 99999;
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, e = hydrate({ kind: 'enemy', type: i % 3 ? 'hound' : 'proctor', x: 14.5 + Math.cos(a) * 5, y: 14.5 + Math.sin(a) * 5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e); }
      });
      await guest.page.waitForFunction(() => G.mapId === 'clearing', null, { timeout: 5000 });
      await guest.page.waitForTimeout(1500);
      await host.page.evaluate(() => SYNC19.resetStats()); await guest.page.evaluate(() => SYNC19.resetStats());
      await guest.page.waitForTimeout(4200);
      const hs = await host.page.evaluate(() => SYNC19.stats()), gs = await guest.page.evaluate(() => SYNC19.stats());
      const chasing = await host.page.evaluate(() => G.ents.filter((e) => e.kind === 'enemy' && !e.dead && e.state === 'chase').length);
      console.log('  30-enemy scene (' + chasing + ' chasing): host', JSON.stringify(hs));
      console.log('  guest', JSON.stringify(gs));
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'sync19-stats.json'), JSON.stringify({ host: hs, guest: gs }, null, 1));
      ok(hs.outRate < 20000 && gs.inRate < 20000 && hs.peakOut < 20000, `bandwidth to the guest under 20 KB/s (${hs.outRate} B/s, peak ${hs.peakOut})`);
      ok(hs.snapMax <= SYNC_B_SNAP_MAX && hs.snapEntsMax <= 64, `snapshots bounded (largest ${hs.snapMax} B, at most ${hs.snapEntsMax} entities after the census)`);
      ok(gs.outRate < 8000, `the guest's uplink is small (${gs.outRate} B/s)`);
      ok(hs.msPerSec < 120 && gs.msPerSec < 120, `CPU: host ${hs.msPerSec} ms/s, guest ${gs.msPerSec} ms/s`);
      const ge = await guest.page.evaluate(() => G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.hidden).length);
      ok(ge === chasing, 'the guest sees every enemy of the scene (' + ge + ')');
      await host.page.evaluate(() => { for (const e of G.ents) if (e.kind === 'enemy') { e.dead = true; e.hidden = true; e.solid = false; } });
    }
    // ---- screenshots: host and guest side by side, Medium and Cinematic
    async function sideBySide(name) {
      await host.page.evaluate(() => { const g = SYNC19.guestState(); Engine.cam.dir = Math.atan2(g.y - Engine.cam.y, g.x - Engine.cam.x); Engine.cam.pitch = 0; });
      await guest.page.waitForTimeout(400);
      await guest.page.evaluate(() => { const f = SYNC19.figures()[0]; if (f) Engine.cam.dir = Math.atan2(f.y - Engine.cam.y, f.x - Engine.cam.x); Engine.cam.pitch = 0; });
      await guest.page.waitForTimeout(500);
      if (!SHOTS) return;
      const a = (await host.page.screenshot()).toString('base64'), b = (await guest.page.screenshot()).toString('base64');
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 440 } }); const p = await ctx.newPage();
      await p.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px;font:14px sans-serif;color:#ddd"><figure style="margin:0"><img style="width:636px" src="data:image/png;base64,${a}"><figcaption>host</figcaption></figure><figure style="margin:0"><img style="width:636px" src="data:image/png;base64,${b}"><figcaption>guest</figcaption></figure></body>`);
      await p.waitForTimeout(200); await p.screenshot({ path: path.join(SHOTS, name) }); await ctx.close();
    }
    await host.page.evaluate(() => { loadMap('oakhaven', { x: 29.5, y: 19.5, dir: Math.PI / 2 }); G.state = 'play'; G.tod = 0.45; });
    await guest.page.waitForFunction(() => G.mapId === 'oakhaven', null, { timeout: 5000 });
    await host.page.evaluate(() => SYNC19.placeGuest(Engine.cam.x + 2.6, Engine.cam.y + 0.4, Math.PI));
    await guest.page.waitForTimeout(600);
    await sideBySide('sync19-medium.png');
    await host.page.evaluate(() => { if (typeof PRESETS !== 'undefined') PRESETS.apply('cinematic'); });
    await guest.page.evaluate(() => { if (typeof PRESETS !== 'undefined') PRESETS.apply('cinematic'); });
    await sideBySide('sync19-cinematic.png');
    await host.page.evaluate(() => { if (typeof PRESETS !== 'undefined') PRESETS.apply('medium'); });
    await guest.page.evaluate(() => { if (typeof PRESETS !== 'undefined') PRESETS.apply('medium'); });
    ok((await guest.page.evaluate(() => SYNC19.figures()[0])) != null, 'the guest draws the host\'s figure (stand-in until PARTNER draws its own)');

    // ---- untrusted input: hostile messages to the host (as if from the guest) and to the guest (as if from the host)
    {
      const before = await host.page.evaluate(() => ({ flags: JSON.stringify(Object.keys(G.flags).filter((k) => !/^p7t_/.test(k)).map((k) => [k, G.flags[k]])), hp: G.player.hp, gs: SYNC19.guestState(), imgs: document.querySelectorAll('img').length }));
      // sent from the guest's page through its own NET19, exactly as a tampered client would
      const pre = await host.page.evaluate(() => {
        const g = SYNC19.guestState(), m = G.map; let far = null, portal = null;
        for (const k in m.doors) { const c = m.cells[k]; const x = (k % m.w) + 0.5, y = Math.floor(k / m.w) + 0.5; if (c.portal && portal == null) portal = +k; if (!c.portal && !c.locked && Math.hypot(x - g.x, y - g.y) > 6 && far == null) far = +k; }
        return { x: g.x, y: g.y, seq: SYNC19._internal.H.gs.lastSeq, ep: SYNC19._internal.H.ep, far, portal };
      });
      await guest.page.evaluate((pre) => {
        const D = (t, p, r) => NET19.send(t, p, { reliable: r !== false });
        let seq = pre.seq;
        // speed hack: 40 messages of 12 fresh full-speed running inputs (16 s of movement) in one go
        for (let m = 0; m < 40; m++) { const i = []; for (let k = 0; k < 12; k++) i.push([++seq, 100, 0, 1, 0, 0, 0, 0]); D('sync.in', { k: [pre.ep, -1], i }, false); }
        // nonsense values and shapes
        D('sync.in', { k: [0, 0], i: [[++seq, 1e9, 0, 0, 0, 0, 0, 0]] }); D('sync.in', { k: [0, 0], i: [[++seq, 0, 0, 0, 'north', 0, 0, 0]] });
        D('sync.in', { k: [0, 0], i: [[++seq, 0, 0, 255, 0, 0, 0, 0]] }); D('sync.in', { k: [0, 0], i: [[++seq, 0, 0, 0, 0, 999, 0, 0]] });
        D('sync.in', { k: 'x', i: [] }); D('sync.in', { k: [0, 0], i: new Array(50).fill([1, 0, 0, 0, 0, 0, 0, 0]) });
        D('sync.in', { k: [0, 0], i: [[seq + 5000, 0, 0, 0, 0, 0, 0, 0]] });
        // actions
        D('sync.act', { a: 'door', k: pre.far == null ? 1 : pre.far }); D('sync.act', { a: 'door', k: pre.portal == null ? 2 : pre.portal }); D('sync.act', { a: 'door', k: -5 });
        D('sync.act', { a: 'use', sid: 99999999 }); D('sync.act', { a: 'atk', dir: '<img src=x onerror="window.__pwned=1">', w: 0 });
        D('sync.act', { a: 'p.big', v: 'x'.repeat(800) }); D('sync.act', { a: 'constructor' }); D('sync.act', { a: 'eval', v: 'alert(1)' }); D('sync.act', { a: 'song', id: '../../x' });
        D('sync.act', { a: 'item', id: 'not_an_item' });
        D('sync.hello', { v: 99 });
        // a type only the host may send, and an oversize frame: NET drops both before SYNC sees them
        D('sync.snap', { q: 1 }); D('sync.act', { a: 'p.x', v: 'y'.repeat(5000) });
      }, pre);
      await host.page.waitForTimeout(1200);
      const res = await host.page.evaluate((pre) => { const g = SYNC19.guestState(); return { moved: Math.hypot(g.x - pre.x, g.y - pre.y), rej: SYNC19.stats().rejected, lastSeq: SYNC19._internal.H.gs.lastSeq, net: NET19.stats().reasons }; }, pre);
      console.log('  NET dropped on the host:', JSON.stringify(res.net));
      const after = await host.page.evaluate(() => ({ flags: JSON.stringify(Object.keys(G.flags).filter((k) => !/^p7t_/.test(k)).map((k) => [k, G.flags[k]])), hp: G.player.hp, imgs: document.querySelectorAll('img').length, pwned: window.__pwned, proto: ({}).polluted }));
      console.log('  hostile to host:', JSON.stringify(res.rej), 'speed-hack moved', res.moved.toFixed(2), 'tiles');
      ok(res.moved < 4, 'a speed hack (16 s of inputs at once) moves the guest no further than real time allows (' + res.moved.toFixed(2) + ' tiles)');
      ok(res.rej['in-budget'] > 0 && res.rej['in-value'] >= 4 && res.rej['in-shape'] >= 2 && res.rej['in-jump'] >= 1 && Object.keys(res.net || {}).length > 0, 'bad inputs are rejected (budget, values, shapes, sequence jumps; wrong-sender and oversize frames already by NET19)');
      ok((res.rej['door-far'] >= 1 || pre.far == null) && res.rej['door-locked'] >= 1 && res.rej.door >= 1 && res.rej['use-far'] >= 1 && res.rej.atk >= 1 && res.rej['p-size'] >= 1 && res.rej['act-unknown'] >= 2 && res.rej.song >= 1 && res.rej.item >= 1 && res.rej['hello-version'] >= 1, 'bad actions are rejected (far or portal doors, unknown things, oversize values, markup)');
      ok(after.flags === before.flags && after.hp === before.hp && after.imgs === before.imgs && after.pwned === undefined && after.proto === undefined, 'the host\'s flags (bar the play-time clock), health and page are untouched by them');
      // the guest's real inputs carry on after the hostile burst (their sequence catches up)
      await guest.page.evaluate((s) => { SYNC19._internal.C.seq = s + 10; }, res.lastSeq);
      const hostMap = await host.page.evaluate(() => G.mapId);
      const gq = await guest.page.evaluate(() => { const C = SYNC19._internal.C; return { q: C.lastQ, ep: C.ep, n0: G.ents.length }; });
      await host.page.evaluate((g) => {
        const D = (t, p, r) => NET19.send(t, p, { reliable: r !== false });
        D('sync.snap', { q: Math.max(g.q, SYNC19._internal.H.q) + 2, b: g.q, ep: g.ep,   // ahead of the host's own stream, with ids no host hands out: a host world that moves (R3's lamplighter) keeps sending and numbering
           t: performance.now(), tod: 0, day: 0, e: ['9999500,400,400,4,-1,0,0,2,<img src=x onerror="window.__pwned=1">', '9999501,400,400,4,-1,0,0,0,constructor', 'x,1,2'], rm: '', d: '-1:1,5:7' });
        D('sync.msg', { t: '<img src=x onerror="window.__pwned=1">Hello', c: 'evil' });
        D('sync.flags', { f: JSON.parse('{"__proto__": {"polluted": 1}, "x": true}') });
        D('sync.flags', { f: { ok_flag: true, obj: { a: 1 }, '<b>': true } });
        D('sync.snap', { q: 'nope' }); D('sync.map', { ep: -1, map: '../x', x: 0, y: 0, dir: 0 }); D('sync.map', { ep: g.ep + 50, map: 'nowhere', x: 0, y: 0, dir: 0 });
        D('sync.in', { k: [0, 0], i: [] });   // a guest-only type from the host: NET drops it
      }, gq);
      await guest.page.waitForTimeout(800);
      const gh = await guest.page.evaluate((gq) => ({ n0: gq.n0, n1: G.ents.length, imgs: document.querySelectorAll('#msgs img').length, pwned: window.__pwned, proto: ({}).polluted, okFlag: G.flags.ok_flag, objFlag: 'obj' in G.flags, badKey: '<b>' in G.flags, rej: SYNC19.stats().rejected, map: G.mapId, msgs: document.getElementById('msgs').textContent, x: 'x' in G.flags }), gq);
      console.log('  hostile to guest:', JSON.stringify(gh.rej));
      ok(gh.n1 === gh.n0 && gh.rej['ent-kind'] >= 1 && gh.rej['snap-ent'] >= 1, 'the guest refuses entities it cannot name from its own catalogue');
      ok(gh.imgs === 0 && gh.pwned === undefined && gh.proto === undefined && /Hello/.test(gh.msgs) && !/</.test(gh.msgs), 'markup from the network is shown as plain text, never HTML; no prototype pollution');
      ok(gh.okFlag === true && !gh.objFlag && !gh.badKey, 'only plain world flags with plain names are taken');
      ok(gh.map === hostMap && gh.rej['map-shape'] >= 1 && gh.rej['map-unknown'] >= 1 && gh.rej['snap-shape'] >= 1, 'bogus map changes and snapshots are refused');
      await guest.page.waitForTimeout(600);
      ok(await guest.page.evaluate(() => SYNC19.isGuest() && SYNC19.stats().recon > 0), 'the session survives the hostile burst');
    }
    // ---- leave: the guest's own world comes back exactly
    {
      await guest.page.evaluate(() => SYNC19.leave());
      await guest.page.waitForFunction(() => !SYNC19.active() && G.state === 'play', null, { timeout: 6000 });
      const g = await guest.page.evaluate(`({ save: (${OWN})(), map: G.mapId, st: G.state, active: SYNC19.active() })`);
      ok(!g.active && g.map === 'tavern' && g.st === 'play', 'leaving puts the guest back in their own tavern');
      if (g.save !== ownBefore) { const a = JSON.parse(ownBefore), b = JSON.parse(g.save); const walk = (x, y, p) => { if (JSON.stringify(x) === JSON.stringify(y)) return; if (x && y && typeof x === 'object' && typeof y === 'object') { for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], p + '.' + k); } else console.log('  OWN DIFF', p, JSON.stringify(x)?.slice(0, 160), JSON.stringify(y)?.slice(0, 160)); }; walk(a, b, ''); }
      ok(g.save === ownBefore, 'the guest\'s own save is byte-identical before joining and after leaving (' + ownBefore.length + ' bytes)');
      await host.page.waitForFunction(() => !SYNC19.active(), null, { timeout: 3000 });
      ok(true, 'the host is told and carries on alone');
      await guest.page.waitForFunction(() => NET19.role() === null, null, { timeout: 3000 });   // the transport session ends on the 50 ms deferral in finishLeave
      ok(true, 'leaving ends the guest\'s NET19 session too');
    }
    allErrors.push(...host.errors, ...guest.errors);
    await guest.ctx.close();

    // ================================================================ 3. a phone guest joins from the title screen
    {
      const phone = Object.assign({}, devices['iPhone 14']); delete phone.defaultBrowserType;
      const pg = await open(browser, relay, 'guest', phone);
      ok(await pg.page.evaluate(() => G.state === 'title' && !G.player), 'the phone guest is on the title screen with no traveller');
      await pg.page.evaluate(async (c) => { await NET19.join(c, { transport: __relayT(), name: 'Phone' }); }, CODE);
      await pg.page.waitForFunction(() => SYNC19.isGuest() && G.state === 'play', null, { timeout: 8000 });
      await pg.page.waitForFunction(() => SYNC19.stats().recon > 3, null, { timeout: 5000 });
      const m = await pg.page.evaluate(() => ({ map: G.mapId, title: document.getElementById('title').classList.contains('hidden'), p: !!G.player }));
      ok(m.map === (await host.page.evaluate(() => G.mapId)) && m.title && m.p, 'the phone guest joins straight from the title screen with a stand-in traveller');
      // walk with the touch stick: a thumb down on the left of the view, pushed up
      const box = await pg.page.locator('#view').boundingBox();
      // face away from the host (PARTNER sets the newcomer down just behind them)
      await pg.page.evaluate(() => { const f = SYNC19.figures()[0]; if (f) Engine.cam.dir = Math.atan2(Engine.cam.y - f.y, Engine.cam.x - f.x); });
      const start = await pg.page.evaluate(() => [Engine.cam.x, Engine.cam.y]);
      await pg.page.evaluate((b) => {
        const cv = document.getElementById('view'); const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: 7, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: true }));
        const x = b.x + b.width * 0.2, y = b.y + b.height * 0.45; ev('pointerdown', x, y); ev('pointermove', x, y - b.height * 0.12); window.__touchUp = () => ev('pointerup', x, y - b.height * 0.12);
      }, box);
      await pg.page.waitForTimeout(1200);
      const mid = await pg.page.evaluate(() => ({ touch: G.touchMode, fy: G.touch.fy, cam: [Engine.cam.x, Engine.cam.y] }));
      if (SHOTS) await pg.page.screenshot({ path: path.join(SHOTS, 'sync19-phone-guest.png') });
      await pg.page.evaluate(() => window.__touchUp());
      await pg.page.waitForTimeout(800);
      const end = await pg.page.evaluate(() => [SYNC19._internal.C.st.x, SYNC19._internal.C.st.y]);
      const hg = await host.page.evaluate(() => { const g = SYNC19.guestState(); return [g.x, g.y]; });
      console.log('  phone: touch', JSON.stringify(mid), 'end', end, 'host has', hg);
      ok(mid.touch && mid.fy > 0.3 && Math.hypot(mid.cam[0] - start[0], mid.cam[1] - start[1]) > 0.8, 'the phone guest walks with the touch stick');
      ok(Math.hypot(end[0] - hg[0], end[1] - hg[1]) < 0.05, 'and the host agrees where the phone guest stands');
      const saveTry = await pg.page.evaluate(() => { try { const d = snapshotGame(); return d.flags && d.flags.p17x_on === 1 && d.mapId !== G.mapId + '_' ? 'isolated:' + d.player.name : 'saved'; } catch (e) { return e.message; } });
      const hostName = await host.page.evaluate(() => G.player.name);
      ok(saveTry !== 'saved' && !saveTry.includes(hostName), 'saving on the phone while joined never saves the host\'s world (' + saveTry + ')');
      await pg.page.evaluate(() => SYNC19.leave());
      await pg.page.waitForFunction(() => !SYNC19.active(), null, { timeout: 6000 });
      ok(await pg.page.evaluate(() => G.state === 'title' && !G.player && !document.getElementById('title').classList.contains('hidden')), 'leaving takes the phone guest back to the title screen');
      allErrors.push(...pg.errors);
      await pg.ctx.close();
    }
    allErrors.push(...host.errors.filter((e) => !allErrors.includes(e)));
    ok(allErrors.length === 0, 'no page errors' + (allErrors.length ? ': ' + allErrors.slice(0, 5).join(' | ') : ''));
    console.log(`OK sync19: ${passed} checks`);
  } catch (e) {
    console.error('FAIL', e && e.stack || e);
    if (allErrors.length) console.error('page errors:', allErrors.slice(0, 10));
    process.exitCode = 1;
  } finally { await browser.close(); }
})();
const SYNC_B_SNAP_MAX = 16000;
