# Phase 28 — Release road R3: the Narrow comes home

*Recorded 29 Oct 2026 from the game's translation files (`tools/i18n/`), which hold every new player-facing line the phase added, in English with its French. Lines split at markup appear as fragments. Where a line is marked [PROPOSED] in the game or here, it is invention that has not been ruled on.*

## What is new, in short

R3 made Book One's rule, "too loud brings the hounds, too still brings the Hush", into law and systems. Inside the Hedge, witnesses answer loudness with the ward-sign, and a second breach is "a breach of the Narrow", fined. Hush-lamps keep the Hush off, and a hush-whistle can be staked in the ground to pipe as a lamp for a minute. Songs are learned from people: Lyra (the Root note), Bettany (the tending breath, for eighteen), Old Tam (The Miller's Daughter, a new loud lure song) and Tobin's reed-pipes (the falling fifth). The Listening Hour came to Oakhaven with Godwin Pettigrew the lamplighter, night-hummers at three crossings and the dead-hour call "all's well, all's quiet, keep to the Narrow". It also added hound packs with a leader, the canon combat rules (fear is loud, Quiets go to lanterns, a burst hound leaves a dead patch), and the Concordance as unseen faction standing.

*Built 27 Oct; commits 95ed37b, 0fd82c2; PR #67.*

## Every line

### The Narrow

Source: `tools/i18n/p28-narrow.tsv` (66 lines).

