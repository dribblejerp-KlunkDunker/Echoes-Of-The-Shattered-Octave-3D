"""Sanity check: the dominant pitch classes of each render against the key the piece was written in."""
import os, subprocess, sys, numpy as np, soundfile as sf
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(REPO, 'music', 'extended')
NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
EXP = {'oakhaven': 'F lydian', 'whispergrove': 'F# minor', 'deepwoods': 'F phryg', 'quarry': 'C phryg', 'rootvault': 'F pent', 'catacombs': 'E dorian',
       'mausoleum': 'G minor', 'boss_requiem': 'Bb harm', 'boss_broodmother': 'A phryg', 'boss_weaver': 'F# pent', 'boss_aegis': 'G harm',
       'boss_pressman': 'A phryg', 'boss_deacon': 'A minor', 'boss_wearer': 'F', 'boss_golem': 'A phryg', 'boss_captain': 'A mixo'}
for f in sorted(os.listdir(OUT)):
    if not f.endswith('.mp3'): continue
    nm = f[:-4]
    tmp = '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/P8-MUSIC/chroma.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', os.path.join(OUT, f), '-ac', '1', '-ar', '22050', tmp], check=True)
    x, sr = sf.read(tmp)
    n = 8192; chroma = np.zeros(12)
    win = np.hanning(n)
    for i in range(0, len(x) - n, n):
        sp = np.abs(np.fft.rfft(x[i:i + n] * win)); fr = np.fft.rfftfreq(n, 1 / sr)
        m = (fr > 60) & (fr < 2000)
        midi = 69 + 12 * np.log2(fr[m] / 440.0)
        pc = np.round(midi).astype(int) % 12
        np.add.at(chroma, pc, sp[m] ** 2)
    chroma /= chroma.sum()
    top = np.argsort(chroma)[::-1][:7]
    print('%-18s %-10s top: %s' % (nm, EXP.get(nm, 'F minor/major (main)'), ' '.join('%s:%.0f%%' % (NAMES[i], 100 * chroma[i]) for i in top)))
