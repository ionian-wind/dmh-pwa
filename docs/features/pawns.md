# Pawns

## Purpose

Pawn/NPC records used by encounters and combats. Like characters, the
current record is intentionally minimal: name, optional portrait, and notes.

## Key files

| File                            | Role                            |
| ------------------------------- | ------------------------------- |
| `src/stores/pawns.ts`           | Store + name search             |
| `src/pawns/PawnsView.vue`       | List page                       |
| `src/pawns/PawnCard.vue`        | Card                            |
| `src/pawns/PawnEditor.vue`      | Create/edit modal               |
| `src/pawns/PawnView.vue`        | Detail page                     |
| `src/pawns/PawnViewSidebar.vue` | Picture/scenes/mentions sidebar |

## Data

```ts
interface Pawn {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  notes?: string;
  picture?: string; // stored file id
}
```

Schema requires `id`, `name`, timestamps; optional `notes` and `picture`.

## List page (`PawnsView.vue`)

- Loads pawns on mount.
- Passes `showActions: true` plus `onView`/`onEdit`/`onDelete` to `PawnCard`.
- Binds `@view`, `@delete`, `@submit`, and `@copy`.
- Delete uses the app confirm dialog.
- Copy strips IDs/timestamps and creates a duplicate.
- The card exposes view/edit/delete/copy actions and the list opens the editor
  or detail route as expected.

## Card

```vue
<BaseCard
  :show-view="showActions"
  :show-edit="showActions"
  :show-delete="showActions"
  :show-copy="showActions"
  ...
/>
```

`showActions` defaults to `undefined`, so actions are hidden unless a caller
explicitly passes it. `PawnsView` passes `showActions: true`. The card also
shows the portrait and a two-line plain text preview of `notes`.

## Editor (`PawnEditor.vue`)

- Name (required), portrait, and notes using the shared Markdown editor with
  visual/raw toggle and formatting help.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The linked-entities tab edits notes, encounters and locations through
  `EntitiesLinking`.
- `watch(props.pawn, { deep: true })` copies the record; `watch(isOpen)`
  resets when closing or when no pawn is selected.
- Emits a full `Pawn` object including id/timestamps; the store update
  ignores/overrides timestamps.
- Validation only checks the name.

## Detail page (`PawnView.vue`)

- Loads pawns, notes, encounters and locations.
- Uses the shared inline View/Edit experience:
  - View mode renders `notes` as Markdown inside `EntityContentSurface`.
  - Edit mode uses `EntityInlineEditor` + `EntityMarkdownEditor`; switching
    back to View saves, with the shared unsaved-change guard. The portrait is
    edited from the sidebar Picture tab.
  - Header title hides in edit mode; Delete is in the sidebar's mode controls,
    and formatting help appears in the header in raw Markdown mode.
  - Header tabs switch between **View/Linked entities** and
    **Main editor/Linked entities**.
- The **Linked entities** tab shows notes, encounters and locations.
  Encounter/location links use the shared relation helpers.
- Delete asks for confirmation; `BaseEntityTabView` navigates to `/pawns` and
  the portrait file is cleaned up when unreferenced.

## Sidebar

`PawnViewSidebar` has **Picture**, **Scenes** and **Mentions** tabs in view
mode. While editing the Picture tab becomes a picture picker and Mentions is
hidden, leaving Picture and Scenes. It hosts the shared View/Edit and
visual-editor controls.

Pawn previews in encounter and combat sidebars use the shared
`EntityInfoDialog` (portrait, notes, expand and open actions); the old
`PawnViewDialog` no longer exists.

## Relationships

- `encounter.pawns` maps pawn IDs to pawn counts.
- `combat.combatants[].referenceId` → pawn IDs.
- Linked pawns open the shared `EntityInfoDialog` for preview, editing and
  navigation.

## Limitations

- No stat block, CR, HP, AC, attacks, abilities, or tokens.
- No duplicate/pawn-instance naming (combat display appends `#n` for
  multiple references).
- Deleting a pawn leaves encounter rosters and historical combatants with
  dangling IDs.
