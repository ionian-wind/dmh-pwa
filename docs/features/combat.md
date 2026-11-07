# Combat

## Purpose

Run an encounter against a party: initiative order, rounds, turns, postpone,
and completion. A combat is a persisted snapshot of selected characters and
monster instances.

## Key files

| File                               | Role                                    |
| ---------------------------------- | --------------------------------------- |
| `src/stores/combats.ts`            | Combat store and turn helpers           |
| `src/encounters/PartySelector.vue` | Creates a combat from encounter + party |
| `src/encounters/CombatView.vue`    | Combat runner UI                        |
| `src/encounters/EncounterView.vue` | Lists combats for an encounter          |

## Data

```ts
interface Combat {
  id: string;
  createdAt: number;
  updatedAt: number;
  encounterId: string;
  partyId: string;
  status: 'preparing' | 'active' | 'completed';
  currentRound: number;
  currentTurn: number;
  combatants: Combatant[];
  notes?: string;
}
```

`Combatant` is embedded (not a separate store). Type requires `name`, but
creators never set it; display names are resolved from `referenceId`.

## Lifecycle

```
preparing ──start──▶ active ──end──▶ completed
    ▲                  │
    └──── reset? ──────┘ (resets round/turn while active)
```

Store helpers:

```ts
startCombat(id); // preparing -> active, currentRound=1, currentTurn=0
endCombat(id); // active -> completed
resetCombat(id); // active: round=1, turn=0
nextTurn(id); // active: turn+1, round+1 at wrap
previousTurn(id); // active: turn-1, round-1 at wrap (min 1)
```

`CombatView` does **not** use `nextTurn`/`previousTurn`; it implements its own
in-memory turn logic (see below). The store helpers are effectively unused.

## PartySelector

Opened from `EncountersView` or `EncounterView`.

1. Lists parties from `partyStore.filtered`.
2. On party selection, marks every character in the party as selected.
3. Renders each party character with a toggle.
4. `handleCreateCombat`:
   - Collects selected characters from `characterStore.items`.
   - Collects encounter monsters and expands each count into separate
     combatants.
   - Creates combatants with `id: generateId()` where `generateId` is a local
     `Math.random().toString(36).substr(2, 9)` — not `nanoid`.
   - Creates the combat and routes to `/combats/:id`.

Notes:

- `BaseModal` supports a `footer` slot; the party selector uses the standard
  submit/cancel buttons.
- Validation of "at least one character" happens both in the disabled state
  and in `handleCreateCombat` (early return).
- It emits `combat-created`; the parent closes the selector and routes to the
  combat.
- On success, the parent's modal `isOpen` flag is not reset. Navigation
  unmounts the page, so in practice it is invisible.

## Combat runner (`CombatView.vue`)

Loads characters, monsters, combats, encounters, parties.

### Initialization

```
encounter  = encounterStore.getById(combat.encounterId)
party      = partyStore.getById(combat.partyId)
partyCharacters = party.characters mapped through characterStore
encounterMonsters = encounter.monsters expanded to instances
allParticipants = players + monsters (unsaved template)
```

A watcher on `combat` fills `combat.combatants` when the combat is
`preparing` and empty, then persists them with `combatStore.update`. On reload
the combat is already populated, so the watcher does not re-run.

### Preparing

- Participant list is clickable to edit initiative via `QPopupEdit`
  (`v-model="participant.initiative"`, auto-save). Saving persists the
  combatants through `combatStore.update`.
- Header "Start" button calls `startCombat()` (local), which:
  - normalizes initiative to numbers,
  - resets `hasActed`/`isPostponed`,
  - sorts descending by initiative,
  - calls `combatStore.update` with `status: 'active'`, round 1, turn 0, and
    the sorted combatants.
- "Add participant" modal lists party characters not already in the combat;
  selected characters are appended and persisted via `combatStore.update`.
- Monster combatants can only be added by creating a new combat; there is no
  add-monster UI.

### Active

- `activeParticipantIndex` is initialized from `combat.currentTurn` when the
  combat is active and kept in sync with persisted turn changes.
- `currentParticipant` is the combatant at that index.
- `nextTurn()` delegates to `advanceTurn()` in `src/utils/combatTurn.ts`, which:
  - marks the current participant `hasActed = true`,
  - searches forward for the next participant that has not acted and is not
    postponed,
  - advances the index, or starts a new round.
- A new round re-sorts combatants by initiative, increments `currentRound`,
  and resets all acted/postponed flags.
- `postponeCurrent()` marks the participant postponed and advances.
- `activatePostponed(id)` clears the flag, moves the index, and persists.
- Every transition is written through `combatStore.update`, so reload, tab
  sync, and route changes restore the same state.
- Header "End" calls `combatStore.endCombat`, which persists `status`.

### Completed

- Shows a summary line "The encounter has concluded after N rounds." The N is
  the persisted `currentRound`.
- Turn controls disappear.

### Display details

- Participant name resolution:
  - player → `characterStore.getById(referenceId)?.name`
  - monster → `monsterStore.getById(referenceId)?.name`, with `#n` suffix when
    multiple combatants share the reference.
- `activeTab` is a read-only computed derived from `status`; `QTabs` receives
  it with `:model-value` so there is no readonly-computed warning. Content
  visibility is driven by `status`.
- Phase labels "Preparation", "Active", "Ended", summary headings, and the
  ended message are English literals.
- The combat has no link back to the encounter in the header, and no header
  delete/edit (disabled intentionally).

## Routing

- `CombatView`'s `listRoute` is `/encounters`.
- `/combats` redirects to `/encounters`; a missing combat navigates to the
  encounter list.

## Persistence summary

All turn state is now written through `combatStore.update`:

| Change                                      | Persisted?          |
| ------------------------------------------- | ------------------- |
| Combat created                              | yes                 |
| Add participant                             | yes                 |
| Initial combatant fill from encounter/party | yes                 |
| Start combat + sorted combatants            | yes                 |
| Initiative edits while preparing            | yes (on popup save) |
| Next/previous turn                          | yes                 |
| Round rollover                              | yes                 |
| Postpone/activate                           | yes                 |
| End combat                                  | yes (`status` only) |

The pure transitions live in `src/utils/combatTurn.ts` and are covered by
`tests/regressions/bugs.test.ts`.

## Limitations

- No HP, conditions, damage, or dice rolls in the runner.
- No undo/history; postponing loses the original position.
- No drag reordering of initiative.
- No auto-roll initiative.
- No encounter link or "save back to encounter".
- No cleanup of combats when encounter/party/character/monster is deleted.
- Stale in-memory mutations can be overwritten by a `pinia-shared-state` update
  from another tab.
