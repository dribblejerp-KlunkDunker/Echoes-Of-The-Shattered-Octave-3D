// r11three — loads the vendored Three.js (0.186.1, MIT, vendor/three/) and its addons as ES modules, then hands
// them to the classic-script game on window.R11THREE and fires the 'r11three' event. ROADMAP R11. Offline: every
// file is local (the import map in index.html points "three" and "three/addons/" at vendor/three/).
import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
window.R11THREE = { THREE, HDRLoader, GLTFLoader, EffectComposer, RenderPass, GTAOPass, UnrealBloomPass, OutputPass, SMAAPass, ShaderPass, mergeGeometries, mergeVertices };
window.dispatchEvent(new Event('r11three'));
