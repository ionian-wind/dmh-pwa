# Dice Roller

> **Status: planned — greenfield implementation.** This document specifies the
> dice engine we intend to build from scratch. It does not describe existing
> code or an implementation baseline.

## Purpose

The dice roller is a parser/evaluator for a Roll20-like dice notation superset:

- arithmetic, functions and dice pools;
- exploding, rerolling, keep/drop, matching and sorting modifiers;
- grouped and computed rolls, custom dice and Fudge dice;
- macros, roll queries, tables, inline rolls and roll-history references;
- structured errors, warnings and deterministic RNG;
- a visualization-neutral roll result that can be rendered as text, a chat card
  or 3D dice.

The full Roll20 feature is split into two documents:

| Scope                                                                        | Document                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dice notation, parsing and evaluation                                        | this plan                                                                         |
| Chat commands, macros, attributes, roll templates, buttons and chat delivery | [proposals/roll20-style-chat-engine.md](../proposals/roll20-style-chat-engine.md) |

The dice engine is a prerequisite for the chat engine, not a replacement for it.

## Design principles

- **Multi-pass, not one-shot.** Roll20 compatibility requires ordered expansion,
  query, inline-roll, dice and math passes. A single parse/evaluate call cannot
  reproduce that order.
- **Separate parsers per syntax family.** Chat commands, macros, attributes,
  queries, inline rolls, dice, arithmetic, tables, templates and formatting each
  get their own parser and pass.
- **Results are data, not presentation.** The engine returns structured roll
  records; visualization is selected independently.
- **Everything is deterministic under an injected RNG.** Tests and replays must
  be reproducible.
- **No arbitrary code execution.** Extensions are declarative plugins with
  explicit limits.
- **Start from the specification, not from a legacy engine.** Implement the
  passes and data contracts below directly.

## Goals and requirements

- The core provides an extendable parser, evaluator and error handler.
- Each feature area is a plugin encapsulating syntax extension, parsing,
  evaluation and extraction.
- Parsing is a separate step that returns an AST; extraction and evaluation use
  that AST later.
- Plugins are evaluated in the order supplied. Arithmetic is the built-in
  fallback and is always considered last.
