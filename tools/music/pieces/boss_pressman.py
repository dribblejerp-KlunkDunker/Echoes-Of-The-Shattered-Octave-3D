"""PRESSMAN MALLOW — a ledger-stamp ostinato. A phrygian (A1 = 55 Hz), 124 bpm, 46 bars, loops.
Wood-block and side-stick stamps in a fixed cell, the press-note (741 Hz, F#5) on glockenspiel at 1 and 3&, basses on the
semitone, a clarinet and bassoon reading entries on repeated notes that only ever step a second."""
from lib import *

META = dict(file='boss_pressman', kbps=96, loop=True, wet=0.14, rt60=2.0)


def build():
    S = Score('Pressman', 124, seed=55, rubato=0.003)
    A1 = Scale('A1', 'phryg'); A3 = Scale('A3', 'phryg'); A2 = Scale('A2', 'phryg')
    kit = S.part('stamps', 48, drums=True, pan=64, base_vel=60, sigma=0.004)
    cb = S.part('basses', 43, pan=60, base_vel=68, sigma=0.005)
    cel = S.part('cellos', 42, pan=36, base_vel=62, sigma=0.005)
    pz = S.part('pizzicato', 45, pan=44, base_vel=58, sigma=0.005)
    glk = S.part('press-note (741)', 9, pan=84, base_vel=64, sigma=0.004)
    cl = S.part('clarinet (ledger)', 71, pan=54, base_vel=62, sigma=0.01)
    bsn = S.part('bassoon', 70, pan=74, base_vel=60, sigma=0.01)
    tim = S.part('timpani', 47, pan=56, base_vel=70, sigma=0.006)
    tot = 46
    for b in range(tot):
        t = b * 4
        for j in range(8):
            strong = j % 4 == 0
            drum(kit, 37 if strong else 76, t + j * 0.5, 80 if strong else 48)
            if j in (0, 3, 6) and b >= 4: drum(kit, 77, t + j * 0.5 + 0.02, 60)
            d = 0 if j % 4 != 3 else (1 if b % 2 else 0)
            cb.n(A1(d), t + j * 0.5, 0.4, 76 if strong else 54, leg=0.0)
            if b >= 8: pz.n(A2(d) + 12 * (j % 2), t + j * 0.5 + 0.25, 0.2, 52, leg=0.0)
        for beat in (0, 2.5):
            glk.n(midi('F#5'), t + beat, 0.5, 70, leg=0.0)
        if b % 4 == 0: tim.n(A1(0) + 12, t, 0.5, 86, leg=0.0)
        if b >= 12 and b % 2 == 0:
            for j in range(4): cel.n(A2(0) if j != 3 else A2(1), t + j * 1.0, 0.8, 62, leg=0.0)
        if b % 8 == 7: drum(kit, 49, t + 3.5, 56)         # the stamp comes down
    # the ledger recitation: repeated notes, a second, back — entries read aloud
    entries = ['0:.5 0:.5 0:.5 0:.5 0:1 1:1 0:1 r:1', '0:.5 0:.5 0:.5 0:.5 1:1 0:1 -1:1 r:1', '2:.5 2:.5 2:.5 2:.5 2:1 1:1 2:1 r:1', '0:.5 0:.5 1:.5 0:.5 0:1 -1:1 0:2']
    for k in range(10, tot, 2):
        txt = entries[(k // 2) % 4]
        cl.line(k * 4, txt, A3, vel=62, leg=0.0)
        if k >= 22: bsn.line(k * 4 + 4, txt, A2, vel=58, leg=0.0)
    return S, tot * 4
