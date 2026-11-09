# Engine path options for bringing "Echoes of the Shattered Octave" (browser raycaster RPG) to a photoreal-painterly dark-fantasy look, as of November 2026

Source-quality note for the report writer: Official primary sources reached were the Godot docs (web export .rst source, SDFGI .rst source) and the GodotCon Boston 2026 talk page. Several 2026 facts come only from secondary or vendor sites: Cinevva (a web-games platform), Utsubo (a three.js/WebGPU services studio), Summer Engine (a competing engine vendor) and Toolradar (a pricing aggregator). Each is flagged where used. The official Godot/Unity/Unreal doc pages often returned only navigation chrome when fetched, so some details could not be confirmed first-hand.

## Option A: keep the JS codebase and replace only the renderer (Three.js / Babylon.js / PlayCanvas)

### Takeaway
Three.js in late 2026 is a credible renderer for the target look. It has a WebGPU renderer with automatic WebGL 2 fallback, clustered (Forward+) lighting, cascaded sun shadows, light-probe grids and TSL post-processing, and WebGPU now ships in every major browser including iOS Safari 26. This is the only option that keeps the existing JS logic, PWA, phone co-op, French text and Playwright suite intact. The cost is building the 3D world: assets, level geometry to replace tile grids, LOD and streaming. No published post-mortem of a "2.5D raycaster to Three.js" migration was found.

