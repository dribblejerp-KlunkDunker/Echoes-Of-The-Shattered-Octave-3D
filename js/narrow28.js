// ============================================================
//  narrow28 — Release road R3, "The Narrow comes home": systems the game already has, made to matter.
//
//  Book One's rule is "too loud brings the hounds, too still brings the Hush". This module makes the town, the lamps, the
//  songs and the hounds keep it:
//    * HUSH-LAMPS. A lit hush-lamp within BAL.lampR stops the stillness timer (the Hush) on any map that has one. A
//      hush-whistle, blown outdoors or underground, is pushed into the ground on its stake and pipes on as a lamp for
//      BAL.plantSecs. (game.js useItem still gives its old 25 seconds of breath.)
//    * THE NARROW AS LAW inside the Hedge (lawActive maps; not the Boar, which keeps its own rules). Noise over BAL.breach
//      in a witness's sight gets the ward-sign; a second breach within BAL.warnHours is "a breach of the Narrow",
//      fined through reportCrime. Never while something is chasing you.
//    * SONGS LEARNED FROM PEOPLE, through Hold the Pitch (reedcraft.js), from a "Learn a song…" button in the dialogue
//      (the ledger15 Train… pattern): Lyra the Root note, Old Tam "The Miller's Daughter" (once you told him the truth
//      about the Flume), Bettany the tending breath (for coin). Tobin's notebook, page two, teaches the falling fifth
//      at his reed-pipes in Lyra's house. "The Miller's Daughter" is a new Song: loud, far above the Narrow, and every
//      hound in hearing goes to where it was sung (Book One, ch. 18: Tam in the water-meadow).
//    * HOUND PACKS. Hounds near one another run as a pack behind a leader (larger). A falling fifth that stops the
//      leader (your Song, or Lyra's whistle in party.js) routs the whole pack for BAL.routSecs.
//    * THREE CANON COMBAT RULES. Below BAL.fearAt health your breath is loud (a noise floor). A Quiet goes to a lit
//      lantern. Where a hound bursts, nothing carries for BAL.patchSecs: no Song, and nothing hears you or anyone in it.
//    * THE LISTENING HOUR. In Oakhaven at dusk a lamplighter walks the lanes and lights the hush-lamps one by one (by
//      day they are dark); night-hummers sit at three crossings till dawn; at the dead hour the shift changes with
//      "all's well, all's quiet, keep to the Narrow". All of it follows the clock, so a loaded game or slept hours agree.
//    * FACTION STANDING (canon's Concordance), fed once each by choices already made (Tam, Pim, Sable, the bottles; the
//      heists already move it). It moves shop prices, one line from Harrow and one from Hetty, and one line of Book
//      One's ending. No numbers on screen.
//
//  Nothing here draws on the game's random stream. Planted lamps, dead patches, the lure, the lamplighter and the
//  night-hummers are transient: never saved, so no saved entity index moves, and they are cleared before any map loads so
//  what runs on load sees the map as built. The only saved state is a few flags (n28_c_* for choices already counted,
//  n28_learn_* for lessons), which an old save simply lacks. The tick rides inside updateNarrow (the game's own update),
//  and on a co-op guest it does nothing: the host runs the world.
// ============================================================
'use strict';

