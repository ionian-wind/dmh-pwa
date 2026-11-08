# Combat

## Purpose

Run an encounter against a party: initiative order, rounds, turns, postpone,
and completion. A combat is a persisted snapshot of selected characters and
pawn instances.

## Key files

| File                                        | Role                                    |
| ------------------------------------------- | --------------------------------------- |
| `src/stores/combats.ts`                     | Combat store and turn helpers           |
| `src/encounters/PartySelector.vue`          | Creates a combat from encounter + party |
| `src/encounters/CombatView.vue`             | Combat runner UI                        |
| `src/encounters/ActiveCombatsPanel.vue`     | Active-combat sidebar panel             |
| `src/encounters/useVisibleActiveCombats.ts` | Active-combat filtering                 |
| `src/utils/combatTurn.ts`                   | Pure turn advance/rewind helpers        |
| `src/encounters/EncounterView.vue`          | Lists combats for an encounter          |

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
`isExcluded` is optional; excluded combatants stay in the list but are skipped
in the turn cycle. Participants also carry `createdAt`/`updatedAt`.

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

`CombatView` uses its own start action (which also sorts combatants and resets
flags) and the store's `endCombat`. Turn movement is delegated to the pure
`advanceTurn` helper in `src/utils/combatTurn.ts` and persisted through
`combatStore.update`; `rewindTurn` exists but is not wired to a control. The
store's `resetCombat`, `nextTurn` and `previousTurn` helpers are not used by the
runner.

## PartySelector

Opened from `EncountersView`, `EncounterView`, or the party detail sidebar.

1. If no party is preset, lists parties from `partyStore.filtered`; if a party
   is preset (opened from a party page), lists encounters instead.
2. On party selection, marks every character in the party as selected.
3. Character selection uses `EntityLinkingList` for the `character` kind, so the
   list has a search field and a create button. All party characters are shown
   and checked by default; newly created characters are added to the list and
   selected.
4. `handleCreateCombat`:
   - Requires an active encounter, an active party and at least one selected
     character (early return; the modal also shows an info message).
   - Resolves selected IDs through `characterStore.getById`.
   - Collects encounter pawns and expands each count into separate
     combatants.
   - Creates combatants with `generateId()` from `@/utils/storage`.
   - Creates the combat, emits `combat-created`, and the parent closes the
     selector and routes to `/combats/:id`.

Notes:

- `BaseModal` uses the standard submit/cancel buttons.
- It shows encounter and party information (name and counts) above the
  selection lists.
- Pawn instances snapshot the encounter roster at creation; there is no
  add-pawn control in the runner.

## Combat runner (`CombatView.vue`)

Loads characters, pawns, combats, encounters, parties. The page uses
`BaseEntityView` (not tabs): the phase stepper, toolbar and participant list are
all on one page. The title is the encounter name. The right drawer shows
`EncounterViewSidebar` with `scenesOnly`, i.e. only the encounter's Scenes panel
and none of the pawn/mention/edit controls.

### Initialization

```
encounter  = encounterStore.getById(combat.encounterId)
party      = partyStore.getById(combat.partyId)
partyCharacters = party.characters mapped through characterStore
encounterPawns = encounter.pawns expanded to instances
allParticipants = players + pawns (unsaved template)
```

A watcher on `combat` fills `combat.combatants` when the combat is
`preparing` and empty, then persists them with `combatStore.update`. On reload
the combat is already populated, so the watcher does not re-run.

### Preparing

- The toolbar has three zones: Add participant on the left, round/turn counters
  in the center (only while active), and Start/End on the right.
- Participant list is clickable to edit initiative via `QPopupEdit`
  (`v-model="participant.initiative"`, auto-save). Saving normalizes the
  submitted value and persists it through `combatStore.update`; a blank input
  becomes `0`.
- Start (right side) calls `startCombat()` (local), which:
  - requires at least one combatant,
  - normalizes initiative to numbers,
  - resets `hasActed`/`isPostponed`,
  - sorts descending by initiative,
  - calls `combatStore.update` with `status: 'active'`, round 1, turn 0, and
    the sorted combatants.
