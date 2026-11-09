"""Small composition library for the Extended score of "Echoes of the Shattered Octave".

Pieces are written as readable Python: motifs in a mini-notation, chords as scale degrees, parts per GM instrument.
The library humanises timing and velocity, draws dynamics as CC11 curves, writes a .mid, renders it with FluidSynth
(FluidR3 GM, MIT) and finishes it with a convolution hall, gentle compression and loudness normalisation.

Mini-notation for melodies (see Part.line):
    "0 2 4:2 r:1 3b:.5 -1:3"
    degree (integer, may be negative or above 6, counted in the Scale), optional # / b accidentals,
    ':' beats (default 1), '@' velocity (default the part's base), 'r' = rest.
Run as a module from tools/music/: `python3 render_all.py [piece ...]`.
"""
import math
import os
import random
import re
import subprocess
import sys

import mido
import numpy as np
import soundfile as sf
from scipy.signal import lfilter

SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_ROOT = os.environ.get('MUSIC_SCRATCH', '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/P8-MUSIC/work')
os.makedirs(OUT_ROOT, exist_ok=True)
TPB = 960  # MIDI ticks per beat

MODES = {
    'major': [0, 2, 4, 5, 7, 9, 11], 'lydian': [0, 2, 4, 6, 7, 9, 11], 'mixo': [0, 2, 4, 5, 7, 9, 10],
    'dorian': [0, 2, 3, 5, 7, 9, 10], 'phryg': [0, 1, 3, 5, 7, 8, 10], 'minor': [0, 2, 3, 5, 7, 8, 10],
    'harm': [0, 2, 3, 5, 7, 8, 11], 'pent': [0, 2, 4, 7, 9], 'mpent': [0, 3, 5, 7, 10], 'locr': [0, 1, 3, 5, 6, 8, 10],
}
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'F#3' -> 54, 'Bb2' -> 46."""
    m = re.match(r'^([A-G])([#b]*)(-?\d)$', name)
    n = NOTE[m.group(1)] + m.group(2).count('#') - m.group(2).count('b')
    return 12 * (int(m.group(3)) + 1) + n


class Scale:
    def __init__(self, tonic, mode='minor'):
        self.tonic = midi(tonic) if isinstance(tonic, str) else tonic
        self.iv = MODES[mode] if isinstance(mode, str) else mode

    def __call__(self, d, acc=0):
        n = len(self.iv)
        o, i = divmod(int(d), n)
        return self.tonic + self.iv[i] + 12 * o + acc

    def chord(self, d, size=3, step=2, acc=None):
        """Stacked scale-step chord on degree d (triad = 3 notes, a ninth chord = 5)."""
        return [self(d + step * k) for k in range(size)]

    def pcs(self, d, size=3):
        return sorted({p % 12 for p in self.chord(d, size)})


def voice_lead(prev, pcs, lo, hi):
    """Pick, for each pitch class in pcs, the octave nearest the previous voicing (smooth voice-leading)."""
    out = []
    targets = list(pcs)
    for p in prev:
        if not targets:
            break
        best = min(targets, key=lambda pc: min(abs((pc + 12 * k) - p) for k in range(-1, 11)))
        cand = [best + 12 * k for k in range(0, 11) if lo <= best + 12 * k <= hi]
        if cand:
            out.append(min(cand, key=lambda c: abs(c - p)))
        targets.remove(best)
    for pc in targets:
        cand = [pc + 12 * k for k in range(0, 11) if lo <= pc + 12 * k <= hi]
        if cand:
            out.append(min(cand, key=lambda c: abs(c - (sum(prev) / len(prev) if prev else (lo + hi) / 2))))
    return sorted(out)


TOKEN = re.compile(r'^(r|-?\d+)([#b]*)(?::([\d.]+))?(?:@(\d+))?$')


class Part:
    def __init__(self, score, name, program, channel, pan=64, vol=100, bank=0, base_vel=70, sigma=0.010, drums=False):
        self.score, self.name, self.program, self.ch = score, name, program, channel
        self.pan, self.vol, self.bank, self.base_vel, self.sigma, self.drums = pan, vol, bank, base_vel, sigma, drums
        self.notes = []   # (start, dur, pitch, vel)
        self.ccs = []     # (beat, cc, value)
        self.bends = []   # (beat, value -8192..8191)
        self.reverb_send = 40

    # --- notes ---------------------------------------------------------------------------------------------------
    def n(self, pitch, t, d=1.0, v=None, leg=0.04, human=True):
        """One note at beat t for d beats. leg = extra beats of overlap for legato."""
        v = self.base_vel if v is None else v
        r = self.score.rng
        if human:
            t = t + r.gauss(0, self.sigma * self.score.bpm / 60.0)
            v = v + r.gauss(0, 4)
        v = int(max(1, min(127, v)))
        self.notes.append((max(0.0, t), max(0.03, d + leg), int(pitch), v))

    def chord(self, pitches, t, d=1.0, v=None, spread=0.0, leg=0.04, roll=0.0):
        """Several notes together. spread = beats between voices (a strum / arpeggiated roll upward)."""
        for k, p in enumerate(pitches):
            self.n(p, t + k * (spread or roll), d - k * (spread or roll) * 0, v, leg)

    def line(self, t, text, scale, shape=0.0, leg=0.04, lift=0, vel=None):
        """Write a melody in mini-notation starting at beat t; returns the beat after its last note.
        shape: add a gentle velocity arch over the phrase (+/- shape velocity units)."""
        toks = text.split()
        parsed = []
        for tk in toks:
            m = TOKEN.match(tk)
            if not m:
                raise ValueError('bad token ' + tk)
            parsed.append((m.group(1), m.group(2), float(m.group(3) or 1), int(m.group(4)) if m.group(4) else None))
        total = sum(p[2] for p in parsed)
        at = t
        for sym, acc, dur, v in parsed:
            if sym != 'r':
                a = acc.count('#') - acc.count('b')
                pos = (at - t) / total if total else 0
                arch = shape * math.sin(math.pi * pos) if shape else 0
                base = v if v is not None else (vel if vel is not None else self.base_vel)
                self.n(scale(int(sym), a) + lift, at, dur, base + arch, leg)
            at += dur
        return at

    # --- controllers ---------------------------------------------------------------------------------------------
    def cc(self, t, num, val):
        self.ccs.append((max(0.0, t), num, int(max(0, min(127, val)))))

    def ramp(self, t0, t1, v0, v1, num=11, step=0.25):
        """Linear controller ramp (default CC11 expression) — the crescendo / diminuendo."""
        n = max(1, int((t1 - t0) / step))
        for i in range(n + 1):
            self.cc(t0 + (t1 - t0) * i / n, num, v0 + (v1 - v0) * i / n)

    def swell(self, t0, t1, lo, hi, peak=0.5, step=0.25):
        """Up to hi at the peak fraction and back down: one bow-stroke / breath."""
        tp = t0 + (t1 - t0) * peak
        self.ramp(t0, tp, lo, hi, step=step)
        self.ramp(tp, t1, hi, lo, step=step)

    def pedal(self, t0, t1, repedal=None):
        """Sustain pedal down from t0 to t1; repedal = list of beats where it lifts briefly (chord changes)."""
        self.cc(t0, 64, 127)
        for b in (repedal or []):
            if t0 < b < t1:
                self.cc(b - 0.04, 64, 0)
                self.cc(b + 0.02, 64, 127)
        self.cc(t1, 64, 0)

    def bend(self, t, cents, rng=2.0):
        """Pitch bend in cents (default bend range 2 semitones)."""
        self.bends.append((max(0.0, t), int(max(-8192, min(8191, cents / (rng * 100.0) * 8192)))))

    def bend_ramp(self, t0, t1, c0, c1, step=0.25):
        n = max(1, int((t1 - t0) / step))
        for i in range(n + 1):
            self.bend(t0 + (t1 - t0) * i / n, c0 + (c1 - c0) * i / n)


class Score:
    def __init__(self, name, bpm, seed=1, rubato=0.012, end_rit=0.0, loop=False):
        self.name, self.bpm, self.rng = name, bpm, random.Random(seed)
        self.parts = []
        self.rubato, self.end_rit, self.loop = rubato, end_rit, loop
        self.length = 0.0   # beats, set by finish()
        self._free = [c for c in range(16) if c != 9]

    def part(self, name, program, pan=64, vol=100, base_vel=70, sigma=0.010, bank=0, drums=False):
        ch = 9 if drums else self._free.pop(0)
        p = Part(self, name, program, ch, pan, vol, bank, base_vel, sigma, drums)
        self.parts.append(p)
        return p

    def tempo_at(self, beat, total):
        """Slow breathing of the pulse (rubato) and, if asked, a closing ritardando over the last bars."""
        w = 1.0 + self.rubato * math.sin(2 * math.pi * beat / 23.0) + 0.6 * self.rubato * math.sin(2 * math.pi * beat / 9.7 + 1.3)
        if self.end_rit and total:
            x = max(0.0, (beat - (total - 12)) / 12.0)
            w *= 1.0 - self.end_rit * x * x
        return self.bpm * w

    def write(self, path, length_beats):
        """Write the Standard MIDI file. Events are gathered per part into one track each."""
        self.length = length_beats
        mid = mido.MidiFile(type=1, ticks_per_beat=TPB)
        tm = mido.MidiTrack(); mid.tracks.append(tm)
        tm.append(mido.MetaMessage('track_name', name=self.name, time=0))
        tm.append(mido.MetaMessage('time_signature', numerator=4, denominator=4, time=0))
        last = 0
        b = 0.0
        while b <= length_beats + 8:
            tick = int(round(b * TPB))
            tm.append(mido.MetaMessage('set_tempo', tempo=int(60e6 / self.tempo_at(b, length_beats)), time=tick - last))
            last = tick
            b += 1.0
        for p in self.parts:
            tr = mido.MidiTrack(); mid.tracks.append(tr)
            tr.append(mido.MetaMessage('track_name', name=p.name, time=0))
            ev = []  # (tick, order, msg)
            ev.append((0, 0, mido.Message('control_change', channel=p.ch, control=0, value=p.bank if not p.drums else 0)))
            ev.append((0, 1, mido.Message('program_change', channel=p.ch, program=p.program)))
            ev.append((0, 2, mido.Message('control_change', channel=p.ch, control=7, value=p.vol)))
            ev.append((0, 2, mido.Message('control_change', channel=p.ch, control=10, value=p.pan)))
            ev.append((0, 2, mido.Message('control_change', channel=p.ch, control=11, value=100)))
            ev.append((0, 2, mido.Message('control_change', channel=p.ch, control=91, value=0)))   # reverb done in post
            ev.append((0, 2, mido.Message('control_change', channel=p.ch, control=93, value=0)))
            # same-pitch overlaps would be cut by the earlier note-off: trim the earlier note instead
            notes = sorted(p.notes, key=lambda x: (x[2], x[0]))
            fixed = []
            for i, (s, d, pi, v) in enumerate(notes):
                if i + 1 < len(notes) and notes[i + 1][2] == pi and notes[i + 1][0] < s + d:
                    d = max(0.03, notes[i + 1][0] - s - 0.01)
                fixed.append((s, d, pi, v))
            for s, d, pi, v in fixed:
                ev.append((int(round(s * TPB)), 4, mido.Message('note_on', channel=p.ch, note=pi, velocity=v)))
                ev.append((int(round((s + d) * TPB)), 3, mido.Message('note_off', channel=p.ch, note=pi, velocity=0)))
            for t, num, val in p.ccs:
                ev.append((int(round(t * TPB)), 2, mido.Message('control_change', channel=p.ch, control=num, value=val)))
            for t, val in p.bends:
                ev.append((int(round(t * TPB)), 2, mido.Message('pitchwheel', channel=p.ch, pitch=val)))
            ev.sort(key=lambda e: (e[0], e[1]))
            last = 0
            for tick, _, msg in ev:
                msg.time = tick - last
                last = tick
                tr.append(msg)
        mid.save(path)
        return path


# --- rendering ---------------------------------------------------------------------------------------------------
def hall_ir(sr, rt60=2.8, predelay=0.022, damp=0.55, seed=11):
    """Synthetic hall impulse response: exponentially decaying stereo noise whose highs die faster than its lows."""
    rng = np.random.RandomState(seed)
    n = int(sr * (rt60 * 1.15))
    t = np.arange(n) / sr
    out = np.zeros((n, 2))
    for ch in range(2):
        x = rng.randn(n)
        # one-pole lowpass pair mixed over time: early reflections bright, late tail dark
        y_hi = lfilter([0.55], [1, -0.45], x)
        y_lo = lfilter([0.06], [1, -0.94], x)
        mix = np.clip(t / (rt60 * (0.5 + damp)), 0, 1)
        sig = (1 - mix) * y_hi + mix * y_lo * 3.0
        env = np.exp(-6.908 * t / rt60)
        early = np.clip(t / 0.012, 0, 1)
        out[:, ch] = sig * env * early
    pre = int(sr * predelay)
    out = np.vstack([np.zeros((pre, 2)), out])
    out /= np.sqrt((out ** 2).sum()) + 1e-9
    return out


def render(score, length_beats, name, wet=0.22, rt60=2.8, loop=False, tail_s=5.0, target_lufs=-17.5, lo_cut=28,
           shelf_hi=-1.5, fade_in=0.04, fade_out=0.0, gain_db=0.0, comp=True):
    """Write MIDI, run FluidSynth, add the hall, compress gently, normalise. Returns the path of the final WAV."""
    import pyloudnorm as pyln
    from pedalboard import Compressor, HighpassFilter, HighShelfFilter, Limiter, Pedalboard, Convolution, Gain
    d = os.path.join(OUT_ROOT, name)
    os.makedirs(d, exist_ok=True)
    mid = os.path.join(d, name + '.mid'); raw = os.path.join(d, name + '.raw.wav'); fin = os.path.join(d, name + '.wav')
    score.write(mid, length_beats)
    subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.9', '-R', '0', '-C', '0', '-r', '44100', '-o', 'synth.polyphony=512',
                    '-F', raw, SF2, mid], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    x, sr = sf.read(raw, always_2d=True)
    x = x.astype(np.float32)
    # exact piece length in seconds from the tempo map
    secs = 0.0
    b = 0.0
    while b < length_beats:
        step = min(1.0, length_beats - b)
        secs += step * 60.0 / score.tempo_at(b, length_beats)
        b += step
    body = int(secs * sr)
    x = x[:body + int(tail_s * sr)] if len(x) > body else np.vstack([x, np.zeros((body - len(x), 2), np.float32)])
    pad = np.zeros((int(sr * (rt60 + 1.0)), 2), np.float32)
    xin = np.vstack([x, pad])
    ir = hall_ir(sr, rt60=rt60)
    irp = os.path.join(d, 'ir.wav'); sf.write(irp, ir, sr)
    board = Pedalboard([HighpassFilter(lo_cut), Convolution(irp, mix=wet), HighShelfFilter(7000, shelf_hi)])
    if comp:
        board.append(Compressor(threshold_db=-20, ratio=1.8, attack_ms=40, release_ms=300))
    y = board(xin, sr)
    if loop:   # fold everything after the nominal end onto the start so the loop point carries its own reverb tail
        tail = y[body:]
        y = y[:body].copy()
        m = min(len(tail), len(y))
        y[:m] += tail[:m]
    else:
        # trim trailing near-silence but keep the natural decay; end is faded smoothly
        y = y[:body + int(sr * (rt60 * 0.9 + (fade_out or 1.5)))]
        n = int(sr * (fade_out or 1.5))
        y[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    if fade_in:
        n = int(sr * fade_in); y[:n] *= np.linspace(0, 1, n)[:, None]
    meter = pyln.Meter(sr)
    L = meter.integrated_loudness(y.astype(np.float64))
    y = y * (10 ** ((target_lufs - L + gain_db) / 20.0))
    # soft ceiling (Pedalboard's Limiter adds make-up gain): knee at 0.5, asymptote at 0.74 (-2.6 dBFS)
    a = np.abs(y); knee, ceil = 0.5, 0.74
    y = np.where(a > knee, np.sign(y) * (knee + (ceil - knee) * np.tanh((a - knee) / (ceil - knee))), y).astype(np.float32)
    sf.write(fin, y, sr, subtype='PCM_16')
    return fin


def encode(wav, mp3, kbps=112):
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '%dk' % kbps, '-ac', '2', '-ar', '44100', mp3], check=True)
    return mp3


# --- arrangement helpers -----------------------------------------------------------------------------------------
def arp(part, pitches, t, pattern, step=0.5, dur=None, v=None, up=12, leg=0.0, accent=6):
    """Play an arpeggio figure: pattern is a list of indices into pitches extended up an octave (None = rest).
    Returns the beat after the figure."""
    pool = list(pitches) + [p + up for p in pitches]
    at = t
    for k, idx in enumerate(pattern):
        if idx is not None:
            vel = (part.base_vel if v is None else v) + (accent if k % 4 == 0 else 0)
            part.n(pool[idx % len(pool)], at, dur or step * 2.2, vel, leg)
        at += step
    return at


def pad(part, voicing, t, d, v=None, atk_cc=None, leg=0.2):
    """Sustained chord (strings / choir / organ). Optional expression swell inside the note."""
    for p in voicing:
        part.n(p, t, d, v, leg)
    if atk_cc:
        part.swell(t, t + d, atk_cc[0], atk_cc[1])


def stagger(part, pitches, t, d, gap=0.08, v=None, leg=0.2):
    """Players of an ensemble never enter on exactly the same instant."""
    for k, p in enumerate(pitches):
        part.n(p, t + k * gap, d - k * gap, v, leg)


def transpose_line(text, steps):
    """Shift every degree in a mini-notation string by steps scale degrees (a melodic sequence)."""
    out = []
    for tk in text.split():
        m = TOKEN.match(tk)
        if m.group(1) == 'r':
            out.append(tk); continue
        out.append(str(int(m.group(1)) + steps) + m.group(2) + (':' + m.group(3) if m.group(3) else '') + ('@' + m.group(4) if m.group(4) else ''))
    return ' '.join(out)


def invert_line(text, axis=0):
    out = []
    for tk in text.split():
        m = TOKEN.match(tk)
        if m.group(1) == 'r':
            out.append(tk); continue
        out.append(str(2 * axis - int(m.group(1))) + m.group(2) + (':' + m.group(3) if m.group(3) else '') + ('@' + m.group(4) if m.group(4) else ''))
    return ' '.join(out)


def drum(part, note, t, v=60, d=0.1):
    part.n(note, t, d, v, leg=0.0)


def voiced(chords, lo, hi, start=None):
    """Voice-lead a list of chords (each a list of pitch classes or pitches): smooth, no leaps, within [lo, hi]."""
    out, prev = [], start
    for ch in chords:
        pcs = sorted({p % 12 for p in ch})
        if prev is None:
            prev = sorted(min([pc + 12 * k for k in range(0, 11) if lo <= pc + 12 * k <= hi], key=lambda c: abs(c - (lo + hi) / 2)) for pc in pcs)
        v = voice_lead(prev, pcs, lo, hi)
        out.append(v); prev = v
    return out


def detune_all(score, cents):
    """Bend every pitched part by the same amount from the start (the Octave sounds wrong by a quarter-tone)."""
    for p in score.parts:
        if not p.drums:
            p.bend(0, cents)


def bar(n, beats=4):
    return n * beats
