"""THE QUARRY — stone and iron. C phrygian (65.41 Hz = C2), 60 bpm. Hammers in irregular cells (5-and-3, 3-3-2), a drip of
celesta, trombone chorale, bassoon and cello tune, iron bells struck once. Taiko/tom, woodblock, cowbell as iron."""
from lib import *

META = dict(file='quarry', kbps=112, loop=False, wet=0.20, rt60=2.6, fade_out=3.0)


def build():
    S = Score('Quarry', 60, seed=65, rubato=0.010, end_rit=0.10)
    C2 = Scale('C2', 'phryg'); C3 = Scale('C3', 'phryg'); C4 = Scale('C4', 'phryg')
    perc = S.part('hammers', 48, drums=True, pan=64, base_vel=60, sigma=0.008)
    tmp = S.part('timpani', 47, pan=56, base_vel=60, sigma=0.012)
    cb = S.part('bass', 43, pan=60, base_vel=56, sigma=0.02)
    vc = S.part('cello', 42, pan=34, base_vel=60, sigma=0.02)
    bsn = S.part('bassoon', 70, pan=48, base_vel=60, sigma=0.02)
    tbn = S.part('trombones', 57, pan=70, base_vel=50, sigma=0.03)
    hn = S.part('horns', 60, pan=80, base_vel=46, sigma=0.03)
    cel = S.part('drip', 8, pan=98, base_vel=44, sigma=0.01)
    bell = S.part('iron bell', 14, pan=40, base_vel=50, sigma=0.01)
    strs = S.part('strings', 49, pan=64, base_vel=40, sigma=0.04)
    kit = {'tom': 41, 'tom2': 43, 'wood': 77, 'wood2': 76, 'cow': 56, 'clave': 75, 'side': 37}
    cells = [[0, 1.5], [0, 2], [0, 1, 2.5], [0, 1.5, 3], [0, .5, 2, 3.5]]
    tot = 30
    chords = [0, 0, 1, 0, 3, 0, 5, 1]       # i, i, bII, i, iv, i, VI, bII per 2-bar span
    for b in range(tot):
        t = b * 4
        c = chords[(b // 2) % 8]
        if b >= 2 and b % 4 != 3 and b < 27:
            cell = cells[(b * 7 + 3) % len(cells)]
            for k, beat in enumerate(cell):
                strong = k == 0
                drum(perc, kit['tom'] if strong else kit['wood'], t + beat, 74 if strong else 52)
                if strong and b >= 6:
                    drum(perc, kit['cow'], t + beat + 0.02, 36)   # iron
                tmp.n(C2(0) if c == 0 else C2(c), t + beat, 0.5, 70 if strong else 48, leg=0.1)
        if b >= 10 and b % 2 == 0:
            drum(perc, kit['clave'], t + 3.5, 40)
        cb.n(C2(c), t, 4 if b % 2 else 3.5, 54, leg=0.3)
    # drone swell and the drips of water on stone
    cb.swell(0, 30 * 4, 70, 100)
    import random as _r
    rr = _r.Random(5)
    for k in range(34):
        t = 3 + k * 3.5 + rr.random() * 2
        cel.n(C4(rr.choice([0, 1, 3, 4, 7, 8])) + 12, t, 2, 30 + rr.random() * 14, leg=0.0)
    # the quarry tune: cello then bassoon, a lopsided phrase (5/4 feel via 3+2)
    q1 = '0:1.5 1:.5 0:1 -1:1  0:3 r:1  3:1.5 4:.5 3:1 1:1  0:4'
    q2 = '4:1.5 3:.5 1:1 0:1  1:2 0:1 -1:1  0:1 1:1 3:1 1:1  0:4'
    vc.line(16, q1, C3, shape=6, vel=60); bsn.line(32, q1, C3, shape=6, vel=60); vc.line(32, transpose_line(q1, 0), C3, shape=4, vel=52, lift=-12)
    vc.line(48, q2, C3, shape=7, vel=62); bsn.line(48, q2, C3, shape=7, vel=60)
    # trombone chorale in the middle, then horns: slow chords on the minor second
    ch = voiced([C3.chord(d, 3) for d in [0, 1, 0, 3, 5, 1, 0, 0]], 40, 64)
    for k, v in enumerate(ch):
        stagger(tbn, v, 56 + k * 4, 4, gap=0.1, v=48 + k, leg=0.4)
        if k >= 2:
            stagger(hn, [p + 12 for p in v[1:]], 56 + k * 4 + 0.1, 4, gap=0.1, v=42 + k, leg=0.4)
        stagger(strs, v, 56 + k * 4, 4, gap=0.1, v=36 + k, leg=0.4)
    tbn.swell(56, 88, 60, 110); hn.swell(56, 88, 50, 100)
    bsn.line(96, q2, C3, shape=6, vel=58)
    # iron bells: struck, each once
    for t, nm in [(22, 'C4'), (50, 'Db4'), (74, 'C4'), (92, 'Db4'), (104, 'C3')]:
        bell.n(midi(nm), t, 6, 52, leg=0.0)
    # close: all hammers stop; the bass holds C and Db against it, then C alone
    cb.n(C2(0), 112, 8, 50, leg=0.5); cb.n(C2(1), 114, 6, 40, leg=0.5); cb.ramp(112, 120, 80, 10)
    vc.n(C3(0), 112, 7, 44, leg=0.5); vc.ramp(112, 120, 80, 10)
    return S, 120
