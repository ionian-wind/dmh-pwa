# Legacy and unreachable code

This document records code that is intentionally excluded from coverage
measurement, or whose uncovered branches are defensive and unreachable through
the public application flow.

## Excluded from coverage

| Area                                                                        | Reason                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/main.ts`, `src/App.vue`, `src/router.ts`                               | Application shell, bootstrap and route table.                                                      |
| `src/i18n/**`, `src/types/**`, `src/schemas/**`                             | Declarative locale/type/schema data.                                                               |
| `src/components/common/milkdown/**`                                         | Milkdown editor integration wrappers.                                                              |
| `src/components/common/MarkdownEditor.vue`                                  | Integration wrapper that selects the Markdown/Milkdown editor implementation.                      |
| `src/components/common/MonacoEditor.vue`, `src/components/common/monaco.ts` | Monaco editor integration and its module loader.                                                   |
| `src/notes/NoteViewSidebar.vue`                                             | Thin sidebar adapter around `Mentions`.                                                            |
| `src/ambient-sound/components/SceneLinksPanel.vue`                          | Thin wrapper around `EntitiesLinking`.                                                             |
| `src/utils/dice-probability-calculator/tokens.ts`                           | Chevrotain token definitions; branch paths belong to the lexer library.                            |
| `src/components/common/entityLinking/useMapEntityCatalog.ts`                | Adapter over the entity stores; behavior is covered through its consumers.                         |
| `src/features/**`, `src/composables/useFeatureStores.ts`                    | Build-time feature wiring; exercised through the production build matrix instead of unit coverage. |

The exclusion list also names `src/components/Tree/**`,
`src/notes/NoteCanvas.vue`, `src/probability-calculator/ProbabilitySyntaxView.vue`,
`src/utils/files/BlobFileHandler.ts`, and `src/modules/ModuleDocumentTree.vue`.
Those paths no longer exist in the source tree and the patterns match nothing;
the current drawing canvas lives at `src/drawings/NoteCanvas.vue`.

The maintained dice engine lives at `src/utils/bag-of-dice` and is **not**
excluded. It is covered by parser, evaluator, reference-compatibility,
metadata, deterministic RNG and branch tests. The shared RNG/sampling library
at `src/utils/rng.ts` is also covered.

Generated output (`dist/`, `dev-dist/`, service workers), standalone scripts and
type declarations are excluded as before; the config also excludes `tests/`,
`coverage/`, and configuration files.

## Documented unreachable branches

These branches remain in the report but cannot be reached through the public
parser/evaluator API. They are defensive guards for impossible CST or token
shapes:

- `src/utils/dice-probability-calculator/parser.ts` — token-position fallbacks
  for missing `startLine`/`startColumn`/`endLine`/`endColumn` data and
  `unexpectedCharacter` regex fallbacks. Chevrotain always supplies these
  fields for parser-produced errors.
- `src/utils/dice-probability-calculator/toAst.ts` — guards for unsupported
  statements/terms, unknown operators, unknown parameter types, invalid
  `else-if` nodes, and unary operators without operands. The parser rejects
  those shapes before the AST builder runs.

Coverage is enforced globally at 87% statements, branches, functions and lines.
Per-file thresholds are not enabled, so defensive files do not fail the whole
run on their own; the global branch gate still requires aggregate coverage.
