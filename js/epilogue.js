// epilogue — Phase 6 (story reactivity) module. Owned by the EPILOGUE team; see ROADMAP.md.
//
//  1. Choice-dependent Kaelen / Lyra epilogues, appended to the two Book One endings
//     ("Grab the Line" in game.js ending(), "Not Yet" in grove.js bookOneEnd()). The
//     existing paragraphs, title and buttons are never touched; the new paragraphs are
//     inserted just above the closing "Here ends ..." line.
//  2. Lore teasers for the Organum, the Iron Peaks and the Rift: nine bookshelf volumes
//     on shelves that were duplicates or dead furniture, a Lore Codex section that fills
//     in as they are read, and margin notes on the continent map.
//
//  Switch: UPG.storyEpilogues (default on). Off = the original endings, shelves, codex and map.
//  Memory: only G.flags entries starting p6e_ with boolean values (p6e_ride_k, p6e_rd_o1 ...).
//  Safety: every sentence shown comes from the constant tables below and goes in through
//  textContent. Flag values only choose between those tables; they are never printed.
//  Everything marked [PROPOSED] is invented beyond LORE_P6.md and needs the author's eye.
'use strict';

const EPILOGUE = (function () {
  if (typeof UPG !== 'undefined' && UPG.storyEpilogues === undefined) UPG.storyEpilogues = true;
  function enabled() {
    try {
      if (typeof GFX !== 'undefined' && GFX.storyEpilogues === false) return false;
      return typeof UPG === 'undefined' ? true : UPG.storyEpilogues !== false;
    } catch (e) { return false; }
  }

  // ---------------------------------------------------------------- flag reading
  // Game flags are read the way screens.js reads them (truthy). Our own flags must be exactly true or 1.
  function gf(f, k) { return !!(f && typeof f === 'object' && f[k]); }
  function own(f, k) { return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, k) && (f[k] === true || f[k] === 1)); }
  function setOwn(k) { try { if (G && G.flags && typeof G.flags === 'object') G.flags[k] = true; } catch (e) { /* ignore */ } }
  function context() {
    let charts = false, glassed = false, glass = 0, folder = false;
    try { charts = typeof G.has === 'function' && !!G.has('charts'); } catch (e) { /* ignore */ }
    try { folder = typeof G.has === 'function' && !!G.has('folder'); } catch (e) { /* ignore */ }
    try {
      const p = G.player; glassed = !!(p && p.glassed);
      glass = p && isFinite(+p.glass) ? Math.max(0, Math.min(100, +p.glass)) : 0;
    } catch (e) { /* ignore */ }
    return { charts, folder, glassed, glass };
  }

  // ---------------------------------------------------------------- epilogue prose
  // Each list is first-match-wins. A variant id is the whole of what a test needs to know.
  // [PROPOSED] throughout: the game gives these two almost no after-the-ending scenes.

  // ---- "Grab the Line" (Part Two). Lyra has no voice by Part Three's first line, so nothing here lets her speak.
  const P2_KAELEN = [
    { id: 'k2_unmet', when: (f) => !gf(f, 'kaelen_met'),
      text: 'Kaelen Vance is aboard, and you never spoke to him. The coil went into the lock without his instructions, and he has worked out the rest from the silence the bit left behind, because working out the rest is the one trade he has kept. He looks at you for a while the way he would look at a gauge that had read true by accident. "Whoever sent you was either very good or very lucky," he says. He does not say which he would prefer.' },
    { id: 'k2_charts', when: (f, c) => c.charts,
      text: 'Revision Seven made her the fuse, and Kaelen wrote the method Revision Seven improved, and the arithmetic of it is on his face. He sits with his back to the rail so that nobody has to look at him, and the glass hand taps one low note on the boards, over and over, the Root note, as low as the arm will go. He does not know he is doing it. You do not tell him.' },
    { id: 'k2_glass_deep', when: (f, c) => c.glassed && c.glass >= 70,
      text: 'He looks at your tideline once, past the collarbone, and then looks away, which is the first time you have seen him look away from a measurement. "Weeks," he says. Not months. "It follows pain. Stop paying it." He says it flatly, like a load figure. Then he sits down beside you on the deck, close enough that the two glasses can hear each other, and neither of you says what that sounds like.' },
    { id: 'k2_glass', when: (f, c) => c.glassed,
      text: 'He looks at your tideline once, and then at his own hand, and then at the Hedge going away under the keel. "It follows pain," he says. "The old hurts go first. Whatever you were going to do with that arm, do less of it." It is as near as Kaelen comes to asking anyone to be careful. He does not mention the Foundry. The glass hand rings, faintly, all the way up into the cloud.' },
    { id: 'k2_plain', when: () => true,
      text: 'Kaelen sits on a coil of the mooring line with the glass hand across his knees, listening to the Root through it: a lullaby with a hole where the tune keeps slipping. You broke the bore with a coil he specified, and he knows exactly where that sum ends up, and who will be sent the bill. "Hearthday," he says, to the deck. "I told you my hands would shake. I did not say for how long."' },
  ];
  const P2_KAELEN_SUFFIX = [
    { id: 'k2_h_answered', when: (f) => gf(f, 'hedge_answered'), text: 'He does not ask what you said to the Hedge. He lived outside it for years, and he knows what an answer sounds like from the far side.' },
    { id: 'k2_h_silent', when: (f) => gf(f, 'hedge_silent'), text: 'He asks one thing about the Hedge: whether you answered it. You say no. He nods, like a man handed a tool in good repair.' },
    { id: 'k2_h_listened', when: (f) => gf(f, 'hedge_listened'), text: 'He asks whether you listened to the Hedge. You did. "Everyone does," he says. "Do not do it twice."' },
  ];
  const P2_LYRA = [
    { id: 'l2_blade', when: (f) => gf(f, 'tobin_417_done'),
      text: 'Lyra asks to hold her father\'s tuning-blade. She does not draw it. She lays her palm along the bronze, and the 174 comes up through the sheath, and she stays that way until the rope stops swinging. She has not said a word since the casing. She hands the blade back with both hands, and gives you the look of a woman who would like to say a great deal and has been told by her own throat to wait.' },
    { id: 'l2_orla_pim', when: (f) => gf(f, 'boots_delivered') && gf(f, 'pim_safe'),
      text: 'Lyra hummed a mill-boy\'s hands clean, and sang the falling fifth against a bore, and sang Orla Hale down proper after it, and a Cantor\'s voice is a thing you spend, like lamp oil. She sits at the rail counting children by touch, one hand on each small head as it comes over, and has not said a word since the casing. She is not saying it was worth it. She is counting.' },
    { id: 'l2_boots', when: (f) => gf(f, 'boots_delivered'),
      text: 'She sang the falling fifth against the bore, and then she sang Orla Hale down with what was left. It is the second time in a day she has given the last of herself to something, and the second time she has been asked to be glad of it. On the Kestrel she does not speak. She mouths Orla\'s fourth line, line by line, to see whether it is still there. It is. The voice is not.' },
    { id: 'l2_pim_tended', when: (f) => gf(f, 'pim_safe') && gf(f, 'pim_tended'),
      text: 'Lyra watches the Carder boy come over the rail with his hands wrapped in his mother\'s apron. She hummed the roots back under his skin once, and you did it a second time, differently from her. She noticed. She was not hurt by it, and she was, a little, and she has no voice left to say either. She looks at his palms, and then she lets the next child\'s hand slide through hers.' },
    { id: 'l2_pim', when: (f) => gf(f, 'pim_safe'),
      text: 'Lyra watches the Carder boy come over the rail with his hands wrapped in his mother\'s apron. She hummed the roots back under his skin once. She cannot do it again, for him or for anyone, and she knows there will be other boys in other mills. She looks at his palms, and then she looks away, and lets the next child\'s hand slide through hers. There is nothing left in her to say it with.' },
    { id: 'l2_plain', when: () => true,
      text: 'Lyra has not spoken since the casing. She sits against the foremast with her hands open on her knees, as if she might be handed something, and watches the town go small. Three hundred and eighty people are waving. She lifts one hand, once, and lets it fall. A Cantor is supposed to sing a place out. The Reach did not get that. It got the rope.' },
  ];
  const P2_LYRA_SUFFIX = [
    { id: 'l2_h_answered', when: (f) => gf(f, 'hedge_answered'), text: 'The patch of quiet where the thing wearing your voice burst is behind her now. She looks at it for a long time, with the face of someone who knows the sound it is not making.' },
    { id: 'l2_h_silent', when: (f) => gf(f, 'hedge_silent'), text: 'Somewhere in the mist the Hedge is still trying her voice on the town. She knows it. She watches the thorn for as long as there is thorn.' },
  ];

  // ---- "Not Yet" (Book One, after Part Four). Mostly Part Four's choices; the Part Four companion flags are ours.
  const B1_KAELEN = [
    { id: 'kb_told_with', when: (f) => (gf(f, 'folder_given') || gf(f, 'kaelen_told_now')) && own(f, 'p6e_ride_k'),
      text: 'You walked the Deep Woods with him, and you know now what he sounds like when the arm is bad: one low note through his teeth, the Root, and a stop when he hears himself. Telling Lyra did not end the humming. It made it his own. He sleeps on the near side of the fire now, where she can see him, and nobody has caught him facing away since.' },
    { id: 'kb_told', when: (f) => gf(f, 'folder_given') || gf(f, 'kaelen_told_now'),
      text: 'He has said it all out loud, once, to the one person it was owed to, and nothing has been mended. He thought it would feel like putting down a load. It feels like being seen carrying one. He still takes the first watch, and the worst one. Lyra lets him, and takes the next, and neither of them mentions the arrangement.' },
    { id: 'kb_kept', when: (f, c) => c.folder || gf(f, 'folder_kept'),
      text: 'Kaelen has not asked about the folder again. He watches you the way he used to watch a gauge he trusted and could not read. If you gave it to him he would carry it, and he knows that, and you know that, and for now it stays in your shirt. The glass hand taps the rail whenever a note is wrong, and has tapped for days.' },
    { id: 'kb_none', when: () => true,
      text: 'Kaelen has never seen what the Arbiterium wrote about him, and still he keeps the beam like a ledger he owes. He counts what he can: the presses he specified, the bores he tuned, one morning at a Foundry. It does not come out. He does not stop. Whatever he did not do in Whisper-Grove, he will go on paying for in small coin, one name a day.' },
  ];
  const B1_KAELEN_SUFFIX = [
    { id: 'kb_s_down', when: (f) => own(f, 'p6e_down_k'), text: 'He went down in the moss once, and you got him back to the fire. He has not mentioned it, and has started leaving the glass hand where you can reach it.' },
    { id: 'kb_s_hurt', when: (f) => own(f, 'p6e_hurt_k'), text: 'You heard the arm ring when he was hurt, out in the woods. He pretended it was not ringing. So did you.' },
    { id: 'kb_s_ride', when: (f, c, base) => own(f, 'p6e_ride_k') && base !== 'kb_told_with', text: 'You walked the Deep Woods with him, and he put himself between you and every hound without once saying why.' },
  ];
  const B1_LYRA = [
    { id: 'lb_you_sang', when: (f) => gf(f, 'coda_done') && gf(f, 'coda_by_you'),
      text: 'You sang the coda she could not, and she heard every bar of it from the choir door with her mouth shut. She does not resent it. She says so twice, which is how you know. A Cantor who has been sung for has been given something that cannot be handed back, and she keeps a ledger of those too.' },
    { id: 'lb_sang_wearer', when: (f) => gf(f, 'coda_done') && gf(f, 'wearer_coda_dead'),
      text: 'Lyra sang eight bars of her father\'s funeral office in harmony with the thing that ate him, and then sang the coda alone. She has not sung it since. At the fire she hums something else, anything else, a skipping-rhyme, a reed-orchard drone, with the care of a woman walking past a grave on the wrong side. Tobin Ashgrove got his office sung to him, properly, once. It was not the one he was owed.' },
    { id: 'lb_sang_req', when: (f) => gf(f, 'coda_done'),
      text: 'Lyra sang the coda against the Requiem, and three hundred years of funeral offices came out of it sung properly, and for the length of one hymn she was exactly what she was trained to be. It cost her what was left of her voice. She talks in chalk now, in capitals, and makes every word earn its place on the wall.' },
    { id: 'lb_pending', when: (f) => gf(f, 'part4'),
      text: 'The Mausoleum is still singing to itself, a mile north, and Lyra faces it the way you face a debt that has been politely deferred. She has her father\'s office in her mouth and nowhere to put it. At night she hums the Root under her breath so that the woods will know a Cantor is still in them.' },
    { id: 'lb_p3', when: () => true,
      text: 'Lyra\'s voice is a ruin, and a ruin is not nothing. At night she hums the response to Sable\'s count under her breath, so that the Bound Ledger is never read to the dark in silence. Whether the Cantor of the Living Chord can sing again is a question for a later place. She does not ask it aloud.' },
  ];
  const B1_LYRA_SUFFIX = [
    { id: 'lb_s_tend', when: (f) => own(f, 'p6e_tend_l'), text: 'When you were bleeding in the moss she sang the tending note low and laid a hand flat over the wound. "Don\'t thank me for the healing," she said. "Thank me when we\'re all home." You are not home. You thanked her anyway.' },
    { id: 'lb_s_wren', when: (f) => gf(f, 'wren_saved'), text: 'Linnet sits at her elbow and sings the skipping-rhyme too loud, and Lyra lets her. Somebody has to be taught what the Reach was.' },
    { id: 'lb_s_taken', when: (f) => gf(f, 'wren_taken'), text: 'She asked once about the girl in the north-west, and you told her. She nodded, and did not ask again, and hummed the skipping-rhyme for the rest of the night the way you hum for the ones you are not allowed to name.' },
    { id: 'lb_s_down', when: (f) => own(f, 'p6e_down_l'), text: 'She went down in the moss once and you got her back to the fire. She laughs about it now. It is the wrong kind of laugh.' },
    { id: 'lb_s_ride', when: (f) => own(f, 'p6e_ride_l'), text: 'You walked the Deep Woods with her. When the Hush came near she hummed, and it came no nearer. She has never asked you to thank her for it.' },
    { id: 'lb_s_blade', when: (f) => gf(f, 'tobin_417_done'), text: 'Her father\'s tuning-blade rides on your belt. She has not asked for it back. She looks at it every night.' },
  ];

  const TABLE = {
    p2: { kaelen: { base: P2_KAELEN, suffix: P2_KAELEN_SUFFIX, max: 1 }, lyra: { base: P2_LYRA, suffix: P2_LYRA_SUFFIX, max: 1 } },
    b1: { kaelen: { base: B1_KAELEN, suffix: B1_KAELEN_SUFFIX, max: 1 }, lyra: { base: B1_LYRA, suffix: B1_LYRA_SUFFIX, max: 2 } },
  };

  // pure: which variant, and which sentences, for these flags. Tests call this directly.
  function pick(kind, who, f, c) {
    const T = TABLE[kind] && TABLE[kind][who]; if (!T) return null;
    c = c || context();
    const base = T.base.find(v => { try { return v.when(f, c); } catch (e) { return false; } });
    if (!base) return null;
    const suf = T.suffix.filter(s => { try { return s.when(f, c, base.id); } catch (e) { return false; } }).slice(0, T.max);
    return { id: base.id, suffixes: suf.map(s => s.id), text: [base.text].concat(suf.map(s => s.text)).join(' ') };
  }

  function addToEnding(kind) {
    const box = document.getElementById('ending-text'); if (!box) return [];
    for (const old of box.querySelectorAll('.p6e-epi')) old.remove();
    const f = G.flags, c = context(), out = [];
    const last = box.lastElementChild, anchor = last && last.querySelector && last.querySelector('.muted') ? last : null;
    for (const who of ['kaelen', 'lyra']) {
      const r = pick(kind, who, f, c); if (!r) continue;
      const p = document.createElement('p');
      p.className = 'p6e-epi' + (out.length ? '' : ' p6e-first');
      p.dataset.p6e = r.id;
      p.textContent = r.text;
      box.insertBefore(p, anchor);
      out.push(r.id);
    }
    return out;
  }

  // ---------------------------------------------------------------- lore teasers
  // Nine volumes. kind/style feed js/reading.js's held-document sheet (READING.SOURCES).
  const BASE = 1000;  // shelf bookIdx values we own: BASE + index into VOLUMES
  const VOLUMES = [
    { id: 'o_memo', region: 'o', title: 'Memorandum: Registry Square, Revised Hours', style: 'office', kind: 'Memorandum', map: 'quarry', ord: 0,
      text: 'From the Clerk of Intake, Registry Square, to the Under-Registrar (Consignments). Re: the hour.<br><br>The city has played the hour every hour since the Edict, and the Registry windows have been reglazed twice at the Office\'s expense. Staff are reminded that the sound is a chord and not a disturbance, and that complaints concerning it are processed under Acoustic Echo Artifacting. The coffee stall in the Square remains sixty years old and unaffected. The Hall of Carriage does not appear on the public plan and should not be asked after at the counter.<br><br>Consignments were received in good order. Names were reconciled.' },
    { id: 'o_notice', region: 'o', title: 'Notice to Visitors: The Hour', style: 'office', kind: 'Notice', map: 'greenhall', ord: 1,
      text: 'Visitors to the Organum are reminded that the city plays the hour, and that the hour will be played.<br><br>On the day the Edict of Symmetry was proclaimed the city played for nine hours. No visitor with proper arrangements was inconvenienced. The sound carries thirty miles. Visitors arriving from the west may find that their reeds do not answer it; this is normal. Visitors who find that their reeds do answer it are asked to report to the nearest window.<br><br>The Organum thanks you for your patience and your attention.' },
    { id: 'o_leaf', region: 'o', title: 'A Torn Leaf from the Conservatory Table', style: 'parch', kind: 'Fragment', map: 'malting', ord: 2,
      text: 'A single leaf, torn from a Conservatory copy of the Long Octave, and pressed flat. The table of pitches runs down the page and stops at 852.<br><br>Below it, in different ink and a different century: <i>Eight is not the octave. Count again.</i><br><br>Below that, smaller, in a hand that shook: <i>The ninth is not stone.</i><br><br>Somebody has tried to scrape the last line away with a knife, and given up, or been interrupted. The parchment keeps the ghost of the scratch. Held to the ear it hums, very faintly, although it is only paper.' },
    { id: 'p_letter', region: 'p', title: 'Letter Home from Bastion Fortis', style: 'paper', kind: 'Letter', map: 'greenhall', ord: 2,
      text: 'Mam,<br><br>Rota holds. I have the third bell on the Spine wall again, which is the cold one. Black bread is black, salt mutton is salt, and the mist pulls my buckle sideways if I forget to leave it off. Sergeant says a man\'s word weighs what he has kept of it. I have kept most.<br><br>At muster they asked if I was heavy and I said heavy enough, same as Da. Nobody has taken the Bastion in my lifetime. Nobody has won anything either. Keep the stew on. I will be down by the thaw if the rota lets go of me.<br><br>Brannoch' },
    { id: 'p_order', region: 'p', title: 'Harness Order for the Compact of Stone', style: 'paper', kind: 'Order', map: 'tannery', ord: 0,
      text: 'Item: forty hides, tanned to a weight. The Quartermaster of the Compact asks that no hide be sent that cannot hold a buckle in the mist.<br><br>Item: lodestone cores for three keels, Fortis-cut, as every core in every skyship is, to be collected from the Vaults by a man whose word has mass. The Compact does not accept a note from anyone it has not heard stand.<br><br>Payment in coin, or in work, and not in promises. A promise weighs nothing until it has been kept.' },
    { id: 'p_compact', region: 'p', title: 'The Compact of Stone: A Plain Account', style: 'paper', kind: 'Pamphlet', map: 'malting', ord: 3,
      text: 'The Compact of Stone is a standing army that elects its own command. It has held the Titan\'s Spine since before the Silencing. Fortis has never been conquered and has never won anything, and the Compact does not regard these as two separate facts.<br><br>Growth sounds at 174 and Mass at 396, and a fifth apart is the most stable interval there is. Oakhaven and Fortis have never gone to war. The Compact does not call this friendship. It calls it a fifth, and expects it to hold.' },
    { id: 'r_line', region: 'r', title: 'Line-talk, Null-Watch, Third Dog Watch', style: 'office', kind: 'Transcript', map: 'malting', ord: 1,
      text: '<i>Rampart Two, lead battery, patrol of four. Taken down from the speaking-tube by the relief clerk.</i><br><br>...and she said the bees would know, and I said bees don\'t know, and she said that is what the last one said. Go on, Tam.<br>I am going on. What was the,<br>The bees.<br>Right. The bees. Your turn, Orrin.<br>My turn. I had a cat. I had a cat called,<br>Orrin.<br>Called Mustard. Sorry. Lost the end of it. Talk to me.<br>I am talking. Dawn gun in forty.<br><br><i>Patrol relieved at the bell. Four went out. The clerk has written four.</i>' },
    { id: 'r_baskets', region: 'r', title: 'Basket Log, the Rift Winch-house', style: 'paper', kind: 'Logbook', map: 'wickhouse', ord: 0,
      text: 'Basket 212. Lowered at dawn, after the gun. Came up at dusk. Contents: the basket, the rope, one boot, laced.<br><br>The Rift opened in 413 and baskets have gone down for six years. We do not write what we send them for.<br><br>Note for the day: winch quiet, which is not usual. Note corrected: the winch was loud. I could not hear it. The gun fired at dawn. The gun fires at dawn.' },
    { id: 'r_lowered', region: 'r', title: 'Order of Service for Those Lowered', style: 'paper', kind: 'Order of service', map: 'mausoleum', ord: 0,
      text: 'For those who went down the Rift and whom nobody could bury.<br><br>The Cantor sings the response, because there is no body to sing over. The name is spoken. The garrison returns the response from the lead ramparts at dawn, over the gun. If no answer comes, the name is spoken again. It is spoken again.<br><br><i>Since Memory was silenced no one has been certain the response arrives. It is sung regardless.</i>' },
  ];
  const REGIONS = {
    o: { name: 'The Organum' }, p: { name: 'The Iron Peaks' }, r: { name: 'The Rift' },
  };
  // Lore Codex section: one stub per region, shown once any of its volumes has been read.
  const CODEX = [
    { region: 'o', title: 'The Organum (hearsay)', text: 'A seat, not a realm. Travellers from the east say it looks like a tax office, with brass plates and a coffee stall, and that its towers are pipes, and that when the wind is right the whole city sounds one low chord. The Keynote is said to lie beneath it, where the eight roots meet.' },
    { region: 'p', title: 'Bastion Fortis (hearsay)', text: 'A fortress cut into the Titan\'s Spine above the Lodestone Vaults. The people are dour, literal and decent, and treat weight as a moral category. The greeting is "You\'re heavy?" and the answer is "Heavy enough." Every skyship\'s lodestone core is Fortis-cut. They keep the longest unbroken watch-rota in history.' },
    { region: 'r', title: 'Null-Watch and the Rift (hearsay)', text: 'Where the continent ends: an abyssal divide opened in 413, and a garrison on lead ramparts firing dampening cannons at every dawn. Patrols are made to talk without pause, because silence invites the Quiet. Talking is how you keep each other. Baskets have gone down for six years.' },
  ];
  // Margin notes on the continent map, in the hands of whoever drew on their copy. The second shows once a volume of that region is read.
  const MARGIN = {
    organum: [
      'In pencil, by the Organum: "Thirty miles, they say, you can hear it play the hour. Nobody in the Reach has tried to listen."',
      'Under it, in ink: "Registry Square. Grey buildings, brass plates, a coffee stall. Do not be taken in by the stall."',
    ],
    peaks: [
      'Along the Spine, a carter\'s scrawl: "Leave your buckles at the foot. The mist takes metal sideways."',
      'Beneath: "Longest watch-rota in history. Nobody remembers who set it."',
    ],
    rift: [
      'At the right-hand edge, where the paint stops, in pencil: "Keep talking."',
      'A dawn gun, drawn very small, and a column of tally strokes, one for every dawn since 413. The strokes run off the edge of the page.',
    ],
  };
  const MARGIN_REGION = { organum: 'o', peaks: 'p', rift: 'r' };

  const RD = (v) => 'p6e_rd_' + v.id;
  function volumeAt(idx) {
    if (!Number.isInteger(idx) || idx < BASE || idx >= BASE + VOLUMES.length) return null;
    return VOLUMES[idx - BASE];
  }
  function regionRead(region) {
    const f = (typeof G !== 'undefined' && G.flags) || {};
    return VOLUMES.some(v => v.region === region && own(f, RD(v)));
  }
  function readVolume(v) {
    setOwn(RD(v));
    showEvent(v.title, v.text, [{ t: 'Close it.', f: null }]);
  }

  // held-document sheets for our titles (js/reading.js); the normal panel when held documents are off
  if (typeof READING !== 'undefined' && READING.SOURCES) for (const v of VOLUMES) READING.SOURCES[v.title] = { style: v.style, kind: v.kind };

  // shelves: duplicate or dead bookshelves get a volume; originals keep their book. Idempotent, and
  // restores the shelf if the switch is turned off later. Never saved: loadMap runs it again.
  function applyShelves(map, id) {
    if (!map || !Array.isArray(map.entities)) return 0;
    let ord = 0, n = 0;
    const on = enabled();
    for (const e of map.entities) {
      if (!e || e.sprite !== 'shelf') continue;
      const here = ord++;
      if (e._p6eOrig && !on) { e.use = e._p6eOrig.use; e.bookIdx = e._p6eOrig.bookIdx; e.label = e._p6eOrig.label; delete e._p6eOrig; continue; }
      if (!on) continue;
      const k = VOLUMES.findIndex(v => v.map === id && v.ord === here);
      if (k < 0) continue;
      if (!e._p6eOrig) e._p6eOrig = { use: e.use, bookIdx: e.bookIdx, label: e.label };
      e.use = 'lore_shelf'; e.bookIdx = BASE + k; e.label = 'Bookshelf: "' + VOLUMES[k].title + '"'; n++;
    }
    return n;
  }

  // ---------------------------------------------------------------- wrappers
  function wrap(name, make) {
    try { if (typeof globalThis[name] !== 'function') return; const orig = globalThis[name]; globalThis[name] = make(orig); } catch (e) { console.warn('epilogue: could not wrap ' + name, e); }
  }

  // endings
  wrap('ending', (orig) => function () {
    const was = typeof G !== 'undefined' && G.state === 'ending';
    const r = orig.apply(this, arguments);
    try { if (!was && enabled()) addToEnding('p2'); } catch (e) { console.warn('epilogue: ending text failed', e); }
    return r;
  });
  wrap('bookOneEnd', (orig) => function () {
    const was = typeof G !== 'undefined' && G.state === 'ending';
    const r = orig.apply(this, arguments);
    try { if (!was && enabled()) addToEnding('b1'); } catch (e) { console.warn('epilogue: ending text failed', e); }
    return r;
  });

  // Part Four companion memory (G.party itself is not saved)
  wrap('partyJoin', (orig) => function (id) {
    const r = orig.apply(this, arguments);
    try { if (enabled()) { if (id === 'kaelen') setOwn('p6e_ride_k'); else if (id === 'lyra') setOwn('p6e_ride_l'); } } catch (e) { /* ignore */ }
    return r;
  });
  wrap('partyDowned', (orig) => function () {
    try { const id = G.party && G.party.id; if (enabled()) { if (id === 'kaelen') setOwn('p6e_down_k'); else if (id === 'lyra') setOwn('p6e_down_l'); } } catch (e) { /* ignore */ }
    return orig.apply(this, arguments);
  });
  wrap('partyBark', (orig) => function (key) {
    try {
      const id = G.party && G.party.id;
      if (enabled()) { if (id === 'kaelen' && key === 'selfhurt') setOwn('p6e_hurt_k'); else if (id === 'lyra' && key === 'hurt') setOwn('p6e_tend_l'); }
    } catch (e) { /* ignore */ }
    return orig.apply(this, arguments);
  });

  // shelves and volumes
  wrap('loadMap', (orig) => function (id) {
    const r = orig.apply(this, arguments);
    try { if (typeof G !== 'undefined' && G.maps && G.maps[id]) applyShelves(G.maps[id], id); } catch (e) { console.warn('epilogue: shelves failed', e); }
    return r;
  });
  wrap('readLoreBook', (orig) => function (idx) {
    const v = enabled() ? volumeAt(idx) : null;
    if (v) { readVolume(v); return; }
    return orig.apply(this, arguments);
  });

  // Lore Codex: a section under the collected volumes
  wrap('renderCodexModal', (orig) => function (tab) {
    const r = orig.apply(this, arguments);
    try {
      if (!enabled() || (tab || 'bestiary') !== 'codex') return r;
      const panel = document.getElementById('modal-panel'), box = panel && panel.querySelector('div[style*="overflow-y"]'); if (!box) return r;
      const head = document.createElement('h3'); head.className = 'p6e-codex'; head.textContent = 'Heard beyond the Reach'; box.appendChild(head);
      let shown = 0;
      for (const c of CODEX) {
        if (!regionRead(c.region)) continue;
        const d = document.createElement('div'); d.className = 'slot p6e-codex'; d.style.display = 'block'; d.style.marginBottom = '.4cqh';
        const b = document.createElement('b'); b.style.color = 'var(--gold)'; b.textContent = c.title;
        d.appendChild(b); d.appendChild(document.createElement('br'));
        const s = document.createElement('small'); s.textContent = c.text; d.appendChild(s); box.appendChild(d); shown++;
      }
      if (!shown) { const m = document.createElement('p'); m.className = 'muted p6e-codex'; m.textContent = 'Nothing yet. The shelves of the Reach and the Woods keep odd papers; some of them were written a long way east.'; box.appendChild(m); }
    } catch (e) { console.warn('epilogue: codex failed', e); }
    return r;
  });

  // World map: margin notes beside the three realms that are not in this book
  wrap('travelInfo', (orig) => function (item) {
    const r = orig.apply(this, arguments);
    try {
      if (!enabled() || typeof TRAVEL === 'undefined' || TRAVEL.view !== 'continent') return r;
      const h = item || TRAVEL.hover, el = document.getElementById('tvinfo');
      if (!h || !el || !MARGIN[h.id]) return r;
      const notes = MARGIN[h.id], show = regionRead(MARGIN_REGION[h.id]) ? notes : notes.slice(0, 1);
      for (const t of show) { const p = document.createElement('span'); p.className = 'p6e-margin'; p.textContent = t; el.appendChild(p); }
    } catch (e) { console.warn('epilogue: margin note failed', e); }
    return r;
  });

  const css = document.createElement('style'); css.id = 'epilogue-style';
  css.textContent = `
#ending-text .p6e-epi { margin-top: 1.1cqh; }
#ending-text .p6e-epi.p6e-first { margin-top: 2cqh; padding-top: 1.4cqh; border-top: 1px solid rgba(217,164,65,.35); }
.p6e-margin { display: block; margin-top: .8cqh; font-style: italic; color: #d9c58a; font-size: .92em; }
`;
  document.head.appendChild(css);

  return { enabled, pick, context, addToEnding, applyShelves, volumeAt, regionRead, readVolume, TABLE, VOLUMES, CODEX, MARGIN, BASE, REGIONS };
})();
