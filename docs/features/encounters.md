# Encounters

## Purpose

An encounter is a planned fight: a named, module-scoped set of monsters with
quantities. It is the template from which a combat is created.

## Key files

| File                                      | Role                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `src/stores/encounters.ts`                | Store + name search                              |
| `src/encounters/EncountersView.vue`       | List page                                        |
| `src/encounters/EncounterCard.vue`        | Card with "run combat" action                    |
| `src/encounters/EncounterEditor.vue`      | Create/edit modal                                |
| `src/encounters/EncounterView.vue`        | Detail page (information/monsters/combats/links) |
| `src/encounters/EncounterViewSidebar.vue` | Scene links sidebar                              |
| `src/encounters/PartySelector.vue`        | Party/character selection → combat               |

## Data

```ts
interface Encounter {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  monsters: Record<string, number>; // monsterId -> count
  moduleId: string;
  notes?: string;
}
```

Schema requires `name`, `monsters`, `moduleId`, timestamps; monster counts are
constrained to 1..20. `description` and `notes` are allowed but not listed in
the schema.

## List page (`EncountersView.vue`)

- Loads encounters and modules.
- `BaseListView` with `EncounterCard`/`EncounterEditor`.
- Create/edit/delete/copy.
- Delete confirmation uses `t('common.', ...)` — a missing key.
- `handleRunCombat` opens `PartySelector`; when a combat is created it routes
  to `/combats/:id`.
- `@run-combat` is also declared on `BaseListView`, but `BaseListView` never
  emits it. The real wiring is the `onRunCombat` function passed inside
  `cardProps`, which arrives at the card as an event listener.
- `BaseCard` renders a copy button when `showCopy` is set; the encounter card
  enables it and `EncountersView` handles `copy`.

## Card (`EncounterCard.vue`)

- Module name lookup by `moduleId`.
- Monster summary as `"<kinds> (<total>)"`.
- Run-combat button in the card action slot.
- Emits `view`, `edit`, `delete`, `run-combat`, `copy`.

## Editor

- Name (required).
- The module link is edited in the **Linked entities** tab through an
  `EntitiesLinking` block.
- Description and notes.
- Validation requires both name and a real `moduleId`.
- `handleSubmit` emits and then calls `closeEditor`, which resets the form and
  emits `cancel`. Parents also close on submit; double-close is harmless but
  means the reset happens before the parent reads the emitted object (the
  emitted object is a reference to `editedEncounter.value` — see caveat below).

### Object-reference caveat

`emit('submit', editedEncounter.value)` passes the live ref object. The
parent's handler (`handleSubmit` in EncountersView) calls
`encounterStore.create(encounter)` synchronously enough that the subsequent
reset has not yet changed the object... but because Vue emits are synchronous,
`create` receives the object, deep-unwraps it, and returns. `resetForm()`
then replaces `editedEncounter.value` with a **new** object, so the old data
is already captured. This works today but is fragile if a parent ever stores
the emitted object for later use.

## Detail page (`EncounterView.vue`)

Tabs: Information, Monsters, Combats.

- Information: renders `encounter.description` with `v-html` (unsanitized).
- Monsters:
  - Loads all monsters and shows those whose IDs are keys of
    `encounter.monsters`.
  - Link action opens a modal with a toggle per monster and a quantity input.
  - Toggling/unlinking persists immediately through `encounterStore.update`.
  - Inline quantity button opens a `prompt()` dialog and persists.
  - Table header uses the missing `common.linked` key.
- Combats: lists combats for this encounter with party name, created date,
  status badge, and a view link.
- Header has a Run Combat button that opens `PartySelector`.
- Publishes `EncounterViewSidebar` to the right drawer.
- `#sub` renders the module link; `BaseEntityTabView` forwards `sub` to
  `BaseEntityView`.

## Delete behavior

`handleDelete` asks for confirmation, removes the encounter, and returns
`true` so `BaseEntityView` navigates to `/encounters`. It does not delete
associated combats, which then have a dangling `encounterId`.

## PartySelector

See [features/combat.md](combat.md#partyselector) for the full flow. In brief:

- Select a party; all its characters start selected.
- Toggle characters.
- Monsters are expanded to one combatant per count.
- Creates a combat with `status: 'preparing'`, `currentRound: 0`,
  `currentTurn: 0`, and all combatants at initiative 0.
- Navigates to the combat page.

## Relationships

- `encounter.moduleId` → module (required).
- `encounter.monsters` → monster IDs with counts.
- `combat.encounterId` → encounter.
- Encounter-generated combats snapshot monster instances at creation.

## Limitations

- No CR/XP budget or difficulty calculation.
- No environment, tactics, or loot fields.
- Monster quantities are hard-capped at 20 by the schema.
- Encounter list card has no monster names, only counts.
- Delete does not cascade to combats.
- Description is rendered as raw HTML.
