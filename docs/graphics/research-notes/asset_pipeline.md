# Asset Pipeline for a Solo Non-Artist with an AI Coding Assistant (Echoes of the Shattered Octave, Nov 2026)

Scope note: research done 2026-11-08 with roughly 30 tool calls. Several official pages (Material Maker, Tripo help/blog, MPFB downloads page) could not be fetched or returned no body text; those points are listed under Gaps. Items marked "unverified" come from the researcher's background knowledge, not from a page fetched in this session, and should be checked before relying on them.

## 1. CC0 / permissive libraries (Poly Haven, ambientCG, Quaternius, Kenney, Sketchfab, Fab, Megascans)

### Takeaway
Poly Haven, ambientCG, Kenney and Quaternius are all CC0 (no attribution, commercial use, worldwide, raw files may ship inside a game), so they are the safe backbone. Fab/Megascans is commercially usable in any engine under the Fab Standard License, but the free Megascans giveaway ended at the end of 2024 and the licence summary is silent on AI and on extractable web builds, so treat it as a second-tier, case-by-case source.

### Cited Findings
- Poly Haven: "Our assets are all licensed as CC0, which is effectively Public Domain"; covers HDRIs, textures and 3D models; no credit required; any purpose including commercial and inclusion in a product you sell; redistribution allowed. The asset licence says nothing about AI; the site ToS bans web scraping/data mining of the website without permission (relevant if the assistant bulk-downloads: use the official API rather than scraping). — [Poly Haven licence](https://polyhaven.com/license)
- ambientCG: all assets, including downloads and preview renders, are CC0 1.0 Universal; commercial use without permission; raw files may be included in a video game; attribution appreciated but not required; suggested credit "Created using <asset name> from ambientCG.com…"; short links `https://ambientcg.com/a/<id>`. — [ambientCG licence docs](https://docs.ambientcg.com/license/)
- Kenney: assets are "public domain licensed (CC0)", commercial use allowed, attribution not required; do not use the Kenney logo. The support page does not list specific fantasy/medieval kits. — [Kenney support](https://kenney.nl/support)
- Quaternius Universal Animation Library 2: released January 2026, 130+ animations, CC0 (personal, educational, commercial); a universal humanoid rig "compatible with Unreal Engine, Godot and Unity, ready for retargeting"; formats FBX/GLB/Blend (body text also lists OBJ/glTF); about 60-70% of the pack is free ("Standard"); the "Source" version (with .blend) is claimed via Patreon tiers ($10/$20/$50 per month). Includes melee and armed combos (3- and 4-hit combos split into hits plus recoveries), zombie locomotion, parkour. — [Quaternius UAL2 page](https://quaternius.com/packs/universalanimationlibrary2.html)
- UAL2 complements an earlier Universal Animation Library (v1); both are also listed on itch.io, OpenGameArt and the Godot asset store. — [Quaternius UAL2 page](https://quaternius.com/packs/universalanimationlibrary2.html); [itch.io UAL1](https://quaternius.itch.io/universal-animation-library); [Godot Asset Store listing](https://store.godotengine.org/asset/quaternius/universal-animation-library/); [Digital Production, Feb 2026](https://digitalproduction.com/2026/02/10/130-animations-one-rig-zero-drama/)
- Fab Standard License summary: commercial or private use; "usage is not limited to Unreal Engine" (any compatible tool); commercial distribution of projects containing Fab assets allowed; you may not "resell or redistribute the asset for free on a standalone basis"; Personal and Professional tiers grant the same scope of rights (no threshold figure on the summary page; no need to upgrade if revenue later crosses it); "Reference-Only" tier does not give source-format access; CC-BY assets on Fab are governed by Creative Commons, not the Standard License. The summary does not mention AI training, generative use, NoAI tags or extractable web builds; the full EULA is the binding text. — [Fab EULA summary](https://www.fab.com/eula)
- Megascans on Fab: were free to claim "until the end of 2024"; claimed assets stay usable afterwards under the Fab Standard License; assets "can be used in any tool or engine according to the Fab Standard License"; from 2025 Megascans are paid: standalone 2D/3D assets from $0.99, packs from $24.99, procedural kits from $4.99; Quixel.com and Bridge to be sunset at an unspecified future date; legacy Quixel licences still honoured for assets acquired then. (Source page dated Sept 2024.) — [Quixel to Fab Transition FAQs, Epic forums](https://forums.unrealengine.com/t/quixel-to-fab-transition-faqs/2033839)
- Contemporary coverage of the 2024 giveaway. — [80.lv](https://80.lv/articles/entire-quixel-megascans-library-now-available-for-free/); [CGPress](https://cgpress.org/archives/quixel-offers-perpetual-access-to-the-entire-existing-megascans-library-with-a-single-click.html)

### Inferences
- For a grim, grounded medieval look, the photoscanned CC0 sources (Poly Haven and ambientCG textures/HDRIs, Poly Haven scanned props such as barrels, crates, rocks, wooden furniture) fit better than Kenney and Quaternius, whose model kits are stylised low-poly. Kenney/Quaternius models are best used as blockout/placeholder geometry, or re-textured with scanned CC0 materials. (Style judgement, not sourced.)
- Megascans' grounded European stone/wood/cobble scans are an excellent stylistic fit, but because the free window has closed, only assets the owner already claimed in 2024 are free; new ones cost from $0.99 each. Before shipping in a browser build (where GLB/KTX2 files are trivially extractable), the owner should read the full Fab EULA clause on redistribution, since "redistribute on a standalone basis" is the restricted act and the summary does not address web delivery.
- Sketchfab: only CC0 and CC-BY (not -NC, -ND, or Editorial) are worldwide-commercial-safe; CC-BY needs a credits screen entry with author, title, link and licence. (Unverified: Sketchfab licence page not fetched this session.)
- Unverified background: Kenney publishes kits such as "Fantasy Town Kit", "Castle Kit", "Pirate Kit" and "Survival Kit"; Quaternius publishes "Medieval Village", "Fantasy Props MegaKit" and "Ultimate Modular Ships"-style packs. Confirm on the individual pack pages.
- Poly Haven and ambientCG both offer public APIs, which suit an AI assistant fetching assets programmatically (unverified this session; see ToS note on scraping above).

### Gaps
- Full Fab EULA text (AI-generated listings, "NoAI" tag rules, web-build extractability) was not available from the summary page.
- Sketchfab's current licence filter and CC0 inventory for medieval content were not checked.
- No fetched source confirms specific Kenney/Quaternius medieval kit names or contents.

## 2. Procedural generation (Blender Geometry Nodes, bpy, town layout, procedural PBR, headless CPU Blender)

### Takeaway
Several Geometry Nodes building generators exist (Buildify free; Medieval City Generator $9.99; Wallachian House Generator; various paid Superhive kits), but most are older than 2024 or for regional styles, and their licences are often unstated. For an AI-driven pipeline the stronger route is the owner's own JSON-recipe approach (Forge, or bpy scripts) feeding CC0 scanned materials, with paid GN kits only as reference.

### Cited Findings
- Buildify (Pavel Oliva): free Geometry Nodes library; modular: put modules into collections, extrude/copy faces to generate buildings; premade node groups for many styles; supports the Blender-OSM addon; v1.0; the .blend does not include the kits shown in the video; licence not stated in the article. Article dated 19 July 2022 (older than 2024). — [80.lv on Buildify](https://80.lv/articles/grab-a-free-geometry-nodes-library-for-procedural-buildings-in-blender/); download [Gumroad](https://paveloliva.gumroad.com/l/buildify)
- Medieval City Generator (Joshua Börner): $9.99 on Blender Market/Superhive; builds city blocks from drawn curves with slider parameters; replaceable objects/collections; works in EEVEE and Cycles; low-poly assets on a single shared trim sheet; asset browser integration; buildings have no interiors and "look best from a distance"; Blender 3.5/3.6; article 26 July 2023 (older than 2024). — [80.lv](https://80.lv/articles/geometry-nodes-powered-medieval-city-generator-for-blender/); [Superhive docs](https://superhivemarket.com/products/medieval-city-generator/docs)
- Wallachian House Generator (KuboZ / J. Zelenay, a Bachelor's thesis project): Geometry Nodes library turning a simple shape into a traditional Moravian Wallachian wooden house, editable in real time, with roof shingle, door and window example models that can be swapped; article May 2026; headline says "Free Download"; licence and Blender version not stated; no half-timbering mentioned. — [BlenderNation, 26 May 2026](https://www.blendernation.com/2026/05/26/free-download-generate-wooden-houses-with-this-geometry-nodes-setup/); [Gumroad](https://jzelenay.gumroad.com/l/WallachianHouseGenerator)
- Other paid GN building tools found (prices/licences not checked): Medieval House Generator, Stoneforge Modular Structure Generator, MBG Building Generator (Superhive); Brickitect (Gumroad); 3D Tudor brick wall and walls/columns generators (Cubebrush). — [Superhive: Medieval House Generator](https://superhivemarket.com/products/medieval-house-generator); [Stoneforge](https://superhivemarket.com/products/stoneforgemodular); [MBG](https://superhivemarket.com/products/mbg-building-geometry-nodes?search_id=50255531); [Brickitect](https://tinkle.gumroad.com/l/brickitect); [3D Tudor brick wall](https://cubebrush.co/3d_tudor/products/phtxna/3dt-brick-wall-generator-blender-geometry-node-procedural)

### Inferences
- The "trim sheet + modular kit" pattern used by Medieval City Generator (one shared texture for many buildings) is the right one to copy for a browser game: it keeps draw calls and texture memory low. The Forge JSON recipes could emit half-timbered houses as: plaster box + timber beam strips (UV'd to a wood trim row) + slate/thatch roof shell (UV'd to roof rows) + chimney stack, all on one 2048 trim atlas built from CC0 ambientCG/Poly Haven textures.
- Paid GN generators bought on Superhive/Gumroad typically allow using their output in commercial games, but since the licences were not stated in the sources, the owner should confirm each one before shipping its output; the .blend node logic itself is generally GPL-style for Blender add-ons (unverified).
- Headless Blender in a CPU-only container (unverified, background knowledge): `blender -b -P script.py` runs bpy and GLB export without a GPU; Cycles renders on CPU (slow but works, minutes per preview image at low samples); Eevee needs an OpenGL/EGL context and usually fails or needs software rendering (e.g. Mesa llvmpipe) in a headless container. For review thumbnails, Cycles CPU at low samples with denoising, or Workbench, is the practical choice. Procedural town layout (street graph, plot subdivision, building placement) is simplest done in Python and emitted as JSON for Forge or Blender.

### Gaps
- Material Maker (Godot-based procedural PBR tool) page could not be fetched (blocked: materialmaker.org); its licence (believed MIT, unverified) and command-line export options remain unconfirmed.
- No measured CPU-only Cycles/Eevee render times were found in this session.
- No fetched source on "Building Tools" add-on status for Blender 4.x/5.x or on GitHub open-source medieval town generators.

## 3. AI 3D generation with permissive licences (TRELLIS/TRELLIS.2, Stable Fast 3D/SPAR3D, TripoSR, Hunyuan3D, Meshy/Tripo/Rodin)

### Takeaway
TRELLIS.2 (MIT code and weights, Dec 2025) is the best permissively licensed open model, but it needs an NVIDIA GPU with 24 GB+ and Linux, so the cloud workspace cannot run it; a rented GPU is required. Stable Fast 3D is free for commercial use under the Stability Community Licence if annual revenue is below $1M, with no geographic limits. Hunyuan3D is unusable for this project: its licence excludes the EU, UK and South Korea and forbids using outputs there. Meshy's free tier outputs are CC BY 4.0; paid tiers give ownership.

### Cited Findings
- TRELLIS.2: "This model and code are released under the MIT License"; 4B parameters; needs an NVIDIA GPU with at least 24 GB, verified on A100/H100; tested only on Linux; H100 timings: 512³ ~3 s, 1024³ ~17 s, 1536³ ~60 s; outputs GLB with PBR (Base Color, Roughness, Metallic, Opacity; example uses 4096 textures); GLB exported OPAQUE by default, alpha must be wired up manually; nvdiffrast and nvdiffrec are under their own (NVlabs) licences; inference is CUDA-only (`pipeline.cuda()`). — [TRELLIS.2 GitHub](https://github.com/microsoft/TRELLIS.2)
- TRELLIS.2 release listed as December 2025, up to 1536³ voxel resolution, MIT. — [ComfyUI Wiki](https://comfyui-wiki.com/en/models/trellis/trellis-2)
- Stability AI Community License: free use (including commercial) for individuals and organisations with under $1M annual revenue "regardless of the source of that revenue"; above $1M requires an Enterprise licence; "as between you and Stability, you own outputs"; must follow the Acceptable Use Policy; revocable if terms are violated; no geographic restriction stated; covered models include Stable Fast 3D (SPAR3D not shown on the summary page). — [Stability AI licence page](https://stability.ai/license)
- Hunyuan3D-2 licence: Territory is "the worldwide territory, excluding the territory of the European Union, United Kingdom and South Korea"; cover page: "THIS LICENSE AGREEMENT DOES NOT APPLY IN THE EUROPEAN UNION, UNITED KINGDOM AND SOUTH KOREA"; Section 5(c) forbids using, distributing or displaying "Output or results" outside the Territory; products over 1M MAU must request a licence from Tencent. — [Hunyuan3D-2 LICENSE on Hugging Face](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE)
- Meshy: paid plans: "you own the assets created through our platform" (provided no infringing input); free plan: CC BY 4.0, credit "Model created with Meshy" with a licence link; no territory restrictions mentioned. — [Meshy help: commercial use](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects)

### Inferences
- For a French/EU release, Hunyuan3D (all versions under the same Tencent community licence family) must be excluded, which matches the owner's own rule. HY-Motion is in the same Tencent family. — consistent with [HY-Motion issue thread](https://github.com/Tencent-Hunyuan/HY-Motion-1.0/issues/49) (not read in full).
- Practical TRELLIS.2 route: the assistant writes a batch script; the owner runs it on a rented 24 GB+ GPU (cloud GPU by the hour) or a local RTX 3090/4090-class card; the assistant then does cleanup in headless Blender on CPU (decimate, voxel remesh, re-UV, bake to a 512-1024 texture, apply the house trim palette). AI meshes are dense, triangulated and have baked lighting in textures, so expect decimation to ~1-5k tris for props and re-texturing to match the art style.
- Unverified background: TripoSR (Stability + Tripo, 2024) is MIT-licensed and can run on CPU slowly, making it the only image-to-3D model plausibly runnable inside the CPU-only workspace, at low quality. SPAR3D is believed to be under the Stability Community Licence like SF3D. Rodin (Hyper3D) and Tripo paid plans grant commercial use of outputs. All need checking.
- Copyright caveat (unverified): purely AI-generated outputs may not be copyrightable in some jurisdictions, so the owner cannot stop others reusing them; this does not block shipping them.

### Gaps
- Tripo3D help and blog pages failed to load; Tripo free/paid terms unconfirmed.
- Rodin/Hyper3D terms and current pricing not checked; Meshy plan prices not shown on the fetched page.
- Licences of nvdiffrast (believed NVIDIA Source Code License, non-commercial for some uses — unverified) and other TRELLIS.2 dependencies were not read; this matters only if redistributing the pipeline, not its outputs, but should be checked.
- No source checked for SPAR3D's exact licence.

## 4. AI texture / material generation (text-to-PBR)

### Takeaway
No permissively licensed text-to-PBR tool was verified in this session. The safest path is CC0 scanned materials (ambientCG, Poly Haven) plus procedural tweaking, with Stable Diffusion-family models under the Stability Community Licence (free under $1M revenue, outputs owned, no geographic limit) as the licence-clean option for generating albedo variants.

### Cited Findings
- Stability Community License covers the Stable Diffusion 3.5 suite and SDXL Turbo; outputs owned by the user; free under $1M annual revenue; no territory restrictions stated. — [Stability AI licence page](https://stability.ai/license)
- ambientCG and Poly Haven provide full CC0 PBR sets usable as-is or as inputs. — [ambientCG](https://docs.ambientcg.com/license/); [Poly Haven](https://polyhaven.com/license)

### Inferences
- A CPU-only workspace can generate tileable textures procedurally (Python/NumPy noise, or Blender shader nodes baked via Cycles CPU) far more reliably than running diffusion models, which need a GPU. Generated albedo can be turned into normal/roughness with simple height-from-luminance filters, but quality is weaker than scans.

### Gaps
- No verified licence/terms found for text-to-PBR products (e.g. Substance 3D Sampler AI, Poly/withpoly, Scenario, Meshy texture) in this session.

## 5. Characters (MakeHuman/MPFB2, Mixamo, CC0 animations, auto-rigging, mocap)

### Takeaway
MPFB2 (Blender add-on) gives CC0 core assets and commercially usable exported characters, so it can generate ~30 varied townsfolk per town headlessly; Quaternius UAL2 (CC0, Jan 2026) supplies retargetable animations. Mixamo is royalty-free for games but its FAQ is from 2022, the service is labelled a "technology preview", and raw files cannot be redistributed, which is awkward for a browser build where files are downloadable.

### Cited Findings
- MPFB: "All core assets (the base mesh, targets, skins…) are shared under CC0"; you can sell models made with MPFB; third-party assets may carry other licences and "it is your responsibility to fulfill the obligations of that license." — [MPFB FAQ: can I sell models](https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html)
- MPFB documentation covers rig helpers, Rigify, Mixamo in MPFB, pose save/load; latest release notes listed are for v2.0.15; clothing asset packs exist (e.g. "shirts01", "dress01"). — [MPFB docs index](https://static.makehumancommunity.org/mpfb.html)
- Mixamo FAQ (posted 29 Sep 2022, older than 2024): online services are a "limited duration technology preview", free "with no licensing or royalty fees" for "unlimited commercial or non commercial use", including video games; you cannot distribute raw character/animation files (e.g. in asset packs), only within your team; Mixamo content must not be used to train ML models. — [Adobe community Mixamo FAQ](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775)
- Quaternius UAL2: CC0, 130+ animations, retargetable universal humanoid rig for Godot/Unity/Unreal; melee combos. — [Quaternius UAL2](https://quaternius.com/packs/universalanimationlibrary2.html)

### Inferences
- Townsfolk pipeline: bpy script drives MPFB2 to generate N bodies (random age/weight/height within medieval ranges), applies only CC0 clothing (check each pack), rigs with the game-engine/default rig, retargets UAL1/UAL2 walk/idle/talk clips, decimates to ~3-8k tris, and exports GLB. Medieval clothing will likely need custom modelled or shader-tinted garments, since MPFB stock clothing is modern.
- Embedding Mixamo animation inside a game GLB is generally treated as "part of a game", but in a PWA every GLB is directly downloadable; the conservative reading is to prefer CC0 animation (Quaternius) so there is no question.
- Licence-safe mocap: the owner's rule already excludes LAFAN1 (CC BY-NC-ND) and GVHMR weights. Unverified candidates: CMU Graphics Lab Motion Capture Database (free for commercial use per its site), and Bandai Namco Research Motiondataset (CC BY-NC — not usable). Verify before use.

### Gaps
- MPFB Blender version support and the clothing packs' individual licences were not confirmed.
- Auto-rigging tools (Rigify, Auto-Rig Pro, AccuRIG/ActorCore terms, UniRig/RigAnything AI riggers) were not researched this session.
- No verified licence-clean mocap dataset was confirmed with a fetched source.

## 6. First-person arms and weapons

### Takeaway
No dedicated fetched source; the practical route is to derive arms from an MPFB CC0 body (cut at the shoulders) and model the sword and crystalline glass arm procedurally (bpy/Forge), animating with CC0 melee clips from Quaternius UAL2 or hand-keyed bpy animation.

### Cited Findings
- MPFB core assets are CC0 and exported models may be sold. — [MPFB FAQ](https://static.makehumancommunity.org/mpfb/faq/can_i_sell_models.html)
- UAL2 includes "melee and armed combos" split into separate hits with recoveries. — [Quaternius UAL2](https://quaternius.com/packs/universalanimationlibrary2.html)

### Inferences
- A crystalline glass arm is a good fit for procedural generation: low-poly faceted shards (Voronoi fracture or convex hulls along the forearm bones) with a transmissive/emissive material; in a browser renderer, fake refraction with a fresnel + environment-map shader is cheaper than real transmission.
- First-person arms are seen at very close range; budget around 5-15k tris and 1024-2048 textures for arms plus weapon. (Rule of thumb, not sourced.)

### Gaps
- No source checked for CC0 first-person arm rigs or FPS animation packs.

## 7. Keeping a consistent art style across mixed sources

### Takeaway
No dedicated source was fetched; the strongest sourced lever is the shared trim-sheet approach (one atlas for many buildings), combined with a fixed texel density, a constrained palette and one material standard applied by script to every imported asset.

### Cited Findings
- Medieval City Generator uses low-poly assets sharing one trim sheet texture, which keeps a whole city visually consistent. — [80.lv](https://80.lv/articles/geometry-nodes-powered-medieval-city-generator-for-blender/)
- gltf-transform `palette` creates palette textures and merges materials. — [gltf-transform CLI](https://gltf-transform.dev/cli)

### Inferences
- A style-normalisation script (bpy or gltf-transform) can enforce: one texel density (e.g. 256-512 px/m for buildings, higher for hand-held items), a grading pass on all albedo maps (desaturate, shift toward the game's grim palette, clamp albedo to physically plausible ranges), roughness floors so nothing looks plastic, consistent metalness (0/1 only), and re-baking AI meshes onto the house trim sheets.
- Mixing stylised low-poly (Kenney/Quaternius) with photoscans clashes; pick one direction (scanned-realistic textures on simple geometry fits "grim, grounded").

### Gaps
- No indie write-up on AI-assisted style consistency was found in this session.

## 8. Web delivery (glTF/GLB, Draco/Meshopt, KTX2/Basis, gltf-transform, PWA size budgets)

### Takeaway
gltf-transform's CLI covers the whole optimisation chain (prune, dedup, weld, simplify, instance, palette, Draco or Meshopt geometry, ETC1S/UASTC KTX2 or WebP/AVIF textures) and is scriptable by the AI assistant; size budgets for the PWA were not found in a fetched source.

### Cited Findings
- gltf-transform CLI commands: `optimize` (all common optimisations in one step; defaults "may not be ideal for all scenes", see `optimize -h`), `draco`, `meshopt` (geometry and animation), `etc1s` and `uastc` (KTX + Basis), `resize`, `simplify`, `dedup`, `prune`, `weld`, `instance` (GPU instancing from shared meshes), `palette`, plus `webp`/`avif`/`png`/`jpeg`, `ktxdecompress`, `ktxfix`, `inspect`. Install `npm install --global @gltf-transform/cli`; example `gltf-transform optimize input.glb output.glb --compress draco --texture-compress webp`. Sharp is named as a dependency for image work. — [gltf-transform CLI docs](https://gltf-transform.dev/cli)

### Inferences
- Unverified background: the `etc1s`/`uastc` commands need KTX-Software (`toktx`/`ktx`) installed on PATH; three.js needs `KTX2Loader`, `DRACOLoader` or `MeshoptDecoder` configured; Meshopt is usually preferred over Draco for animated/skinned meshes and decodes faster. Use ETC1S for most albedo/roughness (small), UASTC for normal maps (higher quality).
- `instance` matters for crates, barrels, bollards, lanterns and cobble pieces: one mesh, many transforms.
- Suggested budget (rule of thumb, not sourced): first-load shell under ~10-20 MB, then stream each town as one or a few GLBs; cache via service worker.

### Gaps
- No fetched source for the Khronos KTX artist guide, three.js loader setup, or recommended PWA download/storage budgets; other researchers' notes (performance_budgets.md, browser_rendering.md in the same folder) may cover this.
