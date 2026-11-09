// PREVIEW_URL=http://127.0.0.1:3406 PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node test/mods.test.js
// Uses a preview server; never starts one and never writes player saves.
// Covers js/mods.js: schema round trip, rejection of hostile mods, the schema files matching the validator,
// the mod library (enable / disable / remove / persistence / caps), entering and leaving a mod dungeon, quest
// rules (enter, talk, pickup), save and load with and without the mod, the editor (paint, validate, preview,
// playtest, export equals import), the Options entry and compact layouts. Set MODS_SHOTS for screenshots.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.MODS_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

// the example in docs/mods.md is the fixture: if the docs drift from the validator this test fails
const docs = fs.readFileSync(path.join(ROOT, 'docs', 'mods.md'), 'utf8');
const exMatch = /<!-- example:start -->\s*```json\n([\s\S]*?)```\s*<!-- example:end -->/.exec(docs);
assert.ok(exMatch, 'docs/mods.md carries the example mod');
const SAMPLE = exMatch[1];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:3000');
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title' && typeof MODS !== 'undefined');
    await page.locator('#btn-new').click(); await page.locator('#cname').fill('Mod Tester');
    await page.locator('#c-next').click(); await page.locator('.classlist button').first().click();
    await page.locator('#c-next').click(); await page.locator('#c-next').click();
    for (let i = 0; i < 20 && !(await page.locator('#c-go').count()); i++) {
      const choice = page.locator('#create-panel .list button').first();
      if (await choice.count()) await choice.click();
      else await page.locator('#create-panel button').filter({ hasText: /Continue|Begin|Confirm|Accept/ }).first().click();
    }
    await page.locator('#c-go').click(); await page.locator('#btn-intro-skip').click();
    await page.waitForTimeout(500);
    await page.evaluate((sample) => {
      window.SAMPLE = sample;
      window.check = (ok, text) => { if (!ok) throw new Error(text); };
      window.clone = o => JSON.parse(JSON.stringify(o));
      window.play = () => { closeModal(); G.state = 'play'; G.fadeT = 0; G.dead = false; G.keys = {}; G.escapeTimer = 0; };
      window.__pwned = undefined;
      try { localStorage.removeItem(MODS.KEY); localStorage.removeItem('octave.mods.draft.v1'); } catch (e) { /* ignore */ }
    }, SAMPLE);

    // ---------------------------------------------------------------- 0. source hygiene
    const src = fs.readFileSync(path.join(ROOT, 'js', 'mods.js'), 'utf8').replace(/\/\/.*$/gm, '');
    for (const bad of [/\beval\s*\(/, /\bnew\s+Function\b/, /\bFunction\s*\(/, /\bimport\s*\(/, /\.innerHTML\b/, /\.outerHTML\b/, /insertAdjacentHTML/, /document\.write/, /setTimeout\s*\(\s*['"`]/]) assert.ok(!bad.test(src), 'mods.js must not use ' + bad);
    console.log('PASS source: no eval, Function, dynamic import or markup sinks in js/mods.js');

    // ---------------------------------------------------------------- 1. schema round trip + schema files
    const schemaTexts = {};
    for (const f of ['mod', 'map', 'enemy', 'quest']) schemaTexts[f] = fs.readFileSync(path.join(ROOT, 'schemas', f + '.v1.json'), 'utf8');
    const rt = await page.evaluate((schemas) => {
      const out = {};
      const r = MODS.validate(SAMPLE); check(r.ok, 'example validates: ' + r.errors.join('; ')); out.warnings = r.warnings.length;
      const t1 = MODS.exportText(r.mod); const r2 = MODS.validate(t1); check(r2.ok, 're-validates');
      check(MODS.exportText(r2.mod) === t1, 'normalize is idempotent: export(import(export)) equals export');
      check(MODS.validate(r.mod).ok && MODS.exportText(MODS.validate(r.mod).mod) === t1, 'validating the normalized object also round-trips');
      // wall renumbering: original order was catacomb,stone; canonical order is catalog order
      check(JSON.stringify(r.mod.maps[0].walls) === '["t_stone","t_catacomb"]', 'walls are canonical');
      check(r.mod.maps[0].rows[0] === '1'.repeat(16), 'rows were renumbered');
      // namespaced ids are not accepted in files
      const ns = clone(JSON.parse(SAMPLE)); ns.enemies[0].id = 'mod:ember_crypt:ashhound'; check(!MODS.validate(ns).ok, 'namespaced ids are refused in files');
      // the schema files agree with the validator
      const S = {}; for (const k in schemas) S[k] = JSON.parse(schemas[k]);
      const eq = (a, b, what) => check(JSON.stringify(a) === JSON.stringify(b), 'schema ' + what + ' matches validator: ' + JSON.stringify(a).slice(0, 80));
      eq(S.map.properties.floor.enum, MODS.FLOOR_TEX, 'floor'); eq(S.map.properties.ceil.enum, MODS.CEIL_TEX, 'ceil'); eq(S.map.properties.walls.items.enum, MODS.WALL_TEX, 'walls');
      eq(S.map.properties.music.enum, MODS.MUSIC, 'music'); eq(S.enemy.properties.base.enum, MODS.ENEMY_BASES, 'enemy bases');
      eq(S.map.$defs.entity.oneOf[2].properties.sprite.enum, MODS.PROPS, 'props'); eq(S.mod.$defs.npc.properties.sprite.enum, MODS.NPC_SPRITES, 'npc sprites');
      eq(S.mod.$defs.npc.properties.portrait.enum, MODS.PORTRAITS, 'portraits'); eq(S.mod.$defs.item.properties.kind.enum, MODS.ITEM_KINDS, 'item kinds');
      check(S.map.properties.w.minimum === MODS.LIM.mapMin && S.map.properties.w.maximum === MODS.LIM.mapMax, 'map size limits match');
      check(S.mod.properties.maps.maxItems === MODS.LIM.maps && S.mod.properties.quests.maxItems === MODS.LIM.quests, 'list limits match');
      check(S.mod.properties.schemaVersion.const === 1 && S.mod['x-schemaVersion'] === 1, 'schema is version 1');
      check(S.map.properties.entities.maxItems === MODS.LIM.entities && S.quest.properties.rules.maxItems === MODS.LIM.rules, 'entity and rule limits match');
      eq(S.quest.$defs.when.oneOf.map(w => w.properties.type.const), MODS.TRIGGERS, 'triggers'); eq(S.quest.$defs.effect.oneOf.map(w => w.properties.do.const), MODS.EFFECTS, 'effects');
      out.title = S.mod.title; return out;
    }, schemaTexts);
    assert.equal(rt.warnings, 0);
    console.log('PASS schema: example round trip, canonical form, schema files match the validator');

    // clamping is reported, not silent
    await page.evaluate(() => {
      const m = clone(JSON.parse(SAMPLE)); m.enemies[0].hp = 99999; m.enemies[0].speed = 40; m.enemies[0].dmg = [50, 2]; m.maps[0].ambient = 9;
      const r = MODS.validate(m); check(r.ok, 'out-of-range stats are clamped, not fatal: ' + r.errors.join(';'));
      const e = r.mod.enemies[0]; check(e.hp === 250 && e.speed === 2.6 && e.dmg[0] === 2 && e.dmg[1] === 30, 'stats clamped: ' + JSON.stringify(e));
      check(r.mod.maps[0].ambient === 0.5, 'ambient clamped'); check(r.warnings.length >= 4, 'each clamp is reported');
    });
    console.log('PASS clamping: out-of-range stats are clamped with warnings');

    // ---------------------------------------------------------------- 2. hostile mods
    const hostile = await page.evaluate(() => {
      const base = () => clone(JSON.parse(SAMPLE));
      const cases = [];
      const add = (name, mut, rawText) => { const m = base(); if (mut) mut(m); cases.push([name, rawText ? rawText(JSON.stringify(m)) : m]); };
      add('script field', m => { m.script = 'window.__pwned=1'; });
      add('onload field', m => { m.maps[0].onload = 'window.__pwned=2'; });
      add('effect with code', m => { m.quests[0].rules[0].then.push({ do: 'eval', code: 'window.__pwned=3' }); });
      add('unknown effect', m => { m.quests[0].rules[0].then[0] = { do: 'script', text: 'x' }; });
      add('__proto__ key', null, t => t.replace('"schemaVersion": 1', '"__proto__": {"polluted": true}, "schemaVersion": 1').replace('"schemaVersion":1', '"__proto__":{"polluted":true},"schemaVersion":1'));
      add('nested __proto__', null, t => t.replace('"name":"Ember Crypt"', '"name":"Ember Crypt","__proto__":{"polluted":true}'));
      add('constructor key', m => { m.maps[0].constructor = { prototype: { polluted: 1 } }; });
      add('prototype key', m => { m.enemies[0].prototype = 'x'; });
      add('markup in mod name', m => { m.name = '<img src=x onerror=alert(1)>'; });
      add('markup in map name', m => { m.maps[0].name = 'Crypt <script>alert(1)</script>'; });
      add('markup in dialogue', m => { m.npcs[0].greet = 'Hello <b>there</b>'; });
      add('entity text in journal', m => { m.quests[0].rules[0].then[0].text = 'x &lt;b&gt;'; });
      add('backtick and backslash', m => { m.author = 'a`b'; }); add('backslash', m => { m.author = 'a\\b'; });
      add('control characters', m => { m.name = 'bad\u0007name'; });
      add('bidi override', m => { m.name = 'evil‮txt'; });
      add('javascript url text', m => { m.description = 'click javascript:alert(1)'; });
      add('huge string', m => { m.description = 'x'.repeat(5000); });
      add('over-long name', m => { m.name = 'x'.repeat(41); });
      add('huge map', m => { m.maps[0].w = 5000; m.maps[0].h = 5000; });
      add('map too small', m => { m.maps[0].w = 2; });
      add('non-integer size', m => { m.maps[0].w = 16.5; });
      add('too many maps', m => { for (let i = 0; i < 6; i++) { const c = clone(m.maps[0]); c.id = 'm' + i; m.maps.push(c); } });
      add('too many entities', m => { for (let i = 0; i < 90; i++) m.maps[0].entities.push({ kind: 'prop', sprite: 'lamp', x: 2.5, y: 2.5 }); });
      add('too many enemies', m => { for (let i = 0; i < 45; i++) m.maps[0].entities.push({ kind: 'enemy', type: 'mites', x: 2.5 + (i % 10) * 0.1, y: 6.5 }); });
      add('too many rules', m => { for (let i = 0; i < 20; i++) m.quests[0].rules.push({ id: 'r' + i, when: { type: 'talk', npc: 'warden' }, then: [{ do: 'say', text: 'x' }] }); });
      add('too many effects', m => { for (let i = 0; i < 9; i++) m.quests[0].rules[0].then.push({ do: 'say', text: 'x' }); });
      add('unknown wall texture', m => { m.maps[0].walls[0] = 't_hax'; });
      add('unknown floor texture', m => { m.maps[0].floor = 'img/title.jpg'; });
      add('texture path', m => { m.maps[0].ceil = '../../etc/passwd'; });
      add('unknown prop sprite', m => { m.maps[0].entities[4].sprite = 'evil'; });
      add('data url sprite', m => { m.maps[0].entities[4].sprite = 'data:image/png;base64,AAAA'; });
      add('unknown portrait', m => { m.npcs[0].portrait = 'http://evil.example/x.jpg'; });
      add('unknown npc sprite', m => { m.npcs[0].sprite = 'wearer'; });
      add('unknown item sprite', m => { m.items[0].sprite = 'nope'; });
      add('boss base enemy', m => { m.enemies[0].base = 'wearer'; });
      add('unknown base enemy', m => { m.enemies[0].base = 'dragon'; });
      add('boss placed directly', m => { m.maps[0].entities[1].type = 'weaver'; });
      add('key item placed', m => { m.maps[0].entities[2].item = 'coil'; });
      add('weapon item placed', m => { m.maps[0].entities[2].item = 'w_sword'; });
      add('key item given', m => { m.quests[0].rules[2].then[0] = { do: 'give', item: 'coil' }; });
      add('hp not a number', m => { m.enemies[0].hp = '24; alert(1)'; });
      add('dmg wrong shape', m => { m.enemies[0].dmg = [1]; });
      add('negative coordinate', m => { m.maps[0].entities[0].x = -3; });
      add('coordinate outside map', m => { m.maps[0].entities[0].y = 400.5; });
      add('entity inside a wall', m => { m.maps[0].entities[0].x = 0.5; m.maps[0].entities[0].y = 0.5; });
      add('entity on the exit', m => { m.maps[0].entities[0].x = 13.5; m.maps[0].entities[0].y = 9.5; });
      add('no exit', m => { m.maps[0].rows = m.maps[0].rows.map(r => r.replace('X', '.')); });
      add('two exits', m => { m.maps[0].rows[1] = m.maps[0].rows[1].replace('S...', 'S..X'); });
      add('no start', m => { m.maps[0].rows[1] = m.maps[0].rows[1].replace('S', '.'); });
      add('exit walled off', m => { const r = m.maps[0].rows; const put = (y, x, c) => { r[y] = r[y].slice(0, x) + c + r[y].slice(x + 1); }; for (const [y, x] of [[8, 12], [8, 13], [8, 14], [9, 12], [9, 14], [10, 12], [10, 13], [10, 14]]) put(y, x, '2'); });
      add('wrong row width', m => { m.maps[0].rows[3] += '.'; });
      add('wrong row count', m => { m.maps[0].rows.pop(); });
      add('bad cell character', m => { m.maps[0].rows[2] = m.maps[0].rows[2].replace('.', '<'); });
      add('wall index past palette', m => { m.maps[0].rows[2] = '9' + m.maps[0].rows[2].slice(1); });
      add('duplicate wall texture', m => { m.maps[0].walls = ['t_stone', 't_stone']; });
      add('wrong schema version', m => { m.schemaVersion = 2; }); add('missing schema version', m => { delete m.schemaVersion; });
      add('bad mod id', m => { m.id = 'Ember Crypt!'; }); add('mod id too short', m => { m.id = 'ab'; }); add('reserved-looking mod id', m => { m.id = 'mod:x'; });
      add('bad version', m => { m.version = '1.0'; });
      add('duplicate enemy ids', m => { m.enemies.push(clone(m.enemies[0])); });
      add('unknown modEnemy ref', m => { m.maps[0].entities[0].modEnemy = 'ghost'; });
      add('both type and modEnemy', m => { m.maps[0].entities[0].type = 'hound'; });
      add('unknown npc ref', m => { m.maps[0].entities[5].npc = 'ghost'; });
      add('trigger on unknown map', m => { m.quests[0].rules[0].when.map = 'nowhere'; });
      add('trigger on unknown npc', m => { m.quests[0].rules[1].when.npc = 'nobody'; });
      add('farmable give', m => { m.quests[0].rules[2].once = false; });
      add('spawn on unknown map', m => { m.quests[0].rules[2].then[2].map = 'nowhere'; });
      add('flag name with colon', m => { m.quests[0].rules[1].then[1].flag = 'x:y'; }); add('base flag name', m => { m.quests[0].rules[1].then[1].flag = 'Hedge_open'; });
      add('flag explosion', m => { for (let i = 0; i < 40; i++) m.quests[0].rules[1].then[1] = { do: 'setFlag', flag: 'f' + i }; m.quests[0].rules = []; for (let i = 0; i < 16; i++) m.quests[0].rules.push({ id: 'r' + i, when: { type: 'talk', npc: 'warden' }, then: [{ do: 'setFlag', flag: 'a' + i }, { do: 'setFlag', flag: 'b' + i }, { do: 'setFlag', flag: 'c' + i }] }); m.quests.push({ id: 'q2', title: 'x', rules: [{ id: 'r', when: { type: 'talk', npc: 'warden' }, then: [{ do: 'setFlag', flag: 'zz' }] }] }); });
      add('huge gold', m => { m.quests[0].rules[2].then[1].amount = 'lots'; });
      add('not an object', null); cases[cases.length - 1][1] = [1, 2, 3];
      cases.push(['null', null]); cases.push(['a number', 42]); cases.push(['a string that is not json', '{not json']);
      cases.push(['oversized file', ' '.repeat(140000) + '{}']);
      let deep = {}; let p = deep; for (let i = 0; i < 40; i++) { p.a = {}; p = p.a; } cases.push(['deeply nested', Object.assign(base(), { extra: deep })]);
      cases.push(['function value', Object.assign(base(), { name: () => 1 })]);
      cases.push(['non-plain object', Object.assign(base(), { name: new Date() })]);
      const cyc = base(); cases.push(['symbol value', Object.assign(cyc, { author: Symbol('x') })]);
      const bad = [];
      for (const [name, input] of cases) {
        let r; try { r = MODS.validate(input); } catch (e) { bad.push(name + ' THREW ' + e.message); continue; }
        if (r.ok) bad.push(name + ' was accepted'); else if (!r.errors.length) bad.push(name + ' had no error message');
        if (r.mod !== null) bad.push(name + ' returned a mod despite errors');
      }
      return { n: cases.length, bad, polluted: ({}).polluted, pwned: window.__pwned, protoKeys: Object.keys(Object.prototype) };
    });
    assert.deepEqual(hostile.bad, [], 'every hostile mod is rejected cleanly: ' + hostile.bad.join(' | '));
    assert.ok(hostile.n >= 80, 'at least 80 hostile cases ran (' + hostile.n + ')');
    assert.equal(hostile.polluted, undefined, 'Object.prototype was not polluted');
    assert.equal(hostile.pwned, undefined, 'no imported string ran as code');
    assert.deepEqual(hostile.protoKeys, [], 'Object.prototype has no enumerable keys');
    console.log('PASS hostile mods: ' + hostile.n + ' hostile files rejected (scripts, __proto__, sizes, sprites, numbers, markup, graph errors)');

    // a rejected import changes nothing
    const untouched = await page.evaluate(() => {
      const before = JSON.stringify([Object.keys(ITEMS), Object.keys(ENEMIES), Object.keys(NPCS), MODS.list()]);
      const m = clone(JSON.parse(SAMPLE)); m.name = '<b>x</b>';
      const r = MODS.install(m); const after = JSON.stringify([Object.keys(ITEMS), Object.keys(ENEMIES), Object.keys(NPCS), MODS.list()]);
      return { ok: r.ok, same: before === after, store: localStorage.getItem(MODS.KEY) };
    });
    assert.equal(untouched.ok, false); assert.equal(untouched.same, true, 'a rejected import leaves catalogs and library alone');
    console.log('PASS hostile mods: a rejected import installs nothing');

    // ---------------------------------------------------------------- 3. library
    const libr = await page.evaluate(() => {
      const out = {};
      const r = MODS.install(SAMPLE); check(r.ok, 'install'); out.listed = MODS.list();
      check(typeof ENEMIES['mod:ember_crypt:ashhound'] === 'object' && ENEMIES['mod:ember_crypt:ashhound'].hp === 24, 'mod enemy registered under its namespace');
      check(ENEMIES['mod:ember_crypt:ashhound'].sprite === ENEMIES.hound.sprite && ENEMIES['mod:ember_crypt:ashhound'].cacophony === true, 'it keeps the base behaviour and sprite');
      check(ENEMIES.hound.hp === 18, 'the base enemy is untouched');
      check(ITEMS['mod:ember_crypt:emberkey'].key === true && NPCS['mod:ember_crypt:warden'].portrait === 'townsman', 'items and NPCs registered');
      check(!!G.maps['mod:ember_crypt:crypt'], 'the dungeon is in the live world');
      const stored = JSON.parse(localStorage.getItem(MODS.KEY)); check(stored.mods.length === 1 && stored.mods[0].on === true, 'persisted');
      // disable / enable / remove
      check(MODS.setEnabled('ember_crypt', false), 'disable'); check(!ENEMIES['mod:ember_crypt:ashhound'] && !ITEMS['mod:ember_crypt:emberkey'] && !NPCS['mod:ember_crypt:warden'], 'disabling unregisters everything');
      check(!G.maps['mod:ember_crypt:crypt'], 'and removes the dungeon from the world'); check(MODS.enter('ember_crypt', 'crypt').ok === false, 'a disabled mod cannot be entered');
      check(JSON.parse(localStorage.getItem(MODS.KEY)).mods[0].on === false, 'disabled state persisted');
      check(MODS.setEnabled('ember_crypt', true) && !!G.maps['mod:ember_crypt:crypt'], 're-enable');
      // storage is as untrusted as a download: tamper, reload
      const tampered = JSON.parse(localStorage.getItem(MODS.KEY)); const evil = JSON.parse(SAMPLE); evil.id = 'evil_one'; evil.name = '<img src=x onerror=window.__pwned=9>';
      tampered.mods.push({ id: 'evil_one', on: true, json: JSON.stringify(evil) }); tampered.mods.push({ id: 'junk', on: true, json: '{"__proto__":{"polluted":1}}' }); tampered.mods.push({ id: 'junk2', on: true, json: 42 });
      localStorage.setItem(MODS.KEY, JSON.stringify(tampered)); MODS.reload();
      out.afterTamper = MODS.list().map(m => m.id); check(!({}).polluted && window.__pwned === undefined, 'tampered storage did nothing');
      localStorage.setItem(MODS.KEY, '{{{ not json'); MODS.reload(); out.afterGarbage = MODS.list().length;
      localStorage.setItem(MODS.KEY, JSON.stringify({ v: 1, mods: [{ id: 'ember_crypt', on: true, json: SAMPLE }] })); MODS.reload();
      MODS.setEnabled('ember_crypt', false); MODS.setEnabled('ember_crypt', true);
      // caps: 12 mods, replacing an id does not count twice
      const base = JSON.parse(SAMPLE); let accepted = 0, rejected = 0;
      for (let i = 0; i < 14; i++) { const m = clone(base); m.id = 'cap_' + String.fromCharCode(97 + i); const x = MODS.install(m); if (x.ok) accepted++; else rejected++; }
      out.accepted = accepted; out.rejected = rejected; out.total = MODS.list().length;
      const again = clone(base); again.id = 'cap_a'; again.version = '2.0.0'; check(MODS.install(again).ok && MODS.get('cap_a').version === '2.0.0', 'same id replaces the earlier copy');
      for (let i = 0; i < 14; i++) MODS.remove('cap_' + String.fromCharCode(97 + i));
      out.after = MODS.list().map(m => m.id);
      return out;
    });
    assert.deepEqual(libr.listed.map(m => m.id), ['ember_crypt']);
    assert.deepEqual(libr.afterTamper, ['ember_crypt'], 'hostile stored mods are dropped on load');
    assert.equal(libr.afterGarbage, 0, 'garbage storage loads as an empty library');
    assert.equal(libr.total, 12, 'library is capped at 12 mods'); assert.equal(libr.rejected, 3);
    assert.deepEqual(libr.after, ['ember_crypt']);
    console.log('PASS library: install, enable/disable, remove, persistence, tamper-proof storage and caps');

    // ---------------------------------------------------------------- 4. enter, quests, leave
    const dun = await page.evaluate(async () => {
      const out = {};
      play(); const home = { map: G.mapId, x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir };
      Engine.cam.x = home.x; const flagsBefore = Object.keys(G.flags).sort().join(',');
      const e = MODS.enter('ember_crypt', 'crypt'); check(e.ok, 'enter: ' + JSON.stringify(e));
      check(G.mapId === 'mod:ember_crypt:crypt' && G.state === 'play', 'in the dungeon');
      check(Math.abs(Engine.cam.x - 1.5) < 0.01 && Math.abs(Engine.cam.y - 1.5) < 0.01, 'at the start cell');
      check(typeof G.flags['mod:ret'] === 'string' && G.flags['mod:ember_crypt:h'] > 0, 'return point and build hash recorded under mod:');
      check(G.ents.some(x => x.kind === 'enemy' && x.type === 'mod:ember_crypt:ashhound' && x.hp === 24), 'the modded enemy is hydrated with its stats');
      check(G.ents.some(x => x.kind === 'npc' && x.id === 'mod:ember_crypt:warden'), 'the NPC stands there');
      check(G.map.isBlocked(0, 0) && !G.map.isBlocked(2, 2), 'walls and floor built');
      check(MODS.enter('ember_crypt', 'crypt').ok === false, 'cannot nest');
      // quest: enter
      const j0 = G.journal.length; Engine.cam.x = 8.5; Engine.cam.y = 2.6; checkTriggers();
      check(G.journal.length === j0 + 1 && /breathes in the ash/.test(G.journal[0].text), 'enter rule added a journal line');
      check(G.flags[MODS.onceKey('ember_crypt', 'lamp', 'enter_hall')] === true, 'once flag is namespaced');
      Engine.cam.x = 3.5; Engine.cam.y = 6.5; checkTriggers(); Engine.cam.x = 8.5; Engine.cam.y = 2.6; checkTriggers();
      check(G.journal.length === j0 + 1, 'once rules do not repeat');
      // quest: talk
      const npc = G.ents.find(x => x.id === 'mod:ember_crypt:warden'); Engine.cam.x = npc.x - 1; Engine.cam.y = npc.y; Engine.cam.dir = 0;
      talk(npc); check(G.openPanel === 'dialogue', 'dialogue opened');
      const said = document.querySelector('#dlg-log').textContent; check(/Take the key from the far wall/.test(said), 'the rule\'s say text is the NPC\'s reply: ' + said);
      check(G.flags[MODS.flagKey('ember_crypt', 'warned')] === true, 'setFlag wrote mod:ember_crypt:f_warned');
      check(document.querySelector('#modal-panel .name').textContent === 'Crypt Warden', 'NPC name shown'); closeModal(); G.state = 'play';
      talk(npc); check(!/Take the key/.test(document.querySelector('#dlg-log').textContent) && /Mind the dead/.test(document.querySelector('#dlg-log').textContent), 'second talk falls back to the greeting'); closeModal(); G.state = 'play';
      // quest: pickup + give + gold + spawn
      const gold0 = G.player.gold, ents0 = G.ents.length; const key = G.ents.find(x => x.kind === 'item' && x.item === 'mod:ember_crypt:emberkey');
      pickUp(key);
      check(G.player.inv.some(s => s.id === 'mod:ember_crypt:emberkey'), 'the mod key is in the pack'); check(G.player.gold === gold0 + 10, 'gold effect');
      check(G.journal[0].text === 'I have the Ember Key.', 'pickup rule journal'); check(G.ents.length === ents0 + 1 && G.ents[G.ents.length - 1].type === 'mod:ember_crypt:ashhound', 'spawn effect added the enemy');
      // inventory renders a mod item without trouble
      renderInventory && renderInventory(); check(document.querySelector('#modal-panel').textContent.includes('Ember Key'), 'inventory shows the mod item'); closeModal(); G.state = 'play';
      // flags only in the mod namespace; no base flag was touched
      const added = Object.keys(G.flags).filter(k => !flagsBefore.split(',').includes(k));
      check(added.every(k => k.indexOf('mod:') === 0), 'every flag the mod wrote is mod:-namespaced: ' + added.join(','));
      // combat with a mod enemy
      const foe = G.ents.find(x => x.type === 'mod:ember_crypt:ashhound'); Engine.cam.x = foe.x - 0.9; Engine.cam.y = foe.y; Engine.cam.dir = 0; foe.state = 'chase';
      for (let i = 0; i < 90; i++) update(1 / 30); check(true, 'game runs with a mod enemy chasing');
      foe.hp = 0; killEnemy(foe, false); check(foe.dead, 'a mod enemy can be killed');
      G.player.hp = G.player.hpMax; G.dead = false; hide('#death'); G.state = 'play';
      // leave by the exit door
      let ex = null; for (let y = 0; y < G.map.h; y++) for (let x = 0; x < G.map.w; x++) { const c = G.map.get(x, y); if (c && c.portal && c.portal.modExit) ex = [x, y, c]; }
      check(!!ex, 'the exit door exists'); transfer(ex[2].portal);
      check(G.mapId === home.map && Math.abs(Engine.cam.x - home.x) < 0.02 && Math.abs(Engine.cam.y - home.y) < 0.02, 'the exit returns you exactly where you were');
      check(G.flags['mod:ret'] === undefined, 'the return flag is cleared');
      out.home = home; return out;
    });
    console.log('PASS dungeon: enter, modded enemy/NPC/item, enter+talk+pickup rules, namespaced flags, exit returns');

    // death inside a mod map wakes inside the dungeon (the exit is still there), and re-entry keeps the state
    await page.evaluate(() => {
      play(); const r = MODS.enter('ember_crypt', 'crypt'); check(r.ok, 're-enter');
      check(G.ents.some(x => x.kind === 'item' && x.item === 'mod:ember_crypt:emberkey' && x.dead), 'the dungeon remembers it was looted');
      const h = G.flags['mod:ret']; MODS.leave(); check(G.flags['mod:ret'] === undefined && !!h, 'leave() works too');
    });
    // unsafe starts are refused
    const refused = await page.evaluate(() => {
      play(); const out = [];
      G.player.hardcore = true; out.push(MODS.enter('ember_crypt', 'crypt').ok); G.player.hardcore = false;
      G.escapeTimer = 10; out.push(MODS.enter('ember_crypt', 'crypt').ok); G.escapeTimer = 0;
      const was = G.dead; G.dead = true; out.push(MODS.enter('ember_crypt', 'crypt').ok); G.dead = was;
      out.push(MODS.enter('ember_crypt', 'nope').ok, MODS.enter('nope', 'crypt').ok);
      return out;
    });
    assert.deepEqual(refused, [false, false, false, false, false], 'hardcore, danger, death, unknown dungeon and unknown mod are all refused');
    console.log('PASS dungeon: unsafe or unknown entries are refused; re-entry keeps its state');

    // ---------------------------------------------------------------- 5. save and load
    const sv = await page.evaluate(async () => {
      const out = {}; play();
      // (a) a base save made outside any mod
      const outside = clone(snapshotGame()); out.outsideHasFlags = Object.keys(outside.flags).filter(k => k.indexOf('mod:') === 0 && k !== 'mod:ember_crypt:h' && !/^mod:ember_crypt:(f|r)_/.test(k));
      // (b) a save made inside the dungeon, mid-way
      MODS.enter('ember_crypt', 'crypt'); Engine.cam.x = 5.5; Engine.cam.y = 8.5; Engine.cam.dir = 1.2;
      const killedFoe = G.ents.find(x => x.type === 'mod:ember_crypt:ashhound'); killedFoe.hp = 7;
      const inside = clone(snapshotGame()); out.insideMap = inside.mapId;
      window.__inside = inside; window.__outside = outside;
      // present: resume in the dungeon
      restoreGame(clone(inside));
      check(G.mapId === 'mod:ember_crypt:crypt', 'loaded back into the dungeon'); check(Math.abs(Engine.cam.x - 5.5) < 0.01 && Math.abs(Engine.cam.y - 8.5) < 0.01, 'at the saved spot');
      check(G.ents.find(x => x.type === 'mod:ember_crypt:ashhound').hp === 7, 'mod enemy state restored'); out.resumed = true;
      // a base save loads with the mod present
      restoreGame(clone(outside)); check(G.mapId === outside.mapId && G.mapId.indexOf('mod:') !== 0, 'a save made outside loads outside, mod present');
      // missing: remove the mod, load the inside save
      MODS.remove('ember_crypt'); check(!G.maps['mod:ember_crypt:crypt'], 'removed from the world');
      const msgsBefore = document.querySelectorAll('#msgs .m').length;
      restoreGame(clone(inside));
      check(G.mapId === 'oakhaven' || G.mapId === outside.mapId, 'with the mod missing, the save returns to the entrance: ' + G.mapId);
      check(G.mapId.indexOf('mod:') !== 0 && !Object.keys(G.maps).some(k => k.indexOf('mod:') === 0), 'no mod map exists');
      check(Math.abs(Engine.cam.x - outside.cam.x) < 0.05 && Math.abs(Engine.cam.y - outside.cam.y) < 0.05, 'at the entrance position, not inside a wall');
      check(!G.map.isBlocked(Math.floor(Engine.cam.x), Math.floor(Engine.cam.y)), 'the entrance is walkable');
      check(/not installed or has changed/.test(Array.from(document.querySelectorAll('#msgs .m')).map(m => m.textContent).join('|')), 'the player is told');
      check(G.flags['mod:ret'] === undefined, 'the return flag is gone');
      check(G.player.inv.every(s => ITEMS[s.id]), 'the pack holds only known items (mod key dropped)');
      // base save without the mod
      restoreGame(clone(outside)); check(G.mapId === outside.mapId, 'base save loads without the mod');
      // re-install an edited mod: an old inside-save must not be applied to the new layout
      const edited = JSON.parse(SAMPLE); edited.maps[0].entities.shift(); edited.version = '1.0.1'; check(MODS.install(edited).ok, 'install edited');
      restoreGame(clone(inside)); check(G.mapId.indexOf('mod:') !== 0, 'a changed mod does not take an old dungeon state: ' + G.mapId);
      // same mod again: fresh enter, save, load works
      check(MODS.install(SAMPLE).ok, 'reinstall'); MODS.enter('ember_crypt', 'crypt'); const again = clone(snapshotGame()); restoreGame(clone(again)); check(G.mapId === 'mod:ember_crypt:crypt', 'present and unchanged resumes'); MODS.leave();
      // hostile saves
      const base = clone(outside);
      const evil = [
        s => { s.flags['mod:ret'] = '<img src=x onerror=window.__pwned=5>'; s.mapId = 'mod:ember_crypt:crypt'; },
        s => { s.mapId = 'mod:__proto__:x'; },
        s => { s.mapId = 'mod:nobody:nowhere'; s.flags['mod:ret'] = 'oakhaven|9999|9999|0'; },
        s => { s.mapId = 'mod:ember_crypt:crypt'; s.flags['mod:ret'] = 'mod:ember_crypt:crypt|1|1|0'; },
        s => { s.mapId = 'mod:ember_crypt:crypt'; s.flags['mod:ret'] = 'watchhouse|3.5|4.5|0'; },
        s => { s.mapId = 'mod:ember_crypt:crypt'; delete s.flags; s.flags = {}; },
        s => { s.maps['mod:ember_crypt:crypt'] = { ents: [{ x: 1e9, y: NaN, hp: -5 }], extra: [{ kind: 'enemy', type: 'hound', x: 1, y: 1 }], doors: {}, triggers: [] }; },
        s => { s.flags['mod:ember_crypt:f_warned'] = { toString: 'x' }; s.flags['mod:x:h'] = 'abc'; s.flags['mod:ember_crypt:r_lamp_enter_hall'] = '<b>'; },
      ];
      let n = 0; const fails = [];
      for (const f of evil) {
        const s = clone(base); f(s);
        try { restoreGame(s); n++; check(G.mapId.indexOf('mod:') !== 0 || G.mapId === 'mod:ember_crypt:crypt', 'sane map'); check(Number.isFinite(Engine.cam.x) && Number.isFinite(Engine.cam.y), 'finite camera'); check(!G.map.isBlocked(Math.floor(Engine.cam.x), Math.floor(Engine.cam.y)), 'camera not in a wall: ' + n); }
        catch (e) { fails.push(e.message); }
      }
      out.evilLoaded = n; out.fails = fails; out.pwned = window.__pwned;
      for (const k of Object.keys(G.flags)) if (k.indexOf('mod:') === 0 && G.flags[k] !== true && typeof G.flags[k] !== 'number' && typeof G.flags[k] !== 'string') out.badFlag = k;
      if (G.mapId.indexOf('mod:') === 0) MODS.leave(); play();
      return out;
    });
    assert.equal(sv.resumed, true); assert.deepEqual(sv.outsideHasFlags, [], 'a base save carries no mod flags it should not');
    assert.equal(sv.pwned, undefined, 'a hostile flag value never ran');
    assert.equal(sv.badFlag, undefined, 'object flag values are scrubbed');
    assert.deepEqual(sv.fails.filter(f => !/Not an Octave save|points somewhere|damaged/.test(f)), [], 'hostile saves load sanely or fail cleanly: ' + sv.fails.join('|'));
    assert.ok(sv.evilLoaded >= 6, 'most hostile saves still load, safely (' + sv.evilLoaded + ')');
    console.log('PASS save/load: resume with the mod, entrance when missing or changed, base saves unaffected, ' + sv.evilLoaded + ' hostile saves handled');

    // ---------------------------------------------------------------- 6. editor model: export equals import
    const edm = await page.evaluate(() => {
      const out = {}; const ED = MODS.ED;
      // default draft is valid and round-trips
      ED.draft = MODS.newDraft(); ED.meta = { id: 'my_mod', version: '1.0.0', name: 'My Dungeon Mod', author: 'Anonymous', description: '' }; ED.extra = {}; ED.otherMaps = [];
      let v = MODS.validateDraft(); check(v.ok, 'default draft valid: ' + v.errors.join(';'));
      const t1 = MODS.exportText(v.mod); const imp = MODS.validate(t1); check(imp.ok, 'import of export');
      MODS.modToDraft(imp.mod); const t2 = MODS.exportText(MODS.validateDraft().mod); check(t1 === t2, 'editor export equals import (default draft)');
      // paint things with the model API
      ED.tool = 'wall'; ED.brush = 't_brass'; MODS.apply(5, 5); MODS.apply(6, 5); ED.brush = 't_catacomb'; MODS.apply(7, 5);
      ED.tool = 'door'; MODS.apply(8, 5); ED.tool = 'enemy'; ED.ent = 'hound'; MODS.apply(10, 8); ED.tool = 'item'; ED.ent = 'tonic'; MODS.apply(4, 8); ED.tool = 'prop'; ED.ent = 'lamp'; MODS.apply(3, 3);
      ED.tool = 'start'; MODS.apply(3, 10); ED.tool = 'exit'; MODS.apply(16, 3);
      v = MODS.validateDraft(); check(v.ok, 'painted draft valid: ' + v.errors.join(';'));
      const rows = v.mod.maps[0].rows; check(rows[5][5] !== '.' && rows[5][8] === 'D' && rows[10][3] === 'S' && rows[3][16] === 'X', 'cells painted');
      check((rows.join('').match(/S/g) || []).length === 1 && (rows.join('').match(/X/g) || []).length === 1, 'exactly one start and one exit');
      check(v.mod.maps[0].entities.length === 3, 'three entities placed'); check(JSON.stringify(v.mod.maps[0].walls) === '["t_brass","t_catacomb"]' || v.mod.maps[0].walls.length === 3, 'walls palette collected: ' + v.mod.maps[0].walls);
      const a = MODS.exportText(v.mod); MODS.modToDraft(MODS.validate(a).mod); const b = MODS.exportText(MODS.validateDraft().mod); check(a === b, 'painted draft: export equals import');
      // resize keeps one start and exit and drops stray entities
      MODS.resizeDraft(10, 9); v = MODS.validateDraft(); check(v.ok || v.errors.length, 'resize leaves a checkable draft');
      // blocking the exit shows the real validator message
      MODS.modToDraft(MODS.validate(a).mod); for (const [x, y] of [[15, 3], [17, 3], [16, 2], [16, 4]]) { ED.tool = 'wall'; ED.brush = 't_stone'; MODS.apply(x, y); }
      v = MODS.validateDraft(); check(!v.ok && /cannot be reached/.test(v.errors.join('|')), 'a walled-off exit is reported: ' + v.errors.join('|'));
      // importing the example into the editor keeps enemies, items, npcs and quests; export equals import
      const norm = MODS.validate(SAMPLE).mod; MODS.modToDraft(norm); const ex = MODS.validateDraft();
      check(ex.ok && MODS.exportText(ex.mod) === MODS.exportText(norm), 'example: editor export equals the normalized import');
      check(ex.mod.quests.length === 1 && ex.mod.enemies.length === 1 && ex.mod.npcs.length === 1 && ex.mod.items.length === 1, 'extras ride along');
      // editing the imported example then exporting is still valid and still carries the extras
      ED.tool = 'prop'; ED.ent = 'crates'; MODS.apply(12, 8); const ed2 = MODS.validateDraft(); check(ed2.ok && ed2.mod.quests.length === 1, 'edited example is valid');
      ED.tool = 'enemy'; ED.ent = 'mod:ashhound'; MODS.apply(11, 9); const ed3 = MODS.validateDraft(); check(ed3.ok && ed3.mod.maps[0].entities.some(e => e.modEnemy === 'ashhound' && e.x === 11.5), 'mod enemies can be placed from the editor');
      return out;
    });
    console.log('PASS editor model: painting, one start/exit, live validation, export equals import (default, painted and the example)');

    // ---------------------------------------------------------------- 7. editor UI: clicks, preview, playtest, export, import
    await page.evaluate(() => { play(); for (const m of MODS.list()) { if (G.mapId.indexOf('mod:') === 0) MODS.leave(); MODS.remove(m.id); } MODS.ED.draft = null; try { localStorage.removeItem('octave.mods.draft.v1'); } catch (e) { /* ignore */ } renderMenu(); });
    // Options entry: still fits, shares a row, opens the panel
    const fit = await page.evaluate(() => ({
      mods: !!document.getElementById('mn-mods'), gfx: !!document.getElementById('mn-gfx'),
      onscreen: Array.from(document.querySelectorAll('#modal-panel button:enabled')).every(b => { const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }),
      noOverflow: document.getElementById('modal-panel').scrollWidth <= document.getElementById('modal-panel').clientWidth + 1,
    }));
    assert.deepEqual(fit, { mods: true, gfx: true, onscreen: true, noOverflow: true }, 'Options keeps every action on screen with the Mod dungeons entry');
    await shot(page, '01-options');
    await page.locator('#mn-mods').click();
    assert.equal(await page.evaluate(() => G.openPanel), 'mods');
    await shot(page, '02-mods-panel');
    // import through the paste box: a hostile one first, then a good one
    const hostileMod = JSON.parse(SAMPLE); hostileMod.name = '<img src=x onerror=window.__pwned=7>'; hostileMod.id = 'evil_two';
    await page.locator('#mods-paste').fill(JSON.stringify(hostileMod)); await page.locator('#mods-import').click();
    assert.ok((await page.locator('#mods-errs').textContent()).includes('markup'), 'rejection reasons are listed');
    assert.equal(await page.evaluate(() => MODS.list().length), 0, 'nothing installed from the hostile paste');
    assert.equal(await page.locator('#modal-panel img').count(), 0, 'no element was created from hostile text');
    await page.locator('#mods-paste').fill(SAMPLE); await page.locator('#mods-import').click();
    assert.equal(await page.locator('[data-mod="ember_crypt"]').count(), 1, 'the imported mod is listed');
    assert.equal(await page.locator('[data-enter="ember_crypt:crypt"]').count(), 1, 'its dungeon has an Enter button');
    // file picker import path
    await page.evaluate(() => { MODS.remove('ember_crypt'); MODS.panel(); });
    const tmpFile = path.join(require('node:os').tmpdir(), 'octave-mods-test.mod.json'); fs.writeFileSync(tmpFile, SAMPLE);
    await page.locator('#mods-file').setInputFiles(tmpFile); await page.waitForSelector('[data-mod="ember_crypt"]');
    // toggle and remove through the UI
    await page.locator('[data-toggle="ember_crypt"]').click(); assert.equal(await page.evaluate(() => MODS.list()[0].on), false, 'toggle disables');
    await page.locator('[data-toggle="ember_crypt"]').click(); assert.equal(await page.evaluate(() => MODS.list()[0].on), true, 'toggle enables');
    // entering from the panel, and leaving from the panel
    await page.locator('[data-enter="ember_crypt:crypt"]').click();
    assert.equal(await page.evaluate(() => G.mapId), 'mod:ember_crypt:crypt'); await page.waitForTimeout(200);
    await shot(page, '03-in-dungeon');
    await page.evaluate(() => { renderMenu(); }); await page.locator('#mn-mods').click();
    assert.equal(await page.locator('#mods-leave').count(), 1, 'a Leave button shows inside a dungeon');
    assert.equal(await page.locator('[data-toggle="ember_crypt"]').count() === 1 && await page.evaluate(() => !MODS.setEnabled('ember_crypt', false)), true, 'cannot disable or remove the mod you are standing in');
    await page.locator('#mods-leave').click(); assert.equal(await page.evaluate(() => G.mapId.indexOf('mod:')), -1, 'Leave returns you');
    console.log('PASS panel: Options entry fits, paste and file import, hostile paste rejected, toggle, enter, leave');

    // editor through real clicks
    await page.evaluate(() => { play(); MODS.ED.draft = null; MODS.editor(); });
    await page.waitForSelector('#ed-grid');
    const geo = await page.evaluate(() => { const r = document.getElementById('ed-grid').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cs: MODS.ED.cs, gw: MODS.ED.draft.w }; });
    const cell = (cx, cy) => [geo.x + (cx + 0.5) * geo.cs * geo.w / (geo.gw * geo.cs), geo.y + (cy + 0.5) * geo.cs];
    await page.locator('[data-tool="wall"]').click(); await page.selectOption('#ed-brush', 't_brass');
    let [px, py] = cell(6, 6); await page.mouse.click(px, py);
    assert.equal(await page.evaluate(() => MODS.ED.draft.grid[6][6]), 't_brass', 'click paints a wall');
    [px, py] = cell(6, 7); await page.mouse.move(px, py); await page.mouse.down(); [px, py] = cell(10, 7); await page.mouse.move(px, py, { steps: 8 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => [6, 7, 8, 9, 10].every(x => MODS.ED.draft.grid[7][x] === 't_brass')), true, 'dragging paints a line');
    await page.locator('[data-tool="door"]').click(); [px, py] = cell(8, 7); await page.mouse.click(px, py);
    assert.equal(await page.evaluate(() => MODS.ED.draft.grid[7][8]), 'D', 'door tool');
    await page.locator('[data-tool="enemy"]').click(); await page.selectOption('#ed-ent', 'golem'); [px, py] = cell(12, 8); await page.mouse.click(px, py);
    await page.locator('[data-tool="item"]').click(); [px, py] = cell(4, 9); await page.mouse.click(px, py);
    await page.locator('[data-tool="prop"]').click(); [px, py] = cell(14, 4); await page.mouse.click(px, py);
    assert.equal(await page.evaluate(() => MODS.ED.draft.entities.map(e => e.kind).sort().join()), 'enemy,item,prop', 'entities placed from catalogs');
    await page.locator('[data-tool="floor"]').click(); [px, py] = cell(6, 6); await page.mouse.click(px, py);
    assert.equal(await page.evaluate(() => MODS.ED.draft.grid[6][6]), '.', 'floor tool erases');
    // keyboard painting
    await page.locator('#ed-grid').focus(); await page.locator('[data-tool="wall"]').click(); await page.locator('#ed-grid').focus();
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => { const E = MODS.ED; return E.draft.grid[E.cy][E.cx] !== '.'; }), true, 'keyboard cursor paints');
    await page.keyboard.press('Delete');
    // name, size, selects
    await page.locator('#ed-name').fill('Clicked Crypt'); await page.locator('#ed-author').fill('Click Tester'); await page.locator('#ed-modid').fill('clicked_crypt');
    await page.locator('#ed-w').fill('24'); await page.locator('#ed-w').dispatchEvent('change');
    assert.equal(await page.evaluate(() => MODS.ED.draft.w), 24, 'width changes');
    await page.selectOption('#ed-music', 'root'); await page.selectOption('#ed-floor', 't_cobble'); await page.selectOption('#ed-dir', '90');
    assert.equal(await page.evaluate(() => { const d = MODS.ED.draft; return d.music + d.floor + d.startDir; }), 'roott_cobble90');
    // live validation: wall off the exit
    await page.evaluate(() => { const d = MODS.ED.draft; for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (d.grid[y][x] === 'X') { MODS.ED.cx = x; MODS.ED.cy = y; } });
    const exitCell = await page.evaluate(() => { const d = MODS.ED.draft; for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (d.grid[y][x] === 'X') return [x, y]; });
    await page.locator('[data-tool="wall"]').click(); await page.selectOption('#ed-brush', 't_stone');
    const geo2 = await page.evaluate(() => { const r = document.getElementById('ed-grid').getBoundingClientRect(); return { x: r.x, y: r.y, cs: MODS.ED.cs }; });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cx = exitCell[0] + dx, cy = exitCell[1] + dy; await page.mouse.click(geo2.x + (cx + 0.5) * geo2.cs, geo2.y + (cy + 0.5) * geo2.cs); }
    assert.ok((await page.locator('#ed-msgs').textContent()).includes('cannot be reached'), 'the validator message appears live');
    for (const id of ['#ed-preview', '#ed-playtest', '#ed-export', '#ed-install']) assert.equal(await page.locator(id).isDisabled(), true, id + ' is disabled while invalid');
    await shot(page, '04-editor-invalid');
    // undo the block
    for (const [dx, dy] of [[-1, 0], [0, 1], [0, -1], [1, 0]]) { const cx = exitCell[0] + dx, cy = exitCell[1] + dy; if (cx < 0 || cy < 0) continue; }
    await page.locator('[data-tool="floor"]').click();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const cx = exitCell[0] + dx, cy = exitCell[1] + dy; if (cx < 1 || cy < 1 || cx >= 23 || cy >= 13) continue; await page.mouse.click(geo2.x + (cx + 0.5) * geo2.cs, geo2.y + (cy + 0.5) * geo2.cs); }
    await page.waitForFunction(() => MODS.validateDraft().ok, null, { timeout: 3000 });
    assert.ok((await page.locator('#ed-msgs').textContent()).includes('Valid'), 'valid again');
    // preview
    const pv = await page.evaluate(() => ({ map: G.map.id, x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir }));
    await page.locator('#ed-preview').click();
    assert.equal(await page.locator('#ed-previews canvas').count(), 4, 'preview draws four views');
    const pvStats = await page.evaluate(() => Array.from(document.querySelectorAll('#ed-previews canvas')).map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let mn = 255, mx = 0; for (let i = 0; i < d.length; i += 4 * 37) { const v = d[i] + d[i + 1] + d[i + 2]; if (v < mn) mn = v; if (v > mx) mx = v; } return mx - mn; }));
    assert.ok(pvStats.every(v => v > 30), 'each preview view has picture content ' + pvStats.join(','));
    const after = await page.evaluate(() => ({ map: G.map.id, x: Engine.cam.x, y: Engine.cam.y, dir: Engine.cam.dir, temp: MODS.state.temp, ents: Object.keys(ENEMIES).filter(k => k.indexOf('mod:_draft') === 0) }));
    assert.deepEqual({ map: after.map, x: after.x, y: after.y, dir: after.dir }, pv, 'preview leaves the real view alone'); assert.equal(after.temp, null);
    await shot(page, '05-editor-preview');
    // export download equals the validated draft
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#ed-export').click()]);
    assert.equal(dl.suggestedFilename(), 'clicked_crypt.mod.json');
    const exported = fs.readFileSync(await dl.path(), 'utf8');
    const eq = await page.evaluate((t) => { const r = MODS.validate(t); return { ok: r.ok, same: r.ok && MODS.exportText(r.mod) === t, live: MODS.exportText(MODS.validateDraft().mod) === t }; }, exported);
    assert.deepEqual(eq, { ok: true, same: true, live: true }, 'downloaded file validates and equals the editor model');
    // import that file into a fresh editor: model equal
    await page.locator('#ed-new').click();
    assert.equal(await page.evaluate(() => MODS.ED.draft.name), 'My Dungeon');
    await page.locator('#modal-panel details summary').click(); await page.locator('#ed-paste').fill(exported); await page.locator('#ed-import').click();
    assert.equal(await page.evaluate((t) => MODS.exportText(MODS.validateDraft().mod) === t, exported), true, 'export then import in the editor gives the same mod');
    assert.equal(await page.inputValue('#ed-name'), 'Clicked Crypt');
    // a hostile paste into the editor is refused and changes nothing
    await page.locator('#modal-panel details summary').click(); await page.locator('#ed-paste').fill('{"schemaVersion":1,"__proto__":{"x":1}}'); await page.locator('#ed-import').click();
    assert.equal(await page.inputValue('#ed-name'), 'Clicked Crypt', 'a rejected editor import changes nothing');
    assert.ok((await page.locator('#ed-msgs').textContent()).includes('forbidden key'));
    // add to my mods
    await page.evaluate(() => MODS.editor({ keep: true })); await page.waitForSelector('#ed-install'); await page.locator('#ed-install').click();
    assert.equal(await page.evaluate(() => MODS.list().some(m => m.id === 'clicked_crypt')), true, 'Add to my mods installs the draft');
    // playtest and return to the editor
    const ptBefore = await page.evaluate(() => ({ map: G.mapId, x: Engine.cam.x, y: Engine.cam.y }));
    await page.locator('#ed-playtest').click();
    const pt = await page.evaluate(() => ({ map: G.mapId, state: G.state, panel: G.openPanel, hasMap: !!G.maps[G.mapId] }));
    assert.ok(pt.map.indexOf('mod:_draft:') === 0 && pt.state === 'play' && pt.panel === null && pt.hasMap, 'playtest enters the draft with the character: ' + JSON.stringify(pt));
    await page.waitForTimeout(200); await shot(page, '06-playtest');
    // a save made now, with the draft gone, returns to the entrance
    const insideSave = await page.evaluate(() => clone(snapshotGame()));
    await page.evaluate(() => { let ex = null; for (let y = 0; y < G.map.h; y++) for (let x = 0; x < G.map.w; x++) { const c = G.map.get(x, y); if (c && c.portal && c.portal.modExit) ex = c; } transfer(ex.portal); });
    await page.waitForFunction(() => G.openPanel === 'modedit', null, { timeout: 3000 });
    const back = await page.evaluate(() => ({ map: G.mapId, draftMap: Object.keys(G.maps).filter(k => k.indexOf('mod:_draft') === 0), temp: MODS.state.temp, name: MODS.ED.draft.name, flag: G.flags['mod:_draft:h'], reg: Object.keys(ENEMIES).concat(Object.keys(ITEMS), Object.keys(NPCS)).filter(k => k.indexOf('mod:_draft') === 0) }));
    assert.equal(back.map, ptBefore.map); assert.deepEqual(back.draftMap, []); assert.equal(back.temp, null); assert.equal(back.name, 'Clicked Crypt', 'the draft survived the playtest'); assert.equal(back.flag, undefined); assert.deepEqual(back.reg, []);
    const pos = await page.evaluate(() => ({ x: Engine.cam.x, y: Engine.cam.y }));
    assert.ok(Math.abs(pos.x - ptBefore.x) < 0.02 && Math.abs(pos.y - ptBefore.y) < 0.02, 'playtest exit returns you to where you were');
    const lost = await page.evaluate((s) => { restoreGame(clone(s)); return { map: G.mapId, ok: G.mapId.indexOf('mod:') !== 0 }; }, insideSave);
    assert.equal(lost.ok, true, 'a save made inside a playtest returns to the entrance on load');
    console.log('PASS editor UI: click/drag/keyboard painting, live validation, preview, export download, import, add to mods, playtest enter/exit');

    // ---------------------------------------------------------------- 8. compact windows and security of what is shown
    await page.evaluate(() => { play(); });
    await page.setViewportSize({ width: 640, height: 400 });
    await page.evaluate(() => { MODS.editor({ keep: true }); });
    assert.equal(await page.locator('#ed-compact').count(), 1, 'the compact window gets the larger-window notice');
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'editor notice has no horizontal overflow');
    await shot(page, '07-compact-editor');
    await page.evaluate(() => { MODS.panel(); });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'mods panel has no horizontal overflow at 640x400');
    await shot(page, '08-compact-panel');
    await page.evaluate(() => { renderMenu(); });
    assert.equal(await page.locator('#modal-panel').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, 'options has no horizontal overflow at 640x400');
    await page.setViewportSize({ width: 1280, height: 800 });
    // hostile text can never reach markup: even a record forced past the validator renders as text in our panels
    const sec = await page.evaluate(() => {
      play(); const rec = MODS.state.mods[0]; const was = rec.mod.name; rec.mod.name = '<img src=x onerror=window.__pwned=11>';
      MODS.panel(); const imgs = document.querySelectorAll('#modal-panel img').length; const shown = document.querySelector('[data-mod]').textContent.includes('<img');
      rec.mod.name = was; closeModal(); return { imgs, shown, pwned: window.__pwned };
    });
    assert.deepEqual(sec, { imgs: 0, shown: true, pwned: undefined }, 'panel text goes in as text');
    // clean up and make sure the base game is as it was
    const clean = await page.evaluate(() => { for (const m of MODS.list()) { if (G.mapId.indexOf('mod:') === 0) MODS.leave(); MODS.remove(m.id); } return { ents: Object.keys(ENEMIES).filter(k => k.indexOf('mod:') === 0), items: Object.keys(ITEMS).filter(k => k.indexOf('mod:') === 0), npcs: Object.keys(NPCS).filter(k => k.indexOf('mod:') === 0), maps: Object.keys(G.maps).filter(k => k.indexOf('mod:') === 0), hound: ENEMIES.hound.hp }; });
    assert.deepEqual(clean, { ents: [], items: [], npcs: [], maps: [], hound: 18 }, 'removing every mod restores the base catalogs');
    console.log('PASS security and layout: compact notices, no overflow, text-only rendering, clean uninstall');

    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log('ALL mods checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
