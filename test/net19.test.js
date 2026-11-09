// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/net19.test.js
// Phase 19, team NET: the transport and lobby for two-player co-op (js/net19.js, js/vendor/peerjs.min.js).
//   1. pure parts: join codes, names, frames, manual codes, the QR encoder (pinned matrices)
//   2. the session over the in-page loopback: both directions, define/validate, size, rate, sender role, stale
//      unreliable frames, flood -> kick, heartbeat RTT, drop -> lost -> reconnect with the token -> back, clean leave
//   3. BroadcastChannel between two tabs
//   4. the PeerJS path end to end: host on a desktop context, guest on a phone (devices['Pixel 7']) in a second
//      context, through a LOCAL signalling stub (a minimal PeerJS-protocol broker written below; no dependency), with
//      iceServers [] — every request and WebSocket is checked to be local; the public broker is never touched. The guest
//      joins by the QR link (#join=CODE) and by typing; messages both ways, reliable and lossy; RTT; a third player is
//      refused; a bad code; a drop (the guest's WebRTC connection killed) -> the host plays on alone -> reconnect ->
//      back; a clean leave; hostile frames and a hostile name never become markup
//   5. the manual copy-paste path with NO broker running at all (guest as an iPhone 14 profile)
//   6. single-player unchanged: a seeded trace (positions, HP, frame hashes, Math.random call count) and the save
//      snapshot are identical with net19.js loaded and with it blocked; loading the module makes no Math.random calls
//      and does not load PeerJS
//   7. the lobby fits 640x400 and a phone; French list complete; no page errors
// Uses the served preview; starts only its own signalling stub (port NET19_BROKER_PORT, default 4091) and stops it.
// SHOTS=<dir> writes screenshots.
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const { chromium, devices } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL0 = (process.env.PREVIEW_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const BPORT = +(process.env.NET19_BROKER_PORT || 4091);
const SHOTS = process.env.SHOTS || '';
const ROOT = path.join(__dirname, '..');

let fails = 0;
function ok(c, label) { console.log((c ? 'PASS ' : 'FAIL ') + label); if (!c) fails++; }

// ------------------------------------------------------------------ a minimal PeerJS signalling stub (test only)
// Speaks the part of the PeerJS server protocol the client uses when it brings its own ids: a WebSocket at
// /peerjs?key=&id=&token=, OPEN / ID-TAKEN, and forwarding OFFER/ANSWER/CANDIDATE/LEAVE to dst with src set; an OFFER to
// an unknown id gets EXPIRE back (the client reports "peer-unavailable").
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
  const peers = new Map(), log = { conns: 0, msgs: 0, ids: [], http: 0 }, sockets = new Set();
  const srv = http.createServer((req, res) => { log.http++; res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end(); });
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
    srv.listen(port, '127.0.0.1', () => res({ log, peers, stop: () => new Promise((r) => { for (const s of sockets) s.destroy(); srv.close(() => r()); }) }));
  });
}

// ------------------------------------------------------------------ pages
const external = [], wsUrls = [];
const LOCAL = new RegExp('^(https?|wss?)://127\\.0\\.0\\.1:(' + new URL(URL0).port + '|' + BPORT + ')/');
async function guard(ctx) {
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (LOCAL.test(u) || /^(data|blob):/.test(u)) route.continue(); else { external.push(u); route.abort(); }
  });
}
async function open(ctx, hash, opts) {
  opts = opts || {};
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /net19/.test(m.text())) errors.push('warn: ' + m.text()); });
  page.on('websocket', (w) => wsUrls.push(w.url()));
  if (opts.seed) await page.addInitScript(() => { let s = 19019; window.__rc = 0; Math.random = () => { window.__rc++; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL0 + '/?nosw=1' + (hash || ''));
  await page.waitForFunction(() => typeof Engine !== 'undefined' && typeof G !== 'undefined' && G.state === 'title' && (typeof NET19 !== 'undefined' || window.__noNet));
  return { page, errors };
}
const CFG = { broker: { host: '127.0.0.1', port: BPORT, path: '/', secure: false, key: 'peerjs' }, iceServers: [], heartbeatMs: 400, lostMs: 2200, giveUpMs: 60000, joinTimeoutMs: 15000, reconnectMs: 600 };
async function configure(page) { await page.evaluate((c) => NET19.configure(c), CFG); }
async function toGame(page, name) {
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(name || 'Net Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(200);
}
const shot = async (page, name) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name) }); } };
const until = (page, fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 15000 });

