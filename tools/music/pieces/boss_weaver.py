"""THE PHANTOM WEAVER — shifting borrowed melodies. F-sharp pentatonic ground, 100 bpm, 38 bars, loops.
Two lines braided on the eighths (celesta and harp), a tritone drone (F#-C) the thread hangs on, and every four bars a
borrowed tune from elsewhere in the Reach is woven in, then the thread snaps and the next one is taken up."""
from lib import *

META = dict(file='boss_weaver', kbps=96, loop=True, wet=0.24, rt60=2.8)


def build():
    S = Score('Weaver', 100, seed=37, rubato=0.004)
    FS = Scale('F#4', 'pent')
    cel = S.part('celesta', 8, pan=84, base_vel=56, sigma=0.006)
    harp = S.part('harp', 46, pan=40, base_vel=58, sigma=0.008)
    pz = S.part('pizzicato', 45, pan=50, base_vel=56, sigma=0.008)
    tim = S.part('timpani', 47, pan=56, base_vel=64, sigma=0.01)
    dr1 = S.part('drone F#', 44, pan=44, base_vel=36, sigma=0.03)
    dr2 = S.part('drone C', 44, pan=84, base_vel=34, sigma=0.03)
    cb = S.part('bass', 43, pan=60, base_vel=58, sigma=0.01)
    ob = S.part('borrowed (oboe)', 68, pan=64, base_vel=60, sigma=0.015)
    fl = S.part('borrowed (flute)', 73, pan=74, base_vel=56, sigma=0.015)
    vc = S.part('borrowed (cello)', 42, pan=34, base_vel=60, sigma=0.015)
    snap = S.part('thread', 40, pan=96, base_vel=40, sigma=0.01)
    tot = 38
    A, Bl = [0, 2, 4, 6], [9, 7, 5, 3]
    # borrowed tunes, each written in its own mode and brought to F# (Oakhaven reed tune, the main motif, the grove's
    # lament, the quarry's tune), 4 bars apiece
    borrowed = [
        ('ob', Scale('F#4', 'lydian'), '4:2 2:1 1:1  0:3 r:1  1:1 2:1 4:1 5:1  4:3 r:1'),
        ('fl', Scale('F#5', 'minor'), '0:1.5 2:.5 4:2  3:1 1:1 0:2  2:1.5 4:.5 6:2  5:2 4:1 3:1'),
        ('vc', Scale('F#3', 'minor'), '4:2 3:1 2:1  1:3 r:1  2:2 1:1 0:1  -1:4'),
        ('ob', Scale('F#4', 'phryg'), '0:1.5 1:.5 0:1 -1:1  0:3 r:1  3:1.5 4:.5 3:1 1:1  0:4'),
    ]
    insts = {'ob': ob, 'fl': fl, 'vc': vc}
    dr1.n(midi('F#2'), 0, tot * 4, 40, leg=0.0); dr2.n(midi('C3'), 0, tot * 4, 38, leg=0.0)
    dr1.swell(0, tot * 4, 40, 90, peak=0.5); dr2.swell(0, tot * 4, 40, 90, peak=0.5)
    # a loop-seam: swells go to 40 at both ends
    for b in range(tot):
        t = b * 4
        off = (b // 4 % 3) * 2
        dens = 1 if b >= 4 else 0.6
        for j in range(8):
            seq = A if j % 2 == 0 else Bl
            d = seq[j >> 1] + off
            (cel if j % 2 == 0 else harp).n(FS(d) + (12 if j % 2 == 0 else 0), t + j * 0.5, 1.0, 54 + (8 if j == 0 else 0), leg=0.1)
        if b % 2 == 0: tim.n(midi('F#2'), t, 0.6, 70, leg=0.0)
        pz.n(midi('F#2'), t + 1, 0.4, 60, leg=0.0); pz.n(midi('F#2'), t + 3, 0.4, 56, leg=0.0)
        cb.n(midi('F#1') if b % 4 != 3 else midi('C2'), t, 1.0, 62, leg=0.1)
        if b % 4 == 3 and b < tot - 1:                  # the thread snaps
            snap.n(midi('F#6'), t + 3.5, 0.5, 50, leg=0.0); snap.bend_ramp(t + 3.5, t + 4, 0, -200, step=0.1); snap.bend(t + 4.1, 0)
    for k in range(tot // 4):
        nm, sc, txt = borrowed[k % 4]
        if k == 0: continue                           # the first four bars are the braid alone
        insts[nm].line(k * 16, txt, sc, shape=5, vel=64)
    return S, tot * 4
