# Parties

## Purpose

A party is a named group of player characters plus optional module membership.
It is the roster used to start a combat.

## Key files

| File | Role |
| --- | --- |
| `src/stores/parties.ts` | Store + name search |
| `src/parties/PartiesView.vue` | List page |
| `src/parties/PartyCard.vue` | Card |
| `src/parties/PartyEditor.vue` | Create/edit modal |
| `src/parties/PartyView.vue` | Detail page |
| `src/parties/PartyViewSidebar.vue` | Mentions sidebar |

## Data

```ts
interface Party {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  description?: string;
  notes?: string;
  characters: string[];   // character IDs
  moduleIds: string[];    // module IDs
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

## Editor

- Name (required).
- Multi-select `ModuleMultipleSelector`.
- Description and notes textareas.
- `moduleIdsProxy` computed normalizes values to IDs.
- Submit filters empty IDs.

Character membership is **not** editable here; it is managed on the detail
page.

## Detail page (`PartyView.vue`)

- Resolves party from store by route param.
- Loads characters and modules.
- `partyCharacters` filters loaded characters by `party.characters`.
- `handleToggleCharacter` adds/removes a character ID and persists immediately.
- Link-characters modal lists every character with a toggle; there is no search.
- Delete uses the app confirm dialog, then `BaseEntityView` navigates back to
  `/parties`. It does not delete associated combats.
- Publishes `PartyViewSidebar` to the right drawer.
- `partySubtitle` is computed in English ("Modules: … • N characters") and is
  never displayed anyway because `BaseEntityView` drops `subtitle`.

## Sidebar

`PartyViewSidebar` computes mentions and backlinks from the plain `party` prop.
It is published to the right drawer by `PartyView`.

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
