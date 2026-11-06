# Characters

## Purpose

Player characters (PCs). In the current data model a character is only a name
and free-text notes; the README's "stats, equipment, and notes" are aspirational.

## Key files

| File                                 | Role                |
| ------------------------------------ | ------------------- |
| `src/stores/characters.ts`           | Store + name search |
| `src/characters/CharactersView.vue`  | List page           |
| `src/characters/CharacterCard.vue`   | Card                |
| `src/characters/CharacterEditor.vue` | Create/edit modal   |
| `src/characters/CharacterView.vue`   | Detail page         |

## Data

```ts
interface PlayerCharacter {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  notes?: string;
}
```

Schema: `character.schema.json` requires `id`, `name`, timestamps; allows
`notes`.

Characters are linked from parties (`party.characters`). There is no back
reference on the character.

## List page (`CharactersView.vue`)

- Loads characters, parties, modules on mount (parties/modules are loaded but
  unused).
- `BaseListView` with `CharacterCard` and `CharacterEditor`.
- Create/edit/delete/copy.
- Delete calls `confirm(t('common.', { title: character.name }))`; the
  translation key is wrong (trailing dot), so the confirmation text is
  effectively `common.`.
- Card props include `onView` → route to detail.

## Card

Renders only the title. There is no summary, notes preview, or party badge.

## Editor

- Name (required) and notes textarea.
- `blankCharacter()` includes empty strings and current timestamps; the base
  store replaces timestamps on create.
- `watch(props.isOpen)` resets the form when the modal closes.
- No party assignment; party membership is managed from `PartyView`.

## Detail page (`CharacterView.vue`)

- Resolves the character from the store by route param.
- Renders `notes` as plain text (not Markdown).
- Edit modal, delete with confirmation, then `BaseEntityView` navigates to the
  list.
- Uses `CharacterViewSidebar` through the shared right drawer. Mentions and
  ambient scenes are separated into **Mentions** and **Scenes** tabs using the
  shared `TabGroup` component.

## Relationships and lifecycle

- Used by `CombatView` / `PartySelector` to build combatants with
  `referenceId = character.id`.
- Removing a character does not remove its ID from parties or from historical
  combatants (history intentionally keeps a broken reference).
- Copying a character copies only name/notes.

## Limitations / gaps

- No stats, HP, AC, level, class, race, equipment, spells, or portrait.
- No character-to-party editing from the character side.
- Delete asks for confirmation; there is no cascade cleanup.
- No validation beyond a non-empty name.
