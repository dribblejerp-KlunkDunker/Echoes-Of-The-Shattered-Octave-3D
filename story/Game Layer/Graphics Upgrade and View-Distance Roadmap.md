# Echoes of the Shattered Octave: Graphics Upgrade and View-Distance Concept

The best plan is to keep the low internal resolution and nearest-neighbour pixels, and to spend the upgrade budget on light, atmosphere and distance: colour-graded aerial-perspective fog, mipmapped textures, a heightmap horizon behind the tile world, and palette/dither discipline. Then move the same look to a WebGL fragment-shader renderer before any Godot HD-2D port. Every successful retro modernisation reviewed here, from Daggerfall Unity to GZDoom, Cultic and the HD-2D titles, kept the pixel grid sacred. They modernised lighting, sky and depth cues, not texel density.

## TL;DR
- **Biggest payoff for the least risk:** Aerial-perspective fog plus a sky-matched horizon, mipmapped (texel-averaged) distant textures, palette-locked colour grading with optional ordered dither, and point-light/brightmap polish. All of these fit in the existing Canvas raycaster and none of them change the pixel identity.
- **View distance:** Keep the tile DDA for the near field (about 24–48 tiles). Add a Comanche-style "voxel space" heightmap pass with distance-stepped LOD for the far field, then panorama layers and fog on top. This is essentially what Daggerfall Unity's Distant Terrain mod does with low-poly geometry. Moving the renderer to WebGL (a fragment-shader raycaster) is the usual next step and the one worth taking. WebGPU is optional.
- **Long term:** HD-2D is defined by "pixelated characters in a 3D world" plus depth of field, bloom, volumetric light and particles. Godot 4 already has starter kits for it. The best fit for this game is a hybrid: first-person pixel exploration, with HD-2D-style diorama towns and cutscenes. Use restrained depth of field and one consistent pixel density.

## Key Findings

### 1. How retro engines upgrade without losing the pixels

**Daggerfall Unity (DFU)** is the closest precedent, and it shows a split between two philosophies:
- **Retro Mode** renders the camera into a true 320×200 or 640×400 target, then scales it to the display. It offers 4:3 or 16:10 aspect correction and a VGA post-process mode. Since version 0.13.3 it sits in the Game Effects UI. Lead developer Interkarma added it because "Unity forces linear filtering for its final presentation step, so you lose the crisper chunky-pixel look when rendering at such low resolutions." The lesson for this project is to own the final upscale and do it with nearest-neighbour, integer-scaled filtering.
- **ColorBoost** ramps brightness near the player and "can produce rapid draw distance falloff in dungeons", which reproduces the DOS game's dark dungeons. A short light radius was part of Daggerfall's identity. Long view distance should apply outdoors, not underground.
- **Distant Terrain** (Nystul) "increases view distance and adds low-poly geometry for distant terrain". It has its own terrain sampler that respects the original heightmap and blends near and far terrain "both in terms of geometry as well as textures". Towns show up as "a brighter spot in the texture". The mod is recommended with **Enhanced Sky**, described as "a beautiful procedural sky with smooth day/night cycles, stars, weather, lunar cycles". Version 2.6.1 added Retro Mode support, so the far field can stay pixelated too. A community fork, "Distant Terrain of the World of Daggerfall" (v3.69, updated May 2026), adds distant tree coverage and dirt-patch options. The original was described in 2025–26 as "way outdated".
- **Real Grass** adds grass, water plants, stones and flowers whose size and colour change through the year. It offers "texture and shader variations… for a classic style or a more realistic vegetation" and a rendering-distance setting. Interkarma's 2015 verdict was that it "perfectly enhances the look without breaking aesthetics". The heavier DREAM texture overhaul plus ReShade route is the counter-example: it makes the game feel "a couple of generations newer", but at the cost of the original identity.

