// ============================================================
//  companion-talk — Phase 9 (new gameplay systems): real conversations with your companions.
//
//  A "Talk" panel in the style of the dialogue panel (same .dlg frame, portrait and log): a topic list that grows
//  with what has happened, each topic a short branching exchange of two to four beats, with two or three replies
//  in different tones. Some replies move the companion's approval through the game's own partyApproval(); a few
//  topics earn one small permanent thing that already exists in the game: a title (earnTitle), a line at the rest
//  fire (partyBark), a line out on the road (partyChat), a logbook entry (journal). No combat power is added.
//
//  Who you can talk to
//    * your active companion, from the party panel (E on them) or the Talk button on the party HUD: Kaelen, Lyra, Sable
//    * the same people at the Whisper-Grove and Deep Woods camps, when they stand there as NPCs (a Talk... button in
//      the ordinary dialogue panel): Kaelen, Lyra, Sable (only once she is with you), Vane, and the calmed Aegis
//  Only when it is calm: never with a foe chasing nearby, in a fight with a Coda boss, in custody or on the bore escape.
//
//  Gates read (existing game flags only; the module never writes one):
//    kaelen_met coil_done part3 part4 greening hedge_answered hedge_silent hedge_listened tobin_417_done
//    lyra_met lyra_wg_met lyra_dw_met lyra_voice kaelen_dw_done kaelen_told_now
//    sable_met sable_wg_met sable_with sable_joined sable_aboard sable_returned bettis_awake quist_press quist_sable
//    aegis_calmed aegis_follow cloak_given dw_vane_met vane_wg_met vane_told crates_heard tank_patched
//    bottles_done coda_done vane_vesper
//  and the party object (G.party.id). Sable's "what have you paid" reads the two flags sableFragments() counts
//  (sable_returned, bettis_awake).
//
//  Memory (G.flags, all small integers, validated on read; anything else counts as 0):
//    p9t_t  talked-topic bits   (Kaelen 0-5, Lyra 8-13, Sable 16-20, Vane 22-25, Aegis 27-28; 29 bits)
//    p9t_u  unlock bits          (which small permanent things were earned)
//    p9t_a  approval banked from talk, three 5-bit fields (Kaelen, Lyra, Sable), each -16..+15, stored +16
//  The game keeps approval only on the live G.party object, which is not saved and is rebuilt on every
//  partyJoin; the bank re-applies what talk earned (silently) when a companion joins or a save is restored.
//
//  Lyra's voice follows voices.js exactly (VOICES.resolveNpc when it is loaded, the same flag rules otherwise):
//  silent from Whisper-Grove until lyra_voice, so she answers on her slate in capitals; with the voice back she speaks
//  "in her own ruined voice"; before Whisper-Grove she speaks plainly.
//
//  Switch: "Companion conversations" in Options > Graphics & access (default On, localStorage octave.ctalk.v1).
//  Off = the original game: no Talk button, no extra lines.
//
//  Security: every sentence comes from the constant tables below and is set with textContent; flag and save values only
//  choose among those tables and are never printed. The panel's frame markup is constant.
//  Anything marked [PROPOSED] is invented beyond the game's text and LORE_P6 and needs the author's eye.
// ============================================================
'use strict';

