# Dice Notation Specification

---

## 1. Basic Dice Expressions

- **Format:** `NdX`
  - `N`: Number of dice (optional, defaults to 1)
  - `d`: Literal character 'd'
  - `X`: Number of sides per die (e.g., `d6`, `2d20`)
- **Extra Text for roll:** You can add descriptive text after a roll, e.g. `1d20+5 for initiative`.
- **Examples:**
  - `d6`
  - `2d8`
  - `4d10`
  - `d%`
  - `2d6+3 for damage`

## 1.1 Dice Expression Enhancements

- **Aliases:** `d%` is equivalent to `d100`
- **Custom Explosion Limits:** Use `!r<N` to cap explosion recursion (e.g., `d6!r<10` stops exploding if total ≥10).
  - Example: `2d6!r<12`
- **Explosion Direction:** Use `!<N` to explode on values ≤N, `!>N` to explode on values ≥N, and `!=N` to explode on values not equal to N.
  - Example: `1d10!<3`
  - Example: `1d10!>8`
  - Example: `1d10!=5`
- **FATE/Fudge Dice Variants:**
  - `dF.1` (returns only -1 or 0)
  - `dF.3` (returns -1, -1, 0, +1, +1, +1)
  - Example: `4dF.3`
- **Dice Pool Operators:**
  - `=N`: Count dice equal to exactly N (e.g., `5d6=5` counts dice showing 5).
  - `e`: Exhaustive success count (reroll successes until none remain).
  - Example: `5d6=4`
  - Example: `4d6e>5`
- **Set Min/Max Per Die:**
  - `miN`/`maN`: Set minimum/maximum per die (e.g., `10d6mi2` ensures no die <2).
  - Example: `3d6mi2ma5`

---

## 2. Arithmetic and Grouping

- **Operators:** `+`, `-`, `*`, `/`, `%`, `()`, `**`
  - `%` (modulus): Returns the remainder after division.
  - `**` exponentiation
- **Multiple Dice Types:** `1d6+1d8+1d10`
- **Order of Operations:** Parentheses can be used to control order, e.g. `(2d6+3)*2`.
- **Math-Only Rolls:** You can roll just math, e.g. `5+7*2`.
- **Examples:**
  - `1d8+3`
  - `2d6+1d4-2`
  - `(2d6+3)*2`
  - `7%4`

## 2.1 Math Operators and Functions

- **Supported Operators:**
  - `+` (addition)
  - `-` (subtraction)
  - `*` (multiplication)
  - `/` (division)
  - `%` (modulus/remainder)
  - `**` (exponentiation, e.g., `2**3` is 8)
- **Supported Functions:**
  - `floor(x)`: Rounds x towards negative infinity.
  - `round(x)`: Rounds x towards 0 if the fractional portion is less than 0.5, and towards positive infinity if 0.5 or greater.
  - `ceil(x)`: Rounds x towards positive infinity.
  - `abs(x)`: Returns the absolute value of x.
- **Examples:**
  - `7 % 4` → 3
  - `2 ** 3` → 8
  - `floor(2.9)` → 2
  - `ceil(2.1)` → 3
  - `round(2.5)` → 3
  - `abs(-5)` → 5

## 2.2 Order of Operations

The dice engine follows a specific order of operations, which may differ from standard math precedence in some cases. The general order is:

1. **Macro Expansion:** Macros are expanded first (e.g., `#macro-name` becomes its defined roll or value). This expansion can repeat up to 99 levels deep.
2. **Roll Query Execution:** Roll queries (e.g., `?{Prompt|Default}`) are executed, substituting user-provided values into the formula, up to 99 levels deep.
3. **Inline Roll Resolution:** Inline rolls (e.g., `[[1d20+5]]`) are executed from the most deeply nested outward, and their results are substituted into the formula.
4. **Dice Rolling:** Dice expressions (e.g., `2d6`, including modifiers like keep/drop, explode, etc.) are rolled, and their results are substituted into the formula.
5. **Function Application:** Functions such as `floor()`, `ceil()`, `round()`, and `abs()` are applied to the results as appropriate.
6. **Math Evaluation:** The remaining formula is evaluated using standard math precedence:
   - Parentheses `()`
   - Function calls (`floor()`, etc.)
   - Exponentiation `**`
   - Multiplication `*`, Division `/`, Modulus `%` (left-to-right)
   - Addition `+`, Subtraction `-` (left-to-right)
7. **Result Provided:** The final result is displayed.

**Note:** Parentheses can be used to control math precedence, but not all grouping will override dice engine order (e.g., you cannot force a variable to be interpreted before a macro expansion).

**Example:**
- `floor(2d6/2)`
  - First, `2d6` is rolled (e.g., result is 7)
  - Then, `7/2` is calculated (3.5)
  - Then, `floor(3.5)` is applied (result is 3)

---

## 3. Modifiers

