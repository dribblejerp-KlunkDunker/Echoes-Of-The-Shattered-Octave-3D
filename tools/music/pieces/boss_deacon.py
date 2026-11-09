"""THE DEACON OF THE UNRUNG BELL — almost silent. A minor (A2 = 110 Hz), 66 bpm, 12 swells (96 beats), loops.
The bell's partials (220, 2.76x, 5.4x Hz: A3, D5 +50c, D6 +23c) swell on bowed glass over two bars and are cut to nothing
one beat before any strike; the bell is never rung. A soft double heartbeat, a bass held below hearing, one whisper."""
from lib import *

META = dict(file='boss_deacon', kbps=96, loop=True, wet=0.34, rt60=4.0, gain_db=-5.0, comp=False)


def build():
    S = Score('Deacon', 66, seed=110, rubato=0.003)
    parts = []
    for nm, pitch, cents, pan in [('partial 1 (220)', midi('A3'), 0, 52), ('partial 2 (2.76x)', midi('D5'), 50, 76), ('partial 3 (5.4x)', midi('D6'), 23, 96)]:
        p = S.part(nm, 92, pan=pan, base_vel=70, sigma=0.0)
        p.bend(0, cents)
        parts.append((p, pitch))
    cb = S.part('bass', 43, pan=60, base_vel=44, sigma=0.03)
    tim = S.part('heart', 47, pan=56, base_vel=40, sigma=0.01)
    cel = S.part('cellos', 42, pan=36, base_vel=40, sigma=0.03)
    oo = S.part('whisper', 53, pan=82, base_vel=26, sigma=0.05)
    A2 = Scale('A2', 'minor')
    # six swells of eight beats: rise over seven beats, silent on the eighth; the last returns to the first for the loop
    for k in range(12):
        t = k * 8
        for j, (p, pitch) in enumerate(parts):
            if k % 2 == 1 and j == 2: continue
            p.n(pitch + (0 if k % 4 != 3 else -2 * (j == 1)), t, 7.0, 60, leg=0.0)
            p.cc(t - 0.01, 11, 0)
            p.ramp(t, t + 6.8, 8, 118 - 10 * j, step=0.25)
            p.cc(t + 6.9, 11, 0)                     # cut: the strike never comes
    cb.n(A2(0) - 12, 0, 100, 40, leg=0.0); cb.swell(0, 96, 40, 85, peak=0.5); cb.ramp(96, 100, 40, 40)
    for k in range(12):
        t = k * 8
        tim.n(A2(0) + 12, t + 7.0, 0.4, 34, leg=0.0); tim.n(A2(0) + 12, t + 7.5, 0.4, 26, leg=0.0)
        if k % 3 == 1:
            stagger(cel, [A2(0), A2(4)], t + 1, 6, gap=0.2, v=34, leg=0.3); cel.swell(t + 1, t + 7, 10, 70)
        if k % 4 == 2:
            oo.n(A2(4) + 12, t + 2, 4, 22, leg=0.5); oo.swell(t + 2, t + 6, 5, 60)
    return S, 96
