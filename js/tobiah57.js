// ============================================================
//  tobiah57 — Tobiah Marsh's arc, the parts not yet played (Book One ch. 5 ll. 1721–1765; ROADMAP R9 item 18).
//
//  Already in the game: the charts and Revision Seven (js/data.js), calling the pitch on the gauge platform at the Rite
//  (js/rite43.js), the dawn on the Kestrel, truth or silence (js/ash50.js), second engineer in Part Four (js/kestrel16.js).
//  This adds, in the quarry:
//    * THE SIGNED BOOK. The first time you speak to him he has "On the Calibration of Resonant Bores" by K. Vance in his
//      satchel, its margins full of a small eager hand ("hold beneath the failure-pitch — ALWAYS BENEATH"), his name on the
//      flyleaf and the year, 409; he was fourteen. By calling [PROPOSED]:
//        - a DISSONANT BLADE (a bore-engineer, glassed): he holds it out to you to sign, then goes red to the ears: wrong
//          man. "Did you know him? At the Conservatory?"
//        - an ARCHIVIST (once of the Office): he asks whether it is true the Office keeps everything.
//        - anyone else: he shows it to you, and the signature under his name (the book's scene, told).
//    * THE STAGE NINE KIT. Once the Church has come (Dawnday) and before the Rite: the case of black leather lined with
//      white velvet, the Church's sunburst and the Arbiterium's scales on the lid; the tuning collar, the copper wire on
//      its ivory spool, the silver needle curved like a new moon. The Sky Choir on the Pilgrims' Stair. "Do you think she
//      knows yet, sir?" "She knows." (canon) or say nothing.
//  Flags: p57_book (1 shown; 2 signed, 3 told him whose; 4 "yes", 5 "not everything"), p57_kit (1 "she knows", 2 silent).
// ============================================================
'use strict';

