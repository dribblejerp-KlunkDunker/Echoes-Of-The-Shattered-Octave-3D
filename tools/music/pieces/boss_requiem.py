"""THE REQUIEM — a funeral office in many voices. B-flat minor, 140 bpm in six (3+3), 36 bars, loops.
A: chant in unison over timpani and low strings; B: the same chant in parallel fifths (organum); C: the full office
harmonised, brass and organ; D: it strips back to the ostinato so the loop returns to A. Bell on the 174 Hz F."""
from lib import *

META = dict(file='boss_requiem', kbps=96, loop=True, wet=0.24, rt60=3.0, gain_db=0.0)
BAR = 6


def build():
    S = Score('Requiem', 140, seed=6, rubato=0.004)
    B3 = Scale('Bb3', 'harm'); B2 = Scale('Bb2', 'harm'); B1 = Scale('Bb1', 'harm')
    tim = S.part('timpani', 47, pan=56, base_vel=74, sigma=0.008)
    cel = S.part('cellos', 42, pan=36, base_vel=62, sigma=0.01)
    cbs = S.part('basses', 43, pan=60, base_vel=62, sigma=0.01)
    ten = S.part('tenors', 52, pan=46, base_vel=62, sigma=0.02)
    alt = S.part('altos', 52, pan=82, base_vel=58, sigma=0.02)
    sop = S.part('sopranos', 52, pan=70, base_vel=56, sigma=0.02)
    bas = S.part('basses (voices)', 53, pan=54, base_vel=60, sigma=0.02)
    org = S.part('organ', 19, pan=60, base_vel=54, sigma=0.01)
    brs = S.part('trombones', 57, pan=74, base_vel=64, sigma=0.015)
    hn = S.part('horns', 60, pan=40, base_vel=60, sigma=0.015)
    bell = S.part('bell (174)', 14, pan=64, base_vel=70, sigma=0.005)
    tot = 36
    # the office: chant, two phrases of two bars each (12 beats), then its response
    P1 = '0:2 1:1 2:3  1:2 0:1 -1:3'
    P2 = '0:2 2:1 4:3  3:2 2:1 1:3'
    P3 = '4:2 3:1 2:3  1:2 0:1 -1:3'
    P4 = '2:2 1:1 0:3  -1:2 -2:1 0:3'
    chant = [P1, P2, P3, P4]
    for b in range(tot):
        t = b * BAR
        # drums: 1 and 4 of the six; a second soft stroke before the bar
        tim.n(B2(0) - 12 + 12, t, 1.0, 84 if b % 2 == 0 else 72, leg=0.0)
        tim.n(B2(0) - 12 + 12, t + 3, 1.0, 70, leg=0.0)
        if b % 4 == 3: tim.n(B2(4) - 12, t + 5, 0.5, 60, leg=0.0)
        # low strings: driving eights, rooted on the chord of the bar
        chord_root = [0, 0, 5, 3][(b // 2) % 4] if 16 <= b < 28 else 0
        r = B2(chord_root) if chord_root in (0, 3) else B2(5)
        for k in range(12):
            cel.n(r - (12 if k % 6 == 0 else 0), t + k * 0.5, 0.5, 60 + (10 if k % 3 == 0 else 0), leg=0.0)
        cbs.n(r - 12, t, 3, 66, leg=0.1); cbs.n(r - 12, t + 3, 3, 62, leg=0.1)
        # the bell on F (174 Hz) each bar, softer on the second half
        if b % 2 == 0: bell.n(midi('F3'), t, 5, 66, leg=0.0)
    # A (bars 0-7): unison chant, tenors and basses
    for k, ph in enumerate(chant):
        at = k * 12
        ten.line(at, ph, B3, shape=6, vel=64)
        bas.line(at, ph, B2, shape=5, vel=60)
    # B (bars 8-15): organum — the chant in parallel fifths and octaves; organ doubles
    for k, ph in enumerate(chant):
        at = 48 + k * 12
        ten.line(at, ph, B3, shape=6, vel=68)
        alt.line(at, ph, B3, shape=5, vel=62, lift=7)
        sop.line(at, ph, B3, shape=5, vel=62, lift=12)
        bas.line(at, ph, B2, shape=5, vel=64)
        org.line(at, ph, B3, shape=2, vel=50, lift=-12)
    # C (bars 16-27): full chorale. The chant rides on top of the chords; brass and horns join on the downbeats.
    chords = [[0, 2, 4], [5, 7, 9], [3, 5, 7], [4, 6, 8]]      # i, VI, iv, V (harmonic minor, degrees stacked in thirds)
    cvo = voiced([[B3(d) for d in c] for c in chords], 53, 72)
    for k in range(6):
        c = cvo[k % 4]; at = 96 + k * 12
        for half in range(2):
            tt = at + half * 6
            stagger(ten, c[:1], tt, 5.5, gap=0.05, v=70, leg=0.3); stagger(alt, c[1:2], tt, 5.5, gap=0.05, v=66, leg=0.3)
            stagger(sop, [c[2] + 12 if c[2] < 66 else c[2]], tt, 5.5, gap=0.05, v=68, leg=0.3)
            stagger(bas, [c[0] - 12], tt, 5.5, gap=0.05, v=66, leg=0.3)
            org.chord([x - 12 for x in c], tt, 5.5, 54, leg=0.3)
            brs.chord([c[0] - 12, c[1] - 12, c[2] - 12], tt, 2.5, 74, leg=0.1)
            hn.chord([c[1], c[2]], tt + 3, 2.8, 66, leg=0.1)
    # D (bars 28-35): back to the ostinato, a lone tenor on the first phrase, fading voices
    ten.line(168, P1, B3, shape=5, vel=56); bas.line(168, P1, B2, shape=5, vel=54)
    ten.line(180, P2, B3, shape=5, vel=60); bas.line(180, P2, B2, shape=5, vel=56)
    for p in (ten, bas): p.ramp(168, 192, 100, 70)
    ten.ramp(96, 168, 70, 118); alt.ramp(96, 168, 70, 118); sop.ramp(96, 168, 70, 118); bas.ramp(96, 168, 70, 118)
    for p in (ten, alt, sop, bas, org): p.ramp(168, 192, 110, 70, step=0.5)
    return S, tot * BAR
