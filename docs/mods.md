# Mods: data-only dungeons, enemies, items, NPCs and quests

Echoes of the Shattered Octave can load small, **versioned, data-only mods**. A mod is one JSON file. Nothing in it is ever executed, and the game refuses anything it does not recognise. This page is the schema reference, a worked example, the safety rules and a guide to the built-in dungeon editor.

- Code: `js/mods.js` (validator, library, panels, editor). Tests: `test/mods.test.js`.
- Schemas (JSON Schema 2020-12, the validator is the authority): `schemas/mod.v1.json`, `schemas/map.v1.json`, `schemas/enemy.v1.json`, `schemas/quest.v1.json`.
- Current format: **schemaVersion 1**. A file with any other `schemaVersion` is rejected, so a future format can never be half-read by an older game.

## Using mods in the game

1. Open **Options** (Esc), then **Mod dungeons**.
2. **Import a mod**: choose a `.json` file or paste its text, then *Import*. The text is validated first. If anything is wrong you get a list of messages and **nothing is installed**.
3. Each installed mod can be **Enabled / Disabled**, **Removed** or **Exported**. A mod's dungeons have an **Enter** button. You step in at the dungeon's start; its exit door (the `X` cell) puts you back exactly where you were (or at the Oakhaven gate if that place no longer exists).
4. **Open the dungeon editor** builds or edits a dungeon with the same schemas (see below).

Mods live in your browser's `localStorage` (key `octave.mods.v1`), capped at 12 mods and about 786 thousand characters in total. They are re-validated every time they are loaded. Entering mod dungeons is unavailable in hardcore runs, while in custody, and while the town is in danger (the escape timer or the bore hold is running).

### Saves and mods

Nothing is added to the save format. A mod dungeon's state travels in the ordinary per-map section of a save, and a mod's flags live in `G.flags` under the `mod:` prefix.

- Save inside a mod dungeon, then load with the mod **present and unchanged**: you resume in the dungeon.
- Load with the mod **missing, disabled or changed** (its content hash no longer matches): the dungeon's saved state is dropped and you wake at the entrance you came in by, with a message. The rest of the save is untouched.
- A save made anywhere else never needs a mod, and loads the same with or without any mod installed.

## File format: `mod.v1`

```jsonc
{
  "schemaVersion": 1,            // must be exactly 1
  "id": "ember_crypt",           // 3-24 chars: a-z 0-9 _, starts with a letter. Namespaces everything.
  "version": "1.0.0",            // major.minor.patch
  "name": "The Ember Crypt",     // text, 1-40
  "author": "Test Author",       // text, 1-40
  "description": "...",          // optional text, up to 200
  "maps":    [ ...1 to 3 map.v1... ],
  "enemies": [ ...up to 8 enemy.v1... ],     // optional
  "items":   [ ...up to 16 items... ],       // optional
  "npcs":    [ ...up to 8 NPCs... ],         // optional
  "quests":  [ ...up to 8 quest.v1... ]      // optional
}
```

Unknown fields anywhere are **errors**, not ignored. Local ids (`id` fields inside a mod) are lowercase `a-z 0-9 _`, starting with a letter, up to 24 characters. The game registers them as `mod:<modid>:<id>` (maps, enemies, items, NPCs) and sets quest flags only under `mod:<modid>:`. Inside the file you always write the short local id.

### Text fields

Every text value is trimmed, whitespace-collapsed and length-limited (names 40, descriptions 200, dialogue and journal lines 300). The characters `< > &`, backtick, backslash, control characters and bidirectional overrides are refused, as are `javascript:` style addresses. Text is only ever shown as text.

### Numbers

Structural numbers (map size, coordinates, ids of cells) out of range are **errors**. Stat-like numbers (enemy hp, damage, speed, gold, radii, ambient light, fog) out of range are **clamped** into range and reported as a warning, so a mod that asks for 99999 hit points gets 250, not a rejection. A value that is not a number at all is always an error.

### Map (`map.v1`)

