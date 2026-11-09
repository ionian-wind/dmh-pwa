# Dice Roller — Implementation Plan

> **Status: not started.** Track implementation here. Check a task only when its
> code, tests and documentation are complete.
>
> Design reference: [dice-roller.md](dice-roller.md). Chat, macros UI and message
> delivery are out of scope for this tracker.

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
| 0. Foundations             | [ ]    | Contracts compile; fixtures load           |
| 1. Chevrotain core         | [ ]    | Lexer/parser/CST-AST harness green         |
| 2. Arithmetic              | [ ]    | Arithmetic golden tests green              |
| 3. Dice and modifiers      | [ ]    | Dice/modifier/group golden tests green     |
| 4. Expansion               | [ ]    | Async macro/ability/attribute tests green  |
| 5. Roll queries            | [ ]    | Extraction/answer/substitution tests green |
| 6. Inline rolls and labels | [ ]    | Inline/index/reference tests green         |
| 7. Table plugin            | [ ]    | Table selection/cycle/weight tests green   |
| 8. Process metadata        | [ ]    | Snapshot/render-metadata tests green       |
| 9. RNG and replay          | [ ]    | Determinism/replay tests green             |
| 10. Visualization          | [ ]    | Text/2D/3D adapter tests green             |
| 11. Hardening              | [ ]    | Performance/security/i18n budgets pass     |
| 12. Acceptance             | [ ]    | Definition of done satisfied               |

## Phase 0 — Foundations

- [ ] **DR-001** Create the planned `engine/` module skeleton and public entry
      point.
- [ ] **DR-002** Add shared types: `EngineOptions`, `Repositories`,
      `RollContext`, `Rng`, `AstNode`, `AstSpan`.
- [ ] **DR-003** Add result types: `RollResult`, `RollBreakdown`,
      `RollSegment`, `RollProcess`, `PassRecord`.
- [ ] **DR-004** Add roll-record types: `DieRecord`, `DiceGroupResult`,
      `InlineRollRecord`, `ExpansionRecord`, `QueryAnswerRecord`.
- [ ] **DR-005** Add error/warning codes and `RollError`/`RollWarning`
      constructors.
- [ ] **DR-006** Add limit defaults and a `resolveLimits()` helper.
- [ ] **DR-007** Add a fixture loader for expression/expected-result test cases.
- [ ] **DR-008** Add a deterministic test RNG (`sequenceRng`) and a snapshot
      helper.
- [ ] **DR-009** Add a public API test proving `extract()` and `roll()` are
      exported and return outcomes.
- [ ] **DR-010** Document the module boundaries in code comments/README.

**Gate:** contracts compile; a trivial expression can reach an empty parser stub
without `any` leaking into public APIs.

## Phase 1 — Chevrotain core

- [ ] **DR-101** Create token helpers and core token categories (whitespace,
      number, compare, brackets, separators).
- [ ] **DR-102** Implement token-vocabulary composition with deterministic
      ordering and collision checks.
- [ ] **DR-103** Implement one-lexer-per-grammar construction and a token
      stream snapshot for diagnostics.
- [ ] **DR-104** Implement the plugin registry: token ownership, parser rule
      registration, CST handler registration and registration errors.
- [ ] **DR-105** Implement typed CST-to-AST conversion helpers and span
      propagation.
- [ ] **DR-106** Implement bounded Chevrotain recovery and error-to-`RollError`
      mapping.
- [ ] **DR-107** Implement parser error source spans and snippets.
- [ ] **DR-108** Add grammar fixture tests: valid token stream, invalid token,
      collision, recovery limit.
- [ ] **DR-109** Add an AST contract test asserting every node has `type`,
      `plugin`, `span`.
- [ ] **DR-110** Add a no-mega-grammar test: each plugin grammar builds
      independently.

**Gate:** a dummy plugin can lex/parse a literal and produce a typed AST;
collisions and recovery are tested.

