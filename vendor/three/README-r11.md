# Three.js 0.186.1 (MIT), vendored for R11

Unchanged from the npm package `three@0.186.1`, with one patch: in `examples/jsm/`, every real `import … from 'three';`
(149 files) is rewritten to a relative path to `build/three.module.js`, so the game needs no import map. An import map
is an inline `<script>`, which the desktop app's Content Security Policy (`script-src 'self'`) blocks. Doc-comment
`@three_import` lines are left as they were. Addons that import `three/webgpu` or `three/tsl` are not patched and are
not used by the game.

To update: copy the new package's `build/` and `examples/jsm/`, then re-run the rewrite (any `from 'three';` outside a
comment becomes `from '<relative path to build/three.module.js>';`).
