# Inline Rolls Plugin

This plugin adds support for inline rolls (`[[...]]`) in dice notation expressions. It extracts inline roll nodes from the AST and provides evaluation hooks for resolving and referencing inline roll results.

## Features

- Recognizes inline roll syntax: `[[...]]`
- Extracts inline roll nodes for evaluation and result referencing
- Evaluates inline rolls in correct order (deepest first)
- Supports referencing inline roll results via `$[[N]]`

## API

- `extractRolls(ast)`: Returns inline roll nodes from the AST.
- `evaluateRollReference(node, context)`: Evaluates an inline roll node and stores/retrieves its result for referencing.

## Extension

- Register new inline roll node types or expansion rules by extending this plugin.

## Example

```
[[1d20+5]]
[[2d6+3]] + 1
?{Dmg|[[1d8]]}
$[[0]]+2
```