- Evaluation follows Roll20's multi-pass order of operations rather than a
  single monolithic parse. The authoritative pass list is in
  [Roll20 order of operations](#roll20-order-of-operations).
- Parentheses must never be expected to override macro, ability, attribute,
  query or inline-roll expansion order.
- The RNG may be overridden for tests or reproducible rolls.
- Invalid syntax, invalid user input and missing data produce typed exceptions.
- Reaching a dice explosion limit produces a warning, not an exception.
- Invalid formatting markup produces a syntax exception.

## Pipeline

The engine must be a **pass coordinator**, not a single parser that tries to
understand every syntax at once. Each pass may have its own tokenizer, grammar
and output shape, and later passes consume the previous pass's text/AST.

```
ChatMessage
  -> command parser              /roll, /w, /em, /gmroll, plain text, ...
  -> expansion loop              abilities, macros, attributes (<=99)
  -> roll-query parser           ?{prompt|default|option,value} (<=99)
  -> HTML entity decode          inside each resolved query
  -> inline-roll parser          [[...]], innermost first, stable ids
  -> dice parser                 NdX, modifiers, groups, tables
  -> function parser             floor/ceil/round/abs
  -> arithmetic parser           normal math precedence
  -> custom roll parser          optional
  -> HTML entity decode          final output
  -> roll-template renderer      default/custom templates
  -> chat delivery/ACL           public/gm/whisper/self
```

`parse(text)` alone is not enough for Roll20 compatibility. It is only the
dice-notation parser used by step 4. The chat engine owns the outer passes.

## Roll20 order of operations

Roll20 applies these passes in strict order. The first four are text-expansion
passes; the rest operate on the expanded roll text.

| #   | Pass                           | Input                | Output                               | Notes                                                                  |
| --- | ------------------------------ | -------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| 0   | Chat command detection         | raw chat message     | command + payload                    | `/r`, `/w`, `/em`, `/gmroll`, `/desc`, `/as`, `/emas`, plain text, ... |
| 1   | Ability expansion              | payload              | payload with `%{character\|ability}` | recursive                                                              |
| 2   | Macro expansion                | payload              | payload with `#macro`                | recursive                                                              |
| 3   | Attribute expansion            | payload              | payload with `@{character\|attr}`    | includes `selected`, `target`, token bars, `max`, repeating sections   |
| 4   | Repeat 1–3                     | expanded payload     | stable payload or limit error        | up to 99 levels or no expansions left                                  |
| 5   | Roll-query expansion           | payload              | payload with `?{...}` replaced       | up to 99 levels; same prompt asked once                                |
| 5b  | HTML decode inside queries     | query values         | decoded query values                 | one decode per query layer                                             |
| 6   | Inline-roll expansion          | payload              | payload with `[[...]]` results       | innermost first; assign `$[[n]]` indexes                               |
| 7   | Dice evaluation                | expanded roll        | dice results substituted             | exploding/compounding/penetrating/reroll/keep/drop first               |
| 8   | Math functions                 | remaining expression | functions evaluated                  | `floor`, `ceil`, `round`, `abs`                                        |
| 9   | Arithmetic evaluation          | remaining expression | scalar/roll result                   | parentheses, powers, mul/div/mod, add/sub                              |
| 10  | Custom roll parsing (optional) | result object        | computed result                      | character-sheet/script extension                                       |
| 11  | HTML entity decode             | result text          | rendered text                        | once, after CRP                                                        |
| 12  | Chat delivery                  | rendered message     | chat log / API event                 | recipients and permissions enforced here                               |

Important consequences:

- A macro/ability/attribute can contain another macro, query, inline roll or
  template. Expansion must be iterative, not a single regex replacement.
- Roll queries are resolved only after all ability/macro/attribute expansion.
  This is why a query can build an attribute name but an attribute cannot depend
  on a query.
- Inline rolls are resolved before the surrounding `/roll`; nested inline rolls
  are resolved from the deepest level upward.
- Dice are rolled before the remaining math is evaluated. `floor()`/`ceil()` and
  the final arithmetic happen after dice substitution.
- `[[...]]` results referenced through `$[[n]]` must be recorded with stable
  indexes and their raw/computed values.
- Every pass needs its own recursion/expansion budget and a clear error type.
  Do not let one recursive pass consume another pass's budget silently.

### Separate parsers/engines

The following can share low-level utilities but should not share one grammar:

| Parser/engine            | Responsibility                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Chat command parser      | Slash commands, plain text, emotes, whispers, descriptions, hidden/GM messages         |
| Ability/macro parser     | `%{character\|ability}`, `#macro`, nested calls and chaining                           |
| Attribute parser         | `@{...}`, `selected`/`target`, bars, `max`, repeating sections, undefined attributes   |
| Roll-query parser        | `?{prompt}`, defaults, labelled dropdowns, nested queries, HTML-entity stacking        |
| Inline-roll parser       | `[[...]]`, nesting, index assignment, `.computed`, roll-reference reuse                |
| Dice notation parser     | `NdX`, Fudge/custom/computed dice, compare points, all dice modifiers, groups          |
| Arithmetic parser        | Math precedence and `floor`/`ceil`/`round`/`abs`                                       |
| Table-roll parser        | `Nt[table]`, weighted tables, table extraction                                         |
| Roll-template parser     | `&{template:...}`, `{{field=value}}`, display-only helpers, leading-space sensitivity  |
| Chat-button parser       | `[label](~ability)`, `[label](`/roll ...)`, API-style buttons and chat menus           |
| Roll-reference parser    | `$[[n]]`, `$[[n.computed]]`, cross-line/roll reuse rules                               |
| Formatting/entity parser | Markdown-lite formatting, HTML entities, `%NEWLINE%`, images/links, final sanitisation |

### Shared intermediate representation

A pass coordinator needs a small IR rather than repeatedly parsing strings:

```ts
interface PassContext {
  text: string;
  expansions: number;
  queryDepth: number;
  inlineDepth: number;
  rollIndex: number;
  warnings: Warning[];
  errors: EngineError[];
  rawMessage: string;
}

