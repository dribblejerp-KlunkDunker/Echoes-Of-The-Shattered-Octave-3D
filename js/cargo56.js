// ============================================================
//  cargo56 — Cargo night (Book One ch. 8, ll. 2561–2818; ROADMAP R9 item 14).
//
//  The Drift-Kestrel is moored at Oakhaven's mast; its mast-ladder (js/maps.js, use 'crates') has always shown the crates
//  in her hold. On Driftday night (game day 6) and the dead hour after it, the ladder plays the chapter instead:
//    * STALL THE CLERK (Driftday, 19:00 to midnight). The paymaster's clerk comes up the ladder to count the crates, and the
//      Carders are on deck. Mags needs a count of twenty to get them into the sail-locker. Give it to her by talking: three
//      rounds, two safe things to talk about and one that turns his eye toward the bow. Twice wrong and Vane takes over
//      [PROPOSED: the juggle as play; the topics are the book's]. Then the child's boot by the third crate: put your own
//      boot over it (canon). He counts twelve. "They do carry on, don't they." "My first posting was the harvest-house at
//      Whisper-Grove."
//    * THE THIRD CRATE (the dead hour, game day 7 before 05:00). Pim with his ear to the wood, talking to Annet. Vane prises
//      the lid; WG-41,004 on the tag. He does not laugh. The engineer's slate: six; then everything over the side, the
//      brandy, the chain, the long gun last, and it is eighteen. "Annet. You're going home." Vane says it, or lets you.
//    * THE LONG GUN. "Tomorrow, in the dark, over the slag-pit, so nobody hears the splash." You carry the lock and the
//      shot down to Depot Three's slag-slope (js/tamsin52.js) and send them over (R6's "Vane's long gun in the quarry mud").
//  Missing either night changes nothing but lines: the old crates card still plays. Flags: p56 (1 the clerk stalled, 2 the
//  crate opened, 9 missed), p56_clerk (1 you held him, 2 Vane had to), p56_boot (1 covered, 2 picked up, 3 left), p56_say
//  (1 Vane said it, 2 you did), p56_gun (1 carried, 2 over the slope).
// ============================================================
'use strict';

