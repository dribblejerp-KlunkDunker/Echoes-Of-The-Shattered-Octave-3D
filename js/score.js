// ============================================================
//  score — Phase 7: the procedural score (SCORE team)
//  The game streams ten MP3 cues (music/*.mp3) through Audio_.music.request(id, vol, rate). This module adds, when the
//  setting "Score" is Extended (opt-in; the default is the Original recorded score), three things on top of them. Every note here is a PROCEDURAL STAND-IN
//  for composed music, played by a tiny WebAudio sequencer; a final pass can swap authored recordings in per piece.
//    1. Area and dungeon compositions: Oakhaven (Growth, 174 Hz root, wind-reed and orchard pluck), Whisper-Grove
//       (Memory, 741 Hz glass), the Deep Woods (willow, low strings, dread) and one colour per dungeon family
//       (quarry, Root-vault and Under-hedge, catacombs, mausoleum and bell-tower, the Malting).
//       Oakhaven and the Grove alternate with their MP3 cue; the Woods and the dungeons replace the shared one.
//       Each piece plays through, falls silent for a gap, and returns, like the MP3 cues, with a fresh random seed so
//       the long form never repeats the same night twice. Crossfades ride the same fade times as the MP3 score.
//    2. Boss themes that take over from 'combat' while that boss is chasing you (Requiem, Brood-Mother, Phantom
//       Weaver, Aegis Sentinel, Pressman Mallow, the Deacon, the Wearer, Outrider-Captain, Steam Golem).
//    3. A story-evolving main theme: a motif layer played over title.mp3 (and the ending cue) whose voices follow the
//       story flags: alone, harmonised, shadowed, broken, re-forming, and finally the 174 Hz root restored.
//  How: Audio_.music.request and .tick are wrapped. Choosing is a pure function of (cue id, map id, flags, enemies);
//  Original forwards every request untouched. Phase 8: in Extended every piece below first plays as a COMPOSED, RECORDED
//  MP3 from music/extended/ (written and rendered by tools/music/: GM orchestration through FluidSynth, see CREDITS.md); the
//  procedural pieces remain as the fallback when a recording is missing, fails to load, or the browser cannot route it.
//  A recording is an HTMLAudioElement routed through createMediaElementSource into the piece's gain (the same crossfade,
//  mute, music-enabled and rest/return rules as the procedural piece). The story stages of the main theme are six recordings
//  (maintheme_0..5) that take the title/ending cue's place and trade turns with title.mp3 like Oakhaven does with town.mp3.
//  Procedural notes are scheduled ~2 s ahead with ctx.currentTime (no per-sample JS),
//  every voice self-stops, and everything connects through one gain per piece into Audio_.master. There is no second
//  AudioContext, and nothing happens until Audio_.ctx exists. No new saved fields: the stage is read from G.flags.
//  Setting: localStorage 'octave.score.v1' {mode:'original'|'extended'}; a row in Graphics & access.
// ============================================================
'use strict';

