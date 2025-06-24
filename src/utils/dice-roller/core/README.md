# Dice Roller Core Engine

This is the core of the modular dice notation parser/evaluator. It provides the infrastructure for parsing, AST management, evaluation orchestration, and plugin registration, but does not implement any dice, macro, table, or formatting logic directly.

## Responsibilities
- Plugin registration and management
- Exposing the main API: `parseInput`, `evaluate`, `registerPlugin`
- Providing the base parser (using Chevrotain) and AST structure
- Orchestrating evaluation and delegating to plugins for specific node types

## Not Included
- Dice rolling, macros, tables, roll queries, or formatting — these are implemented as plugins in their own subdirectories.

## API
- `parseInput(input: string): ASTNode` — Parses a dice notation string into an AST.
- `evaluate(ast: ASTNode, context: EvaluationContext): any` — Evaluates an AST with the provided context (macros, tables, rolls, user input, etc.).
- `registerPlugin(plugin: DiceRollerPlugin)` — Registers a plugin with the core engine.

## Usage Example
```ts
import { DiceRollerCore } from './core';
import { dicePlugin } from '../plugins/dice';

// Register plugins
DiceRollerCore.registerPlugin(dicePlugin);

// Parse input
const ast = DiceRollerCore.parseInput('2d6+3');

// Evaluate
const result = DiceRollerCore.evaluate(ast, {});
console.log(result);
```

See the plugins for actual dice, macro, table, and formatting support. 