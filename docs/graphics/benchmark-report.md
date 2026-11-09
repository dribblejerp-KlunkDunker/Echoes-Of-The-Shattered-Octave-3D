# Rebuild the Octave's renderer, then its world

**Bottom line:** The game can reach the look of the owner's three concept images without leaving the browser. It does not need a move to Godot, Unity or Unreal. The work, though, is mostly building the world rather than adding shader effects. Two things are needed. First, R3D's hand-written WebGL2 view should be replaced by Three.js (its WebGPU renderer, which falls back to WebGL 2 by itself) as a new view layer over the existing JS game logic. Second, the 64x64 pixel textures and sprite props should give way to an asset pipeline the AI can run: scanned CC0 materials, procedurally built half-timbered houses on one shared trim-sheet texture, CC0 characters and animations, and a licence record for every file. Staying on the web matters because it is the only path that keeps the offline PWA, peer-to-peer phone co-op, French text and the Playwright suite at once. Godot's web export is still limited to WebGL 2 with none of the lighting features that make the look. Unity needs a full C# rewrite. Unreal has no web export at all ([Godot docs](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt); [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export)). The overcast benchmark helps: soft sky light, ambient occlusion, a few warm lanterns and tinted distance fog are much cheaper than hard sun shadows or volumetric clouds. Each player's device can also render at its own quality level, so the brother's phone does not limit the desktop. The biggest risks are not rendering features. They are (1) making enough consistent art without a 250-person studio, (2) iPhone Safari killing the tab without warning when memory runs short, and (3) the fact that the AI's workspace has no GPU, so frame-time targets have to be measured on the owner's own machines. The plan below runs in seven phases, from Phase 0 to Phase 6. Each phase ends in a side-by-side screenshot against a benchmark image or a frame-time target on a named device tier.

*How to read this report:* claims with a link are cited from the research notes. Text marked **(inferred)** is the researchers' or this report's reasoning, or well-known practice they did not re-check. **(weak source)** marks claims that rest on a vendor blog, an undated post, an old page or a single forum report. Facts about the game and the owner's rulings are marked **(project context)**.

## The gap to the benchmarks is assets, not lighting

R3D already has much of what the concept images use: hemisphere ambient light, sun and moon light with heightfield shadows, per-pixel point lights, depth and height fog tinted to the sky, Fresnel water reflection and bloom on emissive surfaces **(project context)**. What it does not have is the content those lights fall on. Its textures are 64x64 and nearest-filtered. People and props are billboards or voxel extrusions of painted sprites. Walls are tile-grid extrusions, not houses with jettied upper floors, rooflines and chimneys **(project context)**. The concept images get their quality from dense, functional set dressing, varied silhouettes, wet materials and a coherent grade. These are art-direction and asset problems first **(inferred)**.

