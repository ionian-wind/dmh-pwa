# Roll20-Style Chat Engine

> **Status: proposal — not implemented.** The chat engine sits around the roll
> engine. Roll syntax and evaluation are specified in
> [plans/dice-roller.md](../plans/dice-roller.md); this document covers commands,
> UI, rendering, delivery and chat-specific behavior.

## Why a separate document

The roll engine parses and evaluates dice, macros, abilities, attributes, roll
queries, inline rolls, labels and tables. The chat engine handles what happens
around that:

- chat commands and message kinds;
- prompt UI for roll queries and ability/attribute selection;
- message rendering, roll templates and clickable buttons;
- recipients, visibility and chat history;
- integration with the app's combat/turn tracker.

Keeping these separate prevents the parser/evaluator from depending on Vue,
chat state or a specific prompt UX.

## Goals

- Accept a chat message and determine its command/message type.
- Send roll expressions to the engine, collect query answers, and render the
  resulting `RollResult`.
- Provide UI for roll queries and ability/attribute calls in later steps.
- Render roll templates, chat cards and clickable buttons.
- Deliver messages to public, GM, self or blind recipients.
- Keep chat history, macros and message metadata local-first.
- Expose chat extensions without executing arbitrary code.

## Non-goals

- Parsing dice/macros/queries/inline rolls; the roll engine owns that.
- Reproducing the Roll20 VTT, canvas, dynamic lighting or marketplace.
- Arbitrary JavaScript or server-side API scripts.
- Full Roll20 character-sheet HTML/CSS compatibility.
- Multi-user transport in the first phase.

## Boundary with the roll engine

| Concern                                                      | Owner             |
| ------------------------------------------------------------ | ----------------- |
| Dice, modifiers, arithmetic, groups                          | roll engine       |
| Macro/ability/attribute syntax and async resolution          | roll engine       |
| Roll-query extraction, validation and substitution           | roll engine       |
| Inline rolls, labels, references and table syntax/evaluation | roll engine       |
| Roll result total and process metadata                       | roll engine       |
| Chat commands and message kinds                              | chat engine       |
| Roll-query prompt UI and ability/attribute selectors         | chat engine       |
| Roll templates, chat cards, buttons and menus                | chat engine       |
| Delivery, visibility, history and permissions                | chat engine       |
| Macro library/editor                                         | separate proposal |

The chat engine must not duplicate roll syntax or evaluation. It should call the
engine's `extract()` and `roll()` APIs and render the returned metadata.

## Chat command parser

Detects the message kind and command before passing the payload to the engine:

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

Rules:

- A leading backtick escapes the command; do not parse the payload.
- Multiline input is processed line by line.
- The parser returns `{ kind, command, payload, visibility, target }`.
- Plain text and command output use the same message store.
- Unknown commands produce a typed chat error, not a silent plain-text fallback.

## Message model

```ts
interface ChatMessage {
  id: string;
  authorId: string;
  speakerId?: string;
  kind: 'text' | 'emote' | 'roll' | 'template' | 'system';
  visibility: 'public' | 'gm' | 'self' | 'blind';
  raw: string;
  rendered: RenderedMessage;
  rollResultId?: string;
  warnings: string[];
  createdAt: number;
}

interface RenderedMessage {
  text?: string;
  template?: { name: string; fields: TemplateField[] };
  roll?: RollResult;
  buttons?: ChatButton[];
  attachments?: MessageAttachment[];
}
```

The roll engine's `RollResult` keeps the full process metadata. The chat message
stores a reference/id (or embedded snapshot) so history and re-rendering do not
re-evaluate the roll.

## Roll-query UI — next steps

The engine owns query syntax, extraction and substitution. Chat owns the prompt:

1. call `engine.extract(payload)`;
2. present query requests (text field, dropdown, defaults, labels);
3. validate the answers;
4. call `engine.roll(payload, { queryAnswers })`.

Deferred decisions:

- modal vs inline form vs chat composer;
- multiple queries in one message;
- cancel/retry behavior;
- remembering answers per session;
- localization of prompt text.