## Phase 2 — Arithmetic plugin

- [ ] **DR-201** Implement number literals, decimal numbers and unary signs.
- [ ] **DR-202** Implement `+`, `-`, `*`, `/`, `%`, `**` with documented
      precedence.
- [ ] **DR-203** Implement parentheses.
- [ ] **DR-204** Implement `floor`, `ceil`, `round`, `abs`.
- [ ] **DR-205** Implement division/modulus by zero policy.
- [ ] **DR-206** Build arithmetic AST nodes and evaluator returning `EvalResult`.
- [ ] **DR-207** Add arithmetic trace records for metadata.
- [ ] **DR-208** Add golden tests for precedence, associativity and unary signs.
- [ ] **DR-209** Add error tests for malformed arithmetic.
- [ ] **DR-210** Add math-only roll tests (e.g. `5+7*2`).

**Gate:** arithmetic golden suite passes and contributes render segments.

## Phase 3 — Dice and modifiers

### Dice syntax

- [ ] **DR-301** Implement `NdX`, `dX`, default count 1 and validation.
- [ ] **DR-302** Implement `d%` alias.
- [ ] **DR-303** Implement Fudge `dF`, `dF.1`, `dF.2`, `dF.3`.
- [ ] **DR-304** Implement computed dice `(N+Y)dX` and `Nd(X+Y)` with rounding.
- [ ] **DR-305** Implement custom dice `d[a,b,c]`.
- [ ] **DR-306** Implement labels `2d6[fire]`.
- [ ] **DR-307** Add invalid-dice tests (`2d0`, `0d6`, `2d-6`, `2d6.5`).

### Compare points and modifiers

- [ ] **DR-311** Implement compare points (`N`, `>N`, `<N`, `=N`).
- [ ] **DR-312** Implement success/failure counting (`CP`, `fCP`).
- [ ] **DR-313** Implement `cs`/`cf` critical markers/counting.
- [ ] **DR-314** Implement keep/drop (`kh`, `kl`, `dh`, `dl`, `k`, `d`).
- [ ] **DR-315** Implement reroll (`r`, `ro`) with compare points and multiple
      clauses.
- [ ] **DR-316** Implement explosion (`!`, `!CP`, `!<`, `!>`, `!=`).
- [ ] **DR-317** Implement penetrating (`!p`) and compounding (`!!`).
- [ ] **DR-318** Implement min/max (`mi`, `ma`).
- [ ] **DR-319** Implement matching (`m`, `mt`, `mtN`, `mtN>X`).
- [ ] **DR-320** Implement sorting (`s`, `sa`, `sd`) as display-only.
- [ ] **DR-321** Implement roll-once (`o`) and grouped-roll modifiers.
- [ ] **DR-322** Implement `e` exhaustive successes after success phase.
- [ ] **DR-323** Implement modifier phases A–G exactly as documented.
- [ ] **DR-324** Record `modifierOrder` and applied modifiers in metadata.
- [ ] **DR-325** Cap explosions/rerolls and emit limit warnings.

### Groups

- [ ] **DR-331** Parse grouped rolls `{...}` and comma-separated sub-rolls.
- [ ] **DR-332** Validate homogeneous sub-roll kinds.
- [ ] **DR-333** Apply group keep/drop/success/failure modifiers.
- [ ] **DR-334** Implement nested group modifiers.
- [ ] **DR-335** Record group and sub-group totals in metadata.

### Tests

- [ ] **DR-341** Add golden tests for each modifier independently.
- [ ] **DR-342** Add interaction tests: reroll+explode+keep+success+matching.
- [ ] **DR-343** Add group tests including `{5d6!!}>8`.
- [ ] **DR-344** Add deterministic RNG tests for every die type.
- [ ] **DR-345** Add metadata tests: kept, dropped, rerolled, exploded,
      compounded and penetrating flags.

**Gate:** all dice/modifier/group tests pass; metadata shows every die's
original/final state.

