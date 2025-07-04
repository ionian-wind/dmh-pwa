# Macros Plugin

This plugin adds support for macros in the modular dice roller system.

## Features

- Recognizes macro calls (e.g., `#attack`)
- Extracts macro names for expansion
- Evaluates macro calls by replacing them with their definitions (AST), up to a configurable nesting limit
- Handles errors for missing macros, recursion limits, and invalid macro names

## Usage

- Use `#macro_name` in dice expressions to reference a macro
- Macros are expanded before dice rolling and math evaluation

## Spec Coverage

- Macro calls: `#attack`, `#macro1; #macro2`
- Macro nesting and chaining
- Error handling for missing macros and recursion depth

## Example

```
#attack
#damage
#macro1; #macro2
```

See the main dice notation spec for details.

## API

- `extractMacros(ast)`: Returns macro names referenced in the AST.
- `evaluateMacro(node, context)`: Expands macro nodes using the provided macro map.

## Extension

- Register new macro node types or expansion rules by extending this plugin.