- **Keep/Drop:**
  - `khN` / `klN`: Keep highest/lowest N dice (`4d6kh3`)
  - `dhN` / `dlN`: Drop highest/lowest N dice (`4d6dl1`)
  - Example: `4d6kh3`, `4d6dl1`
- **Rerolling Dice:**
  - `rN`: Reroll dice that show N (`1d20r1`)
  - `roN`: Reroll once if N is rolled (`2d6ro1`)
  - `r<3`: Reroll dice less than 3 (`4d6r<3`)
  - Example: `2d6ro1`, `4d6r<3`
- **Exploding Dice:**
  - `!`: Explode on max value (`1d6!`)
  - `!p`: Penetrating explosion (`1d6!p`)
  - `!!`: Compound explosion (all results are summed into a single value) (`1d6!!`)
  - `!r`: Recursive explosion (exploded dice can explode again) (`1d6!r`)
  - `!N`: Explode on custom value or higher (`1d10!7` explodes on 7+)
  - Example: `1d6!`, `1d10!7`, `2d6!p`
  - **Limitation:** To prevent infinite chains, the total number of exploding rolls is limited to 99 per roll expression. If this limit is reached, rolling simply stops.
- **Compounding Dice:**
  - `!!`: All explosions are summed into a single value (`4d6!!`)
  - Example: `3d6!!`
- **Penetrating Dice:**
  - `!p`: Each subsequent explosion rolls one less (`4d6!p`)
  - Example: `2d6!p`
- **Dice Matching:**
  - `m`: Find matching dice results, e.g. `4d6m`
  - Example: `4d6m`
- **Success/Failure Counting:**
  - `>N`, `<N`, `=N`: Count dice above/below/equal to N (`5d6>4`)
  - `s`, `f`: Count as success/failure (`5d6>4s`)
  - `cs>=[N]` / `cf<=[N]`: Critical success/failure threshold (`5d6cs>=6cf<=1`)
  - Example: `5d6>4`, `5d6=3s`, `5d6cs>=6cf<=1`
- **Target Number (Successes):** `3d6>=5` counts dice that meet or exceed 5 as successes.
  - Example: `3d6>=5`
- **Critical Success and Fumble Points:** Use `cs` and `cf` to count criticals and fumbles, e.g. `1d20cs>19cf<2`.
  - Example: `1d20cs>19cf<2`
- **Combine with Keep/Drop:** `6d6kh4>4` (keep highest 4, count >4 as success)
  - Example: `6d6kh4>4`
- **Sorting Dice:**
  - `sa` / `sd`: Sort ascending/descending (`4d6sa`)
  - Example: `4d6sd`
- **Grouped Roll Modifiers:**
  - Modifiers can be applied to grouped rolls, e.g. `{4d6kh3, 1d8+2}`
  - Example: `{4d6kh3, 1d8+2}`
- **Multiple Modifiers:**
  - Modifiers can be chained: `4d6kh3ro1!>5sd`
  - Example: `4d6kh3ro1!>5sd`
- **Reroll Until Success:**
  - `raN`: Reroll infinitely until success (e.g., `d20ra1`).
  - Example: `d20ra1`
- **Custom Drop/Keep Syntax:**
  - `k>N`/`k<N`: Keep dice above/below N (e.g., `4d6k>3`).
  - Example: `4d6k>3`
- **Roll Once Modifier:**
  - `o`: Rolls entire group once (e.g., `{1d6, 2d8}o`).
  - Example: `{1d6, 2d8}o`
- **Dedicated Advantage/Disadvantage:**
  - Use `2d20kh1` for advantage, `2d20kl1` for disadvantage (native syntax).
  - Example: `2d20kh1`, `2d20kl1`

---

## 4. Advanced Dice Features

- **Fudge/FATE Dice:** `dF` or `dF.2` (returns -1, 0, 1)
  - Example: `4dF`
- **Custom Dice:** `d[1,2,3,5,8]`
  - Example: `2d[1,2,3,5,8]`
- **Labels and Inline Labels:** `2d6[label]` or `2d6[fire]` (labels the roll for display or reference)
  - Example: `2d6[fire]`
- **Markdown in Dice Labels:** Markdown is supported in dice labels.
  - Example: `2d6[**Fire**]`
- **Grouping Rolls:**
  - Use `{}` to group multiple rolls, e.g. `{1d6, 2d8+1, 1d4-1}`
  - Example: `{1d6, 2d8+1, 1d4-1}`
- **Dice Math Functions and Rounding:** `abs()`, `round()`, `ceil()`, `floor()`, `min()`, `max()`
  - Example: `round(1d6/2)`, `max(1d4, 1d6)`

## 4.1 Nested Group Modifiers

- Modifiers can be applied to subgroups (e.g., `{2d6kh1, 1d8}kh1` applies keep highest to the group result).
  - Example: `{2d6kh1, 1d8}kh1`

---

## 5. Comments

- **Syntax:** `// comment` (ignored by parser)

---

## 6. Table Rolls

- **General Syntax:** Use `Nt[table-name]` to roll N times on a user-defined table.
  - Example: `1t[loot-table]` (roll once on the table)
  - Example: `2t[loot-table]` (roll twice on the table)
