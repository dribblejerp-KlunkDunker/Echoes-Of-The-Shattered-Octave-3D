// PREVIEW_URL=http://127.0.0.1:<port> PLAYWRIGHT_MODULE=/path/to/playwright node test/pwa18.test.js
// Phase 18 PWA: manifest and icons, the offline file lists against index.html and the asset folders, the service
// worker (install, offline, Range, update), the update notice, "Keep saves on this device" on and off, hardcore and
// extras isolation, and no page errors.
//
// The runtime half serves the repository itself from a small node server of its own (random port, under the sub-path
// /echoes/ like GitHub Pages, with max-age=600 like GitHub Pages, and with sw.js replaceable) so that the update flow
// can be driven and the sub-path is exercised. PREVIEW_URL (the shared python server) is only used for one smoke check:
// the worker also registers at a domain root.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), cp = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const ROOT = path.resolve(__dirname, '..');
const PREVIEW = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
const SUB = '/echoes/';

const fails = [];
let passes = 0;
const check = (c, m) => { if (!c) { fails.push(m); console.log('FAIL: ' + m); } else { passes++; console.log('PASS: ' + m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------------------------------------ a tiny static server
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function serve(overrides, hits, port) {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (!u.pathname.startsWith(SUB)) { res.writeHead(404); res.end('outside the sub-path'); return; }
    let rel = decodeURIComponent(u.pathname.slice(SUB.length)); if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    if (hits) hits.push(rel);
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
    const head = { 'Cache-Control': 'public, max-age=600', 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' };
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, rel)) { const b = Buffer.from(overrides[rel]); res.writeHead(200, Object.assign(head, { 'Content-Length': b.length })); res.end(b); return; }
    fs.stat(file, (err, stt) => {
      if (err || !stt.isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, Object.assign(head, { 'Content-Length': stt.size })); fs.createReadStream(file).pipe(res);
    });
  });
  // stop() really ends the server (open connections too): "offline" below means nobody is there to answer
  const stop = () => new Promise((r) => { try { srv.closeAllConnections(); } catch (e) { /* older node */ } srv.close(() => r()); });
  return new Promise((resolve) => srv.listen(port || 0, '127.0.0.1', () => resolve({ srv, stop, base: 'http://127.0.0.1:' + srv.address().port + SUB })));
}