No query parser is implemented in the chat layer.

## Ability and attribute UI — next steps

The engine resolves macros, abilities and attributes through async repositories.
Chat may provide pickers for:

- selected target/token;
- character and ability selection;
- attribute or repeating-row selection;
- missing-data recovery when an ability/attribute is absent.

The engine returns explicit missing-data errors; chat decides whether to prompt,
cancel or show an unsupported message. The first chat phase may use a local
character/attribute adapter with no token UI.

## Roll templates

Roll templates are a chat rendering feature:

- syntax: `&{template:<name>} {{field=value}} {{field2=value}}`;
- the `default` template is built in;
- custom templates are registered by packs or sheets;
- values may contain inline rolls, which the roll engine resolves;
- leading spaces inside `{{...}}` are invalid;
- templates cannot be used with `/roll`;
- fields render through structured Vue components, not raw HTML;
- conditional helpers (for example `rollGreater()`) are evaluated at render
  time against roll metadata.

The template renderer consumes `RollResult` metadata. It must not re-roll.

## Chat buttons and menus

Buttons are chat UI actions:

```
[label](~ability)
[label](~selected|ability)
[label](`#macro)
[label](`/r d20+4)
```

- Buttons parse into `{ label, actionKind, target, payload }`.
- Actions dispatch through the chat command pipeline with cycle/recursion checks.
- Chat menus are templates whose fields contain buttons.
- API-style `!command` buttons use an extension registry, not arbitrary code.
- Buttons must be safe against crafted labels/payloads and must respect the
  message's visibility.

## Initiative integration

The roll engine exposes `&{tracker}`, `&{tracker:+}` and `&{tracker:-}` as roll
options/metadata. Chat integrates them with the app's combat tracker:

- `tracker` writes the result to the selected combatant/token;
- `tracker:+`/`tracker:-` adjust the current value;
- if no target exists, the chat shows a missing-target error;
- the tracker update is an application action, not part of roll evaluation.

## Visibility and delivery

Explicit visibility modes:

| Mode     | Visible to                     |
| -------- | ------------------------------ |
| `public` | everyone in the session        |
| `gm`     | GM and roller                  |
| `self`   | roller only                    |
| `blind`  | GM only; roller sees no result |

The first local version stores visibility with each message and enforces it in
the UI. The model should support later transport without rewriting messages.
Hidden/blind behavior must be enforced at storage/render time, not hidden with
CSS.

## Chat history

- Persist messages independently of roll snapshots.
- Keep enough metadata to re-render rolls after reload.
- Support filtering by author, kind, visibility and date.
- Define retention and size limits before storing large roll breakdowns.
- Provide clear/export actions with confirmation.

## Macro library/editor

A macro library and editor is proposed separately in
[macro-library-editor.md](macro-library-editor.md). It uses the shared `@editora/light-code-editor` integration for syntax
highlighting/completions and the roll engine's parser/AST for diagnostics. It is
not part of the chat message pipeline.

## Feature phases

### Phase 1 — Local chat core

- Chat input and message history.
- Plain text, `/r`, `/em`, `/ooc`, leading-backtick escape.
- Call the roll engine for rolls; render result/warnings.
- Basic visibility metadata only.

### Phase 2 — Reusable commands

- `/w`, `/gmroll`, `/talktomyself`, `/desc`, `/as`, `/emas`.
- Message visibility enforcement in the local UI.
- Macro quick access/history.
- Autocomplete for `#`, `@`, `%` where the roll engine's repositories are
  available.

### Phase 3 — Interactive rolls

- Roll-query prompt UI.
- Ability/attribute selection UI.
- Roll templates and structured renderers.
- Chat buttons and chat menus.

### Phase 4 — Content and automation

- Roll tables management UI.
- Initiative/turn-tracker integration.
- Hidden/blind modes.
- Chat archive search/filter/export.

### Phase 5 — Character-sheet integration

- Character/ability/attribute editors backed by the async repositories.
- Repeating sections and sheet-defined templates.
- Import/export of macro packs and templates.

## Security and limits

- Sanitize rendered Markdown/HTML with an allow-list.
- Never execute arbitrary JavaScript or remote HTML from a macro.
- Bound expansion/query/inline/roll work in the engine; chat adds UI timeouts.
- Enforce visibility when storing/rendering, not only in CSS.
- Validate button payloads and query answers.
- `&{noerror}` must be explicit and must not hide corruption.

## Data ownership

| Data              | Proposed owner                            |
| ----------------- | ----------------------------------------- |
| Chat messages     | new local `chat` store                    |
| Macro definitions | `macros` store, exposed as repository     |
| Roll templates    | `rollTemplates` store or pack data        |
| Roll tables       | `rollTables` store, exposed as repository |
| Character attrs   | character records or child store          |
| Abilities         | character records or child store          |
| Token selection   | deferred                                  |
| Initiative result | existing combat/turn-tracker store        |

## UI proposal

- Bottom chat drawer/panel with history and composer.
- Command hints while typing (`/`, `#`, `@`, `%`).
- Query prompt dialog with labels/defaults/validation.
- Ability/attribute picker for ambiguous calls.
- Template renderer with structured fields and buttons.
- Visibility selector for public/GM/self/blind.
- "Roll again", "copy macro" and "view breakdown" actions.
- Chat archive search/filter.

## Testing strategy

- Command parsing and message-kind tests.
- Query prompt/answer substitution tests (UI + engine integration).
- Ability/attribute picker and missing-data UX tests.
- Template rendering with roll metadata.
- Button dispatch/cycle/visibility tests.
- Chat history persistence and re-render tests.
- Sanitizer and visibility-leak tests.
- End-to-end raw message -> engine extraction -> UI prompt -> rendered message.

## Remaining gaps

### P0 — chat contracts

- **Chat identity and permissions — deferred.** Decide single-user vs.
  multi-user, GM role, player identity, whisper targets, blind rolls and
  retention. First phase may store visibility metadata but must not implement
  real GM/whisper/blind behavior; unsupported modes must fail explicitly.
- **Token/attribute model — deferred.** Define selected/target tokens, bars,
  default tokens, linked characters, abilities/attributes storage and repeating
  sections. First phase may use a local repository adapter but must return a
  clear unsupported/missing-data error for token calls.
- Freeze the chat message store schema, roll snapshot reference shape and
  retention/size policy.
- Define the query-prompt contract: how engine `RollQueryRequest[]` maps to
  fields, validation, cancel/retry and answer collection.
- Define the ability/attribute selector contract and missing-data recovery UX.
- Define the chat-command dispatch adapter and how command errors map to
  messages.

### P1 — chat features

- Define roll-template field/conditional/helper rendering and template
  registration/import.
- Define safe chat-button/chat-menu dispatch, recursion limits and payload
  validation.
- Specify command semantics and localization for `/w`, `/gmroll`,
  `/talktomyself`, `/desc`, `/as`, `/emas` and `/fx`.
- Map `&{tracker}` metadata to the combat tracker.
- Specify chat history/search/export/re-render and retention behavior.
- Define macro quick access/autocomplete and import behavior.
- Decide the composer/query-prompt UI: modal vs inline vs in-composer.
- Define the visibility selector and GM/self/blind UI behavior.

### P2 — quality and delivery

- Define the chat sanitization threat model and allow-list.
- Define accessibility, reduced-motion and keyboard flows.
- Set chat history/performance targets and large-message limits.
- Add end-to-end tests and per-phase acceptance criteria.
- Decide whether/when multi-user transport is implemented.

## Open questions

1. Which Roll20 chat quirks should be preserved, and which should be replaced?
2. Should chat menus use Roll20 hyperlink syntax or a safer first-class button
   model with optional Roll20 import?
3. How much Markdown/HTML formatting should be allowed in a local app?
4. Should query answers be remembered per session or per roll?
5. Should chat history keep embedded roll snapshots or references only?

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
