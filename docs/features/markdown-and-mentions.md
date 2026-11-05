# Markdown and Mentions

## Purpose

Markdown is the content format for notes and module documents. A custom
markdown-it pipeline adds internal entity links, task lists, heading anchors,
and external-link handling. A separate index tracks which notes mention which
entities.

## Key files

| File                                         | Role                                                 |
| -------------------------------------------- | ---------------------------------------------------- |
| `src/utils/markdownParser.ts`                | markdown-it instance, plugins, mention extraction    |
| `src/components/common/Markdown.vue`         | Renderer (v-html) + checkbox handling + link routing |
| `src/components/common/MarkdownEditor.vue`   | WYSIWYG/raw editor switch                            |
| `src/components/common/milkdown/*`           | Crepe integration and mention insertion              |
| `src/utils/storage.ts#createIndexationStore` | Mention index                                        |
| `src/stores/notes.ts`                        | Writes the index on note save/delete                 |
| `src/components/common/Mentions.vue`         | Renders mention/backlink lists                       |

## Rendering pipeline (`markdownParser.ts`)

The module creates one markdown-it instance:

```ts
new MarkdownIt({ html: true, linkify: true, breaks: false });
```

and installs three renderer plugins.

### 1. Internal entity links

Syntax: `[label](kind://id)` where `kind` is one of
`note | module | party | monster | encounter` and `id` matches
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

`ModuleDocumentView` relies on this to generate `id="note-<id>"` headings.

## Renderer (`Markdown.vue`)

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
- Loads all stores on mount (notes, modules, parties, monsters, encounters) so
  mention modals can resolve entities.
- Cache key ignores `anchorMap` and `enableMentionModal`, which is fine because
  those affect behavior, not HTML.

### Security note

`html: true` plus `v-html` means raw HTML in note content is executed/rendered
without sanitization. A malicious `.zip` module (imported via a path that
bypasses validation) or pasted HTML can inject scripts or event handlers.
`sanitize-html` remains a dependency for the offline Markdown build script; the
runtime uses the browser-safe DOMParser sanitizer described above.

## Editor (`MarkdownEditor.vue` + Milkdown)

- Props: `modelValue`, `isWYSIWYGMode`, `placeholder`, `rows`, `label`,
  `enableMentions`, `currentEntityType`, `currentEntityId`.
- WYSIWYG: renders `MilkdownEditorWrapper` inside a `QCard`; two instances
  (mentions-enabled vs plain) share one `ref`, so only one is active at a time.
- Raw mode: flat `QEditor` with no toolbar, plus plain-text paste handling.
- Exposes `getMarkdown()` for parents (NoteEditor calls it on submit).

`getCurrentMarkdown()` returns the Milkdown wrapper's Markdown when the wrapper
exists, otherwise the bound `modelValue`. Raw-mode edits are bound through
`:model-value`/`@update:model-value` and are reflected in `modelValueProxy`.

### Milkdown/Crepe integration

`MilkdownEditor.vue`:

- creates a `Crepe` instance with the current Markdown as default value,
- adds a custom `mentionFeature` (mark schema),
- wires toolbar/block menu builders,
- emits Markdown on every editor update,
- exposes `getMarkdown()`.

`plugins/mention.ts`:

- defines a `mention` mark with `kind`, `id`, `href`, `title`,
- parses `a[data-kind][data-id]` DOM,
- parses links whose URL matches `kind://id`,
- serializes back to `[text](kind://id)`,
- provides toolbar/block-menu groups for note/module/party/monster/encounter,
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
- After the note is saved, `src/utils/tags.ts` extracts hashtags from the
  content and merges them into `note.tags`. Markdown headings such as
  `# Heading` are ignored.
- Keyboard navigation is capture-phase so Enter/Escape are handled before
  ProseMirror.

Known rough edges:

- `insertMentionMark` inserts `href: \`${kind}://\``(no ID); the mark's`id`attribute is set separately, and serialization uses`kind://id`. The
`href`value is therefore inconsistent but unused by`toMarkdown`.
- The fallback path when no popup is registered inserts a mark with `id: ''`.
- Nested inline markdown in the entity title is flattened.

## Mention extraction

`extractMentionedEntities(text)` matches `[label](kind://id)` globally and
returns `{ kind, id }[]`.

- Duplicates are preserved at extraction time; the index `setLinks` dedupes by
  `kind:id`.
- Links inside code blocks are still matched (regex-based, not AST-based).
- `kind://` URLs without a label (bare autolinks) are not matched.
- Only five kinds are supported; `character` is not mentionable even though
  `CharacterView` reads `kind: 'character'` from the index and nothing ever
  writes it.
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

Only `noteStore.create/update/remove` call it. Nothing indexes module,
party, monster, encounter, or character content (none of those have content
fields anyway).

### Sidebar access (fixed)

The four entity sidebars now read the plain entity prop (`props.note`,
`props.party`, etc.). `CharacterView` publishes its sidepanel through
`BaseEntityView`, so character mentions render too.

## Limitations

- Unsanitized HTML rendering (security).
- Entity link regex cannot express IDs outside `[A-Za-z0-9_-]`.
- No character links.
- Mention index not rebuilt on import/restore.
- Backlinks are an O(n) scan.
- No wiki-style `[[link]]` syntax; only Markdown links.
- Task list toggling is line-based and assumes checkboxes map one-to-one to
  list lines.
- `Markdown` loads five stores per instance; a note list with many cards
  triggers repeated `load()` calls (each `getAll`), which is wasteful.
