# Game — Phase 18 New In-Game Text (for review)

Phase 18 "Technical" adds mostly interface text: the GPU compositor switch, the installable app and update notice, the daily challenge, and ghost replays. Invented place names in the daily dungeon are [PROPOSED] generic places. The offline-app strings (update notice, Options rows) are in tools/i18n/p18-pwa.tsv in the repo.

---

## P18 GPU — new player-facing text (for review)

All in Options → Graphics & access, one row after the Cinematic rows (js/gpu18.js). No story text, nothing [PROPOSED].

| English | French (tools/i18n/p18-gpu.tsv) | Where |
|---|---|---|
| GPU compositor | Compositeur GPU | row label |
| WebGL2: crisp HUD text, colour passes on the graphics card | WebGL2 : texte de l’interface net, passes de couleur sur la carte graphique | row hint |
| On / Off | (existing strings) | button |
| Not available | Indisponible | button when WebGL2 is missing (disabled) |
| WebGL2 is not available on this device | WebGL2 n’est pas disponible sur cet appareil | hint when WebGL2 is missing |
| the Original preset always uses the classic canvas | le préréglage Original utilise toujours le canevas classique | hint when the switch is on under Original |

---

## Phase 18 DAILY — new player-facing text (review)

All strings are in js/daily18.js (TX, TX_LOOK); French in tools/i18n/p18-daily.tsv. Floor names are [PROPOSED] generic places (no story names).

| English | Français |
|---|---|
| Daily challenge | Défi du jour |
| Practice dungeon | Donjon d'entraînement |
| Three floors of a dungeon made from the date. Everyone who plays on the same day, by the clock at Greenwich, walks the same floors with the same kit. | Trois niveaux d'un donjon tiré de la date. Tous ceux qui jouent le même jour, à l'heure de Greenwich, parcourent les mêmes niveaux avec le même équipement. |
| Score: floors reached, the climb out, time, kills and treasure, less the damage you take. No saves: a run is one sitting. Your Book One game is put aside, untouched, and given back when you leave. | Score : niveaux atteints, la remontée, le temps, les ennemis abattus et le trésor, moins les dégâts subis. Pas de sauvegarde : une partie se joue d'une traite. Votre partie du Livre Un est mise de côté, intacte, et vous est rendue quand vous en sortez. |
| The kit: a short sword, a glass-shot pistol with nine pellets, a leather cap, a gambeson, soft boots, two tonics and a jar of honey. | L'équipement : une épée courte, un pistolet à billes de verre avec neuf billes, une calotte de cuir, un gambison, des bottes souples, deux toniques et un pot de miel. |
| Today | Aujourd'hui |
| Begin today’s run | Commencer la partie du jour |
| Begin today's run | Commencer la partie du jour |
| Practice | Entraînement |
| A dungeon from a seed of your own (a number up to 999999). It is scored, but not as a daily. | Un donjon tiré d'une graine de votre choix (un nombre jusqu'à 999999). Il est noté, mais pas comme un défi du jour. |
| Seed | Graine |
| New seed | Nouvelle graine |
| Begin the practice run | Commencer l'entraînement |
| Your results | Vos résultats |
| No runs yet in this browser. | Aucune partie encore dans ce navigateur. |
| Best today | Meilleur score du jour |
| No run today yet. | Pas encore de partie aujourd'hui. |
| Recent runs | Parties récentes |
| Daily | Du jour |
| climbed out | remontée |
| fell | chute |
| left | abandon |
| Share code | Code de partage |
| Copy it by hand or with the button. Anyone can check it here; it is never sent anywhere. | Copiez-le à la main ou avec le bouton. N'importe qui peut le vérifier ici ; il n'est jamais envoyé nulle part. |
| Copy | Copier |
| Copied. | Copié. |
| Select the code and copy it by hand. | Sélectionnez le code et copiez-le à la main. |
| Check a code | Vérifier un code |
| Check | Vérifier |
| That code does not check out. | Ce code ne tient pas. |
| A true code. | Un code authentique. |
| Close | Fermer |
| Back | Retour |
| Your last run was interrupted (the page was closed or reloaded). It is not on the table. | Votre dernière partie a été interrompue (la page a été fermée ou rechargée). Elle ne figure pas au tableau. |
| The run could not start. Your Book One game is untouched. | La partie n'a pas pu commencer. Votre partie du Livre Un est intacte. |
| You climbed out. | La remontée au jour : c'est fait. |
| You fell. | Une chute met fin à la partie. |
| You left the run. | Partie abandonnée. |
| Floors reached | Niveaux atteints |
| Climbed out | Remontée |
| Time | Temps |
| Time bonus | Prime de temps |
| Kills | Ennemis abattus |
| Elites | Élites |
| Treasure | Trésor |
| Damage taken | Dégâts subis |
| Score | Score |
| A new best for this day. | Un nouveau record pour ce jour. |
| Three floors down, then the climb out. Find the stair on each floor; take what you can carry and what you can kill on the way. | Trois niveaux à descendre, puis la remontée. Trouvez l'escalier à chaque niveau ; prenez en chemin ce que vous pouvez porter et abattez ce que vous pouvez. |
| You have a short sword, a pistol with nine pellets, two tonics and a jar of honey. Nothing you find stays with you after the run. | Vous avez une épée courte, un pistolet et neuf billes, deux toniques et un pot de miel. Rien de ce que vous trouvez ne vous reste après la partie. |
| Go down | Descendre |
| Not now | Pas maintenant |
| Floor | Niveau |
| A stair going down into the dark | Un escalier qui descend dans le noir |
| A stair up to daylight. The way out. | Un escalier qui monte vers le jour. La sortie. |
| A locked door. Something behind it is worth the trouble. | Une porte fermée à clé. Ce qu'il y a derrière vaut la peine. |
| Down the stair. Floor {0} of 3. | Au bas de l'escalier. Niveau {0} sur 3. |
| The stair behind you is shut. Find the way down. | L'escalier derrière vous est fermé. Trouvez le chemin vers le bas. |
| The last floor. Somewhere there is a stair up to daylight. | Le dernier niveau. Quelque part, un escalier monte vers le jour. |
| No saves in the daily challenge: a run is one sitting. | Pas de sauvegarde dans le défi du jour : une partie se joue d'une traite. |
| Abandon the run | Abandonner la partie |
| Score: {0} | Score : {0} |
| See the results | Voir les résultats |
| The Undercroft | La Crypte basse |
| The Old Cellars | Les Vieilles Caves |
| The Ossuary | L'Ossuaire |
| The Drowned Chapel | La Chapelle noyée |
| The Glass Cistern | La Citerne de verre |
| The Old Cuttings | Les Vieilles Tailles |
| A torch in a wall bracket | Une torche dans un support mural |
| An iron brazier, coals banked | Un brasero de fer, braises couvertes |
| A lamp of green-gold glass, burning without oil | Une lampe de verre vert et or, qui brûle sans huile |
| A strongbox, left behind by somebody in a hurry | Un coffret, laissé par quelqu'un de pressé |
| A broken statue. Its face has been worn away by hands. | Une statue brisée. Des mains en ont usé le visage. |