interface RollRecord {
  id: string;
  index: number;
  raw: string;
  computed?: string;
  result: number | number[];
  warnings: Warning[];
}
```

At minimum preserve:

- source spans for error messages;
- the original raw text plus each pass's expanded text;
- stable roll/inline indexes;
- expansion provenance (ability/macro/attribute source);
- query answers and prompt keys;
- warnings and their originating pass.

### Limits and failure policy

- Ability/macro/attribute expansion: 99 levels.
- Roll-query nesting: 99 levels.
- Inline-roll nesting: bounded and cycle-detected.
- Exploding/compounding/penetrating rolls: 99 additional rolls per expression
  (warning when capped).
- Undefined attributes/macros/tables: missing-data error unless `&{noerror}` is
  present.
- Output size and total pass time should also be bounded to avoid macro bombs.
- A pass failure must identify the pass and the source span; never collapse all
  failures into "unable to parse".

## Plugin architecture

A plugin owns one syntax family. It should declare:

- token definitions/grammar contributions for its own pass;
- AST node types and parse functions;
- evaluation/expansion behavior for its nodes;
- extraction functions (queries, tables, references, buttons);
- validation rules and typed errors/warnings.

Plugins are composed by the pass coordinator; they do not parse each other's
syntax. A plugin must return `not-handled` explicitly rather than throwing a
generic error that could be mistaken for a syntax failure.

The planned plugin set:

| Plugin             | Responsibility                                       |
| ------------------ | ---------------------------------------------------- |
| arithmetic         | numbers, unary signs, math functions and precedence  |
| dice               | dice types, compare points, modifiers, groups        |
| roll-queries       | `?{...}` extraction, validation and substitution     |
| tables             | `Nt[table]`, weighted entries, nested inline results |
| macros/abilities   | `#macro`, `%{character\|ability}` expansion          |
| attributes         | `@{...}`, tokens, bars, repeating sections           |
| inline-rolls       | `[[...]]`, nesting and stable indexes                |
| roll-references    | `$[[n]]` and `$[[n.computed]]` resolution            |
| templates          | `&{template:...}` parsing/rendering metadata         |
| buttons/chat-menus | clickable chat actions and nested command dispatch   |
| formatting         | Markdown-lite, HTML entities and output sanitisation |

No plugin may silently swallow another plugin's errors. Each pass reports its
own failures and warnings.

## Notation specification

### Arithmetic and functions

Operators: `+`, `-`, `*`, `/`, `%`, `**`, parentheses. Math-only expressions
such as `5+7*2` are valid. Supported functions: `floor(x)`, `round(x)`,
`ceil(x)`, `abs(x)`.

Precedence: parentheses, functions, exponentiation, multiplication/division/
modulus left-to-right, addition/subtraction left-to-right.

### Dice

- `NdX`, `dX`: N dice with X sides; N defaults to 1.
- `d%`: alias for `d100`.
- `dF`, `dF.1`, `dF.2`, `dF.3`: Fudge/FATE variants.
- Computed dice: `(N+Y)dX`, `Nd(X+Y)`, `(1+2)dF`; parenthesised values are
  rounded.
- Custom dice: `d[1,2,3,5,8]`.
- Grouped rolls: `{1d6, 2d8+1, 1d4-1}`.
- Math on dice: `round(1d6/2)`.
- Labels: `2d6[fire]`; labels may contain Markdown.
- Descriptive text after a roll is allowed, e.g. `1d20+5 for initiative`.

### Compare points

