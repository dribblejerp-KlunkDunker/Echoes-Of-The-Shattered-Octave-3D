"""THE ROOT-VAULT — the Root's own harmonic series, green and beating. F pentatonic around 87 Hz (F2), 40 bpm.
Two cellos a few cents apart (the beating), harp harmonics climbing the series 3-4-5-6-8-9, choir pad, the Root note
(174 Hz) leaning flat every fifth bar."""
from lib import *

META = dict(file='rootvault', kbps=96, loop=False, wet=0.32, rt60=3.8, fade_out=4.0)


def build():
    S = Score('Root-vault', 40, seed=87, rubato=0.010, end_rit=0.10)
    F2 = midi('F2')
    vc1 = S.part('cello A', 42, pan=44, base_vel=54, sigma=0.03)
    vc2 = S.part('cello B (+18c)', 42, pan=84, base_vel=52, sigma=0.03)
    cb = S.part('bass', 43, pan=60, base_vel=44, sigma=0.03)
    harp = S.part('harp', 46, pan=40, base_vel=50, sigma=0.012)
    glk = S.part('glass', 9, pan=90, base_vel=36, sigma=0.01)
    chr_ = S.part('choir', 53, pan=64, base_vel=40, sigma=0.04)
    root = S.part('root note', 42, pan=60, base_vel=60, sigma=0.02)
    vc2.bend(0, 18)
    # harmonics of F2: 2 F3, 3 C4, 4 F4, 5 A4, 6 C5, 8 F5, 9 G5
    H = {2: F2 + 12, 3: F2 + 19, 4: F2 + 24, 5: F2 + 28, 6: F2 + 31, 8: F2 + 36, 9: F2 + 38}
    series = [3, 4, 5, 6, 8, 9]
    rr = random.Random(87)
    tot = 20
    vc1.n(F2, 0, tot * 4 - 8, 52, leg=0.5); vc2.n(F2, 0.4, tot * 4 - 8, 50, leg=0.5)
    cb.n(F2 - 12, 0, tot * 4 - 8, 44, leg=0.5)
    vc1.swell(0, 72, 40, 100, peak=0.5); vc2.swell(0, 72, 30, 95, peak=0.5); cb.swell(0, 72, 40, 90, peak=0.5)
    vc1.swell(72, 74, 100, 100)
    vc1.ramp(72, 80, 100, 10); vc2.ramp(72, 80, 95, 10); cb.ramp(72, 80, 90, 10)
    for b in range(0, tot):
        t = b * 4
        if b >= 1 and b < 17 and b % 2 == 1:        # an ascending run up the series, then it hangs
            n = 3 + (b // 2) % 4
            start = (b // 2) % 3
            for k in range(n):
                idx = min(5, start + k)
                harp.n(H[series[idx]], t + 0.5 + k * 0.75, 3.0, 46 + 3 * k, leg=0.5)
            top = H[series[min(5, start + n - 1)]]
            glk.n(top + 12 if top + 12 < 100 else top, t + 0.5 + n * 0.75 + 0.25, 4, 30, leg=0.0)
        if b % 5 == 4 and b < 19:                    # the Root note, 174 Hz, leaning flat
            root.n(F2 + 12, t, 4, 60, leg=0.2)
            root.bend_ramp(t, t + 4, 0, -28, step=0.5)
            root.bend(t + 4.1, 0)
        if b in (4, 8, 12, 16):
            for p in [F2 + 12, F2 + 19, F2 + 28]:
                chr_.n(p, t, 8, 38, leg=0.6)
    chr_.swell(16, 40, 30, 90); chr_.swell(48, 72, 30, 95)
    # last bars: the series descends to the fundamental
    for k, h in enumerate([9, 8, 6, 5, 4, 3, 2]):
        harp.n(H[h], 72 + k * 1.0, 4, 36 - 2 * k, leg=0.5)
    return S, 88
