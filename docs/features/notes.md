# Notes

## Purpose

Free-form and campaign notes. Notes are the richest content type: they render
Markdown, support internal entity links, drive the mention index, and can be
used as hidden document sections inside modules.

## Key files

| File                                       | Role                                            |
| ------------------------------------------ | ----------------------------------------------- |
| `src/stores/notes.ts`                      | Store, search/tag filtering, mention index sync |
| `src/notes/NotesView.vue`                  | List page                                       |
| `src/notes/NoteCard.vue`                   | Card with rendered Markdown and expand/collapse |
| `src/notes/NoteEditor.vue`                 | Create/edit modal                               |
| `src/notes/NoteOptions.vue`                | Type, tags and background options               |
| `src/notes/NoteCanvas.vue`                 | Quickdraw canvas for `draw` notes               |
| `src/notes/NoteView.vue`                   | Detail page with inline view/edit mode          |
| `src/notes/NoteTypeSelector.vue`           | Note type management (mounted in `NoteOptions`) |
| `src/notes/NoteViewSidebar.vue`            | Tags/mentions tabs and edit-mode options        |
| `src/components/common/MarkdownEditor.vue` | Editor used by NoteEditor                       |
| `src/components/common/Markdown.vue`       | Renderer used by cards and detail               |

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

| Value  | Meaning                                                |
| ------ | ------------------------------------------------------ |
| `text` | Markdown content, the default and legacy type          |
| `draw` | Infinite-canvas drawing stored as a Quickdraw snapshot |

Existing notes are migrated to `contentType: 'text'`. The type is not directly
editable in the note form; it is chosen by the create action.

## Card (`NoteCard.vue`)

- Drawing notes show their saved PNG preview instead of a text placeholder.
- Displays the rendered Markdown inside a `600px` clamp for text notes.
- Measures `scrollHeight` after mount and on content change to decide whether
  to show an expand/collapse button.
- Clamped content fades into the card background at the bottom via a gradient
  (using the note background colour when set).
- Renders tags as clickable `#tag` labels that emit `tag-click`.
- Applies the note's optional `backgroundColor` behind its content.
- Has an `IconFileDownload` action: text notes download as `.md`, drawing
  notes download their PNG preview. Drawings without a preview are disabled.
  File names use `slugify(title)` plus the note id, e.g.
  `session-notes-note-1.md`; Russian titles are transliterated.
- Emits `view`, `edit`, `delete`, `copy` through `BaseCard`.

In view mode the note detail right sidebar shows a pressable **Download** row
with a download icon above the View/Edit switch. It downloads text notes as
`.md` and drawing notes as their PNG preview; drawings without a preview are
disabled. The row is hidden while editing. The edit-mode header instead shows
delete and, when the visual editor is off, a Markdown formatting-help action.

The 600px clamp is hard-coded and does not account for viewport size.

## Editor (`NoteEditor.vue`)

Fields:

- Title (required; empty triggers `alert(t('editor.titleRequired'))`).
- Content, rendered through a named `content` slot:
  - `text` notes use the Milkdown editor and its raw/visual toggle.
  - `draw` notes use `NoteCanvas`, a Vue wrapper around the plain-JS
    Quickdraw editor.
- An icon-only **options** button in the dialog footer opens a popup with the
  shared `NoteOptions` controls: note type selector, tag selector and optional
  background colour (`backgroundColor`). The colour is rendered behind the note
  content on the detail page and note cards.
- The visual-editor toggle sits in the footer between **options** and help.
- When the visual editor is off, an icon-only help button appears next to the
  toggle. It opens `MarkdownHelpDialog` with markdown formatting,
  internal-link, entity mention, and tag help.
- The title input is borderless and larger; there is no separate **Content**
  heading, and the visual/raw editors have no outer outline.
- The module link lives in the dialog's linked-entities tab.

Behavior:

- `editedNote` is initialized from `props.note` when its `id` changes; a
  `lastNoteId` guard prevents re-initializing while typing.
- On submit, text notes read the latest Markdown from the Milkdown ref; draw
  notes read a Quickdraw JSON snapshot and generate a small PNG preview using
  `editor.exportImage()`.
- New notes are created by the parent with `hidden: false`; drawing notes keep
  `contentType: 'draw'`.

