// r11harbour — ROADMAP R11 phase 4, team HARBOUR: Port Cantabile's Long Mole and the Lantern Yard in the realistic look.
//
// Contract (r11core): a dresser on window.R11DRESSERS: { id: 'harbour', maps(map) -> bool, dress(map, ctx) ->
// { group, hiddenCells, replaced } }. r11core calls it once when it builds a map's world; the group rides in the kit
// group and is torn down with it.
//
// What it does on cantabile_harbour (js/cantabile17.js; the map, its places and its people are that module's and are not
// changed: this file only gives the map's own props a body):
//   - the Forge harbour kit (IDTech3-NextGen-Forge, tests/test_harbour.gd; exported with "collider": false, 512 px maps,
//     under assets/r11/models/forge/): an iron bollard at each of the map's mooring posts (every other one with rope
//     round its neck); a moored boat at each of the map's boats, with its mast, furled sail and a chime on each shroud
//     (canon: every shroud in the harbour carries a chime), lying to its bollard by a painter where one is near; rope
//     coils, casks and crates at the map's own; a lamp post at each street lamp of the Yard, the Mole and the landings;
//     the derrick and the Mole-bell at the Mole-head (one Forge model, parted in two so each stands at its own entity);
//     the sixty-foot iron mast-tower with its rungs, where the map's mast and ladder stand;
//   - an iron ring every few paces in the Mole's faces (canon: "an iron ring every few paces to make fast to");
//   - gulls with a body where the map has gulls.
// Every entity given a body goes into R11.replaced() (no billboard is drawn for it); picking, labels, uses and collision
// are the engine's as always, on the entity itself. The engine already lights the lamps: no second light is made.
// The boats ride on the entity's own yOff (cantabile17's swing(): slack at the slack, together at the turning).
//
// The models load when the harbour is first dressed (about 9 MB), not at start-up: until they are in, the map looks as
// it did (billboards), and nothing is replaced. A failed load leaves it that way. Nothing here writes storage or flags.
'use strict';
const R11HARBOUR = (function () {
  const BASE = 'assets/r11/models/forge/';
  const NAMES = ['bollard', 'bollard_rope', 'swag', 'coil', 'rowboat_mast', 'mast_tower', 'mole_derrick', 'barrel', 'crate', 'lamp_post'];
  const MAPS = { cantabile_harbour: true };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; try { console.warn('r11harbour: ' + k + ' failed', e); } catch (x) { /* none */ } } };
  const hash2 = (x, y) => { let h = Math.imul((x * 16) | 0, 374761393) + Math.imul((y * 16) | 0, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  const ZKf = () => { try { if (typeof R3D !== 'undefined' && +R3D.ZK > 0) return +R3D.ZK; } catch (e) { /* none */ } return 0.61875; };
  const S = { modelsP: null, models: null, last: null, boats: [], hooked: false, stats: {} };

  // ---- the kit: each model as parts { geo (its node transform baked in), mat }, loaded once and kept
  function load(THREE) {
    if (S.modelsP) return S.modelsP;
    const GL = window.R11THREE && window.R11THREE.GLTFLoader;
    if (!GL) return (S.modelsP = Promise.resolve(null));
    const loader = new GL();
    const one = (n) => loader.loadAsync(BASE + n + '.glb.wasm').then((g) => {
      const parts = []; g.scene.updateMatrixWorld(true);
      g.scene.traverse((m) => {
        if (!m.isMesh) return;
        const geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld);
        const mat = m.material; mat.userData.r11shared = true;   // kept across maps: core's teardown leaves it alone
        parts.push({ geo, mat });
      });
      return parts;
    }).catch((e) => { warnOnce('model ' + n, e); return null; });
    S.modelsP = Promise.all(NAMES.map(one)).then((list) => {
      const out = {}; NAMES.forEach((n, i) => { out[n] = list[i]; });
      S.models = out; return out;
    });
    return S.modelsP;
  }

  // the triangles of a geometry on one side of x = cut (the derrick and the bell are one model, standing apart)
  function sideOf(THREE, geo, cut, above) {
    const src = geo.index ? geo.toNonIndexed() : geo.clone(), p = src.attributes.position, keep = [];
    for (let i = 0; i < p.count; i += 3) { const a = p.getX(i) > cut, b = p.getX(i + 1) > cut, c = p.getX(i + 2) > cut; if ((a && b && c) === above && (a || b || c) === above) keep.push(i, i + 1, i + 2); }
    const out = new THREE.BufferGeometry();
    for (const k of Object.keys(src.attributes)) {
      const at = src.attributes[k], n = at.itemSize, arr = new at.array.constructor(keep.length * n);
      for (let j = 0; j < keep.length; j++) for (let c = 0; c < n; c++) arr[j * n + c] = at.array[keep[j] * n + c];
      out.setAttribute(k, new THREE.BufferAttribute(arr, n, at.normalized));
    }
    out.computeBoundingBox();
    return out;
  }

  function dress(map, ctx) {
    const THREE = ctx && ctx.THREE; if (!THREE) return null;
    const group = new THREE.Group(); group.name = 'r11-harbour';
    S.last = { group, map, ready: false }; S.boats = []; S.stats = { map: map.id, loaded: false };
    const here = S.last;
    load(THREE).then((models) => {
      if (!models || S.last !== here) return;                       // the player has gone on to another map
      try { populate(THREE, map, ctx, group, models); here.ready = true; S.stats.loaded = true; } catch (e) { warnOnce('populate', e); }
    });
    hook();
    return { group, hiddenCells: new Set(), replaced: new Set() };
  }

  function populate(THREE, map, ctx, group, models) {
    const M = ctx.M || (window.R11 && R11.M) || 0.33, ZK = ZKf(), tier = (window.R11 && R11.tier && R11.tier()) || ctx.tier || 'high';
    const ents = map.entities || [], replaced = (window.R11 && R11.replaced && R11.replaced()) || new Set();
    const gAt = (x, y) => { try { return map.groundAt(x, y) || 0; } catch (e) { return 0; } };
    const at = (x, y, up) => { const v = ctx.toWorld(x, y, gAt(x, y)); v.y += (up || 0) * M; return v; };
    const o = new THREE.Object3D(), small = tier !== 'phone';
    const st = S.stats; Object.assign(st, { bollards: 0, boats: 0, ropes: 0, coils: 0, casks: 0, crates: 0, lamps: 0, gulls: 0, rings: 0, derrick: 0, bell: 0, tower: 0, replaced: 0 });
    // one instanced mesh per part of a model, for all the places it stands
    const inst = (name, list, shadow) => {
      const parts = models[name]; if (!parts || !list.length) return [];
      return parts.map((p) => {
        const im = new THREE.InstancedMesh(p.geo, p.mat, list.length);
        list.forEach((t, i) => { o.position.copy(t.pos); o.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0, 'YXZ'); o.scale.set((t.sx || t.s || 1) * M, (t.sy || t.s || 1) * M, (t.s || 1) * M); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
        im.instanceMatrix.needsUpdate = true; im.castShadow = !!shadow; im.receiveShadow = true; im.frustumCulled = false; group.add(im);
        return im;
      });
    };
    const take = (e) => { replaced.add(e); st.replaced++; };

    // ---- bollards at the mooring posts; boats at the boats, each lying to the nearest post by its painter
    const posts = ents.filter((e) => e && e.sprite === 'p12r_post'), boats = ents.filter((e) => e && e.p17cBoat);
    const waterY = (x, y) => ctx.toWorld(x, y, gAt(x, y) - 0.05).y;
    const bare = [], roped = [], ropes = [], boatT = [];
    const moorOf = new Map();
    for (const b of boats) {
      let best = null, bd = 5.4;
      for (const p of posts) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd && !moorOf.has(p)) { bd = d; best = p; } }
      if (best) moorOf.set(best, b);
    }
    const postOf = new Map(); for (const [p, b] of moorOf) postOf.set(b, p);
    posts.forEach((p, i) => {
      const t = { pos: at(p.x, p.y), ry: hash2(p.x, p.y) * 6.28, s: 1 };
      (moorOf.has(p) || i % 2 === 0 ? roped : bare).push(t); take(p); st.bollards++;
    });
    boats.forEach((b) => {
      const s = (b.scale || 2) * 0.8, post = postOf.get(b);   // the map's boats are harbour boats, some 6 m long
      // the bow (the model's +z) to its post, or along the quay it lies by, a little off true
      const ry = post ? Math.atan2(post.x - b.x, post.y - b.y) + (hash2(b.x, b.y) - 0.5) * 0.5 : (Math.abs(b.y % 1 - 0.75) < 0.01 ? Math.PI / 2 : hash2(b.y, b.x) * 6.28);
      const pos = ctx.toWorld(b.x, b.y, 0); pos.y = waterY(b.x, b.y) - 0.2 * s * M;
      const t = { pos, ry, s, e: b, y0: pos.y, yOff0: +b.yOff || 0, ph: hash2(b.x * 3, b.y * 7) * 6.28 };
      boatT.push(t); take(b); st.boats++;
      if (post) {
        const a = at(post.x, post.y, 0.56), bow = new THREE.Vector3(pos.x + Math.sin(ry) * 2.12 * s * M, pos.y + 0.66 * s * M, pos.z + Math.cos(ry) * 2.12 * s * M);
        const d = bow.clone().sub(a), flat = Math.hypot(d.x, d.z), len = d.length();
        if (len > 0.2 * M) { ropes.push({ pos: a.clone().add(bow).multiplyScalar(0.5), ry: Math.atan2(-d.z, d.x), rz: Math.atan2(d.y, flat), s: 1, sx: len / (4 * M), sy: Math.min(2.4, Math.max(1, len / (6 * M))) }); st.ropes++; }   // a longer painter hangs deeper
      }
    });
    inst('bollard', bare, small); inst('bollard_rope', roped, small); inst('swag', ropes, false);
    const boatMeshes = inst('rowboat_mast', boatT, true);
    S.boats = boatT.map((t, i) => Object.assign(t, { i })); S.boatMeshes = boatMeshes; S.M = M; S.ZK = ZK;

    // ---- coils, casks, crates and street lamps at the map's own
    const coils = [], casks = [], crates = [], lamps = [];
    // (street lamps only: the zigzag's wall-top lamps stay points of light)
    for (const e of ents) {
      if (!e || replaced.has(e)) continue;
      const r = hash2(e.x, e.y);
      if (e.sprite === 'p17c_coil') { coils.push({ pos: at(e.x, e.y), ry: r * 6.28, s: (e.scale || 0.6) / 0.6 }); take(e); st.coils++; }
      else if (e.sprite === 'p_barrel') { casks.push({ pos: at(e.x, e.y), ry: r * 6.28, s: (e.scale || 0.6) / 0.6 * 0.95 }); take(e); st.casks++; }
      else if (e.sprite === 'p_crate' && !e._crate) { crates.push({ pos: at(e.x, e.y), ry: r * 1.2, s: (e.scale || 0.55) / 0.55 * 0.95 }); take(e); st.crates++; }
      else if ((e._lamp === 'p17c_lamppost' || e.sprite === 'p17c_lamppost') && e._lampZ == null && !(e.scale > 1.05)) { lamps.push({ pos: at(e.x, e.y), ry: r * 6.28, s: (e.scale || 0.9) * 0.8 }); take(e); st.lamps++; }
    }
    inst('coil', coils, false); inst('barrel', casks, small); inst('crate', crates, small); inst('lamp_post', lamps, small);

    // ---- the Mole-head: the derrick with its boom out over the water to the north, the Mole-bell where the map hangs it,
    // the mast-tower where the map's mast and its rungs stand
    const derrick = ents.find((e) => e && e.sprite === 'p17c_derrick'), bell = ents.find((e) => e && e.sprite === 'p17c_molebell');
    const mast = ents.find((e) => e && e.sprite === 'p17c_mast'), rungs = ents.find((e) => e && e.sprite === 'ladder' && e.use === 'p17c_mast');
    const single = (geo, mat, pos, ry, s, pivot) => {
      const m = new THREE.Mesh(geo, mat); m.position.copy(pos); m.rotation.y = ry; m.scale.setScalar(s * M);
      if (pivot) { const q = pivot.clone().multiplyScalar(s * M).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); m.position.sub(q); }
      m.castShadow = m.receiveShadow = true; group.add(m); return m;
    };
    if (models.mole_derrick && (derrick || bell)) {
      for (const p of models.mole_derrick) {
        if (derrick) { single(sideOf(THREE, p.geo, 1.9, false), p.mat, at(derrick.x, derrick.y), Math.PI, 1); st.derrick = 1; }
        if (bell) {
          const g = sideOf(THREE, p.geo, 1.9, true), c = g.boundingBox.getCenter(new THREE.Vector3()); c.y = 0;
          single(g, p.mat, at(bell.x, bell.y), Math.PI / 2, 1, c); st.bell = 1;
        }
      }
      if (st.derrick) take(derrick); if (st.bell) take(bell);
    }
    if (models.mast_tower && mast) {
      for (const p of models.mast_tower) single(p.geo, p.mat, at(mast.x, mast.y), 0, 1);
      take(mast); if (rungs) take(rungs); st.tower = 1;
    }

    // ---- an iron ring every few paces in the Mole's faces, just under the deck (canon)
    const ringAt = [];
    const isLand = (x, y) => gAt(x + 0.5, y + 0.5) > 0.3;   // the deck stands at the Yard's level (0.4); water and shallows lie below
    for (let x = 53; x <= 81; x += 2) for (const [y, dy] of [[50, -1], [52, 1], [54, 1], [55, 1], [47, -1]]) {
      if (!isLand(x, y) || isLand(x, y + dy)) continue;                 // a deck cell with water beyond it on that side
      const edge = dy < 0 ? y : y + 1, lv = gAt(x + 0.5, y + 0.5);
      const pos = ctx.toWorld(x + 0.5, edge + dy * 0.012, lv); pos.y -= 0.34 * M;
      ringAt.push({ pos, ry: 0, s: 1 });
    }
    if (ringAt.length) {
      const ring = new THREE.TorusGeometry(0.15, 0.028, 6, 14), iron = new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.6, metalness: 0.85 });
      const im = new THREE.InstancedMesh(ring, iron, ringAt.length);
      ringAt.forEach((t, i) => { o.position.copy(t.pos); o.rotation.set(0, 0, 0); o.scale.setScalar(M); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.frustumCulled = false; im.receiveShadow = true; group.add(im); st.rings = ringAt.length;
    }

    // ---- gulls with a body: grey back, white breast and head, a yellow bill
    const gulls = ents.filter((e) => e && e.sprite === 'p17c_gull');
    if (gulls.length) {
      const mk = (hex, rough) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough });
      const parts = [
        [new THREE.SphereGeometry(1, 10, 8).scale(0.075, 0.07, 0.15).rotateX(-0.25).translate(0, 0.12, 0), mk(0xb9b9b4, 0.8)],
        [new THREE.SphereGeometry(1, 10, 8).scale(0.068, 0.045, 0.17).rotateX(-0.2).translate(0, 0.145, -0.035), mk(0x5b6066, 0.8)],
        [new THREE.SphereGeometry(0.045, 10, 8).translate(0, 0.215, 0.115), mk(0xb9b9b4, 0.8)],
        [new THREE.ConeGeometry(0.014, 0.06, 6).rotateX(Math.PI / 2).translate(0, 0.21, 0.175), mk(0xa8842a, 0.6)],
      ];
      for (const [geo, mat] of parts) {
        const im = new THREE.InstancedMesh(geo, mat, gulls.length);
        gulls.forEach((e, i) => { o.position.copy(at(e.x, e.y)); o.rotation.set(0, hash2(e.x, e.y) * 6.28, 0); o.scale.setScalar(M * 1.25); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
        im.frustumCulled = false; im.castShadow = small; group.add(im);
      }
      gulls.forEach(take); st.gulls = gulls.length;
    }
  }

  // ---- each frame: the boats ride the entity's own yOff, and (unless motion is reduced) roll a little, each to its own time
  function hook() {
    if (S.hooked) return;
    try { if (window.R11 && typeof R11.on === 'function') { R11.on('frame', frame); S.hooked = true; } } catch (e) { warnOnce('hook', e); }
  }
  function frame(F) {
    const L = S.last; if (!L || !L.ready || !L.group.parent || !S.boatMeshes || !S.boatMeshes.length || !S.boats.length) return;
    let still = false; try { still = typeof GFX !== 'undefined' && !!GFX.reduceMotion; } catch (e) { /* none */ }
    const THREE = window.R11 && R11.THREE; if (!THREE) return;
    const o = frame.o || (frame.o = new THREE.Object3D()), t = (F && F.t) || 0, M = S.M, ZK = S.ZK;
    for (const b of S.boats) {
      const dy = ((+b.e.yOff || 0) - b.yOff0) * ZK;
      o.position.set(b.pos.x, b.y0 + dy, b.pos.z);
      if (b.i === 0) S.stats.boatY = b.y0 + dy;
      o.rotation.set(still ? 0 : Math.sin(t * 0.7 + b.ph) * 0.012, b.ry, still ? 0 : Math.sin(t * 0.9 + b.ph * 1.7) * 0.03, 'YXZ');
      o.scale.setScalar(b.s * M); o.updateMatrix();
      for (const im of S.boatMeshes) im.setMatrixAt(b.i, o.matrix);
    }
    for (const im of S.boatMeshes) im.instanceMatrix.needsUpdate = true;
  }

  const api = {
    id: 'harbour', maps: (map) => !!(map && MAPS[map.id]), dress,
    ready: () => (S.modelsP || Promise.resolve(null)).then(() => !!(S.last && S.last.ready)),
    state: () => Object.assign({ ready: !!(S.last && S.last.ready), children: S.last ? S.last.group.children.length : 0 }, S.stats),
    // the camera that stands where picture 3's stands: on the Long Mole, looking along it to the Mole-head
    benchCam: { map: 'cantabile_harbour', x: 56.2, y: 51.6, dir: 0, pitch: -12, tod: 0.5, weather: 'overcast' },
  };
  return api;
})();
if (typeof window !== 'undefined') { window.R11HARBOUR = R11HARBOUR; (window.R11DRESSERS = window.R11DRESSERS || []).push(R11HARBOUR); }
