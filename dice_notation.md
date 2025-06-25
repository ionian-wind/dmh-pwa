# Dice Notation Specification

---

## 1. Arithmetic

- **Operators:**
  - `+` (addition)
  - `-` (subtraction)
  - `*` (multiplication)
  - `/` (division)
  - `%` (modulus/remainder): Returns the remainder after division.
  - `**` (exponentiation, e.g., `2**3` is 8)
- **Order of Operations:** Parentheses can be used to control order, e.g. `(2+3)*2`.
- **Math-Only Rolls:** You can roll just math, e.g. `5+7*2`.
- **Supported Functions:**
  - `floor(x)`: Rounds x towards negative infinity.
  - `round(x)`: Rounds x towards 0 if the fractional portion is less than 0.5, and towards positive infinity if 0.5 or greater.
  - `ceil(x)`: Rounds x towards positive infinity.
  - `abs(x)`: Returns the absolute value of x.
- **Examples:**
  - `7%4`
  - `7 % 4` → 3
  - `2 ** 3` → 8
  - `floor(2.9)` → 2
  - `ceil(2.1)` → 3
  - `round(2.5)` → 3
  - `abs(-5)` → 5

---

## 3. Dice Expressions

- **Format:** `NdX`
  - `N`: Number of dice (optional, defaults to 1)
  - `d`: Literal character 'd'
  - `X`: Number of sides per die (e.g., `d6`, `2d20`)
- **Aliases:** 
  - `d%` is equivalent to `d100`
- **Fudge/FATE Dice:** `dF` or `dF.2` (returns -1, 0, 1)
  - Example: `4dF`
- **FATE/Fudge Dice Variants:**
  - `dF.1` (returns only -1 or 0)
  - `dF.3` (returns -1, -1, 0, +1, +1, +1)
  - Example: `4dF.3`
- **Math Operations for rolls:** Math operators and functions can be applied to dce rolls:
- **Dice Math Functions and Rounding:** `abs()`, `round()`, `ceil()`, `floor()`
  - Example: `round(1d6/2)`
- **Computed Dice Rolls:** You can compute the number of dice or the number of sides using mathematical expressions in parentheses:
  - **Format:** `(N+Y)dX` or `Nd(X+Y)`
  - The value inside the parentheses is evaluated first, and the result is rounded to the nearest whole number (as with `round(N+Y)`).
  - This can be used with both Basic and Fate dice.
- **Examples:**
  - `(2+1)d6` rolls 3d6
  - `2d(4+2)` rolls 2d6
  - `(1+2)dF` rolls 3 FATE dice
  - `d6`
  - `2d8`
  - `4d10`
  - `d%`
  - `2d6+3 for damage`
  - `1d6+1d8+1d10`
  - `1d8+3`
  - `2d6+1d4-2`
  - `(2d6+3)*2`

---

## 3.1. Modifiers

*depends on #3*

- **Dice Pool Operators:**
  - `=N`: Count dice equal to exactly N (e.g., `5d6=5` counts dice showing 5).
  - `e`: Exhaustive success count (reroll successes until none remain).
  - Example: `5d6=4`
  - Example: `4d6e>5`
- **Set Min/Max Per Die:**
  - `miN`/`maN`: Set minimum/maximum per die (e.g., `10d6mi2` ensures no die <2).
  - Example: `3d6mi2ma5`
- **Keep/Drop:**
  - `khN` / `klN`: Keep highest/lowest N dice (`4d6kh3`)
  - `dhN` / `dlN`: Drop highest/lowest N dice (`4d6dl1`)
  - Example: `4d6kh3`, `4d6dl1`
- **Rerolling Dice:**
  - `rN`: Reroll dice that show N (`1d20r1`)
  - `roN`: Reroll once if N is rolled (`2d6ro1`)
  - `r<3`: Reroll dice less than 3 (`4d6r<3`)
  - Example: `2d6ro1`, `4d6r<3`
- **Exploding Dice:** Roll higest values again and add to total results. Exploded dice can explode again.
  - `!`: Explode on max value (`1d6!`)
  - `!p`: Penetrating explosion. Each subsequent explosion rolls one less (`1d6!p`)
  - `!!`: Compound explosion (all results are summed into a single value) (`1d6!!`)
  - `!N`: Explode on custom value or higher (`1d10!7` explodes on 7+)
  - Example: `1d6!`, `1d10!7`, `2d6!p`, `4d6!!`, `3d6!!`, `2d6!p`
- **Explosion Direction:** Use `!<N` to explode on values ≤N, `!>N` to explode on values ≥N, and `!=N` to explode on values not equal to N.
  - Example: `1d10!<3`
  - Example: `1d10!>8`
  - Example: `1d10!=5`
