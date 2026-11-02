# Notes

## Purpose

Free-form and campaign notes. Notes are the richest content type: they render
Markdown, support internal entity links, drive the mention index, and can be
used as hidden document sections inside modules.

## Key files

| File | Role |
| --- | --- |
| `src/stores/notes.ts` | Store, search/tag filtering, mention index sync |
| `src/notes/NotesView.vue` | List page |
| `src/notes/NoteCard.vue` | Card with rendered Markdown and expand/collapse |
| `src/notes/NoteEditor.vue` | Create/edit modal |
| `src/notes/NoteCanvas.vue` | Quickdraw canvas for `draw` notes |
| `src/notes/NoteView.vue` | Detail page |
| `src/notes/NoteTypeSelector.vue` | Note type management (mounted in `NoteEditor`) |
| `src/notes/NoteViewSidebar.vue` | Tags + mentions sidebar |
| `src/components/common/MarkdownEditor.vue` | Editor used by NoteEditor |
| `src/components/common/Markdown.vue` | Renderer used by cards and detail |

## List page (`NotesView.vue`)

- Loads notes, monsters, and parties on mount.
- Renders `BaseListView` with `NoteCard` and `NoteEditor`.
- Shows `noteStore.filtered.filter(n => !n.hidden)`, so hidden document notes
  never appear in the general notes list.
- Card props pass `onView`, `onEdit`, `onDelete`, and `moduleName` (always
  `undefined`).
- The header has a second create action: a warning-coloured `IconBrush` button
  that opens the editor with `contentType: 'draw'`. The regular create button
  opens a `text` note.
- Delete uses the app confirm dialog with `common.confirmDelete`.
- Copy strips `id/createdAt/updatedAt`, forces `hidden: false`, and creates a
  duplicate.
- Tag clicks navigate to `/notes?tag=<encoded>`.
- A `watch` on `route.query.tag` sets the store's tag filter. The filter is
  the only list filter that is reachable from the UI.

## Content types

A note has an internal `contentType` field with two values:

| Value  | Meaning                                      |
| ------ | -------------------------------------------- |
| `text` | Markdown content, the default and legacy type |
| `draw` | Infinite-canvas drawing stored as a Quickdraw snapshot |

Existing notes are migrated to `contentType: 'text'`. The type is not directly
editable in the note form; it is chosen by the create action.

## Card (`NoteCard.vue`)

- Shows a gray type icon next to the title: `IconFileText` for text notes and
  `IconBrush` for drawing notes.
- Drawing notes show their saved PNG preview instead of a text placeholder.
- Displays the rendered Markdown inside a `600px` clamp for text notes.
- Measures `scrollHeight` after mount and on content change to decide whether
  to show an expand/collapse button.
- Renders tags as clickable `#tag` labels that emit `tag-click`.
- Emits `view`, `edit`, `delete`, `copy` through `BaseCard`.

The 600px clamp is hard-coded and does not account for viewport size.

## Editor (`NoteEditor.vue`)

Fields:
- Title (required; empty triggers `alert(t('editor.titleRequired'))`).
- Content, rendered through a named `content` slot:
  - `text` notes use the Milkdown editor and its raw/visual toggle.
  - `draw` notes use `NoteCanvas`, a Vue wrapper around the plain-JS
    Quickdraw editor.
- Note type selector and tag selector. The module link lives in the dialog's
  linked-entities tab.

Behavior:
- `editedNote` is initialized from `props.note` when its `id` changes; a
  `lastNoteId` guard prevents re-initializing while typing.
- On submit, text notes read the latest Markdown from the Milkdown ref; draw
  notes read a Quickdraw JSON snapshot and generate a small PNG preview using
  `editor.exportImage()`.
- New notes are created by the parent with `hidden: false`; drawing notes keep
  `contentType: 'draw'`.

A note created from the list can now carry `moduleId`, `typeId`, and tags. Notes
created inside a module's document tree are still forced to `hidden: true` by
`ModuleDocumentTree`.

## Detail page (`NoteView.vue`)

- Loads notes, modules, the mention index, parties, monsters, encounters.
- Renders Markdown for text notes and a read-only `NoteCanvas` for drawing
  notes.
- Resolves the note from `noteStore.getById(route.params.id)`; redirects to
  `/notes` if missing after load.
- Renders the note with `Markdown` and `taskCheckboxEnabled`.
- Editing opens `NoteEditor` in the `#editor` slot.
- `handleMarkdownContentChange` writes every checkbox toggle back to the store
  immediately, so task-list state is persisted live.
- On editor submit it validates every `[title](kind://id)` mention against the
  corresponding store. Missing entities block the save and display a
  `validationError` string.
- Delete asks for confirmation, removes the note, and `BaseEntityView` navigates
  to `/notes`.
- Publishes `NoteViewSidebar` to the right drawer on mount and clears it on
  unmount.

### Live editing vs. modal editing

The detail page passes the current note content to `Markdown`, which is
read-only except for task checkboxes. Editing requires opening the modal. Any
change made through the modal's editor is emitted only on submit; task
checkboxes in the read view write directly.

## Store (`stores/notes.ts`)

Adds to the base store:

```ts
searchQuery: Ref<string>      // unused by UI
tagFilter: Ref<string | null> // used by route query
filtered: ComputedRef<Note[]> // tag filter + title/content/tag search
allTags: ComputedRef<string[]>
setFilter, clearFilter, setSearchQuery,
setTagFilter, clearTagFilter
```

Overrides:
- `create(note)` → `base.create` + `indexation.setLinks({kind:'note', id}, mentions)`.
- `update(id, patch)` → forcibly restores the original `hidden` value, then
  reindexes mentions.
- `remove(id)` → `base.remove` + `indexation.clearLinks`.

The hidden protection means a note created as visible can never become a
document note, and a document note can never become visible through updates.
The only escape is delete + recreate.

## Filtering and tags

- `allTags` collects tags from every note (including hidden ones).
- The tag filter is exact-match (`note.tags.includes(tag)`), while the search
  box does substring matching.
- Clicking a tag in `NoteCard` or `NoteViewSidebar` encodes the tag twice:
  `query: { tag: encodeURIComponent(tag) }`. Vue Router serializes it again.
  On read, `route.query.tag` is decoded once by the router, then passed
  directly to the filter. Tags containing `%` or spaces may misbehave.
- No UI exists to remove/clear the tag filter except navigating back to
  `/notes` without the query.

## Markdown and mentions

See [features/markdown-and-mentions.md](markdown-and-mentions.md) for the full
pipeline. In short:

- Entity links use `[label](kind://id)`.
- Rendering rewrites them to SPA routes and adds `data-kind`/`data-id`.
- `ModuleDocumentView` enables mention modals; cards do not.
- Only note content is indexed; other entity mentions are not.

## Persistence fields

See [architecture/data-model.md](../architecture/data-model.md#note). A note
saved from the UI has:

```json
{
  "id": "…",
  "title": "…",
  "content": "…",
  "typeId": null,
  "tags": [],
  "moduleId": null,
  "hidden": false,
  "createdAt": 0,
  "updatedAt": 0
}
```

## Limitations and known problems

- Document-note status (`hidden`) is internal: it is set by the module
  document flow, not by a user-facing editor control. A note without a module
  cannot be hidden.
- Deleting a note does not remove its node from `module.noteTree` or its
  bookmark.
- The note list has search and URL tag filtering, but no tag-chip filter bar.
- Live checkbox writes bypass the mention validation performed on submit.
- Editing from the list and editing from the detail page are two separate
  flows; the detail page's read view can lag behind store updates only until
  the watcher fires.
- The card clamp is fixed at 600px.
