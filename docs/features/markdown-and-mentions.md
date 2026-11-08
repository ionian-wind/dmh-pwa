# Markdown and Mentions

## Purpose

Markdown is the content format for entity descriptions and notes. Entity detail
views render it with the same Milkdown/Crepe pipeline as the editor; note cards
keep the lighter markdown-it renderer. A separate index tracks which notes
mention which entities.

## Key files

| File                                                      | Role                                                    |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `src/utils/markdownParser.ts`                             | markdown-it instance, plugins, mention extraction       |
| `src/components/common/Markdown.vue`                      | markdown-it renderer for cards/chunks + link routing    |
| `src/components/common/milkdown/MilkdownView.vue`         | Read-only Milkdown view for detail pages                |
| `src/components/common/milkdown/MilkdownEditor.vue`       | Crepe editor/read-only host                             |
| `src/components/common/milkdown/plugins/mention.ts`       | Mention mark, normalization, toolbar/menu entries       |
| `src/components/common/milkdown/plugins/headingAnchor.ts` | `{#kind-id}` remark plugin and heading schema extension |
| `src/components/common/milkdown/plugins/tagDecoration.ts` | Decoration-only `#tag` styling                          |
| `src/components/common/MarkdownEditor.vue`                | WYSIWYG/raw editor switch                               |
| `src/components/common/milkdown/*`                        | Crepe integration and mention insertion                 |
| `src/utils/storage.ts#createIndexationStore`              | Mention index                                           |
| `src/stores/notes.ts`                                     | Writes the index on note save/delete                    |
| `src/components/common/Mentions.vue`                      | Renders mention/backlink lists                          |

## Rendering pipeline (`markdownParser.ts`)

The module creates one markdown-it instance:

```ts
new MarkdownIt({ html: true, linkify: true, breaks: false });
```

and installs the renderer/inline plugins below, plus an embedded-image source
plugin that defers `dmh-file://` and `drawing://` URLs to hydration.

### 1. Internal entity links

Syntax: `[label](kind://id)` where `kind` is one of
`note | party | pawn | encounter | location` and `id` matches
`[A-Za-z0-9_-]+`.

For matching links, the renderer:

- sets `data-kind` and `data-id`,
- adds classes `internal-link <kind>-link`,
- rewrites `href` to `/<kind>s/<id>` (e.g. `note://x` → `/notes/x`).

External links (`http(s)://` or protocol-relative) get `target="_blank"` and
`rel="noopener noreferrer"`.

The plugin also overrides the text renderer to `escapeHtml`, matching the
default.

### 2. Task lists

For list items beginning with `[ ]`, `[x]`, or `[X]`, the renderer:

- adds `task-list-item` to the `<li>`,
- replaces the text token with a checkbox label,
- disables the checkbox unless `env.taskCheckboxEnabled === true`.

`Markdown.vue` passes `{ taskCheckboxEnabled }` as `env` when rendering.

### 3. Tag links

Inline `#tag` text is rendered as `<a class="tag-link" data-tag="tag"
 href="/notes?tag=tag">#tag</a>`. Headings, inline code, and `{#...}` attribute
suffixes are not converted. Clicking a tag navigates to the filtered note list.

### 4. Heading anchors

Syntax: `## Title {#kind-id}`.

If `kind` is a valid entity kind, the heading receives:

- `id="kind-id"`,
- `data-id`, `data-kind`,
- and the anchor suffix is removed from the displayed text.

## View renderer (`MilkdownView.vue`)

Entity detail views use a read-only Crepe instance so view and edit share one
Markdown-to-ProseMirror pipeline.

- `MilkdownEditor` receives `readonly`, calls `crepe.setReadonly(true)` and
  disables UI-only features (toolbar, block edit, placeholder, link tooltip,
  cursor, top bar, AI). Schema-producing features (lists, tables, code, math,
  images) stay enabled.
- Entity mentions use the same mark as the editor. Enabled kinds resolve their
  route from `featureLinkKinds`; disabled or unknown kinds render as
  non-interactive `.disabled-internal-link` spans.
- Tags keep the `tag-link` decoration and `data-tag`; clicking one navigates to
  `/notes?tag=...`.
- `{#kind-id}` headings are parsed by the shared `headingAnchorFeature`:
  the marker is removed, the heading gets `id="kind-id"`, `data-kind` and
  `data-id`, and the default heading-id generator is overridden so the anchor
  id is not replaced by a slug.
- Note block anchors (`<!-- dmh:block=… -->`) are parsed by the same feature
  and exposed as `blockAnchor` on headings and paragraphs. The read-only view
  adds them to the TOC and keeps their IDs stable across content edits.
- Task labels update only the matching Markdown source line and emit
  `update:content`. This preserves bullet markers, tag escaping and heading
  anchor markers instead of re-serializing the document.
- External links open in a new tab; internal links use the same anchor,
  mention-modal and SPA-navigation fallbacks as `Markdown.vue`.
- `MilkdownView` does not register the tag-autocomplete or mention-popup
  triggers, so it cannot steal them from an open editor.