const NARROW28 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };

  const BAL = {
    lampR: 2.4,            // a hush-lamp's reach against the stillness, in cells
    plantSecs: 60,         // a planted hush-whistle pipes this long
    breach: 6.5,           // noise that breaks the Narrow inside the Hedge (a sprint is 4.2, the falling fifth +3.6)
    breachFine: 10,
    warnHours: 2,          // a second breach this soon after the ward-sign is fined
    graceSecs: 6,          // one loud moment is one breach, not two
    witnessR: 8,
    fearAt: 0.3, fearNoise: 3.4,
    patchR: 1.8, patchSecs: 40,
    packR: 7, packAlertR: 10, leaderScale: 1.2,
    routSecs: 7, routSpeed: 1.25,
    lureSecs: 10, lureR: 16,
    quietLanternR: 10,
    dusk: 17.6, lampHours: 1.4, dawn: 7, hummersFrom: 19, deadFrom: 1, deadTo: 5,
    hiStanding: 40, loStanding: -15,   // a new game already stands at 10-25 with the Hedge: being "one of ours" is earned
  };

  const TX = {
    plant: S('You push the hush-whistle into the ground on its stake. It pipes on by itself, thin and high: for a minute, this is a lamp.'),
    plantGone: S('The planted whistle runs out of breath and stops.'),
    lampHolds: S('The hush-lamp\'s thin whistle keeps the stillness off you.'),
    wardNamed: S('{0} makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow."'),
    wardHe: S('A man across the lane makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow," he breathes.'),
    wardShe: S('A woman in a doorway makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow," she breathes.'),
    breachTwice: S('Twice now, above the Narrow. Somebody has gone for the watch.'),
    breachCrime: S('a breach of the Narrow'),
    millerSung: S('You sing The Miller\'s Daughter, loud and badly, far above the Narrow, the way Old Tam taught you. Every hound in hearing turns toward the place you are singing from.'),
    millerNone: S('You sing The Miller\'s Daughter, loud and badly, far above the Narrow. Nothing is near enough to come. Something further off may be.'),
    lureEnd: S('The song is gone from the air. The hounds mill about where it was.'),
    rout: S('The leader breaks off with a sound like tearing silk, and the whole pack goes with it.'),
    fear: S('Fear is loud. Your breath comes ragged, and anything listening can hear it.'),
    quietLamp: S('A Quiet turns toward your lantern. They go to a lit lantern, the way moths would if moths ate sound.'),
    patchIn: S('Where the hound burst, the ground has gone dead. Your footsteps stop arriving.'),
    patchSong: S('You sing, and the sound stops at your lips. Where the hound burst, nothing carries.'),
    listening: S('The Listening Hour comes down on Oakhaven the way it always does: with lamplight, and the sound of people closing doors softly.'),
    hummer: S('At the crossing a night-hummer sits on a stool in a shawl, humming under her breath, so that no street in Oakhaven falls wholly silent.'),
    deadHour: S('At the crossings the night-hummers change, stools shuffling, and the murmur goes down the lanes: all\'s well, all\'s quiet, keep to the Narrow. It is the dead hour.'),
    learnBtn: S('Learn a song…'),
    gift: S('A gift'),
    known: S('You know it already.'),
    youAsk: S('Will you teach me?'),
    harrowHi: S('Harrow looks at you a moment longer than he needs to. "People speak well of you inside the Hedge. I hear things at the gate. Go careful."'),
    harrowLo: S('Harrow opens the gate no wider than he must. "The Hedge talks, and it has been talking about you. Whatever you are doing, do it quieter."'),
    hettyHi: S('Hetty slides a cup across before you ask. "On the house. Word gets round the Boar. Folk say you are one of ours now."'),
    hettyLo: S('Hetty wipes the same patch of bar twice. "Folk are talking, and not kindly. Pay first, if you would."'),
    endHi: S('Inside the Hedge they will tell it for years: a stranger who kept to the Narrow when it mattered, and broke it only when it mattered more.'),
    endLo: S('In Oakhaven, afterward, nobody said your name above a murmur, and nobody said it kindly.'),
  };

  // ---- the new Song (must exist before any save is restored: ensurePlayerUpgrades filters songs against SONGS)
  const MILLER = {
    name: S('The Miller\'s Daughter'), hz: '—', cost: 10, noise: 6.0,
    desc: S('Old Tam\'s song, sung loud and badly, far above the Narrow. Every hound in hearing goes to where you sang it, not to you, for a little while. It is the opposite of hiding.'),
  };
  if (typeof SONGS !== 'undefined' && !SONGS.miller) SONGS.miller = MILLER;

  // ---- the people who teach
  const LESSONS = {
    lyra: {
      song: 'root', price: 0, gate: (f) => !!f.lyra_met,
      title: S('The Root note'),
      hint: S('Hold the long cane\'s note, low and steady, until it stops being a noise and becomes a place.'),
      offer: S('"Father set me the long cane first. Sit. Breathe from under the ribs. I will give you the Root note, the one it keeps losing."'),
      done: S('"There," Lyra says, very low. "That is the note. Keep it in your chest; it is not for the street."'),
      fail: S('"Not yet. You are pushing it. Let it sit," Lyra says.'),
      journal: S('Lyra taught me the Root note, the one the Root keeps losing. Low, and from under the ribs.'),
      curve: [[0, 174], [5, 174]], width: 90, duration: 5,
    },
    tam: {
      song: 'miller', price: 0, gate: (f) => !!f.tam_told && !f.tam_left,
      title: S('The Miller\'s Daughter'),
      hint: S('Both verses, up and up for the high note. Nobody ever reaches it.'),
      offer: S('"If you are going to know it, know all of it. Essa\'s verse and mine. It is not a quiet song. It was never meant to be."'),
      done: S('"That is it. You missed the high note. Everyone does. Now you know the whole song, and if some night something has to go singing into the meadow, it need not be me."'),
      fail: S('"No, no. Up. It goes up. Again, and louder than you like," Old Tam says.'),
      journal: S('Old Tam taught me The Miller\'s Daughter, both verses. Sung loud, it pulls every hound in hearing to where you sang it.'),
      curve: [[0, 196], [1, 220], [2, 247], [3, 294], [4, 247], [5, 220]], width: 110, duration: 5,
    },
    bettany: {
      song: 'tending', price: 18, gate: () => true,
      title: S('The tending breath'),
      hint: S('Low and even, through the clay jar, so the mother is mended and the hounds hear nothing.'),
      offer: S('"Forty-one births through a clay jar. The tending note is mostly breath, love; the voice only rides on it. Eighteen for the lesson, and you keep it."'),
      done: S('"There. Your hands will feel it before your ears do. Use it low," Bettany says.'),
      fail: S('"Too much voice. Breath first. Again," Bettany says.'),
      broke: S('"Eighteen, I said. I hum births, not charity."'),
      journal: S('Bettany taught me the tending note the way she hums a birth through a clay jar: mostly breath, the voice riding on it.'),
      curve: [[0, 174], [5, 174]], width: 70, duration: 5,
    },
    tobin: {
      song: 'fifth', price: 0, gate: (f) => !!f.p6t_page_2,
      title: S('The falling fifth'),
      hint: S('The Root, then down a fifth: the long cane first, then the short one, as the notebook says.'),
      offer: S('Page two of the notebook is in your head: the long cane first, the one that sounds the root, then the fifth below it. The long cane is on the first peg.'),
      choice: S('Blow the long cane, then the fifth, as the notebook says.'),
      done: S('The long cane sounds the Root, and then the fifth falls out of it like a dropped stone. You have the falling fifth. Lyra had it by dark, the notebook says. It took you longer.'),
      fail: S('The cane squeals, and the fifth will not fall. Not yet.'),
      journal: S('At Tobin\'s reed-pipes in Lyra\'s house I blew the long cane and the fifth below it, the way his notebook says he taught her. I have the falling fifth.'),
      curve: [[0, 174], [2, 174], [2.6, 116], [5, 116]], width: 100, duration: 5,
    },
  };
  const PIPES_TITLE = 'Tobin\'s reed-pipes', PIPES_LEAVE = 'Leave them on their pegs.';   // tobin.js's own (already French)

  // ---- the Oakhaven night
  const LAMPLIGHTER = { id: 'n28_lamplighter', name: S('Godwin Pettigrew, lamplighter') };
  const HUMMER = { id: 'n28_hummer', name: S('A night-hummer') };
  const CROSSINGS = [[22.6, 24.4, 'townswoman'], [23.0, 44.6, 'townsman'], [50.6, 22.6, 'townswoman']];

  // ---- the Concordance: [flag, faction, delta], applied once each
  const CHOICES = [
    ['tam_told', 'hedge', 3], ['tam_sat', 'hedge', 2], ['tam_left', 'hedge', -2],
    ['pim_safe', 'hedge', 5], ['pim_tended', 'hedge', 2],
    ['sable_kept', 'office', -2], ['sable_accused', 'synod', 4], ['sable_accused', 'hedge', -3], ['sable_joined', 'office', -4],
    ['bottles_freed', 'office', -5], ['bottles_freed', 'hedge', 3], ['bottles_kept', 'captains', 3],
  ];

  // ================================================================ helpers
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const here = () => (hasG() ? G.mapId : null);
  const cam = () => Engine.cam;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const fmt = (s, ...a) => s.replace(/\{(\d+)\}/g, (m, i) => (a[+i] != null ? String(a[+i]) : ''));
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* the message line is cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('narrow28: ' + k + ' failed', e); } };
  const isHound = (e) => e && e.kind === 'enemy' && (e.type === 'hound' || e.type === 'p17n_hound');
  const live = (e) => e && !e.dead && !e.hidden;
  const ents = () => (hasG() && Array.isArray(G.ents) ? G.ents : []);
  let T = 0;   // seconds of play
  const said = {};   // once-a-day lines already said, by key and day (memory only: a reload may say one again)
  const sayDaily = (k, t, cls, ms) => { const key = k + ':' + G.day; if (said[key]) return; said[key] = true; say(t, cls, ms); };

  // ================================================================ 1. hush-lamps
  const planted = [];   // { e, map, left }
  const isLamp = (e) => e && e.kind === 'deco' && e.sprite === 'lamp' && !e.drylamp && !e._n28off && !e.dead;
  function lampNear(x, y) {
    const r2 = BAL.lampR * BAL.lampR;
    for (const e of ents()) if (isLamp(e) && d2(e.x, e.y, x, y) <= r2) return true;
    return false;
  }
  function plantLamp() {
    if (!hasG() || !(G.map.outdoor || G.map.siphoned)) return null;
    for (const p of planted.slice()) dropPlanted(p, true);   // one at a time
    const c = cam();
    const e = { kind: 'deco', sprite: 'lamp', x: c.x + Math.cos(c.dir) * 0.6, y: c.y + Math.sin(c.dir) * 0.6, scale: 0.7, solid: false, radius: 0.1, glow: 0.55, nopick: true, transient: true, _n28lamp: true, label: 'Hush-lamp' };
    if (typeof solidAt === 'function' && solidAt(e.x, e.y)) { e.x = c.x; e.y = c.y; }
    G.map.entities.push(e);
    const p = { e, map: here(), left: BAL.plantSecs };
    planted.push(p);
    say(TX.plant, 'good', 5000);
    return p;
  }
  function dropPlanted(p, quiet) {
    const i = planted.indexOf(p); if (i >= 0) planted.splice(i, 1);
    try { for (const id in G.maps) { const m = G.maps[id]; const j = m && m.entities ? m.entities.indexOf(p.e) : -1; if (j >= 0) m.entities.splice(j, 1); } } catch (e) { /* gone with the map */ }
    if (!quiet && p.map === here()) say(TX.plantGone, '', 3000);
  }

  // ================================================================ 2. the Narrow as law
  const law = { warnedAt: -1e9, lastAt: -1e9 };   // in game hours since day 0 (G.day * 24 + hour)
  const nowH = () => (Number(G.day) || 0) * 24 + hour();
  function npcName(e) {
    const n = typeof NPCS !== 'undefined' ? NPCS[e.id] : null;
    if (!n || !n.name || e.id === 'townsman' || e.id === 'townswoman') return null;
    return String(n.name).split(',')[0];
  }
  function witness() {
    const c = cam(), r2 = BAL.witnessR * BAL.witnessR;
    return ents().find((e) => e.kind === 'npc' && !e.companion && live(e) && !(e.stun > 0) &&
      d2(e.x, e.y, c.x, c.y) < r2 && los(e.x, e.y, c.x, c.y) &&
      (e.lawGuard || Math.abs(normAng(Math.atan2(c.y - e.y, c.x - e.x) - (Number.isFinite(e.facing) ? e.facing : e.dir || 0))) < Math.PI * 0.65)) || null;
  }
  const inFight = () => { const c = cam(); return ents().some((e) => e.kind === 'enemy' && live(e) && e.state === 'chase' && d2(e.x, e.y, c.x, c.y) < 100); };
  function tickLaw() {
    if (typeof lawActive !== 'function' || !lawActive() || here() === 'tavern') return;
    if (!(G.noise >= BAL.breach) || inFight()) return;
    try { const cs = crimeState(); if (cs.custody || cs.resisting) return; } catch (e) { /* no law state */ }
    if (T - law.lastAt < BAL.graceSecs) { law.lastAt = T; return; }
    const w = witness(); if (!w) return;
    law.lastAt = T;
    const h = nowH();
    if (h - law.warnedAt <= BAL.warnHours && law.warned) {
      law.warned = false; law.warnedAt = -1e9;
      say(TX.breachTwice, 'bad', 4000);
      if (typeof reportCrime === 'function') reportCrime(TX.breachCrime, BAL.breachFine);
      return;
    }
    law.warned = true; law.warnedAt = h;
    const nm = npcName(w);
    say(nm ? fmt(TX.wardNamed, nm) : (w.sprite === 'townswoman' || w.id === 'townswoman' ? TX.wardShe : TX.wardHe), 'warn', 6000);
  }

  // ================================================================ 3. songs learned from people
  const knows = (song) => hasG() && Array.isArray(G.player.songs) && G.player.songs.includes(song);
  function lessonFor(id) {
    const L = LESSONS[id];
    if (!L || id === 'tobin' || gone() || knows(L.song) || !SONGS[L.song]) return null;
    try { return L.gate(F()) ? L : null; } catch (e) { return null; }
  }
  let lessonBusy = false;
  async function startLesson(id) {
    const L = LESSONS[id];
    if (!L || lessonBusy || !hasG() || knows(L.song)) return { ok: false, reason: 'none' };
    if ((G.player.gold || 0) < L.price) return { ok: false, reason: 'gold' };
    if (typeof REEDS === 'undefined' || typeof REEDS.holdPitch !== 'function') return { ok: false, reason: 'reeds' };
    lessonBusy = true;
    try {
      if (G.state === 'dialogue' || G.state === 'event') { try { closeModal(); } catch (e) { /* none open */ } try { hide('#event'); } catch (e) { /* none */ } G.state = 'play'; }
      const res = await REEDS.holdPitch({ curve: L.curve, width: L.width, duration: L.duration, title: L.title, hint: L.hint });
      if (!res || res.aborted) return { ok: false, reason: 'aborted' };
      if (!(res.score >= 0.5)) { say(L.fail, 'warn', 5000); return { ok: false, reason: 'fail', score: res.score }; }
      if (!knows(L.song)) G.player.songs.push(L.song);
      G.player.gold -= L.price;
      say(L.done, 'voice', 7000);
      try { journal('side', L.journal); } catch (e) { /* no logbook */ }
      G.flags['n28_learn_' + id] = true;
      return { ok: true, score: res.score };
    } finally { lessonBusy = false; }
  }

  // the dialogue: a "Learn a song…" button and its pane (ledger15's Train… pattern)
  const ui = { mode: null };
  const dlgId = () => (typeof DLG !== 'undefined' && DLG && DLG.ent && typeof DLG.ent.id === 'string' ? DLG.ent.id : '');
  function decorate(mode) {
    const id = dlgId(), L = lessonFor(id);
    if (!L) return;
    const row = document.querySelector('#modal-panel .dlg .btns'); if (!row || document.getElementById('n28-learn')) { if (mode === 'n28') pane(id, L); return; }
    const b = document.createElement('button');
    b.className = 'dfbtn small' + (mode === 'n28' ? ' sel' : ''); b.type = 'button'; b.id = 'n28-learn'; b.textContent = TX.learnBtn;
    b.setAttribute('aria-pressed', String(mode === 'n28'));
    b.onclick = () => {
      if (mode !== 'n28') { DLG.n28 = DLG.n28 || {}; if (!DLG.n28[id]) { DLG.n28[id] = 1; DLG.log.push({ who: 'them', t: L.offer }); } }
      renderDialogue(mode === 'n28' ? null : 'n28');
    };
    const tone = row.querySelector('.tone'); if (tone) row.insertBefore(b, tone); else row.appendChild(b);
    if (mode === 'n28') pane(id, L);
  }
  function pane(id, L) {
    const box = document.getElementById('d-topics'); if (!box) return;
    box.className = 'topics shop'; box.textContent = ''; box.setAttribute('data-n28', 'learn');
    const dear = (G.player.gold || 0) < L.price;
    const b = document.createElement('button');
    b.className = 'dfbtn small shoprow' + (dear ? ' dear' : ''); b.type = 'button'; b.setAttribute('data-n28-song', L.song);
    const nb = document.createElement('b'); nb.textContent = L.title;
    const sp = document.createElement('span'); sp.textContent = SONGS[L.song].desc;
    const em = document.createElement('em'); em.textContent = L.price ? String(L.price) : TX.gift;
    b.append(nb, sp, em);
    b.onclick = () => {
      if ((G.player.gold || 0) < L.price) { DLG.log.push({ who: 'you', t: TX.youAsk }, { who: 'them', t: L.broke || L.fail }); renderDialogue('n28'); return; }
      startLesson(id);
    };
    box.appendChild(b);
  }

  // Tobin's reed-pipes, once page two is read
  function pipesLesson(e) {
    if (!e || !e.tobinPipes || knows('fifth')) return false;
    const L = LESSONS.tobin; if (!L.gate(F()) || !SONGS.fifth) return false;
    showEvent(PIPES_TITLE, L.offer, [{ t: L.choice, f: () => { startLesson('tobin'); } }, { t: PIPES_LEAVE, f: null }]);
    return true;
  }

  // The Miller's Daughter: a lure where it was sung
  let lure = null;   // { map, x, y, left }
  function singMiller() {
    const c = cam();
    lure = { map: here(), x: c.x, y: c.y, left: BAL.lureSecs };
    let n = 0;
    for (const e of ents()) if (isHound(e) && live(e) && d2(e.x, e.y, c.x, c.y) < BAL.lureR * BAL.lureR) { e._n28lure = true; n++; }
    try { Audio_.sfx.song(220, 2.2); } catch (e) { /* no audio */ }
    say(n ? TX.millerSung : TX.millerNone, n ? 'warn' : '', 6000);
    return n;
  }

  // ================================================================ 4/5. hound packs and the rout; Lyra's whistle calls in here
  function setLeader(e, on) {
    if (on && !e._n28lead) { e._n28lead = true; e._n28s0 = e.scale || 1; e.scale = e._n28s0 * BAL.leaderScale; }
    else if (!on && e._n28lead) { e._n28lead = false; if (e._n28s0) e.scale = e._n28s0; }
  }
  function regroup() {
    const hs = ents().filter((e) => isHound(e) && live(e));
    const r2 = BAL.packR * BAL.packR;
    for (const e of ents()) if (isHound(e) && !live(e) && e._n28lead) setLeader(e, false);
    for (const h of hs) h._n28pack = null;
    const leaders = hs.filter((h) => h._n28lead);
    for (const h of hs) {
      if (h._n28lead) continue;
      let best = null, bd = r2;
      for (const L of leaders) { const d = d2(h.x, h.y, L.x, L.y); if (d <= bd) { bd = d; best = L; } }
      if (best) h._n28pack = best;
    }
    for (const h of hs) {
      if (h._n28lead || h._n28pack) continue;
      const mates = hs.filter((o) => o !== h && !o._n28lead && !o._n28pack && d2(o.x, o.y, h.x, h.y) <= r2);
      if (!mates.length) continue;
      setLeader(h, true);
      for (const o of mates) o._n28pack = h;
    }
    for (const L of hs.filter((h) => h._n28lead)) if (!hs.some((o) => o._n28pack === L)) setLeader(L, false);
    // a pack moves together: the leader's alarm is the pack's
    for (const h of hs) {
      const L = h._n28pack; if (!L || h._n28rout > 0 || L._n28rout > 0) continue;
      if (L.state === 'chase' && h.state !== 'chase' && h.state !== 'passive' && d2(h.x, h.y, L.x, L.y) < BAL.packAlertR * BAL.packAlertR) { h.state = 'chase'; h.alertT = 8; }
      else if (h.state === 'chase' && L.state === 'idle') { L.state = 'chase'; L.alertT = 8; }
    }
  }
  function rout(L) {
    const pack = ents().filter((e) => isHound(e) && live(e) && (e === L || e._n28pack === L));
    for (const e of pack) { e._n28rout = BAL.routSecs; e._n28lure = false; }
    say(TX.rout, 'good', 4000);
    return pack.length;
  }
  // called with the foes a falling fifth just stopped (castSong below; Lyra's whistle in party.js)
  function onFifth(stopped) {
    let n = 0;
    for (const e of stopped || []) if (e && e._n28lead && live(e) && !(e._n28rout > 0)) n += rout(e);
    return n;
  }

  // ================================================================ 6. the three combat rules
  const patches = [];   // { map, x, y, r, left, told }
  const inPatch = (x, y) => patches.some((p) => p.map === here() && d2(p.x, p.y, x, y) <= p.r * p.r);
  const playerInPatch = () => patches.length > 0 && hasG() && inPatch(cam().x, cam().y);
  let afraid = false;
  const lanternLit = () => typeof UPG !== 'undefined' && !!UPG.lantern;

  // ================================================================ 7. the Listening Hour
  function lampPath(m) {
    if (m._n28path) return m._n28path;
    const lamps = m.entities.filter((e) => e && e.kind === 'deco' && e.sprite === 'lamp' && !e._n28lamp);
    const out = []; if (!lamps.length) return (m._n28path = out);
    const left = lamps.slice(); let cur = left.shift(), dist = 0;
    out.push({ e: cur, at: 0 });
    while (left.length) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < left.length; i++) { const d = d2(cur.x, cur.y, left[i].x, left[i].y); if (d < bd) { bd = d; bi = i; } }
      const nx = left.splice(bi, 1)[0]; dist += Math.sqrt(bd); out.push({ e: nx, at: dist }); cur = nx;
    }
    for (const p of out) if (p.e._n28g == null) p.e._n28g = p.e.glow != null ? p.e.glow : 0.55;
    return (m._n28path = out);
  }
  function setLit(e, on) { e._n28off = !on; e.glow = on ? e._n28g : 0; }
  // which of Oakhaven's lamps are lit follows the clock alone: by day none, at dusk those the lamplighter has reached
  function refreshLamps(m) {
    if (!m || m.id !== 'oakhaven' || !Array.isArray(m.entities)) return;
    const path = lampPath(m); if (!path.length) return;
    if (gone()) { for (const p of path) setLit(p.e, true); return; }
    const h = hour(), total = path[path.length - 1].at;
    if (h >= BAL.dusk && h < BAL.dusk + BAL.lampHours) { const s = (h - BAL.dusk) / BAL.lampHours * total; for (const p of path) setLit(p.e, p.at <= s); }
    else { const night = h >= BAL.dusk + BAL.lampHours || h < BAL.dawn; for (const p of path) setLit(p.e, night); }
  }
  function placeNight(m, id, x, y, sprite, facing, extra) {
    let e = m.entities.find((o) => o && o._n28night === id);
    if (!e) {
      e = Object.assign({ kind: 'npc', id: extra && extra.npc, x, y, sprite, scale: 0.88, solid: false, radius: 0.3, facing, transient: true, _decor: true, _n28night: id }, extra || {});
      e._h = true; e.homeX = x; e.homeY = y; e.wanderT = 1e9; e.dir = facing;   // what hydrate would set, by hand: no random draw
      m.entities.push(e);
    }
    return e;
  }
  function dropNight(m, id) { const i = m.entities.findIndex((o) => o && o._n28night === id); if (i >= 0) m.entities.splice(i, 1); }
  function tickNight() {
    if (here() !== 'oakhaven') return;
    const m = G.map;
    if (gone()) { for (const k of ['lamp', 'h0', 'h1', 'h2']) dropNight(m, k); return; }
    const path = lampPath(m); if (!path.length) return;
    const h = hour(), total = path[path.length - 1].at;
    const lighting = h >= BAL.dusk && h < BAL.dusk + BAL.lampHours;
    refreshLamps(m);
    if (lighting) {
      const s = (h - BAL.dusk) / BAL.lampHours * total;
      let i = 0; while (i + 1 < path.length && path[i + 1].at <= s) i++;
      const a = path[i], b = path[Math.min(path.length - 1, i + 1)], seg = Math.max(0.001, b.at - a.at), u = Math.max(0, Math.min(1, (s - a.at) / seg));
      const x = a.e.x + (b.e.x - a.e.x) * u, y = a.e.y + (b.e.y - a.e.y) * u, fc = Math.atan2(b.e.y - a.e.y, b.e.x - a.e.x);
      const L = placeNight(m, 'lamp', x, y, 'townsman', fc, { npc: LAMPLIGHTER.id });
      L.x = x + 0.45; L.y = y + 0.45; L.facing = fc;
      sayDaily('lh', TX.listening, 'voice', 6500);
    } else dropNight(m, 'lamp');
    const hum = h >= BAL.hummersFrom || h < BAL.dawn;
    CROSSINGS.forEach(([x, y, sp], k) => { if (hum) placeNight(m, 'h' + k, x, y, sp, Math.PI / 2, { npc: HUMMER.id }); else dropNight(m, 'h' + k); });
    if (hum) {
      const c = cam();
      if (CROSSINGS.some(([x, y]) => d2(x, y, c.x, c.y) < 9)) sayDaily('hum', TX.hummer, '', 5500);
    }
    if (h >= BAL.deadFrom && h < BAL.deadTo) sayDaily('dead', TX.deadHour, 'voice', 7000);
  }
  function defineNightNpcs() {
    if (typeof NPCS === 'undefined') return;
    if (!NPCS[LAMPLIGHTER.id]) NPCS[LAMPLIGHTER.id] = { name: LAMPLIGHTER.name, sprite: 'townsman', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Evening. Mind the pole. Every lamp in Oakhaven by full dark, and not one of them quiet.'), normal: S('Can\'t stop. Twenty-four lamps and one taper, and the dark does not wait on me.'), blunt: S('Out of the way of the pole, if you would. Lamps first. Talk after.') } };
    if (!NPCS[HUMMER.id]) NPCS[HUMMER.id] = { name: HUMMER.name, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Hm-mm. All\'s well. Sit if you like; the stool next door is free.'), normal: S('Hm. Keep to the Narrow, love, and the street keeps you.'), blunt: S('Lower. I am humming for the whole street, not for you.') } };
  }

  // ================================================================ 8. the Concordance
  function standing(fac) { try { return Number(G.player.factions && G.player.factions[fac]) || 0; } catch (e) { return 0; } }
  const tier = (fac) => { const v = standing(fac); return v >= BAL.hiStanding ? 1 : v <= BAL.loStanding ? -1 : 0; };
  function tickChoices() {
    if (typeof changeRep !== 'function') return;
    const f = F();
    for (const [flag, fac, delta] of CHOICES) {
      const k = 'n28_c_' + flag + '_' + fac;
      if (f[flag] && !f[k]) { f[k] = true; changeRep(fac, delta); }
    }
  }
  function factionHere() {
    const id = here() || '';
    if (typeof LAW_MAPS !== 'undefined' && LAW_MAPS.has(id)) return 'hedge';
    if (/^p16k_|cantabile|^p17c_/.test(id)) return 'captains';
    return null;
  }
  function priceMult() {
    const fac = factionHere(); if (!fac) return 1;
    const v = standing(fac);
    return v >= 60 ? 0.85 : v >= BAL.hiStanding ? 0.92 : v <= -40 ? 1.25 : v <= BAL.loStanding ? 1.1 : 1;
  }
  function endingLines() {
    const t = tier('hedge');
    return t > 0 ? [TX.endHi] : t < 0 ? [TX.endLo] : [];
  }

  // ================================================================ the tick
  // a co-op guest mirrors the host's world: the host runs all of this, and the guest only shows it
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || guest()) return;
    T += dt;
    // planted lamps
    for (const p of planted.slice()) { p.left -= dt; if (p.left <= 0) dropPlanted(p, false); }
    // dead patches
    for (let i = patches.length - 1; i >= 0; i--) { patches[i].left -= dt; if (patches[i].left <= 0) patches.splice(i, 1); }
    if (patches.length) { const c = cam(); for (const p of patches) if (!p.told && p.map === here() && d2(p.x, p.y, c.x, c.y) <= p.r * p.r) { p.told = true; say(TX.patchIn, 'warn', 4500); } }
    // the lure
    if (lure) { lure.left -= dt; if (lure.left <= 0) { const was = lure; lure = null; for (const e of ents()) if (e._n28lure) { e._n28lure = false; if (was.map === here()) { e.homeX = e.x; e.homeY = e.y; } } if (was.map === here()) say(TX.lureEnd, '', 3500); } }
    // packs
    // every frame (a handful of hounds): a timer here would make when a pack wakes depend on how long the page ran
    try { regroup(); } catch (e) { warnOnce('packs', e); }
    try { tickLaw(); } catch (e) { warnOnce('law', e); }
    try { tickNight(); } catch (e) { warnOnce('night', e); }
    try { tickChoices(); } catch (e) { warnOnce('choices', e); }
  }
  function reset() {
    for (const p of planted.slice()) dropPlanted(p, true);
    patches.length = 0; lure = null; afraid = false; law.warned = false; law.warnedAt = -1e9; law.lastAt = -1e9;
  }

  // ================================================================ wiring
  function wire() {
    defineNightNpcs();
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function (dt) {
        const before = G.stillT;
        const r = _un.apply(this, arguments);
        try {
          const c = cam(), p = G.player;
          // a lamp holds the Hush off
          if (G.map.siphoned && lampNear(c.x, c.y)) {
            if (G.stillT > before || G.unwriting) {
              G.stillT = Math.max(0, (before || 0) - (Number(dt) || 0) * 2);
              if (G.unwriting && G.stillT <= 7) { G.unwriting = false; try { $('#view').classList.remove('unwrite'); } catch (e) { /* no view */ } }
              if (!G.map._n28told) { G.map._n28told = true; say(TX.lampHolds, 'good', 3500); }
            }
          }
          // fear is loud
          if (p.hp > 0 && p.hp < p.hpMax * BAL.fearAt && !G.dead) {
            G.noise = Math.max(G.noise, BAL.fearNoise);
            if (!afraid) { afraid = true; say(TX.fear, 'warn', 4000); }
          } else afraid = false;
        } catch (e) { warnOnce('narrow', e); }
        // the module's own tick rides here, inside the game's update (a module that restores an older update keeps it)
        try { tick(Number(dt) || 0); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
    if (typeof useItem === 'function') {
      const _ui = useItem;
      useItem = function (slot) {
        const it = slot && typeof ITEMS !== 'undefined' ? ITEMS[slot.id] : null;
        const r = _ui.apply(this, arguments);
        try { if (it && it.use === 'whistle') plantLamp(); } catch (e) { warnOnce('whistle', e); }
        return r;
      };
    }
    if (typeof castSong === 'function') {
      const _cs = castSong;
      castSong = function (id) {
        if (!hasG()) return _cs.apply(this, arguments);
        if (playerInPatch()) { say(TX.patchSong, 'warn', 3500); return undefined; }
        const v0 = G.player.voice, t0 = G.song ? G.song.t : 0;
        const leaders = id === 'fifth' ? ents().filter((e) => e._n28lead && live(e)).map((e) => [e, e.stun || 0]) : null;
        const r = _cs.apply(this, arguments);
        try {
          const sung = G.player.voice < v0 || (G.song && G.song.t > t0);
          if (id === 'miller' && sung) singMiller();
          if (leaders && sung) onFifth(leaders.filter(([e, s]) => (e.stun || 0) > s).map(([e]) => e));
        } catch (e) { warnOnce('songs', e); }
        return r;
      };
    }
    if (typeof enemyUpdate === 'function') {
      const _eu = enemyUpdate;
      enemyUpdate = function (e, dt) {
        if (!e || e.dead || e.hidden || !hasG()) return _eu.apply(this, arguments);
        const c = cam();
        // routed: run from you, then settle where it stopped
        if (e._n28rout > 0 && !(e.stun > 0)) {
          e._n28rout -= dt;
          const dx = e.x - c.x, dy = e.y - c.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, sp = (e.def ? e.def.speed : 2) * BAL.routSpeed;
          moveWithSlide(e, dx / dd * sp * dt, dy / dd * sp * dt, e);
          if (e._n28rout <= 0) { e._n28rout = 0; e.state = 'idle'; e.alertT = 0; e.homeX = e.x; e.homeY = e.y; }
          return undefined;
        }
        // lured: to where the song was sung (it still bites if you are on top of it)
        if (lure && e._n28lure && lure.map === here() && !(e.stun > 0) && d2(e.x, e.y, c.x, c.y) > 2.6) {
          const dx = lure.x - e.x, dy = lure.y - e.y, dd = Math.sqrt(dx * dx + dy * dy);
          if (dd > 1.0) { const sp = e.def ? e.def.speed : 2; moveWithSlide(e, dx / dd * sp * dt, dy / dd * sp * dt, e); }
          e.state = 'idle'; e.homeX = lure.x; e.homeY = lure.y;
          return undefined;
        }
        // a Quiet goes to a lit lantern
        if (e.def && e.def.quiet && !e.passive && e.state === 'idle' && lanternLit() && d2(e.x, e.y, c.x, c.y) < BAL.quietLanternR * BAL.quietLanternR) {
          e.state = 'chase'; e.alertT = 8;
          if (!G.map._n28quiet) { G.map._n28quiet = true; say(TX.quietLamp, 'warn', 4500); }
        } else if (e.def && e.def.quiet && e.state === 'chase' && lanternLit() && d2(e.x, e.y, c.x, c.y) < BAL.quietLanternR * BAL.quietLanternR) e.alertT = Math.max(e.alertT || 0, 4);
        // a dead patch: nothing in it hears, and nothing hears you in it
        if (patches.length && (inPatch(e.x, e.y) || playerInPatch())) {
          const n = G.noise; G.noise = -3;
          try { return _eu.apply(this, arguments); } finally { G.noise = n; }
        }
        return _eu.apply(this, arguments);
      };
    }
    if (typeof killEnemy === 'function') {
      const _ke = killEnemy;
      killEnemy = function (e) {
        const was = e && !e.dead;
        const r = _ke.apply(this, arguments);
        try { if (was && isHound(e) && hasG()) patches.push({ map: here(), x: e.x, y: e.y, r: BAL.patchR, left: BAL.patchSecs, told: false }); } catch (err) { warnOnce('burst', err); }
        return r;
      };
    }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (pipesLesson(e)) return undefined; } catch (err) { warnOnce('pipes', err); } return _ud.apply(this, arguments); };
    }
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function (mode) {
        const r = _rd.apply(this, mode === 'n28' ? [null] : arguments);
        try { decorate(mode); } catch (e) { warnOnce('dialogue', e); }
        return r;
      };
    }
    if (typeof talk === 'function') {
      const _tk = talk;
      talk = function (e) {
        const r = _tk.apply(this, arguments);
        try {
          if (e && (e.id === 'harrow' || e.id === 'hetty') && G.state === 'dialogue' && DLG.ent === e) {
            const t = tier('hedge');
            if (t) { DLG.log.push({ who: 'them', t: e.id === 'harrow' ? (t > 0 ? TX.harrowHi : TX.harrowLo) : (t > 0 ? TX.hettyHi : TX.hettyLo) }); renderDialogue(DLG.choices ? 'choice' : null); }
          }
        } catch (err) { warnOnce('talk', err); }
        return r;
      };
    }
    if (typeof buyPrice === 'function') {
      const _bp = buyPrice;
      buyPrice = function () { const v = _bp.apply(this, arguments); try { const k = priceMult(); return k === 1 ? v : Math.max(1, Math.round(v * k)); } catch (e) { return v; } };
    }
    if (typeof Engine !== 'undefined' && typeof Engine.render === 'function') {
      const _r = Engine.render;
      Engine.render = function () { try { if (hasG() && G.map.id === 'oakhaven') refreshLamps(G.map); } catch (e) { warnOnce('lamps', e); } return _r.apply(this, arguments); };
    }
    for (const fn of ['loadMap', 'restoreGame', 'startGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () {
        if (fn !== 'loadMap') reset(); else { for (const p of planted.slice()) dropPlanted(p, true); lure = null; }
        // a map always loads as built: the night's figures are put back by the tick, never seen by what runs on load
        try { if (hasG() && G.maps) for (const id in G.maps) { const m = G.maps[id]; if (m && Array.isArray(m.entities)) for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._n28night) m.entities.splice(i, 1); } } catch (e) { /* no maps yet */ }
        return _f.apply(this, arguments);
      };
    }
  }
  try { wire(); } catch (e) { console.warn('narrow28 failed to wire', e); }

  return {
    BAL, TX, LESSONS, MILLER, CHOICES, TEXTS,
    lampNear, plantLamp, witness, lessonFor, startLesson, singMiller, regroup, rout, onFifth, inPatch, playerInPatch,
    lampPath, refreshLamps, tickNight, priceMult, standing, tier, endingLines, reset,
    get planted() { return planted; }, get patches() { return patches; }, get lure() { return lure; }, get law() { return law; },
  };
})();
if (typeof window !== 'undefined') window.NARROW28 = NARROW28;