| Field | Type | Notes |
|---|---|---|
| `id` | local id | unique within the mod |
| `name` | text | shown on entry |
| `w`, `h` | integer 8-40 | size in cells |
| `floor` | one of `t_flag t_cobble t_grass t_wood t_moss t_stone t_marble t_greymarble` | default `t_flag` |
| `ceil` | one of `t_stone t_wood c_beams c_vault c_rock`, or `null` | default `t_stone` |
| `walls` | list of up to 8 wall textures | `t_stone t_wood t_house t_roof t_hedge t_cobble t_glassrock t_marble t_brass t_greymarble t_catacomb t_mausoleum t_deepwood t_moss`, no repeats |
| `rows` | `h` strings of exactly `w` characters | see below |
| `ambient` | 0-0.5 (clamped) | default 0.18; higher is brighter |
| `fog` | 4-24 (clamped) | view distance, default 12 |
| `music` | `dungeon inside cloister mausoleum root` | default `dungeon` |
| `startDir` | 0, 90, 180 or 270 | degrees; 0 faces east |
| `entities` | up to 80 | see below; at most 40 enemies |

Characters in `rows`: `.` open floor, `1`-`8` a wall using that entry of `walls` (1 = first), `D` an openable door, `S` the start (exactly one), `X` the exit door (exactly one). The exit must be reachable from the start by walking through `.`, `D`, `S` cells, otherwise the map is refused, so a player can never be trapped. On import the wall list is rewritten into a canonical order (only used textures, in catalog order) so that an editor export always equals the import.

Entities (`x`, `y` are world coordinates, 0.5-(w-0.5); they must lie in an open `.` or start cell):

