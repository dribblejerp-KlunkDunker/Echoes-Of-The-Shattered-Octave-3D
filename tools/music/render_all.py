"""Render the Extended score: python3 render_all.py [piece ...]  (default: every piece in pieces/)."""
import importlib, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pieces'))
from lib import render, encode, HERE
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(REPO, 'music', 'extended')
os.makedirs(OUT, exist_ok=True)
ORDER = ['oakhaven', 'whispergrove', 'deepwoods', 'quarry', 'rootvault', 'catacombs', 'mausoleum',
         'boss_requiem', 'boss_broodmother', 'boss_weaver', 'boss_aegis', 'boss_pressman', 'boss_deacon', 'boss_wearer', 'boss_golem', 'boss_captain',
         'maintheme']
names = sys.argv[1:] or ORDER
for nm in names:
    t0 = time.time()
    mod = importlib.import_module(nm)
    for meta, build in (mod.PIECES if hasattr(mod, 'PIECES') else [(mod.META, mod.build)]):
        S, beats = build()
        wav = render(S, beats, meta['file'], wet=meta.get('wet', 0.22), rt60=meta.get('rt60', 2.8), loop=meta.get('loop', False),
                     fade_out=meta.get('fade_out', 0.0), gain_db=meta.get('gain_db', 0.0), shelf_hi=meta.get('shelf_hi', -1.5),
                     comp=meta.get('comp', True), lo_cut=meta.get('lo_cut', 28))
        encode(wav, os.path.join(OUT, meta['file'] + '.mp3'), meta.get('kbps', 112))
        print('rendered', meta['file'], '%.1fs' % (time.time() - t0), flush=True)