**GZDoom** confirms which settings players treat as the "correct" retro look:
- **Texture filter "None (linear mipmap)":** nearest-neighbour when a texture is magnified, linear mipmaps when it is minified, "so that distant textures still somewhat resemble the actual texture and do not simply collapse into a pixel of arbitrary color." This is exactly the shimmer fix this project needs.
- **Sector light mode "Software":** a GLSL emulation of the original light tables. "Banded SW lightmode" quantises light into palette-like steps. Banding is part of the look.
- **Dynamic lights** "complement the Doom engine's sector-based ambient lighting; but they are more resource-intensive and should not be used to replace sector lighting entirely." **Brightmaps** make only the emissive parts of a sprite fullbright. Both are cheap wins for the existing coloured point lights.

**Recent retro titles** show which effects are worth keeping and which need an off switch:
- **Cultic** (Unity, solo developer Jasozz) "uses a color palette, dithering, and a mix of sprites and voxels". The developer says the defaults "are how the game is intended to be played", but a vocal share of players disable palette filtering and dithering ("turn off color filtering, its nausiating"). The developer also notes that dithering and colour filtering "are not free". A player explanation on the Steam forum says the dither pattern is "enlarged… to prevent flickering on modern displays". That is plausible but it is not a developer statement.
- **ULTRAKILL's** artist says affine texture warping "is definitely not for everyone so we have an option in the menu to control scale or disable it. Same with the psx vertex wobble!" Players commonly use light colour compression, little or no downscaling, and little or no texture warping.
- **DUSK** exposes pixelisation, filtering, bloom and palette settings. Its developers say the defaults are "the way we intended it for the most part".
- **Ion Fury** (EDuke32/Build) uses voxels for pickups and props. On consoles, General Arcade "simply replaced distant voxels with their sprite counterparts", which is real-world sprite/model LOD. They also found that draw-call count was the main bottleneck in the Polymost renderer.
- **Lunacid** and **Dread Delusion** are King's Field-likes with deliberately PS1-style, low-detail graphics. Dread Delusion players asking for smoothed textures were told "the graphics look like this intentionally." Both build mood from fog, low object density and colour rather than resolution.

**What the evidence says pays off most without breaking the pixel feel:** owned nearest-neighbour upscaling, mipmapping on minification only, palette-aware colour grading, fog with aerial perspective, brightmaps and emissives, and restrained bloom. Affine warping and vertex wobble are PS1 signifiers that don't belong in a Daggerfall-lineage raycaster. CRT/scanline filters, heavy dither and colour compression split audiences, so they should be options that default to subtle or off.

### 2. View-distance techniques

- **Two-tier world (near tiles plus far heightmap).** The Voxel Space algorithm from Comanche draws terrain from a 1024×1024 height map and colour map using only vertical lines. Rendering front to back with a per-column "highest drawn" buffer gives occlusion without a z-buffer. Its level-of-detail rule is to "render more details in front but less details far away", stepping the sample distance up as z grows. It needs no GPU: Sebastian Macke's s-macke/VoxelSpace project ("Terrain rendering algorithm in less than 20 lines of code") reimplements the engine from NovaLogic's 1992 Comanche: Maximum Overkill as a plain-JavaScript web demo using Comanche's one-byte 1024×1024 height and colour maps. It is a natural companion to this project's column raycaster and per-pixel depth buffer.
- **Mipmaps and texture averaging.** Wikipedia's "Mipmap" entry notes that mipmaps reduce "aliasing and Moiré patterns that occur at large viewing distances, at the cost of 33% more memory per texture." A 64×64 texture becomes a 64→32→16→8→4→2→1 chain. Retro-oriented guides recommend nearest-mipmap rather than mipmap-free sampling for long floors, "before deciding that the shimmer is simply part of the retro aesthetic."
- **Aerial perspective.** Fading toward a single fog colour looks fake at range. The runevision notes argue that mountains go "from a deep blue tint in the mid-distance to a paler tint in the far distance". Iñigo Quílez-style height fog with a sun-direction inscatter term (`mix(shadowColour, sunColour, pow(dot(view, sun), k))`) gets most of the way "in a few lines".
- **Sprite LOD and impostors.** As Ion Fury did, swap expensive representations for cheap ones with distance. For billboards, that means dropping animation frames, then using single-frame silhouettes, then 1–2 px tinted dots, then culling. Groups of distant trees or buildings can become pre-rendered impostor strips baked into the horizon panorama.
- **Panoramas and parallax.** Pixel-art background practice uses layered sky, then far silhouettes, then mid-ground, with "less contrast, less saturation, and colors that shift toward the sky color" as layers recede.
- **Canvas vs WebGL vs WebGPU.** Canvas 2D is CPU-bound. WebGL moves per-pixel work into fragment shaders that run in parallel on the GPU. Benchmarks consistently show large gains once work is per-pixel or per-sprite. One test drew 20,000 points at about 30 FPS in WebGL against 3 FPS in Canvas. The costs are setup and resizing overhead (in the geeogi/2dgraphs benchmark on a 2017 MacBook Pro, getting a WebGL context took about 7.8 ms against 0.01 ms for 2D, and resizing took about 1.4 ms against 0.02 ms), a rewrite of the renderer core, and GLSL tooling. WebGPU's main advantage is compute shaders. A raycaster at 320×150 doesn't need them, so WebGL2 is the pragmatic target.

