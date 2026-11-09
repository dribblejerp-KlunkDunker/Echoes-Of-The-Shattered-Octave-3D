"""Pixel-3D: the Blender (bpy module) side of the bake shared by voxelise.py: scene, camera, lighting, render, quantise, atlas.

The look: every creature, person and prop is the painting itself given depth (see voxelise.py), lit by one sun and a
flat ambient, rendered at PX_PER_UNIT pixels to the world unit from its four sides (front, left, back, right; see
voxelise.py, which owns the list), in every pose the engine animates (idle, two
walk steps, wind-up, strike), and then quantised: the shading is cut to a few bands so each face keeps its painted
colour, and the silhouette can get a one-pixel dark rim. The result is pixel art that turns, lit the same from every side.
The Figure class below builds models from primitives; it is kept for props that have no painting yet.

  pip install bpy           (Blender as a Python module; no display, no GPU: the Workbench and Cycles engines both run)
  python3 tools/art/pixel3d/voxelise.py [name ...] [--preview]

Conventions. The model stands on z = 0 at the origin and FACES -Y (toward view 0's camera). World units are the game's
(a doorway is 1 unit high; a person about 1.0). A part is a primitive under a per-figure root; poses rotate or move
parts by name. Everything is deterministic: no random numbers.
"""
import math, os, json
import bpy
from mathutils import Vector, Euler
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PX_PER_UNIT = 80                 # sprite pixels per world unit: a person is 80 rows tall (the paintings use 160; this is the chunkier look)
VIEWS = [0, 90, 180, 270]        # camera bearing from the model's front, degrees (voxelise.py keys the cells by the engine's octant)
POSES = ['', '_w1', '_w2', '_a1', '_a2']
PITCH = 9.0                      # the camera looks down this much: tops of heads and shoulders show, as in the paintings
SHADE_BANDS = (0.56, 0.76, 0.94, 1.1, 1.24)   # a material's colour is drawn in these few multiples of itself (cel bands)
RIM = 0.55                       # the silhouette's one-pixel rim darkens by this


# ---------------------------------------------------------------- scene
def reset(engine='BLENDER_WORKBENCH'):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)
    sc = bpy.context.scene
    sc.render.engine = engine
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.render.filter_size = 0.01                 # no pixel filtering: one sample per pixel keeps edges hard
    if engine == 'BLENDER_WORKBENCH':
        sh = sc.display.shading
        sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.shadow_intensity = 0.55
        sh.show_cavity = False; sh.show_object_outline = False; sh.show_specular_highlight = False
        sc.display.render_aa = 'OFF'
        sc.display.light_direction = Vector((0.45, -0.35, 0.82)).normalized()
    else:
        sc.cycles.samples = 24; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
        sc.cycles.max_bounces = 2
    w = bpy.data.worlds[0] if bpy.data.worlds else bpy.data.worlds.new('w')
    sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.55, 0.57, 0.62, 1); bg.inputs['Strength'].default_value = 0.9
    # one sun, high and from the front-left: the painted sprites are lit the same way
    bpy.ops.object.light_add(type='SUN', location=(3, -3, 6))
    sun = bpy.context.object; sun.name = 'sun'; sun.data.energy = 3.2; sun.data.angle = 0.02
    sun.rotation_euler = Euler((math.radians(42), math.radians(8), math.radians(32)), 'XYZ')
    return sc


def material(color, emit=0.0):
    """A flat material of one colour (hex string or (r, g, b) in 0..1), roughness 1; emit > 0 makes it glow in Cycles."""
    if isinstance(color, str):
        c = color.lstrip('#'); color = tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))
    key = (color, emit)
    name = 'm_%s_%g' % ('%02x%02x%02x' % tuple(int(c * 255) for c in color), emit)
    if name in bpy.data.materials: return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.diffuse_color = (*color, 1.0); m.roughness = 1.0; m.specular_intensity = 0.0
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1); bsdf.inputs['Roughness'].default_value = 1.0
    try: bsdf.inputs['Specular IOR Level'].default_value = 0.0
    except KeyError: pass
    if emit:
        bsdf.inputs['Emission Color'].default_value = (*color, 1); bsdf.inputs['Emission Strength'].default_value = emit
    return m