The closest shipped references point in two directions. Kingdom Come: Deliverance II is the model for grounded, historically plausible towns. But Warhorse grew **"from 35 people to 250"** to build it, so its photoreal density is a large-team result ([GodIsAGeek](https://godisageek.com/2024/08/kingdom-come-deliverance-ii-interview-when-i-started-we-had-35-people-now-we-have-250)). Dishonored offers the method a small team can actually copy. It was hand-made and was deliberately "neither a dark medieval setting nor photorealistic." Viktor Antonov defined its "whole new design language" partly by what it banned ("no rivets, no brass, no copper, and no tubes"). The team also detailed only the story-relevant parts of the city and left the rest unbuilt ([GamesBeat](https://gamesbeat.com/how-dishonoreds-artists-created-an-oppressive-world-from-scratch/)). A Plague Tale: Requiem, set in 14th-century south-east France, spent "more than three years" on visuals ([ArtStation Magazine](https://magazine.artstation.com/2023/01/asobo-studio-a-plague-tale-requiem-art-blast/)). The Witcher 3's Beauclair talk centres on spending texture and mesh budgets wisely in a dense city ([GDC Vault](https://gdcvault.com/play/1023965/Building-Beauclair-Capital-City-in)), which is the browser's problem in a harsher form.

For Aethelgard this suggests three things **(inferred)**. Take KCD2's architecture and overcast autumn light. Take Dishonored's painterly finish and selective detail. Write a ban list in the same spirit: no neon, no saturated primaries outside the HUD vials, and cyan-violet only for glass and resonance. That last rule also fits the canon: in a world of the Hush, magic is the one thing allowed to glow. Detail the square, the gate and the mole densely, and let everything past mid-distance become silhouette and fog.

### Overcast light is the cheap kind of beautiful

The researchers found no primary-source numbers (key-to-fill ratios, colour temperatures, LUT settings) from any shipped game's lighting artist. The recipe below is therefore standard practice, not a cited fact **(inferred)**. Overcast daylight is one large soft source. The sky hemisphere is the key light, ground bounce is the fill, and a ratio of roughly 2:1 to 3:1 reads as a dull day. Contrast comes from ambient occlusion under eaves, in doorways and beneath market tents, not from cast shadows. Warm practical lights (roughly 2000–2700 K lanterns and windows) are the only saturated warm notes against cool grey daylight. A filmic tonemapper (AgX or ACES), a hand-graded 3D LUT with teal-grey shadows, and 10–20% global desaturation pull the frame together. Distance fog tinted to the sky, not grey-black, does the job the owner's ban on depth of field rules out: it stacks the frame into foreground, middle and background value bands, the way a painting does. Players who modded The Witcher 3 back toward its darker 2013 trailer grade show that this grim, overcast palette is what many people read as "concept art" quality ([GameGPU](https://en.gamegpu.com/news/igry/modifikatsiya-vgx-lighting-vozvrashchaet-pervonachalnyj-mrachnyj-stil-the-witcher-3); [Nexus Mods](https://nexusmods.com/witcher3/mods/6501)).

Wet cobbles are the single strongest concept-art cue in the square image, and they come almost entirely from materials **(inferred)**. Water collects in the gaps between stones first. A puddle mask lowers roughness to about 0.05–0.3 and darkens albedo by 20–40%. Something bright, such as warm lanterns or the sky, must reflect in those puddles, or wet stone just looks dark. Because the game's floors already store per-cell heights **(project context)**, puddle masks can be generated from the tile grid **(inferred)**. Josh Lynch's point that "if the material isn't set up properly it just won't show off well" is the rule underneath all of this ([80.lv](https://80.lv/articles/5-rules-of-environment-design); a 2016 article, **weak source** on currency).

### Hands and HUD are where detail costs least

First-person arms are two meshes that are always close to the camera. That makes them the place where high-poly skinned models and large textures give the most visual return per millisecond **(inferred)**. The standard technique has a source. Many shooters render arms at a separate field of view so animators can work at a fixed FOV ([Unreal forums](https://forums.unrealengine.com/t/render-your-first-person-arms-weapons-at-a-separate-fov-than-your-camera-fov/237944)). In Three.js that means rendering the world, clearing depth, then rendering a viewmodel scene with its own camera ([three.js discourse, 2022](https://discourse.threejs.org/t/rendering-two-different-scenes-with-different-camer's-fov/42911); a pre-2024 thread, but the technique is stable). Bevy's official example works the same way ([Bevy](https://bevy.org/examples/camera/first-person-view-model/)). A Godot 4.3 shader instead squashes viewmodel depth in a single pass ([godotshaders](https://godotshaders.com/shader/first-person-view-model-shader-updated-for-godot-4-3/)).

The common failure is the hands looking pasted on because they miss the scene's lighting and grade. Two fixes **(inferred)**. Render the viewmodel before tonemapping, using the depth-squash approach, so the LUT and fog apply to it. And tint its ambient light from the nearest lantern. The cyan glass arm should be a Fresnel-rim emissive shader with scrolling inner "veins". It can pulse with in-game sound, which ties it to the lore of the Hush. A tiny cyan point light on the arm lets the magic limb light nearby walls. True transmission costs an extra screen pass, so phones should get a cubemap-based fake refraction instead **(inferred)**. Dishonored's marked left hand is the shipped precedent for "one hand is magic" ([Dishonored Wiki](https://dishonored.fandom.com/wiki/File:Arm_Artifact_Concept.png)).

The bronze HUD should stay HTML/CSS. That keeps the French strings, keyboard and screen-reader access, and Playwright's ability to inspect the DOM **(inferred)**. Ornate frames are built with 9-slice scaling (CSS `border-image`): corners stay fixed while edges stretch. The same model underlies Coherent Gameface, HTML/CSS UI middleware used in shipped games ([Coherent Labs](https://guide.coherent-labs.com/layout-assets-and-styling/graphics--shapes/advanced-ui-shapes/)), and Roblox's UI system ([Roblox docs](https://create.roblox.com/docs/en-us/ui/9-slice.md)). Kenney's CC0 Fantasy UI Borders can serve as placeholders while the AI paints the final bronze frame ([itch.io](https://kenney-assets.itch.io/fantasy-ui-borders)). Below about 600 px width, the bar should shrink to the three vials, weapon and compass, with touch targets of at least 44–48 CSS px **(inferred)**.

## Three.js keeps every constraint; the other engines break at least one

The engine question has a clear answer once the owner's non-negotiables are applied. The table summarises the researchers' fit analysis; the cells are their reasoning from the cited findings **(inferred)**.

| Path | Offline PWA | Phone co-op | French text | Playwright suite | JS logic reused |
|---|---|---|---|---|---|
| Three.js renderer swap (recommended) | Kept | Kept | Kept | Kept, plus visual diffs | All |
| JS host wrapped in Electron/Tauri for desktop | Kept | Kept | Kept | Kept | Most |
| Godot web export | Built-in PWA | Rebuild over WebRTC | Re-import | Lost | None (GDScript rewrite) |
| Unity 6.6 web (WebGPU) | Service worker written by hand | Rebuild | Re-import | Lost | None (C# rewrite) |
| Unreal 5 (Pixel Streaming) | Lost | Lost | Re-import | Lost | None |

Godot looks tempting because Forge is already Godot 4.3, and desktop Forward+ ships SDFGI, volumetric fog, SSR and SSAO/SSIL. But its web export "requires support for WebAssembly and WebGL 2.0", and "Forward+/Mobile are not supported on the web platform" ([Godot docs](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt)). The Compatibility renderer has none of those features and allows 8 lights per object ([slicker.me](https://slicker.me/godot/renderers.html), a secondary source that mirrors the [official renderers page](https://docs.godotengine.org/fr/4.5/tutorials/rendering/renderers.html)). So the phone would get Godot's weakest renderer, and all the JS game logic would have to be ported. An experimental third-party WebGPU backend shown at GodotCon Boston in July 2026 runs Forward+ in browsers at about 4x the speed of the WebGL path. Its author calls it "experimental" ([GodotCon Boston 2026](https://talks.godotengine.org/godotcon-boston-2026/talk/CT739D/)). It is worth watching, not building on.

Unity 6.6 made WebGPU a fully supported web target in September 2026. That brings GPU Resident Drawer, Adaptive Probe Volumes and upscaling to the web, and 3D URP builds start around 10.7 MB ([Cinevva](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production); **weak source**, a web-games vendor). It still means a C# rewrite and a paid licence above $200K revenue. Unity games are also disabled on iOS by default on CrazyGames "due to memory-related crashes" ([CrazyGames](https://docs.crazygames.com/requirements/technical)), a bad sign for the brother's phone if it is an iPhone. Unreal's only browser route, Pixel Streaming, needs a live cloud GPU per player, so it fails offline play outright ([Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export); **weak source**, a competing vendor).

Forge does not force the engine choice. It exports GLB, which Three.js loads natively **(inferred)**. If Godot's web path matures later, the same assets carry over.

### Three.js in late 2026 has most of the parts, if the sources hold

The latest release is r187 (30 Oct 2026). Over 2026 the releases added the features this look needs: `LightProbeGrid` for baked bounce light, FSR 1 and TAAU upscaling, and TSL node materials on WebGLRenderer (r184); clustered (Forward+) lighting (r185); a `SunLight` addon with cascaded shadows for both renderers (r186); and spot lights in the clustered path (r187). `WebGPURenderer` needs no bundler and falls back to WebGL 2 by itself ([Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)). Its TSL post-processing nodes include GTAO, SSR, bloom, SMAA, TRAA and FXAA ([Utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)).

**This whole feature list is weakly sourced.** It comes from a three.js services agency's blog, because the official release notes could not be fetched. A second vendor page even contradicts the clustered-lighting claim ([Cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)). The first engineering task is to confirm these features in the actual r187 package.

The same sources describe a real fork with costs. On WebGPURenderer, `ShaderMaterial` and `onBeforeCompile` are not supported, pmndrs postprocessing does not run, and LUT or FXAA passes need a manual `renderOutput()` ([Utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide)). The best off-the-shelf atmosphere, takram's MIT clouds, works only on WebGLRenderer with pmndrs. It managed only about **30–53 FPS on an iPhone 13 at its Low preset**, in benchmarks from its first release ([three-clouds README](https://cdn.jsdelivr.net/npm/@takram/three-clouds@0.7.4/README.md)). WebGPURenderer is also "not faster everywhere" and should be profiled against WebGL ([Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)).

The overcast benchmark settles the fork **(inferred)**. A flat grey autumn sky does not need volumetric clouds. A painted or precomputed sky dome, analytic height fog and a few fog cards in the valleys match it, and run on phones. So the recommendation is WebGPURenderer with TSL, which is one codebase with an automatic WebGL 2 fallback, and no takram clouds. R3D's existing GLSL fog and sky logic gets ported to TSL rather than kept as raw shaders.

Babylon.js 9 is the fallback if the Three.js spike disappoints. It ships clustered lighting on both WebGL 2 and WebGPU, volumetric light shafts, dynamic IBL shadows, OpenPBR (alpha) and a frame graph that saves "40% or more" GPU memory in some cases ([Windows Dev Blog](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0); [Part 3](https://blogs.windows.com/windowsdeveloper/2026/04/02/part-3-babylon-js-9-0-openpbr-and-additional-engine-updates/)). The cost is rewriting more of the raw-WebGL code that the game already has **(inferred)**.

### The tile grid stays the map; meshes are generated from it

The tile maps stay the source of truth. The view generates meshes from them at load **(inferred)**:

1. Classify tiles as house, wall, street, square, water or quay.
2. Group house tiles into building footprints.
3. Grow each footprint from a seed into a 2–4-storey building: jettied upper floors, a timber frame of instanced beams, tinted plaster infill, and a gable or hip roof with chimneys.
4. Merge the static geometry per 8x8-tile chunk.
5. Scatter crates, barrels, tents and ropes as instanced meshes.
6. Within about 10 m, make the cobbles real instanced geometry; farther out, use a normal-mapped texture.

The "long view distance" in the benchmarks is the castle on its hill. (Lore: there is no castle in the books; in this game the far view is the Grey Teeth, the downs and Greenroot's spire.) It can be a low-poly ring of terrain plus a painted matte card tinted by the fog. That suits the painterly target and costs almost nothing on phones **(inferred)**. Gaussian splats, now first-class in Babylon 9 and PlayCanvas ([Windows Dev Blog](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0)), are an alternative for captured distant scenery. The great oak should be one hero mesh with alpha-tested leaf cards and wind animation in the vertex shader, with no particles, in line with the owner's ban on busy effects **(inferred)**.

## An AI-run asset factory, built from CC0 scans, procedural kits and a licence record

The owner is not an artist, and the AI's workspace has no GPU **(project context)**. The pipeline therefore has to lean on four kinds of source. The table lists the ones the notes support; licence facts are cited, "runs in workspace" is inferred.

| Tool or source | Job | Licence / terms | Runs in GPU-less workspace? |
|---|---|---|---|
| Poly Haven, ambientCG | Scanned PBR materials, HDRIs, props (barrels, rocks, furniture) | CC0, commercial, may ship inside a game ([Poly Haven](https://polyhaven.com/license); [ambientCG](https://docs.ambientcg.com/license/)) | Yes (download) |
| Forge JSON recipes or `bpy` scripts | Half-timbered house kit, chapel, stalls, mole, hedge gate, sword, glass arm | The owner's own code | Yes (`bpy` installs with pip) |
| MPFB2 (MakeHuman for Blender) | Townsfolk bodies; first-person arms cut at the shoulder | Core assets CC0; exported models may be sold ([MPFB FAQ](https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html)) | Yes, headless **(inferred)** |
| Quaternius Universal Animation Library 2 | 130+ animations incl. melee combos, universal humanoid rig | CC0, released Jan 2026 ([Quaternius](https://quaternius.com/packs/universalanimationlibrary2.html)) | Yes |
| Kenney, Quaternius model kits | Blockout and placeholder geometry only (too stylised for the final look) | CC0 ([Kenney](https://kenney.nl/support)) | Yes |
| TRELLIS.2 | Image-to-3D for one-off props | MIT code and weights; needs an NVIDIA GPU with at least 24 GB, Linux only ([GitHub](https://github.com/microsoft/TRELLIS.2)) | No; rented GPU |
| Stable Fast 3D, SD 3.5 | Image-to-3D; albedo variants | Stability Community Licence, free under $1M revenue, user owns outputs, no territory limit ([Stability AI](https://stability.ai/license)) | No; GPU needed |
| Megascans via Fab | Premium European stone, wood and cobble scans | Paid since 2025 from $0.99 per asset ([Epic forums](https://forums.unrealengine.com/t/quixel-to-fab-transition-faqs/2033839)); EULA summary silent on web builds where files can be extracted ([Fab](https://www.fab.com/eula)) | Yes (download), after a licence check |
| gltf-transform, gltfpack | Prune, weld, simplify, instance, palette; Meshopt geometry; KTX2 textures | Open tools ([gltf-transform](https://gltf-transform.dev/cli); [meshoptimizer](https://meshoptimizer.org/gltf/)) | Yes |
| Hunyuan3D, HY-Motion, LAFAN1, GVHMR | None | Hunyuan3D's licence excludes the EU, UK and South Korea and bans use of outputs there ([Hugging Face](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE)) | Excluded by owner's rule **(project context)** |

Two licence traps are worth naming because a PWA makes every GLB downloadable. Mixamo is royalty-free for games, but raw character and animation files must not be redistributed, and its FAQ dates from 2022 and calls the service a "technology preview" ([Adobe community](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775); **weak source** on currency). CC0 Quaternius animation removes the question. Meshy's free tier outputs are CC BY 4.0 and need a credit, while paid plans grant ownership ([Meshy](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects)). Poly Haven's terms of service ban scraping the site, so bulk fetching should use its official API. The API's existence was not checked this session **(weak source)**.

### Consistency is a script, not a talent

Mixing sources without a shared standard produces the "kit-bashed" look the benchmarks avoid. The strongest cited lever is the trim sheet: the Medieval City Generator puts many buildings on one shared texture atlas ([80.lv](https://80.lv/articles/geometry-nodes-powered-medieval-city-generator-for-blender/)). That keeps a whole town coherent and cuts draw calls and texture memory together.

The rest of the art bible is standard practice the notes did not verify **(inferred)**:

- a palette of 12–16 swatches, with reserved-colour rules;
- albedo clamped to roughly sRGB 30–240;
- one texel density (about 256 px/m for buildings, 512 px/m for hero props, higher for hand-held items);
- 10–20 shared tiling materials (cobble, slate, oak, daub, rough stone, wet stone, wool, rope, iron, bronze);
- a scale sheet (doors 2.0–2.2 m, barrels about 0.9 m);
- a vertex-paint convention: R = moss, G = wetness, B = dirt, A = edge wear.

Clutter should gather at boundaries, in odd-numbered groups, with each group answering "who uses this?": the cooper's barrels by his door, fish crates on the mole, wool bales by the hedge gate **(inferred)**.

Every asset, downloaded or generated, then goes through one normalisation script. The script re-UVs to the set texel density, grades albedo toward the palette, sets roughness floors, forces metalness to 0 or 1, re-bakes onto the house trim sheets, and runs gltf-transform. Forge's provenance file and review page should be extended to cover CC0 downloads too. That way every shipped file has a source, a licence and the owner's approval on record **(inferred)**.

One limit matters: no permissively licensed text-to-PBR tool was verified, and diffusion models need a GPU. In the workspace, new textures come from CC0 scans plus procedural NumPy or Blender-node variation **(inferred)**. Headless Blender should export GLB and render review thumbnails without a GPU using Cycles on the CPU (slow). Eevee usually fails in a headless container. These are background claims, not measured this session **(weak source)**.

## Phones set the floor through memory and pixels, not features

WebGPU now ships by default in Chrome and Edge on desktop and ChromeOS (v113+), Chrome Android 121+ on Android 12+ with Qualcomm or ARM GPUs, Safari 26 on iOS, iPadOS and macOS, and Firefox 141+ on Windows ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)). Firefox Android is still behind a flag, and Samsung Xclipse GPUs are listed as "probably 154" ([gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)). An iPhone below iOS 26 has no WebGPU at all, so a WebGL 2 path is mandatory for the phone player. Mobile WebGPU is also uneven. One Pixel 5 user found WebGL 2 "significantly better" in June 2026, then found WebGPU matching or beating it by September, and the community advice was to ship both backends and choose at runtime ([Babylon.js forum](https://forum.babylonjs.com/t/webgpu-on-mobile-is-it-ready/63694)). Every visual feature should therefore work on WebGL 2, with WebGPU-only work as an optional upgrade **(inferred)**.

The hard budget numbers are few. PlayCanvas gives **100–200 draw calls as a rough target for low-end mobile**, against thousands on desktop. It warns that rendering at native device pixel ratio "can fill many more pixels and sharply reduce frame rate", and notes that **each shadowed point light renders the scene six times** ([PlayCanvas](https://developer.playcanvas.com/user-manual/optimization/guidelines/)). Resolution is also the main thermal lever. In Netmarble's native Android game, dynamic scaling turned FPS swings of 40–56 into a steady 50–60, and resolution scaling had the largest effect on GPU load and heat ([Android Developers](https://developer.android.com/stories/games/netmarble-got-adpf)). That is a native result, not a web one. CrazyGames runs games at device pixel ratio 1 on iOS and low-memory Android, and requires smooth play on a 4 GB Chromebook ([CrazyGames](https://docs.crazygames.com/requirements/technical)).

The sharpest risk is the iPhone. WebKit bug 300782, still open in March 2026, records iOS killing WebGL-heavy Safari tabs under memory pressure **with no JavaScript error and no `webglcontextlost` event first**. Sometimes the tab is stuck in a reload loop ([WebKit Bugzilla](https://bugs.webkit.org/show_bug.cgi?id=300782)). Even an iPhone 16 Pro Max crashed after about ten minutes in one three.js report ([three.js forum](https://discourse.threejs.org/t/safari-any-web-browser-crash-on-iphone-when-use-webgl/81629)). Apple publishes no per-tab limit. The defences are **(inferred)**:

- KTX2 textures, which stay compressed in GPU memory ([Khronos](https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets));
- streaming per town;
- explicit disposal of geometry, materials and textures;
- no spikes from decoding many PNGs at once;
- frequent co-op saves, so a silent reload on the phone costs nothing.

Characters hit limits early. One three.js write-up saw frame drops beyond about 20 avatars, because 20 multi-part people meant 200+ skinned meshes; instancing raised that past a hundred ([dev.to](https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm); **weak source**, undated, no device figures). On the phone, about 30 townsfolk means single-mesh, single-material characters, full skinning for only the nearest few, and baked animation updated at 10–15 Hz for the rest **(inferred)**.

Storage is no longer the limit. Safari 17+ and Chrome allow each origin up to about 60% of disk. The risk is eviction: Safari deletes script-written data for origins with no interaction in the last **7 days of browser use**, and eviction removes everything for that origin at once ([MDN](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria); [WebKit](https://webkit.org/?p=14403)). The brother's phone should install the game to the Home Screen and call `navigator.storage.persist()`, and the host should keep the authoritative save **(inferred)**.

### Two settings, not one

The owner asked for realism by default, the pixel look as an option, and a player-adjustable quality setting **(project context)**. These are two separate choices, and the settings menu should treat them that way **(inferred)**:

- **Art style:** Realistic or Pixel. Pixel keeps today's 64x64 textures, sprites and voxel props through the same renderer.
- **Quality:** Ultra, High or Phone.

In co-op, each peer renders its own view at its own tier while sharing game state, so the desktop never drops to the phone's settings **(inferred)**. The tier contents below are a proposed design; only the marked items are cited.

| | Ultra (desktop default) | High (integrated GPU, Chromebook) | Phone |
|---|---|---|---|
| Backend | WebGPU, WebGL 2 fallback | WebGPU or WebGL 2 | Chosen at runtime by quick benchmark |
| Render scale | Native, dynamic down to ~0.75 | ~0.8, dynamic | DPR ≤1 (CrazyGames practice) and dynamic, target ≤33 ms |
| Draw calls | 1,000+ | ~500 | ≤150–200 ([PlayCanvas](https://developer.playcanvas.com/user-manual/optimization/guidelines/)) |
| Sun shadows | Cascaded, 3–4 cascades | 2 cascades | 1–2 cascades at 1024 |
| Lanterns | Clustered, a few shadowed near the player | Clustered, unshadowed | Baked or emissive plus a few unshadowed; zero shadowed point lights |
| Ambient occlusion | GTAO | GTAO at half resolution | Baked into vertex colour or a probe grid |
| Puddle reflections | SSR plus probes | Cubemap probe per square | Cubemap probe per square |
| Harbour water | Planar reflection | Planar at half resolution | Cubemap |
| Anti-aliasing | TRAA plus mild sharpening | SMAA | SMAA |
| Glass arm | True transmission | Fake refraction | Fake refraction |
| Townsfolk | All skinned at full rate | Nearest 10 skinned | Nearest 3–6 skinned, rest baked |

Tier detection should start from detect-gpu. Its benchmark data **stopped updating in December 2025** ([GitHub](https://github.com/pmndrs/detect-gpu)), so its guess needs checking against a 2–3 second in-scene warm-up. After that, frame time drives dynamic resolution continuously, and the chosen tier is saved per device **(inferred)**.

## A seven-phase plan with screenshot and frame-time gates

The workspace cannot measure real frame times, because without a GPU headless Chromium falls back to software rendering **(inferred)**. The first deliverable is therefore an in-game benchmark overlay that exports a JSON report. The owner runs it on his PC and the brother runs it on his phone. Visual gates are side-by-side screenshots taken in Playwright from fixed camera positions matching each concept image, plus a greyscale version of each to check the value bands. The owner approves them on a review page in the style of Forge's **(inferred)**.

| Phase | Work | Checkable outcome |
|---|---|---|
| 0. Groundwork | Art bible (palette, ban list, texel density, material list, scale sheet); benchmark cameras for the three images; benchmark overlay with JSON export; Art style and Quality settings that persist; licence-record format extended from Forge | Owner signs off the art bible; JSON benchmark reports in hand from the owner's PC and the brother's phone; the phone's model and iOS/Android version recorded |
| 1. Renderer spike | Three.js r187 WebGPURenderer as a new view over the tile grid. Confirm clustered lights, SunLight cascaded shadows, LightProbeGrid and the TSL post nodes in the real package. CC0 materials on extruded geometry; hemisphere light, height fog, AgX plus LUT, GTAO, bloom. R3D and the raycaster stay available | The full Playwright suite passes; town-square screenshot at the benchmark camera; ≤16.6 ms on the owner's desktop at Ultra and ≤33 ms on the brother's phone at Phone tier, with the WebGL 2 fallback forced and working. If this fails, Babylon 9 gets the same spike |
| 2. Hero square | Procedural half-timbered house kit on one trim sheet (Forge or `bpy`); chapel; market stalls; hero oak with leaf cards and wind; instanced clutter following the art-bible rules; wet cobbles with puddle mask and probe reflections; clustered warm lanterns; the Grey Teeth and the downs as a terrain ring plus matte card (no castle: not in the books) | Owner approves the side-by-side against the square concept image; greyscale bands match; ≤200 draw calls at Phone tier; a 20-minute phone session without a tab reload |
| 3. Hands and HUD | MPFB2 arms and gloved hand; procedural sword and faceted glass arm; UAL2 idle and melee clips; separate-FOV viewmodel inside the tonemapped pass; bronze 9-slice HUD with SVG vial gauges; collapsed phone layout | Owner approves the hands and HUD against the concept images; HUD readable at 360 px width with 44–48 px touch targets; every French HUD string fits without clipping (Playwright check) |
| 4. Gate and harbour | Thorn-and-wool hedge gate (alpha cards plus a wool shader); stone mole, boats, rope coils, bollards; harbour water with depth tint and planar or cubemap reflection by tier | Owner approves side-by-sides against the gate and harbour images; both scenes meet the Phase 1 frame-time targets |
| 5. People | Replace billboards with single-mesh MPFB2 townsfolk in period clothing (custom or shader-tinted, since stock MPFB clothing is modern); skinning and LOD by tier | 30 townsfolk in the square at the Phone frame-time target; every canon character from the books still present and recognisable |
| 6. Roll-out and delivery | All maps through the generator; per-town GLBs with Meshopt plus KTX2; versioned per-town caches; `persist()`; disposal on map change; visual-regression baselines in Playwright | First-play download ≤ ~50 MB (in line with [CrazyGames](https://docs.crazygames.com/requirements/technical)' web norm); full offline play after install; walking between towns on the phone for 30 minutes causes no reload; Pixel style still passes its own screenshot set |

### Biggest risks

| Risk | Why it is real | Mitigation |
|---|---|---|
| Art volume and consistency | KCD2's density took a team of 250 ([GodIsAGeek](https://godisageek.com/2024/08/kingdom-come-deliverance-ii-interview-when-i-started-we-had-35-people-now-we-have-250)); mixed sources clash | Dishonored-style selective detail; trim sheets; one normalisation script; three hero vistas first |
| Silent iPhone tab kills | No error and no context-lost event ([WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782)) | KTX2, streaming, disposal, frequent saves, early long-session tests on the real phone |
| AI cannot measure performance | No GPU in the workspace **(project context)** | Benchmark overlay and JSON reports from real devices at every gate |
| Three.js feature claims | Vendor blog only, partly contradicted ([Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed) vs [Cinevva](https://app.cinevva.com/blog/2026-06-09-web-game-engines-2026-comparison)) | Confirm in Phase 1; Babylon 9 as a named fallback |
| Licence contamination | Hunyuan territory clause; Mixamo redistribution; Fab silent on web builds; unstated licences on Geometry Nodes kits ([80.lv](https://80.lv/articles/grab-a-free-geometry-nodes-library-for-procedural-buildings-in-blender/)) | CC0-first sourcing; a provenance record per file; owner approval on the review page |
| "Painterly" reading as blur | TAA softness and Kuwahara-style filters smooth detail **(inferred)** | SMAA default on lower tiers, sharpening after TRAA, any paint filter as an opt-in setting |
| Test-suite churn | GPU output varies between machines **(inferred)** | Keep logic and DOM tests as they are; use tolerance-based screenshot diffs with software-rendered baselines |
| Phone saves wiped | Safari's 7-day eviction rule ([MDN](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) | Home Screen install, `persist()`, saves held by the host |

### Decisions still open for the owner

The owner needs to decide:

- **Spending.** Whether a small budget is allowed for a rented 24 GB GPU (TRELLIS.2, Stable Fast 3D) and for paid Megascans assets. Without one, the asset factory stays CC0 plus procedural.
- **The phone.** Which phone the brother actually uses, and its OS version. This sets the Phone tier and decides whether WebGPU is even available to him.
- **Distance.** Whether the far ring (the Grey Teeth and the downs) can be a painted matte backdrop, or must be walkable geometry.
- **Pixel mode.** Whether the Pixel style must keep full parity with new content, or becomes a legacy option frozen at today's assets.
- **Painterly filter.** Whether a subtle edge-preserving painterly filter is wanted at all, given the ban on blur.
- **Asset factory.** Forge, `bpy`, or both. Forge has the review page and provenance record; `bpy` has MPFB2 and Blender's tools.
- **Frame-rate targets.** Whether 60 fps on desktop and 30 fps on the phone are the right floors.

## Conclusion

Swapping engines is the less important decision here. The research suggests the real question was never whether a browser can draw the concept images. Three.js or Babylon can, and an overcast autumn palette is unusually kind to phone GPUs. The real question is whether a solo owner with an AI assistant can supply the art those renderers need. The answer that emerges is a factory rather than an artist: CC0 scans, procedural kits that write themselves onto one trim sheet, CC0 bodies and animations, a normalisation script that makes everything obey one art bible, and a provenance record that keeps the owner's licence rule enforceable. Dishonored's lesson, to detail only where the story is, turns the budget problem into a design choice.

Two inversions follow. First, the cheapest pixels on screen, the hands and the HUD, should get the most care, because they are in every frame and cost almost nothing to make lavish. Second, the brother's phone should not be treated as the ceiling that forces compromise. Each peer renders its own frame, so the phone is simply another tier, and its real enemies are memory and pixel count, not missing features. The one honest uncertainty left is measured performance on the actual devices. That is why the plan's first deliverable is a benchmark the owner can run, not a better-looking screenshot.
