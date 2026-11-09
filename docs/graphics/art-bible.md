# Echoes of the Shattered Octave: the realistic look, art bible

The reference is the owner's picture 1, Oakhaven's square (`docs/graphics/bench1-square.jpg`). The Hedge gate (picture 2)
and Port Cantabile's mole (picture 3) follow the same rules. This bible covers the Realistic art style (R11). Pixel
style and the Original preset keep their own look and are never changed by anything here.

Anything below that a player could read as lore is marked **[PROPOSED]** until the owner rules on it.

## 1. The look in one paragraph

Overcast, grounded, grim, and lived in. The light comes from a flat grey sky. The ground is wet, dark cobbles with the
bright sky caught in the water between the stones. The only saturated notes are warm: lantern flames, lit windows,
autumn ochre in the oaks. Shade is deep under eaves and in doorways and carries a teal-grey cast. Distance fades into
blue-grey air, never into white. Nothing glows unless it is a flame, a lit window, or light-glass.

## 2. Value bands (from picture 1, sRGB luma 0..255)

| Band | Picture 1 | What sits there |
|---|---|---|
| Sky | 140–160 | the overcast; the brightest large area in any daytime frame |
| Far air, hills | 85–110 | the haze; ochre and green muted toward grey |
| Mid-ground | 50–70 | walls in light, stalls, the well-house, the oak's trunk |
| Wet cobbles | 55–75 (joints 25–40) | the floor, with sky-bright glints in the wet |
| Deep shade | 20–35 | under eaves, doorways, the inside of the inn porch |
| Practical light | 180–255 | flames, lit panes (the only notes allowed to clip) |

The whole frame averages about 60–70 luma by day. Darkness comes from shade and wet, not from crushing the exposure. The
sky must still read as day. At night the street is dark but readable: lamps and windows carry it.

`test/r11look.test.js` writes ours | picture 1 side by side, in colour and in greyscale (the value bands), at the bench
camera `R11.benchCam`.

## 3. Palette (16 swatches)

| # | Name | Hex | Use |
|---|---|---|---|
| 1 | Overcast | `#a3a29e` | sky, the brightest wet glints |
| 2 | Cloud shadow | `#6e6e6c` | the sky's darker masses |
| 3 | Far air | `#5f6366` | haze over the far ring and the hills |
| 4 | Teal-grey shade | `#2c3233` | the cast in every shadow (the grade puts it there) |
| 5 | Deep shade | `#1d1a14` | eaves, doorways, under stalls |
| 6 | Wet cobble | `#48443d` | the stones of the square |
| 7 | Wet joint | `#2b2620` | the water-filled joints between stones |
| 8 | Weathered stone | `#4e4032` | ground storeys, the Chapel, the well-house |
| 9 | Limewash in shade | `#7a6e5e` | plaster panels of the jettied storeys |
| 10 | Old timber | `#383126` | beams, doors, stall frames |
| 11 | Iron-oak bark | `#4a4844` | grey iron bark of the iron-oaks (canon: grey bark) |
| 12 | Autumn ochre | `#8a6a2e` | oak leaves, leaf drifts in light |
| 13 | Leaf litter | `#5a3e22` | fallen leaves in gutters and against kerbs |
| 14 | Old wine | `#5e2a2a` | awnings (canon: "the colour of old wine and old moss") |
| 15 | Old moss | `#4b5233` | awnings, ivy, moss on stone |
| 16 | Lamp flame | `#f0a040` | flames, lit panes `#d89048`: the only saturated warm |

### Reserved colours

- **Cyan-violet** (`#59c8e0` to `#8a6ae0`) is the resonance hue: light-glass and sound magic only. Never on a lamp, a
  sign, a costume or a UI accent in the world.
- **The green vein** (`#3cf08a`, "bright as a river under ice") belongs to Kaelen's light-glass arm alone.
- **Pure red, green and blue** belong to the HUD's vials alone.
- **The Queen's seal green** (dark bottle glass, `#0d2a14` lit faintly) on the well-house and the Greenhall.

## 4. The ban list

Owner's rules (8 Nov 2026):

- no depth of field, no blur of any kind (motion, radial, tilt-shift)
- no busy particles (sparks, motes, fireflies, swirling leaves); a thin, slow chimney smoke is the limit
- no neon; no saturated primaries outside the HUD vials
- no cyan-violet outside glass and sound magic
- no castles anywhere in Oakhaven's views (picture 1's castle is replaced by the far peak, FAR_PEAK)
- bloom only on what glows (flames, lit windows, light-glass); never on the sky, plaster in sun, or metal

LOOK adds, for the owner to strike if he disagrees: no lens flares, no chromatic aberration, no film grain, no vignette
stronger than the HUD frame already gives, no god rays.

## 5. Light and grade (js/r11core.js, `LOOK` and `GRADE`; `R11.look.get()` reads them live)

- **Tone mapping:** AgX, then the grade, in one output pass. At Ultra and High the composer's last colour pass is the
  grade (it replaces OutputPass). At Phone the grade is folded into the materials' own tone mapping (CustomToneMapping =
  AgX + grade), so Phone pays for no extra full-screen pass.
