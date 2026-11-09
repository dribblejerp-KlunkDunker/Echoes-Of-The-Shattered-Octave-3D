// ============================================================
//  chapel27 — Release road R2 (canon sweep): Orrin Pale, Oakhaven's sexton, stands in the Chapel of the Carillon.
//
//  Book One has a living sexton in Oakhaven (he comes "about a burial on Massday", ch. 4; his salt lies along the
//  churchyard paths, ch. 15). The chapel's stock, which Ignatius used to sell as bell-bronze "from bells the Synod did
//  not take", is his now (NPCS.orrin in data.js): no bell in the Reach escaped the Synod, and the Church keeps no shop.
//  His name is the library's [PROPOSED] sexton (tools/library/books, "The Fires on the Ground").
//
//  heist16 already stands Orrin (p16h_orrin) by the west door while its Gazette business is live, from the start until
//  the rite; he takes the stock there, and this module places him only when heist16 does not (its switch off, or the
//  rite begun before the Greening), so there is only ever one of him. Loaded after heist16 so its placement is seen.
//
//  He is a transient entity, placed when the chapel is entered and never saved, so no saved entity index moves; he is
//  there until the Greening, like Oakhaven. Placing him draws no number from the game's random stream.
// ============================================================
'use strict';

const CHAPEL27 = (function () {
  const AT = { map: 'chapel', x: 10.5, y: 10.4, facing: Math.PI };
  const gone = () => typeof G !== 'undefined' && G.flags && !!(G.flags.greening || G.flags.escaped || G.flags.part3 || G.flags.part4);
  function ensure(m) {
    if (!m || m.id !== AT.map || !Array.isArray(m.entities)) return;
    const i = m.entities.findIndex((e) => e && e._c27 === 'orrin');
    // while the Gazette business is live, heist16 already stands Orrin by the west door (p16h_orrin): he keeps the stock there
    const heist = m.entities.some((e) => e && e.id === 'p16h_orrin' && !e.dead);
    if (heist && typeof NPCS !== 'undefined' && NPCS.p16h_orrin && NPCS.orrin && !NPCS.p16h_orrin.shop) NPCS.p16h_orrin.shop = NPCS.orrin.shop;
    if (gone() || heist) { if (i >= 0) m.entities.splice(i, 1); return; }
    if (i >= 0) return;
    const e = { kind: 'npc', id: 'orrin', x: AT.x, y: AT.y, sprite: 'townsman', scale: 1, solid: true, radius: 0.35, facing: AT.facing, transient: true, _decor: true, _c27: 'orrin' };
    // what hydrate() would set, by hand, so the game's random rolls never move
    e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 0; e.dir = 0;
    m.entities.push(e);
  }
  if (typeof loadMap === 'function') {
    const _loadMap = loadMap;
    loadMap = function (id) {
      const r = _loadMap.apply(this, arguments);
      try { if (typeof G !== 'undefined' && G.map) ensure(G.map); } catch (err) { console.warn('chapel27: placement failed', err); }
      return r;
    };
  }
  return { AT, ensure };
})();
if (typeof window !== 'undefined') window.CHAPEL27 = CHAPEL27;