---

## P18 GHOST — all new player-visible text (every string [PROPOSED]; French in tools/i18n/p18-ghost.tsv)
Options (Graphics & access): Ghost replays / Ghost echo / Ghost codes (hints in the TSV).
In-game lines: "Your ghost runs the fight against {boss} again beside you." · "New best against {boss}: {m:ss}. Your ghost is kept." · "Your attempt against {boss} is kept as a ghost to learn from." · "You beat your ghost by {m:ss}." · "Your ghost was {m:ss} quicker." · "You and your ghost finish together."
Panels: Ghosts list (Watch / Copy code / Delete / Import), Watch panel (Play, Pause, Restart, Speed, key help, alt text). Trophy choice: "Watch your best run."
Import refusals: not a code · changed or cut short · newer game · not a run this game could record · fight this game does not have · too long · no room · already have a better one.

---

## Offline app (PWA) strings, English → French

- A new version is ready — reload → Une nouvelle version est prête — rechargez
- Reload → Recharger
- Later → Plus tard
- After the fight → Après le combat
- Reloading returns you to the title and does not save your game. Save first, or reload anyway. → Recharger vous ramène à l'écran-titre et ne sauvegarde pas votre partie. Sauvegardez d'abord, ou rechargez quand même.
- Reload anyway → Recharger quand même
- A new version is ready. It starts the next time you open the game; a reload now would end this hardcore run. → Une nouvelle version est prête. Elle démarrera à la prochaine ouverture du jeu ; un rechargement maintenant mettrait fin à cette partie hardcore.
- Keep saves on this device → Garder les sauvegardes sur cet appareil
- the three session slots stay in this browser after you close the page. Hardcore runs and the extras are never stored. Off: slots last until you leave the page, as before. → les trois emplacements de session restent dans ce navigateur après la fermeture de la page. Les parties hardcore et les extras ne sont jamais conservés. Désactivé : les emplacements durent jusqu'à ce que vous quittiez la page, comme avant.
- This browser cannot store them (private window or storage blocked): slots last until you leave the page. → Ce navigateur ne peut pas les conserver (fenêtre privée ou stockage bloqué) : les emplacements durent jusqu'à ce que vous quittiez la page.
- Offline audio → Audio hors ligne
- download the music and voices (about 52 MB) so they play without a connection. Everything else is already offline after the first visit. → télécharger la musique et les voix (environ 52 Mo) pour les entendre sans connexion. Tout le reste est déjà disponible hors ligne après la première visite.
- Download → Télécharger
- Offline play starts once this page has been fully loaded from a web address (not a file). → Le jeu hors ligne commence une fois cette page entièrement chargée depuis une adresse web (et non un fichier).
- Ready → Prêt
- Downloading → Téléchargement
- Stop → Arrêter
- Finish → Terminer
- Install the game → Installer le jeu
- add it to your apps and start it from there, in its own window. → l'ajouter à vos applications et le lancer de là, dans sa propre fenêtre.
- Install → Installer
- On → Activé
- Off → Désactivé
