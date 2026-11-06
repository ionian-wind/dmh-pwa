# Feature Proposals

Product-facing proposals that fit the existing local-first architecture. Each
entry describes the user value, a minimal scope, how it reuses current parts,
and a suggested priority.

Priority key: **P0** next release, **P1** near term, **P2** later, **P3**
exploratory.

---

## A. Session workflow

### A1. Campaign/session dashboard (P0)

**Value.** The Home page currently shows only entity counts and
backup/restore. A DM needs "what happened last time and what is next".

**Scope.**

- Recently edited notes/modules (last 24h/7d).
- Active combat (if any) and running timers with remaining time.
- Next session date/notes.
- Pinned module/bookmarks.
- Quick actions: new note, start combat, open jukebox.

**Implementation.** Home already loads six stores; add a `SessionSettings`
record (localStorage or a new `sessions` object store) for session date,
title, and checklist. Reuse `StatCard`/`BaseCard`.

**Acceptance.** Home renders without new network requests and links to every
item.

### A2. Session log with timeline (P1)

**Value.** Capture what happened between notes: encounters fought, XP/loot,
NPCs met, timers elapsed.

**Scope.** A new `Session` entity with `date`, `title`, `summary`,
`noteIds`, `encounterIds`, `combatIds`; a chronological view; "start session"
button that stamps created records.

**Implementation.** New store + schema + migrations; add `sessionId?` to notes
and combats (optional fields are schema-compatible).

### A3. Quick capture / command menu (P1)

**Value.** Fast keyboard-first workflow at the table.

**Scope.** `Ctrl/Cmd+K` menu: create note/character/monster/encounter,
navigate, run a timer, search across entities. Global shortcut.

**Implementation.** A Vue 3 command menu backed by a command registry, opened
through the hotkey service. Reuse `useModalState` and the router. See
[hotkeys-and-command-menu.md](hotkeys-and-command-menu.md) for the full design.
The linked `vue-cmd-menu` library is Vue 2 only and should be treated as UX
inspiration, not a dependency.

### A4. Undo for destructive actions (P1)

**Value.** Deletes currently cascade silently (or leave orphans) and there is
no recovery.

**Scope.** Toast with "Undo" for note/module/bookmark/track delete; soft delete
or a short-lived snapshot.

**Implementation.** Store the deleted record(s) in memory for the toast
duration; restore via `create`/`put`. Pairs with the integrity work in the
technical proposals.

### A5. Global hotkeys and shortcut customization (P1)

**Value.** A DM can run common actions without leaving the keyboard.

**Scope.** A scoped shortcut layer using `hotkeys-js`: global command menu and
shortcut help, editor save, list search, jukebox/ambient playback, and a
Settings recorder with conflict detection and reset.

**Implementation.** Register shortcuts through a single service rather than
individual key listeners. Inputs, textareas and contenteditable elements are
ignored by default. Persist overrides in `configStore`.
See [hotkeys-and-command-menu.md](hotkeys-and-command-menu.md).

### A6. Help center search (P2)

**Value.** The help center is growing; users should not have to browse folders
to find an answer.

**Scope.** Offline search over localized help titles, descriptions, headings and
body text, with ranked results and snippets. Search only the active locale,
with English fallback for untranslated pages.

**Implementation.** VitePress local search already covers the static help site.
The remaining work is an app-level “Search help” command and optional `?q=`
handoff. See [help-center-search.md](help-center-search.md).

---

## B. Notes and writing

### A7. Scribe and Play modes (P1)

**Value.** The app currently mixes preparation and session-running workflows.
A DM preparing a campaign needs authoring and organization; a DM running the
session needs fast access to combat, timers, scenes, search and prepared
content.

**Scope.** Add a persisted **Scribe / Play** mode switch. Scribe keeps the
current preparation-oriented navigation and Home; Play prioritizes session
tools, recent/pinned content and search. Play is a lens, not a separate data
set or permission level: editing and management remain available.

**Implementation.** Add `appMode` to `configStore`, a mode-aware navigation
config and a Play dashboard. Reuse existing routes and components; do not
duplicate `/scribe` and `/play` route trees. Pairs with the command menu and
global search. See [plans/scribe-and-play-modes.md](../plans/scribe-and-play-modes.md).

### B1. Restore the note metadata controls (done)

Module, tag, and note-type selectors are enabled in `NoteEditor`; notes can
also be converted between regular and document notes.

