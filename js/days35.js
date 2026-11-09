// ============================================================
//  days35 — the canon days (owner's ruling, 28 Oct: "match any inconsistency to the book").
//
//  Game day 0 is Nullday, canon's Day 1 (the Madder birth). Three things in Part One used to have happened already on day 0;
//  in Book One they come later in the nine days, and now they wait for their day:
//    * DAVIN HALE dies at the Boar & Dulcimer on Hearthday evening (ch. 4; game day 2, from 20:00). Until then Hetty's house
//      rule has no name on it, Orla is waiting for her son, and the town has no rumour of him. Rooke has his boots to carry
//      from the next morning (Massday, day 3), as in ch. 6, where they come to the door "at the first hour".
//    * PIM'S WHISTLE. Lyra teaches it to him on Hearthday afternoon, on the Carders' step (ch. 6, l. 2013); the Hedge
//      whistles it from the tannery culvert at the Listening Hour on Massday (day 3, from 19:00), and he goes. Lyra brings
//      him back, singing out loud.
//    * THE CHURCH comes up the Greenroot road at sunrise on Dawnday (ch. 7; day 5, from 06:00). The herald reads the
//      warrant and Lyra is taken into the Church's protection until the Rite: two Legionnaires at her door, and no speech
//      (ch. 9: "They did not let her speak for the last four days"); she answers on a slate. If the coil is done sooner,
//      the Church is already in town (the game's own trigger, rite_ready), and the same follows from then.
//  Missing a day changes lines, never fails a quest. The flags (davin_gone, pim_lured, church_come) are set by the clock
//  and saved, so a save never runs the town backwards.
// ============================================================
'use strict';

