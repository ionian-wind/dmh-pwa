# Roll References Plugin

This plugin adds support for referencing previous roll results in dice notation expressions. It extracts roll references from the AST and provides evaluation hooks for roll reference expansion.

## API
- `extractRolls(ast)`: Returns roll reference IDs from the AST.
- `evaluateRollReference(node, context)`: Substitutes roll results from the roll map.

## Extension
- Register new roll reference node types or expansion rules by extending this plugin. 