const SCORE = (() => {
  // a private random stream: sound never draws from Math.random, so audio can't shift gameplay rolls
  const audioRnd = (() => { let s = (Date.now() ^ 0x9e3779b9) >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const KEY = 'octave.score.v1';
  const LOOK = 2.0;                       // seconds of notes scheduled ahead of the audio clock
  const GAIN = 2.6;                       // piece output before the master gain
  const state = { mode: 'original' };   // the recorded score is the default; the generated pieces are opt-in

  // ---- the composed recordings (Phase 8) ------------------------------------------------------------------
  // pid -> file in music/extended/. loop: boss themes repeat seamlessly (the files carry their own reverb tail at the seam).
  // The six main-theme stages are area-like (they replace the title/ending cue, then give the cue a turn back).
  const REC_DIR = 'music/extended/', REC_V = '?v=1';
  const REC_GAIN = 1.1;                    // the ten MP3 cues play at element volume 0.62 straight out; the master bus is 0.55
  const REC = {
    oakhaven: { file: 'oakhaven' }, whispergrove: { file: 'whispergrove' }, deepwoods: { file: 'deepwoods' }, quarry: { file: 'quarry' },
    rootvault: { file: 'rootvault' }, catacombs: { file: 'catacombs' }, mausoleum: { file: 'mausoleum' },
    boss_requiem: { file: 'boss_requiem', loop: true }, boss_broodmother: { file: 'boss_broodmother', loop: true }, boss_weaver: { file: 'boss_weaver', loop: true },
    boss_aegis: { file: 'boss_aegis', loop: true }, boss_pressman: { file: 'boss_pressman', loop: true }, boss_deacon: { file: 'boss_deacon', loop: true },
    boss_wearer: { file: 'boss_wearer', loop: true }, boss_golem: { file: 'boss_golem', loop: true }, boss_captain: { file: 'boss_captain', loop: true },
  };
  for (let i = 0; i < 6; i++) REC['maintheme_' + i] = { file: 'maintheme_' + i, gap: [5, 9], mp3Every: 2, mp3Window: [110, 160], main: true };
  const recFailed = {};                    // pid -> true once its file 404'd, errored or stalled: that piece falls back for the session
  let recsOn = true;                       // tests can switch recordings off to exercise the procedural scheduler

  // ---- setting -------------------------------------------------------------------------------------
  function load() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && (o.mode === 'original' || o.mode === 'extended')) state.mode = o.mode; } catch (e) { /* no storage */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ mode: state.mode })); } catch (e) { /* no storage */ } }
  const extended = () => state.mode === 'extended';

  // ---- theory helpers ------------------------------------------------------------------------------
  const MODE = {
    lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10],
    minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9], aeol: [0, 2, 3, 5, 7, 8, 10],
  };
  function deg(root, mode, d) {
    const n = mode.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
    return root * Math.pow(2, (mode[i] + 12 * o) / 12);
  }
  const QT = Math.pow(2, -0.5 / 12);      // the quarter-tone the whole Octave sounds wrong by
  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- the rig: a convolver-free reverb (three feedback delays) shared by every piece ---------------
  function makeRig(ctx, dest) {
    const input = ctx.createGain(); input.gain.value = 1;
    // a soft clipper before the master (0.9 * tanh): transparent at normal levels, and stacked voices can never clip.
    // (DynamicsCompressorNode adds automatic make-up gain, so it is not a ceiling.)
    let lim = null;
    if (ctx.createWaveShaper) {
      lim = ctx.createWaveShaper(); const n = 2048, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 4 - 2; c[i] = 0.9 * Math.tanh(x / 0.9); }
      lim.curve = c; lim.oversample = 'none'; lim.connect(dest);   // 'none': oversampling filters ring past the curve on sharp hits
    }
    const out = lim || dest;
    const dry = ctx.createGain(); dry.gain.value = 0.9; input.connect(dry); dry.connect(out);
    const wet = ctx.createGain(); wet.gain.value = 0.4; input.connect(wet);
    const mix = ctx.createGain(); mix.gain.value = 0.55; mix.connect(out);
    const nodes = [input, dry, wet, mix]; if (lim) nodes.push(lim);
    for (const [d, fb, lp] of [[0.19, 0.46, 2600], [0.29, 0.42, 2000], [0.43, 0.38, 1400]]) {
      const dl = ctx.createDelay(1); dl.delayTime.value = d;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      const g = ctx.createGain(); g.gain.value = fb;
      wet.connect(dl); dl.connect(f); f.connect(g); g.connect(dl); f.connect(mix); nodes.push(dl, f, g);
    }
    // one short noise buffer shared by every noise voice (filled once; voices start it at random offsets)
    const len = Math.floor(ctx.sampleRate * 1.5), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = audioRnd() * 2 - 1;
    return { input, noise: buf, nodes };
  }

  // ---- voices: every note creates a few nodes that stop themselves --------------------------------
  function makeVoices(ctx, rig, inst) {
    const out = inst.out, rng = inst.rng;
    function env(g, t, vol, atk, dur, rel) {
      const p = g.gain; p.setValueAtTime(0.0001, t); p.linearRampToValueAtTime(vol, t + atk);
      const hold = t + Math.max(atk, dur); p.setValueAtTime(vol, hold); p.exponentialRampToValueAtTime(0.0001, hold + rel);
      return hold + rel;
    }
    function tone(t, f, dur, o) {
      o = o || {};
      const vol = o.vol == null ? 0.06 : o.vol, atk = o.atk == null ? 0.02 : o.atk, rel = o.rel == null ? 0.25 : o.rel;
      const g = ctx.createGain(); const end = env(g, t, vol, atk, dur, rel);
      let head = g;
      if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); if (o.lpTo) fl.frequency.linearRampToValueAtTime(o.lpTo, t + dur); fl.Q.value = o.q || 0.7; fl.connect(g); head = fl; }
      const mk = (det) => {
        const s = ctx.createOscillator(); s.type = o.type || 'sine'; s.frequency.setValueAtTime(f, t);
        if (o.to) s.frequency.linearRampToValueAtTime(o.to, t + (o.gt || dur));
        else if (o.vib) { s.frequency.setValueAtTime(f, t + dur * 0.35); s.frequency.linearRampToValueAtTime(f * (1 + o.vib), t + dur * 0.65); s.frequency.linearRampToValueAtTime(f, t + dur); }
        if (det) s.detune.value = det;
        s.connect(head); s.start(t); s.stop(end + 0.05);
      };
      if (o.det) { mk(o.det); mk(-o.det); } else mk(0);
      g.connect(o.dest || out);
    }
    function noise(t, dur, o) {
      o = o || {};
      const s = ctx.createBufferSource(); s.buffer = rig.noise; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 800, t);
      if (o.to) fl.frequency.linearRampToValueAtTime(o.to, t + dur); fl.Q.value = o.q == null ? 1 : o.q;
      const g = ctx.createGain(); const end = env(g, t, o.vol == null ? 0.05 : o.vol, o.atk == null ? 0.01 : o.atk, dur, o.rel == null ? 0.1 : o.rel);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(t, rng() * 1.2); s.stop(end + 0.05);
    }
    // a struck bell: fundamental plus inharmonic partials, decaying from the first instant
    const bell = (t, f, decay, vol) => {
      tone(t, f, 0.01, { vol, atk: 0.004, rel: decay });
      tone(t, f * 2.76, 0.01, { vol: vol * 0.32, atk: 0.003, rel: decay * 0.55 });
      tone(t, f * 5.4, 0.01, { vol: vol * 0.1, atk: 0.003, rel: decay * 0.3 });
    };
    const kick = (t, vol, f0) => tone(t, f0 || 120, 0.01, { vol, atk: 0.004, rel: 0.24, to: 42, gt: 0.2 });
    const snare = (t, vol) => { noise(t, 0.02, { type: 'highpass', f: 1800, q: 0.5, vol, rel: 0.14 }); tone(t, 190, 0.01, { vol: vol * 0.5, rel: 0.1, type: 'triangle' }); };
    // a persistent drone (stopped when the piece retires)
    function drone(f, vol, o) {
      o = o || {};
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.setTargetAtTime(vol, ctx.currentTime, 1.5);
      let head = g;
      if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.connect(g); head = fl; }
      const s = ctx.createOscillator(); s.type = o.type || 'sine'; s.frequency.value = f; if (o.det) s.detune.value = o.det;
      s.connect(head); s.start(); g.connect(out); inst.drones.push(s, g);
      return s;
    }
    return { tone, noise, bell, kick, snare, drone, r: rng, pick: (a) => a[Math.floor(rng() * a.length)], ctx };
  }

  // ---- the pieces ----------------------------------------------------------------------------------
  // bar(V, t, i, S): schedule bar i starting at audio time t; V.spb seconds per beat, V.bl seconds per bar.
  const P = {};

  // OAKHAVEN: Growth. 174 Hz root, lydian, orchard pluck under a wind-reed that answers itself.
  P.oakhaven = {
    name: 'Oakhaven: Growth', trim: 1.7, bpm: 76, beats: 4, bars: [34, 44], gap: [16, 32], mp3Every: 2, mp3Window: [150, 220], mode: MODE.lydian, root: 174,
    init(V, S) { S.prog = [0, 4, 5, 3]; S.motif = V.pick([[0, 2, 4, 2, 1], [0, 1, 2, 4, 3], [2, 4, 6, 4, 2]]); V.drone(87, 0.025); V.drone(174, 0.018); },
    bar(V, t, i, S) {
      const m = P.oakhaven.mode, R = 174, sec = Math.floor(i / 8) % 4, c = S.prog[i % 4];
      const dens = [0.35, 0.6, 0.55, 0.75][sec];
      for (let j = 0; j < 8; j++) {
        if (V.r() > dens) continue;
        const d = c + [0, 2, 4, 7, 4, 2, 4, 9][j];
        V.tone(t + j * V.spb / 2, deg(R * 2, m, d), 0.05, { type: 'triangle', vol: 0.05, atk: 0.006, rel: 0.5, lp: 2600 });
      }
      if (sec >= 1 && i % 2 === 0) {          // the reed phrase: motif notes, sequenced up through the bloom
        let at = V.r() < 0.5 ? 0 : V.spb;
        for (const n of S.motif) {
          const len = V.spb * (V.r() < 0.4 ? 2 : 1);
          if (at + len > V.bl * 1.05) break;
          V.tone(t + at, deg(R * 2, m, c + n + (sec === 3 ? 2 : 0)), len * 0.9, { type: 'triangle', vol: 0.07, atk: 0.12, rel: 0.4, lp: 1700, vib: 0.006 });
          at += len;
        }
        V.noise(t, V.bl * 0.6, { type: 'bandpass', f: 3200, q: 1.5, vol: 0.006, atk: 0.4, rel: 0.5 });   // breath
      }
      if (sec === 3 && i % 4 === 0) for (const d of [0, 2, 4]) V.tone(t, deg(R, m, c + d), V.bl * 1.6, { vol: 0.03, atk: 1.2, rel: 1.4 });   // the bloom
      if (i % 2 === 1 && V.r() < 0.6) V.noise(t, V.bl * 0.5, { f: 520, to: 380, q: 0.6, vol: 0.012, atk: 0.9, rel: 1 });   // wind in the hedge
    },
  };

  // WHISPER-GROVE: Memory. 741 Hz flavour: glassy, sparse, lilac.
  P.whispergrove = {
    name: 'Whisper-Grove: Memory', trim: 2, bpm: 50, beats: 4, bars: [22, 30], gap: [18, 34], mp3Every: 2, mp3Window: [140, 200], mode: MODE.pent, root: 370.5,
    init(V, S) { S.last = 0; V.drone(741, 0.006); },
    bar(V, t, i, S) {
      const m = P.whispergrove.mode, R = 370.5, grow = Math.min(1, i / 8);
      const strikes = V.r() < 0.35 + 0.35 * grow ? 1 + (V.r() < 0.4 ? 1 : 0) : 0;
      for (let k = 0; k < strikes; k++) {
        const d = Math.max(0, Math.min(9, S.last + V.pick([-2, -1, 1, 2, 3])));
        S.last = d;
        V.bell(t + V.r() * V.bl * 0.7, deg(R, m, d), 3.2, 0.045);
        if (V.r() < 0.25) V.bell(t + V.r() * V.bl * 0.7 + 0.35, deg(R, m, d + 2), 3, 0.025);
      }
      if (i % 4 === 2 && i > 3) for (const d of [0, 2, 4]) V.tone(t, deg(R / 2, m, d), V.bl * 1.4, { vol: 0.026, atk: 1.6, rel: 1.8, det: 5 });   // lilac pad
      if (i % 6 === 5) V.noise(t, V.bl * 0.5, { type: 'highpass', f: 4200, q: 0.5, vol: 0.016, atk: 2.2, rel: 0.3 });   // a reversed swell
    },
  };

  // THE DEEP WOODS: willow, low strings, dread.
  P.deepwoods = {
    name: 'Deep Woods: Willow', bpm: 46, beats: 4, bars: [20, 28], gap: [14, 30], mp3Every: 0, mode: MODE.phryg, root: 87.31,
    init(V, S) { S.prog = [0, 1, 0, 5, 0, 6, 3, 1]; V.drone(43.65, 0.04); },
    bar(V, t, i, S) {
      const m = P.deepwoods.mode, R = 87.31, c = S.prog[Math.floor(i / 2) % S.prog.length];
      if (i % 2 === 0) {
        for (const d of [c, c + 4, c + 7]) V.tone(t, deg(R, m, d), V.bl * 1.7, { type: 'sawtooth', vol: 0.03, atk: V.bl * 0.7, rel: V.bl * 0.7, lp: 620, det: 7 });
        if (V.r() < 0.5) V.tone(t + 1, deg(R * 2, m, c + 1), V.bl * 1.2, { type: 'sawtooth', vol: 0.016, atk: V.bl * 0.6, rel: V.bl * 0.6, lp: 520, det: 9 });   // the minor second leans in
      }
      if (V.r() < 0.45) V.noise(t + V.r() * 2, V.bl * 0.7, { f: 900, to: 480, q: 3, vol: 0.02, atk: 1.2, rel: 1.4 });   // wind through the fronds
      if (V.r() < 0.3) V.noise(t + V.r() * V.bl, 0.1, { f: 170, q: 2, vol: 0.09, rel: 0.2 });                          // a knock in the wood
      if (V.r() < 0.25) { const f = deg(R * 8, m, c); V.tone(t + V.r() * 2, f, 3.4, { vol: 0.012, atk: 1.4, rel: 1.4, to: f * 0.945, gt: 3.4 }); }   // a bowed harmonic sinking
    },
  };

  // QUARRY: stone and iron; hammers, drips, a phrygian bass.
  P.quarry = {
    name: 'Quarry: Stone', bpm: 60, beats: 4, bars: [26, 36], gap: [12, 26], mp3Every: 0, mode: MODE.phryg, root: 65.41,
    init(V, S) { S.pat = [[0, 1.5], [0, 2], [0, 1, 3], [0.5, 2.5], [0, 1.5, 2, 3.5]]; V.drone(65.41, 0.05, { type: 'sawtooth', lp: 170 }); },
    bar(V, t, i, S) {
      const m = P.quarry.mode, R = 65.41;
      if (i % 4 !== 3) for (const b of V.pick(S.pat)) {
        const at = t + b * V.spb;
        V.noise(at, 0.02, { f: 1800, q: 6, vol: 0.07, rel: 0.08 });
        V.tone(at, 480 + V.r() * 260, 0.01, { vol: 0.022, rel: 0.45 });
        V.kick(at, 0.09, 95);
      }
      if (i % 2 === 0) V.tone(t, deg(R * 2, m, V.pick([0, 0, 1, 3])), V.spb * 1.6, { type: 'triangle', vol: 0.07, atk: 0.05, rel: 0.6, lp: 500 });
      if (V.r() < 0.4) { const at = t + V.r() * V.bl; V.tone(at, 1500 + V.r() * 600, 0.01, { vol: 0.03, rel: 0.14, to: 600, gt: 0.14 }); }   // a drip
    },
  };

  // ROOT-VAULT and UNDER-HEDGE: the Root's own harmonic series, green and beating.
  P.rootvault = {
    name: 'Root-vault: Harmonics', bpm: 40, beats: 4, bars: [16, 24], gap: [12, 26], mp3Every: 0, mode: MODE.pent, root: 87,
    init(V) { V.drone(87, 0.05); V.drone(86.6, 0.04); V.drone(174, 0.03); },
    bar(V, t, i) {
      const H = [3, 4, 5, 6, 8, 9];
      if (i % 2 === 0 && V.r() < 0.7) {          // an ascending run up the series
        const n = 3 + Math.floor(V.r() * 3), start = Math.floor(V.r() * 2);
        for (let k = 0; k < n; k++) V.tone(t + k * V.spb * 0.5, 87 * H[Math.min(5, start + k)], 2, { vol: 0.03, atk: 0.02, rel: 1.8 });
      }
      V.noise(t, V.bl * 0.9, { type: 'lowpass', f: 300, q: 0.5, vol: 0.026, atk: V.bl * 0.4, rel: V.bl * 0.4 });   // the roots breathing
      if (i % 5 === 4) V.tone(t, 174, V.bl, { vol: 0.05, atk: 1, rel: 1.5, to: 172, gt: V.bl });                    // the Root note, leaning flat
    },
  };

  // CATACOMBS: whispers, a bone flute, a far bell.
  P.catacombs = {
    name: 'Catacombs: Whispers', bpm: 44, beats: 4, bars: [18, 26], gap: [14, 28], mp3Every: 0, mode: MODE.dorian, root: 164.8,
    init(V) { V.drone(82.4, 0.035); },
    bar(V, t, i) {
      const m = P.catacombs.mode, R = 164.8;
      if (V.r() < 0.5) {                          // a breath with two vowel formants sliding
        const at = t + V.r() * 2;
        V.noise(at, 2.8, { f: 600, to: 420, q: 7, vol: 0.05, atk: 1, rel: 1 });
        V.noise(at, 2.8, { f: 1400, to: 1100, q: 8, vol: 0.03, atk: 1, rel: 1 });
      }
      if (i % 2 === 1 && V.r() < 0.55) {          // the bone flute
        let at = t + V.r();
        for (let k = 0, n = 1 + Math.floor(V.r() * 3); k < n; k++) { const d = V.pick([4, 5, 7, 9]); V.tone(at, deg(R * 2, m, d), 1.6, { type: 'triangle', vol: 0.03, atk: 0.25, rel: 0.9, vib: 0.01 }); V.noise(at, 1.4, { type: 'highpass', f: 3500, q: 0.6, vol: 0.004, atk: 0.3, rel: 0.5 }); at += V.spb * (1 + V.r()); }
      }
      if (i % 4 === 0) for (const d of [0, 2, 4]) V.tone(t, deg(R / 2, m, d), V.bl * 2, { vol: 0.03, atk: 2, rel: 2, lp: 800, det: 4 });   // a choir with no singers
      if (V.r() < 0.2) V.bell(t + V.r() * V.bl, 220, 4, 0.05);
    },
  };

  // MAUSOLEUM and BELL-TOWER: parallel fifths on a slow organ, a funeral bell tolling a quarter-tone wrong.
  P.mausoleum = {
    name: 'Mausoleum: Chords', bpm: 42, beats: 4, bars: [16, 24], gap: [14, 28], mp3Every: 0, mode: MODE.minor, root: 98,
    init(V) { V.drone(49, 0.035); },
    bar(V, t, i) {
      const m = P.mausoleum.mode, R = 98;
      if (i % 2 === 0) {
        const c = -[0, 1, 2, 3, 1, 0][Math.floor(i / 2) % 6];
        for (const d of [c, c + 4]) for (const [h, a] of [[1, 1], [2, 0.5], [3, 0.3], [4, 0.2], [6, 0.1]]) V.tone(t, deg(R, m, d) * h, V.bl * 1.9, { vol: 0.016 * a, atk: 1.8, rel: 1.6 });
      }
      if (i % 4 === 1) { V.bell(t, 110, 5, 0.08); if (V.r() < 0.5) V.bell(t + V.spb * 2, 110 * QT, 5, 0.04); }
      if (i % 3 === 0) V.noise(t, V.bl, { type: 'lowpass', f: 700, q: 0.5, vol: 0.012, atk: 2, rel: 2 });
    },
  };

  // ---- boss themes: short ostinato loops that take over from 'combat' --------------------------------
  P.boss_requiem = {
    name: 'The Requiem', bpm: 140, beats: 6, bars: null, mode: MODE.minor, root: 116,
    init(V, S) { S.v = 0; },
    bar(V, t, i, S) {
      const m = MODE.minor, R = 116, c = [[0, 0, 5, 3], [0, 3, 5, 4]][Math.floor(i / 8) % 2][i % 4];
      V.kick(t, 0.2); V.kick(t + V.spb * 3, 0.16);
      if (V.r() < 0.5) V.kick(t + V.spb * 4.5, 0.1);
      V.bell(t, 174, 2.2, 0.08);
      if (i % 2 === 0) for (const d of [c, c + 2, c + 4]) V.tone(t, deg(R * 2, m, d), V.bl * 1.9, { type: 'sawtooth', vol: 0.02, atk: 0.5, rel: 0.7, lp: 1100, det: 8 });   // choir stack
      V.tone(t + V.spb * 3, deg(R, m, c), V.spb * 2, { type: 'sawtooth', vol: 0.05, atk: 0.02, rel: 0.3, lp: 900 });
    },
  };
  P.boss_broodmother = {
    name: 'The Brood-Mother', bpm: 140, beats: 4, bars: null, mode: MODE.phryg, root: 220,
    bar(V, t, i) {
      const m = MODE.phryg;
      for (let j = 0; j < 16; j++) if (V.r() < 0.5) V.tone(t + j * V.spb / 4, deg(880, m, V.pick([0, 1, 2, 4, 5])), 0.03, { type: 'triangle', vol: 0.035, atk: 0.003, rel: 0.07 });   // skittering
      for (let j = 0; j < 8; j++) V.tone(t + j * V.spb / 2, deg(55, m, j % 4 === 3 ? 1 : 0), V.spb * 0.35, { type: 'sawtooth', vol: j % 2 ? 0.035 : 0.06, atk: 0.01, rel: 0.1, lp: 280 });
      if (V.r() < 0.4) { const f = 1800 + V.r() * 500; V.tone(t + V.r() * V.bl, f, 1.2, { vol: 0.02, atk: 0.1, rel: 0.4, to: f * 0.75, gt: 1.2 }); }   // a glass thread drawn taut
      if (i % 4 === 0) V.kick(t, 0.15);
    },
  };
  P.boss_weaver = {
    name: 'The Phantom Weaver', bpm: 100, beats: 4, bars: null, mode: MODE.pent, root: 370.5,
    init(V) { V.drone(185.25, 0.03); V.drone(261.6, 0.025); },     // the tritone the thread hangs on
    bar(V, t, i) {
      const m = MODE.pent, A = [0, 2, 4, 6], B = [9, 7, 5, 3], off = (Math.floor(i / 4) % 3) * 2;
      for (let j = 0; j < 8; j++) {            // two lines braided: A on the even eighths, B on the odd
        const d = (j % 2 ? B : A)[j >> 1];
        V.bell(t + j * V.spb / 2, deg(370.5, m, d + off), 1.1, 0.035);
      }
      V.kick(t, 0.1, 100);
      if (i % 4 === 3) { V.noise(t + V.spb * 3.5, 0.02, { type: 'highpass', f: 6000, q: 0.5, vol: 0.05, rel: 0.08 }); V.tone(t + V.spb * 3.5, 1500, 0.01, { vol: 0.03, rel: 0.4, to: 300, gt: 0.4 }); }   // the thread snaps
    },
  };
  P.boss_aegis = {
    name: 'The Aegis Sentinel', bpm: 80, beats: 4, bars: null, mode: MODE.minor, root: 98,
    bar(V, t, i) {
      const c = [0, 0, 3, 4][i % 4];
      for (const b of [0, 2]) { V.bell(t + b * V.spb, 98, 1.6, 0.1); V.kick(t + b * V.spb, 0.18, 80); }
      V.snare(t + V.spb * 1, 0.05); V.snare(t + V.spb * 3, 0.05);
      for (const d of [c, c + 4]) V.tone(t, deg(98, MODE.minor, d), V.spb * 3, { type: 'sawtooth', vol: 0.03, atk: 0.06, rel: 0.5, lp: 780, det: 5 });   // bronze brass
    },
  };
  P.boss_pressman = {
    name: 'Pressman Mallow', bpm: 124, beats: 4, bars: null, mode: MODE.phryg, root: 55,
    bar(V, t, i) {
      for (let j = 0; j < 8; j++) {
        const at = t + j * V.spb / 2;
        V.noise(at, 0.02, { type: 'highpass', f: 2600, q: 0.6, vol: j % 2 ? 0.03 : 0.05, rel: 0.05 });       // the press clacks
        V.tone(at, 55 * (j % 4 === 0 ? 1 : 1.06), 0.05, { type: 'triangle', vol: j % 4 === 0 ? 0.09 : 0.05, rel: 0.12, lp: 300 });
      }
      for (const b of [0, 2.5]) V.tone(t + b * V.spb, 741, 0.15, { type: 'square', vol: 0.03, atk: 0.005, rel: 0.12, lp: 3000 });   // the press-note, 741
      V.tone(t + V.spb * 3, 1480 * (1 + V.r() * 0.2), 0.01, { vol: 0.025, rel: 0.2 });
    },
  };
  P.boss_deacon = {
    name: 'The Deacon of the Unrung Bell', bpm: 66, beats: 4, bars: null, mode: MODE.minor, root: 110,
    init(V) { V.drone(55, 0.03); },
    bar(V, t, i) {
      // the bell that is never rung: partials swell in, then are cut off before any strike
      if (i % 2 === 0) for (const [h, a] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) V.tone(t, 220 * h, V.bl * 1.5, { vol: 0.06 * a, atk: V.bl * 1.45, rel: 0.03 });
      for (const d of [0, 2]) V.tone(t, deg(110, MODE.minor, d + (i % 8 > 3 ? 3 : 0)), V.bl, { type: 'sawtooth', vol: 0.02, atk: 1, rel: 1, lp: 520, det: 6 });
      V.kick(t, 0.1, 70); V.kick(t + V.spb * 0.5, 0.06, 70);
    },
  };
  P.boss_wearer = {
    name: 'The Wearer', bpm: 112, beats: 4, bars: null, mode: MODE.phryg, root: 174,
    bar(V, t, i) {
      V.tone(t, 174, V.spb, { type: 'sawtooth', vol: 0.05, atk: 0.01, rel: 0.2, lp: 1500, to: 116, gt: V.spb });            // the falling fifth...
      V.tone(t + 0.04, 174 * QT, V.spb, { type: 'sawtooth', vol: 0.03, atk: 0.01, rel: 0.2, lp: 1500, to: 116 * QT, gt: V.spb });   // ...and its wrong echo
      for (let j = 0; j < 4; j++) if (V.r() < 0.85) V.kick(t + j * V.spb, j % 2 ? 0.08 : 0.15);
      if (V.r() < 0.7) for (let k = 0; k < 3; k++) V.tone(t + V.spb * 2.5, 220 * Math.pow(2, (k * 3.5 + V.r()) / 12), 0.12, { type: 'sawtooth', vol: 0.03, atk: 0.005, rel: 0.1, lp: 2400 });   // quarter-tone cluster stab
      if (i % 2) V.noise(t + V.spb * 3, 0.1, { f: 1500, q: 0.8, vol: 0.05, rel: 0.12 });
    },
  };
  P.boss_golem = {
    name: 'The Steam Golem', bpm: 88, beats: 4, bars: null, mode: MODE.phryg, root: 55,
    bar(V, t, i) {
      for (const b of [0, 1.5, 3]) {            // 3-3-2 pistons
        V.tone(t + b * V.spb, 55, 0.08, { type: 'square', vol: 0.07, atk: 0.005, rel: 0.12, lp: 240 });
        V.noise(t + b * V.spb + 0.05, 0.1, { type: 'highpass', f: 4000, q: 0.5, vol: 0.035, rel: 0.22 });
      }
      V.noise(t + V.spb * 2, 0.3, { f: 300, q: 1, vol: 0.03, atk: 0.1, rel: 0.2 });
    },
  };
  P.boss_captain = {
    name: 'Outrider-Captain Brennick', bpm: 118, beats: 4, bars: null, mode: MODE.mixo, root: 220,
    bar(V, t, i) {
      V.kick(t, 0.1); V.kick(t + V.spb * 2, 0.08);
      if (i % 2) for (let j = 0; j < 8; j++) V.snare(t + V.spb * 3 + j * V.spb / 8, 0.008 + j * 0.002);   // roll
      else V.snare(t + V.spb, 0.05), V.snare(t + V.spb * 3, 0.05);
      const call = [[0, 3, 4], [0, 4, 7], [4, 3, 0]][Math.floor(i / 4) % 3];
      call.forEach((d, k) => V.tone(t + k * V.spb, deg(220, MODE.mixo, d), V.spb * 0.9, { type: 'sawtooth', vol: 0.035, atk: 0.03, rel: 0.2, lp: 1000 }));
    },
  };

  // ---- the main theme layer: 174 Hz motif that follows the story ---------------------------------------
  const STAGES = ['alone', 'harmonised', 'shadowed', 'broken', 'reforming', 'restored'];
  function storyStage(flags) {
    const f = flags || {};
    if (f.book_one_done) return 5;
    if (f.part4) return 4;
    if (f.part3 || f.greening || f.bore_broken) return 3;
    if (f.rite_started) return 2;
    if (f.lyra_met || f.gate_open) return 1;
    return 0;
  }
  P.maintheme = {
    name: 'Main theme', bpm: 60, beats: 8, bars: null, layer: true, mode: MODE.aeol, root: 174,
    init(V, S) { S.motif = [0, 2, 4, 3, 1, 0]; S.sustain = null; },
    bar(V, t, i, S) {
      const stage = S.stage = storyStage(typeof G !== 'undefined' ? G.flags : null), m = MODE.aeol;
      const R = 174 * (stage >= 5 ? 1 : stage >= 1 ? Math.pow(QT, 1 - Math.min(1, stage / 4)) : QT);   // the tuning heals with the story
      if (V.r() < 0.12 && stage < 5) return;                  // the layer leaves room for the recording
      let at = V.r() * V.spb;
      S.motif.forEach((n, k) => {
        const when = t + at + k * V.spb * 1.1;
        let f = deg(R * 2, m, n), dur = V.spb * 1.3, o = { vol: 0.045, atk: 0.05, rel: 0.7 };
        if (stage === 3) {                                    // broken: notes dropped, bent, cut short
          if (V.r() < 0.35) return;
          if (V.r() < 0.4) f *= Math.pow(2, V.pick([-1, 1, -2]) / 12);
          dur *= 0.5; o.rel = 0.12;
          if (V.r() < 0.2) V.noise(when, 0.04, { type: 'highpass', f: 5000, q: 0.5, vol: 0.025, rel: 0.1 });
        }
        if (stage === 4 && k > 3 && V.r() < 0.3) return;
        V.tone(when, f, dur, Object.assign({ type: 'triangle', lp: 2400 }, o));
        V.tone(when, f * 2, dur * 0.6, { vol: 0.012, atk: 0.04, rel: 0.5 });
        if (stage >= 1 && stage !== 3) V.tone(when, deg(R, m, n - 2), dur, { vol: 0.025, atk: 0.1, rel: 0.8 });                        // the answering voice a third below
        if (stage >= 5 && k % 2 === 0) V.bell(when, f * 2, 2.4, 0.03);
      });
      if (stage === 2 || stage === 3) V.tone(t, R / 2 * 1.0594, V.bl * 0.9, { vol: 0.02, atk: 1.5, rel: 1.5 });                          // a minor-second shadow under it
      if (stage === 4 && i % 2 === 0) for (const d of [0, 4]) V.tone(t, deg(R / 2, m, d), V.bl * 1.6, { type: 'sawtooth', vol: 0.016, atk: 2.5, rel: 2, lp: 600, det: 5 });   // strings re-form
      if (stage >= 4) V.tone(t, R / (stage === 5 ? 1 : 1.03), V.bl * 1.3, { vol: stage === 5 ? 0.05 : 0.02, atk: 2, rel: 2 });          // the 174 root, returning
    },
  };

  const defOf = (pid) => P[pid] || REC[pid];
  const recOK = (pid) => recsOn && !ctxOverride && !!REC[pid] && !recFailed[pid] && typeof Audio !== 'undefined';

  // ---- area and boss choice: pure functions -----------------------------------------------------------
  const AREA_BY_MAP = {
    oakhaven: 'oakhaven', whispergrove: 'whispergrove', deepwoods: 'deepwoods',
    quarry: 'quarry', malting: 'quarry', rootvault: 'rootvault', underhedge: 'rootvault',
    catacombs: 'catacombs', mausoleum: 'mausoleum', belfry: 'mausoleum',
  };
  // which MP3 cue each area's piece may stand in for (a request for anything else, say 'tavern', is left alone)
  const CUES_FOR = {
    oakhaven: ['town'], whispergrove: ['grove'], deepwoods: ['coda', 'wild'],
    quarry: ['dungeon'], rootvault: ['dungeon'], catacombs: ['dungeon'], mausoleum: ['coda'],
  };
  function pieceFor(mapId, cue) {
    const pid = AREA_BY_MAP[mapId];
    return pid && CUES_FOR[pid].indexOf(cue) >= 0 ? pid : null;
  }
  const BOSS_BY_TYPE = {
    requiem: 'boss_requiem', broodmother: 'boss_broodmother', weaver: 'boss_weaver', aegis: 'boss_aegis', pressman: 'boss_pressman',
    deacon: 'boss_deacon', wearer: 'boss_wearer', wearer_coda: 'boss_wearer', golem: 'boss_golem', captain: 'boss_captain',
  };
  const bossFor = (type) => BOSS_BY_TYPE[type] || null;
  // the nearest boss that is chasing the player; musicDirector's own fight test (196) widened a little so a themed
  // boss is picked up as soon as 'combat' is requested
  function engagedBoss() {
    if (typeof G === 'undefined' || !G.ents || typeof Engine === 'undefined') return null;
    const c = Engine.cam; let best = null, bd = 1e9;
    for (const e of G.ents) {
      if (e.kind !== 'enemy' || e.dead || e.hidden || e.state !== 'chase' || !BOSS_BY_TYPE[e.type]) continue;
      const d = (e.x - c.x) * (e.x - c.x) + (e.y - c.y) * (e.y - c.y);
      if (d < 400 && d < bd) { bd = d; best = e; }
    }
    return best ? best.type : null;
  }

  // ---- instances and the scheduler ---------------------------------------------------------------------
  let ctxOverride = null, rig = null, rigCtx = null;
  const insts = { area: null, boss: null, layer: null };
  const AS = { pid: null, phase: 'play', t: 0, count: 0 };             // area state machine: play | gap | mp3
  const want = { area: null, boss: null, layer: null };                // {pid, level} set by request(), consumed by tick()
  const retired = [];
  let seedBase = null, seedN = 0;
  const live = () => ctxOverride || (typeof Audio_ !== 'undefined' ? Audio_.ctx : null);
  const dest = () => (ctxOverride ? ctxOverride.__master : (typeof Audio_ !== 'undefined' ? Audio_.master : null));
  const silent = () => typeof Audio_ === 'undefined' || Audio_.muted || !(Audio_.music && Audio_.music.enabled);
  const nextSeed = () => (seedBase == null ? (audioRnd() * 4294967296) >>> 0 : (seedBase + (seedN++) * 7919) >>> 0);

  function ensureRig(ctx) {
    if (rig && rigCtx === ctx) return rig;
    rigCtx = ctx; rig = makeRig(ctx, dest());
    return rig;
  }
  // a recorded piece: an <audio> element routed into the piece's gain. Same instance shape as a procedural one, so the
  // scheduler, crossfades and retiring treat both alike; there is just nothing to schedule.
  function makeRecInstance(ctx, pid, level) {
    const spec = REC[pid], el = new Audio();
    el.preload = 'auto'; el.loop = !!spec.loop; el.src = REC_DIR + spec.file + '.mp3' + REC_V;
    const src = ctx.createMediaElementSource(el);       // throws on a context that cannot route media: caller falls back
    const out = ctx.createGain(); out.gain.value = 0.0001; src.connect(out); out.connect(dest());
    const inst = { pid, def: defOf(pid), ctx, out, rec: true, el, src, bar: 0, next: 0, done: false, endAt: 0, drones: [], S: {}, idle: 0, born: ctx.currentTime, level, failed: false, starting: false, playFails: 0 };
    el.addEventListener('error', () => { inst.failed = true; });
    el.addEventListener('ended', () => { inst.done = true; inst.endAt = ctx.currentTime; });
    inst.dispose = () => {
      try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) { /* already gone */ }
      try { src.disconnect(); } catch (e) { /* ok */ }
    };
    return inst;
  }
  function recPlay(inst) {
    if (inst.done || inst.starting || !inst.el.paused) return;
    inst.starting = true;
    const p = inst.el.play();
    const ok = () => { inst.starting = false; };
    const bad = () => { inst.starting = false; if (++inst.playFails > 6) inst.failed = true; };
    if (p && p.then) p.then(ok, bad); else ok();
  }
  function makeInstance(ctx, pid, level) {
    if (recOK(pid)) {
      try { return makeRecInstance(ctx, pid, level); } catch (e) { recFailed[pid] = true; console.warn('score recording unavailable for ' + pid, e); }
    }
    const def = P[pid], r = ensureRig(ctx);
    const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(r.input);
    const inst = { pid, def, ctx, out, rng: rngFrom(nextSeed()), bar: 0, next: ctx.currentTime + 0.15, done: false, endAt: 0, drones: [], S: {}, idle: 0, born: ctx.currentTime, level };
    const tempo = 0.96 + inst.rng() * 0.08;
    const V = inst.V = makeVoices(ctx, r, inst);
    V.spb = 60 / (def.bpm * tempo); V.bl = V.spb * def.beats;
    inst.total = def.bars ? Math.round(def.bars[0] + inst.rng() * (def.bars[1] - def.bars[0])) : Infinity;
    if (def.init) def.init(V, inst.S);
    return inst;
  }
  function setLevel(inst, level, tau) {
    if (!inst) return;
    inst.level = level;
    const k = inst.rec ? REC_GAIN : GAIN * (inst.def.trim || 1);
    try { inst.out.gain.setTargetAtTime(Math.max(0.0001, level * k), inst.ctx.currentTime, tau || (level > 0 ? 0.7 : 0.45)); } catch (e) { inst.out.gain.value = level * k; }
  }
  function retire(inst) {
    if (!inst) return;
    setLevel(inst, 0, 0.5);
    retired.push({ inst, at: inst.ctx.currentTime + 4 });
  }
  function reap(now) {
    for (let k = retired.length - 1; k >= 0; k--) {
      const r = retired[k]; if (now < r.at) continue;
      for (const n of r.inst.drones) { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) { /* already stopped */ } }
      if (r.inst.dispose) r.inst.dispose();
      try { r.inst.out.disconnect(); } catch (e) { /* ok */ }
      retired.splice(k, 1);
    }
  }
  function advance(inst, now) {
    if (inst.rec) return;                                       // a recording plays itself
    while (!inst.done && inst.next < now + LOOK) {
      if (inst.next < now) inst.next = now + 0.05;             // resumed after a pause: never schedule into the past
      inst.def.bar(inst.V, inst.next, inst.bar, inst.S);
      inst.next += inst.V.bl; inst.bar++;
      if (inst.bar >= inst.total) { inst.done = true; inst.endAt = inst.next + 2.5; }
    }
  }
  const rand = (a, rngv) => a[0] + (rngv == null ? audioRnd() : rngv) * (a[1] - a[0]);

  function dropAll() {
    for (const k of ['area', 'boss', 'layer']) { retire(insts[k]); insts[k] = null; want[k] = null; }
    AS.pid = null; AS.phase = 'play'; AS.t = 0; AS.count = 0;
  }

  // plan(): decide what this request means. Returns true to forward the original request, false to forward null.
  function plan(id, vol, rate) {
    want.area = want.boss = want.layer = null;
    if (!extended() || !live() || id == null) return true;
    const level = vol == null ? 1 : vol;
    if (id === 'combat') {
      const b = engagedBoss();
      if (b) { want.boss = { pid: BOSS_BY_TYPE[b], level }; return false; }
      return true;
    }
    if (id === 'title' || id === 'ending') {
      const mp = 'maintheme_' + storyStage(typeof G !== 'undefined' ? G.flags : null);
      if (recOK(mp)) return planArea(mp, level);                // the stage's recording takes turns with the title cue
      want.layer = { pid: 'maintheme', level: level * 0.9 }; return true;   // fallback: the procedural motif over title.mp3
    }
    const pid = typeof G !== 'undefined' ? pieceFor(G.mapId, id) : null;
    if (!pid) return true;
    return planArea(pid, level);
  }
  // the area slot: play (recording or procedural piece) -> gap -> maybe the MP3 cue's turn -> play again
  function planArea(pid, level) {
    if (AS.pid !== pid) { retire(insts.area); insts.area = null; AS.pid = pid; AS.phase = 'play'; AS.t = 0; AS.count = 0; }
    want.area = { pid, level };
    return AS.phase === 'mp3';
  }

  // tick(dt): follow the wants, create/retire instances, and schedule notes. Cheap: a few comparisons per frame.
  function tick(dt) {
    const ctx = live(); if (!ctx) return;
    const now = ctx.currentTime;
    reap(now);
    if (!extended()) return;
    const quiet = silent();
    for (const k of ['area', 'boss', 'layer']) {
      const w = want[k]; let inst = insts[k];
      const lvl = w && !quiet ? w.level : 0;
      if (k === 'area' && w && AS.phase !== 'play') {
        if (!quiet) AS.t -= dt;
        if (AS.t <= 0) {
          if (AS.phase === 'mp3') { AS.phase = 'play'; }
          else {                                                      // end of a gap: maybe hand the turn to the MP3 cue
            AS.count++;
            const def = defOf(AS.pid);
            if (def.mp3Every && AS.count % def.mp3Every === 0) { AS.phase = 'mp3'; AS.t = rand(def.mp3Window); } else AS.phase = 'play';
          }
        }
        continue;
      }
      if (w && inst && inst.pid !== w.pid) { retire(inst); inst = insts[k] = null; }
      if (inst && inst.rec && (inst.failed || inst.el.error || (now - inst.born > 12 && inst.el.readyState < 2 && !inst.el.paused))) {
        // the recording is missing or broken: this piece falls back to its procedural version for the rest of the session
        recFailed[inst.pid] = true; console.warn('score: recording failed, falling back: ' + inst.pid);
        retire(inst); inst = insts[k] = null;
        if (REC[w ? w.pid : ''] && REC[w.pid].main) { AS.pid = null; want.area = null; continue; }   // main theme: the layer path takes over next request
      }
      if (lvl > 0.001 && !inst && ctx.state !== 'closed') inst = insts[k] = makeInstance(ctx, w.pid, 0);
      if (!inst) continue;
      if (lvl > 0.001) {
        inst.idle = 0;
        if (Math.abs(inst.level - lvl) > 0.01) setLevel(inst, lvl);
        if (inst.rec) { if (ctx.state === 'running') recPlay(inst); }
        else if (ctx.state === 'running' || ctxOverride) advance(inst, now);
        if (inst.done && now >= inst.endAt && k === 'area') {                 // the piece has played through: fall silent
          retire(inst); insts.area = null; AS.phase = 'gap'; AS.t = rand(defOf(AS.pid).gap);
        }
      } else {
        if (inst.level > 0) setLevel(inst, 0);
        inst.idle += dt;
        if (inst.rec && inst.idle > 2.5 && !inst.el.paused) { try { inst.el.pause(); } catch (e) { /* ok */ } }   // faded out: stop streaming
        // a boss theme or title layer never resumes mid-phrase; an area piece waits a minute for you to come back
        if (inst.idle > (k === 'area' ? 60 : 4)) { retire(inst); insts[k] = null; }
      }
    }
  }

  // ---- wiring ---------------------------------------------------------------------------------------
  function wire() {
    if (typeof Audio_ === 'undefined' || !Audio_.music) return;
    const M = Audio_.music, _req = M.request, _tick = M.tick;
    M.request = function (id, vol, rate) {
      let fwd = true;
      try { fwd = plan(id, vol, rate); } catch (e) { console.warn('score plan failed', e); want.area = want.boss = want.layer = null; fwd = true; }
      return fwd ? _req.apply(this, arguments) : _req.call(this, null);
    };
    M.tick = function (dt) {
      const r = _tick.apply(this, arguments);
      try { tick(dt); } catch (e) { console.warn('score tick failed', e); }
      return r;
    };
    if (typeof renderAccessibilityMenu === 'function') {
      const _acc = renderAccessibilityMenu;
      renderAccessibilityMenu = function () {
        const r = _acc.apply(this, arguments);
        try { appendRow(); } catch (e) { console.warn('score row failed', e); }
        return r;
      };
    }
  }
  function setMode(m) {
    if (m !== 'original' && m !== 'extended') return state.mode;
    state.mode = m; save();
    if (m === 'original') dropAll();
    return state.mode;
  }
  function el(tag, props, text) {
    const e = document.createElement(tag);
    if (props) for (const k in props) e.setAttribute(k, props[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function appendRow() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('score-mode')) return;
    const lab = el('span', { class: 'gfx-label' }, 'Score ');
    lab.appendChild(el('small', { class: 'muted' }, 'original is the ten recorded cues only; extended adds composed pieces for areas, bosses and the story'));
    const b = el('button', { class: 'dfbtn small', id: 'score-mode', type: 'button' }, '');
    const sync = () => { b.textContent = extended() ? 'Extended' : 'Original'; b.setAttribute('aria-pressed', extended() ? 'true' : 'false'); b.setAttribute('aria-label', 'Score: ' + b.textContent); b.classList.toggle('sel', extended()); };
    b.onclick = () => { setMode(extended() ? 'original' : 'extended'); sync(); };
    sync(); grid.appendChild(lab); grid.appendChild(b);
  }

  // ---- test hooks ---------------------------------------------------------------------------------
  // Render one piece offline (a standalone OfflineAudioContext, never a second live context) and report its levels.
  async function renderOffline(pid, seconds, seed) {
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sr = 22050, ctx = new OC(1, Math.floor(sr * seconds), sr), out = ctx.createGain(); out.connect(ctx.destination);
    const savedRig = rig, savedCtx = rigCtx, savedOverride = ctxOverride, sb = seedBase, sn = seedN;
    rig = null; rigCtx = null;
    try {
      ctxOverride = ctx; ctx.__master = out; seedBase = seed == null ? 1 : seed; seedN = 0;
      const inst = makeInstance(ctx, pid, 1); setLevel(inst, 1, 0.01); inst.out.gain.value = GAIN * (inst.def.trim || 1);
      while (!inst.done && inst.next < seconds) advance(inst, inst.next + LOOK);
      const buf = await ctx.startRendering(), d = buf.getChannelData(0);
      let peak = 0, sum = 0, bad = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (!(v === v) || Math.abs(v) > 100) bad++; const a = Math.abs(v); if (a > peak) peak = a; sum += v * v; }
      return { pid, peak, rms: Math.sqrt(sum / d.length), bad, bars: inst.bar };
    } finally { rig = savedRig; rigCtx = savedCtx; ctxOverride = savedOverride; seedBase = sb; seedN = sn; }
  }
  function useContext(fake) {                    // tests only: drive the scheduler with a counting fake context
    dropAll(); reap(Infinity); rig = null; rigCtx = null; ctxOverride = fake || null;
    if (fake && !fake.__master) fake.__master = fake.createGain();
  }

  load();
  wire();
  return {
    state, extended, setMode, load, save, appendRow, plan, tick, pieceFor, bossFor, engagedBoss, storyStage, renderOffline, useContext, dropAll,
    PIECES: P, STAGES, AREA_BY_MAP, CUES_FOR, BOSS_BY_TYPE, MODE, deg,
    recordings: REC, REC_DIR, recElement(slot) { const i = insts[slot]; return i && i.rec ? i.el : null; },
    get recsOn() { return recsOn; }, set recsOn(v) { recsOn = !!v; },
    get recFailed() { return Object.assign({}, recFailed); }, resetRecFailures() { for (const k in recFailed) delete recFailed[k]; },
    setSeed(s) { seedBase = s == null ? null : s >>> 0; seedN = 0; },
    get want() { return { area: want.area && want.area.pid, boss: want.boss && want.boss.pid, layer: want.layer && want.layer.pid }; },
    get area() { return { pid: AS.pid, phase: AS.phase, t: AS.t, count: AS.count }; },
    get active() { const o = {}; for (const k in insts) if (insts[k]) { const i = insts[k]; o[k] = { pid: i.pid, bar: i.bar, done: i.done, level: i.level, stage: i.S.stage, rec: !!i.rec, src: i.rec ? i.el.getAttribute('src') : null, paused: i.rec ? i.el.paused : null, loop: i.rec ? i.el.loop : null, t: i.rec ? i.el.currentTime : null }; } return o; },
    get retiredCount() { return retired.length; },
    forceArea(phase, t) { AS.phase = phase; AS.t = t || 0; },
  };
})();
if (typeof window !== 'undefined') window.SCORE = SCORE;
