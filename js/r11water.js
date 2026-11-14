// r11water — ROADMAP R11 phase 4, team WATER: the realistic look's water (harbour, river, shallows).
//
// Contract (r11core): window.R11WATER = { material({ THREE, tier, normals, renderer, scene, env }) -> THREE.Material }.
// r11core uses the material for every water cell (its own geometry: vertex colours, shallows lighter, sunk 0.05) and
// caches it for the session. This module also hangs on R11.on('frame') to move the ripples and, on Ultra and High, to
// draw the reflection.
//
// The water (art bible; picture 3): dark and green, still enough to hold a reflection, never blue.
//   - ripples: core's tileable normal map sampled twice in world space, the two layers sliding across each other
//     (so it never reads as one texture scrolling), on any water cell of any map;
//   - reflection by tier (benchmark report, phase 4): Ultra a planar reflection of the scene at half the frame's
//     resolution, High at a third, Phone none (the overcast sky's cubemap through the standard material);
//   - the reflection takes the water's colour, is bent by the ripples and fades in with the viewing angle (Fresnel).
// The mirror pass is one extra draw of the world per frame, with the water itself, the first-person scene and the
// shadow update left out. It looks for the water each frame by its material, takes the level from the mesh, and does
// nothing on a map with no water in view of the tier. Any throw turns the mirror off for the session (the water then
// looks as it does on Phone); nothing here touches gameplay, saves or storage.
'use strict';
const R11WATER = (function () {
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11water: ' + k + ' failed', e); } catch (x) { /* none */ } } };
  const MIRROR = { ultra: 0.5, high: 0.34, phone: 0 };          // share of the drawing buffer's size, by tier
  const LOOK = { colour: 0x0b211c, rough: 0.07, ripple: 0.42, scale: 0.9, envMirror: 0.08, envPlain: 0.3, tint: [0.3, 0.46, 0.4], strength: 0.34, bend: 0.035 };
  const S = { mat: null, THREE: null, rt: null, cam: null, hooked: false, dead: false, level: null, meshes: [], scanT: -1, tier: 'high', drawn: 0 };
  const U = { uTime: { value: 0 }, uMirror: { value: null }, uMirrorM: { value: null }, uMirrorOn: { value: 0 }, uTint: { value: null }, uBend: { value: LOOK.bend }, uRipple: { value: LOOK.ripple }, uScale: { value: LOOK.scale } };

  function material(o) {
    const THREE = o && o.THREE; if (!THREE) return null;
    if (S.mat) return S.mat;
    S.THREE = THREE; S.tier = (o && o.tier) || 'high';
    U.uMirrorM.value = new THREE.Matrix4(); U.uTint.value = new THREE.Vector3(...LOOK.tint);
    const m = new THREE.MeshStandardMaterial({ color: LOOK.colour, roughness: LOOK.rough, metalness: 0, normalMap: o.normals || null, envMapIntensity: LOOK.envPlain, vertexColors: true });
    // its own envMap, so that envMapIntensity counts (three.js ignores it for a material lit by scene.environment alone)
    if (o.env && o.env.isTexture) m.envMap = o.env;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWaterW; varying vec4 vMirrorUv; uniform mat4 uMirrorM;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n{ vec4 wpos = modelMatrix * vec4(transformed, 1.0); vWaterW = wpos.xyz; vMirrorUv = uMirrorM * wpos; }');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWaterW; varying vec4 vMirrorUv; uniform float uTime, uMirrorOn, uBend, uRipple, uScale; uniform sampler2D uMirror; uniform vec3 uTint; vec3 waterN = vec3(0.0, 1.0, 0.0);')
        // two layers of the same ripples, in world space, sliding across each other; the surface is level, so the
        // tangent frame is the world's (x east, y up, z south)
        .replace('#include <normal_fragment_maps>', `
          #ifdef USE_NORMALMAP
            vec2 wuv = vWaterW.xz * uScale;
            vec3 r1 = texture2D(normalMap, wuv + uTime * vec2(0.012, 0.007)).xyz * 2.0 - 1.0;
            vec3 r2 = texture2D(normalMap, wuv * 2.7 + uTime * vec2(-0.017, 0.011)).xyz * 2.0 - 1.0;
            waterN = normalize(vec3((r1.x + r2.x * 0.6) * uRipple, 1.0, (r1.y + r2.y * 0.6) * uRipple));
            normal = normalize((viewMatrix * vec4(waterN, 0.0)).xyz);
          #endif`)
        .replace('#include <opaque_fragment>', `
          if (uMirrorOn > 0.5) {
            vec2 muv = vMirrorUv.xy / max(vMirrorUv.w, 0.0001) + waterN.xz * uBend;
            vec3 refl = texture2D(uMirror, clamp(muv, 0.002, 0.998)).rgb;
            float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 4.0);
            outgoingLight += refl * uTint * fres * ${LOOK.strength.toFixed(2)};
          }
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'r11water-1';
    m.userData.r11water = true;
    S.mat = m;
    hook();
    return m;
  }

  function hook() {
    if (S.hooked) return;
    try { if (window.R11 && typeof R11.on === 'function') { R11.on('frame', frame); R11.on('tier', (t) => { S.tier = t; }); S.hooked = true; } } catch (e) { warnOnce('hook', e); }
  }

  // the water's meshes in the scene (by material), and their level
  function scan(scene) {
    S.meshes.length = 0; let lo = Infinity;
    scene.traverse((o) => {
      if (!o.isMesh || o.material !== S.mat || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      S.meshes.push(o); lo = Math.min(lo, o.geometry.boundingBox.min.y + o.position.y);
    });
    S.level = S.meshes.length ? lo : null;
  }

  function frame(F) {
    if (!S.mat) return;
    U.uTime.value = F && F.t || 0;
    try { const env = window.R11 && R11.scene && R11.scene.environment; if (env && S.mat.envMap !== env) { S.mat.envMap = env; S.mat.needsUpdate = true; } } catch (e) { /* keep */ }
    const R = window.R11, THREE = S.THREE, share = S.dead ? 0 : (MIRROR[R && R.tier ? R.tier() : S.tier] || 0);
    if (!share || !R || !R.renderer || !R.scene || !R.camera) { U.uMirrorOn.value = 0; S.mat.envMapIntensity = LOOK.envPlain; return; }
    try {
      // look for the water again when the world was rebuilt (its meshes leave the scene) or twice a second
      const t = F && F.t || 0;
      if (!S.meshes.length || !S.meshes[0].parent || t - S.scanT > 0.5 || t < S.scanT) { scan(R.scene); S.scanT = t; }
      if (S.level == null) { U.uMirrorOn.value = 0; return; }
      const r = R.renderer, cam = R.camera, size = r.getDrawingBufferSize(new THREE.Vector2());
      const w = Math.max(64, Math.round(size.x * share)), h = Math.max(64, Math.round(size.y * share));
      if (!S.rt) S.rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true });
      else if (S.rt.width !== w || S.rt.height !== h) S.rt.setSize(w, h);
      if (!S.cam) S.cam = new THREE.PerspectiveCamera();
      // the camera's mirror image in the water (as three.js's Reflector builds it): its place, its aim and its up
      // vector reflected about y = level, the camera's own projection (the lens shift and extended frustum with it;
      // the mirror camera is left-handed to ours, so a sideways shift changes sign), and the near plane slid onto the
      // water so nothing under the surface is drawn
      const y0 = S.level, mc = S.cam;
      cam.updateMatrixWorld();
      const pos = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld), rot = new THREE.Matrix4().extractRotation(cam.matrixWorld);
      const fwd = new THREE.Vector3(0, 0, -1).applyMatrix4(rot), up = new THREE.Vector3(0, 1, 0).applyMatrix4(rot);
      if (pos.y <= y0 + 0.01) { U.uMirrorOn.value = 0; return; }   // under water (never, in play): no mirror
      mc.position.set(pos.x, 2 * y0 - pos.y, pos.z); mc.up.set(up.x, -up.y, up.z);
      mc.lookAt(mc.position.x + fwd.x, mc.position.y - fwd.y, mc.position.z + fwd.z);
      mc.updateMatrixWorld(); mc.matrixWorldInverse.copy(mc.matrixWorld).invert();
      mc.projectionMatrix.copy(cam.projectionMatrix); mc.projectionMatrix.elements[8] *= -1;
      // oblique near plane (Lengyel): the water plane, in the mirror camera's space
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0 - 0.002).applyMatrix4(mc.matrixWorldInverse);
      const cp = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant), P = mc.projectionMatrix, q = new THREE.Vector4();
      q.x = (Math.sign(cp.x) + P.elements[8]) / P.elements[0]; q.y = (Math.sign(cp.y) + P.elements[9]) / P.elements[5]; q.z = -1; q.w = (1 + P.elements[10]) / P.elements[14];
      cp.multiplyScalar(2 / cp.dot(q));
      P.elements[2] = cp.x; P.elements[6] = cp.y; P.elements[10] = cp.z + 1; P.elements[14] = cp.w;
      mc.projectionMatrixInverse.copy(P).invert();
      // world position -> the mirror picture's uv
      U.uMirrorM.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(mc.projectionMatrix).multiply(mc.matrixWorldInverse);
      // draw: no water, no shadow update; then put everything back
      const prevRT = r.getRenderTarget(), prevXr = r.xr.enabled, prevSh = r.shadowMap.autoUpdate, prevAuto = r.autoClear;
      for (const m of S.meshes) m.visible = false;
      r.xr.enabled = false; r.shadowMap.autoUpdate = false; r.autoClear = true;
      r.setRenderTarget(S.rt);
      r.render(R.scene, mc);
      r.setRenderTarget(prevRT);
      r.xr.enabled = prevXr; r.shadowMap.autoUpdate = prevSh; r.autoClear = prevAuto;
      for (const m of S.meshes) m.visible = true;
      U.uMirror.value = S.rt.texture; U.uMirrorOn.value = 1; S.mat.envMapIntensity = LOOK.envMirror; S.drawn++;
    } catch (e) { S.dead = true; U.uMirrorOn.value = 0; S.mat.envMapIntensity = LOOK.envPlain; for (const m of S.meshes) m.visible = true; warnOnce('mirror', e); }
  }

  return { material, LOOK, state: () => ({ mirror: U.uMirrorOn.value > 0.5, level: S.level, meshes: S.meshes.length, dead: S.dead, drawn: S.drawn, size: S.rt ? [S.rt.width, S.rt.height] : null }) };
})();
if (typeof window !== 'undefined') window.R11WATER = R11WATER;
