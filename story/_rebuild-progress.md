# Handoff: finish the bundle + GitHub rebuild

*Written 19 Oct 2026 by the session that pushed commits 979b0c6 and c242dfe.*

## The goal

Get every piece of written work for *Echoes of the Shattered Octave* into two places:
this repo (durable, the point of the exercise) and a packaged zip of markdown + PDFs for
sleeves to download. Nothing is to be lost.

## Already done — do not redo

Pushed to `main` under `story/`:

- `Books/Book One - The Silenced Province/` — full manuscript + all 26 chapters split out
- `Books/Book Two - The Great Discord/Part One Ch1-3.md`
- `World Bibles/Series Bible (canon).md`
- `World Bibles/Vol VII - The Calendar of Aethelgard.md`
- `Source Material/` — the four original source documents, unedited, plus a README
- `tooling/vite-scaffold/` — build scaffold salvaged from the retired
  `The-Shattered-Octave-Updated-` repo (that repo holds nothing else unique; sleeves will
  delete it himself — repo deletion is blocked from these sessions)

## The 16 project docs — ALL DONE (19 Oct 2026)

They live in the attached claude.ai Project "Shattered Octave", not on disk. Fetch each with
the `Projects` tool, `method: "project_read"`, using the exact path.

**Known constraint, learned the hard way: subagents in this environment do NOT get the
`Projects` tool.** Fetching cannot be delegated — the main session must do it. Each doc costs
roughly 25k tokens round trip (it returns inline, then you write it to disk). Budget for that,
work in small batches, and commit + push after each batch so progress survives a compaction.

- [x] `claude/Book Two - Part One Ch4-7.md`
- [x] `claude/Book Two - Part Two Ch8-14.md`
- [x] `claude/Book Three - Part One Ch1-4.md`
- [x] `claude/Book Three - Part Two Ch5-8.md`
- [x] `claude/Book Three - Part Three Ch9-12.md`
- [x] `claude/Book Four - Part One Ch1-4.md`
- [x] `claude/Source - The Expanded World Bible.md`
- [x] `claude/Source - World Bible Vol II - Gazetteer and Bestiary.md`
- [x] `claude/Source - World Bible Vol III - Canon Reconciliation and the Road to Book Five.md`
- [x] `claude/World Bible Vol III - Errata and Rulings.md`
- [x] `claude/Source - World Bible Vol IV - The Hush, the Organum, the Rust Coast.md`
- [x] `claude/World Bible Vol V - The Winter Gazetteer.md`
- [x] `claude/World Bible Vol VI - The Rift, the Organum Revisited, and the Press.md`
- [x] `claude/Game Design Document - Book One Prototype.md`
- [x] `claude/Game - Phase 6 New In-Game Text (for review).md`
- [x] `claude/Game - Phase 9 New In-Game Text (for review).md`

Write each verbatim — these are novel drafts, so no summarising, no reflowing, no tidying.
Preserve every line and blank line exactly.

## Where each one goes in this repo

| Project doc | Repo path under `story/` |
|---|---|
| Book Two Part One Ch4-7 | `Books/Book Two - The Great Discord/Part One Ch4-7.md` |
| Book Two Part Two Ch8-14 | `Books/Book Two - The Great Discord/Part Two Ch8-14.md` |
| Book Three Part One/Two/Three | `Books/Book Three/Part One Ch1-4.md`, `Part Two Ch5-8.md`, `Part Three Ch9-12.md` |
| Book Four Part One | `Books/Book Four/Part One Ch1-4.md` |
| The Expanded World Bible | `World Bibles/Vol I - The Expanded World Bible.md` |
| Vol II Gazetteer and Bestiary | `World Bibles/Vol II - Gazetteer and Bestiary.md` |
| Vol III Canon Reconciliation | `World Bibles/Vol III - Canon Reconciliation and the Road to Book Five.md` |
| Vol III Errata and Rulings | `World Bibles/Vol III (b) - Errata and Rulings.md` |
| Vol IV The Hush, the Organum, the Rust Coast | `World Bibles/Vol IV - The Hush, the Organum, the Rust Coast.md` |
| Vol V The Winter Gazetteer | `World Bibles/Vol V - The Winter Gazetteer.md` |
| Vol VI The Rift, the Organum Revisited, and the Press | `World Bibles/Vol VI - The Rift, the Organum Revisited, and the Press.md` |
| Game Design Document | `Game Layer/Game Design Document - Book One Prototype.md` |
| Phase 6 in-game text | `Game Layer/Phase 6 - New In-Game Text.md` |
| Phase 9 in-game text | `Game Layer/Phase 9 - New In-Game Text.md` |

