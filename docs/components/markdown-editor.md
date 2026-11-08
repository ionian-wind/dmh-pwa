# Markdown Editor (Milkdown / Crepe)

## Purpose

WYSIWYG Markdown editing for notes and document sections, with an optional
mention insertion workflow. The editor is wrapped so that a parent can switch
between visual and raw modes and retrieve the canonical Markdown on submit.

## Component stack

```
NoteEditor
  └─ MarkdownEditor            (mode switch, label, help, getMarkdown())
       └─ MilkdownEditorWrapper (provides Milkdown context)
            └─ MilkdownEditor   (Crepe instance, mention plugin, popup)
                 └─ Milkdown    (from @milkdown/vue)
                 └─ MentionInsertPopup

Entity detail views
  └─ MilkdownView              (read-only Crepe, link/task handling)
       └─ MilkdownEditor       (readonly; no popups)
```

## `MarkdownEditor.vue`

Props:

| Prop                                        | Meaning                                              |
| ------------------------------------------- | ---------------------------------------------------- |
| `modelValue`                                | Markdown source                                      |
| `isWYSIWYGMode`                             | Visual vs raw editor                                 |
| `placeholder`, `rows`, `label`, `className` | UI                                                   |
| `enableMentions`                            | Enables mention toolbar/menu                         |
| `currentEntityType`, `currentEntityId`      | Excludes the edited entity from its own mention list |
| `tags`                                      | Recent/selected tags offered by tag autocomplete     |

Emits `update:modelValue`, exposes `getMarkdown()`.

- Visual mode: `MilkdownEditorWrapper` inside a borderless `QCard`.
- Raw mode: a Quasar `QEditor` with an empty toolbar. Markdown text is
  converted to/from QEditor HTML with `markdownRaw.ts`, preserving persistent
  block anchors. The formatting-help button in the note editor footer (raw
  mode only) and in the entity editor/detail headers links to
  `helpcenter/<locale>/reference/markdown.md` (built as a static help page) in
  a new tab; it documents markdown, internal links, entity mentions and hashtag
  tags.
- `getCurrentMarkdown()` returns the wrapper's Markdown when available,
  otherwise `modelValue`.
  If the user toggles from WYSIWYG to raw and edits, the ref may still hold the
  old WYSIWYG content, so submit could discard raw edits. In practice the raw
  textarea binds `modelValueProxy`, and the wrapper is only rendered in WYSIWYG
  mode; after toggling back, Crepe may be recreated. Treat this as fragile.

## `MilkdownEditorWrapper.vue`

A 22-line wrapper that provides `MilkdownProvider` and forwards `modelValue`,
`currentEntityType`, `currentEntityId`, and `update:modelValue`.

## `MilkdownEditor.vue`

- Creates a `Crepe` instance in `useEditor` with:
  - `defaultValue = props.modelValue`,
  - feature configs from `crepeConfig.ts` for `Toolbar`, `BlockEdit` and
    `Placeholder`,
  - `.addFeature(mentionFeature)`,
  - `.addFeature(headingAnchorFeature)` for `{#kind-id}` heading anchors and
    persistent `<!-- dmh:block=… -->` heading/paragraph anchors,
  - `.addFeature(drawingFeature)` for inline drawing nodes,
  - `.addFeature(tagDecorationFeature)` + `.addFeature(tocFeature)` in
    read-only mode, or `.addFeature(tagAutocompleteFeature)` in edit mode.
- `crepeConfig.ts` maps Crepe toolbar/menu/placeholder labels and mention
  entries through the app's Vue I18n instance. Toolbar heading options and the
  built-in heading/formatting group labels are localized too.
- Registers `api.markdownUpdated` to emit `update:modelValue` on every change
  in edit mode. In read-only mode it only records the applied Markdown so the
  external-value watcher can ignore its own echo.
- Exposes `getMarkdown()` and, in read-only mode, `getToc()`.
- Shows `MentionInsertPopup` and the tag popup only in edit mode, and
  `DrawingEditorModal` when an inline drawing is created or opened.
- `getMentionables(kind)` resolves the store via
  `getMentionableEntities(kind)`, handles both unwrapped arrays and refs, and
  excludes the current entity.

The editor instance is stored in a `shallowRef`; using a deep `ref` wraps the
Crepe class in a Vue proxy and breaks private-field access on the `editor`
getter.

External changes to `modelValue` are applied in read-only mode with Milkdown's
`replaceAll` macro. Edit mode still constructs Crepe once with the initial
value; `NoteEditor` remounts/rebuilds the object when switching notes.

## `MilkdownView.vue` (read-only)

Used by note, party, pawn, character, encounter and location detail views and
by `EntityInfoDialog`. It wraps `MilkdownEditor` in `MilkdownProvider` and
passes `readonly`.

Props: `content`, optional `anchorMap`, `enableMentionModal`,
`taskCheckboxEnabled`, `scrollToAnchor`, `bookmarkedIds`. Emits
`update:content`, `toc-update` and `bookmark-toggle`.

- The editor is `contenteditable="false"`.
- Capture-phase link handling supports:
  - entity mentions (`.internal-link[data-kind][data-id]`),
  - tag decorations (`.tag-link[data-tag]`),
  - disabled entity links (`.disabled-internal-link`),
  - external links (opened in a new tab).
