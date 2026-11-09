#!/usr/bin/env python3
"""Paint the game's pictures locally with an open image model (no account, no network after the first download).

Model: DreamShaper 8 LCM (Lykon/dreamshaper-8-lcm, a Stable Diffusion 1.5 fine-tune, CreativeML OpenRAIL-M), run on the
CPU with diffusers. Each picture is a fixed prompt and seed below, so a re-run paints the same picture; existing files are
skipped unless --force. Output goes to img/painted/<group>/<key>.jpg, then run tools/art/manifest.py.

  pip install torch --index-url https://download.pytorch.org/whl/cpu ; pip install diffusers transformers accelerate
  python3 tools/art/paint.py [--only death/fall,area/grove] [--force] [--steps 8]

Lore rules followed by the prompts: the Hush is never shown (only an absence); nobody screams; harm to children is never
shown; nothing from later books.
"""
import argparse, os, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STYLE = ', dark fantasy oil painting, painterly brushwork, moody chiaroscuro, muted earth palette, detailed'
SKETCH = ', sepia ink sketch on old parchment, cross-hatching, field journal illustration, simple'
NEG = ('text, letters, words, watermark, signature, frame, border, modern, photo, cartoon, anime, blurry, '
       'cooling tower, factory chimney, power lines, cars, gore, castle, mountains, paintings on wall, letterbox, black bars, light bulb, electric light')

