// ============================================================
//  r11hud — ROADMAP R11 phase 1, team HUD: the bronze bar of the benchmark pictures, for the real game.
//  While the art style is Realistic (R11.style() === 'realistic'; before CORE's R11 exists, localStorage 'octave.r11.v1'
//  .style, default 'realistic') a DOM bar lies exactly over the canvas HUD band (the bottom quarter of #game), so the old
//  band never shows through and the 3D view keeps every pixel it had. Pixel style hides it and the canvas band is back.
//  Switching is live (checked every frame, and on R11's 'style' event).
//  What it shows, all the game's own:
//    * three vials for the game's three bars, named as the Character sheet names them (Health, Fatigue, Voice), the
//      Glassing bar beside them when the arm is glassed, and the Narrow (how loud you are) as the old bar had it;
//    * the game's buttons, read from HUD_BTNS (CHAR INV SONG LOG / MAP REST NAMES HELP / MURMUR SAVE WEAPON). Each one
//      calls hudClick() at that button's own centre, exactly what a click on the old band did. A compact bar (phones,
//      narrow screens, touch controls) keeps the first four and a MORE button that opens the rest above the bar;
//    * the equipped weapon (a drawing of it and the game's name for it, with its ammunition count as the old bar had it)
//      and the Narrow word the old centre panel showed under it;
//    * a compass rose that turns with Engine.cam.dir (north up when you face north);
//    * the place (G.map.name), "<weekday> · <time of day>" exactly as the old bar wrote it, and under that whatever the old
//      centre panel's last line held (the Reach calendar's date from js/calendar11.js, or a timer: GREENING, HOLD...).
//      Those two panel lines are read from the canvas bar as it is drawn (a wrapper on drawHUD records the fillText
//      calls in those two slots), so every module that writes there is honoured and nothing is formatted twice.
//  Presentation only: no game state is written, no input is changed (keys and gamepad untouched; the wheel and right
//  button over the bar are passed on to the canvas as before). French: every label goes through js/story-i18n.js.
//  Automation (navigator.webdriver): hidden unless the page set window.__r11 = { automation: true } before load.
// ============================================================
'use strict';

