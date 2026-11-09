"""THE MAIN THEME — one melody (F, 174 Hz) across the six stages of Book One, ~87 s each at 66 bpm (24 bars).
The tune is eight bars: the old 'name' motif F-Ab-C-Bb-G-F opens it and it climbs to a G before it falls home.
  0 alone       one cello, a harp that barely speaks, the whole piece a quarter-tone and a bit flat
  1 harmonised  a voice a third below answers; oboe, violas, harp; the tuning is mending
  2 shadowed    low: bassoon, horn, cello; a minor second (Gb) held beneath the F; drum roll
  3 broken      grief: a piano plays what it can remember, notes dropped, bent, cut short
  4 reforming   the strings re-form around the fragments until the tune is whole again
  5 restored    the full ensemble, choir and bells; the second statement turns to F major; the 174 root restored
The tuning offsets (cents flat: 24, 16, 12, 18, 6, 0) echo the procedural layer, where the Octave 'sounds wrong by a
quarter-tone' and the tuning heals with the story."""
from lib import *

TUNE = ['0:1.5 2:.5 4:2', '3:2 1:1 0:1', '2:1.5 4:.5 6:2', '5:2 4:1 3:1', '4:1.5 6:.5 8:2', '7:1 6:1 5:1 3:1', '4:2 3:1 1:1', '0:4']
TUNE_TXT = '  '.join(TUNE)
DETUNE = [-24, -16, -12, -18, -6, 0]
BAR = 4
TOT = 24


def chords(scale3):
    """The eight chords under the tune (pitch lists): i, VI, III, iv, v, VI, V7, i."""
    c = lambda d: scale3.chord(d, 3)
    return [c(0), c(5), c(2), c(3), c(4), c(5), [scale3(4), scale3(4) + 4, scale3(4) + 7, scale3(4) + 10], c(0)]


def base(stage):
    S = Score('Main theme %d' % stage, 66, seed=174 + stage, rubato=0.015, end_rit=0.10)
    return S


def piece0():
    S = base(0); F4 = Scale('F4', 'minor'); F3 = Scale('F3', 'minor')
    vc = S.part('solo cello', 42, pan=50, base_vel=62, sigma=0.03)
    hp = S.part('harp', 46, pan=40, base_vel=44, sigma=0.015)
    fl = S.part('flute (a whisper)', 73, pan=76, base_vel=40, sigma=0.03)
    ch = chords(F3)
    for k in range(3):
        hp.n(F3(0) - 12 + 7 * (k % 2), 2 + k * 4, 6, 40, leg=0.5)
    vc.line(8, TUNE_TXT, F3, shape=7, vel=62, lift=0)
    vc.swell(8, 40, 70, 110, peak=0.6)
    for i, c in enumerate(ch):
        if i % 2 == 0: hp.n(c[0] - 12, 8 + i * 4, 6, 40, leg=0.5)
        if i in (3, 7): hp.n(c[2], 8 + i * 4 + 2, 6, 34, leg=0.5)
    for k, p in enumerate([F3(0), F3(4), F3(2) + 12, F3(0) + 12]):
        hp.n(p, 41 + k * 1.6, 6, 38 - 2 * k, leg=0.5)
    vc.line(48, TUNE_TXT, F3, shape=7, vel=60, lift=0)
    vc.swell(48, 80, 70, 105, peak=0.6)
    for i, c in enumerate(ch):
        if i % 2 == 0: hp.n(c[0] - 12, 48 + i * 4, 6, 40, leg=0.5)
    fl.line(72, '4:2 3:1 1:1  0:4', F4, vel=40, shape=3)
    vc.n(F3(0) - 12, 80, 14, 50, leg=0.5); vc.ramp(80, 94, 90, 8)
    detune_all(S, DETUNE[0])
    return S, TOT * BAR