- Entity mentions keep the existing behavior: anchor scroll when the target is
  in `anchorMap`, mention modal when `enableMentionModal` is true, otherwise
  SPA navigation.
- Task labels toggle the matching Markdown source line and emit
  `update:content`. The source-line patch preserves bullet style, tag escaping
  and heading anchor markers instead of re-serializing the whole document.
- Resolves mention targets through the feature link-kind stores; it creates the
  store handles during setup rather than loading them.
- Heading anchors can emit a table of contents (`toc-update`), and
  `bookmarkedIds` drives the inline bookmark widgets (`bookmark-toggle`).
- Uses `.milkdown-view :deep(.milkdown .ProseMirror) { padding: 0 }` so the
  existing content surfaces control spacing.

## Mention plugin (`plugins/mention.ts`)

### Mark schema

Attributes: `kind`, `id`, `href`, `title`.

- `parseDOM` reads `a[data-kind][data-id]`.
- `toDOM` renders an `<a>` with `class="internal-link <kind>-link"` and the
  route from `featureLinkKinds`. Kinds that are not enabled in the current
  build render as `<span class="disabled-internal-link">`.
- `parseMarkdown` matches `kind://id` links for enabled and disabled kinds so
  existing content remains visible but disabled links stay non-interactive.
- `toMarkdown` writes `[text](kind://id)` via a link mark.

### Insertion flow

1. Toolbar/block menu calls `insertMentionMark(ctx, kind, label, source)`.
2. If a popup trigger is registered, it computes a screen position from the
   editor selection (`coordsAtPos`, fallback 100/100) and calls the trigger.
3. `MilkdownEditor` receives the request, resolves the entity list, and opens
   `MentionInsertPopup`.
4. Selecting an entity:
   - deletes the current selection,
   - inserts the selected text (or entity title when nothing is selected),
   - adds the mention mark with `kind`, `id`, the feature route as `href`, and
     `title`.
5. `api.markdownUpdated` emits the serialized Markdown, yielding
   `[title](kind://id)`.

### Popup (`MentionInsertPopup.vue`)

- Search input, filtered list, keyboard up/down/enter/escape.
- Positioned absolutely at the coordinates from the editor.
- Closes on outside mousedown or escape.
- Calls `onSelect` and `onClose` (twice on click: `selectMention` calls both,
  and the parent `onSelect` also calls `closeMentionPopup` — idempotent).

### Known rough edges

- Fallback insertion without a registered popup writes `id: ''`.
- No debounce on entity filtering; large stores filter on every keystroke.
- No virtualization in the popup list.
- Entity stores are not loaded by the editor; if the user opens the mention
  menu before a store's `load()`, the list is empty.
- The mention popup is positioned absolutely relative to the nearest
  positioned ancestor, not the viewport, so coordinates from
  `getBoundingClientRect` can be offset.
- Serializing the whole document (for example after a task edit) changes `-`
  bullets to `*` and may escape a leading `#` in tags. `MilkdownView` avoids
  this by patching only the affected source line.

## Raw Markdown mode

A flat, square Quasar `QEditor` with `:toolbar="[]"` and no outline. Because
QEditor works in HTML while notes store Markdown, `markdownRaw.ts` converts
newlines/escaping in both directions. Paste events are intercepted per the
Quasar docs plaintext-paste example: only `text/plain` is inserted through
`runCmd('insertText', ...)`, so rich markup and pasted images are discarded. It
does not provide syntax highlighting, link autocomplete, or a preview.

## Persistence path

`NoteEditor` keeps `editedNote.content` and calls
`markdownEditorRef.getMarkdown()` on submit. Because Milkdown emits on every
keystroke, `modelValue` is usually already current. Detail views use
`MilkdownView`; task labels there update only the matching source line and emit
`update:content`, which the parent persists through the normal store update.

## Testing

`tests/components/milkdownView.test.ts` covers tag clicks, disabled links,
mention modals, task line toggling and heading-anchor extraction.
`tests/e2e/milkdown-view.e2e.ts` covers read-only rendering, switching to edit
and back, and persisting a task toggle.
`tests/components/staticRenderer.test.ts` covers the singleton static renderer;
`headingAnchor`, `tocPlugin`, `tagAutocomplete`, `tagInsertPopup`,
`markdownEditorRaw` and `crepeConfig` tests cover the editor plugins and raw
mode.

Performance is measured with `npm run perf:markdown` against
`markdown-dataset`; results and the adoption decision are documented in
[`../architecture/markdown-rendering-performance.md`](../architecture/markdown-rendering-performance.md).

The Milkdown/Crepe dependency is heavy (multiple packages at v7.23.0) and is a
significant share of the bundle. Every feature that renders Markdown already
imports an editor, so the view component does not introduce a second copy; the
remaining cost is one read-only Crepe instance per detail page, not per note
card.

The markdown-it card/chunk renderer uses
`src/components/common/markdown-content.css` to mirror Crepe's typography,
tables, lists, links and dark-mode variables. Code blocks remain plain
`<pre><code>` because markdown-it does not run CodeMirror.