Remaining follow-up: a tag-chip filter bar and autocomplete in `NotesView`.

### B2. Note templates and note types (P1)

**Value.** `NoteType` and `NoteTypeField` are unused. They can power structured
notes (NPC, location, quest) with typed fields.

**Scope.**

- Note type picker (restored).
- A type editor with fields (`text`, `number`, `boolean`, date, select,
  multiselect).
- Render custom fields above the Markdown body and store them in
  `note.metadata`.
- Templates for session notes, NPCs, locations, quests, loot.

**Implementation.** Finish `NoteTypeSelector`, add a `NoteFieldsForm` based on
`types/forms/form-filed.ts` (already defined), store values under
`metadata.fields`.

### B3. Note linking improvements (P1)

**Value.** Entity links work but are hidden behind raw `kind://id` syntax.

**Scope.**

- `[[` autocomplete in raw mode (Milkdown already has a mention menu).
- Backlinks panel that actually works (fix the sidebar prop bug).
- "Unlinked mentions" (plain-text entity names) with a one-click link action.
- Character mentions (`kind: 'character'`) support.

**Implementation.** Extend the mention regex and index writer to all entity
kinds; add a backlink index (`target → sources`) to avoid the O(n) scan.

### B4. Note history / revisions (P2)

**Value.** Notes change during sessions; an accidental overwrite is
unrecoverable.

**Scope.** Keep the last N snapshots per note in a `note_revisions` store; a
diff/restore UI.

**Implementation.** On `update`, write the previous content if changed; prune by
age/count.

### B5. Markdown extras (P2)

**Value.** DMs commonly use stat blocks, callouts, and tables.

**Scope.** Callout blocks (`> [!note]`), stat-block styling, dice formulas
(`/roll 2d6+3`), image embeds from local files, checkbox progress summaries.

**Implementation.** markdown-it plugins + CSS; image handling can reuse the
file/Blob infrastructure.

---

## C. Campaign content

### C1. Rich character sheets (P1)

**Value.** Characters are name + notes today; encounters/combats cannot use
stats.

**Scope.** Level, class, race, background, AC, HP/max, speed, ability scores,
saving throws, skills, equipment, spells. Conditions in combat.

**Implementation.** Extend `PlayerCharacter` (schema-compatible optional
fields), add a tabbed character view, and use AC/HP in combat.

### C2. Rich monster stat blocks (P1)

**Value.** Monsters are name + notes; encounters cannot show AC/HP/attacks.

**Scope.** CR, AC, HP, speed, ability scores, attacks, traits, actions,
resistances, legendary actions, source/book reference.

**Implementation.** Extend `Monster` with optional fields; add an import format
(e.g., a JSON stat-block paste) later.

### C3. Encounter difficulty builder (P1)

**Value.** Encounters list monsters and counts only; no budget or difficulty.

**Scope.** Compute XP budget by party level/size, show easy/medium/hard/deadly,
suggest adjustments, save the computed rating.

**Implementation.** Add `level`/`size` to characters/party and a pure
`encounterBalance` utility; no new storage required for the calculation.

### C4. Combat tracker upgrades (P0/P1)

**Value.** The combat screen is the most-used "live" tool; turn/round state is
now persisted, but it still lacks HP, conditions, and a combat log.

**Scope (P0 — done).** Persist turn/round/postpone changes, resume from
`currentTurn`, previous turn, round counter.
**Scope (P1).** HP/damage/heal, temporary HP, conditions with durations,
concentration, death saves, dice rolls, undo, and combat log.
**Scope (P2).** Player-facing view, stat-block side panel, encounter link.

**Implementation.** Use the existing `combatStore` helpers, add a `CombatEvent`
log, and connect the WIP dice engine when it is ready.

### C5. Loot, XP, and rewards (P2)

**Value.** Sessions produce loot/XP that currently lives in free text.

**Scope.** Encounter/combat loot table, party inventory, XP award, level-up
hints, export to notes.

### C6. Random tables and generators (P2)

**Value.** The dice engine already supports tables; there is no UI.

**Scope.** Named tables (loot, weather, names, encounters), roll buttons,
results posted to a note or chat log. Reuse `plugins/tables` and the dice
engine.

### C7. Timeline / calendar (P3)

**Value.** Campaign chronology (in-world dates, sessions, events).

**Scope.** A calendar entity, events linked to notes/sessions, a simple
timeline view.

