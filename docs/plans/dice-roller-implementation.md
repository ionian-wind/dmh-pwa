# Dice Roller — Implementation Plan

> **Status: engine complete.** Core engine and follow-ups are implemented; the
> remaining dice work is the 3D renderer/UI tracker. Check a task only when its
> code, tests and documentation are complete.
>
> Design reference: [../features/dice-roller/README.md](../features/dice-roller/README.md).
> 3D renderer UI plan: [3d-dice-roller-ui.md](3d-dice-roller-ui.md). Chat,
> macros UI and message delivery are out of scope for this tracker.

## How to use this tracker

- One task is one PR-sized change with tests.
- Check `[x]` only after the task's tests pass and the task's acceptance note is
  satisfied.
- Do not skip a phase gate. Later phases depend on earlier contracts.
- Update the progress summary when a phase is complete.
- Keep task IDs stable when reordering work.

## Progress summary

| Phase                      | Status | Exit gate                                  |
| -------------------------- | ------ | ------------------------------------------ |
| 0. Foundations             | [x]    | Contracts compile; fixtures load           |
| 1. Chevrotain core         | [x]    | Lexer/parser/CST-AST harness green         |
| 2. Arithmetic              | [x]    | Arithmetic golden tests green              |
| 3. Dice and modifiers      | [x]    | Dice/modifier/group golden tests green     |
| 4. Expansion               | [x]    | Async macro/ability/attribute tests green  |
| 5. Roll queries            | [x]    | Extraction/answer/substitution tests green |
| 6. Inline rolls and labels | [x]    | Inline/index/reference tests green         |
| 7. Table plugin            | [x]    | Table selection/cycle/weight tests green   |
| 8. Process metadata        | [x]    | Snapshot/render-metadata tests green       |
| 9. RNG and replay          | [x]    | Determinism/replay tests green             |
| 10. Visualization          | [x]    | Text/2D/3D adapter tests green             |
| 11. Hardening              | [~]    | Performance/security/i18n budgets pass     |
| 12. Acceptance             | [x]    | Definition of done satisfied               |

## Phase 0 — Foundations

- [x] **DR-001** Create the planned `engine/` module skeleton and public entry
      point.
- [x] **DR-002** Add shared types: `EngineOptions`, `Repositories`,
      `RollContext`, `Rng`, `AstNode`, `AstSpan`.
- [x] **DR-003** Add result types: `RollResult`, `RollBreakdown`,
      `RollSegment`, `RollProcess`, `PassRecord`.
- [x] **DR-004** Add roll-record types: `DieRecord`, `DiceGroupResult`,
      `InlineRollRecord`, `ExpansionRecord`, `QueryAnswerRecord`.
- [x] **DR-005** Add error/warning codes and `RollError`/`RollWarning`
      constructors.
- [x] **DR-006** Add limit defaults and a `resolveLimits()` helper.
- [x] **DR-007** Add a fixture loader for expression/expected-result test cases.
- [x] **DR-008** Add a deterministic test RNG (`sequenceRng`) and a snapshot
      helper.
- [x] **DR-009** Add a public API test proving `extract()` and `roll()` are
      exported and return outcomes.
- [x] **DR-010** Document the module boundaries in code comments/README.

**Gate:** contracts compile; a trivial expression can reach an empty parser stub
without `any` leaking into public APIs.

## Phase 1 — Chevrotain core

- [x] **DR-101** Create token helpers and core token categories (whitespace,
      number, compare, brackets, separators).
- [x] **DR-102** Implement token-vocabulary composition with deterministic
      ordering and collision checks.
- [x] **DR-103** Implement one-lexer-per-grammar construction and a token
      stream snapshot for diagnostics.
- [x] **DR-104** Implement the plugin registry: token ownership, parser rule
      registration, CST handler registration and registration errors.
- [x] **DR-105** Implement typed CST-to-AST conversion helpers and span
      propagation.
- [x] **DR-106** Implement bounded Chevrotain recovery and error-to-`RollError`
      mapping.
- [x] **DR-107** Implement parser error source spans and snippets.
- [x] **DR-108** Add grammar fixture tests: valid token stream, invalid token,
      collision, recovery limit.
- [x] **DR-109** Add an AST contract test asserting every node has `type`,
      `plugin`, `span`.
