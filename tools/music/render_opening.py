"""Render the opening cinematic's piece: python3 render_opening.py  ->  music/opening.mp3 (not part of the Extended score)."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pieces'))
from lib import render, encode, HERE
import opening
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
t0 = time.time()
S, beats = opening.build()
m = opening.META
wav = render(S, beats, m['file'], wet=m['wet'], rt60=m['rt60'], loop=False, fade_out=m['fade_out'])
encode(wav, os.path.join(REPO, 'music', m['file'] + '.mp3'), m['kbps'])
print('rendered music/%s.mp3 %.1fs' % (m['file'], time.time() - t0))
