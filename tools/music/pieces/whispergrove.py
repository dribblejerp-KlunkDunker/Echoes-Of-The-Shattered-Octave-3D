"""WHISPER-GROVE — Memory, 741 Hz (F#5; the root here is F#4). Drowned memory: glass bells let fall one at a time, a
choir that can only recite, slow, a litany of names on one pitch with small inflections. F# minor, 50 bpm.
Voice oohs, harp, celesta/glockenspiel (Light-glass), cello, strings."""
from lib import *

META = dict(file='whispergrove', kbps=112, loop=False, wet=0.30, rt60=3.6, fade_out=4.0)


def build():
    S = Score('Whisper-Grove', 50, seed=741, rubato=0.012, end_rit=0.12)
    M = Scale('F#4', 'minor')
    ch1 = S.part('choir 1', 53, pan=44, base_vel=48, sigma=0.03)
    ch2 = S.part('choir 2', 53, pan=84, base_vel=46, sigma=0.03)
    ch3 = S.part('choir low', 52, pan=64, base_vel=40, sigma=0.035)
    harp = S.part('harp', 46, pan=40, base_vel=54, sigma=0.012)
    cel = S.part('celesta', 8, pan=88, base_vel=50, sigma=0.01)
    glk = S.part('glass', 9, pan=70, base_vel=44, sigma=0.01)
    vc = S.part('cello', 42, pan=36, base_vel=56, sigma=0.02)
    strs = S.part('strings', 49, pan=64, base_vel=40, sigma=0.04)
    cb = S.part('bass', 43, pan=60, base_vel=44, sigma=0.03)

    # chords per bar, F# minor: i, VI, III, VII (the slow wheel), 2 bars each
    wheel = [0, 5, 2, 6]
    ch = lambda d: Scale('F#3', 'minor').chord(d, 3)
    voic = voiced([ch(d) for d in wheel], 52, 72)
    def bar_voicing(b):
        return voic[(b // 2) % 4]
    # 1-4: single glass notes falling, one at a time, as memories are lost; F#5 (741) first
    fall = ['F#5', 'E5', 'C#5', 'B4', 'A4', 'F#4']
    for k, nm in enumerate(fall[:4]):
        glk.n(midi(nm), 1 + k * 4.5, 4, 46 - 3 * k, leg=0.0)
    cel.n(midi('F#6'), 0, 6, 34, leg=0.0)
    strs.n(M(-7), 0, 16, 30, leg=0.5); strs.n(M(-4), 0.07, 16, 30, leg=0.5); strs.swell(0, 16, 20, 70)
    cb.n(M(-14), 4, 12, 40, leg=0.5); cb.swell(4, 16, 30, 70)
    # 5-12: the litany. A recitative on C#5 with small inflections: the names (syllables as repeated notes)
    litany = ['4:.5 4:.5 4:1 3:1 4:1', '4:.5 4:.5 4:.5 4:.5 5:1 4:1', '4:1 3:.5 3:.5 2:1 3:1', '4:.5 4:.5 4:1 3:1 r:1']
    t = 16
    for k in range(8):
        b = 4 + k
        ch1.line(t + k * 4, litany[k % 4], M, shape=4, leg=0.0)
        if k >= 4:
            ch2.line(t + k * 4 + 2, litany[(k + 1) % 4], Scale('F#4', 'minor'), shape=3, leg=0.0, lift=-5 if False else 0)
        for p in bar_voicing(b)[:2]:
            ch3.n(p - 12, t + k * 4, 4, 38, leg=0.5)
        arp(harp, bar_voicing(b), t + k * 4, [0, 2, 1, None, 2, 1, None, None], step=0.5, v=48, up=12)
    ch1.swell(16, 48, 60, 100); ch3.swell(16, 48, 50, 100)
    for k in range(8):
        cb.n(M(-14 + [0, 0, 0, 0, 5, 5, 2, 2][k] * 0), 16 + k * 4, 4, 42, leg=0.5)
    # 13-20: the grove's own lament, cello over a choir swelling to full: the melody the names are sung against
    lament = '4:2 3:1 2:1  1:3 r:1  2:2 1:1 0:1  -1:4'
    lam2 = '5:2 4:1 3:1  2:3 r:1  3:2 2:1 1:1  0:4'
    vc.line(48, lament, M, shape=6, vel=60, lift=-12); vc.line(64, lam2, M, shape=7, vel=62, lift=-12)
    for k in range(8):
        v = bar_voicing(12 + k)
        stagger(ch1, [p for p in v], 48 + k * 4, 4, gap=0.1, v=56 + 2 * k, leg=0.5)
        stagger(ch2, [p + 12 if p < 60 else p for p in v[:2]], 48 + k * 4 + 0.05, 4, gap=0.1, v=44 + 2 * k, leg=0.5)
        stagger(strs, v, 48 + k * 4, 4, gap=0.12, v=40 + 2 * k, leg=0.5)
        arp(harp, v, 48 + k * 4, [0, 1, 2, 1, 2, 1, 0, None], step=0.5, v=52, up=12)
        if k % 2 == 0:
            cel.n(M(7 + [0, 2, 1, 4][k // 2]), 48 + k * 4 + 1.5, 4, 42, leg=0.0)
    ch1.swell(48, 80, 70, 118, peak=0.7); strs.swell(48, 80, 50, 100, peak=0.7)
    # 21-26: the names thin out; glass remains; ends on F#5 (the 741 Hz note) alone
    for k in range(4):
        v = bar_voicing(20 + k)
        stagger(ch1, v[:3], 80 + k * 4, 4, gap=0.1, v=50 - 6 * k, leg=0.5)
        ch1.line(80 + k * 4, '4:.5 4:.5 4:1 r:2' if k < 3 else '4:2 r:2', M, shape=2, vel=44 - 5 * k, leg=0.0)
    ch1.ramp(80, 96, 100, 30); strs.ramp(80, 100, 90, 10)
    harp.n(M(0), 80, 6, 40); harp.n(M(7), 84, 6, 34); harp.n(M(4), 88, 6, 30)
    glk.n(midi('F#5'), 92, 8, 40, leg=0.0); cel.n(midi('F#5'), 96, 8, 30, leg=0.0); cel.n(midi('F#6'), 100, 4, 24, leg=0.0)
    return S, 104