### Added beyond the checklist

The Project kept growing after this note was written. Everything below postdates the 16-doc
list and has been pulled verbatim and pushed, so nothing is lost. All of it is flagged for
sleeves to confirm.

Second pass — ALL DONE (22 Oct 2026):

- [x] `claude/Game - Phase 10 New In-Game Text (for review).md` → `Game Layer/Phase 10 - New In-Game Text.md`
- [x] `claude/Game - Phase 11 New In-Game Text (for review).md` → `Game Layer/Phase 11 - New In-Game Text.md`
- [x] `claude/Game - Phase 12 New In-Game Text (for review).md` → `Game Layer/Phase 12 - New In-Game Text.md`
- [x] `claude/Game - Phase 13 New In-Game Text (for review).md` → `Game Layer/Phase 13 - New In-Game Text.md`
- [x] `claude/Game - Phase 14 New In-Game Text (for review).md` → `Game Layer/Phase 14 - New In-Game Text.md`
- [x] `claude/Game - Phase 15 New In-Game Text (for review).md` → `Game Layer/Phase 15 - New In-Game Text.md`
- [x] `claude/Game - Phase 16 New In-Game Text (for review).md` → `Game Layer/Phase 16 - New In-Game Text.md`
- [x] `claude/Game - Phase 17 New In-Game Text (for review).md` → `Game Layer/Phase 17 - New In-Game Text.md`
- [x] `claude/Game - Phase 18 New In-Game Text (for review).md` → `Game Layer/Phase 18 - New In-Game Text.md`
- [x] `claude/Game - Phase 19 New In-Game Text (for review).md` → `Game Layer/Phase 19 - New In-Game Text.md`
- [x] `claude/Game - Phase 20 New In-Game Text (for review).md` → `Game Layer/Phase 20 - New In-Game Text.md`
- [x] `claude/Game - Phase 21 New In-Game Text (for review).md` → `Game Layer/Phase 21 - New In-Game Text.md`
- [x] `claude/World Bible Vol VII Addendum - Festivals of the Reach.md` → `World Bibles/Vol VII (b) - Addendum - Festivals of the Reach.md`
- [x] `Echoes of the Shattered Octave: Graphics Upgrade and View-Distance Roadmap.md` → `Game Layer/Graphics Upgrade and View-Distance Roadmap.md`

Two notes for whoever picks this up next:

- The Graphics Roadmap is the one Project doc with **no `claude/` prefix** — it sits at the
  Project root. Use the exact path above or `project_read` will miss it.
- The Vol VII addendum is named `Vol VII (b) - ...` to match the existing
  `Vol III (b) - Errata and Rulings.md` convention: a `(b)` suffix means a companion piece to
  the volume of the same number, not a second volume.

The phase docs now run 6, 9, 10–21 with no gaps apart from 7 and 8, which have never existed
in the Project. If a Phase 22 appears, it goes to `Game Layer/Phase 22 - New In-Game Text.md`
and gets a line here.

## Then: the zip for sleeves

`story/tools/build_bundle.py` builds PDFs from markdown with wkhtmltopdf and stamps page
numbers with pypdf + reportlab. **It was written for the previous session's container and its
`ROUTES`/`main()` expect docs in `/mnt/user-data/outputs/projectdocs/` and an existing bundle
folder to restructure. In a fresh container neither exists, so adapt it:** point it at the
repo's `story/` tree as input, write PDFs beside each markdown file (or into a build dir), then
zip markdown + PDFs as `Shattered Octave Books.zip` and send it with `SendUserFile`.

Notes on the PDF build that are worth keeping: wkhtmltopdf's `--footer-center [page]` is
silently ignored by the installed unpatched-Qt build, which is why page numbers are stamped
afterwards; `pip install` needs `--break-system-packages`; Letter page size with 22/20/24/24mm
margins and DejaVu Serif 11.5pt justified is the house style, with a page break before each
`h2`.

## Standing decisions, so nothing gets re-litigated

- Books go in **this public repo** — sleeves was told plainly the drafts become publicly
  readable and chose it anyway. Don't reopen it.
- Markdown is the source of truth; PDFs are generated artifacts.
- Canon: the trilogy ends on the **Resonant Accord**; character deaths follow **no death
  without an heir**; Book Two's action register is **kinetic, legible, lethal**. All three are
  written up in the Series Bible.
- Where a world bible and the Source Material disagree, the Source Material is ground truth.
