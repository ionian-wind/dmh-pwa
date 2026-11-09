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

## Open questions

1. Should the first chat engine support multiple users/transport, or only local
   single-user history with visibility metadata?
2. Should character attributes/abilities be first-class child records or embedded
   arrays on the character?
3. Which Roll20-specific quirks should be preserved for compatibility, and which
   should be replaced by clearer behavior?
4. Should custom roll parsing be exposed to users, or reserved for built-in
   sheet integrations?
5. Should chat menus use Roll20's hyperlink syntax or a safer first-class button
   model with optional Roll20 import?
6. How much of Roll20's HTML/Markdown formatting should be allowed in a local
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
