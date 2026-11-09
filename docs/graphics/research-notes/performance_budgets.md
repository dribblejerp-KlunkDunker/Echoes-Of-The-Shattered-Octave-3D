# Performance Budgets and Scaling Techniques for a Detailed 3D First-Person Browser Town (Desktop + Mid-Range Phones), November 2026

Research date: 2026-11-08. Scope: a WebGL2/WebGPU browser RPG ("Echoes of the Shattered Octave") that should look its best on a Windows desktop / Intel-AMD Chromebook and stay playable for a phone co-op player (Android or iPhone), as an offline PWA (~55 MB of media today).

Source-quality note: primary sources (web.dev, gpuweb wiki, MDN, WebKit blog, Khronos, PlayCanvas docs, CrazyGames docs, Android developers) were preferred. Several "2026 guide" sites (abratabia.com, cinevva, hyperyond) came up in search. I checked abratabia's WebGPU-on-mobile page and found factual errors (see Q1), so its numbers are reported only with that warning. Published, device-specific phone measurements for web 3D are rare. Many questions below have gaps for that reason.

## Q1. WebGPU availability in November 2026 (Chrome desktop/Android, Safari iOS/macOS, Firefox), device share, and WebGL2 fallback

### Takeaway
WebGPU now ships by default in all three major engines: Chrome/Edge on Windows, macOS and ChromeOS since 113; Chrome Android since 121 (Android 12+, Qualcomm/ARM GPUs); Safari 26 on iOS, iPadOS and macOS; Firefox 141+ on Windows and 145+/147+ on Apple Silicon Macs. Firefox Android and Firefox Linux do not ship it yet. An iPhone below iOS 26, an Android phone below Android 12 or with an unsupported GPU, and Firefox Android all still need WebGL2. A WebGL2 fallback is therefore mandatory for the phone player. I found no reliable published share of devices with WebGPU.