*Release road R3, "The Narrow comes home": js/narrow28.js (NARROW28.TEXTS) and party.js (Lyra's voiceless kit). English<TAB>French. Merged into locales/story/fr.json; strings with {0} go to the patterns.*

| # | English | French |
|---|---|---|
| 1 | You push the hush-whistle into the ground on its stake. It pipes on by itself, thin and high: for a minute, this is a lamp. | Vous enfoncez le sifflet de veilleuse dans le sol, sur son piquet. Il continue de siffler tout seul, mince et aigu : pendant une minute, c'est une veilleuse. |
| 2 | The planted whistle runs out of breath and stops. | Le sifflet planté s'essouffle et se tait. |
| 3 | The hush-lamp's thin whistle keeps the stillness off you. | Le mince sifflet de la veilleuse tient l'immobilité à distance. |
| 4 | {0} makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow." | {0} vous fait le signe de garde : deux doigts aux lèvres, puis à l'oreille. Bouche close, oreilles ouvertes. « Restez dans l'Étroit. » |
| 5 | A man across the lane makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow," he breathes. | Un homme, de l'autre côté de la ruelle, vous fait le signe de garde : deux doigts aux lèvres, puis à l'oreille. Bouche close, oreilles ouvertes. « Restez dans l'Étroit », souffle-t-il. |
| 6 | A woman in a doorway makes the ward-sign at you: two fingers to the lips, then to the ear. Mouth shut, ears open. "Keep to the Narrow," she breathes. | Une femme, sur le pas d'une porte, vous fait le signe de garde : deux doigts aux lèvres, puis à l'oreille. Bouche close, oreilles ouvertes. « Restez dans l'Étroit », souffle-t-elle. |
| 7 | Twice now, above the Narrow. Somebody has gone for the watch. | Deux fois déjà, au-dessus de l'Étroit. Quelqu'un est allé chercher le guet. |
| 8 | a breach of the Narrow | une infraction à l'Étroit |
| 9 | You sing The Miller's Daughter, loud and badly, far above the Narrow, the way Old Tam taught you. Every hound in hearing turns toward the place you are singing from. | Vous chantez La Fille du meunier, fort et faux, bien au-dessus de l'Étroit, comme le vieux Tam vous l'a appris. Chaque chien à portée d'oreille se tourne vers l'endroit d'où vous chantez. |
| 10 | You sing The Miller's Daughter, loud and badly, far above the Narrow. Nothing is near enough to come. Something further off may be. | Vous chantez La Fille du meunier, fort et faux, bien au-dessus de l'Étroit. Rien n'est assez proche pour venir. Quelque chose de plus lointain, peut-être. |
| 11 | The song is gone from the air. The hounds mill about where it was. | Le chant s'est dissipé dans l'air. Les chiens tournent en rond là où il était. |
| 12 | The leader breaks off with a sound like tearing silk, and the whole pack goes with it. | Le meneur rompt avec un bruit de soie qu'on déchire, et toute la meute le suit. |
| 13 | Fear is loud. Your breath comes ragged, and anything listening can hear it. | La peur est bruyante. Votre souffle se fait haché, et tout ce qui écoute peut l'entendre. |
| 14 | A Quiet turns toward your lantern. They go to a lit lantern, the way moths would if moths ate sound. | Un Calme se tourne vers votre lanterne. Ils vont à une lanterne allumée, comme le feraient les papillons de nuit s'ils mangeaient le son. |
| 15 | Where the hound burst, the ground has gone dead. Your footsteps stop arriving. | Là où le chien a éclaté, le sol est mort. Vos pas cessent d'arriver. |
| 16 | You sing, and the sound stops at your lips. Where the hound burst, nothing carries. | Vous chantez, et le son s'arrête à vos lèvres. Là où le chien a éclaté, rien ne porte. |
| 17 | The Listening Hour comes down on Oakhaven the way it always does: with lamplight, and the sound of people closing doors softly. | L'Heure d'écoute descend sur Oakhaven comme toujours : avec la lumière des veilleuses, et le bruit des gens qui ferment doucement leurs portes. |
| 18 | At the crossing a night-hummer sits on a stool in a shawl, humming under her breath, so that no street in Oakhaven falls wholly silent. | Au carrefour, une fredonneuse de nuit est assise sur un tabouret, dans un châle, et fredonne à mi-voix, pour qu'aucune rue d'Oakhaven ne tombe jamais tout à fait dans le silence. |
| 19 | At the crossings the night-hummers change, stools shuffling, and the murmur goes down the lanes: all's well, all's quiet, keep to the Narrow. It is the dead hour. | Aux carrefours, les fredonneurs de nuit se relaient, les tabourets raclent, et le murmure descend les ruelles : tout va bien, tout est calme, restez dans l'Étroit. C'est l'heure morte. |
| 20 | Learn a song… | Apprendre un chant… |
| 21 | A gift | Un cadeau |
| 22 | You know it already. | Vous le connaissez déjà. |
| 23 | Will you teach me? | Vous voulez bien me l'apprendre ? |
| 24 | Harrow looks at you a moment longer than he needs to. "People speak well of you inside the Hedge. I hear things at the gate. Go careful." | Harrow vous regarde un instant de plus que nécessaire. « On dit du bien de vous, dans la Haie. J'entends des choses, à la porte. Allez prudemment. » |
| 25 | Harrow opens the gate no wider than he must. "The Hedge talks, and it has been talking about you. Whatever you are doing, do it quieter." | Harrow n'ouvre pas la porte plus que nécessaire. « La Haie parle, et elle parle de vous. Quoi que vous fassiez, faites-le plus bas. » |
| 26 | Hetty slides a cup across before you ask. "On the house. Word gets round the Boar. Folk say you are one of ours now." | Hetty fait glisser une tasse vers vous avant que vous ne demandiez. « C'est la maison qui offre. Les nouvelles circulent, au Sanglier. Les gens disent que vous êtes des nôtres, maintenant. » |
| 27 | Hetty wipes the same patch of bar twice. "Folk are talking, and not kindly. Pay first, if you would." | Hetty essuie deux fois le même coin de comptoir. « Les gens parlent, et pas en bien. Payez d'abord, si vous voulez bien. » |
| 28 | Inside the Hedge they will tell it for years: a stranger who kept to the Narrow when it mattered, and broke it only when it mattered more. | Dans la Haie, on le racontera pendant des années : quelqu'un d'étranger, qui est resté dans l'Étroit quand cela comptait, et n'en est sorti que quand cela comptait davantage. |
| 29 | In Oakhaven, afterward, nobody said your name above a murmur, and nobody said it kindly. | À Oakhaven, ensuite, personne ne prononça votre nom plus haut qu'un murmure, et personne ne le prononça avec bienveillance. |
| 30 | The Miller's Daughter | La Fille du meunier |
| 31 | Old Tam's song, sung loud and badly, far above the Narrow. Every hound in hearing goes to where you sang it, not to you, for a little while. It is the opposite of hiding. | La chanson du vieux Tam, chantée fort et faux, bien au-dessus de l'Étroit. Chaque chien à portée d'oreille va là où vous l'avez chantée, et non vers vous, pendant un moment. C'est le contraire de se cacher. |
| 32 | The Root note | La Note-racine |
| 33 | Hold the long cane's note, low and steady, until it stops being a noise and becomes a place. | Tenez la note de la longue canne, basse et égale, jusqu'à ce qu'elle cesse d'être un bruit et devienne un lieu. |
| 34 | "Father set me the long cane first. Sit. Breathe from under the ribs. I will give you the Root note, the one it keeps losing." | « Père m'a d'abord donné la longue canne. Asseyez-vous. Respirez depuis sous les côtes. Je vais vous donner la Note-racine, celle qu'elle ne cesse de perdre. » |
| 35 | "There," Lyra says, very low. "That is the note. Keep it in your chest; it is not for the street." | « Voilà », dit Lyra, très bas. « C'est la note. Gardez-la dans votre poitrine ; elle n'est pas pour la rue. » |
| 36 | "Not yet. You are pushing it. Let it sit," Lyra says. | « Pas encore. Vous la poussez. Laissez-la se poser », dit Lyra. |
| 37 | Lyra taught me the Root note, the one the Root keeps losing. Low, and from under the ribs. | Lyra m'a appris la Note-racine, celle que la Racine ne cesse de perdre. Basse, et depuis sous les côtes. |
| 38 | Both verses, up and up for the high note. Nobody ever reaches it. | Les deux couplets, en montant, en montant vers la note haute. Personne ne l'atteint jamais. |
| 39 | "If you are going to know it, know all of it. Essa's verse and mine. It is not a quiet song. It was never meant to be." | « Si vous devez la connaître, connaissez-la en entier. Le couplet d'Essa et le mien. Ce n'est pas une chanson discrète. Elle n'a jamais été faite pour l'être. » |
| 40 | "That is it. You missed the high note. Everyone does. Now you know the whole song, and if some night something has to go singing into the meadow, it need not be me." | « C'est ça. Vous avez manqué la note haute. Tout le monde la manque. Maintenant vous connaissez toute la chanson, et si une nuit quelque chose doit partir chanter dans le pré, ce ne sera pas forcément moi. » |
| 41 | "No, no. Up. It goes up. Again, and louder than you like," Old Tam says. | « Non, non. Plus haut. Ça monte. Encore, et plus fort que vous n'aimeriez », dit le vieux Tam. |
| 42 | Old Tam taught me The Miller's Daughter, both verses. Sung loud, it pulls every hound in hearing to where you sang it. | Le vieux Tam m'a appris La Fille du meunier, les deux couplets. Chantée fort, elle attire chaque chien à portée d'oreille là où on l'a chantée. |
| 43 | The tending breath | Le souffle de soin |
| 44 | Low and even, through the clay jar, so the mother is mended and the hounds hear nothing. | Bas et égal, à travers la jarre d'argile, pour que la mère soit soignée et que les chiens n'entendent rien. |
| 45 | "Forty-one births through a clay jar. The tending note is mostly breath, love; the voice only rides on it. Eighteen for the lesson, and you keep it." | « Quarante et une naissances à travers une jarre d'argile. La note de soin, c'est surtout du souffle, mon petit ; la voix ne fait que monter dessus. Dix-huit pour la leçon, et vous la gardez. » |
| 46 | "There. Your hands will feel it before your ears do. Use it low," Bettany says. | « Voilà. Vos mains le sentiront avant vos oreilles. Servez-vous-en bas », dit Bettany. |
| 47 | "Too much voice. Breath first. Again," Bettany says. | « Trop de voix. Le souffle d'abord. Encore », dit Bettany. |
| 48 | "Eighteen, I said. I hum births, not charity." | « Dix-huit, j'ai dit. Je fredonne des naissances, pas la charité. » |
| 49 | Bettany taught me the tending note the way she hums a birth through a clay jar: mostly breath, the voice riding on it. | Bettany m'a appris la note de soin comme elle fredonne une naissance à travers une jarre d'argile : surtout du souffle, la voix montée dessus. |
| 50 | The falling fifth | La quinte descendante |
| 51 | The Root, then down a fifth: the long cane first, then the short one, as the notebook says. | La Racine, puis une quinte plus bas : la longue canne d'abord, puis la courte, comme le dit le carnet. |
| 52 | Page two of the notebook is in your head: the long cane first, the one that sounds the root, then the fifth below it. The long cane is on the first peg. | La deuxième page du carnet vous revient : la longue canne d'abord, celle qui sonne la racine, puis la quinte en dessous. La longue canne est sur la première cheville. |
| 53 | Blow the long cane, then the fifth, as the notebook says. | Souffler dans la longue canne, puis la quinte, comme le dit le carnet. |
| 54 | The long cane sounds the Root, and then the fifth falls out of it like a dropped stone. You have the falling fifth. Lyra had it by dark, the notebook says. It took you longer. | La longue canne sonne la Racine, puis la quinte en tombe comme une pierre qu'on lâche. Vous avez la quinte descendante. Lyra l'avait avant la nuit, dit le carnet. Il vous a fallu plus longtemps. |
| 55 | The cane squeals, and the fifth will not fall. Not yet. | La canne couine, et la quinte refuse de tomber. Pas encore. |
| 56 | At Tobin's reed-pipes in Lyra's house I blew the long cane and the fifth below it, the way his notebook says he taught her. I have the falling fifth. | Aux pipeaux de Tobin, dans la maison de Lyra, j'ai soufflé dans la longue canne puis la quinte en dessous, comme son carnet dit qu'il le lui a appris. J'ai la quinte descendante. |
| 57 | Godwin Pettigrew, lamplighter | Godwin Pettigrew, allumeur de veilleuses |
| 58 | A night-hummer | Une fredonneuse de nuit |
| 59 | Evening. Mind the pole. Every lamp in Oakhaven by full dark, and not one of them quiet. | Bonsoir. Attention à la perche. Toutes les veilleuses d'Oakhaven avant la nuit noire, et pas une seule muette. |
| 60 | Can't stop. Twenty-four lamps and one taper, and the dark does not wait on me. | Peux pas m'arrêter. Vingt-quatre veilleuses et un seul cierge, et la nuit ne m'attend pas. |
| 61 | Out of the way of the pole, if you would. Lamps first. Talk after. | Écartez-vous de la perche, s'il vous plaît. Les veilleuses d'abord. On parlera après. |
| 62 | Hm-mm. All's well. Sit if you like; the stool next door is free. | Hm-mm. Tout va bien. Asseyez-vous si vous voulez ; le tabouret d'à côté est libre. |
| 63 | Hm. Keep to the Narrow, love, and the street keeps you. | Hm. Restez dans l'Étroit, mon petit, et la rue vous garde. |
| 64 | Lower. I am humming for the whole street, not for you. | Plus bas. Je fredonne pour toute la rue, pas pour vous. |
| 65 | Lyra whistles the falling fifth through two fingers, straight at the one you are looking at. It stops dead; the rest falter. | Lyra siffle la quinte descendante entre deux doigts, droit sur celui que vous regardez. Il s'arrête net ; les autres vacillent. |
| 66 | Lyra breathes the tending note close to your ear: no voice in it, only breath. Something knits, a little. | Lyra souffle la note de soin tout près de votre oreille : pas de voix dedans, seulement du souffle. Quelque chose se ressoude, un peu. |
