# Modules and the Document "Book"

## Purpose

A module is a campaign/book container. It groups:

- a hierarchical tree of **hidden notes** that form a readable document,
- visible notes, parties, monsters, encounters, playlists attached to it,
- bookmarks for document sections.

The "Book" tab concatenates hidden notes in tree order and renders them as one
continuous, virtualized document with a table of contents and bookmark controls.

## Key files

| File                                        | Role                                                 |
| ------------------------------------------- | ---------------------------------------------------- |
| `src/stores/modules.ts`                     | Module store (`noteTree` is just part of the record) |
| `src/modules/ModulesView.vue`               | Module list                                          |
| `src/modules/ModuleCard.vue`                | Module card                                          |
| `src/modules/ModuleEditor.vue`              | Create/edit modal                                    |
| `src/modules/ModuleView.vue`                | Detail page with tabs, TOC, bookmarks, export        |
| `src/modules/ModuleDocumentTree.vue`        | Editable tree tab                                    |
| `src/modules/ModuleDocumentView.vue`        | Virtualized book renderer                            |
| `src/components/Tree/*`                     | Recursive drag-and-drop tree                         |
| `src/stores/bookmarks.ts`                   | Bookmark CRUD                                        |
| `src/components/common/Bookmark.vue`        | Bookmark toggle rendered over each chunk             |
| `src/components/common/TableOfContents.vue` | TOC list and scroll spy                              |

## Module list (`ModulesView.vue`)

- Loads modules on mount.
- Renders `BaseListView` with `ModuleCard`/`ModuleEditor`.
- Create/edit/delete/copy supported (copy strips IDs/timestamps).
- Contains an import-from-ZIP flow (`parseModuleZip` → validation modal →
  `importModuleFromZip`), but the import button in the list header is
  **commented out**. The same import is reachable from Home.

## Module detail (`ModuleView.vue`)

Loads modules, parties, monsters, encounters, notes, playlists, tracks, maps,
locations, the mention index, and bookmarks.

Computed collections:

- `moduleParties` — parties whose `moduleIds` include this module.
- `moduleMonsters` — monsters whose `moduleIds` include this module.
- `moduleEncounters` — encounters whose `moduleId` equals this module.
- `moduleNotes` — notes with this `moduleId` and `hidden === false`.
- `modulePlaylists` — playlists whose `moduleIds` include this module.
- `moduleMaps` — maps whose `entities` include a `module` link to this module.
- `moduleLocations` — locations whose `entities` include a `module` link to this module.
- `moduleBookmarks` — bookmarks with this `moduleId`.

Tabs: Book, Book Tree, Linked entities. The Linked entities tab collects maps,
locations, parties, monsters, encounters, notes and playlists that reference
this module and renders them read-only with `EntityViewLinks`.

Header actions intended: Export ZIP. Delete/edit come from `BaseEntityTabView`.

Export (`handleExportModule`) builds a ZIP in memory containing:
`module.json`, `tree.json`, `notes/<id>.json` for every note in the module
(including hidden), and `summary.json`. The filename is the module name with
non-alphanumerics replaced by `_`, suffixed `_module.zip`.

Other behavior:

- `handleHashChange` scrolls to a hash anchor but only while the Book tab is
  active.
- `handleSaveNoteTree` persists a new `noteTree` via `moduleStore.update`.
- `scrollToBookmark` calls the exposed `scrollToAnchor` on the document view.
- Bookmark list supports click-to-scroll, edit title modal, and remove.

## UI wiring

`ModuleView` uses `<template #sidepanel>` (TOC/bookmarks) and
`<template #actions>` (export). `BaseEntityTabView` now forwards these slots to
`BaseEntityView`, which renders `actions`/`sub` and publishes the sidepanel to
the right drawer. The module TOC/bookmarks sidebar and export button are
reachable.

The bookmark list iterates `moduleBookmarks` with a keyed `v-for`.

## Document tree (`ModuleDocumentTree.vue`)

