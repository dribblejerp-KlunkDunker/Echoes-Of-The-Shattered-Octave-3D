// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/synod15.test.js
// Phase 15 SYNOD: Synod sermons at the Chapel, the Synod wash on the map, eclipses. Uses the managed preview; never starts a
// server. SHOTS=<dir> writes screenshots there.
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';

async function toGame(page) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill('Synod Tester');
  await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click(); await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => G.state === 'play'); await page.waitForTimeout(300);
}
async function boot(browser, viewport, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/synod15.js*', r => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 15151; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await page.goto(URL);
  await toGame(page);
  return { page, errors };
}
// into the Chapel at a time and with flags; the player stands by the free place, facing the front
const inChapel = (page, day, tod, flags) => page.evaluate(([day, tod, flags]) => {
  for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {});
  G.day = day; G.tod = tod; G.state = 'play'; if (G.openPanel) closeModal(); loadMap('chapel'); G.state = 'play';
  Engine.cam.x = 5.4; Engine.cam.y = 9.3; Engine.cam.dir = -Math.PI / 2; G.noise = 1;
  if (window.SYNOD15) SYNOD15.syncChapel();
}, [day, tod, flags]);
const mine = (page) => page.evaluate(() => G.map.entities.filter(e => e._p15s).map(e => e._p15s));
const facs = (page) => page.evaluate(() => ({ hedge: G.player.factions.hedge, synod: G.player.factions.synod, bounty: crimeState().bounty }));
const sigFlags = (page) => page.evaluate(() => JSON.stringify(Object.keys(G.flags).filter(k => k.indexOf('p15s_') !== 0 && !/^p7[ts]_/.test(k)).sort().map(k => [k, G.flags[k]])));
const sigEnts = (page) => page.evaluate(() => JSON.stringify(G.map.entities.map(e => (e.kind === 'npc' || e.kind === 'enemy' || /^kestrel/.test(e.sprite || '')) ? [e.kind, e.id || '', (e.sprite || '').replace(/_m\d+$/, '')] : [e.kind, e.id || '', e.sprite || '', +e.x.toFixed(2), +e.y.toFixed(2)]).sort()));

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    // ---------------------------------------------------------------- loaded, text, French
    const base = await pg.evaluate(() => ({ has: typeof SYNOD15, cfg: JSON.stringify(SYNOD15.cfg), n: SYNOD15.TEXTS.length, npc: !!NPCS.p15s_preacher, fx: GFX.FX.includes('eclipseSky'), flags: Object.keys(G.flags).filter(k => k.startsWith('p15s_')),
      noEmoji: SYNOD15.TEXTS.every(t => typeof t === 'string' && t.length > 0 && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)), noNumeralDate: SYNOD15.TEXTS.every(t => !/\b\d{1,2}(st|nd|rd|th)\b/.test(t)),
      scream: SYNOD15.TEXTS.filter(t => /\b(screams?|screamed|screaming)\b/i.test(t)).length, hush: SYNOD15.TEXTS.filter(t => /Hush/.test(t) && /(looks like|resembles|shaped like|is a (thing|shape|creature))/i.test(t)).length }));
    check(base.has === 'object' && base.cfg === '{"sermons":true,"wash":true,"eclipse":true}', 'SYNOD15 exists and all three switches are on by default: ' + base.cfg);
    check(base.n > 90 && base.noEmoji && base.noNumeralDate && base.scream === 0 && base.hush === 0, 'registered text is non-empty, emoji-free, no numeral dates, nobody screams, the Hush is not described (' + base.n + ' strings)');
    check(base.npc && base.fx && base.flags.length === 0, 'the deacon is registered, GFX.FX has eclipseSky, a fresh game has no p15s_ flags');
    const fs = require('fs'), path = require('path');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p15-synod.tsv'), 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
    const pairs = new Map(tsv.map(r => [r[0], r[1]]));
    const texts = await pg.evaluate(() => SYNOD15.TEXTS);
    const noFr = texts.filter(t => !pairs.get(t));
    const badPh = texts.filter(t => pairs.get(t) && JSON.stringify((t.match(/\{\d+\}/g) || []).sort()) !== JSON.stringify((pairs.get(t).match(/\{\d+\}/g) || []).sort()));
    check(noFr.length === 0 && badPh.length === 0 && tsv.every(r => r.length === 2), 'every registered string has a French pair with the same placeholders (' + noFr.length + ' missing, ' + badPh.length + ' bad)');
    check(!tsv.some(r => /\b(Le Hush|les Hollows|Cantor\b|Narrow\b)/.test(r[1])) && !tsv.some(r => /(^|[^\p{L}])(toi|tes|tu (es|as|peux|veux|dois))(?![\p{L}])/iu.test(r[1])), 'the French follows the glossary (le Silence, vous) and keeps no English terms');

    // ---------------------------------------------------------------- sermon schedule: a pure function of the day, the hour, the story
    const sched = await pg.evaluate(() => { const S = SYNOD15, o = {};
      o.grid = []; for (let d = 0; d < 16; d++) for (const t of [0.2, 0.28, 0.3, 0.37, 0.5, 0.72, 0.74, 0.8, 0.82, 0.86, 0.9]) o.grid.push(S.sermonAt(d, t, {}));
      o.again = []; for (let d = 0; d < 16; d++) for (const t of [0.2, 0.28, 0.3, 0.37, 0.5, 0.72, 0.74, 0.8, 0.82, 0.86, 0.9]) o.again.push(S.sermonAt(d, t, {}));
      o.live = []; for (let d = 0; d < 16; d++) for (let h = 0; h < 24; h += 0.5) { const s = S.sermonAt(d, h / 24, {}); if (s >= 0) o.live.push(d + ':' + s); }
      o.edges = [S.sermonAt(5, 6.49 / 24, {}), S.sermonAt(5, 6.5 / 24, {}), S.sermonAt(5, 8.99 / 24, {}), S.sermonAt(5, 9 / 24, {})];
      o.gone = ['greening', 'escaped', 'part3'].map(k => S.sermonAt(5, 0.3, { [k]: true }));
      o.rite = [S.sermonAt(12, 0.75, { rite_started: true }), S.sermonAt(12, 0.75, { rite_ready: true }), S.sermonAt(12, 0.75, { rite_ready: true, greening: true })]; o.pre = [S.sermonAt(4, 0.75, { rite_ready: true }), S.sermonAt(12, 0.75, {}), S.sermonAt(12, 0.75, { kaelen_met: true })];
      o.first = [4, 5, 7, 12, 13, 15].map(d => S.sermonDay(d)); o.ids = [S.sid(4, 1), S.sid(5, 0), S.sid(7, 2)];
      return o; });
    check(JSON.stringify(sched.grid) === JSON.stringify(sched.again), 'the sermon schedule gives the same answer twice (deterministic)');
    check(JSON.stringify(sched.live) === JSON.stringify(['4:1', '4:1', '4:1', '4:1', '5:0', '5:0', '5:0', '5:0', '5:0', '7:2', '7:2', '7:2', '7:2', '7:2', '12:1', '12:1', '12:1', '12:1', '13:0', '13:0', '13:0', '13:0', '13:0', '15:2', '15:2', '15:2', '15:2', '15:2']), 'sermons are live only on Stasisday dusk, Dawnday first light and Memoryday evening: ' + sched.live.join(','));
    check(JSON.stringify(sched.edges) === JSON.stringify([-1, 0, 0, -1]), 'the Dawnday sermon runs from 06:30 to 09:00 and not a minute either side: ' + sched.edges);
    check(sched.gone.every(x => x === -1) && sched.rite.every(x => x === -1) && JSON.stringify(sched.pre) === '[1,1,1]', 'no sermon after the Greening or once the Rite is on (started, or ready and day 10 on); before it they go on, even with rite_ready: ' + JSON.stringify([sched.gone, sched.rite, sched.pre]));
    check(sched.first.join() === '1,0,2,1,0,2' && sched.ids.join() === '14,16,24', 'sermonDay and the sermon number are exact: ' + sched.first + ' / ' + sched.ids);
    const offSched = await pg.evaluate(() => { SYNOD15.cfg.sermons = false; const r = SYNOD15.sermonAt(5, 0.3, {}); SYNOD15.cfg.sermons = true; return r; });
    check(offSched === -1, 'switch off: no sermon is ever live');

    // ---------------------------------------------------------------- the Chapel: people, the free place, and nothing else
    await inChapel(pg, 4, 0.75);
    const cast = await pg.evaluate(() => ({ list: G.map.entities.filter(e => e._p15s).map(e => e._p15s).sort(), transient: G.map.entities.filter(e => e._p15s).every(e => e.transient && e._decor), seat: !!SYNOD15.seatEnt(), pre: G.map.entities.filter(e => e._p15s === 'preacher').map(e => e.id) }));
    check(cast.list.join() === 'cong0,cong1,cong2,cong3,cong4,cong5,preacher,seat' && cast.transient && cast.pre[0] === 'p15s_preacher', 'a live sermon seats six townsfolk, a deacon and one free place, all transient: ' + cast.list);
    await shot(pg, 'sermon-nave');
    await inChapel(pg, 4, 0.6);
    check((await mine(pg)).length === 0, 'outside the hour the nave is empty (no entities)');
    await inChapel(pg, 3, 0.75);
    check((await mine(pg)).length === 0, 'on a day with no sermon the nave is empty');
    await inChapel(pg, 4, 0.75, { greening: true });
    check((await mine(pg)).length === 0, 'after the Greening the nave is empty');
    await inChapel(pg, 4, 0.75);
    const noRand = await pg.evaluate(() => { let n = 0; const r0 = Math.random; Math.random = () => { n++; return r0(); }; const S = SYNOD15;
      for (const e of G.map.entities.filter(e => e._p15s).slice()) G.map.entities.splice(G.map.entities.indexOf(e), 1); S.syncChapel(); S.openSermon(); S.stepSermon(12); S.finishSermon(); S.closeSermon();
      G.day = 5; G.tod = 0.3; S.syncChapel(); S.disrupt('sung'); S.tickScatter(1); S.tickScatter(3); S.tick(0.1); S.sanitizeFlags(); S.spawnRoll();
      Math.random = r0; return n; });
    check(noRand === 0, 'sermons never touch Math.random (' + noRand + ' draws)');

    // ---------------------------------------------------------------- attending: exact outcomes
    const att = [];
    for (let i = 0; i < 5; i++) {
      await inChapel(pg, 4 + 8 * i, 0.75, i ? { p15s_att: i } : {});                          // five Stasisdays, five sermons
      const r = await pg.evaluate(() => { G.coverSuspicion = 2; const S = SYNOD15, a0 = G.flags.p15s_att || 0, b = { synod: G.player.factions.synod, hedge: G.player.factions.hedge, bounty: crimeState().bounty, j: G.journal.length };
        const ui = S.openSermon(); const opened = !!ui && S.ui.open && G.openPanel === 'p15s_sermon' && G.state === 'panel';
        S.stepSermon(7.9); const l1 = document.querySelectorAll('.s15-line').length; const mid = (G.flags.p15s_att || 0) - a0; S.stepSermon(0.2); const l2 = document.querySelectorAll('.s15-line').length; S.stepSermon(40);
        const done = S.ui.done;
        const a = { opened, l1, l2, mid, done, dSynod: G.player.factions.synod - b.synod, dHedge: G.player.factions.hedge - b.hedge, dBounty: crimeState().bounty - b.bounty, cover: G.coverSuspicion, dJ: G.journal.length - b.j, att: G.flags.p15s_att, lk: G.flags.p15s_lk, last: G.flags.p15s_last, id: S.sid(G.day, 1) };
        S.closeSermon(); a.state = G.state; a.panel = G.openPanel; a.status = S.status(); a.seat = !!S.seatEnt(); return a; });
      att.push(r);
    }
    check(att.every(r => r.opened && r.l1 === 1 && r.l2 === 2 && r.mid === 0 && r.done), 'the sit shows one line, then the next after 8 s, and finishes only at the end (40 s, five lines)');
    check(att.map(r => r.dSynod).join() === '3,3,3,0,0' && att.every(r => r.dHedge === 0 && r.dBounty === 0), 'sitting gives +3 Church standing for the first three sermons and nothing after, never Hedge or crime: ' + att.map(r => r.dSynod));
    check(att.every(r => r.cover === 1) && att.map(r => r.dJ).join() === '1,0,0,0,0', 'sitting eases cover suspicion by exactly 1, and the logbook line is written once: ' + att.map(r => r.cover + '/' + r.dJ));
    check(att.map(r => r.att).join() === '1,2,3,4,5' && att.every(r => r.lk === 1 && r.last === r.id) && att.every(r => r.state === 'play' && r.panel === null && r.status.attended && !r.seat), 'attend flags are exact, the panel closes cleanly, the place is taken (a sermon is not sat twice)');
    // leaving early gives nothing
    await inChapel(pg, 12, 0.75);
    const early = await pg.evaluate(() => { const S = SYNOD15, b = { synod: G.player.factions.synod, att: G.flags.p15s_att || 0 }; S.openSermon(); S.stepSermon(15); S.leaveSermon(); return { dSynod: G.player.factions.synod - b.synod, att: (G.flags.p15s_att || 0) - b.att, state: G.state, open: S.ui.open, again: S.status().attended }; });
    check(early.dSynod === 0 && early.att === 0 && early.state === 'play' && !early.open && !early.again, 'rising early gives no standing and counts as nothing: ' + JSON.stringify(early));
    // too far from the place
    const far = await pg.evaluate(() => { Engine.cam.x = 11; Engine.cam.y = 2; return !SYNOD15.openSermon(); });
    check(far, 'the place cannot be taken from across the nave');
    // the grace: the robes pass a little easier for the rest of that day
    const grace = await pg.evaluate(() => { const S = SYNOD15; G.day = 4; G.tod = 0.75; G.flags.p15s_last = S.sid(4, 1); G.flags.p15s_lk = 1; const a = S.graceActive(); G.day = 5; const b = S.graceActive(); G.day = 4; G.flags.p15s_lk = 2; const c = S.graceActive(); G.flags.p15s_lk = 1; G.flags.greening = true; const d = S.graceActive(); delete G.flags.greening; S.cfg.sermons = false; const e = S.graceActive(); S.cfg.sermons = true; return [a, b, c, d, e]; });
    check(JSON.stringify(grace) === '[true,false,false,false,false]', 'the disguise grace holds for the sat sermon on that day only: ' + grace);

    // ---------------------------------------------------------------- disrupting: exact outcomes
    const dis = async (day, kind, pre, hide) => { await inChapel(pg, day, 0.3 + 0.0001, pre || {}); return pg.evaluate(([kind, hide]) => { const S = SYNOD15; if (hide) for (const e of G.ents) if (e.kind === 'npc') e.hidden = true;
      const b = { synod: G.player.factions.synod, hedge: G.player.factions.hedge, bounty: crimeState().bounty, n: G.map.entities.filter(e => e._p15s).length };
      const ok = S.disrupt(kind); const a = { ok, dSynod: G.player.factions.synod - b.synod, dHedge: G.player.factions.hedge - b.hedge, dBounty: crimeState().bounty - b.bounty, n0: b.n, dis: G.flags.p15s_dis, lk: G.flags.p15s_lk, last: G.flags.p15s_last, id: S.sid(G.day, 0), st: S.status() };
      const again = S.disrupt(kind); a.again = again; a.dBounty2 = crimeState().bounty - b.bounty; return a; }, [kind, hide]); };
    const d1 = await dis(5, 'sung');
    check(d1.ok && d1.dSynod === -3 && d1.dHedge === 3 && d1.dBounty === 20 && d1.dis === 1 && d1.lk === 2 && d1.last === d1.id && d1.st.disrupted && !d1.again && d1.dBounty2 === 20, 'singing in the nave: Church -3, Hedge +3, a 20 bounty crime, flags exact, and a second disturbance of the same sermon does nothing: ' + JSON.stringify(d1));
    const swept = await pg.evaluate(() => { const S = SYNOD15, n0 = G.map.entities.filter(e => e._p15s).length, ent = G.map.entities.filter(e => e._cong != null)[0]; const x0 = ent.x, y0 = ent.y; S.tickScatter(1.5); const moved = Math.hypot(ent.x - x0, ent.y - y0) > 1; const mid = G.map.entities.filter(e => e._cong != null).length; S.tickScatter(2); return { n0, moved, mid, left: G.map.entities.filter(e => e._p15s).map(e => e._p15s) }; });
    check(swept.n0 === 7 && swept.moved && swept.mid === 6 && swept.left.join() === 'preacher', 'the congregation walks to the door over three seconds and is gone, the deacon stays: ' + JSON.stringify(swept));
    const prod = await pg.evaluate(() => { const S = SYNOD15, p = G.map.entities.find(e => e._p15s === 'preacher'); talk(p); const t = DLG.log.map(x => x.t).join('|'); const ok = t.indexOf(S.TX.preacher.after) >= 0; closeModal(); G.state = 'play'; return ok; });
    check(prod, 'the silent deacon has his closing line after a disturbance');
    const d2 = await dis(5 + 8, 'noise', { p15s_dis: 3 });
    check(d2.ok && d2.dHedge === 0 && d2.dSynod === -3 && d2.dBounty === 20 && d2.dis === 4, 'the Hedge only thanks the first three disruptions: ' + JSON.stringify(d2));
    const d3 = await dis(5 + 16, 'sung', {}, true);
    check(d3.ok && d3.dBounty === 0 && d3.dSynod === 0 && d3.dHedge === 0 && d3.dis === 1 && d3.st.disrupted, 'with nobody to see it there is no crime and no standing change, but the sermon is still ruined: ' + JSON.stringify(d3));
    // each trigger is wired: song, throw, noise, blow
    await inChapel(pg, 5 + 24, 0.3);
    const viaSong = await pg.evaluate(() => { G.player.voice = G.player.voiceMax; G.song.t = 0; castSong('root'); return { st: SYNOD15.status().disrupted, dis: G.flags.p15s_dis }; });
    check(viaSong.st && viaSong.dis === 1, 'a Song (the Root note) ruins the sermon through castSong');
    await inChapel(pg, 5 + 32, 0.3);
    const viaMur = await pg.evaluate(() => { G.player.voice = G.player.voiceMax; G.song.t = 0; castSong('murmur'); return SYNOD15.status().disrupted; });
    check(viaMur === false, 'the murmur is quiet enough: it does not ruin a sermon');
    await inChapel(pg, 5 + 40, 0.3);
    const viaThrow = await pg.evaluate(() => { G.throwReady = 0; G.give('pebble'); throwDistraction('pebble'); const a = SYNOD15.status().disrupted; return a; });
    check(viaThrow, 'a thrown stone ruins the sermon through throwDistraction');
    await inChapel(pg, 5 + 48, 0.3);
    const viaJar = await pg.evaluate(() => { const had = ITEMS.p12_jar; if (!had) return null; G.throwReady = 0; G.give('p12_jar'); throwDistraction('p12_jar'); return { d: SYNOD15.status().disrupted, kind: SYNOD15.stats.disrupted }; });
    check(viaJar === null || viaJar.d, 'a thrown damper jar ruins the sermon');
    await inChapel(pg, 5 + 56, 0.3);
    const viaNoise = await pg.evaluate(() => { const S = SYNOD15; G.noise = 6.5; S.tickSermon(0.3); const a = S.status().disrupted; S.tickSermon(0.5); const b = S.status().disrupted; return [a, b]; });
    check(viaNoise[0] === false && viaNoise[1] === true, 'a held loud noise (running on the flags, a shout) ruins it after 0.6 s, not at once: ' + viaNoise);
    await inChapel(pg, 5 + 64, 0.3);
    const quietWalk = await pg.evaluate(() => { const S = SYNOD15; G.noise = 4.4; for (let i = 0; i < 40; i++) S.tickSermon(0.1); return S.status().disrupted; });
    check(quietWalk === false, 'running up the nave (noise 4.4) does not ruin a sermon');
    await inChapel(pg, 5 + 72, 0.3);
    const viaBlow = await pg.evaluate(() => { const S = SYNOD15, e = G.map.entities.find(x => x._cong === 1), b = { hedge: G.player.factions.hedge, bounty: crimeState().bounty }; assaultCivilian(e); return { d: S.status().disrupted, dHedge: G.player.factions.hedge - b.hedge, dBounty: crimeState().bounty - b.bounty }; });
    check(viaBlow.d && viaBlow.dHedge === 0 && viaBlow.dBounty >= 40 && viaBlow.dBounty < 60, 'striking a worshipper ruins it, with the assault crime of the law and no extra "disturbance" crime and no Hedge thanks: ' + JSON.stringify(viaBlow));
    // robes
    await inChapel(pg, 5 + 80, 0.3);
    const robes = await pg.evaluate(() => { G.give('a_synodrobe'); equipArmor('a_synodrobe'); const w = wearingDisguise(); SYNOD15.disrupt('sung'); return { w, exposed: disguiseExposed() }; });
    check(robes.w && robes.exposed, 'disturbing a sermon in Synod robes exposes the disguise');
    await pg.evaluate(() => { removeArmor('body'); });

    // ---------------------------------------------------------------- the main quest is untouched
    const QF = ['kaelen_met', 'coil_done', 'rite_ready', 'rite_started', 'greening', 'part3', 'escaped', 'lyra_free'];
    await inChapel(pg, 4, 0.75, { kaelen_met: true, coil_done: true });
    const before = await sigFlags(pg);
    const qa = await pg.evaluate(() => { const S = SYNOD15; S.openSermon(); S.finishSermon(); S.closeSermon(); const a = NPCS.harrow.quest(G) && NPCS.harrow.quest(G).text; return a; });
    await inChapel(pg, 5, 0.3, { kaelen_met: true, coil_done: true });
    await pg.evaluate(() => { SYNOD15.disrupt('sung'); });
    const afterF = await sigFlags(pg);
    check(JSON.parse(afterF).filter(([k]) => QF.includes(k)).map(([k, v]) => k + v).join() === 'coil_donetrue,kaelen_metrue'.replace('metrue', 'mettrue') || JSON.parse(afterF).filter(([k]) => QF.includes(k)).length === 2, 'sitting and disrupting write no story flag');
    check(JSON.parse(afterF).every(([k]) => !/^(rite|greening|part|escape|lyra|kaelen_met_)/.test(k) || QF.includes(k)), 'no new story flag appears after a sermon');
    const stepFlags = await pg.evaluate(() => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = 4; G.tod = 0.75; loadMap('chapel'); G.state = 'play'; Engine.cam.x = 5.4; Engine.cam.y = 9.3; const b = JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p15s_')).sort()); SYNOD15.syncChapel(); SYNOD15.openSermon(); SYNOD15.finishSermon(); SYNOD15.closeSermon(); G.day = 5; G.tod = 0.3; SYNOD15.syncChapel(); SYNOD15.disrupt('sung'); return [b, JSON.stringify(Object.keys(G.flags).filter(k => !k.startsWith('p15s_')).sort())]; });
    check(stepFlags[0] === stepFlags[1], 'a sermon sat and a sermon wrecked touch no game flag outside p15s_: ' + stepFlags);
    const noBlock = await pg.evaluate(() => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.kaelen_met = true; G.flags.rite_ready = true; G.day = 5; G.tod = 0.3; loadMap('chapel'); G.state = 'play'; SYNOD15.syncChapel(); const ig = G.map.entities.find(e => e.id === 'ignatius'); const o = { hasIg: !!ig && !ig.hidden && !ig.dead, ig0: ig && [ig.x, ig.y], sermon: SYNOD15.status().live, q: [G.flags.rite_ready, G.flags.kaelen_met] }; SYNOD15.disrupt('sung'); const ig2 = G.map.entities.find(e => e.id === 'ignatius'); o.stays = !!ig2 && !ig2.dead && !ig2.hidden && ig2.x === ig.x; o.legion = G.map.entities.filter(e => e.id === 'legionnaire' || /legion/i.test(e.sprite || '')).every(e => !e.dead); G.day = 12; SYNOD15.syncChapel(); o.day12 = SYNOD15.status().live; return o; });
    check(noBlock.hasIg && noBlock.stays && noBlock.legion && noBlock.sermon && !noBlock.day12 && noBlock.q.join() === 'true,true', 'with the Rite ready (before day 10) the sermon goes on beside Ignatius and the Legionnaires, who are untouched; on the Rite day it steps aside: ' + JSON.stringify(noBlock));

    // ---------------------------------------------------------------- the panel: keyboard, touch, controller, reduced motion, 640x400
    await inChapel(pg, 4, 0.75);
    await pg.evaluate(() => { SYNOD15.openSermon(); });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    check(await pg.evaluate(() => SYNOD15.ui.open && !SYNOD15.ui.done), 'keyboard: Enter during the sit does not skip it');
    await shot(pg, 'sermon-panel');
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
    let k1 = await pg.evaluate(() => [G.state, G.openPanel, SYNOD15.ui.open, G.flags.p15s_att || 0]);
    check(k1[0] === 'play' && k1[1] === null && !k1[2] && k1[3] === 0, 'keyboard: Escape rises early, with no standing, and closes the panel: ' + k1);
    await pg.evaluate(() => { SYNOD15.openSermon(); SYNOD15.stepSermon(45); });
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(150);
    k1 = await pg.evaluate(() => [G.state, G.openPanel, SYNOD15.ui.open, G.flags.p15s_att]);
    check(k1[0] === 'play' && k1[1] === null && !k1[2] && k1[3] === 1, 'keyboard: at the end Enter rises and closes: ' + k1);
    // touch: the buttons by click
    await inChapel(pg, 12, 0.75);
    await pg.evaluate(() => { SYNOD15.openSermon(); });
    await pg.locator('#s15-leave').click(); await pg.waitForTimeout(100);
    check(await pg.evaluate(() => G.state === 'play' && !SYNOD15.ui.open && !(G.flags.p15s_att > 1)), 'touch: the Rise and go button leaves early');
    await pg.evaluate(() => { SYNOD15.openSermon(); SYNOD15.stepSermon(45); });
    check(await pg.locator('#s15-go').isVisible(), 'touch: the Rise button shows when the sermon is through');
    await pg.locator('#s15-go').click(); await pg.waitForTimeout(100);
    check(await pg.evaluate(() => G.state === 'play' && !SYNOD15.ui.open), 'touch: the Rise button closes the panel');
    // controller: B leaves, A at the end rises; a button held on opening is not a press
    await inChapel(pg, 20, 0.75);
    await pg.evaluate(() => { window.__p = { 0: false, 1: false }; navigator.getGamepads = () => [{ connected: true, buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: !!window.__p[i], value: 0 })), axes: [0, 0, 0, 0] }]; SYNOD15.openSermon(); });
    await pg.waitForTimeout(300);
    await pg.evaluate(() => { window.__p[1] = true; }); await pg.waitForTimeout(300); await pg.evaluate(() => { window.__p[1] = false; });
    check(await pg.evaluate(() => G.state === 'play' && !SYNOD15.ui.open && !(G.flags.p15s_att > 2)), 'controller: B rises early');
    await pg.evaluate(() => { window.__p[0] = true; SYNOD15.openSermon(); SYNOD15.stepSermon(45); }); await pg.waitForTimeout(350);
    check(await pg.evaluate(() => SYNOD15.ui.open && SYNOD15.ui.done), 'controller: a button already held as the place opens is not a press');
    await pg.evaluate(() => { window.__p[0] = false; }); await pg.waitForTimeout(250); await pg.evaluate(() => { window.__p[0] = true; }); await pg.waitForTimeout(300); await pg.evaluate(() => { window.__p[0] = false; });
    check(await pg.evaluate(() => G.state === 'play' && !SYNOD15.ui.open), 'controller: A rises when the sermon is through');
    await pg.evaluate(() => { delete navigator.getGamepads; });
    // reduced motion: a skippable summary, no 40 s wait
    await inChapel(pg, 28, 0.75);
    await pg.evaluate(() => { GFX.reduceMotion = true; SYNOD15.openSermon(); });
    const rm = await pg.evaluate(() => ({ sum: (document.getElementById('s15-sum') || {}).textContent || '', vis: !document.getElementById('s15-sum').hidden, go: !document.getElementById('s15-go').hidden, lines: document.getElementById('s15-lines').hidden }));
    check(rm.sum.length > 40 && rm.vis && rm.go && rm.lines, 'reduce motion: the sermon is a short written summary and a Stay to the end button: ' + rm.sum.slice(0, 40));
    await shot(pg, 'sermon-reduced');
    await pg.locator('#s15-go').click(); await pg.waitForTimeout(80);
    const rm2 = await pg.evaluate(() => ({ done: SYNOD15.ui.done, att: G.flags.p15s_att, synod: G.player.factions.synod }));
    check(rm2.done && rm2.att >= 1, 'reduce motion: Stay to the end counts at once, with the same standing');
    await pg.keyboard.press('Enter'); await pg.waitForTimeout(100);
    await pg.evaluate(() => { GFX.reduceMotion = false; if (G.openPanel) { SYNOD15.closeSermon(); } G.state = 'play'; });
    await pg.evaluate(() => { GFX.reduceMotion = true; }); await inChapel(pg, 36, 0.3);
    const rmScatter = await pg.evaluate(() => { SYNOD15.disrupt('sung'); return G.map.entities.filter(e => e._cong != null).length; });
    check(rmScatter === 0, 'reduce motion: the congregation is gone at once, with no walk to the door');
    await pg.evaluate(() => { GFX.reduceMotion = false; });
    // 640 x 400
    await pg.setViewportSize({ width: 640, height: 400 });
    await inChapel(pg, 44, 0.75);
    await pg.evaluate(() => { SYNOD15.openSermon(); SYNOD15.stepSermon(33); });
    const fit = await pg.evaluate(() => { const r = document.getElementById('modal-panel').getBoundingClientRect(), g = document.getElementById('s15-leave').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, gb: g.bottom, gt: g.top, w: innerWidth, h: innerHeight, sx: document.documentElement.scrollWidth }; });
    check(fit.top >= -1 && fit.bottom <= fit.h + 1 && fit.left >= -1 && fit.right <= fit.w + 1 && fit.gb <= fit.h && fit.sx <= fit.w, 'the sermon panel fits 640x400 with its buttons on screen: ' + JSON.stringify(fit));
    await shot(pg, 'sermon-compact');
    await pg.evaluate(() => { SYNOD15.closeSermon(); G.state = 'play'; });
    await pg.setViewportSize({ width: 1280, height: 800 });

    // ---------------------------------------------------------------- the map
    const stages = await pg.evaluate(() => { const S = SYNOD15; return [{}, { kaelen_met: true }, { kaelen_met: true, coil_done: true }, { rite_ready: true }, { rite_started: true }, { greening: true }, { part3: true }, { escaped: true }, { kaelen_met: true, rite_ready: true, greening: true }].map(f => S.stageOf(f)); });
    check(stages.join() === '0,1,1,2,2,3,3,3,3', 'the wash stage follows the story: before kaelen_met 0, kaelen_met 1, the Rite 2, the Greening 3: ' + stages);
    const wash = await pg.evaluate(() => { const S = SYNOD15, o = {}; for (const v of ['reach', 'continent', 'woods']) { o[v] = [0, 1, 2, 3].map(s => S.washArea(v, s, 200, 200)); } o.legend = [0, 1, 2, 3].map(s => S.legendText(s));
      const inDisc = (v, s, x, y) => S.washBlobs(v, s).some(b => Math.hypot(x - b[0], y - b[1]) < b[2]) && !S.washHoles(v, s).some(b => Math.hypot(x - b[0], y - b[1]) < b[2]);
      o.oak = [2, 3].map(s => inDisc('reach', s, 0.565, 0.64)); o.cOak = [2, 3].map(s => inDisc('continent', s, 0.255, 0.52)); o.grove = [0, 1, 2, 3].map(s => inDisc('woods', s, 0.28, 0.6));
      o.q = inDisc('reach', 0, 0.8, 0.18); return o; });
    check(['reach', 'continent', 'woods'].every(v => wash[v][0] > 0 && wash[v][1] > wash[v][0] && wash[v][2] > wash[v][1] && wash[v][3] > 0), 'the wash is present at stage 0 and grows by story stage in every view: ' + JSON.stringify([wash.reach, wash.continent, wash.woods]));
    check(wash.oak[0] === true && wash.oak[1] === false && wash.cOak[0] === true && wash.cOak[1] === false && wash.grove.every(x => x === false) && wash.q === true, 'Oakhaven is washed by the Rite and struck out at the Greening; the Grove is never washed; the quarry always is');
    check(new Set(wash.legend).size === 4 && wash.legend.every(t => t.length > 20 && t.length < 90), 'four distinct legend lines, each short: ' + wash.legend.map(t => t.length));
    // the map in the panel, at both sizes
    const openMap = (p, st, view) => p.evaluate(([st, view]) => { for (const k of ['kaelen_met', 'rite_ready', 'rite_started', 'greening', 'part3', 'part4', 'escaped']) delete G.flags[k]; Object.assign(G.flags, st); G.state = 'play'; if (G.openPanel) closeModal(); loadMap('oakhaven'); G.state = 'play'; travelOpen(); if (view === 'continent') { TRAVEL.view = 'continent'; travelRender(); } return new Promise(r => setTimeout(r, 3300)); }, [st, view]);
    const legendInfo = (p) => p.evaluate(() => { const l = document.getElementById('p15s-legend'), pr = document.getElementById('modal-panel').getBoundingClientRect(); if (!l) return null; const r = l.getBoundingClientRect(), cs = getComputedStyle(l), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25; const cv = document.getElementById('tvmap').getBoundingClientRect(); return { text: l.textContent.trim(), in: r.left >= pr.left - 1 && r.right <= pr.right + 1 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1, lines: Math.round(r.height / lh), sx: document.documentElement.scrollWidth <= innerWidth, cvTop: cv.top, below: r.bottom <= cv.top + 1, cvBottom: cv.bottom, h: innerHeight, sw: l.scrollWidth <= l.clientWidth + 1 }; });
    const sizes = [{ width: 1280, height: 800 }, { width: 640, height: 400 }];
    for (const sz of sizes) {
      await pg.setViewportSize(sz);
      for (const [st, name] of [[{}, 0], [{ kaelen_met: true }, 1], [{ kaelen_met: true, rite_ready: true }, 2], [{ kaelen_met: true, rite_ready: true, greening: true }, 3]]) {
        for (const view of ['region', 'continent']) {
          await openMap(pg, st, view);
          const li = await legendInfo(pg);
          check(li && li.text === (await pg.evaluate((n) => SYNOD15.legendText(n), name)) && li.in && li.sx && li.sw && li.below, `legend at ${sz.width}x${sz.height}, stage ${name}, ${view}: shown, inside the panel, no horizontal overflow, above the map: ` + JSON.stringify(li));
          check(li && li.lines <= 2, `the legend line fits in at most two lines at ${sz.width}x${sz.height} (stage ${name}, ${view}): ${li && li.lines}`);
          if (sz.width === 640 || name === 0 || name === 3) await shot(pg, `map-${view}-s${name}-${sz.width}`);
          if (sz.width === 1280 && name === 2 && view === 'region') await shot(pg, 'map-region-s2-1280');
        }
      }
    }
    await pg.evaluate(() => { if (G.openPanel === 'travel') travelClose(); G.state = 'play'; });
    await pg.setViewportSize({ width: 1280, height: 800 });
    // information only: destinations, minutes, risks and blocking are the same with the wash on and off
    const info = await pg.evaluate(() => { const out = []; for (const on of [true, false]) { SYNOD15.cfg.wash = on; for (const fl of [{}, { kaelen_met: true, rite_ready: true }, { greening: true, part3: true }]) { for (const k of ['kaelen_met', 'rite_ready', 'greening', 'part3']) delete G.flags[k]; Object.assign(G.flags, fl); loadMap('oakhaven'); G.state = 'play'; TRAVEL.view = 'region'; TRAVEL.region = travelRegionOfChapter(travelChapter()); travelImg(TRAVEL_REGIONS[TRAVEL.region].img); const d = travelDestinations(TRAVEL.region); out.push(JSON.stringify([on, travelBlocked(), d.map(x => [x.name, x.state, x.map])]).slice(1)); } } SYNOD15.cfg.wash = true; const a = out.slice(0, 3).map(s => s.replace(/^[^,]*,/, '')), b = out.slice(3).map(s => s.replace(/^[^,]*,/, '')); return JSON.stringify(a) === JSON.stringify(b); });
    check(info, 'the wash is information only: travel destinations and blocking are identical with the wash on and off');
    const swap = await pg.evaluate(() => { G.state = 'play'; for (const k of ['kaelen_met', 'rite_ready', 'rite_started', 'greening', 'part3', 'part4', 'escaped']) delete G.flags[k]; G.flags.kaelen_met = true; travelOpen(); const R = TRAVEL_REGIONS[TRAVEL.region].img, real = TRAVEL.img[R]; travelDraw(); const same = TRAVEL.img[R] === real && real instanceof Image; const on = !!document.getElementById('p15s-legend'); closeModal(); G.state = 'play'; SYNOD15.cfg.wash = false; travelOpen(); const off = !document.getElementById('p15s-legend'); const cv = document.getElementById('tvmap'); const px0 = cv.getContext('2d').getImageData(cv.width * 0.8, cv.height * 0.2, 1, 1).data.join(); const R2 = TRAVEL.img[R]; const same2 = R2 === real; closeModal(); G.state = 'play'; SYNOD15.cfg.wash = true; return { same, on, off, same2 }; });
    check(swap.same && swap.on && swap.off && swap.same2, 'the real painting is always put back after a draw; the legend is gone with the switch off: ' + JSON.stringify(swap));
    // the picture changes with the stage and not with the switch (pixels)
    const pix = await pg.evaluate(async () => { const out = {}; const grab = (st, on) => new Promise(res => { SYNOD15.cfg.wash = on; for (const k of ['kaelen_met', 'rite_ready', 'rite_started', 'greening', 'part3', 'part4', 'escaped']) delete G.flags[k]; Object.assign(G.flags, st); G.state = 'play'; if (G.openPanel) closeModal(); travelOpen(); setTimeout(() => { const cv = document.getElementById('tvmap'); const x = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < x.length; i += 16) s += x[i] + x[i + 1] + x[i + 2]; (out.ms = out.ms || []).push(JSON.stringify(SYNOD15.mapState())); closeModal(); G.state = 'play'; res(s); }, 3300); });
      out.off = await grab({ kaelen_met: true, rite_ready: true }, false); out.s0 = await grab({}, true); out.s2 = await grab({ kaelen_met: true, rite_ready: true }, true); SYNOD15.cfg.wash = true; return out; });
    check(pix.s0 !== pix.off && pix.s2 !== pix.s0 && pix.s2 !== pix.off, 'the painted map differs by stage and from the unwashed map (pixel sums ' + [pix.off, pix.s0, pix.s2].join('/') + ' ' + pix.ms.join(' ') + ')');

    // ---------------------------------------------------------------- eclipses: the schedule
    const ecl = await pg.evaluate(() => { const S = SYNOD15, o = {}; o.days = []; for (let d = 0; d < 720; d++) if (S.eclipseDay(d)) o.days.push(d);
      o.again = []; for (let d = 0; d < 720; d++) if (S.eclipseDay(d)) o.again.push(d);
      o.notNew = o.days.filter(d => d % 8 !== 5).length; o.excluded = [0, 2, 3, 4, 6, 10].filter(d => S.eclipseDay(d)); o.feast = o.days.filter(d => S.isFeast(d));
      o.year = o.days.filter(d => d < 360).length; o.window = S.eclipseWindow(5);
      o.bad = [-1, NaN, Infinity, 1e9, '5', null, undefined, 5.5].map(d => S.eclipseDay(d)); o.hash = [5, 37, 45].map(d => S.eclipseDay(d));
      // every Dawnday the Empyrean Feast would fall on is not an eclipse
      o.feastDawn = []; for (let d = 0; d < 360; d++) if (d % 8 === 5 && S.isFeast(d)) o.feastDawn.push([d, S.eclipseDay(d)]);
      o.rate = o.days.filter(d => d < 3600).length; return o; });
    check(JSON.stringify(ecl.days) === JSON.stringify(ecl.again) && ecl.days.length > 30, 'the eclipse days are the same on every run (deterministic by day)');
    check(ecl.notNew === 0 && ecl.excluded.length === 0 && ecl.feast.length === 0 && ecl.feastDawn.every(([d, e]) => e === false), 'eclipses fall only on a new-moon Dawnday, never on a festival or story day (0 2 3 4 6 10), never on a feast: ' + JSON.stringify([ecl.excluded, ecl.feast, ecl.feastDawn]));
    check(ecl.year === 18, 'a canonical year of 360 days has 18 eclipses, about one day in twenty: ' + ecl.year);
    check(ecl.bad.every(x => x === false), 'a hostile day number is never an eclipse: ' + ecl.bad);
    check(ecl.window.t1 - ecl.window.t0 > 0.0416 && ecl.window.t1 - ecl.window.t0 < 0.0418 && Math.abs(ecl.window.centre - 0.5) <= 0.021, 'the window is 90 s of the game clock (1/24 of a game hour-minute) around midday: ' + JSON.stringify(ecl.window));
    const lv = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5), pts = [-0.001, 0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, 1.001].map(u => +S.eclipseLevel(5, w.t0 + (w.t1 - w.t0) * u).toFixed(3)); return { pts, other: S.eclipseLevel(6, 0.5), day13: S.eclipseLevel(13, 0.5) }; });
    check(lv.pts[0] === 0 && lv.pts[1] === 0 && lv.pts[2] > 0 && lv.pts[2] < 1 && lv.pts[4] === 1 && lv.pts[6] < 1 && lv.pts[7] === 0 && lv.pts[8] === 0 && lv.other === 0, 'the level ramps in over the first fifth, holds, ramps out, and is zero on other days: ' + lv.pts);
    const blocked = await pg.evaluate(() => { const S = SYNOD15, o = []; const set = (f, extra) => { for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, f); G.escapeTimer = 0; G.boreHold = 0; Object.assign(G, extra || {}); G.day = 5; G.tod = S.eclipseWindow(5).centre; return S.eclipseActive(); };
      o.push(set({})); o.push(set({ rite_started: true })); o.push(set({ rite_started: true, greening: true })); o.push(set({}, { escapeTimer: 30 })); o.push(set({}, { boreHold: 10 })); o.push(set({ rite_ready: true })); const on = set({}); S.cfg.eclipse = false; const off = S.eclipseActive(); S.cfg.eclipse = true; o.push(off); G.escapeTimer = 0; G.boreHold = 0; return o; });
    check(JSON.stringify(blocked) === '[true,false,true,false,false,true,false]', 'the eclipse is blocked during the Rite, the escape timer and the bore hold, and by the switch (not by story state otherwise): ' + blocked);

    // ---------------------------------------------------------------- eclipses: the spawn multiplier is exact
    const mult = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); for (const k of Object.keys(G.flags)) delete G.flags[k]; G.escapeTimer = 0; G.boreHold = 0; const m = (d, t) => { G.day = d; G.tod = t; return S.spawnMult(); };
      const o = { in: m(5, w.centre), edgeIn: m(5, w.t0 + 1e-4), edgeOut: m(5, w.t0 - 1e-4), after: m(5, w.t1 + 1e-4), other: m(6, w.centre), night: m(5, 0.9) }; S.cfg.eclipse = false; o.off = m(5, w.centre); S.cfg.eclipse = true; o.same = [S.spawnRoll(), S.spawnRoll()].map(x => typeof x === 'number'); return o; });
    check(mult.in === 1.25 && mult.edgeIn === 1.25 && mult.edgeOut === 1 && mult.after === 1 && mult.other === 1 && mult.night === 1 && mult.off === 1, 'the hound multiplier is exactly x1.25 inside the 90 s window, 1 outside and 1 with the switch off: ' + JSON.stringify(mult));
    const rolls = await pg.evaluate(() => { const S = SYNOD15; G.day = 5; S.state.spawnN = 0; const a = Array.from({ length: 10 }, () => S.spawnRoll()); S.state.spawnN = 0; const b = Array.from({ length: 10 }, () => S.spawnRoll()); G.day = 37; S.state.spawnN = 0; const c = Array.from({ length: 10 }, () => S.spawnRoll()); return { same: JSON.stringify(a) === JSON.stringify(b), diff: JSON.stringify(a) !== JSON.stringify(c), spread: a.every(x => x >= 0 && x < 1) && new Set(a).size === 10 }; });
    check(rolls.same && rolls.diff && rolls.spread, 'the extra-hound roll is our own seeded stream: the same for a day and a count, different between days');
    const hounds = await pg.evaluate(async () => { const S = SYNOD15, w = S.eclipseWindow(5), out = {}; for (const k of Object.keys(G.flags)) delete G.flags[k]; G.escapeTimer = 0; G.boreHold = 0; G.state = 'play'; loadMap('oakhaven');
      const run = (day, tod, on, n) => { G.day = day; G.tod = tod; S.cfg.eclipse = on; const b = S.stats.extraHounds; S.state.spawnN = 0; for (let i = 0; i < n; i++) { for (let j = G.ents.length - 1; j >= 0; j--) if (G.ents[j].type === 'hound') G.ents.splice(j, 1); spawnHound(); } return S.stats.extraHounds - b; };
      out.inN = run(5, w.centre, true, 400); out.outN = run(6, 0.5, true, 400); out.offN = run(5, w.centre, false, 400); S.cfg.eclipse = true; for (let j = G.ents.length - 1; j >= 0; j--) if (G.ents[j].type === 'hound') G.ents.splice(j, 1); return out; });
    check(hounds.inN > 70 && hounds.inN < 130 && hounds.outN === 0 && hounds.offN === 0, 'through spawnHound: about a quarter of spawns bring a second hound in the window (' + hounds.inN + ' of 400), none outside it or with the switch off');

    // ---------------------------------------------------------------- eclipses: the sky, the birds, the talk, the logbook
    const sky = await pg.evaluate(() => { window.__wx = []; Engine.addSkyHook((F) => { window.__wx.push([F.wx.dark, F.outdoor ? 1 : 0]); }, 99); return true; });
    const ecDay = async (day, tod, flags) => pg.evaluate(([day, tod, flags]) => { for (const k of Object.keys(G.flags)) delete G.flags[k]; Object.assign(G.flags, flags || {}); G.escapeTimer = 0; G.boreHold = 0; G.day = day; G.tod = tod; G.state = 'play'; if (G.openPanel) closeModal(); loadMap('oakhaven'); G.state = 'play'; Engine.cam.x = 20; Engine.cam.y = 20; Engine.cam.dir = Math.PI / 2; SYNOD15.state.k = 0; SYNOD15.state.said = {}; window.__wx = []; }, [day, tod, flags]);
    const lastDark = () => pg.evaluate(() => { const a = window.__wx.filter(x => x[1]); return a.length ? a[a.length - 1][0] : null; });
    await ecDay(5, 0.3);
    await pg.waitForTimeout(250);
    const d0 = await lastDark();
    await pg.evaluate(() => { G.tod = SYNOD15.eclipseWindow(5).centre; G.day = 5; });
    const tk = await pg.evaluate(() => { const S = SYNOD15, o = {}; S.state.k = 0; o.k0 = S.state.k; for (let i = 0; i < 20; i++) S.tickEclipse(0.1); o.k2 = +S.state.k.toFixed(3); for (let i = 0; i < 40; i++) S.tickEclipse(0.1); o.k6 = +S.state.k.toFixed(3); for (let i = 0; i < 20; i++) S.tickEclipse(0.1); o.k8 = S.state.k; return o; });
    check(tk.k0 === 0 && Math.abs(tk.k2 - 0.333) < 0.01 && tk.k6 === 1 && tk.k8 === 1, 'the dimming is slow: a sixth a second, full after six seconds, not a flash: ' + JSON.stringify(tk));
    await pg.waitForTimeout(400);
    const dMid = await lastDark();
    check(d0 !== null && dMid !== null && dMid - d0 > 0.5 && dMid - d0 <= 0.6, 'at the middle of the eclipse the engine weather light is darker by the eclipse amount (+' + (dMid - d0).toFixed(3) + ' on ' + d0 + ')');
    await shot(pg, 'eclipse-mid');
    const lumi = () => pg.evaluate(() => { const c = document.getElementById('view'), x = c.getContext('2d', { willReadFrequently: true }), w = c.width, h = c.height, d = x.getImageData(0, 0, w, Math.floor(h * 0.3)).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 40) { s += d[i] + d[i + 1] + d[i + 2]; n++; } return s / n; });
    const covered = await pg.evaluate(() => SYNOD15.skyStats);
    check(covered.covered > 20 && covered.ring > 20, 'facing the sun at totality the moon covers the disc and the corona shows: ' + JSON.stringify(covered));
    // the same moment with the switch off: no dim, no disc
    await pg.evaluate(() => { SYNOD15.cfg.eclipse = false; });
    await pg.waitForTimeout(500);
    const dOff = await lastDark();
    const cov0 = await pg.evaluate(() => SYNOD15.skyStats);
    check(dOff !== null && Math.abs(dOff - d0) < 0.001 && cov0.covered === 0, 'switch off at the same hour: the weather light is the same as before the eclipse, no disc (' + dOff + ' vs ' + d0 + ')');
    await pg.evaluate(() => { SYNOD15.cfg.eclipse = true; SYNOD15.state.k = 1; });
    // No flashes / Reduce motion: softer dim, half the speed
    const soft = await pg.evaluate(() => { const S = SYNOD15, o = {}; for (const [nm, set] of [['noFlash', () => { GFX.noFlash = true; GFX.reduceMotion = false; }], ['reduce', () => { GFX.noFlash = false; GFX.reduceMotion = true; }]]) { set(); S.state.k = 0; G.day = 5; G.tod = S.eclipseWindow(5).centre; for (let i = 0; i < 60; i++) S.tickEclipse(0.1); o[nm] = [+S.state.k.toFixed(3), S.B.ECL_DIM_SOFT]; } GFX.noFlash = false; GFX.reduceMotion = false; S.state.k = 0; return o; });
    check(soft.noFlash[0] === 0.5 && soft.reduce[0] === 0.5 && soft.noFlash[1] === 0.4, 'No flashes and Reduce motion: the fade takes twice as long (0.5 after six seconds) and the dim is the softer 0.4: ' + JSON.stringify(soft));
    await pg.evaluate(() => { GFX.noFlash = true; SYNOD15.state.k = 1; G.day = 5; G.tod = SYNOD15.eclipseWindow(5).centre; window.__wx = []; });
    await pg.waitForTimeout(400);
    const dSoft = await lastDark();
    check(dSoft !== null && Math.abs((dSoft - d0) - 0.4) < 0.02, 'under No flashes the weather light darkens by exactly the soft 0.4 at totality (' + (dSoft - d0).toFixed(3) + ')');
    await pg.evaluate(() => { GFX.noFlash = false; SYNOD15.state.k = 0; });
    // birds
    const birds = await pg.evaluate(() => { const S = SYNOD15; let called = 0; const o = Audio_.sfx.bird; const raw = o.__p15s ? o : null; S.state.k = 1; const h0 = S.stats.hushed; try { Audio_.sfx.bird(); } catch (e) { return String(e); } const h1 = S.stats.hushed; S.state.k = 0; try { Audio_.sfx.bird(); } catch (e) { /* the audio context may be closed in the test browser */ } const h2 = S.stats.hushed; S.cfg.eclipse = false; S.state.k = 1; Audio_.sfx.bird(); const h3 = S.stats.hushed; S.cfg.eclipse = true; S.state.k = 0; return { wrapped: !!Audio_.sfx.bird.__p15s, quiet: h1 - h0, free: h2 - h1, off: h3 - h2 }; });
    check(birds.wrapped && birds.quiet === 1 && birds.free === 0 && birds.off === 0, 'the birds go quiet at totality (the call is swallowed), and call as normal otherwise and with the switch off: ' + JSON.stringify(birds));
    const crows = await pg.evaluate(() => { const S = SYNOD15, c = { kind: 'deco', x: 3, y: 3, _sl: { kind: 'crow', st: 'peck', t: 0 } }; G.ents.push(c); S.state.k = 1; S.holdCrows(); const a = [c._sl.st, c._sl.t >= 0.5]; c._sl.st = 'fly'; S.holdCrows(); const b = c._sl.st; S.state.k = 0; c._sl.st = 'peck'; S.holdCrows(); const d = c._sl.st; G.ents.splice(G.ents.indexOf(c), 1); return [a, b, d]; });
    check(JSON.stringify(crows) === '[["look",true],"fly","peck"]', 'smalllife crows stand and look up at totality (a flying crow is left alone), and are free again after: ' + JSON.stringify(crows));
    // townsfolk and the logbook
    await ecDay(5, 0.3);
    const folk = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); G.tod = w.centre; const e = G.ents.find(x => x.kind === 'npc' && (x.id === 'townsman' || x.id === 'townswoman')); if (!e) return { none: true }; const ln = S.folkLine(e); const inList = S.TX.ecl.folk.includes(ln); G.tod = 0.3; const out = S.folkLine(e); return { inList, out: S.TX.ecl.folk.includes(out) }; });
    check(folk.none || (folk.inList && !folk.out), 'during the eclipse a townsperson has an eclipse line, and not outside it');
    const talkE = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); G.tod = w.centre; const e = G.ents.find(x => x.kind === 'npc' && (x.id === 'townsman' || x.id === 'townswoman')); if (!e) return null; talk(e); const last = DLG.log[DLG.log.length - 1].t; const ok = S.TX.ecl.folk.includes(last); closeModal(); G.state = 'play'; return ok; });
    check(talkE === null || talkE === true, 'talking to a townsperson during the eclipse really shows the eclipse line');
    const alm = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); const read = (day, tod) => { G.day = day; G.tod = tod; G.state = 'play'; if (G.openPanel) closeModal(); renderLog(); const t = (document.getElementById('p15s-almanac') || {}).textContent || ''; closeModal(); G.state = 'play'; return t; };
      for (const k of Object.keys(G.flags)) delete G.flags[k]; const before = read(5, 0.3), after = read(5, 0.7), other = read(6, 0.3); S.cfg.eclipse = false; const off = read(5, 0.3); S.cfg.eclipse = true; return { before: before.includes(S.TX.ecl.almBefore), after: after.includes(S.TX.ecl.almAfter) && !after.includes(S.TX.ecl.almBefore), other: !other.includes('dark noon') && !other.includes('crossed the sun'), off: !off.includes('dark noon'), has: before.includes(S.TX.alm.sched) }; });
    check(alm.before && alm.after && alm.other && alm.off && alm.has, 'the logbook almanac names the dark noon before it, records it after, says nothing on other days or with the switch off: ' + JSON.stringify(alm));
    const jl = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = 5; G.tod = w.centre; G.state = 'play'; loadMap('oakhaven'); G.state = 'play'; S.state.said = {}; S.state.k = 1; const j0 = G.journal.length; S.tickEclipse(0.1); S.tickEclipse(0.1); const a = G.journal.length - j0; return { a, f: G.flags.p15s_ecl, line: G.journal[0].text === S.TX.ecl.journal }; });
    check(jl.a === 1 && jl.f === 1 && jl.line, 'the first totality writes one logbook line, once: ' + JSON.stringify(jl));
    // indoors and elsewhere: no entry line, no lines through the walls
    const inside = await pg.evaluate(() => { const S = SYNOD15, w = S.eclipseWindow(5); G.day = 5; G.tod = w.centre; G.state = 'play'; loadMap('chapel'); G.state = 'play'; S.state.said = {}; S.state.k = 1; let said = 0; const m0 = window.msg; window.msg = function () { said++; return m0.apply(this, arguments); }; S.tickEclipse(0.1); window.msg = m0; return said; });
    check(inside === 0, 'indoors there is no sky line');

    // ---------------------------------------------------------------- options rows
    const opt = await pg.evaluate(() => { openModal('<div class="ctl-grid"></div>', 'access'); const real = typeof renderAccessibilityMenu === 'function'; closeModal(); return real; });
    await pg.evaluate(() => { G.state = 'play'; });
    const rows = await pg.evaluate(() => { try { G.state = 'play'; renderAccessibilityMenu(); } catch (e) { return String(e); } const ids = ['s15-sermons-opt', 's15-map-opt', 's15-eclipse-opt'].map(i => { const b = document.getElementById(i); return b && [b.textContent, b.getAttribute('aria-pressed')]; }); const b = document.getElementById('s15-map-opt'); b.click(); const after = [b.textContent, b.getAttribute('aria-pressed'), SYNOD15.cfg.wash, localStorage.getItem('octave.synod15.v1')]; b.click(); closeModal(); G.state = 'play'; return { ids, after, back: SYNOD15.cfg.wash }; });
    check(opt && rows && rows.ids && rows.ids.every(x => x && x[0] === 'On' && x[1] === 'true') && rows.after[0] === 'Off' && rows.after[1] === 'false' && rows.after[2] === false && /"wash":false/.test(rows.after[3]) && rows.back === true, 'the three Options rows exist, are On, toggle with aria-pressed and persist: ' + JSON.stringify(rows));

    // ---------------------------------------------------------------- saves: round trip and a hostile save
    await inChapel(pg, 4, 0.75, { kaelen_met: true });
    await pg.evaluate(() => { const S = SYNOD15; S.openSermon(); S.finishSermon(); S.closeSermon(); G.flags.p15s_ecl = 1; });
    const rt = await pg.evaluate(() => { const snap = JSON.parse(JSON.stringify(snapshotGame())); const ents = Object.values(snap.maps || {}).some(m => (m.entities || []).some(e => e._p15s || e.id === 'p15s_preacher')); restoreGame(snap); return { att: G.flags.p15s_att, last: G.flags.p15s_last, lk: G.flags.p15s_lk, ecl: G.flags.p15s_ecl, ents, st: SYNOD15.status() }; });
    check(rt.att === 1 && rt.lk === 1 && rt.ecl === 1 && rt.last === 14 && !rt.ents && rt.st.attended, 'a save round-trips the p15s_ flags and stores no transient person or place: ' + JSON.stringify(rt));
    const old = await pg.evaluate(() => { const snap = JSON.parse(JSON.stringify(snapshotGame())); for (const k of Object.keys(snap.flags)) if (k.startsWith('p15s_')) delete snap.flags[k]; restoreGame(snap); return { n: Object.keys(G.flags).filter(k => k.startsWith('p15s_')).length, st: SYNOD15.status() }; });
    check(old.n === 0 && old.st.attended === false, 'a save from before this phase loads with no p15s_ flags and no state');
    const hostile = await pg.evaluate(() => { const o = {}; const snap = JSON.parse(JSON.stringify(snapshotGame()));
      Object.assign(snap.flags, { p15s_att: 'many', p15s_dis: -4, p15s_last: 1e12, p15s_lk: 9, p15s_ecl: 1.5, p15s_end: true, p15s_evil: 7, p15s_x: { a: 1 }, p15s_arr: [1, 2] });
      restoreGame(snap); const f = G.flags; o.keys = Object.keys(f).filter(k => k.startsWith('p15s_')).sort(); o.att = SYNOD15.fint('p15s_att'); o.dis = SYNOD15.fint('p15s_dis'); o.last = SYNOD15.fint('p15s_last'); o.lk = SYNOD15.fint('p15s_lk'); o.ecl = SYNOD15.fint('p15s_ecl'); o.end = SYNOD15.fint('p15s_end'); o.evil = f.p15s_evil;
      o.proto = (() => { const s2 = JSON.parse(JSON.stringify(snapshotGame())); s2.flags = JSON.parse('{"__proto__":{"p15s_att":9},"p15s_att":2}'); restoreGame(s2); return [SYNOD15.fint('p15s_att'), ({}).p15s_att]; })();
      o.st = SYNOD15.status(); o.neg = (() => { G.flags.p15s_att = -1; G.flags.p15s_last = NaN; const x = [SYNOD15.fint('p15s_att'), SYNOD15.fint('p15s_last')]; SYNOD15.sanitizeFlags(); return [x, G.flags.p15s_att, G.flags.p15s_last]; })();
      return o; });
    check(hostile.keys.every(k => ['p15s_end'].includes(k)) && hostile.att === 0 && hostile.dis === 0 && hostile.last === 0 && hostile.lk === 0 && hostile.ecl === 0 && hostile.end === 1 && hostile.evil === undefined, 'a hostile save: bad values dropped, unknown p15s_ keys deleted, a true flag clamped to 1: ' + JSON.stringify(hostile));
    check(hostile.proto[0] === 2 && hostile.proto[1] === undefined, 'a __proto__ in the save flags cannot reach the schedule');
    check(JSON.stringify(hostile.neg[0]) === '[0,0]' && hostile.neg[1] === undefined && hostile.neg[2] === undefined, 'a live flag set to junk reads as 0 and is dropped by the next sanitize: ' + JSON.stringify(hostile.neg));
    const hostileRun = await pg.evaluate(() => { G.flags.p15s_att = 'x'; G.flags.p15s_last = [1]; G.flags.p15s_lk = 99; G.day = 4; G.tod = 0.75; loadMap('chapel'); G.state = 'play'; Engine.cam.x = 5.4; Engine.cam.y = 9.3; SYNOD15.syncChapel(); const st = SYNOD15.status(); SYNOD15.openSermon(); const open = SYNOD15.ui.open; SYNOD15.finishSermon(); SYNOD15.closeSermon(); return { st, open, att: G.flags.p15s_att }; });
    check(hostileRun.open && hostileRun.att === 1 && hostileRun.st.live && !hostileRun.st.attended, 'with junk in the flags a sermon still opens and counts cleanly: ' + JSON.stringify(hostileRun));
    // the Greening: sermons end, the closing line is written once, only for someone who met one
    const closing = await pg.evaluate(() => { const S = SYNOD15; for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.p15s_att = 2; G.flags.greening = true; G.day = 12; G.tod = 0.75; const j0 = G.journal.length; loadMap('oakhaven'); S.tick(1); S.tick(1); const a = G.journal.length - j0; const line = G.journal[0].text === S.TX.end.journal; const n = G.flags.p15s_end;
      for (const k of Object.keys(G.flags)) delete G.flags[k]; G.flags.greening = true; const j1 = G.journal.length; S.tick(1); S.tick(1); return { a, line, n, none: G.journal.length - j1, endNone: G.flags.p15s_end || 0 }; });
    check(closing.a === 1 && closing.line && closing.n === 1 && closing.none === 0 && closing.endNone === 0, 'at the Greening the sermons end, with one closing logbook line for someone who met one and none for someone who did not: ' + JSON.stringify(closing));

    // ---------------------------------------------------------------- the Gazette, townsfolk on sermon days
    const gz = async (on) => { await pg.evaluate((on) => { SYNOD15.cfg.sermons = on; for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = 4; G.tod = 0.5; G.state = 'play'; STORYRUM.readGazette(); }, on); const h = await pg.evaluate(() => (document.querySelector('#event') || document.body).innerHTML); await pg.keyboard.press('Escape'); await pg.waitForTimeout(100); await pg.evaluate(() => { SYNOD15.cfg.sermons = true; G.state = 'play'; }); return h; };
    const gOn = await gz(true), gOff = await gz(false);
    const gT = await pg.evaluate(() => SYNOD15.TX.gaz);
    const iI = gOn.indexOf('p15s-item'), iN = gOn.indexOf('rm-notice');
    check(iI > 0 && gOn.includes(gT) && (iN < 0 || iI < iN) && !gOff.includes('p15s-item'), 'the Gazette prints the Chapel notice (before its closing notice), and not with the switch off: ' + [iI, iN]);
    check(await pg.evaluate(() => G.state === 'play'), 'Escape puts the Gazette down');

    // ---------------------------------------------------------------- switch off: the world as before (against a game that never loaded the module)
    const OFF = await boot(browser, null, { blockModule: true }); allErrors.push(OFF.errors);
    const ON = await boot(browser); allErrors.push(ON.errors);
    await ON.page.evaluate(() => { SYNOD15.cfg.sermons = false; SYNOD15.cfg.wash = false; SYNOD15.cfg.eclipse = false; });
    check(await OFF.page.evaluate(() => typeof SYNOD15 === 'undefined'), 'the control game really runs without the module');
    for (const [day, tod, map] of [[4, 0.75, 'chapel'], [5, 0.3, 'chapel'], [4, 0.75, 'oakhaven'], [7, 0.8, 'tavern']]) {
      for (const P of [OFF.page, ON.page]) await P.evaluate(([day, tod, map]) => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = day; G.tod = tod; G.state = 'play'; loadMap(map); G.state = 'play'; if (window.SYNOD15) SYNOD15.syncChapel(); }, [day, tod, map]);
      await OFF.page.waitForTimeout(100);
      const sa = await sigEnts(OFF.page), sb = await sigEnts(ON.page); const A_ = JSON.parse(sa).map(x => JSON.stringify(x)), B_ = JSON.parse(sb).map(x => JSON.stringify(x));
      check(sa === sb, `switch off: ${map} on day ${day} has the same entities as a game without the module: only-without ${A_.filter(x => !B_.includes(x)).slice(0, 4).join(' ')} only-with ${B_.filter(x => !A_.includes(x)).slice(0, 4).join(' ')}`);
      const fa = await sigFlags(OFF.page), fb = await sigFlags(ON.page);
      check(fa === fb && (await ON.page.evaluate(() => Object.keys(G.flags).filter(k => k.startsWith('p15s_')).length)) === 0, `switch off: ${map} on day ${day} writes no p15s_ flag and changes no other: ${fa} vs ${fb}`);
    }
    // eclipse day, same page and same weather: the switch off leaves the sky as it is, on darkens it at totality
    await ON.page.evaluate(() => { G.day = 5; G.tod = SYNOD15.eclipseWindow(5).centre; G.state = 'play'; loadMap('oakhaven'); G.state = 'play'; G.flags = {}; Engine.cam.x = 20; Engine.cam.y = 20; Engine.cam.dir = Math.PI / 2; SYNOD15.cfg.eclipse = false; SYNOD15.state.k = 0; });
    await ON.page.waitForTimeout(800);
    await ON.page.evaluate(() => { window.__skyL = null; Engine.addSkyHook((F) => { if (!F.outdoor) return; let s = 0, n = 0; const { fb, mbuf, w, h, horizon } = F; for (let y = 0; y < horizon; y += 3) for (let x = 0; x < w; x += 3) { const o = y * w + x; if (mbuf[o] !== 1) continue; const p = fb[o]; s += (p & 255) + ((p >> 8) & 255) + ((p >> 16) & 255); n++; } window.__skyL = n ? s / n : null; window.__light = F.light; }, 100); });
    const lum = async (P) => P.evaluate(() => window.__skyL);
    await ON.page.waitForTimeout(500);
    const lOff = await lum(ON.page), liOff = await ON.page.evaluate(() => window.__light); await ON.page.waitForTimeout(300); const lOff2 = await lum(ON.page);
    check(lOff > 20 && Math.abs(lOff - lOff2) < Math.max(6, lOff * 0.04) && (await ON.page.evaluate(() => SYNOD15.state.k)) === 0, `switch off: the eclipse hour keeps its ordinary sky, nothing is dimmed (${lOff}, ${lOff2})`);
    await ON.page.evaluate(() => { SYNOD15.cfg.eclipse = true; G.tod = SYNOD15.eclipseWindow(5).centre; });
    await ON.page.waitForTimeout(8500);
    await ON.page.evaluate(() => { G.tod = SYNOD15.eclipseWindow(5).centre; });
    await ON.page.waitForTimeout(300);
    const lEc = await lum(ON.page), liEc = await ON.page.evaluate(() => window.__light);
    await shot(ON.page, 'eclipse-mid-oakhaven');
    check(lEc < lOff * 0.92 && liEc < liOff * 0.8, `switch on: the same noon is clearly darker at totality (sky ${Math.round(lEc)} vs ${Math.round(lOff)}, world light ${liEc.toFixed(2)} vs ${liOff.toFixed(2)})`);
    // the quest dialogue of an existing person is the same
    const nq = async (P) => P.evaluate(() => { for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = 5; G.tod = 0.5; loadMap('oakhaven'); const a = NPCS.harrow.quest(G); return JSON.stringify([a && a.text, Object.keys(G.flags).sort()]); });
    check((await nq(OFF.page)) === (await nq(ON.page)), 'switch off: Harrow says and sets exactly what he did before');
    await OFF.page.close();
    // frame time
    await ON.page.evaluate(() => { SYNOD15.cfg.sermons = true; SYNOD15.cfg.wash = true; SYNOD15.cfg.eclipse = true; });
    const perf = await ON.page.evaluate(() => { const S = SYNOD15; for (const k of Object.keys(G.flags)) delete G.flags[k]; G.day = 4; G.tod = 0.75; loadMap('chapel'); G.state = 'play'; S.syncChapel(); Engine.cam.x = 6; Engine.cam.y = 9; const t0 = performance.now(); for (let i = 0; i < 400; i++) S.tick(0.016); const a = (performance.now() - t0) / 400;
      G.day = 5; G.tod = S.eclipseWindow(5).centre; loadMap('oakhaven'); G.state = 'play'; const t1 = performance.now(); for (let i = 0; i < 400; i++) S.tick(0.016); const b = (performance.now() - t1) / 400; return { a: +a.toFixed(3), b: +b.toFixed(3) }; });
    check(perf.a < 1.0 && perf.b < 1.0, 'per-frame work stays under 1 ms in the sermon and the eclipse (' + JSON.stringify(perf) + ' ms)');
    allErrors.push(ON.errors);
  } catch (e) {
    fails.push('exception: ' + (e && e.stack || e)); console.log('EXCEPTION', e);
  } finally {
    await browser.close();
  }
  const flat = [].concat(...allErrors).filter(Boolean);
  check(flat.length === 0, 'no page errors (' + flat.slice(0, 4).join(' | ') + ')');
  console.log(fails.length ? '\nFAILED ' + fails.length : '\nOK synod15');
  process.exit(fails.length ? 1 : 0);
})();
