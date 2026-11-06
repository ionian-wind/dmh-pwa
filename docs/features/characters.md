# Characters

## Purpose

Player characters (PCs). In the current data model a character is only a name
and free-text notes; the README's "stats, equipment, and notes" are aspirational.

## Key files

| File                                 | Role                                             |
| ------------------------------------ | ------------------------------------------------ |
| `src/stores/characters.ts`           | Store + name search logic (no list search field) |
| `src/characters/CharactersView.vue`  | List page                                        |
| `src/characters/CharacterCard.vue`   | Card                                             |
| `src/characters/CharacterEditor.vue` | Create/edit modal                                |
| `src/characters/CharacterView.vue`   | Detail page                                      |

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

## Editor (`CharacterEditor.vue`)

- Name (required; empty triggers `alert(t('characterEditor.nameRequired'))`).
- `notes` uses the shared `EntityMarkdownEditor` (Milkdown / raw Markdown
  toggle) and is read back on submit with `getMarkdown()`.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The linked-entities tab edits module/party/location links through
  `EntitiesLinking`; module ids are saved with the character.
- Footer has only the visual-editor toggle and, in raw mode, the Markdown
  formatting-help button. There are no note options, tags or note types.
- `blankCharacter()` includes empty strings and current timestamps; the base
  store replaces timestamps on create.
- `watch(props.isOpen)` resets the form when the modal closes.

The detail page uses inline editing instead of this modal; the modal remains
for the character list and map entity creation.

## Detail page (`CharacterView.vue`)

- Resolves the character from the store by route param.
- Uses the same inline View/Edit experience as notes:
  - View mode renders `notes` as Markdown (including task checkboxes) inside
    the shared `EntityContentSurface`.
  - Edit mode uses the shared `EntityInlineEditor` + `EntityMarkdownEditor`
    with the character name as the title and `notes` as the note content.
  - Switching back to View saves; dirty navigation shows the shared
    unsaved-changes dialog; the header title is hidden while editing.
  - Delete is only shown in edit mode; formatting help is shown when the raw
    Markdown editor is active.
- Header tabs are **View** and **Linked entities**; edit mode uses
  **Main editor** and **Linked entities**.
- The linked-entities tab shows the modules, parties and locations linked to
  the character. In edit mode all three kinds are editable through
  `EntitiesLinking`.
- Uses `CharacterViewSidebar` through the shared right drawer. Ambient scenes
  and mentions are separated into **Scenes** and **Mentions** tabs, with
  Mentions last. The sidebar shares the note-style mode controls; Mentions is
  hidden while editing, leaving the Scenes tab.
- There are no tags, note types/options, or character download action.
- Delete asks for confirmation; `BaseEntityView` navigates to the list.

The create/edit modal (`CharacterEditor.vue`) remains for the character list.

## Relationships and lifecycle

- Used by `CombatView` / `PartySelector` to build combatants with
  `referenceId = character.id`.
- Removing a character does not remove its ID from parties or from historical
  combatants (history intentionally keeps a broken reference).
- Copying a character copies only name/notes.

## Limitations / gaps

- No stats, HP, AC, level, class, race, equipment, spells, or portrait.
- Delete asks for confirmation; there is no cascade cleanup.
- No validation beyond a non-empty name.
