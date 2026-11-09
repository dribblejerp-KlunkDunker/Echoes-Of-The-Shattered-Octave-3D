#!/usr/bin/env python3
"""The painted wall marks: moss, cracks and scorch rendered by Blender (the bpy module) from procedural materials.

  pip install bpy
  python3 tools/art/decals/marks.py [name ...]      -> img/painted20/d_<name>.png (64x64 RGBA) and tools/art/decals/preview.png

Each mark is a flat plane under one low sun, its colour, relief and outline driven by Blender's noise and Voronoi textures,
rendered at 256x256 (Cycles, CPU) with a transparent film and brought down to the game's 64x64 decal size with the same
finish as the Canva-painted pieces (tools/art/painted20/key.py: hard alpha, light posterise, a darkened rim on the solid
marks). js/painted20.js swaps them in under the drawn stand-ins' names (js/decals.js) when Painted pieces is on.
Deterministic: every mark has a fixed seed.
"""
import os, sys, math
import numpy as np
from PIL import Image
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'img', 'painted20')
RENDER = os.path.join(HERE, '.render')
RES = 256


def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'
    sc.render.resolution_x = sc.render.resolution_y = RES; sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.0; cam.location = (0, 0, 5)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.rotation_euler = (math.radians(40), math.radians(-30), 0)   # the game's light: upper left
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 0.55
    return sc