| `kind` | other fields |
|---|---|
| `enemy` | exactly one of `type` (a base enemy, see below) or `modEnemy` (this mod's enemy id) |
| `item` | exactly one of `item` (a game item mods may place: healing, voice, ammunition, valuables, sovereigns) or `modItem` |
| `prop` | `sprite`: `lamp crates bones chair table bed shelf hearth pump sign chest basin campfire grave cores gear web tomb oak` |
| `npc` | `npc`: this mod's NPC id |

### Enemy (`enemy.v1`)

An enemy is a **variant of an existing behaviour type**: it keeps its base's sprite, senses, attacks and Song interactions, and only its numbers and name change.

| Field | Notes |
|---|---|
| `id`, `name` | local id, text |
| `base` | one of `hound legionnaire golem proctor mites quiet weaverling drowned marine dirge warden tongueless outrider hushwarden hushmoth deacon captain` (bosses and special-cased enemies are not offered) |
| `hp` | 1-250 (clamped) |
| `dmg` | `[low, high]`, each 0-30 (clamped, swapped if reversed) |
| `speed` | 0.3-2.6 (clamped) |
| `reach` | optional, 0.7-1.8 |
| `scale` | optional multiplier on the base's size, 0.5-1.5 |
| `xp` | optional, 0-200 |
| `desc` | optional text |

### Items and NPCs

Items: `id`, `name`, `desc`, `kind` (`trinket` sellable valuable with `value` 1-50; `tonic` heals `n` 1-30; `draught` restores `n` voice; `key` a quest item), optional `sprite` (`loot gear chest coil cores`). NPCs: `id`, `name`, `sprite` (`townsman townswoman hetty hob nell orla aldric tam bettany pim harrow tongueless`), `portrait` (`townsman townswoman harrow hetty hob mags nell orla pim tam quist wren aldric bettany rooke tongueless`), `greet` (one line of text). All art references must be names the game already has; there is no way to bring in new images or sounds.

### Quest (`quest.v1`)

A quest is a list of **rules**: *when* a trigger happens (and an optional flag condition holds), run up to six **effects**.

```jsonc
{ "id": "lamp", "title": "The Cursed Lamp", "rules": [
  { "id": "warden_talk",
    "when": { "type": "talk", "npc": "warden" },
    "if":   { "flag": "warned", "is": false },     // optional: one of this mod's flags
    "once": true,                                      // default true
    "then": [ { "do": "say", "text": "..." }, { "do": "setFlag", "flag": "warned" } ] }
] }
```

| Trigger (`when.type`) | Fields | Fires |
|---|---|---|
| `enter` | `map`, `x`, `y`, `r` (0.5-8, default 1.5) | when you walk into the circle inside that mod map |
| `talk` | `npc` | when you talk to that mod NPC (its `say` lines become what it says) |
| `pickup` | `item` (game item) or `modItem` | when you pick that item up inside this mod's dungeons |

| Effect (`do`) | Fields |
|---|---|
| `journal` | `text`: adds a logbook line (category "side") |
| `say` | `text`: the NPC's reply for a `talk` rule, a message otherwise |
| `give` | `item` (game healing/voice/ammunition/valuable item, never a key, weapon or armour) or `modItem`, `n` 1-3 |
| `gold` | `amount` 1-50 |
| `setFlag` | `flag`: sets `mod:<modid>:f_<flag>` |
| `spawn` | `map`, `type` or `modEnemy`, `x`, `y`: an enemy appears if you are in that map and the cell is open |

Rules that `give`, `gold` or `spawn` must be `once: true` (the default), so a mod cannot farm items or enemies. A rule only runs while you are inside that mod's own dungeons, so no mod can fire rules in the base game. At most 32 distinct flags and 16 rules per quest.

## Worked example

This is a complete, valid mod (the test suite loads exactly this text):

<!-- example:start -->
```json
{
  "schemaVersion": 1,
  "id": "ember_crypt",
  "version": "1.0.0",
  "name": "The Ember Crypt",
  "author": "Test Author",
  "description": "A small crypt with a cursed lamp.",
  "maps": [
    {
      "id": "crypt",
      "name": "Ember Crypt",
      "w": 16,
      "h": 12,
      "floor": "t_flag",
      "ceil": "t_stone",
      "walls": [
        "t_catacomb",
        "t_stone"
      ],
      "rows": [
        "2222222222222222",
        "2S...1.....1...2",
        "2....1.........2",
        "2....D.....1...2",
        "2....1.....1...2",
        "2111.1111D11...2",
        "2..............2",
        "2.....1111.....2",
        "2.....1..1.....2",
        "2.....1..1...X.2",
        "2.....1111.....2",
        "2222222222222222"
      ],
      "ambient": 0.2,
      "fog": 10,
      "music": "dungeon",
      "startDir": 0,
      "entities": [
        {
          "kind": "enemy",
          "modEnemy": "ashhound",
          "x": 8.5,
          "y": 2.5
        },
        {
          "kind": "enemy",
          "type": "mites",
          "x": 12.5,
          "y": 6.5
        },
        {
          "kind": "item",
          "item": "tonic",
          "x": 3.5,
          "y": 6.5
        },
        {
          "kind": "item",
          "modItem": "emberkey",
          "x": 13.5,
          "y": 2.5
        },
        {
          "kind": "prop",
          "sprite": "lamp",
          "x": 2.5,
          "y": 2.5
        },
        {
          "kind": "npc",
          "npc": "warden",
          "x": 3.5,
          "y": 3.5
        }
      ]
    }
  ],
  "enemies": [
    {
      "id": "ashhound",
      "base": "hound",
      "name": "Ash Hound",
      "hp": 24,
      "dmg": [
        2,
        6
      ],
      "speed": 2.0,
      "scale": 1.1,
      "xp": 15,
      "desc": "A hound of cinders."
    }
  ],
  "items": [
    {
      "id": "emberkey",
      "name": "Ember Key",
      "desc": "Warm to the touch.",
      "kind": "key"
    }
  ],
  "npcs": [
    {
      "id": "warden",
      "name": "Crypt Warden",
      "sprite": "townsman",
      "portrait": "townsman",
      "greet": "Mind the dead. They mind you."
    }
  ],
  "quests": [
    {
      "id": "lamp",
      "title": "The Cursed Lamp",
      "rules": [
        {
          "id": "enter_hall",
          "when": {
            "type": "enter",
            "map": "crypt",
            "x": 8.5,
            "y": 2.5,
            "r": 2.5
          },
          "then": [
            {
              "do": "journal",
              "text": "The crypt is warm and something breathes in the ash."
            }
          ]
        },
        {
          "id": "warden_talk",
          "when": {
            "type": "talk",
            "npc": "warden"
          },
          "then": [
            {
              "do": "say",
              "text": "Take the key from the far wall, and the exit will not trouble you."
            },
            {
              "do": "setFlag",
              "flag": "warned"
            }
          ]
        },
        {
          "id": "key_got",
          "when": {
            "type": "pickup",
            "modItem": "emberkey"
          },
          "then": [
            {
              "do": "journal",
              "text": "I have the Ember Key."
            },
            {
              "do": "gold",
              "amount": 10
            },
            {
              "do": "spawn",
              "map": "crypt",
              "modEnemy": "ashhound",
              "x": 4.5,
              "y": 8.5
            }
          ]
        }
      ]
    }
  ]
}
```
<!-- example:end -->

## The dungeon editor

Options, Mod dungeons, *Open the dungeon editor*. It needs a window of at least 900 by 560 pixels (smaller windows show a "use a larger window" notice).

- **Grid**: click or drag to paint with the chosen tool. Keyboard: arrow keys move the cursor, Enter applies the tool, Delete removes things on the cell.
- **Tools**: Wall (pick a texture), Floor (erase to open floor), Door, Start, Exit, Enemy, Item, Prop, NPC (when the draft has NPCs) and *Remove things*. Start and exit each exist exactly once; moving one removes the old one.
- **Fields**: name, author, mod id, size (8-40), floor, ceiling, music, facing.
- **Live validation**: the messages under the grid are the real validator's. Preview, Playtest, Export and Add to my mods are disabled while the draft has errors.
- **Preview** renders the draft with the game's own renderer from the start cell, looking four ways, without moving you.
- **Playtest** really enters the draft with your character (a throwaway copy, not added to your mods). Use its exit door to come back to the editor with your draft intact.
- **Export** downloads `<modid>.mod.json`; **Import** (file or paste) validates and loads a mod into the editor. Export then Import gives back exactly the same mod. Enemies, items, NPCs, quests and extra maps in an imported mod are kept and exported unchanged.
- **Add to my mods** installs the draft into your library.
- The draft is remembered in `localStorage` (`octave.mods.draft.v1`), re-validated when loaded.

## Safety rules (what the validator and loader guarantee)

1. **No code path from content to execution.** `js/mods.js` has no `eval`, no `Function`, no dynamic `import`, no `setTimeout` with strings, no `innerHTML` built from mod data. Effects are chosen from a fixed list of six built-in actions.
2. **Allow-lists everywhere.** Unknown keys are errors; keys named `__proto__`, `constructor` or `prototype` anywhere are errors; only plain JSON values are accepted; nesting depth, node count, list lengths and string lengths are capped; files over 131072 characters are refused before parsing.
3. **Rebuild, never reuse.** The validator builds a fresh copy of the mod from the fields it understands. Only that copy is stored, exported, or used to build a map.
4. **Text is text.** Markup characters are refused, and every place that shows mod text uses `textContent` (the game's own dialogue panel, which uses markup, only ever receives text that passed that rule).
5. **Catalog-only references.** Textures, sprites, portraits, music, base enemies and game items must be names from fixed lists that are also checked against the engine's live tables.
6. **Bounded numbers.** Sizes and coordinates are range-checked; stats are clamped; gold, item counts, spawn counts and enemy counts are capped; item-giving and spawning rules fire once.
7. **Namespaces.** Registered ids are `mod:<modid>:<id>`; flags are `mod:<modid>:...`; a mod can never overwrite a base enemy, item, NPC, map or flag, and its rules never run outside its own dungeons.
8. **Saves stay independent.** Mod state in a save is validated and discarded unless the mod is present and unchanged; the return point is range-checked and falls back to the Oakhaven gate. A hostile save cannot make the game build markup or load a mod map from its contents.
9. **Library is untrusted too.** What is read back from `localStorage` is validated again; entries that fail are dropped.

## Validation messages

Messages are `<path>: <problem>`, for example `$.maps[0].rows: the exit cannot be reached from the start` or `$.enemies[0].base: must be one of: hound, legionnaire, ...`. `$` is the file; paths use `.field` and `[index]`. At most 40 messages are shown.

## Changing the format

Additions that old games can safely ignore do not exist: unknown fields are refused. So any change to the format bumps `schemaVersion` and gets new `*.v2.json` schemas; the game then keeps reading v1 files through an upgrader or refuses them with a clear message, never guesses.
