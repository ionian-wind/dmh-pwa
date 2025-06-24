# Dice Roller Library

This library provides a modular, extensible dice notation parser and evaluator for tabletop RPGs, based on a superset of Roll20's dice syntax. It is implemented in TypeScript using [Chevrotain](https://github.com/Chevrotain/chevrotain) for parsing.

## Architecture
- **Core Engine:** Handles parsing, AST generation, and evaluation orchestration.
- **Plugins:** Each major feature (macros, roll queries, tables, formatting, etc.) is implemented as a plugin in its own subdirectory. Plugins can register new AST node types, extraction logic, and evaluation rules.
- **Extensibility:** The system is designed to be extended with new plugins for additional dice mechanics, formatting, or integration with external systems.

## Features
- Full support for Roll20 dice syntax, plus extensions (macros with arguments, advanced table rolls, etc.)
- Multi-step evaluation pipeline (parse, extract, evaluate)
- Robust error and warning handling
- Modular, plugin-based design

## Usage
1. **Parsing:** Use the core parser to convert a dice notation string into an AST.
2. **Extraction:** Use extraction utilities to gather roll queries, macros, tables, and roll references from the AST.
3. **Evaluation:** Provide user input, macro/table/roll data, and evaluate the AST to get the final result.

## Extending
- Add new plugins by creating a subdirectory and registering new AST node types and evaluation logic.
- See the `plugins/` subdirectories for examples.

## Tests
- Tests are located in the `__tests__/` subdirectory. Run tests with your preferred test runner (e.g., Jest).

---

For detailed API documentation and examples, see the files in this directory and the plugin subdirectories. 