const TOBIAH57 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('tobiah57: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const cls = () => { try { return G.player.cls && G.player.cls.id; } catch (e) { return null; } };

  const TX = {
    leave: S('Leave it.'),
    bookTitle: S('On the Calibration of Resonant Bores'),
    book: S('He digs into the satchel at his hip and brings out a small battered book with a broken spine. <i>On the Calibration of Resonant Bores</i>, says the spine, in gilt worn nearly away. <i>K. Vance.</i> The pages are soft with thumbing, whole paragraphs underlined in two colours of ink, the margins full of a small eager hand: <i>yes!!</i> — <i>but see ch. 4</i> — <i>hold beneath the failure-pitch — ALWAYS BENEATH</i>. On the flyleaf, his own name, and the year: <i>409 SR</i>. He would have been fourteen.'),
    blade: S('He holds it out to you in both hands. "You were on the bores. I can see it on you. Would you — would you sign it?" Then he looks at the name on the spine, and at you, and goes red to the ears. "Oh. You\'re not — of course you\'re not. Sorry." A breath. "Did you know him? At the Conservatory?"'),
    sign: S('Sign it anyway, under his name'),
    whose: S('Tell him whose book it is, and where to find him'),
    signed: S('You sign it under his name. He looks at your signature for a long time as if it were a pitch table, and then puts the book away very carefully, and does not say anything at all.'),
    told: S('"The clearing," he repeats. "By the Hedge. He\'s here." He holds the book against his chest. "I\'ll go when I\'m off shift. I won\'t — I\'ll just ask him to sign it."'),
    archivist: S('He looks at the ink on your fingers the way you look at a sore in someone else\'s mouth. "You were Office," he says, very low. "Is it true they keep everything? Every name, every word anyone says near a bell?"'),
    yes: S('"Yes."'),
    notAll: S('"Not everything."'),
    saidYes: S('He nods as if you had confirmed a figure he had already worked out. Then he looks at the Legionnaire at the far end of the pump floor, and lowers his voice further, and does not raise it again for the rest of the night.'),
    saidNot: S('"What don\'t they keep?" You do not answer, and he works it out himself, slowly, looking at the book in his hands. "Margins," he says. "Nobody files a margin."'),
    other: S('"He signed it," he says. "His name, under mine. His hand was quite steady." He turns to the flyleaf to show you. "It\'s why I took the post here. I didn\'t think he\'d be — here."'),
    kitTitle: S('The Stage Nine kit'),
    kit: S('Tobiah unlocks the cabinet at the back of the shed with a key on a chain around his neck. A case of black leather lined with white velvet, the Church\'s gold sunburst tooled on the lid and, beneath it, very small, the Arbiterium\'s scales. He turns it to the lamp.<br><br>A tuning collar. Brass, finely made, a ring the width of a woman\'s throat, with four small tuning pegs at the quarters. A coil of copper wire, very fine, wound on an ivory spool. A long silver needle, curved like a new moon, lying in its own fitted groove in the velvet.<br><br>"My mother used to take me to hear the Sky Choir," he says softly, looking at the collar. "We\'d stand on the Pilgrims\' Stair at dawn, and you could hear them all the way down the mountain. I thought it was the most beautiful thing in the world." He touches the edge of the case with one ink-stained finger. "They say it\'s a great honour, for the Cantor. Do you think she knows yet, sir?"'),
    knows: S('"She knows."'),
    nothing: S('Say nothing'),
    knew: S('He shuts the case, and locks it, and stands with his hand on the lid for a while.'),
    silent: S('You say nothing. He shuts the case, and locks it, and does not ask again.'),
    jBook: S('Tobiah Marsh carries a copy of On the Calibration of Resonant Bores, by K. Vance, with his name on the flyleaf and the year he was fourteen.'),
    jKit: S('Tobiah showed me the Stage Nine kit: the brass collar, the copper wire, the silver needle curved like a new moon. "Do you think she knows yet, sir?"'),
  };

  const bookDue = () => hasG() && !F().p57_book && !F().greening && !F().escaped;
  const kitDue = () => hasG() && !F().p57_kit && !!F().church_come && !F().rite_started && !F().greening && !F().escaped;
  function book(after) {
    const f = F(); f.p57_book = 1;
    try { journal('side', TX.jBook); } catch (e) { /* none */ }
    const c = cls();
    const end = (n, t) => { f.p57_book = n; showEvent(TX.bookTitle, t, [{ t: TX.leave, f: after }]); };
    if (c === 'blade') showEvent(TX.bookTitle, TX.book + '<br><br>' + TX.blade, [{ t: TX.sign, f: () => end(2, TX.signed) }, { t: TX.whose, f: () => end(3, TX.told) }]);
    else if (c === 'archivist') showEvent(TX.bookTitle, TX.book + '<br><br>' + TX.archivist, [{ t: TX.yes, f: () => end(4, TX.saidYes) }, { t: TX.notAll, f: () => end(5, TX.saidNot) }]);
    else showEvent(TX.bookTitle, TX.book + '<br><br>' + TX.other, [{ t: TX.leave, f: after }]);
  }
  function kit(after) {
    const f = F();
    try { journal('side', TX.jKit); questXp(10); } catch (e) { /* none */ }
    showEvent(TX.kitTitle, TX.kit, [
      { t: TX.knows, f: () => { f.p57_kit = 1; showEvent(TX.kitTitle, TX.knew, [{ t: TX.leave, f: after }]); } },
      { t: TX.nothing, f: () => { f.p57_kit = 2; showEvent(TX.kitTitle, TX.silent, [{ t: TX.leave, f: after }]); } },
    ]);
  }
  function wire() {
    if (typeof talk !== 'function') return;
    const _t = talk;
    talk = function (e) {
      const self = this, args = arguments;
      if (!e || e.id !== 'tobiah' || !hasG() || guest()) return _t.apply(self, args);
      try {
        if (kitDue()) { kit(null); return undefined; }
        if (bookDue()) { book(() => _t.apply(self, args)); return undefined; }
      } catch (err) { warnOnce('talk', err); }
      return _t.apply(self, args);
    };
  }
  try { wire(); } catch (e) { console.warn('tobiah57 failed to wire', e); }

  return { TX, TEXTS, bookDue, kitDue, book, kit };
})();
if (typeof window !== 'undefined') window.TOBIAH57 = TOBIAH57;
