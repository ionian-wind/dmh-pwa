# Roll20-Style Chat Engine

> **Status: proposal — not implemented.** This is a separate feature from the
> dice-notation parser. It describes a local chat/macro engine that can call the
> dice engine described in [plans/dice-roller.md](../plans/dice-roller.md).

## Why a separate document

The dice plan covers one parser family: dice notation, modifiers, groups and
roll evaluation. Roll20's chat surface is wider:

- chat commands and message types;
- reusable macros, character abilities and attributes;
- roll queries and inline rolls;
- roll templates, chat menus and clickable buttons;
- table rolls, roll references and initiative;
- hidden/GM visibility and chat history.

Those features need their own parsers and a pass coordinator. Treating them as
part of the dice grammar would make the dice parser monolithic and would prevent
the required expansion order. This proposal defines that outer engine.

## Goals

- Accept a chat message and determine its command/message type.
- Expand abilities, macros and attributes in the correct order.
- Collect and resolve roll queries.
- Evaluate inline rolls and the dice engine.
- Render roll templates and clickable chat buttons.
- Deliver the result to public, GM, self or blind recipients.
- Keep everything local-first and usable without a server.
- Expose extensions through a plugin/API-like registry rather than hard-coding
  every sheet feature.

## Non-goals

- Reproducing the Roll20 virtual tabletop, tokens on a canvas, dynamic lighting
  or the marketplace.
- Running arbitrary JavaScript from macros.
- Server-side API scripts.
- Full Roll20 character-sheet HTML/CSS compatibility.
- A full replacement for Roll20's permission model in the first phase.

## Relationship to the dice engine

The chat engine owns the outer passes and calls the dice engine at the dice
step:

```
chat message
  -> chat command parser
  -> expansion loop (abilities/macros/attributes)
  -> roll query parser
  -> inline roll parser
  -> dice engine (plans/dice-roller.md)
  -> math functions + arithmetic
  -> optional custom roll parsing
  -> roll template renderer
  -> chat visibility/formatting
  -> message store/UI
```

The dice engine must not perform macro, attribute, query or template parsing.
The chat engine must not duplicate dice modifier parsing.

## Roll20 order of operations

The chat engine is a **pass coordinator**, not a single parser:

```
ChatMessage
  -> command parser              /roll, /w, /em, /gmroll, plain text, ...
  -> expansion loop              abilities, macros, attributes (<=99)
  -> roll-query parser           ?{prompt|default|option,value} (<=99)
  -> HTML entity decode          inside each resolved query
  -> inline-roll parser          [[...]], innermost first, stable ids
  -> dice engine                 dice, modifiers, groups (plans/dice-roller.md)
  -> function + arithmetic       floor/ceil/round/abs, then math precedence
  -> optional custom roll parse
  -> HTML entity decode          final output
  -> roll-template renderer      default/custom templates
  -> chat delivery/ACL           public/gm/whisper/self/blind
```

| #   | Pass                           | Input                | Output                               | Notes                                                                  |
| --- | ------------------------------ | -------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| 0   | Chat command detection         | raw chat message     | command + payload                    | `/r`, `/w`, `/em`, `/gmroll`, `/desc`, `/as`, `/emas`, plain text, ... |
| 1   | Ability expansion              | payload              | payload with `%{character\|ability}` | recursive                                                              |
| 2   | Macro expansion                | payload              | payload with `#macro`                | recursive                                                              |
| 3   | Attribute expansion            | payload              | payload with `@{character\|attr}`    | selected/target tokens, bars, `max`, repeating sections                |
| 4   | Repeat 1–3                     | expanded payload     | stable payload or limit error        | up to 99 levels or no expansions left                                  |
| 5   | Roll-query expansion           | payload              | payload with `?{...}` replaced       | up to 99 levels; same prompt asked once                                |
| 5b  | HTML decode inside queries     | query values         | decoded query values                 | one decode per query layer                                             |
| 6   | Inline-roll expansion          | payload              | payload with `[[...]]` results       | innermost first; assign `$[[n]]` indexes                               |
| 7   | Dice evaluation                | expanded roll        | dice results substituted             | delegated to the dice engine                                           |
| 8   | Math functions                 | remaining expression | functions evaluated                  | `floor`, `ceil`, `round`, `abs`                                        |
| 9   | Arithmetic evaluation          | remaining expression | scalar/roll result                   | parentheses, powers, mul/div/mod, add/sub                              |
| 10  | Custom roll parsing (optional) | result object        | computed result                      | sheet/script extension                                                 |
| 11  | HTML entity decode             | result text          | rendered text                        | once, after CRP                                                        |
| 12  | Chat delivery                  | rendered message     | chat log / API event                 | recipients and permissions enforced here                               |

