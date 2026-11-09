"""THE OPENING — the piece under the opening cinematic (js/cinematic24.js), ~97 s at 60 bpm so a beat is a second.
It is cut to the sequence's shots and the narrator's lines (voices/script.json, narrator.open.*), not to bars:
  0.0  prelude, black   a low F and one bell for the catechism ("What is holiness?" / "One note, held without end.")
 13.0  the combe        harp and a solo cello: the tune's first two phrases under "It is autumn..."
 23.0  the hedge        the strings take phrases three to five, climbing to the G, and the G is left ringing in the dark
 37.0  the hounds       tremolo over the Gb shadow and a timpani roll; at the Hush (42.9) everything stops but one glass note
 46.5  the column       a processional: bass drum, trombones, horns on the climb, the choir; at "One note. One law.
                        One hand." (60.9) the Pure Note, C in octaves, and nothing else, cut dead at 64.4
 65.5  the town         warm: oboe on the last two phrases, harp, no bell (nobody has rung one)
 77.5  the title card   the full ensemble, bells and timpani on the name motif F-Ab-C-Bb-G-F
 83.5  the North Gate   a solo cello and the harp alone under Harrow, falling to the game's own quiet
The tune is the main theme's (maintheme.py), in tune: this is the first thing heard, before the Octave's wrongness
is a fact of the world. No rubato: the cue points must land."""
from lib import *
from maintheme import TUNE, chords

CUES = dict(prelude=0.0, combe=13.0, hedge=23.0, hounds=37.0, hush=42.9, column=46.5, onenote=60.9, town=65.5, card=77.5, gate=83.5, end=97.3)
BEATS = 98
META = dict(file='opening', kbps=112, loop=False, wet=0.28, rt60=3.4, fade_out=3.0)


