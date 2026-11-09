// couriers — Phase 6 (story reactivity): letters from the people you helped.
// Owned by the COURIERS team; see ROADMAP.md ("Courier letters from helped NPCs").
//
// DELIVERY RULE (one rule, so players and tests can predict it):
//   A letter is written the moment you have done the deed (the quest flag exists).
//   It reaches you at the next "delivery moment" — you finish a rest, the day turns
//   over, or you arrive in a new area — provided the deed is at least MIN_WAIT game
//   seconds old (so it never lands on the same breath as the deed) and the sender is
//   still alive and in reach. One letter per moment, in table order, so several
//   deeds arrive as a trickle, not a flood. Nothing is delivered while a panel, a
//   cutscene or a death screen is up; the letter simply waits for the next moment.
//
// STATE lives only in G.flags keys "p6c_<id>": 1 once delivered. Anything else
// (strings, objects, NaN, negatives, huge numbers) reads as "not delivered", and is
// overwritten by 1 on delivery, so a hostile save can neither duplicate a letter
// nor put markup on screen: every word shown comes from the constant tables below.
// The deed flags are only ever tested for truthiness and never displayed.
//
// WHERE LETTERS LIVE: Logbook -> "Letters" (a compact list under "Other matters");
// a letter opens as a held paper document through READING.SOURCES (kind 'Letter').
//
// [PROPOSED] (not in the lore brief): the courier itself; the idea that townsfolk
// write rather than speak (in Oakhaven a spoken thanks carries); the loop-shaped
// letter for Halder Wick; every small gift.
'use strict';

