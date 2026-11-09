// ============================================================
//  people25 — hand-built four-side views for the people the player sees most (Phase 25)
//
//  The owner, October 2026: painted side views for the main species. The bestiary already had them
//  (js/bestiary20a.js, js/bestiary20b.js: every enemy's own painting cut, turned on a rig and re-lit);
//  the Catalogue Proctor (kept on its pilot stand-ins), the companions and the townsfolk did not. This
//  file rigs them, and then the innkeepers and quest-givers the player talks to most (Hetty, Rooke, Sable, Abner,
//  Nell), the same way, with js/bestiary20b.js's humanoid kit: the body and head as stacks of
//  sections whose width is the painted silhouette and whose depth is authored per band, the arms,
//  staff, jug and boots cut out of the painting and re-hung in 3D, the back painted from the figure's
//  own cloth. js/pixel3d.js asks BEASTB.view(name, 2 or 4, pose) for these names and shows the result
//  for the entity's side or back; the front stays the painting. Nothing here draws per frame, nothing
//  is saved; the Proctor's own stand-in chain (js/anim.js) is untouched for the painted-art-off case.
// ============================================================
'use strict';

(() => {
  if (typeof BEASTB === 'undefined' || !BEASTB.rig) return;
  const L = BEASTB.lib, SP = BEASTB.SPECIES, { humanoid, arm, stride, hangArm } = BEASTB.rig;
  const { paintOut, drawAlong, drawCut, mul } = L;

  // ---------------------------------------------------------------- Catalogue Proctor
  // A grey robe to the ground, a deep hood with the face in its dark, a tall iron staff in the right
  // hand, a stylus in the left. Attack (the painted frames): the staff raised overhead in both hands (a1)
  // and brought down (a2).
  SP.proctor = humanoid({
    W: 108, axT: 52, knee: 112, hip: 96,
    patches: { cloth: [24, 100, 16, 30], hood: [24, 18, 10, 12], sleeve: [10, 62, 8, 16] },
    sil: [[[22, 2], [42, 2], [49, 40], [55, 60], [57, 100], [59, 148], [6, 148], [8, 100], [10, 60], [15, 40]]],
    lift: [
      { poly: [[[0, 0], [21, 0], [21, 148], [0, 148]]], axis: 21.5 },
      { poly: [[[50, 28], [63, 28], [63, 72], [50, 72]]], axis: 49.5 },
    ],
    body: { mask: [[[0, 44], [63, 44], [63, 150], [0, 150]]], depth: (y, al) => (y < 70 ? al * 0.64 : al * 0.72), fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[12, 0], [52, 0], [54, 44], [10, 44]]], depth: (y, al) => al * 1.0, fwd: y => (y < 10 ? -3 : 0) },
    cuts: {
      staff: [[[[8, 0], [23, 0], [23, 150], [8, 150]]], [15, 62], null, [0, -60]],
      hand: [[[[11, 52], [27, 52], [27, 72], [11, 72]]], [19, 62]],
      armL: [[[[48, 28], [63, 28], [63, 74], [48, 74]]], [54, 34]],
      bootR: [[[[8, 146], [32, 146], [32, 160], [8, 160]]], [20, 147]],
      bootL: [[[[34, 146], [57, 146], [57, 160], [34, 160]]], [45, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -11, 11, 147); },
    back(B, S) {
      paintOut(B, [[[22, 6], [44, 6], [47, 44], [19, 44]]], S.pt.hood, { grain: 0.15, smooth: 60 });
      paintOut(B, [[[26, 60], [40, 60], [40, 110], [26, 110]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
      const ax = Math.round(S.ax);
      for (let y = 4; y < 44; y++) { const i = y * B.w + ax; if (L.solidPx ? L.solidPx(B.data[i]) : (B.data[i] >>> 24) > 100) B.data[i] = mul(B.data[i], 0.8); }   // the hood's back seam
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(48), sw = (P.swing || 0) * 6;
      if (!x.atk) {
        const hand = { f: 18, l: -20, y: x.row(62) };   // held a little ahead, so the staff shows beside the robe in profile
        arm(x, { f: 4, l: -17, y: shY }, hand, { pt: 'sleeve', w0: 12, w1: 10, w2: 9, bend: -2, id: 30, hand: S.cut.hand });
        drawAlong(C, S.cut.staff, th, axT, hand, { f: 0.04 * (P.swing || 0), l: 0, up: 1 }, { dz: x.front + 12, id: 40 });
        hangArm(C, S.cut.armL, th, axT, P, v, 19, x.row(34), -sw, 22);
        return;
      }
      // both hands on the staff: raised overhead (a1), brought down and forward (a2)
      const up = x.atk === 1;
      const hand = up ? { f: 8, l: -4, y: x.row(22) } : { f: 24, l: 0, y: x.row(76) };
      for (const l of [-17, 17]) arm(x, { f: 0, l, y: shY }, hand, { pt: 'sleeve', w0: 12, w1: 10, w2: 9, bend: up ? 2 : -3, id: l < 0 ? 30 : 34, hand: l < 0 ? S.cut.hand : null });
      drawAlong(C, S.cut.staff, th, axT, hand, up ? { f: 0.65, l: 0, up: 0.75 } : { f: 0.95, l: 0, up: -0.3 }, { dz: x.front + 12, id: 40 });
    },
  });
  // ---------------------------------------------------------------- Kaelen
  // The companion: a long dark coat, dark hair, the right arm of living glass that glows cyan. Attack:
  // the glass arm drawn back (a1) and driven forward (a2).
  SP.kaelen = humanoid({
    W: 104, axT: 50, knee: 112, hip: 96,
    patches: { cloth: [22, 100, 12, 24], sleeve: [8, 56, 8, 20], hair: [24, 4, 10, 10], glass: [45, 52, 8, 16] },
    sil: [[[22, 0], [40, 0], [48, 30], [50, 60], [50, 130], [12, 130], [10, 60], [12, 30]]],
    lift: [
      { poly: [[[0, 36], [19, 36], [19, 104], [0, 104]]], axis: 19.5 },
      { poly: [[[42, 28], [60, 28], [60, 104], [42, 104]]], axis: 41.5 },
    ],
    body: { mask: [[[0, 28], [60, 28], [60, 148], [0, 148]]], smooth: 1, depth: (y, al) => (y < 60 ? al * 0.62 : al * 0.64), fwd: y => (y > 128 ? 1 : 0) },
    head: { mask: [[[14, 0], [48, 0], [48, 28], [14, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 36], [19, 36], [19, 104], [0, 104]]], [10, 42]],
      armL: [[[[42, 28], [60, 28], [60, 104], [42, 104]]], [50, 34]],
      bootR: [[[[12, 146], [31, 146], [31, 160], [12, 160]]], [21, 147]],
      bootL: [[[[31, 146], [50, 146], [50, 160], [31, 160]]], [40, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -9, 9, 147); },
    back(B, S) {
      paintOut(B, [[[18, 0], [44, 0], [46, 28], [16, 28]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[22, 30], [40, 30], [40, 124], [22, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(40), sw = (P.swing || 0) * 7;
      hangArm(C, S.cut.armR, th, axT, P, v, -19, shY, sw, 21);
      if (!x.atk) { hangArm(C, S.cut.armL, th, axT, P, v, 19, shY, -sw, 22); return; }
      hangArm(C, S.cut.armL, th, axT, P, v, 19, shY, x.atk === 1 ? -24 : 30, 22);
    },
  });

  // ---------------------------------------------------------------- Lyra
  // The companion: red hair in a braid, a green shawl over a brown dress, the hands clasped at the
  // waist. Attack (she has the frames): the hands raised (a1) and thrown forward (a2).
  SP.lyra = humanoid({
    W: 100, axT: 48, knee: 112, hip: 96,
    patches: { cloth: [20, 110, 12, 24], shawl: [10, 46, 8, 14], hair: [15, 8, 6, 12], sleeve: [8, 60, 8, 14] },
    sil: [[[18, 0], [36, 0], [44, 30], [50, 60], [48, 100], [52, 150], [4, 150], [6, 100], [4, 60], [10, 30]]],
    lift: [{ poly: [[[22, 46], [34, 46], [34, 60], [22, 60]]], pt: 'shawl', tol: 70 }],
    body: { mask: [[[0, 30], [53, 30], [53, 150], [0, 150]]], depth: (y, al) => (y < 80 ? al * 0.66 : al * 0.62), fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[10, 0], [44, 0], [44, 30], [10, 30]]], depth: (y, al) => al * 1.0, fwd: y => (y < 10 ? -2 : 0) },
    cuts: {
      hands: [[[[22, 46], [34, 46], [34, 60], [22, 60]]], [28, 48]],
      bootR: [[[[12, 150], [27, 150], [27, 160], [12, 160]]], [19, 151]],
      bootL: [[[[27, 150], [42, 150], [42, 160], [27, 160]]], [34, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -7, 7, 151, 5); },
    back(B, S) {
      paintOut(B, [[[14, 2], [40, 2], [40, 30], [14, 30]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[18, 32], [36, 32], [36, 80], [18, 80]]], S.pt.shawl, { grain: 0.4, smooth: 60 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      const at = !x.atk ? { f: 8, l: 0, y: x.row(46) } : x.atk === 1 ? { f: 6, l: 0, y: x.row(34) } : { f: 20, l: 0, y: x.row(50) };
      drawCut(C, S.cut.hands, th, axT, at.f, at.l, at.y, 0, { dz: x.front + 2, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
    },
  });

  // ---------------------------------------------------------------- townsman
  // A working man of Oakhaven: a cap, a pale shirt with the sleeves rolled, a leather apron, boots.
  SP.townsman = humanoid({
    W: 104, axT: 50, knee: 112, hip: 100,
    patches: { cloth: [22, 80, 14, 24], shirt: [20, 36, 10, 10], sleeve: [6, 50, 8, 18], cap: [26, 4, 8, 8] },
    sil: [[[20, 0], [42, 0], [48, 30], [46, 110], [48, 146], [12, 146], [14, 110], [14, 30]]],
    lift: [
      { poly: [[[0, 36], [16, 36], [16, 104], [0, 104]]], axis: 16.5 },
      { poly: [[[44, 36], [60, 36], [60, 104], [44, 104]]], axis: 43.5 },
    ],
    body: { mask: [[[0, 30], [60, 30], [60, 112], [0, 112]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[14, 0], [46, 0], [48, 30], [12, 30]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 36], [16, 36], [16, 104], [0, 104]]], [8, 40]],
      armL: [[[[44, 36], [60, 36], [60, 104], [44, 104]]], [52, 40]],
      legR: [[[[10, 110], [30, 110], [30, 160], [10, 160]]], [20, 112]],
      legL: [[[[30, 110], [52, 110], [52, 160], [30, 160]]], [41, 112]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 9, 112, 7); },
    back(B, S) {
      paintOut(B, [[[16, 0], [44, 0], [46, 30], [14, 30]]], S.pt.cap, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[20, 32], [42, 32], [42, 72], [20, 72]]], S.pt.shirt, { grain: 0.4, smooth: 60 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(40), sw = (P.swing || 0) * 7;
      hangArm(C, S.cut.armR, th, axT, P, v, -19, shY, sw, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 19, shY, -sw, 22);
    },
  });

  // ---------------------------------------------------------------- townswoman
  // A woman of Oakhaven: a white headscarf, a dark dress with an apron, a clay jug held on the hip.
  SP.townswoman = humanoid({
    W: 100, axT: 48, knee: 112, hip: 100,
    patches: { cloth: [10, 60, 8, 14], apron: [20, 100, 12, 24], scarf: [24, 6, 8, 8], sleeve: [6, 50, 6, 16] },
    sil: [[[16, 0], [40, 0], [46, 32], [48, 100], [50, 150], [6, 150], [8, 100], [10, 32]]],
    lift: [
      { poly: [[[0, 36], [14, 36], [14, 104], [0, 104]]], axis: 14.5 },
      { poly: [[[30, 34], [55, 34], [55, 74], [30, 74]]], axis: 29.5 },
    ],
    body: { mask: [[[0, 32], [55, 32], [55, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[10, 0], [46, 0], [46, 32], [10, 32]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armL: [[[[0, 36], [14, 36], [14, 104], [0, 104]]], [7, 40]],
      jug: [[[[30, 34], [55, 34], [55, 74], [30, 74]]], [36, 40]],
      bootR: [[[[10, 150], [27, 150], [27, 160], [10, 160]]], [18, 151]],
      bootL: [[[[27, 150], [44, 150], [44, 160], [27, 160]]], [36, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -7, 7, 151, 5); },
    back(B, S) {
      paintOut(B, [[[12, 0], [44, 0], [46, 32], [10, 32]]], S.pt.scarf, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[14, 76], [44, 76], [46, 150], [12, 150]]], S.pt.cloth, { grain: 0.25, smooth: 90 });   // the apron is front only: the dress's own cloth behind
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(40), sw = (P.swing || 0) * 6;
      hangArm(C, S.cut.armL, th, axT, P, v, -18, shY, sw, 21);
      drawCut(C, S.cut.jug, th, axT, 10, 14, x.row(40), 0, { dz: x.front + 3, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });
  // ---------------------------------------------------------------- Hetty
  // The innkeeper: grey hair in a bun, a white blouse and brown bodice, an apron over a long skirt, a
  // tankard in the right hand, the left hand on the hip.
  SP.hetty = humanoid({
    W: 130, axT: 62, knee: 112, hip: 100,
    patches: { cloth: [26, 132, 16, 16], apron: [28, 90, 14, 20], sleeve: [12, 44, 8, 12], hair: [34, 1, 10, 6] },
    sil: [[[26, 0], [52, 0], [60, 32], [70, 60], [68, 100], [72, 148], [8, 148], [12, 100], [10, 60], [18, 32]]],
    lift: [
      { poly: [[[0, 34], [30, 34], [30, 74], [0, 74]]], axis: 30.5 },
      { poly: [[[50, 34], [78, 34], [78, 82], [56, 82], [52, 60]]], axis: 50.5 },
    ],
    body: { mask: [[[0, 30], [78, 30], [78, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[20, 0], [58, 0], [60, 30], [18, 30]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 34], [30, 34], [30, 74], [0, 74]]], [16, 38]],
      armL: [[[[50, 34], [78, 34], [78, 82], [56, 82], [52, 60]]], [58, 38]],
      bootR: [[[[20, 148], [41, 148], [41, 160], [20, 160]]], [30, 149]],
      bootL: [[[[41, 148], [62, 148], [62, 160], [41, 160]]], [51, 149]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -10, 10, 149, 5); },
    back(B, S) {
      paintOut(B, [[[24, 0], [56, 0], [58, 30], [22, 30]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[16, 56], [62, 56], [62, 136], [16, 136]]], S.pt.cloth, { grain: 0.6, smooth: 90, from: [[[0, 120], [78, 120], [78, 150], [0, 150]]] });   // the apron is front only: the skirt's cloth
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(38);
      hangArm(C, S.cut.armR, th, axT, P, v, -24, shY, 0, 21);   // the tankard stays with the bodice: it is painted on
      hangArm(C, S.cut.armL, th, axT, P, v, 24, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Rooke
  // The tanner: a shaven head and grey beard, a long leather apron over a brown coat, a scraping
  // blade hanging from the right hand.
  SP.rooke = humanoid({
    W: 104, axT: 50, knee: 112, hip: 100,
    patches: { cloth: [22, 80, 14, 24], sleeve: [6, 50, 8, 16], scalp: [24, 2, 8, 8] },
    sil: [[[18, 0], [40, 0], [46, 28], [48, 100], [48, 146], [12, 146], [12, 100], [13, 28]]],
    lift: [
      { poly: [[[0, 30], [16, 30], [16, 100], [0, 100]]], axis: 16.5 },
      { poly: [[[2, 84], [24, 84], [24, 130], [2, 130]]], axis: 24.5 },
      { poly: [[[44, 30], [59, 30], [59, 100], [44, 100]]], axis: 43.5 },
    ],
    body: { mask: [[[0, 26], [59, 26], [59, 148], [0, 148]]], depth: (y, al) => al * 0.6, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[14, 0], [44, 0], [46, 26], [12, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 30], [16, 30], [16, 84], [0, 84]]], [8, 34]],
      blade: [[[[2, 84], [24, 84], [24, 130], [2, 130]]], [12, 86], null, [0, 40]],
      armL: [[[[44, 30], [59, 30], [59, 100], [44, 100]]], [52, 34]],
      bootR: [[[[14, 146], [31, 146], [31, 160], [14, 160]]], [22, 147]],
      bootL: [[[[31, 146], [48, 146], [48, 160], [31, 160]]], [40, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -9, 9, 147); },
    back(B, S) {
      paintOut(B, [[[18, 0], [42, 0], [44, 26], [16, 26]]], S.pt.scalp, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[20, 30], [40, 30], [40, 124], [20, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(34);
      hangArm(C, S.cut.armR, th, axT, P, v, -19, shY, 0, 21);
      drawAlong(C, S.cut.blade, th, axT, { f: 8, l: -20, y: x.row(86) }, { f: 0.05, l: 0, up: -1 }, { dz: x.front + 4, id: 40 });
      hangArm(C, S.cut.armL, th, axT, P, v, 19, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Sable
  // The archivist: a dark bob, a black robe with a cowl, a ledger held up in the left hand.
  SP.sable = humanoid({
    W: 120, axT: 56, knee: 112, hip: 96,
    patches: { cloth: [26, 110, 14, 24], hair: [28, 6, 8, 8], sleeve: [10, 50, 8, 16] },
    sil: [[[24, 0], [46, 0], [52, 30], [58, 60], [58, 100], [62, 148], [12, 148], [14, 100], [14, 60], [20, 30]]],
    lift: [
      { poly: [[[0, 30], [26, 30], [26, 100], [0, 100]]], axis: 26.5 },
      { poly: [[[44, 18], [78, 18], [78, 70], [50, 70], [46, 50]]], axis: 45.5 },
    ],
    body: { mask: [[[0, 28], [78, 28], [78, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[18, 0], [52, 0], [54, 28], [16, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 10 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 30], [26, 30], [26, 100], [0, 100]]], [16, 34]],
      book: [[[[44, 18], [78, 18], [78, 70], [50, 70], [46, 50]]], [52, 24]],
      bootR: [[[[22, 146], [38, 146], [38, 160], [22, 160]]], [30, 147]],
      bootL: [[[[38, 146], [54, 146], [54, 160], [38, 160]]], [46, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -8, 8, 147, 5); },
    back(B, S) {
      paintOut(B, [[[22, 0], [48, 0], [50, 28], [20, 28]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[28, 30], [46, 30], [46, 124], [28, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x;
      hangArm(C, S.cut.armR, th, axT, P, v, -20, x.row(34), 0, 21);
      drawCut(C, S.cut.book, th, axT, 10, 18, x.row(24), 0, { dz: x.front + 4, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });

  // ---------------------------------------------------------------- Abner
  // The smith: a shaven head, bare arms, a leather apron over a dark shirt, boots.
  SP.hob = humanoid({
    W: 108, axT: 52, knee: 112, hip: 100,
    patches: { cloth: [22, 80, 14, 24], sleeve: [6, 50, 8, 16], scalp: [26, 2, 8, 8] },
    sil: [[[20, 0], [44, 0], [48, 24], [50, 100], [50, 146], [12, 146], [12, 100], [14, 24]]],
    lift: [
      { poly: [[[0, 24], [16, 24], [16, 100], [0, 100]]], axis: 16.5 },
      { poly: [[[46, 24], [63, 24], [63, 100], [46, 100]]], axis: 45.5 },
    ],
    body: { mask: [[[0, 22], [63, 22], [63, 148], [0, 148]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[16, 0], [48, 0], [48, 22], [16, 22]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 24], [16, 24], [16, 100], [0, 100]]], [8, 30]],
      armL: [[[[46, 24], [63, 24], [63, 100], [46, 100]]], [55, 30]],
      bootR: [[[[12, 146], [31, 146], [31, 160], [12, 160]]], [21, 147]],
      bootL: [[[[31, 146], [52, 146], [52, 160], [31, 160]]], [42, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -10, 10, 147); },
    back(B, S) {
      paintOut(B, [[[20, 0], [44, 0], [46, 22], [18, 22]]], S.pt.scalp, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[18, 26], [46, 26], [46, 124], [18, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(30);
      hangArm(C, S.cut.armR, th, axT, P, v, -20, shY, 0, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 20, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Nell
  // The maid: a white cap, a grey dress with an apron, the arms folded across the chest.
  SP.nell = humanoid({
    W: 96, axT: 46, knee: 112, hip: 100,
    patches: { cloth: [16, 120, 12, 20], apron: [18, 90, 10, 20], cap: [20, 4, 8, 8], sleeve: [8, 44, 6, 12] },
    sil: [[[14, 0], [36, 0], [42, 30], [44, 60], [42, 100], [46, 150], [4, 150], [8, 100], [6, 60], [8, 30]]],
    lift: [{ poly: [[[6, 36], [44, 36], [44, 64], [6, 64]]], tol: 70 }],
    body: { mask: [[[0, 30], [50, 30], [50, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[8, 0], [42, 0], [42, 30], [8, 30]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      arms: [[[[6, 36], [44, 36], [44, 64], [6, 64]]], [25, 38]],
      bootR: [[[[10, 150], [25, 150], [25, 160], [10, 160]]], [18, 151]],
      bootL: [[[[25, 150], [40, 150], [40, 160], [25, 160]]], [32, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -7, 7, 151, 5); },
    back(B, S) {
      paintOut(B, [[[10, 0], [40, 0], [40, 30], [10, 30]]], S.pt.cap, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[12, 66], [38, 66], [40, 150], [10, 150]]], S.pt.cloth, { grain: 0.25, smooth: 90 });   // the apron is front only
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.arms, th, axT, 7, 0, x.row(38), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 3, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
    },
  });
  // ---------------------------------------------------------------- Flambeau
  // The priest: a tall mitre, white and gold vestments, a burning censer swinging from the right hand.
  SP.flambeau = humanoid({
    W: 120, axT: 56, knee: 112, hip: 96,
    patches: { cloth: [30, 120, 14, 20], mitre: [36, 10, 8, 10], sleeve: [12, 48, 8, 14] },
    sil: [[[30, 0], [56, 0], [58, 40], [62, 60], [60, 100], [64, 150], [14, 150], [18, 100], [16, 60], [26, 40]]],
    lift: [
      { poly: [[[0, 40], [32, 40], [32, 80], [26, 80], [26, 128], [0, 128]]], axis: 32.5 },
      { poly: [[[50, 40], [71, 40], [71, 88], [50, 88]]], axis: 49.5 },
    ],
    body: { mask: [[[0, 40], [71, 40], [71, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[24, 0], [62, 0], [62, 40], [24, 40]]], depth: (y, al) => al * 1.0, fwd: y => (y < 30 ? -1 : 0) },
    cuts: {
      armR: [[[[0, 40], [32, 40], [32, 80], [0, 80]]], [18, 44]],
      censer: [[[[0, 78], [28, 78], [28, 128], [0, 128]]], [14, 80], null, [0, 40]],
      armL: [[[[50, 40], [71, 40], [71, 88], [50, 88]]], [58, 44]],
      bootR: [[[[20, 150], [36, 150], [36, 160], [20, 160]]], [28, 151]],
      bootL: [[[[36, 150], [52, 150], [52, 160], [36, 160]]], [44, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -8, 8, 151, 4); },
    back(B, S) {
      paintOut(B, [[[30, 44], [46, 44], [46, 124], [30, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(44);
      hangArm(C, S.cut.armR, th, axT, P, v, -22, shY, 0, 21);
      drawAlong(C, S.cut.censer, th, axT, { f: 10, l: -22, y: x.row(80) }, { f: 0.05, l: 0, up: -1 }, { dz: x.front + 4, id: 40 });
      hangArm(C, S.cut.armL, th, axT, P, v, 22, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Vane
  // The privateer: tousled hair, a blue coat with gold facings, a red sash, tall boots.
  SP.vane = humanoid({
    W: 110, axT: 52, knee: 112, hip: 96,
    patches: { cloth: [22, 90, 12, 20], hair: [26, 4, 8, 8], sleeve: [6, 60, 8, 16] },
    sil: [[[20, 0], [44, 0], [50, 28], [50, 100], [50, 136], [14, 136], [14, 100], [14, 28]]],
    lift: [
      { poly: [[[0, 28], [18, 28], [18, 106], [0, 106]]], axis: 18.5 },
      { poly: [[[46, 28], [65, 28], [65, 102], [46, 102]]], axis: 45.5 },
    ],
    body: { mask: [[[0, 26], [65, 26], [65, 138], [0, 138]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[16, 0], [48, 0], [48, 26], [16, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 28], [18, 28], [18, 106], [0, 106]]], [9, 34]],
      armL: [[[[46, 28], [65, 28], [65, 102], [46, 102]]], [55, 34]],
      legR: [[[[10, 134], [33, 134], [33, 160], [10, 160]]], [21, 136]],
      legL: [[[[33, 134], [56, 134], [56, 160], [33, 160]]], [44, 136]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 9, 136, 6); },
    back(B, S) {
      paintOut(B, [[[18, 0], [46, 0], [48, 26], [16, 26]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[20, 30], [46, 30], [46, 130], [20, 130]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(34);
      hangArm(C, S.cut.armR, th, axT, P, v, -20, shY, 0, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 20, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Pim
  // The boy: a mop of hair, a ragged shirt and waistcoat, the hands clasped at the chest.
  SP.pim = humanoid({
    W: 72, axT: 34, knee: 84, hip: 72,
    patches: { cloth: [14, 70, 10, 16], hair: [14, 2, 8, 8], sleeve: [4, 40, 6, 12] },
    sil: [[[12, 0], [28, 0], [32, 24], [34, 60], [32, 100], [34, 112], [6, 112], [8, 100], [6, 60], [8, 24]]],
    lift: [{ poly: [[[12, 30], [28, 30], [28, 50], [12, 50]]], tol: 70 }],
    body: { mask: [[[0, 24], [39, 24], [39, 112], [0, 112]]], depth: (y, al) => al * 0.62, fwd: y => (y > 90 ? 1 : 0) },
    head: { mask: [[[6, 0], [34, 0], [34, 24], [6, 24]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      hands: [[[[12, 30], [28, 30], [28, 50], [12, 50]]], [20, 32]],
      bootR: [[[[4, 108], [19, 108], [19, 120], [4, 120]]], [12, 109]],
      bootL: [[[[19, 108], [34, 108], [34, 120], [19, 120]]], [26, 109]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -6, 6, 109, 4); },
    back(B, S) {
      paintOut(B, [[[8, 0], [32, 0], [32, 24], [8, 24]]], S.pt.hair, { grain: 0.3, smooth: 40 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.hands, th, axT, 6, 0, x.row(32), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 3, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
    },
  });

  // ---------------------------------------------------------------- Vosk
  // The clerk: a cap, spectacles, a long dark coat, a ledger clasped to the chest.
  SP.vosk = humanoid({
    W: 90, axT: 44, knee: 112, hip: 96,
    patches: { cloth: [20, 100, 10, 20], cap: [20, 2, 8, 8], sleeve: [6, 50, 6, 14] },
    sil: [[[14, 0], [36, 0], [42, 28], [44, 60], [44, 100], [44, 132], [6, 132], [6, 100], [6, 60], [8, 28]]],
    lift: [{ poly: [[[4, 36], [30, 36], [30, 72], [4, 72]]], axis: 30.5 }],
    body: { mask: [[[0, 26], [50, 26], [50, 134], [0, 134]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[10, 0], [40, 0], [40, 26], [10, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      book: [[[[4, 36], [30, 36], [30, 72], [4, 72]]], [16, 40]],
      legR: [[[[6, 130], [25, 130], [25, 160], [6, 160]]], [15, 132]],
      legL: [[[[25, 130], [44, 130], [44, 160], [25, 160]]], [34, 132]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -8, 8, 132, 6); },
    back(B, S) {
      paintOut(B, [[[12, 0], [38, 0], [38, 26], [12, 26]]], S.pt.cap, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[14, 30], [36, 30], [36, 128], [14, 128]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.book, th, axT, 10, -10, x.row(40), 0, { dz: x.front + 4, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });

  // ---------------------------------------------------------------- Harrow
  // The hermit: a deep hood and a white beard, a ragged cloak, a lantern in the right hand, a gnarled
  // staff in the left.
  SP.harrow = humanoid({
    W: 130, axT: 62, knee: 112, hip: 96,
    patches: { cloth: [30, 110, 14, 20], hood: [32, 6, 8, 8], sleeve: [14, 56, 8, 14] },
    sil: [[[26, 0], [56, 0], [62, 40], [66, 70], [64, 100], [66, 150], [14, 150], [16, 100], [14, 70], [20, 40]]],
    lift: [
      { poly: [[[0, 48], [26, 48], [26, 116], [0, 116]]], axis: 26.5 },
      { poly: [[[62, 0], [80, 0], [80, 150], [62, 150]]], axis: 61.5 },
    ],
    body: { mask: [[[0, 40], [80, 40], [80, 150], [0, 150]]], depth: (y, al) => al * 0.64, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[20, 0], [62, 0], [62, 40], [20, 40]]], depth: (y, al) => al * 1.0, fwd: y => (y < 10 ? -3 : 0) },
    cuts: {
      lantern: [[[[0, 48], [26, 48], [26, 116], [0, 116]]], [12, 52]],
      staff: [[[[64, 0], [80, 0], [80, 150], [64, 150]]], [72, 50], null, [0, -50]],
      hand: [[[[62, 40], [80, 40], [80, 60], [62, 60]]], [70, 48]],
      bootR: [[[[20, 148], [40, 148], [40, 160], [20, 160]]], [30, 149]],
      bootL: [[[[40, 148], [60, 148], [60, 160], [40, 160]]], [50, 149]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -9, 9, 149, 5); },
    back(B, S) {
      paintOut(B, [[[26, 4], [56, 4], [60, 40], [22, 40]]], S.pt.hood, { grain: 0.15, smooth: 60 });
      paintOut(B, [[[30, 44], [52, 44], [52, 130], [30, 130]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x;
      hangArm(C, S.cut.lantern, th, axT, P, v, -24, x.row(52), 0, 21);
      const hand = { f: 18, l: 24, y: x.row(50) };
      arm(x, { f: 4, l: 22, y: x.row(44) }, hand, { pt: 'sleeve', w0: 12, w1: 10, w2: 9, bend: -2, id: 34, hand: S.cut.hand });
      drawAlong(C, S.cut.staff, th, axT, hand, { f: 0, l: 0, up: 1 }, { dz: x.front + 12, id: 40 });
    },
  });
  // ---------------------------------------------------------------- Tobiah
  // The mechanic: goggles pushed up on his hair, a dark work jacket, a rolled drawing under the left arm.
  SP.tobiah = humanoid({
    W: 100, axT: 48, knee: 112, hip: 100,
    patches: { cloth: [22, 80, 12, 20], hair: [24, 2, 8, 8], sleeve: [6, 50, 8, 16] },
    sil: [[[18, 0], [40, 0], [46, 28], [46, 100], [46, 146], [12, 146], [12, 100], [14, 28]]],
    lift: [
      { poly: [[[0, 30], [16, 30], [16, 104], [0, 104]]], axis: 16.5 },
      { poly: [[[38, 28], [57, 28], [57, 104], [38, 104]]], axis: 37.5 },
    ],
    body: { mask: [[[0, 26], [57, 26], [57, 148], [0, 148]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[14, 0], [44, 0], [46, 26], [12, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 30], [16, 30], [16, 104], [0, 104]]], [8, 34]],
      armL: [[[[38, 28], [57, 28], [57, 104], [38, 104]]], [48, 34]],
      bootR: [[[[10, 146], [30, 146], [30, 160], [10, 160]]], [20, 147]],
      bootL: [[[[30, 146], [50, 146], [50, 160], [30, 160]]], [40, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -9, 9, 147); },
    back(B, S) {
      paintOut(B, [[[16, 0], [42, 0], [44, 26], [14, 26]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[18, 30], [40, 30], [40, 110], [18, 110]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x, shY = x.row(34);
      hangArm(C, S.cut.armR, th, axT, P, v, -19, shY, 0, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 19, shY, 0, 22);
    },
  });

  // ---------------------------------------------------------------- Aldric
  // The alderman: grey hair, a green robe with a chain of office, the hands clasped at the belly.
  SP.aldric = humanoid({
    W: 100, axT: 48, knee: 112, hip: 100,
    patches: { cloth: [20, 90, 12, 20], hair: [22, 2, 8, 8], sleeve: [6, 60, 8, 16] },
    sil: [[[16, 0], [40, 0], [48, 30], [52, 60], [50, 100], [48, 140], [8, 140], [6, 100], [4, 60], [8, 30]]],
    lift: [{ poly: [[[18, 62], [38, 62], [38, 86], [18, 86]]], tol: 70 }],
    body: { mask: [[[0, 26], [56, 26], [56, 142], [0, 142]]], depth: (y, al) => al * 0.62, fwd: () => 0 },
    head: { mask: [[[12, 0], [44, 0], [44, 26], [12, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      hands: [[[[18, 62], [38, 62], [38, 86], [18, 86]]], [28, 64]],
      legR: [[[[10, 138], [29, 138], [29, 160], [10, 160]]], [19, 140]],
      legL: [[[[29, 138], [48, 138], [48, 160], [29, 160]]], [38, 140]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -8, 8, 140, 6); },
    back(B, S) {
      paintOut(B, [[[14, 0], [42, 0], [42, 26], [14, 26]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[16, 28], [40, 28], [40, 130], [16, 130]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.hands, th, axT, 6, 0, x.row(64), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 3, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
    },
  });

  // ---------------------------------------------------------------- Bettany
  // The herbalist: a headscarf, a green dress with an apron, a bundle of dried herbs in the right hand.
  SP.bettany = humanoid({
    W: 104, axT: 50, knee: 112, hip: 100,
    patches: { cloth: [16, 120, 12, 20], apron: [22, 90, 10, 20], scarf: [22, 4, 8, 8], sleeve: [6, 50, 6, 14] },
    sil: [[[16, 0], [40, 0], [46, 30], [48, 60], [46, 100], [50, 150], [6, 150], [8, 100], [8, 60], [12, 30]]],
    lift: [
      { poly: [[[0, 22], [28, 22], [28, 72], [0, 72]]], axis: 28.5 },
      { poly: [[[42, 30], [58, 30], [58, 104], [42, 104]]], axis: 41.5 },
    ],
    body: { mask: [[[0, 28], [58, 28], [58, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[12, 0], [44, 0], [44, 28], [12, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      herbs: [[[[0, 22], [28, 22], [28, 72], [0, 72]]], [16, 30]],
      armL: [[[[42, 30], [58, 30], [58, 104], [42, 104]]], [50, 34]],
      bootR: [[[[12, 150], [27, 150], [27, 160], [12, 160]]], [19, 151]],
      bootL: [[[[27, 150], [42, 150], [42, 160], [27, 160]]], [34, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -7, 7, 151, 5); },
    back(B, S) {
      paintOut(B, [[[14, 0], [42, 0], [42, 28], [14, 28]]], S.pt.scarf, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[12, 68], [44, 68], [46, 150], [10, 150]]], S.pt.cloth, { grain: 0.6, smooth: 90, from: [[[0, 112], [58, 112], [58, 150], [0, 150]]] });   // the apron is front only
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x;
      hangArm(C, S.cut.herbs, th, axT, P, v, -20, x.row(30), 0, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 20, x.row(34), 0, 22);
    },
  });

  // ---------------------------------------------------------------- Tam
  // The old shepherd: white hair and a scarf, a long brown coat, both hands resting on a cane.
  SP.tam = humanoid({
    W: 100, axT: 48, knee: 112, hip: 100,
    patches: { cloth: [20, 100, 12, 20], hair: [20, 2, 8, 8], sleeve: [6, 60, 8, 16] },
    sil: [[[14, 0], [40, 0], [48, 30], [52, 60], [52, 100], [50, 150], [6, 150], [4, 100], [4, 60], [8, 30]]],
    lift: [
      { poly: [[[16, 52], [40, 52], [40, 80], [16, 80]]], tol: 70 },
      { poly: [[[24, 80], [34, 80], [34, 160], [24, 160]]], tol: 70 },
    ],
    body: { mask: [[[0, 28], [56, 28], [56, 150], [0, 150]]], depth: (y, al) => al * 0.62, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[10, 0], [44, 0], [44, 28], [10, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 8 ? -2 : 0) },
    cuts: {
      hands: [[[[16, 52], [40, 52], [40, 80], [16, 80]]], [28, 56]],
      cane: [[[[24, 78], [34, 78], [34, 160], [24, 160]]], [29, 80], null, [0, 60]],
      bootR: [[[[12, 150], [28, 150], [28, 160], [12, 160]]], [20, 151]],
      bootL: [[[[28, 150], [44, 150], [44, 160], [28, 160]]], [36, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -6, 6, 151, 4); },
    back(B, S) {
      paintOut(B, [[[12, 0], [42, 0], [42, 28], [12, 28]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[16, 32], [40, 32], [40, 140], [16, 140]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.hands, th, axT, 12, 0, x.row(56), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 6, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
      drawAlong(C, S.cut.cane, th, axT, { f: 12, l: 0, y: x.row(80) }, { f: 0.02, l: 0, up: -1 }, { dz: x.front + 6, id: 40 });
    },
  });
  // ---------------------------------------------------------------- Quist
  // The scholar: a bald crown and long side hair, a long dark coat, a book clasped to the chest.
  SP.quist = humanoid({
    W: 92, axT: 44, knee: 112, hip: 100,
    patches: { cloth: [18, 100, 12, 20], scalp: [22, 2, 8, 8], sleeve: [4, 60, 6, 14] },
    sil: [[[16, 0], [36, 0], [44, 30], [48, 60], [48, 100], [48, 150], [4, 150], [4, 100], [4, 60], [8, 30]]],
    lift: [{ poly: [[[16, 36], [44, 36], [44, 74], [16, 74]]], tol: 70 }],
    body: { mask: [[[0, 28], [51, 28], [51, 150], [0, 150]]], depth: (y, al) => al * 0.6, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[12, 0], [40, 0], [40, 28], [12, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      book: [[[[16, 36], [44, 36], [44, 74], [16, 74]]], [30, 40]],
      bootR: [[[[8, 150], [25, 150], [25, 160], [8, 160]]], [16, 151]],
      bootL: [[[[25, 150], [44, 150], [44, 160], [25, 160]]], [34, 151]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -6, 6, 151, 4); },
    back(B, S) {
      paintOut(B, [[[14, 0], [38, 0], [38, 28], [14, 28]]], S.pt.scalp, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[14, 32], [36, 32], [36, 140], [14, 140]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.book, th, axT, 10, 4, x.row(40), 0, { kx: 0.4 + 0.6 * Math.abs(x.cs), dz: x.front + 4, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });

  // ---------------------------------------------------------------- Halder
  // The pot-man: a gaunt old man in a shirt and waistcoat, a tray of bowls carried in both hands.
  SP.halder = humanoid({
    W: 90, axT: 44, knee: 110, hip: 100,
    patches: { cloth: [18, 90, 10, 16], scalp: [20, 2, 8, 8], sleeve: [4, 40, 6, 12] },
    sil: [[[18, 0], [34, 0], [40, 28], [44, 60], [42, 100], [40, 144], [8, 144], [6, 100], [6, 60], [10, 28]]],
    lift: [{ poly: [[[6, 54], [46, 54], [46, 82], [6, 82]]], tol: 70 }],
    body: { mask: [[[0, 26], [50, 26], [50, 146], [0, 146]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[12, 0], [38, 0], [38, 26], [12, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      tray: [[[[6, 54], [46, 54], [46, 82], [6, 82]]], [26, 58]],
      bootR: [[[[8, 144], [25, 144], [25, 160], [8, 160]]], [16, 145]],
      bootL: [[[[25, 144], [42, 144], [42, 160], [25, 160]]], [34, 145]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -7, 7, 145, 5); },
    back(B, S) {
      paintOut(B, [[[14, 0], [36, 0], [36, 26], [14, 26]]], S.pt.scalp, { grain: 0.2, smooth: 40 });
      paintOut(B, [[[14, 30], [36, 30], [36, 120], [14, 120]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.tray, th, axT, 14, 0, x.row(58), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 5, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });

  // ---------------------------------------------------------------- Sexton
  // The gravedigger: a ragged hood and coat, both hands resting on a long-handled shovel.
  SP.sexton = humanoid({
    W: 90, axT: 44, knee: 112, hip: 100,
    patches: { cloth: [14, 90, 10, 16], hood: [20, 2, 8, 8], sleeve: [4, 50, 6, 14] },
    sil: [[[14, 0], [34, 0], [42, 26], [44, 60], [42, 100], [42, 150], [6, 150], [4, 100], [4, 60], [8, 26]]],
    lift: [
      { poly: [[[14, 60], [34, 60], [34, 80], [14, 80]]], tol: 70 },
      { poly: [[[14, 80], [34, 80], [34, 160], [14, 160]]], tol: 70 },
    ],
    body: { mask: [[[0, 24], [48, 24], [48, 150], [0, 150]]], depth: (y, al) => al * 0.6, fwd: y => (y > 120 ? 1 : 0) },
    head: { mask: [[[10, 0], [40, 0], [40, 24], [10, 24]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      hands: [[[[14, 60], [34, 60], [34, 80], [14, 80]]], [24, 64]],
      shovel: [[[[14, 78], [34, 78], [34, 160], [14, 160]]], [24, 80], null, [0, 60]],
      bootR: [[[[6, 146], [23, 146], [23, 160], [6, 160]]], [14, 147]],
      bootL: [[[[23, 146], [42, 146], [42, 160], [23, 160]]], [32, 147]],
    },
    legs(x) { stride(x, x.S.cut.bootR, x.S.cut.bootL, -6, 6, 147, 4); },
    back(B, S) {
      paintOut(B, [[[14, 2], [34, 2], [38, 24], [10, 24]]], S.pt.hood, { grain: 0.15, smooth: 60 });
      paintOut(B, [[[12, 28], [36, 28], [36, 140], [12, 140]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.hands, th, axT, 12, 0, x.row(64), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 6, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
      drawAlong(C, S.cut.shovel, th, axT, { f: 12, l: 0, y: x.row(80) }, { f: 0.02, l: 0, up: -1 }, { dz: x.front + 6, id: 40 });
    },
  });

  // ---------------------------------------------------------------- Herald
  // The town herald: a brown coat under a white and gold tabard, a proclamation held open in both hands.
  SP.herald = humanoid({
    W: 104, axT: 50, knee: 112, hip: 100,
    patches: { cloth: [6, 70, 8, 16], tabard: [26, 100, 10, 16], hair: [26, 2, 8, 8], sleeve: [8, 50, 8, 14] },
    sil: [[[22, 0], [40, 0], [50, 28], [56, 60], [54, 100], [52, 140], [8, 140], [6, 100], [6, 60], [12, 28]]],
    lift: [{ poly: [[[14, 40], [50, 40], [50, 100], [14, 100]]], pt: 'tabard', tol: 70 }],
    body: { mask: [[[0, 26], [61, 26], [61, 142], [0, 142]]], depth: (y, al) => al * 0.62, fwd: () => 0 },
    head: { mask: [[[16, 0], [46, 0], [46, 26], [16, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      scroll: [[[[14, 40], [50, 40], [50, 100], [14, 100]]], [32, 44]],
      legR: [[[[8, 138], [30, 138], [30, 160], [8, 160]]], [19, 140]],
      legL: [[[[30, 138], [52, 138], [52, 160], [30, 160]]], [41, 140]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -8, 8, 140, 6); },
    back(B, S) {
      paintOut(B, [[[18, 0], [44, 0], [44, 26], [18, 26]]], S.pt.hair, { grain: 0.3, smooth: 40 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.scroll, th, axT, 12, 0, x.row(44), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 4, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });
  // ---------------------------------------------------------------- Mags
  // The boatwright: grey hair in a bun, a blue coat, one arm in a sling, a coil of rope over the
  // other shoulder.
  SP.mags = humanoid({
    W: 120, axT: 56, knee: 112, hip: 96,
    patches: { cloth: [18, 100, 12, 20], hair: [28, 2, 8, 8], sleeve: [8, 60, 8, 16] },
    sil: [[[24, 0], [48, 0], [56, 30], [60, 60], [58, 100], [58, 130], [14, 130], [14, 100], [12, 60], [18, 30]]],
    lift: [
      { poly: [[[0, 26], [26, 26], [26, 100], [0, 100]]], axis: 26.5 },
      { poly: [[[56, 30], [70, 30], [70, 100], [56, 100]]], axis: 55.5 },
    ],
    body: { mask: [[[0, 26], [70, 26], [70, 132], [0, 132]]], depth: (y, al) => al * 0.62, fwd: () => 0 },
    head: { mask: [[[20, 0], [52, 0], [52, 26], [20, 26]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      rope: [[[[0, 26], [26, 26], [26, 100], [0, 100]]], [14, 32]],
      armR: [[[[56, 30], [70, 30], [70, 100], [56, 100]]], [62, 34]],
      legR: [[[[16, 128], [36, 128], [36, 160], [16, 160]]], [26, 130]],
      legL: [[[[38, 128], [60, 128], [60, 160], [38, 160]]], [49, 130]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 9, 130, 6); },
    back(B, S) {
      paintOut(B, [[[22, 0], [50, 0], [52, 26], [20, 26]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[26, 30], [50, 30], [50, 126], [26, 126]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x;
      hangArm(C, S.cut.rope, th, axT, P, v, -22, x.row(32), 0, 21);
      hangArm(C, S.cut.armR, th, axT, P, v, 22, x.row(34), 0, 22);
    },
  });

  // ---------------------------------------------------------------- the Mourner
  // A veiled figure in dark rags, white lilies held at the chest, barefoot.
  SP.mourner = humanoid({
    W: 90, axT: 44, knee: 112, hip: 100,
    patches: { cloth: [16, 100, 12, 20], veil: [20, 2, 8, 8], sleeve: [6, 60, 6, 14] },
    sil: [[[14, 0], [36, 0], [42, 30], [44, 60], [44, 100], [42, 150], [6, 150], [4, 100], [4, 60], [8, 30]]],
    lift: [{ poly: [[[22, 28], [46, 28], [46, 62], [22, 62]]], axis: 21.5 }],
    body: { mask: [[[0, 28], [49, 28], [49, 152], [0, 152]]], smooth: 2, depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[10, 0], [40, 0], [40, 28], [10, 28]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      flowers: [[[[22, 28], [46, 28], [46, 62], [22, 62]]], [32, 32]],
    },
    back(B, S) {
      paintOut(B, [[[12, 2], [38, 2], [40, 28], [10, 28]]], S.pt.veil, { grain: 0.2, smooth: 50 });
      paintOut(B, [[[14, 32], [36, 32], [36, 140], [14, 140]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.flowers, th, axT, 8, 8, x.row(32), 0, { kx: 0.5 + 0.5 * Math.abs(x.cs), dz: x.front + 4, mirror: x.back, shade: x.back ? 0.85 : 1, id: 32 });
    },
  });

  // ---------------------------------------------------------------- Wren
  // The girl: a crown of flowers in long red hair, a grey dress, the hands clasped, barefoot.
  SP.wren = humanoid({
    W: 60, axT: 28, knee: 80, hip: 70,
    patches: { cloth: [10, 70, 8, 14], hair: [8, 10, 6, 8], sleeve: [4, 40, 5, 10] },
    sil: [[[8, 0], [24, 0], [28, 20], [30, 50], [28, 90], [28, 106], [4, 106], [4, 90], [2, 50], [4, 20]]],
    lift: [{ poly: [[[10, 46], [22, 46], [22, 60], [10, 60]]], tol: 70 }],
    body: { mask: [[[0, 20], [32, 20], [32, 106], [0, 106]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[4, 0], [28, 0], [28, 20], [4, 20]]], depth: (y, al) => al * 1.0, fwd: y => (y < 4 ? -1 : 0) },
    cuts: {
      hands: [[[[10, 46], [22, 46], [22, 60], [10, 60]]], [16, 48]],
    },
    back(B, S) {
      paintOut(B, [[[6, 0], [26, 0], [26, 20], [6, 20]]], S.pt.hair, { grain: 0.3, smooth: 40 });
    },
    dress(x) {
      const { C, S, th, axT } = x;
      drawCut(C, S.cut.hands, th, axT, 5, 0, x.row(48), 0, { kx: 0.3 + 0.7 * Math.abs(x.cs), dz: x.front + 2, mirror: x.back, shade: x.back ? 0.85 : 1, id: 30 });
    },
  });

  // ---------------------------------------------------------------- Burlsick
  // The burl-sick man: twigs growing from both arms, a waistcoat over a shirt, trousers and boots.
  SP.burlsick = humanoid({
    W: 130, axT: 62, knee: 112, hip: 100,
    patches: { cloth: [28, 90, 12, 16], hair: [30, 2, 8, 8], sleeve: [10, 50, 8, 16] },
    sil: [[[24, 0], [48, 0], [54, 26], [56, 100], [54, 130], [18, 130], [16, 100], [18, 26]]],
    lift: [
      { poly: [[[0, 16], [20, 16], [20, 104], [0, 104]]], axis: 20.5 },
      { poly: [[[54, 16], [76, 16], [76, 104], [54, 104]]], axis: 53.5 },
    ],
    body: { mask: [[[0, 24], [76, 24], [76, 132], [0, 132]]], depth: (y, al) => al * 0.6, fwd: () => 0 },
    head: { mask: [[[22, 0], [52, 0], [52, 24], [22, 24]]], depth: (y, al) => al * 1.0, fwd: y => (y < 6 ? -2 : 0) },
    cuts: {
      armR: [[[[0, 16], [20, 16], [20, 104], [0, 104]]], [10, 30]],
      armL: [[[[54, 16], [76, 16], [76, 104], [54, 104]]], [64, 30]],
      legR: [[[[18, 128], [38, 128], [38, 160], [18, 160]]], [28, 130]],
      legL: [[[[38, 128], [58, 128], [58, 160], [38, 160]]], [48, 130]],
    },
    legs(x) { stride(x, x.S.cut.legR, x.S.cut.legL, -9, 9, 130, 6); },
    back(B, S) {
      paintOut(B, [[[24, 0], [50, 0], [52, 24], [22, 24]]], S.pt.hair, { grain: 0.3, smooth: 40 });
      paintOut(B, [[[26, 28], [50, 28], [50, 124], [26, 124]]], S.pt.cloth, { vertical: true, like: S.pt.cloth.mean, tol: 60, grain: 0.5 });
    },
    dress(x) {
      const { C, S, th, axT, P, v } = x;
      hangArm(C, S.cut.armR, th, axT, P, v, -22, x.row(30), 0, 21);
      hangArm(C, S.cut.armL, th, axT, P, v, 22, x.row(30), 0, 22);
    },
  });
})();
