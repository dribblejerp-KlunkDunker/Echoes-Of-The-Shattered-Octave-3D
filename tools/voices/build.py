#!/usr/bin/env python3
"""Render the voiced lines in voices/script.json to voices/<speaker>/<id>.mp3 and write js/voice-lines.js.

Voices are Kokoro-82M (Apache-2.0, https://huggingface.co/hexgrad/Kokoro-82M) run through kokoro-onnx, then treated
with pedalboard and numpy per the casting table in cast.py. Nothing here runs in the game; the game only plays the
MP3s. Re-running is incremental: a line is re-rendered only when its text, delivery or casting changed.

  pip install kokoro-onnx soundfile pedalboard numpy
  # model files (once): kokoro-v1.0.int8.onnx and voices-v1.0.bin from
  #   https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
  python3 tools/voices/build.py --model DIR [--only harrow,kaelen] [--force]
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from cast import CAST, DELIVERY, FALLBACK  # noqa: E402

SR = 24000
RNG = np.random.default_rng(417)          # fixed: the same script always renders the same audio


# ------------------------------------------------------------------ synthesis
_k = None
def kokoro(model_dir):
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        _k = Kokoro(os.path.join(model_dir, 'kokoro-v1.0.int8.onnx'), os.path.join(model_dir, 'voices-v1.0.bin'))
    return _k

def speak(model_dir, text, voice, speed, lang):
    s, sr = kokoro(model_dir).create(text, voice=voice, speed=float(speed), lang=lang)
    assert sr == SR
    return np.asarray(s, dtype=np.float32)


# ------------------------------------------------------------------ treatments
def pb(x, *plugins):
    from pedalboard import Pedalboard
    return Pedalboard(list(plugins))(x[None, :], SR)[0]

def pitch(x, semis):
    if not semis: return x
    from pedalboard import PitchShift
    return pb(x, PitchShift(semitones=float(semis)))

def delayed(x, sec):
    n = int(sec * SR); return np.concatenate([np.zeros(n, np.float32), x])[:len(x)]

def mixlen(*parts):
    n = max(len(p) for p, _ in parts); out = np.zeros(n, np.float32)
    for p, g in parts: out[:len(p)] += g * p
    return out

def whisper(x, amount):
    """Keep each frame's spectrum, throw away its phase: the voice becomes breath shaped like the words."""
    n, hop = 1024, 256; win = np.hanning(n).astype(np.float32)
    pad = np.concatenate([np.zeros(n, np.float32), x, np.zeros(n, np.float32)])
    out = np.zeros_like(pad); norm = np.zeros_like(pad)
    for i in range(0, len(pad) - n, hop):
        f = np.fft.rfft(pad[i:i + n] * win)
        f = np.abs(f) * np.exp(1j * RNG.uniform(0, 2 * np.pi, f.shape))
        out[i:i + n] += np.fft.irfft(f, n).astype(np.float32) * win; norm[i:i + n] += win * win
    w = (out / np.maximum(norm, 1e-3))[n:n + len(x)]
    w *= (np.sqrt(np.mean(x * x)) / max(1e-6, np.sqrt(np.mean(w * w))))
    return (1 - amount) * x + amount * w

def vibrato(x, rate=4.6, depth=0.0022):
    t = np.arange(len(x)) / SR
    d = depth * (1 + np.sin(2 * np.pi * rate * t + RNG.uniform(0, 6.28))) * SR
    idx = np.clip(np.arange(len(x)) - d, 0, len(x) - 1)
    return np.interp(idx, np.arange(len(x)), x).astype(np.float32)

def comb(x, hz, fb, mix):
    from pedalboard import Delay
    return pb(x, Delay(delay_seconds=1.0 / hz, feedback=fb, mix=mix))

def reverb(x, size, wet, damp=0.55):
    from pedalboard import Reverb
    tail = np.concatenate([x, np.zeros(int(SR * (0.3 + size * 1.4)), np.float32)])
    return pb(tail, Reverb(room_size=size, wet_level=wet, dry_level=1.0 - wet * 0.5, damping=damp, width=0.0))

