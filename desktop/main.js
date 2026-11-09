'use strict';
// Electron shell for Echoes of the Shattered Octave. It loads the browser game unchanged from the repo root
// (or from resources/game in a packaged build) through a read-only custom protocol, app://game/.
const { app, BrowserWindow, Menu, protocol, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const sec = require('./security');

const TITLE = 'Echoes of the Shattered Octave';
// Dev: the repo root (one level above desktop/). Packaged: copied to resources/game by electron-builder extraResources.
const GAME_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'game') : path.resolve(__dirname, '..');

// Must run before app is ready. 'standard' + 'secure' give the game a real, persistent origin
// (app://game) so localStorage saves, AudioContext, fullscreen and pointer lock behave as on https.
protocol.registerSchemesAsPrivileged([{
  scheme: sec.SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: false },
}]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};

// Files are read with fs (not net.fetch on file://) so the session's request filter can stay "app only".
// Range requests are answered by hand because the MP3 score is streamed by an <audio> element.
function serveFile(file, request) {
  let st;
  try { st = fs.statSync(file); } catch (e) { return new Response('Not found', { status: 404 }); }
  if (!st.isFile()) return new Response('Not found', { status: 404 });
  const headers = {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Security-Policy': sec.CSP,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  let start = 0, end = st.size - 1, status = 200;
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (m && (m[1] || m[2])) {
    if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(end, Number(m[2])); }
    else { start = Math.max(0, st.size - Number(m[2])); }
    if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${st.size}` } });
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${st.size}`;
  }
  headers['Content-Length'] = String(st.size === 0 ? 0 : end - start + 1);
  const body = st.size === 0 ? null : Readable.toWeb(fs.createReadStream(file, { start, end }));
  return new Response(body, { status, headers });
}

function registerProtocol() {
  protocol.handle(sec.SCHEME, (request) => {
    const file = sec.resolveGamePath(request.url, GAME_ROOT);
    return file ? serveFile(file, request) : new Response('Not found', { status: 404 });
  });
}

function lockDownSession(ses) {
  // Deny every permission except full screen and pointer lock.
  ses.setPermissionRequestHandler((wc, permission, cb) => cb(sec.ALLOWED_PERMISSIONS.has(permission)));
  ses.setPermissionCheckHandler((wc, permission) => sec.ALLOWED_PERMISSIONS.has(permission));
  // Defence in depth on top of the CSP: nothing leaves the app.
  ses.webRequest.onBeforeRequest((details, cb) => cb({ cancel: !sec.isAllowedRequestUrl(details.url) }));
}

function toggleFullScreen() { if (win) win.setFullScreen(!win.isFullScreen()); }

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Game',
      submenu: [
        // F11 here; Alt+Enter is handled by the game itself (it calls document.requestFullscreen).
        { label: 'Toggle Full Screen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', click: toggleFullScreen },
        { type: 'separator' },
        ...(isMac ? [{ role: 'close' }] : [{ role: 'quit' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [{
        label: 'About',
        click: () => dialog.showMessageBox(win, {
          type: 'info', title: TITLE, message: TITLE,
          detail: `Desktop shell ${app.getVersion()}\nElectron ${process.versions.electron}, Chromium ${process.versions.chrome}\nRuns fully offline. Saves live in this app's own storage; use the in-game Save code to back them up.`,
        }),
      }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 640, minHeight: 400,
    title: TITLE, backgroundColor: '#1a1410', show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
      devTools: !app.isPackaged,
      // Keep the game loop and gamepad polling alive if the window loses focus briefly.
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.on('page-title-updated', (e) => e.preventDefault()); // keep the fixed window title
  // No new windows, no navigation away from the app, no webviews.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(sec.ORIGIN + '/')) e.preventDefault(); });
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.on('will-redirect', (e, url) => { if (!url.startsWith(sec.ORIGIN + '/')) e.preventDefault(); });
  win.on('closed', () => { win = null; });
  win.loadURL(sec.ORIGIN + '/index.html');
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('web-contents-created', (e, contents) => {
  contents.on('will-attach-webview', (ev) => ev.preventDefault());
});

app.whenReady().then(() => {
  registerProtocol();
  lockDownSession(session.defaultSession);
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