- **Exposure by hour (outdoors):** day `expDay`, night `expNight`, a small lift at dusk and dawn (`expDusk`) when the
  lamps take over; indoors `expIn`.
- **Grade (display space):** 12% desaturation outside warm, bright notes (lamps and windows keep their colour), contrast
  1.2 about a low pivot, a gamma that darkens the mid-tones, a teal-grey tint into the deep shadows, an earthy warmth in
  the lower mid-tones (wood, stone, leaf litter), the sky and highlights left near neutral, a lifted black (never pure
  black).
- **Fill by day:** the hemisphere and the HDR environment at half strength by day (`ambDay`), so shade under eaves and
  in doorways goes deep; the wet cobbles keep their reflections (their own environment strength is raised).
- **Sky:** the overcast HDR a little dimmed and cooled by day (`skyDay`, `skyCool`), with a ceiling (`skyCap`) under the
  bloom threshold.
- **Fog:** exponential aerial perspective; by day it leans to the overcast air (`fogDay`, linear ~0.2, a blue-grey),
  with a share of the hour's horizon colour so dusk still warms it.
- **Practical light:** every warm light (the engine's hush-lamps, KIT's lanterns) is pulled toward tallow and candle
  (`lampWarm`); lit panes are warm (`windowGlow`) and bright enough (`windowI`) for a little bloom. Cold lights (glass,
  sound magic) are left alone.

## 6. Materials

CC0 scans from Poly Haven only (fetched with `User-Agent: OctaveProofFetcher/1.0`); never generated meshes from
region-restricted or non-commercial models (no Hunyuan3D).

| Material | Scan | Metres per repeat | Texel density (1024 px) | Notes |
|---|---|---|---|---|
| Cobbles | cobblestone_floor_08 | 1.6 | 640 px/m | wet (below) |
| Rubble stone | rustic_stone_wall | 2.4 | 427 px/m | ground storeys, garden walls |
| Dressed stone | medieval_blocks_02 | 2.6 | 394 px/m | the Chapel, the Greenhall, flags |
| Limewash | white_plaster_rough_02 | 2.0 | 512 px/m | jettied storeys, tinted per house |
| Timber | medieval_wood | 1.2 | 853 px/m | beams, posts |
| Boards | weathered_planks | 1.4 | 731 px/m | doors, shutters, stalls |
| Slate | roof_slates_02 | 2.0 | 512 px/m | roofs |
| Bark | bark_brown_02 | 1.4 | 731 px/m | tinted grey for the iron-oaks |

Texel density target: 400–850 px/m for anything within 10 m of the eye; props 512–1024 px/m; nothing in the square
under 256 px/m.

**Wet cobbles.** The scan's joints (high roughness, low AO in its ARM map) hold water: albedo down to about 0.36,
roughness down to 0.08, the normal bumps half-drowned. Stone tops are damp (albedo about 0.6, roughness about 0.26),
so each stone catches a glint of sky.
Puddle cells (a world-space noise, about 15% of the floor) fill the joints first, then go over the stones as still
water (roughness 0.035, flat). The sky (the HDR environment) and the lamps (the point lights' highlights) show in the
wet. Wetness follows the weather: damp by default under the Hush's grey sky, soaked when the weather says rain, drier
under snow. No falling rain unless the weather says rain.

## 7. Scale sheet

`R11.M = 0.330` three.js units per metre (eye 1.65 m = 0.545 units). One map cell is 3.03 m; one game wall unit is
1.88 m.

| Thing | Metres | Units |
|---|---|---|
| Eye height | 1.65 | 0.545 |
| House door | 2.0 x 1.0 | 0.66 x 0.33 |
| Ground storey (floor to jetty) | 3.0 | 0.99 |
| Upper storey | 2.6 | 0.86 |
| Cask, standing | 0.9 tall, 0.6 across | 0.30 x 0.20 |
| Crate | 0.6 cube | 0.20 |
| Market stall counter | 0.9 | 0.30 |
| Hush-lamp post | 3.0 | 0.99 |
| Wall lantern, by a door | 2.4 up | 0.79 |
| Well-house roof ridge | 3.6 | 1.19 |
| Iron-oak in the square | 14–18 tall, 16–20 spread | 4.6–5.9 tall |

## 8. Clutter rules

- Every piece answers "who uses this?": casks by the inn's door, crates by the stalls and the mast, leaves where the wind
  leaves them (gutters, kerbs, steps, under the oaks).
- Odd-numbered groups (1, 3, 5), never in a row, never evenly spaced; one piece leaning or turned.
- Nothing in a door's walking line or on the player's paths; clutter never blocks what the map lets you walk.
- Density is highest at doors, stalls and the well-house, and falls off into the lanes.
- Repeats are instanced and varied (rotation, scale within 10%, tint within 5%).
- Ivy and creeper on stone ground storeys and the Chapel, never on plaster or timber.
- Signs hang from wrought-iron brackets; lanterns hang from wall arms by doors. The map's own hush-lamps stay where the
  map puts them.
- Window boxes **[PROPOSED]**: on upper storeys of lived-in houses only, never on the shuttered or empty houses.