Important consequences:

- A macro/ability/attribute can contain another macro, query, inline roll or
  template. Expansion must be iterative, not a single regex replacement.
- Roll queries are resolved only after all ability/macro/attribute expansion.
- Inline rolls are resolved before the surrounding `/roll`; nested inline rolls
  resolve from the deepest level upward.
- Dice are rolled before the remaining math is evaluated.
- `[[...]]` results referenced through `$[[n]]` must have stable indexes and
  raw/computed values.
- Each pass needs its own recursion budget and typed errors.

## Pass contracts and limits

A pass should return a typed result with the transformed text, warnings, errors
and source spans. Preserve at minimum:

- raw text and each pass's expanded text;
- expansion provenance (ability/macro/attribute source);
- query answers and prompt keys;
- stable inline/roll indexes;
- warnings and their originating pass.

Limits:

- ability/macro/attribute expansion: 99 levels;
- roll-query nesting: 99 levels;
- inline-roll nesting: bounded with cycle detection;
- explosion/reroll limits: owned by the dice engine (warning, not error);
- total output size and pass time: bounded to prevent macro bombs;
- missing attributes/macros/tables: missing-data error unless `&{noerror}`.

## Parser technology

Use the existing **Chevrotain 13.2.0** dependency for grammar-based chat
parsers:

- roll-query parser (`?{...}`);
- roll-template parser (`&{template:...}`, `{{field=value}}`);
- chat-button/chat-menu parser;
- table/reference grammar where it is genuinely grammar-based.

Ability/macro/attribute expansion, HTML entity decoding and visibility delivery
are scanning/state-machine passes rather than grammars. Each Chevrotain parser
uses only its own token vocabulary and emits typed AST/records for the pass
coordinator; do not build one mega-grammar or a second hand-written parser
stack.

## Architecture

### 1. Chat command parser

Detects the message kind and command before any expansion:

| Command          | Meaning                                        |
| ---------------- | ---------------------------------------------- |
| `/r`, `/roll`    | Roll formula                                   |
| `/gr`, `/gmroll` | Roll visible to the roller and GM              |
| `/w`, `/whisper` | Whisper to a player/character                  |
| `/em`, `/me`     | Emote as the current speaker                   |
| `/ooc`, `/o`     | Out-of-character text                          |
| `/desc`          | GM description                                 |
| `/as`, `/emas`   | GM speech/emote as a named NPC                 |
| `/talktomyself`  | Locally hide output; not a security boundary   |
| `/fx`            | Visual effect command (out of scope initially) |
| plain text       | Normal chat message                            |

A leading backtick escapes the whole command. Multiline input is processed line
by line. The parser returns `{ kind, command, payload, visibility, target }`.

### 2. Expansion loop

Runs up to 99 iterations and stops when no expansion remains:

1. abilities: `%{character|ability}`;
2. macros: `#macro-name`;
3. attributes: `@{character|attribute}`, `@{selected|...}`,
   `@{target|...}`, token bars and `max`.

The loop records provenance and source spans. It must reject cycles and output
explosions. Attribute lookup resolves selected/target tokens and repeating
sections (`$N` row index or RowID).

### 3. Roll-query engine

Parses `?{prompt}`, defaults, dropdown labels/values and nested queries. The UI
collects answers; the engine validates them and substitutes them once per unique
prompt. HTML entities inside queries are decoded once per query layer.

Data shape:

```ts
interface RollQuery {
  id: string;
  prompt: string;
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
  nested: RollQuery[];
}
```

### 4. Inline-roll engine

Parses `[[...]]` innermost-first, evaluates each expression through the dice
engine, assigns stable indexes and records:

```ts
interface InlineRollRecord {
  index: number;
  source: string;
  rawResult: number | number[];
  computedResult?: number;
  warnings: string[];
}
```

Supports `$[[n]]` and `$[[n.computed]]` with explicit missing-reference errors.

### 5. Roll-template engine

Parses `&{template:name}` plus `{{field=value}}` sections into structured
fields. Rules:

- leading spaces before a field name are invalid;
- the default template is built in;
- custom templates are registered by a sheet/pack;
- values may contain inline rolls and Markdown-lite;
- templates cannot be used with `/roll`;
- output is rendered from structured fields with escaping, not raw HTML.

### 6. Chat buttons and menus

Hyperlink-style buttons are parsed into actions:

```
[label](~ability)
[label](~selected|ability)
[label](`#macro)
[label](`/r d20+4)
```

A chat button has `label`, `actionKind`, `target` and `payload`. Actions are
dispatched through the same chat/roll pipeline with recursion/cycle checks.
Chat menus are templates whose fields contain buttons.

### 7. Tables, references and initiative

- Table rolls: `Nt[table]`, weighted entries, entry-level inline rolls.
- Roll references: stable per-message roll registry.
- Initiative: `&{tracker}`, `&{tracker:+}`, `&{tracker:-}` map to the app's
  combat/turn tracker.
- `&{noerror}` suppresses missing-attribute errors where the user permits it.

### 8. Visibility and delivery

Define explicit visibility modes:

| Mode     | Visible to                     |
| -------- | ------------------------------ |
| `public` | everyone in the session        |
| `gm`     | GM and roller                  |
| `self`   | roller only                    |
| `blind`  | GM only, roller sees no result |

The local app currently has no multi-user backend, so the first implementation
can store the mode with each message and enforce it in the UI. The model should
already support later transport without rewriting messages.

### 9. Message model

```ts
interface ChatMessage {
  id: string;
  authorId: string;
  speakerId?: string;
  kind: 'text' | 'emote' | 'roll' | 'template' | 'system';
  visibility: 'public' | 'gm' | 'self' | 'blind';
  raw: string;
  expanded: string;
  rendered: RenderedMessage;
  rolls: InlineRollRecord[];
  warnings: string[];
  createdAt: number;
}
```

`RenderedMessage` should be structured (template name, fields, buttons, text)
rather than an HTML string where possible.

## Separate parsers/engines

The following can share utilities but should not share one grammar:

| Parser/engine            | Responsibility                                                                  |
| ------------------------ | ------------------------------------------------------------------------------- |
| Chat command parser      | Slash commands, plain text, emotes, whispers, descriptions, hidden/GM messages  |
| Ability/macro parser     | `%{character\|ability}`, `#macro`, nested calls and chaining                    |
| Attribute parser         | `@{...}`, selected/target tokens, bars, `max`, repeating sections               |
| Roll-query parser        | `?{prompt}`, defaults, labelled dropdowns, nested queries, HTML-entity stacking |
| Inline-roll parser       | `[[...]]`, nesting, index assignment, roll-reference reuse                      |
| Dice notation parser     | delegated to the dice engine                                                    |
| Table-roll parser        | `Nt[table]`, weighted tables, entry-level rolls                                 |
| Roll-template parser     | `&{template:...}`, `{{field=value}}`, helpers/conditionals, leading-space rules |
| Chat-button parser       | `[label](~ability)`, embedded commands, API-style buttons and chat menus        |
| Roll-reference parser    | `$[[n]]`, `$[[n.computed]]`, cross-line/reuse rules                             |
| Formatting/entity parser | Markdown-lite, HTML entities, `%NEWLINE%`, images/links, final sanitisation     |

## Roll20 syntax details

### Macros, abilities and attributes

- Macros: `#macro-name`; calls may be nested or chained with `;`.
- Abilities: `%{character|ability}`; may be nested.
- Attributes: `@{character|attribute}`, `@{selected|attribute}`,
  `@{target|attribute}`, token bars (`bar1`–`bar3`) and optional `max`.
- Repeating sections: `@{selected|repeating_section_$N_field}` (row index) or
  RowID form. Row indexes start at 0.
- Attribute/ability/macro names are case-insensitive.
- An attribute containing a formula may return formula text; wrap it in an
  inline roll to force evaluation.
- Attributes/abilities/macros expand before roll queries. Do not HTML-escape
  characters inside `@{}`, `%{}` or `#macro` calls.
- Undefined calls are missing-data errors unless `&{noerror}` is present.

### Roll queries

- `?{Prompt}` asks for a value.
- `?{Prompt|Default}` supplies a default.
- `?{Prompt|Option1|Option2}` offers a dropdown.
- `?{Prompt|Label 1,value1|Label 2,value2}` separates label/value.
- Query defaults may contain inline rolls, e.g. `?{Dmg|[[1d8]]}`.
- Multiple independent queries are allowed; the same exact prompt is asked only
  once per message.
- Nested queries require HTML-entity escaping: `|`, `}`, `,` become `&#124;`,
  `&#125;`, `&#44;`; deeper levels stack the ampersand.
- Query nesting is limited to 99 levels; exceeding it is a syntax error.
- Answers must be validated against the query schema before evaluation.

### Inline rolls, labels and formatting

- Inline rolls: `[[expr]]`, evaluated deepest-first; chat display shows the
  total with a breakdown on hover.
- Inline labels: `[[3d6[fire]]]`; labels may contain attribute calls and
  Markdown-lite.
- Descriptive text after a roll is chat output, not dice notation. Escape
  leading formula characters when needed.
- Roll references: `$[[N]]`, `$[[N.computed]]`.
- `%NEWLINE%` inserts a line break; multiline chat is interpreted line by line.
- Markdown-lite emphasis, code, links and images are allowed in chat output.
- HTML entities are decoded inside queries and once at final output.

### Roll references and reuse

- Inline rolls receive stable indexes: `$[[0]]`, `$[[1]]`, ...
- `$[[0]]` resolves the first inline roll in the current message and cannot be
  placed inside another inline roll in normal Roll20 parsing.
- `$[[0.computed]]` refers to the computed/custom value and is less restrictive
  inside nested rolls.
- Cross-line reuse requires `%NEWLINE%` or roll-template fields.
- Missing indexes are missing-data errors.
- Keep raw, computed and rendered values for every index.

### Roll tables

- `Nt[table-name]` rolls N times; `t[table]` rolls once.
- Weights may be repeated entries or percentages totaling 100.
- Table entries may contain inline rolls, resolved after selection.
- Table references are extracted before evaluation.
- Inline-roll table syntax effectively rolls once per inline result in Roll20;
  return an array even when the UI collapses it.
- Table permissions and management UI are application concerns.

### Roll templates

- Syntax: `&{template:<name>} {{field=value}} {{field2=value}}`.
- The `default` template is always available; others come from sheet packs.
- Values may contain inline rolls, abilities, macros and Markdown-lite.
- Leading spaces inside `{{...}}` break parsing: `{{name=X}}` works,
  `{{ name=X}}` does not.
- Templates cannot be used with `/roll`; use them as ordinary chat output with
  inline rolls.
- Template fields should be structured for rendering, including conditional
  helpers (for example `rollGreater()` where supported).
- Rendering must not inject raw HTML without sanitisation.

### Roll options and chat commands

- Initiative: `&{tracker}`, `&{tracker:+}`, `&{tracker:-}` send or adjust a
  result in the turn tracker.
- Error suppression: `&{noerror}` downgrades missing data to empty values.
- `/r`/`/roll`: normal roll.
- `/gmroll`/`/gr`: visible to the roller and GM.
- `/w`: whisper; quote names with spaces.
- `/em`/`/me`: emote; `/ooc`/`/o`: out-of-character.
- `/desc`: GM description; `/as`/`/emas`: GM speech/emote as a named NPC.
- `/talktomyself`: locally suppress output; not a security boundary.
- `/fx`: visual effect command; outside the chat parser initially.
- A leading backtick escapes a command and prevents parsing.
- Markdown-lite is supported for emphasis, code, links and images.

### Chat buttons and menus

Buttons use hyperlink syntax:

```
[label](~ability)
[label](~selected|ability)
[label](`#macro)
[label](`/r d20+4)
```

- `~...` invokes an ability/sheet button.
- A backtick prefix invokes a saved macro or embedded roll command.
- Buttons are parsed into `{ label, actionKind, target, payload }` and dispatched
  through the same pipeline with recursion/cycle checks.
- Chat menus are templates whose fields contain buttons.
- API-style `!command` buttons are an extension registry, not arbitrary code.

### Hidden rolls and visibility

Roll20 has no simple player-hidden roll command; `/gmroll` is the closest normal
feature. Truly blind rolls rely on API scripts or UI tricks. This proposal uses
explicit visibility modes (`public`, `gm`, `self`, `blind`) instead of
reproducing that limitation, with enforcement at storage/render time.

## Feature phases

### Phase 1 — Local chat core

- Chat input and message history.
- Plain text, `/r`, `/em`, `/ooc`, leading-backtick escape.
- Dice-engine integration for ordinary rolls.
- Structured warnings and errors.

### Phase 2 — Reusable commands

- Macros stored locally.
- Character abilities and attributes.
- Expansion loop and recursion limits.
- `/w`, `/gmroll`, visibility metadata.
- Autocomplete for `#`, `%`, `@`.

### Phase 3 — Interactive rolls

- Roll queries with dropdowns and defaults.
- Inline rolls and `$[[n]]` references.
- Roll templates (default first).
- Chat buttons and chat menus.

### Phase 4 — Content and automation

- Roll tables and weighted entries.
- Initiative/turn-tracker integration.
- Hidden/blind messages.
- Custom roll parsing extension point.
- Optional API-command-style plugin registry.

### Phase 5 — Character-sheet integration

- Attribute and ability storage attached to characters.
- Repeating sections.
- Sheet-defined roll templates.
- Import/export of macro packs and templates.

## Security and limits

- Expansion depth: 99.
- Query depth: 99.
- Inline-roll nesting: bounded with cycle detection.
- Total output size and total pass time bounded.
- HTML/Markdown sanitisation with an allow-list.
- No arbitrary JavaScript or remote HTML execution from macros.
- Visibility enforced when storing and rendering messages, not only in CSS.
- `&{noerror}` must be explicit; it must not hide corruption.

## Data ownership

| Data              | Proposed owner                              |
| ----------------- | ------------------------------------------- |
| Chat messages     | new local `chat` store                      |
| Macros            | new `macros` store                          |
| Roll templates    | new `rollTemplates` store or pack data      |
| Roll tables       | new `rollTables` store                      |
| Character attrs   | existing character records or a child store |
| Abilities         | character records or a child store          |
| Token selection   | transient UI state                          |
| Initiative result | existing combat/turn-tracker store          |

Keep macros/templates exportable so a campaign can be moved between local
backups.

## UI proposal

- Bottom chat drawer/panel with message history and input.
- Command hints while typing (`/`, `#`, `@`, `%`).
- Query prompt dialog with validation.
- Template renderer using Vue components for fields and buttons.
- Visibility selector for public/GM/self/blind.
- "Roll again" and "copy macro" actions.
- Chat archive search/filter; storage limits communicated to the user.

## Testing strategy

- Golden tests for the 12-step order of operations.
- Expansion-cycle and depth-limit tests.
- Query extraction/prompt/substitution tests.
- Inline index/reference tests (including `.computed`).
- Template field and leading-space tests.
- Button dispatch/cycle tests.
- Visibility/permission tests.
- Sanitiser tests with malicious HTML/Markdown.
- End-to-end tests from a raw message to structured rendered output.

## Deferred gaps

These are intentionally deferred. They must not block the first local chat
implementation, and no later phase should assume they are already solved.

### 1. Chat identity and permission model

- **Status:** deferred until the transport/identity decision.
- **Open:** single-user local history vs. multi-user sessions, GM role, player
  identity, whisper targets, blind rolls and message retention.
- **First-phase rule:** store visibility metadata on each message, but do not
  implement real GM/whisper/blind behavior until the identity model is settled.
  Unsupported modes must fail explicitly, not silently leak content.

### 2. Token and attribute model

- **Status:** deferred until the token/tabletop model is defined.
- **Open:** selected/target tokens, bars, default tokens, linked characters,
  attributes/abilities storage and repeating sections.
- **First-phase rule:** the chat engine may use a local character/attribute
  adapter, but must not assume a canvas/token system exists. Selected/target
  token calls should return a clear unsupported/missing-data error until the
  model is defined.

## Open questions

1. Which Roll20-specific quirks should be preserved for compatibility, and which
   should be replaced by clearer behavior?
2. Should custom roll parsing be exposed to users, or reserved for built-in
   sheet integrations?
3. Should chat menus use Roll20's hyperlink syntax or a safer first-class button
   model with optional Roll20 import?
4. How much of Roll20's HTML/Markdown formatting should be allowed in a local
   app with no server-side sanitisation?

## References

- [Text Chat](https://wiki.roll20.net/Text_Chat)
- [Complete Guide to Macros & Rolls](https://wiki.roll20.net/Complete_Guide_to_Macros_%26_Rolls)
- [Macros](https://wiki.roll20.net/Macros)
- [Roll Query](https://wiki.roll20.net/Roll_Query)
- [Inline Rolls](https://wiki.roll20.net/Inline_Rolls)
- [Reusing Rolls](https://wiki.roll20.net/Reusing_Rolls)
- [Roll Templates](https://wiki.roll20.net/Roll_Templates)
- [Roll Table](https://wiki.roll20.net/Roll_Table)
- [Macros/Formatting](https://wiki.roll20.net/Macros/Formatting)
- [HTML Entities](https://wiki.roll20.net/HTML_Entities)
- [Chat Menus](https://wiki.roll20.net/Chat_Menus)
- [Hidden Rolls](https://wiki.roll20.net/Hidden_Rolls)
- [Button](https://wiki.roll20.net/Button)
- [Link Token](https://wiki.roll20.net/Link_Token)
- [Character attributes](https://wiki.roll20.net/Character#Attributes)
- [Order of Operations](https://wiki.roll20.net/Order_of_Operations)
- [Macros/Initiative](https://wiki.roll20.net/Macros/Initiative)