# ---------------------------------------------------------------- parts
class Figure:
    """A root empty with named parts under it. Parts are primitives; a part can be a parent of other parts (a leg
    under a hip), so a rotation of 'hip' swings the whole leg."""
    def __init__(self, name):
        self.name = name
        bpy.ops.object.empty_add(location=(0, 0, 0)); self.root = bpy.context.object; self.root.name = name
        self.parts = {}
        self.palette = []

    def _add(self, name, obj, pos, rot, color, parent):
        obj.name = self.name + '.' + name
        obj.parent = self.parts[parent] if parent else self.root
        obj.location = Vector(pos); obj.rotation_euler = Euler([math.radians(a) for a in rot], 'XYZ')
        m = material(color); obj.data.materials.append(m)
        col = tuple(m.diffuse_color)[:3]
        if col not in self.palette: self.palette.append(col)
        self.parts[name] = obj
        return obj

    def box(self, name, size, pos, color, rot=(0, 0, 0), parent=None, origin='center'):
        """A box of size (x, y, z). origin 'bottom' puts the part's pivot at its base (a leg hangs from its hip)."""
        bpy.ops.mesh.primitive_cube_add(size=1.0); o = bpy.context.object
        # size goes into the mesh, never into object scale: a child part's position must not be scaled by its parent
        for v in o.data.vertices: v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
        if origin == 'bottom':
            for v in o.data.vertices: v.co.z += size[2] / 2
        elif origin == 'top':
            for v in o.data.vertices: v.co.z -= size[2] / 2
        elif origin == 'back':
            for v in o.data.vertices: v.co.y += size[1] / 2
        elif origin == 'front':
            for v in o.data.vertices: v.co.y -= size[1] / 2
        return self._add(name, o, pos, rot, color, parent)

    def cyl(self, name, r, h, pos, color, rot=(0, 0, 0), parent=None, segs=10, r_top=None, origin='center'):
        """A cylinder (or a frustum when r_top differs) of radius r and height h along z."""
        bpy.ops.mesh.primitive_cone_add(vertices=segs, radius1=r, radius2=r if r_top is None else r_top, depth=h); o = bpy.context.object
        if origin == 'bottom':
            for v in o.data.vertices: v.co.z += h / 2
        return self._add(name, o, pos, rot, color, parent)

    def ball(self, name, r, pos, color, parent=None, segs=10, rings=6, scale=(1, 1, 1)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=r); o = bpy.context.object
        for v in o.data.vertices: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        return self._add(name, o, pos, (0, 0, 0), color, parent)

    def wedge(self, name, size, pos, color, rot=(0, 0, 0), parent=None, taper=0.3, axis='y'):
        """A box whose top is narrowed to taper of its width along `axis` (a snout, an ear, a roof)."""
        o = self.box(name, size, pos, color, rot, parent)
        for v in o.data.vertices:
            if v.co.z > 0:
                if axis == 'y': v.co.x *= taper
                else: v.co.y *= taper
        return o

    def rot(self, name, x=0, y=0, z=0):
        self.parts[name].rotation_euler = Euler((math.radians(x), math.radians(y), math.radians(z)), 'XYZ')
    def move(self, name, dx=0, dy=0, dz=0):
        self.parts[name].location = self.parts[name].location + Vector((dx, dy, dz))
    def set(self, name, pos):
        self.parts[name].location = Vector(pos)
    def face(self, deg):
        """Turn the whole figure about z (the camera stays): view bearings are made this way."""
        self.root.rotation_euler = Euler((0, 0, math.radians(deg)), 'XYZ')


# ---------------------------------------------------------------- the camera and the frame
def camera(frame_w, frame_h, target_z):
    """An orthographic camera on the -Y side (the model's front), pitched down PITCH degrees, framing frame_w x
    frame_h world units about (0, 0, target_z). Returns the camera and the render size in pixels."""
    sc = bpy.context.scene
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'; cam_data.sensor_fit = 'HORIZONTAL'
    cam = bpy.data.objects.new('cam', cam_data); sc.collection.objects.link(cam); sc.camera = cam
    d = 12.0; p = math.radians(PITCH)
    cam.location = Vector((0, -d * math.cos(p), target_z + d * math.sin(p)))
    cam.rotation_euler = Euler((math.pi / 2 - p, 0, 0), 'XYZ')
    W, H = int(round(frame_w * PX_PER_UNIT)), int(round(frame_h * PX_PER_UNIT))
    cam_data.ortho_scale = frame_w          # HORIZONTAL fit: the scale spans the width, whatever the aspect
    sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100
    bpy.context.view_layer.update()
    return cam, W, H


