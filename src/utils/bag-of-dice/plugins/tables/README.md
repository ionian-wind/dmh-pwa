# Tables Plugin

This plugin provides support for table rolls in the Bag of Dice parser/evaluator.

## Responsibilities
- Recognize and parse table roll syntax (e.g., `1t[loot-table]`, `2t[magic-items]`)
- Build CST and AST nodes for table rolls
- Provide CST-to-AST and AST-to-CST handler maps
- Extraction utility: `extractTables(ast)` to collect all table roll nodes and return referenced table names
- Evaluation logic: resolve table rolls using provided table data, handle weights and ranges

## Supported Syntax
- Table roll: `Nt[table-name]` (e.g., `1t[loot-table]`, `2t[magic-items]`)
- Weighted entries: handled at evaluation time
- Table ranges: handled at evaluation time
- Expressions as N: support for computed roll counts (e.g., `(1+1)t[loot-table]`)

## Integration
- The plugin exposes its tokens, grammar rules, CST/AST handlers, extraction, and evaluation logic to the core engine
- The core engine delegates table extraction and evaluation to this plugin

## Main Files
- `tokens.ts`: Chevrotain token definitions for tables
- `parser.ts`: Chevrotain grammar for tables
- `converters.ts`: CST-to-AST and AST-to-CST handler maps
- `extract.ts`: Extraction utility for tables
- `evaluator.ts`: Evaluation logic for tables
- `README.md`: This file
- `__tests__/tables.test.ts`: Vitest tests for the plugin 