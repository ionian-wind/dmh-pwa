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

Emits `update:modelValue`, exposes `getMarkdown()`.

- Visual mode: `MilkdownEditorWrapper` inside a borderless `QCard`.
- Raw mode: a Quasar `QEditor` with an empty toolbar. Markdown text is
  converted to/from QEditor HTML with `markdownRaw.ts`. Formatting help lives
  in `MarkdownHelpDialog`, opened from the note editor footer when raw mode is
  active; it documents markdown, internal links, entity mentions, and hashtag
  tags. The help body has no inner scroll container of its own: the surrounding
  modal `QScrollArea` is the single scroll owner.
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
  - `.addFeature(mentionFeature)`.
- `crepeConfig.ts` maps Crepe toolbar/menu/placeholder labels and mention
  entries through the app's Vue I18n instance. Toolbar heading options and the
  built-in heading/formatting group labels are localized too.
- Registers `api.markdownUpdated` to emit `update:modelValue` on every change.
- Exposes `getMarkdown()`.
- Shows `MentionInsertPopup` when the global trigger fires.
- `getMentionables(kind)` resolves the store via
  `getMentionableEntities(kind)`, handles both unwrapped arrays and refs, and
  excludes the current entity.

Because Crepe is constructed once with the initial value, external changes to
`modelValue` (e.g. switching notes while the editor stays mounted) are not
applied. `NoteEditor` remounts/rebuilds the object, but the wrapper has no
watch to call `crepe.setMarkdown`.

## Mention plugin (`plugins/mention.ts`)

### Mark schema

Attributes: `kind`, `id`, `href`, `title`.

- `parseDOM` reads `a[data-kind][data-id]`.
- `toDOM` renders an `<a>` with `class="internal-link <kind>-link"` and
  `href = href || '/<kind>s/<id>'`.
- `parseMarkdown` matches links whose URL is `kind://id`.
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
   - adds the mention mark with `kind`, `id`, `href: kind://`, and `title`.
5. `api.markdownUpdated` emits the serialized Markdown, yielding
   `[title](kind://id)`.

### Popup (`MentionInsertPopup.vue`)

- Search input, filtered list, keyboard up/down/enter/escape.
- Positioned absolutely at the coordinates from the editor.
- Closes on outside mousedown or escape.
- Calls `onSelect` and `onClose` (twice on click: `selectMention` calls both,
  and the parent `onSelect` also calls `closeMentionPopup` — idempotent).

### Known rough edges

- `href: \`${kind}://\``lacks the ID. The link mark's own`id` attribute is
  correct and serialization uses it, so output is right, but the DOM anchor
  before serialization may have a useless href.
- Fallback insertion without a registered popup writes `id: ''`.
- No debounce on entity filtering; large stores filter on every keystroke.
- No virtualization in the popup list.
- Entity stores are not loaded by the editor; if the user opens the mention
  menu before a store's `load()`, the list is empty.
- The mention popup is positioned absolutely relative to the nearest
  positioned ancestor, not the viewport, so coordinates from
  `getBoundingClientRect` can be offset.

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
keystroke, `modelValue` is usually already current. `NoteView` also renders a
read-only `Markdown` view; task checkboxes there can write content directly.

## Testing

There are no tests covering the Milkdown wrapper or the mention popup. The
Milkdown/Crepe dependency is heavy (multiple packages at v7.21.1) and is a
significant share of the bundle.
