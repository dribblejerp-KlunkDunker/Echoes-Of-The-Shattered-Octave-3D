# Game — Phase 19 New In-Game Text (for review)

Phase 19 "Together" (two-player co-op) adds interface and co-op text: the Play together lobby, join messages, the partner panel, and the lines the guest sees when an action belongs to the host's world. Nothing in the story changes.

---

## P19 NET — new in-game text (for review)

All UI text of js/net19.js (TX table). French in tools/i18n/p19-net.tsv. No lore text; nothing [PROPOSED].
Placeholders {name}, {ms}, {code} are filled at run time; names come from players and are shown as plain text only.

- Play together
  - FR: Jouer ensemble
- Two travellers, one world. The host’s game is the world, and the host makes the story’s choices; the guest brings their own traveller and can join from a phone.
  - FR: Deux voyageurs, un seul monde. La partie de l’hôte est le monde, et l’hôte fait les choix de l’histoire ; l’invité amène son propre voyageur et peut rejoindre depuis un téléphone.
- Your name
  - FR: Votre nom
- Host a game
  - FR: Accueillir une partie
- Your companion joins your world. Best on a computer.
  - FR: Votre compagnon rejoint votre monde. De préférence sur un ordinateur.
- Host
  - FR: Accueillir
- Join a game
  - FR: Rejoindre une partie
- Type the code the host gives you, or scan their QR code with your phone’s camera.
  - FR: Tapez le code que l’hôte vous donne, ou scannez son code QR avec l’appareil photo de votre téléphone.
- Join
  - FR: Rejoindre
- No matchmaker? Use codes by hand
  - FR: Pas de relais ? Échangez des codes à la main
- Your join code
  - FR: Votre code d’accès
- QR code: scan it with a phone camera to open the game and join this session
  - FR: Code QR : scannez-le avec l’appareil photo d’un téléphone pour ouvrir le jeu et rejoindre cette partie
- Your companion scans this with their phone’s camera, or opens the game, chooses Play together and types the code. Then start or load your game: they join you there.
  - FR: Votre compagnon scanne ceci avec l’appareil photo de son téléphone, ou ouvre le jeu, choisit Jouer ensemble et tape le code. Puis commencez ou chargez votre partie : il vous y rejoint.
- Copy the link
  - FR: Copier le lien
- Copied
  - FR: Copié
- Copy
  - FR: Copier
- Stop hosting
  - FR: Cesser d’accueillir
- Leave
  - FR: Partir
- Close
  - FR: Fermer
- Back
  - FR: Retour
- Continue
  - FR: Continuer
- Opening the way…
  - FR: Le chemin s’ouvre…
- Waiting for your companion…
  - FR: En attente de votre compagnon…
- Finding the host…
  - FR: Recherche de l’hôte…
- {name} has joined.
  - FR: {name} vous a rejoint.
- Connected to {name}.
  - FR: Connecté à {name}.
- Ping {ms} ms
  - FR: Latence {ms} ms
- The host’s world opens here when their game is running.
  - FR: Le monde de l’hôte s’ouvre ici quand sa partie est lancée.
- The connection to your companion is lost. Carry on: they can come back with the same code.
  - FR: La liaison avec votre compagnon est perdue. Continuez : il peut revenir avec le même code.
- The connection is lost. Trying again…
  - FR: La liaison est perdue. Nouvel essai…
- The connection is back.
  - FR: La liaison est rétablie.
- Your companion has left.
  - FR: Votre compagnon est parti.
- The session has ended.
  - FR: La partie commune est terminée.
- No game with that code. Check it with the host.
  - FR: Aucune partie avec ce code. Vérifiez-le auprès de l’hôte.
- That game already has two travellers.
  - FR: Cette partie compte déjà deux voyageurs.
- That game is a different version. Both of you reload the page.
  - FR: Cette partie est d’une autre version. Rechargez tous deux la page.
- The host did not answer. Check the code, or try codes by hand.
  - FR: L’hôte n’a pas répondu. Vérifiez le code, ou échangez des codes à la main.
- The matchmaker cannot be reached. Try again, or use codes by hand.
  - FR: Le relais est injoignable. Réessayez, ou échangez des codes à la main.
- Could not connect. Try again, or use codes by hand.
  - FR: Connexion impossible. Réessayez, ou échangez des codes à la main.
- That is not a join code: six letters and numbers, like KRT-4MW.
  - FR: Ce n’est pas un code d’accès : six lettres et chiffres, comme KRT-4MW.
- The desktop app does not go online. Use codes by hand, or play together in the browser version.
  - FR: L’application de bureau ne va pas en ligne. Échangez des codes à la main, ou jouez ensemble dans la version navigateur.
- Codes by hand
  - FR: Codes à la main
- No matchmaker needed: you swap two codes through any message app. It works best when both of you are on the same network.
  - FR: Pas besoin de relais : vous échangez deux codes par n’importe quelle messagerie. Cela marche mieux quand vous êtes tous deux sur le même réseau.
- I am hosting
  - FR: J’accueille
- Make an invitation
  - FR: Créer une invitation
- Send this invitation to your companion:
  - FR: Envoyez cette invitation à votre compagnon :
- Paste their answer here:
  - FR: Collez sa réponse ici :
- Connect
  - FR: Se connecter
- I am joining
  - FR: Je rejoins
- Paste the host’s invitation here:
  - FR: Collez ici l’invitation de l’hôte :
- Make my answer
  - FR: Créer ma réponse
- Send this answer back to the host:
  - FR: Renvoyez cette réponse à l’hôte :
- Working…
  - FR: En cours…
