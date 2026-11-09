"""THE MAUSOLEUM OF CHORDS — parallel fifths on a slow organ (G minor, 98 Hz = G2), 42 bpm; a funeral bell tolling a
quarter-tone flat; four tomb-bells tuned to 528, 639, 741 and 852 Hz (pitch classes C+16c, D#+46c, F#, G#+44c,
sounded in the octave below so they toll rather than chime)."""
from lib import *

META = dict(file='mausoleum', kbps=96, loop=False, wet=0.30, rt60=4.0, fade_out=5.0)


def build():
    S = Score('Mausoleum', 42, seed=98, rubato=0.010, end_rit=0.14)
    G = Scale('G2', 'minor')
    org = S.part('organ low', 19, pan=60, base_vel=52, sigma=0.012)
    org2 = S.part('organ high', 19, pan=60, base_vel=44, sigma=0.012)
    strs = S.part('tremolo strings', 44, pan=70, base_vel=30, sigma=0.05)
    chr_ = S.part('choir', 52, pan=64, base_vel=34, sigma=0.04)
    toll = S.part('funeral bell (-50c)', 14, pan=64, base_vel=60, sigma=0.01)
    toll.bend(0, -50)
    tombs = {}
    for hz, nm, pitch, cents, pan in [(528, 'C', midi('C4'), 16, 30), (639, 'D#', midi('D#4'), 46, 50), (741, 'F#', midi('F#4'), 2, 78), (852, 'G#', midi('G#4'), 44, 98)]:
        p = S.part('tomb %d' % hz, 14, pan=pan, base_vel=46, sigma=0.01)
        p.bend(0, cents)
        tombs[hz] = (p, pitch)
    cb = S.part('bass', 43, pan=56, base_vel=44, sigma=0.03)
    tot = 22
    # descending parallel fifths: G-D, F-C, Eb-Bb, D-A, F-C, G-D (two bars each, two rounds then a long close)
    roots = [0, -1, -2, -3, -1, 0]
    tt = 0
    for rnd in range(2):
        for k, d in enumerate(roots):
            b = rnd * 12 + k * 2
            if b >= tot - 2: break
            t = b * 4
            r = G(d)
            for oc, o, a in [(0, org, 0), (12, org, 0), (24, org2, 0)]:
                o.n(r + oc, t, 8, 50 - oc // 4, leg=0.6); o.n(r + oc + 7, t + 0.02, 8, 50 - oc // 4, leg=0.6)
            cb.n(r - 12, t, 8, 46, leg=0.6)
            stagger(strs, [r + 12, r + 19, r + 24], t, 8, gap=0.1, v=26, leg=0.8)
            strs.swell(t, t + 8, 10, 60)
    # organ cantus above: a slow melody in the high register, hesitating
    cantus = '4:3 3:1  2:2 1:2  2:1 3:1 4:2  7:4'
    org2.line(24, transpose_line(cantus, 0), Scale('G4', 'minor'), shape=3, vel=40)
    org2.line(56, transpose_line(cantus, -1), Scale('G4', 'minor'), shape=3, vel=40)
    chr_.swell(24, 80, 20, 90)
    for k, d in enumerate([0, -1, -2, -3]):
        stagger(chr_, [G(d) + 24, G(d) + 28 if d != -3 else G(d) + 27, G(d) + 31], 24 + k * 8, 8, gap=0.15, v=34, leg=0.8)
    # the funeral bell: low G, a quarter-tone flat, every four bars
    for b in range(2, tot, 4):
        toll.n(midi('G3'), b * 4, 8, 58, leg=0.0)
    # the tombs, once each, in the order the bibles list them; the last two answer each other
    for t, hz in [(18, 528), (34, 639), (50, 741), (66, 852), (80, 528), (82, 639), (84, 741), (86, 852)]:
        p, pitch = tombs[hz]
        p.n(pitch, t, 8, 44 if t < 80 else 38, leg=0.0)
    cb.n(G(-14), 80, 8, 40, leg=0.6); org.n(G(0), 80, 8, 40, leg=0.6); org.n(G(4), 80.02, 8, 38, leg=0.6)
    org.ramp(80, 88, 100, 10); org2.ramp(80, 88, 100, 10); cb.ramp(80, 88, 100, 10)
    return S, 92
