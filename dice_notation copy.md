## 6.2. Macros

- **Definition:** Macros allow users to define reusable roll expressions.
- **Syntax:** `#macro_name` (use `#` to call a macro)
  - Example: `#attack`
- **Macro Nesting and Chaining:** Macros can call other macros or be chained with `;` (`#macro1; #macro2`)
  - Example: `#macro1; #macro2`

## 6.4. Nesting Macros and Roll Queries

- **Nesting Macros in Roll Queries:**
  - When nesting a macro call inside a Roll Query, ensure there is a space after the macro name, and no space between the comma and `#` so that it is properly recognized.
  - **Example:**
    - `?{Which macro?|Attack,#use-sword |Defend,#use-shield }`


---

## 7. Reusing Roll Results

- **Result Referencing:** `$[[N]]` Use the result of one roll in another calculation within the same complicated roll or macro. Use `$[[N]]-1` syntax to reference prior inline rolls.
  - Example: `$[[0]]+2`, `$[[1]]-1`

---

## 8. Roll History References
- **Roll History References:**
  - Reference prior rolls via ID using `$[roll:XYZ]` syntax, where `XYZ` is the unique roll identifier. This allows you to use the result of a previous roll elsewhere in your expressions.
  - Example: `$[roll:attackRoll] + 2`

## 13. Result Formatting and Special Output

- **Labels:** `2d6[label]` or `2d6[fire]` (labels the roll for display or reference)
  - Example: `2d6[fire]`
- **Markdown in Dice Labels:** Markdown is supported in dice labels.
  - Example: `2d6[**Fire**]`
- **Extra Text for roll:** You can add descriptive text after a roll, e.g. `1d20+5 for initiative`.
- **Comments:** `// comment` (ignored by parser)
- **Line Breaks with %NEWLINE%:**
  - Use `%NEWLINE%` in your output text to break the line and start a new one in the displayed result.
  - **Example:**
    - `Attack hits!%NEWLINE%Roll damage: [[1d8+2]]` will display as:
      ```
      Attack hits!
      Roll damage: (result)
      ```