# Formatting Plugin

This plugin adds support for output formatting and markup (e.g., %NEWLINE%) in dice notation expressions. It extracts formatting info from the AST and provides evaluation hooks for formatting.

## API

- `extractFormatting(ast)`: Returns formatting nodes or info from the AST.
- `evaluateFormatting(node, context)`: Applies formatting to output.

## Extension

- Register new formatting node types or markup rules by extending this plugin.