const R11HUD = (function () {
  const KEY = 'octave.r11.v1';
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const TX = {
    bar: S('Game bar'), vitals: S('Health, Fatigue and Voice'), health: S('Health'), fatigue: S('Fatigue'), voice: S('Voice'),
    glass: 'Glassing', narrow: S('The Narrow: how loud you are'), more: S('MORE'), moreAria: S('More buttons'),
    weapon: S('Equipped weapon'), compass: S('Compass'), place: S('Where you are'),
  };
  // what each of the game's buttons does, for its tooltip (the game's own panel names)
  const TIPS = {
    CHAR: S('Character'), INV: S('Inventory'), SONG: S('Song-book'), LOG: S('Logbook'), MAP: S('Map'), REST: S('Rest'),
    NAMES: S('The Ledger'), HELP: S('How to play'), MURMUR: S('Murmur'), SAVE: S('Options'), WEAPON: S('Next weapon'),
  };
  // tooltips built at run time from patterns that already have French (the Character sheet's own lines), plus one new one
  S('Health {0} / {1}'); S('Fatigue {0} / {1}'); S('Voice {0} / {1}'); S('Glassing {0}%');
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11hud: ' + k + ' failed', e); } catch (e2) { /* fine */ } } };
  const st = { built: false, shown: false, compact: false, more: false, last: {}, cap: { narrow: null, status: null }, frames: 0, raf: 0, btnSig: '' };
  let bar = null, morePanel = null, els = {};

  // ---------------------------------------------------------------- the style switch
  function automationBlocked() {
    let wd = false; try { wd = !!navigator.webdriver; } catch (e) { wd = false; }
    if (!wd) return false;
    return !(window.__r11 && window.__r11.automation);
  }
  function style() {
    try { if (typeof window.R11 !== 'undefined' && window.R11 && typeof window.R11.style === 'function') { const s = window.R11.style(); if (s === 'realistic' || s === 'pixel') return s; } } catch (e) { warnOnce('R11.style', e); }
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && (o.style === 'realistic' || o.style === 'pixel')) return o.style; } catch (e) { /* storage blocked */ }
    return 'realistic';
  }
  const active = () => !automationBlocked() && style() === 'realistic';

  // ---------------------------------------------------------------- French
  function loc() { try { return window.STORY_I18N ? window.STORY_I18N.locale : 'en'; } catch (e) { return 'en'; } }
  function tr(en) {
    if (typeof en !== 'string' || !en) return en;
    try { if (loc() !== 'en' && window.STORY_I18N) { const o = window.STORY_I18N.translate(en); if (o != null) return o; } } catch (e) { warnOnce('translate', e); }
    return en;
  }
  const COMPASS_FR = { N: 'N', E: 'E', S: 'S', W: 'O' };
  // write text only when the English or the language changed (no per-frame DOM churn, no tug of war with the observer)
  function put(el, en, attr) {
    if (!el) return;
    const k = loc() + '|' + en, slot = attr ? '_r11a_' + attr : '_r11t';
    if (el[slot] === k) return;
    el[slot] = k; const v = en ? tr(en) : '';
    if (attr) el.setAttribute(attr, v); else el.textContent = v;
  }

  // ---------------------------------------------------------------- weapon drawings (120 x 28, point to the right)
  const blade = (len, w, guard, grip, steel, edge) => {
    const tip = 18 + grip + 6 + len, b0 = 18 + grip + 6, h = w / 2;
    return `<defs><linearGradient id="r11hbl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${steel[0]}"/><stop offset=".5" stop-color="${steel[1]}"/><stop offset="1" stop-color="${steel[2]}"/></linearGradient></defs>` +
      `<path d="M${b0} ${14 - h} L${tip - 8} ${14 - h * 0.8} L${tip} 14 L${tip - 8} ${14 + h * 0.8} L${b0} ${14 + h} Z" fill="url(#r11hbl)" stroke="#2b2f33" stroke-width=".8"/>` +
      `<path d="M${b0 + 2} 14 L${tip - 10} 14" stroke="${edge}" stroke-width=".9"/>` +
      `<rect x="${b0 - 4}" y="${14 - guard / 2}" width="4.5" height="${guard}" rx="1.4" fill="#b8913f" stroke="#3a2a12" stroke-width=".8"/>` +
      `<rect x="${b0 - 4 - grip}" y="11.7" width="${grip}" height="4.6" rx="2" fill="#4a2f1a" stroke="#1d120a" stroke-width=".8"/>` +
      `<circle cx="${b0 - 6 - grip}" cy="14" r="3.4" fill="#b8913f" stroke="#3a2a12" stroke-width=".8"/>`;
  };
  const haft = (x0, x1) => `<rect x="${x0}" y="12.3" width="${x1 - x0}" height="3.4" rx="1.6" fill="#6a4526" stroke="#24150b" stroke-width=".8"/>`;
  const STEEL = ['#f4f6f8', '#a9b0b8', '#5d646c'], IRON = ['#d9dcdf', '#8e959c', '#4e545a'];
  const DRAW = {
    sword: () => blade(70, 5, 17, 15, IRON, '#6c737a'),
    longsword: () => blade(80, 4.6, 20, 18, STEEL, '#7c838a'),
    knife: () => blade(42, 4.4, 10, 14, IRON, '#6c737a'),
    axe: () => haft(10, 100) + '<path d="M86 4 C96 6 104 9 108 6 L110 22 C104 19 96 22 86 24 Z" fill="#9aa1a8" stroke="#2b2f33" stroke-width=".9"/><path d="M84 10 L74 14 L84 18 Z" fill="#7d848b" stroke="#2b2f33" stroke-width=".8"/>',
    mace: () => haft(12, 92) + '<ellipse cx="100" cy="14" rx="11" ry="9" fill="#b8913f" stroke="#3a2a12" stroke-width=".9"/><path d="M92 5 L100 1 L108 5 M92 23 L100 27 L108 23 M111 9 L115 14 L111 19" stroke="#8a6a2c" stroke-width="2" fill="none"/>',
    spear: () => haft(4, 92) + '<path d="M90 9 L114 9 M90 19 L114 19 M90 9 L90 19" stroke="#c49a4a" stroke-width="2.6" fill="none" stroke-linecap="round"/><rect x="86" y="11" width="6" height="6" rx="1" fill="#b8913f" stroke="#3a2a12" stroke-width=".7"/>',
    maul: () => haft(8, 88) + '<rect x="86" y="3" width="24" height="22" rx="2" fill="#5d646c" stroke="#1f2326" stroke-width=".9"/><circle cx="98" cy="14" r="5" fill="#d8c08c" stroke="#3a2a12" stroke-width=".8"/><path d="M98 14 L100.5 11" stroke="#3a2a12" stroke-width="1"/>',
    crossbow: () => '<rect x="8" y="12" width="88" height="5" rx="2" fill="#6a4526" stroke="#24150b" stroke-width=".8"/><path d="M84 2 Q74 14 84 26" stroke="#5d646c" stroke-width="3" fill="none"/><path d="M84 3 L58 14 L84 25" stroke="#d8cdb0" stroke-width=".8" fill="none"/><path d="M60 14 L112 14" stroke="#9aa1a8" stroke-width="1.6"/><path d="M108 11.5 L114 14 L108 16.5 Z" fill="#9aa1a8"/>',
    pistol: () => '<path d="M20 22 L28 10 L40 10 L36 24 Z" fill="#6a4526" stroke="#24150b" stroke-width=".8"/><rect x="28" y="8" width="70" height="5.5" rx="1.5" fill="#8e959c" stroke="#2b2f33" stroke-width=".8"/><circle cx="98" cy="10.8" r="2.4" fill="#5fe8ff" opacity=".85"/><rect x="34" y="13" width="14" height="3" fill="#b8913f"/>',
    glass: () => '<defs><linearGradient id="r11hgl" x1="0" x2="1"><stop offset="0" stop-color="#1b7f95" stop-opacity=".7"/><stop offset=".6" stop-color="#5fe8ff" stop-opacity=".85"/><stop offset="1" stop-color="#c9fbff"/></linearGradient></defs><path d="M6 10 L70 8 L84 5 L100 6 L112 10 L110 17 L96 21 L82 20 L70 19 L6 18 Z" fill="url(#r11hgl)" stroke="#a8f4ff" stroke-width=".9"/><path d="M14 14 L60 13 L80 12 L98 14" stroke="#6fe08a" stroke-width="1.1" fill="none"/><path d="M84 6 L90 14 L84 20 M98 7 L102 14" stroke="#e6fdff" stroke-width=".6" fill="none" opacity=".7"/>',
    hands: () => '<path d="M30 10 C44 6 70 6 84 9 C94 8 104 10 106 14 C104 19 94 21 84 19 C70 22 44 22 30 18 Z" fill="#7a5236" stroke="#2a1a0e" stroke-width=".9"/><path d="M86 10 L86 18 M94 9.5 L94 18.5 M100 11 L100 17" stroke="#3a2414" stroke-width=".8"/>',
  };
  function weaponSvg(wid) {
    const f = Object.prototype.hasOwnProperty.call(DRAW, wid) ? DRAW[wid] : null;
    if (f) return '<svg viewBox="0 0 120 28" aria-hidden="true" focusable="false">' + f() + '</svg>';
    return null;
  }

  // ---------------------------------------------------------------- build
  const COMPASS_SVG = '<svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">' +
    '<circle r="44" fill="none" stroke="#5a4223" stroke-width="1"/>' +
    '<g class="r11h-rose">' +
    '<path d="M0 -34 L6 0 L0 34 L-6 0 Z" fill="#d9b77a" stroke="#3a2a12" stroke-width="1"/>' +
    '<path d="M-34 0 L0 -6 L34 0 L0 6 Z" fill="#9c7b46" stroke="#3a2a12" stroke-width="1"/>' +
    '<path d="M0 -34 L6 0 L0 0 Z" fill="#f5e2b0"/>' +
    '<path d="M-17 -17 L0 -4 L17 17 L0 4 Z" fill="#6e5530" opacity=".7"/><path d="M17 -17 L4 0 L-17 17 L-4 0 Z" fill="#6e5530" opacity=".7"/>' +
    '<text data-c="N" x="0" y="-37" fill="#ecd6a0" font-family="Cinzel, serif" font-weight="700" font-size="12" text-anchor="middle" dominant-baseline="middle">N</text>' +
    '<text data-c="S" x="0" y="38" fill="#b9b2a5" font-family="Cinzel, serif" font-size="10" text-anchor="middle" dominant-baseline="middle">S</text>' +
    '<text data-c="E" x="38" y="0" fill="#b9b2a5" font-family="Cinzel, serif" font-size="10" text-anchor="middle" dominant-baseline="middle">E</text>' +
    '<text data-c="W" x="-38" y="0" fill="#b9b2a5" font-family="Cinzel, serif" font-size="10" text-anchor="middle" dominant-baseline="middle">W</text>' +
    '</g><circle r="3" fill="#ecd6a0" stroke="#000"/><path d="M0 -47 L-3.5 -41 L3.5 -41 Z" fill="#ecd6a0" stroke="#000" stroke-width=".6"/></svg>';

  function mk(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function build() {
    const game = document.getElementById('game'); if (!game) return false;
    bar = mk('div'); bar.id = 'r11hud'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('data-i18n', 'off');
    const vials = mk('div', 'r11h-plate r11h-vials', bar); vials.setAttribute('role', 'group');
    els.vials = vials;
    els.hp = mk('div', 'r11h-vial hp', vials); mk('i', '', els.hp);
    els.fat = mk('div', 'r11h-vial fat', vials); mk('i', '', els.fat);
    els.voice = mk('div', 'r11h-vial voice', vials); mk('i', '', els.voice);
    els.glass = mk('div', 'r11h-vial glass', vials); mk('i', '', els.glass); els.glass.hidden = true;
    els.narrow = mk('div', 'r11h-narrow', vials); mk('i', '', els.narrow); mk('b', 'hound', els.narrow); mk('b', 'hush', els.narrow);
    for (const k of ['hp', 'fat', 'voice', 'glass', 'narrow']) { els[k].setAttribute('role', 'meter'); els[k].setAttribute('aria-valuemin', '0'); els[k].setAttribute('aria-valuemax', '100'); }
    els.btns = mk('div', 'r11h-plate r11h-btns', bar);
    const wp = mk('div', 'r11h-plate r11h-weapon', bar); els.weapon = wp;
    els.wico = mk('span', 'r11h-wico', wp);
    const wt = mk('div', 'r11h-wtext', wp); els.wname = mk('span', 'r11h-wname', wt); els.nword = mk('span', 'r11h-nword', wt);
    els.compass = mk('div', 'r11h-compass', bar); els.compass.innerHTML = COMPASS_SVG; els.compass.setAttribute('role', 'img');
    els.rose = els.compass.querySelector('.r11h-rose');
    const pl = mk('div', 'r11h-plate r11h-place', bar); els.place = pl;
    els.pname = mk('b', 'r11h-pname', pl); els.when = mk('small', 'r11h-when', pl); els.status = mk('small', 'r11h-status', pl);

    morePanel = mk('div'); morePanel.id = 'r11hud-more'; morePanel.hidden = true; morePanel.setAttribute('data-i18n', 'off'); morePanel.setAttribute('role', 'group');
    const mh = mk('div', 'r11h-mhead', morePanel); els.mhead = mh; els.mname = mk('b', '', mh); els.mwhen = mk('small', '', mh);
    els.mgrid = mk('div', 'r11h-mgrid', morePanel);

    // right after the game's canvases (#view, gpu18's, R3D's and R11's go before #fx): every overlay stays above
    const fx = document.getElementById('fx');
    if (fx && fx.parentNode === game) { game.insertBefore(bar, fx); game.insertBefore(morePanel, fx); } else { game.appendChild(bar); game.appendChild(morePanel); }

    // the bar takes the band's clicks; what the band did with the wheel and the other buttons is passed on unchanged
    const canvas = document.getElementById('view');
    bar.addEventListener('wheel', (ev) => { try { if (canvas) { ev.preventDefault(); canvas.dispatchEvent(new WheelEvent('wheel', ev)); } } catch (e) { warnOnce('wheel', e); } }, { passive: false });
    bar.addEventListener('contextmenu', (ev) => ev.preventDefault());
    bar.addEventListener('mousedown', (ev) => { if (ev.button !== 0 && canvas) { try { canvas.dispatchEvent(new MouseEvent('mousedown', ev)); } catch (e) { warnOnce('mousedown', e); } } });
    // keep focus off the buttons, so Space and Enter go on reaching the game, never re-press a button
    const noFocus = (ev) => { if (ev.target && ev.target.closest && ev.target.closest('button')) ev.preventDefault(); };
    bar.addEventListener('pointerdown', noFocus); morePanel.addEventListener('pointerdown', noFocus);
    document.addEventListener('pointerdown', (ev) => { if (st.more && !morePanel.contains(ev.target) && !(els.moreBtn && els.moreBtn.contains(ev.target))) setMore(false); }, true);
    st.built = true;
    syncButtons();
    return true;
  }

  // ---------------------------------------------------------------- the buttons
  function hudBtns() { try { return typeof HUD_BTNS !== 'undefined' && Array.isArray(HUD_BTNS) ? HUD_BTNS : []; } catch (e) { return []; } }
  // exactly what a click on the old band did: hudClick() at the centre of that button's rectangle (a module that wraps
  // hudClick or changes a button's f() is honoured), and only while playing, as the canvas handlers required
  function press(b, ev) {
    if (ev) ev.preventDefault();
    try {
      if (typeof G === 'undefined' || G.state !== 'play') return;
      setMore(false);
      if (typeof hudClick === 'function') hudClick(b.x + b.w / 2, b.y + b.h / 2);
      else { if (typeof Audio_ !== 'undefined') Audio_.sfx.ui(); b.f(); }
    } catch (e) { warnOnce('press ' + b.t, e); }
    try { if (document.activeElement && document.activeElement.blur && (bar.contains(document.activeElement) || morePanel.contains(document.activeElement))) document.activeElement.blur(); } catch (e) { /* fine */ }
  }
  function mkBtn(b, i, cls, parent) {
    const el = mk('button', cls, parent); el.type = 'button'; el.dataset.t = b.t; el.dataset.i = String(i);
    el.addEventListener('click', (ev) => press(b, ev));
    return el;
  }
  function syncButtons() {
    const list = hudBtns(), sig = list.map((b) => b.t).join('|');
    if (sig === st.btnSig) return; st.btnSig = sig;
    els.btns.textContent = ''; els.mgrid.textContent = ''; els.btnList = []; els.moreList = [];
    list.forEach((b, i) => {
      // the game's own rows: 4, 4, then the wider third row (MURMUR SAVE WEAPON)
      const row = i < 4 ? 0 : i < 8 ? 1 : 2;
      const cls = (i >= 4 ? 'r11h-extra ' : 'r11h-main ') + (row === 2 ? 'r11h-wide ' : '') + (row > 0 ? 'r11h-sub' : '');
      els.btnList.push({ el: mkBtn(b, i, cls.trim(), els.btns), b });
      if (i >= 4) els.moreList.push({ el: mkBtn(b, i, 'r11h-mbtn', els.mgrid), b });
    });
    const mb = mk('button', 'r11h-more', els.btns); mb.type = 'button'; mb.setAttribute('aria-expanded', 'false'); mb.setAttribute('aria-controls', 'r11hud-more');
    mb.addEventListener('click', (ev) => { ev.preventDefault(); setMore(!st.more); try { mb.blur(); } catch (e) { /* fine */ } });
    els.moreBtn = mb;
    st.last = {};
  }
  function setMore(on) {
    on = !!on && st.shown && st.compact;
    if (st.more === on) return; st.more = on;
    if (morePanel) morePanel.hidden = !on;
    if (els.moreBtn) els.moreBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  // ---------------------------------------------------------------- reading the old bar's two text slots
  // drawHUD still runs (modules depend on it); while the bar shows, the fillText calls in the centre panel's top line (the
  // Narrow word) and bottom line (the date, or a timer) are recorded with their colour. The canvas itself is untouched.
  function wrapDrawHUD() {
    if (typeof drawHUD !== 'function') return false;
    const _d = drawHUD;
    drawHUD = function () {
      if (!st.shown || typeof Engine === 'undefined' || !Engine.ctx) return _d.apply(this, arguments);
      const c = Engine.ctx, own = Object.prototype.hasOwnProperty.call(c, 'fillText'), prev = c.fillText;
      const VH0 = typeof VIEW_H === 'number' ? VIEW_H : 150;
      let narrow = null, status = null;
      c.fillText = function (t, x, y) {
        try {
          if (typeof t === 'string' && x >= 150 && x <= 226) {
            if (y >= VH0 + 8 && y <= VH0 + 16) narrow = { t, c: String(this.fillStyle) };
            else if (y >= VH0 + 36 && y <= VH0 + 48) status = { t, c: String(this.fillStyle) };
          }
        } catch (e) { /* recording only */ }
        return prev.apply(this, arguments);
      };
      try { return _d.apply(this, arguments); } finally {
        if (own) c.fillText = prev; else delete c.fillText;
        st.cap.narrow = narrow; st.cap.status = status; st.cap.frame = st.frames;
      }
    };
    return true;
  }

  // ---------------------------------------------------------------- per frame
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : (v || 0));
  function setVial(el, key, f, tip) {
    const pct = Math.round(clamp01(f) * 1000) / 10;
    if (st.last[key] !== pct) { st.last[key] = pct; el.firstChild.style.height = pct + '%'; el.setAttribute('aria-valuenow', String(Math.round(pct))); }
    put(el, tip, 'title'); put(el, tip, 'aria-label');
  }
  function wantShown() {
    if (!active() || !st.built) return false;
    if (typeof G === 'undefined' || !G || !G.player || !G.map) return false;
    if (G.state === 'title' || G.state === 'create' || G.state === 'intro' || G.state === 'ending' || G.state === 'loading') return false;
    try { if (window.CINEMATIC24 && window.CINEMATIC24.running()) return false; } catch (e) { /* none */ }
    return true;
  }
  function layout() {
    const game = document.getElementById('game');
    const w = bar.clientWidth || (game ? game.clientWidth : 0);
    const touch = !!(typeof G !== 'undefined' && G.touchMode) || (game && game.classList.contains('touchmode'));
    const compact = touch || w < 760;
    const noweapon = compact && w < 700, noplace = compact && w < 520;
    if (st.compact !== compact) { st.compact = compact; bar.classList.toggle('r11h-compact', compact); if (!compact) setMore(false); }
    bar.classList.toggle('r11h-noweapon', noweapon); bar.classList.toggle('r11h-noplace', noplace);
    if (els.mhead) els.mhead.hidden = !noplace;
  }
  function update() {
    st.frames++;
    if (!st.built) return;
    const want = wantShown();
    if (want !== st.shown) {
      st.shown = want; bar.hidden = !want; if (!want) setMore(false);
      const game = document.getElementById('game'); if (game) game.classList.toggle('r11hud-on', want);
      st.last = {};
    }
    if (!want) return;
    try {
      syncButtons(); layout();
      if (st.more && G.state !== 'play') setMore(false);
      const p = G.player;
      // vials, named as the Character sheet names them
      setVial(els.hp, 'hp', p.hp / p.hpMax, TX.health + ' ' + Math.ceil(p.hp) + ' / ' + p.hpMax);
      setVial(els.fat, 'fat', p.fat / p.fatMax, TX.fatigue + ' ' + Math.round(p.fat) + ' / ' + p.fatMax);
      setVial(els.voice, 'voice', p.voice / p.voiceMax, TX.voice + ' ' + Math.round(p.voice) + ' / ' + p.voiceMax);
      const glassed = !!p.glassed;
      if (els.glass.hidden === glassed) els.glass.hidden = !glassed;
      if (glassed) setVial(els.glass, 'glass', (p.glass || 0) / 100, TX.glass + ' ' + Math.round(p.glass || 0) + '%');
      const noise = typeof G.noise === 'number' ? G.noise : 0;
      setVial(els.narrow, 'narrow', noise / 10, TX.narrow);
      const nk = noise > 7 ? 'loud' : noise < 1.5 ? 'still' : '';
      if (st.last.nk !== nk) { st.last.nk = nk; els.narrow.classList.toggle('loud', nk === 'loud'); els.narrow.classList.toggle('still', nk === 'still'); }
      // buttons: the game's labels, in French when the game is
      for (const r of els.btnList) { put(r.el, r.b.t); put(r.el, TIPS[r.b.t] || r.b.t, 'title'); }
      for (const r of els.moreList) { put(r.el, r.b.t); put(r.el, TIPS[r.b.t] || r.b.t, 'title'); }
      put(els.moreBtn, TX.more); put(els.moreBtn, TX.moreAria, 'aria-label'); put(els.moreBtn, TX.moreAria, 'title');
      put(bar, TX.bar, 'aria-label'); put(els.vials, TX.vitals, 'aria-label'); put(morePanel, TX.moreAria, 'aria-label');
      // the weapon
      const wid = p.weapons && p.weapons[p.weapon], w = typeof currentWeapon === 'function' ? currentWeapon() : null;
      if (w) {
        const wkey = wid + '|' + (Object.prototype.hasOwnProperty.call(DRAW, wid) ? 'svg' : 'img');
        if (st.last.wkey !== wkey) {
          st.last.wkey = wkey; const svg = weaponSvg(wid);
          if (svg) els.wico.innerHTML = svg;
          else {
            els.wico.textContent = '';
            let url = null; try { url = window.ICONS && typeof wid === 'string' ? window.ICONS.url(wid) : null; } catch (e) { url = null; }
            if (url) { const im = mk('img', '', els.wico); im.alt = ''; im.src = url; } else els.wico.innerHTML = weaponSvg('sword');
          }
        }
        put(els.wname, w.name + (w.ammo ? ' · ' + (p[w.ammo] || 0) : ''));
        put(els.weapon, TX.weapon, 'aria-label');
      }
      const nw = st.cap.narrow;
      put(els.nword, nw ? nw.t : '');
      if (nw && st.last.nwc !== nw.c) { st.last.nwc = nw.c; els.nword.style.color = nw.c; }
      // the compass: the old strip's heading (0 = north), turned so north stays north
      const heading = (typeof Engine !== 'undefined' && Engine.cam ? Engine.cam.dir : 0) + Math.PI / 2;
      const deg = Math.round((-heading * 180 / Math.PI) * 10) / 10;
      if (st.last.deg !== deg) {
        st.last.deg = deg; els.rose.setAttribute('transform', 'rotate(' + deg + ')');
        // the letters ride round the rim but stay upright
        els.rose.querySelectorAll('text').forEach((t) => t.setAttribute('transform', 'rotate(' + (-deg) + ' ' + t.getAttribute('x') + ' ' + t.getAttribute('y') + ')'));
      }
      const L = loc();
      if (st.last.cloc !== L) {
        st.last.cloc = L;
        els.rose.querySelectorAll('text').forEach((t) => { const c = t.getAttribute('data-c'); t.textContent = L === 'fr' ? COMPASS_FR[c] : c; });
      }
      put(els.compass, TX.compass, 'aria-label');
      // the place, the weekday and time exactly as the old bar wrote them, then the old centre panel's last line
      const name = G.map.name || '';
      const when = (typeof DAYS !== 'undefined' && typeof timeName === 'function') ? DAYS[((G.day | 0) % 8 + 8) % 8] + ' · ' + timeName() : '';
      put(els.pname, name); put(els.when, when);
      // drawHUD not running lately (a pause, a test without frames): the calendar's own HUD word, as the bar would show
      const fresh = typeof st.cap.frame === 'number' && st.frames - st.cap.frame <= 3;
      let sline = fresh && st.cap.status ? st.cap.status.t : '';
      if (!fresh) { try { sline = window.CALENDAR11 ? window.CALENDAR11.hudWord() : ''; } catch (e) { sline = ''; } }
      put(els.status, sline);
      const sc = fresh && st.cap.status ? st.cap.status.c : '';
      if (st.last.sc !== sc) { st.last.sc = sc; els.status.style.color = sc || ''; }
      let tip = name;
      try { if (G.map.outdoor && typeof Weather !== 'undefined' && typeof weatherLine === 'function') tip += ' · ' + weatherLine(); } catch (e) { /* none */ }
      tip += '\n' + p.name + ' · Lv ' + p.level + ' · ' + p.gold + ' sov.' + (p.fragments ? '\nfragments ' + p.fragments : '');
      put(els.place, tip, 'title');
      if (st.more) { put(els.mname, name); put(els.mwhen, when); }
    } catch (e) { warnOnce('update', e); }
  }
  function loop() { st.raf = requestAnimationFrame(loop); update(); }

  // ---------------------------------------------------------------- init
  function init() {
    try { if (!build()) return; } catch (e) { warnOnce('build', e); return; }
    try { wrapDrawHUD(); } catch (e) { warnOnce('wrap', e); }
    // CORE's style event, whenever R11 appears (it may load after this file)
    let hooked = false;
    const hook = () => { if (hooked) return; try { if (window.R11 && typeof window.R11.on === 'function') { window.R11.on('style', () => update()); hooked = true; } } catch (e) { warnOnce('R11.on', e); } };
    hook(); window.addEventListener('r11three', hook);
    window.addEventListener('storage', (ev) => { if (ev.key === KEY) update(); });
    update(); loop();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  return {
    TEXTS, TX, TIPS, KEY, st, active, style, update, tr,
    shown: () => st.shown, compact: () => st.compact, more: () => st.more, setMore,
    els: () => els, bar: () => bar, panel: () => morePanel, weaponSvg,
  };
})();
if (typeof window !== 'undefined') window.R11HUD = R11HUD;
