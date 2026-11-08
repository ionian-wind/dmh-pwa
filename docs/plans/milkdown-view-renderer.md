# Milkdown View Renderer — Implementation Plan

**Status:** implemented (phases 1–4); static renderer evaluated and not adopted.

**Implementation commits:** `734fe82b` (detail-view renderer), `0446e415`
(static renderer + performance evaluation).

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
| Note-card renderer             | Keep markdown-it; static Milkdown measured ~5–6× slower                 |
| Crepe feature set in view      | Same schema-producing features; disable only UI-only features           |
| Task checkbox toggling in view | Patch the matching Markdown source line, then emit updated Markdown     |
| Mention kinds                  | Resolve from `featureLinkKinds`; disabled kinds must not open           |
| Raw HTML                       | Milkdown renders it as text; accept for phase 1 unless content needs it |
| Data model / migrations        | No changes; storage, backups and exports remain Markdown                |
| Feature flags                  | Build-time only; no runtime renderer switching based on flags           |
| Fallback renderer              | `Markdown.vue` stays available for cards, chunks and non-Milkdown paths |

### Why not replace every view surface immediately

- `NoteCard.vue` renders all notes in a masonry grid with `v-for`. One Crepe
  instance per card would be too expensive.
- The existing tag/mention popup plugins use module-level singletons. A
  read-only view must not register those popup triggers.

---

## 2. Scope

### In scope

- A reusable read-only Milkdown view component.
- Detail views: notes, parties, pawns, characters, locations and the
  mention-modal note preview.
- Shared plugins for entity mentions, tag decorations and heading anchors.
- Click routing for entity links, tag links and external links.
- Task checkbox toggling from the view.
- Accessibility, styling, tests and documentation.

### Out of scope (phase 1)

- Replacing `NoteCard.vue`.
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
  └─ markdownParser.ts (cards, exports)
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
| `src/pawns/PawnView.vue`                                  | Use `MilkdownView` in read mode                          |
| `src/characters/CharacterView.vue`                        | Use `MilkdownView` in read mode                          |
| `src/maps/views/LocationView.vue`                         | Use `MilkdownView` in read mode                          |
| `src/components/common/EntityMainContent.vue`             | Use `MilkdownView` for note content                      |
| `docs/features/markdown-and-mentions.md`                  | Document the two renderers and their responsibilities    |
| `docs/components/markdown-editor.md`                      | Document read-only mode and shared plugins               |

---

## 4. Implementation tasks

### Phase 0 — prerequisites and shared behavior

- [x] `MDV-001` Inventory every `Markdown.vue` consumer — done. Detail views
      use `MilkdownView`; `NoteCard` keeps `Markdown`.
- [x] `MDV-002` Replace hardcoded mention kinds in `mention.ts` with
      `featureLinkKinds` — done. The kind regex now accepts any `kind://id` and
      enabled kinds resolve their route from the feature catalog. The `map` /
      `location` mismatch is fixed.
- [x] `MDV-003` Keep disabled or unknown kinds non-interactive — done. They
      render as `.disabled-internal-link` spans and the view click handler
      prevents navigation.
- [x] `MDV-004` Extract the decoration-only tag plugin into
      `plugins/tagDecoration.ts` — done. The autocomplete singleton stays out
      of the read-only view.
- [x] `MDV-005` Add a heading-anchor feature for `## Title {#kind-id}` — done.
      The remark plugin strips the marker, the heading schema emits
      `id="kind-id"`, `data-kind` and `data-id`, and the heading-id generator is
      overridden so the anchor is not replaced by a slug.
- [x] `MDV-006` Add tests for heading-anchor parsing and disabled entity links
      — done in `tests/components/milkdownView.test.ts`.

### Phase 1 — read-only Milkdown component

- [x] `MDV-010` Add a `readonly` prop to `MilkdownEditor.vue` — done. Read-only
      mode calls `setReadonly(true)` and disables UI-only features while
      keeping schema-producing features enabled.
- [x] `MDV-011` Synchronize external `modelValue` changes in read-only mode —
      done with Milkdown's `replaceAll` macro and a last-applied-value guard.
- [x] `MDV-012` Create `MilkdownView.vue` with props matching `Markdown.vue` —
      done: `content`, `anchorMap`, `enableMentionModal`,
      `taskCheckboxEnabled`, `scrollToAnchor`.
- [x] `MDV-013` Reuse the entity mention mark and add the tag decoration plus
      heading-anchor feature — done.