def piece1():
    S = base(1); F4 = Scale('F4', 'minor'); F3 = Scale('F3', 'minor')
    ob = S.part('oboe', 68, pan=64, base_vel=62, sigma=0.02)
    vc = S.part('cello (a third below)', 42, pan=36, base_vel=58, sigma=0.02)
    vla = S.part('violas', 41, pan=84, base_vel=50, sigma=0.03)
    vln = S.part('violins', 40, pan=72, base_vel=52, sigma=0.03)
    hp = S.part('harp', 46, pan=40, base_vel=54, sigma=0.012)
    stg = S.part('strings', 49, pan=64, base_vel=44, sigma=0.04)
    cb = S.part('bass', 43, pan=58, base_vel=54, sigma=0.03)
    tim = S.part('timpani', 47, pan=56, base_vel=44, sigma=0.01)
    ch = chords(F3)
    vo = voiced(ch, 53, 72)
    ob.line(8, TUNE_TXT, F4, shape=7, vel=64)
    vc.line(8, transpose_line(TUNE_TXT, -2), F3, shape=6, vel=58, lift=0)
    for rep in range(2):
        for i, c in enumerate(ch):
            t = 8 + rep * 40 + i * 4
            arp(hp, c, t, [0, 1, 2, 1, 2, 1, 0, 1], step=0.5, v=50, up=12)
            stagger(stg, vo[i], t, 4, gap=0.08, v=42 + 4 * rep, leg=0.4)
            cb.n(c[0] - 12, t, 4, 52, leg=0.3)
    for i, c in enumerate(ch[:2]):
        arp(hp, ch[0] if i == 0 else ch[4], 40 + i * 4, [0, 1, 2, 1, 2, 1, 0, 1], step=0.5, v=48, up=12)
        stagger(stg, vo[0] if i == 0 else vo[4], 40 + i * 4, 4, gap=0.08, v=40, leg=0.4)
    hp.n(F3(0), 0, 4, 44); hp.n(F3(4), 2, 4, 40); hp.n(F3(2) + 12, 4, 4, 38); hp.n(F3(0) + 12, 6, 4, 36)
    # second statement: violins take the tune, oboe a sixth under, viola the third
    vln.line(48, TUNE_TXT, F4, shape=7, vel=60, lift=0)
    ob.line(48, transpose_line(TUNE_TXT, -2), F4, shape=5, vel=56)
    vla.line(48, transpose_line(TUNE_TXT, -4), F3, shape=5, vel=50, lift=12 if False else 0)
    vc.line(48, transpose_line(TUNE_TXT, -7), F3, shape=5, vel=54)
    tim.n(F3(0), 48, 1, 44, leg=0.0); tim.n(F3(0), 80, 1, 40, leg=0.0)
    stg.swell(48, 80, 50, 110, peak=0.6); stg.ramp(80, 96, 100, 10)
    ob.line(80, '4:2 3:1 1:1  0:4', F4, vel=54, shape=3)
    cb.n(F3(0) - 12, 80, 14, 46, leg=0.5); cb.ramp(80, 94, 90, 10)
    detune_all(S, DETUNE[1])
    return S, TOT * BAR


def piece2():
    S = base(2); F3 = Scale('F3', 'minor'); F2 = Scale('F2', 'minor')
    bsn = S.part('bassoon', 70, pan=48, base_vel=62, sigma=0.02)
    hn = S.part('horns', 60, pan=78, base_vel=54, sigma=0.03)
    vc = S.part('cellos', 42, pan=34, base_vel=60, sigma=0.02)
    cb = S.part('basses', 43, pan=58, base_vel=56, sigma=0.03)
    shadow = S.part('shadow (Gb)', 44, pan=84, base_vel=36, sigma=0.03)
    tim = S.part('timpani', 47, pan=56, base_vel=52, sigma=0.01)
    stg = S.part('violas', 41, pan=70, base_vel=40, sigma=0.04)
    ch = chords(F2)
    vo = voiced(ch, 40, 62)
    shadow.n(F2(1), 0, 94, 36, leg=0.5); shadow.n(F2(1) + 12, 0.1, 94, 30, leg=0.5); shadow.swell(0, 94, 20, 90, peak=0.6)
    cb.n(F2(0) - 12, 0, 94, 50, leg=0.5); cb.swell(0, 94, 40, 100, peak=0.6)
    bsn.line(8, TUNE_TXT, F3, shape=6, vel=62)
    hn.line(48, TUNE_TXT, F3, shape=6, vel=58)
    vc.line(48, TUNE_TXT, F2, shape=6, vel=62, lift=12)
    for rep in range(2):
        for i, c in enumerate(ch):
            t = 8 + rep * 40 + i * 4
            stagger(vc, vo[i][:2], t, 4, gap=0.12, v=44 + 6 * rep, leg=0.5)
            stagger(stg, vo[i][1:], t + 0.1, 4, gap=0.12, v=36 + 6 * rep, leg=0.5)
        for k in range(8):
            tim.n(F2(0) + 12, 8 + rep * 40 + 28 + k * 0.5, 0.5, 40 + k * 5, leg=0.0)
        tim.n(F2(0) + 12, 8 + rep * 40 + 32, 1.0, 80, leg=0.0)
    bsn.line(80, '4:2 3:1 1:1  0:4', F3, vel=54, shape=3)
    detune_all(S, DETUNE[2])
    return S, TOT * BAR


