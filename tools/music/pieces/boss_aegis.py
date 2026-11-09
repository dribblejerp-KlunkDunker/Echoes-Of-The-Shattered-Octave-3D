"""THE AEGIS SENTINEL — a three-voice chord machine. G minor (G2 = 98 Hz), 80 bpm, 30 bars, loops.
Trombones, organ and strings are three gears of different tooth-counts: each steps through the tones of the bar's chord
on its own cycle (every 1, 1.5 and 2 beats), so the voicing keeps re-forming but is always a chord. Timpani and a
bronze bell on 1 and 3, snare on 2 and 4. Chords: Gm, Eb, Cm, D (four bars each) and a turn."""
from lib import *

META = dict(file='boss_aegis', kbps=96, loop=True, wet=0.22, rt60=2.8)


def build():
    S = Score('Aegis', 80, seed=98, rubato=0.003)
    G = Scale('G2', 'harm')
    tbn = S.part('bronze brass', 57, pan=36, base_vel=68, sigma=0.004)
    org = S.part('organ gear', 19, pan=64, base_vel=56, sigma=0.004)
    stg = S.part('string gear', 48, pan=92, base_vel=58, sigma=0.004)
    tim = S.part('timpani', 47, pan=56, base_vel=76, sigma=0.006)
    bell = S.part('bronze bell', 14, pan=64, base_vel=66, sigma=0.004)
    kit = S.part('kit', 48, drums=True, pan=64, base_vel=60, sigma=0.004)
    cb = S.part('bass', 43, pan=60, base_vel=66, sigma=0.006)
    tot = 30
    prog = [0, 5, 3, 4]                            # Gm, Eb, Cm, D (D major: leading tone F#)
    tones = lambda d: sorted({G(d), G(d + 2), G(d + 4), G(d + 7)})
    for b in range(tot):
        t = b * 4
        d = prog[(b // 4) % 4] if b < 28 else [0, 4][b - 28]
        pcs = tones(d)
        # three gears: each picks tones in its own register by its own counter
        for name, part, lo, step, vel in [('t', tbn, 36, 1.0, 70), ('o', org, 48, 1.5, 54), ('s', stg, 60, 2.0, 56)]:
            k = 0; at = 0.0
            while at < 4.0 - 1e-6:
                i = (b * 4 / step + k) % len(pcs)
                p = pcs[int(i)] % 12 + lo
                while p < lo: p += 12
                dur = min(step, 4.0 - at) * 0.92
                part.n(p, t + at, dur, vel + (6 if k == 0 else 0), leg=0.0)
                at += step; k += 1
        for beat in (0, 2):
            bell.n(G(d), t + beat, 3, 64, leg=0.0)
            tim.n(G(d) + 0, t + beat, 0.6, 84 if beat == 0 else 70, leg=0.0)
        drum(kit, 38, t + 1, 70); drum(kit, 38, t + 3, 72)
        if b % 4 == 3: [drum(kit, 38, t + 3.5 + k * 0.125, 46 + k * 4) for k in range(4)]
        cb.n(G(d) - 12, t, 1.9, 70, leg=0.0); cb.n(G(d) - 12 + (7 if b % 2 else 0), t + 2, 1.9, 64, leg=0.0)
    return S, tot * 4
