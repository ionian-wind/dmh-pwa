# Milkdown View Renderer — Implementation Plan

**Status:** planned — not implemented.

**Goal:** render Markdown detail views with the same Milkdown/Crepe pipeline
that the editor uses, so reading and editing produce the same result for
headings, lists, tables, task items, mentions, tags and entity links.

**Progress:** update this file while implementing. Change `- [ ]` to `- [x]`
and append `— done` plus the commit/date when a task is complete.

---

## 1. Decisions

| Decision                       | Value                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- |
| Canonical content format       | Markdown; no stored HTML snapshots                                      |
| Detail-view renderer           | Read-only Milkdown/Crepe                                                |
| Note-card renderer             | Keep markdown-it in phase 1                                             |
| Module document chunks         | Keep markdown-it in phase 1; evaluate a static renderer in phase 4      |
| Crepe feature set in view      | Same schema-producing features; disable only UI-only features           |
| Task checkbox toggling in view | Preserve via a ProseMirror transaction, then emit updated Markdown      |
| Mention kinds                  | Resolve from `featureLinkKinds`; disabled kinds must not open           |
| Raw HTML                       | Milkdown renders it as text; accept for phase 1 unless content needs it |
| Data model / migrations        | No changes; storage, backups and exports remain Markdown                |
| Feature flags                  | Build-time only; no runtime renderer switching based on flags           |
| Fallback renderer              | `Markdown.vue` stays available for cards, chunks and non-Milkdown paths |

### Why not replace every view surface immediately

- `NoteCard.vue` renders all notes in a masonry grid with `v-for`. One Crepe
  instance per card would be too expensive.
- `ModuleDocumentView.vue` renders virtualized chunks. A single static
  renderer is a better fit than one editor instance per visible chunk.
- The existing tag/mention popup plugins use module-level singletons. A
  read-only view must not register those popup triggers.

---

## 2. Scope

### In scope

- A reusable read-only Milkdown view component.
- Detail views: notes, parties, monsters, characters, locations and the
  mention-modal note preview.
- Shared plugins for entity mentions, tag decorations and heading anchors.
- Click routing for entity links, tag links and external links.
- Task checkbox toggling from the view.
- Accessibility, styling, tests and documentation.

### Out of scope (phase 1)

- Replacing `NoteCard.vue` or `ModuleDocumentView.vue`.
- Removing `markdown-it` or `markdownParser.ts`.
- Changing stored Markdown, IndexedDB schemas, migrations or backups.
- Redesigning the editor.
- Rendering unsanitized raw HTML.

---

## 3. Architecture

```text
MarkdownEditor.vue (edit)
  └─ MilkdownEditorWrapper
       └─ MilkdownEditor (Crepe, editable)

MarkdownView.vue (new, read-only)
  └─ MilkdownProvider
       └─ MilkdownEditor (Crepe, readonly)
            ├─ mentionFeature
            ├─ tagDecorationFeature
            └─ headingAnchorFeature

Markdown.vue (unchanged in phase 1)
  └─ markdownParser.ts (cards, module chunks, exports)
```

Planned files:

| File                                                      | Change                                                   |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `src/components/common/milkdown/MilkdownEditor.vue`       | Add `readonly` mode and external-content synchronization |
| `src/components/common/milkdown/MilkdownView.vue`         | New read-only component with view interactions           |
| `src/components/common/milkdown/plugins/mention.ts`       | Use `featureLinkKinds`; normalize hrefs                  |
| `src/components/common/milkdown/plugins/tagDecoration.ts` | New decoration-only plugin extracted from autocomplete   |
| `src/components/common/milkdown/plugins/headingAnchor.ts` | New remark + heading schema extension                    |
| `src/notes/NoteView.vue`                                  | Use `MilkdownView` in read mode                          |
| `src/parties/PartyView.vue`                               | Use `MilkdownView` in read mode                          |
| `src/monsters/MonsterView.vue`                            | Use `MilkdownView` in read mode                          |
| `src/characters/CharacterView.vue`                        | Use `MilkdownView` in read mode                          |
| `src/maps/views/LocationView.vue`                         | Use `MilkdownView` in read mode                          |
| `src/components/common/EntityMainContent.vue`             | Use `MilkdownView` for note content                      |
| `docs/features/markdown-and-mentions.md`                  | Document the two renderers and their responsibilities    |
| `docs/components/markdown-editor.md`                      | Document read-only mode and shared plugins               |

