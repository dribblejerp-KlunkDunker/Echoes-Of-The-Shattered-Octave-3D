// voice-acting — recorded lines for every speaking character and boss.
//
// The lines are MP3s in voices/, rendered offline by tools/voices/build.py from voices/script.json (neural TTS,
// Kokoro-82M, Apache-2.0, then treated per character: age, gravel, Kaelen's glass ring at 528 Hz, Hollow breath,
// the many voices of the Weaver, the Wearer and the Requiem). js/voice-lines.js is the generated manifest.
//
// What is voiced, and how it is found:
//   greetings  - when a conversation opens, the greeting the game shows (polite/normal/blunt, whichever your tone
//                picked) is matched by its words against the recorded greetings; quest openings stay unvoiced.
//   barks      - speaking enemy families (Office, Carillon, the Quiet Faith, the cutter's crew) say a recorded line
//                on alert / hurt / death; a boss says its intro on its first alert of a visit and its defeat line.
//   spoken msgs- boss mimicry, Hollow fragments, companions: any message whose words match a recorded line plays it.
// Silent characters stay silent (VOICES.resolve decides). Nothing is saved; nothing here touches G.flags.
// Setting: Options > Graphics & access > Voices: Voiced (default) / Voiced + read aloud / Grunts / Off.
'use strict';

