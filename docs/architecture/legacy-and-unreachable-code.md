# Legacy and unreachable code

This document records code that is intentionally excluded from coverage
measurement, or whose uncovered branches are defensive and unreachable through
the public application flow.

## Excluded from coverage

| Area                                                                        | Reason                                                                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/dice-roller/plugins/dice/ast.ts`                                 | Legacy CST-to-AST mapper retained for the old dice-roller engine. Most remaining paths are fallbacks for CST shapes the current parser never emits. |
| `src/utils/dice-roller/core/index.ts`                                       | Legacy dice-roller core. The probability calculator is the maintained evaluation path.                                                              |
| `src/components/Tree/**`                                                    | Generated/copied tree components from `@vue-dnd-kit/components`; they are vendored UI primitives rather than project code.                          |
| `src/components/common/milkdown/**`                                         | Milkdown editor integration wrappers.                                                                                                               |
| `src/components/common/MarkdownEditor.vue`                                  | Integration wrapper that selects the Markdown/Milkdown editor implementation.                                                                       |
| `src/components/common/MonacoEditor.vue`, `src/components/common/monaco.ts` | Monaco editor integration and its module loader.                                                                                                    |
| `src/notes/NoteCanvas.vue`                                                  | Quickdraw drawing-canvas integration.                                                                                                               |
| `src/probability-calculator/ProbabilitySyntaxView.vue`                      | Read-only Monaco syntax viewer.                                                                                                                     |
| `src/notes/NoteViewSidebar.vue`                                             | Thin sidebar adapter around `Mentions`.                                                                                                             |
| `src/ambient-sound/components/SceneLinksPanel.vue`                          | Thin wrapper around `EntitiesLinking`.                                                                                                              |
| `src/utils/dice-probability-calculator/tokens.ts`                           | Chevrotain token definitions; branch paths belong to the lexer library.                                                                             |
| `src/maps/composables/useMapEntityCatalog.ts`                               | Adapter over the entity stores; behavior is covered through its consumers.                                                                          |
| `src/modules/ModuleDocumentTree.vue`                                        | Tree integration layer.                                                                                                                             |
| `src/App.vue`, `src/main.ts`, `src/router.ts`                               | Application shell, bootstrap and route table.                                                                                                       |

Generated output (`dist/`, `dev-dist/`, service workers), standalone scripts and
type declarations are excluded as before.

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

Other components keep their normal 87% statement/line requirement even when
individual branch expressions are defensive.
