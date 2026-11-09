"""THE DEEP WOODS — willows, low strings, distant bells. F phrygian (87.31 Hz = F2), 46 bpm: the minor second leans in.
Basses and cellos, a bassoon, tremolo 'fronds', far tubular bells."""
from lib import *

META = dict(file='deepwoods', kbps=96, loop=False, wet=0.30, rt60=3.4, fade_out=4.0)


def build():
    S = Score('Deep Woods', 46, seed=87, rubato=0.014, end_rit=0.12)
    P = Scale('F2', 'phryg'); P4 = Scale('F4', 'phryg'); P3 = Scale('F3', 'phryg')
    cb = S.part('basses', 43, pan=56, base_vel=50, sigma=0.03)
    vc = S.part('cellos', 42, pan=36, base_vel=56, sigma=0.025)
    vla = S.part('violas', 41, pan=84, base_vel=46, sigma=0.03)
    trem = S.part('fronds', 44, pan=70, base_vel=34, sigma=0.05)
    bsn = S.part('bassoon', 70, pan=50, base_vel=58, sigma=0.02)
    hn = S.part('horn', 60, pan=76, base_vel=44, sigma=0.03)
    bell = S.part('far bells', 14, pan=96, base_vel=32, sigma=0.01)
    harp = S.part('harp', 46, pan=30, base_vel=44, sigma=0.014)
    # two bars per chord: Fm, Gb, Fm, Db, Fm, Eb, Bbm, Gb   (degrees on F phrygian: i, bII, i, VI, i, VII, iv, bII)
    cyc = [0, 1, 0, 5, 0, 6, 3, 1]
    chord = lambda d: P3.chord(d, 3)
    voic = voiced([chord(d) for d in cyc], 48, 69)
    tot = 30
    for b in range(tot):
        c = cyc[(b // 2) % 8]; v = voic[(b // 2) % 8]
        if b % 2 == 0:
            cb.n(P(c) , b * 4, 8, 52, leg=0.6)
    # bass pedal swell over the whole piece, then pad strings enter at bar 5
    cb.swell(0, 100, 50, 100, peak=0.5); cb.swell(100, 120, 90, 20, peak=0.0)
    for b in range(4, 28, 2):
        v = voic[(b // 2) % 8]
        stagger(vc, [p for p in v[:2]], b * 4, 8, gap=0.2, v=44, leg=0.7)
        stagger(vla, [v[2]], b * 4 + 0.3, 8, gap=0.2, v=40, leg=0.7)
    vc.swell(16, 100, 60, 105, peak=0.5); vla.swell(16, 100, 50, 95, peak=0.55)
    for b in range(0, 30):                      # wind through the fronds: tremolo cluster breathing every few bars
        if b % 3 == 1:
            c = cyc[(b // 2) % 8]
            for k, d in enumerate([c + 7, c + 9]):
                trem.n(P(d), b * 4 + k * 0.1, 7, 30, leg=0.5)
            trem.swell(b * 4, b * 4 + 7, 10, 70)
    # the willow tune: a bassoon line, falling, with the Gb leaning on the F
    w1 = '4:3 3:1  1:2 0:2  1:1 2:1 1:1 0:1  0:4'
    w2 = '4:2 5:1 4:1  3:2 1:2  2:1 1:1 0:2  -1:4'
    bsn.line(32, w1, P3, shape=5, vel=60); bsn.line(48, w2, P3, shape=6, vel=62)
    vc.line(64, transpose_line(w1, 7), P3, shape=5, vel=58, lift=-12); hn.line(64, '0:4 1:4 0:4 -2:4', P3, vel=42, shape=4)
    bsn.line(80, w2, P3, shape=5, vel=58)
    # distant bells: a high F and a Db, struck from far away, never together
    for t, nm, v in [(10, 'F5', 34), (26, 'C6', 30), (44, 'Db5', 34), (61, 'F5', 30), (77, 'C5', 32), (95, 'Db6', 24), (108, 'F5', 22)]:
        bell.n(midi(nm), t, 6, v, leg=0.0)
    harp.n(P4(0) - 12, 36, 6, 40); harp.n(P4(1) - 12, 37.5, 6, 38)
    # last bars: open fifth, F and C, falling to nothing
    cb.n(P(0), 112, 8, 46, leg=0.5); vc.n(P3(0), 112, 8, 42, leg=0.5); vc.n(P3(4), 112.1, 8, 40, leg=0.5); vc.ramp(112, 120, 90, 10)
    return S, 120