---

## 4. Implementation tasks

### Phase 0 — prerequisites and shared behavior

- [ ] `MDV-001` Inventory every `Markdown.vue` consumer and classify it as
      detail view, card preview or module chunk. Record the classification in
      this plan or in the Markdown feature docs.
- [ ] `MDV-002` Replace hardcoded mention kinds in
      `src/components/common/milkdown/plugins/mention.ts` with
      `featureLinkKinds`. - Use the same `kind`, `route`, `titleField` and `id` data as
      `markdownParser.ts`. - Fix the current `map` vs `location` mismatch. - Normalize `href` to the feature route instead of `kind://id` or
      `/${kind}s/${id}`.
- [ ] `MDV-003` Ensure disabled feature kinds remain non-interactive in the
      view. Unknown or disabled kinds must not open a modal or navigate.
- [ ] `MDV-004` Extract the decoration-only part of
      `plugins/tagAutocomplete.ts` into `plugins/tagDecoration.ts`. - Keep `tag-link` and `data-tag` decoration behavior. - Do not include the singleton autocomplete trigger in the view plugin.
- [ ] `MDV-005` Add a heading-anchor feature for `## Title {#kind-id}`. - Remark plugin strips the marker from the displayed heading text. - Store the anchor kind and id on the heading node. - Heading schema emits `id="kind-id"`, `data-kind` and `data-id`. - Do not require round-tripping the marker from the read-only view.
- [ ] `MDV-006` Add unit tests for mention-kind resolution and heading-anchor
      parsing before integrating the view component.

### Phase 1 — read-only Milkdown component

- [ ] `MDV-010` Add a `readonly` prop to `MilkdownEditor.vue`. - Call `crepe.setReadonly(true)` before or immediately after creation. - Keep schema-producing features enabled: `ListItem`, `CodeMirror`,
      `Table`, `Latex`, `ImageBlock`. - Disable UI-only features in read-only mode: `Toolbar`, `BlockEdit`,
      `Placeholder`, `LinkTooltip`, `Cursor`, `TopBar`.
- [ ] `MDV-011` Synchronize external `modelValue` changes in read-only mode
      using a Milkdown `replaceAll`-style document update. Do not re-emit the
      same value back to the parent.
- [ ] `MDV-012` Create `MilkdownView.vue` with props matching `Markdown.vue`:
      `content`, `anchorMap`, `enableMentionModal`, `taskCheckboxEnabled`,
      `scrollToAnchor`.
- [ ] `MDV-013` Reuse the entity mention mark and add the tag decoration plus
      heading-anchor feature to the read-only view.
- [ ] `MDV-014` Add capture-phase click handling for: - `.internal-link` with `data-kind` and `data-id`; - `.tag-link` with `data-tag`; - external `http(s)` links.
- [ ] `MDV-015` Preserve internal-link behavior: - anchor scroll when the target is in `anchorMap`; - mention modal when `enableMentionModal` is true; - SPA navigation fallback via `history.pushState` + `PopStateEvent`.
- [ ] `MDV-016` Implement task checkbox toggling when
      `taskCheckboxEnabled` is true. - Find the clicked `list_item` through the ProseMirror view. - Dispatch a transaction that flips `checked`. - Emit the updated Markdown through `update:content`. - Keep the checkbox non-interactive when the prop is false.
- [ ] `MDV-017` Load the entity stores needed by mention modals once per view
      instance, matching `Markdown.vue` behavior.
- [ ] `MDV-018` Add styles for the read-only wrapper so Crepe content fills the
      existing content surface without editor chrome.

### Phase 2 — detail-view integration

- [ ] `MDV-020` Replace `Markdown` with `MilkdownView` in `NoteView.vue` read
      mode, preserving `taskCheckboxEnabled`, `enableMentionModal` and
      `update:content`.
- [ ] `MDV-021` Replace `Markdown` with `MilkdownView` in `PartyView.vue` read
      mode.
- [ ] `MDV-022` Replace `Markdown` with `MilkdownView` in `MonsterView.vue`
      read mode.
- [ ] `MDV-023` Replace `Markdown` with `MilkdownView` in `CharacterView.vue`
      read mode.