def treat(x, fx):
    from pedalboard import HighpassFilter, LowpassFilter, Distortion, LowShelfFilter, Chorus, Compressor, HighShelfFilter
    for f in fx:
        name, arg = (f if isinstance(f, tuple) else (f, None))
        if name == 'old':      x = vibrato(x) * 0.96 + 0.04 * whisper(x, 1.0)
        elif name == 'gravel': x = 0.8 * x + 0.25 * pb(x, LowShelfFilter(cutoff_frequency_hz=220, gain_db=4), Distortion(drive_db=14), LowpassFilter(cutoff_frequency_hz=3200))
        elif name == 'glass':  x = comb(x, 528.0, 0.72, 0.14)
        elif name == 'bell':   x = comb(x, 174.0, 0.6, 0.22)
        elif name == 'radio':  x = pb(x, HighpassFilter(cutoff_frequency_hz=260), LowpassFilter(cutoff_frequency_hz=3900), Compressor(threshold_db=-24, ratio=4))
        elif name == 'whisper':x = whisper(x, arg if arg is not None else 0.8)
        elif name == 'child':  x = pb(x, HighShelfFilter(cutoff_frequency_hz=2500, gain_db=3))
        elif name == 'chorus':
            x = mixlen((x, 0.7), (delayed(pitch(x, -0.3), 0.019), 0.45), (delayed(pitch(x, 0.35), 0.033), 0.4), (delayed(pitch(x, -12), 0.011), 0.25))
            x = pb(x, Chorus(rate_hz=0.6, depth=0.3, mix=0.35))
        elif name == 'note':   # a voice flattened onto one held pitch (arg Hz): the line rides a tone that follows its own loudness
            hz = float(arg or 174.0); t = np.arange(len(x)) / SR
            env = np.convolve(np.abs(x), np.ones(480, np.float32) / 480, mode='same')
            x = 0.9 * x + 0.55 * env * np.sin(2 * np.pi * hz * t).astype(np.float32) * (np.abs(x).max() / max(1e-6, env.max()))
        elif name == 'stack':  x = mixlen((x, 0.75), (pitch(x, -7), 0.5), (pitch(x, -12), 0.45))
        elif name == 'room':     x = reverb(x, 0.22, 0.12)
        elif name == 'wood':     x = reverb(x, 0.45, 0.14)
        elif name == 'outdoors': x = reverb(x, 0.12, 0.06)
        elif name == 'hall':     x = reverb(x, 0.72, 0.24)
        elif name == 'chapel':   x = reverb(x, 0.86, 0.3, 0.4)
        else: raise ValueError('unknown fx ' + name)
    return x.astype(np.float32)