- [x] **DR-110** Add a no-mega-grammar test: each plugin grammar builds
      independently.

**Gate:** a dummy plugin can lex/parse a literal and produce a typed AST;
collisions and recovery are tested.

## Phase 2 — Arithmetic plugin

- [x] **DR-201** Implement number literals, decimal numbers and unary signs.
- [x] **DR-202** Implement `+`, `-`, `*`, `/`, `%`, `**` with documented
      precedence.
- [x] **DR-203** Implement parentheses.
- [x] **DR-204** Implement `floor`, `ceil`, `round`, `abs`.
- [x] **DR-205** Implement division/modulus by zero policy.
- [x] **DR-206** Build arithmetic AST nodes and evaluator returning `EvalResult`.
- [x] **DR-207** Add arithmetic trace records for metadata.
- [x] **DR-208** Add golden tests for precedence, associativity and unary signs.
- [x] **DR-209** Add error tests for malformed arithmetic.
- [x] **DR-210** Add math-only roll tests (e.g. `5+7*2`).

**Gate:** arithmetic golden suite passes and contributes render segments.

## Phase 3 — Dice and modifiers

### Dice syntax

- [x] **DR-301** Implement `NdX`, `dX`, default count 1 and validation.
- [x] **DR-302** Implement `d%` alias.
- [x] **DR-303** Implement Fudge `dF`, `dF.1`, `dF.2`, `dF.3`.
- [x] **DR-304** Implement computed dice `(N+Y)dX` and `Nd(X+Y)` with rounding.
- [x] **DR-305** Implement custom dice `d[a,b,c]`.
- [x] **DR-306** Implement labels `2d6[fire]`.
- [x] **DR-307** Add invalid-dice tests (`2d0`, `0d6`, `2d-6`, `2d6.5`).

### Compare points and modifiers

- [x] **DR-311** Implement compare points (`N`, `>N`, `<N`, `=N`).
- [x] **DR-312** Implement success/failure counting (`CP`, `fCP`).
- [x] **DR-313** Implement `cs`/`cf` critical markers/counting.
- [x] **DR-314** Implement keep/drop (`kh`, `kl`, `dh`, `dl`, `k`, `d`).
- [x] **DR-315** Implement reroll (`r`, `ro`) with compare points and multiple
      clauses.
- [x] **DR-316** Implement explosion (`!`, `!CP`, `!<`, `!>`, `!=`).
- [x] **DR-317** Implement penetrating (`!p`) and compounding (`!!`).
- [x] **DR-318** Implement min/max (`mi`, `ma`).
- [x] **DR-319** Implement matching (`m`, `mt`, `mtN`, `mtN>X`).
- [x] **DR-320** Implement sorting (`s`, `sa`, `sd`) as display-only.
- [x] **DR-321** Implement grouped-roll modifiers and roll-once (`ro`); remove
      the non-Roll20 bare `o` no-op.
- [x] **DR-322** Implement `e` exhaustive successes after success phase.
- [x] **DR-323** Implement modifier phases A–G exactly as documented.
- [x] **DR-324** Record `modifierOrder` and applied modifiers in metadata.
- [x] **DR-325** Cap explosions/rerolls and emit limit warnings.

### Groups

- [x] **DR-331** Parse grouped rolls `{...}` and comma-separated sub-rolls.
- [x] **DR-332** Validate homogeneous sub-roll kinds.
- [x] **DR-333** Apply group keep/drop/success/failure modifiers.
- [x] **DR-334** Implement nested group modifiers.
- [x] **DR-335** Record group and sub-group totals in metadata.

### Tests

- [x] **DR-341** Add golden tests for each modifier independently.
- [x] **DR-342** Add interaction tests: reroll+explode+keep+success+matching.
- [x] **DR-343** Add group tests including `{5d6!!}>8`.
- [x] **DR-344** Add deterministic RNG tests for every die type.
- [x] **DR-345** Add metadata tests: kept, dropped, rerolled, exploded,
      compounded and penetrating flags.

**Gate:** all dice/modifier/group tests pass; metadata shows every die's
original/final state.

## Phase 4 — Expansion

- [x] **DR-401** Define macro, ability and attribute repository interfaces.
- [x] **DR-402** Implement a composite macro repository with configurable source
      precedence.
