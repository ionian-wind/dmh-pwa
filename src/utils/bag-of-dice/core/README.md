# Bag of Dice Core (Custom Tokenizer)

This directory contains the core infrastructure for the new plugin-based dice notation engine, replacing Chevrotain with a custom tokenizer and parser.

## Tokenizer

- **TokenDef**: Plugins define their own token types using this interface.
  - `name`: Unique name for the token (e.g., 'Plus', 'Number', 'D', etc.)
  - `pattern`: RegExp (with sticky flag `/y`) to match the token at the current position
  - `plugin`: Name of the plugin that owns this token
  - `value?`: Optional function to post-process the match (e.g., parse numbers)
  - `priority?`: Optional integer; higher priority tokens are matched first

- **Token**: The output of the tokenizer for each matched token.
  - `type`: Token name
  - `value`: Matched value (string or processed)
  - `plugin`: Plugin that owns the token
  - `start`, `end`: Character offsets in the input

- **createTokenizer(tokenDefs)**: Returns a function that tokenizes input using all provided token definitions, matching the longest and highest-priority token at each position.

## Plugin API (Tokenization)

Each plugin should export an array of `TokenDef` objects describing its syntax. Example for arithmetic:

```ts
export const arithmeticTokenDefs: TokenDef[] = [
  { name: 'Plus', pattern: /\+/y, plugin: 'arithmetic' },
  { name: 'Minus', pattern: /-/y, plugin: 'arithmetic' },
  { name: 'Number', pattern: /[0-9]+(?:\.[0-9]+)?/y, plugin: 'arithmetic', value: m => parseFloat(m[0]) },
  // ...
];
```

The core will merge all plugin token definitions, sort by priority and length, and use them to tokenize input.

## Next Steps
- Implement token definitions for all plugins (arithmetic, dice, tables, roll-queries, etc.)
- Build a recursive-descent parser that walks the token stream and delegates to plugins for their constructs.
- Port plugin parse logic from Chevrotain to the new system. 