(async () => {
  const browser = await chromium.launch();
  let broker = null;
  const allErrors = [];
  try {
    // ================================================================= 1. pure parts
    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await guard(desk);
    const A = await open(desk); allErrors.push(A.errors);
    await shot(A.page, 'net19-title-1280.png');
    const pure = await A.page.evaluate(async () => {
      const P = NET19._pure, o = {};
      o.codes = [P.normCode('krt-4mw'), P.normCode(' KRT 4MW '), P.normCode('https://x.io/game/#join=KRT-4MW'), P.normCode('KRT4M'), P.normCode('KRT-4M0'), P.normCode('<b>x</b>'), P.normCode(null), P.normCode('A'.repeat(500))];
      const rc = new Set(); for (let i = 0; i < 300; i++) rc.add(P.randomCode());
      o.rand = [...rc].every((c) => P.normCode(c) === c) && rc.size > 290;
      const bidi = String.fromCharCode(0x202e) + 'evil' + String.fromCharCode(0x2066, 0x200b, 7, 0x2028) + 'x';
      o.names = [P.cleanName(bidi), P.cleanName('  Ada   Lovelace '), P.cleanName('x'.repeat(80)).length, P.cleanName(42), P.cleanName('<img src=x onerror=alert(1)>')];
      const f = P.encodeFrame('sync.in', 3, { a: [1, 2] });
      const deep = (n) => (n ? { a: deep(n - 1) } : 1);
      o.frames = [P.decodeFrame(f).type, P.decodeFrame('X' + f.slice(1)).bad, P.decodeFrame(String.fromCharCode(1) + '{').bad, P.decodeFrame(String.fromCharCode(1) + '["Bad Type",1,null]').bad,
        P.decodeFrame(String.fromCharCode(1) + '["a.b",-1,null]').bad, P.decodeFrame(P.encodeFrame('a.b', 1, deep(12))).bad, P.decodeFrame(String.fromCharCode(1) + '["a.b",1,{"__proto__":{"x":1}}]').bad,
        P.decodeFrame(String.fromCharCode(1) + '["a.b",1,{"constructor":1}]').bad, P.decodeFrame(P.encodeFrame('a.b', 1, 'x'.repeat(70000))).bad, P.decodeFrame(42).bad, P.decodeFrame(P.encodeFrame('a.b', 1, new Array(2000).fill(0))).bad];
      // manual codes: hostile and malformed
      const pk = await P.packCode({ t: 'a', s: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n' });
      const tryU = async (c, w) => { try { await P.unpackCode(c, w); return 'ok'; } catch (e) { return e.code; } };
      o.man = [await tryU(pk, 'a'), await tryU(pk, 'o'), await tryU('OCT1.' + 'A'.repeat(20000), 'a'), await tryU('hello', 'a'), await tryU('OCT1J.' + btoa('{"t":"a","s":"<script>"}').replace(/=+$/, ''), 'a'),
        await tryU('OCT1J.' + btoa(JSON.stringify({ t: 'a', s: 'v=0\r\nm=application\r\n', x: 1 })).replace(/=+$/, ''), 'a'), await tryU(pk.slice(0, -6), 'a')];
      // zip bomb: 2 MB of zeros deflated is small; must be refused by the inflate cap
      const big = new Uint8Array(2000000).fill(32);
      const cs = new CompressionStream('deflate-raw'); const w = cs.writable.getWriter(); w.write(big); w.close();
      const z = new Uint8Array(await new Response(cs.readable).arrayBuffer()); let s = ''; for (const b of z) s += String.fromCharCode(b);
      o.ice = NET19._pure.DEFAULTS.iceServers; o.rto = NET19._pure.DEFAULTS.reconnectTimeoutMs;
      o.bomb = [z.length, await tryU('OCT1.' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 'a')];
      // QR: pinned matrices (verified while writing against an independent encoder and a decoder) and structure
      const h = (q) => { let x = 2166136261; for (const row of q.modules) for (const m of row) x = Math.imul(x ^ (m ? 1 : 0), 16777619) >>> 0; return q.version + ':' + q.mask + ':' + x.toString(16); };
      o.qr = [h(NET19.QR.encode('http://127.0.0.1:4051/#join=ABC-DEF', 'M')), h(NET19.QR.encode('https://dribblejerp-klunkdunker.github.io/echoes-of-the-shattered-octave/#join=KRT-4MW', 'M')), h(NET19.QR.encode('HELLO', 'L')), NET19.QR.encode('x'.repeat(400), 'M')];
      return o;
    });
    ok(JSON.stringify(pure.codes) === JSON.stringify(['KRT4MW', 'KRT4MW', 'KRT4MW', '', '', '', '', '']) && pure.rand, 'join codes: case/space/dash/link forgiven; wrong length, characters outside the alphabet, markup and junk refused; random codes valid ' + JSON.stringify(pure.codes));
    ok(pure.names[0] === 'evilx' && pure.names[1] === 'Ada Lovelace' && pure.names[2] === 24 && pure.names[3] === '' && pure.names[4] === '<img src=x onerror=alert', 'names: bidi/zero-width/control/separator characters stripped, spaces collapsed, 24-character cap (markup stays text: it only ever goes in via textContent) ' + JSON.stringify(pure.names));
    ok(JSON.stringify(pure.frames) === JSON.stringify(['sync.in', 'version', 'json', 'type', 'seq', 'deep', 'deep', 'deep', 'too-big', 'not-text', 'deep']), 'frames: version byte, JSON, type, seq, depth, __proto__/constructor keys, 64 KB link cap, non-text and key-count caps ' + JSON.stringify(pure.frames));
    {
      const ice = pure.ice || [], stun = ice.filter((s) => s.urls === 'stun:stun.l.google.com:19302'), turn = ice.filter((s) => /^turn:(eu|us)-0\.turn\.peerjs\.com:3478$/.test(s.urls) && s.username === 'peerjs' && s.credential === 'peerjsp');
      ok(ice.length === 3 && stun.length === 1 && turn.length === 2 && turn[0].urls !== turn[1].urls && ice[0] === stun[0], 'default ICE config: Google STUN first (direct preferred) plus PeerJS\'s two public TURN relays (eu-0, us-0) for mobile data; tests run with iceServers [] ' + JSON.stringify(ice.map((s) => s.urls)));
      ok(pure.rto > 0 && pure.rto <= 15000, 'a reconnect attempt that never settles is given up after reconnectTimeoutMs (' + pure.rto + ' ms)');
    }
    ok(JSON.stringify(pure.man) === JSON.stringify(['ok', 'bad-code', 'bad-code', 'bad-code', 'bad-code', 'bad-code', 'bad-code']) && pure.bomb[0] < 16384 && pure.bomb[1] === 'bad-code', 'manual codes: kind checked, size cap, prefix, SDP shape, extra keys, truncation, and a deflate bomb (' + pure.bomb[0] + ' B -> 2 MB) refused ' + JSON.stringify(pure.man));
    const QR_GOLD = ['3:1:9003c04f', '6:3:9d4fd8b5', '1:0:45b76c15'];
    console.log('  qr hashes ' + JSON.stringify(pure.qr.slice(0, 3)));
    ok(JSON.stringify(pure.qr.slice(0, 3)) === JSON.stringify(QR_GOLD) && pure.qr[3] === null, 'QR encoder: pinned matrices for a local link, the GitHub Pages link and HELLO/L; too long -> null');

    // ================================================================= 2. the session over the loopback
    const loop = await A.page.evaluate(async () => {
      const o = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
      NET19.configure({ heartbeatMs: 200, lostMs: 1200, reconnectMs: 300 });
      const { host, guest } = await NET19.loopbackPair({ latency: 15, hostName: 'Hostess', guestName: 'Guesto' });
      const got = { h: [], g: [] }, ev = { h: [], g: [] };
      for (const [k, i] of [['h', host], ['g', guest]]) {
        for (const t of ['net:peer', 'net:lost', 'net:back', 'net:closed']) i.on(t, (p) => ev[k].push(t + ':' + (p.reason || p.name || p.id)));
        i.define('test.ev', { max: 600, rate: 20, burst: 20, validate: (p) => p && Number.isInteger(p.n) && p.n >= 0 });
        i.define('test.host', { max: 200, from: 'host', validate: () => true });
        i.define('test.st', { max: 400, rate: 120, validate: (p) => p && Number.isInteger(p.n) });
        i.on('test.ev', (p, m) => got[k].push('ev' + p.n + m.from)); i.on('test.host', (p, m) => got[k].push('host:' + m.from)); i.on('test.st', (p) => got[k].push('st' + p.n));
      }
      o.roles = [host.role(), guest.role(), host.connected(), guest.connected(), host.peers()[0].name, guest.peers()[0].name];
      o.sends = [guest.send('test.ev', { n: 1 }), host.send('test.ev', { n: 2 }), guest.send('test.ev', { n: -1 }), guest.send('test.nope', {}), guest.send('net.ping', { t: 1 }), guest.send('test.ev', { n: 3, pad: 'x'.repeat(700) })];
      guest.send('test.host', {}); host.send('test.host', {});
      await wait(120);
      // a guest that forges a host-only type: its own NET19 refuses to send it? No: send() lets it go; the HOST drops it by role
      o.afterOne = { h: got.h.slice(), g: got.g.slice(), hr: host.stats().reasons };
      // rate: 60 at once against rate 20 / burst 20
      for (let i = 0; i < 60; i++) guest.send('test.ev', { n: 100 + i });
      await wait(120);
      o.rate = [got.h.filter((x) => /^ev1\d\d/.test(x)).length, host.stats().reasons.rate];
      // stale unreliable: feed raw frames out of order straight into the host's link
      const L = guest._state.link, F = NET19._pure.encodeFrame;
      L.send(F('test.st', 50, { n: 50 }), false); L.send(F('test.st', 49, { n: 49 }), false); L.send(F('test.st', 51, { n: 51 }), false);
      await wait(120);
      o.stale = [got.h.filter((x) => /^st/.test(x)).join(','), host.stats().reasons.stale];
      o.rtt = host.stats().rtt; o.unrel = guest.stats().unreliable;
      // drop without a bye: the link dies; both sides go 'lost'; the guest reconnects with its token; both get net:back
      const seen = { h: [], g: [] };
      host.on('net:state', (p) => seen.h.push(p.state)); guest.on('net:state', (p) => seen.g.push(p.state));
      L.close();
      await wait(40);
      o.lost = [seen.h[0], seen.g[0], host.peers()[0] && host.peers()[0].state];
      const t0 = performance.now();
      while (performance.now() - t0 < 5000 && !(host.connected() && guest.connected())) await wait(50);
      o.back = [host.connected(), guest.connected(), host.stats().reconnects, guest.stats().reconnects];
      o.afterBack = guest.send('test.ev', { n: 7 }); await wait(80);
      // the guest notices a drop first and comes back with its token while the host still thinks the old link is open
      const lostBefore = host.stats().lost;
      guest._state.link.onclose();
      const t1 = performance.now();
      while (performance.now() - t1 < 5000 && !(guest.connected() && host.stats().reconnects === 2)) await wait(50);
      o.early = [guest.connected(), host.connected(), host.stats().reconnects, host.stats().lost - lostBefore, host.peers().length];
      // PARTNER's call shape: on()/send() without define(), handler gets (payload) — and meta as a second argument
      const pg = [];
      host.on('p19p:in', (c, m) => pg.push('in:' + c.t + ':' + m.from)); guest.on('p19p:joined', (c) => pg.push('joined:' + c.ok));
      guest.send('p19p:in', { t: 'move', f: 1, s: 0 }, { reliable: true }); host.send('p19p:joined', { ok: true }, { reliable: true });
      await wait(120);
      o.partner = pg.slice().sort();
      // a third player is refused while the guest is there
      const third = NET19.create(); let thirdErr = null;
      try { await third.join(host.code(), { transport: NET19._transports.loop() }); } catch (e) { thirdErr = e.code; }
      o.third = [thirdErr, host.peers().length, host.peers()[0].name];
      // flood of junk -> kicked (abuse threshold for this instance)
      const h2 = NET19.create({ config: { abuse: 30 } }), g2 = NET19.create();
      const { code } = await h2.host({ transport: 'loop' }); await g2.join(code, { transport: 'loop' });
      let kicked = null; h2.on('net:closed', (p) => { kicked = p.reason; });
      for (let i = 0; i < 40; i++) g2._state.link.send('garbage' + i, true);
      await wait(250);
      o.kick = [kicked, h2.stats().state, h2.peers().length, g2.stats().state];
      // clean leave
      guest.leave(); await wait(150);
      o.leave = [host.stats().state, host.peers().length, guest.role()];
      o.ev = ev; o.got = got;
      host.leave(); h2.leave(); third.leave();
      NET19.configure({ heartbeatMs: 1000, lostMs: 4500, reconnectMs: 2500 });
      return o;
    });
    ok(JSON.stringify(loop.roles) === JSON.stringify(['host', 'guest', true, true, 'Guesto', 'Hostess']), 'loopback: roles, connected, peers carry the other name ' + JSON.stringify(loop.roles));
    ok(JSON.stringify(loop.sends) === JSON.stringify([true, true, true, true, false, false]) && loop.afterOne.hr.unknown === 1, 'send(): defined types go, an undefined one goes with the default spec but the host (who never heard of it) drops it; reserved net.* and oversized (spec.max) are refused at the sender ' + JSON.stringify(loop.sends));
    ok(loop.afterOne.h.includes('ev1guest') && loop.afterOne.g.includes('ev2host') && !loop.afterOne.h.some((x) => x === 'ev-1guest') && loop.afterOne.hr.invalid === 1 && !loop.afterOne.h.includes('host:guest') && loop.afterOne.hr.role === 1 && loop.afterOne.g.includes('host:host'), 'both directions arrive; validate() drops a bad payload; a host-only type sent by the guest is dropped by role ' + JSON.stringify(loop.afterOne));
    ok(loop.rate[0] >= 18 && loop.rate[0] <= 24 && loop.rate[1] >= 36, 'rate limit: 60 frames at once against rate 20 / burst 20 -> ' + loop.rate[0] + ' delivered, ' + loop.rate[1] + ' dropped');
    ok(loop.stale[0] === 'st50,st51' && loop.stale[1] === 1, 'unreliable frames: an older one arriving late is dropped (' + loop.stale[0] + ')');
    ok(loop.rtt >= 20 && loop.rtt < 400, 'heartbeat RTT measured: ' + loop.rtt + ' ms over a 15 ms-each-way loopback');
    ok(loop.lost[0] === 'lost' && loop.lost[1] === 'lost' && loop.back[0] && loop.back[1] && loop.back[2] === 1 && loop.back[3] === 1 && loop.afterBack, 'drop: both sides lost, the guest reconnects with its token, both back, messages flow again ' + JSON.stringify([loop.lost, loop.back]));
    ok(loop.ev.h.includes('net:lost:guest') && loop.ev.h.includes('net:back:Guesto') && loop.ev.g.includes('net:back:Hostess'), 'lifecycle events: net:lost and net:back on both sides (net:peer is checked over WebRTC below) ' + JSON.stringify(loop.ev));
    ok(JSON.stringify(loop.early) === JSON.stringify([true, true, 2, 1, 1]), 'a guest that notices the drop first is welcomed back by its token even before the host noticed; the old link is retired ' + JSON.stringify(loop.early));
    ok(JSON.stringify(loop.partner) === JSON.stringify(['in:move:guest', 'joined:true']), 'PARTNER-style use: on()/send() with no define() work both ways with the default spec ' + JSON.stringify(loop.partner));
    ok(loop.third[0] === 'full' && loop.third[1] === 1 && loop.third[2] === 'Guesto', 'a third player is refused (full) and the guest stays');
    ok(loop.kick[0] === 'kicked' && loop.kick[1] === 'hosting' && loop.kick[2] === 0 && loop.kick[3] === 'idle', 'a flood of junk frames closes the link (kicked); the host keeps hosting ' + JSON.stringify(loop.kick));
    ok(loop.leave[0] === 'hosting' && loop.leave[1] === 0 && loop.leave[2] === null && loop.ev.h.includes('net:closed:left'), 'clean leave: the host hears "left" and waits for a new guest; the guest is out of the session');

    // ================================================================= 3. BroadcastChannel between two tabs
    const B = await open(desk); allErrors.push(B.errors);
    const bcCode = await A.page.evaluate(async () => { window.__bc = NET19.create(); window.__bcGot = []; __bc.define('test.x', { validate: (p) => typeof p === 'string' }); __bc.on('test.x', (p) => __bcGot.push(p)); return (await __bc.host({ transport: 'bc', name: 'TabA' })).code; });
    const bcRes = await B.page.evaluate(async (code) => { const g = NET19.create(); g.define('test.x', { validate: () => true }); await g.join(code, { transport: 'bc', name: 'TabB' }); g.send('test.x', 'hello from tab B'); window.__g = g; return g.peers()[0].name; }, bcCode);
    await until(A.page, () => __bcGot.length === 1);
    ok(bcRes === 'TabA' && (await A.page.evaluate(() => __bcGot[0] + '|' + __bc.peers()[0].name)) === 'hello from tab B|TabB', 'BroadcastChannel: two tabs connect by code and talk');
    await B.page.evaluate(() => __g.leave()); await A.page.evaluate(() => __bc.leave()); await B.page.close();

    // ================================================================= 4. PeerJS path: desktop host + phone guest through the local stub
    broker = await startBroker(BPORT);
    const peerLoadedBefore = await A.page.evaluate(() => typeof window.Peer === 'function' || !!document.querySelector('script[src*="peerjs"]'));
    ok(!peerLoadedBefore, 'PeerJS is not loaded until someone presses Host or Join');
    const H = A.page;
    await configure(H);
    await H.locator('#btn-together').click();
    await until(H, () => G.openPanel === 'net19' && !!document.getElementById('n19-host'));
    await shot(H, 'net19-lobby-1280.png');
    await H.locator('#n19-name').fill('Sleeves');
    await H.locator('#n19-host').click();
    await until(H, () => NET19.stats().state === 'hosting' && !!document.getElementById('n19-qr'));
    const hostInfo = await H.evaluate(() => {
      const c = document.getElementById('n19-qr'), code = NET19.code();
      const q = NET19.QR.encode(NET19._pure.joinLink(code), 'M'), g = c.getContext('2d'), px = g.getImageData(0, 0, c.width, c.height).data, s = c.width / (q.size + 8);
      let same = true;
      for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) { const i = (((y + 4) * s + 1) * c.width + (x + 4) * s + 1) * 4; if ((px[i] < 128) !== q.modules[y][x]) same = false; }
      return { code, shown: document.getElementById('n19-code-show').textContent, link: NET19._pure.joinLink(code), same, peerjs: typeof window.Peer === 'function', chip: document.getElementById('n19-chip').textContent };
    });
    ok(/^[2-9A-HJKMNP-TV-Z]{6}$/.test(hostInfo.code) && hostInfo.shown === hostInfo.code.slice(0, 3) + '-' + hostInfo.code.slice(3) && hostInfo.same && hostInfo.peerjs, 'host: a six-character code shown as ' + hostInfo.shown + ', the QR on the canvas is exactly the join link ' + hostInfo.link + ', PeerJS loaded on demand');
    ok(broker.log.ids.includes('octave19-' + hostInfo.code.toLowerCase()), 'the host registered with the LOCAL broker stub as octave19-<code>');
    await shot(H, 'net19-host-lobby-1280.png');

    const phone = await browser.newContext({ ...devices['Pixel 7'] }); await guard(phone);
    // a wrong code first (typed on the phone)
    const P1 = await open(phone); allErrors.push(P1.errors);
    await shot(P1.page, 'net19-title-pixel7.png');
    await configure(P1.page);
    await P1.page.locator('#btn-together').tap();
    await until(P1.page, () => !!document.getElementById('n19-code'));
    await P1.page.locator('#n19-code').fill('ZZZ-ZZZ'); await P1.page.locator('#n19-join').tap();
    await until(P1.page, () => /No game with that code/.test(document.getElementById('n19-status').textContent));
    ok(true, 'phone: a code nobody hosts says "No game with that code" (the broker answered EXPIRE)');
    await P1.page.locator('#n19-code').fill('KR'); await P1.page.locator('#n19-join').tap();
    ok(/six letters and numbers/.test(await P1.page.locator('#n19-status').textContent()), 'phone: a malformed code is refused before any connection');
    await P1.page.close();
    // the QR link (what a phone camera opens)
    const G1 = await open(phone, '#join=' + hostInfo.shown); allErrors.push(G1.errors);
    const GP = G1.page;
    await configure(GP);
    await until(GP, () => G.openPanel === 'net19' && document.getElementById('n19-code') && document.getElementById('n19-code').value.length > 0);
    ok((await GP.locator('#n19-code').inputValue()) === hostInfo.shown && !/join=/.test(await GP.evaluate(() => location.hash)), 'phone: the scanned link opens Play together with the code filled in (and clears it from the address)');
    await GP.locator('#n19-name').fill('Brother');
    await shot(GP, 'net19-guest-join-pixel7.png');
    await GP.locator('#n19-join').tap();
    await until(GP, () => NET19.connected() && document.getElementById('n19-guest-line'), null, 20000);
    await until(H, () => NET19.connected() && /Brother has joined/.test(document.getElementById('n19-status').textContent));
    const conn = await Promise.all([H.evaluate(() => [NET19.role(), NET19.peers()[0].name, NET19.stats().transport]), GP.evaluate(() => [NET19.role(), NET19.peers()[0].name, document.getElementById('n19-guest-line').textContent])]);
    ok(conn[0].join() === 'host,Brother,peer' && conn[1].join() === 'guest,Sleeves,Connected to Sleeves.', 'connected over WebRTC via the stub: ' + JSON.stringify(conn));
    await GP.waitForTimeout(1200);
    await shot(GP, 'net19-guest-connected-pixel7.png');
    await shot(H, 'net19-host-joined-1280.png');

    // messages both ways, reliable and lossy, while the host plays
    await H.locator('#n19-continue').click();
    await toGame(H, 'Sleeves');
    for (const pg of [H, GP]) {
      await pg.evaluate(() => {
        window.__got = []; NET19.define('test.ev', { max: 1024, rate: 60, validate: (p) => p && typeof p.s === 'string' && p.s.length < 200 });
        NET19.define('test.snap', { max: 4096, rate: 60, burst: 60, from: 'host', validate: (p) => p && Number.isInteger(p.n) });
        NET19.on('test.ev', (p, m) => __got.push('ev:' + p.s + ':' + m.from)); NET19.on('test.snap', (p, m) => __got.push('snap:' + p.n + ':' + m.reliable));
      });
    }
    await GP.evaluate(() => NET19.send('test.ev', { s: 'hello host' }));
    const f0 = await H.evaluate(() => G.time || 0);
    await H.evaluate(() => { let n = 0; window.__snapT = setInterval(() => { NET19.send('test.snap', { n: n++, pad: 'x'.repeat(300) }, { reliable: false }); window.__snapN = n; if (n >= 40) clearInterval(__snapT); }, 50); NET19.send('test.ev', { s: 'hello guest' }); });
    // the host's game is busy drawing in a headless browser, so its 50 ms timer runs slow: wait for all 40 to be sent
    await until(H, () => window.__snapN >= 40, null, 30000); await GP.waitForTimeout(800);
    const msgs = await Promise.all([H.evaluate(() => __got), GP.evaluate(() => [__got, NET19.stats()])]);
    const snaps = msgs[1][0].filter((x) => /^snap:/.test(x));
    ok(msgs[0].includes('ev:hello host:guest') && msgs[1][0].includes('ev:hello guest:host'), 'reliable events both ways over WebRTC');
    ok(snaps.length >= 36 && snaps.every((x) => /:false$/.test(x)) && msgs[1][1].unreliable === true, 'lossy unordered state channel: ' + snaps.length + '/40 snapshots at 20 Hz arrived as unreliable ' + JSON.stringify(msgs[1][1].reasons));
    ok(msgs[1][1].rtt > 0 && msgs[1][1].rtt < 500 && msgs[1][1].kbpsIn > 0, 'guest stats: rtt ' + msgs[1][1].rtt + ' ms, ' + msgs[1][1].kbpsIn + ' KB/s in');
    const hostChip = await H.evaluate(() => { const c = document.getElementById('n19-chip'); return [c.hidden, c.textContent, c.className]; });
    ok(!hostChip[0] && /^Together · Brother · \d+ ms$/.test(hostChip[1]) && hostChip[2] === 'n19-on', 'the host sees the connection chip over the game: ' + hostChip[1]);
    for (const p of ['medium', 'cinematic']) { await H.evaluate((n) => PRESETS.apply(n), p); await H.waitForTimeout(500); await shot(H, 'net19-host-ingame-' + p + '.png'); }

    // a third player is refused
    const third = await browser.newContext({ viewport: { width: 900, height: 560 } }); await guard(third);
    const T = await open(third); allErrors.push(T.errors);
    await configure(T.page);
    const thirdErr = await T.page.evaluate(async (c) => { try { await NET19.join(c); return 'joined'; } catch (e) { return e.code; } }, hostInfo.code);
    ok(thirdErr === 'full' && (await H.evaluate(() => NET19.peers()[0].name)) === 'Brother', 'a third player gets "full"; the brother stays connected');
    await third.close();

    // hostile frames from the guest and a hostile name: dropped/escaped
    const hostile = await GP.evaluate(() => {
      const L = NET19._state.link, F = NET19._pure.encodeFrame;
      L.send('nonsense', true); L.send(String.fromCharCode(2) + '["test.ev",1,{"s":"x"}]', true); L.send(F('test.ev', 9, { s: 'y'.repeat(300) }), true);
      L.send(F('test.snap', 9, { n: 1 }), true); L.send(F('test.ev', 9, { s: '<img src=x onerror="window.__pwned=1">' }), true); L.send(F('net.welcome', 9, { v: 1, token: 'abcdefgh1234' }), true);
      return true;
    });
    await H.waitForTimeout(400);
    const hr = await H.evaluate(() => [NET19.stats().reasons, __got.filter((x) => /onerror/.test(x)).length, !!window.__pwned, document.querySelectorAll('img[src="x"]').length]);
    ok(hostile && hr[0].version >= 2 && hr[0].invalid >= 1 && hr[0].role >= 2 && hr[1] === 1 && !hr[2] && hr[3] === 0, 'hostile frames from the guest: wrong version, invalid payload, host-only types and a forged welcome dropped; markup in a payload stays a string, never markup ' + JSON.stringify(hr[0]));

    // drop: kill the guest's WebRTC connection; the host carries on alone; the guest comes back through the broker
    const pos0 = await H.evaluate(() => Engine.cam.x + ',' + Engine.cam.y);
    // close the guest's link without a bye (its WebRTC channels go down); nothing tells the host but the channel and the heartbeat
    await GP.evaluate(() => NET19._state.link.close());
    await until(H, () => NET19.stats().state === 'lost' && /Connection lost/.test(document.getElementById('n19-chip').textContent), null, 8000);
    const lostState = await H.evaluate(() => [NET19.peers()[0].state, G.state]);
    await H.keyboard.down('w'); await H.waitForTimeout(400); await H.keyboard.up('w');
    const pos1 = await H.evaluate(() => Engine.cam.x + ',' + Engine.cam.y);
    ok(lostState[0] === 'lost' && lostState[1] === 'play' && pos1 !== pos0, 'drop: the host sees "Connection lost" and plays on alone (state ' + lostState[1] + ')');
    await until(H, () => NET19.connected() && NET19.stats().reconnects === 1, null, 20000);
    await until(GP, () => NET19.connected() && NET19.stats().reconnects === 1, null, 5000);
    await GP.evaluate(() => NET19.send('test.ev', { s: 'back again' }));
    await until(H, () => __got.includes('ev:back again:guest'));
    ok(true, 'reconnect: the same guest is welcomed back with its token through the broker; messages flow again');
    // broker connection drop: the host stays findable
    const hostPeerId = 'octave19-' + hostInfo.code.toLowerCase();
    broker.peers.get(hostPeerId).sock.destroy();
    await new Promise((r) => setTimeout(r, 3000));
    ok(broker.peers.has(hostPeerId) && (await H.evaluate(() => NET19.connected())), 'the broker connection dropped: the host re-registers by itself and the WebRTC link stays up');
    // clean leave from the phone
    await GP.evaluate(() => NET19.ui.open());
    await GP.locator('#n19-leave').tap();
    await until(H, () => NET19.stats().state === 'hosting' && NET19.peers().length === 0);
    ok((await GP.evaluate(() => NET19.role())) === null && (await H.evaluate(() => /Hosting/.test(document.getElementById('n19-chip').textContent))), 'clean leave from the phone: the host hears it and is hosting again');
    await H.evaluate(() => NET19.leave());
    ok((await H.evaluate(() => [NET19.role(), document.getElementById('n19-chip').hidden])).join() === ',true', 'stop hosting: role null, chip hidden');
    await GP.close();

    // ================================================================= 5. manual codes with NO broker at all
    await broker.stop(); broker = null;
    const connsBefore = wsUrls.length;
    const ip = await browser.newContext({ ...devices['iPhone 14'] }); await guard(ip);
    const H2 = await open(desk); allErrors.push(H2.errors); const I1 = await open(ip); allErrors.push(I1.errors);
    for (const pg of [H2.page, I1.page]) await configure(pg);
    await H2.page.locator('#btn-together').click(); await H2.page.locator('#n19-manual').click();
    await H2.page.locator('#n19-name').fill('Host by hand');
    await H2.page.locator('#n19-man-offer').click();
    await until(H2.page, () => document.getElementById('n19-man-offer-text') && document.getElementById('n19-man-offer-text').value.length > 20, null, 15000);
    const offer = await H2.page.locator('#n19-man-offer-text').inputValue();
    await I1.page.locator('#btn-together').tap(); await I1.page.locator('#n19-manual').tap();
    await I1.page.locator('#n19-name').fill('Phone by hand');
    await I1.page.locator('#n19-man-offer-in').fill(offer);
    await I1.page.locator('#n19-man-answer').tap();
    await until(I1.page, () => document.getElementById('n19-man-answer-text') && document.getElementById('n19-man-answer-text').value.length > 20, null, 15000);
    const answer = await I1.page.locator('#n19-man-answer-text').inputValue();
    await shot(I1.page, 'net19-manual-iphone14.png');
    await shot(H2.page, 'net19-manual-host-1280.png');
    // a garbled answer first
    await H2.page.locator('#n19-man-answer-in').fill(answer.slice(0, 40)); await H2.page.locator('#n19-man-connect').click();
    await until(H2.page, () => /not right/.test(document.getElementById('n19-status').textContent));
    await H2.page.locator('#n19-man-answer-in').fill(answer); await H2.page.locator('#n19-man-connect').click();
    await until(H2.page, () => NET19.connected(), null, 20000); await until(I1.page, () => NET19.connected(), null, 10000);
    const man = await Promise.all([H2.page.evaluate(() => [NET19.role(), NET19.peers()[0].name, NET19.stats().transport, NET19.stats().unreliable]), I1.page.evaluate(() => [NET19.role(), NET19.peers()[0].name])]);
    for (const pg of [H2.page, I1.page]) await pg.evaluate(() => { window.__got = []; NET19.define('test.ev', { validate: (p) => typeof p === 'string' }); NET19.on('test.ev', (p) => __got.push(p)); });
    await I1.page.evaluate(() => NET19.send('test.ev', 'by hand')); await until(H2.page, () => __got[0] === 'by hand');
    ok(man[0].join() === 'host,Phone by hand,manual,true' && man[1].join() === 'guest,Host by hand' && offer.length < 4000 && answer.length < 4000, 'codes by hand with no broker running: invitation (' + offer.length + ' chars) -> answer (' + answer.length + ' chars) -> connected, lossy channel too, messages flow; a garbled answer is refused');
    ok(wsUrls.length === connsBefore, 'the manual path opened no WebSocket at all');
    await shot(H2.page, 'net19-manual-connected-1280.png');
    await I1.page.evaluate(() => NET19.leave()); await until(H2.page, () => NET19.peers().length === 0);
    await H2.page.evaluate(() => NET19.leave());
    await ip.close();

    // ================================================================= 6. single-player unchanged (module loaded vs blocked)
    const trace = async (block) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await guard(ctx);
      if (block) await ctx.route(/js\/net19\.js/, (r) => r.abort());
      const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
      // a page with no animation loop and a still clock: the game only moves when the trace calls update(), so two pages
      // can be compared step for step
      await pg.addInitScript(() => {
        let s = 19019; window.__rc = 0; Math.random = () => { window.__rc++; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
        window.__clk = 500000; performance.now = () => window.__clk; Date.now = () => 1790000000000 + Math.floor(window.__clk);
        window.requestAnimationFrame = () => 0;
      });
      await pg.addInitScript((b) => { window.__noNet = b; }, block);
      await pg.goto(URL0 + '/?nosw=1');
      await pg.waitForFunction(() => typeof Engine !== 'undefined' && typeof G !== 'undefined' && G.state === 'title');
      const loadRc = await pg.evaluate(() => [window.__rc, typeof NET19, !!document.getElementById('btn-together'), typeof window.Peer]);
      await toGame(pg, 'Trace');
      const out = await pg.evaluate(() => {
        // a fixed clock for the walk, so frames that animate with time compare exactly
        let s = 4242; window.__rc = 0; Math.random = () => { window.__rc++; s = (s * 16807) % 2147483647; return s / 2147483647; };
        G.keys = {}; const tr = [];
        const fnv = (u8) => { let h = 2166136261; for (let i = 0; i < u8.length; i += 7) h = Math.imul(h ^ u8[i], 16777619) >>> 0; return h.toString(16); };
        for (let i = 0; i < 600; i++) {
          G.keys = {}; const ph = Math.floor(i / 60) % 4; if (ph === 0) G.keys.w = G.keys.KeyW = true; else if (ph === 1) G.keys.d = G.keys.KeyD = true; else if (ph === 2) G.keys.s = G.keys.KeyS = true;
          window.__clk += 1000 / 60; update(1 / 60);
          if (i % 30 === 0) { render(); tr.push([Engine.cam.x.toFixed(4), Engine.cam.y.toFixed(4), Math.round(G.player.hp * 100), G.ents.length, fnv(Engine.ctx.getImageData(0, 0, Engine.canvas.width, Engine.canvas.height).data)].join('|')); }
        }
        G.keys = {};
        const snap = JSON.stringify(snapshotGame());
        return { tr: tr.join('\n'), rc: window.__rc, snap };
      });
      const r = { load: loadRc, errs, ...out };
      await ctx.close();
      return r;
    };
    const withNet = await trace(false), noNet = await trace(true), withNet2 = await trace(false);
    console.log('  control (module, run 2): trace ' + (withNet.tr === withNet2.tr) + ', rc ' + withNet.rc + '/' + noNet.rc + '/' + withNet2.rc + ', snap ' + (withNet.snap === withNet2.snap));
    if (withNet.tr !== noNet.tr) console.log('  trace diff:\n  ' + withNet.tr.split('\n').map((l, i) => l + '  <>  ' + noNet.tr.split('\n')[i] + '  ||  ' + withNet2.tr.split('\n')[i]).filter((l) => { const [a, b] = l.split('  <>  '); return a !== b.split('  ||  ')[0]; }).slice(0, 4).join('\n  '));
    ok(withNet.load[1] === 'object' && noNet.load[1] === 'undefined' && withNet.load[2] && !noNet.load[2] && withNet.load[3] === 'undefined', 'trace pages: one with net19 (button present, PeerJS not loaded), one with net19.js blocked');
    ok(withNet.load[0] === noNet.load[0], 'loading the module makes no Math.random calls (' + withNet.load[0] + ' = ' + noNet.load[0] + ' calls up to the title)');
    ok(withNet.tr === noNet.tr && withNet.tr.split('\n').length === 20, 'seeded 600-step walk: positions, HP, entity count and 20 frame hashes identical with and without the module');
    ok(withNet.rc === noNet.rc, 'same number of Math.random calls during play (' + withNet.rc + ')');
    ok(withNet.snap === noNet.snap && withNet.snap.length > 1000, 'the save snapshot is byte-identical (' + withNet.snap.length + ' bytes)');
    ok(!withNet.errs.length && !noNet.errs.length, 'no page errors in the trace pages (' + withNet.errs.concat(noNet.errs).join('; ') + ')');

    // ================================================================= 7. fit, French, errors
    const small = await browser.newContext({ viewport: { width: 640, height: 400 } }); await guard(small);
    const S = await open(small); allErrors.push(S.errors);
    const fit = [];
    for (const view of ['menu', 'manual']) {
      await S.page.evaluate((v) => NET19.ui.open(v), view);
      await S.page.waitForTimeout(150);
      fit.push(await S.page.evaluate(() => { const p = document.getElementById('modal-panel'); return [p.scrollWidth <= p.clientWidth + 1, document.documentElement.scrollWidth <= innerWidth + 1]; }));
      await shot(S.page, 'net19-' + view + '-640x400.png');
    }
    const opt = await S.page.evaluate(() => { closeModal(); renderAccessibilityMenu(); const b = document.getElementById('n19-opt'); if (!b) return 'no row'; const t = b.textContent; b.click(); return t + '|' + G.openPanel + '|' + !!document.getElementById('n19-host'); });
    ok(opt === 'Open|net19|true', 'Options (Graphics & access) has a Play together row that opens the lobby: ' + opt);
    ok(fit.every((f) => f[0] && f[1]), 'the lobby fits 640x400 with no horizontal overflow ' + JSON.stringify(fit));
    await small.close();
    const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/p19-net.tsv'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')[0]);
    const texts = await A.page.evaluate(() => NET19.TEXTS);
    const missing = texts.filter((t) => !tsv.includes(t));
    ok(!missing.length, 'French: every UI string has a line in tools/i18n/p19-net.tsv' + (missing.length ? ' (missing: ' + missing.join(' | ') + ')' : ''));
    const ext = external.filter((u) => !/favicon/.test(u));
    ok(!ext.length && wsUrls.every((u) => LOCAL.test(u)) && !wsUrls.some((u) => /peerjs\.com/.test(u)), 'nothing left this machine: ' + wsUrls.length + ' WebSockets, all to the local stub; blocked external requests: ' + (ext.join(', ') || 'none'));
    const errs = allErrors.flat();
    ok(!errs.length, 'no page errors (' + errs.join('; ') + ')');
    await desk.close(); await phone.close();
  } catch (e) {
    console.log('FAIL exception: ' + (e && e.stack || e));
    fails++;
  } finally {
    if (broker) await broker.stop();
    await browser.close();
  }
  console.log(fails ? 'FAILED ' + fails : 'OK net19');
  process.exit(fails ? 1 : 0);
})();
