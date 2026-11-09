# Phase 24 — The opening

*Written for review, Oct 2026. The code is `js/cinematic24.js`.*

## What is new, in short

A new game now opens on a camera sequence through the game's own maps before the first step, in the player's own renderer and preset, with an original score under it and the lines spoken: a narrator (an older man, grave and unhurried) reads the six paragraphs the game always opened with (`INTRO`, `js/data.js`, unchanged, already in French), and the people in the shots speak. The shots:

0. Black. The Catechism of the Pure Note, as the Prologue's epigraph has it: Ignatius Crane asks *What is holiness?* and the congregation answers *One note, held without end.*; *What is sin?* — *The second note.* A low F and a bell under it.
1. *It is autumn, in the four hundred and nineteenth year…* Wethercombe from Hob's Knap, the sun on the west ridge.
2. *You have come up the Greenroot road to Oakhaven…* the road outside the Hedge at dusk, to the North Gate.
3. *Too loud brings the hounds. Too still brings the Hush.* the Deep Woods at night: three hounds come into a hush-lamp's light; then the picture drains grey as the camera stops.
4. *The Church is coming up the road behind you, singing under glass-fire…* the Synod column through Greenroot: the Flambeau with his lantern, the Herald, ten Proctors two abreast with censers of glass-fire between the files; the Pure Note (528 Hz) sounds under the music. As the narrator finishes, Ignatius speaks over the column: *One note. One law. One hand.* (the Prologue, the three hundredth sunrise), and the score answers with the Pure Note itself, C in octaves and nothing else.
5. *Nobody has rung a bell in Oakhaven…* the east street at dusk, lamps lit, the moon up.
6. Black; the title card (the title screen's own sigil and words).
7. The North Gate, Old Harrow before you: the first frame of play. He speaks the two lines below; the second carries the old intro's last words, *Keep your voice in your chest.*

No story fact is added or changed. The column is staged from the game's own sprites and removed afterwards; the Flambeau's presence on the road nine days before the Rite follows the intro's own line ("The Church is coming up the road behind you").

## New text [PROPOSED]

Two spoken lines for Old Harrow at the gate (`voices/script.json`, `harrow.open.0` and `.1`; captions in `js/cinematic24.js`). Everything else spoken is the game's own text: the five narrated paragraphs are `INTRO[0..4]`, the catechism is the Prologue's epigraph, *One note. One law. One hand.* is Ignatius's in the Prologue.

| Key | Text |
|---|---|
| Old Harrow, at the gate | You came up the Greenroot road? Then you heard what's behind you, singing. |
| Old Harrow, at the gate | Keep your voice in your chest, friend. And welcome to what's left of Oakhaven. |
| Caption labels | Ignatius Crane · The congregation · Old Harrow |
| Options row | Opening cinematic — *the flight over the Reach before a new game* (On / Off) |
| Options row | Watch the opening again — Play |
| Intro button, while it runs | Skip |

French for all of it is in `tools/i18n/p24-voices.tsv` (Harrow addresses the player as *vous*, as the gate-warden does elsewhere).

## The voices and the score

- **Narrator**: Kokoro-82M, voice `bm_daniel` slowed and pitched down a little, with a hall (`tools/voices/cast.py`, `narrator`): the owner chose it from four auditions. Ignatius, the congregation (the `chorus_congregation` chorus) and Harrow are their existing casts.
- **Score**: `music/opening.mp3`, written in `tools/music/pieces/opening.py` to the shot timings (a beat is a second; no rubato, so the cues land): the F drone and bell under the catechism, harp and solo cello in the combe, the strings' climb to the G that is left ringing when the woods cut in, the tremolo and roll the Hush stops dead, the processional with bass drum, trombones, horns and choir up to the Pure Note, oboe for the town with no bell, the full ensemble and bells on the name motif under the title, and a solo cello under Harrow. The tune is the main theme's. The music player ducks it under each line.
- The Voices setting (Options) governs the recorded lines; the captions show whatever the setting. Music follows the Music setting.

## Questions for sleeves

1. Should a later phase open on the Prologue itself (Solenne on the risers at the three hundredth sunrise, 412 SR) before this flight, or stay with the arrival at Oakhaven?
2. Harrow's two gate lines are new words in his mouth; keep, cut or reword?
3. The sequence is now about a minute and a half with the catechism and the spoken lines. Too long for a second playthrough? (It can be turned off, and skipped at any time.)
