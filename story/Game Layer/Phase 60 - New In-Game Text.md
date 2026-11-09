# Phase 60 — ROADMAP R10 wave 1: Oakhaven's people keep the hours

*Recorded 7 Nov 2026 from the game's translation file (`tools/i18n/p60-life.tsv`). Everything here is [PROPOSED]: invented people with roles instead of names, written to fit Book One's Oakhaven under the Hush. Nothing in it changes the story.*

## What is new, in short

- **The engine** (`js/life60.js`). Townsfolk who keep a day: stops by the hour, a job you can see at each, real walking routes between them, indoors at home time. You can talk to them (a greeting and a question of their own) and overhear them in passing. Never saved; gone when the story empties the place.
- **Oakhaven's people** (`js/life60-oakhaven.js`). 27 of them: the square's sellers and gossips, the dyer and the washhouse, the orchards and the press, the shuttered house being mended, harvest garlands going up, bales, hay, barrels, water, children at play; the Boar's door and the window-lamps in the evening; the watch and a sleepless baby at night. Every line they say aloud is a whisper, because of the Hush.

## Questions for sleeves

1. Are any of these trades or details wrong for Oakhaven? (The Moot's banners, the Madders' washhouse doing the burl-sick ward's linen, the orchard store pressing cider, the old cooperage shut up behind the orchard store, eggs from the clearing.)
2. The children's game is called Hush: freeze when somebody says "hound". Keep?
3. Should any of them become named people later (Tull's boy, Vettle's wife and lad)?

## Every line

Source: `tools/i18n/p60-life.tsv` (118 lines).

| # | English | French |
|---|---|---|
| 1 | What are you doing? | Qu'est-ce que vous faites ? |
| 2 | How are things here? | Comment ça va, ici ? |
| 3 | Tull's boy | Le garçon de Tull |
| 4 | "Loaves. Two a penny, or one and a quiet word about the weather." He is whispering. They all whisper. | « Des miches. Deux pour un sou, ou une seule et un mot tranquille sur le temps. » Il chuchote. Ils chuchotent tous. |
| 5 | "Tull bakes all night and I carry all morning. Then I'm allowed to play. Then I sweep." He considers this. "It's a good arrangement." | « Tull cuit toute la nuit et moi je porte toute la matinée. Après, j'ai le droit de jouer. Après, je balaie. » Il y réfléchit. « C'est un bon arrangement. » |
| 6 | Tull's boy, low: "Loaves! Quiet loaves. Fresh quiet loaves." | Le garçon de Tull, à voix basse : « Des miches ! Des miches tranquilles. Des miches fraîches et tranquilles. » |
| 7 | Tull's boy, to nobody: "That one's burnt. That one's burnt on purpose." | Le garçon de Tull, à personne : « Celle-là est brûlée. Celle-là est brûlée exprès. » |
| 8 | The dyer's wife | La femme du teinturier |
| 9 | Her hands are madder-red to the wrist. "Mind the vats. Red doesn't come out, and neither do I, most days." | Elle a les mains rouge garance jusqu'aux poignets. « Attention aux cuves. Le rouge, ça ne part pas, et moi non plus, la plupart du temps. » |
| 10 | "Madder, weld and woad. Red for the Moot's banners, though there's been no Moot worth a banner since the Hedge. Yellow for the children's caps. Blue for mourning, lately. A great deal of blue." | « Garance, gaude et guède. Du rouge pour les bannières du Conseil, même s'il n'y a pas eu de Conseil digne d'une bannière depuis la Haie. Du jaune pour les bonnets des enfants. Du bleu pour le deuil, ces temps-ci. Beaucoup de bleu. » |
| 11 | The dyer's wife, under her breath: "Again. Steep it again." | La femme du teinturier, entre ses dents : « Encore. Fais-le tremper encore. » |
| 12 | The dyer's wife, softly, to the washerwoman: "...and he says the woad's gone sullen. Woad doesn't go sullen. Men do." | La femme du teinturier, doucement, à la lavandière : « ... et il dit que la guède est devenue boudeuse. La guède ne boude pas. Les hommes, si. » |
| 13 | A washerwoman | Une lavandière |
| 14 | "Wet hands, love, I won't shake. Whose shirt's that? It wants a wash, whoever's it is." | « Mains mouillées, mon chou, je ne vous serre pas la main. À qui est cette chemise ? Elle a besoin d'un lavage, à qui qu'elle soit. » |
| 15 | "The Madders' washhouse, by the day. Sheets, shirts, the burl-sick ward's linen, the Narrow keep us. Lye and a stick and a good back. One of the three is going." | « Le lavoir des Madders, à la journée. Draps, chemises, le linge de la salle des loupeux, que l'Étroit nous garde. De la lessive, un bâton et un bon dos. Des trois, c'est le dos qui lâche. » |
| 16 | The washerwoman, scrubbing: "Out, damn you. Out." | La lavandière, en frottant : « Sors de là, maudite. Sors. » |
| 17 | The washerwoman, low: "If that's rain on the wind I'll have words with somebody." | La lavandière, à voix basse : « Si c'est de la pluie dans le vent, je vais avoir deux mots à dire à quelqu'un. » |
| 18 | Vettle's wife, the chandler's | La femme de Vettle, le chandelier |
| 19 | "Tallow, wick, lamp-oil, string, a very good knife for a very fair price. And news, if you buy the knife." | « Suif, mèche, huile à lampe, ficelle, un très bon couteau pour un prix très honnête. Et des nouvelles, si vous prenez le couteau. » |
| 20 | "Hush-lamp wicks, mostly. Everyone burns a lamp in the window now. We've sold more wick this year than the ten before it, and I'd give every penny back." | « Des mèches de veilleuse, surtout. Tout le monde garde une lampe à la fenêtre, maintenant. On a vendu plus de mèche cette année que les dix d'avant, et je rendrais chaque sou. » |
| 21 | Vettle's wife, softly: "Wicks, two for one. Wicks." | La femme de Vettle, doucement : « Des mèches, deux pour une. Des mèches. » |
| 22 | Vettle's wife, to the goodwife, very low: "...three nights running, through the Cooper's Row gap. Three." | La femme de Vettle, à la bonne femme, très bas : « ... trois nuits de suite, par la brèche de la rue des Tonneliers. Trois. » |
| 23 | A goodwife of Cooper's Row | Une bonne femme de la rue des Tonneliers |
| 24 | "You'll be the one from the clearing. No? You have the look. Everyone has the look, this year." | « Vous devez être quelqu'un de la clairière. Non ? Vous en avez l'air. Tout le monde en a l'air, cette année. » |
| 25 | "Sweeping a step that nobody walks on, mostly. You keep the step swept and the house stays a house. My mother said so." | « Je balaie un perron où personne ne marche, surtout. On garde le perron balayé, et la maison reste une maison. C'est ma mère qui le disait. » |
| 26 | A goodwife, sweeping: "Leaves. Leaves and more leaves, and the oaks have barely started." | Une bonne femme, en balayant : « Des feuilles. Des feuilles et encore des feuilles, et les chênes ont à peine commencé. » |
| 27 | A goodwife, very low: "Don't look at the gap. Looking's how they know." | Une bonne femme, très bas : « Ne regardez pas la brèche. C'est en regardant qu'on les avertit. » |
| 28 | A carpenter | Un charpentier |
| 29 | He takes the nails out of his mouth to speak. "Shutters. Whoever lived here left them open to the weather two winters. I'm making them good. Nobody asked me." | Il retire les clous de sa bouche pour parler. « Des volets. Celui qui habitait ici les a laissés ouverts aux intempéries deux hivers. Je les remets en état. Personne ne me l'a demandé. » |
| 30 | "The shuttered house. It'll be somebody's again, one day. A town that keeps its empty houses mended is a town that means to stay." He hits the nail. Softly. Three soft taps instead of one loud one. | « La maison aux volets clos. Elle sera de nouveau à quelqu'un, un jour. Une ville qui entretient ses maisons vides, c'est une ville qui compte rester. » Il frappe le clou. Doucement. Trois petits coups au lieu d'un grand. |
| 31 | The carpenter, under his breath: "Level. Near enough level." | Le charpentier, entre ses dents : « D'aplomb. À peu près d'aplomb. » |
| 32 | The carpenter, tapping softly: "Three small knocks. Never one big one. Three small." | Le charpentier, en tapant doucement : « Trois petits coups. Jamais un grand. Trois petits. » |
| 33 | A thatcher | Un chaumier |
| 34 | "Harvest garlands. Straw plait and rowan. We hang them every year, Hedge or no Hedge, Church or no Church. You hang them because you always have." | « Les guirlandes de la moisson. Tresse de paille et sorbier. On les accroche tous les ans, Haie ou pas Haie, Église ou pas Église. On les accroche parce qu'on l'a toujours fait. » |
| 35 | "The Greenhall this morning, the Boar's front this afternoon. The rowan's for luck. The straw's from Old Tam's top field. He doesn't know. Don't tell him." | « La Maison verte ce matin, la façade du Sanglier cet après-midi. Le sorbier, c'est pour la chance. La paille vient du champ du haut du vieux Tam. Il n'en sait rien. Ne lui dites pas. » |
| 36 | The thatcher, up the ladder: "Pass it up. No, the other end. The other end." | Le chaumier, en haut de l'échelle : « Passe-la-moi. Non, l'autre bout. L'autre bout. » |
| 37 | The thatcher, to himself: "A bit left. A bit more. There." | Le chaumier, pour lui-même : « Un peu à gauche. Encore un peu. Là. » |
| 38 | An orchard hand | Une ouvrière du verger |
| 39 | "Mind the windfalls, they're slick. Take one if you like. Take a sound one." | « Attention aux pommes tombées, elles glissent. Prenez-en une si vous voulez. Prenez-en une saine. » |
| 40 | "Picking, then the press. The cider's the only thing in Oakhaven that's allowed to make a noise, and it only gurgles." | « La cueillette, puis le pressoir. Le cidre, c'est la seule chose à Oakhaven qui a le droit de faire du bruit, et il ne fait que gargouiller. » |
| 41 | An orchard hand, softly: "Sound. Sound. Bruised. Sound." | Une ouvrière du verger, doucement : « Saine. Saine. Talée. Saine. » |
| 42 | An orchard hand, low: "There's wasps in the windfalls. Don't yelp. Wasps don't care, but other things do." | Une ouvrière du verger, à voix basse : « Il y a des guêpes dans les pommes tombées. Ne criez pas. Les guêpes s'en moquent, mais d'autres choses, non. » |
| 43 | An orchard man | Un homme du verger |
| 44 | "Harvest, and nobody to sell it to but ourselves. We'll eat a great many apples this winter." | « La moisson, et personne à qui la vendre que nous-mêmes. On va manger beaucoup de pommes, cet hiver. » |
| 45 | "Picking. You twist, you don't pull. Pull, and the branch remembers. Twist, and it forgives you." | « La cueillette. On tourne, on ne tire pas. Si on tire, la branche s'en souvient. Si on tourne, elle vous pardonne. » |
| 46 | An orchard man, to the tree: "Come on, then. Come on." | Un homme du verger, à l'arbre : « Allez. Allez, viens. » |
| 47 | An orchard man, quietly: "Half the crop's on the far side of the Hedge. Rotting. Listening to us pick this half." | Un homme du verger, tranquillement : « La moitié de la récolte est de l'autre côté de la Haie. Elle pourrit. Elle nous écoute cueillir cette moitié-ci. » |
| 48 | The wool-factor's man | L'homme du négociant en laine |
| 49 | "Bales from the mill to the factor's, the factor's to the mill, and the Consortium's clerk counting both ends. Nobody's ever counted me." | « Des balles du moulin au négociant, du négociant au moulin, et le commis du Consortium qui compte aux deux bouts. Moi, personne ne m'a jamais compté. » |
| 50 | "Carding's done at the Carders' mill, weighing's done at the factor's. I'm the bit in between. Every town has a bit in between." | « Le cardage se fait au moulin des Cardeurs, la pesée chez le négociant. Moi, je suis le morceau entre les deux. Chaque ville a son morceau entre les deux. » |
| 51 | The wool-factor's man, under a bale: "Hup. Hup. Easy." | L'homme du négociant en laine, sous une balle : « Hop. Hop. Doucement. » |
| 52 | The wool-factor's man, low: "Forty-one bales and the clerk wrote forty. Let it go. Let it go." | L'homme du négociant en laine, à voix basse : « Quarante et une balles, et le commis en a écrit quarante. Laisse. Laisse. » |
| 53 | A fuller | Un foulon |
| 54 | "Don't stand downwind of the fulling-shed. Not on a warm day. Not on any day." | « Ne vous mettez pas sous le vent du moulin à foulon. Pas un jour de chaleur. Pas un seul jour. » |
| 55 | "Walking the cloth. You tread it in the trough with the earth and the water until it shrinks and thickens and holds. Same as people, really." | « Je marche le drap. On le foule dans l'auge avec la terre et l'eau jusqu'à ce qu'il rétrécisse, s'épaississe et tienne. Comme les gens, au fond. » |
| 56 | The fuller, treading: "Left. Right. Left. Right." | Le foulon, en foulant : « Gauche. Droite. Gauche. Droite. » |
| 57 | A hay-carter | Un charretier de foin |
| 58 | "Last of the hay. Old Tam's, mostly. He watches me cart it from his window and pretends he doesn't." | « Le dernier foin. Celui du vieux Tam, surtout. Il me regarde le charrier depuis sa fenêtre et fait semblant que non. » |
| 59 | "Raking, carting, stacking. The barn's full. The town's beasts'll eat this winter, whatever the town does." | « Ratisser, charrier, mettre en meule. La grange est pleine. Les bêtes de la ville mangeront cet hiver, quoi que fasse la ville. » |
| 60 | The hay-carter, raking: "Turn it, turn it, let it dry." | Le charretier de foin, en ratissant : « Retourne-le, retourne-le, qu'il sèche. » |
| 61 | The hay-carter, softly: "Smell that. That's the summer, that is. Last of it." | Le charretier de foin, doucement : « Sentez-moi ça. C'est l'été, ça. Le dernier qui reste. » |
| 62 | A child of Oakhaven | Un enfant d'Oakhaven |
| 63 | "We're playing Hush. You have to freeze when somebody says 'hound'. Hound." She freezes. She is very good at it. | « On joue au Silence. Il faut se figer quand quelqu'un dit « chien ». Chien. » Elle se fige. Elle est très forte à ce jeu. |
| 64 | A child, in a fierce whisper: "Hound!" | Une enfant, dans un chuchotement farouche : « Chien ! » |
| 65 | A child, whispering: "You moved. You moved, you're out." | Un enfant, en chuchotant : « Tu as bougé. Tu as bougé, t'es éliminé. » |
| 66 | A child of Oakhaven | Un enfant d'Oakhaven |
| 67 | "I'm not allowed to talk to people from outside. Are you from outside? You smell like outside." | « J'ai pas le droit de parler aux gens du dehors. Vous êtes du dehors ? Vous sentez le dehors. » |
| 68 | A child, whispering: "Not it. Not it. Not it." | Un enfant, en chuchotant : « C'est pas moi. C'est pas moi. C'est pas moi. » |
| 69 | A child of Oakhaven | Un enfant d'Oakhaven |
| 70 | He shows you a beetle. It is a very good beetle. He puts it away again without a word. | Il vous montre un scarabée. C'est un très beau scarabée. Il le range sans un mot. |
| 71 | A child, very quietly: "Freeze. Freeze. Now go." | Un enfant, tout bas : « Figés. Figés. Maintenant, allez. » |
| 72 | A water-carrier | Un porteur d'eau |
| 73 | "Water for the west houses. Two pails, twenty trips, and a song I'm not allowed to sing." | « De l'eau pour les maisons de l'ouest. Deux seaux, vingt allers-retours, et une chanson que je n'ai pas le droit de chanter. » |
| 74 | "Pails. Back and forth. The old folk can't carry, and the young ones are at the bores or the orchards. Somebody's got to be the bit in between." | « Des seaux. Aller et retour. Les vieux ne peuvent plus porter, et les jeunes sont aux forages ou aux vergers. Il faut bien que quelqu'un soit le morceau entre les deux. » |
| 75 | The water-carrier, sloshing: "Steady. Steady." | Le porteur d'eau, l'eau clapotant : « Doucement. Doucement. » |
| 76 | The water-carrier, humming without a sound, his lips moving. | Le porteur d'eau, qui fredonne sans un son, les lèvres en mouvement. |
| 77 | An old man | Un vieil homme |
| 78 | "Sit, if you're sitting. If you're not, don't loom. Looming's for the Church." | « Asseyez-vous, si vous vous asseyez. Sinon, ne restez pas planté au-dessus de moi. Ça, c'est pour l'Église. » |
| 79 | "I've sat on this bench through four Governors and two harvests in the Hedge. The bench is the only thing in Oakhaven that hasn't changed. Don't tell it." | « Je me suis assis sur ce banc sous quatre Gouverneurs et deux moissons dans la Haie. Le banc, c'est la seule chose à Oakhaven qui n'a pas changé. Ne le lui dites pas. » |
| 80 | An old man, to nobody: "In my day the oaks rang for weddings." | Un vieil homme, à personne : « De mon temps, les chênes sonnaient pour les mariages. » |
| 81 | An old man, very low: "All these years, and they still come up that road like they own it." | Un vieil homme, très bas : « Toutes ces années, et ils montent toujours cette route comme si elle était à eux. » |
| 82 | A watchman of the North Gate | Un veilleur de la Porte du Nord |
| 83 | "Inside before the dead hour, friend. The gate's barred and I'm not unbarring it for anyone who isn't bleeding." | « Rentrez avant l'heure morte, l'ami. La porte est barrée, et je ne la débarre pour personne qui ne saigne pas. » |
| 84 | "Watching the Hedge. Mostly listening to it. You get so you can tell when it's thinking." | « Je surveille la Haie. Surtout, je l'écoute. On finit par savoir quand elle réfléchit. » |
| 85 | The watchman, barely a breath: "Something in the Hedge. No. Wind. No." | Le veilleur, dans un souffle : « Quelque chose dans la Haie. Non. Le vent. Non. » |
| 86 | A young mother | Une jeune mère |
| 87 | "Shh. Shh. Shh. She won't settle. She hears the Hedge, I think. Babies hear everything." | « Chut. Chut. Chut. Elle ne veut pas se calmer. Elle entend la Haie, je crois. Les bébés entendent tout. » |
| 88 | A young mother, walking the lane: "Shh. Shh. Hush now. Hush." | Une jeune mère, qui arpente la ruelle : « Chut. Chut. Tout doux. Tout doux. » |
| 89 | A farmer's wife from the clearing | Une fermière de la clairière |
| 90 | "Eggs from the clearing for Bettany. Six dozen, and the hens laying again for the first time since spring." | « Des œufs de la clairière pour Bettany. Six douzaines, et les poules qui pondent de nouveau pour la première fois depuis le printemps. » |
| 91 | A farmer's wife, low: "Eggs. Mind the eggs." | Une fermière, à voix basse : « Les œufs. Attention aux œufs. » |
| 92 | A cooper's journeyman | Un compagnon tonnelier |
| 93 | "Hoops and staves. A barrel's a thing that holds, if you make it right. Nothing in this town holds right now except barrels." | « Des cercles et des douelles. Un tonneau, c'est une chose qui tient, si on le fait bien. Rien ne tient dans cette ville en ce moment, à part les tonneaux. » |
| 94 | "Barrels for the cider, the dye-works, the tannery. The old cooperage is shut up behind the orchard store. Nobody goes there. I work out here." | « Des tonneaux pour le cidre, la teinturerie, la tannerie. L'ancienne tonnellerie est fermée, derrière la réserve du verger. Personne n'y va. Moi, je travaille ici. » |
| 95 | The cooper's journeyman, softly: "Tap. Tap. Tap. Drive it home." | Le compagnon tonnelier, doucement : « Tap. Tap. Tap. Enfonce-le. » |
| 96 | A girl selling reed-baskets | Une fille qui vend des paniers de roseau |
| 97 | "Baskets. Wind-reed from the meadow, plaited on Rootday and dried by Hearthday. That one's a good one. That one's for show." | « Des paniers. Du roseau à vent de la prairie, tressé le Racinedi et séché pour l'Âtredi. Celui-là est un bon. Celui-là, c'est pour la montre. » |
| 98 | "I cut the reeds in the meadow and plait them on the step. My gran taught me. She plaited a basket so tight it held water. I've never managed it. One day." | « Je coupe les roseaux dans la prairie et je les tresse sur le perron. C'est ma grand-mère qui m'a appris. Elle tressait un panier si serré qu'il tenait l'eau. Moi, je n'y suis jamais arrivée. Un jour. » |
| 99 | A girl, softly: "Baskets. Good baskets. Quiet baskets, they don't creak." | Une fille, doucement : « Des paniers. De bons paniers. Des paniers tranquilles, ils ne grincent pas. » |
| 100 | A woman from the Hollow | Une femme du Creux |
| 101 | Her husband's arm, she tells you, has started to bark at the elbow. She says it the way you would say he has started to limp. "It doesn't hurt him. That's the worst of it." | Le bras de son mari, vous dit-elle, a commencé à prendre l'écorce au coude. Elle le dit comme on dirait qu'il s'est mis à boiter. « Ça ne lui fait pas mal. C'est ça le pire. » |
| 102 | A woman from the Hollow, to Bettany, low: "Whatever you've got that's soft. He can't chew, now." | Une femme du Creux, à Bettany, à voix basse : « Ce que vous avez de tendre. Il ne peut plus mâcher, maintenant. » |
| 103 | A watchman on the inner bank | Un veilleur sur le talus intérieur |
| 104 | He does not stop walking. "Bank to bank, all night, and back. If I stop, I start listening. Walk with me or let me by." | Il ne s'arrête pas de marcher. « D'un bout du talus à l'autre, toute la nuit, et retour. Si je m'arrête, je me mets à écouter. Marchez avec moi ou laissez-moi passer. » |
| 105 | "The inner bank. Sixty-odd paces of it under the Hedge, and every one of them I know by the sound it makes." | « Le talus intérieur. Une soixantaine de pas sous la Haie, et je les connais tous au bruit qu'ils font. » |
| 106 | The watchman on the bank, a breath: "All's quiet. All's quiet. All's quiet." | Le veilleur du talus, dans un souffle : « Tout est calme. Tout est calme. Tout est calme. » |
| 107 | Vettle's lad, trimming the window-lamps | Le garçon de Vettle, qui mouche les lampes aux fenêtres |
| 108 | "Every window with a lamp in it gets its wick trimmed by me before the dead hour. Father's orders. A lamp that gutters is a window that goes dark, and a dark window is—" He stops. "Is a dark window." | « Chaque fenêtre qui a une lampe se fait moucher la mèche par moi avant l'heure morte. Ordre de mon père. Une lampe qui coule, c'est une fenêtre qui s'éteint, et une fenêtre éteinte, c'est… » Il s'arrête. « C'est une fenêtre éteinte. » |
| 109 | "Trim, top up, on to the next. Thirty-one windows. I could do it in my sleep. I won't, though. Nobody sleeps much." | « Moucher, remplir, la suivante. Trente et une fenêtres. Je pourrais le faire en dormant. Je ne le ferai pas, remarquez. Personne ne dort beaucoup. » |
| 110 | Vettle's lad, softly, at a window: "There. Burn steady. Burn steady." | Le garçon de Vettle, doucement, à une fenêtre : « Là. Brûle bien droit. Brûle bien droit. » |
| 111 | A drinker at the Boar's door | Un buveur à la porte du Sanglier |
| 112 | "Inside's full, and it's quieter out here. You'd think it'd be the other way round. It isn't." | « Dedans, c'est plein, et c'est plus calme dehors. On croirait que ce serait l'inverse. Eh bien non. » |
| 113 | A drinker, very low: "...and I said, Governor or no Governor, that's my well." | Un buveur, très bas : « ... et je lui ai dit, Gouverneur ou pas Gouverneur, ce puits est à moi. » |
| 114 | A drinker, under his breath: "One more. One more and then the dead hour." | Un buveur, entre ses dents : « Encore un. Encore un et après, l'heure morte. » |
| 115 | A drinker at the Boar's door | Un buveur à la porte du Sanglier |
| 116 | He raises his cup a little, which is as much as anyone raises anything in Oakhaven. | Il lève un peu sa tasse, ce qui est autant qu'on lève quoi que ce soit à Oakhaven. |
| 117 | A drinker, softly: "You did not say that. Not to his face." | Un buveur, doucement : « Tu n'as pas dit ça. Pas en face. » |
| 118 | A drinker, a whisper: "Drink up. Drink up, the lamps are going." | Un buveur, dans un murmure : « Bois. Bois, les lampes s'éteignent. » |
