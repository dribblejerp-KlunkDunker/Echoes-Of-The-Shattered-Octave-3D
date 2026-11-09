# Glossaire français — Echoes of the Shattered Octave (Book One)

Registers
- Narration and the player: present tense, "vous". Never agree an adjective or participle with the player (gender unknown): rephrase.
- Office / Synod dialect: flat, administrative, euphemistic ("traité", "affecté", "noté", "rapproché", "restitution administrative"). Never a verb with a person as its object.
- Reach folk speech: plain, rural, short. Greeting "Ça sonne ?" / "Assez juste."; curse "Sève et échardes."; "off-reed" = "désaccordé" (untrustworthy).
- "tu" (rough or intimate speakers, consistently per character): Vane, Mags, Pim, Nell, the Carder children, Tobin's Wearer, Kaelen with Lyra and Lyra with Kaelen, Sable with nobody (always "vous"), Hob Wendle, Old Tam to children only. Everyone else says "vous" to the player.
- Typography is normalised by tools/i18n/merge.js: « guillemets », no-break spaces before : ; ! ?, typographic apostrophes. Write plain " and ' in the sources.

World terms
| English | Français |
|---|---|
| the Anchors / an Anchor | les Ancres / une Ancre (l'Ancre de la Croissance, de la Chaleur, de la Masse, du Temps, de la Lumière, de la Vélocité, de la Mémoire, du Déclin et du Silence) |
| the Octave / the ninth | l'Octave / la neuvième |
| the Hush | le Silence (capital S; plain "silence" stays lowercase) |
| the Quiet (creature, Null-Watch) | le Calme / un Calme (Quiets: des Calmes); Quiet Faith: la Foi du Calme; Merciful Quiet: le Calme miséricordieux |
| the Cacophony | la Cacophonie (Cacophony Hound: Chien de Cacophonie; Swarm: Essaim de Cacophonie) |
| the Hollows / a Hollow | les Creux / un Creux |
| Light-glass / Aether-Glass | verre-de-lumière / verre d'éther |
| glassing, glassed, tideline | vitrification, vitrifié, ligne de marée |
| the Synod, the Iron Synod | le Synode, le Synode de Fer (Synod Reckoning, SR: Compte synodal, CS) |
| the Office of the Catalogue | l'Office du Catalogue (the Catalogue: le Catalogue) |
| Proctor / Legionnaire / Carillon Legion | Procureur / Légionnaire du Carillon / Légion du Carillon |
| Cantor / Choir-Church / Pure Note | Chantre / Église-Chœur / la Note pure |
| Flambeaux | les Flambeaux (Flambeau Penitent: Pénitent Flambeau) |
| Arbiterium / Arbiter | l'Arbiterium / Arbitre |
| the Consortium (of Bores), bore | le Consortium (des Forages), forage |
| the Narrow | l'Étroit |
| the Hedge | la Haie |
| hush-lamp | veilleuse |
| hush-cloth | étoffe sourde |
| the Root, Root-vault, Root Note | la Racine, le caveau de la Racine, la Note-racine |
| the Reach, the Resonant Reach | les Confins, les Confins résonants |
| Song(s) (magic), Song-book | Chant(s), Livre de chants |
| Voice (resource) | Voix |
| sovereigns | souverains (sov. → souv.) |
| Logbook, Ledger, Rite, Rest | Journal de bord, Registre, Rite, Repos |
| Governor, Surgeon-Grafter, Grafters | Gouverneur, Chirurgien-Greffeur, Greffeurs |
| burl-sick | atteints de loupe (les loupeux) |
| Tongueless, Free Captains, Veil | les Sans-Langue, les Capitaines libres, le Voile |
| Drift-Kestrel | la Crécerelle (de dérive) |
| days | Nuldi, Racinedi, Âtredi, Massedi, Stasedi, Aubedi, Dérivedi, Mémoiredi |
| months (Harvestmonth, Ashfall, Frostmonth, Stillmonth) | Moisson, Chute des cendres, Mois du givre, Mois d'accalmie (author-approved, October 2026) |
| Brood-Mother, Wearer, Weaver | la Mère-Couvée, le Porteur, la Tisseuse |
| Iron Peaks, Spectral Woods, Deep Woods | les Pics de Fer, les Bois spectraux, les Bois profonds |

Kept as they are: personal names, Oakhaven, Whisper-Grove, Cinderhold, Fortis, Port Cantabile, Null-Watch, the Organum, Sol-Luminary, Aethelgard, Hz, SR dates.
Epithets are translated: "Old Harrow, gate-warden" -> "Le vieux Harrow, gardien de la porte".

Names that go into sentences carry a gender code after "|" in the catalogue: m, f, mp, fp; add "*" (m*, f*) when the first letter is an aspirated h or an elision is wrong. French patterns use {0:le} {0:un} {0:du} {0:au} {0:de} to take the right article ("l'épée courte", "du Tonique de Bettany"); the first letter is lowercased unless the code ends in "^".
| the Silencing (the event of 416) | la Mise au silence |
| Titan's Spine / Lodestone Vaults / Compact of Stone | l'Épine du Titan / les Caveaux de magnétite / le Pacte de Pierre |
| the Rift | la Faille (Null-Watch stays) |
| Reach (the region) | les Confins |

Interface and run-time decisions
| English | Français |
|---|---|
| dialogue tones Polite / Normal / Blunt | Poli / Normal / Brusque (keyed by data-t: "Blunt" the weapon skill stays "Contondant") |
| AR (armour rating) | VA (valeur d'armure); the Character panel says "Valeur d'armure", the Inventory header "Indice d'armure" (menu catalogue) |
| Hush-whistle, hush-lamp | sifflet de silence, veilleuse |
| weather: clear, overcast, rain, storm, mist, snow | dégagé, couvert, pluie, orage, brume, neige |
| compass W, SW, NW (canvas only) | O, SO, NO |
| Voices menu: Off / Grunts / Voiced / Voiced + read aloud | Désactivé / Grognements / Avec voix / Avec voix + lecture à voix haute |
| document kinds (reading.js) | Registre, Dépêche, Inscription, Journal, Lettre, Note de service, Avis, Ordre, Ordre du service, Brochure, Transcription, Volume, Dossier de l'Office, Mandat du Synode |
| Boar & Bell / Boar & Dulcimer | the source uses both; French follows each: Sanglier & Cloche / Sanglier & Tympanon |
| bestiary placeholder "??? (hound)" | "??? (chien)": the enemy id, translated |

Left in English on purpose (see node tools/i18n/coverage.js --list): personal names, CSS and debug strings, mod editor and
the credits tables (audit text), keys on the Key Rebinding screen, recorded voice lines, speech synthesis (read aloud)
which reads the English line, and the language names themselves.
