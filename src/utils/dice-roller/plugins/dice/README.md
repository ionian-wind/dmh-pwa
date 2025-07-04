# Dice Plugin

This plugin adds support for parsing and evaluating dice expressions to the dice-roller core engine.

## Purpose

- Parses dice expressions (e.g., `2d6+3`, `4d6kh3`, `1d10!>8`, etc.)
- Handles all dice modifiers, explosion rules, and limits (including the 99-roll explosion cap)
- Registers tokens, grammar, and AST node types for dice expressions
- Evaluates dice rolls and integrates with the core evaluation pipeline

## How It Works

- Extends the core parser with dice-specific tokens and grammar rules
- Adds AST node types for dice expressions and modifiers
- Implements evaluation logic for rolling dice, applying modifiers, and enforcing explosion limits

## Usage

- Register the plugin with the core engine:
  ```ts
  import { DiceRollerCore } from '../../core';
  import { dicePlugin } from './dicePlugin';
  DiceRollerCore.registerPlugin(dicePlugin);
  ```
- After registration, the core can parse and evaluate dice expressions.

## Extending

- Add new dice modifiers or mechanics by extending the plugin's grammar and evaluation logic.
- See the plugin source for extension points.