const VOICE_ACT = (() => {
  const audioRnd = (() => { let s = (Date.now() ^ 0x5bd1e995) >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const LINES = (typeof VOICE_LINES !== 'undefined' && VOICE_LINES) ? VOICE_LINES : {};
  const norm = (s) => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const index = Object.keys(LINES).map((id) => ({ id, ...LINES[id], n: norm(LINES[id].t || '') })).filter((l) => l.n.length >= 2);
  const bySpeakerKind = {};
  for (const l of index) (bySpeakerKind[l.speaker + ':' + l.kind] = bySpeakerKind[l.speaker + ':' + l.kind] || []).push(l);
  const st = { played: 0, last: null, current: null, failed: 0, introsDone: new Set(), lastMsgAt: {} };
  const buffers = new Map();   // src -> Promise<AudioBuffer>
  const VOL = 1.5;

  const baseOf = (id) => String(id).replace(/_(wg|dw)$/, '');
  const ENEMY_SPEAKER = { wearer_coda: 'wearer' };

  function load(src) {
    const ctx = Audio_.ctx;
    if (!buffers.has(src)) {
      buffers.set(src, fetch(src).then((r) => { if (!r.ok) throw new Error(src + ' ' + r.status); return r.arrayBuffer(); })
        .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
        .catch((e) => { st.failed++; buffers.delete(src); throw e; }));
    }
    return buffers.get(src);
  }

  // play one line now; returns its duration in seconds (0 = could not)
  function playLine(l, opts) {
    const ctx = typeof Audio_ !== 'undefined' ? Audio_.ctx : null;
    if (!l || !ctx || !Audio_.sfxBus || Audio_.muted) return 0;
    if (opts && opts.interrupt && st.current) { try { st.current.stop(); } catch (e) { /* already ended */ } st.current = null; }
    const token = {};
    st.pending = token;
    load(l.src).then((buf) => {
      if (Audio_.muted || (opts && opts.interrupt && st.pending !== token)) return;
      const s = ctx.createBufferSource(), g = ctx.createGain();
      s.buffer = buf; g.gain.value = VOL * ((opts && opts.vol) || 1);
      s.connect(g); g.connect(Audio_.sfxBus); s.start();
      if (opts && opts.interrupt) { st.current = s; s.onended = () => { if (st.current === s) st.current = null; }; }
    }).catch((e) => console.warn('voice line failed', l.id, e && e.message));
    st.played++; st.last = l.id;
    return l.d || 1;
  }

  const pick = (arr) => arr[Math.floor(audioRnd() * arr.length) % arr.length];

  // the recorded line whose words are in this text (the longest such line wins)
  function find(text, kinds, speakers) {
    const n = ' ' + norm(text) + ' ';
    let best = null;
    for (const l of index) {
      if (kinds && !kinds.includes(l.kind)) continue;
      if (speakers && !speakers.includes(l.speaker)) continue;
      if (n.includes(' ' + l.n + ' ') && (!best || l.n.length > best.n.length)) best = l;
    }
    return best;
  }

  function greetText() {
    if (typeof DLG === 'undefined' || !DLG.log || !DLG.log.length || typeof G === 'undefined' || G.state !== 'dialogue') return null;
    const first = DLG.log[0];
    return first && first.who === 'them' ? String(first.t || '') : null;
  }

  // called by VOICES.play before it synthesizes a grunt; returns seconds when a recorded line took the event
  function handle(kind, id, ev, pr) {
    if (pr && pr.silent) return 0;
    if (kind === 'npc' && ev === 'greet') {
      const t = greetText(); if (!t) return 0;
      const base = baseOf(id);
      const speakers = pr && pr.why === 'her own ruined voice' ? ['lyra_ruined'] : null;
      const l = find(t, ['greet'], speakers);
      if (!l || (l.speaker !== base && !(speakers && speakers.includes(l.speaker)) && !(typeof NPCS !== 'undefined' && NPCS[id] && NPCS[id].sprite === l.speaker))) return 0;
      return api.playLine(l, { interrupt: true });
    }
    if (kind === 'enemy') {
      const sp = ENEMY_SPEAKER[id] || id;
      let arr = null;
      if (ev === 'alert') {
        const key = (typeof G !== 'undefined' && G.map ? G.map : '') + ':' + sp;
        const intro = bySpeakerKind[sp + ':intro'];
        if (intro && !st.introsDone.has(key)) { st.introsDone.add(key); arr = intro; }
      }
      if (!arr && ev === 'death') arr = bySpeakerKind[sp + ':defeat'];
      if (!arr) arr = bySpeakerKind[sp + ':' + ev];
      if (!arr || !arr.length) return 0;
      return api.playLine(pick(arr), { vol: ev === 'hurt' ? 0.8 : 1 });
    }
    return 0;
  }

  // true when a recorded line says this text (so "read aloud" does not say it a second time)
  function covers(text) { return !!find(text, null, null) && ['acted', 'spoken'].includes(VOICES.mode); }

  // Lyra's own lines follow the game's voice rules: her clear voice only before the Grove, her ruined one after lyra_voice
  function mayspeak(l) {
    const f = (typeof G !== 'undefined' && G.flags) ? G.flags : {};
    if (l.speaker === 'lyra_ruined') return !!f.lyra_voice;
    if (l.speaker === 'lyra') return !(f.lyra_wg_met || f.lyra_dw_met);
    return true;
  }
  // messages: boss mimicry, Hollow fragments, companions, anything else with recorded words
  function onMsg(text, cls) {
    if (typeof VOICES === 'undefined' || !['acted', 'spoken'].includes(VOICES.mode)) return;
    const l = find(text, ['mimic', 'boss', 'companion', 'greet', 'intro', 'defeat', 'death'], null);
    if (!l || !mayspeak(l)) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (st.lastMsgAt[l.id] && now - st.lastMsgAt[l.id] < 1500) return;   // the same message twice in a row
    st.lastMsgAt[l.id] = now;
    api.playLine(l, { interrupt: l.kind !== 'companion' });
  }

  function wire() {
    if (typeof msg === 'function') {
      const _msg = msg;
      msg = function (text, cls) {
        const r = _msg.apply(this, arguments);
        try { onMsg(text, cls); } catch (e) { console.warn('voice msg failed', e); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () { st.introsDone.clear(); return _lm.apply(this, arguments); };
    }
    if (typeof closeModal === 'function') {
      const _cm = closeModal;
      closeModal = function () {
        if (st.current && typeof G !== 'undefined' && G.state === 'dialogue') { try { st.current.stop(); } catch (e) { /* ended */ } st.current = null; }
        return _cm.apply(this, arguments);
      };
    }
  }
  wire();
  // calls go through this object, so a test or a mod can observe or replace playback
  const api = { LINES, index, state: st, handle, find, covers, playLine, onMsg, preload: (id) => LINES[id] && Audio_.ctx ? load(LINES[id].src) : null };
  return api;
})();
if (typeof window !== 'undefined') window.VOICE_ACT = VOICE_ACT;