const COURIERS = (function () {
  if (typeof UPG !== 'undefined' && UPG.storyCouriers === undefined) UPG.storyCouriers = true;

  const PREFIX = 'p6c_';
  const MIN_WAIT = 45;            // game seconds a deed must age before its letter can arrive

  function on() {
    try {
      if (typeof UPG !== 'undefined' && UPG.storyCouriers === false) return false;
      if (typeof GFX !== 'undefined' && GFX.storyCouriers === false) return false;
    } catch (e) { return false; }
    return true;
  }

  // ---------------------------------------------------------------- who is still in reach
  // Oakhaven's people write before the Rite; once it has begun, the town greens or
  // empties, and the courier stops (nobody left to carry a letter from).
  function oakhavenOpen(f) { return !f.rite_started && !f.greening && !f.escaped && !f.part3; }
  // Part Three and after: the senders met on the road. The courier finds the ship.
  function roadOpen(f) { return !!f.part3; }

  // A named NPC who has been killed in any area is gone. The game has no way to do this to
  // a story NPC today; the check keeps the promise if that ever changes.
  function npcGone(ids) {
    try {
      if (typeof G === 'undefined' || !G.maps) return false;
      for (const mid in G.maps) {
        const m = G.maps[mid]; if (!m || !Array.isArray(m.entities)) continue;
        for (const e of m.entities) if (e && ids.indexOf(e.id) >= 0 && e.dead) return true;
      }
    } catch (e) { return false; }
    return false;
  }

  const P = (...ps) => ps.map(p => '<p>' + p + '</p>').join('');
  const SIG = (s) => '<p class="p6c-sig">' + s + '</p>';

  // ---------------------------------------------------------------- the letters
  // text(f) returns HTML built only from constants. gift(f) returns {gold}|{item} and a
  // line for the courier message, decided by the same branch as the text; the letter
  // itself says what is enclosed.
  const LETTERS = [
    {
      id: 'orla', from: 'Orla Hale', note: 'the boots', title: 'Letter from Orla Hale',
      when: (f) => f.boots_delivered, alive: (f) => oakhavenOpen(f), npc: ['orla'],
      text: () => P(
        'To the stranger who brought the boots.',
        'Bettany holds the pen, because I have none left to hold one with. She says I am to tell you she disapproves of the ink.',
        'The boots are on the chair-rail where I can see them. Davin had big feet for a boy; I have been saying so to the room all morning, and the room has not argued. I thought I should not be able to look at them. I look at them instead of my hands, which is a mercy of a sort.',
        'You did not sing, and I was angry with you for the length of a meal. Then I was not. Lyra has promised to sing me down proper, before the fire, and she is a woman who keeps what she promises. I find I can wait for that.',
        'Bettany says that is enough, and that I am tiring.') + SIG('Orla Hale, in her chair'),
      gift: () => null,
    },
    {
      id: 'rooke', from: 'Surgeon-Grafter Rooke', note: 'a record, not a thanks', title: 'Letter from Anselm Rooke',
      when: (f) => f.boots_delivered && f.rooke_thanks, alive: (f) => oakhavenOpen(f), npc: ['rooke'],
      text: () => P(
        'Stranger.',
        'This is not a thanks. I do not write those; they are an invitation to be owed.',
        'It is a record. The boots reached Orla Hale. I know because she sent for me afterwards, and I crossed the lane to her door, and stood on the step, and did not go in. She said through the wood that it was all right. I am told a man may stand on a step. I will take it.',
        'I have still not found the Inquisitor\'s list. I intend to go on not finding it for as long as the Synod will wait, which is not as long as I would like.',
        'Enclosed is a roll of linen, boiled twice. You will remember I said that my tonics are for cutting. This is the exception, and it is the opposite of cutting.') + SIG('A. Rooke, Surgeon-Grafter'),
      gift: () => ({ item: 'bandage', line: 'a linen bandage' }),
    },
    {
      id: 'nell', from: 'Nell Carder', note: 'Pim\'s hands', title: 'Letter from Nell Carder',
      when: (f) => f.pim_safe, alive: (f) => oakhavenOpen(f), npc: ['nell'],
      text: (f) => f.pim_tended ? P(
        'To the one who knelt on my meal-sacks.',
        'You had no honey and you had no Cantor, and you had a mouth with the right note in it, and you used it. I have been trying to find a sentence for what that was, and I have not got one, so here is the plain version: his hands are just hands. I turn them over. I cannot stop turning them over.',
        'He says you do it different from Lyra. He says it in the voice he uses for facts. I have told him strangers move on, and he has told me he knows.',
        'We will be on the corsair\'s ship, if Hearthday lets us. I would have paid you for the kneeling. You took nothing, and I do not like being owed, so here are eight sovereigns, and you will not argue with a woman who has been up three nights.') + SIG('Nell Carder')
        : P(
        'To the one who brought the jar.',
        'Lyra came to the mill with what was left of her voice and sat by his hands until they were hands. I held the jar the whole while like a warm egg, and I did not say anything, because I was afraid that if I said it the roots would hear.',
        'The inspection is still ahead of us, and I am less afraid of it than I was. I will be less afraid of it still on the morning Rooke looks at those palms and finds nothing to chalk.',
        'Pim has asked after you every day. I have told him that strangers move on. He has asked me to tell you that he has not been to the culvert, and that I am to say it exactly like that.') + SIG('Nell Carder'),
      gift: (f) => f.pim_tended ? { gold: 8, line: 'eight sovereigns' } : null,
    },
    {
      id: 'pim', from: 'Pim Carder', note: 'a note in a child\'s hand', title: 'Letter from Pim Carder',
      when: (f) => f.pim_safe, alive: (f) => oakhavenOpen(f), npc: ['pim'],
      text: (f) => P(
        'Mam says I am not to talk about my hands to anybody. She says writing is not talking, so this is allowed.',
        f.pim_tended
          ? 'You hummed it different from Lyra. Lyra goes up at the end. You go down. I watched your mouth the whole time and the roots went back under like worms from a lamp. Mam says it is rude to say what a stranger\'s hum goes like, so I am writing it, not saying it.'
          : 'You are the one who got the jar. Lyra hummed it and it tickled, and the roots went back under like worms from a lamp. Mam held the jar so tight her knuckles went white. I did not say anything about her knuckles.',
        f.pim_lured
          ? 'The Hedge whistled my whistle again. I did not go this time. I counted to forty first, and then to forty again, and then it stopped.'
          : 'Lyra taught me a whistle that only me and her know. I am not to write it down, so I have drawn it: two notes, down.',
        'I pulled this from the Flume bank. It is sweet reed. It is for your voice. Do not eat it near the water.') + SIG('Pim'),
      gift: () => ({ item: 'herb_reed', line: 'a sprig of sweet reed' }),
    },
    {
      id: 'tam', from: 'Old Tam', note: 'the second verse', title: 'Letter from Old Tam',
      when: (f) => f.tam_told || f.tam_left, alive: (f) => oakhavenOpen(f), npc: ['tam'],
      text: (f) => f.tam_sat ? P(
        'Hm. I do not write much. Essa did the writing.',
        'You sat. I have thought about that more than anything anybody has said to me this autumn. You did not tell me. You let me find it for myself, and a stranger who had heard her would have moved, and you did not move. That was the better kindness, and I did not know to ask for it.',
        'I have not been down to the Flume since. If something must go singing into the meadow some night to pull the hounds, there is a man who knows the whole song. I am practising it quietly, in the kitchen.',
        'I enclose a hush-whistle out of Essa\'s mother\'s stock. Walk soft in it.') + SIG('Tam')
        : f.tam_told ? P(
        'Hm. I do not write much. Essa did the writing.',
        'I have not been down to the Flume since you told me. I thought I would. I stood at the end of the lane three nights running and listened from there, and it sang the second verse without me, and I went in. The second verse is mine. I gave it to something on the first night, to see. I would like it back, and I cannot have it, and I find that is the whole of what I knew.',
        'If the hounds come to the meadow some night, there is a man who knows the whole song. I have started on a third verse. Essa never wrote one. I am only trying it quietly.',
        'I enclose reed-pith from the bank. For a voice. Do not sing it.') + SIG('Tam')
        : P(
        'Hm. I do not write much. Essa did the writing.',
        'You said you could not say, and you let an old man sit. It was a kindness and a coward\'s kindness both, and I took both, and I am not sorry. I am at the stone most nights. She gets the second verse right.',
        'Some nights now I sing it with her. It is not quite my voice that comes out. I have noticed. I have noticed it, and I go on, and I do not know what that makes me.',
        'Sit with me if you are ever by the bridge. Keep your voice down. She comes on the water about the time the light goes.') + SIG('Tam'),
      gift: (f) => f.tam_sat ? { item: 'whistle', line: 'a hush-whistle' } : (f.tam_told ? { item: 'herb_reed', line: 'a sprig of reed-pith' } : null),
    },
    {
      id: 'hob', from: 'Abner Fenning', note: 'the lamp in the window', title: 'Letter from Abner Fenning',
      when: (f) => f.hob_told, alive: (f) => oakhavenOpen(f), npc: ['hob'],
      text: (f) => f.twins_named ? P(
        'Fenning, tanner. I do not write; I am writing.',
        'You put Ned and Wyn in your book. I asked the Cantor whether a name in a stranger\'s book counts, and she said that is what a book is for. I did not know what to do with that, so I took the lamp out of the window the night you told me, and stood in the dark shop with the vats ticking. The window is dark now. I find I can look at it.',
        'Leather is quieter than people. I should have known that, in my trade.',
        'There is a jerkin on the second hook that fits you better than what you are wearing. It is not a gift. Come and pay for it, and mind the lime.') + SIG('A. Fenning')
        : P(
        'Fenning, tanner. I do not write; I am writing.',
        'You went down where I could not, and came up, and told me. I have not asked what you left. I hear you did not write them in any book. I am not angry. I should not have either; I should have wanted no page to look at.',
        'The lamp is out of the window. I stand with my hand on the nail where the key hung. The nail is empty. I keep my hand there anyway.',
        'Leather is quieter than people. I should have known that, in my trade. Mind the lime if you come.') + SIG('A. Fenning'),
      gift: () => null,
    },
    {
      id: 'hetty', from: 'Hetty Bram', note: 'the mast-ladder', title: 'Letter from Hetty Bram',
      when: (f) => f.hetty_paid, alive: (f) => oakhavenOpen(f), npc: ['hetty'],
      text: (f) => P(
        'Hetty Bram, of the Boar & Dulcimer, to the one with the steady head.',
        'I said I wanted to be told I was an old woman hearing things. You did not tell me. I have decided to be grateful. His hold is still full, and I send his supper up the mast-ladder with my fingers in my ears like a girl.',
        f.vane_told
          ? 'The corsair came in the day after you spoke to him and did not laugh at anything. He sat in his corner and drank small beer, which tells you all you need. Whatever you said to him, he heard it.'
          : 'The corsair is still in his corner and still laughs too loud at nothing. You have not got to him yet. The names go on in his hold, and I am the only one in this house who hears both.',
        'Singing is free and it will get you killed. I mean to go on saying it. I send one of Bettany\'s tonics, for my nerves; I find I have the nerves still and none of the need.') + SIG('H. B.'),
      gift: () => ({ item: 'tonic', line: 'a tonic' }),
    },
    {
      id: 'vane', from: 'Captain Vane', note: 'one thousand three hundred and forty-two', title: 'Letter from Captain Vane',
      when: (f) => f.vane_told, alive: (f) => oakhavenOpen(f), npc: ['vane'],
      text: (f) => P(
        'Vane, of the Drift-Kestrel, to the only honest person in Oakhaven, which is a low bar and a lonely one.',
        'One thousand three hundred and forty-two. I say it every morning. It does not get lighter; it gets more exactly the same weight, which I am told is what grief is. Right. Right.',
        'The Kestrel is at the mast. Mags has spliced the lines for four to a rung. Children first. I am not delivering what is in my hold, and if the Catalogue asks, I am a coward with a leaking hull, which is true, so I shall say it well.',
        f.hetty_paid ? 'Hetty has stopped charging me for the small beer. It is the most frightening thing that has happened to me this week.' : 'I have not been to the Boar in two days. Do not tell Hetty I said so; I am told she keeps a tally.',
        'Enclosed: ten sovereigns, for rope. Spend them on rope. Or drink. It comes to the same in the end.') + SIG('V.'),
      gift: () => ({ gold: 10, line: 'ten sovereigns' }),
    },
    {
      id: 'tobiah', from: 'Tobiah Marsh', note: 'the charts', title: 'Letter from Tobiah Marsh',
      when: (f) => f.tobiah_met, alive: (f) => oakhavenOpen(f), npc: ['tobiah'],
      text: () => P(
        'Junior Engineer T. Marsh, night shift, to the person who took the charts.',
        'I wanted this on paper. If I said it aloud under the pumps the bells would turn.',
        'For three years Revision Seven was under my mattress. I learned the Vance Sequence at fourteen and I was proud of it the way you are proud of a thing you do not yet understand. I understand a little more now, and I wish it were less.',
        'It is strange to be lighter. I keep patting my coat. I would call it relief, but I think relief is the word the Factor would put on a form.',
        'Depot Three is quiet. The Legionnaire there has stopped talking about the blue jug, or I have stopped hearing it, and I do not know which is worse.',
        'If Engineer Vance asks, tell him I kept the margin. Tell him I read it.') + SIG('T. Marsh'),
      gift: () => null,
    },
    {
      id: 'hew', from: 'Hew Callan', note: 'his own name', title: 'Letter from Hew Callan',
      when: (f) => f.sable_returned && f.hew_thanked, alive: (f) => oakhavenOpen(f), npc: [],
      text: (f) => f.hew_home ? P(
        'Hew Callan, pump-man, Depot Two. That is how I start everything now. Mags says it is like being written to by a notice.',
        'I went home. I finished the rounds first, because I have never in my life walked off a pump half-checked, and Mags says that is the most Hew thing that has ever been said, and she is right. She had the door open anyway.',
        'She did not shout. She sat me down and put the supper in front of me, the Dawnday one, three years late. I owed her four sovereigns and she has decided to take it out in being obeyed.',
        'She says the four are yours, since you are the reason I am here to owe them. She counted my purse in front of me. It was all there. You were right about the purse.') + SIG('H. Callan')
        : P(
        'Hew Callan, pump-man, Depot Two. That is how I start everything now. I am told it reads like a notice.',
        'You took my purse and the gear, and I am glad of it. A dead man\'s wages are better spent by the living. I say my name under my breath at the pumps, a dozen times a shift. It is easier with the purse gone. There is less to count.',
        'I have sent word to Mags Harker. I hear she will come to the quarry gate on Dawnday. I think she will shout. I hope she shouts for an hour.',
        'I still owe the scribe a name. I am saving it up. When I give it, I mean it to be right.') + SIG('H. Callan'),
      gift: (f) => f.hew_home ? { gold: 4, line: 'four sovereigns' } : null,
    },
    {
      id: 'sable_ret', from: 'Umber', note: 'a letter, filed', title: 'Letter from Umber',
      when: (f) => f.sable_returned, alive: (f) => oakhavenOpen(f), npc: [],
      text: (f) => P(
        'Entry: a letter, which is not an entry, and which I do not know how to file.',
        'Hew Callan has been told the year. He took it the way a man takes a blow he saw coming, and then he asked for a pen. I have two things left in the inventory: the taste of the Veil\'s bread, and a name. The bell is gone. I am asked whether that is a loss. It is a shelf.',
        f.sable_accused
          ? 'You said I owed him more than a page. I recorded it. I record also that you were right, and that Sable would have said it herself, in the spring of 416, if she had been the sort of person who said things, and that I only ruled the lines.'
          : 'You said whatever it cost, and I note that you did not ask what the cost was. It is an unusual courtesy. It cost what it cost. I am not sorry.',
        'Go softly.') + SIG('Umber'),
      gift: () => null,
    },
    {
      id: 'sable_kept', from: 'Umber', note: 'three things, kept', title: 'Letter from Umber (kept)',
      when: (f) => f.sable_kept, alive: (f) => oakhavenOpen(f), npc: [],
      text: () => P(
        'Entry: the stranger asked me to keep myself. I kept.',
        'I have three things: the taste of the Veil\'s bread; the scriptorium bell at matins; my own name. I say them at night so that I know which is which. They are all still where I put them. It is possible that I am the only person in the Reach who can say so.',
        'The Hollow at the pumps is still counting. I can hear it from the hedge when the wind is right. Leaf nine thousand and six sits unread. You asked me not to spend, and I have not, and every night I hear him, and I write that down too.',
        'I am not yet certain it was right. I record that I am not yet certain, because the Veil\'s leaves prefer an honest hole to a tidy page.') + SIG('Umber'),
      gift: () => null,
    },
    {
      id: 'quist', from: 'Registrar-General Quist', note: 'a memorandum, informal', title: 'Letter from Registrar-General Quist',
      when: (f) => f.quist_press || f.round_struck, alive: (f) => roadOpen(f), npc: ['quist'],
      text: (f) => P(
        'Memorandum, informal. The matter of the hand-press is closed. It was requisitioned, and the form says so, and the form is correct, because I signed it.',
        f.round_struck
          ? 'The round of Inspector Mallow has been struck from the register. Eight lines, one rule through each. The eight are on no list. It is the only freedom this Office has issued, and I issued it in a hand that was straight.'
          : 'No further entry is required. None has been made. I observe that this is the first file in forty years to close without a remainder.',
        'Hot water continues. The chair remains clean. People hesitate less when it is clean.',
        f.quist_sable
          ? 'The second cup has not been moved. It is cold. Each morning I fill it, and each evening it is returned to me, unclaimed, and that is a reconciliation of a kind.'
          : 'The desk across from mine is kept. It is dusted on Rootday.',
        'A sum is enclosed, recorded as petty cash, which nobody audits.') + SIG('Q.'),
      gift: () => ({ gold: 12, line: 'twelve sovereigns' }),
    },
    {
      id: 'halder', from: 'Halder Wick', note: 'four plates', title: 'Letter from Halder Wick',
      when: (f) => (f.halder_sat || f.halder_rest) && !f.halder_dead, alive: (f) => roadOpen(f) && !f.halder_dead, npc: ['halder'],
      text: (f) => P(
        '...four plates. The blue one goes there...',
        'To the one at the door. I have not the word for you. The one at the door.',
        'They will be in directly. I have set it for six. It is always ready at six.',
        'There are four chairs. I have sat down in one. The water is warm.',
        f.halder_sat
          ? 'The blue plate is in front of the fourth chair, where you sat. I have not lifted it. I have not lifted it.'
          : 'The blue plate is in front of the chair by the door. I have not lifted it. I have not lifted it.',
        'It is a good chair. It faces the door.',
        '...sit, sit, there\'s four...') + SIG('H. W.'),
      gift: () => null,
    },
    {
      id: 'bettis', from: 'Bettis Renn', note: 'the days, in order', title: 'Letter from Bettis Renn',
      when: (f) => f.bettis_kept_awake && !f.bettis_put_back, alive: (f) => roadOpen(f), npc: ['bettis'],
      text: () => P(
        'Name, age, trade. That is what the kind clerk asked, and I answered, and then I asked to go second. I began this letter with my name and crossed it out, and wrote it again. My name is Bettis Renn. I am writing it so that it is somewhere.',
        'You held me on the floor and it did not pass, and then it did not pass for several days. This is the true report: I do not forgive you for refusing me, and I am glad you held on. I cannot make those into one thing. I have stopped trying. That is a relief.',
        'I am writing the days down in order, from the first. It is slow. I have reached the second winter. It helps in the way a rail helps on a stair.',
        'Ivo is in the third stack. I sit with my back against it. I eat when someone brings bread. Someone does.') + SIG('Bettis Renn'),
      gift: () => null,
    },
    {
      id: 'sexton', from: 'Amos Fell', note: 'Nan\'s stone', title: 'Letter from Amos Fell',
      when: (f) => f.sexton_rest, alive: (f) => roadOpen(f), npc: ['sexton'],
      text: (f) => f.bell_rung ? P(
        'Amos Fell, sexton. To the one with the hammer.',
        'She is in the ground proper now, under a stone with her name on it. I cut it myself, nine days at the chisel; the N came out like a gate. NAN FELL, WIFE OF THE SEXTON. I have added nothing after. Nothing wants adding.',
        'You struck the bell three times. I was at the foot of the tower with my cap in my hands, and the mourners with their lilies stopped walking, and laid them down, all at once, in a row. I had forgotten how a lot of people being sorry together sounds. It sounds like rain starting.',
        'I am digging again, only for the ones who are owed. It is the work I know. By custom a sexton pays the fee for a tolling. It is nine sovereigns, and I would not have you refuse a custom.') + SIG('A. Fell')
        : P(
        'Amos Fell, sexton. To the one with the hammer.',
        'I sit by the filled grave with my cap in my hands and I pat the earth. Every so often I forget, and reach for the spade, and then I remember, and put it down. That is a great deal of work for a man to do before breakfast.',
        'The headstone has no name on it yet. I am working up to the chisel. The rope in the tower is still cut, and I cut it. When the bell goes, I will know the hand, and I will not mind whose it is.',
        'The mourners are still waiting on it. So am I. We are patient people. It is the one thing that was not taken.') + SIG('A. Fell'),
      gift: (f) => f.bell_rung ? { gold: 9, line: 'nine sovereigns' } : null,
    },
  ];

  // ---------------------------------------------------------------- state (flags only)
  function key(L) { return PREFIX + L.id; }
  function delivered(L) {
    try { const v = G.flags[key(L)]; return v === 1 || v === true; } catch (e) { return false; }
  }
  function flagsOk() { return typeof G !== 'undefined' && G && G.player && G.flags && typeof G.flags === 'object'; }
  function eligible(L) {
    if (!flagsOk() || delivered(L)) return false;
    const f = G.flags;
    try { if (!L.when(f) || !L.alive(f)) return false; } catch (e) { return false; }
    if (L.npc && L.npc.length && npcGone(L.npc)) return false;
    return true;
  }
  function deliveredLetters() { return flagsOk() ? LETTERS.filter(delivered) : []; }

  // ---------------------------------------------------------------- delivery
  const seen = Object.create(null);   // letter id -> G.time when its deed was first noticed this session
  const state = { minWait: MIN_WAIT, lastDay: null, last: null };

  function stamp() {
    const now = G.time || 0;
    for (const L of LETTERS) {
      if (eligible(L)) { if (seen[L.id] === undefined) seen[L.id] = now; }
      else delete seen[L.id];
    }
  }
  function canDeliverNow() { return flagsOk() && G.state === 'play' && !G.dead; }
  function gift(L) {
    let g = null;
    try { g = L.gift(G.flags); } catch (e) { g = null; }
    if (!g) return '';
    if (g.gold > 0 && g.gold <= 25) { G.gold(g.gold | 0); return g.line; }
    if (g.item && ITEMS[g.item]) { G.give(g.item, 1); return g.line; }
    return '';
  }
  // Deliver at most one eligible letter; returns its id or null.
  function tryDeliver(reason) {
    if (!on()) return null;
    try {
      stamp();
      if (!canDeliverNow()) return null;
      const now = G.time || 0;
      for (const L of LETTERS) {
        if (!eligible(L) || seen[L.id] === undefined || now - seen[L.id] < state.minWait) continue;
        G.flags[key(L)] = 1;           // first: if anything below throws, it can never arrive twice
        delete seen[L.id];
        const what = gift(L);
        state.last = { id: L.id, reason: reason || '', gift: what };
        if (typeof msg === 'function') msg('A courier has found you with a letter from ' + L.from + (what ? ' (' + what + ' enclosed).' : '.') + ' It is kept in your logbook.', 'good', 8000);
        try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.pickup) Audio_.sfx.pickup(); } catch (e) { /* ignore */ }
        return L.id;
      }
    } catch (e) { console.warn('couriers: delivery failed', e); }
    return null;
  }
  function tick() {
    if (!flagsOk() || !on()) return;
    try {
      stamp();
      if (state.lastDay === null) state.lastDay = G.day;
      else if (G.day !== state.lastDay) { state.lastDay = G.day; tryDeliver('day'); }
    } catch (e) { console.warn('couriers: tick failed', e); }
  }

  // ---------------------------------------------------------------- reading
  function bodyHtml(L) { return L.text(flagsOk() ? G.flags : {}); }
  function openLetter(L, fromLog) {
    if (typeof showEvent !== 'function') return;
    try { if (typeof closeModal === 'function') closeModal(); } catch (e) { /* ignore */ }
    const back = fromLog ? [{ t: 'Fold it away', f: () => { G.state = 'panel'; renderLog(); } }] : [{ t: 'Fold it away', f: null }];
    showEvent(L.title, bodyHtml(L), back);
  }

  // The Letters section of the logbook: constants only, built with DOM calls.
  function decorateLog() {
    if (!on()) return;
    const list = deliveredLetters(); if (!list.length) return;
    const panel = document.getElementById('modal-panel'); if (!panel || panel.querySelector('.p6c-letters')) return;
    const wrap = document.createElement('div'); wrap.className = 'p6c-letters';
    const h = document.createElement('h3'); h.textContent = 'Letters'; wrap.appendChild(h);
    const grid = document.createElement('div'); grid.className = 'p6c-grid';
    for (const L of list) {
      const b = document.createElement('button'); b.className = 'dfbtn small p6c-btn'; b.type = 'button';
      b.dataset.letter = L.id;
      const a = document.createElement('b'); a.textContent = L.from;
      const n = document.createElement('span'); n.className = 'p6c-note'; n.textContent = ' — ' + L.note;
      b.appendChild(a); b.appendChild(n);
      b.onclick = () => openLetter(L, true);
      grid.appendChild(b);
    }
    wrap.appendChild(grid); panel.appendChild(wrap);
  }

  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('couriers-style')) return;
    const s = document.createElement('style'); s.id = 'couriers-style';
    s.textContent = `
.p6c-letters { margin-top: .6cqh; }
.p6c-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6cqh .8cqw; }
.p6c-btn { min-width: 0; text-align: left; font-size: 1.7cqw; padding: .45cqh .9cqw; white-space: normal; overflow-wrap: anywhere; line-height: 1.2; }
.p6c-btn b { font-weight: 700; }
.p6c-note { color: var(--parch); font-family: var(--font-body); opacity: .85; }
.hd-body .p6c-sig { text-align: right; font-style: italic; margin-top: 1em; }
`;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- hook up
  for (const L of LETTERS) {
    if (typeof READING !== 'undefined' && READING.SOURCES) READING.SOURCES[L.title] = { style: 'paper', kind: 'Letter' };
  }
  if (typeof document !== 'undefined') {
    injectStyle();
    if (typeof renderLog === 'function') {
      const _renderLog = renderLog;
      renderLog = function () {
        const r = _renderLog.apply(this, arguments);
        try { decorateLog(); } catch (e) { console.warn('couriers: letters list failed', e); }
        return r;
      };
    }
    if (typeof loadMap === 'function') {
      const _loadMap = loadMap;
      loadMap = function () {
        const r = _loadMap.apply(this, arguments);
        try { tryDeliver('arrival'); } catch (e) { console.warn('couriers: arrival failed', e); }
        return r;
      };
    }
    if (typeof doRest === 'function') {
      const _doRest = doRest;
      doRest = function () {
        const r = _doRest.apply(this, arguments);
        try { tryDeliver('rest'); } catch (e) { console.warn('couriers: rest failed', e); }
        return r;
      };
    }
    if (typeof setInterval === 'function') setInterval(tick, 1000);
  }

  return {
    LETTERS, PREFIX, MIN_WAIT, state, on, eligible, delivered, deliveredLetters, tryDeliver, tick, stamp,
    bodyHtml, openLetter, decorateLog, key,
  };
})();
