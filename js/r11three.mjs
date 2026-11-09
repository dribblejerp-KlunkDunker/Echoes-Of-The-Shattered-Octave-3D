// r11three — loads the vendored Three.js (0.186.1, MIT, vendor/three/) and its addons as ES modules, then hands
// them to the classic-script game on window.R11THREE and fires the 'r11three' event. ROADMAP R11. Offline: every
// file is local. No import map (an inline script breaks the desktop app's CSP, script-src 'self'): the vendored addons'
// bare 'three' imports are rewritten to relative paths (vendor/three/README-r11.md).
import * as THREE from '../vendor/three/build/three.module.js';
import { HDRLoader } from '../vendor/three/examples/jsm/loaders/HDRLoader.js';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from '../vendor/three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from '../vendor/three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from '../vendor/three/examples/jsm/postprocessing/ShaderPass.js';
import { mergeGeometries, mergeVertices } from '../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
window.R11THREE = { THREE, HDRLoader, GLTFLoader, EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass, SMAAPass, ShaderPass, mergeGeometries, mergeVertices };
window.dispatchEvent(new Event('r11three'));
