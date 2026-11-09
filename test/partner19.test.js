// PREVIEW_URL=http://127.0.0.1:4053 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/partner19.test.js
// Phase 19 PARTNER: the second traveller, driven hot-seat through the local API (no network: NET19 and SYNC19 are not
// needed, and nothing here touches a broker or the internet). Join / leave and card validation, aggro split, the
// revive window, both down -> the host's death screen, shared XP, loot by turns, scaling for two, the story read-only
// for the guest, the write-back applied only to the guest's own save (a second browser context on a phone profile,
// isolated through EXTRAS17) and validated, the figure drawn and readable (screenshots), single-player unchanged
// against a page with js/partner19.js blocked (seeded trace, frames, save code), no page errors. Never starts a server.
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { chromium, devices } = pw;
const BASE = (process.env.PREVIEW_URL || 'http://127.0.0.1:4053').replace(/\/$/, '');
const URL_ = BASE + '/?nosw=1';
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

let passed = 0;
async function step(name, fn) { await fn(); passed++; console.log('PASS ' + name); }

async function boot(ctx, opts) {
  opts = opts || {};
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !(opts.block && /ERR_FAILED|partner19/.test(t))) errors.push('console: ' + t);
    if (m.type() === 'warning' && /partner19|render hook/.test(t)) errors.push('console: ' + t);
  });
  if (opts.block) await page.route('**/js/partner19.js*', (r) => r.abort());
  await page.addInitScript(() => { let s = 424242; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; });
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.evaluate(() => { GFX.illustratedScreens = false; });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(opts.name || 'Host Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').nth(opts.cls || 0).click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play');
  await page.waitForTimeout(300);
  await page.evaluate(HELPERS);
  return { page, errors };
}

