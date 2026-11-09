// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/together19.test.js
// Phase 19 "Together", END TO END: NET19 + SYNC19 + PARTNER19 as a player meets them, on the real transport.
//   Two browser contexts: the host on a desktop, the guest on a phone (devices['Pixel 7'], turned to landscape, touch).
//   They meet through the REAL NET19 path (PeerJS + WebRTC) with a LOCAL PeerJS signalling stub started here and
//   iceServers [] — every request and WebSocket is checked to be local; the public broker and the internet are never
//   touched. Then, through the game's own screens:
//     1. the host: Play together -> Host on the title, then a new game; the guest makes a traveller, saves, returns to
//        the title and joins from there by typing the code
//     2. the guest arrives beside the host; "... joins you on the road." shows once; the guest's HUD is the guest's own
//        traveller (name, level, purse; health and voice from PARTNER's read-out); Rest / items / Load / needs are closed
//        with a short line; each side sees the other's figure, name tag small
//     3. a seeded group of three Tongueless: they fight it together; the guest sees the enemies' strike / wind-up / hurt poses and
//        their deaths; shared XP
//     4. the guest goes down, the host lifts them
//     5. the host changes map, the guest follows and lands beside them
//     6. screenshots side by side (Medium and Cinematic) and the phone guest; a 30-enemy scene stays under 20 KB/s
//     7. the guest leaves from the Play together panel: its own game gains the write-back; the host's save holds
//        nothing of the guest
//     8. a guest with no game open joins from the title with the traveller in its newest session slot; going home
//        writes what it earned into that slot
//     9. NET19: a transport whose connect() never settles cannot block reconnects (the attempt times out)
//    10. single player unchanged with all three modules loaded (seeded trace, save code, frames vs all three blocked)
//   No page errors. Starts only its own signalling stub (port TOGETHER19_BROKER_PORT, default 4093) and stops it.
//   SHOTS=<dir> writes screenshots.
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const assert = require('node:assert/strict');
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL0 = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const BPORT = +(process.env.TOGETHER19_BROKER_PORT || 4093);
const SHOTS = process.env.SHOTS || '';
let passed = 0;
const ok = (c, label) => { assert.ok(c, label); passed++; console.log('PASS ' + label); };

// ------------------------------------------------------------------ a minimal PeerJS signalling stub (test only)
// (the same protocol subset as test/net19.test.js: OPEN / ID-TAKEN, OFFER/ANSWER/CANDIDATE/LEAVE forwarded, EXPIRE)
function wsSend(sock, str) {
  const p = Buffer.from(str); let h;
  if (p.length < 126) h = Buffer.from([0x81, p.length]);
  else if (p.length < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(p.length, 2); } else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(p.length), 2); }
  try { sock.write(Buffer.concat([h, p])); } catch (e) { /* closed */ }
}
function wsRead(c) {
  const b = c.buf; if (b.length < 2) return null;
  const op = b[0] & 0x0f; let len = b[1] & 0x7f, off = 2;
  if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); off = 4; } else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); off = 10; }
  const masked = b[1] & 0x80; const mk = masked ? b.slice(off, off + 4) : null; if (masked) off += 4;
  if (b.length < off + len) return null;
  const data = Buffer.from(b.slice(off, off + len)); if (mk) for (let i = 0; i < len; i++) data[i] ^= mk[i & 3];
  c.buf = b.slice(off + len);
  return { op, data };
}
function startBroker(port) {
  const peers = new Map(), log = { conns: 0, msgs: 0, ids: [] }, sockets = new Set();
  const srv = http.createServer((req, res) => { res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end(); });
  srv.on('upgrade', (req, sock) => {
    sockets.add(sock); sock.on('close', () => sockets.delete(sock));
    const u = new URL(req.url, 'http://x');
    if (u.pathname !== '/peerjs' || u.searchParams.get('key') !== 'peerjs') { sock.destroy(); return; }
    const acc = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + acc + '\r\n\r\n');
    const id = u.searchParams.get('id'); log.conns++; log.ids.push(id);
    const c = { sock, id, buf: Buffer.alloc(0), send: (o) => wsSend(sock, JSON.stringify(o)) };
    if (!id || peers.has(id)) { c.send({ type: 'ID-TAKEN', payload: { msg: 'ID is taken' } }); setTimeout(() => sock.destroy(), 50); return; }
    peers.set(id, c); c.send({ type: 'OPEN' });
    sock.on('data', (d) => {
      c.buf = Buffer.concat([c.buf, d]); let m;
      while ((m = wsRead(c))) {
        if (m.op === 8) { sock.destroy(); return; }
        if (m.op !== 1) continue;
        let msg; try { msg = JSON.parse(m.data.toString()); } catch (e) { continue; }
        log.msgs++;
        if (msg.type === 'HEARTBEAT') continue;
        const dst = peers.get(msg.dst);
        if (dst) dst.send({ type: msg.type, src: id, dst: msg.dst, payload: msg.payload });
        else if (msg.type === 'OFFER') c.send({ type: 'EXPIRE', src: msg.dst, dst: id });
      }
    });
    const bye = () => { if (peers.get(id) === c) peers.delete(id); };
    sock.on('close', bye); sock.on('error', bye);
  });
  return new Promise((res, rej) => {
    srv.on('error', rej);
    srv.listen(port, '127.0.0.1', () => res({ log, stop: () => new Promise((r) => { for (const s of sockets) s.destroy(); srv.close(() => r()); }) }));
  });
}