## Phase 4 — Expansion

- [ ] **DR-401** Define macro, ability and attribute repository interfaces.
- [ ] **DR-402** Implement a composite macro repository with configurable source
      precedence.
- [ ] **DR-403** Implement case-insensitive normalized lookup.
- [ ] **DR-404** Implement per-call memo cache.
- [ ] **DR-405** Implement expansion scanning for `#macro`.
- [ ] **DR-406** Implement expansion scanning for `%{character|ability}`.
- [ ] **DR-407** Implement expansion scanning for `@{character|attribute}`,
      `selected`, `target`, bars and `max`.
- [ ] **DR-408** Implement repeating-section row index/RowID options.
- [ ] **DR-409** Implement 99-level expansion loop with provenance records.
- [ ] **DR-410** Implement cycle detection with `kind:source:name` keys.
- [ ] **DR-411** Implement `noerror` missing-data downgrade and warnings.
- [ ] **DR-412** Implement per-source shadow warnings.
- [ ] **DR-413** Add async/missing/cycle/depth/precedence tests.
- [ ] **DR-414** Add tests proving `selected`/`target` are passed through without
      assuming a token model.

**Gate:** async expansion tests pass; expansion records feed `RollProcess`.

## Phase 5 — Roll queries

- [ ] **DR-501** Parse `?{Prompt}`, `?{Prompt|Default}` and dropdowns.
- [ ] **DR-502** Parse labelled dropdown values.
- [ ] **DR-503** Parse nested queries and HTML-entity escaping.
- [ ] **DR-504** Build stable query IDs from normalized prompt/options.
- [ ] **DR-505** Deduplicate identical prompts.
- [ ] **DR-506** Implement `RollQueryRequest[]` extraction without rolling.
- [ ] **DR-507** Validate answers by ID, then prompt text, then option values.
- [ ] **DR-508** Implement depth-first nested query resolution.
- [ ] **DR-509** Implement default values and inline-roll defaults.
- [ ] **DR-510** Implement `needs-input` outcome for unanswered roll queries.
- [ ] **DR-511** Add tests for missing/invalid/extra answers and nesting.
- [ ] **DR-512** Add a test proving extraction is side-effect-free.

**Gate:** UI can call `extract()`, answer queries and pass answers to `roll()`.

## Phase 6 — Inline rolls, labels and references

- [ ] **DR-601** Parse `[[...]]` and nested inline rolls.
- [ ] **DR-602** Evaluate inline rolls innermost-first.
- [ ] **DR-603** Assign stable `$[[n]]` indexes and retain raw/computed values.
- [ ] **DR-604** Implement `$[[n]]` and `$[[n.computed]]` references.
- [ ] **DR-605** Implement missing-reference errors.
- [ ] **DR-606** Parse inline labels and record label segments.
- [ ] **DR-607** Implement label metadata without evaluating chat Markdown.
- [ ] **DR-608** Implement inline-depth limits and cycle protection.
- [ ] **DR-609** Add tests for nested inline rolls and cross-reference rules.
- [ ] **DR-610** Add metadata tests for inline ordering and indexes.

**Gate:** inline rolls and references resolve from recorded metadata only.

## Phase 7 — Table plugin

- [ ] **DR-701** Parse `Nt[table]` and `t[table]`.
- [ ] **DR-702** Implement count parsing and validation.
- [ ] **DR-703** Implement count and percentage weight modes.
- [ ] **DR-704** Implement weighted selection with one RNG draw per roll.
- [ ] **DR-705** Implement entry inline rolls.
- [ ] **DR-706** Implement table recursion depth and cycle detection.
- [ ] **DR-707** Implement missing-table and `noerror` behavior.
- [ ] **DR-708** Record table selections in metadata.
- [ ] **DR-709** Add weight/cycle/missing/nested-table tests.
- [ ] **DR-710** Add deterministic selection tests with sequence RNG.