# group, key, prompt, seed. Areas and pictures painted 3:2 (768x512), bars trimmed, cropped to 16:9 1280x720; sketches 4:3 (512x384 -> 800x600).
PICTURES = [
    # ---- area loading cards (street, hall, hearth, mill and hedge come from Canva)
    ('area', 'chapel', 'interior of a small stone village chapel, worn pews, tall candles, an empty bell frame high in an arch, cold blue window light', 11),
    ('area', 'workshop', 'a grim medieval tannery workshop, stone vats, hides on frames, a heavy iron hand-press with a lever, small lilac glass spheres in a tray, a hanging lamp', 12),
    ('area', 'quarry', 'a deep stone quarry pit at dusk, a colossal medieval iron drill bore driven into the rock, brass steam pumps, wooden scaffolding and ladders, smoke', 13),
    ('area', 'root', 'an underground vault among enormous ancient tree roots that glow faintly green-gold from within, carved stone steps, dripping water', 14),
    ('area', 'grove', 'a drowned medieval town under a vast weeping willow canopy, streets flooded with still water, pale lilac mist, distant thin figures standing motionless', 15),
    ('area', 'woods', 'an autumn forest of old willows, a crashed wooden airship on its side among the trees with a torn balloon, thin smoke, a campfire glow', 16),
    ('area', 'crypt', 'a vaulted stone crypt, tombs each crowned with a small bronze bell, carved effigies of choir singers, a corridor into darkness, cold torchlight', 17),
    ('area', 'belfry', 'inside a tall stone bell tower, a huge bronze bell hanging from oak beams, ropes, wooden stairs spiralling up, moonlight through louvres', 18),
    ('area', 'arena', 'an underground fighting ring of packed sand ringed by stone tiers, iron braziers, a single bronze bell on a post at the ring edge, empty', 19),
    # ---- death pictures: what took you, never the moment itself
    ('death', 'heartglass', 'a cracked heart-shaped crystal of cyan glass lying on dark stone, faint glow leaking from the cracks, shards scattered', 21),
    ('death', 'unwrite', 'an open ledger on a desk with one name blotted out in ink, a quill fallen beside it, a lilac glass sphere, candle guttering', 22),
    ('death', 'greening', 'roots and green shoots overgrowing an empty pair of boots on a cobbled street, leaves everywhere, soft green light', 23),
    ('death', 'fall', 'looking down a sheer cliff into mist at dusk, a dropped lantern far below, broken rope', 24),
    ('death', 'drown', 'dark still water seen from just beneath the surface, light rippling above, drifting willow leaves', 25),
    ('death', 'trap', 'a stone dungeon corridor floor with a sprung iron trap and a fallen torch, dust in the air', 26),
    ('death', 'bolt', 'a crossbow bolt stuck in a wooden post on a misty road at night, a dropped lantern on the ground', 27),
    ('death', 'grapnel', 'an iron grappling hook on a taut rope across a forest floor at night, torn cloak caught on it', 28),
    ('death', 'beast', 'deep claw marks in mud and a torn cloak at the edge of a dark forest, red eyes far off in the shadows', 29),
    ('death', 'soldier', 'a cracked bronze bell-helmet lying on a road, a halberd fallen across it, grey banners, rain', 30),
    ('death', 'golem', 'a great iron fist resting on cracked flagstones, steam rising from its joints, a dented shield beneath', 31),
    ('death', 'wearer', 'a dark thicket of thorn hedge at dusk, an old coat hanging on the thorns as if worn by someone, mist', 32),
    ('death', 'quiet', 'an empty room at night where a lantern still burns beside an empty chair, a cup still warm with a thin thread of steam, utterly still', 33),
    ('death', 'found', 'a lone lantern on the ground of an empty road at night, mist, distant hills', 34),
    # ---- endings (alt text in js/screens.js ENDING_ALT)
    ('ending', 'p2_answered', 'a wooden airship lifting from a burning, greening medieval town at dawn, a rope ladder below it, a great ring of green growth spreading over the town', 41),
    ('ending', 'p2_silent', 'a wooden airship lifting from a burning, greening town at dawn, pale mist rising over a black thorn hedge wall', 42),
    ('ending', 'p2_plain', 'a wooden airship lifting away from a muddy burning town at dawn, townsfolk standing in the mud waving', 43),
    ('ending', 'b1_herald', 'a lone herald with a lantern and a scroll walking a misty road at dusk, deep woods, a far stone tower on a rise', 44),
    ('ending', 'b1_follow', 'a tall bronze automaton standing beside a hooded woman archivist in a deep forest by a stone mausoleum, holding a red choir cloak', 45),
    ('ending', 'b1_calmed', 'a bronze automaton kneeling in a ruined cloister beneath a row of empty pegs, soft light, stillness', 46),
    ('ending', 'b1_destroyed', 'scattered bronze armour plates on a forest floor, a folded red choir cloak lying on them, autumn leaves', 47),
    ('ending', 'b1_none', 'the deep woods at dusk by a stone mausoleum, a wrecked airship smoking, an empty alcove with bare pegs', 48),
]
SKETCHES = {
    'gate': 'a fortified town gate with a portcullis', 'rite': 'a village chapel altar with candles and tuning forks', 'coil': 'a coil of copper wire on an iron frame',
    'bore': 'a huge drill bit driven into rock', 'greening': 'roots and shoots bursting through cobblestones', 'hedge': 'a tall wall of thorn bushes',
    'crates': 'stacked wooden crates with rope', 'boots': 'a pair of old boots', 'twins': 'two leather coats on pegs', 'tam': 'an old man sitting by a stream at night',
    'pim': 'a child\'s hands with tiny roots growing from the fingers', 'bells': 'three church bells', 'sable': 'a thick bound ledger with a clasp',
    'pumps': 'brass water pumps and pipes', 'names': 'a page covered in lists of names', 'press': 'an iron hand-press with a lever',
    'kestrel': 'a wooden airship with a balloon', 'tank': 'a riveted metal tank with valves', 'cutterlog': 'an open logbook with a quill',
    'sunken': 'a flooded courtyard with columns', 'lamps': 'a row of street lamps', 'pools': 'four round reflecting pools', 'table': 'a table set for four with plates',
    'aegis': 'a tall armoured automaton', 'tapes': 'red choir cloaks on pegs', 'weaver': 'a great spider web across an archway', 'mausoleum': 'a stone mausoleum with a tower',
    'grave': 'a fresh grave with a spade', 'hush': 'a ring of hanging lamps around a small stool', 'lantern': 'lanterns in fog on a forest track',
    'vox': 'rows of corked glass bottles', 'tobin': 'a long tuning-fork blade', 'deed': 'a rolled deed with a wax seal', 'brood': 'egg sacs in a web',
    'vesper': 'an axe beside a coiled tow-line', 'herald': 'a herald with a lantern and scroll', 'folder': 'a thick grey folder tied with string',
    'footprints': 'scorched footprints on a wooden plank', 'quill': 'a quill and inkwell',
    'reed': 'cut reed canes and a small reed-knife', 'timber': 'a felled log with a chalk cross', 'skep': 'a straw beehive skep with a few bees',
}
for i, (k, v) in enumerate(SKETCHES.items()): PICTURES.append(('sketch', k, v, 100 + i))


