# Encounters

## Purpose

An encounter is a planned fight: a named set of pawns with quantities, drawn
from the pawn catalog. It is the template from which a combat is created.

## Key files

| File                                      | Role                                    |
| ----------------------------------------- | --------------------------------------- |
| `src/stores/encounters.ts`                | Store + name search                     |
| `src/encounters/EncountersView.vue`       | List page                               |
| `src/encounters/EncounterCard.vue`        | Card with "run combat" action           |
| `src/encounters/EncounterEditor.vue`      | Create/edit modal                       |
| `src/encounters/EncounterView.vue`        | Detail page (information/combats/links) |
| `src/encounters/EncounterViewSidebar.vue` | Pawns/scenes/mentions sidebar           |
| `src/encounters/PartySelector.vue`        | Party/character selection → combat      |

## Data

```ts
interface Encounter {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  pawns: Record<string, number>; // pawnId -> pawn count
}
```

Schema requires `name`, `pawns`, timestamps; pawn counts are constrained to
1..20. `description` is allowed but not listed in the schema.

## List page (`EncountersView.vue`)

- Loads encounters.
- `BaseListView` with `EncounterCard`/`EncounterEditor`.
- Create/edit/delete/copy.
- Delete confirmation uses `common.confirmDelete` with the encounter name.
- `handleRunCombat` opens `PartySelector`; when a combat is created it routes
  to `/combats/:id`.
- The run-combat action is wired through the `onRunCombat` function passed
  inside `cardProps`, which arrives at the card as an event listener.
  `BaseListView` also receives `@run-combat`, but it does not declare or emit
  that event.
- `BaseCard` renders a copy button when `showCopy` is set; the encounter card
  enables it and `EncountersView` handles `copy`.

## Card (`EncounterCard.vue`)

- Pawn summary as `"<kinds> (<total>)"`.
- Run-combat button in the card action slot.
- Emits `view`, `edit`, `delete`, `run-combat`, `copy`.

## Editor

- Name (required).
- Description uses the shared Markdown editor with visual/raw toggle and
  formatting help.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The linked-entities tab edits note links.
- `handleSubmit` reads the latest Markdown, emits a new encounter object with
  id/timestamps, then resets the form and emits `cancel`. Parents also close on
  submit; double-close is harmless because the emitted object is a copy.

## Detail page (`EncounterView.vue`)

Tabs: Information, Combats, Linked entities.

- Information: renders `encounter.description` with `MilkdownView` (Markdown,
  mentions and task checkboxes).
- Combats: lists combats for this encounter with party name, created date,
  status badge, and a view link. The tab shows the combat count as a badge.
- Linked entities: shows linked notes; in edit mode they are editable through
  `EntitiesLinking`.
- Header has no Run Combat button. The sidebar shows it in view mode.
- Publishes `EncounterViewSidebar` to the right drawer.

## Sidebar (`EncounterViewSidebar.vue`)

- View mode tabs: **Pawns**, **Scenes**, **Mentions**. Edit mode tabs:
  **Pawns**, **Scenes**; Mentions is hidden.
- Pawns:
  - Lists the encounter's linked pawns with their quantities.
  - Clicking a pawn opens the shared `EntityInfoDialog` with portrait, notes,
    expand and open actions.
  - In edit mode, the quantity button opens a numeric `prompt()` and persists
    through `encounterStore.update`.
  - In edit mode, the link action opens `EntityLinkingDialog` over all pawns,
    with a quantity input per selected pawn; `addPawns` persists the selection.
  - Unlinking persists immediately.
- Scenes: embeds the encounter scenes panel; editable in edit mode.
- Mentions: outgoing/backlink mentions, hidden in edit mode.
- A **Run Combat** button opens `PartySelector` in view mode.
- The shared View/Edit and visual-editor controls sit at the bottom; Delete is
  available in edit mode.

The combat page reuses this sidebar with `scenesOnly`, so the combat sidebar
shows only encounter scenes and no pawn/mention/mode controls.

## Delete behavior

`handleDelete` asks for confirmation, removes the encounter, and returns
`true` so `BaseEntityTabView` navigates to `/encounters`. It does not delete
associated combats, which then have a dangling `encounterId`.

## PartySelector

See [features/combat.md](combat.md#partyselector) for the full flow. In brief:

- Can be opened from the encounter list/detail with an encounter preset, or
  from a party detail page with a party preset.
- Select a party (or an encounter when a party is preset).
- All party characters start selected; toggle characters.
- Pawns are expanded to one combatant per count.
- Creates a combat with `status: 'preparing'`, `currentRound: 0`,
  `currentTurn: 0`, and all combatants at initiative 0.
- Emits `combat-created`; the parent closes the selector and navigates to the
  combat page.

## Relationships

- `encounter.pawns` → pawn IDs with pawn counts.
- `combat.encounterId` → encounter.
- Encounter-generated combats snapshot pawn instances at creation.

## Limitations

- No CR/XP budget or difficulty calculation.
- No environment, tactics, or loot fields.
- Pawn quantities are hard-capped at 20 by the schema.
- Encounter list card has no pawn names, only pawn counts.
- Delete does not cascade to combats.
- Description is edited and rendered as Markdown.