### Cited Findings
- web.dev (published 25 Nov 2025) says WebGPU "is now supported in major browsers". Its table: Chrome/Edge on Windows (D3D12), macOS and ChromeOS from v113; Chrome Android from v121, which needs Android 12+ and Qualcomm/ARM GPUs; Firefox Windows from v141; Firefox macOS Tahoe 26 on ARM64 from v145, with Intel Macs still in progress; Firefox Linux and Android "not yet available"; Safari 26 on macOS Tahoe 26, iOS 26, iPadOS 26 and visionOS 26. — [web.dev: WebGPU is now supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers)
- gpuweb Implementation Status wiki (last edited 13 Aug 2026):
  - Chrome Android is supported on ARM/Qualcomm/Intel GPUs with Android 12+ since Chrome 121, and on Imagination GPUs with Android 16+ since Chrome 139. Samsung Xclipse (Android 12+) is listed as "probably 154" and still in progress. Other devices are "TBD".
  - Chrome Linux is supported on Intel Gen12+ since 144 and on NVIDIA (driver 535.183.01+) under Wayland since 147. Other Linux configurations need a flag.
  - Firefox on Apple Silicon Macs has shipped since 145 on macOS 26+ and since 147 on all macOS versions.
  - Firefox Android is behind a flag (Beta/Nightly only), and Firefox Linux is Nightly-only. Mozilla expects both in 2026.
  - Safari iOS/iPadOS 26 has WebGPU on by default.
  — [gpuweb wiki: Implementation Status](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
- Khronos SIGGRAPH 2026 WebGL/WebGPU deck:
  - WebGPU is "available in all major browsers".
  - Firefox shipped on Windows (2025-07) and Apple Silicon Mac (2025-11). Safari shipped "everywhere" (2025-09). Chromium added Linux Intel Gen12+ (2026-01).
  - Chromium shipped **Compatibility Mode** for older OpenGL ES 3.1 Android devices in 2026-02, with the aim of reaching "the large majority of devices". No percentage is given.
  - Autodesk Viewer, with "millions of monthly active users", uses WebGPU by default on Chrome (desktop and mobile), Edge, Firefox and Safari.
  - Three.js r185 showcased WebGPU-only demos.
  - The often-quoted "WebGL in 96% of browsers" and Compatibility Mode ">90% of machines" figures come from the **2025** deck, not 2026.
  — [Khronos: WebGL and WebGPU, SIGGRAPH 2026](https://www.khronos.org/developers/linkto/webgl-and-webgpu-sigg26)
- Babylon.js forum thread "WebGPU on mobile: is it ready?" (2026):
  - On a Pixel 5 in Chrome, a user first found WebGL2 "significantly better" than WebGPU (24 June).
  - On 19 Sept, using Babylon Lite on WebGPU, the same user said WebGPU now "matches or beats WebGL 2". He could not tell whether the browser or the engine caused the change.
  - Babylon's Deltakosh said WebGPU "works well in iOS".
  - The community advice was to ship both APIs and use WebGPU only where it is faster.
  - No FPS numbers were given.
  — [Babylon.js forum: WebGPU on mobile, is it ready?](https://forum.babylonjs.com/t/webgpu-on-mobile-is-it-ready/63694)
- Unverified, partly wrong: abratabia.com ("updated June 2026") claims "about 78% of Chrome Android users had hardware-accelerated [WebGPU] access as of Q1 2026". It also claims WebGL can handle about 300–500 draw calls per frame on mobile versus about 1,000–2,000 for WebGPU, and that draw-call-heavy scenes get 40–70% faster frame times on WebGPU. It cites no sources. It also says iOS WebGPU arrived "in iOS 18.2" and that Chrome Android shipped "mid-2025", which contradicts primary sources (iOS 26; Chrome 121 in early 2024). Do not rely on its numbers. — [abratabia: WebGPU on mobile](https://abratabia.com/mobile-browser-performance/webgpu-on-mobile.php); contradicted by [web.dev](https://web.dev/blog/webgpu-supported-major-browsers) and the [gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)

### Inferences
- For this game's players:
  - The Windows desktop in Chrome/Edge gets WebGPU.
  - A recent Intel/AMD Chromebook gets WebGPU (ChromeOS since 113).
  - An iPhone gets WebGPU only on iOS 26 or later.
  - An Android phone gets full WebGPU on Android 12+ with Adreno/Mali. Older ES 3.1 phones may get Compatibility Mode. Samsung Xclipse (some Galaxy Exynos models) may not yet have it.
- Mobile WebGPU speed was still inconsistent in 2026 (the Pixel 5 reports). The game should choose the backend at runtime, and possibly from a quick benchmark, rather than always picking WebGPU when it exists. Three.js's WebGPURenderer, which falls back to WebGL2 automatically, fits this need.
- The visual feature set should be designed to work in WebGL2. WebGPU-only extras (compute-driven crowds, GPU culling) should be optional upgrades, not requirements.

### Gaps
- I found no authoritative 2026 percentage of devices or users with WebGPU, either overall or for mobile. The caniuse share was not retrieved, and the 78% figure is unsourced.
- I found no published per-device WebGPU-vs-WebGL2 frame-time comparisons for current mid-range phones (for example, Snapdragon 7-series or Dimensity 7000-series).

## Q2. Realistic budgets on mid-range phones and integrated-GPU laptops/Chromebooks: draw calls, triangles, texture memory, shadow maps, dynamic lights, post-processing, render scale, thermal throttling, iOS Safari memory crashes

### Takeaway
The only hard published engine number is PlayCanvas's "100–200 draw calls is a rough target for low-end mobile". Desktop handles "thousands". Resolution / device pixel ratio is the biggest lever, both for frame rate and for heat: rendering at native DPR is the classic phone killer, and Android case studies find resolution scaling has the largest thermal effect. iOS Safari ends WebGL-heavy tabs silently under memory pressure. No JS error or context-lost event is sent first, and the tab can get stuck in a reload loop. Apple publishes no per-device limit, so the game must budget memory conservatively and avoid big spikes when it loads.

### Cited Findings
- PlayCanvas optimisation guidelines:
  - "100–200 draw calls is a rough target for low end mobile devices." Desktop can do thousands per frame at 60 fps.
  - Running at the device's native pixel ratio "can fill many more pixels and sharply reduce frame rate". Adjust DPR at runtime.
  - Keep dynamic lights to a minimum. Shadow-casting lights are expensive: **each omni (point) light shadow renders the scene 6 times**.
  - Post effects are expensive in pixel fill.
  - Minimise blended/transparent meshes, since they cause overdraw.
  - Pack grayscale maps into alpha channels to save VRAM.
  - Set custom AABBs on skinned meshes so bounds are not recomputed per bone each frame.
  - Preallocate math objects to avoid GC hitches.
  - Use batch groups to merge meshes.
  — [PlayCanvas: Optimization Guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
- CrazyGames technical requirements (portal rules that reflect what web games need to run on weak devices):
  - Unity games use **DPR 1 on iOS and on low-memory Android devices**. Other devices use `window.devicePixelRatio`.
  - **Unity games are disabled on iOS by default "due to memory-related crashes"**.
  - On Chromebooks, a game is disabled if it does not run smoothly on a **4 GB RAM device**.
  — [CrazyGames: Technical requirements](https://docs.crazygames.com/requirements/technical)
- Netmarble's Game of Thrones: Legends (native Android game using ADPF; page updated 2025-03-05):
  - Without thermal management, FPS swung **40–56** because of throttling. With ADPF dynamic scaling, FPS stayed **50–60**.
  - Average thermal headroom fell from 1.04 to 0.92.
  - Profiling showed **resolution scaling had the largest effect on GPU load and heat**. Shadows and textures had comparatively little thermal effect.
  - The target FPS starts at 60 and can drop to a 30 FPS floor when the device is hot.
  - Native, not web, and the device model is not stated.
  — [Android Developers: Netmarble ADPF story](https://developer.android.com/stories/games/netmarble-got-adpf)
- WebKit bug 300782 (filed 2025-10-15, last modified 2026-03-11, still NEW/P2):
  - On iOS, Safari reloads WebGL- and texture-heavy pages after iOS kills the tab under memory pressure. This can loop until "A problem repeatedly occurred". It is more common on lower-memory devices.
  - **No out-of-memory error reaches JavaScript and no `webglcontextlost` event fires first.**
  - A commenter says similar Android devices can hold "4 or 16 times more memory". A WebKit engineer disputes this and asks for a repro.
  - The bug gives no numeric limit.
  — [WebKit Bugzilla 300782](https://bugs.webkit.org/show_bug.cgi?id=300782)
- three.js forum (May 2025): a Flutter + three.js app crashed on an iPhone 16 Pro Max after about 10 minutes of use, and Safari could not show WebGL again until cleared or rebooted. The suggested fixes were to dispose geometries, materials and textures explicitly, reuse geometries and materials, and avoid console-logging objects (which blocks GC). The poster gave up on WebGL. — [three.js forum: Safari crash on iPhone with WebGL](https://discourse.threejs.org/t/safari-any-web-browser-crash-on-iphone-when-use-webgl/81629)
- Apple Developer Forums (Nov 2023, older than 2024): a three.js scene crashes and reloads on iOS, attributed to tab memory. There were no replies and no numbers, which shows Apple publishes no clear limit. — [Apple Developer Forums 741624](https://developer.apple.com/forums/thread/741624)

### Inferences
- Phone draw-call budget: aim for **≤150–200 draw calls** on the phone tier, using the PlayCanvas guidance, and spend the savings on instancing and merging.
  - Instancing and merging are essential for "dense props": one instanced draw per prop type per chunk.
  - Desktop can be allowed 1,000+.
  - WebGPU raises the CPU-side draw-call ceiling. The GPU-side costs (fill rate, overdraw, shadows) stay the same.
- Phone render scale and DPR: render at DPR 1, or about 0.6–0.75 of native on high-DPI phones. Then use dynamic resolution driven by frame time, which also handles heat. The evidence shows resolution is the strongest lever for both FPS and temperature.
- Lanterns ("many lanterns"):
  - Real-time shadowed point lights cost 6 scene passes each (PlayCanvas). On phones, only a very small number of lights should cast shadows; zero shadowed point lights is safest.
  - Most lanterns should use baked or emissive light plus cheap unshadowed lighting (clustered/forward+ where the engine supports it), or fake "glow" sprites.
  - One directional sun/moon shadow (cascaded on desktop, single cascade on phone) is the usual pattern.
- iOS memory: design for a modest total tab footprint on iPhones. The game must also avoid loading spikes, for example decoding many PNG/JPEG files to raw RGBA at once.
  - No published number exists. Community folklore from the WebGL era puts the safe range at a few hundred MB to about 1 GB on recent iPhones; I could not verify this.
  - Using KTX2 (which stays compressed in GPU memory), streaming per chunk, and disposing resources aggressively are the main defences.
  - Because no `webglcontextlost` warning arrives, the game should save co-op state often so a crash/reload on the phone is recoverable.
- Chromebooks: target a 4 GB RAM Intel/AMD integrated GPU as the "low desktop" tier (CrazyGames uses the same bar).

### Gaps
- I found no authoritative, device-specific **triangle-per-frame** budgets for mid-range phones in browsers in 2025–2026.
- I found no authoritative **texture-memory** budgets per phone tier, and no Apple-published **iOS Safari per-tab memory limit**.
- I found no published **shadow-map size** guidance specific to mobile web, nor measured **post-processing cost** (bloom, SSAO, SSR) at native vs scaled resolution on named phones.
- I found no measured thermal-throttling curves for **web** games (as opposed to native) on named phones.
- Intel/AMD integrated-GPU laptops and Chromebooks have no published web-3D budgets beyond the CrazyGames 4 GB rule.

## Q3. Scaling techniques: runtime quality tiers (detect-gpu), dynamic resolution, LOD, instancing, culling, impostors, baked vs real-time lighting, texture compression (KTX2/Basis, ASTC/ETC2/BC), mesh compression (Draco/Meshopt), streaming per map

### Takeaway
The standard stack is:
- runtime tier detection, then a live frame-time-driven render scale;
- instancing and batching for props;
- LOD and impostors for distant hills;
- baked lighting for most lanterns;
- KTX2/Basis textures, which transcode at runtime to ASTC, ETC2 or BC so they stay compressed in VRAM;
- meshopt- or Draco-compressed glTF, loaded per map chunk.

detect-gpu still works, but its benchmark data stopped updating in December 2025. It should be paired with a real in-game frame-time check.

### Cited Findings
- detect-gpu (pmndrs) sorts GPUs into tiers using gfxbench framerates normalised by resolution:
  - Tier 3 is ≥60 fps, Tier 2 ≥30 fps, Tier 1 ≥15 fps.
  - Tier 0 means no WebGL, a blocklisted GPU, or under 15 fps; the README says to provide a non-WebGL fallback for these users.
  - **The gfxbench data source stopped updating in December 2025.** The maintainers say the existing data is still accurate for current GPUs and are looking for alternatives (issue #132).
  - No WebGPU-specific mention.
  — [GitHub: pmndrs/detect-gpu](https://github.com/pmndrs/detect-gpu)
- A dev.to write-up on InstancedSkinnedMesh in three.js describes a GPU-tier detection class that turns on advanced effects such as cascaded shadow maps (CSM) only on high-performance machines. — [dev.to: InstancedSkinnedMesh in three.js](https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm)
- Netmarble (native Android): dynamic resolution scaling driven by thermal headroom, plus an adaptive target frame rate (60 down to a 30 floor), kept FPS at 50–60 instead of 40–56. Resolution was the main lever, so other settings could stay at high quality. — [Android Developers: Netmarble ADPF](https://developer.android.com/stories/games/netmarble-got-adpf)
- PlayCanvas: batch groups merge mesh instances to cut draw calls; frustum culling is on per camera; on-demand rendering (`autoRender=false`) suits static scenes; fewer materials mean fewer shaders. — [PlayCanvas: Optimization Guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
- Khronos KTX 2.0 (April 2021, older than 2024 but still the current standard):
  - Basis Universal **ETC1S** gives "significantly smaller transmission and memory sizes than JPEG and PNG".
  - **UASTC** gives higher quality with "significant memory savings".
  - Textures are transcoded "into a natively-supported GPU format on the target device".
  - The press release gives no numeric ratios.
  — [Khronos: KTX 2.0 press release](https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets)
- gltfpack / meshoptimizer docs:
  - Geometry is quantized by default (`KHR_mesh_quantization`).
  - `-c` writes `EXT_meshopt_compression` and `-cc` adds more compression; serve the output with gzip/deflate, since the codec is built to compress further.
  - `-cz` uses `KHR_meshopt_compression` at a higher level.
  - `-tc` converts all textures to KTX2/BasisU (`KHR_texture_basisu`) and `-tw` converts them to WebP.
  - **gltfpack does not support Draco.**
  - The page gives no numeric ratios.
  — [meshoptimizer: gltfpack docs](https://meshoptimizer.org/gltf/)
- Khronos SIGGRAPH 2026: the WebGL Pixel Local Storage extension is final, and the BaseVertex/BaseInstance extensions are expected to ship. Both help deferred-style lighting and instanced or multi-draw rendering in WebGL2. — [Khronos SIGGRAPH 2026 deck](https://www.khronos.org/developers/linkto/webgl-and-webgpu-sigg26)

### Inferences
- Recommended tier flow:
  1. Choose the backend (WebGPU or WebGL2).
  2. Use detect-gpu (or the GPU name from the WebGPU adapter info) to pick a starting tier.
  3. Run a 2–3 second in-scene warm-up benchmark.
  4. Run continuous dynamic resolution (for example, keep frame time under 16.6 ms on desktop and under 33 ms on phone), stepping render scale before cutting features.
  5. Save the chosen tier per device in localStorage.
  This meets "maximum graphics by default" on the desktop without breaking the phone.
- Distant hills: use a low-poly terrain LOD or a skybox/impostor ring, fog, and a sky dome. Real-time geometry should stop at a set distance per tier.
- Meshopt is the better fit for streaming per-chunk glTF than Draco: gltfpack handles quantization, compression and KTX2 in one tool, and it decodes fast (decode-speed numbers not retrieved). Draco remains an alternative through other tools.
- Wet reflective cobbles: on phones, use cheap tricks (a roughness/normal "wetness" mask plus a cubemap or planar-free reflection probe) rather than SSR. SSR and volumetrics belong on the desktop tier.

### Gaps
- I found no retrieved numbers for the KTX2/ETC1S/UASTC size or VRAM ratios, nor meshopt vs Draco size and decode-speed benchmarks. The meshoptimizer GitHub README and the Basis Universal wiki would have them, but I did not fetch them.
- I found no measured occlusion-culling gains in web engines.
- I found no 2026 alternative to detect-gpu's data source.

## Q4. Skinned characters on mobile web: GPU skinning cost, vertex-animation textures / baked animation for crowds, how many animated characters are feasible

### Takeaway
Plain SkinnedMesh characters (one draw call per mesh or material, each with its own bone texture) hit limits early. One three.js write-up saw frame drops past about 20 avatars, because 20 people meant over 200 skinned meshes. Instanced skinning, baked or vertex animation textures, and shader-driven crowds scale to hundreds or even 100k characters on desktop in one draw call. Thirty townsfolk per town is feasible on a phone only with instancing and baked animation, LOD, and a lower update rate for distant NPCs. No published phone measurements were found.

### Cited Findings
- dev.to (three.js InstancedSkinnedMesh; undated):
  - Frame drops started above **about 20 avatars**, because **20 people = over 200 skinned meshes** (multi-part characters).
  - After instancing the skinned meshes, the author reached "over a hundred people in a unified space" at a 60 fps target.
  - It mentions PC and mobile but gives no device models or measured FPS.
  — [dev.to: InstancedSkinnedMesh in three.js](https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm)
- three.js forum "One Draw Call, Massive Crowd" (19 Feb 2026):
  - A single InstancedMesh with merged geometry draws an animated crowd in **one draw call**.
  - The author reports up to **100,000 people** at under 2 ms GPU and about 0.1 ms CPU, capped at 240 fps, on an unspecified desktop.
  - Uses shader-based LOD, packed instance attributes and amortised updates. Caching trig math won back about 25 fps at scale.
  - No phone numbers. It does not say whether it uses VAT or skinning.
  — [three.js forum: One Draw Call, Massive Crowd](https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928)
- r/threejs (Jan 2025): "20k skinned instances using InstancedMesh2 library". This shows the InstancedMesh2 library supports instanced skinning at large counts. Details could not be retrieved (bot-check page). — [r/threejs mirror: 20k skinned instances with InstancedMesh2](https://redlib.hbubli.cc/r/threejs/comments/1hw39vs/20k_skinned_instances_using_instancedmesh2_library)
- PlayCanvas: give skinned meshes a custom AABB so per-bone bounds are not calculated every frame. — [PlayCanvas: Optimization Guidelines](https://developer.playcanvas.com/user-manual/optimization/guidelines/)
- Background on technique (pre-2024): GPU Gems 3, chapter 2, "Animated Crowd Rendering", describes instancing plus animation data stored in textures. — [NVIDIA GPU Gems 3, ch. 2](https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch02.html)

### Inferences
- For about 30 townsfolk per town:
  - Use a single-mesh, single-material character with a texture atlas, not multi-part characters.
  - Use 2–3 LODs; distant NPCs get baked animation (VAT or a baked bone texture) and update animation at 10–15 Hz.
  - Instance by archetype.
  - Phone tier: full skinning for the 3–6 nearest NPCs only, with the rest instanced/baked, or a hard cap on visible animated NPCs (for example, 10–15).
  - Desktop can skin all 30 at full rate.
- Character count is mainly a CPU-and-draw-call problem (bone matrix updates, one draw per part) more than a vertex-shading problem. Merging parts into one mesh is the first fix.

### Gaps
- I found no published measurements of GPU skinning cost (ms per character, or per bone count) on named mid-range phones in WebGL2 or WebGPU.
- I found no published phone FPS for VAT crowds in three.js, Babylon or PlayCanvas.

## Q5. PWA/offline: storage quotas (Cache Storage / IndexedDB) on iOS and Android in 2026, how big an offline game can be, eviction rules

### Takeaway
Storage space is no longer the constraint. Safari 17+ (iOS/iPadOS 17, macOS Sonoma) allows each origin up to about 60% of disk in Safari, and Home Screen web apps get the same. Chrome/Android allows up to 60% of disk per origin. A 55 MB game, or even a few GB, fits. The real risk is **eviction**:
- Storage is best-effort by default.
- Safari's ITP deletes script-written data for origins with no user interaction in the last 7 days of browser use.
- Under storage pressure, the least recently used origin is evicted, and all its data goes at once.
Call `navigator.storage.persist()`. Safari grants it by heuristics, with installation as a Home Screen web app being one signal. Design for re-download if the data is lost.

### Cited Findings
- MDN "Storage quotas and eviction criteria":
  - **Chrome/Chromium:** up to **60% of total disk** per origin, best-effort or persistent. Chrome uses at most 80% of disk in total.
  - **Firefox:** best-effort is the smaller of 10% of disk or a 10 GiB group limit; persistent is up to 50% of disk (8 TiB cap) and needs a prompt.
  - **Safari (macOS 14+/iOS 17+):**
    - About **60%** of disk per origin for browser apps, and about **15%** for apps embedding web views (WKWebView).
    - Home Screen/Dock web apps use the browser-app quota.
    - Cross-origin frames get about 1/10 of the parent's quota.
    - All origins together are capped at 80% (browser apps) or 20% (other apps).
    - **Older Safari had a 1 GiB initial quota and then prompted.**
  - **Eviction:**
    - LRU under storage pressure or when the browser's total cap is exceeded.
    - **Safari only:** with tracking prevention on, an origin with no click or tap in the last **7 days of browser use** has its script-created data deleted.
    - Eviction is all-or-nothing per origin (IndexedDB and Cache API together).
    - Persistent origins are skipped. Safari and Chromium grant `persist()` automatically by heuristics; Firefox prompts.
    - Exceeding the quota throws `QuotaExceededError`.
  — [MDN: Storage quotas and eviction criteria](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- WebKit blog "Updates to Storage Policy" (10 Aug 2023, older than 2024; still the current policy):
  - Origin quota is up to 60% of disk (browser apps) or 15% (other apps).
  - Overall cap is 80% or 20%.
  - **Home Screen web apps get the same quotas as the browser.**
  - Safari 17 **no longer prompts** for more space.
  - Origins with an active page or in persistent mode may be excluded from eviction.
  - `persist()` is granted by heuristics, "such as whether the site is opened as a Home Screen Web App".
  - The quota from `estimate()` is an upper bound that can vary, to prevent fingerprinting.
  — [WebKit: Updates to Storage Policy](https://webkit.org/?p=14403)
- CrazyGames portal limits (useful as a "web norm"): total ≤**250 MB**, ≤1,500 files, initial download ≤**50 MB** (≤**20 MB** for mobile homepage eligibility), and ≤20 s to reach gameplay. — [CrazyGames: Technical requirements](https://docs.crazygames.com/requirements/technical)

### Inferences
- The current 55 MB fits easily on every platform. Even 500 MB–1 GB of offline content is fine by quota on modern phones.
- Recommended PWA practice:
  - Install to the Home Screen on the iPhone. This helps get `persist()` granted and the same quota as the browser.
  - Call `navigator.storage.persist()` after the first meaningful interaction.
  - Check `navigator.storage.estimate()`.
  - Store assets per town/chunk in Cache Storage with a version manifest, so an evicted or partial cache can be re-fetched in pieces.
  - Keep the first-play download small (for example, under about 50 MB) and stream later towns.
- The 7-day ITP rule matters for the phone brother: if he does not open the game for a week of Safari use, cached assets (and any IndexedDB saves) could be wiped. Saves should also live with the host/desktop peer or be exportable.
  - The WebKit post does not state that Home Screen web apps are exempt from the 7-day rule. I did not verify an exemption.

### Gaps
- I did not confirm whether Home Screen web apps on iOS 26 are exempt from the 7-day script-storage deletion. Older WebKit posts (2020) suggested they are, but that was not re-verified for 2026.
- I found no 2026-specific changes to Android Chrome quota beyond MDN's 60% rule.
- I found no data on how often iOS evicts installed PWAs in practice.

## Q6. Case studies: shipped web 3D games or demos with published phone performance numbers, and lessons learned

### Takeaway
Published, device-specific phone numbers for shipped web 3D games are scarce. Most public material is engine guidance (PlayCanvas), portal requirements (CrazyGames), forum reports (Babylon, three.js) and desktop-only crowd demos. The lessons that recur:
- cap the device pixel ratio on phones;
- treat iOS memory as the main crash risk (even CrazyGames disables Unity on iOS by default);
- keep draw calls low on mobile;
- instance crowds;
- ship WebGPU with a WebGL2 fallback.

### Cited Findings
- CrazyGames: Unity web builds are **disabled on iOS by default due to memory-related crashes**. Phones run at DPR 1 on iOS and low-memory Android. Games must run smoothly on 4 GB Chromebooks. Mobile-homepage games must have an initial download of 20 MB or less. — [CrazyGames: Technical requirements](https://docs.crazygames.com/requirements/technical)
- Autodesk Viewer (millions of MAU) and Autodesk Project Falcon (public 4 May 2026) use WebGPU as the default backend on Chrome desktop and mobile, Edge, Firefox and Safari. This is evidence that large production apps rely on WebGPU on mobile in 2026. — [Khronos SIGGRAPH 2026 deck](https://www.khronos.org/developers/linkto/webgl-and-webgpu-sigg26)
- Babylon.js community: a Pixel 5 went from WebGL2 being "significantly better" (June 2026) to WebGPU matching or beating it (September 2026). Recent iOS devices were "quite good". The lesson is to keep both backends and choose at runtime. — [Babylon.js forum](https://forum.babylonjs.com/t/webgpu-on-mobile-is-it-ready/63694)
- three.js crowd demos:
  - 100k characters in one draw call on desktop (Feb 2026). — [three.js forum](https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928)
  - Skinned-mesh drops past about 20 multi-part avatars, then 100+ after instancing. — [dev.to](https://dev.to/sagacheng/using-instancedskinnedmesh-in-threejs-enabling-the-rendering-of-hundreds-of-3d-characters-on-screen-simultaneously-15gm)
- iOS long-session crash reports (iPhone 16 Pro Max, May 2025, and WebKit bug 300782, Oct 2025–Mar 2026) show that even flagship iPhones can kill WebGL tabs. Memory hygiene (dispose, reuse, no console-logged objects) is a must. — [three.js forum](https://discourse.threejs.org/t/safari-any-web-browser-crash-on-iphone-when-use-webgl/81629); [WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782)
- Native analogue: Netmarble (Android) showed that dynamic resolution plus an adaptive frame rate stopped thermal FPS swings (40–56 became 50–60). — [Android Developers](https://developer.android.com/stories/games/netmarble-got-adpf)

### Inferences
- For the Shattered Octave co-op setup, use asymmetric tiers per peer. Each peer renders its own view at its own quality: the desktop on "Ultra" (WebGPU, CSM, SSR, volumetrics, full-rate skinning), the phone on "Low/Medium" (WebGL2 or WebGPU, DPR 1 or less, dynamic resolution, one shadow cascade, baked lanterns, baked-animation NPCs). The game state is shared, so this needs no gameplay compromise.
- The iPhone is the riskiest target, mainly because of memory, not GPU speed. Test on the brother's actual phone early, with long sessions (20+ minutes) and while walking between towns.

### Gaps
- I did not find PlayCanvas, 8th Wall/Niantic or Poki case studies with published FPS/frame-time numbers on named phones. 8th Wall and Poki guidance were not retrieved.
- I found no shipped first-person 3D web RPG with public phone performance data.
