"""THE STEAM GOLEM — steam and iron. A phrygian (A1 = 55 Hz), 88 bpm, 33 bars, loops.
Pistons in a 3-3-2 cell on tuba, bass trombone and timpani; after each hit a breath of steam (breath noise, sea-shore,
reverse cymbal into the bar), an iron bell, a lurching A - B-flat - A theme in bassoon and horns."""
from lib import *

META = dict(file='boss_golem', kbps=96, loop=True, wet=0.18, rt60=2.4)


def build():
    S = Score('Golem', 88, seed=55, rubato=0.003)
    A1 = Scale('A1', 'phryg'); A2 = Scale('A2', 'phryg'); A3 = Scale('A3', 'phryg')
    tuba = S.part('tuba', 58, pan=56, base_vel=76, sigma=0.006)
    btb = S.part('bass trombone', 57, pan=40, base_vel=70, sigma=0.006)
    tim = S.part('timpani', 47, pan=60, base_vel=76, sigma=0.006)
    kit = S.part('kit', 48, drums=True, pan=64, base_vel=60, sigma=0.005)
    stm = S.part('steam', 121, pan=84, base_vel=50, sigma=0.01)
    sea = S.part('vent', 122, pan=36, base_vel=40, sigma=0.01)
    rev = S.part('reverse', 119, pan=70, base_vel=40, sigma=0.01)
    bell = S.part('iron bell', 14, pan=94, base_vel=54, sigma=0.01)
    bsn = S.part('bassoon', 70, pan=50, base_vel=66, sigma=0.01)
    hn = S.part('horns', 60, pan=78, base_vel=62, sigma=0.01)
    cel = S.part('cellos', 42, pan=30, base_vel=64, sigma=0.008)
    tot = 33
    for b in range(tot):
        t = b * 4
        d = 1 if b % 8 == 7 else 0
        for k, beat in enumerate([0, 1.5, 3]):                # 3-3-2
            hit = 84 if k == 0 else 70
            tuba.n(A1(d), t + beat, 0.5, hit, leg=0.0)
            if b >= 4: btb.n(A1(d) + 12, t + beat, 0.5, hit - 8, leg=0.0)
            tim.n(A1(0) + 12 + 12 * 0, t + beat, 0.5, hit, leg=0.0)
            drum(kit, 36, t + beat, 80)
            if b >= 2:
                stm.n(midi('C5'), t + beat + 0.12, 0.9, 50, leg=0.0)
                stm.ramp(t + beat + 0.1, t + beat + 1.0, 100, 10, step=0.1)
        if b >= 6: drum(kit, 38, t + 2.25, 56); drum(kit, 38, t + 3.75, 50)
        if b % 2 == 1:
            sea.n(midi('C4'), t + 1.5, 2.2, 36, leg=0.0); sea.swell(t + 1.5, t + 3.7, 5, 90, peak=0.3)
            rev.n(midi('C5'), t + 3.0, 1.0, 40, leg=0.0); rev.ramp(t + 3.0, t + 4.0, 10, 100, step=0.1); rev.cc(t + 4.0, 11, 0)
        if b >= 8 and b % 4 == 2: bell.n(midi('A3') if b % 8 == 2 else midi('Bb3'), t, 4, 54, leg=0.0)
        if b >= 12:
            for k, beat in enumerate([0, 1.5, 3]): cel.n(A2(d), t + beat, 1.2, 64, leg=0.0)
    theme = '0:1.5 1:1.5 0:1  -1:1 0:3'
    theme2 = '4:1.5 3:1.5 1:1  0:1 1:3'
    for k in range(4, tot - 4, 4):
        bsn.line(k * 4, theme if (k // 4) % 2 else theme2, A3, vel=68, leg=0.0)
        if k >= 12: hn.line(k * 4 + 2, '0:2 1:2 0:4', A3, vel=62, leg=0.0)
    return S, tot * 4