# Pictures the local model could not paint well (anachronisms, wrong subject): left to the procedural stand-in until a
# better painting exists (for example from Canva). --only still paints them on request.
SKIP = {'area/workshop', 'area/arena', 'area/quarry', 'death/beast', 'death/golem', 'death/grapnel', 'death/soldier', 'death/trap',
        'ending/b1_calmed', 'ending/b1_follow', 'ending/b1_destroyed', 'ending/b1_none', 'ending/p2_plain'}
# Sketches: the local model draws photographs, not ink; only gate, greening, hedge and tam were kept. Paint the rest with
# a better model (or Canva) and pass --only sketch/<key>.
SKETCH_KEEP_ONLY = True


def trim_bars(im):
    """The model sometimes letterboxes; cut away near-black rows and columns at the edges."""
    g = im.convert('L'); w, h = g.size; px = g.load()
    dark = lambda vals: sum(vals) / len(vals) < 14
    top = 0
    while top < h // 4 and dark([px[x, top] for x in range(0, w, 4)]): top += 1
    bot = h
    while bot > h * 3 // 4 and dark([px[x, bot - 1] for x in range(0, w, 4)]): bot -= 1
    left = 0
    while left < w // 4 and dark([px[left, y] for y in range(0, h, 4)]): left += 1
    right = w
    while right > w * 3 // 4 and dark([px[right - 1, y] for y in range(0, h, 4)]): right -= 1
    return im.crop((left, top, right, bot))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--force', action='store_true'); ap.add_argument('--steps', type=int, default=8)
    a = ap.parse_args()
    only = set(filter(None, a.only.split(',')))
    todo = [p for p in PICTURES if (p[0] + '/' + p[1] in only if only else (p[0] + '/' + p[1] not in SKIP and not (SKETCH_KEEP_ONLY and p[0] == 'sketch')))
            and (a.force or not os.path.exists(os.path.join(ROOT, 'img', 'painted', p[0], p[1] + '.jpg')))]
    print('%d to paint' % len(todo), flush=True)
    if not todo: return
    import torch
    from diffusers import StableDiffusionPipeline, LCMScheduler
    pipe = StableDiffusionPipeline.from_pretrained('Lykon/dreamshaper-8-lcm', torch_dtype=torch.float32, safety_checker=None, requires_safety_checker=False)
    pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
    pipe.enable_attention_slicing(); pipe.vae.enable_tiling()
    for group, key, prompt, seed in todo:
        t = time.time()
        sketch = group == 'sketch'
        w, h, out_wh = (512, 384, (800, 600)) if sketch else (768, 512, (1280, 720))
        im = pipe(prompt + (SKETCH if sketch else STYLE), negative_prompt=NEG, num_inference_steps=a.steps, guidance_scale=2.0,
                  width=w, height=h, generator=torch.Generator().manual_seed(seed)).images[0]
        from PIL import Image, ImageFilter
        im = trim_bars(im)
        tw, th = out_wh; r = tw / th                                  # centre-crop to the target shape
        if im.width / im.height > r: nw = int(im.height * r); im = im.crop(((im.width - nw) // 2, 0, (im.width - nw) // 2 + nw, im.height))
        else: nh = int(im.width / r); im = im.crop((0, (im.height - nh) // 2, im.width, (im.height - nh) // 2 + nh))
        im = im.resize(out_wh, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        d = os.path.join(ROOT, 'img', 'painted', group); os.makedirs(d, exist_ok=True)
        im.convert('RGB').save(os.path.join(d, key + '.jpg'), quality=84, optimize=True, progressive=True)
        print('painted %s/%s %.0fs' % (group, key, time.time() - t), flush=True)

if __name__ == '__main__':
    main()
