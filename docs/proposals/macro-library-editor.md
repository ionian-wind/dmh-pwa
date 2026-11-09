# Macro Library & Editor

> **Status: proposal — not implemented.** A first-class local macro library and
> Monaco-based editor for roll expressions, macros, abilities and roll queries.

## Purpose

Roll macros are code-like expressions. A text input is not enough: users need
search, organization, syntax highlighting, completions, diagnostics and a safe
way to test a macro before using it.

The editor should use the existing Monaco integration and the roll engine's
parser/AST. It must not maintain a separate grammar.

## Goals

- Store and organize reusable macros locally.
- Edit macros with Monaco: syntax highlighting, bracket matching, diagnostics,
  completions and hover help.
- Complete dice modifiers, roll-query syntax, macro calls, ability calls and
  attribute calls.
- Validate through the roll engine before saving/running.
- Preview a roll with the current repositories/RNG.
- Import/export macros and packs.
- Share one macro model between chat, the editor and character abilities.

## Non-goals

- Running arbitrary JavaScript.
- Remote collaboration in the first phase.
- A full IDE, multi-file projects or git integration.
- Server-side execution.

## Prior art

- [`anduh/rmacro`](https://github.com/anduh/rmacro) — VSCode syntax highlighting
  and suggestions for Roll20 macros. Use it as a reference for token categories,
  completion sets and editor UX.
- [`ttg-club/dice-roller-parser`](https://github.com/ttg-club/dice-roller-parser)
  — existing JavaScript parser/evaluator. Useful as coverage/edge-case reference;
  likely incomplete for the full syntax.

## Architecture

```
MacroEditor (Monaco)
  -> Monaco language service
       -> roll-engine tokenizer/highlighting
       -> roll-engine parser diagnostics
       -> completion provider (repositories + static syntax)
  -> MacroLibrary store
       -> MacroDefinition
       -> export/import
  -> Preview panel
       -> roll engine extract/roll
       -> RollResult breakdown
```

The roll engine remains the source of truth for grammar. The editor supplies
Monaco tokenization/highlighting from the same token definitions and diagnostics
from the same parser.

## Macro model

```ts
interface MacroDefinition {
  id: string;
  name: string;
  command: string;
  description?: string;
  tags: string[];
  source: 'user' | 'pack' | 'import';
  packId?: string;
  syntaxVersion?: number;
  createdAt: number;
  updatedAt: number;
}
```

Abilities can reuse the same editor and command model while remaining attached to
a character/ability record.

## Editor features

- Syntax highlighting driven by roll-engine tokens.
- Error squiggles with pass/plugin and source spans.
- Autocomplete:
  - operators, functions and dice syntax;
  - modifiers and compare points;
  - `#` macros;
  - `%` abilities (if repositories are available);
  - `@` attributes, bars, `max` and repeating sections;
  - `?{...}` query prompts/defaults;
  - `[[...]]` inline rolls and `&{template:...}` fields.
- Hover documentation for modifiers and syntax.
- Formatting/pretty-print for long macros.
- Snippet library (attack, damage, save, initiative, table, query).
- Run/preview panel with explicit RNG (random or seeded), query-answer form and
  full `RollResult` metadata.
- Import/export JSON or pack format.
- Duplicate/rename/tag/search.

## Completion data

Completions need both static syntax and dynamic repositories:

```ts
interface CompletionSources {
  macros: MacroRepository;
  abilities: AbilityRepository;
  attributes: AttributeRepository;
  tables?: TableRepository;
  templates?: RollTemplateRepository;
}
```

Dynamic sources are async. The editor should debounce and cache results per
session, and degrade gracefully when a repository is unavailable.

## Macro library UI

- List/search/filter by name, tag and source.
- Create/duplicate/delete with confirmation.
- Drag/reorder or sort by name/updated date.
- Quick-run from the library and chat composer.
- Pack grouping/import/export.
- Optional folders/collections.

## Validation and testing

- Parse-on-change; do not evaluate on every keystroke.
- Save blocked only for syntax errors; missing-data errors are warnings until
  preview/run.
- Preview uses the same repositories and query-answer flow as chat.
- Tests:
  - tokenization/highlighting snapshots;
  - completion sets for `#`, `%`, `@`, `?`, `[[`;
  - diagnostics with source spans;
  - seeded preview determinism;
  - import/export round-trips.

## Phases

1. Macro storage model and library list/search.
2. Monaco language registration + highlighting.
3. Parser diagnostics and hover docs.
4. Static completions/snippets.
5. Async repository completions.
6. Preview with query answers and roll breakdown.
7. Import/export and pack support.
8. Ability editor reuse.

## Open questions

- Store macros in a dedicated store or inside campaign packs?
- Should abilities and global macros share one editor component or separate
  variants?
- How should versioning/conflicts work for imported packs?
- Should preview rolls be saved to chat history?
- How much syntax help should be inline vs. linked help center pages?