Note cards keep `Markdown.vue` because one Crepe
instance per card would be too expensive. A
singleton static Milkdown renderer is available in
`milkdown/staticRenderer.ts`, but benchmarks show it is roughly 5–6× slower
than markdown-it for batch card rendering. See
[`../architecture/markdown-rendering-performance.md`](../architecture/markdown-rendering-performance.md).

## Images and uploaded files

- Crepe image uploads go through the application file layer
  (`uploadStoredFile()` → `files` store / OPFS).
- Markdown stores stable `dmh-file://<fileId>` references, not transient blob
  URLs.
- Milkdown resolves them with `proxyDomURL`; `Markdown.vue` resolves rendered
  images and links with `hydrateStoredFileUrls()`.
- Direct link entry in Crepe image blocks is disabled; only file upload is
  available.
- Crepe UI icons are Tabler SVGs from `milkdown/tablerIcons.ts`.

## Drawing blocks

- The block menu / slash menu has a **Drawing** item.
- Adding or editing opens a Quickdraw canvas modal with OK and Cancel.
- Drawings are stored in the `drawings` store and serialized in Markdown as
  `![drawing](drawing://<id> "caption")`.
- Drawing blocks can have a caption, edited inline like image captions.
- Edit and delete actions appear on the block; deleting removes the node from
  the note and the drawing record from IndexedDB.
- Note cards resolve `drawing://` images to stored PNG previews with
  `hydrateDrawingUrls()`.

## Renderer (`Markdown.vue`)

Used by note cards and other surfaces that need a
lightweight read-only renderer.

### Styling

`src/components/common/markdown-content.css` mirrors Milkdown/Crepe's reset,
list, table and link typography so cards and chunks look like detail views:

- the same `--crepe-*` colours, fonts, heading sizes and margins;
- the same paragraph, inline-code, pre, blockquote and horizontal-rule styles;
- the same table borders/padding and task-list checkbox treatment;
- mention links keep their entity colour and chip padding;
- dark-mode variables come from the shared
  `body.body--dark .markdown-content` rule.

Known remaining differences are structural rather than typographic:

- markdown-it emits plain `<pre><code>` blocks, while the Milkdown view uses
  CodeMirror with syntax colours, line numbers and a copy button;
- markdown-it tight lists keep text directly inside `<li>`, while Milkdown
  wraps list content in paragraph nodes.

- Memoizes parsed HTML by `content + taskCheckboxEnabled` in a shallow `Map`
  capped at 100 entries.
- Injects `v-html` into a root element and attaches a capture-phase click
  listener.
- Internal link behavior:
  1. If the target ID is present in `props.anchorMap` (a `Set` of note IDs),
     try to find `#<id>` inside the root and scroll/highlight it.
  2. Otherwise, if `enableMentionModal` is true, open the entity in a global
     mention modal.
  3. Otherwise fall through to SPA navigation via `history.pushState` +
     `PopStateEvent`.
- Task checkbox handling (when enabled):
  - collects checkboxes in DOM order,
  - maps them to Markdown lines matching `^\s*[-*+]\s*\[([ xX])\]`,
  - toggles the corresponding character in the source,
  - emits `update:content` with the new Markdown.
- Sets up an `IntersectionObserver` but never uses `isVisible`.
- Loads every enabled `featureLinkKinds` store on mount (note, character,
  party, pawn, encounter, location and playlist in the default build) so mention
  modals can resolve entities.
- Cache key ignores `anchorMap` and `enableMentionModal`, which is fine because
  those affect behavior, not HTML.

### Security note

`html: true` plus `v-html` means raw HTML in note content is rendered. Rendered
HTML passes through `sanitizeMarkdownHtml()`: a fast path leaves ordinary
Markdown output untouched, while documents containing risky HTML are parsed and
filtered with DOMParser (dangerous tags, event handlers and unsafe URL schemes
are removed). A malicious `.zip` import or pasted HTML still deserves caution
because this is a custom sanitizer rather than a full HTML policy.
`sanitize-html` remains installed but is not used by the runtime.

## Editor (`MarkdownEditor.vue` + Milkdown)

- Props: `modelValue`, `isWYSIWYGMode`, `placeholder`, `rows`, `label`,
  `enableMentions`, `currentEntityType`, `currentEntityId`, `tags`.
- WYSIWYG: renders `MilkdownEditorWrapper` inside a `QCard`; two instances
  (mentions-enabled vs plain) share one `ref`, so only one is active at a time.
- Raw mode: flat `QEditor` with no toolbar, an HTML intermediary
  (`rawHtml`), and plain-text paste handling. Edits are converted back to
  Markdown, preserving block-anchor comments.
- Exposes `getMarkdown()` for parents (NoteEditor calls it on submit).

`getCurrentMarkdown()` returns the Milkdown wrapper's Markdown when visual mode
is active, otherwise it converts `rawHtml` back to Markdown and restores block
anchors from `modelValue`.

### Milkdown/Crepe integration

`MilkdownEditor.vue`:

- creates a `Crepe` instance with the current Markdown as default value,
- adds a custom `mentionFeature` (mark schema),
- adds `headingAnchorFeature` so `{#kind-id}` anchors work in both view and
  edit,