Roll20 modifiers use a **compare point** (`CP`): optional operator plus target
number. If no operator is present, `=` is assumed. For most modifiers the whole
CP may be omitted to use the default.

- `3` → equal to 3
- `>3` → greater than or equal to 3
- `<3` → less than or equal to 3

Successes, failures, explosions, rerolls and matching all use this convention.
Dice modifiers state whether they apply to basic (`B`) and/or Fudge (`F`) dice.

### Dice modifiers

- Successes: `CP`; e.g. `3d6>3`, `10d6<4`.
- Failures: `fCP`; only valid alongside a success check. Each failure subtracts
  one success, e.g. `3d6>3f1`, `10d6<4f>5`.
- Keep/drop: `khN`, `klN`, `dhN`, `dlN`; shorthand `kN` keeps highest and `dN`
  drops lowest. Optional `h`/`l` selects the high/low side.
- Rerolls: `rCP` rerolls until outside the compare point; `roCP` rerolls once.
  `r` with no CP rerolls 1s. Multiple reroll clauses are allowed.
- Explosions:
  - `!` explode on maximum;
  - `!CP` custom explosion threshold;
  - `!p` penetrating (each extra die gets −1);
  - `!!` compounding (extra rolls are added into the same die result);
  - `!<N`, `!>N`, `!=N` directional thresholds.
  - Explosions are capped at 99 additional rolls per expression and emit a
    warning at the limit.
- Dice pools: `=N`, `>N`, `<N`, `e` (exhaustive successes), `s`, `f`, `cs`, `cf`.
  Critical-success/failure markers affect display and counting, not the
  explosion/reroll thresholds unless the same CP is applied to those modifiers.
- Min/max per die: `miN`, `maN`.
- Matching:
  - `m` groups/show matches without changing the total;
  - `mt` returns the number of matching groups;
  - `mtN` requires at least N matching dice;
  - `mtN>X` requires N matching dice at or above X.
- Sorting: `s`/`sa` ascending (default), `sd` descending.
- Roll once: `o` rolls an entire group once.
- Modifiers can be chained, e.g. `4d6kh3ro1!>5sd`.
- Nested groups can receive modifiers, e.g. `{2d6kh1, 1d8}kh1`.
- Advantage/disadvantage use `2d20kh1` / `2d20kl1`.

Modifier application order (important):

1. exploding, compounding, penetrating and rerolls, while dice are still being
   rolled;
2. keep/drop, success/failure counting and sorting, after all dice have settled.

### Grouped rolls

- `{...}` groups multiple sub-rolls. With a comma each sub-expression is totaled
  before group modifiers; without a comma the group applies modifiers across
  individual dice from all sub-rolls.
- All sub-rolls in a group must be the same kind: sum rolls, success rolls, or
  compatible nested groups. Bare numbers need to be made roll-like (for example
  `5 + 0d0` or a nested inline roll).
- Group modifiers include keep/drop, successes and failures.
- `{5d6!!}>8` means “compound each die, then count successes against 8”, not
  “explode on values greater than 8”.

### Tables

`Nt[table-name]` rolls N times on a weighted table; `t[table]` rolls once.
Weights may be expressed by repeating entries or by percentages that total 100.
Table entries may contain inline rolls, which are resolved after selection.
Table references are extracted before evaluation. Inline-roll table syntax
effectively rolls once per inline result in Roll20; multiple-table display is a
separate UI concern, so the engine should return an array even when the UI
collapses it.

### Macros, abilities and attributes

- Macros: `#macro-name`; calls may be nested or chained with `;`.
- Abilities: `%{character|ability}`; may be nested and are expanded before macro
  expansion completes.
- Attributes: `@{character|attribute}`, `@{selected|attribute}`,
  `@{target|attribute}`, token bars (`bar1`–`bar3`), and the optional `max`
  argument.
- Repeating sections: `@{selected|repeating_section_$N_field}` (row index) or
  the `RowID` form. Row indexes start at 0.