// ------------------------------------------------------------------ pages
const external = [];
const LOCAL = new RegExp('^(https?|wss?)://127\\.0\\.0\\.1:(' + new URL(URL0).port + '|' + BPORT + ')/');
const CFG = { broker: { host: '127.0.0.1', port: BPORT, path: '/', secure: false, key: 'peerjs' }, iceServers: [], heartbeatMs: 400, lostMs: 2500, giveUpMs: 60000, joinTimeoutMs: 15000, reconnectMs: 600 };
async function newCtx(browser, opts, block) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 800 } }, opts || {}));
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (block && block.test(u)) return route.abort();
    if (LOCAL.test(u) || /^(data|blob):/.test(u)) route.continue(); else { external.push(u); route.abort(); }
  });
  return ctx;
}
async function open(ctx, name, errors) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(t)) errors.push(name + ' console: ' + t); if (m.type() === 'warning' && /(net|sync|partner)19|render hook failed/.test(t)) errors.push(name + ' warn: ' + t); });
  page.on('websocket', (w) => { if (!LOCAL.test(w.url())) external.push(w.url()); });
  await page.goto(URL0 + '/?nosw=1');
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && typeof G !== 'undefined' && G.state === 'title' && !document.querySelector('#loading')?.classList.contains('on'));
  if (await page.evaluate(() => typeof NET19 !== 'undefined')) await page.evaluate((c) => NET19.configure(c), CFG);
  return page;
}
async function newGame(page, who, tap) {
  const click = (l) => (tap ? l.tap() : l.click());
  await click(page.locator('#btn-new')); await page.locator('#cname').fill(who);
  await click(page.locator('#c-next')); await click(page.locator('.classlist button').first());
  await click(page.locator('#c-next')); await click(page.locator('#c-next'));
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await click(choice);
    else await click(page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first());
  }
  await click(page.locator('#c-go')); await click(page.locator('#btn-intro-skip'));
  await page.waitForFunction(() => G.state === 'play' && G.map);
  await page.waitForTimeout(300);
}
const until = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 15000 });
async function sideBySide(browser, a, b, name, wide) {
  if (!SHOTS) return;
  const A = (await a.screenshot()).toString('base64'), Bb = (await b.screenshot()).toString('base64');
  const ctx = await browser.newContext({ viewport: { width: 1290, height: wide ? 440 : 470 } }); const p = await ctx.newPage();
  await p.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px;align-items:flex-start;font:14px sans-serif;color:#ddd"><figure style="margin:0"><img style="width:636px" src="data:image/png;base64,${A}"><figcaption>host (desktop)</figcaption></figure><figure style="margin:0"><img style="width:636px" src="data:image/png;base64,${Bb}"><figcaption>guest (Pixel 7, landscape)</figcaption></figure></body>`);
  await p.waitForTimeout(200); await p.screenshot({ path: path.join(SHOTS, name) }); await ctx.close();
}
// every line the message strip shows, kept (the strip itself drops old lines)
const MSGLOG = () => { window.__msgLog = []; const _m = msg; msg = function (t) { try { window.__msgLog.push(String(t)); } catch (e) { /* log only */ } return _m.apply(this, arguments); }; };

