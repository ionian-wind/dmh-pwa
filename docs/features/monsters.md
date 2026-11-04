# Monsters

## Purpose

Monster/NPC records used by encounters and combats. Like characters, the
current record is intentionally minimal: name, notes, module membership.

## Key files

| File                                  | Role                |
| ------------------------------------- | ------------------- |
| `src/stores/monsters.ts`              | Store + name search |
| `src/monsters/MonstersView.vue`       | List page           |
| `src/monsters/MonsterCard.vue`        | Card                |
| `src/monsters/MonsterEditor.vue`      | Create/edit modal   |
| `src/monsters/MonsterView.vue`        | Detail page         |
| `src/monsters/MonsterViewSidebar.vue` | Scene links sidebar |

## Data

```ts
interface Monster {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  notes?: string;
  moduleIds?: string[];
}
```

Schema requires `id`, `name`, timestamps; optional `notes` and `moduleIds`.

## List page (`MonstersView.vue`)

- Loads monsters on mount.
- Passes `showActions: true` plus `onView`/`onEdit`/`onDelete` to `MonsterCard`.
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
  ...
/>
```

`showActions` defaults to `undefined`, so all three actions are hidden unless a
caller explicitly passes it. No caller passes it.

## Editor

- Name (required), module multi-select, notes textarea.
- `watch(props.monster, { deep: true })` copies the record; `watch(isOpen)`
  resets only when there is no monster.
- Emits a full `Monster` object including id/timestamps; the store update
  ignores/overrides timestamps.
- Validation only checks the name.

## Detail page (`MonsterView.vue`)

- Loads monsters, publishes `MonsterViewSidebar` to the right drawer.
- Renders `notes` as plain text in the **Main editor** tab.
- A **Linked entities** tab shows module membership read-only via
  `EntityViewLinks`.
- Edit modal and delete with confirmation; `BaseEntityTabView` navigates to
  `/monsters` after a successful delete.

## Sidebar

`MonsterViewSidebar` reads the plain `monster` prop and displays linked ambient
scenes only. Entity mentions are no longer duplicated in the sidebar.

## Relationships

- `monster.moduleIds` → modules (many-to-many).
- `encounter.monsters` maps monster IDs to counts.
- `combat.combatants[].referenceId` → monster IDs.
- `ModuleView` filters monsters by `moduleIds.includes(module.id)`.

## Limitations

- No stat block, CR, HP, AC, attacks, abilities, or tokens.
- No duplicate/monster-instance naming (combat display appends `#n` for
  multiple references).
- Deleting a monster leaves encounter rosters and historical combatants with
  dangling IDs.
