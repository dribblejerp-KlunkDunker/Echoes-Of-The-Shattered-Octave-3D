// origins — Phase 10 (the owner's picks): three Daggerfall-minded ways in and around the player.
//   1. A question-based class picker. Character creation gets "Answer questions…" beside the list of
//      callings; eleven questions about music, the Synod and the Hush weight the six callings that
//      already exist, and the answer is only ever a SUGGESTION. Accepting it does exactly what clicking
//      that calling and pressing Continue does (CREATE.cls = index; CREATE.step = 2), so the character
//      it makes is the one a manual pick makes. Nothing is stored.
//   2. Four interaction modes (Steal, Grab, Info, Talk), after Daggerfall's cursor modes. OFF by default
//      (Options > Graphics & access > "Interaction modes"). While it is off none of the wrappers here
//      does anything and the controls are the original ones. While it is on, clicking / tapping / the
//      Use button / controller A / Enter act in the current mode; the keyboard shortcuts E, Space and P
//      keep their old meaning in every mode. The mode is cycled with ] (and [), the middle mouse button
//      (a click, not a drag), the touch "Mode" button, or D-pad left/right (which duplicate LB/RB, so
//      weapon cycling is not lost). Steal goes only through the existing law/crime paths.
//   3. Load from file. The Load panel's file picker and a dropped file read the file as TEXT (FileReader,
//      512 KB cap) and hand it to decodeSave + restoreGame, the same path a pasted save code takes: the
//      same validation, hardcore refusals and error texts. Nothing else ever parses the file.
// Saved state: none. The mode setting lives in localStorage under octave.origins.v1 (guarded).
'use strict';

