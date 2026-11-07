# Notes

## Purpose

Free-form and campaign notes. Notes render Markdown, can embed drawing blocks,
support internal entity links, and drive the mention index.

## Key files

| File                                       | Role                                            |
| ------------------------------------------ | ----------------------------------------------- |
| `src/stores/notes.ts`                      | Store, search/tag filtering, mention index sync |
| `src/notes/NotesView.vue`                  | List page                                       |
| `src/notes/NoteCard.vue`                   | Card with rendered Markdown and expand/collapse |
| `src/notes/NoteEditor.vue`                 | Create/edit modal                               |
| `src/notes/NoteOptions.vue`                | Type, tags and background options               |
| `src/drawings/DrawingEditorModal.vue`      | Quickdraw modal used by drawing blocks          |
| `src/notes/NoteCanvas.vue`                 | Quickdraw canvas wrapper used by the modal      |
| `src/notes/NoteView.vue`                   | Detail page with inline view/edit mode          |
| `src/notes/NoteTypeSelector.vue`           | Note type management (mounted in `NoteOptions`) |
| `src/notes/NoteViewSidebar.vue`            | Contents/bookmarks/tags/mentions sidebar        |
| `src/components/common/MarkdownEditor.vue` | Editor used by NoteEditor                       |
| `src/components/common/Markdown.vue`       | Renderer used by cards and detail               |

## List page (`NotesView.vue`)

- Loads notes, monsters, and parties on mount.
- Renders `BaseListView` with `NoteCard` and `NoteEditor`.
- Renders `noteStore.filtered` directly.
- Card props pass `onView`, `onEdit`, and `onDelete`.
- Delete uses the app confirm dialog with `common.confirmDelete`.
- Copy strips `id/createdAt/updatedAt` and creates a duplicate.
- Tag clicks navigate to `/notes?tag=<encoded>`.
- A `watch` on `route.query.tag` sets the store's tag filter. The filter is
  the only list filter that is reachable from the UI.

## Card (`NoteCard.vue`)

- Displays the rendered Markdown inside a `600px` clamp.
- Measures `scrollHeight` after mount and on content change to decide whether
  to show an expand/collapse button.
- Clamped content fades into the card background at the bottom via a gradient.
- Renders tags as clickable `#tag` labels that emit `tag-click`.
- Has an `IconFileDownload` action that downloads the note as `.md`.
  File names use `slugify(title)` plus the note id, e.g.
  `session-notes-note-1.md`; Russian titles are transliterated.
- Emits `view`, `edit`, `delete`, `copy` through `BaseCard`.

In view mode the note detail right sidebar shows a pressable **Download** row
with a download icon above the View/Edit switch. It downloads the note as
`.md`. The row is hidden while editing. The edit-mode header instead shows
delete and, when the visual editor is off, a Markdown formatting-help action.

The 600px clamp is hard-coded and does not account for viewport size.

## Editor (`NoteEditor.vue`)

Fields:

- Title (optional; empty is allowed when content is present). Submission with
  both empty triggers `alert(t('editor.titleOrContentRequired'))`. When the
  title is empty, note cards and the detail header omit it; other labels use
  the first content line, cropped with `...` when long.
- Content, rendered through a named `content` slot and the Milkdown editor with
  its raw/visual toggle. Drawing blocks are inserted from the slash menu and
  open the Quickdraw modal.
- An icon-only **options** button in the dialog footer opens a popup with the
  shared `NoteOptions` controls: note type selector and tag selector.
- The visual-editor toggle sits in the footer between **options** and help.
- When the visual editor is off, an icon-only help button appears next to the
  toggle. It links to the static help-center page for Markdown formatting,
  internal links, entity mentions and tags in a new tab.
- The title input is borderless and larger; there is no separate **Content**
  heading, and the visual/raw editors have no outer outline.

Behavior:

- `editedNote` is initialized from `props.note` when its `id` changes; a
  `lastNoteId` guard prevents re-initializing while typing.
- On submit, the latest Markdown is read from the Milkdown ref and block anchors
  are added.
- New notes are created by the parent; drawings live inside the Markdown
  content as drawing blocks.

A note created from the list can carry `typeId` and tags.

## Detail page (`NoteView.vue`)

- Loads notes, the mention index, parties, monsters, encounters.
- Resolves the note from `noteStore.getById(route.params.id)`; redirects to
  `/notes` if missing after load.
- Publishes `NoteViewSidebar` to the right drawer on mount and clears it on
  unmount. The same reactive `NoteEditState` is shared with the sidebar, so its
  View/Edit switch, visual-editor toggle and options panel stay in sync.