const HELPERS = () => {
  window.requestAnimationFrame = () => 0;   // the game loop must not run between our steps
  window.__seed = (n) => { let s = ((Math.imul(n || 777, 2654435761) >>> 0) % 2147483646) + 1; window.__rc = 0; Math.random = () => { window.__rc++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
  window.__stage = (map, x, y, dir) => {
    GFX.illustratedScreens = false;
    loadMap(map || 'clearing', { x: x == null ? 12.5 : x, y: y == null ? 11.5 : y, dir: dir == null ? -Math.PI / 2 : dir });
    G.state = 'play'; G.fadeT = 0; G.keys = {}; G.vel.x = G.vel.y = 0; G.dead = false; G.noise = 2;
    for (let i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].kind === 'enemy') G.ents.splice(i, 1);
    try { closeModal(); hide('#event'); hide('#death'); } catch (e) { /* none */ }
    G.player.hp = G.player.hpMax;
  };
  window.__spawn = (type, x, y, chase) => { const e = hydrate({ kind: 'enemy', type, x, y }); if (chase) { e.state = 'chase'; e.alertT = 99; } G.ents.push(e); return e; };
  window.__card = (over) => Object.assign({ v: 1, token: 'Tok3nAbcd1234XYZ', name: 'Brother', cls: 'corsair', face: 3, level: 4, xp: 10,
    attrs: Object.assign({}, CLASSES.find((c) => c.id === 'corsair').attrs), weapons: ['sword', 'pistol'], weapon: 0, armor: { body: 'a_jerkin', feet: 'a_hobnails' }, pellets: 5, bolts: 0, glass: 0 }, over || {});
  window.__put = (x, y, dir) => { const S = PARTNER19.S; S.x = x; S.y = y; if (dir != null) S.dir = dir; S.feet = 0; S.prox.x = x; S.prox.y = y; S.vx = S.vy = 0; };
  window.__run = (n, dt, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); update(dt || 1 / 30); } };
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const pages = [];
  try {
    const H = await boot(hostCtx, { name: 'Host Tester' }); pages.push(H);
    const page = H.page, Q = (fn, arg) => page.evaluate(fn, arg);

    // ================================================================ 1. join / leave, card validation
    await step('join/leave: the contract is there, a card joins, one partner at a time, the partner is never an entity, leave returns the write-back and clears the world', async () => {
      const r = await Q(() => {
        __stage();
        const o = { fns: ['join', 'input', 'leave', 'pause', 'active', 'snapshot', 'hostState', 'onStory', 'drainFeed'].filter((k) => typeof PARTNER19[k] !== 'function'),
          gfns: ['card', 'enter', 'returnHome', 'applyWriteBack', 'showStory', 'hideStory'].filter((k) => typeof PARTNER19.guest[k] !== 'function') };
        const n0 = G.ents.length, flags0 = JSON.stringify(G.flags);
        o.j = PARTNER19.join(__card(), { seed: 9 }); o.active = PARTNER19.active(); o.snap = PARTNER19.snapshot();
        o.again = PARTNER19.join(__card({ token: 'OtherToken99' }));
        o.ents = G.ents.length === n0 && !G.ents.some((e) => e && (e.partner19 || e === PARTNER19.S.prox));
        o.allMaps = Object.keys(G.maps).every((id) => !G.maps[id].entities.some((e) => e === PARTNER19.S.prox));
        o.hud = !!document.getElementById('p19p-hud') && document.querySelector('#p19p-hud .n').textContent;
        o.wb = PARTNER19.leave(); o.after = PARTNER19.active(); o.hudGone = !document.getElementById('p19p-hud');
        o.flags = JSON.stringify(G.flags) === flags0; o.leaveAgain = PARTNER19.leave();
        return o;
      });
      assert.deepEqual(r.fns, []); assert.deepEqual(r.gfns, []);
      assert.ok(r.j.ok && r.active && r.snap && r.snap.name === 'Brother' && r.snap.cls === 'corsair' && r.snap.map === 'clearing', JSON.stringify(r.j));
      assert.deepEqual(r.again, { ok: false, reason: 'full' });
      assert.ok(r.ents && r.allMaps, 'the partner is not in G.ents or any map');
      assert.equal(r.hud, 'Brother');
      assert.ok(r.wb && r.wb.v === 1 && r.wb.token === 'Tok3nAbcd1234XYZ' && r.wb.xp === 0 && Array.isArray(r.wb.items), JSON.stringify(r.wb));
      assert.ok(!r.after && r.hudGone && r.flags && r.leaveAgain === null);
    });

    await step('card validation: impossible stats and items are clamped or dropped, health is computed (never taken from the card), hostile cards are refused', async () => {
      const r = await Q(() => {
        const V = (c) => PARTNER19.validateCard(c);
        const o = {};
        const big = V(__card({ level: 999, xp: 1e9, attrs: { Strength: 999, Intelligence: -5, Willpower: 'x', Agility: 1e6, Endurance: 100, Personality: 0, Speed: 70, Luck: 65 },
          weapons: ['sword', 'glass', 'nope', 'sword', 'pistol', '__proto__'], weapon: 77, armor: { head: 'a_jerkin', body: 'a_plate', feet: 'zzz' }, hpMax: 9999, hp: 9999, pellets: 1e6, glass: 300 }));
        o.big = { ok: big.ok, level: big.char.level, xp: big.char.xp, attrs: big.char.attrs, weapons: big.char.weapons, weapon: big.char.weapon, armor: big.char.armor, hpMax: big.char.hpMax, pellets: big.char.pellets, glass: big.char.glass, clamped: big.clamped.length };
        const cls = CLASSES.find((c) => c.id === 'corsair'); o.base = cls.attrs; o.hpExpect = cls.hp + Math.floor(big.char.attrs.Endurance / 10) + 29 * (4 + Math.floor(big.char.attrs.Endurance / 20));
        o.name = V(__card({ name: '<img src=x onerror="window.__pwn=1">Bob' })).char.name;
        o.refused = {
          notObj: V('hello').reason, arr: V([1]).reason, ver: V(__card({ v: 2 })).reason, tok: V(__card({ token: 'short' })).reason, tok2: V(__card({ token: '<script>alert(1)</script>' })).reason,
          cls: V(__card({ cls: 'archmage' })).reason, hard: V(__card({ hardcore: true })).reason, big: V(__card({ junk: 'x'.repeat(9000) })).reason,
        };
        const glass = V(__card({ cls: 'blade', weapons: ['glass', 'sword'], attrs: CLASSES[0].attrs }));
        o.bladeGlass = glass.char.weapons;
        const noW = V(__card({ weapons: [] })); o.noW = noW.char.weapons; o.corsairW = CLASSES.find((c) => c.id === 'corsair').weapons;
        o.joinBad = PARTNER19.join({ v: 1 }); o.active = PARTNER19.active();
        return o;
      });
      assert.equal(r.big.ok, true); assert.equal(r.big.level, 30); assert.ok(r.big.xp < Math.floor(60 * Math.pow(30, 1.5)));
      for (const k in r.big.attrs) { assert.ok(r.big.attrs[k] >= 1 && r.big.attrs[k] <= 100, k + ' ' + r.big.attrs[k]); assert.ok(Math.abs(r.big.attrs[k] - r.base[k]) <= 30, k + ' stays near the calling: ' + r.big.attrs[k] + ' vs ' + r.base[k]); }
      assert.equal(r.big.attrs.Willpower, r.base.Willpower, 'a non-number falls back to the calling');
      assert.deepEqual(r.big.weapons, ['sword', 'pistol'], 'unknown, duplicate and innate-for-another-calling weapons are dropped');
      assert.equal(r.big.weapon, 1); assert.deepEqual(r.big.armor, { body: 'a_plate' }, 'armour in the wrong slot or unknown is dropped');
      assert.equal(r.big.hpMax, r.hpExpect, 'health is computed from calling, Endurance and level');
      assert.equal(r.big.pellets, 99); assert.equal(r.big.glass, 0, 'only a glassed calling carries glass');
      assert.ok(r.big.clamped >= 8);
      assert.ok(!/[<>"]/.test(r.name), 'the name is scrubbed: ' + r.name);
      assert.deepEqual(r.refused, { notObj: 'not-a-card', arr: 'not-a-card', ver: 'version', tok: 'token', tok2: 'token', cls: 'calling', hard: 'hardcore', big: 'too-big' });
      assert.deepEqual(r.bladeGlass, ['glass', 'sword']); assert.deepEqual(r.noW, r.corsairW, 'no weapons: the calling\'s own');
      assert.equal(r.joinBad.ok, false); assert.equal(r.active, false);
    });

    await step('input: shape, ranges, size and rate are checked; the guest may only act as itself; story commands are refused', async () => {
      const r = await Q(() => {
        __stage(); PARTNER19.join(__card(), { seed: 3 }); __put(12.5, 13.5, -Math.PI / 2);
        const I = (c) => PARTNER19.input(c), o = {};
        o.ok = I({ t: 'move', f: 1, s: 0 }).ok; o.held = Object.assign({}, PARTNER19.S.held);
        o.bigF = I({ t: 'move', f: 50, s: -50 }).ok && PARTNER19.S.held.f === 1 && PARTNER19.S.held.s === -1;
        o.nan = I({ t: 'move', f: NaN, s: 0 }).reason; o.str = I({ t: 'look', dir: '1' }).reason; o.unknown = I({ t: 'teleport', x: 1 }).reason;
        o.shape = [I(null).reason, I([1]).reason, I({}).reason]; o.size = I({ t: 'move', f: 0, s: 0, pad: 'x'.repeat(3000) }).reason;
        o.who = I({ t: 'attack', who: 'SomeoneElse1' }).reason; o.weapon = I({ t: 'weapon', i: 9 }).reason; o.label = I({ t: 'attack', label: '<b>' }).reason;
        o.story = ['choose', 'talk', 'flag', 'quest', 'interact', 'save'].map((t) => I({ t, i: 0, k: 'escaped', v: true }).reason);
        // rate: a burst far over the bucket is cut off
        PARTNER19.S.bucket = PARTNER19.B.BURST; let refusedRate = 0; for (let i = 0; i < 300; i++) if (I({ t: 'look', dir: 0 }).reason === 'rate') refusedRate++;
        o.rate = refusedRate; PARTNER19.S.bucket = PARTNER19.B.BURST; PARTNER19.S.lastIn = 0;
        I({ t: 'move', f: 0, s: 0 });
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.ok && r.held.f === 1 && r.bigF);
      assert.equal(r.nan, 'range'); assert.equal(r.str, 'range'); assert.equal(r.unknown, 'unknown');
      assert.deepEqual(r.shape, ['shape', 'shape', 'shape']); assert.equal(r.size, 'too-big');
      assert.equal(r.who, 'not-yours'); assert.equal(r.weapon, 'range'); assert.equal(r.label, 'range');
      assert.deepEqual(r.story, Array(6).fill('story-is-the-hosts'));
      assert.ok(r.rate >= 150, 'rate limit cuts a 300-message burst: ' + r.rate);
    });

    // ================================================================ 2. movement and "come with me"
    await step('movement: the partner walks by its own inputs, collides with walls and the host, and follows the host to a new map', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 4 }); __put(12.5, 13.5, -Math.PI / 2);
        const y0 = PARTNER19.S.y;
        PARTNER19.input({ t: 'move', f: 1, s: 0 }); __run(15);
        const o = { moved: y0 - PARTNER19.S.y, hostDist: Math.hypot(PARTNER19.S.x - Engine.cam.x, PARTNER19.S.y - Engine.cam.y) };
        __run(60); o.stillApart = Math.hypot(PARTNER19.S.x - Engine.cam.x, PARTNER19.S.y - Engine.cam.y);
        PARTNER19.input({ t: 'move', f: 0, s: 0 });
        __stage('oakhaven', 23.5, 6.5, Math.PI / 2); update(1 / 30);
        o.map = PARTNER19.S.map; o.near = Math.hypot(PARTNER19.S.x - Engine.cam.x, PARTNER19.S.y - Engine.cam.y);
        o.solid = solidAt(PARTNER19.S.x, PARTNER19.S.y, null);
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.moved > 0.5, 'walked forward ' + r.moved);
      assert.ok(r.stillApart >= 0.55, 'cannot walk into the host: ' + r.stillApart);
      assert.equal(r.map, 'oakhaven'); assert.ok(r.near < 2.5, 'arrives beside the host: ' + r.near);
      assert.equal(r.solid, true, 'the host cannot walk through the partner either');
    });

    // ================================================================ 3. aggro split
    await step('aggro: each enemy chooses one traveller; the partner is noticed, struck and chased; threat pulls an enemy over; the host takes no blow meant for the partner', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); __seed(11);
        PARTNER19.join(__card(), { seed: 21 }); __put(12.5, 18.5, Math.PI / 2);
        G.player.hpMax = G.player.hp = 500; PARTNER19.S.pp.hpMax = PARTNER19.S.pp.hp = 500;
        const a = __spawn('legionnaire', 12.5, 9.8, true), b = __spawn('legionnaire', 12.5, 20.2, false);
        const hp0 = G.player.hp;
        __run(150, 1 / 30, (i) => __seed(100 + i));
        const o = { at: a.p19t, bt: b.p19t, bState: b.state, hostLost: hp0 - G.player.hp, partnerLost: 500 - PARTNER19.S.pp.hp, bNear: Math.hypot(b.x - PARTNER19.S.x, b.y - PARTNER19.S.y), aNear: Math.hypot(a.x - Engine.cam.x, a.y - Engine.cam.y), hits: PARTNER19.stats.partnerHits, hostHits: PARTNER19.stats.hostHits, msgs: Array.from(document.querySelectorAll('#msgs .m')).map((m) => m.textContent).slice(-5) };
        // threat: the partner (further away) hurts a hard, and a turns to it
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.S.map = G.mapId; __put(12.5, 8.8, Math.PI / 2);
        const c = __spawn('legionnaire', 12.5, 10.3, true); c.hp = 9999; c.hpMax = 9999;
        __run(3); o.cBefore = c.p19t;
        for (let i = 0; i < 12; i++) { PARTNER19.S.atkT = 0; PARTNER19.S.dir = Math.atan2(c.y - PARTNER19.S.y, c.x - PARTNER19.S.x); PARTNER19.input({ t: 'attack' }); __run(1); }
        o.threat = c.p19th ? c.p19th[1] : 0; __run(30, 1 / 30, () => { c.stun = 0; });
        o.cAfter = c.p19t;
        PARTNER19.leave('silent');
        return o;
      });
      assert.equal(r.at, 'host'); assert.equal(r.bt, 'guest', 'the enemy near the partner chose the partner'); assert.equal(r.bState, 'chase');
      assert.ok(r.partnerLost > 0 && r.hits > 0, 'the partner was struck: ' + r.partnerLost);
      assert.ok(r.bNear < 1.6 && r.aNear < 1.6, 'each closed on its own target: ' + r.bNear + ' ' + r.aNear);
      assert.ok(r.hostHits > 0 || r.msgs.some((m) => /Legionnaire's blow/.test(m)), 'the host fought its own enemy (struck or dodged): ' + JSON.stringify(r));
      assert.equal(r.cBefore, 'host'); assert.ok(r.threat > 15, 'threat built: ' + r.threat); assert.equal(r.cAfter, 'guest', 'threat pulled it to the partner');
    });

    await step('aggro: an enemy fighting the partner never reaches the host (no damage, no glass lock, no message on the host line)', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 5 }); __put(12.5, 17.5, Math.PI / 2);
        PARTNER19.S.pp.hpMax = PARTNER19.S.pp.hp = 900;
        const p = __spawn('proctor', 12.5, 18.6, true); p.p19t = 'guest'; p.p19r = 99;
        G.player.glassed = true; G.glassLock = 0; const hp0 = G.player.hp; document.getElementById('msgs').innerHTML = '';
        __run(240, 1 / 30, (i) => __seed(300 + i));
        const o = { hostHp: hp0 - G.player.hp, lock: G.glassLock, msgs: Array.from(document.querySelectorAll('#msgs .m')).map((m) => m.textContent).filter((t) => /hits you|blow|strikes your glass/.test(t)), plost: 900 - PARTNER19.S.pp.hp, feed: PARTNER19.drainFeed().length };
        PARTNER19.leave('silent');
        return o;
      });
      assert.equal(r.hostHp, 0); assert.equal(r.lock, 0); assert.deepEqual(r.msgs, []);
      assert.ok(r.plost > 0 && r.feed > 0, 'the partner was hit and told on its own feed');
    });

    // ================================================================ 4. downed and revive
    await step('revive: a downed partner is lifted by the host standing beside it; enemies leave a downed traveller alone', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 6 }); __put(12.5, 16.5, Math.PI / 2);
        const S = PARTNER19.S, B = PARTNER19.B; S.pp.hp = 1;
        const e = __spawn('legionnaire', 12.5, 17.6, true); e.p19t = 'guest'; e.p19r = 99;
        __run(120, 1 / 30, (i) => { __seed(500 + i); });
        const o = { down: S.down, hp: S.pp.hp, eTarget: e.p19t, hud: document.querySelector('#p19p-hud .s').textContent };
        e.hidden = true;
        Engine.cam.x = 12.5; Engine.cam.y = 15.6; __run(Math.ceil(B.REVIVE_TIME * 30) - 10); o.mid = S.down; o.prog = S.revive;
        __run(20); o.lifted = !S.down; o.hpAfter = S.pp.hp; o.expect = Math.ceil(S.pp.hpMax * B.REVIVE_HP);
        // away from them, progress drains and the window runs out: carried to the lamp
        S.pp.hp = 0; S.down = false; PARTNER19.S.down = false;
        PARTNER19.input({ t: 'move', f: 0, s: 0 });
        S.pp.hp = 1; e.hidden = false; e.dead = false; e.hp = 999; e.x = 12.5; e.y = 17.6; e.state = 'chase'; e.p19t = 'guest'; e.p19r = 99;
        __run(200, 1 / 30, (i) => { __seed(900 + i); });
        o.down2 = S.down; e.hidden = true;
        Engine.cam.x = 12.5; Engine.cam.y = 5.5;
        __run(Math.ceil(B.DOWN_WINDOW * 30) + 5);
        o.lamp = !S.down && Math.hypot(S.x - G.map.spawn.x, S.y - G.map.spawn.y) < 0.01 && S.pp.hp === Math.ceil(S.pp.hpMax * B.WAKE_HP);
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.down && r.hp === 0, 'the partner went down');
      assert.equal(r.eTarget, 'host', 'the enemy turned away from the downed partner');
      assert.ok(/Down/.test(r.hud), r.hud);
      assert.ok(r.mid && r.prog > 2, 'not before the revive time');
      assert.ok(r.lifted && r.hpAfter === r.expect, 'lifted with ' + r.hpAfter);
      assert.ok(r.down2, 'down again'); assert.ok(r.lamp, 'out of time, the partner wakes by the lamp');
    });

    await step('revive: a downed host cannot move or fight, is lifted by the partner inside the window, and dies when it runs out', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 7 }); __put(12.5, 16.5, -Math.PI / 2);
        const S = PARTNER19.S, B = PARTNER19.B, c = Engine.cam;
        G.player.hp = 3; damagePlayer(9, 'A test blow');
        const o = { hostDown: S.hostDown, dead: G.dead, state: G.state, hp: G.player.hp, bar: !document.getElementById('p19p-down').hidden && document.querySelector('#p19p-down .t').textContent };
        const x0 = c.x, y0 = c.y; G.keys = { w: true }; __run(30, 1 / 30, () => { G.keys = { w: true }; });
        o.stayed = Math.hypot(c.x - x0, c.y - y0) < 0.01;
        const sw0 = G.attack.t; attack('thrust'); o.noSwing = G.attack.t === sw0;
        G.player.hp = 0; damagePlayer(5, 'Again'); o.noHit = G.player.hp === 0;
        // the partner walks to the host: lifted
        PARTNER19.input({ t: 'look', dir: -Math.PI / 2 }); PARTNER19.input({ t: 'move', f: 1, s: 0 });
        __run(40); PARTNER19.input({ t: 'move', f: 0, s: 0 });
        __run(Math.ceil(B.REVIVE_TIME * 30) + 6);
        o.lifted = !S.hostDown && G.player.hp === Math.ceil(G.player.hpMax * B.REVIVE_HP) && !G.dead;
        // down again with the partner far off: the window runs out, the death screen
        __put(12.5, 25.5); G.player.hp = 1; damagePlayer(9, 'A last blow'); o.down2 = S.hostDown;
        __run(Math.ceil(B.DOWN_WINDOW * 30) + 5);
        o.died = G.dead && G.state === 'dead' && !document.getElementById('death').classList.contains('hidden');
        document.getElementById('btn-wake').click(); o.woke = G.state === 'play' && !S.down && !S.hostDown && G.player.hp > 0;
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.hostDown && !r.dead && r.state === 'play' && r.hp === 0, JSON.stringify(r));
      assert.ok(/You are down/.test(r.bar), r.bar);
      assert.ok(r.stayed, 'a downed host does not move'); assert.ok(r.noSwing, 'nor swing'); assert.ok(r.noHit, 'nor take blows');
      assert.ok(r.lifted, 'the partner lifted the host'); assert.ok(r.down2 && r.died, 'out of time: the death screen'); assert.ok(r.woke);
    });

    await step('both down: the host\'s death screen; story deaths are never softened', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 8 }); __put(12.5, 20.5);
        const S = PARTNER19.S, seen = []; const off = PARTNER19.onStory((P) => seen.push(P.kind));
        S.pp.hp = 1; const e = __spawn('legionnaire', 12.5, 21.6, true); e.p19t = 'guest'; e.p19r = 99;
        __run(150, 1 / 30, (i) => __seed(1200 + i)); e.hidden = true;
        const o = { pdown: S.down };
        G.player.hp = 2; damagePlayer(7, 'The last of them');
        o.dead = G.dead && G.state === 'dead' && !document.getElementById('death').classList.contains('hidden');
        o.title = document.getElementById('death-title').textContent; o.storyDeath = seen.includes('death');
        document.getElementById('btn-wake').click(); o.bothUp = !S.down && !S.hostDown && S.pp.hp > 0;
        // a story death is the story's: heartglass kills even with the partner up
        __stage('clearing', 12.5, 11.5); die('heartglass'); o.heart = G.dead && document.getElementById('death-title').textContent === 'Heartglass.' && !S.hostDown;
        document.getElementById('btn-wake').click(); off();
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.pdown, 'the partner fell first'); assert.ok(r.dead, 'then the host: the death screen'); assert.ok(r.storyDeath, 'the guest is shown the death screen too');
      assert.ok(r.bothUp, 'waking by the lamp brings the partner back too'); assert.ok(r.heart, 'heartglass is not softened');
    });

    // ================================================================ 5. shared XP, loot by turns, scaling
    await step('shared XP: a kill by either traveller gives both its full XP; the partner levels by the game\'s own formula; quest XP is shared by half', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card({ level: 1, xp: 0 }), { seed: 12 }); __put(12.5, 13.0, -Math.PI / 2);
        const S = PARTNER19.S, p = G.player, xpOf = ENEMIES.legionnaire.xp;
        p.xp = 0; p.level = 1; const k0 = p.kills;
        const a = __spawn('legionnaire', 12.5, 9.5, false); killEnemy(a);
        const o = { hostXp1: p.xp, pXp1: S.earned.xp };
        const b = __spawn('legionnaire', 12.5, 11.8, false); b.hp = 1;
        S.dir = -Math.PI / 2; let tries = 0; while (!b.dead && tries++ < 40) { S.atkT = 0; S.songT = 0; PARTNER19.input({ t: 'attack', label: 'thrust' }); }
        o.bDead = b.dead; o.hostXp2 = p.xp; o.pXp2 = S.earned.xp; o.hostKills = p.kills - k0; o.pKills = S.pp.kills;
        S.pp.xp = 0; S.pp.level = 1; S.pp.hpMax = 30; const h0 = S.pp.hpMax; questXp(200);
        o.q = S.earned.xp - o.pXp2; o.lvl = S.pp.level; o.hpGain = S.pp.hpMax - h0; o.feedLvl = PARTNER19.drainFeed().some((f) => /level/.test(f.text));
        o.xpOf = xpOf;
        PARTNER19.leave('silent');
        return o;
      });
      assert.equal(r.hostXp1, r.xpOf); assert.equal(r.pXp1, r.xpOf, 'the partner shares the host\'s kill');
      assert.ok(r.bDead, 'the partner killed b'); assert.equal(r.hostXp2, 2 * r.xpOf, 'the host shares the partner\'s kill');
      assert.equal(r.pXp2, 2 * r.xpOf); assert.equal(r.hostKills, 1, 'the partner\'s kill is not counted as the host\'s'); assert.equal(r.pKills, 1);
      assert.equal(r.q, 100, 'quest XP: half'); assert.ok(r.lvl >= 2 && r.hpGain > 0 && r.feedLvl, 'the partner levelled: ' + r.lvl);
    });

    await step('loot by turns: drops alternate host, partner, host; the partner\'s never touch the floor; the HUD says whose is next', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); PARTNER19.join(__card(), { seed: 13 }); __put(12.5, 13.0);
        const o = { turns: [], floor: [], next: [] }; const S = PARTNER19.S;
        o.next.push(document.querySelector('#p19p-hud .l').textContent);
        for (let i = 0; i < 4; i++) {
          const e = __spawn('golem', 12.5, 9.5, false);
          const n0 = G.ents.length, turn = S.lootTurn;
          const rn = Math.random; Math.random = () => 0.02; try { dropLoot(e); } finally { Math.random = rn; }
          o.turns.push(turn); o.floor.push(G.ents.length - n0);
          update(1 / 30); o.next.push(document.querySelector('#p19p-hud .l').textContent);
        }
        o.items = Object.assign({}, S.earned.items); o.gold = S.earned.gold;
        o.feed = PARTNER19.drainFeed().filter((f) => /Loot by turns/.test(f.text)).length;
        PARTNER19.leave('silent');
        return o;
      });
      assert.deepEqual(r.turns, ['host', 'guest', 'host', 'guest']);
      assert.deepEqual(r.floor, [1, 0, 1, 0], 'host drops land on the floor, the partner\'s go to the partner');
      assert.equal(r.next[0], 'Next drop: yours'); assert.equal(r.next[1], 'Next drop: Brother'); assert.equal(r.next[2], 'Next drop: yours');
      const got = Object.values(r.items).reduce((a, b) => a + b, 0) + (r.gold > 0 ? 1 : 0);
      assert.ok(got >= 1, 'the partner earned its drops: ' + JSON.stringify(r.items) + ' gold ' + r.gold); assert.equal(r.feed, 2);
    });

    await step('scaling for two: enemy health x1.6 (bosses x1.8) and blows x1.1 while a partner is in the world; saves store unscaled health; leaving restores', async () => {
      const r = await Q(() => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2);
        const L = __spawn('legionnaire', 12.5, 6.5, false), W = __spawn('wearer', 14.5, 6.5, false);
        PARTNER19.join(__card(), { seed: 14 }); __put(12.5, 16.5);
        const o = { L: [L.hp, L.hpMax], W: [W.hp, W.hpMax] };
        const later = __spawn('proctor', 10.5, 6.5, false); o.later = later.hp;
        L.hp -= 16;
        const snap = snapshotGame(); const base = G.maps.clearing.baseCount != null ? G.maps.clearing.baseCount : 0;
        const ex = snap.maps.clearing.extra; o.saved = ex.filter((x) => x.type === 'legionnaire').map((x) => x.hp); o.savedW = ex.filter((x) => x.type === 'wearer').map((x) => x.hp);
        o.liveAfterSnap = L.hp; o.Lhp = L.hp;
        o.oak = G.maps.oakhaven.entities.filter((e) => e.kind === 'enemy' && e._h).every((e) => e.p19s);
        // blows: the same seeded hit with and without a partner
        const hit = (withP) => {
          __stage('clearing', 12.5, 11.5, -Math.PI / 2); G.player.hpMax = G.player.hp = 300;
          if (withP) { PARTNER19.join(__card(), { seed: 14 }); __put(12.5, 30.5); }
          const e = __spawn('golem', 12.5, 10.3, true); e.cool = 0; e.p19t = 'host'; e.p19r = 99;
          __seed(4242); const h0 = G.player.hp; let n = 0; while (G.player.hp === h0 && n++ < 400) { __seed(4242 + n); e.p19r = 99; update(1 / 30); }
          const lost = h0 - G.player.hp; if (withP) PARTNER19.leave('silent'); return { lost, n };
        };
        PARTNER19.leave('silent'); o.Lback = [L.hp, L.hpMax]; o.Wback = [W.hp, W.hpMax];
        o.solo = hit(false); o.duo = hit(true);
        return o;
      });
      assert.deepEqual(r.L, [Math.round(34 * 1.6), Math.round(34 * 1.6)]); assert.deepEqual(r.W, [Math.round(90 * 1.8), Math.round(90 * 1.8)]);
      assert.equal(r.later, Math.round(22 * 1.6), 'an enemy appearing mid-session is scaled too');
      const lhp = Math.round(34 * 1.6) - 16;
      assert.deepEqual(r.saved, [Math.round(lhp / 1.6)], 'the save holds unscaled health'); assert.deepEqual(r.savedW, [90]);
      assert.equal(r.liveAfterSnap, lhp, 'saving does not change the live fight'); assert.ok(r.oak, 'every map already met is scaled');
      assert.deepEqual(r.Lback, [Math.round(lhp / 1.6), 34]); assert.deepEqual(r.Wback, [90, 90]);
      assert.equal(r.solo.n, r.duo.n, 'the same seeded blow'); assert.equal(r.duo.lost, Math.max(1, Math.round(r.solo.lost * 1.1)), 'blows x1.1: ' + r.solo.lost + ' -> ' + r.duo.lost);
    });

    // ================================================================ 6. story read-only
    await step('story: scenes and dialogue reach the guest as plain read-only text; the guest cannot choose, talk, set a flag or fire a trigger', async () => {
      const r = await Q(() => {
        __stage('oakhaven', 23.5, 6.5, Math.PI / 2); PARTNER19.join(__card(), { seed: 15 }); update(1 / 30);
        const seen = []; const off = PARTNER19.onStory((P) => seen.push(JSON.parse(JSON.stringify(P))));
        const flags0 = JSON.stringify(G.flags);
        let chose = 0;
        showEvent('A <b>voice</b>', 'Line one<br>Line <i>two</i> &amp; more', [{ t: 'Say <i>nothing</i>', f: () => { chose++; G.flags.test_choice = 1; } }, { t: 'Answer', f: () => { chose++; } }]);
        const o = { ev: seen[seen.length - 1] };
        o.refused = ['choose', 'talk', 'flag', 'quest', 'interact'].map((t) => PARTNER19.input({ t, i: 0, k: 'escaped', v: true, id: 'tavernkeep' }).reason);
        o.chose = chose; o.flagsSame = JSON.stringify(G.flags) === flags0;
        document.querySelector('#event-panel button').click(); update(1 / 30);
        o.close = seen.some((P) => P.kind === 'close'); o.hostChose = chose === 1 && G.flags.test_choice === 1;
        delete G.flags.test_choice;
        // dialogue
        const npcEnt = G.ents.find((e) => e.kind === 'npc' && NPCS[e.id] && !NPCS[e.id].quest) || G.ents.find((e) => e.kind === 'npc' && NPCS[e.id]);
        if (npcEnt) { talk(npcEnt); o.dlg = seen.filter((P) => P.kind === 'dialogue').pop(); closeModal(); G.state = 'play'; update(1 / 30); }
        // a trigger under the partner's feet does nothing: only the host's camera fires them
        const t = G.map.triggers.find((x) => x.id === 'hedge_voice') || G.map.triggers[0];
        const tState = t ? JSON.stringify({ done: t.done, inside: t.inside }) : '';
        if (t) { __put(t.x, t.y); __run(10); }
        o.trigger = t ? JSON.stringify({ done: t.done, inside: t.inside }) === tState && G.state === 'play' : true;
        off(); PARTNER19.leave('silent');
        return o;
      });
      assert.equal(r.ev.kind, 'event'); assert.equal(r.ev.title, 'A voice'); assert.equal(r.ev.text, 'Line one\nLine two & more'); assert.deepEqual(r.ev.choices, ['Say nothing', 'Answer']);
      assert.equal(r.ev.host, 'Host Tester');
      assert.deepEqual(r.refused, Array(5).fill('story-is-the-hosts'));
      assert.ok(r.chose === 0 && r.flagsSame, 'nothing the guest sent chose or flagged anything');
      assert.ok(r.close && r.hostChose, 'the host chooses, and the guest is told the scene closed');
      if (r.dlg) assert.ok(r.dlg.title && !/[<>]/.test(r.dlg.text), 'dialogue copy: ' + JSON.stringify(r.dlg));
      assert.ok(r.trigger, 'the partner standing in a trigger fires nothing');
    });

    // ================================================================ 7. the figure
    const MEDIUM = 'medium';
    await step('figure: a solid figure in the guest\'s likeness at NPC size, with its name above, readable near and far, hidden behind a wall', async () => {
      const r = await Q(() => {
        PRESETS.apply('medium');
        __stage('clearing', 12.5, 14.5, -Math.PI / 2); G.tod = 0.45; PARTNER19.join(__card(), { seed: 16 }); __put(12.5, 11.5, Math.PI / 2);
        render();
        const o = { near: PARTNER19.stats.drawn, screen: PARTNER19.S.screen };
        const tag = document.getElementById('p19p-tag'); o.tag = !tag.hidden && tag.querySelector('.nm').textContent;
        // solid pixel art: opaque, a dark outline, shaded (many tones), a muted palette (no saturated blocks of colour)
        const F = { pix: 0 }; const fr = PARTNER19.frameOf(0, 0, 0, 0, PARTNER19.S.look);
        let opaque = 0, dark = 0, loud = 0; const tones = new Set();
        for (const px of fr.data) { if (!px) continue; opaque += (px >>> 24) === 255 ? 1 : 0; const r = px & 255, g = (px >>> 8) & 255, b = (px >>> 16) & 255; tones.add(px); if (r + g + b < 120) dark++; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx > 60 && (mx - mn) / mx > 0.62) loud++; }
        o.opaque = opaque; o.dark = dark; o.tones = tones.size; o.loud = loud; o.frame = [fr.w, fr.h, fr.top, fr.bot]; o.sprite = !!Engine.sprites[fr.name];
        // NPC size: the same projection as a standing NPC one tile away
        const npc = hydrate({ kind: 'npc', id: 'p19test', sprite: 'kaelen', x: 13.3, y: 11.5, scale: 1 }); G.ents.push(npc); render();
        o.npcH = npc._screen ? (npc._screen.y1 - npc._screen.y0) : 0; o.figH = (fr.bot - fr.top + 1) * (VIEW_H * Engine.getScale() / 3) / fr.h / Engine.getScale();
        G.ents.splice(G.ents.indexOf(npc), 1);
        __put(12.5, 5.5, Math.PI / 2); render(); o.far = PARTNER19.stats.drawn; o.farTag = !tag.hidden;
        // behind a body: a big solid enemy between the camera and the partner hides it (the depth test, as for a wall)
        Engine.cam.x = 12.5; Engine.cam.y = 14.5; Engine.cam.dir = -Math.PI / 2; __put(12.5, 11.2, Math.PI / 2); render(); o.open = PARTNER19.stats.drawn;
        const body = __spawn('golem', 12.5, 12.9, false); body.passive = true; body.state = 'passive'; render(); o.hidden = PARTNER19.stats.drawn; body.hidden = true;
        PARTNER19.leave('silent');
        return o;
      });
      assert.ok(r.near > 200, 'drawn near: ' + r.near); assert.equal(r.tag, 'Brother');
      assert.ok(r.opaque > 2400 && r.dark > 300 && r.tones > 300 && r.loud < r.opaque * 0.03 && r.sprite, 'solid pixel art, drawn as an engine sprite: ' + JSON.stringify([r.opaque, r.dark, r.tones, r.loud, r.frame]));
      assert.ok(r.npcH > 0 && Math.abs(r.figH - r.npcH) / r.npcH < 0.35, 'NPC size: figure ' + r.figH.toFixed(1) + ' vs NPC ' + r.npcH.toFixed(1));
      assert.ok(r.far > 20 && r.farTag, 'still drawn and named at 9 tiles: ' + r.far);
      assert.ok(r.open > 100 && r.hidden < r.open * 0.25, 'a body in front hides most of it: ' + r.open + ' -> ' + r.hidden);
    });

    await step('screenshots: the partner beside the player in Medium and Cinematic, mid-fight, and downed with the revive bar', async () => {
      const setScene = (preset) => Q((preset) => {
        PRESETS.apply(preset); GFX.changed && GFX.changed();
        __stage('clearing', 12.5, 15.5, -Math.PI / 2); G.tod = 0.42; G.day = 2;
        if (!PARTNER19.active()) PARTNER19.join(__card(), { seed: 17 });
        __put(13.6, 13.4, -Math.PI / 2 - 0.3); PARTNER19.S.down = false; PARTNER19.S.pp.hp = PARTNER19.S.pp.hpMax;
        update(1 / 30); render();
        return PARTNER19.stats.drawn;
      }, preset);
      const m = await setScene('medium'); await shot(page, 'p19p-medium.png');
      const c = await setScene('cinematic'); await shot(page, 'p19p-cinematic.png');
      const fight = await Q(() => {
        const e = __spawn('legionnaire', 13.3, 11.0, true); e.p19t = 'guest'; e.p19r = 99;
        const e2 = __spawn('hound', 11.0, 12.0, true);
        PARTNER19.S.dir = Math.atan2(e.y - PARTNER19.S.y, e.x - PARTNER19.S.x);
        __run(20, 1 / 30, (i) => __seed(2000 + i)); PARTNER19.S.atkT = 0; PARTNER19.input({ t: 'attack', label: 'chop down' }); PARTNER19.S.actT = PARTNER19.S.actDur * 0.6; render();
        return PARTNER19.stats.drawn;
      });
      await shot(page, 'p19p-fight-cinematic.png');
      const down = await Q(() => {
        for (const e of G.ents) if (e.kind === 'enemy') e.hidden = true;
        PARTNER19.S.pp.hp = 1; PARTNER19.S.hurtT = 0;
        // put the partner down the way an enemy would
        const e = __spawn('legionnaire', 13.6, 12.3, true); e.p19t = 'guest'; e.p19r = 99; let n = 0; while (!PARTNER19.S.down && n++ < 300) { __seed(3000 + n); update(1 / 30); }
        e.hidden = true; Engine.cam.x = PARTNER19.S.x - 0.5; Engine.cam.y = PARTNER19.S.y + 1.05; Engine.cam.pitch = -35; __run(30); render();   // beside the fallen partner (in revive reach) and looking down: at the standing eye the lying figure sits below a level frame
        return { down: PARTNER19.S.down, prog: PARTNER19.S.revive, drawn: PARTNER19.stats.drawn };
      });
      await shot(page, 'p19p-downed-revive.png');
      const hostDown = await Q(() => { PRESETS.apply('medium'); Engine.cam.pitch = 0; PARTNER19.S.down = false; PARTNER19.S.pp.hp = 30; G.player.hp = 1; damagePlayer(5, 'A Carillon Legionnaire'); __put(12.5, 13.6, Math.PI / 2); __run(20); render(); return PARTNER19.S.hostDown; });
      await shot(page, 'p19p-host-down-medium.png');
      await Q(() => { PARTNER19.leave('silent'); PRESETS.apply('medium'); });
      assert.ok(m > 200 && c > 200 && fight > 100, [m, c, fight].join(' '));
      assert.ok(down.down && down.prog > 0.5 && down.drawn > 50, JSON.stringify(down)); assert.ok(hostDown);
    });

    // ================================================================ 8. the guest's side: write-back only to the guest's own save
    const phone = await browser.newContext(Object.assign({}, devices['Pixel 7']));
    const Gst = await boot(phone, { name: 'Guest Brother', cls: 2 }); pages.push(Gst);
    const gp = Gst.page, GQ = (fn, arg) => gp.evaluate(fn, arg);
    await step('write-back: the guest (phone profile) brings its own character, plays in the host\'s world, and goes home with what it earned; the host\'s save never holds it', async () => {
      const g0 = await GQ(() => {
        G.player.xp = 0; G.player.level = 2; G.player.gold = 30; G.player.pellets = 6;
        SLOTS[0] = { marker: 'guest-slot-0' };
        const card = PARTNER19.guest.card(); const entered = PARTNER19.guest.enter();
        return { card, entered, inExtra: EXTRAS17.inExtra(), lvl: 2, name: G.player.name, isTouch: matchMedia('(pointer: coarse)').matches };
      });
      assert.ok(g0.card && g0.card.v === 1 && /^[A-Za-z0-9]{8,32}$/.test(g0.card.token) && g0.card.name === 'Guest Brother', JSON.stringify(g0.card));
      assert.ok(g0.entered && g0.inExtra === 'p19coop', 'the guest\'s own game is put aside');
      // the host takes the card and plays
      const h = await Q((card) => {
        __stage('clearing', 12.5, 11.5, -Math.PI / 2); const hostName = G.player.name;
        const j = PARTNER19.join(card, { seed: 31 }); __put(12.5, 13.0, -Math.PI / 2);
        for (let i = 0; i < 6; i++) { const e = __spawn('golem', 12.5, 9.5, false); killEnemy(e); const rn = Math.random; Math.random = () => 0.02; try { dropLoot(e); } finally { Math.random = rn; } }
        PARTNER19.S.pp.weapon = 1; PARTNER19.S.atkT = 0; PARTNER19.input({ t: 'attack' });   // spends a pellet
        const save = JSON.stringify(snapshotGame());
        const wb = PARTNER19.leave();
        return { j: j.ok, wb, hostName, saveHasGuest: save.includes(card.token) || save.includes('Guest Brother'), hostIsHost: G.player.name === hostName };
      }, g0.card);
      assert.ok(h.j && h.wb && h.wb.xp === 6 * 60 && h.wb.kills === 6, JSON.stringify(h.wb));
      assert.ok(!h.saveHasGuest && h.hostIsHost, 'the host\'s save never holds the guest');
      // hostile write-backs are refused without touching anything
      const bad = await GQ((wb) => {
        const V = (w) => PARTNER19.guest.validateWB(w).reason;
        const c = (o) => Object.assign(JSON.parse(JSON.stringify(wb)), o);
        return {
          token: V(c({ token: 'SomebodyElse1' })), ver: V(c({ v: 9 })), xp: V(c({ xp: 1e9 })), xpKills: V(c({ xp: 50000, kills: 1 })), neg: V(c({ gold: -5 })),
          key: V(c({ items: [{ id: 'core', n: 1 }] })), unknown: V(c({ items: [{ id: '__proto__', n: 1 }] })), many: V(c({ items: [{ id: 'tonic', n: 20 }] })), count: V(c({ items: [{ id: 'tonic', n: 1.5 }] })),
          gold: V(c({ gold: 4000 })), shape: V('nope'), big: V(c({ pad: 'x'.repeat(20000) })),
          stillIn: EXTRAS17.inExtra(),
        };
      }, h.wb);
      assert.deepEqual(bad, { token: 'not-mine', ver: 'version', xp: 'xp', xpKills: 'xp-vs-kills', neg: 'gold', key: 'item', unknown: 'item', many: 'items-vs-kills', count: 'item-count', gold: 'gold-vs-kills', shape: 'shape', big: 'too-big', stillIn: 'p19coop' });
      const home = await GQ((wb) => {
        const res = PARTNER19.guest.returnHome(wb);
        const p = G.player;
        const o = { res, name: p.name, lvl: p.level, xp: p.xp, gold: p.gold, pellets: p.pellets, inv: p.inv.map((s) => s.id), inExtra: EXTRAS17.inExtra(), state: G.state, slot: SLOTS[0] && SLOTS[0].marker };
        o.again = PARTNER19.guest.applyWriteBack(wb).reason;
        return o;
      }, h.wb);
      assert.ok(home.res.ok, JSON.stringify(home.res)); assert.equal(home.name, 'Guest Brother'); assert.equal(home.inExtra, null); assert.equal(home.state, 'play');
      assert.equal(home.slot, 'guest-slot-0', 'the guest\'s own session slots came back untouched');
      assert.ok(home.lvl > 2 || home.xp > 0, 'XP applied: Lv ' + home.lvl + ' xp ' + home.xp);
      const itemCount = h.wb.items.reduce((a, s) => a + s.n, 0);
      assert.ok(itemCount + (h.wb.gold > 0 ? 1 : 0) >= 2, 'the partner earned its turns: ' + JSON.stringify(h.wb));
      assert.equal(home.gold, 30 + h.wb.gold); assert.equal(home.again, 'already-applied', 'a write-back applies once');
      assert.equal(home.pellets, 6 - h.wb.spent.pellets + (h.wb.items.find((s) => s.id === 'pellets') ? 3 * h.wb.items.find((s) => s.id === 'pellets').n : 0));
    });

    await step('write-back from a save: a guest who joined from a save object goes home into that save with the gains; the read-only story panel on the phone shows text only', async () => {
      const r = await GQ(() => {
        const d = snapshotGame(); d.player.name = 'Saved Self'; d.player.xp = 0; const lvl0 = d.player.level;
        const card = PARTNER19.guest.card(d); const tok = card.token;
        const wb = { v: 1, token: tok, xp: 120, kills: 4, gold: 10, items: [{ id: 'tonic', n: 1 }], spent: { pellets: 0, bolts: 0 } };
        const res = PARTNER19.guest.returnHome(wb);
        const o = { ok: res.ok, name: G.player.name, lvl0, lvl: G.player.level, xp: G.player.xp, tonic: G.player.inv.some((s) => s.id === 'tonic'), origUntouched: d.player.xp === 0 };
        PARTNER19.guest.showStory({ kind: 'event', title: '<img src=x onerror="window.__pwn=2">A voice', text: 'Line <b>one</b>', choices: ['Say nothing', '<script>window.__pwn=3</script>'], host: 'Host <i>Tester</i>' });
        const box = document.getElementById('p19p-story');
        o.story = { shown: !box.hidden, imgs: box.querySelectorAll('img,script,b,i').length, buttons: box.querySelectorAll('button,a,input').length, text: box.textContent.slice(0, 200), pwn: window.__pwn || 0, lis: box.querySelectorAll('li').length };
        const rect = box.getBoundingClientRect(); o.fits = rect.width <= innerWidth + 1 && rect.left >= -1;
        PARTNER19.guest.showStory({ kind: 'close' }); o.closed = box.hidden;
        PARTNER19.guest.showStory({ kind: 'event', title: 'Shot', text: 'The Hedge speaks in a voice you know.', choices: ['Say nothing.', 'Answer it.'], host: 'Host Tester' });
        return o;
      });
      assert.ok(r.ok && r.name === 'Saved Self' && r.tonic && r.origUntouched, JSON.stringify(r));
      assert.ok(r.lvl > r.lvl0 || r.xp === 120, 'gains applied to the save: Lv ' + r.lvl + ' xp ' + r.xp);
      assert.ok(r.story.shown && r.story.imgs === 0 && r.story.buttons === 0 && r.story.pwn === 0 && r.story.lis === 2, JSON.stringify(r.story));
      assert.ok(r.fits && r.closed);
      await shot(gp, 'p19p-guest-phone-story.png');
      await GQ(() => PARTNER19.guest.hideStory());
    });

    // ================================================================ 9. single player unchanged
    await step('single player unchanged: a seeded fight trace, frames and the save code match a page with js/partner19.js blocked', async () => {
      const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      const ctxC = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
      const A = await boot(await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true }), { name: 'Solo' });
      const Bp = await boot(ctxB, { name: 'Solo', block: true }); const Cp = await boot(ctxC, { name: 'Solo', block: true });
      pages.push(A, Bp, Cp);
      // all three pages start from the same save (made on a blocked page), so wall-clock drift during boot is gone
      const base = await Bp.page.evaluate(() => { const s = snapshotGame(); s.when = 0; return JSON.stringify(s); });
      const trace = (P) => P.page.evaluate(async (base) => {
        const out = { has: typeof PARTNER19 !== 'undefined' };
        const pin = (fn) => { const pn = performance.now.bind(performance), dn = Date.now; performance.now = () => 123456; Date.now = () => 1700000000000; try { return fn(); } finally { performance.now = pn; Date.now = dn; } };
        return pin(() => {
          __seed(5); restoreGame(JSON.parse(base));
          __stage('clearing', 12.5, 11.5, -Math.PI / 2); G.tod = 0.4; G.day = 3; G.player.hpMax = G.player.hp = 400; G.player.xp = 0;
          const es = [__spawn('legionnaire', 12.5, 9.0, true), __spawn('hound', 14.5, 9.5, true), __spawn('proctor', 10.5, 9.5, true)];
          const rows = [];
          for (let i = 0; i < 360; i++) {
            __seed(7000 + i);
            G.keys = i % 90 < 30 ? { w: true } : i % 90 < 50 ? { a: true } : {};
            update(1 / 30);
            if (i % 12 === 0) { Engine.cam.dir = -Math.PI / 2 + Math.sin(i / 30) * 0.4; attack('slash right'); }
            if (i % 30 === 0) rows.push([Engine.cam.x.toFixed(4), Engine.cam.y.toFixed(4), G.player.hp, G.player.xp, __rc].concat(es.map((e) => [e.hp, e.dead ? 1 : 0, e.state, e.x.toFixed(3), e.y.toFixed(3)].join(','))).join('|'));
          }
          G.keys = {};
          // one frame of the scene with every clock pinned
          for (const k of ['coldBreath', 'windSigns', 'dyingLights']) GFX[k] = false;
          __seed(1); Engine.setTime(5); Engine.cam.bob = 0;
          let cap = null; const hk = (F) => { cap = F.fb.slice(); };
          Engine.addPostHook(hk, 99.5);
          Engine.render(G.ents.filter((e) => e.kind === 'deco'), G.tod);
          let h = 2166136261; for (let i = 0; i < cap.length; i++) { h ^= cap[i]; h = Math.imul(h, 16777619); }
          out.rows = rows; out.frame = h >>> 0;
          const s = snapshotGame(); s.when = 0; out.save = JSON.stringify(s);
          return out;
        });
      }, base);
      const a = await trace(A), b = await trace(Bp), c = await trace(Cp);
      assert.equal(a.has, true); assert.equal(b.has, false);
      assert.deepEqual(a.rows, b.rows, 'seeded trace (positions, health, XP, RNG calls, enemies)');
      assert.equal(a.save, b.save, 'the save is byte-identical');
      const codes = await Promise.all([A, Bp].map((P) => P.page.evaluate(async (s) => encodeSave(JSON.parse(s)), a.save)));
      assert.equal(codes[0], codes[1], 'the save code is identical');
      if (b.frame === c.frame) assert.equal(a.frame, b.frame, 'the frame is identical'); else console.log('  (frame reference unstable between two blocked pages; frame not compared)');
    });

    // ================================================================ 10. no page errors
    await step('no page errors on any page (host, phone guest, solo pages)', async () => {
      const errs = pages.flatMap((p) => p.errors);
      assert.deepEqual(errs, []);
    });
    console.log('OK partner19: ' + passed + ' checks passed');
  } catch (e) {
    console.error('FAIL', e && e.stack || e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