- [x] **DR-403** Implement case-insensitive normalized lookup.
- [x] **DR-404** Implement per-call memo cache.
- [x] **DR-405** Implement expansion scanning for `#macro`.
- [x] **DR-406** Implement expansion scanning for `%{character|ability}`.
- [x] **DR-407** Implement expansion scanning for `@{character|attribute}`,
      `selected`, `target`, bars and `max`.
- [x] **DR-408** Implement repeating-section row index/RowID options.
- [x] **DR-409** Implement 99-level expansion loop with provenance records.
- [x] **DR-410** Implement cycle detection with `kind:source:name` keys.
- [x] **DR-411** Implement `noerror` missing-data downgrade and warnings.
- [x] **DR-412** Implement per-source shadow warnings.
- [x] **DR-413** Add async/missing/cycle/depth/precedence tests.
- [x] **DR-414** Add tests proving `selected`/`target` are passed through without
      assuming a token model.

**Gate:** async expansion tests pass; expansion records feed `RollProcess`.

## Phase 5 — Roll queries

- [x] **DR-501** Parse `?{Prompt}`, `?{Prompt|Default}` and dropdowns.
- [x] **DR-502** Parse labelled dropdown values.
- [x] **DR-503** Parse nested queries and HTML-entity escaping.
- [x] **DR-504** Build stable query IDs from normalized prompt/options.
- [x] **DR-505** Deduplicate identical prompts.
- [x] **DR-506** Implement `RollQueryRequest[]` extraction without rolling.
- [x] **DR-507** Validate answers by ID, then prompt text, then option values.
- [x] **DR-508** Implement depth-first nested query resolution.
- [x] **DR-509** Implement default values and inline-roll defaults.
- [x] **DR-510** Implement `needs-input` outcome for unanswered roll queries.
- [x] **DR-511** Add tests for missing/invalid/extra answers and nesting.
- [x] **DR-512** Add a test proving extraction is side-effect-free.

**Gate:** UI can call `extract()`, answer queries and pass answers to `roll()`.

## Phase 6 — Inline rolls, labels and references

- [x] **DR-601** Parse `[[...]]` and nested inline rolls.
- [x] **DR-602** Evaluate inline rolls innermost-first.
- [x] **DR-603** Assign stable `$[[n]]` indexes and retain raw/computed values.
- [x] **DR-604** Implement `$[[n]]` and `$[[n.computed]]` references.
- [x] **DR-605** Implement missing-reference errors.
- [x] **DR-606** Parse inline labels and record label segments.
- [x] **DR-607** Implement label metadata without evaluating chat Markdown.
- [x] **DR-608** Implement inline-depth limits and cycle protection.
- [x] **DR-609** Add tests for nested inline rolls and cross-reference rules.
- [x] **DR-610** Add metadata tests for inline ordering and indexes.

**Gate:** inline rolls and references resolve from recorded metadata only.

## Phase 7 — Table plugin

- [x] **DR-701** Parse `Nt[table]` and `t[table]`.
- [x] **DR-702** Implement count parsing and validation.
- [x] **DR-703** Implement count and percentage weight modes.
- [x] **DR-704** Implement weighted selection with one RNG draw per roll.
- [x] **DR-705** Implement entry inline rolls.
- [x] **DR-706** Implement table recursion depth and cycle detection.
- [x] **DR-707** Implement missing-table and `noerror` behavior.
- [x] **DR-708** Record table selections in metadata.
- [x] **DR-709** Add weight/cycle/missing/nested-table tests.
- [x] **DR-710** Add deterministic selection tests with sequence RNG.

**Gate:** table plugin is optional; core passes without it and tests prove it.

## Phase 8 — Process metadata and snapshots

- [x] **DR-801** Implement `PassRecord` emission for every pass.
- [x] **DR-802** Implement expansion/query/inline records in `RollProcess`.
- [x] **DR-803** Implement `RollBreakdown.segments` ordering.
- [x] **DR-804** Implement die/group records for every modifier state.
- [x] **DR-805** Implement arithmetic trace emission.
- [x] **DR-806** Implement label/text segments.
- [x] **DR-807** Implement `schemaVersion` and `RollResultSnapshot`.
- [x] **DR-808** Implement snapshot serialization/deserialization tests.
- [x] **DR-809** Add metadata completeness tests for every expression kind.
- [x] **DR-810** Add a renderer contract test proving no re-roll is required.

