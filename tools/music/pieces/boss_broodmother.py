"""THE BROOD-MOTHER — skittering. A phrygian (A1 = 55 Hz), 140 bpm, 52 bars, loops. Pizzicato strings and wood-blocks
scatter in sixteenths (seeded, never the same two bars), basses lurch on the semitone, brass stab the A-B-flat-A motif,
a violin harmonic is drawn taut and snaps."""
from lib import *

META = dict(file='boss_broodmother', kbps=96, loop=True, wet=0.16, rt60=2.2)


def build():
    S = Score('Brood-Mother', 140, seed=55, rubato=0.004)
    A1 = Scale('A1', 'phryg'); A3 = Scale('A3', 'phryg'); A4 = Scale('A4', 'phryg')
    pz = S.part('pizzicato', 45, pan=40, base_vel=60, sigma=0.006)
    pz2 = S.part('pizzicato 2', 45, pan=88, base_vel=56, sigma=0.006)
    perc = S.part('wood', 48, drums=True, pan=64, base_vel=56, sigma=0.006)
    cel = S.part('cellos', 42, pan=36, base_vel=66, sigma=0.008)
    cbs = S.part('basses', 43, pan=60, base_vel=64, sigma=0.008)
    tbn = S.part('trombones', 57, pan=70, base_vel=66, sigma=0.01)
    hn = S.part('horns', 60, pan=50, base_vel=60, sigma=0.01)
    vln = S.part('violins (taut)', 40, pan=94, base_vel=40, sigma=0.01)
    tim = S.part('timpani', 47, pan=56, base_vel=72, sigma=0.008)
    tre = S.part('tremolo', 44, pan=30, base_vel=40, sigma=0.01)
    rr = random.Random(55)
    tot = 52
    pool = [0, 1, 2, 4, 5, 7, 8, 9]
    for b in range(tot):
        t = b * 4
        dens = [0.35, 0.5, 0.65, 0.8][min(3, (b % 16) // 4)] if b < 48 else 0.5
        for j in range(16):
            if rr.random() < dens:
                d = rr.choice(pool)
                pz.n(A3(d), t + j * 0.25, 0.2, 54 + (10 if j % 4 == 0 else 0), leg=0.0)
            if rr.random() < dens * 0.7:
                pz2.n(A4(rr.choice(pool)), t + j * 0.25 + 0.125, 0.15, 46, leg=0.0)
            if j % 2 == 0 and rr.random() < 0.5 + dens * 0.4:
                drum(perc, 76 if rr.random() < 0.6 else 77, t + j * 0.25, 40 + int(rr.random() * 24))
        # bass lurch: 8ths on A with the bII leaning in
        for j in range(8):
            d = 1 if (j % 4 == 3 and b % 2) else 0
            vel = 74 if j % 2 == 0 else 54
            cel.n(A1(d) + 12, t + j * 0.5, 0.4, vel, leg=0.0)
            cbs.n(A1(d), t + j * 0.5, 0.4, vel + 4, leg=0.0)
        if b % 4 == 0: tim.n(A1(0) + 12, t, 0.5, 90, leg=0.0)
        if b % 4 == 2 and b >= 8: tim.n(A1(0) + 12, t + 2.5, 0.4, 70, leg=0.0)
        if b % 8 == 7 and b < 48:                               # the glass thread: a harmonic drawn taut, then snapped
            base = midi('A6')
            vln.n(base, t, 3.5, 44, leg=0.0); vln.ramp(t, t + 3.5, 20, 110); vln.bend_ramp(t, t + 3.5, -150, 0, step=0.25)
            vln.cc(t + 3.5, 11, 0); vln.bend(t + 3.6, 0)
            drum(perc, 49, t + 3.5, 40)
        if b >= 8 and b % 2 == 0 and b < 48:                    # brass motif A - Bb - A
            tbn.line(t, '0:.75 1:.75 0:.5 r:2', A3, vel=74, leg=0.0, lift=-12)
            hn.line(t + 2, '0:.5 -1:.5 0:1', A3, vel=62, leg=0.0)
        if b >= 16 and b < 48 and b % 4 == 0:
            for p in [A3(0), A3(1), A3(5)]:
                tre.n(p + 12, t, 4, 36, leg=0.0)
            tre.swell(t, t + 4, 20, 80)
    return S, tot * 4
