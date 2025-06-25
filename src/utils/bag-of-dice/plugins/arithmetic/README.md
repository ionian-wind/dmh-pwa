# Arithmetic Plugin

This plugin provides support for arithmetic operations and math functions in the Bag of Dice parser.

## Features
- Recognizes and parses arithmetic expressions: `+`, `-`, `*`, `/`, `%`, `**`
- Supports grouping with parentheses: `(...)`
- Supports math functions: `floor(x)`, `ceil(x)`, `round(x)`, `abs(x)`
- Handles order of operations as specified in the dice notation spec
- Evaluates arithmetic expressions and functions
- Acts as the fallback for unhandled nodes in the AST

## Integration
- The arithmetic plugin is always loaded last by the core engine
- It provides token definitions, grammar rules, and evaluation logic for arithmetic
- Other plugins may delegate arithmetic sub-expressions to this plugin

## Development
- All code is written in TypeScript
- Tests are located in the `__tests__/` subdirectory
- Debug logs are included during development 