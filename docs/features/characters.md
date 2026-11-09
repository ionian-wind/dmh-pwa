# Characters

## Purpose

Player characters (PCs). A character has a name, an optional portrait, and
free-text notes; the README's "stats, equipment, and notes" are aspirational.

## Key files

| File                                 | Role                                             |
| ------------------------------------ | ------------------------------------------------ |
| `src/stores/characters.ts`           | Store + name search logic (no list search field) |
| `src/characters/CharactersView.vue`  | List page                                        |
| `src/characters/CharacterCard.vue`   | Card                                             |
| `src/characters/CharacterEditor.vue` | Create/edit modal                                |
| `src/characters/CharacterView.vue`   | Detail page                                      |
| `src/parties/PartyList.vue`          | Characters right-drawer party management         |
| `src/parties/useSelectedParty.ts`    | Shared character party filter                    |

## Data

```ts
interface PlayerCharacter {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  notes?: string;
  picture?: string; // stored file id
}
```

Schema: `character.schema.json` requires `id`, `name`, timestamps; allows
`notes` and `picture`.

Characters are linked from parties (`party.characters`). There is no back
reference on the character.

## List page (`CharactersView.vue`)

- Loads characters on mount.
- `BaseListView` with `CharacterCard` and `CharacterEditor`.
- The right drawer hosts `PartyList`, similar to jukebox playlists. It contains
  an **All characters** entry, party selection, create/edit/delete actions, and
  filters the list to the selected party's `characters` ids.
- With a party selected, **Create Character** pre-checks that party in the
  linking tab and links the new character to it on save. Unchecking it in the
  tab skips the link.
- Create/edit/delete/copy.
- Delete calls `confirm(t('common.confirmDelete', { title: character.name }))`
  and removes the portrait file when it is no longer referenced.
- Card props include `onView` → route to detail.

## Card

Shows the portrait (or a fallback), the character name, and a two-line plain
text preview of `notes`. There is no party badge.

## Editor (`CharacterEditor.vue`)

- Name (required; empty triggers `alert(t('characterEditor.nameRequired'))`).
- `notes` uses the shared `EntityMarkdownEditor` (Milkdown / raw Markdown
  toggle) and is read back on submit with `getMarkdown()`.
- `EntityPicturePicker` selects the character portrait.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The linked-entities tab edits note, party and location links through
  `EntitiesLinking`.
- Footer has the visual-editor toggle and, in raw mode, the Markdown
  formatting-help button. There are no note options, tags or note types.
- `blankCharacter()` includes empty strings and current timestamps; the base
  store replaces timestamps on create.
- `watch(props.isOpen)` resets the form when the modal closes and unsaved
  portrait files are discarded.

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
  - Delete is part of the sidebar's mode controls; formatting help is shown in
    the header when the raw Markdown editor is active.
- Header tabs are **View** and **Linked entities**; edit mode uses
  **Main editor** and **Linked entities**.
- The linked-entities tab shows notes, parties and locations linked to the
  character. In edit mode all three kinds are editable through
  `EntitiesLinking`.
- Uses `CharacterViewSidebar` through the shared right drawer. It has
  **Picture**, **Scenes** and **Mentions** tabs in view mode; while editing the
  Picture tab becomes a picture picker and Mentions is hidden, leaving Picture
  and Scenes.
- The sidebar shares the note-style mode controls; Delete is available there in
  edit mode.
- There are no tags, note types/options, or character download action.
- Delete asks for confirmation; `BaseEntityTabView` navigates to the list and
  the portrait file is cleaned up when unreferenced.

The create/edit modal (`CharacterEditor.vue`) remains for the character list.

## Relationships and lifecycle

- Used by `CombatView` / `PartySelector` to build combatants with
  `referenceId = character.id`.
- Removing a character does not remove its ID from parties or from historical
  combatants (history intentionally keeps a broken reference).
- Copying a character copies name, notes and picture.
- Clicking a linked character opens the shared `EntityInfoDialog`, which shows
  the portrait, notes, linked entities, and an open action.

## Limitations / gaps

- No stats, HP, AC, level, class, race, equipment, or spells.
- Delete asks for confirmation; there is no cascade cleanup.
- No validation beyond a non-empty name.
- Portraits are stored as file ids and are not shown on historical combatants
  after the character is deleted.
