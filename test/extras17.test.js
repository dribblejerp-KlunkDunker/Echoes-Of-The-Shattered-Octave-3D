// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/extras17.test.js
// Phase 17 EXTRAS: the Extras menu, spoiler notice, unlocks, save isolation for extras, and the WINTER17 look.
// Uses the served preview; never starts a server. SHOTS=<dir> writes screenshots there (Medium and Cinematic).
// A tiny demo extra is registered by this test only (it is not shipped).
'use strict';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SHOTS = process.env.SHOTS || '';
const fs = require('fs'), path = require('path');

async function toGame(page, name) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(name || 'Extras Tester');
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
// the demo extra: test-only. Oakhaven in winter, a flag of its own.
const DEMO = () => {
  window.__demoStarts = 0;
  EXTRAS17.register({
    id: 'x17demo', title: 'A demo extra', blurb: 'Test only: Oakhaven under snow.',
    unlocked: () => true,
    start() {
      window.__demoStarts++;
      if (typeof Weather !== 'undefined') Weather.hold('clear');
      G.tod = 0.45; G.day = 3;
      loadMap('oakhaven');
      WINTER17.apply('oakhaven', { snow: 0.75, fall: 0.5, breath: true, grade: 0.5 });
      G.flags.p17x_demo = 1; G.state = 'play';
    },
  });
};
async function boot(browser, viewport, opts) {
  opts = opts || {};
  const page = await browser.newPage({ viewport: viewport || { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.blockModule) await page.route('**/js/extras17.js*', (r) => r.fulfill({ body: '/* blocked by the test */', contentType: 'application/javascript' }));
  await page.addInitScript(() => { let s = 17017; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  if (opts.clearLS !== false) await page.addInitScript(() => { try { if (!sessionStorage.getItem('x17kept')) { localStorage.removeItem('octave.extras17.v1'); sessionStorage.setItem('x17kept', '1'); } } catch (e) { /* ignore */ } });
  await page.goto(URL);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title');
  if (!opts.blockModule) await page.evaluate(DEMO);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const fails = [];
  const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } else console.log('ok: ' + m); };
  const allErrors = [];
  try {
    const A = await boot(browser); const pg = A.page; allErrors.push(A.errors);
    const ev = (fn, arg) => pg.evaluate(fn, arg);

    // ------------------------------------------------------------ contract, text, French
    const base = await ev(() => ({
      w: ['apply', 'clear', 'active'].every((k) => typeof WINTER17[k] === 'function'),
      x: ['register', 'list', 'inExtra', 'finish'].every((k) => typeof EXTRAS17[k] === 'function'),
      inExtra: EXTRAS17.inExtra(), n: EXTRAS17.list().length, ids: EXTRAS17.list().map((x) => x.id), btn: !!document.getElementById('btn-extras'),
      btnText: (document.getElementById('btn-extras') || {}).textContent, fx: GFX.FX.includes('winter17'), flag: GFX.winter17,
      texts: EXTRAS17.TEXTS, bad: [EXTRAS17.register(null), EXTRAS17.register({ id: 'Bad Id!', start() {} }), EXTRAS17.register({ id: 'nostart' }), EXTRAS17.register({ id: 'x17demo', title: 'dup', start() {} })],
    }));
    check(base.w && base.x, 'WINTER17.apply/clear/active and EXTRAS17.register/list/inExtra/finish exist');
    // the shipped extras (prologue, cantabile, longnight) register too; the demo is this test's own, registered once
    check(base.inExtra === null && base.ids.filter((i) => i === 'x17demo').length === 1 && new Set(base.ids).size === base.n, 'not in an extra at boot; the demo is registered once and every extra id is unique (' + base.ids.join(', ') + ')');
    check(base.btn && base.btnText === 'Extras', 'the title screen has an Extras button');
    check(base.fx && base.flag === true, 'GFX.winter17 is a GFX.FX flag, on in Medium');
    check(base.bad.every((b) => b === false), 'bad registrations (no id, bad id, no start, duplicate) are refused');
    check(base.texts.every((t) => typeof t === 'string' && t && !/[\u{1F300}-\u{1FAFF}]/u.test(t) && !/\bscream/i.test(t)), 'texts are non-empty, emoji-free, nobody screams');
    const tsv = fs.readFileSync(path.join(__dirname, '..', 'tools', 'i18n', 'p17-extras.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
    const pairs = new Map(tsv.map((r) => [r[0], r[1]]));
    const noFr = base.texts.filter((t) => !pairs.get(t) && !pairs.get(t.trim()));
    check(noFr.length === 0 && tsv.every((r) => r.length === 2 && r[1].trim()), 'every string has a French pair (' + noFr.length + ' missing: ' + noFr.slice(0, 3).join(' | ') + ')');
    check(!tsv.some((r) => /\b(Le Hush|les Hollows|the Hedge)\b/.test(r[1])), 'the French follows the glossary');

    // ------------------------------------------------------------ the spoiler notice and the locked menu
    await pg.locator('#btn-extras').click();
    const sp = await ev(() => ({ panel: G.openPanel, state: G.state, title: !document.getElementById('title').classList.contains('hidden'), text: document.getElementById('modal-panel').textContent }));
    check(sp.panel === 'x17spoil' && sp.state === 'title' && sp.title, 'first visit: the spoiler notice opens over the title');
    check(/These extras take place after Book One and spoil its ending\./.test(sp.text), 'the notice says the extras take place after Book One and spoil its ending');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/x17-spoiler.png' });
    await pg.keyboard.press('Escape');
    const esc = await ev(() => ({ open: !document.getElementById('modal').classList.contains('hidden'), state: G.state, title: !document.getElementById('title').classList.contains('hidden'), ack: EXTRAS17.state.ack }));
    check(!esc.open && esc.state === 'title' && esc.title && esc.ack === 0, 'Escape closes the notice back to the title, without accepting it');
    await pg.locator('#btn-extras').click(); await pg.locator('#x17-spoil-yes').click();
    const menu = await ev(() => ({ panel: G.openPanel, ack: EXTRAS17.state.ack, ls: localStorage.getItem('octave.extras17.v1'), locked: !!document.getElementById('x17-locked'), card: !!document.querySelector('[data-extra="x17demo"]'), play: !!document.getElementById('x17-play-x17demo'), lockedCard: /Locked: finish Book One/.test((document.querySelector('[data-extra="x17demo"]') || {}).textContent || ''), tag: /An extra — after Book One/.test((document.querySelector('[data-extra="x17demo"]') || {}).textContent || '') }));
    check(menu.panel === 'x17menu' && menu.ack === 1 && /"ack":1/.test(menu.ls || ''), 'accepting opens the Extras menu and is remembered');
    check(menu.locked && menu.card && !menu.play && menu.lockedCard && menu.tag, 'before Book One is finished the demo card is locked and labelled "An extra — after Book One"');
    // author's ruling (FIX17): no early unlock of any kind
    const noEarly = await ev(() => ({ btn: !!document.getElementById('x17-early') || Array.from(document.querySelectorAll('#modal-panel button')).some((b) => /anyway|early/i.test(b.textContent)), txt: /anyway|either ending/i.test(document.getElementById('modal-panel').textContent), tx: EXTRAS17.TEXTS.some((t) => /anyway|either ending|Opened early/i.test(t)) }));
    check(!noEarly.btn && !noEarly.txt && !noEarly.tx, 'there is no "open them anyway" control or text: the extras open only at the end of Book One');
    check(await ev(() => EXTRAS17.start('x17demo') === false && EXTRAS17.inExtra() === null), 'a locked extra cannot be started');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/x17-menu-locked.png' });
    await pg.locator('#x17-back').click();
    await pg.locator('#btn-extras').click();
    check(await ev(() => G.openPanel === 'x17menu'), 'second visit goes straight to the menu (one-time notice)');
    await pg.keyboard.press('Escape');

    // ------------------------------------------------------------ unlock: only the end of Book One ("Not yet")
    await toGame(pg, 'Ending One');
    const e1 = await ev(() => { ending(); return { done: EXTRAS17.state.done, escaped: G.flags.escaped, note: !!document.getElementById('x17-unlock-note'), state: G.state, opened: EXTRAS17.opened(), play: EXTRAS17.start('x17demo') }; });
    check(e1.done === 0 && e1.escaped === true && !e1.note && e1.state === 'ending' && !e1.opened && e1.play === false, '"Grab the Line" (flag escaped, the end of Part Two) does not unlock the extras (author\'s ruling)');
    const e2 = await ev(() => {
      EXTRAS17.state.done = 0; G.state = 'play'; let err = null;
      try { bookOneEnd1(); } catch (e) { err = String(e); }
      return { done: EXTRAS17.state.done, flag: G.flags.book_one_done, note: (document.getElementById('x17-unlock-note') || {}).textContent || '', err };
    });
    check(e2.done === 1 && e2.flag === true && /The extras are open/.test(e2.note), 'finishing Book One by "Not yet" (bookOneEnd1) unlocks the extras and says so on the ending ' + (e2.err || ''));
    // a stored record from before the ruling (escape or "open anyway") unlocks nothing; a v:2 record does
    const e2b = await ev(() => {
      const KEY = 'octave.extras17.v1', keep = localStorage.getItem(KEY), out = {};
      const load = (o) => { localStorage.setItem(KEY, JSON.stringify(o)); EXTRAS17._load(); return EXTRAS17.state.done; };
      out.early = load({ ack: 1, done: 0, early: 1, w: 1, res: {} });
      out.oldDone = load({ ack: 1, done: 1, w: 1, res: {} });
      out.v2 = load({ v: 2, ack: 1, done: 1, w: 1, res: {} });
      localStorage.setItem(KEY, keep); EXTRAS17._load();
      return out;
    });
    check(e2b.early === 0 && e2b.oldDone === 0 && e2b.v2 === 1, 'a stored "early" flag or a pre-ruling record no longer unlocks; a v:2 record does');
    // old saves: loading a finished save unlocks; the menu can check a code without loading it
    const e3 = await ev(async () => {
      const out = {};
      EXTRAS17.state.done = 0; const d = snapshotGame(); const fin = JSON.parse(JSON.stringify(d)); fin.flags.escaped = true; fin.flags.book_one_done = true;
      const unfin = JSON.parse(JSON.stringify(d)); delete unfin.flags.escaped; delete unfin.flags.book_one_done;
      const esc = JSON.parse(JSON.stringify(d)); esc.flags.escaped = true; delete esc.flags.book_one_done;
      out.codeFin = await encodeSave(fin); out.codeUn = await encodeSave(unfin); out.codeEsc = await encodeSave(esc);
      out.chkFin = await EXTRAS17.checkCode(out.codeFin); out.chkUn = await EXTRAS17.checkCode(out.codeUn); out.chkEsc = await EXTRAS17.checkCode(out.codeEsc); out.chkBad = await EXTRAS17.checkCode('OCTZ1.notasave'); out.chkHtml = await EXTRAS17.checkCode('<img src=x onerror=alert(1)>');
      out.stillLocked = EXTRAS17.state.done;
      restoreGame(JSON.parse(JSON.stringify(fin))); out.afterLoad = EXTRAS17.state.done;
      EXTRAS17.state.done = 0; restoreGame(JSON.parse(JSON.stringify(unfin))); out.afterUnfin = EXTRAS17.state.done;
      restoreGame(JSON.parse(JSON.stringify(esc))); out.afterEsc = EXTRAS17.state.done;
      return out;
    });
    check(e3.chkFin === 'yes' && e3.chkUn === 'no' && e3.chkBad === 'bad' && e3.chkHtml === 'bad' && e3.stillLocked === 0, 'checkCode reads a finished save as yes, an unfinished one as no, junk as bad, and only reads');
    check(e3.afterLoad === 1 && e3.afterUnfin === 0, 'loading a save that already finished Book One unlocks; an unfinished one does not');
    check(e3.chkEsc === 'no' && e3.afterEsc === 0, 'a save that only escaped (Grab the Line) neither checks as finished nor unlocks when loaded');
    // the menu's checker, by the UI
    await ev(() => { closeModal(); G.state = 'title'; document.getElementById('title').classList.remove('hidden'); });
    await pg.locator('#btn-extras').click();
    await pg.locator('#x17-code').fill(e3.codeUn); await pg.locator('#x17-check').click(); await pg.waitForTimeout(150);
    const ui1 = await ev(() => ({ out: (document.getElementById('x17-check-out') || {}).textContent, done: EXTRAS17.state.done }));
    check(/has not reached the end of Book One/.test(ui1.out || '') && ui1.done === 0, 'the menu checker says an unfinished save has not reached the end of Book One');
    await pg.locator('#x17-code').fill(e3.codeFin); await pg.locator('#x17-check').click(); await pg.waitForTimeout(150);
    const ui2 = await ev(() => ({ done: EXTRAS17.state.done, play: !!document.getElementById('x17-play-x17demo'), txt: document.getElementById('modal-panel').textContent, map: G.mapId }));
    check(ui2.done === 1 && ui2.play && /finished Book One/.test(ui2.txt), 'the menu checker unlocks from a finished save code; the demo is now playable');
    if (SHOTS) await pg.screenshot({ path: SHOTS + '/x17-menu-open.png' });
    await pg.keyboard.press('Escape');

    // ------------------------------------------------------------ isolation: the Book One save is byte-identical
    await pg.reload(); await pg.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title'); await ev(DEMO);
    check(await ev(() => EXTRAS17.state.done === 1 && EXTRAS17.state.ack === 1), 'the unlock and the notice survive a reload');
    await toGame(pg, 'Book One Keeper');
    const book = await ev(async () => {
      G.flags.test_mark = 7; G.flags.lamps_lit = true; G.player.gold = 99; G.day = 4; G.give('honey', 2);
      renderSave(); await new Promise((r) => setTimeout(r, 50));
      document.querySelector('[data-slot="0"]').click();
      UPG.autosaveSlot = snapshotGame(); UPG.autosaveWhen = 'Oakhaven (day 4)';
      const code = await saveCode();
      window.__bookCode = code;
      window.__book = { player: G.player, flags: G.flags, maps: G.maps, map: G.map, journal: G.journal, slot0: SLOTS[0], auto: UPG.autosaveSlot };
      closeModal(); G.state = 'play';
      return { slot: JSON.stringify(SLOTS[0]), auto: JSON.stringify(UPG.autosaveSlot), when: UPG.autosaveWhen, code, flags: JSON.stringify(G.flags), map: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir], slots: SLOTS.map((s) => !!s) };
    });
    check(book.slots[0] && !book.slots[1], 'a Book One game saved to session slot 1, with a boss autosave and a code');
    await ev(() => { renderMenu(); }); await pg.locator('#mn-title').click();
    await pg.locator('#btn-extras').click();
    // game.js's session slots keep a live reference to G.flags (pre-existing: snapshotGame does not copy flags), so
    // Book One play after saving changes the slot (playtools writes its clocks there late). Compare from the moment
    // the extra is entered, after letting playtools write what it was holding (snapshotGame flushes it).
    Object.assign(book, await ev(() => ({ flush: snapshotGame() && 1, slot: JSON.stringify(SLOTS[0]), auto: JSON.stringify(UPG.autosaveSlot), flags: JSON.stringify(G.flags), cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir] })));
    await pg.locator('#x17-play-x17demo').click();
    const inside = await ev(async () => {
      const out = { id: EXTRAS17.inExtra(), state: G.state, map: G.mapId, flags: Object.keys(G.flags).filter((k) => !/^p7t_|^p11c_/.test(k)), name: G.player.name, gold: G.player.gold, slots: SLOTS.map((s) => !!s), auto: !!UPG.autosaveSlot, hard: HARDCORE.save, journal: G.journal.length,
        notBook: G.player !== __book.player && G.flags !== __book.flags && G.maps !== __book.maps, banner: (() => { const b = document.getElementById('x17-banner'); return b && !b.hidden ? b.textContent : ''; })(), title: document.getElementById('title').classList.contains('hidden'), starts: __demoStarts, winter: WINTER17.active('oakhaven') };
      // the extra's own Save panel: one slot, no code, no download
      renderMenu();
      out.leaveBtn = (document.getElementById('mn-title') || {}).textContent; out.hcBtn = !!document.getElementById('mn-hardcore'); out.menuTag = !!document.getElementById('x17-menu-tag');
      renderSave(); await new Promise((r) => setTimeout(r, 30));
      out.savePanel = G.openPanel; out.saveCode = !!document.getElementById('savecode'); out.dataSlots = document.querySelectorAll('[data-slot]').length;
      document.getElementById('x17-save-slot').click(); out.hasSave = EXTRAS17.hasSave('x17demo'); out.slotsAfter = SLOTS.map((s) => !!s);
      // a boss autosave inside the extra writes the extra's autosave, not Book One's
      G.flags.p17x_progress = 2; UPG.autosaveSlot = snapshotGame(); UPG.autosaveWhen = 'Demo';
      // codes never leave an extra; Book One's code does not open inside it
      try { await saveCode(); out.codeOut = true; } catch (e) { out.codeOut = false; }
      try { await loadCode(__bookCode); out.bookIn = true; } catch (e) { out.bookIn = false; out.bookInMsg = e.message; }
      out.stillDemo = G.flags.p17x_demo === 1 && EXTRAS17.inExtra() === 'x17demo';
      renderLoad(false); out.loadPanel = G.openPanel; out.loadCode = !!document.getElementById('savecode'); out.loadSlot = !!document.getElementById('x17-load-slot'); out.loadAuto = !!document.getElementById('x17-load-auto');
      G.player.gold = 1234; document.getElementById('x17-load-slot').click(); out.reloaded = G.player.gold !== 1234 && G.flags.p17x_demo === 1 && EXTRAS17.inExtra() === 'x17demo';
      return out;
    }).catch((e) => ({ err: String(e) }));
    // (the Book One code is passed in via a global set before)
    check(!inside.err, 'inside the extra ran ' + (inside.err || ''));
    check(inside.id === 'x17demo' && inside.state === 'play' && inside.map === 'oakhaven' && inside.starts === 1 && inside.title, 'Play starts the demo extra in play, title hidden');
    check(inside.notBook && inside.name === 'Traveller' && inside.gold !== 99 && !inside.flags.includes('test_mark') && !inside.flags.includes('lamps_lit') && inside.flags.includes('p17x_on') && inside.journal === 0, 'the extra runs on a fresh session: its own player, flags, maps (no Book One state) ' + JSON.stringify(inside.flags));
    check(inside.slots.every((s) => !s) && !inside.auto && inside.hard === null, 'Book One slots, autosave and hardcore save are put aside while inside');
    check(/^An extra — after Book One/.test(inside.banner) && /A demo extra/.test(inside.banner), 'the banner reads "An extra — after Book One" and the title');
    check(inside.winter && inside.winter.snow === 0.75 && inside.winter.breath === true, 'the extra applied WINTER17');
    check(inside.leaveBtn === 'Leave the extra' && !inside.hcBtn && inside.menuTag, 'Options: Return to title becomes Leave the extra; no hardcore switch');
    check(inside.savePanel === 'x17save' && !inside.saveCode && inside.dataSlots === 0 && inside.hasSave && inside.slotsAfter.every((s) => !s), 'Save game shows the extra\'s own slot only (no code, no Book One slots) and never writes SLOTS');
    check(inside.codeOut === false, 'no save code can be made inside an extra');
    check(inside.loadPanel === 'x17load' && !inside.loadCode && inside.loadSlot && inside.loadAuto && inside.reloaded, 'Load game shows the extra\'s slot and its own autosave, and loading it works');
    check(inside.stillDemo, 'still inside the demo after the refused code');
    const leave = await ev(() => { renderMenu(); document.getElementById('mn-title').click(); return { id: EXTRAS17.inExtra(), state: G.state, panel: G.openPanel, title: !document.getElementById('title').classList.contains('hidden'), banner: document.getElementById('x17-banner').hidden, winter: WINTER17.maps().length, resume: !!document.getElementById('x17-resume-x17demo') }; });
    check(leave.id === null && leave.state === 'title' && leave.panel === 'x17menu' && leave.title && leave.banner && leave.winter === 0, 'Leave the extra returns to the Extras menu on the title; banner gone; winter cleared');
    check(leave.resume, 'the card offers to continue from the extra\'s save');
    const after = await ev(() => ({
      slot: JSON.stringify(SLOTS[0]), auto: JSON.stringify(UPG.autosaveSlot), when: UPG.autosaveWhen, flags: JSON.stringify(G.flags), map: G.mapId, cam: [Engine.cam.x, Engine.cam.y, Engine.cam.dir],
      same: G.player === __book.player && G.flags === __book.flags && G.maps === __book.maps && G.map === __book.map && G.journal === __book.journal && SLOTS[0] === __book.slot0 && UPG.autosaveSlot === __book.auto, slots: SLOTS.map((s) => !!s),
    }));
    check(after.slot === book.slot, 'the Book One session slot is byte-identical after playing and quitting the extra');
    check(after.auto === book.auto && after.when === book.when, 'the Book One autosave is byte-identical (the extra\'s autosave went elsewhere)');
    check(after.flags === book.flags && after.same && after.map === book.map && after.cam.join() === book.cam.join(), 'the live Book One session (player, flags, maps, camera) is the same objects as before');
    // the Book One save still loads, and the code too
    const loads = await ev(async () => {
      const out = {};
      closeModal(); renderLoad(true); out.panel = G.openPanel; document.querySelector('[data-slot="0"]').click();
      out.state = G.state; out.mark = G.flags.test_mark; out.gold = G.player.gold; out.noX = !Object.keys(G.flags).some((k) => k.startsWith('p17x_'));
      try { await loadCode(__bookCode); out.code = G.flags.test_mark === 7; } catch (e) { out.code = 'threw ' + e.message; }
      return out;
    });
    check(loads.state === 'play' && loads.mark === 7 && loads.gold === 99 && loads.noX && loads.code === true, 'the Book One slot and code load after the extra, with no p17x_ flags');
    // an extra's save can never open as Book One
    const smug = await ev(async () => { const d = snapshotGame(); d.flags = Object.assign({}, d.flags, { p17x_on: 1, p17x_x: EXTRAS17.idCode('x17demo') }); try { restoreGame(JSON.parse(JSON.stringify(d))); return 'loaded'; } catch (e) { return e.message; } });
    check(/belongs to an extra/.test(smug), 'outside an extra, a save carrying p17x_on is refused');

    // ------------------------------------------------------------ resume, finish(result), death
    const fin = await ev(async () => {
      const out = {};
      renderMenu(); document.getElementById('mn-title').click(); EXTRAS17.open();
      out.resumed = EXTRAS17.resume('x17demo') && EXTRAS17.inExtra() === 'x17demo' && G.flags.p17x_demo === 1 && !('test_mark' in G.flags);
      die('A test'); out.deathLeave = !!document.getElementById('x17-death-leave') && !document.getElementById('x17-death-leave').hidden;
      document.getElementById('btn-wake').click();
      out.finish = EXTRAS17.finish('Kept the lamp lit <img src=x onerror=window.__pwned=1> till dawn.');
      out.res = (document.querySelector('[data-extra="x17demo"] .x17-res') || {}).textContent || '';
      out.img = !!document.querySelector('#modal-panel img'); out.pwned = !!window.__pwned;
      out.ls = JSON.parse(localStorage.getItem('octave.extras17.v1')).res.x17demo;
      out.noSave = !EXTRAS17.hasSave('x17demo') && !!document.getElementById('x17-play-x17demo');
      out.mark = G.flags.test_mark;
      return out;
    });
    check(fin.resumed, 'Continue from its save resumes the extra in a fresh isolated session');
    check(fin.deathLeave, 'dying inside an extra offers "Leave the extra" on the death screen');
    check(fin.finish === true && /Kept the lamp lit/.test(fin.res) && !fin.img && !fin.pwned && !/[<>]/.test(fin.ls || ''), 'finish(result) returns to the menu and shows the result on the card, as text only');
    check(fin.noSave && fin.mark === 7, 'a finished extra starts fresh next time; Book One (loaded before) is back');
    const deathHidden = await ev(() => { G.state = 'play'; document.getElementById('title').classList.add('hidden'); closeModal(); die('A test'); const b = document.getElementById('x17-death-leave'); const r = !b || b.hidden; document.getElementById('btn-wake').click(); return r; });
    check(deathHidden, 'outside an extra the death screen has no Leave button');

    // ------------------------------------------------------------ reload mid-extra
    await ev(() => { renderMenu(); document.getElementById('mn-title').click(); EXTRAS17.start('x17demo'); });
    check(await ev(() => JSON.parse(localStorage.getItem('octave.extras17.v1')).run === 'x17demo'), 'a running extra is noted in storage');
    await pg.reload(); await pg.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title'); await ev(DEMO);
    const rl = await ev(() => { EXTRAS17.open(); return { id: EXTRAS17.inExtra(), st: JSON.parse(localStorage.getItem('octave.extras17.v1')), cut: /interrupted/.test((document.querySelector('[data-extra="x17demo"]') || {}).textContent || ''), title: !document.getElementById('title').classList.contains('hidden'), state: G.state, map: G.map, flags: Object.keys(G.flags).length }; });
    check(rl.id === null && rl.st.run === null && rl.st.cut === 'x17demo' && rl.cut && rl.title && rl.state === 'title' && rl.map === null, 'after a reload mid-extra: the title, nothing running, the card says the visit was interrupted');
    const rl2 = await ev(() => { EXTRAS17.start('x17demo'); const a = EXTRAS17.inExtra(); const cut = EXTRAS17.state.cut; EXTRAS17.quit(); return { a, cut, map: G.map, state: G.state }; });
    check(rl2.a === 'x17demo' && rl2.cut === null && rl2.map === null && rl2.state === 'title', 'it starts again cleanly; leaving with no Book One game in progress leaves no map behind');

    // ------------------------------------------------------------ hostile storage
    await ev(() => localStorage.setItem('octave.extras17.v1', JSON.stringify({ ack: '1', done: 2, res: { '<b>': 'x', x17demo: '<script>alert(1)</script>' + 'y'.repeat(500) }, run: '../evil', cut: 5, w: 'no' })));
    await pg.reload(); await pg.waitForFunction(() => typeof Engine !== 'undefined' && G.state === 'title'); await ev(DEMO);
    const hs = await ev(() => ({ st: EXTRAS17.state }));
    check(hs.st.ack === 0 && hs.st.done === 0 && hs.st.run === null && hs.st.cut === null && !hs.st.res['<b>'] && hs.st.res.x17demo.length <= 160 && !/[<>]/.test(hs.st.res.x17demo) && hs.st.w === 1, 'hostile storage is clamped to safe values');
    await ev(() => { EXTRAS17._reset(); EXTRAS17.state.ack = 1; EXTRAS17.state.done = 1; });

    // ------------------------------------------------------------ WINTER17: the look
    await toGame(pg, 'Snow Look');
    const look = await ev(() => {
      const out = {};
      Weather.hold('clear'); for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
      PRESETS.apply('medium'); GFX.reduceMotion = false;
      const sp = G.maps.oakhaven.spawn; loadMap('oakhaven', sp); G.state = 'play'; G.tod = 0.45; G.fadeT = 0;
      Engine.setTime && Engine.setTime(5);
      const grab = () => { const pn = performance.now, dn = Date.now, mr = Math.random; performance.now = () => 123456; Date.now = () => 1.7e12; Math.random = () => 0.5; try { render(); } finally { performance.now = pn; Date.now = dn; Math.random = mr; } const d = Engine.ctx.getImageData(0, 0, Engine.canvas.width, Engine.VIEW_H * Engine.getScale()).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h ^= d[i] + (d[i + 1] << 8) + (d[i + 2] << 16); h = Math.imul(h, 16777619) >>> 0; } return h; };
      const bright = () => { const S = Engine.getScale(), y0 = Math.round(Engine.VIEW_H * S * 0.6); const d = Engine.ctx.getImageData(0, y0, Engine.canvas.width, Engine.VIEW_H * S - y0).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 175 && d[i + 1] > 180 && d[i + 2] > 190) n++; return n; };
      const plain = grab(); out.plainBright = bright();
      WINTER17.apply('oakhaven', { snow: 0.8, fall: 0.6, breath: true, grade: 0.5 });
      const snowy = grab(); out.snowBright = bright(); out.stats = Object.assign({}, WINTER17.stats);
      out.changed = snowy !== plain;
      // other modules animate per render call, so "identical" is checked on what the winter passes did: nothing
      const idle = () => { const S = WINTER17.stats; S.ground = S.roof = S.graded = -1; S.flakes = -1; grab(); return S.ground === -1 && S.roof === -1 && S.graded === -1 && S.flakes <= 0 && !AIR11.breath.COLD_MAPS.has('oakhaven'); };
      GFX.winter17 = false; out.offSame = idle(); GFX.winter17 = true;
      WINTER17.setWinter(false); out.switchSame = idle(); WINTER17.setWinter(true);
      WINTER17.clear('oakhaven'); out.clearSame = idle(); out.active = WINTER17.active('oakhaven');
      WINTER17.apply('oakhaven', { snow: 2, fall: -1, grade: 'x' }); out.norm = WINTER17.active('oakhaven');
      WINTER17.apply('oakhaven', { snow: 0.8, fall: 0.6, breath: true, grade: 0.5 });
      out.cold = AIR11.breath.COLD_MAPS.has('oakhaven');
      GFX.reduceMotion = true; grab(); out.rmFlakes = WINTER17.stats.flakes; GFX.reduceMotion = false;
      GFX.particles = 0.5; grab(); out.halfFlakes = WINTER17.stats.flakes; GFX.particles = 1; grab(); out.fullFlakes = WINTER17.stats.flakes;
      PRESETS.apply('original'); out.origFlag = GFX.winter17; out.origSame = idle();
      PRESETS.apply('low'); out.lowFlag = GFX.winter17; PRESETS.apply('cinematic'); out.cineFlag = GFX.winter17; PRESETS.apply('medium');
      // cost: 12 enemies on screen, 1x, the four passes together
      for (let i = 0; i < 12; i++) G.ents.push(hydrate({ kind: 'enemy', type: 'hollow' in ENEMIES ? 'hollow' : Object.keys(ENEMIES)[0], x: sp.x + Math.cos(sp.dir || 0) * (3 + i * 0.4) + (i % 3 - 1) * 0.6, y: sp.y + Math.sin(sp.dir || 0) * (3 + i * 0.4), passive: true }));
      const t = (n) => { const a = performance.now(); for (let i = 0; i < n; i++) render(); return (performance.now() - a) / n; };
      t(5); WINTER17.clear('oakhaven'); const off = t(30); WINTER17.apply('oakhaven', { snow: 0.8, fall: 0.6, breath: true, grade: 0.5 });
      WINTER17.profile(true); const onMs = t(30); out.passMs = WINTER17.stats.ms / 30; WINTER17.profile(false);
      out.offMs = off; out.onMs = onMs;
      G.ents.splice(G.ents.length - 12, 12);
      WINTER17.clear('oakhaven'); out.coldAfter = AIR11.breath.COLD_MAPS.has('oakhaven');
      return out;
    });
    check(look.changed && look.snowBright > look.plainBright * 2 + 500 && look.stats.ground > 1000 && look.stats.roof > 50 && look.stats.flakes > 20, 'winter visibly changes the frame: snow on the ground and roofs, flakes falling ' + JSON.stringify({ pb: look.plainBright, sb: look.snowBright, s: look.stats }));
    check(look.offSame && look.switchSame && look.clearSame && look.active === null, 'off (GFX flag or the Options switch) or cleared = the winter passes draw nothing and air11 breath is back to normal ' + JSON.stringify([look.offSame, look.switchSame, look.clearSame]));
    check(look.norm.snow === 1 && look.norm.fall === 0 && look.norm.grade === 0 && look.norm.breath === true, 'opts are clamped (snow 2 -> 1, fall -1 -> 0, junk grade -> 0)');
    check(look.cold && !look.coldAfter, 'breath: the map joins air11\'s cold maps while winter is on, and leaves on clear');
    check(look.rmFlakes === 0 && look.halfFlakes > 0 && look.halfFlakes < look.fullFlakes, 'Reduce motion: no falling snow; particle limits scale the flakes (' + look.halfFlakes + ' / ' + look.fullFlakes + ')');
    check(look.origFlag === false && look.origSame && look.lowFlag === false && look.cineFlag === true, 'off in Original (passes idle) and Low; on in Cinematic');
    check(look.passMs < 2.5, 'winter passes cost ' + look.passMs.toFixed(2) + ' ms a frame at 1x with 12 enemies (render ' + look.offMs.toFixed(2) + ' -> ' + look.onMs.toFixed(2) + ' ms)');
    console.log('cost: passes ' + look.passMs.toFixed(3) + ' ms; render off ' + look.offMs.toFixed(2) + ' on ' + look.onMs.toFixed(2));

    // the Options row
    const opt = await ev(() => { renderAccessibilityMenu(); const b = document.getElementById('x17-opt-winter'); const t0 = b && b.textContent; if (b) b.click(); const t1 = b && b.textContent, v = WINTER17.settings.winter; if (b) b.click(); closeModal(); G.state = 'play'; return { t0, t1, v, back: WINTER17.settings.winter }; });
    check(opt.t0 === 'On' && opt.t1 === 'Off' && opt.v === false && opt.back === true, 'Options > Graphics & access has the "Winter in the extras" switch');

    // ------------------------------------------------------------ screenshots: Medium and Cinematic, inside the demo
    if (SHOTS) {
      for (const preset of ['medium', 'cinematic']) {
        for (const when of ['day', 'dusk']) {
          await ev(([p, w]) => {
            if (EXTRAS17.inExtra()) EXTRAS17.quit();
            closeModal(); G.state = 'title';
            EXTRAS17.start('x17demo'); PRESETS.apply(p); GFX.reduceMotion = false;
            for (const id in G.maps) for (const e of G.maps[id].entities) if (e.kind === 'enemy') e.hidden = true;
            G.tod = w === 'day' ? 0.45 : 0.76; loadMap('oakhaven', w === 'day' ? { x: 22.5, y: 12.5, dir: 0.6 } : { x: 26, y: 14, dir: 2.6 }); G.keys = {}; G.state = 'play'; G.fadeT = 0; document.getElementById('msgs').innerHTML = '';
          }, [preset, when]);
          await pg.waitForTimeout(900);
          await pg.screenshot({ path: SHOTS + '/x17-winter-' + preset + '-' + when + '.png' });
        }
      }
      await ev(() => { PRESETS.apply('medium'); G.tod = 0.45; loadMap('oakhaven', { x: 22.5, y: 12.5, dir: 0.6 }); WINTER17.clear('oakhaven'); document.getElementById('msgs').innerHTML = ''; });
      await pg.waitForTimeout(500);
      await pg.screenshot({ path: SHOTS + '/x17-nowinter-medium-day.png' });
      await ev(() => { EXTRAS17.quit(); });
      await pg.waitForTimeout(300);
      await pg.screenshot({ path: SHOTS + '/x17-menu-after.png' });
    }
    await pg.close();

    // ------------------------------------------------------------ compact 640x400 and module blocked
    const C = await boot(browser, { width: 640, height: 400 }); allErrors.push(C.errors);
    const fit = await C.page.evaluate(() => {
      EXTRAS17.state.ack = 1; EXTRAS17.state.done = 1; EXTRAS17.open();
      const p = document.getElementById('modal-panel'); const ti = document.querySelector('#title .title-inner').getBoundingClientRect();
      const g = document.getElementById('game').getBoundingClientRect(); const b = document.getElementById('btn-extras').getBoundingClientRect();
      return { over: p.scrollWidth - p.clientWidth, titleFits: ti.right <= g.right + 1 && ti.bottom <= g.bottom + 1, btnIn: b.right <= g.right && b.bottom <= g.bottom && b.width > 0 };
    });
    check(fit.over <= 1 && fit.titleFits && fit.btnIn, 'at 640x400 the Extras panel has no horizontal overflow and the title (with its new button) fits');
    if (SHOTS) await C.page.screenshot({ path: SHOTS + '/x17-menu-640x400.png' });
    await C.page.evaluate(() => { closeModal(); });
    if (SHOTS) await C.page.screenshot({ path: SHOTS + '/x17-title-640x400.png' });
    await C.page.close();
    const B = await boot(browser, null, { blockModule: true }); allErrors.push(B.errors);
    const blocked = await B.page.evaluate(() => ({ btn: !!document.getElementById('btn-extras'), w: typeof WINTER17 }));
    check(!blocked.btn && blocked.w === 'undefined', 'with the module blocked the title is the original one');
    await B.page.close();
  } catch (e) { fails.push('exception: ' + (e && e.stack || e)); console.log('FAIL: exception ' + (e && e.stack || e)); }
  const errs = allErrors.flat().filter((m) => !/favicon|ERR_FILE_NOT_FOUND/.test(m));
  check(errs.length === 0, 'no page errors (' + errs.slice(0, 3).join(' | ') + ')');
  await browser.close();
  if (fails.length) { console.log('\n' + fails.length + ' FAILED'); process.exit(1); }
  console.log('\nPASS extras17 — all checks');
})();
