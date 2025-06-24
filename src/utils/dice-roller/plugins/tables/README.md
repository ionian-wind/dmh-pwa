# Tables Plugin

This plugin adds support for table rolls in the modular dice roller system.

## Features
- Recognizes table rolls (e.g., `1t[table-name]`)
- Extracts table names for lookup
- Evaluates table rolls by selecting random entries, supports multiple rolls
- Handles errors for missing tables, invalid table names, and invalid roll counts

## Usage
- Use `Nt[table-name]` in dice expressions to roll N times on a table
- Tables can have weighted entries for different probabilities
- Table rolls are resolved before dice rolling and math evaluation

## Spec Coverage
- Table rolls: `1t[loot-table]`, `2t[loot-table]`
- Multiple rolls on tables
- Weighted table entries
- Error handling for missing tables and invalid syntax

## Example
```
1t[loot-table]
2t[encounter-table]
1t[treasure-table] + 1d6
```

## Table Data Format
Tables should be provided as arrays of entries, optionally with weights:
```javascript
{
  "loot-table": [
    "Sword",
    "Sword", // Weighted (appears twice as often)
    "Shield",
    "Potion"
  ]
}
```

See the main dice notation spec for details.

## API
- `extractTables(ast)`: Returns table names referenced in the AST.
- `evaluateTable(node, context)`: Expands table roll nodes using the provided table map.

## Extension
- Register new table node types or expansion rules by extending this plugin. 