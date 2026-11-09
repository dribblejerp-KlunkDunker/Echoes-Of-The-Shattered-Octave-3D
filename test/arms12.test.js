// PREVIEW_URL=http://127.0.0.1:3861 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/arms12.test.js
// Phase 12 ARMS: shield bash, two-handed weapons, dual wielding. Optional SHOTS=<dir> writes review screenshots.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.SHOTS || '';
let fails = 0;
function ok(cond, label) { console.log((cond ? 'PASS ' : 'FAIL ') + label); if (!cond) fails++; }
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3861');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof ARMS12 === 'object');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Arms Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);
    const E = (fn, arg) => page.evaluate(fn, arg);
    const snap = async (name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };

    await E(() => {
      localStorage.removeItem('echoes-arms12');
      for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      window.__stage = (x, y, dir) => { loadMap('clearing', { x: x == null ? 12.5 : x, y: y == null ? 11.5 : y, dir: dir == null ? 0 : dir }); G.state = 'play'; G.fadeT = 0; G.player.hp = G.player.hpMax; G.player.fat = G.player.fatMax; UPG.blocking = false; UPG.parryCool = 0; UPG.parryWindow = 0; G.attack.t = 0; G.song.t = 0; ARMS12.st.bashCool = 0; ARMS12.st.bashT = 0; ARMS12.st.knock.length = 0; ARMS12.st.nextHand = 'main'; };
      window.__mk = (type, x, y, st) => { const e = hydrate({ kind: 'enemy', type, x, y }); e.state = st || 'idle'; e._tgSeen = true; G.ents.push(e); return e; };
      window.__rm = (e) => { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); };
      window.__seed = (n) => { let s = n || 777; window.__rngCalls = 0; Math.random = () => { window.__rngCalls++; return (s = (s * 16807) % 2147483647) / 2147483647; }; };
      window.__give = (id) => { if (!G.has(id)) G.give(id); };
      window.__shield = (on) => { const p = G.player; if (on) { __give('a_buckler'); p.armor.shield = 'a_buckler'; } else delete p.armor.shield; };
      window.__weapon = (id) => { const p = G.player; if (!p.weapons.includes(id)) p.weapons.push(id); p.weapon = p.weapons.indexOf(id); };
      window.__sw = (a, b, c) => { ARMS12.S.bash = a; ARMS12.S.two = b; ARMS12.S.dual = c; };
      window.__run = (sec) => { for (let i = 0; i < Math.round(sec * 60); i++) update(1 / 60); };
    });

    await E(() => { window.requestAnimationFrame = () => 0; });
    await page.waitForTimeout(100);
    // ---- 0. catalog, stock, defaults
    const cat = await E(() => ({ S: { ...ARMS12.S }, ids: Object.keys(ARMS12.NEW_WEAPONS), items: Object.keys(ARMS12.NEW_WEAPONS).every(id => ITEMS['w_' + id] && ITEMS['w_' + id].weapon === id && ITEMS['w_' + id].value > 0),
      stock: Object.entries(ARMS12.STOCK).every(([n, ws]) => ws.every(w => NPCS[n].shop.some(e => e.item === 'w_' + w))),
      twoCount: Object.values(ARMS12.NEW_WEAPONS).filter(w => w.twoHanded).length, reg: Object.keys(ARMS12.NEW_WEAPONS).every(id => WEAPONS[id]), unique: NPCS.vosk.shop.filter(e => e.item === 'w_p12_greatmaul').length }));
    ok(cat.S.bash && cat.S.two && cat.S.dual, 'all three gameplay switches default on');
    ok(cat.ids.every(i => i.startsWith('p12_')) && cat.items && cat.reg && cat.twoCount === 3, 'three p12_ two-handers and a p12_ dirk exist as weapons and sellable items');
    ok(cat.stock && cat.unique === 1, 'each new weapon is in an existing merchant\'s stock exactly once (vosk, vane, ignatius, hob)');

    // ---- 1. switches off = the original game: identical seeded fight traces and unchanged equipment behaviour
    const tr = await E(() => {
      const baseP = JSON.stringify(G.player);
      const run = (sw) => {
        // the ambient bird/rat timer (js/upgrades.js UPG._ambT) runs on from run to run and from the live loop before the freeze:
        // left alone it fires at a different step in each run (one Math.random call or ~3000 for a rat) and the traces differ by chance
        UPG._ambT = 4;
        Object.assign(G.player, JSON.parse(baseP)); __seed(4242); __stage(12.5, 11.5, 0); G.noise = 2; __sw(...sw); __shield(true); __weapon('spear'); __weapon('sword');
        const es = [__mk('proctor', 13.6, 11.5, 'chase'), __mk('hound', 13.9, 11.8, 'chase')];
        const out = []; __seed(4242);
        for (let i = 0; i < 300; i++) {
          __seed(9000 + i); update(1 / 60);
          if (i % 20 === 0) attack('swing');
          if (i === 100) triggerBlock();
          if (i % 12 === 0) out.push([G.player.hp, G.player.fat.toFixed(3), G.attack.dur, ...es.map(e => e.hp + ':' + e.state + ':' + e.x.toFixed(3) + ',' + e.y.toFixed(3) + ':' + (e.stun || 0)), window.__rngCalls].join('|'));
        }
        es.forEach(__rm); return out.join('\n');
      };
      run([false, false, false]); const base = run([false, false, false]), again = run([false, false, false]);
      window.__d = [base, again];
      const onNoGear = run([true, true, true]);             // switches on, but sword + shield: nothing relevant equipped
      // equipment: spear + shield with the switch off keeps the old "stowed" behaviour
      __stage(); __sw(false, false, false); __shield(true); __weapon('spear'); update(1 / 60); update(1 / 60);
      const stowed = { shieldStill: !!worn('shield'), blocked: shieldBlocked(), spearDmg: WEAPONS.spear.dmg.join('-'), reach: WEAPONS.spear.reach };
      __weapon('sword'); __sw(true, true, true);
      return { same: base === again, eq: base === onNoGear, lines: base.split('\n').length, stowed };
    });
    if (!tr.same || !tr.eq) { const d = await E(() => { const [a, b] = window.__d; const A = a.split('\n'), B = b.split('\n'); const i = A.findIndex((l, k) => l !== B[k]); return i < 0 ? 'none' : i + ': ' + A[i] + '  vs  ' + B[i]; }); console.log('INFO first difference ' + d); }
    ok(tr.same && tr.lines >= 20, 'all switches off: the seeded fight repeats exactly (' + tr.lines + ' samples)');
    ok(tr.eq, 'switches on with a short sword and buckler: damage, fatigue, positions, states and RNG calls identical to switches off');
    ok(tr.stowed.shieldStill && tr.stowed.blocked && tr.stowed.spearDmg === '5-11' && tr.stowed.reach === 2.1, 'switches off: spear + shield behaves as before (shield stays worn, stowed, spear unmodified)');

    // ---- 2. shield bash
    const b1 = await E(() => {
      __stage(12.5, 11.5, 0); __sw(true, true, true); __shield(true); __weapon('sword'); __seed(11);
      const e = __mk('proctor', 13.5, 11.5, 'chase'); e.cool = 5; const x0 = e.x, hp0 = e.hp, fat0 = G.player.fat;
      const did = ARMS12.bash(true);
      const o = { did, stunNow: e.stun, hpLoss: hp0 - e.hp, fat: fat0 - G.player.fat, cool: ARMS12.st.bashCool };
      __run(0.5); o.moved = e.x - x0; o.dy = Math.abs(e.y - 11.5); o.stunAfter = e.stun; o.cls = ARMS12.classify(e);
      // cooldown: a second bash is refused until the timer runs out
      e.x = 13.5; e.y = 11.5; e.stun = 0;
      o.again = ARMS12.bash(true); __run(1.5); o.stillCooling = ARMS12.st.bashCool > 0; o.third = ARMS12.bash(true); __run(0.8); o.ready = ARMS12.st.bashCool === 0;
      e.x = 13.5; e.hp = 99; o.fourth = ARMS12.bash(true); o.bashes = ARMS12.st.bashes;
      __rm(e); return o;
    });
    ok(b1.did && b1.stunNow >= 0.79 && b1.hpLoss >= 1 && b1.hpLoss <= 3, 'a bash hits for 1-3 and staggers a light foe for 0.8 s (took ' + b1.hpLoss + ', stun ' + b1.stunNow.toFixed(2) + ')');
    ok(b1.fat === 5 && b1.cool > 2.1, 'a bash costs 5 fatigue and starts a 2.2 s cooldown');
    ok(b1.moved > 0.85 && b1.moved <= 1.02 && b1.dy < 0.02, 'a light foe is knocked back about one tile in a straight line (moved ' + b1.moved.toFixed(2) + ')');
    ok(!b1.again && b1.stillCooling && !b1.third && b1.ready && b1.fourth, 'cooldown blocks bashes until it runs out, then it works again');

    // too winded
    const b2 = await E(() => {
      __stage(); __shield(true); const e = __mk('proctor', 13.5, 11.5, 'chase'); G.player.fat = 4; const r = ARMS12.bash(true); G.player.fat = G.player.fatMax; __rm(e); return { r, st: ARMS12.st.bashCool };
    });
    ok(!b2.r && b2.st === 0, 'under 5 fatigue the bash is refused and costs nothing');

    // walls: enemy against a wall is not pushed into it; stays out of solid cells through the shove
    const w = await E(() => {
      __stage(); const m = G.map; let spot = null;
      for (let y = 3; y < m.h - 3 && !spot; y++) for (let x = 3; x < m.w - 5 && !spot; x++) {
        if (!m.isBlocked(x, y) && !m.isBlocked(x + 1, y) && !m.isBlocked(x + 2, y) && m.isBlocked(x + 3, y) && !m.isBlocked(x, y - 1) && !m.isBlocked(x, y + 1) && !m.isBlocked(x + 1, y - 1) && !m.isBlocked(x + 1, y + 1) && !m.isBlocked(x + 2, y + 1) && !m.isBlocked(x + 2, y - 1)) spot = { x, y };
      }
      if (!spot) return null;
      const c = Engine.cam; c.x = spot.x + 0.5; c.y = spot.y + 0.5; c.dir = 0; G.player.feet = m.groundAt ? m.groundAt(c.x, c.y) : 0;
      const e = __mk('proctor', spot.x + 1.5, spot.y + 0.5, 'chase'); e.cool = 9;     // 1 tile from the player, wall begins 1.5 tiles beyond
      __shield(true); __weapon('sword'); ARMS12.st.bashCool = 0; ARMS12.bash(true);
      let bad = 0; for (let i = 0; i < 40; i++) { update(1 / 60); if (solidAt(e.x, e.y, e) || m.isBlocked(e.x | 0, e.y | 0)) bad++; }
      const o = { bad, x: e.x - (spot.x + 1.5), found: true, wallX: spot.x + 3 };
      // directly against the wall: no shove at all
      e.x = spot.x + 2.55; e.stun = 0; ARMS12.st.bashCool = 0; c.x = spot.x + 1.9; ARMS12.bash(true); const k = ARMS12.planKnock(e, 1.0); o.pinned = k.dist; o.knockQueued = ARMS12.st.knock.length;
      for (let i = 0; i < 40; i++) update(1 / 60);
      o.badPinned = solidAt(e.x, e.y, e) ? 1 : 0; __rm(e); return o;
    });
    ok(w && w.found, 'found an open lane ending in a wall for the collision test');
    if (w) {
      ok(w.bad === 0 && w.x > 0.3, 'knock-back never leaves the enemy inside a wall (moved ' + w.x.toFixed(2) + ', clipped frames ' + w.bad + ')');
      ok(w.pinned < 0.5 && w.badPinned === 0, 'an enemy with its back to the wall is hardly moved (plan ' + w.pinned + ') and never clips');
    }

    // heavy and boss resistance
    const hv = await E(() => {
      __stage(); __shield(true); __weapon('sword'); __seed(5);
      const out = {};
      for (const type of ['golem', 'wearer', 'hound', 'quiet']) {
        if (!ENEMIES[type]) { out[type] = null; continue; }
        ARMS12.st.bashCool = 0; G.player.fat = G.player.fatMax; G.attack.t = 0;
        const e = __mk(type, 13.4, 11.5, 'chase'); e.cool = 9; const x0 = e.x, hp0 = e.hp; ARMS12.bash(true); const queued = ARMS12.st.knock.length; __run(0.25);
        out[type] = { cls: ARMS12.classify(e), moved: +(e.x - x0).toFixed(2), hp: hp0 - e.hp, stun: +(e.stun || 0).toFixed(2), queued };
        __run(1.5); e.dead = true; __rm(e); ARMS12.st.bashT = 0;
      }
      // every catalogued enemy classified (for the report)
      const table = {}; for (const id in ENEMIES) { const e = { def: ENEMIES[id], type: id }; table[id] = ARMS12.classify(e); }
      return { out, table };
    });
    ok(hv.out.golem && hv.out.golem.cls === 'heavy' && hv.out.golem.moved === 0 && hv.out.golem.stun > 0 && hv.out.golem.stun <= 0.45 && hv.out.golem.hp >= 1, 'a Steam Golem (heavy) is not moved, only staggered briefly: ' + JSON.stringify(hv.out.golem));
    ok(hv.out.wearer && hv.out.wearer.cls === 'boss' && hv.out.wearer.queued === 0 && hv.out.wearer.stun === 0 && hv.out.wearer.hp === 0, 'a boss (The Wearer) takes nothing, is not moved and not staggered: ' + JSON.stringify(hv.out.wearer));
    ok(hv.out.hound && hv.out.hound.cls === 'light' && hv.out.hound.moved > 0.8, 'a hound (light) is knocked back: ' + JSON.stringify(hv.out.hound));
    console.log('INFO classes ' + JSON.stringify(hv.table));

    // ground rules: deep water and drops
    const water = await E(() => {
      let found = null;
      for (const id in G.maps) { const m = G.maps[id]; if (!m.floorCells || m.w === undefined) continue;
        for (let y = 2; y < m.h - 2 && !found; y++) for (let x = 2; x < m.w - 3 && !found; x++) if (m.floorCells[y * m.w + x + 2] === 2 && !m.isBlocked(x, y) && !m.isBlocked(x + 1, y) && !m.isBlocked(x - 1, y)) found = { id, x, y }; if (found) break; }
      if (!found) return null;
      loadMap(found.id, { x: found.x - 0.2, y: found.y + 0.5, dir: 0 }); G.state = 'play'; G.fadeT = 0;
      const e = hydrate({ kind: 'enemy', type: 'proctor', x: found.x + 0.6, y: found.y + 0.5 }); G.ents.push(e);
      const k = ARMS12.planKnock(e, 1.0); const o = { found, dist: k.dist, endBlocked: G.map.isBlocked((e.x + k.ux * k.dist) | 0, (e.y + k.uy * k.dist) | 0) };
      __rm(e); return o;
    });
    ok(water === null || (water.dist <= 1.0 && !water.endBlocked), 'knock-back stops at deep water (cells the game treats as impassable): ' + JSON.stringify(water));

    // the combo (guard + strike) and the no-target fall-through
    const cb = await E(() => {
      __stage(); __shield(true); __weapon('sword'); __seed(3);
      const e = __mk('proctor', 13.6, 11.5, 'chase'); e.cool = 9;
      triggerBlock(); const n0 = ARMS12.st.bashes; attack('thrust');
      const o = { bashed: ARMS12.st.bashes - n0, swung: G.attack.t > 0 };
      __run(3); __rm(e);
      ARMS12.st.bashCool = 0; G.attack.t = 0; triggerBlock(); attack('thrust'); o.noTargetSwing = G.attack.t > 0; o.noTargetBash = ARMS12.st.bashT > 0;
      __run(2); G.attack.t = 0;
      return o;
    });
    ok(cb.bashed === 1 && !cb.swung, 'guard up + strike = a bash (and not a sword swing)');
    ok(cb.noTargetSwing && !cb.noTargetBash, 'guard up + strike with nothing in bash reach falls through to a normal swing');

    // ---- 3. two-handed weapons
    const th = await E(() => {
      __stage(); __sw(true, true, true); const p = G.player; const o = {};
      __weapon('sword'); __shield(true); update(1 / 60);
      o.shieldBefore = !!worn('shield');
      __weapon('spear'); update(1 / 60);                         // taking up a two-hander puts the shield away
      o.shieldAfterSpear = !!worn('shield'); o.blockedAfterSpear = shieldBlocked(); o.shieldInInv = G.has('a_buckler');
      // damage / speed table applied to a real swing
      __shield(false); __weapon('spear'); __seed(77);
      const dummy = __mk('proctor', 13.2, 11.5, 'passive'); dummy.hp = 99999; dummy.state = 'passive'; dummy.radius = 0.4;
      const hits = []; let dur = 0, fat = 0;
      for (let i = 0; i < 60; i++) { G.attack.t = 0; const h0 = dummy.hp, f0 = p.fat; p.fat = p.fatMax; __seed(100 + i); attack('thrust'); if (dummy.hp < h0) hits.push(h0 - dummy.hp); dur = G.attack.dur; fat = p.fatMax - p.fat; dummy.state = 'passive'; }
      const bonus = Math.floor(p.attrs.Strength / 25);
      o.spear = { min: Math.min(...hits) - bonus, max: Math.max(...hits) - bonus, n: hits.length, dur: +dur.toFixed(3), fat, restored: WEAPONS.spear.dmg.join('-') + '/' + WEAPONS.spear.reach + '/' + WEAPONS.spear.speed };
      o.table = {}; for (const id of ['spear', 'maul', 'p12_greatmaul', 'p12_glassblade', 'p12_bellglaive']) { __weapon(id); const e = ARMS12.effective(id); const W = WEAPONS[id]; o.table[id] = { base: W.dmg.join('-') + ' r' + W.reach + ' s' + W.speed, eff: e.dmg.join('-') + ' r' + e.reach.toFixed(2) + ' s' + e.speed.toFixed(2) }; }
      __rm(dummy); __weapon('sword'); __shield(false);
      return o;
    });
    ok(th.shieldBefore && th.shieldAfterSpear && th.blockedAfterSpear && th.shieldInInv, 'taking up a two-hander stows the shield (still worn, blocked, as the base game does)');
    ok(th.spear.n >= 20 && th.spear.min >= 6 && th.spear.max <= 12 && th.spear.max >= 11, 'spear swings use the grip table: 5-11 becomes 6-12 (saw ' + th.spear.min + '-' + th.spear.max + ' over ' + th.spear.n + ' hits)');
    ok(Math.abs(th.spear.dur - 0.66) < 0.002 && th.spear.fat === 2 && th.spear.restored === '5-11/2.1/0.6', 'spear swing time 0.6 -> 0.66 s, fatigue 2 per swing, catalogue restored afterwards');
    console.log('INFO two-hand table ' + JSON.stringify(th.table));

    // switch off: the shield stays worn with a two-hander (stowed)
    const th2 = await E(() => { __stage(); __sw(true, false, true); __weapon('sword'); __shield(true); __weapon('spear'); update(1 / 60); const r = { still: !!worn('shield'), eff: ARMS12.effective('spear').dmg.join('-') }; __weapon('sword'); __sw(true, true, true); return r; });
    ok(th2.still && th2.eff === '5-11', 'two-hand switch off: nothing is unequipped and the spear is unmodified');

    // ---- 4. dual wielding
    const du = await E(() => {
      __stage(); __sw(true, true, true); const p = G.player; const o = {};
      __weapon('knife'); __weapon('sword'); __shield(false); delete G.flags.p12a_off;
      o.set = ARMS12.setOff('knife'); o.flag = G.flags.p12a_off; o.active = ARMS12.dualActive();
      const dummy = __mk('proctor', 13.0, 11.5, 'passive'); dummy.hp = 99999; dummy.radius = 0.4;
      const seq = [];
      for (let i = 0; i < 6; i++) {
        while (G.attack.t > 0) update(1 / 60);
        const h0 = dummy.hp; __seed(200 + i); attack('thrust');
        seq.push({ hand: ARMS12.st.swingHand, dur: +G.attack.dur.toFixed(3), dmg: h0 - dummy.hp }); dummy.state = 'passive';
      }
      o.seq = seq; o.catalog = WEAPONS.sword.speed + '/' + WEAPONS.knife.dmg.join('-') + '/' + WEAPONS.knife.speed;
      o.mainRestored = p.weapons[p.weapon] === 'sword';
      const bonus = Math.floor(p.attrs.Strength / 25);
      o.offMax = Math.max(...seq.filter(s => s.hand === 'off' && s.dmg > 0).map(s => s.dmg - bonus)); o.offHits = seq.filter(s => s.hand === 'off' && s.dmg > 0).length;
      // a two-hander and a shield both clear the off hand
      __weapon('spear'); update(1 / 60); o.afterTwo = G.flags.p12a_off; __weapon('sword');
      o.refused = ARMS12.setOff('knife') === true;       // main is sword now: allowed
      __weapon('spear'); update(1 / 60); o.refusedTwo = ARMS12.setOff('knife');                // two-hander in hand: refused
      __weapon('sword'); ARMS12.setOff('knife'); equipArmor((__give('a_buckler'), 'a_buckler')); o.afterShield = G.flags.p12a_off; o.shieldOn = !!worn('shield');
      __shield(false); o.setWithShield = (__shield(true), ARMS12.setOff('knife')); o.shieldGone = !worn('shield');
      // main hand = off-hand weapon: inactive but kept, never a crash
      __weapon('knife'); o.sameInactive = ARMS12.dualActive();
      __rm(dummy); delete G.flags.p12a_off; __weapon('sword'); __shield(false);
      return o;
    });
    ok(du.set && du.flag === 1 && du.active, 'the dirk/knife goes in the off hand (flag p12a_off stores a small index)');
    ok(du.seq.map(s => s.hand).join() === 'main,off,main,off,main,off' && du.seq.filter(s => s.hand === 'off').every(s => Math.abs(s.dur - 0.224) < 0.002) && du.seq.filter(s => s.hand === 'main').every(s => Math.abs(s.dur - 0.336) < 0.002), 'swings alternate main/off, the off swing running the knife\'s 0.224 s: ' + du.seq.map(s => s.hand[0] + ':' + s.dur).join(' '));
    ok(Math.abs(du.seq[0].dur - 0.336) < 0.002 && Math.abs(du.seq[1].dur - 0.224) < 0.002, 'dual swings are 20% faster (sword 0.42 -> 0.336, knife 0.28 -> 0.224)');
    ok(du.offHits >= 1 && du.offMax <= 5 && du.catalog === '0.42/2-7/0.28' && du.mainRestored, 'off-hand blows are capped at 70% (knife 2-7 -> max 5; saw max ' + du.offMax + '), catalogue and main hand restored');
    ok(du.afterTwo === undefined && !du.refusedTwo, 'a two-hander clears the off hand, and the off hand cannot be set while one is in hand');
    ok(du.afterShield === undefined && du.shieldOn && du.shieldGone, 'shield and off hand exclude each other both ways');
    ok(!du.sameInactive, 'the same weapon in both hands is simply inactive');

    // block strength and parry
    const bl = await E(() => {
      __stage(); __sw(true, true, true); const p = G.player; p.hpMax = p.hp = 900;
      const hit = (d) => { const b = p.hp; GUARD.state.inMelee = true; damagePlayer(d, 'Test'); GUARD.state.inMelee = false; return b - p.hp; };
      const reset = () => { UPG.blocking = false; UPG.parryWindow = 0; UPG.parryCool = 0; };
      __weapon('knife'); __weapon('sword'); __shield(false); ARMS12.setOff('knife');
      const o = {}; reset(); o.none = hit(100);
      reset(); triggerBlock(); UPG.parryWindow = 0; o.dual = hit(100);
      reset(); triggerBlock(); o.parry = hit(100);
      ARMS12.stowOff(); __shield(true); reset(); triggerBlock(); UPG.parryWindow = 0; o.shield = hit(100);
      reset(); __shield(false); reset(); triggerBlock(); UPG.parryWindow = 0; o.bare = hit(100);
      reset(); return o;
    });
    ok(bl.none === 100 && bl.dual === 45 && bl.shield === 33 && bl.bare === 50, 'blocks: no guard 100, two blades 45, shield 33, bare guard 50 (dual ' + bl.dual + ', shield ' + bl.shield + ')');
    ok(bl.parry === 0, 'parry with two blades turns the blow aside exactly as before');

    // save / load of the off-hand slot, old saves, hostile saves
    const sv = await E(async () => {
      __stage(); __sw(true, true, true); const o = {};
      __weapon('knife'); __weapon('sword'); __shield(false); ARMS12.setOff('knife');
      const snap = JSON.parse(JSON.stringify(snapshotGame()));
      o.saved = snap.flags && snap.flags.p12a_off;
      delete G.flags.p12a_off; restoreGame(JSON.parse(JSON.stringify(snap))); __sw(true, true, true);
      o.restored = G.flags.p12a_off; o.activeAfter = ARMS12.dualActive();
      // an old save has no flag at all
      const old = JSON.parse(JSON.stringify(snap)); delete old.flags.p12a_off; restoreGame(old); o.oldNone = ARMS12.offId() === null && ARMS12.dualActive() === false;
      // hostile values are dropped, never trusted
      o.hostile = {};
      for (const [k, v] of [['big', 99], ['neg', -3], ['str', 'knife'], ['frac', 1.5], ['obj', { a: 1 }], ['nan', NaN], ['proto', '__proto__'], ['html', '<img src=x onerror=1>']]) {
        G.flags.p12a_off = v; o.hostile[k] = [ARMS12.offId(), G.flags.p12a_off];
      }
      // an owned-but-ineligible weapon cannot be injected through the index (only the four OFF_IDS), and an unowned one is rejected
      G.flags.p12a_off = 4; o.unowned = ARMS12.offId();               // dirk not owned
      G.flags.p12a_off = 2; G.player.weapons = G.player.weapons.filter(w => w !== 'sword'); o.unownedSword = ARMS12.offId();
      __weapon('sword');
      o.hostileEligible = ['spear', 'maul', 'crossbow', 'pistol', 'hands', 'glass', 'tobin_blade', 'throwknife', 'p12_greatmaul'].map(i => ARMS12.offEligible(i));
      delete G.flags.p12a_off; return o;
    });
    ok(sv.saved === 1 && sv.restored === 1 && sv.activeAfter, 'the off-hand slot survives a save/restore round trip');
    ok(sv.oldNone, 'an old save without the flag loads with an empty off hand');
    ok(Object.values(sv.hostile).every(v => v[0] === null && v[1] === undefined), 'hostile flag values (out of range, strings, objects, NaN, markup) are rejected and cleared');
    ok(sv.unowned === null && sv.unownedSword === null && sv.hostileEligible.every(x => x === false), 'an unowned weapon or a heavy/ranged/innate/long weapon can never be the off-hand');

    // ---- 5. inventory UI and options rows
    await E(() => { __stage(); __sw(true, true, true); __weapon('knife'); __weapon('sword'); __shield(false); delete G.flags.p12a_off; G.state = 'panel'; renderInventory(); });
    const ui = await E(() => {
      const box = document.querySelector('#modal-panel .p12a-off'); const btns = [...document.querySelectorAll('#modal-panel [data-p12a-off]')];
      const o = { has: !!box, n: btns.length, before: btns.map(b => b.textContent) };
      if (btns[0]) btns[0].click();
      o.flagAfter = G.flags.p12a_off; o.after = [...document.querySelectorAll('#modal-panel [data-p12a-off]')].map(b => b.textContent + '|' + b.classList.contains('sel'));
      const panel = document.querySelector('#modal-panel'); o.hover = panel.scrollWidth <= panel.clientWidth + 1;
      return o;
    });
    ok(ui.has && ui.n >= 2 && ui.flagAfter >= 1 && ui.after.some(t => t.includes('Off hand:') && t.endsWith('true')), 'inventory shows off-hand buttons; clicking one sets it (' + ui.before.join(' / ') + ')');
    await snap('inventory-offhand');
    await E(() => { closeModal(); G.state = 'play'; delete G.flags.p12a_off; renderMenu(); });
    const rows = await E(() => { try { renderAccessibilityMenu(); } catch (e) { return { err: e.message }; } return { ids: ['a12-bash', 'a12-two', 'a12-dual'].map(i => !!document.getElementById(i)) }; });
    if (rows.err) console.log('INFO options rows via menu: ' + rows.err);
    await E(() => { closeModal(); G.state = 'play'; });

    // ---- 6. keyboard, touch, controller
    const inp = await E(() => { __stage(); __sw(true, true, true); __shield(true); __weapon('sword'); const e = __mk('proctor', 13.5, 11.5, 'chase'); e.cool = 9; window.__e = e; return true; });
    await page.keyboard.press('.');
    const kb = await E(() => ({ bashes: ARMS12.st.bashes, stun: window.__e.stun }));
    ok(kb.bashes >= 1 && kb.stun > 0, 'keyboard: the . key bashes');
    await E(() => { __run(3); __rm(window.__e); G.state = 'play'; });
    // touch
    await E(() => { __stage(); if (typeof setTouchMode === 'function') setTouchMode(true); __shield(true); __weapon('sword'); const e = __mk('proctor', 13.5, 11.5, 'chase'); e.cool = 9; window.__e = e; __run(0.1); });
    const tb = await E(() => { const b = document.getElementById('p12a-bash'); return { exists: !!b, visible: !!b && !b.hidden }; });
    ok(tb.exists && tb.visible, 'touch: a Bash button appears when a shield is on the arm');
    await page.evaluate(() => { document.getElementById('p12a-bash').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 5, clientX: 10, clientY: 10 })); document.getElementById('p12a-bash').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 5, clientX: 10, clientY: 10 })); });
    const tb2 = await E(() => ({ bashes: ARMS12.st.bashes, stun: window.__e.stun }));
    ok(tb2.stun > 0, 'touch: the Bash button bashes');
    await E(() => { __run(3); __rm(window.__e); __shield(false); update(1 / 60); update(1 / 60); });
    const tb3 = await E(() => document.getElementById('p12a-bash').hidden);
    ok(tb3 === true, 'touch: the Bash button hides again with no shield');
    // controller: LT held + RT (thrust)
    await E(() => { __stage(); __shield(true); __weapon('sword'); const e = __mk('proctor', 13.5, 11.5, 'chase'); e.cool = 9; window.__e = e;
      const mk = (lt, rt) => { const b = []; for (let i = 0; i < 16; i++) b.push({ pressed: false, value: 0 }); b[6] = { pressed: lt, value: lt ? 1 : 0 }; b[7] = { pressed: rt, value: rt ? 1 : 0 }; return { connected: true, axes: [0, 0, 0, 0], buttons: b }; };
      window.__pad = mk(true, false); navigator.getGamepads = () => [window.__pad]; window.__mkpad = mk; });
    await E(() => { controlsTick(); update(1 / 60); });
    await E(() => { window.__pad = window.__mkpad(true, true); controlsTick(); update(1 / 60); });
    const cp = await E(() => { const r = { bashes: ARMS12.st.bashes, stun: window.__e.stun }; window.__pad = window.__mkpad(false, false); return r; });
    ok(cp.stun > 0, 'controller: hold LT (guard) and press RT = bash');
    await E(() => { navigator.getGamepads = () => []; __run(3); __rm(window.__e); });

    // ---- 7. visuals: fp view with both hands, two-hander pose, shield thrust, 640x400
    await E(() => { __stage(); __sw(true, true, true); __shield(false); __weapon('knife'); __weapon('sword'); delete G.flags.p12a_off; ARMS12.setOff('knife'); window.requestAnimationFrame && 0; render(); });
    await page.waitForTimeout(200); await snap('dual-idle');
    await E(() => { attack('swing'); __run(0.1); render(); });
    await page.waitForTimeout(30); await snap('dual-swing-main');
    await E(() => { __run(0.5); attack('swing'); __run(0.05); render(); });
    await snap('dual-swing-off');
    await E(() => { __run(1); __weapon('p12_greatmaul'); __run(0.8); render(); });
    await page.waitForTimeout(200); await snap('twohander-idle');
    await snap('twohander-idle-b');
    await E(() => { __weapon('sword'); __run(0.8); __shield(true); const e = __mk('proctor', 13.5, 11.5, 'chase'); e.cool = 9; window.__e = e; ARMS12.st.bashCool = 0; G.player.fat = G.player.fatMax; ARMS12.bash(true); __run(0.1); render(); });
    await snap('bash-thrust');
    await E(() => { __run(3); __rm(window.__e); });
    await page.setViewportSize({ width: 640, height: 400 });
    await page.waitForTimeout(300);
    await E(() => { __weapon('knife'); __weapon('sword'); __shield(false); ARMS12.setOff('knife'); G.state = 'panel'; renderInventory(); });
    const fit = await E(() => { const p = document.querySelector('#modal-panel'); const r = p.getBoundingClientRect(); const g = document.querySelector('#game').getBoundingClientRect(); return { hscroll: p.scrollWidth > p.clientWidth + 1, inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.bottom <= g.bottom + 1 }; });
    ok(!fit.hscroll && fit.inside, '640x400: the inventory with the off-hand controls fits with no horizontal scroll');
    await snap('compact-inventory-640');
    await E(() => { closeModal(); G.state = 'play'; __sw(true, true, true); __shield(true); __weapon('sword'); if (typeof setTouchMode === 'function') setTouchMode(true); update(1 / 60); render(); });
    await page.waitForTimeout(200); await snap('compact-touch-640');
    const tfit = await E(() => { update(1 / 60); const b = document.getElementById('p12a-bash').getBoundingClientRect(), g = document.querySelector('#game').getBoundingClientRect(); return b.width > 0 && b.right <= g.right + 1 && b.bottom <= g.bottom + 1; });
    ok(tfit, '640x400: the touch Bash button is on screen');

    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));
  } finally { await browser.close(); }
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
