"""OUTRIDER-CAPTAIN BRENNICK — an Office march. A mixolydian (A3 = 220 Hz), 118 bpm, 44 bars, loops.
Snare and bass drum on a flat march, pizzicato oom-pah, trumpets sounding the call (the Office's own: 1-4-5, 1-5-8,
5-4-1) and a fife answering; a trio on clarinets. Nothing in it is angry, which is the point."""
from lib import *

META = dict(file='boss_captain', kbps=96, loop=True, wet=0.16, rt60=2.2)


def build():
    S = Score('Brennick', 118, seed=220, rubato=0.003)
    A = Scale('A3', 'mixo'); A2 = Scale('A2', 'mixo'); A4 = Scale('A4', 'mixo')
    kit = S.part('drums', 48, drums=True, pan=64, base_vel=60, sigma=0.004)
    tpt = S.part('trumpets', 56, pan=40, base_vel=74, sigma=0.006)
    tpt2 = S.part('trumpets 2', 56, pan=44, base_vel=68, sigma=0.006)
    fife = S.part('fife', 72, pan=90, base_vel=62, sigma=0.01)
    cl = S.part('clarinets', 71, pan=70, base_vel=62, sigma=0.01)
    tuba = S.part('tuba', 58, pan=56, base_vel=70, sigma=0.006)
    pz = S.part('pizzicato', 45, pan=60, base_vel=58, sigma=0.006)
    hn = S.part('horns', 60, pan=76, base_vel=60, sigma=0.01)
    tim = S.part('timpani', 47, pan=50, base_vel=70, sigma=0.008)
    tot = 44
    # A strain (bars 0-15 = melody 8 bars twice), trio (16-31), A again with fife (32-43)
    call_a = '0:1 3:1 4:2  0:1 4:1 7:2'
    call_b = '4:1 3:1 0:2  2:2 1:1 0:1'
    strainA = '0:1 3:1 4:1 3:1  0:1 4:1 7:2  7:1 6:1 5:1 4:1  4:3 r:1   ' + '0:1 3:1 4:1 3:1  0:1 4:1 7:1 9:1  8:1 7:1 5:1 4:1  0:4'
    trio = '4:2 5:1 4:1  2:2 4:2  5:2 7:1 5:1  4:4   4:2 5:1 4:1  2:2 4:2  3:1 2:1 1:1 0:1  0:4'
    chord_of = lambda b: [0, 0, 3, 4, 0, 0, 4, 0][b % 8]   # A A D E | A A E A  (I I IV V | I I V I)
    for b in range(tot):
        t = b * 4
        d = chord_of(b)
        drum(kit, 36, t, 84); drum(kit, 36, t + 2, 76)
        for k in range(4):
            drum(kit, 38, t + k + 0.5, 56)
        drum(kit, 38, t + 1, 70); drum(kit, 38, t + 3, 72)
        if b % 4 == 3:                                  # roll into the next bar
            for k in range(8): drum(kit, 38, t + 3 + k * 0.125, 44 + k * 4)
        # oom-pah: bass note on 1 and 3, chord on 2 and 4
        root = A2(d)
        tuba.n(root, t, 0.8, 72, leg=0.0); tuba.n(root + (7 if d != 3 else 7), t + 2, 0.8, 68, leg=0.0)
        for beat in (1, 3):
            for p in [A(d), A(d + 2), A(d + 4)]: pz.n(p, t + beat, 0.4, 56, leg=0.0)
        if b % 2 == 0: tim.n(A2(d) + 12 - 12, t, 0.5, 70, leg=0.0)
    tpt.line(0, strainA, A, vel=76, shape=4, leg=0.0); tpt2.line(0, strainA, A, vel=64, shape=4, leg=0.0)
    tpt.line(32, strainA, A, vel=78, shape=4, leg=0.0)
    hn.line(32, strainA, A, vel=58, leg=0.0, lift=-12)
    cl.line(64, trio, A4, vel=64, shape=5, leg=0.0); cl.line(96, trio, A4, vel=66, shape=5, leg=0.0)
    fife.line(96, trio, A4, vel=58, leg=0.0, lift=12)
    tpt.line(128, strainA, A, vel=78, shape=4, leg=0.0); fife.line(128, strainA, A, vel=64, leg=0.0, lift=12)
    tpt.line(160, call_a + '  ' + call_b, A, vel=76, leg=0.0)
    return S, tot * 4
