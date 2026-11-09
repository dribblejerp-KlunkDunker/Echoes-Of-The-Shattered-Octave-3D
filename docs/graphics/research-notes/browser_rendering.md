# Browser 3D rendering technology for a photoreal-painterly dark-fantasy look (as of Nov 2026)

Scope note: about 23 tool calls were used. Several primary pages could not be fetched: the threejs.org manual returned a client error, and GitHub directory listings were blocked by robots. Some engine feature lists therefore come from secondary write-ups (utsubo.com, cinevva.com) and are flagged that way. Anything not sourced is marked as an inference or a gap.

## 1. Engine choice: Three.js (WebGLRenderer vs WebGPURenderer/TSL), Babylon.js, PlayCanvas

### Takeaway
All three engines are MIT/Apache-licensed and can produce this look. Babylon.js 9.x currently ships the most built-in features this project needs: clustered lighting on both WebGL2 and WebGPU, volumetric light shafts, frame graph, and IBL shadows. Three.js r187 has the largest ecosystem and an automatic WebGPU-to-WebGL2 fallback, but has a split ecosystem: pmndrs postprocessing and takram clouds are WebGL-only, while the TSL nodes need WebGPURenderer. PlayCanvas has mature clustered lighting, lightmapping and an editor, but its WebGPU path is described as still maturing.

