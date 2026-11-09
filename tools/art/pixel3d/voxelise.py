#!/usr/bin/env python3
"""Pixel-3D from the paintings: every painted sprite extruded into a voxel model and rendered from its four sides.

  python3 tools/art/pixel3d/voxelise.py [name ...] [--preview] [--json FILE]
  python3 tools/art/pixel3d/voxelise.py --merge a.json b.json ...

The owner: keep the same pixelated graphics, just make them 3D. So the model IS the painting: each pixel of the
painted front (or side, for the creatures painted side-on) becomes a column of voxels whose depth follows the
silhouette (every solid run of pixels on a row is treated as an elliptical section, depth = K x its width), the front
faces carry the painting pixel for pixel, the back faces its mirror a shade darker, the sides the rim colours. Rendered
at the painting's own density (its rows per world unit), the front view is the painting, the back its mirror, and the
two sides the same painting with real depth, lit by the same sun. Walk and attack frames are extruded from their own
paintings, so every pose turns. Props the same way, one view. The cell tables go into js/pixel3d.js between its @@ATLAS marks.
"""
import os, sys, json, re, hashlib, math, base64, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import bpy
from mathutils import Vector, Euler
import lib
from lib import ROOT, HERE, POSES

# the four sides the game shows (the owner, October 2026: front, left side, back, right side; the 45-degree views of an
# extrusion look square), keyed by the engine's octant so the runtime can ask by it: 0 front, 2 one side, 4 back, 6 the other.
# A side-on painting (none left here; the hound is drawn by js/bestiary20a.js) would bake only 90 and 270.
VIEWS = [0, 90, 180, 270]
OCTANT = {0: 0, 90: 2, 180: 4, 270: 6}

OUT = os.path.join(ROOT, 'img', 'pixel3d')
RUNTIME = os.path.join(ROOT, 'js', 'pixel3d.js')

# name -> how to extrude it. side: painted side-on (the painting's x axis is the creature's length, nose to the
# right). k: depth as a share of each section's width. prop: one view. file: a painting on disk instead of assets.js.
# the bestiary and the rigged people (js/bestiary20a.js, js/bestiary20b.js, js/people25.js) have hand-built views
# and are not extruded; the hollow is the one biped without a rig
PEOPLE = ['orla', 'cutter']   # orla (enthroned among her roots) and the cutter (a wreck) are not people shapes; every other named person is rigged in js/people25.js
BIPEDS = ['hollow']
SIDE_ON = []
PROPS = {   # name -> k: round things fully, boxy ones most of the way, flat ones a little
    'crates': 0.8, 'chest': 0.8, 'table': 0.8, 'bed': 0.8, 'loom': 0.7, 'press': 0.8, 'tomb': 0.8, 'grave': 0.5, 'hearth': 0.7, 'chair': 0.8,
    'bore': 0.8, 'gear': 0.6, 'lever': 0.5, 'coil': 0.9, 'cloaks': 0.5, 'cocoon': 0.9, 'lifttank': 0.9, 'kestrel': 0.7, 'bones': 0.5, 'loot': 0.9,
    'lamp': 1.0, 'pump': 0.9, 'bigbell': 1.0, 'cores': 1.0, 'basin': 1.0, 'sign': 0.25, 'hymnboard': 0.25, 'grate': 0.2, 'web': 0.15, 'ladder': 0.25,
    'shelf': 0.5, 'bones': 0.5,
}
SPECIES = {}
for n in BIPEDS: SPECIES[n] = dict(k=0.5)
for n in PEOPLE: SPECIES[n] = dict(k=0.6)
for n, k in PROPS.items(): SPECIES[n] = dict(prop=True, k=k)
SPECIES['p_barrel'] = dict(prop=True, k=1.0, file='img/painted20/p_barrel.png')
SPECIES['p_crate'] = dict(prop=True, k=0.9, file='img/painted20/p_crate.png')
SPECIES['p_barrel_open'] = dict(prop=True, k=1.0, file='img/painted20/p_barrel_open.png')
SPECIES['p_barrel_side'] = dict(prop=True, k=0.45, file='img/painted20/p_barrel_side.png')   # lying down: its rows run along the staves, so a shallow section
# kept painted: the swarms and the moth (symmetric blobs), A Quiet (an absence with smoke), the cat, the fire, footprints, the trees
BACK = 0.9           # the back faces: the mirrored painting, this much darker (the sun does the rest)
SIDE = 0.88          # the voxel faces to the left and right
TOP, BOTTOM = 1.08, 0.72
SMOOTH = 2            # rows either side over which the depth map is evened