const CARGO56 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('cargo56: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const partOne = () => hasG() && !F().greening && !F().part3 && !F().part4 && !F().escaped;

  const DRIFT = 6, CLERK_FROM = 19, DEAD = 5, NEED = 20, STEP = 7, ITEM = 'p56_gun';
  const stage = () => (hasG() ? Number(F().p56) | 0 : 0);
  const clerkHour = () => hasG() && (Number(G.day) || 0) === DRIFT && hour() >= CLERK_FROM;
  const deadHour = () => hasG() && (Number(G.day) || 0) === DRIFT + 1 && hour() < DEAD;

  const TX = {
    leave: S('Leave it.'),
    go: S('Go on'),
    // the clerk
    clerkTitle: S('Driftday night, aboard'),
    clerk: S('You are on the Kestrel\'s deck when the paymaster\'s clerk comes up the ladder with his tally-book, an hour after dark. Nell and Pim Carder are on deck. Mags is at the hatch. Vane looks at her for one long second, and she looks back, and then she goes down the ladder ahead of the clerk at a pace that could plausibly be called helpfulness.<br><br>She needs a count of twenty to get them into the sail-locker. Somebody has to give it to her by talking.'),
    round: S('The clerk waits it out with the polite patience of a man paid by the hour. Mags\'s count: {0} of twenty.'),
    good: S('He listens. Behind him, in the bow, a cupboard door closes very softly.'),
    bad: S('His eyes go past you, to the bow. You talk faster.'),
    vane: S('Vane takes over before you can do more harm: the wind, the state of the Reach, a tariff dispute in Port Cantabile he invents as he goes. The clerk listens to all of it. When he looks at the bow again, the sail-locker door is shut.'),
    held: S('The sail-locker door is shut. The coil of cable is empty.'),
    T: {
      wind: S('The wind, and what it is doing to the envelope'),
      reach: S('The state of the Reach, county by county'),
      tariff: S('A tariff dispute in Port Cantabile, invented as you go'),
      glass: S('The criminal price of drift-glass'),
      crates: S('The crates, and what is in them'),
      bow: S('The sail-locker in the bow, and what is kept there'),
      hollow: S('The warrant, and the Hollow'),
    },
    bootTitle: S('By the third crate'),
    boot: S('There is a child\'s boot lying on the deck-boards by the third crate.'),
    coverIt: S('Put your own boot over it, and leave it there'),
    pickUp: S('Pick it up'),
    leaveIt: S('Leave it'),
    bootUp: S('You pick it up. The clerk looks at it, and at you. "Yours?" he says pleasantly, and writes something small in the margin of his tally-book.'),
    bootLeft: S('You leave it. The clerk\'s lantern goes past it twice and does not stop.'),
    countTitle: S('Twelve'),
    count: S('The clerk counts. Twelve. He writes twelve in his tally-book. The crates are doing what they always do: the man counting, the woman giving directions to somewhere, the laughter at a joke told long ago. His pen does not so much as pause.<br><br>"They do carry on, don\'t they," he says, pleasantly, and shuts the book. "My first posting was the harvest-house at Whisper-Grove. Three years. You get used to it. My mother won\'t have a glass in the house now, not even a drinking glass, but that\'s mothers."<br><br>He goes down the ladder.'),
    // the third crate
    crateTitle: S('The third crate, at the dead hour'),
    crate: S('Pim Carder is out of the sail-locker, against orders, with his ear to the side of the third crate.<br><br>"She kept saying <i>hello, hello, is anyone there</i>," he says. "She\'s been saying it a long while, I think. So I said hello. And she asked what my name was. Nobody\'s said anything to her for a long time."<br><br>Vane takes a pry-bar to the lid. It comes up easily: Consortium nails, driven by clerks. Inside, in good straw, the spheres. He lifts one out. It is cold, and lighter than it looks, and the tag is written in a fine clerk\'s hand: <b>WG-41,004.</b><br><br>Vane does not laugh. That is how you know how bad it is.'),
    figuresTitle: S('The engineer\'s slate'),
    figures: S('<i>How many people can we lift?</i> Vane signs to Mags. <i>With the crates aboard.</i><br><br>The engineer does the figures on a slate by the lift-tanks, twice, and a third time because Vane does not like the answer. "Six. Seven if it\'s children. With the cargo aboard, Captain, six."<br><br>Eighty-four souls in the Hollow, and nineteen of them children. "What goes over the side?"<br><br>The engineer writes. Water, most of it. The spare envelope canvas. The chain cable and half the anchors. The brandy, which is eleven cases and worth more than the rest of the ship together. "And the long gun. The swivel, and the carriage, and the shot. Eleven hundredweight. Even then it\'s eighteen, Captain. Maybe nineteen."<br><br>"Put it over the side," says Vane. "Tomorrow, in the dark, over the slag-pit, so nobody hears the splash."'),
    annetTitle: S('Annet'),
    annet: S('Vane kneels by the crate with the sphere in his hands, and does not say anything for a long time. Then he looks at you.'),
    letVane: S('Let him say it'),
    sayIt: S('Say it yourself'),
    vaneSays: S('"Annet," says Vane, to the wood. "You\'re going home."'),
    youSay: S('"Annet," you say, to the wood. "You\'re going home."<br><br>Vane puts the sphere back in its straw, very carefully, and does not look at you.'),
    gunGiven: S('Vane puts the long gun\'s lock and a bag of its shot into your arms. "You know where the slag-pit is," he says. "In the dark."'),
    // the long gun
    gun: S('The long gun\'s lock and shot'),
    gunDesc: S('The lock of a Rust Coast swivel gun and a bag of its shot. Vane wants them over the slag-slope at Depot Three, in the dark, so nobody hears the splash.'),
    gunTitle: S('The head of the slag-slope'),
    gunOver: S('You put the lock and the shot over the edge. They go down two hundred feet of grey waste stone in the dark and into the old green water at the bottom, and nobody hears the splash.'),
    sendIt: S('Send them over'),
    // logbook
    jClerk: S('Cargo night: the paymaster\'s clerk counted the Kestrel\'s crates while Mags hid the Carders in the sail-locker. Twelve. "They do carry on, don\'t they." His first posting was the harvest-house at Whisper-Grove.'),
    jCrate: S('Cargo night: Vane opened the third crate. WG-41,004. The engineer\'s slate said six, and then, with everything over the side and the long gun last, eighteen. "Annet. You\'re going home."'),
    jGun: S('I put Vane\'s long gun over the slag-slope at Depot Three, in the dark. Nobody heard the splash.'),
  };
  // the three rounds: [safe, safe, the one that turns his eye], and the order they are shown in
  const ROUNDS = [['wind', 'reach', 'crates', [0, 2, 1]], ['tariff', 'glass', 'bow', [2, 0, 1]], ['glass', 'tariff', 'hollow', [1, 2, 0]], ['reach', 'wind', 'crates', [0, 1, 2]]];

  // ================================================================ the item
  function addItem() {
    if (typeof ITEMS === 'undefined' || ITEMS[ITEM]) return;
    ITEMS[ITEM] = { name: TX.gun, sprite: (ITEMS.w_pistol && ITEMS.w_pistol.sprite) || 'gear', desc: TX.gunDesc, key: true };
  }

  // ================================================================ the clerk
  const C = { count: 0, strikes: 0, round: 0, used: [] };
  function clerk() {
    if (stage() !== 0) return;
    C.count = 0; C.strikes = 0; C.round = 0; C.used = [];
    showEvent(TX.clerkTitle, TX.clerk, [{ t: TX.go, f: () => nextRound() }]);
  }
  function nextRound() {
    if (C.count >= NEED) { held(1); return; }
    if (C.strikes >= 2 || C.round >= ROUNDS.length) { held(2); return; }
    const [a, b, bad, order] = ROUNDS[C.round++];
    const opts = [{ k: a, ok: true }, { k: b, ok: true }, { k: bad, ok: false }].map((o) => ({ t: TX.T[o.k], f: () => pick(o) }));
    showEvent(TX.clerkTitle, TX.round.replace('{0}', String(C.count)), order.map((i) => opts[i]));
  }
  function pick(o) {
    if (o.ok && !C.used.includes(o.k)) { C.count += STEP; C.used.push(o.k); say(TX.good, '', 3500); }
    else { C.strikes++; say(TX.bad, 'warn', 3500); }
    nextRound();
  }
  function held(how) {
    const f = F(); f.p56_clerk = how;
    const body = (how === 1 ? TX.held : TX.vane) + '<br><br>' + TX.boot;
    showEvent(TX.bootTitle, body, [
      { t: TX.coverIt, f: () => counted(1) },
      { t: TX.pickUp, f: () => counted(2) },
      { t: TX.leaveIt, f: () => counted(3) },
    ]);
  }
  function counted(b) {
    const f = F(); f.p56_boot = b; f.p56 = 1;
    try { journal('side', TX.jClerk); questXp(how(f) === 1 ? 20 : 10); } catch (e) { /* none */ }
    const pre = b === 2 ? TX.bootUp + '<br><br>' : b === 3 ? TX.bootLeft + '<br><br>' : '';
    showEvent(TX.countTitle, pre + TX.count, [{ t: TX.leave, f: null }]);
  }
  const how = (f) => Number(f.p56_clerk) | 0;

  // ================================================================ the third crate
  function crate() {
    if (stage() >= 2) return;
    const f = F();
    if (!f.crates_heard) { f.crates_heard = true; ['Annet Sowerby', 'Corwin Aye', 'Mirren Salk'].forEach((n) => G.ledger.push({ name: n, where: 'the Kestrel\'s hold', day: G.day })); }
    showEvent(TX.crateTitle, TX.crate, [{ t: TX.go, f: () => showEvent(TX.figuresTitle, TX.figures, [{ t: TX.go, f: () => annet() }]) }]);
  }
  function annet() {
    showEvent(TX.annetTitle, TX.annet, [
      { t: TX.letVane, f: () => done(1) },
      { t: TX.sayIt, f: () => done(2) },
    ]);
  }
  function done(n) {
    const f = F(); f.p56 = 2; f.p56_say = n; f.p56_gun = 1;
    try { addItem(); G.give(ITEM); journal('side', TX.jCrate); questXp(25); } catch (e) { warnOnce('gun', e); }
    showEvent(TX.annetTitle, (n === 1 ? TX.vaneSays : TX.youSay) + '<br><br>' + TX.gunGiven, [{ t: TX.leave, f: null }]);
  }
  function sink() {
    const f = F(); if (Number(f.p56_gun) !== 1 || !G.has(ITEM)) return false;
    showEvent(TX.gunTitle, TX.gunOver, [{ t: TX.sendIt, f: () => { G.take(ITEM); f.p56_gun = 2; try { journal('side', TX.jGun); questXp(10); } catch (e) { /* none */ } } }, { t: TX.leave, f: null }]);
    return true;
  }

  // ================================================================ wiring
  function missed() { if (hasG() && stage() < 2 && ((Number(G.day) || 0) > DRIFT + 1 || ((Number(G.day) || 0) === DRIFT + 1 && hour() >= DEAD))) F().p56 = 9; }
  function useOwn(e) {
    if (!e || guest() || !hasG()) return false;
    if (e.use === 'crates' && G.mapId === 'oakhaven' && partOne()) {
      if (clerkHour() && stage() === 0) { clerk(); return true; }
      if (deadHour() && stage() < 2) { crate(); return true; }
      return false;
    }
    if (e._p52 === 'slag' && G.mapId === 'quarry') return sink();
    return false;
  }
  function wire() {
    addItem();
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function () { const r = _un.apply(this, arguments); try { if (hasG() && stage() < 2) missed(); } catch (e) { warnOnce('tick', e); } return r; }; }
  }
  try { wire(); } catch (e) { console.warn('cargo56 failed to wire', e); }

  return { TX, TEXTS, ROUNDS, NEED, DRIFT, ITEM, stage, clerk, crate, sink, clerkHour, deadHour, state: () => C };
})();
if (typeof window !== 'undefined') window.CARGO56 = CARGO56;