- [x] `MDV-014` Add capture-phase click handling — done for `.internal-link`,
      `.tag-link`, `.disabled-internal-link` and external links.
- [x] `MDV-015` Preserve internal-link behavior — done: anchor scroll, mention
      modal and SPA navigation fallback.
- [x] `MDV-016` Implement task checkbox toggling — done with source-line
      patching. The clicked task item is mapped to its Markdown line, the line
      marker is flipped and `update:content` is emitted. This preserves bullet
      style, tag escaping and heading anchor markers.
- [x] `MDV-017` Load the entity stores needed by mention modals — done.
- [x] `MDV-018` Add read-only wrapper styles — done. Crepe padding is removed
      so the existing content surfaces control spacing.

### Phase 2 — detail-view integration

- [x] `MDV-020` Use `MilkdownView` in `NoteView.vue` — done.
- [x] `MDV-021` Use `MilkdownView` in `PartyView.vue` — done.
- [x] `MDV-022` Use `MilkdownView` in `PawnView.vue` — done.
- [x] `MDV-023` Use `MilkdownView` in `CharacterView.vue` — done.
- [x] `MDV-024` Use `MilkdownView` in `LocationView.vue` — done.
- [x] `MDV-025` Use `MilkdownView` in `EntityMainContent.vue` — done.
- [x] `MDV-026` Keep `Markdown` in `NoteCard.vue` — done. Cards stay on
      markdown-it.
- [x] `MDV-027` Remove or scope old `.markdown-content` styles — done. The
      unused NoteView overrides were removed.

### Phase 3 — verification and documentation

- [x] `MDV-030` Add component/integration tests for `MilkdownView.vue` — done
      in `tests/components/milkdownView.test.ts`.
- [x] `MDV-031` Add an E2E test for mixed Markdown, edit/view switching and
      task persistence — done in `tests/e2e/milkdown-view.e2e.ts`.
- [x] `MDV-032` Verify enabled and disabled mention links — done in the
      component tests and manual browser checks.
- [x] `MDV-033` Verify task toggling output — done. The emitted source keeps
      `-` bullets, unescaped `#tag` text and `{#kind-id}` markers.
- [x] `MDV-034` Run types-check, tests and the production build — done.
      All 1564 tests pass; the known Dexie teardown errors in
      `locationMapTab` and a few other DB-heavy suites are pre-existing and
      also occur at the parent commit.
- [x] `MDV-035` Update `docs/features/markdown-and-mentions.md` — done.
- [x] `MDV-036` Update `docs/components/markdown-editor.md` — done.
- [x] `MDV-037` Check bundle output and PWA precache size — done. Every feature
      that renders Markdown already imports the editor, so the view adds no
      second Milkdown copy; the cost is one read-only Crepe instance per detail
      page. Production build: 404 precache entries, ~17.2 MiB; all 15 feature
      configurations pass the strict audit.

### Phase 4 — full-parity renderer evaluation

**Completed as an evaluation.** The static renderer is implemented and tested,
but the benchmark does not justify replacing markdown-it for cards or chunks.

- [x] `MDV-040` Design a singleton headless Milkdown renderer — done in
      `src/components/common/milkdown/staticRenderer.ts`. It uses one hidden
      Crepe instance and serializes with `DOMSerializer`.
- [x] `MDV-041` Provide static task-list checkboxes — done. Serialized
      `li[data-item-type="task"]` nodes get disabled
      `.task-list-checkbox` inputs.
- [x] `MDV-042` Reuse the mention, tag and heading-anchor plugins — done. The
      renderer normalizes mention links and post-processes tag links and
      external-link attributes.
- [x] `MDV-043` Decide whether to keep markdown-it — done. Keep it for note
      cards, exports and legacy fallback.
- [x] `MDV-044` Measure list and virtual-scroll performance — done with
      `markdown-dataset` via `npm run perf:markdown`. See
      [`../architecture/markdown-rendering-performance.md`](../architecture/markdown-rendering-performance.md).
      Static Milkdown is ~5–6× slower than markdown-it for card batches, so it
      is not adopted globally.

## 5. Acceptance criteria

- Detail views render Markdown through Milkdown and match the editor's visible
  structure for common content.
- Entity links, tag links, external links and mention modals work from the
  read-only view.
- Task checkboxes can be toggled from the view when enabled and produce valid
  Markdown.
- `{#kind-id}` headings still produce usable anchors.
- Disabled feature kinds cannot be opened from rendered content.
- Note cards keep their current performance profile.
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
6. Disable a feature in a test build and confirm its links in existing content
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