const DAYS35 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const after = (day, h) => { const d = Number(G.day) || 0; return d > day || (d === day && hour() >= h); };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('days35: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  // the extras after Book One (js/extras17.js) keep their own calendar, in their own session and on their own maps
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return typeof G !== 'undefined' && G && /^(cantabile|p17)/.test(String(G.mapId || '')); };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };

  const WHEN = { davin: [2, 20], whistle: [2, 14], lure: [3, 19], boots: [3, 0], church: [5, 6] };

  const TX = {
    hettyGreet: S('Sit anywhere that isn\'t broken. Small beer or smaller. We do not sing in here. House rule.'),
    orlaGreet: S('Come closer, I cannot turn. If you see my Davin, send him home before the Listening Hour.'),
    davinAlive: S('Orla Hale\'s boy sings for coppers when Hetty isn\'t looking. He has his mother\'s harvest song, all four lines. Somebody should tell him to keep it in his chest.'),
    orlaTopic: S('My son Davin sings for coppers at the Boar when Hetty lets him, which is never. He has my harvest song. All of it, even the fourth line. I have told him to keep it in his chest.'),
    pimEarly: S('Mam says the Hedge talks at the dead hour, and you don\'t listen. I listen a bit. Not enough to go.'),
    pimWhistle: S('Lyra taught me a whistle. Two notes, down. If I\'m ever lost I whistle it, and she whistles it back, and then I know it\'s her. Only me and Lyra know it.'),
    pimLured: S('Something whistled my whistle from the culvert. Only me and Lyra know my whistle. I went. I don\'t remember going. Lyra came out after me and sang, out loud, and her mouth was bleeding after.'),
    church: S('At sunrise the Church comes up the Greenroot road under glass-fire, singing. In the square a herald reads the warrant aloud: the Pure Note held over Oakhaven day and night until the Rite, the Hollow given to the Pure Flame when the Rite begins, and the Cantor, Lyra Ashgrove, kept in the Church\'s protection until then. Two Legionnaires cross the square to her.'),
    churchNow: S('The Church has come up the Greenroot road under glass-fire, singing. In the square a herald reads the warrant aloud: the Pure Note held over Oakhaven day and night until the Rite, the Hollow given to the Pure Flame when the Rite begins, and the Cantor, Lyra Ashgrove, kept in the Church\'s protection until then. Two Legionnaires cross the square to her.'),
    churchJournal: S('The Church came up the Greenroot road. The herald read the warrant in the square: the Pure Note held over Oakhaven until the Rite, the Hollow given to the Pure Flame when the Rite begins, and Lyra kept in the Church\'s protection. There are Legionnaires at her door now, and she is not to speak.'),
    slate: S('She cannot speak; it is in the rubric. She writes on her slate, small and quick, and turns it to you.'),
    lyraGreet: {
      polite: S('YOU CAME. SIT. I CAN\'T TALK. THEY SAY THE VOICE IS NOT TO BE WORN OUT.'),
      normal: S('A sister in grey warms honey at the hearth and says, to nobody, "You are very fortunate." Lyra rolls her eyes at the slate.'),
      blunt: S('NOT HERE. THEY READ EVERYTHING. WRITE SMALL.'),
    },
  };

  // the custody guard at Lyra's door: two of the Carillon, bells lifted (ch. 7, l. 2322)
  const GUARDS = [{ x: 5.0, y: 7.4, name: 'Brannoc Hewe' }, { x: 7.0, y: 7.4, name: 'Sella Marr' }];

  // ================================================================ the clock
  function sync() {
    if (!hasG() || inExtra()) return;   // the extras run their own calendar after Book One
    const f = G.flags;
    if (!f.davin_gone && after(...WHEN.davin)) f.davin_gone = true;
    if (!f.pim_lured && after(...WHEN.lure)) f.pim_lured = true;
    // js/church55.js holds this for the hour in which you can still be there for it
    const held = () => { try { return typeof CHURCH55 !== 'undefined' && CHURCH55.holds(); } catch (e) { return false; } };
    if (!f.church_come && (f.rite_ready || f.rite_started || after(...WHEN.church)) && !held()) {
      f.church_come = true;
      if (!f.rite_started && !f.greening && !f.escaped && !guest()) {
        say(f.rite_ready && !after(...WHEN.church) ? TX.churchNow : TX.church, 'warn', 12000);
        try { journal('main', TX.churchJournal); } catch (e) { warnOnce('journal', e); }
      }
    }
  }
  const custody = () => hasG() && !!G.flags.church_come && !G.flags.rite_started;

  // ================================================================ the town's lines, by the day
  function dress(n, id) {
    const f = G.flags;
    if (id === 'hetty') return swap(n, 'greet', 'polite', f.davin_gone ? null : TX.hettyGreet);
    if (id === 'orla') {
      const a = swap(n, 'greet', 'polite', f.davin_gone ? null : TX.orlaGreet);
      const b = swap(n, 'topics', 'Oakhaven', f.davin_gone ? null : TX.orlaTopic);
      return () => { b(); a(); };
    }
    if (id === 'pim') return swap(n, 'topics', 'The Hedge', f.pim_lured ? TX.pimLured : after(...WHEN.whistle) ? TX.pimWhistle : TX.pimEarly);
    if (id === 'rooke') {
      const own = n.quest;
      n.quest = function (g) { if (!g.flags.rooke_boots && !after(...WHEN.boots)) return null; return own ? own.apply(this, arguments) : null; };
      return () => { n.quest = own; };
    }
    if (id === 'lyra' && custody()) {
      const own = n.greet; n.greet = TX.lyraGreet;
      return () => { n.greet = own; };
    }
    return null;
  }
  function swap(n, key, k, val) {
    if (!n[key] || val == null) return () => {};
    const own = n[key][k]; n[key][k] = val;
    return () => { n[key][k] = own; };
  }
  // the town's gossip waits for Davin too: his line is swapped in place, so the list never changes length
  let davinRumour = null, davinAt = -1;
  function gossip() {
    if (typeof RUMOURS === 'undefined' || !Array.isArray(RUMOURS)) return;
    if (davinAt < 0) { davinAt = RUMOURS.findIndex((r) => /^Davin Hale sang/.test(r)); if (davinAt < 0) return; davinRumour = RUMOURS[davinAt]; }
    RUMOURS[davinAt] = G.flags.davin_gone ? davinRumour : TX.davinAlive;
  }

  // ================================================================ the custody guard
  function buildGuards(maps) {
    const m = maps && maps.lyra_house; if (!m || !Array.isArray(m.entities)) return;
    for (const g of GUARDS) m.entities.push({ kind: 'enemy', type: 'legionnaire', x: g.x, y: g.y, passive: true, facing: -Math.PI / 2, requires: 'church_come', until: 'rite_started', name: g.name, p35_guard: true });
    m.baseCount = m.entities.length;
  }

  // ================================================================ wiring
  function wire() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildGuards(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        if (!e || !hasG() || typeof NPCS === 'undefined' || !NPCS[e.id]) return _t.apply(this, arguments);
        if (inExtra()) return _t.apply(this, arguments);
        let undo = null;
        try { sync(); gossip(); undo = dress(NPCS[e.id], e.id); } catch (err) { warnOnce('dress', err); }
        try {
          const r = _t.apply(this, arguments);
          if (e.id === 'lyra' && custody() && typeof DLG !== 'undefined' && DLG.npc === NPCS.lyra && Array.isArray(DLG.log)) {
            DLG.log.unshift({ who: 'them', t: TX.slate });
            try { renderDialogue(DLG.choices ? 'choice' : null); } catch (err) { warnOnce('slate', err); }
          }
          return r;
        } finally { if (undo) undo(); }
      };
    }
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function () { const r = _un.apply(this, arguments); try { if (hasG() && G.state === 'play') { sync(); } } catch (e) { warnOnce('tick', e); } return r; };
    }
    // a save from before this module already has the Church in town: no herald for it
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () { const r = _rg.apply(this, arguments); try { if (hasG() && !inExtra() && (G.flags.rite_ready || G.flags.rite_started)) G.flags.church_come = true; sync(); } catch (e) { warnOnce('restore', e); } return r; };
    }
    // the chapel's Church and Lyra's guard are placed by flag when a map loads, so the clock is read first
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function () { try { sync(); } catch (e) { warnOnce('load', e); } return _lm.apply(this, arguments); };
    }
  }
  try { wire(); } catch (e) { console.warn('days35 failed to wire', e); }

  return { TX, TEXTS, WHEN, GUARDS, sync, custody, after, gossip };
})();
if (typeof window !== 'undefined') window.DAYS35 = DAYS35;
