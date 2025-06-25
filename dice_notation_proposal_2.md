# Dice Notation Parser/Evaluator Proposal (Modular, Plugin-Based)

## Overview

This proposal describes a modular, extensible dice notation engine designed to parse, analyze, and evaluate complex dice expressions as specified in the provided dice notation document. The system is built around a core engine and a plugin architecture, allowing each major feature (arithmetic, dice, roll queries, tables, etc.) to be implemented as a dedicated plugin. The engine supports robust error handling, custom RNG injection, and stepwise evaluation, and is designed for easy extension and independent development of new features.

---

## 1. Core Architecture

### 1.1. Core Engine
- **Responsibilities:**
  - Manages the parsing and evaluation pipeline.
  - Loads and orders plugins.
  - Provides error and warning handling.
  - Exposes the main API: `parse`, `evaluate`, and extraction utilities.
  - Handles default arithmetic operations as a built-in plugin (loaded last).
  - Allows injection of a custom RNG function.

### 1.2. Plugin System
- **Plugin Interface:**
  - Each plugin encapsulates:
    - Syntax extension (tokenization/grammar rules)
    - AST node types and parse logic
    - Evaluation logic for its node types
    - Extraction utilities (e.g., extract queries/tables/rolls)
    - Validation and error reporting for its domain
  - Plugins are registered in a specific order; core arithmetic plugin is always last.
  - Plugins can be developed and loaded independently.

---

## 2. Parsing and AST Generation

### 2.1. `parse(text, plugins)`
- Accepts input text and a list of plugins.
- Each plugin contributes to the syntax/grammar rules.
- The parser builds a unified AST representing the input expression.
- If invalid syntax is encountered, a syntax exception is thrown.
- Returns the AST for later analysis and evaluation.

### 2.2. AST Structure
- AST nodes are typed and may be tagged with the responsible plugin.
- Nodes include source location for error reporting.
- Plugins define their own node types and attach them to the AST.

---

## 3. Extraction Utilities

- Each extraction utility is implemented and owned by its corresponding plugin. The core engine coordinates extraction by delegating to the appropriate plugin for each type of entity (queries, tables, rolls).

### 3.1. `extractQueries(ast, plugins)`
- Traverses the AST, collecting all roll query nodes.
- Returns a list of schemas describing required user input for each query.

### 3.2. `extractTables(ast, plugins)`
- Traverses the AST, collecting all table roll references.
- Returns a list of table names.

### 3.3. `extractRolls(ast, plugins)`
- Traverses the AST, collecting all roll result references.
- Returns a list of roll result IDs.

---

## 4. Evaluation Pipeline

### 4.1. `evaluate(ast, options)`
- Accepts:
  - The AST
  - User-provided data for roll queries
  - Table data map
  - Roll result map
  - RNG function (optional, defaults to secure random)
  - Plugins (in order)
- Steps:
  1. **Roll Query Expansion:**
     - Replace roll query nodes with user-provided values, up to the roll query nesting limit.
     - Validate user input against schemas; throw validation exception on error.
  2. **Inline Roll Evaluation:**
     - Evaluate nested inline rolls, deepest first, substituting results into the AST.
  3. **Dice Roll Evaluation:**
     - Evaluate dice nodes, using the RNG function, applying all dice modifiers and plugin logic.
     - Enforce dice explosion and reroll limits; add warnings if limits are reached.
  4. **Function and Arithmetic Evaluation:**
     - Evaluate math functions and arithmetic, observing order of operations.
     - The arithmetic plugin is always called last.
  5. **Table Roll Evaluation:**
     - Resolve table roll nodes using provided table data.
  6. **Roll Result Reference Resolution:**
     - Substitute roll result references with values from the roll result map; throw missing data exception if not found.
  7. **Formatting and Output:**
     - Apply formatting markup; throw syntax exception on invalid markup.
- Returns:
  - The final result value
  - Any warnings (e.g., explosion limit reached)
  - Optionally, a formatted output string

---

## 5. Error and Warning Handling

- **Syntax Exception:** Thrown for invalid syntax, including invalid markup.
- **Validation Exception:** Thrown for invalid user input in roll queries.
- **Missing Data Exception:** Thrown for missing tables or roll results.
- **Nesting Limit Exception:** Thrown if roll query nesting exceeds the allowed depth.
- **Warning List:** Returned with evaluation result for non-fatal issues (e.g., dice explosion limit reached).

---

## 6. RNG and Determinism

- The core engine uses a secure random number generator by default.
- The RNG function can be overridden (e.g., for deterministic testing or seeding).
- All dice plugins use the provided RNG for randomization.

---

## 7. Modularity and Extensibility

- Each major feature (roll queries, dice, tables, arithmetic, etc.) is implemented as a plugin.
- Plugins are responsible for their own syntax, parsing, evaluation, and extraction logic.
- New features can be added by developing new plugins and registering them with the core engine.
- The core engine is agnostic to plugin internals, only requiring that plugins conform to the interface.
- The arithmetic plugin is always loaded last and provides fallback for basic math operations.

---

## 8. Example Plugin Responsibilities

- **Dice Plugin:**
  - Recognizes dice expressions, modifiers, and custom dice.
  - Handles dice rolling, explosion, reroll, keep/drop, etc.
  - Enforces explosion/reroll limits and issues warnings.
- **Roll Queries Plugin:**
  - Recognizes roll query syntax.
  - Extracts and validates user input.
  - Handles query expansion and nesting limits.
- **Tables Plugin:**
  - Recognizes table roll syntax.
  - Handles table lookup and weighted selection.
- **Arithmetic Plugin (Core):**
  - Recognizes and evaluates arithmetic and math functions.
  - Handles order of operations and fallback for unhandled nodes.

---

## 9. Summary

This architecture provides a robust, extensible, and testable foundation for a dice notation engine. By isolating each feature in a plugin, the system can be developed, tested, and extended incrementally. The core engine coordinates parsing, extraction, and evaluation, while plugins encapsulate all domain-specific logic. Strict error handling and custom RNG support ensure reliability and flexibility for a wide range of use cases. 