- Attribute/ability/macro names are case-insensitive.
- Calling an attribute that contains a formula may return the formula text; wrap
  it in an inline roll to force evaluation.
- Expansion order means attributes/abilities/macros are expanded before roll
  queries. Do not HTML-escape characters inside `@{}`, `%{}` or `#macro` calls.

### Roll queries

- `?{Prompt}` asks for a value.
- `?{Prompt|Default}` supplies a default.
- `?{Prompt|Option1|Option2}` offers a dropdown.
- `?{Prompt|Label 1,value1|Label 2,value2}` separates label from value.
- Query defaults may themselves be inline rolls, e.g. `?{Dmg|[[1d8]]}`.
- Multiple independent queries may appear in one expression.
- The same exact prompt is asked only once per message.
- Nested queries require HTML-entity escaping: `|`, `}`, `,` become `&#124;`,
  `&#125;`, `&#44;`; deeper levels stack the ampersand (`&amp;#124;`, etc.).
- Query nesting is limited to 99 levels; exceeding the limit is a syntax error.
- Query values must be validated against the query schema before evaluation.

### Roll references and reuse

- Inline rolls get stable indexes: `$[[0]]`, `$[[1]]`, ...
- `$[[0]]` resolves the first inline roll in the current message; it cannot be
  placed inside another inline roll in Roll20's normal parser.
- `$[[0.computed]]` refers to the computed/custom value and is less restrictive
  inside nested rolls.
- Cross-line reuse requires `%NEWLINE%` or roll-template fields.
- Roll references to missing indexes are missing-data errors.
- The engine should retain raw, computed and rendered values for every index.

### Roll templates

- Syntax: `&{template:<name>} {{field=value}} {{field2=value}}`.
- The `default` template is always available; others come from sheet packs.
- Values may contain inline rolls, abilities, macros and Markdown-lite.
- Leading spaces inside `{{...}}` break parsing: `{{name=X}}` works,
  `{{ name=X}}` does not.
- Roll templates cannot be used with `/roll`; use them as ordinary chat output
  with inline rolls.
- The rendered message should expose structured fields so a UI can render them
  without HTML injection.

### Roll options and commands

- Initiative: `&{tracker}`, `&{tracker:+}` and `&{tracker:-}` send or adjust a
  result in the turn tracker.
- Error suppression: `&{noerror}` downgrades missing attributes/abilities to
  empty values instead of aborting the message.
- `/r`/`/roll`: normal roll.
- `/gmroll`/`/gr`: roll visible to the GM and roller.
- `/w`: whisper; quote names with spaces.
- `/em`/`/me`: emote; `/ooc`/`/o`: out-of-character.
- `/desc`: GM description; `/as` and `/emas`: GM speech/emote as a named NPC.
- `/talktomyself`: locally suppress chat output; not a security boundary.
- `/fx`: visual effect command; outside the dice engine.
- A leading backtick escapes a command and prevents parsing.
- Multiline chat messages are interpreted line by line.
- Markdown-lite is supported for emphasis, code, links and images; not full
  Markdown.

### Hidden rolls and chat commands

Roll20 has no simple player-hidden roll command; `/gmroll` is the closest normal
feature and is visible to the roller and GM. Truly blind rolls rely on API
scripts or UI tricks. The DMH proposal should define explicit visibility modes
(`public`, `gm`, `self`, `blind`) rather than reproducing that limitation.

### Inline rolls, labels and formatting

- Inline rolls: `[[expr]]`, evaluated deepest-first, total-only display.
- Inline labels: `[[3d6[fire]]]`, `2d10+5[Fire Damage]`; labels are tooltips and
  may contain attribute calls and Markdown.
- Text after a roll is descriptive output, e.g. `1d20+5 Roll for Initiative`;
  escape leading formula characters in that text if needed.