def build():
    S = Score('The opening', 60, seed=419, rubato=0.0, end_rit=0.0)
    F2, F3, F4 = Scale('F2', 'minor'), Scale('F3', 'minor'), Scale('F4', 'minor')
    cb = S.part('basses', 43, pan=58, base_vel=56, sigma=0.03)
    vc = S.part('cellos', 42, pan=36, base_vel=58, sigma=0.03)
    solo = S.part('solo cello', 42, pan=50, base_vel=60, sigma=0.03)
    vla = S.part('violas', 41, pan=84, base_vel=52, sigma=0.03)
    vln = S.part('violins', 40, pan=74, base_vel=60, sigma=0.03)
    stg = S.part('strings', 49, pan=64, base_vel=48, sigma=0.04)
    trem = S.part('tremolo strings', 44, pan=70, base_vel=40, sigma=0.04)
    hn = S.part('horns', 60, pan=80, base_vel=56, sigma=0.03)
    tbn = S.part('trombones', 57, pan=44, base_vel=54, sigma=0.03)
    ob = S.part('oboe', 68, pan=60, base_vel=54, sigma=0.02)
    chr_ = S.part('choir', 52, pan=64, base_vel=46, sigma=0.04)
    hp = S.part('harp', 46, pan=40, base_vel=50, sigma=0.012)
    bell = S.part('bells', 14, pan=64, base_vel=58, sigma=0.01)
    glk = S.part('glass', 9, pan=92, base_vel=44, sigma=0.01)
    tim = S.part('timpani', 47, pan=56, base_vel=56, sigma=0.01)
    dr = S.part('drums', 0, pan=60, base_vel=60, drums=True)
    ch = chords(F3)
    vo = voiced(ch, 53, 72)      # mid strings / choir
    vlo = voiced(ch, 41, 60)     # trombones
    ARP = [0, 1, 2, 1, 2, 1, 0, 1]
    BD = 35                       # acoustic bass drum

    # ---- prelude (0-13): the catechism over black. A low F, a bell; the choir on "The second note."
    cb.n(F2(0) - 12, 0, 13, 50, leg=0.5); cb.swell(0, 13, 24, 84, peak=0.75)
    vc.n(F2(0), 0.2, 12.8, 40, leg=0.5); vc.ramp(0.2, 13, 20, 70)
    bell.n(F3(0), 2.6, 5, 56)                         # "What is holiness?"
    bell.n(F3(4), 7.4, 4, 50)                         # "What is sin?"
    bell.n(F3(1) - 1, 9.9, 3.2, 44)                   # "The second note." — a Gb, the wrong one
    stagger(chr_, [F3(0), F3(2), F3(4) + 12], 9.8, 3.3, gap=0.14, v=40, leg=0.3); chr_.ramp(9.8, 13.1, 24, 72)
    # ---- the combe (13-23): harp and a solo cello; the tune's first two phrases
    for k in range(3):
        arp(hp, ch[0] if k < 2 else ch[1], 13 + k * 4, ARP, step=0.5, v=46 - 2 * k, up=12)
    cb.n(F2(0), 13, 10, 44, leg=0.5); cb.ramp(13, 23, 50, 70)
    solo.line(15, TUNE[0] + '  ' + TUNE[1], F3, shape=6, vel=56)
    stagger(stg, vo[0], 15, 4, gap=0.1, v=38, leg=0.4); stagger(stg, vo[1], 19, 4.5, gap=0.1, v=40, leg=0.4)
    stg.ramp(15, 23, 40, 72)
    # ---- the hedge (23-37): the strings take the tune and climb to the G; the G rings into the dark
    vln.line(25, TUNE[2] + '  ' + TUNE[3] + '  ' + TUNE[4], F4, shape=7, vel=58)
    vla.line(25, transpose_line(TUNE[2] + '  ' + TUNE[3] + '  ' + TUNE[4], -2), F4, shape=5, vel=50)
    vc.line(25, transpose_line(TUNE[2] + '  ' + TUNE[3] + '  ' + TUNE[4], -7), F3, shape=5, vel=54)
    vln.n(F4(8), 37, 1.6, 58, leg=0.0); vln.ramp(36.5, 38.6, 90, 10)
    for i in (2, 3, 4):
        t = 25 + (i - 2) * 4
        arp(hp, ch[i], t, ARP, step=0.5, v=48, up=12)
        stagger(stg, vo[i], t, 4, gap=0.1, v=46, leg=0.5)
        cb.n(ch[i][0] - 12, t, 4, 54, leg=0.3)
        tim.n(F2(0) + 12, t, 0.8, 40 + 6 * (i - 2), leg=0.0)
    stg.ramp(25, 36, 60, 100); stagger(hn, vo[4][:3], 33, 4.2, gap=0.12, v=50, leg=0.3); hn.swell(33, 37.2, 50, 100, peak=0.7)
    # ---- the hounds (37-46.5): the Gb shadow, tremolo, the roll; the Hush at 42.9 takes everything but a glass note
    trem.n(F2(1) - 1, 37.4, 5.6, 44, leg=0.0); trem.n(F2(1) - 1 + 12, 37.5, 5.5, 36, leg=0.0); trem.swell(37.4, 43.0, 26, 104, peak=0.86)
    cb.n(F2(0) - 12, 37.2, 5.8, 50, leg=0.0); cb.ramp(37.2, 43, 40, 90)
    for k in range(10):
        tim.n(F2(0), 40.5 + k * 0.25, 0.25, 34 + k * 6, leg=0.0)
    tim.n(F2(0), 43.0, 0.6, 96, leg=0.0)
    glk.n(F4(0) + 24, 43.3, 3.0, 30, leg=0.0)
    # ---- the column (46.5-65.5): a processional, and the Pure Note
    for k in range(17):
        dr.n(BD, 47 + k, 0.25, 78 if k % 4 == 0 else 54)
    for i, (c, d) in enumerate([(0, 4), (5, 4), (3, 4), (6, 1.9)]):
        t = 47 + i * 4
        stagger(tbn, vlo[c], t, d, gap=0.1, v=44, leg=0.3)
        cb.n(ch[c][0] - 12, t, d, 50, leg=0.3)
    tbn.ramp(47, 60.6, 36, 108)
    hn.line(51, TUNE[4] + '  ' + TUNE[5], F3, shape=7, vel=56); hn.ramp(51, 60.6, 60, 110)
    stagger(stg, vo[3], 55, 4, gap=0.1, v=48, leg=0.4); stagger(stg, vo[6], 59, 1.9, gap=0.1, v=56, leg=0.1); stg.ramp(55, 60.6, 60, 110)
    stagger(chr_, vo[3][:3], 55, 4, gap=0.14, v=46, leg=0.3); stagger(chr_, vo[6][:3], 59, 1.9, gap=0.14, v=54, leg=0.1); chr_.ramp(55, 60.6, 40, 104)
    for k in range(5):
        tim.n(F2(0), 51 + k * 2, 0.8, 48 + 8 * k, leg=0.0)
    dr.n(BD, 60.9, 0.3, 112); tim.n(F2(4), 60.9, 1.2, 104, leg=0.0)
    C4, C5, C6 = F3(4), F3(4) + 12, F3(4) + 24
    for p, pitch, v in [(chr_, C4, 92), (chr_, C5, 98), (vln, C6, 74), (vln, C5, 70), (stg, C5, 76), (stg, C4, 70), (bell, C5, 84), (bell, C4, 72), (glk, C6, 60), (cb, C4 - 12, 72), (tbn, C4 - 12, 60), (tbn, C4, 56)]:
        p.n(pitch, 60.9, 3.5, v, leg=0.0)
    chr_.ramp(60.9, 64.3, 96, 127); stg.ramp(60.9, 64.3, 90, 124); vln.ramp(60.9, 64.3, 90, 124); tbn.ramp(60.9, 64.3, 90, 118)
    # ---- the town (65.5-77.5): warm, the last two phrases; no bell
    for k, c in enumerate((5, 6, 7)):
        arp(hp, ch[c], 65.5 + k * 4, ARP, step=0.5, v=46, up=12)
    ob.line(67, TUNE[6] + '  ' + TUNE[7], F4, shape=5, vel=52)
    vc.line(67, transpose_line(TUNE[6] + '  ' + TUNE[7], -7), F3, shape=4, vel=48)
    stagger(stg, vo[6], 67, 4, gap=0.1, v=42, leg=0.5); stagger(stg, vo[7], 71, 6.4, gap=0.1, v=40, leg=0.5); stg.ramp(67, 77.4, 70, 30)
    cb.n(F2(0), 71, 6.4, 44, leg=0.3); cb.ramp(71, 77.4, 60, 20)
    glk.n(F4(0) + 12, 71.2, 3, 32, leg=0.0)
    # ---- the title card (77.5-83.5): the name motif, everyone
    MOTIF = '0:1.5 2:.5 4:2  3:1 1:1 0:2'
    dr.n(BD, 78, 0.4, 118); tim.n(F2(0), 78, 1.5, 108, leg=0.0); tim.n(F2(0), 80, 1.0, 84, leg=0.0); tim.n(F2(0), 82, 1.0, 92, leg=0.0)
    for k in range(6):
        tim.n(F2(0), 82.5 + k * 0.25, 0.25, 70 + 6 * k, leg=0.0)
    bell.n(F3(0), 78.0, 5.2, 72); bell.n(F3(0) + 12, 78.05, 5.2, 60); bell.n(F3(0), 82.0, 1.6, 60)
    vln.line(78, MOTIF, F4, shape=8, vel=80); vla.line(78, transpose_line(MOTIF, -2), F4, shape=6, vel=66)
    hn.line(78, MOTIF, F3, shape=7, vel=74); vc.line(78, MOTIF, F3, shape=6, vel=66)
    stagger(stg, vo[0], 78, 3, gap=0.08, v=70, leg=0.2); stagger(stg, vo[6], 81, 1.5, gap=0.08, v=74, leg=0.1); stagger(stg, vo[7], 82.5, 1.1, gap=0.08, v=76, leg=0.0)
    stagger(chr_, [F3(0), F3(2), F3(4), F3(0) + 12], 78, 3, gap=0.12, v=66, leg=0.2); stagger(chr_, vo[6][:3], 81, 1.5, gap=0.12, v=70, leg=0.1); stagger(chr_, [F3(0), F3(2), F3(4), F3(0) + 12], 82.5, 1.1, gap=0.12, v=74, leg=0.0)
    stagger(tbn, vlo[0], 78, 3, gap=0.1, v=66, leg=0.2); stagger(tbn, vlo[6], 81, 1.5, gap=0.1, v=70, leg=0.1); stagger(tbn, vlo[7], 82.5, 1.1, gap=0.1, v=72, leg=0.0)
    cb.n(F2(0) - 12, 78, 5.6, 66, leg=0.0)
    for p in (vln, vla, hn, vc, stg, chr_, tbn, cb):
        p.ramp(78, 83.2, 96, 124); p.ramp(83.2, 83.7, 124, 20)
    # ---- the North Gate (83.5-97.3): a solo cello and the harp under Harrow; then the game's own quiet
    solo.n(F3(0), 84.2, 6, 56, leg=0.5); solo.swell(84.2, 90.2, 56, 96, peak=0.5)
    hp.n(F3(0) - 12, 84.5, 5, 50); hp.n(F3(4), 86.6, 5, 46); hp.n(F3(2) + 12, 88.4, 4, 42)
    solo.line(90, '4:2 3:1 1:1  0:4', F3, vel=60, shape=4)
    hp.n(F3(0) - 12, 94, 4, 46); hp.n(F3(0), 95.5, 3, 38)
    solo.ramp(94, 98, 100, 16); hp.ramp(94, 98, 96, 20)
    return S, BEATS