# ---------------------------------------------------------------- the paintings
_assets = None
def assets():
    global _assets
    if _assets is None:
        s = open(os.path.join(ROOT, 'js', 'assets.js')).read()
        _assets = json.loads(s[s.index('{'):s.rfind('}') + 1])
    return _assets

def painting(name, pose, spec):
    """(RGBA image, meta) for a sprite frame; None when the pose frame does not exist."""
    if spec.get('file'):
        if pose: return None
        return Image.open(os.path.join(ROOT, spec['file'])).convert('RGBA'), {}
    a = assets(); key = name + pose
    if key not in a['spr']: return None
    im = Image.open(io.BytesIO(base64.b64decode(a['spr'][key].split(',')[1]))).convert('RGBA')
    return im, a['meta'].get(key, a['meta'].get(name, {}))


# ---------------------------------------------------------------- the voxels
def runs(mask):
    """Solid runs along a 1-D boolean array: list of (start, end inclusive)."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None: start = i
        if not v and start is not None: out.append((start, i - 1)); start = None
    if start is not None: out.append((start, len(mask) - 1))
    return out

def occupancy(solid, k, side):
    """Depth map: for each solid pixel, how many voxels deep (half-depth d: voxels -d..d). Sections run along rows
    for a front painting, along columns for a side-on one."""
    H, W = solid.shape
    depth = np.zeros((H, W), np.int32)
    if not side:
        for y in range(H):
            for x0, x1 in runs(solid[y]):
                half = (x1 - x0 + 1) / 2.0; cx = (x0 + x1) / 2.0
                for x in range(x0, x1 + 1):
                    u = (x - cx) / max(half, 0.5)
                    depth[y, x] = int(round(k * half * math.sqrt(max(0.0, 1 - u * u))))
    else:
        for x in range(W):
            for y0, y1 in runs(solid[:, x]):
                half = (y1 - y0 + 1) / 2.0; cy = (y0 + y1) / 2.0
                for y in range(y0, y1 + 1):
                    v = (y - cy) / max(half, 0.5)
                    depth[y, x] = int(round(k * half * math.sqrt(max(0.0, 1 - v * v))))
    return smooth(depth, solid, SMOOTH, along_rows=side)

def smooth(depth, solid, r, along_rows):
    """Even the depth map across neighbouring sections (r either side) so a row where an arm joins the body does not
    jump out a step deeper than the row above: the turned views show flat rows instead of a comb."""
    if r <= 0: return depth
    H, W = depth.shape; out = depth.copy()
    for y in range(H):
        for x in range(W):
            if not solid[y, x]: continue
            if not along_rows: ys = range(max(0, y - r), min(H, y + r + 1)); vals = [depth[yy, x] for yy in ys if solid[yy, x]]
            else: xs = range(max(0, x - r), min(W, x + r + 1)); vals = [depth[y, xx] for xx in xs if solid[y, xx]]
            out[y, x] = int(round(sum(vals) / len(vals)))
    return out

def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def build_mesh(name, img, meta, spec):
    """The voxel shell as one Blender mesh with per-face colours, standing on z = 0 and facing -Y. Returns the object,
    the model's extents and its pixels per unit."""
    a = np.asarray(img); H, W = a.shape[:2]
    solid = a[..., 3] > 100
    # a painted prop's dithered contact shadow (tools/art/painted20/key.py SHADOW_RGB) stays flat on the front plane
    flat = solid & (a[..., 0] == 16) & (a[..., 1] == 14) & (a[..., 2] == 11)
    solid = solid & ~flat
    hs = float(meta.get('hs', 1.0)); cx = float(meta.get('cx', 0.5))
    side = bool(spec.get('side')); k = spec.get('k', 0.6)
    depth = occupancy(solid, k, side)
    D = int(depth.max()); ND = 2 * D + 1
    occ = np.zeros((H, W, ND), bool)
    for y in range(H):
        for x in range(W):
            if solid[y, x]:
                d = depth[y, x]; occ[y, x, D - d:D + d + 1] = True
            elif flat[y, x]:
                occ[y, x, D] = True
    s = hs / H                                   # world units per voxel
    px_per_unit = H / hs
    rgb = a[..., :3].astype(np.float32)
    # the back of the figure: each row mirrored about its own silhouette (the sword hand changes sides), and where the
    # mirror lands on nothing (an asymmetric outline) the pixel's own colour
    mirror = rgb.copy()
    for y in range(H):
        xs = np.nonzero(solid[y])[0]
        if len(xs) == 0: continue
        x0, x1 = xs[0], xs[-1]
        for x in xs:
            mx = x0 + x1 - x
            if solid[y, mx]: mirror[y, x] = rgb[y, mx]
    # faces: for each of the six directions, every voxel whose neighbour that way is empty
    verts = {}; vlist = []; faces = []; cols = []
    def vid(i, j, l):
        key = (i, j, l)
        v = verts.get(key)
        if v is None:
            v = len(vlist); verts[key] = v
            if not side:   # sprite x -> world x, row -> world z (up), depth -> world y (front at -Y)
                vlist.append(((i - cx * W) * s, (l - D - 0.5) * s, (H - j) * s))
            else:          # side-on: sprite x -> world y (so view 0 is head-on; the other sign gave the hound's 45-degree view its
                           # rump), depth -> world x
                vlist.append(((l - D - 0.5) * s, (i - cx * W) * s, (H - j) * s))
        return v
    ys, xs, zs = np.nonzero(occ)
    for y, x, z in zip(ys, xs, zs):
        c = rgb[y, x]
        # neighbours: (dy, dx, dz) and the face's corner offsets
        if z == 0 or not occ[y, x, z - 1]:        # toward -depth
            faces.append((vid(x, y, z), vid(x + 1, y, z), vid(x + 1, y + 1, z), vid(x, y + 1, z))); cols.append(c)
        if z == ND - 1 or not occ[y, x, z + 1]:   # toward +depth
            faces.append((vid(x, y, z + 1), vid(x, y + 1, z + 1), vid(x + 1, y + 1, z + 1), vid(x + 1, y, z + 1))); cols.append(mirror[y, x] * BACK if not side else c)   # a side-on creature's far flank is the same fur
        if x == 0 or not occ[y, x - 1, z]:        # toward -x in the sprite
            faces.append((vid(x, y, z), vid(x, y + 1, z), vid(x, y + 1, z + 1), vid(x, y, z + 1))); cols.append(c * SIDE)
        if x == W - 1 or not occ[y, x + 1, z]:    # toward +x
            faces.append((vid(x + 1, y, z), vid(x + 1, y, z + 1), vid(x + 1, y + 1, z + 1), vid(x + 1, y + 1, z))); cols.append(c * SIDE)
        if y == 0 or not occ[y - 1, x, z]:        # up
            faces.append((vid(x, y, z), vid(x, y, z + 1), vid(x + 1, y, z + 1), vid(x + 1, y, z))); cols.append(c * TOP)
        if y == H - 1 or not occ[y + 1, x, z]:    # down
            faces.append((vid(x, y + 1, z), vid(x + 1, y + 1, z), vid(x + 1, y + 1, z + 1), vid(x, y + 1, z + 1))); cols.append(c * BOTTOM)
    me = bpy.data.meshes.new(name); me.from_pydata(vlist, [], faces); me.update()
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    lin = srgb_to_linear(np.clip(np.array(cols, np.float32), 0, 255))
    flat = np.repeat(lin, 4, axis=0)                      # one colour per face, four corners each
    flat = np.concatenate([flat, np.ones((flat.shape[0], 1), np.float32)], axis=1).reshape(-1)
    attr.data.foreach_set('color', flat.tolist())
    me.color_attributes.active_color = attr
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob.rotation_euler = Euler((0, 0, 0), 'XYZ')
    ext = np.array(vlist); lo, hi = ext.min(axis=0), ext.max(axis=0)
    return ob, lo, hi, px_per_unit, len(faces)


