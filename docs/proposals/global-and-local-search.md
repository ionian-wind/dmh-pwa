# Global and Local Search

**Status:** proposal — not implemented.

**Priority:** P2.

**Depends on:** [hotkeys-and-command-menu.md](hotkeys-and-command-menu.md)
(command-menu host and `Ctrl/Cmd+K`), domain stores, and the router.

**Goal:** make campaign content findable without duplicating search logic in
every list view. Local suggestions should feel instant and typo-tolerant, while
the global search overlay should behave like an omnisearch bar with selectable
scopes: the current entity, the current entity plus its direct links, or all
campaign content. All scopes search offline.

**Library direction:**

- **Local suggestions:** [`fuse.js`](https://github.com/krisk/fuse)
  (recommended), with [`@m31coding/fuzzy-search`](https://github.com/m31coding/fuzzy-search)
  kept as a benchmark-driven alternative.
- **Global search:** [`flexsearch`](https://github.com/nextapps-de/flexsearch)
  `Document` index.

---

## 1. Current state

- Each domain store already has a `searchQuery` ref and a `filtered` computed
  value; most perform a simple lowercase substring match over titles/names and
  some content.
- The per-list header search input was removed because it was not used. This
  proposal does **not** reintroduce it by default.
- Mention and entity-linking popups use the same simple `includes()` filtering.
- There is no cross-entity search, no note-body search outside the note list,
  and no result ranking beyond store order.
- The command menu proposal is the natural host for a global search UI, but it
  currently defines commands only.

## 2. Scope

### In scope

- A shared local suggestion layer for:
  - mention and entity-link pickers;
  - list filtering when a view deliberately exposes it again;
  - tag/icon pickers where fuzzy matching helps.
- A global search index over notes and entities:
  - titles/names;
  - descriptions, notes and note bodies;
  - tags and module membership;
  - links to the matching route.
- Offline operation, with the index built locally from IndexedDB data.
- Ranking, result snippets and keyboard navigation.
- Incremental index updates when stores change.
- English and Russian content.
- An omnisearch-style scope selector in the search overlay.

### Out of scope

- A server, external search service or analytics.
- OCR or image-content search.
- Natural-language answers.
- Searching help pages (covered by
  [help-center-search.md](help-center-search.md)).
- Replacing the command menu; search results can be combined with commands
  later, but the APIs stay separate.
- Reintroducing a permanent search input in every list header.

### 2.1 Search scopes

The search overlay is one omnisearch surface with a selectable scope, similar to
GitHub's search box with its scope/mode menu. Do not build three separate search
inputs or dialogs.

| Scope          | Internal value | Searches                                                        |
| -------------- | -------------- | --------------------------------------------------------------- |
| This entity    | `entity`       | Only the currently open entity's title, body/notes, tags/fields |
| Entity + links | `linked`       | The current entity plus all directly linked entities            |
| Everything     | `global`       | Every indexed note, entity and document page                    |

Scope rules:

- `entity` and `linked` are available only on an entity detail page.
- Home and list views expose only `global`; the selector can hide unavailable
  scopes or show them disabled with an explanation.
- The overlay remembers the last used scope, but never restores `entity` or
  `linked` on a page without a current entity.
- `Ctrl/Cmd+K` opens the same overlay from anywhere. On a detail page it
  defaults to the last scope; otherwise it defaults to `global`.
- Scope names and descriptions are translated; the selector must be usable with
  the keyboard alone (for example `Alt+1`, `Alt+2`, `Alt+3`).
- The placeholder and empty state change with the scope:
  - “Search this note…” / “Search this entity…”;
  - “Search this note and its links…”;
  - “Search everything…”.

Direct links for `linked` are one hop only in v1. Resolve them with the same
metadata the entity sidebars already use:

- outgoing mentions from the mention index;
- `moduleIds` and module-document notes;
- party characters;
- encounter parties, monsters, characters and locations;
- explicit entity refs on locations, markers and linked-entity panels.

Do not recursively expand links in v1. Backlinks and two-hop links are a later
option if users ask for them.

Scope resolution lives in a small `useSearchScope()` helper:

```ts
export type SearchScope = 'entity' | 'linked' | 'global';

export interface SearchContext {
  kind?: SearchKind;
  entityId?: string;
  /** IDs in the linked scope, including the current entity. */
  allowedIds?: Set<string>;
}

export interface SearchQuery {
  text: string;
  scope: SearchScope;
  context?: SearchContext;
}
```

The global index stays one index. Scope filtering is applied to the merged hit
list:

- `entity`: allowed IDs contain only `kind:entityId`;
- `linked`: allowed IDs contain the current entity and its direct links;
- `global`: no ID filter.

This keeps the index lifecycle simple and avoids rebuilding a per-entity index
when the user changes pages.

## 3. Library evaluation

Sizes are minified gzip approximations from the package documentation and
Bundlephobia, checked for the versions below.

| Library                    | Version | License    | Size (gzip) | Strengths                                                                                                           | Limitations                                                                                                        |
| -------------------------- | ------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `fuse.js`                  | 7.5.0   | Apache-2.0 | ~9.4 kB     | Weighted keys, typo tolerance, token search, extended/logical queries, match indices, dynamic add/remove, workers   | Scans documents; not a tokenised multi-field full-text index; large bodies need care                               |
| `@m31coding/fuzzy-search`  | 2.0.0   | MIT        | ~9.7 kB     | Entity-oriented fuzzy + prefix + substring search, quality scores, fast small-term queries, incremental upsert      | Newer project; non-Latin scripts need configuration; no field weights or match indices; terms-based, not full-text |
| `flexsearch` (full bundle) | 0.8.212 | Apache-2.0 | ~16.8 kB    | Document/multi-field index, tags, context, forward tokenizer, highlighting, workers, optional IndexedDB persistence | Larger; v0.8 API differs from older versions; Cyrillic and field weighting need explicit configuration             |

### Recommendation

1. **Use Fuse.js for local suggestions.** The app suggests entity names,
   aliases, tags and short subtitles. Fuse’s weighted keys, thresholds and match
   indices fit that directly and keep the integration small.
2. **Use FlexSearch `Document` for global search.** Note bodies can be long and
   numerous; a tokenised index with field separation, tags and optional worker
   support is a better fit than scanning every document per query.
3. **Do not use one library for both.** FlexSearch is unnecessary overhead for a
   mention popup; Fuse over every note body would be slower and rank body text
   less predictably.
4. Keep `@m31coding/fuzzy-search` behind the same suggestion adapter. If a
   benchmark with realistic Russian/English fixtures shows better quality or
   latency than Fuse, the adapter can switch without changing callers.

Pin exact versions and keep both dependencies lazy-loaded where possible.

### Decision spike

Before committing to the local-suggestion dependency, run a short benchmark with
the same 2,000 mixed Russian/English entity names, aliases and tags used for the
global fixtures:

- measure warm query latency for 1–3 character prefixes and one transposition;
- check top-5 quality manually for Russian and English names;
- compare bundle and index-build cost.

Use Fuse unless `@m31coding/fuzzy-search` wins by a meaningful margin (for
example >20% on quality or latency); the adapter keeps the switch cheap either
way.

## 4. Architecture

```text
src/search/
  types.ts                 # shared hit/source types
  normalize.ts             # Unicode, case, punctuation, Markdown cleanup
  suggest.ts               # Fuse adapter for local suggestions
  globalIndex.ts           # FlexSearch Document lifecycle
  documentBuilder.ts       # store entity -> index document
  globalSearch.ts          # query planning, ranking, merging, snippets
  useGlobalSearch.ts       # Vue composable + debounce + state
  useSearchScope.ts        # current entity/context -> scope + allowed IDs
  global.worker.ts         # phase 3: index/query in a worker
```

Two adapters keep the libraries replaceable:

```ts
// src/search/types.ts
export type SearchKind =
  | 'note'
  | 'module'
  | 'party'
  | 'character'
  | 'monster'
  | 'encounter'
  | 'location'
  | 'noteType';

export type SearchScope = 'entity' | 'linked' | 'global';

export interface SearchContext {
  kind?: SearchKind;
  entityId?: string;
  allowedIds?: Set<string>;
}

export interface SearchQuery {
  text: string;
  scope: SearchScope;
  context?: SearchContext;
}

export interface SuggestionSource {
  id: string;
  kind: SearchKind;
  label: string;
  subtitle?: string;
  keywords?: string[];
}

export interface SuggestionHit<T> {
  item: T;
  score: number;
  matches?: readonly { key?: string; indices: readonly [number, number][] }[];
}

export interface SuggestionIndex<T extends SuggestionSource> {
  search(query: string, limit?: number): SuggestionHit<T>[];
}

export interface GlobalSearchHit {
  kind: SearchKind;
  entityId: string;
  title: string;
  subtitle?: string;
  route: string;
  snippet?: string;
  score: number;
  matchedFields: string[];
}
```

The scope resolver is intentionally UI-agnostic:

```ts
export interface SearchScopeState {
  scope: Ref<SearchScope>;
  availableScopes: ComputedRef<SearchScope[]>;
  context: ComputedRef<SearchContext | undefined>;
  setScope(scope: SearchScope): void;
}

export function useSearchScope(): SearchScopeState;
```

`useGlobalSearch` accepts the scope and context, so the dialog only renders the
selector and calls `setScope()`. No component should import Fuse or FlexSearch
directly.

## 5. Local suggestions

### 5.1 Use cases

- `MentionInsertPopup`: notes, modules, parties, monsters, encounters, maps.
- `EntitiesLinking` and entity-link dialogs: all linkable entities.
- Future tag/icon pickers.
- Optional list filtering if a view decides to expose a compact filter again.
- Command-menu command matching can keep its own deterministic scorer until
  the command set grows; Fuse is available if needed later.

### 5.2 Fuse configuration

Use one narrowed suggestion document per source:

```ts
const fuse = new Fuse(items, {
  keys: [
    { name: 'label', weight: 0.7 },
    { name: 'keywords', weight: 0.2 },
    { name: 'subtitle', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
  shouldSort: true,
  useTokenSearch: true, // multi-word queries; omit if it hurts short-name latency
});
```

Rules:

- Normalize with `trim()`, lowercase and Unicode NFKC.
- Empty query returns the source order (usually recency or name).
- Query length 1 returns prefix matches only; 2+ enables fuzzy matching.
- Limit 10–20 for mention popups, 50 for list filtering.
- Sort by score, then `updatedAt` or label for ties.
- Show match highlighting only where the UI supports safe highlighting.
- Rebuild or memoize the Fuse index when the source array identity/revision
  changes; do not rebuild on every keystroke.
- Keep the selected row valid when results shrink; reset to index 0 on query
  change.

### 5.3 Fuse versus `@m31coding/fuzzy-search`

`@m31coding/fuzzy-search` is a strong alternative for pure entity-name search:

- purpose-built prefix/substring/fuzzy combination;
- quality scores are easy to threshold;
- upsert/remove supports live stores;
- no field weighting, so label/keyword weighting must be emulated by ordering
  terms or separate searchers;
- non-Latin scripts require:

```ts
const config = fuzzySearch.Config.createDefaultConfig();
config.normalizerConfig.allowCharacter = () => true;
const searcher = fuzzySearch.SearcherFactory.createSearcher(config);
```

Do not add it in the first implementation. Benchmark it behind
`SuggestionIndex` with Russian and English fixtures before replacing Fuse.

## 6. Global search

### 6.1 Indexed document

One unified FlexSearch `Document` index with normalized documents:

```ts
interface SearchDocument {
  id: string; // `${kind}:${entityId}`
  kind: SearchKind;
  entityId: string;
  title: string;
  subtitle: string;
  body: string;
  tags: string[];
  moduleIds: string[];
  route: string;
  updatedAt: number;
  hidden?: boolean;
}
```

Field mapping:

| Field       | Source                                                               |
| ----------- | -------------------------------------------------------------------- |
| `title`     | note title, entity name, timer title, note-type name                 |
| `subtitle`  | type/category, party/module context, description prefix              |
| `body`      | note content, descriptions, character/monster notes, encounter notes |
| `tags`      | note tags and searchable keywords                                    |
| `kind`      | entity kind tag                                                      |
| `moduleIds` | module membership tags                                               |
| `route`     | resolved router path; not indexed, only stored                       |

Indexing rules:

- Strip Markdown syntax, URLs, image data URLs, mention IDs and code-only
  noise before indexing bodies; keep human-readable text.
- Drawing blocks contribute their captions and surrounding Markdown; no OCR.
- Hidden module-document notes are included and labelled as document pages, so
  campaign text remains discoverable.
- Truncate extremely large bodies for indexing (for example 50,000 characters
  per entity) and mark the limitation; the full record stays in IndexedDB.
- Keep tags as a FlexSearch `tag` field for filtering by kind/module/tag.
- Store only display fields in the index (`store: [...]`) and resolve the live
  entity from the store by `kind`/`entityId` for actions.

### 6.2 FlexSearch configuration

```ts
import { Document, Encoder } from 'flexsearch';

const encoder = new Encoder({
  normalize: true,
  dedupe: false, // preserve Russian/English words and note tokens
  include: { letter: true, number: true },
});

const index = new Document<SearchDocument>({
  tokenize: 'forward',
  resolution: 6,
  encoder,
  document: {
    id: 'id',
    index: [
      { field: 'title', resolution: 9 },
      { field: 'subtitle', resolution: 5 },
      { field: 'body', resolution: 3 },
      { field: 'tags', resolution: 7 },
    ],
    tag: ['kind', 'moduleIds'],
    store: [
      'kind',
      'entityId',
      'title',
      'subtitle',
      'route',
      'updatedAt',
      'tags',
    ],
  },
});
```

Notes:

- `tokenize: 'forward'` gives prefix matching while typing; evaluate
  `bidirectional` only if benchmarks and result quality justify its cost.
- Validate Cyrillic indexing with fixtures. Do not use `LatinAdvanced` or
  language packs for Russian; use the universal encoder or a custom encoder
  that preserves Cyrillic letters.
- `context` is disabled initially because it increases index size; note bodies
  still match through token search.
- Test string IDs (`note:<uuid>`). If FlexSearch’s string-ID performance is
  insufficient, map UUIDs to stable numeric IDs with a collision check, but do
  not hash without handling collisions.
- Keep the index in a dedicated module; do not expose FlexSearch result shapes
  to components.

### 6.3 Lifecycle

- Build lazily the first time global search opens, or in an idle callback after
  the initial stores load. Do not block first paint.
- Load all domain stores before the first build; use the existing store `load()`
  methods.
- Subscribe to each Pinia store with `store.$subscribe(..., { detached: true })`
  and debounce updates (300–500 ms). On create/update call `index.update`;
  on delete call `index.remove`.
- Rebuild from scratch after:
  - backup restore;
  - module import;
  - database migration;
  - locale-independent schema changes that alter indexed fields.
- Expose `reindexAll()` and call it from the import/restore paths.
- Keep a version constant; discard and rebuild when the document schema
  version changes.
- If a store update cannot be mapped to a document, schedule a full rebuild
  rather than leaving stale results.

### 6.4 Query and ranking

Query flow:

1. Normalize and trim the query, then resolve the active scope and its
   `allowedIds` set (`entity`, `linked` or `global`).
2. Require at least 2 characters for content search; allow 1 character for
   title prefix matches.
3. Query the fields separately so title matches can be ranked above body
   matches:
   - title, tags, subtitle, body;
   - each with its own limit (for example 20/20/20/40).
4. Merge by `kind:entityId`, keeping the best field rank.
5. Filter the merged hits by `allowedIds` when the scope is `entity` or
   `linked`. Do this before boosts so filtered-out results never occupy a
   visible slot.
6. In `linked` scope, prefer the current entity on ties so the page the user is
   already reading stays first.
7. Apply boosts:

| Signal                       | Boost                                |
| ---------------------------- | ------------------------------------ |
| Exact title                  | largest                              |
| Title prefix                 | high                                 |
| Tag match                    | high                                 |
| Subtitle match               | medium                               |
| Body match                   | base                                 |
| Updated within 30 days       | small recency boost                  |
| Current module/party context | small contextual boost, if available |

8. Sort by combined score, then `updatedAt`, then title.
9. Limit to 5 per entity kind in the default view; “Show all” expands the
   result list.

FlexSearch’s per-field result order already approximates relevance; the rank
merge only needs to be deterministic and stable. Avoid exposing raw
FlexSearch scores as a guarantee.

### 6.5 Snippets and highlighting

- Build snippets from the plain-text `body` around the first body query token.
- Limit to roughly 140–180 characters.
- Escape text before highlighting; never pass the raw query through `v-html`.
- Use `{ text, ranges }` segments or a small safe highlighter component.
- For title-only matches, show the subtitle/context instead of a body snippet.
- Reuse the same safe highlighting approach for local suggestion matches.

### 6.6 Worker and persistence

Phase 1 can run on the main thread with async/debounced updates. Move the index
to a worker when the fixture benchmark shows main-thread frames dropping:

- Use FlexSearch’s worker support or a custom module worker.
- Messages: `init`, `add`, `update`, `remove`, `search`, `reindex`.
- Keep document metadata in the main thread; the worker returns IDs and stored
  fields only.
- The worker chunk must be lazy-loaded and precached by the PWA build.

Optional later phase:

- Persist the index with FlexSearch’s IndexedDB adapter to avoid rebuilding on
  every reload.
- Store an index version and invalidate on schema/import changes.
- Treat the persistent index as a cache, never as the source of truth.

## 7. UI and interaction

### 7.1 Omnisearch overlay

- Open from the command menu (`Ctrl/Cmd+K`) and a header search button.
- The overlay has:
  - autofocused input;
  - a GitHub-style **scope selector** next to the input, showing the active
    scope with an icon and label;
  - sections by entity kind in `global`, by relation/current entity in
    `linked`, and by matched field in `entity`;
  - result title, subtitle/context and snippet;
  - a keyboard hint for opening and changing scope;
  - “No results” and “Searching…” states;
  - recent searches/entities.
- Scope selector:
  - options: **This entity**, **Entity + links**, **Everything**;
  - unavailable scopes are hidden or disabled when there is no current entity;
  - the selected scope is persisted in `configStore` and restored only where
    valid;
  - selecting a scope keeps the current query and re-runs it without closing
    the overlay;
  - `Alt+1` / `Alt+2` / `Alt+3` switch scopes.
- Keyboard:
  - `ArrowUp`/`ArrowDown` move;
  - `Enter` opens;
  - `Escape` closes;
  - `Tab` stays in the dialog;
  - `Alt+1…3` change scope;
  - `role="combobox"`/`listbox`/`option` semantics.
- Empty query:
  - `global`: recent entities and common destinations;
  - `linked`: current entity and its direct links;
  - `entity`: a short hint or the entity's field outline rather than an empty
    box.
- In `entity` scope, show which field matched (title, body, tags, notes) and
  avoid kind sections because there is only one document.
- In `linked` scope, show the current entity first and label linked results by
  relation where known (module, mention, party member, encounter participant).
- Opening a note result can deep-link to the note; heading anchors are optional.
- Provide filters later (`kind`, module) using tags; do not add a filter bar in
  the first version.

### 7.2 Local suggestions

- Local suggestions are not a fourth omnisearch scope. They stay in compact
  anchored pickers for mentions and entity linking.
- Mention/link popups keep their current compact anchored UI.
- Show a maximum of 10–15 suggestions, scrollable, with keyboard selection.
- Empty query shows recency/name order; typing reorders by relevance.
- Do not show a search field in list headers by default. If a list needs
  filtering, add a deliberate compact control rather than restoring the old
  global header field.
- Keep all actions available by mouse and keyboard.

## 8. Integration points

| Area                  | Integration                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `MentionInsertPopup`  | Replace `includes()` filtering with `SuggestionIndex`              |
| `EntitiesLinking`     | Shared suggestion source for linkable entities                     |
| Domain stores         | `$subscribe` for incremental global-index updates                  |
| `useSearchScope`      | Resolve `entity`/`linked` context and allowed IDs                  |
| `configStore`         | Persist recent searches, active scope and optional preferences     |
| `CommandMenu`         | Host global search results and the `Ctrl/Cmd+K` entry point        |
| Router                | Resolve entity routes, note deep links and the current detail item |
| `App.vue`             | Mount the omnisearch overlay/service and header search button      |
| Backup/import/restore | Trigger `reindexAll()` after data replacement                      |
| i18n                  | All placeholders, section labels, empty states and error messages  |
| PWA                   | Worker/search chunks are precached; no network calls at query time |

Suggested UI files:

```text
src/components/search/GlobalSearchDialog.vue
src/components/search/GlobalSearchResult.vue
src/components/search/SearchHighlight.vue
src/components/search/SearchScopePicker.vue
src/components/search/useSearchKeyboard.ts
src/components/common/MentionInsertPopup.vue   # existing, update filtering
```

## 9. Performance targets

Use a reproducible fixture set (for example 2,000 notes averaging 8 kB, 2,000
characters/monsters, 500 other entities) and measure on a mid-range phone via
Chrome tracing.

| Operation                             | Target                         |
| ------------------------------------- | ------------------------------ |
| Local suggestion query (≤2,000 items) | < 16 ms                        |
| Global query, warm index              | < 100 ms                       |
| Incremental update after save         | < 100 ms                       |
| Initial index build, desktop          | < 1 s                          |
| Initial index build, mobile           | < 2 s                          |
| Memory overhead                       | report and cap in the proposal |

Mitigations if targets fail:

- move the global index into a worker;
- index a bounded body prefix instead of full notes;
- lower `resolution` for body fields;
- lazy-build on first search rather than startup;
- keep Fuse suggestions in the main thread and cap the source list.

## 10. Testing

### Unit

- normalization: case, NFKC, Cyrillic/Latin, punctuation, Markdown cleanup;
- Fuse adapter: typo, prefix, multi-word, empty query, limit, score ordering;
- FlexSearch document builder: each entity kind, tags, hidden notes, drawing
  notes, truncation;
- index lifecycle: add/update/remove, reindex, version invalidation;
- ranking merge: title beats body, deduplication across fields, recency boost;
- scope resolution: current entity, direct links, unavailable scopes, allowed-ID
  filtering, current entity first in `linked`;
- snippets: safe escaping, token boundaries, Cyrillic characters;
- no-result and one-character behavior.

### Component

- mention popup filters and keyboard selection with typos;
- global dialog opens, focuses input, renders sections, navigates with arrows,
  opens on Enter and closes on Escape;
- scope selector changes scope without closing or clearing the query;
- unavailable scopes are disabled without a current entity;
- `Alt+1`/`Alt+2`/`Alt+3` change scope;
- loading/empty/error states;
- focus restoration after closing.

### E2E

- `Ctrl/Cmd+K`, type a note title with a typo, open the note route;
- search a Russian note body and find it;
- search an entity name and confirm the correct detail route;
- on a note detail page, `entity` scope returns only that note;
- `linked` scope returns the note plus its module/mentioned entities;
- `global` finds an unrelated note that is excluded from `entity`/`linked`;
- switching scopes keeps the current query;
- create/update/delete an entity and confirm the next query reflects it;
- restore a backup and confirm the index rebuilds;
- verify search works offline after the app has loaded once.

### Benchmarks

Keep a fixture generator and a small benchmark script. Record query latency,
build time, memory and the effect of `tokenize`, `resolution` and body limits.
Do not merge the search implementation without a before/after measurement.

## 11. Phases

### Phase 1 — local suggestions

- Add shared search types and normalizer.
- Add Fuse behind `SuggestionIndex`.
- Replace mention/link-popup `includes()` filtering.
- Add component tests for typos and Russian labels.

### Phase 2 — omnisearch scopes

- Add FlexSearch `Document` index and document builders.
- Build lazily; add store subscriptions and `reindexAll()`.
- Add `useSearchScope()` and the `entity`/`linked`/`global` allowed-ID sets.
- Add the omnisearch dialog, scope selector and ranking merge.
- Integrate `Ctrl/Cmd+K` and the command-menu host.
- Add unit tests and fixtures for all entity kinds and scopes.

### Phase 3 — quality and scale

- Add worker-based index/query.
- Add snippets, safe highlighting and recent searches.
- Tune `tokenize`, `resolution`, body limits and boosts with benchmarks.
- Add E2E coverage for CRUD/import/offline.

### Phase 4 — optional persistence and filters

- Evaluate IndexedDB index persistence and startup import.
- Add kind/module/tag filters only if usage justifies them.
- Evaluate `@m31coding/fuzzy-search` against Fuse with real fixtures.
- Add help-search results to the same overlay if the command-menu proposal
  adopts it.

## 12. Risks and open questions

| Risk                                      | Mitigation                                                         |
| ----------------------------------------- | ------------------------------------------------------------------ |
| FlexSearch v0.8 API churn                 | pin exact version; wrap in `globalIndex.ts`; adapter tests         |
| Cyrillic tokenization/ranking differences | Russian/English fixtures; explicit encoder; quality tests          |
| Large note bodies increase memory         | cap indexed body; worker; optional persistent cache                |
| Stale index after import/restore          | `reindexAll()` hooks; index version constant                       |
| Main-thread jank while typing             | debounce updates; build lazily; worker in phase 3                  |
| Fuse scanning cost on large lists         | cap source, cache index, benchmark fuzzy-search alternative        |
| Sensitive campaign text in a worker/cache | same-origin only; no network; clear caches on reset; document it   |
| User confusion with two search surfaces   | one global overlay; local suggestions stay contextual              |
| User confusion about the active scope     | explicit scope label, scope-aware placeholder, last valid scope    |
| Scoped results look empty                 | scope-aware empty state with a one-click switch to `global`        |
| Bundle growth                             | lazy-load global search and worker chunks; local Fuse in its chunk |

Open questions:

- Should hidden module-document notes appear in global search by default?
- Should global search include actions/commands in the same ranked list, or
  keep commands in a separate section?
- Should `linked` include backlinks as well as outgoing links, or stay one hop?
- Should the last scope be remembered globally or per entity kind?
- Is a worker necessary on the target low-end phone, or can the first version
  stay on the main thread?
- Do we need persistent index caching, or is a sub-second rebuild acceptable?
- Should list views get an optional compact filter, or is mention/link search
  enough until users ask for list filtering again?
- Which library wins the local-suggestion benchmark: Fuse or fuzzy-search?

## 13. Acceptance criteria

- Mention/link pickers tolerate typos and rank prefix matches first in English
  and Russian.
- The omnisearch overlay offers `entity`, `linked` and `global` scopes with a
  visible, keyboard-operable mode selector.
- `entity` searches only the open entity; `linked` adds its direct links;
  `global` searches all indexed content.
- Unavailable scopes are disabled outside entity detail pages, and the last
  valid scope is restored where appropriate.
- Global search finds entities by title, body and tags, with title results
  ranked above body-only matches.
- Results open the correct route and work offline.
- The index updates after create/update/delete and rebuilds after import/restore.
- The UI is keyboard accessible, restores focus and has a clear empty state.
- Search does not block initial app rendering.
- No per-list header search field is reintroduced without a separate decision.
- Performance targets are measured and reported before implementation is
  considered complete.

## 14. References

- [fuse.js](https://github.com/krisk/fuse) — Apache-2.0; weighted fuzzy search,
  token search, dynamic collections, workers.
- [@m31coding/fuzzy-search](https://github.com/m31coding/fuzzy-search) — MIT;
  entity-oriented fuzzy/prefix/substring search with multilingual configuration.
- [flexsearch](https://github.com/nextapps-de/flexsearch) — Apache-2.0;
  document/multi-field full-text search, tags, highlighting, workers and
  optional persistent indexes.
- [help-center-search.md](help-center-search.md) — static help-site search.
- [hotkeys-and-command-menu.md](hotkeys-and-command-menu.md) — command-menu host
  and `Ctrl/Cmd+K`.