def finish(x, gain_db=0.0):
    a = np.abs(x); thr = 0.01 * a.max()
    on = np.where(a > thr)[0]
    if len(on): x = x[max(0, on[0] - 600): on[-1] + 2400]
    f = min(len(x) // 4, 480); env = np.ones(len(x), np.float32); env[:f] = np.linspace(0, 1, f); env[-f:] = np.linspace(1, 0, f); x = x * env
    rms = np.sqrt(np.mean(x * x)) + 1e-9
    x = x * (10 ** ((-20 + gain_db) / 20) / rms)                # every line at the same loudness, then the delivery's offset
    peak = np.abs(x).max()
    if peak > 0.89: x = np.tanh(x / 0.89) * 0.89                  # soft limit
    return x.astype(np.float32)


# ------------------------------------------------------------------ one line
def cast_of(speaker):
    return dict(FALLBACK, **CAST[speaker]) if speaker in CAST else dict(FALLBACK)

def render(model_dir, line):
    speaker, voice_of = line['speaker'], line.get('voiceOf') or line['speaker']
    deliv = DELIVERY.get((re.split(r'[\s,;:]+', line.get('delivery') or '') + [''])[0].lower(), {})
    text = re.sub(r'\.{2,}|…', ', ', line.get('say') or line['text']).strip(' ,')
    if voice_of in ('chorus', 'chorus_mourners', 'mourners', 'chorus_congregation'):
        parts = [speak(model_dir, text, v, 0.86, l) for v, l in (('bf_emma', 'en-gb'), ('bm_lewis', 'en-gb'), ('af_sarah', 'en-us'), ('bm_daniel', 'en-gb'))]
        x = mixlen(*[(delayed(p, 0.013 * i), 0.5) for i, p in enumerate(parts)])
        c = cast_of(voice_of if voice_of in CAST else 'mourner')
    else:
        c = cast_of(voice_of)
        sp = lambda t: speak(model_dir, t, c['voice'], c['speed'] * deliv.get('speed', 1.0), c['lang'])
        if line.get('beats'):                                      # each word its own breath, held apart ("I. Am. Fortunate.")
            gap = np.zeros(int(SR * float(line['beats'])), np.float32)
            words = [w for w in re.split(r'(?<=\.)\s+', text) if w]
            x = np.concatenate([np.concatenate([sp(w), gap]) for w in words[:-1]] + [sp(words[-1])])
        else:
            x = sp(text)
        x = pitch(x, c.get('pitch', 0))
    fx = list(c.get('fx', []))
    if deliv.get('whisper') and not any((f[0] if isinstance(f, tuple) else f) == 'whisper' for f in fx): fx.insert(0, ('whisper', deliv['whisper']))
    if voice_of != speaker and speaker in CAST:                      # a mimic: the remembered voice, then the thing that wears it
        fx = [f for f in fx if (f[0] if isinstance(f, tuple) else f) not in ('room', 'wood', 'outdoors', 'hall', 'chapel')] + list(CAST[speaker].get('fx', []))
    return finish(treat(x, fx), deliv.get('gain', 0.0))

def key_of(line):
    sp, vo = line['speaker'], line.get('voiceOf') or line['speaker']
    blob = json.dumps([line['text'], line.get('say'), line.get('delivery'), repr(cast_of(sp)), repr(cast_of(vo)), DELIVERY, 3] + ([line['beats']] if line.get('beats') else []), sort_keys=True)
    return hashlib.sha1(blob.encode()).hexdigest()[:16]

def write_mp3(x, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    import soundfile as sf
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t: tmp = t.name
    sf.write(tmp, x, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', path], check=True)
    os.unlink(tmp)


# ------------------------------------------------------------------ all lines
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True); ap.add_argument('--only', default=''); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    script = json.load(open(os.path.join(ROOT, 'voices', 'script.json')))
    cache_p = os.path.join(ROOT, 'voices', 'build-cache.json')
    cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
    only = set(filter(None, a.only.split(',')))
    manifest, done, skipped = {}, 0, []
    lines = []
    for line in script['lines']:
        why = None
        if not line.get('text'): why = 'sung, no words in the game'
        elif line.get('signed'): why = 'signed in hand-cant, not spoken'
        elif line.get('voiceOf') in ('player', 'player_kin'): why = "the player's own voice (or a kin chosen at creation) is never cast"
        elif line.get('names'):                                      # a templated name: one recording per name
            for nm in line['names']:
                slug = re.sub(r'[^a-z0-9]+', '-', nm.lower()).strip('-')
                lines.append(dict(line, id=line['id'] + '.' + slug, text=nm, say=' '.join([nm + '.'] * int(line.get('repeat') or 1)), names=None))
            continue
        elif '{' in line['text']:
            if line.get('segments'): lines.append(dict(line, text=' '.join(line['segments']))); continue
            why = "needs the player's name"
        if why: skipped.append(line['id'] + ' (' + why + ')'); continue
        lines.append(line)
    for line in lines:
        lid = line['id']; rel = 'voices/%s/%s.mp3' % (line['speaker'], lid)
        k = key_of(line); out = os.path.join(ROOT, rel)
        if (not only or line['speaker'] in only) and (a.force or cache.get(lid) != k or not os.path.exists(out)):
            x = render(a.model, line); write_mp3(x, out); cache[lid] = k; done += 1
            print('rendered', lid, '%.1fs' % (len(x) / SR), flush=True)
        if not os.path.exists(out): continue
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip() or 0)
        manifest[lid] = {'src': rel, 'd': round(dur, 2), 'speaker': line['speaker'], 'kind': line['kind'], 't': line['text']}
        for f in ('when', 'ref', 'voiceOf'):
            if line.get(f) is not None: manifest[lid][f] = line[f]
    json.dump(cache, open(cache_p, 'w'), indent=0, sort_keys=True)
    with open(os.path.join(ROOT, 'js', 'voice-lines.js'), 'w') as f:
        f.write('// Generated by tools/voices/build.py from voices/script.json. Do not edit by hand.\n')
        f.write("'use strict';\nconst VOICE_LINES = " + json.dumps(manifest, indent=0, sort_keys=True) + ';\n')
    print('rendered %d, %d lines in the manifest, %d not recorded: %s' % (done, len(manifest), len(skipped), ', '.join(skipped)))

if __name__ == '__main__':
    main()