---

## D. Modules and books

### D1. Fix and expose module navigation (done)

**Value.** The TOC/bookmarks sidebar and export button were previously
unreachable.

**Status.** Slots are forwarded, the bookmark list has its `v-for`, the Book tab
reacts to tree/note changes, delete is confirmed, and heading anchors are
normalized.
export downloads a ZIP.

### D2. Module metadata and cover (P1)

**Value.** Modules show only a name and description.

**Scope.** Author, system, level range, cover image, status
(planning/running/completed), tags, session count, last played.

**Implementation.** Optional fields on `Module`; cover can reuse the picture
cache/Blob utilities.

### D3. Reading experience (P1)

**Value.** The book is a long virtualized list with a fixed 500px estimate.

**Scope.** Typography settings (font size, width, line height), reading
position memory, previous/next section, print/PDF export, full-text search
inside the book.

**Implementation.** Persist reading prefs in `configStore`; use `window.print`
with print CSS for a minimal PDF path.

### D4. Module import/export 2.0 (P1)

**Value.** Current import overwrites IDs, loses formatting from scripted
modules, and omits assets.

**Scope.**

- Versioned archive + manifest.
- New IDs on merge; explicit replace mode.
- Include bookmarks, cover, and optional assets.
- Import from Markdown with preserved formatting.
- Dry-run preview and conflict report.

**Implementation.** See
[features/module-import-export.md](../features/module-import-export.md) and
technical proposal 4.

### D5. Document versioning (P2)

**Value.** Editing a module's tree and notes is destructive with no history.

**Scope.** Per-module revisions, diff view, restore.

---

## E. Jukebox and ambience

### E1. Make the existing jukebox correct (mostly done)

Color format, artwork cache, new-track detection, repeat-list growth, duplicate
imports, and automatic queue refresh are fixed. Remaining: a
reconnect-permissions flow and richer library metadata editing.

### E2. Library management (P1)

**Value.** The library is a flat list with no organization.

**Scope.** Search, sort (title/artist/album/duration/date added), filters
(genre, disabled), multi-select, bulk add to playlist, edit metadata, replace
missing file.

### E3. Playlist scheduling and crossfade (P1)

**Value.** DMs want different music per scene and smooth transitions.

**Scope.** Per-playlist volume/fade, crossfade between tracks, "play next",
auto-advance rules, module-scoped playlists with a "play" button from the
module page.

### E4. Soundboard and one-shots (P1)

**Value.** Quick SFX (door, thunder, sword) during play.

**Scope.** A soundboard of short clips with hotkeys, independent volume,
overlay on music, stop-all.

**Implementation.** Reuse `jukebox_files`/Howler; a new `soundboard` store or
playlist kind. Aligns with the existing
`docs/ambient-sound-configurator.md` spec.

### E5. Ambient layers (P2)

**Value.** The ambient-sound specification describes layered loops, moods, and
weather.

**Scope.** Implement it incrementally: loop layers with independent volume →
mood crossfades → weather/intensity.

**Implementation.** The spec is already detailed; start with a `SoundPack`
archive format and a pack manager, then the mixer UI.

### E6. Audio import from folders/ZIP (P2)

**Value.** Importing a soundtrack one file at a time is slow.

**Scope.** Directory picker, ZIP of audio files, automatic playlist creation
from folder names.

---

## F. Timers and table tools

### F1. Timer improvements (P1)

**Value.** Timers work but are basic and not backed up.

**Scope.** Pause/resume, repeat/loop, +1 round, visible end time, sound/vibration,
group timers by encounter, include timers in backup.

**Implementation.** Add `pausedAt`/`remaining` or keep elapsed math; extend the
schema with optional fields.

### F2. Combat-linked timers (P2)

**Value.** Conditions/spell durations tied to rounds rather than wall clock.

**Scope.** Round-based timers that tick on `nextTurn`, with a badge in the
combat view.

### F3. Dice tray (P1/P2)

**Value.** A WIP dice engine and 3D dice component exist; the planned scope is
to mount them as a usable table tool.

**Scope.** Mount a roll tray (button in the shell or combat view), history,
named rolls/macros, advantage/disadvantage, and "send to note".

**Implementation.** Finish and register the WIP engine (technical proposal 10)
and either use `RollButton` or a 2D result list with the 3D animation optional.

### F4. Calculator history (P3)

**Value.** Reuse the calculator for repeated damage math.