### 3. HD-2D, technically

- **Definition.** Wikipedia's entry describes HD-2D as dynamic lighting, depth of field and tilt-shift producing a "diorama-like appearance", plus bloom, volumetric lighting and fog, particles and parallax. Octopath Traveler was built in Unreal Engine 4; Acquire lead programmer Yutaka Watanabe told Epic's Unreal Engine spotlight that "even during peak time, we only had six programmers… we relied heavily on UE4." Dragon Quest III HD-2D producer Masaaki Hayasaka, in a November 2024 PlayStation Blog interview: "The only common thread between all HD-2D titles is that they place pixelated characters in a 3D world." Octopath uses pixel-art backgrounds too, while DQIII does not.
- **Depth of field is the signature, and it is easy to overdo.** Hayasaka told the PlayStation Blog: "In HD-2D, depth of field is extremely important." Yet Yuji Horii found their blur "far too intense, and it made him feel like there was something wrong with his eyes," so they dialled it back. Reviewers also flagged DQIII's bloom as "a bit too distracting". Octopath II's team aimed for "art that would be picture-perfect no matter when you screenshotted it."
- **Godot 4 reproductions:**
  - The *HD-2D Starter Kit for Godot 4* (bubbabba, itch.io) packages an HD2DCamera ("high, shallow, long-lens"), billboards with ground decals and blob shadows, and a texture-side "Pixelate" pass.
  - A *HD-2D Style in Godot 4.1* YouTube walkthrough covers the same ideas.
  - The t3ssel8r-style 3D pixel-art family is related: the *Godot 3D Pixelart Starter Kit* (Godot 4.6; Bayer dithering, depth/normal outlines, pixel-perfect camera, an upscaler whose "UV drift correction syncs to the camera's subpixel error so nothing shimmers"); *Pixel 3D* (480×270 orthographic, "about 40,000 grass cards in one draw call", light shafts that read the sun's shadow map); and David Holland's write-up of outlines via 1-pixel depth/normal kernels.
  - The Godoiosis HD-2D design issue names "mixed pixel densities" as "the single loudest 'amateur HD-2D' tell".
- **Borrowing it for a first-person game.** Directly usable pieces are bloom on emissives only, volumetric shafts (already present), particles, sprite-receiving shadows and colour grading. Tilt-shift depth of field doesn't suit a first-person camera except in cutscenes, dialogue close-ups or "focus" moments. The natural hybrid is to keep exploration first-person and render towns, shrines, dialogue and cutscenes as HD-2D dioramas with the same sprite and texel density.

### 4. Art direction for a sound-themed, melancholic dark fantasy

- **Silence and dread.** *Lunacid* has "an almost soul-crushingly melancholy mood… the low level of detail only encouraging your imagination to fill in the polygonal blanks. Silent micro-stories are found everywhere" (PC Gamer). *Dread Delusion* "captures King's Field's brand of melancholy, dread, and quiet wonder" (Niche Gamer). Its palettes are described as Moebius-like, and Mike Mignola is cited for "masses of black and striking contrasts".
- **Glowing growth against decay.** Hollow Knight's backgrounds feature "pink crystal growing out of rocks" among "intertwined vines… art-nouveau buildings" in a muted, melancholic world. That is a secondary essay, not an official source. *Hyper Light Drifter* puts "a grim world filled with neon pinks and blues" over "grays and greens of dark 16-bit dungeons". *Signalis* uses "otherworldly voids rendered in stark reds and blacks", drawing on Böcklin's *Isle of the Dead*.
- **Sacred-macabre and biomechanical.** Blasphemous' art director Enrique Cabeza: "We tried to emulate the Spanish religious art of centuries ago that could be dark and macabre but at the same time… a beautiful side." Scorn director Ljubomir Peklar (Ebb Software) calls Giger and Beksiński "certainly the two main visual influences", chosen because "different aspects of their work relate to various themes and ideas in Scorn" (quoted by Den of Geek). EGM says "Beksiński provides Scorn's color palette".
- **Painters:**
  - Beksiński: "I wish to paint in such a manner as if I were photographing dreams"; his later work used a muted palette.
  - Caspar David Friedrich: fog that "heightens the strength of the imagination and excites expectation"; ruins with a "dull, muted color palette".
  - Moebius: pastel grounds with a single bold pop.
  - Simon Stålenhag: "eternal twilights, hazy horizons… Cold, soft colors… contrasting with bright spots of color, often associated with technological elements". Replace "technological" with "light-glass" and that is the core image for this game.
- **Ready palettes (Lospec):**
  - Grim32 (32 colours; desaturated teal, olive, umber, violet-grey)
  - TY – Old 90s Adventure 16 (16 colours; medieval/dark fantasy)
  - TY – High Fantasy 40 and TY – Forgotten Times 51 (dark-fantasy feel)
  - Desolate Guest (128 colours, "dark moody scenes")

**Proposed mood system.** Base the world on Grim32-style desaturated umber, moss and violet-grey. Reserve one saturated, cool-to-white "resonance" hue (cyan-violet) for light-glass and anything sound-related, and make it the only thing that blooms. Silence zones should drain saturation and contrast through the grade, flatten fog toward the horizon colour, and stop particle motion. That makes a visual "mute" that players learn to dread. Overgrowth takes warm moss greens that are partially reclaimed by glass, following Stålenhag's cold-field-with-bright-accent rule.

## Ranked Upgrade Options

| # | Upgrade | Visual impact | Effort | Risk to pixel identity | Phase |
|---|---|---|---|---|---|
| 1 | Aerial-perspective fog (distance + height, sun-direction tint, separate mid/far colours) matched to sky gradient | Very high | Low | None | 1 |
| 2 | Mipmapped 64→1 textures (nearest-mip, per-column/row LOD from depth) | High (kills shimmer/moiré) | Low–Med | None | 1 |
| 3 | Far-field heightmap "voxel space" pass + horizon panorama layers | Very high (view distance) | Medium | Low | 1–2 |
| 4 | Palette-locked colour grading (LUT per biome/mood, silence desaturation) + optional ordered dither | High | Low | Low (keep dither subtle/optional) | 1 |
| 5 | Brightmaps/emissive masks + bloom restricted to emissives/light-glass | High | Low | Low | 1 |
| 6 | Sprite LOD ladder + impostor strips | Medium (perf enables #3) | Low | None | 1 |
| 7 | Banded/quantised light falloff (GZDoom "software" style) | Medium | Low | None (strengthens it) | 1 |
| 8 | 8-directional sprites for key NPCs/monsters | Medium | High (art cost) | None | 2 |
| 9 | Normal-mapped sprites/walls lit by point lights | Medium–High | Medium | Medium (can read "HD" if overdone) | 2 |
| 10 | WebGL2 fragment-shader renderer (same 320×150 target, nearest upscale) | Enabler (2×–4× resolution headroom, cheap post) | High | Low if output stays low-res | 2 |
| 11 | Volumetric fog/light probes in shader | High | Medium (in WebGL) | Low | 2 |
| 12 | Voxel props (Build/Cultic style) with sprite fallback at distance | Medium | Medium | Low | 2 |
| 13 | CRT/scanline/VGA filter | Low–Medium | Low | Divisive; option only | 1 |
| 14 | Affine warping / vertex wobble | Low | Low | Wrong lineage (PS1); skip | — |
| 15 | HD-2D diorama towns/cutscenes with restrained DoF | Very high | Very high | Medium (pixel-density mixing) | 3 |

## Recommended Roadmap

**Phase 1: inside the current Canvas raycaster (weeks).** Precompute mip chains for every 64×64 texture. Pick the level from depth times texel footprint, magnify with nearest, and choose the nearest mip on minification, as with GZDoom's "None (linear mipmap)". Rebuild fog as aerial perspective: a deep tint in the mid-distance and pale horizon-matched colour at the far end, with height falloff and sun inscatter. Add 3–4 panorama layers (sky gradient, far ridges, mid silhouettes, weather) that parallax with yaw. Put all grading through a per-mood 3D LUT that is snapped to the chosen palette. Add brightmaps and restrict bloom to emissives. Implement the sprite LOD ladder. Keep dungeons short-range and dark, which is ColorBoost-style intentional falloff.

**Phase 1b: view distance (the core ask).** Keep the tile DDA authoritative for 24–48 tiles. Beyond that, march a downsampled heightmap/colour-map of the world (one texel per tile or per 4×4 tiles) Voxel-Space-style. Increase the step size with distance and write into the same depth buffer so near geometry and sprites occlude correctly. Bake town lights as "brighter spots", as Distant Terrain does, so settlements read at night. Cross-fade the boundary between tiers with fog rather than a hard seam. Budget: at 320×150 the frame is 48,000 pixels, or 192,000 at 2× scale. Every per-pixel post pass in JS costs roughly a full-frame loop, so merge passes (fog, grade and dither in one loop) and run weather/heat haze at half resolution.

**Phase 2: WebGL2 renderer (months).** Port the raycaster to a full-screen fragment shader, or render the map as merged wall/floor meshes with a low-res framebuffer. Either way, present through an integer nearest-neighbour upscale, which is what DFU's Retro Mode does. Hardware mip sampling, 3D LUTs, depth-aware fog, volumetric shafts and soft sprite shadows then become nearly free, so view distance and 2× internal resolution are affordable. Keep a Canvas fallback for weak devices. Treat WebGPU as optional.

**Phase 3: Godot 4 HD-2D adaptation.** Start from an HD-2D starter kit plus a pixel-perfect upscaler with subpixel UV correction. Lock one sprite and texel density across the whole game. Use HD-2D dioramas for towns, dialogue and cutscenes, and keep exploration in first person with the same palette, LUTs and fog curves. Dial depth of field and bloom below Square Enix's defaults, following Horii's note. Reuse the Phase 1 art bible unchanged so the game reads as the same world.

## Caveats
- Several sources are community forums, itch.io product pages or secondary blogs (Hollow Knight crystal description, Hyper Light Drifter palette, Cultic dither explanation). Treat them as indicative, not authoritative.
- WebGL vs Canvas speed-ups come from unrelated benchmarks (charts, sprites). Profile your own raycaster before committing to the rewrite.
- Godot HD-2D kits are third-party, mostly paid, and target Godot 4.6. Check licences and maintenance before depending on them.
- The ranked impact and effort scores are judgement calls based on the precedents above, not measured results.