const COMPANION_TALK = (function () {
  const KEY = 'octave.ctalk.v1';
  const set = { on: true };
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ on: set.on ? 1 : 0 })); } catch (e) { /* no storage: fine */ } }
  function load() { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && (o.on === 0 || o.on === 1)) set.on = o.on === 1; } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- who
  // portrait ids are img/p_<id>.jpg; names are the NPC names the game already uses
  const PARTNERS = {
    kaelen: { name: 'Kaelen Vance, the Dissonant Blade', portrait: 'kaelen', npcs: ['kaelen_dw', 'kaelen_wg'], companion: true, tag: 'k' },
    lyra: { name: 'Lyra Ashgrove, Cantor of Oakhaven', portrait: 'lyra', npcs: ['lyra_dw', 'lyra_wg'], companion: true, tag: 'l' },
    sable: { name: 'Sable, Archivist of the Veil', portrait: 'sable', npcs: ['sable_dw', 'sable_wg'], companion: true, tag: 's' },
    vane: { name: 'Captain Vane of the Drift-Kestrel', portrait: 'vane', npcs: ['vane_dw', 'vane_wg'], companion: false, tag: 'v' },
    aegis: { name: 'The Aegis Sentinel', portrait: 'aegis', npcs: ['aegis_dw', 'aegis_wg'], companion: false, tag: 'a' },
  };
  const WHO = Object.keys(PARTNERS);
  const APPROVAL_FIELD = { kaelen: 0, lyra: 1, sable: 2 };    // 5-bit fields of p9t_a
  const NPC_TO_WHO = {}; for (const w of WHO) for (const n of PARTNERS[w].npcs) NPC_TO_WHO[n] = w;

  // ---------------------------------------------------------------- flags
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function flags() { try { return (typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object') ? G.flags : {}; } catch (e) { return {}; } }
  const gf = (k) => { const f = flags(); return has(f, k) && !!f[k]; };              // a game flag, read the way the game reads it (truthy)
  function readInt(k, max) {                                                           // one of ours: a non-negative integer below 2^max, else 0
    const f = flags(); if (!has(f, k)) return 0;
    const v = f[k];
    return (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < Math.pow(2, max)) ? v : 0;
  }
  function writeInt(k, v) { try { const f = flags(); if (f && typeof f === 'object') f[k] = v; } catch (e) { /* ignore */ } }
  const talkedBits = () => readInt('p9t_t', 29);
  const unlockBits = () => readInt('p9t_u', 12);
  const bankBits = () => readInt('p9t_a', 15);

  function bankOf(who) {
    if (!has(APPROVAL_FIELD, who)) return 0;
    const x = (bankBits() >> (APPROVAL_FIELD[who] * 5)) & 31;       // two's complement, so an absent flag reads 0
    return x >= 16 ? x - 32 : x;
  }
  function setBank(who, v) {
    if (!has(APPROVAL_FIELD, who)) return 0;
    v = Math.max(-16, Math.min(15, Math.round(v)));
    const cur = bankBits();
    const out = [0, 1, 2].reduce((acc, i) => acc | ((i === APPROVAL_FIELD[who] ? (v & 31) : ((cur >> (i * 5)) & 31)) << (i * 5)), 0);
    writeInt('p9t_a', out);
    return v;
  }

  // ---------------------------------------------------------------- Lyra's voice (mirrors voices.js lyraState)
  function lyraStateFlags(src) {
    const f = flags();
    if (src === 'lyra_wg') return 'silent';
    if (src === 'lyra_dw') return f.lyra_voice ? 'ruined' : 'silent';
    if (src === 'lyra' && (f.lyra_wg_met || f.lyra_dw_met) && !f.lyra_voice) return 'silent';
    if (src === 'lyra' && f.lyra_voice && (f.lyra_wg_met || f.lyra_dw_met)) return 'ruined';
    return 'clear';
  }
  function lyraState(src) {
    try {
      if (typeof VOICES !== 'undefined' && VOICES && typeof VOICES.resolveNpc === 'function') {
        const p = VOICES.resolveNpc(src);
        if (p && p.silent) return 'silent';
        if (p && /ruined/.test(String(p.why || ''))) return 'ruined';
        return 'clear';
      }
    } catch (e) { /* fall through to the flag rules */ }
    return lyraStateFlags(src);
  }

  // ---------------------------------------------------------------- the topics
  // node = { s: lines, m: mood, o: [option] }   option = { t: what you say, k: tone, r: reply lines, a: approval, u: unlock, n: next node, if: gate, m: mood }
  // lines = string | { note } | { sl, vo } (Lyra: slate / voice) | { frag: {none,scribe,bettis,both} } | array of those.
  // Lyra's lines are bare speech with no quotation marks around them: the panel puts them on her slate in capitals,
  // or in her own ruined voice, as her state says. Everybody else's lines carry their own quotes and stage directions.
  const TOPICS = [];
  function topic(def) { TOPICS.push(def); return def; }
  const tone = (k) => k;

  // ---- Kaelen ---------------------------------------------------------------------------------------------------
  const ARM_B = {
    s: `"It drinks what it breaks. Every Legionnaire, every hound: the ring gets fuller. I know the price of every fight before I take it. I take it anyway." He closes the hand. "That is not courage. That is arithmetic with the sign wrong."`,
    o: [
      { t: `"Then let me take the front."`, k: 'steady', a: 3, r: `"No." Quickly. Then slower: "No. Thank you. You will take your share and I will take mine, and neither of us will say whose was heavier."` },
      { t: `"Stop fighting, then."`, k: 'blunt', a: -1, r: `A short, dry breath, almost a laugh. "I did that sum too. If I stop, somebody else pays in a different coin. I would rather it were mine."` },
      { t: `"Does Lyra know the number?"`, k: 'curious', a: 1, r: `"She has never asked. That is a kind of knowing, and a kind of mercy, and I have not earned either."` },
    ],
  };
  topic({
    id: 'k_arm', who: 'kaelen', bit: 0, title: `The arm`,
    req: () => true,
    root: () => ({
      s: `He turns the glass hand over on his knee, palm up, the way you would show someone a tool that had stopped being yours. "Ask. Everybody wants to. Nobody does."`,
      o: [
        { t: `"Does it hurt?"`, k: 'kind', a: 1, n: ARM_B, r: `"Not any more. The pain went first, and the glass came in behind it, like a tide over flat sand."` },
        // [PROPOSED] four fingers: the game has him at "three fingers from the shoulder" in Oakhaven; the Deep Woods are some weeks on
        { t: `"How far has it climbed?"`, k: 'blunt', a: 0, n: ARM_B, r: `"Four fingers from the shoulder, when I last measured. I measure in fingers. It is the one unit the arm cannot argue with."` },
        { t: `Say nothing. Wait.`, k: 'quiet', a: 2, n: ARM_B, r: `He looks at you, and then at the glass. "Good. Most people fill the gap."` },
      ],
    }),
  });

  const FOUNDRY_B = {
    s: `"I keep a list now, on a beam, in chalk. The Synod kept lists too. It is the same list. I just pay it down in smaller coin, one name a day, and I do not get to stop."`,
    o: [
      { t: `"Let me carry some of it."`, k: 'kind', a: 2, r: `"It does not come in pieces." After a while, not looking at you: "Stay near anyway."` },
      { t: `"Read me one name."`, k: 'steady', a: 1, r: `"Not tonight." He taps two fingers against his knee, once. "Ask me when I can say the first one without stopping."` },
    ],
  };
  topic({
    id: 'k_foundry', who: 'kaelen', bit: 1, title: `The Foundry`,
    req: () => gf('kaelen_met') && (gf('coil_done') || gf('part3') || gf('part4')),
    root: () => ({
      s: `"Four-twelve. The Foundry floor, the morning of the Fracture. I had my sleeve rolled and my hand flat on the glass. 'Hold,' I said, to the room. The room held. That was the trouble."`,
      o: [
        { t: `"What happened?"`, k: 'curious', a: 1, n: FOUNDRY_B, m: 'sad', r: `"The needle climbed. Everything in the hall leaned one way, the way grass leans before rain. Then the light turned, and the arm stopped being something I could describe."` },
        { t: `"You could not have known."`, k: 'kind', a: 1, n: FOUNDRY_B, r: `"I could have. I was the one man in the building paid to." He says it without heat, like a load figure.` },
        { t: `"Was any of it worth it?"`, k: 'blunt', a: -1, n: FOUNDRY_B, m: 'angry', r: `The silence is long enough to count in. "Ask me when the number is on the right side of the page."` },
      ],
    }),
  });

  const SYNOD_B = {
    s: `"My father sold the Root to keep the town fed. I told myself I was doing the same sum, only bigger and better. It is the same sum. It is always the same sum."`,
    o: [
      { t: `"What would you do with it now?"`, k: 'curious', a: 1, r: `"Nothing clean. Break the right thing, slowly, and stay to hear it go."` },
      { t: `"Your father fed a town."`, k: 'kind', a: 2, r: `"He did. Keep saying it to me until it stops sounding like an excuse."` },
    ],
  };
  topic({
    id: 'k_synod', who: 'kaelen', bit: 2, title: `Why the Synod`,
    req: () => gf('part3') || gf('part4'),
    root: () => ({
      s: `"You want to know why an engineer takes the Synod's money. It paid. The Conservatory paid, the Consortium paid more, and it looked like fixing things: a bore here, a table there, a town fed. I was seventeen and I could make a wrong note come right."`,
      o: [
        { t: `"You believed it."`, k: 'steady', a: 1, n: SYNOD_B, r: `"I believed the table. Tables don't lie. It's the people who hold them upside down."` },
        { t: `"You knew."`, k: 'blunt', a: 1, n: SYNOD_B, r: `"Some of it. By line ninety-four I knew enough to look away, and I looked away. That is the part I earned."` },
        { t: `"It paid. Fair enough."`, k: 'dry', a: -2, n: SYNOD_B, r: `A short sound in his throat. "Don't let me off. I would only know."` },
      ],
    }),
  });

  const toldLyra = () => gf('kaelen_dw_done') || gf('kaelen_told_now') || gf('lyra_voice');
  topic({
    id: 'k_lyra', who: 'kaelen', bit: 3, title: `Lyra`,
    req: () => gf('part3') || gf('part4'),
    root: () => toldLyra() ? {
      s: `"I told her. All of it, out loud. She said she would have forgiven me on Rootday, and cannot now." He flexes the glass hand. "Then she took it. Not the easy hand. The glass one. It rang."`,
      o: [
        { t: `"She meant the hand."`, k: 'kind', a: 2, u: 'rest', r: `"I know what she meant." He is quiet. "I know what she meant, and I am still checking it for a flaw."` },
        { t: `"Do you feel lighter?"`, k: 'curious', a: 1, r: `"Seen. It isn't lighter. Seen is heavier, in a way, and easier to carry."` },
        { t: `"Good."`, k: 'blunt', a: 1, r: `"It will do." The corner of his mouth moves. It is the closest thing to a smile you have seen on him.` },
      ],
    } : {
      s: `"She taught me the Root note when we were nine. I hum it when the arm is bad. She knows, and has never said so, and that is her kindness, and I am wasting it."`,
      o: [
        { t: `"She would want to hear it from you."`, k: 'kind', a: 1, r: `"That is what frightens me. That she would."` },
        { t: `"Then tell her. All of it."`, k: 'blunt', a: 0, r: `"Soon. I have the words. What I do not have yet is the nerve to say them aloud, where they stop being a record and start being mine."` },
        { t: `"You could just hum at each other."`, k: 'dry', a: 1, r: `The corner of his mouth moves. "We have. For years. It is a poor way to say anything."` },
      ],
    },
  });

  topic({
    id: 'k_listen', who: 'kaelen', bit: 4, title: `What he hears`,
    req: () => gf('part4'),
    root: () => ({
      s: `"I put the glass to a thing and it tells me what it keeps. A bell keeps its last stroke. A wall keeps whoever leaned on it. Out here?" He tilts his head. "The woods. They are very loud."`,
      o: [
        { t: `"What does the Root keep?"`, k: 'curious', a: 1, r: `"A lullaby, and the loss of the tune, over and over. I laid my hand on it once. It turned toward me. It is tired, and it does not know how to ask."` },
        // [PROPOSED] the glass hand can read a person's Signature (LORE_P6: Kaelen's glass hand "Listens"; Signature reading)
        { t: `"Can you hear me?"`, k: 'quiet', a: 2, u: 'chat', r: `He closes his eyes. "A low, steady note, a little sharp when you are lying. Don't take that as an accusation. Everyone is a little sharp."` },
        // a hound's bed (Book One ch. 2): no sound carries in one for a day, and each was closer to his door than the last
        { t: `"Does it ever go quiet?"`, k: 'kind', a: 1, r: `"Once. There was a hound's bed twenty paces from my door, and I stood in it before I fetched the barrow. No sound carries in one for a day. For about a minute the glass was quiet. Then I thought about what had been lying there, and I went and fetched the barrow."` },
      ],
    }),
  });

  topic({
    id: 'k_you', who: 'kaelen', bit: 5, title: `About you`,
    req: (c) => gf('part4') && c.heard('kaelen') >= 3,
    root: () => ({
      s: `"Nobody came to the hut in four years who did not want something broken, or someone forgiven. You came and asked how to stop a thing. I have been trying to work out what that makes you."`,
      o: [
        { t: `"Someone who needed an engineer."`, k: 'dry', a: 1, r: `"That is a better answer than I deserve. I will take it."` },
        { t: `"Someone who stayed."`, k: 'steady', a: 3, u: 'title', r: `"Yes." Only that. He looks at the fire for a long time. "Yes. That."` },
        { t: `"Don't decide. Walk with me."`, k: 'kind', a: 2, r: `"Walking is the one thing I am certain I can still do."` },
      ],
    }),
  });

  // ---- Lyra (bare speech; slate or voice) -------------------------------------------------------------------------
  const REED_B = {
    s: `A cut reed dies in a day. It holds any pitch you ask, and by the next dusk it is a stick. That is why we cut them fresh. That is why we love them.`,
    o: [
      { t: `"A day is long enough."`, k: 'kind', a: 2, r: `Yes. A day is exactly long enough for the thing you meant to say.` },
      { t: `"That sounds like waste."`, k: 'blunt', a: -1, r: `It is the opposite. Waste is a reed nobody cut.` },
    ],
  };
  topic({
    id: 'l_reeds', who: 'lyra', bit: 8, title: `The reeds`,
    req: () => gf('lyra_met') || gf('lyra_wg_met') || gf('lyra_dw_met'),
    root: () => ({
      s: `Father set me the long cane first, the one that sounds the root. I blew across it until the note stopped being a noise and became a place.`,
      o: [
        { t: `"Tell me about the First Reed."`, k: 'curious', a: 1, n: REED_B, r: `Every child gets one over the door, tuned before they can lift their head. I tuned ours standing on a chair, with my tongue between my teeth.` },
        { t: `"Can you still play one?"`, k: 'kind', a: 1, n: REED_B, r: { sl: `Not without a breath to put through it. I hold one sometimes anyway. It is company.`, vo: `Badly. It sulks. A reed knows when you have lost something.` } },
        { t: `"I never had the ear."`, k: 'dry', a: 1, n: REED_B, r: `Nobody has the ear. They have the patience. Listen anyway.` },
      ],
    }),
  });

  const TOBIN_B = {
    s: `If you ever hear a man in the dark call "lark," it is not him. Promise me you will not answer.`,
    o: [
      { t: `"I promise."`, k: 'steady', a: 2, u: 'rest', r: `Thank you. That is a kindness I can use.` },
      { t: `"I'd answer. To see what it does."`, k: 'dry', a: -1, r: `Then do it with me beside you. I won't be left holding your silence.` },
    ],
  };
  topic({
    id: 'l_tobin', who: 'lyra', bit: 9, title: `Tobin`,
    req: () => gf('part3') || gf('part4'),
    root: () => ({
      s: `He called me lark. I told him once, when I was twelve, that a martyr is just a musician who gave up before the coda, and he laughed and wrote it down. Then a child at the Pellow farm went still, and he raised his voice above the Narrow to call her back, and she lived.`,
      m: 'sad',
      o: [
        { t: `"I'm sorry."`, k: 'kind', a: 2, n: TOBIN_B, r: `Don't be sorry. Be accurate. He called a child home and she came. Write that down first.` },
        { t: `"Was it worth it?"`, k: 'blunt', a: 1, n: TOBIN_B, if: () => !gf('tobin_417_done'), r: `The child is alive. I do the sum every night. The answer changes. She is alive in every one.` },
        { t: `"Do you want the blade back?"`, k: 'steady', a: 2, n: TOBIN_B, if: () => gf('tobin_417_done'), r: `Not yet. Too heavy for a first fifth. I told him that once, and I was right then too.` },
        { t: `"What wears his voice?"`, k: 'hard', a: -1, n: TOBIN_B, r: [{ note: `Lyra is quiet for a long moment.` }, `A thing that practised him. I will not give it the dignity of a name until it gives him back.`] },
      ],
    }),
  });

  topic({
    id: 'l_rite', who: 'lyra', bit: 10, title: `The Rite`,
    req: () => gf('coil_done') || gf('part3') || gf('part4'),
    root: () => ({
      s: `They would have put a collar on my throat and a wire through my voice. I sang the falling fifth against the bore instead, and the bore broke. So did something in me. Nobody told me the singing was a loan.`,
      o: [
        { t: `"You chose it."`, k: 'honest', a: 1, r: `I did. We choose, and then we pay, and the paying is always later and always larger. That's not a complaint. It's tuning.` },
        { t: `"Does it hurt now?"`, k: 'kind', a: 2, u: 'chat', r: `Only when someone else sings well. That is not the voice. That is envy.` },
        { t: `"I'd have sung it for you."`, k: 'steady', a: 1, r: `You'd have sung it flat. Thank you. Truly.` },
      ],
    }),
  });

  topic({
    id: 'l_hedge', who: 'lyra', bit: 11, title: `The Hedge`,
    req: () => gf('part3') || gf('part4') || gf('greening') || gf('hedge_answered') || gf('hedge_silent') || gf('hedge_listened'),
    root: () => ({
      s: `I kept my hand on the wool the night we planted it. It's listening, I said. Father said it was packed wool. I said, I know.`,
      o: [
        { t: `"Was the Hedge a mistake?"`, k: 'honest', a: 1, r: `It was the only plan anyone offered. A candle is safe in a jar. A candle in a jar is also no use to the room.` },
        { t: `"Something answered me from it."`, k: 'quiet', a: 2, if: () => gf('hedge_answered'), r: `Then you've met it. It tried my father's fifth on me first. I won't ask what it said in yours.` },
        { t: `"I kept quiet inside it."`, k: 'steady', a: 1, if: () => gf('hedge_silent'), r: `Good. Quiet is the Hedge's native tongue. You speak it better than most of us.` },
        { t: `"I listened to it."`, k: 'curious', a: 1, if: () => gf('hedge_listened'), r: `Everyone does. It listens back. That is the whole of its charm.` },
        { t: `"Do you miss being inside?"`, k: 'kind', a: 1, if: () => !(gf('hedge_answered') || gf('hedge_silent') || gf('hedge_listened')), r: `Not the walls. Being allowed to be loud and still found. Out here you are either quiet or found.` },
      ],
    }),
  });

  topic({
    id: 'l_sing', who: 'lyra', bit: 12, title: `What she would sing`,
    req: () => (gf('part3') || gf('part4')) && (gf('lyra_wg_met') || gf('lyra_dw_met')),
    root: (c) => c.lyra === 'silent' ? {
      s: `If I could: the house song first. Then the Root, for Kaelen's arm. Then something rude, for me.`,
      o: [
        { t: `"What's the rude one?"`, k: 'dry', a: 1, r: `The Miller's Daughter, both verses. Father sang it for Tam. It is not a hymn. It is true.` },
        { t: `"You'll sing again."`, k: 'kind', a: 1, r: `Something is sitting on it. I know what. I'm not ready to ask it to get up.` },
        { t: `"I'll sing the rude one for you."`, k: 'warm', a: 2, r: [{ note: `A laugh, silent, in the whole of her shoulders.` }, `Then I will hear it first. Be loud. Do not be right.`] },
      ],
    } : {
      s: [{ note: `She touches her throat.` }, `Now? With this? The Root, under my breath, for Kaelen's arm. Then something rude, for me.`],
      o: [
        { t: `"What's the rude one?"`, k: 'dry', a: 1, r: `The Miller's Daughter, both verses. Father sang it for Tam. It is not a hymn. It is true.` },
        { t: `"It's a good voice."`, k: 'kind', a: 1, r: `It's a ruin, and it's mine. Don't lie to me with kindness. Lie to me with beer.` },
        { t: `"Sing it now."`, k: 'bold', a: 2, r: [{ note: `She does, low and rough: three bars of something a Cantor should not know.` }, `There. Don't tell the Church.`] },
      ],
    },
  });

  topic({
    id: 'l_you', who: 'lyra', bit: 13, title: `About you`,
    req: (c) => gf('part4') && c.heard('lyra') >= 3,
    root: () => ({
      // [PROPOSED] she taught children for years (the game: "I'm a teacher", "I taught children whose parents did that")
      s: `I taught children for years. I know what it looks like when someone pretends to be steady so the others can be. It's a skill, and it costs. Who do you sing to, when it's your turn?`,
      o: [
        { t: `"No one. There hasn't been time."`, k: 'honest', a: 2, r: `Then borrow mine. Humming is free. No one has ever been charged for it.` },
        { t: `"I'm fine."`, k: 'dry', a: -1, r: [{ note: `Lyra looks at you the way she looks at a reed she suspects of lying.` }, `Of course you are.`] },
        { t: `"You. When you're ready to listen."`, k: 'warm', a: 3, u: 'title', r: `Then we are waiting for the same thing. That's a start. That's a whole interval.` },
      ],
    }),
  });

  // ---- Sable ("Entry:" voice) ---------------------------------------------------------------------------------------
  topic({
    id: 's_ledger', who: 'sable', bit: 16, title: `The Bound Ledger`,
    req: () => gf('sable_wg_met') || gf('sable_with') || gf('sable_joined'),
    root: () => ({
      s: `"Entry: the Bound Ledger keeps a name only at a price, weight for weight. I carry it open so that I never forget it is a debt."`,
      o: [
        { t: `"What have you paid so far?"`, k: 'curious', a: 1, r: { frag: {
          none: `"Entry: nothing yet. I have three things, and I recite them every night, so that I know which one goes."`,
          scribe: `"Entry: the smell of the scriptorium. Lampblack and oak-gall. I am told it was good. I no longer know what that means."`,
          bettis: `"Entry: one thing, for Bettis Renn, in the Malting. I could not name it afterwards. I am most careful about that. I record that I cannot name it."`,
          both: `"Entry: the scriptorium, and one thing more, for Bettis Renn, which I cannot name. One left. I recite it every hour."`,
        } } },
        { t: `"Is it worth it?"`, k: 'blunt', a: 0, r: `"Entry: the question is asked. The answer is a weight, not a sentence. It is worth it to the one it is spent on. It is not worth it to the one who spends."` },
        { t: `"Let me carry it a while."`, k: 'kind', a: 2, r: `She considers it with the whole of her face. "No. But you may hold the lantern. That is a trust."` },
      ],
    }),
  });

  topic({
    id: 's_veil', who: 'sable', bit: 17, title: `The Veil`,
    req: () => gf('sable_wg_met') || gf('sable_with') || gf('sable_joined'),
    root: () => ({
      s: `"Entry: the Veil records the death of civilisations. We do not hold it back. We do not hurry it. We write what was said, and by whom, and on which day."`,
      o: [
        { t: `"And you never stepped in?"`, k: 'blunt', a: 1, r: `"Entry: the question I asked in the Cloister doorway. I counted eleven in. I did not count them out. I am still writing the second column."` },
        { t: `"Why leave the Veil?"`, k: 'curious', a: 1, r: `"Entry: a list is not a cure. I said it so often it became a vow. Then a stranger came to the mist with a question, and I found I had stopped believing the second half."` },
        { t: `"Someone has to remember."`, k: 'kind', a: 2, u: 'chat', r: `"Yes. And someone has to forgive the remembering. I am not sure the Veil trained for that."` },
      ],
    }),
  });

  topic({
    id: 's_schedule', who: 'sable', bit: 18, title: `The schedule`,
    req: () => gf('sable_wg_met') || gf('sable_with') || gf('sable_joined'),
    root: () => ({
      s: `"Entry: I did not merely sign the Catalogue. I designed the harvest schedule, and I made it efficient. I wrote 'in white' on the Stage Nine form, so the Cantor would not be mistaken for staff. I was proud of the handwriting."`,
      m: 'sad',
      o: [
        { t: `"You can't undo that."`, k: 'blunt', a: 1, r: `"No. I can only read it back, one name at a time. It is slower. It is the one direction left."` },
        { t: `"You couldn't have known."`, k: 'kind', a: 1, r: `"Entry: I knew the number. I knew the column. Not knowing is a luxury of the people who did not draft the form."` },
        { t: `"Quist kept your desk."`, k: 'steady', a: 3, if: () => gf('quist_press') || gf('quist_sable'), r: `Her pen stops. "Entry: he said that. He would. He poured the second cup." She does not write the next line.` },
        { t: `"What would you write now?"`, k: 'curious', a: 1, if: () => !(gf('quist_press') || gf('quist_sable')), r: `"Not 'in white.' Anything but that."` },
      ],
    }),
  });

  topic({
    id: 's_boy', who: 'sable', bit: 19, title: `The boy in the Cloister`,
    req: () => gf('aegis_calmed') && (gf('sable_with') || gf('sable_joined')),
    root: () => ({
      s: `"Entry: WG-forty-one thousand and five. A boy of the Cloister choir. A girl in a red cloak would not let go of him at intake, and my hand shook, and I made his surname illegible. The shaking is all the Office has of him now."`,
      m: 'sad',
      o: [
        { t: `"You'll find his name."`, k: 'steady', a: 2, r: `"The Organum, third floor, the Hall of Carriage. I know the cabinet. I know the clerk's handwriting."` },
        { t: `"Why did your hand shake?"`, k: 'curious', a: 1, r: `"Because the girl would not let go. That is the whole reason. I have no better one, and I have looked."` },
        { t: `"Does it understand you?"`, k: 'quiet', a: 1, if: () => gf('cloak_given'), r: `"It gave me the cloak. Entry: whether it understood me is a question for the cloak."` },
        { t: `"Does it understand you?"`, k: 'quiet', a: 1, if: () => !gf('cloak_given'), r: `"Entry: it knows the alto line. I do not know what else it knows. I have not asked. I record that I have not asked."` },
      ],
    }),
  });

  topic({
    id: 's_you', who: 'sable', bit: 20, title: `About you`,
    req: (c) => gf('part4') && (gf('sable_with') || gf('sable_joined')) && c.heard('sable') >= 3,
    root: () => ({
      s: `"Entry: the stranger. I have a page for you and it is not full. I do not know what to put in the column marked 'reason.'"`,
      o: [
        { t: `"Write that I stayed."`, k: 'steady', a: 3, u: 'title', r: `She writes it. You hear the nib. "Entry: the stranger stayed. Reason: unrecorded. I will let it stand."` },
        { t: `"Read me what you have so far."`, k: 'curious', a: 0, r: `She turns the page toward her chest, gently, as if it might wake. "Not yet. Ask me again."` },
        { t: `"Leave the column blank."`, k: 'kind', a: 2, r: `"That is the kindest instruction I have ever been given. It is also, technically, an omission." The corner of her mouth moves. "I will allow it."` },
      ],
    }),
  });

  // ---- Vane (bravado over grief; Vesper is already a quest, so she is only ever pointed at) ---------------------------
  topic({
    id: 'v_kestrel', who: 'vane', bit: 22, title: `The Kestrel`,
    req: () => gf('dw_vane_met') || gf('part4'),
    root: () => ({
      s: `"She's on her side in a wood with a hole in her you could post a sheep through, and I have never loved her more. Don't tell Tobiah. He thinks she's his."`,
      o: [
        { t: `"Will she fly again?"`, k: 'curious', r: `"Forty-mile hops, if the silk holds. Up, down, cool the tank, up. Stepping-stones, if the stones were on fire."` },
        { t: `"Why this ship?"`, k: 'kind', r: `"Bought with money I'd rather not discuss, from people I'd rather not name. She was the only thing for sale that didn't ask what I was running from."` },
        { t: `"You love a ship more than people."`, k: 'blunt', m: 'wry', r: `"Ha. A ship has never once asked me to feel anything. Mags would hit you for that." He grins. "Then she'd agree."` },
      ],
    }),
  });

  topic({
    id: 'v_crates', who: 'vane', bit: 23, title: `The crates`,
    req: () => gf('vane_told') || gf('crates_heard') || gf('part3') || gf('part4'),
    root: () => ({
      s: `"One thousand three hundred and forty-two. I know the number now. I didn't want to. I carried twelve crates for two years and never asked what was in them. It's a skill. I was very good at it."`,
      o: [
        { t: `"You didn't know."`, k: 'kind', r: `"Don't. I knew the way you know a stair is missing in the dark. By not putting my weight on it."` },
        { t: `"You're asking now."`, k: 'steady', r: `"Loudly. I'm told it counts. Mags says it counts."` },
        { t: `"Say Annet's name."`, k: 'quiet', m: 'sad', r: `"Annet Sowerby. Six." He says it like a man setting a cup down very carefully. "She asked the Carder boy his name through the side of a crate."` },
      ],
    }),
  });

  topic({
    id: 'v_cutter', who: 'vane', bit: 24, title: `The cutter's hold`,
    req: () => gf('part4') && gf('dw_vane_met'),
    root: () => ({
      s: `"A courier-cutter. Couldn't carry a cat. She never needed to see us; she had our hold on the horn the whole way. Four hundred and thirty-two people talking in their sleep. We're a bell, and I've been ringing it for two years." He jerks his chin east. "Her own hold murmurs too. Smaller."`,
      m: 'afraid',
      o: [
        { t: `"What should we do with them?"`, k: 'steady', if: () => !gf('bottles_done'), r: `"Open them where nothing else is listening. Or don't. I won't tell you which. I've been wrong about doors before."` },
        { t: `"It's done now."`, k: 'quiet', if: () => gf('bottles_done'), r: `"It's done. I counted the quiet after. It's a different sort of count."` },
        { t: `"Smaller?"`, k: 'curious', r: `"A dozen bottles. Seized; the Office takes them off the Rust Coast boats. One of them was singing when she went into the willows. I didn't know the tune. I hum it when I'm not watching myself."` },
        { t: `"Don't hum it."`, k: 'blunt', r: `"Ha. Sap and splinters, you sound like the Cantor." He hums it anyway, one bar, and stops.` },
      ],
    }),
  });

  topic({
    id: 'v_lift', who: 'vane', bit: 25, title: `Lifting off`,
    req: () => gf('tank_patched') || gf('coda_done'),
    root: () => ({
      s: `"She'll lift when you say. I won't lift without the Cantor. I've done that sum before, and I didn't like the answer."`,
      o: [
        { t: `"We'll all go together."`, k: 'kind', r: `"That's the only sum I'll sign."` },
        { t: `"And if I said now?"`, k: 'blunt', r: `"Then I'd say what I'd say to anyone who tried me. Not yet, and not without her." He is not smiling.` },
        { t: `"You put the axe down at the fire."`, k: 'quiet', if: () => gf('vane_vesper'), u: 'journal', r: `"I did." He turns the blade over. "Don't make it a thing. It's already a thing. That's why I put it down."` },
        // [PROPOSED] Port Cantabile as the place with a horizon (the game names it as a Free Captains port)
        { t: `"Where would you go, after?"`, k: 'curious', if: () => !gf('vane_vesper'), r: `"Somewhere with a horizon and no paperwork. Mags says that's called dying. I say it's called Port Cantabile."` },
      ],
    }),
  });

  // ---- the calmed Aegis (speaks in chords; DEFEND THE SINGERS) -------------------------------------------------------
  topic({
    id: 'a_singers', who: 'aegis', bit: 27, title: `The singers`,
    req: () => gf('aegis_calmed'),
    root: () => ({
      s: `It turns its bronze head toward you. DEFEND. THE. SINGERS. Underneath the words, very softly, a chord: the alto line, held.`,
      o: [
        { t: `"The singers are safe."`, k: 'kind', r: `It chimes a long rising third, and holds it until you stop speaking.` },
        { t: `"Who taught you the alto line?"`, k: 'curious', m: 'sad', r: `A pause the width of a breath. Then one low fifth, and a high, shy note, a little flat on the turn. It is not a name. It is how a boy says one.` },
        { t: `"Rest."`, k: 'quiet', r: `It does not kneel. It chimes the root, once, and faces the dark, and you understand that it has been told something it means to keep.` },
      ],
    }),
  });
  topic({
    id: 'a_cloak', who: 'aegis', bit: 28, title: `The red cloak`,
    req: () => gf('aegis_calmed') && gf('cloak_given'),
    root: () => ({
      s: `It stands with its hands empty, which you have not seen before. It chimes a chord that resolves, for what may be the first time in three years, upward.`,
      o: [
        { t: `"Sable keeps her promises."`, k: 'steady', r: `DEFEND THE SINGERS, it says, as if in reply, and then a warm, dropped chord, like a cloak settling over a shoulder.` },
        { t: `"You are allowed to stop."`, k: 'kind', r: `It looks at its hands. It does not put anything down. It chimes the alto line once, to the empty air, and lets it end on the right note.` },
      ],
    }),
  });

  // ---------------------------------------------------------------- unlocks (each is something the game already has)
  // key = <who>:<kind>. 'title' -> earnTitle; 'rest' -> a line at the rest fire (partyBark); 'chat' -> a line on the
  // road (partyChat); 'journal' -> a logbook entry. Their bits are in p9t_u. No unlock touches combat.
  const UNLOCKS = {
    'kaelen:title': { bit: 0, title: 'Load-Bearing' },                       // [PROPOSED] engineer's word for a member that carries the weight
    'kaelen:rest': { bit: 1 }, 'kaelen:chat': { bit: 2 },
    'lyra:title': { bit: 3, title: 'Beside the Reed' },                      // [PROPOSED] after "Sing beside it" (the Wind-Reed echo)
    'lyra:rest': { bit: 4 }, 'lyra:chat': { bit: 5 },
    'sable:title': { bit: 6, title: 'Entered in the Ledger' },               // [PROPOSED]
    'sable:chat': { bit: 7 },
    'vane:journal': { bit: 8, journal: `Vane put the axe down at the fire and said not to make it a thing. I did not.` },
  };
  const LINES = {
    rest: {
      kaelen: `I'll take first watch, and I'll hum where she can hear it. Nobody asked me to. Sleep.`,
      lyra: `Sleep. I'll hum the Root for the arm, and the Miller's Daughter for me. Both verses.`,
    },
    chat: {
      kaelen: `Your note has been steady since the Hedge. I stopped checking. In my trade that is a compliment.`,
      lyra: `Envy isn't the worst thing to carry in a throat. Hunger is. I'm only envious.`,
      sable: `Entry: the stranger said someone has to remember. I have decided that it is a form of company.`,
    },
  };

  // ---------------------------------------------------------------- small fixed texts
  const TXT = {
    intro: {
      kaelen: `Kaelen looks up from the glass hand.`,
      lyra: `Lyra lays down the slate, and her whole attention with it.`,
      sable: `Sable closes the Bound Ledger over one finger.`,
      vane: `Vane puts the axe down within reach, and rubs his face.`,
      aegis: `The Aegis turns its bronze head. The plates shiver, and chime.`,
    },
    nothing: `There is nothing more to say, for now. Come back when more has happened.`,
    slate: `She writes on her slate and turns it to you:`,
    ruined: `she says, in her own ruined voice.`,
    better: {
      kaelen: `Kaelen thinks the better of you.`, lyra: `Lyra thinks the better of you.`, sable: `Sable thinks the better of you.`,
    },
    less: {
      kaelen: `Kaelen thinks less of you.`, lyra: `Lyra thinks less of you.`, sable: `Sable thinks less of you.`,
    },
    remember: `This will come up again.`,
    approves: `something you said`,
    open: `Talk`, openDots: `Talk...`, openMenu: `"Can we talk?"`, notNow: `Not while danger is near.`,
    heard: `Said`, back: `Back`, leave: `Goodbye`, go: `Go on`,
    menuLabel: `Talk to your companion`,
  };

  // ---------------------------------------------------------------- context, availability
  // what Sable has spent: the one flag sableFragments() in data.js counts (the Reach's return was Umber's, not hers)
  function fragKey() { return gf('bettis_awake') ? 'bettis' : 'none'; }
  function ctxOf(who, src) {
    return {
      who, src, lyra: lyraState(who === 'lyra' ? (src || 'lyra') : 'lyra_dw'),
      frag: fragKey(),
      heard: (w) => WHO_TOPICS(w).filter(t => !/_you$/.test(t.id) && (talkedBits() & (1 << t.bit))).length,
    };
  }
  const WHO_TOPICS = (w) => TOPICS.filter(t => t.who === w);
  const talkedHas = (t) => !!(talkedBits() & (1 << t.bit));
  function partnerReady(who) {
    if (activeId() === who) return true;
    if (who === 'sable') return gf('sable_with') || gf('sable_joined') || gf('sable_aboard');
    if (who === 'aegis') return gf('aegis_calmed');
    return true;
  }
  function available(who, src) {
    if (!has(PARTNERS, who) || !partnerReady(who)) return [];
    const c = ctxOf(who, src);
    return WHO_TOPICS(who).filter(t => { try { return !!t.req(c); } catch (e) { return false; } });
  }
  function fresh(who, src) { return available(who, src).filter(t => !talkedHas(t)); }

  // calm: nothing hunting you, no Coda fight, no custody, no bore escape. A conversation is never an escape from a fight.
  function calm() {
    try {
      if (typeof G === 'undefined' || !G || G.dead) return false;
      if (G.state === 'title' || G.state === 'intro' || G.state === 'ending' || G.state === 'loading') return false;
      const f = flags();
      if (f.coda_fight || (typeof G.escapeTimer === 'number' && G.escapeTimer > 0)) return false;
      if (typeof crimeState === 'function') { const cs = crimeState(); if (cs && cs.custody) return false; }
      const c = (typeof Engine !== 'undefined' && Engine.cam) ? Engine.cam : null;
      if (c && Array.isArray(G.ents)) for (const o of G.ents) {
        if (!o || o.kind !== 'enemy' || o.dead || o.hidden) continue;
        if (o.state === 'chase' && (o.x - c.x) * (o.x - c.x) + (o.y - c.y) * (o.y - c.y) < 400) return false;
      }
    } catch (e) { return false; }
    return true;
  }

  // ---------------------------------------------------------------- lines
  function pickLines(x, c) {
    if (x == null) return [];
    if (typeof x === 'string') return [{ say: x }];
    if (Array.isArray(x)) { let out = []; for (const y of x) out = out.concat(pickLines(y, c)); return out; }
    if (typeof x === 'object') {
      if (typeof x.note === 'string') return [{ note: x.note }];
      if (has(x, 'sl') || has(x, 'vo')) return pickLines(c.lyra === 'silent' ? x.sl : x.vo, c);
      if (x.frag) return pickLines(x.frag[c.frag] != null ? x.frag[c.frag] : x.frag.none, c);
    }
    return [];
  }

  // ---------------------------------------------------------------- the panel
  const S = { open: false, who: null, src: null, origin: null, topic: null, node: null, c: null, log: [], pend: 0, pendUnlocks: [], lyraSaid: false, done: false, view: 'list' };
  let styleEl = null, padRaf = 0, padPrev = [];

  function injectStyle() {
    if (styleEl || typeof document === 'undefined') return;
    styleEl = document.createElement('style'); styleEl.id = 'p9t-style';
    styleEl.textContent = `
.p9t .log .note { color: #b9a77d; font-style: italic; margin-bottom: .8cqh; }
.p9t .log .you::before { content: "\\2014\\00a0"; }
.p9t .log .slate { color: #ece4cf; letter-spacing: .04em; border-left: 2px solid #8a7a58; padding-left: 1cqw; }
.p9t .log .slate b { font-weight: 600; }
.p9t .log .tag { color: #b9a77d; font-style: italic; }
.p9t .topics button.said { opacity: .55; }
.p9t .topics button:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }

.p9t .topics.p9t-list { grid-template-columns: 1fr 1fr; }
.p9t .topics button .sub { display: block; font-size: .8em; opacity: .75; }
#party button.pt { grid-column: 2; margin-top: .1cqh; padding: .6cqh 0; }
#party button.pt.new { color: var(--gold); }
`;
    document.head.appendChild(styleEl);
  }
  const $q = (s) => document.querySelector(s);
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const sfx = () => { try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.ui) Audio_.sfx.ui(); } catch (e) { /* silent */ } };

  function logAdd(kind, text, extra) { S.log.push(Object.assign({ kind, text }, extra || {})); }
  // one NPC line, as the partner would deliver it
  function addSay(c, who, text) {
    if (who !== 'lyra') { logAdd('them', text); return; }
    if (c.lyra === 'silent') {
      logAdd('slate', String(text).replace(/^"|"$/g, '').toUpperCase(), { lead: !S.lyraSaid });
    } else if (c.lyra === 'ruined') {
      logAdd('spoken', '"' + text + '"', { tail: !S.lyraSaid });
    } else logAdd('spoken', '"' + text + '"');
    S.lyraSaid = true;
  }
  function addLines(x) {
    for (const ln of pickLines(x, S.c)) { if (ln.note != null) logAdd('note', ln.note); else addSay(S.c, S.who, ln.say); }
  }

  function renderLog() {
    const box = $q('#p9t-log'); if (!box) return;
    box.textContent = '';
    for (const e of S.log) {
      let d;
      if (e.kind === 'you') d = el('div', 'you', e.text);
      else if (e.kind === 'note') d = el('div', 'note', e.text);
      else if (e.kind === 'slate') {
        d = el('div', 'them slate');
        if (e.lead) d.appendChild(document.createTextNode(TXT.slate + ' '));
        d.appendChild(el('b', null, e.text));
      } else if (e.kind === 'spoken') {
        d = el('div', 'them'); d.appendChild(document.createTextNode(e.text));
        if (e.tail) { d.appendChild(document.createTextNode(' ')); d.appendChild(el('span', 'tag', TXT.ruined)); }
      } else d = el('div', 'them', e.text);
      box.appendChild(d);
    }
    box.scrollTop = box.scrollHeight;
  }

  function setMood(mood) {
    try {
      const img = $q('#modal-panel .p9t .port img'); if (!img) return;
      const id = PARTNERS[S.who].portrait, base = 'img/p_' + id + '.jpg';
      const P = (typeof PORTRAITS !== 'undefined') ? PORTRAITS : null;
      const on = typeof GFX === 'undefined' || GFX.moodPortraits !== false;
      if (!mood || !P || !on || !P.has(id)) { if (img.dataset.mood) { img.src = base; img.alt = ''; delete img.dataset.mood; } return; }
      const swap = () => { const url = P.variant(id, mood); if (!url || !img.isConnected) return; img.src = url; img.alt = P.label(id, mood); img.dataset.mood = mood; };
      if (P.variant(id, mood)) swap(); else P.ensure(id).then(swap);
    } catch (e) { /* cosmetic */ }
  }

  function frame() {
    const P = PARTNERS[S.who];
    // the frame is constant markup; the portrait id and the name come from the PARTNERS table
    const html = `<h2>${P.name.split(',')[0]}</h2><div class="dlg p9t"><div class="port"><img src="img/p_${P.portrait}.jpg" alt=""><div class="name">${P.name}</div></div>
<div class="col"><div class="log" id="p9t-log" role="log" aria-live="polite"></div>
<div class="btns"><button class="dfbtn small" id="p9t-back" type="button"></button><button class="dfbtn small" id="p9t-bye" type="button"></button></div>
<div class="topics wide" id="p9t-opts"></div></div></div>`;
    openModal(html, 'ctalk');
    G.state = 'dialogue';
    $q('#p9t-back').textContent = TXT.back; $q('#p9t-bye').textContent = TXT.leave;
    $q('#p9t-bye').onclick = () => close();
    $q('#p9t-back').onclick = () => back();
  }

  function renderList() {
    S.view = 'list'; S.topic = null; S.node = null; S.done = false; S.lyraSaid = false;
    S.log = []; S.pend = 0; S.pendUnlocks = [];
    const list = available(S.who, S.src);
    logAdd('note', TXT.intro[S.who]);
    const box = $q('#p9t-opts'); if (!box) return;
    box.textContent = ''; box.className = 'topics pick p9t-list';
    let any = false;
    for (const t of list) {
      const done = talkedHas(t);
      const b = el('button', 'dfbtn small' + (done ? ' said' : ''), t.title); b.type = 'button';
      if (done) { b.disabled = true; b.setAttribute('aria-label', t.title + ' (' + TXT.heard + ')'); b.appendChild(el('span', 'sub', TXT.heard)); }
      else { any = true; b.onclick = () => begin(t); }
      box.appendChild(b);
    }
    if (!any) logAdd('note', TXT.nothing);
    renderLog(); setMood(null);
    $q('#p9t-back').style.display = S.origin === 'dialogue' ? '' : 'none';
    focusFirst();
  }

  function begin(t) {
    if (!t || talkedHas(t) || !S.open) return;                      // once-only: a spent topic cannot be told again
    sfx(); S.done = false;
    S.view = 'topic'; S.topic = t; S.log = []; S.pend = 0; S.pendUnlocks = []; S.lyraSaid = false; S.c = ctxOf(S.who, S.src);
    S.node = t.root(S.c);
    showNode();
  }
  function optionsOf(node) {
    const c = S.c;
    return (node.o || []).filter(o => { try { return !o.if || o.if(c); } catch (e) { return false; } }).slice(0, 3);
  }
  function showNode() {
    const node = S.node; addLines(node.s);
    renderNode();
  }
  function renderNode(mood) {
    const node = S.node, box = $q('#p9t-opts'); if (!box) return;
    box.textContent = ''; box.className = 'topics wide';
    renderLog(); setMood(mood !== undefined ? mood : (node.m || null));
    const bk = $q('#p9t-back'); if (bk) bk.style.display = '';
    const opts = optionsOf(node);
    if (!opts.length) { finish(); return; }
    opts.forEach((o, i) => {
      const b = el('button', 'dfbtn small', o.t); b.type = 'button'; b.dataset.k = o.k || '';
      b.onclick = () => choose(o);
      box.appendChild(b);
    });
    focusFirst();
  }
  function choose(o) {
    sfx();
    logAdd('you', o.t);
    if (typeof o.a === 'number') S.pend += o.a;
    if (o.u) S.pendUnlocks.push(o.u);
    addLines(o.r);
    if (o.n) { S.node = o.n; addLines(o.n.s); renderNode(o.m || o.n.m || null); return; }
    S.node = { s: null, o: [] }; renderNode(o.m || null);
  }

  // the topic is told: now, and only now, it is spent, the approval counted once and the unlocks given
  function finish() {
    const t = S.topic, who = S.who; if (!t || S.done) return;
    S.done = true;
    writeInt('p9t_t', talkedBits() | (1 << t.bit));
    const d = S.pend;
    if (d && has(APPROVAL_FIELD, who)) applyApproval(who, d);
    for (const u of S.pendUnlocks) giveUnlock(who, u);
    if (d > 0 && TXT.better[who]) logAdd('note', TXT.better[who]);
    else if (d < 0 && TXT.less[who]) logAdd('note', TXT.less[who]);
    if (S.pendUnlocks.some(u => u === 'rest' || u === 'chat')) logAdd('note', TXT.remember);
    renderLog();
    const box = $q('#p9t-opts'); if (!box) return;
    box.textContent = '';
    const b = el('button', 'dfbtn small', TXT.go); b.type = 'button'; b.onclick = () => { sfx(); renderList(); };
    box.appendChild(b); b.focus();
  }

  function applyApproval(who, d) {
    const before = bankOf(who), after = setBank(who, before + d);
    const got = after - before;                           // what the bank could hold; the live meter gets the same
    if (!got) return;
    try {
      if (G.party && G.party.id === who && typeof partyApproval === 'function') partyApproval(got, TXT.approves);
    } catch (e) { console.warn('companion-talk: approval failed', e); }
  }
  function giveUnlock(who, kind) {
    const key = who + ':' + kind, U = UNLOCKS[key]; if (!U) return;
    const bits = unlockBits(); if (bits & (1 << U.bit)) return;
    writeInt('p9t_u', bits | (1 << U.bit));
    try {
      if (U.title && typeof earnTitle === 'function') earnTitle(U.title);
      if (U.journal && typeof journal === 'function') journal('side', U.journal);
    } catch (e) { console.warn('companion-talk: unlock failed', e); }
  }
  const unlocked = (who, kind) => { const U = UNLOCKS[who + ':' + kind]; return !!U && !!(unlockBits() & (1 << U.bit)); };

  // ---------------------------------------------------------------- open / close
  function open(who, src, origin) {
    if (!set.on || !has(PARTNERS, who)) return false;
    if (!calm()) { try { msg(TXT.notNow, 'warn', 2200); } catch (e) { /* ignore */ } return false; }
    if (!partnerReady(who)) return false;
    injectStyle();
    S.open = true; S.who = who; S.src = src || (who === 'lyra' ? 'lyra' : who); S.origin = origin || 'party'; S.c = ctxOf(who, S.src);
    frame(); renderList(); startPad();
    return true;
  }
  function close() {
    stopPad(); S.open = false;
    try { closeModal(); } catch (e) { /* ignore */ }
    if (typeof G !== 'undefined' && G.state === 'dialogue') G.state = 'play';
    try { G.keys = {}; } catch (e) { /* ignore */ }
  }
  function back() {
    if (S.view === 'topic') { renderList(); return; }                 // a half-told topic is left unspent
    stopPad(); S.open = false;
    if (S.origin === 'dialogue' && typeof renderDialogue === 'function' && typeof DLG !== 'undefined' && DLG.npc) { G.state = 'dialogue'; renderDialogue(); return; }
    close();
  }
  function stillOpen() { return S.open && typeof G !== 'undefined' && G.openPanel === 'ctalk'; }

  function focusFirst() { try { const b = document.querySelector('#p9t-opts button:not([disabled])'); if (b) b.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  function moveFocus(dir) {
    const bs = Array.from(document.querySelectorAll('#p9t-opts button:not([disabled]), #p9t-back, #p9t-bye')).filter(b => b.offsetParent !== null || b.getClientRects().length);
    if (!bs.length) return;
    let i = bs.indexOf(document.activeElement); i = i < 0 ? 0 : (i + dir + bs.length) % bs.length; bs[i].focus();
  }

  // keyboard: digits choose, arrows move, Escape is the game's own (it closes the modal and returns to play)
  function onKey(ev) {
    if (!stillOpen()) { if (S.open) { S.open = false; stopPad(); } return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = (ev.key || '').toLowerCase();
    if (/^[1-9]$/.test(k)) {
      const bs = Array.from(document.querySelectorAll('#p9t-opts button:not([disabled])')), b = bs[+k - 1];
      if (b) { ev.preventDefault(); ev.stopPropagation(); b.click(); }
    } else if (k === 'arrowdown' || k === 'arrowright') { ev.preventDefault(); ev.stopPropagation(); moveFocus(1); }
    else if (k === 'arrowup' || k === 'arrowleft') { ev.preventDefault(); ev.stopPropagation(); moveFocus(-1); }
  }

  // controller: D-pad moves, A chooses, B goes back / out. Own edge detection (a held A from opening is ignored).
  function pads() { try { const p = navigator.getGamepads ? navigator.getGamepads() : null; if (p) for (let i = 0; i < p.length; i++) if (p[i] && p[i].connected) return p[i]; } catch (e) { /* none */ } return null; }
  function padPoll() {
    padRaf = 0; if (!stillOpen()) { S.open = false; return; }
    const gp = pads();
    if (gp) {
      const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed), edge = (i) => btn(i) && !padPrev[i];
      const ay = gp.axes[1] || 0, ax = gp.axes[0] || 0;
      const down = edge(13) || edge(15) || (ay > 0.6 && !padPrev.ay) || (ax > 0.6 && !padPrev.ax);
      const up = edge(12) || edge(14) || (ay < -0.6 && !padPrev.ay) || (ax < -0.6 && !padPrev.ax);
      if (down) moveFocus(1); else if (up) moveFocus(-1);
      else if (edge(0)) { const a = document.activeElement; if (a && a.tagName === 'BUTTON' && a.closest && a.closest('#modal-panel')) a.click(); }
      else if (edge(1) || edge(9)) { if (edge(9)) close(); else if (S.view === 'topic' && !S.done) renderList(); else back(); }
      for (let i = 0; i < 16; i++) padPrev[i] = btn(i);
      padPrev.ay = Math.abs(ay) > 0.6; padPrev.ax = Math.abs(ax) > 0.6;
    }
    if (typeof requestAnimationFrame === 'function') padRaf = requestAnimationFrame(padPoll);
  }
  function startPad() {
    stopPad(); padPrev = [];
    const gp = pads(); if (gp) { for (let i = 0; i < 16; i++) padPrev[i] = !!(gp.buttons[i] && gp.buttons[i].pressed); }
    if (typeof requestAnimationFrame === 'function') padRaf = requestAnimationFrame(padPoll);
  }
  function stopPad() { if (padRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(padRaf); padRaf = 0; }

  // ---------------------------------------------------------------- the small permanent things, as they happen
  function lyraLineText(text) {
    return lyraState('lyra') === 'silent' ? 'Lyra turns her slate to you: ' + text.toUpperCase() : 'Lyra: "' + text + '"';
  }
  function sayFromCompanion(id, text) {
    try {
      const nm = (typeof COMPANIONS !== 'undefined' && COMPANIONS[id]) ? COMPANIONS[id].name.split(' ')[0] : id;
      if (id === 'lyra') msg(lyraLineText(text), 'voice', 5500);
      else msg(nm + ': "' + text + '"', 'voice', 5500);
    } catch (e) { /* ignore */ }
  }

  // ---------------------------------------------------------------- Options row
  function syncBtn(b) { b.textContent = set.on ? 'On' : 'Off'; b.setAttribute('aria-pressed', set.on ? 'true' : 'false'); b.classList.toggle('sel', set.on); }
  function appendRows() {
    const grid = document.querySelector('#modal-panel .ctl-grid');
    if (!grid || document.getElementById('p9t-toggle')) return;
    const lab = el('span', 'gfx-label', 'Companion conversations '); lab.id = 'p9t-label';
    lab.appendChild(el('small', 'muted', 'a Talk option with your companions, when it is calm'));
    const b = el('button', 'dfbtn small'); b.id = 'p9t-toggle'; b.type = 'button'; b.setAttribute('aria-label', 'Companion conversations');
    b.onclick = () => { setOn(!set.on); syncBtn(b); };
    syncBtn(b);
    const cap = document.getElementById('rp-toggle') || document.getElementById('ac-cap');
    if (cap && cap.parentNode) { cap.insertAdjacentElement('afterend', b); cap.insertAdjacentElement('afterend', lab); }
    else { grid.appendChild(lab); grid.appendChild(b); }
  }
  function setOn(v) {
    set.on = !!v; save();
    if (!set.on && S.open) close();
    try { refreshHud(true); } catch (e) { /* ignore */ }
    return set.on;
  }

  // ---------------------------------------------------------------- entry points
  function activeId() { try { const P = G.party; return (P && P.id && has(PARTNERS, P.id) && PARTNERS[P.id].companion) ? P.id : null; } catch (e) { return null; } }
  function openActive() {
    const id = activeId(); if (!id) return false;
    return open(id, id, 'party');
  }
  let hudAt = 0;
  function refreshHud(force) {
    const hud = document.getElementById('party'); if (!hud) return;
    let b = hud.querySelector('button.pt');
    if (!set.on) { if (b) b.remove(); return; }
    const now = (typeof performance !== 'undefined') ? performance.now() : 0;
    if (!force && b && now - hudAt < 600) return;
    hudAt = now;
    const id = activeId(); if (!id) { if (b) b.style.display = 'none'; return; }
    if (!b) {
      injectStyle();
      b = el('button', 'pt', TXT.open); b.type = 'button';
      b.onclick = (ev) => { ev.stopPropagation(); if (typeof G !== 'undefined' && G.state === 'play') openActive(); };
      hud.appendChild(b);
    }
    b.style.display = '';
    b.classList.toggle('new', fresh(id, id).length > 0);
    b.setAttribute('aria-label', TXT.menuLabel);
  }

  function wire() {
    // 1. the party panel (E on your companion): one more choice
    if (typeof partyMenu === 'function') {
      const _pm = partyMenu;
      partyMenu = function () {
        const r = _pm.apply(this, arguments);
        try {
          const id = activeId();
          const list = document.querySelector('#event-panel .list');
          if (set.on && id && list && !list.querySelector('.p9t-talk')) {
            const b = el('button', 'dfbtn p9t-talk', TXT.openMenu); b.type = 'button';
            if (!calm()) { b.disabled = true; b.title = TXT.notNow; }
            b.onclick = () => { hide('#event'); G.state = 'play'; G.keys = {}; openActive(); };
            list.appendChild(b);
          }
        } catch (e) { console.warn('companion-talk: party panel failed', e); }
        return r;
      };
    }
    // 2. the party HUD
    if (typeof partyHud === 'function') {
      const _ph = partyHud;
      partyHud = function () { const r = _ph.apply(this, arguments); try { refreshHud(false); } catch (e) { /* cosmetic */ } return r; };
    }
    // 3. camp: a Talk button in the ordinary dialogue panel (it never calls the NPC's quest())
    if (typeof renderDialogue === 'function') {
      const _rd = renderDialogue;
      renderDialogue = function () {
        const r = _rd.apply(this, arguments);
        try {
          if (set.on && typeof DLG !== 'undefined' && DLG.npc && typeof NPCS !== 'undefined') {
            let who = null;
            for (const nid in NPC_TO_WHO) if (NPCS[nid] === DLG.npc) { who = NPC_TO_WHO[nid]; DLG.p9tSrc = nid; break; }
            const row = document.querySelector('#modal-panel .dlg .btns');
            if (who && partnerReady(who) && row && !document.getElementById('p9t-open')) {
              const b = el('button', 'dfbtn small', TXT.openDots); b.id = 'p9t-open'; b.type = 'button';
              const nid = DLG.p9tSrc;
              if (!calm()) { b.disabled = true; b.title = TXT.notNow; }
              b.onclick = () => { open(who, nid, 'dialogue'); };
              row.insertBefore(b, row.firstChild);
            }
          }
        } catch (e) { console.warn('companion-talk: dialogue button failed', e); }
        return r;
      };
    }
    // 4. approval: the game does not save P.approval and rebuilds G.party on every join; the bank puts back what talk earned
    const restoreMeter = () => {
      try {
        const P = G.party; if (!P || !P.id || !has(APPROVAL_FIELD, P.id)) return;
        const b = bankOf(P.id); if (b) P.approval = Math.max(0, Math.min(100, 50 + b));
      } catch (e) { /* ignore */ }
    };
    if (typeof partyJoin === 'function') {
      const _pj = partyJoin;
      partyJoin = function () { const r = _pj.apply(this, arguments); restoreMeter(); return r; };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () { const r = _rg.apply(this, arguments); restoreMeter(); try { refreshHud(true); } catch (e) { /* ignore */ } return r; };
    }
    // 5. a line at the rest fire, and a line on the road, once each, when talk has earned them
    if (typeof doRest === 'function') {
      const _dr = doRest;
      doRest = function () {
        const r = _dr.apply(this, arguments);
        try {
          const id = activeId(), P = G.party;
          if (set.on && id && unlocked(id, 'rest') && LINES.rest[id] && P.said && !P.said[id + ':talkrest']) {
            P.said[id + ':talkrest'] = true; setTimeout(() => { try { sayFromCompanion(id, LINES.rest[id]); } catch (e) { /* ignore */ } }, 900);
          }
        } catch (e) { console.warn('companion-talk: rest line failed', e); }
        return r;
      };
    }
    if (typeof partyChat === 'function') {
      const _pc = partyChat;
      partyChat = function () {
        try {
          const id = activeId(), P = G.party;
          if (set.on && id && unlocked(id, 'chat') && LINES.chat[id] && P.said && !P.said[id + ':talka'] && Math.random() < 0.5) {
            P.said[id + ':talka'] = true; sayFromCompanion(id, LINES.chat[id]); return;
          }
        } catch (e) { console.warn('companion-talk: chat line failed', e); }
        return _pc.apply(this, arguments);
      };
    }
    // 6. the Options row (installed once every script has run, so it is outermost)
    window.addEventListener('keydown', onKey, true);
  }
  function wireMenu() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { appendRows(); } catch (e) { console.warn('companion-talk: options row failed', e); }
      return r;
    };
  }

  // ---------------------------------------------------------------- catalogue for the review file and the French list
  function collect(x, out, place, lyra) {
    if (x == null) return;
    if (typeof x === 'string') { out.push({ place, en: x, lyra }); return; }
    if (Array.isArray(x)) { x.forEach(y => collect(y, out, place, lyra)); return; }
    if (typeof x === 'object') {
      if (typeof x.note === 'string') { out.push({ place, en: x.note, note: true }); return; }
      for (const k of ['sl', 'vo']) if (has(x, k)) collect(x[k], out, place, lyra);
      if (x.frag) for (const k of Object.keys(x.frag)) collect(x.frag[k], out, place, lyra);
    }
  }
  function walk(node, out, place, lyra, seen) {
    if (!node || seen.has(node)) return; seen.add(node);
    collect(node.s, out, place, lyra);
    for (const o of (node.o || [])) {
      out.push({ place, en: o.t, player: true });
      collect(o.r, out, place, lyra);
      walk(o.n, out, place, lyra, seen);
    }
  }
  function catalog() {
    const out = [], c = { lyra: 'silent', frag: 'none', heard: () => 9 };
    for (const t of TOPICS) {
      const place = t.who + ' / ' + t.title, lyra = t.who === 'lyra';
      out.push({ place, en: t.title, title: true });
      const seen = new Set();
      const roots = [t.root(c), t.root(Object.assign({}, c, { lyra: 'ruined' }))];
      // the Kaelen and Lyra topics branch on a flag: take both sides
      const f = flags(), saved = {}, keys = ['kaelen_dw_done', 'kaelen_told_now', 'lyra_voice'];
      for (const k of keys) { saved[k] = has(f, k) ? f[k] : undefined; }
      try { for (const k of keys) f[k] = true; roots.push(t.root(c)); for (const k of keys) f[k] = false; roots.push(t.root(c)); }
      finally { for (const k of keys) { if (saved[k] === undefined) delete f[k]; else f[k] = saved[k]; } }
      for (const r of roots) walk(r, out, place, lyra, seen);
    }
    for (const w of WHO) out.push({ place: w + ' / the panel', en: TXT.intro[w] });
    for (const k of ['nothing', 'slate', 'ruined', 'remember', 'approves', 'open', 'openDots', 'openMenu', 'notNow', 'heard', 'back', 'leave', 'go', 'menuLabel']) out.push({ place: 'the panel', en: TXT[k] });
    for (const k of Object.keys(TXT.better)) { out.push({ place: k + ' / the panel', en: TXT.better[k] }); out.push({ place: k + ' / the panel', en: TXT.less[k] }); }
    for (const k of Object.keys(LINES.rest)) out.push({ place: k + ' / at the rest fire', en: LINES.rest[k], lyra: k === 'lyra', line: true });
    for (const k of Object.keys(LINES.chat)) out.push({ place: k + ' / on the road', en: LINES.chat[k], lyra: k === 'lyra', line: true });
    for (const k of Object.keys(UNLOCKS)) { if (UNLOCKS[k].title) out.push({ place: k + ' / title', en: UNLOCKS[k].title }); if (UNLOCKS[k].journal) out.push({ place: k + ' / logbook', en: UNLOCKS[k].journal }); }
    out.push({ place: 'Options', en: 'Companion conversations' }, { place: 'Options', en: 'a Talk option with your companions, when it is calm' });
    out.push({ place: 'Lyra / state lines', en: 'Lyra turns her slate to you:' });
    return out;
  }

  load();
  try { wire(); } catch (e) { console.warn('companion-talk wiring failed', e); }
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireMenu); else wireMenu(); }

  return {
    settings: set, setOn, PARTNERS, TOPICS, UNLOCKS, LINES, TXT, NPC_TO_WHO,
    talkedBits, unlockBits, bankBits, bankOf, setBank, talkedHas, available, fresh, calm, lyraState, lyraStateFlags, ctxOf, partnerReady,
    open, close, openActive, state: S, choose, begin, renderList, unlocked, giveUnlock, applyApproval, pickLines, catalog,
    refreshHud, activeId, optionsOf, unlockText: (k) => LINES[k],
  };
})();
if (typeof window !== 'undefined') window.COMPANION_TALK = COMPANION_TALK;