// ------------------------------------------------------------------------------------------------ static checks
function pngSize(file) { const b = fs.readFileSync(file); if (b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null; return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function swLists() {
  const src = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const grab = (name) => { const m = new RegExp('const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);').exec(src); return m ? JSON.parse(m[1]) : null; };
  return { src, core: grab('CORE'), media: grab('MEDIA'), build: (/const BUILD = ["']([0-9a-f]+)["']/.exec(src) || [])[1] };
}
function walkAll(dir, out) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walkAll(p, out); else out.push(p); } return out; }

function staticChecks() {
  // ---- manifest
  const mf = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  check(typeof mf.name === 'string' && mf.name.length > 3 && typeof mf.short_name === 'string' && mf.short_name.length <= 12, 'manifest has a name and a short_name of at most 12 characters');
  check(mf.start_url === './' && mf.scope === './' && !/^\//.test(mf.start_url), 'manifest start_url and scope are relative (they work under a Pages sub-path)');
  check(mf.display === 'standalone', 'manifest display is standalone');
  check(/^#[0-9a-f]{6}$/i.test(mf.background_color) && /^#[0-9a-f]{6}$/i.test(mf.theme_color), 'manifest has background and theme colours');
  const sizes = {};
  for (const ic of mf.icons || []) {
    const f = path.join(ROOT, ic.src), dim = fs.existsSync(f) ? pngSize(f) : null;
    sizes[ic.sizes + ':' + ic.purpose] = !!dim && ic.sizes === dim[0] + 'x' + dim[1] && ic.type === 'image/png' && !/^\//.test(ic.src);
  }
  check(sizes['192x192:any'] && sizes['512x512:any'] && sizes['512x512:maskable'], 'manifest icons exist as real PNGs of the declared size (192, 512, 512 maskable)');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  check(/<link rel="manifest" href="manifest\.webmanifest">/.test(html) && /<meta name="theme-color"/.test(html) && /rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon\.png"/.test(html) && pngSize(path.join(ROOT, 'assets/icons/apple-touch-icon.png')).join('x') === '180x180', 'index.html links the manifest, theme colour and a 180px touch icon');

  // ---- icons are reproducible from the committed generator
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa18-icons-'));
  const gen = require(path.join(ROOT, 'tools/pwa/icons.js'));
  let same = true; for (const [name, size, scale] of gen.ICONS) same = same && Buffer.compare(gen.png(size, gen.draw(size, scale)), fs.readFileSync(path.join(ROOT, 'assets/icons', name))) === 0;
  check(same, 'the icons in assets/icons are exactly what tools/pwa/icons.js draws');
  fs.rmSync(tmp, { recursive: true, force: true });

  // ---- the offline lists against index.html and the asset folders (own parsing, not the tool's)
  const L = swLists();
  check(Array.isArray(L.core) && Array.isArray(L.media) && /^[0-9a-f]{12}$/.test(L.build || ''), 'sw.js carries CORE, MEDIA and BUILD');
  check(new Set(L.core).size === L.core.length && new Set(L.media).size === L.media.length, 'the lists have no duplicates');
  check(L.core.concat(L.media).every((p) => !/^\/|\.\.|^[a-z]+:/i.test(p)), 'every entry is relative and stays inside the folder');
  check(L.core.every((p) => fs.existsSync(path.join(ROOT, p.split('?')[0]))) && L.media.every((p) => fs.existsSync(path.join(ROOT, p))), 'every listed file exists');
  const cur = cp.spawnSync(process.execPath, [path.join(ROOT, 'tools/pwa/precache.js'), '--check']);
  check(cur.status === 0, 'tools/pwa/precache.js --check says sw.js is current (' + String(cur.stdout).trim() + String(cur.stderr).trim() + ')');
  const refs = []; const re = /<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*"([^"#]*)"/gi; let m;
  while ((m = re.exec(html))) if (!/^(data:|https?:|\/\/)/i.test(m[1])) refs.push(m[1]);
  const missingRefs = refs.filter((r) => !L.core.includes(r));
  check(refs.length > 100 && missingRefs.length === 0, 'every file index.html loads is precached, ?v= tags included (' + refs.length + ' references' + (missingRefs.length ? '; missing ' + missingRefs.slice(0, 5).join(', ') : '') + ')');
  const scripts = refs.filter((r) => /^js\//.test(r)).map((r) => r.split('?')[0]);
  const jsOnDisk = fs.readdirSync(path.join(ROOT, 'js')).filter((n) => n.endsWith('.js')).map((n) => 'js/' + n);
  check(jsOnDisk.every((f) => scripts.includes(f)), 'every file in js/ is loaded by index.html (so none is fetched by another route)');
  // CSS url() targets
  const cssTargets = []; for (const css of ['css/fonts.css', 'css/style.css']) { const t = fs.readFileSync(path.join(ROOT, css), 'utf8'); const r2 = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g; let k; while ((k = r2.exec(t))) if (!/^(data:|https?:|#)/.test(k[1])) cssTargets.push(path.posix.normalize('css/' + k[1])); }
  check(cssTargets.length >= 11 && cssTargets.every((p) => L.core.includes(p)), 'every file the stylesheets name (fonts) is precached (' + cssTargets.length + ')');
  // folders: everything a runtime path can reach, by extension, minus the development files named here
  const DEV = /(^|\/)(README\.md|\.keep|build\.py|build-cache\.json|script\.json|script\.json\.|__pycache__)(\/|$)|\.txt$/;
  const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
  const want = (dir, exts) => walkAll(path.join(ROOT, dir), []).map(rel).filter((f) => exts.test(f) && !DEV.test(f));
  const coreWant = [].concat(want('img', /\.(jpe?g|png|webp|svg)$/i), want('fonts', /\.(woff2?|ttf|otf)$/i), want('locales', /\.json$/i), want('css', /\.css$/), want('js', /\.js$/), want('assets/icons', /\.png$/));
  const mediaWant = [].concat(want('music', /\.(mp3|ogg|m4a|wav)$/i), want('voices', /\.(mp3|ogg|m4a|wav)$/i));
  const coreLack = coreWant.filter((f) => !L.core.some((p) => p.split('?')[0] === f)), mediaLack = mediaWant.filter((f) => !L.media.includes(f));
  check(coreWant.length > 150 && coreLack.length === 0, 'every image, font, translation, stylesheet and script on disk is in CORE (' + coreWant.length + ' files' + (coreLack.length ? '; missing ' + coreLack.slice(0, 5).join(', ') : '') + ')');
  check(mediaWant.length > 200 && mediaLack.length === 0, 'every music and voice file on disk is in MEDIA (' + mediaWant.length + ' files' + (mediaLack.length ? '; missing ' + mediaLack.slice(0, 5).join(', ') : '') + ')');
  const unknown = walkAll(path.join(ROOT, 'img'), []).concat(walkAll(path.join(ROOT, 'locales'), [])).map(rel).filter((f) => !DEV.test(f) && !coreWant.includes(f));
  check(unknown.length === 0, 'no file of an unrecognised kind sits in img/ or locales/ (' + unknown.slice(0, 3).join(', ') + ')');
  // the game's own sources name only files that are listed: every quoted img/, music/, voices/, locales/ path in js/
  const named = new Set();
  for (const f of jsOnDisk) { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); const r3 = /['"`]((?:img|music|voices|locales)\/[A-Za-z0-9_./-]+\.(?:jpg|png|mp3|json))['"`?]/g; let k; while ((k = r3.exec(t))) named.add(k[1]); }
  const allListed = new Set(L.core.map((p) => p.split('?')[0]).concat(L.media));
  const unlisted = [...named].filter((p) => !allListed.has(p) && !/\$\{/.test(p));
  check(named.size > 5 && unlisted.length === 0, 'every literal asset path in js/ is listed (' + named.size + ' paths' + (unlisted.length ? '; unlisted ' + unlisted.slice(0, 5).join(', ') : '') + ')');

  // ---- the lists follow the site: a scratch copy that gains a file, a script tag or a sound makes --check fail
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa18-site-'));
  try {
    for (const d of ['css', 'js', 'img', 'fonts', 'locales', 'assets']) fs.cpSync(path.join(ROOT, d), path.join(scratch, d), { recursive: true });
    for (const f of ['index.html', 'sw.js', 'manifest.webmanifest']) fs.copyFileSync(path.join(ROOT, f), path.join(scratch, f));
    fs.mkdirSync(path.join(scratch, 'music'), { recursive: true }); fs.mkdirSync(path.join(scratch, 'voices/x'), { recursive: true });
    fs.writeFileSync(path.join(scratch, 'music/a.mp3'), 'a'); fs.writeFileSync(path.join(scratch, 'voices/x/b.mp3'), 'b');
    const tool = path.join(ROOT, 'tools/pwa/precache.js'), env = Object.assign({}, process.env, { PRECACHE_ROOT: scratch });
    const run = (...a) => cp.spawnSync(process.execPath, [tool, ...a], { env }).status;
    check(run() === 0 && run('--check') === 0, 'scratch site: precache.js writes sw.js and then --check passes');
    fs.writeFileSync(path.join(scratch, 'img/new_portrait.jpg'), 'x');
    check(run('--check') === 1, 'scratch site: a new picture in img/ makes --check fail');
    check(run() === 0 && run('--check') === 0, 'scratch site: regenerating fixes it');
    fs.writeFileSync(path.join(scratch, 'js/extra.js'), '//');
    const idx = fs.readFileSync(path.join(scratch, 'index.html'), 'utf8');
    fs.writeFileSync(path.join(scratch, 'index.html'), idx.replace('</body>', '<script src="js/extra.js?v=9"></script></body>'));
    check(run('--check') === 1, 'scratch site: a new script tag in index.html makes --check fail');
    check(run() === 0 && fs.readFileSync(path.join(scratch, 'sw.js'), 'utf8').includes('"js/extra.js?v=9"'), 'scratch site: the new script is cached under its own ?v= URL');
    fs.writeFileSync(path.join(scratch, 'index.html'), idx.replace('js/pwa18.js?v=2', 'js/pwa18.js?v=3'));
    check(run('--check') === 1, 'scratch site: bumping a ?v= tag alone makes --check fail');
    run();
    fs.writeFileSync(path.join(scratch, 'music/new.mp3'), 'n');
    check(run('--check') === 1, 'scratch site: a new sound in music/ makes --check fail');
    run();
    fs.writeFileSync(path.join(scratch, 'index.html'), idx.replace('js/pwa18.js?v=2', 'js/missing.js?v=1'));
    check(run('--check') === 2, 'scratch site: an index.html reference to a missing file is an error');
    fs.writeFileSync(path.join(scratch, 'index.html'), idx);
    // staging for Pages: exactly the served files, nothing of the repository's development material
    run();
    const stage = path.join(scratch, '_site');
    check(run('--stage', stage) === 0 && fs.existsSync(path.join(stage, 'index.html')) && fs.existsSync(path.join(stage, 'sw.js')) && fs.existsSync(path.join(stage, 'music/a.mp3')) && !fs.existsSync(path.join(stage, 'test')) && !fs.existsSync(path.join(stage, 'story')), 'scratch site: --stage copies the served files (and nothing else) for Pages');
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  check(fs.existsSync(path.join(ROOT, '.github/workflows/pages.yml')), 'the Pages workflow exists');
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/pages.yml'), 'utf8');
  check(/branches:\s*\[\s*main\s*\]/.test(wf) && /actions\/deploy-pages@/.test(wf) && /actions\/upload-pages-artifact@/.test(wf) && /pages:\s*write/.test(wf) && /id-token:\s*write/.test(wf) && /precache\.js/.test(wf), 'the workflow deploys on push to main with Pages permissions and runs the precache tool');
  const tsv = fs.readFileSync(path.join(ROOT, 'tools/i18n/p18-pwa.tsv'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('\t'));
  const T = fs.readFileSync(path.join(ROOT, 'js/pwa18.js'), 'utf8');
  const texts = [...T.slice(T.indexOf('const TX = {'), T.indexOf('const TEXTS')).matchAll(/:\s*'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
  const have = new Map(tsv.map((r) => [r[0], r[1]]));
  const noFr = texts.filter((t) => !have.has(t) || !have.get(t) || have.get(t) === t && t.length > 3);
  check(texts.length >= 20 && noFr.length === 0, 'every new string has a French line in tools/i18n/p18-pwa.tsv (' + texts.length + ' strings' + (noFr.length ? '; missing ' + noFr.slice(0, 3).join(' | ') : '') + ')');
}

// ------------------------------------------------------------------------------------------------ browser helpers
async function toGame(page, name) {
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 60000 });
  await page.locator('#btn-new').click(); await page.locator('#cname').fill(name || 'PWA Tester');
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
async function newPage(ctx, errors) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { let s = 18018; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; Math.random = r; });
  return page;
}
const idbDump = (page) => page.evaluate(() => new Promise((resolve) => {
  const names = ['octave18'];
  indexedDB.databases().then((dbs) => {
    if (!dbs.some((d) => d.name === 'octave18')) { resolve(null); return; }
    const rq = indexedDB.open('octave18');
    rq.onsuccess = () => {
      const d = rq.result; if (!d.objectStoreNames.contains('slots')) { d.close(); resolve({}); return; }
      const t = d.transaction('slots', 'readonly'), s = t.objectStore('slots'), out = {};
      const cur = s.openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out[c.key] = c.value; c.continue(); } };
      t.oncomplete = () => { d.close(); resolve(out); };
    };
    rq.onerror = () => resolve('error');
  }).catch(() => resolve('error'));
}));
const idbPutRaw = (page, key, value) => page.evaluate(([k, v]) => new Promise((resolve, reject) => {
  const rq = indexedDB.open('octave18', 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore('slots');
  rq.onsuccess = () => { const d = rq.result, t = d.transaction('slots', 'readwrite'); t.objectStore('slots').put(v, k); t.oncomplete = () => { d.close(); resolve(); }; t.onerror = () => reject(t.error); };
}), [key, value]);
async function waitIdb(page, pred, ms) { const end = Date.now() + (ms || 8000); let d; while (Date.now() < end) { d = await idbDump(page); if (pred(d)) return d; await sleep(120); } return d; }
const waitReady = (page) => page.waitForFunction(() => window.PWA18 && PWA18.state.sw === 'ready' && PWA18.state.controlled, null, { timeout: 90000 });

// ------------------------------------------------------------------------------------------------ main
(async () => {
  staticChecks();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const hits = [];
  const S = await serve(null, hits);
  let S1b = null;
  const L = swLists();
  try {
    // ---------------------------------------------------------------- 0. the preview server (a domain root): the worker registers there too
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await newPage(ctx, errors);
      await pg.goto(PREVIEW); await waitReady(pg);
      const sc = await pg.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r && r.scope));
      check(sc === PREVIEW.replace(/\/?$/, '/'), 'at a domain root the worker registers with the root as its scope (' + sc + ')');
      await ctx.close();
    }

    // ---------------------------------------------------------------- 1. first visit under the sub-path: install, cache, defaults
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await newPage(ctx, errors);
    const requested = new Set();
    page.on('request', (r) => { const u = new URL(r.url()); if (u.origin === new URL(S.base).origin && r.method() === 'GET') requested.add(u.pathname.slice(SUB.length) + u.search); });
    await page.goto(S.base);
    const early = await page.evaluate(() => ({ keep: PWA18.state.keep, notice: !!document.getElementById('pwa18-update'), api: typeof PWA18.setKeep, sw: PWA18.state.sw }));
    check(early.keep === 0 && !early.notice, 'a first visit: Keep saves is off and there is no update notice');
    await waitReady(page);
    check(true, 'the worker installed, activated and took control of the first page under ' + SUB);
    const cinfo = await page.evaluate(async (base) => {
      const keys = await caches.keys();
      const core = keys.find((k) => k.startsWith('octave-core-'));
      const c = await caches.open(core);
      const reqs = (await c.keys()).map((r) => r.url.slice(base.length));
      const reg = await navigator.serviceWorker.getRegistration();
      return { keys, reqs, scope: reg.scope, state: reg.active && reg.active.state, manifest: !!document.querySelector('link[rel=manifest]'), manifestOk: await fetch('manifest.webmanifest').then((r) => r.json()).then((j) => j.name).catch(() => null) };
    }, S.base);
    check(cinfo.scope === S.base, 'the worker scope is the sub-path folder itself (' + cinfo.scope + ')');
    check(cinfo.keys.includes('octave-core-' + L.build), 'the core cache is named for this build (' + L.build + ')');
    const cached = new Set(cinfo.reqs);
    check(L.core.every((p) => cached.has(p)) && cached.size === L.core.length + 1, 'the core cache holds every listed file (' + L.core.length + ') plus the folder URL');
    check(cinfo.manifestOk === 'Echoes of the Shattered Octave', 'the manifest is served and parses');

    // play a little so the page asks for what a session asks for
    await toGame(page, 'PWA Tester');
    await page.evaluate(async () => { G.state = 'panel'; renderMenu(); renderControls(); renderMenu(); renderSave(); closeModal(); G.state = 'play'; try { await ACCESS.setLocale('fr'); await ACCESS.setLocale('en'); } catch (e) { /* the test reports below */ } });
    await page.evaluate(() => { for (const id of ['tavern', 'oakhaven']) { try { loadMap(id); G.state = 'play'; } catch (e) { /* ignore */ } } });
    await page.waitForTimeout(800);
    // everything fetched so far is answered from a cache (precached, or media cached at first use) and was therefore in a list
    const reqs = [...requested].filter((u) => !/^sw\.js/.test(u));
    const inList = (u) => { const p = u.split('?')[0]; return L.core.includes(u) || L.core.some((c) => c.split('?')[0] === p) || L.media.includes(p) || p === '' || p === 'index.html'; };
    const stray = reqs.filter((u) => !inList(u));
    check(reqs.length > 150 && stray.length === 0, 'every file the game fetched in this session is in a list (' + reqs.length + ' requests' + (stray.length ? '; not listed: ' + stray.slice(0, 5).join(', ') : '') + ')');
    check(reqs.some((u) => /^locales\/fr\.json/.test(u)) && reqs.some((u) => /^locales\/story\/fr\.json/.test(u)), 'switching to French fetched the locale files, which are precached');
    const frontier = reqs.filter((u) => /^music\//.test(u) || /^voices\//.test(u)).length;
    console.log('info: audio files requested in this session: ' + frontier);

    // ---------------------------------------------------------------- 2. offline
    // a media file fetched online is cached at first use; answer Range requests offline from it
    const m0 = L.media.find((p) => /^music\/title\.mp3$/.test(p)) || L.media[0];
    const m1 = L.media.find((p) => p !== m0 && /^music\//.test(p) && ![...requested].some((u) => u.split('?')[0] === p));
    const first = await page.evaluate(async (p) => { const r = await fetch(p); const b = await r.arrayBuffer(); return { ok: r.ok, n: b.byteLength }; }, m0);
    check(first.ok && first.n > 10000, 'a music file is fetched online through the worker (' + m0 + ', ' + first.n + ' bytes)');
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__marker = 'before-offline'; });
    await ctx.setOffline(true);
    await S.stop();                                     // and the server is gone: only the worker's caches can answer
    const off = await page.evaluate(async ([p, q]) => {
      const out = {};
      const whole = await fetch(p).then(async (r) => ({ ok: r.ok, n: (await r.arrayBuffer()).byteLength })).catch(() => ({ err: true }));
      out.whole = whole;
      const rg = await fetch(p, { headers: { Range: 'bytes=10-109' } }).then(async (r) => ({ s: r.status, cr: r.headers.get('Content-Range'), n: (await r.arrayBuffer()).byteLength })).catch(() => ({ err: true }));
      out.range = rg;
      const tail = await fetch(p, { headers: { Range: 'bytes=-50' } }).then(async (r) => ({ s: r.status, n: (await r.arrayBuffer()).byteLength })).catch(() => ({ err: true }));
      out.tail = tail;
      const past = await fetch(p, { headers: { Range: 'bytes=999999999-' } }).then((r) => ({ s: r.status })).catch(() => ({ err: true }));
      out.past = past;
      out.uncachedMedia = await fetch(q, { headers: { Range: 'bytes=0-9' } }).then((r) => ({ s: r.status })).catch(() => ({ err: true }));
      // the real script URL the page shipped with (its ?v= cache-buster moves with the build; hard-coding one rots)
      const gsrc = [...document.querySelectorAll('script')].map((s) => s.getAttribute('src')).find((s) => s && /^js\/game\.js(\?|$)/.test(s)) || 'js/game.js';
      out.script = await fetch(gsrc).then((r) => r.ok).catch(() => false);
      out.unknown = await fetch('js/not-a-file.js').then((r) => r.status).catch(() => 'error');
      return out;
    }, [m0, m1]);
    check(off.whole.ok && off.whole.n === first.n, 'offline: the cached music file is served whole');
    check(off.range.s === 206 && off.range.n === 100 && new RegExp('^bytes 10-109/' + first.n + '$').test(off.range.cr), 'offline: a Range request is answered 206 with the right Content-Range (audio elements need this)');
    check(off.tail.s === 206 && off.tail.n === 50, 'offline: a suffix Range (bytes=-50) is answered from the cache');
    check(off.past.s === 416, 'offline: a Range past the end is answered 416');
    check(off.uncachedMedia.err === true, 'offline: a music file that was never cached fails cleanly (the game already copes with a missing track)');
    console.log('info: offline probe ' + JSON.stringify(off));
    check(off.script === true && off.unknown === 'error', 'offline: scripts are served from the cache; an unknown file fails instead of hanging');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.sprites.proctor && G.state === 'title', null, { timeout: 60000 });
    const gone = await page.evaluate(() => window.__marker);
    check(gone === undefined, 'offline: the page was really reloaded');
    check(await page.evaluate(() => document.title.indexOf('Shattered Octave') > 0 && !!document.getElementById('btn-new')), 'offline: a reload shows the title screen from the cache');
    await toGame(page, 'Offline Tester');
    await page.evaluate(async () => { loadMap('oakhaven'); G.state = 'play'; await ACCESS.setLocale('fr'); await ACCESS.setLocale('en'); });
    check(await page.evaluate(() => G.state === 'play' && G.mapId === 'oakhaven'), 'offline: a new game starts, a map loads and the language can change (scripts, pictures and translations are all cached)');
    const navOff = await ctx.newPage(); navOff.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await navOff.goto(S.base + 'index.html?x=1', { waitUntil: 'domcontentloaded' });
    check(await navOff.evaluate(() => document.title.indexOf('Shattered Octave') > 0), 'offline: a second tab opens the game at the sub-path with a query string');
    await navOff.close();
    await ctx.setOffline(false);
    S1b = await serve(null, hits, +new URL(S.base).port);      // the site comes back at the same address

    // ---------------------------------------------------------------- 3. Options rows, offline audio download
    await page.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    const rows = await page.evaluate(() => {
      const k = document.getElementById('pwa18-keep'), a = document.getElementById('pwa18-audio');
      const panel = document.getElementById('modal-panel');
      return { keep: k && k.textContent, audio: a && a.textContent, adis: a && a.disabled, hint: (document.getElementById('pwa18-keep-hint') || {}).textContent, overflow: panel.scrollWidth > panel.clientWidth + 1 };
    });
    check(rows.keep === 'Off' && /^(Download|Finish)/.test(rows.audio || '') && rows.adis === false, 'Options shows "Keep saves on this device: Off" and an enabled audio download once the worker controls the page (' + rows.audio + ')');
    check(rows.overflow === false, 'the new Options rows do not overflow the panel');
    await page.evaluate(() => document.getElementById('pwa18-audio').click());
    await page.waitForFunction((n) => PWA18.state.media.cached >= 3 || PWA18.state.media.busy, null, { timeout: 30000 });
    await page.evaluate(() => PWA18.post({ type: 'media-cancel' }));
    await page.waitForFunction(() => !PWA18.state.media.busy, null, { timeout: 60000 });
    const prog = await page.evaluate(() => ({ c: PWA18.state.media.cached, t: PWA18.state.media.total, txt: document.getElementById('pwa18-audio').textContent }));
    check(prog.t === L.media.length && prog.c >= 1 && prog.c <= prog.t && /^(Finish|Ready)/.test(prog.txt), 'the audio download runs, can be stopped, and offers to finish (' + prog.c + '/' + prog.t + ', "' + prog.txt + '")');
    await page.evaluate(() => closeModal());

    // ---------------------------------------------------------------- 4. update flow
    // a changed sw.js on the server: same lists, new BUILD. The old worker keeps serving until the player presses Reload.
    const v2 = L.src.replace(/const BUILD = ["'][0-9a-f]+["']/, "const BUILD = 'feedfacecafe'");
    check(v2 !== L.src, 'test setup: the second worker differs from the first');
    await ctx.close(); await S1b.stop();
    const live = {};                                    // overrides the server reads on every request
    const S3 = await serve(live, hits);
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p2 = await newPage(ctx2, errors);
    await p2.goto(S3.base); await waitReady(p2);
    await toGame(p2, 'Update Tester');
    await p2.evaluate(() => { window.__marker = 'v1'; });
    check(await p2.evaluate(() => !document.getElementById('pwa18-update')), 'no notice while the version on the server is the one running');
    live['sw.js'] = v2;                                 // the site is "redeployed"
    await p2.evaluate(() => PWA18.registration().update());
    await p2.waitForFunction(() => !!PWA18.waitingWorker(), null, { timeout: 60000 });
    check(true, 'a changed sw.js installs in the background and waits (no skipWaiting on its own)');
    await p2.waitForSelector('#pwa18-update:not([hidden])', { timeout: 10000 });
    const note = await p2.evaluate(() => ({ text: document.getElementById('pwa18-update').innerText, btn: (document.getElementById('pwa18-reload') || {}).textContent, dis: (document.getElementById('pwa18-reload') || {}).disabled, marker: window.__marker, state: G.state, ctl: navigator.serviceWorker.controller.scriptURL }));
    check(/A new version is ready — reload/.test(note.text) && note.btn === 'Reload' && note.dis === false, 'the notice says "A new version is ready — reload" with an enabled Reload button');
    await p2.waitForTimeout(2500);
    const still = await p2.evaluate(() => ({ marker: window.__marker, state: G.state, caches: null }));
    check(still.marker === 'v1' && still.state === 'play', 'the page did not reload or change state by itself while the update waited');
    const cacheNames = await p2.evaluate(() => caches.keys());
    check(cacheNames.includes('octave-core-' + L.build) && cacheNames.includes('octave-core-feedfacecafe'), 'the old build keeps its cache while the new one is stored beside it');
    // never in the middle of a fight
    await p2.evaluate(() => PWA18._fight(true));
    await p2.waitForFunction(() => { const b = document.getElementById('pwa18-reload'); return b && b.disabled; }, null, { timeout: 4000 });
    const fightNote = await p2.evaluate(() => document.getElementById('pwa18-reload').textContent);
    await p2.evaluate(() => document.getElementById('pwa18-reload').click());
    check(fightNote === 'After the fight' && (await p2.evaluate(() => window.__marker)) === 'v1', 'while an enemy is chasing, the button is disabled ("After the fight") and pressing it does nothing');
    await p2.evaluate(() => PWA18._fight(null));
    await p2.waitForFunction(() => { const b = document.getElementById('pwa18-reload'); return b && !b.disabled; }, null, { timeout: 4000 });
    // a game in progress is asked about once
    await p2.evaluate(() => document.getElementById('pwa18-reload').click());
    await p2.waitForFunction(() => /does not save your game/.test(document.getElementById('pwa18-update').innerText), null, { timeout: 4000 });
    check(true, 'with a game in progress the first press asks (a reload does not save)');
    await p2.evaluate(() => document.getElementById('pwa18-later').click());
    check(await p2.evaluate(() => document.getElementById('pwa18-update').hidden === true && window.__marker === 'v1'), '"Later" hides the notice and changes nothing');
    // a hardcore run has no reload button at all
    await p2.evaluate(() => { PWA18.offerUpdate(); G.player.hardcore = true; });
    await p2.waitForFunction(() => { const n = document.getElementById('pwa18-update'); return n && !n.hidden && /hardcore run/.test(n.innerText); }, null, { timeout: 4000 });
    check(await p2.evaluate(() => !document.getElementById('pwa18-reload') && PWA18.applyUpdate() === false), 'during a hardcore run the notice offers no Reload and applyUpdate refuses');
    await p2.evaluate(() => { G.player.hardcore = false; });
    await p2.evaluate(() => { PWA18.offerUpdate(); });
    await p2.waitForSelector('#pwa18-reload', { timeout: 4000 });
    await p2.evaluate(() => document.getElementById('pwa18-reload').click());
    await p2.waitForFunction(() => /does not save your game/.test(document.getElementById('pwa18-update').innerText), null, { timeout: 4000 });
    await p2.evaluate(() => document.getElementById('pwa18-reload').click());      // "Reload anyway"
    await p2.waitForFunction(() => window.__marker === undefined && typeof G !== 'undefined' && G.state === 'title', null, { timeout: 60000 });
    const after = await p2.evaluate(async () => ({ keys: await caches.keys(), url: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL, notice: !!document.getElementById('pwa18-update') && !document.getElementById('pwa18-update').hidden }));
    check(after.keys.includes('octave-core-feedfacecafe') && !after.keys.includes('octave-core-' + L.build), 'after Reload the new worker controls the page and the old build\'s cache is deleted (' + after.keys.join(', ') + ')');
    check(after.notice === false, 'no notice after the update is applied');
    await S3.stop();
    await ctx2.close();

    // ---------------------------------------------------------------- 5. persistence: off, then on
    const S5 = await serve(null, hits);
    const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    let p3 = await newPage(ctx3, errors);
    await p3.goto(S5.base + '?nosw=1');      // these checks need no worker; ?nosw=1 is the documented opt-out
    check(await p3.evaluate(() => PWA18.state.sw === 'idle' || PWA18.state.sw === 'unsupported'), '?nosw=1 keeps the worker out of the page (developers and tests that want none)');
    await toGame(p3, 'Keeper One');
    // OFF: today's behaviour. A slot is written in the page and nowhere else.
    await p3.evaluate(() => { G.state = 'panel'; renderSave(); });
    await p3.evaluate(() => document.querySelector('[data-slot="0"]').click());
    await p3.waitForTimeout(300);
    const offState = await p3.evaluate(async () => ({ slot: !!SLOTS[0], keep: PWA18.state.keep, ls: localStorage.getItem('octave.pwa18.v1'), dbs: (await indexedDB.databases()).map((d) => d.name) }));
    check(offState.slot && offState.keep === 0 && offState.ls === null && !offState.dbs.includes('octave18'), 'OFF (the default): saving to a slot touches no IndexedDB and writes no setting');
    await p3.reload({ waitUntil: 'domcontentloaded' });
    await p3.waitForFunction(() => G.state === 'title', null, { timeout: 60000 });
    await p3.locator('#btn-load').click();
    check(await p3.evaluate(() => SLOTS.every((s) => s === null) && /Slot 1 — empty/.test(document.getElementById('modal-panel').innerText)), 'OFF: after a reload the slots are empty, exactly as before');
    check(await p3.evaluate(async () => !(await indexedDB.databases()).some((d) => d.name === 'octave18')), 'OFF: the page never even opened the database');
    await p3.evaluate(() => { closeModal(); show('#title'); G.state = 'title'; });

    // ON
    await toGame(p3, 'Keeper Two');
    await p3.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); });
    await p3.evaluate(() => document.getElementById('pwa18-keep').click());
    check(await p3.evaluate(() => document.getElementById('pwa18-keep').textContent === 'On' && PWA18.state.keep === 1 && localStorage.getItem('octave.pwa18.v1') === '{"keep":1}'), 'turning it on is remembered (octave.pwa18.v1) and the row says On');
    await p3.evaluate(() => { closeModal(); G.state = 'panel'; renderSave(); });
    await p3.evaluate(() => document.querySelector('[data-slot="1"]').click());
    await p3.evaluate(() => { G.player.gold = 4242; G.state = 'panel'; renderSave(); });
    await p3.evaluate(() => document.querySelector('[data-slot="2"]').click());
    const dump = await waitIdb(p3, (d) => d && d[1] && d[2]);
    check(dump && typeof dump[1] === 'string' && typeof dump[2] === 'string' && dump[0] === undefined, 'ON: the slots saved are written to IndexedDB as JSON strings (slot 1 and 2; slot 0 empty)');
    if (!(dump && dump[1] && dump[2])) console.log('info: store holds ' + JSON.stringify(dump && Object.keys(dump)) + ' slots ' + await p3.evaluate(() => JSON.stringify(SLOTS.map((s) => !!s)) + JSON.stringify(PWA18.state)));
    const want = await p3.evaluate(() => JSON.stringify(SLOTS[2]));
    check(dump[2] === want, 'ON: what is stored is byte-for-byte the slot in the page');
    // reload: the slots come back
    await p3.reload({ waitUntil: 'domcontentloaded' });
    await p3.waitForFunction(() => G.state === 'title', null, { timeout: 60000 });
    await p3.waitForFunction(() => SLOTS[1] && SLOTS[2], null, { timeout: 8000 });
    await p3.locator('#btn-load').click();
    const panelTxt = await p3.evaluate(() => document.getElementById('modal-panel').innerText);
    check(/Keeper Two/.test(panelTxt) && /Slot 1 — empty/.test(panelTxt), 'ON: after a reload the Load screen lists the saved slots and the empty one');
    await p3.evaluate(() => document.querySelector('[data-slot="2"]').click());
    await p3.waitForFunction(() => G.state === 'play', null, { timeout: 15000 });
    check(await p3.evaluate(() => G.player.name === 'Keeper Two' && G.player.gold === 4242), 'ON: loading the restored slot gives back the same traveller and purse');

    // hostile and foreign data in the store is dropped on the way in
    await idbPutRaw(p3, 0, 'not json at all');
    await idbPutRaw(p3, 1, JSON.stringify({ v: 1, player: { name: '<img src=x onerror=alert(1)>', hardcore: true }, maps: {}, mapId: 'oakhaven' }));
    await idbPutRaw(p3, 2, JSON.stringify({ v: 1, player: { name: 'Extra', cls: 'cantor' }, flags: { p17x_on: 1 }, maps: {}, mapId: 'oakhaven' }));
    await p3.reload({ waitUntil: 'domcontentloaded' });
    await p3.waitForFunction(() => G.state === 'title' && PWA18.state.store !== 'unknown', null, { timeout: 60000 });
    await p3.waitForTimeout(300);
    check(await p3.evaluate(() => SLOTS.every((s) => s === null)), 'ON: a slot that is not JSON, one carrying a hardcore run and one carrying an extra\'s save are all refused when read');
    check(await p3.evaluate(() => PWA18.parseStored(JSON.stringify({ v: 1, player: {}, maps: {}, mapId: 5 })) === null && PWA18.parseStored('x'.repeat(9 * 1024 * 1024)) === null && PWA18.parseStored('[]') === null && PWA18.parseStored(5) === null), 'ON: wrong shapes, oversize values and non-strings are refused by the parser');

    // an ordinary slot, a hardcore run and an extra: isolation
    await toGame(p3, 'Keeper Three');
    await p3.evaluate(() => { G.state = 'panel'; renderSave(); });
    await p3.evaluate(() => document.querySelector('[data-slot="0"]').click());
    const base = await waitIdb(p3, (d) => d && typeof d[0] === 'string' && d[1] === undefined && d[2] === undefined);
    check(base && typeof base[0] === 'string' && Object.keys(base).length === 1, 'ON: the store tracks the slots (stale entries went when the slots were found empty and one new save was made)');
    // hardcore
    await p3.evaluate(() => { G.state = 'panel'; renderMenu(); document.querySelector('#mn-hardcore').click(); document.querySelector('#hc-yes').click(); });
    await p3.evaluate(() => { renderSave(); });
    const hcPanel = await p3.evaluate(() => ({ slots: document.querySelectorAll('#modal-panel [data-slot]').length, code: !!document.querySelector('#savecode'), hc: !!document.querySelector('#hc-save') }));
    check(hcPanel.slots === 0 && !hcPanel.code && hcPanel.hc, 'hardcore: the save screen still offers its single save and no session slots (unchanged)');
    await p3.evaluate(() => document.querySelector('#hc-save').click());
    await p3.evaluate(() => { PWA18.sync(); });
    await sleep(500);
    const hcDump = await idbDump(p3);
    check(await p3.evaluate(() => !!HARDCORE.save) && JSON.stringify(hcDump) === JSON.stringify(base) && !JSON.stringify(hcDump).includes('"hardcore":true'), 'hardcore: the hardcore save lives in the page only; the store is untouched and holds no hardcore run');
    check(await p3.evaluate(() => { const hc = JSON.parse(JSON.stringify(HARDCORE.save)); return PWA18.persistable(hc) === false; }), 'hardcore: persistable() refuses a hardcore payload outright');
    // leave hardcore (the test resets the flag the way hardcore.test.js does), then an extra
    await p3.evaluate(() => { HARDCORE.save = null; G.player.hardcore = false; closeModal(); G.state = 'play'; });
    await p3.evaluate(() => {
      EXTRAS17.state.ack = 1; EXTRAS17.state.done = 1;       // as if Book One were finished: the extras are open
      EXTRAS17.register({ id: 'p18demo', title: 'PWA demo extra', blurb: 'test only', unlocked: () => true, start() { loadMap('oakhaven'); G.flags.p18_demo = 1; G.state = 'play'; } });
    });
    const bookSlots = await p3.evaluate(() => JSON.stringify(SLOTS));
    check(await p3.evaluate(() => EXTRAS17.start('p18demo') && EXTRAS17.inExtra() === 'p18demo'), 'extras: an extra starts');
    await p3.evaluate(() => { G.state = 'panel'; renderSave(); });
    const xs = await p3.evaluate(() => ({ book: document.querySelectorAll('#modal-panel [data-slot]').length, x: document.querySelectorAll('#modal-panel button').length }));
    await p3.evaluate(() => { const b = document.querySelector('#modal-panel [id^="x17-save"], #modal-panel .slot button'); if (b) b.click(); });
    await p3.evaluate(() => PWA18.sync());
    await sleep(500);
    const xDump = await idbDump(p3);
    check(xs.book === 0 && JSON.stringify(xDump) === JSON.stringify(base), 'extras: inside an extra the Book One slots are not shown and the store is exactly as it was (the extra\'s save stays in its session)');
    check(await p3.evaluate(() => SLOTS.every((s) => s === null) && PWA18.state.keep === 1), 'extras: SLOTS are empty inside the extra and nothing was hydrated into them');
    await p3.evaluate(() => { closeModal(); EXTRAS17.finish(null); });
    await p3.waitForFunction(() => EXTRAS17.inExtra() === null, null, { timeout: 8000 });
    await p3.evaluate(() => PWA18.sync());
    await sleep(400);
    check((await p3.evaluate(() => JSON.stringify(SLOTS))) === bookSlots && JSON.stringify(await idbDump(p3)) === JSON.stringify(base), 'extras: after leaving, Book One\'s slots are back and the store is unchanged');
    // OFF again: the stored copies are deleted
    await p3.evaluate(() => { G.state = 'panel'; renderAccessibilityMenu(); document.getElementById('pwa18-keep').click(); });
    const cleared = await waitIdb(p3, (d) => d && Object.keys(d).length === 0);
    check(cleared && Object.keys(cleared).length === 0 && await p3.evaluate(() => PWA18.state.keep === 0 && localStorage.getItem('octave.pwa18.v1') === '{"keep":0}' && !!SLOTS[0]), 'turning it off deletes the stored copies and keeps this page\'s slots until it closes');
    await p3.evaluate(() => { G.state = 'panel'; renderSave(); });
    await p3.evaluate(() => document.querySelector('[data-slot="1"]').click());
    await sleep(400);
    check(Object.keys(await idbDump(p3)).length === 0, 'off again: saving writes nothing to the store');
    await S5.stop();
    await ctx3.close();
  } catch (e) {
    fails.push('exception: ' + (e && e.stack || e)); console.log('FAIL: exception: ' + (e && e.stack || e));
  } finally {
    try { await S.stop(); } catch (e) { /* stopped */ }
    try { await S1b.stop(); } catch (e) { /* stopped or never started */ }
    await browser.close();
  }
  check(errors.length === 0, 'no page errors or console errors (' + errors.slice(0, 3).join(' | ') + ')');
  console.log((fails.length ? 'FAILED ' + fails.length + ' of ' : 'ALL ') + (passes + fails.length) + ' checks' + (fails.length ? '' : ' passed'));
  process.exit(fails.length ? 1 : 0);
})();