A note created from the list can now carry `moduleIds`, `typeId`, and tags. Notes
created inside a module's document tree are still forced to `hidden: true` by
`ModuleDocumentTree`.

## Detail page (`NoteView.vue`)

- Loads notes, modules, the mention index, parties, monsters, encounters.
- Resolves the note from `noteStore.getById(route.params.id)`; redirects to
  `/notes` if missing after load.
- Publishes `NoteViewSidebar` to the right drawer on mount and clears it on
  unmount. The same reactive `NoteEditState` is shared with the sidebar, so its
  View/Edit switch, visual-editor toggle and options panel stay in sync.
- View mode renders the note with `Markdown` and `taskCheckboxEnabled`, or a
  read-only `NoteCanvas` for drawing notes. The header has no entity actions besides
  the sidebar toggle; the right sidebar shows the Download row, and the Edit
  and Delete buttons are hidden.
- `handleMarkdownContentChange` writes every checkbox toggle back to the store
  immediately, so task-list state is persisted live.

### Inline view/edit mode

Switching the sidebar to **Edit** starts a local draft and changes the page:

- The main tab becomes the note editor from the edit dialog: borderless title
  input plus `MarkdownEditor` (text) or `NoteCanvas` (draw). The tab icon and
  label switch to the editor tabs.
- The linked-entities tab becomes editable `EntitiesLinking`.
- The header hides Download and shows Delete. When the visual editor is off it
  also shows the Markdown formatting-help action. The duplicate page title is
  hidden in edit mode, leaving only the editor's title input.
- The sidebar hides the Tags/Mentions tabs and shows the shared `NoteOptions`
  panel instead.
- A **Visual Editor** switch sits above the View/Edit switch, styled like the
  map sidebar's **Show Labels** row.

Returning to **View mode** saves the draft. Before writing, text notes read the
latest Markdown from the editor ref and drawing notes read a Quickdraw snapshot
plus PNG preview. Every `[title](kind://id)` mention is validated against its
store; missing entities block the save and keep edit mode active with a
validation message. Notes with no changes skip the write.

If the draft is dirty, route navigation opens a three-action dialog: **Save**,
**Do not save**, or **Cancel**. Cancel returns `false` from
`onBeforeRouteLeave` and keeps the current page; Save writes before continuing;
Do not save discards the draft. A `beforeunload` listener also blocks/closes the
tab with the browser's native prompt when the draft is dirty.

## Store (`stores/notes.ts`)

Adds to the base store:

```ts
searchQuery: Ref<string>; // unused by UI
tagFilter: Ref<string | null>; // used by route query
filtered: ComputedRef<Note[]>; // tag filter + title/content/tag search
allTags: ComputedRef<string[]>;
(setFilter, clearFilter, setSearchQuery, setTagFilter, clearTagFilter);
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
- While editing, the note options menu's `TagSelector` shows saved tags plus
  hashtags currently present in the markdown content. Focusing or typing in the
  tag input opens suggestions from every note's tags; when the query does not
  match an existing tag, the menu offers `Create #tag`. Removing an inline tag
  strips the `#` markers from the content but keeps the tag word as plain text,
  so it is not merged back on save.
- The tag filter is exact-match (`note.tags.includes(tag)`), while the search
  box does substring matching.
- Clicking a tag in `NoteCard` or `NoteViewSidebar` encodes the tag twice:
  `query: { tag: encodeURIComponent(tag) }`. Vue Router serializes it again.
  On read, `route.query.tag` is decoded once by the router, then passed
  directly to the filter. Tags containing `%` or spaces may misbehave.
- No UI exists to remove/clear the tag filter except navigating back to
  `/notes` without the query.

## Detail tabs

`NoteView` uses the standard **View** / **Linked entities** tabs in the
app header panel. View renders the note body; Linked entities shows the
note's module read-only. The right sidebar shows **Tags** and **Mentions**
tabs (tags first), followed by a full-width local View/Edit mode switch that is
not wired to note behavior yet.

## Markdown and mentions

See [features/markdown-and-mentions.md](markdown-and-mentions.md) for the full
pipeline. In short:

- Entity links use `[label](kind://id)`.
- Rendering rewrites them to SPA routes and adds `data-kind`/`data-id`.
- `NoteView` and `ModuleDocumentView` enable mention modals; cards do not.
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
  "moduleIds": [],
  "backgroundColor": "",
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