def origin_row(cam, W, H):
    """The pixel row and column where the world origin (the feet) lands in the frame."""
    from bpy_extras.object_utils import world_to_camera_view
    v = world_to_camera_view(bpy.context.scene, cam, Vector((0, 0, 0)))
    return (1 - v.y) * H, v.x * W


def render(path):
    """Two renders: lit (the studio light and its shadow) and flat (each pixel its material's own colour). The pixel
    look is made from both: the flat colour, in the band the lit one says."""
    sc = bpy.context.scene
    bpy.context.view_layer.update()
    sh = sc.display.shading
    sc.render.filepath = path; sh.light = 'STUDIO'; sh.show_shadows = os.environ.get('PIX3D_SHADOWS', '0') == '1'   # Workbench's shadow is coarse and speckles the bands; off by default
    bpy.ops.render.render(write_still=True)
    flat = path[:-4] + '.flat.png'
    sc.render.filepath = flat; sh.light = 'FLAT'; sh.show_shadows = False
    bpy.ops.render.render(write_still=True)
    sh.light = 'STUDIO'; sh.show_shadows = True
    return path, flat


# ---------------------------------------------------------------- the pixel look
def quantise(lit_img, flat_img):
    """Cut the render to flat bands: a pixel's colour is its material's own (the flat render) in the shade band the lit
    render puts it in (its brightness relative to the flat colour, rounded to SHADE_BANDS); then the one-pixel rim.
    Hard alpha."""
    a = np.asarray(lit_img.convert('RGBA')).astype(np.float32) / 255.0
    b = np.asarray(flat_img.convert('RGBA')).astype(np.float32) / 255.0
    rgb, al, base = a[..., :3], a[..., 3], b[..., :3]
    solid = al > 0.5
    lum = lambda v: 0.299 * v[..., 0] + 0.587 * v[..., 1] + 0.114 * v[..., 2]
    ratio = lum(rgb) / np.maximum(0.02, lum(base))
    bands = np.array(SHADE_BANDS, dtype=np.float32)
    bi = np.argmin(np.abs(ratio[..., None] - bands[None, None, :]), axis=-1)
    out = base * bands[bi][..., None]
    # the rim: solid pixels with a transparent 4-neighbour
    s = solid
    inner = s & np.roll(s, 1, 0) & np.roll(s, -1, 0) & np.roll(s, 1, 1) & np.roll(s, -1, 1)
    inner[0, :] = inner[-1, :] = False; inner[:, 0] = inner[:, -1] = False
    rim = s & ~inner
    out = np.where(rim[..., None], out * RIM, out)
    res = np.dstack([np.clip(out, 0, 1) * 255, np.where(solid, 255, 0)]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')


def crop(img, orow, ocol, pad=1):
    """Crop to the silhouette (plus pad) and return the sprite with its engine metadata: hs (height in world units),
    cx (where the origin column sits across the width), dy (how far the bottom sits below the origin row, in units)."""
    al = np.asarray(img)[..., 3]
    ys, xs = np.where(al > 0)
    if not len(ys): return None
    x0, x1 = max(0, xs.min() - pad), min(img.size[0], xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(img.size[1], ys.max() + 1 + pad)
    sp = img.crop((x0, y0, x1, y1))
    w, h = sp.size
    hs = h / PX_PER_UNIT
    cx = (ocol - x0) / w
    dy = (y1 - orow) / PX_PER_UNIT       # + when the sprite's bottom is below the feet row (the engine lowers it)
    return sp, round(hs, 4), round(cx, 4), round(dy, 4)


def atlas(cells, path):
    """cells: list of (key, PIL image, meta). Shelf-packed in rows by pose; writes the PNG and returns the table."""
    byrow = {}
    for key, im, meta in cells: byrow.setdefault(key.split('|')[1], []).append((key, im, meta))
    W = max(sum(im.size[0] + 1 for _, im, _ in row) for row in byrow.values())
    H = sum(max(im.size[1] for _, im, _ in row) + 1 for row in byrow.values())
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0)); table = {}
    y = 0
    for pose in POSES:
        row = byrow.get(pose, []); x = 0; rh = 0
        for key, im, meta in row:
            sheet.paste(im, (x, y)); table[key] = [x, y, im.size[0], im.size[1], *meta]
            x += im.size[0] + 1; rh = max(rh, im.size[1])
        y += rh + 1
    sheet.save(path)
    return table, sheet