- View mode renders the note with `MilkdownView` and `taskCheckboxEnabled`. The
  header has no entity actions besides the sidebar toggle; the right sidebar
  shows the Download row, and the Edit and Delete buttons are hidden.
- `handleMarkdownContentChange` writes every checkbox toggle back to the store
  immediately, so task-list state is persisted live.

### Inline view/edit mode

Switching the sidebar to **Edit** starts a local draft and changes the page:

- The main tab becomes the note editor from the edit dialog: borderless title
  input plus `EntityMarkdownEditor`. The tab icon and label switch to the
  editor tabs.
- The linked-entities tab becomes editable `EntitiesLinking`.
- The header hides Download and shows Delete. When the visual editor is off it
  also shows the Markdown formatting-help action. The duplicate page title is
  hidden in edit mode, leaving only the editor's title input.
- The sidebar hides the Tags/Mentions tabs and shows the shared `NoteOptions`
  panel instead.
- A **Visual Editor** switch sits above the View/Edit switch, styled like the
  map sidebar's **Show Labels** row.

Returning to **View mode** saves the draft. Before writing, the latest Markdown
is read from the editor ref. Every `[title](kind://id)` mention is validated
against its store; missing entities block the save and keep edit mode active
with a validation message. Notes with no changes skip the write.

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
- `update(id, patch)` → `base.update`, then reindexes mentions.
- `remove(id)` → `base.remove` + `indexation.clearLinks`.

## Filtering and tags

- `allTags` collects tags from every note.
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

`NoteView` uses the standard **View** and **Linked entities** tabs. The links
tab shows and edits the note's characters, monsters, parties, encounters and
locations. Location links are stored on the location's `entities` list; the
other links live in `note.links`.
The right sidebar shows **Contents**, **Bookmarks**,
**Tags** and **Mentions** tabs in that order, followed by a full-width local
View/Edit mode switch.

## Contents and bookmarks

The note sidebar extracts a table of contents from the rendered note:

- only top-level headings appear, in document order;
- headings use their Markdown heading level for indentation;
- clicking a row scrolls to the heading and updates the URL hash;
- the shared `TableOfContents` component tracks the active heading while
  scrolling.

Paragraphs still receive stable block anchors and can remain in existing
bookmarks, but they are not listed in the Contents tab.

Bookmarking:

- every Contents row has a bookmark action (visible on hover/focus);
- the **Bookmarks** tab lists note bookmarks with click-to-scroll, rename and
  delete actions;
- bookmarks are stored in the shared `bookmarks` store with
  `ownerKind: 'note'`, `ownerId: note.id` and `anchorId`;
- missing anchors (after a block is deleted) are marked with a warning icon;
  the row is disabled and the tab offers **Remove missing bookmarks**.

### Stable block anchors

Headings and paragraphs get persistent block IDs stored directly in the
Markdown as HTML comments:

```md
## Heading <!-- dmh:block=note-block-abc123 -->

Paragraph text. <!-- dmh:block=note-block-def456 -->
```

- The IDs are added on note load/save when missing.
- Editing a block's text keeps the existing ID.
- Deleting a block removes its marker, so its bookmark becomes missing.
- Milkdown hides the comments in view/edit; markdown-it leaves them as
  invisible HTML comments.
- `downloadNote()` strips the markers from user-facing Markdown downloads.
- Raw Markdown mode shows the comments because it is a plain-text editor.

The Milkdown implementation lives in
`src/components/common/milkdown/plugins/headingAnchor.ts` (parsing and
serialization) and `plugins/toc.ts` (IDs, TOC extraction and decorations).
`src/utils/noteAnchors.ts` adds, strips and reads the markers.

## Markdown and mentions

See [features/markdown-and-mentions.md](markdown-and-mentions.md) for the full
pipeline. In short:

- Entity links use `[label](kind://id)`.
- Rendering rewrites them to SPA routes and adds `data-kind`/`data-id`.
- `NoteView` enables mention modals; cards do not.
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
  "links": [],
  "createdAt": 0,
  "updatedAt": 0
}
```

## Limitations and known problems

- Deleting a note does not remove its bookmark.
- The note list keeps URL tag filtering, but the header search field is not shown; the store search logic remains available.
- Live checkbox writes bypass the mention validation performed on submit.
- Editing from the list and editing from the detail page are two separate
  flows; the detail page's read view can lag behind store updates only until
  the watcher fires.
- The card clamp is fixed at 600px.