- [ ] `MDV-024` Replace `Markdown` with `MilkdownView` in `LocationView.vue`
      read mode.
- [ ] `MDV-025` Replace `Markdown` with `MilkdownView` in
      `EntityMainContent.vue` for note content and mention-modal previews.
- [ ] `MDV-026` Keep `Markdown` in `NoteCard.vue` and
      `ModuleDocumentView.vue`; document why.
- [ ] `MDV-027` Remove or scope the old `.markdown-content` styles from the
      detail views that now use Milkdown.

### Phase 3 — verification and documentation

- [ ] `MDV-030` Add component or integration tests for `MilkdownView.vue`.
      Cover headings, lists, tables, task items, entity links, tag links,
      external links and content updates.
- [ ] `MDV-031` Add an E2E test that opens a note with mixed Markdown, switches
      to edit and back, and asserts the visible structure is unchanged.
- [ ] `MDV-032` Verify mention links for every enabled kind and for a disabled
      kind.
- [ ] `MDV-033` Verify task toggling emits the same Markdown that the editor
      would produce.
- [ ] `MDV-034` Run `npm run types-check`, the Markdown/notes/entity tests and
      the production build.
- [ ] `MDV-035` Update `docs/features/markdown-and-mentions.md` with the
      renderer split and the new shared plugins.
- [ ] `MDV-036` Update `docs/components/markdown-editor.md` with read-only mode,
      lifecycle and content synchronization.
- [ ] `MDV-037` Check bundle output and PWA precache size; confirm that routes
      already loading the editor do not gain a second Milkdown copy.

### Phase 4 — optional full-parity renderer

Only start this phase if card previews and module chunks also need exact
Milkdown parity.

- [ ] `MDV-040` Design a singleton headless Milkdown renderer that parses
      Markdown once and serializes HTML for cards and chunks.
- [ ] `MDV-041` Provide a static task-list `toDOM` with real checkboxes.
- [ ] `MDV-042` Reuse the mention, tag and heading-anchor plugins.
- [ ] `MDV-043` Decide whether to keep `markdown-it` for exports and legacy
      fallback.
- [ ] `MDV-044` Measure list and virtual-scroll performance before replacing
      `Markdown.vue` globally.

---

## 5. Acceptance criteria

- Detail views render Markdown through Milkdown and match the editor's visible
  structure for common content.
- Entity links, tag links, external links and mention modals work from the
  read-only view.
- Task checkboxes can be toggled from the view when enabled and produce valid
  Markdown.
- `{#kind-id}` headings still produce usable anchors.
- Disabled feature kinds cannot be opened from rendered content.
- Note cards and module chunks keep their current performance profile.
- No data schema, migration or backup changes.
- `types-check`, targeted tests and the production build pass.

---

## 6. Manual verification

1. Create a note containing headings, emphasis, a bullet list, a task list, a
   table, code, an entity mention, a `#tag` and an external link.
2. View the note, then edit it, then view it again; compare the visible result.
3. Click entity mentions with modals enabled and disabled.
4. Click a tag link and confirm the notes list filters by that tag.
5. Toggle a task item from the view and confirm the stored Markdown changed.
6. Open a module document and confirm anchors still scroll and heading URLs
   still work.
7. Disable a feature in a test build and confirm its links in existing content
   remain non-interactive.

---

## 7. Risks and open questions

- **Raw HTML:** Milkdown renders HTML as text. Confirm whether existing notes
  rely on rendered HTML; otherwise accept the safer behavior.
- **Performance:** one read-only Crepe instance is acceptable for detail views,
  but not for note grids.
- **Testing:** the editor wrapper currently has little component coverage;
  mounting Crepe in jsdom may need browser-only shims. Prefer E2E for full
  parity.
- **Anchor prefix:** the current `Markdown.vue` looks up `#<id>` while headings
  render `id="<kind>-<id>"`. Fix this while adding the Milkdown anchor plugin.
- **Singleton plugins:** keep tag autocomplete and mention popup triggers out of
  the read-only view.

---

## 8. Related documents

- [`../features/markdown-and-mentions.md`](../features/markdown-and-mentions.md)
- [`../components/markdown-editor.md`](../components/markdown-editor.md)
- [`../architecture/feature-flags.md`](../architecture/feature-flags.md)