# ---------------------------------------------------------------- the bake
def bake(name, spec, previews):
    poses = [''] if spec.get('prop') else POSES
    # a side-on painting has no face to show head-on or from behind: those two views stay with the hand-built art
    # (js/bestiary20a.js), and only its two sides come from the extrusion (the painting and its mirror, lit)
    cells = []
    for pose in poses:
        pf = painting(name, pose, spec)
        if pf is None: pf = painting(name, '', spec)   # a pose without its own painting keeps the idle one
        img, meta = pf
        side = bool(spec.get('side')) and pose not in spec.get('front_poses', [])
        views = [0] if spec.get('prop') else ([90, 270] if side else VIEWS)
        pspec = dict(spec, side=side)
        for vi, bearing in enumerate(views):
            lib.reset('BLENDER_WORKBENCH')
            sh = bpy.context.scene.display.shading; sh.color_type = 'VERTEX'
            ob, lo, hi, ppu, nf = build_mesh(name, img, meta, pspec)
            # a side-on creature turns the other way round, so that its side view keeps the nose on the side the painted art does
            ob.rotation_euler = Euler((0, 0, math.radians(-bearing if side else bearing)), 'XYZ')
            lib.PX_PER_UNIT = ppu
            span = max(hi[0] - lo[0], hi[1] - lo[1]) * 1.05 + 4 / ppu
            fh = (hi[2] - lo[2]) * 1.02 + 8 / ppu
            cam, W, H = lib.camera(span, fh, fh / 2 - 3 / ppu)
            orow, ocol = lib.origin_row(cam, W, H)
            path = os.path.join(HERE, '.render', '%s_%d%s.png' % (name, vi, pose))
            lit, flat = lib.render(path)
            out = lib.quantise(Image.open(lit), Image.open(flat))
            c = lib.crop(out, orow, ocol, pad=0)
            if not c: raise SystemExit('empty render ' + path)
            sp, hs, cx, dy = c
            key = '%d|%s' % (OCTANT[bearing], pose)
            cells.append((key, sp, (hs, cx, dy))); previews.append((name + key, sp))
            print('  %s %s view %d: %dx%d (%d faces) hs %.3f cx %.3f dy %.3f' % (name, pose or 'idle', vi, sp.size[0], sp.size[1], nf, hs, cx, dy), flush=True)
    table, sheet = lib.atlas(cells, os.path.join(OUT, name + '.png'))
    with open(os.path.join(OUT, name + '.png'), 'rb') as fh_: v = hashlib.sha1(fh_.read()).hexdigest()[:8]
    print('baked', name, sheet.size, flush=True)
    return {'f': name + '.png', 'v': v, 'k': 'prop' if spec.get('prop') else 'creature', 'c': table}