def piece3():
    S = base(3); F4 = Scale('F4', 'minor'); F3 = Scale('F3', 'minor')
    rng = random.Random(33)
    pno = S.part('piano (fragments)', 0, pan=56, base_vel=50, sigma=0.03)
    pb = S.part('piano (bent)', 0, pan=60, base_vel=44, sigma=0.03)
    vln = S.part('violin (one voice)', 40, pan=74, base_vel=50, sigma=0.04)
    stg = S.part('strings (ghost)', 44, pan=64, base_vel=26, sigma=0.05)
    hp = S.part('harp', 46, pan=38, base_vel=40, sigma=0.02)
    oo = S.part('voices', 53, pan=84, base_vel=24, sigma=0.05)
    cb = S.part('bass', 43, pan=58, base_vel=44, sigma=0.04)
    ch = chords(F3)
    # the tune as a list of (degree, start, dur) so notes can be lost, bent, shortened
    def notes_of(txt, t0):
        out = []; at = t0
        for tk in txt.split():
            m = TOKEN.match(tk); d = float(m.group(3) or 1)
            if m.group(1) != 'r': out.append((int(m.group(1)), at, d))
            at += d
        return out
    for rep, t0 in enumerate((8, 52)):
        for deg_, at, d in notes_of(TUNE_TXT, t0):
            r = rng.random()
            if r < 0.34: continue                       # forgotten
            note = F4(deg_)
            if r < 0.55:                                # remembered wrongly: a semitone or a quarter-tone off
                pb.bend(at - 0.02, rng.choice([-100, 100, -45, 60]), rng=2.0)
                pb.n(note, at + 0.3, min(d, 1.5) * 1.6, 46, leg=0.5)
                pb.bend(at + 3.0, 0)
            else:
                pno.n(note, at + rng.random() * 0.4, d * (1.8 if rng.random() < 0.5 else 0.7), 48, leg=0.6)
    pno.pedal(8, 40, repedal=[16, 24, 32]); pno.pedal(52, 84, repedal=[60, 68, 76])
    for rep, t0 in enumerate((8, 52)):
        for i, c in enumerate(ch):
            if rng.random() < 0.55:
                hp.n(c[0] - 12, t0 + i * 4, 5, 38, leg=0.5)
            if rng.random() < 0.4:
                hp.n(c[2], t0 + i * 4 + 2, 5, 32, leg=0.5)
    # strings: a ghost chord that swells and fades again, never settling
    for k, t in enumerate((0, 20, 44, 64, 84)):
        stagger(stg, [F3(0) if k % 2 == 0 else F3(5), F3(2) if k % 2 == 0 else F3(7), F3(4) + 12], t, 14, gap=0.2, v=26, leg=0.8)
        stg.swell(t, t + 14, 5, 55)
    vln.line(60, '4:2 3:1 1:1  0:4', F4, shape=4, vel=50, lift=12)
    oo.n(F3(0) + 12, 76, 12, 24, leg=0.8); oo.swell(76, 88, 5, 50)
    cb.n(F3(0) - 12, 0, 94, 40, leg=0.5); cb.swell(0, 94, 20, 70)
    detune_all(S, DETUNE[3])
    return S, TOT * BAR