const ORIGINS = (function () {
  const SETTINGS_KEY = 'octave.origins.v1';
  const FILE_MAX = 512 * 1024;
  const $q = (s) => document.querySelector(s);
  const hasG = () => typeof G !== 'undefined' && G;

  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) { if (k === 'class') e.className = props[k]; else e.setAttribute(k, props[k]); }
    if (text != null) e.textContent = text;
    return e;
  }
  function pad() {
    try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const g of ps) if (g && g.connected !== false) return g; } catch (e) { /* no pad */ }
    return null;
  }

  // ================================================================ settings
  const cfg = { modes: false, mode: 'grab' };
  const MODE_ORDER = ['steal', 'grab', 'info', 'talk'];
  const MODE_NAME = { steal: 'Steal', grab: 'Grab', info: 'Info', talk: 'Talk' };
  function loadCfg() {
    try {
      const o = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (o && typeof o === 'object') { cfg.modes = o.modes === true; if (MODE_ORDER.includes(o.mode)) cfg.mode = o.mode; }
    } catch (e) { /* no storage here: the defaults stand */ }
  }
  function saveCfg() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ modes: cfg.modes, mode: cfg.mode })); } catch (e) { /* ignore */ } }
  const enabled = () => cfg.modes === true;

  // ================================================================ 1. the questions
  // [PROPOSED] every question, answer and verdict below is new text (see P10-ORIGINS/TEXT.md). Weights are
  // read against CLASSES' attributes and skills: 3 = the calling this answer sounds like, 1 = a near neighbour.
  const QUESTIONS = [
    { q: 'A Proctor at the gate asks your name. You...', a: [
      { t: 'Give it slowly, and watch where his pen goes afterwards.', w: { archivist: 3, cantor: 1 } },
      { t: 'Give it loud, and grin. A man who laughs is not worth the paperwork.', w: { corsair: 3, blade: 1 } },
      { t: 'Give your trade instead. Calloused hands seldom get a second question.', w: { quarry: 3, blade: 1 } },
    ] },
    { q: 'In a silent town you hear a child humming. You...', a: [
      { t: 'Hum the tune back, very low, and follow it.', w: { cantor: 3, penitent: 1 } },
      { t: 'Stand still and count the doors. Someone should write down which house.', w: { archivist: 3, quarry: 1 } },
      { t: 'Take your hand off your weapon. There is nothing here to hit.', w: { blade: 3, penitent: 1 } },
    ] },
    { q: 'The Hedge speaks in your mother\'s voice. You...', a: [
      { t: 'Say nothing, and hold something heavy until it stops.', w: { quarry: 3, blade: 1 } },
      { t: 'Say the first line of the old prayer. If it cannot finish it, you will know.', w: { penitent: 3, cantor: 1 } },
      { t: 'Say you will think it over, and walk the other way, whistling.', w: { corsair: 3, archivist: 1 } },
    ] },
    { q: 'You may keep one sound for the rest of your life. Which?', a: [
      { t: 'A wind-reed in an orchard, tuned to one person.', w: { cantor: 3, penitent: 1 } },
      { t: 'Rope running through a block as a ship comes about.', w: { corsair: 3, blade: 1 } },
      { t: 'A pump holding its note, hour after hour, because nothing has gone wrong.', w: { blade: 3, quarry: 1 } },
    ] },
    { q: 'The Synod pins up a new fine for singing off-pitch. You...', a: [
      { t: 'Read it twice, for the loophole. There is always one.', w: { archivist: 3, corsair: 1 } },
      { t: 'Pay it before anyone asks, and light a candle for whoever earned it.', w: { penitent: 3, cantor: 1 } },
      { t: 'Walk past. The fine is for people with time to sing.', w: { quarry: 3, corsair: 1 } },
    ] },
    { q: 'The street\'s reed-whistle stops. The quiet that follows is not rest. You...', a: [
      { t: 'Check your footing and your ways out. Quiet is information.', w: { blade: 3, corsair: 1 } },
      { t: 'Start singing something small and ordinary, to keep the place open.', w: { cantor: 3, archivist: 1 } },
      { t: 'Kneel, and say the old words, whether or not anyone is listening.', w: { penitent: 3, cantor: 1 } },
    ] },
    { q: 'A stranger is dying, and no one here knows her song. You...', a: [
      { t: 'Tell her a lie about the harbour, so the last thing she hears is good.', w: { corsair: 3, cantor: 1 } },
      { t: 'Ask her name, and write it down, so that it is somewhere.', w: { archivist: 3, penitent: 1 } },
      { t: 'Sit with her and hold one plain low note until she has finished.', w: { cantor: 3, quarry: 1 } },
    ] },
    { q: 'A Flambeau on the road asks you to say the Pure Note with him. You...', a: [
      { t: 'Say it. You know every word, and it still tastes of something.', w: { penitent: 3, archivist: 1 } },
      { t: 'Decline politely, and keep your good arm where he can see it.', w: { blade: 3, corsair: 1 } },
      { t: 'Say you have work. A man with work is rarely argued with.', w: { quarry: 3, penitent: 1 } },
    ] },
    { q: 'Someone offers you a glass core, warm in the hand, and calls it a keepsake. You...', a: [
      { t: 'Hand it back. You know what is inside, and that it can hear you.', w: { archivist: 3, blade: 1 } },
      { t: 'Ask whose it was, and how long you would have to answer for it.', w: { penitent: 3, cantor: 1 } },
      { t: 'Ask what it fetches. Everything in the Reach has a price, even the awful things.', w: { corsair: 3, quarry: 1 } },
    ] },
    { q: 'A door stands open in the quiet part of town, a loaf still warm on the table. You...', a: [
      { t: 'Say the household\'s names aloud, one at a time, in case they are listening.', w: { cantor: 3, archivist: 1 } },
      { t: 'Check the back door and the roof. Then eat nothing.', w: { blade: 3, corsair: 1 } },
      { t: 'Shut the door properly and mend the latch. Someone will want it to hold.', w: { quarry: 3, cantor: 1 } },
    ] },
    { q: 'At the end of a long road, what would you rather have in your hands?', a: [
      { t: 'A rope, a good knife, and a place to be by morning.', w: { corsair: 3, quarry: 1 } },
      { t: 'A small flame you are not sure you should still be carrying.', w: { penitent: 3, blade: 1 } },
      { t: 'A ledger, with room left in it.', w: { archivist: 3, cantor: 1 } },
    ] },
  ];
  // [PROPOSED] why each calling was suggested, in the game's voice (second person, short, concrete).
  const REASONS = {
    blade: 'You weighed each answer by what it would cost and who would pay, and you did not flinch from either number. The Dissonant Blade is an engineer\'s mind behind a glass arm: the sum of a fight is done long before it begins.',
    cantor: 'You answered with an ear before an opinion, and you would rather hold a place open than win it. The Cantor sings the births, fevers and burials of the orchards. The notes you carry are older than the Church knows.',
    corsair: 'You made the room laugh, and left yourself a door. The Corsair counts rope and angles, trusts glass shot, and laughs loudest when most afraid. Nothing in the Reach is so grim that you cannot haggle over it.',
    archivist: 'You kept count: the doors, the names, the order things were said in. The Archivist of the Veil writes it down and knows what every glass core is. Each name kept costs a little of you, and you seem to have decided it is worth it.',
    penitent: 'You still half-believe, and you answered like someone for whom half is the heavier weight. The Flambeau Penitent carried a censer for the Church until the light turned. The faith and the fire are both guttering, and you have not chosen which to feed.',
    quarry: 'You answered with your hands: shut the door, mend the latch, hold something heavy. The Quarry-Hand is a strong back and a short list of friends, and has heard the Root breathe through the pump-house floor.',
  };

  // Pure scoring, so the tests (and anyone curious) can run it without the page: picks = [answer index per question].
  function score(picks) {
    const s = {};
    for (let i = 0; i < QUESTIONS.length; i++) {
      const a = QUESTIONS[i].a[picks[i]];
      if (a) for (const id in a.w) s[id] = (s[id] || 0) + a.w[id];
    }
    return s;
  }
  // best-fitting calling among those that exist in CLASSES. Ties go to the earlier calling in the list.
  function suggest(picks) {
    const s = score(picks), ranked = [];
    CLASSES.forEach((c, idx) => { if (c && typeof c.id === 'string') ranked.push({ id: c.id, idx, score: s[c.id] || 0 }); });
    ranked.sort((x, y) => y.score - x.score || x.idx - y.idx);
    return { top: ranked[0], runner: ranked[1] || null, ranked, scores: s };
  }

  const Q = { active: false, i: 0, picks: [], done: false, timer: null, padPrev: [] };

  function quizReset() { Q.i = 0; Q.picks = []; Q.done = false; }
  function quizClose() { Q.active = false; if (Q.timer) { clearInterval(Q.timer); Q.timer = null; } }
  function toList() { quizClose(); CREATE.step = 1; renderCreate(); }
  function quizOpen() { quizReset(); Q.active = true; startPadPoll(); renderQuiz(); }

  function renderQuiz() {
    const p = $q('#create-panel'); if (!p) return;
    p.textContent = '';
    const fade = !(typeof GFX !== 'undefined' && GFX.reduceMotion);
    const box = el('div', { class: 'or-quiz' + (fade ? ' or-in' : ''), 'data-or-quiz': Q.done ? 'result' : 'question' });
    p.appendChild(box);
    if (!Q.done) {
      const q = QUESTIONS[Q.i];
      box.appendChild(el('h2', null, `Questions · ${Q.i + 1} of ${QUESTIONS.length}`));
      const stem = el('p', { class: 'q or-stem', id: 'or-stem' }, q.q);
      box.appendChild(stem);
      const list = el('div', { class: 'list or-answers', role: 'group', 'aria-labelledby': 'or-stem' });
      q.a.forEach((a, i) => {
        const b = el('button', { class: 'dfbtn' + (Q.picks[Q.i] === i ? ' sel' : ''), type: 'button', 'data-a': String(i), 'aria-keyshortcuts': String(i + 1) });
        b.appendChild(el('span', { class: 'or-key', 'aria-hidden': 'true' }, String(i + 1)));
        b.appendChild(el('span', null, a.t));
        b.onclick = () => answer(i);
        list.appendChild(b);
      });
      box.appendChild(list);
      const btns = el('div', { class: 'btns' });
      const prev = el('button', { class: 'dfbtn small', type: 'button', id: 'or-prev' }, 'Previous question');
      prev.disabled = Q.i === 0; prev.onclick = () => back();
      const lst = el('button', { class: 'dfbtn small', type: 'button', id: 'or-list' }, 'Back to the list');
      lst.onclick = () => toList();
      btns.appendChild(prev); btns.appendChild(lst);
      box.appendChild(btns);
      box.appendChild(el('p', { class: 'muted or-help' }, '1 2 3 choose · Backspace goes back · Escape returns to the list. Controller: D-pad, A, B.'));
      const first = list.querySelector('button.sel') || list.querySelector('button'); if (first) { try { first.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
    } else {
      const r = suggest(Q.picks), c = CLASSES[r.top.idx];
      box.appendChild(el('h2', null, 'The Octave suggests'));
      const head = el('p', { class: 'or-call' });
      head.appendChild(el('b', { id: 'or-name' }, c.name));
      head.appendChild(el('span', { class: 'muted' }, ` · ${c.hz} · ${c.skills}`));
      box.appendChild(head);
      box.appendChild(el('p', { class: 'q', id: 'or-why' }, REASONS[c.id] || c.desc));
      let songs = ''; try { songs = c.songs.map(s => SONGS[s].name).join(', '); } catch (e) { songs = ''; }
      box.appendChild(el('p', { class: 'muted' }, `Health ${c.hp} · Voice ${c.voice} · Glass shot ×${c.pellets} · Songs: ${songs}`));
      if (r.runner && r.runner.score >= r.top.score * 0.75 && r.runner.score > 0) {
        const near = el('p', { class: 'muted or-also' }); near.appendChild(document.createTextNode('Also close: ')); near.appendChild(el('b', null, CLASSES[r.runner.idx].name));
        box.appendChild(near);
      }
      const btns = el('div', { class: 'btns' });
      const ok = el('button', { class: 'dfbtn', type: 'button', id: 'or-accept' }, 'Accept this calling');
      ok.onclick = () => accept();
      const again = el('button', { class: 'dfbtn small', type: 'button', id: 'or-again' }, 'Answer again');
      again.onclick = () => { quizReset(); renderQuiz(); };
      const lst = el('button', { class: 'dfbtn small', type: 'button', id: 'or-list' }, 'Back to the list');
      lst.onclick = () => toList();
      btns.appendChild(ok); btns.appendChild(again); btns.appendChild(lst);
      box.appendChild(btns);
      try { ok.focus({ preventScroll: true }); } catch (e) { /* ok */ }
    }
  }
  function answer(i) {
    if (!Q.active || Q.done || !QUESTIONS[Q.i] || !QUESTIONS[Q.i].a[i]) return;
    Q.picks[Q.i] = i; try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
    if (Q.i + 1 >= QUESTIONS.length) Q.done = true; else Q.i++;
    renderQuiz();
  }
  function back() {
    if (!Q.active) return;
    if (Q.done) { Q.done = false; Q.i = QUESTIONS.length - 1; renderQuiz(); return; }
    if (Q.i > 0) { Q.i--; renderQuiz(); }
  }
  // the suggested calling goes through the very path of a hand pick: the list's click sets CREATE.cls and the
  // Continue button sets CREATE.step = 2, so the character that follows is byte for byte the same
  function accept() {
    if (!Q.active || !Q.done) return;
    const r = suggest(Q.picks);
    quizClose();
    CREATE.cls = r.top.idx; CREATE.step = 2;
    try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
    renderCreate();
  }
  function createVisible() { const c = $q('#create'); return !!(c && !c.classList.contains('hidden')); }
  function onQuizKey(ev) {
    if (!Q.active || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!createVisible() || (typeof CREATE !== 'undefined' && CREATE.step !== 1)) { quizClose(); return; }
    const k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); toList(); return; }
    if (!Q.done && (k === '1' || k === '2' || k === '3')) { ev.preventDefault(); ev.stopPropagation(); answer(+k - 1); return; }
    if (k === 'Backspace' || (k === 'ArrowLeft' && !Q.done)) { ev.preventDefault(); ev.stopPropagation(); back(); return; }
    // the game's own key handler cancels Tab on every screen, so focus moves here: Tab and the arrows walk the buttons
    if (k === 'Tab' || k === 'ArrowDown' || k === 'ArrowUp') {
      const btns = Array.from(document.querySelectorAll('#create-panel .or-quiz button:not(:disabled)'));
      if (!btns.length) return;
      ev.preventDefault(); ev.stopPropagation();
      const back1 = k === 'ArrowUp' || (k === 'Tab' && ev.shiftKey), at = btns.indexOf(document.activeElement);
      btns[(at + (back1 ? -1 : 1) + btns.length) % btns.length].focus();
    }
  }
  // controller: D-pad up / down moves between the buttons, A presses the focused one, B goes back a question
  function startPadPoll() {
    if (Q.timer) clearInterval(Q.timer);
    Q.padPrev = [];
    Q.timer = setInterval(() => {
      if (!Q.active) { clearInterval(Q.timer); Q.timer = null; return; }
      const g = pad(); if (!g) return;
      const was = Q.padPrev, now = [];
      for (let i = 0; i < 16; i++) now[i] = !!(g.buttons[i] && g.buttons[i].pressed);
      const edge = (i) => now[i] && !was[i];
      Q.padPrev = now;
      const btns = Array.from(document.querySelectorAll('#create-panel .or-quiz button:not(:disabled)'));
      const at = btns.indexOf(document.activeElement);
      if (edge(13) || edge(15)) { const n = btns[(at + 1 + btns.length) % btns.length]; if (n) n.focus(); }
      else if (edge(12) || edge(14)) { const n = btns[(at - 1 + btns.length) % btns.length]; if (n) n.focus(); }
      else if (edge(0) && at >= 0) btns[at].click();
      else if (edge(1)) { if (Q.done || Q.i > 0) back(); else toList(); }
    }, 70);
  }
  function wireCreate() {
    if (typeof renderCreate !== 'function') return;
    const _rc = renderCreate;
    renderCreate = function () {
      if (typeof CREATE !== 'undefined' && CREATE.step !== 1) quizClose();
      if (Q.active && CREATE.step === 1) { renderQuiz(); return; }
      const r = _rc.apply(this, arguments);
      try {
        if (CREATE.step === 1) {
          const btns = $q('#create-panel .btns');
          if (btns && !$q('#or-quiz-btn')) {
            const b = el('button', { class: 'dfbtn small', type: 'button', id: 'or-quiz-btn' }, 'Answer questions…');
            b.onclick = () => quizOpen();
            btns.insertBefore(b, btns.firstChild);
          }
        }
      } catch (e) { console.warn('origins: quiz button failed', e); }
      return r;
    };
    window.addEventListener('keydown', onQuizKey, true);
  }

  // ================================================================ 2. interaction modes
  const ICON = {
    // procedural stand-in glyphs, drawn here (24x24, stroke only)
    steal: '<path d="M9 5.5c1-1.4 5-1.4 6 0l-1.2 2.3h-3.6z"/><path d="M9.6 7.8C5.2 11 4.4 16 6.6 19c1.6 1.6 8.2 1.6 10.8 0 2.2-3 1.4-8-3-11.2"/><path d="M12 11.5v5M10.4 13h3.2"/>',
    grab: '<path d="M7 12.5V7a1.2 1.2 0 0 1 2.4 0v4.5M9.4 11V5a1.2 1.2 0 0 1 2.4 0v6M11.8 11V5.6a1.2 1.2 0 0 1 2.4 0V12M14.2 12V7.6a1.2 1.2 0 0 1 2.4 0v7c0 3.4-2 5.4-5 5.4s-4.6-1.6-5.6-4.2L5 13a1.2 1.2 0 0 1 2-.5z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6"/>',
    talk: '<path d="M4 5.5h16v10H12.5L8 19.5v-4H4z"/><path d="M8 9.5h8M8 12h5"/>',
  };
  function iconSvg(mode) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = ICON[mode] || '';   // constant table above, never save data
    return svg;
  }
  let iconEl = null, iconShown = '', touchBtn = null, popT = 0;
  function ensureIcon() {
    if (iconEl && iconEl.isConnected) return iconEl;
    const game = $q('#game'); if (!game) return null;
    iconEl = el('div', { id: 'or-mode', hidden: '', role: 'status', 'aria-live': 'polite' });
    iconEl.appendChild(el('span', { class: 'or-ico' }));
    iconEl.appendChild(el('span', { class: 'or-word' }));
    game.appendChild(iconEl);
    return iconEl;
  }
  function refreshIcon() {
    const live = enabled() && hasG() && G.state === 'play' && !G.dead;
    const key = live ? cfg.mode : '';
    const e = ensureIcon(); if (!e) return;
    if (key !== iconShown) {
      iconShown = key;
      e.hidden = !live;
      if (live) {
        const ico = e.querySelector('.or-ico'); ico.textContent = ''; ico.appendChild(iconSvg(cfg.mode));
        e.querySelector('.or-word').textContent = MODE_NAME[cfg.mode];
        e.setAttribute('data-mode', cfg.mode);
        e.setAttribute('aria-label', 'Interaction mode: ' + MODE_NAME[cfg.mode]);
      }
    }
    if (live) e.classList.toggle('or-live', !!(G.hintKind));
    if (touchBtn) {
      const show = live && !!G.touchMode;
      if (touchBtn.hidden === show) touchBtn.hidden = !show;
      if (touchBtn.getAttribute('data-m') !== key) { touchBtn.setAttribute('data-m', key); touchBtn.textContent = live ? MODE_NAME[cfg.mode] : 'Mode'; }
    }
  }
  function cycle(d) {
    if (!enabled() || !hasG() || G.state !== 'play') return false;
    const i = MODE_ORDER.indexOf(cfg.mode);
    cfg.mode = MODE_ORDER[(i + (d < 0 ? -1 : 1) + MODE_ORDER.length) % MODE_ORDER.length];
    saveCfg(); refreshIcon();
    const e = ensureIcon();
    if (e && !(typeof GFX !== 'undefined' && GFX.reduceMotion)) { e.classList.remove('or-pop'); void e.offsetWidth; e.classList.add('or-pop'); clearTimeout(popT); popT = setTimeout(() => e.classList.remove('or-pop'), 260); }
    msg('Interaction mode: ' + MODE_NAME[cfg.mode] + '.', '', 1600);
    try { Audio_.sfx.ui(); } catch (err) { /* silent */ }
    return true;
  }
  function setEnabled(v) {
    cfg.modes = !!v; saveCfg(); iconShown = 'x'; refreshIcon();
  }
  function setMode(m) { if (MODE_ORDER.includes(m)) { cfg.mode = m; saveCfg(); refreshIcon(); } }

  // What interact() would act on, in the same order it looks: the entity under the crosshair, then something
  // usable just ahead of you, then a door or wall. A companion in front is looked through, as party.js does.
  function rawAim() {
    const c = Engine.cam;
    const e = Engine.pick(G.ents, USE_RANGE);
    if (e && !e.dead) return { e };
    let best = null, bd = 1e9;
    for (const o of G.ents) {
      if (o.hidden || o.dead || (o.kind !== 'item' && !(o.kind === 'deco' && o.use) && o.kind !== 'npc')) continue;
      const d = Math.sqrt(dist2(o.x, o.y, c.x, c.y)); if (d > 1.6 + (o.radius || 0)) continue;
      const ang = Math.abs(normAng(Math.atan2(o.y - c.y, o.x - c.x) - c.dir));
      if (ang < 0.8 && d < bd) { bd = d; best = o; }
    }
    if (best) return { e: best };
    const w = Engine.pickWall(2.0);
    return w ? { w } : null;
  }
  function aim() {
    const t = rawAim();
    if (t && t.e && t.e.companion) {
      const comp = t.e; comp.hidden = true;
      try { const u = rawAim(); if (u && (u.e || (u.w && u.w.cell && u.w.cell.door))) return u; } finally { comp.hidden = false; }
    }
    return t;
  }
  function say(text, cls, ttl) { msg(text, cls || '', ttl || 3200); }
  const firstSentence = (s) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); const m = /^.*?[.!?](?=\s|$)/.exec(t); const r = m ? m[0] : t; return r.length > 150 ? r.slice(0, 147).trimEnd() + '…' : r; };

  // Info: a name and one line, from the same catalogues the game already shows. Nothing that the crosshair hint
  // line or a plain look would not give: no health, no ownership, no contents, no flags, no quest state. Quest
  // items get a neutral line, because their descriptions are written for a player who already holds them (and
  // a different line would tell you which things are quest items). " \u00b7 " joins the pieces, as the game's
  // stat lines do, so each piece can be translated on its own.
  function describe(t) {
    if (!t) return null;
    if (t.w) {
      const cell = t.w.cell;
      if (cell.door) {
        const d = G.map.doors[t.w.y * G.map.w + t.w.x];
        return cell.label || (cell.portal ? 'A door.' : (d && d.open > 0.5 ? 'An open door.' : 'A closed door.'));
      }
      return wallLabel(cell);
    }
    const e = t.e; if (!e || e.hidden || e.dead) return null;
    if (e.kind === 'npc') {
      const n = NPCS[e.id] ? NPCS[e.id].name : (e.name || null);
      return String(n || 'A stranger') + ' \u00b7 ' + (e.companion ? 'Travelling with you.' : e.lawGuard ? 'Keeps the watch.' : 'Someone you could speak to.');
    }
    if (e.kind === 'item') { const it = ITEMS[e.item]; return it ? it.name + ' \u00b7 ' + (it.key ? 'Something you could pick up.' : firstSentence(it.desc)) : null; }
    if (e.kind === 'enemy') { const d = e.def || ENEMIES[e.type]; return d ? d.name + ' \u00b7 ' + firstSentence(d.desc) : null; }
    if (e.kind === 'deco') return decoLabel(e);
    return null;
  }

  let acting = false;
  function stealAct(t) {
    const e = t && t.e;
    if (!e) { say('Nothing here to steal.'); return; }
    if (e.kind === 'npc') {
      if (e.companion) { say('Not from a friend.'); return; }
      if (pickpocketTarget() === e) { openPickpocket(); return; }                       // the existing purse panel, the existing law path
      if (canPickpocket(e)) { say('Too far, or something is in the way. Close in until the purse is within arm’s reach.', 'warn', 4200); return; }
      say('Nothing on them you could lift.');
      return;
    }
    if (e.kind === 'item') {
      // owned things go through pickUp -> confirmTheft: witnesses, bounty and every refusal stay exactly as they are
      if (e.owner && lawActive() && ITEMS[e.item] && !ITEMS[e.item].key) { pickUp(e); return; }
      say('No one owns this. Grab it instead.');
      return;
    }
    say('Nothing here to steal.');
  }
  // one use of the current mode. Grab is the original interact().
  function modeAct(mode) {
    if (!hasG() || G.state !== 'play' || G.dead || acting) return false;
    mode = mode || cfg.mode; acting = true;
    try {
      const t = aim(), e = t && t.e;
      if (mode === 'grab') {
        if (e && e.kind === 'npc' && !e.companion) { say('You cannot grab a person. Try Talk, or Steal.'); return true; }
        rawInteract(); return true;
      }
      if (mode === 'talk') { if (e && e.kind === 'npc') talk(e); else say('No one here to talk to.'); return true; }
      if (mode === 'info') { const line = describe(t); if (line) say(line, '', 5200); else say('Nothing close enough to look at.'); return true; }
      if (mode === 'steal') { stealAct(t); return true; }
    } finally { acting = false; }
    return false;
  }
  let rawInteract = null;
  // E and Space are the classic use keys and keep their old meaning in every mode
  function classicKey() {
    const ev = window.event;
    return !!(ev && ev.type === 'keydown' && (ev.code === 'KeyE' || ev.code === 'Space' || ev.key === 'e' || ev.key === 'E' || ev.key === ' '));
  }
  function wireModes() {
    if (typeof interact === 'function') {
      const _in = interact; rawInteract = _in;
      interact = function () {
        if (!enabled() || !hasG() || G.state !== 'play' || acting || classicKey()) return _in.apply(this, arguments);
        return modeAct();
      };
    }
    if (typeof controlsTick === 'function') {
      const _ct = controlsTick;
      controlsTick = function () {
        const r = _ct.apply(this, arguments);
        try {
          refreshIcon();
          // Info can look at anything near, so a click in Info mode should not swing at a sleeping beast or a plain prop
          if (enabled() && cfg.mode === 'info' && G.state === 'play' && !G.hintKind) {
            const h = Engine.pick(G.ents, USE_RANGE);
            if (h && !h.dead && h._screen && h._screen.dist <= USE_RANGE && !(h.kind === 'enemy' && h.state === 'chase')) G.hintKind = h.kind;
          }
        } catch (e) { /* never break the frame */ }
        return r;
      };
    }
    // D-pad left/right duplicate LB/RB (weapon cycling): with modes on they cycle the mode instead
    if (typeof cycleWeapon === 'function') {
      const _cw = cycleWeapon;
      cycleWeapon = function (d) {
        try {
          if (enabled() && hasG() && G.state === 'play') {
            const g = pad();
            if (g && ((g.buttons[14] && g.buttons[14].pressed) || (g.buttons[15] && g.buttons[15].pressed)) && !(g.buttons[4] && g.buttons[4].pressed) && !(g.buttons[5] && g.buttons[5].pressed)) { cycle(d); return; }
          }
        } catch (e) { /* fall through to the original */ }
        return _cw.apply(this, arguments);
      };
    }
    // keyboard: ] next, [ previous (by physical key, so any layout), Enter acts. Another binding on the key wins.
    window.addEventListener('keydown', (ev) => {
      try {
        if (!enabled() || !hasG() || ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;
        const tg = ev.target && ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
        if (G.state !== 'play' || G.openPanel) return;
        if (ev.code === 'BracketRight' || ev.code === 'BracketLeft') {
          const ch = ev.code === 'BracketRight' ? ']' : '[';
          if (keyTaken(ch)) return;
          ev.preventDefault(); cycle(ev.code === 'BracketRight' ? 1 : -1); return;
        }
        if (ev.code === 'Enter' || ev.code === 'NumpadEnter') {
          if (tg === 'BUTTON' || tg === 'A') return;
          ev.preventDefault(); modeAct();
        }
      } catch (e) { /* a key press must never throw */ }
    });
    // middle mouse: a click (not a drag) cycles; dragging with it still looks, as before
    let mid = null;
    window.addEventListener('mousedown', (ev) => { if (ev.button === 1) mid = { t: performance.now(), x: ev.clientX, y: ev.clientY, m: 0 }; }, true);
    window.addEventListener('mousemove', (ev) => { if (mid) mid.m += Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0) + (ev.movementX === undefined ? Math.abs(ev.clientX - mid.x) + Math.abs(ev.clientY - mid.y) : 0); }, true);
    window.addEventListener('mouseup', (ev) => {
      if (ev.button !== 1 || !mid) return;
      const m = mid; mid = null;
      try { if (enabled() && hasG() && G.state === 'play' && !G.touchMode && performance.now() - m.t < 350 && m.m < 8) cycle(1); } catch (e) { /* ignore */ }
    }, true);
    // touch: a Mode button next to Throw
    const ui = $q('#touchui');
    if (ui && !$q('#or-t-mode')) {
      touchBtn = el('button', { id: 'or-t-mode', class: 'tb small', type: 'button', hidden: '', 'aria-label': 'Cycle interaction mode' }, 'Mode');
      const after = $q('#t-throw');
      if (after && after.parentNode === ui) ui.insertBefore(touchBtn, after.nextSibling); else ui.appendChild(touchBtn);
      if (typeof tbtn === 'function') tbtn('#or-t-mode', null, () => cycle(1));
    }
  }
  // is this key already bound to one of the game's rebindable actions?
  function keyTaken(ch) {
    try { if (typeof UPG === 'object' && UPG && UPG.keybinds) for (const k in UPG.keybinds) if (String(UPG.keybinds[k]).toLowerCase() === ch) return true; } catch (e) { /* ignore */ }
    return false;
  }

  // ---- Options row (Graphics & access grid)
  function appendRows() {
    const grid = $q('#modal-panel .ctl-grid');
    if (!grid || $q('#or-modes-opt')) return;
    const lab = el('span', { class: 'gfx-label' }, 'Interaction modes ');
    lab.appendChild(el('small', { class: 'muted' }, 'Steal, Grab, Info and Talk, as in Daggerfall. ] or [ cycles; click, tap, Enter or controller A uses the current mode. E, Space and P keep their usual meaning.'));
    const b = el('button', { class: 'dfbtn small', id: 'or-modes-opt', type: 'button', 'aria-pressed': enabled() ? 'true' : 'false' }, enabled() ? 'On' : 'Off');
    b.classList.toggle('sel', enabled());
    b.onclick = () => { setEnabled(!enabled()); b.textContent = enabled() ? 'On' : 'Off'; b.setAttribute('aria-pressed', enabled() ? 'true' : 'false'); b.classList.toggle('sel', enabled()); };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function wireMenus() {
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRows(); } catch (e) { console.warn('origins: options row failed', e); }
        return r;
      };
    }
    // the help screen mentions the modes only while they are on
    if (typeof renderHelp === 'function') {
      const _help = renderHelp;
      renderHelp = function () {
        const r = _help.apply(this, arguments);
        try {
          const pre = $q('#modal-panel pre.help');
          if (enabled() && pre && !$q('#or-help-note')) pre.parentNode.insertBefore(el('p', { class: 'muted', id: 'or-help-note' }, 'Interaction modes: ] and [ cycle Steal, Grab, Info and Talk; click, tap, Enter or controller A uses the current one. E, Space and P work as always.'), pre.nextSibling);
        } catch (e) { /* cosmetic */ }
        return r;
      };
    }
  }

  // ================================================================ 3. load from file
  function loadSayError(text) { const e = $q('#ld-err'); if (e) e.textContent = text; }
  function isLoadPanel() { return hasG() && (G.openPanel === 'load' || G.openPanel === 'loadtitle'); }
  function readText(file) {
    return new Promise((resolve, reject) => {
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : '');
        fr.onerror = () => reject(new Error('read'));
        fr.onabort = () => reject(new Error('read'));
        fr.readAsText(file);
      } catch (e) { reject(e); }
    });
  }
  // The only way a file becomes a game: its text goes to decodeSave and then restoreGame, exactly as a pasted
  // code does. Every error is shown as text in the panel's own message line.
  async function loadFile(file) {
    const token = G.panelToken;
    if (hardcoreOn()) { loadSayError('Downloaded files cannot open a hardcore run.'); return false; }
    if (!file) return false;
    if (file.size > FILE_MAX) { loadSayError('That file is too large to be a save. The limit is 512 KB.'); return false; }
    let text;
    try { text = await readText(file); } catch (e) { loadSayError('That file could not be read.'); return false; }
    if (G.panelToken !== token || !isLoadPanel()) return false;                          // the player moved on while it read
    if (text.length > FILE_MAX) { loadSayError('That file is too large to be a save. The limit is 512 KB.'); return false; }
    if (!text.trim()) { loadSayError('That file is empty.'); return false; }
    try { restoreGame(await decodeSave(text)); return true; }
    catch (e) { loadSayError('That did not read as a save. ' + (e && e.message ? e.message : '')); return false; }
  }
  function enhanceLoad() {
    const panel = $q('#modal-panel'); if (!panel) return;
    if (hardcoreOn()) return;                                                            // no file option inside a hardcore run
    const input = $q('#ld-file'), label = panel.querySelector('label[for="ld-file"]');
    if (!input) return;
    input.setAttribute('accept', '.txt,.octave,text/plain');
    input.onchange = () => { const f = input.files && input.files[0]; input.value = ''; loadFile(f); };
    // a real button, so the keyboard reaches it (a label over a hidden input is mouse-only)
    const btn = el('button', { class: 'dfbtn small', type: 'button', id: 'or-file-btn' }, 'Load from file…');
    btn.onclick = () => input.click();
    if (label) label.replaceWith(btn); else input.parentNode.insertBefore(btn, input);
    const err = $q('#ld-err');
    if (err && !$q('#or-drop-note')) err.parentNode.insertBefore(el('p', { class: 'muted', id: 'or-drop-note' }, 'A save file (.txt or .octave) can also be dropped onto this panel.'), err);
  }
  function dropTargets(ev) { return !!(isLoadPanel() && ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files')); }
  function wireLoad() {
    if (typeof renderLoad === 'function') {
      const _rl = renderLoad;
      renderLoad = function () {
        const r = _rl.apply(this, arguments);
        try { enhanceLoad(); } catch (e) { console.warn('origins: load panel failed', e); }
        return r;
      };
    }
    const mark = (on) => { const p = $q('#modal-panel'); if (p) p.classList.toggle('or-dropping', on); };
    // listening on the window so a drop that just misses the panel does not navigate the page away
    window.addEventListener('dragenter', (ev) => { if (dropTargets(ev)) { ev.preventDefault(); mark(true); } });
    window.addEventListener('dragover', (ev) => { if (dropTargets(ev)) { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; mark(true); } });
    window.addEventListener('dragleave', (ev) => { if (!ev.relatedTarget) mark(false); });
    window.addEventListener('drop', (ev) => {
      if (!dropTargets(ev)) return;
      ev.preventDefault(); mark(false);
      const files = Array.from(ev.dataTransfer.files || []);
      if (files.length !== 1) { loadSayError('Drop one save file at a time.'); return; }
      loadFile(files[0]);
    });
  }

  // ================================================================ style
  function injectStyle() {
    if (document.getElementById('origins-style')) return;
    const st = document.createElement('style'); st.id = 'origins-style';
    st.textContent = `
.or-quiz .or-stem { font-size: 2.6cqw; margin: 1cqh 0 1.2cqh; }
.or-quiz .or-answers button { display: flex; gap: 1.2cqw; align-items: baseline; }
.or-quiz .or-key { color: var(--gold-dim, #8a6a2a); font-family: var(--font-display); min-width: 1.6cqw; }
.or-quiz .or-call { font-size: 3cqw; margin: .8cqh 0; }
.or-quiz .or-call b { font-family: var(--font-display); color: var(--gold); }
.or-quiz .or-help { font-size: 1.7cqw; }
.or-quiz.or-in { animation: or-in .18s ease-out; }
@keyframes or-in { from { opacity: 0; } to { opacity: 1; } }
#or-mode { position: absolute; left: calc(50% + 2.4cqw); top: calc(37.5% - 1.6cqw); display: flex; align-items: center; gap: .6cqw; color: var(--gold); opacity: .55; pointer-events: none; z-index: 2; }
#or-mode[hidden] { display: none; }
#or-mode.or-live { opacity: 1; }
#or-mode .or-ico { width: 3.4cqw; height: 3.4cqw; display: block; filter: drop-shadow(0 0 1px #000) drop-shadow(1px 1px 0 #000); }
#or-mode .or-ico svg { width: 100%; height: 100%; display: block; }
#or-mode .or-word { font-family: var(--font-sc); font-size: 1.8cqw; text-shadow: 0 0 3px #000, 1px 1px 0 #000; letter-spacing: .04em; }
#or-mode.or-pop .or-ico { animation: or-pop .25s ease-out; }
@keyframes or-pop { from { transform: scale(1.5); } to { transform: scale(1); } }
#game.p7-photo #or-mode { visibility: hidden; }
#or-t-mode[hidden] { display: none; }
#modal-panel.or-dropping { outline: 3px dashed var(--gold); outline-offset: -6px; }
@media (prefers-reduced-motion: reduce) { .or-quiz.or-in, #or-mode.or-pop .or-ico { animation: none; } }
`;
    document.head.appendChild(st);
  }

  // ================================================================ boot
  loadCfg();
  injectStyle();
  try { wireCreate(); } catch (e) { console.warn('origins: creation wiring failed', e); }
  try { wireModes(); } catch (e) { console.warn('origins: mode wiring failed', e); }
  try { wireMenus(); } catch (e) { console.warn('origins: menu wiring failed', e); }
  try { wireLoad(); } catch (e) { console.warn('origins: load wiring failed', e); }
  return {
    cfg, MODE_ORDER, MODE_NAME, QUESTIONS, REASONS, FILE_MAX,
    score, suggest, quiz: Q, quizOpen, answer, accept, toList,
    enabled, setEnabled, setMode, cycle, act: modeAct, aim, describe, refreshIcon,
    loadFile, keyTaken,
    get iconEl() { return iconEl; },
  };
})();
if (typeof window !== 'undefined') window.ORIGINS = ORIGINS;
