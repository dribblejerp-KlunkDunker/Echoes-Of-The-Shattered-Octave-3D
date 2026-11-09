// PREVIEW_URL=http://127.0.0.1:3000 PLAYWRIGHT_MODULE=/path/to/playwright node test/voice-acting.test.js
// Covers js/voice-acting.js and the recorded lines in voices/: the manifest matches the files and the script, every
// spoken line in the script is game text or marked PROPOSED, silent characters have no lines, greetings play the
// recorded line for the greeting shown, speaking enemies bark, bosses say their intro once a visit, boss mimicry
// plays from its message, Grunts/Off modes never play a recording, and "read aloud" does not repeat a recorded line.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');

(async () => {
  // ---- files: manifest <-> mp3s <-> script ------------------------------------------------------------
  const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/voice-lines.js'), 'utf8') + ';this.L=VOICE_LINES;', ctx);
  const L = ctx.L, ids = Object.keys(L);
  const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'voices/script.json'), 'utf8'));
  assert.ok(ids.length >= 100, 'at least 100 recorded lines (' + ids.length + ')');
  let bytes = 0;
  for (const id of ids) {
    const f = path.join(ROOT, L[id].src);
    assert.ok(fs.existsSync(f), 'file for ' + id); bytes += fs.statSync(f).size;
    assert.ok(L[id].d > 0.2 && L[id].d < 20, id + ' has a sane duration ' + L[id].d);
  }
  const onDisk = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.mp3')) onDisk.push(path.relative(ROOT, p)); } })(path.join(ROOT, 'voices'));
  const srcs = new Set(ids.map((i) => L[i].src));
  assert.deepEqual(onDisk.filter((p) => !srcs.has(p.split(path.sep).join('/'))), [], 'no stray recordings outside the manifest');
  const byId = Object.fromEntries(script.lines.map((l) => [l.id, l]));
  for (const id of ids) {
    const own = byId[id], parent = byId[id.replace(/\.[^.]+$/, '')];
    if (own && own.segments && /\{/.test(own.text)) assert.equal(L[id].t, own.segments.join(' '), 'a templated line keeps only its fixed words: ' + id);
    else if (own) assert.equal(L[id].t, own.text, 'manifest text matches the script for ' + id);
    else assert.ok(parent && parent.names && parent.names.includes(L[id].t), id + ' is one name of a templated line');
  }
  for (const l of script.lines) if (l.text && !l.signed && !['player', 'player_kin'].includes(l.voiceOf) && !(/\{/.test(l.text) && !(l.segments || []).length) && !l.names) assert.ok(L[l.id], 'every speakable script line is recorded: ' + l.id);
  const SILENT = ['quiet', 'hushmoth', 'tongueless', 'hushwarden', 'cat'];
  for (const l of script.lines) {
    assert.ok(!SILENT.includes(l.speaker), 'a silent character has no line: ' + l.id);
    assert.ok(l.source === 'PROPOSED' || /\.js\b/.test(l.source), l.id + ' names its source');
  }
  const kinds = {}; for (const id of ids) kinds[L[id].kind] = (kinds[L[id].kind] || 0) + 1;
  console.log('PASS files: ' + ids.length + ' lines, ' + (bytes / 1048576).toFixed(1) + ' MB, kinds ' + JSON.stringify(kinds));

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof VOICE_ACT !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Voice Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const c = page.locator('#create-panel .list button').first();
      if (await c.count()) await c.click(); else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click(); await page.waitForTimeout(300);

    const r = await page.evaluate(async () => {
      const check = (ok, label) => { if (!ok) throw new Error(label); };
      const out = {};
      Audio_.init(); Audio_.resume(); if (Audio_.muted && Audio_.toggleMute) Audio_.toggleMute();
      check(VOICES.mode === 'acted', 'Voiced is the default (' + VOICES.mode + ')');
      const played = []; const _pl = VOICE_ACT.playLine, _q = NPCS.harrow.quest;
      // record what would play, and still decode it to prove the file is real audio
      VOICE_ACT.playLine = function (l, o) { played.push(l.id); return _pl.call(this, l, o); };
      try {
        // 1. greetings: Harrow, at each tone the game can pick
        const harrow = { id: 'harrow', x: Engine.cam.x + 1, y: Engine.cam.y, kind: 'npc' };
        NPCS.harrow.quest = () => null;   // the plain greeting, not a quest opening
        for (const tone of ['polite', 'normal', 'blunt']) {
          VOICES.resetLimits(); DLG.tone = tone; played.length = 0;
          talk(harrow);
          const id = played[0];
          check(id && VOICE_ACT.LINES[id].speaker === 'harrow' && VOICE_ACT.LINES[id].kind === 'greet', tone + ': Harrow greets with his recorded line (' + id + ')');
          check(VOICE_ACT.covers(DLG.log[0].t), tone + ': read-aloud would skip the recorded greeting');
          closeModal(); G.state = 'play';
        }
        const buf = await VOICE_ACT.preload(played[0] || Object.keys(VOICE_ACT.LINES)[0]);
        check(buf && buf.duration > 0.2, 'a recording decodes to audio (' + (buf && buf.duration) + ' s)');
        out.decoded = +buf.duration.toFixed(2);

        // 2. speaking enemies bark; silent ones and beasts never play a recording
        VOICES.resetLimits(); played.length = 0;
        VOICES.play('enemy', 'proctor', 'alert', ENEMIES.proctor);
        check(played.length === 1 && VOICE_ACT.LINES[played[0]].speaker === 'proctor', 'a Proctor barks a recorded line (' + played[0] + ')');
        for (const q of ['quiet', 'tongueless', 'hushwarden', 'hushmoth', 'hound', 'golem']) {
          VOICES.resetLimits(); played.length = 0; VOICES.play('enemy', q, 'alert', ENEMIES[q]);
          check(played.length === 0, q + ' plays no recording');
        }
        // 3. a boss's intro once per visit, then ordinary barks
        const boss = Object.values(VOICE_ACT.LINES).find((l) => l.kind === 'intro');
        if (boss) {
          VOICES.resetLimits(); played.length = 0; VOICES.play('enemy', boss.speaker, 'alert', ENEMIES[boss.speaker]);
          check(played.length === 1 && VOICE_ACT.LINES[played[0]].kind === 'intro', boss.speaker + ' opens with its intro');
          VOICES.resetLimits(); played.length = 0; VOICES.play('enemy', boss.speaker, 'alert', ENEMIES[boss.speaker]);
          check(!played.length || VOICE_ACT.LINES[played[0]].kind !== 'intro', 'the intro does not repeat in one visit');
          out.boss = boss.speaker;
        }
        // 4. boss mimicry plays from its message
        const mim = Object.keys(VOICE_ACT.LINES).find((id) => VOICE_ACT.LINES[id].kind === 'mimic');
        if (mim) {
          played.length = 0; msg('The Weaver speaks. "' + VOICE_ACT.LINES[mim].t + '"', 'voice', 4000);
          check(played[0] === mim, 'a mimic message plays its recording (' + played[0] + ' / ' + mim + ')');
        }
        // 5. Lyra without a voice says nothing recorded
        G.flags.lyra_wg_met = true; delete G.flags.lyra_voice;
        VOICES.resetLimits(); played.length = 0; DLG.tone = 'polite';
        talk({ id: 'lyra_wg', x: Engine.cam.x + 1, y: Engine.cam.y, kind: 'npc' });
        check(played.length === 0, 'voiceless Lyra plays no recording'); closeModal(); G.state = 'play';
        delete G.flags.lyra_wg_met;
        // 6. Grunts and Off never play recordings
        for (const m of ['grunts', 'off']) {
          VOICES.setMode(m); VOICES.resetLimits(); played.length = 0; DLG.tone = 'polite';
          talk(harrow); closeModal(); G.state = 'play';
          VOICES.resetLimits(); VOICES.play('enemy', 'proctor', 'alert', ENEMIES.proctor);
          check(played.length === 0, m + ': no recordings');
        }
        VOICES.setMode('acted');
        // 7. nothing saved
        check(!Object.keys(G.flags).some((k) => /voice/i.test(k)), 'no voice state in the save');
      } finally { VOICE_ACT.playLine = _pl; NPCS.harrow.quest = _q; }
      return out;
    });
    console.log('PASS in game: greetings by tone, barks, boss intro, mimicry, silence, modes ' + JSON.stringify(r));
    assert.deepEqual(errors, [], 'no page errors: ' + errors.join(' | '));
    console.log('PASS no page errors');
  } finally { await browser.close(); }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
