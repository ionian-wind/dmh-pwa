# Roll Queries Plugin

This plugin adds support for roll queries (user prompts) in dice notation expressions. It extracts roll query schemas from the AST and provides evaluation hooks for query expansion.

## API
- `extractQueries(ast)`: Returns roll query schemas (prompt, options, defaults).
- `evaluateRollQuery(node, context)`: Substitutes user input into the AST.

## Extension
- Register new roll query node types or prompt logic by extending this plugin. 