- adds `tagAutocompleteFeature` in edit mode and `tagDecorationFeature` in
  read-only mode,
- wires toolbar/block menu builders,
- emits Markdown on every editor update (edit mode only),
- exposes `getMarkdown()`, `getEditor()` and `getEditorView()`.

`plugins/mention.ts`:

- defines a `mention` mark with `kind`, `id`, `href`, `title`,
- parses `a[data-kind][data-id]` DOM,
- parses links whose URL matches `kind://id`,
- normalizes any default-link marks with `kind://id` into mention marks after
  parse, so existing mentions render with mention styling in the editor,
- serializes back to `[text](kind://id)`,
- provides toolbar/block-menu groups for note/party/pawn/encounter/location,
- marks the matching toolbar item active when the cursor/selection is inside a
  mention of that kind; clicking the active button removes the mention mark,
- opens a popup to choose an entity and inserts the mark at the selection.

The popup (`MentionInsertPopup.vue`) lists entities of the chosen kind,
supports search and keyboard navigation, and calls back into the editor.

### Tag autocomplete

Typing `#` in the visual editor opens `TagInsertPopup.vue`:

- `plugins/tagAutocomplete.ts` watches document transactions and detects
  `#query` immediately before the caret.
- Suggestions merge saved `noteStore.allTags`, the current note's tag list
  (including unsaved TagSelector changes), completed hashtags already in the
  content, and tags inserted through the popup during the current edit session.
  Matching is case-insensitive and prefix matches sort first.
- Users can pick an existing tag or create `#query`.
- The plugin replaces the typed `#query` range with `#tag` as plain text.
- A ProseMirror decoration gives every `#tag` the `tag-link` class in Milkdown,
  using the same colour/underline visual treatment as links.
- After the note is saved, `src/utils/tags.ts` extracts hashtags from the
  content and merges them into `note.tags`. Markdown headings such as
  `# Heading` are ignored.
- Keyboard navigation is capture-phase so Enter/Escape are handled before
  ProseMirror.

Known rough edges:

- The popup path sets a resolved route `href` plus the entity `id`; the
  no-popup fallback inserts a mark with `id: ''` and `href: null`.
  Serialization always writes `kind://id`, so the stored `href` is not the
  source of truth.
- Nested inline markdown in the entity title is flattened.

## Mention extraction

`extractMentionedEntities(text)` matches `[label](kind://id)` globally and
returns `{ kind, id }[]`.

- Duplicates are preserved at extraction time; the index `setLinks` dedupes by
  `kind:id`.
- Links inside code blocks are still matched (regex-based, not AST-based).
- `kind://` URLs without a label (bare autolinks) are not matched.
- The markdown-it renderer and `extractMentionedEntities()` only match
  `note`, `party`, `pawn`, `encounter` and `location`. `character` and
  `playlist` are feature link kinds in the default build, but the extraction
  regex ignores them; `CharacterView` reads `kind: 'character'` from the index
  and nothing writes it. Milkdown can render existing `character://` links
  because its mention parser accepts any enabled kind, but they are not indexed
  or offered in the mention toolbar.
- Hashtags are extracted with a regex, not an AST, so `#tag` inside inline code
  is also added to `note.tags`.

## Mention index

`createIndexationStore('mentions')` produces `useMentionsStore` backed by
`indexations_mentions`:

| Method                  | Behavior                                            |
| ----------------------- | --------------------------------------------------- |
| `load()`                | loads all records into `links: Record<key, Link[]>` |
| `addLink(from,to)`      | appends if missing, saves                           |
| `removeLink(from,to)`   | removes, saves                                      |
| `getLinks(from)`        | outgoing links                                      |
| `setLinks(from, links)` | dedupes and replaces                                |
| `clearLinks(from)`      | deletes the record                                  |
| `getBacklinks(target)`  | scans all keys                                      |
| `clearAll()`            | wipes the store                                     |

Only `noteStore.create/update/remove` call it. Nothing indexes party, pawn,
encounter or character descriptions/notes.

### Sidebar access (fixed)

The entity sidebars read the plain entity prop (`props.note`, `props.party`,
etc.). `CharacterView` publishes its sidepanel through `BaseEntityView`, so
character mentions render too.

## Limitations

- Raw HTML is supported by the markdown-it renderer (`html: true` plus the
  DOMParser sanitizer) but Milkdown renders raw HTML as text. Content that
  relies on raw HTML looks different in detail views.
- Entity link regex cannot express IDs outside `[A-Za-z0-9_-]`.
- Character and playlist links are not extracted or indexed; character links
  render only inside Milkdown, and playlist links are not rendered by the
  markdown-it renderer.
- Mention index not rebuilt on import/restore.
- Backlinks are an O(n) scan.
- No wiki-style `[[link]]` syntax; only Markdown links.
- Task list toggling is line-based and assumes checkboxes map one-to-one to
  list lines.
- `MilkdownView` loads every enabled entity store per instance; a detail page
  normally has one instance, but opening a mention modal creates another.
- `Markdown` still loads all link-kind stores per card; a note list with many
  cards triggers repeated `load()` calls (each `getAll`), which is wasteful.