- That code is not right: copy all of it.
  - FR: Ce code n’est pas bon : copiez-le en entier.
- Together · {name} · {ms} ms
  - FR: Ensemble · {name} · {ms} ms
- Connection lost
  - FR: Liaison perdue
- Hosting · {code}
  - FR: Hôte · {code}
- host a two-player game or join one; the guest can be on a phone.
  - FR: accueillir une partie à deux ou en rejoindre une ; l’invité peut être sur un téléphone.
- Open
  - FR: Ouvrir
- Connected
  - FR: Connecté

---

## P19 SYNC — player-visible text [PROPOSED]
All shown through msg() (textContent). French in tools/i18n/p19-sync.tsv.
- joined: "You walk beside {0} now. Their road is yours until you part." [PROPOSED]
- follow (map change): "You go with your companion." [PROPOSED]
- cantLeave (guest at a portal): "Not without your companion. Where they go, you go." [PROPOSED]
- left: "You part ways. Your own road is where you left it." [PROPOSED]
- lost: "The thread to your companion has gone slack. You are back on your own road." [PROPOSED]
- full: "That fire already has two travellers at it." [PROPOSED]
- noSave: "Saving waits until you are back on your own road." [PROPOSED]
- refused: "The host's fire turned you away ({0})." [PROPOSED]
- companion (fallback name): "your companion"

---

## Phase 19 PARTNER — new in-game text (for review)

All of it is UI and system text for playing together; no lore. Nothing here is [PROPOSED] canon.

| English | French |
|---|---|
| {0} joins you on the road. | {0} vous rejoint sur la route. |
| {0} goes home, with what they earned. | {0} rentre chez soi, avec ce qu'il a gagné. |
| {0} has lost the thread for a moment. You carry on. | {0} a perdu le fil un instant. Vous continuez. |
| {0} is back beside you. | {0} est de retour à vos côtés. |
| Loot by turns: this one is yours. The next is {0}'s. | Butin à tour de rôle : celui-ci est à vous. Le suivant est pour {0}. |
| Loot by turns: {1} goes to {0}. The next is yours. | Butin à tour de rôle : {1} revient à {0}. Le suivant est à vous. |
| You fall. {0} can lift you: stand fast, {1} seconds. | Vous tombez. {0} peut vous relever : tenez bon, {1} secondes. |
| {0} is down! Stand beside them to lift them ({1} seconds). | {0} est à terre ! Restez à ses côtés pour le relever ({1} secondes). |
| {0} gets you back on your feet. | {0} vous remet sur pied. |
| You get {0} back on their feet. | Vous remettez {0} sur pied. |
| Nobody reached {0} in time. They wake by the lamp, bruised. | Personne n'a rejoint {0} à temps. Il se réveille près de la lanterne, meurtri. |
| {0} drags you clear before they go. | {0} vous met à l'abri avant de partir. |
| Lv {0} | Niv. {0} |
| Next drop: yours | Prochain butin : le vôtre |
| Next drop: {0} | Prochain butin : {0} |
| Down: {0} s | À terre : {0} s |
| Lifting… | On le relève… |
| Reconnecting… | Reconnexion… |
| DOWN | À TERRE |
| You are down. {0} can lift you: {1} s | Vous êtes à terre. {0} peut vous relever : {1} s |
| The story is the host's | L'histoire appartient à l'hôte |
| {0} is choosing. | {0} choisit. |
| Only the host can choose. You see what they see. | Seul l'hôte peut choisir. Vous voyez ce qu'il voit. |
| Playing together | Jouer ensemble |
| {0} hits you for {1}. | {0} vous frappe pour {1}. |
| You miss {0}. | Vous manquez {0}. |
| Your blow lands on {0} for {1}. | Votre coup touche {0} pour {1}. |
| Your swing finds nothing but air. | Votre coup ne trouve que le vide. |
| No ammunition. | Plus de munitions. |
| You destroy {0}. | Vous détruisez {0}. |
| You reach level {0}. | Vous atteignez le niveau {0}. |
| You sing the tending note, low. Something knits. | Vous chantez la note de soin, tout bas. Quelque chose se referme. |
| You sing the falling fifth. {0} of them stop for a breath. | Vous chantez la quinte descendante. {0} d'entre eux s'arrêtent le temps d'un souffle. |
| You open your mouth and nothing comes out. The air here cannot carry it. | Vous ouvrez la bouche et rien n'en sort. L'air ici ne peut pas le porter. |
| Your voice is torn. There is nothing left in it. | Votre voix est déchirée. Il n'y reste plus rien. |
| Loot by turns: you get {0}. | Butin à tour de rôle : vous recevez {0}. |
| {0} sovereigns | {0} souverains |

[PROPOSED] Level cap for an imported character: 30 (Book One reaches the low teens).

---

## P19 FINISH — new player-visible text [PROPOSED]
All shown through msg() / textContent. French in tools/i18n/p19-sync.tsv and p19-net.tsv (merged into locales/story/fr.json).

Guest side, while joined (js/sync19.js TX):
- noRest: "This is your companion's road: you rest when {0} rests." ({0} = the host's name)
- noItem: "Your pack waits for your own road. Here you carry only what you fight with."
- noLoad: "Loading waits until you are back on your own road."
- noNeeds: "Food and sleep wait for your own road; on your companion's you keep pace with them."
- goHome (Options button replacing "Return to title"): "Part ways and go home"

Lobby (js/net19.js TX.manP, changed for the TURN relays):
- "No matchmaker needed: you swap two codes through any message app. It works at home or on mobile data."
  (was "... It works best when both of you are on the same network.")
- error text (not translated, as before): "No connection: try again, or make new codes"
