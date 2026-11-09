#!/usr/bin/env python3
"""Phase 20b, the painted pieces: key the flat magenta background out of a generated painting and cut it to a game sprite.

  python3 tools/art/painted20/key.py            # every piece in PIECES -> img/painted20/<name>.png (RGBA) and a preview
  python3 tools/art/painted20/key.py --preview  # only the preview sheet

Source paintings (tools/art/painted20/src/*.png, 200x200, Canva's image generator; see CREDITS.md) were asked for on a
flat #FF00FF ground. Keying: a pixel is background by its distance from magenta in a de-spilled colour space; the edge is
hard (the engine draws alpha > 100 only) with the magenta spill pulled out of the rim; then the piece is cropped, scaled to
its sprite size with box filtering, lightly posterised to the game's painted-pixel look and given the same darkened rim
the procedural props have (scenery.js paint(), outline 0.58).
"""
import os, sys
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'img', 'painted20')
# the drawn stand-ins' dithered contact shadows (js/scenery.js paint() opts.shadow: cx, cy, rx, ry). A painted prop keeps
# its stand-in's shadow: the piece is fitted so its base stands on row cy, and the same checkerboard is laid under it.
# Without it the lighting module's soft shadow falls a little in front of the base and the painted props seem to hover.
SHADOW = {
    'p_barrel': (24, 60, 22, 4), 'p_barrel_open': (24, 60, 22, 4), 'p_barrel_side': (34, 44, 30, 3), 'p_crate': (28, 53, 25, 3),
    'p_cart': (50, 73, 40, 3), 'p_cart_broken': (50, 73, 44, 3), 'p_statue_broken': (28, 97, 26, 3),
    'p_statue_broken2': (36, 61, 34, 3), 'p_statue_head': (18, 29, 15, 2.5), 'p_bones_small': (30, 22, 28, 3),
}
SHADOW_RGB = (16, 14, 11)   # pixel3d/voxelise.py keeps pixels of exactly this colour flat
# name, source, target (w, h), options: pad (transparent rows kept under the piece), key strength
PIECES = [
    ('p_barrel', 'barrel.png', (48, 64), {}),
    ('p_cart', 'cart.png', (100, 76), {'anchor': 'bottom'}),
    ('p_crate', 'crate.png', (56, 56), {'anchor': 'bottom'}),
    ('p_statue_broken', 'statue.png', (56, 100), {'anchor': 'bottom'}),
    ('p_grass1', 'grass2.png', (40, 34), {'anchor': 'bottom', 'flip': True}),   # the broad clump, turned about (the tall tuft painting is too thin at this size)
    ('p_grass2', 'grass2.png', (40, 34), {'anchor': 'bottom'}),
    ('p_reed1', 'reeds.png', (28, 96), {'anchor': 'bottom'}),
    ('p_cart_broken', 'cart_broken.png', (100, 76), {'anchor': 'bottom'}),
    # wall decals: a cut-out with a transparent margin (the engine lays them over the wall; test/surfaces.test.js wants both)
    ('d_poster1', 'notice.png', (64, 64), {'margin': 3}),
    ('d_synod1', 'synod.png', (64, 64), {'margin': 3}),
    ('d_moss1', 'moss.png', (64, 64), {'margin': 1}),
    ('p_bones_small', 'bones.png', (60, 26), {'anchor': 'bottom'}),
    # the Phase 20 roadmap's remaining drawn stand-ins, painted the same way (October 2026)
    ('p_barrel_open', 'barrel_open.png', (48, 64), {'anchor': 'bottom', 'margin': 2}),
    ('p_barrel_side', 'barrel_side.png', (72, 48), {'anchor': 'bottom', 'margin': 2}),
    ('p_statue_broken2', 'statue2.png', (72, 64), {'anchor': 'bottom'}),
    ('p_statue_head', 'statue_head.png', (36, 32), {'anchor': 'bottom', 'margin': 2}),
    # the last of them: the third tuft, the second reed, posters two and three, the second Synod notice
    ('p_grass3', 'grass3.png', (40, 34), {'anchor': 'bottom', 'tone': (0.62, 0.7)}),   # an autumn tuft, toned to sit with the other two
    ('p_reed2', 'reeds2.png', (28, 96), {'anchor': 'bottom'}),
    ('d_poster2', 'notice2.png', (64, 64), {'margin': 3}),
    ('d_poster3', 'notice3.png', (64, 64), {'margin': 3}),
    ('d_synod2', 'synod2.png', (64, 64), {'margin': 3}),
]