- Computes `notes` = notes in this module with `hidden === true`.
- Converts `ModuleTreeNode[]` to `ExtendedTreeNode[]` with `{id, noteId, title,
children}` for the generic Tree component.
- Watches `noteTree` and notes deeply; rebuilds local state when they change.
- Watches local tree deeply and emits `update:noteTree` when JSON differs from
  the prop, so drag/reorder/nesting changes persist.
- Add root / add child opens `NoteEditor` with `hidden: true` and the current
  module pre-set; `hideModuleSelector` removes the module/link tabs for that
  fixed-module flow.
- On create, persists the note, then pushes a node at root or under the chosen
  parent. The local-tree watcher emits the new tree.
- On edit, persists the note and updates the node title.
- On remove, recursively deletes the node's note and all descendant notes, then
  removes the subtree. **No confirmation dialog.**

Note: the tree is only as good as the stored `noteTree`. A note can exist with
`moduleId` and `hidden` but no tree node; it will not appear in the book.

## Book renderer (`ModuleDocumentView.vue`)

Algorithm:

1. `notes` = hidden notes for the module.
2. `buildChunks(nodes, depth = 1)` walks the tree in pre-order. For each node
   with a matching note it creates:
   ```ts
   {
     id: `note-${note.id}`,
     title: note.title,
     content: `${'#'.repeat(depth + 1)} ${note.title} {#note-${note.id}}\n\n${note.content}`,
     level: depth + 1,
     noteId: note.id,
   }
   ```
   Children are appended recursively with increasing depth.
3. `buildTOC` maps chunks to anchors (`anchorId = chunk.id`).
4. A `QVirtualScroll` renders chunks with a virtual item size of 500px and a
   slice size of 10.
5. Each chunk renders `Bookmark` and `Markdown` with `anchorMap` (set of note
   IDs), `scrollToAnchor`, and `enableMentionModal`.
6. `handleScrollerUpdate` sets the active anchor from the topmost visible chunk.

Heading IDs are `note-<id>` (from the injected `{#note-<id>}`), while
`noteAnchorMap` contains raw note IDs. `scrollToAnchor` now normalizes both
forms, so TOC/bookmark clicks scroll to the exact heading as well as the chunk.

The document is rebuilt when `noteTree` or the hidden notes change, so tree
edits, note edits, imports, and reloads are reflected without remounting.

## TOC and bookmarks

- `Bookmark` toggles a bookmark for `(moduleId, noteId)`. It creates with an
  empty title; the sidebar resolves the note title when displaying.
- Bookmarks are keyed by module + note, not by heading anchor.
- `TableOfContents` has both an internal scroll-spy and an external
  `activeAnchorId` mode. It is rendered in the module sidepanel via
  `BaseEntityView`’s `sidepanel` slot. TOC entries are `#anchor` links and
  emit `item-click`; clicking updates the URL hash.
- `ModuleView`'s bookmark edit modal uses `v-if="editingBookmark"` with
  `:isOpen="!!editingBookmark"`. `BaseModal` emits `update:isOpen`, so closing
  it clears the editing state.

## Copy/delete behavior

- Copy duplicates the module record but clears `noteTree`, so the copy does not
  point at the original note IDs.
- Delete asks for confirmation, removes the module, and `BaseEntityView`
  navigates back to `/modules`. It does not clean up notes, encounters,
  bookmarks, or module memberships.

## Limitations

- Only hidden notes participate in the book; visible notes with the same
  module do not. A note can be converted from the detail editor, which also
  adds/removes its tree node.
- Document chunks duplicate the note title as a heading; if a note's content
  also starts with its own heading, the title can appear twice.
- Deeply nested note headings use level `depth + 1` (H2 for roots), which can
  exceed H6 for deep trees.
- Virtual scroll uses a fixed 500px estimate; very long or very short notes
  cause inaccurate scrollbars.
- The tree has no cycle protection; malformed data with a node referencing an
  ancestor would recurse infinitely.
- No per-module word count, status, or ordering metadata.

See [components/tree.md](../components/tree.md) and
[features/module-import-export.md](module-import-export.md).
