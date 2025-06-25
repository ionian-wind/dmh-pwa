# Bag of Dice Parser

This directory contains a modular, plugin-based dice notation parser and evaluator, designed to support the full dice notation specification described in `dice_notation.md`.

## Architecture
- **Core Engine:** Manages parsing, evaluation, plugin loading, and error handling.
- **Plugins:** Each major feature (arithmetic, dice, macros, roll queries, tables, etc.) is implemented as a dedicated plugin in its own subdirectory under `plugins/`.
- **Extensibility:** New features can be added as plugins. Shared utilities should be placed in a `lib/` subdirectory.
- **Testing:** All code is written in TypeScript and tested with Vitest. Tests are located in `__tests__/`.

## Development Guidelines
- Use `chevrotain` for parsing.
- Each plugin encapsulates its own syntax, parsing, evaluation, and extraction logic.
- Core engine delegates parsing and evaluation to plugins in the order they are loaded (arithmetic plugin is always last).
- Extract shared code to `lib/` for reuse.
- Add debug logs during development.
- Ensure all new code is covered by tests. Run tests after every change.
- Use `import` statements (not `require`).

## Source of Truth
- `dice_notation.md` — Dice notation specification
- `requirements_for_proposal.md` — Architectural and functional requirements
- `dice_notation_proposal_2.md` — Implementation proposal

---

For more details, see the above documents and the code in this directory. 