def write_tables(tables):
    src = open(RUNTIME).read()
    m = re.search(r'// @@ATLAS-BEGIN.*?\n(.*?)\n  // @@ATLAS-END', src, re.S)
    old = {}
    mm = re.search(r'const ATLAS = (\{.*\});', m.group(1), re.S)
    if mm:
        try: old = json.loads(mm.group(1))
        except ValueError: old = {}
    old.update(tables)
    src = src[:m.start(1)] + '  const ATLAS = ' + json.dumps(old, separators=(',', ':')) + ';' + src[m.end(1):]
    open(RUNTIME, 'w').write(src)
    print('wrote', RUNTIME, 'models:', ' '.join(sorted(old)))


def preview(previews, path, S=2):
    """One row per model: its cells side by side, scaled up S times."""
    rows = {}
    for key, im in previews: rows.setdefault(re.sub(r'[0-9]\|.*$', '', key), []).append(im)
    W = max(sum(im.size[0] * S + 4 for im in r) for r in rows.values()) + 4
    H = sum(max(im.size[1] * S for im in r) + 6 for r in rows.values()) + 4
    prev = Image.new('RGBA', (W, H), (70, 70, 74, 255)); y = 4
    for r in rows.values():
        rh = max(im.size[1] * S for im in r); x = 4
        for im in r:
            big = im.resize((im.size[0] * S, im.size[1] * S), Image.NEAREST)
            prev.paste(big, (x, y + rh - big.size[1]), big); x += big.size[0] + 4
        y += rh + 6
    prev.save(path); print('preview', prev.size)


def merge(paths):
    tables = {}
    for p in paths: tables.update(json.load(open(p)))
    write_tables(tables)


if __name__ == '__main__':
    # --json FILE   write the tables to FILE instead of the runtime (so several bakes can run side by side)
    # --merge A B   fold the JSON tables A, B ... into the runtime and stop
    # --preview     write preview.png (or FILE.png next to --json FILE)
    argv = sys.argv[1:]
    if '--merge' in argv: merge(argv[argv.index('--merge') + 1:]); sys.exit(0)
    out_json = argv[argv.index('--json') + 1] if '--json' in argv else None
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and not (i and argv[i - 1] == '--json')]
    names = args or list(SPECIES)
    os.makedirs(OUT, exist_ok=True); os.makedirs(os.path.join(HERE, '.render'), exist_ok=True)
    # the painting's own shading rules; the sun only adds a gentle band, and the painting's outline is its rim
    lib.SHADE_BANDS = (0.88, 0.94, 1.0, 1.06); lib.RIM = 1.0; lib.PITCH = 0.0   # gentle: a turned view stays as bright as the painted one
    tables, previews = {}, []
    for n in names: tables[n] = bake(n, SPECIES[n], previews)
    if out_json: json.dump(tables, open(out_json, 'w')); print('wrote', out_json)
    else: write_tables(tables)
    if '--preview' in sys.argv: preview(previews, (out_json[:-5] if out_json else os.path.join(HERE, 'preview')) + '.png')