// a deterministic stage and a seeded trace (single-player comparison; the loop is stopped so only this script steps)
const TRACE = () => {
  window.__seed = (n) => { let s = n || 777; Math.random = () => { window.__rc++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
  window.__stopLoop = () => { if (!window.__raf) window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; };
  window.__freeze = (t) => { if (!window.__realNow) { window.__realNow = performance.now.bind(performance); window.__realDate = Date.now; } const v = t == null ? window.__realNow() : t; performance.now = () => v; Date.now = () => 1700000000000 + Math.floor(v); };
  window.__thaw = () => { if (window.__realNow) { performance.now = window.__realNow; Date.now = window.__realDate; } };
  window.__stage = () => {
    __freeze(); __seed(4242); window.__rc = 0;
    if (typeof UPG !== 'undefined') UPG._ambT = 4;
    G.maps = buildAllMaps(); G.flags = {}; G.tod = 0.5; G.day = 1; G.time = 0; G.noise = 2; G.keys = {}; G.vel.x = G.vel.y = 0; G.turnV = 0;
    G.attack.t = 0; G.song.t = 0; G.hurtT = 0; G.escapeTimer = 0; G.rootWard = 0; G.glassLock = 0;
    if (typeof Weather !== 'undefined') Weather.load({ s: 'clear', left: 5 });
    G.player.hp = G.player.hpMax = 9999; G.player.fat = G.player.fatMax; G.player.voice = G.player.voiceMax;
    loadMap('clearing', { x: 12.5, y: 11.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0;
    for (const [t, x, y] of [['hound', 12.5, 7.5], ['hound', 14.5, 8.5], ['proctor', 10.5, 8.5]]) { const e = hydrate({ kind: 'enemy', type: t, x, y }); e.state = 'chase'; e.alertT = 99; G.ents.push(e); }
    __thaw();
  };
  window.__trace = (from, to) => { __freeze(); try { for (let i = from; i < to; i++) { __seed(1000 + i); Engine.cam.dir = -Math.PI / 2 + Math.sin(i / 40) * 0.5; update(1 / 60); if (i % 30 === 0) attack('slash right'); } } finally { __thaw(); } return window.__rc; };
  window.__state = () => {
    const h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
    const ents = G.ents.filter((e) => e.kind === 'enemy').map((e) => [e.type, e.x.toFixed(4), e.y.toFixed(4), e.hp, e.state, !!e.dead].join(':')).join('|');
    const d = snapshotGame(); delete d.when;
    return { ents: h(ents), cam: [Engine.cam.x.toFixed(5), Engine.cam.y.toFixed(5)].join(','), hp: G.player.hp, xp: G.player.xp, save: h(JSON.stringify(d)), noise: G.noise.toFixed(5) };
  };
  window.__frame = () => { __freeze(123456); try { render(); } finally { __thaw(); } const c = Engine.canvas || document.getElementById('view'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let x = 2166136261; for (let i = 0; i < d.length; i += 3) { x ^= d[i]; x = Math.imul(x, 16777619) >>> 0; } return x.toString(16); };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const errors = [];
  let broker = null;
  const phoneProfile = Object.assign({}, devices['Pixel 7'], { viewport: { width: 915, height: 412 }, screen: { width: 915, height: 412 } });
  delete phoneProfile.defaultBrowserType;
  try {
    broker = await startBroker(BPORT);
    if (!process.env.T19_SOLO) {
    const hostCtx = await newCtx(browser, { viewport: { width: 1280, height: 800 } });
    const guestCtx = await newCtx(browser, phoneProfile);
    const host = await open(hostCtx, 'host', errors), guest = await open(guestCtx, 'guest', errors);
    await host.evaluate(MSGLOG); await guest.evaluate(MSGLOG);
    ok(await guest.evaluate(() => matchMedia('(pointer: coarse)').matches && innerWidth > innerHeight), 'the guest is a phone (Pixel 7 profile, touch) held in landscape (' + phoneProfile.viewport.width + 'x' + phoneProfile.viewport.height + ')');

    // ================================================================ 1. host from the title; guest saves, goes to the title, joins by code
    await host.locator('#btn-together').click();
    await until(host, () => G.openPanel === 'net19' && !!document.getElementById('n19-host'));
    await host.locator('#n19-name').fill('Sleeves');
    await host.locator('#n19-host').click();
    await until(host, () => NET19.stats().state === 'hosting' && !!document.getElementById('n19-code-show'));
    const CODE = await host.evaluate(() => document.getElementById('n19-code-show').textContent);
    ok(/^[2-9A-Z]{3}-[2-9A-Z]{3}$/.test(CODE) && broker.log.ids.some((i) => /^octave19-/.test(i)), 'the host opens Play together on the title and hosts: code ' + CODE + ' (registered with the LOCAL broker stub)');
    await host.locator('#n19-close').click();
    await newGame(host, 'Sleeves');
    await host.evaluate(() => { for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true; loadMap('oakhaven', { x: 23.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax = 400; });

    await newGame(guest, 'Brother', true);
    // the guest's own game: a little gold and a known place, saved to a session slot from the Options menu
    await guest.evaluate(() => { G.player.gold = 37; loadMap('tavern', { x: 8.5, y: 10.5, dir: -Math.PI / 2 }); G.state = 'play'; });
    await guest.evaluate(() => { G.state = 'panel'; renderMenu(); });
    await guest.locator('#mn-save').tap();
    await guest.locator('[data-slot="0"]').tap();
    await until(guest, () => SLOTS[0] && SLOTS[0].player.name === 'Brother');
    await guest.evaluate(() => { G.state = 'panel'; renderMenu(); });
    await guest.locator('#mn-title').tap();
    await until(guest, () => G.state === 'title');
    const own0 = await guest.evaluate(() => ({ name: G.player.name, level: G.player.level, xp: G.player.xp, gold: G.player.gold, items: G.player.inv.reduce((n, s) => n + s.n, 0), cls: G.player.cls.id, face: G.player.face }));
    await guest.locator('#btn-together').tap();
    await until(guest, () => !!document.getElementById('n19-code'));
    await guest.locator('#n19-code').fill(CODE.toLowerCase().replace('-', ' '));
    await guest.locator('#n19-join').tap();
    await until(guest, () => NET19.role() === 'guest' && NET19.connected());
    ok(true, 'the phone guest joins from the title screen by typing the code (in lower case, with a space)');
    await until(guest, () => SYNC19.isGuest() && G.state === 'play', null, 20000);
    await until(host, () => SYNC19.isHost() && PARTNER19.active());
    await until(guest, () => SYNC19.stats().recon > 3, null, 8000);

    // ================================================================ 2. arrival, one welcome, the guest's own HUD, closed actions
    {
      const hp = await host.evaluate(() => [Engine.cam.x, Engine.cam.y, G.mapId]);
      const gp = await guest.evaluate(() => [Engine.cam.x, Engine.cam.y, G.mapId]);
      ok(gp[2] === hp[2] && Math.hypot(gp[0] - hp[0], gp[1] - hp[1]) < 2.5, 'the guest arrives on the host\'s map beside the host (' + Math.hypot(gp[0] - hp[0], gp[1] - hp[1]).toFixed(2) + ' tiles)');
      await host.waitForTimeout(2500);
      const joins = await host.evaluate(() => window.__msgLog.filter((t) => /joins you on the road/.test(t)).length);
      ok(joins === 1, '"Brother joins you on the road." is said once (' + joins + ')');
      const hud = await guest.evaluate(() => ({ name: G.player.name, level: G.player.level, gold: G.player.gold, cls: G.player.cls.id, face: G.player.face, hp: G.player.hp, hpMax: G.player.hpMax, voice: G.player.voice, inv: G.player.inv.reduce((n, s) => n + s.n, 0) }));
      const ps = await host.evaluate(() => PARTNER19.snapshot());
      ok(hud.name === 'Brother' && hud.cls === own0.cls && hud.face === own0.face && hud.gold === own0.gold && hud.inv === own0.items && hud.level === ps.lvl, 'the guest\'s HUD is the guest\'s own traveller: ' + JSON.stringify(hud));
      ok(hud.hp === ps.hp && hud.hpMax === ps.hpMax && Math.abs(hud.voice - ps.voice) < 1, 'its health and voice are PARTNER\'s read-out from the host (' + ps.hp + '/' + ps.hpMax + ')');
      const closed = await guest.evaluate(() => {
        document.getElementById('msgs').textContent = ''; const g0 = JSON.stringify([G.player.hp, G.player.inv, G.tod]);
        G.state = 'panel'; renderRest(); const rest = G.state;
        useItem(G.player.inv[0] || { id: 'tonic', n: 1 }); renderLoad(false); const load = G.state;
        G.state = 'panel'; renderMenu(); const mn = { needs: document.getElementById('mn-needs').disabled, title: document.getElementById('mn-title').textContent }; closeModal(); G.state = 'play';
        let saved = 'saved'; try { snapshotGame(); } catch (e) { saved = e.message; }
        return { lines: Array.from(document.querySelectorAll('#msgs > *')).map((n) => n.textContent), rest, load, mn, same: g0 === JSON.stringify([G.player.hp, G.player.inv, G.tod]), saved };
      });
      console.log('  closed on the guest:', JSON.stringify(closed));
      ok(closed.rest === 'play' && closed.load === 'play' && closed.same && closed.lines.some((t) => /you rest when Sleeves rests/.test(t)) && closed.lines.some((t) => /pack waits/.test(t)) && closed.lines.some((t) => /Loading waits/.test(t)), 'Rest, items and Load are closed on the guest with a short line, and change nothing');
      ok(closed.mn.needs && /Part ways/.test(closed.mn.title), 'the guest\'s Options: journey needs closed, "Return to title" becomes "Part ways and go home"');
      await host.evaluate(() => { const g = SYNC19.guestState(); Engine.cam.dir = Math.atan2(g.y - Engine.cam.y, g.x - Engine.cam.x); });
      await guest.evaluate(() => { const f = SYNC19.figures()[0]; Engine.cam.dir = Math.atan2(f.y - Engine.cam.y, f.x - Engine.cam.x); });
      await host.waitForTimeout(500);
      const tags = { host: await host.evaluate(() => { const t = document.getElementById('p19p-tag'); return { on: !t.hidden, text: t.querySelector('.nm').textContent, drawn: PARTNER19.stats.drawn, fs: parseFloat(getComputedStyle(t).fontSize) }; }),
        guest: await guest.evaluate(() => { const t = document.getElementById('p19p-htag'); return { on: !!t && !t.hidden, text: t && t.querySelector('.nm').textContent, drawn: PARTNER19.FIG.host.drawn, fs: t ? parseFloat(getComputedStyle(t).fontSize) : 0 }; }) };
      console.log('  figures and tags:', JSON.stringify(tags));
      ok(tags.host.on && tags.host.text === 'Brother' && tags.host.drawn > 100 && tags.guest.on && tags.guest.text === 'Sleeves' && tags.guest.drawn > 100, 'each side draws the other traveller, named above in a small tag');
    }

    // ================================================================ 3. a seeded group: they fight it together
    {
      await host.evaluate(() => {
        loadMap('clearing', { x: 12.5, y: 14.5, dir: -Math.PI / 2 }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax;
        for (const e of G.ents) if (e.kind === 'enemy') { e.dead = true; e.hidden = true; e.solid = false; }
      });
      await until(guest, () => G.mapId === 'clearing');
      await host.evaluate(() => { SYNC19.placeGuest(14.0, 14.5, -Math.PI / 2); PARTNER19.S.pp.hp = PARTNER19.S.pp.hpMax = 500; });
      await guest.waitForTimeout(600);
      // the guest watches its copies of the enemies: the host's poses arrive as anim.js frames and effects
      await guest.evaluate(() => {
        window.__seen = { strike: 0, a2: 0, wind: 0, a1: 0, hurt: 0, deaths: 0 };
        const _af = animFrame;
        animFrame = function () { const r = _af.apply(this, arguments); for (const e of G.ents) { if (e.kind === 'enemy' && !e.dead) { if (e._p19pb & 16) __seen.strike++; if (e._p19pb & 32) __seen.wind++; if (e._p19pb & 64) __seen.hurt++; if (e.animSprite === e.sprite + '_a2') __seen.a2++; if (e.animSprite === e.sprite + '_a1') __seen.a1++; } if (e._fx19 && e.deathArt && !e._counted) { e._counted = true; __seen.deaths++; } } return r; };
      });
      const n = await host.evaluate(() => {
        // seeded: the same three Tongueless, in the same places, on the host's own (seeded) stream
        let s = 19019; const R = Math.random; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
        window.__unseed = () => { Math.random = R; };
        const out = [];
        for (const [x, y] of [[12.5, 12.0], [14.0, 12.0], [13.2, 11.2]]) { const e = hydrate({ kind: 'enemy', type: 'tongueless', x, y }); e.state = 'chase'; e.alertT = 99; G.ents.push(e); out.push(e); }
        window.__group = out; return out.length;
      });
      await until(guest, (n) => G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.hidden).length === n, n);
      const xp0 = await host.evaluate(() => PARTNER19.earned.xp);
      // the guest presses its attack (the touch button) and the host swings, each at the nearest one
      const face = () => { const c = Engine.cam; let best = null, bd = 1e9; for (const e of G.ents) if (e.kind === 'enemy' && !e.dead && !e.hidden) { const d = Math.hypot(e.x - c.x, e.y - c.y); if (d < bd) { bd = d; best = e; } } if (best) Engine.cam.dir = Math.atan2(best.y - c.y, best.x - c.x); return best ? bd : -1; };
      let rounds = 0;
      for (; rounds < 140; rounds++) {
        const left = await host.evaluate(() => __group.filter((e) => !e.dead).length);
        if (!left) break;
        const dg = await guest.evaluate(`(${face})()`);
        if (dg > 0) await guest.evaluate(() => attack(['slash right', 'slash left', 'chop down'][(Date.now() >> 9) % 3]));
        const dh = await host.evaluate(`(${face})()`);
        if (dh > 0 && dh < 1.6) await host.evaluate(() => attack('slash right'));
        else if (dh > 0) await host.evaluate(() => { const c = Engine.cam; c.x += Math.cos(c.dir) * 0.3; c.y += Math.sin(c.dir) * 0.3; });
        await host.waitForTimeout(350);
      }
      await host.evaluate(() => __unseed());
      const res = await host.evaluate(() => ({ alive: G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.hidden).length, dead: __group.filter((e) => e.dead).length, earned: PARTNER19.earned, xp: PARTNER19.snapshot().xpEarned, hostHits: PARTNER19.stats.hostHits, partnerHits: PARTNER19.stats.partnerHits }));
      await guest.waitForTimeout(800);
      let seen = null;
      for (let i = 0; i < 10; i++) {   // the night may send more hounds meanwhile: the guest must show what the host has
        res.alive = await host.evaluate(() => G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.hidden).length);
        await guest.waitForTimeout(400);
        seen = await guest.evaluate(() => Object.assign({}, __seen, { left: G.ents.filter((e) => e.kind === 'enemy' && !e.dead && !e.hidden).length }));
        if (seen.left === res.alive) break;
      }
      console.log('  fight:', rounds, 'rounds', JSON.stringify(res), 'guest saw', JSON.stringify(seen));
      ok(res.dead === 3 && seen.left === res.alive, 'the two of them put down the seeded group (3 Tongueless) in ' + rounds + ' rounds; the guest sees them all fall (and anything else the night sent: ' + res.alive + ')');
      ok(res.earned.kills >= 3 && res.earned.xp > xp0, 'shared XP: the guest\'s traveller earned ' + res.earned.xp + ' XP from ' + res.earned.kills + ' kills');
      ok(seen.strike > 0 && seen.a2 > 0 && seen.hurt > 0, 'the guest sees them strike (the strike frame) and flinch when hurt (' + JSON.stringify(seen) + ')');
      ok(seen.wind > 0 && seen.a1 > 0, 'and wind up before the blow (the wind-up frame)');
      ok(seen.deaths >= 3, 'and their deaths play out on the guest\'s screen as on the host\'s (' + seen.deaths + ')');
    }

    // ================================================================ 4. the guest goes down; the host lifts them
    {
      await host.evaluate(() => {
        const c = Engine.cam; c.x = 12.5; c.y = 16.5; c.dir = -Math.PI / 2;
        SYNC19.placeGuest(12.5, 12.5, Math.PI / 2); PARTNER19.S.pp.hp = 3;
        const e = hydrate({ kind: 'enemy', type: 'tongueless', x: 12.5, y: 11.6 }); e.state = 'chase'; e.alertT = 99; e.p19t = 'guest'; G.ents.push(e); window.__biter = e;
      });
      await until(host, () => PARTNER19.S.down, null, 15000);
      await host.evaluate(() => { killEnemy(__biter, false); });
      await until(guest, () => SYNC19._internal.C.down === true, null, 5000);
      const gd = await guest.evaluate(() => ({ hp: G.player.hp, down: SYNC19._internal.C.down }));
      ok(gd.down && gd.hp === 0, 'the guest goes down (its screen knows: health 0, downed)');
      await host.evaluate(() => { const s = PARTNER19.snapshot(); Engine.cam.dir = Math.atan2(12.5 - Engine.cam.y, 0) ; });
      await host.waitForTimeout(300);
      if (SHOTS) { await host.evaluate(() => { const c = Engine.cam; c.x = 12.5; c.y = 14.6; c.dir = -Math.PI / 2; }); await guest.waitForTimeout(500); await sideBySide(browser, host, guest, 'p19f-downed.png', true); }
      // the host walks over and stands beside them
      await host.evaluate(() => { const c = Engine.cam; c.x = 12.5; c.y = 13.4; c.dir = -Math.PI / 2; });
      await until(host, () => !PARTNER19.S.down, null, 8000);
      await until(guest, () => SYNC19._internal.C.down === false && G.player.hp > 0, null, 5000);
      ok(true, 'the host stands beside them and lifts them (' + (await guest.evaluate(() => G.player.hp)) + ' health back)');
    }

    // ================================================================ 5. the host changes map; the guest follows
    {
      await host.evaluate(() => { loadMap('oakhaven', { x: 23.5, y: 6.5, dir: Math.PI / 2 }); G.state = 'play'; });
      await until(guest, () => G.mapId === 'oakhaven');
      await host.evaluate(() => { transfer({ map: 'tavern', useSpawn: true }); G.state = 'play'; });
      await until(guest, () => G.mapId === 'tavern', null, 8000);
      await guest.waitForTimeout(500);
      const hp = await host.evaluate(() => [Engine.cam.x, Engine.cam.y]), gp = await guest.evaluate(() => [Engine.cam.x, Engine.cam.y]);
      ok(Math.hypot(hp[0] - gp[0], hp[1] - gp[1]) < 2.2, 'the host walks into the tavern; the guest follows and lands beside them (' + Math.hypot(hp[0] - gp[0], hp[1] - gp[1]).toFixed(2) + ' tiles)');
      const alone = await guest.evaluate(() => { transfer({ map: 'oakhaven', useSpawn: true }); return G.mapId; });
      ok(alone === 'tavern', 'the guest cannot leave the host\'s map alone');
    }

    // ================================================================ 6. screenshots; a 30-enemy scene under 20 KB/s
    {
      await host.evaluate(() => { loadMap('oakhaven', { x: 29.5, y: 19.5, dir: Math.PI / 2 }); G.state = 'play'; G.tod = 0.45; });
      await until(guest, () => G.mapId === 'oakhaven');
      await host.evaluate(() => SYNC19.placeGuest(Engine.cam.x + 2.4, Engine.cam.y + 0.5, Math.PI * 0.9));
      await guest.waitForTimeout(700);
      const face2 = async () => {
        await host.evaluate(() => { const g = SYNC19.guestState(); Engine.cam.dir = Math.atan2(g.y - Engine.cam.y, g.x - Engine.cam.x) + 0.25; Engine.cam.pitch = 0; });
        await guest.evaluate(() => { const f = SYNC19.figures()[0]; if (f) Engine.cam.dir = Math.atan2(f.y - Engine.cam.y, f.x - Engine.cam.x) - 0.2; Engine.cam.pitch = 0; });
        await guest.waitForTimeout(700);
      };
      for (const [preset, name] of [['medium', 'p19f-medium.png'], ['cinematic', 'p19f-cinematic.png']]) {
        await host.evaluate((p) => PRESETS.apply(p), preset); await guest.evaluate((p) => PRESETS.apply(p), preset);
        await face2(); await sideBySide(browser, host, guest, name);
      }
      await host.evaluate(() => { G.tod = 0.86; }); await guest.waitForTimeout(600); await face2(); await sideBySide(browser, host, guest, 'p19f-cinematic-dusk.png');
      if (SHOTS) await guest.screenshot({ path: path.join(SHOTS, 'p19f-guest-pixel7-landscape.png') });
      await host.evaluate(() => { PRESETS.apply('medium'); G.tod = 0.45; }); await guest.evaluate(() => PRESETS.apply('medium'));

      await host.evaluate(() => {
        loadMap('clearing', { x: 14.5, y: 14.5, dir: 0 }); G.state = 'play'; G.player.hp = G.player.hpMax = 99999;
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, e = hydrate({ kind: 'enemy', type: i % 3 ? 'hound' : 'proctor', x: 14.5 + Math.cos(a) * 5, y: 14.5 + Math.sin(a) * 5 }); e.state = 'chase'; e.alertT = 99; G.ents.push(e); }
        PARTNER19.S.pp.hp = PARTNER19.S.pp.hpMax = 99999;
      });
      await until(guest, () => G.mapId === 'clearing');
      await guest.waitForTimeout(1500);
      await host.evaluate(() => SYNC19.resetStats()); await guest.evaluate(() => SYNC19.resetStats());
      await guest.waitForTimeout(5000);
      const hs = await host.evaluate(() => SYNC19.stats()), gs = await guest.evaluate(() => SYNC19.stats());
      const nets = await host.evaluate(() => NET19.stats());
      console.log('  30-enemy scene: host', JSON.stringify({ outRate: hs.outRate, peakOut: hs.peakOut, snapAvg: hs.snapAvg, snapMax: hs.snapMax, snapEntsMax: hs.snapEntsMax, msPerSec: hs.msPerSec, out: hs.out, outN: hs.outN }), 'NET kbpsOut', nets.kbpsOut, 'guest', JSON.stringify({ inRate: gs.inRate, outRate: gs.outRate, msPerSec: gs.msPerSec }));
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, 'p19f-stats.json'), JSON.stringify({ host: hs, guest: gs, net: nets }, null, 1));
      ok(hs.outRate < 20000 && hs.peakOut < 20000 && gs.inRate < 20000, `bandwidth to the guest with enemy poses under 20 KB/s (${hs.outRate} B/s, peak ${hs.peakOut})`);
      await host.evaluate(() => { for (const e of G.ents) if (e.kind === 'enemy') { e.dead = true; e.hidden = true; e.solid = false; } PARTNER19.S.pp.hp = PARTNER19.S.pp.hpMax = 50; });
    }

    // ================================================================ 7. the guest leaves from the panel; the write-back goes home only
    {
      const hostBefore = await host.evaluate(() => PARTNER19.earned && JSON.parse(JSON.stringify(PARTNER19.earned)));
      await guest.evaluate(() => NET19.ui.open());
      await until(guest, () => !!document.getElementById('n19-leave'));
      await guest.locator('#n19-leave').tap();
      await until(guest, () => !SYNC19.active() && NET19.role() === null && G.state === 'play', null, 10000);
      const g = await guest.evaluate(() => { const d = snapshotGame(); return { name: G.player.name, level: G.player.level, xp: G.player.xp, gold: G.player.gold, items: G.player.inv.reduce((n, s) => n + s.n, 0), map: G.mapId, save: { level: d.player.level, xp: d.player.xp, gold: d.player.gold }, used: PARTNER19.guest.home.used, lines: window.__msgLog.slice(-4) }; });
      console.log('  home:', JSON.stringify(g), 'earned on the host', JSON.stringify(hostBefore));
      const need = (lv) => Math.floor(60 * Math.pow(lv, 1.5));
      const total = (lv, xp) => { let t = xp; for (let l = 1; l < lv; l++) t += need(l); return t; };
      ok(g.used && g.name === 'Brother' && g.map === 'tavern', 'the guest leaves from the Play together panel and is back in its own game, in its own tavern');
      ok(total(g.save.level, g.save.xp) - total(own0.level, own0.xp) === hostBefore.xp && g.save.gold === own0.gold + hostBefore.gold, 'its own save gains exactly the write-back: +' + hostBefore.xp + ' XP (level ' + own0.level + ' -> ' + g.save.level + '), +' + hostBefore.gold + ' sovereigns');
      await until(host, () => !SYNC19.active() && !PARTNER19.active());
      const hs = await host.evaluate(() => { const d = JSON.stringify(snapshotGame()); return { brother: /Brother/.test(d), p19: /p19(fig|t|r|th|s)\b|partner19|_p19/.test(d), len: d.length, name: G.player.name }; });
      ok(!hs.brother && !hs.p19 && hs.name === 'Sleeves', 'the host\'s save holds the world and nothing of the guest (' + hs.len + ' bytes searched)');
    }

    // ================================================================ 8. no game open: the traveller of the newest slot travels; the slot gets the write-back
    {
      const code = await guest.evaluate(() => saveCode()), gold1 = await guest.evaluate(() => G.player.gold);
      const fresh = await newCtx(browser, phoneProfile);
      const p2 = await open(fresh, 'guest2', errors); await p2.evaluate(MSGLOG);
      await p2.evaluate(async (c) => { SLOTS[1] = await decodeSave(c); SLOTS[1].when = 5; }, code);
      const before = await p2.evaluate(() => ({ p: !!G.player, lvl: SLOTS[1].player.level, xp: SLOTS[1].player.xp }));
      // the host is still hosting: the same code
      await p2.locator('#btn-together').tap(); await until(p2, () => !!document.getElementById('n19-code'));
      await p2.locator('#n19-code').fill(CODE); await p2.locator('#n19-join').tap();
      await until(p2, () => SYNC19.isGuest() && G.state === 'play', null, 20000);
      await until(host, () => PARTNER19.active());
      const who = await p2.evaluate(() => ({ name: G.player.name, gold: G.player.gold }));
      ok(!before.p && who.name === 'Brother' && who.gold === gold1, 'a guest with no game open joins with the traveller of its newest session slot (' + who.name + ', ' + who.gold + ' sovereigns)');
      const xp = await host.evaluate(() => { const c = Engine.cam, e = hydrate({ kind: 'enemy', type: 'tongueless', x: c.x + 1.2, y: c.y }); G.ents.push(e); killEnemy(e, false); return PARTNER19.earned.xp; });
      await p2.waitForTimeout(300);
      await p2.evaluate(() => { G.state = 'panel'; renderMenu(); });
      await p2.locator('#mn-title').tap();
      await until(p2, () => !SYNC19.active() && G.state === 'play' && G.player && G.player.name === 'Brother', null, 10000);
      const after = await p2.evaluate(() => ({ lvl: SLOTS[1].player.level, xp: SLOTS[1].player.xp, live: [G.player.level, G.player.xp], net: NET19.role() }));
      const need = (lv) => Math.floor(60 * Math.pow(lv, 1.5)), total = (lv, x) => { let t = x; for (let l = 1; l < lv; l++) t += need(l); return t; };
      ok(xp > 0 && total(after.lvl, after.xp) - total(before.lvl, before.xp) === xp && after.live[0] === after.lvl && after.live[1] === after.xp && after.net === null, '"Part ways and go home": the guest is home in that save, and the slot holds the write-back (+' + xp + ' XP)');
      await fresh.close();
    }

    // ================================================================ 9. NET19: a connect() that never settles cannot block reconnects
    {
      const r = await host.evaluate(async () => {
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));
        const cfg = { heartbeatMs: 100, lostMs: 400, reconnectMs: 100, reconnectTimeoutMs: 500, giveUpMs: 20000 };
        const h = NET19.create({ config: cfg }), g = NET19.create({ config: cfg });
        const loopH = NET19._transports.loop(), loopG = NET19._transports.loop();
        let hang = 0, calls = 0;
        const sticky = { name: 'sticky', listen: (c, f) => loopG.listen(c, f), close: () => loopG.close(), connect(c) { calls++; if (hang > 0) { hang--; return new Promise(() => {}); } return loopG.connect(c); } };
        const { code } = await h.host({ transport: loopH, name: 'H' });
        await g.join(code, { transport: sticky, name: 'G' });
        hang = 3;
        g._state.link.close();                                  // the link drops; every reconnect for a while hangs for ever
        const t0 = performance.now();
        while (performance.now() - t0 < 8000 && !(g.connected() && h.connected() && g.stats().reconnects >= 1)) await wait(100);
        const out = { back: g.connected() && h.connected(), reconnects: g.stats().reconnects, calls, timeouts: g.stats().reasons['reconnect-timeout'] || 0, ms: Math.round(performance.now() - t0) };
        g.leave(); h.leave();
        return out;
      });
      console.log('  reconnect through hanging connects:', JSON.stringify(r));
      ok(r.back && r.reconnects >= 1 && r.timeouts >= 3 && r.calls >= 5, 'NET19: three reconnect attempts that never settle each time out and the fourth gets through (' + r.ms + ' ms)');
    }
    await host.evaluate(() => NET19.leave('local'));
    }

    // ================================================================ 10. single player unchanged with all three modules loaded
    {
      const A = await open(await newCtx(browser), 'solo', errors);
      const Bctx = await newCtx(browser, null, process.env.T19_B_MOD ? null : /js\/(net19|sync19|partner19)\.js/);
      const Bp = await open(Bctx, 'blocked', errors);
      if (!process.env.T19_B_MOD) ok(await A.evaluate(() => typeof NET19 === 'object' && typeof SYNC19 === 'object' && typeof PARTNER19 === 'object') && await Bp.evaluate(() => typeof NET19 === 'undefined' && typeof SYNC19 === 'undefined' && typeof PARTNER19 === 'undefined'), 'the comparison page runs with js/net19.js, js/sync19.js and js/partner19.js blocked');
      const res = [];
      for (const P of [A, Bp]) {
        await newGame(P, 'Solo Tester');
        await P.evaluate(TRACE); await P.evaluate(() => { __stopLoop(); }); await P.waitForTimeout(100);
        res.push(await P.evaluate(() => {
          __stage(); const rc = __trace(0, 600); const s = __state(); s.rc = rc;
          GFX.particles = 0; GFX.reduceMotion = true; if (GFX.changed) GFX.changed();
          s.frames = {};
          // (not Oakhaven: its townsfolk keep real-time state of their own, so it differs between any two pages)
          for (const id of ['mill', 'greenhall', 'underhedge']) { __freeze(123456); loadMap(id, G.maps[id].spawn); G.fadeT = 0; __thaw(); s.frames[id] = __frame(); }
          PRESETS.apply('cinematic'); s.frames.cinematic = __frame(); PRESETS.apply('original'); s.frames.original = __frame(); PRESETS.apply('medium');
          s.frame = Object.values(s.frames).join('.');
          return s;
        }));
      }
      console.log('  loaded :', JSON.stringify(res[0])); console.log('  blocked:', JSON.stringify(res[1]));
      ok(res[0].rc === res[1].rc && res[0].rc > 0, 'single player: the same Math.random calls in a 600-step seeded fight (' + res[0].rc + ')');
      ok(res[0].ents === res[1].ents && res[0].cam === res[1].cam && res[0].hp === res[1].hp && res[0].noise === res[1].noise && res[0].save === res[1].save, 'single player: enemies, camera, health, noise and the save code identical');
      ok(res[0].frame === res[1].frame, 'single player: frames identical in three places (Medium), Cinematic and Original (' + res[0].frame + ')');
    }

    ok(external.length === 0, 'nothing left the machine (' + external.length + ' outside requests: ' + external.slice(0, 3).join(' ') + ')');
    const errs = errors.filter((e) => !/blocked: .*Failed to load|ERR_FAILED/.test(e));
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 6).join(' | ') : ''));
    console.log(`OK together19: ${passed} checks`);
  } catch (e) {
    console.error('FAIL', e && e.stack || e);
    if (errors.length) console.error('page errors:', errors.slice(0, 10));
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (broker) await broker.stop();
  }
})();
