// ============================================================
//  audit54 — The slate and the bells: the Legionnaire audit (Book One ch. 5, 7, 20; ROADMAP R9 item 12).
//
//  Canon: a Legionnaire's core keeps everything it sees and hears. Every morning before the day shift, Factor Vosk walks her
//  line with her green lenses and listens to each one, "like reading a ledger" (ch. 5). Lyra and Kaelen plan on a slate:
//  THEY KEEP EVERYTHING / THEN WE WHISPER, AND WE WRITE (ch. 7). The whole mechanic is [PROPOSED]:
//    * A BELL IN EARSHOT. In Part One, when you go to talk with Kaelen, Lyra, Tobiah or Vane and a Legionnaire stands within
//      seven paces with a clear line to you (a passive one on guard counts), you choose first: say it aloud, write it on the
//      slate (ten minutes, and no bell can read it), or leave it for now. Once per person per day.
//    * WHAT THE BELLS ALSO HEAR (logged by other scenes): a fight at Depot Three (js/tamsin52.js), a Legionnaire left in the
//      doorway there with its bell broken (js/tamsin52.js), a voice at the North Gate while the Church came up the road
//      (js/church55.js).
//    * THE MORNING WALK. From 06:00 to 09:00 on a later day, if anything new was logged, Vosk walks her line. Be in Oakhaven,
//      the clearing, the quarry or the Greenhall and you see her do it, and hear what the bells gave her. Otherwise she tells
//      you herself, the next time you speak to her.
//    * WHAT IT COSTS. Each thing she has heard puts her company store up 15% (to 45% at most); a fight or a body at Depot
//      Three puts a second Legionnaire on the depot until the Rite; and at the Rite she has already been watching the
//      collar walk, so the Hold of js/rite43.js starts with her eye partly on you (ritePenalty). Nothing fails a quest.
//  Flags: p54_log (what the bells heard, bits), p54_walked (what Vosk has heard back), p54_day (the day of the last new
//  entry), p54_s_<id> (the day you last chose for that person). The second guard is transient.
// ============================================================
'use strict';

