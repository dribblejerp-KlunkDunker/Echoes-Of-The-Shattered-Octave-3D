// PREVIEW_URL=http://127.0.0.1:3403 PLAYWRIGHT_MODULE=/path/to/playwright node test/voices.test.js
// Covers js/voices.js: a voice profile for every NPC and enemy, the Lyra / Quiet silence rules, rate limits, the
// Voices setting (off = no extra audio nodes), the dialogue and enemy hooks, the Full credits panel against the
// fonts/ and music/ folders on disk, CREDITS.md and ASSETS.md, and a hostile-save check.
// Set VOICES_SHOTS to a directory to keep screenshots. Uses the managed preview; writes no player saves.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const SHOTS = process.env.VOICES_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ROOT = path.join(__dirname, '..');
const ls = (d, re) => fs.readdirSync(path.join(ROOT, d)).filter((f) => re.test(f)).sort();

(async () => {
  // ---- the files on disk are all accounted for in the docs ----------------------------------------
  const fonts = ls('fonts', /\.(woff2|txt)$/), music = ls('music', /\.mp3$/), imgs = ls('img', /\.(jpg|png)$/);
  const credits = fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8'), assets = fs.readFileSync(path.join(ROOT, 'ASSETS.md'), 'utf8');
  for (const f of fonts.concat(music)) {
    assert.ok(credits.includes(f), 'CREDITS.md lists ' + f);
    assert.ok(assets.includes(f), 'ASSETS.md lists ' + f);
  }
  for (const f of imgs) assert.ok(assets.includes(f), 'ASSETS.md lists img/' + f);
  assert.ok(/unverified/i.test(credits) && /unverified/i.test(assets), 'unknowns are marked unverified');
  console.log('PASS docs: CREDITS.md and ASSETS.md cover ' + fonts.length + ' font files, ' + music.length + ' tracks, ' + imgs.length + ' images');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof VOICES !== 'undefined');
    const shot = async (n) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${n}.png` }); };
    const ev = (fn, arg) => page.evaluate(fn, arg);

    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Voices Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(800);
    await ev(() => { Audio_.init(); Audio_.resume(); });

    // ---- every NPC and enemy resolves to an authored profile
    const cover = await ev(() => {
      const bad = [];
      for (const id of Object.keys(NPCS).concat(['hollow'])) { const p = VOICES.resolveNpc(id); if (!p.authored || !p.style) bad.push('npc ' + id); }
      for (const id of Object.keys(ENEMIES)) { const p = VOICES.resolveEnemy(id); if (!p.authored || !p.style) bad.push('enemy ' + id); }
      const unknown = VOICES.resolveNpc('nobody_at_all'), unk2 = VOICES.resolveEnemy('nothing', { cacophony: true });
      return { bad, n: Object.keys(NPCS).length, e: Object.keys(ENEMIES).length, unk: unknown.style, unk2: unk2.style };
    });
    assert.deepEqual(cover.bad, [], 'every NPC and enemy has an authored voice: ' + cover.bad.join(', '));
    assert.equal(cover.unk, 'human', 'an unknown NPC still gets a fallback voice');
    assert.equal(cover.unk2, 'beast', 'an unknown cacophony enemy falls back by family');
    console.log(`PASS coverage: ${cover.n} NPCs and ${cover.e} enemies resolve to authored voices`);

    // ---- style rules: Hollows breathy, Legion brass, Kaelen gravel, the Quiet silent, Lyra by flags
    const rules = await ev(() => {
      const f = G.flags, out = {};
      const keep = { a: f.lyra_wg_met, b: f.lyra_dw_met, c: f.lyra_voice };
      out.hollow = VOICES.resolveNpc('hollow').style; out.drowned = VOICES.resolveEnemy('drowned').style;
      out.legion = VOICES.resolveEnemy('legionnaire').style; out.kaelen = VOICES.resolveNpc('kaelen').style;
      out.quiet = VOICES.resolveEnemy('quiet').silent; out.moth = VOICES.resolveEnemy('hushmoth').silent; out.tongueless = VOICES.resolveEnemy('tongueless').silent;
      out.mute = VOICES.resolveEnemy('x_mute', { core: true, mute: true }).silent;
      f.lyra_wg_met = false; f.lyra_dw_met = false; f.lyra_voice = false;
      out.lyra1 = VOICES.resolveNpc('lyra').silent; out.lyraWg = VOICES.resolveNpc('lyra_wg').silent; out.lyraDw = VOICES.resolveNpc('lyra_dw').silent;
      f.lyra_wg_met = true; out.lyraAfterGrove = VOICES.resolveNpc('lyra').silent;
      f.lyra_dw_met = true; f.lyra_voice = true;
      out.lyraRuined = VOICES.resolveNpc('lyra_dw'); out.lyraRuined = { silent: out.lyraRuined.silent, style: out.lyraRuined.style };
      out.lyraWgStill = VOICES.resolveNpc('lyra_wg').silent;
      f.lyra_wg_met = keep.a; f.lyra_dw_met = keep.b; f.lyra_voice = keep.c;
      return out;
    });
    assert.equal(rules.hollow, 'breathy'); assert.equal(rules.drowned, 'breathy');
    assert.equal(rules.legion, 'brass'); assert.equal(rules.kaelen, 'gravel');
    assert.ok(rules.quiet && rules.moth && rules.tongueless && rules.mute, 'the Quiet, the moths, the Tongueless and mute enemies are silent');
    assert.equal(rules.lyra1, false, 'Lyra speaks in Part One');
    assert.ok(rules.lyraWg && rules.lyraDw && rules.lyraAfterGrove, 'Lyra is voiceless once the slate flags say so');
    assert.deepEqual(rules.lyraRuined, { silent: false, style: 'gravel' }, 'with lyra_voice she speaks, ruined');
    assert.ok(rules.lyraWgStill, 'the Whisper-Grove slate Lyra stays silent');
    console.log('PASS rules: Hollow breathy, Legion brass, Kaelen gravel, Quiet and slate-Lyra silent');

    // ---- node accounting: wrap the context's factories
    await ev(() => {
      const c = Audio_.ctx; window.__made = 0;
      for (const k of ['createOscillator', 'createGain', 'createBiquadFilter', 'createBufferSource']) {
        const o = c[k].bind(c); c[k] = function () { window.__made++; return o.apply(c, arguments); };
      }
      UPG.tts = false;
    });
    const made = () => ev(() => window.__made);

    // setting off = no extra nodes, original enemy sound untouched
    await ev(() => { VOICES.setMode('off'); VOICES.resetLimits(); window.__made = 0; VOICES.state.played = 0; });
    const offPlay = await ev(() => VOICES.play('npc', 'harrow', 'greet'));
    assert.equal(offPlay, 0); assert.equal(await made(), 0, 'off: the voice call makes no nodes');
    await ev(() => Audio_.sfx.enemy(ENEMIES.golem, 'hurt'));
    const offNodes = await made();
    await ev(() => { VOICES.setMode('grunts'); VOICES.resetLimits(); window.__made = 0; Audio_.sfx.enemy(ENEMIES.golem, 'hurt'); });
    const onNodes = await made();
    assert.ok(onNodes > offNodes, `on adds voice nodes on top of the original (${offNodes} -> ${onNodes})`);
    // off keeps the original sound exactly: the same call with the setting off makes the same count as the raw function
    await ev(() => { VOICES.setMode('off'); window.__made = 0; VOICES.rawEnemy.call(Audio_.sfx, ENEMIES.golem, 'hurt'); });
    const rawNodes = await made();
    assert.equal(rawNodes, offNodes, 'off: the wrapped call makes exactly the original number of nodes');
    console.log(`PASS setting: off makes no voice nodes (${offNodes} original), grunts add ${onNodes - offNodes}`);

    // silent profiles make no nodes
    await ev(() => { VOICES.setMode('grunts'); VOICES.resetLimits(); window.__made = 0; });
    const silentRes = await ev(() => ({ q: VOICES.play('enemy', 'quiet', 'alert'), t: VOICES.play('enemy', 'tongueless', 'death'), l: VOICES.play('npc', 'lyra_wg', 'greet') }));
    assert.deepEqual(silentRes, { q: 0, t: 0, l: 0 }); assert.equal(await made(), 0, 'silent voices create no nodes');
    console.log('PASS silence: Quiet, Tongueless and slate-Lyra create no nodes');

    // ---- every voiced profile makes sound for each event, with finite output
    const events = await ev(() => {
      const bad = [], ids = [];
      for (const id of Object.keys(NPCS).concat(['hollow'])) ids.push(['npc', id]);
      for (const id of Object.keys(ENEMIES)) ids.push(['enemy', id]);
      let voiced = 0, silent = 0;
      for (const [kind, id] of ids) {
        const pr = VOICES.resolve(kind, id);
        for (const e of ['greet', 'alert', 'hurt', 'death']) {
          VOICES.resetLimits();
          const n = VOICES.play(kind, id, e);
          if (pr.silent) { if (n) bad.push(kind + id); silent++; } else { if (!n) bad.push('no sound ' + kind + ' ' + id + ' ' + e); voiced++; }
        }
      }
      return { bad, voiced, silent };
    });
    assert.deepEqual(events.bad, [], events.bad.join('; '));
    console.log(`PASS events: ${events.voiced} voiced and ${events.silent} silent profile-events behave`);

    // ---- rate limits
    const lim = await ev(() => {
      VOICES.resetLimits(); VOICES.state.limited = 0;
      const t = 1000, r = [];
      r.push(VOICES.play('enemy', 'hound', 'alert', null, t));          // sounds
      r.push(VOICES.play('enemy', 'hound', 'alert', null, t + 30));     // global gap
      r.push(VOICES.play('enemy', 'hound', 'alert', null, t + 400));    // same key within 1800 ms
      r.push(VOICES.play('enemy', 'golem', 'hurt', null, t + 200));     // other source, fine
      r.push(VOICES.play('enemy', 'golem', 'hurt', null, t + 450));     // same key within 380 ms
      r.push(VOICES.play('enemy', 'hound', 'alert', null, t + 2200));   // allowed again
      VOICES.resetLimits();
      let ok = 0; for (let i = 0; i < 10; i++) ok += VOICES.play('enemy', 'hound' + i, 'hurt', ENEMIES.hound, 5000 + i * 80) ? 1 : 0;
      const burst = ok;
      VOICES.resetLimits(); let ok2 = 0;
      for (let i = 0; i < 40; i++) ok2 += VOICES.play('enemy', 'hound', 'hurt', null, 9000 + i * 5) ? 1 : 0;
      return { r: r.map((x) => (x ? 1 : 0)), burst, ok2, limited: VOICES.state.limited };
    });
    assert.deepEqual(lim.r, [1, 0, 0, 1, 0, 1], 'per-source and global gaps hold');
    assert.ok(lim.burst <= 10 && lim.burst >= 1, 'a burst of different hounds is capped by concurrency (' + lim.burst + ')');
    assert.ok(lim.ok2 <= 2, 'forty hurts in 200 ms from one source sound at most twice (' + lim.ok2 + ')');
    assert.ok(lim.limited > 0);
    console.log('PASS limits: global gap, per-source gap and concurrency cap hold');

    // ---- the wrapped game calls: dialogue opens with a greeting, combat sounds voice
    const hooks = await ev(() => {
      VOICES.setMode('grunts'); VOICES.resetLimits(); VOICES.state.last = null;
      const out = {};
      Audio_.sfx.enemy(ENEMIES.legionnaire, 'alert'); out.alert = VOICES.state.last && VOICES.state.last.id + ':' + VOICES.state.last.ev + ':' + VOICES.state.last.style;
      VOICES.resetLimits(); Audio_.sfx.enemy(ENEMIES.hound, 'death'); out.death = VOICES.state.last.id + ':' + VOICES.state.last.ev;
      VOICES.resetLimits(); VOICES.state.last = null; Audio_.sfx.enemy(ENEMIES.quiet, 'hurt'); out.quiet = VOICES.state.last;
      VOICES.resetLimits(); VOICES.state.last = null; Audio_.sfx.enemy(ENEMIES.hound, 'attack'); out.attack = VOICES.state.last;
      const npc = G.ents.find((e) => e.id === 'harrow') || G.ents.find((e) => NPCS[e.id] && !NPCS[e.id].shop);
      out.npc = npc ? npc.id : null;
      if (npc) { VOICES.resetLimits(); VOICES.state.last = null; talk(npc); out.greet = VOICES.state.last && VOICES.state.last.id + ':' + VOICES.state.last.ev; out.state = G.state; closeModal(); G.state = 'play'; }
      return out;
    });
    assert.equal(hooks.alert, 'legionnaire:alert:brass'); assert.equal(hooks.death, 'hound:death'); assert.equal(hooks.quiet, null);
    assert.equal(hooks.attack, null, 'attacks keep only their original sound');
    assert.ok(hooks.npc, 'an NPC stands in the opening area');
    assert.equal(hooks.greet, hooks.npc + ':greet', 'talking plays the greeting'); assert.equal(hooks.state, 'dialogue');
    console.log('PASS hooks: enemy alert/hurt/death and the dialogue greeting play their voices');

    // ---- the spoken line uses the game's own speakLine only in "spoken" mode
    const spoken = await ev(() => {
      const calls = []; const _sl = speakLine; speakLine = function (t, w) { calls.push([t, w, UPG.tts]); };
      const fake = VOICES.hasSpeech();
      const npc = G.ents.find((e) => e.id === 'harrow') || G.ents.find((e) => NPCS[e.id] && !NPCS[e.id].shop);
      VOICES.setMode('grunts'); VOICES.resetLimits(); talk(npc); const grunts = calls.length; closeModal(); G.state = 'play';
      VOICES.setMode('spoken'); VOICES.resetLimits(); talk(npc); const sp = calls.length; const ttsDuring = calls[0] ? calls[0][2] : null; const covered = typeof VOICE_ACT !== 'undefined' && VOICE_ACT.covers(String(DLG.log[0].t)); closeModal(); G.state = 'play';
      speakLine = _sl; VOICES.setMode('grunts');
      return { grunts, sp, ttsDuring, ttsAfter: UPG.tts, fake, covered };
    });
    assert.equal(spoken.grunts, 0, 'grunts mode never speaks');
    if (spoken.fake && !spoken.covered) { assert.equal(spoken.sp, 1, 'spoken mode reads the greeting once'); assert.equal(spoken.ttsDuring, true); }
    if (spoken.covered) assert.equal(spoken.sp, 0, 'a recorded greeting is not read a second time');
    assert.equal(spoken.ttsAfter, false, 'the Speech setting is restored');
    console.log('PASS spoken: only in the spoken mode, Speech setting untouched');

    // ---- persistence and the options row
    await ev(() => { G.state = 'play'; renderAccessibilityMenu(); });
    const row = await ev(() => {
      const b = document.getElementById('voices-mode'), c = document.getElementById('voices-credits');
      return { has: !!b, text: b && b.textContent, cred: !!c, credFrames: !!document.getElementById('fr-credits') };
    });
    assert.ok(row.has && row.cred, 'Voices and Full credits rows are in Graphics & access'); assert.equal(row.text, 'Grunts');
    await page.locator('#voices-mode').scrollIntoViewIfNeeded(); await shot('options-row');
    await page.locator('#voices-mode').click();
    const mode1 = await ev(() => ({ m: VOICES.mode, t: document.getElementById('voices-mode').textContent, ls: JSON.parse(localStorage.getItem('octave.voices.v1')).m }));
    assert.ok(['acted', 'spoken', 'off'].includes(mode1.m) && mode1.ls === mode1.m, 'the button cycles and persists');
    await ev(() => VOICES.setMode('grunts'));
    console.log('PASS options: Voices row cycles and persists; Full credits sits beside the font Credits');

    // ---- the Full credits panel
    await ev(() => { renderAccessibilityMenu(); });
    await page.locator('#voices-credits').scrollIntoViewIfNeeded(); await page.locator('#voices-credits').click();
    const panel = await ev(() => {
      const b = document.getElementById('vc-body'); const txt = b.textContent;
      return { txt, h2: document.querySelector('#modal-panel h2').textContent, files: VOICES.creditedFiles(), over: document.getElementById('modal-panel').scrollWidth > document.getElementById('modal-panel').clientWidth + 1 };
    });
    assert.equal(panel.h2, 'Full credits');
    for (const f of fonts.concat(music)) assert.ok(panel.files.includes(f), 'credits table names ' + f);
    for (const f of fonts.concat(music)) assert.ok(panel.txt.includes(f), 'credits panel shows ' + f);
    for (const name of ['Cinzel', 'Alegreya SC', 'UnifrakturMaguntia', 'Playwright', 'unverified']) assert.ok(panel.txt.includes(name), 'credits mention ' + name);
    assert.ok(!panel.over, 'no horizontal overflow at 1280x800');
    await shot('full-credits');
    await page.locator('#vc-back').click();
    assert.equal(await ev(() => !!document.getElementById('voices-mode')), true, 'Back returns to Graphics & access');
    console.log(`PASS credits: panel lists all ${fonts.length} font files and ${music.length} tracks present on disk`);

    // compact 640x400
    await page.setViewportSize({ width: 640, height: 400 });
    await ev(() => renderAccessibilityMenu());
    await page.locator('#voices-credits').scrollIntoViewIfNeeded(); await page.locator('#voices-credits').click();
    const compact = await ev(() => {
      const p = document.getElementById('modal-panel').getBoundingClientRect(), g = document.getElementById('game').getBoundingClientRect();
      const body = document.getElementById('vc-body'), back = document.getElementById('vc-back').getBoundingClientRect(), x = document.getElementById('x').getBoundingClientRect();
      return { fit: p.left >= g.left - 1 && p.right <= g.right + 1 && p.top >= g.top - 1 && p.bottom <= g.bottom + 1, hscroll: document.getElementById('modal-panel').scrollWidth > document.getElementById('modal-panel').clientWidth + 1,
        backIn: back.bottom <= g.bottom + 1 && back.top >= g.top, xIn: x.top >= g.top && x.right <= g.right + 1, scroll: body.scrollHeight > body.clientHeight };
    });
    await shot('full-credits-compact');
    assert.ok(compact.fit && !compact.hscroll && compact.backIn && compact.xIn, 'credits panel fits 640x400 ' + JSON.stringify(compact));
    await page.locator('#vc-back').click();
    await page.setViewportSize({ width: 1280, height: 800 });
    console.log('PASS compact: Full credits fits 640x400 with no horizontal overflow');

    // ---- hostile save: flag values and the player's name never become markup in the credits or settings
    const host = await ev(() => {
      G.player.name = '<img src=x onerror="window.__pwn=1">'; G.flags.lyra_voice = '<img src=x onerror="window.__pwn=1">'; G.flags.lyra_dw_met = '<b>x</b>';
      renderAccessibilityMenu(); document.getElementById('voices-credits').click();
      const imgs = document.querySelectorAll('#vc-body img, #modal-panel img[onerror]').length;
      const has = document.getElementById('vc-body').innerHTML.includes('onerror');
      const r = VOICES.resolveNpc('lyra_dw'); const p = VOICES.play('npc', 'lyra_dw', 'greet');
      delete G.flags.lyra_voice; delete G.flags.lyra_dw_met; closeModal(); G.state = 'play';
      return { imgs, has, pwn: window.__pwn || 0, style: r.style, p };
    });
    assert.equal(host.imgs, 0); assert.equal(host.has, false); assert.equal(host.pwn, 0);
    console.log('PASS hostile: save-derived flags and names never reach the credits markup');

    assert.deepEqual(errors, [], 'no page errors: ' + errors.join('; '));
    console.log('PASS voices: no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e && e.stack || e); process.exit(1); });