**Gate:** a renderer can reproduce the full roll breakdown from metadata alone.

## Phase 9 — RNG and replay

- [x] **DR-901** Implement crypto-backed production RNG.
- [x] **DR-902** Implement deterministic sequence RNG for tests.
- [x] **DR-903** Validate RNG output range and throw `RNG_FAILURE`.
- [x] **DR-904** Implement optional RNG snapshot/restore.
- [x] **DR-905** Record replay state in `RollResult`.
- [x] **DR-906** Add determinism tests across all dice/modifier types.
- [x] **DR-907** Add replay tests using snapshot/restore and seed sequences.
- [x] **DR-908** Add a test proving 3D rendering never consumes RNG.

**Gate:** same input + RNG state + repositories + answers gives identical results.

## Phase 10 — Visualization

- [x] **DR-1001** Define `RollVisualizer` adapter interface.
- [x] **DR-1002** Implement the text/chat-card renderer contract.
- [x] **DR-1003** Implement the 2D dice breakdown.
- [x] **DR-1004** Implement the 3D dice adapter using existing `@3d-dice/dice-box`.
- [x] **DR-1005** Implement fallback when WebGL/assets/reduced motion block 3D.
- [x] **DR-1006** Implement accessible text output for every segment.
- [x] **DR-1007** Add tests proving adapters do not mutate or re-roll results.
- [x] **DR-1008** Add visual parity tests: text/2D/3D use the same values.

**Gate:** text/2D baseline is always available; 3D is optional and deterministic.

## Phase 11 — Hardening

- [x] **DR-1101** Implement performance benchmarks and budgets.
- [x] **DR-1102** Implement output-size and pass-time limits.
- [x] **DR-1103** Add macro-bomb/large-group/pathological-query tests.
- [x] **DR-1104** Add localization-ready error code/parameter tests.
- [x] **DR-1105** Add accessibility checks for roll metadata.
- [x] **DR-1106** Add sanitization boundary tests for labels/text segments.
- [x] **DR-1107** Add schema compatibility tests for snapshots.
- [x] **DR-1108** Document public API and module boundaries.

**Gate:** performance, limits, localization and snapshot compatibility pass.

## Phase 12 — Acceptance

- [x] **DR-1201** Run the complete parser/AST/evaluator golden suite.
- [x] **DR-1202** Run expansion/query/inline/table integration suite.
- [x] **DR-1203** Run deterministic RNG/replay suite.
- [x] **DR-1204** Run visualization parity/accessibility suite.
- [x] **DR-1205** Verify no chat/UI dependency leaks into the engine.
- [x] **DR-1206** Verify no custom hand-written parser/tokenizer exists.
- [x] **DR-1207** Verify all public contracts have tests and documentation.
- [x] **DR-1208** Complete the definition of done in [../features/dice-roller/README.md](../features/dice-roller/README.md).
- [x] **DR-1209** Tag the first stable engine schema version.
- [x] **DR-1210** Hand off extraction/roll APIs to the chat implementation track.

## Implementation notes and findings

### Current status

Implemented under `src/utils/bag-of-dice` with the full suite green (229
files / 1929 tests) across
foundations, parser, arithmetic, dice/modifiers, expansion, queries, inline
rolls, tables, metadata, RNG/replay, visualization, hardening and integration.

### Pending tasks

No engine tasks remain open. The 3D renderer and its `bag-of-dice` wiring are
tracked in [3d-dice-roller-ui.md](3d-dice-roller-ui.md).

- **DR-809** — metadata coverage is broad but not exhaustive for every
  expression kind; add a fixture-driven completeness matrix.
- **DR-1101** — performance is regression-tested with a broad budget test, but
  there is no CI benchmark job with parse/evaluate/pipeline thresholds.

### Reference compatibility suite

`__tests__/reference-compat.test.ts` ports the value, fixed-RNG and sort-ordering
tests from `ttg-club/dice-roller-parser` (MIT). Russian-language operator tests
and the Discord renderer tests are intentionally skipped: syntax localization and
chat/Discord formatting are outside the engine's scope.

Compatibility behavior adopted from that corpus:

