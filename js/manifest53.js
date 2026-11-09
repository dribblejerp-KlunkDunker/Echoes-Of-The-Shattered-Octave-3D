// ============================================================
//  manifest53 — Manifest: "Read you three" and "filed" (Book One ch. 16, ll. 4500–4638; ROADMAP R9 item 11).
//
//  Once Sable has joined the ship in Whisper-Grove (js/data.js joinSable, flag sable_joined), the first time you go down
//  into the Kestrel's hold (js/kestrel16.js, p16k_kestrel_below) she is there before you, with a lamp:
//    * THE TAGS. She reads the third crate's tags from memory with the Ledger shut. "How many?" "Four hundred and thirty-
//      two." "Not in the hold, Captain. How many altogether." "One thousand three hundred and forty-two." Carrier OK-114
//      is reliable and does not ask questions.
//    * READ YOU THREE. While you stand with Vane: Corwin Aye, the cooper whose barrel in the Moot-house cellar has not
//      leaked in nineteen years (js/grove31.js has the barrel); Mirren Salk and her husband's coat (her board is on the
//      Bell Yard); Annet Sowerby, six, who would not let go of the boy's hand.
//    * FILED. Pim asks her to tell Annet. She kneels at the third crate: "You are not lost. You are filed." "Is that you,
//      Mistress Dray?" "No, love. It's the clerk."
//  Go back up the ladder at the first card and you miss it (the hold is as it was). The words are the book's, cut to fit.
//  Flags: p53 (1 seen, 9 left), p53_deck (Sable's note on the deck shown).
// ============================================================
'use strict';

