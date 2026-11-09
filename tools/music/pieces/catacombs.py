"""THE CATACOMBS — whispers, a bone flute, a far bell. E dorian (E2/E3), 44 bpm. A choir with no singers (barely-there
aahs and breath), pan-flute 'bone' tune, a tubular bell from the next passage, a low bass drone."""
from lib import *

META = dict(file='catacombs', kbps=96, loop=False, wet=0.30, rt60=3.4, fade_out=4.0)


def build():
    S = Score('Catacombs', 44, seed=165, rubato=0.014, end_rit=0.12)
    E = Scale('E3', 'dorian'); E4 = Scale('E4', 'dorian')
    cb = S.part('bass', 43, pan=56, base_vel=46, sigma=0.03)
    chr_ = S.part('empty choir', 52, pan=64, base_vel=30, sigma=0.05)
    oo = S.part('whispers', 53, pan=80, base_vel=26, sigma=0.05)
    brth = S.part('breath', 121, pan=40, base_vel=30, sigma=0.05)
    bone = S.part('bone flute', 75, pan=70, base_vel=58, sigma=0.03)
    bell = S.part('far bell', 14, pan=90, base_vel=36, sigma=0.01)
    vla = S.part('violas', 41, pan=36, base_vel=40, sigma=0.04)
    harp = S.part('harp', 46, pan=50, base_vel=40, sigma=0.015)
    tot = 22
    cyc = [0, 3, 0, 5, 0, 3, 4, 0]     # Em, A, Em, C#dim-ish -> keep it plain: i IV i vi i IV v i  (E dorian)
    voic = voiced([E.chord(d, 3) for d in cyc], 52, 72)
    cb.n(E(-14), 0, tot * 4 - 12, 44, leg=0.6); cb.swell(0, 60, 30, 95); cb.ramp(60, 84, 95, 60); cb.ramp(84, 100, 60, 10)
    for b in range(0, tot):
        t = b * 4
        if b % 2 == 0 and 2 <= b < 18:
            v = voic[(b // 2) % 8]
            stagger(chr_, v, t, 8, gap=0.2, v=26 + min(14, b), leg=0.8)
            if b >= 6: stagger(vla, v[:2], t + 0.3, 8, gap=0.2, v=34, leg=0.8)
        if b % 3 == 1 and b < 20:
            brth.n(E4(0) + 12 * (b % 2), t + 1, 4, 24, leg=0.5)
            oo.n(E4(b % 5), t + 2, 5, 22, leg=0.8)
    chr_.swell(8, 72, 40, 105, peak=0.55)
    # bone flute: three sparse phrases, each ending on a held breath
    b1 = '4:1.5 3:.5 2:2  r:2 4:1 5:1  4:4'
    b2 = '7:2 6:1 4:1  2:1.5 3:.5 2:2  r:2 0:2  -1:4'
    b3 = '4:1 5:1 6:2  7:3 r:1  5:2 4:2  2:6'
    bone.line(24, b1, E4, shape=5, vel=56); bone.line(48, b2, E4, shape=6, vel=58); bone.line(72, b3, E4, shape=5, vel=54)
    for t, nm, v in [(14, 'A3', 36), (40, 'E3', 34), (66, 'A3', 34), (84, 'B3', 28)]:
        bell.n(midi(nm), t, 8, v, leg=0.0)
    for k, b in enumerate([6, 10, 14]):
        harp.n(E(0), b * 4 + 2, 6, 36, leg=0.5); harp.n(E(4), b * 4 + 3, 6, 32, leg=0.5)
    return S, 92