- target-number compares are inclusive (`>` behaves as `>=`, `<` as `<=`);
- `mt` counts matching groups, with `mtN` minimum and optional compare;
- a single-member grouped roll applies group modifiers to the individual dice,
  while multi-member groups apply them to sub-roll totals;
- trailing message text after the expression is accepted as a text segment;
- labels may follow ordinary expression terms, not only dice;
- `!N` is shorthand for explode-on-equals-N;
- `dN` directly after a dice pool is parsed as drop-lowest.

Investigation of the one initially failing upstream case: commit `6db9c7a`
introduced `{3d6>4 + 3d4>3, 2d8>7}` with expected value `4`. A later mass
formatting/modernization commit changed only the expectation to `5`; the
upstream suite currently fails it. The supplied draws correctly produce
`2 + 1 + 1 = 4`, so the port keeps `4` and the full reference suite passes.

### Coverage

`npm run test:coverage` meets the 87% global thresholds after adding branch
tests across the dice engine, probability calculator, stores and utility
modules. The test environment uses `pool: 'vmThreads'`, so jsdom is created once
per worker instead of once per test file.

### Decisions and deviations

- **Plugin hooks** — plugins contribute tokens, CST conversion rule names,
  evaluators and an optional `validate()` hook. The old `grammar()` hook was
  removed to keep one deterministic Chevrotain grammar and avoid mega-grammar
  ambiguity.
- **Grouped-roll validation** — group members must contain at least one dice,
  table or nested-group node. Pure-math members fail with
  `VALIDATION_INVALID_MODIFIER`.
- **Computed dice** — computed counts/sides are rounded with `Math.round`;
  literal non-integers such as `2d6.5` remain validation errors.
- **Fudge variants** — `dF`/`dF.2 = {-1,0,1}`, `dF.1 = {0,1}`,
  `dF.3 = {-1,0}`.
- **Exhaustive successes (`e`)** — implemented as a capped follow-up loop after
  success counting; it should receive more Roll20-compatibility golden cases.
- **Inline table references** — tables referenced by the main expression and by
  inline rolls are preloaded with the same per-call repository context.
- **Replay field names** — `RollResult.replay` uses `rngStateBefore` and
  `rngStateAfter`, matching the design document.
- **Extra error codes** — implementation adds `PARSE_EMPTY`,
  `PARSE_RECOVERY_LIMIT`, `QUERY_DEPTH`, `TABLE_DEPTH`, `LIMIT_TIME`,
  `CANCELLED`, `MATH_DIVIDE_BY_ZERO`, `MATH_NON_FINITE`,
  `MATH_UNKNOWN_FUNCTION` and `MATH_INVALID_ARITY`.
- **RNG failure** — an RNG that throws or returns outside `[0, 1)` fails with
  `RNG_FAILURE`; there is no `Math.random` fallback.
- **Table entry values** — numeric strings are totals; roll-like strings and
  `inlineRoll` values are evaluated with the same per-call context and RNG.
- **Roll-once** — Roll20 defines reroll-once as `ro`, not a standalone `o`. The
  previous bare `o` no-op was removed; `o` now falls through to trailing text.
  Grouped keep/drop/success/failure behavior has golden tests.
- **Snapshot replay** — seed-only RNGs record `replay.seed`. When replay state
  contains non-serializable values, snapshots keep the serializable fields
  (for example the seed) and drop functions; `createSnapshot` never throws for
  an unserializable replay state.
- **Label sanitization** — the engine stores labels/text verbatim. HTML escaping
  and Markdown sanitization are owned by the chat/message boundary; renderers
  must use text interpolation, not raw HTML.
- **Parser caching** — token vocabularies, lexers and Chevrotain parsers are
  cached per plugin set. Benchmarks cover parsing, arithmetic, keep-highest,
  grouped rolls and snapshots; see `npm run test:perf:dice` and the CI
  `dice-benchmarks` job.

### Newly discovered tasks

- [x] **DR-326** Resolve roll-once semantics as `ro` and add grouped-roll
      keep/drop/success/failure goldens. Bare `o` is trailing text, not a
      modifier; Roll20 does not define `o` for tables or groups.
- [x] **DR-329** Document syntax and semantic differences from the reference
      `dice-roller-parser` implementation.
- [x] **DR-330** Add coverage-gap tests for plugin registration, RNG helpers,
      snapshots, text rendering and visualizer fallbacks.