### Cited Findings
**Three.js**
- The latest release is **r187** (`three@0.187.0`, 30 Oct 2026). Earlier releases: r186 on 8 Sep 2026 (patch 0.186.1 on 24 Sep), r185 on 25 Jun 2026, r184 on 16 Apr 2026, r183 on 18 Feb 2026, r182 on 10 Dec 2025. — [utsubo: What's New in Three.js 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- r171 (29 Nov 2024) added the `three/webgpu` and `three/tsl` entry points. r183 added read-write storage textures in TSL and reversed depth on WebGPURenderer. r184 made `compileAsync()` non-blocking and let TSL/node materials run on WebGLRenderer through a compatibility layer, and added **FSR 1 and TAAU upscaling nodes**. r185 added **clustered (Forward+) lighting** and WebXR on WebGPURenderer. r187 added depth-only render targets. — [utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- WebGPURenderer falls back to WebGL 2 automatically when WebGPU is unavailable, so one codebase covers all users. — [utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- WebGPU is "not faster everywhere". Forum reports describe WebGPURenderer scenes running slower than WebGLRenderer, and the advice is to profile on both backends. — [utsubo 2026](https://www.utsubo.com/blog/threejs-2026-what-changed); [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- Migration pitfalls on WebGPURenderer:
  - `ShaderMaterial`, `RawShaderMaterial` and `onBeforeCompile` are not supported and must be ported to TSL.
  - pmndrs/postprocessing and `EffectComposer` do not run on WebGPURenderer.
  - `PostProcessing` was renamed `RenderPipeline` in r183.
  - Effects that must run after tone mapping (FXAA, LUTs) need `outputColorTransform = false` plus a manual `renderOutput()`.
  
  — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- Post-processing TSL nodes in `three/addons/tsl/display/` include Bloom, FXAA, SMAA, TRAA, GTAO, SSR, DoF and outline, "and more". — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- The three.js core bundle is about 150 KB. A secondary source says Three.js leaves clustered lighting to the developer ("BYO"). That conflicts with utsubo's report that r185 added clustered/Forward+ lighting on WebGPURenderer. — [cinevva comparison (vendor-authored, Jun/Sep 2026)](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison); contradicted by [utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- Importing WebGLRenderer alongside `three/webgpu` grew one test bundle from 792 KB to 1,155 KB. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)

**Babylon.js**
- Babylon.js **9.0** was announced on 26 Mar 2026. A comparison page lists **9.26** as current in Sep 2026. The licence is Apache 2.0. — [Windows Dev Blog: Announcing Babylon.js 9.0](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0); [cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)
- Babylon.js 9.0 features:
  - **Clustered lighting**, on WebGPU and WebGL 2, with "hundreds or even thousands of lights" ([demo](https://aka.ms/babylon9CLDemo), [docs](https://aka.ms/babylon9CLDoc)).
  - **Volumetric lighting**: light shafts through fog/haze with extinction and phase parameters, for directional lights, using WebGPU compute with a WebGL 2 fallback ([demo](https://aka.ms/babylon9vlDemo)).
  - **Textured area lights**.
  - **Frame Graph v1**, with GPU memory savings of "40% or more in some cases".
  - Gaussian splats with shadows.
  - Animation retargeting.
  
  — [Windows Dev Blog](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0)
- Babylon.js 9.0 Part 3 adds **OpenPBR materials (alpha)**: base, specular, coat and thin-film ([demo](https://aka.ms/babylon9OPBRDemo)). It also adds **dynamic IBL shadows**, which approximate environment lighting and shadows from a source image and update in real time ([demo](https://aka.ms/babylon9IBLSDemo)), plus SDF text and an outline renderer. — [Windows Dev Blog Part 3](https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/)
- A secondary source calls Babylon's WebGPU support "among the more advanced" of general-purpose engines, with WebGL2 kept for compatibility. — [cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)

**PlayCanvas**
- Engine v2.19.0 was posted on 28 May 2026, with patches v2.19.1 to v2.19.7 through 12 Jun 2026. It added a dual-backend (WebGL + WebGPU) shader material example and first- and third-person Gaussian-splat navigation examples. — [PlayCanvas forum](https://forum.playcanvas.com/t/engine-v2-19-0/42321)
- A secondary source lists Engine **2.22.0** as current in Sep 2026, contradicted by its own meta description, which says 2.20. Other claims from that source: the engine is MIT, the hosted editor is proprietary (free for public projects, paid for private), and it is "WebGL2-first; WebGPU path still maturing". The runtime is 1 to 2 MB, and it "starts faster on phones" than Unity. — [cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)
- Clustered lighting has been on by default since Engine v1.56 and covers omni and spot lights. Shadow maps and cookies are atlased, so many shadowed lights can run at once. The default maximum is 255 visible lights, raisable via `LightingParams.maxLights` from v2.22. On older mobile devices the docs suggest disabling shadows or cookies globally. — [PlayCanvas docs: Clustered lighting](https://developer.playcanvas.com/user-manual/graphics/lighting/clustered-lighting/)
- PlayCanvas has a runtime lightmapper. The blog post on it is old (pre-2024, possibly outdated). — [PlayCanvas blog: Runtime lightmap generation](https://blog.playcanvas.com/runtime-lightmap-generation-for-webgl)

**Unity WebGL (for reference)**
- Unity 6.6 supports WebGPU for web builds, but it is off by default. An empty build is "8 MB-plus", and mobile browser performance is "a known pain point". — [cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)

### Inferences
- The game is plain HTML/JS with no build step and already has hand-written WebGL layers, so **Three.js is the lowest-friction migration**. It can be imported as an ES module from a CDN, and the existing GLSL sky/fog could be kept on WebGLRenderer.
- The decision is a fork:
  - **(a) WebGLRenderer + pmndrs postprocessing + takram atmosphere/clouds + N8AO.** This is the mature, phone-friendly GLSL ecosystem.
  - **(b) WebGPURenderer + TSL RenderPipeline (GTAO, SSR, TRAA, bloom, clustered lights).** This is the forward path, with automatic WebGL2 fallback, but takram clouds and pmndrs are not available.
  
  The two ecosystems cannot be mixed in one pipeline.
- **Babylon.js** is the best "batteries-included" choice if the owner prefers fewer third-party pieces. Clustered lights, volumetric shafts, IBL shadows and a default rendering pipeline all come built in. The cost is rewriting more of the existing raw-WebGL code.

### Gaps
- Could not fetch the official three.js release notes or the manual (threejs.org returned a client error; GitHub was robots-blocked). The r18x feature list is from utsubo.com, a three.js agency blog, not the official changelog.
- Could not confirm whether three.js ships an official **SSGI** TSL node. A search hit references "three.js SSGI TSL WebGPU R3F demo by Anderson Mancini", but it was not verified.
- No primary PlayCanvas v2.20 to v2.22 release notes were read.

## 2. Lighting: baked lightmaps, probes, real-time GI, CSM, many point lights

### Takeaway
For phone co-op, the realistic approach is a hybrid:
- Static GI comes from **baked lightmaps or light probes**, for example from Blender or a JS-side bake from the grid.
- One sun/sky directional light with **cascaded shadow maps**.
- **Clustered/forward+ lighting** for the many warm lanterns and windows. This is built into Babylon 9, PlayCanvas, and three.js r185+ WebGPU.

Real-time GI (SSGI/DDGI/voxel) in the browser is still experimental and should be a desktop-only upgrade.

### Cited Findings
- Clustered lighting is available in Babylon.js 9 (WebGL2 and WebGPU, hundreds to thousands of lights), PlayCanvas (default since v1.56, up to 255 lights, atlased shadows and cookies), and three.js r185 WebGPURenderer. — [Babylon 9 announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0); [PlayCanvas docs](https://developer.playcanvas.com/user-manual/graphics/lighting/clustered-lighting/); [utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- A production PlayCanvas-based renderer (the Magnopus Web Renderer, for Connected Spaces/OKO) uses:
  - Clustered forward rendering for many lights.
  - **Light probes** that capture directional lighting in a volume, for baked bounce GI without a lightmap.
  - Baked lightmaps from Unreal, with probes still lighting dynamic objects.
  - Reflection probe volumes.
  - A planned WebGPU compute, froxel-based lighting path.
  
  The post's year is not stated. — [Magnopus blog](https://www.magnopus.com/blog/building-beautiful-worlds-across-platforms-with-playcanvas-and-the-magnopus-web-renderer-featuring-volumetric-lighting)
- Babylon 9's **dynamic IBL shadows** approximate environment shadowing from the sky image in real time, a cheap substitute for sky-light GI and occlusion. — [Babylon 9 Part 3](https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/)
- On older mobile devices, PlayCanvas recommends turning off clustered shadows and cookies globally. — [PlayCanvas docs](https://developer.playcanvas.com/user-manual/graphics/lighting/clustered-lighting/)

### Inferences
- These maps are procedural grids, so **Blender baking is awkward**: every map would need an export/bake round-trip. Better options:
  - **(a) Bake once per map in-browser at load** (PlayCanvas has a runtime lightmapper; for three.js, a progressive lightmapper over the merged static geometry).
  - **(b) A coarse irradiance-probe grid aligned to the tile grid** (one SH probe per tile or per two tiles, baked by rendering cubemaps at load). This is a natural fit for a 40x36 tile layout.
- "Lanterns against cool daylight" is mostly a **colour-temperature contrast**: a cool sky/IBL, warm (~2000 to 2700 K) small point lights through clustered lighting, and emissive window materials plus bloom. Shadowed point lights should be limited to a few near the player.
- Cascaded shadow maps for the sun: three.js has a CSM addon and Babylon/PlayCanvas have cascades built in (not verified this session). On phones, use 2 cascades at 1024 px.

### Gaps
- No verified 2026 source on DDGI or voxel GI implementations for three.js/WebGPU (for example the "Shade" WebGPU engine thread on three.js discourse). Real-time GI performance in the browser is unquantified here.
- No benchmark numbers for clustered lighting on phones were found.

## 3. Atmosphere: volumetric clouds, height fog / aerial perspective, sky models, god rays

### Takeaway
For three.js, **takram's `@takram/three-atmosphere` + `@takram/three-clouds`** (MIT) is the most complete off-the-shelf solution: precomputed atmosphere, aerial perspective, volumetric clouds with shadows, light shafts and haze. It currently targets WebGLRenderer with the pmndrs postprocessing composer, and runs on phones only at its Low preset. A WebGPU atmosphere module is appearing in v0.18 to v0.19 source. Babylon 9 has built-in volumetric light shafts.

### Cited Findings
- `@takram/three-clouds` renders volumetric clouds with beer shadow maps, shadows onto scene objects, temporal upscaling, **light shafts (crepuscular rays)** and haze. It composites into `@takram/three-atmosphere` for aerial perspective. It requires `postprocessing` (pmndrs) `EffectComposer`, is not compatible with the three.js examples composer, uses GLSL, and does not support WebGPU/TSL yet ("planned"). Licence: MIT. — [three-clouds README v0.7.4](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)
- Quality presets: Low disables shape detail, shafts and turbulence. Medium disables shafts and turbulence. High is the baseline. Ultra raises BSM resolution. Measured figures:
  - About 30 to 53 FPS on an iPhone 13 or 1st-gen iPad Pro at Low.
  - 60 FPS on an M4 iPad Pro at Medium.
  - 60 FPS on an RTX 4090 at Ultra.
  
  These figures date from v0.0.1. Disabling temporal upscaling sharply drops FPS, and the author suggests a skybox if Low is too slow. Limitations: 4 cloud layers maximum, ghosting and smearing from temporal upscaling, and aerial-perspective artifacts from using mean cloud depth. — [three-clouds README](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)
- `@takram/three-atmosphere` v0.18 to v0.19.1 contains a `src/webgpu/` directory with `AtmosphereParameters`, `AtmosphereContext`, and LUT textures for both WebGPU and WebGL. This indicates a TSL/WebGPU atmosphere port in progress. — [jsDelivr: three-atmosphere 0.19.1 webgpu source](https://cdn.jsdelivr.net/npm/@takram/three-atmosphere@0.19.1/src/webgpu/AtmosphereLUTTexturesWebGPU.ts); [CHANGELOG](https://app.unpkg.com/@takram/three-atmosphere@0.19.1/files/CHANGELOG.md)
- Babylon 9 volumetric lighting uses WebGPU compute with a WebGL2 fallback, for directional lights, with configurable extinction and phase. — [Babylon 9 announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0)
- The Magnopus/PlayCanvas renderer uses raymarched volumetric light at reduced resolution with upsampling, modulated by shadow maps. Its fog toolbox: distance and height fog, fBm ground fog, **fog cards** (textured translucent planes with Fresnel, depth softening and distance fade), and cheap cone-geometry shafts. — [Magnopus blog](https://www.magnopus.com/blog/building-beautiful-worlds-across-platforms-with-playcanvas-and-the-magnopus-web-renderer-featuring-volumetric-lighting)

### Inferences
- The takram atmosphere is a Bruneton-style precomputed model based on its LUT structure; this was not verified on the page. The three.js built-in `Sky` addon is the older Preetham analytic model. Hosek-Wilkie has no maintained web package that was found.
- The game is a town at ground level with a fixed time of day per scene, so a cheap and robust approach can match the overcast benchmark on phones:
  - A **precomputed sky + 2D/2.5D raymarched cloud layer** (or takram clouds at Low).
  - Analytic exponential **height fog + aerial perspective** in the material/fog chunk.
  - Fog cards in valleys.
  
  Full volumetric clouds can stay a desktop default.
- God rays: the owner rejected heavy particles but not shafts. Screen-space radial shafts or takram/Babylon light shafts fit, and are cheap at half resolution.

### Gaps
- No verified current version or date for takram three-clouds beyond the v0.7.4 README read here, and no current mobile numbers (the figures are from v0.0.1).
- No Hosek-Wilkie or Bruneton web implementations other than takram were verified.

## 4. Surfaces: PBR, POM, wet surfaces and puddle reflections, harbour water

### Takeaway
Standard metal/rough PBR (three.js `MeshStandardMaterial`/`MeshPhysicalMaterial`, Babylon PBR or OpenPBR alpha, PlayCanvas StandardMaterial) covers stone, timber, slate and bronze. Wet cobbles with puddles are best done as:
- A **puddle mask** that lowers roughness and darkens albedo.
- **SSR** (three.js TSL SSRNode; built into Babylon) or a cheap **reflection probe / planar reflection** for the square floor.

Harbour water: three.js `Water` addon-style planar reflection plus normal maps.

### Cited Findings
- Three.js WebGPU post nodes include **SSR** and **GTAO**. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- Babylon 9 adds **OpenPBR (alpha)**: base, specular, coat and thin-film parameter groups mapped onto the existing PBR system. — [Babylon 9 Part 3](https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/)
- Reflection probe volumes are used in the production PlayCanvas renderer for local reflections. — [Magnopus blog](https://www.magnopus.com/blog/building-beautiful-worlds-across-platforms-with-playcanvas-and-the-magnopus-web-renderer-featuring-volumetric-lighting)
- `realism-effects` (npm; three.js SSGI, SSR, TRAA, motion blur for WebGLRenderer) exists. — [npm realism-effects](https://www.npmjs.com/package/realism-effects)

### Inferences
- `realism-effects` (by 0beqz) is believed to have been largely unmaintained since 2023 (**possibly outdated**; flagged as pre-2024). It should not be relied on for new work.
- **Puddles** are cheap and work on phones:
  - A world-space noise or height-based mask, which can also be authored per tile in the grid since floors have per-cell heights.
  - Inside puddles: roughness about 0.05, albedo multiplied by about 0.6, normal flattened.
  - Outside puddles: slightly darkened and lower-roughness "damp" stone.
  - Reflections from SSR on desktop, falling back to a **box-projected cubemap probe per square**. Planar reflection costs one extra scene render and is only worth it for the single large water plane.
- **POM** for cobbles and walls: three.js has no built-in POM node, but it is a short TSL/GLSL function. For phones, use normal + AO + height-blended texture splatting instead, or real **instanced cobble geometry** near the camera (see Q7).
- **Harbour water**: a planar reflection (three.js `Water`/`Reflector` addon, older but stable) with scrolling normal maps, depth-based colour absorption (green tint) and a shoreline foam mask. Gerstner waves are unnecessary for a harbour mole. On WebGPU, a TSL water material plus SSR avoids the extra pass.

### Gaps
- No verified 2026 sources for specific three.js POM or puddle implementations, or for the current three.js water addon status.

## 5. Post-processing: tonemapping, LUTs, AO, bloom, AA (no DoF)

### Takeaway
On WebGPURenderer, use the three.js TSL `RenderPipeline` with **GTAO + SSR + bloom + TRAA or SMAA**, AgX or ACES tonemapping, and a LUT. On WebGLRenderer, use **pmndrs postprocessing** (required anyway by takram clouds) with N8AO/SSAO, bloom, LUT, SMAA and tonemapping. Babylon's default rendering pipeline covers the equivalents. Omit DoF entirely, consistent with the owner's preference.

### Cited Findings
- The three.js TSL display nodes include Bloom, FXAA, SMAA, TRAA, GTAO, SSR, DoF and outline. FSR1 and TAAU upscaling nodes were added in r184. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide); [utsubo 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- Ordering pitfall: FXAA and LUT must run after tone mapping, which requires `outputColorTransform = false` and a manual `renderOutput()`. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- pmndrs postprocessing does not work on WebGPURenderer. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- takram clouds rely on pmndrs `EffectComposer`. — [three-clouds README](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)
- PlayCanvas v2.19 examples include a "dual color LUT crossfade". — [PlayCanvas forum](https://forum.playcanvas.com/t/engine-v2-19-0/42321)
- Babylon's Frame Graph manages render-target reuse, with memory savings of 40% or more in some cases. — [Babylon 9 announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0)

### Inferences
- **Painterly look without blur:**
  - AgX or ACES filmic tonemapping (three.js supports both via `renderer.toneMapping`).
  - A hand-graded 3D LUT: desaturated teal shadows and warm highlights.
  - Mild sharpening after TRAA, to offset TAA softness, which the owner may perceive as blur.
  - Optional subtle Kuwahara or edge-aware "paint" filter. Test carefully, because it smooths detail.
- **AA choice**: TRAA/TAA gives the best stability on thin geometry (ropes, timber framing, foliage) but can ghost or smear. SMAA is the safe default on phones. Note the takram clouds already use temporal upscaling with known ghosting.
- **Bloom**: keep the threshold high, so only lanterns, the glowing glass arm and windows bloom. This avoids the "heavy effects" look the owner rejected.

### Gaps
- N8AO's current version and WebGPU status were not checked this session. It is believed to be WebGLRenderer-only.
- No post-processing performance numbers on phones were found.

## 6. First-person viewmodels (hands, sword, glowing glass arm)

### Takeaway
The standard technique in three.js is two render passes:
1. Render the world.
2. Call `renderer.clearDepth()`.
3. Render a separate viewmodel scene with its own camera, at a narrower FOV (about 50 to 60 degrees vs 75 to 90 for the world) and a tiny near plane.

Depth is cleared so the hands never clip into walls. The same pattern is used in Bevy, Godot and Unity, often via a separate layer/camera or a shader that compresses viewmodel depth.

### Cited Findings
- three.js discourse: `renderer.render(scene1, camera1); renderer.clearDepth(); renderer.render(scene2, camera2);`. The cameras need matching position and near/far settings if depth is shared. The thread dates from Sep 2022 (**pre-2024, possibly outdated API-wise**, but the technique is stable). — [three.js discourse](https://discourse.threejs.org/t/rendering-two-different-scenes-with-different-camer's-fov/42911)
- Bevy's official "first person view model" example renders the arm with a separate camera and render layer, so the model can have a different FOV and never clips. — [Bevy example](https://bevy.org/examples/camera/first-person-view-model/)
- A Godot 4.3+ "First Person View Model Shader" squashes viewmodel depth and applies its own FOV in the vertex shader, a single-pass alternative. — [godotshaders](https://godotshaders.com/shader/first-person-view-model-shader-updated-for-godot-4-3/)

### Inferences
- **Post-processing interaction**: if the viewmodel is drawn after the composer, it misses tonemapping/LUT. If it is drawn inside, SSR/GTAO will treat the hands as world geometry. The common solutions:
  - Render the viewmodel into the main buffer before tonemapping, using the depth-squash shader approach so AO/SSR see it at near depth.
  - Or exclude it from AO via a mask or layer.
- In TSL this can be done in the vertex stage (custom `positionNode`) of the hand materials.
- **Glowing crystalline glass arm**:
  - `MeshPhysicalMaterial` with `transmission`, `thickness`, `ior` about 1.5, `iridescence` or `dispersion` (three.js has a dispersion parameter on physical materials; not verified this session), and an `emissive` inner-core mesh plus an emissive fresnel rim.
  - Transmission renders a screen texture of the opaque scene, so it costs an extra pass. On phones, substitute a fake refraction: sample a blurred copy of the frame, or use a cubemap, with fresnel and emissive veins.
  - Bloom gives the glow; no particles are needed.
- Viewmodel detail is cheap, because it is only two meshes always close to the camera. This is where skinned, high-poly, 4K-texture assets give the most visual return per millisecond.

### Gaps
- No 2024 to 2026 source specifically documenting viewmodel rendering in a shipped three.js/PlayCanvas web FPS (for example Venge.io or Krunker internals) was found.

## 7. Converting the tile-grid world to meshes

### Takeaway
Keep the grid as the authoritative map format and generate meshes from it at load:
- Wall-run extrusion and merged geometry per chunk.
- Procedural half-timbered house "kits" (stone plinth, timber frame, plaster infill, slate roof, chimney) placed on wall/house tiles.
- Instanced cobbles, props and roof tiles via `InstancedMesh`/`BatchedMesh`.
- LOD and billboard **impostors** for the long view to the hills and castle.

Clustered lights and Frame-Graph-style render-target reuse keep this tractable on phones.

### Cited Findings
- WebGPU helps most with many draw calls and GPU compute. Chrome's team describes "greatly reduced JavaScript workload for the same graphics". — [utsubo 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- The official three.js WebGPU compute example simulates 200,000 particles, and a Utsubo installation ran about 1 million. This illustrates GPU-instancing headroom on WebGPU. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- Gaussian splats are now first-class in Babylon 9 (with shadows and multi-asset global sorting) and PlayCanvas (first-person navigation examples). They are an option for far scenery such as a captured castle or hills. — [Babylon 9](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0); [PlayCanvas forum](https://forum.playcanvas.com/t/engine-v2-19-0/42321)

### Inferences
- **Pipeline sketch** for each 40x36 map:
  1. Classify tiles (house, wall, street, square, water, quay).
  2. Group contiguous house tiles into building footprints.
  3. For each footprint, generate a building from a seed: storeys 2 to 3; jettied upper floors; timber frame as instanced beams following rules (posts at corners and openings, braces, rails); plaster infill quads with a vertex-colour tint; a gable or hip roof with a slate-tile normal map or instanced slates for near LOD; chimneys with emissive-free smoke done as a cheap shader plume rather than particles.
  4. Merge static geometry per chunk (for example 8x8 tiles) with `BufferGeometryUtils.mergeGeometries` or `BatchedMesh`.
  5. Scatter props (crates, barrels, tents, bollards, ropes) as `InstancedMesh`.
  6. Make cobbles real geometry instances within about 10 m, and a texture with POM/normal farther out.
- **Long view distance**:
  - Beyond the grid, add a ring of low-poly hill terrain and a castle mesh at reduced LOD.
  - Add an octahedral impostor or a skybox-layer "matte painting" card for the far castle and hills. A painted backdrop fits the painterly target and is nearly free on phones.
  - Aerial perspective from the atmosphere does most of the "distance" work.
- The existing raycaster's per-cell floor heights and doors map directly to extruded floor slabs and door meshes. Billboard NPCs can stay as camera-facing sprites initially, which is a fair interim step, then move to skinned glTF characters.
- The big autumn oak: one hero tree mesh with alpha-tested leaf cards and wind vertex animation. No particle systems, consistent with the owner's preference.

### Gaps
- No verified 2026 source for procedural half-timbered building generators in JS. No verified source for three.js impostor libraries (for example a `three-impostor`-type package), their versions, or their mobile performance.

## 8. Concrete examples of high-end web 3D, and phone support

### Takeaway
WebGPU now ships by default in Chrome/Edge desktop, Chrome Android 12+, Safari 26 (macOS/iOS/iPadOS) and Firefox (Windows; Apple Silicon macOS). Firefox Android still needs a flag, and older iPhones lack WebGPU. A WebGL2 fallback path is therefore mandatory for the phone co-op player. Verified, quantified "photoreal shipped web game" evidence was thin in this session. The best hard numbers are takram's cloud benchmarks and the engine vendors' demos.

### Cited Findings
- WebGPU support status (web.dev, 25 Nov 2025):
  - Safari 26 on iOS, iPadOS, macOS and visionOS.
  - Chrome Android from v121 on Android 12+ with Qualcomm/ARM GPUs.
  - Firefox 141 on Windows and 145 on Apple Silicon macOS.
  - Firefox Android "in progress".
  
  — [web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- A later update (utsubo, 2026): Chrome Linux since v144 (Intel) and v147 (NVIDIA on Wayland); Firefox on all Apple Silicon macOS since v147; Firefox Linux and Android still behind a flag. It advises testing in-app browsers. — [utsubo 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- iOS below 26 runs the WebGL2 backend. Test the `?webgl` fallback path on real devices. — [utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)
- Vendor demos showing the relevant features:
  - [Babylon clustered lights](https://aka.ms/babylon9CLDemo)
  - [Babylon volumetric lighting](https://aka.ms/babylon9vlDemo)
  - [Babylon IBL shadows](https://aka.ms/babylon9IBLSDemo)
  - [Babylon OpenPBR](https://aka.ms/babylon9OPBRDemo)
  
  — [Babylon 9 blog](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0), [Part 3](https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/)
- Cloud and atmosphere benchmark: takram clouds run at about 30 to 53 FPS on an iPhone 13 at Low, 60 FPS on an M4 iPad Pro at Medium, and 60 FPS on an RTX 4090 at Ultra. — [three-clouds README](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)
- Three.js showcase items in 2025 to 2026:
  - The Vibe Coding Game Jam 2025 had 1,000+ entries; the winner was *The Great Taxi Assignment* ([winners](https://levels.io/winners-of-the-2025-vibe-code-game-jam)).
  - The "Waves of Connection" Expo 2025 installation ran on a 98-inch 4K display, with no FPS figures ([case study](https://www.utsubo.com/blog/hokusai-interactive-installation)).
  
  Neither is a photoreal RPG. — [utsubo 2026](https://www.utsubo.com/blog/threejs-2026-what-changed)
- A production PlayCanvas renderer (Magnopus, for Connected Spaces/OKO) ships volumetric lighting, light probes, baked lightmaps, clustered forward rendering and reflection probes, but gives no FPS numbers. — [Magnopus blog](https://www.magnopus.com/blog/building-beautiful-worlds-across-platforms-with-playcanvas-and-the-magnopus-web-renderer-featuring-volumetric-lighting)
- Snap is cited as a large PlayCanvas production user (vendor-authored comparison). — [cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)

### Inferences
- **Quality tiers** are required to satisfy "maximum graphics by default" on desktop while keeping the phone co-op player smooth:
  - **Desktop/WebGPU "Ultra" (default):** volumetric clouds, SSR, GTAO, TRAA, clustered shadowed lanterns, transmission glass arm.
  - **Phone "Mobile High":** baked probes/lightmap, a 2-cascade sun, unshadowed clustered lanterns, a cloud skybox or Low clouds, cubemap reflections for puddles, SMAA, bloom and LUT, and a fake-refraction glass arm.
  
  Auto-detect the tier, but let the owner override it.
- Known high-end web shooters (Venge.io and Krunker in PlayCanvas/three.js, Bruno Simon's portfolio) are stylised, not photoreal. They prove smooth first-person rendering on phones, but not the benchmark's look.

### Gaps
- No verified, current (2024 to 2026) page was fetched for Venge.io, Krunker, Bruno Simon's portfolio or Three.js Journey showcases. Claims about them above are background knowledge, not sourced.
- No found source gives FPS numbers for a photoreal medieval town scene in a browser on a phone. This should be prototyped and measured.
- No GDC/SIGGRAPH 2025 to 2026 talks on browser rendering were located in this session.