const AUDIT54 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('audit54: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return false; };
  const partOne = () => hasG() && !F().rite_started && !F().greening && !F().escaped;

  const BITS = { kaelen: 1, lyra: 2, tobiah: 4, vane: 8, fight: 16, body: 32, gate: 64 };
  const PEOPLE = ['kaelen', 'lyra', 'tobiah', 'vane'];
  const WATCH_MAPS = ['oakhaven', 'clearing', 'quarry', 'greenhall'];
  const EARSHOT = 7, WALK_FROM = 6, WALK_TO = 9, STEP = 0.15, CAP = 1.45;

  const TX = {
    bellTitle: S('A bell in earshot'),
    bell: S('{0} stands {1} paces off, with its bell turned your way. The Carillon\'s cores keep everything they hear, and before the day shift the Factor walks her line and hears it all back, like reading a ledger.'),
    aLegionnaire: S('A Legionnaire'),
    sayIt: S('Say it aloud'),
    slateIt: S('Write it on the slate'),
    notHere: S('Not here'),
    slateNote: S('You write small, and turn the slate. THEY KEEP EVERYTHING. THEN WE WHISPER, AND WE WRITE. The answers come back the same way, a line at a time, and the bell hears nothing but chalk.'),
    saidIt: S('You say it aloud. The bell does not move. It does not need to.'),
    // the morning walk
    walkTitle: S('The Factor\'s morning walk'),
    walk: S('Before the day shift Factor Vosk walks her line of Legionnaires with her green lenses up, and stops at each one, and listens, the way a clerk reads down a column. At some of them she stays a little longer.'),
    walkEnd: S('At the end of the line she writes something in a small book, and looks up, through the lenses, at you.'),
    voskTold: S('"I walked my line this morning," says the Factor, before you have said anything. "My Legionnaires tell me everything. It is very restful." She reads it to you from her small book:'),
    heard: {
      kaelen: S('A conversation at the Engineer\'s hut, with company. The coil was mentioned. Twice.'),
      lyra: S('The Cantor\'s visitor spoke of Hearthday and of the Hollow. The Cantor answered on her slate, which my Legionnaires cannot read. You could.'),
      tobiah: S('My junior engineer was told something on the pump floor that made him drop a wrench.'),
      vane: S('The Captain was asked about lift, and cargo, and how many people a ship that size could carry if the cargo were left on the dock.'),
      fight: S('Depot Three, in the middle watch: bronze on bronze, and boots on the terrace. The terraces heard it.'),
      body: S('Depot Three: one of my Legionnaires is lying in the doorway with its bell broken. They do wander, when an engram degrades. They do not usually break their own grilles.'),
      gate: S('The North Gate, at sunrise, while the Church came up the road: somebody did not keep a hand over their mouth.'),
    },
    onWith: S('Go about your day'),
    prices: S('Her company store charges you Consortium prices, adjusted.'),
    guard: S('A second Legionnaire stands at Depot Three now, bell lifted, and does not wander.'),
    guardName: S('Orrin Tey'),
    topic: S('The morning walk'),
    topicNone: S('My Legionnaires have nothing to tell me about you. I find that either very reassuring or very interesting.'),
    jWalk: S('The slate and the bells: the Carillon\'s Legionnaires keep everything they hear, and every morning Factor Vosk walks her line and hears it back. What I say near a bell, she knows by breakfast. What I write on a slate, she does not.'),
  };

  // ================================================================ the log
  const bits = (v) => { let n = 0; v = Number(v) | 0; while (v) { n += v & 1; v >>>= 1; } return n; };
  const logged = () => (hasG() ? Number(F().p54_log) | 0 : 0);
  const walked = () => (hasG() ? Number(F().p54_walked) | 0 : 0);
  const pending = () => logged() & ~walked();
  function log(key) {
    if (!hasG() || !partOne() || guest() || inExtra()) return false;
    const b = BITS[key]; if (!b) return false;
    const f = F(); if ((Number(f.p54_log) | 0) & b) return false;
    f.p54_log = (Number(f.p54_log) | 0) | b; f.p54_day = Number(G.day) || 0;
    if (!f.p54_j) { f.p54_j = true; try { journal('side', TX.jWalk); } catch (e) { /* none */ } }
    return true;
  }
  const heardLines = (v) => Object.keys(BITS).filter((k) => v & BITS[k]).map((k) => '<i>' + TX.heard[k] + '</i>');

  // ================================================================ a bell in earshot
  function earshot() {
    if (!hasG() || typeof Engine === 'undefined' || !Engine.cam) return null;
    const c = Engine.cam; let best = null, bd = EARSHOT;
    for (const e of G.ents || []) {
      if (!e || e.kind !== 'enemy' || e.type !== 'legionnaire' || e.dead || e.hidden || e.dying) continue;   // the Carillon's bells, not the Office's proctors
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d >= bd) continue;
      let clear = true; try { clear = typeof los !== 'function' || los(c.x, c.y, e.x, e.y); } catch (err) { clear = true; }
      if (clear) { best = e; bd = d; }
    }
    return best ? { e: best, d: bd } : null;
  }
  // whether to ask before this conversation, and the bell if so
  function asks(e) {
    if (!e || !PEOPLE.includes(e.id) || !partOne() || guest() || inExtra()) return null;
    const f = F(), day = Number(G.day) || 0;
    if (Number(f['p54_s_' + e.id]) === day + 1) return null;
    return earshot();
  }

  // ================================================================ the morning walk
  const walkHour = () => { const h = hour(); return h >= WALK_FROM && h < WALK_TO; };
  const walkDue = () => hasG() && partOne() && pending() !== 0 && (Number(G.day) || 0) > (Number(F().p54_day) | 0);
  function walk(present) {
    const f = F(), p = pending(); if (!p) return;
    f.p54_walked = walked() | p; f.p54_walks = (Number(f.p54_walks) | 0) + 1;
    const lines = heardLines(p);
    const tail = [TX.prices]; if (p & (BITS.fight | BITS.body)) tail.push(TX.guard);
    const body = (present ? TX.walk : TX.voskTold) + '<br><br>' + lines.join('<br>') + '<br><br>' + (present ? TX.walkEnd + ' ' : '') + tail.join(' ');
    showEvent(TX.walkTitle, body, [{ t: TX.onWith, f: null }]);
    try { if (present && G.mapId === 'quarry') stageGuard(G.map); } catch (e) { warnOnce('guard', e); }
  }

  // ================================================================ what it costs
  const priceMult = () => Math.min(CAP, 1 + STEP * bits(walked()));
  const ritePenalty = () => Math.min(18 * 0.3, 2.2 * bits(walked()));
  const guarded = () => hasG() && !!(walked() & (BITS.fight | BITS.body)) && !F().rite_started && !F().escaped;
  function stageGuard(m) {
    if (!m || m.id !== 'quarry' || !m.named || !m.named.depot || !Array.isArray(m.entities)) return;
    const have = m.entities.find((x) => x && x._p54 === 'guard');
    if (!guarded()) { if (have) m.entities.splice(m.entities.indexOf(have), 1); return; }
    if (have) return;
    const dp = m.named.depot;
    const g = { kind: 'enemy', type: 'legionnaire', x: dp.cx - 0.5, y: dp.cy - 1.2, guard: true, name: TX.guardName, transient: true, _p54: 'guard' };
    m.entities.push(g);
    if (G.map === m) { try { hydrate(g); } catch (e) { warnOnce('hydrate', e); } }
  }

  // ================================================================ wiring
  function tick() {
    if (!hasG() || G.state !== 'play' || guest() || inExtra()) return;
    try { if (walkHour() && walkDue() && WATCH_MAPS.includes(G.mapId)) walk(true); } catch (e) { warnOnce('tick', e); }
  }
  function wire() {
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; }; }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const self = this, args = arguments;
        if (!hasG() || guest() || inExtra() || !e) return _t.apply(self, args);
        // the Factor tells you herself, if you were not there for the walk
        if (e.id === 'vosk' && walkDue()) { walk(false); return undefined; }
        const n = e.id === 'vosk' && typeof NPCS !== 'undefined' ? NPCS.vosk : null;
        if (n && n.topics) {
          const k = TX.topic, own = Object.prototype.hasOwnProperty.call(n.topics, k) ? n.topics[k] : undefined;
          n.topics[k] = walked() ? heardLines(walked()).join(' ') : TX.topicNone;
          try { return _t.apply(self, args); } finally { if (own === undefined) delete n.topics[k]; else n.topics[k] = own; }
        }
        const b = asks(e);
        if (!b) return _t.apply(self, args);
        const f = F(), day = Number(G.day) || 0;
        const name = b.e.name || TX.aLegionnaire;
        showEvent(TX.bellTitle, TX.bell.replace('{0}', name).replace('{1}', String(Math.max(1, Math.round(b.d)))), [
          { t: TX.sayIt, f: () => { f['p54_s_' + e.id] = day + 1; log(e.id); say(TX.saidIt, 'warn', 4000); _t.apply(self, args); } },
          { t: TX.slateIt, f: () => {
            f['p54_s_' + e.id] = day + 1;
            try { if (typeof passHours === 'function') passHours(10 / 60); } catch (err) { /* clock */ }
            _t.apply(self, args);
            try { if (typeof DLG !== 'undefined' && Array.isArray(DLG.log) && G.state === 'dialogue') { DLG.log.unshift({ who: 'them', t: TX.slateNote }); renderDialogue(DLG.choices ? 'choice' : null); } } catch (err) { warnOnce('slate', err); }
          } },
          { t: TX.notHere, f: null },
        ]);
        return undefined;
      };
    }
    if (typeof buyPrice === 'function') {
      const _bp = buyPrice;
      buyPrice = function (n) { const v = _bp.apply(this, arguments); try { if (hasG() && typeof NPCS !== 'undefined' && n === NPCS.vosk) { const k = priceMult(); if (k > 1) return Math.max(1, Math.round(v * k)); } } catch (e) { warnOnce('price', e); } return v; };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { if (hasG()) stageGuard(G.map); } catch (e) { warnOnce('load', e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('audit54 failed to wire', e); }

  return { TX, TEXTS, BITS, PEOPLE, EARSHOT, log, logged, walked, pending, earshot, asks, walk, walkDue, priceMult, ritePenalty, guarded, stageGuard };
})();
if (typeof window !== 'undefined') window.AUDIT54 = AUDIT54;