- Roll references: `$[[N]]`, `$[[N.computed]]`.
- `%NEWLINE%` inserts a line break in output; multiline chat and `%NEWLINE%`
  have different ordering semantics.
- `//` starts a comment where supported.
- Markdown-lite emphasis, code, links and images are allowed in chat output.
- HTML entities are decoded at defined points (inside queries and once at final
  output); nested macros require entity stacking.
- Invalid markup is a syntax error.

### Errors and limits

- Syntax/validation/missing-data/nesting-limit exceptions are typed.
- Missing macro, table or roll reference is a missing-data error.
- Division by zero is reported as an error/null result.
- Invalid dice such as `2d0`, `0d6`, `2d-6` and `2d6.5` are rejected.
- Invalid keep/drop counts are rejected.
- Negative dice such as `-1d6` are rejected.
- Mismatched braces/brackets and malformed queries are rejected.
- Explosion limits are warnings; query nesting limits are errors.

## Evaluation details

- Modifiers apply in two phases: roll-time (explode/compound/penetrate/reroll)
  then settled (keep/drop/success/failure/sort).
- The `e` modifier rerolls successes after other modifiers, up to 99 cycles.
- Arithmetic combines scalar totals, concatenates roll arrays, and propagates
  warnings/details.
- Generic plugin errors must not be silently mistaken for “plugin did not handle
  this node”; intentional typed errors are rethrown when no later plugin
  handles the node.
- Inline rolls and table rolls are evaluated before the enclosing formula; their
  results are substituted as numbers/values.
- Roll queries are extracted first, prompted once per unique prompt, then
  substituted before inline rolls.
- Roll references are resolved from the message's roll table, not re-rolled.
- Roll templates are rendered after evaluation; they do not evaluate their own
  hidden dice unless those dice are inline rolls.
- Custom roll parsing (sheet/API extension) runs after ordinary evaluation and
  before the final HTML decode.
- HTML entity decoding is deliberately late so nested macro/query layers can
  use entities as syntax protection.
- Chat delivery applies recipient/permission rules after rendering; hidden/GM
  rolls must be filtered server/side before display.

## Implementation phases

Build the engine from scratch in this order:

1. **Core contracts** — pass context, AST/IR, roll records, typed errors and
   warnings.
2. **Pass coordinator** — ordered expansion/query/inline/dice/math/template/
   delivery passes with per-pass limits.
3. **Arithmetic + dice parser** — numbers, functions, precedence, dice types,
   compare points, modifiers, groups.
4. **Query, inline and table passes** — extraction, prompting, stable roll
   indexes and weighted tables.
5. **Roll references and templates** — `$[[n]]` resolution and structured
   template output.
6. **Macro/ability/attribute expansion** — the 99-level expansion loop.
7. **Chat command and visibility layer** — commands, recipients and hidden/GM
   modes, per the separate proposal.
8. **Formatting/sanitisation** — Markdown-lite, HTML entities and final output.
9. **Visualization adapters** — text/chat card first, optional 2D/3D dice.
10. **End-to-end tests** — raw message through expansion, prompting, rolls,
    math, template and delivery.

The chat/macro/template/button layer is specified separately in
[proposals/roll20-style-chat-engine.md](../proposals/roll20-style-chat-engine.md).

## Planned module layout

Names are provisional; the boundaries matter more than the paths.

| Module              | Responsibility                                         |
| ------------------- | ------------------------------------------------------ |
| `engine/pass`       | Pass coordinator, budget checks and pass ordering      |
| `engine/dice`       | Dice notation tokenizer/parser/evaluator               |
| `engine/arithmetic` | Math functions and precedence                          |
| `engine/queries`    | Roll-query extraction, validation and substitution     |
| `engine/inline`     | Inline-roll parsing, nesting and roll-index registry   |
| `engine/tables`     | Table parsing and weighted selection                   |
| `engine/references` | Roll reference resolution                              |
| `engine/macros`     | Macro/ability/attribute expansion                      |
| `engine/templates`  | Roll-template parsing and structured fields            |
| `engine/formatting` | Markdown-lite, HTML entities and sanitisation          |
| `engine/visualize`  | Visualization adapter contracts and built-in renderers |