### Cited Findings
- Latest three.js release is r187 (`three@0.187.0`, 30 Oct 2026). Releases came every 7–11 weeks in 2026 (r182 Dec 2025 through r187) — [Utsubo, "What's New in Three.js (2026)"](https://www.utsubo.com/blog/threejs-2026-what-changed) (vendor blog; release dates are checkable on npm).
- `WebGPURenderer` is imported from `three/webgpu` (since r171), needs no bundler or polyfills, and falls back to WebGL 2 automatically when WebGPU is missing — [Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- Game-relevant additions by release — [Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed):
  - r182: soft PCF shadows.
  - r183: improved WebGPU shadows, reversed depth buffer, and `PostProcessing` renamed `RenderPipeline`.
  - r184: `LightProbeGrid` addon (GI), FSR 1 and TAAU upscaling nodes, TSL/node materials on `WebGLRenderer` via a compatibility layer, and non-blocking `compileAsync()`.
  - r185: clustered (Forward+) lighting, plus WebXR on WebGPURenderer.
  - r186: `SunLight` addon with cascaded shadow maps for both renderers, plus `compileComputeAsync()`.
  - r187: spot lights in clustered lighting, and PMREM environment maps rebuilt on cube render targets.
- WebGPU browser support as of late 2026 — [Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed):
  - Chrome/Edge desktop: since v113.
  - Chrome Android: since v121, Android 12+.
  - Safari: since v26 (Sept 2025) on macOS, iOS and iPadOS.
  - Firefox: since v141 on Windows and v145/147 on macOS. Linux and Android are still behind a flag.
- Some three.js forum users found `WebGPURenderer` slower than `WebGLRenderer` in certain scenes. The source advises profiling before migrating for speed alone — [Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- The Utsubo page does not cover volumetrics, and has no game-specific section beyond vibe-coded game-jam entries — [Utsubo](https://www.utsubo.com/blog/threejs-2026-what-changed)
- Related migration guides exist: the WebGL to WebGPU renderer swap, described as one line plus a Firefox caveat — [Utsubo migration guide](https://www.utsubo.com/blog/webgpu-threejs-migration-guide); [BuildMVPFast](https://www.buildmvpfast.com/blog/threejs-webgl-to-webgpu-renderer-migration-2026). These are not fetched in detail.
- Summer Engine (a competitor) describes three.js as suited to "code-first 3D in the browser" — [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export)
- Raycaster to 3D migration evidence: searches found only from-scratch JS raycaster devlogs and generic "2D to 3D" devlogs, for example [Realmchild Invasion devlog](https://untrustedlife.itch.io/realmchild-invasion-from-scratch-js-raycaster-no-libs/devlog) and [engineered.at "Devlog 8: 2D to 3D"](https://engineered.at/articles/devlog-8-2d-to-3d). None is a post-mortem of moving a raycaster RPG to Three.js or Babylon. These pages were not fetched.

### Inferences
- The tile-grid map data can drive Three.js mesh generation directly (walls as instanced or merged meshes, floors as tiled PBR planes). The renderer swap is therefore mostly a new view layer over the existing state, and game logic, saves, quests and NPC schedules can stay untouched. This is reasoning, not a sourced case study.
- Forge's GLB output plugs straight into Three.js (`GLTFLoader`). Babylon.js and PlayCanvas also load GLB natively. This lets Forge act as the asset pipeline for Option A without changing engines.
- On "volumetric sky, wet cobbles, SSR-like reflections": three.js has the building blocks (TSL, compute, clustered lights, CSM, probe grids). It lacks Godot/Unity-style turnkey SDFGI or volumetric fog components, so expect custom TSL work or community addons.
- Mobile: with WebGPU in iOS Safari 26 and Android Chrome, the phone client can run the same renderer at reduced settings or as a lighter view. The WebGL 2 fallback covers older devices.
- Offline PWA, French translation (DOM/JSON strings), P2P phone co-op and Playwright tests all continue to work, because the app stays a web page. Playwright can keep testing DOM HUD and logic. Pixel-level 3D checks would need screenshot or visual-diff tests.

### Gaps
- No published post-mortem found of a 2.5D raycaster game being moved to Three.js, Babylon.js or PlayCanvas.
- No 2026 Babylon.js or PlayCanvas release notes were fetched (Babylon 8.x/9.x WebGPU status, PlayCanvas engine v2 WebGPU). This needs a separate check.
- No mobile-browser frame-rate benchmarks for PBR plus CSM plus clustered lights in three.js were found.

## Option B: Godot 4.x

### Takeaway
Godot desktop Forward+ (SDFGI, volumetric fog, SSR, SSAO/SSIL, up to 512 clustered lights) gets closest to the concept-art look for free. Godot's web export is still Compatibility-only (WebGL 2), with none of those features, and C# cannot export to web at all. Phone co-op in a browser via Godot means the low-end renderer only. All JS game logic would have to be rewritten in GDScript. An experimental third-party WebGPU backend (shown at GodotCon Boston, July 2026) runs Forward+ in browsers but is not official or production-ready.

### Cited Findings
- Current stable is Godot 4.7.2 (August 2026), with 4.8 dev snapshots — [Cinevva, Godot vs Unity for Web Games (2026), updated 6 Sep 2026](https://app.cinevva.com/guides/godot-vs-unity-web-games). The docs navigation also lists an "upgrade to 4.7" guide — [Godot docs (stable)](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
- Web export requirements and renderer — [Godot docs, Exporting for the Web (.rst source, 4.x)](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - The export "requires support for WebAssembly and WebGL 2.0."
  - Only the Compatibility renderer works: "Forward+/Mobile are not supported on the web platform."
  - Safari has WebGL 2 issues, so Chromium and Firefox are recommended.
- Threads — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - Since 4.3, single-threaded export is the default and preferred option. It cannot use threads and is "less performant."
  - Thread Support needs SharedArrayBuffer, which needs a secure context and COOP/COEP headers. Without them the project won't run.
  - The PWA service worker can simulate those headers.
  - GDExtensions need "Extensions Support" and the same headers.
- PWA — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - A built-in "Progressive Web App > Enable" option sets icons, display mode and orientation.
  - Its service worker lets the project load offline after the first load, and an optional Offline Page is available.
  - Browsers may evict the cache.
- Mobile browsers: "Performance is limited" because Wasm is slower than native. The docs advise feature tags for low-end settings and optimized templates — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt)
- Audio on web — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - The default "Sample" mode (Web Audio) has no AudioEffects, reverb or doppler, and positional audio may be inconsistent.
  - "Stream" mode restores the full features but adds latency, especially without threads.
- Networking on web — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - No low-level networking.
  - HTTP client, HTTPRequest, WebSocket (client) and WebRTC are supported.
- C#/.NET — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt):
  - "Projects written in C# using Godot 4 currently cannot be exported to the web" (use Godot 3 for that).
  - A forum reply of 17 Apr 2026 (unofficial) says the work is ongoing and "may not make it into 4.7" — [Godot Forum](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821?page=2)
  - Cinevva also states C# can't export to web as of Sept 2026 — [Cinevva](https://app.cinevva.com/guides/godot-vs-unity-web-games)
  - A third-party NuGet package "2dog.browser-wasm 4.7.1.x" exists, but it was not investigated — [NuGet](https://www.nuget.org/packages/2dog.browser-wasm/)
- Build size: an empty Godot web build is about 5 MB with Brotli or about 9 MB gzipped, because the template carries the full engine — [Cinevva](https://app.cinevva.com/guides/godot-vs-unity-web-games). The `.wasm` compresses to about a quarter of its size with gzip. itch.io does not gzip on the fly — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt)
- Renderer feature matrix — [slicker.me, Godot renderers overview](https://slicker.me/godot/renderers.html) (secondary; it mirrors the [official renderers page](https://docs.godotengine.org/fr/4.5/tutorials/rendering/renderers.html)):

  | Feature | Forward+ | Mobile | Compatibility |
  |---|---|---|---|
  | SDFGI, VoxelGI | Yes | No | No |
  | Volumetric fog | Yes | No | No |
  | SSR | Yes | No | No |
  | SSAO + SSIL | Yes | No | No |
  | Glow | Full | Limited | Limited |
  | Omni/spot lights | 512 per cluster cell | 8 per object | 8 per object |
  | Directional lights | 4 | 1 | 1 |

  - Forward+ runs on desktop only, with "no WebGL path."
  - Compatibility is "required for Web exports."
- SDFGI — [Godot docs, Using SDFGI (.rst)](https://docs.godotengine.org/de/4.3/_sources/tutorials/3d/global_illumination/using_sdfgi.rst.txt):
  - It is "only supported when using the Forward Plus rendering backend."
  - It "scales to any world size," with "Read Sky Light" for outdoor scenes, but has "no effect past" Max Distance.
  - It does not support dynamic occluders or emissive surfaces, and "cascade shifts may be visible."
  - It is "one of the most demanding global illumination techniques in Godot."
  - This doc version is 4.3 (2024).
- Experimental WebGPU backend — [GodotCon Boston 2026 talk page](https://talks.godotengine.org/godotcon-boston-2026/talk/CT739D/); repo at [github.com/dwalter/godotwebgpu](https://github.com/dwalter/godotwebgpu):
  - David Walter presented it on 21 July 2026, implemented as a RenderingDeviceDriver.
  - It lets Forward Mobile and Forward+ run in Chrome, Firefox and Safari.
  - Reported speed is about 4x the WebGL pipeline and about 70% of native "in tested scenarios," and it can run the Forward+ GI stack in-browser.
  - It is explicitly "experimental," and AI-assisted development was part of the talk.
  - Cinevva describes broader Godot WebGPU work as not production-ready for web export — [Cinevva](https://app.cinevva.com/guides/godot-vs-unity-web-games)

### Inferences
- **Reusing JS logic:** GDScript and C# cannot run the existing JS directly. All dialogue, quest, schedule, battle and save code would need porting. AI-assisted translation helps, but it is still a rewrite with re-testing. Godot's web export does have a JavaScriptBridge to call page JS, which would allow a web-only shim. That comes from general knowledge and was not verified this session, and it does nothing for desktop builds.
- **Phone co-op:** WebRTC is supported in Godot web builds, so a Godot web build could talk to a JS phone client. On desktop Godot, WebRTC needs the separate webrtc-native GDExtension (general knowledge, not verified this session). Keeping the existing P2P protocol means re-implementing it in Godot's high-level multiplayer API or matching the wire format by hand.
- **The core conflict for this project:** the features that make the look (SDFGI, volumetric fog, SSR) exist only in desktop Forward+. The phone and browser path gets Compatibility (8 lights per object, no fog volumes, no SSR). A Godot path therefore effectively forces a hybrid (Option D) with two visual tiers.
- **Offline:** Godot's built-in PWA option preserves offline web play. Desktop builds are offline by nature.
- **French:** Godot has built-in translation (CSV/PO via TranslationServer). This is general knowledge, not verified this session. The existing French strings would need converting.
- **Tests:** the Playwright suite largely stops applying, because Godot renders to a single canvas with no DOM. Tests would move to a Godot-side framework (for example GUT or GdUnit4, not researched).
- **Forge** is already Godot 4.3 and exports GLB, so Godot is the natural home for it. GLB output also works for Three.js, so Forge does not force the engine choice.

### Gaps
- No official 2026 Godot release notes (4.6/4.7) were fetched. The 4.7.2 version claim relies on Cinevva.
- No measured mobile-browser frame rates for Godot Compatibility 3D scenes were found.
- It was not confirmed whether Godot 4.7 changed the web renderer or audio defaults beyond the 4.3+ docs.
- The status of webrtc-native on desktop in 4.7 was not verified.

## Option C: Unity (Web/WebGPU) and Unreal (no web export; Pixel Streaming)

### Takeaway
Unity 6.6 (released around Aug–Sep 2026) made WebGPU a fully supported web graphics API. It unlocks compute features (GPU Resident Drawer, VFX Graph, Adaptive Probe Volumes, upscaling), Unity 6 officially supports mobile web, and 3D URP builds start around 10.7 MB. It is the only mainstream engine giving one codebase for strong desktop and decent browser and phone graphics, at the cost of a full C# rewrite and a licence once revenue passes $200K. Unreal 5 has no web export. Pixel Streaming needs one cloud GPU per concurrent player and is incompatible with offline or PWA play, so it does not fit this project's constraints.

### Cited Findings
- Unity 6.6 release and WebGPU status — [Cinevva news, Unity 6.6 WebGPU production](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production); also reported by [AlternativeTo](https://alternativeto.net/news/2026/9/unity-6-6-adds-webgpu-build-analysis-and-coreclr-prep/):
  - Released 1 Sept 2026 as a "Supported" release. Cinevva's guide says August 2026 instead, a minor conflict — [Cinevva guide](https://app.cinevva.com/guides/godot-vs-unity-web-games).
  - WebGPU is "no longer experimental, it is now a fully supported feature." It had been experimental since 6.1 (2025).
  - WebGL 2 is still the default, so WebGPU must be added manually, and builds fall back automatically.
  - WebGPU needs a secure context, so builds served from file:// or plain HTTP "silently fall back to WebGL 2."
  - Unity warns that "not all devices reporting WebGPU support deliver consistent experiences," and Graphics Device Filtering can force fallback per browser or GPU.
- WebGPU on Unity web enables GPU Resident Drawer, GPU occlusion culling, STP upscaling, VFX Graph GPU particles, Adaptive Probe Volumes and compute skinning. None of these were available on WebGL 2 — [Cinevva news](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production)
- Wasm64 in 6.6 raises the memory ceiling from 4 GB to 16 GB (Chrome/Edge 128+, Firefox 129+). Progressive Asset Loading delivers assets per scene — [Cinevva news](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production)
- Empty Unity 6 web builds with Brotli are about 7.7 MB (2D built-in), about 10.7 MB (3D URP template) and about 2 MB when aggressively stripped. Mobile web has been supported since Unity 6 — [Cinevva guide](https://app.cinevva.com/guides/godot-vs-unity-web-games); see also [gamemakers.jp (Dec 2023, older than 2024)](https://gamemakers.jp/article/2023_12_04_56453/)
- Unity pricing: Personal is free under $200K revenue or funding. Pro is $2,310 per seat per year ($210/month), effective 12 Jan 2026 — [Cinevva guide](https://app.cinevva.com/guides/godot-vs-unity-web-games)
- Unreal web export:
  - "Unreal Engine 5 has no HTML5 or WebGL export from Epic." Epic moved HTML5 to a community Platform Extension at UE 4.24, and community forks target UE 4.27 with WebGL 2 only — [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export) (competitor vendor page)
  - Epic's browser route for UE5 is Pixel Streaming, which sends video over WebRTC from a GPU machine. Each session needs its own instance, and cost is GPU-hour × concurrent sessions plus bandwidth. Epic deprecated its matchmaker in UE 5.5 — [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export)
  - The claim that consumer GPUs cap H.264 encoding at about 8 sessions is uncited on that page.
- Unreal royalty is 5% of lifetime gross revenue above $1M per product, royalty-free on Epic Games Store sales, with no seat fee for games. Prices were confirmed 4 Nov 2026 per the aggregator — [Toolradar](https://toolradar.com/tools/unreal-engine/pricing)

### Inferences
- **Unity:** WebGPU in a secure context fits a PWA served over HTTPS. A service worker caching Unity's large data and wasm files for offline play is plausible, but Unity does not ship a PWA template according to these sources (unverified). Phone co-op would need a Unity WebRTC or networking stack in C#. All JS logic gets rewritten in C#. Playwright cannot inspect a Unity canvas.
- **Unreal:** Pixel Streaming breaks offline play, needs servers per player (recurring cost), and adds latency for the phone player. It is effectively disqualified under the stated "weigh phone co-op and offline heavily" constraint. A native Unreal desktop build plus a separate JS phone client is possible, but it is the heaviest rewrite of all.

### Gaps
- Official Unity docs on WebGPU and Web builds were not fetched first-hand. All Unity 6.6 facts are via Cinevva and AlternativeTo.
- No mobile-browser performance data for Unity WebGPU URP 3D was found.
- The official Epic Pixel Streaming docs were not fetched.
- The status of third-party UE5-to-WebGPU ports (for example SimplyStream) was not found.

## Option D: hybrid (native desktop build for maximum graphics plus a lighter browser or phone client for co-op)

### Takeaway
The "big screen runs the game, phones join through a browser" pattern is well established: AirConsole since 2015, and Jackbox. It matches this project's existing design, where the second player is already on a phone. A hybrid lets the host use desktop-grade rendering (Godot Forward+, Unity HDRP or Three.js WebGPU) while the phone stays a lightweight JS/PWA client. The cost is maintaining two clients and a shared protocol. No post-mortem of a dark-fantasy RPG built this way was found.

### Cited Findings
- AirConsole turns the browser into a console and the phone into a controller via the phone's browser — [BGR](https://bgr.com/entertainment/airconsole-multiplayer-games-browser-phones); [Liliputing](https://liliputing.com/airconsoles-browser-based-game-platform-uses-your-phone-as-a-controller/); [The Next Web (4 Sept 2015, older than 2024)](https://thenextweb.com/news/airconsole-beat-apple-to-making-great-ios-multiplayer-games). These articles are pre-2024 and were not fetched.
- Jackbox-style games use a phone connection to play — [weekend.com](https://www.weekend.com/post/games-like-jackbox-that-use-phone) (not fetched).
- Godot web builds support WebRTC and WebSocket clients, so a web client can interoperate with a host — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt)

### Inferences
- **The most constraint-friendly hybrid for this project:**
  - Keep the existing JS game logic as the authoritative simulation, shared by both clients.
  - Ship the high-end host as a browser/PWA build with a Three.js WebGPU renderer, or wrap that same web app in Electron or Tauri for a desktop "max graphics" mode.
  - Keep the phone as the current lightweight JS client.
  - This preserves offline play, French text, the P2P protocol and Playwright tests. It is reasoning from the findings above, not a sourced case study.
- A Godot-desktop host plus JS phone client is the alternative hybrid. It gives the best turnkey lighting (SDFGI, volumetric fog), but it forks the game logic into GDScript, and the JS phone client must match the protocol. Keeping quests, saves and schedules in sync across two languages is the main long-term risk.

### Gaps
- No examples were found of narrative RPGs (rather than party games) shipping a native host with a browser phone co-op client, and no post-mortems.
- No data was found on how AirConsole-style titles handle offline or LAN-only play.

## Cross-cutting: offline PWA, phone co-op, French text and Playwright tests per option; what comparable indie, solo or AI-assisted projects choose

### Takeaway
Only Option A and the JS-host hybrid keep all four requirements (offline PWA, phone co-op, French, Playwright) without rework. Godot keeps offline PWA through its built-in option but loses the high-end look on web and invalidates the JS logic and tests. Unity keeps a web path with WebGPU but requires a C# rewrite. Unreal fails offline and phone constraints. Evidence on what comparable solo or AI-assisted projects choose is thin. The clearest 2026 data point is that AI-assisted work is going into bringing Godot Forward+ to WebGPU, which signals demand but is not yet a shippable path.

### Cited Findings
- Godot has a built-in PWA with offline support after first load. Its default single-threaded export avoids COOP/COEP issues and is "preferred" for stores and publishers — [Godot docs .rst](https://godot-es.readthedocs.io/es/4.x/_sources/tutorials/export/exporting_for_web.rst.txt)
- Unity WebGPU needs HTTPS or a secure context, and file:// and HTTP fall back to WebGL 2 — [Cinevva news](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production)
- Unreal Pixel Streaming needs a live GPU server per session, so it cannot work offline — [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export)
- Web portal size budgets: CrazyGames wants an initial download of 50 MB or less (20 MB or less for the mobile homepage), and YouTube Playables under 30 MiB — [Summer Engine](https://www.summerengine.com/make-great-games/unreal-engine-html5-export). This is relevant if the game is ever distributed via portals. A photoreal town will far exceed these budgets without streaming.
- Godot WebGPU backend work was AI-assisted, presented July 2026 as experimental — [GodotCon Boston 2026](https://talks.godotengine.org/godotcon-boston-2026/talk/CT739D/)
- A forum poster recommends GDScript for Godot web builds, since C# can't export there — [Godot Forum, Apr 2026](https://forum.godotengine.org/t/is-there-an-update-on-exporting-c-projects-to-web/128821?page=2)

### Inferences
- **Requirement fit by option** (reasoned from the findings above):

  | Option | Offline PWA | Phone co-op | French text | Playwright tests | Logic reuse |
  |---|---|---|---|---|---|
  | A: Three.js renderer swap | Kept | Kept | Kept | Kept (plus visual diffs) | 100% |
  | B: Godot web | Kept (built-in PWA) | Rebuild over WebRTC | Re-import | Lost | 0% (rewrite to GDScript) |
  | B: Godot desktop | Native | Needs GDExtension or JS phone client | Re-import | Lost | 0% |
  | C: Unity web | Possible (service worker by hand) | Rebuild | Re-import | Lost | 0% (C#) |
  | C: Unreal | Lost with Pixel Streaming | Lost with Pixel Streaming | Re-import | Lost | 0% |
  | D: JS-host hybrid | Kept | Kept | Kept | Kept | Most |
  | D: Godot-host hybrid | Partial | Kept on phone side | Two copies | Partial | Split |

- **Look vs effort:** Godot Forward+ and Unity HDRP reach the concept-art look with the least custom shader work. Three.js WebGPU can approach it with more bespoke TSL work (volumetric sky, wet-surface reflections). The painterly target forgives more than strict photorealism does, which favours a custom web renderer with stylised post-processing.
- **Staged path:** port the renderer to Three.js first, using Forge to produce the GLB town, harbour, hands and weapons. Re-evaluate Godot once the experimental WebGPU backend or official Forward+ web support matures, because the GLB assets carry over either way.

### Gaps
- No published post-mortems were found from solo or AI-assisted developers comparing staying on the web versus moving to Godot or Unity for a 3D RPG in 2025–2026.
- No Reddit (r/gamedev, r/godot) or Hacker News threads were fetched, so community sentiment is not represented.
- No GDC 2025/2026 talks on web-first 3D RPGs were found.