const MANIFEST53 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags && G.map;
  const F = () => G.flags;
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('manifest53: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const inExtra = () => { try { if (typeof EXTRAS17 !== 'undefined' && EXTRAS17.inExtra()) return true; } catch (e) { /* none */ } return false; };

  const HOLD = 'p16k_kestrel_below', DECK = 'p16k_kestrel_deck';
  const due = () => hasG() && !!F().sable_joined && !F().p53 && !F().part4;

  const TX = {
    title: S('Manifest'),
    tags: S('Sable is at the bottom of the ladder when you come down, with one hand still on the rung, looking along the hold at the crates in their two stacks. The sound comes up around her: a man counting, a woman giving directions to somewhere, laughter at a joke told a long time ago, and four hundred other things underneath.<br><br>"Bring the lamp," she says.<br><br>She kneels at the third crate, the open one, and reads the tags on their strings without touching a single sphere, the way a woman reads a shelf of preserves in her own larder. "Forty-one thousand and nine, Ketter Dell, nineteen, fuller\'s apprentice, who said he was twenty—"<br><br>"You\'ve got the book open," says Vane. His voice comes out wrong.<br><br>"The book is at my elbow and it is closed, Captain." She puts her good hand flat on the lid. "Now. How many?"<br><br>"Four hundred and thirty-two. It\'s on the—"<br><br>"Not in the hold, Captain. How many altogether."<br><br>"Thirteen hundred," says Vane. "About."<br><br>"One thousand three hundred and forty-two," says Sable. "Eleven consignments. The carriage office increased your load after the fourth run, because you had not complained about the noise. There is a note to that effect in the file. It says: <i>carrier OK-114 is reliable and does not ask questions.</i>"<br><br>Vane puts his hand out and finds a crate and sits down on it.'),
    stay: S('Stay with Vane'),
    up: S('Go back up the ladder'),
    left: S('You go back up the ladder. Below you the lamp moves along the stacks, and her voice goes on reading, very low.'),
    three: S('"I want to do something for you," says Sable, "and I want you to understand before I do it that it is not a kindness."<br><br>"Do what?"<br><br>"Read you three. You have been carrying one thousand three hundred and forty-two people for two years as <i>cargo</i>, and the reason you were able to do it is that cargo does not have a mother or a trade or a last thing it said at a door. I can give you three of them back. Not to them. To you. It will not help them in the slightest and it will not absolve you in the slightest, and you will carry them for the rest of your life, and that is the point, Captain. Somebody should be carrying them properly."<br><br>Vane sits on a crate in his own hold with an empty bottle in his hand.<br><br>"Go on, then," he says.'),
    standWith: S('Stand with him'),
    corwin: S('The Ledger comes round in front of her and opens itself, and she does not look at it.<br><br>"Entry thirty-nine thousand, eight hundred and two. Corwin Aye. Fifty-three. Cooper of the Ashlane, and a good one; there is a barrel in the Moot-house cellar with his mark burned into the head and it has not leaked in nineteen years. Taken on the fourth day of the harvest, in the ninth hour. What he said at the door was: <i>will I be able to keep my hands?</i>" She pauses exactly long enough. "He was in your hold for eleven days."'),
    mirren: S('"Entry forty thousand, nine hundred and ninety-one. Mirren Salk. Twenty-six. Wheelwright\'s widow, of the Bell Yard, four months a widow when the drills came. She was carrying her husband\'s coat over her arm, and she asked whether she might keep it, and the clerk said that she might, and it was taken off her at the door of the pressing room and put in a bin with eleven hundred other coats." Sable\'s voice stays perfectly flat. "She is in the stack behind you."'),
    annet: S('"Entry forty-one thousand and six. Annet Sowerby. Six years old. Daughter of Hesper and Tam Sowerby of the Cloister road. Taken with the rest of the little ones from the Cloister of the Lost Choir, because the Office had a requisition for small clear voices." A beat. "She was third in the line. She would not let go of the hand of the boy in front of her, and rather than make a scene in front of forty children, the proctors took the two of them into the room together. I wrote both entries. Hers is legible. His is not, because my hand had begun to shake by then."<br><br>"She\'s in the third crate," says Vane. "Second row, corner. She talks to a boy."<br><br>"I know," says Sable. "It is why I came up the ladder."'),
    next: S('…'),
    filedTitle: S('Filed'),
    filed: S('Pim Carder is awake in the straw with his stiff hands out in front of him. "Are you the one who writes the names?" he says.<br><br>"Yes."<br><br>"Annet\'s frightened. She can hear people moving about but she can\'t hear what anyone says unless you\'re right up on the box. I told her we were going home and she said which home." He looks up. "Can you tell her? She\'d believe you. You\'ve got the book."<br><br>The archivist gets down on her knees in the straw, one-handed, and leans in until her mouth is a hand\'s width from the pine, and says, in the flat clear voice of a woman reading an entry:<br><br>"Annet Sowerby. You are six years old. Your mother is Hesper and your father is Tam, and you live on the Cloister road, and you sang alto in the little choir under Mistress Dray, and you would not let go of the hand of the boy in front of you." She puts her hand flat on the wood. "You are entry forty-one thousand and six. You are not lost. You are <i>filed</i>. And I am four miles from the place where they put you in there, and I am coming with the ship."<br><br>Inside the crate, quite close, a small voice says: "<i>Is that you, Mistress Dray?</i>"<br><br>Sable shuts her eyes.<br><br>"No, love," she says. "It\'s the clerk."'),
    leave: S('Leave it.'),
    deck: S('Sable has gone down into the hold with a lamp.'),
    j: S('Manifest: in the Kestrel\'s hold Sable read the tags from memory. One thousand three hundred and forty-two, altogether. She read Vane three of them: Corwin Aye, cooper of the Ashlane; Mirren Salk, wheelwright\'s widow of the Bell Yard, and her husband\'s coat; Annet Sowerby, six, who would not let go of the boy\'s hand. Then she told Annet she was filed. "Is that you, Mistress Dray?" "No, love. It\'s the clerk."'),
  };

  function begin() {
    const f = F(); if (!due()) return;
    f.p53 = 9;   // until it is seen through
    showEvent(TX.title, TX.tags, [
      { t: TX.stay, f: () => showEvent(TX.title, TX.three, [{ t: TX.standWith, f: () => read(0) }]) },
      { t: TX.up, f: () => { say(TX.left, '', 6000); try { loadMap(DECK); } catch (e) { warnOnce('up', e); } } },
    ]);
  }
  const ENTRIES = ['corwin', 'mirren', 'annet'];
  function read(i) {
    if (i < ENTRIES.length) { showEvent(TX.title, TX[ENTRIES[i]], [{ t: TX.next, f: () => read(i + 1) }]); return; }
    const f = F(); f.p53 = 1;
    try { journal('main', TX.j); questXp(30); } catch (e) { /* none */ }
    showEvent(TX.filedTitle, TX.filed, [{ t: TX.leave, f: null }]);
  }
  function wire() {
    for (const fn of ['loadMap']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () {
        const r = _f.apply(this, arguments);
        try {
          if (hasG() && !guest() && !inExtra() && due()) {
            if (G.mapId === HOLD) begin();
            else if (G.mapId === DECK && !F().p53_deck) { F().p53_deck = true; say(TX.deck, '', 5000); }
          }
        } catch (e) { warnOnce('load', e); }
        return r;
      };
    }
  }
  try { wire(); } catch (e) { console.warn('manifest53 failed to wire', e); }

  return { TX, TEXTS, HOLD, DECK, due, begin, read };
})();
if (typeof window !== 'undefined' && typeof window.MANIFEST53 === 'undefined') window.MANIFEST53 = MANIFEST53;