def key(img, thresh=0.42):
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # magenta-ness: red and blue high, green low. d in [0,1], 0 = pure magenta
    d = np.sqrt(((1 - r) ** 2 + g ** 2 + (1 - b) ** 2) / 3.0)
    alpha = np.clip((d - thresh * 0.55) / (thresh * 0.9), 0, 1)
    # de-spill: pull the magenta cast out of translucent rim pixels by lifting green toward the red/blue mean
    spill = np.clip((r + b) / 2 - g, 0, 1) * (1 - alpha) * 2.0
    g2 = np.clip(g + spill * 0.6, 0, 1)
    r2 = np.clip(r - spill * 0.3, 0, 1); b2 = np.clip(b - spill * 0.3, 0, 1)
    rgba = np.dstack([r2, g2, b2, alpha])
    return Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA')


def finish(img, size, opts):
    w, h = size
    bbox = img.split()[3].point(lambda v: 255 if v > 90 else 0).getbbox()
    if bbox: img = img.crop(bbox)
    if opts.get('flip'): img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if opts.get('tone'):   # (brightness, saturation): bring a bright painting down to its neighbours' key
        a = img.split()[3]; rgb = img.convert('RGB')
        rgb = ImageEnhance.Color(ImageEnhance.Brightness(rgb).enhance(opts['tone'][0])).enhance(opts['tone'][1])
        img = rgb.convert('RGBA'); img.putalpha(a)
    sh_ = opts.get('shadow')
    if opts.get('fill'):
        out = img.resize((w, h), Image.BOX)
    else:
        sw, sh = img.size
        mg = opts.get('margin', 0)
        mgb = (h - 1 - int(sh_[1])) if sh_ else mg   # with a shadow, the base stands on its row
        k = min((w - 2 * mg) / sw, (h - mg - mgb) / sh)
        tw, th = max(1, round(sw * k)), max(1, round(sh * k))
        small = img.resize((tw, th), Image.BOX)
        out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        ox = (w - tw) // 2
        oy = h - th - mgb if (opts.get('anchor') == 'bottom' or sh_) else (h - th) // 2
        out.paste(small, (ox, oy))
    a = np.asarray(out).astype(np.int32)
    rgb, al = a[..., :3], a[..., 3]
    solid = al > 100
    # the game's hard edge, then the painted-pixel look: a light posterise and the darkened rim
    rgb = (rgb // 6) * 6 + 3
    rim = solid & ~(np.roll(solid, 1, 0) & np.roll(solid, -1, 0) & np.roll(solid, 1, 1) & np.roll(solid, -1, 1))
    rgb = np.where(rim[..., None], rgb * 0.62, rgb)
    rgb = np.clip(rgb, 0, 255); alpha = np.where(solid, 255, 0)
    if sh_:
        cx, cy, rx, ry = sh_
        yy, xx = np.mgrid[0:h, 0:w]
        ring = (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1) & ~solid & (((xx + yy) & 1) == 0)
        rgb = np.where(ring[..., None], np.array(SHADOW_RGB), rgb); alpha = np.where(ring, 255, alpha)
    final = np.dstack([rgb, alpha]).astype(np.uint8)
    return Image.fromarray(final, 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = []
    for name, src, size, opts in PIECES:
        if name in SHADOW: opts = dict(opts, shadow=SHADOW[name])
        img = finish(key(Image.open(os.path.join(HERE, 'src', src))), size, opts)
        img.save(os.path.join(OUT, name + '.png'))
        sheet.append(img)
        print('wrote', name, img.size)
    W = sum(i.size[0] * 4 + 8 for i in sheet); H = max(i.size[1] for i in sheet) * 4
    prev = Image.new('RGBA', (W, H), (60, 60, 60, 255)); x = 0
    for i in sheet:
        prev.paste(i.resize((i.size[0] * 4, i.size[1] * 4), Image.NEAREST), (x, H - i.size[1] * 4), i.resize((i.size[0] * 4, i.size[1] * 4), Image.NEAREST)); x += i.size[0] * 4 + 8
    prev.save(os.path.join(HERE, 'preview.png')); print('preview', prev.size)


if __name__ == '__main__':
    main()
