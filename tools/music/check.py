"""Objective checks on rendered MP3s: duration, loudness, peak, leading/trailing silence, spectrogram PNG."""
import os, re, subprocess, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = os.path.join(REPO, 'music', 'extended')
SHOTS = '/tmp/claude-0/-home-claude/9fd8ad51-4634-5bea-b9bd-94d8450b3fd8/scratchpad/army/P8-MUSIC/spec'
os.makedirs(SHOTS, exist_ok=True)
def run(args):
    return subprocess.run(args, capture_output=True, text=True).stderr
names = sys.argv[1:] or sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))
for nm in names:
    p = os.path.join(OUT, nm + '.mp3')
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout)
    vd = run(['ffmpeg', '-nostats', '-i', p, '-af', 'volumedetect,ebur128=peak=true,silencedetect=n=-50dB:d=2', '-f', 'null', '-'])
    mean = re.search(r'mean_volume: (-?[\d.]+)', vd).group(1); mx = re.search(r'max_volume: (-?[\d.]+)', vd).group(1)
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', vd)[-1]; tp = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', vd)[-1]
    sil = re.findall(r'silence_start: ([\d.]+)', vd)
    lead = 'start-silence' if sil and float(sil[0]) < 0.5 else 'ok-start'
    size = os.path.getsize(p) / 1e6
    print('%-18s %6.1fs %5.2fMB mean %6s max %6s tp %6s I %6s %s sil@%s' % (nm, dur, size, mean, mx, tp, I, lead, ','.join(sil[:4])))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', p, '-lavfi', 'showspectrumpic=s=1000x360:legend=0:scale=log', os.path.join(SHOTS, nm + '.png')])
