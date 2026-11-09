"""THE WEARER — a warm voice turned wrong. F (174 Hz = F3), 112 bpm, 38 bars, loops.
A: a tender voice in F major over a soft pulse. B: a second voice a quarter-tone flat joins it, strings gather.
C: the tune turns to phrygian with the falling fifth underneath and quarter-tone cluster stabs, timpani. D: the warmth
returns, a little wrong, which is the loop point."""
from lib import *

META = dict(file='boss_wearer', kbps=96, loop=True, wet=0.26, rt60=3.0)


def build():
    S = Score('Wearer', 112, seed=174, rubato=0.004)
    FM = Scale('F4', 'major'); FP = Scale('F4', 'phryg'); F3 = Scale('F3', 'phryg')
    v1 = S.part('voice (true)', 53, pan=56, base_vel=64, sigma=0.015)
    v2 = S.part('voice (-50c)', 53, pan=72, base_vel=44, sigma=0.02)
    v2.bend(0, -50)
    pad = S.part('warm pad', 89, pan=40, base_vel=40, sigma=0.03)
    hp = S.part('harp', 46, pan=36, base_vel=52, sigma=0.01)
    stg = S.part('strings', 49, pan=84, base_vel=50, sigma=0.02)
    tim = S.part('timpani', 47, pan=56, base_vel=70, sigma=0.008)
    cb = S.part('basses', 43, pan=60, base_vel=62, sigma=0.01)
    cel = S.part('cellos', 42, pan=34, base_vel=60, sigma=0.01)
    cl1 = S.part('cluster a (+50c)', 44, pan=30, base_vel=44, sigma=0.01); cl1.bend(0, 50)
    cl2 = S.part('cluster b (-50c)', 44, pan=96, base_vel=44, sigma=0.01); cl2.bend(0, -50)
    cl3 = S.part('cluster c', 44, pan=64, base_vel=44, sigma=0.01)
    kit = S.part('kit', 48, drums=True, pan=64, base_vel=50, sigma=0.006)
    tot = 38
    warm = '2:1.5 4:.5 5:2  4:1 2:1 1:2   0:1.5 1:.5 2:2  1:2 0:2'       # 2 bars of F major
    warm2 = '4:1.5 5:.5 7:2  5:1 4:1 2:2  3:1.5 2:.5 1:2  0:4'
    wrong = '2b:1.5 4:.5 5b:2  4:1 2b:1 1b:2  0:1.5 1b:.5 2b:2  1b:2 0:2'     # the same tune, turned minor/phrygian
    chords_w = [0, 3, 0, 4]           # F, Bb, F, C  (major)
    for b in range(tot):
        t = b * 4
        if b < 8 or b >= 32:                                    # warm pulse: harp arpeggios, soft pad
            rt = [0, 3, 0, 4][(b // 2) % 4]
            ch = [FM(rt - 7 if rt else -7) + 12 * 0, FM(rt + 2 - 7), FM(rt + 4 - 7)]
            ch = [FM(rt - 7), FM(rt - 5), FM(rt - 3), FM(rt)]
            arp(hp, ch, t, [0, 1, 2, 3, 2, 1, 2, 1], step=0.5, v=50, up=12)
            pad.chord(ch[:3], t, 4, 38, leg=0.3)
        if 8 <= b < 32:
            kit_v = 60
            tim.n(F3(0) + 12 - 12, t, 0.6, 76, leg=0.0)
            if b >= 12: tim.n(F3(0), t + 2, 0.5, 62, leg=0.0)
            cb.n(F3(0) - 12 + 12 * 0, t, 1.9, 64, leg=0.0); cb.n(F3(0) - 12, t + 2, 1.9, 60, leg=0.0)
    v1.line(0, warm, FM, shape=6, vel=66); v1.line(8, warm2, FM, shape=6, vel=66)
    v1.line(16, warm, FM, shape=6, vel=68); v1.line(24, warm2, FM, shape=6, vel=68)
    # B (bars 4-7 = beats 16-31): the second voice enters a quarter-tone flat
    v2.line(16, warm, FM, shape=4, vel=48); v2.line(24, warm2, FM, shape=4, vel=50)
    stg.chord([FM(-7), FM(-5), FM(-3)], 16, 8, 46, leg=0.4); stg.chord([FM(-4), FM(-2), FM(0)], 24, 8, 48, leg=0.4); stg.swell(16, 32, 40, 100)
    # C (bars 8-31): the wrong tune, falling fifths and cluster stabs
    for k in range(6):
        t = 32 + k * 16
        v1.line(t, wrong, FP, shape=6, vel=70); v2.line(t + 0.0, wrong, FP, shape=4, vel=58)
        v1.line(t + 8, transpose_line(wrong, 2), FP, shape=6, vel=70) if k % 2 else v1.line(t + 8, warm2, FM, shape=5, vel=66)
    for b in range(8, 32):
        t = b * 4
        cel.line(t, '0:1 -3:1 0:1 -3:1' if b % 2 == 0 else '0:1 -4:1 -1:1 -4:1', F3, vel=62, leg=0.0, lift=0)   # the falling fifth
        if b % 2 == 1:
            for p, c in [(midi('F4'), cl1), (midi('F4') + 3, cl2), (midi('F4') + 7, cl3)]:
                c.n(p, t + 2.5, 0.9, 60, leg=0.0)
        drum(kit, 38, t + 1, 60); drum(kit, 38, t + 3, 64)
        if b >= 16: stagger(stg, [F3(0) + 12, F3(2) + 12, F3(4) + 12], t, 4, gap=0.06, v=50, leg=0.2)
    # D (bars 32-37): back to the warmth, one voice still flat
    v2.line(128, warm, FM, shape=4, vel=40)
    for p in (v1, v2, stg): p.ramp(128, 152, 110, 90)
    return S, tot * 4
