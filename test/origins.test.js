// PREVIEW_URL=http://127.0.0.1:3844 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/origins.test.js
// Phase 10 origins: (1) the question-based class picker, (2) the four interaction modes, (3) load from file.
// Uses the managed preview; never starts a server and never writes player saves. Files it needs go in a temp folder.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const URL_ = process.env.PREVIEW_URL || 'http://127.0.0.1:3844';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'origins-test-'));
const SHOTS = process.env.SHOTS_DIR || '';
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name) }); };

async function boot(page, opts) {
  await page.goto(URL_);
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
  await page.locator('#btn-new').click();
  await page.locator('#cname').fill('Origins Tester');
  await page.locator('#c-next').click();
  await page.locator('.classlist button').first().click();
  await page.locator('#c-next').click();
  await page.locator('#c-next').click();
  for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
    const choice = page.locator('#create-panel .list button').first();
    if (await choice.count()) await choice.click();
    else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
  }
  await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
  await page.waitForFunction(() => typeof ORIGINS === 'object' && G.state === 'play');
  await page.waitForTimeout(300);
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /origins/i.test(m.text()))) errors.push('console: ' + m.text()); });
    await page.goto(URL_);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on'));
    await page.waitForFunction(() => typeof ORIGINS === 'object');

    // ================================================================= 1. the question-based class picker
    // ---- the data: shape, weights, and every calling can win
    const data = await page.evaluate(() => {
      const ids = CLASSES.map(c => c.id), out = { n: ORIGINS.QUESTIONS.length, bad: [], primaries: {}, wins: {}, reasons: Object.keys(ORIGINS.REASONS).sort().join(), ids: ids.slice().sort().join() };
      ORIGINS.QUESTIONS.forEach((q, qi) => {
        if (q.a.length !== 3) out.bad.push('Q' + qi + ' needs three answers');
        if (typeof q.q !== 'string' || !q.q) out.bad.push('Q' + qi + ' has no text');
        q.a.forEach((a, ai) => {
          const keys = Object.keys(a.w);
          if (!keys.length || keys.some(k => !ids.includes(k) || !(a.w[k] > 0 && a.w[k] <= 3))) out.bad.push(`Q${qi}A${ai} weights`);
          const top = keys.sort((x, y) => a.w[y] - a.w[x])[0]; out.primaries[top] = (out.primaries[top] || 0) + 1;
        });
      });
      // answer each question the way a given calling would: its highest weight, first listed on a tie
      for (const id of ids) {
        const picks = ORIGINS.QUESTIONS.map(q => { let best = 0, bw = -1; q.a.forEach((a, i) => { const w = a.w[id] || 0; if (w > bw) { bw = w; best = i; } }); return best; });
        out.wins[id] = ORIGINS.suggest(picks).top.id; out['picks_' + id] = picks.join('');
      }
      // an unanswered quiz still suggests something sensible, and a hostile pick list cannot throw
      out.blank = ORIGINS.suggest([]).top.id; out.hostile = ORIGINS.suggest([9, -1, 'x', null, {}, 2]).top.id;
      return out;
    });
    assert.equal(data.n, 11, 'eleven questions');
    assert.deepEqual(data.bad, [], 'every question has three weighted answers: ' + data.bad);
    assert.equal(data.reasons, data.ids, 'a verdict paragraph for every calling');
    for (const [id, n] of Object.entries(data.primaries)) assert(n >= 4, `${id} is the first choice of at least four answers (${n})`);
    for (const [id, win] of Object.entries(data.wins)) assert.equal(win, id, `answering as the ${id} suggests the ${id}`);
    assert.equal(data.blank, 'blade', 'no answers: ties go to the first calling');
    console.log('PASS the questions: 11 x 3 weighted answers, a verdict per calling, every calling can win');

    // ---- through the real screens
    const startCreation = async (bio) => {
      await page.evaluate(() => {
        hide('#title'); hide('#intro'); hide('#modal'); show('#create'); G.state = 'create';
        Object.assign(CREATE, { step: 0, name: '', cls: null, face: 1, bio: [], mods: {}, bg: 0, adv: {}, dis: {} });
        renderCreate();
      });
      await page.locator('#cname').fill('Pilgrim'); await page.locator('#c-next').click();
    };
    const finishCreation = async (alreadyAtFace) => {
      if (!alreadyAtFace) await page.locator('#c-next').click();   // Continue from the list to the face
      await page.locator('#c-next').click();            // biography begins
      for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
        const choice = page.locator('#create-panel .list button').first();
        if (await choice.count()) await choice.click();
        else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
      }
      await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
      await page.waitForFunction(() => G.state === 'play');
      // everything creation makes; the play-time clocks (playtools' p7 timers, the hour of day) tick on their own and are not part of it
      return page.evaluate(() => JSON.stringify({ player: G.player, flags: Object.fromEntries(Object.entries(G.flags).filter(([k]) => !/^p7[ts]_/.test(k))), journal: G.journal, ledger: G.ledger, day: G.day, mapId: G.mapId }));
    };
    const classIds = data.ids.split(',');
    const order = await page.evaluate(() => CLASSES.map(c => c.id));
    for (let ci = 0; ci < order.length; ci++) {
      const id = order[ci];
      // by hand
      await startCreation();
      await page.locator('.classlist button').nth(ci).click();
      const manual = await finishCreation();
      // by the questions, answered as that calling would
      await startCreation();
      await page.locator('#or-quiz-btn').click();
      const picks = data['picks_' + id].split('').map(Number);
      for (let q = 0; q < 11; q++) {
        assert.equal(await page.locator('#create-panel h2').innerText().then(t => /Questions/.test(t) && t.includes(`${q + 1} of 11`)), true, 'question ' + (q + 1) + ' is showing');
        await page.locator(`#create-panel .or-answers button[data-a="${picks[q]}"]`).click();
      }
      assert.equal(await page.locator('#or-name').innerText(), await page.evaluate(i => CLASSES[i].name, ci), 'the verdict names ' + id);
      assert((await page.locator('#or-why').innerText()).length > 60, 'a paragraph of why');
      await page.locator('#or-accept').click();
      assert.equal(await page.evaluate(() => CREATE.step), 2, 'accepting goes to the next step of creation');
      const quiz = await finishCreation(true);
      assert.equal(quiz, manual, `the quiz and a hand pick make the same ${id}`);
      assert.equal(await page.evaluate(() => G.player.cls.id), id);
    }
    console.log('PASS quiz -> suggestion -> accept gives byte-identical player, flags and logbook to a manual pick, for all six callings');

    // ---- going back, returning to the list, answering again
    await startCreation();
    await page.locator('.classlist button').nth(2).click();                 // a hand pick that the quiz must not disturb
    await page.locator('#or-quiz-btn').click();
    await page.keyboard.press('2'); await page.keyboard.press('3');
    assert.match(await page.locator('#create-panel h2').innerText(), /3 of 11/);
    await page.keyboard.press('Backspace');
    assert.match(await page.locator('#create-panel h2').innerText(), /2 of 11/, 'Backspace goes back one question');
    await page.locator('#or-prev').click();
    assert.match(await page.locator('#create-panel h2').innerText(), /1 of 11/, 'Previous question');
    assert.equal(await page.locator('#or-prev').isDisabled(), true, 'nothing before the first question');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.classlist button').count(), 6, 'Escape returns to the list');
    assert.equal(await page.evaluate(() => [CREATE.step, CREATE.cls, ORIGINS.quiz.active]).then(String), '1,2,false', 'the list is as it was; the quiz is closed');
    assert.equal(await page.locator('.classlist button.sel').count(), 1, 'the hand pick is still selected');
    // from the verdict
    await page.locator('#or-quiz-btn').click();
    for (let q = 0; q < 11; q++) await page.keyboard.press('1');
    assert.equal(await page.locator('#or-accept').count(), 1, 'the verdict is showing');
    await page.locator('#or-again').click();
    assert.match(await page.locator('#create-panel h2').innerText(), /1 of 11/, 'Answer again starts over');
    for (let q = 0; q < 11; q++) await page.keyboard.press('3');
    await page.locator('#or-list').click();
    assert.equal(await page.evaluate(() => [CREATE.step, CREATE.cls].join()), '1,2', 'Back to the list leaves the choice alone');
    assert.equal(await page.locator('#c-next').isDisabled(), false, 'and the list still works: Continue');
    await page.locator('.classlist button').nth(4).click();
    await page.locator('#c-next').click();
    assert.equal(await page.evaluate(() => [CREATE.step, CREATE.cls].join()), '2,4', 'a hand pick after the quiz works as ever');
    // the verdict can step back into the last question
    await page.evaluate(() => { ORIGINS.toList(); });
    await page.locator('#or-quiz-btn').click();
    for (let q = 0; q < 11; q++) await page.keyboard.press('2');
    await page.keyboard.press('Backspace');
    assert.match(await page.locator('#create-panel h2').innerText(), /11 of 11/, 'back from the verdict reopens the last question');
    console.log('PASS the quiz: previous question, Escape / button back to the list, answer again, hand picks unaffected');

    // ---- keyboard only: Enter on the focused Accept; Tab reaches the buttons
    await page.evaluate(() => { ORIGINS.toList(); CREATE.cls = null; renderCreate(); });
    await page.locator('#or-quiz-btn').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.dataset.a), '0', 'the first answer has focus');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.dataset.a), '1', 'Tab moves along the answers');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#create-panel h2').innerText(), /2 of 11/, 'Enter on a focused answer chooses it');
    for (let q = 0; q < 10; q++) await page.keyboard.press('3');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'or-accept', 'Accept has the focus on the verdict');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => [CREATE.step, CREATE.cls !== null].join()), '2,true', 'Enter accepts');
    console.log('PASS the quiz is playable from the keyboard alone');

    // ---- touch: tap through the questions
    await page.evaluate(() => { ORIGINS.toList(); CREATE.cls = null; renderCreate(); });
    await page.locator('#or-quiz-btn').tap();
    for (let q = 0; q < 11; q++) await page.locator('#create-panel .or-answers button').nth(q % 3).tap();
    await page.locator('#or-accept').tap();
    assert.equal(await page.evaluate(() => CREATE.step), 2, 'touch can finish the quiz');
    console.log('PASS the quiz is playable by touch');

    // ---- controller: D-pad moves the focus, A presses, B steps back
    await page.evaluate(() => {
      window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [window.__pad];
      window.__tap = (i) => new Promise(r => { window.__pad.buttons[i].pressed = true; setTimeout(() => { window.__pad.buttons[i].pressed = false; setTimeout(r, 300); }, 400); });   // the quiz polls on a timer: hold well past a poll
      ORIGINS.toList(); CREATE.cls = null; renderCreate(); ORIGINS.quizOpen();
    });
    const tap = (i) => page.evaluate(i => window.__tap(i), i);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.a), '0');
    await tap(13); assert.equal(await page.evaluate(() => document.activeElement.dataset.a), '1', 'D-pad down moves to the next answer');
    await tap(12); assert.equal(await page.evaluate(() => document.activeElement.dataset.a), '0', 'D-pad up moves back');
    await tap(0); assert.match(await page.locator('#create-panel h2').innerText(), /2 of 11/, 'A chooses the focused answer');
    await tap(1); assert.match(await page.locator('#create-panel h2').innerText(), /1 of 11/, 'B goes back a question');
    await tap(1); assert.equal(await page.locator('.classlist button').count(), 6, 'B on the first question returns to the list');
    await page.evaluate(() => { navigator.getGamepads = () => []; });
    console.log('PASS the quiz is playable with a controller');

    // ---- reduce motion, hostile text, compact fit
    await page.evaluate(() => { ORIGINS.toList(); CREATE.cls = null; renderCreate(); GFX.reduceMotion = true; ORIGINS.quizOpen(); });
    assert.equal(await page.locator('.or-quiz.or-in').count(), 0, 'no fade-in with reduced motion');
    await page.evaluate(() => { GFX.reduceMotion = false; renderCreate(); });
    assert.equal(await page.locator('.or-quiz.or-in').count(), 1, 'a short fade-in otherwise');
    const hostile = await page.evaluate(() => {
      const keep = CLASSES[0].name, keepSkills = CLASSES[0].skills;
      CLASSES[0].name = '<img src=x onerror="window.__pwn=1"> Blade'; CLASSES[0].skills = '<b id=pwn2>x</b>';
      ORIGINS.quizOpen();
      for (let q = 0; q < 11; q++) ORIGINS.answer(Math.max(0, ORIGINS.QUESTIONS[q].a.findIndex(a => a.w.blade === 3)));
      const out = { imgs: document.querySelectorAll('#create-panel img').length, bold: !!document.getElementById('pwn2'), text: document.getElementById('or-name').textContent, pwn: window.__pwn || 0 };
      CLASSES[0].name = keep; CLASSES[0].skills = keepSkills; ORIGINS.toList();
      return out;
    });
    assert.deepEqual([hostile.imgs, hostile.bold, hostile.pwn], [0, false, 0], 'a hostile calling name is only ever text');
    assert(hostile.text.includes('<img'), 'shown as text');
    await page.setViewportSize({ width: 640, height: 400 });
    const fit = [];
    const fitNow = async (label) => fit.push([label, await page.evaluate(() => {
      const p = document.querySelector('#create-panel'), r = p.getBoundingClientRect();
      return { h: p.scrollWidth <= p.clientWidth + 1, v: p.scrollHeight <= p.clientHeight + 1, inside: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
        btns: Array.from(p.querySelectorAll('button')).every(b => { const q = b.getBoundingClientRect(); return q.bottom <= innerHeight && q.right <= innerWidth && q.top >= 0; }) };
    })]);
    await page.evaluate(() => { ORIGINS.toList(); }); await fitNow('list with the new button');
    await page.evaluate(() => ORIGINS.quizOpen());
    for (let q = 0; q < 11; q++) {
      await fitNow('question ' + (q + 1));
      await page.evaluate(q => ORIGINS.answer(2 - (q % 2)), q);   // alternate the answers so each is seen
    }
    await fitNow('verdict'); await shot(page, 'quiz-verdict-640.png');
    for (const cid of order) { await page.evaluate(cid => { ORIGINS.quiz.picks = ORIGINS.QUESTIONS.map(q => Math.max(0, q.a.findIndex(a => a.w[cid] === 3))); ORIGINS.quiz.done = true; renderCreate(); }, cid); await fitNow('verdict for ' + cid); }
    for (const [label, f] of fit) assert(f.h && f.v && f.inside && f.btns, `640x400: ${label} fits ${JSON.stringify(f)}`);
    await page.evaluate(() => { ORIGINS.quiz.done = false; ORIGINS.quiz.i = 0; renderCreate(); });
    await page.waitForTimeout(300); await shot(page, 'quiz-question-640.png');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { ORIGINS.toList(); });
    await page.waitForTimeout(200); await shot(page, 'quiz-list-1280.png');
    await page.evaluate(() => { ORIGINS.quizOpen(); }); await page.waitForTimeout(300); await shot(page, 'quiz-question-1280.png');
    await page.evaluate(() => { ORIGINS.quiz.picks = ORIGINS.QUESTIONS.map(q => Math.max(0, q.a.findIndex(a => a.w.archivist === 3))); ORIGINS.quiz.done = true; renderCreate(); });
    await page.waitForTimeout(300); await shot(page, 'quiz-verdict-1280.png');
    console.log('PASS the quiz: reduced motion, hostile names are text, fits 640x400 on every question and verdict');

    // leave creation properly and start a real game for the rest
    await boot(page);

    // ================================================================= 2. interaction modes
    await page.evaluate(() => {
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.base = JSON.parse(JSON.stringify(snapshotGame()));
      window.msgs = () => { const m = document.querySelectorAll('#msgs .m'); return m.length ? m[m.length - 1].textContent : ''; };   // the latest line (the tutorial tips come and go)
      window.mkroom = () => {
        // a closed room that answers to "oakhaven": pocketing and the law only exist there
        const m = new GameMap('oakhaven', 'Oakhaven', 20, 12, { floor: 't_flag', ceil: 't_stone', fogDist: 14, spawn: { x: 3.5, y: 6, dir: 0 } });
        m.border('t_stone'); G.maps.oakhaven = m; m.baseCount = 0; return m;
      };
      window.settle = (n) => { for (let i = 0; i < (n || 3); i++) advanceTime(40); controlsTick(); };   // what a real frame does
      window.place = (m, x, y, dir) => { loadMap('oakhaven', { x, y, dir: dir || 0 }); G.state = 'play'; G.keys = {}; $('#msgs').innerHTML = ''; G.noise = 2; settle(); };
      window.reset = () => {
        restoreGame(JSON.parse(JSON.stringify(base))); G.state = 'play'; G.keys = {}; $('#msgs').innerHTML = '';
        ORIGINS.setEnabled(false); ORIGINS.setMode('grab'); GFX.reduceMotion = false; closeModal(); G.state = 'play';
        document.querySelectorAll('#or-mode').forEach(e => { e.hidden = true; });
      };
      window.law = () => { const l = crimeState(); return { bounty: l.bounty, thefts: l.thefts }; };
      window.snap = () => JSON.stringify({ flags: G.flags, inv: G.player.inv, gold: G.player.gold, law: law(), hp: G.player.hp, state: G.state, panel: G.openPanel });
      window.clear = () => { G.state = 'play'; closeModal(); G.keys = {}; $('#msgs').innerHTML = ''; };
    });
    const run = (fn, arg) => page.evaluate(fn, arg);

    // ---- off by default, and off means off
    await run(() => {
      reset();
      check(ORIGINS.enabled() === false, 'Interaction modes are off by default');
      check(document.getElementById('or-mode') === null || document.getElementById('or-mode').hidden, 'no mode icon while off');
      const m = mkroom(); m.npc('harrow', 5, 6); m.item('honey', 4.6, 7.4); place(m, 3.5, 6, 0);
      // even with a stored "mode", an off setting changes nothing: the use call talks, as before
      ORIGINS.cfg.mode = 'steal'; interact();
      check(G.state === 'dialogue' && DLG.ent && DLG.ent.id === 'harrow', 'off: interact() still talks to whoever is in front');
      clear(); ORIGINS.cfg.mode = 'grab';
    });
    await page.keyboard.press(']'); await page.keyboard.press('Enter'); await page.keyboard.press('[');
    assert.equal(await run(() => [ORIGINS.cfg.mode, G.state, msgs().includes('Interaction mode')].join()), 'grab,play,false', 'off: ], [ and Enter do nothing');
    // a controller's D-pad still cycles weapons while off
    await run(() => {
      window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
      navigator.getGamepads = () => [window.__pad];
      // the game reads the pad once per frame: hold for two frames, release for two (a busy machine has slow frames)
      const frames = (n, f) => { if (n <= 0) f(); else requestAnimationFrame(() => frames(n - 1, f)); };
      window.__tap = (i) => new Promise(r => { window.__pad.buttons[i].pressed = true; frames(3, () => { window.__pad.buttons[i].pressed = false; frames(3, r); }); });
      G.player.weapon = 0;
    });
    await tap(15);
    assert.equal(await run(() => G.player.weapon), 1, 'off: D-pad right cycles the weapon, as before');
    await tap(14);
    assert.equal(await run(() => G.player.weapon), 0, 'off: D-pad left cycles back');
    // E and click behave as ever
    await run(() => { clear(); const m = G.maps.oakhaven; place(m, 3.5, 6, 0); });
    await page.keyboard.press('e');
    assert.equal(await run(() => [G.state, DLG.ent && DLG.ent.id].join()), 'dialogue,harrow', 'off: E talks');
    await run(() => clear());
    console.log('PASS off by default; off = the original keys, clicks and D-pad');

    // ---- turn on through the Options row
    await run(() => { reset(); G.state = 'panel'; renderAccessibilityMenu(); });
    assert.equal(await page.locator('#or-modes-opt').innerText(), 'Off');
    assert.equal(await page.locator('#modal-panel .gfx-label', { hasText: 'Interaction modes' }).count(), 1, 'a labelled row in Graphics & access');
    await page.locator('#or-modes-opt').click();
    assert.equal(await page.locator('#or-modes-opt').innerText(), 'On');
    assert.equal(await run(() => [ORIGINS.enabled(), JSON.parse(localStorage.getItem('octave.origins.v1')).modes].join()), 'true,true', 'persisted');
    await run(() => { closeModal(); G.state = 'play'; settle(); });
    assert.equal(await page.locator('#or-mode').isVisible(), true, 'the mode icon shows by the crosshair');
    console.log('PASS the Options switch and its persistence');

    // ---- cycling: key, middle mouse, touch button, D-pad
    await run(() => { reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('grab'); const m = mkroom(); place(m, 3.5, 6, 0); });
    const mode = () => run(() => ORIGINS.cfg.mode);
    await page.keyboard.press(']'); assert.equal(await mode(), 'info', ']: Grab -> Info');
    await page.keyboard.press(']'); assert.equal(await mode(), 'talk');
    await page.keyboard.press(']'); assert.equal(await mode(), 'steal', 'it wraps round');
    await page.keyboard.press('['); assert.equal(await mode(), 'talk', '[ goes back');
    assert.match(await run(() => msgs()), /Interaction mode: Talk/);
    await run(() => settle());
    assert.equal(await page.locator('#or-mode .or-word').innerText(), 'Talk');
    assert.equal(await page.locator('#or-mode').getAttribute('aria-label'), 'Interaction mode: Talk', 'the icon has a text name for screen readers');
    await page.mouse.move(400, 300); await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' });
    assert.equal(await mode(), 'steal', 'a middle click cycles');
    const camBefore = await run(() => Engine.cam.dir);
    await page.mouse.down({ button: 'middle' }); await page.mouse.move(520, 300, { steps: 6 }); await page.mouse.up({ button: 'middle' });
    assert.equal(await mode(), 'steal', 'a middle DRAG does not cycle (it still looks)');
    await run(() => { Engine.cam.dir = 0; });
    // touch
    await run(() => { setTouchMode(true); settle(); });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#or-t-mode').isVisible(), true, 'a Mode button on the touch pad');
    await page.locator('#or-t-mode').tap();
    assert.equal(await mode(), 'grab', 'tapping Mode cycles (Steal wraps to Grab)');
    assert.equal(await page.locator('#or-t-mode').innerText(), 'Grab', 'and shows the mode');
    await run(() => { setTouchMode(false); G.opts.touch = 'auto'; });
    // controller: D-pad cycles modes now; LB / RB still cycle weapons
    await run(() => { G.player.weapon = 0; });
    await tap(15); assert.equal(await mode(), 'info', 'D-pad right cycles the mode');
    await tap(14); assert.equal(await mode(), 'grab', 'D-pad left cycles back');
    assert.equal(await run(() => G.player.weapon), 0, 'the weapon did not change');
    await tap(5); assert.equal(await run(() => G.player.weapon), 1, 'RB still cycles the weapon');
    await tap(4); assert.equal(await run(() => G.player.weapon), 0, 'LB too');
    // not while a panel is open or in dialogue
    await run(() => { G.state = 'panel'; renderInventory(); });
    await page.keyboard.press(']'); assert.equal(await mode(), 'grab', 'no cycling inside a panel');
    await run(() => clear());
    console.log('PASS cycling: ] [ , middle click (not drag), touch Mode button, D-pad; weapons stay on LB/RB');

    // ---- what each mode does to a person, an item, an owned item, a door, a prop and a beast
    const world = () => run(() => {
      reset(); ORIGINS.setEnabled(true);
      const m = mkroom();
      m.npc('harrow', 5, 6); m.npc('townsman', 5, 9, { pocketId: 'far:1', pocketGold: 4 });
      m.item('tonic', 5, 3); const own = m.item('honey', 5, 1.5); own.owner = 'market';
      m.set(7, 4, DOOR({})); m.deco('sign', 5, 10.5, { use: 'bounty_board', label: 'The Test Noticeboard' });
      m.enemy('hound', 5, 11);
      place(m, 3.5, 6, 0);
    });
    const face = (x, y, dir, d) => run(([x, y, dir]) => { Engine.cam.x = x; Engine.cam.y = y; Engine.cam.dir = dir; clear(); settle(); }, [x, y, dir]);
    await world();
    // Talk
    await run(() => ORIGINS.setMode('talk')); await run(() => interact());
    assert.equal(await run(() => [G.state, DLG.ent && DLG.ent.id].join()), 'dialogue,harrow', 'Talk talks to a person');
    await run(() => clear());
    await face(3.5, 3, 0); await run(() => interact());
    assert.equal(await run(() => [G.state, /talk/i.test(msgs())].join()), 'play,true', 'Talk at an item: only a refusal line');
    assert.equal(await run(() => G.ents.some(e => e.item === 'tonic' && !e.dead)), true, 'and the item is still there');
    // Grab
    await run(() => ORIGINS.setMode('grab')); await run(() => { clear(); settle(); interact(); });
    assert.equal(await run(() => G.ents.find(e => e.item === 'tonic').dead === true && G.has('tonic')), true, 'Grab picks the item up');
    await face(3.5, 6, 0); await run(() => interact());
    assert.equal(await run(() => [G.state, /grab a person/i.test(msgs())].join()), 'play,true', 'Grab does not talk: it says so');
    await face(5.5, 4, 0); await run(() => interact());
    assert.equal(await run(() => G.map.doors[4 * G.map.w + 7].target), 1, 'Grab opens a door');
    // Info
    await run(() => ORIGINS.setMode('info')); await face(3.5, 6, 0); await run(() => interact());
    assert.equal(await run(() => [G.state, msgs()].join('|')), 'play|Old Harrow, gate-warden \u00b7 Someone you could speak to.', 'Info names the person and says nothing else');
    await face(5.5, 4, 0); await run(() => { G.map.doors[4 * G.map.w + 7].target = 0; G.map.doors[4 * G.map.w + 7].open = 0; clear(); settle(); interact(); });
    assert.equal(await run(() => msgs()), 'A closed door.', 'Info on a door');
    assert.equal(await run(() => G.map.doors[4 * G.map.w + 7].target), 0, 'and does not open it');
    await face(3.5, 10.5, 0); await run(() => { Engine.cam.x = 4.0; Engine.cam.y = 10.5; settle(); interact(); });
    assert.equal(await run(() => msgs()), 'The Test Noticeboard', 'Info on a prop gives its own label');
    await face(4, 11, 0); await run(() => { settle(); interact(); });
    assert.match(await run(() => msgs()), /^Cacophony Hound \u00b7 Static with appetite\.$/, 'Info on a beast: name and the first line only');
    // Talk / Steal with no one there
    await run(() => ORIGINS.setMode('steal')); await face(3.5, 10, Math.PI / 2); await run(() => { Engine.cam.dir = -Math.PI / 2; settle(); interact(); });
    assert.match(await run(() => msgs()), /Nothing here to steal/, 'Steal at nothing');
    // E and P keep their old meaning in every mode
    await world();
    for (const md of ['steal', 'info', 'talk', 'grab']) {
      await run(md => { clear(); ORIGINS.setMode(md); Engine.cam.x = 3.5; Engine.cam.y = 6; Engine.cam.dir = 0; settle(); }, md);
      await page.keyboard.press('e');
      assert.equal(await run(() => [G.state, DLG.ent && DLG.ent.id].join()), 'dialogue,harrow', `E talks in ${md} mode`);
      await run(() => clear());
      await run(() => { Engine.cam.x = 3.9; Engine.cam.y = 9; Engine.cam.dir = 0; settle(); });
      await page.keyboard.press('p');
      assert.equal(await run(() => G.openPanel), 'pickpocket', `P opens the purse panel in ${md} mode`);
      await run(() => { pickpocketInput('leave'); clear(); });
    }
    // Space too, and Enter acts in the current mode
    await run(() => { ORIGINS.setMode('info'); Engine.cam.x = 3.5; Engine.cam.y = 6; Engine.cam.dir = 0; settle(); });
    await page.keyboard.press(' ');
    assert.equal(await run(() => G.state), 'dialogue', 'Space talks in Info mode');
    await run(() => clear());
    await page.keyboard.press('Enter');
    assert.equal(await run(() => [G.state, msgs().startsWith('Old Harrow')].join()), 'play,true', 'Enter uses the current mode (Info)');
    console.log('PASS Talk, Grab, Info and Steal each do their own thing; E, Space and P are unchanged in every mode; Enter uses the mode');

    // ---- the mouse and the touch tap use the mode too
    await run(() => { reset(); ORIGINS.setEnabled(true); G.opts.captureMouse = false; G.opts.mouseLook = false; ORIGINS.setMode('info'); const m = mkroom(); m.npc('harrow', 5, 6); place(m, 3.5, 6, 0); settle(); });
    const box = await page.locator('#view').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.37);
    await page.mouse.down(); await page.mouse.up();
    assert.equal(await run(() => [G.state, msgs().startsWith('Old Harrow')].join()), 'play,true', 'a click uses Info');
    await run(() => { ORIGINS.setMode('talk'); clear(); settle(); });
    await page.mouse.down(); await page.mouse.up();
    assert.equal(await run(() => G.state), 'dialogue', 'a click uses Talk');
    await run(() => { clear(); setTouchMode(true); settle(); });
    await page.waitForTimeout(150);
    await page.locator('#t-use').tap();
    assert.equal(await run(() => G.state), 'dialogue', 'the Use button uses the mode (Talk)');
    await run(() => { clear(); ORIGINS.setMode('info'); setTouchMode(true); settle(); });
    await page.locator('#t-use').tap();
    assert.equal(await run(() => [G.state, msgs().startsWith('Old Harrow')].join()), 'play,true', 'the Use button uses Info');
    await run(() => { setTouchMode(false); G.opts.touch = 'auto'; });
    // controller A
    await run(() => { clear(); ORIGINS.setMode('talk'); settle(); });
    await tap(0);
    assert.equal(await run(() => G.state), 'dialogue', 'controller A uses the mode (Talk)');
    await run(() => clear());
    await run(() => { G.opts.captureMouse = true; G.opts.mouseLook = true; });
    console.log('PASS click, touch Use and controller A act in the current mode');

    // ---- Info mode lets you look at a sleeping beast or a plain prop; a hostile beast is still struck
    await run(() => {
      reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('info'); const m = mkroom(); m.enemy('hound', 5, 6, { passive: true }); m.deco('lamp', 5, 3); place(m, 3.5, 6, 0);
      const e = G.ents.find(x => x.type === 'hound'); e.state = 'passive'; settle();
      check(G.hintKind === 'enemy', 'an idle beast is a valid Info target');
      e.state = 'chase'; settle(4);
      check(G.hintKind !== 'enemy', 'a charging beast is not: a click swings');
    });
    console.log('PASS Info never swallows the click that should be a swing');

    // ---- Steal: the existing law and crime paths, with a witness and without
    const stealSetup = (witness, extra) => run(([witness, extra]) => {
      reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('steal');
      const m = mkroom(); const mark = m.npc('townsman', 5, 6, { pocketId: 'mark:1', pocketGold: 4 });
      let w = null;
      if (witness) { w = m.npc('townswoman', 9, 6, { facing: Math.PI }); }
      if (extra === 'item') { const it = m.item('honey', 4.9, 8.2); it.owner = 'market'; }
      place(m, 3.9, 6, 0);
      for (const e of G.ents) if (e.kind === 'npc' && e !== mark && e !== w) e.hidden = true;
      if (extra === 'item' && !witness) mark.hidden = true;   // the only person in the room would be a witness to the item
      if (w) { w.facing = Math.atan2(Engine.cam.y - w.y, Engine.cam.x - w.x); }
      settle();
      return { witness: !!theftWitness(mark) };
    }, [witness, extra]);
    // a witness: success still draws the bounty
    assert.equal((await stealSetup(true)).witness, true, 'fixture: a witness can see the theft');
    await run(() => { Math.random = (() => { const r = Math.random; window.__rnd = r; return () => 0; })(); interact(); });
    assert.equal(await run(() => G.openPanel), 'pickpocket', 'Steal on a person opens the existing purse panel');
    assert.equal(await run(() => law().bounty), 0, 'opening it costs nothing');
    await run(() => { pickpocketInput('take'); });
    assert.deepEqual(await run(() => [law().bounty, law().thefts, G.player.gold]), [20, 1, 16], 'with a witness: the coin is lifted, the bounty is +20, the theft is counted');
    assert.match(await run(() => document.getElementById('modal-panel').textContent), /witness reports you/);
    await run(() => { Math.random = window.__rnd; pickpocketInput('leave'); clear(); });
    // no witness: success is clean
    assert.equal((await stealSetup(false)).witness, false, 'fixture: no one can see');
    await run(() => { Math.random = () => 0; interact(); pickpocketInput('take'); });
    assert.deepEqual(await run(() => [law().bounty, law().thefts, G.player.gold]), [0, 1, 16], 'no witness: the coin is lifted and there is no bounty');
    assert.match(await run(() => document.getElementById('modal-panel').textContent), /No one notices/);
    await run(() => { Math.random = window.__rnd; pickpocketInput('leave'); clear(); });
    // no witness, caught: the existing penalty
    await stealSetup(false);
    await run(() => { Math.random = () => 0.999; interact(); pickpocketInput('take'); });
    assert.deepEqual(await run(() => [law().bounty, G.player.gold]), [20, 12], 'caught by the owner: +20 and no coin, exactly as P would');
    await run(() => { Math.random = window.__rnd; pickpocketInput('leave'); clear(); });
    // out of reach: no panel, a line instead
    await stealSetup(false);
    await run(() => { G.ents.find(e => e.pocketId).x = 8; settle(); interact(); });
    assert.equal(await run(() => [G.openPanel, /Nothing here to steal|Too far/.test(msgs())].join()), ',true', 'out of reach: no panel, a line instead');
    // an owned item goes through confirmTheft
    await stealSetup(true, 'item');
    await run(() => { Engine.cam.x = 4.9; Engine.cam.y = 7.2; Engine.cam.dir = Math.PI / 2; settle(); const w = G.ents.find(e => e.id === 'townswoman'); w.facing = Math.atan2(Engine.cam.y - w.y, Engine.cam.x - w.x); w.hidden = false; interact(); });
    assert.equal(await run(() => G.openPanel), 'theft', 'Steal on an owned item shows the existing "Not yours to take" panel');
    assert.equal(await run(() => G.has('honey')), false, 'nothing is taken until the player confirms');
    await page.locator('#crime-take').click();
    assert.deepEqual(await run(() => [G.has('honey'), law().bounty, law().thefts]), [true, 20, 1], 'a witnessed theft of an item: +20');
    await stealSetup(false, 'item');
    await run(() => { Engine.cam.x = 4.9; Engine.cam.y = 7.2; Engine.cam.dir = Math.PI / 2; settle(); interact(); });
    assert.equal(await run(() => G.openPanel), 'theft');
    await page.locator('#crime-take').click();
    assert.deepEqual(await run(() => [G.has('honey'), law().bounty, law().thefts, /No one sees you take it/.test(document.querySelector('#msgs').textContent)]), [true, 0, 1, true], 'unwitnessed: no bounty, a line says so');
    // leaving it
    await stealSetup(false, 'item');
    await run(() => { Engine.cam.x = 4.9; Engine.cam.y = 7.2; Engine.cam.dir = Math.PI / 2; settle(); interact(); });
    await page.locator('#crime-leave').click();
    assert.deepEqual(await run(() => [G.has('honey'), law().bounty, G.state]), [false, 0, 'play'], 'Leave it: nothing changes');
    // Grab on the same item meets the same panel (the original behaviour)
    await stealSetup(false, 'item');
    await run(() => { ORIGINS.setMode('grab'); Engine.cam.x = 4.9; Engine.cam.y = 7.2; Engine.cam.dir = Math.PI / 2; settle(); interact(); });
    assert.equal(await run(() => G.openPanel), 'theft', 'Grab on an owned item is still a theft panel');
    await run(() => { $('#crime-leave').click(); });
    // an unowned item cannot be "stolen"
    await run(() => { reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('steal'); const m = mkroom(); m.item('tonic', 5, 6); place(m, 3.9, 6, 0); interact(); });
    assert.equal(await run(() => [G.has('tonic'), /No one owns this/.test(msgs())].join()), 'false,true', 'Steal on an unowned item: a line, no pickup');
    // never through a companion, a guard, a child's purse...
    await run(() => { reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('steal'); const m = mkroom(); m.npc('harrow', 5, 6); place(m, 3.9, 6, 0); interact(); });
    assert.equal(await run(() => [G.openPanel, G.state].join()), ',play', 'a person without a purse: nothing to lift');
    // witness path is the same one P uses (same function): modes add no way around the law
    const lawFns = await run(() => ({ steal: ORIGINS.act.toString().includes('reportCrime'), b: ORIGINS.act.toString().includes('bounty') }));
    assert.deepEqual(lawFns, { steal: false, b: false }, 'the mode code never touches the bounty itself');
    console.log('PASS Steal: purse panel, witness => +20 bounty, none => clean, caught => penalty; owned items via the theft panel; nothing bypassed');

    // ---- Info reveals nothing hidden
    await run(() => {
      reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('info');
      const m = mkroom();
      const hiddenItem = m.item('coil', 5, 6); hiddenItem.hidden = true;                  // not yet revealed
      m.npc('harrow', 5, 3, { hidden: true });
      const owned = m.item('honey', 5, 9); owned.owner = 'market'; owned.label = 'Bettany’s honey — taking it is theft';
      m.item('cache', 4.4, 11); m.enemy('golem', 8, 10);
      place(m, 3.5, 6, 0);
      // a hidden item and a hidden person in front of you are not there
      check(ORIGINS.describe(ORIGINS.aim()) === null || !/Coil|Harrow/.test(ORIGINS.describe(ORIGINS.aim())), 'hidden things are not described');
      interact(); check(!/Coil|Harrow/.test(msgs()), 'Info says nothing of hidden things: ' + msgs());
      check(/Nothing close enough/.test(msgs()), 'it says there is nothing to look at');
      // a quest item that is visible: its name and a neutral line (its catalogue text is written for someone who holds it)
      hiddenItem.hidden = false; settle(); clear(); interact();
      check(msgs() === 'Reverse-Phase Coil \u00b7 Something you could pick up.', 'a quest item: its name and a neutral line: ' + msgs());
      check(!/bore|lock|snap|crystal/i.test(msgs()), 'no use is given away');
      // owned item: no mention of ownership or theft
      Engine.cam.x = 3.9; Engine.cam.y = 9; Engine.cam.dir = 0; clear(); settle(); interact();
      check(/^Oiled Honey \u00b7 For the throat\.$/.test(msgs()) && !/theft|market|belongs|Bettany/i.test(msgs()), 'an owned item is just an item: ' + msgs());
      // a strongbox says it is a strongbox
      Engine.cam.x = 3.3; Engine.cam.y = 11; clear(); settle(); interact();
      check(msgs() === 'A strongbox \u00b7 Someone hid this.', 'a strongbox: ' + msgs());
      // a golem: no health, no armour, no damage figures
      Engine.cam.x = 6.2; Engine.cam.y = 10; Engine.cam.dir = 0; Engine.cam.dir = 0; clear(); settle(); interact();
      const g = G.ents.find(e => e.type === 'golem');
      check(/^Steam Golem \u00b7 A boiler on legs\.$/.test(msgs()) && !/\d/.test(msgs()) && !/armou?r/i.test(msgs()), 'a golem: no numbers: ' + msgs());
      // nothing changed in the world
      check(G.state === 'play', 'still playing');
    });
    const info = await run(() => {
      reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('info');
      const m = mkroom(); m.npc('lyra', 5, 6); m.item('tonic', 5, 3); m.deco('crates', 5, 9, { use: 'crates' });
      place(m, 3.5, 6, 0);
      const before = snap(), flagsBefore = JSON.stringify(G.flags);
      interact(); const line = msgs();
      Engine.cam.dir = 0; Engine.cam.x = 4.2; Engine.cam.y = 9; clear(); settle(); interact(); const line2 = msgs();
      return { before, after: snap(), flagsBefore, flagsAfter: JSON.stringify(G.flags), line, line2, stateAfter: G.state };
    });
    assert.equal(info.line, 'Lyra Ashgrove, Cantor of Oakhaven \u00b7 Someone you could speak to.', 'Info on a story NPC: the name, nothing of their quests, greeting or tier');
    assert.equal(info.flagsBefore, info.flagsAfter, 'Info sets no flags');
    assert.equal(info.before.replace(/"state":"[^"]*"/, ''), info.after.replace(/"state":"[^"]*"/, ''), 'Info changes nothing: no flags, items, coin, bounty');
    assert(info.line2.length > 0 && !/crates_heard|cellar|spheres|Annet/i.test(info.line2), 'a prop that hides a secret says only its label: ' + info.line2);
    console.log('PASS Info: names and first lines only; hidden things are not there; nothing changes');

    // ---- rebinding: no conflicts
    const keys = await run(() => {
      const bound = Object.values(UPG.keybinds).map(String);
      return { bound, hasBracket: bound.includes(']') || bound.includes('[') };
    });
    // every key the game's play handlers use (read from game.js, party.js, travel.js, lighting.js, playtools.js)
    const used = 'w a s d q e f g h i j k l m n o p r t u v x y z b c tab shift capslock home enter escape space arrowup arrowdown arrowleft arrowright ` \\ ? 1 2 3 4 5 6 7 8 9 f1 f2 f3 f4 f5 f6 f7 f8 f9'.split(' ');
    assert(!used.includes(']') && !used.includes('['), 'the mode keys are on no key the game already uses');
    assert.equal(keys.hasBracket, false, 'no default rebindable action sits on ] or [');
    await run(() => { reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('grab'); UPG.keybinds.map = ']'; });
    await page.keyboard.press(']');
    assert.equal(await mode(), 'grab', 'if the player rebinds an action onto ], the rebinding wins and the mode key stays out of the way');
    await page.keyboard.press('[');
    assert.equal(await mode(), 'steal', 'the other mode key still works');
    await run(() => { UPG.keybinds.map = 'm'; });
    assert.equal(await run(() => [ORIGINS.keyTaken(']'), ORIGINS.keyTaken('x')].join()), 'false,false');
    console.log('PASS rebinding: the mode keys collide with no existing key or binding, and defer to a rebinding');

    // ---- the icon and the touch button at 640x400; the Options row fits
    await page.setViewportSize({ width: 640, height: 400 });
    await run(() => { reset(); ORIGINS.setEnabled(true); ORIGINS.setMode('talk'); const m = mkroom(); m.npc('harrow', 5, 6); place(m, 3.5, 6, 0); settle(); });
    await page.waitForTimeout(200);
    const ic = await run(() => { const r = document.getElementById('or-mode').getBoundingClientRect(), v = document.getElementById('view').getBoundingClientRect(); return { r: [r.left, r.top, r.right, r.bottom].map(Math.round), vx: v.left + v.width / 2, vy: v.top + v.height * 0.375, w: Math.round(r.width), live: document.getElementById('or-mode').classList.contains('or-live') }; });
    assert(ic.r[0] > ic.vx && ic.r[3] > ic.vy - 10 && ic.r[1] < ic.vy + 10, 'the icon sits just right of the crosshair ' + JSON.stringify(ic));
    assert(ic.r[2] < 640 && ic.r[3] < 300, 'and inside the view');
    assert.equal(ic.live, true, 'bright while something can be used');
    await shot(page, 'mode-talk-640.png');
    for (const md of ['steal', 'grab', 'info', 'talk']) { await run(md => ORIGINS.setMode(md), md); await run(() => settle()); await shot(page, `mode-${md}-640.png`); }
    await run(() => { setTouchMode(true); settle(); }); await page.waitForTimeout(250);
    const tb = await run(() => { const out = {}; for (const id of ['t-song', 't-run', 't-throw', 'or-t-mode', 't-use', 't-atk']) { const r = document.getElementById(id).getBoundingClientRect(); out[id] = [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; } return out; });
    for (const [id, r] of Object.entries(tb)) assert(r[0] >= 0 && r[2] <= 640 && r[1] >= 0 && r[3] <= 400, `${id} on screen at 640x400 ${r}`);
    const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    const ids = Object.keys(tb);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) assert(!overlap(tb[ids[i]], tb[ids[j]]), `touch buttons ${ids[i]} and ${ids[j]} do not overlap`);
    await shot(page, 'mode-touch-640.png');
    await run(() => { setTouchMode(false); G.opts.touch = 'auto'; clear(); G.state = 'panel'; renderAccessibilityMenu(); });
    const optFit = await page.locator('#modal-panel').evaluate(el => ({ h: el.scrollWidth <= el.clientWidth + 1 }));
    assert.equal(optFit.h, true, 'Graphics & access has no horizontal overflow with the new row');
    assert.equal(await page.locator('#or-modes-opt').evaluate(b => { b.scrollIntoView(); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), true, 'the row is reachable');
    await run(() => { closeModal(); G.state = 'play'; });
    await page.setViewportSize({ width: 1280, height: 800 });
    await run(() => settle()); await shot(page, 'mode-talk-1280.png');
    console.log('PASS the icon by the crosshair, the touch Mode button and the Options row fit at 640x400');

    // ---- cost: the per-frame wrapper is a handful of cheap checks
    const cost = await run(() => {
      reset(); const m = mkroom(); for (let i = 0; i < 12; i++) m.enemy('hound', 6 + (i % 4) * 2, 2 + Math.floor(i / 4) * 3); place(m, 3.5, 6, 0);
      const med = (fn) => { const ms = []; for (let k = 0; k < 301; k++) { const t0 = performance.now(); for (let j = 0; j < 20; j++) fn(); ms.push((performance.now() - t0) / 20); } ms.sort((a, b) => a - b); return ms[150]; };
      ORIGINS.setEnabled(false); const off = med(() => controlsTick());
      ORIGINS.setEnabled(true); ORIGINS.setMode('info'); const on = med(() => controlsTick());
      const frameOff = (ORIGINS.setEnabled(false), med(() => { advanceTime(16); })), frameOn = (ORIGINS.setEnabled(true), med(() => { advanceTime(16); }));
      ORIGINS.setEnabled(false);
      return { off, on, frameOff, frameOn };
    });
    console.log('INFO median controlsTick (12 enemies): off %s ms, on %s ms; whole frame off %s ms, on %s ms', cost.off.toFixed(4), cost.on.toFixed(4), cost.frameOff.toFixed(3), cost.frameOn.toFixed(3));
    assert(cost.on - cost.off < 0.25, 'the mode wrapper costs well under 1 ms a frame: ' + (cost.on - cost.off));

    // ================================================================= 3. load from file
    await run(() => { reset(); G.player.gold = 777; G.flags.origins_probe = 3; G.day = 4; G.journal.unshift({ cat: 'side', text: 'A line for the round trip.', day: 4 }); });
    const text = await run(async () => await saveCode());
    assert(text.startsWith('OCTZ1.') || text.startsWith('OCTJ1.'), 'a save code to work with');
    const good = path.join(TMP, 'good.txt'); fs.writeFileSync(good, text);
    const probe = () => run(() => JSON.stringify({ name: G.player.name, cls: G.player.cls.id, gold: G.player.gold, flags: Object.fromEntries(Object.entries(G.flags).filter(([k]) => !/^p7t_/.test(k) && k !== 'p12f_seen')),   // the play-clock counters tick on their own; p12f_seen marks a festival notice as shown on arrival
       day: G.day, map: G.mapId, hp: G.player.hp, journal: G.journal.map(j => j.text), inv: G.player.inv, state: G.state }));
    const before = await probe();
    const scramble = () => run(() => { G.player.gold = 1; delete G.flags.origins_probe; G.day = 0; G.journal.length = 0; G.player.inv.length = 0; G.state = 'play'; });
    // through the Save panel's download, then back in through the Load panel's file picker
    await run(() => { G.state = 'panel'; renderSave(); });
    await page.waitForSelector('#sv-dl');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#sv-dl').click()]);
    const dlPath = path.join(TMP, 'download.txt'); await dl.saveAs(dlPath);
    assert.match(dl.suggestedFilename(), /^octave-.*\.txt$/);
    const dlText = fs.readFileSync(dlPath, 'utf8').trim();
    assert(/^OCT[ZJ]1\./.test(dlText), 'the downloaded file holds a save code');
    // each export is encrypted afresh, so compare what the two codes say rather than their letters
    assert.equal(await run(async ([a, b]) => { const A = await decodeSave(a), B = await decodeSave(b); return A.player.gold === B.player.gold && A.day === B.day && A.flags.origins_probe === B.flags.origins_probe && A.player.name === B.player.name && A.mapId === B.mapId && JSON.stringify(A.journal) === JSON.stringify(B.journal); }, [dlText, text.trim()]), true, 'the downloaded file says the same as the code');
    await scramble();
    await run(() => { closeModal(); G.state = 'panel'; renderMenu(); });
    await page.locator('#mn-load').click();
    assert.equal(await page.locator('#or-file-btn').innerText(), 'Load from file…', 'the Load panel has Load from file…');
    assert.equal(await page.locator('#ld-file').getAttribute('accept'), '.txt,.octave,text/plain', 'accepts .txt and .octave');
    await shot(page, 'load-panel-1280.png');
    await page.locator('#ld-file').setInputFiles(dlPath);
    await page.waitForFunction(() => G.state === 'play' && G.player.gold === 777);
    assert.equal(await probe(), before.replace(/"state":"[^"]*"/, '"state":"play"'), 'download -> file -> load gives the same game');
    console.log('PASS round trip: Download file -> Load from file… -> the same game');

    // the button opens the picker (a real keyboard path), via a file chooser
    await scramble(); await run(() => { G.state = 'panel'; renderLoad(false); });
    const chooser = page.waitForEvent('filechooser');
    await page.locator('#or-file-btn').focus(); await page.keyboard.press('Enter');
    const fc = await chooser; assert.equal(fc.isMultiple(), false, 'one file');
    await fc.setFiles(good);
    await page.waitForFunction(() => G.state === 'play' && G.player.gold === 777);
    assert.equal(await probe(), before.replace(/"state":"[^"]*"/, '"state":"play"'), 'the keyboard reaches the picker and it loads');

    // from the title screen
    await scramble(); await run(() => { closeModal(); G.state = 'title'; show('#title'); });
    await page.locator('#btn-load').click();
    assert.equal(await run(() => G.openPanel), 'loadtitle');
    assert.equal(await page.locator('#or-file-btn').count(), 1, 'the title screen\'s load has it too');
    await page.locator('#ld-file').setInputFiles(good);
    await page.waitForFunction(() => G.state === 'play' && G.player.gold === 777);
    assert.equal(await run(() => document.getElementById('title').classList.contains('hidden')), true, 'the title screen is gone');
    console.log('PASS Load from file… from the title screen and by keyboard');

    // ---- drag and drop
    const drop = (fileText, name, extra) => run(([t, n, extra]) => {
      const dt = new DataTransfer(); dt.items.add(new File([t], n, { type: 'text/plain' }));
      if (extra) dt.items.add(new File(['x'], 'second.txt'));
      window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
      const over = new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }); window.dispatchEvent(over);
      const hot = document.getElementById('modal-panel').classList.contains('or-dropping');
      const d = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); window.dispatchEvent(d);
      return { prevented: over.defaultPrevented && d.defaultPrevented, hot, cold: !document.getElementById('modal-panel').classList.contains('or-dropping') };
    }, [fileText, name, extra]);
    await scramble(); await run(() => { closeModal(); G.state = 'panel'; renderLoad(false); });
    const dr = await drop(text, 'dropped.octave');
    assert.deepEqual(dr, { prevented: true, hot: true, cold: true }, 'a dragged file highlights the panel; the drop is taken, not navigated to');
    await page.waitForFunction(() => G.state === 'play' && G.player.gold === 777);
    assert.equal(await probe(), before.replace(/"state":"[^"]*"/, '"state":"play"'), 'a dropped file loads the same game');
    // not while the Load panel is closed
    await run(() => { clear(); });
    const closed = await run(() => { const dt = new DataTransfer(); dt.items.add(new File(['x'], 'a.txt')); const d = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }); window.dispatchEvent(d); return d.defaultPrevented; });
    assert.equal(closed, false, 'drops are ignored when no Load panel is open');
    // two files
    await scramble(); await run(() => { G.state = 'panel'; renderLoad(false); });
    await drop(text, 'one.txt', true);
    assert.equal(await page.locator('#ld-err').innerText(), 'Drop one save file at a time.');
    assert.equal(await run(() => G.player.gold), 1, 'nothing was loaded');
    console.log('PASS drag and drop onto the Load panel (one file; ignored elsewhere)');

    // ---- bad files: every one is refused with a line of text and changes nothing
    const refuse = async (label, file, expect) => {
      await run(() => { G.state = 'panel'; renderLoad(false); });
      const was = await run(() => JSON.stringify([G.player.gold, G.day, G.openPanel]));
      await page.locator('#ld-file').setInputFiles(file);
      await page.waitForFunction(() => /\S/.test(document.querySelector('#ld-err')?.textContent || ''), null, { timeout: 8000 });
      const msg = await page.locator('#ld-err').innerText();
      assert(expect.test(msg), `${label}: "${msg}" should match ${expect}`);
      assert.equal(await run(() => JSON.stringify([G.player.gold, G.day, G.openPanel])), was, `${label}: nothing changed`);
      return msg;
    };
    await scramble();
    const big = path.join(TMP, 'big.txt'); fs.writeFileSync(big, 'OCTZ1.' + 'A'.repeat(600 * 1024));
    await refuse('oversize', big, /too large to be a save.*512 KB/);
    const exactly = path.join(TMP, 'edge.txt'); fs.writeFileSync(exactly, 'OCTZ1.' + 'A'.repeat(512 * 1024 - 6));
    await refuse('exactly at the cap is read, then judged as a save', exactly, /did not read as a save/);
    const bin = path.join(TMP, 'bin.octave'); fs.writeFileSync(bin, Buffer.from(Array.from({ length: 4000 }, (_, i) => (i * 37 + 11) & 255)));
    await refuse('binary garbage', bin, /did not read as a save/);
    const empty = path.join(TMP, 'empty.txt'); fs.writeFileSync(empty, '');
    await refuse('empty', empty, /empty/);
    const ws = path.join(TMP, 'ws.txt'); fs.writeFileSync(ws, '  \n\t \n');
    await refuse('blank', ws, /empty/);
    const words = path.join(TMP, 'words.txt'); fs.writeFileSync(words, 'hello there, this is not a save');
    await refuse('plain words', words, /did not read as a save.*Not an Octave save/);
    const notsave = path.join(TMP, 'json.txt'); fs.writeFileSync(notsave, JSON.stringify({ hello: 'world', player: 1 }));
    await refuse('JSON that is not a save', notsave, /did not read as a save/);
    const trunc = path.join(TMP, 'trunc.txt'); fs.writeFileSync(trunc, text.slice(0, Math.floor(text.length / 2)));
    await refuse('a truncated code', trunc, /did not read as a save/);
    const badtag = path.join(TMP, 'tag.txt'); fs.writeFileSync(badtag, 'EVIL1.' + Buffer.from('{"v":1}').toString('base64'));
    await refuse('an unknown format tag', badtag, /did not read as a save.*Not an Octave save/);
    const evilName = path.join(TMP, 'evil.txt');
    const evilSave = await run(() => { const d = snapshotGame(); d.player.name = 'Eve<img src=x onerror="window.__pwn=1">'; d.journal = [{ cat: '<b>', text: '<img src=x onerror="window.__pwn=2">', day: 1 }]; d.mapName = '<script>window.__pwn=3</script>'; return JSON.stringify(d); });
    fs.writeFileSync(evilName, evilSave);
    await run(() => { G.state = 'panel'; renderLoad(false); });
    await page.locator('#ld-file').setInputFiles(evilName);
    await page.waitForFunction(() => (G.state === 'play' && /Eve/.test(G.player.name)) || /\S/.test(document.querySelector('#ld-err')?.textContent || ''), null, { timeout: 8000 }).catch(async (e) => { throw new Error('hostile file: ' + await run(() => JSON.stringify([G.state, G.player.name, G.openPanel, document.querySelector('#modal-panel')?.textContent.slice(0, 200)]))); });
    assert.equal(await page.locator('#ld-err').count() ? await page.locator('#ld-err').innerText() : '', '', 'the hostile file loads');
    const evil = await run(() => ({ name: G.player.name, imgs: document.querySelectorAll('img[src="x"]').length, pwn: window.__pwn || 0, journal: G.journal[0] && G.journal[0].text }));
    assert.deepEqual([evil.imgs, evil.pwn], [0, 0], 'a hostile save file executes nothing');
    assert(!/[<>"]/.test(evil.name) && !/[<>]/.test(evil.journal), 'and its text is cleaned by the normal import path: ' + JSON.stringify(evil));
    await run(() => { G.state = 'panel'; renderLoad(false); });
    // a hostile error message is shown as text
    const evilMsg = path.join(TMP, 'evilmsg.txt'); fs.writeFileSync(evilMsg, '{<img src=x onerror="window.__pwn=4">');
    await refuse('hostile broken JSON', evilMsg, /did not read as a save/);
    assert.equal(await run(() => [document.querySelectorAll('#ld-err img').length, window.__pwn || 0].join()), '0,0', 'its error is text');
    console.log('PASS bad files: oversize, binary, empty, plain words, wrong JSON, truncated, wrong tag, hostile names and messages; all refused or cleaned as text');

    // ---- hardcore rules are the existing ones
    await run(() => reset());
    const hcFile = path.join(TMP, 'hardcore.txt');
    const hcText = await run(() => { const d = snapshotGame(); d.player = Object.assign({}, d.player, { hardcore: true }); return JSON.stringify(d); });
    fs.writeFileSync(hcFile, hcText);
    await run(() => { G.state = 'panel'; renderLoad(false); });
    await page.locator('#ld-file').setInputFiles(hcFile);
    await page.waitForFunction(() => /\S/.test(document.querySelector('#ld-err').textContent));
    assert.match(await page.locator('#ld-err').innerText(), /hardcore run\. It only opens inside a hardcore run/, 'a hardcore file does not open in an ordinary game');
    // a hardcore code as a file
    const hcCode = await run(async () => { const d = snapshotGame(); d.player = Object.assign({}, d.player, { hardcore: true }); const json = JSON.stringify(d); return 'OCTJ1.' + b64(new TextEncoder().encode(json)); });
    const hcCodeFile = path.join(TMP, 'hc-code.txt'); fs.writeFileSync(hcCodeFile, hcCode);
    await run(() => { G.state = 'panel'; renderLoad(false); });
    await page.locator('#ld-file').setInputFiles(hcCodeFile);
    await page.waitForFunction(() => /\S/.test(document.querySelector('#ld-err').textContent));
    assert.match(await page.locator('#ld-err').innerText(), /hardcore run\. Hardcore runs never travel as codes/, 'nor does a hardcore code');
    // inside a hardcore run the panel offers no file at all, and a dropped one is refused untouched
    await run(() => { reset(); G.player.hardcore = true; HARDCORE.save = snapshotGame(); G.player.gold = 55; G.state = 'panel'; renderLoad(false); });
    assert.equal(await page.locator('#or-file-btn, #ld-file, #ld-code').count(), 0, 'a hardcore run\'s load panel has no file, no code box');
    const hd = await drop(text, 'ordinary.txt');
    assert.equal(hd.prevented, true);
    assert.equal(await page.locator('#ld-err').innerText(), 'Downloaded files cannot open a hardcore run.');
    assert.equal(await run(() => [G.player.gold, G.player.hardcore, G.state].join()), '55,true,panel', 'the hardcore run is untouched');
    await run(() => { G.player.hardcore = false; HARDCORE.save = null; closeModal(); G.state = 'play'; });
    // and an ordinary file refuses to open over a live hardcore run even if the panel somehow were reached
    await run(() => { reset(); G.player.hardcore = true; });
    const wrongWay = await run(async (t) => { const f = new File([t], 'o.txt'); try { restoreGame(await decodeSave(await f.text())); return 'opened'; } catch (e) { return e.message; } }, text);
    assert.match(wrongWay, /does not open ordinary saves/, 'the import path itself still refuses');
    await run(() => { G.player.hardcore = false; });
    console.log('PASS hardcore: files cannot cross either way, and a hardcore run\'s Load panel offers no file');

    // ---- 640x400 and the new note
    await page.setViewportSize({ width: 640, height: 400 });
    await run(() => { reset(); G.state = 'panel'; renderLoad(false); });
    const lf = await page.locator('#modal-panel').evaluate(el => ({ h: el.scrollWidth <= el.clientWidth + 1 }));
    assert.equal(lf.h, true, 'the Load panel has no horizontal overflow at 640x400');
    await page.locator('#or-drop-note').scrollIntoViewIfNeeded();
    await shot(page, 'load-panel-640.png');
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS the Load panel fits 640x400');

    // ================================================================= French: every new string has a line
    // The Commander merges tools/i18n/p10-origins.tsv into locales/story/fr.json; do the same merge here, in memory,
    // so the check does not depend on the order of merges.
    {
      const root = path.resolve(__dirname, '..');
      const { hash, norm } = require(path.join(root, 'tools', 'i18n', 'lib.js'));
      const cat = JSON.parse(fs.readFileSync(path.join(root, 'locales', 'story', 'fr.json'), 'utf8'));
      cat.s = cat.s || {}; cat.p = cat.p || [];
      for (const raw of fs.readFileSync(path.join(root, 'tools', 'i18n', 'p10-origins.tsv'), 'utf8').split('\n')) {
        if (!raw.trim() || raw.startsWith('#')) continue;
        const tab = raw.indexOf('\t'); assert(tab > 0, 'a tab in every line of the French file: ' + raw.slice(0, 60));
        const en = norm(raw.slice(0, tab)), fr = raw.slice(tab + 1).trim();
        if (/\{\d+/.test(en)) { const ph = (x) => (x.match(/\{\d+/g) || []).sort().join(); assert.equal(ph(en), ph(fr), 'placeholders agree: ' + en); const i = cat.p.findIndex(q => q[0] === en); if (i >= 0) cat.p[i][1] = fr; else cat.p.push([en, fr]); }
        else cat.s[hash(en)] = fr;
      }
      const pf = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const errsF = []; pf.on('pageerror', e => errsF.push(e.message));
      await pf.route('**/locales/story/fr.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(cat) }));
      await pf.goto(URL_);
      await pf.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && !document.querySelector('#loading')?.classList.contains('on') && typeof STORY_I18N === 'object');
      await pf.evaluate(async () => { await STORY_I18N.setLocale('fr'); });
      await pf.locator('#btn-new').click(); await pf.locator('#cname').fill('Pilgrim'); await pf.locator('#c-next').click();
      assert.equal(await pf.locator('#or-quiz-btn').innerText(), 'Répondre aux questions…');
      await pf.locator('#or-quiz-btn').click(); await pf.waitForTimeout(150);
      assert.match(await pf.locator('#create-panel h2').innerText(), /Questions · 1 sur 11/);
      const left = [];
      for (let q = 0; q < 11; q++) {
        left.push(...await pf.evaluate(() => STORY_I18N.untranslated(document.querySelector('#create-panel'))));
        const stem = await pf.locator('#or-stem').innerText();
        assert(!/\b(You|your|the)\b/.test(stem) && /vous|Vous/.test(stem), 'question ' + (q + 1) + ' reads in French: ' + stem);
        await pf.keyboard.press(String(1 + q % 3)); await pf.waitForTimeout(40);
      }
      await pf.waitForTimeout(150);
      left.push(...await pf.evaluate(() => STORY_I18N.untranslated(document.querySelector('#create-panel'))));
      for (const id of ['blade', 'cantor', 'corsair', 'archivist', 'penitent', 'quarry']) {
        await pf.evaluate(id => { ORIGINS.quiz.picks = ORIGINS.QUESTIONS.map(q => Math.max(0, q.a.findIndex(a => a.w[id] === 3))); ORIGINS.quiz.done = true; renderCreate(); }, id);
        await pf.waitForTimeout(60);
        left.push(...await pf.evaluate(() => STORY_I18N.untranslated(document.querySelector('#create-panel'))));
        assert.match(await pf.locator('#or-why').innerText(), /^(Vous|Votre)/, 'the verdict for ' + id + ' is in French');
      }
      assert.equal(await pf.locator('#or-accept').innerText(), 'Accepter cette vocation');
      assert.deepEqual(left, [], 'no English left on the picker\'s screens');
      // into a game, then the modes and the load panel
      await pf.evaluate(() => { ORIGINS.accept(); }); await pf.locator('#c-next').click();
      for (let i = 0; i < 20 && !(await pf.locator('#c-go').count()); i++) { const c = pf.locator('#create-panel .list button').first(); if (await c.count()) await c.click(); else await pf.locator('#create-panel button').filter({ hasText: /Continue|Continuer/ }).first().click(); }
      await pf.locator('#c-go').click(); await pf.locator('#btn-intro-skip').click(); await pf.waitForFunction(() => G.state === 'play');
      const lines = await pf.evaluate(() => {
        const out = {}; const last = () => { const m = document.querySelectorAll('#msgs .m'); return m.length ? m[m.length - 1].textContent : ''; };
        const m = new GameMap('oakhaven', 'Oakhaven', 20, 12, { floor: 't_flag', ceil: 't_stone', fogDist: 14, spawn: { x: 3.5, y: 6, dir: 0 } });
        m.border('t_stone'); G.maps.oakhaven = m; m.baseCount = 0; m.npc('harrow', 5, 6); m.item('honey', 4.2, 8); m.enemy('hound', 8, 10, { passive: true });
        loadMap('oakhaven', { x: 3.5, y: 6, dir: 0 }); G.state = 'play'; for (let i = 0; i < 3; i++) advanceTime(40); controlsTick();
        ORIGINS.setEnabled(true); ORIGINS.setMode('talk'); ORIGINS.cycle(1); out.cycle = last();
        ORIGINS.setMode('info'); interact(); out.npc = last();
        Engine.cam.x = 3.6; Engine.cam.y = 8; Engine.cam.dir = 0; for (let i = 0; i < 3; i++) advanceTime(40); controlsTick(); interact(); out.item = last();
        ORIGINS.setMode('talk'); Engine.cam.dir = -Math.PI / 2; for (let i = 0; i < 3; i++) advanceTime(40); controlsTick(); interact(); out.talk = last();
        ORIGINS.setMode('steal'); interact(); out.steal = last(); ORIGINS.setMode('grab'); Engine.cam.dir = 0; for (let i = 0; i < 3; i++) advanceTime(40); controlsTick();
        return out;
      });
      await pf.waitForTimeout(150);
      const shown = await pf.evaluate(() => Array.from(document.querySelectorAll('#msgs .m')).map(e => e.textContent));
      assert(shown.some(t => /^Mode d.interaction : /.test(t)), 'the cycling line is French: ' + JSON.stringify(shown));
      assert(shown.some(t => /Quelqu.un à qui vous pourriez parler\./.test(t) && !/Someone/.test(t)), 'Info on a person in French: ' + JSON.stringify(shown));
      assert(shown.some(t => /Pour la gorge\./.test(t)), 'Info on an item in French (first sentence from the catalogue): ' + JSON.stringify(shown));
      assert(shown.some(t => /Personne à qui parler ici\./.test(t)), 'the refusal in French: ' + JSON.stringify(shown));
      await pf.evaluate(() => { G.state = 'panel'; renderLoad(false); }); await pf.waitForTimeout(100);
      assert.equal(await pf.locator('#or-file-btn').innerText(), 'Charger depuis un fichier…');
      const noteLeft = await pf.evaluate(() => STORY_I18N.untranslated(document.querySelector('#modal-panel')));
      assert.deepEqual(noteLeft, [], 'the Load panel is all French');
      const big = path.join(TMP, 'big-fr.txt'); fs.writeFileSync(big, 'x'.repeat(600 * 1024));
      await pf.locator('#ld-file').setInputFiles(big); await pf.waitForTimeout(300);
      assert.match(await pf.locator('#ld-err').innerText(), /trop volumineux.*512 Ko/);
      await pf.evaluate(() => { ORIGINS.setEnabled(false); closeModal(); G.state = 'play'; });
      assert.deepEqual(errsF, [], 'no page errors in French');
      await pf.close();
      console.log('PASS French: every picker screen, the mode lines, Info on a person and an item, and the Load panel have no English left');
    }

    assert.deepEqual(errors, [], 'no browser runtime errors');
  } finally { await browser.close(); }

  // ================================================================= hosts that block localStorage
  const b2 = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const ctx = await b2.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      const boom = () => { throw new Error('localStorage is blocked on this host'); };
      Object.defineProperty(window, 'localStorage', { get: boom, configurable: true });
      Object.defineProperty(window, 'sessionStorage', { get: boom, configurable: true });
    });
    const p2 = await ctx.newPage();
    const errs2 = [];
    p2.on('pageerror', e => errs2.push(e.message));
    await boot(p2);
    const code = await p2.evaluate(async () => { G.player.gold = 321; return await saveCode(); });
    const f = path.join(TMP, 'blocked.txt'); fs.writeFileSync(f, code);
    await p2.evaluate(() => { G.player.gold = 5; G.state = 'panel'; renderLoad(false); });
    await p2.locator('#ld-file').setInputFiles(f);
    await p2.waitForFunction(() => G.state === 'play' && G.player.gold === 321);
    // the mode switch still works with no storage (it just does not persist)
    await p2.evaluate(() => { ORIGINS.setEnabled(true); });
    await p2.keyboard.press(']');
    assert.equal(await p2.evaluate(() => ORIGINS.cfg.mode), 'info', 'modes work with storage blocked');
    assert.deepEqual(errs2.filter(e => !/localStorage is blocked/.test(e)), [], 'no unexpected page errors with storage blocked');
    console.log('PASS with localStorage blocked: load from file and the modes still work');
  } finally { await b2.close(); }
  console.log('ALL PASS origins');
})().catch(e => { console.error(e); process.exitCode = 1; });