def piece4():
    S = base(4); F4 = Scale('F4', 'minor'); F3 = Scale('F3', 'minor')
    rng = random.Random(44)
    pno = S.part('piano', 0, pan=56, base_vel=48, sigma=0.02)
    vln = S.part('violins', 40, pan=74, base_vel=56, sigma=0.03)
    vla = S.part('violas', 41, pan=86, base_vel=48, sigma=0.03)
    vc = S.part('cellos', 42, pan=34, base_vel=56, sigma=0.03)
    stg = S.part('strings', 49, pan=64, base_vel=44, sigma=0.04)
    hp = S.part('harp', 46, pan=40, base_vel=54, sigma=0.012)
    hn = S.part('horn', 60, pan=80, base_vel=50, sigma=0.03)
    root = S.part('the 174 root', 42, pan=50, base_vel=50, sigma=0.03)
    tim = S.part('timpani', 47, pan=56, base_vel=50, sigma=0.01)
    ch = chords(F3); vo = voiced(ch, 53, 72)
    # first statement: the fragments return in the piano; a held F grows under them
    full = [(int(TOKEN.match(tk).group(1)), tk) for tk in TUNE_TXT.split() if TOKEN.match(tk).group(1) != 'r']
    pno.line(8, TUNE_TXT, F4, shape=5, vel=48)
    pno.pedal(8, 40, repedal=[12, 16, 20, 24, 28, 32, 36])
    root.n(F3(0), 0, 94, 44, leg=0.5); root.swell(0, 94, 30, 110, peak=0.6)
    hp.n(F3(0), 1, 6, 40); hp.n(F3(4), 3.5, 6, 36)
    for i, c in enumerate(ch):
        t = 8 + i * 4
        if i >= 2: arp(hp, c, t, [0, 1, 2, 1], step=1.0, v=48, up=12)
        if i >= 4: stagger(stg, vo[i], t, 4, gap=0.1, v=36 + 3 * i, leg=0.5)
    vln.line(24, '4:1.5 6:.5 8:2  7:1 6:1 5:1 3:1', F4, shape=5, vel=50)       # bars 5-6 come back first, in the strings
    # second statement: whole, in tune, the strings carry it; horn joins at the climb
    vln.line(48, TUNE_TXT, F4, shape=7, vel=62)
    vla.line(48, transpose_line(TUNE_TXT, -2), F4, shape=5, vel=52, lift=0)
    vc.line(48, transpose_line(TUNE_TXT, -7), F3, shape=5, vel=56)
    hn.line(64, '4:2 3:1 1:1  0:4', F3, vel=52, shape=4)
    for i, c in enumerate(ch):
        t = 48 + i * 4
        arp(hp, c, t, [0, 1, 2, 3, 2, 1, 2, 1], step=0.5, v=56, up=12)
        stagger(stg, vo[i], t, 4, gap=0.08, v=50, leg=0.5)
        if i % 2 == 0: tim.n(F3(0), t, 0.8, 52 + 4 * i, leg=0.0)
    stg.swell(48, 80, 60, 115, peak=0.7)
    vln.line(80, '4:2 3:1 1:1  0:4', F4, vel=54, shape=3)
    stagger(stg, [F3(0), F3(4), F3(0) + 12], 80, 14, gap=0.1, v=44, leg=0.5); stg.ramp(80, 94, 100, 10)
    detune_all(S, DETUNE[4])
    return S, TOT * BAR