**Gate:** table plugin is optional; core passes without it and tests prove it.

## Phase 8 — Process metadata and snapshots

- [ ] **DR-801** Implement `PassRecord` emission for every pass.
- [ ] **DR-802** Implement expansion/query/inline records in `RollProcess`.
- [ ] **DR-803** Implement `RollBreakdown.segments` ordering.
- [ ] **DR-804** Implement die/group records for every modifier state.
- [ ] **DR-805** Implement arithmetic trace emission.
- [ ] **DR-806** Implement label/text segments.
- [ ] **DR-807** Implement `schemaVersion` and `RollResultSnapshot`.
- [ ] **DR-808** Implement snapshot serialization/deserialization tests.
- [ ] **DR-809** Add metadata completeness tests for every expression kind.
- [ ] **DR-810** Add a renderer contract test proving no re-roll is required.

**Gate:** a renderer can reproduce the full roll breakdown from metadata alone.

## Phase 9 — RNG and replay

- [ ] **DR-901** Implement crypto-backed production RNG.
- [ ] **DR-902** Implement deterministic sequence RNG for tests.
- [ ] **DR-903** Validate RNG output range and throw `RNG_FAILURE`.
- [ ] **DR-904** Implement optional RNG snapshot/restore.
- [ ] **DR-905** Record replay state in `RollResult`.
- [ ] **DR-906** Add determinism tests across all dice/modifier types.
- [ ] **DR-907** Add replay tests using snapshot/restore and seed sequences.
- [ ] **DR-908** Add a test proving 3D rendering never consumes RNG.

**Gate:** same input + RNG state + repositories + answers gives identical results.

## Phase 10 — Visualization

- [ ] **DR-1001** Define `RollVisualizer` adapter interface.
- [ ] **DR-1002** Implement the text/chat-card renderer contract.
- [ ] **DR-1003** Implement the 2D dice breakdown.
- [ ] **DR-1004** Implement the 3D dice adapter using existing `@3d-dice/dice-box`.
- [ ] **DR-1005** Implement fallback when WebGL/assets/reduced motion block 3D.
- [ ] **DR-1006** Implement accessible text output for every segment.
- [ ] **DR-1007** Add tests proving adapters do not mutate or re-roll results.
- [ ] **DR-1008** Add visual parity tests: text/2D/3D use the same values.

**Gate:** text/2D baseline is always available; 3D is optional and deterministic.

## Phase 11 — Hardening

- [ ] **DR-1101** Implement performance benchmarks and budgets.
- [ ] **DR-1102** Implement output-size and pass-time limits.
- [ ] **DR-1103** Add macro-bomb/large-group/pathological-query tests.
- [ ] **DR-1104** Add localization-ready error code/parameter tests.
- [ ] **DR-1105** Add accessibility checks for roll metadata.
- [ ] **DR-1106** Add sanitization boundary tests for labels/text segments.
- [ ] **DR-1107** Add schema compatibility tests for snapshots.
- [ ] **DR-1108** Document public API and module boundaries.

**Gate:** performance, limits, localization and snapshot compatibility pass.

## Phase 12 — Acceptance

- [ ] **DR-1201** Run the complete parser/AST/evaluator golden suite.
- [ ] **DR-1202** Run expansion/query/inline/table integration suite.
- [ ] **DR-1203** Run deterministic RNG/replay suite.
- [ ] **DR-1204** Run visualization parity/accessibility suite.
- [ ] **DR-1205** Verify no chat/UI dependency leaks into the engine.
- [ ] **DR-1206** Verify no custom hand-written parser/tokenizer exists.
- [ ] **DR-1207** Verify all public contracts have tests and documentation.
- [ ] **DR-1208** Complete the definition of done in [dice-roller.md](dice-roller.md).
- [ ] **DR-1209** Tag the first stable engine schema version.
- [ ] **DR-1210** Hand off extraction/roll APIs to the chat implementation track.

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
