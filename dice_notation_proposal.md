# Dice Notation Parser/Evaluator Proposal

## Overview
This proposal outlines a modular, extensible system for parsing and evaluating dice notation expressions as described in the provided specification. The system is designed to support all features of the spec, including macros, roll queries, table rolls, roll history references, and formatting, while ensuring robust error handling and clear separation of concerns. The architecture is plugin-friendly, allowing independent implementation and extension of core entities (macros, tables, roll queries, etc.).

---

## 1. Multi-Step Evaluation Pipeline

### 1.1. Parsing Step (`parseInput`)
- **Input:** Raw dice notation text.
- **Process:**
  - Tokenize the input, recognizing all supported syntax (dice, macros, roll queries, tables, formatting, etc.).
  - Build an Abstract Syntax Tree (AST) representing the structure and semantics of the input.
  - Validate syntax and enforce limits (e.g., nesting depth for macros/queries, valid markup, etc.).
- **Output:** AST (can be cached for later use).
- **Error Handling:**
  - Invalid syntax or markup causes a syntax exception.
  - Exceeding nesting limits for macros or roll queries causes a syntax exception.

### 1.2. Extraction Steps
Each extraction step operates on the AST and returns structured data for further processing or UI generation.

#### a. Extract Roll Queries (`extractQueries`)
- **Input:** AST
- **Output:** List of roll query schemas (prompt, options, default values, etc.)
- **Purpose:** To build a form for user input collection.

#### b. Extract Macros (`extractMacros`)
- **Input:** AST
- **Output:** List of macro names referenced in the expression.
- **Purpose:** To identify required macro definitions for expansion.

#### c. Extract Tables (`extractTables`)
- **Input:** AST
- **Output:** List of referenced table names.
- **Purpose:** To identify required roll tables for evaluation.

#### d. Extract Roll References (`extractRolls`)
- **Input:** AST
- **Output:** List of referenced roll result IDs (for roll history references).
- **Purpose:** To identify required roll results for evaluation.

---

## 2. Data Preparation

- **Macro Map:** `{ macro_name: macro_AST }` — ASTs for all macros used in the expression.
- **Table Map:** `{ table_name: table_rows_array }` — Data for all tables used.
- **Roll Map:** `{ roll_id: roll_value }` — Results for all referenced rolls.
- **User Input:** Collected and validated against schemas from `extractQueries`.

---

## 3. Evaluation Step (`evaluate`)
- **Inputs:**
  - User-provided data (from roll queries form)
  - Macro map
  - Table map
  - Roll map
  - AST (from parsing step)
- **Process:**
  1. **Macro Expansion:** Replace macro calls in the AST with their corresponding macro ASTs, recursively, up to the allowed nesting limit.
  2. **Roll Query Expansion:** Substitute user-provided values into the AST at roll query nodes, up to the allowed nesting limit.
  3. **Table Expansion:** Replace table roll nodes with randomly selected table entries, using the provided table data.
  4. **Roll Reference Expansion:** Substitute roll history references with their values from the roll map.
  5. **Dice Evaluation:** Roll dice expressions, applying all modifiers, explosion limits (e.g., max 99 explosions), and other dice mechanics.
  6. **Function and Math Evaluation:** Apply math functions and operators in the correct order of operations, as specified.
  7. **Formatting:** Apply output formatting and markup (e.g., `%NEWLINE%`), validating markup correctness.
- **Output:**
  - Final evaluation result (numeric or structured output)
  - Warnings (e.g., if dice explosion limit was reached)
- **Error Handling:**
  - Invalid user input (not matching schema) causes a validation exception.
  - Missing macro, table, or roll reference causes a `missing data` exception.
  - Invalid markup or formatting causes a syntax exception.
  - If dice explosion limit is reached, add a warning (do not throw an error).

---

## 4. Modularity and Plugin Architecture

- **Core System:**
  - Provides the parsing, AST, and evaluation engine.
  - Handles basic dice and math.
- **Plugins:**
  - Each major entity (macros, tables, roll queries, roll references, formatting, etc.) is implemented as a plugin.
  - Formatting (including output formatting and markup such as %NEWLINE%) is handled by a dedicated plugin, not by the core system.
  - Plugins can register new AST node types, extraction logic, and evaluation rules.
  - The system can be extended incrementally, enabling partial implementations and future features.
- **Benefits:**
  - Easy to add or modify features (e.g., new dice modifiers, new formatting options).
  - Enables custom deployments with only required features.

---

## 5. Error and Warning Handling

- **Syntax Exceptions:**
  - Thrown during parsing for invalid syntax, markup, or exceeded nesting limits.
- **Validation Exceptions:**
  - Thrown during evaluation if user input does not match expected schema.
- **Missing Data Exceptions:**
  - Thrown if a required macro, table, or roll reference is not provided.
- **Warnings:**
  - Non-fatal issues (e.g., dice explosion limit reached) are reported as warnings in the result.

---

## 6. Example Workflow

1. **parseInput:** Parse user input to AST.
2. **extractQueries:** Extract roll queries and build user input form.
3. **extractMacros:** Extract macro names and load macro ASTs.
4. **extractTables:** Extract table names and load table data.
5. **extractRolls:** Extract roll references and load roll results.
6. **Collect user input** via form and validate.
7. **evaluate:** Expand macros, queries, tables, and rolls; evaluate dice and math; apply formatting; return result and warnings.

---

## 7. Extensibility and Future-Proofing

- The system is designed to be extended with new plugins for additional dice mechanics, formatting, or integration with external systems (e.g., character sheets, APIs).
- Each plugin can independently define parsing, extraction, and evaluation logic for its entity type.
- The core remains stable and focused on orchestration and error handling.

---

## 8. Summary

This proposal describes a robust, modular, and extensible dice notation parser and evaluator system. It supports multi-step evaluation, clear error and warning handling, and a plugin architecture for incremental feature development. The design ensures maintainability, testability, and future growth, while meeting all requirements of the provided dice notation specification. 