def piece5():
    S = base(5); F4 = Scale('F4', 'minor'); F3 = Scale('F3', 'minor'); FM4 = Scale('F4', 'major'); FM3 = Scale('F3', 'major')
    vln = S.part('violins', 40, pan=74, base_vel=62, sigma=0.03)
    vla = S.part('violas', 41, pan=86, base_vel=54, sigma=0.03)
    vc = S.part('cellos', 42, pan=34, base_vel=60, sigma=0.03)
    cb = S.part('basses', 43, pan=58, base_vel=56, sigma=0.03)
    stg = S.part('strings', 49, pan=64, base_vel=50, sigma=0.04)
    hn = S.part('horns', 60, pan=80, base_vel=56, sigma=0.03)
    ob = S.part('oboe', 68, pan=60, base_vel=58, sigma=0.02)
    chr_ = S.part('choir', 52, pan=64, base_vel=48, sigma=0.04)
    hp = S.part('harp', 46, pan=40, base_vel=56, sigma=0.012)
    bell = S.part('bells', 14, pan=64, base_vel=56, sigma=0.01)
    glk = S.part('glass', 9, pan=92, base_vel=48, sigma=0.01)
    tim = S.part('timpani', 47, pan=56, base_vel=58, sigma=0.01)
    root = S.part('the 174 root', 42, pan=50, base_vel=60, sigma=0.03)
    # opening: the root and a harp figure before the tune
    root.n(F3(0), 0, 8, 50, leg=0.5); root.swell(0, 8, 30, 90)
    arp(hp, F3.chord(0, 3), 0, [0, 1, 2, 1, 2, 1, 0, 1], step=1.0, v=46, up=12)
    # statement 1 (bars 2-9), minor, strings and horns
    chm = chords(F3); vom = voiced(chm, 53, 72)
    vln.line(8, TUNE_TXT, F4, shape=7, vel=62); vla.line(8, transpose_line(TUNE_TXT, -2), F4, shape=5, vel=54)
    vc.line(8, transpose_line(TUNE_TXT, -7), F3, shape=5, vel=58); hn.line(24, '4:1.5 6:.5 8:2  7:1 6:1 5:1 3:1  4:2 3:1 1:1  0:4', F3, vel=56, shape=5)
    for i, c in enumerate(chm):
        t = 8 + i * 4
        arp(hp, c, t, [0, 1, 2, 3, 2, 1, 2, 1], step=0.5, v=56, up=12)
        stagger(stg, vom[i], t, 4, gap=0.08, v=48, leg=0.5)
        cb.n(c[0] - 12, t, 4, 58, leg=0.3)
        if i % 2 == 0: tim.n(F3(0), t, 0.8, 56, leg=0.0)
    stg.swell(8, 40, 60, 110)
    # statement 2 (bars 10-17), the turn to F major: choir joins, bells, the full orchestra
    chM = chords(FM3); voM = voiced(chM, 53, 74)
    vln.line(40, TUNE_TXT, FM4, shape=8, vel=70); ob.line(40, TUNE_TXT, FM4, shape=6, vel=60)
    vla.line(40, transpose_line(TUNE_TXT, -2), FM4, shape=5, vel=60); vc.line(40, transpose_line(TUNE_TXT, -7), FM3, shape=6, vel=62)
    hn.line(40, transpose_line(TUNE_TXT, -4), FM3, shape=5, vel=58)
    for i, c in enumerate(chM):
        t = 40 + i * 4
        arp(hp, c, t, [0, 1, 2, 3, 2, 3, 4, 3], step=0.5, v=60, up=12)
        stagger(stg, voM[i], t, 4, gap=0.08, v=58, leg=0.5)
        stagger(chr_, voM[i][:3], t, 4, gap=0.12, v=54, leg=0.5)
        cb.n(c[0] - 12, t, 4, 62, leg=0.3)
        if i % 2 == 0: bell.n(c[0] + 12, t, 5, 50, leg=0.0)
        glk.n(c[2] + 24, t + 2, 3, 40, leg=0.0)
        tim.n(F3(0), t, 0.8, 62, leg=0.0)
    stg.swell(40, 72, 70, 120, peak=0.7); chr_.swell(40, 72, 50, 115, peak=0.8)
    # coda (bars 18-24): the tune's last phrase, then the 174 root on its own — F major
    vln.line(72, '4:2 3:1 1:1  0:4', FM4, vel=62, shape=4); ob.line(72, '4:2 3:1 1:1  0:4', FM4, vel=56, shape=4)
    for p, pitch in [(stg, FM3(0)), (stg, FM3(2)), (stg, FM3(4)), (stg, FM4(0)), (chr_, FM3(4)), (chr_, FM4(2)), (chr_, FM4(0) + 12)]:
        p.n(pitch, 80, 14, 52, leg=0.5)
    stg.ramp(80, 94, 100, 10); chr_.ramp(80, 94, 100, 10)
    root.n(F3(0), 72, 22, 60, leg=0.5); root.n(F3(0) - 12, 80, 14, 56, leg=0.5); root.ramp(80, 94, 100, 10)
    bell.n(F3(0), 80, 14, 62, leg=0.0)
    cb.n(F3(0) - 12, 80, 14, 58, leg=0.5)
    detune_all(S, DETUNE[5])
    return S, TOT * BAR


BUILDERS = [piece0, piece1, piece2, piece3, piece4, piece5]
PIECES = [(dict(file='maintheme_%d' % i, kbps=96, loop=False, wet=0.26, rt60=3.2, fade_out=4.0), b) for i, b in enumerate(BUILDERS)]