class G:
    """A small node-graph helper."""
    def __init__(self, name):
        self.m = bpy.data.materials.new(name); self.m.use_nodes = True
        self.N = self.m.node_tree.nodes; self.L = self.m.node_tree.links; self.bsdf = self.N['Principled BSDF']
        self.bsdf.inputs['Roughness'].default_value = 0.95
        self.tc = self.N.new('ShaderNodeTexCoord')
    def link(self, a, b): self.L.new(a, b)
    def node(self, kind, **inputs):
        n = self.N.new(kind)
        for k, v in inputs.items(): n.inputs[k].default_value = v
        return n
    def coords(self, seed, scale=(1, 1, 1), rot=0.0):
        mp = self.node('ShaderNodeMapping'); mp.inputs['Location'].default_value = (seed * 3.17, seed * 1.93, seed * 0.71)
        mp.inputs['Scale'].default_value = scale; mp.inputs['Rotation'].default_value = (0, 0, rot)
        self.link(self.tc.outputs['Object'], mp.inputs['Vector']); return mp.outputs['Vector']
    def math(self, op, a, b):
        n = self.node('ShaderNodeMath'); n.operation = op
        for i, v in enumerate((a, b)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: self.link(v, n.inputs[i])
        return n.outputs[0]
    def ramp(self, fac, stops):
        r = self.node('ShaderNodeValToRGB'); self.link(fac, r.inputs['Fac'])
        e = r.color_ramp.elements
        e[0].position, e[0].color = stops[0][0], stops[0][1]; e[1].position, e[1].color = stops[-1][0], stops[-1][1]
        for p, c in stops[1:-1]: x = e.new(p); x.color = c
        return r.outputs['Color']
    def falloff(self, warp_vec, squash=(1, 1, 1)):
        """1 at the centre, 0 at the frame's edge, warped by a vector so the outline is ragged."""
        mp = self.node('ShaderNodeMapping'); mp.inputs['Scale'].default_value = squash
        self.link(warp_vec, mp.inputs['Vector'])
        g = self.node('ShaderNodeTexGradient'); g.gradient_type = 'SPHERICAL'; self.link(mp.outputs['Vector'], g.inputs['Vector'])
        return g.outputs['Fac']
    def warped(self, seed, amount, scale):
        base = self.coords(seed)
        n = self.node('ShaderNodeTexNoise', Scale=scale, Detail=4.0); self.link(base, n.inputs['Vector'])
        sub = self.node('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; self.link(n.outputs['Color'], sub.inputs[0]); sub.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc = self.node('ShaderNodeVectorMath'); sc.operation = 'SCALE'; self.link(sub.outputs[0], sc.inputs[0]); sc.inputs['Scale'].default_value = amount
        add = self.node('ShaderNodeVectorMath'); add.operation = 'ADD'; self.link(self.tc.outputs['Object'], add.inputs[0]); self.link(sc.outputs[0], add.inputs[1])
        return add.outputs[0]


def moss(seed, squash, dense):
    g = G('moss')
    warp = g.warped(seed, 0.9, 1.4)
    edge = g.falloff(warp, squash)
    clumps = g.node('ShaderNodeTexNoise', Scale=9.0, Detail=10.0, Roughness=0.7); g.link(g.coords(seed + 1), clumps.inputs['Vector'])
    holes = g.node('ShaderNodeTexVoronoi', Scale=7.0); holes.feature = 'F1'; g.link(g.coords(seed + 6), holes.inputs['Vector'])
    body = g.math('MULTIPLY', g.math('MULTIPLY', clumps.outputs['Fac'], edge), 2.4)
    body = g.math('MULTIPLY', body, g.math('ADD', holes.outputs['Distance'], 0.22))   # gaps between the cushions
    alpha = g.ramp(body, [(dense - 0.08, (0, 0, 0, 1)), (dense + 0.06, (1, 1, 1, 1))])   # soft: dithered in finish()
    fine = g.node('ShaderNodeTexNoise', Scale=46.0, Detail=10.0, Roughness=0.7); g.link(g.coords(seed + 2), fine.inputs['Vector'])
    tone = g.math('ADD', g.math('MULTIPLY', fine.outputs['Fac'], 0.8), g.math('MULTIPLY', clumps.outputs['Fac'], 0.25))
    col = g.ramp(tone, [(0.36, (0.03, 0.07, 0.015, 1)), (0.48, (0.08, 0.17, 0.03, 1)), (0.58, (0.16, 0.30, 0.05, 1)), (0.66, (0.28, 0.42, 0.08, 1)), (0.74, (0.48, 0.52, 0.20, 1))])   # near the painted moss (d_moss1)
    g.link(col, g.bsdf.inputs['Base Color']); g.link(alpha, g.bsdf.inputs['Alpha'])
    bump = g.node('ShaderNodeBump', Strength=0.9); g.link(fine.outputs['Fac'], bump.inputs['Height']); g.link(bump.outputs['Normal'], g.bsdf.inputs['Normal'])
    return g.m


def crack(seed, scale, reach, squash=(1, 1, 1)):
    g = G('crack')
    warp = g.warped(seed, 0.35, 2.5)
    vor = g.node('ShaderNodeTexVoronoi', Scale=scale); vor.feature = 'DISTANCE_TO_EDGE'; g.link(warp, vor.inputs['Vector'])
    thin = g.node('ShaderNodeTexNoise', Scale=7.0, Detail=3.0); g.link(g.coords(seed + 5), thin.inputs['Vector'])
    width = g.math('ADD', g.math('MULTIPLY', thin.outputs['Fac'], 0.028), 0.011)              # the crack opens and closes along its length
    line = g.math('LESS_THAN', vor.outputs['Distance'], width)
    edge = g.falloff(warp, (reach * squash[0], reach * squash[1], 1))
    keep = g.math('GREATER_THAN', g.math('MULTIPLY', edge, g.math('ADD', thin.outputs['Fac'], 0.3)), 0.3)
    alpha = g.math('MULTIPLY', line, keep)
    g.bsdf.inputs['Base Color'].default_value = (0.022, 0.018, 0.014, 1); g.link(alpha, g.bsdf.inputs['Alpha'])
    return g.m


def scorch(seed, squash):
    g = G('scorch')
    warp = g.warped(seed, 0.75, 1.8)
    edge = g.falloff(warp, squash)
    n = g.node('ShaderNodeTexNoise', Scale=4.0, Detail=10.0, Roughness=0.66); g.link(g.coords(seed + 3), n.inputs['Vector'])
    heat = g.math('MULTIPLY', g.math('ADD', n.outputs['Fac'], 0.25), edge)
    heat = g.math('MULTIPLY', heat, 1.9)
    alpha = g.ramp(heat, [(0.16, (0, 0, 0, 1)), (0.34, (1, 1, 1, 1))])   # soft: dithered in finish()
    # soot black at the heart, a brown-umber singe at the rim, a few grey ash flecks
    fine = g.node('ShaderNodeTexNoise', Scale=38.0, Detail=6.0); g.link(g.coords(seed + 4), fine.inputs['Vector'])
    tone = g.math('ADD', heat, g.math('MULTIPLY', fine.outputs['Fac'], 0.25))
    col = g.ramp(tone, [(0.32, (0.16, 0.10, 0.05, 1)), (0.45, (0.07, 0.05, 0.035, 1)), (0.62, (0.025, 0.022, 0.02, 1)), (0.9, (0.012, 0.011, 0.01, 1))])
    g.link(col, g.bsdf.inputs['Base Color']); g.link(alpha, g.bsdf.inputs['Alpha'])
    return g.m


# name: (material maker, rim on the solid outline)
MARKS = {
    'd_moss2': (lambda: moss(2.0, (0.85, 1.05, 1), 0.42), True),
    'd_moss3': (lambda: moss(6.5, (1.1, 0.75, 1), 0.46), True),
    'd_crack1': (lambda: crack(1.0, 1.7, 1.1, (0.85, 1.3, 1)), False),   # a tall crack down the course
    'd_crack2': (lambda: crack(4.0, 2.0, 1.15, (1.3, 0.8, 1)), False),   # a spreading one across it
    'd_scorch1': (lambda: scorch(3.0, (1.0, 1.0, 1)), True),
    'd_scorch2': (lambda: scorch(8.0, (1.35, 0.8, 1)), True),   # taller: soot climbs the wall
}


def finish(path, rim, hard=False):
    im = Image.open(path).convert('RGBA').resize((64, 64), Image.BOX)
    a = np.asarray(im).astype(np.int32); rgb, al = a[..., :3], a[..., 3]
    bayer = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) * 16 + 8
    solid = (al > 48) if hard else (al > np.tile(bayer, (16, 16)))   # a soft edge becomes an ordered dither; a crack's hairline keeps every pixel it touches
    rgb = (rgb // 6) * 6 + 3
    if rim:
        inner = solid & np.roll(solid, 1, 0) & np.roll(solid, -1, 0) & np.roll(solid, 1, 1) & np.roll(solid, -1, 1)
        rgb = np.where((solid & ~inner)[..., None], rgb * 0.8, rgb)
    out = np.dstack([np.clip(rgb, 0, 255), np.where(solid, 255, 0)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def main():
    names = [a for a in sys.argv[1:] if not a.startswith('--')] or list(MARKS)
    os.makedirs(RENDER, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    done = []
    for name in names:
        make, rim = MARKS[name]; hard = name.startswith('d_crack')
        sc = scene()
        bpy.ops.mesh.primitive_plane_add(size=2); bpy.context.object.data.materials.append(make())
        raw = os.path.join(RENDER, name + '.png'); sc.render.filepath = raw
        bpy.ops.render.render(write_still=True)
        im = finish(raw, rim, hard); im.save(os.path.join(OUT, name + '.png')); done.append(im)
        print('wrote', name, flush=True)
    sheet = Image.new('RGBA', (len(done) * 196, 192), (90, 86, 80, 255))
    for i, im in enumerate(done): sheet.paste(im.resize((192, 192), Image.NEAREST), (i * 196, 0), im.resize((192, 192), Image.NEAREST))
    sheet.save(os.path.join(HERE, 'preview.png'))


if __name__ == '__main__':
    main()
