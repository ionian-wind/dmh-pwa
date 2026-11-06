# Parties

## Purpose

A party is a named group of player characters plus optional module membership.
It is the roster used to start a combat.

## Key files

| File                               | Role                |
| ---------------------------------- | ------------------- |
| `src/stores/parties.ts`            | Store + name search |
| `src/parties/PartiesView.vue`      | List page           |
| `src/parties/PartyCard.vue`        | Card                |
| `src/parties/PartyEditor.vue`      | Create/edit modal   |
| `src/parties/PartyView.vue`        | Detail page         |
| `src/parties/PartyViewSidebar.vue` | Mentions sidebar    |

## Data

```ts
interface Party {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  characters: string[]; // character IDs
  moduleIds: string[]; // module IDs
}
```

Schema requires `id`, `name`, `characters`, `moduleIds`, timestamps. The
editor normalizes `moduleIds` to `string[]` before submit; `PartyCard` guards
legacy records that lack `characters`/`moduleIds`.

## List page

- Loads parties.
- `BaseListView` with card/editor.
- Create/edit/delete/copy (`copy` strips ids/timestamps).
- Delete uses the app confirm dialog correctly.

## Card

Shows name, description, character count, and module names. The character
count uses `(party.characters || []).length`; module lookup assumes
`moduleIds` exists.

## Editor (`PartyEditor.vue`)

- Name (required).
- Description uses the shared Markdown editor with visual/raw toggle and
  formatting help. Parties have no notes field.
- Tabs use the shared editor tabs: **Main editor** and **Linked entities**.
- The **Linked entities** tab contains separate `EntitiesLinking` blocks for
  modules and characters.
- Submit reads the latest Markdown and filters empty module IDs.

## Detail page (`PartyView.vue`)

- Resolves party from store by route param.
- Loads characters and modules.
- Uses the shared inline View/Edit experience:
  - View mode renders `description` as Markdown inside
    `EntityContentSurface`.
  - Edit mode uses `EntityInlineEditor` + `EntityMarkdownEditor`; switching
    back to View saves, and dirty navigation uses the shared unsaved guard.
  - Header title and subtitle hide in edit mode; Delete appears only in edit
    mode, and formatting help appears in raw Markdown mode.
  - Header tabs switch between **View/Linked entities** and
    **Main editor/Linked entities**.
- The **Linked entities** tab shows modules and characters. In edit mode both
  are editable through `EntitiesLinking` and saved with the party.
- `partySubtitle` is computed in English ("Modules: … • N characters") and is
  displayed under the page title in view mode only.
- Delete uses the app confirm dialog, then `BaseEntityTabView` navigates back to
  `/parties`. It does not delete associated combats.
- Publishes `PartyViewSidebar` to the right drawer.

## Sidebar

`PartyViewSidebar` computes outgoing mentions and backlinks from the plain
`party` prop and hosts the shared View/Edit and visual-editor controls. Mentions
are hidden in edit mode. It has no Scenes tab and no party download.

## Relationships

- `party.characters` → characters.
- `party.moduleIds` → modules (many-to-many).
- `combat.partyId` → party (a combat snapshots the party's characters at
  creation time; later party changes do not affect existing combats).
- PartySelector uses the party roster to create player combatants.

## Limitations

- No party-level inventory, level, or summary.
- No drag ordering of characters.
- No duplicate-character prevention beyond the `includes` check.
- Deleting a party does not delete its combats.
- Legacy parties without `moduleIds`/`characters` are guarded on the card.
