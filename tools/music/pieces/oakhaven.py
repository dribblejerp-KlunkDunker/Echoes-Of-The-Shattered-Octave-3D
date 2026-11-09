"""OAKHAVEN — Growth, 174 Hz (F3). An orchard town forbidden to sing: the tune is played, never sung, and it keeps
stopping where the words would be. F lydian, 76 bpm. Harp/nylon pluck, oboe (reed-pipe), flute, viola, cello, strings."""
from lib import *

META = dict(file='oakhaven', kbps=112, loop=False, wet=0.20, rt60=2.4, fade_out=3.0)


def build():
    S = Score('Oakhaven', 76, seed=174, rubato=0.016, end_rit=0.10)
    F4 = Scale('F4', 'lydian'); F3 = Scale('F3', 'lydian'); F2 = Scale('F2', 'lydian')
    harp = S.part('harp', 46, pan=50, base_vel=62, sigma=0.012)
    gtr = S.part('nylon', 24, pan=78, base_vel=50, sigma=0.014)
    oboe = S.part('reed-pipe', 68, pan=68, base_vel=66, sigma=0.018)
    flute = S.part('flute', 73, pan=60, base_vel=58, sigma=0.016)
    vla = S.part('viola', 41, pan=40, base_vel=56, sigma=0.02)
    vc = S.part('cello', 42, pan=34, base_vel=60, sigma=0.02)
    strs = S.part('strings', 49, pan=64, base_vel=52, sigma=0.03)
    drm = S.part('frame drum', 117, pan=70, base_vel=40, sigma=0.01)

    # chords by bar (degree in F lydian, triad size, optional seventh): the town's four tonics
    prog = [(0, 3), (1, 3), (5, 4), (4, 3),  (0, 3), (5, 4), (2, 4), (0, 3),
            (5, 4), (4, 3), (0, 3), (1, 3),  (5, 4), (2, 3), (3, 3), (4, 3)]
    def bar_chord(b):
        deg, size = prog[b % 16]
        return F3.chord(deg, size)

    # --- melody (degrees on F4): phrases break off on a rest where a sung word would fall ----------------------------
    A1 = '4:2 2:1 1:1  0:3 r:1  1:1 2:1 4:1 5:1  4:3 r:1'
    A2 = '4:2 2:1 1:1  0:2 -1:1 0:1  1:1 3:1 2:1 1:1  0:4'
    B1 = '5:2 7:1 6:1  5:3 r:1  4:1 5:1 7:1 9:1  8:3 r:1'
    B2 = '9:2 7:1 6:1  5:2 3:1 4:1  2:1 3:1 5:1 4:1  4:2 r:2'
    C1 = '4:1.5 5:.5 7:1 5:1  4:2 2:2  1:1.5 2:.5 4:1 2:1  0:4'

    # bars are 4 beats; piece = 40 bars
    # 1-4: harp alone, cello drone at bar 3
    for b in range(0, 4):
        ch = bar_chord(b)
        arp(harp, ch, b * 4, [0, 1, 2, 1, 3, 2, 1, 2] if b else [0, 2, 1, 2, 3, 2, 1, 2], step=0.5, v=58 + 3 * b, up=12)
    vc.n(F2(0), 8, 8, 52, leg=0.4); vc.swell(8, 16, 70, 108)
    # 5-12: reed-pipe A, A'; harp holds the orchard pluck; guitar offbeat
    t = 16
    oboe.line(t, A1, F4, shape=6); oboe.line(t + 16, A2, F4, shape=6)
    for b in range(4, 12):
        ch = bar_chord(b)
        arp(harp, ch, b * 4, [0, 1, 2, None, 3, 2, 1, None], step=0.5, v=56, up=12)
        if b % 2:
            gtr.chord([ch[0] + 12, ch[1] + 12, ch[2] + 12], b * 4 + 1.5, 1.0, 46, roll=0.06)
        vc.n(F2(prog[b % 16][0]) if prog[b % 16][0] in (0, 5) else F2(0), b * 4, 4, 54, leg=0.3)
    # 13-20: B with the flute doubling an octave up a bar late; viola enters
    oboe.line(48, B1, F4, shape=7); oboe.line(48 + 16, B2, F4, shape=7)
    flute.line(48 + 4, transpose_line(B1, 7), F4, shape=5, vel=48)
    vp = [F3(0) + 12, F3(2) + 12]
    for b in range(12, 20):
        ch = bar_chord(b)
        arp(harp, ch, b * 4, [0, 1, 2, 3, 2, 1, 2, 1], step=0.5, v=58, up=12)
        gtr.chord([ch[1] + 12, ch[2] + 12], b * 4 + 2.5, 1.0, 44, roll=0.05)
        vc.n(F2(prog[b % 16][0]), b * 4, 4, 56, leg=0.3)
        vla.n(ch[1], b * 4, 4, 48, leg=0.4)
    vla.swell(48, 80, 70, 100)
    # 21-28: the melody in the strings' company; drum enters like a footstep
    oboe.line(80, A1, F4, shape=6, lift=0); flute.line(80, transpose_line(A1, 7), F4, vel=44, shape=4)
    oboe.line(96, C1, F4, shape=7)
    for b in range(20, 28):
        ch = bar_chord(b)
        arp(harp, ch, b * 4, [0, 1, 2, 1, 3, 2, 4, 2], step=0.5, v=60, up=12)
        strs.n(ch[0], b * 4, 4, 46, leg=0.5); strs.n(ch[1], b * 4 + 0.07, 4, 46, leg=0.5); strs.n(ch[2] + 12 if b % 2 else ch[2], b * 4 + 0.12, 4, 46, leg=0.5)
        vc.n(F2(prog[b % 16][0]), b * 4, 4, 58, leg=0.3)
        drum(drm, 45, b * 4, 36); drum(drm, 48, b * 4 + 2, 30)
    strs.swell(80, 112, 60, 100)
    # 29-36: the bloom — reed-pipe lifts a sixth, flute and viola answer, one held chord of all the town's tonics
    oboe.line(112, transpose_line(B1, 2), F4, shape=8, vel=70); oboe.line(112 + 16, transpose_line(B2, 2), F4, shape=8, vel=70)
    flute.line(112 + 8, transpose_line(A2, 7), F4, vel=52, shape=5)
    for b in range(28, 36):
        ch = bar_chord(b)
        arp(harp, ch, b * 4, [0, 2, 1, 3, 2, 4, 3, 2], step=0.5, v=62, up=12)
        for k, p in enumerate([ch[0], ch[1], ch[2], ch[0] + 12]):
            strs.n(p, b * 4 + k * 0.06, 4, 52, leg=0.5)
        vc.n(F2(prog[b % 16][0]), b * 4, 4, 60, leg=0.3)
        vla.n(ch[2], b * 4, 4, 52, leg=0.4)
        drum(drm, 45, b * 4, 40); drum(drm, 48, b * 4 + 2, 32)
    strs.swell(112, 144, 80, 112, peak=0.6)
    # 37-40: it stops — the tune is left unsung. F alone, harp harmonics.
    oboe.line(144, '4:2 2:1 1:1  0:4', F4, shape=4, vel=60)
    for b in range(36, 40):
        ch = bar_chord(0)
        arp(harp, ch, b * 4, [0, 1, 2, None] if b < 38 else [0, None, None, None], step=1.0, v=50 - 6 * (b - 36), up=12)
    vc.n(F2(0), 144, 14, 50, leg=0.5); vc.ramp(144, 158, 100, 20)
    strs.n(F3(0), 144, 12, 40, leg=0.5); strs.n(F3(4), 144.05, 12, 38, leg=0.5); strs.ramp(144, 156, 90, 10)
    flute.n(F4(0) + 12, 152, 5, 44); flute.ramp(152, 157, 100, 10)
    return S, 160