- **Limitation:** To prevent infinite chains, the total number of exploding rolls is limited to 99 per roll expression. If this limit is reached, rolling simply stops.
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
- **Multiple Modifiers:**
  - Modifiers can be chained: `4d6kh3ro1!>5sd`
  - Example: `4d6kh3ro1!>5sd`
- **Reroll Until Success:**
  - `raN`: Reroll infinitely until success (e.g., `d20ra1`).
  - Example: `d20ra1`
- **Custom Drop/Keep Syntax:**
  - `k>N`/`k<N`: Keep dice above/below N (e.g., `4d6k>3`).
  - Example: `4d6k>3`
- **Dedicated Advantage/Disadvantage:**
  - Use `2d20kh1` for advantage, `2d20kl1` for disadvantage (native syntax).
  - Example: `2d20kh1`, `2d20kl1`

---

## 3.2. Advanced Dice Features

*depends on #3*

- **Custom Dice:** `d[1,2,3,5,8]`
  - Example: `2d[1,2,3,5,8]`
- **Grouping Rolls:**
  - Use `{}` to group multiple rolls, e.g. `{1d6, 2d8+1, 1d4-1}`
  - Example: `{1d6, 2d8+1, 1d4-1}`
- **Roll Once Modifier:**
  - `o`: Rolls entire group once (e.g., `{1d6, 2d8}o`).
  - Example: `{1d6, 2d8}o`
- **Grouped Roll Modifiers:**
  - Modifiers can be applied to grouped rolls, e.g. `{4d6kh3, 1d8+2}`
  - Example: `{4d6kh3, 1d8+2}`
---

## 4.1 Nested Group Modifiers

*depends on #3 and #5*

- Modifiers can be applied to subgroups (e.g., `{2d6kh1, 1d8}kh1` applies keep highest to the group result).
  - Example: `{2d6kh1, 1d8}kh1`

---

## 5. Table Rolls

- **General Syntax:** Use `Nt[table-name]` to roll N times on a user-defined table.
  - Example: `1t[loot-table]` (roll once on the table)
  - Example: `2t[loot-table]` (roll twice on the table)
- **Weighted Table Entries:** Table entries can have weights. Two options:
  - Either the number of times you want the item to be a possible result.
  - Or a percentage value. The final number of all items that are elements of the table must equal 100.
- **Table Ranges:** Use `Nt[table-name]` for multiple rolls on a table, e.g. `2t[loot-table]`.

---

## 6. Advanced syntax

## 6.1. Roll Queries

- **Definition:** Roll Queries allow users to control roll evaluation by providing additional data.
- **Prompt User:** `?{Prompt Message}` asks user to input value
- **Default Value:** `?{Prompt Message|Default}` (if user presses enter, uses Default)
  - Example: `?{Bonus|0}`
- **Variant Choice:** `?{Prompt Message|Option1|Option2}` prompts user for select
  - Example: `?{Weapon|Sword|Axe}`
- **Variant Choice With Label:** `?{Attack or Damage|Attack, 5|Damage, 3}` content after comma is result of selection
- **Multi-Prompts:**
  - Use multiple independent queries by including several `?{...}` in the same line (e.g., `?{X?} ?{Y?}`). Each prompt will be presented separately and their results can be used in the expression.
  - Example: `?{Weapon?} ?{Bonus?}`
- **Expressions as Values:** Dice expressions, arithmetic, table rolls, and other valid expressions can be used as values in roll queries. This allows for dynamic and complex options.
  - **Examples:**
    - `?{Attack or Damage|Attack, 1d20+5|Damage, 1d8+3}`
    - `?{Loot|Gold, 2d6*10|Magic Item, 1t[magic-items]}`
- **Using Roll Query Results in Expressions:** The result of a roll query can be used as part of any expression, such as in dice rolls, arithmetic, or other calculations.
  - **Example:**
    - `1d20+?{Bonus|0}` (adds the value entered for Bonus to the roll)

# 6.2. Escaping Special Characters

- Use `\\` to escape `|`, `}}`, or `,` in queries.
  - Example: `?{Name|Option\, with comma}`

---

## 7. Inline Dice Rolls
- Use `[[...]]` to embed a roll result inline in roll queries or any other content.
  - Example: `[[1d20+5]]`

---

## Error Handling 
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
- Invalid use of modifiers:
  - Example: `2d6kh0` → Error: Must keep at least 1 die
  - Example: `2d6kl3` (when rolling 2 dice) → Error: Cannot keep more dice than rolled
- Negative dice:
  - Example: `-1d6` → Error: Negative dice not allowed
- Invalid groupings or mismatched brackets:
  - Example: `{2d6, 1d8, 1d4-1, 3d6)` → Error: Mismatched brackets
- Invalid roll query syntax:
  - Example: `?{Prompt|Option1 Option2}` (missing comma) → Error: Invalid query options format
