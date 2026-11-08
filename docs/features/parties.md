# Parties

## Purpose

A party is a named group of player characters.
It is the roster used to start a combat.

## Key files

| File                               | Role                               |
| ---------------------------------- | ---------------------------------- |
| `src/stores/parties.ts`            | Store + name search                |
| `src/parties/PartiesView.vue`      | List page                          |
| `src/parties/PartyCard.vue`        | Card                               |
| `src/parties/PartyEditor.vue`      | Create/edit modal                  |
| `src/parties/PartyView.vue`        | Detail page                        |
| `src/parties/PartyViewSidebar.vue` | Characters/scenes/mentions sidebar |

## Data

```ts
interface Party {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  characters: string[]; // character IDs
}
```

Schema requires `id`, `name`, `characters`, timestamps. `description` is
allowed but not listed in the schema. `PartyCard` guards legacy records that
lack `characters`.

## List page

- Loads parties.
- `BaseListView` with card/editor.
- Create/edit/delete/copy (`copy` strips ids/timestamps).
- Delete uses the app confirm dialog correctly.

## Card

Shows name, description, and character count. The character
count uses `(party.characters || []).length`.

## Editor (`PartyEditor.vue`)

- Name (required).
- Description uses the shared Markdown editor with visual/raw toggle and
  formatting help. Parties have no notes field.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The **Linked entities** tab contains `EntitiesLinking` blocks for notes and
  characters.
- Submit reads the latest Markdown.

## Detail page (`PartyView.vue`)

- Resolves party from store by route param.
- Loads characters and notes.
- Uses the shared inline View/Edit experience:
  - View mode renders `description` as Markdown inside
    `EntityContentSurface`.
  - Edit mode uses `EntityInlineEditor` + `EntityMarkdownEditor`; switching
    back to View saves, and dirty navigation uses the shared unsaved guard.
  - Header title and subtitle hide in edit mode; Delete is in the sidebar's
    mode controls, and formatting help appears in the header in raw Markdown
    mode.
  - Header tabs switch between **View/Linked entities** and
    **Main editor/Linked entities**.
- The **Linked entities** tab shows notes and characters. In edit mode it is
  editable through `EntitiesLinking`; character changes are saved with the
  party, while note links are written immediately through the relation
  helpers.
- `partySubtitle` shows the character count under the page title in view mode
  only.
- Delete uses the app confirm dialog, then `BaseEntityTabView` navigates back to
  `/parties`. It does not delete associated combats.
- Publishes `PartyViewSidebar` to the right drawer.

## Sidebar

`PartyViewSidebar` opens on the **Characters** tab. It lists the party's linked
characters, opens the shared `EntityInfoDialog` when a row is clicked, and hosts
the shared View/Edit and visual-editor controls.

- In edit mode the character list gains an **Unlink** action and a **Link
  Characters** row. Linking uses `EntityLinkingDialog` for all characters;
  selections update the party draft and are saved with the party.
- **Scenes** has scene linking disabled (playlist links only).
- **Mentions** is hidden in edit mode and remains available in view mode.
- In view mode the sidebar also shows a **Start Combat** button when the
  encounters feature is enabled; that opens `PartySelector` with the party
  preset. It has no party download.

## Relationships

- `party.characters` → characters.
- `combat.partyId` → party (a combat snapshots the party's characters at
  creation time; later party changes do not affect existing combats).
- PartySelector uses the party roster to create player combatants and can be
  opened directly from the party detail sidebar.
- Linked characters open the shared `EntityInfoDialog` for preview, editing and
  navigation.

## Limitations

- No party-level inventory, level, or summary.
- No drag ordering of characters.
- No duplicate-character prevention beyond the `includes` check.
- Deleting a party does not delete its combats.
- Legacy parties without `characters` are guarded on the card.