- [x] **DR-331** Extract the shared RNG/weighted-sampling library and use it in
      both the dice roller and the probability calculator.
- [x] **DR-327** Add comma-separated reroll/explode modifier clause support and
      golden tests.
- [x] **DR-328** Implement `mtN`/`mtN>X` argument and threshold semantics; the
      parser records them and evaluation now counts matching groups.
- [x] **DR-346** Expand golden tests for Fudge variants, computed rounding and
      custom-face validation.
- [x] **DR-513** Add query-answer merging tests for identical child prompts
      under different parents.
- [x] **DR-611** Preload tables referenced inside inline rolls.
- [x] **DR-612** Return `MISSING_DATA` instead of a parser error for forward or
      unresolved inline references inside inline expressions.
- [x] **DR-712** Define and test fallback behavior when a table entry value is
      neither numeric nor a roll expression.
- [x] **DR-811** Build a fixture-driven metadata completeness matrix.
- [x] **DR-909** Define replay for non-serializable RNG states and seed-only
      RNGs.
- [x] **DR-1009** Superseded: the DiceBox adapter is being replaced by the
      first-party Three.js + Rapier renderer in
      [3d-dice-roller-ui.md](3d-dice-roller-ui.md); do not invest in a real
      DiceBox smoke test.
- [x] **DR-1109** Add a CI benchmark job with the documented parse/evaluate
      thresholds.
- [x] **DR-1212** Exercise the optional plugin `validate()` hook or document it
      as reserved.
- [x] **DR-1213** Remove plugin `grammar()` from the public contract; plugins
      contribute tokens and AST nodes instead.
- [x] **DR-1214** Add group-modifier ordering golden tests beyond the current
      compare/keep cases.
- [x] **DR-1215** Add custom-dice edge tests for zero, negative and duplicate
      faces.
- [x] **DR-1216** Document label escaping/sanitization ownership at the chat
      boundary.

## Test matrix

| Suite         | Required cases                                                   |
| ------------- | ---------------------------------------------------------------- |
| Lexer/parser  | tokens, collisions, recovery, spans, malformed input             |
| AST           | every node type, spans, plugin ownership                         |
| Arithmetic    | precedence, unary, functions, divide/mod by zero                 |
| Dice          | all die types, computed/custom/Fudge, validation errors          |
| Modifiers     | each modifier, interaction chains, phases A–G                    |
| Groups        | commas, no commas, mixed-type rejection, nested groups           |
| Expansion     | async repos, precedence, cycles, depth, noerror, selected/target |
| Queries       | defaults, dropdowns, labels, nesting, dedupe, missing/invalid    |
| Inline        | nesting, indexes, `$[[n]]`, `.computed`, labels, missing refs    |
| Tables        | weights, percentages, cycles, missing tables, nested entries     |
| Metadata      | segments, groups, die flags, traces, snapshot round-trip         |
| RNG           | range, deterministic sequences, snapshot/restore                 |
| Visualization | text/2D/3D parity, fallback, no RNG, no mutation                 |
| Hardening     | limits, performance, localization, sanitization, accessibility   |

## Dependency gates

1. Do not start arithmetic before the Chevrotain core harness is green.
2. Do not start dice modifiers before arithmetic precedence is stable.
3. Do not start expansion before repository contracts and result types exist.
4. Do not start queries before expansion scans/provenance are stable.
5. Do not start inline rolls before query extraction is side-effect-free.
6. Do not start metadata/snapshots before dice records are stable.
7. Do not start visualization before the snapshot/render contract is frozen.
8. Do not start acceptance before all hardening checks pass.

## PR checklist

- [ ] Task ID referenced in the PR title/body.
- [ ] Unit tests added/updated for the task.
- [ ] Golden fixture added when behavior changes.
- [ ] Error/warning codes covered.
- [ ] Metadata updated when evaluation changes.
- [ ] No chat/UI imports in the engine.
- [ ] No new hand-written tokenizer/parser.
- [ ] Performance budget not regressed.
- [ ] Task checkbox updated in this document.

## Out of scope

- Chat commands, message rendering, visibility, history and delivery.
- Roll-template rendering and chat buttons/menus.
- Macro library/editor UI.
- Token/VTT model.
- Import/export of campaign packs.
