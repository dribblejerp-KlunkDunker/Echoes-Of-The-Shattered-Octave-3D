// Static checks for the Electron desktop shell (no Electron needed). Run: node test/desktop.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let fails = 0;
function assert(c, l) { console.log((c ? 'PASS ' : 'FAIL ') + l); if (!c) fails++; }

const main = rd('desktop/main.js');
const sec = require(path.join(root, 'desktop/security.js'));
const pkg = JSON.parse(rd('desktop/package.json'));
const wf = rd('.github/workflows/desktop.yml');

// BrowserWindow security
assert(/contextIsolation:\s*true/.test(main), 'contextIsolation is true');
assert(/nodeIntegration:\s*false/.test(main), 'nodeIntegration is false');
assert(/sandbox:\s*true/.test(main), 'sandbox is true');
assert(/webSecurity:\s*true/.test(main) && /allowRunningInsecureContent:\s*false/.test(main), 'webSecurity on, insecure content off');
assert(!/enableRemoteModule|require\(['"]@electron\/remote|nodeIntegrationInWorker:\s*true|webSecurity:\s*false/.test(main), 'no remote module, no weakened security');
assert(/setWindowOpenHandler\(\(\)\s*=>\s*\(\{\s*action:\s*'deny'/.test(main), 'new windows denied');
assert(/will-navigate/.test(main) && /will-attach-webview/.test(main), 'navigation away and webviews blocked');
assert(/title:\s*TITLE/.test(main) && /const TITLE = 'Echoes of the Shattered Octave'/.test(main), 'window title is the game name');
assert(!/preload:/.test(main), 'no preload script exposed');
assert(/F11/.test(main) && /setFullScreen/.test(main), 'F11 toggles full screen');
assert(/requestSingleInstanceLock/.test(main), 'single instance lock');
assert(/devTools:\s*!app\.isPackaged/.test(main), 'devtools only in dev');

// Permissions
assert(sec.ALLOWED_PERMISSIONS.has('fullscreen') && sec.ALLOWED_PERMISSIONS.has('pointerLock') && sec.ALLOWED_PERMISSIONS.size === 2, 'only fullscreen and pointerLock permitted');
assert(/setPermissionRequestHandler/.test(main) && /setPermissionCheckHandler/.test(main), 'permission handlers installed');

// CSP: no remote origin of any kind, no eval, no inline script
const CSP = sec.CSP;
assert(!/https?:|wss?:|\*/.test(CSP), 'CSP names no remote origin or wildcard');
assert(/default-src 'none'/.test(CSP) && /script-src 'self'(;|$)/.test(CSP), "CSP default-src 'none', script-src 'self' only");
assert(!/unsafe-eval/.test(CSP) && !/script-src[^;]*unsafe-inline/.test(CSP), 'CSP forbids eval and inline script');
assert(/object-src 'none'/.test(CSP) && /frame-src 'none'/.test(CSP) && /base-uri 'none'/.test(CSP), 'CSP blocks plugins, frames, base');
assert(/style-src 'self' 'unsafe-inline'/.test(CSP), 'CSP allows inline style (modules inject <style>)');
assert(/media-src 'self'/.test(CSP) && /font-src 'self'/.test(CSP) && /img-src 'self' data: blob:/.test(CSP), 'CSP covers media, fonts, images');
assert(/Content-Security-Policy/.test(main), 'CSP is sent on every protocol response');

// The game's needs: every script/link in index.html is local and under an allowed top folder; no inline <script>.
const html = rd('index.html');
const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'));
assert(refs.length > 40 && refs.every((u) => !/^[a-z]+:/i.test(u) && !u.startsWith('//')), 'index.html references only local files (' + refs.length + ')');
assert(refs.every((u) => sec.resolveGamePath('app://game/' + u.split('?')[0], root) !== null), 'every referenced file is served by the protocol');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html), 'index.html has no inline script (CSP script-src self works)');
assert(!/https?:\/\//.test(html.replace(/xmlns='http:\/\/www\.w3\.org\/2000\/svg'/g, '')), 'index.html has no remote URL');

// Protocol path safety
const R = '/repo';
const ok = (u) => sec.resolveGamePath(u, R);
assert(ok('app://game/') === path.resolve(R, 'index.html'), '/ serves index.html');
assert(ok('app://game/js/game.js?v=31') === path.resolve(R, 'js/game.js'), 'query string ignored');
assert(ok('app://game/music/title.mp3') === path.resolve(R, 'music/title.mp3'), 'music served');
for (const bad of ['app://game/../etc/passwd', 'app://game/%2e%2e/etc/passwd', 'app://game/js/..%2f..%2fetc/passwd', 'app://game/test/security.test.js',
  'app://game/desktop/main.js', 'app://game/.git/config', 'app://game/js%5c..%5cdesktop', 'app://evil/index.html', 'https://example.com/index.html', 'app://game/js/%00.js']) {
  assert(ok(bad) === null, 'refused: ' + bad);
}
assert(sec.isAllowedRequestUrl('app://game/js/game.js') && sec.isAllowedRequestUrl('data:image/png;base64,AA') && !sec.isAllowedRequestUrl('https://example.com/') && !sec.isAllowedRequestUrl('file:///etc/passwd'), 'request filter allows app/data only');
assert(/onBeforeRequest/.test(main), 'session request filter installed');

// Shell points at the unchanged game
assert(/path\.resolve\(__dirname, '\.\.'\)/.test(main) && /process\.resourcesPath, 'game'/.test(main), 'loads game from repo root (dev) / resources/game (packaged)');
assert(!fs.existsSync(path.join(root, 'desktop/index.html')) && !fs.existsSync(path.join(root, 'desktop/js')), 'desktop/ holds no copy of the game');
const ex = pkg.build.extraResources[0];
assert(ex.from === '..' && ex.to === 'game' && ex.filter.includes('index.html') && ex.filter.includes('js/**/*') && !ex.filter.some((f) => /test|desktop|\.git|docs/.test(f)), 'packaged game copies only runtime folders');
for (const d of ['css', 'js', 'img', 'fonts', 'music', 'locales', 'voices']) assert(sec.ALLOWED_TOP.has(d) && fs.existsSync(path.join(root, d)), 'served folder exists: ' + d);

// electron-builder config
const b = pkg.build;
assert(b.appId === 'io.shatteredoctave.echoes' && b.productName === 'Echoes of the Shattered Octave', 'app id and product name');
const tg = (o) => o.target.map((t) => t.target);
assert(tg(b.win).includes('nsis') && tg(b.win).includes('portable'), 'Windows: nsis + portable');
assert(tg(b.mac).includes('dmg') && b.mac.target[0].arch.includes('universal'), 'macOS: dmg universal');
assert(tg(b.linux).includes('AppImage') && tg(b.linux).includes('deb'), 'Linux: AppImage + deb');
assert(b.mac.hardenedRuntime === true && fs.existsSync(path.join(root, 'desktop/build/entitlements.mac.plist')), 'macOS hardened runtime + entitlements');
assert(b.electronFuses && b.electronFuses.runAsNode === false, 'fuse runAsNode off');
for (const f of ['icon.png', 'icon.ico']) assert(fs.statSync(path.join(root, 'desktop/build', f)).size > 1000, 'icon present: ' + f);
const png = fs.readFileSync(path.join(root, 'desktop/build/icon.png'));
assert(png.readUInt32BE(16) === 1024 && png.readUInt32BE(20) === 1024, 'icon.png is 1024x1024');
assert(/^[~^]/.test(pkg.devDependencies.electron) === false && /^\d+\.\d+\.\d+$/.test(pkg.devDependencies.electron), 'electron version pinned exactly');
const gi = rd('desktop/.gitignore');
assert(/node_modules/.test(gi) && /dist/.test(gi), 'desktop/.gitignore covers node_modules and dist');

// Workflow
assert(/tags:\s*\[?'v\*'/.test(wf) && /workflow_dispatch/.test(wf), 'workflow: tag push + manual dispatch');
for (const r of ['windows-latest', 'macos-latest', 'ubuntu-latest']) assert(wf.includes('runner: ' + r), 'workflow matrix: ' + r);
assert(/upload-artifact@v6\.0\.0/.test(wf), 'workflow uploads artifacts with the Node 24 action runtime');
assert(/secrets\.WIN_CSC_LINK/.test(wf) && /secrets\.MAC_CSC_LINK/.test(wf) && /APPLE_TEAM_ID/.test(wf), 'workflow signing steps gated on secrets');
assert(/CSC_IDENTITY_AUTO_DISCOVERY/.test(wf) && !/secrets\.[A-Z_]+\s*(==|!=)\s*'[^']+'/.test(wf), 'unsigned build works with no secrets');
assert(/permissions:\s*\n\s*contents: read/.test(wf), 'workflow default permissions read-only');

// Docs and unchanged game
const docs = rd('docs/desktop.md');
for (const h of ['Licences', 'Signing', 'Auto-update', 'Platform input verification']) assert(new RegExp('^#+ .*' + h, 'm').test(docs), 'docs section: ' + h);

process.exit(fails ? 1 : 0);