- **Weighted Table Entries:** Table entries can have weights, e.g. `Sword, Sword, Shield` makes Sword twice as likely.
- **Rollable Tables in Inline Rolls:** You can use table rolls inside inline rolls, e.g. `[[1t[loot-table]]]`.
- **Table Ranges:** Use `Nt[table-name]` for multiple rolls on a table, e.g. `[[2t[loot-table]]]`.

---

## 7. Inline Dice Rolls
- Use `[[...]]` to embed a roll result inline in macros or roll queries.
  - Example: `[[1d20+5]]`

---

## 8. Macros

- **Definition:** Macros allow users to define reusable roll expressions.
- **Syntax:** `#macro_name` (use `#` to call a macro)
  - Example: `#attack`
- **Macro Nesting and Chaining:** Macros can call other macros or be chained with `;` (`#macro1; #macro2`)
  - Example: `#macro1; #macro2`

---

## 9. Roll Queries
- **Prompt User:** `?{Prompt Message}` asks user to input value
- **Default Value:** `?{Prompt Message|Default}` (if user presses enter, uses Default)
  - Example: `?{Bonus|0}`
- **Query Default Expressions:** Default values in queries can be rolls (e.g., `?{Dmg|[[1d8]]}`).
  - Example: `?{Dmg|[[1d8]]}`
- **Variant Choice:** `?{Prompt Message|Option1,Option2}` prompts user for select
  - Example: `?{Weapon|Sword,Axe}`
- **Variant Choice With Label:** `?{Attack or Damage|Attack, 1d20+5|Damage, 1d8+3}`
- **Roll Queries in Math:** Can be used in any part of a macro or roll (`1d20+?{Bonus|0}`)
  - Example: `1d20+?{Bonus|0}`
- **Multi-Prompts:**
  - Use multiple independent queries by including several `?{...}` in the same line (e.g., `?{X?} ?{Y?}`). Each prompt will be presented separately and their results can be used in the expression.
  - Example: `?{Weapon?} ?{Bonus?}`

---

## 10. Nesting Macros and Roll Queries

- **Nesting Macros in Roll Queries:**
  - When nesting a macro call inside a Roll Query, ensure there is a space after the macro name, and no space between the comma and `#` so that it is properly recognized.
  - **Example:**
    - `?{Which macro?|Attack,#use-sword |Defend,#use-shield }`

---

# 11. Escaping Special Characters in Marcos and Roll Queries

- Use `\\` to escape `|`, `}}`, or `,` in queries/macros.
  - Example: `?{Name|Option\, with comma}`

---

## 12. Reusing Roll Results

- **Reusing Roll Results:** Use the result of one roll in another calculation within the same macro (e.g., via inline roll).
  - Example: `$[[0]]+2`
- **Result Referencing:** Use `$[[N]]-1` syntax to reference/modify prior inline rolls (e.g., `$[[0]]-1`).
  - Example: `$[[0]]-1`
- **Roll History References:**
  - Reference prior rolls via ID using `$[roll:XYZ]` syntax, where `XYZ` is the unique roll identifier. This allows you to use the result of a previous roll elsewhere in your expressions.
  - Example: `$[roll:attackRoll] + 2`

---

## 14. Error Handling

- **Invalid expressions:** Invalid expressions should return a clear error message.
- **Divide-by-Zero Handling:** If a division by zero occurs (e.g., `1d6/0`), the result is `null` or an error message is displayed.

**Advanced/Edge-Case Examples:**
- Division by zero in a complex expression:
  - Example: `(2d6+4)/(1-1)` → Error: Division by zero
- Invalid dice notation:
  - Example: `2d0` → Error: Dice must have at least 1 side
  - Example: `0d6` → Error: Must roll at least 1 die
  - Example: `2d-6` → Error: Dice sides must be positive
  - Example: `2d6.5` → Error: Dice sides must be an integer
- Unknown macro or attribute:
  - Example: `#unknownmacro` → Error: Macro not found
- Invalid use of modifiers:
  - Example: `2d6kh0` → Error: Must keep at least 1 die
  - Example: `2d6kl3` (when rolling 2 dice) → Error: Cannot keep more dice than rolled
- Negative dice:
  - Example: `-1d6` → Error: Negative dice not allowed
- Invalid groupings or mismatched brackets:
  - Example: `{2d6, 1d8, 1d4-1, 3d6)` → Error: Mismatched brackets
- Invalid roll query syntax:
  - Example: `?{Prompt|Option1 Option2}` (missing comma) → Error: Invalid query options format

## Result Formatting and Special Output

- **Line Breaks with %NEWLINE%:**
  - Use `%NEWLINE%` in your output text to break the line and start a new one in the displayed result.
  - **Example:**
    - `Attack hits!%NEWLINE%Roll damage: [[1d8+2]]` will display as:
      ```
      Attack hits!
      Roll damage: (result)
      ```
