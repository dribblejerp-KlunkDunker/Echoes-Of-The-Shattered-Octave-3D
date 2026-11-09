'use strict';
// Pure security helpers for the desktop shell. No Electron import, so test/desktop.test.js can load it in plain Node.
const path = require('path');

const SCHEME = 'app';
const HOST = 'game';
const ORIGIN = `${SCHEME}://${HOST}`;

// The game has no network dependencies (fonts are bundled), so every remote origin is blocked.
// 'unsafe-inline' for style only: modules inject <style> elements and the UI sets style attributes.
// Scripts are 'self' only: no inline script, no eval. blob:/data: for images, audio and the save-file download.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

// Only these top-level entries of the repo root are served; tests, desktop/, .git and the like never are.
const ALLOWED_TOP = new Set(['index.html', 'manifest.webmanifest', 'phase1_stealth_law_gameplay.js', 'css', 'js', 'img', 'fonts', 'music', 'locales', 'voices', 'assets']);   // Phase 18: the web-app manifest and its icons (the service worker itself only runs on http(s))

// Map a request URL to an absolute file under gameRoot, or null if it is not allowed.
function resolveGamePath(requestUrl, gameRoot) {
  let u;
  try { u = new URL(requestUrl); } catch (e) { return null; }
  if (u.protocol !== SCHEME + ':' || u.host !== HOST) return null;
  let p;
  try { p = decodeURIComponent(u.pathname); } catch (e) { return null; }
  if (p.includes('\0') || p.includes('\\')) return null;
  if (p === '/' || p === '') p = '/index.html';
  const rel = path.posix.normalize(p).replace(/^\/+/, '');
  if (rel.startsWith('..') || rel.split('/').includes('..')) return null;
  if (!ALLOWED_TOP.has(rel.split('/')[0])) return null;
  const abs = path.resolve(gameRoot, rel);
  const root = path.resolve(gameRoot) + path.sep;
  return abs.startsWith(root) ? abs : null;
}

// Requests the page may make at all (checked again in session.webRequest as defence in depth).
function isAllowedRequestUrl(url) {
  return /^(app:\/\/game\/|data:|blob:app:\/\/game\/|devtools:)/.test(url);
}

// Permissions the game needs: full screen and pointer lock only. Gamepad needs no permission in Chromium.
const ALLOWED_PERMISSIONS = new Set(['fullscreen', 'pointerLock']);

module.exports = { SCHEME, HOST, ORIGIN, CSP, ALLOWED_TOP, ALLOWED_PERMISSIONS, resolveGamePath, isAllowedRequestUrl };