- Add participant (left side, disabled when no eligible characters) opens the
  shared `EntityLinkingDialog` for party characters not already in the combat.
  Each selected character can get an initiative; blank input becomes `0`, and
  new combatants are appended and persisted via `combatStore.update`.
- Pawn combatants can only be added by creating a new combat; there is no
  add-pawn UI.

### Active

- `activeParticipantIndex` is initialized from `combat.currentTurn` when the
  combat is active and kept in sync with persisted turn changes.
- `currentParticipant` is the combatant at that index and is `null` when that
  combatant is excluded.
- `nextTurn()` delegates to `advanceTurn()` in `src/utils/combatTurn.ts`, which:
  - marks the current participant `hasActed = true`,
  - searches forward for the next participant that has not acted, is not
    postponed and is not excluded,
  - advances the index, or starts a new round.
- A new round re-sorts combatants by initiative, increments `currentRound`,
  and resets all acted/postponed flags; the first non-excluded combatant gets
  the turn.
- `postponeCurrent()` marks the participant postponed and advances. The
  postpone button is hidden for the last row in the list.
- `activatePostponed(id)` clears the postponed flag and `hasActed`, moves the
  index, and persists.
- Excluding a participant sets `isExcluded`; the row stays visible (muted) and
  the turn cycle skips it. Excluding the current participant immediately
  advances. Excluded rows show a return action that clears `isExcluded`.
- `rewindTurn`/`previousTurn` exist in the code, but no previous-turn control
  is exposed in the UI.
- Every transition is written through `combatStore.update`, so reload, tab
  sync, and route changes restore the same state.
- End (right side) calls `combatStore.endCombat`, which persists `status`.

### Completed

- Shows the localized `combat.concluded` summary with the persisted
  `currentRound`.
- Turn controls disappear.

### Display details

- Participant name resolution:
  - player → `characterStore.getById(referenceId)?.name`
  - pawn → `pawnStore.getById(referenceId)?.name`, with `#n` suffix when
    multiple combatants share the reference.
- Participant rows show portraits when available, with player/pawn fallback
  icons, initiative, status (acted/waiting) and action buttons.
- Clicking a participant name opens the shared `EntityInfoDialog` with the
  portrait, notes, linked entities and open action.
- `activeTab` is a read-only computed derived from `status`; it drives the
  `QStepper` phase indicator. Content visibility is also driven by `status`.
- Phase labels ("Preparation", "Active", "Ended"), the concluded message and
  controls are localized through i18n.
- The combat has no link back to the encounter in the header, and no header
  delete/edit (disabled intentionally).

### Active combats panel

`ActiveCombatButton` shows a floating panel when any active combat is visible.
`useVisibleActiveCombats` filters `combatStore.items` to `status === 'active'`
and omits the combat whose detail page is open. The panel lists each combat by
encounter name with its combatants, current-turn highlight, and the same
advance, postpone, activate, exclude/return and finish actions. Participant
names open the shared `EntityInfoDialog`; the group title navigates to the
combat.

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
| Next turn                                   | yes                 |
| Round rollover                              | yes                 |
| Postpone/activate                           | yes                 |
| Exclude/return combatant                    | yes                 |
| End combat                                  | yes (`status` only) |

The pure transitions live in `src/utils/combatTurn.ts` and are covered by
`tests/regressions/bugs.test.ts`.

## Limitations

- No HP, conditions, damage, or dice rolls in the runner.
- No undo/history UI; `rewindTurn` exists but is not exposed, and postponing
  loses the original position.
- No drag reordering of initiative.
- No auto-roll initiative.
- No add-pawn UI after combat creation.
- No encounter link or "save back to encounter".
- No cleanup of combats when encounter/party/character/pawn is deleted.
- Stale in-memory mutations can be overwritten by a `pinia-shared-state` update
  from another tab.