## Roll visualization

The engine must be visualization-neutral. A roll is data first:

```ts
interface RollResult {
  total: number;
  groups: DiceGroupResult[];
  warnings: RollWarning[];
}
```

`DiceGroupResult` records each die value, which dice were kept/dropped/exploded/
rerolled, modifiers applied, and display labels.

Visualization adapters consume that result:

- **Text/chat card** — required baseline, accessible and always available.
- **2D dice list** — shows individual dice and totals.
- **3D dice** — one optional visualization: an animated physics layer that
  displays the values supplied by the engine.
- **No animation / reduced motion** — must still show the full result and
  breakdown.

Rules:

- 3D dice never decide the result. They visualize roll records or an animation
  plan generated from them.
- An animation must not re-roll or consume extra RNG.
- Text output must remain available even when 3D dice are enabled.
- Rendering must support accessibility, reduced motion and low-power devices.

## Testing plan

- Golden tests for the full 12-pass order of operations.
- Parser unit tests per syntax family, not one monolithic parser suite.
- Cross-plugin integration tests: dice + arithmetic + queries + tables +
  inline rolls + templates.
- Expansion-cycle, depth-limit and output-size tests.
- RNG determinism and replay tests.
- Visualization tests that assert display data matches the engine's roll records
  and never changes the result.
- End-to-end tests from raw chat message to structured rendered message.

## Risks and open decisions

- Parser technology choice is open; evaluate maintainability, error recovery and
  performance before committing.
- The expansion/query/pass coordinator is the highest-complexity part and should
  be designed before individual parsers.
- Compatibility quirks (HTML entity stacking, leading-space template rules,
  roll-index restrictions) need explicit tests.
- 3D dice are optional; decide whether the app ships them by default, as an
  opt-in, or not at all.
- Define a stable JSON shape for roll results before adding visualization
  adapters.
- Decide export/import format for macros, tables, templates and roll records.
- No custom-roll-parsing extension point yet; design it as a safe, declarative
  post-evaluation hook.

## Definition of done

- All passes and parsers exist behind a single documented entry point.
- A complex Roll20-style macro produces the same structured result on repeated
  runs with a fixed RNG.
- Every roll record can be rendered as text and optionally as 3D dice without
  changing the result.
- Failure messages identify the pass, source span and cause.
- The chat proposal's first phase can call the engine without duplicating dice
  parsing.

## References

Roll20 documentation used for this plan:

- [Order of Operations](https://wiki.roll20.net/Order_of_Operations)
- [Dice Reference](https://wiki.roll20.net/Dice_Reference)
- [Inline Rolls](https://wiki.roll20.net/Inline_Rolls)
- [Roll Query](https://wiki.roll20.net/Roll_Query)
- [Reusing Rolls](https://wiki.roll20.net/Reusing_Rolls)
- [Roll Templates](https://wiki.roll20.net/Roll_Templates)
- [Roll Table](https://wiki.roll20.net/Roll_Table)
- [Macros](https://wiki.roll20.net/Macros)
- [Macros/Formatting](https://wiki.roll20.net/Macros/Formatting)
- [Macros/Initiative](https://wiki.roll20.net/Macros/Initiative)
- [Character attributes](https://wiki.roll20.net/Character#Attributes)
- [Text Chat](https://wiki.roll20.net/Text_Chat)
- [Hidden Rolls](https://wiki.roll20.net/Hidden_Rolls)
- [Chat Menus](https://wiki.roll20.net/Chat_Menus)
- [Button](https://wiki.roll20.net/Button)
- [Link Token](https://wiki.roll20.net/Link_Token)
- [Complete Guide to Macros & Rolls](https://wiki.roll20.net/Complete_Guide_to_Macros_%26_Rolls)