**Scope.** History tape, memory, named constants, copy result.

---

## G. Data and portability

### G1. Complete backup/restore (mostly done)

Backups now include timers, jukebox data, Blob audio, and mentions, and restore
reloads the app. Remaining: versioned manifest, transactional restore, and a
FileSystem-handle reconnect flow.

### G2. Selective export (P1)

**Value.** Users may want to share one module or one campaign, not the whole DB.

**Scope.** Export selected entities with references; import merges. For
example, export a module with its notes, encounters, monsters, and playlists.

### G3. Markdown/HTML/PDF export (P1)

**Value.** Share notes/books outside the app.

**Scope.** Export a note as Markdown, a module as a single HTML/Markdown file,
or a book as PDF.

### G4. Cloud sync / multi-device (P3)

**Value.** Local-first is a feature, but users lose data when a device dies.

**Scope.** Optional encrypted sync via a user-provided provider (WebDAV,
Dropbox, Google Drive) using the existing ZIP backup as the sync unit; conflict
resolution by `updatedAt` or per-record merge.

**Implementation.** Avoid a custom backend; start with manual encrypted
backups, then a provider adapter.

### G5. Data integrity report and repair (P1)

**Value.** Deletes leave orphans and imports can create broken references.

**Scope.** A Home/settings panel listing orphaned notes, tree nodes, party
members, encounter monsters, bookmarks, and track files, with one-click cleanup.

---

## H. Platform and UX

### H1. Working install experience (partially done)

`PWAInstallPrompt` is fixed and the manifest/worker are consolidated. Remaining:
an explicit “Install app” entry for browsers without `beforeinstallprompt`
(iOS instructions).

### H2. Responsive/mobile pass (P1)

**Value.** The app is used at a table on tablets/phones.

**Scope.** Verify the left drawer, right drawer, combat table, module book, and
jukebox controls at 360–1024px; add touch targets, sticky combat controls, and a
compact mode.

### H3. Accessibility (P1)

**Scope.**

- Keyboard navigation for the tree, cards, and modals.
- Focus management in modals (focus trap, return focus).
- ARIA labels for icon-only buttons.
- Color contrast audit (the light content/dark chrome mix is inconsistent).
- Respect `prefers-reduced-motion` (already partially handled in
  `FloatActionButton`).

### H4. Theming (P2)

**Value.** README claims a dark theme; the app is mixed light/dark.

**Scope.** A real light/dark/system toggle stored in `configStore`, applied to
both Quasar and the CSS variables.

### H5. Settings page (P1)

**Value.** Config is scattered (language switch unmounted, backup on Home,
jukebox prefs implicit).

**Scope.** One route/modal for language, theme, backup/restore, jukebox
preferences, data repair, about/version, and install instructions.

### H6. Search and filter everywhere (partially done)

**Value.** Basic list search now exists; advanced filters and global search do
not.

**Scope.** Add tag/type/module filters to notes, module/level filters to
monsters/encounters, saved filters, and a global search in the shell.

---

## I. Collaboration and sharing (P3)

### I1. Shareable read-only module link

**Value.** Share a book without sharing the whole database.

**Scope.** Export a static HTML bundle (no server) or a `.dmh` archive that can
be opened read-only.

### I2. Live party view

**Value.** Players see initiative/HP on their own devices.

**Scope.** Local network/WebRTC channel or a simple exported snapshot page;
read-only combat state.

### I3. Collaborative editing

**Value.** Multiple DMs/players editing the same campaign.

**Scope.** Requires a sync layer (CRDT or server). Not compatible with the
current whole-array store replacement; treat as a separate architecture.

---

## J. Suggested release slices

| Release              | Features                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next (stabilize)** | A1 dashboard, B1 metadata controls, C4 persistence, D1 module nav, E1 jukebox fixes, G1 backup, H1 install, H6 search                                    |
| **Following**        | A3 command menu, A5 hotkeys, A7 Scribe/Play modes, B2 templates, C1/C2 stat blocks, C3 difficulty, D2/D3 book UX, E2 library, F1 timers, G5 integrity    |
| **Later**            | A2 sessions, A6 help search, B3/B4 linking/history, C5/C6 loot/tables, D4/D5 import/versioning, E3–E5 audio, F2/F3 combat timers/dice, G2–G4 export/sync |
| **Exploratory**      | C7 timeline, I1–I3 sharing/collaboration                                                                                                                 |
